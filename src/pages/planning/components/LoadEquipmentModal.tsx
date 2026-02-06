// import React, { useState, useEffect } from "react";
// import {
//   X,
//   Scan,
//   Upload,
//   ImageIcon,
//   Info,
//   ChevronDown,
//   Clock,
//   Play,
//   AlertCircle,
//   Check,
//   ChevronRight,
//   Hourglass,
//   Link,
//   RefreshCw,
// } from "lucide-react";
// import { MachineItem, Part } from "../types";
// import PartImageUpload from "./PartImageUpload";
// import { useTimer } from "../hooks/useTimer";
// import { useChamberLoads } from "../hooks/useChamberLoads";
// import { usePartScanning } from "../hooks/usePartScanning";
// import {
//   ChamberLoadPayload,
//   fetchAllocations,
//   AllocationDto,
//   AllocationTestDto,
//   updateBackendAllocation,
// } from "@/lib/backendApi";
// import PartScanner from "../../planning/components/PartScanner";
// import { fetchAllScannedParts, findPartInScannedParts, ScannedPart } from '@/lib/backendApi';

// interface LoadEquipmentModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   selectedChamber: string;
//   data: MachineItem[];
//   onLoadComplete: () => void;
//   setChamberLoading?: (machineId: string, loading: boolean) => void;
// }

// // Test unit types
// type TestUnit = "hour" | "cycle" | "drops" | "orientation" | "grams" | "other";

// interface AllocationLimit {
//   testId: string;
//   testName: string;
//   ticketCode: string;
//   partsAvailableToAllocate: number;
//   alreadyAllocated: number;
//   requiredQty: number;
//   maxPartsCanLoad: number;
//   partsLoadedInThisSession: number;
// }

// interface AggregatedTestOption {
//   testName: string;
//   subTestName?: string;
//   parentTestName?: string;
//   isChildTest: boolean;
//   displayName: string;
//   testUnit?: TestUnit;
//   unit?: string;
//   testCondition?: string;
//   machineEquipment?: string;
//   machineEquipment2?: string;
//   // Aggregated counts
//   totalAvailable: number;
//   totalRequired: number;
//   // Original allocations from different tickets
//   allocations: Array<{
//     testId: string;
//     ticketCode: string;
//     allocationId: string; // Parent allocation ID
//     isChild: boolean;
//     parentTestId?: string;
//     remainingParts: number;
//     requiredQty: number;
//     // For display and matching
//     originalTest: any;
//     // Combined test sequence info
//     sequenceNumber?: number;
//     totalInSequence?: number;
//     nextTestId?: string;
//     previousTestId?: string;
//   }>;
//   // Combined test fields
//   combinedTestId?: string;
//   sequenceNumber?: number;
//   totalInSequence?: number;
//   nextTestId?: string;
//   previousTestId?: string;
//   hasCheckpoints?: boolean;
//   checkpoints?: number[];
//   originalCheckPoints?: string;
//   time?: number;
//   timeString?: string;
//   // Additional aggregated info
//   ticketCount: number;
//   equipmentList: string[];
// }

// const LoadEquipmentModal: React.FC<LoadEquipmentModalProps> = ({
//   isOpen,
//   onClose,
//   selectedChamber,
//   data,
//   onLoadComplete,
//   setChamberLoading,
// }) => {
//   const [scannedParts, setScannedParts] = useState<Part[]>([]);
//   const [partInput, setPartInput] = useState("");
//   const [machineDetails, setMachineDetails] = useState<any>(null);
//   const [availableTests, setAvailableTests] = useState<AggregatedTestOption[]>(
//     [],
//   );
//   const [allocationRecords, setAllocationRecords] = useState<AllocationDto[]>(
//     [],
//   );
//   const [selectedTestAggregated, setSelectedTestAggregated] =
//     useState<AggregatedTestOption | null>(null);
//   const [selectedAllocation, setSelectedAllocation] =
//     useState<AllocationLimit | null>(null);
//   const [allocationLimits, setAllocationLimits] = useState<
//     Record<string, AllocationLimit>
//   >({});
//   const [sessionTicketCode, setSessionTicketCode] = useState<string | null>(
//     null,
//   );
//   const [enableRealtimeScan, setEnableRealtimeScan] = useState(true);

//   // Test configuration
//   const [testStarted, setTestStarted] = useState<boolean>(false);
//   const [isAutoStart, setIsAutoStart] = useState<boolean>(false);
//   const [testValue, setTestValue] = useState<number | null>(null);

//   const {
//     chamberLoads: cachedChamberLoads,
//     addChamberLoad,
//     refreshChamberLoads,
//   } = useChamberLoads();
//   const { scanning, scanPart, handleImageUpload, isUploading } =
//     usePartScanning();

//   useEffect(() => {
//     if (isOpen) {
//       refreshChamberLoads();
//     }
//   }, [isOpen, refreshChamberLoads]);

//   useEffect(() => {
//     if (!isOpen) {
//       return;
//     }

//     let isMounted = true;

//     const loadAllocations = async () => {
//       try {
//         const records = await fetchAllocations();
//         if (!isMounted) {
//           return;
//         }

//         setAllocationRecords(records);

//         try {
//           localStorage.setItem(
//             "ticket_allocations_array",
//             JSON.stringify(records),
//           );
//         } catch (storageError) {
//           console.error(
//             "Failed to cache ticket allocations in localStorage",
//             storageError,
//           );
//         }
//       } catch (error) {
//         if (isMounted) {
//           setAllocationRecords([]);
//         }
//         console.error("Error fetching ticket allocations:", error);
//       }
//     };

//     loadAllocations();

//     return () => {
//       isMounted = false;
//     };
//   }, [isOpen]);

//   const machine = data.find(
//     (m) =>
//       m.machine_id === selectedChamber ||
//       m.machine_description === selectedChamber,
//   );

//   const getCurrentAllocations = (): AllocationDto[] => {
//     try {
//       const stored = localStorage.getItem("ticket_allocations_array");
//       if (stored) {
//         return JSON.parse(stored) as AllocationDto[];
//       }
//     } catch (error) {
//       console.error("Failed to parse cached ticket allocations", error);
//     }

//     return allocationRecords;
//   };

//   const toNumber = (value?: number | string | null): number => {
//     if (typeof value === "number" && !Number.isNaN(value)) {
//       return value;
//     }

//     if (typeof value === "string") {
//       const parsed = Number(value);
//       return Number.isNaN(parsed) ? 0 : parsed;
//     }

//     return 0;
//   };

//   // Helper function to parse checkpoints from string
//   const parseCheckpoints = (checkPointsString: string): number[] => {
//     if (!checkPointsString || typeof checkPointsString !== "string") {
//       return [];
//     }

//     const cleanString = checkPointsString.replace(/^CP:/i, "").trim();
//     if (!cleanString) return [];

//     const parts = cleanString.split(",");
//     const checkpoints: number[] = [];

//     parts.forEach((part) => {
//       const matches = part.match(/\d+(\.\d+)?/g);
//       if (matches) {
//         matches.forEach((match) => {
//           const number = parseFloat(match);
//           if (!isNaN(number)) {
//             checkpoints.push(number);
//           }
//         });
//       }
//     });

//     return [...new Set(checkpoints.sort((a, b) => a - b))];
//   };

//   // Get checkpoint progress for a part
//   const normalizePartId = (value: string): string =>
//     typeof value === "string"
//       ? value.replace(/[^a-z0-9]/gi, "").toUpperCase()
//       : "";

//   const getCheckpointProgress = (
//     partNumber: string,
//     testId: string,
//   ): number => {
//     try {
//       const loads = cachedChamberLoads ?? [];
//       let timesLoaded = 0;

//       loads.forEach((load: any) => {
//         load.parts?.forEach((part: any) => {
//           if (
//             part.partNumber === partNumber &&
//             part.testId === testId &&
//             part.testStatus === "completed" &&
//             part.checkpointInfo
//           ) {
//             timesLoaded++;
//           }
//         });
//       });

//       return timesLoaded;
//     } catch (error) {
//       console.error("Error getting checkpoint progress:", error);
//       return 0;
//     }
//   };

//   // Check if part has completed previous step in combined test sequence
//   const hasCompletedPreviousTest = (
//     partNumber: string,
//     testId: string,
//     previousTestId?: string,
//   ): boolean => {
//     if (!previousTestId) return true; // First in sequence, no previous required

//     try {
//       const chamberLoads = cachedChamberLoads ?? [];

//       for (const load of chamberLoads) {
//         if (load.parts) {
//           for (const part of load.parts) {
//             // Check if this is the specific part and test
//             if (
//               part.partNumber === partNumber &&
//               part.testId === previousTestId
//             ) {
//               // Check if the INDIVIDUAL PART is completed
//               if (part.isCompleted === true) {
//                 console.log(
//                   `✓ Part ${partNumber} has completed previous test ${previousTestId}: isCompleted=${part.isCompleted}`,
//                 );
//                 return true;
//               } else {
//                 console.log(
//                   `✗ Part ${partNumber} has NOT completed previous test ${previousTestId}: isCompleted=${part.isCompleted}, testStatus=${part.testStatus}`,
//                 );
//               }
//             }
//           }
//         }
//       }

//       return false;
//     } catch (error) {
//       console.error("Error checking previous test completion:", error);
//       return false;
//     }
//   };

//   // Check if part is currently in any stage of a combined test
//   const isPartInCombinedTest = (
//     partNumber: string,
//     combinedTestId: string,
//   ): { isInTest: boolean; currentStage?: string; stageNumber?: number } => {
//     try {
//       const chamberLoads = cachedChamberLoads ?? [];

//       for (const load of chamberLoads) {
//         if (load.status === "loaded" && load.parts) {
//           for (const part of load.parts) {
//             if (
//               part.partNumber === partNumber &&
//               part.combinedTestId === combinedTestId &&
//               !part.isCompleted
//             ) {
//               return {
//                 isInTest: true,
//                 currentStage: part.testName,
//                 stageNumber: part.sequenceNumber,
//               };
//             }
//           }
//         }
//       }

//       return { isInTest: false };
//     } catch (error) {
//       console.error("Error checking if part is in combined test:", error);
//       return { isInTest: false };
//     }
//   };

//   // NEW FUNCTION: Check if part is in ANY stage of a combined test (using parentTestName)
//   const isPartInAnyStageOfCombinedTest = (
//     partNumber: string,
//     parentTestName: string,
//   ): {
//     isInTest: boolean;
//     combinedTestId?: string;
//     currentStage?: string;
//     currentTestId?: string;
//     chamber?: string;
//     sequenceNumber?: number;
//   } => {
//     try {
//       const chamberLoads = cachedChamberLoads ?? [];

//       for (const load of chamberLoads) {
//         if (load.status === "loaded" && load.parts) {
//           for (const part of load.parts) {
//             // Check if part is in ANY chamber for this parent test name
//             // Look at the testName field which should match parentTestName for combined tests
//             if (
//               part.partNumber === partNumber &&
//               !part.isCompleted &&
//               part.testName === parentTestName
//             ) {
//               return {
//                 isInTest: true,
//                 combinedTestId: part.combinedTestId,
//                 currentStage: part.testName,
//                 currentTestId: part.testId,
//                 chamber: load.machineDescription || load.chamber,
//                 sequenceNumber: part.sequenceNumber,
//               };
//             }
//           }
//         }
//       }

//       return { isInTest: false };
//     } catch (error) {
//       console.error(
//         "Error checking if part is in any stage of combined test:",
//         error,
//       );
//       return { isInTest: false };
//     }
//   };

//   // Get all parts that have completed a specific test in combined sequence
//   const getPartsCompletedTest = (previousTestId: string): string[] => {
//     try {
//       const chamberLoads = cachedChamberLoads ?? [];
//       const completedParts: string[] = [];

//       for (const load of chamberLoads) {
//         if (load.parts) {
//           for (const part of load.parts) {
//             if (part.testId === previousTestId && part.isCompleted === true) {
//               completedParts.push(part.partNumber);
//             }
//           }
//         }
//       }

//       console.log(
//         `Found ${completedParts.length} parts completed test ${previousTestId}:`,
//         completedParts,
//       );
//       return [...new Set(completedParts)]; // Remove duplicates
//     } catch (error) {
//       console.error("Error getting parts completed test:", error);
//       return [];
//     }
//   };

//   // Check if part is already loaded for a specific test
//   const isPartLoadedForTest = (
//     partNumber: string,
//     testId: string,
//   ): { isLoaded: boolean; equipment?: string; testName?: string } => {
//     try {
//       const chamberLoads = cachedChamberLoads ?? [];
//       const normalizedTarget = normalizePartId(partNumber);

//       for (const load of chamberLoads) {
//         if (load.status === "loaded" && load.parts) {
//           for (const part of load.parts) {
//             const normalizedPart = normalizePartId(part.partNumber);
//             const partTestId =
//               part.testId !== undefined && part.testId !== null
//                 ? String(part.testId)
//                 : null;
//             const targetTestId = testId === "any" ? null : String(testId);
//             const matchesTest =
//               testId === "any" ||
//               (partTestId !== null &&
//                 targetTestId !== null &&
//                 partTestId === targetTestId);
//             if (
//               normalizedPart === normalizedTarget &&
//               matchesTest &&
//               !part.isCompleted
//             ) {
//               return {
//                 isLoaded: true,
//                 equipment: load.machineDescription || load.chamber || "Unknown",
//                 testName: part.testName || "Unknown",
//               };
//             }
//           }
//         }
//       }

//       return { isLoaded: false };
//     } catch (error) {
//       console.error("Error checking if part is loaded for test:", error);
//       return { isLoaded: false };
//     }
//   };

//   interface PartTestHistoryEntry {
//     rootId: string;
//     allocationTestId: string | null;
//     combinedTestId: string | null;
//     testName: string | null;
//   }

//   const getPartTestHistory = (partNumber: string): PartTestHistoryEntry[] => {
//     try {
//       const chamberLoads = cachedChamberLoads ?? [];
//       const normalizedTarget = normalizePartId(partNumber);
//       const history: PartTestHistoryEntry[] = [];

//       for (const load of chamberLoads) {
//         if (!load.parts) {
//           continue;
//         }

//         for (const part of load.parts) {
//           const normalizedPart = normalizePartId(part.partNumber);
//           if (!normalizedPart || normalizedPart !== normalizedTarget) {
//             continue;
//           }

//           const allocationTestId =
//             part.allocationTestId !== undefined &&
//             part.allocationTestId !== null
//               ? String(part.allocationTestId)
//               : part.testId !== undefined && part.testId !== null
//                 ? String(part.testId)
//                 : null;

//           const combinedTestId =
//             part.combinedTestId !== undefined && part.combinedTestId !== null
//               ? String(part.combinedTestId)
//               : null;

//           const rootId = combinedTestId || allocationTestId;
//           if (!rootId) {
//             continue;
//           }

//           const recordedTestName =
//             typeof part.testName === "string"
//               ? part.testName
//               : typeof part.selectedTestName === "string"
//                 ? part.selectedTestName
//                 : null;

//           history.push({
//             rootId,
//             allocationTestId,
//             combinedTestId,
//             testName: recordedTestName,
//           });
//         }
//       }

//       return history;
//     } catch (error) {
//       console.error("Error reading part test history:", error);
//       return [];
//     }
//   };

//   // Get part's ticket code from stage1TableData
//   const getPartTicketCode = (partNumber: string): string | null => {
//     try {
//       const stage1Data = JSON.parse(
//         localStorage.getItem("stage1TableData") || "[]",
//       );
//       const partRecord = stage1Data.find((record: any) =>
//         record.partNumbers?.includes(partNumber),
//       );

//       return partRecord?.ticketCode || null;
//     } catch (error) {
//       console.error("Error getting part ticket code:", error);
//       return null;
//     }
//   };

//   // Enhanced function to get part details from stage1TableData
//   const getPartDetailsFromStage1 = (
//     partNumber: string,
//   ): {
//     exists: boolean;
//     details: {
//       partNumber: string;
//       ticketCode: string;
//       serialNumber: string;
//       project: string;
//       build: string;
//       colour: string;
//       stage1Record: any;
//     } | null;
//     error: string | null;
//   } => {
//     try {
//       const normalizePartNumber = (value: string): string =>
//         value.replace(/[^a-z0-9]/gi, "").toUpperCase();

//       const firstNonEmpty = (...values: Array<unknown>): string | null => {
//         console.log(values);

//         for (const value of values) {
//           if (value === null || value === undefined) {
//             continue;
//           }
//           if (typeof value === "string") {
//             const trimmed = value.trim();
//             if (trimmed.length > 0) {
//               return trimmed;
//             }
//           } else if (typeof value === "number") {
//             return String(value);
//           }
//         }
//         return null;
//       };

//       const parseJsonArray = (raw: string | null): any[] => {
//         if (!raw) {
//           return [];
//         }
//         try {
//           const parsed = JSON.parse(raw);
//           return Array.isArray(parsed) ? parsed : [];
//         } catch (parseError) {
//           console.warn("Unable to parse cached OQC data:", parseError);
//           return [];
//         }
//       };

//       const normalizedTarget = normalizePartNumber(partNumber);

//       type MatchMeta = {
//         serialNumber?: string | null;
//         ticketCode?: string | null;
//       };

//       type MatchResult = MatchMeta & { matched: boolean };

//       type RecordMatch = {
//         record: any;
//         meta: MatchMeta;
//       };

//       const checkValue = (
//         value: unknown,
//         meta: MatchMeta = {},
//       ): MatchResult => {
//         if (typeof value === "string") {
//           const segments = value
//             .split(/[\n\r,;]+/)
//             .map((segment) => segment.trim())
//             .filter(Boolean);

//           for (const segment of segments) {
//             const base = segment.includes("(")
//               ? segment.split("(")[0].trim()
//               : segment;
//             const matches = base.match(/[A-Za-z0-9-]+/g) || [];

//             for (const token of matches) {
//               if (!/\d/.test(token)) {
//                 continue;
//               }
//               if (normalizePartNumber(token) === normalizedTarget) {
//                 return {
//                   matched: true,
//                   serialNumber: meta.serialNumber ?? null,
//                   ticketCode: meta.ticketCode ?? null,
//                 };
//               }
//             }
//           }

//           return {
//             matched: false,
//             serialNumber: meta.serialNumber ?? null,
//             ticketCode: meta.ticketCode ?? null,
//           };
//         }

//         if (Array.isArray(value)) {
//           for (const item of value) {
//             const result = checkValue(item, meta);
//             if (result.matched) {
//               return result;
//             }
//           }

//           return {
//             matched: false,
//             serialNumber: meta.serialNumber ?? null,
//             ticketCode: meta.ticketCode ?? null,
//           };
//         }

//         if (value && typeof value === "object") {
//           const obj = value as Record<string, unknown>;
//           const objectMeta: MatchMeta = {
//             serialNumber:
//               typeof obj.serialNumber === "string"
//                 ? obj.serialNumber
//                 : (meta.serialNumber ?? null),
//             ticketCode:
//               typeof obj.ticketCode === "string"
//                 ? obj.ticketCode
//                 : (meta.ticketCode ?? null),
//           };

//           const candidateFields = [
//             "partNumber",
//             "PartNumber",
//             "part_no",
//             "partnumber",
//             "part",
//             "Part",
//             "componentNumber",
//             "component",
//             "partId",
//             "part_id",
//           ];

//           for (const field of candidateFields) {
//             if (field in obj) {
//               const result = checkValue(obj[field], objectMeta);
//               if (result.matched) {
//                 return result;
//               }
//             }
//           }

//           if ("partNumbers" in obj) {
//             const result = checkValue(obj.partNumbers, objectMeta);
//             if (result.matched) {
//               return result;
//             }
//           }

//           if ("parts" in obj) {
//             const result = checkValue(obj.parts, objectMeta);
//             if (result.matched) {
//               return result;
//             }
//           }

//           if ("partList" in obj) {
//             const result = checkValue(obj.partList, objectMeta);
//             if (result.matched) {
//               return result;
//             }
//           }

//           if ("value" in obj) {
//             const result = checkValue(obj.value, objectMeta);
//             if (result.matched) {
//               return result;
//             }
//           }

//           return {
//             matched: false,
//             serialNumber: objectMeta.serialNumber ?? null,
//             ticketCode: objectMeta.ticketCode ?? null,
//           };
//         }

//         return {
//           matched: false,
//           serialNumber: meta.serialNumber ?? null,
//           ticketCode: meta.ticketCode ?? null,
//         };
//       };

//       const createMatch = (record: any, result: MatchResult): RecordMatch => ({
//         record,
//         meta: {
//           serialNumber: result.serialNumber ?? null,
//           ticketCode: result.ticketCode ?? null,
//         },
//       });

//       const findMatchInStage1 = (records: any[]): RecordMatch | null => {
//         for (const record of records) {
//           const baseMeta: MatchMeta = {
//             ticketCode:
//               typeof record?.ticketCode === "string"
//                 ? record.ticketCode
//                 : typeof record?.detailsBox?.ticketCodeRaised === "string"
//                   ? record.detailsBox.ticketCodeRaised
//                   : typeof record?.detailsBox?.ticketCode === "string"
//                     ? record.detailsBox.ticketCode
//                     : null,
//           };

//           const candidateValues = [
//             record?.partNumbers,
//             record?.PartNumbers,
//             record?.part_numbers,
//             record?.partList,
//             record?.partsList,
//             record?.parts,
//             record?.detailsBox?.partNumbers,
//             record?.detailsBox?.parts,
//             record?.detailsBox?.partList,
//             record?.detailsBox?.part_numbers,
//             record?.partDetails,
//           ];

//           for (const value of candidateValues) {
//             const result = checkValue(value, baseMeta);
//             if (result.matched) {
//               return createMatch(record, result);
//             }
//           }

//           if (Array.isArray(record?.sessions)) {
//             for (const session of record.sessions) {
//               const sessionMeta: MatchMeta = {
//                 ticketCode:
//                   typeof session?.ticketCode === "string"
//                     ? session.ticketCode
//                     : (baseMeta.ticketCode ?? null),
//               };

//               const result = checkValue(session?.parts, sessionMeta);
//               if (result.matched) {
//                 return createMatch(record, result);
//               }
//             }
//           }
//         }

//         return null;
//       };

//       const findMatchInOqcTickets = (records: any[]): RecordMatch | null => {
//         for (const record of records) {
//           const ticketMeta: MatchMeta = {
//             ticketCode:
//               typeof record?.ticketCode === "string" ? record.ticketCode : null,
//           };

//           const directListResult = checkValue(record?.partNumbers, ticketMeta);
//           if (directListResult.matched) {
//             return createMatch(record, directListResult);
//           }

//           if (Array.isArray(record?.sessions)) {
//             for (const session of record.sessions) {
//               const result = checkValue(session?.parts, ticketMeta);
//               if (result.matched) {
//                 return createMatch(record, result);
//               }
//             }
//           }

//           if (Array.isArray(record?.parts)) {
//             const partsResult = checkValue(record.parts, ticketMeta);
//             if (partsResult.matched) {
//               return createMatch(record, partsResult);
//             }
//           }
//         }

//         return null;
//       };

//       const stage1Records = parseJsonArray(
//         localStorage.getItem("stage1TableData"),
//       );
//       const oqcRecords = parseJsonArray(
//         localStorage.getItem("oqc_ticket_records"),
//       );

//       const stage1Match = findMatchInStage1(stage1Records);
//       const oqcMatch = findMatchInOqcTickets(oqcRecords);

//       const matchedRecord = stage1Match?.record ?? oqcMatch?.record ?? null;

//       if (!matchedRecord) {
//         return {
//           exists: false,
//           details: null,
//           error: `Part ${partNumber} not found in OQC records`,
//         };
//       }

//       const normalizeTicketCode = (value: string | null): string | null =>
//         value ? value.replace(/\s+/g, "").toUpperCase() : null;

//       const ticketCode = firstNonEmpty(
//         stage1Match?.meta.ticketCode,
//         stage1Match?.record?.ticketCode,
//         stage1Match?.record?.detailsBox?.ticketCodeRaised,
//         stage1Match?.record?.detailsBox?.ticketCode,
//         oqcMatch?.meta.ticketCode,
//         oqcMatch?.record?.ticketCode,
//       );

//       if (!ticketCode) {
//         return {
//           exists: false,
//           details: null,
//           error: `Part ${partNumber} found but ticket mapping is missing`,
//         };
//       }

//       const normalizedTicket = normalizeTicketCode(ticketCode);
//       const supplementalByTicket = normalizedTicket
//         ? oqcRecords.find(
//             (record) =>
//               normalizeTicketCode(
//                 typeof record?.ticketCode === "string"
//                   ? record.ticketCode
//                   : null,
//               ) === normalizedTicket,
//           )
//         : null;

//       const project =
//         firstNonEmpty(
//           stage1Match?.record?.detailsBox?.project,
//           stage1Match?.record?.project,
//           oqcMatch?.record?.project,
//           supplementalByTicket?.project,
//         ) ?? "";

//       const build =
//         firstNonEmpty(
//           stage1Match?.record?.detailsBox?.batch,
//           stage1Match?.record?.build,
//           oqcMatch?.record?.build,
//           supplementalByTicket?.build,
//         ) ?? "";

//       const colour =
//         firstNonEmpty(
//           stage1Match?.record?.detailsBox?.color,
//           stage1Match?.record?.detailsBox?.colour,
//           stage1Match?.record?.colour,
//           stage1Match?.record?.color,
//           oqcMatch?.record?.colour,
//           oqcMatch?.record?.color,
//           supplementalByTicket?.colour,
//           supplementalByTicket?.color,
//         ) ?? "";

//       const serialNumber =
//         firstNonEmpty(
//           stage1Match?.meta.serialNumber,
//           oqcMatch?.meta.serialNumber,
//         ) ?? "";

//       return {
//         exists: true,
//         details: {
//           partNumber: partNumber.toUpperCase(),
//           ticketCode: ticketCode.toUpperCase(),
//           serialNumber,
//           project,
//           build,
//           colour,
//           stage1Record: stage1Match?.record ?? oqcMatch?.record,
//         },
//         error: null,
//       };
//     } catch (error) {
//       console.error("Error getting part details:", error);
//       return {
//         exists: false,
//         details: null,
//         error: "Error accessing OQC records",
//       };
//     }
//   };

//   // Enhanced validation that checks stage1TableData mapping and ticket consistency
//   const validatePartMappingAndTicket = (
//     partNumber: string,
//   ): {
//     errors: string[];
//     warnings: string[];
//     partDetails: {
//       partNumber: string;
//       ticketCode: string;
//       serialNumber: string;
//       project: string;
//       build: string;
//       colour: string;
//       stage1Record: any;
//     } | null;
//   } => {
//     const errors: string[] = [];
//     const warnings: string[] = [];

//     // Step 1: Check if part exists in stage1TableData
//     const partDetailsResult = getPartDetailsFromStage1(partNumber);

//     console.log(partDetailsResult);

//     if (!partDetailsResult.exists) {
//       errors.push(
//         partDetailsResult.error ||
//           `Part ${partNumber} not found in OQC records`,
//       );
//       return { errors, warnings, partDetails: null };
//     }

//     const partDetails = partDetailsResult.details!;

//     // Step 2: Check ticket consistency with already scanned parts
//     if (scannedParts.length > 0) {
//       const firstTicket = sessionTicketCode || scannedParts[0].ticketCode;
//       if (partDetails.ticketCode !== firstTicket) {
//         errors.push(
//           `Cannot mix tickets! Already loading from ${firstTicket}, this part belongs to ${partDetails.ticketCode}`,
//         );
//       }
//     }

//     // Step 3: Check if part already loaded in any equipment
//     const loadedStatus = isPartLoadedForTest(partNumber, "any");
//     if (loadedStatus.isLoaded) {
//       errors.push(
//         `Part ${partNumber} is already loaded in ${loadedStatus.equipment} for test: ${loadedStatus.testName}`,
//       );
//     }

//     // Step 4: Check if part is already scanned in current session
//     const isAlreadyScanned = scannedParts.some(
//       (part) => part.partNumber === partNumber.toUpperCase(),
//     );
//     if (isAlreadyScanned) {
//       errors.push(`Part ${partNumber} is already scanned in this session`);
//     }

//     // Step 5: For combined tests, check sequence requirements
//     if (
//       selectedTestAggregated?.isChildTest &&
//       selectedTestAggregated.previousTestId
//     ) {
//       const hasCompletedPrevious = hasCompletedPreviousTest(
//         partNumber,
//         selectedTestAggregated.allocations[0]?.testId || "",
//         selectedTestAggregated.previousTestId,
//       );

//       if (!hasCompletedPrevious) {
//         errors.push(
//           `Part must complete previous test step before starting this one`,
//         );
//       }
//     }

//     // NEW STEP 6: Check if part is in ANY chamber of the same combined test
//     if (selectedTestAggregated?.parentTestName) {
//       const combinedTestStatus = isPartInAnyStageOfCombinedTest(
//         partNumber,
//         selectedTestAggregated.parentTestName,
//       );

//       if (combinedTestStatus.isInTest) {
//         errors.push(
//           `Part ${partNumber} is currently in ${combinedTestStatus.chamber} for "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.sequenceNumber}). It must complete that stage first.`,
//         );
//       }
//     }

//     // Step 7: Check if part is currently in another stage of the same combined test (using combinedTestId)
//     if (selectedTestAggregated?.combinedTestId) {
//       const combinedTestStatus = isPartInCombinedTest(
//         partNumber,
//         selectedTestAggregated.combinedTestId,
//       );
//       if (combinedTestStatus.isInTest) {
//         errors.push(
//           `Part ${partNumber} is currently in "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.stageNumber}) of this combined test. It must complete that stage first.`,
//         );
//       }
//     }

//     return { errors, warnings, partDetails };
//   };

//   // Helper function to get display name for tests
//   const getTestDisplayName = (
//     test: AllocationTestDto,
//     isChild: boolean = false,
//     parentTest?: AllocationTestDto,
//   ): string => {
//     if (isChild && parentTest) {
//       // For child tests: "Parent Name (Child SubTest)"
//       const parentName = parentTest.testName || "Unknown Parent";
//       const childName =
//         test.subTestName ||
//         test.machineEquipment ||
//         parentTest.testName ||
//         "Unknown Child";
//       return `${parentName} (${childName})`;
//     } else {
//       // For parent tests: just the test name
//       return test.testName || "Unknown Test";
//     }
//   };

//   // Helper function to create aggregated test options - CORRECTED FOR TEST NAMES
//   const createAggregatedTestOptions = (): AggregatedTestOption[] => {
//     try {
//       const allocationSource = getCurrentAllocations();
//       const aggregatedTestsMap = new Map<string, AggregatedTestOption>();

//       const generateTestKey = (
//         test: AllocationTestDto,
//         isChild: boolean = false,
//         parentTest?: AllocationTestDto,
//       ): string => {
//         const displayName = getTestDisplayName(test, isChild, parentTest);
//         return `${isChild ? "CHILD:" : "PARENT:"}${displayName.toLowerCase().trim()}`;
//       };

//       const getEquipment = (test: AllocationTestDto): string => {
//         return test.machineEquipment || test.machineEquipment2 || "";
//       };

//       allocationSource.forEach((allocation) => {
//         const ticketCode = allocation.ticketCode;
//         const parentTests = allocation.testAllocations || [];

//         parentTests.forEach((parentTest) => {
//           const childTests = parentTest.childTests || [];
//           const parentHasChildren = childTests.length > 0;

//           if (parentHasChildren) {
//             childTests.forEach((child, childIndex) => {
//               const remainingParts = toNumber(child.remainingParts);
//               if (remainingParts <= 0) {
//                 return;
//               }

//               const requiredQty = toNumber(child.requiredQty);
//               const displayName = getTestDisplayName(child, true, parentTest);
//               const key = generateTestKey(child, true, parentTest);
//               const equipment = getEquipment(child);
//               const sequenceLength = childTests.length;

//               if (!aggregatedTestsMap.has(key)) {
//                 const unit = child.unit || "";
//                 let testUnit: TestUnit = "other";
//                 if (unit === "Hours") testUnit = "hour";
//                 else if (unit === "Cycle") testUnit = "cycle";
//                 else if (unit === "Drops") testUnit = "drops";
//                 else if (unit === "Grams") testUnit = "grams";

//                 const timeValue =
//                   child.time && child.time !== ""
//                     ? Number(child.time)
//                     : undefined;
//                 const checkpoints = parseCheckpoints(child.checkPoints || "");

//                 aggregatedTestsMap.set(key, {
//                   testName:
//                     child.subTestName ||
//                     child.machineEquipment ||
//                     parentTest.testName ||
//                     "",
//                   subTestName: child.subTestName,
//                   parentTestName: parentTest.testName,
//                   isChildTest: true,
//                   displayName,
//                   testUnit,
//                   unit,
//                   testCondition: child.testCondition,
//                   machineEquipment: child.machineEquipment,
//                   machineEquipment2: child.machineEquipment2,
//                   totalAvailable: 0,
//                   totalRequired: 0,
//                   allocations: [],
//                   ticketCount: 0,
//                   equipmentList: [],
//                   combinedTestId: parentTest.id,
//                   sequenceNumber: childIndex + 1,
//                   totalInSequence: sequenceLength,
//                   nextTestId: childTests[childIndex + 1]?.id,
//                   previousTestId:
//                     childIndex > 0 ? childTests[childIndex - 1]?.id : undefined,
//                   hasCheckpoints: checkpoints.length > 0,
//                   checkpoints,
//                   originalCheckPoints: child.checkPoints,
//                   time: timeValue,
//                   timeString: child.time,
//                 });
//               }

//               const aggregatedTest = aggregatedTestsMap.get(key)!;
//               aggregatedTest.totalAvailable += remainingParts;
//               aggregatedTest.totalRequired += requiredQty;

//               if (
//                 !aggregatedTest.allocations.some(
//                   (a) => a.ticketCode === ticketCode,
//                 )
//               ) {
//                 aggregatedTest.ticketCount += 1;
//               }

//               if (
//                 equipment &&
//                 !aggregatedTest.equipmentList.includes(equipment)
//               ) {
//                 aggregatedTest.equipmentList.push(equipment);
//               }

//               aggregatedTest.allocations.push({
//                 testId: child.id,
//                 ticketCode,
//                 allocationId: allocation.id,
//                 isChild: true,
//                 parentTestId: parentTest.id,
//                 remainingParts,
//                 requiredQty,
//                 originalTest: child,
//                 sequenceNumber: childIndex + 1,
//                 totalInSequence: sequenceLength,
//                 nextTestId: childTests[childIndex + 1]?.id,
//                 previousTestId:
//                   childIndex > 0 ? childTests[childIndex - 1]?.id : undefined,
//               });
//             });
//           }

//           const parentRemaining = toNumber(parentTest.remainingParts);
//           if (parentRemaining <= 0) {
//             return;
//           }

//           const parentRequired = toNumber(parentTest.requiredQty);
//           const displayName = getTestDisplayName(parentTest, false);
//           const key = generateTestKey(parentTest, false);
//           const equipment = getEquipment(parentTest);

//           if (!aggregatedTestsMap.has(key)) {
//             const unit = parentTest.unit || "";
//             let testUnit: TestUnit = "other";
//             if (unit === "Hours") testUnit = "hour";
//             else if (unit === "Cycle") testUnit = "cycle";
//             else if (unit === "Drops") testUnit = "drops";
//             else if (unit === "Grams") testUnit = "grams";

//             const timeValue =
//               parentTest.time && parentTest.time !== ""
//                 ? Number(parentTest.time)
//                 : undefined;
//             const checkpoints = parseCheckpoints(parentTest.checkPoints || "");

//             aggregatedTestsMap.set(key, {
//               testName: parentTest.testName || "",
//               isChildTest: false,
//               displayName,
//               testUnit,
//               unit,
//               testCondition: parentTest.testCondition,
//               machineEquipment: parentTest.machineEquipment,
//               machineEquipment2: parentTest.machineEquipment2,
//               totalAvailable: 0,
//               totalRequired: 0,
//               allocations: [],
//               ticketCount: 0,
//               equipmentList: [],
//               hasCheckpoints: checkpoints.length > 0,
//               checkpoints,
//               originalCheckPoints: parentTest.checkPoints,
//               time: timeValue,
//               timeString: parentTest.time,
//             });
//           }

//           const aggregatedTest = aggregatedTestsMap.get(key)!;
//           aggregatedTest.totalAvailable += parentRemaining;
//           aggregatedTest.totalRequired += parentRequired;

//           if (
//             !aggregatedTest.allocations.some((a) => a.ticketCode === ticketCode)
//           ) {
//             aggregatedTest.ticketCount += 1;
//           }

//           if (equipment && !aggregatedTest.equipmentList.includes(equipment)) {
//             aggregatedTest.equipmentList.push(equipment);
//           }

//           aggregatedTest.allocations.push({
//             testId: parentTest.id,
//             ticketCode,
//             allocationId: allocation.id,
//             isChild: false,
//             remainingParts: parentRemaining,
//             requiredQty: parentRequired,
//             originalTest: parentTest,
//           });
//         });
//       });

//       const aggregatedTests = Array.from(aggregatedTestsMap.values()).map(
//         (test) => {
//           const totalRequired = test.allocations.reduce(
//             (sum, alloc) => sum + alloc.requiredQty,
//             0,
//           );
//           const totalAvailable = test.allocations.reduce(
//             (sum, alloc) => sum + alloc.remainingParts,
//             0,
//           );

//           let enhancedDisplayName = `${test.displayName} (${totalAvailable}/${totalRequired})`;

//           if (test.ticketCount > 1) {
//             enhancedDisplayName += ` [${test.ticketCount} tickets]`;
//           }

//           if (test.isChildTest) {
//             enhancedDisplayName = `↳ ${enhancedDisplayName}`;
//           } else if (test.unit === "Hours") {
//             enhancedDisplayName = `⏰ ${enhancedDisplayName}`;
//           } else if (test.unit === "Cycle") {
//             enhancedDisplayName = `🔄 ${enhancedDisplayName}`;
//           }

//           return {
//             ...test,
//             totalAvailable,
//             totalRequired,
//             displayName: enhancedDisplayName,
//           };
//         },
//       );

//       aggregatedTests.sort((a, b) => {
//         if (!a.isChildTest && b.isChildTest) return -1;
//         if (a.isChildTest && !b.isChildTest) return 1;
//         return a.displayName.localeCompare(b.displayName);
//       });

//       return aggregatedTests;
//     } catch (error) {
//       console.error("Error creating aggregated test options:", error);
//       return [];
//     }
//   };

//   // Reset state when modal closes
//   useEffect(() => {
//     if (!isOpen) {
//       setScannedParts([]);
//       setPartInput("");
//       setMachineDetails(null);
//       setAvailableTests([]);
//       setSelectedTestAggregated(null);
//       setSelectedAllocation(null);
//       setTestStarted(false);
//       setIsAutoStart(false);
//       setTestValue(null);
//       setAllocationLimits({});
//       setSessionTicketCode(null);
//     }
//   }, [isOpen]);

//   // Load available tests
//   useEffect(() => {
//     if (isOpen) {
//       const tests = createAggregatedTestOptions();
//       setAvailableTests(tests);
//       console.log("All available tests:", tests);
//     }
//   }, [isOpen, selectedChamber, machine, allocationRecords]);

//   // Handle test selection
//   const handleTestSelect = (testKey: string) => {
//     const test = availableTests.find((t) => t.displayName === testKey);

//     if (!test) return;

//     // ENHANCEMENT: Prevent changing test if parts are already scanned
//     if (scannedParts.length > 0) {
//       // Check if the new test has allocation for the current session ticket
//       const currentTicket = sessionTicketCode || scannedParts[0].ticketCode;
//       const hasAllocationForCurrentTicket = test.allocations.some(
//         (alloc) => alloc.ticketCode === currentTicket,
//       );

//       if (!hasAllocationForCurrentTicket) {
//         alert(
//           `Cannot change test! You are currently loading parts from Ticket: ${currentTicket}\n\nThis test (${test.testName}) doesn't have allocation for Ticket: ${currentTicket}\n\nAvailable tickets for this test: ${test.allocations.map((a) => a.ticketCode).join(", ")}\n\nTo change test, you must cancel this session and start a new one.`,
//         );
//         return;
//       }

//       // Check if it's the same test (different display but same allocation)
//       const isSameTest = selectedTestAggregated?.allocations.some((alloc) =>
//         test.allocations.some(
//           (t) => t.testId === alloc.testId && t.ticketCode === alloc.ticketCode,
//         ),
//       );

//       if (!isSameTest) {
//         alert(
//           `Cannot change test! You are currently loading parts for: ${selectedTestAggregated?.displayName}\n\nTo load parts for a different test, you must cancel this session and start a new one.`,
//         );
//         return;
//       }
//     }

//     setSelectedTestAggregated(test);

//     // Clear session ticket when changing test (only if no parts scanned)
//     if (scannedParts.length === 0) {
//       setSessionTicketCode(null);
//       setSelectedAllocation(null);
//     }

//     // For hour-based tests, auto-start
//     if (test.unit === "Hours") {
//       setTestStarted(true);
//       setIsAutoStart(true);
//       if (test.time) {
//         setTestValue(test.time);
//       }
//     } else {
//       setTestStarted(false);
//       setIsAutoStart(false);
//       setTestValue(null);
//     }

//     // Reset scanned parts if any (only when changing to a completely different test)
//     if (scannedParts.length > 0) {
//       // Don't reset parts if we're just selecting the same test again
//       const isDifferentTest =
//         !selectedTestAggregated ||
//         test.displayName !== selectedTestAggregated.displayName;

//       if (isDifferentTest) {
//         // This should not happen due to validation above, but as safety
//         setScannedParts([]);
//         setMachineDetails(null);
//         setSessionTicketCode(null);
//         setSelectedAllocation(null);
//         alert("Test changed. Previous parts cleared.");
//       }
//     }
//   };

//   const handlePartScan = async () => {
//     // Validation
//     if (!selectedTestAggregated) {
//       alert("Please select a test first before scanning parts.");
//       return;
//     }

//     if (!partInput.trim()) {
//       alert("Please enter a part number");
//       return;
//     }

//     const partNumber = partInput.trim().toUpperCase();

//     try {
//       // STEP 1: Validate part exists in stage1TableData and get ticket mapping
//       const validation = validatePartMappingAndTicket(partNumber);

//       if (validation.errors.length > 0) {
//         alert(`❌ Cannot scan part:\n\n${validation.errors.join("\n• ")}`);
//         setPartInput("");
//         return;
//       }

//       const partDetails = validation.partDetails;
//       if (!partDetails) {
//         alert("Unable to retrieve part details");
//         setPartInput("");
//         return;
//       }

//       // STEP 2: Check if this part's ticket has allocation for selected test
//       const matchingAllocation = selectedTestAggregated.allocations.find(
//         (alloc) => alloc.ticketCode === partDetails.ticketCode,
//       );

//       if (!matchingAllocation) {
//         // Show which tickets DO have allocation
//         const availableTickets = selectedTestAggregated.allocations
//           .map((a) => a.ticketCode)
//           .filter((value, index, self) => self.indexOf(value) === index);

//         let errorMsg = `Part ${partNumber} (Ticket: ${partDetails.ticketCode}) cannot be loaded.\n\n`;
//         errorMsg += `Ticket ${partDetails.ticketCode} doesn't have allocation for test: ${selectedTestAggregated.testName}\n\n`;

//         if (availableTickets.length > 0) {
//           if (scannedParts.length === 0) {
//             errorMsg += `Available tickets for this test:\n${availableTickets.map((t) => `• ${t}`).join("\n")}`;
//           } else {
//             const currentTicket =
//               sessionTicketCode || scannedParts[0].ticketCode;
//             errorMsg += `You're currently loading parts from: ${currentTicket}\n`;
//             errorMsg += `Available tickets for this test:\n${availableTickets.map((t) => `• ${t}`).join("\n")}`;
//           }
//         } else {
//           errorMsg += `No tickets have allocation for this test.`;
//         }

//         alert(errorMsg);
//         setPartInput("");
//         return;
//       }

//       // STEP 3: Check allocation availability
//       if (matchingAllocation.remainingParts <= 0) {
//         alert(
//           `No allocation available for part ${partNumber}.\n\nTicket ${partDetails.ticketCode} has exhausted allocation for "${selectedTestAggregated.testName}".`,
//         );
//         setPartInput("");
//         return;
//       }

//       // STEP 3A: Ensure part remains within its assigned test flow
//       const partHistory = getPartTestHistory(partNumber);
//       if (partHistory.length > 0) {
//         const uniqueRoots = Array.from(
//           new Set(partHistory.map((entry) => entry.rootId)),
//         );
//         const newRootIdRaw = selectedTestAggregated.isChildTest
//           ? selectedTestAggregated.combinedTestId ||
//             matchingAllocation.parentTestId ||
//             matchingAllocation.testId
//           : matchingAllocation.testId;
//         const newRootId =
//           newRootIdRaw !== undefined && newRootIdRaw !== null
//             ? String(newRootIdRaw)
//             : null;

//         if (
//           newRootId &&
//           uniqueRoots.length > 0 &&
//           !uniqueRoots.includes(newRootId)
//         ) {
//           const previousEntry = partHistory[partHistory.length - 1];
//           const previousName =
//             previousEntry.testName || "another test sequence";
//           alert(
//             `Part ${partNumber} is already assigned to ${previousName}.` +
//               `\n\nOnly the linked child tests for that sequence can be loaded.`,
//           );
//           setPartInput("");
//           return;
//         }
//       }

//       // STEP 4: For combined tests, check sequence
//       if (
//         selectedTestAggregated.isChildTest &&
//         matchingAllocation.previousTestId
//       ) {
//         const hasCompletedPrevious = hasCompletedPreviousTest(
//           partNumber,
//           matchingAllocation.testId,
//           matchingAllocation.previousTestId,
//         );

//         if (!hasCompletedPrevious) {
//           // Find the previous test name
//           const allocations = getCurrentAllocations();
//           let previousTestName = "Previous Test";

//           allocations.forEach((alloc) => {
//             (alloc.testAllocations || []).forEach((parent) => {
//               (parent.childTests || []).forEach((child) => {
//                 if (child.id === matchingAllocation.previousTestId) {
//                   previousTestName =
//                     child.subTestName ||
//                     child.machineEquipment ||
//                     "Previous Test";
//                 }
//               });
//             });
//           });

//           alert(
//             `Part ${partNumber} must complete "${previousTestName}" first before starting "${selectedTestAggregated.subTestName || selectedTestAggregated.testName}".\n\nOnly parts that have completed the previous step can be loaded for this test.`,
//           );
//           setPartInput("");
//           return;
//         }
//       }

//       // STEP 5: Check if part already loaded for this specific test
//       const loadedForThisTest = isPartLoadedForTest(
//         partNumber,
//         matchingAllocation.testId,
//       );
//       if (loadedForThisTest.isLoaded) {
//         alert(
//           `Part ${partNumber} is already loaded in ${loadedForThisTest.equipment} for test: ${loadedForThisTest.testName}`,
//         );
//         setPartInput("");
//         return;
//       }

//       // STEP 6: Check if part is currently in another stage of the same combined test
//       if (selectedTestAggregated.combinedTestId) {
//         const combinedTestStatus = isPartInCombinedTest(
//           partNumber,
//           selectedTestAggregated.combinedTestId,
//         );
//         if (combinedTestStatus.isInTest) {
//           alert(
//             `Part ${partNumber} is currently in "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.stageNumber}) of this combined test. It must complete that stage first.`,
//           );
//           setPartInput("");
//           return;
//         }
//       }

//       // NEW STEP: Check if part is in ANY chamber of the same combined test (using parentTestName)
//       if (selectedTestAggregated.parentTestName) {
//         const combinedTestStatus = isPartInAnyStageOfCombinedTest(
//           partNumber,
//           selectedTestAggregated.parentTestName,
//         );

//         if (combinedTestStatus.isInTest) {
//           alert(
//             `Part ${partNumber} is currently in ${combinedTestStatus.chamber} for "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.sequenceNumber}). It must complete that stage first.`,
//           );
//           setPartInput("");
//           return;
//         }
//       }

//       // STEP 7: Checkpoint handling
//       let checkpointInfo = null;
//       if (selectedTestAggregated.hasCheckpoints) {
//         const timesAlreadyLoaded = getCheckpointProgress(
//           partNumber,
//           matchingAllocation.testId,
//         );
//         const checkpointIndex =
//           timesAlreadyLoaded %
//           (selectedTestAggregated.checkpoints?.length || 1);
//         const currentCheckpoint =
//           selectedTestAggregated.checkpoints?.[checkpointIndex] || null;

//         checkpointInfo = {
//           checkpoint: currentCheckpoint,
//           checkpointIndex: checkpointIndex,
//           totalCheckpoints: selectedTestAggregated.checkpoints?.length || 1,
//           checkpoints: selectedTestAggregated.checkpoints,
//           originalCheckPoints: selectedTestAggregated.originalCheckPoints,
//         };
//       }

//       // STEP 8: Set session ticket if this is the first part
//       if (scannedParts.length === 0) {
//         setSessionTicketCode(partDetails.ticketCode);

//         // Build machine details (first part only)
//         const machineDetailsData = {
//           machineId: machine?.machine_id || selectedChamber,
//           machine: machine?.machine_description || selectedChamber,
//           ticketCode: partDetails.ticketCode,
//           project: partDetails.project,
//           build: partDetails.build,
//           colour: partDetails.colour,
//         };
//         setMachineDetails(machineDetailsData);
//       }

//       // STEP 9: Build part data FROM stage1TableData
//       const partData = {
//         id: Date.now(),
//         partNumber: partDetails.partNumber,
//         serialNumber: partDetails.serialNumber,
//         ticketCode: partDetails.ticketCode,
//         project: partDetails.project,
//         build: partDetails.build,
//         colour: partDetails.colour,
//         scanStatus: "OK",
//         cosmeticImages: [],
//         nonCosmeticImages: [],
//         selectedTestId: matchingAllocation.testId, // Use the specific test ID for this ticket
//         selectedAllocation: matchingAllocation, // Store the specific allocation
//         combinedTestId: selectedTestAggregated.combinedTestId,
//         sequenceNumber: matchingAllocation.sequenceNumber,
//         totalInSequence: matchingAllocation.totalInSequence,
//         nextTestId: matchingAllocation.nextTestId,
//         previousTestId: matchingAllocation.previousTestId,
//         checkpointInfo: checkpointInfo,
//         // Store the original stage1 record for reference
//         stage1Record: partDetails.stage1Record,
//       };

//       // STEP 10: Track allocation limit for this specific test+ticket combination
//       const allocationKey = `${matchingAllocation.testId}|${partDetails.ticketCode}`;
//       const currentLoaded =
//         allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

//       setAllocationLimits((prev) => ({
//         ...prev,
//         [allocationKey]: {
//           testId: matchingAllocation.testId,
//           testName: selectedTestAggregated.testName,
//           ticketCode: partDetails.ticketCode,
//           partsAvailableToAllocate: matchingAllocation.remainingParts,
//           alreadyAllocated:
//             matchingAllocation.requiredQty - matchingAllocation.remainingParts,
//           requiredQty: matchingAllocation.requiredQty,
//           maxPartsCanLoad: matchingAllocation.remainingParts,
//           partsLoadedInThisSession: currentLoaded + 1,
//         },
//       }));

//       // Set selected allocation for display
//       setSelectedAllocation({
//         testId: matchingAllocation.testId,
//         testName: selectedTestAggregated.testName,
//         ticketCode: partDetails.ticketCode,
//         partsAvailableToAllocate: matchingAllocation.remainingParts,
//         alreadyAllocated:
//           matchingAllocation.requiredQty - matchingAllocation.remainingParts,
//         requiredQty: matchingAllocation.requiredQty,
//         maxPartsCanLoad: matchingAllocation.remainingParts,
//         partsLoadedInThisSession: currentLoaded + 1,
//       });

//       // STEP 11: Add part to scanned parts
//       setScannedParts((prev) => [...prev, partData]);

//       // FIXED STEP 12: Update ONLY the specific ticket's allocation, not aggregated total
//       const updatedAllocations = selectedTestAggregated.allocations.map(
//         (alloc) => {
//           if (
//             alloc.testId === matchingAllocation.testId &&
//             alloc.ticketCode === partDetails.ticketCode
//           ) {
//             // Only reduce allocation for this specific ticket
//             return {
//               ...alloc,
//               remainingParts: alloc.remainingParts - 1,
//             };
//           }
//           return alloc; // Other tickets remain unchanged
//         },
//       );

//       // Recalculate total available from ALL allocations
//       const updatedTotalAvailable = updatedAllocations.reduce(
//         (sum, alloc) => sum + alloc.remainingParts,
//         0,
//       );

//       // Update the selected test in available tests
//       setAvailableTests((prev) =>
//         prev.map((test) => {
//           if (
//             test.testName === selectedTestAggregated.testName &&
//             test.isChildTest === selectedTestAggregated.isChildTest &&
//             test.allocations[0]?.testId ===
//               selectedTestAggregated.allocations[0]?.testId
//           ) {
//             return updateTestDisplayName(test, updatedTotalAvailable);
//           }
//           return test;
//         }),
//       );

//       // Update selected test with new allocations
//       setSelectedTestAggregated((prev) => {
//         if (!prev) return null;
//         const updatedTest = {
//           ...prev,
//           allocations: updatedAllocations,
//           totalAvailable: updatedTotalAvailable,
//         };
//         return updateTestDisplayName(updatedTest, updatedTotalAvailable);
//       });

//       setPartInput("");

//       // Show success message
//       let message = `✅ Part ${partNumber} scanned successfully\n`;
//       message += `📋 Ticket: ${partDetails.ticketCode}\n`;
//       message += `🧪 Test: ${selectedTestAggregated.displayName.split(" (")[0]}\n`;
//       message += `🏷️ Project: ${partDetails.project} | Build: ${partDetails.build}\n`;

//       if (
//         selectedTestAggregated.isChildTest &&
//         matchingAllocation.sequenceNumber
//       ) {
//         message += `🔄 Sequence: Step ${matchingAllocation.sequenceNumber}/${matchingAllocation.totalInSequence}\n`;
//       }

//       // Show updated allocation for this specific ticket
//       const updatedTicketAllocation = updatedAllocations.find(
//         (a) =>
//           a.testId === matchingAllocation.testId &&
//           a.ticketCode === partDetails.ticketCode,
//       );

//       message += `📊 Allocation: ${currentLoaded + 1}/${matchingAllocation.remainingParts} loaded from this ticket\n`;
//       message += `📦 Remaining in ticket: ${updatedTicketAllocation ? updatedTicketAllocation.remainingParts : matchingAllocation.remainingParts - 1} parts`;

//       if (checkpointInfo) {
//         message += `\n📍 Checkpoint: ${checkpointInfo.checkpointIndex + 1}/${checkpointInfo.totalCheckpoints} (Value: ${checkpointInfo.checkpoint})`;
//       }

//       alert(message);
//     } catch (error: any) {
//       console.error("Error scanning part:", error);
//       alert(`Error scanning part: ${error.message || "Unknown error"}`);
//       setPartInput("");
//     }
//   };

//   // Helper to update display name with new counts
//   const updateTestDisplayName = (
//     test: AggregatedTestOption,
//     totalAvailable: number,
//   ): AggregatedTestOption => {
//     // Get base display name without counts
//     let baseDisplayName = "";
//     if (test.isChildTest && test.parentTestName) {
//       // For child tests: "Parent Name (Child SubTest)"
//       baseDisplayName = `${test.parentTestName} (${test.subTestName || test.testName})`;
//     } else {
//       // For parent tests: just the test name
//       baseDisplayName = test.testName;
//     }

//     // Calculate total required across all tickets
//     const totalRequired = test.allocations.reduce(
//       (sum, alloc) => sum + alloc.requiredQty,
//       0,
//     );

//     // Add aggregated count
//     let enhancedDisplayName = `${baseDisplayName} (${totalAvailable}/${totalRequired})`;

//     // Add ticket count if more than 1
//     if (test.ticketCount > 1) {
//       enhancedDisplayName += ` [${test.ticketCount} tickets]`;
//     }

//     // Add indicators
//     if (test.isChildTest) {
//       enhancedDisplayName = `↳ ${enhancedDisplayName}`;
//     } else if (test.unit === "Hours") {
//       enhancedDisplayName = `⏰ ${enhancedDisplayName}`;
//     } else if (test.unit === "Cycle") {
//       enhancedDisplayName = `🔄 ${enhancedDisplayName}`;
//     }

//     return {
//       ...test,
//       totalAvailable: totalAvailable,
//       totalRequired: totalRequired,
//       displayName: enhancedDisplayName,
//     };
//   };

//   // Handle start button click for non-hour tests
//   const handleStartTest = () => {
//     if (!selectedTestAggregated) return;

//     setTestStarted(true);
//     if (selectedTestAggregated.time) {
//       setTestValue(selectedTestAggregated.time);
//     }
//   };

//   const handleRemovePart = (partId: number) => {
//     const partToRemove = scannedParts.find((part) => part.id === partId);

//     if (!partToRemove || !partToRemove.selectedAllocation) return;

//     // Restore allocation counts
//     const allocationKey = `${partToRemove.selectedTestId}|${partToRemove.ticketCode}`;
//     const currentLoaded =
//       allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

//     // Update allocation limits
//     setAllocationLimits((prev) => ({
//       ...prev,
//       [allocationKey]: {
//         ...prev[allocationKey],
//         partsLoadedInThisSession: Math.max(0, currentLoaded - 1),
//       },
//     }));

//     // Update aggregated test counts - ONLY for the specific ticket
//     if (selectedTestAggregated) {
//       const updatedAllocations = selectedTestAggregated.allocations.map(
//         (alloc) => {
//           if (
//             alloc.testId === partToRemove.selectedTestId &&
//             alloc.ticketCode === partToRemove.ticketCode
//           ) {
//             // Only restore allocation for this specific ticket
//             return {
//               ...alloc,
//               remainingParts: alloc.remainingParts + 1,
//             };
//           }
//           return alloc; // Other tickets remain unchanged
//         },
//       );

//       const updatedTotalAvailable = updatedAllocations.reduce(
//         (sum, alloc) => sum + alloc.remainingParts,
//         0,
//       );

//       // Update available tests
//       setAvailableTests((prev) =>
//         prev.map((test) => {
//           if (
//             test.testName === selectedTestAggregated.testName &&
//             test.isChildTest === selectedTestAggregated.isChildTest &&
//             test.allocations[0]?.testId ===
//               selectedTestAggregated.allocations[0]?.testId
//           ) {
//             return updateTestDisplayName(test, updatedTotalAvailable);
//           }
//           return test;
//         }),
//       );

//       // Update selected test with new allocations
//       setSelectedTestAggregated((prev) => {
//         if (!prev) return null;
//         const updatedTest = {
//           ...prev,
//           allocations: updatedAllocations,
//           totalAvailable: updatedTotalAvailable,
//         };
//         return updateTestDisplayName(updatedTest, updatedTotalAvailable);
//       });
//     }

//     // Remove part from scanned parts
//     const updatedScannedParts = scannedParts.filter(
//       (part) => part.id !== partId,
//     );
//     setScannedParts(updatedScannedParts);

//     // Clear session ticket if no parts left
//     if (updatedScannedParts.length === 0) {
//       setMachineDetails(null);
//       setSelectedAllocation(null);
//       setSessionTicketCode(null);
//     }
//   };

//   const updateAllocation = async (
//     ticketCode: string,
//     testId: string,
//     isChildTest: boolean = false,
//   ): Promise<boolean> => {
//     try {
//       const allocations = getCurrentAllocations();
//       const ticketIndex = allocations.findIndex(
//         (alloc) => alloc.ticketCode === ticketCode,
//       );

//       if (ticketIndex === -1) {
//         console.error("Ticket not found:", ticketCode);
//         return false;
//       }

//       const sourceAllocation = allocations[ticketIndex];
//       const clonedAllocation: AllocationDto = {
//         ...sourceAllocation,
//         testAllocations: (sourceAllocation.testAllocations || []).map(
//           (parent) => ({
//             ...parent,
//             childTests: (parent.childTests || []).map((child) => ({
//               ...child,
//             })),
//           }),
//         ),
//       };

//       let allocationUpdated = false;

//       for (const parentTest of clonedAllocation.testAllocations) {
//         if (parentTest.id === testId) {
//           const remaining = toNumber(parentTest.remainingParts);
//           if (remaining > 0) {
//             parentTest.remainingParts = remaining - 1;
//             allocationUpdated = true;
//             break;
//           }
//         }

//         for (const childTest of parentTest.childTests || []) {
//           if (childTest.id === testId) {
//             const childRemaining = toNumber(childTest.remainingParts);
//             if (childRemaining > 0) {
//               childTest.remainingParts = childRemaining - 1;

//               const parentRemaining = toNumber(parentTest.remainingParts);
//               if (isChildTest && parentRemaining > 0) {
//                 parentTest.remainingParts = parentRemaining - 1;
//               }

//               allocationUpdated = true;
//               break;
//             }
//           }
//         }

//         if (allocationUpdated) {
//           break;
//         }
//       }

//       if (!allocationUpdated) {
//         console.warn(
//           "Allocation not updated - no remaining parts available for test:",
//           testId,
//         );
//         return false;
//       }

//       let totalRemaining = 0;
//       clonedAllocation.testAllocations.forEach((test) => {
//         totalRemaining += toNumber(test.remainingParts);
//         (test.childTests || []).forEach((child) => {
//           totalRemaining += toNumber(child.remainingParts);
//         });
//       });

//       clonedAllocation.totalRemainingParts = totalRemaining;
//       const updatedTimestamp = new Date().toISOString();
//       clonedAllocation.updatedAt = updatedTimestamp;

//       const updatedAllocations = allocations.map((alloc, index) =>
//         index === ticketIndex ? clonedAllocation : alloc,
//       );

//       try {
//         await updateBackendAllocation(ticketCode, {
//           testAllocations: clonedAllocation.testAllocations,
//           totalRemainingParts: clonedAllocation.totalRemainingParts ?? null,
//           updatedAt: updatedTimestamp,
//         });
//       } catch (backendError) {
//         console.error("Failed to persist allocation update:", backendError);
//         return false;
//       }

//       localStorage.setItem(
//         "ticket_allocations_array",
//         JSON.stringify(updatedAllocations),
//       );
//       setAllocationRecords(updatedAllocations);

//       return true;
//     } catch (error) {
//       console.error("Error updating allocation:", error);
//       return false;
//     }
//   };

//   const handleConfirmLoad = async () => {
//     if (!selectedTestAggregated || !scannedParts.length) {
//       alert("No test selected or parts scanned!");
//       return;
//     }

//     // For non-hour tests, check if test is started
//     if (selectedTestAggregated.unit !== "Hours" && !testStarted) {
//       alert('Please click "Start Test" button to begin the test');
//       return;
//     }

//     // Check if all parts belong to the same ticket
//     const firstTicket = scannedParts[0].ticketCode;
//     const allSameTicket = scannedParts.every(
//       (part) => part.ticketCode === firstTicket,
//     );

//     if (!allSameTicket) {
//       alert(
//         "Error: Parts belong to different tickets. This should not happen with validation.",
//       );
//       return;
//     }

//     // Update allocations for all scanned parts
//     let allocationErrors: string[] = [];
//     for (const part of scannedParts) {
//       if (!part.selectedAllocation) {
//         allocationErrors.push(
//           `No allocation found for part ${part.partNumber}`,
//         );
//         continue;
//       }

//       const allocationUpdated = await updateAllocation(
//         part.ticketCode,
//         part.selectedTestId,
//         selectedTestAggregated.isChildTest,
//       );

//       if (!allocationUpdated) {
//         allocationErrors.push(
//           `Failed to update allocation for part ${part.partNumber}`,
//         );
//       }
//     }

//     if (allocationErrors.length > 0) {
//       alert(`Allocation update failed:\n${allocationErrors.join("\n")}`);
//       return;
//     }

//     // Create chamber load record
//     const currentTime = new Date().toISOString();
//     const testDisplayName = selectedTestAggregated.displayName.split(" (")[0]; // Get just the name part

//     const loadPayload: ChamberLoadPayload = {
//       chamber: selectedChamber,
//       machineId: machine?.machine_id || selectedChamber,
//       machineDescription: machine?.machine_description || selectedChamber,
//       parts: scannedParts.map((part) => ({
//         partNumber: part.partNumber,
//         serialNumber: part.serialNumber,
//         ticketCode: part.ticketCode,
//         testId: part.selectedTestId,
//         testName: testDisplayName,
//         testCondition: selectedTestAggregated.testCondition || "",
//         combinedTestId: selectedTestAggregated.combinedTestId,
//         sequenceNumber: part.sequenceNumber,
//         totalInSequence: part.totalInSequence,
//         nextTestId: part.nextTestId,
//         previousTestId: part.previousTestId,
//         checkpointInfo: part.checkpointInfo,
//         checkpoint: part.checkpointInfo?.checkpoint ?? null,
//         checkpointIndex: part.checkpointInfo?.checkpointIndex ?? null,
//         totalCheckpoints: part.checkpointInfo?.totalCheckpoints ?? null,
//         loadedAt: currentTime,
//         scanStatus: part.scanStatus,
//         cosmeticImages: part.cosmeticImages || [],
//         nonCosmeticImages: part.nonCosmeticImages || [],
//         hasImages:
//           (part.cosmeticImages?.length ?? 0) > 0 ||
//           (part.nonCosmeticImages?.length ?? 0) > 0,
//         testUnit: selectedTestAggregated.unit || "other",
//         testValue: testValue || selectedTestAggregated.time || null,
//         testStarted,
//         testStatus: testStarted ? "start" : "pending",
//         isCompleted: false,
//         completedAt: null,
//         actualTestValue: null,
//         testResults: null,
//         testNotes: null,
//         allocationTicketCode: part.ticketCode,
//         allocationTestId: part.selectedTestId,
//         stage1Record: part.stage1Record,
//       })),
//       machineDetails: {
//         ...machineDetails,
//         machineId: machine?.machine_id,
//         machineDescription: machine?.machine_description,
//         selectedTest: selectedTestAggregated,
//       },
//       loadedAt: currentTime,
//       status: "loaded",
//       testUnit: selectedTestAggregated.unit || "other",
//       testValue: testValue || selectedTestAggregated.time || null,
//       testStarted,
//       testStatus: testStarted ? "start" : "pending",
//       timerStatus: testStarted ? "start" : "stop",
//       timerStartTime: testStarted ? currentTime : null,
//       actualStartTime: testStarted ? currentTime : null,
//       isCompleted: false,
//       completedAt: null,
//       operator: "System",
//       lastUpdated: currentTime,
//       totalParts: scannedParts.length,
//       selectedTestId: scannedParts[0]?.selectedTestId || null,
//       selectedTestName: testDisplayName,
//       isCombinedTest: selectedTestAggregated.isChildTest,
//       combinedTestId: selectedTestAggregated.combinedTestId,
//       ticketCode: scannedParts[0]?.ticketCode || null,
//       isSingleTicketLoad: true,
//       sequenceNumber: selectedTestAggregated.sequenceNumber || null,
//       totalInSequence: selectedTestAggregated.totalInSequence || null,
//     };

//     setChamberLoading?.(selectedChamber, true);

//     try {
//       await addChamberLoad(loadPayload);
//       await refreshChamberLoads();
//       onLoadComplete();
//     } catch (error) {
//       console.error("Error creating chamber load:", error);
//       alert("Failed to create chamber load. Please try again.");
//       setChamberLoading?.(selectedChamber, false);
//       return;
//     }

//     setChamberLoading?.(selectedChamber, false);

//     // Show summary
//     let summary = `✅ Successfully loaded ${scannedParts.length} parts into ${machine?.machine_description || selectedChamber}\n`;
//     summary += `🔧 Equipment ID: ${machine?.machine_id || selectedChamber}\n`;
//     summary += `🧪 Test: ${selectedTestAggregated.displayName}\n`;
//     summary += `🎫 Ticket: ${scannedParts[0].ticketCode}\n`;

//     // Group by ticket for summary (should only be one ticket)
//     const partsByTicket: Record<string, number> = {};
//     scannedParts.forEach((part) => {
//       partsByTicket[part.ticketCode] =
//         (partsByTicket[part.ticketCode] || 0) + 1;
//     });

//     summary += "\n📊 Allocation Summary:\n";
//     Object.entries(partsByTicket).forEach(([ticketCode, count]) => {
//       const allocationInfo = selectedTestAggregated.allocations.find(
//         (a) => a.ticketCode === ticketCode,
//       );
//       const originalAllocation = allocationInfo?.requiredQty || 0;
//       const remainingAfter = (allocationInfo?.remainingParts || 0) - count;

//       summary += `• Ticket ${ticketCode}: ${count} part(s) loaded\n`;
//       summary += `  Original allocation: ${originalAllocation} | Remaining: ${Math.max(0, remainingAfter)}\n`;
//     });

//     if (
//       selectedTestAggregated.isChildTest &&
//       selectedTestAggregated.sequenceNumber
//     ) {
//       summary += `\n🔄 Sequence: Step ${selectedTestAggregated.sequenceNumber} of ${selectedTestAggregated.totalInSequence}\n`;
//     }

//     summary += `\n📈 Status: ${testStarted ? "Test Started" : "Pending Start"}\n`;

//     // Show test configuration
//     summary += `\n⚙️ Test Configuration:\n`;
//     summary += `• Test Unit: ${selectedTestAggregated.unit}\n`;
//     if (testValue) {
//       summary += `• Test Value: ${testValue} ${selectedTestAggregated.unit === "Hours" ? "Hours" : selectedTestAggregated.unit}\n`;
//     }
//     summary += `• Test Status: ${testStarted ? "Started" : "Not Started"}\n`;
//     if (isAutoStart) {
//       summary += `• Auto-start: Yes (Hour-based test)\n`;
//     }
//     if (
//       selectedTestAggregated.isChildTest &&
//       selectedTestAggregated.parentTestName
//     ) {
//       summary += `• Combined Test: ${selectedTestAggregated.parentTestName}\n`;
//     }

//     // Show loaded parts
//     summary += `\n📦 Loaded Parts:\n`;
//     scannedParts.forEach((part) => {
//       summary += `• ${part.partNumber}`;
//       if (part.checkpointInfo) {
//         summary += ` (Checkpoint ${part.checkpointInfo.checkpointIndex + 1}/${part.checkpointInfo.totalCheckpoints})`;
//       }
//       summary += "\n";
//     });

//     // Combined test next steps
//     if (
//       selectedTestAggregated.isChildTest &&
//       selectedTestAggregated.nextTestId
//     ) {
//       summary += `\n⏭️ Next Step in Sequence:\n`;
//       // Find next test name and equipment
//       const allocations = getCurrentAllocations();
//       let nextTestName = "Next Test";
//       let nextEquipment = "";

//       allocations.forEach((alloc) => {
//         (alloc.testAllocations || []).forEach((parent) => {
//           (parent.childTests || []).forEach((child) => {
//             if (child.id === selectedTestAggregated.nextTestId) {
//               nextTestName =
//                 child.subTestName || child.machineEquipment || "Next Test";
//               nextEquipment =
//                 child.machineEquipment || child.machineEquipment2 || "";
//             }
//           });
//         });
//       });

//       summary += `• After completion, load these parts into ${nextEquipment} for: ${nextTestName}\n`;
//     }

//     const partsWithImages = scannedParts.filter(
//       (part) =>
//         part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0,
//     ).length;

//     if (partsWithImages > 0) {
//       summary += `\n📸 Images uploaded for ${partsWithImages} part(s).`;
//     }

//     alert(summary);

//     onLoadComplete();
//     onClose();
//   };

//   if (!isOpen || !machine) return null;

//   // Get completed parts for info display
//   const completedParts =
//     selectedTestAggregated?.isChildTest &&
//     selectedTestAggregated.allocations[0]?.previousTestId
//       ? getPartsCompletedTest(
//           selectedTestAggregated.allocations[0].previousTestId,
//         )
//       : [];

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-white sticky top-0">
//           <div>
//             <h3 className="text-xl font-bold text-gray-800">
//               Load Equipment: {selectedChamber}
//             </h3>
//             <p className="text-sm text-gray-600 mt-1">
//               {machine.machine_description} ({machine.machine_id})
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <X size={24} />
//           </button>
//         </div>

//         <div className="p-6">
//           {/* Ticket Restriction Banner */}
//           {scannedParts.length > 0 && (
//             <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//               <div className="flex items-center gap-2">
//                 <Info className="text-blue-600" size={16} />
//                 <span className="font-medium text-blue-800">
//                   Ticket Restriction Active
//                 </span>
//               </div>
//               <div className="mt-1 text-sm text-blue-700">
//                 You are loading parts from{" "}
//                 <span className="font-bold">
//                   {sessionTicketCode || scannedParts[0].ticketCode}
//                 </span>
//               </div>
//               <div className="text-xs text-blue-600 mt-1">
//                 • All parts must belong to ticket:{" "}
//                 {sessionTicketCode || scannedParts[0].ticketCode}
//                 <br />
//                 • To load parts from a different ticket, cancel and start a new
//                 session
//                 <br />• Test selection is now locked to this ticket
//               </div>
//             </div>
//           )}

//           {/* STEP 1: Test Selection */}
//           <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//             <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
//               <Info size={16} />
//               Step 1: Select Test (Required Before Scanning)
//             </h4>

//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 All Available Tests
//                 <span className="ml-2 text-xs text-gray-500">
//                   (Aggregated across all tickets)
//                 </span>
//               </label>
//               <div className="relative">
//                 <select
//                   value={
//                     selectedTestAggregated
//                       ? selectedTestAggregated.displayName
//                       : ""
//                   }
//                   onChange={(e) => handleTestSelect(e.target.value)}
//                   className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
//                   disabled={scannedParts.length > 0}
//                 >
//                   <option value="">Select a test...</option>
//                   {availableTests.map((test) => (
//                     <option key={test.displayName} value={test.displayName}>
//                       {test.displayName}
//                     </option>
//                   ))}
//                 </select>
//                 <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
//                   <ChevronDown size={20} className="text-gray-400" />
//                 </div>
//               </div>

//               {/* Test Count Info */}
//               {availableTests.length > 0 && (
//                 <div className="mt-2 text-xs text-gray-500">
//                   Showing {availableTests.length} unique test(s) aggregated from
//                   all tickets
//                 </div>
//               )}

//               {/* Locked Test Warning */}
//               {scannedParts.length > 0 && (
//                 <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
//                   <div className="flex items-center gap-2">
//                     <AlertCircle className="text-yellow-600" size={14} />
//                     <span className="text-sm font-medium text-yellow-700">
//                       Test Selection Locked
//                     </span>
//                   </div>
//                   <div className="text-xs text-yellow-600 mt-1">
//                     Test selection is locked because parts are already scanned.
//                     To change test, cancel this session and start a new one.
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Selected Test Info */}
//             {selectedTestAggregated && (
//               <div className="p-3 bg-white border border-green-200 rounded-lg">
//                 <div className="flex items-center gap-2 mb-2">
//                   <Check className="text-green-600" size={16} />
//                   <span className="font-medium text-green-800">
//                     Test Selected
//                   </span>
//                   {selectedTestAggregated.isChildTest && (
//                     <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
//                       <Link size={12} />
//                       Combined Test Step
//                     </span>
//                   )}
//                   {selectedTestAggregated.ticketCount > 1 && (
//                     <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
//                       {selectedTestAggregated.ticketCount} Tickets
//                     </span>
//                   )}
//                   {scannedParts.length > 0 && (
//                     <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
//                       Locked to Ticket
//                     </span>
//                   )}
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <div className="md:col-span-2">
//                     <span className="text-sm text-gray-600">Test Name:</span>
//                     <span className="font-medium ml-2">
//                       {selectedTestAggregated.displayName.split(" (")[0]}
//                       {selectedTestAggregated.isChildTest && (
//                         <span className="text-gray-500">
//                           {" "}
//                           (
//                           {selectedTestAggregated.subTestName ||
//                             selectedTestAggregated.testName}
//                           )
//                         </span>
//                       )}
//                     </span>
//                     {selectedTestAggregated.parentTestName && (
//                       <div className="text-xs text-gray-500 mt-1">
//                         Parent Test: {selectedTestAggregated.parentTestName}
//                       </div>
//                     )}
//                   </div>
//                   <div>
//                     <span className="text-sm text-gray-600">
//                       Total Available:
//                     </span>
//                     <span className="font-medium ml-2">
//                       {selectedTestAggregated.totalAvailable}/
//                       {selectedTestAggregated.totalRequired} parts
//                     </span>
//                     <div className="text-xs text-gray-500">
//                       Across {selectedTestAggregated.ticketCount} ticket(s)
//                     </div>
//                   </div>
//                   <div>
//                     <span className="text-sm text-gray-600">Equipment:</span>
//                     <span className="font-medium ml-2">
//                       {selectedTestAggregated.equipmentList.length > 0
//                         ? selectedTestAggregated.equipmentList.join(", ")
//                         : "Not Specified"}
//                     </span>
//                   </div>
//                   {selectedTestAggregated.sequenceNumber &&
//                     selectedTestAggregated.totalInSequence && (
//                       <>
//                         <div>
//                           <span className="text-sm text-gray-600">
//                             Sequence Step:
//                           </span>
//                           <span className="font-medium ml-2">
//                             {selectedTestAggregated.sequenceNumber}/
//                             {selectedTestAggregated.totalInSequence}
//                           </span>
//                         </div>
//                         <div>
//                           <span className="text-sm text-gray-600">
//                             Previous Step:
//                           </span>
//                           <span className="font-medium ml-2">
//                             {selectedTestAggregated.previousTestId
//                               ? "Required"
//                               : "First Step"}
//                           </span>
//                         </div>
//                       </>
//                     )}
//                   <div>
//                     <span className="text-sm text-gray-600">Test Unit:</span>
//                     <span className="font-medium ml-2">
//                       {selectedTestAggregated.unit || "N/A"}
//                       {selectedTestAggregated.time &&
//                         ` (${selectedTestAggregated.time} ${selectedTestAggregated.unit})`}
//                     </span>
//                   </div>
//                   <div className="md:col-span-2">
//                     <span className="text-sm text-gray-600">
//                       Test Condition:
//                     </span>
//                     <span className="font-medium ml-2">
//                       {selectedTestAggregated.testCondition || "Standard"}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Ticket Breakdown */}
//                 {selectedTestAggregated.ticketCount > 1 && (
//                   <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
//                     <div className="text-sm font-medium text-gray-700 mb-2">
//                       Ticket Breakdown:
//                     </div>
//                     <div className="space-y-1 max-h-20 overflow-y-auto">
//                       {selectedTestAggregated.allocations
//                         .reduce((acc: any[], alloc) => {
//                           const existing = acc.find(
//                             (a) => a.ticketCode === alloc.ticketCode,
//                           );
//                           if (existing) {
//                             existing.remainingParts += alloc.remainingParts;
//                             existing.requiredQty += alloc.requiredQty;
//                           } else {
//                             acc.push({
//                               ticketCode: alloc.ticketCode,
//                               remainingParts: alloc.remainingParts,
//                               requiredQty: alloc.requiredQty,
//                             });
//                           }
//                           return acc;
//                         }, [])
//                         .map((ticketAlloc: any) => (
//                           <div
//                             key={ticketAlloc.ticketCode}
//                             className="text-xs text-gray-600 flex justify-between"
//                           >
//                             <span>{ticketAlloc.ticketCode}:</span>
//                             <span className="font-medium">
//                               {ticketAlloc.remainingParts}/
//                               {ticketAlloc.requiredQty}
//                             </span>
//                           </div>
//                         ))}
//                     </div>
//                   </div>
//                 )}

//                 {/* Current Allocation Info (when part is scanned) */}
//                 {selectedAllocation && (
//                   <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
//                     <div className="flex items-center gap-2 mb-2">
//                       <Info className="text-blue-600" size={14} />
//                       <span className="text-sm font-medium text-blue-700">
//                         Current Ticket Allocation
//                       </span>
//                     </div>
//                     <div className="text-sm text-blue-600 mb-2">
//                       Ticket:{" "}
//                       <span className="font-medium">
//                         {selectedAllocation.ticketCode}
//                       </span>
//                       {sessionTicketCode && (
//                         <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
//                           Session Ticket
//                         </span>
//                       )}
//                     </div>
//                     <div className="grid grid-cols-2 gap-2 text-xs">
//                       <div>
//                         <span className="text-gray-600">
//                           Loaded this session:
//                         </span>
//                         <span className="font-medium ml-2">
//                           {selectedAllocation.partsLoadedInThisSession}
//                         </span>
//                       </div>
//                       <div>
//                         <span className="text-gray-600">
//                           Available in ticket:
//                         </span>
//                         <span className="font-medium ml-2">
//                           {selectedAllocation.partsAvailableToAllocate}
//                         </span>
//                       </div>
//                       <div>
//                         <span className="text-gray-600">
//                           Required for ticket:
//                         </span>
//                         <span className="font-medium ml-2">
//                           {selectedAllocation.requiredQty}
//                         </span>
//                       </div>
//                       <div>
//                         <span className="text-gray-600">Max can load:</span>
//                         <span className="font-medium ml-2">
//                           {selectedAllocation.maxPartsCanLoad}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Completed Parts Info for Combined Tests */}
//                 {selectedTestAggregated.isChildTest &&
//                   selectedTestAggregated.previousTestId &&
//                   completedParts.length > 0 && (
//                     <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
//                       <div className="flex items-center gap-2 mb-2">
//                         <Check className="text-green-600" size={14} />
//                         <span className="text-sm font-medium text-green-700">
//                           Available Parts
//                         </span>
//                       </div>
//                       <div className="text-xs text-green-600 mb-2">
//                         {completedParts.length} part(s) have completed the
//                         previous step and can be loaded:
//                       </div>
//                       <div className="text-xs font-mono bg-white p-2 rounded border max-h-20 overflow-y-auto">
//                         {completedParts.slice(0, 10).join(", ")}
//                         {completedParts.length > 10 &&
//                           ` ... and ${completedParts.length - 10} more`}
//                       </div>
//                     </div>
//                   )}

//                 {/* Checkpoint Info */}
//                 {selectedTestAggregated.hasCheckpoints && (
//                   <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
//                     <div className="flex items-center gap-2">
//                       <AlertCircle className="text-yellow-600" size={14} />
//                       <span className="text-sm font-medium text-yellow-700">
//                         Checkpoint Test
//                       </span>
//                     </div>
//                     <div className="text-xs text-yellow-600 mt-1">
//                       Checkpoints:{" "}
//                       {selectedTestAggregated.checkpoints?.join(", ") || "None"}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* STEP 2: Test Configuration */}
//           {selectedTestAggregated && (
//             <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
//               <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
//                 <Clock size={16} />
//                 Step 2: Test Configuration
//               </h4>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 {/* Test Information */}
//                 <div>
//                   <div className="text-sm font-medium text-gray-700 mb-2">
//                     Test Details
//                   </div>
//                   <div className="space-y-1 text-sm">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Test Unit:</span>
//                       <span className="font-medium">
//                         {selectedTestAggregated.unit || "N/A"}
//                       </span>
//                     </div>
//                     {selectedTestAggregated.time && (
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Test Duration:</span>
//                         <span className="font-medium">
//                           {selectedTestAggregated.time}{" "}
//                           {selectedTestAggregated.unit}
//                         </span>
//                       </div>
//                     )}
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Status:</span>
//                       <span
//                         className={`font-medium ${testStarted ? "text-green-600" : "text-yellow-600"}`}
//                       >
//                         {testStarted ? "Started" : "Not Started"}
//                         {isAutoStart && " (Auto)"}
//                       </span>
//                     </div>
//                     {selectedTestAggregated.isChildTest &&
//                       selectedTestAggregated.sequenceNumber && (
//                         <>
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">
//                               Sequence Step:
//                             </span>
//                             <span className="font-medium">
//                               {selectedTestAggregated.sequenceNumber}/
//                               {selectedTestAggregated.totalInSequence}
//                             </span>
//                           </div>
//                           {selectedTestAggregated.previousTestId &&
//                             completedParts.length > 0 && (
//                               <div className="flex justify-between">
//                                 <span className="text-gray-600">
//                                   Eligible Parts:
//                                 </span>
//                                 <span className="font-medium text-green-600">
//                                   {completedParts.length} available
//                                 </span>
//                               </div>
//                             )}
//                         </>
//                       )}
//                   </div>
//                 </div>

//                 {/* Start Button (only for non-hour tests) */}
//                 {selectedTestAggregated.unit !== "Hours" && (
//                   <div className="flex items-end">
//                     <button
//                       onClick={handleStartTest}
//                       disabled={testStarted}
//                       className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
//                         testStarted
//                           ? "bg-green-600 text-white cursor-default"
//                           : "bg-blue-600 text-white hover:bg-blue-700"
//                       }`}
//                     >
//                       {testStarted ? (
//                         <>
//                           <Check size={20} />
//                           <span>Test Started</span>
//                         </>
//                       ) : (
//                         <>
//                           <Play size={20} />
//                           <span>Start Test</span>
//                         </>
//                       )}
//                     </button>
//                     {!testStarted && (
//                       <p className="text-xs text-gray-500 mt-1 ml-3">
//                         Required before loading parts
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* Auto-start info for hour tests */}
//                 {selectedTestAggregated.unit === "Hours" && testStarted && (
//                   <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
//                     <Check className="text-green-600 mr-2" size={16} />
//                     <div>
//                       <div className="text-sm font-medium text-green-800">
//                         Test Auto-started
//                       </div>
//                       <div className="text-xs text-green-600">
//                         Hour-based tests start automatically
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Important Notes */}
//               <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
//                 <div className="flex items-start gap-2">
//                   <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
//                   <div className="text-sm text-yellow-700">
//                     <span className="font-medium">Important:</span>{" "}
//                     {selectedTestAggregated.unit === "Hours"
//                       ? "Hour-based tests auto-start when selected. Test duration is set from allocation."
//                       : 'Click "Start Test" above before scanning parts.'}
//                     {selectedTestAggregated.isChildTest &&
//                       selectedTestAggregated.previousTestId &&
//                       " Only parts that have completed the previous step can be loaded."}
//                     {scannedParts.length > 0 &&
//                       ` All parts must belong to ticket: ${sessionTicketCode || scannedParts[0].ticketCode}`}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* STEP 3: Part Scanning (only enabled after test selection) */}
//           <div className="mb-6">
//             {/* <h4 className="text-sm font-medium text-gray-700 mb-2">
//               Step 3: Scan Parts
//               {!selectedTestAggregated && (
//                 <span className="ml-2 text-red-500 text-xs">(Select a test first)</span>
//               )}
//             </h4> */}
//             {/* <div className="flex gap-2">
//               <input
//                 type="text"
//                 value={partInput}
//                 onChange={(e) => setPartInput(e.target.value)}
//                 onKeyPress={(e) => e.key === 'Enter' && handlePartScan()}
//                 placeholder={
//                   !selectedTestAggregated
//                     ? "Select a test first"
//                     : scannedParts.length > 0
//                     ? `Scan parts from Ticket: ${sessionTicketCode || scannedParts[0].ticketCode}`
//                     : "Enter part number to scan"
//                 }
//                 disabled={!selectedTestAggregated || !testStarted}
//                 className={`flex-1 px-4 py-3 border rounded-lg bg-white text-gray-700 font-mono text-lg focus:outline-none focus:ring-2 focus:border-transparent ${
//                   !selectedTestAggregated || !testStarted
//                     ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
//                     : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
//                 }`}
//               />
//               <button
//                 onClick={handlePartScan}
//                 disabled={scanning || !partInput.trim() || !selectedTestAggregated || !testStarted}
//                 className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
//                   !selectedTestAggregated || !testStarted
//                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                     : 'bg-blue-600 text-white hover:bg-blue-700'
//                 }`}
//               >
//                 {scanning ? (
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
//                 ) : (
//                   <>
//                     <Scan size={20} />
//                     <span>Scan</span>
//                   </>
//                 )}
//               </button>
//             </div>
//             <p className="text-start text-sm text-gray-500 mt-2">
//               {!selectedTestAggregated
//                 ? 'Select a test from above first'
//                 : !testStarted
//                 ? 'Start the test before scanning parts'
//                 : scannedParts.length > 0
//                 ? `Scanning parts from Ticket: ${sessionTicketCode || scannedParts[0].ticketCode} - All parts must belong to this same ticket`
//                 : selectedTestAggregated.isChildTest && selectedTestAggregated.previousTestId
//                 ? 'Scan parts that have completed previous step in sequence'
//                 : 'Enter part number to scan and assign to selected test'}
//             </p> */}
//             <PartScanner
//               partInput={partInput}
//               onScan={handlePartScan}
//               scanning={scanning}
//               disabled={!selectedTestAggregated || !testStarted}
//               enableRealtimeScan={enableRealtimeScan}
//               onInputChange={setPartInput}
//               // onBarcodeScanned={handleBarcodeScanned}
//               selectedTestAggregated={selectedTestAggregated}
//               testStarted={testStarted}
//               sessionTicketCode={sessionTicketCode}
//               scannedParts={scannedParts}
//               autoEnableScanner={true}
//             />
//           </div>

//           {/* Scanned Parts */}
//           <div className="mb-6">
//             <h4 className="text-sm font-medium text-gray-700 mb-3">
//               Scanned Parts ({scannedParts.length})
//               {scannedParts.length > 0 && (
//                 <span className="ml-2 text-sm text-gray-500">
//                   (Restricted to Ticket:{" "}
//                   {sessionTicketCode || scannedParts[0].ticketCode})
//                 </span>
//               )}
//               {selectedAllocation && (
//                 <span className="ml-2 text-sm text-gray-500">
//                   • Loaded: {selectedAllocation.partsLoadedInThisSession}/
//                   {selectedAllocation.maxPartsCanLoad}
//                 </span>
//               )}
//             </h4>
//             <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
//               {scannedParts.length === 0 ? (
//                 <div className="p-8 text-center text-gray-400">
//                   {!selectedTestAggregated
//                     ? "Select a test first, then scan parts"
//                     : !testStarted
//                       ? "Start the test, then scan parts"
//                       : selectedTestAggregated.isChildTest &&
//                           selectedTestAggregated.previousTestId
//                         ? "Scan parts that have completed the previous step"
//                         : "No parts scanned yet"}
//                 </div>
//               ) : (
//                 <div className="divide-y">
//                   {scannedParts.map((part) => (
//                     <div key={part.id} className="p-4 hover:bg-gray-50">
//                       <div className="flex justify-between items-start">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-3">
//                             <div className="font-medium text-gray-800 text-lg">
//                               {part.partNumber}
//                             </div>
//                             <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
//                               OK
//                             </span>
//                             {part.checkpointInfo && (
//                               <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
//                                 Checkpoint{" "}
//                                 {part.checkpointInfo.checkpointIndex + 1}/
//                                 {part.checkpointInfo.totalCheckpoints}
//                               </span>
//                             )}
//                             {part.selectedAllocation?.sequenceNumber && (
//                               <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
//                                 Step {part.selectedAllocation.sequenceNumber}
//                               </span>
//                             )}
//                             <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
//                               Ticket: {part.ticketCode}
//                             </span>
//                           </div>
//                           <div className="text-sm text-gray-500 mt-2 space-y-1">
//                             <div>
//                               Project: {part.project} | Build: {part.build} |
//                               Colour: {part.colour}
//                             </div>
//                             <div className="text-blue-600 font-medium">
//                               Test:{" "}
//                               {
//                                 selectedTestAggregated?.displayName.split(
//                                   " (",
//                                 )[0]
//                               }
//                               {selectedTestAggregated?.isChildTest &&
//                                 ` (${selectedTestAggregated.subTestName || selectedTestAggregated.testName})`}
//                             </div>
//                             {part.selectedAllocation?.sequenceNumber && (
//                               <div className="text-purple-600 text-sm">
//                                 Combined Test Sequence: Step{" "}
//                                 {part.selectedAllocation.sequenceNumber} of{" "}
//                                 {part.selectedAllocation.totalInSequence}
//                               </div>
//                             )}
//                             {part.checkpointInfo && (
//                               <div className="text-yellow-600">
//                                 Checkpoint Value:{" "}
//                                 {part.checkpointInfo.checkpoint}{" "}
//                                 {selectedTestAggregated?.unit}
//                               </div>
//                             )}
//                             <div className="text-xs text-gray-400">
//                               Allocation Test ID: {part.selectedTestId}
//                             </div>
//                           </div>
//                         </div>
//                         <button
//                           onClick={() => handleRemovePart(part.id)}
//                           className="text-red-500 hover:text-red-700 transition-colors ml-4"
//                           title="Remove part"
//                         >
//                           <X size={20} />
//                         </button>
//                       </div>

//                       {/* Image Upload */}
//                       {/* <PartImageUpload
//                         part={part}
//                         onImageUpload={(imageType, file) => {
//                           handleImageUpload(part.id, imageType, file, (imageData) => {
//                             setScannedParts(prev => prev.map(p => {
//                               if (p.id === part.id) {
//                                 const imagesArray = imageType === 'cosmetic' ? p.cosmeticImages : p.nonCosmeticImages;
//                                 return {
//                                   ...p,
//                                   [imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages']: [...imagesArray, imageData]
//                                 };
//                               }
//                               return p;
//                             }));
//                           });
//                         }}
//                         onImageRemove={(imageType, index) => {
//                           setScannedParts(prev => prev.map(p => {
//                             if (p.id === part.id) {
//                               const imagesArray = imageType === 'cosmetic' ? p.cosmeticImages : p.nonCosmeticImages;
//                               const updatedImages = imagesArray.filter((_, idx) => idx !== index);
//                               return {
//                                 ...p,
//                                 [imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages']: updatedImages
//                               };
//                             }
//                             return p;
//                           }));
//                         }}
//                         isUploadingCosmetic={isUploading(part.id, 'cosmetic')}
//                         isUploadingNonCosmetic={isUploading(part.id, 'nonCosmetic')}
//                       /> */}

//                       <PartImageUpload
//                         part={part}
//                         onImageUpload={async (imageType, file) => {
//                           let storedPath: string | null = null;

//                           await handleImageUpload(
//                             part.id,
//                             imageType,
//                             file,
//                             (filePath) => {
//                               storedPath = filePath || file.name;
//                               setScannedParts((prev) =>
//                                 prev.map((p) => {
//                                   if (p.id === part.id) {
//                                     const key =
//                                       imageType === "cosmetic"
//                                         ? "cosmeticImages"
//                                         : "nonCosmeticImages";
//                                     const imagesArray = Array.isArray(p[key])
//                                       ? p[key]
//                                       : [];
//                                     return {
//                                       ...p,
//                                       [key]: [
//                                         ...imagesArray,
//                                         storedPath as string,
//                                       ],
//                                     };
//                                   }
//                                   return p;
//                                 }),
//                               );
//                             },
//                           );

//                           return storedPath;
//                         }}
//                         onImageRemove={(imageType, index) => {
//                           setScannedParts((prev) =>
//                             prev.map((p) => {
//                               if (p.id === part.id) {
//                                 const key =
//                                   imageType === "cosmetic"
//                                     ? "cosmeticImages"
//                                     : "nonCosmeticImages";
//                                 const imagesArray = Array.isArray(p[key])
//                                   ? p[key]
//                                   : [];
//                                 const updatedImages = imagesArray.filter(
//                                   (_, idx) => idx !== index,
//                                 );
//                                 return {
//                                   ...p,
//                                   [key]: updatedImages,
//                                 };
//                               }
//                               return p;
//                             }),
//                           );
//                         }}
//                         isUploadingCosmetic={isUploading(part.id, "cosmetic")}
//                         isUploadingNonCosmetic={isUploading(
//                           part.id,
//                           "nonCosmetic",
//                         )}
//                       />
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex justify-end gap-3">
//             <button
//               onClick={onClose}
//               className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleConfirmLoad}
//               disabled={
//                 !selectedTestAggregated ||
//                 scannedParts.length === 0 ||
//                 (selectedTestAggregated.unit !== "Hours" && !testStarted)
//               }
//               className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               Confirm Load ({scannedParts.length} parts)
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoadEquipmentModal;

import React, { useState, useEffect } from "react";
import {
  X,
  Scan,
  Upload,
  ImageIcon,
  Info,
  ChevronDown,
  Clock,
  Play,
  AlertCircle,
  Check,
  ChevronRight,
  Hourglass,
  Link,
  RefreshCw,
} from "lucide-react";
import { MachineItem, Part } from "../types";
import PartImageUpload from "./PartImageUpload";
import { useTimer } from "../hooks/useTimer";
import { useChamberLoads } from "../hooks/useChamberLoads";
import { usePartScanning } from "../hooks/usePartScanning";
import {
  ChamberLoadPayload,
  fetchAllocations,
  AllocationDto,
  AllocationTestDto,
  updateBackendAllocation,
} from "@/lib/backendApi";
import PartScanner from "./PartScanner";
import {
  fetchAllScannedParts,
  findPartInScannedParts,
  ScannedPart,
} from "@/lib/backendApi";

interface LoadEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChamber: string;
  data: MachineItem[];
  onLoadComplete: () => void;
  setChamberLoading?: (machineId: string, loading: boolean) => void;
}

// Test unit types
type TestUnit = "hour" | "cycle" | "drops" | "orientation" | "grams" | "other";

interface AllocationLimit {
  testId: string;
  testName: string;
  ticketCode: string;
  partsAvailableToAllocate: number;
  alreadyAllocated: number;
  requiredQty: number;
  maxPartsCanLoad: number;
  partsLoadedInThisSession: number;
}

interface AggregatedTestOption {
  testName: string;
  subTestName?: string;
  parentTestName?: string;
  isChildTest: boolean;
  displayName: string;
  testUnit?: TestUnit;
  unit?: string;
  testCondition?: string;
  machineEquipment?: string;
  machineEquipment2?: string;
  // Aggregated counts
  totalAvailable: number;
  totalRequired: number;
  // Original allocations from different tickets
  allocations: Array<{
    testId: string;
    ticketCode: string;
    allocationId: string; // Parent allocation ID
    isChild: boolean;
    parentTestId?: string;
    remainingParts: number;
    requiredQty: number;
    // For display and matching
    originalTest: any;
    // Combined test sequence info
    sequenceNumber?: number;
    totalInSequence?: number;
    nextTestId?: string;
    previousTestId?: string;
  }>;
  // Combined test fields
  combinedTestId?: string;
  sequenceNumber?: number;
  totalInSequence?: number;
  nextTestId?: string;
  previousTestId?: string;
  hasCheckpoints?: boolean;
  checkpoints?: number[];
  originalCheckPoints?: string;
  time?: number;
  timeString?: string;
  // Additional aggregated info
  ticketCount: number;
  equipmentList: string[];
}

const LoadEquipmentModal: React.FC<LoadEquipmentModalProps> = ({
  isOpen,
  onClose,
  selectedChamber,
  data,
  onLoadComplete,
  setChamberLoading,
}) => {
  const [scannedParts, setScannedParts] = useState<Part[]>([]);
  const [partInput, setPartInput] = useState("");
  const [machineDetails, setMachineDetails] = useState<any>(null);
  const [availableTests, setAvailableTests] = useState<AggregatedTestOption[]>(
    [],
  );
  const [allocationRecords, setAllocationRecords] = useState<AllocationDto[]>(
    [],
  );
  const [selectedTestAggregated, setSelectedTestAggregated] =
    useState<AggregatedTestOption | null>(null);
  const [selectedAllocation, setSelectedAllocation] =
    useState<AllocationLimit | null>(null);
  const [allocationLimits, setAllocationLimits] = useState<
    Record<string, AllocationLimit>
  >({});
  const [sessionTicketCode, setSessionTicketCode] = useState<string | null>(
    null,
  );
  const [enableRealtimeScan, setEnableRealtimeScan] = useState(true);
  const [scannedPartsCache, setScannedPartsCache] = useState<ScannedPart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  // Test configuration
  const [testStarted, setTestStarted] = useState<boolean>(false);
  const [isAutoStart, setIsAutoStart] = useState<boolean>(false);
  const [testValue, setTestValue] = useState<number | null>(null);

  const {
    chamberLoads: cachedChamberLoads,
    addChamberLoad,
    refreshChamberLoads,
  } = useChamberLoads();
  const { scanning, scanPart, handleImageUpload, isUploading } =
    usePartScanning();

  // Load scanned parts from backend API
  const loadScannedPartsFromApi = async () => {
    setIsLoadingParts(true);
    try {
      const parts = await fetchAllScannedParts();
      setScannedPartsCache(parts);
    } catch (error) {
      console.error("Failed to load scanned parts from API:", error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshChamberLoads();
      loadScannedPartsFromApi();
    }
  }, [isOpen, refreshChamberLoads]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadAllocations = async () => {
      try {
        const records = await fetchAllocations();
        if (!isMounted) {
          return;
        }

        setAllocationRecords(records);
      } catch (error) {
        if (isMounted) {
          setAllocationRecords([]);
        }
        console.error("Error fetching ticket allocations:", error);
      }
    };

    loadAllocations();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const machine = data.find(
    (m) =>
      m.machine_id === selectedChamber ||
      m.machine_description === selectedChamber,
  );

  const getCurrentAllocations = (): AllocationDto[] => {
    return allocationRecords;
  };

  const toNumber = (value?: number | string | null): number => {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  };

  // Helper function to parse checkpoints from string
  const parseCheckpoints = (checkPointsString: string): number[] => {
    if (!checkPointsString || typeof checkPointsString !== "string") {
      return [];
    }

    const cleanString = checkPointsString.replace(/^CP:/i, "").trim();
    if (!cleanString) return [];

    const parts = cleanString.split(",");
    const checkpoints: number[] = [];

    parts.forEach((part) => {
      const matches = part.match(/\d+(\.\d+)?/g);
      if (matches) {
        matches.forEach((match) => {
          const number = parseFloat(match);
          if (!isNaN(number)) {
            checkpoints.push(number);
          }
        });
      }
    });

    return [...new Set(checkpoints.sort((a, b) => a - b))];
  };

  // Get checkpoint progress for a part
  const normalizePartId = (value: string): string =>
    typeof value === "string"
      ? value.replace(/[^a-z0-9]/gi, "").toUpperCase()
      : "";

  const getCheckpointProgress = (
    partNumber: string,
    testId: string,
  ): number => {
    try {
      const loads = cachedChamberLoads ?? [];
      let timesLoaded = 0;

      loads.forEach((load: any) => {
        load.parts?.forEach((part: any) => {
          if (
            part.partNumber === partNumber &&
            part.testId === testId &&
            part.testStatus === "completed" &&
            part.checkpointInfo
          ) {
            timesLoaded++;
          }
        });
      });

      return timesLoaded;
    } catch (error) {
      console.error("Error getting checkpoint progress:", error);
      return 0;
    }
  };

  // Check if part has completed previous step in combined test sequence
  const hasCompletedPreviousTest = (
    partNumber: string,
    testId: string,
    previousTestId?: string,
  ): boolean => {
    if (!previousTestId) return true; // First in sequence, no previous required

    try {
      const chamberLoads = cachedChamberLoads ?? [];

      for (const load of chamberLoads) {
        if (load.parts) {
          for (const part of load.parts) {
            // Check if this is the specific part and test
            if (
              part.partNumber === partNumber &&
              part.testId === previousTestId
            ) {
              // Check if the INDIVIDUAL PART is completed
              if (part.isCompleted === true) {
                console.log(
                  `✓ Part ${partNumber} has completed previous test ${previousTestId}: isCompleted=${part.isCompleted}`,
                );
                return true;
              } else {
                console.log(
                  `✗ Part ${partNumber} has NOT completed previous test ${previousTestId}: isCompleted=${part.isCompleted}, testStatus=${part.testStatus}`,
                );
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking previous test completion:", error);
      return false;
    }
  };

  // Check if part is currently in any stage of a combined test
  const isPartInCombinedTest = (
    partNumber: string,
    combinedTestId: string,
  ): { isInTest: boolean; currentStage?: string; stageNumber?: number } => {
    try {
      const chamberLoads = cachedChamberLoads ?? [];

      for (const load of chamberLoads) {
        if (load.status === "loaded" && load.parts) {
          for (const part of load.parts) {
            if (
              part.partNumber === partNumber &&
              part.combinedTestId === combinedTestId &&
              !part.isCompleted
            ) {
              return {
                isInTest: true,
                currentStage: part.testName,
                stageNumber: part.sequenceNumber,
              };
            }
          }
        }
      }

      return { isInTest: false };
    } catch (error) {
      console.error("Error checking if part is in combined test:", error);
      return { isInTest: false };
    }
  };

  // NEW FUNCTION: Check if part is in ANY stage of a combined test (using parentTestName)
  const isPartInAnyStageOfCombinedTest = (
    partNumber: string,
    parentTestName: string,
  ): {
    isInTest: boolean;
    combinedTestId?: string;
    currentStage?: string;
    currentTestId?: string;
    chamber?: string;
    sequenceNumber?: number;
  } => {
    try {
      const chamberLoads = cachedChamberLoads ?? [];

      for (const load of chamberLoads) {
        if (load.status === "loaded" && load.parts) {
          for (const part of load.parts) {
            // Check if part is in ANY chamber for this parent test name
            // Look at the testName field which should match parentTestName for combined tests
            if (
              part.partNumber === partNumber &&
              !part.isCompleted &&
              part.testName === parentTestName
            ) {
              return {
                isInTest: true,
                combinedTestId: part.combinedTestId,
                currentStage: part.testName,
                currentTestId: part.testId,
                chamber: load.machineDescription || load.chamber,
                sequenceNumber: part.sequenceNumber,
              };
            }
          }
        }
      }

      return { isInTest: false };
    } catch (error) {
      console.error(
        "Error checking if part is in any stage of combined test:",
        error,
      );
      return { isInTest: false };
    }
  };

  // Get all parts that have completed a specific test in combined sequence
  const getPartsCompletedTest = (previousTestId: string): string[] => {
    try {
      const chamberLoads = cachedChamberLoads ?? [];
      const completedParts: string[] = [];

      for (const load of chamberLoads) {
        if (load.parts) {
          for (const part of load.parts) {
            if (part.testId === previousTestId && part.isCompleted === true) {
              completedParts.push(part.partNumber);
            }
          }
        }
      }

      console.log(
        `Found ${completedParts.length} parts completed test ${previousTestId}:`,
        completedParts,
      );
      return [...new Set(completedParts)]; // Remove duplicates
    } catch (error) {
      console.error("Error getting parts completed test:", error);
      return [];
    }
  };

  // Check if part is already loaded for a specific test
  const isPartLoadedForTest = (
    partNumber: string,
    testId: string,
  ): { isLoaded: boolean; equipment?: string; testName?: string } => {
    try {
      const chamberLoads = cachedChamberLoads ?? [];
      const normalizedTarget = normalizePartId(partNumber);

      for (const load of chamberLoads) {
        if (load.status === "loaded" && load.parts) {
          for (const part of load.parts) {
            const normalizedPart = normalizePartId(part.partNumber);
            const partTestId =
              part.testId !== undefined && part.testId !== null
                ? String(part.testId)
                : null;
            const targetTestId = testId === "any" ? null : String(testId);
            const matchesTest =
              testId === "any" ||
              (partTestId !== null &&
                targetTestId !== null &&
                partTestId === targetTestId);
            if (
              normalizedPart === normalizedTarget &&
              matchesTest &&
              !part.isCompleted
            ) {
              return {
                isLoaded: true,
                equipment: load.machineDescription || load.chamber || "Unknown",
                testName: part.testName || "Unknown",
              };
            }
          }
        }
      }

      return { isLoaded: false };
    } catch (error) {
      console.error("Error checking if part is loaded for test:", error);
      return { isLoaded: false };
    }
  };

  interface PartTestHistoryEntry {
    rootId: string;
    allocationTestId: string | null;
    combinedTestId: string | null;
    testName: string | null;
  }

  const getPartTestHistory = (partNumber: string): PartTestHistoryEntry[] => {
    try {
      const chamberLoads = cachedChamberLoads ?? [];
      const normalizedTarget = normalizePartId(partNumber);
      const history: PartTestHistoryEntry[] = [];

      for (const load of chamberLoads) {
        if (!load.parts) {
          continue;
        }

        for (const part of load.parts) {
          const normalizedPart = normalizePartId(part.partNumber);
          if (!normalizedPart || normalizedPart !== normalizedTarget) {
            continue;
          }

          const allocationTestId =
            part.allocationTestId !== undefined &&
            part.allocationTestId !== null
              ? String(part.allocationTestId)
              : part.testId !== undefined && part.testId !== null
                ? String(part.testId)
                : null;

          const combinedTestId =
            part.combinedTestId !== undefined && part.combinedTestId !== null
              ? String(part.combinedTestId)
              : null;

          const rootId = combinedTestId || allocationTestId;
          if (!rootId) {
            continue;
          }

          const recordedTestName =
            typeof part.testName === "string"
              ? part.testName
              : typeof part.selectedTestName === "string"
                ? part.selectedTestName
                : null;

          history.push({
            rootId,
            allocationTestId,
            combinedTestId,
            testName: recordedTestName,
          });
        }
      }

      return history;
    } catch (error) {
      console.error("Error reading part test history:", error);
      return [];
    }
  };

  // Get part's ticket code from scanned parts API
  const getPartTicketCodeFromApi = (partNumber: string): string | null => {
    try {
      const normalizedTarget = normalizePartId(partNumber);

      for (const record of scannedPartsCache) {
        const partsInRecord = parsePartsFromRecord(record);
        for (const part of partsInRecord) {
          if (normalizePartId(part) === normalizedTarget) {
            return record.ticketCode || null;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting part ticket code from API:", error);
      return null;
    }
  };

  // Parse parts from a scanned record
  const parsePartsFromRecord = (record: ScannedPart): string[] => {
    try {
      if (!record.parts) return [];

      // Try parsing as JSON array
      try {
        const parsed = JSON.parse(record.parts);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => String(p).trim()).filter(Boolean);
        }
      } catch (e) {
        // Not JSON, try comma-separated
      }

      // Parse as comma-separated string
      return record.parts
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    } catch (error) {
      console.error("Error parsing parts from record:", error, record);
      return [];
    }
  };

  // Enhanced function to get part details from API
  const getPartDetailsFromApi = async (
    partNumber: string,
  ): Promise<{
    exists: boolean;
    details: {
      partNumber: string;
      ticketCode: string;
      serialNumber: string;
      project: string;
      build: string;
      colour: string;
      source: string;
      processStage: string;
      session: string;
      scannedPartRecord: ScannedPart;
    } | null;
    error: string | null;
  }> => {
    try {
      const result = await findPartInScannedParts(partNumber);

      if (!result.found || !result.partDetails) {
        return {
          exists: false,
          details: null,
          error: `Part ${partNumber} not found in OQC records`,
        };
      }

      const details = result.partDetails;

      return {
        exists: true,
        details: {
          partNumber: details.partNumber,
          ticketCode: details.ticketCode,
          serialNumber: "", // Not available in your API
          project: details.project,
          build: details.build,
          colour: details.colour,
          source: details.source,
          processStage: details.processStage,
          session: details.session,
          scannedPartRecord: details.scannedPartRecord,
        },
        error: null,
      };
    } catch (error) {
      console.error("Error getting part details from API:", error);
      return {
        exists: false,
        details: null,
        error: "Error accessing OQC records from API",
      };
    }
  };

  // Enhanced validation that checks API data and ticket consistency
  const validatePartMappingAndTicket = async (
    partNumber: string,
  ): Promise<{
    errors: string[];
    warnings: string[];
    partDetails: {
      partNumber: string;
      ticketCode: string;
      serialNumber: string;
      project: string;
      build: string;
      colour: string;
      source: string;
      processStage: string;
      session: string;
      scannedPartRecord: ScannedPart;
    } | null;
  }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // STEP 1: Check if part exists in API data
    const partDetailsResult = await getPartDetailsFromApi(partNumber);

    if (!partDetailsResult.exists) {
      errors.push(
        partDetailsResult.error ||
          `Part ${partNumber} not found in OQC records`,
      );
      return { errors, warnings, partDetails: null };
    }

    const partDetails = partDetailsResult.details!;

    // STEP 2: Check ticket consistency with already scanned parts
    if (scannedParts.length > 0) {
      const firstTicket = sessionTicketCode || scannedParts[0].ticketCode;
      if (partDetails.ticketCode !== firstTicket) {
        errors.push(
          `Cannot mix tickets! Already loading from ${firstTicket}, this part belongs to ${partDetails.ticketCode}`,
        );
      }
    }

    // STEP 3: Check if part already loaded in any equipment
    const loadedStatus = isPartLoadedForTest(partNumber, "any");
    if (loadedStatus.isLoaded) {
      errors.push(
        `Part ${partNumber} is already loaded in ${loadedStatus.equipment} for test: ${loadedStatus.testName}`,
      );
    }

    // STEP 4: Check if part is already scanned in current session
    const isAlreadyScanned = scannedParts.some(
      (part) => part.partNumber === partNumber.toUpperCase(),
    );
    if (isAlreadyScanned) {
      errors.push(`Part ${partNumber} is already scanned in this session`);
    }

    // STEP 5: For combined tests, check sequence requirements
    if (
      selectedTestAggregated?.isChildTest &&
      selectedTestAggregated.previousTestId
    ) {
      const hasCompletedPrevious = hasCompletedPreviousTest(
        partNumber,
        selectedTestAggregated.allocations[0]?.testId || "",
        selectedTestAggregated.previousTestId,
      );

      if (!hasCompletedPrevious) {
        errors.push(
          `Part must complete previous test step before starting this one`,
        );
      }
    }

    // NEW STEP 6: Check if part is in ANY chamber of the same combined test
    if (selectedTestAggregated?.parentTestName) {
      const combinedTestStatus = isPartInAnyStageOfCombinedTest(
        partNumber,
        selectedTestAggregated.parentTestName,
      );

      if (combinedTestStatus.isInTest) {
        errors.push(
          `Part ${partNumber} is currently in ${combinedTestStatus.chamber} for "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.sequenceNumber}). It must complete that stage first.`,
        );
      }
    }

    // STEP 7: Check if part is currently in another stage of the same combined test (using combinedTestId)
    if (selectedTestAggregated?.combinedTestId) {
      const combinedTestStatus = isPartInCombinedTest(
        partNumber,
        selectedTestAggregated.combinedTestId,
      );
      if (combinedTestStatus.isInTest) {
        errors.push(
          `Part ${partNumber} is currently in "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.stageNumber}) of this combined test. It must complete that stage first.`,
        );
      }
    }

    return { errors, warnings, partDetails };
  };

  // Helper function to get display name for tests
  const getTestDisplayName = (
    test: AllocationTestDto,
    isChild: boolean = false,
    parentTest?: AllocationTestDto,
  ): string => {
    if (isChild && parentTest) {
      // For child tests: "Parent Name (Child SubTest)"
      const parentName = parentTest.testName || "Unknown Parent";
      const childName =
        test.subTestName ||
        test.machineEquipment ||
        parentTest.testName ||
        "Unknown Child";
      return `${parentName} (${childName})`;
    } else {
      // For parent tests: just the test name
      return test.testName || "Unknown Test";
    }
  };

  // Helper function to create aggregated test options - CORRECTED FOR TEST NAMES
  const createAggregatedTestOptions = (): AggregatedTestOption[] => {
    try {
      const allocationSource = getCurrentAllocations();
      const aggregatedTestsMap = new Map<string, AggregatedTestOption>();

      const generateTestKey = (
        test: AllocationTestDto,
        isChild: boolean = false,
        parentTest?: AllocationTestDto,
      ): string => {
        const displayName = getTestDisplayName(test, isChild, parentTest);
        return `${isChild ? "CHILD:" : "PARENT:"}${displayName.toLowerCase().trim()}`;
      };

      const getEquipment = (test: AllocationTestDto): string => {
        return test.machineEquipment || test.machineEquipment2 || "";
      };

      allocationSource.forEach((allocation) => {
        const ticketCode = allocation.ticketCode;
        const parentTests = allocation.testAllocations || [];

        parentTests.forEach((parentTest) => {
          const childTests = parentTest.childTests || [];
          const parentHasChildren = childTests.length > 0;

          if (parentHasChildren) {
            childTests.forEach((child, childIndex) => {
              const remainingParts = toNumber(child.remainingParts);
              if (remainingParts <= 0) {
                return;
              }

              const requiredQty = toNumber(child.requiredQty);
              const displayName = getTestDisplayName(child, true, parentTest);
              const key = generateTestKey(child, true, parentTest);
              const equipment = getEquipment(child);
              const sequenceLength = childTests.length;

              if (!aggregatedTestsMap.has(key)) {
                const unit = child.unit || "";
                let testUnit: TestUnit = "other";
                if (unit === "Hours") testUnit = "hour";
                else if (unit === "Cycle") testUnit = "cycle";
                else if (unit === "Drops") testUnit = "drops";
                else if (unit === "Grams") testUnit = "grams";

                const timeValue =
                  child.time && child.time !== ""
                    ? Number(child.time)
                    : undefined;
                const checkpoints = parseCheckpoints(child.checkPoints || "");

                aggregatedTestsMap.set(key, {
                  testName:
                    child.subTestName ||
                    child.machineEquipment ||
                    parentTest.testName ||
                    "",
                  subTestName: child.subTestName,
                  parentTestName: parentTest.testName,
                  isChildTest: true,
                  displayName,
                  testUnit,
                  unit,
                  testCondition: child.testCondition,
                  machineEquipment: child.machineEquipment,
                  machineEquipment2: child.machineEquipment2,
                  totalAvailable: 0,
                  totalRequired: 0,
                  allocations: [],
                  ticketCount: 0,
                  equipmentList: [],
                  combinedTestId: parentTest.id,
                  sequenceNumber: childIndex + 1,
                  totalInSequence: sequenceLength,
                  nextTestId: childTests[childIndex + 1]?.id,
                  previousTestId:
                    childIndex > 0 ? childTests[childIndex - 1]?.id : undefined,
                  hasCheckpoints: checkpoints.length > 0,
                  checkpoints,
                  originalCheckPoints: child.checkPoints,
                  time: timeValue,
                  timeString: child.time,
                });
              }

              const aggregatedTest = aggregatedTestsMap.get(key)!;
              aggregatedTest.totalAvailable += remainingParts;
              aggregatedTest.totalRequired += requiredQty;

              if (
                !aggregatedTest.allocations.some(
                  (a) => a.ticketCode === ticketCode,
                )
              ) {
                aggregatedTest.ticketCount += 1;
              }

              if (
                equipment &&
                !aggregatedTest.equipmentList.includes(equipment)
              ) {
                aggregatedTest.equipmentList.push(equipment);
              }

              aggregatedTest.allocations.push({
                testId: child.id,
                ticketCode,
                allocationId: allocation.id,
                isChild: true,
                parentTestId: parentTest.id,
                remainingParts,
                requiredQty,
                originalTest: child,
                sequenceNumber: childIndex + 1,
                totalInSequence: sequenceLength,
                nextTestId: childTests[childIndex + 1]?.id,
                previousTestId:
                  childIndex > 0 ? childTests[childIndex - 1]?.id : undefined,
              });
            });
          }

          const parentRemaining = toNumber(parentTest.remainingParts);
          if (parentRemaining <= 0) {
            return;
          }

          const parentRequired = toNumber(parentTest.requiredQty);
          const displayName = getTestDisplayName(parentTest, false);
          const key = generateTestKey(parentTest, false);
          const equipment = getEquipment(parentTest);

          if (!aggregatedTestsMap.has(key)) {
            const unit = parentTest.unit || "";
            let testUnit: TestUnit = "other";
            if (unit === "Hours") testUnit = "hour";
            else if (unit === "Cycle") testUnit = "cycle";
            else if (unit === "Drops") testUnit = "drops";
            else if (unit === "Grams") testUnit = "grams";

            const timeValue =
              parentTest.time && parentTest.time !== ""
                ? Number(parentTest.time)
                : undefined;
            const checkpoints = parseCheckpoints(parentTest.checkPoints || "");

            aggregatedTestsMap.set(key, {
              testName: parentTest.testName || "",
              isChildTest: false,
              displayName,
              testUnit,
              unit,
              testCondition: parentTest.testCondition,
              machineEquipment: parentTest.machineEquipment,
              machineEquipment2: parentTest.machineEquipment2,
              totalAvailable: 0,
              totalRequired: 0,
              allocations: [],
              ticketCount: 0,
              equipmentList: [],
              hasCheckpoints: checkpoints.length > 0,
              checkpoints,
              originalCheckPoints: parentTest.checkPoints,
              time: timeValue,
              timeString: parentTest.time,
            });
          }

          const aggregatedTest = aggregatedTestsMap.get(key)!;
          aggregatedTest.totalAvailable += parentRemaining;
          aggregatedTest.totalRequired += parentRequired;

          if (
            !aggregatedTest.allocations.some((a) => a.ticketCode === ticketCode)
          ) {
            aggregatedTest.ticketCount += 1;
          }

          if (equipment && !aggregatedTest.equipmentList.includes(equipment)) {
            aggregatedTest.equipmentList.push(equipment);
          }

          aggregatedTest.allocations.push({
            testId: parentTest.id,
            ticketCode,
            allocationId: allocation.id,
            isChild: false,
            remainingParts: parentRemaining,
            requiredQty: parentRequired,
            originalTest: parentTest,
          });
        });
      });

      const aggregatedTests = Array.from(aggregatedTestsMap.values()).map(
        (test) => {
          const totalRequired = test.allocations.reduce(
            (sum, alloc) => sum + alloc.requiredQty,
            0,
          );
          const totalAvailable = test.allocations.reduce(
            (sum, alloc) => sum + alloc.remainingParts,
            0,
          );

          let enhancedDisplayName = `${test.displayName} (${totalAvailable}/${totalRequired})`;

          if (test.ticketCount > 1) {
            enhancedDisplayName += ` [${test.ticketCount} tickets]`;
          }

          if (test.isChildTest) {
            enhancedDisplayName = `↳ ${enhancedDisplayName}`;
          } else if (test.unit === "Hours") {
            enhancedDisplayName = `⏰ ${enhancedDisplayName}`;
          } else if (test.unit === "Cycle") {
            enhancedDisplayName = `🔄 ${enhancedDisplayName}`;
          }

          return {
            ...test,
            totalAvailable,
            totalRequired,
            displayName: enhancedDisplayName,
          };
        },
      );

      aggregatedTests.sort((a, b) => {
        if (!a.isChildTest && b.isChildTest) return -1;
        if (a.isChildTest && !b.isChildTest) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      return aggregatedTests;
    } catch (error) {
      console.error("Error creating aggregated test options:", error);
      return [];
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScannedParts([]);
      setPartInput("");
      setMachineDetails(null);
      setAvailableTests([]);
      setSelectedTestAggregated(null);
      setSelectedAllocation(null);
      setTestStarted(false);
      setIsAutoStart(false);
      setTestValue(null);
      setAllocationLimits({});
      setSessionTicketCode(null);
      setScannedPartsCache([]);
    }
  }, [isOpen]);

  // Load available tests
  useEffect(() => {
    if (isOpen) {
      const tests = createAggregatedTestOptions();
      setAvailableTests(tests);
      console.log("All available tests:", tests);
    }
  }, [isOpen, selectedChamber, machine, allocationRecords]);

  // Handle test selection
  const handleTestSelect = (testKey: string) => {
    const test = availableTests.find((t) => t.displayName === testKey);

    if (!test) return;

    // ENHANCEMENT: Prevent changing test if parts are already scanned
    if (scannedParts.length > 0) {
      // Check if the new test has allocation for the current session ticket
      const currentTicket = sessionTicketCode || scannedParts[0].ticketCode;
      const hasAllocationForCurrentTicket = test.allocations.some(
        (alloc) => alloc.ticketCode === currentTicket,
      );

      if (!hasAllocationForCurrentTicket) {
        alert(
          `Cannot change test! You are currently loading parts from Ticket: ${currentTicket}\n\nThis test (${test.testName}) doesn't have allocation for Ticket: ${currentTicket}\n\nAvailable tickets for this test: ${test.allocations.map((a) => a.ticketCode).join(", ")}\n\nTo change test, you must cancel this session and start a new one.`,
        );
        return;
      }

      // Check if it's the same test (different display but same allocation)
      const isSameTest = selectedTestAggregated?.allocations.some((alloc) =>
        test.allocations.some(
          (t) => t.testId === alloc.testId && t.ticketCode === alloc.ticketCode,
        ),
      );

      if (!isSameTest) {
        alert(
          `Cannot change test! You are currently loading parts for: ${selectedTestAggregated?.displayName}\n\nTo load parts for a different test, you must cancel this session and start a new one.`,
        );
        return;
      }
    }

    setSelectedTestAggregated(test);

    // Clear session ticket when changing test (only if no parts scanned)
    if (scannedParts.length === 0) {
      setSessionTicketCode(null);
      setSelectedAllocation(null);
    }

    // For hour-based tests, auto-start
    if (test.unit === "Hours") {
      setTestStarted(true);
      setIsAutoStart(true);
      if (test.time) {
        setTestValue(test.time);
      }
    } else {
      setTestStarted(false);
      setIsAutoStart(false);
      setTestValue(null);
    }

    // Reset scanned parts if any (only when changing to a completely different test)
    if (scannedParts.length > 0) {
      // Don't reset parts if we're just selecting the same test again
      const isDifferentTest =
        !selectedTestAggregated ||
        test.displayName !== selectedTestAggregated.displayName;

      if (isDifferentTest) {
        // This should not happen due to validation above, but as safety
        setScannedParts([]);
        setMachineDetails(null);
        setSessionTicketCode(null);
        setSelectedAllocation(null);
        alert("Test changed. Previous parts cleared.");
      }
    }
  };

  const handlePartScan = async () => {
    // Validation
    if (!selectedTestAggregated) {
      alert("Please select a test first before scanning parts.");
      return;
    }

    if (!partInput.trim()) {
      alert("Please enter a part number");
      return;
    }

    const partNumber = partInput.trim().toUpperCase();

    try {
      // STEP 1: Validate part exists in API data and get ticket mapping
      const validation = await validatePartMappingAndTicket(partNumber);

      if (validation.errors.length > 0) {
        alert(`❌ Cannot scan part:\n\n${validation.errors.join("\n• ")}`);
        setPartInput("");
        return;
      }

      const partDetails = validation.partDetails;
      if (!partDetails) {
        alert("Unable to retrieve part details");
        setPartInput("");
        return;
      }

      // STEP 2: Check if this part's ticket has allocation for selected test
      const matchingAllocation = selectedTestAggregated.allocations.find(
        (alloc) => alloc.ticketCode === partDetails.ticketCode,
      );

      if (!matchingAllocation) {
        // Show which tickets DO have allocation
        const availableTickets = selectedTestAggregated.allocations
          .map((a) => a.ticketCode)
          .filter((value, index, self) => self.indexOf(value) === index);

        let errorMsg = `Part ${partNumber} (Ticket: ${partDetails.ticketCode}) cannot be loaded.\n\n`;
        errorMsg += `Ticket ${partDetails.ticketCode} doesn't have allocation for test: ${selectedTestAggregated.testName}\n\n`;

        if (availableTickets.length > 0) {
          if (scannedParts.length === 0) {
            errorMsg += `Available tickets for this test:\n${availableTickets.map((t) => `• ${t}`).join("\n")}`;
          } else {
            const currentTicket =
              sessionTicketCode || scannedParts[0].ticketCode;
            errorMsg += `You're currently loading parts from: ${currentTicket}\n`;
            errorMsg += `Available tickets for this test:\n${availableTickets.map((t) => `• ${t}`).join("\n")}`;
          }
        } else {
          errorMsg += `No tickets have allocation for this test.`;
        }

        alert(errorMsg);
        setPartInput("");
        return;
      }

      // STEP 3: Check allocation availability
      if (matchingAllocation.remainingParts <= 0) {
        alert(
          `No allocation available for part ${partNumber}.\n\nTicket ${partDetails.ticketCode} has exhausted allocation for "${selectedTestAggregated.testName}".`,
        );
        setPartInput("");
        return;
      }

      // STEP 3A: Ensure part remains within its assigned test flow
      const partHistory = getPartTestHistory(partNumber);
      if (partHistory.length > 0) {
        const uniqueRoots = Array.from(
          new Set(partHistory.map((entry) => entry.rootId)),
        );
        const newRootIdRaw = selectedTestAggregated.isChildTest
          ? selectedTestAggregated.combinedTestId ||
            matchingAllocation.parentTestId ||
            matchingAllocation.testId
          : matchingAllocation.testId;
        const newRootId =
          newRootIdRaw !== undefined && newRootIdRaw !== null
            ? String(newRootIdRaw)
            : null;

        if (
          newRootId &&
          uniqueRoots.length > 0 &&
          !uniqueRoots.includes(newRootId)
        ) {
          const previousEntry = partHistory[partHistory.length - 1];
          const previousName =
            previousEntry.testName || "another test sequence";
          alert(
            `Part ${partNumber} is already assigned to ${previousName}.` +
              `\n\nOnly the linked child tests for that sequence can be loaded.`,
          );
          setPartInput("");
          return;
        }
      }

      // STEP 4: For combined tests, check sequence
      if (
        selectedTestAggregated.isChildTest &&
        matchingAllocation.previousTestId
      ) {
        const hasCompletedPrevious = hasCompletedPreviousTest(
          partNumber,
          matchingAllocation.testId,
          matchingAllocation.previousTestId,
        );

        if (!hasCompletedPrevious) {
          // Find the previous test name
          const allocations = getCurrentAllocations();
          let previousTestName = "Previous Test";

          allocations.forEach((alloc) => {
            (alloc.testAllocations || []).forEach((parent) => {
              (parent.childTests || []).forEach((child) => {
                if (child.id === matchingAllocation.previousTestId) {
                  previousTestName =
                    child.subTestName ||
                    child.machineEquipment ||
                    "Previous Test";
                }
              });
            });
          });

          alert(
            `Part ${partNumber} must complete "${previousTestName}" first before starting "${selectedTestAggregated.subTestName || selectedTestAggregated.testName}".\n\nOnly parts that have completed the previous step can be loaded for this test.`,
          );
          setPartInput("");
          return;
        }
      }

      // STEP 5: Check if part already loaded for this specific test
      const loadedForThisTest = isPartLoadedForTest(
        partNumber,
        matchingAllocation.testId,
      );
      if (loadedForThisTest.isLoaded) {
        alert(
          `Part ${partNumber} is already loaded in ${loadedForThisTest.equipment} for test: ${loadedForThisTest.testName}`,
        );
        setPartInput("");
        return;
      }

      // STEP 6: Check if part is currently in another stage of the same combined test
      if (selectedTestAggregated.combinedTestId) {
        const combinedTestStatus = isPartInCombinedTest(
          partNumber,
          selectedTestAggregated.combinedTestId,
        );
        if (combinedTestStatus.isInTest) {
          alert(
            `Part ${partNumber} is currently in "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.stageNumber}) of this combined test. It must complete that stage first.`,
          );
          setPartInput("");
          return;
        }
      }

      // NEW STEP: Check if part is in ANY chamber of the same combined test (using parentTestName)
      if (selectedTestAggregated.parentTestName) {
        const combinedTestStatus = isPartInAnyStageOfCombinedTest(
          partNumber,
          selectedTestAggregated.parentTestName,
        );

        if (combinedTestStatus.isInTest) {
          alert(
            `Part ${partNumber} is currently in ${combinedTestStatus.chamber} for "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.sequenceNumber}). It must complete that stage first.`,
          );
          setPartInput("");
          return;
        }
      }

      // STEP 7: Checkpoint handling
      let checkpointInfo = null;
      if (selectedTestAggregated.hasCheckpoints) {
        const timesAlreadyLoaded = getCheckpointProgress(
          partNumber,
          matchingAllocation.testId,
        );
        const checkpointIndex =
          timesAlreadyLoaded %
          (selectedTestAggregated.checkpoints?.length || 1);
        const currentCheckpoint =
          selectedTestAggregated.checkpoints?.[checkpointIndex] || null;

        checkpointInfo = {
          checkpoint: currentCheckpoint,
          checkpointIndex: checkpointIndex,
          totalCheckpoints: selectedTestAggregated.checkpoints?.length || 1,
          checkpoints: selectedTestAggregated.checkpoints,
          originalCheckPoints: selectedTestAggregated.originalCheckPoints,
        };
      }

      // STEP 8: Set session ticket if this is the first part
      if (scannedParts.length === 0) {
        setSessionTicketCode(partDetails.ticketCode);

        // Build machine details (first part only)
        const machineDetailsData = {
          machineId: machine?.machine_id || selectedChamber,
          machine: machine?.machine_description || selectedChamber,
          ticketCode: partDetails.ticketCode,
          project: partDetails.project,
          build: partDetails.build,
          colour: partDetails.colour,
          source: partDetails.source,
          processStage: partDetails.processStage,
        };
        setMachineDetails(machineDetailsData);
      }

      // STEP 9: Build part data FROM API data
      const partData = {
        id: Date.now(),
        partNumber: partDetails.partNumber,
        serialNumber: partDetails.serialNumber,
        ticketCode: partDetails.ticketCode,
        project: partDetails.project,
        build: partDetails.build,
        colour: partDetails.colour,
        source: partDetails.source,
        processStage: partDetails.processStage,
        session: partDetails.session,
        scanStatus: "OK",
        cosmeticImages: [],
        nonCosmeticImages: [],
        selectedTestId: matchingAllocation.testId, // Use the specific test ID for this ticket
        selectedAllocation: matchingAllocation, // Store the specific allocation
        combinedTestId: selectedTestAggregated.combinedTestId,
        sequenceNumber: matchingAllocation.sequenceNumber,
        totalInSequence: matchingAllocation.totalInSequence,
        nextTestId: matchingAllocation.nextTestId,
        previousTestId: matchingAllocation.previousTestId,
        checkpointInfo: checkpointInfo,
        // Store the scanned part record from API
        scannedPartRecord: partDetails.scannedPartRecord,
      };

      // STEP 10: Track allocation limit for this specific test+ticket combination
      const allocationKey = `${matchingAllocation.testId}|${partDetails.ticketCode}`;
      const currentLoaded =
        allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

      setAllocationLimits((prev) => ({
        ...prev,
        [allocationKey]: {
          testId: matchingAllocation.testId,
          testName: selectedTestAggregated.testName,
          ticketCode: partDetails.ticketCode,
          partsAvailableToAllocate: matchingAllocation.remainingParts,
          alreadyAllocated:
            matchingAllocation.requiredQty - matchingAllocation.remainingParts,
          requiredQty: matchingAllocation.requiredQty,
          maxPartsCanLoad: matchingAllocation.remainingParts,
          partsLoadedInThisSession: currentLoaded + 1,
        },
      }));

      // Set selected allocation for display
      setSelectedAllocation({
        testId: matchingAllocation.testId,
        testName: selectedTestAggregated.testName,
        ticketCode: partDetails.ticketCode,
        partsAvailableToAllocate: matchingAllocation.remainingParts,
        alreadyAllocated:
          matchingAllocation.requiredQty - matchingAllocation.remainingParts,
        requiredQty: matchingAllocation.requiredQty,
        maxPartsCanLoad: matchingAllocation.remainingParts,
        partsLoadedInThisSession: currentLoaded + 1,
      });

      // STEP 11: Add part to scanned parts
      setScannedParts((prev) => [...prev, partData]);

      // FIXED STEP 12: Update ONLY the specific ticket's allocation, not aggregated total
      const updatedAllocations = selectedTestAggregated.allocations.map(
        (alloc) => {
          if (
            alloc.testId === matchingAllocation.testId &&
            alloc.ticketCode === partDetails.ticketCode
          ) {
            // Only reduce allocation for this specific ticket
            return {
              ...alloc,
              remainingParts: alloc.remainingParts - 1,
            };
          }
          return alloc; // Other tickets remain unchanged
        },
      );

      // Recalculate total available from ALL allocations
      const updatedTotalAvailable = updatedAllocations.reduce(
        (sum, alloc) => sum + alloc.remainingParts,
        0,
      );

      // Update the selected test in available tests
      setAvailableTests((prev) =>
        prev.map((test) => {
          if (
            test.testName === selectedTestAggregated.testName &&
            test.isChildTest === selectedTestAggregated.isChildTest &&
            test.allocations[0]?.testId ===
              selectedTestAggregated.allocations[0]?.testId
          ) {
            return updateTestDisplayName(test, updatedTotalAvailable);
          }
          return test;
        }),
      );

      // Update selected test with new allocations
      setSelectedTestAggregated((prev) => {
        if (!prev) return null;
        const updatedTest = {
          ...prev,
          allocations: updatedAllocations,
          totalAvailable: updatedTotalAvailable,
        };
        return updateTestDisplayName(updatedTest, updatedTotalAvailable);
      });

      setPartInput("");

      // Show success message
      let message = `✅ Part ${partNumber} scanned successfully\n`;
      message += `📋 Ticket: ${partDetails.ticketCode}\n`;
      message += `🧪 Test: ${selectedTestAggregated.displayName.split(" (")[0]}\n`;
      message += `🏷️ Project: ${partDetails.project} | Build: ${partDetails.build} | Colour: ${partDetails.colour}\n`;

      if (
        selectedTestAggregated.isChildTest &&
        matchingAllocation.sequenceNumber
      ) {
        message += `🔄 Sequence: Step ${matchingAllocation.sequenceNumber}/${matchingAllocation.totalInSequence}\n`;
      }

      // Show updated allocation for this specific ticket
      const updatedTicketAllocation = updatedAllocations.find(
        (a) =>
          a.testId === matchingAllocation.testId &&
          a.ticketCode === partDetails.ticketCode,
      );

      message += `📊 Allocation: ${currentLoaded + 1}/${matchingAllocation.remainingParts} loaded from this ticket\n`;
      message += `📦 Remaining in ticket: ${updatedTicketAllocation ? updatedTicketAllocation.remainingParts : matchingAllocation.remainingParts - 1} parts`;

      if (checkpointInfo) {
        message += `\n📍 Checkpoint: ${checkpointInfo.checkpointIndex + 1}/${checkpointInfo.totalCheckpoints} (Value: ${checkpointInfo.checkpoint})`;
      }

      alert(message);
    } catch (error: any) {
      console.error("Error scanning part:", error);
      alert(`Error scanning part: ${error.message || "Unknown error"}`);
      setPartInput("");
    }
  };

  // Helper to update display name with new counts
  const updateTestDisplayName = (
    test: AggregatedTestOption,
    totalAvailable: number,
  ): AggregatedTestOption => {
    // Get base display name without counts
    let baseDisplayName = "";
    if (test.isChildTest && test.parentTestName) {
      // For child tests: "Parent Name (Child SubTest)"
      baseDisplayName = `${test.parentTestName} (${test.subTestName || test.testName})`;
    } else {
      // For parent tests: just the test name
      baseDisplayName = test.testName;
    }

    // Calculate total required across all tickets
    const totalRequired = test.allocations.reduce(
      (sum, alloc) => sum + alloc.requiredQty,
      0,
    );

    // Add aggregated count
    let enhancedDisplayName = `${baseDisplayName} (${totalAvailable}/${totalRequired})`;

    // Add ticket count if more than 1
    if (test.ticketCount > 1) {
      enhancedDisplayName += ` [${test.ticketCount} tickets]`;
    }

    // Add indicators
    if (test.isChildTest) {
      enhancedDisplayName = `↳ ${enhancedDisplayName}`;
    } else if (test.unit === "Hours") {
      enhancedDisplayName = `⏰ ${enhancedDisplayName}`;
    } else if (test.unit === "Cycle") {
      enhancedDisplayName = `🔄 ${enhancedDisplayName}`;
    }

    return {
      ...test,
      totalAvailable: totalAvailable,
      totalRequired: totalRequired,
      displayName: enhancedDisplayName,
    };
  };

  // Handle start button click for non-hour tests
  const handleStartTest = () => {
    if (!selectedTestAggregated) return;

    setTestStarted(true);
    if (selectedTestAggregated.time) {
      setTestValue(selectedTestAggregated.time);
    }
  };

  const handleRemovePart = (partId: number) => {
    const partToRemove = scannedParts.find((part) => part.id === partId);

    if (!partToRemove || !partToRemove.selectedAllocation) return;

    // Restore allocation counts
    const allocationKey = `${partToRemove.selectedTestId}|${partToRemove.ticketCode}`;
    const currentLoaded =
      allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

    // Update allocation limits
    setAllocationLimits((prev) => ({
      ...prev,
      [allocationKey]: {
        ...prev[allocationKey],
        partsLoadedInThisSession: Math.max(0, currentLoaded - 1),
      },
    }));

    // Update aggregated test counts - ONLY for the specific ticket
    if (selectedTestAggregated) {
      const updatedAllocations = selectedTestAggregated.allocations.map(
        (alloc) => {
          if (
            alloc.testId === partToRemove.selectedTestId &&
            alloc.ticketCode === partToRemove.ticketCode
          ) {
            // Only restore allocation for this specific ticket
            return {
              ...alloc,
              remainingParts: alloc.remainingParts + 1,
            };
          }
          return alloc; // Other tickets remain unchanged
        },
      );

      const updatedTotalAvailable = updatedAllocations.reduce(
        (sum, alloc) => sum + alloc.remainingParts,
        0,
      );

      // Update available tests
      setAvailableTests((prev) =>
        prev.map((test) => {
          if (
            test.testName === selectedTestAggregated.testName &&
            test.isChildTest === selectedTestAggregated.isChildTest &&
            test.allocations[0]?.testId ===
              selectedTestAggregated.allocations[0]?.testId
          ) {
            return updateTestDisplayName(test, updatedTotalAvailable);
          }
          return test;
        }),
      );

      // Update selected test with new allocations
      setSelectedTestAggregated((prev) => {
        if (!prev) return null;
        const updatedTest = {
          ...prev,
          allocations: updatedAllocations,
          totalAvailable: updatedTotalAvailable,
        };
        return updateTestDisplayName(updatedTest, updatedTotalAvailable);
      });
    }

    // Remove part from scanned parts
    const updatedScannedParts = scannedParts.filter(
      (part) => part.id !== partId,
    );
    setScannedParts(updatedScannedParts);

    // Clear session ticket if no parts left
    if (updatedScannedParts.length === 0) {
      setMachineDetails(null);
      setSelectedAllocation(null);
      setSessionTicketCode(null);
    }
  };

  const updateAllocation = async (
    ticketCode: string,
    testId: string,
    isChildTest: boolean = false,
  ): Promise<boolean> => {
    try {
      const allocations = getCurrentAllocations();
      const ticketIndex = allocations.findIndex(
        (alloc) => alloc.ticketCode === ticketCode,
      );

      if (ticketIndex === -1) {
        console.error("Ticket not found:", ticketCode);
        return false;
      }

      const sourceAllocation = allocations[ticketIndex];
      const clonedAllocation: AllocationDto = {
        ...sourceAllocation,
        testAllocations: (sourceAllocation.testAllocations || []).map(
          (parent) => ({
            ...parent,
            childTests: (parent.childTests || []).map((child) => ({
              ...child,
            })),
          }),
        ),
      };

      let allocationUpdated = false;

      for (const parentTest of clonedAllocation.testAllocations) {
        if (parentTest.id === testId) {
          const remaining = toNumber(parentTest.remainingParts);
          if (remaining > 0) {
            parentTest.remainingParts = remaining - 1;
            allocationUpdated = true;
            break;
          }
        }

        for (const childTest of parentTest.childTests || []) {
          if (childTest.id === testId) {
            const childRemaining = toNumber(childTest.remainingParts);
            if (childRemaining > 0) {
              childTest.remainingParts = childRemaining - 1;

              const parentRemaining = toNumber(parentTest.remainingParts);
              if (isChildTest && parentRemaining > 0) {
                parentTest.remainingParts = parentRemaining - 1;
              }

              allocationUpdated = true;
              break;
            }
          }
        }

        if (allocationUpdated) {
          break;
        }
      }

      if (!allocationUpdated) {
        console.warn(
          "Allocation not updated - no remaining parts available for test:",
          testId,
        );
        return false;
      }

      let totalRemaining = 0;
      clonedAllocation.testAllocations.forEach((test) => {
        totalRemaining += toNumber(test.remainingParts);
        (test.childTests || []).forEach((child) => {
          totalRemaining += toNumber(child.remainingParts);
        });
      });

      clonedAllocation.totalRemainingParts = totalRemaining;
      const updatedTimestamp = new Date().toISOString();
      clonedAllocation.updatedAt = updatedTimestamp;

      const updatedAllocations = allocations.map((alloc, index) =>
        index === ticketIndex ? clonedAllocation : alloc,
      );

      try {
        await updateBackendAllocation(ticketCode, {
          testAllocations: clonedAllocation.testAllocations,
          totalRemainingParts: clonedAllocation.totalRemainingParts ?? null,
          updatedAt: updatedTimestamp,
        });
      } catch (backendError) {
        console.error("Failed to persist allocation update:", backendError);
        return false;
      }

      setAllocationRecords(updatedAllocations);

      return true;
    } catch (error) {
      console.error("Error updating allocation:", error);
      return false;
    }
  };

  const handleConfirmLoad = async () => {
    if (!selectedTestAggregated || !scannedParts.length) {
      alert("No test selected or parts scanned!");
      return;
    }

    // For non-hour tests, check if test is started
    if (selectedTestAggregated.unit !== "Hours" && !testStarted) {
      alert('Please click "Start Test" button to begin the test');
      return;
    }

    // Check if all parts belong to the same ticket
    const firstTicket = scannedParts[0].ticketCode;
    const allSameTicket = scannedParts.every(
      (part) => part.ticketCode === firstTicket,
    );

    if (!allSameTicket) {
      alert(
        "Error: Parts belong to different tickets. This should not happen with validation.",
      );
      return;
    }

    // Update allocations for all scanned parts
    let allocationErrors: string[] = [];
    for (const part of scannedParts) {
      if (!part.selectedAllocation) {
        allocationErrors.push(
          `No allocation found for part ${part.partNumber}`,
        );
        continue;
      }

      const allocationUpdated = await updateAllocation(
        part.ticketCode,
        part.selectedTestId,
        selectedTestAggregated.isChildTest,
      );

      if (!allocationUpdated) {
        allocationErrors.push(
          `Failed to update allocation for part ${part.partNumber}`,
        );
      }
    }

    if (allocationErrors.length > 0) {
      alert(`Allocation update failed:\n${allocationErrors.join("\n")}`);
      return;
    }

    // Create chamber load record
    const currentTime = new Date().toISOString();
    const testDisplayName = selectedTestAggregated.displayName.split(" (")[0]; // Get just the name part

    const loadPayload: ChamberLoadPayload = {
      chamber: selectedChamber,
      machineId: machine?.machine_id || selectedChamber,
      machineDescription: machine?.machine_description || selectedChamber,
      parts: scannedParts.map((part) => ({
        customImages: Array.isArray(part.customImages)
          ? part.customImages.map((image) => ({
              label: (image.label || '').trim(),
              path: image.path,
              uploadedAt: image.uploadedAt ?? null,
            }))
          : [],
        partNumber: part.partNumber,
        serialNumber: part.serialNumber,
        ticketCode: part.ticketCode,
        testId: part.selectedTestId,
        testName: testDisplayName,
        testCondition: selectedTestAggregated.testCondition || "",
        combinedTestId: selectedTestAggregated.combinedTestId,
        sequenceNumber: part.sequenceNumber,
        totalInSequence: part.totalInSequence,
        nextTestId: part.nextTestId,
        previousTestId: part.previousTestId,
        checkpointInfo: part.checkpointInfo,
        checkpoint: part.checkpointInfo?.checkpoint ?? null,
        checkpointIndex: part.checkpointInfo?.checkpointIndex ?? null,
        totalCheckpoints: part.checkpointInfo?.totalCheckpoints ?? null,
        loadedAt: currentTime,
        scanStatus: part.scanStatus,
        cosmeticImages: part.cosmeticImages || [],
        nonCosmeticImages: part.nonCosmeticImages || [],
        hasImages:
          (Array.isArray(part.customImages) && part.customImages.length > 0) ||
          (part.cosmeticImages?.length ?? 0) > 0 ||
          (part.nonCosmeticImages?.length ?? 0) > 0,
        testUnit: selectedTestAggregated.unit || "other",
        testValue: testValue || selectedTestAggregated.time || null,
        testStarted,
        testStatus: testStarted ? "start" : "pending",
        isCompleted: false,
        completedAt: null,
        actualTestValue: null,
        testResults: null,
        testNotes: null,
        allocationTicketCode: part.ticketCode,
        allocationTestId: part.selectedTestId,
        scannedPartRecord: part.scannedPartRecord, // Now from API
        source: part.source,
        processStage: part.processStage,
        session: part.session,
      })),
      machineDetails: {
        ...machineDetails,
        machineId: machine?.machine_id,
        machineDescription: machine?.machine_description,
        selectedTest: selectedTestAggregated,
      },
      loadedAt: currentTime,
      status: "loaded",
      testUnit: selectedTestAggregated.unit || "other",
      testValue: testValue || selectedTestAggregated.time || null,
      testStarted,
      testStatus: testStarted ? "start" : "pending",
      timerStatus: testStarted ? "start" : "stop",
      timerStartTime: testStarted ? currentTime : null,
      actualStartTime: testStarted ? currentTime : null,
      isCompleted: false,
      completedAt: null,
      operator: "System",
      lastUpdated: currentTime,
      totalParts: scannedParts.length,
      selectedTestId: scannedParts[0]?.selectedTestId || null,
      selectedTestName: testDisplayName,
      isCombinedTest: selectedTestAggregated.isChildTest,
      combinedTestId: selectedTestAggregated.combinedTestId,
      ticketCode: scannedParts[0]?.ticketCode || null,
      isSingleTicketLoad: true,
      sequenceNumber: selectedTestAggregated.sequenceNumber || null,
      totalInSequence: selectedTestAggregated.totalInSequence || null,
    };

    setChamberLoading?.(selectedChamber, true);

    try {
      await addChamberLoad(loadPayload);
      await refreshChamberLoads();
      onLoadComplete();
    } catch (error) {
      console.error("Error creating chamber load:", error);
      alert("Failed to create chamber load. Please try again.");
      setChamberLoading?.(selectedChamber, false);
      return;
    }

    setChamberLoading?.(selectedChamber, false);

    // Show summary
    let summary = `✅ Successfully loaded ${scannedParts.length} parts into ${machine?.machine_description || selectedChamber}\n`;
    summary += `🔧 Equipment ID: ${machine?.machine_id || selectedChamber}\n`;
    summary += `🧪 Test: ${selectedTestAggregated.displayName}\n`;
    summary += `🎫 Ticket: ${scannedParts[0].ticketCode}\n`;

    // Group by ticket for summary (should only be one ticket)
    const partsByTicket: Record<string, number> = {};
    scannedParts.forEach((part) => {
      partsByTicket[part.ticketCode] =
        (partsByTicket[part.ticketCode] || 0) + 1;
    });

    summary += "\n📊 Allocation Summary:\n";
    Object.entries(partsByTicket).forEach(([ticketCode, count]) => {
      const allocationInfo = selectedTestAggregated.allocations.find(
        (a) => a.ticketCode === ticketCode,
      );
      const originalAllocation = allocationInfo?.requiredQty || 0;
      const remainingAfter = (allocationInfo?.remainingParts || 0) - count;

      summary += `• Ticket ${ticketCode}: ${count} part(s) loaded\n`;
      summary += `  Original allocation: ${originalAllocation} | Remaining: ${Math.max(0, remainingAfter)}\n`;
    });

    if (
      selectedTestAggregated.isChildTest &&
      selectedTestAggregated.sequenceNumber
    ) {
      summary += `\n🔄 Sequence: Step ${selectedTestAggregated.sequenceNumber} of ${selectedTestAggregated.totalInSequence}\n`;
    }

    summary += `\n📈 Status: ${testStarted ? "Test Started" : "Pending Start"}\n`;

    // Show test configuration
    summary += `\n⚙️ Test Configuration:\n`;
    summary += `• Test Unit: ${selectedTestAggregated.unit}\n`;
    if (testValue) {
      summary += `• Test Value: ${testValue} ${selectedTestAggregated.unit === "Hours" ? "Hours" : selectedTestAggregated.unit}\n`;
    }
    summary += `• Test Status: ${testStarted ? "Started" : "Not Started"}\n`;
    if (isAutoStart) {
      summary += `• Auto-start: Yes (Hour-based test)\n`;
    }
    if (
      selectedTestAggregated.isChildTest &&
      selectedTestAggregated.parentTestName
    ) {
      summary += `• Combined Test: ${selectedTestAggregated.parentTestName}\n`;
    }

    // Show loaded parts
    summary += `\n📦 Loaded Parts:\n`;
    scannedParts.forEach((part) => {
      summary += `• ${part.partNumber}`;
      if (part.checkpointInfo) {
        summary += ` (Checkpoint ${part.checkpointInfo.checkpointIndex + 1}/${part.checkpointInfo.totalCheckpoints})`;
      }
      summary += "\n";
    });

    // Combined test next steps
    if (
      selectedTestAggregated.isChildTest &&
      selectedTestAggregated.nextTestId
    ) {
      summary += `\n⏭️ Next Step in Sequence:\n`;
      // Find next test name and equipment
      const allocations = getCurrentAllocations();
      let nextTestName = "Next Test";
      let nextEquipment = "";

      allocations.forEach((alloc) => {
        (alloc.testAllocations || []).forEach((parent) => {
          (parent.childTests || []).forEach((child) => {
            if (child.id === selectedTestAggregated.nextTestId) {
              nextTestName =
                child.subTestName || child.machineEquipment || "Next Test";
              nextEquipment =
                child.machineEquipment || child.machineEquipment2 || "";
            }
          });
        });
      });

      summary += `• After completion, load these parts into ${nextEquipment} for: ${nextTestName}\n`;
    }

    const partsWithImages = scannedParts.filter(
      (part) =>
        part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0,
    ).length;

    if (partsWithImages > 0) {
      summary += `\n📸 Images uploaded for ${partsWithImages} part(s).`;
    }

    alert(summary);

    onLoadComplete();
    onClose();
  };

  if (!isOpen || !machine) return null;

  // Get completed parts for info display
  const completedParts =
    selectedTestAggregated?.isChildTest &&
    selectedTestAggregated.allocations[0]?.previousTestId
      ? getPartsCompletedTest(
          selectedTestAggregated.allocations[0].previousTestId,
        )
      : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-white sticky top-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Load Equipment: {selectedChamber}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {machine.machine_description} ({machine.machine_id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Loading Indicator */}
          {isLoadingParts && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <RefreshCw className="animate-spin text-blue-600" size={16} />
              <span className="text-sm text-blue-600">
                Loading OQC parts from database...
              </span>
            </div>
          )}

          {/* Ticket Restriction Banner */}
          {scannedParts.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="text-blue-600" size={16} />
                <span className="font-medium text-blue-800">
                  Ticket Restriction Active
                </span>
              </div>
              <div className="mt-1 text-sm text-blue-700">
                You are loading parts from{" "}
                <span className="font-bold">
                  {sessionTicketCode || scannedParts[0].ticketCode}
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • All parts must belong to ticket:{" "}
                {sessionTicketCode || scannedParts[0].ticketCode}
                <br />
                • To load parts from a different ticket, cancel and start a new
                session
                <br />• Test selection is now locked to this ticket
              </div>
            </div>
          )}

          {/* STEP 1: Test Selection */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
              <Info size={16} />
              Step 1: Select Test (Required Before Scanning)
            </h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                All Available Tests
                <span className="ml-2 text-xs text-gray-500">
                  (Aggregated across all tickets)
                </span>
              </label>
              <div className="relative">
                <select
                  value={
                    selectedTestAggregated
                      ? selectedTestAggregated.displayName
                      : ""
                  }
                  onChange={(e) => handleTestSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  disabled={scannedParts.length > 0}
                >
                  <option value="">Select a test...</option>
                  {availableTests.map((test) => (
                    <option key={test.displayName} value={test.displayName}>
                      {test.displayName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>

              {/* Test Count Info */}
              {availableTests.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing {availableTests.length} unique test(s) aggregated from
                  all tickets
                </div>
              )}

              {/* Locked Test Warning */}
              {scannedParts.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-yellow-600" size={14} />
                    <span className="text-sm font-medium text-yellow-700">
                      Test Selection Locked
                    </span>
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Test selection is locked because parts are already scanned.
                    To change test, cancel this session and start a new one.
                  </div>
                </div>
              )}
            </div>

            {/* Selected Test Info */}
            {selectedTestAggregated && (
              <div className="p-3 bg-white border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="text-green-600" size={16} />
                  <span className="font-medium text-green-800">
                    Test Selected
                  </span>
                  {selectedTestAggregated.isChildTest && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
                      <Link size={12} />
                      Combined Test Step
                    </span>
                  )}
                  {selectedTestAggregated.ticketCount > 1 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {selectedTestAggregated.ticketCount} Tickets
                    </span>
                  )}
                  {scannedParts.length > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Locked to Ticket
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-600">Test Name:</span>
                    <span className="font-medium ml-2">
                      {selectedTestAggregated.displayName.split(" (")[0]}
                      {selectedTestAggregated.isChildTest && (
                        <span className="text-gray-500">
                          {" "}
                          (
                          {selectedTestAggregated.subTestName ||
                            selectedTestAggregated.testName}
                          )
                        </span>
                      )}
                    </span>
                    {selectedTestAggregated.parentTestName && (
                      <div className="text-xs text-gray-500 mt-1">
                        Parent Test: {selectedTestAggregated.parentTestName}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Total Available:
                    </span>
                    <span className="font-medium ml-2">
                      {selectedTestAggregated.totalAvailable}/
                      {selectedTestAggregated.totalRequired} parts
                    </span>
                    <div className="text-xs text-gray-500">
                      Across {selectedTestAggregated.ticketCount} ticket(s)
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Equipment:</span>
                    <span className="font-medium ml-2">
                      {selectedTestAggregated.equipmentList.length > 0
                        ? selectedTestAggregated.equipmentList.join(", ")
                        : "Not Specified"}
                    </span>
                  </div>
                  {selectedTestAggregated.sequenceNumber &&
                    selectedTestAggregated.totalInSequence && (
                      <>
                        <div>
                          <span className="text-sm text-gray-600">
                            Sequence Step:
                          </span>
                          <span className="font-medium ml-2">
                            {selectedTestAggregated.sequenceNumber}/
                            {selectedTestAggregated.totalInSequence}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            Previous Step:
                          </span>
                          <span className="font-medium ml-2">
                            {selectedTestAggregated.previousTestId
                              ? "Required"
                              : "First Step"}
                          </span>
                        </div>
                      </>
                    )}
                  <div>
                    <span className="text-sm text-gray-600">Test Unit:</span>
                    <span className="font-medium ml-2">
                      {selectedTestAggregated.unit || "N/A"}
                      {selectedTestAggregated.time &&
                        ` (${selectedTestAggregated.time} ${selectedTestAggregated.unit})`}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-600">
                      Test Condition:
                    </span>
                    <span className="font-medium ml-2">
                      {selectedTestAggregated.testCondition || "Standard"}
                    </span>
                  </div>
                </div>

                {/* Ticket Breakdown */}
                {selectedTestAggregated.ticketCount > 1 && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Ticket Breakdown:
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {selectedTestAggregated.allocations
                        .reduce((acc: any[], alloc) => {
                          const existing = acc.find(
                            (a) => a.ticketCode === alloc.ticketCode,
                          );
                          if (existing) {
                            existing.remainingParts += alloc.remainingParts;
                            existing.requiredQty += alloc.requiredQty;
                          } else {
                            acc.push({
                              ticketCode: alloc.ticketCode,
                              remainingParts: alloc.remainingParts,
                              requiredQty: alloc.requiredQty,
                            });
                          }
                          return acc;
                        }, [])
                        .map((ticketAlloc: any) => (
                          <div
                            key={ticketAlloc.ticketCode}
                            className="text-xs text-gray-600 flex justify-between"
                          >
                            <span>{ticketAlloc.ticketCode}:</span>
                            <span className="font-medium">
                              {ticketAlloc.remainingParts}/
                              {ticketAlloc.requiredQty}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Current Allocation Info (when part is scanned) */}
                {selectedAllocation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="text-blue-600" size={14} />
                      <span className="text-sm font-medium text-blue-700">
                        Current Ticket Allocation
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mb-2">
                      Ticket:{" "}
                      <span className="font-medium">
                        {selectedAllocation.ticketCode}
                      </span>
                      {sessionTicketCode && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Session Ticket
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">
                          Loaded this session:
                        </span>
                        <span className="font-medium ml-2">
                          {selectedAllocation.partsLoadedInThisSession}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Available in ticket:
                        </span>
                        <span className="font-medium ml-2">
                          {selectedAllocation.partsAvailableToAllocate}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Required for ticket:
                        </span>
                        <span className="font-medium ml-2">
                          {selectedAllocation.requiredQty}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max can load:</span>
                        <span className="font-medium ml-2">
                          {selectedAllocation.maxPartsCanLoad}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completed Parts Info for Combined Tests */}
                {selectedTestAggregated.isChildTest &&
                  selectedTestAggregated.previousTestId &&
                  completedParts.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="text-green-600" size={14} />
                        <span className="text-sm font-medium text-green-700">
                          Available Parts
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mb-2">
                        {completedParts.length} part(s) have completed the
                        previous step and can be loaded:
                      </div>
                      <div className="text-xs font-mono bg-white p-2 rounded border max-h-20 overflow-y-auto">
                        {completedParts.slice(0, 10).join(", ")}
                        {completedParts.length > 10 &&
                          ` ... and ${completedParts.length - 10} more`}
                      </div>
                    </div>
                  )}

                {/* Checkpoint Info */}
                {selectedTestAggregated.hasCheckpoints && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-yellow-600" size={14} />
                      <span className="text-sm font-medium text-yellow-700">
                        Checkpoint Test
                      </span>
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Checkpoints:{" "}
                      {selectedTestAggregated.checkpoints?.join(", ") || "None"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Test Configuration */}
          {selectedTestAggregated && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={16} />
                Step 2: Test Configuration
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Test Information */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Test Details
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Unit:</span>
                      <span className="font-medium">
                        {selectedTestAggregated.unit || "N/A"}
                      </span>
                    </div>
                    {selectedTestAggregated.time && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Test Duration:</span>
                        <span className="font-medium">
                          {selectedTestAggregated.time}{" "}
                          {selectedTestAggregated.unit}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`font-medium ${testStarted ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {testStarted ? "Started" : "Not Started"}
                        {isAutoStart && " (Auto)"}
                      </span>
                    </div>
                    {selectedTestAggregated.isChildTest &&
                      selectedTestAggregated.sequenceNumber && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Sequence Step:
                            </span>
                            <span className="font-medium">
                              {selectedTestAggregated.sequenceNumber}/
                              {selectedTestAggregated.totalInSequence}
                            </span>
                          </div>
                          {selectedTestAggregated.previousTestId &&
                            completedParts.length > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Eligible Parts:
                                </span>
                                <span className="font-medium text-green-600">
                                  {completedParts.length} available
                                </span>
                              </div>
                            )}
                        </>
                      )}
                  </div>
                </div>

                {/* Start Button (only for non-hour tests) */}
                {selectedTestAggregated.unit !== "Hours" && (
                  <div className="flex items-end">
                    <button
                      onClick={handleStartTest}
                      disabled={testStarted}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        testStarted
                          ? "bg-green-600 text-white cursor-default"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {testStarted ? (
                        <>
                          <Check size={20} />
                          <span>Test Started</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          <span>Start Test</span>
                        </>
                      )}
                    </button>
                    {!testStarted && (
                      <p className="text-xs text-gray-500 mt-1 ml-3">
                        Required before loading parts
                      </p>
                    )}
                  </div>
                )}

                {/* Auto-start info for hour tests */}
                {selectedTestAggregated.unit === "Hours" && testStarted && (
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="text-green-600 mr-2" size={16} />
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        Test Auto-started
                      </div>
                      <div className="text-xs text-green-600">
                        Hour-based tests start automatically
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Important Notes */}
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">Important:</span>{" "}
                    {selectedTestAggregated.unit === "Hours"
                      ? "Hour-based tests auto-start when selected. Test duration is set from allocation."
                      : 'Click "Start Test" above before scanning parts.'}
                    {selectedTestAggregated.isChildTest &&
                      selectedTestAggregated.previousTestId &&
                      " Only parts that have completed the previous step can be loaded."}
                    {scannedParts.length > 0 &&
                      ` All parts must belong to ticket: ${sessionTicketCode || scannedParts[0].ticketCode}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Part Scanning (only enabled after test selection) */}
          <div className="mb-6">
            <PartScanner
              partInput={partInput}
              onScan={handlePartScan}
              scanning={scanning}
              disabled={!selectedTestAggregated || !testStarted}
              enableRealtimeScan={enableRealtimeScan}
              onInputChange={setPartInput}
              selectedTestAggregated={selectedTestAggregated}
              testStarted={testStarted}
              sessionTicketCode={sessionTicketCode}
              scannedParts={scannedParts}
            />
          </div>

          {/* Scanned Parts */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Scanned Parts ({scannedParts.length})
              {scannedParts.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  (Restricted to Ticket:{" "}
                  {sessionTicketCode || scannedParts[0].ticketCode})
                </span>
              )}
              {selectedAllocation && (
                <span className="ml-2 text-sm text-gray-500">
                  • Loaded: {selectedAllocation.partsLoadedInThisSession}/
                  {selectedAllocation.maxPartsCanLoad}
                </span>
              )}
            </h4>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {scannedParts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  {!selectedTestAggregated
                    ? "Select a test first, then scan parts"
                    : !testStarted
                      ? "Start the test, then scan parts"
                      : selectedTestAggregated.isChildTest &&
                          selectedTestAggregated.previousTestId
                        ? "Scan parts that have completed the previous step"
                        : "No parts scanned yet"}
                </div>
              ) : (
                <div className="divide-y">
                  {scannedParts.map((part) => (
                    <div key={part.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-medium text-gray-800 text-lg">
                              {part.partNumber}
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                            {part.checkpointInfo && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Checkpoint{" "}
                                {part.checkpointInfo.checkpointIndex + 1}/
                                {part.checkpointInfo.totalCheckpoints}
                              </span>
                            )}
                            {part.selectedAllocation?.sequenceNumber && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Step {part.selectedAllocation.sequenceNumber}
                              </span>
                            )}
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Ticket: {part.ticketCode}
                            </span>
                            {part.source && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {part.source}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-2 space-y-1">
                            <div>
                              Project: {part.project} | Build: {part.build} |
                              Colour: {part.colour}
                            </div>
                            {part.processStage && (
                              <div>Process Stage: {part.processStage}</div>
                            )}
                            <div className="text-blue-600 font-medium">
                              Test:{" "}
                              {
                                selectedTestAggregated?.displayName.split(
                                  " (",
                                )[0]
                              }
                              {selectedTestAggregated?.isChildTest &&
                                ` (${selectedTestAggregated.subTestName || selectedTestAggregated.testName})`}
                            </div>
                            {part.selectedAllocation?.sequenceNumber && (
                              <div className="text-purple-600 text-sm">
                                Combined Test Sequence: Step{" "}
                                {part.selectedAllocation.sequenceNumber} of{" "}
                                {part.selectedAllocation.totalInSequence}
                              </div>
                            )}
                            {part.checkpointInfo && (
                              <div className="text-yellow-600">
                                Checkpoint Value:{" "}
                                {part.checkpointInfo.checkpoint}{" "}
                                {selectedTestAggregated?.unit}
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              Allocation Test ID: {part.selectedTestId}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePart(part.id)}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Remove part"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Image Upload */}
                      <PartImageUpload
                        part={part}
                        onImageUpload={async (label, file) => {
                          let storedPath: string | null = null;

                          await handleImageUpload(
                            part.id,
                            label,
                            file,
                            (filePath) => {
                              storedPath = filePath || file.name;
                              setScannedParts((prev) =>
                                prev.map((p) => {
                                  if (p.id === part.id) {
                                    const customImages = Array.isArray(
                                      p.customImages,
                                    )
                                      ? p.customImages
                                      : [];
                                    const legacyCosmetic = Array.isArray(
                                      p.cosmeticImages,
                                    )
                                      ? p.cosmeticImages
                                      : [];
                                    return {
                                      ...p,
                                      customImages: [
                                        ...customImages,
                                        {
                                          label,
                                          path: storedPath as string,
                                        },
                                      ],
                                      cosmeticImages: [
                                        ...legacyCosmetic,
                                        storedPath as string,
                                      ],
                                      hasImages: true,
                                    };
                                  }
                                  return p;
                                }),
                              );
                            },
                          );

                          return storedPath;
                        }}
                        onImageRemove={(index, image) => {
                          setScannedParts((prev) =>
                            prev.map((p) => {
                              if (p.id === part.id) {
                                const nextCustomImages = Array.isArray(
                                  p.customImages,
                                )
                                  ? p.customImages.filter(
                                      (_, idx) => idx !== index,
                                    )
                                  : [];

                                const removeFromLegacy = (
                                  images?: string[],
                                ): string[] => {
                                  if (!Array.isArray(images)) {
                                    return [];
                                  }
                                  const copy = [...images];
                                  const legacyIndex = copy.findIndex(
                                    (value) => value === image.path,
                                  );
                                  if (legacyIndex > -1) {
                                    copy.splice(legacyIndex, 1);
                                  }
                                  return copy;
                                };

                                const updatedCosmetic = removeFromLegacy(
                                  p.cosmeticImages,
                                );
                                const updatedNonCosmetic = removeFromLegacy(
                                  p.nonCosmeticImages,
                                );

                                return {
                                  ...p,
                                  customImages: nextCustomImages,
                                  cosmeticImages: updatedCosmetic,
                                  nonCosmeticImages: updatedNonCosmetic,
                                  hasImages:
                                    nextCustomImages.length > 0 ||
                                    updatedCosmetic.length > 0 ||
                                    updatedNonCosmetic.length > 0,
                                };
                              }
                              return p;
                            }),
                          );
                        }}
                        isUploadingImage={isUploading(part.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLoad}
              disabled={
                !selectedTestAggregated ||
                scannedParts.length === 0 ||
                (selectedTestAggregated.unit !== "Hours" && !testStarted)
              }
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Load ({scannedParts.length} parts)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadEquipmentModal;
