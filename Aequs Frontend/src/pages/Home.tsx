import React, { useState, useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import {
  Home as HomeIcon,
  Package,
  Clock,
  CheckCircle,
  BarChart3,
  Search,
  Calendar,
  HardDrive,
  FileText,
  Zap,
  X,
  Eye,
  ChevronRight,
  Filter,
  Download,
  MoreVertical,
  AlertCircle,
  TrendingUp,
  Users,
  Tag,
  Building,
  Layers,
  Target,
  Hash,
  User,
  Copy,
  Check,
  Scan, // New import
  ZapOff, // New import
  Square, // New import
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  downloadChamberLoadReport,
  downloadMultipleChamberLoadReports,
  getDefaultChamberLoadData,
  hydrateChamberLoadData,
} from "../lib/chamberloadreport";
import {
  fetchTestingParts,
  type TestingPartDto,
  findPartInScannedParts,
} from "../lib/backendApi";
import type { ChamberLoadData } from "../lib/chamberloadreport";
import {
  normalizeChamberLoadRecord,
  normalizeTestingPartRecord,
  type NormalizedChamberLoad,
} from "../lib/chamberLoadStore";
import { toast } from "@/components/ui/use-toast";
import TestingPartsTable from "./TestingPartsTable";

// Type definitions based on ChamberLoad
interface TestPart {
  partNumber: string;
  serialNumber: string;
  ticketCode: string;
  testId: string;
  testName: string;
  loadedAt: string;
  scanStatus: string;
  duration: string;
}

interface MachineTest {
  id: string;
  testName: string;
  duration: string;
  status: number;
  statusText: string;
  requiredQty: number;
  allocatedParts: number;
  remainingQty: number;
  alreadyAllocated: number;
}

interface MachineDetails {
  machine: string;
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  totalTests: number;
  tests: MachineTest[];
  estimatedDuration: number;
}

type ChamberLoad = NormalizedChamberLoad & {
  machineDetails?:
    | (ChamberLoadData["machineDetails"] &
        Partial<MachineDetails> & {
          totalTests?: number;
          tests?: Array<
            Partial<MachineTest> & {
              time?: string | number;
            }
          >;
        })
    | undefined;
  parts: Array<
    ChamberLoadData["parts"][number] & {
      testValue?: string | number;
      status?: string | number;
      requiresReload?: boolean;
      requiresUnload?: boolean;
    }
  >;
};

const normalizeTestStatusText = (status?: number | string): string => {
  const numericStatus =
    typeof status === "number" ? status : parseInt(String(status ?? ""), 10);
  switch (numericStatus) {
    case 3:
      return "Completed";
    case 2:
      return "In Progress";
    case 4:
      return "Failed";
    case 1:
      return "Pending";
    default:
      return "Unknown";
  }
};

const processChamberLoadData = (load: ChamberLoad) => {
  console.log("load", load);
  const testsSource = Array.isArray(load.machineDetails?.tests)
    ? load.machineDetails?.tests
    : [];
  const tests: MachineTest[] = testsSource.map((test) => {
    const statusValue =
      typeof test?.status === "number"
        ? test.status
        : parseInt(String(test?.status ?? ""), 10) || 0;
    const durationValue =
      test?.time ?? test?.duration ?? load.duration ?? load.testValue ?? "";

    return {
      id: String(test?.id ?? ""),
      testName: String(test?.testName ?? "Unknown Test"),
      duration:
        durationValue !== undefined && durationValue !== null
          ? String(durationValue)
          : "0",
      status: statusValue,
      statusText: normalizeTestStatusText(statusValue),
      requiredQty:
        typeof test?.requiredQty === "number"
          ? test.requiredQty
          : parseInt(String(test?.requiredQty ?? "0"), 10) || 0,
      allocatedParts:
        typeof test?.allocatedParts === "number"
          ? test.allocatedParts
          : parseInt(String(test?.allocatedParts ?? "0"), 10) || 0,
      remainingQty:
        typeof test?.remainingQty === "number"
          ? test.remainingQty
          : parseInt(String(test?.remainingQty ?? "0"), 10) || 0,
      alreadyAllocated:
        typeof test?.alreadyAllocated === "number"
          ? test.alreadyAllocated
          : parseInt(String(test?.alreadyAllocated ?? "0"), 10) || 0,
    };
  });

  console.log("chamberload", processChamberLoadData);

  const partsSource = Array.isArray(load.parts) ? load.parts : [];
  const fallbackTestName = tests[0]?.testName ?? "Unknown Test";
  const fallbackTicketCode =
    load.machineDetails?.ticketCode ??
    String(partsSource.find((part) => part?.ticketCode)?.ticketCode ?? "");
  const parts: TestPart[] = partsSource.map((part) => {
    const durationValue =
      part?.duration ??
      part?.testValue ??
      load.testValue ??
      load.duration ??
      "";
    const scanStatusRaw = part?.scanStatus ?? part?.status;
    const scanStatus =
      typeof scanStatusRaw === "string"
        ? scanStatusRaw
        : scanStatusRaw != null
          ? String(scanStatusRaw)
          : "Pending";

    return {
      partNumber: String(part?.partNumber ?? "Unknown Part"),
      serialNumber: String(part?.serialNumber ?? "N/A"),
      ticketCode: String(part?.ticketCode ?? fallbackTicketCode),
      testId: String(part?.testId ?? ""),
      testName: String(part?.testName ?? fallbackTestName),
      loadedAt: String(part?.loadedAt ?? load.loadedAt ?? ""),
      scanStatus,
      duration:
        durationValue !== undefined && durationValue !== null
          ? String(durationValue)
          : "0",
    };
  });

  const estimatedDuration = tests.reduce((maxDuration, test) => {
    const numericDuration = parseFloat(test.duration ?? "0");
    return Number.isFinite(numericDuration) && numericDuration > maxDuration
      ? numericDuration
      : maxDuration;
  }, 0);

  const recordDurationRaw =
    typeof load.duration === "number"
      ? load.duration
      : parseFloat(String(load.duration ?? load.testValue ?? 0)) || 0;

  const normalizedStatus = (() => {
    const statusValue = String(
      load.status ?? load.testStatus ?? "",
    ).toLowerCase();
    if (load.isCompleted || statusValue === "completed") return "Completed";
    if (statusValue === "paused") return "Paused";
    if (statusValue === "checkpoint_failed" || statusValue === "failed")
      return "Attention Needed";
    if (
      statusValue === "loaded" ||
      statusValue === "in_progress" ||
      load.timerStatus === "start"
    )
      return "In Progress";
    return "Queued";
  })();

  return {
    loadId: load.id,
    chamber: String(
      load.chamber ??
        load.machine ??
        load.machineDescription ??
        "Unknown Chamber",
    ),
    parts,
    totalParts: parts.length,
    machineDetails: {
      machine: String(
        load.machineDetails?.machine ??
          load.machineDescription ??
          load.chamber ??
          "Unknown Machine",
      ),
      ticketCode: String(load.machineDetails?.ticketCode ?? fallbackTicketCode),
      project: String(load.machineDetails?.project ?? "Unknown Project"),
      build: String(load.machineDetails?.build ?? "Unknown Build"),
      colour: String(load.machineDetails?.colour ?? "Unknown Colour"),
      totalTests: load.machineDetails?.totalTests ?? tests.length,
      tests,
      estimatedDuration: estimatedDuration || recordDurationRaw,
    },
    loadedAt: String(load.loadedAt ?? ""),
    estimatedCompletion: String(load.estimatedCompletion ?? ""),
    duration: recordDurationRaw,
    testRecords: parts,
    status: normalizedStatus,
    completedAt: load.completedAt ?? undefined,
    chamberLoad: load,
  };
};

interface Stats {
  totalTests: number;
  inProgress: number;
  completed: number;
  totalParts: number;
  activeMachines: number;
  completedToday: number;
}

interface TicketGroup {
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  totalLoads: number;
  totalParts: number;
  inProgress: number;
  completed: number;
  machines: Set<string>;
  loads: ReturnType<typeof processChamberLoadData>[];
}

type FilterStatus = "all" | "in-progress" | "completed";
type TicketStatus = "in-progress" | "completed" | "mixed" | "unknown";

const sanitizeFilenameSegment = (value: string, fallback: string): string => {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
};

const buildTicketReportNumber = (value?: number | string | null): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString().padStart(3, "0");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "000";
    }

    const numeric = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(numeric)) {
      return numeric.toString().padStart(3, "0");
    }

    return sanitizeFilenameSegment(trimmed, "000");
  }

  return "000";
};

const buildTicketReportDateSegment = (value?: string | null): string => {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10).replace(/-/g, "");
    }
  }

  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
};

const buildTicketReportFilename = (ticket: TicketGroup): string => {
  const primaryLoad =
    ticket.loads.find((load) => load.loadedAt) ?? ticket.loads[0];
  const ticketSegment = sanitizeFilenameSegment(ticket.ticketCode, "Ticket");
  const reportNumberSegment = buildTicketReportNumber(
    primaryLoad?.chamberLoad?.id ?? primaryLoad?.loadId ?? ticket.totalLoads,
  );
  const dateSegment = buildTicketReportDateSegment(
    primaryLoad?.loadedAt ?? null,
  );
  return `${ticketSegment}_Report-${reportNumberSegment}_${dateSegment}.xlsx`;
};

const HomeDashboard: React.FC = () => {
  const [chamberLoads, setChamberLoads] = useState<
    ReturnType<typeof processChamberLoadData>[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketGroup | null>(
    null,
  );
  const [showTicketModal, setShowTicketModal] = useState<boolean>(false);
  const [copiedTicketCode, setCopiedTicketCode] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(
    null,
  );
  const [downloadingChamberReport, setDownloadingChamberReport] =
    useState<boolean>(false);
  // New scanner states
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scannedPartDetails, setScannedPartDetails] = useState<any>(null);
  const [showPartDetailsModal, setShowPartDetailsModal] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  // Download selection modal states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<any[]>([]);
  const [selectedDownloadOption, setSelectedDownloadOption] = useState<
    number | null
  >(null);
  const [pendingTicket, setPendingTicket] = useState<TicketGroup | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    inProgress: 0,
    completed: 0,
    totalParts: 0,
    activeMachines: 0,
    completedToday: 0,
  });

  useEffect(() => {
    void loadChamberLoads();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [chamberLoads]);

  // Auto-focus scanner input when active
  useEffect(() => {
    if (isScannerActive && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScannerActive]);

  // REMOVE async keyword
  const getUserRole = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    try {
      const userData = JSON.parse(user);
      return userData.role?.toLowerCase();
    } catch {
      return localStorage.getItem("userRole")?.toLowerCase();
    }
  };

  const userRole = getUserRole(); // Now returns string, not Promise

  // Scanner functions
  const toggleScanner = () => {
    setIsScannerActive(!isScannerActive);
    if (!isScannerActive) {
      setScanInput("");
      setScannedPartDetails(null);
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      toast({
        title: "Scanner Activated",
        description: "Scan a part number to view details",
        duration: 2000,
      });
    } else {
      toast({
        title: "Scanner Deactivated",
        description: "Scanner has been stopped",
        duration: 2000,
      });
    }
  };

  const handleScanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScanInput(e.target.value);
  };

  const handleScanKeyPress = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await processScannedPart(scanInput.trim());
    }
  };

  const processScannedPart = async (partNumber: string) => {
    if (!partNumber) {
      toast({
        variant: "destructive",
        title: "Invalid Scan",
        description: "Please scan a valid part number",
        duration: 3000,
      });
      return;
    }

    try {
      // Search in current chamber loads
      let foundInChamberLoads = false;
      let partInfo: any = null;

      for (const load of chamberLoads) {
        const part = load.parts.find(
          (p) => p.partNumber?.toUpperCase() === partNumber.toUpperCase(),
        );
        if (part) {
          foundInChamberLoads = true;
          partInfo = {
            partNumber: part.partNumber,
            serialNumber: part.serialNumber,
            ticketCode: part.ticketCode,
            testName: part.testName,
            testId: part.testId,
            loadedAt: part.loadedAt,
            scanStatus: part.scanStatus,
            duration: part.duration,
            chamber: load.chamber,
            status: load.status,
            machineDetails: load.machineDetails,
            completedAt: load.completedAt,
            source: "Chamber Load",
          };
          break;
        }
      }

      // If not found in chamber loads, search in OQC records
      if (!foundInChamberLoads) {
        const result = await findPartInScannedParts(partNumber);
        if (result.found && result.partDetails) {
          partInfo = {
            partNumber: result.partDetails.partNumber,
            ticketCode: result.partDetails.ticketCode,
            project: result.partDetails.project,
            build: result.partDetails.build,
            colour: result.partDetails.colour,
            source: result.partDetails.source,
            processStage: result.partDetails.processStage,
            session: result.partDetails.session,
            status: "Not in Testing",
            scannedPartRecord: result.partDetails.scannedPartRecord,
            source: "OQC Records",
          };
        }
      }

      if (partInfo) {
        setScannedPartDetails(partInfo);
        setShowPartDetailsModal(true);
        setScanInput("");
        toast({
          title: "✅ Part Found",
          description: `Part ${partNumber} located successfully`,
          duration: 3000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Part Not Found",
          description: `Part ${partNumber} not found in testing or OQC records`,
          duration: 4000,
        });
        setScanInput("");
      }

      // Keep scanner active and refocus
      if (isScannerActive) {
        setTimeout(() => {
          scanInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("Error processing scanned part:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process scanned part",
        duration: 3000,
      });
      setScanInput("");
    }
  };

  const closePartDetailsModal = () => {
    setShowPartDetailsModal(false);
    setScannedPartDetails(null);
    if (isScannerActive) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  };

  const loadChamberLoads = async (): Promise<void> => {
    setLoading(true);
    try {
      const testingParts = await fetchTestingParts();
      const normalizedTestingLoads = testingParts
        .map(normalizeTestingPartRecord)
        .map(processChamberLoadData);
      setChamberLoads(normalizedTestingLoads);
    } catch (error) {
      console.error("Unexpected error loading testing parts:", error);
      setChamberLoads([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): void => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalParts = 0;
    let inProgress = 0;
    let completed = 0;
    let completedToday = 0;
    const activeMachinesSet = new Set<string>();

    chamberLoads.forEach((load) => {
      const partCount = load.parts?.length || 0;
      totalParts += partCount;
      activeMachinesSet.add(load.chamber);

      if (load.status === "Completed") {
        completed++;
        if (load.completedAt) {
          const completedDate = new Date(load.completedAt);
          const completedDay = new Date(
            completedDate.getFullYear(),
            completedDate.getMonth(),
            completedDate.getDate(),
          );
          if (completedDay.getTime() === today.getTime()) {
            completedToday++;
          }
        }
      } else {
        inProgress++;
      }
    });

    setStats({
      totalTests: totalParts,
      inProgress,
      completed,
      totalParts,
      activeMachines: activeMachinesSet.size,
      completedToday,
    });
  };

  const groupByTicket = (): TicketGroup[] => {
    const grouped: Record<string, TicketGroup> = {};

    chamberLoads.forEach((load) => {
      const ticketCode = load.machineDetails?.ticketCode || "Unknown Ticket";

      if (!grouped[ticketCode]) {
        grouped[ticketCode] = {
          ticketCode,
          project: load.machineDetails?.project || "Unknown",
          build: load.machineDetails?.build || "Unknown",
          colour: load.machineDetails?.colour || "Unknown",
          totalLoads: 0,
          totalParts: 0,
          inProgress: 0,
          completed: 0,
          machines: new Set<string>(),
          loads: [],
        };
      }

      grouped[ticketCode].totalLoads++;
      grouped[ticketCode].totalParts += load.parts?.length || 0;
      grouped[ticketCode].machines.add(load.chamber);

      if (load.status === "Completed") {
        grouped[ticketCode].completed++;
      } else {
        grouped[ticketCode].inProgress++;
      }

      grouped[ticketCode].loads.push(load);
    });

    return Object.values(grouped);
  };

  const getFilteredTickets = (): TicketGroup[] => {
    const tickets = groupByTicket();

    let filtered = tickets.filter(
      (ticket: TicketGroup) =>
        ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.build.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filterStatus === "in-progress") {
      filtered = filtered.filter(
        (ticket: TicketGroup) => ticket.inProgress > 0,
      );
    } else if (filterStatus === "completed") {
      filtered = filtered.filter(
        (ticket: TicketGroup) =>
          ticket.completed > 0 && ticket.inProgress === 0,
      );
    }

    return filtered;
  };

  const getStatusBadge = (status: TicketStatus): JSX.Element => {
    switch (status) {
      case "in-progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case "mixed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Mixed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const getTicketStatus = (ticket: TicketGroup): TicketStatus => {
    if (ticket.inProgress > 0 && ticket.completed > 0) return "mixed";
    if (ticket.inProgress > 0) return "in-progress";
    if (ticket.completed > 0) return "completed";
    return "unknown";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDurationText = (duration: number): string => {
    if (duration >= 24) {
      const days = Math.floor(duration / 24);
      const hours = duration % 24;
      return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
    return `${duration}h`;
  };

  const handleViewTicket = (ticket: TicketGroup) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setSelectedTicket(null);
  };

  const copyTicketCode = (ticketCode: string) => {
    navigator.clipboard.writeText(ticketCode);
    setCopiedTicketCode(ticketCode);
    setTimeout(() => setCopiedTicketCode(null), 2000);
  };

  const handleDownloadChamberReport = async () => {
    if (downloadingChamberReport) return;

    // Use only the parts array from each testing_parts record for the report
    const chosenLoads = chamberLoads.map((load) => ({
      ...load.chamberLoad,
      parts: load.parts,
    }));

    if (chosenLoads.length === 0) {
      alert(
        "No chamber load data available to export. Please refresh the dashboard and try again.",
      );
      return;
    }

    setDownloadingChamberReport(true);
    try {
      if (chosenLoads.length > 1) {
        await downloadMultipleChamberLoadReports(chosenLoads);
      } else {
        const load = chosenLoads[0];
        const hydrated = hydrateChamberLoadData(load);
        await downloadChamberLoadReport(hydrated, {
          ticketCode: hydrated.machineDetails?.ticketCode,
          reportNumber: hydrated.id,
          reportDate: hydrated.loadedAt,
        });
      }
    } catch (error) {
      console.error("Error downloading chamber load report:", error);
      alert("Failed to download chamber load report. Please try again.");
    } finally {
      setDownloadingChamberReport(false);
    }
  };

  const formatDateForExcel = (dateString: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Function to generate chart on canvas
  const generateChartImage = (data: any[], title: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;

    // Clear canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chart dimensions
    const margin = 80;
    const width = canvas.width - 2 * margin;
    const height = canvas.height - 2 * margin;

    // Sample data for demonstration (Force vs Displacement)
    const testData =
      data.length > 0
        ? data
        : [
            { Time: 0, Displacement: 0, Force: 0 },
            { Time: 0.2, Displacement: 0.075, Force: 8.4 },
            { Time: 0.4, Displacement: 0.175, Force: 38.4 },
            { Time: 0.6, Displacement: 0.275, Force: 88.4 },
            { Time: 0.8, Displacement: 0.375, Force: 158.4 },
            { Time: 1.0, Displacement: 0.475, Force: 248.4 },
            { Time: 1.2, Displacement: 0.575, Force: 358.4 },
          ];

    const maxTime = Math.max(...testData.map((d) => d.Time));
    const maxForce = Math.max(...testData.map((d) => d.Force));

    // Draw title
    ctx.fillStyle = "black";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, 40);

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, margin + height);
    ctx.lineTo(margin + width, margin + height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Y-axis label
    ctx.save();
    ctx.translate(30, margin + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Force [N]", 0, 0);
    ctx.restore();

    // Draw X-axis label
    ctx.textAlign = "center";
    ctx.fillText("Displacement [mm]", margin + width / 2, margin + height + 50);

    // Draw Y-axis ticks
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    for (let i = 0; i <= 6; i++) {
      const y = margin + height - (i / 6) * height;
      const forceValue = (i / 6) * maxForce;
      ctx.beginPath();
      ctx.moveTo(margin - 5, y);
      ctx.lineTo(margin, y);
      ctx.stroke();
      ctx.fillText(Math.round(forceValue).toString(), margin - 10, y + 4);
    }

    // Draw X-axis ticks
    ctx.textAlign = "center";
    for (let i = 0; i <= 6; i++) {
      const x = margin + (i / 6) * width;
      ctx.beginPath();
      ctx.moveTo(x, margin + height);
      ctx.lineTo(x, margin + height + 5);
      ctx.stroke();
      ctx.fillText((i * 0.1).toFixed(1), x, margin + height + 20);
    }

    // Draw line chart
    ctx.beginPath();
    testData.forEach((point, index) => {
      const x = margin + (point.Time / maxTime) * width;
      const y = margin + height - (point.Force / maxForce) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    testData.forEach((point) => {
      const x = margin + (point.Time / maxTime) * width;
      const y = margin + height - (point.Force / maxForce) * height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    return canvas
      .toDataURL("image/png")
      .replace(/^data:image\/\w+;base64,/, "");
  };

  // Function to create Excel workbook for a ticket
  const createTicketExcelReport = async (ticket: TicketGroup) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Testing Dashboard";
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.getCell("A1").value = `TICKET REPORT - ${ticket.ticketCode}`;
    summarySheet.getCell("A1").font = { bold: true, size: 16 };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };
    summarySheet.mergeCells("A1:D1");

    summarySheet.getCell("A3").value = "Ticket Code:";
    summarySheet.getCell("B3").value = ticket.ticketCode;
    summarySheet.getCell("A4").value = "Project:";
    summarySheet.getCell("B4").value = ticket.project;
    summarySheet.getCell("A5").value = "Build:";
    summarySheet.getCell("B5").value = ticket.build;
    summarySheet.getCell("A6").value = "Colour:";
    summarySheet.getCell("B6").value = ticket.colour;
    summarySheet.getCell("A7").value = "Total Loads:";
    summarySheet.getCell("B7").value = ticket.totalLoads;
    summarySheet.getCell("A8").value = "Total Parts:";
    summarySheet.getCell("B8").value = ticket.totalParts;
    summarySheet.getCell("A9").value = "Completed:";
    summarySheet.getCell("B9").value = ticket.completed;
    summarySheet.getCell("A10").value = "In Progress:";
    summarySheet.getCell("B10").value = ticket.inProgress;
    summarySheet.getCell("A11").value = "Machines Used:";
    summarySheet.getCell("B11").value = Array.from(ticket.machines).join(", ");

    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 40;

    // Test Loads Sheet
    const loadsSheet = workbook.addWorksheet("Test Loads");

    loadsSheet.getCell("A1").value = "TEST LOADS SUMMARY";
    loadsSheet.getCell("A1").font = { bold: true, size: 16 };
    loadsSheet.getCell("A1").alignment = { horizontal: "center" };
    loadsSheet.mergeCells("A1:H1");

    const loadHeaders = [
      "Load ID",
      "Chamber",
      "Status",
      "Parts Count",
      "Loaded At",
      "Completed At",
      "Duration (hrs)",
      "Test Name",
    ];
    const headerRow = loadsSheet.getRow(3);
    loadHeaders.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });

    ticket.loads.forEach((load, index) => {
      const row = loadsSheet.getRow(index + 4);
      row.getCell(1).value = load.loadId;
      row.getCell(2).value = load.chamber;
      row.getCell(3).value = load.status;

      const statusCell = row.getCell(3);
      if (load.status === "Completed") {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        };
        statusCell.font = { color: { argb: "FF006100" }, bold: true };
      } else {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        };
        statusCell.font = { color: { argb: "FF9C0006" }, bold: true };
      }

      row.getCell(4).value = load.parts?.length || 0;
      row.getCell(5).value = formatDateForExcel(load.loadedAt);
      row.getCell(6).value = load.completedAt
        ? formatDateForExcel(load.completedAt)
        : "N/A";
      row.getCell(7).value = load.duration;
      row.getCell(8).value = load.machineDetails?.tests?.[0]?.testName || "N/A";
    });

    [15, 20, 15, 12, 25, 25, 15, 30].forEach((width, index) => {
      loadsSheet.getColumn(index + 1).width = width;
    });

    // Parts Details Sheet
    const partsSheet = workbook.addWorksheet("Parts Details");

    partsSheet.getCell("A1").value = "PARTS DETAILS";
    partsSheet.getCell("A1").font = { bold: true, size: 16 };
    partsSheet.getCell("A1").alignment = { horizontal: "center" };
    partsSheet.mergeCells("A1:G1");

    const partsHeaders = [
      "Part Number",
      "Serial Number",
      "Ticket Code",
      "Test Name",
      "Loaded At",
      "Duration (hrs)",
      "Scan Status",
    ];
    const partsHeaderRow = partsSheet.getRow(3);
    partsHeaders.forEach((header, index) => {
      const cell = partsHeaderRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });

    let rowIndex = 4;
    ticket.loads.forEach((load) => {
      load.parts?.forEach((part) => {
        const row = partsSheet.getRow(rowIndex++);
        row.getCell(1).value = part.partNumber;
        row.getCell(2).value = part.serialNumber;
        row.getCell(3).value = part.ticketCode;
        row.getCell(4).value = part.testName;
        row.getCell(5).value = formatDateForExcel(part.loadedAt);
        row.getCell(6).value = part.duration;
        row.getCell(7).value = part.scanStatus;

        const statusCell = row.getCell(7);
        if (part.scanStatus === "OK") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC6EFCE" },
          };
          statusCell.font = { color: { argb: "FF006100" } };
        }
      });
    });

    [20, 20, 30, 30, 25, 15, 15].forEach((width, index) => {
      partsSheet.getColumn(index + 1).width = width;
    });

    // Charts Sheet
    const chartsSheet = workbook.addWorksheet("Force vs Displacement Charts");

    chartsSheet.getCell("A1").value = "FORCE VS DISPLACEMENT ANALYSIS";
    chartsSheet.getCell("A1").font = { bold: true, size: 16 };
    chartsSheet.getCell("A1").alignment = { horizontal: "center" };
    chartsSheet.mergeCells("A1:C1");

    // Generate and add chart images
    try {
      const chartData1 = generateChartImage(
        [],
        `${ticket.ticketCode} - Test 1`,
      );
      const chartData2 = generateChartImage(
        [],
        `${ticket.ticketCode} - Test 2`,
      );

      const imageId1 = workbook.addImage({
        base64: chartData1,
        extension: "png",
      });

      const imageId2 = workbook.addImage({
        base64: chartData2,
        extension: "png",
      });

      chartsSheet.addImage(imageId1, {
        tl: { col: 0, row: 3 },
        br: { col: 9, row: 23 },
      });

      chartsSheet.addImage(imageId2, {
        tl: { col: 0, row: 30 },
        br: { col: 9, row: 50 },
      });
    } catch (error) {
      console.error("Error adding charts:", error);
    }

    return workbook;
  };

  // Main download handler
  const handleDownloadReport = async (ticket: TicketGroup) => {
    console.log("donwloadreportforticket", ticket);
    setDownloadingTicket(ticket.ticketCode);
    setIsGeneratingReport(true);

    try {
      const loadsWithChamberData = ticket.loads
        .filter((load) => Boolean(load.chamberLoad))
        .map((load) => ({
          processed: load,
          chamberLoad: load.chamberLoad!,
        }));

      let selectedLoads = loadsWithChamberData;

      if (loadsWithChamberData.length > 1) {
        // Show modal instead of prompt
        const options = loadsWithChamberData.map((entry, index) => {
          const partNumbers = (entry.chamberLoad.parts ?? [])
            .map(
              (part) =>
                part?.partNumber ?? part?.serialNumber ?? `Part-${index + 1}`,
            )
            .slice(0, 3)
            .join(", ");
          const checkpointSummary =
            entry.chamberLoad.parts?.[0]?.checkpointInfo?.checkpoints?.join(
              ", ",
            ) ?? "No checkpoints";
          return {
            index,
            label: `${partNumbers || "Unnamed Part"}`,
            checkpoints: checkpointSummary,
          };
        });

        setDownloadOptions(options);
        setPendingTicket(ticket);
        setSelectedDownloadOption(null);
        setShowDownloadModal(true);
        setIsGeneratingReport(false);
        setDownloadingTicket(null);
        return;
      }

      if (selectedLoads.length > 0) {
        if (selectedLoads.length > 1) {
          // Flatten and uniqueify loads by ID to ensure single-file download
          const uniqueLoadsMap = new Map();
          selectedLoads.forEach((s) => {
            if (s.chamberLoad?.id)
              uniqueLoadsMap.set(s.chamberLoad.id, s.chamberLoad);
          });
          const uniqueLoadsList = Array.from(uniqueLoadsMap.values());

          if (uniqueLoadsList.length > 1) {
            await downloadMultipleChamberLoadReports(uniqueLoadsList);
          } else if (uniqueLoadsList.length === 1) {
            const hydrated = hydrateChamberLoadData(uniqueLoadsList[0]);
            await downloadChamberLoadReport(hydrated, {
              ticketCode: ticket.ticketCode,
              reportNumber: hydrated?.id ?? uniqueLoadsList[0].loadId,
              reportDate: uniqueLoadsList[0].loadedAt,
            });
          }
        } else {
          const entry = selectedLoads[0];
          const hydrated = hydrateChamberLoadData(entry.chamberLoad);
          await downloadChamberLoadReport(hydrated, {
            ticketCode: ticket.ticketCode,
            reportNumber: hydrated?.id ?? entry.processed.loadId,
            reportDate: entry.processed.loadedAt,
          });
        }
      } else {
        const workbook = await createTicketExcelReport(ticket);
        const filename = buildTicketReportFilename(ticket);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        saveAs(blob, filename);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Error generating report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
      setDownloadingTicket(null);
    }
  };

  // Handle download modal confirmation
  const handleDownloadModalConfirm = async () => {
    if (!pendingTicket) return;

    setShowDownloadModal(false);
    setDownloadingTicket(pendingTicket.ticketCode);
    setIsGeneratingReport(true);

    try {
      const loadsWithChamberData = pendingTicket.loads
        .filter((load) => Boolean(load.chamberLoad))
        .map((load) => ({
          processed: load,
          chamberLoad: load.chamberLoad!,
        }));

      let selectedLoads = loadsWithChamberData;

      if (selectedDownloadOption === -1) {
        // Download all
        selectedLoads = [...loadsWithChamberData];
      } else if (
        selectedDownloadOption !== null &&
        selectedDownloadOption >= 0
      ) {
        // Download specific load
        selectedLoads = [loadsWithChamberData[selectedDownloadOption]];
      } else {
        // No selection made
        toast({
          title: "No Selection",
          description: "Please select an option before confirming.",
          variant: "destructive",
        });
        setIsGeneratingReport(false);
        setDownloadingTicket(null);
        return;
      }

      if (selectedLoads.length > 0) {
        if (selectedLoads.length > 1) {
          const uniqueLoadsMap = new Map();
          selectedLoads.forEach((s) => {
            if (s.chamberLoad?.id)
              uniqueLoadsMap.set(s.chamberLoad.id, s.chamberLoad);
          });
          const uniqueLoadsList = Array.from(uniqueLoadsMap.values());

          if (uniqueLoadsList.length > 1) {
            await downloadMultipleChamberLoadReports(uniqueLoadsList);
          } else if (uniqueLoadsList.length === 1) {
            const hydrated = hydrateChamberLoadData(uniqueLoadsList[0]);
            await downloadChamberLoadReport(hydrated, {
              ticketCode: pendingTicket.ticketCode,
              reportNumber: hydrated?.id ?? uniqueLoadsList[0].loadId,
              reportDate: uniqueLoadsList[0].loadedAt,
            });
          }
        } else {
          const entry = selectedLoads[0];
          const hydrated = hydrateChamberLoadData(entry.chamberLoad);
          await downloadChamberLoadReport(hydrated, {
            ticketCode: pendingTicket.ticketCode,
            reportNumber: hydrated?.id ?? entry.processed.loadId,
            reportDate: entry.processed.loadedAt,
          });
        }
      }

      toast({
        title: "Success",
        description: "Report downloaded successfully!",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Error generating report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
      setDownloadingTicket(null);
      setPendingTicket(null);
      setDownloadOptions([]);
      setSelectedDownloadOption(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const filteredTickets = getFilteredTickets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4 md:p-8">
      <div className="xl:max-w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <HomeIcon className="text-white" size={32} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Testing Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Monitor all testing activities and ticket progress in
                  real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* <button
                onClick={handleDownloadChamberReport}
                disabled={downloadingChamberReport}
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  downloadingChamberReport
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white shadow-md hover:shadow-xl hover:shadow-blue-500/30 border border-gray-200 hover:border-transparent"
                }`}
              >
                {downloadingChamberReport ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download
                      size={18}
                      className="group-hover:animate-bounce"
                    />
                    Export
                  </>
                )}
              </button> */}
              {userRole !== "general" && (
                <button
                  onClick={handleDownloadChamberReport}
                  disabled={downloadingChamberReport}
                  className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    downloadingChamberReport
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white shadow-md hover:shadow-xl hover:shadow-blue-500/30 border border-gray-200 hover:border-transparent"
                  }`}
                >
                  {downloadingChamberReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download
                        size={18}
                        className="group-hover:animate-bounce"
                      />
                      Export
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  void loadChamberLoads();
                }}
                className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/40 hover:shadow-xl hover:shadow-blue-600/50 transition-all duration-300"
              >
                <Clock
                  size={18}
                  className="group-hover:rotate-180 transition-transform duration-500"
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-blue-200 overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Total Tests
                    </p>
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-1">
                      {stats.totalTests}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 pt-3 border-t border-gray-100">
                  <Package size={16} className="text-blue-500" />
                  <span>{stats.totalParts} total parts</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-amber-200 overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      In Progress
                    </p>
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-1">
                      {stats.inProgress}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 pt-3 border-t border-gray-100">
                  <HardDrive size={16} className="text-amber-500" />
                  <span>Across {stats.activeMachines} machines</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-emerald-200 overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Completed
                    </p>
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mt-1">
                      {stats.completed}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 pt-3 border-t border-gray-100">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>{stats.completedToday} today</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-purple-200 overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Active Machines
                    </p>
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mt-1">
                      {stats.activeMachines}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 pt-3 border-t border-gray-100">
                  <Zap size={16} className="text-purple-500" />
                  <span>Currently testing</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 opacity-50"></div>
          <div className="relative z-10 flex flex-col md:flex-row gap-5 items-center justify-between">
            {/* Scanner Button - LEFT SIDE */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleScanner}
                className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg ${
                  isScannerActive
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-red-500/40 hover:shadow-red-600/50"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/40 hover:shadow-emerald-600/50"
                }`}
              >
                {isScannerActive ? (
                  <>
                    <Square size={18} className="group-hover:animate-pulse" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Scan
                      size={18}
                      className="group-hover:scale-110 transition-transform"
                    />
                    Scan Part
                  </>
                )}
              </button>
              {/* Scanner Input - Only visible when active */}
              {isScannerActive && (
                <div className="relative">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={handleScanInputChange}
                    onKeyPress={handleScanKeyPress}
                    placeholder="Scan part number here..."
                    className="pl-11 pr-4 py-3 w-64 border-2 border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm shadow-lg shadow-emerald-500/20 bg-white"
                    autoComplete="off"
                  />
                  <Zap
                    className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-emerald-600 animate-pulse"
                    size={18}
                  />
                  <div className="absolute -bottom-7 left-0 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                    <span className="text-xs text-emerald-700 font-semibold">
                      Scanner Active
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Search and Filters - RIGHT SIDE */}
            <div className="flex-1 w-full md:ml-4">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search tickets, projects, builds..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  filterStatus === "all"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40"
                    : "bg-white/80 border-2 border-gray-200 text-gray-700 hover:bg-white hover:border-blue-300 hover:shadow-md"
                }`}
              >
                All ({chamberLoads.length})
              </button>
              <button
                onClick={() => setFilterStatus("in-progress")}
                className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  filterStatus === "in-progress"
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/40"
                    : "bg-white/80 border-2 border-gray-200 text-gray-700 hover:bg-white hover:border-amber-300 hover:shadow-md"
                }`}
              >
                In Progress ({stats.inProgress})
              </button>
              <button
                onClick={() => setFilterStatus("completed")}
                className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  filterStatus === "completed"
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/40"
                    : "bg-white/80 border-2 border-gray-200 text-gray-700 hover:bg-white hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                Completed ({stats.completed})
              </button>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                  Ticket Overview
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive testing status for all tickets
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <Filter className="text-blue-500" size={18} />
                <span className="text-sm font-medium text-gray-700">
                  Sorted by: Latest
                </span>
              </div>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-2xl mb-5 shadow-lg">
                <Package className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchTerm
                  ? "Try adjusting your search or filter to find what you're looking for."
                  : "No chamber load records found. Load some tests to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Project Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Testing Stats
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredTickets.map((ticket: TicketGroup, index: number) => (
                    <tr
                      key={index}
                      className="group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/20 transition-all duration-300"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                            <FileText className="text-white" size={22} />
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-gray-900">
                                {ticket.ticketCode}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyTicketCode(ticket.ticketCode);
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Copy ticket code"
                              >
                                {copiedTicketCode === ticket.ticketCode ? (
                                  <Check
                                    size={16}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-1">
                              {Array.from(ticket.machines)
                                .slice(0, 2)
                                .join(", ")}
                              {ticket.machines.size > 2 && "..."}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center text-sm">
                            <Building
                              size={14}
                              className="text-blue-500 mr-1.5"
                            />
                            <span className="font-semibold text-gray-900">
                              {ticket.project}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Tag size={14} className="mr-1.5 text-gray-400" />
                            {ticket.build} • {ticket.colour}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getStatusBadge(getTicketStatus(ticket))}
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">
                              Test Loads:
                            </span>
                            <span className="font-bold text-gray-900">
                              {ticket.totalLoads}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">
                              Parts:
                            </span>
                            <span className="font-bold text-gray-900">
                              {ticket.totalParts}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <div
                              className={`h-1.5 flex-1 rounded-full ${ticket.inProgress > 0 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gray-200"}`}
                            ></div>
                            <div
                              className={`h-1.5 flex-1 rounded-full ${ticket.completed > 0 ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gray-200"}`}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                        {ticket.loads.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <Calendar
                                size={14}
                                className="mr-1.5 text-blue-500"
                              />
                              <span className="font-medium">
                                {formatDate(
                                  ticket.loads[ticket.loads.length - 1]
                                    .loadedAt,
                                )}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {
                                ticket.loads[ticket.loads.length - 1].parts
                                  .length
                              }{" "}
                              parts loaded
                            </div>
                          </div>
                        ) : (
                          "No activity"
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                        {getTicketStatus(ticket) === "completed" ? (
                          <button
                            onClick={() => handleDownloadReport(ticket)}
                            disabled={
                              isGeneratingReport &&
                              downloadingTicket === ticket.ticketCode
                            }
                            className={`group inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-md ${
                              isGeneratingReport &&
                              downloadingTicket === ticket.ticketCode
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-lg hover:shadow-emerald-500/40"
                            }`}
                            title="Download detailed Excel report with charts"
                          >
                            {isGeneratingReport &&
                            downloadingTicket === ticket.ticketCode ? (
                              <>
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download
                                  size={16}
                                  className="mr-2 group-hover:animate-bounce"
                                />
                                Download
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"
                            title="Report available only when all tests are completed"
                          >
                            <Download size={16} className="mr-2 opacity-50" />
                            Not Available
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="group inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white border-2 border-gray-200 hover:border-transparent shadow-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
                          >
                            <Eye
                              size={16}
                              className="mr-2 group-hover:scale-110 transition-transform"
                            />
                            View Details
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <TestingPartsTable />

        {/* Legend */}
        <div className="mt-8 relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/20 to-pink-50/30 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Status Indicators
              </h4>
              <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1.5 rounded-lg shadow-sm">
                Click view to see detailed information
              </span>
            </div>
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center group">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mr-3 shadow-lg shadow-amber-500/30 group-hover:scale-125 transition-transform"></div>
                <span className="text-sm font-medium text-gray-700">
                  In Progress - Active testing
                </span>
              </div>
              <div className="flex items-center group">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 mr-3 shadow-lg shadow-emerald-500/30 group-hover:scale-125 transition-transform"></div>
                <span className="text-sm font-medium text-gray-700">
                  Completed - All tests finished
                </span>
              </div>
              <div className="flex items-center group">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mr-3 shadow-lg shadow-blue-500/30 group-hover:scale-125 transition-transform"></div>
                <span className="text-sm font-medium text-gray-700">
                  Mixed - Some active, some completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Part Details Modal - NEW */}
      {showPartDetailsModal && scannedPartDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Part Details
                  </h2>
                  <p className="text-sm text-gray-600">
                    Scanned part information
                  </p>
                </div>
              </div>
              <button
                onClick={closePartDetailsModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {/* Part Number */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      Part Number
                    </p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {scannedPartDetails.partNumber}
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      scannedPartDetails.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : scannedPartDetails.status === "In Progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {scannedPartDetails.status}
                  </div>
                </div>
              </div>
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {scannedPartDetails.source && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.source}
                    </p>
                  </div>
                )}
                {scannedPartDetails.ticketCode && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Ticket Code</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.ticketCode}
                    </p>
                  </div>
                )}

                {scannedPartDetails.serialNumber && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.serialNumber}
                    </p>
                  </div>
                )}

                {scannedPartDetails.project && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Project</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.project}
                    </p>
                  </div>
                )}

                {scannedPartDetails.build && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Build</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.build}
                    </p>
                  </div>
                )}

                {scannedPartDetails.colour && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Colour</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.colour}
                    </p>
                  </div>
                )}

                {scannedPartDetails.chamber && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Chamber</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.chamber}
                    </p>
                  </div>
                )}

                {scannedPartDetails.testName && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Test Name</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.testName}
                    </p>
                  </div>
                )}

                {scannedPartDetails.processStage && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Process Stage</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.processStage}
                    </p>
                  </div>
                )}

                {scannedPartDetails.session && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Session</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.session}
                    </p>
                  </div>
                )}

                {scannedPartDetails.loadedAt && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Loaded At</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(scannedPartDetails.loadedAt)}
                    </p>
                  </div>
                )}

                {scannedPartDetails.completedAt && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Completed At</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(scannedPartDetails.completedAt)}
                    </p>
                  </div>
                )}

                {scannedPartDetails.duration && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="font-medium text-gray-900">
                      {scannedPartDetails.duration}h
                    </p>
                  </div>
                )}

                {scannedPartDetails.scanStatus && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Scan Status</p>
                    <p
                      className={`font-medium ${scannedPartDetails.scanStatus === "OK" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {scannedPartDetails.scanStatus}
                    </p>
                  </div>
                )}
              </div>

              {/* Machine Details */}
              {scannedPartDetails.machineDetails && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-3">
                    Machine Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Machine:</p>
                      <p className="font-medium">
                        {scannedPartDetails.machineDetails.machine}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Project:</p>
                      <p className="font-medium">
                        {scannedPartDetails.machineDetails.project}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Scanner Active Reminder */}
              {isScannerActive && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Zap className="text-green-600 animate-pulse" size={16} />
                  <p className="text-sm text-green-700">
                    Scanner is active. Close this to scan another part.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex justify-end gap-2">
              <button
                onClick={closePartDetailsModal}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isScannerActive ? "Scan Next Part" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="text-blue-600" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTicket.ticketCode}
                    </h2>
                    <button
                      onClick={() => copyTicketCode(selectedTicket.ticketCode)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="Copy ticket code"
                    >
                      {copiedTicketCode === selectedTicket.ticketCode ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <Building size={14} />
                      {selectedTicket.project}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      {selectedTicket.build}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {selectedTicket.colour}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(getTicketStatus(selectedTicket))}
                <button
                  onClick={closeTicketModal}
                  className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Parts
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedTicket.totalParts}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Across all test cycles
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Zap className="text-yellow-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Test Loads
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedTicket.totalLoads}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Individual testing sessions
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Completed
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedTicket.completed}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Successfully finished tests
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <HardDrive className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Machines
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedTicket.machines.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Used for testing
                    </div>
                  </div>
                </div>

                {/* Test Loads Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Layers className="text-blue-500" size={20} />
                      Test Loads
                    </h3>
                    <span className="text-sm text-gray-500">
                      {selectedTicket.loads.length} total
                    </span>
                  </div>

                  <div className="space-y-4">
                    {selectedTicket.loads.map((load, loadIndex: number) => (
                      <div
                        key={loadIndex}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
                      >
                        {/* Load Header */}
                        <div
                          className={`p-4 border-b ${load.status === "Completed" ? "bg-green-50" : "bg-yellow-50"}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${load.status === "Completed" ? "bg-green-100" : "bg-yellow-100"}`}
                              >
                                <Target
                                  className={
                                    load.status === "Completed"
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }
                                  size={20}
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">
                                  {load.chamber}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${load.status === "Completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                                  >
                                    {load.status}
                                  </span>
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <Package size={12} className="mr-1" />
                                    {load.parts.length} part
                                    {load.parts.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm">
                              <div className="flex items-center gap-1 text-gray-700">
                                <Calendar size={14} className="text-gray-400" />
                                {formatDate(load.loadedAt)}
                              </div>
                              <div className="flex items-center gap-1 text-gray-700">
                                <Clock size={14} className="text-gray-400" />
                                {getDurationText(load.duration)}
                              </div>
                              {load.completedAt && (
                                <div className="flex items-center gap-1 text-green-700">
                                  <CheckCircle size={14} />
                                  Completed: {formatTime(load.completedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Test Information */}
                        <div className="p-4 border-b bg-gray-50">
                          <h5 className="font-medium text-gray-700 mb-3">
                            Test Information
                          </h5>
                          {load.machineDetails?.tests?.map(
                            (test, testIndex) => (
                              <div key={testIndex} className="mb-3 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-gray-900">
                                      {test.testName}
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs ${
                                        test.status === 3
                                          ? "bg-green-100 text-green-800"
                                          : test.status === 2
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {test.statusText}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {test.duration}h
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>Required: {test.requiredQty}</span>
                                  <span>
                                    Allocated: {test.alreadyAllocated}/
                                    {test.requiredQty}
                                  </span>
                                  <span>Remaining: {test.remainingQty}</span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        {/* Parts List */}
                        <div className="p-4">
                          <h5 className="font-medium text-gray-700 mb-3">
                            Parts in this Load
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {load.parts.map(
                              (part: TestPart, partIndex: number) => (
                                <div
                                  key={partIndex}
                                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Hash
                                          size={14}
                                          className="text-gray-400"
                                        />
                                        <span className="font-semibold text-gray-900">
                                          {part.partNumber}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User size={12} />
                                        Serial: {part.serialNumber}
                                      </div>
                                    </div>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        part.scanStatus === "OK"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {part.scanStatus}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <div className="text-gray-700 mb-1">
                                      <span className="font-medium">Test:</span>{" "}
                                      {part.testName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Loaded at {formatTime(part.loadedAt)} •
                                      Duration: {part.duration}h
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex justify-end">
              <button
                onClick={closeTicketModal}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Selection Modal */}
      {showDownloadModal && pendingTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                    <Download className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Select Download Option
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Choose which chamber load to export for{" "}
                      {pendingTicket.ticketCode}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDownloadModal(false);
                    setPendingTicket(null);
                    setDownloadOptions([]);
                    setSelectedDownloadOption(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
                >
                  <X
                    size={24}
                    className="text-white group-hover:rotate-90 transition-transform duration-300"
                  />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
              <div className="space-y-3">
                {/* Download All Option */}
                <div
                  onClick={() => setSelectedDownloadOption(-1)}
                  className={`group relative cursor-pointer rounded-xl p-5 border-2 transition-all duration-300 overflow-hidden ${
                    selectedDownloadOption === -1
                      ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/20 scale-[1.02]"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:scale-[1.01]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          selectedDownloadOption === -1
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                            : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100"
                        }`}
                      >
                        <Layers
                          className={
                            selectedDownloadOption === -1
                              ? "text-white"
                              : "text-gray-600 group-hover:text-blue-600"
                          }
                          size={24}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-lg ${
                            selectedDownloadOption === -1
                              ? "text-blue-900"
                              : "text-gray-900"
                          }`}
                        >
                          Download ALL Chamber Loads
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Export all {downloadOptions.length} chamber loads in a
                          single file
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        selectedDownloadOption === -1
                          ? "border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/30"
                          : "border-gray-300 group-hover:border-blue-400"
                      }`}
                    >
                      {selectedDownloadOption === -1 && (
                        <CheckCircle className="text-white" size={16} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Individual Chamber Load Options */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Or select individual load
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>

                  {downloadOptions.map((option) => (
                    <div
                      key={option.index}
                      onClick={() => setSelectedDownloadOption(option.index)}
                      className={`group relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 mb-3 overflow-hidden ${
                        selectedDownloadOption === option.index
                          ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md hover:scale-[1.01]"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-lg transition-all duration-300 ${
                              selectedDownloadOption === option.index
                                ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30"
                                : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-emerald-100 group-hover:to-green-100"
                            }`}
                          >
                            <FileText
                              className={
                                selectedDownloadOption === option.index
                                  ? "text-white"
                                  : "text-gray-600 group-hover:text-emerald-600"
                              }
                              size={20}
                            />
                          </div>
                          <div>
                            <h4
                              className={`font-semibold ${
                                selectedDownloadOption === option.index
                                  ? "text-emerald-900"
                                  : "text-gray-900"
                              }`}
                            >
                              Load {option.index + 1}: {option.label}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                Checkpoints:
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  selectedDownloadOption === option.index
                                    ? "text-emerald-700"
                                    : "text-gray-600"
                                }`}
                              >
                                {option.checkpoints}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            selectedDownloadOption === option.index
                              ? "border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30"
                              : "border-gray-300 group-hover:border-emerald-400"
                          }`}
                        >
                          {selectedDownloadOption === option.index && (
                            <CheckCircle className="text-white" size={14} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDownloadModal(false);
                  setPendingTicket(null);
                  setDownloadOptions([]);
                  setSelectedDownloadOption(null);
                }}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadModalConfirm}
                disabled={selectedDownloadOption === null}
                className={`group px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg ${
                  selectedDownloadOption !== null
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30 hover:shadow-blue-600/40 hover:scale-105"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                }`}
              >
                <Download
                  size={18}
                  className={
                    selectedDownloadOption !== null
                      ? "group-hover:animate-bounce"
                      : ""
                  }
                />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboard;
