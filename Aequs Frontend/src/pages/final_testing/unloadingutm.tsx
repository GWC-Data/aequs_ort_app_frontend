// import React, { useCallback, useState } from "react";
// import UTMImageCropper from "../../components/UTMImageCropper";
// import { getBackendApiUrl } from "../../lib/backendApi";
// import { useNavigate } from "react-router-dom";

// interface UnloadWithUTMProps {
//   onBack: () => void;
//   onSubmit: (updatedParts: any[], utmMetadata?: any) => Promise<void>;
//   chamberData: any;
//   partsToShow: any[];
// }

// const UnloadWithUTM: React.FC<UnloadWithUTMProps> = ({
//   onBack,
//   onSubmit,
//   chamberData,
//   partsToShow,
// }) => {
//   const handleUTMDataChange = useCallback((data: any) => {
//     setUtmData(data);
//   }, []);

//   const [utmFormData, setUtmFormData] = useState({
//     rows: [],
//     customColumns: [],
//   });
//   const [utmData, setUtmData] = useState<any>(null);
//   const [selectedOption, setSelectedOption] = useState<string>("");
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState<
//     Record<string, { uploaded: number; total: number }>
//   >({});
//   const navigate = useNavigate();

//   const updateRowField = (rowId: number, field: string, value: string) => {
//     setUtmFormData((prev) => ({
//       ...prev,
//       rows: prev.rows.map((row: any) =>
//         row.id === rowId ? { ...row, [field]: value } : row,
//       ),
//     }));
//   };

//   const uploadImageToBackend = async (
//     imageData: string,
//     partNumber: string,
//     serialNumber: string,
//     imageType: "postCosmetic" | "postNonCosmetic",
//     checkpointIndex: number,
//   ): Promise<string> => {
//     try {
//       const base64Response = await fetch(imageData);
//       const blob = await base64Response.blob();
//       const filename = `${partNumber}_${imageType}_${Date.now()}.png`;
//       const file = new File([blob], filename, { type: "image/png" });

//       const formData = new FormData();
//       formData.append("image", file);
//       if (chamberData?.id)
//         formData.append("chamberLoadId", String(chamberData.id));

//       const part = partsToShow.find((p) => p.partNumber === partNumber);
//       if (part?.serialNumber)
//         formData.append("partId", String(part.serialNumber));
//       else if (part?.partNumber)
//         formData.append("partId", String(part.partNumber));

//       const backendImageType =
//         imageType === "postCosmetic" ? "cosmetic" : "nonCosmetic";
//       formData.append("imageType", backendImageType);
//       formData.append("checkpointIndex", String(checkpointIndex));

//       const response = await fetch(
//         `${getBackendApiUrl()}/uploads/part-images`,
//         {
//           method: "POST",
//           body: formData,
//         },
//       );

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(
//           `Upload failed with status: ${response.status} - ${JSON.stringify(errorData)}`,
//         );
//       }

//       const result = await response.json();
//       if (result?.path) return result.path;
//       throw new Error("Upload response missing path");
//     } catch (error) {
//       console.error(
//         `❌ Error uploading ${imageType} for ${partNumber}:`,
//         error,
//       );
//       throw error;
//     }
//   };

//   // ─── Main submit handler ───────────────────────────────────────────────────
//   const handleUTMSubmit = async () => {
//     if (!utmData) {
//       alert("Please wait for UTM data to load");
//       return;
//     }

//     const {
//       postCosmeticImages,
//       postNonCosmeticImages,
//       customColumns,
//       customColumnData,
//       cropRegionsData,
//       instronGraphData,   // backend paths  keyed "{partNumber}-{rowNum}-{columnId}"
//       instronRowMeta,     // ← NEW: PDF metadata keyed "{partNumber}-{rowNum}-{columnId}"
//     } = utmData;

//     // Validate required images
//     const missingImages: string[] = [];
//     for (const part of partsToShow) {
//       if (!postCosmeticImages[part.partNumber])
//         missingImages.push(`${part.partNumber} - Missing Post-Cosmetic Image`);
//       if (!postNonCosmeticImages[part.partNumber])
//         missingImages.push(
//           `${part.partNumber} - Missing Post-Non-Cosmetic Image`,
//         );
//     }
//     if (missingImages.length > 0) {
//       alert(`Please upload required images:\n\n${missingImages.join("\n")}`);
//       return;
//     }

//     try {
//       setIsUploading(true);
//       const updatedParts = [];

//       for (let i = 0; i < partsToShow.length; i++) {
//         const part = partsToShow[i];
//         const { partNumber, serialNumber } = part;

//         const checkpoints = part.checkpointInfo?.checkpoints || [];
//         const hasNoCheckpoints =
//           checkpoints.length === 0 ||
//           (checkpoints.length === 1 && checkpoints[0] === 0);
//         const finalCheckpointIndex = hasNoCheckpoints
//           ? 0
//           : Math.max(checkpoints.length - 1, 0);
//         const finalCheckpointValue = hasNoCheckpoints
//           ? part.testValue || 0
//           : checkpoints[finalCheckpointIndex];

//         setUploadProgress((prev) => ({
//           ...prev,
//           [partNumber]: { uploaded: 0, total: 2 },
//         }));

//         // Upload post-cosmetic
//         let postCosmeticPath = "";
//         if (postCosmeticImages[partNumber]) {
//           try {
//             postCosmeticPath = await uploadImageToBackend(
//               postCosmeticImages[partNumber],
//               partNumber,
//               serialNumber,
//               "postCosmetic",
//               finalCheckpointIndex,
//             );
//             setUploadProgress((prev) => ({
//               ...prev,
//               [partNumber]: { uploaded: 1, total: 2 },
//             }));
//           } catch (e) {
//             console.error(
//               `Failed to upload post-cosmetic for ${partNumber}:`,
//               e,
//             );
//           }
//         }

//         // Upload post-non-cosmetic
//         let postNonCosmeticPath = "";
//         if (postNonCosmeticImages[partNumber]) {
//           try {
//             postNonCosmeticPath = await uploadImageToBackend(
//               postNonCosmeticImages[partNumber],
//               partNumber,
//               serialNumber,
//               "postNonCosmetic",
//               finalCheckpointIndex,
//             );
//             setUploadProgress((prev) => ({
//               ...prev,
//               [partNumber]: { uploaded: 2, total: 2 },
//             }));
//           } catch (e) {
//             console.error(
//               `Failed to upload post-non-cosmetic for ${partNumber}:`,
//               e,
//             );
//           }
//         }

//         // ── Build customData ───────────────────────────────────────────────
//         const finalCustomData: Record<string, string> = {};

//         // Standard image paths
//         finalCustomData["cosmetic"] = JSON.stringify(
//           postCosmeticPath ? [postCosmeticPath] : [],
//         );
//         finalCustomData["nonCosmetic"] = JSON.stringify(
//           postNonCosmeticPath ? [postNonCosmeticPath] : [],
//         );
//         finalCustomData["selectedOption"] = selectedOption;

//         // Crop region coordinates
//         if (cropRegionsData?.[partNumber]) {
//           finalCustomData["cropRegions"] = JSON.stringify(
//             cropRegionsData[partNumber],
//           );
//         }

//         // ── Persist instron graph paths per column ─────────────────────────
//         // Stored as: customData["instron_foot"] = '["/uploads/...", "", "/uploads/...", ""]'
//         // Index 0 = row 1, index 1 = row 2, ... index 3 = row 4
//         if (instronGraphData && typeof instronGraphData === "object") {
//           // Collect all instron columnIds that have data for this part.
//           // Keys look like: "{partNumber}-{rowNum}-{columnId}"
//           // Since partNumber can contain dashes, we strip the known prefix.
//           const columnIds = new Set<string>();
//           Object.keys(instronGraphData).forEach((key) => {
//             if (!key.startsWith(`${partNumber}-`)) return;
//             const afterPart = key.slice(partNumber.length + 1); // "1-instron_foot"
//             const dashIdx  = afterPart.indexOf("-");
//             if (dashIdx === -1) return;
//             const colId = afterPart.slice(dashIdx + 1);          // "instron_foot"
//             if (colId.startsWith("instron_")) columnIds.add(colId);
//           });

//           columnIds.forEach((colId) => {
//             const paths: string[] = [];
//             for (let rowNum = 1; rowNum <= 4; rowNum++) {
//               const key   = `${partNumber}-${rowNum}-${colId}`;
//               const value = instronGraphData[key] || "";

//               if (value && !value.startsWith("data:")) {
//                 // Convert full URL → relative path for DB storage
//                 let relativePath = value;
//                 const backendUrl = getBackendApiUrl();
//                 if (relativePath.startsWith(backendUrl)) {
//                   relativePath = relativePath.slice(backendUrl.length);
//                 }
//                 paths.push(relativePath);
//               } else if (value.startsWith("data:")) {
//                 console.warn(
//                   `⚠️ Row ${rowNum} of ${colId} for ${partNumber} is still a dataUrl — skipping`,
//                 );
//                 paths.push("");
//               } else {
//                 paths.push("");
//               }
//             }

//             if (paths.some((p) => p !== "")) {
//               finalCustomData[colId] = JSON.stringify(paths);
//               console.log(`✅ Graph paths stored [${colId}] for ${partNumber}:`, paths);
//             }
//           });
//         }

//         // ── NEW: Persist PDF extracted metadata per column ─────────────────
//         // instronRowMeta keys: "{partNumber}-{rowNum}-{columnId}"
//         // For each instron column, we store a JSON array (rows 1-4) of the
//         // metadata objects so the backend has all PDF values.
//         //
//         // Stored as:
//         //   customData["instron_sidesnapsshear_meta"] = JSON.stringify([
//         //     { serialNo, partNo, plc, force, colour, op, endDate },  // row 1
//         //     null,   // row 2 — no data
//         //     null,   // row 3
//         //     null,   // row 4
//         //   ])
//         if (instronRowMeta && typeof instronRowMeta === "object") {
//           // Collect all instron columnIds that have meta for this part
//           const metaColumnIds = new Set<string>();
//           Object.keys(instronRowMeta).forEach((key) => {
//             // Primary key uses partNumber; fallback keys use raw PDF serial.
//             // Accept both since either may be present.
//             const afterPart = key.startsWith(`${partNumber}-`)
//               ? key.slice(partNumber.length + 1)
//               : null;

//             if (afterPart) {
//               const dashIdx = afterPart.indexOf("-");
//               if (dashIdx === -1) return;
//               const colId = afterPart.slice(dashIdx + 1);
//               if (colId.startsWith("instron_")) metaColumnIds.add(colId);
//               return;
//             }

//             // Fallback: key might be "{pdfSerial}-{rowNum}-{colId}".
//             // Extract by suffix pattern "-{rowNum}-instron_..."
//             const suffixMatch = key.match(/-(\d+)-(instron_[^-].*)$/);
//             if (suffixMatch) metaColumnIds.add(suffixMatch[2]);
//           });

//           metaColumnIds.forEach((colId) => {
//             const metaArray: (object | null)[] = [];

//             for (let rowNum = 1; rowNum <= 4; rowNum++) {
//               // Try primary key first, then any key ending with -{rowNum}-{colId}
//               const primaryKey  = `${partNumber}-${rowNum}-${colId}`;
//               let rowMeta = instronRowMeta[primaryKey];

//               if (!rowMeta) {
//                 // Fallback: find by suffix
//                 const suffix = `-${rowNum}-${colId}`;
//                 const fbKey  = Object.keys(instronRowMeta).find((k) =>
//                   k.endsWith(suffix),
//                 );
//                 rowMeta = fbKey ? instronRowMeta[fbKey] : null;
//               }

//               metaArray.push(rowMeta ?? null);
//             }

//             const hasAnyMeta = metaArray.some((m) => m !== null);
//             if (hasAnyMeta) {
//               const metaKey = `${colId}_meta`;
//               finalCustomData[metaKey] = JSON.stringify(metaArray);
//               console.log(
//                 `✅ PDF metadata stored [${metaKey}] for ${partNumber}:`,
//                 metaArray,
//               );
//             }
//           });
//         }

//         // Build custom column entries for non-instron columns
//         const columnMap: Record<string, string> = {};
//         customColumns.forEach((col: any) => {
//           columnMap[col.id] = col.label;
//         });

//         const customColumnEntries: Array<{
//           row: number;
//           columnId: string;
//           columnName: string;
//           columnType: string;
//           value: string;
//         }> = [];

//         Object.entries(customColumnData).forEach(([key, value]) => {
//           const keyParts = key.split("-");
//           if (keyParts.length >= 3 && keyParts[0] === partNumber) {
//             const rowNum   = parseInt(keyParts[1]);
//             const columnId = keyParts.slice(2).join("-");
//             if (
//               rowNum >= 1 &&
//               rowNum <= 4 &&
//               value &&
//               String(value).trim() !== ""
//             ) {
//               const column = customColumns.find(
//                 (col: any) => col.id === columnId,
//               );
//               customColumnEntries.push({
//                 row: rowNum,
//                 columnId,
//                 columnName: columnMap[columnId] || columnId,
//                 columnType: column?.type || "unknown",
//                 value: String(value),
//               });
//             }
//           }
//         });

//         const finalCheckpointData = {
//           checkpointIndex:  finalCheckpointIndex,
//           checkpointValue:  finalCheckpointValue,
//           label:            "UTM Final Test",
//           testDate:         new Date().toISOString(),
//           cosmeticImages:   postCosmeticPath    ? [postCosmeticPath]    : [],
//           nonCosmeticImages: postNonCosmeticPath ? [postNonCosmeticPath] : [],
//           status:           "pass",
//           customData:       finalCustomData,   // ← graph paths + PDF metadata
//           customColumnEntries,
//           selectedOption,
//           cropRegions:      cropRegionsData?.[partNumber] || [],
//           submittedAt:      new Date().toISOString(),
//         };

//         const updatedPart = {
//           ...part,
//           isCompleted:  true,
//           completedAt:  new Date().toISOString(),
//           selectedOption,
//           checkpointData: [
//             ...(part.checkpointData || []).filter(
//               (cp: any) => cp.checkpointIndex !== finalCheckpointIndex,
//             ),
//             finalCheckpointData,
//           ].sort((a: any, b: any) => a.checkpointIndex - b.checkpointIndex),
//           checkpointInfo: {
//             ...part.checkpointInfo,
//             checkpointIndex: finalCheckpointIndex + 1,
//           },
//         };

//         updatedParts.push(updatedPart);
//         setUploadProgress((prev) => ({
//           ...prev,
//           [partNumber]: { uploaded: 2, total: 2 },
//         }));
//       }

//       // ── Summary log ───────────────────────────────────────────────────────
//       console.group("=== FINAL UTM SUBMISSION — customData per part ===");
//       updatedParts.forEach((p) => {
//         const cd = p.checkpointData[p.checkpointData.length - 1]?.customData;
//         console.log(`Part ${p.partNumber}:`);
//         Object.entries(cd || {}).forEach(([k, v]) => {
//           if (k.startsWith("instron_")) {
//             try {
//               console.log(`  ${k}:`, JSON.parse(v as string));
//             } catch {
//               console.log(`  ${k}:`, v);
//             }
//           }
//         });
//       });
//       console.groupEnd();

//       const utmMetadata = {
//         customColumns,
//         cropRegionsData,
//         uploadedAt:   new Date().toISOString(),
//         totalParts:   partsToShow.length,
//         imageTypesUploaded: ["postCosmetic", "postNonCosmetic", "instronGraphs"],
//         selectedOption,
//         note: "Instron graph paths stored under colId (e.g. instron_sidesnapsshear). PDF metadata stored under colId_meta (e.g. instron_sidesnapsshear_meta).",
//         customColumnDataSummary:
//           Object.keys(customColumnData).length + " custom data entries",
//       };

//       await onSubmit(updatedParts, utmMetadata);

//       // Count graphs stored
//       const graphsStored = updatedParts.reduce((acc, p) => {
//         const cd = p.checkpointData[p.checkpointData.length - 1]?.customData || {};
//         let count = 0;
//         Object.keys(cd).forEach((k) => {
//           if (k.startsWith("instron_") && !k.endsWith("_meta")) {
//             try {
//               count += (JSON.parse(cd[k]) as string[]).filter((v) => v !== "").length;
//             } catch { /* skip */ }
//           }
//         });
//         return acc + count;
//       }, 0);

//       // Count meta rows stored
//       const metaRowsStored = updatedParts.reduce((acc, p) => {
//         const cd = p.checkpointData[p.checkpointData.length - 1]?.customData || {};
//         let count = 0;
//         Object.keys(cd).forEach((k) => {
//           if (k.startsWith("instron_") && k.endsWith("_meta")) {
//             try {
//               count += (JSON.parse(cd[k]) as any[]).filter((v) => v !== null).length;
//             } catch { /* skip */ }
//           }
//         });
//         return acc + count;
//       }, 0);

//       alert(
//         `✅ UTM unload completed!\n\n` +
//         `• Parts processed: ${updatedParts.length}\n` +
//         `• Instron graph images stored: ${graphsStored}\n` +
//         `• PDF metadata rows stored: ${metaRowsStored}\n` +
//         `• Selected option: ${selectedOption || "(none)"}\n` +
//         `• Data saved to backend.`,
//       );

//       navigate("/planning-detail");
//     } catch (error) {
//       console.error("❌ UTM submission error:", error);
//       alert(
//         `Failed to complete UTM unload.\nError: ${error instanceof Error ? error.message : "Unknown error"}`,
//       );
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
//         <div className="max-w-full mx-auto px-6 py-4">
//           <div className="flex justify-between items-center">
//             <div className="flex items-center space-x-3">
//               {isUploading && (
//                 <div className="flex items-center text-blue-600">
//                   <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
//                   <span className="text-sm">Uploading...</span>
//                 </div>
//               )}
//               <button
//                 onClick={onBack}
//                 className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//                 disabled={isUploading}
//               >
//                 Back to Scan
//               </button>
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-gray-800">
//                 UTM Unload - Image Upload
//               </h1>
//               <p className="text-sm text-green-600 mt-1">
//                 ✓ All parts scanned - Upload post-test images
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Upload Progress */}
//       {isUploading && Object.keys(uploadProgress).length > 0 && (
//         <div className="max-w-full mx-auto px-6 py-4">
//           <div className="bg-white rounded-lg shadow p-4 mb-4 border border-blue-200">
//             <h3 className="text-lg font-semibold text-blue-900 mb-3">
//               Upload Progress
//             </h3>
//             <div className="space-y-3">
//               {Object.entries(uploadProgress).map(([partNumber, progress]) => (
//                 <div key={partNumber} className="bg-blue-50 p-3 rounded">
//                   <div className="flex justify-between mb-1">
//                     <span className="font-medium text-gray-800">
//                       {partNumber}
//                     </span>
//                     <span className="text-sm text-gray-600">
//                       {progress.uploaded}/{progress.total} images
//                     </span>
//                   </div>
//                   <div className="w-full bg-blue-200 rounded-full h-2">
//                     <div
//                       className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//                       style={{
//                         width: `${(progress.uploaded / progress.total) * 100}%`,
//                       }}
//                     />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Info banner */}
//       {/* <div className="max-w-full mx-auto px-6 mb-4">
//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//           <p className="text-sm text-blue-800">
//             <strong>ℹ️ Storage:</strong> Post-cosmetic, post-non-cosmetic, and
//             Instron graph images are saved to the database. Graph paths are stored
//             under their column ID (e.g.{" "}
//             <code className="bg-blue-100 px-1 rounded">instron_sidesnapsshear</code>).
//             PDF metadata (Serial No, Part No, P-LC, Force, Colour, OP, End Date)
//             is stored under{" "}
//             <code className="bg-blue-100 px-1 rounded">instron_sidesnapsshear_meta</code>.
//           </p>
//         </div>
//       </div> */}

//       {/* UTM Image Cropper */}
//       <div className="max-w-full mx-auto">
//         <UTMImageCropper
//           formData={utmFormData}
//           chamberData={chamberData}
//           updateRowField={updateRowField}
//           selectedParts={partsToShow}
//           machineEquipment2="UTM"
//           isSecondRound={false}
//           currentChildTest={{
//             id: chamberData.testId || "default",
//             name: chamberData.testName || "UTM Test",
//           }}
//           onDataChange={handleUTMDataChange}
//         />
//       </div>

//       {/* Footer */}
//       <div className="bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-lg">
//         <div className="max-w-full mx-auto px-6 py-4">
//           <div className="flex justify-between items-center">
//             <div className="flex items-center space-x-2">
//               <label
//                 htmlFor="ss-select"
//                 className="text-sm font-medium text-gray-700"
//               >
//                 Select Option:
//               </label>
//               <select
//                 id="ss-select"
//                 value={selectedOption}
//                 onChange={(e) => setSelectedOption(e.target.value)}
//                 disabled={isUploading}
//                 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
//               >
//                 <option value="">Select Option</option>
//                 <option value="ss1">SS1</option>
//                 <option value="ss2">SS2</option>
//                 <option value="ss3">SS3</option>
//                 <option value="ss4">SS4</option>
//               </select>
//             </div>
//             <button
//               onClick={handleUTMSubmit}
//               disabled={isUploading}
//               className={`px-8 py-3 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all ${
//                 isUploading
//                   ? "bg-gray-400 text-gray-200 cursor-not-allowed"
//                   : "bg-green-600 hover:bg-green-700 text-white"
//               }`}
//             >
//               {isUploading ? (
//                 <div className="flex items-center">
//                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
//                   Uploading Images...
//                 </div>
//               ) : (
//                 "Complete UTM Unload"
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UnloadWithUTM;


import React, { useCallback, useState } from "react";

import UTMImageCropper from "../../components/UTMImageCropper";

import { getBackendApiUrl } from "../../lib/backendApi";

import { useNavigate } from "react-router-dom";

// ─── Toast System ──────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {

  id: string;

  type: ToastType;

  message: string;

}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {

  success: { bg: "bg-green-50", border: "border-green-400", icon: "✅", text: "text-green-800" },

  error: { bg: "bg-red-50", border: "border-red-400", icon: "❌", text: "text-red-800" },

  info: { bg: "bg-blue-50", border: "border-blue-400", icon: "ℹ️", text: "text-blue-800" },

  warning: { bg: "bg-yellow-50", border: "border-yellow-400", icon: "⚠️", text: "text-yellow-800" },

};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({

  toasts,

  onDismiss,

}) => {

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">

      {toasts.map((toast) => {

        const s = toastStyles[toast.type];

        return (
          <div

            key={toast.id}

            className={`${s.bg} ${s.border} ${s.text} border-l-4 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 pointer-events-auto animate-fade-in`}

            style={{ animation: "slideIn 0.25s ease-out" }}
          >
            <span className="text-base mt-0.5 shrink-0">{s.icon}</span>
            <p className="text-sm leading-snug flex-1 whitespace-pre-wrap">{toast.message}</p>
            <button

              onClick={() => onDismiss(toast.id)}

              className="ml-1 shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"

              aria-label="Dismiss"
            >

              ×
            </button>
          </div>

        );

      })}
      <style>{`

        @keyframes slideIn {

          from { transform: translateX(100%); opacity: 0; }

          to   { transform: translateX(0);    opacity: 1; }

        }

      `}</style>
    </div>

  );

};

function useToast() {

  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {

    setToasts((prev) => prev.filter((t) => t.id !== id));

  }, []);

  const show = useCallback(

    (message: string, type: ToastType = "info", duration = 6000) => {

      const id = `${Date.now()}-${Math.random()}`;

      setToasts((prev) => [...prev, { id, type, message }]);

      if (duration > 0) setTimeout(() => dismiss(id), duration);

    },

    [dismiss],

  );

  return { toasts, show, dismiss };

}

// ─── Component ─────────────────────────────────────────────────────────────────

interface UnloadWithUTMProps {

  onBack: () => void;

  onSubmit: (updatedParts: any[], utmMetadata?: any) => Promise<void>;

  chamberData: any;

  partsToShow: any[];

}

const UnloadWithUTM: React.FC<UnloadWithUTMProps> = ({

  onBack,

  onSubmit,

  chamberData,

  partsToShow,

}) => {

  const handleUTMDataChange = useCallback((data: any) => {

    setUtmData(data);

  }, []);

  const [utmFormData, setUtmFormData] = useState({

    rows: [],

    customColumns: [],

  });

  const [utmData, setUtmData] = useState<any>(null);

  const [selectedOption, setSelectedOption] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<

    Record<string, { uploaded: number; total: number }>
  >({});

  const navigate = useNavigate();

  // ── Toast hook ──────────────────────────────────────────────────────────────

  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const updateRowField = (rowId: number, field: string, value: string) => {

    setUtmFormData((prev) => ({

      ...prev,

      rows: prev.rows.map((row: any) =>

        row.id === rowId ? { ...row, [field]: value } : row,

      ),

    }));

  };

  const uploadImageToBackend = async (

    imageData: string,

    partNumber: string,

    serialNumber: string,

    imageType: "postCosmetic" | "postNonCosmetic",

    checkpointIndex: number,

  ): Promise<string> => {

    try {

      const base64Response = await fetch(imageData);

      const blob = await base64Response.blob();

      const filename = `${partNumber}_${imageType}_${Date.now()}.png`;

      const file = new File([blob], filename, { type: "image/png" });

      const formData = new FormData();

      formData.append("image", file);

      if (chamberData?.id)

        formData.append("chamberLoadId", String(chamberData.id));

      const part = partsToShow.find((p) => p.partNumber === partNumber);

      if (part?.serialNumber)

        formData.append("partId", String(part.serialNumber));

      else if (part?.partNumber)

        formData.append("partId", String(part.partNumber));

      const backendImageType =

        imageType === "postCosmetic" ? "cosmetic" : "nonCosmetic";

      formData.append("imageType", backendImageType);

      formData.append("checkpointIndex", String(checkpointIndex));

      const response = await fetch(

        `${getBackendApiUrl()}/uploads/part-images`,

        {

          method: "POST",

          body: formData,

        },

      );

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(

          `Upload failed with status: ${response.status} - ${JSON.stringify(errorData)}`,

        );

      }

      const result = await response.json();
      if (result?.path) return result.path;

      throw new Error("Upload response missing path");

    } catch (error) {

      console.error(

        `❌ Error uploading ${imageType} for ${partNumber}:`,

        error,

      );

      throw error;

    }

  };

  // ─── Main submit handler ───────────────────────────────────────────────────

  const handleUTMSubmit = async () => {

    if (!utmData) {

      showToast("Please wait for UTM data to load", "warning");

      return;

    }

    const {

      postCosmeticImages,

      postNonCosmeticImages,

      customColumns,

      customColumnData,

      cropRegionsData,

      instronGraphData,   // backend paths  keyed "{partNumber}-{rowNum}-{columnId}"

      instronRowMeta,     // ← NEW: PDF metadata keyed "{partNumber}-{rowNum}-{columnId}"

    } = utmData;

    // Validate required images

    const missingImages: string[] = [];

    for (const part of partsToShow) {

      if (!postCosmeticImages[part.partNumber])

        missingImages.push(`${part.partNumber} - Missing Post-Cosmetic Image`);

      if (!postNonCosmeticImages[part.partNumber])

        missingImages.push(

          `${part.partNumber} - Missing Post-Non-Cosmetic Image`,

        );

    }

    if (missingImages.length > 0) {

      showToast(

        `Please upload required images:\n\n${missingImages.join("\n")}`,

        "error",

        8000,

      );

      return;

    }

    try {

      setIsUploading(true);

      const updatedParts = [];

      for (let i = 0; i < partsToShow.length; i++) {

        const part = partsToShow[i];

        const { partNumber, serialNumber } = part;

        const checkpoints = part.checkpointInfo?.checkpoints || [];

        const hasNoCheckpoints =

          checkpoints.length === 0 ||

          (checkpoints.length === 1 && checkpoints[0] === 0);

        const finalCheckpointIndex = hasNoCheckpoints

          ? 0

          : Math.max(checkpoints.length - 1, 0);

        const finalCheckpointValue = hasNoCheckpoints

          ? part.testValue || 0

          : checkpoints[finalCheckpointIndex];

        setUploadProgress((prev) => ({

          ...prev,

          [partNumber]: { uploaded: 0, total: 2 },

        }));

        // Upload post-cosmetic

        let postCosmeticPath = "";

        if (postCosmeticImages[partNumber]) {

          try {

            postCosmeticPath = await uploadImageToBackend(

              postCosmeticImages[partNumber],

              partNumber,

              serialNumber,

              "postCosmetic",

              finalCheckpointIndex,

            );

            setUploadProgress((prev) => ({

              ...prev,

              [partNumber]: { uploaded: 1, total: 2 },

            }));

          } catch (e) {

            console.error(

              `Failed to upload post-cosmetic for ${partNumber}:`,

              e,

            );

          }

        }

        // Upload post-non-cosmetic

        let postNonCosmeticPath = "";

        if (postNonCosmeticImages[partNumber]) {

          try {

            postNonCosmeticPath = await uploadImageToBackend(

              postNonCosmeticImages[partNumber],

              partNumber,

              serialNumber,

              "postNonCosmetic",

              finalCheckpointIndex,

            );

            setUploadProgress((prev) => ({

              ...prev,

              [partNumber]: { uploaded: 2, total: 2 },

            }));

          } catch (e) {

            console.error(

              `Failed to upload post-non-cosmetic for ${partNumber}:`,

              e,

            );

          }

        }

        // ── Build customData ───────────────────────────────────────────────

        const finalCustomData: Record<string, string> = {};

        // Standard image paths

        finalCustomData["cosmetic"] = JSON.stringify(

          postCosmeticPath ? [postCosmeticPath] : [],

        );

        finalCustomData["nonCosmetic"] = JSON.stringify(

          postNonCosmeticPath ? [postNonCosmeticPath] : [],

        );

        finalCustomData["selectedOption"] = selectedOption;

        // Crop region coordinates

        if (cropRegionsData?.[partNumber]) {

          finalCustomData["cropRegions"] = JSON.stringify(

            cropRegionsData[partNumber],

          );

        }

        // ── Persist instron graph paths per column ─────────────────────────

        if (instronGraphData && typeof instronGraphData === "object") {

          const columnIds = new Set<string>();

          Object.keys(instronGraphData).forEach((key) => {

            if (!key.startsWith(`${partNumber}-`)) return;

            const afterPart = key.slice(partNumber.length + 1);

            const dashIdx = afterPart.indexOf("-");

            if (dashIdx === -1) return;

            const colId = afterPart.slice(dashIdx + 1);

            if (colId.startsWith("instron_")) columnIds.add(colId);

          });

          columnIds.forEach((colId) => {

            const paths: string[] = [];

            for (let rowNum = 1; rowNum <= 4; rowNum++) {

              const key = `${partNumber}-${rowNum}-${colId}`;

              const value = instronGraphData[key] || "";

              if (value && !value.startsWith("data:")) {

                let relativePath = value;

                const backendUrl = getBackendApiUrl();

                if (relativePath.startsWith(backendUrl)) {

                  relativePath = relativePath.slice(backendUrl.length);

                }

                paths.push(relativePath);

              } else if (value.startsWith("data:")) {

                console.warn(

                  `⚠️ Row ${rowNum} of ${colId} for ${partNumber} is still a dataUrl — skipping`,

                );

                paths.push("");

              } else {

                paths.push("");

              }

            }

            if (paths.some((p) => p !== "")) {

              finalCustomData[colId] = JSON.stringify(paths);

              console.log(`✅ Graph paths stored [${colId}] for ${partNumber}:`, paths);

            }

          });

        }

        // ── NEW: Persist PDF extracted metadata per column ─────────────────

        if (instronRowMeta && typeof instronRowMeta === "object") {

          const metaColumnIds = new Set<string>();

          Object.keys(instronRowMeta).forEach((key) => {

            const afterPart = key.startsWith(`${partNumber}-`)

              ? key.slice(partNumber.length + 1)

              : null;

            if (afterPart) {

              const dashIdx = afterPart.indexOf("-");

              if (dashIdx === -1) return;

              const colId = afterPart.slice(dashIdx + 1);

              if (colId.startsWith("instron_")) metaColumnIds.add(colId);

              return;

            }

            const suffixMatch = key.match(/-(\d+)-(instron_[^-].*)$/);

            if (suffixMatch) metaColumnIds.add(suffixMatch[2]);

          });

          metaColumnIds.forEach((colId) => {

            const metaArray: (object | null)[] = [];

            for (let rowNum = 1; rowNum <= 4; rowNum++) {

              const primaryKey = `${partNumber}-${rowNum}-${colId}`;

              let rowMeta = instronRowMeta[primaryKey];

              if (!rowMeta) {

                const suffix = `-${rowNum}-${colId}`;

                const fbKey = Object.keys(instronRowMeta).find((k) =>

                  k.endsWith(suffix),

                );

                rowMeta = fbKey ? instronRowMeta[fbKey] : null;

              }

              metaArray.push(rowMeta ?? null);

            }

            const hasAnyMeta = metaArray.some((m) => m !== null);

            if (hasAnyMeta) {

              const metaKey = `${colId}_meta`;

              finalCustomData[metaKey] = JSON.stringify(metaArray);

              console.log(

                `✅ PDF metadata stored [${metaKey}] for ${partNumber}:`,

                metaArray,

              );

            }

          });

        }

        // Build custom column entries for non-instron columns

        const columnMap: Record<string, string> = {};

        customColumns.forEach((col: any) => {

          columnMap[col.id] = col.label;

        });

        const customColumnEntries: Array<{

          row: number;

          columnId: string;

          columnName: string;

          columnType: string;

          value: string;

        }> = [];

        Object.entries(customColumnData).forEach(([key, value]) => {

          const keyParts = key.split("-");

          if (keyParts.length >= 3 && keyParts[0] === partNumber) {

            const rowNum = parseInt(keyParts[1]);

            const columnId = keyParts.slice(2).join("-");

            if (

              rowNum >= 1 &&

              rowNum <= 4 &&

              value &&

              String(value).trim() !== ""

            ) {

              const column = customColumns.find(

                (col: any) => col.id === columnId,

              );

              customColumnEntries.push({

                row: rowNum,

                columnId,

                columnName: columnMap[columnId] || columnId,

                columnType: column?.type || "unknown",

                value: String(value),

              });

            }

          }

        });

        const finalCheckpointData = {

          checkpointIndex: finalCheckpointIndex,

          checkpointValue: finalCheckpointValue,

          label: "UTM Final Test",

          testDate: new Date().toISOString(),

          cosmeticImages: postCosmeticPath ? [postCosmeticPath] : [],

          nonCosmeticImages: postNonCosmeticPath ? [postNonCosmeticPath] : [],

          status: "pass",

          customData: finalCustomData,

          customColumnEntries,

          selectedOption,

          cropRegions: cropRegionsData?.[partNumber] || [],

          submittedAt: new Date().toISOString(),

        };

        const updatedPart = {

          ...part,

          isCompleted: true,

          completedAt: new Date().toISOString(),

          selectedOption,

          checkpointData: [

            ...(part.checkpointData || []).filter(

              (cp: any) => cp.checkpointIndex !== finalCheckpointIndex,

            ),

            finalCheckpointData,

          ].sort((a: any, b: any) => a.checkpointIndex - b.checkpointIndex),

          checkpointInfo: {

            ...part.checkpointInfo,

            checkpointIndex: finalCheckpointIndex + 1,

          },

        };

        updatedParts.push(updatedPart);

        setUploadProgress((prev) => ({

          ...prev,

          [partNumber]: { uploaded: 2, total: 2 },

        }));

      }

      // ── Summary log ───────────────────────────────────────────────────────

      console.group("=== FINAL UTM SUBMISSION — customData per part ===");

      updatedParts.forEach((p) => {

        const cd = p.checkpointData[p.checkpointData.length - 1]?.customData;

        console.log(`Part ${p.partNumber}:`);

        Object.entries(cd || {}).forEach(([k, v]) => {

          if (k.startsWith("instron_")) {

            try {

              console.log(`  ${k}:`, JSON.parse(v as string));

            } catch {

              console.log(`  ${k}:`, v);

            }

          }

        });

      });

      console.groupEnd();

      const utmMetadata = {

        customColumns,

        cropRegionsData,

        uploadedAt: new Date().toISOString(),

        totalParts: partsToShow.length,

        imageTypesUploaded: ["postCosmetic", "postNonCosmetic", "instronGraphs"],

        selectedOption,

        note: "Instron graph paths stored under colId (e.g. instron_sidesnapsshear). PDF metadata stored under colId_meta (e.g. instron_sidesnapsshear_meta).",

        customColumnDataSummary:

          Object.keys(customColumnData).length + " custom data entries",

      };

      await onSubmit(updatedParts, utmMetadata);

      // Count graphs stored

      const graphsStored = updatedParts.reduce((acc, p) => {

        const cd = p.checkpointData[p.checkpointData.length - 1]?.customData || {};

        let count = 0;

        Object.keys(cd).forEach((k) => {

          if (k.startsWith("instron_") && !k.endsWith("_meta")) {

            try {

              count += (JSON.parse(cd[k]) as string[]).filter((v) => v !== "").length;

            } catch { /* skip */ }

          }

        });

        return acc + count;

      }, 0);

      // Count meta rows stored

      const metaRowsStored = updatedParts.reduce((acc, p) => {

        const cd = p.checkpointData[p.checkpointData.length - 1]?.customData || {};

        let count = 0;

        Object.keys(cd).forEach((k) => {

          if (k.startsWith("instron_") && k.endsWith("_meta")) {

            try {

              count += (JSON.parse(cd[k]) as any[]).filter((v) => v !== null).length;

            } catch { /* skip */ }

          }

        });

        return acc + count;

      }, 0);

      showToast(

        `UTM unload completed!\n\n` +

        `• Parts processed: ${updatedParts.length}\n` +

        `• Instron graph images stored: ${graphsStored}\n` +

        `• PDF metadata rows stored: ${metaRowsStored}\n` +

        `• Selected option: ${selectedOption || "(none)"}\n` +

        `• Data saved to backend.`,

        "success",

        8000,

      );

      navigate("/planning-detail");

    } catch (error) {

      console.error("❌ UTM submission error:", error);

      showToast(

        `Failed to complete UTM unload.\nError: ${error instanceof Error ? error.message : "Unknown error"}`,

        "error",

        10000,

      );

    } finally {

      setIsUploading(false);

    }

  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">

              {isUploading && (
                <div className="flex items-center text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm">Uploading...</span>
                </div>

              )}
              <button

                onClick={onBack}

                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"

                disabled={isUploading}
              >

                Back to Scan
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">

                UTM Unload - Image Upload
              </h1>
              <p className="text-sm text-green-600 mt-1">

                ✓ All parts scanned - Upload post-test images
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}

      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="bg-white rounded-lg shadow p-4 mb-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">

              Upload Progress
            </h3>
            <div className="space-y-3">

              {Object.entries(uploadProgress).map(([partNumber, progress]) => (
                <div key={partNumber} className="bg-blue-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">

                      {partNumber}
                    </span>
                    <span className="text-sm text-gray-600">

                      {progress.uploaded}/{progress.total} images
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div

                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"

                      style={{

                        width: `${(progress.uploaded / progress.total) * 100}%`,

                      }}

                    />
                  </div>
                </div>

              ))}
            </div>
          </div>
        </div>

      )}

      {/* Info banner */}
      <div className="max-w-full mx-auto px-6 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Storage:</strong> Post-cosmetic, post-non-cosmetic, and

            Instron graph images are saved to the database. Graph paths are stored

            under their column ID (e.g.{" "}
            <code className="bg-blue-100 px-1 rounded">instron_sidesnapsshear</code>).

            PDF metadata (Serial No, Part No, P-LC, Force, Colour, OP, End Date)

            is stored under{" "}
            <code className="bg-blue-100 px-1 rounded">instron_sidesnapsshear_meta</code>.
          </p>
        </div>
      </div>

      {/* UTM Image Cropper */}
      <div className="max-w-full mx-auto">
        <UTMImageCropper

          formData={utmFormData}

          chamberData={chamberData}

          updateRowField={updateRowField}

          selectedParts={partsToShow}

          machineEquipment2="UTM"

          isSecondRound={false}

          currentChildTest={{

            id: chamberData.testId || "default",

            name: chamberData.testName || "UTM Test",

          }}

          onDataChange={handleUTMDataChange}

        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <label

                htmlFor="ss-select"

                className="text-sm font-medium text-gray-700"
              >

                Select Option:
              </label>
              <select

                id="ss-select"

                value={selectedOption}

                onChange={(e) => setSelectedOption(e.target.value)}

                disabled={isUploading}

                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Option</option>
                <option value="ss1">SS1</option>
                <option value="ss2">SS2</option>
                <option value="ss3">SS3</option>
                <option value="ss4">SS4</option>
              </select>
            </div>
            <button

              onClick={handleUTMSubmit}

              disabled={isUploading}

              className={`px-8 py-3 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all ${isUploading

                ? "bg-gray-400 text-gray-200 cursor-not-allowed"

                : "bg-green-600 hover:bg-green-700 text-white"

                }`}
            >

              {isUploading ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>

                  Uploading Images...
                </div>

              ) : (

                "Complete UTM Unload"

              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

};

export default UnloadWithUTM;
