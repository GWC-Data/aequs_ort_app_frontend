import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Plus,
  AlertCircle,
  Image as ImageIcon,
  Play,
  Pause,
  Clock,
  Scan,
  Search,
  AlertTriangle,
} from "lucide-react";
import { ArrowLeft } from "lucide-react"; // Import back arrow icon
import { apiService } from "@/lib/backendApi";
import UTMImageCropper from "@/components/UTMImageCropper";
import {
  saveTestingPartToBackend,
  updateTestingPartInBackend,
  TestingPartData,
} from "@/helpers/api/testingPage";
import { getBackendApiUrl } from "@/lib/backendApi";

// Reference image dimensions
const REFERENCE_IMAGE_WIDTH = 480;
const REFERENCE_IMAGE_HEIGHT = 320;

const normalizeCheckpointLabel = (
  label: string | number | null | undefined,
): string =>
  typeof label === "number"
    ? label.toString().trim().toLowerCase()
    : (label || "").toString().trim().toLowerCase();

const PREDEFINED_REGIONS = [
  { x: 32, y: 20, width: 60, height: 50, label: "FT-1" }, // Yellow: FT-1
  { x: 112, y: 20, width: 50, height: 50, label: "CL-1" }, // Yellow: CL-1
  { x: 170, y: 20, width: 50, height: 50, label: "CL-2" }, // Yellow: CL-2
  { x: 228, y: 20, width: 50, height: 50, label: "CL-3" }, // Yellow: CL-3 (not CL-1)
  { x: 286, y: 20, width: 50, height: 50, label: "CL-4" }, // Yellow: CL-4
  { x: 360, y: 20, width: 60, height: 50, label: "FT-2" }, // Yellow: FT-2
  { x: 32, y: 85, width: 55, height: 45, label: "SS-1" }, // Yellow: SS-1
  { x: 370, y: 85, width: 55, height: 45, label: "SS-2" }, // Yellow: SS-4
  { x: 32, y: 210, width: 55, height: 70, label: "FT-4" }, // Yellow: FT-4
  { x: 370, y: 210, width: 55, height: 70, label: "SS-3" }, // Yellow: FT-3
  { x: 100, y: 250, width: 60, height: 50, label: "SS-4" }, // Yellow: SS-2
  { x: 280, y: 250, width: 60, height: 50, label: "FT-3" }, // Yellow: SS-3
];

const detectLabelText = (
  imageData: string,

  regionId: number,

  regions: any[],

  hasYellowMarks: boolean,
): string => {
  if (hasYellowMarks) {
    // When yellow marks are detected, we read the actual yellow labels

    // But since we're simulating OCR, we return the expected yellow label for that position

    const sortedRegions = [...regions].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 20) return a.y - b.y;

      return a.x - b.x;
    });

    const sortedIndex = sortedRegions.findIndex(
      (region) =>
        region.x === regions[regionId].x && region.y === regions[regionId].y,
    );

    // Yellow labels in the order they appear in the image (left to right, top to bottom)

    const yellowLabels = [
      "FT-1", // Top-left corner

      "CL-1", // First cleat from left

      "CL-2", // Second cleat

      "CL-3", // Third cleat

      "CL-4", // Fourth cleat

      "FT-2", // Top-right corner

      "SS-1", // Left side, upper snap

      "SS-2", // Right side, upper snap

      "FT-4", // Bottom-left corner

      "SS-3", // Bottom-right corner

      "SS-4", // Left side, lower snap

      "FT-3", // Right side, lower snap
    ];

    return yellowLabels[sortedIndex] || `Yellow-${sortedIndex + 1}`;
  } else {
    // When no yellow marks, fall back to the predefined label for that region

    return regions[regionId]?.label || `Region ${regionId + 1}`;
  }
};

const getLabelCategory = (label: string) => {
  if (!label) return null;

  const lower = label.toLowerCase().trim();

  // Map YELLOW LABELS to SYSTEM NAMES

  if (lower === "ft-1") return { form: "footPushOut", id: "F1" };

  if (lower === "ft-2") return { form: "footPushOut", id: "F2" };

  if (lower === "ft-3") return { form: "footPushOut", id: "F3" };

  if (lower === "ft-4") return { form: "footPushOut", id: "F4" };

  if (lower === "cl-1") return { form: "pullTestCleat", id: "Cleat 1" };

  if (lower === "cl-2") return { form: "pullTestCleat", id: "Cleat 2" };

  if (lower === "cl-3") return { form: "pullTestCleat", id: "Cleat 3" };

  if (lower === "cl-4") return { form: "pullTestCleat", id: "Cleat 4" };

  if (lower === "ss-1") return { form: "sidesnap", id: "Side snap 1" };

  if (lower === "ss-2") return { form: "sidesnap", id: "Side snap 2" };

  if (lower === "ss-3") return { form: "sidesnap", id: "Side snap 3" };

  if (lower === "ss-4") return { form: "sidesnap", id: "Side snap 4" };

  // Backward compatibility for old labels (if any still exist)

  if (
    lower.includes("f1") ||
    lower.includes("f2") ||
    lower.includes("f3") ||
    lower.includes("f4")
  ) {
    return { form: "footPushOut", id: label.toUpperCase() };
  }

  if (lower.includes("cleat")) {
    return { form: "pullTestCleat", id: label };
  }

  if (lower.includes("side snap")) {
    return { form: "sidesnap", id: label };
  }

  return null;
};

// Types
interface AssignedPart {
  id: string;
  partNumber: string;
  serialNumber: string;
  location: string;
  scanStatus: string;
  assignedToTest: string;
}

interface LoadedPart {
  partNumber: string;
  serialNumber: string;
  ticketCode: string;
  testId: string;
  testName: string;
  loadedAt: string;
  scanStatus: string;
  duration: string;
  testUnit: string;
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  hasImages?: boolean;
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
  machineId: string;
  machineDescription: string;
  totalTests: number;
  tests: MachineTest[];
  estimatedDuration: number;
  selectedTest: string;
}

interface MachineLoadData {
  loadId: number;
  chamber: string;
  parts: LoadedPart[];
  totalParts: number;
  machineDetails: MachineDetails;
  machineId: string;
  machineDescription: string;
  loadedAt: string;
  estimatedCompletion: string;
  duration: number;
  testRecords?: LoadedPart[]; // For backward compatibility
}

interface ChildTest {
  id: string;
  name: string;
  machineEquipment: string;
  timing: string;
  isCompleted: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "active" | "completed";
  dependsOnPrevious?: boolean;
  previousTestId?: string;
  requiresImages?: boolean;
}

interface TestRecord {
  testId: string;
  testName: string;
  processStage: string;
  testIndex: number;
  testCondition: string;
  requiredQuantity: string;
  specification: string;
  machineEquipment: string;
  machineEquipment2: string;
  timing: string;
  startDateTime: string;
  endDateTime: string;
  assignedParts: AssignedPart[];
  assignedPartsCount: number;
  remark: string;
  status: string;
  submittedAt: string;
  testResults?: FormRow[];
  childTests?: ChildTest[];
  currentChildTestIndex?: number;
  isUTMTest?: boolean;
  utmRegionsProcessed?: boolean;
}

interface Stage2Record {
  id: number;
  submissionId: string;
  ticketId: number;
  ticketCode: string;
  totalQuantity: number;
  anoType: string;
  source: string;
  reason: string;
  project: string;
  build: string;
  colour: string;
  processStage: string;
  selectedTestNames: string[];
  testRecords: TestRecord[];
  formData: any;
  submittedAt: string;
  version: string;
  testingStatus?: string;
  machineLoadData?: MachineLoadData; // New field for machine load data
}

interface FormRow {
  id: number;
  srNo: number;
  testDate: string;
  config: string;
  sampleId: string;
  status: string;
  partNumber: string;
  serialNumber: string;
  childTestId?: string;
  childTestName?: string;
  cosmeticImage?: string;
  nonCosmeticImage?: string;
  croppedImage?: string;
  regionLabel?: string;
  finalNonCosmeticImage?: string;
  finalCroppedNonCosmeticImage?: string;
  finalCosmeticImage?: string;
  cosmeticImages?: string[];
  checkpointHours?: number;
  checkpointStatus?: string;
  checkpointLabel?: string; // Add this
  isT0?: boolean; // Add this flag
  isCheckpointRow?: boolean;
  nonCosmeticImages?: string[];
  croppedImages?: string[];
  finalCosmeticImages?: string[];
  preCosmeticImages?: string[];
  preNonCosmeticImages?: string[];
  preCroppedImages?: string[];
  preStatus?: string;
  [key: string]: any;
  utmImages?: Record<string, string>;
  utmRegionLabels?: string[];
}

// Custom Column interface
interface CustomColumn {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "image";
  options?: string[];
  originalId: string;
}

// Enhanced FormData interface
interface FormData {
  testName: string;
  processStage: string;
  testCondition: string;
  date: string;
  specification: string;
  machineEquipment: string;
  machineEquipment2: string;
  timing: string;
  sampleQty: string;
  rows: FormRow[];
  remark?: string;
  customColumns?: CustomColumn[];
  childTests?: ChildTest[];
  currentChildTestIndex?: number;
  [key: string]: any;
}

interface FormsState {
  [key: string]: FormData;
}

interface SharedImagesByPart {
  [partNumber: string]: {
    cosmetic: string[];
    nonCosmetic: string[];
    childTestImages: {
      [childTestId: string]: {
        cosmetic: string[];
        nonCosmetic: string[];
      };
    };
    finalCosmeticImages?: string[]; // NEW: For Unload  cosmetic images
    finalNonCosmeticImages?: string[]; // NEW: For Unload  non-cosmetic images
  };
}

interface CroppedRegion {
  id: number;
  data: string;
  label: string;
  category: any;
  rect: any;
  partNumber?: string;
  childTestId?: string;
  isFinal?: boolean; // NEW: To differentiate final round images
}

// Timer Status Interface
interface TimerStatus {
  remainingSeconds: number;
  isRunning: boolean;
  startTime?: string;
  stopTime?: string;
  lastUpdated?: string;
}

interface TestTimerState {
  [testName: string]: TimerStatus;
}

// Part scan states interface
interface ScanState {
  isScanning: boolean;
  scannedParts: ScannedPart[];
  partInput: string;
  showScanModal: boolean;
  availableTests: any[];
  selectedTest: string;
  machineDetails: any;
  uploadingImages: { [key: string]: { [key: string]: boolean } };
  isScanningForCheckpoint?: boolean;
  checkpointHour?: number;
  checkpointImages?: {
    [partNumber: string]: {
      cosmetic: File[];
      nonCosmetic: File[];
    };
  };
  eligibleParts?: string[]; // ADD THIS
}

interface ScannedPart {
  id: number;
  partNumber: string;
  serialNumber: string;
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  anoType: string;
  oqcRecordId: string;
  sessionId: string;
  sessionNumber: string;
  scannedAt: string;
  availableTests: any[];
  selectedTestId: string;
  scanStatus: string;
  cosmeticImage: string;
  nonCosmeticImage: string;
  cosmeticImages: string[];
  nonCosmeticImages: string[];
  hasImages?: boolean;
}

// Add these interfaces near other interfaces
interface ProgressState {
  [partNumber: string]: {
    currentProgress: number; // 1/3, 2/3, 3/3
    completedAt: string;
    lastCheckpoint: string;
    images: {
      [hour: number]: {
        cosmeticImages: string[];
        nonCosmeticImages: string[];
        croppedImages: string[];
      };
    };
  };
}

// DefaultForm Component
interface DefaultFormProps {
  formData: FormData;
  updateFormField: (field: string, value: any) => void;
  updateRowField: (rowId: number, field: string, value: string) => void;
  addRow: (partNumber?: string) => void;
  selectedParts: AssignedPart[];
  checkpointHours: number;
  checkpointStatus: string;
  formKey: string;
  timerState: TimerStatus;
  onTimerToggle: () => void;
  croppedRegions: CroppedRegion[];
  isSecondRound?: boolean;
  currentChildTest?: ChildTest;
  onChildTestComplete: () => void;
  onChildTestChange: (childTestIndex: number) => void;
  machineLoadData?: MachineLoadData;
  loadImagesFromStorage: (partNumber: string) => {
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    finalCosmeticImages?: string[];
    finalNonCosmeticImages?: string[];
  };
  projectType?: string;
  handleFinalImageUpload: (
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    childTestId?: string,
  ) => void;
  handleCheckpointClick: (partNumber: string) => void;
  getNextCheckpointName: (partNumber: string) => string;
  getTestConditionForPart: (partNumber: string) => string;
  handleCheckpointImageUpload?: (
    // ADD THIS
    rowId: number,
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    checkpointLabel: string,
    childTestId?: string,
  ) => void;
}

function DefaultForm({
  formData,
  updateFormField,
  updateRowField,
  selectedParts,
  isSecondRound = false,
  currentChildTest,
  onChildTestChange,
  machineLoadData,
  loadImagesFromStorage,
  projectType = "",
  handleFinalImageUpload,
  getNextCheckpointName,
  getTestConditionForPart,
  handleCheckpointImageUpload, // ADD THIS
}: DefaultFormProps) {
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumn, setNewColumn] = useState({
    label: "",
    type: "text" as
      | "text"
      | "number"
      | "date"
      | "select"
      | "textarea"
      | "image",
    options: [] as string[],
  });
  const [newOption, setNewOption] = useState("");

  // Track verified parts for final upload (Unload )
  const [verifiedPartsForFinalUpload, setVerifiedPartsForFinalUpload] =
    useState<Set<string>>(new Set());

  // Scan state for checkpoint scanning
  const [scanState, setScanState] = useState<ScanState>({
    isScanning: false,
    scannedParts: [],
    partInput: "",
    showScanModal: false,
    availableTests: [],
    selectedTest: "",
    machineDetails: null,
    uploadingImages: {},
    isScanningForCheckpoint: false,
    checkpointHour: undefined,
    checkpointImages: {},
  });

  const shouldRenderUTMTable = formData?.machineEquipment2
    ?.toLowerCase()
    .includes("utm");

  console.log(shouldRenderUTMTable);

  console.log("ddddd", formData);

  const handleAddColumn = () => {
    if (!newColumn.label.trim()) return;

    const columnId = newColumn.label.trim().toLowerCase().replace(/\s+/g, "_");
    const prefixedColumnId = `custom_${columnId}`; // Add prefix for custom columns

    const customColumn: CustomColumn = {
      id: prefixedColumnId, // Use prefixed ID
      label: newColumn.label.trim(),
      type: newColumn.type,
      options: newColumn.type === "select" ? newColumn.options : undefined,
      originalId: columnId, // Keep original for reference if needed
    };

    const updatedCustomColumns = [
      ...(formData.customColumns || []),
      customColumn,
    ];
    updateFormField("customColumns", updatedCustomColumns);

    // Update all rows with the new column
    formData.rows.forEach((row) => {
      updateRowField(row.id, prefixedColumnId, "");
    });

    // Update chamberLoads in localStorage
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (chamberLoadsStr) {
        const chamberLoads = JSON.parse(chamberLoadsStr);

        // Update each chamber load with the new column
        const updatedChamberLoads = chamberLoads.map((load: any) => {
          // Add the new column to each part in the load
          const updatedParts = load.parts.map((part: any) => ({
            ...part,
            // Initialize the new field with empty value and prefix
            [prefixedColumnId]: "",
          }));

          return {
            ...load,
            parts: updatedParts,
          };
        });

        localStorage.setItem(
          "chamberLoads",
          JSON.stringify(updatedChamberLoads),
        );
        console.log(
          "Updated chamberLoads with new custom column:",
          prefixedColumnId,
        );
      }
    } catch (error) {
      console.error("Error updating chamberLoads:", error);
    }

    setShowAddColumnModal(false);
    setNewColumn({ label: "", type: "text", options: [] });
    setNewOption("");
  };

  const addOption = () => {
    if (newOption.trim() && !newColumn.options.includes(newOption.trim())) {
      setNewColumn((prev) => ({
        ...prev,
        options: [...prev.options, newOption.trim()],
      }));
      setNewOption("");
    }
  };

  const removeOption = (optionToRemove: string) => {
    setNewColumn((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt !== optionToRemove),
    }));
  };

  const removeCustomColumn = (columnId: string) => {
    const updatedColumns =
      formData.customColumns?.filter((col) => col.id !== columnId) || [];
    updateFormField("customColumns", updatedColumns);
  };

  const handleImageUpload = (
    rowId: number,
    imageType: "cosmetic" | "nonCosmetic",
    file: File,
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fieldName =
        imageType === "cosmetic" ? "cosmeticImage" : "nonCosmeticImage";
      updateRowField(rowId, fieldName, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add helper function to convert checkpoint to minutes
  const convertCheckpointToMinutes = (checkpoint: string): number => {
    // Add safety check for undefined/null checkpoint
    if (!checkpoint) {
      console.warn("Checkpoint is undefined or null");
      return 0;
    }

    if (checkpoint.toLowerCase().includes("t0")) return 0;

    const match = checkpoint.match(/(\d+)\s*hr/i);
    if (match) {
      return parseInt(match[1]) * 60; // Convert hours to minutes
    }

    return 0;
  };

  // Add helper function to get remaining time until next checkpoint
  const getRemainingTimeUntilCheckpoint = (
    lastCheckpointTime: string | null,
    nextCheckpointMinutes: number,
  ): number => {
    if (!lastCheckpointTime) return 0;

    const lastTime = new Date(lastCheckpointTime).getTime();
    const currentTime = new Date().getTime();
    const minutesPassed = (currentTime - lastTime) / (1000 * 60);

    return Math.max(0, nextCheckpointMinutes - minutesPassed);
  };

  // Function to handle final round image uploads
  const handleFinalRoundImageUpload = (
    rowId: number,
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
  ) => {
    // For Unload , clear existing images before uploading new ones
    if (isSecondRound) {
      if (type === "cosmetic") {
        // Clear cosmetic images for this row
        updateRowField(rowId, "finalCosmeticImages", JSON.stringify([]));
        updateRowField(rowId, "finalCosmeticImage", "");
      } else {
        // Clear non-cosmetic images for this row
        updateRowField(rowId, "nonCosmeticImages", JSON.stringify([]));
        updateRowField(rowId, "nonCosmeticImage", "");
        updateRowField(rowId, "croppedImages", JSON.stringify([]));
        updateRowField(rowId, "croppedImage", "");
        updateRowField(rowId, "finalNonCosmeticImage", "");
        updateRowField(rowId, "finalCroppedNonCosmeticImage", "");
      }
    }

    if (type === "cosmetic") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const currentRow = formData.rows.find((r) => r.id === rowId);

        if (currentRow) {
          // For Hulk project, allow multiple final cosmetic images
          if (projectType === "Hulk") {
            const currentFinalImages = currentRow.finalCosmeticImages || [];
            const updatedFinalImages = [...currentFinalImages, imageUrl];

            updateRowField(
              rowId,
              "finalCosmeticImages",
              JSON.stringify(updatedFinalImages),
            );
            updateRowField(rowId, "finalCosmeticImage", imageUrl); // Set first image as main
          } else {
            // For Flash project, single final cosmetic image
            updateRowField(rowId, "finalCosmeticImage", imageUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      // For non-cosmetic final images, call the parent handler
      handleFinalImageUpload(partNumber, type, file, currentChildTest?.id);
    }
  };

  const getCheckpointsForPart = (partNumber: string): string[] => {
    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );

      for (const load of chamberLoads) {
        const part = load.parts?.find((p: any) => p.partNumber === partNumber);

        if (part) {
          // PRIORITY 1: Check checkpointInfo.checkpoints (already formatted)
          if (
            part.checkpointInfo?.checkpoints &&
            Array.isArray(part.checkpointInfo.checkpoints)
          ) {
            return part.checkpointInfo.checkpoints.map((cp: any) => {
              if (typeof cp === "string") return cp; // Already formatted

              // Format based on test unit
              const testUnit = part.testUnit || load.testUnit;
              const normalizedUnit = testUnit?.toLowerCase().trim();

              //   if (cp === 0) return "T0"; // Pre-test checkpoint

              switch (normalizedUnit) {
                case "hours":
                case "hour":
                  return `${cp} hrs`;
                case "cycles":
                case "cycle":
                  return `${cp} cycles`;
                case "drops":
                  return `${cp} drops`;
                case "grams":
                  return `${cp} g`;
                case "orientation":
                  return `${cp} deg`;
                default:
                  return `${cp}`;
              }
            });
          }

          // PRIORITY 2: Check allCheckpoints (fallback)
          if (part.allCheckpoints && Array.isArray(part.allCheckpoints)) {
            const testUnit = part.testUnit || load.testUnit;
            const normalizedUnit = testUnit?.toLowerCase().trim();

            return part.allCheckpoints.map((cp: any) => {
              const value = typeof cp === "number" ? cp : parseFloat(cp);
              if (value === 0) return "T0";

              switch (normalizedUnit) {
                case "hours":
                case "hour":
                  return `${value} hrs`;
                case "cycles":
                case "cycle":
                  return `${value} cycles`;
                case "drops":
                  return `${value} drops`;
                case "grams":
                  return `${value} g`;
                case "orientation":
                  return `${value} deg`;
                default:
                  return `${value}`;
              }
            });
          }

          // PRIORITY 3: Check machineDetails.selectedTest.checkpoints
          if (load.machineDetails?.selectedTest?.checkpoints) {
            const testUnit = part.testUnit || load.testUnit;
            const normalizedUnit = testUnit?.toLowerCase().trim();

            return load.machineDetails.selectedTest.checkpoints.map(
              (cp: any) => {
                const value = typeof cp === "number" ? cp : parseFloat(cp);
                if (value === 0) return "T0";

                switch (normalizedUnit) {
                  case "hours":
                  case "hour":
                    return `${value} hrs`;
                  case "cycles":
                  case "cycle":
                    return `${value} cycles`;
                  case "drops":
                    return `${value} drops`;
                  case "grams":
                    return `${value} g`;
                  case "orientation":
                    return `${value} deg`;
                  default:
                    return `${value}`;
                }
              },
            );
          }
        }
      }

      return [];
    } catch (error) {
      console.error("Error getting checkpoints:", error);
      return [];
    }
  };

  const shouldShowCheckpointButton = (
    row: FormRow | undefined,
    partNumber: string,
  ): boolean => {
    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );

      for (const load of chamberLoads) {
        const part = load.parts?.find((p: any) => p.partNumber === partNumber);

        if (part) {
          const testUnit = part.testUnit || load.testUnit;
          const normalizedUnit = testUnit?.toLowerCase().trim();

          // Check if testUnit is one of the special units
          if (
            ["drops", "grams", "orientation", "cycle"].includes(normalizedUnit)
          ) {
            // **ALWAYS ENABLE for special testUnits (including T0)**
            if (part.checkpointInfo) {
              const { checkpoints, currentCheckpointIndex } =
                part.checkpointInfo;

              // Show button if there are remaining checkpoints
              if (currentCheckpointIndex < checkpoints.length) {
                return true; // Enable button for T0 and all subsequent checkpoints
              }
            }

            // Show button to initialize checkpoint if not set up yet
            return true;
          }

          // Existing logic for hours
          if (part.checkpointInfo) {
            const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;
            return currentCheckpointIndex < checkpoints.length;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking checkpoint button visibility:", error);
      return false;
    }
  };

  const CheckpointTimer = ({ partNumber }: { partNumber: string }) => {
    const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

    useEffect(() => {
      const interval = setInterval(() => {
        try {
          const chamberLoads = JSON.parse(
            localStorage.getItem("chamberLoads") || "[]",
          );

          for (const load of chamberLoads) {
            const part = load.parts?.find(
              (p: any) => p.partNumber === partNumber,
            );

            if (part && part.checkpointInfo) {
              const {
                checkpoints,
                currentCheckpointIndex,
                lastCheckpointTime,
              } = part.checkpointInfo;

              if (currentCheckpointIndex < checkpoints.length) {
                const nextCheckpoint = checkpoints[currentCheckpointIndex];
                const nextCheckpointMinutes =
                  convertCheckpointToMinutes(nextCheckpoint);
                const remaining = getRemainingTimeUntilCheckpoint(
                  lastCheckpointTime,
                  nextCheckpointMinutes,
                );

                setRemainingMinutes(Math.ceil(remaining));
              }
            }
          }
        } catch (error) {
          console.error("Error updating checkpoint timer:", error);
        }
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }, [partNumber]);

    if (remainingMinutes <= 0) return null;

    return (
      <div className="mt-2 text-xs text-gray-600">
        Next checkpoint in:{" "}
        <span className="font-semibold">{remainingMinutes} minutes</span>
      </div>
    );
  };

  const renderField = (row: FormRow, column: CustomColumn) => {
    const value = row[column.id] || "";

    switch (column.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateRowField(row.id, column.id, e.target.value)}
            className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateRowField(row.id, column.id, e.target.value)}
            className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateRowField(row.id, column.id, e.target.value)}
            className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => updateRowField(row.id, column.id, e.target.value)}
            className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => updateRowField(row.id, column.id, e.target.value)}
            rows={3}
            className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
          />
        );

      case "image":
        return (
          <div className="space-y-2">
            {!value ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                <Upload size={20} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Upload Image
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Click to browse
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        updateRowField(
                          row.id,
                          column.id,
                          event.target?.result as string,
                        );
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={value}
                  alt={`${column.label} preview`}
                  className="w-20 h-20 object-cover border rounded-lg"
                />
                <div className="flex gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            updateRowField(
                              row.id,
                              column.id,
                              event.target?.result as string,
                            );
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRowField(row.id, column.id, "")}
                    className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  // Filter rows for current child test
  const rowsForCurrentChildTest = formData.rows.filter(
    (row) => !currentChildTest || row.childTestId === currentChildTest.id,
  );

  // Group filtered rows by partNumber
  const rowsByPart = rowsForCurrentChildTest.reduce(
    (acc, row) => {
      if (!acc[row.partNumber]) {
        acc[row.partNumber] = [];
      }
      acc[row.partNumber].push(row);
      return acc;
    },
    {} as Record<string, FormRow[]>,
  );

  // Function to check if images are already uploaded for a part
  const checkExistingImages = (partNumber: string) => {
    const existingImages = loadImagesFromStorage(partNumber);
    return {
      hasCosmeticImages: existingImages.cosmeticImages.length > 0,
      hasNonCosmeticImages: existingImages.nonCosmeticImages.length > 0,
      hasFinalCosmeticImages:
        (existingImages.finalCosmeticImages?.length || 0) > 0,
      hasFinalNonCosmeticImages:
        (existingImages.finalNonCosmeticImages?.length || 0) > 0,
      cosmeticCount: existingImages.cosmeticImages.length,
      nonCosmeticCount: existingImages.nonCosmeticImages.length,
      finalCosmeticCount: existingImages.finalCosmeticImages?.length || 0,
      finalNonCosmeticCount: existingImages.finalNonCosmeticImages?.length || 0,
    };
  };

  const shouldShowCheckpointColumn = (partNumber: string): boolean => {
    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );

      for (const load of chamberLoads) {
        const part = load.parts?.find((p: any) => p.partNumber === partNumber);

        if (part) {
          const testUnit = part.testUnit || load.testUnit;
          const normalizedUnit = testUnit?.toLowerCase().trim();

          // For special units (cycle, drops, grams, orientation)
          if (
            ["cycle", "drops", "grams", "orientation"].includes(normalizedUnit)
          ) {
            if (part.checkpointInfo) {
              const { currentCheckpointIndex, checkpoints } =
                part.checkpointInfo;

              // Get current checkpoint
              const currentCheckpoint = checkpoints[currentCheckpointIndex];

              // **HIDE column if we're at T0/0 (pre-test)**
              if (
                currentCheckpoint === "T0" ||
                currentCheckpoint === "0" ||
                currentCheckpoint?.toString().toLowerCase() === "t0" ||
                currentCheckpointIndex === 0
              ) {
                return false; // Hide checkpoint status column for T0
              }

              // **SHOW column for all post-test checkpoints**
              return currentCheckpointIndex > 0;
            }
            return false;
          }

          // For hour-based tests, check test condition
          const testCondition = getTestConditionForPart(partNumber);
          if (testCondition) {
            const trimmed = testCondition.toUpperCase().trim();
            const conditionMatch =
              trimmed.startsWith("CP:") ||
              trimmed.startsWith("CP ") ||
              /^CP[:]?\s/.test(trimmed);

            if (conditionMatch) return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking testUnit for column:", error);
      return false;
    }
  };

  // Determine if we should split images based on project type
  const shouldSplitImages = () => {
    return projectType === "Flash";
  };

  const shouldRenderCheckpointStatusColumn =
    selectedParts.some((part) => shouldShowCheckpointColumn(part.partNumber)) ||
    selectedParts.some((part) =>
      (rowsByPart[part.partNumber] || []).some(
        (row) =>
          row.isCheckpointRow ||
          row.isT0 ||
          typeof row.checkpointLabel === "string" ||
          typeof row.checkpointStatus !== "undefined",
      ),
    );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Machine Load Information */}
        {machineLoadData && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Machine Load Information
              </h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Load ID: {machineLoadData.loadId}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Machine/Chamber:</span>
                <div className="font-semibold">{machineLoadData.chamber}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Parts:</span>
                <div className="font-semibold">
                  {machineLoadData.totalParts}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loaded At:</span>
                <div className="font-semibold">
                  {new Date(machineLoadData.loadedAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">
                  Estimated Completion:
                </span>
                <div className="font-semibold">
                  {new Date(
                    machineLoadData.estimatedCompletion,
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Duration:</span>
                <div className="font-semibold">
                  {machineLoadData.duration} hours
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Ticket:</span>
                <div className="font-semibold">
                  {machineLoadData.machineDetails.ticketCode}
                </div>
              </div>
            </div>

            {/* Image Upload Status */}
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 mb-2">
                Image Upload Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-gray-600">
                    Parts with pre-uploaded images:
                  </span>
                  <span className="font-semibold ml-2">
                    {machineLoadData.parts.filter((p) => p.hasImages).length} /{" "}
                    {machineLoadData.totalParts}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Total pre-uploaded images:
                  </span>
                  <span className="font-semibold ml-2">
                    {machineLoadData.parts.reduce(
                      (sum, part) =>
                        sum +
                        (part.cosmeticImages?.length || 0) +
                        (part.nonCosmeticImages?.length || 0),
                      0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Child Test Navigation */}
        {formData.childTests && formData.childTests.length > 1 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Child Tests Progress
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.childTests.map((childTest, index) => (
                <button
                  key={childTest.id}
                  onClick={() => onChildTestChange(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    formData.currentChildTestIndex === index
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : childTest.status === "completed"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  <span className="font-medium">{childTest.name}</span>
                  {childTest.status === "completed" && (
                    <CheckCircle size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Child Test Header */}
        {currentChildTest && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {formData.testName}
                </h2>
                <p className="text-gray-600">
                  Child Test:{" "}
                  <span className="font-semibold text-blue-600">
                    {currentChildTest.name}
                  </span>
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  Machine: {currentChildTest.machineEquipment} | Timing:{" "}
                  {currentChildTest.timing} hours
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold">Project Type:</span>{" "}
                  {projectType}
                  {shouldSplitImages() && (
                    <span className="ml-2 text-blue-600">
                      (Non-cosmetic images will be split)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Test Name
              </label>
              <input
                value={formData.testName}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Specification
              </label>
              <input
                value={formData.specification}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Test Condition
              </label>
              <input
                value={formData.testCondition}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => updateFormField("date", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Process Stage
              </label>
              <input
                value={formData.processStage}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sample Qty
              </label>
              <input
                value={formData.sampleQty}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Parts Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Parts ({selectedParts.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedParts.map((part, index) => {
              const existingImages = checkExistingImages(part.partNumber);

              // Get checkpoint progress
              const getCheckpointProgress = (partNumber: string) => {
                try {
                  const chamberLoadsStr = localStorage.getItem("chamberLoads");
                  if (!chamberLoadsStr)
                    return { completed: 0, total: 0, checkpoints: [] };

                  const chamberLoads = JSON.parse(chamberLoadsStr);

                  for (const load of chamberLoads) {
                    if (load.parts && Array.isArray(load.parts)) {
                      const part = load.parts.find(
                        (p: any) => p.partNumber === partNumber,
                      );
                      if (part) {
                        if (part.checkpointInfo) {
                          const { checkpoints, currentCheckpointIndex } =
                            part.checkpointInfo;
                          return {
                            completed: currentCheckpointIndex,
                            total: checkpoints.length,
                            checkpoints: checkpoints,
                          };
                        } else {
                          // Fallback for special units that might not have init yet (though button click inits them)
                          const checkpoints = getCheckpointsForPart(partNumber);
                          if (checkpoints.length > 0) {
                            return {
                              completed: 0,
                              total: checkpoints.length,
                              checkpoints: checkpoints,
                            };
                          }
                        }
                      }
                    }
                  }
                  return { completed: 0, total: 0, checkpoints: [] };
                } catch (error) {
                  console.error("Error getting checkpoint progress:", error);
                  return { completed: 0, total: 0, checkpoints: [] };
                }
              };

              const checkpointProgress = getCheckpointProgress(part.partNumber);
              const progressPercent =
                checkpointProgress.total > 0
                  ? Math.round(
                      (checkpointProgress.completed /
                        checkpointProgress.total) *
                        100,
                    )
                  : 0;

              return (
                <div
                  key={part.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {part.partNumber}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Part {index + 1}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Serial: {part.serialNumber}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Current Rows: {rowsByPart[part.partNumber]?.length || 0}
                  </div>

                  {/* Show existing images status */}
                  {(existingImages.hasCosmeticImages ||
                    existingImages.hasNonCosmeticImages ||
                    existingImages.hasFinalCosmeticImages ||
                    existingImages.hasFinalNonCosmeticImages) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {existingImages.hasCosmeticImages && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                          <ImageIcon size={10} />
                          {existingImages.cosmeticCount} cosmetic
                        </span>
                      )}
                      {existingImages.hasNonCosmeticImages && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-50 text-green-700 rounded flex items-center gap-1">
                          <ImageIcon size={10} />
                          {existingImages.nonCosmeticCount} non-cosmetic
                        </span>
                      )}
                      {isSecondRound &&
                        existingImages.hasFinalCosmeticImages && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-700 rounded flex items-center gap-1">
                            <ImageIcon size={10} />
                            {existingImages.finalCosmeticCount} final cosmetic
                          </span>
                        )}
                      {isSecondRound &&
                        existingImages.hasFinalNonCosmeticImages && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-50 text-orange-700 rounded flex items-center gap-1">
                            <ImageIcon size={10} />
                            {existingImages.finalNonCosmeticCount} final
                            non-cosmetic
                          </span>
                        )}
                    </div>
                  )}

                  {/* Checkpoint Progress Display */}
                  {(checkpointProgress.total > 0 ||
                    ["drops", "grams", "orientation", "cycle"].some((unit) =>
                      getTestConditionForPart(part.partNumber)
                        ?.toLowerCase()
                        .includes(unit),
                    )) && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          Checkpoint Progress
                        </span>
                        <span className="text-xs font-bold text-blue-600">
                          {checkpointProgress.completed}/
                          {checkpointProgress.total}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            progressPercent === 100
                              ? "bg-green-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      {/* Checkpoint List */}
                      <div className="space-y-1">
                        {checkpointProgress.checkpoints.map(
                          (checkpoint, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between text-xs ${
                                idx < checkpointProgress.completed
                                  ? "text-green-700"
                                  : idx === checkpointProgress.completed
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-400"
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {idx < checkpointProgress.completed ? (
                                  <CheckCircle
                                    size={12}
                                    className="text-green-600"
                                  />
                                ) : idx === checkpointProgress.completed ? (
                                  <Clock size={12} className="text-blue-600" />
                                ) : (
                                  <div className="w-3 h-3 border border-gray-300 rounded-full" />
                                )}
                                {checkpoint}{" "}
                                {idx === 0 ? "(Pre-Test)" : "(Post-Test)"}
                              </span>
                              <span>
                                {idx < checkpointProgress.completed
                                  ? "Completed"
                                  : idx === checkpointProgress.completed
                                    ? "Current"
                                    : "Pending"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      {/* All Completed Badge */}
                      {progressPercent === 100 && (
                        <div className="mt-2 flex items-center justify-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs font-semibold text-green-700">
                          <CheckCircle size={14} />
                          All Checkpoints Completed!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checkpoint Timer */}
                  <CheckpointTimer partNumber={part.partNumber} />


                  {/* Add checkpoint button after progress display */}
                  {shouldShowCheckpointButton(
                    rowsByPart[part.partNumber]?.[0],
                    part.partNumber,
                  ) &&
                    checkpointProgress.completed < checkpointProgress.total && (
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={() => handleCheckpointClick(part.partNumber)}
                          disabled
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium transition-colors text-sm"
                        >
                          {/* <Scan size={16} /> */}
                          {getNextCheckpointName(part.partNumber)
                            ? `Current Scan: ${getNextCheckpointName(
                                part.partNumber,
                              )}`
                            : "Progress Checkpoint"}
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Table Section */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Test Data for{" "}
            {currentChildTest ? currentChildTest.name : "All Tests"}
            {isSecondRound && (
              <span className="ml-2 text-red-600">( Unload )</span>
            )}
          </h3>
          <button
            onClick={() => setShowAddColumnModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Column
          </button>
        </div>

        {selectedParts.map((part) => {
          const rowData = formData?.rows?.find(
            (row) =>
              row.partNumber === part.partNumber &&
              row.childTestId === currentChildTest?.id,
          );

          // FOR SECOND ROUND: Don't load pre-existing images, start fresh
          const existingImages = isSecondRound
            ? {
                cosmeticImages: [],
                nonCosmeticImages: [],
                finalCosmeticImages: [],
                finalNonCosmeticImages: [],
              }
            : loadImagesFromStorage(part.partNumber);

          const partRows = rowsByPart[part.partNumber] || [];
          const checkpointRows = partRows.filter((row) => row.isCheckpointRow);
          const nonCheckpointRows = partRows.filter(
            (row) => !row.isCheckpointRow,
          );
          const nextCheckpointLabel = (
            getNextCheckpointName?.(part.partNumber) || ""
          )
            .trim()
            .toLowerCase();

          const visibleCheckpointRows: FormRow[] = [];

          // **MODIFIED: In second round, show ALL checkpoint rows**
          if (isSecondRound) {
            // In second round (Unload), display ALL checkpoint rows
            visibleCheckpointRows.push(...checkpointRows);
          } else {
            // First round logic (existing)
            if (checkpointRows.length > 0) {
              if (nextCheckpointLabel) {
                const matchingRow = checkpointRows.find(
                  (row) =>
                    (row.checkpointLabel || "").trim().toLowerCase() ===
                    nextCheckpointLabel,
                );
                if (matchingRow) {
                  visibleCheckpointRows.push(matchingRow);
                }
              }

              if (visibleCheckpointRows.length === 0) {
                const firstPending = checkpointRows.find(
                  (row) => row.checkpointStatus !== "Pass",
                );
                if (firstPending) {
                  visibleCheckpointRows.push(firstPending);
                }
              }

              if (visibleCheckpointRows.length === 0) {
                visibleCheckpointRows.push(
                  checkpointRows[checkpointRows.length - 1],
                );
              }
            }
          }

          let displayedRows: FormRow[];

          if (checkpointRows.length === 0) {
            displayedRows = partRows;
          } else {
            const rowIdsToShow = new Set(
              [...nonCheckpointRows, ...visibleCheckpointRows].map(
                (row) => row.id,
              ),
            );

            displayedRows = partRows.filter((row) => rowIdsToShow.has(row.id));
          }

          const isPartVerified = isSecondRound
            ? verifiedPartsForFinalUpload.has(part.partNumber)
            : true;

          return (
            <div key={part.id} className="mb-8">
              <div className="bg-gray-100 border border-gray-300 rounded-t-lg p-3">
                <h4 className="font-semibold text-gray-800 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                    {selectedParts.indexOf(part) + 1}
                  </span>
                  Part: {part.partNumber} (Serial: {part.serialNumber})
                  {/* Hide currentChildTest name for UTM tests */}
                  {!shouldRenderUTMTable && currentChildTest && (
                    <span className="ml-2 text-sm text-blue-600 font-normal">
                      - {currentChildTest.name}
                    </span>
                  )}
                  {/* Show image status badge */}
                  {(existingImages.cosmeticImages.length > 0 ||
                    existingImages.nonCosmeticImages.length > 0 ||
                    (isSecondRound &&
                      (existingImages.finalCosmeticImages?.length || 0) > 0) ||
                    (isSecondRound &&
                      (existingImages.finalNonCosmeticImages?.length || 0) >
                        0)) && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                      <ImageIcon size={10} />
                      {isSecondRound
                        ? "Final images loaded from storage"
                        : "Images loaded from storage"}
                    </span>
                  )}
                </h4>
              </div>
              {shouldRenderUTMTable ? (
                // Render UTM-specific table - UTMImageCropper handles its own table
                <UTMImageCropper
                  formData={formData}
                  updateRowField={updateRowField}
                  selectedParts={[part]} // Send only this part, not all selectedParts
                  machineEquipment2={formData.machineEquipment2}
                  isSecondRound={isSecondRound}
                  currentChildTest={currentChildTest}
                />
              ) : (
                <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-hidden">
                  {/* Show "Add Column" button only for non-UTM tables */}
                  {/* <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Test Data{" "}
                      {currentChildTest ? `for ${currentChildTest.name}` : ""}
                    </h3>
                    <button
                      onClick={() => setShowAddColumnModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      Add Column
                    </button>
                  </div> */}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                          <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                            CheckPoints
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                            Test Date
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                            Config
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                            Sample ID
                          </th>
                          {/* First Round Images (only show if not Unload ) */}
                          {!isSecondRound && (
                            <>
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                Cosmetic Images
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                Non-Cosmetic Images
                              </th>
                            </>
                          )}
                          {/* Unload Images */}
                          {isSecondRound && (
                            <>
                              {/* First Round Images (Read-only display) */}
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 bg-gray-50">
                                Pre Cosmetic Images
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 bg-gray-50">
                                Pre Non-Cosmetic Images
                              </th>

                              {/* Unload Images */}
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                Post Cosmetic Images
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                Post Non-Cosmetic Images
                              </th>
                            </>
                          )}
                          {formData.customColumns?.map((column) => (
                            <th
                              key={column.id}
                              className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span>{column.label}</span>
                                <button
                                  onClick={() => removeCustomColumn(column.id)}
                                  className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700 transition-opacity"
                                  title="Remove column"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </th>
                          ))}
                          {shouldRenderCheckpointStatusColumn && (
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                              Checkpoint Status
                            </th>
                          )}
                          {isSecondRound && (
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayedRows.map((row, index) => {
                          const isPartVerified =
                            verifiedPartsForFinalUpload.has(row.partNumber);
                          const showCheckpointForThisPart =
                            shouldShowCheckpointColumn(row.partNumber) ||
                            row.isCheckpointRow ||
                            row.isT0 ||
                            typeof row.checkpointLabel === "string" ||
                            typeof row.checkpointStatus !== "undefined";
                          const isCheckpointRow = row.isCheckpointRow;
                          const canEditCheckpointStatus =
                            !isSecondRound && isCheckpointRow && !row.isT0;

                          return (
                            <tr
                              key={row.id}
                              className={`
                      ${
                        index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }
                      ${isCheckpointRow ? "border-l-4 border-blue-500" : ""}
                    `}
                            >
                              <td className="px-4 py-4 text-center font-semibold text-gray-900 border-r border-gray-200">
                                {row.checkpointLabel ? (
                                  <div>
                                    <div className="text-sm font-bold text-blue-600">
                                      {row.checkpointLabel}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Checkpoint
                                    </div>
                                  </div>
                                ) : (
                                  row.srNo
                                )}
                              </td>

                              <td className="px-4 py-4 border-r border-gray-200">
                                <input
                                  type="date"
                                  value={row.testDate}
                                  onChange={(e) =>
                                    updateRowField(
                                      row.id,
                                      "testDate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-4 border-r border-gray-200">
                                <input
                                  value={row.config}
                                  onChange={(e) =>
                                    updateRowField(
                                      row.id,
                                      "config",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-4 border-r border-gray-200">
                                <input
                                  value={row.sampleId}
                                  onChange={(e) =>
                                    updateRowField(
                                      row.id,
                                      "sampleId",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>

                              {/* ==================== UNLOAD IMAGES SECTION ==================== */}
                              {isSecondRound ? (
                                // UNLOAD MODE: 7 columns (3 pre + 3 post + 1 status)
                                <>
                                  {/* Pre Cosmetic Images */}
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[150px] bg-gray-50">
                                    {row.preCosmeticImages &&
                                    row.preCosmeticImages.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500 mb-1">
                                          Pre Cosmetic (
                                          {row.preCosmeticImages.length}):
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                          {row.preCosmeticImages
                                            .slice(0, 4)
                                            .map((img, imgIndex) => (
                                              <div
                                                key={imgIndex}
                                                className="relative group"
                                              >
                                                <img
                                                  src={img}
                                                  alt={`Pre Cosmetic ${imgIndex + 1}`}
                                                  className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  onClick={() =>
                                                    window.open(img, "_blank")
                                                  }
                                                />
                                              </div>
                                            ))}
                                        </div>
                                        {row.preCosmeticImages.length > 4 && (
                                          <div className="text-xs text-gray-500">
                                            +{row.preCosmeticImages.length - 4}{" "}
                                            more
                                          </div>
                                        )}
                                        {row.preStatus && (
                                          <div className="mt-1">
                                            <span
                                              className={`px-2 py-0.5 text-xs rounded-full ${
                                                row.preStatus === "Pass"
                                                  ? "bg-green-100 text-green-800"
                                                  : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              Status: {row.preStatus}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 text-center py-2">
                                        No first round cosmetic images
                                      </div>
                                    )}
                                  </td>

                                  {/* Pre Non-Cosmetic Images */}
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[150px] bg-gray-50">
                                    {row.preNonCosmeticImages &&
                                    row.preNonCosmeticImages.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500 mb-1">
                                          Pre Non-Cosmetic (
                                          {row.preNonCosmeticImages.length}):
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                          {row.preNonCosmeticImages
                                            .slice(0, 4)
                                            .map((img, imgIndex) => (
                                              <div
                                                key={imgIndex}
                                                className="relative group"
                                              >
                                                <img
                                                  src={img}
                                                  alt={`Pre Non-Cosmetic ${imgIndex + 1}`}
                                                  className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  onClick={() =>
                                                    window.open(img, "_blank")
                                                  }
                                                />
                                              </div>
                                            ))}
                                        </div>
                                        {row.preNonCosmeticImages.length >
                                          4 && (
                                          <div className="text-xs text-gray-500">
                                            +
                                            {row.preNonCosmeticImages.length -
                                              4}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 text-center py-2">
                                        No first round non-cosmetic images
                                      </div>
                                    )}
                                  </td>

                                  {/* Post Cosmetic Images (Unload) */}
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                                    <div className="space-y-2">
                                      {/* Show existing final cosmetic images first */}
                                      {existingImages.finalCosmeticImages &&
                                      existingImages.finalCosmeticImages
                                        .length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="text-xs text-gray-500 mb-1">
                                            Final cosmetic images (
                                            {
                                              existingImages.finalCosmeticImages
                                                .length
                                            }
                                            ):
                                          </div>
                                          <div className="grid grid-cols-2 gap-1">
                                            {existingImages.finalCosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Final Cosmetic ${imgIndex + 1}`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      ) : row.finalCosmeticImages &&
                                        row.finalCosmeticImages.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-1">
                                            {row.finalCosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Post Cosmetic ${imgIndex + 1}`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                </div>
                                              ),
                                            )}
                                          </div>
                                          {projectType === "Hulk" && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const input =
                                                  document.createElement(
                                                    "input",
                                                  );
                                                input.type = "file";
                                                input.accept = "image/*";
                                                input.multiple = true;
                                                input.onchange = (e) => {
                                                  const files = (
                                                    e.target as HTMLInputElement
                                                  ).files;
                                                  if (files) {
                                                    Array.from(files).forEach(
                                                      (file) => {
                                                        handleFinalRoundImageUpload(
                                                          row.id,
                                                          part.partNumber,
                                                          "cosmetic",
                                                          file,
                                                        );
                                                      },
                                                    );
                                                  }
                                                };
                                                input.click();
                                              }}
                                              className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                            >
                                              + Add More
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors bg-purple-50">
                                          <Upload
                                            size={20}
                                            className="text-purple-400 mb-2"
                                          />
                                          <span className="text-sm font-medium text-purple-600">
                                            Upload Post Cosmetic
                                          </span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple={projectType === "Hulk"}
                                            onChange={(e) => {
                                              const files = e.target.files;
                                              if (files && isPartVerified) {
                                                Array.from(files).forEach(
                                                  (file) => {
                                                    handleFinalRoundImageUpload(
                                                      row.id,
                                                      part.partNumber,
                                                      "cosmetic",
                                                      file,
                                                    );
                                                  },
                                                );
                                              }
                                            }}
                                            className="hidden"
                                            disabled={!isPartVerified}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </td>

                                  {/* Post Non-Cosmetic Images (Unload) */}
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                                    <div className="space-y-2">
                                      {/* Show existing final non-cosmetic images */}
                                      {existingImages.finalNonCosmeticImages &&
                                      existingImages.finalNonCosmeticImages
                                        .length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="text-xs text-gray-500 mb-1">
                                            Final non-cosmetic images (
                                            {
                                              existingImages
                                                .finalNonCosmeticImages.length
                                            }
                                            ):
                                          </div>
                                          <div className="grid grid-cols-2 gap-1">
                                            {existingImages.finalNonCosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Final Non-Cosmetic ${
                                                      imgIndex + 1
                                                    }`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      ) : row.nonCosmeticImages &&
                                        row.nonCosmeticImages.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-1">
                                            {row.nonCosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Post Non-Cosmetic ${imgIndex + 1}`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors bg-orange-50">
                                          <Upload
                                            size={20}
                                            className="text-orange-400 mb-2"
                                          />
                                          <span className="text-sm font-medium text-orange-600">
                                            Upload Post Non-Cosmetic
                                          </span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file && isPartVerified) {
                                                handleFinalRoundImageUpload(
                                                  row.id,
                                                  part.partNumber,
                                                  "nonCosmetic",
                                                  file,
                                                );
                                              }
                                            }}
                                            className="hidden"
                                            disabled={!isPartVerified}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </td>
                                </>
                              ) : (
                                // FIRST ROUND MODE: 3 columns only
                                <>
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                                    <div className="space-y-2">
                                      {row.cosmeticImages?.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-1">
                                            {row.cosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Cosmetic ${imgIndex + 1}`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                  {row.checkpointLabel && (
                                                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                                                      {row.checkpointLabel}
                                                    </div>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Upload logic remains untouched */}
                                      {row.isCheckpointRow && (
                                        <>
                                          {!row.isT0 &&
                                            row.checkpointLabel &&
                                            !["t0", "0"].includes(
                                              row.checkpointLabel
                                                .toLowerCase()
                                                .trim(),
                                            ) && (
                                              <label className="flex items-center justify-center p-2 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                                <div className="text-center">
                                                  <Upload
                                                    size={16}
                                                    className="text-blue-400 mx-auto mb-1"
                                                  />
                                                  <span className="text-xs font-medium text-blue-600">
                                                    Upload Cosmetic
                                                  </span>
                                                </div>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  multiple={
                                                    projectType === "Hulk"
                                                  }
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    const files =
                                                      e.target.files;
                                                    if (files) {
                                                      Array.from(files).forEach(
                                                        (file) =>
                                                          handleCheckpointImageUpload(
                                                            row.id,
                                                            row.partNumber,
                                                            "cosmetic",
                                                            file,
                                                            row.checkpointLabel,
                                                            row.childTestId,
                                                          ),
                                                      );
                                                    }
                                                  }}
                                                />
                                              </label>
                                            )}
                                        </>
                                      )}
                                    </div>
                                  </td>

                                  {/* Non-Cosmetic Images Column */}
                                  <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                                    <div className="space-y-2">
                                      {row.nonCosmeticImages.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-1">
                                            {row.nonCosmeticImages.map(
                                              (img, imgIndex) => (
                                                <div
                                                  key={imgIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={img}
                                                    alt={`Non-Cosmetic ${imgIndex + 1}`}
                                                    className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                                  />
                                                  {row.checkpointLabel && (
                                                    <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
                                                      {row.checkpointLabel}
                                                    </div>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Upload button for checkpoint rows */}
                                      {row.isCheckpointRow && (
                                        <>
                                          {/* Only show upload button if NOT T0 */}
                                          {!row.isT0 &&
                                            row.checkpointLabel &&
                                            !["T0", "0", "t0"].includes(
                                              row.checkpointLabel
                                                .toLowerCase()
                                                .trim(),
                                            ) && (
                                              <label className="flex items-center justify-center p-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                                                <div className="text-center">
                                                  <Upload
                                                    size={16}
                                                    className="text-green-400 mx-auto mb-1"
                                                  />
                                                  <span className="text-xs font-medium text-green-600">
                                                    Upload Non-Cosmetic
                                                  </span>
                                                </div>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    const file =
                                                      e.target.files?.[0];
                                                    if (file) {
                                                      handleCheckpointImageUpload(
                                                        row.id,
                                                        row.partNumber,
                                                        "nonCosmetic",
                                                        file,
                                                        row.checkpointLabel,
                                                        row.childTestId,
                                                      );
                                                    }
                                                  }}
                                                />
                                              </label>
                                            )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}

                              {/* Custom Columns */}
                              {formData.customColumns?.map((column) => (
                                <td
                                  key={column.id}
                                  className={`px-4 py-4 border-r border-gray-200 ${
                                    column.type === "image"
                                      ? "min-w-[200px]"
                                      : ""
                                  }`}
                                >
                                  {renderField(row, column)}
                                </td>
                              ))}

                              {shouldRenderCheckpointStatusColumn && (
                                <td className="px-4 py-4">
                                  {isSecondRound ? (
                                    showCheckpointForThisPart &&
                                    isCheckpointRow ? (
                                      <div className="w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold bg-gray-100">
                                        <span
                                          className={`inline-block w-full text-center ${
                                            row.checkpointStatus === "Pass"
                                              ? "text-green-700"
                                              : row.checkpointStatus === "Fail"
                                                ? "text-red-700"
                                                : "text-gray-700"
                                          }`}
                                        >
                                          {row.checkpointStatus || "N/A"}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="w-full min-w-[110px] px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 text-center">
                                        {row.isT0
                                          ? "Pre-Test"
                                          : showCheckpointForThisPart
                                            ? "Not Started"
                                            : "N/A"}
                                      </div>
                                    )
                                  ) : canEditCheckpointStatus ? (
                                    <select
                                      value={row.checkpointStatus || ""}
                                      onChange={(e) =>
                                        updateRowField(
                                          row.id,
                                          "checkpointStatus",
                                          e.target.value,
                                        )
                                      }
                                      className={`w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        row.checkpointStatus === "Pass"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : row.checkpointStatus === "Fail"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-white border-gray-300 text-gray-700"
                                      }`}
                                    >
                                      <option value="">Select</option>
                                      <option value="Pass">Pass</option>
                                      <option value="Fail">Fail</option>
                                    </select>
                                  ) : (
                                    <div className="w-full min-w-[110px] px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 text-center">
                                      {row.isT0
                                        ? "Pre-Test"
                                        : showCheckpointForThisPart
                                          ? "Not Started"
                                          : "N/A"}
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* Status Column for Unload */}
                              {isSecondRound && (
                                <td className="px-4 py-4">
                                  <select
                                    value={row.status}
                                    onChange={(e) =>
                                      updateRowField(
                                        row.id,
                                        "status",
                                        e.target.value,
                                      )
                                    }
                                    className={`w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                      row.status === "Pass"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : row.status === "Fail"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-white border-gray-300 text-gray-700"
                                    }`}
                                  >
                                    <option value="">Select</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                  </select>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Add New Column
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Column Label
                </label>
                <input
                  type="text"
                  value={newColumn.label}
                  onChange={(e) =>
                    setNewColumn((prev) => ({ ...prev, label: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter column name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data Type
                </label>
                <select
                  value={newColumn.type}
                  onChange={(e) =>
                    setNewColumn((prev) => ({
                      ...prev,
                      type: e.target.value as any,
                      options: e.target.value === "select" ? [] : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                  <option value="textarea">Text Area</option>
                  <option value="image">Image</option>
                </select>
              </div>
              {newColumn.type === "select" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addOption()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add option"
                      />
                      <button
                        onClick={addOption}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newColumn.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                        >
                          <span className="text-sm">{option}</span>
                          <button
                            onClick={() => removeOption(option)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddColumn}
                disabled={!newColumn.label.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Column
              </button>
              <button
                onClick={() => setShowAddColumnModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function MultiStageTestFormEnhanced() {
  const [currentStage, setCurrentStage] = useState(0);
  const [currentRecord, setCurrentRecord] = useState<Stage2Record | null>(null);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [isSecondRound, setIsSecondRound] = useState(false);
  const [sharedImagesByPart, setSharedImagesByPart] =
    useState<SharedImagesByPart>({});
  const [forms, setForms] = useState<FormsState>({});
  const [timerStates, setTimerStates] = useState<TestTimerState>({});
  const [croppedRegions, setCroppedRegions] = useState<CroppedRegion[]>([]);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [hasYellowMarks, setHasYellowMarks] = useState<boolean | null>(null);
  const [processingImages, setProcessingImages] = useState<
    Record<string, boolean>
  >({});
  const [projectType, setProjectType] = useState<string>(""); // Default to Flash
  // Add this state variable
  const [masterSheetData, setMasterSheetData] = useState<any[]>([]);
  const [testConditionsMap, setTestConditionsMap] = useState<
    Map<string, string>
  >(new Map());
  const [verifiedPartsForFinalUpload, setVerifiedPartsForFinalUpload] =
    useState<Set<string>>(new Set());
  const [progressStates, setProgressStates] = useState<ProgressState>({});

  const [scanState, setScanState] = useState<ScanState>({
    isScanning: false,
    scannedParts: [],
    partInput: "",
    showScanModal: false,
    availableTests: [],
    selectedTest: "",
    machineDetails: null,
    uploadingImages: {},
    isScanningForCheckpoint: false, // Add this
    checkpointHour: 0, // Add this
  });

  const [showCheckpointConfirmDialog, setShowCheckpointConfirmDialog] =
    useState(false);
  const [selectedPartsForCheckpoint, setSelectedPartsForCheckpoint] = useState<
    string[]
  >([]);

  const location = useLocation();
  const navigate = useNavigate();

  // Add real-time checkpoint time checking
useEffect(() => {
  const interval = setInterval(() => {
    // Force re-render to update button state every minute
    // This will trigger the Progress Checkpoint button logic to re-evaluate
    setForms((prev) => ({ ...prev }));
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);

  // Update the getNextCheckpointName function
  const getNextCheckpointName = (partNumber: string): string => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) return "";

      const chamberLoads = JSON.parse(chamberLoadsStr);

      for (const load of chamberLoads) {
        if (load.parts && Array.isArray(load.parts)) {
          const part = load.parts.find((p: any) => p.partNumber === partNumber);
          if (part && part.checkpointInfo) {
            const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;

            if (currentCheckpointIndex < checkpoints.length) {
              return checkpoints[currentCheckpointIndex];
            }
          }
        }
      }

      return "";
    } catch (error) {
      console.error("Error getting next checkpoint name:", error);
      return "";
    }
  };

  const confirmCheckpointProgress = async () => {
    if (selectedPartsForCheckpoint.length === 0) return;

    try {
      const formKey = `test_${currentTestIndex}`;
      const currentForm = forms[formKey];

      if (!currentForm) {
        alert("Form data not available for the current test.");
        return;
      }

      const normalizeCheckpointLabel = (
        label: string | number | null | undefined,
      ): string =>
        typeof label === "number"
          ? label.toString().trim().toLowerCase()
          : (label || "").toString().trim().toLowerCase();

      const findStatusSelection = (
        partNumber: string,
        checkpointLabel: string,
        checkpointIndex: number,
      ):
        | {
            status: "Pass" | "Fail";
            label: string;
          }
        | undefined => {
        const rowsForPart = currentForm.rows.filter(
          (row) => row.partNumber === partNumber && row.isCheckpointRow,
        );

        const normalizedLabel = normalizeCheckpointLabel(checkpointLabel);

        let matchingRow =
          rowsForPart.find(
            (row) =>
              normalizeCheckpointLabel(row.checkpointLabel) === normalizedLabel,
          ) ?? null;

        if (!matchingRow) {
          matchingRow =
            rowsForPart.find(
              (row) =>
                typeof row.checkpointHours === "number" &&
                row.checkpointHours === checkpointIndex,
            ) ?? null;
        }

        if (
          matchingRow &&
          (matchingRow.checkpointStatus === "Pass" ||
            matchingRow.checkpointStatus === "Fail")
        ) {
          return {
            status: matchingRow.checkpointStatus,
            label: matchingRow.checkpointLabel || checkpointLabel,
          };
        }

        const normalizedCheckpointLabel =
          normalizeCheckpointLabel(checkpointLabel);
        const isPreTestCheckpoint =
          checkpointIndex === 0 ||
          normalizedCheckpointLabel === "t0" ||
          normalizedCheckpointLabel === "0";

        if (isPreTestCheckpoint) {
          const derivedLabel =
            matchingRow?.checkpointLabel || checkpointLabel || "T0";
          return {
            status: "Pass",
            label: derivedLabel,
          };
        }

        return undefined;
      };

      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) {
        alert("Chamber loads data not found!");
        return;
      }

      const chamberLoads = JSON.parse(chamberLoadsStr);
      const currentTime = new Date().toISOString();
      const targetParts = new Set(selectedPartsForCheckpoint);
      const completedCheckpointByPart: Record<
        string,
        {
          label: string;
          status: "Pass" | "Fail";
        }
      > = {};
      const partsWithUpcomingCheckpoints: Set<string> = new Set();
      const upcomingCheckpointMeta: Record<
        string,
        {
          label: string;
          index: number;
          serialNumber?: string;
        }
      > = {};
      let updated = false;

      const updatedLoads = chamberLoads.map((load: any) => {
        if (!Array.isArray(load.parts)) {
          return load;
        }

        const updatedParts = load.parts.map((part: any) => {
          if (!targetParts.has(part.partNumber) || !part.checkpointInfo) {
            return part;
          }

          const { checkpoints, currentCheckpointIndex, checkpointHistory } =
            part.checkpointInfo;

          if (currentCheckpointIndex >= checkpoints.length) {
            return part;
          }

          const completedCheckpoint = checkpoints[currentCheckpointIndex];
          const selection = findStatusSelection(
            part.partNumber,
            completedCheckpoint,
            currentCheckpointIndex,
          );

          if (!selection || selection.status !== "Pass") {
            return part;
          }

          const checkpointScanData = JSON.parse(
            localStorage.getItem("checkpointScanData") || "{}",
          );
          const partCheckpointData =
            checkpointScanData[part.partNumber]?.[completedCheckpoint] || {};

          const newHistory = [
            ...(checkpointHistory || []),
            {
              checkpoint: completedCheckpoint,
              completedAt: currentTime,
              status: selection.status,
              images: {
                cosmetic: partCheckpointData.cosmeticImages || [],
                nonCosmetic: partCheckpointData.nonCosmeticImages || [],
                cropped: partCheckpointData.croppedImages || [],
              },
            },
          ];

          const nextIndex = currentCheckpointIndex + 1;
          if (nextIndex < checkpoints.length) {
            partsWithUpcomingCheckpoints.add(part.partNumber);
            upcomingCheckpointMeta[part.partNumber] = {
              label: checkpoints[nextIndex],
              index: nextIndex,
              serialNumber: part.serialNumber,
            };
          }

          completedCheckpointByPart[part.partNumber] = {
            label: selection.label || completedCheckpoint,
            status: selection.status,
          };
          updated = true;

          return {
            ...part,
            checkpointInfo: {
              ...part.checkpointInfo,
              currentCheckpointIndex: nextIndex,
              lastCheckpointTime: currentTime,
              nextCheckpointTime:
                nextIndex < checkpoints.length ? currentTime : null,
              checkpointHistory: newHistory,
            },
          };
        });

        return {
          ...load,
          parts: updatedParts,
        };
      });

      if (!updated) {
        alert("No checkpoints were updated. Please verify the selected parts.");
        return;
      }

      localStorage.setItem("chamberLoads", JSON.stringify(updatedLoads));

      // PUT TO BACKEND: Update checkpoint progress
      if (currentRecord?.machineLoadData) {
        const loadData = currentRecord.machineLoadData;

        const checkpointData: Partial<TestingPartData> = {
          status: "checkpoint_in_progress",
          testStatus: "checkpoint_updated",
          lastUpdated: new Date().toISOString(),
          parts:
            updatedLoads.find(
              (load: any) =>
                load.id === loadData.loadId || load.loadId === loadData.loadId,
            )?.parts || loadData.parts,
        };

        try {
          await updateTestingPartInBackend(loadData.loadId, checkpointData);
          console.log("Checkpoint progress synced to backend");
        } catch (error) {
          console.error(
            "Failed to sync checkpoint progress to backend:",
            error,
          );
        }
      }

      const currentChildTest =
        currentForm.childTests?.[currentForm.currentChildTestIndex || 0];

      const updatedRows = currentForm.rows.map((row) => {
        const checkpointUpdate = completedCheckpointByPart[row.partNumber];
        if (
          checkpointUpdate &&
          normalizeCheckpointLabel(row.checkpointLabel) ===
            normalizeCheckpointLabel(checkpointUpdate.label)
        ) {
          const statusToApply = checkpointUpdate.status;
          return {
            ...row,
            checkpointStatus: statusToApply,
            status:
              statusToApply === "Pass"
                ? "Pass"
                : statusToApply === "Fail"
                  ? "Fail"
                  : row.status,
          };
        }
        return row;
      });

      // UPDATE HERE: Instead of auto-adding rows, prepare for scanning
      const rowsToAppend: FormRow[] = [];

      partsWithUpcomingCheckpoints.forEach((partNumber) => {
        const meta = upcomingCheckpointMeta[partNumber];
        if (!meta || !meta.label) {
          return;
        }

        const alreadyExists = updatedRows.some(
          (row) =>
            row.partNumber === partNumber &&
            row.checkpointLabel === meta.label &&
            row.isCheckpointRow,
        );

        if (alreadyExists) {
          return;
        }

        const numericMatch = meta.label.match(/\d+/);
        const checkpointHoursValue = numericMatch
          ? parseInt(numericMatch[0], 10)
          : meta.index;

        const newRow: FormRow = {
          id: Date.now() + Math.random(),
          srNo: meta.index + 1,
          testDate: new Date().toISOString().split("T")[0],
          config: "",
          sampleId: partNumber,
          status: "Pending",
          partNumber: partNumber,
          serialNumber: meta.serialNumber || "",
          childTestId: currentChildTest?.id,
          childTestName: currentChildTest?.name,
          checkpointLabel: meta.label,
          checkpointStatus: "",
          checkpointHours: checkpointHoursValue,
          cosmeticImages: [],
          cosmeticImage: "",
          nonCosmeticImages: [],
          nonCosmeticImage: "",
          croppedImages: [],
          croppedImage: "",
          regionLabel: "",
          isCheckpointRow: true,
          isT0: /t0/i.test(meta.label),
        };

        if (currentForm.customColumns) {
          currentForm.customColumns.forEach((col) => {
            newRow[col.id] = "";
          });
        }

        rowsToAppend.push(newRow);
      });

      const finalRows = [...updatedRows, ...rowsToAppend];

      setForms((prev) => ({
        ...prev,
        [formKey]: {
          ...prev[formKey],
          rows: finalRows,
        },
      }));

      // Close confirmation dialog
      setShowCheckpointConfirmDialog(false);
      setSelectedPartsForCheckpoint([]);

      // OPEN SCAN MODAL FOR PARTS WITH UPCOMING CHECKPOINTS
      if (partsWithUpcomingCheckpoints.size > 0) {
        setScanState({
          ...scanState,
          showScanModal: true,
          isScanningForCheckpoint: true,
          partInput: "",
          scannedParts: [],
          checkpointImages: {},
          eligibleParts: Array.from(partsWithUpcomingCheckpoints),
        });
      } else {
        alert("Checkpoint progress updated! No upcoming checkpoints to scan.");
      }
    } catch (error) {
      console.error("Error confirming checkpoint progress:", error);
      alert("Error updating checkpoint progress. Please try again.");
    }
  };

  const resolveCheckpointsForPart = useCallback(
    (partNumber: string): string[] => {
      try {
        const chamberLoadsStr = localStorage.getItem("chamberLoads");
        if (!chamberLoadsStr) return [];

        const chamberLoads = JSON.parse(chamberLoadsStr);

        for (const load of chamberLoads) {
          const part = load.parts?.find(
            (p: any) => p.partNumber === partNumber,
          );

          if (!part) continue;

          const testUnit = part.testUnit || load.testUnit;
          const normalizedUnit = testUnit?.toLowerCase().trim();

          const formatCheckpoint = (cp: any) => {
            const numericValue =
              typeof cp === "number" ? cp : parseFloat(cp as string);

            if (Number.isNaN(numericValue)) {
              return typeof cp === "string" ? cp : "";
            }

            if (
              numericValue === 0 ||
              (typeof cp === "string" && cp.toLowerCase() === "t0")
            ) {
              return "T0";
            }

            switch (normalizedUnit) {
              case "hours":
              case "hour":
                return `${numericValue} hrs`;
              case "cycles":
              case "cycle":
                return `${numericValue} cycles`;
              case "drops":
                return `${numericValue} drops`;
              case "grams":
                return `${numericValue} g`;
              case "orientation":
                return `${numericValue} deg`;
              default:
                return typeof cp === "string" ? cp : `${numericValue}`;
            }
          };

          if (
            part.checkpointInfo?.checkpoints &&
            Array.isArray(part.checkpointInfo.checkpoints)
          ) {
            return part.checkpointInfo.checkpoints.map((cp: any) =>
              typeof cp === "string" ? cp : formatCheckpoint(cp),
            );
          }

          if (Array.isArray(part.allCheckpoints)) {
            return part.allCheckpoints.map(formatCheckpoint);
          }

          if (Array.isArray(load.machineDetails?.selectedTest?.checkpoints)) {
            return load.machineDetails.selectedTest.checkpoints.map(
              formatCheckpoint,
            );
          }
        }

        return [];
      } catch (error) {
        console.error("Error resolving checkpoints for part:", error);
        return [];
      }
    },
    [],
  );

  // Function to load master sheet data from database config
  const loadMasterExcelSheet = async () => {
    try {
      const testAllocations = await apiService.getTestAllocations();

      const jsonData: any[] = testAllocations.map((item) => ({
        "Product": item.product || "",
        "Processes Stage": item.processesStage || "",
        "MP/NPI": item.mpNpi || "",
        "Test Name": item.testName || "",
        "Test Condition": item.testCondition || "",
        "Checkpoints": item.checkpoints || "",
        "Machine / Equipment": item.machineEquipment || "",
        "Machine / Equipment-2": item.machineEquipment2 || "",
        "Time": item.time || "",
        "Unit": item.unit || "",
        "Location": item.location || "",
        "Qty": item.qty || ""
      }));

      setMasterSheetData(jsonData);

      // Create a map of test names to test conditions
      const conditionsMap = new Map<string, string>();
      jsonData.forEach((row: any) => {
        const testName = row["Test Name"]?.toString().trim() || "";
        const testCondition = row["Test Condition"]?.toString().trim() || "";
        if (testName && testCondition) {
          conditionsMap.set(testName, testCondition);
        }
      });
      setTestConditionsMap(conditionsMap);

      console.log("Master sheet loaded from DB:", jsonData.length, "records");
      console.log("Test conditions map:", conditionsMap);
    } catch (error) {
      console.error("Failed to load master sheet data from DB:", error);
    }
  };

  const syncCheckpointDataFromChamberLoads =
    (
      chamberLoads: any[],
      normalizeLabel: (label: string | number | null | undefined) => string,
    ) =>
    (prev: FormsState): FormsState => {
      const updatedForms = { ...prev };
      let anyChanges = false;

      Object.keys(updatedForms).forEach((formKey) => {
        const formData = updatedForms[formKey];
        if (!formData || !Array.isArray(formData.rows)) {
          return;
        }

        let formChanged = false;

        const updatedRows = formData.rows.map((row) => {
          if (!row.isCheckpointRow) {
            return row;
          }

          let matchedPart: any = null;
          let rowCheckpointData: any = null;

          for (const load of chamberLoads) {
            if (!Array.isArray(load.parts)) {
              continue;
            }

            const candidate = load.parts.find(
              (p: any) => p.partNumber === row.partNumber,
            );

            if (candidate) {
              matchedPart = candidate;

              if (
                candidate.checkpointScans &&
                typeof row.checkpointNumber !== "undefined" &&
                candidate.checkpointScans[row.checkpointNumber]
              ) {
                rowCheckpointData =
                  candidate.checkpointScans[row.checkpointNumber];
              }
              break;
            }
          }

          let nextRow = row;

          if (rowCheckpointData) {
            const updatedRow = {
              ...nextRow,
              cosmeticImages:
                rowCheckpointData.cosmeticImages || nextRow.cosmeticImages,
              cosmeticImage:
                rowCheckpointData.cosmeticImages?.[0] || nextRow.cosmeticImage,
              nonCosmeticImages:
                rowCheckpointData.nonCosmeticImages ||
                nextRow.nonCosmeticImages,
              nonCosmeticImage:
                rowCheckpointData.nonCosmeticImages?.[0] ||
                nextRow.nonCosmeticImage,
            };

            if (
              updatedRow.cosmeticImage !== nextRow.cosmeticImage ||
              updatedRow.nonCosmeticImage !== nextRow.nonCosmeticImage ||
              updatedRow.cosmeticImages !== nextRow.cosmeticImages ||
              updatedRow.nonCosmeticImages !== nextRow.nonCosmeticImages
            ) {
              nextRow = updatedRow;
            }
          }

          if (matchedPart && !nextRow.checkpointStatus) {
            const normalizedLabel = normalizeLabel(nextRow.checkpointLabel);

            let derivedStatus: "Pass" | "Fail" | undefined;

            const history = matchedPart.checkpointInfo?.checkpointHistory || [];
            if (Array.isArray(history) && history.length > 0) {
              const historyMatch = history.find(
                (entry: any) =>
                  normalizeLabel(entry?.checkpoint) === normalizedLabel,
              );

              if (
                historyMatch &&
                (historyMatch.status === "Pass" ||
                  historyMatch.status === "Fail")
              ) {
                derivedStatus = historyMatch.status;
              }
            }

            if (!derivedStatus) {
              const checkpoints = matchedPart.checkpointInfo?.checkpoints || [];
              const checkpointIndex = checkpoints.findIndex(
                (cp: any) => normalizeLabel(cp) === normalizedLabel,
              );

              const currentIndex = (() => {
                const infoIndex =
                  matchedPart.checkpointInfo?.currentCheckpointIndex;
                if (typeof infoIndex === "number") return infoIndex;
                const legacyIndex = matchedPart.checkpointInfo?.checkpointIndex;
                if (typeof legacyIndex === "number") return legacyIndex;
                if (typeof matchedPart.checkpointIndex === "number") {
                  return matchedPart.checkpointIndex;
                }
                return undefined;
              })();

              if (
                typeof currentIndex === "number" &&
                checkpointIndex > -1 &&
                checkpointIndex < currentIndex
              ) {
                derivedStatus = "Pass";
              }
            }

            if (derivedStatus) {
              const updatedRow = {
                ...nextRow,
                checkpointStatus: derivedStatus,
                status:
                  derivedStatus === "Pass"
                    ? "Pass"
                    : derivedStatus === "Fail"
                      ? "Fail"
                      : nextRow.status,
              };

              if (
                updatedRow.checkpointStatus !== nextRow.checkpointStatus ||
                updatedRow.status !== nextRow.status
              ) {
                nextRow = updatedRow;
              }
            }
          }

          if (nextRow !== row) {
            formChanged = true;
          }

          return nextRow;
        });

        if (formChanged) {
          updatedForms[formKey] = {
            ...formData,
            rows: updatedRows,
          };
          anyChanges = true;
        }
      });

      return anyChanges ? updatedForms : prev;
    };

  const syncCheckpointData = useCallback(() => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) {
        return;
      }

      const chamberLoads = JSON.parse(chamberLoadsStr);

      setForms(
        syncCheckpointDataFromChamberLoads(
          chamberLoads,
          normalizeCheckpointLabel,
        ),
      );
    } catch (error) {
      console.error("Error syncing checkpoint data from chamberLoads:", error);
    }
  }, [setForms]);

  useEffect(() => {
    syncCheckpointData();
  }, [syncCheckpointData]);

  useEffect(() => {
    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];
    const currentTestRecord = currentRecord?.testRecords?.[currentTestIndex];

    console.log(currentRecord);

    if (!formData || !currentTestRecord) {
      return;
    }

    const currentChildTest =
      formData.childTests?.[formData.currentChildTestIndex || 0];
    const childTestId = currentChildTest?.id;
    const assignedParts = currentTestRecord.assignedParts || [];
    const existingRows = formData.rows || [];
    const newRows: FormRow[] = [];

    assignedParts.forEach((part) => {
      const checkpoints = resolveCheckpointsForPart(part.partNumber);
      if (!checkpoints.length) {
        return;
      }

      checkpoints.forEach((label, idx) => {
        const labelText = String(label ?? "").trim();
        const normalizedLabel = labelText.toLowerCase();
        const alreadyExists = existingRows.some(
          (row) =>
            row.partNumber === part.partNumber &&
            row.isCheckpointRow &&
            (childTestId ? row.childTestId === childTestId : true) &&
            (row.checkpointLabel || "").trim().toLowerCase() ===
              normalizedLabel,
        );

        if (alreadyExists) {
          return;
        }

        const isT0 = /t0/i.test(labelText) || idx === 0;
        const numericMatch = labelText.match(/\d+/);
        const checkpointHoursValue = numericMatch
          ? parseInt(numericMatch[0], 10)
          : idx;

        const newRow: FormRow = {
          id: Date.now() + Math.random(),
          srNo: idx + 1,
          testDate: new Date().toISOString().split("T")[0],
          config: "",
          sampleId: part.partNumber,
          status: "Pending",
          partNumber: part.partNumber,
          serialNumber: part.serialNumber,
          childTestId,
          childTestName: currentChildTest?.name,
          checkpointLabel: labelText,
          checkpointStatus: isT0 ? "Pass" : "",
          checkpointHours: checkpointHoursValue,
          cosmeticImages: [],
          cosmeticImage: "",
          nonCosmeticImages: [],
          nonCosmeticImage: "",
          croppedImages: [],
          croppedImage: "",
          regionLabel: "",
          isCheckpointRow: true,
          isT0,
        };

        if (formData.customColumns) {
          formData.customColumns.forEach((col) => {
            newRow[col.id] = "";
          });
        }

        newRows.push(newRow);
      });
    });

    if (newRows.length > 0) {
      setForms((prev) => ({
        ...prev,
        [formKey]: {
          ...prev[formKey],
          rows: [...prev[formKey].rows, ...newRows],
        },
      }));

      setTimeout(() => {
        syncCheckpointData();
      }, 0);
    }
  }, [
    currentRecord,
    currentTestIndex,
    forms,
    resolveCheckpointsForPart,
    syncCheckpointData,
  ]);

  // Load timer states from localStorage on component mount
  useEffect(() => {
    const savedTimerStates = localStorage.getItem("testTimerStates");
    if (savedTimerStates) {
      try {
        const parsedStates = JSON.parse(savedTimerStates);
        setTimerStates(parsedStates);
      } catch (error) {
        console.error("Error loading timer states:", error);
      }
    }
  }, []);

  // Save timer states to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(timerStates).length > 0) {
      localStorage.setItem("testTimerStates", JSON.stringify(timerStates));
    }
  }, [timerStates]);

  const updateCheckpointStatusInChamberLoads = (
    partNumber: string,
    checkpointHour: number,
    status: "Pass" | "Fail",
    processed: boolean = true,
  ) => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) return;

      const chamberLoads = JSON.parse(chamberLoadsStr);
      let updated = false;

      const updatedLoads = chamberLoads.map((load: any) => {
        if (load.parts && Array.isArray(load.parts)) {
          const updatedParts = load.parts.map((part: any) => {
            if (
              part.partNumber === partNumber &&
              part.checkpointScans &&
              part.checkpointScans[checkpointHour]
            ) {
              updated = true;

              // Update checkpoint scan status
              part.checkpointScans[checkpointHour] = {
                ...part.checkpointScans[checkpointHour],
                status: status,
                processed: processed,
              };

              // Add to checkpoint history
              if (!part.checkpointHistory) {
                part.checkpointHistory = [];
              }

              part.checkpointHistory.push({
                hour: checkpointHour,
                status: status,
                testedAt: new Date().toISOString(),
              });

              // Update checkpoint info
              if (part.checkpointInfo) {
                part.checkpointInfo.lastStatus = status;
                part.checkpointInfo.lastUpdated = new Date().toISOString();
              }

              return part;
            }
            return part;
          });

          return {
            ...load,
            parts: updatedParts,
          };
        }
        return load;
      });

      if (updated) {
        localStorage.setItem("chamberLoads", JSON.stringify(updatedLoads));
        console.log(
          `Updated checkpoint status for ${partNumber} at hour ${checkpointHour}: ${status}`,
        );
      }
    } catch (error) {
      console.error("Error updating checkpoint status in chamberLoads:", error);
    }
  };

  const loadImagesFromStorage = (
    partNumber: string,
    childTestId?: string,
  ): {
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    finalCosmeticImages?: string[];
    finalNonCosmeticImages?: string[];
    utmCroppedImages?: Record<string, string>;
  } => {
    try {
      const toAbsoluteImage = (value: unknown): string | null => {
        if (typeof value !== "string") {
          return null;
        }
        const trimmed = value.trim();
        if (!trimmed) {
          return null;
        }
        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
          return trimmed;
        }
        const baseUrl = getBackendApiUrl().replace(/\/$/, "");
        const normalizedPath = trimmed.startsWith("/")
          ? trimmed
          : `/${trimmed}`;
        return `${baseUrl}${normalizedPath}`;
      };

      const toAbsoluteList = (values?: unknown): string[] => {
        if (!Array.isArray(values)) {
          return [];
        }
        const resolved = values
          .map((item) => toAbsoluteImage(item))
          .filter((item): item is string => Boolean(item));
        return Array.from(new Set(resolved));
      };

      const mergeUnique = (
        primary: string[],
        ...additional: string[][]
      ): string[] => {
        const seen = new Set<string>();
        const result: string[] = [];

        const append = (list?: string[]) => {
          list?.forEach((value) => {
            if (typeof value !== "string") {
              return;
            }
            const key = value.trim();
            if (!key || seen.has(key)) {
              return;
            }
            seen.add(key);
            result.push(value);
          });
        };

        append(primary);
        additional.forEach((list) => append(list));
        return result;
      };

      let chamberCosmeticImages: string[] = [];
      let chamberNonCosmeticImages: string[] = [];
      let chamberFinalCosmeticImages: string[] = [];
      let chamberFinalNonCosmeticImages: string[] = [];
      let utmImages: Record<string, string> = {};

      try {
        const chamberLoadsStr = localStorage.getItem("chamberLoads");
        if (chamberLoadsStr) {
          const chamberLoads = JSON.parse(chamberLoadsStr);
          const preferredLoadId = currentRecord?.machineLoadData?.loadId;

          const searchLoads = (loads: any[], allowAnyLoad = false): boolean => {
            for (const load of loads) {
              if (
                !allowAnyLoad &&
                preferredLoadId !== undefined &&
                load.id !== preferredLoadId &&
                load.loadId !== preferredLoadId
              ) {
                continue;
              }

              const part = load.parts?.find(
                (p: any) => p.partNumber === partNumber,
              );

              if (!part) {
                continue;
              }

              chamberCosmeticImages = toAbsoluteList(part.cosmeticImages);
              chamberNonCosmeticImages = toAbsoluteList(part.nonCosmeticImages);
              chamberFinalCosmeticImages = toAbsoluteList(
                part.finalCosmeticImages ||
                  part.unloadCosmeticImages ||
                  part.cosmeticImagesFinal,
              );
              chamberFinalNonCosmeticImages = toAbsoluteList(
                part.finalNonCosmeticImages ||
                  part.unloadNonCosmeticImages ||
                  part.nonCosmeticImagesFinal,
              );

              if (childTestId && part.utmCroppedImages) {
                const candidate =
                  part.utmCroppedImages[childTestId] ||
                  part.utmCroppedImages.default;
                if (candidate && typeof candidate === "object") {
                  utmImages = candidate;
                }
              }

              if (
                chamberCosmeticImages.length > 0 ||
                chamberNonCosmeticImages.length > 0 ||
                chamberFinalCosmeticImages.length > 0 ||
                chamberFinalNonCosmeticImages.length > 0
              ) {
                return true;
              }
            }
            return false;
          };

          const foundInPreferred = searchLoads(chamberLoads);
          if (!foundInPreferred) {
            searchLoads(chamberLoads, true);
          }
        }
      } catch (error) {
        console.error("Error loading chamber load images:", error);
      }

      const backendPart = currentRecord?.machineLoadData?.parts?.find(
        (part) => part.partNumber === partNumber,
      ) as
        | (LoadedPart & {
            finalCosmeticImages?: unknown;
            finalNonCosmeticImages?: unknown;
          })
        | undefined;

      const backendCosmeticImages = toAbsoluteList(backendPart?.cosmeticImages);
      const backendNonCosmeticImages = toAbsoluteList(
        backendPart?.nonCosmeticImages,
      );
      const backendFinalCosmeticImages = toAbsoluteList(
        backendPart?.finalCosmeticImages,
      );
      const backendFinalNonCosmeticImages = toAbsoluteList(
        backendPart?.finalNonCosmeticImages,
      );

      const cachedCosmeticImages: string[] = [];
      const cachedNonCosmeticImages: string[] = [];
      const cachedFinalCosmeticImages: string[] = [];
      const cachedFinalNonCosmeticImages: string[] = [];

      const cosmeticImages = mergeUnique(
        cachedCosmeticImages,
        chamberCosmeticImages,
        backendCosmeticImages,
      );
      const nonCosmeticImages = mergeUnique(
        cachedNonCosmeticImages,
        chamberNonCosmeticImages,
        backendNonCosmeticImages,
      );
      const finalCosmeticImages = mergeUnique(
        cachedFinalCosmeticImages,
        chamberFinalCosmeticImages,
        backendFinalCosmeticImages,
      );
      const finalNonCosmeticImages = mergeUnique(
        cachedFinalNonCosmeticImages,
        chamberFinalNonCosmeticImages,
        backendFinalNonCosmeticImages,
      );

      return {
        cosmeticImages,
        nonCosmeticImages,
        finalCosmeticImages,
        finalNonCosmeticImages,
        utmCroppedImages: utmImages,
      };
    } catch (error) {
      console.error("Error loading images from storage:", error);
      return {
        cosmeticImages: [],
        nonCosmeticImages: [],
        finalCosmeticImages: [],
        finalNonCosmeticImages: [],
        utmCroppedImages: {},
      };
    }
  };

  // Function to automatically process images from localStorage
  const processImagesFromStorage = () => {
    if (!cvLoaded) {
      console.log("OpenCV not loaded yet, waiting...");
      return;
    }

    console.log("Processing images from storage...");

    Object.keys(forms).forEach((formKey) => {
      const formData = forms[formKey];
      const currentChildTest =
        formData.childTests?.[formData.currentChildTestIndex || 0];

      formData.rows.forEach((row) => {
        const existingImages = loadImagesFromStorage(row.partNumber);

        // Determine which images to process based on round
        const imagesToProcess = isSecondRound
          ? existingImages.finalNonCosmeticImages || []
          : existingImages.nonCosmeticImages || [];

        imagesToProcess.forEach((imageData, index) => {
          // Only process if not already processed
          const hasBeenProcessed =
            row.croppedImages && row.croppedImages.length > index;
          if (
            !hasBeenProcessed &&
            imageData &&
            shouldSplitImages(formData.testName)
          ) {
            console.log(
              `Processing stored image for part ${row.partNumber}, index ${index}`,
            );

            const processingKey = `${row.partNumber}-${index}`;

            // Set processing state for this image
            setProcessingImages((prev) => ({
              ...prev,
              [processingKey]: true,
            }));

            const releaseProcessing = () => {
              setProcessingImages((prev) => {
                const next = { ...prev };
                delete next[processingKey];
                return next;
              });
            };

            const isDataUrl =
              typeof imageData === "string" &&
              imageData.startsWith("data:") &&
              imageData.includes("base64,");
            const isHttpUrl =
              typeof imageData === "string" &&
              /^https?:\/\//i.test(imageData.trim());

            const handleFile = (file: File) => {
              try {
                processStoredImage(
                  file,
                  row.partNumber,
                  formData.testName,
                  row.childTestId || currentChildTest?.id,
                  index,
                  isSecondRound,
                );
              } catch (error) {
                console.error(
                  "Failed to process stored image; skipping entry",
                  {
                    partNumber: row.partNumber,
                    index,
                    error,
                  },
                );
                releaseProcessing();
              }
            };

            if (isDataUrl) {
              try {
                // Convert base64 to File object
                const [metadata, base64Payload] = imageData.split(",");
                if (!base64Payload) {
                  throw new Error("Missing base64 payload");
                }

                const byteString = atob(base64Payload);
                const mimeString = metadata.split(":")[1].split(";")[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                const file = new File(
                  [blob],
                  `pre-uploaded-${row.partNumber}-${index}.jpg`,
                  { type: mimeString },
                );

                handleFile(file);
              } catch (error) {
                console.error(
                  "Failed to process stored image; skipping entry",
                  {
                    partNumber: row.partNumber,
                    index,
                    error,
                  },
                );
                releaseProcessing();
              }
              return;
            }

            if (isHttpUrl) {
              (async () => {
                try {
                  const response = await fetch(imageData.trim());
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                  }

                  const blob = await response.blob();
                  const mimeType = blob.type || "image/jpeg";
                  const extension = mimeType.split("/")[1] || "jpg";
                  const fileName = `pre-uploaded-${row.partNumber}-${index}.${extension}`;
                  const file = new File([blob], fileName, { type: mimeType });

                  handleFile(file);
                } catch (error) {
                  console.error("Failed to fetch stored image for processing", {
                    partNumber: row.partNumber,
                    index,
                    error,
                  });
                  releaseProcessing();
                }
              })();
              return;
            }

            console.warn(
              "Skipping stored image processing; unsupported format",
              {
                partNumber: row.partNumber,
                index,
                preview:
                  typeof imageData === "string"
                    ? imageData.slice(0, 30)
                    : typeof imageData,
              },
            );
            releaseProcessing();
          }
        });
      });
    });
  };

  // Determine if we should split images based on project type
  const shouldSplitImages = (testName?: string) => {
    // If project is Flash, split non-cosmetic images
    // If project is Hulk, don't split
    return projectType === "Flash";
  };

  // Load OpenCV
  useEffect(() => {
    if (window.cv && window.cv.Mat) {
      setCvLoaded(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="opencv.js"]',
    );
    if (existingScript) {
      existingScript.onload = () => {
        if (window.cv && window.cv.onRuntimeInitialized) {
          window.cv.onRuntimeInitialized = () => {
            setCvLoaded(true);
          };
        }
      };
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      if (window.cv) {
        window.cv.onRuntimeInitialized = () => {
          setCvLoaded(true);
        };
      }
    };
    document.body.appendChild(script);
  }, []);

  // Parse combined test names into child tests with sequential dependency
  const parseChildTests = (
    testName: string,
    machineEquipment: string,
    machineEquipment2: string,
  ): ChildTest[] => {
    const tests: ChildTest[] = [];

    if (testName.includes("+")) {
      // Split by '+' and trim
      const testNames = testName
        .split("+")
        .map((name) => name.trim())
        .filter((name) => name);
      const machines = [machineEquipment, machineEquipment2].filter((m) => m);

      testNames.forEach((name, index) => {
        const previousTestId =
          index > 0 ? `child-${Date.now()}-${index - 1}` : undefined;

        tests.push({
          id: `child-${Date.now()}-${index}`,
          name: name,
          machineEquipment: machines[index] || machines[0] || name,
          timing: "24", // Default timing
          isCompleted: false,
          status: index === 0 ? "active" : "pending",
          requiresImages: true, // All child tests require images by default
          dependsOnPrevious: index > 0, // All tests after first depend on previous
          previousTestId: previousTestId,
        });
      });
    } else {
      // Single test
      tests.push({
        id: `child-${Date.now()}-0`,
        name: testName,
        machineEquipment: machineEquipment,
        timing: "24",
        isCompleted: false,
        status: "active",
        requiresImages: true,
      });
    }

    return tests;
  };

  // Helper function to normalize machine name
  const normalizeMachineName = (machineName: string) => {
    if (!machineName) return "";
    const name = machineName.toLowerCase().trim();

    const mappings = {
      "dlsm random drop": "DLSM RANDOM DROP",
      "1.25m random drop": "1.25M RANDOM DROP",
      "lm random drop": "LM RANDOM DROP",
      "lm control drop": "LM CONTROL DROP",
      "rock tumbler": "ROCK TUMBLER",
      "x-rite spectralight iii": "X-RITE SPECTRALIGHT III",
      "heat soak-01": "HEAT SOAK-01",
      "heat soak-02": "HEAT SOAK-02",
      "thermal cycle chamber": "THERMAL CYCLE CHAMBER",
      "uv chamber": "UV CHAMBER",
      "salt spray": "SALT SPRAY",
      "taber linear abraser": "TABER LINEAR ABRASER",
      "electromechanical utm instron": "ELECTROMECHANICAL UTM INSTRON",
      "foot survivability test": "FOOT SURVIVABILITY TEST",
      "oslr camera": "OSLR Camera",
      "tap immersion": "TAP Immersion",
      "pool immersion": "POOL Immersion",
      "ocean immersion": "OCEAN Immersion",
      "asi immersion": "ASI Immersion",
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (name.includes(key) || key.includes(name)) {
        return value;
      }
    }

    return name;
  };

  const handlePartScan = async () => {
    if (!scanState.partInput.trim()) {
      alert("Please enter a part number");
      return;
    }

    setScanState((prev) => ({ ...prev, isScanning: true }));
    const partNumber = scanState.partInput.trim().toUpperCase();

    try {
      // For checkpoint scanning, validate eligibility
      if (scanState.isScanningForCheckpoint) {
        // Check if part is in eligible parts list
        if (
          scanState.eligibleParts &&
          !scanState.eligibleParts.includes(partNumber)
        ) {
          alert(
            `Part ${partNumber} is not eligible for checkpoint progression.\n\n` +
              `Eligible parts:\n${scanState.eligibleParts.join("\n")}\n\n` +
              `Parts may be ineligible if:\n` +
              `- Previous checkpoint has "Fail" status\n` +
              `- All checkpoints are already completed\n` +
              `- Part is not assigned to this test`,
          );
          setScanState((prev) => ({
            ...prev,
            isScanning: false,
            partInput: "",
          }));
          return;
        }

        // Check if all checkpoints are already completed for this part
        const chamberLoads = JSON.parse(
          localStorage.getItem("chamberLoads") || "[]",
        );

        for (const load of chamberLoads) {
          const part = load.parts?.find(
            (p: any) => p.partNumber === partNumber,
          );

          if (part && part.checkpointInfo) {
            const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;

            if (currentCheckpointIndex >= checkpoints.length) {
              alert(
                `All checkpoints completed for part ${partNumber}!\n\n` +
                  `Completed: ${checkpoints.length}/${checkpoints.length} checkpoints\n\n` +
                  `Checkpoints finished:\n${checkpoints
                    .map((cp, idx) => `  ${idx + 1}. ${cp} ✓`)
                    .join("\n")}\n\n` +
                  `This part has finished all required checkpoint scans.`,
              );
              setScanState((prev) => ({
                ...prev,
                isScanning: false,
                partInput: "",
              }));
              return;
            }
          }
        }

        // Check if part is already scanned in this checkpoint session
        const alreadyScannedInSession = scanState.scannedParts.some(
          (part) => part.partNumber === partNumber,
        );

        if (alreadyScannedInSession) {
          alert(
            `Part ${partNumber} is already scanned in this checkpoint session!`,
          );
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }

        // Verify part is in current test
        const currentTestRecord =
          currentRecord?.testRecords?.[currentTestIndex];
        const isPartInCurrentTest = currentTestRecord?.assignedParts.some(
          (part) => part.partNumber === partNumber,
        );

        if (!isPartInCurrentTest) {
          alert(`Part ${partNumber} is not assigned to this test.`);
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }

        // Get part details from OQC records
        const oqcRecords = JSON.parse(
          localStorage.getItem("oqc_ticket_records") || "[]",
        );
        let partDetails: ScannedPart | null = null;

        for (const record of oqcRecords) {
          for (const session of record.sessions || []) {
            const matchingPart = session.parts?.find(
              (part) => part.partNumber?.toUpperCase() === partNumber,
            );

            if (matchingPart) {
              partDetails = {
                id: Date.now(),
                partNumber: matchingPart.partNumber,
                serialNumber: matchingPart.serialNumber,
                ticketCode: record.ticketCode,
                project: record.project,
                build: record.build,
                colour: record.colour,
                anoType: record.anoType,
                oqcRecordId: record.id,
                sessionId: session.id,
                sessionNumber: session.sessionNumber,
                scannedAt: new Date().toLocaleString(),
                availableTests: [],
                selectedTestId: "",
                scanStatus: "CHECKPOINT_SCAN",
                cosmeticImage: "",
                nonCosmeticImage: "",
                cosmeticImages: [],
                nonCosmeticImages: [],
              };
              break;
            }
          }
          if (partDetails) break;
        }

        if (!partDetails) {
          alert(`Part ${partNumber} not found in OQC records!`);
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }

        // Add to scanned parts
        setScanState((prev) => ({
          ...prev,
          scannedParts: [...prev.scannedParts, partDetails],
          partInput: "",
          isScanning: false,
        }));

        return;
      }

      // Original scanning logic for second round...
      if (isSecondRound) {
        const currentTestRecord =
          currentRecord?.testRecords?.[currentTestIndex];
        const isPartInCurrentTest = currentTestRecord?.assignedParts.some(
          (part) => part.partNumber === partNumber,
        );

        if (!isPartInCurrentTest) {
          alert(`Part ${partNumber} is not assigned to this test.`);
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }
      }

      const oqcRecords = JSON.parse(
        localStorage.getItem("oqc_ticket_records") || "[]",
      );
      let partDetails: ScannedPart | null = null;
      let foundTicketCode = null;

      for (const record of oqcRecords) {
        for (const session of record.sessions || []) {
          const matchingPart = session.parts?.find(
            (part) => part.partNumber?.toUpperCase() === partNumber,
          );

          if (matchingPart) {
            partDetails = {
              id: Date.now(),
              partNumber: matchingPart.partNumber,
              serialNumber: matchingPart.serialNumber,
              ticketCode: record.ticketCode,
              project: record.project,
              build: record.build,
              colour: record.colour,
              anoType: record.anoType,
              oqcRecordId: record.id,
              sessionId: session.id,
              sessionNumber: session.sessionNumber,
              scannedAt: new Date().toLocaleString(),
              availableTests: [],
              selectedTestId: "",
              scanStatus: "OK",
              cosmeticImage: "",
              nonCosmeticImage: "",
              cosmeticImages: [],
              nonCosmeticImages: [],
            };
            foundTicketCode = record.ticketCode;
            break;
          }
        }
        if (partDetails) break;
      }

      if (!partDetails) {
        alert(`Part ${partNumber} not found in OQC records!`);
        setScanState((prev) => ({ ...prev, isScanning: false }));
        return;
      }

      const alreadyScanned = scanState.scannedParts.some(
        (part) => part.partNumber === partNumber,
      );
      if (alreadyScanned) {
        alert(`Part ${partNumber} is already scanned in this session!`);
        setScanState((prev) => ({ ...prev, isScanning: false }));
        return;
      }

      if (!isSecondRound) {
        const existingLoads = JSON.parse(
          localStorage.getItem("chamberLoads") || "[]",
        );
        const alreadyLoaded = existingLoads.some((load) =>
          load.parts.some((part) => part.partNumber === partNumber),
        );

        if (alreadyLoaded) {
          alert(`Part ${partNumber} is already loaded in another chamber!`);
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }

        const allocations = JSON.parse(
          localStorage.getItem("ticket_allocations_array") || "[]",
        );
        const ticketAllocations = allocations.filter(
          (allocation) => allocation.ticketCode === foundTicketCode,
        );

        if (ticketAllocations.length === 0) {
          alert(`No allocations found for ticket ${foundTicketCode}`);
          setScanState((prev) => ({ ...prev, isScanning: false }));
          return;
        }
        if (currentRecord?.machineLoadData) {
          const matchingTests = [];
          const normalizedChamber = normalizeMachineName(
            currentRecord.machineLoadData.chamber,
          );

          ticketAllocations.forEach((allocation) => {
            allocation.testAllocations?.forEach((test) => {
              const normalizedMachine = normalizeMachineName(
                test.machineEquipment || "",
              );
              const isMatch =
                normalizedMachine === normalizedChamber ||
                normalizedMachine.includes(normalizedChamber) ||
                normalizedChamber.includes(normalizedMachine);

              if (isMatch) {
                const allocatedParts = test.allocatedParts || 0;
                const requiredQty = test.requiredQty || 0;
                const remainingToAllocate = allocatedParts;

                if (remainingToAllocate > 0) {
                  const alreadyAllocated = requiredQty - allocatedParts;

                  matchingTests.push({
                    ...test,
                    ticketCode: allocation.ticketCode,
                    allocationId: allocation.id,
                    project: allocation.project,
                    build: allocation.build,
                    colour: allocation.colour,
                    allocatedParts: allocatedParts,
                    requiredQty: requiredQty,
                    remainingQty: remainingToAllocate,
                    alreadyAllocated: alreadyAllocated,
                    statusText: getTestStatusText(test.status),
                  });
                }
              }
            });
          });

          if (matchingTests.length === 0) {
            alert(
              `No available tests found for ${currentRecord.machineLoadData.chamber} in ticket ${foundTicketCode} or all tests are fully allocated!`,
            );
            setScanState((prev) => ({ ...prev, isScanning: false }));
            return;
          }

          partDetails.availableTests = matchingTests;
          if (!scanState.selectedTest && matchingTests.length > 0) {
            setScanState((prev) => ({
              ...prev,
              selectedTest: matchingTests[0].id,
            }));
          }
        } else {
          partDetails.scanStatus = "NO_MACHINE_DATA";
        }
      } else {
        partDetails.scanStatus = "SECOND_ROUND_OK";
      }

      setScanState((prev) => ({
        ...prev,
        scannedParts: [...prev.scannedParts, partDetails],
        partInput: "",
      }));

      const existingImages = loadImagesFromStorage(partNumber);
      if (
        existingImages.cosmeticImages.length > 0 ||
        existingImages.nonCosmeticImages.length > 0
      ) {
        const updatedScannedParts = [
          ...scanState.scannedParts,
          partDetails,
        ].map((part) => {
          if (part.partNumber === partNumber) {
            return {
              ...part,
              cosmeticImages: existingImages.cosmeticImages,
              nonCosmeticImages: existingImages.nonCosmeticImages,
              hasImages: true,
            };
          }
          return part;
        });
        setScanState((prev) => ({
          ...prev,
          scannedParts: updatedScannedParts,
        }));
      }
    } catch (error) {
      console.error("Error scanning part:", error);
      alert("Error scanning part. Please try again.");
    } finally {
      setScanState((prev) => ({ ...prev, isScanning: false }));
    }
  };

  const getTestStatusText = (statusCode: number) => {
    switch (statusCode) {
      case 1:
        return "Pending";
      case 2:
        return "In Progress";
      case 3:
        return "Completed";
      case 4:
        return "Failed";
      default:
        return "Unknown";
    }
  };

  // Remove scanned part
  const handleRemoveScannedPart = (partId: number) => {
    setScanState((prev) => ({
      ...prev,
      scannedParts: prev.scannedParts.filter((part) => part.id !== partId),
    }));
  };

  const handleConfirmScannedParts = () => {
    if (scanState.scannedParts.length === 0) {
      alert("No parts scanned!");
      return;
    }

    if (scanState.isScanningForCheckpoint) {
      const formKey = `test_${currentTestIndex}`;
      const formData = forms[formKey];
      const currentChildTest =
        formData?.childTests?.[formData.currentChildTestIndex || 0];

      if (!formData) {
        alert("Form data not found!");
        return;
      }

      const processAllParts = async () => {
        const newRows: FormRow[] = [];

        // Get chamberLoads once at the beginning
        let chamberLoads = JSON.parse(
          localStorage.getItem("chamberLoads") || "[]",
        );

        for (const scannedPart of scanState.scannedParts) {
          // Get checkpoint info
          let currentCheckpoint = "";
          let checkpointIndex = 0;
          let loadIndex = -1;
          let partIndex = -1;

          // Find the load and part indices
          for (let i = 0; i < chamberLoads.length; i++) {
            const load = chamberLoads[i];
            if (load.parts && Array.isArray(load.parts)) {
              const pIndex = load.parts.findIndex(
                (p: any) => p.partNumber === scannedPart.partNumber,
              );
              if (pIndex >= 0) {
                loadIndex = i;
                partIndex = pIndex;
                const part = load.parts[pIndex];
                if (part.checkpointInfo) {
                  const { checkpoints, currentCheckpointIndex } =
                    part.checkpointInfo;
                  currentCheckpoint = checkpoints[currentCheckpointIndex] || "";
                  checkpointIndex = currentCheckpointIndex;
                }
                break;
              }
            }
          }

          // Determine if this is T0 or later checkpoint
          const isT0 =
            currentCheckpoint.toLowerCase().includes("t0") ||
            checkpointIndex === 0;

          // Create checkpoint row WITHOUT images (will be uploaded in table)
          const newRow: FormRow = {
            id: Date.now() + Math.random(),
            srNo: checkpointIndex + 1,
            testDate: new Date().toISOString().split("T")[0],
            config: "",
            sampleId: `${scannedPart.partNumber}`,
            status: "Pending",
            partNumber: scannedPart.partNumber,
            serialNumber: scannedPart.serialNumber,
            childTestId: currentChildTest?.id,
            childTestName: currentChildTest?.name,
            checkpointLabel: currentCheckpoint,
            checkpointStatus: isT0 ? "Pass" : "", // T0 auto-pass, others empty
            checkpointHours: checkpointIndex,
            cosmeticImages: [], // Empty - to be uploaded in table
            cosmeticImage: "",
            nonCosmeticImages: [], // Empty - to be uploaded in table
            nonCosmeticImage: "",
            croppedImages: [],
            croppedImage: "",
            regionLabel: "",
            isCheckpointRow: true,
            isT0: isT0,
          };

          if (formData.customColumns) {
            formData.customColumns.forEach((col) => {
              newRow[col.id] = "";
            });
          }

          newRows.push(newRow);
        }

        // Save updated chamberLoads to localStorage
        localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));

        // Update form - add new checkpoint rows
        setForms((prev) => {
          const currentRows = prev[formKey].rows;
          return {
            ...prev,
            [formKey]: {
              ...prev[formKey],
              rows: [...currentRows, ...newRows],
            },
          };
        });

        setScanState((prev) => ({
          ...prev,
          showScanModal: false,
          scannedParts: [],
          partInput: "",
          isScanningForCheckpoint: false,
          checkpointImages: {},
          eligibleParts: [],
        }));

        alert(
          `${scanState.scannedParts.length} part(s) scanned successfully! New checkpoint rows added. Upload images in the table.`,
        );
      };

      processAllParts();
      return;
    }
    // Rest of the original second round logic remains the same...
    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];
    const currentChildTest =
      formData?.childTests?.[formData.currentChildTestIndex || 0];

    if (!formData) {
      alert("Form data not found!");
      return;
    }

    const updatedRows = formData.rows.map((row) => {
      const scannedPart = scanState.scannedParts.find(
        (part) => part.partNumber === row.partNumber,
      );
      if (scannedPart) {
        return {
          ...row,
          scanStatus: "VERIFIED",
          scannedAt: new Date().toLocaleString(),
          status:
            row.status === "Pending" ? "Ready for Final Images" : row.status,
        };
      }
      return row;
    });

    setForms((prev) => ({
      ...prev,
      [formKey]: {
        ...prev[formKey],
        rows: updatedRows,
      },
    }));

    const newVerifiedParts = new Set(verifiedPartsForFinalUpload);
    scanState.scannedParts.forEach((part) => {
      newVerifiedParts.add(part.partNumber);
    });
    setVerifiedPartsForFinalUpload(newVerifiedParts);

    setScanState((prev) => ({
      ...prev,
      showScanModal: false,
      scannedParts: [],
      partInput: "",
      isScanningForCheckpoint: false,
      checkpointHour: 0,
      checkpointImages: {},
    }));

    alert(
      `${scanState.scannedParts.length} part(s) verified for Unload testing! You can now upload final images for these parts.`,
    );
  };

  // Open scan modal for Unload
  const handleOpenScanModal = () => {
    setScanState((prev) => ({
      ...prev,
      showScanModal: true,
      scannedParts: [],
      partInput: "",
    }));
  };

  useEffect(() => {
    loadMasterExcelSheet();
  }, []);

  // Add this function to get test condition for a specific part from chamberLoads
  const getTestConditionForPart = (partNumber: string): string => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) return "";

      const chamberLoads = JSON.parse(chamberLoadsStr);

      // Find the part in chamberLoads
      for (const load of chamberLoads) {
        if (load.parts && Array.isArray(load.parts)) {
          const part = load.parts.find((p: any) => p.partNumber === partNumber);
          if (part && part.testCondition) {
            return part.testCondition;
          }
        }
      }

      return "";
    } catch (error) {
      console.error("Error getting test condition for part:", error);
      return "";
    }
  };

  // Update parseCheckpointsFromCondition function
  const parseCheckpointsFromCondition = (testCondition: string): string[] => {
    if (!testCondition) return [];

    // Extract checkpoint pattern like "CP: T0, 24hr, 48hr, 72hr"
    const cpMatch = testCondition.match(/CP[:\s]+([^,\n]+(?:,\s*[^,\n]+)*)/i);
    if (!cpMatch) return [];

    // Split by comma and clean up
    const checkpoints = cpMatch[1]
      .split(",")
      .map((cp) => cp.trim())
      .filter((cp) => cp && cp.length > 0);

    console.log(
      "Parsed checkpoints from condition:",
      testCondition,
      "→",
      checkpoints,
    );
    return checkpoints;
  };

  // Load data from navigation state
  useEffect(() => {
    if (location.state && location.state.record) {
      const record = location.state.record as MachineLoadData;
      console.log("Received machine load data from navigation:", record);

      // Detect project type from machine load data
      const detectedProjectType = record.machineDetails.project.includes("Hulk")
        ? "Hulk"
        : "Flash";
      console.log("Detected project type:", detectedProjectType);
      setProjectType(detectedProjectType);

      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (chamberLoadsStr) {
        const updatedChamberLoads = JSON.parse(chamberLoadsStr);

        updatedChamberLoads.forEach((load: any) => {
          if (load.id === record.loadId && load.parts) {
            load.parts = load.parts.map((part: any) => {
              // Get checkpoints from various sources - PRIORITY ORDER
              let rawCheckpoints: number[] = [];

              // Priority 1: checkpointInfo.checkpoints (if already formatted)
              if (
                part.checkpointInfo?.checkpoints &&
                Array.isArray(part.checkpointInfo.checkpoints)
              ) {
                // Check if already formatted (strings like "T0", "100cycles")
                if (typeof part.checkpointInfo.checkpoints[0] === "string") {
                  console.log(
                    `Part ${part.partNumber} already has formatted checkpoints:`,
                    part.checkpointInfo.checkpoints,
                  );
                  return part; // Already formatted, return as is
                }
                rawCheckpoints = part.checkpointInfo.checkpoints;
              }
              // Priority 2: allCheckpoints
              else if (
                part.allCheckpoints &&
                Array.isArray(part.allCheckpoints)
              ) {
                rawCheckpoints = part.allCheckpoints;
              }
              // Priority 3: machineDetails.selectedTest.checkpoints
              else if (
                load.machineDetails?.selectedTest?.checkpoints &&
                Array.isArray(load.machineDetails.selectedTest.checkpoints)
              ) {
                rawCheckpoints = load.machineDetails.selectedTest.checkpoints;
              }

              console.log(
                `Raw checkpoints for ${part.partNumber}:`,
                rawCheckpoints,
              );

              if (rawCheckpoints.length > 0) {
                const testUnit = part.testUnit || load.testUnit;
                const normalizedUnit = testUnit?.toLowerCase().trim();

                console.log(
                  `Test unit for ${part.partNumber}:`,
                  normalizedUnit,
                );

                // Format checkpoints based on unit
                const formattedCheckpoints = rawCheckpoints.map((cp: any) => {
                  const value = typeof cp === "number" ? cp : parseFloat(cp);

                  // Handle T0 / pre-test checkpoint
                  if (
                    value === 0 ||
                    cp === "0" ||
                    cp === "T0" ||
                    String(cp).toLowerCase() === "t0"
                  ) {
                    return "T0";
                  }

                  // Format based on test unit
                  switch (normalizedUnit) {
                    case "hours":
                    case "hour":
                      return `${value} hrs`;
                    case "cycles":
                    case "cycle":
                      return `${value} cycles`;
                    case "drops":
                      return `${value} drops`;
                    case "grams":
                      return `${value} g`;
                    case "orientation":
                      return `${value} deg`;
                    default:
                      return `${value}`;
                  }
                });

                console.log(
                  `Formatted checkpoints for ${part.partNumber}:`,
                  formattedCheckpoints,
                );

                // Initialize or update checkpointInfo
                const currentCheckpointIndex =
                  part.checkpointInfo?.currentCheckpointIndex ?? 0;
                const checkpointHistory =
                  part.checkpointInfo?.checkpointHistory ?? [];

                return {
                  ...part,
                  checkpointInfo: {
                    checkpoints: formattedCheckpoints,
                    currentCheckpointIndex: currentCheckpointIndex,
                    nextCheckpointTime:
                      part.checkpointInfo?.nextCheckpointTime ?? null,
                    lastCheckpointTime:
                      part.checkpointInfo?.lastCheckpointTime ??
                      new Date().toISOString(),
                    checkpointHistory: checkpointHistory,
                  },
                  testUnit: normalizedUnit,
                  allCheckpoints: formattedCheckpoints, // Keep for compatibility
                  totalCheckpoints: formattedCheckpoints.length,
                  checkpointIndex: currentCheckpointIndex, // Keep for compatibility
                };
              }

              return part;
            });
          }
        });

        localStorage.setItem(
          "chamberLoads",
          JSON.stringify(updatedChamberLoads),
        );
        console.log(
          "Initialized checkpoint info for parts:",
          updatedChamberLoads,
        );
      }

      console.log("Machine details:", record.machineDetails);

      // Create a Stage2Record from the MachineLoadData
      const stage2Record: Stage2Record = {
        id: record.loadId,
        submissionId: `sub-${record.loadId}`,
        ticketId: parseInt(record.loadId.toString().slice(-6)),
        ticketCode: record.machineDetails.ticketCode,
        totalQuantity: record.totalParts,
        anoType: "Not Specified",
        source: "Machine Load",
        reason: "Testing",
        project: record.machineDetails.project,
        build: record.machineDetails.build,
        colour: record.machineDetails.colour,
        processStage: "Stage 2 Testing",
        selectedTestNames: record.machineDetails.selectedTest
          ? [record.machineDetails.selectedTest.testName]
          : [],
        testRecords: [], // We'll populate this below
        formData: {},
        submittedAt: record.loadedAt,
        version: "1.0",
        testingStatus: "In Testing",
        machineLoadData: record,
      };

      // Convert LoadedPart[] to AssignedPart[] for each test
      // Handle both cases: tests array or selectedTest object
      const testsArray = record.machineDetails?.selectedTest
        ? [record.machineDetails.selectedTest]
        : [];

      testsArray.forEach((machineTest: any, testIndex: number) => {
        // Get parts assigned to this test
        const normalizedMachineId =
          machineTest.id !== undefined && machineTest.id !== null
            ? String(machineTest.id).trim()
            : "";
        const normalizedMachineName = (machineTest.testName || "")
          .toString()
          .trim()
          .toLowerCase();

        const testParts = record.parts.filter((part: any) => {
          if (!part) {
            return false;
          }

          const partTestId =
            part.testId !== undefined && part.testId !== null
              ? String(part.testId).trim()
              : "";
          const partTestName = (part.testName || "")
            .toString()
            .trim()
            .toLowerCase();
          const partAssigned = (part.assignedToTest || "")
            .toString()
            .trim()
            .toLowerCase();

          const matchesById =
            normalizedMachineId !== "" && partTestId === normalizedMachineId;
          const matchesByName =
            normalizedMachineName !== "" &&
            (partTestName === normalizedMachineName ||
              partTestName.includes(normalizedMachineName) ||
              normalizedMachineName.includes(partTestName));
          const matchesByAssigned =
            normalizedMachineName !== "" &&
            partAssigned === normalizedMachineName;

          return matchesById || matchesByName || matchesByAssigned;
        });

        let assignedParts: AssignedPart[] = testParts.map(
          (part: any, idx: number) => ({
            id: `${machineTest.id ?? "test"}-${idx}`,
            partNumber: part.partNumber || `PART-${idx + 1}`,
            serialNumber: part.serialNumber || "N/A",
            location: part.location || record.chamber,
            scanStatus: part.scanStatus || (part.hasImages ? "OK" : "Pending"),
            assignedToTest: part.testName || machineTest.testName,
          }),
        );

        if (assignedParts.length === 0 && Array.isArray(record.parts)) {
          assignedParts = record.parts.map((part: any, idx: number) => ({
            id: `${machineTest.id ?? "test"}-fallback-${idx}`,
            partNumber: part.partNumber || `PART-${idx + 1}`,
            serialNumber: part.serialNumber || "N/A",
            location: part.location || record.chamber,
            scanStatus: part.scanStatus || (part.hasImages ? "OK" : "Pending"),
            assignedToTest: part.testName || machineTest.testName,
          }));
        }

        // Create TestRecord for this test
        const testRecord: TestRecord = {
          testId: machineTest.id,
          testName: machineTest.testName,
          processStage: "Stage 2 Testing",
          testIndex: testIndex + 1,
          testCondition: machineTest.testCondition || "Standard Conditions",
          requiredQuantity: machineTest.requiredQty?.toString() || "0",
          specification: "Default Specification",
          machineEquipment: record.chamber,
          machineEquipment2: machineTest.machineEquipment2 || "",
          timing: machineTest.duration || machineTest.timeString || "",
          startDateTime: record.loadedAt,
          endDateTime: record.estimatedCompletion,
          assignedParts: assignedParts,
          assignedPartsCount: assignedParts.length,
          remark: "",
          status: machineTest.status === 3 ? "Completed" : "In Progress",
          submittedAt: record.loadedAt,
          testResults: [],
          childTests: parseChildTests(machineTest.testName, record.chamber, ""),
        };

        stage2Record.testRecords.push(testRecord);
      });

      setCurrentRecord(stage2Record);

      // Initialize forms from the created record
      const initialForms: FormsState = {};
      const initialSharedImages: SharedImagesByPart = {};

      stage2Record.testRecords.forEach((testRecord, index) => {
        const formKey = `test_${index}`;

        // Get test condition from Excel data or from testRecord
        const testCondition =
          testConditionsMap.get(testRecord.testName) ||
          testRecord.testCondition;
        console.log(
          "Mapped test condition for",
          testRecord.testName,
          ":",
          testCondition,
        );

        // Parse child tests for combined tests
        const childTests = parseChildTests(
          testRecord.testName,
          testRecord.machineEquipment,
          testRecord.machineEquipment2,
        );

        // Initialize timer for each child test from localStorage or default
        childTests.forEach((childTest, childIndex) => {
          const childTimerKey = `${formKey}_${childTest.id}`;

          // Try to load timer state from chamberLoads first
          const savedTimerFromChamber = loadTimerStateFromChamberLoads(
            record.loadId,
            childTest.id,
          );

          if (savedTimerFromChamber) {
            // Use timer state from chamberLoads
            setTimerStates((prev) => ({
              ...prev,
              [childTimerKey]: savedTimerFromChamber,
            }));
          } else {
            // Check localStorage testTimerStates as fallback
            const savedTimerState = timerStates[childTimerKey];
            const timingHours = parseInt(childTest.timing || "24");

            if (!savedTimerState) {
              setTimerStates((prev) => ({
                ...prev,
                [childTimerKey]: {
                  remainingSeconds: timingHours * 3600,
                  isRunning: false,
                },
              }));
            }
          }
        });

        // Initialize rows for each assigned part - CREATE T0 ROWS
        const initialRows: FormRow[] = [];
        if (childTests.length > 0) {
          testRecord.assignedParts.forEach((part, idx) => {
            // Load existing images from storage
            const existingImages = loadImagesFromStorage(part.partNumber);

            // Get checkpoint info for this part
            const updatedChamberLoads = JSON.parse(
              localStorage.getItem("chamberLoads") || "[]",
            );
            let currentCheckpoint = "T0";
            let isT0 = true;

            for (const load of updatedChamberLoads) {
              const loadPart = load.parts?.find(
                (p: any) => p.partNumber === part.partNumber,
              );
              if (loadPart && loadPart.checkpointInfo) {
                const { checkpoints, currentCheckpointIndex } =
                  loadPart.checkpointInfo;
                if (checkpoints && checkpoints.length > 0) {
                  currentCheckpoint = checkpoints[0] || "T0";
                  isT0 =
                    currentCheckpoint.toLowerCase() === "t0" ||
                    currentCheckpoint === "0";
                }
                break;
              }
            }

            initialRows.push({
              id: Date.now() + idx,
              srNo: idx + 1,
              testDate: new Date().toISOString().split("T")[0],
              config: "",
              sampleId: `${part.partNumber}`,
              status: "Pending",
              partNumber: part.partNumber,
              serialNumber: part.serialNumber,
              childTestId: childTests[0].id,
              childTestName: childTests[0].name,
              checkpointLabel: currentCheckpoint,
              checkpointHours: 0,
              checkpointStatus: isT0 ? "Pass" : "Pending", // T0 auto-pass
              cosmeticImage: existingImages.cosmeticImages[0] || "",
              nonCosmeticImage: existingImages.nonCosmeticImages[0] || "",
              cosmeticImages: existingImages.cosmeticImages,
              nonCosmeticImages: existingImages.nonCosmeticImages,
              croppedImage: "",
              croppedImages: [],
              regionLabel: "",
              isCheckpointRow: true,
              isT0: isT0,
              // For Unload, initialize final images
              finalCosmeticImage: isSecondRound
                ? existingImages.finalCosmeticImages?.[0] || ""
                : "",
              finalCosmeticImages: isSecondRound
                ? existingImages.finalCosmeticImages || []
                : [],
              finalNonCosmeticImage: isSecondRound
                ? existingImages.finalNonCosmeticImages?.[0] || ""
                : "",
              finalCroppedNonCosmeticImage: "",
            });
          });
        }

        initialForms[formKey] = {
          testName: testRecord.testName,
          processStage: testRecord.processStage,
          testCondition: testCondition,
          date: new Date().toISOString().split("T")[0],
          specification: testRecord.specification,
          machineEquipment: testRecord.machineEquipment,
          machineEquipment2: testRecord.machineEquipment2,
          timing: testRecord.timing,
          sampleQty: testRecord.requiredQuantity,
          rows: initialRows,
          customColumns: [],
          childTests: childTests,
          currentChildTestIndex: 0,
        };

        // Initialize shared images for each part
        testRecord.assignedParts.forEach((part) => {
          if (!initialSharedImages[part.partNumber]) {
            initialSharedImages[part.partNumber] = {
              cosmetic: [],
              nonCosmetic: [],
              childTestImages: {},
            };

            // For Unload, initialize final images arrays
            if (isSecondRound) {
              initialSharedImages[part.partNumber].finalCosmeticImages = [];
              initialSharedImages[part.partNumber].finalNonCosmeticImages = [];
            }
          }

          // Initialize child test images
          childTests.forEach((childTest) => {
            if (
              !initialSharedImages[part.partNumber].childTestImages[
                childTest.id
              ]
            ) {
              initialSharedImages[part.partNumber].childTestImages[
                childTest.id
              ] = {
                cosmetic: [],
                nonCosmetic: [],
              };
            }
          });
        });
      });

      setForms(initialForms);
      setSharedImagesByPart(initialSharedImages);

      setTimeout(() => {
        syncCheckpointData();
      }, 0);

      console.log("Converted to Stage2Record:", stage2Record);
      console.log("Detected project type:", detectedProjectType);

      // Process images from storage after forms are set
      setTimeout(() => {
        if (cvLoaded) {
          processImagesFromStorage();
        }
      }, 1000);
    } else {
      console.error("No record found in navigation state");
      alert("No record selected. Please select a record first.");
      navigate(-1);
    }
  }, [
    location.state,
    navigate,
    testConditionsMap,
    cvLoaded,
    syncCheckpointData,
  ]);

  // Process images from storage when OpenCV loads
  useEffect(() => {
    if (cvLoaded && Object.keys(forms).length > 0) {
      processImagesFromStorage();
    }
  }, [cvLoaded, forms]);


  useEffect(() => {
    const interval = setInterval(() => {
      setTimerStates((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach((timerKey) => {
          if (
            updated[timerKey].isRunning &&
            updated[timerKey].remainingSeconds > 0
          ) {
            updated[timerKey] = {
              ...updated[timerKey],
              remainingSeconds: updated[timerKey].remainingSeconds - 1,
              lastUpdated: new Date().toISOString(),
            };
            hasChanges = true;

            // Sync timer with backend every minute
            if (
              updated[timerKey].remainingSeconds % 60 === 0 &&
              currentRecord?.machineLoadData
            ) {
              const timerData: Partial<TestingPartData> = {
                timerStatus: "running",
                timerStartTime: updated[timerKey].startTime,
                lastUpdated: updated[timerKey].lastUpdated,
              };

              updateTestingPartInBackend(
                currentRecord.machineLoadData.loadId,
                timerData,
              ).catch((error) =>
                console.error("Failed to sync timer to backend:", error),
              );
            }
          } else if (
            updated[timerKey].isRunning &&
            updated[timerKey].remainingSeconds === 0
          ) {
            updated[timerKey] = {
              ...updated[timerKey],
              isRunning: false,
              stopTime: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            };
            hasChanges = true;

            // Sync timer completion with backend
            if (currentRecord?.machineLoadData) {
              const timerData: Partial<TestingPartData> = {
                timerStatus: "stopped",
                timerStartTime: updated[timerKey].stopTime,
                lastUpdated: updated[timerKey].lastUpdated,
              };

              updateTestingPartInBackend(
                currentRecord.machineLoadData.loadId,
                timerData,
              ).catch((error) =>
                console.error("Failed to sync timer stop to backend:", error),
              );
            }

            alert(`⏰ Timer completed!`);
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRecord, forms]);

  const loadTimerStateFromChamberLoads = (loadId: number) => {
    try {
      const raw = localStorage.getItem("chamberLoads");
      if (!raw) return null;

      const load = JSON.parse(raw);

      if (load.id !== loadId) return null;

      if (!load.timerStatus) return null;

      return {
        remainingSeconds: load.timerRemainingSeconds ?? 0,
        isRunning: load.timerStatus === "start",
        startTime: load.timerStartTime ?? null,
        stopTime: load.timerStopTime ?? null,
        lastUpdated: load.lastUpdated ?? null,
      };
    } catch (error) {
      console.error("Error loading timer state:", error);
      return null;
    }
  };

  // OpenCV functions
  const detectYellowMarks = (src: any): boolean => {
    try {
      const cv = window.cv;
      const hsv = new cv.Mat();
      cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
      cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

      const lower = new cv.Mat(
        hsv.rows,
        hsv.cols,
        hsv.type(),
        [20, 100, 100, 0],
      );
      const upper = new cv.Mat(
        hsv.rows,
        hsv.cols,
        hsv.type(),
        [40, 255, 255, 255],
      );
      const mask = new cv.Mat();
      cv.inRange(hsv, lower, upper, mask);

      const yellowPixels = cv.countNonZero(mask);
      const totalPixels = mask.rows * mask.cols;
      const yellowRatio = yellowPixels / totalPixels;

      hsv.delete();
      mask.delete();
      lower.delete();
      upper.delete();

      return yellowRatio > 0.01;
    } catch (error) {
      console.error("Error detecting yellow marks:", error);
      return false;
    }
  };

  const processImageWithYellowMarks = (src: any, img: HTMLImageElement) => {
    const cv = window.cv;
    const hsv = new cv.Mat();
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

    const lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [15, 80, 80, 0]);
    const upper = new cv.Mat(
      hsv.rows,
      hsv.cols,
      hsv.type(),
      [45, 255, 255, 255],
    );
    const mask = new cv.Mat();
    cv.inRange(hsv, lower, upper, mask);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      mask,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    let detectedRegions: any[] = [];
    const minArea = 300;
    const maxArea = 50000;

    for (let i = 0; i < contours.size(); ++i) {
      const rect = cv.boundingRect(contours.get(i));
      const area = rect.width * rect.height;
      const aspectRatio = rect.width / rect.height;
      if (
        area >= minArea &&
        area <= maxArea &&
        aspectRatio > 0.5 &&
        aspectRatio < 5
      ) {
        detectedRegions.push(rect);
      }
    }

    detectedRegions.sort((a, b) => {
      const rowTolerance = 30;
      if (Math.abs(a.y - b.y) > rowTolerance) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    hsv.delete();
    mask.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();

    return detectedRegions;
  };

  const processImageWithoutYellowMarks = (src: any, img: HTMLImageElement) => {
    const scaleX = img.width / REFERENCE_IMAGE_WIDTH;
    const scaleY = img.height / REFERENCE_IMAGE_HEIGHT;

    console.log(`Image dimensions: ${img.width}x${img.height}`);
    console.log(
      `Scale factors: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`,
    );

    const scaledRegions = PREDEFINED_REGIONS.map((region) => ({
      x: Math.round(region.x * scaleX),
      y: Math.round(region.y * scaleY),
      width: Math.round(region.width * scaleX),
      height: Math.round(region.height * scaleY),
      label: region.label,
    }));

    console.log("Scaled regions:", scaledRegions);
    return scaledRegions;
  };

  // Add this function after the other helper functions (around line 800)
  const updateChamberLoadsWithNewImages = (
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    imageUrl: string,
    childTestId?: string,
    isFinal: boolean = false,
  ) => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) return;

      const chamberLoads = JSON.parse(chamberLoadsStr);
      let updated = false;

      for (let i = 0; i < chamberLoads.length; i++) {
        const load = chamberLoads[i];
        if (load.parts && Array.isArray(load.parts)) {
          for (let j = 0; j < load.parts.length; j++) {
            const part = load.parts[j];
            if (part.partNumber === partNumber) {
              // Initialize images arrays if they don't exist
              if (!part.cosmeticImages) part.cosmeticImages = [];
              if (!part.nonCosmeticImages) part.nonCosmeticImages = [];

              if (isFinal) {
                // Store final round images
                if (!part.finalCosmeticImages) part.finalCosmeticImages = [];
                if (!part.finalNonCosmeticImages)
                  part.finalNonCosmeticImages = [];

                if (type === "cosmetic") {
                  if (!part.finalCosmeticImages.includes(imageUrl)) {
                    chamberLoads[i].parts[j].finalCosmeticImages.push(imageUrl);
                    updated = true;
                  }
                } else {
                  if (!part.finalNonCosmeticImages.includes(imageUrl)) {
                    chamberLoads[i].parts[j].finalNonCosmeticImages.push(
                      imageUrl,
                    );
                    updated = true;
                  }
                }
              } else {
                // Store first round images
                if (type === "cosmetic") {
                  if (!part.cosmeticImages.includes(imageUrl)) {
                    chamberLoads[i].parts[j].cosmeticImages.push(imageUrl);
                    chamberLoads[i].parts[j].hasImages = true;
                    updated = true;
                  }
                } else {
                  if (!part.nonCosmeticImages.includes(imageUrl)) {
                    chamberLoads[i].parts[j].nonCosmeticImages.push(imageUrl);
                    chamberLoads[i].parts[j].hasImages = true;
                    updated = true;
                  }
                }
              }

              break;
            }
          }
          if (updated) break;
        }
      }

      if (updated) {
        localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));
        console.log(
          `Updated ${isFinal ? "final " : ""}${type} image for ${partNumber} in chamberLoads`,
        );
      }
    } catch (error) {
      console.error("Error updating chamberLoads with new images:", error);
    }
  };

  // Enhanced image processing function
  const processNonCosmeticImage = (
    file: File,
    partNumber: string,
    testName: string,
    childTestId?: string,
    isFinalRound: boolean = false,
  ) => {
    if (!cvLoaded) {
      alert("OpenCV not loaded yet. Please wait...");
      return;
    }

    // Check if we should split images based on project type
    if (!shouldSplitImages(testName) && !isFinalRound) {
      console.log(
        `Project is ${projectType}, skipping image splitting for non-cosmetic images`,
      );
      // Just upload without processing
      handleSimpleImageUpload(
        file,
        partNumber,
        testName,
        "nonCosmetic",
        childTestId,
        isFinalRound,
      );
      return;
    }

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const cv = window.cv;
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setProcessing(false);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const src = cv.imread(canvas);

          const srcForDetection = cv.imread(canvas);
          const hasMarks = detectYellowMarks(srcForDetection);
          srcForDetection.delete();
          setHasYellowMarks(hasMarks);

          console.log(
            `Image for part ${partNumber} has yellow marks: ${hasMarks}`,
          );

          let detectedRegions: any[] = [];

          if (hasMarks) {
            detectedRegions = processImageWithYellowMarks(src, img);
          } else {
            detectedRegions = processImageWithoutYellowMarks(src, img);
          }

          console.log(
            `Detected regions for part ${partNumber}:`,
            detectedRegions,
          );

          const croppedImages: CroppedRegion[] = [];
          detectedRegions.forEach((rect, i) => {
            try {
              const x = Math.max(0, Math.min(rect.x, src.cols - 1));
              const y = Math.max(0, Math.min(rect.y, src.rows - 1));
              const width = Math.min(rect.width, src.cols - x);
              const height = Math.min(rect.height, src.rows - y);

              if (width <= 0 || height <= 0) {
                console.warn(
                  `Invalid dimensions for region ${i}: ${width}x${height}`,
                );
                return;
              }

              const validRect = new cv.Rect(x, y, width, height);
              const roi = src.roi(validRect);

              const cropCanvas = document.createElement("canvas");
              cropCanvas.width = width;
              cropCanvas.height = height;
              cv.imshow(cropCanvas, roi);

              const croppedData = cropCanvas.toDataURL("image/png", 1.0);

              const detectedLabel = hasMarks
                ? detectLabelText(croppedData, i, detectedRegions, true)
                : rect.label;

              const category = getLabelCategory(detectedLabel);

              croppedImages.push({
                id: i,
                data: croppedData,
                label: detectedLabel,
                category: category,
                rect: { x, y, width, height },
                partNumber: partNumber,
                childTestId: childTestId,
                isFinal: isFinalRound,
              });

              console.log(
                `Part ${partNumber} - Region ${i}: ${detectedLabel} → ${category?.form}`,
              );

              roi.delete();
            } catch (err) {
              console.error(`Error cropping region ${i}:`, err);
            }
          });

          // Replace existing cropped regions for this part and child test
          setCroppedRegions((prev) => {
            const filtered = prev.filter(
              (region) =>
                !(
                  region.partNumber === partNumber &&
                  region.childTestId === childTestId &&
                  region.isFinal === isFinalRound
                ),
            );
            return [...filtered, ...croppedImages];
          });

          // Get the image URL for the uploaded file
          const imageUrl = e.target?.result as string;

          updateChamberLoadsWithNewImages(
            partNumber,
            "nonCosmetic",
            imageUrl,
            childTestId,
            isFinalRound,
          );

          // Update shared images
          setSharedImagesByPart((prev) => ({
            ...prev,
            [partNumber]: {
              ...prev[partNumber],
              nonCosmetic: isFinalRound
                ? [...(prev[partNumber]?.nonCosmetic || [])]
                : [...(prev[partNumber]?.nonCosmetic || []), imageUrl],
              childTestImages: {
                ...prev[partNumber]?.childTestImages,
                [childTestId || "default"]: {
                  cosmetic:
                    prev[partNumber]?.childTestImages?.[
                      childTestId || "default"
                    ]?.cosmetic || [],
                  nonCosmetic: isFinalRound
                    ? [
                        ...(prev[partNumber]?.childTestImages?.[
                          childTestId || "default"
                        ]?.nonCosmetic || []),
                      ]
                    : [
                        ...(prev[partNumber]?.childTestImages?.[
                          childTestId || "default"
                        ]?.nonCosmetic || []),
                        imageUrl,
                      ],
                },
              },
              // For final round, store in final arrays
              ...(isFinalRound
                ? {
                    finalNonCosmeticImages: [
                      ...(prev[partNumber]?.finalNonCosmeticImages || []),
                      imageUrl,
                    ],
                  }
                : {}),
            },
          }));

          // Update the form
          const formKey = `test_${currentTestIndex}`;
          const formData = forms[formKey];

          if (formData) {
            const currentChildTest =
              formData.childTests?.[formData.currentChildTestIndex || 0];
            const existingRow = formData.rows.find(
              (row) =>
                row.partNumber === partNumber &&
                row.childTestId === childTestId,
            );

            if (existingRow) {
              // For final round, update final images
              if (isFinalRound) {
                // Add to finalNonCosmeticImages array
                const currentFinalNonCosmeticImages =
                  existingRow.nonCosmeticImages || [];
                const updatedFinalNonCosmeticImages = [
                  ...currentFinalNonCosmeticImages,
                  imageUrl,
                ];

                // Add cropped image to croppedImages array
                const currentCroppedImages = existingRow.croppedImages || [];
                const updatedCroppedImages = [
                  ...currentCroppedImages,
                  croppedImages[0]?.data || "",
                ];

                const updatedRows = formData.rows.map((row) => {
                  if (
                    row.partNumber === partNumber &&
                    row.childTestId === childTestId
                  ) {
                    return {
                      ...row,
                      nonCosmeticImages: updatedFinalNonCosmeticImages,
                      finalNonCosmeticImage: imageUrl, // Set latest as main final image
                      croppedImages: updatedCroppedImages,
                      croppedImage:
                        croppedImages[0]?.data || row.croppedImage || "",
                      finalCroppedNonCosmeticImage:
                        croppedImages[0]?.data ||
                        row.finalCroppedNonCosmeticImage ||
                        "",
                      regionLabel:
                        croppedImages[0]?.label || row.regionLabel || "",
                      testDate: new Date().toISOString().split("T")[0],
                      status:
                        row.status === "Pending" ? "In Progress" : row.status,
                    };
                  }
                  return row;
                });

                setForms((prev) => ({
                  ...prev,
                  [formKey]: {
                    ...prev[formKey],
                    rows: updatedRows,
                  },
                }));
              } else {
                // For first round
                const currentNonCosmeticImages =
                  existingRow.nonCosmeticImages || [];
                const updatedNonCosmeticImages = [
                  ...currentNonCosmeticImages,
                  imageUrl,
                ];

                // Add cropped image to croppedImages array
                const currentCroppedImages = existingRow.croppedImages || [];
                const updatedCroppedImages = [
                  ...currentCroppedImages,
                  croppedImages[0]?.data || "",
                ];

                const updatedRows = formData.rows.map((row) => {
                  if (
                    row.partNumber === partNumber &&
                    row.childTestId === childTestId
                  ) {
                    return {
                      ...row,
                      nonCosmeticImages: updatedNonCosmeticImages,
                      nonCosmeticImage: imageUrl, // Set latest as main
                      croppedImages: updatedCroppedImages,
                      croppedImage:
                        croppedImages[0]?.data || row.croppedImage || "",
                      regionLabel:
                        croppedImages[0]?.label || row.regionLabel || "",
                      testDate: new Date().toISOString().split("T")[0],
                      status:
                        row.status === "Pending" ? "In Progress" : row.status,
                    };
                  }
                  return row;
                });

                setForms((prev) => ({
                  ...prev,
                  [formKey]: {
                    ...prev[formKey],
                    rows: updatedRows,
                  },
                }));
              }
            }
          }
          src.delete();
        } catch (err) {
          console.error("Error processing image:", err);
          alert("Failed to process image. Please try again.");
        } finally {
          setProcessing(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processNonCosmeticImageForCheckpoint = (
    file: File,
    partNumber: string,
    testName: string,
    childTestId?: string,
    checkpointLabel?: string,
    rowId?: number,
    imageIndex: number = 0,
  ) => {
    if (!cvLoaded) {
      console.log("OpenCV not loaded yet");
      return;
    }

    if (!shouldSplitImages(testName)) {
      console.log(`Project is ${projectType}, skipping image splitting`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const cv = window.cv;
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const src = cv.imread(canvas);

          const srcForDetection = cv.imread(canvas);
          const hasMarks = detectYellowMarks(srcForDetection);
          srcForDetection.delete();

          let detectedRegions: any[] = [];

          if (hasMarks) {
            detectedRegions = processImageWithYellowMarks(src, img);
          } else {
            detectedRegions = processImageWithoutYellowMarks(src, img);
          }

          const croppedImages: string[] = [];
          let regionLabel = "";

          detectedRegions.forEach((rect, i) => {
            try {
              const x = Math.max(0, Math.min(rect.x, src.cols - 1));
              const y = Math.max(0, Math.min(rect.y, src.rows - 1));
              const width = Math.min(rect.width, src.cols - x);
              const height = Math.min(rect.height, src.rows - y);

              if (width <= 0 || height <= 0) return;

              const validRect = new cv.Rect(x, y, width, height);
              const roi = src.roi(validRect);

              const cropCanvas = document.createElement("canvas");
              cropCanvas.width = width;
              cropCanvas.height = height;
              cv.imshow(cropCanvas, roi);

              const croppedData = cropCanvas.toDataURL("image/png", 1.0);

              const detectedLabel = hasMarks
                ? detectLabelText(croppedData, i, detectedRegions, true)
                : rect.label;

              croppedImages.push(croppedData);
              if (i === 0) {
                regionLabel = detectedLabel;
              }

              roi.delete();
            } catch (err) {
              console.error(`Error cropping region ${i}:`, err);
            }
          });

          // Update chamberLoads with cropped images
          if (checkpointLabel && croppedImages.length > 0) {
            croppedImages.forEach((croppedImg) => {
              updateCheckpointImagesInChamberLoads(
                partNumber,
                checkpointLabel,
                "cropped",
                croppedImg,
              );
            });
          }

          // Update form rows with cropped images
          const formKey = `test_${currentTestIndex}`;
          setForms((prev) => {
            const formData = prev[formKey];
            if (!formData) return prev;

            const updatedRows = formData.rows.map((row) => {
              if (rowId && row.id === rowId) {
                const currentCroppedImages = row.croppedImages || [];
                const updatedCroppedImages = [
                  ...currentCroppedImages,
                  ...croppedImages,
                ];

                return {
                  ...row,
                  croppedImages: updatedCroppedImages,
                  croppedImage:
                    updatedCroppedImages[0] || row.croppedImage || "",
                  regionLabel: regionLabel || row.regionLabel || "",
                };
              } else if (
                row.partNumber === partNumber &&
                row.checkpointLabel === checkpointLabel &&
                row.childTestId === childTestId
              ) {
                const currentCroppedImages = row.croppedImages || [];
                const updatedCroppedImages = [
                  ...currentCroppedImages,
                  ...croppedImages[imageIndex],
                ];

                return {
                  ...row,
                  croppedImages: updatedCroppedImages,
                  croppedImage:
                    updatedCroppedImages[0] || row.croppedImage || "",
                  regionLabel: regionLabel || row.regionLabel || "",
                };
              }
              return row;
            });

            return {
              ...prev,
              [formKey]: {
                ...prev[formKey],
                rows: updatedRows,
              },
            };
          });

          src.delete();
        } catch (err) {
          console.error("Error processing checkpoint image:", err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };


  // Update the handleSimpleImageUpload function (around line 1700)
  const handleSimpleImageUpload = (
    file: File,
    partNumber: string,
    testName: string,
    type: "cosmetic" | "nonCosmetic",
    childTestId?: string,
    isFinalRound: boolean = false,
  ) => {
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const formKey = `test_${currentTestIndex}`;
      const formData = forms[formKey];
      const currentChildTest =
        formData?.childTests?.[formData.currentChildTestIndex || 0];

      // **ADD THIS: Update chamberLoads with new image**
      updateChamberLoadsWithNewImages(
        partNumber,
        type,
        imageUrl,
        childTestId,
        isFinalRound,
      );

      if (formData) {
        const existingRow = formData.rows.find(
          (row) =>
            row.partNumber === partNumber && row.childTestId === childTestId,
        );

        if (existingRow) {
          if (type === "cosmetic") {
            if (isFinalRound) {
              const currentFinalCosmeticImages =
                existingRow.finalCosmeticImages || [];
              const updatedFinalCosmeticImages = [
                ...currentFinalCosmeticImages,
                imageUrl,
              ];

              const updatedRows = formData.rows.map((row) => {
                if (
                  row.partNumber === partNumber &&
                  row.childTestId === childTestId
                ) {
                  return {
                    ...row,
                    finalCosmeticImages: updatedFinalCosmeticImages,
                    finalCosmeticImage: imageUrl,
                    testDate: new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                }
                return row;
              });

              setForms((prev) => ({
                ...prev,
                [formKey]: {
                  ...prev[formKey],
                  rows: updatedRows,
                },
              }));

              // Update shared images for final round
              setSharedImagesByPart((prev) => ({
                ...prev,
                [partNumber]: {
                  ...prev[partNumber],
                  finalCosmeticImages: [
                    ...(prev[partNumber]?.finalCosmeticImages || []),
                    imageUrl,
                  ],
                },
              }));
            } else {
              const currentCosmeticImages = existingRow.cosmeticImages || [];
              const updatedCosmeticImages = [
                ...currentCosmeticImages,
                imageUrl,
              ];

              const updatedRows = formData.rows.map((row) => {
                if (
                  row.partNumber === partNumber &&
                  row.childTestId === childTestId
                ) {
                  return {
                    ...row,
                    cosmeticImages: updatedCosmeticImages,
                    cosmeticImage: imageUrl,
                    testDate: new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                }
                return row;
              });

              setForms((prev) => ({
                ...prev,
                [formKey]: {
                  ...prev[formKey],
                  rows: updatedRows,
                },
              }));
            }
          } else {
            // For non-cosmetic images in Hulk project (no splitting)
            if (isFinalRound) {
              const currentFinalNonCosmeticImages =
                existingRow.nonCosmeticImages || [];
              const updatedFinalNonCosmeticImages = [
                ...currentFinalNonCosmeticImages,
                imageUrl,
              ];

              const updatedRows = formData.rows.map((row) => {
                if (
                  row.partNumber === partNumber &&
                  row.childTestId === childTestId
                ) {
                  return {
                    ...row,
                    nonCosmeticImages: updatedFinalNonCosmeticImages,
                    finalNonCosmeticImage: imageUrl,
                    testDate: new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                }
                return row;
              });

              setForms((prev) => ({
                ...prev,
                [formKey]: {
                  ...prev[formKey],
                  rows: updatedRows,
                },
              }));

              // Update shared images for final round
              setSharedImagesByPart((prev) => ({
                ...prev,
                [partNumber]: {
                  ...prev[partNumber],
                  finalNonCosmeticImages: [
                    ...(prev[partNumber]?.finalNonCosmeticImages || []),
                    imageUrl,
                  ],
                },
              }));
            } else {
              const currentNonCosmeticImages =
                existingRow.nonCosmeticImages || [];
              const updatedNonCosmeticImages = [
                ...currentNonCosmeticImages,
                imageUrl,
              ];

              const updatedRows = formData.rows.map((row) => {
                if (
                  row.partNumber === partNumber &&
                  row.childTestId === childTestId
                ) {
                  return {
                    ...row,
                    nonCosmeticImages: updatedNonCosmeticImages,
                    nonCosmeticImage: imageUrl,
                    testDate: new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                }
                return row;
              });

              setForms((prev) => ({
                ...prev,
                [formKey]: {
                  ...prev[formKey],
                  rows: updatedRows,
                },
              }));
            }
          }
        }
      }
      setProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // New function to process stored images
  const processStoredImage = (
    file: File,
    partNumber: string,
    testName: string,
    childTestId?: string,
    index: number,
    isFinalRound: boolean = false,
  ) => {
    if (!cvLoaded) {
      console.log("OpenCV not loaded yet");
      return;
    }

    // Check if we should split images based on project type
    if (!shouldSplitImages(testName) && !isFinalRound) {
      console.log(
        `Project is ${projectType}, skipping image splitting for stored images`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const cv = window.cv;
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.error("Could not get canvas context");
            setProcessingImages((prev) => ({
              ...prev,
              [`${partNumber}-${index}`]: false,
            }));
            return;
          }

          ctx.drawImage(img, 0, 0);
          const src = cv.imread(canvas);

          const srcForDetection = cv.imread(canvas);
          const hasMarks = detectYellowMarks(srcForDetection);
          srcForDetection.delete();

          console.log(
            `Processing stored image for part ${partNumber} has yellow marks: ${hasMarks}`,
          );

          let detectedRegions: any[] = [];

          if (hasMarks) {
            detectedRegions = processImageWithYellowMarks(src, img);
          } else {
            detectedRegions = processImageWithoutYellowMarks(src, img);
          }

          console.log(
            `Detected regions for stored image ${partNumber}:`,
            detectedRegions,
          );

          const croppedImages: string[] = [];
          let regionLabel = "";

          detectedRegions.forEach((rect, i) => {
            try {
              const x = Math.max(0, Math.min(rect.x, src.cols - 1));
              const y = Math.max(0, Math.min(rect.y, src.rows - 1));
              const width = Math.min(rect.width, src.cols - x);
              const height = Math.min(rect.height, src.rows - y);

              if (width <= 0 || height <= 0) {
                console.warn(
                  `Invalid dimensions for region ${i}: ${width}x${height}`,
                );
                return;
              }

              const validRect = new cv.Rect(x, y, width, height);
              const roi = src.roi(validRect);

              const cropCanvas = document.createElement("canvas");
              cropCanvas.width = width;
              cropCanvas.height = height;
              cv.imshow(cropCanvas, roi);

              const croppedData = cropCanvas.toDataURL("image/png", 1.0);

              const detectedLabel = hasMarks
                ? detectLabelText(croppedData, i, detectedRegions, true)
                : rect.label;

              const category = getLabelCategory(detectedLabel);

              croppedImages.push(croppedData);
              if (i === 0) {
                regionLabel = detectedLabel;
              }

              console.log(
                `Part ${partNumber} - Stored Region ${i}: ${detectedLabel} → ${category?.form}`,
              );

              roi.delete();
            } catch (err) {
              console.error(`Error cropping region ${i}:`, err);
            }
          });

          // Update cropped regions
          setCroppedRegions((prev) => {
            const filtered = prev.filter(
              (region) =>
                !(
                  region.partNumber === partNumber &&
                  region.childTestId === childTestId &&
                  region.id === index &&
                  region.isFinal === isFinalRound
                ),
            );

            // Add new cropped regions
            const newRegions = croppedImages.map((data, i) => ({
              id: i,
              data: data,
              label: regionLabel,
              category: getLabelCategory(regionLabel),
              rect: detectedRegions[i] || { x: 0, y: 0, width: 0, height: 0 },
              partNumber: partNumber,
              childTestId: childTestId,
              isFinal: isFinalRound,
            }));

            return [...filtered, ...newRegions];
          });

          // Find and update the correct form and row
          const formEntries = Object.entries(forms);
          for (const [formKey, formData] of formEntries) {
            const updatedRows = formData.rows.map((row) => {
              if (
                row.partNumber === partNumber &&
                row.childTestId === childTestId
              ) {
                const currentCroppedImages = row.croppedImages || [];
                const updatedCroppedImages = [...currentCroppedImages];

                // Update at the specific index
                if (croppedImages.length > 0) {
                  updatedCroppedImages[index] = croppedImages[0]; // Take first cropped region
                }

                // For final round, update final cropped images
                if (isFinalRound) {
                  return {
                    ...row,
                    croppedImages: updatedCroppedImages,
                    croppedImage:
                      updatedCroppedImages[0] || row.croppedImage || "",
                    finalCroppedNonCosmeticImage:
                      updatedCroppedImages[0] ||
                      row.finalCroppedNonCosmeticImage ||
                      "",
                    regionLabel: regionLabel || row.regionLabel || "",
                    testDate:
                      row.testDate || new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                } else {
                  return {
                    ...row,
                    croppedImages: updatedCroppedImages,
                    croppedImage:
                      updatedCroppedImages[0] || row.croppedImage || "",
                    regionLabel: regionLabel || row.regionLabel || "",
                    testDate:
                      row.testDate || new Date().toISOString().split("T")[0],
                    status:
                      row.status === "Pending" ? "In Progress" : row.status,
                  };
                }
              }
              return row;
            });

            if (JSON.stringify(formData.rows) !== JSON.stringify(updatedRows)) {
              setForms((prev) => ({
                ...prev,
                [formKey]: {
                  ...prev[formKey],
                  rows: updatedRows,
                },
              }));
              break;
            }
          }

          src.delete();
        } catch (err) {
          console.error("Error processing stored image:", err);
        } finally {
          // Clear processing state
          setProcessingImages((prev) => ({
            ...prev,
            [`${partNumber}-${index}`]: false,
          }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (
    partNumber: string,
    testName: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    childTestId?: string,
  ) => {
    if (isSecondRound) {
      // For Unload , call the final image handler
      handleFinalImageUpload(partNumber, type, file, childTestId);
    } else {
      // For first round
      if (type === "nonCosmetic") {
        // For non-cosmetic images, process the uploaded file
        processNonCosmeticImage(file, partNumber, testName, childTestId, false);
      } else {
        // For cosmetic images, simple upload
        handleSimpleImageUpload(
          file,
          partNumber,
          testName,
          type,
          childTestId,
          false,
        );
      }
    }
  };

  // Handler for final round image uploads
  const handleFinalImageUpload = (
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    childTestId?: string,
  ) => {
    // Auto-clear existing images for this part in Unload
    if (isSecondRound) {
      // Clear from shared images
      setSharedImagesByPart((prev) => ({
        ...prev,
        [partNumber]: {
          ...prev[partNumber],
          // Clear only the specific type
          ...(type === "cosmetic"
            ? {
                finalCosmeticImages: [],
              }
            : {
                finalNonCosmeticImages: [],
              }),
        },
      }));

      // Clear from forms for the current test
      const formKey = `test_${currentTestIndex}`;
      const formData = forms[formKey];

      if (formData) {
        const updatedRows = formData.rows.map((row) => {
          if (
            row.partNumber === partNumber &&
            row.childTestId === childTestId
          ) {
            if (type === "cosmetic") {
              return {
                ...row,
                finalCosmeticImage: "",
                finalCosmeticImages: [],
              };
            } else {
              return {
                ...row,
                finalNonCosmeticImage: "",
                finalCroppedNonCosmeticImage: "",
                // Also clear non-cosmetic images for fresh upload
                nonCosmeticImages: [],
                nonCosmeticImage: "",
                croppedImages: [],
                croppedImage: "",
                regionLabel: "",
              };
            }
          }
          return row;
        });

        setForms((prev) => ({
          ...prev,
          [formKey]: {
            ...prev[formKey],
            rows: updatedRows,
          },
        }));
      }
    }

    if (type === "nonCosmetic") {
      // For final non-cosmetic images, process if needed
      processNonCosmeticImage(
        file,
        partNumber,
        currentTestRecord?.testName || "",
        childTestId,
        true,
      );
    } else {
      // For final cosmetic images, simple upload
      handleSimpleImageUpload(
        file,
        partNumber,
        currentTestRecord?.testName || "",
        type,
        childTestId,
        true,
      );
    }
  };

  const handleContinueToForms = async () => {
    saveFormData();

    if (currentRecord?.machineLoadData) {
      const loadData = currentRecord.machineLoadData;

      const initialData: TestingPartData = {
        id: loadData.loadId,
        chamber: loadData.chamber,
        machineId: loadData.machineDetails?.machineId || "",
        machineDescription: loadData.machineDetails?.machineDescription || "",
        parts: loadData.parts || [],
        machineDetails: loadData.machineDetails || {},
        loadedAt: loadData.loadedAt,
        status: "active",
        totalParts: loadData.totalParts,
        testUnit: loadData.parts[0]?.testUnit,
        testValue: loadData.duration,
        testStarted: true,
        testStatus: "form_started",
        timerStatus: "stopped",
        actualStartTime: loadData.loadedAt,
        isCompleted: false,
        lastUpdated: new Date().toISOString(),
        selectedTestId: loadData.machineDetails?.selectedTest?.id,
        selectedTestName: loadData.machineDetails?.selectedTest?.testName,
        isCombinedTest:
          loadData.machineDetails?.selectedTest?.isCombinedTest || false,
      };

      try {
        // POST to create initial testing part
        const testingdata = await saveTestingPartToBackend(initialData);
        console.log("response", testingdata);
      } catch (error) {
        console.error("Failed to create testing part in backend:", error);
      }
    }

    setCurrentStage(1);
  };

  // Form field updates
  const updateFormField = (formKey: string, field: string, value: any) => {
    setForms((prev) => ({
      ...prev,
      [formKey]: { ...prev[formKey], [field]: value },
    }));
  };

  const updateRowField = (
    formKey: string,
    rowId: number,
    field: string,
    value: string,
  ) => {
    setForms((prev) => {
      const formData = prev[formKey];
      if (!formData) return prev;

      const updatedRows = formData.rows.map((row) => {
        if (row.id === rowId) {
          // If updating checkpoint status, update chamberLoads
          if (
            field === "checkpointStatus" &&
            (value === "Pass" || value === "Fail") &&
            row.isCheckpointRow &&
            row.checkpointLabel
          ) {
            try {
              const chamberLoads = JSON.parse(
                localStorage.getItem("chamberLoads") || "[]",
              );

              let updated = false;

              for (let i = 0; i < chamberLoads.length; i++) {
                const load = chamberLoads[i];
                if (load.parts && Array.isArray(load.parts)) {
                  for (let j = 0; j < load.parts.length; j++) {
                    const part = load.parts[j];
                    if (
                      part.partNumber === row.partNumber &&
                      part.checkpointInfo &&
                      part.checkpointInfo.checkpointHistory
                    ) {
                      // Find the checkpoint in history
                      const historyIndex =
                        part.checkpointInfo.checkpointHistory.findIndex(
                          (h: any) => h.checkpoint === row.checkpointLabel,
                        );

                      if (historyIndex >= 0) {
                        // Update status in chamberLoads
                        chamberLoads[i].parts[
                          j
                        ].checkpointInfo.checkpointHistory[
                          historyIndex
                        ].status = value;
                        updated = true;
                        break;
                      }
                    }
                  }
                  if (updated) break;
                }
              }

              if (updated) {
                localStorage.setItem(
                  "chamberLoads",
                  JSON.stringify(chamberLoads),
                );
                console.log(
                  `Updated checkpoint status to ${value} in chamberLoads`,
                );
              }
            } catch (error) {
              console.error(
                "Error updating checkpoint status in chamberLoads:",
                error,
              );
            }

            // Also save to checkpoint results
            const checkpointResults = JSON.parse(
              localStorage.getItem("checkpointResults") || "{}",
            );

            const testName = formData.testName;
            if (!checkpointResults[testName]) {
              checkpointResults[testName] = { pass: [], fail: [] };
            }

            checkpointResults[testName].pass = checkpointResults[
              testName
            ].pass.filter((p: string) => p !== row.partNumber);
            checkpointResults[testName].fail = checkpointResults[
              testName
            ].fail.filter((p: string) => p !== row.partNumber);

            if (value === "Pass") {
              checkpointResults[testName].pass.push(row.partNumber);
            } else if (value === "Fail") {
              checkpointResults[testName].fail.push(row.partNumber);
            }

            localStorage.setItem(
              "checkpointResults",
              JSON.stringify(checkpointResults),
            );
          }

          return { ...row, [field]: value };
        }
        return row;
      });

      return {
        ...prev,
        [formKey]: {
          ...formData,
          rows: updatedRows,
        },
      };
    });
  };

  const addRow = (formKey: string, partNumber?: string) => {
    setForms((prev) => {
      const currentForm = prev[formKey];
      const currentChildTestIndex = currentForm.currentChildTestIndex || 0;
      const currentChildTest = currentForm.childTests?.[currentChildTestIndex];

      // Find rows for current child test
      const childTestRows = currentForm.rows.filter(
        (row) => row.childTestId === currentChildTest?.id,
      );
      const newId = Math.max(...childTestRows.map((r) => r.id), 0) + 1;

      // Find the part to assign the new row to
      const targetPartNumber =
        partNumber ||
        childTestRows[0]?.partNumber ||
        currentForm.rows[0]?.partNumber;
      const targetPart = currentRecord?.testRecords
        .find((tr) => tr.testName === currentForm.testName)
        ?.assignedParts.find((p) => p.partNumber === targetPartNumber);

      // Load existing images for the part
      const existingImages = loadImagesFromStorage(targetPartNumber);

      const newRow: FormRow = {
        id: newId,
        srNo: childTestRows.length + 1,
        testDate: new Date().toISOString().split("T")[0],
        config: "",
        sampleId: targetPart
          ? `${targetPart.partNumber}-${childTestRows.length + 1}`
          : `Sample-${newId}`,
        status: "Pending",
        partNumber: targetPartNumber || "",
        serialNumber: targetPart?.serialNumber || "",
        childTestId: currentChildTest?.id,
        childTestName: currentChildTest?.name,
        cosmeticImage: existingImages.cosmeticImages[0] || "",
        nonCosmeticImage: existingImages.nonCosmeticImages[0] || "",
        cosmeticImages: existingImages.cosmeticImages,
        nonCosmeticImages: existingImages.nonCosmeticImages,
        croppedImage: "",
        croppedImages: [],
        regionLabel: "",
        // For Unload , initialize final images
        finalCosmeticImage: isSecondRound
          ? existingImages.finalCosmeticImages?.[0] || ""
          : "",
        finalCosmeticImages: isSecondRound
          ? existingImages.finalCosmeticImages || []
          : [],
        finalNonCosmeticImage: isSecondRound
          ? existingImages.finalNonCosmeticImages?.[0] || ""
          : "",
        finalCroppedNonCosmeticImage: "",
      };

      // Add all custom column fields with empty values
      if (currentForm.customColumns) {
        currentForm.customColumns.forEach((col) => {
          newRow[col.id] = "";
        });
      }

      return {
        ...prev,
        [formKey]: {
          ...currentForm,
          rows: [...currentForm.rows, newRow],
        },
      };
    });
  };

  const updateChamberLoadsTimer = (
    loadId: number,
    testId: string,
    timerStatus: "start" | "stop",
    timerData: any,
  ) => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) {
        console.warn("No chamberLoads found in localStorage");
        return;
      }

      const chamberLoads = JSON.parse(chamberLoadsStr);

      // Find the specific load by ID
      const loadIndex = chamberLoads.findIndex(
        (load: any) => load.id === loadId,
      );

      if (loadIndex === -1) {
        console.warn(`Load with ID ${loadId} not found`);
        return;
      }

      // Update the load with timer information
      const updatedLoad = {
        ...chamberLoads[loadIndex],
        timerStatus: timerStatus,
        timerStartTime:
          timerStatus === "start"
            ? timerData.startTime
            : chamberLoads[loadIndex].timerStartTime,
        timerStopTime: timerStatus === "stop" ? timerData.stopTime : undefined,
        timerLastUpdated: timerData.lastUpdated,
        timerRemainingSeconds: timerData.remainingSeconds,
        // Update the specific test in machineDetails
        machineDetails: {
          ...chamberLoads[loadIndex].machineDetails,
          tests: chamberLoads[loadIndex].machineDetails.tests.map(
            (test: any) => {
              if (test.id === testId) {
                return {
                  ...test,
                  timerStatus: timerStatus,
                  timerStartTime:
                    timerStatus === "start"
                      ? timerData.startTime
                      : test.timerStartTime,
                  timerStopTime:
                    timerStatus === "stop" ? timerData.stopTime : undefined,
                  timerLastUpdated: timerData.lastUpdated,
                  timerRemainingSeconds: timerData.remainingSeconds,
                  status: timerStatus === "start" ? 2 : test.status, // 2 = In Progress
                  statusText:
                    timerStatus === "start" ? "In Progress" : test.statusText,
                };
              }
              return test;
            },
          ),
        },
      };

      // Update the chamber loads array
      chamberLoads[loadIndex] = updatedLoad;

      // Save back to localStorage
      localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));

      console.log("Chamber loads updated successfully:", updatedLoad);
    } catch (error) {
      console.error("Error updating chamber loads timer:", error);
    }
  };

  const handleTimerToggle = (formKey: string, childTestId?: string) => {
    const timerKey = childTestId ? `${formKey}_${childTestId}` : formKey;
    const currentState = timerStates[timerKey];

    setTimerStates((prev) => {
      const now = new Date().toISOString();
      const isStarting = !prev[timerKey]?.isRunning;

      const updatedState = {
        ...prev[timerKey],
        isRunning: isStarting,
        lastUpdated: now,
      };

      if (isStarting) {
        // Starting the timer
        updatedState.startTime = now;
        updatedState.stopTime = undefined;
      } else {
        // Stopping the timer
        updatedState.stopTime = now;
      }

      // Update chamberLoads in localStorage
      if (currentRecord?.machineLoadData) {
        const formData = forms[formKey];
        const currentChildTest =
          formData?.childTests?.[formData.currentChildTestIndex || 0];
        const testId = currentChildTest?.id || currentTestRecord?.testId;

        if (testId) {
          updateChamberLoadsTimer(
            currentRecord.machineLoadData.loadId,
            testId,
            isStarting ? "start" : "stop",
            updatedState,
          );
        }
      }

      return {
        ...prev,
        [timerKey]: updatedState,
      };
    });
  };

  // Handle child test completion
  const handleChildTestComplete = (formKey: string) => {
    setForms((prev) => {
      const currentForm = prev[formKey];
      const currentChildTestIndex = currentForm.currentChildTestIndex || 0;
      const childTests = currentForm.childTests || [];

      if (currentChildTestIndex < childTests.length - 1) {
        // Mark current child test as completed and move to next
        const updatedChildTests = [...childTests];
        updatedChildTests[currentChildTestIndex] = {
          ...updatedChildTests[currentChildTestIndex],
          isCompleted: true,
          status: "completed",
          endTime: new Date().toISOString(),
        };
        updatedChildTests[currentChildTestIndex + 1] = {
          ...updatedChildTests[currentChildTestIndex + 1],
          status: "active",
          startTime: new Date().toISOString(),
        };

        // Create rows for next child test
        const nextChildTest = updatedChildTests[currentChildTestIndex + 1];
        const newRows: FormRow[] = [];

        currentForm.rows
          .filter(
            (row) => row.childTestId === childTests[currentChildTestIndex].id,
          )
          .forEach((row, idx) => {
            // Load existing images for the part
            const existingImages = loadImagesFromStorage(row.partNumber);

            newRows.push({
              ...row,
              id: Date.now() + idx,
              srNo: idx + 1,
              testDate: "",
              childTestId: nextChildTest.id,
              childTestName: nextChildTest.name,
              cosmeticImage: existingImages.cosmeticImages[0] || "",
              nonCosmeticImage: existingImages.nonCosmeticImages[0] || "",
              cosmeticImages: existingImages.cosmeticImages,
              nonCosmeticImages: existingImages.nonCosmeticImages,
              croppedImage: "",
              croppedImages: [],
              regionLabel: "",
              status: "Pending",
              // For Unload , initialize final images
              finalCosmeticImage: isSecondRound
                ? existingImages.finalCosmeticImages?.[0] || ""
                : "",
              finalCosmeticImages: isSecondRound
                ? existingImages.finalCosmeticImages || []
                : [],
              finalNonCosmeticImage: isSecondRound
                ? existingImages.finalNonCosmeticImages?.[0] || ""
                : "",
              finalCroppedNonCosmeticImage: "",
            });
          });

        return {
          ...prev,
          [formKey]: {
            ...currentForm,
            childTests: updatedChildTests,
            currentChildTestIndex: currentChildTestIndex + 1,
            rows: [...currentForm.rows, ...newRows],
          },
        };
      } else {
        // Last child test completed
        const updatedChildTests = [...childTests];
        updatedChildTests[currentChildTestIndex] = {
          ...updatedChildTests[currentChildTestIndex],
          isCompleted: true,
          status: "completed",
          endTime: new Date().toISOString(),
        };

        return {
          ...prev,
          [formKey]: {
            ...currentForm,
            childTests: updatedChildTests,
          },
        };
      }
    });
  };

  // Handle child test change
  const handleChildTestChange = (formKey: string, childTestIndex: number) => {
    setForms((prev) => ({
      ...prev,
      [formKey]: {
        ...prev[formKey],
        currentChildTestIndex: childTestIndex,
      },
    }));
  };

  // Save form data
  const saveFormData = () => {
    if (!currentRecord) return false;

    try {
      // Update the current test record with form data
      const updatedTestRecords = currentRecord.testRecords.map(
        (testRecord, index) => {
          const formKey = `test_${index}`;
          const formData = forms[formKey];

          if (!formData) return testRecord;

          // Calculate test status based on rows and child tests
          const rows = formData.rows || [];
          const childTests = formData.childTests || [];
          const allChildTestsCompleted = childTests.every(
            (test) => test.isCompleted,
          );

          let status = "Pending";
          if (allChildTestsCompleted && rows.length > 0) {
            console.log(allChildTestsCompleted, rows.length);
            status = "Complete";
          } else if (
            rows.some((row) => row.status === "Pass" || row.status === "Fail")
          ) {
            status = "In Progress";
          }

          return {
            ...testRecord,
            status: status,
            testResults: formData.rows,
            remark: formData.remark || "",
            childTests: formData.childTests,
            currentChildTestIndex: formData.currentChildTestIndex,
            submittedAt: new Date().toISOString(),
          };
        },
      );

      // Update the current record
      const updatedRecord = {
        ...currentRecord,
        testRecords: updatedTestRecords,
        testingStatus: "In Testing",
      };

      setCurrentRecord(updatedRecord);

      console.log("Form data saved:", updatedRecord);
      return true;
    } catch (error) {
      console.error("Error saving form data:", error);
      return false;
    }
  };

  // Get current test record
  const currentTestRecord = currentRecord?.testRecords?.[currentTestIndex];

  // Get parts for current test
  const getPartsForCurrentTest = (
    formDataOverride?: FormData,
  ): AssignedPart[] => {
    if (!currentTestRecord) return [];

    const directParts = Array.isArray(currentTestRecord.assignedParts)
      ? currentTestRecord.assignedParts.filter(Boolean)
      : [];
    if (directParts.length > 0) {
      return directParts;
    }

    const normalizedTestName = (currentTestRecord.testName || "")
      .trim()
      .toLowerCase();
    const fallbackFromLoad = (currentRecord?.machineLoadData?.parts || [])
      .filter((part) => {
        if (!part) return false;
        if (
          currentTestRecord.testId &&
          part.testId === currentTestRecord.testId
        ) {
          return true;
        }
        const partTestName = (part.testName || "").trim().toLowerCase();
        return normalizedTestName !== "" && partTestName === normalizedTestName;
      })
      .map((part, index) => {
        const fallbackLocation =
          (part as { location?: string }).location ||
          currentRecord?.machineLoadData?.chamber ||
          "N/A";

        return {
          id: `${part.partNumber || "part"}-${index}`,
          partNumber: part.partNumber || `PART-${index + 1}`,
          serialNumber: part.serialNumber || "",
          location: fallbackLocation,
          scanStatus: part.scanStatus || (part.hasImages ? "OK" : "Pending"),
          assignedToTest: currentTestRecord.testName,
        } as AssignedPart;
      });

    if (fallbackFromLoad.length > 0) {
      return fallbackFromLoad;
    }

    const rows = formDataOverride?.rows || [];
    if (rows.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const derivedFromRows: AssignedPart[] = [];

    rows.forEach((row, index) => {
      if (!row.partNumber || seen.has(row.partNumber)) {
        return;
      }

      seen.add(row.partNumber);
      derivedFromRows.push({
        id: `row-${row.partNumber}-${index}`,
        partNumber: row.partNumber,
        serialNumber: row.serialNumber || "",
        location: currentRecord?.machineLoadData?.chamber || "N/A",
        scanStatus: row.status || "Pending",
        assignedToTest: currentTestRecord.testName,
      });
    });

    return derivedFromRows;
  };

  // Render Image Upload Stage
  const renderImageUploadStage = () => {
    if (!currentRecord) return null;

    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];
    const currentTestParts = getPartsForCurrentTest(formData);
    const currentChildTestIndex = formData?.currentChildTestIndex || 0;
    const currentChildTest = formData?.childTests?.[currentChildTestIndex];

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Step 1: Upload Images by Test
            </h2>
            <p className="text-gray-600 mt-1">
              Current Test:{" "}
              <span className="font-semibold text-blue-600">
                {currentTestRecord?.testName}
              </span>
              {currentChildTest && (
                <span className="ml-2 text-gray-600">
                  (Child Test:{" "}
                  <span className="font-semibold">{currentChildTest.name}</span>
                  )
                </span>
              )}
            </p>
            <div className="text-sm text-gray-500 mt-2">
              Ticket:{" "}
              <span className="font-semibold">{currentRecord.ticketCode}</span>{" "}
              | Project:{" "}
              <span className="font-semibold">{currentRecord.project}</span> |
              Build:{" "}
              <span className="font-semibold">{currentRecord.build}</span> |
              Type: <span className="font-semibold">{projectType}</span>
            </div>
            {isSecondRound && (
              <div className="mt-2">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                  Unload - Upload Final Images
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <AlertTriangle className="text-yellow-600" size={16} />
                  <span className="text-sm text-gray-700">
                    Scan parts before uploading final images
                  </span>
                  <button
                    onClick={handleOpenScanModal}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                  >
                    <Scan size={16} />
                    Scan Parts
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test Navigation */}
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700">
              Test {currentTestIndex + 1} of {currentRecord.testRecords.length}
            </div>
            <div className="flex gap-2">
              {currentRecord.testRecords.map((test, idx) => (
                <button
                  key={test.testId}
                  onClick={() => {
                    saveFormData();
                    setCurrentTestIndex(idx);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    currentTestIndex === idx
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {test.testName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Machine Load Information - New Section */}
        {currentRecord.machineLoadData && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Machine Load Information
              </h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Load ID: {currentRecord.machineLoadData.loadId}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Machine/Chamber:</span>
                <div className="font-semibold">
                  {currentRecord.machineLoadData.chamber}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">
                  Total Parts Loaded:
                </span>
                <div className="font-semibold">
                  {currentRecord.machineLoadData.totalParts}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loaded At:</span>
                <div className="font-semibold">
                  {new Date(
                    currentRecord.machineLoadData.loadedAt,
                  ).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">
                  Estimated Completion:
                </span>
                <div className="font-semibold">
                  {new Date(
                    currentRecord.machineLoadData.estimatedCompletion,
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">Duration:</span>
                <div className="font-semibold">
                  {currentRecord.machineLoadData.duration} hours
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Machine ID:</span>
                <div className="font-semibold">
                  {currentRecord.machineLoadData.machineDetails.machineId}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Description:</span>
                <div className="font-semibold">
                  {
                    currentRecord.machineLoadData.machineDetails
                      .machineDescription
                  }
                </div>
              </div>
            </div>

            {/* Pre-uploaded Images Status */}
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 mb-2">
                Pre-uploaded Images Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-sm text-gray-600">
                    Parts with images:
                  </span>
                  <span className="font-semibold ml-2">
                    {
                      currentRecord.machineLoadData.parts.filter(
                        (p) => p.hasImages,
                      ).length
                    }{" "}
                    / {currentRecord.machineLoadData.totalParts}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Cosmetic images:
                  </span>
                  <span className="font-semibold ml-2">
                    {currentRecord.machineLoadData.parts.reduce(
                      (sum, part) => sum + (part.cosmeticImages?.length || 0),
                      0,
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Non-cosmetic images:
                  </span>
                  <span className="font-semibold ml-2">
                    {currentRecord.machineLoadData.parts.reduce(
                      (sum, part) =>
                        sum + (part.nonCosmeticImages?.length || 0),
                      0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Child Test Progress */}
        {formData?.childTests && formData.childTests.length > 1 && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Child Tests Progress
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.childTests.map((childTest, index) => {
                const isLocked =
                  childTest.dependsOnPrevious &&
                  formData.childTests?.some(
                    (test, idx) =>
                      test.id === childTest.previousTestId &&
                      test.status !== "completed" &&
                      idx < index,
                  );

                return (
                  <div
                    key={childTest.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      currentChildTestIndex === index
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : childTest.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : isLocked
                            ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                    title={
                      isLocked
                        ? `Complete ${
                            formData.childTests?.[index - 1]?.name
                          } first`
                        : ""
                    }
                    onClick={() =>
                      !isLocked && handleChildTestChange(formKey, index)
                    }
                  >
                    <span className="font-medium">{childTest.name}</span>
                    {childTest.status === "completed" && (
                      <CheckCircle size={16} />
                    )}
                    {isLocked && !childTest.status && (
                      <Clock size={16} className="text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Test Info Card */}
        {/* Current Test Info Card */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-600">Test Name:</span>
              <div className="font-semibold">{currentTestRecord?.testName}</div>
            </div>
            {/* <div>
            <span className="text-sm text-gray-600">Current Child Test:</span>
            <div className="font-semibold">{currentChildTest?.name || 'None'}</div>
        </div> */}
            <div>
              <span className="text-sm text-gray-600">Assigned Parts:</span>
              <div className="font-semibold">
                {currentTestRecord?.assignedPartsCount &&
                currentTestRecord.assignedPartsCount > 0
                  ? currentTestRecord.assignedPartsCount
                  : currentTestParts.length}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Timing:</span>
              <div className="font-semibold">
                {currentChildTest?.timing || currentTestRecord?.timing} hours
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-gray-600">Ticket Code:</span>
              <div className="font-semibold">
                {currentRecord?.machineLoadData?.machineDetails?.ticketCode ||
                  currentRecord?.ticketCode ||
                  currentRecord?.machineLoadData?.ticketCode ||
                  "N/A"}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Test Condition:</span>
              <div className="font-semibold">
                {currentTestRecord?.testCondition}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <div
                className={`font-semibold ${
                  currentChildTest?.status === "completed"
                    ? "text-green-600"
                    : currentChildTest?.status === "active"
                      ? "text-yellow-600"
                      : "text-gray-600"
                }`}
              >
                {currentChildTest?.status?.toUpperCase() || "PENDING"}
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="font-semibold">Project Type:</span> {projectType}
            {shouldSplitImages(currentTestRecord?.testName) ? (
              <span className="ml-2 text-blue-600">
                (Non-cosmetic images will be split)
              </span>
            ) : (
              <span className="ml-2 text-green-600">
                (No image splitting required)
              </span>
            )}
          </div>
        </div>

        {/* Parts for Current Test */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Assigned Parts for{" "}
              {currentChildTest?.name || currentTestRecord?.testName}
              {isSecondRound && (
                <span className="ml-2 text-red-600">
                  (Unload - Final Images)
                </span>
              )}
            </h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {currentTestParts.length} Parts
            </span>
          </div>
          {shouldAutoEnableCheckpoint(formData.testCondition) && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs font-medium text-purple-800">
                ⚡ Auto-checkpoint enabled for this test
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTestParts.map((part) => {
              const rowData = formData?.rows?.find(
                (row) =>
                  row.partNumber === part.partNumber &&
                  row.childTestId === currentChildTest?.id,
              );
              const existingImages = loadImagesFromStorage(part.partNumber);
              console.log(existingImages);
              const isPartVerified = isSecondRound
                ? verifiedPartsForFinalUpload.has(part.partNumber)
                : true;

              return (
                <div
                  key={part.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-800 text-lg">
                          {part.partNumber}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            part.scanStatus === "OK"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {part.scanStatus}
                        </span>

                        {/* Show pre-uploaded images badge */}
                        {(existingImages.cosmeticImages.length > 0 ||
                          existingImages.nonCosmeticImages.length > 0 ||
                          (isSecondRound &&
                            (existingImages.finalCosmeticImages?.length || 0) >
                              0) ||
                          (isSecondRound &&
                            (existingImages.finalNonCosmeticImages?.length ||
                              0) > 0)) && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                            <ImageIcon size={10} />
                            {isSecondRound
                              ? "Final images loaded"
                              : "Images loaded from storage"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Serial:</span>{" "}
                        {part.serialNumber}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Location:</span>{" "}
                        {part.location}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Assigned:</span>{" "}
                        {part.assignedToTest}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rowData?.status === "Pass"
                          ? "bg-green-100 text-green-800"
                          : rowData?.status === "Fail"
                            ? "bg-red-100 text-red-800"
                            : rowData?.status === "In Progress"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rowData?.status || "Not Started"}
                    </span>
                    {isSecondRound && !isPartVerified && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Not Scanned
                      </span>
                    )}
                    {isSecondRound && isPartVerified && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-4">
                    {/* Show warning if part is not verified in Unload  */}
                    {isSecondRound && !isPartVerified && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle
                          className="text-red-600 mt-0.5 flex-shrink-0"
                          size={16}
                        />
                        <div className="text-xs text-red-800">
                          <p className="font-medium mb-1">
                            This part has not been scanned yet
                          </p>
                          <p>
                            Please scan this part using the "Scan Parts" button
                            before uploading final images.
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Cosmetic Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSecondRound
                          ? "Final Cosmetic Images"
                          : "Cosmetic Images"}
                      </label>

                      {/* Display pre-uploaded cosmetic images */}
                      {(isSecondRound
                        ? existingImages.finalCosmeticImages
                        : existingImages.cosmeticImages
                      ).length > 0 ? (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            {isSecondRound ? "Final " : "Pre-uploaded "}images (
                            {
                              (isSecondRound
                                ? existingImages.finalCosmeticImages
                                : existingImages.cosmeticImages
                              ).length
                            }
                            ):
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(isSecondRound
                              ? existingImages.finalCosmeticImages
                              : existingImages.cosmeticImages
                            ).map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img}
                                  alt={`${
                                    isSecondRound
                                      ? "Final Cosmetic"
                                      : "Cosmetic"
                                  } ${index + 1}`}
                                  className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                  {isSecondRound ? "Final " : "Pre-uploaded "}{" "}
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Images loaded from storage. To add more, upload
                            below:
                          </div>
                        </div>
                      ) : (isSecondRound
                          ? rowData?.finalCosmeticImages
                          : rowData?.cosmeticImages) &&
                        (isSecondRound
                          ? rowData.finalCosmeticImages
                          : rowData.cosmeticImages
                        ).length > 0 ? (
                        <div className="mb-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(isSecondRound
                              ? rowData.finalCosmeticImages
                              : rowData.cosmeticImages
                            ).map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img}
                                  alt={`${
                                    isSecondRound
                                      ? "Final Cosmetic"
                                      : "Cosmetic"
                                  } ${index + 1}`}
                                  className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove this specific image
                                    const formKey = `test_${currentTestIndex}`;
                                    const formData = forms[formKey];

                                    if (formData) {
                                      const updatedRows = formData.rows.map(
                                        (row) => {
                                          if (
                                            row.partNumber ===
                                              part.partNumber &&
                                            row.childTestId ===
                                              currentChildTest?.id
                                          ) {
                                            if (isSecondRound) {
                                              const updatedFinalCosmeticImages =
                                                [
                                                  ...(row.finalCosmeticImages ||
                                                    []),
                                                ];
                                              updatedFinalCosmeticImages.splice(
                                                index,
                                                1,
                                              );

                                              return {
                                                ...row,
                                                finalCosmeticImages:
                                                  updatedFinalCosmeticImages,
                                                finalCosmeticImage:
                                                  updatedFinalCosmeticImages[0] ||
                                                  "",
                                              };
                                            } else {
                                              const updatedCosmeticImages = [
                                                ...(row.cosmeticImages || []),
                                              ];
                                              updatedCosmeticImages.splice(
                                                index,
                                                1,
                                              );

                                              return {
                                                ...row,
                                                cosmeticImages:
                                                  updatedCosmeticImages,
                                                cosmeticImage:
                                                  updatedCosmeticImages[0] ||
                                                  "",
                                              };
                                            }
                                          }
                                          return row;
                                        },
                                      );

                                      setForms((prev) => ({
                                        ...prev,
                                        [formKey]: {
                                          ...prev[formKey],
                                          rows: updatedRows,
                                        },
                                      }));
                                    }
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  title="Remove this image"
                                >
                                  <X size={14} />
                                </button>
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                  {isSecondRound ? "Final " : ""}Image{" "}
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          {projectType === "Hulk" && (
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.multiple = true;
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement)
                                    .files;
                                  if (files) {
                                    Array.from(files).forEach((file) => {
                                      handleImageUpload(
                                        part.partNumber,
                                        currentTestRecord!.testName,
                                        "cosmetic",
                                        file,
                                        currentChildTest?.id,
                                      );
                                    });
                                  }
                                };
                                input.click();
                              }}
                              className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors mt-2"
                            >
                              + Add More
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No {isSecondRound ? "final " : ""}cosmetic images
                          uploaded yet
                        </div>
                      )}

                      <label
                        className={`flex items-center justify-center h-20 border-2 border-dashed rounded-lg transition-colors ${
                          processing || (isSecondRound && !isPartVerified)
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:border-blue-400 hover:bg-blue-100"
                        }`}
                        style={{
                          borderColor:
                            processing || (isSecondRound && !isPartVerified)
                              ? "#d1d5db"
                              : isSecondRound
                                ? "#a78bfa"
                                : "#93c5fd",
                          backgroundColor:
                            processing || (isSecondRound && !isPartVerified)
                              ? "#f3f4f6"
                              : isSecondRound
                                ? "#f5f3ff"
                                : "#eff6ff",
                        }}
                      >
                        <div className="text-center">
                          <Upload
                            className={`mx-auto mb-1 ${
                              processing || (isSecondRound && !isPartVerified)
                                ? "text-gray-400"
                                : isSecondRound
                                  ? "text-purple-400"
                                  : "text-blue-400"
                            }`}
                            size={20}
                          />
                          <span
                            className={`text-sm font-medium ${
                              processing || (isSecondRound && !isPartVerified)
                                ? "text-gray-500"
                                : isSecondRound
                                  ? "text-purple-600"
                                  : "text-blue-600"
                            }`}
                          >
                            {processing
                              ? "Processing..."
                              : isSecondRound && !isPartVerified
                                ? "Scan Part First"
                                : `Upload ${
                                    isSecondRound ? "Final " : ""
                                  }Cosmetic Image${
                                    projectType === "Hulk" ? "s" : ""
                                  }`}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {isSecondRound && !isPartVerified
                              ? "Part must be scanned"
                              : "Click to add image" +
                                (projectType === "Hulk" ? "s" : "")}
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          multiple={projectType === "Hulk"}
                          onChange={(e) => {
                            if (
                              e.target.files &&
                              !processing &&
                              !(isSecondRound && !isPartVerified)
                            ) {
                              Array.from(e.target.files).forEach((file) => {
                                handleImageUpload(
                                  part.partNumber,
                                  currentTestRecord!.testName,
                                  "cosmetic",
                                  file,
                                  currentChildTest?.id,
                                );
                              });
                              e.target.value = "";
                            }
                          }}
                          disabled={
                            processing || (isSecondRound && !isPartVerified)
                          }
                        />
                      </label>
                      {/* Show total count */}
                      {((isSecondRound
                        ? existingImages.finalCosmeticImages
                        : existingImages.cosmeticImages
                      ).length > 0 ||
                        (isSecondRound
                          ? rowData?.finalCosmeticImages
                          : rowData?.cosmeticImages
                        )?.length > 0) && (
                        <div className="mt-2 text-xs text-gray-600">
                          Total:{" "}
                          {(isSecondRound
                            ? existingImages.finalCosmeticImages
                            : existingImages.cosmeticImages
                          ).length +
                            ((isSecondRound
                              ? rowData?.finalCosmeticImages
                              : rowData?.cosmeticImages
                            )?.length || 0)}{" "}
                          image(s)
                        </div>
                      )}
                    </div>

                    {/* Non-Cosmetic Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSecondRound
                          ? "Final Non-Cosmetic Images"
                          : "Non-Cosmetic Images"}
                      </label>

                      {processing && (
                        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-sm text-blue-600">
                            Processing with OpenCV...
                          </span>
                        </div>
                      )}

                      {/* Only show existing images if NOT in Unload  */}
                      {!isSecondRound &&
                      existingImages.nonCosmeticImages.length > 0 ? (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Pre-uploaded images
                          </div>
                          <div className="space-y-4">
                            {existingImages.nonCosmeticImages.map(
                              (img, index) => {
                                const isProcessing =
                                  processingImages[
                                    `${part.partNumber}-${index}`
                                  ];
                                const rowData = formData?.rows?.find(
                                  (row) =>
                                    row.partNumber === part.partNumber &&
                                    row.childTestId === currentChildTest?.id,
                                );
                                const croppedImage =
                                  rowData?.croppedImages?.[index];

                                return (
                                  <div
                                    key={index}
                                    className="border rounded-lg p-3 bg-gray-50"
                                  >
                                    <div className="flex flex-col md:flex-row gap-4">
                                      {/* Original non-cosmetic image */}
                                      <div className="flex-1">
                                        <div className="relative group">
                                          <img
                                            src={img}
                                            alt={`Non-Cosmetic ${index + 1}`}
                                            className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                          />
                                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                            Pre-uploaded {index + 1}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Corresponding cropped image */}
                                      <div className="flex-1">
                                        {croppedImage ? (
                                          <div className="h-full flex flex-col justify-center">
                                            <div className="text-xs text-gray-600 mb-1">
                                              <span className="font-semibold">
                                                Detected Region:
                                              </span>{" "}
                                              {rowData?.regionLabel ||
                                                "Processing..."}
                                            </div>
                                            <div className="flex justify-center">
                                              <img
                                                src={croppedImage}
                                                alt={`Cropped ${index + 1}`}
                                                className="w-24 h-24 object-contain border rounded-lg shadow-sm"
                                              />
                                            </div>
                                          </div>
                                        ) : isProcessing ? (
                                          <div className="h-full flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                                            <span className="text-xs text-gray-500">
                                              Processing cropped image...
                                            </span>
                                          </div>
                                        ) : !shouldSplitImages(
                                            currentTestRecord?.testName,
                                          ) ? (
                                          <div className="h-full flex flex-col items-center justify-center">
                                            <div className="text-xs text-gray-500 text-center">
                                              No splitting required for{" "}
                                              {projectType} project
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="h-full flex flex-col items-center justify-center">
                                            <div className="text-xs text-gray-500 text-center">
                                              Cropped image will appear here
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Images loaded from storage. To add more, upload
                            below:
                          </div>
                        </div>
                      ) : (isSecondRound
                          ? rowData?.nonCosmeticImages
                          : rowData?.nonCosmeticImages) &&
                        (isSecondRound
                          ? rowData.nonCosmeticImages
                          : rowData.nonCosmeticImages
                        ).length > 0 ? (
                        <div className="mb-3">
                          <div className="space-y-4">
                            {(isSecondRound
                              ? rowData.nonCosmeticImages
                              : rowData.nonCosmeticImages
                            ).map((img, index) => {
                              const croppedImage =
                                rowData.croppedImages?.[index];

                              return (
                                <div
                                  key={index}
                                  className="border rounded-lg p-3 bg-gray-50"
                                >
                                  <div className="flex flex-col md:flex-row gap-4">
                                    {/* Original non-cosmetic image */}
                                    <div className="flex-1">
                                      <div className="relative group">
                                        <img
                                          src={img}
                                          alt={`${
                                            isSecondRound
                                              ? "Final Non-Cosmetic"
                                              : "Non-Cosmetic"
                                          } ${index + 1}`}
                                          className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Remove this specific image and its cropped version
                                            const formKey = `test_${currentTestIndex}`;
                                            const formData = forms[formKey];

                                            if (formData) {
                                              const updatedRows =
                                                formData.rows.map((row) => {
                                                  if (
                                                    row.partNumber ===
                                                      part.partNumber &&
                                                    row.childTestId ===
                                                      currentChildTest?.id
                                                  ) {
                                                    const updatedNonCosmeticImages =
                                                      [
                                                        ...(row.nonCosmeticImages ||
                                                          []),
                                                      ];
                                                    const updatedCroppedImages =
                                                      [
                                                        ...(row.croppedImages ||
                                                          []),
                                                      ];

                                                    // Remove from both arrays at same index
                                                    updatedNonCosmeticImages.splice(
                                                      index,
                                                      1,
                                                    );
                                                    if (
                                                      updatedCroppedImages[
                                                        index
                                                      ]
                                                    ) {
                                                      updatedCroppedImages.splice(
                                                        index,
                                                        1,
                                                      );
                                                    }

                                                    return {
                                                      ...row,
                                                      nonCosmeticImages:
                                                        updatedNonCosmeticImages,
                                                      nonCosmeticImage:
                                                        updatedNonCosmeticImages[0] ||
                                                        "",
                                                      croppedImages:
                                                        updatedCroppedImages,
                                                      croppedImage:
                                                        updatedCroppedImages[0] ||
                                                        "",
                                                      ...(isSecondRound && {
                                                        finalNonCosmeticImage:
                                                          updatedNonCosmeticImages[0] ||
                                                          "",
                                                        finalCroppedNonCosmeticImage:
                                                          updatedCroppedImages[0] ||
                                                          "",
                                                      }),
                                                    };
                                                  }
                                                  return row;
                                                });

                                              setForms((prev) => ({
                                                ...prev,
                                                [formKey]: {
                                                  ...prev[formKey],
                                                  rows: updatedRows,
                                                },
                                              }));
                                            }
                                          }}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                          title="Remove this image"
                                        >
                                          <X size={14} />
                                        </button>
                                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                          {isSecondRound ? "Final " : ""}Image{" "}
                                          {index + 1}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Corresponding cropped image (if exists) */}
                                    <div className="flex-1">
                                      {croppedImage &&
                                      shouldSplitImages(
                                        currentTestRecord?.testName,
                                      ) ? (
                                        <div className="h-full flex flex-col justify-center">
                                          <div className="text-xs text-gray-600 mb-1">
                                            <span className="font-semibold">
                                              Detected Region:
                                            </span>{" "}
                                            {rowData.regionLabel}
                                          </div>
                                          <div className="flex justify-center">
                                            <img
                                              src={croppedImage}
                                              alt={`${
                                                isSecondRound
                                                  ? "Final Cropped"
                                                  : "Cropped"
                                              } ${index + 1}`}
                                              className="w-24 h-24 object-contain border rounded-lg shadow-sm"
                                            />
                                          </div>
                                        </div>
                                      ) : shouldSplitImages(
                                          currentTestRecord?.testName,
                                        ) ? (
                                        <div className="h-full flex flex-col items-center justify-center">
                                          <div className="text-xs text-gray-500 text-center">
                                            Cropped image will appear here
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No {isSecondRound ? "final " : ""}non-cosmetic images
                          uploaded yet
                        </div>
                      )}

                      <label
                        className={`flex items-center justify-center h-20 border-2 border-dashed rounded-lg transition-colors ${
                          processing || (isSecondRound && !isPartVerified)
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:border-green-400 hover:bg-green-100"
                        }`}
                        style={{
                          borderColor:
                            processing || (isSecondRound && !isPartVerified)
                              ? "#d1d5db"
                              : isSecondRound
                                ? "#fdba74"
                                : "#86efac",
                          backgroundColor:
                            processing || (isSecondRound && !isPartVerified)
                              ? "#f3f4f6"
                              : isSecondRound
                                ? "#ffedd5"
                                : "#f0fdf4",
                        }}
                      >
                        <div className="text-center">
                          <Upload
                            className={`mx-auto mb-1 ${
                              processing || (isSecondRound && !isPartVerified)
                                ? "text-gray-400"
                                : isSecondRound
                                  ? "text-orange-400"
                                  : "text-green-400"
                            }`}
                            size={20}
                          />
                          <span
                            className={`text-sm font-medium ${
                              processing || (isSecondRound && !isPartVerified)
                                ? "text-gray-500"
                                : isSecondRound
                                  ? "text-orange-600"
                                  : "text-green-600"
                            }`}
                          >
                            {processing
                              ? "Processing..."
                              : isSecondRound && !isPartVerified
                                ? "Scan Part First"
                                : `Upload ${
                                    isSecondRound ? "Final " : ""
                                  }Non-Cosmetic Image`}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {isSecondRound && !isPartVerified
                              ? "Part must be scanned"
                              : `Click to add ${
                                  isSecondRound ? "new " : ""
                                }image`}
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (
                              e.target.files?.[0] &&
                              !processing &&
                              !(isSecondRound && !isPartVerified)
                            ) {
                              handleImageUpload(
                                part.partNumber,
                                currentTestRecord!.testName,
                                "nonCosmetic",
                                e.target.files[0],
                                currentChildTest?.id,
                              );
                              e.target.value = "";
                            }
                          }}
                          disabled={
                            processing || (isSecondRound && !isPartVerified)
                          }
                        />
                      </label>

                      {/* Show total count - only for newly uploaded images */}
                      {(isSecondRound
                        ? rowData?.nonCosmeticImages
                        : rowData?.nonCosmeticImages
                      )?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          Total:{" "}
                          {(isSecondRound
                            ? rowData?.nonCosmeticImages
                            : rowData?.nonCosmeticImages
                          )?.length || 0}{" "}
                          image(s) uploaded
                        </div>
                      )}

                      {/* Show pre-uploaded count only in first round */}
                      {!isSecondRound &&
                        existingImages.nonCosmeticImages.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Pre-uploaded:{" "}
                            {existingImages.nonCosmeticImages.length} image(s)
                            from storage
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          {currentTestIndex > 0 && (
            <button
              onClick={() => {
                saveFormData();
                setCurrentTestIndex((prev) => prev - 1);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center font-medium transition-colors"
            >
              <ChevronLeft size={20} className="mr-2" />
              Previous Test
            </button>
          )}

          {currentTestIndex < currentRecord.testRecords.length - 1 ? (
            <button
              onClick={() => {
                saveFormData();
                setCurrentTestIndex((prev) => prev + 1);
              }}
              className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-medium transition-colors"
            >
              Next Test
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            // <button
            //   onClick={() => {
            //     saveFormData();
            //     setCurrentStage(1);
            //   }}
            //   className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-medium transition-colors"
            // >
            //   Continue to Forms
            //   <ChevronRight size={20} className="ml-2" />
            // </button>
            // In renderImageUploadStage function, find the button and update:
            <button
              onClick={handleContinueToForms}
              className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-medium transition-colors"
            >
              Continue to Forms
              <ChevronRight size={20} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Add this component before the return statement in renderFormStage (around line 2800)
  const renderCheckpointConfirmDialog = () => {
    if (
      !showCheckpointConfirmDialog ||
      selectedPartsForCheckpoint.length === 0
    ) {
      return null;
    }

    type CheckpointDetail = {
      partNumber: string;
      currentCheckpoint: string;
      nextCheckpoint: string | null;
    };

    const checkpointDetails: CheckpointDetail[] = [];

    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );

      selectedPartsForCheckpoint.forEach((partNumber) => {
        let currentCheckpoint = "";
        let nextCheckpoint: string | null = null;

        for (const load of chamberLoads) {
          const part = load.parts?.find(
            (p: any) => p.partNumber === partNumber,
          );

          if (part && part.checkpointInfo) {
            const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;

            currentCheckpoint = checkpoints[currentCheckpointIndex] || "";
            nextCheckpoint =
              currentCheckpointIndex + 1 < checkpoints.length
                ? checkpoints[currentCheckpointIndex + 1]
                : null;
            break;
          }
        }

        checkpointDetails.push({
          partNumber,
          currentCheckpoint,
          nextCheckpoint,
        });
      });
    } catch (error) {
      console.error("Error getting checkpoint info:", error);
    }

    const hasUpcomingCheckpoints = checkpointDetails.some(
      (detail) => detail.nextCheckpoint,
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
              <Clock size={24} className="text-blue-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              Confirm Checkpoint Progress
            </h3>

            <p className="text-gray-600 text-center mb-4">
              Are you sure you want to mark these checkpoints as complete?
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-3">
                This will update the checkpoint progress and move the selected
                parts to the next stage.
              </p>
              <div className="space-y-2 text-sm">
                {checkpointDetails.map((detail) => (
                  <div
                    key={detail.partNumber}
                    className="flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-800">
                      {detail.partNumber}
                    </span>
                    <span className="text-blue-700 font-medium">
                      {detail.currentCheckpoint || "No remaining checkpoints"}
                    </span>
                  </div>
                ))}
              </div>
              {hasUpcomingCheckpoints ? (
                <p className="text-sm text-blue-700 font-semibold mt-3">
                  Next checkpoints will be ready after confirmation.
                </p>
              ) : (
                <p className="text-sm text-green-700 font-semibold mt-3">
                  These parts have finished all checkpoints.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCheckpointConfirmDialog(false);
                  setSelectedPartsForCheckpoint([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckpointProgress}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Form Stage
  const renderFormStage = () => {
    if (!currentTestRecord) return null;

    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];

    if (!formData) return null;

    const currentTestParts = getPartsForCurrentTest(formData);
    const currentChildTestIndex = formData.currentChildTestIndex || 0;
    const currentChildTest = formData.childTests?.[currentChildTestIndex];
    const checkpointHours = parseInt(
      currentChildTest?.timing || currentTestRecord.timing || "24",
    );
    const checkpointStatus = "Pending";
    const timerKey = currentChildTest
      ? `${formKey}_${currentChildTest.id}`
      : formKey;
    const timerState = timerStates[timerKey] || {
      remainingSeconds: checkpointHours * 3600,
      isRunning: false,
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Test Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-6">
            <div className="flex flex-wrap gap-2 py-4">
              {currentRecord?.testRecords.map((test, idx) => (
                <button
                  key={test.testId}
                  onClick={() => {
                    saveFormData();
                    setCurrentTestIndex(idx);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    currentTestIndex === idx
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {test.testName}
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      currentTestIndex === idx
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {test.assignedPartsCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Current Test Header */}
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-full mx-auto px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentTestRecord.testName}
                </h2>
                <p className="text-gray-600 mt-1">
                  Test {currentTestIndex + 1} of{" "}
                  {currentRecord!.testRecords.length} |
                  <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {currentTestRecord.processStage}
                  </span>
                  {currentChildTest && (
                    <span className="ml-2 text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                      Current: {currentChildTest.name}
                    </span>
                  )}
                  {isSecondRound && (
                    <span className="ml-2 text-sm font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                      Unload
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Project Type:{" "}
                  <span className="font-semibold">{projectType}</span>
                  {shouldSplitImages(currentTestRecord.testName) && (
                    <span className="ml-2 text-blue-600">
                      (Non-cosmetic images will be split)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Specification</p>
                <p className="font-semibold text-gray-800">
                  {currentTestRecord.specification}
                </p>
              </div>
            </div>
          </div>
        </div>
        <DefaultForm
          formData={formData}
          updateFormField={(field, value) =>
            updateFormField(formKey, field, value)
          }
          updateRowField={(rowId, field, value) =>
            updateRowField(formKey, rowId, field, value)
          }
          addRow={(partNumber) => addRow(formKey, partNumber)}
          selectedParts={currentTestParts}
          checkpointHours={checkpointHours}
          formKey={formKey}
          timerState={timerState}
          onTimerToggle={() => handleTimerToggle(formKey, currentChildTest?.id)}
          croppedRegions={croppedRegions.filter((region) => {
            const testParts = currentTestParts.map((p) => p.partNumber);
            return (
              testParts.includes(region.partNumber || "") &&
              region.childTestId === currentChildTest?.id &&
              region.isFinal === isSecondRound
            );
          })}
          isSecondRound={isSecondRound}
          currentChildTest={currentChildTest}
          onChildTestComplete={() => handleChildTestComplete(formKey)}
          onChildTestChange={(childTestIndex) =>
            handleChildTestChange(formKey, childTestIndex)
          }
          machineLoadData={currentRecord.machineLoadData}
          loadImagesFromStorage={loadImagesFromStorage}
          projectType={projectType}
          handleFinalImageUpload={handleFinalImageUpload}
          handleCheckpointClick={handleCheckpointClick}
          getNextCheckpointName={getNextCheckpointName}
          getTestConditionForPart={getTestConditionForPart}
          handleCheckpointImageUpload={handleCheckpointImageUpload} // ADD THIS
        />
      </div>
    );
  };

  // Function to store progress in localStorage
  const storeProgressInLocalStorage = (
    partNumber: string,
    progress: number,
    hour: number,
    images?: any,
  ) => {
    try {
      const progressDataStr = localStorage.getItem("partProgressData");
      const progressData = progressDataStr ? JSON.parse(progressDataStr) : {};

      if (!progressData[partNumber]) {
        progressData[partNumber] = {};
      }

      progressData[partNumber][hour] = {
        progress: progress,
        timestamp: new Date().toISOString(),
        images: images || {},
        status: progress === 3 ? "Completed" : "In Progress",
      };

      localStorage.setItem("partProgressData", JSON.stringify(progressData));

      // Also update local state
      setProgressStates((prev) => ({
        ...prev,
        [partNumber]: {
          ...prev[partNumber],
          currentProgress: progress,
          completedAt: new Date().toISOString(),
          lastCheckpoint: `Hour ${hour}`,
          images: {
            ...prev[partNumber]?.images,
            [hour]: images || {},
          },
        },
      }));

      console.log(
        `Progress stored for ${partNumber}: ${progress}/3 at hour ${hour}`,
      );
    } catch (error) {
      console.error("Error storing progress:", error);
    }
  };

  // Handler for checkpoint row image upload
  const handleCheckpointImageUpload = (
    rowId: number,
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    checkpointLabel: string,
    childTestId?: string,
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const formKey = `test_${currentTestIndex}`;
      const formData = forms[formKey];

      if (!formData) return;

      if (type === "cosmetic") {
        // Handle cosmetic image upload
        const updatedRows = formData.rows.map((row) => {
          if (row.id === rowId) {
            const currentCosmeticImages = row.cosmeticImages || [];
            const updatedCosmeticImages = [...currentCosmeticImages, imageUrl];

            return {
              ...row,
              cosmeticImages: updatedCosmeticImages,
              cosmeticImage: imageUrl,
              testDate: new Date().toISOString().split("T")[0],
            };
          }
          return row;
        });

        setForms((prev) => ({
          ...prev,
          [formKey]: {
            ...prev[formKey],
            rows: updatedRows,
          },
        }));

        // Update chamberLoads
        updateCheckpointImagesInChamberLoads(
          partNumber,
          checkpointLabel,
          "cosmetic",
          imageUrl,
        );
      } else {
        // Handle non-cosmetic image upload with auto-cropping
        processNonCosmeticImageForCheckpoint(
          file,
          partNumber,
          formData.testName,
          childTestId,
          checkpointLabel,
          rowId,
        );

        // Also store the original non-cosmetic image
        const updatedRows = formData.rows.map((row) => {
          if (row.id === rowId) {
            const currentNonCosmeticImages = row.nonCosmeticImages || [];
            const updatedNonCosmeticImages = [
              ...currentNonCosmeticImages,
              imageUrl,
            ];

            return {
              ...row,
              nonCosmeticImages: updatedNonCosmeticImages,
              nonCosmeticImage: imageUrl,
              testDate: new Date().toISOString().split("T")[0],
            };
          }
          return row;
        });

        setForms((prev) => ({
          ...prev,
          [formKey]: {
            ...prev[formKey],
            rows: updatedRows,
          },
        }));

        // Update chamberLoads
        updateCheckpointImagesInChamberLoads(
          partNumber,
          checkpointLabel,
          "nonCosmetic",
          imageUrl,
        );
      }
    };
    reader.readAsDataURL(file);
  };

  // Update checkpoint images in chamberLoads
  const updateCheckpointImagesInChamberLoads = (
    partNumber: string,
    checkpointLabel: string,
    type: "cosmetic" | "nonCosmetic" | "cropped",
    imageUrl: string,
  ) => {
    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );

      let updated = false;

      for (let i = 0; i < chamberLoads.length; i++) {
        const load = chamberLoads[i];
        if (load.parts && Array.isArray(load.parts)) {
          for (let j = 0; j < load.parts.length; j++) {
            const part = load.parts[j];
            if (
              part.partNumber === partNumber &&
              part.checkpointInfo &&
              part.checkpointInfo.checkpointHistory
            ) {
              // Find the checkpoint in history
              const historyIndex =
                part.checkpointInfo.checkpointHistory.findIndex(
                  (h: any) => h.checkpoint === checkpointLabel,
                );

              if (historyIndex >= 0) {
                if (
                  !chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                    historyIndex
                  ].images
                ) {
                  chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                    historyIndex
                  ].images = {
                    cosmetic: [],
                    nonCosmetic: [],
                    cropped: [],
                  };
                }

                // Add image to appropriate array
                chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                  historyIndex
                ].images[type].push(imageUrl);
                updated = true;
                break;
              } else {
                // Create new checkpoint history entry
                chamberLoads[i].parts[j].checkpointInfo.checkpointHistory.push({
                  checkpoint: checkpointLabel,
                  completedAt: new Date().toISOString(),
                  status: "Pending",
                  images: {
                    cosmetic: type === "cosmetic" ? [imageUrl] : [],
                    nonCosmetic: type === "nonCosmetic" ? [imageUrl] : [],
                    cropped: type === "cropped" ? [imageUrl] : [],
                  },
                });
                updated = true;
                break;
              }
            }
          }
          if (updated) break;
        }
      }

      if (updated) {
        localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));
        console.log(
          `Updated ${type} image for checkpoint ${checkpointLabel} in chamberLoads`,
        );
      }
    } catch (error) {
      console.error("Error updating checkpoint images in chamberLoads:", error);
    }
  };


  const handleSubmit = async () => {
    const saved = saveFormData();

    if (!saved) {
      alert("Error saving form data. Please try again.");
      return;
    }

    if (!isSecondRound) {
      const formKey = `test_${currentTestIndex}`;
      const formData = forms[formKey];

      if (formData) {
        const hasCheckpointColumn = formData.rows.some(
          (row) =>
            row.checkpointHours !== undefined ||
            row.checkpointStatus !== undefined,
        );

        console.log("Has checkpoint column:", hasCheckpointColumn);

        if (hasCheckpointColumn) {
          const rowsWithCheckpoint = formData.rows.filter(
            (row) =>
              row.checkpointStatus &&
              (row.checkpointStatus === "Pass" ||
                row.checkpointStatus === "Fail"),
          );

          if (rowsWithCheckpoint.length === 0) {
            alert(
              "Please complete checkpoint status for all parts before submitting.",
            );
            return;
          }

          const passParts = rowsWithCheckpoint.filter(
            (row) => row.checkpointStatus === "Pass",
          );
          const failParts = rowsWithCheckpoint.filter(
            (row) => row.checkpointStatus === "Fail",
          );

          // Update checkpoint status in chamberLoads
          rowsWithCheckpoint.forEach((row) => {
            if (
              row.checkpointStatus === "Pass" ||
              row.checkpointStatus === "Fail"
            ) {
              updateCheckpointStatusInChamberLoads(
                row.partNumber,
                row.checkpointHours || 0,
                row.checkpointStatus,
                true,
              );
            }
          });

          // PUT TO BACKEND: Update checkpoint completion status
          if (currentRecord?.machineLoadData) {
            const loadData = currentRecord.machineLoadData;

            const backendData: TestingPartData = {
              id: loadData.loadId,
              chamber: loadData.chamber,
              machineId: loadData.machineDetails?.machineId || "",
              machineDescription:
                loadData.machineDetails?.machineDescription || "",
              parts: loadData.parts || [],
              machineDetails: loadData.machineDetails || {},
              loadedAt: loadData.loadedAt,
              status: "checkpoint_completed",
              totalParts: loadData.totalParts,
              testUnit: loadData.parts[0]?.testUnit,
              testValue: loadData.duration,
              testStarted: true,
              testStatus: "checkpoint_completed",
              timerStatus: timerStates[`test_${currentTestIndex}`]?.isRunning
                ? "running"
                : "stopped",
              timerStartTime:
                timerStates[`test_${currentTestIndex}`]?.startTime,
              actualStartTime: loadData.loadedAt,
              isCompleted: false,
              lastUpdated: new Date().toISOString(),
              selectedTestId: loadData.machineDetails?.selectedTest?.id,
              selectedTestName: loadData.machineDetails?.selectedTest?.testName,
              isCombinedTest:
                loadData.machineDetails?.selectedTest?.isCombinedTest || false,
            };

            try {
              // PUT request to backend
              await updateTestingPartInBackend(loadData.loadId, backendData);
              console.log("Checkpoint completion synced to backend");
            } catch (error) {
              console.error(
                "Failed to sync checkpoint completion to backend:",
                error,
              );
              // Continue with local state even if backend fails
            }
          }

          const currentTestParts = getPartsForCurrentTest(formData);
          const uniqueSelectedPartNumbers = Array.from(
            new Set(
              (currentTestParts.length > 0
                ? currentTestParts.map((part) => part.partNumber)
                : formData.rows.map((row) => row.partNumber)
              ).filter(Boolean),
            ),
          );

          const startSecondRoundForParts = (targetPartNumbers: string[]) => {
            const uniquePartNumbers = Array.from(
              new Set(targetPartNumbers.filter(Boolean)),
            );

            if (uniquePartNumbers.length === 0) {
              console.warn(
                "No part numbers provided for second round transition.",
              );
              return;
            }

            // Store first round images before clearing
            const firstRoundImages: { [key: string]: any } = {};
            uniquePartNumbers.forEach((partNumber) => {
              // Get ALL rows for this part, not just first one
              const partRows = formData.rows.filter(
                (row) => row.partNumber === partNumber,
              );

              // Store images from all checkpoint rows
              firstRoundImages[partNumber] = {
                allCheckpointData: partRows.map((row) => ({
                  checkpointLabel: row.checkpointLabel,
                  checkpointStatus: row.checkpointStatus,
                  checkpointHours: row.checkpointHours,
                  cosmeticImages: row.cosmeticImages || [],
                  nonCosmeticImages: row.nonCosmeticImages || [],
                  croppedImages: row.croppedImages || [],
                  isT0: row.isT0,
                })),
              };
            });

            localStorage.setItem(
              "firstRoundImages",
              JSON.stringify(firstRoundImages),
            );

            const updatedForms = { ...forms };

            Object.keys(updatedForms).forEach((formKey) => {
              const form = updatedForms[formKey];

              // Filter to keep ALL rows for selected parts
              const filteredRows = form.rows.filter((row) =>
                uniquePartNumbers.includes(row.partNumber),
              );

              // Keep ALL checkpoint rows with their data
              const updatedRows = filteredRows.map((row, idx) => ({
                ...row,
                srNo: idx + 1,
                status: "Ready for Unload",
                // Preserve checkpoint data
                checkpointStatus: row.checkpointStatus,
                checkpointLabel: row.checkpointLabel,
                checkpointHours: row.checkpointHours,
                isCheckpointRow: row.isCheckpointRow,
                isT0: row.isT0,
                // Store pre-round data
                preCosmeticImages: row.cosmeticImages || [],
                preNonCosmeticImages: row.nonCosmeticImages || [],
                preCroppedImages: row.croppedImages || [],
                preStatus: row.checkpointStatus || "",
                // Clear current round data for new uploads
                cosmeticImage: "",
                cosmeticImages: [],
                nonCosmeticImage: "",
                nonCosmeticImages: [],
                croppedImage: "",
                croppedImages: [],
                regionLabel: "",
                finalCosmeticImage: "",
                finalCosmeticImages: [],
                finalNonCosmeticImage: "",
                finalCroppedNonCosmeticImage: "",
              }));

              updatedForms[formKey] = {
                ...form,
                rows: updatedRows,
              };
            });

            setForms(updatedForms);

            const updatedSharedImages: SharedImagesByPart = {};
            uniquePartNumbers.forEach((partNumber) => {
              updatedSharedImages[partNumber] = {
                cosmetic: [],
                nonCosmetic: [],
                childTestImages: {},
                finalCosmeticImages: [],
                finalNonCosmeticImages: [],
              };
            });
            setSharedImagesByPart(updatedSharedImages);

            setCroppedRegions([]);
            setVerifiedPartsForFinalUpload(new Set());

            console.log(
              "Moving to second round (Unload) with ALL checkpoint data for parts:",
              uniquePartNumbers,
            );

            setIsSecondRound(true);
            setCurrentStage(0);
            setCurrentTestIndex(0);
          };

          // Show results for ALL parts (Pass + Fail)
          let message = `Checkpoint Results for ${formData.testName}:\n\n`;
          message += `✓ Passed: ${passParts.length} part(s)\n`;
          message += `✗ Failed: ${failParts.length} part(s)\n\n`;

          if (passParts.length > 0) {
            message += `Passed parts:\n`;
            passParts.forEach((p) => {
              message += `  • ${p.partNumber}\n`;
            });
          }

          if (failParts.length > 0) {
            message += `\nFailed parts:\n`;
            failParts.forEach((p) => {
              message += `  • ${p.partNumber}\n`;
            });
          }

          message += `\nAll parts will proceed to Unload (Second Round) testing.\n`;

          alert(message);

          // Send ALL parts to second round, not just failed ones
          startSecondRoundForParts(uniqueSelectedPartNumbers);
        } else {
          // No checkpoint column - allow submission without checkpoint validation
          console.log("No checkpoint column detected, allowing submission");
          alert("Tests completed successfully!");

          // PUT TO BACKEND: Mark as completed without checkpoints
          if (currentRecord?.machineLoadData) {
            const loadData = currentRecord.machineLoadData;

            const noCheckpointData: Partial<TestingPartData> = {
              status: "completed",
              testStatus: "completed_no_checkpoint",
              isCompleted: true,
              completedAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            };

            try {
              await updateTestingPartInBackend(
                loadData.loadId,
                noCheckpointData,
              );
              console.log(
                "Test completion without checkpoints synced to backend",
              );
            } catch (error) {
              console.error(
                "Failed to sync test completion to backend:",
                error,
              );
            }
          }

          navigate("/planning-detail");
          return;
        }
      }
    } else {
      // Second round completion - POST request for final submission
      alert(
        "Second round (Unload) tests completed! Final data has been submitted.",
      );

      // POST TO BACKEND: Final completion
      try {
        if (currentRecord?.machineLoadData) {
          const loadData = currentRecord.machineLoadData;

          const finalData: TestingPartData = {
            id: loadData.loadId,
            chamber: loadData.chamber,
            machineId: loadData.machineDetails?.machineId || "",
            machineDescription:
              loadData.machineDetails?.machineDescription || "",
            parts: loadData.parts || [],
            machineDetails: loadData.machineDetails || {},
            loadedAt: loadData.loadedAt,
            status: "completed",
            totalParts: loadData.totalParts,
            testUnit: loadData.parts[0]?.testUnit,
            testValue: loadData.duration,
            testStarted: true,
            testStatus: "completed",
            timerStatus: "stopped",
            timerStartTime: timerStates[`test_${currentTestIndex}`]?.startTime,
            actualStartTime: loadData.loadedAt,
            isCompleted: true,
            completedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            selectedTestId: loadData.machineDetails?.selectedTest?.id,
            selectedTestName: loadData.machineDetails?.selectedTest?.testName,
            isCombinedTest:
              loadData.machineDetails?.selectedTest?.isCombinedTest || false,
          };

          // POST to backend for final completion
          try {
            await saveTestingPartToBackend(finalData);
            console.log("Final test completion synced to backend");
          } catch (error) {
            console.error("Failed to sync final completion to backend:", error);
          }
        }
      } catch (error) {
        console.error("Error preparing final data for backend:", error);
      }

      // Save final data to localStorage as fallback
      try {
        const testingLoadDataStr = localStorage.getItem("testingLoadData");

        if (testingLoadDataStr) {
          const testingLoadData = JSON.parse(testingLoadDataStr);

          const updatedTestRecords = testingLoadData.testRecords.map(
            (record: any) => {
              const formData = Object.values(forms).find(
                (form: any) =>
                  form.partNumber === record.partNumber &&
                  form.serialNumber === record.serialNumber,
              );

              if (formData) {
                return {
                  ...record,
                  ...formData,
                  status: "Second Round Completed",
                };
              }

              return record;
            },
          );

          testingLoadData.testRecords = updatedTestRecords;
          testingLoadData.status = "Completed";
          testingLoadData.completedAt = new Date().toISOString();

          localStorage.setItem(
            "testingLoadData",
            JSON.stringify(testingLoadData),
          );
        }
      } catch (error) {
        console.error("Error saving second round data to localStorage:", error);
      }

      // Navigate back to planning
      navigate("/planning-detail");
    }
  };

  const renderScanModal = () => {
    if (!scanState.showScanModal) return null;

    const isCheckpointMode = scanState.isScanningForCheckpoint;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-white sticky top-0">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {isCheckpointMode
                  ? `Scan Parts for Checkpoint`
                  : "Scan Parts for Unload"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isCheckpointMode
                  ? `Scan eligible parts for checkpoint - images will be uploaded in the table`
                  : "Verify parts before uploading final images"}
              </p>
              {isCheckpointMode && scanState.eligibleParts && (
                <p className="text-xs text-blue-600 mt-2">
                  {scanState.eligibleParts.length} eligible part(s) can progress
                  to next checkpoint
                </p>
              )}
            </div>
            <button
              onClick={() =>
                setScanState((prev) => ({ ...prev, showScanModal: false }))
              }
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {/* Show eligible parts list */}
            {isCheckpointMode &&
              scanState.eligibleParts &&
              scanState.eligibleParts.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    Eligible Parts ({scanState.eligibleParts.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {scanState.eligibleParts.map((pn) => {
                      const isScanned = scanState.scannedParts.some(
                        (sp) => sp.partNumber === pn,
                      );
                      return (
                        <span
                          key={pn}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isScanned
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {pn}
                          {isScanned && " ✓"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Part Scan Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan Part Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanState.partInput}
                  onChange={(e) =>
                    setScanState((prev) => ({
                      ...prev,
                      partInput: e.target.value,
                    }))
                  }
                  onKeyPress={(e) => e.key === "Enter" && handlePartScan()}
                  placeholder="Enter part number (e.g., PART-001)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handlePartScan}
                  disabled={scanState.isScanning || !scanState.partInput.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {scanState.isScanning ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Scan size={20} />
                      <span>Scan</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-start text-sm text-gray-500 mt-2">
                {isCheckpointMode
                  ? `Scan parts from the eligible list above - upload images in the table after confirmation`
                  : "Enter part number to verify for Unload testing"}
              </p>
            </div>

            {/* Scanned Parts List */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Scanned Parts ({scanState.scannedParts.length}
                {isCheckpointMode && scanState.eligibleParts
                  ? ` / ${scanState.eligibleParts.length}`
                  : ""}
                )
              </h4>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {scanState.scannedParts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No parts scanned yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {scanState.scannedParts.map((part) => (
                      <div key={part.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-gray-800 text-lg">
                                {part.partNumber}
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  part.scanStatus === "CHECKPOINT_SCAN"
                                    ? "bg-purple-100 text-purple-800"
                                    : part.scanStatus === "OK" ||
                                        part.scanStatus === "SECOND_ROUND_OK"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {part.scanStatus === "CHECKPOINT_SCAN"
                                  ? "Checkpoint"
                                  : part.scanStatus === "SECOND_ROUND_OK"
                                    ? "Verified for Unload"
                                    : part.scanStatus}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-2 space-y-1">
                              <div>
                                Serial: {part.serialNumber} • Ticket:{" "}
                                {part.ticketCode}
                              </div>
                              <div>
                                Project: {part.project} | Build: {part.build} |
                                Colour: {part.colour}
                              </div>
                              <div className="text-gray-400 text-xs">
                                Scanned: {part.scannedAt}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveScannedPart(part.id)}
                            className="text-red-500 hover:text-red-700 transition-colors ml-4"
                            title="Remove part"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        {isCheckpointMode && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                              ✓ Part scanned successfully. Upload images in the
                              table after confirmation.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setScanState((prev) => ({
                    ...prev,
                    showScanModal: false,
                    scannedParts: [],
                    partInput: "",
                    isScanningForCheckpoint: false,
                    checkpointHour: 0,
                    checkpointImages: {},
                    eligibleParts: [],
                  }))
                }
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScannedParts}
                disabled={scanState.scannedParts.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckpointMode
                  ? `Confirm & Add Checkpoint Rows (${scanState.scannedParts.length})`
                  : `Confirm Scanned Parts (${scanState.scannedParts.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const shouldShowCheckpointButton = (row: any, partNumber: string) => {
    // Logic to determine if checkpoint button should be shown
    // For now, return true if the part is passed (which is filtered in the caller)
    return true;
  };

  const handleCheckpointClick = (parts: string | string[]) => {
    const normalizedParts = Array.isArray(parts)
      ? Array.from(new Set(parts.filter(Boolean)))
      : parts
        ? [parts]
        : [];

    if (normalizedParts.length === 0) {
      alert("No parts selected for checkpoint progression.");
      return;
    }

    try {
      const chamberLoads = JSON.parse(
        localStorage.getItem("chamberLoads") || "[]",
      );
      let needsUpdate = false;

      normalizedParts.forEach((pn) => {
        for (let i = 0; i < chamberLoads.length; i++) {
          const load = chamberLoads[i];
          const partIndex = load.parts?.findIndex(
            (p: any) => p.partNumber === pn,
          );

          if (partIndex >= 0) {
            const part = load.parts[partIndex];

            if (
              !part.checkpointInfo?.checkpoints ||
              part.checkpointInfo.checkpoints.length === 0
            ) {
              const checkpoints = resolveCheckpointsForPart(pn);

              if (checkpoints.length > 0) {
                chamberLoads[i].parts[partIndex] = {
                  ...part,
                  checkpointInfo: {
                    checkpoints,
                    currentCheckpointIndex: 0,
                    totalCheckpoints: checkpoints.length,
                    lastCheckpointTime: new Date().toISOString(),
                    checkpointHistory: [],
                  },
                  allCheckpoints: checkpoints,
                  totalCheckpoints: checkpoints.length,
                };
                needsUpdate = true;
              }
            }
          }
        }
      });

      if (needsUpdate) {
        localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));
      }
    } catch (error) {
      console.error("Error preparing checkpoint data:", error);
    }

    setSelectedPartsForCheckpoint(normalizedParts);
    setShowCheckpointConfirmDialog(true);
  };

  // Helper function to get next checkpoint hour
  const getNextCheckpointHour = (partNumber: string): number | null => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (!chamberLoadsStr) return null;

      const chamberLoads = JSON.parse(chamberLoadsStr);

      for (const load of chamberLoads) {
        if (load.parts && Array.isArray(load.parts)) {
          const part = load.parts.find((p: any) => p.partNumber === partNumber);

          if (part) {
            // Get checkpoints
            let checkpoints = [];
            if (part.checkpointInfo && part.checkpointInfo.checkpoints) {
              checkpoints = part.checkpointInfo.checkpoints;
            } else if (part.checkpoints) {
              checkpoints = part.checkpoints;
            }

            // Filter out T0
            const validCheckpoints = checkpoints.filter(
              (cp: string) => !cp.toLowerCase().includes("t0"),
            );

            // Get current index
            let currentIndex = 0;
            if (
              part.checkpointInfo &&
              typeof part.checkpointInfo.checkpointIndex === "number"
            ) {
              currentIndex = part.checkpointInfo.checkpointIndex;
            } else if (typeof part.checkpointIndex === "number") {
              currentIndex = part.checkpointIndex;
            }

            if (currentIndex < validCheckpoints.length) {
              // Extract hour number from checkpoint string
              const checkpointStr = validCheckpoints[currentIndex];
              const match = checkpointStr.match(/\d+/);
              return match ? parseInt(match[0]) : null;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting next checkpoint hour:", error);
      return null;
    }
  };

  // Helper function to get checkpoint progress
  const getCheckpointProgress = (
    partNumber: string,
  ): { completed: number; total: number } => {
    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (chamberLoadsStr) {
        const chamberLoads = JSON.parse(chamberLoadsStr);

        for (const load of chamberLoads) {
          if (load.parts && Array.isArray(load.parts)) {
            const part = load.parts.find(
              (p: any) => p.partNumber === partNumber,
            );

            if (part) {
              let checkpoints: string[] = [];
              if (
                part.checkpointInfo &&
                Array.isArray(part.checkpointInfo.checkpoints)
              ) {
                checkpoints = part.checkpointInfo.checkpoints;
              } else if (Array.isArray(part.checkpoints)) {
                checkpoints = part.checkpoints;
              }

              if (!checkpoints.length) {
                checkpoints = getCheckpointsForPart(partNumber);
              }

              const total = checkpoints.length;

              let currentIndex = 0;
              if (
                part.checkpointInfo &&
                typeof part.checkpointInfo.currentCheckpointIndex === "number"
              ) {
                currentIndex = part.checkpointInfo.currentCheckpointIndex;
              } else if (
                part.checkpointInfo &&
                typeof part.checkpointInfo.checkpointIndex === "number"
              ) {
                currentIndex = part.checkpointInfo.checkpointIndex;
              } else if (typeof part.checkpointIndex === "number") {
                currentIndex = part.checkpointIndex;
              }

              const completed = total > 0 ? Math.min(currentIndex, total) : 0;

              if (total > 0) {
                return { completed, total };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting checkpoint progress:", error);
    }

    // Fallback to form state when chamberLoads info is unavailable
    const formKey = `test_${currentTestIndex}`;
    const currentFormData = forms[formKey];
    if (currentFormData) {
      const checkpointRows = currentFormData.rows.filter(
        (row) =>
          row.partNumber === partNumber && row.isCheckpointRow && !row.isT0,
      );
      const total = checkpointRows.length;
      if (total > 0) {
        const completed = checkpointRows.filter(
          (row) =>
            row.checkpointStatus === "Pass" || row.checkpointStatus === "Fail",
        ).length;
        return { completed, total };
      }
    }

    return { completed: 0, total: 0 };
  };

  // Add this function after the other helper functions (around line 600)
  const shouldAutoEnableCheckpoint = (testCondition: string): boolean => {
    if (!testCondition) return false;

    const lowerCondition = testCondition.toLowerCase();

    // Check if test condition contains any of these units
    const autoEnableUnits = ["drops", "grams", "orientations", "cycle"];

    return autoEnableUnits.some((unit) => lowerCondition.includes(unit));
  };

  // const stages = [
  //   { id: 0, name: "Image Upload" },
  //   { id: 1, name: "Test Forms" },
  // ];

  // Replace the static stages array with this dynamic one
  const stages = React.useMemo(() => {
    const baseStages = [{ id: 0, name: "Image Upload" }];

    if (currentRecord?.testRecords) {
      currentRecord.testRecords.forEach((testRecord, index) => {
        baseStages.push({
          id: index + 1,
          name: testRecord.testName,
        });
      });
    }

    return baseStages;
  }, [currentRecord]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      {/* Progress Bar with Back Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center">
            {/* Back Button on left with gap */}
            <div className="pr-10 border-r border-gray-300 mr-6">
              <button
                onClick={() => navigate("/planning-detail")}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
              >
                <ArrowLeft size={18} />
                <span className="font-medium">Back</span>
              </button>
            </div>

            {/* Progress Stages with proper alignment */}
            <div className="flex items-center flex-1">
              {stages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => setCurrentStage(index)}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                        currentStage === index
                          ? "bg-blue-600 text-white"
                          : currentStage > index
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {currentStage > index ? (
                        <CheckCircle size={18} />
                      ) : (
                        <span className="text-sm font-semibold">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        currentStage === index
                          ? "text-blue-600"
                          : "text-gray-600"
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <div
                      className={`h-1 w-16 mx-4 transition-colors ${
                        currentStage > index ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-9xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg m-4">
          {currentStage === 0 && renderImageUploadStage()}
          {currentStage === 1 && renderFormStage()}

          {currentStage === 1 && (
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setCurrentStage(0)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center font-semibold transition-colors"
              >
                <ChevronLeft size={20} className="mr-2" />
                Back to Image Upload
              </button>

              {currentTestIndex < currentRecord!.testRecords.length - 1 ? (
                <button
                  onClick={() => {
                    saveFormData();
                    setCurrentTestIndex((prev) => prev + 1);
                    setCurrentStage(0);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold transition-colors"
                >
                  Next Test Form
                  <ChevronRight size={20} className="ml-2" />
                </button>
              ) : (
                <div className="flex gap-3">
                  {/* Checkpoint Button - Only show in FIRST ROUND, hide in second round (Unload) */}
                  {!isSecondRound &&
                    (() => {
                      const formKey = `test_${currentTestIndex}`;
                      const currentFormData = forms[formKey];

                      if (!currentFormData) return null;

                      // Get all unique parts from the form
                      const allParts = Array.from(
                        new Set(
                          currentFormData.rows.map((row) => row.partNumber),
                        ),
                      );

                      let chamberLoads: any[] = [];
                      try {
                        chamberLoads = JSON.parse(
                          localStorage.getItem("chamberLoads") || "[]",
                        );
                      } catch (error) {
                        console.error(
                          "Error parsing chamberLoads for checkpoint button:",
                          error,
                        );
                      }

                      const findCurrentCheckpointStatus = (
                        partNumber: string,
                        checkpointIndex?: number,
                        checkpointLabel?: string,
                      ): "Pass" | "Fail" | undefined => {
                        const relevantRows = currentFormData.rows.filter(
                          (row) =>
                            row.partNumber === partNumber &&
                            row.isCheckpointRow &&
                            !row.isT0,
                        );

                        if (relevantRows.length === 0) {
                          return undefined;
                        }

                        if (typeof checkpointIndex === "number") {
                          const indexMatch = relevantRows.find((row) =>
                            typeof row.checkpointHours === "number"
                              ? row.checkpointHours === checkpointIndex
                              : false,
                          );

                          if (
                            indexMatch &&
                            (indexMatch.checkpointStatus === "Pass" ||
                              indexMatch.checkpointStatus === "Fail")
                          ) {
                            return indexMatch.checkpointStatus;
                          }
                        }

                        if (checkpointLabel) {
                          const normalizedLabel = checkpointLabel
                            .trim()
                            .toLowerCase();
                          const labelMatch = relevantRows.find(
                            (row) =>
                              (row.checkpointLabel || "")
                                .trim()
                                .toLowerCase() === normalizedLabel,
                          );

                          if (
                            labelMatch &&
                            (labelMatch.checkpointStatus === "Pass" ||
                              labelMatch.checkpointStatus === "Fail")
                          ) {
                            return labelMatch.checkpointStatus;
                          }
                        }

                        const latestWithStatus = [...relevantRows]
                          .reverse()
                          .find(
                            (row) =>
                              row.checkpointStatus === "Pass" ||
                              row.checkpointStatus === "Fail",
                          );

                        return latestWithStatus?.checkpointStatus as
                          | "Pass"
                          | "Fail"
                          | undefined;
                      };

                      const partsNeedingCheckpointDetails = allParts.reduce(
                        (
                          acc: Array<{
                            partNumber: string;
                            status?: "Pass" | "Fail";
                            isPreTest: boolean;
                          }>,
                          partNumber,
                        ) => {
                          let shouldInclude = false;
                          let currentStatus: "Pass" | "Fail" | undefined;
                          let isPreTest = false;

                          try {
                            for (const load of chamberLoads) {
                              const part = load.parts?.find(
                                (p: any) => p.partNumber === partNumber,
                              );

                              if (!part) {
                                continue;
                              }

                              const testUnit = part.testUnit || load.testUnit;
                              const normalizedUnit = testUnit
                                ?.toLowerCase()
                                .trim();

                              if (
                                [
                                  "drops",
                                  "grams",
                                  "orientation",
                                  "cycle",
                                ].includes(normalizedUnit)
                              ) {
                                if (!part.checkpointInfo) {
                                  shouldInclude = true;
                                  break;
                                }

                                const { checkpoints, currentCheckpointIndex } =
                                  part.checkpointInfo;

                                const currentCheckpointLabel =
                                  checkpoints[currentCheckpointIndex];

                                const normalizedLabel = (
                                  currentCheckpointLabel || ""
                                )
                                  .toString()
                                  .trim()
                                  .toLowerCase();
                                isPreTest =
                                  currentCheckpointIndex === 0 ||
                                  normalizedLabel === "t0" ||
                                  normalizedLabel === "0";

                                if (
                                  currentCheckpointIndex < checkpoints.length
                                ) {
                                  shouldInclude = true;
                                  currentStatus = findCurrentCheckpointStatus(
                                    partNumber,
                                    currentCheckpointIndex,
                                    checkpoints[currentCheckpointIndex],
                                  );
                                }

                                break;
                              }

                              if (part.checkpointInfo) {
                                const { checkpoints, currentCheckpointIndex } =
                                  part.checkpointInfo;

                                const currentCheckpointLabel =
                                  checkpoints[currentCheckpointIndex];
                                const normalizedLabel = (
                                  currentCheckpointLabel || ""
                                )
                                  .toString()
                                  .trim()
                                  .toLowerCase();
                                isPreTest =
                                  currentCheckpointIndex === 0 ||
                                  normalizedLabel === "t0" ||
                                  normalizedLabel === "0";

                                if (
                                  currentCheckpointIndex < checkpoints.length
                                ) {
                                  shouldInclude = true;
                                  currentStatus = findCurrentCheckpointStatus(
                                    partNumber,
                                    currentCheckpointIndex,
                                    checkpoints[currentCheckpointIndex],
                                  );
                                }
                              } else {
                                const testCondition =
                                  getTestConditionForPart(partNumber);
                                if (testCondition) {
                                  const checkpoints =
                                    parseCheckpointsFromCondition(
                                      testCondition,
                                    );
                                  if (checkpoints.length > 0) {
                                    shouldInclude = true;
                                    isPreTest = true;
                                  }
                                }
                              }

                              break;
                            }
                          } catch (error) {
                            console.error(
                              "Error evaluating checkpoint requirements:",
                              error,
                            );
                          }

                          if (shouldInclude) {
                            acc.push({
                              partNumber,
                              status: currentStatus,
                              isPreTest,
                            });
                          }

                          return acc;
                        },
                        [] as Array<{
                          partNumber: string;
                          status?: "Pass" | "Fail";
                          isPreTest: boolean;
                        }>,
                      );

                      const partsNeedingCheckpoint =
                        partsNeedingCheckpointDetails.map(
                          (detail) => detail.partNumber,
                        );

                      const statusSelections = partsNeedingCheckpointDetails
                        .map((detail) => detail.status)
                        .filter(
                          (status): status is "Pass" | "Fail" =>
                            status === "Pass" || status === "Fail",
                        );

                      const hasAnyPassStatus =
                        statusSelections.includes("Pass");
                      const anyStatusSelected = statusSelections.length > 0;
                      const allFailStatus =
                        anyStatusSelected &&
                        statusSelections.every((status) => status === "Fail");
                      const hasNonPreTestPart =
                        partsNeedingCheckpointDetails.some(
                          (detail) => !detail.isPreTest,
                        );
                      const anyPreTestPart = partsNeedingCheckpointDetails.some(
                        (detail) => detail.isPreTest,
                      );

                      const canProgress = hasNonPreTestPart
                        ? anyStatusSelected && hasAnyPassStatus
                        : anyPreTestPart;

                      const isProgressDisabled = !canProgress;

                      console.log(
                        "Parts needing checkpoint:",
                        partsNeedingCheckpoint,
                      );

                      if (partsNeedingCheckpoint.length > 0) {
                        return (
                          <button
                            onClick={() => {
                              handleCheckpointClick(partsNeedingCheckpoint);
                            }}
                            disabled={isProgressDisabled}
                            className={`px-6 py-3 rounded-lg flex items-center font-semibold transition-colors ${
                              isProgressDisabled
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-purple-600 text-white hover:bg-purple-700"
                            }`}
                            title={
                              !canProgress &&
                              !anyStatusSelected &&
                              anyPreTestPart
                                ? "Pre-test checkpoints can progress without status selection"
                                : !anyStatusSelected
                                  ? "Select checkpoint status before progressing"
                                  : allFailStatus
                                    ? "Cannot progress when all parts failed the current checkpoint"
                                    : canProgress
                                      ? "Progress eligible parts to the next checkpoint"
                                      : "Select 'Pass' for at least one part to progress"
                            }
                          >
                            <Clock size={20} className="mr-2" />
                            Progress Checkpoint ({
                              partsNeedingCheckpoint.length
                            }{" "}
                            part{partsNeedingCheckpoint.length > 1 ? "s" : ""})
                          </button>
                        );
                      }

                      return null;
                    })()}

                  {/* Complete All Tests Button */}
                  {(() => {
                    const formKey = `test_${currentTestIndex}`;
                    const currentFormData = forms[formKey];

                    if (!currentFormData) return null;

                    // Get all unique parts
                    const allParts = Array.from(
                      new Set(
                        currentFormData.rows.map((row) => row.partNumber),
                      ),
                    );

                    console.log("All parts:", allParts);

                    // Get all checkpoint rows (including T0)
                    const allCheckpointRows = currentFormData.rows.filter(
                      (row) =>
                        row.isCheckpointRow &&
                        row.checkpointLabel &&
                        row.checkpointLabel.trim() !== "",
                    );

                    console.log(
                      "All checkpoint rows count:",
                      allCheckpointRows.length,
                    );

                    // If NO checkpoint rows at all, always enable the button
                    if (allCheckpointRows.length === 0) {
                      return (
                        <button
                          onClick={handleSubmit}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold transition-colors"
                        >
                          <CheckCircle size={20} className="mr-2" />
                          {isSecondRound
                            ? "Submit Final Data"
                            : "Complete All Tests"}
                        </button>
                      );
                    }

                    // Track parts and their status
                    const partsWithStatus: {
                      partNumber: string;
                      hasAllStatus: boolean;
                      allFailed: boolean;
                      hasAnyPass: boolean;
                      hasAnyFail: boolean; // NEW: Track if any checkpoint failed
                      canComplete: boolean; // NEW: Can this part complete testing?
                      totalCheckpoints: number;
                      checkpoints: Array<{ label: string; status: string }>;
                    }[] = [];

                    // Analyze each part
                    allParts.forEach((partNumber) => {
                      const partCheckpointRows = allCheckpointRows.filter(
                        (row) => row.partNumber === partNumber,
                      );

                      const totalCheckpoints = partCheckpointRows.length;

                      if (totalCheckpoints === 0) {
                        // Part has no checkpoints, so it's considered "completed"
                        partsWithStatus.push({
                          partNumber,
                          hasAllStatus: true,
                          allFailed: false,
                          hasAnyPass: false,
                          hasAnyFail: false,
                          canComplete: true,
                          totalCheckpoints: 0,
                          checkpoints: [],
                        });
                        return;
                      }

                      // Check if ANY checkpoint has "Fail" status
                      const hasAnyFail = partCheckpointRows.some(
                        (row) => row.checkpointStatus === "Fail",
                      );

                      // Check if ALL checkpoints have status (Pass or Fail)
                      const hasAllStatus = partCheckpointRows.every(
                        (row) =>
                          row.checkpointStatus === "Pass" ||
                          row.checkpointStatus === "Fail",
                      );

                      // **KEY LOGIC: If part has any Fail, it's complete regardless of other checkpoints**
                      const canCompletePart = hasAnyFail || hasAllStatus;

                      // Check if ALL checkpoints are "Fail"
                      const allFailed =
                        hasAllStatus &&
                        partCheckpointRows.every(
                          (row) => row.checkpointStatus === "Fail",
                        );

                      // Check if ANY checkpoint is "Pass"
                      const hasAnyPass = partCheckpointRows.some(
                        (row) => row.checkpointStatus === "Pass",
                      );

                      partsWithStatus.push({
                        partNumber,
                        hasAllStatus: hasAnyFail ? true : hasAllStatus, // If any fail, consider all statuses complete
                        allFailed,
                        hasAnyPass,
                        hasAnyFail,
                        canComplete: canCompletePart,
                        totalCheckpoints,
                        checkpoints: partCheckpointRows.map((row) => ({
                          label: row.checkpointLabel,
                          status: row.checkpointStatus,
                        })),
                      });

                      // Log for debugging
                      console.log(`Part ${partNumber}:`, {
                        totalCheckpoints,
                        hasAnyFail,
                        hasAllStatus,
                        canCompletePart,
                        allFailed,
                        hasAnyPass,
                        checkpoints: partCheckpointRows.map(
                          (r) => `${r.checkpointLabel}: ${r.checkpointStatus}`,
                        ),
                      });
                    });

                    // Check overall status
                    const allPartsCanComplete = partsWithStatus.every(
                      (p) => p.canComplete,
                    );
                    const anyPartHasFail = partsWithStatus.some(
                      (p) => p.hasAnyFail,
                    );
                    const allPartsFailed = partsWithStatus.every(
                      (p) => p.allFailed || p.totalCheckpoints === 0,
                    );
                    const allPartsPassed = partsWithStatus.every(
                      (p) => p.hasAnyPass || p.totalCheckpoints === 0,
                    );
                    const hasMixedResults =
                      partsWithStatus.some((p) => p.hasAnyPass) &&
                      partsWithStatus.some((p) => p.hasAnyFail);

                    // Count parts with each status
                    const partsWithPass = partsWithStatus.filter(
                      (p) => p.hasAnyPass,
                    ).length;
                    const partsWithFail = partsWithStatus.filter(
                      (p) => p.hasAnyFail,
                    ).length;
                    const partsNoCheckpoints = partsWithStatus.filter(
                      (p) => p.totalCheckpoints === 0,
                    ).length;

                    console.log("Analysis results:", {
                      allPartsCanComplete,
                      anyPartHasFail,
                      allPartsFailed,
                      allPartsPassed,
                      hasMixedResults,
                      partsWithPass,
                      partsWithFail,
                      partsNoCheckpoints,
                    });

                    // **KEY LOGIC: Enable button when ALL parts can complete**
                    // A part can complete if:
                    // 1. Any checkpoint has "Fail" status, OR
                    // 2. All checkpoints have status (Pass or Fail)
                    const canComplete = allPartsCanComplete;

                    // Determine button message and styling
                    let buttonMessage = "Complete All Tests";
                    let titleMessage = "Complete All Tests";
                    let buttonColor: "green" | "yellow" | "red" | "gray" =
                      "green";

                    if (isSecondRound) {
                      buttonMessage = "Submit Final Data";
                      titleMessage = "Submit Final Data";
                    } else if (!canComplete) {
                      // Button disabled - some parts have incomplete checkpoints without any Fail
                      const incompleteParts = partsWithStatus.filter(
                        (p) => !p.canComplete,
                      );
                      titleMessage = `${incompleteParts.length} part(s) have incomplete checkpoint evaluations`;
                    } else if (anyPartHasFail) {
                      // **SPECIAL CASE: At least one part has a failed checkpoint**
                      if (allPartsFailed) {
                        // All parts have all checkpoints failed
                        buttonMessage = `Complete All Tests (${partsWithFail} Failed) ✗`;
                        titleMessage = `All ${partsWithFail} part(s) failed all checkpoints`;
                        buttonColor = "red";
                      } else if (hasMixedResults) {
                        // Mixed results: some parts passed, some failed
                        buttonMessage = `Complete All Tests (${partsWithPass} Passed, ${partsWithFail} Failed)`;
                        titleMessage = `${partsWithPass} part(s) passed, ${partsWithFail} part(s) failed`;
                        buttonColor = "yellow";
                      } else {
                        // Some parts failed, but not all
                        buttonMessage = `Complete All Tests (${partsWithFail} Failed) ✗`;
                        titleMessage = `${partsWithFail} part(s) failed checkpoint(s)`;
                        buttonColor = "red";
                      }
                    } else if (allPartsPassed) {
                      // All parts passed all checkpoints
                      buttonMessage = `Complete All Tests (${partsWithPass} Passed) ✓`;
                      titleMessage = `All ${partsWithPass} part(s) passed all checkpoints`;
                      buttonColor = "green";
                    }

                    const buttonStyles = {
                      green: "bg-green-600 text-white hover:bg-green-700",
                      yellow: "bg-yellow-600 text-white hover:bg-yellow-700",
                      red: "bg-red-600 text-white hover:bg-red-700",
                      gray: "bg-gray-300 text-gray-500 cursor-not-allowed",
                    };

                    return (
                      <button
                        onClick={handleSubmit}
                        disabled={!canComplete}
                        className={`px-6 py-3 rounded-lg flex items-center font-semibold transition-colors ${
                          canComplete
                            ? buttonStyles[buttonColor]
                            : buttonStyles.gray
                        }`}
                        title={titleMessage}
                      >
                        <CheckCircle size={20} className="mr-2" />
                        {buttonMessage}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scan Modal */}
      {renderScanModal()}

      {/* Checkpoint Confirmation Dialog */}
      {renderCheckpointConfirmDialog()}
    </div>
  );
}
