// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { X } from "lucide-react";
// import * as XLSX from "xlsx";
// import {
//   CalendarTaskDto,
//   createCalendarTask,
//   deleteCalendarTask,
//   fetchCalendarTasks,
// } from "@/lib/backendApi";
// import { toast } from "@/components/ui/use-toast";

// interface MachineItem {
//   sr_no: number;
//   machine_id: string;
//   machine_description: string;
// }

// type Task = CalendarTaskDto;

// interface CalendarViewProps {
//   data: MachineItem[];
//   numberOfDays: number;
//   runningTests: any[];
//   chamberLoads: any[];
//   onLoadChamber: (machineId: string) => void;
//   onViewDetails: (machine: MachineItem) => void;
//   onOpenTesting: (machineId: string) => void;
//   getEquipmentStatus: (machineId: string) => any;
//   calculateRemainingTime: (load: any) => string | null;
//   getDisplayMachineDescription?: (machine: MachineItem) => string;
// }

// const MASTER_EXCEL_PATH = "/master_sheet.xlsx";

// const sortTasksByStart = (taskList: Task[]): Task[] =>
//   [...taskList].sort(
//     (a, b) =>
//       new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
//   );

// const CalendarView: React.FC<CalendarViewProps> = ({
//   data,
//   numberOfDays,
//   runningTests = [],
//   chamberLoads = [],
//   onLoadChamber,
//   onViewDetails,
//   onOpenTesting,
//   getEquipmentStatus,
//   calculateRemainingTime,
//   getDisplayMachineDescription,
// }) => {
//   const isAdminUser = useMemo(() => {
//     const user = localStorage.getItem("user");
//     if (user) {
//       try {
//         const parsed = JSON.parse(user);
//         if (parsed?.role && typeof parsed.role === "string") {
//           return parsed.role.toLowerCase() === "admin";
//         }
//       } catch {
//         /* ignore parse errors */
//       }
//     }
//     const role = localStorage.getItem("userRole");
//     return role?.toLowerCase() === "admin";
//   }, []);

//   console.log("data", data);
//   console.log("runningTests", runningTests);
//   console.log("chamberLoads", chamberLoads);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedMachine, setSelectedMachine] = useState<MachineItem | null>(
//     null,
//   );
//   const [testNames, setTestNames] = useState<string[]>([]);
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [formData, setFormData] = useState({
//     testName: "",
//     startDateTime: "",
//     endDateTime: "",
//     comments: "",
//   });
//   const loadScheduledTasks = useCallback(async () => {
//     try {
//       const remoteTasks = await fetchCalendarTasks();
//       setTasks(sortTasksByStart(remoteTasks));
//     } catch (error) {
//       console.error("Error loading scheduled tasks:", error);
//     }
//   }, [fetchCalendarTasks]);

//   useEffect(() => {
//     void loadScheduledTasks();

//     const intervalId = setInterval(() => {
//       void loadScheduledTasks();
//     }, 30000);

//     return () => clearInterval(intervalId);
//   }, [loadScheduledTasks]);

//   // Load test names from Excel
//   useEffect(() => {
//     const loadTestNames = async () => {
//       try {
//         const response = await fetch(MASTER_EXCEL_PATH);
//         const arrayBuffer = await response.arrayBuffer();
//         const workbook = XLSX.read(arrayBuffer, { type: "array" });
//         const firstSheet = workbook.Sheets["Test Allocation"];
//         const jsonData = XLSX.utils.sheet_to_json(firstSheet);

//         const uniqueTestNames = [
//           ...new Set(
//             jsonData
//               .map((row: any) => row["Test Name"])
//               .filter((name): name is string => !!name),
//           ),
//         ];

//         setTestNames(uniqueTestNames);
//       } catch (error) {
//         console.error("Error loading Excel file:", error);
//       }
//     };

//     loadTestNames();
//   }, []);

//   const handleBarClick = (machine: MachineItem) => {
//     if (!isAdminUser) return;
//     setSelectedMachine(machine);
//     setIsModalOpen(true);
//     setFormData({
//       testName: "",
//       startDateTime: "",
//       endDateTime: "",
//       comments: "",
//     });
//   };

//   const handleCreateTask = useCallback(async () => {
//     if (
//       !selectedMachine ||
//       !formData.testName ||
//       !formData.startDateTime ||
//       !formData.endDateTime
//     ) {
//       toast({
//         variant: "warning",
//         title: "Missing Information",
//         description: "Please fill in all required fields",
//         duration: 2000,
//       });
//       return;
//     }

//     const startTime = new Date(formData.startDateTime);
//     const endTime = new Date(formData.endDateTime);
//     const now = new Date();

//     if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
//       toast({
//         variant: "destructive",
//         title: "Invalid Date",
//         description: "Please select valid start and end times",
//         duration: 2000,
//       });
//       return;
//     }

//     if (endTime <= startTime) {
//       toast({
//         variant: "destructive",
//         title: "Invalid Time Range",
//         description: "End time must be after start time",
//         duration: 2000,
//       });
//       return;
//     }

//     if (startTime <= now) {
//       toast({
//         variant: "destructive",
//         title: "Invalid Start Time",
//         description: "Start time must be in the future",
//         duration: 2000,
//       });
//       return;
//     }

//     try {
//       const payload = {
//         machineId: selectedMachine.machine_id,
//         testName: formData.testName.trim(),
//         startDateTime: startTime.toISOString(),
//         endDateTime: endTime.toISOString(),
//         comments: formData.comments.trim()
//           ? formData.comments.trim()
//           : undefined,
//       };

//       const createdTask = await createCalendarTask(payload);
//       setTasks((prev) => sortTasksByStart([...prev, createdTask]));

//       setIsModalOpen(false);
//       setFormData({
//         testName: "",
//         startDateTime: "",
//         endDateTime: "",
//         comments: "",
//       });
//     } catch (error) {
//       console.error("Error creating calendar task:", error);
//       const message =
//         (error as any)?.response?.data?.message ?? "Failed to create task";
//       toast({
//         variant: "destructive",
//         title: "Creation Failed",
//         description: message,
//         duration: 2000,
//       });
//     }
//   }, [
//     createCalendarTask,
//     formData.comments,
//     formData.endDateTime,
//     formData.startDateTime,
//     formData.testName,
//     selectedMachine,
//   ]);

//   const handleDeleteTask = useCallback(
//     async (taskId: string) => {
//       try {
//         await deleteCalendarTask(taskId);
//         setTasks((prev) => prev.filter((task) => task.id !== taskId));
//       } catch (error) {
//         console.error("Error deleting calendar task:", error);
//         const message =
//           (error as any)?.response?.data?.message ?? "Failed to delete task";
//         toast({
//           variant: "destructive",
//           title: "Delete Failed",
//           description: message,
//           duration: 2000,
//         });
//       }
//     },
//     [deleteCalendarTask],
//   );

//   const generateDateHeaders = (days: number) => {
//     const headers = [];
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     for (let i = 0; i < days; i++) {
//       const date = new Date(today);
//       date.setDate(today.getDate() + i);
//       headers.push({
//         date,
//         dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
//         dateStr: `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })}`,
//       });
//     }
//     return headers;
//   };

//   const dateHeaders = generateDateHeaders(numberOfDays);

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "available":
//         return "#4CAF50";
//       case "occupied":
//         return "#F44336";
//       case "loading":
//         return "#FFEB3B";
//       default:
//         return "#9E9E9E";
//     }
//   };

//   const parseDurationHours = (testCondition: string): number => {
//     if (!testCondition) return 24;
//     const hrMatch = testCondition.match(/(\d+)\s*hr/);
//     if (hrMatch) return parseInt(hrMatch[1]);
//     const numMatch = testCondition.match(/^(\d+)$/);
//     if (numMatch) return parseInt(numMatch[1]);
//     if (testCondition.includes("h") || testCondition.includes("hour")) {
//       const match = testCondition.match(/(\d+)/);
//       return match ? parseInt(match[1]) : 24;
//     }
//     return 24;
//   };

//   const calculateRemainingTimeForDisplay = (load: any) => {
//     if (!load) return null;
//     if (load.timerStatus === "paused") return "Paused";
//     if (load.timerStatus !== "start" || !load.timerStartTime) return null;

//     const now = new Date();
//     const startTime = new Date(load.timerStartTime);

//     let durationHours = 24;
//     if (load.machineDetails?.tests?.[0]?.testCondition) {
//       durationHours = parseDurationHours(
//         load.machineDetails.tests[0].testCondition,
//       );
//     }

//     const durationInMs = durationHours * 60 * 60 * 1000;
//     const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
//     const endTime = new Date(
//       startTime.getTime() + durationInMs + totalPausedTimeMs,
//     );

//     if (now > endTime) return "Completed";

//     const remainingMs = endTime - now;
//     const totalSeconds = Math.floor(remainingMs / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);

//     return `${hours}h ${minutes}m remaining`;
//   };

//   const calculateEndTime = (load: any): Date | null => {
//     if (!load) return null;
//     const startTime = new Date(load.timerStartTime || load.loadedAt);
//     const durationHours = getTestDurationHours(load);
//     const durationInMs = durationHours * 60 * 60 * 1000;
//     const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
//     return new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);
//   };

//   const getTestDurationHours = (load: any): number => {
//     if (!load) return 24;
//     if (load.machineDetails?.tests?.[0]?.testCondition) {
//       return parseDurationHours(load.machineDetails.tests[0].testCondition);
//     }
//     if (load.parts?.[0]?.testCondition) {
//       return parseDurationHours(load.parts[0].testCondition);
//     }
//     return 24;
//   };

//   const getTestName = (load: any): string => {
//     if (load.machineDetails?.tests?.[0]?.testName) {
//       return load.machineDetails.tests[0].testName;
//     }
//     if (load.parts?.[0]?.testName) {
//       return load.parts[0].testName;
//     }
//     return "Test";
//   };

//   const formatDateTime = (date: Date | string): string => {
//     const d = typeof date === "string" ? new Date(date) : date;
//     return (
//       d.toLocaleDateString() +
//       " " +
//       d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//     );
//   };

//   const getLoadStatus = (load: any): string => {
//     if (!load) return "unknown";
//     if (load.status === "completed") return "completed";
//     if (load.timerStatus === "paused") return "paused";
//     if (load.timerStatus === "start" && load.timerStartTime) return "running";
//     if (load.loadedAt && !load.timerStartTime) return "loaded_not_started";
//     return "unknown";
//   };

//   return (
//     <div className="relative overflow-auto border-t max-h-[75vh]">
//       <div style={{ minWidth: "1200px" }}>
//         <div className="flex border-b bg-gray-50 sticky top-0 z-30">
//           <div className="w-80 p-4 border-r font-semibold text-sm text-gray-700 bg-gray-50 sticky left-0 z-40">
//             Equipment / Machine
//           </div>
//           <div className="flex-1 relative bg-gray-50">
//             <div className="absolute inset-0 flex">
//               {dateHeaders.map((header, idx) => (
//                 <div
//                   key={idx}
//                   className="flex-1 text-center py-2 border-r border-gray-200"
//                 >
//                   <div className="text-[10px] font-semibold text-gray-700">
//                     {header.dayName}
//                   </div>
//                   <div className="text-xs text-gray-600 mt-0.5">
//                     {header.dateStr}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {data &&
//           data.map((machine) => {
//             const equipmentStatus = getEquipmentStatus(machine.machine_id);
//             // const machineLoads = chamberLoads.filter((load) => {
//             //   if (!load) return false;
//             //   const loadMachineId = load.machineId || load.chamber;
//             //   const loadMachineDesc =
//             //     load.machineDescription ||
//             //     load.machineDetails?.machineDescription;
//             //   return (
//             //     loadMachineId === machine.machine_id ||
//             //     loadMachineDesc === machine.machine_description
//             //   );
//             // });

//             const machineLoads = chamberLoads.filter((load) => {
//               if (!load) return false;
//               const loadMachineId = load.machineId || load.chamber;
//               // Primary match: by machineId (exact)
//               if (loadMachineId) {
//                 return loadMachineId === machine.machine_id;
//               }
//               // Fallback: only match by description if no machineId present
//               const loadMachineDesc =
//                 load.machineDescription ||
//                 load.machineDetails?.machineDescription;
//               return loadMachineDesc === machine.machine_description;
//             });

//             const machineTests = runningTests.filter((test) => {
//               if (!test) return false;
//               return (
//                 test.machine === machine.machine_id ||
//                 test.machine
//                   .toLowerCase()
//                   .includes(machine.machine_description.toLowerCase())
//               );
//             });

//             // Get tasks for this machine
//             const machineTasks = tasks.filter(
//               (task) => task.machineId === machine.machine_id,
//             );

//             return (
//               <div
//                 key={machine.sr_no}
//                 className="flex border-b hover:bg-blue-50 transition-colors"
//               >
//                 <div className="w-80 p-3 border-r bg-white font-medium text-sm text-gray-800 flex items-center justify-between sticky left-0 z-20">
//                   <div className="flex items-center flex-1">
//                     <div
//                       className="w-3 h-3 rounded-full mr-3"
//                       style={{
//                         backgroundColor: getStatusColor(
//                           equipmentStatus?.status || "available",
//                         ),
//                       }}
//                     ></div>
//                     <div className="flex-1">
//                       <div className="font-semibold">{machine.machine_id}</div>
//                       <div className="text-xs text-gray-500">
//                         {getDisplayMachineDescription?.(machine) ||
//                           machine.machine_description}
//                       </div>
//                     </div>
//                     {equipmentStatus?.activeParts > 0 && (
//                       <div className="ml-2 flex items-center text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
//                         {equipmentStatus?.activeLoads || 0} load(s) •{" "}
//                         {equipmentStatus?.activeParts || 0} parts
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 <div className="flex-1 relative h-20 bg-gradient-to-r from-white to-gray-50">
//                   <div className="absolute inset-0 flex">
//                     {dateHeaders.map((_, i) => (
//                       <div
//                         key={i}
//                         className="flex-1 border-r border-gray-100"
//                       ></div>
//                     ))}
//                   </div>

//                   {/* Available background - clickable */}
//                   <div
//                     className={`absolute top-2 bottom-2 rounded-lg transition-all duration-300 opacity-30 ${
//                       isAdminUser
//                         ? "cursor-pointer hover:opacity-40"
//                         : "cursor-not-allowed"
//                     }`}
//                     style={{
//                       left: "0%",
//                       width: "100%",
//                       backgroundColor: "#81c784",
//                     }}
//                     onClick={() => handleBarClick(machine)}
//                     title={
//                       isAdminUser
//                         ? "Click to schedule a task"
//                         : "Scheduling restricted to admins"
//                     }
//                   ></div>

//                   {/* Scheduled tasks from localStorage */}
//                   {machineTasks.map((task, taskIdx) => {
//                     const taskStartFull = new Date(task.startDateTime);
//                     const taskEndFull = new Date(task.endDateTime);

//                     const today = new Date();
//                     today.setHours(0, 0, 0, 0);

//                     // Calculate position based on actual datetime (not just date)
//                     const startDiffMs =
//                       taskStartFull.getTime() - today.getTime();
//                     const endDiffMs = taskEndFull.getTime() - today.getTime();

//                     const startDiffDays = startDiffMs / (1000 * 60 * 60 * 24);
//                     const endDiffDays = endDiffMs / (1000 * 60 * 60 * 24);

//                     const taskDurationDays = endDiffDays - startDiffDays;

//                     const leftPercent = (startDiffDays / numberOfDays) * 100;
//                     const widthPercent =
//                       (taskDurationDays / numberOfDays) * 100;
//                     const adjustedLeft = Math.max(0, leftPercent);
//                     const adjustedWidth = Math.min(
//                       100 - adjustedLeft,
//                       widthPercent + Math.min(0, leftPercent),
//                     );

//                     if (adjustedWidth <= 0 || adjustedLeft >= 100) return null;

//                     return (
//                       <div
//                         key={`task-${task.id}-${taskIdx}`}
//                         className="absolute top-2 bottom-2 rounded-lg flex items-center justify-between text-white text-xs font-medium shadow-md z-10 group"
//                         style={{
//                           left: `${adjustedLeft}%`,
//                           width: `${adjustedWidth}%`,
//                           backgroundColor: "#2196F3",
//                           minWidth: "40px",
//                           border: "2px solid #1976D2",
//                         }}
//                         title={`${task.testName}\nStart: ${formatDateTime(task.startDateTime)}\nEnd: ${formatDateTime(task.endDateTime)}\nComments: ${task.comments || "None"}\nStatus: ${task.status}`}
//                       >
//                         <div className="px-2 flex-1 text-center">
//                           <div className="font-semibold text-[10px] truncate">
//                             {task.testName}
//                           </div>
//                           <div className="text-[8px] opacity-90">
//                             {task.status}
//                           </div>
//                         </div>
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             if (window.confirm("Delete this scheduled task?")) {
//                               void handleDeleteTask(task.id);
//                             }
//                           }}
//                           className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5"
//                           title="Delete task"
//                         >
//                           ×
//                         </button>
//                       </div>
//                     );
//                   })}

//                   {/* Scheduled tests */}
//                   {machineTests.map((test, testIdx) => {
//                     if (!test) return null;
//                     const testStart = new Date(
//                       test.startDateTime || test.submittedAt,
//                     );
//                     testStart.setHours(0, 0, 0, 0);
//                     const today = new Date();
//                     today.setHours(0, 0, 0, 0);
//                     const daysFromStart = Math.floor(
//                       (testStart.getTime() - today.getTime()) /
//                         (1000 * 60 * 60 * 24),
//                     );
//                     const testDurationHours = test.duration || 24;
//                     const testDurationDays = Math.ceil(testDurationHours / 24);

//                     const leftPercent = (daysFromStart / numberOfDays) * 100;
//                     const widthPercent =
//                       (testDurationDays / numberOfDays) * 100;
//                     const adjustedLeft = Math.max(0, leftPercent);
//                     const adjustedWidth = Math.min(
//                       100 - adjustedLeft,
//                       widthPercent + Math.min(0, leftPercent),
//                     );

//                     if (adjustedWidth <= 0) return null;

//                     return (
//                       <div
//                         key={`test-${testIdx}`}
//                         className="absolute top-2 bottom-2 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium shadow-md z-10"
//                         style={{
//                           left: `${adjustedLeft}%`,
//                           width: `${adjustedWidth}%`,
//                           backgroundColor: "#e57373",
//                           minWidth: "30px",
//                         }}
//                         title={`${test.testName}\nDuration: ${testDurationHours}h\nFrom: ${testStart.toLocaleDateString()}`}
//                       >
//                         {adjustedWidth > 8 && (
//                           <div className="px-2 text-center">
//                             <div className="font-semibold text-[11px] truncate">
//                               {test.testName}
//                             </div>
//                             <div className="text-[9px] opacity-90 mt-0.5">
//                               {testDurationDays}d
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}

//                   {/* Active loads */}
//                   {machineLoads
//                     .filter(
//                       (load) =>
//                         load &&
//                         (load.timerStatus === "start" ||
//                           load.timerStatus === "paused" ||
//                           load.loadedAt),
//                     )
//                     .map((load, loadIdx) => {
//                       if (!load) return null;

//                       const loadedTime = new Date(load.loadedAt);
//                       const startTime = load.timerStartTime
//                         ? new Date(load.timerStartTime)
//                         : null;
//                       const durationHours = getTestDurationHours(load);
//                       const endTime = calculateEndTime(load);
//                       const loadStatus = getLoadStatus(load);

//                       const today = new Date();
//                       today.setHours(0, 0, 0, 0);

//                       let barStartTime = loadedTime;
//                       let barEndTime = endTime;

//                       if (!startTime && loadStatus === "loaded_not_started") {
//                         barEndTime = new Date(
//                           loadedTime.getTime() + 4 * 60 * 60 * 1000,
//                         );
//                       }

//                       if (
//                         startTime &&
//                         (loadStatus === "running" || loadStatus === "paused")
//                       ) {
//                         barStartTime = loadedTime;
//                       }

//                       const totalSpanMs = barEndTime
//                         ? barEndTime.getTime() - barStartTime.getTime()
//                         : 0;
//                       const totalSpanDays = totalSpanMs / (1000 * 60 * 60 * 24);

//                       const barStartDate = new Date(barStartTime);
//                       barStartDate.setHours(0, 0, 0, 0);

//                       const daysFromStart = Math.floor(
//                         (barStartDate.getTime() - today.getTime()) /
//                           (1000 * 60 * 60 * 24),
//                       );

//                       const barStartPercent =
//                         (daysFromStart / numberOfDays) * 100;
//                       const barWidthPercent =
//                         (totalSpanDays / numberOfDays) * 100;

//                       const adjustedLeft = Math.max(0, barStartPercent);
//                       const adjustedWidth = Math.min(
//                         100 - adjustedLeft,
//                         barWidthPercent + Math.min(0, barStartPercent),
//                       );

//                       if (adjustedWidth <= 0) return null;

//                       let yellowSegmentPercent = 0;
//                       let showYellowSegment = true;

//                       if (loadStatus === "loaded_not_started") {
//                         yellowSegmentPercent = 100;
//                       } else if (startTime) {
//                         const loadToStartMs =
//                           startTime.getTime() - loadedTime.getTime();
//                         const loadToStartHours =
//                           loadToStartMs / (1000 * 60 * 60);

//                         if (loadToStartHours < 0.016) {
//                           yellowSegmentPercent = Math.min(
//                             20,
//                             totalSpanDays > 0
//                               ? (4 / 24 / totalSpanDays) * 100
//                               : 10,
//                           );
//                         } else {
//                           yellowSegmentPercent = Math.min(
//                             30,
//                             (loadToStartHours / 24 / totalSpanDays) * 100,
//                           );
//                         }
//                       } else {
//                         yellowSegmentPercent = Math.min(
//                           30,
//                           (4 / 24 / totalSpanDays) * 100,
//                         );
//                       }

//                       let mainSegmentColor = "#f44336";
//                       let borderColor = "#d32f2f";

//                       if (loadStatus === "paused") {
//                         mainSegmentColor = "#FF9800";
//                         borderColor = "#F57C00";
//                       } else if (loadStatus === "loaded_not_started") {
//                         mainSegmentColor = "#9E9E9E";
//                         borderColor = "#757575";
//                       }

//                       const testName = getTestName(load);
//                       const partCount = load.parts?.length || 0;
//                       const machineDisplayName =
//                         load.machineId || load.chamber || "Unknown Machine";

//                       const tooltipLines = [
//                         `Load Status: ${
//                           loadStatus === "running"
//                             ? "Test Running"
//                             : loadStatus === "paused"
//                               ? "Test Paused"
//                               : loadStatus === "loaded_not_started"
//                                 ? "Loaded (Not Started)"
//                                 : "Unknown"
//                         }`,
//                         `Equipment: ${machineDisplayName}`,
//                         `Test: ${testName}`,
//                         `Parts: ${partCount}`,
//                         `---`,
//                         `Loaded: ${formatDateTime(loadedTime)}`,
//                       ];

//                       if (startTime) {
//                         tooltipLines.push(
//                           `Timer Started: ${formatDateTime(startTime)}`,
//                         );
//                       } else {
//                         tooltipLines.push(`Timer: Not started yet`);
//                       }

//                       tooltipLines.push(`Duration: ${durationHours} hours`);

//                       if (
//                         endTime &&
//                         (loadStatus === "running" || loadStatus === "paused")
//                       ) {
//                         tooltipLines.push(
//                           `Estimated End: ${formatDateTime(endTime)}`,
//                         );
//                       }

//                       tooltipLines.push(`---`);

//                       const remainingTime =
//                         calculateRemainingTimeForDisplay(load);
//                       if (remainingTime) {
//                         tooltipLines.push(`${remainingTime}`);
//                       } else if (loadStatus === "loaded_not_started") {
//                         tooltipLines.push(`Load created but test not started`);
//                       }

//                       const tooltipText = tooltipLines.join("\n");

//                       return (
//                         <div
//                           key={`load-${load.id}-${loadIdx}`}
//                           className="absolute top-2 bottom-2 flex shadow-md cursor-pointer z-20"
//                           style={{
//                             left: `${adjustedLeft}%`,
//                             width: `${adjustedWidth}%`,
//                             minWidth: "2px",
//                             borderRadius: "0 4px 4px 0",
//                             border: `1px solid ${borderColor}`,
//                             overflow: "hidden",
//                           }}
//                           title={tooltipText}
//                         >
//                           {showYellowSegment && yellowSegmentPercent > 0 && (
//                             <div
//                               className="h-full"
//                               style={{
//                                 width: `${yellowSegmentPercent}%`,
//                                 backgroundColor: "#FFD54F",
//                                 backgroundImage:
//                                   "linear-gradient(45deg, rgba(255, 213, 79, 0.9) 25%, transparent 25%, transparent 50%, rgba(255, 213, 79, 0.9) 50%, rgba(255, 213, 79, 0.9) 75%, transparent 75%, transparent)",
//                                 backgroundSize: "20px 20px",
//                                 minWidth: "2px",
//                               }}
//                               title="Loading/Setup Period"
//                             >
//                               {adjustedWidth > 10 &&
//                                 yellowSegmentPercent > 10 &&
//                                 loadStatus === "loaded_not_started" && (
//                                   <div className="text-[8px] text-gray-800 font-bold rotate-90 origin-center mt-6 whitespace-nowrap">
//                                     LOADED
//                                   </div>
//                                 )}
//                             </div>
//                           )}

//                           {loadStatus !== "loaded_not_started" && (
//                             <div
//                               className="h-full flex flex-col items-center justify-center text-white text-xs font-medium"
//                               style={{
//                                 flex: 1,
//                                 backgroundColor: mainSegmentColor,
//                                 minWidth: "2px",
//                               }}
//                             >
//                               {adjustedWidth > 3 && (
//                                 <div className="px-1 text-center">
//                                   <div className="font-semibold text-[10px] truncate text-white">
//                                     {partCount} part{partCount !== 1 ? "s" : ""}
//                                   </div>
//                                   <div className="text-[8px] text-white opacity-90 mt-0.5">
//                                     {durationHours}h
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                 </div>
//               </div>
//             );
//           })}
//       </div>

//       {/* Task Creation Modal */}
//       {isAdminUser && isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-semibold text-gray-800">
//                 Schedule Task - {selectedMachine?.machine_id}
//               </h2>
//               <button
//                 onClick={() => setIsModalOpen(false)}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="space-y-4">
//               {/* Test Name Dropdown */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Test Name *
//                 </label>
//                 <select
//                   value={formData.testName}
//                   onChange={(e) =>
//                     setFormData({ ...formData, testName: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select a test</option>
//                   {testNames.map((name, idx) => (
//                     <option key={idx} value={name}>
//                       {name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Start DateTime */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Start Date & Time *
//                 </label>
//                 <input
//                   type="datetime-local"
//                   value={formData.startDateTime}
//                   onChange={(e) =>
//                     setFormData({ ...formData, startDateTime: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>

//               {/* End DateTime */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   End Date & Time *
//                 </label>
//                 <input
//                   type="datetime-local"
//                   value={formData.endDateTime}
//                   onChange={(e) =>
//                     setFormData({ ...formData, endDateTime: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>

//               {/* Comments */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Comments
//                 </label>
//                 <textarea
//                   value={formData.comments}
//                   onChange={(e) =>
//                     setFormData({ ...formData, comments: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   rows={3}
//                   placeholder="Add any additional notes..."
//                 />
//               </div>

//               {/* Action Buttons */}
//               <div className="flex gap-3 mt-6">
//                 <button
//                   onClick={() => setIsModalOpen(false)}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={() => void handleCreateTask()}
//                   className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
//                 >
//                   Create Task
//                 </button>
//               </div>
//             </div>

//             {/* Info Text */}
//             <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
//               <p className="text-xs text-blue-800">
//                 <strong>Note:</strong> Tasks are automatically managed based on
//                 time:
//                 <br />• <strong>Scheduled:</strong> Before start time
//                 <br />• <strong>Ongoing:</strong> Between start and end time
//                 <br />• <strong>Completed:</strong> Auto-deleted after end time
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CalendarView;

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import {
  CalendarTaskDto,
  createCalendarTask,
  deleteCalendarTask,
  fetchCalendarTasks,
  apiService,
} from "@/lib/backendApi";
import { toast } from "@/components/ui/use-toast";

interface MachineItem {
  sr_no: number;
  machine_id: string;
  machine_description: string;
}

type Task = CalendarTaskDto;

interface CalendarViewProps {
  data: MachineItem[];
  numberOfDays: number;
  runningTests: any[];
  chamberLoads: any[];
  onLoadChamber: (machineId: string) => void;
  onViewDetails: (machine: MachineItem) => void;
  onOpenTesting: (machineId: string) => void;
  getEquipmentStatus: (machineId: string) => any;
  calculateRemainingTime: (load: any) => string | null;
  getDisplayMachineDescription?: (machine: MachineItem) => string;
}



const sortTasksByStart = (taskList: Task[]): Task[] =>
  [...taskList].sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

const CalendarView: React.FC<CalendarViewProps> = ({
  data,
  numberOfDays,
  runningTests = [],
  chamberLoads = [],
  onLoadChamber,
  onViewDetails,
  onOpenTesting,
  getEquipmentStatus,
  calculateRemainingTime,
  getDisplayMachineDescription,
}) => {
  const isAdminUser = useMemo(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.role && typeof parsed.role === "string") {
          return parsed.role.toLowerCase() === "admin";
        }
      } catch {
        /* ignore parse errors */
      }
    }
    const role = localStorage.getItem("userRole");
    return role?.toLowerCase() === "admin";
  }, []);

  console.log("data", data);
  console.log("runningTests", runningTests);
  console.log("chamberLoads", chamberLoads);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineItem | null>(
    null,
  );
  const [testNames, setTestNames] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    testName: "",
    startDateTime: "",
    endDateTime: "",
    comments: "",
  });
  const loadScheduledTasks = useCallback(async () => {
    try {
      const remoteTasks = await fetchCalendarTasks();
      setTasks(sortTasksByStart(remoteTasks));
    } catch (error) {
      console.error("Error loading scheduled tasks:", error);
    }
  }, [fetchCalendarTasks]);

  useEffect(() => {
    void loadScheduledTasks();

    const intervalId = setInterval(() => {
      void loadScheduledTasks();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadScheduledTasks]);

  // Load test names from Excel (Commented out Excel loading, now using DB config)
  useEffect(() => {
    const loadTestNames = async () => {
      try {


        const dbTests = await apiService.getTestAllocations();
        const uniqueTestNames = [
          ...new Set(
            dbTests
              .map((row: any) => row.testName)
              .filter((name): name is string => !!name),
          ),
        ];

        setTestNames(uniqueTestNames);
      } catch (error) {
        console.error("Error loading test names from Database:", error);
      }
    };

    loadTestNames();
  }, []);

  const handleBarClick = (machine: MachineItem) => {
    if (!isAdminUser) return;
    setSelectedMachine(machine);
    setIsModalOpen(true);
    setFormData({
      testName: "",
      startDateTime: "",
      endDateTime: "",
      comments: "",
    });
  };

  const handleCreateTask = useCallback(async () => {
    if (
      !selectedMachine ||
      !formData.testName ||
      !formData.startDateTime ||
      !formData.endDateTime
    ) {
      toast({
        variant: "warning",
        title: "Missing Information",
        description: "Please fill in all required fields",
        duration: 2000,
      });
      return;
    }

    const startTime = new Date(formData.startDateTime);
    const endTime = new Date(formData.endDateTime);
    const now = new Date();

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Please select valid start and end times",
        duration: 2000,
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        variant: "destructive",
        title: "Invalid Time Range",
        description: "End time must be after start time",
        duration: 2000,
      });
      return;
    }

    if (startTime <= now) {
      toast({
        variant: "destructive",
        title: "Invalid Start Time",
        description: "Start time must be in the future",
        duration: 2000,
      });
      return;
    }

    try {
      const payload = {
        machineId: selectedMachine.machine_id,
        testName: formData.testName.trim(),
        startDateTime: startTime.toISOString(),
        endDateTime: endTime.toISOString(),
        comments: formData.comments.trim()
          ? formData.comments.trim()
          : undefined,
      };

      const createdTask = await createCalendarTask(payload);
      setTasks((prev) => sortTasksByStart([...prev, createdTask]));

      setIsModalOpen(false);
      setFormData({
        testName: "",
        startDateTime: "",
        endDateTime: "",
        comments: "",
      });
    } catch (error) {
      console.error("Error creating calendar task:", error);
      const message =
        (error as any)?.response?.data?.message ?? "Failed to create task";
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: message,
        duration: 2000,
      });
    }
  }, [
    createCalendarTask,
    formData.comments,
    formData.endDateTime,
    formData.startDateTime,
    formData.testName,
    selectedMachine,
  ]);

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteCalendarTask(taskId);
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
      } catch (error) {
        console.error("Error deleting calendar task:", error);
        const message =
          (error as any)?.response?.data?.message ?? "Failed to delete task";
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: message,
          duration: 2000,
        });
      }
    },
    [deleteCalendarTask],
  );

  const generateDateHeaders = (days: number) => {
    const headers = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      headers.push({
        date,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })}`,
      });
    }
    return headers;
  };

  const dateHeaders = generateDateHeaders(numberOfDays);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "#4CAF50";
      case "occupied":
        return "#F44336";
      case "loading":
        return "#FFEB3B";
      default:
        return "#9E9E9E";
    }
  };

  const parseDurationHours = (testCondition: string): number => {
    if (!testCondition) return 24;
    const hrMatch = testCondition.match(/(\d+)\s*hr/);
    if (hrMatch) return parseInt(hrMatch[1]);
    const numMatch = testCondition.match(/^(\d+)$/);
    if (numMatch) return parseInt(numMatch[1]);
    if (testCondition.includes("h") || testCondition.includes("hour")) {
      const match = testCondition.match(/(\d+)/);
      return match ? parseInt(match[1]) : 24;
    }
    return 24;
  };

  const calculateRemainingTimeForDisplay = (load: any) => {
    if (!load) return null;
    if (load.timerStatus === "paused") return "Paused";
    if (load.timerStatus !== "start" || !load.timerStartTime) return null;

    const now = new Date();
    const startTime = new Date(load.timerStartTime);

    let durationHours = 24;
    if (load.machineDetails?.tests?.[0]?.testCondition) {
      durationHours = parseDurationHours(
        load.machineDetails.tests[0].testCondition,
      );
    }

    const durationInMs = durationHours * 60 * 60 * 1000;
    const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
    const endTime = new Date(
      startTime.getTime() + durationInMs + totalPausedTimeMs,
    );

    if (now > endTime) return "Completed";

    const remainingMs = endTime - now;
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours}h ${minutes}m remaining`;
  };

  const calculateEndTime = (load: any): Date | null => {
    if (!load) return null;
    const startTime = new Date(load.timerStartTime || load.loadedAt);
    const durationHours = getTestDurationHours(load);
    const durationInMs = durationHours * 60 * 60 * 1000;
    const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
    return new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);
  };

  const getTestDurationHours = (load: any): number => {
    if (!load) return 24;
    if (load.machineDetails?.tests?.[0]?.testCondition) {
      return parseDurationHours(load.machineDetails.tests[0].testCondition);
    }
    if (load.parts?.[0]?.testCondition) {
      return parseDurationHours(load.parts[0].testCondition);
    }
    // FIX: If testUnit is "Hours" and testValue is present, use it directly
    if (
      load.testUnit &&
      load.testUnit.toLowerCase() === "hours" &&
      load.testValue
    ) {
      return Number(load.testValue);
    }
    if (load.duration) {
      return Number(load.duration);
    }
    return 24;
  };

  const getTestName = (load: any): string => {
    if (load.machineDetails?.tests?.[0]?.testName) {
      return load.machineDetails.tests[0].testName;
    }
    if (load.parts?.[0]?.testName) {
      return load.parts[0].testName;
    }
    if (load.selectedTestName) {
      return load.selectedTestName;
    }
    return "Test";
  };

  const formatDateTime = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getLoadStatus = (load: any): string => {
    if (!load) return "unknown";
    if (load.status === "completed") return "completed";
    if (load.timerStatus === "paused") return "paused";
    if (load.timerStatus === "start" && load.timerStartTime) return "running";
    if (load.loadedAt && !load.timerStartTime) return "loaded_not_started";
    return "unknown";
  };

  return (
    <div className="relative overflow-auto border-t max-h-[75vh]">
      <div style={{ minWidth: "1200px" }}>
        <div className="flex border-b bg-gray-50 sticky top-0 z-30">
          <div className="w-80 p-4 border-r font-semibold text-sm text-gray-700 bg-gray-50 sticky left-0 z-40">
            Equipment / Machine
          </div>
          <div className="flex-1 relative bg-gray-50">
            <div className="absolute inset-0 flex">
              {dateHeaders.map((header, idx) => (
                <div
                  key={idx}
                  className="flex-1 text-center py-2 border-r border-gray-200"
                >
                  <div className="text-[10px] font-semibold text-gray-700">
                    {header.dayName}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {header.dateStr}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {data &&
          data.map((machine) => {
            const equipmentStatus = getEquipmentStatus(machine.machine_id);

            // FIX: Match loads strictly by machineId/chamber first.
            // Only fall back to machineDescription if no machineId is present on the load.
            const machineLoads = chamberLoads.filter((load) => {
              if (!load) return false;
              const loadMachineId = load.machineId || load.chamber;

              if (loadMachineId) {
                return loadMachineId === machine.machine_id;
              }
              // Fallback: match by description only if machineId is absent
              const loadMachineDesc =
                load.machineDescription ||
                load.machineDetails?.machineDescription;
              return loadMachineDesc === machine.machine_description;
            });

            const machineTests = runningTests.filter((test) => {
              if (!test) return false;
              return (
                test.machine === machine.machine_id ||
                test.machine
                  .toLowerCase()
                  .includes(machine.machine_description.toLowerCase())
              );
            });

            // Get tasks for this machine
            const machineTasks = tasks.filter(
              (task) => task.machineId === machine.machine_id,
            );

            return (
              <div
                key={machine.sr_no}
                className="flex border-b hover:bg-blue-50 transition-colors"
              >
                <div className="w-80 p-3 border-r bg-white font-medium text-sm text-gray-800 flex items-center justify-between sticky left-0 z-20">
                  <div className="flex items-center flex-1">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{
                        backgroundColor: getStatusColor(
                          equipmentStatus?.status || "available",
                        ),
                      }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-semibold">{machine.machine_id}</div>
                      <div className="text-xs text-gray-500">
                        {getDisplayMachineDescription?.(machine) ||
                          machine.machine_description}
                      </div>
                    </div>
                    {equipmentStatus?.activeParts > 0 && (
                      <div className="ml-2 flex items-center text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                        {equipmentStatus?.activeLoads || 0} load(s) •{" "}
                        {equipmentStatus?.activeParts || 0} parts
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative h-20 bg-gradient-to-r from-white to-gray-50">
                  <div className="absolute inset-0 flex">
                    {dateHeaders.map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 border-r border-gray-100"
                      ></div>
                    ))}
                  </div>

                  {/* Available background - clickable */}
                  <div
                    className={`absolute top-2 bottom-2 rounded-lg transition-all duration-300 opacity-30 ${
                      isAdminUser
                        ? "cursor-pointer hover:opacity-40"
                        : "cursor-not-allowed"
                    }`}
                    style={{
                      left: "0%",
                      width: "100%",
                      backgroundColor: "#81c784",
                    }}
                    onClick={() => handleBarClick(machine)}
                    title={
                      isAdminUser
                        ? "Click to schedule a task"
                        : "Scheduling restricted to admins"
                    }
                  ></div>

                  {/* Scheduled tasks from localStorage */}
                  {machineTasks.map((task, taskIdx) => {
                    const taskStartFull = new Date(task.startDateTime);
                    const taskEndFull = new Date(task.endDateTime);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Calculate position based on actual datetime (not just date)
                    const startDiffMs =
                      taskStartFull.getTime() - today.getTime();
                    const endDiffMs = taskEndFull.getTime() - today.getTime();

                    const startDiffDays = startDiffMs / (1000 * 60 * 60 * 24);
                    const endDiffDays = endDiffMs / (1000 * 60 * 60 * 24);

                    const taskDurationDays = endDiffDays - startDiffDays;

                    const leftPercent = (startDiffDays / numberOfDays) * 100;
                    const widthPercent =
                      (taskDurationDays / numberOfDays) * 100;
                    const adjustedLeft = Math.max(0, leftPercent);
                    const adjustedWidth = Math.min(
                      100 - adjustedLeft,
                      widthPercent + Math.min(0, leftPercent),
                    );

                    if (adjustedWidth <= 0 || adjustedLeft >= 100) return null;

                    return (
                      <div
                        key={`task-${task.id}-${taskIdx}`}
                        className="absolute top-2 bottom-2 rounded-lg flex items-center justify-between text-white text-xs font-medium shadow-md z-10 group"
                        style={{
                          left: `${adjustedLeft}%`,
                          width: `${adjustedWidth}%`,
                          backgroundColor: "#2196F3",
                          minWidth: "40px",
                          border: "2px solid #1976D2",
                        }}
                        title={`${task.testName}\nStart: ${formatDateTime(task.startDateTime)}\nEnd: ${formatDateTime(task.endDateTime)}\nComments: ${task.comments || "None"}\nStatus: ${task.status}`}
                      >
                        <div className="px-2 flex-1 text-center">
                          <div className="font-semibold text-[10px] truncate">
                            {task.testName}
                          </div>
                          <div className="text-[8px] opacity-90">
                            {task.status}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this scheduled task?")) {
                              void handleDeleteTask(task.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5"
                          title="Delete task"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {/* Scheduled tests */}
                  {machineTests.map((test, testIdx) => {
                    if (!test) return null;
                    const testStart = new Date(
                      test.startDateTime || test.submittedAt,
                    );
                    testStart.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysFromStart = Math.floor(
                      (testStart.getTime() - today.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    const testDurationHours = test.duration || 24;
                    const testDurationDays = Math.ceil(testDurationHours / 24);

                    const leftPercent = (daysFromStart / numberOfDays) * 100;
                    const widthPercent =
                      (testDurationDays / numberOfDays) * 100;
                    const adjustedLeft = Math.max(0, leftPercent);
                    const adjustedWidth = Math.min(
                      100 - adjustedLeft,
                      widthPercent + Math.min(0, leftPercent),
                    );

                    if (adjustedWidth <= 0) return null;

                    return (
                      <div
                        key={`test-${testIdx}`}
                        className="absolute top-2 bottom-2 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium shadow-md z-10"
                        style={{
                          left: `${adjustedLeft}%`,
                          width: `${adjustedWidth}%`,
                          backgroundColor: "#e57373",
                          minWidth: "30px",
                        }}
                        title={`${test.testName}\nDuration: ${testDurationHours}h\nFrom: ${testStart.toLocaleDateString()}`}
                      >
                        {adjustedWidth > 8 && (
                          <div className="px-2 text-center">
                            <div className="font-semibold text-[11px] truncate">
                              {test.testName}
                            </div>
                            <div className="text-[9px] opacity-90 mt-0.5">
                              {testDurationDays}d
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Active loads */}
                  {machineLoads
                    .filter(
                      (load) =>
                        load &&
                        load.status !== "completed" && 
                        load.timerStatus !== "stop" && 
                        (load.timerStatus === "start" ||
                          load.timerStatus === "paused" ||
                          load.loadedAt),
                    )
                    .map((load, loadIdx) => {
                      if (!load) return null;

                      const loadedTime = new Date(load.loadedAt);
                      const startTime = load.timerStartTime
                        ? new Date(load.timerStartTime)
                        : null;
                      const durationHours = getTestDurationHours(load);
                      const endTime = calculateEndTime(load);
                      const loadStatus = getLoadStatus(load);

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      let barStartTime = loadedTime;
                      let barEndTime = endTime;

                      if (!startTime && loadStatus === "loaded_not_started") {
                        barEndTime = new Date(
                          loadedTime.getTime() + 4 * 60 * 60 * 1000,
                        );
                      }

                      if (
                        startTime &&
                        (loadStatus === "running" || loadStatus === "paused")
                      ) {
                        barStartTime = loadedTime;
                      }

                      const totalSpanMs = barEndTime
                        ? barEndTime.getTime() - barStartTime.getTime()
                        : 0;
                      const totalSpanDays = totalSpanMs / (1000 * 60 * 60 * 24);

                      const barStartDate = new Date(barStartTime);
                      barStartDate.setHours(0, 0, 0, 0);

                      const daysFromStart = Math.floor(
                        (barStartDate.getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24),
                      );

                      const barStartPercent =
                        (daysFromStart / numberOfDays) * 100;
                      const barWidthPercent =
                        (totalSpanDays / numberOfDays) * 100;

                      const adjustedLeft = Math.max(0, barStartPercent);
                      const adjustedWidth = Math.min(
                        100 - adjustedLeft,
                        barWidthPercent + Math.min(0, barStartPercent),
                      );

                      if (adjustedWidth <= 0) return null;

                      let yellowSegmentPercent = 0;
                      let showYellowSegment = true;

                      if (loadStatus === "loaded_not_started") {
                        yellowSegmentPercent = 100;
                      } else if (startTime) {
                        const loadToStartMs =
                          startTime.getTime() - loadedTime.getTime();
                        const loadToStartHours =
                          loadToStartMs / (1000 * 60 * 60);

                        if (loadToStartHours < 0.016) {
                          yellowSegmentPercent = Math.min(
                            20,
                            totalSpanDays > 0
                              ? (4 / 24 / totalSpanDays) * 100
                              : 10,
                          );
                        } else {
                          yellowSegmentPercent = Math.min(
                            30,
                            (loadToStartHours / 24 / totalSpanDays) * 100,
                          );
                        }
                      } else {
                        yellowSegmentPercent = Math.min(
                          30,
                          (4 / 24 / totalSpanDays) * 100,
                        );
                      }

                      let mainSegmentColor = "#f44336";
                      let borderColor = "#d32f2f";

                      if (loadStatus === "paused") {
                        mainSegmentColor = "#FF9800";
                        borderColor = "#F57C00";
                      } else if (loadStatus === "loaded_not_started") {
                        mainSegmentColor = "#9E9E9E";
                        borderColor = "#757575";
                      }

                      const testName = getTestName(load);
                      const partCount = load.parts?.length || 0;
                      const machineDisplayName =
                        load.machineId || load.chamber || "Unknown Machine";

                      const tooltipLines = [
                        `Load Status: ${
                          loadStatus === "running"
                            ? "Test Running"
                            : loadStatus === "paused"
                              ? "Test Paused"
                              : loadStatus === "loaded_not_started"
                                ? "Loaded (Not Started)"
                                : "Unknown"
                        }`,
                        `Equipment: ${machineDisplayName}`,
                        `Test: ${testName}`,
                        `Parts: ${partCount}`,
                        `---`,
                        `Loaded: ${formatDateTime(loadedTime)}`,
                      ];

                      if (startTime) {
                        tooltipLines.push(
                          `Timer Started: ${formatDateTime(startTime)}`,
                        );
                      } else {
                        tooltipLines.push(`Timer: Not started yet`);
                      }

                      tooltipLines.push(`Duration: ${durationHours} hours`);

                      if (
                        endTime &&
                        (loadStatus === "running" || loadStatus === "paused")
                      ) {
                        tooltipLines.push(
                          `Estimated End: ${formatDateTime(endTime)}`,
                        );
                      }

                      tooltipLines.push(`---`);

                      const remainingTime =
                        calculateRemainingTimeForDisplay(load);
                      if (remainingTime) {
                        tooltipLines.push(`${remainingTime}`);
                      } else if (loadStatus === "loaded_not_started") {
                        tooltipLines.push(`Load created but test not started`);
                      }

                      const tooltipText = tooltipLines.join("\n");

                      return (
                        <div
                          key={`load-${load.id}-${loadIdx}`}
                          className="absolute top-2 bottom-2 flex shadow-md cursor-pointer z-20"
                          style={{
                            left: `${adjustedLeft}%`,
                            width: `${adjustedWidth}%`,
                            minWidth: "2px",
                            borderRadius: "0 4px 4px 0",
                            border: `1px solid ${borderColor}`,
                            overflow: "hidden",
                          }}
                          title={tooltipText}
                        >
                          {showYellowSegment && yellowSegmentPercent > 0 && (
                            <div
                              className="h-full"
                              style={{
                                width: `${yellowSegmentPercent}%`,
                                backgroundColor: "#FFD54F",
                                backgroundImage:
                                  "linear-gradient(45deg, rgba(255, 213, 79, 0.9) 25%, transparent 25%, transparent 50%, rgba(255, 213, 79, 0.9) 50%, rgba(255, 213, 79, 0.9) 75%, transparent 75%, transparent)",
                                backgroundSize: "20px 20px",
                                minWidth: "2px",
                              }}
                              title="Loading/Setup Period"
                            >
                              {adjustedWidth > 10 &&
                                yellowSegmentPercent > 10 &&
                                loadStatus === "loaded_not_started" && (
                                  <div className="text-[8px] text-gray-800 font-bold rotate-90 origin-center mt-6 whitespace-nowrap">
                                    LOADED
                                  </div>
                                )}
                            </div>
                          )}

                          {loadStatus !== "loaded_not_started" && (
                            <div
                              className="h-full flex flex-col items-center justify-center text-white text-xs font-medium"
                              style={{
                                flex: 1,
                                backgroundColor: mainSegmentColor,
                                minWidth: "2px",
                              }}
                            >
                              {adjustedWidth > 3 && (
                                <div className="px-1 text-center">
                                  <div className="font-semibold text-[10px] truncate text-white" style={{ maxWidth: "100%" }}>
                                    {testName}
                                  </div>
                                  <div className="text-[8px] text-white opacity-90 mt-0.5">
                                    {partCount} part{partCount !== 1 ? "s" : ""} · {durationHours}h
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Task Creation Modal */}
      {isAdminUser && isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Schedule Task - {selectedMachine?.machine_id}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Test Name Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name *
                </label>
                <select
                  value={formData.testName}
                  onChange={(e) =>
                    setFormData({ ...formData, testName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a test</option>
                  {testNames.map((name, idx) => (
                    <option key={idx} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start DateTime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startDateTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* End DateTime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endDateTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreateTask()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </div>

            {/* Info Text */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Tasks are automatically managed based on
                time:
                <br />• <strong>Scheduled:</strong> Before start time
                <br />• <strong>Ongoing:</strong> Between start and end time
                <br />• <strong>Completed:</strong> Auto-deleted after end time
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
