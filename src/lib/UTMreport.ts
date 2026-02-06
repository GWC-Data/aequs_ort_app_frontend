import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../assets/logo.png";
import { getBackendApiUrl } from "./backendApi";

// UTM Region definitions matching UTMImageCropper
const UTM_REGIONS = {
  clear: [
    { x: 88, y: 3, width: 50, height: 48, label: "CL-1" },
    { x: 162, y: 3, width: 50, height: 48, label: "CL-2" },
    { x: 240, y: 1.5, width: 50, height: 50, label: "CL-3" },
    { x: 318, y: 1.5, width: 50, height: 50, label: "CL-4" },
  ],
  foot: [
    { x: 20, y: 10, width: 48, height: 55, label: "FT-1" },
    { x: 387, y: 10, width: 60, height: 50, label: "FT-2" },
    { x: 388, y: 250, width: 60, height: 50, label: "FT-3" },
    { x: 20, y: 245, width: 55, height: 70, label: "FT-4" },
  ],
  sideSnap: [
    { x: 17, y: 100, width: 55, height: 45, label: "SS-1" },
    { x: 395, y: 85, width: 55, height: 45, label: "SS-2" },
    { x: 117, y: 280, width: 55, height: 45, label: "SS-3" },
    { x: 300, y: 278, width: 60, height: 50, label: "SS-4" },
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
  customImages?: Array<{ label: string; path: string }>; // dynamic "Pre {label}" image columns
  customColumnData?: Record<number, Record<string, string>>; // rowNum -> columnId -> value
  checkpointData?: Array<{
    label?: string;
    status?: string;
    testDate?: string;
    checkpointIndex?: number;
    checkpointValue?: number | string;
    cosmeticImages?: string[];
    nonCosmeticImages?: string[];
    customData?: Record<string, unknown>;
    customColumnEntries?: any[];
    selectedOption?: string;
    submittedAt?: string;
  }>;
  checkpointInfo?: {
    checkpoints?: any[];
    [key: string]: any;
  };
  completedAt?: string;
  loadedAt?: string;
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
  customImageColumns?: string[]; // deduplicated labels from customImages, used as "Pre {label}" headers
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

// Helper: normalise a raw status string into one of the known display values
const normaliseStatus = (raw?: string): string => {
  if (!raw || typeof raw !== "string") return "";
  switch (raw.trim().toLowerCase()) {
    case "pass": return "Pass";
    case "fail": return "Fail";
    case "pending": return "Pending";
    default: return raw.trim().toUpperCase();
  }
};

// Helper: style a status cell with colour-coded fill + font
const applyStatusStyle = (cell: ExcelJS.Cell, status: string): void => {
  const upper = status.toUpperCase();

  let fillColor = "FFFFFFFF"; // default white
  let fontColor = "FF000000"; // default black

  if (upper === "PASS") {
    fillColor = "FFC6EFCE"; // light green
    fontColor = "FF006100"; // dark green
  } else if (upper === "FAIL") {
    fillColor = "FFFFC7CE"; // light red
    fontColor = "FF9C0006"; // dark red
  } else if (upper === "PENDING") {
    fillColor = "FFFFEB9C"; // light yellow
    fontColor = "FF9C6500"; // dark amber
  }

  cell.value = status;
  cell.font = { bold: true, color: { argb: fontColor } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

// Helper function to parse image URLs from customData
const parseCustomDataImages = (customData: any): { cosmetic?: string; nonCosmetic?: string } => {
  if (!customData || typeof customData !== 'object') {
    return {};
  }

  const result: { cosmetic?: string; nonCosmetic?: string } = {};

  // Parse cosmetic image
  if (customData.cosmetic && typeof customData.cosmetic === 'string') {
    try {
      const parsed = JSON.parse(customData.cosmetic);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        result.cosmetic = parsed[0];
      }
    } catch {
      // If not valid JSON, try to extract URL directly
      const cleaned = customData.cosmetic.replace(/[\[\]"]/g, '');
      if (cleaned && cleaned.trim()) {
        result.cosmetic = cleaned;
      }
    }
  }

  // Parse nonCosmetic image
  if (customData.nonCosmetic && typeof customData.nonCosmetic === 'string') {
    try {
      const parsed = JSON.parse(customData.nonCosmetic);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        result.nonCosmetic = parsed[0];
      }
    } catch {
      // If not valid JSON, try to extract URL directly
      const cleaned = customData.nonCosmetic.replace(/[\[\]"]/g, '');
      if (cleaned && cleaned.trim()) {
        result.nonCosmetic = cleaned;
      }
    }
  }

  return result;
};

export const downloadUTMReport = async (data: UTMReportData): Promise<void> => {
  console.log('data', data)
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

    // Create single UTM Results Sheet for ALL parts
    const utmSheet = workbook.addWorksheet("UTM Report");
    const imageTasks: Promise<void>[] = [];

    // Check if any part has valid checkpoints array with values
    const hasValidCheckpoints = data.parts.some(part => {
      const checkpoints = part.checkpointInfo?.checkpoints;
      return Array.isArray(checkpoints) && checkpoints.length > 0;
    });

    console.log('hasValidCheckpoints:', hasValidCheckpoints);

    // Collect all unique custom columns from customColumnEntries across all parts
    const dynamicCustomColumnsMap = new Map<string, { columnName: string; columnType: string }>();

    data.parts.forEach(part => {
      const checkpointData = Array.isArray(part.checkpointData) ? part.checkpointData : [];
      checkpointData.forEach(checkpoint => {
        const customColumnEntries = checkpoint.customColumnEntries || [];
        customColumnEntries.forEach((entry: any) => {
          if (!dynamicCustomColumnsMap.has(entry.columnId)) {
            dynamicCustomColumnsMap.set(entry.columnId, {
              columnName: entry.columnName || entry.columnId,
              columnType: entry.columnType || 'text'
            });
          }
        });
      });
    });

    const dynamicCustomColumns = Array.from(dynamicCustomColumnsMap.entries()).map(([id, info]) => ({
      id,
      label: info.columnName,
      type: info.columnType as "text" | "number" | "image" | "dropdown"
    }));

    console.log('Dynamic custom columns:', dynamicCustomColumns);

    // Dynamic "Pre {label}" columns
    const customImageLabels = data.customImageColumns || [];
    console.log('customImageLabels:', customImageLabels);

    // Column layout
    const checkpointColOffset = hasValidCheckpoints ? 1 : 0;
    const preBase = 2 + checkpointColOffset;
    const postBase = preBase + customImageLabels.length;
    const customBase = postBase + 6; // After Clear, Foot, Side Snap, Side Screw
    const statusIdx = customBase + dynamicCustomColumns.length; // Status is ALWAYS LAST

    // Build ExcelJS column definitions
    const columns: { key: string; width: number }[] = [
      { key: "testDate", width: 15 },
      { key: "partNumber", width: 15 },
      ...(hasValidCheckpoints ? [{ key: "checkpoint", width: 20 }] : []),
      ...customImageLabels.map((_, i) => ({ key: `preImg_${i}`, width: 25 })),
      { key: "postCosmeticImage", width: 25 },
      { key: "postNonCosmeticImage", width: 25 },
      { key: "clearImage", width: 20 },
      { key: "footImage", width: 20 },
      { key: "sideSnapImage", width: 20 },
      { key: "sideScrewImage", width: 20 },
      ...dynamicCustomColumns.map(col => ({ key: col.id, width: 20 })),
      { key: "status", width: 15 },
    ];
    utmSheet.columns = columns;

    // Top header rows
    let currentRow = 1;

    const headerRow1 = utmSheet.getRow(currentRow);
    headerRow1.values = ["Test Name", data.testName, "ERS", data.ticketCode];
    headerRow1.height = 30;
    headerRow1.alignment = { vertical: "middle" };
    headerRow1.getCell(1).font = { bold: true };
    headerRow1.getCell(3).font = { bold: true };
    headerRow1.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
    currentRow++;

    const headerRow2 = utmSheet.getRow(currentRow);
    headerRow2.values = ["Machine", data.machine, "Failure Criteria", data.specification];
    headerRow2.height = 30;
    headerRow2.alignment = { vertical: "middle" };
    headerRow2.getCell(1).font = { bold: true };
    headerRow2.getCell(3).font = { bold: true };
    headerRow2.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
    currentRow++;

    const headerRow3 = utmSheet.getRow(currentRow);
    headerRow3.values = ["Condition", data.testCondition, "Project", data.project];
    headerRow3.height = 30;
    headerRow3.alignment = { vertical: "middle" };
    headerRow3.getCell(1).font = { bold: true };
    headerRow3.getCell(3).font = { bold: true };
    headerRow3.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
    currentRow++;

    currentRow++; // empty row

    // Column header row
    const headerValues = [
      "Date",
      "Part Number",
      ...(hasValidCheckpoints ? ["Checkpoints"] : []),
      ...customImageLabels.map(label => `Pre ${label}`),
      "Post Cosmetic",
      "Post Non-Cosmetic",
      "Clear",
      "Foot",
      "Side Snap",
      "Side Screw",
      ...dynamicCustomColumns.map(col => col.label),
      "Status"
    ];

    const headerRow = utmSheet.getRow(currentRow);
    headerRow.values = headerValues;
    headerRow.font = { bold: true };
    headerRow.height = 30;
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
    currentRow++;

    // Process all parts
    for (let partIndex = 0; partIndex < data.parts.length; partIndex++) {
      const part = data.parts[partIndex];

      const checkpointData = Array.isArray(part.checkpointData) && part.checkpointData.length > 0
        ? part.checkpointData : [];

      const croppingSource = part.postNonCosmeticImage || part.postCosmeticImage;
      const generatedCrops = await cropImageToUTMRegions(croppingSource);
      const partCroppedImages: Record<string, string> = { ...generatedCrops, ...(part.croppedImages || {}) };

      checkpointData.forEach((checkpoint, checkpointIdx) => {
        const formatDateOnly = (dateString?: string): string => {
          if (!dateString) return "";
          try {
            const d = new Date(dateString);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          } catch { return ""; }
        };

        const testDate = formatDateOnly(checkpoint.testDate || checkpoint.submittedAt || part.completedAt || part.loadedAt);
        const statusValue = normaliseStatus(checkpoint.status);

        // Get selectedOption from checkpoint
        const selectedOption = (checkpoint.selectedOption || "").toLowerCase();

        // Get checkpoints array from checkpointInfo
        const checkpoints = part.checkpointInfo?.checkpoints || [];
        const hasCheckpoints = Array.isArray(checkpoints) && checkpoints.length > 0;

        // Determine number of rows based on checkpoints array or default to 4
        const rowCount = hasCheckpoints ? checkpoints.length : 4;

        console.log(`Part ${part.partNumber} - Checkpoint info:`, {
          checkpoints,
          hasCheckpoints,
          rowCount,
          selectedOption
        });

        // Process rows based on checkpoints
        for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
          // Use checkpoint value from checkpoints array if available
          const checkpointValue = hasCheckpoints
            ? checkpoints[rowNum - 1]
            : (checkpoint.checkpointValue !== undefined ? checkpoint.checkpointValue : checkpointIdx);

          const displayCheckpoint = hasCheckpoints ? `${checkpointValue}` : ` T${checkpointValue}`;

          console.log(`Row ${rowNum} - Checkpoint value:`, checkpointValue, 'Display:', displayCheckpoint);

          // Initialize row
          const totalCols = statusIdx + 1;
          const rowData: string[] = new Array(totalCols).fill("");
          rowData[0] = testDate;
          rowData[1] = part.partNumber;
          if (hasValidCheckpoints) rowData[2] = displayCheckpoint;

          // Get custom column values for this row
          const customColumnEntries = checkpoint.customColumnEntries || [];
          const rowEntries = customColumnEntries.filter((entry: any) => entry.row === rowNum);

          // Build a map of columnId -> value for this row
          const rowCustomDataMap = new Map<string, any>();
          rowEntries.forEach((entry: any) => {
            rowCustomDataMap.set(entry.columnId, entry);
          });

          const dataRow = utmSheet.addRow(rowData);
          dataRow.height = 90;
          dataRow.alignment = { horizontal: "center", vertical: "middle" };

          // Status (ALWAYS LAST COLUMN, ALL ROWS)
          if (statusValue) {
            applyStatusStyle(dataRow.getCell(statusIdx + 1), statusValue);
          }

          // Dynamic Pre images (ALL ROWS)
          if (part.customImages && customImageLabels.length > 0) {
            customImageLabels.forEach((label, i) => {
              const match = part.customImages!.find(
                ci => ci.label.trim().toLowerCase() === label.trim().toLowerCase()
              );
              if (match?.path) {
                imageTasks.push((async () => {
                  const imageData = await resolveImageForWorksheet(match.path);
                  if (imageData) {
                    const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                    utmSheet.addImage(imgId, {
                      tl: { col: preBase + i, row: dataRow.number - 1 },
                      ext: { width: 90, height: 85 }
                    });
                  }
                })());
              }
            });
          }

          // Post Cosmetic
          if (part.postCosmeticImage) {
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(part.postCosmeticImage!);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, { tl: { col: postBase, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
              }
            })());
          }

          // Post Non-Cosmetic
          if (part.postNonCosmeticImage) {
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(part.postNonCosmeticImage!);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, { tl: { col: postBase + 1, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
              }
            })());
          }

          // Clear (CL-N)
          if (partCroppedImages[`CL-${rowNum}`]) {
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(partCroppedImages[`CL-${rowNum}`]);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, { tl: { col: postBase + 2, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
              }
            })());
          }

          // Foot (FT-N)
          if (partCroppedImages[`FT-${rowNum}`]) {
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(partCroppedImages[`FT-${rowNum}`]);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, { tl: { col: postBase + 3, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
              }
            })());
          }

          // Side Snap (SS-N) - ALL rows show their respective SS image
          if (partCroppedImages[`SS-${rowNum}`]) {
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(partCroppedImages[`SS-${rowNum}`]);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, { tl: { col: postBase + 4, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
              }
            })());
          }

          // Side Screw - Show ONLY the image that matches selectedOption
          const expectedOption = `ss${rowNum}`;
          if (selectedOption === expectedOption && partCroppedImages[`SS-${rowNum}`]) {

            // Add the specific SS image
            imageTasks.push((async () => {
              const imageData = await resolveImageForWorksheet(partCroppedImages[`SS-${rowNum}`]);
              if (imageData) {
                const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                utmSheet.addImage(imgId, {
                  tl: { col: postBase + 5, row: dataRow.number - 1 },
                  ext: { width: 90, height: 70 }
                });
              }
            })());
          }

          // Dynamic custom columns from customColumnEntries
          dynamicCustomColumns.forEach((col, colIdx) => {
            const entry = rowCustomDataMap.get(col.id);
            const col0 = customBase + colIdx;

            if (entry) {
              if (col.type === "image" && entry.value) {
                // Parse image path from JSON array
                let imagePath = entry.value;
                if (imagePath.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(imagePath);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      imagePath = parsed[0];
                    }
                  } catch {
                    // Keep original
                  }
                }

                if (imagePath) {
                  imageTasks.push((async () => {
                    const imageData = await resolveImageForWorksheet(imagePath);
                    if (imageData) {
                      const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                      utmSheet.addImage(imgId, {
                        tl: { col: col0, row: dataRow.number - 1 },
                        ext: { width: 90, height: 85 }
                      });
                    }
                  })());
                }
              } else {
                // Text, number, dropdown
                dataRow.getCell(col0 + 1).value = entry.value || "";
              }
            }
          });

          // Borders on every cell in the row
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" }
            };
          });
        }
      });
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

    // Extract post-test images from checkpoint customData
    const checkpointCustomDataImages = checkpointEntries.reduce((acc, entry) => {
      if (entry?.customData) {
        const parsed = parseCustomDataImages(entry.customData);
        return {
          cosmetic: parsed.cosmetic || acc.cosmetic,
          nonCosmetic: parsed.nonCosmetic || acc.nonCosmetic
        };
      }
      return acc;
    }, { cosmetic: undefined, nonCosmetic: undefined });

    const resolvedPostCosmeticImage =
      utmCropperData?.postCosmeticImages?.[partNumber]
      ?? savedPostCosmeticImage
      ?? checkpointCustomDataImages.cosmetic
      ?? checkpointCosmeticImage;

    const resolvedPostNonCosmeticImage =
      utmCropperData?.postNonCosmeticImages?.[partNumber]
      ?? savedPostNonCosmeticImage
      ?? checkpointCustomDataImages.nonCosmetic
      ?? checkpointNonCosmeticImage;

    return {
      partNumber,
      cosmeticImages,
      nonCosmeticImages,
      postCosmeticImage: resolvedPostCosmeticImage,
      postNonCosmeticImage: resolvedPostNonCosmeticImage,
      postCosmeticImages,
      postNonCosmeticImages,
      croppedImages: resolvedCroppedImages,
      customImages: Array.isArray(part?.customImages)
        ? part.customImages
          .filter((ci: any) => ci && typeof ci.label === "string" && ci.label.trim() && typeof ci.path === "string" && ci.path.trim())
          .map((ci: any) => ({ label: ci.label.trim(), path: ci.path.trim() }))
        : [],
      customColumnData: partRowData,
      checkpointData: part.checkpointData || [],
      checkpointInfo: part.checkpointInfo || {},
      completedAt: part.completedAt,
      loadedAt: part.loadedAt,
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

  // Deduplicate customImage labels across all parts
  const customImageLabelSet = new Set<string>();
  const customImageColumns: string[] = [];
  parts.forEach(p => {
    (p.customImages || []).forEach(ci => {
      const key = ci.label.toLowerCase();
      if (!customImageLabelSet.has(key)) {
        customImageLabelSet.add(key);
        customImageColumns.push(ci.label);
      }
    });
  });

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
    customImageColumns,
    customColumns,
  };
};