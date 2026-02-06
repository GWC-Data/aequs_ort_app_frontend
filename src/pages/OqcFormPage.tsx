// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Check,
//   Scan,
//   Ticket,
//   Calendar,
//   Search,
//   Filter,
//   ChevronRight,
//   ChevronDown,
//   CheckCircle,
//   AlertCircle,
//   XCircle,
//   Trash2,
//   Edit2,
//   Save,
//   X,
//   Upload,
//   Send,
//   RefreshCw,
//   Eye,
//   Plus,
//   Clock,
//   FilterX,
//   Play,
//   Square,
//   Zap,
//   ZapOff,
//   Layers,
//   Barcode,
// } from "lucide-react";

// // Types
// interface PartInfo {
//   id: string;
//   partNumber: string; // This will store the scanned barcode
//   scanStatus: "Cosmetic OK" | "Cosmetic Not OK";
//   scannedAt: string;
//   location: string;
// }

// interface ScanSession {
//   id: string;
//   sessionNumber: number;
//   timestamp: string;
//   parts: PartInfo[];
//   submitted: boolean;
//   submittedAt?: string;
//   sentToORT: boolean;
//   sentToORTAt?: string;
//   isReuploaded?: boolean;
//   originalOrtStatus?: string;
//   wasReupload?: boolean;
// }

// interface TestRecord {
//   id: number;
//   ticketCode: string;
//   totalQuantity: number;
//   anoType: string;
//   source: string;
//   reason: string;
//   project: string;
//   build: string;
//   colour: string;
//   dateTime: string;
//   status: string;
//   sessions: ScanSession[];
//   createdAt: string;
//   oqcApproved: boolean;
//   oqcApprovedAt?: string;
//   oqcApprovedBy?: string;
// }

// interface TempScannedPart {
//   partNumber: string; // This stores the scanned barcode directly
//   scanStatus: "Cosmetic OK" | "Cosmetic Not OK" | null;
// }

// interface ORTStage1Data {
//   id: number;
//   ticketId: number;
//   ortRecordId?: number;
//   scannedPartsId?: number;
//   ticketCode: string;
//   sessionId: string;
//   sessionNumber: number;
//   partsBeingSent: number;
//   received: "Yes" | "No" | "";
//   date?: string;
//   shiftTime?: string;
//   detailsBox: {
//     totalQuantity: number;
//     ticketCodeRaised: string;
//     dateShiftTime: string;
//     project: string;
//     batch: string;
//     color: string;
//     assemblyOQCAno: string;
//     reason: string;
//     oqcApprovedBy?: string;
//     oqcApprovedAt?: string;
//   };
//   inventoryRemarks: string;
//   stage2Enabled: boolean;
//   status: string;
//   movedToStage2?: boolean;
//   movedToStage2At?: string;
//   partNumbers: string[];
//   totalQuantity: number;
// }

// const API_BASE_URL = "http://localhost:6060";

// const apiService = {
//   createOqcForm: async (formData: any) => {
//     try {
//       const response = await axios.post(`${API_BASE_URL}/oqcForm`, formData);
//       return response.data;
//     } catch (error) {
//       console.error("Error creating OQC form:", error);
//       throw error;
//     }
//   },
//   getAllOqcForms: async () => {
//     try {
//       const response = await axios.get(`${API_BASE_URL}/oqcForm`);
//       console.log("reponse from backend", response.data);
//       return response.data.Ticket;
//     } catch (error) {
//       console.error("Error fetching OQC forms:", error);
//       throw error;
//     }
//   },
//   createScannedParts: async (scannedPartsData: any) => {
//     try {
//       const response = await axios.post(
//         `${API_BASE_URL}/scannedParts`,
//         scannedPartsData,
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Error saving scanned parts:", error);
//       throw error;
//     }
//   },

//   getAllScannedParts: async () => {
//     try {
//       const response = await axios.get(`${API_BASE_URL}/scannedParts`);
//       return response.data.scannedParts || [];
//     } catch (error) {
//       console.error("Error fetching scanned parts:", error);
//       throw error;
//     }
//   },
//   getAllOrtRecords: async () => {
//     try {
//       const response = await axios.get(`${API_BASE_URL}/ort`);
//       return response.data.orts || [];
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 404) {
//         return [];
//       }
//       console.error("Error fetching ORT records:", error);
//       throw error;
//     }
//   },
//   deleteOrtRecord: async (id: number) => {
//     try {
//       await axios.delete(`${API_BASE_URL}/ort/${id}`);
//     } catch (error) {
//       console.error("Error deleting ORT record:", error);
//       throw error;
//     }
//   },
//   deleteScannedParts: async (id: number) => {
//     try {
//       await axios.delete(`${API_BASE_URL}/scannedParts/${id}`);
//     } catch (error) {
//       console.error("Error deleting scanned parts record:", error);
//       throw error;
//     }
//   },
//   getScannedPartsByTicketSession: async (ticketId: number, session: number) => {
//     try {
//       const response = await axios.get(
//         `${API_BASE_URL}/scannedParts/${ticketId}/${session}`,
//       );
//       return response.data.scannedParts || [];
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 404) {
//         return [];
//       }
//       console.error("Error fetching scanned parts by ticket/session:", error);
//       throw error;
//     }
//   },
// };

// // Constants
// const ASSEMBLY_ANO_OPTIONS = ["ANO", "ASSEMBLY", "OLEO"];
// const SOURCE_OPTIONS_ANO = ["Entire", "Other"];
// const SOURCE_OPTIONS_ASSEMBLY = ["Line1", "Line2", "Other"];
// const SOURCE_OPTIONS_OLEO = ["Other"];
// const PROJECT_OPTIONS = ["FLASH", "LIGHT", "HULK", "AQUA"];
// const COLOUR_OPTIONS = ["NDA", "Stardust", "Light Blue", "N/A"];
// const REASON_OPTIONS = [
//   "MP",
//   "NPI",
//   "Line Qualification",
//   "Machine Qualification",
//   "Other",
// ];

// // const STORAGE_KEY = "oqc_ticket_records";

// const PROJECT_CODES = {
//   FLASH: "FLS",
//   LIGHT: "LGT",
//   HULK: "HLK",
//   AQUA: "AQU",
// };

// const COLOUR_CODES = {
//   NDA: "N",
//   Stardust: "S",
//   "Light Blue": "B",
//   "N/A": "X",
// };

// const ANO_TYPE_CODES = {
//   ANO: "ANO",
//   ASSEMBLY: "ASY",
//   OLEO: "OLE",
// };

// const REASON_CODES = {
//   MP: "MP",
//   NPI: "NP",
//   "Line Qualification": "LQ",
//   "Machine Qualification": "MQ",
//   Other: "OTH",
// };

// const OQCSystem = () => {
//   const navigate = useNavigate();
//   const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
//   const [selectedTicket, setSelectedTicket] = useState<TestRecord | null>(null);
//   const [expandedTickets, setExpandedTickets] = useState<{
//     [key: string]: boolean;
//   }>({});
//   const [expandedSessions, setExpandedSessions] = useState<{
//     [key: string]: boolean;
//   }>({});
//   const [searchTerm, setSearchTerm] = useState("");
//   const [startDateFilter, setStartDateFilter] = useState("");
//   const [endDateFilter, setEndDateFilter] = useState("");
//   const [projectFilter, setProjectFilter] = useState<string>("All");
//   const [buildFilter, setBuildFilter] = useState<string>("All");
//   const [colourFilter, setColourFilter] = useState<string>("All");
//   const [reasonFilter, setReasonFilter] = useState<string>("All");

//   // ORT Stage 1 Data state
//   const [ortStage1Data, setOrtStage1Data] = useState<ORTStage1Data[]>([]);

//   // Modal states
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isScanModalOpen, setIsScanModalOpen] = useState(false);

//   // Form state for Create Ticket Modal
//   const [formData, setFormData] = useState({
//     ticketCode: "",
//     totalQuantity: 0,
//     anoType: "",
//     source: "",
//     otherSource: "",
//     reason: "",
//     otherReason: "",
//     project: "",
//     build: "",
//     colour: "",
//     dateTime: new Date().toISOString().split("T")[0],
//     status: "In-Progress",
//   });
//   const [showOtherSource, setShowOtherSource] = useState(false);
//   const [showOtherReason, setShowOtherReason] = useState(false);
//   const [sourceOptions, setSourceOptions] = useState<string[]>([]);

//   // Scanner state for Scan Modal
//   const [barcodeInput, setBarcodeInput] = useState("");
//   const [tempScannedParts, setTempScannedParts] = useState<TempScannedPart[]>(
//     [],
//   );
//   const [isSaving, setIsSaving] = useState(false);
//   const [notification, setNotification] = useState<{
//     type: "success" | "error" | "info";
//     message: string;
//   } | null>(null);

//   // Scanner control state
//   const [isScanningActive, setIsScanningActive] = useState(false);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Editing state for sessions
//   const [editingLocation, setEditingLocation] = useState<string | null>(null);
//   const [editLocationValue, setEditLocationValue] = useState("");

//   // OQC Approval state
//   const [oqcApprover, setOqcApprover] = useState("");
//   const [showOQCApproval, setShowOQCApproval] = useState<number | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//     fetchTicketsFromBackend();
//     void loadORTStage1Data();
//   }, []);

//   // Auto-focus input when scanning is active
//   useEffect(() => {
//     if (isScanningActive && inputRef.current) {
//       inputRef.current.focus();
//     }
//   }, [isScanningActive, tempScannedParts]);

//   const fetchTicketsFromBackend = async () => {
//     setIsLoading(true);
//     try {
//       // Fetch tickets
//       const ticketsResponse = await apiService.getAllOqcForms();
//       console.log("Ticket response from backend:", ticketsResponse);

//       // Fetch scanned parts
//       let scannedPartsResponse: any[] = [];
//       try {
//         const scannedPartsData = await apiService.getAllScannedParts();
//         console.log("Scanned parts response:", scannedPartsData);

//         // Handle different response formats
//         if (Array.isArray(scannedPartsData)) {
//           scannedPartsResponse = scannedPartsData;
//         } else if (scannedPartsData && scannedPartsData.scannedParts) {
//           scannedPartsResponse = scannedPartsData.scannedParts;
//         } else if (scannedPartsData && Array.isArray(scannedPartsData.data)) {
//           scannedPartsResponse = scannedPartsData.data;
//         }
//         console.log("Processed scanned parts array:", scannedPartsResponse);
//       } catch (scannedError) {
//         console.warn("Could not fetch scanned parts:", scannedError);
//         // Continue without scanned parts
//       }

//       // Create a map of ticketId to scanned parts ARRAY
//       const scannedPartsMap = new Map<number, any[]>();

//       if (Array.isArray(scannedPartsResponse)) {
//         scannedPartsResponse.forEach((scannedData: any) => {
//           console.log("Processing scanned data:", scannedData);

//           if (scannedData.ticketId) {
//             // PARSE the parts JSON string to array
//             let partsArray = [];
//             if (typeof scannedData.parts === "string") {
//               try {
//                 partsArray = JSON.parse(scannedData.parts);
//                 console.log(
//                   `Parsed ${partsArray.length} parts from JSON string`,
//                 );
//               } catch (e) {
//                 console.error("Failed to parse parts JSON string:", e);
//                 partsArray = [];
//               }
//             } else if (Array.isArray(scannedData.parts)) {
//               // If it's already an array, use it directly
//               partsArray = scannedData.parts;
//             }

//             // Add the complete scannedData object (not just parts)
//             // This preserves createdAt, updatedAt, etc. for grouping by session
//             if (!scannedPartsMap.has(scannedData.ticketId)) {
//               scannedPartsMap.set(scannedData.ticketId, []);
//             }
//             scannedPartsMap.get(scannedData.ticketId)?.push({
//               ...scannedData,
//               partsArray: partsArray,
//             });
//           }
//         });
//       }

//       console.log("Scanned parts map with session data:", scannedPartsMap);

//       // Transform backend data to match your TestRecord interface
//       const transformedTickets: TestRecord[] = ticketsResponse.map(
//         (item: any) => {
//           console.log("Processing ticket item:", item);

//           // Get the correct ID - backend uses 'Id' (uppercase I)
//           const ticketId = item.Id || item.id || Date.now();

//           // Get ALL scanned sessions for this ticket
//           const ticketScannedData = scannedPartsMap.get(ticketId) || [];

//           // Group scanned data into sessions based on backend session value when available
//           // Fallback to individual records to avoid merging unrelated scans
//           const sessions: ScanSession[] = [];

//           const sortedScannedData = [...ticketScannedData].sort(
//             (a, b) =>
//               new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
//           );

//           type SessionGroup = {
//             items: any[];
//             sessionNumber: number | null;
//             firstCreatedAt: string;
//           };

//           const sessionGroupMap = new Map<string, SessionGroup>();

//           const parseScannedPartsSessionNumber = (
//             value: number | string | null | undefined,
//           ): number | null => {
//             if (typeof value === "number" && Number.isFinite(value)) {
//               return value;
//             }
//             if (typeof value === "string") {
//               const trimmed = value.trim();
//               if (trimmed.length === 0) {
//                 return null;
//               }
//               const parsed = Number(trimmed);
//               if (!Number.isNaN(parsed)) {
//                 return parsed;
//               }
//             }
//             return null;
//           };

//           sortedScannedData.forEach((scannedItem, index) => {
//             const parsedSessionNumber = parseScannedPartsSessionNumber(
//               scannedItem.session,
//             );
//             const createdAt = scannedItem.createdAt || new Date().toISOString();
//             const key =
//               parsedSessionNumber !== null
//                 ? `session-${parsedSessionNumber}`
//                 : `record-${scannedItem.Id ?? `${createdAt}-${index}`}`;

//             const existingGroup = sessionGroupMap.get(key);

//             if (existingGroup) {
//               existingGroup.items.push(scannedItem);
//               if (
//                 new Date(createdAt).getTime() <
//                 new Date(existingGroup.firstCreatedAt).getTime()
//               ) {
//                 existingGroup.firstCreatedAt = createdAt;
//               }
//             } else {
//               sessionGroupMap.set(key, {
//                 items: [scannedItem],
//                 sessionNumber: parsedSessionNumber,
//                 firstCreatedAt: createdAt,
//               });
//             }
//           });

//           const explicitSessionNumbers = new Set<number>();
//           sessionGroupMap.forEach((group) => {
//             if (group.sessionNumber !== null) {
//               explicitSessionNumbers.add(group.sessionNumber);
//             }
//           });

//           const sessionGroupsArray = Array.from(sessionGroupMap.values()).sort(
//             (a, b) => {
//               if (a.sessionNumber !== null && b.sessionNumber !== null) {
//                 if (a.sessionNumber !== b.sessionNumber) {
//                   return a.sessionNumber - b.sessionNumber;
//                 }
//               } else if (a.sessionNumber !== null) {
//                 return -1;
//               } else if (b.sessionNumber !== null) {
//                 return 1;
//               }

//               return (
//                 new Date(a.firstCreatedAt).getTime() -
//                 new Date(b.firstCreatedAt).getTime()
//               );
//             },
//           );

//           let autoSessionNumber = 1;

//           const allocateSessionNumber = () => {
//             while (explicitSessionNumbers.has(autoSessionNumber)) {
//               autoSessionNumber++;
//             }
//             const allocated = autoSessionNumber;
//             explicitSessionNumbers.add(allocated);
//             autoSessionNumber++;
//             return allocated;
//           };

//           sessionGroupsArray.forEach((group) => {
//             const sessionItems = group.items;
//             if (sessionItems.length === 0) {
//               return;
//             }

//             const effectiveSessionNumber =
//               group.sessionNumber ?? allocateSessionNumber();
//             const sessionTimestamp = sessionItems.reduce(
//               (latest, item) => {
//                 const candidate = item.updatedAt || item.createdAt || latest;
//                 if (!candidate) {
//                   return latest;
//                 }
//                 return new Date(candidate).getTime() >
//                   new Date(latest).getTime()
//                   ? candidate
//                   : latest;
//               },
//               sessionItems[0].updatedAt ||
//                 sessionItems[0].createdAt ||
//                 new Date().toISOString(),
//             );

//             const latestItem = sessionItems.reduce((currentLatest, item) => {
//               const currentTime = new Date(
//                 currentLatest.updatedAt ||
//                   currentLatest.createdAt ||
//                   sessionTimestamp,
//               ).getTime();
//               const itemTime = new Date(
//                 item.updatedAt || item.createdAt || sessionTimestamp,
//               ).getTime();
//               return itemTime >= currentTime ? item : currentLatest;
//             }, sessionItems[0]);

//             const latestParts = Array.isArray(latestItem.partsArray)
//               ? latestItem.partsArray
//               : [];

//             if (latestParts.length === 0) {
//               return;
//             }

//             const partTimestamp =
//               latestItem.updatedAt || latestItem.createdAt || sessionTimestamp;
//             const wasReupload = sessionItems.length > 1;

//             sessions.push({
//               id: `session-${ticketId}-${effectiveSessionNumber}`,
//               sessionNumber: effectiveSessionNumber,
//               timestamp: sessionTimestamp,
//               parts: latestParts.map((part: any, idx: number) => ({
//                 id: `part-${ticketId}-${effectiveSessionNumber}-${idx}`,
//                 partNumber:
//                   part.part ||
//                   part.partNumber ||
//                   `PART-${String(idx + 1).padStart(3, "0")}`,
//                 scanStatus: (part.status ||
//                   part.scanStatus ||
//                   "Cosmetic OK") as "Cosmetic OK" | "Cosmetic Not OK",
//                 scannedAt: part.scannedAt || partTimestamp,
//                 location: part.location || "home",
//               })),
//               submitted: true,
//               submittedAt: partTimestamp,
//               sentToORT: false,
//               wasReupload,
//             });
//           });

//           // If no sessions were created but we have scanned parts, create a single session
//           if (sessions.length === 0 && ticketScannedData.length > 0) {
//             const latestItem = ticketScannedData.reduce(
//               (currentLatest, item) => {
//                 const currentTime = new Date(
//                   currentLatest.updatedAt ||
//                     currentLatest.createdAt ||
//                     new Date().toISOString(),
//                 ).getTime();
//                 const itemTime = new Date(
//                   item.updatedAt || item.createdAt || new Date().toISOString(),
//                 ).getTime();
//                 return itemTime >= currentTime ? item : currentLatest;
//               },
//               ticketScannedData[0],
//             );

//             const latestParts = Array.isArray(latestItem.partsArray)
//               ? latestItem.partsArray
//               : [];

//             if (latestParts.length > 0) {
//               const fallbackTimestamp =
//                 latestItem.updatedAt ||
//                 latestItem.createdAt ||
//                 new Date().toISOString();
//               const wasReupload = ticketScannedData.length > 1;

//               sessions.push({
//                 id: `session-${ticketId}-1`,
//                 sessionNumber: 1,
//                 timestamp: fallbackTimestamp,
//                 parts: latestParts.map((part: any, idx: number) => ({
//                   id: `part-${ticketId}-1-${idx}`,
//                   partNumber:
//                     part.part ||
//                     part.partNumber ||
//                     `PART-${String(idx + 1).padStart(3, "0")}`,
//                   scanStatus: (part.status ||
//                     part.scanStatus ||
//                     "Cosmetic OK") as "Cosmetic OK" | "Cosmetic Not OK",
//                   scannedAt: part.scannedAt || fallbackTimestamp,
//                   location: part.location || "home",
//                 })),
//                 submitted: true,
//                 submittedAt: fallbackTimestamp,
//                 sentToORT: false,
//                 wasReupload,
//               });
//             }
//           }

//           return {
//             id: ticketId,
//             ticketCode: item.ticketCode,
//             totalQuantity: item.totalQty,
//             anoType: item.processStage,
//             source: item.source,
//             reason: item.reason,
//             project: item.project,
//             build: item.build,
//             colour: item.colour,
//             dateTime: item.date
//               ? new Date(item.date).toISOString().split("T")[0]
//               : new Date().toISOString().split("T")[0],
//             status:
//               sessions.length > 0 ? "Ready for OQC Approval" : "In-Progress",
//             sessions: sessions,
//             createdAt:
//               item.createdAt || item.CreatedAt || new Date().toISOString(),
//             oqcApproved: false,
//           };
//         },
//       );

//       console.log("Transformed tickets with sessions:", transformedTickets);
//       setTestRecords(transformedTickets);
//     } catch (error) {
//       console.error("Error loading tickets from backend:", error);
//       showNotification("error", "Failed to load tickets from database");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // useEffect(() => {
//   //   localStorage.setItem(STORAGE_KEY, JSON.stringify(testRecords));
//   // }, [testRecords]);

//   type BackendOrtDetailBox = {
//     totalQuantity?: number;
//     ticketCodeRaised?: string;
//     dateShiftTime?: string;
//     project?: string;
//     batch?: string;
//     color?: string;
//     assemblyOQCAno?: string;
//     reason?: string;
//     oqcApprovedBy?: string;
//     oqcApprovedAt?: string;
//     movedToStage2?: boolean;
//     movedToStage2At?: string;
//     partNumbers?: string[];
//     scannedPartsId?: number;
//   };

//   type BackendOrtRecord = {
//     Id: number;
//     ticketId: number;
//     ticketCode: string;
//     totalQty?: number;
//     processStage?: string;
//     source?: string;
//     project?: string;
//     build?: string;
//     reason?: string;
//     colour?: string;
//     session?: number | string | null;
//     allowedParts?: number;
//     receivedStatus?: string;
//     date?: string;
//     shiftTime?: string;
//     detailBox?: BackendOrtDetailBox | null;
//     inventoryRemarks?: string;
//   };

//   const parseOrtSessionNumber = (
//     value: number | string | null | undefined,
//   ): number => {
//     if (typeof value === "number" && Number.isFinite(value)) {
//       return value;
//     }
//     if (typeof value === "string" && value.trim().length > 0) {
//       const parsed = Number(value);
//       if (!Number.isNaN(parsed)) {
//         return parsed;
//       }
//     }
//     return 1;
//   };

//   const mapOrtRecordToStage1Data = (
//     record: BackendOrtRecord,
//   ): ORTStage1Data => {
//     const detailBox = record.detailBox ?? {};
//     const sessionNumber = parseOrtSessionNumber(record.session);
//     const statusRaw = (record.receivedStatus ?? "").toLowerCase();
//     const received: "Yes" | "No" | "" =
//       statusRaw === "received" || statusRaw === "yes"
//         ? "Yes"
//         : statusRaw === "not received" || statusRaw === "no"
//           ? "No"
//           : "";

//     const partNumbers = Array.isArray(detailBox.partNumbers)
//       ? detailBox.partNumbers.filter((value): value is string =>
//           Boolean(value && value.trim()),
//         )
//       : [];

//     const totalQuantity = Number(
//       detailBox.totalQuantity ??
//         record.allowedParts ??
//         record.totalQty ??
//         partNumbers.length ??
//         0,
//     );

//     const mappedDetails = {
//       totalQuantity,
//       ticketCodeRaised: detailBox.ticketCodeRaised ?? record.ticketCode,
//       dateShiftTime:
//         detailBox.dateShiftTime ??
//         (record.date ? new Date(record.date).toLocaleString() : "N/A"),
//       project: detailBox.project ?? record.project ?? "N/A",
//       batch: detailBox.batch ?? record.build ?? "N/A",
//       color: detailBox.color ?? record.colour ?? "N/A",
//       assemblyOQCAno: detailBox.assemblyOQCAno ?? record.processStage ?? "N/A",
//       reason: detailBox.reason ?? record.reason ?? "N/A",
//       oqcApprovedBy: detailBox.oqcApprovedBy,
//       oqcApprovedAt: detailBox.oqcApprovedAt,
//     };

//     return {
//       id: record.Id,
//       ticketId: record.ticketId,
//       ortRecordId: record.Id,
//       scannedPartsId:
//         typeof detailBox.scannedPartsId === "number"
//           ? detailBox.scannedPartsId
//           : undefined,
//       ticketCode: record.ticketCode,
//       sessionId: `${record.ticketId}-${sessionNumber}`,
//       sessionNumber,
//       partsBeingSent: Number(record.allowedParts ?? totalQuantity),
//       received,
//       date: record.date ? new Date(record.date).toISOString() : undefined,
//       shiftTime: record.shiftTime ?? detailBox.dateShiftTime,
//       detailsBox: mappedDetails,
//       inventoryRemarks: record.inventoryRemarks ?? "",
//       stage2Enabled:
//         received === "Yes" &&
//         (record.inventoryRemarks ?? "").trim() !== "" &&
//         !detailBox.movedToStage2,
//       status: record.receivedStatus ?? "Pending",
//       movedToStage2: Boolean(detailBox.movedToStage2),
//       movedToStage2At: detailBox.movedToStage2At,
//       partNumbers,
//       totalQuantity,
//     };
//   };

//   // Function to load ORT Stage 1 data
//   const loadORTStage1Data = async () => {
//     try {
//       const ortRecords = await apiService.getAllOrtRecords();
//       if (!Array.isArray(ortRecords)) {
//         setOrtStage1Data([]);
//         return;
//       }
//       const mapped = ortRecords.map((record: BackendOrtRecord) =>
//         mapOrtRecordToStage1Data(record),
//       );
//       setOrtStage1Data(mapped);
//     } catch (error) {
//       console.error("Error loading ORT Stage 1 data:", error);
//       setOrtStage1Data([]);
//     }
//   };

//   // Function to get not received sessions from ORT
//   const getNotReceivedSessions = () => {
//     return ortStage1Data.filter(
//       (item) => item.received === "No" && item.status === "Not Received",
//     );
//   };

//   const handleReUploadFromORT = async (ortSession: ORTStage1Data) => {
//     try {
//       // Keep the original ORT record as is (with "Not Received" status)
//       // We'll create a new ORT record later when the re-scanned parts are submitted

//       // Check if this ticket already exists in OQC
//       const existingTicket = testRecords.find(
//         (t) => t.ticketCode === ortSession.ticketCode,
//       );

//       let ticketToUse: TestRecord;
//       const sameSessionNumber = ortSession.sessionNumber; // Use the SAME session number
//       const originalStatus = ortSession.status || "Not Received";

//       if (existingTicket) {
//         // Check if session already exists with same number
//         const existingSession = existingTicket.sessions.find(
//           (session) => session.sessionNumber === sameSessionNumber,
//         );

//         if (existingSession) {
//           // Update existing session
//           const updatedSessions = existingTicket.sessions.map((session) =>
//             session.sessionNumber === sameSessionNumber
//               ? {
//                   ...session,
//                   parts: [], // Clear old parts for re-scanning
//                   submitted: false,
//                   submittedAt: undefined,
//                   sentToORT: false,
//                   isReuploaded: true, // Flag to track this is a re-upload
//                   originalOrtStatus: originalStatus,
//                   wasReupload: true,
//                 }
//               : session,
//           );

//           const updatedTicket: TestRecord = {
//             ...existingTicket,
//             sessions: updatedSessions,
//             status: "In-Progress",
//           };

//           setTestRecords((prev) =>
//             prev.map((record) =>
//               record.id === existingTicket.id ? updatedTicket : record,
//             ),
//           );
//           ticketToUse = updatedTicket;
//         } else {
//           // Add new session with same session number
//           const updatedTicket: TestRecord = {
//             ...existingTicket,
//             sessions: [
//               ...existingTicket.sessions,
//               {
//                 id: `reupload-${Date.now()}`,
//                 sessionNumber: sameSessionNumber,
//                 timestamp: new Date().toISOString(),
//                 parts: [],
//                 submitted: false,
//                 submittedAt: undefined,
//                 sentToORT: false,
//                 isReuploaded: true,
//                 originalOrtStatus: originalStatus,
//                 wasReupload: true,
//               },
//             ],
//             status: "In-Progress",
//           };

//           setTestRecords((prev) =>
//             prev.map((record) =>
//               record.id === existingTicket.id ? updatedTicket : record,
//             ),
//           );
//           ticketToUse = updatedTicket;
//         }
//       } else {
//         // Create new ticket for re-upload
//         const reasonMatch = ortSession.inventoryRemarks?.match(
//           /Not Received - Reason: (.+)/,
//         );
//         const ortReason = reasonMatch
//           ? reasonMatch[1].trim()
//           : "Unknown reason";

//         const newRecord: TestRecord = {
//           id: Date.now(),
//           ticketCode: ortSession.ticketCode,
//           totalQuantity: ortSession.totalQuantity || ortSession.partsBeingSent,
//           anoType: ortSession.detailsBox?.assemblyOQCAno || "N/A",
//           source: "ORT Re-upload",
//           reason: `Re-upload from ORT: ${ortReason}`,
//           project: ortSession.detailsBox?.project || "N/A",
//           build: ortSession.detailsBox?.batch || "N/A",
//           colour: ortSession.detailsBox?.color || "N/A",
//           dateTime: new Date().toISOString().split("T")[0],
//           status: "In-Progress",
//           sessions: [
//             {
//               id: `reupload-${Date.now()}`,
//               sessionNumber: sameSessionNumber, // Same session number
//               timestamp: new Date().toISOString(),
//               parts: [],
//               submitted: false,
//               submittedAt: undefined,
//               sentToORT: false,
//               isReuploaded: true,
//               originalOrtStatus: originalStatus,
//               wasReupload: true,
//             },
//           ],
//           createdAt: new Date().toISOString(),
//           oqcApproved: false,
//         };

//         setTestRecords((prev) => [...prev, newRecord]);
//         ticketToUse = newRecord;
//       }

//       setTempScannedParts([]);
//       setBarcodeInput("");
//       setSelectedTicket(ticketToUse);
//       setIsScanModalOpen(true);
//       setIsScanningActive(true); // Start with scanning stopped

//       showNotification(
//         "info",
//         `Re-uploading Session ${sameSessionNumber} for ticket ${ortSession.ticketCode}. Same session number will be used.`,
//       );
//     } catch (error) {
//       console.error("Error preparing ORT re-upload:", error);
//       showNotification(
//         "error",
//         "Failed to prepare session for re-upload. Please try again.",
//       );
//     }
//   };

//   const showNotification = (
//     type: "success" | "error" | "info",
//     message: string,
//   ) => {
//     setNotification({ type, message });
//     setTimeout(() => setNotification(null), 3000);
//   };

//   const getUniqueValues = (
//     records: TestRecord[],
//     key: keyof TestRecord,
//   ): string[] => {
//     const values = records
//       .map((record) => record[key])
//       .filter(Boolean) as string[];
//     return ["All", ...Array.from(new Set(values))];
//   };

//   // Generate ticket code
//   const generateTicketCode = (
//     project: string,
//     colour: string,
//     anoType: string,
//     reason: string,
//     quantity: number,
//   ) => {
//     const projectCode = PROJECT_CODES[project.toUpperCase()] || "UNK";
//     const colourCode = COLOUR_CODES[colour] || "UNK";
//     const anoCode = ANO_TYPE_CODES[anoType.toUpperCase()] || "UNK";
//     const reasonCode = REASON_CODES[reason] || "OTH";
//     const quantityPadded = String(quantity).padStart(3, "0");

//     let maxNumber = 0;
//     testRecords.forEach((record) => {
//       const match = record.ticketCode?.match(/^(\d+)_/);
//       if (match) {
//         const num = parseInt(match[1], 10);
//         if (num > maxNumber) maxNumber = num;
//       }
//     });

//     const sequenceNumber = String(maxNumber + 1).padStart(4, "0");
//     return `${sequenceNumber}_${projectCode}_${colourCode}_${anoCode}_${reasonCode}_${quantityPadded}`;
//   };

//   // Update source options based on ANO type
//   useEffect(() => {
//     switch (formData.anoType) {
//       case "ANO":
//         setSourceOptions(SOURCE_OPTIONS_ANO);
//         break;
//       case "ASSEMBLY":
//         setSourceOptions(SOURCE_OPTIONS_ASSEMBLY);
//         break;
//       case "OLEO":
//         setSourceOptions(SOURCE_OPTIONS_OLEO);
//         break;
//       default:
//         setSourceOptions([]);
//     }
//     if (formData.anoType) {
//       setFormData((prev) => ({ ...prev, source: "", otherSource: "" }));
//     }
//   }, [formData.anoType]);

//   useEffect(() => {
//     setShowOtherSource(formData.source === "Other");
//     if (formData.source !== "Other") {
//       setFormData((prev) => ({ ...prev, otherSource: "" }));
//     }
//   }, [formData.source]);

//   useEffect(() => {
//     setShowOtherReason(formData.reason === "Other");
//     if (formData.reason !== "Other") {
//       setFormData((prev) => ({ ...prev, otherReason: "" }));
//     }
//   }, [formData.reason]);

//   useEffect(() => {
//     if (
//       formData.project &&
//       formData.colour &&
//       formData.anoType &&
//       formData.reason &&
//       formData.totalQuantity > 0
//     ) {
//       const newCode = generateTicketCode(
//         formData.project,
//         formData.colour,
//         formData.anoType,
//         formData.reason,
//         formData.totalQuantity,
//       );
//       setFormData((prev) => ({ ...prev, ticketCode: newCode }));
//     }
//   }, [
//     formData.project,
//     formData.colour,
//     formData.anoType,
//     formData.reason,
//     formData.totalQuantity,
//     testRecords,
//   ]);

//   const handleInputChange = (
//     e: React.ChangeEvent<
//       HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
//     >,
//   ) => {
//     const { name, value } = e.target;
//     if (name === "totalQuantity") {
//       setFormData((prev) => ({
//         ...prev,
//         [name]: value === "" ? 0 : parseInt(value, 10),
//       }));
//     } else {
//       setFormData((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleSubmitForm = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!formData.ticketCode || !formData.ticketCode.includes("_")) {
//       showNotification(
//         "error",
//         "Please fill all required fields to generate ticket code",
//       );
//       return;
//     }

//     const finalSource =
//       formData.source === "Other" ? formData.otherSource : formData.source;
//     const finalReason =
//       formData.reason === "Other" ? formData.otherReason : formData.reason;

//     // Validation
//     if (
//       !formData.ticketCode ||
//       !formData.totalQuantity ||
//       !formData.anoType ||
//       !formData.source ||
//       !formData.reason ||
//       !formData.project ||
//       !formData.build ||
//       !formData.colour ||
//       !formData.dateTime
//     ) {
//       showNotification("error", "Please fill all required fields");
//       return;
//     }

//     if (formData.source === "Other" && !formData.otherSource.trim()) {
//       showNotification(
//         "error",
//         "Please specify the source when Other is selected",
//       );
//       return;
//     }

//     if (formData.reason === "Other" && !formData.otherReason.trim()) {
//       showNotification(
//         "error",
//         "Please specify the reason when Other is selected",
//       );
//       return;
//     }

//     // Check for existing ticket in local state (optional - you might want to check with backend instead)
//     const existingTicket = testRecords.find(
//       (record) => record.ticketCode === formData.ticketCode,
//     );
//     if (existingTicket) {
//       showNotification(
//         "error",
//         "Ticket code already exists. Please check your inputs.",
//       );
//       return;
//     }

//     try {
//       // Prepare data for backend API
//       const backendFormData = {
//         ticketCode: formData.ticketCode,
//         totalQty: formData.totalQuantity,
//         processStage: formData.anoType, // Assuming anoType maps to processStage
//         source: finalSource,
//         project: formData.project,
//         build: formData.build,
//         colour: formData.colour,
//         location: "default",
//         reason: finalReason,
//         // date is handled by backend
//       };

//       // Call backend API
//       const response = await apiService.createOqcForm(backendFormData);
//       const createdTicket = response?.newOqcForm;

//       if (!createdTicket || (!createdTicket.Id && !createdTicket.id)) {
//         throw new Error("Invalid response from createOqcForm API");
//       }

//       const ticketId = createdTicket.Id ?? createdTicket.id;

//       // Create local record for UI (still needed for local state management)
//       const newRecord: TestRecord = {
//         id: ticketId,
//         ticketCode: createdTicket.ticketCode ?? formData.ticketCode,
//         totalQuantity: createdTicket.totalQty ?? formData.totalQuantity,
//         anoType: createdTicket.processStage ?? formData.anoType,
//         source: createdTicket.source ?? finalSource,
//         reason: createdTicket.reason ?? finalReason,
//         project: createdTicket.project ?? formData.project,
//         build: createdTicket.build ?? formData.build,
//         colour: createdTicket.colour ?? formData.colour,
//         dateTime: createdTicket.date
//           ? new Date(createdTicket.date).toISOString().split("T")[0]
//           : formData.dateTime,
//         status: "In-Progress",
//         sessions: [],
//         createdAt: createdTicket.CreatedAt
//           ? new Date(createdTicket.CreatedAt).toISOString()
//           : createdTicket.createdAt
//             ? new Date(createdTicket.createdAt).toISOString()
//             : new Date().toISOString(),
//         oqcApproved: false,
//       };

//       // Update local state
//       const updatedRecords = [...testRecords, newRecord];
//       setTestRecords(updatedRecords);

//       // Reset form and close modal
//       setFormData({
//         ticketCode: "",
//         totalQuantity: 0,
//         anoType: "",
//         source: "",
//         otherSource: "",
//         reason: "",
//         otherReason: "",
//         project: "",
//         build: "",
//         colour: "",
//         dateTime: new Date().toISOString().split("T")[0],
//         status: "In-Progress",
//       });
//       setShowOtherSource(false);
//       setShowOtherReason(false);
//       setSourceOptions([]);
//       setIsCreateModalOpen(false);

//       showNotification(
//         "success",
//         `Ticket ${newRecord.ticketCode} created successfully in database!`,
//       );
//     } catch (error) {
//       console.error("Error creating ticket:", error);
//       showNotification("error", "Failed to create ticket. Please try again.");
//     }
//   };

//   // Start/Stop scanning function
//   const toggleScanning = () => {
//     if (!isScanningActive) {
//       // Start scanning
//       setIsScanningActive(true);
//       setTimeout(() => {
//         if (inputRef.current) {
//           inputRef.current.focus();
//         }
//       }, 100);
//       showNotification("info", "Scanning started. Focus is on barcode input.");
//     } else {
//       // Stop scanning
//       setIsScanningActive(false);
//       showNotification("info", "Scanning stopped.");
//     }
//   };

//   // Handle barcode scanning in auto mode
//   const handleAutoScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter" && selectedTicket) {
//       e.preventDefault();
//       const barcodeData = barcodeInput.trim();
//       if (barcodeData) {
//         processBarcode(barcodeData);
//         setBarcodeInput("");

//         // Auto-focus back to input for continuous scanning
//         if (isScanningActive) {
//           setTimeout(() => {
//             inputRef.current?.focus();
//           }, 50);
//         }
//       }
//     }
//   };

//   // Handle input change
//   const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setBarcodeInput(value);
//   };

//   const processBarcode = (data: string) => {
//     if (!selectedTicket) return;

//     const totalScannedInSession = tempScannedParts.length;
//     const totalScannedOverall = selectedTicket.sessions.reduce(
//       (sum, session) => sum + session.parts.length,
//       0,
//     );
//     const totalScanned = totalScannedInSession + totalScannedOverall;

//     if (totalScanned >= selectedTicket.totalQuantity) {
//       showNotification(
//         "error",
//         `All ${selectedTicket.totalQuantity} parts have been scanned`,
//       );
//       return;
//     }

//     const barcodeData = data.trim();

//     // Check for duplicates in current session
//     const duplicateInSession = tempScannedParts.find(
//       (p) => p.partNumber === barcodeData,
//     );
//     if (duplicateInSession) {
//       showNotification(
//         "error",
//         `Duplicate barcode in current session: ${barcodeData}`,
//       );
//       return;
//     }

//     // Check for duplicates in all sessions of this ticket
//     const duplicateInAllSessions = selectedTicket.sessions.some((session) =>
//       session.parts.some((part) => part.partNumber === barcodeData),
//     );
//     if (duplicateInAllSessions) {
//       showNotification("error", `Duplicate barcode in ticket: ${barcodeData}`);
//       return;
//     }

//     const newPart: TempScannedPart = {
//       partNumber: barcodeData, // Store barcode directly as partNumber
//       scanStatus: null,
//     };

//     setTempScannedParts((prev) => [...prev, newPart]);
//     showNotification(
//       "success",
//       `Barcode scanned: ${barcodeData}. Please select status.`,
//     );

//     // Keep focus on input
//     setTimeout(() => {
//       if (isScanningActive && inputRef.current) {
//         inputRef.current.focus();
//       }
//     }, 50);
//   };

//   // Bulk status selection functions
//   const handleSelectAllCosmeticOK = () => {
//     if (tempScannedParts.length === 0) {
//       showNotification("error", "No parts to update");
//       return;
//     }

//     setTempScannedParts((prev) =>
//       prev.map((part) => ({
//         ...part,
//         scanStatus: "Cosmetic OK",
//       })),
//     );
//     showNotification(
//       "success",
//       `All ${tempScannedParts.length} parts marked as Cosmetic OK`,
//     );
//   };

//   const handleSelectAllCosmeticNotOK = () => {
//     if (tempScannedParts.length === 0) {
//       showNotification("error", "No parts to update");
//       return;
//     }

//     setTempScannedParts((prev) =>
//       prev.map((part) => ({
//         ...part,
//         scanStatus: "Cosmetic Not OK",
//       })),
//     );
//     showNotification(
//       "success",
//       `All ${tempScannedParts.length} parts marked as Cosmetic Not OK`,
//     );
//   };

//   const handleClearAllSelection = () => {
//     if (tempScannedParts.length === 0) {
//       showNotification("error", "No parts to clear");
//       return;
//     }

//     setTempScannedParts((prev) =>
//       prev.map((part) => ({
//         ...part,
//         scanStatus: null,
//       })),
//     );
//     showNotification(
//       "success",
//       `Status cleared for all ${tempScannedParts.length} parts`,
//     );
//   };

//   const handleStatusChange = (
//     index: number,
//     status: "Cosmetic OK" | "Cosmetic Not OK",
//   ) => {
//     setTempScannedParts((prev) =>
//       prev.map((part, i) =>
//         i === index ? { ...part, scanStatus: status } : part,
//       ),
//     );
//   };

//   const handleSaveSession = async () => {
//     if (!selectedTicket || tempScannedParts.length === 0) return;

//     const partsWithoutStatus = tempScannedParts.filter((p) => !p.scanStatus);
//     if (partsWithoutStatus.length > 0) {
//       showNotification(
//         "error",
//         `Please select status for ${partsWithoutStatus.length} part(s)`,
//       );
//       return;
//     }

//     const ticketId = Number(selectedTicket.id);
//     if (Number.isNaN(ticketId)) {
//       showNotification(
//         "error",
//         "Ticket is missing a valid database ID. Please refresh tickets and try again.",
//       );
//       return;
//     }

//     setIsSaving(true);

//     try {
//       // Get session number (reuse original for re-uploads)
//       const currentSession = selectedTicket.sessions.find(
//         (s) => s.isReuploaded && s.parts.length === 0,
//       );
//       const sessionNumber = currentSession
//         ? currentSession.sessionNumber
//         : selectedTicket.sessions.length + 1;

//       const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//       const timestampNow = new Date().toISOString();

//       const newSession: ScanSession = {
//         id: sessionId,
//         sessionNumber,
//         timestamp: timestampNow,
//         parts: tempScannedParts.map((part, idx) => ({
//           id: `part-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
//           partNumber: part.partNumber, // Store scanned barcode as partNumber
//           scanStatus: part.scanStatus!,
//           scannedAt: timestampNow,
//           location: "home",
//         })),
//         submitted: true,
//         submittedAt: timestampNow,
//         sentToORT: false,
//         isReuploaded: false,
//         originalOrtStatus: currentSession?.originalOrtStatus,
//         wasReupload: Boolean(currentSession),
//       };

//       // Save to backend database
//       const scannedPartsData = {
//         ticketId,
//         ticketCode: selectedTicket.ticketCode,
//         parts: tempScannedParts.map((part) => ({
//           part: part.partNumber, // Save barcode as part
//           status: part.scanStatus,
//           scannedAt: timestampNow,
//         })),
//         session: sessionNumber,
//         ortReceivedStatus: "Pending",
//         isReupload: Boolean(currentSession),
//         previousOrtStatus: currentSession?.originalOrtStatus,
//       };

//       // Call backend API to save scanned parts
//       const backendResponse =
//         await apiService.createScannedParts(scannedPartsData);
//       console.log("Scanned parts saved to backend:", backendResponse);

//       // Update local state
//       const updatedRecords = testRecords.map((record) => {
//         if (record.id === selectedTicket.id) {
//           let updatedSessions: ScanSession[];

//           if (currentSession) {
//             // Replace the re-upload placeholder session with actual scanned session
//             updatedSessions = record.sessions
//               .map((session) =>
//                 session.isReuploaded &&
//                 session.sessionNumber === sessionNumber &&
//                 session.parts.length === 0
//                   ? newSession
//                   : session,
//               )
//               .filter(
//                 (session) =>
//                   !(
//                     session.isReuploaded &&
//                     session.sessionNumber === sessionNumber &&
//                     session.parts.length === 0
//                   ),
//               );
//           } else {
//             updatedSessions = [...record.sessions, newSession];
//           }

//           const totalScanned = updatedSessions.reduce(
//             (sum, session) => sum + session.parts.length,
//             0,
//           );

//           return {
//             ...record,
//             sessions: updatedSessions,
//             status: totalScanned > 0 ? "Ready for OQC Approval" : record.status,
//           };
//         }
//         return record;
//       });

//       setTestRecords(updatedRecords);

//       const refreshedTicket =
//         updatedRecords.find((record) => record.id === selectedTicket.id) ||
//         null;
//       if (refreshedTicket) {
//         setSelectedTicket(refreshedTicket);
//       }

//       const notificationPrefix = currentSession
//         ? "Re-uploaded session"
//         : "Session";
//       showNotification(
//         "success",
//         `${notificationPrefix} ${sessionNumber} saved with ${tempScannedParts.length} parts!`,
//       );

//       // Clear temporary data
//       setTempScannedParts([]);
//       setIsSaving(false);
//       setIsScanModalOpen(false);
//       setIsScanningActive(false); // Reset scanning state

//       // Navigate to ORT Lab page after a short delay
//       setTimeout(() => {
//         navigate("/ort-lab-form");
//       }, 1500);
//     } catch (error) {
//       console.error("Error saving scanned parts to backend:", error);
//       showNotification(
//         "error",
//         "Failed to save scanned parts to database. Please try again.",
//       );
//       setIsSaving(false);
//     }
//   };

//   const handleStartScanning = (ticket: TestRecord) => {
//     setSelectedTicket(ticket);
//     setTempScannedParts([]);
//     setBarcodeInput("");
//     setIsScanModalOpen(true);
//     setIsScanningActive(true); // Start with scanning stopped
//   };

//   useEffect(() => {
//     if (isScanModalOpen && isScanningActive && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isScanModalOpen, isScanningActive]);

//   const toggleTicketExpand = (ticketCode: string) => {
//     setExpandedTickets((prev) => ({
//       ...prev,
//       [ticketCode]: !prev[ticketCode],
//     }));
//   };

//   const toggleSessionExpand = (sessionId: string) => {
//     setExpandedSessions((prev) => ({
//       ...prev,
//       [sessionId]: !prev[sessionId],
//     }));
//   };

//   const handleUpdateLocation = (
//     ticketId: number,
//     sessionId: string,
//     partId: string,
//     newLocation: string,
//   ) => {
//     const updatedRecords = testRecords.map((record) => {
//       if (record.id === ticketId) {
//         return {
//           ...record,
//           sessions: record.sessions.map((session) => {
//             if (session.id === sessionId) {
//               return {
//                 ...session,
//                 parts: session.parts.map((part) =>
//                   part.id === partId
//                     ? { ...part, location: newLocation }
//                     : part,
//                 ),
//               };
//             }
//             return session;
//           }),
//         };
//       }
//       return record;
//     });
//     setTestRecords(updatedRecords);
//     setEditingLocation(null);
//     showNotification("success", "Location updated successfully");
//   };

//   const handleOQCApproval = (ticketId: number) => {
//     if (!oqcApprover.trim()) {
//       showNotification("error", "Please enter your name for OQC approval");
//       return;
//     }

//     const updatedRecords = testRecords.map((record) => {
//       if (record.id === ticketId) {
//         const allSessionsSubmitted = record.sessions.every(
//           (session) => session.submitted,
//         );
//         if (!allSessionsSubmitted) {
//           showNotification(
//             "error",
//             "All sessions must be submitted before OQC approval",
//           );
//           return record;
//         }

//         return {
//           ...record,
//           oqcApproved: true,
//           oqcApprovedAt: new Date().toISOString(),
//           oqcApprovedBy: oqcApprover,
//           status: "OQC Approved",
//         };
//       }
//       return record;
//     });

//     setTestRecords(updatedRecords);
//     setShowOQCApproval(null);
//     setOqcApprover("");
//     showNotification("success", "Ticket approved by OQC successfully!");
//   };

//   const handleSubmitToORTLab = (
//     ticketId: number,
//     sessionId: string,
//     ticketCode: string,
//   ) => {
//     const ticket = testRecords.find((t) => t.id === ticketId);
//     const session = ticket?.sessions.find((s) => s.id === sessionId);

//     if (!ticket || !session) {
//       showNotification("error", "Ticket or session not found");
//       return;
//     }

//     if (!ticket.oqcApproved) {
//       showNotification(
//         "error",
//         "Ticket must be OQC approved before sending to ORT Lab",
//       );
//       return;
//     }

//     if (!session.submitted) {
//       showNotification(
//         "error",
//         "Session must be submitted before sending to ORT Lab",
//       );
//       return;
//     }

//     const ortLabData = {
//       ticketId,
//       ticketCode,
//       sessionId,
//       sessionNumber: session.sessionNumber,
//       timestamp: new Date().toISOString(),
//       parts: session.parts,
//       project: ticket.project,
//       build: ticket.build,
//       colour: ticket.colour,
//       anoType: ticket.anoType,
//       source: ticket.source,
//       reason: ticket.reason,
//       oqcApprovedBy: ticket.oqcApprovedBy,
//       oqcApprovedAt: ticket.oqcApprovedAt,
//       submittedAt: session.submittedAt,
//       totalParts: session.parts.length,
//       partNumbers: session.parts.map((p) => p.partNumber),
//       rawBarcodeData: session.parts.map((p) => p.partNumber).join("; "),
//       submitted: true,
//       totalQuantity: ticket.totalQuantity,
//     };

//     const existingSubmissions = JSON.parse(
//       localStorage.getItem("ort_lab_submissions") || "[]",
//     );
//     const existingSubmissionIndex = existingSubmissions.findIndex(
//       (sub: any) => sub.id === sessionId,
//     );

//     if (existingSubmissionIndex >= 0) {
//       existingSubmissions[existingSubmissionIndex] = ortLabData;
//     } else {
//       existingSubmissions.push(ortLabData);
//     }

//     localStorage.setItem(
//       "ort_lab_submissions",
//       JSON.stringify(existingSubmissions),
//     );

//     const updatedRecords = testRecords.map((record) => {
//       if (record.id === ticketId) {
//         return {
//           ...record,
//           sessions: record.sessions.map((s) => {
//             if (s.id === sessionId) {
//               return {
//                 ...s,
//                 sentToORT: true,
//                 sentToORTAt: new Date().toISOString(),
//               };
//             }
//             return s;
//           }),
//         };
//       }
//       return record;
//     });

//     setTestRecords(updatedRecords);
//     navigate("/ort-lab-form");
//   };

//   const getStatusIcon = (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => {
//     switch (status) {
//       case "Cosmetic OK":
//         return <CheckCircle className="h-4 w-4 text-green-600" />;
//       case "Cosmetic Not OK":
//         return <XCircle className="h-4 w-4 text-red-600" />;
//       default:
//         return null;
//     }
//   };

//   const getStatusColor = (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => {
//     switch (status) {
//       case "Cosmetic OK":
//         return "bg-green-100 text-green-800 border-green-200";
//       case "Cosmetic Not OK":
//         return "bg-red-100 text-red-800 border-red-200";
//       default:
//         return "bg-gray-100 text-gray-800 border-gray-200";
//     }
//   };

//   const filteredRecords = testRecords.filter((record) => {
//     const matchesSearch =
//       record.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       record.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       record.sessions.some((session) =>
//         session.parts.some((part) =>
//           part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
//         ),
//       );

//     const recordDate = new Date(record.dateTime);
//     let matchesDate = true;

//     if (startDateFilter) {
//       const startDate = new Date(startDateFilter);
//       if (recordDate < startDate) {
//         matchesDate = false;
//       }
//     }

//     if (endDateFilter) {
//       const endDate = new Date(endDateFilter);
//       endDate.setHours(23, 59, 59, 999);
//       if (recordDate > endDate) {
//         matchesDate = false;
//       }
//     }

//     const matchesProject =
//       projectFilter === "All" || record.project === projectFilter;
//     const matchesBuild = buildFilter === "All" || record.build === buildFilter;
//     const matchesColour =
//       colourFilter === "All" || record.colour === colourFilter;
//     const matchesReason =
//       reasonFilter === "All" || record.reason === reasonFilter;

//     return (
//       matchesSearch &&
//       matchesDate &&
//       matchesProject &&
//       matchesBuild &&
//       matchesColour &&
//       matchesReason
//     );
//   });

//   const clearLocalStorage = () => {
//     if (
//       window.confirm(
//         "Are you sure you want to clear all data? This action cannot be undone.",
//       )
//     ) {
//       // localStorage.removeItem(STORAGE_KEY);
//       setTestRecords([]);
//       showNotification("success", "All data cleared from localStorage");
//     }
//   };

//   const refreshORTData = async () => {
//     await loadORTStage1Data();
//     showNotification("success", "ORT data refreshed");
//   };

//   const clearAllFilters = () => {
//     setSearchTerm("");
//     setStartDateFilter("");
//     setEndDateFilter("");
//     setProjectFilter("All");
//     setBuildFilter("All");
//     setColourFilter("All");
//     setReasonFilter("All");
//     setExpandedTickets({});
//     setExpandedSessions({});
//   };

//   // Group tickets by date (newest vs older)
//   const groupTickets = () => {
//     const now = new Date();
//     const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

//     const newestTickets = filteredRecords
//       .filter((ticket) => new Date(ticket.createdAt) > oneDayAgo)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );

//     const olderTickets = filteredRecords
//       .filter((ticket) => new Date(ticket.createdAt) <= oneDayAgo)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );

//     return { newestTickets, olderTickets };
//   };

//   const { newestTickets, olderTickets } = groupTickets();
//   const uniqueProjects = getUniqueValues(testRecords, "project");
//   const uniqueBuilds = getUniqueValues(testRecords, "build");
//   const uniqueColours = getUniqueValues(testRecords, "colour");
//   const uniqueReasons = getUniqueValues(testRecords, "reason");

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-6">
//       {/* Notification Toast */}
//       {notification && (
//         <div
//           className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
//             notification.type === "success"
//               ? "bg-green-500"
//               : notification.type === "error"
//                 ? "bg-red-500"
//                 : "bg-blue-500"
//           } text-white animate-in fade-in slide-in-from-top-5`}
//         >
//           <div className="flex items-center gap-2">
//             {notification.type === "success" ? (
//               <CheckCircle className="h-5 w-5" />
//             ) : notification.type === "error" ? (
//               <XCircle className="h-5 w-5" />
//             ) : (
//               <AlertCircle className="h-5 w-5" />
//             )}
//             <span>{notification.message}</span>
//           </div>
//         </div>
//       )}

//       {/* Header with Create Button */}
//       <div className="mb-6">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">
//               OQC Ticket Management
//             </h1>
//             <p className="text-gray-600">
//               Manage quality control tickets and scanning sessions
//             </p>
//           </div>
//           <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
//             <DialogTrigger asChild>
//               <Button className="bg-red-500 hover:bg-red-600 text-white">
//                 <Plus className="mr-2 h-4 w-4" />
//                 Create New Ticket
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>Create New Ticket</DialogTitle>
//                 <DialogDescription>
//                   Fill in all required fields to generate a new OQC ticket
//                 </DialogDescription>
//               </DialogHeader>
//               <form onSubmit={handleSubmitForm} className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Ticket Code <span className="text-red-600">*</span>
//                       <span className="text-xs font-normal text-gray-500 ml-2">
//                         (Auto-generated)
//                       </span>
//                     </Label>
//                     <Input
//                       type="text"
//                       value={formData.ticketCode}
//                       readOnly
//                       className="bg-gray-50 font-mono"
//                       placeholder="Fill all fields to generate code"
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Total Quantity <span className="text-red-600">*</span>
//                     </Label>
//                     <Input
//                       type="number"
//                       name="totalQuantity"
//                       value={formData.totalQuantity || ""}
//                       onChange={handleInputChange}
//                       placeholder="Enter total quantity"
//                       required
//                       min="1"
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       ANO/ASSEMBLY/OLEO <span className="text-red-600">*</span>
//                     </Label>
//                     <select
//                       name="anoType"
//                       value={formData.anoType}
//                       onChange={handleInputChange}
//                       className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                       required
//                     >
//                       <option value="">-- Select Type --</option>
//                       {ASSEMBLY_ANO_OPTIONS.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Source <span className="text-red-600">*</span>
//                     </Label>
//                     <select
//                       name="source"
//                       value={formData.source}
//                       onChange={handleInputChange}
//                       className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                       required
//                       disabled={!formData.anoType}
//                     >
//                       <option value="">-- Select Source --</option>
//                       {sourceOptions.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                     {showOtherSource && (
//                       <Input
//                         type="text"
//                         name="otherSource"
//                         value={formData.otherSource}
//                         onChange={handleInputChange}
//                         placeholder="Please specify source"
//                         required
//                       />
//                     )}
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Project <span className="text-red-600">*</span>
//                     </Label>
//                     <select
//                       name="project"
//                       value={formData.project}
//                       onChange={handleInputChange}
//                       className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                       required
//                     >
//                       <option value="">-- Select Project --</option>
//                       {PROJECT_OPTIONS.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Build <span className="text-red-600">*</span>
//                     </Label>
//                     <Input
//                       type="text"
//                       name="build"
//                       value={formData.build}
//                       onChange={handleInputChange}
//                       placeholder="Enter build"
//                       required
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Colour <span className="text-red-600">*</span>
//                     </Label>
//                     <select
//                       name="colour"
//                       value={formData.colour}
//                       onChange={handleInputChange}
//                       className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                       required
//                     >
//                       <option value="">-- Select Colour --</option>
//                       {COLOUR_OPTIONS.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="space-y-2">
//                     <Label className="font-bold uppercase">
//                       Date <span className="text-red-600">*</span>
//                     </Label>
//                     <Input
//                       type="date"
//                       name="dateTime"
//                       value={formData.dateTime}
//                       readOnly
//                       className="bg-gray-50"
//                     />
//                   </div>

//                   <div className="space-y-2 md:col-span-2">
//                     <Label className="font-bold uppercase">
//                       Reason <span className="text-red-600">*</span>
//                     </Label>
//                     <select
//                       name="reason"
//                       value={formData.reason}
//                       onChange={handleInputChange}
//                       className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                       required
//                     >
//                       <option value="">-- Select Reason --</option>
//                       {REASON_OPTIONS.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                     {showOtherReason && (
//                       <Textarea
//                         name="otherReason"
//                         value={formData.otherReason}
//                         onChange={handleInputChange}
//                         placeholder="Please specify the reason"
//                         className="min-h-[100px]"
//                         required
//                       />
//                     )}
//                   </div>
//                 </div>

//                 <DialogFooter>
//                   <Button
//                     type="submit"
//                     className="bg-red-500 hover:bg-red-600 text-white"
//                   >
//                     <Check className="w-5 h-5 mr-2" />
//                     Create Ticket
//                   </Button>
//                 </DialogFooter>
//               </form>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* Filters Card */}
//       <Card className="mb-6">
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Filter className="h-5 w-5" />
//             Filters
//           </CardTitle>
//           <CardDescription>Filter tickets by various criteria</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
//             {/* Search field */}
//             <div className="space-y-2">
//               <Label htmlFor="search" className="flex items-center gap-2">
//                 <Search className="h-4 w-4" />
//                 Search Tickets
//               </Label>
//               <Input
//                 id="search"
//                 placeholder="Search tickets..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>

//             {/* Project Filter */}
//             <div className="space-y-2">
//               <Label
//                 htmlFor="projectFilter"
//                 className="flex items-center gap-2"
//               >
//                 <Filter className="h-4 w-4" />
//                 Project
//               </Label>
//               <select
//                 id="projectFilter"
//                 value={projectFilter}
//                 onChange={(e) => setProjectFilter(e.target.value)}
//                 className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//               >
//                 {uniqueProjects.map((project) => (
//                   <option key={project} value={project}>
//                     {project}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Build Filter */}
//             <div className="space-y-2">
//               <Label htmlFor="buildFilter" className="flex items-center gap-2">
//                 <Filter className="h-4 w-4" />
//                 Build
//               </Label>
//               <select
//                 id="buildFilter"
//                 value={buildFilter}
//                 onChange={(e) => setBuildFilter(e.target.value)}
//                 className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//               >
//                 {uniqueBuilds.map((build) => (
//                   <option key={build} value={build}>
//                     {build}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="colourFilter" className="flex items-center gap-2">
//                 <Filter className="h-4 w-4" />
//                 Colour
//               </Label>
//               <div className="flex gap-2">
//                 <select
//                   id="colourFilter"
//                   value={colourFilter}
//                   onChange={(e) => setColourFilter(e.target.value)}
//                   className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                 >
//                   {uniqueColours.map((colour) => (
//                     <option key={colour} value={colour}>
//                       {colour}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="reasonFilter" className="flex items-center gap-2">
//                 <Filter className="h-4 w-4" />
//                 Reason
//               </Label>
//               <div className="flex gap-2">
//                 <select
//                   id="reasonFilter"
//                   value={reasonFilter}
//                   onChange={(e) => setReasonFilter(e.target.value)}
//                   className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
//                 >
//                   {uniqueReasons.map((reason) => (
//                     <option key={reason} value={reason}>
//                       {reason}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             {/* Start Date Filter */}
//             <div className="space-y-2">
//               <Label htmlFor="startDate" className="flex items-center gap-2">
//                 <Calendar className="h-4 w-4" />
//                 Start Date
//               </Label>
//               <Input
//                 id="startDate"
//                 type="date"
//                 value={startDateFilter}
//                 onChange={(e) => setStartDateFilter(e.target.value)}
//               />
//             </div>

//             {/* End Date Filter */}
//             <div className="space-y-2">
//               <Label htmlFor="endDate" className="flex items-center gap-2">
//                 <Calendar className="h-4 w-4" />
//                 End Date
//               </Label>
//               <Input
//                 id="endDate"
//                 type="date"
//                 value={endDateFilter}
//                 onChange={(e) => setEndDateFilter(e.target.value)}
//                 min={startDateFilter}
//               />
//             </div>

//             <div className="flex items-end gap-2">
//               <Button
//                 variant="outline"
//                 onClick={clearAllFilters}
//                 className="w-full"
//               >
//                 <FilterX className="mr-2 h-4 w-4" />
//                 Clear All Filters
//               </Button>
//             </div>
//           </div>

//           {/* Filter Summary */}
//           <div className="mt-4 pt-4 border-t">
//             <div className="flex items-center justify-between">
//               <div className="text-sm text-gray-500">
//                 Showing {filteredRecords.length} of {testRecords.length} tickets
//                 {(projectFilter !== "All" ||
//                   buildFilter !== "All" ||
//                   colourFilter !== "All" ||
//                   reasonFilter !== "All") && (
//                   <span className="ml-2">
//                     • Filtered by:
//                     {projectFilter !== "All" && (
//                       <span className="ml-1 font-medium">{projectFilter}</span>
//                     )}
//                     {buildFilter !== "All" && (
//                       <span className="ml-1 font-medium">{buildFilter}</span>
//                     )}
//                     {colourFilter !== "All" && (
//                       <span className="ml-1 font-medium">{colourFilter}</span>
//                     )}
//                     {reasonFilter !== "All" && (
//                       <span className="ml-1 font-medium">{reasonFilter}</span>
//                     )}
//                   </span>
//                 )}
//               </div>
//               {/* <div className="flex items-center gap-2">
//                 {testRecords.length > 0 && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={clearLocalStorage}
//                     className="text-red-500 hover:text-red-700"
//                   >
//                     <Trash2 className="h-4 w-4 mr-2" />
//                     Clear All Data
//                   </Button>
//                 )}
//               </div> */}
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Ticket Listing Section */}
//       <div className="space-y-6">
//         {/* Newest Tickets Section */}
//         {newestTickets.length > 0 && (
//           <div>
//             <div className="flex items-center gap-2 mb-4">
//               <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm">
//                 Newest
//               </Badge>
//               <h2 className="text-lg font-semibold text-gray-900">
//                 Recently Created Tickets
//               </h2>
//             </div>
//             <div className="space-y-4">
//               {newestTickets.map((ticket) => (
//                 <TicketCard
//                   key={ticket.id}
//                   ticket={ticket}
//                   expandedTickets={expandedTickets}
//                   expandedSessions={expandedSessions}
//                   showOQCApproval={showOQCApproval}
//                   oqcApprover={oqcApprover}
//                   editingLocation={editingLocation}
//                   editLocationValue={editLocationValue}
//                   ortStage1Data={ortStage1Data}
//                   onToggleTicketExpand={toggleTicketExpand}
//                   onToggleSessionExpand={toggleSessionExpand}
//                   onStartScanning={handleStartScanning}
//                   onOQCApproval={handleOQCApproval}
//                   onUpdateLocation={handleUpdateLocation}
//                   onSetShowOQCApproval={setShowOQCApproval}
//                   onSetOqcApprover={setOqcApprover}
//                   onSetEditingLocation={setEditingLocation}
//                   onSetEditLocationValue={setEditLocationValue}
//                   onSubmitToORTLab={handleSubmitToORTLab}
//                   onReUploadFromORT={handleReUploadFromORT}
//                   getStatusColor={getStatusColor}
//                   getStatusIcon={getStatusIcon}
//                 />
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Older Tickets Section */}
//         {olderTickets.length > 0 && (
//           <div>
//             <div className="flex items-center gap-2 mb-4">
//               <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-sm">
//                 <Clock className="h-3 w-3 mr-1" />
//                 Older Tickets
//               </Badge>
//               <h2 className="text-lg font-semibold text-gray-900">
//                 Previous Tickets
//               </h2>
//             </div>
//             <div className="space-y-4">
//               {olderTickets.map((ticket) => (
//                 <TicketCard
//                   key={ticket.id}
//                   ticket={ticket}
//                   expandedTickets={expandedTickets}
//                   expandedSessions={expandedSessions}
//                   showOQCApproval={showOQCApproval}
//                   oqcApprover={oqcApprover}
//                   editingLocation={editingLocation}
//                   editLocationValue={editLocationValue}
//                   ortStage1Data={ortStage1Data}
//                   onToggleTicketExpand={toggleTicketExpand}
//                   onToggleSessionExpand={toggleSessionExpand}
//                   onStartScanning={handleStartScanning}
//                   onOQCApproval={handleOQCApproval}
//                   onUpdateLocation={handleUpdateLocation}
//                   onSetShowOQCApproval={setShowOQCApproval}
//                   onSetOqcApprover={setOqcApprover}
//                   onSetEditingLocation={setEditingLocation}
//                   onSetEditLocationValue={setEditLocationValue}
//                   onSubmitToORTLab={handleSubmitToORTLab}
//                   onReUploadFromORT={handleReUploadFromORT}
//                   getStatusColor={getStatusColor}
//                   getStatusIcon={getStatusIcon}
//                 />
//               ))}
//             </div>
//           </div>
//         )}

//         {/* No Tickets Message */}
//         {filteredRecords.length === 0 && (
//           <Card className="text-center py-12">
//             <CardContent>
//               <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//               <h3 className="text-lg font-semibold text-gray-700 mb-2">
//                 No tickets found
//               </h3>
//               <p className="text-gray-500 mb-4">
//                 {testRecords.length === 0
//                   ? "Create your first ticket to get started"
//                   : "No tickets match the current filters"}
//               </p>
//               {testRecords.length > 0 && (
//                 <Button variant="outline" onClick={clearAllFilters}>
//                   Clear all filters
//                 </Button>
//               )}
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       {/* Scan Parts Modal */}
//       <Dialog
//         open={isScanModalOpen}
//         onOpenChange={(open) => {
//           if (!open) {
//             setIsScanningActive(false); // Stop scanning when modal closes
//           }
//           setIsScanModalOpen(open);
//         }}
//       >
//         <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>
//               Scan Parts for {selectedTicket?.ticketCode}
//             </DialogTitle>
//             <DialogDescription>
//               Scan barcodes and select cosmetic status for each part
//             </DialogDescription>
//           </DialogHeader>

//           {selectedTicket && (
//             <div className="space-y-6">
//               {/* Ticket Summary */}
//               <Card>
//                 <CardContent className="p-6">
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
//                     <div>
//                       <div className="text-sm font-medium text-blue-700">
//                         Ticket Code
//                       </div>
//                       <div className="font-bold text-lg flex items-center gap-2">
//                         <Ticket className="h-4 w-4" />
//                         {selectedTicket.ticketCode}
//                       </div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-blue-700">
//                         Required
//                       </div>
//                       <div className="font-bold text-lg">
//                         {selectedTicket.totalQuantity}
//                       </div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-blue-700">
//                         Scanned
//                       </div>
//                       <div className="font-bold text-lg text-green-600">
//                         {selectedTicket.sessions.reduce(
//                           (sum, session) => sum + session.parts.length,
//                           0,
//                         ) + tempScannedParts.length}
//                       </div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-blue-700">
//                         Remaining
//                       </div>
//                       <div
//                         className={`font-bold text-lg ${selectedTicket.totalQuantity - (selectedTicket.sessions.reduce((sum, session) => sum + session.parts.length, 0) + tempScannedParts.length) > 0 ? "text-orange-600" : "text-green-600"}`}
//                       >
//                         {Math.max(
//                           0,
//                           selectedTicket.totalQuantity -
//                             (selectedTicket.sessions.reduce(
//                               (sum, session) => sum + session.parts.length,
//                               0,
//                             ) +
//                               tempScannedParts.length),
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Show current sessions status */}
//                   {selectedTicket.sessions.length > 0 && (
//                     <div className="mb-6 p-4 bg-gray-50 rounded-lg">
//                       <h3 className="font-semibold mb-2">
//                         Current Sessions Status:
//                       </h3>
//                       <div className="flex flex-wrap gap-2">
//                         {selectedTicket.sessions.map((session) => (
//                           <Badge
//                             key={session.id}
//                             variant={session.submitted ? "default" : "outline"}
//                             className={
//                               session.submitted
//                                 ? "bg-green-600"
//                                 : "bg-yellow-100 text-yellow-800"
//                             }
//                           >
//                             Session {session.sessionNumber}:{" "}
//                             {session.parts.length} parts
//                             {session.submitted ? " ✓ Submitted" : " ⏳ Pending"}
//                           </Badge>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Scanner Controls */}
//               <Card>
//                 <CardContent className="p-6">
//                   <div className="space-y-6">
//                     {/* Start/Stop Scanner Button */}
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <h3 className="font-semibold text-lg">
//                           Scanner Control
//                         </h3>
//                         <p className="text-sm text-gray-500">
//                           {isScanningActive
//                             ? "Scanner is active - scan barcodes continuously"
//                             : "Click Start to begin continuous scanning"}
//                         </p>
//                       </div>
//                       <Button
//                         onClick={toggleScanning}
//                         className={`${isScanningActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-medium px-6 py-3`}
//                         size="lg"
//                       >
//                         {isScanningActive ? (
//                           <>
//                             <Square className="mr-2 h-5 w-5" />
//                             Stop Scanning
//                           </>
//                         ) : (
//                           <>
//                             <Play className="mr-2 h-5 w-5" />
//                             Start Scanning
//                           </>
//                         )}
//                       </Button>
//                     </div>

//                     {/* Bulk Action Buttons */}
//                     {tempScannedParts.length > 0 && (
//                       <div className="border-t pt-6">
//                         <h3 className="font-semibold text-lg mb-4">
//                           Bulk Actions
//                         </h3>
//                         <div className="flex flex-wrap gap-3">
//                           <Button
//                             onClick={handleSelectAllCosmeticOK}
//                             variant="outline"
//                             className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
//                           >
//                             <CheckCircle className="mr-2 h-4 w-4" />
//                             All Cosmetic OK
//                           </Button>
//                           <Button
//                             onClick={handleSelectAllCosmeticNotOK}
//                             variant="outline"
//                             className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
//                           >
//                             <XCircle className="mr-2 h-4 w-4" />
//                             All Cosmetic Not OK
//                           </Button>
//                           <Button
//                             onClick={handleClearAllSelection}
//                             variant="outline"
//                             className="border-gray-300 text-gray-700 hover:bg-gray-50"
//                           >
//                             <Layers className="mr-2 h-4 w-4" />
//                             Clear Selection
//                           </Button>
//                         </div>
//                         <p className="text-sm text-gray-500 mt-2">
//                           Quickly apply cosmetic status to all scanned barcodes
//                         </p>
//                       </div>
//                     )}

//                     {/* Scanner Input */}
//                     <div className="space-y-4">
//                       <div className="space-y-2">
//                         <Label
//                           htmlFor="barcodeInput"
//                           className="text-base font-medium flex items-center gap-2"
//                         >
//                           {isScanningActive ? (
//                             <Zap className="h-4 w-4 text-green-600 animate-pulse" />
//                           ) : (
//                             <ZapOff className="h-4 w-4 text-gray-400" />
//                           )}
//                           Scanner Input <span className="text-red-600">*</span>
//                           {isScanningActive && (
//                             <Badge className="ml-2 bg-green-100 text-green-800 text-xs animate-pulse">
//                               Active - Keep cursor in this box
//                             </Badge>
//                           )}
//                         </Label>
//                         <Input
//                           id="barcodeInput"
//                           ref={inputRef}
//                           value={barcodeInput}
//                           onChange={handleBarcodeInputChange}
//                           onKeyDown={handleAutoScan}
//                           placeholder={
//                             isScanningActive
//                               ? "Keep cursor here and scan barcodes (Press Enter after each scan)"
//                               : "Click 'Start Scanning' to begin"
//                           }
//                           className="h-12 font-mono text-lg border-2 border-blue-300 focus:border-green-500"
//                           disabled={!isScanningActive}
//                           autoComplete="off"
//                         />
//                         <div className="flex items-center justify-between">
//                           <p className="text-sm text-gray-500">
//                             {isScanningActive
//                               ? "Keep your cursor in this box and scan barcodes. Press Enter after each scan."
//                               : "Scan barcodes directly - no input box needed"}
//                           </p>
//                           {isScanningActive && (
//                             <div className="flex items-center gap-2">
//                               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
//                               <span className="text-xs text-green-600 font-medium">
//                                 Ready to scan
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Scanned Parts List */}
//               {tempScannedParts.length > 0 && (
//                 <Card>
//                   <CardContent className="p-6">
//                     <div className="flex justify-between items-center mb-6">
//                       <div>
//                         <h3 className="font-semibold text-lg text-gray-700">
//                           Scanned Barcodes ({tempScannedParts.length})
//                         </h3>
//                         <p className="text-sm text-gray-500">
//                           Select cosmetic status for each scanned barcode
//                         </p>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="text-xs">
//                           {
//                             tempScannedParts.filter(
//                               (p) => p.scanStatus === "Cosmetic OK",
//                             ).length
//                           }{" "}
//                           OK
//                         </Badge>
//                         <Badge variant="outline" className="text-xs">
//                           {
//                             tempScannedParts.filter(
//                               (p) => p.scanStatus === "Cosmetic Not OK",
//                             ).length
//                           }{" "}
//                           Not OK
//                         </Badge>
//                         <Badge variant="outline" className="text-xs">
//                           {tempScannedParts.filter((p) => !p.scanStatus).length}{" "}
//                           Pending
//                         </Badge>
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => {
//                             if (window.confirm("Clear all scanned barcodes?")) {
//                               setTempScannedParts([]);
//                               showNotification(
//                                 "info",
//                                 "All scanned barcodes cleared",
//                               );
//                             }
//                           }}
//                           className="text-red-500 hover:text-red-700"
//                         >
//                           <Trash2 className="mr-2 h-4 w-4" />
//                           Clear All
//                         </Button>
//                       </div>
//                     </div>

//                     <div className="space-y-4 max-h-96 overflow-y-auto">
//                       {tempScannedParts.map((part, index) => (
//                         <div
//                           key={`temp-${index}`}
//                           className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
//                         >
//                           <div className="flex justify-between items-start mb-3">
//                             <div className="flex-1 min-w-0 mr-4">
//                               <div className="font-medium flex items-center gap-2 mb-2">
//                                 <Barcode className="h-4 w-4 text-blue-600 flex-shrink-0" />
//                                 <span className="text-blue-600">
//                                   #{index + 1}
//                                 </span>
//                                 <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded">
//                                   {part.partNumber}
//                                 </span>
//                               </div>
//                               <div className="text-xs text-gray-500 mt-1">
//                                 Scanned at: {new Date().toLocaleTimeString()}
//                               </div>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Badge
//                                 className={`${getStatusColor(part.scanStatus)} flex-shrink-0`}
//                               >
//                                 {getStatusIcon(part.scanStatus)}
//                                 <span className="ml-1">
//                                   {part.scanStatus || "Pending"}
//                                 </span>
//                               </Badge>
//                               {/* DELETE BUTTON FOR EACH PART */}
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 onClick={() => {
//                                   setTempScannedParts((prev) =>
//                                     prev.filter((_, i) => i !== index),
//                                   );
//                                   showNotification(
//                                     "info",
//                                     `Barcode ${part.partNumber} removed`,
//                                   );
//                                 }}
//                                 className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
//                               >
//                                 <Trash2 className="h-4 w-4" />
//                               </Button>
//                             </div>
//                           </div>

//                           <div className="space-y-2">
//                             <Label className="text-sm font-medium">
//                               Select Cosmetic Status:
//                             </Label>
//                             <RadioGroup
//                               value={part.scanStatus || ""}
//                               onValueChange={(
//                                 value: "Cosmetic OK" | "Cosmetic Not OK",
//                               ) => handleStatusChange(index, value)}
//                               className="flex gap-4"
//                             >
//                               <div className="flex items-center space-x-2">
//                                 <RadioGroupItem
//                                   value="Cosmetic OK"
//                                   id={`cosmeticok-${index}`}
//                                 />
//                                 <Label
//                                   htmlFor={`cosmeticok-${index}`}
//                                   className="flex items-center gap-2 cursor-pointer"
//                                 >
//                                   <CheckCircle className="h-4 w-4 text-green-600" />
//                                   Cosmetic OK
//                                 </Label>
//                               </div>
//                               <div className="flex items-center space-x-2">
//                                 <RadioGroupItem
//                                   value="Cosmetic Not OK"
//                                   id={`cosmeticnotok-${index}`}
//                                 />
//                                 <Label
//                                   htmlFor={`cosmeticnotok-${index}`}
//                                   className="flex items-center gap-2 cursor-pointer"
//                                 >
//                                   <AlertCircle className="h-4 w-4 text-red-600" />
//                                   Cosmetic Not OK
//                                 </Label>
//                               </div>
//                             </RadioGroup>
//                           </div>
//                         </div>
//                       ))}
//                     </div>

//                     <div className="pt-6 border-t mt-6 flex flex-col gap-4">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <p className="text-sm text-gray-500">
//                             {
//                               tempScannedParts.filter((p) => !p.scanStatus)
//                                 .length
//                             }{" "}
//                             barcode(s) need status selection
//                           </p>
//                           <p className="text-sm font-medium mt-1">
//                             Total scanned: {tempScannedParts.length} /{" "}
//                             {selectedTicket.totalQuantity}
//                           </p>
//                         </div>
//                         <Button
//                           onClick={handleSaveSession}
//                           disabled={
//                             isSaving ||
//                             tempScannedParts.length === 0 ||
//                             tempScannedParts.some((p) => !p.scanStatus)
//                           }
//                           className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 text-base font-medium"
//                           size="lg"
//                         >
//                           {isSaving ? (
//                             <>
//                               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
//                               Saving...
//                             </>
//                           ) : (
//                             <>
//                               <Save className="mr-2 h-5 w-5" />
//                               Save Session ({tempScannedParts.length} barcodes)
//                             </>
//                           )}
//                         </Button>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               )}
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// // Ticket Card Component (Extracted for readability)
// interface TicketCardProps {
//   ticket: TestRecord;
//   expandedTickets: { [key: string]: boolean };
//   expandedSessions: { [key: string]: boolean };
//   showOQCApproval: number | null;
//   oqcApprover: string;
//   editingLocation: string | null;
//   editLocationValue: string;
//   ortStage1Data: ORTStage1Data[];
//   onToggleTicketExpand: (ticketCode: string) => void;
//   onToggleSessionExpand: (sessionId: string) => void;
//   onStartScanning: (ticket: TestRecord) => void;
//   onOQCApproval: (ticketId: number) => void;
//   onUpdateLocation: (
//     ticketId: number,
//     sessionId: string,
//     partId: string,
//     newLocation: string,
//   ) => void;
//   onSetShowOQCApproval: (id: number | null) => void;
//   onSetOqcApprover: (name: string) => void;
//   onSetEditingLocation: (id: string | null) => void;
//   onSetEditLocationValue: (value: string) => void;
//   onSubmitToORTLab: (
//     ticketId: number,
//     sessionId: string,
//     ticketCode: string,
//   ) => void;
//   onReUploadFromORT: (ortSession: ORTStage1Data) => void | Promise<void>;
//   getStatusColor: (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => string;
//   getStatusIcon: (
//     status: "Cosmetic OK" | "Cosmetic Not OK" | null,
//   ) => React.ReactNode;
// }

// const TicketCard: React.FC<TicketCardProps> = ({
//   ticket,
//   expandedTickets,
//   expandedSessions,
//   showOQCApproval,
//   oqcApprover,
//   editingLocation,
//   editLocationValue,
//   ortStage1Data,
//   onToggleTicketExpand,
//   onToggleSessionExpand,
//   onStartScanning,
//   onOQCApproval,
//   onUpdateLocation,
//   onSetShowOQCApproval,
//   onSetOqcApprover,
//   onSetEditingLocation,
//   onSetEditLocationValue,
//   onSubmitToORTLab,
//   onReUploadFromORT,
//   getStatusColor,
//   getStatusIcon,
// }) => {
//   const totalScanned = ticket.sessions.reduce(
//     (sum, session) => sum + session.parts.length,
//     0,
//   );
//   const okCount = ticket.sessions.reduce(
//     (sum, session) =>
//       sum + session.parts.filter((p) => p.scanStatus === "Cosmetic OK").length,
//     0,
//   );
//   const cosmeticCount = ticket.sessions.reduce(
//     (sum, session) =>
//       sum +
//       session.parts.filter((p) => p.scanStatus === "Cosmetic Not OK").length,
//     0,
//   );
//   const isExpanded = expandedTickets[ticket.ticketCode];

//   // Check if any session is marked as "Not Received" in ORT
//   const ortStatusMap: Record<string, ORTStage1Data | undefined> = {};
//   ortStage1Data.forEach((stageSession) => {
//     if (stageSession.received === "No") {
//       const key = `${stageSession.ticketCode}-${stageSession.sessionNumber}`;
//       const hasCompletedReupload = ticket.sessions.some(
//         (localSession) =>
//           localSession.sessionNumber === stageSession.sessionNumber &&
//           localSession.wasReupload &&
//           localSession.parts.length > 0 &&
//           localSession.submitted,
//       );

//       if (!hasCompletedReupload) {
//         ortStatusMap[key] = stageSession;
//       }
//     }
//   });

//   return (
//     <Card className="border-2">
//       <CardContent className="p-0">
//         {/* Main Ticket Row */}
//         <div className="p-4 bg-gray-50 border-b-2">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => onToggleTicketExpand(ticket.ticketCode)}
//                 className="h-8 w-8 p-0"
//               >
//                 {isExpanded ? (
//                   <ChevronDown className="h-5 w-5" />
//                 ) : (
//                   <ChevronRight className="h-5 w-5" />
//                 )}
//               </Button>
//               <div>
//                 <div className="font-bold text-lg flex items-center gap-2">
//                   <Ticket className="h-5 w-5 text-blue-600" />
//                   {ticket.ticketCode}
//                 </div>
//                 <div className="text-sm text-gray-600 mt-1">
//                   {ticket.project} • {ticket.build} • {ticket.colour} •{" "}
//                   {ticket.anoType} • {ticket.source}
//                 </div>
//                 <div className="text-xs text-gray-500 mt-1">
//                   Created: {new Date(ticket.createdAt).toLocaleString()}
//                   {ticket.oqcApproved && ticket.oqcApprovedBy && (
//                     <span className="ml-4 text-green-600 font-medium">
//                       ✓ OQC Approved by {ticket.oqcApprovedBy}
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-6">
//               <div className="text-center">
//                 <div className="text-xs text-gray-500">Total Qty</div>
//                 <div className="font-bold text-lg">{ticket.totalQuantity}</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-xs text-gray-500">Scanned</div>
//                 <div className="font-bold text-lg text-green-600">
//                   {totalScanned}
//                 </div>
//               </div>
//               <div className="text-center">
//                 <div className="text-xs text-gray-500">Remaining</div>
//                 <div
//                   className={`font-bold text-lg ${totalScanned >= ticket.totalQuantity ? "text-green-600" : "text-orange-600"}`}
//                 >
//                   {Math.max(0, ticket.totalQuantity - totalScanned)}
//                 </div>
//               </div>

//               {showOQCApproval === ticket.id ? (
//                 <div className="flex items-center gap-2">
//                   <Input
//                     placeholder="Your name"
//                     value={oqcApprover}
//                     onChange={(e) => onSetOqcApprover(e.target.value)}
//                     className="h-8 w-32"
//                   />
//                   <Button
//                     onClick={() => onOQCApproval(ticket.id)}
//                     size="sm"
//                     className="bg-green-600 hover:bg-green-700"
//                   >
//                     Approve
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => onSetShowOQCApproval(null)}
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="flex items-center gap-2">
//                   {ticket.status !== "OQC Approved" && (
//                     <Button
//                       onClick={() => onStartScanning(ticket)}
//                       className="bg-blue-600 hover:bg-blue-700"
//                     >
//                       <Scan className="mr-2 h-4 w-4" />
//                       Scan Parts
//                     </Button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Status Summary */}
//           {(okCount > 0 || cosmeticCount > 0) && (
//             <div className="flex gap-2 mt-3">
//               {okCount > 0 && (
//                 <Badge className="bg-green-100 text-green-800 border border-green-200">
//                   <CheckCircle className="h-3 w-3 mr-1" />
//                   Cosmetic OK: {okCount}
//                 </Badge>
//               )}
//               {cosmeticCount > 0 && (
//                 <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
//                   <AlertCircle className="h-3 w-3 mr-1" />
//                   Cosmetic Not OK: {cosmeticCount}
//                 </Badge>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Expanded Content - Sessions */}
//         {isExpanded && (
//           <div className="p-4">
//             {ticket.sessions.length === 0 ? (
//               <div className="text-center py-4 text-gray-500 text-sm">
//                 No scanning sessions yet. Click "Scan Parts" to start scanning.
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {ticket.sessions.map((session) => {
//                   const isSessionExpanded = expandedSessions[session.id];
//                   const sessionOk = session.parts.filter(
//                     (p) => p.scanStatus === "Cosmetic OK",
//                   ).length;
//                   const sessionCosmetic = session.parts.filter(
//                     (p) => p.scanStatus === "Cosmetic Not OK",
//                   ).length;

//                   // Check if this session is marked as "Not Received" in ORT
//                   const ortKey = `${ticket.ticketCode}-${session.sessionNumber}`;
//                   const ortStatus = ortStatusMap[ortKey];
//                   const isNotReceivedInORT = ortStatus?.received === "No";
//                   const reasonMatch = ortStatus?.inventoryRemarks?.match(
//                     /Not Received - Reason: (.+)/,
//                   );
//                   const ortReason = reasonMatch
//                     ? reasonMatch[1]
//                     : "No reason provided";

//                   return (
//                     <div
//                       key={session.id}
//                       className={`border rounded-lg ${isNotReceivedInORT ? "border-red-300 bg-red-50" : ""}`}
//                     >
//                       {/* Session Header */}
//                       <div
//                         className={`p-3 ${isNotReceivedInORT ? "bg-red-100" : "bg-blue-50"} flex items-center justify-between`}
//                       >
//                         <div className="flex items-center gap-3">
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => onToggleSessionExpand(session.id)}
//                             className="h-6 w-6 p-0"
//                           >
//                             {isSessionExpanded ? (
//                               <ChevronDown className="h-4 w-4" />
//                             ) : (
//                               <ChevronRight className="h-4 w-4" />
//                             )}
//                           </Button>
//                           <div>
//                             <div className="font-semibold text-sm flex items-center gap-2">
//                               Session {session.sessionNumber}
//                               {isNotReceivedInORT && (
//                                 <Badge className="bg-red-600 text-white text-xs">
//                                   ORT: Not Received
//                                 </Badge>
//                               )}
//                             </div>
//                             <div className="text-xs text-gray-600">
//                               Saved:{" "}
//                               {new Date(session.timestamp).toLocaleString()}
//                               {session.submittedAt && (
//                                 <span className="ml-4 text-green-600 font-medium">
//                                   ✓ Submitted:{" "}
//                                   {new Date(
//                                     session.submittedAt,
//                                   ).toLocaleString()}
//                                 </span>
//                               )}
//                               {session.sentToORT && session.sentToORTAt && (
//                                 <span className="ml-4 text-purple-600 font-medium">
//                                   ✓ Sent to ORT Lab
//                                 </span>
//                               )}
//                             </div>
//                             {isNotReceivedInORT && ortReason && (
//                               <div className="text-xs text-red-700 mt-1">
//                                 <span className="font-semibold">
//                                   ORT Reason:
//                                 </span>{" "}
//                                 {ortReason}
//                               </div>
//                             )}
//                           </div>
//                         </div>

//                         <div className="flex items-center gap-3">
//                           <Badge variant="outline" className="text-xs">
//                             {session.parts.length} parts
//                           </Badge>
//                           <div className="flex gap-1">
//                             {sessionOk > 0 && (
//                               <Badge className="bg-green-100 text-green-800 text-xs">
//                                 OK: {sessionOk}
//                               </Badge>
//                             )}
//                             {sessionCosmetic > 0 && (
//                               <Badge className="bg-yellow-100 text-yellow-800 text-xs">
//                                 Not OK: {sessionCosmetic}
//                               </Badge>
//                             )}
//                           </div>

//                           <div className="flex gap-2">
//                             {isNotReceivedInORT && ortStatus ? (
//                               <>
//                                 <Button
//                                   onClick={() => onReUploadFromORT(ortStatus)}
//                                   size="sm"
//                                   className="bg-red-600 hover:bg-red-700 text-white"
//                                 >
//                                   <Upload className="h-4 w-4 mr-2" />
//                                   Re-Upload & Scan
//                                 </Button>
//                               </>
//                             ) : (
//                               <>
//                                 {/* Show submitted badge */}
//                                 {session.submitted && (
//                                   <Badge className="bg-green-600 text-white text-xs">
//                                     ✓ Submitted
//                                   </Badge>
//                                 )}

//                                 {/* Submit to ORT Lab Button - Only show if session is submitted and not sent yet */}
//                                 {!session.sentToORT &&
//                                   ticket.oqcApproved &&
//                                   session.submitted && (
//                                     <Button
//                                       onClick={() =>
//                                         onSubmitToORTLab(
//                                           ticket.id,
//                                           session.id,
//                                           ticket.ticketCode,
//                                         )
//                                       }
//                                       size="sm"
//                                       className="bg-purple-600 hover:bg-purple-700 text-white"
//                                     >
//                                       <Send className="mr-2 h-3 w-3" />
//                                       Send to ORT Lab
//                                     </Button>
//                                   )}
//                                 {session.sentToORT && (
//                                   <Badge className="bg-purple-600 text-white text-xs">
//                                     Sent to ORT
//                                   </Badge>
//                                 )}
//                               </>
//                             )}
//                           </div>
//                         </div>
//                       </div>

//                       {/* Session Parts Table */}
//                       {isSessionExpanded && (
//                         <div className="p-3">
//                           <Table>
//                             <TableHeader>
//                               <TableRow>
//                                 <TableHead className="w-16">#</TableHead>
//                                 <TableHead>Barcode</TableHead>
//                                 <TableHead>Status</TableHead>
//                                 {/* <TableHead>Location</TableHead> */}
//                                 <TableHead>Scanned At</TableHead>
//                               </TableRow>
//                             </TableHeader>
//                             <TableBody>
//                               {session.parts.map((part, partIdx) => (
//                                 <TableRow key={part.id}>
//                                   <TableCell className="font-medium">
//                                     {partIdx + 1}
//                                   </TableCell>
//                                   <TableCell>
//                                     <span className="font-mono text-lg">
//                                       {part.partNumber}
//                                     </span>
//                                   </TableCell>
//                                   <TableCell>
//                                     <Badge
//                                       className={getStatusColor(
//                                         part.scanStatus,
//                                       )}
//                                     >
//                                       {getStatusIcon(part.scanStatus)}
//                                       <span className="ml-1">
//                                         {part.scanStatus}
//                                       </span>
//                                     </Badge>
//                                   </TableCell>
//                                   {/* <TableCell>
//                                     {editingLocation === part.id ? (
//                                       <div className="flex items-center gap-1">
//                                         <Input
//                                           value={editLocationValue}
//                                           onChange={(e) =>
//                                             onSetEditLocationValue(
//                                               e.target.value,
//                                             )
//                                           }
//                                           className="h-7 w-24 text-sm"
//                                           autoFocus
//                                         />
//                                         <Button
//                                           size="sm"
//                                           variant="ghost"
//                                           onClick={() => {
//                                             onUpdateLocation(
//                                               ticket.id,
//                                               session.id,
//                                               part.id,
//                                               editLocationValue,
//                                             );
//                                           }}
//                                           className="h-7 w-7 p-0"
//                                         >
//                                           <Save className="h-3 w-3 text-green-600" />
//                                         </Button>
//                                         <Button
//                                           size="sm"
//                                           variant="ghost"
//                                           onClick={() => {
//                                             onSetEditingLocation(null);
//                                             onSetEditLocationValue("");
//                                           }}
//                                           className="h-7 w-7 p-0"
//                                         >
//                                           <X className="h-3 w-3 text-red-600" />
//                                         </Button>
//                                       </div>
//                                     ) : (
//                                       <div
//                                         className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
//                                         onClick={() => {
//                                           onSetEditingLocation(part.id);
//                                           onSetEditLocationValue(part.location);
//                                         }}
//                                       >
//                                         <span className="text-sm font-medium">
//                                           {part.location}
//                                         </span>
//                                         <Edit2 className="h-3 w-3 text-gray-400" />
//                                       </div>
//                                     )}
//                                   </TableCell> */}
//                                   <TableCell className="text-sm text-gray-600">
//                                     {new Date(part.scannedAt).toLocaleString()}
//                                   </TableCell>
//                                 </TableRow>
//                               ))}
//                             </TableBody>
//                           </Table>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// };

// export default OQCSystem;


import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Check,
  Scan,
  Ticket,
  Calendar,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Send,
  RefreshCw,
  Eye,
  Plus,
  Clock,
  FilterX,
  Play,
  Square,
  Zap,
  ZapOff,
  Layers,
  Barcode,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@radix-ui/react-toast";

// Types
interface PartInfo {
  id: string;
  partNumber: string; // This will store the scanned barcode
  scanStatus: "Cosmetic OK" | "Cosmetic Not OK";
  scannedAt: string;
  location: string;
}

interface ScanSession {
  id: string;
  sessionNumber: number;
  timestamp: string;
  parts: PartInfo[];
  submitted: boolean;
  submittedAt?: string;
  sentToORT: boolean;
  sentToORTAt?: string;
  isReuploaded?: boolean;
  originalOrtStatus?: string;
  wasReupload?: boolean;
}

interface TestRecord {
  id: number;
  ticketCode: string;
  totalQuantity: number;
  anoType: string;
  source: string;
  reason: string;
  project: string;
  build: string;
  colour: string;
  dateTime: string;
  status: string;
  sessions: ScanSession[];
  createdAt: string;
  oqcApproved: boolean;
  oqcApprovedAt?: string;
  oqcApprovedBy?: string;
}

interface TempScannedPart {
  partNumber: string; // This stores the scanned barcode directly
  scanStatus: "Cosmetic OK" | "Cosmetic Not OK" | null;
}

interface ORTStage1Data {
  id: number;
  ticketId: number;
  ortRecordId?: number;
  scannedPartsId?: number;
  ticketCode: string;
  sessionId: string;
  sessionNumber: number;
  partsBeingSent: number;
  received: "Yes" | "No" | "";
  date?: string;
  shiftTime?: string;
  detailsBox: {
    totalQuantity: number;
    ticketCodeRaised: string;
    dateShiftTime: string;
    project: string;
    batch: string;
    color: string;
    assemblyOQCAno: string;
    reason: string;
    oqcApprovedBy?: string;
    oqcApprovedAt?: string;
  };
  inventoryRemarks: string;
  stage2Enabled: boolean;
  status: string;
  movedToStage2?: boolean;
  movedToStage2At?: string;
  partNumbers: string[];
  totalQuantity: number;
}

interface ExcelDropdownData {
  ASSEMBLY_ANO_OPTIONS: string[];
  SOURCE_OPTIONS_ANO: string[];
  SOURCE_OPTIONS_ASSEMBLY: string[];
  SOURCE_OPTIONS_OLEO: string[];
  PROJECT_OPTIONS: string[];
  COLOUR_OPTIONS: string[];
  REASON_OPTIONS: string[];
}

const API_BASE_URL = "http://localhost:6060";
// const API_BASE_URL = "http://172.16.106.44:6060";

const apiService = {
  createOqcForm: async (formData: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/oqcForm`, formData);
      return response.data;
    } catch (error) {
      console.error("Error creating OQC form:", error);
      throw error;
    }
  },
  getAllOqcForms: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/oqcForm`);
      console.log("reponse from backend", response.data);
      return response.data.Ticket;
    } catch (error) {
      console.error("Error fetching OQC forms:", error);
      throw error;
    }
  },
  createScannedParts: async (scannedPartsData: any) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/scannedParts`,
        scannedPartsData,
      );
      return response.data;
    } catch (error) {
      console.error("Error saving scanned parts:", error);
      throw error;
    }
  },

  getAllScannedParts: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scannedParts`);
      return response.data.scannedParts || [];
    } catch (error) {
      console.error("Error fetching scanned parts:", error);
      throw error;
    }
  },
  getAllOrtRecords: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ort`);
      return response.data.orts || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Error fetching ORT records:", error);
      throw error;
    }
  },
  deleteOrtRecord: async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/ort/${id}`);
    } catch (error) {
      console.error("Error deleting ORT record:", error);
      throw error;
    }
  },
  deleteScannedParts: async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/scannedParts/${id}`);
    } catch (error) {
      console.error("Error deleting scanned parts record:", error);
      throw error;
    }
  },
  getScannedPartsByTicketSession: async (ticketId: number, session: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/scannedParts/${ticketId}/${session}`,
      );
      return response.data.scannedParts || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Error fetching scanned parts by ticket/session:", error);
      throw error;
    }
  },
};


const PROJECT_CODES = {
  FLASH: "FLS",
  LIGHT: "LGT",
  HULK: "HLK",
  AQUA: "AQU",
};

const COLOUR_CODES = {
  NDA: "N",
  Stardust: "S",
  "Light Blue": "B",
  "N/A": "X",
};

const ANO_TYPE_CODES = {
  ANO: "ANO",
  ASSEMBLY: "ASY",
  OLEO: "OLE",
};

const REASON_CODES = {
  MP: "MP",
  NPI: "NP",
  "Line Qualification": "LQ",
  "Machine Qualification": "MQ",
  Other: "OTH",
};

const OQCSystem = () => {
  const navigate = useNavigate();
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TestRecord | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedSessions, setExpandedSessions] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("All");
  const [buildFilter, setBuildFilter] = useState<string>("All");
  const [colourFilter, setColourFilter] = useState<string>("All");
  const [reasonFilter, setReasonFilter] = useState<string>("All");

  // ORT Stage 1 Data state
  const [ortStage1Data, setOrtStage1Data] = useState<ORTStage1Data[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const [excelDropdownData, setExcelDropdownData] = useState<ExcelDropdownData>({
    ASSEMBLY_ANO_OPTIONS: [],
    SOURCE_OPTIONS_ANO: [],
    SOURCE_OPTIONS_ASSEMBLY: [],
    SOURCE_OPTIONS_OLEO: [],
    PROJECT_OPTIONS: [],
    COLOUR_OPTIONS: [],
    REASON_OPTIONS: [],
  });

  // Form state for Create Ticket Modal
  const [formData, setFormData] = useState({
    ticketCode: "",
    totalQuantity: 0,
    anoType: "",
    source: "",
    otherSource: "",
    reason: "",
    otherReason: "",
    project: "",
    build: "",
    colour: "",
    dateTime: new Date().toISOString().split("T")[0],
    status: "In-Progress",
  });
  const [showOtherSource, setShowOtherSource] = useState(false);
  const [showOtherReason, setShowOtherReason] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  // Scanner state for Scan Modal
  const [barcodeInput, setBarcodeInput] = useState("");
  const [tempScannedParts, setTempScannedParts] = useState<TempScannedPart[]>(
    [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Scanner control state
  const [isScanningActive, setIsScanningActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Editing state for sessions
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState("");

  // OQC Approval state
  const [oqcApprover, setOqcApprover] = useState("");
  const [showOQCApproval, setShowOQCApproval] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadExcelData = async () => {
    try {
      const response = await fetch('/master_sheet.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetName = 'OQC_Form';
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        console.error('OQC_Form sheet not found in Excel file');
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headers = jsonData[0] as string[];

      const dropdownData: ExcelDropdownData = {
        ASSEMBLY_ANO_OPTIONS: [],
        SOURCE_OPTIONS_ANO: [],
        SOURCE_OPTIONS_ASSEMBLY: [],
        SOURCE_OPTIONS_OLEO: [],
        PROJECT_OPTIONS: [],
        COLOUR_OPTIONS: [],
        REASON_OPTIONS: [],
      };

      const columnIndices: Record<string, number> = {};
      headers.forEach((header, index) => {
        columnIndices[header] = index;
      });

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];

        Object.keys(dropdownData).forEach((key) => {
          const columnIndex = columnIndices[key];
          if (columnIndex !== undefined && row[columnIndex]) {
            const value = String(row[columnIndex]).trim();
            if (value && !dropdownData[key as keyof ExcelDropdownData].includes(value)) {
              dropdownData[key as keyof ExcelDropdownData].push(value);
            }
          }
        });
      }

      // Add "Other" option to SOURCE and REASON options
      // dropdownData.SOURCE_OPTIONS_ANO.push("Other");
      // dropdownData.SOURCE_OPTIONS_ASSEMBLY.push("Other");
      // dropdownData.SOURCE_OPTIONS_OLEO.push("Other");
      // dropdownData.REASON_OPTIONS.push("Other");

      setExcelDropdownData(dropdownData);
      console.log('Excel dropdown data loaded:', dropdownData);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      showNotification('error', 'Failed to load dropdown options from Excel file');
    }
  };

  useEffect(() => {
    loadExcelData();
    fetchTicketsFromBackend();
    void loadORTStage1Data();
  }, []);

  // Auto-focus input when scanning is active
  useEffect(() => {
    if (isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanningActive, tempScannedParts]);

  const fetchTicketsFromBackend = async () => {
    setIsLoading(true);
    try {
      // Fetch tickets
      const ticketsResponse = await apiService.getAllOqcForms();
      console.log("Ticket response from backend:", ticketsResponse);

      // Fetch scanned parts
      let scannedPartsResponse: any[] = [];
      try {
        const scannedPartsData = await apiService.getAllScannedParts();
        console.log("Scanned parts response:", scannedPartsData);

        // Handle different response formats
        if (Array.isArray(scannedPartsData)) {
          scannedPartsResponse = scannedPartsData;
        } else if (scannedPartsData && scannedPartsData.scannedParts) {
          scannedPartsResponse = scannedPartsData.scannedParts;
        } else if (scannedPartsData && Array.isArray(scannedPartsData.data)) {
          scannedPartsResponse = scannedPartsData.data;
        }
        console.log("Processed scanned parts array:", scannedPartsResponse);
      } catch (scannedError) {
        console.warn("Could not fetch scanned parts:", scannedError);
        // Continue without scanned parts
      }

      // Create a map of ticketId to scanned parts ARRAY
      const scannedPartsMap = new Map<number, any[]>();

      if (Array.isArray(scannedPartsResponse)) {
        scannedPartsResponse.forEach((scannedData: any) => {
          console.log("Processing scanned data:", scannedData);

          if (scannedData.ticketId) {
            // PARSE the parts JSON string to array
            let partsArray = [];
            if (typeof scannedData.parts === "string") {
              try {
                partsArray = JSON.parse(scannedData.parts);
                console.log(
                  `Parsed ${partsArray.length} parts from JSON string`,
                );
              } catch (e) {
                console.error("Failed to parse parts JSON string:", e);
                partsArray = [];
              }
            } else if (Array.isArray(scannedData.parts)) {
              // If it's already an array, use it directly
              partsArray = scannedData.parts;
            }

            // Add the complete scannedData object (not just parts)
            // This preserves createdAt, updatedAt, etc. for grouping by session
            if (!scannedPartsMap.has(scannedData.ticketId)) {
              scannedPartsMap.set(scannedData.ticketId, []);
            }
            scannedPartsMap.get(scannedData.ticketId)?.push({
              ...scannedData,
              partsArray: partsArray,
            });
          }
        });
      }

      console.log("Scanned parts map with session data:", scannedPartsMap);

      // Transform backend data to match your TestRecord interface
      const transformedTickets: TestRecord[] = ticketsResponse.map(
        (item: any) => {
          console.log("Processing ticket item:", item);

          // Get the correct ID - backend uses 'Id' (uppercase I)
          const ticketId = item.Id || item.id || Date.now();

          // Get ALL scanned sessions for this ticket
          const ticketScannedData = scannedPartsMap.get(ticketId) || [];

          // Group scanned data into sessions based on backend session value when available
          // Fallback to individual records to avoid merging unrelated scans
          const sessions: ScanSession[] = [];

          const sortedScannedData = [...ticketScannedData].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          type SessionGroup = {
            items: any[];
            sessionNumber: number | null;
            firstCreatedAt: string;
          };

          const sessionGroupMap = new Map<string, SessionGroup>();

          const parseScannedPartsSessionNumber = (
            value: number | string | null | undefined,
          ): number | null => {
            if (typeof value === "number" && Number.isFinite(value)) {
              return value;
            }
            if (typeof value === "string") {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                return null;
              }
              const parsed = Number(trimmed);
              if (!Number.isNaN(parsed)) {
                return parsed;
              }
            }
            return null;
          };

          sortedScannedData.forEach((scannedItem, index) => {
            const parsedSessionNumber = parseScannedPartsSessionNumber(
              scannedItem.session,
            );
            const createdAt = scannedItem.createdAt || new Date().toISOString();
            const key =
              parsedSessionNumber !== null
                ? `session-${parsedSessionNumber}`
                : `record-${scannedItem.Id ?? `${createdAt}-${index}`}`;

            const existingGroup = sessionGroupMap.get(key);

            if (existingGroup) {
              existingGroup.items.push(scannedItem);
              if (
                new Date(createdAt).getTime() <
                new Date(existingGroup.firstCreatedAt).getTime()
              ) {
                existingGroup.firstCreatedAt = createdAt;
              }
            } else {
              sessionGroupMap.set(key, {
                items: [scannedItem],
                sessionNumber: parsedSessionNumber,
                firstCreatedAt: createdAt,
              });
            }
          });

          const explicitSessionNumbers = new Set<number>();
          sessionGroupMap.forEach((group) => {
            if (group.sessionNumber !== null) {
              explicitSessionNumbers.add(group.sessionNumber);
            }
          });

          const sessionGroupsArray = Array.from(sessionGroupMap.values()).sort(
            (a, b) => {
              if (a.sessionNumber !== null && b.sessionNumber !== null) {
                if (a.sessionNumber !== b.sessionNumber) {
                  return a.sessionNumber - b.sessionNumber;
                }
              } else if (a.sessionNumber !== null) {
                return -1;
              } else if (b.sessionNumber !== null) {
                return 1;
              }

              return (
                new Date(a.firstCreatedAt).getTime() -
                new Date(b.firstCreatedAt).getTime()
              );
            },
          );

          let autoSessionNumber = 1;

          const allocateSessionNumber = () => {
            while (explicitSessionNumbers.has(autoSessionNumber)) {
              autoSessionNumber++;
            }
            const allocated = autoSessionNumber;
            explicitSessionNumbers.add(allocated);
            autoSessionNumber++;
            return allocated;
          };

          sessionGroupsArray.forEach((group) => {
            const sessionItems = group.items;
            if (sessionItems.length === 0) {
              return;
            }

            const effectiveSessionNumber =
              group.sessionNumber ?? allocateSessionNumber();
            const sessionTimestamp = sessionItems.reduce(
              (latest, item) => {
                const candidate = item.updatedAt || item.createdAt || latest;
                if (!candidate) {
                  return latest;
                }
                return new Date(candidate).getTime() >
                  new Date(latest).getTime()
                  ? candidate
                  : latest;
              },
              sessionItems[0].updatedAt ||
              sessionItems[0].createdAt ||
              new Date().toISOString(),
            );

            const latestItem = sessionItems.reduce((currentLatest, item) => {
              const currentTime = new Date(
                currentLatest.updatedAt ||
                currentLatest.createdAt ||
                sessionTimestamp,
              ).getTime();
              const itemTime = new Date(
                item.updatedAt || item.createdAt || sessionTimestamp,
              ).getTime();
              return itemTime >= currentTime ? item : currentLatest;
            }, sessionItems[0]);

            const latestParts = Array.isArray(latestItem.partsArray)
              ? latestItem.partsArray
              : [];

            if (latestParts.length === 0) {
              return;
            }

            const partTimestamp =
              latestItem.updatedAt || latestItem.createdAt || sessionTimestamp;
            const wasReupload = sessionItems.length > 1;

            sessions.push({
              id: `session-${ticketId}-${effectiveSessionNumber}`,
              sessionNumber: effectiveSessionNumber,
              timestamp: sessionTimestamp,
              parts: latestParts.map((part: any, idx: number) => ({
                id: `part-${ticketId}-${effectiveSessionNumber}-${idx}`,
                partNumber:
                  part.part ||
                  part.partNumber ||
                  `PART-${String(idx + 1).padStart(3, "0")}`,
                scanStatus: (part.status ||
                  part.scanStatus ||
                  "Cosmetic OK") as "Cosmetic OK" | "Cosmetic Not OK",
                scannedAt: part.scannedAt || partTimestamp,
                location: part.location || "home",
              })),
              submitted: true,
              submittedAt: partTimestamp,
              sentToORT: false,
              wasReupload,
            });
          });

          // If no sessions were created but we have scanned parts, create a single session
          if (sessions.length === 0 && ticketScannedData.length > 0) {
            const latestItem = ticketScannedData.reduce(
              (currentLatest, item) => {
                const currentTime = new Date(
                  currentLatest.updatedAt ||
                  currentLatest.createdAt ||
                  new Date().toISOString(),
                ).getTime();
                const itemTime = new Date(
                  item.updatedAt || item.createdAt || new Date().toISOString(),
                ).getTime();
                return itemTime >= currentTime ? item : currentLatest;
              },
              ticketScannedData[0],
            );

            const latestParts = Array.isArray(latestItem.partsArray)
              ? latestItem.partsArray
              : [];

            if (latestParts.length > 0) {
              const fallbackTimestamp =
                latestItem.updatedAt ||
                latestItem.createdAt ||
                new Date().toISOString();
              const wasReupload = ticketScannedData.length > 1;

              sessions.push({
                id: `session-${ticketId}-1`,
                sessionNumber: 1,
                timestamp: fallbackTimestamp,
                parts: latestParts.map((part: any, idx: number) => ({
                  id: `part-${ticketId}-1-${idx}`,
                  partNumber:
                    part.part ||
                    part.partNumber ||
                    `PART-${String(idx + 1).padStart(3, "0")}`,
                  scanStatus: (part.status ||
                    part.scanStatus ||
                    "Cosmetic OK") as "Cosmetic OK" | "Cosmetic Not OK",
                  scannedAt: part.scannedAt || fallbackTimestamp,
                  location: part.location || "home",
                })),
                submitted: true,
                submittedAt: fallbackTimestamp,
                sentToORT: false,
                wasReupload,
              });
            }
          }

          return {
            id: ticketId,
            ticketCode: item.ticketCode,
            totalQuantity: item.totalQty,
            anoType: item.processStage,
            source: item.source,
            reason: item.reason,
            project: item.project,
            build: item.build,
            colour: item.colour,
            dateTime: item.date
              ? new Date(item.date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            status:
              sessions.length > 0 ? "Ready for OQC Approval" : "In-Progress",
            sessions: sessions,
            createdAt:
              item.createdAt || item.CreatedAt || new Date().toISOString(),
            oqcApproved: false,
          };
        },
      );

      console.log("Transformed tickets with sessions:", transformedTickets);
      setTestRecords(transformedTickets);
    } catch (error) {
      console.error("Error loading tickets from backend:", error);
      showNotification("error", "Failed to load tickets from database");
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect(() => {
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(testRecords));
  // }, [testRecords]);

  type BackendOrtDetailBox = {
    totalQuantity?: number;
    ticketCodeRaised?: string;
    dateShiftTime?: string;
    project?: string;
    batch?: string;
    color?: string;
    assemblyOQCAno?: string;
    reason?: string;
    oqcApprovedBy?: string;
    oqcApprovedAt?: string;
    movedToStage2?: boolean;
    movedToStage2At?: string;
    partNumbers?: string[];
    scannedPartsId?: number;
  };

  type BackendOrtRecord = {
    Id: number;
    ticketId: number;
    ticketCode: string;
    totalQty?: number;
    processStage?: string;
    source?: string;
    project?: string;
    build?: string;
    reason?: string;
    colour?: string;
    session?: number | string | null;
    allowedParts?: number;
    receivedStatus?: string;
    date?: string;
    shiftTime?: string;
    detailBox?: BackendOrtDetailBox | null;
    inventoryRemarks?: string;
  };

  const parseOrtSessionNumber = (
    value: number | string | null | undefined,
  ): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 1;
  };

  const mapOrtRecordToStage1Data = (
    record: BackendOrtRecord,
  ): ORTStage1Data => {
    const detailBox = record.detailBox ?? {};
    const sessionNumber = parseOrtSessionNumber(record.session);
    const statusRaw = (record.receivedStatus ?? "").toLowerCase();
    const received: "Yes" | "No" | "" =
      statusRaw === "received" || statusRaw === "yes"
        ? "Yes"
        : statusRaw === "not received" || statusRaw === "no"
          ? "No"
          : "";

    const partNumbers = Array.isArray(detailBox.partNumbers)
      ? detailBox.partNumbers.filter((value): value is string =>
        Boolean(value && value.trim()),
      )
      : [];

    const totalQuantity = Number(
      detailBox.totalQuantity ??
      record.allowedParts ??
      record.totalQty ??
      partNumbers.length ??
      0,
    );

    const mappedDetails = {
      totalQuantity,
      ticketCodeRaised: detailBox.ticketCodeRaised ?? record.ticketCode,
      dateShiftTime:
        detailBox.dateShiftTime ??
        (record.date ? new Date(record.date).toLocaleString() : "N/A"),
      project: detailBox.project ?? record.project ?? "N/A",
      batch: detailBox.batch ?? record.build ?? "N/A",
      color: detailBox.color ?? record.colour ?? "N/A",
      assemblyOQCAno: detailBox.assemblyOQCAno ?? record.processStage ?? "N/A",
      reason: detailBox.reason ?? record.reason ?? "N/A",
      oqcApprovedBy: detailBox.oqcApprovedBy,
      oqcApprovedAt: detailBox.oqcApprovedAt,
    };

    return {
      id: record.Id,
      ticketId: record.ticketId,
      ortRecordId: record.Id,
      scannedPartsId:
        typeof detailBox.scannedPartsId === "number"
          ? detailBox.scannedPartsId
          : undefined,
      ticketCode: record.ticketCode,
      sessionId: `${record.ticketId}-${sessionNumber}`,
      sessionNumber,
      partsBeingSent: Number(record.allowedParts ?? totalQuantity),
      received,
      date: record.date ? new Date(record.date).toISOString() : undefined,
      shiftTime: record.shiftTime ?? detailBox.dateShiftTime,
      detailsBox: mappedDetails,
      inventoryRemarks: record.inventoryRemarks ?? "",
      stage2Enabled:
        received === "Yes" &&
        (record.inventoryRemarks ?? "").trim() !== "" &&
        !detailBox.movedToStage2,
      status: record.receivedStatus ?? "Pending",
      movedToStage2: Boolean(detailBox.movedToStage2),
      movedToStage2At: detailBox.movedToStage2At,
      partNumbers,
      totalQuantity,
    };
  };

  // Function to load ORT Stage 1 data
  const loadORTStage1Data = async () => {
    try {
      const ortRecords = await apiService.getAllOrtRecords();
      if (!Array.isArray(ortRecords)) {
        setOrtStage1Data([]);
        return;
      }
      const mapped = ortRecords.map((record: BackendOrtRecord) =>
        mapOrtRecordToStage1Data(record),
      );
      setOrtStage1Data(mapped);
    } catch (error) {
      console.error("Error loading ORT Stage 1 data:", error);
      setOrtStage1Data([]);
    }
  };

  // Function to get not received sessions from ORT
  const getNotReceivedSessions = () => {
    return ortStage1Data.filter(
      (item) => item.received === "No" && item.status === "Not Received",
    );
  };

  const handleReUploadFromORT = async (ortSession: ORTStage1Data) => {
    try {
      // Keep the original ORT record as is (with "Not Received" status)
      // We'll create a new ORT record later when the re-scanned parts are submitted

      // Check if this ticket already exists in OQC
      const existingTicket = testRecords.find(
        (t) => t.ticketCode === ortSession.ticketCode,
      );

      let ticketToUse: TestRecord;
      const sameSessionNumber = ortSession.sessionNumber; // Use the SAME session number
      const originalStatus = ortSession.status || "Not Received";

      if (existingTicket) {
        // Check if session already exists with same number
        const existingSession = existingTicket.sessions.find(
          (session) => session.sessionNumber === sameSessionNumber,
        );

        if (existingSession) {
          // Update existing session
          const updatedSessions = existingTicket.sessions.map((session) =>
            session.sessionNumber === sameSessionNumber
              ? {
                ...session,
                parts: [], // Clear old parts for re-scanning
                submitted: false,
                submittedAt: undefined,
                sentToORT: false,
                isReuploaded: true, // Flag to track this is a re-upload
                originalOrtStatus: originalStatus,
                wasReupload: true,
              }
              : session,
          );

          const updatedTicket: TestRecord = {
            ...existingTicket,
            sessions: updatedSessions,
            status: "In-Progress",
          };

          setTestRecords((prev) =>
            prev.map((record) =>
              record.id === existingTicket.id ? updatedTicket : record,
            ),
          );
          ticketToUse = updatedTicket;
        } else {
          // Add new session with same session number
          const updatedTicket: TestRecord = {
            ...existingTicket,
            sessions: [
              ...existingTicket.sessions,
              {
                id: `reupload-${Date.now()}`,
                sessionNumber: sameSessionNumber,
                timestamp: new Date().toISOString(),
                parts: [],
                submitted: false,
                submittedAt: undefined,
                sentToORT: false,
                isReuploaded: true,
                originalOrtStatus: originalStatus,
                wasReupload: true,
              },
            ],
            status: "In-Progress",
          };

          setTestRecords((prev) =>
            prev.map((record) =>
              record.id === existingTicket.id ? updatedTicket : record,
            ),
          );
          ticketToUse = updatedTicket;
        }
      } else {
        // Create new ticket for re-upload
        const reasonMatch = ortSession.inventoryRemarks?.match(
          /Not Received - Reason: (.+)/,
        );
        const ortReason = reasonMatch
          ? reasonMatch[1].trim()
          : "Unknown reason";

        const newRecord: TestRecord = {
          id: Date.now(),
          ticketCode: ortSession.ticketCode,
          totalQuantity: ortSession.totalQuantity || ortSession.partsBeingSent,
          anoType: ortSession.detailsBox?.assemblyOQCAno || "N/A",
          source: "ORT Re-upload",
          reason: `Re-upload from ORT: ${ortReason}`,
          project: ortSession.detailsBox?.project || "N/A",
          build: ortSession.detailsBox?.batch || "N/A",
          colour: ortSession.detailsBox?.color || "N/A",
          dateTime: new Date().toISOString().split("T")[0],
          status: "In-Progress",
          sessions: [
            {
              id: `reupload-${Date.now()}`,
              sessionNumber: sameSessionNumber, // Same session number
              timestamp: new Date().toISOString(),
              parts: [],
              submitted: false,
              submittedAt: undefined,
              sentToORT: false,
              isReuploaded: true,
              originalOrtStatus: originalStatus,
              wasReupload: true,
            },
          ],
          createdAt: new Date().toISOString(),
          oqcApproved: false,
        };

        setTestRecords((prev) => [...prev, newRecord]);
        ticketToUse = newRecord;
      }

      setTempScannedParts([]);
      setBarcodeInput("");
      setSelectedTicket(ticketToUse);
      setIsScanModalOpen(true);
      setIsScanningActive(false); // Start with scanning stopped

      showNotification(
        "info",
        `Re-uploading Session ${sameSessionNumber} for ticket ${ortSession.ticketCode}. Same session number will be used.`,
      );
    } catch (error) {
      console.error("Error preparing ORT re-upload:", error);
      showNotification(
        "error",
        "Failed to prepare session for re-upload. Please try again.",
      );
    }
  };

  const showNotification = (
    type: "success" | "error" | "info",
    message: string,
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const getUniqueValues = (
    records: TestRecord[],
    key: keyof TestRecord,
  ): string[] => {
    const values = records
      .map((record) => record[key])
      .filter(Boolean) as string[];
    return ["All", ...Array.from(new Set(values))];
  };

  // Generate ticket code
  const generateTicketCode = (
    project: string,
    colour: string,
    anoType: string,
    reason: string,
    quantity: number,
  ) => {
    const projectCode = PROJECT_CODES[project.toUpperCase()] || "UNK";
    const colourCode = COLOUR_CODES[colour] || "UNK";
    const anoCode = ANO_TYPE_CODES[anoType.toUpperCase()] || "UNK";
    const reasonCode = REASON_CODES[reason] || "OTH";
    const quantityPadded = String(quantity).padStart(3, "0");

    let maxNumber = 0;
    testRecords.forEach((record) => {
      const match = record.ticketCode?.match(/^(\d+)_/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const sequenceNumber = String(maxNumber + 1).padStart(4, "0");
    return `${sequenceNumber}_${projectCode}_${colourCode}_${anoCode}_${reasonCode}_${quantityPadded}`;
  };

  // Update source options based on ANO type
  useEffect(() => {
    switch (formData.anoType) {
      case "ANO":
        setSourceOptions(excelDropdownData.SOURCE_OPTIONS_ANO);
        break;
      case "ASSEMBLY":
        setSourceOptions(excelDropdownData.SOURCE_OPTIONS_ASSEMBLY);
        break;
      case "OLEO":
        setSourceOptions(excelDropdownData.SOURCE_OPTIONS_OLEO);
        break;
      default:
        setSourceOptions([]);
    }
    if (formData.anoType) {
      setFormData((prev) => ({ ...prev, source: "", otherSource: "" }));
    }
  }, [formData.anoType, excelDropdownData]);

  useEffect(() => {
    setShowOtherSource(formData.source === "Other");
    if (formData.source !== "Other") {
      setFormData((prev) => ({ ...prev, otherSource: "" }));
    }
  }, [formData.source]);

  useEffect(() => {
    setShowOtherReason(formData.reason === "Other");
    if (formData.reason !== "Other") {
      setFormData((prev) => ({ ...prev, otherReason: "" }));
    }
  }, [formData.reason]);

  useEffect(() => {
    if (
      formData.project &&
      formData.colour &&
      formData.anoType &&
      formData.reason &&
      formData.totalQuantity > 0
    ) {
      const newCode = generateTicketCode(
        formData.project,
        formData.colour,
        formData.anoType,
        formData.reason,
        formData.totalQuantity,
      );
      setFormData((prev) => ({ ...prev, ticketCode: newCode }));
    }
  }, [
    formData.project,
    formData.colour,
    formData.anoType,
    formData.reason,
    formData.totalQuantity,
    testRecords,
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "totalQuantity") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? 0 : parseInt(value, 10),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ticketCode || !formData.ticketCode.includes("_")) {
      showNotification(
        "error",
        "Please fill all required fields to generate ticket code",
      );
      return;
    }

    const finalSource =
      formData.source === "Other" ? formData.otherSource : formData.source;
    const finalReason =
      formData.reason === "Other" ? formData.otherReason : formData.reason;

    // Validation
    if (
      !formData.ticketCode ||
      !formData.totalQuantity ||
      !formData.anoType ||
      !formData.source ||
      !formData.reason ||
      !formData.project ||
      !formData.build ||
      !formData.colour ||
      !formData.dateTime
    ) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    if (formData.source === "Other" && !formData.otherSource.trim()) {
      showNotification(
        "error",
        "Please specify the source when Other is selected",
      );
      return;
    }

    if (formData.reason === "Other" && !formData.otherReason.trim()) {
      showNotification(
        "error",
        "Please specify the reason when Other is selected",
      );
      return;
    }

    // Check for existing ticket in local state (optional - you might want to check with backend instead)
    const existingTicket = testRecords.find(
      (record) => record.ticketCode === formData.ticketCode,
    );
    if (existingTicket) {
      showNotification(
        "error",
        "Ticket code already exists. Please check your inputs.",
      );
      return;
    }

    try {
      // Prepare data for backend API
      const backendFormData = {
        ticketCode: formData.ticketCode,
        totalQty: formData.totalQuantity,
        processStage: formData.anoType, // Assuming anoType maps to processStage
        source: finalSource,
        project: formData.project,
        build: formData.build,
        colour: formData.colour,
        location: "default",
        reason: finalReason,
        // date is handled by backend
      };

      // Call backend API
      const response = await apiService.createOqcForm(backendFormData);
      const createdTicket = response?.newOqcForm;

      if (!createdTicket || (!createdTicket.Id && !createdTicket.id)) {
        throw new Error("Invalid response from createOqcForm API");
      }

      const ticketId = createdTicket.Id ?? createdTicket.id;

      // Create local record for UI (still needed for local state management)
      const newRecord: TestRecord = {
        id: ticketId,
        ticketCode: createdTicket.ticketCode ?? formData.ticketCode,
        totalQuantity: createdTicket.totalQty ?? formData.totalQuantity,
        anoType: createdTicket.processStage ?? formData.anoType,
        source: createdTicket.source ?? finalSource,
        reason: createdTicket.reason ?? finalReason,
        project: createdTicket.project ?? formData.project,
        build: createdTicket.build ?? formData.build,
        colour: createdTicket.colour ?? formData.colour,
        dateTime: createdTicket.date
          ? new Date(createdTicket.date).toISOString().split("T")[0]
          : formData.dateTime,
        status: "In-Progress",
        sessions: [],
        createdAt: createdTicket.CreatedAt
          ? new Date(createdTicket.CreatedAt).toISOString()
          : createdTicket.createdAt
            ? new Date(createdTicket.createdAt).toISOString()
            : new Date().toISOString(),
        oqcApproved: false,
      };

      // Update local state
      const updatedRecords = [...testRecords, newRecord];
      setTestRecords(updatedRecords);

      // Reset form and close modal
      setFormData({
        ticketCode: "",
        totalQuantity: 0,
        anoType: "",
        source: "",
        otherSource: "",
        reason: "",
        otherReason: "",
        project: "",
        build: "",
        colour: "",
        dateTime: new Date().toISOString().split("T")[0],
        status: "In-Progress",
      });
      setShowOtherSource(false);
      setShowOtherReason(false);
      setSourceOptions([]);
      setIsCreateModalOpen(false);

      showNotification(
        "success",
        `Ticket ${newRecord.ticketCode} created successfully in database!`,
      );
    } catch (error) {
      console.error("Error creating ticket:", error);
      showNotification("error", "Failed to create ticket. Please try again.");
    }
  };

  // Start/Stop scanning function
  const toggleScanning = () => {
    if (!isScanningActive) {
      // Start scanning
      setIsScanningActive(true);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      showNotification("info", "Scanning started. Focus is on barcode input.");
    } else {
      // Stop scanning
      setIsScanningActive(false);
      showNotification("info", "Scanning stopped.");
    }
  };

  // Handle barcode scanning in auto mode
  const handleAutoScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedTicket) {
      e.preventDefault();
      const barcodeData = barcodeInput.trim();
      if (barcodeData) {
        processBarcode(barcodeData);
        setBarcodeInput("");

        // Auto-focus back to input for continuous scanning
        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      }
    }
  };

  // Handle input change
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);
  };

  const processBarcode = (data: string) => {
    if (!selectedTicket) return;

    const totalScannedInSession = tempScannedParts.length;
    const totalScannedOverall = selectedTicket.sessions.reduce(
      (sum, session) => sum + session.parts.length,
      0,
    );
    const totalScanned = totalScannedInSession + totalScannedOverall;

    if (totalScanned >= selectedTicket.totalQuantity) {
      showNotification(
        "error",
        `All ${selectedTicket.totalQuantity} parts have been scanned`,
      );
      return;
    }

    const barcodeData = data.trim();

    // Check for duplicates in current session
    const duplicateInSession = tempScannedParts.find(
      (p) => p.partNumber === barcodeData,
    );
    if (duplicateInSession) {
      showNotification(
        "error",
        `Duplicate barcode in current session: ${barcodeData}`,
      );
      return;
    }

    // Check for duplicates in all sessions of this ticket
    const duplicateInAllSessions = selectedTicket.sessions.some((session) =>
      session.parts.some((part) => part.partNumber === barcodeData),
    );
    if (duplicateInAllSessions) {
      showNotification("error", `Duplicate barcode in ticket: ${barcodeData}`);
      return;
    }

    const newPart: TempScannedPart = {
      partNumber: barcodeData, // Store barcode directly as partNumber
      scanStatus: null,
    };

    setTempScannedParts((prev) => [...prev, newPart]);
    showNotification(
      "success",
      `Barcode scanned: ${barcodeData}. Please select status.`,
    );

    // Keep focus on input
    setTimeout(() => {
      if (isScanningActive && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  // Bulk status selection functions
  const handleSelectAllCosmeticOK = () => {
    if (tempScannedParts.length === 0) {
      showNotification("error", "No parts to update");
      return;
    }

    setTempScannedParts((prev) =>
      prev.map((part) => ({
        ...part,
        scanStatus: "Cosmetic OK",
      })),
    );
    showNotification(
      "success",
      `All ${tempScannedParts.length} parts marked as Cosmetic OK`,
    );
  };

  const handleSelectAllCosmeticNotOK = () => {
    if (tempScannedParts.length === 0) {
      showNotification("error", "No parts to update");
      return;
    }

    setTempScannedParts((prev) =>
      prev.map((part) => ({
        ...part,
        scanStatus: "Cosmetic Not OK",
      })),
    );
    showNotification(
      "success",
      `All ${tempScannedParts.length} parts marked as Cosmetic Not OK`,
    );
  };

  const handleClearAllSelection = () => {
    if (tempScannedParts.length === 0) {
      showNotification("error", "No parts to clear");
      return;
    }

    setTempScannedParts((prev) =>
      prev.map((part) => ({
        ...part,
        scanStatus: null,
      })),
    );
    showNotification(
      "success",
      `Status cleared for all ${tempScannedParts.length} parts`,
    );
  };

  const handleStatusChange = (
    index: number,
    status: "Cosmetic OK" | "Cosmetic Not OK",
  ) => {
    setTempScannedParts((prev) =>
      prev.map((part, i) =>
        i === index ? { ...part, scanStatus: status } : part,
      ),
    );
  };

  const handleSaveSession = async () => {
    if (!selectedTicket || tempScannedParts.length === 0) return;

    const partsWithoutStatus = tempScannedParts.filter((p) => !p.scanStatus);
    if (partsWithoutStatus.length > 0) {
      showNotification(
        "error",
        `Please select status for ${partsWithoutStatus.length} part(s)`,
      );
      return;
    }

    const ticketId = Number(selectedTicket.id);
    if (Number.isNaN(ticketId)) {
      showNotification(
        "error",
        "Ticket is missing a valid database ID. Please refresh tickets and try again.",
      );
      return;
    }

    setIsSaving(true);

    try {
      // Get session number (reuse original for re-uploads)
      const currentSession = selectedTicket.sessions.find(
        (s) => s.isReuploaded && s.parts.length === 0,
      );
      const sessionNumber = currentSession
        ? currentSession.sessionNumber
        : selectedTicket.sessions.length + 1;

      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestampNow = new Date().toISOString();

      const newSession: ScanSession = {
        id: sessionId,
        sessionNumber,
        timestamp: timestampNow,
        parts: tempScannedParts.map((part, idx) => ({
          id: `part-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          partNumber: part.partNumber, // Store scanned barcode as partNumber
          scanStatus: part.scanStatus!,
          scannedAt: timestampNow,
          location: "home",
        })),
        submitted: true,
        submittedAt: timestampNow,
        sentToORT: false,
        isReuploaded: false,
        originalOrtStatus: currentSession?.originalOrtStatus,
        wasReupload: Boolean(currentSession),
      };

      // Save to backend database
      const scannedPartsData = {
        ticketId,
        ticketCode: selectedTicket.ticketCode,
        parts: tempScannedParts.map((part) => ({
          part: part.partNumber, // Save barcode as part
          status: part.scanStatus,
          scannedAt: timestampNow,
        })),
        session: sessionNumber,
        ortReceivedStatus: "Pending",
        isReupload: Boolean(currentSession),
        previousOrtStatus: currentSession?.originalOrtStatus,
      };

      // Call backend API to save scanned parts
      const backendResponse =
        await apiService.createScannedParts(scannedPartsData);
      console.log("Scanned parts saved to backend:", backendResponse);

      // Update local state
      const updatedRecords = testRecords.map((record) => {
        if (record.id === selectedTicket.id) {
          let updatedSessions: ScanSession[];

          if (currentSession) {
            // Replace the re-upload placeholder session with actual scanned session
            updatedSessions = record.sessions
              .map((session) =>
                session.isReuploaded &&
                  session.sessionNumber === sessionNumber &&
                  session.parts.length === 0
                  ? newSession
                  : session,
              )
              .filter(
                (session) =>
                  !(
                    session.isReuploaded &&
                    session.sessionNumber === sessionNumber &&
                    session.parts.length === 0
                  ),
              );
          } else {
            updatedSessions = [...record.sessions, newSession];
          }

          const totalScanned = updatedSessions.reduce(
            (sum, session) => sum + session.parts.length,
            0,
          );

          return {
            ...record,
            sessions: updatedSessions,
            status: totalScanned > 0 ? "Ready for OQC Approval" : record.status,
          };
        }
        return record;
      });

      setTestRecords(updatedRecords);

      const refreshedTicket =
        updatedRecords.find((record) => record.id === selectedTicket.id) ||
        null;
      if (refreshedTicket) {
        setSelectedTicket(refreshedTicket);
      }

      const notificationPrefix = currentSession
        ? "Re-uploaded session"
        : "Session";
      showNotification(
        "success",
        `${notificationPrefix} ${sessionNumber} saved with ${tempScannedParts.length} parts!`,
      );

      // Clear temporary data
      setTempScannedParts([]);
      setIsSaving(false);
      setIsScanModalOpen(false);
      setIsScanningActive(false); // Reset scanning state

      // Navigate to ORT Lab page after a short delay
      // setTimeout(() => {
      //   navigate("/ort-lab-form");
      // }, 1500);
    } catch (error) {
      console.error("Error saving scanned parts to backend:", error);
      showNotification(
        "error",
        "Failed to save scanned parts to database. Please try again.",
      );
      setIsSaving(false);
    }
  };

  const handleStartScanning = (ticket: TestRecord) => {
    setSelectedTicket(ticket);
    setTempScannedParts([]);
    setBarcodeInput("");
    setIsScanModalOpen(true);
    setIsScanningActive(true); // Start with scanning stopped
  };

  useEffect(() => {
    if (isScanModalOpen && isScanningActive && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isScanModalOpen, isScanningActive]);

  const toggleTicketExpand = (ticketCode: string) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketCode]: !prev[ticketCode],
    }));
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const handleUpdateLocation = (
    ticketId: number,
    sessionId: string,
    partId: string,
    newLocation: string,
  ) => {
    const updatedRecords = testRecords.map((record) => {
      if (record.id === ticketId) {
        return {
          ...record,
          sessions: record.sessions.map((session) => {
            if (session.id === sessionId) {
              return {
                ...session,
                parts: session.parts.map((part) =>
                  part.id === partId
                    ? { ...part, location: newLocation }
                    : part,
                ),
              };
            }
            return session;
          }),
        };
      }
      return record;
    });
    setTestRecords(updatedRecords);
    setEditingLocation(null);
    showNotification("success", "Location updated successfully");
  };

  const handleOQCApproval = (ticketId: number) => {
    if (!oqcApprover.trim()) {
      showNotification("error", "Please enter your name for OQC approval");
      return;
    }

    const updatedRecords = testRecords.map((record) => {
      if (record.id === ticketId) {
        const allSessionsSubmitted = record.sessions.every(
          (session) => session.submitted,
        );
        if (!allSessionsSubmitted) {
          showNotification(
            "error",
            "All sessions must be submitted before OQC approval",
          );
          return record;
        }

        return {
          ...record,
          oqcApproved: true,
          oqcApprovedAt: new Date().toISOString(),
          oqcApprovedBy: oqcApprover,
          status: "OQC Approved",
        };
      }
      return record;
    });

    setTestRecords(updatedRecords);
    setShowOQCApproval(null);
    setOqcApprover("");
    showNotification("success", "Ticket approved by OQC successfully!");
  };

  const handleSubmitToORTLab = (
    ticketId: number,
    sessionId: string,
    ticketCode: string,
  ) => {
    const ticket = testRecords.find((t) => t.id === ticketId);
    const session = ticket?.sessions.find((s) => s.id === sessionId);

    if (!ticket || !session) {
      showNotification("error", "Ticket or session not found");
      return;
    }

    if (!ticket.oqcApproved) {
      showNotification(
        "error",
        "Ticket must be OQC approved before sending to ORT Lab",
      );
      return;
    }

    if (!session.submitted) {
      showNotification(
        "error",
        "Session must be submitted before sending to ORT Lab",
      );
      return;
    }

    const ortLabData = {
      ticketId,
      ticketCode,
      sessionId,
      sessionNumber: session.sessionNumber,
      timestamp: new Date().toISOString(),
      parts: session.parts,
      project: ticket.project,
      build: ticket.build,
      colour: ticket.colour,
      anoType: ticket.anoType,
      source: ticket.source,
      reason: ticket.reason,
      oqcApprovedBy: ticket.oqcApprovedBy,
      oqcApprovedAt: ticket.oqcApprovedAt,
      submittedAt: session.submittedAt,
      totalParts: session.parts.length,
      partNumbers: session.parts.map((p) => p.partNumber),
      rawBarcodeData: session.parts.map((p) => p.partNumber).join("; "),
      submitted: true,
      totalQuantity: ticket.totalQuantity,
    };

    const existingSubmissions = JSON.parse(
      localStorage.getItem("ort_lab_submissions") || "[]",
    );
    const existingSubmissionIndex = existingSubmissions.findIndex(
      (sub: any) => sub.id === sessionId,
    );

    if (existingSubmissionIndex >= 0) {
      existingSubmissions[existingSubmissionIndex] = ortLabData;
    } else {
      existingSubmissions.push(ortLabData);
    }

    localStorage.setItem(
      "ort_lab_submissions",
      JSON.stringify(existingSubmissions),
    );

    const updatedRecords = testRecords.map((record) => {
      if (record.id === ticketId) {
        return {
          ...record,
          sessions: record.sessions.map((s) => {
            if (s.id === sessionId) {
              return {
                ...s,
                sentToORT: true,
                sentToORTAt: new Date().toISOString(),
              };
            }
            return s;
          }),
        };
      }
      return record;
    });

    setTestRecords(updatedRecords);
    navigate("/ort-lab-form");
  };

  const getStatusIcon = (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => {
    switch (status) {
      case "Cosmetic OK":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Cosmetic Not OK":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => {
    switch (status) {
      case "Cosmetic OK":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cosmetic Not OK":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };


  const filteredRecords = testRecords.filter((record) => {
    const matchesSearch =
      record.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.sessions.some((session) =>
        session.parts.some((part) =>
          part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );

    const recordDate = new Date(record.dateTime);
    let matchesDate = true;

    if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      if (recordDate < startDate) {
        matchesDate = false;
      }
    }

    if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);
      if (recordDate > endDate) {
        matchesDate = false;
      }
    }

    const matchesProject =
      projectFilter === "All" || record.project === projectFilter;
    const matchesBuild = buildFilter === "All" || record.build === buildFilter;
    const matchesColour =
      colourFilter === "All" || record.colour === colourFilter;
    const matchesReason =
      reasonFilter === "All" || record.reason === reasonFilter;

    return (
      matchesSearch &&
      matchesDate &&
      matchesProject &&
      matchesBuild &&
      matchesColour &&
      matchesReason
    );
  });

  const clearLocalStorage = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone.",
      )
    ) {
      // localStorage.removeItem(STORAGE_KEY);
      setTestRecords([]);
      showNotification("success", "All data cleared from localStorage");
    }
  };

  const refreshORTData = async () => {
    await loadORTStage1Data();
    showNotification("success", "ORT data refreshed");
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStartDateFilter("");
    setEndDateFilter("");
    setProjectFilter("All");
    setBuildFilter("All");
    setColourFilter("All");
    setReasonFilter("All");
    setExpandedTickets({});
    setExpandedSessions({});
  };

  // Group tickets by date (newest vs older)
  const groupTickets = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const newestTickets = filteredRecords
      .filter((ticket) => new Date(ticket.createdAt) > oneDayAgo)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const olderTickets = filteredRecords
      .filter((ticket) => new Date(ticket.createdAt) <= oneDayAgo)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return { newestTickets, olderTickets };
  };

  const { newestTickets, olderTickets } = groupTickets();
  const uniqueProjects = getUniqueValues(testRecords, "project");
  const uniqueBuilds = getUniqueValues(testRecords, "build");
  const uniqueColours = getUniqueValues(testRecords, "colour");
  const uniqueReasons = getUniqueValues(testRecords, "reason");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === "success"
            ? "bg-green-500"
            : notification.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
            } text-white animate-in fade-in slide-in-from-top-5`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : notification.type === "error" ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              OQC Ticket Management
            </h1>
            <p className="text-gray-600">
              Manage quality control tickets and scanning sessions
            </p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogDescription>
                  Fill in all required fields to generate a new OQC ticket
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitForm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ticket Code */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Ticket Code <span className="text-red-600">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (Auto-generated)
                      </span>
                    </Label>
                    <Input
                      type="text"
                      value={formData.ticketCode}
                      readOnly
                      className="bg-gray-50 font-mono"
                      placeholder="Fill all fields to generate code"
                    />
                  </div>

                  {/* Total Quantity */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Total Quantity <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      name="totalQuantity"
                      value={formData.totalQuantity || ""}
                      onChange={handleInputChange}
                      placeholder="Enter total quantity"
                      required
                      min="1"
                    />
                  </div>

                  {/* ANO/ASSEMBLY/OLEO - FROM EXCEL */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      ANO/ASSEMBLY/OLEO <span className="text-red-600">*</span>
                    </Label>
                    <select
                      name="anoType"
                      value={formData.anoType}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                      required
                    >
                      <option value="">-- Select Type --</option>
                      {excelDropdownData.ASSEMBLY_ANO_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source - FROM EXCEL (Dynamic based on ANO type) */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Source <span className="text-red-600">*</span>
                    </Label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                      required
                      disabled={!formData.anoType}
                    >
                      <option value="">-- Select Source --</option>
                      {sourceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {showOtherSource && (
                      <Input
                        type="text"
                        name="otherSource"
                        value={formData.otherSource}
                        onChange={handleInputChange}
                        placeholder="Please specify source"
                        required
                      />
                    )}
                  </div>

                  {/* Project - FROM EXCEL */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Project <span className="text-red-600">*</span>
                    </Label>
                    <select
                      name="project"
                      value={formData.project}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                      required
                    >
                      <option value="">-- Select Project --</option>
                      {excelDropdownData.PROJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Build */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Build <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="build"
                      value={formData.build}
                      onChange={handleInputChange}
                      placeholder="Enter build"
                      required
                    />
                  </div>

                  {/* Colour - FROM EXCEL */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Colour <span className="text-red-600">*</span>
                    </Label>
                    <select
                      name="colour"
                      value={formData.colour}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                      required
                    >
                      <option value="">-- Select Colour --</option>
                      {excelDropdownData.COLOUR_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label className="font-bold uppercase">
                      Date <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="date"
                      name="dateTime"
                      value={formData.dateTime}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  {/* Reason - FROM EXCEL */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold uppercase">
                      Reason <span className="text-red-600">*</span>
                    </Label>
                    <select
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                      required
                    >
                      <option value="">-- Select Reason --</option>
                      {excelDropdownData.REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {showOtherReason && (
                      <Textarea
                        name="otherReason"
                        value={formData.otherReason}
                        onChange={handleInputChange}
                        placeholder="Please specify the reason"
                        className="min-h-[100px]"
                        required
                      />
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white">
                    <Check className="w-5 h-5 mr-2" />
                    Create Ticket
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter tickets by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search field */}
            <div className="space-y-2">
              <Label htmlFor="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Tickets
              </Label>
              <Input
                id="search"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label
                htmlFor="projectFilter"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Project
              </Label>
              <select
                id="projectFilter"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
              >
                {uniqueProjects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>

            {/* Build Filter */}
            <div className="space-y-2">
              <Label htmlFor="buildFilter" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Build
              </Label>
              <select
                id="buildFilter"
                value={buildFilter}
                onChange={(e) => setBuildFilter(e.target.value)}
                className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
              >
                {uniqueBuilds.map((build) => (
                  <option key={build} value={build}>
                    {build}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colourFilter" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Colour
              </Label>
              <div className="flex gap-2">
                <select
                  id="colourFilter"
                  value={colourFilter}
                  onChange={(e) => setColourFilter(e.target.value)}
                  className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                >
                  {uniqueColours.map((colour) => (
                    <option key={colour} value={colour}>
                      {colour}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonFilter" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Reason
              </Label>
              <div className="flex gap-2">
                <select
                  id="reasonFilter"
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="w-full h-10 px-3 border-2 border-gray-300 rounded-md"
                >
                  {uniqueReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                min={startDateFilter}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="w-full"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredRecords.length} of {testRecords.length} tickets
                {(projectFilter !== "All" ||
                  buildFilter !== "All" ||
                  colourFilter !== "All" ||
                  reasonFilter !== "All") && (
                    <span className="ml-2">
                      • Filtered by:
                      {projectFilter !== "All" && (
                        <span className="ml-1 font-medium">{projectFilter}</span>
                      )}
                      {buildFilter !== "All" && (
                        <span className="ml-1 font-medium">{buildFilter}</span>
                      )}
                      {colourFilter !== "All" && (
                        <span className="ml-1 font-medium">{colourFilter}</span>
                      )}
                      {reasonFilter !== "All" && (
                        <span className="ml-1 font-medium">{reasonFilter}</span>
                      )}
                    </span>
                  )}
              </div>
              {/* <div className="flex items-center gap-2">
                {testRecords.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLocalStorage}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                )}
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Listing Section */}
      <div className="space-y-6">
        {/* Newest Tickets Section */}
        {newestTickets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm">
                Newest
              </Badge>
              <h2 className="text-lg font-semibold text-gray-900">
                Recently Created Tickets
              </h2>
            </div>
            <div className="space-y-4">
              {newestTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  expandedTickets={expandedTickets}
                  expandedSessions={expandedSessions}
                  showOQCApproval={showOQCApproval}
                  oqcApprover={oqcApprover}
                  editingLocation={editingLocation}
                  editLocationValue={editLocationValue}
                  ortStage1Data={ortStage1Data}
                  onToggleTicketExpand={toggleTicketExpand}
                  onToggleSessionExpand={toggleSessionExpand}
                  onStartScanning={handleStartScanning}
                  onOQCApproval={handleOQCApproval}
                  onUpdateLocation={handleUpdateLocation}
                  onSetShowOQCApproval={setShowOQCApproval}
                  onSetOqcApprover={setOqcApprover}
                  onSetEditingLocation={setEditingLocation}
                  onSetEditLocationValue={setEditLocationValue}
                  onSubmitToORTLab={handleSubmitToORTLab}
                  onReUploadFromORT={handleReUploadFromORT}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* Older Tickets Section */}
        {olderTickets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-sm">
                <Clock className="h-3 w-3 mr-1" />
                Older Tickets
              </Badge>
              <h2 className="text-lg font-semibold text-gray-900">
                Previous Tickets
              </h2>
            </div>
            <div className="space-y-4">
              {olderTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  expandedTickets={expandedTickets}
                  expandedSessions={expandedSessions}
                  showOQCApproval={showOQCApproval}
                  oqcApprover={oqcApprover}
                  editingLocation={editingLocation}
                  editLocationValue={editLocationValue}
                  ortStage1Data={ortStage1Data}
                  onToggleTicketExpand={toggleTicketExpand}
                  onToggleSessionExpand={toggleSessionExpand}
                  onStartScanning={handleStartScanning}
                  onOQCApproval={handleOQCApproval}
                  onUpdateLocation={handleUpdateLocation}
                  onSetShowOQCApproval={setShowOQCApproval}
                  onSetOqcApprover={setOqcApprover}
                  onSetEditingLocation={setEditingLocation}
                  onSetEditLocationValue={setEditLocationValue}
                  onSubmitToORTLab={handleSubmitToORTLab}
                  onReUploadFromORT={handleReUploadFromORT}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Tickets Message */}
        {filteredRecords.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-500 mb-4">
                {testRecords.length === 0
                  ? "Create your first ticket to get started"
                  : "No tickets match the current filters"}
              </p>
              {testRecords.length > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scan Parts Modal */}
      <Dialog
        open={isScanModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsScanningActive(false); // Stop scanning when modal closes
          }
          setIsScanModalOpen(open);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Scan Parts for {selectedTicket?.ticketCode}
            </DialogTitle>
            <DialogDescription>
              Scan barcodes and select cosmetic status for each part
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-blue-700">
                        Ticket Code
                      </div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        <Ticket className="h-4 w-4" />
                        {selectedTicket.ticketCode}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-700">
                        Required
                      </div>
                      <div className="font-bold text-lg">
                        {selectedTicket.totalQuantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-700">
                        Scanned
                      </div>
                      <div className="font-bold text-lg text-green-600">
                        {selectedTicket.sessions.reduce(
                          (sum, session) => sum + session.parts.length,
                          0,
                        ) + tempScannedParts.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-700">
                        Remaining
                      </div>
                      <div
                        className={`font-bold text-lg ${selectedTicket.totalQuantity - (selectedTicket.sessions.reduce((sum, session) => sum + session.parts.length, 0) + tempScannedParts.length) > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {Math.max(
                          0,
                          selectedTicket.totalQuantity -
                          (selectedTicket.sessions.reduce(
                            (sum, session) => sum + session.parts.length,
                            0,
                          ) +
                            tempScannedParts.length),
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show current sessions status */}
                  {selectedTicket.sessions.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">
                        Current Sessions Status:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.sessions.map((session) => (
                          <Badge
                            key={session.id}
                            variant={session.submitted ? "default" : "outline"}
                            className={
                              session.submitted
                                ? "bg-green-600"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            Session {session.sessionNumber}:{" "}
                            {session.parts.length} parts
                            {session.submitted ? " ✓ Submitted" : " ⏳ Pending"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scanner Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Start/Stop Scanner Button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          Scanner Control
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isScanningActive
                            ? "Scanner is active - scan barcodes continuously"
                            : "Click Start to begin continuous scanning"}
                        </p>
                      </div>
                      <Button
                        onClick={toggleScanning}
                        className={`${isScanningActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-medium px-6 py-3`}
                        size="lg"
                      >
                        {isScanningActive ? (
                          <>
                            <Square className="mr-2 h-5 w-5" />
                            Stop Scanning
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-5 w-5" />
                            Start Scanning
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Bulk Action Buttons */}
                    {tempScannedParts.length > 0 && (
                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-lg mb-4">
                          Bulk Actions
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={handleSelectAllCosmeticOK}
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            All Cosmetic OK
                          </Button>
                          <Button
                            onClick={handleSelectAllCosmeticNotOK}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            All Cosmetic Not OK
                          </Button>
                          <Button
                            onClick={handleClearAllSelection}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            Clear Selection
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Quickly apply cosmetic status to all scanned barcodes
                        </p>
                      </div>
                    )}

                    {/* Scanner Input */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="barcodeInput"
                          className="text-base font-medium flex items-center gap-2"
                        >
                          {isScanningActive ? (
                            <Zap className="h-4 w-4 text-green-600 animate-pulse" />
                          ) : (
                            <ZapOff className="h-4 w-4 text-gray-400" />
                          )}
                          Scanner Input <span className="text-red-600">*</span>
                          {isScanningActive && (
                            <Badge className="ml-2 bg-green-100 text-green-800 text-xs animate-pulse">
                              Active - Keep cursor in this box
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="barcodeInput"
                          ref={inputRef}
                          value={barcodeInput}
                          onChange={handleBarcodeInputChange}
                          onKeyDown={handleAutoScan}
                          placeholder={
                            isScanningActive
                              ? "Keep cursor here and scan barcodes (Press Enter after each scan)"
                              : "Click 'Start Scanning' to begin"
                          }
                          className="h-12 font-mono text-lg border-2 border-blue-300 focus:border-green-500"
                          disabled={!isScanningActive}
                          autoComplete="off"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {isScanningActive
                              ? "Keep your cursor in this box and scan barcodes. Press Enter after each scan."
                              : "Scan barcodes directly - no input box needed"}
                          </p>
                          {isScanningActive && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-xs text-green-600 font-medium">
                                Ready to scan
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scanned Parts List */}
              {tempScannedParts.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-700">
                          Scanned Barcodes ({tempScannedParts.length})
                        </h3>
                        <p className="text-sm text-gray-500">
                          Select cosmetic status for each scanned barcode
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {
                            tempScannedParts.filter(
                              (p) => p.scanStatus === "Cosmetic OK",
                            ).length
                          }{" "}
                          OK
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {
                            tempScannedParts.filter(
                              (p) => p.scanStatus === "Cosmetic Not OK",
                            ).length
                          }{" "}
                          Not OK
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {tempScannedParts.filter((p) => !p.scanStatus).length}{" "}
                          Pending
                        </Badge>
                       <Button
  variant="ghost"
  size="sm"
  onClick={() => {
    setTempScannedParts([]);
    toast({
      variant: "destructive",
      title: "Cleared",
      description: "All scanned barcodes have been removed.",
      duration: 3000,
    });
  }}
  className="text-red-500 hover:text-red-700"
>
  <Trash2 className="mr-2 h-4 w-4" />
  Clear All
</Button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {tempScannedParts.map((part, index) => (
                        <div
                          key={`temp-${index}`}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="font-medium flex items-center gap-2 mb-2">
                                <Barcode className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="text-blue-600">
                                  #{index + 1}
                                </span>
                                <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded">
                                  {part.partNumber}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Scanned at: {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getStatusColor(part.scanStatus)} flex-shrink-0`}
                              >
                                {getStatusIcon(part.scanStatus)}
                                <span className="ml-1">
                                  {part.scanStatus || "Pending"}
                                </span>
                              </Badge>
                              {/* DELETE BUTTON FOR EACH PART */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTempScannedParts((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  );
                                  showNotification(
                                    "info",
                                    `Barcode ${part.partNumber} removed`,
                                  );
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Select Cosmetic Status:
                            </Label>
                            <RadioGroup
                              value={part.scanStatus || ""}
                              onValueChange={(
                                value: "Cosmetic OK" | "Cosmetic Not OK",
                              ) => handleStatusChange(index, value)}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Cosmetic OK"
                                  id={`cosmeticok-${index}`}
                                />
                                <Label
                                  htmlFor={`cosmeticok-${index}`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  Cosmetic OK
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Cosmetic Not OK"
                                  id={`cosmeticnotok-${index}`}
                                />
                                <Label
                                  htmlFor={`cosmeticnotok-${index}`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  Cosmetic Not OK
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t mt-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            {
                              tempScannedParts.filter((p) => !p.scanStatus)
                                .length
                            }{" "}
                            barcode(s) need status selection
                          </p>
                          <p className="text-sm font-medium mt-1">
                            Total scanned: {tempScannedParts.length} /{" "}
                            {selectedTicket.totalQuantity}
                          </p>
                        </div>
                        <Button
                          onClick={handleSaveSession}
                          disabled={
                            isSaving ||
                            tempScannedParts.length === 0 ||
                            tempScannedParts.some((p) => !p.scanStatus)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 text-base font-medium"
                          size="lg"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-5 w-5" />
                              Save Session ({tempScannedParts.length} barcodes)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Ticket Card Component (Extracted for readability)
interface TicketCardProps {
  ticket: TestRecord;
  expandedTickets: { [key: string]: boolean };
  expandedSessions: { [key: string]: boolean };
  showOQCApproval: number | null;
  oqcApprover: string;
  editingLocation: string | null;
  editLocationValue: string;
  ortStage1Data: ORTStage1Data[];
  onToggleTicketExpand: (ticketCode: string) => void;
  onToggleSessionExpand: (sessionId: string) => void;
  onStartScanning: (ticket: TestRecord) => void;
  onOQCApproval: (ticketId: number) => void;
  onUpdateLocation: (
    ticketId: number,
    sessionId: string,
    partId: string,
    newLocation: string,
  ) => void;
  onSetShowOQCApproval: (id: number | null) => void;
  onSetOqcApprover: (name: string) => void;
  onSetEditingLocation: (id: string | null) => void;
  onSetEditLocationValue: (value: string) => void;
  onSubmitToORTLab: (
    ticketId: number,
    sessionId: string,
    ticketCode: string,
  ) => void;
  onReUploadFromORT: (ortSession: ORTStage1Data) => void | Promise<void>;
  getStatusColor: (status: "Cosmetic OK" | "Cosmetic Not OK" | null) => string;
  getStatusIcon: (
    status: "Cosmetic OK" | "Cosmetic Not OK" | null,
  ) => React.ReactNode;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  expandedTickets,
  expandedSessions,
  showOQCApproval,
  oqcApprover,
  editingLocation,
  editLocationValue,
  ortStage1Data,
  onToggleTicketExpand,
  onToggleSessionExpand,
  onStartScanning,
  onOQCApproval,
  onUpdateLocation,
  onSetShowOQCApproval,
  onSetOqcApprover,
  onSetEditingLocation,
  onSetEditLocationValue,
  onSubmitToORTLab,
  onReUploadFromORT,
  getStatusColor,
  getStatusIcon,
}) => {
  const totalScanned = ticket.sessions.reduce(
    (sum, session) => sum + session.parts.length,
    0,
  );
  const okCount = ticket.sessions.reduce(
    (sum, session) =>
      sum + session.parts.filter((p) => p.scanStatus === "Cosmetic OK").length,
    0,
  );
  const cosmeticCount = ticket.sessions.reduce(
    (sum, session) =>
      sum +
      session.parts.filter((p) => p.scanStatus === "Cosmetic Not OK").length,
    0,
  );
  const isExpanded = expandedTickets[ticket.ticketCode];

  // Check if any session is marked as "Not Received" in ORT
  const ortStatusMap: Record<string, ORTStage1Data | undefined> = {};
  ortStage1Data.forEach((stageSession) => {
    if (stageSession.received === "No") {
      const key = `${stageSession.ticketCode}-${stageSession.sessionNumber}`;
      const hasCompletedReupload = ticket.sessions.some(
        (localSession) =>
          localSession.sessionNumber === stageSession.sessionNumber &&
          localSession.wasReupload &&
          localSession.parts.length > 0 &&
          localSession.submitted,
      );

      if (!hasCompletedReupload) {
        ortStatusMap[key] = stageSession;
      }
    }
  });

  return (
    <Card className="border-2">
      <CardContent className="p-0">
        {/* Main Ticket Row */}
        <div className="p-4 bg-gray-50 border-b-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleTicketExpand(ticket.ticketCode)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-blue-600" />
                  {ticket.ticketCode}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {ticket.project} • {ticket.build} • {ticket.colour} •{" "}
                  {ticket.anoType} • {ticket.source}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                  {ticket.oqcApproved && ticket.oqcApprovedBy && (
                    <span className="ml-4 text-green-600 font-medium">
                      ✓ OQC Approved by {ticket.oqcApprovedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Qty</div>
                <div className="font-bold text-lg">{ticket.totalQuantity}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Scanned</div>
                <div className="font-bold text-lg text-green-600">
                  {totalScanned}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Remaining</div>
                <div
                  className={`font-bold text-lg ${totalScanned >= ticket.totalQuantity ? "text-green-600" : "text-orange-600"}`}
                >
                  {Math.max(0, ticket.totalQuantity - totalScanned)}
                </div>
              </div>

              {showOQCApproval === ticket.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Your name"
                    value={oqcApprover}
                    onChange={(e) => onSetOqcApprover(e.target.value)}
                    className="h-8 w-32"
                  />
                  <Button
                    onClick={() => onOQCApproval(ticket.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetShowOQCApproval(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {ticket.status !== "OQC Approved" && (
                    <Button
                      onClick={() => onStartScanning(ticket)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Scan className="mr-2 h-4 w-4" />
                      Scan Parts
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Summary */}
          {(okCount > 0 || cosmeticCount > 0) && (
            <div className="flex gap-2 mt-3">
              {okCount > 0 && (
                <Badge className="bg-green-100 text-green-800 border border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Cosmetic OK: {okCount}
                </Badge>
              )}
              {cosmeticCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Cosmetic Not OK: {cosmeticCount}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Expanded Content - Sessions */}
        {isExpanded && (
          <div className="p-4">
            {ticket.sessions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No scanning sessions yet. Click "Scan Parts" to start scanning.
              </div>
            ) : (
              <div className="space-y-4">
                {ticket.sessions.map((session) => {
                  const isSessionExpanded = expandedSessions[session.id];
                  const sessionOk = session.parts.filter(
                    (p) => p.scanStatus === "Cosmetic OK",
                  ).length;
                  const sessionCosmetic = session.parts.filter(
                    (p) => p.scanStatus === "Cosmetic Not OK",
                  ).length;

                  // Check if this session is marked as "Not Received" in ORT
                  const ortKey = `${ticket.ticketCode}-${session.sessionNumber}`;
                  const ortStatus = ortStatusMap[ortKey];
                  const isNotReceivedInORT = ortStatus?.received === "No";
                  const reasonMatch = ortStatus?.inventoryRemarks?.match(
                    /Not Received - Reason: (.+)/,
                  );
                  const ortReason = reasonMatch
                    ? reasonMatch[1]
                    : "No reason provided";

                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg ${isNotReceivedInORT ? "border-red-300 bg-red-50" : ""}`}
                    >
                      {/* Session Header */}
                      <div
                        className={`p-3 ${isNotReceivedInORT ? "bg-red-100" : "bg-blue-50"} flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleSessionExpand(session.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isSessionExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              Session {session.sessionNumber}
                              {isNotReceivedInORT && (
                                <Badge className="bg-red-600 text-white text-xs">
                                  ORT: Not Received
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              Saved:{" "}
                              {new Date(session.timestamp).toLocaleString()}
                              {session.submittedAt && (
                                <span className="ml-4 text-green-600 font-medium">
                                  ✓ Submitted:{" "}
                                  {new Date(
                                    session.submittedAt,
                                  ).toLocaleString()}
                                </span>
                              )}
                              {session.sentToORT && session.sentToORTAt && (
                                <span className="ml-4 text-purple-600 font-medium">
                                  ✓ Sent to ORT Lab
                                </span>
                              )}
                            </div>
                            {isNotReceivedInORT && ortReason && (
                              <div className="text-xs text-red-700 mt-1">
                                <span className="font-semibold">
                                  ORT Reason:
                                </span>{" "}
                                {ortReason}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {session.parts.length} parts
                          </Badge>
                          <div className="flex gap-1">
                            {sessionOk > 0 && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                OK: {sessionOk}
                              </Badge>
                            )}
                            {sessionCosmetic > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                Not OK: {sessionCosmetic}
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isNotReceivedInORT && ortStatus ? (
                              <>
                                <Button
                                  onClick={() => onReUploadFromORT(ortStatus)}
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Re-Upload & Scan
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* Show submitted badge */}
                                {session.submitted && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    ✓ Submitted
                                  </Badge>
                                )}

                                {/* Submit to ORT Lab Button - Only show if session is submitted and not sent yet */}
                                {!session.sentToORT &&
                                  ticket.oqcApproved &&
                                  session.submitted && (
                                    <Button
                                      onClick={() =>
                                        onSubmitToORTLab(
                                          ticket.id,
                                          session.id,
                                          ticket.ticketCode,
                                        )
                                      }
                                      size="sm"
                                      className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                      <Send className="mr-2 h-3 w-3" />
                                      Send to ORT Lab
                                    </Button>
                                  )}
                                {session.sentToORT && (
                                  <Badge className="bg-purple-600 text-white text-xs">
                                    Sent to ORT
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Session Parts Table */}
                      {isSessionExpanded && (
                        <div className="p-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Barcode</TableHead>
                                <TableHead>Status</TableHead>
                                {/* <TableHead>Location</TableHead> */}
                                <TableHead>Scanned At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {session.parts.map((part, partIdx) => (
                                <TableRow key={part.id}>
                                  <TableCell className="font-medium">
                                    {partIdx + 1}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-mono text-lg">
                                      {part.partNumber}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={getStatusColor(
                                        part.scanStatus,
                                      )}
                                    >
                                      {getStatusIcon(part.scanStatus)}
                                      <span className="ml-1">
                                        {part.scanStatus}
                                      </span>
                                    </Badge>
                                  </TableCell>
                                  {/* <TableCell>
                                    {editingLocation === part.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={editLocationValue}
                                          onChange={(e) =>
                                            onSetEditLocationValue(
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 w-24 text-sm"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            onUpdateLocation(
                                              ticket.id,
                                              session.id,
                                              part.id,
                                              editLocationValue,
                                            );
                                          }}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Save className="h-3 w-3 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            onSetEditingLocation(null);
                                            onSetEditLocationValue("");
                                          }}
                                          className="h-7 w-7 p-0"
                                        >
                                          <X className="h-3 w-3 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div
                                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                        onClick={() => {
                                          onSetEditingLocation(part.id);
                                          onSetEditLocationValue(part.location);
                                        }}
                                      >
                                        <span className="text-sm font-medium">
                                          {part.location}
                                        </span>
                                        <Edit2 className="h-3 w-3 text-gray-400" />
                                      </div>
                                    )}
                                  </TableCell> */}
                                  <TableCell className="text-sm text-gray-600">
                                    {new Date(part.scannedAt).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OQCSystem;
