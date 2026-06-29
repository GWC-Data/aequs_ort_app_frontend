// import React, { useState, useEffect, useRef } from "react";
// import {
//   Upload,
//   Loader2,
//   Plus,
//   X,
//   ImageIcon,
//   Move,
//   Check,
//   FileUp,
//   Eye,
// } from "lucide-react";
// import * as pdfjsLib from "pdfjs-dist";
// import { BACKEND_API_URL } from "@/lib/backendApi";
// import pdfcropping from "@/lib/pdf.worker.min.js";

// // pdfjsLib.GlobalWorkerOptions.workerSrc =
// //   "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// pdfjsLib.GlobalWorkerOptions.workerSrc =pdfcropping;
// console.log("✅ PDF.js API version:", pdfjsLib.version);

// interface UTMImageCropperProps {
//   chamberData: any;
//   formData: any;
//   updateRowField: (rowId: number, field: string, value: string) => void;
//   selectedParts: any[];
//   machineEquipment2: string;
//   isSecondRound?: boolean;
//   currentChildTest?: any;
//   onDataChange?: (data: any) => void;
// }

// interface CustomColumn {
//   id: string;
//   label: string;
//   type: "text" | "number" | "image" | "dropdown";
//   options?: string[];
// }

// interface CustomImage {
//   label: string;
//   path: string;
//   uploadedAt: string | null;
// }

// interface CropRegion {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   label: string;
// }

// interface ExtractedGraph {
//   id: number;
//   page: number;
//   dataUrl: string;
//   name: string;
//   serialNumber?: string;
//   partNo?: string;
//   maxForce?: number;
//   location?: string;
// }

// const DEFAULT_UTM_REGIONS = {
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

// interface ParsedFileInfo {
//   columnId: string;
//   columnLabel: string;
//   locationType: "foot" | "sidesnap" | "cleat" | "custom";
// }

// function parseInstronFileName(filename: string): ParsedFileInfo {
//   const base = filename.replace(/\.[^/.]+$/, "");
//   const parts = base.split("_");

//   let afterDateIdx = 0;
//   for (let i = 0; i < parts.length; i++) {
//     const p = parts[i].toLowerCase();
//     if (p.startsWith("produced") || /\d{2}-\d{2}-\d{2}/.test(parts[i])) {
//       afterDateIdx = i + 1;
//       break;
//     }
//   }

//   const labelParts: string[] = [];
//   for (let i = afterDateIdx; i < parts.length; i++) {
//     if (/^N\d+$/i.test(parts[i])) break;
//     labelParts.push(parts[i]);
//   }

//   const rawLabel = labelParts.join(" ").trim() || base;
//   const upper = rawLabel.toUpperCase().replace(/[\s_-]/g, "");

//   let columnLabel: string;
//   let columnId: string;
//   let locationType: ParsedFileInfo["locationType"];

//   if (upper.includes("FOOTPUSH") || upper === "FOOT" || upper === "FT") {
//     columnLabel = "Foot Push";
//     columnId = "instron_foot";
//     locationType = "foot";
//   } else if (upper === "SS" || upper.includes("SIDESNAP") || upper.includes("SIDE")) {
//     columnLabel = "Side Snap";
//     columnId = "instron_sidesnap";
//     locationType = "sidesnap";
//   } else if (upper === "CL" || upper.includes("CLEAT")) {
//     columnLabel = "Cleat";
//     columnId = "instron_cleat";
//     locationType = "cleat";
//   } else {
//     columnLabel = rawLabel;
//     columnId =
//       "instron_" +
//       rawLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
//     locationType = "custom";
//   }

//   return { columnId, columnLabel, locationType };
// }

// function normaliseLocation(raw: string): { prefix: string; rowNum: number } | null {
//   const m = raw.trim().toUpperCase().match(/^(FT|SS|CL)-?0*(\d+)$/);
//   if (!m) return null;
//   return { prefix: m[1], rowNum: parseInt(m[2], 10) };
// }

// function prefixToColumnId(prefix: string): string {
//   switch (prefix) {
//     case "FT": return "instron_foot";
//     case "SS": return "instron_sidesnap";
//     case "CL": return "instron_cleat";
//     default: return `instron_${prefix.toLowerCase()}`;
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────

// const UTMImageCropper: React.FC<UTMImageCropperProps> = ({
//   chamberData,
//   formData,
//   updateRowField,
//   selectedParts = [],
//   machineEquipment2,
//   isSecondRound = false,
//   currentChildTest,
//   onDataChange,
// }) => {
//   if (!chamberData) {
//     return (
//       <div className="p-8 bg-gray-50 min-h-screen">
//         <div className="max-w-full mx-auto">
//           <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
//             <p className="text-blue-800 font-medium">Loading chamber data...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const [postCosmeticImages, setPostCosmeticImages] = useState<Record<string, string>>({});
//   const [postNonCosmeticImages, setPostNonCosmeticImages] = useState<Record<string, string>>({});
//   const [croppedImages, setCroppedImages] = useState<Record<string, Record<string, string>>>({});
//   const [processing, setProcessing] = useState(false);
//   const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
//   const [showAddColumnModal, setShowAddColumnModal] = useState(false);
//   const [newColumnName, setNewColumnName] = useState("");
//   const [newColumnType, setNewColumnType] = useState<"text" | "number" | "image" | "dropdown">("text");
//   const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
//   const [newOption, setNewOption] = useState("");
//   const [customColumnData, setCustomColumnData] = useState<Record<string, string>>({});
//   const [showCropAdjuster, setShowCropAdjuster] = useState(false);
//   const [currentAdjustingPart, setCurrentAdjustingPart] = useState<string>("");
//   const [tempImage, setTempImage] = useState<string>("");
//   const [adjustableRegions, setAdjustableRegions] = useState<CropRegion[]>([]);
//   const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [imageLoaded, setImageLoaded] = useState(false);
//   const [partRegions, setPartRegions] = useState<Record<string, CropRegion[]>>({});
//   const [pendingImages, setPendingImages] = useState<Record<string, string>>({});
//   const [showPreImagesModal, setShowPreImagesModal] = useState(false);
//   const [selectedPartForModal, setSelectedPartForModal] = useState<string>("");

//   // ── instronGraphData now stores backend paths (e.g. "/uploads/part-images/xxx.png")
//   // Key format: "{partNumber}-{rowNum}-{columnId}"
//   const [instronGraphData, setInstronGraphData] = useState<Record<string, string>>({});
//   const [extractedGraphs, setExtractedGraphs] = useState<ExtractedGraph[]>([]);
//   const [pdfProcessing, setPdfProcessing] = useState(false);
//   const [pdfProgress, setPdfProgress] = useState("");

//   // ── NEW: upload progress for graph images ─────────────────────────────────
//   const [graphUploadProgress, setGraphUploadProgress] = useState<{
//     current: number;
//     total: number;
//   } | null>(null);

//   const [showImageGallery, setShowImageGallery] = useState(false);
//   const [galleryImages, setGalleryImages] = useState<Array<{ url: string; label: string }>>([]);
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);

//   const pdfProcessingRef = useRef(false);
//   const dataChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const initializedRef = useRef(false);

//   useEffect(() => {
//     if (initializedRef.current) return;
//     if (!chamberData) return;
//     initializedRef.current = true;

//     const rawColumns = Array.isArray(chamberData.customColumns) ? chamberData.customColumns : [];

//     if (rawColumns.length === 0 && chamberData.parts?.length > 0) {
//       const part = chamberData.parts[0];
//       if (part.customImages?.length > 0) {
//         const imageColumns: CustomColumn[] = part.customImages.map((img: CustomImage) => ({
//           id: img.label,
//           label: img.label,
//           type: "image" as const,
//           options: [],
//         }));
//         if (imageColumns.length > 0) setCustomColumns(imageColumns);
//       }
//     } else if (rawColumns.length > 0) {
//       setCustomColumns(
//         rawColumns.map((col: any, i: number) => ({
//           id: col.id ?? col.name ?? col.label ?? `utm-column-${i}`,
//           label: col.label ?? col.name ?? `Column ${i + 1}`,
//           type: (col.type as CustomColumn["type"]) ?? "text",
//           options: Array.isArray(col.options) ? col.options : undefined,
//         })),
//       );
//     }

//     const rawColumnData = chamberData.customColumnData;
//     if (rawColumnData && typeof rawColumnData === "object") {
//       const flat: Record<string, string> = {};
//       Object.keys(rawColumnData).forEach((pn) =>
//         Object.keys(rawColumnData[pn]).forEach((rn) =>
//           Object.keys(rawColumnData[pn][rn]).forEach((cid) => {
//             flat[`${pn}-${rn}-${cid}`] = rawColumnData[pn][rn][cid];
//           }),
//         ),
//       );
//       setCustomColumnData(flat);
//     }

//     // ── Restore previously uploaded graph paths from checkpointData ──────────
//     // Format in DB: customData["instron_foot"] = '["/uploads/part-images/xxx.png", ...]'
//     // We restore them into instronGraphData keyed as "{partNumber}-{rowNum}-{colId}"
//     if (Array.isArray(chamberData.parts)) {
//       const restored: Record<string, string> = {};
//       chamberData.parts.forEach((part: any) => {
//         const pn: string = part.partNumber;
//         if (!Array.isArray(part.checkpointData)) return;
//         part.checkpointData.forEach((cp: any) => {
//           if (!cp.customData) return;
//           Object.keys(cp.customData).forEach((key) => {
//             if (!key.startsWith("instron_")) return;
//             try {
//               const paths: string[] = JSON.parse(cp.customData[key] || "[]");
//               // paths is an array indexed by rowNum-1
//               paths.forEach((path, idx) => {
//                 if (!path) return;
//                 const rowNum = idx + 1;
//                 const fullUrl = path.startsWith("http") ? path : `${BACKEND_API_URL}${path}`;
//                 restored[`${pn}-${rowNum}-${key}`] = fullUrl;
//               });
//             } catch {
//               /* skip malformed */
//             }
//           });
//         });
//       });
//       if (Object.keys(restored).length > 0) {
//         setInstronGraphData(restored);
//       }
//     }
//   }, [chamberData]);

//   useEffect(() => {
//     if (!onDataChange) return;
//     if (dataChangeTimeoutRef.current) clearTimeout(dataChangeTimeoutRef.current);
//     dataChangeTimeoutRef.current = setTimeout(() => {
//       const cropRegionsData: Record<string, CropRegion[]> = {};
//       Object.keys(partRegions).forEach((p) => { cropRegionsData[p] = partRegions[p]; });
//       onDataChange({
//         postCosmeticImages,
//         postNonCosmeticImages,
//         croppedImages,
//         customColumns,
//         customColumnData,
//         cropRegionsData,
//         instronGraphData,
//       });
//     }, 1000);
//     return () => { if (dataChangeTimeoutRef.current) clearTimeout(dataChangeTimeoutRef.current); };
//   }, [
//     postCosmeticImages, postNonCosmeticImages, croppedImages,
//     customColumns, customColumnData, partRegions, instronGraphData, onDataChange,
//   ]);

//   useEffect(() => {
//     if (showCropAdjuster && canvasRef.current && tempImage && imageLoaded) drawCanvas();
//   }, [showCropAdjuster, tempImage, adjustableRegions, selectedRegion, imageLoaded]);

//   const drawCanvas = () => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;
//     const img = new Image();
//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;
//       ctx.drawImage(img, 0, 0);
//       const sx = img.width / 480, sy = img.height / 320;
//       adjustableRegions.forEach((region, idx) => {
//         const x = region.x * sx, y = region.y * sy, w = region.width * sx, h = region.height * sy;
//         ctx.strokeStyle = selectedRegion === idx ? "#FF0000" : "#00FF00";
//         ctx.lineWidth = 3;
//         ctx.strokeRect(x, y, w, h);
//         ctx.fillStyle = "rgba(0,0,0,0.7)";
//         ctx.fillRect(x, y - 25, 80, 25);
//         ctx.fillStyle = "#FFF";
//         ctx.font = "14px Arial";
//         ctx.fillText(region.label, x + 5, y - 7);
//         if (selectedRegion === idx) {
//           ctx.fillStyle = "#FF0000";
//           const hs = 8;
//           [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) =>
//             ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs),
//           );
//         }
//       });
//     };
//     img.src = tempImage;
//   };

//   const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = (e.clientX - rect.left) * (canvas.width / rect.width);
//     const y = (e.clientY - rect.top) * (canvas.height / rect.height);
//     const sx = canvas.width / 480, sy = canvas.height / 320;
//     adjustableRegions.forEach((r, idx) => {
//       if (x >= r.x * sx && x <= (r.x + r.width) * sx && y >= r.y * sy && y <= (r.y + r.height) * sy) {
//         setSelectedRegion(idx);
//         setIsDragging(true);
//         setDragStart({ x: x - r.x * sx, y: y - r.y * sy });
//       }
//     });
//   };

//   const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!isDragging || selectedRegion === null) return;
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = (e.clientX - rect.left) * (canvas.width / rect.width);
//     const y = (e.clientY - rect.top) * (canvas.height / rect.height);
//     const sx = canvas.width / 480, sy = canvas.height / 320;
//     setAdjustableRegions((prev) => {
//       const u = [...prev];
//       u[selectedRegion] = {
//         ...u[selectedRegion],
//         x: Math.max(0, Math.min(480 - u[selectedRegion].width, (x - dragStart.x) / sx)),
//         y: Math.max(0, Math.min(320 - u[selectedRegion].height, (y - dragStart.y) / sy)),
//       };
//       return u;
//     });
//   };

//   const handleCanvasMouseUp = () => setIsDragging(false);

//   const handleResizeRegion = (delta: number, dim: "width" | "height") => {
//     if (selectedRegion === null) return;
//     setAdjustableRegions((prev) => {
//       const u = [...prev];
//       u[selectedRegion] = {
//         ...u[selectedRegion],
//         [dim]: Math.max(20, Math.min(200, u[selectedRegion][dim] + delta)),
//       };
//       return u;
//     });
//   };

//   // ─── NEW: Upload a single graph image dataURL to backend ──────────────────
//   /**
//    * Uploads one graph image (PNG dataUrl) to /uploads/part-images.
//    * Returns the relative path string (e.g. "/uploads/part-images/xxx.png") on success,
//    * or null on failure.
//    *
//    * The imageType tag uses the column ID so the backend can group graphs by test type.
//    */
//   const uploadGraphImageToBackend = async (
//     dataUrl: string,
//     partNumber: string,
//     columnId: string,   // e.g. "instron_foot"
//     rowNum: number,     // 1-based row (location number)
//   ): Promise<string | null> => {
//     try {
//       const fetchRes = await fetch(dataUrl);
//       const blob = await fetchRes.blob();
//       const filename = `${partNumber}_${columnId}_row${rowNum}_${Date.now()}.png`;
//       const file = new File([blob], filename, { type: "image/png" });

//       const fd = new FormData();
//       fd.append("image", file);
//       if (chamberData?.id) fd.append("chamberLoadId", String(chamberData.id));

//       const part = selectedParts.find((p) => p.partNumber === partNumber);
//       if (part?.serialNumber) fd.append("partId", String(part.serialNumber));
//       else if (part?.partNumber) fd.append("partId", String(part.partNumber));

//       // imageType matches the column ID so UnloadWithUTM can find it easily
//       fd.append("imageType", columnId);
//       fd.append("checkpointIndex", "0");

//       const response = await fetch(`${BACKEND_API_URL}/uploads/part-images`, {
//         method: "POST",
//         body: fd,
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         console.error(`❌ Graph upload failed [${partNumber}/${columnId}/row${rowNum}]:`, errorData);
//         return null;
//       }

//       const result = await response.json();
//       const uploadedPath: string | undefined = result?.path;
//       if (uploadedPath) {
//         console.log(`✅ Graph uploaded: [${partNumber}/${columnId}/row${rowNum}] → ${uploadedPath}`);
//         return uploadedPath;
//       }

//       console.warn(`⚠️ Upload response missing path [${partNumber}/${columnId}/row${rowNum}]:`, result);
//       return null;
//     } catch (err) {
//       console.error(`❌ Exception uploading graph [${partNumber}/${columnId}/row${rowNum}]:`, err);
//       return null;
//     }
//   };

//   // ─── PDF: extract table rows ───────────────────────────────────────────────
//   const extractTableData = async (pdf: any) => {
//     const rows: Array<{ serialNumber: string; location: string; maxForce: number; page: number }> = [];
//     for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//       const page = await pdf.getPage(pageNum);
//       const textContent = await page.getTextContent();
//       const text = textContent.items.map((item: any) => item.str).join(" ");
//       const serials = [...text.matchAll(/J5L[A-Z0-9]+/g)].map((m) => m[0]);
//       const locationMatches = [...text.matchAll(/\b(FT|SS|CL)\s*-\s*0*(\d+)\b/gi)];
//       const locations = locationMatches.map((m) => `${m[1].toUpperCase()}-${m[2].padStart(2, "0")}`);
//       const forces = [...text.matchAll(/\b(\d{3,5}\.\d{2})\b/g)].map((m) => parseFloat(m[1]));
//       const count = Math.min(locations.length, forces.length);
//       for (let i = 0; i < count; i++) {
//         rows.push({ serialNumber: serials[i] ?? serials[0] ?? "", location: locations[i], maxForce: forces[i], page: pageNum });
//       }
//     }
//     return rows;
//   };

//   // ─── PDF: convert page image to dataURL ───────────────────────────────────
//   const convertImageToDataURL = async (image: any): Promise<string> => {
//     return new Promise((resolve) => {
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d", { alpha: false });
//       if (!ctx) { resolve(""); return; }
//       const scale = 2;
//       canvas.width = image.width * scale;
//       canvas.height = image.height * scale;
//       ctx.imageSmoothingEnabled = true;
//       ctx.imageSmoothingQuality = "high";
//       if (image.data) {
//         const tmp = document.createElement("canvas");
//         const tc = tmp.getContext("2d");
//         if (!tc) { resolve(""); return; }
//         tmp.width = image.width;
//         tmp.height = image.height;
//         const id = tc.createImageData(image.width, image.height);
//         id.data.set(image.data);
//         tc.putImageData(id, 0, 0);
//         ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
//       } else if (image.bitmap) {
//         ctx.drawImage(image.bitmap, 0, 0, canvas.width, canvas.height);
//       }
//       resolve(canvas.toDataURL("image/png", 1.0));
//     });
//   };

//   // ─── PDF: extract all embedded images ─────────────────────────────────────
//   const extractAllImages = async (pdf: any): Promise<ExtractedGraph[]> => {
//     const all: ExtractedGraph[] = [];
//     let count = 0;
//     for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//       setPdfProgress(`Extracting images from page ${pageNum}/${pdf.numPages}...`);
//       const page = await pdf.getPage(pageNum);
//       const ops = await page.getOperatorList();
//       for (let i = 0; i < ops.fnArray.length; i++) {
//         const fn = ops.fnArray[i];
//         if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
//           const name = ops.argsArray[i][0];
//           try {
//             const img = await page.objs.get(name);
//             if (img) {
//               count++;
//               all.push({ id: count, page: pageNum, dataUrl: await convertImageToDataURL(img), name: `graph_${String(count).padStart(2, "0")}` });
//             }
//           } catch (e) {
//             console.warn(`Skipped image "${name}" on page ${pageNum}:`, e);
//           }
//         }
//       }
//     }
//     return all;
//   };

//   // ─── PDF upload — MAIN HANDLER ────────────────────────────────────────────
//   const handlePDFUpload = async (file: File) => {
//     if (pdfProcessingRef.current) return;
//     try {
//       pdfProcessingRef.current = true;
//       setPdfProcessing(true);
//       setPdfProgress("Loading PDF...");

//       const fileInfo = parseInstronFileName(file.name);
//       const fileUrl = URL.createObjectURL(file);
//       const pdf = await pdfjsLib.getDocument(fileUrl).promise;

//       setPdfProgress(`Processing ${pdf.numPages} pages...`);
//       const tableRows = await extractTableData(pdf);
//       const images = await extractAllImages(pdf);

//       // Pair images with table rows by index
//       const graphsWithMeta: ExtractedGraph[] = images.map((img, idx) => {
//         const tableRow = tableRows[idx];
//         return { ...img, serialNumber: tableRow?.serialNumber, location: tableRow?.location, maxForce: tableRow?.maxForce };
//       });
//       setExtractedGraphs(graphsWithMeta);

//       // Build key→dataUrl mapping
//       // key format: "{partNumber}-{rowNum}-{columnId}"
//       const localMapping: Record<string, { dataUrl: string; partNumber: string; columnId: string; rowNum: number }> = {};
//       let skippedCount = 0;

//       graphsWithMeta.forEach((graph) => {
//         if (!graph.dataUrl || !graph.location) { skippedCount++; return; }
//         const loc = normaliseLocation(graph.location);
//         if (!loc) { skippedCount++; return; }

//         const rowNum = loc.rowNum;
//         const colId = prefixToColumnId(loc.prefix);
//         const graphSerial = graph.serialNumber?.trim() ?? "";

//         const matchedParts = graphSerial
//           ? selectedParts.filter((p) =>
//               String(p.partNumber ?? "").trim() === graphSerial ||
//               String(p.serialNumber ?? "").trim() === graphSerial ||
//               String(p["Serial No"] ?? "").trim() === graphSerial,
//             )
//           : [];

//         if (graphSerial && matchedParts.length === 0) {
//           console.warn(`Serial "${graphSerial}" not in selectedParts — skipped`);
//           skippedCount++;
//           return;
//         }

//         const targetParts = matchedParts.length > 0 ? matchedParts : selectedParts;
//         targetParts.forEach((part) => {
//           const key = `${part.partNumber}-${rowNum}-${colId}`;
//           localMapping[key] = { dataUrl: graph.dataUrl, partNumber: part.partNumber, columnId: colId, rowNum };
//         });
//       });

//       // ── Upload each graph image to backend ────────────────────────────────
//       // After upload, store backend path in state so UI loads images from server
//       // and UnloadWithUTM can persist them in customData
//       const entries = Object.entries(localMapping);
//       const totalToUpload = entries.length;
//       setGraphUploadProgress({ current: 0, total: totalToUpload });
//       setPdfProgress(`Uploading ${totalToUpload} graph images to backend...`);

//       const finalMapping: Record<string, string> = {};
//       let uploadedCount = 0;
//       let uploadFailedCount = 0;

//       for (const [key, { dataUrl, partNumber, columnId, rowNum }] of entries) {
//         const uploadedPath = await uploadGraphImageToBackend(dataUrl, partNumber, columnId, rowNum);

//         if (uploadedPath) {
//           // Store full URL for display, but keep the relative path for DB storage
//           finalMapping[key] = uploadedPath.startsWith("http")
//             ? uploadedPath
//             : `${BACKEND_API_URL}${uploadedPath}`;
//           uploadedCount++;
//         } else {
//           // Fallback: keep dataUrl so image still shows this session
//           finalMapping[key] = dataUrl;
//           uploadFailedCount++;
//         }

//         setGraphUploadProgress({ current: uploadedCount + uploadFailedCount, total: totalToUpload });
//         setPdfProgress(`Uploaded ${uploadedCount + uploadFailedCount}/${totalToUpload} graphs...`);
//       }

//       // Merge into state — this also triggers onDataChange which updates UnloadWithUTM
//       setInstronGraphData((prev) => ({ ...prev, ...finalMapping }));

//       // Auto-add instron column if not present
//       const alreadyExists = customColumns.some((c) => c.id === fileInfo.columnId);
//       if (!alreadyExists) {
//         setCustomColumns((prev) => [
//           ...prev,
//           { id: fileInfo.columnId, label: fileInfo.columnLabel, type: "image", options: [] },
//         ]);
//       }

//       setPdfProgress("Complete!");
//       setGraphUploadProgress(null);
//       URL.revokeObjectURL(fileUrl);

//       alert(
//         `✅ PDF processed: "${file.name}"\n` +
//         `Column: "${fileInfo.columnLabel}"\n` +
//         `Images extracted: ${images.length} | Table rows: ${tableRows.length}\n` +
//         `Uploaded to backend: ${uploadedCount}` +
//         (uploadFailedCount > 0 ? `\n⚠️ ${uploadFailedCount} upload(s) failed (shown from memory this session)` : "") +
//         (skippedCount > 0 ? `\n⚠️ ${skippedCount} skipped (serial mismatch / no location)` : ""),
//       );
//     } catch (err) {
//       console.error("❌ PDF processing error:", err);
//       setGraphUploadProgress(null);
//       alert("❌ Failed to process PDF. Please try again.");
//     } finally {
//       setPdfProcessing(false);
//       pdfProcessingRef.current = false;
//     }
//   };

//   // ─── Gallery ──────────────────────────────────────────────────────────────
//   const openImageGallery = (partNumber: string) => {
//     const images: Array<{ url: string; label: string }> = [];
//     if (postCosmeticImages[partNumber]) images.push({ url: postCosmeticImages[partNumber], label: "Post Cosmetic" });
//     if (postNonCosmeticImages[partNumber]) images.push({ url: postNonCosmeticImages[partNumber], label: "Post Non-Cosmetic" });
//     [...DEFAULT_UTM_REGIONS.clear, ...DEFAULT_UTM_REGIONS.foot, ...DEFAULT_UTM_REGIONS.sideSnap].forEach((r) => {
//       const img = croppedImages[partNumber]?.[r.label];
//       if (img) images.push({ url: img, label: r.label });
//     });
//     Object.keys(instronGraphData).forEach((key) => {
//       if (!key.startsWith(`${partNumber}-`)) return;
//       const segments = key.split("-");
//       const rowNum = segments[segments.length - 2];
//       const colId = segments.slice(segments.length - 1).join("-");
//       const col = customColumns.find((c) => c.id === colId);
//       images.push({ url: instronGraphData[key], label: col ? `${col.label} Row ${rowNum}` : key });
//     });
//     getPartCustomImages(partNumber).forEach((img) =>
//       images.push({ url: getImageUrl(img.path), label: `Pre-test: ${img.label}` }),
//     );
//     setGalleryImages(images);
//     setCurrentImageIndex(0);
//     setShowImageGallery(true);
//   };

//   const getImageUrl = (p: string) => {
//     if (!p) return "";
//     if (p.startsWith("http") || p.startsWith("data:")) return p;
//     if (p.startsWith("/uploads")) return `${BACKEND_API_URL}${p}`;
//     return p;
//   };

//   const getPartCustomImages = (pn: string): CustomImage[] =>
//     chamberData?.parts?.find((p: any) => p.partNumber === pn)?.customImages || [];
//   const getAllPartImages = (pn: string) => getPartCustomImages(pn);
//   const getImagesByLabel = (pn: string, label: string) =>
//     getPartCustomImages(pn).filter((i) => i.label === label).map((i) => getImageUrl(i.path));

//   const updateCustomColumnValue = (pn: string, rn: number, cid: string, val: string) => {
//     const key = `${pn}-${rn}-${cid}`;
//     setCustomColumnData((prev) => {
//       const u = { ...prev };
//       if (!val || !val.trim()) delete u[key];
//       else u[key] = val;
//       return u;
//     });
//   };

//   const handleCustomColumnImageUpload = async (pn: string, rn: number, cid: string, file: File) => {
//     try {
//       const fd = new FormData();
//       fd.append("image", file);
//       if (chamberData?.id) fd.append("chamberLoadId", String(chamberData.id));
//       const part = selectedParts.find((p) => p.partNumber === pn);
//       if (part?.serialNumber) fd.append("partId", String(part.serialNumber));
//       else if (part?.partNumber) fd.append("partId", String(part.partNumber));
//       fd.append("imageType", `custom-${cid}`);
//       fd.append("checkpointIndex", "0");
//       const res = await fetch(`${BACKEND_API_URL}/uploads/part-images`, { method: "POST", body: fd });
//       if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
//       const result = await res.json();
//       if (result?.path) {
//         const key = `${pn}-${rn}-${cid}`;
//         let existing: string[] = [];
//         try { existing = JSON.parse(customColumnData[key] || "[]"); } catch { existing = []; }
//         updateCustomColumnValue(pn, rn, cid, JSON.stringify([...existing, result.path]));
//       }
//     } catch (e) {
//       alert(`Upload failed: ${e instanceof Error ? e.message : e}`);
//     }
//   };

//   const renderCustomColumnCell = (part: any, rowNum: number, column: CustomColumn) => {
//     const key = `${part.partNumber}-${rowNum}-${column.id}`;
//     const value = customColumnData[key] || "";

//     if (column.id.startsWith("instron_")) {
//       const graphData = instronGraphData[key];
//       const prefix = column.id === "instron_foot" ? "FT" : column.id === "instron_sidesnap" ? "SS" : column.id === "instron_cleat" ? "CL" : "";
//       const locationLabel = prefix ? `${prefix}-0${rowNum}` : `Row ${rowNum}`;
//       return (
//         <div className="flex flex-col items-center gap-1">
//           {graphData ? (
//             <div className="relative group">
//               <img
//                 src={graphData}
//                 alt={`${column.label} ${locationLabel}`}
//                 className="w-48 h-48 object-contain border-2 border-purple-500 rounded hover:border-purple-700 transition-all hover:shadow-lg"
//                 style={{ imageRendering: "-webkit-optimize-contrast" }}
//               />
//             </div>
//           ) : (
//             <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-gray-50">
//               <ImageIcon size={32} className="text-gray-300 mb-1" />
//               <span className="text-xs text-gray-400">No graph</span>
//               <span className="text-[10px] text-gray-300 mt-0.5">Upload PDF above</span>
//             </div>
//           )}
//           <span className="text-[10px] text-purple-500 font-semibold">{locationLabel}</span>
//         </div>
//       );
//     }

//     const existingImages = column.type === "image" ? getImagesByLabel(part.partNumber, column.label) : [];
//     let uploadedImages: string[] = [];
//     if (column.type === "image" && value) {
//       try {
//         const p = JSON.parse(value);
//         if (Array.isArray(p)) uploadedImages = p.map((x) => x.startsWith("/") ? `${BACKEND_API_URL}${x}` : x);
//       } catch { /* ok */ }
//     }

//     switch (column.type) {
//       case "text":
//         return (
//           <input type="text" value={value}
//             onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
//             className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
//             placeholder="Enter text" />
//         );
//       case "number":
//         return (
//           <input type="number" value={value}
//             onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
//             className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
//             placeholder="0" />
//         );
//       case "dropdown":
//         return (
//           <select value={value}
//             onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
//             className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm">
//             <option value="">Select...</option>
//             {column.options?.map((o) => <option key={o} value={o}>{o}</option>)}
//           </select>
//         );
//       case "image":
//         return (
//           <div className="flex flex-col items-center">
//             <label className="cursor-pointer px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center mb-2">
//               <ImageIcon size={14} className="mr-1" /> Upload
//               <input type="file" accept="image/*" className="hidden"
//                 onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCustomColumnImageUpload(part.partNumber, rowNum, column.id, f); }} />
//             </label>
//             {uploadedImages.length > 0 && (
//               <div className="mb-2">
//                 <p className="text-xs text-gray-500 mb-1">Uploaded:</p>
//                 <div className="flex gap-1 flex-wrap justify-center">
//                   {uploadedImages.map((src, i) => (
//                     <div key={i} className="relative">
//                       <img src={src} alt={`${i + 1}`} className="w-12 h-12 object-cover border-2 border-blue-300 rounded cursor-pointer" onClick={() => window.open(src, "_blank")} />
//                       <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{i + 1}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//             {existingImages.length > 0 && (
//               <div className="mt-2">
//                 <p className="text-xs text-gray-500 mb-1">From pre-test:</p>
//                 <div className="flex gap-1 flex-wrap justify-center">
//                   {existingImages.map((src, i) => (
//                     <div key={i} className="relative">
//                       <img src={src} alt={`${i + 1}`} className="w-10 h-10 object-cover border border-gray-300 rounded cursor-pointer" onClick={() => window.open(src, "_blank")} />
//                       <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{i + 1}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         );
//       default:
//         return null;
//     }
//   };

//   const handleRemovePostCosmetic = (pn: string) =>
//     setPostCosmeticImages((p) => { const u = { ...p }; delete u[pn]; return u; });

//   const handleRemovePostNonCosmetic = (pn: string) => {
//     setPostNonCosmeticImages((p) => { const u = { ...p }; delete u[pn]; return u; });
//     setCroppedImages((p) => { const u = { ...p }; delete u[pn]; return u; });
//     setPartRegions((p) => { const u = { ...p }; delete u[pn]; return u; });
//     setPendingImages((p) => { const u = { ...p }; delete u[pn]; return u; });
//   };

//   const handlePostCosmeticUpload = (pn: string, file: File) => {
//     const reader = new FileReader();
//     reader.onload = (e) => setPostCosmeticImages((prev) => ({ ...prev, [pn]: e.target?.result as string }));
//     reader.readAsDataURL(file);
//   };

//   const handlePostNonCosmeticUpload = (pn: string, file: File) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const data = e.target?.result as string;
//       setPendingImages((prev) => ({ ...prev, [pn]: data }));
//       setCurrentAdjustingPart(pn);
//       setTempImage(data);
//       const regs = partRegions[pn] || [...DEFAULT_UTM_REGIONS.clear, ...DEFAULT_UTM_REGIONS.foot, ...DEFAULT_UTM_REGIONS.sideSnap];
//       setAdjustableRegions(JSON.parse(JSON.stringify(regs)));
//       setSelectedRegion(null);
//       setImageLoaded(false);
//       const img = new Image();
//       img.onload = () => { setImageLoaded(true); setShowCropAdjuster(true); };
//       img.src = data;
//     };
//     reader.onerror = () => alert("Failed to read image");
//     reader.readAsDataURL(file);
//   };

//   const handleConfirmCrop = async () => {
//     if (!tempImage || !currentAdjustingPart) return;
//     setProcessing(true);
//     setShowCropAdjuster(false);
//     try {
//       setPartRegions((prev) => ({ ...prev, [currentAdjustingPart]: JSON.parse(JSON.stringify(adjustableRegions)) }));
//       setPostNonCosmeticImages((prev) => ({ ...prev, [currentAdjustingPart]: tempImage }));
//       await cropWithCanvas(currentAdjustingPart, tempImage, adjustableRegions);
//       setPendingImages((prev) => { const u = { ...prev }; delete u[currentAdjustingPart]; return u; });
//       alert(`✅ Cropped successfully for ${currentAdjustingPart}`);
//     } catch {
//       alert("❌ Failed to crop image");
//     } finally {
//       setProcessing(false);
//       setTempImage("");
//       setCurrentAdjustingPart("");
//       setAdjustableRegions([]);
//       setSelectedRegion(null);
//       setImageLoaded(false);
//     }
//   };

//   const handleCancelCrop = () => {
//     if (currentAdjustingPart) setPendingImages((p) => { const u = { ...p }; delete u[currentAdjustingPart]; return u; });
//     setShowCropAdjuster(false);
//     setTempImage("");
//     setCurrentAdjustingPart("");
//     setAdjustableRegions([]);
//     setSelectedRegion(null);
//     setImageLoaded(false);
//   };

//   const cropImageWithCanvas = (img: HTMLImageElement, x: number, y: number, w: number, h: number): string => {
//     const c = document.createElement("canvas");
//     c.width = w;
//     c.height = h;
//     const ctx = c.getContext("2d");
//     if (!ctx) throw new Error("No ctx");
//     ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
//     return c.toDataURL("image/png", 1.0);
//   };

//   const cropWithCanvas = (pn: string, imageData: string, regions: CropRegion[]): Promise<void> =>
//     new Promise((resolve, reject) => {
//       const img = new Image();
//       img.onload = () => {
//         try {
//           const sx = img.width / 480, sy = img.height / 320;
//           const result: Record<string, string> = {};
//           regions.forEach((r) => {
//             try {
//               const x = Math.round(r.x * sx), y = Math.round(r.y * sy);
//               const w = Math.round(r.width * sx), h = Math.round(r.height * sy);
//               if (w <= 0 || h <= 0) return;
//               result[r.label] = cropImageWithCanvas(img, Math.max(0, Math.min(x, img.width - 1)), Math.max(0, Math.min(y, img.height - 1)), Math.min(w, img.width - x), Math.min(h, img.height - y));
//             } catch (e) { console.error(`Crop error ${r.label}`, e); }
//           });
//           setCroppedImages((prev) => ({ ...prev, [pn]: result }));
//           resolve();
//         } catch (e) { reject(e); }
//       };
//       img.onerror = () => reject(new Error("Image load failed"));
//       img.src = imageData;
//     });

//   const handleAddColumn = () => {
//     if (!newColumnName.trim()) { alert("Enter a column name"); return; }
//     if (newColumnType === "dropdown" && !dropdownOptions.length) { alert("Add at least one option"); return; }
//     setCustomColumns((prev) => [...prev, {
//       id: newColumnName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
//       label: newColumnName.trim(),
//       type: newColumnType,
//       options: newColumnType === "dropdown" ? dropdownOptions : undefined,
//     }]);
//     setShowAddColumnModal(false);
//     setNewColumnName("");
//     setNewColumnType("text");
//     setDropdownOptions([]);
//     setNewOption("");
//   };

//   const handleRemoveColumn = (columnId: string) => {
//     const hasGraphData = Object.keys(instronGraphData).some((k) => k.includes(`-${columnId}`));
//     if (hasGraphData && !window.confirm("This column has loaded graph data. Remove anyway?")) return;
//     setCustomColumns((prev) => prev.filter((c) => c.id !== columnId));
//     const cleanCols = { ...customColumnData };
//     Object.keys(cleanCols).forEach((k) => { if (k.includes(`-${columnId}`)) delete cleanCols[k]; });
//     setCustomColumnData(cleanCols);
//     setInstronGraphData((prev) => { const u = { ...prev }; Object.keys(u).forEach((k) => { if (k.includes(`-${columnId}`)) delete u[k]; }); return u; });
//   };

//   const uniqueParts = Array.isArray(selectedParts)
//     ? selectedParts.reduce((acc, p) => { if (!acc.find((x: any) => x.partNumber === p.partNumber)) acc.push(p); return acc; }, [] as any[])
//     : [];

//   if (!Array.isArray(selectedParts) || !selectedParts.length) {
//     return (
//       <div className="p-8 bg-gray-50 min-h-screen">
//         <div className="max-w-full mx-auto">
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
//             <p className="text-yellow-800 font-medium">No parts available for unload</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ═══════════════════════════════════════════════════════════════════════════
//   return (
//     <div className="p-8 bg-gray-50 min-h-screen">
//       {/* Crop Adjuster Modal */}
//       {showCropAdjuster && (
//         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-auto">
//             <div className="p-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-2xl font-bold">
//                   Adjust Crop Regions — {currentAdjustingPart}
//                   {partRegions[currentAdjustingPart] && (
//                     <span className="ml-3 text-sm text-green-600 font-normal">(Previously adjusted)</span>
//                   )}
//                 </h3>
//                 <button onClick={handleCancelCrop} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
//               </div>
//               <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-start">
//                 <div>
//                   <p className="text-sm text-blue-800"><strong>Instructions:</strong> Click region (turns red) → drag to move. Use +/- to resize.</p>
//                   <p className="text-sm text-blue-800 mt-1"><strong>Note:</strong> Coordinates saved to database.</p>
//                 </div>
//                 <button
//                   onClick={() => { setAdjustableRegions(JSON.parse(JSON.stringify([...DEFAULT_UTM_REGIONS.clear, ...DEFAULT_UTM_REGIONS.foot, ...DEFAULT_UTM_REGIONS.sideSnap]))); setSelectedRegion(null); }}
//                   className="ml-4 px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 whitespace-nowrap">
//                   Reset to Default
//                 </button>
//               </div>
//               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//                 <div className="lg:col-span-3">
//                   <div className="border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100 p-4">
//                     <canvas ref={canvasRef} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} className="max-w-full cursor-crosshair shadow-lg" style={{ imageRendering: "crisp-edges" }} />
//                   </div>
//                 </div>
//                 <div className="lg:col-span-1 space-y-4">
//                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
//                     <h4 className="font-bold mb-3 text-gray-700">Selected Region</h4>
//                     {selectedRegion !== null ? (
//                       <div className="space-y-3">
//                         <div className="bg-white p-2 rounded border">
//                           <p className="text-sm font-bold text-blue-600">{adjustableRegions[selectedRegion].label}</p>
//                         </div>
//                         {(["width", "height"] as const).map((dim) => (
//                           <div key={dim}>
//                             <label className="text-xs font-medium text-gray-600 block mb-1">
//                               {dim.charAt(0).toUpperCase() + dim.slice(1)}: {adjustableRegions[selectedRegion][dim].toFixed(0)}px
//                             </label>
//                             <div className="flex gap-2">
//                               <button onClick={() => handleResizeRegion(-5, dim)} className="flex-1 px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">-5</button>
//                               <button onClick={() => handleResizeRegion(5, dim)} className="flex-1 px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">+5</button>
//                             </div>
//                           </div>
//                         ))}
//                         <div className="pt-2 border-t">
//                           <p className="text-xs text-gray-500">X: {adjustableRegions[selectedRegion].x.toFixed(0)}, Y: {adjustableRegions[selectedRegion].y.toFixed(0)}</p>
//                         </div>
//                       </div>
//                     ) : (
//                       <p className="text-sm text-gray-500">Click a region to select it</p>
//                     )}
//                   </div>
//                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 max-h-96 overflow-y-auto">
//                     <h4 className="font-bold mb-2 text-gray-700">All Regions</h4>
//                     <div className="space-y-1">
//                       {adjustableRegions.map((r, i) => (
//                         <button key={r.label} onClick={() => setSelectedRegion(i)}
//                           className={`w-full text-left px-3 py-2 rounded text-sm ${selectedRegion === i ? "bg-red-500 text-white font-bold" : "bg-white hover:bg-gray-100"}`}>
//                           {r.label}
//                         </button>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div className="flex gap-4 mt-6">
//                 <button onClick={handleConfirmCrop} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg flex items-center justify-center gap-2">
//                   <Check size={20} /> OK — Confirm & Save
//                 </button>
//                 <button onClick={handleCancelCrop} className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold text-lg">Cancel</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Image Gallery */}
//       {showImageGallery && (
//         <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
//           <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
//             <button onClick={() => setShowImageGallery(false)} className="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 rounded-full p-2"><X size={24} /></button>
//             <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded">{currentImageIndex + 1} / {galleryImages.length}</div>
//             <div className="flex-1 flex items-center justify-center">
//               {galleryImages[currentImageIndex] && (
//                 <div className="max-w-4xl max-h-[80vh] flex flex-col items-center">
//                   <img src={galleryImages[currentImageIndex].url} alt={galleryImages[currentImageIndex].label} className="max-w-full max-h-full object-contain" />
//                   <p className="text-white mt-4 text-lg font-semibold">{galleryImages[currentImageIndex].label}</p>
//                 </div>
//               )}
//             </div>
//             <div className="absolute bottom-4 flex gap-4">
//               <button onClick={() => setCurrentImageIndex((p) => Math.max(0, p - 1))} disabled={currentImageIndex === 0} className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 disabled:opacity-50">← Previous</button>
//               <button onClick={() => setCurrentImageIndex((p) => Math.min(galleryImages.length - 1, p + 1))} disabled={currentImageIndex === galleryImages.length - 1} className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 disabled:opacity-50">Next →</button>
//             </div>
//             <div className="absolute bottom-20 flex gap-2 overflow-x-auto max-w-full px-4">
//               {galleryImages.map((img, idx) => (
//                 <img key={idx} src={img.url} alt={img.label} onClick={() => setCurrentImageIndex(idx)}
//                   className={`w-16 h-16 object-cover cursor-pointer border-2 ${idx === currentImageIndex ? "border-blue-500" : "border-white"}`} />
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Toolbar */}
//       <div className="max-w-full mx-auto mb-4 flex gap-4 items-center flex-wrap">
//         <button onClick={() => setShowAddColumnModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-medium">
//           <Plus size={18} /> Add Custom Column
//         </button>
//         <div className="relative">
//           <label className={`cursor-pointer px-4 py-2 text-white rounded flex items-center gap-2 font-medium ${pdfProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
//             <FileUp size={18} />
//             {pdfProcessing ? "Processing PDF..." : "Upload Instron PDF"}
//             <input type="file" accept="application/pdf" className="hidden" disabled={pdfProcessing}
//               onChange={(e) => { const f = e.target.files?.[0]; if (f && !pdfProcessing) handlePDFUpload(f); e.target.value = ""; }} />
//           </label>
//         </div>

//         {/* PDF extraction progress */}
//         {pdfProcessing && !graphUploadProgress && (
//           <div className="flex items-center gap-2 text-sm text-gray-600">
//             <Loader2 size={16} className="animate-spin" />
//             <span>{pdfProgress}</span>
//           </div>
//         )}

//         {/* Graph upload progress bar */}
//         {graphUploadProgress && (
//           <div className="flex items-center gap-3">
//             <Loader2 size={16} className="animate-spin text-purple-600" />
//             <div className="flex flex-col">
//               <span className="text-sm font-medium text-purple-700">
//                 Saving graphs to DB: {graphUploadProgress.current}/{graphUploadProgress.total}
//               </span>
//               <div className="w-48 h-2 bg-purple-100 rounded-full overflow-hidden mt-0.5">
//                 <div
//                   className="h-full bg-purple-500 rounded-full transition-all duration-300"
//                   style={{ width: `${graphUploadProgress.total > 0 ? (graphUploadProgress.current / graphUploadProgress.total) * 100 : 0}%` }}
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {extractedGraphs.length > 0 && !pdfProcessing && !graphUploadProgress && (
//           <div className="text-sm text-green-600 font-medium">
//             ✅ {extractedGraphs.length} graphs extracted &amp; saved to DB
//           </div>
//         )}

//         <span className="text-xs text-gray-400 italic">
//           Filename keywords: <span className="text-purple-500">Footpush/FT</span> → Foot Push &nbsp;|&nbsp;
//           <span className="text-purple-500">SS</span> → Side Snap &nbsp;|&nbsp;
//           <span className="text-purple-500">CL</span> → Cleat
//         </span>
//       </div>

//       {/* Add Column Modal */}
//       {showAddColumnModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
//             <h3 className="text-xl font-bold mb-4">Add Custom Column</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Column Name</label>
//                 <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Enter column name" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Column Type</label>
//                 <select value={newColumnType} onChange={(e) => { setNewColumnType(e.target.value as any); if (e.target.value !== "dropdown") setDropdownOptions([]); }} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
//                   <option value="text">Text</option>
//                   <option value="number">Number</option>
//                   <option value="dropdown">Dropdown</option>
//                   <option value="image">Image</option>
//                 </select>
//               </div>
//               {newColumnType === "dropdown" && (
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Dropdown Options</label>
//                   <div className="flex gap-2 mb-2">
//                     <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && (() => { if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) { setDropdownOptions((p) => [...p, newOption.trim()]); setNewOption(""); } })()}
//                       placeholder="Add option" className="flex-1 px-3 py-2 border border-gray-300 rounded" />
//                     <button onClick={() => { if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) { setDropdownOptions((p) => [...p, newOption.trim()]); setNewOption(""); } }} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">Add</button>
//                   </div>
//                   <div className="flex flex-wrap gap-2">
//                     {dropdownOptions.map((o) => (
//                       <div key={o} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
//                         <span className="text-sm">{o}</span>
//                         <button onClick={() => setDropdownOptions((p) => p.filter((x) => x !== o))} className="text-red-500 hover:text-red-700"><X size={14} /></button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div className="flex gap-3 mt-6">
//               <button onClick={handleAddColumn} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Add Column</button>
//               <button onClick={() => { setShowAddColumnModal(false); setNewColumnName(""); setNewColumnType("text"); setDropdownOptions([]); setNewOption(""); }} className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Pre-Images Modal */}
//       {showPreImagesModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-xl font-bold">Pre-Test Images — Part {selectedPartForModal}</h3>
//               <button onClick={() => setShowPreImagesModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
//             </div>
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//               {getAllPartImages(selectedPartForModal).map((img: CustomImage, i) => (
//                 <div key={i} className="border rounded-lg overflow-hidden">
//                   <img src={getImageUrl(img.path)} alt={img.label} className="w-full h-48 object-cover" />
//                   <div className="p-2 text-center bg-gray-100">
//                     <span className="text-sm font-medium">{img.label}</span>
//                     {img.uploadedAt && <p className="text-xs text-gray-500">{new Date(img.uploadedAt).toLocaleString()}</p>}
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-6 text-center">
//               <button onClick={() => setShowPreImagesModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Parts Table */}
//       <div className="max-w-full mx-auto space-y-8">
//         {uniqueParts.map((part) => {
//           const postCosmetic = postCosmeticImages[part.partNumber];
//           const postNonCosmetic = postNonCosmeticImages[part.partNumber];
//           const partCroppedImages = croppedImages[part.partNumber] || {};
//           const partCustomImages = getPartCustomImages(part.partNumber);
//           const savedRegions = partRegions[part.partNumber];
//           const instronLoadedCount = Object.keys(instronGraphData).filter((k) => k.startsWith(`${part.partNumber}-`)).length;

//           return (
//             <div key={part.partNumber} className="space-y-4">
//               <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
//                 <div>
//                   <h2 className="text-lg font-bold">{part.partNumber}</h2>
//                   <div className="flex gap-4 mt-1 text-xs flex-wrap">
//                     <div className="flex items-center gap-1">
//                       <span className="w-3 h-3 rounded-full bg-green-500"></span>
//                       <span>Pre Images: {partCustomImages.length}</span>
//                     </div>
//                     {savedRegions && (
//                       <div className="flex items-center gap-1">
//                         <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
//                         <span>Custom crop ({savedRegions.length} regions)</span>
//                       </div>
//                     )}
//                     {postNonCosmetic && Object.keys(partCroppedImages).length > 0 && (
//                       <div className="flex items-center gap-1">
//                         <span className="w-3 h-3 rounded-full bg-blue-400"></span>
//                         <span>Cropped: {Object.keys(partCroppedImages).length}</span>
//                       </div>
//                     )}
//                     {instronLoadedCount > 0 && (
//                       <div className="flex items-center gap-1">
//                         <span className="w-3 h-3 rounded-full bg-purple-400"></span>
//                         <span>📊 {instronLoadedCount} graphs in DB</span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <button onClick={() => openImageGallery(part.partNumber)} className="px-4 py-2 bg-white text-red-600 rounded hover:bg-gray-100 flex items-center gap-2 font-medium">
//                   <Eye size={18} /> View All Images
//                 </button>
//               </div>

//               <div className="bg-white rounded-b-xl shadow-md border-2 border-gray-300 overflow-hidden">
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-400">
//                         <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Row #</th>
//                         <th className="px-4 py-4 text-center text-xs font-bold text-green-700 uppercase border-r border-gray-300 bg-green-50">Post Cosmetic</th>
//                         <th className="px-4 py-4 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 bg-blue-50">Post Non-Cosmetic</th>
//                         <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">Clear</th>
//                         <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">Foot</th>
//                         <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">Side Snap</th>
//                         {customColumns.map((col) => (
//                           <th key={col.id} className={`px-4 py-4 text-center text-xs font-bold uppercase border-r border-gray-300 relative group ${col.id.startsWith("instron_") ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-700"}`}>
//                             <div className="flex items-center justify-between gap-1">
//                               <span className="flex-1 text-center">{col.label}</span>
//                               <button onClick={() => handleRemoveColumn(col.id)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
//                             </div>
//                             <span className="text-[10px] font-normal text-gray-400">({col.type})</span>
//                           </th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-200">
//                       {[1, 2, 3, 4].map((rowNum, idx) => {
//                         const clearImg = partCroppedImages[`CL-${rowNum}`];
//                         const footImg = partCroppedImages[`FT-${rowNum}`];
//                         const ssImg = partCroppedImages[`SS-${rowNum}`];
//                         return (
//                           <tr key={rowNum} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
//                             <td className="px-4 py-4 border-r border-gray-300 text-center font-bold text-sm text-gray-800">{rowNum}</td>

//                             {/* Post Cosmetic */}
//                             <td className="px-4 py-4 border-r border-gray-300 text-center">
//                               {rowNum === 1 ? (
//                                 postCosmetic ? (
//                                   <div className="flex flex-col items-center gap-2">
//                                     <img src={postCosmetic} alt="Post Cosmetic" className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg cursor-pointer" onClick={() => window.open(postCosmetic, "_blank")} />
//                                     <button onClick={() => handleRemovePostCosmetic(part.partNumber)} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"><X size={12} /> Remove</button>
//                                   </div>
//                                 ) : (
//                                   <label className="inline-flex items-center cursor-pointer px-4 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700">
//                                     <Upload size={14} className="mr-1" /> Upload
//                                     <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePostCosmeticUpload(part.partNumber, f); }} />
//                                   </label>
//                                 )
//                               ) : postCosmetic ? (
//                                 <img src={postCosmetic} alt="Post Cosmetic" className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg" />
//                               ) : null}
//                             </td>

//                             {/* Post Non-Cosmetic */}
//                             <td className="px-4 py-4 border-r border-gray-300 text-center">
//                               {rowNum === 1 ? (
//                                 postNonCosmetic ? (
//                                   <div className="flex flex-col items-center gap-2">
//                                     <img src={postNonCosmetic} alt="Post Non-Cosmetic" className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg cursor-pointer" onClick={() => window.open(postNonCosmetic, "_blank")} />
//                                     <div className="flex gap-2">
//                                       <button disabled={processing} onClick={() => {
//                                         setCurrentAdjustingPart(part.partNumber);
//                                         setTempImage(postNonCosmetic);
//                                         const regs = partRegions[part.partNumber] || [...DEFAULT_UTM_REGIONS.clear, ...DEFAULT_UTM_REGIONS.foot, ...DEFAULT_UTM_REGIONS.sideSnap];
//                                         setAdjustableRegions(JSON.parse(JSON.stringify(regs)));
//                                         setSelectedRegion(null);
//                                         setImageLoaded(false);
//                                         const img2 = new Image();
//                                         img2.onload = () => { setImageLoaded(true); setShowCropAdjuster(true); };
//                                         img2.src = postNonCosmetic;
//                                       }} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1">
//                                         <Move size={12} /> Adjust
//                                       </button>
//                                       <button onClick={() => handleRemovePostNonCosmetic(part.partNumber)} disabled={processing} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"><X size={12} /> Remove</button>
//                                     </div>
//                                   </div>
//                                 ) : (
//                                   <label className={`inline-flex items-center cursor-pointer px-4 py-2 text-white text-xs rounded ${processing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
//                                     {processing ? <><Loader2 size={14} className="mr-1 animate-spin" /> Processing...</> : <><Upload size={14} className="mr-1" /> Upload</>}
//                                     <input type="file" accept="image/*" className="hidden" disabled={processing} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePostNonCosmeticUpload(part.partNumber, f); }} />
//                                   </label>
//                                 )
//                               ) : postNonCosmetic ? (
//                                 <img src={postNonCosmetic} alt="Post Non-Cosmetic" className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg" />
//                               ) : null}
//                             </td>

//                             {/* Clear */}
//                             <td className="px-4 py-4 border-r border-gray-300 text-center">
//                               {clearImg ? (
//                                 <div className="flex flex-col items-center">
//                                   <img src={clearImg} alt={`CL-${rowNum}`} className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer" onClick={() => window.open(clearImg, "_blank")} />
//                                   <span className="text-xs text-purple-600 mt-1 font-medium">CL-{rowNum}</span>
//                                 </div>
//                               ) : <span className="text-gray-400 text-sm">CL-{rowNum}</span>}
//                             </td>

//                             {/* Foot */}
//                             <td className="px-4 py-4 border-r border-gray-300 text-center">
//                               {footImg ? (
//                                 <div className="flex flex-col items-center">
//                                   <img src={footImg} alt={`FT-${rowNum}`} className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer" onClick={() => window.open(footImg, "_blank")} />
//                                   <span className="text-xs text-purple-600 mt-1 font-medium">FT-{rowNum}</span>
//                                 </div>
//                               ) : <span className="text-gray-400 text-sm">FT-{rowNum}</span>}
//                             </td>

//                             {/* Side Snap */}
//                             <td className="px-4 py-4 border-r border-gray-300 text-center">
//                               {ssImg ? (
//                                 <div className="flex flex-col items-center">
//                                   <img src={ssImg} alt={`SS-${rowNum}`} className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer" onClick={() => window.open(ssImg, "_blank")} />
//                                   <span className="text-xs text-purple-600 mt-1 font-medium">SS-{rowNum}</span>
//                                 </div>
//                               ) : <span className="text-gray-400 text-sm">SS-{rowNum}</span>}
//                             </td>

//                             {/* Custom Columns */}
//                             {customColumns.map((col) => (
//                               <td key={col.id} className="px-4 py-4 border-r border-gray-300 text-center">
//                                 {renderCustomColumnCell(part, rowNum, col)}
//                               </td>
//                             ))}
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default UTMImageCropper;


import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Loader2,
  Plus,
  X,
  ImageIcon,
  Move,
  Check,
  FileUp,
  Eye,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { BACKEND_API_URL } from "@/lib/backendApi";
import pdfcropping from "@/lib/pdf.worker.min.js";

// pdfjsLib.GlobalWorkerOptions.workerSrc =
//   "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfcropping;
console.log("✅ PDF.js API version:", pdfjsLib.version);

interface UTMImageCropperProps {
  chamberData: any;
  formData: any;
  updateRowField: (rowId: number, field: string, value: string) => void;
  selectedParts: any[];
  machineEquipment2: string;
  isSecondRound?: boolean;
  currentChildTest?: any;
  onDataChange?: (data: any) => void;
}

interface CustomColumn {
  id: string;
  label: string;
  type: "text" | "number" | "image" | "dropdown";
  options?: string[];
}

interface CustomImage {
  label: string;
  path: string;
  uploadedAt: string | null;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface ExtractedGraph {
  id: number;
  page: number;
  dataUrl: string;
  name: string;
  serialNo?: string; // renamed from serialNumber → matches PDF "Serial No"
  partNo?: string; // NEW: from PDF "Part No"
  plc?: string; // renamed from location → matches PDF "P-LC"
  force?: number; // renamed from maxForce → matches PDF "Force [N]"
  colour?: string; // NEW: from PDF "Colour"
  op?: string; // NEW: from PDF "OP"
  endDate?: string; // NEW: from PDF "End date"
}

// ── NEW: Extra metadata extracted per row from the PDF table ──────────────
interface InstronRowMeta {
  serialNo: string;
  partNo: string;
  plc: string;
  force: number;
  colour: string;
  op: string;
  endDate: string;
}

const DEFAULT_UTM_REGIONS = {
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

interface ParsedFileInfo {
  columnId: string;
  columnLabel: string;
  locationType: "foot" | "sidesnap" | "cleat" | "sidesnapsshear" | "custom";
}

function parseInstronFileName(filename: string): ParsedFileInfo {
  const base = filename.replace(/\.[^/.]+$/, "");
  const parts = base.split("_");

  let afterDateIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    if (p.startsWith("produced") || /\d{2}-\d{2}-\d{2}/.test(parts[i])) {
      afterDateIdx = i + 1;
      break;
    }
  }

  const labelParts: string[] = [];
  for (let i = afterDateIdx; i < parts.length; i++) {
    if (/^N\d+$/i.test(parts[i])) break;
    labelParts.push(parts[i]);
  }

  const rawLabel = labelParts.join(" ").trim() || base;
  const upper = rawLabel.toUpperCase().replace(/[\s_-]/g, "");

  let columnLabel: string;
  let columnId: string;
  let locationType: ParsedFileInfo["locationType"];

  // ── SSS / SideSnapShear must be checked BEFORE generic SS ────────────────
  if (
    upper === "SSS" ||
    upper.includes("SIDESNAPSSHEAR") ||
    upper.includes("SSSSHEAR") ||
    upper.includes("SNAPSHEAR")
  ) {
    columnLabel = "Side Snap Shear";
    columnId = "instron_sidesnapsshear";
    locationType = "sidesnapsshear";
  } else if (upper.includes("FOOTPUSH") || upper === "FOOT" || upper === "FT") {
    columnLabel = "Foot Push";
    columnId = "instron_foot";
    locationType = "foot";
  } else if (
    upper === "SS" ||
    upper.includes("SIDESNAP") ||
    upper.includes("SIDE")
  ) {
    columnLabel = "Side Snap";
    columnId = "instron_sidesnap";
    locationType = "sidesnap";
  } else if (upper === "CL" || upper.includes("CLEAT")) {
    columnLabel = "Cleat";
    columnId = "instron_cleat";
    locationType = "cleat";
  } else {
    columnLabel = rawLabel;
    columnId =
      "instron_" +
      rawLabel
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    locationType = "custom";
  }

  return { columnId, columnLabel, locationType };
}

function normaliseLocation(
  raw: string,
): { prefix: string; rowNum: number } | null {
  // Updated regex to also match SSS-01 style (3-letter prefix)
  const m = raw
    .trim()
    .toUpperCase()
    .match(/^(FT|SS|CL|SSS)-?0*(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], rowNum: parseInt(m[2], 10) };
}

function prefixToColumnId(prefix: string): string {
  switch (prefix) {
    case "FT":
      return "instron_foot";
    case "SS":
      return "instron_sidesnap";
    case "CL":
      return "instron_cleat";
    case "SSS":
      return "instron_sidesnapsshear";
    default:
      return `instron_${prefix.toLowerCase()}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const UTMImageCropper: React.FC<UTMImageCropperProps> = ({
  chamberData,
  formData,
  updateRowField,
  selectedParts = [],
  machineEquipment2,
  isSecondRound = false,
  currentChildTest,
  onDataChange,
}) => {
  if (!chamberData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 font-medium">Loading chamber data...</p>
          </div>
        </div>
      </div>
    );
  }

  const [postCosmeticImages, setPostCosmeticImages] = useState<
    Record<string, string>
  >({});
  const [postNonCosmeticImages, setPostNonCosmeticImages] = useState<
    Record<string, string>
  >({});
  const [croppedImages, setCroppedImages] = useState<
    Record<string, Record<string, string>>
  >({});
  const [processing, setProcessing] = useState(false);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<
    "text" | "number" | "image" | "dropdown"
  >("text");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [customColumnData, setCustomColumnData] = useState<
    Record<string, string>
  >({});
  const [showCropAdjuster, setShowCropAdjuster] = useState(false);
  const [currentAdjustingPart, setCurrentAdjustingPart] = useState<string>("");
  const [tempImage, setTempImage] = useState<string>("");
  const [adjustableRegions, setAdjustableRegions] = useState<CropRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [partRegions, setPartRegions] = useState<Record<string, CropRegion[]>>(
    {},
  );
  const [pendingImages, setPendingImages] = useState<Record<string, string>>(
    {},
  );
  const [showPreImagesModal, setShowPreImagesModal] = useState(false);
  const [selectedPartForModal, setSelectedPartForModal] = useState<string>("");

  // ── instronGraphData stores backend paths (e.g. "/uploads/part-images/xxx.png")
  // Key format: "{partNumber}-{rowNum}-{columnId}"
  const [instronGraphData, setInstronGraphData] = useState<
    Record<string, string>
  >({});
  const [extractedGraphs, setExtractedGraphs] = useState<ExtractedGraph[]>([]);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");

  // ── NEW: Per-row metadata from PDF table ──────────────────────────────────
  // Key format: "{partNumber}-{rowNum}-{columnId}"  (same key as instronGraphData)
  const [instronRowMeta, setInstronRowMeta] = useState<
    Record<string, InstronRowMeta>
  >({});

  // ── upload progress for graph images ─────────────────────────────────────
  const [graphUploadProgress, setGraphUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<
    Array<{ url: string; label: string }>
  >([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const pdfProcessingRef = useRef(false);
  const dataChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!chamberData) return;
    initializedRef.current = true;

    const rawColumns = Array.isArray(chamberData.customColumns)
      ? chamberData.customColumns
      : [];

    if (rawColumns.length === 0 && chamberData.parts?.length > 0) {
      const part = chamberData.parts[0];
      if (part.customImages?.length > 0) {
        const imageColumns: CustomColumn[] = part.customImages.map(
          (img: CustomImage) => ({
            id: img.label,
            label: img.label,
            type: "image" as const,
            options: [],
          }),
        );
        if (imageColumns.length > 0) setCustomColumns(imageColumns);
      }
    } else if (rawColumns.length > 0) {
      setCustomColumns(
        rawColumns.map((col: any, i: number) => ({
          id: col.id ?? col.name ?? col.label ?? `utm-column-${i}`,
          label: col.label ?? col.name ?? `Column ${i + 1}`,
          type: (col.type as CustomColumn["type"]) ?? "text",
          options: Array.isArray(col.options) ? col.options : undefined,
        })),
      );
    }

    const rawColumnData = chamberData.customColumnData;
    if (rawColumnData && typeof rawColumnData === "object") {
      const flat: Record<string, string> = {};
      Object.keys(rawColumnData).forEach((pn) =>
        Object.keys(rawColumnData[pn]).forEach((rn) =>
          Object.keys(rawColumnData[pn][rn]).forEach((cid) => {
            flat[`${pn}-${rn}-${cid}`] = rawColumnData[pn][rn][cid];
          }),
        ),
      );
      setCustomColumnData(flat);
    }

    // ── Restore previously uploaded graph paths from checkpointData ──────────
    if (Array.isArray(chamberData.parts)) {
      const restored: Record<string, string> = {};
      chamberData.parts.forEach((part: any) => {
        const pn: string = part.partNumber;
        if (!Array.isArray(part.checkpointData)) return;
        part.checkpointData.forEach((cp: any) => {
          if (!cp.customData) return;
          Object.keys(cp.customData).forEach((key) => {
            if (!key.startsWith("instron_")) return;
            try {
              const paths: string[] = JSON.parse(cp.customData[key] || "[]");
              paths.forEach((path, idx) => {
                if (!path) return;
                const rowNum = idx + 1;
                const fullUrl = path.startsWith("http")
                  ? path
                  : `${BACKEND_API_URL}${path}`;
                restored[`${pn}-${rowNum}-${key}`] = fullUrl;
              });
            } catch {
              /* skip malformed */
            }
          });
        });
      });
      if (Object.keys(restored).length > 0) {
        setInstronGraphData(restored);
      }
    }
  }, [chamberData]);

  useEffect(() => {
    if (!onDataChange) return;
    if (dataChangeTimeoutRef.current)
      clearTimeout(dataChangeTimeoutRef.current);
    dataChangeTimeoutRef.current = setTimeout(() => {
      const cropRegionsData: Record<string, CropRegion[]> = {};
      Object.keys(partRegions).forEach((p) => {
        cropRegionsData[p] = partRegions[p];
      });
      onDataChange({
        postCosmeticImages,
        postNonCosmeticImages,
        croppedImages,
        customColumns,
        customColumnData,
        cropRegionsData,
        instronGraphData,
        instronRowMeta,
      });
    }, 1000);
    return () => {
      if (dataChangeTimeoutRef.current)
        clearTimeout(dataChangeTimeoutRef.current);
    };
  }, [
    postCosmeticImages,
    postNonCosmeticImages,
    croppedImages,
    customColumns,
    customColumnData,
    partRegions,
    instronGraphData,
    instronRowMeta,
    onDataChange,
  ]);

  useEffect(() => {
    if (showCropAdjuster && canvasRef.current && tempImage && imageLoaded)
      drawCanvas();
  }, [
    showCropAdjuster,
    tempImage,
    adjustableRegions,
    selectedRegion,
    imageLoaded,
  ]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const sx = img.width / 480,
        sy = img.height / 320;
      adjustableRegions.forEach((region, idx) => {
        const x = region.x * sx,
          y = region.y * sy,
          w = region.width * sx,
          h = region.height * sy;
        ctx.strokeStyle = selectedRegion === idx ? "#FF0000" : "#00FF00";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(x, y - 25, 80, 25);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px Arial";
        ctx.fillText(region.label, x + 5, y - 7);
        if (selectedRegion === idx) {
          ctx.fillStyle = "#FF0000";
          const hs = 8;
          [
            [x, y],
            [x + w, y],
            [x, y + h],
            [x + w, y + h],
          ].forEach(([cx, cy]) =>
            ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs),
          );
        }
      });
    };
    img.src = tempImage;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const sx = canvas.width / 480,
      sy = canvas.height / 320;
    adjustableRegions.forEach((r, idx) => {
      if (
        x >= r.x * sx &&
        x <= (r.x + r.width) * sx &&
        y >= r.y * sy &&
        y <= (r.y + r.height) * sy
      ) {
        setSelectedRegion(idx);
        setIsDragging(true);
        setDragStart({ x: x - r.x * sx, y: y - r.y * sy });
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedRegion === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const sx = canvas.width / 480,
      sy = canvas.height / 320;
    setAdjustableRegions((prev) => {
      const u = [...prev];
      u[selectedRegion] = {
        ...u[selectedRegion],
        x: Math.max(
          0,
          Math.min(480 - u[selectedRegion].width, (x - dragStart.x) / sx),
        ),
        y: Math.max(
          0,
          Math.min(320 - u[selectedRegion].height, (y - dragStart.y) / sy),
        ),
      };
      return u;
    });
  };

  const handleCanvasMouseUp = () => setIsDragging(false);

  const handleResizeRegion = (delta: number, dim: "width" | "height") => {
    if (selectedRegion === null) return;
    setAdjustableRegions((prev) => {
      const u = [...prev];
      u[selectedRegion] = {
        ...u[selectedRegion],
        [dim]: Math.max(20, Math.min(200, u[selectedRegion][dim] + delta)),
      };
      return u;
    });
  };

  // ─── Upload a single graph image dataURL to backend ───────────────────────
  const uploadGraphImageToBackend = async (
    dataUrl: string,
    partNumber: string,
    columnId: string,
    rowNum: number,
  ): Promise<string | null> => {
    try {
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const filename = `${partNumber}_${columnId}_row${rowNum}_${Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      const fd = new FormData();
      fd.append("image", file);
      if (chamberData?.id) fd.append("chamberLoadId", String(chamberData.id));

      const part = selectedParts.find((p) => p.partNumber === partNumber);
      if (part?.serialNumber) fd.append("partId", String(part.serialNumber));
      else if (part?.partNumber) fd.append("partId", String(part.partNumber));

      fd.append("imageType", columnId);
      fd.append("checkpointIndex", "0");

      const response = await fetch(`${BACKEND_API_URL}/uploads/part-images`, {
        method: "POST",
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `❌ Graph upload failed [${partNumber}/${columnId}/row${rowNum}]:`,
          errorData,
        );
        return null;
      }

      const result = await response.json();
      const uploadedPath: string | undefined = result?.path;
      if (uploadedPath) {
        console.log(
          `✅ Graph uploaded: [${partNumber}/${columnId}/row${rowNum}] → ${uploadedPath}`,
        );
        return uploadedPath;
      }

      console.warn(
        `⚠️ Upload response missing path [${partNumber}/${columnId}/row${rowNum}]:`,
        result,
      );
      return null;
    } catch (err) {
      console.error(
        `❌ Exception uploading graph [${partNumber}/${columnId}/row${rowNum}]:`,
        err,
      );
      return null;
    }
  };

  // ─── PDF: extract table rows ───────────────────────────────────────────────
  // Matches PDF format:
  //   Serial No | Part No | P-LC | Colour | Force [N] | P/F | OP | End date
  //
  // Strategy: parse each data row as a single regex that anchors on the
  // well-known fixed patterns (Serial, P-LC, Force, Date) and captures the
  // free-text fields (Part No, Colour, P/F, OP) in between.
  const extractTableData = async (pdf: any) => {
    const rows: Array<{
      serialNo: string;
      partNo: string;
      plc: string;
      colour: string;
      force: number;
      pf: string;
      op: string;
      endDate: string;
      page: number;
    }> = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Normalise whitespace; keep one space between tokens
      const fullText = textContent.items
        .map((item: any) => item.str.trim())
        .filter(Boolean)
        .join(" ");

      // ── Row regex ────────────────────────────────────────────────────────
      // Anchors:
      //   Serial  : J5L[A-Z0-9]+
      //   P-LC    : (SSS|FT|SS|CL)-\d+
      //   Force   : digits with exactly 2 decimal places
      //   End date: dd-mm-yyyy
      //
      // Free-text captures between anchors:
      //   Part No : one or more word-chars (typically a number like 32453)
      //   Colour  : short uppercase token (NDA, BLK, etc.)
      //   P/F     : Pass | Fail
      //   OP      : operator name (word chars / spaces up to the date)
      const rowRegex =
        /\b(J5L[A-Z0-9]+)\s+(\S+)\s+((?:SSS|FT|SS|CL)-\d+)\s+(\S+)\s+(\d{1,6}(?:\.\d+)?)\s+(Pass|Fail)\s+([\w\s]+?)\s+(\d{2}-\d{2}-\d{4})\b/gi;

      let m: RegExpExecArray | null;
      while ((m = rowRegex.exec(fullText)) !== null) {
        rows.push({
          serialNo: m[1],
          partNo: m[2],
          plc: m[3].toUpperCase(),
          colour: m[4],
          force: parseFloat(m[5]),
          pf: m[6],
          op: m[7].trim(),
          endDate: m[8],
          page: pageNum,
        });
      }

      // ── Fallback: if the row regex matched nothing, try loose extraction ──
      // (handles PDFs where text items are split differently)
      if (rows.filter((r) => r.page === pageNum).length === 0) {
        const serials = [...fullText.matchAll(/\b(J5L[A-Z0-9]+)\b/g)].map(
          (m2) => m2[1],
        );
        const locs = [
          ...fullText.matchAll(/\b(SSS|FT|SS|CL)-?0*(\d+)\b/gi),
        ].map((m2) => `${m2[1].toUpperCase()}-${m2[2].padStart(2, "0")}`);
        const forces = [...fullText.matchAll(/\b(\d{1,5}\.\d{2})\b/g)].map(
          (m2) => parseFloat(m2[1]),
        );
        const partNos = [...fullText.matchAll(/\b(\d{4,6})\b/g)].map(
          (m2) => m2[1],
        );
        const pfList = [...fullText.matchAll(/\b(Pass|Fail)\b/gi)].map(
          (m2) => m2[0],
        );
        const dates = [...fullText.matchAll(/\b(\d{2}-\d{2}-\d{4})\b/g)].map(
          (m2) => m2[1],
        );
        // Colour: short ALLCAPS token that isn't a location prefix or Pass/Fail
        const SKIP = new Set(["SSS", "FT", "SS", "CL", "PASS", "FAIL", "NDA"]);
        const colours = [...fullText.matchAll(/\b([A-Z]{2,5})\b/g)]
          .map((m2) => m2[1])
          .filter(
            (w) => !["SSS", "FT", "SS", "CL", "PASS", "FAIL"].includes(w),
          );
        // OP: word before the date
        const ops = [
          ...fullText.matchAll(
            /\b([A-Za-z][A-Za-z0-9]*(?:\s[A-Z][a-z]+)?)\s+\d{2}-\d{2}-\d{4}/g,
          ),
        ].map((m2) => m2[1].trim());

        const count = Math.max(locs.length, serials.length);
        for (let i = 0; i < count; i++) {
          rows.push({
            serialNo: serials[i] ?? serials[0] ?? "",
            partNo: partNos[i] ?? partNos[0] ?? "",
            plc: locs[i] ?? "",
            colour: colours[i] ?? "",
            force: forces[i] ?? 0,
            pf: pfList[i] ?? "",
            op: ops[i] ?? "",
            endDate: dates[i] ?? "",
            page: pageNum,
          });
        }
      }
    }
    return rows;
  };

  // ─── PDF: convert page image to dataURL ───────────────────────────────────
  const convertImageToDataURL = async (image: any): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        resolve("");
        return;
      }
      const scale = 2;
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (image.data) {
        const tmp = document.createElement("canvas");
        const tc = tmp.getContext("2d");
        if (!tc) {
          resolve("");
          return;
        }
        tmp.width = image.width;
        tmp.height = image.height;
        const id = tc.createImageData(image.width, image.height);
        id.data.set(image.data);
        tc.putImageData(id, 0, 0);
        ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      } else if (image.bitmap) {
        ctx.drawImage(image.bitmap, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL("image/png", 1.0));
    });
  };

  // ─── PDF: extract all embedded images ─────────────────────────────────────
  const extractAllImages = async (pdf: any): Promise<ExtractedGraph[]> => {
    const all: ExtractedGraph[] = [];
    let count = 0;
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setPdfProgress(
        `Extracting images from page ${pageNum}/${pdf.numPages}...`,
      );
      const page = await pdf.getPage(pageNum);
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (
          fn === pdfjsLib.OPS.paintImageXObject ||
          fn === pdfjsLib.OPS.paintInlineImageXObject
        ) {
          const name = ops.argsArray[i][0];
          try {
            const img = await page.objs.get(name);
            if (img) {
              count++;
              all.push({
                id: count,
                page: pageNum,
                dataUrl: await convertImageToDataURL(img),
                name: `graph_${String(count).padStart(2, "0")}`,
              });
            }
          } catch (e) {
            console.warn(`Skipped image "${name}" on page ${pageNum}:`, e);
          }
        }
      }
    }
    return all;
  };

  // ─── PDF upload — MAIN HANDLER ────────────────────────────────────────────
  const handlePDFUpload = async (file: File) => {
    if (pdfProcessingRef.current) return;
    try {
      pdfProcessingRef.current = true;
      setPdfProcessing(true);
      setPdfProgress("Loading PDF...");

      const fileInfo = parseInstronFileName(file.name);
      const fileUrl = URL.createObjectURL(file);
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;

      setPdfProgress(`Processing ${pdf.numPages} pages...`);
      const tableRows = await extractTableData(pdf);
      const images = await extractAllImages(pdf);

      // Pair images with table rows by index — using renamed PDF fields
      const graphsWithMeta: ExtractedGraph[] = images.map((img, idx) => {
        const tableRow = tableRows[idx];
        return {
          ...img,
          serialNo: tableRow?.serialNo, // PDF "Serial No"
          partNo: tableRow?.partNo, // PDF "Part No"
          plc: tableRow?.plc, // PDF "P-LC"
          force: tableRow?.force, // PDF "Force [N]"
          colour: tableRow?.colour, // PDF "Colour"
          op: tableRow?.op, // PDF "OP"
          endDate: tableRow?.endDate, // PDF "End date"
        };
      });
      setExtractedGraphs(graphsWithMeta);

      // Build key→dataUrl mapping using P-LC as location
      const localMapping: Record<
        string,
        {
          dataUrl: string;
          partNumber: string;
          columnId: string;
          rowNum: number;
          meta: InstronRowMeta;
        }
      > = {};
      let skippedCount = 0;

      console.group("📄 PDF Graph Mapping");
      console.log("📋 Table rows extracted:", tableRows);
      console.log("🖼️  Images extracted:", images.length);
      console.log(
        "👥 selectedParts:",
        selectedParts.map((p) => ({
          partNumber: p.partNumber,
          serialNumber: p.serialNumber,
          "Serial No": p["Serial No"],
        })),
      );

      graphsWithMeta.forEach((graph, gIdx) => {
        console.group(
          `  Graph[${gIdx}] → plc="${graph.plc}" serial="${graph.serialNo}" force=${graph.force}`,
        );

        if (!graph.dataUrl) {
          console.warn("  ⛔ Skipped: no dataUrl");
          skippedCount++;
          console.groupEnd();
          return;
        }
        if (!graph.plc) {
          console.warn(
            "  ⛔ Skipped: no P-LC location extracted from PDF table",
          );
          skippedCount++;
          console.groupEnd();
          return;
        }

        const loc = normaliseLocation(graph.plc);
        if (!loc) {
          console.warn(
            `  ⛔ Skipped: normaliseLocation("${graph.plc}") returned null`,
          );
          skippedCount++;
          console.groupEnd();
          return;
        }

        const rowNum = loc.rowNum;
        const colId = prefixToColumnId(loc.prefix);
        console.log(
          `  ✅ Location parsed → prefix="${loc.prefix}" rowNum=${rowNum} colId="${colId}"`,
        );

        const graphSerial = graph.serialNo?.trim() ?? "";

        // ── Try to match PDF serial against selectedParts ─────────────────
        const matchedParts = graphSerial
          ? selectedParts.filter(
              (p) =>
                String(p.partNumber ?? "").trim() === graphSerial ||
                String(p.serialNumber ?? "").trim() === graphSerial ||
                String(p["Serial No"] ?? "").trim() === graphSerial,
            )
          : [];

        console.log(
          `  🔍 Serial match: graphSerial="${graphSerial}" matchedParts=${matchedParts.length}`,
        );

        if (graphSerial && matchedParts.length === 0) {
          // ── KEY FIX: do NOT skip — instead use ALL selectedParts ─────────
          // The PDF serial is the part being tested; it may just not be stored
          // under the same field name. Log clearly and continue.
          console.warn(
            `  ⚠️  Serial "${graphSerial}" not found in selectedParts fields ` +
              `(partNumber / serialNumber / "Serial No"). ` +
              `Falling back to ALL ${selectedParts.length} selectedParts.`,
          );
        }

        // Always assign to parts — use matched if found, else all selectedParts
        const targetParts =
          matchedParts.length > 0 ? matchedParts : selectedParts;
        console.log(
          `  🎯 targetParts: [${targetParts.map((p) => p.partNumber).join(", ")}]`,
        );

        const meta: InstronRowMeta = {
          serialNo: graph.serialNo ?? "",
          partNo: graph.partNo ?? "",
          plc: graph.plc ?? "",
          force: graph.force ?? 0,
          colour: graph.colour ?? "",
          op: graph.op ?? "",
          endDate: graph.endDate ?? "",
        };
        console.log("  📊 meta:", meta);

        targetParts.forEach((part) => {
          const key = `${part.partNumber}-${rowNum}-${colId}`;
          localMapping[key] = {
            dataUrl: graph.dataUrl,
            partNumber: part.partNumber,
            columnId: colId,
            rowNum,
            meta,
          };
          console.log(`  💾 Mapped key: "${key}"`);
        });

        // Also store under the raw PDF serial as an extra fallback key
        if (graphSerial) {
          const serialKey = `${graphSerial}-${rowNum}-${colId}`;
          if (!localMapping[serialKey]) {
            localMapping[serialKey] = {
              dataUrl: graph.dataUrl,
              partNumber: graphSerial,
              columnId: colId,
              rowNum,
              meta,
            };
            console.log(`  💾 Serial fallback key: "${serialKey}"`);
          }
        }

        console.groupEnd();
      });

      console.log("📦 Final localMapping keys:", Object.keys(localMapping));
      console.groupEnd();

      // ── Upload each graph image to backend ────────────────────────────────
      const entries = Object.entries(localMapping);
      const totalToUpload = entries.length;

      console.group("⬆️  Uploading graphs");
      console.log(`Total to upload: ${totalToUpload}`);

      setGraphUploadProgress({ current: 0, total: totalToUpload });
      setPdfProgress(`Uploading ${totalToUpload} graph images to backend...`);

      const finalGraphMapping: Record<string, string> = {};
      const finalMetaMapping: Record<string, InstronRowMeta> = {};
      let uploadedCount = 0;
      let uploadFailedCount = 0;

      for (const [
        key,
        { dataUrl, partNumber, columnId, rowNum, meta },
      ] of entries) {
        console.log(
          `  ⬆️  Uploading key="${key}" partNumber="${partNumber}" col="${columnId}" row=${rowNum}`,
        );

        const uploadedPath = await uploadGraphImageToBackend(
          dataUrl,
          partNumber,
          columnId,
          rowNum,
        );

        if (uploadedPath) {
          const fullUrl = uploadedPath.startsWith("http")
            ? uploadedPath
            : `${BACKEND_API_URL}${uploadedPath}`;
          finalGraphMapping[key] = fullUrl;
          console.log(`  ✅ Uploaded → "${fullUrl}"`);
          uploadedCount++;
        } else {
          finalGraphMapping[key] = dataUrl;
          console.warn(
            `  ⚠️  Upload failed, using dataUrl fallback for key="${key}"`,
          );
          uploadFailedCount++;
        }

        // Always store metadata regardless of upload success
        finalMetaMapping[key] = meta;
        console.log(`  📊 Meta stored for key="${key}":`, meta);

        setGraphUploadProgress({
          current: uploadedCount + uploadFailedCount,
          total: totalToUpload,
        });
        setPdfProgress(
          `Uploaded ${uploadedCount + uploadFailedCount}/${totalToUpload} graphs...`,
        );
      }

      console.log("✅ finalGraphMapping:", Object.keys(finalGraphMapping));
      console.log("✅ finalMetaMapping:", Object.keys(finalMetaMapping));
      console.groupEnd();

      // Merge into state
      console.group("💾 Merging into React state");
      console.log(
        "instronGraphData keys being added:",
        Object.keys(finalGraphMapping),
      );
      console.log(
        "instronRowMeta keys being added:",
        Object.keys(finalMetaMapping),
      );
      setInstronGraphData((prev) => {
        const next = { ...prev, ...finalGraphMapping };
        console.log("✅ instronGraphData after merge:", Object.keys(next));
        return next;
      });
      setInstronRowMeta((prev) => {
        const next = { ...prev, ...finalMetaMapping };
        console.log("✅ instronRowMeta after merge:", Object.keys(next));
        return next;
      });
      console.groupEnd();

      // ── Auto-add instron columns based on the ACTUAL colIds found in the
      // mapped data (derived from P-LC prefix e.g. instron_sidesnapsshear),
      // NOT from the filename (which gave instron_data_format_sss_1).
      // Use the filename label as the display name so user sees "Data Format SSS (1)".
      const uniqueColIds = [
        ...new Set(Object.values(localMapping).map((v) => v.columnId)),
      ];
      console.log(
        "🏷️  Auto-adding columns for colIds:",
        uniqueColIds,
        "| fileInfo:",
        fileInfo,
      );

      uniqueColIds.forEach((colId) => {
        const alreadyExists = customColumns.some((c) => c.id === colId);
        if (!alreadyExists) {
          // Use filename label as display name (more descriptive), but correct id
          const displayLabel =
            colId === fileInfo.columnId
              ? fileInfo.columnLabel // filename matched correctly
              : fileInfo.columnLabel || // still use filename label as description
                colId.replace("instron_", "").replace(/_/g, " ");
          setCustomColumns((prev) => [
            ...prev,
            { id: colId, label: displayLabel, type: "image", options: [] },
          ]);
          console.log(`✅ Column added: id="${colId}" label="${displayLabel}"`);
        } else {
          console.log(`ℹ️  Column already exists: "${colId}"`);
        }
      });

      setPdfProgress("Complete!");
      setGraphUploadProgress(null);
      URL.revokeObjectURL(fileUrl);

      alert(
        `✅ PDF processed: "${file.name}"\n` +
          `Column: "${fileInfo.columnLabel}"\n` +
          `Images extracted: ${images.length} | Table rows: ${tableRows.length}\n` +
          `Uploaded to backend: ${uploadedCount}` +
          (uploadFailedCount > 0
            ? `\n⚠️ ${uploadFailedCount} upload(s) failed (shown from memory this session)`
            : "") +
          (skippedCount > 0
            ? `\n⚠️ ${skippedCount} skipped (serial mismatch / no location)`
            : ""),
      );
    } catch (err) {
      console.error("❌ PDF processing error:", err);
      setGraphUploadProgress(null);
      alert("❌ Failed to process PDF. Please try again.");
    } finally {
      setPdfProcessing(false);
      pdfProcessingRef.current = false;
    }
  };

  // ─── Gallery ──────────────────────────────────────────────────────────────
  const openImageGallery = (partNumber: string) => {
    const images: Array<{ url: string; label: string }> = [];
    if (postCosmeticImages[partNumber])
      images.push({
        url: postCosmeticImages[partNumber],
        label: "Post Cosmetic",
      });
    if (postNonCosmeticImages[partNumber])
      images.push({
        url: postNonCosmeticImages[partNumber],
        label: "Post Non-Cosmetic",
      });
    [
      ...DEFAULT_UTM_REGIONS.clear,
      ...DEFAULT_UTM_REGIONS.foot,
      ...DEFAULT_UTM_REGIONS.sideSnap,
    ].forEach((r) => {
      const img = croppedImages[partNumber]?.[r.label];
      if (img) images.push({ url: img, label: r.label });
    });
    Object.keys(instronGraphData).forEach((key) => {
      if (!key.startsWith(`${partNumber}-`)) return;
      const segments = key.split("-");
      const rowNum = segments[segments.length - 2];
      const colId = segments.slice(segments.length - 1).join("-");
      const col = customColumns.find((c) => c.id === colId);
      images.push({
        url: instronGraphData[key],
        label: col ? `${col.label} Row ${rowNum}` : key,
      });
    });
    getPartCustomImages(partNumber).forEach((img) =>
      images.push({
        url: getImageUrl(img.path),
        label: `Pre-test: ${img.label}`,
      }),
    );
    setGalleryImages(images);
    setCurrentImageIndex(0);
    setShowImageGallery(true);
  };

  const getImageUrl = (p: string) => {
    if (!p) return "";
    if (p.startsWith("http") || p.startsWith("data:")) return p;
    if (p.startsWith("/uploads")) return `${BACKEND_API_URL}${p}`;
    return p;
  };

  const getPartCustomImages = (pn: string): CustomImage[] =>
    chamberData?.parts?.find((p: any) => p.partNumber === pn)?.customImages ||
    [];
  const getAllPartImages = (pn: string) => getPartCustomImages(pn);
  const getImagesByLabel = (pn: string, label: string) =>
    getPartCustomImages(pn)
      .filter((i) => i.label === label)
      .map((i) => getImageUrl(i.path));

  // ── Resolve meta for a given part+row+col.
  // Tries: partNumber key first, then falls back to serial-based key.
  const getInstronMeta = (
    partNumber: string,
    rowNum: number,
    columnId: string,
  ): InstronRowMeta | undefined => {
    const primaryKey = `${partNumber}-${rowNum}-${columnId}`;
    if (instronRowMeta[primaryKey]) {
      console.log(`🔑 getInstronMeta HIT primary key="${primaryKey}"`);
      return instronRowMeta[primaryKey];
    }

    // Fallback: scan for a matching key by rowNum+columnId suffix
    const suffix = `-${rowNum}-${columnId}`;
    const fallbackKey = Object.keys(instronRowMeta).find((k) =>
      k.endsWith(suffix),
    );
    if (fallbackKey) {
      console.log(
        `🔑 getInstronMeta HIT fallback key="${fallbackKey}" (primary was "${primaryKey}")`,
      );
      return instronRowMeta[fallbackKey];
    }

    console.warn(
      `🔑 getInstronMeta MISS — partNumber="${partNumber}" rowNum=${rowNum} colId="${columnId}"\n` +
        `  primaryKey tried: "${primaryKey}"\n` +
        `  suffix tried: "${suffix}"\n` +
        `  available keys: [${Object.keys(instronRowMeta).join(", ")}]`,
    );
    return undefined;
  };

  const updateCustomColumnValue = (
    pn: string,
    rn: number,
    cid: string,
    val: string,
  ) => {
    const key = `${pn}-${rn}-${cid}`;
    setCustomColumnData((prev) => {
      const u = { ...prev };
      if (!val || !val.trim()) delete u[key];
      else u[key] = val;
      return u;
    });
  };

  const handleCustomColumnImageUpload = async (
    pn: string,
    rn: number,
    cid: string,
    file: File,
  ) => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (chamberData?.id) fd.append("chamberLoadId", String(chamberData.id));
      const part = selectedParts.find((p) => p.partNumber === pn);
      if (part?.serialNumber) fd.append("partId", String(part.serialNumber));
      else if (part?.partNumber) fd.append("partId", String(part.partNumber));
      fd.append("imageType", `custom-${cid}`);
      fd.append("checkpointIndex", "0");
      const res = await fetch(`${BACKEND_API_URL}/uploads/part-images`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const result = await res.json();
      if (result?.path) {
        const key = `${pn}-${rn}-${cid}`;
        let existing: string[] = [];
        try {
          existing = JSON.parse(customColumnData[key] || "[]");
        } catch {
          existing = [];
        }
        updateCustomColumnValue(
          pn,
          rn,
          cid,
          JSON.stringify([...existing, result.path]),
        );
      }
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  // ─── Render a cell in the custom/instron columns ──────────────────────────
  const renderCustomColumnCell = (
    part: any,
    rowNum: number,
    column: CustomColumn,
  ) => {
    const key = `${part.partNumber}-${rowNum}-${column.id}`;
    const value = customColumnData[key] || "";

    if (column.id.startsWith("instron_")) {
      const graphData = instronGraphData[key];

      console.log(
        `🖼️  renderCell instron | part="${part.partNumber}" row=${rowNum} col="${column.id}"\n` +
          `   key="${key}"\n` +
          `   graphData=${graphData ? "✅ found" : "❌ missing"}\n` +
          `   instronGraphData keys: [${Object.keys(instronGraphData).join(", ")}]`,
      );

      // Build location label from column type
      const prefix =
        column.id === "instron_foot"
          ? "FT"
          : column.id === "instron_sidesnap"
            ? "SS"
            : column.id === "instron_cleat"
              ? "CL"
              : column.id === "instron_sidesnapsshear"
                ? "SSS"
                : "";
      const locationLabel = prefix
        ? `${prefix}-${String(rowNum).padStart(2, "0")}`
        : `Row ${rowNum}`;

      return (
        <div className="flex flex-col items-center gap-1">
          {/* Graph image only — metadata shown in separate dedicated columns */}
          {graphData ? (
            <div className="relative group">
              <img
                src={graphData}
                alt={`${column.label} ${locationLabel}`}
                className="w-48 h-48 object-contain border-2 border-purple-500 rounded hover:border-purple-700 transition-all hover:shadow-lg"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
              />
            </div>
          ) : (
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-gray-50">
              <ImageIcon size={32} className="text-gray-300 mb-1" />
              <span className="text-xs text-gray-400">No graph</span>
              <span className="text-[10px] text-gray-300 mt-0.5">
                Upload PDF above
              </span>
            </div>
          )}
          <span className="text-[10px] text-purple-500 font-semibold">
            {locationLabel}
          </span>
        </div>
      );
    }

    const existingImages =
      column.type === "image"
        ? getImagesByLabel(part.partNumber, column.label)
        : [];
    let uploadedImages: string[] = [];
    if (column.type === "image" && value) {
      try {
        const p = JSON.parse(value);
        if (Array.isArray(p))
          uploadedImages = p.map((x) =>
            x.startsWith("/") ? `${BACKEND_API_URL}${x}` : x,
          );
      } catch {
        /* ok */
      }
    }

    switch (column.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              updateCustomColumnValue(
                part.partNumber,
                rowNum,
                column.id,
                e.target.value,
              )
            }
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Enter text"
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              updateCustomColumnValue(
                part.partNumber,
                rowNum,
                column.id,
                e.target.value,
              )
            }
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0"
          />
        );
      case "dropdown":
        return (
          <select
            value={value}
            onChange={(e) =>
              updateCustomColumnValue(
                part.partNumber,
                rowNum,
                column.id,
                e.target.value,
              )
            }
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select...</option>
            {column.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "image":
        return (
          <div className="flex flex-col items-center">
            <label className="cursor-pointer px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center mb-2">
              <ImageIcon size={14} className="mr-1" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    handleCustomColumnImageUpload(
                      part.partNumber,
                      rowNum,
                      column.id,
                      f,
                    );
                }}
              />
            </label>
            {uploadedImages.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Uploaded:</p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {uploadedImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`${i + 1}`}
                        className="w-12 h-12 object-cover border-2 border-blue-300 rounded cursor-pointer"
                        onClick={() => window.open(src, "_blank")}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {existingImages.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">From pre-test:</p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {existingImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`${i + 1}`}
                        className="w-10 h-10 object-cover border border-gray-300 rounded cursor-pointer"
                        onClick={() => window.open(src, "_blank")}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleRemovePostCosmetic = (pn: string) =>
    setPostCosmeticImages((p) => {
      const u = { ...p };
      delete u[pn];
      return u;
    });

  const handleRemovePostNonCosmetic = (pn: string) => {
    setPostNonCosmeticImages((p) => {
      const u = { ...p };
      delete u[pn];
      return u;
    });
    setCroppedImages((p) => {
      const u = { ...p };
      delete u[pn];
      return u;
    });
    setPartRegions((p) => {
      const u = { ...p };
      delete u[pn];
      return u;
    });
    setPendingImages((p) => {
      const u = { ...p };
      delete u[pn];
      return u;
    });
  };

  const handlePostCosmeticUpload = (pn: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      setPostCosmeticImages((prev) => ({
        ...prev,
        [pn]: e.target?.result as string,
      }));
    reader.readAsDataURL(file);
  };

  const handlePostNonCosmeticUpload = (pn: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setPendingImages((prev) => ({ ...prev, [pn]: data }));
      setCurrentAdjustingPart(pn);
      setTempImage(data);
      const regs = partRegions[pn] || [
        ...DEFAULT_UTM_REGIONS.clear,
        ...DEFAULT_UTM_REGIONS.foot,
        ...DEFAULT_UTM_REGIONS.sideSnap,
      ];
      setAdjustableRegions(JSON.parse(JSON.stringify(regs)));
      setSelectedRegion(null);
      setImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setShowCropAdjuster(true);
      };
      img.src = data;
    };
    reader.onerror = () => alert("Failed to read image");
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async () => {
    if (!tempImage || !currentAdjustingPart) return;
    setProcessing(true);
    setShowCropAdjuster(false);
    try {
      setPartRegions((prev) => ({
        ...prev,
        [currentAdjustingPart]: JSON.parse(JSON.stringify(adjustableRegions)),
      }));
      setPostNonCosmeticImages((prev) => ({
        ...prev,
        [currentAdjustingPart]: tempImage,
      }));
      await cropWithCanvas(currentAdjustingPart, tempImage, adjustableRegions);
      setPendingImages((prev) => {
        const u = { ...prev };
        delete u[currentAdjustingPart];
        return u;
      });
      alert(`✅ Cropped successfully for ${currentAdjustingPart}`);
    } catch {
      alert("❌ Failed to crop image");
    } finally {
      setProcessing(false);
      setTempImage("");
      setCurrentAdjustingPart("");
      setAdjustableRegions([]);
      setSelectedRegion(null);
      setImageLoaded(false);
    }
  };

  const handleCancelCrop = () => {
    if (currentAdjustingPart)
      setPendingImages((p) => {
        const u = { ...p };
        delete u[currentAdjustingPart];
        return u;
      });
    setShowCropAdjuster(false);
    setTempImage("");
    setCurrentAdjustingPart("");
    setAdjustableRegions([]);
    setSelectedRegion(null);
    setImageLoaded(false);
  };

  const cropImageWithCanvas = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): string => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("No ctx");
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    return c.toDataURL("image/png", 1.0);
  };

  const cropWithCanvas = (
    pn: string,
    imageData: string,
    regions: CropRegion[],
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const sx = img.width / 480,
            sy = img.height / 320;
          const result: Record<string, string> = {};
          regions.forEach((r) => {
            try {
              const x = Math.round(r.x * sx),
                y = Math.round(r.y * sy);
              const w = Math.round(r.width * sx),
                h = Math.round(r.height * sy);
              if (w <= 0 || h <= 0) return;
              result[r.label] = cropImageWithCanvas(
                img,
                Math.max(0, Math.min(x, img.width - 1)),
                Math.max(0, Math.min(y, img.height - 1)),
                Math.min(w, img.width - x),
                Math.min(h, img.height - y),
              );
            } catch (e) {
              console.error(`Crop error ${r.label}`, e);
            }
          });
          setCroppedImages((prev) => ({ ...prev, [pn]: result }));
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = imageData;
    });

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      alert("Enter a column name");
      return;
    }
    if (newColumnType === "dropdown" && !dropdownOptions.length) {
      alert("Add at least one option");
      return;
    }
    setCustomColumns((prev) => [
      ...prev,
      {
        id: newColumnName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
        label: newColumnName.trim(),
        type: newColumnType,
        options: newColumnType === "dropdown" ? dropdownOptions : undefined,
      },
    ]);
    setShowAddColumnModal(false);
    setNewColumnName("");
    setNewColumnType("text");
    setDropdownOptions([]);
    setNewOption("");
  };

  const handleRemoveColumn = (columnId: string) => {
    const hasGraphData = Object.keys(instronGraphData).some((k) =>
      k.includes(`-${columnId}`),
    );
    if (
      hasGraphData &&
      !window.confirm("This column has loaded graph data. Remove anyway?")
    )
      return;
    setCustomColumns((prev) => prev.filter((c) => c.id !== columnId));
    const cleanCols = { ...customColumnData };
    Object.keys(cleanCols).forEach((k) => {
      if (k.includes(`-${columnId}`)) delete cleanCols[k];
    });
    setCustomColumnData(cleanCols);
    setInstronGraphData((prev) => {
      const u = { ...prev };
      Object.keys(u).forEach((k) => {
        if (k.includes(`-${columnId}`)) delete u[k];
      });
      return u;
    });
    setInstronRowMeta((prev) => {
      const u = { ...prev };
      Object.keys(u).forEach((k) => {
        if (k.includes(`-${columnId}`)) delete u[k];
      });
      return u;
    });
  };

  const uniqueParts = Array.isArray(selectedParts)
    ? selectedParts.reduce((acc, p) => {
        if (!acc.find((x: any) => x.partNumber === p.partNumber)) acc.push(p);
        return acc;
      }, [] as any[])
    : [];

  if (!Array.isArray(selectedParts) || !selectedParts.length) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No parts available for unload
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Crop Adjuster Modal */}
      {showCropAdjuster && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">
                  Adjust Crop Regions — {currentAdjustingPart}
                  {partRegions[currentAdjustingPart] && (
                    <span className="ml-3 text-sm text-green-600 font-normal">
                      (Previously adjusted)
                    </span>
                  )}
                </h3>
                <button
                  onClick={handleCancelCrop}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-start">
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> Click region (turns red) →
                    drag to move. Use +/- to resize.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Note:</strong> Coordinates saved to database.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAdjustableRegions(
                      JSON.parse(
                        JSON.stringify([
                          ...DEFAULT_UTM_REGIONS.clear,
                          ...DEFAULT_UTM_REGIONS.foot,
                          ...DEFAULT_UTM_REGIONS.sideSnap,
                        ]),
                      ),
                    );
                    setSelectedRegion(null);
                  }}
                  className="ml-4 px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 whitespace-nowrap"
                >
                  Reset to Default
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <div className="border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100 p-4">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="max-w-full cursor-crosshair shadow-lg"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                  </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                    <h4 className="font-bold mb-3 text-gray-700">
                      Selected Region
                    </h4>
                    {selectedRegion !== null ? (
                      <div className="space-y-3">
                        <div className="bg-white p-2 rounded border">
                          <p className="text-sm font-bold text-blue-600">
                            {adjustableRegions[selectedRegion].label}
                          </p>
                        </div>
                        {(["width", "height"] as const).map((dim) => (
                          <div key={dim}>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              {dim.charAt(0).toUpperCase() + dim.slice(1)}:{" "}
                              {adjustableRegions[selectedRegion][dim].toFixed(
                                0,
                              )}
                              px
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResizeRegion(-5, dim)}
                                className="flex-1 px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                              >
                                -5
                              </button>
                              <button
                                onClick={() => handleResizeRegion(5, dim)}
                                className="flex-1 px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500">
                            X: {adjustableRegions[selectedRegion].x.toFixed(0)},
                            Y: {adjustableRegions[selectedRegion].y.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Click a region to select it
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 max-h-96 overflow-y-auto">
                    <h4 className="font-bold mb-2 text-gray-700">
                      All Regions
                    </h4>
                    <div className="space-y-1">
                      {adjustableRegions.map((r, i) => (
                        <button
                          key={r.label}
                          onClick={() => setSelectedRegion(i)}
                          className={`w-full text-left px-3 py-2 rounded text-sm ${selectedRegion === i ? "bg-red-500 text-white font-bold" : "bg-white hover:bg-gray-100"}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleConfirmCrop}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg flex items-center justify-center gap-2"
                >
                  <Check size={20} /> OK — Confirm & Save
                </button>
                <button
                  onClick={handleCancelCrop}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold text-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <button
              onClick={() => setShowImageGallery(false)}
              className="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 rounded-full p-2"
            >
              <X size={24} />
            </button>
            <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded">
              {currentImageIndex + 1} / {galleryImages.length}
            </div>
            <div className="flex-1 flex items-center justify-center">
              {galleryImages[currentImageIndex] && (
                <div className="max-w-4xl max-h-[80vh] flex flex-col items-center">
                  <img
                    src={galleryImages[currentImageIndex].url}
                    alt={galleryImages[currentImageIndex].label}
                    className="max-w-full max-h-full object-contain"
                  />
                  <p className="text-white mt-4 text-lg font-semibold">
                    {galleryImages[currentImageIndex].label}
                  </p>
                </div>
              )}
            </div>
            <div className="absolute bottom-4 flex gap-4">
              <button
                onClick={() => setCurrentImageIndex((p) => Math.max(0, p - 1))}
                disabled={currentImageIndex === 0}
                className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 disabled:opacity-50"
              >
                ← Previous
              </button>
              <button
                onClick={() =>
                  setCurrentImageIndex((p) =>
                    Math.min(galleryImages.length - 1, p + 1),
                  )
                }
                disabled={currentImageIndex === galleryImages.length - 1}
                className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
            <div className="absolute bottom-20 flex gap-2 overflow-x-auto max-w-full px-4">
              {galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img.url}
                  alt={img.label}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-16 h-16 object-cover cursor-pointer border-2 ${idx === currentImageIndex ? "border-blue-500" : "border-white"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="max-w-full mx-auto mb-4 flex gap-4 items-center flex-wrap">
        <button
          onClick={() => setShowAddColumnModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> Add Custom Column
        </button>
        <div className="relative">
          <label
            className={`cursor-pointer px-4 py-2 text-white rounded flex items-center gap-2 font-medium ${pdfProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            <FileUp size={18} />
            {pdfProcessing ? "Processing PDF..." : "Upload Instron PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={pdfProcessing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && !pdfProcessing) handlePDFUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* PDF extraction progress */}
        {pdfProcessing && !graphUploadProgress && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin" />
            <span>{pdfProgress}</span>
          </div>
        )}

        {/* Graph upload progress bar */}
        {graphUploadProgress && (
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-purple-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-700">
                Saving graphs to DB: {graphUploadProgress.current}/
                {graphUploadProgress.total}
              </span>
              <div className="w-48 h-2 bg-purple-100 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${graphUploadProgress.total > 0 ? (graphUploadProgress.current / graphUploadProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {extractedGraphs.length > 0 &&
          !pdfProcessing &&
          !graphUploadProgress && (
            <div className="text-sm text-green-600 font-medium">
              ✅ {extractedGraphs.length} graphs extracted &amp; saved to DB
            </div>
          )}

        <span className="text-xs text-gray-400 italic">
          Filename keywords:{" "}
          <span className="text-purple-500">Footpush/FT</span> → Foot Push
          &nbsp;|&nbsp;
          <span className="text-purple-500">SS</span> → Side Snap &nbsp;|&nbsp;
          <span className="text-purple-500">CL</span> → Cleat &nbsp;|&nbsp;
          <span className="text-purple-500">SSS</span> → Side Snap Shear
        </span>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add Custom Column</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Column Type
                </label>
                <select
                  value={newColumnType}
                  onChange={(e) => {
                    setNewColumnType(e.target.value as any);
                    if (e.target.value !== "dropdown") setDropdownOptions([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="image">Image</option>
                </select>
              </div>
              {newColumnType === "dropdown" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Dropdown Options
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (() => {
                          if (
                            newOption.trim() &&
                            !dropdownOptions.includes(newOption.trim())
                          ) {
                            setDropdownOptions((p) => [...p, newOption.trim()]);
                            setNewOption("");
                          }
                        })()
                      }
                      placeholder="Add option"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={() => {
                        if (
                          newOption.trim() &&
                          !dropdownOptions.includes(newOption.trim())
                        ) {
                          setDropdownOptions((p) => [...p, newOption.trim()]);
                          setNewOption("");
                        }
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dropdownOptions.map((o) => (
                      <div
                        key={o}
                        className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                      >
                        <span className="text-sm">{o}</span>
                        <button
                          onClick={() =>
                            setDropdownOptions((p) => p.filter((x) => x !== o))
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddColumn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Add Column
              </button>
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName("");
                  setNewColumnType("text");
                  setDropdownOptions([]);
                  setNewOption("");
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Images Modal */}
      {showPreImagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Pre-Test Images — Part {selectedPartForModal}
              </h3>
              <button
                onClick={() => setShowPreImagesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {getAllPartImages(selectedPartForModal).map(
                (img: CustomImage, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(img.path)}
                      alt={img.label}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2 text-center bg-gray-100">
                      <span className="text-sm font-medium">{img.label}</span>
                      {img.uploadedAt && (
                        <p className="text-xs text-gray-500">
                          {new Date(img.uploadedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowPreImagesModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parts Table */}
      <div className="max-w-full mx-auto space-y-8">
        {uniqueParts.map((part) => {
          const postCosmetic = postCosmeticImages[part.partNumber];
          const postNonCosmetic = postNonCosmeticImages[part.partNumber];
          const partCroppedImages = croppedImages[part.partNumber] || {};
          const partCustomImages = getPartCustomImages(part.partNumber);
          const savedRegions = partRegions[part.partNumber];
          const instronLoadedCount = Object.keys(instronGraphData).filter((k) =>
            k.startsWith(`${part.partNumber}-`),
          ).length;

          return (
            <div key={part.partNumber} className="space-y-4">
              <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">{part.partNumber}</h2>
                  <div className="flex gap-4 mt-1 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span>Pre Images: {partCustomImages.length}</span>
                    </div>
                    {savedRegions && (
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                        <span>Custom crop ({savedRegions.length} regions)</span>
                      </div>
                    )}
                    {postNonCosmetic &&
                      Object.keys(partCroppedImages).length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                          <span>
                            Cropped: {Object.keys(partCroppedImages).length}
                          </span>
                        </div>
                      )}
                    {instronLoadedCount > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                        <span>📊 {instronLoadedCount} graphs in DB</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openImageGallery(part.partNumber)}
                  className="px-4 py-2 bg-white text-red-600 rounded hover:bg-gray-100 flex items-center gap-2 font-medium"
                >
                  <Eye size={18} /> View All Images
                </button>
              </div>

              <div className="bg-white rounded-b-xl shadow-md border-2 border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-400">
                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">
                          Row #
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-green-700 uppercase border-r border-gray-300 bg-green-50">
                          Post Cosmetic
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 bg-blue-50">
                          Post Non-Cosmetic
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Clear
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Foot
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Side Snap
                        </th>
                        {customColumns.map((col) => (
                          <th
                            key={col.id}
                            className={`px-4 py-4 text-center text-xs font-bold uppercase border-r border-gray-300 relative group ${col.id.startsWith("instron_") ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-700"}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="flex-1 text-center">
                                {col.label}
                              </span>
                              <button
                                onClick={() => handleRemoveColumn(col.id)}
                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <span className="text-[10px] font-normal text-gray-400">
                              ({col.type})
                            </span>
                          </th>
                        ))}
                        {/* ── PDF metadata columns — shown only when any instron col exists ── */}
                        {customColumns.some((c) =>
                          c.id.startsWith("instron_"),
                        ) && (
                          <>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              Part No
                            </th>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              P-LC
                            </th>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              Force [N]
                            </th>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              Colour
                            </th>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              OP
                            </th>
                            <th className="px-3 py-4 text-center text-xs font-bold text-teal-700 uppercase border-r border-gray-300 bg-teal-50 whitespace-nowrap">
                              End Date
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[1, 2, 3, 4].map((rowNum, idx) => {
                        const clearImg = partCroppedImages[`CL-${rowNum}`];
                        const footImg = partCroppedImages[`FT-${rowNum}`];
                        const ssImg = partCroppedImages[`SS-${rowNum}`];
                        return (
                          <tr
                            key={rowNum}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="px-4 py-4 border-r border-gray-300 text-center font-bold text-sm text-gray-800">
                              {rowNum}
                            </td>

                            {/* Post Cosmetic */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {rowNum === 1 ? (
                                postCosmetic ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img
                                      src={postCosmetic}
                                      alt="Post Cosmetic"
                                      className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg cursor-pointer"
                                      onClick={() =>
                                        window.open(postCosmetic, "_blank")
                                      }
                                    />
                                    <button
                                      onClick={() =>
                                        handleRemovePostCosmetic(
                                          part.partNumber,
                                        )
                                      }
                                      className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
                                    >
                                      <X size={12} /> Remove
                                    </button>
                                  </div>
                                ) : (
                                  <label className="inline-flex items-center cursor-pointer px-4 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                                    <Upload size={14} className="mr-1" /> Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f)
                                          handlePostCosmeticUpload(
                                            part.partNumber,
                                            f,
                                          );
                                      }}
                                    />
                                  </label>
                                )
                              ) : postCosmetic ? (
                                <img
                                  src={postCosmetic}
                                  alt="Post Cosmetic"
                                  className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg"
                                />
                              ) : null}
                            </td>

                            {/* Post Non-Cosmetic */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {rowNum === 1 ? (
                                postNonCosmetic ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img
                                      src={postNonCosmetic}
                                      alt="Post Non-Cosmetic"
                                      className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg cursor-pointer"
                                      onClick={() =>
                                        window.open(postNonCosmetic, "_blank")
                                      }
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        disabled={processing}
                                        onClick={() => {
                                          setCurrentAdjustingPart(
                                            part.partNumber,
                                          );
                                          setTempImage(postNonCosmetic);
                                          const regs = partRegions[
                                            part.partNumber
                                          ] || [
                                            ...DEFAULT_UTM_REGIONS.clear,
                                            ...DEFAULT_UTM_REGIONS.foot,
                                            ...DEFAULT_UTM_REGIONS.sideSnap,
                                          ];
                                          setAdjustableRegions(
                                            JSON.parse(JSON.stringify(regs)),
                                          );
                                          setSelectedRegion(null);
                                          setImageLoaded(false);
                                          const img2 = new Image();
                                          img2.onload = () => {
                                            setImageLoaded(true);
                                            setShowCropAdjuster(true);
                                          };
                                          img2.src = postNonCosmetic;
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                                      >
                                        <Move size={12} /> Adjust
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleRemovePostNonCosmetic(
                                            part.partNumber,
                                          )
                                        }
                                        disabled={processing}
                                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
                                      >
                                        <X size={12} /> Remove
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label
                                    className={`inline-flex items-center cursor-pointer px-4 py-2 text-white text-xs rounded ${processing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                                  >
                                    {processing ? (
                                      <>
                                        <Loader2
                                          size={14}
                                          className="mr-1 animate-spin"
                                        />{" "}
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <Upload size={14} className="mr-1" />{" "}
                                        Upload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={processing}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f)
                                          handlePostNonCosmeticUpload(
                                            part.partNumber,
                                            f,
                                          );
                                      }}
                                    />
                                  </label>
                                )
                              ) : postNonCosmetic ? (
                                <img
                                  src={postNonCosmetic}
                                  alt="Post Non-Cosmetic"
                                  className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg"
                                />
                              ) : null}
                            </td>

                            {/* Clear */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {clearImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={clearImg}
                                    alt={`CL-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() =>
                                      window.open(clearImg, "_blank")
                                    }
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    CL-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  CL-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Foot */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {footImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={footImg}
                                    alt={`FT-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() =>
                                      window.open(footImg, "_blank")
                                    }
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    FT-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  FT-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Side Snap */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {ssImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={ssImg}
                                    alt={`SS-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() => window.open(ssImg, "_blank")}
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    SS-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  SS-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Custom Columns */}
                            {customColumns.map((col) => (
                              <td
                                key={col.id}
                                className="px-4 py-4 border-r border-gray-300 text-center"
                              >
                                {renderCustomColumnCell(part, rowNum, col)}
                              </td>
                            ))}

                            {/* ── PDF Metadata cells — one row per instron location ── */}
                            {customColumns.some((c) =>
                              c.id.startsWith("instron_"),
                            ) &&
                              (() => {
                                // Find the first instron column that has meta for this row
                                const instronCol = customColumns.find((c) =>
                                  c.id.startsWith("instron_"),
                                );
                                const meta = instronCol
                                  ? getInstronMeta(
                                      part.partNumber,
                                      rowNum,
                                      instronCol.id,
                                    )
                                  : undefined;

                                console.log(
                                  `📊 MetaCell | part="${part.partNumber}" row=${rowNum} instronCol="${instronCol?.id}"\n` +
                                    `   meta=${meta ? "✅ found" : "❌ missing"}\n` +
                                    `   instronRowMeta keys: [${Object.keys(instronRowMeta).join(", ")}]`,
                                );

                                const cellCls =
                                  "px-3 py-4 border-r border-gray-300 text-center text-xs text-gray-800 bg-teal-50";
                                const emptyVal = (
                                  <span className="text-gray-300">—</span>
                                );

                                return (
                                  <>
                                    <td className={cellCls}>
                                      {meta?.partNo || emptyVal}
                                    </td>
                                    <td className={cellCls}>
                                      {meta?.plc ? (
                                        <span className="font-semibold text-teal-700">
                                          {meta.plc}
                                        </span>
                                      ) : (
                                        emptyVal
                                      )}
                                    </td>
                                    <td className={cellCls}>
                                      {meta?.force != null && meta.force > 0 ? (
                                        <span className="font-mono font-bold text-teal-800">
                                          {meta.force.toFixed(2)}
                                        </span>
                                      ) : (
                                        emptyVal
                                      )}
                                    </td>
                                    <td className={cellCls}>
                                      {meta?.colour || emptyVal}
                                    </td>
                                    <td className={cellCls}>
                                      {meta?.op || emptyVal}
                                    </td>
                                    <td className={cellCls}>
                                      {meta?.endDate || emptyVal}
                                    </td>
                                  </>
                                );
                              })()}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UTMImageCropper;
