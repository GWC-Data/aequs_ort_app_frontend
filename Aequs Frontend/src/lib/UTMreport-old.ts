import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../assets/logo.png";
import { getBackendApiUrl } from "./backendApi";

// UTM Region definitions matching UTMImageCropper
const UTM_REGIONS = {
  clear: [
    { x: 112, y: 20, width: 50, height: 50, label: "CL-1" },
    { x: 170, y: 20, width: 50, height: 50, label: "CL-2" },
    { x: 228, y: 20, width: 50, height: 50, label: "CL-3" },
    { x: 286, y: 20, width: 50, height: 50, label: "CL-4" },
  ],
  foot: [
    { x: 32, y: 20, width: 60, height: 50, label: "FT-1" },
    { x: 360, y: 20, width: 60, height: 50, label: "FT-2" },
    { x: 280, y: 250, width: 60, height: 50, label: "FT-3" },
    { x: 32, y: 210, width: 55, height: 70, label: "FT-4" },
  ],
  sideSnap: [
    { x: 32, y: 85, width: 55, height: 45, label: "SS-1" },
    { x: 370, y: 85, width: 55, height: 45, label: "SS-2" },
    { x: 370, y: 210, width: 55, height: 70, label: "SS-3" },
    { x: 100, y: 250, width: 60, height: 50, label: "SS-4" },
  ],
};

const ALL_REGIONS = [
  ...UTM_REGIONS.clear,
  ...UTM_REGIONS.foot,
  ...UTM_REGIONS.sideSnap,
];

interface UTMCroppedImages {
  [key: string]: string; // e.g., "CL-1": base64ImageData
}

interface UTMPartData {
  partNumber: string;
  serialNumber?: string;
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  postCosmeticImage?: string;
  postNonCosmeticImage?: string;
  postCosmeticImages?: string[];
  postNonCosmeticImages?: string[];
  croppedImages?: UTMCroppedImages;
  customColumnData?: Record<number, Record<string, string>>; // rowNum -> columnId -> value
}

interface CustomColumn {
  id: string;
  label: string;
  type: "text" | "number" | "image" | "dropdown";
  options?: string[];
}

interface UTMReportData {
  testName: string;
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  machine: string;
  testCondition: string;
  specification: string;
  parts: UTMPartData[];
  customColumns?: CustomColumn[];
}

type SupportedImageExtension = "png" | "jpeg";

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9+./-]+);base64,(.+)$/i;

const resolveImageRequestUrl = (imageSrc: string): string => {
  if (!imageSrc) {
    return imageSrc;
  }

  if (/^(?:https?:\/\/|data:|blob:)/i.test(imageSrc)) {
    return imageSrc;
  }

  const trimmedSrc = imageSrc.trim();

  if (/^\/?uploads\//i.test(trimmedSrc)) {
    try {
      const baseUrl = getBackendApiUrl();
      if (!baseUrl) {
        return trimmedSrc;
      }

      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(trimmedSrc.replace(/^\//, ""), normalizedBase).toString();
    } catch (_error) {
      return trimmedSrc;
    }
  }

  if (trimmedSrc.startsWith("//")) {
    const protocol = typeof window !== "undefined" && window.location ? window.location.protocol : "https:";
    return `${protocol}${trimmedSrc}`;
  }

  if (typeof window !== "undefined" && window.location) {
    try {
      return new URL(trimmedSrc, window.location.origin).toString();
    } catch (_error) {
      return trimmedSrc;
    }
  }

  return trimmedSrc;
};

const loadImageAsBase64 = async (imageSrc: string): Promise<{ base64: string; mime: string } | null> => {
  if (!imageSrc) {
    return null;
  }

  if (imageSrc.startsWith("blob:")) {
    return null;
  }

  const dataUrlMatch = DATA_URL_REGEX.exec(imageSrc);
  if (dataUrlMatch) {
    return { mime: dataUrlMatch[1], base64: dataUrlMatch[2] };
  }

  try {
    const fetchUrl = resolveImageRequestUrl(imageSrc);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.warn("Failed to fetch image", fetchUrl, response.status);
      return null;
    }
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const match = DATA_URL_REGEX.exec(result);
          if (match) {
            resolve({ mime: match[1], base64: match[2] });
            return;
          }
          const commaIndex = result.indexOf(",");
          if (commaIndex !== -1) {
            resolve({ mime: blob.type || "image/png", base64: result.slice(commaIndex + 1) });
            return;
          }
        }
        resolve({ mime: blob.type || "image/png", base64: "" });
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load image", error);
    return null;
  }
};

const normalizeImageExtension = (mime?: string): SupportedImageExtension => {
  if (!mime) {
    return "png";
  }

  const match = /^image\/([a-z0-9+.-]+)/i.exec(mime);
  const subtype = match?.[1]?.toLowerCase() ?? "png";

  if (subtype === "jpg") {
    return "jpeg";
  }

  if (subtype === "jpeg" || subtype === "png") {
    return subtype as SupportedImageExtension;
  }

  return "png";
};

const resolveImageForWorksheet = async (
  imageSrc: string
): Promise<{ base64: string; extension: SupportedImageExtension } | null> => {
  const result = await loadImageAsBase64(imageSrc);
  if (!result || !result.base64) {
    return null;
  }

  return {
    base64: result.base64,
    extension: normalizeImageExtension(result.mime)
  };
};

const convertImageToBase64 = async (imageSrc: string): Promise<string | null> => {
  const result = await loadImageAsBase64(imageSrc);
  return result?.base64 ?? null;
};

const UTM_BASE_CANVAS_WIDTH = 480;
const UTM_BASE_CANVAS_HEIGHT = 320;
const CROPPED_IMAGE_CACHE = new Map<string, Record<string, string>>();

const cropImageToUTMRegions = async (imageSrc?: string): Promise<Record<string, string>> => {
  if (!imageSrc) {
    return {};
  }

  if (CROPPED_IMAGE_CACHE.has(imageSrc)) {
    return CROPPED_IMAGE_CACHE.get(imageSrc)!;
  }

  if (typeof document === "undefined" || typeof Image === "undefined") {
    return {};
  }

  const payload = await loadImageAsBase64(imageSrc);
  if (!payload || !payload.base64) {
    return {};
  }

  const dataUrl = `data:${payload.mime || "image/png"};base64,${payload.base64}`;

  const croppedResults = await new Promise<Record<string, string>>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scaleX = image.width / UTM_BASE_CANVAS_WIDTH;
        const scaleY = image.height / UTM_BASE_CANVAS_HEIGHT;
        const results: Record<string, string> = {};

        ALL_REGIONS.forEach((region) => {
          const rawX = Math.round(region.x * scaleX);
          const rawY = Math.round(region.y * scaleY);
          const rawWidth = Math.round(region.width * scaleX);
          const rawHeight = Math.round(region.height * scaleY);

          const x = Math.max(0, Math.min(rawX, image.width - 1));
          const y = Math.max(0, Math.min(rawY, image.height - 1));
          const width = Math.min(rawWidth, image.width - x);
          const height = Math.min(rawHeight, image.height - y);

          if (width <= 0 || height <= 0) {
            return;
          }

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
          results[region.label] = canvas.toDataURL("image/png");
        });

        resolve(results);
      } catch (_error) {
        resolve({});
      }
    };
    image.onerror = () => resolve({});
    image.src = dataUrl;
  });

  CROPPED_IMAGE_CACHE.set(imageSrc, croppedResults);
  return croppedResults;
};
export const downloadUTMReport = async (data: UTMReportData): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "UTM Test Report";
    workbook.created = new Date();

    // Create Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Field", key: "label", width: 33 },
      { header: "Details", key: "hint", width: 33 },
      { header: "Value", key: "value", width: 33 }
    ];

    // Header row
    summarySheet.getRow(1).height = 30;
    summarySheet.getRow(1).values = [null, "GENERAL TEST INFO", null];
    summarySheet.mergeCells("B1:C1");
    summarySheet.getCell("B1").alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.getCell("B1").font = { bold: true, size: 14 };

    // Add borders to header
    ["A1", "B1", "C1"].forEach(cell => {
      summarySheet.getCell(cell).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    // Add logo
    const logoBase64 = await convertImageToBase64(Logo);
    if (logoBase64) {
      const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
      summarySheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 30 }
      });
    }

    // Column headers
    const columnHeaderRow = summarySheet.getRow(2);
    columnHeaderRow.values = ["Field", "Details", "Value"];
    columnHeaderRow.height = 30;
    columnHeaderRow.font = { bold: true };
    columnHeaderRow.alignment = { horizontal: "center" };
    columnHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    // Summary data
    const summaryData = [
      { label: "Test Name", hint: "(description)", value: data.testName },
      { label: "Ticket Code / Document No", hint: "(reference)", value: data.ticketCode },
      { label: "Project Name", hint: "(name)", value: data.project },
      { label: "Build", hint: "(variant)", value: data.build },
      { label: "Colour", hint: "(name)", value: data.colour },
      { label: "Machine ID", hint: "(equipment id)", value: data.machine },
      { label: "Test Condition", hint: "(checkpoints)", value: data.testCondition },
      { label: "Specification", hint: "(criteria)", value: data.specification },
      { label: "Sample Quantity", hint: "(total samples)", value: data.parts.length.toString() },
    ];

    summaryData.forEach((item, index) => {
      const row = summarySheet.getRow(3 + index);
      row.values = [item.label, item.hint, item.value];
      row.height = 30;
      row.alignment = { vertical: "middle" };
      row.getCell(1).font = { bold: true };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // Create UTM Results Sheet for each part
    const imageTasks: Promise<void>[] = [];

    for (let partIndex = 0; partIndex < data.parts.length; partIndex++) {
      const part = data.parts[partIndex];
      const sheetName = `${part.partNumber}`.substring(0, 31);
      const utmSheet = workbook.addWorksheet(sheetName);

      // Define columns based on custom columns
      const baseColumns = [
        { key: "rowNum", width: 10 },
        { key: "preCosmeticImage", width: 20 },
        { key: "preNonCosmeticImage", width: 20 },
        { key: "postCosmeticImage", width: 20 },
        { key: "postNonCosmeticImage", width: 20 },
        { key: "clearImage", width: 20 },
        { key: "footImage", width: 20 },
        { key: "sideSnapImage", width: 20 },
      ];

      // Add custom columns
      const customCols = (data.customColumns || []).map(col => ({
        key: col.id,
        width: 20
      }));

      utmSheet.columns = [...baseColumns, ...customCols];

      // Header row
      const headerValues = [
        "Row #",
        "Pre Cosmetic",
        "Pre Non-Cosmetic",
        "Post Cosmetic",
        "Post Non-Cosmetic",
        "Clear",
        "Foot",
        "Side Snap",
        ...(data.customColumns || []).map(col => col.label)
      ];

      const headerRow = utmSheet.addRow(headerValues);
      headerRow.font = { bold: true };
      headerRow.height = 30;
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });

      // Data rows (4 rows per part for UTM)
      const croppingSource = part.postNonCosmeticImage || part.postCosmeticImage;
      const generatedCrops = await cropImageToUTMRegions(croppingSource);
      const partCroppedImages: Record<string, string> = {
        ...generatedCrops,
        ...(part.croppedImages || {})
      };

      for (let rowNum = 1; rowNum <= 4; rowNum++) {
        const dataRow = utmSheet.addRow([rowNum]);
        dataRow.height = 90;
        dataRow.alignment = { horizontal: "center", vertical: "middle" };

        // Pre-cosmetic image (show latest from array)
        const preCosmeticImg = part.cosmeticImages && part.cosmeticImages.length > 0
          ? part.cosmeticImages[0]
          : null;

        if (preCosmeticImg) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(preCosmeticImg);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 1, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Pre-non-cosmetic image (show latest from array)
        const preNonCosmeticImg = part.nonCosmeticImages && part.nonCosmeticImages.length > 0
          ? part.nonCosmeticImages[0]
          : null;

        if (preNonCosmeticImg) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(preNonCosmeticImg);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 2, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Post-cosmetic image (same for all rows)
        if (part.postCosmeticImage) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(part.postCosmeticImage!);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 3, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Post-non-cosmetic image (same for all rows)
        if (part.postNonCosmeticImage) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(part.postNonCosmeticImage!);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 4, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Cropped images - Clear
        const clearRegionLabel = `CL-${rowNum}`;
        if (partCroppedImages && partCroppedImages[clearRegionLabel]) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(partCroppedImages[clearRegionLabel]);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 5, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Cropped images - Foot
        const footRegionLabel = `FT-${rowNum}`;
        if (partCroppedImages && partCroppedImages[footRegionLabel]) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(partCroppedImages[footRegionLabel]);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 6, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Cropped images - Side Snap
        const sideSnapRegionLabel = `SS-${rowNum}`;
        if (partCroppedImages && partCroppedImages[sideSnapRegionLabel]) {
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(partCroppedImages[sideSnapRegionLabel]);
            if (imageData) {
              const imgId = workbook.addImage({
                base64: imageData.base64,
                extension: imageData.extension
              });
              utmSheet.addImage(imgId, {
                tl: { col: 7, row: dataRow.number - 1 },
                ext: { width: 90, height: 90 }
              });
            }
          })());
        }

        // Custom column data
        if (data.customColumns && part.customColumnData) {
          data.customColumns.forEach((col, colIndex) => {
            const cellValue = part.customColumnData?.[rowNum]?.[col.id] || "";
            const cellColIndex = 8 + colIndex;

            if (col.type === "image" && cellValue) {
              imageTasks.push((async () => {
                const imageData = await resolveImageForWorksheet(cellValue);
                if (imageData) {
                  const imgId = workbook.addImage({
                    base64: imageData.base64,
                    extension: imageData.extension
                  });
                  utmSheet.addImage(imgId, {
                    tl: { col: cellColIndex, row: dataRow.number - 1 },
                    ext: { width: 90, height: 90 }
                  });
                }
              })());
            } else {
              dataRow.getCell(cellColIndex + 1).value = cellValue;
            }
          });
        }

        // Add borders to all cells
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        });
      }
    }

    // Wait for all images to load
    await Promise.all(imageTasks);

    // Generate filename
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `UTM_Report_${data.ticketCode}_${dateSegment}.xlsx`;

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
  } catch (error) {
    console.error("Unable to download UTM report", error);
    throw error;
  }
};

// Helper function to transform chamber data to UTM report format
export const transformChamberDataToUTMReport = (
  chamberData: any,
  utmCropperData?: {
    postCosmeticImages: Record<string, string>;
    postNonCosmeticImages: Record<string, string>;
    croppedImages: Record<string, UTMCroppedImages>;
    customColumns: CustomColumn[];
    customColumnData: Record<string, Record<number, Record<string, string>>>;
  }
): UTMReportData => {
  const supportedTypes: Record<string, CustomColumn["type"]> = {
    text: "text",
    number: "number",
    image: "image",
    dropdown: "dropdown"
  };

  const columnMap = new Map<string, CustomColumn>();
  const mergeCustomColumns = (columns?: any[]) => {
    if (!Array.isArray(columns)) {
      return;
    }
    columns.forEach((column, index) => {
      if (!column) {
        return;
      }
      const fallbackId = `utm-column-${index}`;
      const rawId = column.id ?? column.columnId ?? column.name ?? column.label ?? fallbackId;
      const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : fallbackId;
      const existing = columnMap.get(id);
      const rawLabel = column.label ?? column.name ?? existing?.label ?? `Column ${index + 1}`;
      const label = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim() : `Column ${index + 1}`;
      const rawType = typeof column.type === "string" ? column.type.toLowerCase() : undefined;
      const normalizedType = (rawType && supportedTypes[rawType]) || existing?.type || "text";
      const options = normalizedType === "dropdown"
        ? (Array.isArray(column.options) ? column.options : existing?.options)
        : undefined;

      columnMap.set(id, {
        id,
        label,
        type: normalizedType,
        ...(options ? { options } : {})
      });
    });
  };

  mergeCustomColumns(chamberData?.customColumns);
  mergeCustomColumns(utmCropperData?.customColumns);

  const customColumns = Array.from(columnMap.values());
  const globalCustomColumnData =
    chamberData && typeof chamberData.customColumnData === "object" && !Array.isArray(chamberData.customColumnData)
      ? (chamberData.customColumnData as Record<string, string>)
      : {};

  const mergeRowValues = (
    accumulator: Record<number, Record<string, string>>,
    rowNumber: number,
    values?: Record<string, unknown>
  ) => {
    if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
      return;
    }
    if (!values || typeof values !== "object") {
      return;
    }
    const existing = accumulator[rowNumber] ?? {};
    const next: Record<string, string> = { ...existing };
    Object.entries(values).forEach(([key, raw]) => {
      if (raw === undefined || raw === null) {
        return;
      }
      const stringValue = String(raw).trim();
      if (stringValue) {
        next[key] = stringValue;
      }
    });
    if (Object.keys(next).length > 0) {
      accumulator[rowNumber] = next;
    }
  };

  const chamberParts = Array.isArray(chamberData?.parts) ? chamberData.parts : [];

  const parts: UTMPartData[] = chamberParts.map((part: any, partIndex: number) => {
    const partNumber = typeof part?.partNumber === "string" && part.partNumber.trim()
      ? part.partNumber.trim()
      : `Part-${partIndex + 1}`;
    const serialNumber = typeof part?.serialNumber === "string" ? part.serialNumber : "";
    const cosmeticImages = Array.isArray(part?.cosmeticImages) ? part.cosmeticImages : [];
    const nonCosmeticImages = Array.isArray(part?.nonCosmeticImages) ? part.nonCosmeticImages : [];
    const postCosmeticImages = Array.isArray(part?.postCosmeticImages) ? part.postCosmeticImages : [];
    const postNonCosmeticImages = Array.isArray(part?.postNonCosmeticImages) ? part.postNonCosmeticImages : [];
    const checkpointEntries = Array.isArray(part?.checkpointData)
      ? part.checkpointData
      : Array.isArray(part?.checkpointInfo?.checkpointHistory)
        ? part.checkpointInfo.checkpointHistory
        : [];

    const partRowData: Record<number, Record<string, string>> = {};

    checkpointEntries.forEach((entry: any, entryIndex: number) => {
      const checkpointIndex = typeof entry?.checkpointIndex === "number" ? entry.checkpointIndex : entryIndex;
      const rowNumber = checkpointIndex + 1;
      const inlineData = entry?.customData && typeof entry.customData === "object"
        ? (entry.customData as Record<string, unknown>)
        : {};

      const resolvedValues: Record<string, string> = {};
      customColumns.forEach((column) => {
        const inlineValue = inlineData[column.id];
        const fallbackKey = `${partIndex}-${checkpointIndex}-${column.id}`;
        const persistedValue = globalCustomColumnData[fallbackKey];
        const winner = inlineValue ?? persistedValue;
        if (winner !== undefined && winner !== null) {
          const normalized = String(winner).trim();
          if (normalized) {
            resolvedValues[column.id] = normalized;
          }
        }
      });

      mergeRowValues(partRowData, rowNumber, resolvedValues);
    });

    if (part?.utmCustomColumnData && typeof part.utmCustomColumnData === "object") {
      Object.entries(part.utmCustomColumnData as Record<string, Record<string, unknown>>).forEach(([rowKey, values]) => {
        const rowNumber = Number(rowKey);
        mergeRowValues(partRowData, rowNumber, values);
      });
    }

    const cropperRowData = utmCropperData?.customColumnData?.[partNumber];
    if (cropperRowData && typeof cropperRowData === "object") {
      Object.entries(cropperRowData).forEach(([rowKey, values]) => {
        const rowNumber = Number(rowKey);
        mergeRowValues(partRowData, rowNumber, values);
      });
    }

    const resolvedCroppedImages =
      utmCropperData?.croppedImages?.[partNumber]
      ?? (part?.croppedImages && typeof part.croppedImages === "object" ? part.croppedImages : {});

    const pickFirstImage = (images?: unknown): string | undefined => {
      if (!Array.isArray(images)) {
        return undefined;
      }
      for (const candidate of images) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate;
        }
      }
      return undefined;
    };

    const checkpointCosmeticImage = checkpointEntries.reduce<string | undefined>((acc, entry) => {
      const next = pickFirstImage(entry?.cosmeticImages);
      return next ?? acc ?? undefined;
    }, undefined);

    const checkpointNonCosmeticImage = checkpointEntries.reduce<string | undefined>((acc, entry) => {
      const next = pickFirstImage(entry?.nonCosmeticImages);
      return next ?? acc ?? undefined;
    }, undefined);

    const savedPostCosmeticImage = (() => {
      if (typeof part?.postCosmeticImage === "string" && part.postCosmeticImage.trim()) {
        return part.postCosmeticImage.trim();
      }
      const lastFromArray = postCosmeticImages.length > 0 ? postCosmeticImages[postCosmeticImages.length - 1] : undefined;
      if (typeof lastFromArray === "string" && lastFromArray.trim()) {
        return lastFromArray.trim();
      }
      return undefined;
    })();

    const savedPostNonCosmeticImage = (() => {
      if (typeof part?.postNonCosmeticImage === "string" && part.postNonCosmeticImage.trim()) {
        return part.postNonCosmeticImage.trim();
      }
      const lastFromArray = postNonCosmeticImages.length > 0 ? postNonCosmeticImages[postNonCosmeticImages.length - 1] : undefined;
      if (typeof lastFromArray === "string" && lastFromArray.trim()) {
        return lastFromArray.trim();
      }
      return undefined;
    })();

    const resolvedPostCosmeticImage =
      utmCropperData?.postCosmeticImages?.[partNumber]
      ?? savedPostCosmeticImage
      ?? checkpointCosmeticImage;

    const resolvedPostNonCosmeticImage =
      utmCropperData?.postNonCosmeticImages?.[partNumber]
      ?? savedPostNonCosmeticImage
      ?? checkpointNonCosmeticImage;

    return {
      partNumber,
      serialNumber,
      cosmeticImages,
      nonCosmeticImages,
      postCosmeticImage: resolvedPostCosmeticImage,
      postNonCosmeticImage: resolvedPostNonCosmeticImage,
      postCosmeticImages,
      postNonCosmeticImages,
      croppedImages: resolvedCroppedImages,
      customColumnData: partRowData,
    };
  });

  const coerceString = (value: unknown, fallback: string): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return fallback;
  };

  const machineDetails = chamberData?.machineDetails ?? {};
  const selectedTest = machineDetails?.selectedTest ?? (Array.isArray(machineDetails?.tests) ? machineDetails.tests[0] : undefined);
  const primaryPart = chamberData?.parts?.[0] ?? {};

  return {
    testName: coerceString(selectedTest?.testName ?? primaryPart?.testName ?? chamberData?.testName, "UTM Test"),
    ticketCode: coerceString(machineDetails?.ticketCode ?? chamberData?.ticketCode ?? primaryPart?.ticketCode, "N/A"),
    project: coerceString(machineDetails?.project, "N/A"),
    build: coerceString(machineDetails?.build, "N/A"),
    colour: coerceString(machineDetails?.colour, "N/A"),
    machine: coerceString(
      machineDetails?.machineDescription
      ?? chamberData?.machineDescription
      ?? machineDetails?.machine
      ?? chamberData?.machine,
      "UTM"
    ),
    testCondition: coerceString(
      selectedTest?.testCondition
      ?? primaryPart?.testCondition
      ?? chamberData?.testCondition,
      "N/A"
    ),
    specification: coerceString(
      selectedTest?.originalTest?.specification
      ?? selectedTest?.specification
      ?? chamberData?.specification,
      "N/A"
    ),
    parts,
    customColumns,
  };
};