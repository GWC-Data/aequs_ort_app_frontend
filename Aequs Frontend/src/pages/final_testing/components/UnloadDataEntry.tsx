

// import React, { useMemo, useState, useEffect, useCallback } from "react";
// import {
//   ChamberData,
//   Part,
//   CheckpointLabels,
//   CustomColumn,
//   CustomColumnData,
//   CheckpointSubmissions,
//   CheckpointSubmission,
// } from "../types";
// import {
//   formatDate,
//   getCheckpointsForPart,
//   getCheckpointLabel,
// } from "../utils/helpers";
// import MachineDetails from "./MachineDetails";
// import CheckpointProgress from "./CheckpointProgress";
// import PartDetails from "./PartDetails";
// import { getBackendApiUrl } from "@/lib/backendApi";

// // ─── Toast System ────────────────────────────────────────────────────────────

// type ToastType = "success" | "error" | "warning" | "info";

// interface Toast {
//   id: number;
//   message: string;
//   type: ToastType;
// }

// let toastIdCounter = 0;

// const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
//   success: { bg: "bg-green-50", border: "border-green-400", icon: "✓", text: "text-green-800" },
//   error:   { bg: "bg-red-50",   border: "border-red-400",   icon: "✗", text: "text-red-800"   },
//   warning: { bg: "bg-yellow-50",border: "border-yellow-400",icon: "⚠", text: "text-yellow-800"},
//   info:    { bg: "bg-blue-50",  border: "border-blue-400",  icon: "ℹ", text: "text-blue-800"  },
// };

// const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({
//   toasts,
//   onRemove,
// }) => {
//   if (toasts.length === 0) return null;

//   return (
//     <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
//       {toasts.map((toast) => {
//         const s = toastStyles[toast.type];
//         return (
//           <div
//             key={toast.id}
//             className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto
//               ${s.bg} ${s.border} ${s.text}
//               animate-[slideIn_0.2s_ease-out]`}
//             style={{
//               animation: "slideIn 0.2s ease-out",
//             }}
//           >
//             <span className="text-lg font-bold leading-none mt-0.5 flex-shrink-0">{s.icon}</span>
//             <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
//             <button
//               onClick={() => onRemove(toast.id)}
//               className="flex-shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
//               aria-label="Dismiss"
//             >
//               ×
//             </button>
//           </div>
//         );
//       })}
//       <style>{`
//         @keyframes slideIn {
//           from { opacity: 0; transform: translateX(100%); }
//           to   { opacity: 1; transform: translateX(0);    }
//         }
//       `}</style>
//     </div>
//   );
// };

// function useToast() {
//   const [toasts, setToasts] = useState<Toast[]>([]);

//   const addToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
//     const id = ++toastIdCounter;
//     setToasts((prev) => [...prev, { id, message, type }]);
//     setTimeout(() => {
//       setToasts((prev) => prev.filter((t) => t.id !== id));
//     }, duration);
//   }, []);

//   const removeToast = useCallback((id: number) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return { toasts, addToast, removeToast };
// }

// // ─── Component ───────────────────────────────────────────────────────────────

// interface UnloadDataEntryProps {
//   onBack: () => void;
//   onSubmit: (finalData: FinalPartData[], updatedParts: Part[]) => void;
//   chamberData: ChamberData;
//   checkpointLabels: CheckpointLabels;
//   customColumns: CustomColumn[];
//   customColumnData: CustomColumnData;
//   forcedFinalCheckpointIndex?: number | null;
//   formatDate: (dateString: string | null) => string;
//   onStatusChange: (
//     partIndex: number,
//     checkpointIndex: number,
//     status: "pass" | "fail" | "",
//   ) => void;
//   onRowSubmit: (partIndex: number, checkpointIndex: number) => void;
//   partsToShow: Part[];
//   submittedCheckpoints: CheckpointSubmissions;
// }

// interface FinalPartData {
//   partIndex: number;
//   partNumber: string;
//   serialNumber: string;
//   status: "pass" | "fail" | "";
//   customData?: Record<string, string>;
//   testValue?: number;
//   checkpointValue: number;
// }

// const UnloadDataEntry: React.FC<UnloadDataEntryProps> = ({
//   onBack,
//   onSubmit,
//   chamberData,
//   customColumns,
//   customColumnData,
//   partsToShow,
//   formatDate,
//   submittedCheckpoints,
//   forcedFinalCheckpointIndex,
// }) => {
//   const { toasts, addToast, removeToast } = useToast();

//   const parseImageList = (value?: string): string[] => {
//     if (!value) return [];
//     try {
//       const parsed = JSON.parse(value);
//       return Array.isArray(parsed) ? parsed : [];
//     } catch (e) {
//       if (Array.isArray(value)) return value;
//       return [];
//     }
//   };

//   const resolvePartIndex = (part: Part, fallbackIndex: number) => {
//     if (part.serialNumber) {
//       const matchBySerial = chamberData.parts.findIndex(
//         (p) => p.serialNumber === part.serialNumber,
//       );
//       if (matchBySerial >= 0) return matchBySerial;
//     }

//     const matchByPartNumber = chamberData.parts.findIndex(
//       (p) => p.partNumber === part.partNumber,
//     );
//     if (matchByPartNumber >= 0) return matchByPartNumber;

//     return fallbackIndex;
//   };

//   const visibleColumnsByPart = useMemo(() => {
//     return partsToShow.map((part, displayIndex) => {
//       const indexForKeys = resolvePartIndex(part, displayIndex);
//       const indexPrefix = `${indexForKeys}-`;

//       const hasImagesValue = (value?: string) => {
//         const list = parseImageList(value);
//         return list.length > 0;
//       };

//       const hasColumnData = (column: CustomColumn) => {
//         const colId = column.id;

//         const hasPending = Object.keys(customColumnData).some((key) => {
//           if (!key.startsWith(indexPrefix) || !key.endsWith(`-${colId}`)) {
//             return false;
//           }
//           return hasImagesValue(customColumnData[key]);
//         });
//         if (hasPending) return true;

//         const hasSubmitted = Object.entries(submittedCheckpoints).some(
//           ([key, submission]) => {
//             if (!key.startsWith(indexPrefix)) return false;
//             const val = submission.customData?.[colId];
//             return hasImagesValue(val);
//           },
//         );
//         if (hasSubmitted) return true;

//         const hasCheckpointValue = part.checkpointData?.some((cp) =>
//           cp.customData ? hasImagesValue(cp.customData[colId]) : false,
//         );
//         if (hasCheckpointValue) return true;

//         if (Array.isArray(part.customImages)) {
//           const normalizedId = (colId || "").trim().toLowerCase();
//           const normalizedName = (column.name || "").trim().toLowerCase();
//           const hasLabelMatch = part.customImages.some((img) => {
//             const lbl = (img.label || "").trim().toLowerCase();
//             return (
//               (lbl === normalizedId || lbl === normalizedName) &&
//               Boolean(img.path)
//             );
//           });
//           if (hasLabelMatch) return true;
//         }

//         return false;
//       };

//       const visibleColumns = customColumns.filter((column) =>
//         hasColumnData(column),
//       );

//       const imageColumns = visibleColumns.filter(
//         (column) => column.type === "image",
//       );

//       const nonImageColumns = visibleColumns.filter(
//         (column) => column.type !== "image",
//       );

//       return { visibleColumns, imageColumns, nonImageColumns };
//     });
//   }, [
//     partsToShow,
//     chamberData.parts,
//     customColumns,
//     customColumnData,
//     submittedCheckpoints,
//   ]);

//   const getImageColumnsForPart = (partIndex: number) =>
//     visibleColumnsByPart[partIndex]?.imageColumns || [];

//   const getNonImageColumnsForPart = (partIndex: number) =>
//     visibleColumnsByPart[partIndex]?.nonImageColumns || [];

//   const getCustomColumnValue = (
//     part: Part,
//     displayIndex: number,
//     checkpointIndex: number,
//     column: CustomColumn,
//   ): string => {
//     const resolvedIndex = resolvePartIndex(part, displayIndex);
//     const key = `${resolvedIndex}-${checkpointIndex}-${column.id}`;

//     if (customColumnData[key] !== undefined) {
//       return customColumnData[key];
//     }

//     const submitted =
//       submittedCheckpoints[`${resolvedIndex}-${checkpointIndex}`];
//     if (
//       submitted?.customData &&
//       submitted.customData[column.id] !== undefined
//     ) {
//       return submitted.customData[column.id] ?? "";
//     }

//     const targetPart =
//       chamberData.parts[resolvedIndex] || partsToShow[displayIndex] || part;

//     const checkpointEntry = targetPart.checkpointData?.find(
//       (cp) => cp.checkpointIndex === checkpointIndex,
//     );

//     if (
//       checkpointEntry?.customData &&
//       checkpointEntry.customData[column.id] !== undefined
//     ) {
//       return checkpointEntry.customData[column.id] ?? "";
//     }

//     if (
//       column.type === "image" &&
//       checkpointIndex === 0 &&
//       Array.isArray(targetPart.customImages)
//     ) {
//       const columnLabel = (column.name || column.id || "").trim().toLowerCase();
//       const matches = targetPart.customImages
//         .filter((img) => (img.label || "").trim().toLowerCase() === columnLabel)
//         .map((img) => img.path)
//         .filter(Boolean);

//       if (matches.length > 0) {
//         return JSON.stringify(matches);
//       }
//     }

//     return "";
//   };

//   const [finalStatuses, setFinalStatuses] = useState<
//     Record<number, "pass" | "fail" | "">
//   >({});
//   const [finalPostImages, setFinalPostImages] = useState<
//     Record<string, File[]>
//   >({});
//   const [uploadProgress, setUploadProgress] = useState<Record<number, number>>(
//     {},
//   );
//   const [isUploading, setIsUploading] = useState(false);
//   const [finalCustomValues, setFinalCustomValues] = useState<
//     Record<string, string>
//   >({});

//   const getLatestCheckpointStatus = (part: Part): "pass" | "fail" | null => {
//     if (!Array.isArray(part.checkpointData)) return null;
//     const sorted = [...part.checkpointData].sort(
//       (a, b) => b.checkpointIndex - a.checkpointIndex,
//     );
//     const latest = sorted.find(
//       (cp) => cp.status !== null && cp.status !== undefined,
//     );
//     return (latest?.status as "pass" | "fail" | null) ?? null;
//   };

//   const getLatestFailCheckpoint = (part: Part) => {
//     if (!Array.isArray(part.checkpointData)) return null;
//     const sorted = [...part.checkpointData].sort(
//       (a, b) => b.checkpointIndex - a.checkpointIndex,
//     );
//     const latestFail = sorted.find((cp) => cp.status === "fail");
//     return latestFail || null;
//   };

//   // Debug logging
//   useEffect(() => {
//     if (partsToShow.length > 0) {
//       console.log("DEBUG: First part data:", partsToShow[0]);
//       const firstPartImages = getImageColumnsForPart(0);
//       console.log("DEBUG: Image columns:", firstPartImages);

//       firstPartImages.forEach((col) => {
//         const images = getImagesForCheckpoint(0, 0, col.id);
//         console.log(
//           `DEBUG: Column ${col.id} (${col.name}) has ${images.length} T0 images`,
//         );
//       });
//     }
//   }, [partsToShow, visibleColumnsByPart]);

//   const handleFinalStatusChange = (
//     partIndex: number,
//     value: "pass" | "fail" | "",
//   ) => {
//     setFinalStatuses((prev) => ({
//       ...prev,
//       [partIndex]: value,
//     }));
//   };

//   const handleFinalImageUpload = (
//     partIndex: number,
//     columnId: string,
//     files: FileList | null,
//   ) => {
//     if (!files) return;

//     const fileArray = Array.from(files);
//     console.log(
//       `Uploaded ${fileArray.length} files for part ${partIndex}, column ${columnId}`,
//     );

//     setFinalPostImages((prev) => ({
//       ...prev,
//       [`${partIndex}-${columnId}`]: fileArray,
//     }));
//   };

//   const getImagesForCheckpoint = (
//     partIndex: number,
//     checkpointIndex: number,
//     columnId: string,
//   ): string[] => {
//     const submittedKey = `${partIndex}-${checkpointIndex}`;
//     const submitted = submittedCheckpoints[submittedKey];
//     if (submitted?.customData?.[columnId]) {
//       const images = parseImageList(submitted.customData[columnId]);
//       console.log(
//         `Found ${images.length} images in submitted checkpoints for ${columnId}`,
//       );
//       return images;
//     }

//     const resolvedIndex = Math.max(
//       0,
//       Math.min(partIndex, chamberData.parts.length - 1),
//     );
//     const part =
//       chamberData.parts[resolvedIndex] ||
//       partsToShow[partIndex] ||
//       partsToShow[0];

//     if (
//       checkpointIndex === 0 &&
//       part.customImages &&
//       part.customImages.length > 0
//     ) {
//       const t0Images = part.customImages
//         .filter((img) => img.label === columnId)
//         .map((img) => img.path);

//       if (t0Images.length > 0) {
//         console.log(
//           `Found ${t0Images.length} T0 images in customImages for ${columnId}`,
//         );
//         return t0Images;
//       }
//     }

//     const checkpointEntry = part.checkpointData?.find(
//       (cp) => cp.checkpointIndex === checkpointIndex,
//     );

//     if (checkpointEntry?.customData?.[columnId]) {
//       const customDataImages = parseImageList(
//         checkpointEntry.customData[columnId],
//       );
//       console.log(
//         `Found ${customDataImages.length} images in customData for ${columnId}`,
//       );
//       return customDataImages;
//     }

//     if (checkpointEntry) {
//       if (
//         columnId === "cosmetic" &&
//         checkpointEntry.cosmeticImages &&
//         checkpointEntry.cosmeticImages.length > 0
//       ) {
//         return checkpointEntry.cosmeticImages;
//       }
//       if (
//         columnId === "nonCosmetic" &&
//         checkpointEntry.nonCosmeticImages &&
//         checkpointEntry.nonCosmeticImages.length > 0
//       ) {
//         return checkpointEntry.nonCosmeticImages;
//       }
//     }

//     return [];
//   };

//   const canSubmitAll = () => {
//     console.log("=== Checking canSubmitAll ===");
//     const result = partsToShow.every((part, index) => {
//       const imageColumns = getImageColumnsForPart(index);
//       const isFailed = getLatestCheckpointStatus(part) === "fail";
//       const hasNoCheckpoints =
//         (part.checkpointInfo?.checkpoints?.length || 0) === 0 ||
//         (part.checkpointInfo?.checkpoints?.length === 1 &&
//           part.checkpointInfo.checkpoints[0] === 0);

//       if (isFailed) {
//         console.log(
//           `Part ${part.partNumber} is failed - skipping requirements`,
//         );
//         return true;
//       }

//       if (
//         forcedFinalCheckpointIndex !== undefined &&
//         forcedFinalCheckpointIndex !== null
//       ) {
//         const targetIndex = forcedFinalCheckpointIndex;
//         const cpEntry = part.checkpointData?.find(
//           (cp) => cp.checkpointIndex === targetIndex,
//         );
//         const canSubmit = Boolean(cpEntry && cpEntry.status);
//         console.log(`Part ${part.partNumber} forced checkpoint: ${canSubmit}`);
//         return canSubmit;
//       }

//       const allImageColumnsPresent = imageColumns.every((col) => {
//         const key = `${index}-${col.id}`;
//         const hasUploads = (finalPostImages[key]?.length || 0) > 0;
//         console.log(
//           `  Column ${col.id}: ${hasUploads ? "✓" : "✗"} (${finalPostImages[key]?.length || 0} files)`,
//         );
//         return hasUploads;
//       });

//       if (hasNoCheckpoints) {
//         console.log(
//           `Part ${part.partNumber} (no checkpoints): images=${allImageColumnsPresent}`,
//         );
//         return allImageColumnsPresent;
//       }

//       const status = finalStatuses[index];
//       const canSubmit = Boolean(status) && allImageColumnsPresent;
//       console.log(
//         `Part ${part.partNumber}: status=${status}, images=${allImageColumnsPresent}, canSubmit=${canSubmit}`,
//       );
//       return canSubmit;
//     });

//     console.log("=== canSubmitAll result:", result, "===");
//     return result;
//   };

//   const uploadImageToServer = async (
//     file: File,
//     partId: string,
//     checkpointValue: number,
//     columnId: string,
//   ): Promise<string> => {
//     const formData = new FormData();
//     formData.append("image", file);
//     formData.append("partId", partId);
//     formData.append("checkpointValue", checkpointValue.toString());
//     formData.append("imageType", `custom-${columnId}`);

//     console.log(
//       `Uploading image for ${columnId}, part ${partId}, checkpoint ${checkpointValue}`,
//     );

//     try {
//       const response = await fetch(
//         `${getBackendApiUrl()}/uploads/part-images`,
//         {
//           method: "POST",
//           body: formData,
//         },
//       );

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("Upload failed:", errorText);
//         throw new Error(
//           `Upload failed: ${response.status} ${response.statusText}`,
//         );
//       }

//       const data = await response.json();
//       console.log(`Upload successful:`, data);
//       const path = data?.path || data?.imageUrl;
//       if (!path) {
//         throw new Error("Upload succeeded but no path returned");
//       }
//       return path as string;
//     } catch (error) {
//       console.error("Error uploading image:", error);
//       throw error;
//     }
//   };

//   const handleSubmitAll = async () => {
//     console.log("=== handleSubmitAll START ===");
//     console.log("finalPostImages:", finalPostImages);
//     console.log("partsToShow count:", partsToShow.length);

//     partsToShow.forEach((part, idx) => {
//       console.log(`Part ${part.partNumber} (index ${idx}):`);
//       const imageColumns = getImageColumnsForPart(idx);
//       imageColumns.forEach((col) => {
//         const key = `${idx}-${col.id}`;
//         const files = finalPostImages[key] || [];
//         console.log(`  ${col.id}: ${files.length} files`);
//       });
//     });

//     const canSubmit = canSubmitAll();
//     console.log("canSubmitAll result:", canSubmit);

//     if (!canSubmit) {
//       // ← REPLACED alert()
//       addToast(
//         "Please complete final status and upload post images for all completed parts. Check console for details.",
//         "warning",
//         6000,
//       );
//       return;
//     }

//     setIsUploading(true);
//     console.log("Starting submission process...");

//     const finalData: FinalPartData[] = [];
//     const updatedParts: Part[] = [];

//     try {
//       for (let i = 0; i < partsToShow.length; i++) {
//         const part = partsToShow[i];
//         const lookupIndex = resolvePartIndex(part, i);
//         console.log(`\n=== Processing part ${i}: ${part.partNumber} ===`);

//         const checkpoints = getCheckpointsForPart(part);
//         const imageColumns = getImageColumnsForPart(i);
//         const nonImageColumns = getNonImageColumnsForPart(i);
//         const isFailed = getLatestCheckpointStatus(part) === "fail";
//         const hasNoCheckpoints =
//           (part.checkpointInfo?.checkpoints?.length || 0) === 0 ||
//           (part.checkpointInfo?.checkpoints?.length === 1 &&
//             part.checkpointInfo.checkpoints[0] === 0);

//         console.log(
//           `isFailed: ${isFailed}, hasNoCheckpoints: ${hasNoCheckpoints}`,
//         );

//         if (isFailed) {
//           console.log(`Part ${part.partNumber} is failed, using existing data`);
//           const failureCheckpoint = getLatestFailCheckpoint(part);

//           const nonImageColumns = getNonImageColumnsForPart(i);
//           const customData: Record<string, string> = {
//             ...(failureCheckpoint?.customData || {}),
//           };

//           nonImageColumns.forEach((col) => {
//             const val = failureCheckpoint?.customData?.[col.id];
//             if (val !== undefined) {
//               customData[col.id] = val;
//             }
//           });

//           imageColumns.forEach((col) => {
//             const imgs = failureCheckpoint
//               ? getImagesForCheckpoint(
//                   lookupIndex,
//                   failureCheckpoint.checkpointIndex,
//                   col.id,
//                 )
//               : [];
//             if (imgs.length > 0) {
//               customData[col.id] = JSON.stringify(imgs);
//             } else {
//               customData[col.id] = "[]";
//             }
//           });

//           finalData.push({
//             partIndex: i,
//             partNumber: part.partNumber,
//             serialNumber: part.serialNumber,
//             status: "fail",
//             customData,
//             testValue: part.testValue,
//             checkpointValue: failureCheckpoint?.checkpointValue || 0,
//           });
//           updatedParts.push(part);
//           continue;
//         }

//         const useForced =
//           forcedFinalCheckpointIndex !== undefined &&
//           forcedFinalCheckpointIndex !== null;

//         if (useForced) {
//           console.log(
//             `Using forced checkpoint index: ${forcedFinalCheckpointIndex}`,
//           );
//           const targetIndex = Math.min(
//             Math.max(forcedFinalCheckpointIndex!, 0),
//             checkpoints.length - 1,
//           );
//           const existingCp = part.checkpointData?.find(
//             (cp) => cp.checkpointIndex === targetIndex,
//           );
//           const statusFromCp = existingCp?.status as
//             | "pass"
//             | "fail"
//             | undefined;
//           const status = statusFromCp || finalStatuses[i] || "pass";

//           const customData = existingCp?.customData || {};
//           const finalCheckpointValue = checkpoints[targetIndex] ?? 0;

//           const updatedPart: Part = {
//             ...part,
//             isCompleted: true,
//             completedAt: new Date().toISOString(),
//             checkpointInfo: {
//               ...part.checkpointInfo,
//               checkpointIndex: targetIndex + 1,
//             },
//           };

//           updatedParts.push(updatedPart);

//           finalData.push({
//             partIndex: i,
//             partNumber: part.partNumber,
//             serialNumber: part.serialNumber,
//             status,
//             customData,
//             testValue: part.testValue,
//             checkpointValue: finalCheckpointValue,
//           });

//           setUploadProgress((prev) => ({
//             ...prev,
//             [i]: 100,
//           }));
//           continue;
//         }

//         // Process normal completion with image uploads
//         const uploadedByColumn: Record<string, string[]> = {};
//         const uploadsRequired = imageColumns.length > 0 ? imageColumns : [];

//         console.log(
//           `Uploads required for ${part.partNumber}: ${uploadsRequired.length} columns`,
//         );

//         // Validate uploads before proceeding
//         for (const col of uploadsRequired) {
//           const files = finalPostImages[`${i}-${col.id}`] || [];
//           console.log(`Column ${col.id}: ${files.length} files to upload`);
//           if (files.length === 0) {
//             // ← REPLACED alert()
//             addToast(
//               `Please upload images for ${col.name || col.id} for part ${part.partNumber}`,
//               "warning",
//               5000,
//             );
//             setIsUploading(false);
//             return;
//           }
//         }

//         const status = hasNoCheckpoints
//           ? (part.checkpointData?.[0]?.status as "pass" | "fail") || "pass"
//           : finalStatuses[i];

//         console.log(`Final status for ${part.partNumber}: ${status}`);

//         const finalCheckpointIndex = hasNoCheckpoints
//           ? 0
//           : Math.max(checkpoints.length - 1, 0);
//         const finalCheckpointValue = hasNoCheckpoints
//           ? part.testValue || 0
//           : checkpoints[finalCheckpointIndex];
//         const preCheckpointIndex = hasNoCheckpoints
//           ? -1
//           : finalCheckpointIndex - 1;

//         console.log(
//           `Final checkpoint: index=${finalCheckpointIndex}, value=${finalCheckpointValue}`,
//         );

//         const totalImages = uploadsRequired.reduce(
//           (acc, col) => acc + (finalPostImages[`${i}-${col.id}`]?.length || 0),
//           0,
//         );
//         console.log(`Total images to upload: ${totalImages}`);

//         let uploadedCount = 0;

//         for (const col of uploadsRequired) {
//           const files = finalPostImages[`${i}-${col.id}`] || [];
//           uploadedByColumn[col.id] = [];

//           console.log(`Uploading ${files.length} images for column ${col.id}`);

//           if (files.length === 0) {
//             console.warn(`No files for column ${col.id}, using empty array`);
//             uploadedByColumn[col.id] = [];
//             continue;
//           }

//           for (let j = 0; j < files.length; j++) {
//             const file = files[j];
//             console.log(
//               `Uploading image ${j + 1}/${files.length} for ${col.id}`,
//             );

//             try {
//               const imageUrl = await uploadImageToServer(
//                 file,
//                 part.serialNumber || part.partNumber,
//                 finalCheckpointValue,
//                 col.id,
//               );
//               console.log(`✅ Uploaded ${col.id} image:`, imageUrl);
//               uploadedByColumn[col.id].push(imageUrl);
//               uploadedCount++;

//               const progress = Math.min(
//                 100,
//                 (uploadedCount / totalImages) * 100,
//               );
//               setUploadProgress((prev) => ({
//                 ...prev,
//                 [i]: progress,
//               }));
//               console.log(
//                 `Upload progress: ${uploadedCount}/${totalImages} (${progress}%)`,
//               );
//             } catch (uploadError) {
//               console.error(
//                 `Failed to upload image for ${col.id}:`,
//                 uploadError,
//               );
//             }
//           }
//         }

//         const customData: Record<string, string> = {};

//         Object.entries(uploadedByColumn).forEach(([columnId, paths]) => {
//           const cleanPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
//           customData[columnId] = JSON.stringify(cleanPaths);
//           console.log(`✅ Stored ${columnId} images:`, cleanPaths);
//         });

//         imageColumns.forEach((col) => {
//           if (!customData[col.id]) {
//             customData[col.id] = "[]";
//           }
//         });

//         nonImageColumns.forEach((col) => {
//           const currentVal = getFinalCustomValue(
//             i,
//             col.id,
//             getCustomColumnValue(part, lookupIndex, finalCheckpointIndex, col),
//           );
//           const fallbackVal =
//             preCheckpointIndex >= 0
//               ? getCustomColumnValue(part, lookupIndex, preCheckpointIndex, col)
//               : "";
//           const selected = currentVal || fallbackVal;
//           if (
//             selected !== undefined &&
//             selected !== null &&
//             `${selected}`.length > 0
//           ) {
//             customData[col.id] = selected;
//           }
//         });

//         console.log("Final customData:", customData);

//         const finalCheckpointData = {
//           checkpointIndex: finalCheckpointIndex,
//           checkpointValue: finalCheckpointValue,
//           label: "Final Test",
//           testDate: new Date().toISOString(),
//           cosmeticImages: [],
//           nonCosmeticImages: [],
//           status: status,
//           customData,
//           submittedAt: new Date().toISOString(),
//         };

//         console.log("Final checkpoint data:", finalCheckpointData);

//         const updatedPart: Part = {
//           ...part,
//           isCompleted: true,
//           completedAt: new Date().toISOString(),
//           checkpointData: [
//             ...(part.checkpointData || []).filter(
//               (cp) => cp.checkpointIndex !== finalCheckpointIndex,
//             ),
//             finalCheckpointData,
//           ].sort((a, b) => a.checkpointIndex - b.checkpointIndex),
//           checkpointInfo: {
//             ...part.checkpointInfo,
//             checkpointIndex: finalCheckpointIndex + 1,
//           },
//         };

//         console.log("Updated part:", {
//           partNumber: updatedPart.partNumber,
//           checkpointData: updatedPart.checkpointData,
//         });

//         updatedParts.push(updatedPart);

//         finalData.push({
//           partIndex: i,
//           partNumber: part.partNumber,
//           serialNumber: part.serialNumber,
//           status,
//           customData,
//           testValue: part.testValue,
//           checkpointValue: finalCheckpointValue,
//         });

//         setUploadProgress((prev) => ({
//           ...prev,
//           [i]: 100,
//         }));

//         console.log(`✅ Completed processing part ${part.partNumber}`);
//       }

//       console.log("\n=== FINAL SUBMISSION DATA ===");
//       console.log("finalData:", finalData);
//       console.log("updatedParts:", updatedParts);

//       onSubmit(finalData, updatedParts);
//     } catch (error) {
//       console.error("Error during final submission:", error);
//       // ← REPLACED alert()
//       addToast(
//         "Failed to complete unload. Please try again. Check console for details.",
//         "error",
//         6000,
//       );
//     } finally {
//       setIsUploading(false);
//       console.log("=== handleSubmitAll END ===");
//     }
//   };

//   const renderImagePreviews = (files: File[]) => {
//     return (
//       <div className="flex gap-1 mt-1 justify-center">
//         {files.map((file, i) => (
//           <img
//             key={i}
//             src={URL.createObjectURL(file)}
//             alt={`preview-${i}`}
//             className="w-8 h-8 object-cover rounded"
//           />
//         ))}
//       </div>
//     );
//   };

//   const renderImageArray = (images: string[], altPrefix: string) => {
//     if (images.length === 0) {
//       return <span className="text-gray-400 text-sm">-</span>;
//     }

//     return (
//       <div className="flex gap-2">
//         {images.map((url, i) => {
//           const src = url.startsWith("/") ? `${getBackendApiUrl()}${url}` : url;
//           return (
//             <img
//               key={i}
//               src={src}
//               alt={`${altPrefix}-${i}`}
//               className="w-10 h-10 object-cover rounded cursor-pointer"
//               onClick={() => window.open(src, "_blank")}
//             />
//           );
//         })}
//       </div>
//     );
//   };

//   const renderCustomValue = (value: string, column: CustomColumn) => {
//     if (!value) {
//       return <span className="text-gray-400 text-sm">-</span>;
//     }

//     if (column.type === "date") {
//       return <span className="text-sm">{formatDate(value)}</span>;
//     }

//     return <span className="text-sm break-words">{value}</span>;
//   };

//   const getFinalCustomValue = (
//     partIndex: number,
//     columnId: string,
//     fallback: string,
//   ) => finalCustomValues[`${partIndex}-${columnId}`] ?? fallback;

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-6">
//       {/* Toast notifications */}
//       <ToastContainer toasts={toasts} onRemove={removeToast} />

//       <div className="max-w-7xl mx-auto">
//         <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
//           <div className="flex justify-between items-center mb-6">
//             <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
//               Unload - Chamber Snapshot
//             </h1>
//             <div className="flex items-center space-x-3">
//               <div className="text-sm text-green-600">✓ All parts scanned</div>
//               <button
//                 onClick={onBack}
//                 className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//               >
//                 Back
//               </button>
//             </div>
//           </div>

//           <MachineDetails chamberData={chamberData} />
//           <CheckpointProgress parts={chamberData.parts} />

//           {isUploading && (
//             <div className="mb-6 p-4 bg-blue-50 rounded-lg">
//               <h3 className="font-semibold text-blue-700 mb-2">
//                 Uploading Images...
//               </h3>
//               {partsToShow.map((part, index) => {
//                 const progress = uploadProgress[index] || 0;
//                 return (
//                   <div key={index} className="mb-2">
//                     <div className="flex justify-between text-sm text-gray-600 mb-1">
//                       <span>
//                         {part.partNumber} - {part.serialNumber}
//                       </span>
//                       <span>{Math.round(progress)}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-2">
//                       <div
//                         className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//                         style={{ width: `${progress}%` }}
//                       ></div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-700 mb-4">
//               Final Data Entry for All Parts
//             </h2>
//             <p className="text-gray-600 mb-4">
//               Enter final test data for each part. All parts will be unloaded
//               together.
//             </p>
//           </div>

//           {partsToShow.map((part, index) => {
//             const realIndex = resolvePartIndex(part, index);
//             const checkpoints = getCheckpointsForPart(part);
//             const hasNoCheckpoints =
//               checkpoints.length === 0 ||
//               (checkpoints.length === 1 && checkpoints[0] === 0);
//             const imageColumns = getImageColumnsForPart(index);
//             const nonImageColumns = getNonImageColumnsForPart(index);
//             const latestStatus = getLatestCheckpointStatus(part);
//             const isFailed = latestStatus === "fail";
//             const failedAt = isFailed ? getLatestFailCheckpoint(part) : null;

//             const currentCheckpointIndex =
//               part.checkpointInfo?.checkpointIndex ?? checkpoints.length - 1;
//             const plannedFinalIndex = Math.max(checkpoints.length - 1, 0);

//             const unitSuffix = (value: number) => {
//               const unit = part.testUnit;
//               if (!unit) return `${value}hr`;
//               const u = unit.trim().toLowerCase();
//               if (u.startsWith("hour") || u.startsWith("hr"))
//                 return `${value}hr`;
//               if (u.startsWith("cycle")) return `${value}cycle`;
//               if (u.startsWith("drop")) return `${value}drop`;
//               return `${value}${u || "hr"}`;
//             };

//             let finalCheckpointValue: number;
//             let finalCheckpointLabel: string;
//             let preCheckpointIndex: number;
//             let finalCheckpointIndex: number;

//             if (hasNoCheckpoints) {
//               finalCheckpointValue = part.testValue || 0;
//               finalCheckpointLabel = part.testValue
//                 ? `Total: ${unitSuffix(finalCheckpointValue)}`
//                 : "No Checkpoints";
//               preCheckpointIndex = -1;
//               finalCheckpointIndex = 0;
//             } else if (isFailed) {
//               const targetIndex =
//                 failedAt?.checkpointIndex ?? currentCheckpointIndex;
//               finalCheckpointValue = checkpoints[targetIndex] ?? 0;
//               finalCheckpointLabel = unitSuffix(finalCheckpointValue);
//               preCheckpointIndex = targetIndex - 1;
//               finalCheckpointIndex = targetIndex;
//             } else {
//               const targetIndex =
//                 forcedFinalCheckpointIndex !== undefined &&
//                 forcedFinalCheckpointIndex !== null
//                   ? Math.min(
//                       Math.max(forcedFinalCheckpointIndex, 0),
//                       plannedFinalIndex,
//                     )
//                   : Math.min(
//                       plannedFinalIndex,
//                       Math.max(0, currentCheckpointIndex + 1),
//                     );
//               finalCheckpointValue =
//                 checkpoints[targetIndex] ?? checkpoints[plannedFinalIndex] ?? 0;
//               finalCheckpointLabel = unitSuffix(finalCheckpointValue);
//               preCheckpointIndex = targetIndex - 1;
//               finalCheckpointIndex = targetIndex;
//             }

//             const preCheckpointData =
//               preCheckpointIndex >= 0
//                 ? part.checkpointData?.find(
//                     (cp) => cp.checkpointIndex === preCheckpointIndex,
//                   )
//                 : null;
//             const preImagesByColumn: Record<string, string[]> = {};
//             imageColumns.forEach((col) => {
//               preImagesByColumn[col.id] = preCheckpointData
//                 ? getImagesForCheckpoint(realIndex, preCheckpointIndex, col.id)
//                 : [];
//             });

//             const postImagesByColumn: Record<string, string[]> = {};
//             imageColumns.forEach((col) => {
//               postImagesByColumn[col.id] = isFailed
//                 ? getImagesForCheckpoint(
//                     realIndex,
//                     failedAt?.checkpointIndex ?? checkpoints.length - 1,
//                     col.id,
//                   )
//                 : [];
//             });

//             return (
//               <div
//                 key={part.serialNumber}
//                 className="mb-8 border border-gray-300 rounded-lg p-4"
//               >
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="text-lg font-semibold text-gray-800">
//                     {part.partNumber} - {part.serialNumber}
//                   </h3>
//                   <div
//                     className={`px-3 py-1 rounded text-sm font-medium ${
//                       isFailed
//                         ? "bg-red-100 text-red-800"
//                         : hasNoCheckpoints
//                           ? "bg-yellow-100 text-yellow-800"
//                           : "bg-green-100 text-green-800"
//                     }`}
//                   >
//                     {isFailed
//                       ? "FAILED"
//                       : hasNoCheckpoints
//                         ? "NO CHECKPOINTS"
//                         : "COMPLETED"}
//                   </div>
//                 </div>

//                 <PartDetails part={part} index={realIndex} />

//                 <div className="mt-4">
//                   <h4 className="font-semibold text-gray-700 mb-3">
//                     Checkpoint History & Final Data
//                   </h4>
//                   <div className="overflow-x-auto">
//                     <table className="w-full border-collapse">
//                       <thead>
//                         <tr className="bg-gray-50">
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             S.No
//                           </th>
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             Checkpoint
//                           </th>
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             Label
//                           </th>
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             Test Date
//                           </th>
//                           {nonImageColumns.map((col) => (
//                             <th
//                               key={`custom-${col.id}`}
//                               className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
//                             >
//                               {col.name}
//                             </th>
//                           ))}
//                           {imageColumns.map((col) => (
//                             <th
//                               key={`pre-${col.id}`}
//                               className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
//                             >
//                               Pre {col.name}
//                             </th>
//                           ))}
//                           {imageColumns.map((col) => (
//                             <th
//                               key={`post-${col.id}`}
//                               className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
//                             >
//                               Post {col.name}
//                             </th>
//                           ))}
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             Status
//                           </th>
//                           <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
//                             Final
//                           </th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {(() => {
//                           const allCheckpoints = part.checkpointData || [];
//                           const checkpointsToShow = allCheckpoints
//                             .filter(
//                               (cp) =>
//                                 cp.checkpointIndex !==
//                                 (failedAt?.checkpointIndex ||
//                                   checkpoints.length - 1),
//                             )
//                             .sort(
//                               (a, b) => a.checkpointIndex - b.checkpointIndex,
//                             );

//                           if (
//                             hasNoCheckpoints &&
//                             checkpointsToShow.length === 0
//                           ) {
//                             checkpointsToShow.push({
//                               checkpointIndex: 0,
//                               checkpointValue: 0,
//                               label: "Pre-Test",
//                               testDate:
//                                 part.loadedAt || new Date().toISOString(),
//                               cosmeticImages: [],
//                               nonCosmeticImages: [],
//                               status: "",
//                               customData: {},
//                               submittedAt:
//                                 part.loadedAt || new Date().toISOString(),
//                             });
//                           }

//                           const checkpointsWithSubmissions =
//                             checkpointsToShow.map((checkpoint) => {
//                               const storedCheckpoint =
//                                 submittedCheckpoints[
//                                   `${realIndex}-${checkpoint.checkpointIndex}`
//                                 ];
//                               return storedCheckpoint || checkpoint;
//                             });

//                           return checkpointsWithSubmissions.map(
//                             (checkpoint, idx) => {
//                               const isStoredCheckpoint =
//                                 "partIndex" in checkpoint;
//                               const displayCheckpoint = isStoredCheckpoint
//                                 ? (checkpoint as CheckpointSubmission)
//                                 : checkpoint;

//                               const checkpointLabel = getCheckpointLabel(
//                                 displayCheckpoint.checkpointValue ||
//                                   checkpoint.checkpointValue ||
//                                   0,
//                                 displayCheckpoint.checkpointIndex,
//                                 part.testUnit,
//                               );

//                               const label =
//                                 displayCheckpoint.checkpointIndex === 0
//                                   ? "Pre-Test"
//                                   : "Post-Test";

//                               const status = isStoredCheckpoint
//                                 ? (checkpoint as CheckpointSubmission).status
//                                 : checkpoint.status;

//                               const normalizedStatus =
//                                 latestStatus === "pass" && status === "fail"
//                                   ? "pass"
//                                   : status;

//                               const testDate = isStoredCheckpoint
//                                 ? (checkpoint as CheckpointSubmission).testDate
//                                 : checkpoint.testDate;

//                               return (
//                                 <tr
//                                   key={checkpoint.checkpointIndex}
//                                   className="bg-green-50"
//                                 >
//                                   <td className="border border-gray-300 px-2 py-2 text-sm text-center">
//                                     {idx + 1}
//                                   </td>
//                                   <td className="border border-gray-300 px-2 py-2 text-sm font-medium">
//                                     {checkpointLabel}
//                                   </td>
//                                   <td className="border border-gray-300 px-2 py-2 text-sm">
//                                     {label}
//                                   </td>
//                                   <td className="border border-gray-300 px-2 py-2 text-sm">
//                                     {formatDate(testDate)}
//                                   </td>

//                                   {nonImageColumns.map((col) => {
//                                     const value = getCustomColumnValue(
//                                       part,
//                                       realIndex,
//                                       displayCheckpoint.checkpointIndex,
//                                       col,
//                                     );

//                                     return (
//                                       <td
//                                         key={`custom-${checkpoint.checkpointIndex}-${col.id}`}
//                                         className="border border-gray-300 px-4 py-3"
//                                       >
//                                         {renderCustomValue(value, col)}
//                                       </td>
//                                     );
//                                   })}

//                                   {imageColumns.map((col) => {
//                                     const imgs = getImagesForCheckpoint(
//                                       realIndex,
//                                       displayCheckpoint.checkpointIndex,
//                                       col.id,
//                                     );
//                                     const isT0 =
//                                       displayCheckpoint.checkpointIndex === 0;

//                                     return (
//                                       <td
//                                         key={`pre-${checkpoint.checkpointIndex}-${col.id}`}
//                                         className="border border-gray-300 px-4 py-3"
//                                       >
//                                         {isT0 ? (
//                                           renderImageArray(
//                                             imgs,
//                                             `pre-${col.id}`,
//                                           )
//                                         ) : (
//                                           <span className="text-gray-400 text-sm">
//                                             -
//                                           </span>
//                                         )}
//                                       </td>
//                                     );
//                                   })}

//                                   {imageColumns.map((col) => {
//                                     const imgs = getImagesForCheckpoint(
//                                       realIndex,
//                                       displayCheckpoint.checkpointIndex,
//                                       col.id,
//                                     );
//                                     const isT0 =
//                                       displayCheckpoint.checkpointIndex === 0;

//                                     return (
//                                       <td
//                                         key={`post-${checkpoint.checkpointIndex}-${col.id}`}
//                                         className="border border-gray-300 px-4 py-3"
//                                       >
//                                         {!isT0 ? (
//                                           renderImageArray(
//                                             imgs,
//                                             `post-${col.id}`,
//                                           )
//                                         ) : (
//                                           <span className="text-gray-400 text-sm">
//                                             -
//                                           </span>
//                                         )}
//                                       </td>
//                                     );
//                                   })}

//                                   <td className="border border-gray-300 px-4 py-3">
//                                     {displayCheckpoint.checkpointIndex === 0 ? (
//                                       <span className="text-gray-500 text-xs">
//                                         N/A
//                                       </span>
//                                     ) : (
//                                       <span
//                                         className={`px-2 py-1 text-xs rounded font-medium ${
//                                           normalizedStatus === "pass"
//                                             ? "bg-green-100 text-green-800"
//                                             : normalizedStatus === "fail"
//                                               ? "bg-red-100 text-red-800"
//                                               : "bg-gray-100 text-gray-800"
//                                         }`}
//                                       >
//                                         {normalizedStatus === "pass"
//                                           ? "✓ Pass"
//                                           : normalizedStatus === "fail"
//                                             ? "✗ Fail"
//                                             : "Pending"}
//                                       </span>
//                                     )}
//                                   </td>

//                                   <td className="border border-gray-300 px-4 py-3 text-center">
//                                     {displayCheckpoint.checkpointIndex > 0 &&
//                                     normalizedStatus ? (
//                                       <span className="text-green-600 text-xs font-medium">
//                                         ✓ Submitted
//                                       </span>
//                                     ) : displayCheckpoint.checkpointIndex ===
//                                       0 ? (
//                                       <span className="text-blue-600 text-xs font-medium">
//                                         T0 Complete
//                                       </span>
//                                     ) : (
//                                       <span className="text-gray-400 text-xs">
//                                         Pending
//                                       </span>
//                                     )}
//                                   </td>
//                                 </tr>
//                               );
//                             },
//                           );
//                         })()}

//                         {/* Single Final Row */}
//                         <tr
//                           className={
//                             isFailed
//                               ? "bg-red-50"
//                               : hasNoCheckpoints
//                                 ? "bg-yellow-50"
//                                 : "bg-blue-50"
//                           }
//                         >
//                           <td className="border border-gray-300 px-2 py-2 text-sm text-center">
//                             {(part.checkpointData?.length || 0) + 1}
//                           </td>
//                           <td className="border border-gray-300 px-2 py-2 text-sm font-medium">
//                             {finalCheckpointLabel}
//                           </td>
//                           <td className="border border-gray-300 px-2 py-2 text-sm">
//                             {isFailed ? "Failed Test" : "Final Test"}
//                           </td>
//                           <td className="border border-gray-300 px-2 py-2 text-sm">
//                             {failedAt?.testDate
//                               ? formatDate(failedAt.testDate)
//                               : formatDate(new Date().toISOString())}
//                           </td>

//                           {nonImageColumns.map((col) => {
//                             const baseValue = getCustomColumnValue(
//                               part,
//                               realIndex,
//                               finalCheckpointIndex,
//                               col,
//                             );
//                             const value = getFinalCustomValue(
//                               index,
//                               col.id,
//                               baseValue,
//                             );

//                             const onChange = (newVal: string) => {
//                               setFinalCustomValues((prev) => ({
//                                 ...prev,
//                                 [`${index}-${col.id}`]: newVal,
//                               }));
//                             };

//                             return (
//                               <td
//                                 key={`final-custom-${col.id}`}
//                                 className="border border-gray-300 px-4 py-3"
//                               >
//                                 {col.type === "dropdown" ? (
//                                   <select
//                                     className="border rounded px-2 py-1 text-sm w-full"
//                                     value={value}
//                                     onChange={(e) => onChange(e.target.value)}
//                                   >
//                                     <option value="">Select...</option>
//                                     {col.options.map((opt) => (
//                                       <option key={opt} value={opt}>
//                                         {opt}
//                                       </option>
//                                     ))}
//                                   </select>
//                                 ) : col.type === "date" ? (
//                                   <input
//                                     type="date"
//                                     className="border rounded px-2 py-1 text-sm w-full"
//                                     value={value}
//                                     onChange={(e) => onChange(e.target.value)}
//                                   />
//                                 ) : col.type === "number" ? (
//                                   <input
//                                     type="number"
//                                     className="border rounded px-2 py-1 text-sm w-full"
//                                     value={value}
//                                     onChange={(e) => onChange(e.target.value)}
//                                   />
//                                 ) : (
//                                   <input
//                                     type="text"
//                                     className="border rounded px-2 py-1 text-sm w-full"
//                                     value={value}
//                                     onChange={(e) => onChange(e.target.value)}
//                                     placeholder={`Enter ${col.name}`}
//                                   />
//                                 )}
//                               </td>
//                             );
//                           })}

//                           {imageColumns.map((col) => {
//                             const imgs = preImagesByColumn[col.id] || [];
//                             return (
//                               <td
//                                 key={`final-pre-${col.id}`}
//                                 className="border border-gray-300 px-4 py-3"
//                               >
//                                 {renderImageArray(imgs, `final-pre-${col.id}`)}
//                               </td>
//                             );
//                           })}

//                           {imageColumns.map((col) => {
//                             const uploadedFiles =
//                               finalPostImages[`${index}-${col.id}`];
//                             const postImgs = postImagesByColumn[col.id] || [];

//                             return (
//                               <td
//                                 key={`final-post-${col.id}`}
//                                 className="border border-gray-300 px-4 py-3"
//                               >
//                                 {isFailed ? (
//                                   renderImageArray(
//                                     postImgs,
//                                     `failed-post-${col.id}`,
//                                   )
//                                 ) : (
//                                   <div className="p-1 text-center">
//                                     <label className="cursor-pointer inline-block w-full text-xs text-blue-600 font-medium hover:text-blue-700">
//                                       Upload Images for {col.name}
//                                       <input
//                                         className="hidden"
//                                         type="file"
//                                         accept="image/*"
//                                         multiple
//                                         onChange={(e) => {
//                                           console.log(
//                                             `File selected for ${col.id}:`,
//                                             e.target.files?.length,
//                                           );
//                                           handleFinalImageUpload(
//                                             index,
//                                             col.id,
//                                             e.target.files,
//                                           );
//                                         }}
//                                       />
//                                     </label>
//                                     {uploadedFiles &&
//                                       uploadedFiles.length > 0 && (
//                                         <div className="mt-2">
//                                           <span className="text-xs text-green-600">
//                                             {uploadedFiles.length} file(s) ready
//                                           </span>
//                                           {renderImagePreviews(uploadedFiles)}
//                                         </div>
//                                       )}
//                                   </div>
//                                 )}
//                               </td>
//                             );
//                           })}

//                           <td className="border border-gray-300 px-4 py-3">
//                             {isFailed ? (
//                               <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-medium">
//                                 Fail
//                               </span>
//                             ) : (
//                               <select
//                                 value={
//                                   (finalStatuses[index] as
//                                     | "pass"
//                                     | "fail"
//                                     | "") ??
//                                   (hasNoCheckpoints
//                                     ? (part.checkpointData?.[0]?.status as
//                                         | "pass"
//                                         | "fail"
//                                         | "") || ""
//                                     : "")
//                                 }
//                                 onChange={(e) =>
//                                   handleFinalStatusChange(
//                                     index,
//                                     e.target.value as "pass" | "fail" | "",
//                                   )
//                                 }
//                                 className="border rounded px-2 py-1 text-sm w-full"
//                               >
//                                 <option value="">-- Select --</option>
//                                 <option value="pass">Pass</option>
//                                 <option value="fail">Fail</option>
//                               </select>
//                             )}
//                           </td>

//                           <td className="border border-gray-300 px-4 py-3 text-center">
//                             {isFailed ? (
//                               <div className="space-y-1">
//                                 <span className="text-green-600 text-xs">
//                                   ✓ Submitted
//                                 </span>
//                                 {imageColumns.map((col) => {
//                                   const hasImages =
//                                     postImagesByColumn[col.id]?.length > 0;
//                                   return (
//                                     <div
//                                       key={`failed-status-${col.id}`}
//                                       className={`text-xs ${hasImages ? "text-green-600" : "text-gray-500"}`}
//                                     >
//                                       {hasImages
//                                         ? `✓ ${col.name} images`
//                                         : `No ${col.name} images`}
//                                     </div>
//                                   );
//                                 })}
//                               </div>
//                             ) : (
//                               <div className="space-y-1">
//                                 <div
//                                   className={`text-xs ${finalStatuses[index] ? "text-green-600" : "text-red-600"}`}
//                                 >
//                                   {finalStatuses[index]
//                                     ? "✓ Status selected"
//                                     : "✗ Select status"}
//                                 </div>
//                                 {imageColumns.map((col) => {
//                                   const hasUpload =
//                                     (finalPostImages[`${index}-${col.id}`]
//                                       ?.length || 0) > 0;
//                                   return (
//                                     <div
//                                       key={`upload-status-${col.id}`}
//                                       className={`text-xs ${hasUpload ? "text-green-600" : "text-red-600"}`}
//                                     >
//                                       {hasUpload
//                                         ? `✓ ${col.name} uploaded`
//                                         : `✗ Upload ${col.name}`}
//                                     </div>
//                                   );
//                                 })}
//                               </div>
//                             )}
//                           </td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}

//           <div className="mt-8 pt-6 border-t border-gray-200">
//             <div className="flex justify-between items-center">
//               <button
//                 onClick={onBack}
//                 className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//               >
//                 Back to Scan
//               </button>
//               <div className="flex items-center gap-4">
//                 <button
//                   onClick={handleSubmitAll}
//                   disabled={!canSubmitAll() || isUploading}
//                   className={`px-6 py-3 rounded-lg font-semibold ${
//                     canSubmitAll() && !isUploading
//                       ? "bg-green-600 hover:bg-green-700 text-white"
//                       : "bg-gray-200 text-gray-500 cursor-not-allowed"
//                   }`}
//                 >
//                   {isUploading ? "Uploading..." : "Complete Unload"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UnloadDataEntry;



import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  ChamberData,
  Part,
  CheckpointLabels,
  CustomColumn,
  CustomColumnData,
  CheckpointSubmissions,
  CheckpointSubmission,
} from "../types";
import {
  formatDate,
  getCheckpointsForPart,
  getCheckpointLabel,
} from "../utils/helpers";
import MachineDetails from "./MachineDetails";
import CheckpointProgress from "./CheckpointProgress";
import PartDetails from "./PartDetails";
import { getBackendApiUrl } from "@/lib/backendApi";

// ─── Toast System ────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;

const toastStyles: Record<
  ToastType,
  { bg: string; border: string; icon: string; text: string }
> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-400",
    icon: "✓",
    text: "text-green-800",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-400",
    icon: "✗",
    text: "text-red-800",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    icon: "⚠",
    text: "text-yellow-800",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: "ℹ",
    text: "text-blue-800",
  },
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onRemove: (id: number) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const s = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto
              ${s.bg} ${s.border} ${s.text}
              animate-[slideIn_0.2s_ease-out]`}
            style={{
              animation: "slideIn 0.2s ease-out",
            }}
          >
            <span className="text-lg font-bold leading-none mt-0.5 flex-shrink-0">
              {s.icon}
            </span>
            <p className="flex-1 text-sm font-medium leading-snug">
              {toast.message}
            </p>
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
};

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface UnloadDataEntryProps {
  onBack: () => void;
  onSubmit: (finalData: FinalPartData[], updatedParts: Part[]) => void;
  chamberData: ChamberData;
  checkpointLabels: CheckpointLabels;
  customColumns: CustomColumn[];
  customColumnData: CustomColumnData;
  forcedFinalCheckpointIndex?: number | null;
  formatDate: (dateString: string | null) => string;
  onStatusChange: (
    partIndex: number,
    checkpointIndex: number,
    status: "pass" | "fail" | "",
  ) => void;
  onRowSubmit: (partIndex: number, checkpointIndex: number) => void;
  partsToShow: Part[];
  submittedCheckpoints: CheckpointSubmissions;
}

interface FinalPartData {
  partIndex: number;
  partNumber: string;
  serialNumber: string;
  status: "pass" | "fail" | "";
  customData?: Record<string, string>;
  testValue?: number;
  checkpointValue: number;
}

const UnloadDataEntry: React.FC<UnloadDataEntryProps> = ({
  onBack,
  onSubmit,
  chamberData,
  customColumns,
  customColumnData,
  partsToShow,
  formatDate,
  submittedCheckpoints,
  forcedFinalCheckpointIndex,
}) => {
  const { toasts, addToast, removeToast } = useToast();

  const parseImageList = (value?: string): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      if (Array.isArray(value)) return value;
      return [];
    }
  };

  const resolvePartIndex = (part: Part, fallbackIndex: number) => {
    if (part.serialNumber) {
      const matchBySerial = chamberData.parts.findIndex(
        (p) => p.serialNumber === part.serialNumber,
      );
      if (matchBySerial >= 0) return matchBySerial;
    }

    const matchByPartNumber = chamberData.parts.findIndex(
      (p) => p.partNumber === part.partNumber,
    );
    if (matchByPartNumber >= 0) return matchByPartNumber;

    return fallbackIndex;
  };

  // const visibleColumnsByPart = useMemo(() => {
  //   return partsToShow.map((part, displayIndex) => {
  //     const indexForKeys = resolvePartIndex(part, displayIndex);
  //     const indexPrefix = `${indexForKeys}-`;

  //     const hasImagesValue = (value?: string) => {
  //       const list = parseImageList(value);
  //       return list.length > 0;
  //     };

  //     const hasColumnData = (column: CustomColumn) => {
  //       const colId = column.id;

  //       const hasPending = Object.keys(customColumnData).some((key) => {
  //         if (!key.startsWith(indexPrefix) || !key.endsWith(`-${colId}`)) {
  //           return false;
  //         }
  //         return hasImagesValue(customColumnData[key]);
  //       });
  //       if (hasPending) return true;

  //       const hasSubmitted = Object.entries(submittedCheckpoints).some(
  //         ([key, submission]) => {
  //           if (!key.startsWith(indexPrefix)) return false;
  //           const val = submission.customData?.[colId];
  //           return hasImagesValue(val);
  //         },
  //       );
  //       if (hasSubmitted) return true;

  //       const hasCheckpointValue = part.checkpointData?.some((cp) =>
  //         cp.customData ? hasImagesValue(cp.customData[colId]) : false,
  //       );
  //       if (hasCheckpointValue) return true;

  //       if (Array.isArray(part.customImages)) {
  //         const normalizedId = (colId || "").trim().toLowerCase();
  //         const normalizedName = (column.name || "").trim().toLowerCase();
  //         const hasLabelMatch = part.customImages.some((img) => {
  //           const lbl = (img.label || "").trim().toLowerCase();
  //           return (
  //             (lbl === normalizedId || lbl === normalizedName) &&
  //             Boolean(img.path)
  //           );
  //         });
  //         if (hasLabelMatch) return true;
  //       }

  //       return false;
  //     };

  //     const visibleColumns = customColumns.filter((column) =>
  //       hasColumnData(column),
  //     );

  //     const imageColumns = visibleColumns.filter(
  //       (column) => column.type === "image",
  //     );

  //     const nonImageColumns = visibleColumns.filter(
  //       (column) => column.type !== "image",
  //     );

  //     return { visibleColumns, imageColumns, nonImageColumns };
  //   });
  // }, [
  //   partsToShow,
  //   chamberData.parts,
  //   customColumns,
  //   customColumnData,
  //   submittedCheckpoints,
  // ]);

  const visibleColumnsByPart = useMemo(() => {
  return partsToShow.map((part, displayIndex) => {
    // Remove the hasColumnData filter entirely - show ALL columns
    const visibleColumns = customColumns;

    const imageColumns = visibleColumns.filter(
      (column) => column.type === "image",
    );

    const nonImageColumns = visibleColumns.filter(
      (column) => column.type !== "image",
    );

    return { visibleColumns, imageColumns, nonImageColumns };
  });
}, [
  partsToShow,
  customColumns,  // only dependency needed now
]);
  const getImageColumnsForPart = (partIndex: number) =>
    visibleColumnsByPart[partIndex]?.imageColumns || [];

  const getNonImageColumnsForPart = (partIndex: number) =>
    visibleColumnsByPart[partIndex]?.nonImageColumns || [];

  const getCustomColumnValue = (
    part: Part,
    displayIndex: number,
    checkpointIndex: number,
    column: CustomColumn,
  ): string => {
    const resolvedIndex = resolvePartIndex(part, displayIndex);
    const key = `${resolvedIndex}-${checkpointIndex}-${column.id}`;

    if (customColumnData[key] !== undefined) {
      return customColumnData[key];
    }

    const submitted =
      submittedCheckpoints[`${resolvedIndex}-${checkpointIndex}`];
    if (
      submitted?.customData &&
      submitted.customData[column.id] !== undefined
    ) {
      return submitted.customData[column.id] ?? "";
    }

    const targetPart =
      chamberData.parts[resolvedIndex] || partsToShow[displayIndex] || part;

    const checkpointEntry = targetPart.checkpointData?.find(
      (cp) => cp.checkpointIndex === checkpointIndex,
    );

    if (
      checkpointEntry?.customData &&
      checkpointEntry.customData[column.id] !== undefined
    ) {
      return checkpointEntry.customData[column.id] ?? "";
    }

    if (
      column.type === "image" &&
      checkpointIndex === 0 &&
      Array.isArray(targetPart.customImages)
    ) {
      const columnLabel = (column.name || column.id || "").trim().toLowerCase();
      const matches = targetPart.customImages
        .filter((img) => (img.label || "").trim().toLowerCase() === columnLabel)
        .map((img) => img.path)
        .filter(Boolean);

      if (matches.length > 0) {
        return JSON.stringify(matches);
      }
    }

    return "";
  };

  const [finalStatuses, setFinalStatuses] = useState<
    Record<number, "pass" | "fail" | "">
  >({});
  const [finalPostImages, setFinalPostImages] = useState<
    Record<string, File[]>
  >({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const [finalCustomValues, setFinalCustomValues] = useState<
    Record<string, string>
  >({});

  const getLatestCheckpointStatus = (part: Part): "pass" | "fail" | null => {
    if (!Array.isArray(part.checkpointData)) return null;
    const sorted = [...part.checkpointData].sort(
      (a, b) => b.checkpointIndex - a.checkpointIndex,
    );
    const latest = sorted.find(
      (cp) => cp.status !== null && cp.status !== undefined,
    );
    return (latest?.status as "pass" | "fail" | null) ?? null;
  };

  const getLatestFailCheckpoint = (part: Part) => {
    if (!Array.isArray(part.checkpointData)) return null;
    const sorted = [...part.checkpointData].sort(
      (a, b) => b.checkpointIndex - a.checkpointIndex,
    );
    const latestFail = sorted.find((cp) => cp.status === "fail");
    return latestFail || null;
  };

  // Debug logging
  useEffect(() => {
    if (partsToShow.length > 0) {
      console.log("DEBUG: First part data:", partsToShow[0]);
      const firstPartImages = getImageColumnsForPart(0);
      console.log("DEBUG: Image columns:", firstPartImages);

      firstPartImages.forEach((col) => {
        const images = getImagesForCheckpoint(0, 0, col.id);
        console.log(
          `DEBUG: Column ${col.id} (${col.name}) has ${images.length} T0 images`,
        );
      });
    }
  }, [partsToShow, visibleColumnsByPart]);

  const handleFinalStatusChange = (
    partIndex: number,
    value: "pass" | "fail" | "",
  ) => {
    setFinalStatuses((prev) => ({
      ...prev,
      [partIndex]: value,
    }));
  };

  const handleFinalImageUpload = (
    partIndex: number,
    columnId: string,
    files: FileList | null,
  ) => {
    if (!files) return;

    const fileArray = Array.from(files);
    console.log(
      `Uploaded ${fileArray.length} files for part ${partIndex}, column ${columnId}`,
    );

    setFinalPostImages((prev) => ({
      ...prev,
      [`${partIndex}-${columnId}`]: fileArray,
    }));
  };

  const getImagesForCheckpoint = (
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
  ): string[] => {
    const submittedKey = `${partIndex}-${checkpointIndex}`;
    const submitted = submittedCheckpoints[submittedKey];
    if (submitted?.customData?.[columnId]) {
      const images = parseImageList(submitted.customData[columnId]);
      console.log(
        `Found ${images.length} images in submitted checkpoints for ${columnId}`,
      );
      return images;
    }

    const resolvedIndex = Math.max(
      0,
      Math.min(partIndex, chamberData.parts.length - 1),
    );
    const part =
      chamberData.parts[resolvedIndex] ||
      partsToShow[partIndex] ||
      partsToShow[0];

    if (
      checkpointIndex === 0 &&
      part.customImages &&
      part.customImages.length > 0
    ) {
      const t0Images = part.customImages
        .filter((img) => img.label === columnId)
        .map((img) => img.path);

      if (t0Images.length > 0) {
        console.log(
          `Found ${t0Images.length} T0 images in customImages for ${columnId}`,
        );
        return t0Images;
      }
    }

    const checkpointEntry = part.checkpointData?.find(
      (cp) => cp.checkpointIndex === checkpointIndex,
    );

    if (checkpointEntry?.customData?.[columnId]) {
      const customDataImages = parseImageList(
        checkpointEntry.customData[columnId],
      );
      console.log(
        `Found ${customDataImages.length} images in customData for ${columnId}`,
      );
      return customDataImages;
    }

    if (checkpointEntry) {
      if (
        columnId === "cosmetic" &&
        checkpointEntry.cosmeticImages &&
        checkpointEntry.cosmeticImages.length > 0
      ) {
        return checkpointEntry.cosmeticImages;
      }
      if (
        columnId === "nonCosmetic" &&
        checkpointEntry.nonCosmeticImages &&
        checkpointEntry.nonCosmeticImages.length > 0
      ) {
        return checkpointEntry.nonCosmeticImages;
      }
    }

    return [];
  };

  // const canSubmitAll = () => {
  //   console.log("=== Checking canSubmitAll ===");
  //   const result = partsToShow.every((part, index) => {
  //     const imageColumns = getImageColumnsForPart(index);
  //     const isFailed = getLatestCheckpointStatus(part) === "fail";
  //     const hasNoCheckpoints =
  //       (part.checkpointInfo?.checkpoints?.length || 0) === 0 ||
  //       (part.checkpointInfo?.checkpoints?.length === 1 &&
  //         part.checkpointInfo.checkpoints[0] === 0);

  //     if (isFailed) {
  //       console.log(
  //         `Part ${part.partNumber} is failed - skipping requirements`,
  //       );
  //       return true;
  //     }

  //     if (
  //       forcedFinalCheckpointIndex !== undefined &&
  //       forcedFinalCheckpointIndex !== null
  //     ) {
  //       const targetIndex = forcedFinalCheckpointIndex;
  //       const cpEntry = part.checkpointData?.find(
  //         (cp) => cp.checkpointIndex === targetIndex,
  //       );
  //       const canSubmit = Boolean(cpEntry && cpEntry.status);
  //       console.log(`Part ${part.partNumber} forced checkpoint: ${canSubmit}`);
  //       return canSubmit;
  //     }

  //     const allImageColumnsPresent = imageColumns.every((col) => {
  //       const key = `${index}-${col.id}`;
  //       const hasUploads = (finalPostImages[key]?.length || 0) > 0;
  //       console.log(
  //         `  Column ${col.id}: ${hasUploads ? "✓" : "✗"} (${finalPostImages[key]?.length || 0} files)`,
  //       );
  //       return hasUploads;
  //     });

  //     if (hasNoCheckpoints) {
  //       console.log(
  //         `Part ${part.partNumber} (no checkpoints): images=${allImageColumnsPresent}`,
  //       );
  //       return allImageColumnsPresent;
  //     }

  //     const status = finalStatuses[index];
  //     const canSubmit = Boolean(status) && allImageColumnsPresent;
  //     console.log(
  //       `Part ${part.partNumber}: status=${status}, images=${allImageColumnsPresent}, canSubmit=${canSubmit}`,
  //     );
  //     return canSubmit;
  //   });

  //   console.log("=== canSubmitAll result:", result, "===");
  //   return result;
  // };

  const canSubmitAll = () => {
  const result = partsToShow.every((part, index) => {
    const imageColumns = getImageColumnsForPart(index);  // still only image cols
    const isFailed = getLatestCheckpointStatus(part) === "fail";
    const hasNoCheckpoints =
      (part.checkpointInfo?.checkpoints?.length || 0) === 0 ||
      (part.checkpointInfo?.checkpoints?.length === 1 &&
        part.checkpointInfo.checkpoints[0] === 0);

    if (isFailed) return true;

    if (forcedFinalCheckpointIndex !== undefined && forcedFinalCheckpointIndex !== null) {
      const cpEntry = part.checkpointData?.find(
        (cp) => cp.checkpointIndex === forcedFinalCheckpointIndex,
      );
      return Boolean(cpEntry && cpEntry.status);
    }

    // Only check image columns for upload requirement
    const allImageColumnsPresent = imageColumns.every((col) => {
      const key = `${index}-${col.id}`;
      return (finalPostImages[key]?.length || 0) > 0;
    });

    if (hasNoCheckpoints) {
      return allImageColumnsPresent;  // no status needed for no-checkpoint parts
    }

    const status = finalStatuses[index];
    return Boolean(status) && allImageColumnsPresent;
  });

  return result;
};

  const uploadImageToServer = async (
    file: File,
    partId: string,
    checkpointValue: number,
    columnId: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("partId", partId);
    formData.append("checkpointValue", checkpointValue.toString());
    formData.append("imageType", `custom-${columnId}`);

    console.log(
      `Uploading image for ${columnId}, part ${partId}, checkpoint ${checkpointValue}`,
    );

    try {
      const response = await fetch(
        `${getBackendApiUrl()}/uploads/part-images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(`Upload successful:`, data);
      const path = data?.path || data?.imageUrl;
      if (!path) {
        throw new Error("Upload succeeded but no path returned");
      }
      return path as string;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSubmitAll = async () => {
    console.log("=== handleSubmitAll START ===");
    console.log("finalPostImages:", finalPostImages);
    console.log("partsToShow count:", partsToShow.length);

    partsToShow.forEach((part, idx) => {
      console.log(`Part ${part.partNumber} (index ${idx}):`);
      const imageColumns = getImageColumnsForPart(idx);
      imageColumns.forEach((col) => {
        const key = `${idx}-${col.id}`;
        const files = finalPostImages[key] || [];
        console.log(`  ${col.id}: ${files.length} files`);
      });
    });

    const canSubmit = canSubmitAll();
    console.log("canSubmitAll result:", canSubmit);

    if (!canSubmit) {
      // ← REPLACED alert()
      addToast(
        "Please complete final status and upload post images for all completed parts. Check console for details.",
        "warning",
        6000,
      );
      return;
    }

    setIsUploading(true);
    console.log("Starting submission process...");

    const finalData: FinalPartData[] = [];
    const updatedParts: Part[] = [];

    try {
      for (let i = 0; i < partsToShow.length; i++) {
        const part = partsToShow[i];
        const lookupIndex = resolvePartIndex(part, i);
        console.log(`\n=== Processing part ${i}: ${part.partNumber} ===`);

        const checkpoints = getCheckpointsForPart(part);
        const imageColumns = getImageColumnsForPart(i);
        const nonImageColumns = getNonImageColumnsForPart(i);
        const isFailed = getLatestCheckpointStatus(part) === "fail";
        const hasNoCheckpoints =
          (part.checkpointInfo?.checkpoints?.length || 0) === 0 ||
          (part.checkpointInfo?.checkpoints?.length === 1 &&
            part.checkpointInfo.checkpoints[0] === 0);

        console.log(
          `isFailed: ${isFailed}, hasNoCheckpoints: ${hasNoCheckpoints}`,
        );

        if (isFailed) {
          console.log(`Part ${part.partNumber} is failed, using existing data`);
          const failureCheckpoint = getLatestFailCheckpoint(part);

          const nonImageColumns = getNonImageColumnsForPart(i);
          const customData: Record<string, string> = {
            ...(failureCheckpoint?.customData || {}),
          };

          nonImageColumns.forEach((col) => {
            const val = failureCheckpoint?.customData?.[col.id];
            if (val !== undefined) {
              customData[col.id] = val;
            }
          });

          imageColumns.forEach((col) => {
            const imgs = failureCheckpoint
              ? getImagesForCheckpoint(
                  lookupIndex,
                  failureCheckpoint.checkpointIndex,
                  col.id,
                )
              : [];
            if (imgs.length > 0) {
              customData[col.id] = JSON.stringify(imgs);
            } else {
              customData[col.id] = "[]";
            }
          });

          finalData.push({
            partIndex: i,
            partNumber: part.partNumber,
            serialNumber: part.serialNumber,
            status: "fail",
            customData,
            testValue: part.testValue,
            checkpointValue: failureCheckpoint?.checkpointValue || 0,
          });
          updatedParts.push(part);
          continue;
        }

        const useForced =
          forcedFinalCheckpointIndex !== undefined &&
          forcedFinalCheckpointIndex !== null;

        if (useForced) {
          console.log(
            `Using forced checkpoint index: ${forcedFinalCheckpointIndex}`,
          );
          const targetIndex = Math.min(
            Math.max(forcedFinalCheckpointIndex!, 0),
            checkpoints.length - 1,
          );
          const existingCp = part.checkpointData?.find(
            (cp) => cp.checkpointIndex === targetIndex,
          );
          const statusFromCp = existingCp?.status as
            | "pass"
            | "fail"
            | undefined;
          const status = statusFromCp || finalStatuses[i] || "pass";

          const customData = existingCp?.customData || {};
          const finalCheckpointValue = checkpoints[targetIndex] ?? 0;

          const updatedPart: Part = {
            ...part,
            isCompleted: true,
            completedAt: new Date().toISOString(),
            checkpointInfo: {
              ...part.checkpointInfo,
              checkpointIndex: targetIndex + 1,
            },
          };

          updatedParts.push(updatedPart);

          finalData.push({
            partIndex: i,
            partNumber: part.partNumber,
            serialNumber: part.serialNumber,
            status,
            customData,
            testValue: part.testValue,
            checkpointValue: finalCheckpointValue,
          });

          setUploadProgress((prev) => ({
            ...prev,
            [i]: 100,
          }));
          continue;
        }

        // Process normal completion with image uploads
        const uploadedByColumn: Record<string, string[]> = {};
        const uploadsRequired = imageColumns.length > 0 ? imageColumns : [];

        console.log(
          `Uploads required for ${part.partNumber}: ${uploadsRequired.length} columns`,
        );

        // Validate uploads before proceeding
        for (const col of uploadsRequired) {
          const files = finalPostImages[`${i}-${col.id}`] || [];
          console.log(`Column ${col.id}: ${files.length} files to upload`);
          if (files.length === 0) {
            // ← REPLACED alert()
            addToast(
              `Please upload images for ${col.name || col.id} for part ${part.partNumber}`,
              "warning",
              5000,
            );
            setIsUploading(false);
            return;
          }
        }

        const status = hasNoCheckpoints
          ? (part.checkpointData?.[0]?.status as "pass" | "fail") || "pass"
          : finalStatuses[i];

        console.log(`Final status for ${part.partNumber}: ${status}`);

        const finalCheckpointIndex = hasNoCheckpoints
          ? 0
          : Math.max(checkpoints.length - 1, 0);
        const finalCheckpointValue = hasNoCheckpoints
          ? part.testValue || 0
          : checkpoints[finalCheckpointIndex];
        const preCheckpointIndex = hasNoCheckpoints
          ? -1
          : finalCheckpointIndex - 1;

        console.log(
          `Final checkpoint: index=${finalCheckpointIndex}, value=${finalCheckpointValue}`,
        );

        const totalImages = uploadsRequired.reduce(
          (acc, col) => acc + (finalPostImages[`${i}-${col.id}`]?.length || 0),
          0,
        );
        console.log(`Total images to upload: ${totalImages}`);

        let uploadedCount = 0;

        for (const col of uploadsRequired) {
          const files = finalPostImages[`${i}-${col.id}`] || [];
          uploadedByColumn[col.id] = [];

          console.log(`Uploading ${files.length} images for column ${col.id}`);

          if (files.length === 0) {
            console.warn(`No files for column ${col.id}, using empty array`);
            uploadedByColumn[col.id] = [];
            continue;
          }

          for (let j = 0; j < files.length; j++) {
            const file = files[j];
            console.log(
              `Uploading image ${j + 1}/${files.length} for ${col.id}`,
            );

            try {
              const imageUrl = await uploadImageToServer(
                file,
                part.serialNumber || part.partNumber,
                finalCheckpointValue,
                col.id,
              );
              console.log(`✅ Uploaded ${col.id} image:`, imageUrl);
              uploadedByColumn[col.id].push(imageUrl);
              uploadedCount++;

              const progress = Math.min(
                100,
                (uploadedCount / totalImages) * 100,
              );
              setUploadProgress((prev) => ({
                ...prev,
                [i]: progress,
              }));
              console.log(
                `Upload progress: ${uploadedCount}/${totalImages} (${progress}%)`,
              );
            } catch (uploadError) {
              console.error(
                `Failed to upload image for ${col.id}:`,
                uploadError,
              );
            }
          }
        }

        const customData: Record<string, string> = {};

        Object.entries(uploadedByColumn).forEach(([columnId, paths]) => {
          const cleanPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
          customData[columnId] = JSON.stringify(cleanPaths);
          console.log(`✅ Stored ${columnId} images:`, cleanPaths);
        });

        imageColumns.forEach((col) => {
          if (!customData[col.id]) {
            customData[col.id] = "[]";
          }
        });

        nonImageColumns.forEach((col) => {
          const currentVal = getFinalCustomValue(
            i,
            col.id,
            getCustomColumnValue(part, lookupIndex, finalCheckpointIndex, col),
          );
          const fallbackVal =
            preCheckpointIndex >= 0
              ? getCustomColumnValue(part, lookupIndex, preCheckpointIndex, col)
              : "";
          const selected = currentVal || fallbackVal;
          if (
            selected !== undefined &&
            selected !== null &&
            `${selected}`.length > 0
          ) {
            customData[col.id] = selected;
          }
        });

        console.log("Final customData:", customData);

        const finalCheckpointData = {
          checkpointIndex: finalCheckpointIndex,
          checkpointValue: finalCheckpointValue,
          label: "Final Test",
          testDate: new Date().toISOString(),
          cosmeticImages: [],
          nonCosmeticImages: [],
          status: status,
          customData,
          submittedAt: new Date().toISOString(),
        };

        console.log("Final checkpoint data:", finalCheckpointData);

        const updatedPart: Part = {
          ...part,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          checkpointData: [
            ...(part.checkpointData || []).filter(
              (cp) => cp.checkpointIndex !== finalCheckpointIndex,
            ),
            finalCheckpointData,
          ].sort((a, b) => a.checkpointIndex - b.checkpointIndex),
          checkpointInfo: {
            ...part.checkpointInfo,
            checkpointIndex: finalCheckpointIndex + 1,
          },
        };

        console.log("Updated part:", {
          partNumber: updatedPart.partNumber,
          checkpointData: updatedPart.checkpointData,
        });

        updatedParts.push(updatedPart);

        finalData.push({
          partIndex: i,
          partNumber: part.partNumber,
          serialNumber: part.serialNumber,
          status,
          customData,
          testValue: part.testValue,
          checkpointValue: finalCheckpointValue,
        });

        setUploadProgress((prev) => ({
          ...prev,
          [i]: 100,
        }));

        console.log(`✅ Completed processing part ${part.partNumber}`);
      }

      console.log("\n=== FINAL SUBMISSION DATA ===");
      console.log("finalData:", finalData);
      console.log("updatedParts:", updatedParts);

      onSubmit(finalData, updatedParts);
    } catch (error) {
      console.error("Error during final submission:", error);
      // ← REPLACED alert()
      addToast(
        "Failed to complete unload. Please try again. Check console for details.",
        "error",
        6000,
      );
    } finally {
      setIsUploading(false);
      console.log("=== handleSubmitAll END ===");
    }
  };

  const renderImagePreviews = (files: File[]) => {
    return (
      <div className="flex gap-1 mt-1 justify-center">
        {files.map((file, i) => (
          <img
            key={i}
            src={URL.createObjectURL(file)}
            alt={`preview-${i}`}
            className="w-8 h-8 object-cover rounded"
          />
        ))}
      </div>
    );
  };

  const renderImageArray = (images: string[], altPrefix: string) => {
    if (images.length === 0) {
      return <span className="text-gray-400 text-sm">-</span>;
    }

    return (
      <div className="flex gap-2">
        {images.map((url, i) => {
          const src = url.startsWith("/") ? `${getBackendApiUrl()}${url}` : url;
          return (
            <img
              key={i}
              src={src}
              alt={`${altPrefix}-${i}`}
              className="w-10 h-10 object-cover rounded cursor-pointer"
              onClick={() => window.open(src, "_blank")}
            />
          );
        })}
      </div>
    );
  };

  const renderCustomValue = (value: string, column: CustomColumn) => {
    if (!value) {
      return <span className="text-gray-400 text-sm">-</span>;
    }

    if (column.type === "date") {
      return <span className="text-sm">{formatDate(value)}</span>;
    }

    return <span className="text-sm break-words">{value}</span>;
  };

  const getFinalCustomValue = (
    partIndex: number,
    columnId: string,
    fallback: string,
  ) => finalCustomValues[`${partIndex}-${columnId}`] ?? fallback;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Unload - Chamber Snapshot
            </h1>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-green-600">✓ All parts scanned</div>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>

          <MachineDetails chamberData={chamberData} />
          <CheckpointProgress parts={chamberData.parts} />

          {isUploading && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-2">
                Uploading Images...
              </h3>
              {partsToShow.map((part, index) => {
                const progress = uploadProgress[index] || 0;
                return (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        {part.partNumber} - {part.serialNumber}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Final Data Entry for All Parts
            </h2>
            <p className="text-gray-600 mb-4">
              Enter final test data for each part. All parts will be unloaded
              together.
            </p>
          </div>

          {partsToShow.map((part, index) => {
            const realIndex = resolvePartIndex(part, index);
            const checkpoints = getCheckpointsForPart(part);
            const hasNoCheckpoints =
              checkpoints.length === 0 ||
              (checkpoints.length === 1 && checkpoints[0] === 0);
            const imageColumns = getImageColumnsForPart(index);
            const nonImageColumns = getNonImageColumnsForPart(index);
            const latestStatus = getLatestCheckpointStatus(part);
            const isFailed = latestStatus === "fail";
            const failedAt = isFailed ? getLatestFailCheckpoint(part) : null;

            const currentCheckpointIndex =
              part.checkpointInfo?.checkpointIndex ?? checkpoints.length - 1;
            const plannedFinalIndex = Math.max(checkpoints.length - 1, 0);

            const unitSuffix = (value: number) => {
              const unit = part.testUnit;
              if (!unit) return `${value}hr`;
              const u = unit.trim().toLowerCase();
              if (u.startsWith("hour") || u.startsWith("hr"))
                return `${value}hr`;
              if (u.startsWith("cycle")) return `${value}cycle`;
              if (u.startsWith("drop")) return `${value}drop`;
              return `${value}${u || "hr"}`;
            };

            let finalCheckpointValue: number;
            let finalCheckpointLabel: string;
            let preCheckpointIndex: number;
            let finalCheckpointIndex: number;

            if (hasNoCheckpoints) {
              finalCheckpointValue = part.testValue || 0;
              finalCheckpointLabel = part.testValue
                ? `Total: ${unitSuffix(finalCheckpointValue)}`
                : "No Checkpoints";
              preCheckpointIndex = -1;
              finalCheckpointIndex = 0;
            } else if (isFailed) {
              const targetIndex =
                failedAt?.checkpointIndex ?? currentCheckpointIndex;
              finalCheckpointValue = checkpoints[targetIndex] ?? 0;
              finalCheckpointLabel = unitSuffix(finalCheckpointValue);
              preCheckpointIndex = targetIndex - 1;
              finalCheckpointIndex = targetIndex;
            } else {
              const targetIndex =
                forcedFinalCheckpointIndex !== undefined &&
                forcedFinalCheckpointIndex !== null
                  ? Math.min(
                      Math.max(forcedFinalCheckpointIndex, 0),
                      plannedFinalIndex,
                    )
                  : Math.min(
                      plannedFinalIndex,
                      Math.max(0, currentCheckpointIndex + 1),
                    );
              finalCheckpointValue =
                checkpoints[targetIndex] ?? checkpoints[plannedFinalIndex] ?? 0;
              finalCheckpointLabel = unitSuffix(finalCheckpointValue);
              preCheckpointIndex = targetIndex - 1;
              finalCheckpointIndex = targetIndex;
            }

            const preCheckpointData =
              preCheckpointIndex >= 0
                ? part.checkpointData?.find(
                    (cp) => cp.checkpointIndex === preCheckpointIndex,
                  )
                : null;
            const preImagesByColumn: Record<string, string[]> = {};
            imageColumns.forEach((col) => {
              preImagesByColumn[col.id] = preCheckpointData
                ? getImagesForCheckpoint(realIndex, preCheckpointIndex, col.id)
                : [];
            });

            const postImagesByColumn: Record<string, string[]> = {};
            imageColumns.forEach((col) => {
              postImagesByColumn[col.id] = isFailed
                ? getImagesForCheckpoint(
                    realIndex,
                    failedAt?.checkpointIndex ?? checkpoints.length - 1,
                    col.id,
                  )
                : [];
            });

            return (
              <div
                key={part.serialNumber}
                className="mb-8 border border-gray-300 rounded-lg p-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {part.partNumber} - {part.serialNumber}
                  </h3>
                  <div
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      isFailed
                        ? "bg-red-100 text-red-800"
                        : hasNoCheckpoints
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isFailed
                      ? "FAILED"
                      : hasNoCheckpoints
                        ? "NO CHECKPOINTS"
                        : "COMPLETED"}
                  </div>
                </div>

                <PartDetails part={part} index={realIndex} />

                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Checkpoint History & Final Data
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            S.No
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            Checkpoint
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            Label
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            Test Date
                          </th>
                          {nonImageColumns.map((col) => (
                            <th
                              key={`custom-${col.id}`}
                              className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[140px]"
                            >
                              {col.name}
                            </th>
                          ))}
                          {imageColumns.map((col) => (
                            <th
                              key={`pre-${col.id}`}
                              className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
                            >
                              Pre {col.name}
                            </th>
                          ))}
                          {imageColumns.map((col) => (
                            <th
                              key={`post-${col.id}`}
                              className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700"
                            >
                              Post {col.name}
                            </th>
                          ))}
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700">
                            Final
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allCheckpoints = part.checkpointData || [];
                          const checkpointsToShow = allCheckpoints
                            .filter(
                              (cp) =>
                                cp.checkpointIndex !==
                                (failedAt?.checkpointIndex ||
                                  checkpoints.length - 1),
                            )
                            .sort(
                              (a, b) => a.checkpointIndex - b.checkpointIndex,
                            );

                          if (
                            hasNoCheckpoints &&
                            checkpointsToShow.length === 0
                          ) {
                            checkpointsToShow.push({
                              checkpointIndex: 0,
                              checkpointValue: 0,
                              label: "Pre-Test",
                              testDate:
                                part.loadedAt || new Date().toISOString(),
                              cosmeticImages: [],
                              nonCosmeticImages: [],
                              status: "",
                              customData: {},
                              submittedAt:
                                part.loadedAt || new Date().toISOString(),
                            });
                          }

                          const checkpointsWithSubmissions =
                            checkpointsToShow.map((checkpoint) => {
                              const storedCheckpoint =
                                submittedCheckpoints[
                                  `${realIndex}-${checkpoint.checkpointIndex}`
                                ];
                              return storedCheckpoint || checkpoint;
                            });

                          return checkpointsWithSubmissions.map(
                            (checkpoint, idx) => {
                              const isStoredCheckpoint =
                                "partIndex" in checkpoint;
                              const displayCheckpoint = isStoredCheckpoint
                                ? (checkpoint as CheckpointSubmission)
                                : checkpoint;

                              const checkpointLabel = getCheckpointLabel(
                                displayCheckpoint.checkpointValue ||
                                  checkpoint.checkpointValue ||
                                  0,
                                displayCheckpoint.checkpointIndex,
                                part.testUnit,
                              );

                              const label =
                                displayCheckpoint.checkpointIndex === 0
                                  ? "Pre-Test"
                                  : "Post-Test";

                              const status = isStoredCheckpoint
                                ? (checkpoint as CheckpointSubmission).status
                                : checkpoint.status;

                              const normalizedStatus =
                                latestStatus === "pass" && status === "fail"
                                  ? "pass"
                                  : status;

                              const testDate = isStoredCheckpoint
                                ? (checkpoint as CheckpointSubmission).testDate
                                : checkpoint.testDate;

                              return (
                                <tr
                                  key={checkpoint.checkpointIndex}
                                  className="bg-green-50"
                                >
                                  <td className="border border-gray-300 px-2 py-2 text-sm text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-sm font-medium">
                                    {checkpointLabel}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-sm">
                                    {label}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-sm">
                                    {formatDate(testDate)}
                                  </td>

                                  {nonImageColumns.map((col) => {
                                    const value = getCustomColumnValue(
                                      part,
                                      realIndex,
                                      displayCheckpoint.checkpointIndex,
                                      col,
                                    );

                                    return (
                                      <td
                                        key={`custom-${checkpoint.checkpointIndex}-${col.id}`}
                                        className="border border-gray-300 px-4 py-3"
                                      >
                                        {renderCustomValue(value, col)}
                                      </td>
                                    );
                                  })}

                                  {imageColumns.map((col) => {
                                    const imgs = getImagesForCheckpoint(
                                      realIndex,
                                      displayCheckpoint.checkpointIndex,
                                      col.id,
                                    );
                                    const isT0 =
                                      displayCheckpoint.checkpointIndex === 0;

                                    return (
                                      <td
                                        key={`pre-${checkpoint.checkpointIndex}-${col.id}`}
                                        className="border border-gray-300 px-4 py-3"
                                      >
                                        {isT0 ? (
                                          renderImageArray(
                                            imgs,
                                            `pre-${col.id}`,
                                          )
                                        ) : (
                                          <span className="text-gray-400 text-sm">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {imageColumns.map((col) => {
                                    const imgs = getImagesForCheckpoint(
                                      realIndex,
                                      displayCheckpoint.checkpointIndex,
                                      col.id,
                                    );
                                    const isT0 =
                                      displayCheckpoint.checkpointIndex === 0;

                                    return (
                                      <td
                                        key={`post-${checkpoint.checkpointIndex}-${col.id}`}
                                        className="border border-gray-300 px-4 py-3"
                                      >
                                        {!isT0 ? (
                                          renderImageArray(
                                            imgs,
                                            `post-${col.id}`,
                                          )
                                        ) : (
                                          <span className="text-gray-400 text-sm">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  <td className="border border-gray-300 px-4 py-3">
                                    {displayCheckpoint.checkpointIndex === 0 ? (
                                      <span className="text-gray-500 text-xs">
                                        N/A
                                      </span>
                                    ) : (
                                      <span
                                        className={`px-2 py-1 text-xs rounded font-medium ${
                                          normalizedStatus === "pass"
                                            ? "bg-green-100 text-green-800"
                                            : normalizedStatus === "fail"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {normalizedStatus === "pass"
                                          ? "✓ Pass"
                                          : normalizedStatus === "fail"
                                            ? "✗ Fail"
                                            : "Pending"}
                                      </span>
                                    )}
                                  </td>

                                  <td className="border border-gray-300 px-4 py-3 text-center">
                                    {displayCheckpoint.checkpointIndex > 0 &&
                                    normalizedStatus ? (
                                      <span className="text-green-600 text-xs font-medium">
                                        ✓ Submitted
                                      </span>
                                    ) : displayCheckpoint.checkpointIndex ===
                                      0 ? (
                                      <span className="text-blue-600 text-xs font-medium">
                                        T0 Complete
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          );
                        })()}

                        {/* Single Final Row */}
                        <tr
                          className={
                            isFailed
                              ? "bg-red-50"
                              : hasNoCheckpoints
                                ? "bg-yellow-50"
                                : "bg-blue-50"
                          }
                        >
                          <td className="border border-gray-300 px-2 py-2 text-sm text-center">
                            {(part.checkpointData?.length || 0) + 1}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-sm font-medium">
                            {finalCheckpointLabel}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-sm">
                            {isFailed ? "Failed Test" : "Final Test"}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-sm">
                            {failedAt?.testDate
                              ? formatDate(failedAt.testDate)
                              : formatDate(new Date().toISOString())}
                          </td>

                          {nonImageColumns.map((col) => {
                            const baseValue = getCustomColumnValue(
                              part,
                              realIndex,
                              finalCheckpointIndex,
                              col,
                            );
                            const value = getFinalCustomValue(
                              index,
                              col.id,
                              baseValue,
                            );

                            const onChange = (newVal: string) => {
                              setFinalCustomValues((prev) => ({
                                ...prev,  
                                [`${index}-${col.id}`]: newVal,
                              }));
                            };

                            return (
                              <td
                                key={`final-custom-${col.id}`}
                                className="border border-gray-300 px-4 py-3"
                              >
                                {col.type === "dropdown" ? (
                                  <select
                                    className="border rounded px-2 py-1 text-sm w-full min-w-[120px]"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                  >
                                    <option value="">Select...</option>
                                    {col.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : col.type === "date" ? (
                                  <input
                                    type="date"
                                    className="border rounded px-2 py-1 text-sm w-full min-w-[140px]"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                  />
                                ) : col.type === "number" ? (
                                  <input
                                    type="number"
                                    className="border rounded px-2 py-1 text-sm w-full min-w-[120px]"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="border rounded px-2 py-1 text-sm w-full min-w-[120px]"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    placeholder={`Enter ${col.name}`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {imageColumns.map((col) => {
                            const imgs = preImagesByColumn[col.id] || [];
                            return (
                              <td
                                key={`final-pre-${col.id}`}
                                className="border border-gray-300 px-4 py-3"
                              >
                                {renderImageArray(imgs, `final-pre-${col.id}`)}
                              </td>
                            );
                          })}

                          {imageColumns.map((col) => {
                            const uploadedFiles =
                              finalPostImages[`${index}-${col.id}`];
                            const postImgs = postImagesByColumn[col.id] || [];

                            return (
                              <td
                                key={`final-post-${col.id}`}
                                className="border border-gray-300 px-4 py-3"
                              >
                                {isFailed ? (
                                  renderImageArray(
                                    postImgs,
                                    `failed-post-${col.id}`,
                                  )
                                ) : (
                                  <div className="p-1 text-center">
                                    <label className="cursor-pointer inline-block w-full text-xs text-blue-600 font-medium hover:text-blue-700">
                                      Upload Images for {col.name}
                                      <input
                                        className="hidden"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                          console.log(
                                            `File selected for ${col.id}:`,
                                            e.target.files?.length,
                                          );
                                          handleFinalImageUpload(
                                            index,
                                            col.id,
                                            e.target.files,
                                          );
                                        }}
                                      />
                                    </label>
                                    {uploadedFiles &&
                                      uploadedFiles.length > 0 && (
                                        <div className="mt-2">
                                          <span className="text-xs text-green-600">
                                            {uploadedFiles.length} file(s) ready
                                          </span>
                                          {renderImagePreviews(uploadedFiles)}
                                        </div>
                                      )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          <td className="border border-gray-300 px-4 py-3">
                            {isFailed ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-medium">
                                Fail
                              </span>
                            ) : (
                              <select
                                value={
                                  (finalStatuses[index] as
                                    | "pass"
                                    | "fail"
                                    | "") ??
                                  (hasNoCheckpoints
                                    ? (part.checkpointData?.[0]?.status as
                                        | "pass"
                                        | "fail"
                                        | "") || ""
                                    : "")
                                }
                                onChange={(e) =>
                                  handleFinalStatusChange(
                                    index,
                                    e.target.value as "pass" | "fail" | "",
                                  )
                                }
                                className="border rounded px-2 py-1 text-sm w-full"
                              >
                                <option value="">-- Select --</option>
                                <option value="pass">Pass</option>
                                <option value="fail">Fail</option>
                              </select>
                            )}
                          </td>

                          <td className="border border-gray-300 px-4 py-3 text-center">
                            {isFailed ? (
                              <div className="space-y-1">
                                <span className="text-green-600 text-xs">
                                  ✓ Submitted
                                </span>
                                {imageColumns.map((col) => {
                                  const hasImages =
                                    postImagesByColumn[col.id]?.length > 0;
                                  return (
                                    <div
                                      key={`failed-status-${col.id}`}
                                      className={`text-xs ${hasImages ? "text-green-600" : "text-gray-500"}`}
                                    >
                                      {hasImages
                                        ? `✓ ${col.name} images`
                                        : `No ${col.name} images`}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div
                                  className={`text-xs ${finalStatuses[index] ? "text-green-600" : "text-red-600"}`}
                                >
                                  {finalStatuses[index]
                                    ? "✓ Status selected"
                                    : "✗ Select status"}
                                </div>
                                {imageColumns.map((col) => {
                                  const hasUpload =
                                    (finalPostImages[`${index}-${col.id}`]
                                      ?.length || 0) > 0;
                                  return (
                                    <div
                                      key={`upload-status-${col.id}`}
                                      className={`text-xs ${hasUpload ? "text-green-600" : "text-red-600"}`}
                                    >
                                      {hasUpload
                                        ? `✓ ${col.name} uploaded`
                                        : `✗ Upload ${col.name}`}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back to Scan
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSubmitAll}
                  disabled={!canSubmitAll() || isUploading}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    canSubmitAll() && !isUploading
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isUploading ? "Uploading..." : "Complete Unload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnloadDataEntry;
