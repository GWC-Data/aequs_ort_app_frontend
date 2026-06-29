

// import ExcelJS from "exceljs";
// import { saveAs } from "file-saver";
// import Logo from "../assets/logo.png";
// import { getBackendApiUrl } from "./backendApi";

// // UTM Region definitions matching UTMImageCropper (DEFAULT FALLBACK)
// const UTM_REGIONS = {
//   clear: [
//     { x: 88, y: 3, width: 50, height: 48, label: "CL-1" },
//     { x: 162, y: 3, width: 50, height: 48, label: "CL-2" },
//     { x: 240, y: 1.5, width: 50, height: 50, label: "CL-3" },
//     { x: 318, y: 1.5, width: 50, height: 50, label: "CL-4" },
//   ],
//   foot: [
//     { x: 20, y: 10, width: 48, height: 55, label: "FT-1" },
//     { x: 387, y: 10, width: 60, height: 50, label: "FT-2" },
//     { x: 388, y: 250, width: 60, height: 50, label: "FT-3" },
//     { x: 20, y: 245, width: 55, height: 70, label: "FT-4" },
//   ],
//   sideSnap: [
//     { x: 17, y: 100, width: 55, height: 45, label: "SS-1" },
//     { x: 395, y: 85, width: 55, height: 45, label: "SS-2" },
//     { x: 117, y: 280, width: 55, height: 45, label: "SS-3" },
//     { x: 300, y: 278, width: 60, height: 50, label: "SS-4" },
//   ],
// };

// const ALL_REGIONS = [
//   ...UTM_REGIONS.clear,
//   ...UTM_REGIONS.foot,
//   ...UTM_REGIONS.sideSnap,
// ];

// interface CropRegion {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   label: string;
// }

// interface UTMCroppedImages {
//   [key: string]: string; // e.g., "CL-1": base64ImageData
// }

// interface UTMPartData {
//   partNumber: string;
//   serialNumber?: string;
//   cosmeticImages?: string[];
//   nonCosmeticImages?: string[];
//   postCosmeticImage?: string;
//   postNonCosmeticImage?: string;
//   postCosmeticImages?: string[];
//   postNonCosmeticImages?: string[];
//   croppedImages?: UTMCroppedImages;
//   customImages?: Array<{ label: string; path: string }>; // dynamic "Pre {label}" image columns
//   customColumnData?: Record<number, Record<string, string>>; // rowNum -> columnId -> value
//   checkpointData?: Array<{
//     label?: string;
//     status?: string;
//     testDate?: string;
//     checkpointIndex?: number;
//     checkpointValue?: number | string;
//     cosmeticImages?: string[];
//     nonCosmeticImages?: string[];
//     customData?: Record<string, unknown>;
//     customColumnEntries?: any[];
//     selectedOption?: string;
//     submittedAt?: string;
//     cropRegions?: CropRegion[]; // ✅ NEW: Saved crop regions
//   }>;
//   checkpointInfo?: {
//     checkpoints?: any[];
//     [key: string]: any;
//   };
//   completedAt?: string;
//   loadedAt?: string;
// }

// interface CustomColumn {
//   id: string;
//   label: string;
//   type: "text" | "number" | "image" | "dropdown";
//   options?: string[];
// }

// interface UTMReportData {
//   testName: string;
//   ticketCode: string;
//   project: string;
//   build: string;
//   colour: string;
//   machine: string;
//   testCondition: string;
//   specification: string;
//   parts: UTMPartData[];
//   customImageColumns?: string[]; // deduplicated labels from customImages, used as "Pre {label}" headers
//   customColumns?: CustomColumn[];
// }

// type SupportedImageExtension = "png" | "jpeg";

// const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9+./-]+);base64,(.+)$/i;

// const resolveImageRequestUrl = (imageSrc: string): string => {
//   if (!imageSrc) {
//     return imageSrc;
//   }

//   if (/^(?:https?:\/\/|data:|blob:)/i.test(imageSrc)) {
//     return imageSrc;
//   }

//   const trimmedSrc = imageSrc.trim();

//   if (/^\/?uploads\//i.test(trimmedSrc)) {
//     try {
//       const baseUrl = getBackendApiUrl();
//       if (!baseUrl) {
//         return trimmedSrc;
//       }

//       const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
//       return new URL(trimmedSrc.replace(/^\//, ""), normalizedBase).toString();
//     } catch (_error) {
//       return trimmedSrc;
//     }
//   }

//   if (trimmedSrc.startsWith("//")) {
//     const protocol = typeof window !== "undefined" && window.location ? window.location.protocol : "https:";
//     return `${protocol}${trimmedSrc}`;
//   }

//   if (typeof window !== "undefined" && window.location) {
//     try {
//       return new URL(trimmedSrc, window.location.origin).toString();
//     } catch (_error) {
//       return trimmedSrc;
//     }
//   }

//   return trimmedSrc;
// };

// const loadImageAsBase64 = async (imageSrc: string): Promise<{ base64: string; mime: string } | null> => {
//   if (!imageSrc) {
//     return null;
//   }

//   if (imageSrc.startsWith("blob:")) {
//     return null;
//   }

//   const dataUrlMatch = DATA_URL_REGEX.exec(imageSrc);
//   if (dataUrlMatch) {
//     return { mime: dataUrlMatch[1], base64: dataUrlMatch[2] };
//   }

//   try {
//     const fetchUrl = resolveImageRequestUrl(imageSrc);
//     const response = await fetch(fetchUrl);
//     if (!response.ok) {
//       console.warn("Failed to fetch image", fetchUrl, response.status);
//       return null;
//     }
//     const blob = await response.blob();

//     return await new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         const result = reader.result;
//         if (typeof result === "string") {
//           const match = DATA_URL_REGEX.exec(result);
//           if (match) {
//             resolve({ mime: match[1], base64: match[2] });
//             return;
//           }
//           const commaIndex = result.indexOf(",");
//           if (commaIndex !== -1) {
//             resolve({ mime: blob.type || "image/png", base64: result.slice(commaIndex + 1) });
//             return;
//           }
//         }
//         resolve({ mime: blob.type || "image/png", base64: "" });
//       };
//       reader.onerror = () => reject(new Error("Failed to read image"));
//       reader.readAsDataURL(blob);
//     });
//   } catch (error) {
//     console.error("Failed to load image", error);
//     return null;
//   }
// };

// const normalizeImageExtension = (mime?: string): SupportedImageExtension => {
//   if (!mime) {
//     return "png";
//   }

//   const match = /^image\/([a-z0-9+.-]+)/i.exec(mime);
//   const subtype = match?.[1]?.toLowerCase() ?? "png";

//   if (subtype === "jpg") {
//     return "jpeg";
//   }

//   if (subtype === "jpeg" || subtype === "png") {
//     return subtype as SupportedImageExtension;
//   }

//   return "png";
// };

// const resolveImageForWorksheet = async (
//   imageSrc: string
// ): Promise<{ base64: string; extension: SupportedImageExtension } | null> => {
//   const result = await loadImageAsBase64(imageSrc);
//   if (!result || !result.base64) {
//     return null;
//   }

//   return {
//     base64: result.base64,
//     extension: normalizeImageExtension(result.mime)
//   };
// };

// const convertImageToBase64 = async (imageSrc: string): Promise<string | null> => {
//   const result = await loadImageAsBase64(imageSrc);
//   return result?.base64 ?? null;
// };

// const UTM_BASE_CANVAS_WIDTH = 480;
// const UTM_BASE_CANVAS_HEIGHT = 320;
// const CROPPED_IMAGE_CACHE = new Map<string, Record<string, string>>();

// // ✅ UPDATED: Now accepts custom regions as parameter
// const cropImageToUTMRegions = async (
//   imageSrc?: string,
//   customRegions?: CropRegion[]
// ): Promise<Record<string, string>> => {
//   if (!imageSrc) {
//     return {};
//   }

//   // ✅ Create cache key that includes custom regions
//   const cacheKey = customRegions
//     ? `${imageSrc}-${JSON.stringify(customRegions)}`
//     : imageSrc;

//   if (CROPPED_IMAGE_CACHE.has(cacheKey)) {
//     console.log('✅ Using cached cropped images for:', imageSrc.substring(0, 50));
//     return CROPPED_IMAGE_CACHE.get(cacheKey)!;
//   }

//   if (typeof document === "undefined" || typeof Image === "undefined") {
//     return {};
//   }

//   const payload = await loadImageAsBase64(imageSrc);
//   if (!payload || !payload.base64) {
//     return {};
//   }

//   const dataUrl = `data:${payload.mime || "image/png"};base64,${payload.base64}`;

//   // ✅ Use custom regions if provided, otherwise fall back to defaults
//   const regionsToUse = customRegions && customRegions.length > 0
//     ? customRegions
//     : ALL_REGIONS;

//   console.log(`🔧 Cropping image with ${customRegions ? 'CUSTOM' : 'DEFAULT'} regions:`, regionsToUse.length, 'regions');

//   const croppedResults = await new Promise<Record<string, string>>((resolve) => {
//     const image = new Image();
//     image.onload = () => {
//       try {
//         const scaleX = image.width / UTM_BASE_CANVAS_WIDTH;
//         const scaleY = image.height / UTM_BASE_CANVAS_HEIGHT;
//         const results: Record<string, string> = {};

//         console.log(`📐 Image dimensions: ${image.width}x${image.height}, Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);

//         regionsToUse.forEach((region) => {
//           const rawX = Math.round(region.x * scaleX);
//           const rawY = Math.round(region.y * scaleY);
//           const rawWidth = Math.round(region.width * scaleX);
//           const rawHeight = Math.round(region.height * scaleY);

//           const x = Math.max(0, Math.min(rawX, image.width - 1));
//           const y = Math.max(0, Math.min(rawY, image.height - 1));
//           const width = Math.min(rawWidth, image.width - x);
//           const height = Math.min(rawHeight, image.height - y);

//           if (width <= 0 || height <= 0) {
//             console.warn(`⚠️ Invalid dimensions for ${region.label}: ${width}x${height}`);
//             return;
//           }

//           const canvas = document.createElement("canvas");
//           const ctx = canvas.getContext("2d");
//           if (!ctx) {
//             return;
//           }
//           canvas.width = width;
//           canvas.height = height;
//           ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
//           results[region.label] = canvas.toDataURL("image/png");

//           console.log(`✂️ Cropped ${region.label}: x=${x}, y=${y}, w=${width}, h=${height}`);
//         });

//         console.log(`✅ Successfully cropped ${Object.keys(results).length} regions`);
//         resolve(results);
//       } catch (error) {
//         console.error('❌ Error cropping image:', error);
//         resolve({});
//       }
//     };
//     image.onerror = () => {
//       console.error('❌ Failed to load image for cropping');
//       resolve({});
//     };
//     image.src = dataUrl;
//   });

//   CROPPED_IMAGE_CACHE.set(cacheKey, croppedResults);
//   return croppedResults;
// };

// // ✅ NEW: Helper function to extract crop regions from checkpoint data
// const extractCropRegionsFromCheckpoint = (checkpoint: any): CropRegion[] | undefined => {
//   // First, check if cropRegions array exists directly on checkpoint
//   if (Array.isArray(checkpoint.cropRegions) && checkpoint.cropRegions.length > 0) {
//     console.log('✅ Found cropRegions array in checkpoint:', checkpoint.cropRegions.length, 'regions');
//     return checkpoint.cropRegions;
//   }

//   // Second, check if it's stored as JSON string in customData
//   if (checkpoint.customData?.cropRegions) {
//     try {
//       const parsed = typeof checkpoint.customData.cropRegions === 'string'
//         ? JSON.parse(checkpoint.customData.cropRegions)
//         : checkpoint.customData.cropRegions;

//       if (Array.isArray(parsed) && parsed.length > 0) {
//         console.log('✅ Found cropRegions in customData (JSON):', parsed.length, 'regions');
//         return parsed;
//       }
//     } catch (error) {
//       console.error('❌ Failed to parse cropRegions from customData:', error);
//     }
//   }

//   console.log('⚠️ No custom crop regions found in checkpoint, will use defaults');
//   return undefined;
// };

// // ─── NEW: Parse instron_* graph image paths from customData ───────────────────
// // Returns a map of columnId → array of paths (index 0 = row 1, index 1 = row 2, …)
// // e.g. { instron_foot: ["/uploads/…row1.png", "/uploads/…row2.png", …] }
// const parseInstronGraphPaths = (customData: any): Record<string, string[]> => {
//   if (!customData || typeof customData !== "object") return {};
//   const result: Record<string, string[]> = {};
//   Object.keys(customData).forEach((key) => {
//     if (!key.startsWith("instron_")) return;
//     const raw = customData[key];
//     if (!raw) return;
//     try {
//       const parsed: string[] = typeof raw === "string" ? JSON.parse(raw) : raw;
//       if (Array.isArray(parsed)) {
//         result[key] = parsed.filter((p) => typeof p === "string" && p.trim() !== "");
//       }
//     } catch {
//       console.warn(`⚠️ Could not parse instron key "${key}":`, raw);
//     }
//   });
//   return result;
// };

// // ─── NEW: Collect all instron column IDs across all parts (for header row) ────
// const collectInstronColumnIds = (parts: UTMPartData[]): string[] => {
//   const seen = new Set<string>();
//   const order: string[] = [];
//   parts.forEach((part) => {
//     const checkpoints = Array.isArray(part.checkpointData) ? part.checkpointData : [];
//     checkpoints.forEach((cp) => {
//       if (!cp.customData) return;
//       Object.keys(cp.customData).forEach((key) => {
//         if (key.startsWith("instron_") && !seen.has(key)) {
//           seen.add(key);
//           order.push(key);
//         }
//       });
//     });
//   });
//   return order;
// };

// // ─── NEW: Friendly label for an instron column ID ─────────────────────────────
// const instronColumnLabel = (columnId: string): string => {
//   // e.g. "instron_foot" → "Instron Foot", "instron_sidesnap" → "Instron Side Snap"
//   return columnId
//     .replace(/^instron_/, "")
//     .replace(/_/g, " ")
//     .replace(/\b\w/g, (c) => c.toUpperCase())
//     .replace(/\bFoot\b/, "Instron Foot")
//     .replace(/\bSidesnap\b/, "Instron SideSnap")
//     .replace(/\bCleat\b/, "Instron Cleat");
// };

// // Helper: normalise a raw status string into one of the known display values
// const normaliseStatus = (raw?: string): string => {
//   if (!raw || typeof raw !== "string") return "";
//   switch (raw.trim().toLowerCase()) {
//     case "pass": return "Pass";
//     case "fail": return "Fail";
//     case "pending": return "Pending";
//     default: return raw.trim().toUpperCase();
//   }
// };

// // Helper: style a status cell with colour-coded fill + font
// const applyStatusStyle = (cell: ExcelJS.Cell, status: string): void => {
//   const upper = status.toUpperCase();

//   let fillColor = "FFFFFFFF"; // default white
//   let fontColor = "FF000000"; // default black

//   if (upper === "PASS") {
//     fillColor = "FFC6EFCE"; // light green
//     fontColor = "FF006100"; // dark green
//   } else if (upper === "FAIL") {
//     fillColor = "FFFFC7CE"; // light red
//     fontColor = "FF9C0006"; // dark red
//   } else if (upper === "PENDING") {
//     fillColor = "FFFFEB9C"; // light yellow
//     fontColor = "FF9C6500"; // dark amber
//   }

//   cell.value = status;
//   cell.font = { bold: true, color: { argb: fontColor } };
//   cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
//   cell.alignment = { horizontal: "center", vertical: "middle" };
// };

// // Helper function to parse image URLs from customData
// const parseCustomDataImages = (customData: any): { cosmetic?: string; nonCosmetic?: string } => {
//   if (!customData || typeof customData !== 'object') {
//     return {};
//   }

//   const result: { cosmetic?: string; nonCosmetic?: string } = {};

//   // Parse cosmetic image
//   if (customData.cosmetic && typeof customData.cosmetic === 'string') {
//     try {
//       const parsed = JSON.parse(customData.cosmetic);
//       if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
//         result.cosmetic = parsed[0];
//       }
//     } catch {
//       // If not valid JSON, try to extract URL directly
//       const cleaned = customData.cosmetic.replace(/[\[\]"]/g, '');
//       if (cleaned && cleaned.trim()) {
//         result.cosmetic = cleaned;
//       }
//     }
//   }

//   // Parse nonCosmetic image
//   if (customData.nonCosmetic && typeof customData.nonCosmetic === 'string') {
//     try {
//       const parsed = JSON.parse(customData.nonCosmetic);
//       if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
//         result.nonCosmetic = parsed[0];
//       }
//     } catch {
//       // If not valid JSON, try to extract URL directly
//       const cleaned = customData.nonCosmetic.replace(/[\[\]"]/g, '');
//       if (cleaned && cleaned.trim()) {
//         result.nonCosmetic = cleaned;
//       }
//     }
//   }

//   return result;
// };

// export const downloadUTMReport = async (data: UTMReportData): Promise<void> => {
//   console.log('📊 Starting UTM Report generation with data:', data);
//   try {
//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = "UTM Test Report";
//     workbook.created = new Date();

//     // Create Summary Sheet
//     const summarySheet = workbook.addWorksheet("Summary");
//     summarySheet.columns = [
//       { header: "Field", key: "label", width: 33 },
//       { header: "Details", key: "hint", width: 33 },
//       { header: "Value", key: "value", width: 33 }
//     ];

//     // Header row
//     summarySheet.getRow(1).height = 30;
//     summarySheet.getRow(1).values = [null, "GENERAL TEST INFO", null];
//     summarySheet.mergeCells("B1:C1");
//     summarySheet.getCell("B1").alignment = { horizontal: "center", vertical: "middle" };
//     summarySheet.getCell("B1").font = { bold: true, size: 14 };

//     // Add borders to header
//     ["A1", "B1", "C1"].forEach(cell => {
//       summarySheet.getCell(cell).border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" }
//       };
//     });

//     // Add logo
//     const logoBase64 = await convertImageToBase64(Logo);
//     if (logoBase64) {
//       const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
//       summarySheet.addImage(imageId, {
//         tl: { col: 0, row: 0 },
//         ext: { width: 120, height: 30 }
//       });
//     }

//     // Column headers
//     const columnHeaderRow = summarySheet.getRow(2);
//     columnHeaderRow.values = ["Field", "Details", "Value"];
//     columnHeaderRow.height = 30;
//     columnHeaderRow.font = { bold: true };
//     columnHeaderRow.alignment = { horizontal: "center" };
//     columnHeaderRow.eachCell((cell) => {
//       cell.border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" }
//       };
//     });

//     // Summary data
//     const summaryData = [
//       { label: "Test Name", hint: "(description)", value: data.testName },
//       { label: "Ticket Code / Document No", hint: "(reference)", value: data.ticketCode },
//       { label: "Project Name", hint: "(name)", value: data.project },
//       { label: "Build", hint: "(variant)", value: data.build },
//       { label: "Colour", hint: "(name)", value: data.colour },
//       { label: "Machine ID", hint: "(equipment id)", value: data.machine },
//       { label: "Test Condition", hint: "(checkpoints)", value: data.testCondition },
//       { label: "Specification", hint: "(criteria)", value: data.specification },
//       { label: "Sample Quantity", hint: "(total samples)", value: data.parts.length.toString() },
//     ];

//     summaryData.forEach((item, index) => {
//       const row = summarySheet.getRow(3 + index);
//       row.values = [item.label, item.hint, item.value];
//       row.height = 30;
//       row.alignment = { vertical: "middle" };
//       row.getCell(1).font = { bold: true };
//       row.eachCell((cell) => {
//         cell.border = {
//           top: { style: "thin" },
//           left: { style: "thin" },
//           bottom: { style: "thin" },
//           right: { style: "thin" }
//         };
//       });
//     });

//     // Create single UTM Results Sheet for ALL parts
//     const utmSheet = workbook.addWorksheet("UTM Report");
//     const imageTasks: Promise<void>[] = [];

//     // Check if any part has valid checkpoints array with values
//     const hasValidCheckpoints = data.parts.some(part => {
//       const checkpoints = part.checkpointInfo?.checkpoints;
//       return Array.isArray(checkpoints) && checkpoints.length > 0;
//     });

//     console.log('hasValidCheckpoints:', hasValidCheckpoints);

//     // Collect all unique custom columns from customColumnEntries across all parts
//     const dynamicCustomColumnsMap = new Map<string, { columnName: string; columnType: string }>();

//     data.parts.forEach(part => {
//       const checkpointData = Array.isArray(part.checkpointData) ? part.checkpointData : [];
//       checkpointData.forEach(checkpoint => {
//         const customColumnEntries = checkpoint.customColumnEntries || [];
//         customColumnEntries.forEach((entry: any) => {
//           if (!dynamicCustomColumnsMap.has(entry.columnId)) {
//             dynamicCustomColumnsMap.set(entry.columnId, {
//               columnName: entry.columnName || entry.columnId,
//               columnType: entry.columnType || 'text'
//             });
//           }
//         });
//       });
//     });

//     const dynamicCustomColumns = Array.from(dynamicCustomColumnsMap.entries()).map(([id, info]) => ({
//       id,
//       label: info.columnName,
//       type: info.columnType as "text" | "number" | "image" | "dropdown"
//     }));

//     console.log('Dynamic custom columns:', dynamicCustomColumns);

//     // Dynamic "Pre {label}" columns
//     const customImageLabels = data.customImageColumns || [];
//     console.log('customImageLabels:', customImageLabels);

//     // ─── NEW: Collect instron column IDs from all parts' checkpointData ────────
//     const instronColumnIds = collectInstronColumnIds(data.parts);
//     console.log('Instron graph columns found:', instronColumnIds);

//     // Column layout
//     const checkpointColOffset = hasValidCheckpoints ? 1 : 0;
//     const preBase = 2 + checkpointColOffset;
//     const postBase = preBase + customImageLabels.length;
//     const customBase = postBase + 6; // After Clear, Foot, Side Snap, Side Screw
//     const instronBase = customBase + dynamicCustomColumns.length; // ─── NEW: instron columns after existing custom cols
//     const statusIdx = instronBase + instronColumnIds.length;     // Status is ALWAYS LAST

//     // Build ExcelJS column definitions
//     const columns: { key: string; width: number }[] = [
//       { key: "testDate", width: 15 },
//       { key: "partNumber", width: 15 },
//       ...(hasValidCheckpoints ? [{ key: "checkpoint", width: 20 }] : []),
//       ...customImageLabels.map((_, i) => ({ key: `preImg_${i}`, width: 25 })),
//       { key: "postCosmeticImage", width: 25 },
//       { key: "postNonCosmeticImage", width: 25 },
//       { key: "clearImage", width: 20 },
//       { key: "footImage", width: 20 },
//       { key: "sideSnapImage", width: 20 },
//       { key: "sideScrewImage", width: 20 },
//       ...dynamicCustomColumns.map(col => ({ key: col.id, width: 20 })),
//       // ─── NEW: one column per instron graph type ───────────────────────────
//       ...instronColumnIds.map(colId => ({ key: colId, width: 25 })),
//       { key: "status", width: 15 },
//     ];
//     utmSheet.columns = columns;

//     // Top header rows
//     let currentRow = 1;

//     const headerRow1 = utmSheet.getRow(currentRow);
//     headerRow1.values = ["Test Name", data.testName, "ERS", data.ticketCode];
//     headerRow1.height = 30;
//     headerRow1.alignment = { vertical: "middle" };
//     headerRow1.getCell(1).font = { bold: true };
//     headerRow1.getCell(3).font = { bold: true };
//     headerRow1.eachCell((cell) => {
//       cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
//     });
//     currentRow++;

//     const headerRow2 = utmSheet.getRow(currentRow);
//     headerRow2.values = ["Machine", data.machine, "Failure Criteria", data.specification];
//     headerRow2.height = 30;
//     headerRow2.alignment = { vertical: "middle" };
//     headerRow2.getCell(1).font = { bold: true };
//     headerRow2.getCell(3).font = { bold: true };
//     headerRow2.eachCell((cell) => {
//       cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
//     });
//     currentRow++;

//     const headerRow3 = utmSheet.getRow(currentRow);
//     headerRow3.values = ["Condition", data.testCondition, "Project", data.project];
//     headerRow3.height = 30;
//     headerRow3.alignment = { vertical: "middle" };
//     headerRow3.getCell(1).font = { bold: true };
//     headerRow3.getCell(3).font = { bold: true };
//     headerRow3.eachCell((cell) => {
//       cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
//     });
//     currentRow++;

//     currentRow++; // empty row

//     // Column header row
//     const headerValues = [
//       "Date",
//       "Part Number",
//       ...(hasValidCheckpoints ? ["Checkpoints"] : []),
//       ...customImageLabels.map(label => `Pre ${label}`),
//       "Post Cosmetic",
//       "Post Non-Cosmetic",
//       "Clear",
//       "Foot",
//       "Side Snap",
//       "Side Screw",
//       ...dynamicCustomColumns.map(col => col.label),
//       // ─── NEW: instron column headers ─────────────────────────────────────
//       ...instronColumnIds.map(colId => instronColumnLabel(colId)),
//       "Status"
//     ];

//     const headerRow = utmSheet.getRow(currentRow);
//     headerRow.values = headerValues;
//     headerRow.font = { bold: true };
//     headerRow.height = 30;
//     headerRow.alignment = { horizontal: "center", vertical: "middle" };
//     headerRow.eachCell((cell) => {
//       cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
//     });
//     currentRow++;

//     // Process all parts
//     for (let partIndex = 0; partIndex < data.parts.length; partIndex++) {
//       const part = data.parts[partIndex];

//       console.log(`\n📦 Processing part ${partIndex + 1}/${data.parts.length}: ${part.partNumber}`);

//       const checkpointData = Array.isArray(part.checkpointData) && part.checkpointData.length > 0
//         ? part.checkpointData : [];

//       // ✅ NEW: Extract custom crop regions from the FIRST checkpoint (or any checkpoint with regions)
//       let customCropRegions: CropRegion[] | undefined;
//       for (const checkpoint of checkpointData) {
//         customCropRegions = extractCropRegionsFromCheckpoint(checkpoint);
//         if (customCropRegions) {
//           console.log(`✅ Using custom crop regions from checkpoint (${customCropRegions.length} regions)`);
//           break; // Use the first checkpoint that has regions
//         }
//       }

//       const croppingSource = part.postNonCosmeticImage || part.postCosmeticImage;

//       // ✅ UPDATED: Pass custom regions to cropping function
//       const generatedCrops = await cropImageToUTMRegions(croppingSource, customCropRegions);
//       const partCroppedImages: Record<string, string> = { ...generatedCrops, ...(part.croppedImages || {}) };

//       console.log(`✂️ Generated ${Object.keys(generatedCrops).length} cropped images for ${part.partNumber}`);

//       // ─── NEW: Merge instron graph paths from ALL checkpoints for this part ─
//       // Result: { instron_foot: [row1path, row2path, row3path, row4path], … }
//       const partInstronPaths: Record<string, string[]> = {};
//       checkpointData.forEach((cp) => {
//         const parsed = parseInstronGraphPaths(cp.customData);
//         Object.entries(parsed).forEach(([colId, paths]) => {
//           if (!partInstronPaths[colId]) {
//             partInstronPaths[colId] = paths;
//           } else {
//             // Merge: fill in any missing slots from subsequent checkpoints
//             paths.forEach((p, i) => {
//               if (p && !partInstronPaths[colId][i]) {
//                 partInstronPaths[colId][i] = p;
//               }
//             });
//           }
//         });
//       });
//       console.log(`📊 Instron paths for ${part.partNumber}:`, partInstronPaths);

//       checkpointData.forEach((checkpoint, checkpointIdx) => {
//         const formatDateOnly = (dateString?: string): string => {
//           if (!dateString) return "";
//           try {
//             const d = new Date(dateString);
//             return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
//           } catch { return ""; }
//         };

//         const testDate = formatDateOnly(checkpoint.testDate || checkpoint.submittedAt || part.completedAt || part.loadedAt);
//         const statusValue = normaliseStatus(checkpoint.status);

//         // Get selectedOption from checkpoint
//         const selectedOption = (checkpoint.selectedOption || "").toLowerCase();

//         // Get checkpoints array from checkpointInfo
//         const checkpoints = part.checkpointInfo?.checkpoints || [];
//         const hasCheckpoints = Array.isArray(checkpoints) && checkpoints.length > 0;

//         // Determine number of rows based on checkpoints array or default to 4
//         const rowCount = hasCheckpoints ? checkpoints.length : 4;

//         console.log(`Part ${part.partNumber} - Checkpoint info:`, {
//           checkpoints,
//           hasCheckpoints,
//           rowCount,
//           selectedOption
//         });

//         // Process rows based on checkpoints
//         for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
//           // Use checkpoint value from checkpoints array if available
//           const checkpointValue = hasCheckpoints
//             ? checkpoints[rowNum - 1]
//             : (checkpoint.checkpointValue !== undefined ? checkpoint.checkpointValue : checkpointIdx);

//           const displayCheckpoint = hasCheckpoints ? `${checkpointValue}` : ` T${checkpointValue}`;

//           console.log(`Row ${rowNum} - Checkpoint value:`, checkpointValue, 'Display:', displayCheckpoint);

//           // Initialize row
//           const totalCols = statusIdx + 1;
//           const rowData: string[] = new Array(totalCols).fill("");
//           rowData[0] = testDate;
//           rowData[1] = part.partNumber;
//           if (hasValidCheckpoints) rowData[2] = displayCheckpoint;

//           // Get custom column values for this row
//           const customColumnEntries = checkpoint.customColumnEntries || [];
//           const rowEntries = customColumnEntries.filter((entry: any) => entry.row === rowNum);

//           // Build a map of columnId -> value for this row
//           const rowCustomDataMap = new Map<string, any>();
//           rowEntries.forEach((entry: any) => {
//             rowCustomDataMap.set(entry.columnId, entry);
//           });

//           const dataRow = utmSheet.addRow(rowData);
//           dataRow.height = 90;
//           dataRow.alignment = { horizontal: "center", vertical: "middle" };

//           // Status (ALWAYS LAST COLUMN, ALL ROWS)
//           if (statusValue) {
//             applyStatusStyle(dataRow.getCell(statusIdx + 1), statusValue);
//           }

//           // Dynamic Pre images (ALL ROWS)
//           if (part.customImages && customImageLabels.length > 0) {
//             customImageLabels.forEach((label, i) => {
//               const match = part.customImages!.find(
//                 ci => ci.label.trim().toLowerCase() === label.trim().toLowerCase()
//               );
//               if (match?.path) {
//                 imageTasks.push((async () => {
//                   const imageData = await resolveImageForWorksheet(match.path);
//                   if (imageData) {
//                     const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                     utmSheet.addImage(imgId, {
//                       tl: { col: preBase + i, row: dataRow.number - 1 },
//                       ext: { width: 90, height: 85 }
//                     });
//                   }
//                 })());
//               }
//             });
//           }

//           // Post Cosmetic
//           if (part.postCosmeticImage) {
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(part.postCosmeticImage!);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, { tl: { col: postBase, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
//               }
//             })());
//           }

//           // Post Non-Cosmetic
//           if (part.postNonCosmeticImage) {
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(part.postNonCosmeticImage!);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, { tl: { col: postBase + 1, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
//               }
//             })());
//           }

//           // Clear (CL-N)
//           if (partCroppedImages[`CL-${rowNum}`]) {
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(partCroppedImages[`CL-${rowNum}`]);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, { tl: { col: postBase + 2, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
//               }
//             })());
//           }

//           // Foot (FT-N)
//           if (partCroppedImages[`FT-${rowNum}`]) {
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(partCroppedImages[`FT-${rowNum}`]);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, { tl: { col: postBase + 3, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
//               }
//             })());
//           }

//           // Side Snap (SS-N) - ALL rows show their respective SS image
//           if (partCroppedImages[`SS-${rowNum}`]) {
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(partCroppedImages[`SS-${rowNum}`]);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, { tl: { col: postBase + 4, row: dataRow.number - 1 }, ext: { width: 90, height: 85 } });
//               }
//             })());
//           }

//           // Side Screw - Show ONLY the image that matches selectedOption
//           const expectedOption = `ss${rowNum}`;
//           if (selectedOption === expectedOption && partCroppedImages[`SS-${rowNum}`]) {

//             // Add the specific SS image
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(partCroppedImages[`SS-${rowNum}`]);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, {
//                   tl: { col: postBase + 5, row: dataRow.number - 1 },
//                   ext: { width: 90, height: 70 }
//                 });
//               }
//             })());
//           }

//           // Dynamic custom columns from customColumnEntries
//           dynamicCustomColumns.forEach((col, colIdx) => {
//             const entry = rowCustomDataMap.get(col.id);
//             const col0 = customBase + colIdx;

//             if (entry) {
//               if (col.type === "image" && entry.value) {
//                 // Parse image path from JSON array
//                 let imagePath = entry.value;
//                 if (imagePath.startsWith('[')) {
//                   try {
//                     const parsed = JSON.parse(imagePath);
//                     if (Array.isArray(parsed) && parsed.length > 0) {
//                       imagePath = parsed[0];
//                     }
//                   } catch {
//                     // Keep original
//                   }
//                 }

//                 if (imagePath) {
//                   imageTasks.push((async () => {
//                     const imageData = await resolveImageForWorksheet(imagePath);
//                     if (imageData) {
//                       const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                       utmSheet.addImage(imgId, {
//                         tl: { col: col0, row: dataRow.number - 1 },
//                         ext: { width: 90, height: 85 }
//                       });
//                     }
//                   })());
//                 }
//               } else {
//                 // Text, number, dropdown
//                 dataRow.getCell(col0 + 1).value = entry.value || "";
//               }
//             }
//           });

//           // ─── NEW: Embed instron graph image for this row ──────────────────
//           // instron_foot paths array: index 0 = row 1, index 1 = row 2, etc.
//           instronColumnIds.forEach((colId, colIdx) => {
//             const paths = partInstronPaths[colId];
//             // rowNum is 1-based; array is 0-based
//             const imagePath = paths?.[rowNum - 1];
//             if (!imagePath) return;

//             const colPosition = instronBase + colIdx; // 0-based column index for ExcelJS
//             imageTasks.push((async () => {
//               const imageData = await resolveImageForWorksheet(imagePath);
//               if (imageData) {
//                 const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
//                 utmSheet.addImage(imgId, {
//                   tl: { col: colPosition, row: dataRow.number - 1 },
//                   ext: { width: 90, height: 85 },
//                 });
//                 console.log(`📊 Added instron image: ${colId} row${rowNum} → col${colPosition} row${dataRow.number}`);
//               }
//             })());
//           });

//           // Borders on every cell in the row
//           dataRow.eachCell((cell) => {
//             cell.border = {
//               top: { style: "thin" },
//               left: { style: "thin" },
//               bottom: { style: "thin" },
//               right: { style: "thin" }
//             };
//           });
//         }
//       });
//     }

//     // Wait for all images to load
//     console.log(`⏳ Waiting for ${imageTasks.length} images to load...`);
//     await Promise.all(imageTasks);
//     console.log(`✅ All images loaded successfully`);

//     // Generate filename
//     const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
//     const filename = `UTM_Report_${data.ticketCode}_${dateSegment}.xlsx`;

//     console.log(`💾 Saving report as: ${filename}`);

//     // Save file
//     const buffer = await workbook.xlsx.writeBuffer();
//     saveAs(new Blob([buffer]), filename);

//     console.log(`✅ UTM Report downloaded successfully!`);
//   } catch (error) {
//     console.error("❌ Unable to download UTM report", error);
//     throw error;
//   }
// };

// // Helper function to transform chamber data to UTM report format
// export const transformChamberDataToUTMReport = (
//   chamberData: any,
//   utmCropperData?: {
//     postCosmeticImages: Record<string, string>;
//     postNonCosmeticImages: Record<string, string>;
//     croppedImages: Record<string, UTMCroppedImages>;
//     customColumns: CustomColumn[];
//     customColumnData: Record<string, Record<number, Record<string, string>>>;
//   }
// ): UTMReportData => {
//   const supportedTypes: Record<string, CustomColumn["type"]> = {
//     text: "text",
//     number: "number",
//     image: "image",
//     dropdown: "dropdown"
//   };

//   const columnMap = new Map<string, CustomColumn>();
//   const mergeCustomColumns = (columns?: any[]) => {
//     if (!Array.isArray(columns)) {
//       return;
//     }
//     columns.forEach((column, index) => {
//       if (!column) {
//         return;
//       }
//       const fallbackId = `utm-column-${index}`;
//       const rawId = column.id ?? column.columnId ?? column.name ?? column.label ?? fallbackId;
//       const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : fallbackId;
//       const existing = columnMap.get(id);
//       const rawLabel = column.label ?? column.name ?? existing?.label ?? `Column ${index + 1}`;
//       const label = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim() : `Column ${index + 1}`;
//       const rawType = typeof column.type === "string" ? column.type.toLowerCase() : undefined;
//       const normalizedType = (rawType && supportedTypes[rawType]) || existing?.type || "text";
//       const options = normalizedType === "dropdown"
//         ? (Array.isArray(column.options) ? column.options : existing?.options)
//         : undefined;

//       columnMap.set(id, {
//         id,
//         label,
//         type: normalizedType,
//         ...(options ? { options } : {})
//       });
//     });
//   };

//   mergeCustomColumns(chamberData?.customColumns);
//   mergeCustomColumns(utmCropperData?.customColumns);

//   const customColumns = Array.from(columnMap.values());
//   const globalCustomColumnData =
//     chamberData && typeof chamberData.customColumnData === "object" && !Array.isArray(chamberData.customColumnData)
//       ? (chamberData.customColumnData as Record<string, string>)
//       : {};

//   const mergeRowValues = (
//     accumulator: Record<number, Record<string, string>>,
//     rowNumber: number,
//     values?: Record<string, unknown>
//   ) => {
//     if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
//       return;
//     }
//     if (!values || typeof values !== "object") {
//       return;
//     }
//     const existing = accumulator[rowNumber] ?? {};
//     const next: Record<string, string> = { ...existing };
//     Object.entries(values).forEach(([key, raw]) => {
//       if (raw === undefined || raw === null) {
//         return;
//       }
//       const stringValue = String(raw).trim();
//       if (stringValue) {
//         next[key] = stringValue;
//       }
//     });
//     if (Object.keys(next).length > 0) {
//       accumulator[rowNumber] = next;
//     }
//   };

//   const chamberParts = Array.isArray(chamberData?.parts) ? chamberData.parts : [];

//   const parts: UTMPartData[] = chamberParts.map((part: any, partIndex: number) => {
//     const partNumber = typeof part?.partNumber === "string" && part.partNumber.trim()
//       ? part.partNumber.trim()
//       : `Part-${partIndex + 1}`;
//     const serialNumber = typeof part?.serialNumber === "string" ? part.serialNumber : "";
//     const cosmeticImages = Array.isArray(part?.cosmeticImages) ? part.cosmeticImages : [];
//     const nonCosmeticImages = Array.isArray(part?.nonCosmeticImages) ? part.nonCosmeticImages : [];
//     const postCosmeticImages = Array.isArray(part?.postCosmeticImages) ? part.postCosmeticImages : [];
//     const postNonCosmeticImages = Array.isArray(part?.postNonCosmeticImages) ? part.postNonCosmeticImages : [];
//     const checkpointEntries = Array.isArray(part?.checkpointData)
//       ? part.checkpointData
//       : Array.isArray(part?.checkpointInfo?.checkpointHistory)
//         ? part.checkpointInfo.checkpointHistory
//         : [];

//     const partRowData: Record<number, Record<string, string>> = {};

//     checkpointEntries.forEach((entry: any, entryIndex: number) => {
//       const checkpointIndex = typeof entry?.checkpointIndex === "number" ? entry.checkpointIndex : entryIndex;
//       const rowNumber = checkpointIndex + 1;
//       const inlineData = entry?.customData && typeof entry.customData === "object"
//         ? (entry.customData as Record<string, unknown>)
//         : {};

//       const resolvedValues: Record<string, string> = {};
//       customColumns.forEach((column) => {
//         const inlineValue = inlineData[column.id];
//         const fallbackKey = `${partIndex}-${checkpointIndex}-${column.id}`;
//         const persistedValue = globalCustomColumnData[fallbackKey];
//         const winner = inlineValue ?? persistedValue;
//         if (winner !== undefined && winner !== null) {
//           const normalized = String(winner).trim();
//           if (normalized) {
//             resolvedValues[column.id] = normalized;
//           }
//         }
//       });

//       mergeRowValues(partRowData, rowNumber, resolvedValues);
//     });

//     if (part?.utmCustomColumnData && typeof part.utmCustomColumnData === "object") {
//       Object.entries(part.utmCustomColumnData as Record<string, Record<string, unknown>>).forEach(([rowKey, values]) => {
//         const rowNumber = Number(rowKey);
//         mergeRowValues(partRowData, rowNumber, values);
//       });
//     }

//     const cropperRowData = utmCropperData?.customColumnData?.[partNumber];
//     if (cropperRowData && typeof cropperRowData === "object") {
//       Object.entries(cropperRowData).forEach(([rowKey, values]) => {
//         const rowNumber = Number(rowKey);
//         mergeRowValues(partRowData, rowNumber, values);
//       });
//     }

//     const resolvedCroppedImages =
//       utmCropperData?.croppedImages?.[partNumber]
//       ?? (part?.croppedImages && typeof part.croppedImages === "object" ? part.croppedImages : {});

//     const pickFirstImage = (images?: unknown): string | undefined => {
//       if (!Array.isArray(images)) {
//         return undefined;
//       }
//       for (const candidate of images) {
//         if (typeof candidate === "string" && candidate.trim()) {
//           return candidate;
//         }
//       }
//       return undefined;
//     };

//     const checkpointCosmeticImage = checkpointEntries.reduce<string | undefined>((acc, entry) => {
//       const next = pickFirstImage(entry?.cosmeticImages);
//       return next ?? acc ?? undefined;
//     }, undefined);

//     const checkpointNonCosmeticImage = checkpointEntries.reduce<string | undefined>((acc, entry) => {
//       const next = pickFirstImage(entry?.nonCosmeticImages);
//       return next ?? acc ?? undefined;
//     }, undefined);

//     const savedPostCosmeticImage = (() => {
//       if (typeof part?.postCosmeticImage === "string" && part.postCosmeticImage.trim()) {
//         return part.postCosmeticImage.trim();
//       }
//       const lastFromArray = postCosmeticImages.length > 0 ? postCosmeticImages[postCosmeticImages.length - 1] : undefined;
//       if (typeof lastFromArray === "string" && lastFromArray.trim()) {
//         return lastFromArray.trim();
//       }
//       return undefined;
//     })();

//     const savedPostNonCosmeticImage = (() => {
//       if (typeof part?.postNonCosmeticImage === "string" && part.postNonCosmeticImage.trim()) {
//         return part.postNonCosmeticImage.trim();
//       }
//       const lastFromArray = postNonCosmeticImages.length > 0 ? postNonCosmeticImages[postNonCosmeticImages.length - 1] : undefined;
//       if (typeof lastFromArray === "string" && lastFromArray.trim()) {
//         return lastFromArray.trim();
//       }
//       return undefined;
//     })();

//     // Extract post-test images from checkpoint customData
//     const checkpointCustomDataImages = checkpointEntries.reduce((acc, entry) => {
//       if (entry?.customData) {
//         const parsed = parseCustomDataImages(entry.customData);
//         return {
//           cosmetic: parsed.cosmetic || acc.cosmetic,
//           nonCosmetic: parsed.nonCosmetic || acc.nonCosmetic
//         };
//       }
//       return acc;
//     }, { cosmetic: undefined, nonCosmetic: undefined });

//     const resolvedPostCosmeticImage =
//       utmCropperData?.postCosmeticImages?.[partNumber]
//       ?? savedPostCosmeticImage
//       ?? checkpointCustomDataImages.cosmetic
//       ?? checkpointCosmeticImage;

//     const resolvedPostNonCosmeticImage =
//       utmCropperData?.postNonCosmeticImages?.[partNumber]
//       ?? savedPostNonCosmeticImage
//       ?? checkpointCustomDataImages.nonCosmetic
//       ?? checkpointNonCosmeticImage;

//     return {
//       partNumber,
//       cosmeticImages,
//       nonCosmeticImages,
//       postCosmeticImage: resolvedPostCosmeticImage,
//       postNonCosmeticImage: resolvedPostNonCosmeticImage,
//       postCosmeticImages,
//       postNonCosmeticImages,
//       croppedImages: resolvedCroppedImages,
//       customImages: Array.isArray(part?.customImages)
//         ? part.customImages
//           .filter((ci: any) => ci && typeof ci.label === "string" && ci.label.trim() && typeof ci.path === "string" && ci.path.trim())
//           .map((ci: any) => ({ label: ci.label.trim(), path: ci.path.trim() }))
//         : [],
//       customColumnData: partRowData,
//       checkpointData: part.checkpointData || [],
//       checkpointInfo: part.checkpointInfo || {},
//       completedAt: part.completedAt,
//       loadedAt: part.loadedAt,
//     };
//   });

//   const coerceString = (value: unknown, fallback: string): string => {
//     if (typeof value === "string") {
//       const trimmed = value.trim();
//       if (trimmed) {
//         return trimmed;
//       }
//     }
//     return fallback;
//   };

//   const machineDetails = chamberData?.machineDetails ?? {};
//   const selectedTest = machineDetails?.selectedTest ?? (Array.isArray(machineDetails?.tests) ? machineDetails.tests[0] : undefined);
//   const primaryPart = chamberData?.parts?.[0] ?? {};

//   // Deduplicate customImage labels across all parts
//   const customImageLabelSet = new Set<string>();
//   const customImageColumns: string[] = [];
//   parts.forEach(p => {
//     (p.customImages || []).forEach(ci => {
//       const key = ci.label.toLowerCase();
//       if (!customImageLabelSet.has(key)) {
//         customImageLabelSet.add(key);
//         customImageColumns.push(ci.label);
//       }
//     });
//   });

//   return {
//     testName: coerceString(selectedTest?.testName ?? primaryPart?.testName ?? chamberData?.testName, "UTM Test"),
//     ticketCode: coerceString(machineDetails?.ticketCode ?? chamberData?.ticketCode ?? primaryPart?.ticketCode, "N/A"),
//     project: coerceString(machineDetails?.project, "N/A"),
//     build: coerceString(machineDetails?.build, "N/A"),
//     colour: coerceString(machineDetails?.colour, "N/A"),
//     machine: coerceString(
//       machineDetails?.machineDescription
//       ?? chamberData?.machineDescription
//       ?? machineDetails?.machine
//       ?? chamberData?.machine,
//       "UTM"
//     ),
//     testCondition: coerceString(
//       selectedTest?.testCondition
//       ?? primaryPart?.testCondition
//       ?? chamberData?.testCondition,
//       "N/A"
//     ),
//     specification: coerceString(
//       selectedTest?.originalTest?.specification
//       ?? selectedTest?.specification
//       ?? chamberData?.specification,
//       "N/A"
//     ),
//     parts,
//     customImageColumns,
//     customColumns,
//   };
// };




import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../assets/logo.png";
import { getBackendApiUrl } from "./backendApi";

// UTM Region definitions matching UTMImageCropper (DEFAULT FALLBACK)
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

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

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
    cropRegions?: CropRegion[]; // ✅ NEW: Saved crop regions
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

// ✅ UPDATED: Now accepts custom regions as parameter
const cropImageToUTMRegions = async (
  imageSrc?: string,
  customRegions?: CropRegion[]
): Promise<Record<string, string>> => {
  if (!imageSrc) {
    return {};
  }

  // ✅ Create cache key that includes custom regions
  const cacheKey = customRegions
    ? `${imageSrc}-${JSON.stringify(customRegions)}`
    : imageSrc;

  if (CROPPED_IMAGE_CACHE.has(cacheKey)) {
    console.log('✅ Using cached cropped images for:', imageSrc.substring(0, 50));
    return CROPPED_IMAGE_CACHE.get(cacheKey)!;
  }

  if (typeof document === "undefined" || typeof Image === "undefined") {
    return {};
  }

  const payload = await loadImageAsBase64(imageSrc);
  if (!payload || !payload.base64) {
    return {};
  }

  const dataUrl = `data:${payload.mime || "image/png"};base64,${payload.base64}`;

  // ✅ Use custom regions if provided, otherwise fall back to defaults
  const regionsToUse = customRegions && customRegions.length > 0
    ? customRegions
    : ALL_REGIONS;

  console.log(`🔧 Cropping image with ${customRegions ? 'CUSTOM' : 'DEFAULT'} regions:`, regionsToUse.length, 'regions');

  const croppedResults = await new Promise<Record<string, string>>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scaleX = image.width / UTM_BASE_CANVAS_WIDTH;
        const scaleY = image.height / UTM_BASE_CANVAS_HEIGHT;
        const results: Record<string, string> = {};

        console.log(`📐 Image dimensions: ${image.width}x${image.height}, Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);

        regionsToUse.forEach((region) => {
          const rawX = Math.round(region.x * scaleX);
          const rawY = Math.round(region.y * scaleY);
          const rawWidth = Math.round(region.width * scaleX);
          const rawHeight = Math.round(region.height * scaleY);

          const x = Math.max(0, Math.min(rawX, image.width - 1));
          const y = Math.max(0, Math.min(rawY, image.height - 1));
          const width = Math.min(rawWidth, image.width - x);
          const height = Math.min(rawHeight, image.height - y);

          if (width <= 0 || height <= 0) {
            console.warn(`⚠️ Invalid dimensions for ${region.label}: ${width}x${height}`);
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

          console.log(`✂️ Cropped ${region.label}: x=${x}, y=${y}, w=${width}, h=${height}`);
        });

        console.log(`✅ Successfully cropped ${Object.keys(results).length} regions`);
        resolve(results);
      } catch (error) {
        console.error('❌ Error cropping image:', error);
        resolve({});
      }
    };
    image.onerror = () => {
      console.error('❌ Failed to load image for cropping');
      resolve({});
    };
    image.src = dataUrl;
  });

  CROPPED_IMAGE_CACHE.set(cacheKey, croppedResults);
  return croppedResults;
};

// ✅ NEW: Helper function to extract crop regions from checkpoint data
const extractCropRegionsFromCheckpoint = (checkpoint: any): CropRegion[] | undefined => {
  // First, check if cropRegions array exists directly on checkpoint
  if (Array.isArray(checkpoint.cropRegions) && checkpoint.cropRegions.length > 0) {
    console.log('✅ Found cropRegions array in checkpoint:', checkpoint.cropRegions.length, 'regions');
    return checkpoint.cropRegions;
  }

  // Second, check if it's stored as JSON string in customData
  if (checkpoint.customData?.cropRegions) {
    try {
      const parsed = typeof checkpoint.customData.cropRegions === 'string'
        ? JSON.parse(checkpoint.customData.cropRegions)
        : checkpoint.customData.cropRegions;

      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Found cropRegions in customData (JSON):', parsed.length, 'regions');
        return parsed;
      }
    } catch (error) {
      console.error('❌ Failed to parse cropRegions from customData:', error);
    }
  }

  console.log('⚠️ No custom crop regions found in checkpoint, will use defaults');
  return undefined;
};

// ─── Parse instron_* graph image paths from customData ────────────────────────
// Returns: { instron_foot: [row1path, row2path, …], … }
const parseInstronGraphPaths = (customData: any): Record<string, string[]> => {
  if (!customData || typeof customData !== "object") return {};
  const result: Record<string, string[]> = {};
  Object.keys(customData).forEach((key) => {
    if (!key.startsWith("instron_") || key.endsWith("_meta")) return; // skip meta keys here
    const raw = customData[key];
    if (!raw) return;
    try {
      const parsed: string[] = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        result[key] = parsed.filter((p) => typeof p === "string" && p.trim() !== "");
      }
    } catch {
      console.warn(`⚠️ Could not parse instron key "${key}":`, raw);
    }
  });
  return result;
};

// ─── NEW: Parse instron_*_meta arrays from customData ─────────────────────────
// Key pattern: "instron_sidesnapsshear_meta"
// Value:       JSON array of { serialNo, partNo, plc, force, colour, op, endDate } | null
// Returns:     { instron_sidesnapsshear: [ metaObj|null, … ] }
// (keyed WITHOUT the _meta suffix so we can correlate to the graph column)
const parseInstronMetaArrays = (customData: any): Record<string, (Record<string, any> | null)[]> => {
  if (!customData || typeof customData !== "object") return {};
  const result: Record<string, (Record<string, any> | null)[]> = {};
  Object.keys(customData).forEach((key) => {
    if (!key.startsWith("instron_") || !key.endsWith("_meta")) return;
    const raw = customData[key];
    if (!raw) return;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        // Strip "_meta" suffix to get the base column id
        const baseKey = key.slice(0, -5); // "instron_sidesnapsshear_meta" → "instron_sidesnapsshear"
        result[baseKey] = parsed; // each element is object|null
      }
    } catch {
      console.warn(`⚠️ Could not parse instron meta key "${key}":`, raw);
    }
  });
  return result;
};

// ─── Collect all instron column IDs across all parts (for header row) ─────────
// Only collects base graph keys (NOT _meta keys)
const collectInstronColumnIds = (parts: UTMPartData[]): string[] => {
  const seen = new Set<string>();
  const order: string[] = [];
  parts.forEach((part) => {
    const checkpoints = Array.isArray(part.checkpointData) ? part.checkpointData : [];
    checkpoints.forEach((cp) => {
      if (!cp.customData) return;
      Object.keys(cp.customData).forEach((key) => {
        if (key.startsWith("instron_") && !key.endsWith("_meta") && !seen.has(key)) {
          seen.add(key);
          order.push(key);
        }
      });
    });
  });
  return order;
};

// ─── Friendly label for an instron column ID ──────────────────────────────────
const instronColumnLabel = (columnId: string): string => {
  return columnId
    .replace(/^instron_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bFoot\b/, "Instron Foot")
    .replace(/\bSidesnap\b/, "Instron SideSnap")
    .replace(/\bCleat\b/, "Instron Cleat");
};

// ─── NEW: The 7 fixed PDF metadata fields in display order ────────────────────
const INSTRON_META_FIELDS: Array<{ key: string; label: string }> = [
  { key: "partNo",   label: "Part No"    },
  { key: "plc",      label: "P-LC"       },
  { key: "force",    label: "Force [N]"  },
  { key: "colour",   label: "Colour"     },
  { key: "op",       label: "OP"         },
  { key: "endDate",  label: "End Date"   },
];

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
  console.log('📊 Starting UTM Report generation with data:', data);
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

    // ─── Collect instron graph column IDs from all parts' checkpointData ────────
    const instronColumnIds = collectInstronColumnIds(data.parts);
    console.log('Instron graph columns found:', instronColumnIds);

    // ─── NEW: Each instron graph column is followed by 7 meta text columns ──────
    // Layout per instron column: [Graph Image col] + [Serial No, Part No, P-LC, Force [N], Colour, OP, End Date]
    // Total extra cols per instron column = 7
    const INSTRON_META_COUNT = INSTRON_META_FIELDS.length; // 7

    // Column index arithmetic
    // (all 0-based for ExcelJS tl.col; +1 for getCell which is 1-based)
    const checkpointColOffset = hasValidCheckpoints ? 1 : 0;
    const preBase    = 2 + checkpointColOffset;
    const postBase   = preBase + customImageLabels.length;
    const customBase = postBase + 6; // After Clear, Foot, Side Snap, Side Screw
    // ─── UPDATED: instron block now has (1 image col + 7 meta cols) per instron type
    const instronBase = customBase + dynamicCustomColumns.length;
    // Each instron entry spans 1 + INSTRON_META_COUNT columns
    const instronBlockWidth = 1 + INSTRON_META_COUNT; // 8 columns per instron type
    const statusIdx = instronBase + (instronColumnIds.length * instronBlockWidth); // Status always last

    // Build ExcelJS column definitions
    const columns: { key: string; width: number }[] = [
      { key: "testDate",            width: 15 },
      { key: "partNumber",          width: 15 },
      ...(hasValidCheckpoints ? [{ key: "checkpoint", width: 20 }] : []),
      ...customImageLabels.map((_: any, i: number) => ({ key: `preImg_${i}`, width: 25 })),
      { key: "postCosmeticImage",    width: 25 },
      { key: "postNonCosmeticImage", width: 25 },
      { key: "clearImage",           width: 20 },
      { key: "footImage",            width: 20 },
      { key: "sideSnapImage",        width: 20 },
      { key: "sideScrewImage",       width: 20 },
      ...dynamicCustomColumns.map((col: CustomColumn) => ({ key: col.id, width: 20 })),
      // ─── NEW: For each instron column, 1 image col + 7 meta text cols ────────
      ...instronColumnIds.flatMap((colId) => [
        { key: colId,                          width: 25 }, // graph image
        ...INSTRON_META_FIELDS.map((f) => ({ key: `${colId}_${f.key}`, width: 20 })), // meta fields
      ]),
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

    // ─── Column header row ────────────────────────────────────────────────────
    const headerValues = [
      "Date",
      "Part Number",
      ...(hasValidCheckpoints ? ["Checkpoints"] : []),
      ...customImageLabels.map((label: string) => `Pre ${label}`),
      "Post Cosmetic",
      "Post Non-Cosmetic",
      "Cleat",
      "Foot",
      "Side Snap",
      "Side Screw",
      ...dynamicCustomColumns.map((col: CustomColumn) => col.label),
      // ─── NEW: For each instron column → graph header + 7 meta headers ────────
      ...instronColumnIds.flatMap((colId) => [
        instronColumnLabel(colId),               // e.g. "Instron Side Snap Shear"
        ...INSTRON_META_FIELDS.map((f) => f.label), // Serial No, Part No, P-LC, Force [N], Colour, OP, End Date
      ]),
      "Status",
    ];

    const headerRow = utmSheet.getRow(currentRow);
    headerRow.values = headerValues;
    headerRow.font = { bold: true };
    headerRow.height = 30;
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // ─── NEW: Apply teal background to instron-related header cells ──────────
    const instronHeaderStartCol = instronBase + 1; // 1-based
    const instronHeaderEndCol   = statusIdx;       // 1-based, exclusive of Status
    headerRow.eachCell((cell, colNumber) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      // if (colNumber >= instronHeaderStartCol && colNumber <= instronHeaderEndCol) {
      //   cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } }; // light teal
      //   cell.font = { bold: true, color: { argb: "FF00695C" } }; // dark teal
      // }
    });
    currentRow++;

    // ─── Process all parts ────────────────────────────────────────────────────
    for (let partIndex = 0; partIndex < data.parts.length; partIndex++) {
      const part = data.parts[partIndex];

      console.log(`\n📦 Processing part ${partIndex + 1}/${data.parts.length}: ${part.partNumber}`);

      const checkpointData = Array.isArray(part.checkpointData) && part.checkpointData.length > 0
        ? part.checkpointData : [];

      // Extract custom crop regions from the FIRST checkpoint that has them
      let customCropRegions: CropRegion[] | undefined;
      for (const checkpoint of checkpointData) {
        customCropRegions = extractCropRegionsFromCheckpoint(checkpoint);
        if (customCropRegions) {
          console.log(`✅ Using custom crop regions from checkpoint (${customCropRegions.length} regions)`);
          break;
        }
      }

      const croppingSource = part.postNonCosmeticImage || part.postCosmeticImage;
      const generatedCrops = await cropImageToUTMRegions(croppingSource, customCropRegions);
      const partCroppedImages: Record<string, string> = { ...generatedCrops, ...(part.croppedImages || {}) };

      console.log(`✂️ Generated ${Object.keys(generatedCrops).length} cropped images for ${part.partNumber}`);

      // ─── Merge instron graph paths from ALL checkpoints for this part ────────
      const partInstronPaths: Record<string, string[]> = {};
      // ─── NEW: Merge instron meta arrays from ALL checkpoints for this part ────
      const partInstronMeta: Record<string, (Record<string, any> | null)[]> = {};

      checkpointData.forEach((cp) => {
        // Graph paths
        const parsedPaths = parseInstronGraphPaths(cp.customData);
        Object.entries(parsedPaths).forEach(([colId, paths]) => {
          if (!partInstronPaths[colId]) {
            partInstronPaths[colId] = paths;
          } else {
            paths.forEach((p, i) => {
              if (p && !partInstronPaths[colId][i]) {
                partInstronPaths[colId][i] = p;
              }
            });
          }
        });

        // ─── NEW: Meta arrays ─────────────────────────────────────────────────
        const parsedMeta = parseInstronMetaArrays(cp.customData);
        Object.entries(parsedMeta).forEach(([colId, metaArr]) => {
          if (!partInstronMeta[colId]) {
            partInstronMeta[colId] = metaArr;
          } else {
            // Merge: fill null slots from subsequent checkpoints
            metaArr.forEach((m, i) => {
              if (m !== null && partInstronMeta[colId][i] === null) {
                partInstronMeta[colId][i] = m;
              }
            });
          }
        });
      });

      console.log(`📊 Instron paths for ${part.partNumber}:`, partInstronPaths);
      console.log(`📋 Instron meta for ${part.partNumber}:`, partInstronMeta);

      checkpointData.forEach((checkpoint, checkpointIdx) => {
        const formatDateOnly = (dateString?: string): string => {
          if (!dateString) return "";
          try {
            const d = new Date(dateString);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          } catch { return ""; }
        };

        const testDate    = formatDateOnly(checkpoint.testDate || checkpoint.submittedAt || part.completedAt || part.loadedAt);
        const statusValue = normaliseStatus(checkpoint.status);

        const selectedOption = (checkpoint.selectedOption || "").toLowerCase();
        const checkpoints    = part.checkpointInfo?.checkpoints || [];
        const hasCheckpoints = Array.isArray(checkpoints) && checkpoints.length > 0;
        const rowCount       = hasCheckpoints ? checkpoints.length : 4;

        console.log(`Part ${part.partNumber} - Checkpoint info:`, { checkpoints, hasCheckpoints, rowCount, selectedOption });

        for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
          const checkpointValue = hasCheckpoints
            ? checkpoints[rowNum - 1]
            : (checkpoint.checkpointValue !== undefined ? checkpoint.checkpointValue : checkpointIdx);

          const displayCheckpoint = hasCheckpoints ? `${checkpointValue}` : ` T${checkpointValue}`;

          console.log(`Row ${rowNum} - Checkpoint value:`, checkpointValue, 'Display:', displayCheckpoint);

          const totalCols = statusIdx + 1;
          const rowData: string[] = new Array(totalCols).fill("");
          rowData[0] = testDate;
          rowData[1] = part.partNumber;
          if (hasValidCheckpoints) rowData[2] = displayCheckpoint;

          const customColumnEntries = checkpoint.customColumnEntries || [];
          const rowEntries = customColumnEntries.filter((entry: any) => entry.row === rowNum);
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
            customImageLabels.forEach((label: string, i: number) => {
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

          // Side Snap (SS-N)
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
          dynamicCustomColumns.forEach((col: CustomColumn, colIdx: number) => {
            const entry = rowCustomDataMap.get(col.id);
            const col0  = customBase + colIdx;

            if (entry) {
              if (col.type === "image" && entry.value) {
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
                dataRow.getCell(col0 + 1).value = entry.value || "";
              }
            }
          });

          // ─── Instron: graph image + meta text columns ─────────────────────────
          instronColumnIds.forEach((colId, colIdx) => {
            // Column positions for this instron block (0-based for addImage, 1-based for getCell)
            const graphCol0 = instronBase + colIdx * instronBlockWidth; // 0-based, for image tl.col

            // ── Graph image ───────────────────────────────────────────────────
            const paths     = partInstronPaths[colId];
            const imagePath = paths?.[rowNum - 1]; // rowNum is 1-based; array is 0-based
            if (imagePath) {
              imageTasks.push((async () => {
                const imageData = await resolveImageForWorksheet(imagePath);
                if (imageData) {
                  const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
                  utmSheet.addImage(imgId, {
                    tl:  { col: graphCol0, row: dataRow.number - 1 },
                    ext: { width: 90, height: 85 },
                  });
                  console.log(`📊 Added instron image: ${colId} row${rowNum} → col${graphCol0} row${dataRow.number}`);
                }
              })());
            }

            // ── NEW: Meta text columns (Serial No, Part No, P-LC, Force [N], Colour, OP, End Date) ──
            // Meta array index is 0-based (row 1 → index 0)
            const metaArr  = partInstronMeta[colId];
            const rowMeta  = metaArr?.[rowNum - 1] ?? null; // object or null

            INSTRON_META_FIELDS.forEach((field, fieldIdx) => {
              // 1-based cell column = graphCol0 + 1 (graph) + fieldIdx + 1 (meta offset, 1-based)
              const cellColNum = graphCol0 + 1 + fieldIdx + 1; // +1 for graph col, +1 for 1-based
              const cell       = dataRow.getCell(cellColNum);

              if (rowMeta && rowMeta[field.key] !== undefined && rowMeta[field.key] !== null) {
                const rawVal = rowMeta[field.key];
                // Format force to 2 decimal places
                cell.value = field.key === "force"
                  ? (typeof rawVal === "number" ? parseFloat(rawVal.toFixed(2)) : rawVal)
                  : String(rawVal);
              } else {
                cell.value = ""; // no data for this row/field
              }

              // Light teal fill to match header
              // cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F8F7" } };
              cell.alignment = { horizontal: "center", vertical: "middle" };

              // Bold the Force value
              if (field.key === "force" && rowMeta?.[field.key]) {
                cell.font = { bold: true };
              }
            });
          });

          // Borders on every cell in the row
          dataRow.eachCell((cell) => {
            cell.border = {
              top:    { style: "thin" },
              left:   { style: "thin" },
              bottom: { style: "thin" },
              right:  { style: "thin" },
            };
          });
        }
      });
    }

    // Wait for all images to load
    console.log(`⏳ Waiting for ${imageTasks.length} images to load...`);
    await Promise.all(imageTasks);
    console.log(`✅ All images loaded successfully`);

    // Generate filename
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename    = `UTM_Report_${data.ticketCode}_${dateSegment}.xlsx`;

    console.log(`💾 Saving report as: ${filename}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);

    console.log(`✅ UTM Report downloaded successfully!`);
  } catch (error) {
    console.error("❌ Unable to download UTM report", error);
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
    const checkpointCustomDataImages = checkpointEntries.reduce((acc: any, entry: any) => {
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