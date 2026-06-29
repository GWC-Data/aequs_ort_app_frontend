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
  apiService,
} from "@/lib/backendApi";
import PartScanner from "./PartScanner";
import {
  fetchAllScannedParts,
  findPartInScannedParts,
  ScannedPart,
} from "@/lib/backendApi";
import { toast } from "@/components/ui/use-toast";

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

  // Config-based test options filtered by equipment ID
  const [configTestOptions, setConfigTestOptions] = useState<string[]>([]);

  // Cache: processStage -> PRODUCT_CODE ("W" | "B")
  const [productCodeCache, setProductCodeCache] = useState<Record<string, string>>({});

  // Test configuration
  const [testStarted, setTestStarted] = useState<boolean>(false);
  const [isAutoStart, setIsAutoStart] = useState<boolean>(false);
  const [testValue, setTestValue] = useState<number | null>(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalData, setConfirmationModalData] = useState<{
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [showMultiTicketModal, setShowMultiTicketModal] = useState(false);
  const [multiTicketData, setMultiTicketData] = useState<{
    currentTicket: string;
    newTicket: string;
    testName: string;
    availableTickets: string[];
    onConfirm: () => void;
  } | null>(null);

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

    // STEP 2: Allow mixing tickets - commented out ticket consistency check
    // Removed restriction to allow loading parts from different tickets in the same session

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
              const requiredQty = toNumber(child.requiredQty);
              // Use requiredQty as fallback when remainingParts is not set
              const remainingParts =
                child.remainingParts != null
                  ? toNumber(child.remainingParts)
                  : requiredQty;
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

          const parentRequired = toNumber(parentTest.requiredQty);
          // Use requiredQty as fallback when remainingParts is not set
          const parentRemaining =
            parentTest.remainingParts != null
              ? toNumber(parentTest.remainingParts)
              : parentRequired;
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

      // Second pass: merge children of combined tests (e.g. "THC + UTM") into matching
      // standalone entries (e.g. "THC") by name-prefix + machine-equipment matching.
      allocationSource.forEach((allocation) => {
        const ticketCode = allocation.ticketCode;
        (allocation.testAllocations || []).forEach((parentTest) => {
          const children = parentTest.childTests || [];
          if (children.length === 0) return;

          const parentName = (parentTest.testName || "").toLowerCase().trim();

          children.forEach((child) => {
            const childEquipment = (child.machineEquipment || "").toLowerCase().trim();
            if (!childEquipment) return;

            for (const [, entry] of aggregatedTestsMap) {
              if (entry.isChildTest) continue;

              const entryName = entry.testName.toLowerCase().trim();
              // Combined test must start with standalone test name (e.g. "THC + UTM" starts with "THC")
              if (
                !parentName.startsWith(entryName + " +") &&
                !parentName.startsWith(entryName + "+")
              )
                continue;

              // Machine equipment must match
              const entryEquipments = entry.equipmentList.map((e) =>
                e.toLowerCase().trim(),
              );
              if (!entryEquipments.includes(childEquipment)) continue;

              // Don't add duplicates
              if (
                entry.allocations.some(
                  (a) => a.ticketCode === ticketCode && a.testId === child.id,
                )
              )
                continue;

              const remaining =
                child.remainingParts != null
                  ? toNumber(child.remainingParts)
                  : toNumber(child.requiredQty);
              const reqQty = toNumber(child.requiredQty);

              if (!entry.allocations.some((a) => a.ticketCode === ticketCode)) {
                entry.ticketCount += 1;
              }
              entry.totalAvailable += remaining;
              entry.totalRequired += reqQty;
              entry.allocations.push({
                testId: child.id,
                ticketCode,
                allocationId: allocation.id,
                isChild: true,
                parentTestId: parentTest.id,
                remainingParts: remaining,
                requiredQty: reqQty,
                originalTest: child,
              });
              break; // merge into the first matching standalone entry only
            }
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

          // let enhancedDisplayName = `${test.displayName} (${totalAvailable}/${totalRequired})`;
          let enhancedDisplayName = `${test.displayName} (${totalAvailable})`;

          if (test.ticketCount > 1) {
            enhancedDisplayName += ` [${test.ticketCount} tickets]`;
          }

          if (test.isChildTest) {
            enhancedDisplayName = `↳ ${enhancedDisplayName}`;
          } else if (test.unit === "Hours") {
            enhancedDisplayName = `${enhancedDisplayName}`;
          } else if (test.unit === "Cycle") {
            enhancedDisplayName = `${enhancedDisplayName}`;
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

  // Load test options from Database based on selected equipment ID
  const loadConfigTestOptions = async (machineId: string) => {
    try {


      const dbMachines = await apiService.getMachineDetails();
      const testNames = new Set<string>();

      dbMachines.forEach((item) => {
        if (String(item.machineId || "").trim() === machineId) {
          const testNameCell = String(item.testName || "").trim();
          if (testNameCell) {
            testNameCell.split(",").forEach((name) => {
              const trimmed = name.trim();
              if (trimmed) testNames.add(trimmed);
            });
          }
        }
      });

      setConfigTestOptions(Array.from(testNames));
    } catch (error) {
      console.error("Error loading Database test options:", error);
      setConfigTestOptions([]);
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
      setConfigTestOptions([]);
      setProductCodeCache({});
    }
  }, [isOpen]);

  // Load available tests from allocations
  useEffect(() => {
    if (isOpen) {
      const tests = createAggregatedTestOptions();
      setAvailableTests(tests);
      console.log("All available tests:", tests);
    }
  }, [isOpen, selectedChamber, machine, allocationRecords]);

  // Load configured test options when modal opens or selected chamber changes
  useEffect(() => {
    if (isOpen && selectedChamber) {
      // Find the machine_id for the selected chamber
      const foundMachine = data.find(
        (m) =>
          m.machine_id === selectedChamber ||
          m.machine_description === selectedChamber
      );
      const machineId = foundMachine?.machine_id || selectedChamber;
      loadConfigTestOptions(machineId);
    }
  }, [isOpen, selectedChamber, data]);

  // Load PRODUCT_CODE mapping (SOURCE_ANO_TYPE -> PRODUCT_CODE) from OQC configurations
  const loadProductCodeFromConfig = async (): Promise<Record<string, string>> => {
    try {


      const dbOqcs = await apiService.getOqcForms();
      const map: Record<string, string> = {};

      dbOqcs.forEach((item) => {
        const src = String(item.assemblyAnoOptions || item.sourceOpt || "").trim();
        const code = String(item.productCode || "").trim().toUpperCase();
        if (src && code) map[src] = code;
      });

      return map;
    } catch {
      return {};
    }
  };

  // Handle test selection - match by display name or test name from Excel
  const handleTestSelect = (testKey: string) => {
    if (!testKey) return;

    // Try to find matching aggregated test by displayName first, then by testName
    let test = availableTests.find((t) => t.displayName === testKey);
    if (!test) {
      // Try matching by testName (the raw name without counts/decorators)
      test = availableTests.find(
        (t) =>
          t.testName?.toLowerCase() === testKey.toLowerCase() ||
          t.displayName?.toLowerCase().startsWith(testKey.toLowerCase())
      );
    }

    // Equipment-match fallback for Excel test names like "Temperature & Humidity Cycling (UTM)".
    // The allocation stores this as a UTM child inside "THC + UTM" combined test. The child
    // entry in availableTests has testName="UTM" (machine equipment), not the full Excel name.
    // Strip the "(UTM)" machine suffix and match the base name against child parentTestName.
    if (!test && machine?.machine_description) {
      const chamberEq = machine.machine_description.toLowerCase().trim();
      const machineEscaped = chamberEq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const baseName = testKey
        .replace(new RegExp(`\\s*\\(${machineEscaped}\\)\\s*$`, "i"), "")
        .toLowerCase()
        .trim();

      // 1. Search child test entries (from combined tests like "THC + UTM")
      const candidates = availableTests.filter(
        (t) =>
          t.isChildTest &&
          (t.machineEquipment || "").toLowerCase().trim() === chamberEq,
      );

      let matched: AggregatedTestOption | undefined;
      if (candidates.length === 1) {
        matched = candidates[0];
      } else if (candidates.length > 1 && baseName.length >= 4) {
        // Multiple children with same equipment — find by parent name similarity
        matched = candidates.find((t) =>
          (t.parentTestName || "").toLowerCase().includes(baseName.substring(0, 20)),
        );
      }

      // 2. Fallback: search standalone tests that use this chamber as machineEquipment2
      //    (e.g. "Screw Half" has machineEquipment: "", machineEquipment2: "UTM")
      if (!matched && baseName.length >= 4) {
        matched = availableTests.find(
          (t) =>
            !t.isChildTest &&
            (t.machineEquipment2 || "").toLowerCase().trim() === chamberEq &&
            (t.testName || "").toLowerCase().includes(baseName.substring(0, 15)),
        );
      }

      if (matched) {
        // Use the real entry (with correct allocations) but show the Excel test name
        test = { ...matched, testName: testKey, displayName: testKey };
      }
    }

    if (!test) {
      // No allocation found for this test name — still set a minimal test object
      // so the UI knows a test is selected (from Excel) even if no allocation exists
      const minimalTest: AggregatedTestOption = {
        testName: testKey,
        isChildTest: false,
        displayName: testKey,
        totalAvailable: 0,
        totalRequired: 0,
        allocations: [],
        ticketCount: 0,
        equipmentList: [],
      };
      setSelectedTestAggregated(minimalTest);
      setSessionTicketCode(null);
      setSelectedAllocation(null);
      setTestStarted(false);
      setIsAutoStart(false);
      setTestValue(null);
      return;
    }

    // ENHANCEMENT: Prevent changing test if parts are already scanned
    if (scannedParts.length > 0) {
      // Check if the new test has allocation for the current session ticket
      const currentTicket = sessionTicketCode || scannedParts[0].ticketCode;
      const hasAllocationForCurrentTicket = test.allocations.some(
        (alloc) => alloc.ticketCode === currentTicket,
      );

      if (!hasAllocationForCurrentTicket) {
        toast({
          variant: "destructive",
          title: "Cannot Change Test",
          description: (
            <div>
              <p>
                You are currently loading parts from Ticket: {currentTicket}
              </p>
              <p className="font-bold mt-1">
                This test doesn't have allocation for Ticket: {currentTicket}
              </p>
              <p className="text-xs mt-2">
                Available tickets:{" "}
                {test.allocations
                  .map((a) => a.ticketCode)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(", ")}
              </p>
            </div>
          ),
          duration: 2000,
        });
        return;
      }

      // Check if it's the same test (different display but same allocation)
      const isSameTest = selectedTestAggregated?.allocations.some((alloc) =>
        test.allocations.some(
          (t) => t.testId === alloc.testId && t.ticketCode === alloc.ticketCode,
        ),
      );

      if (!isSameTest) {
        toast({
          variant: "destructive",
          title: "Test Already Locked",
          description: `You are currently loading parts for: ${selectedTestAggregated?.displayName}. To change test, cancel this session and start a new one.`,
          duration: 2000,
        });
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
        toast({
          variant: "warning",
          title: "Test Changed",
          description: "Previous parts cleared from session",
          duration: 2000,
        });
      }
    }
  };

  const handlePartScan = async () => {
    // Validation
    if (!selectedTestAggregated) {
      toast({
        variant: "warning",
        title: "No Test Selected",
        description: "Please select a test first before scanning parts.",
        duration: 2000,
      });
      return;
    }

    if (!partInput.trim()) {
      toast({
        variant: "warning",
        title: "Empty Part Number",
        description: "Please enter a part number",
        duration: 2000,
      });
      return;
    }

    const partNumber = partInput.trim().toUpperCase();

    try {
      // STEP 1: Validate part exists in API data and get ticket mapping
      const validation = await validatePartMappingAndTicket(partNumber);

      if (validation.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot Scan Part",
          description: (
            <div className="mt-1">
              {validation.errors.map((error, idx) => (
                <div key={idx}>{error}</div>
              ))}
            </div>
          ),
          duration: 2000,
        });
        setPartInput("");
        return;
      }

      const partDetails = validation.partDetails;
      if (!partDetails) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to retrieve part details",
          duration: 2000,
        });
        setPartInput("");
        return;
      }

      // STEP 2: Check if this part's ticket has allocation for selected test
      // If the test has no allocations (Excel-only, no backend allocation), skip all allocation checks
      const hasAllocations = selectedTestAggregated.allocations.length > 0;
      let matchingAllocation = hasAllocations
        ? selectedTestAggregated.allocations.find(
            (alloc) => alloc.ticketCode === partDetails.ticketCode,
          )
        : undefined;

      // Fuzzy fallback: ticket may have a combined test (e.g. "THC + UTM") where one child
      // runs in this chamber. Also handles Excel-only tests (e.g. "Temperature & Humidity
      // Cycling (UTM)") by matching on the chamber's machine description.
      if (!matchingAllocation) {
        const targetEquipment = (
          selectedTestAggregated.machineEquipment ||
          selectedTestAggregated.machineEquipment2 ||
          (selectedTestAggregated.equipmentList || [])[0] ||
          machine?.machine_description ||
          ""
        ).toLowerCase().trim();

        const ticketRecord = allocationRecords.find(
          (r) => r.ticketCode === partDetails.ticketCode,
        );

        if (ticketRecord && targetEquipment) {
          const selectedBaseName = selectedTestAggregated.testName.toLowerCase().trim();
          outerFuzzy: for (const parentTest of ticketRecord.testAllocations) {
            const parentName = (parentTest.testName || "").toLowerCase().trim();
            // For tests with real allocations: require the parent name to be related by prefix.
            // For Excel-only tests: skip name filtering — equipment match alone is sufficient
            // because the Excel test name (e.g. "THC (UTM)") may differ from the allocation
            // test name (e.g. "THC + UTM").
            const nameRelated = hasAllocations
              ? parentName === selectedBaseName ||
                parentName.startsWith(selectedBaseName + " +") ||
                parentName.startsWith(selectedBaseName + "+")
              : true;
            if (!nameRelated) continue;

            for (const child of parentTest.childTests || []) {
              if (
                (child.machineEquipment || "").toLowerCase().trim() ===
                targetEquipment
              ) {
                const remaining =
                  child.remainingParts != null
                    ? toNumber(child.remainingParts)
                    : toNumber(child.requiredQty);
                matchingAllocation = {
                  testId: child.id,
                  ticketCode: partDetails.ticketCode,
                  allocationId: ticketRecord.id,
                  isChild: true,
                  parentTestId: parentTest.id,
                  remainingParts: remaining,
                  requiredQty: toNumber(child.requiredQty),
                  originalTest: child,
                };
                break outerFuzzy;
              }
            }
          }
        }
      }

      // Safe fallback allocation when test has no backend allocation (Excel-only)
      const safeAllocation = matchingAllocation ?? {
        testId: `excel-${selectedTestAggregated.testName}`,
        ticketCode: partDetails.ticketCode,
        allocationId: "",
        isChild: false,
        remainingParts: 9999,
        requiredQty: 9999,
        originalTest: null,
        sequenceNumber: undefined,
        totalInSequence: undefined,
        nextTestId: undefined,
        previousTestId: undefined,
      };

      // STEP 3: Check allocation availability (only when a real allocation was matched)
      if (matchingAllocation && matchingAllocation.remainingParts <= 0) {
        toast({
          variant: "destructive",
          title: "Allocation Exhausted",
          description: `No allocation available for part ${partNumber} from ticket ${partDetails.ticketCode}`,
          duration: 3000,
        });
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
            safeAllocation.parentTestId ||
            safeAllocation.testId
          : safeAllocation.testId;
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

          toast({
            variant: "destructive",
            title: "Test Sequence Conflict",
            description: `Part ${partNumber} is already assigned to ${previousName}. Only the linked child tests for that sequence can be loaded.`,
            duration: 4000,
          });
          setPartInput("");
          return;
        }
      }

      // STEP 4: For combined tests, check sequence
      if (
        selectedTestAggregated.isChildTest &&
        safeAllocation.previousTestId
      ) {
        const hasCompletedPrevious = hasCompletedPreviousTest(
          partNumber,
          safeAllocation.testId,
          safeAllocation.previousTestId,
        );

        if (!hasCompletedPrevious) {
          // Find the previous test name
          const allocations = getCurrentAllocations();
          let previousTestName = "Previous Test";

          allocations.forEach((alloc) => {
            (alloc.testAllocations || []).forEach((parent) => {
              (parent.childTests || []).forEach((child) => {
                if (child.id === safeAllocation.previousTestId) {
                  previousTestName =
                    child.subTestName ||
                    child.machineEquipment ||
                    "Previous Test";
                }
              });
            });
          });

          toast({
            variant: "destructive",
            title: "Sequence Step Required",
            description: `Part ${partNumber} must complete "${previousTestName}" first before starting "${selectedTestAggregated.subTestName || selectedTestAggregated.testName}".`,
            duration: 4000,
          });
          setPartInput("");
          return;
        }
      }

      // STEP 5: Check if part already loaded for this specific test
      const loadedForThisTest = isPartLoadedForTest(
        partNumber,
        safeAllocation.testId,
      );
      if (loadedForThisTest.isLoaded) {
        toast({
          variant: "destructive",
          title: "Part Already Loaded",
          description: `Part ${partNumber} is already loaded in ${loadedForThisTest.equipment} for test: ${loadedForThisTest.testName}`,
          duration: 3000,
        });
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
          toast({
            variant: "destructive",
            title: "Part In Progress",
            description: `Part ${partNumber} is currently in "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.stageNumber}) of this combined test.`,
            duration: 3000,
          });
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
          toast({
            variant: "destructive",
            title: "Part In Another Chamber",
            description: `Part ${partNumber} is currently in ${combinedTestStatus.chamber} for "${combinedTestStatus.currentStage}" (Step ${combinedTestStatus.sequenceNumber}).`,
            duration: 3000,
          });
          setPartInput("");
          return;
        }
      }

      // STEP 7: Checkpoint handling
      let checkpointInfo = null;
      if (selectedTestAggregated.hasCheckpoints) {
        const timesAlreadyLoaded = getCheckpointProgress(
          partNumber,
          safeAllocation.testId,
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

      // STEP 8: Track session ticket for reference (allow multiple tickets)
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

      // Resolve PRODUCT_CODE for this part's processStage (W=Watch, B=Backcase)
      let productCode = productCodeCache[partDetails.processStage] ?? "";
      if (!productCode && partDetails.processStage) {
        const codeMap = await loadProductCodeFromConfig();
        setProductCodeCache((prev) => ({ ...prev, ...codeMap }));
        productCode = codeMap[partDetails.processStage] ?? "";
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
        productCode,           // "W" = Watch, "B" = Backcase
        session: partDetails.session,
        scanStatus: "OK",
        cosmeticImages: [],
        nonCosmeticImages: [],
        selectedTestId: safeAllocation.testId,
        selectedAllocation: safeAllocation,
        combinedTestId: selectedTestAggregated.combinedTestId,
        sequenceNumber: safeAllocation.sequenceNumber,
        totalInSequence: safeAllocation.totalInSequence,
        nextTestId: safeAllocation.nextTestId,
        previousTestId: safeAllocation.previousTestId,
        checkpointInfo: checkpointInfo,
        scannedPartRecord: partDetails.scannedPartRecord,
      };

      // STEP 10: Track allocation limit for this specific test+ticket combination
      const allocationKey = `${safeAllocation.testId}|${partDetails.ticketCode}`;
      const currentLoaded =
        allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

      setAllocationLimits((prev) => ({
        ...prev,
        [allocationKey]: {
          testId: safeAllocation.testId,
          testName: selectedTestAggregated.testName,
          ticketCode: partDetails.ticketCode,
          partsAvailableToAllocate: safeAllocation.remainingParts,
          alreadyAllocated:
            safeAllocation.requiredQty - safeAllocation.remainingParts,
          requiredQty: safeAllocation.requiredQty,
          maxPartsCanLoad: safeAllocation.remainingParts,
          partsLoadedInThisSession: currentLoaded + 1,
        },
      }));

      // Set selected allocation for display
      setSelectedAllocation({
        testId: safeAllocation.testId,
        testName: selectedTestAggregated.testName,
        ticketCode: partDetails.ticketCode,
        partsAvailableToAllocate: safeAllocation.remainingParts,
        alreadyAllocated:
          safeAllocation.requiredQty - safeAllocation.remainingParts,
        requiredQty: safeAllocation.requiredQty,
        maxPartsCanLoad: safeAllocation.remainingParts,
        partsLoadedInThisSession: currentLoaded + 1,
      });

      // STEP 11: Add part to scanned parts
      setScannedParts((prev) => [...prev, partData]);

      // FIXED STEP 12: Update ONLY the specific ticket's allocation, not aggregated total
      const updatedAllocations = selectedTestAggregated.allocations.map(
        (alloc) => {
          if (
            alloc.testId === safeAllocation.testId &&
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
      let successMessage = `Part ${partNumber} scanned successfully`;
      if (
        selectedTestAggregated.isChildTest &&
        safeAllocation.sequenceNumber
      ) {
        successMessage += ` (Step ${safeAllocation.sequenceNumber}/${safeAllocation.totalInSequence})`;
      }

      toast({
        variant: "success",
        title: "Part Scanned",
        description: successMessage,
        duration: 2000,
      });
    } catch (error: any) {
      console.error("Error scanning part:", error);
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: error.message || "Unknown error occurred",
        duration: 3000,
      });
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
      enhancedDisplayName = `${enhancedDisplayName}`;
    } else if (test.unit === "Cycle") {
      enhancedDisplayName = `${enhancedDisplayName}`;
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

    const allocationKey = `${partToRemove.selectedTestId}|${partToRemove.ticketCode}`;
    const currentLoaded =
      allocationLimits[allocationKey]?.partsLoadedInThisSession || 0;

    // Restore allocationRecords in local state
    setAllocationRecords((prevRecords) => {
      return prevRecords.map((alloc) => {
        if (alloc.ticketCode !== partToRemove.ticketCode) return alloc;

        return {
          ...alloc,
          testAllocations: (alloc.testAllocations || []).map((parentTest) => {
            // Check parent test match
            if (parentTest.id === partToRemove.selectedTestId) {
              return {
                ...parentTest,
                remainingParts: toNumber(parentTest.remainingParts) + 1,
              };
            }

            // Check child test match
            const hasMatchingChild = (parentTest.childTests || []).some(
              (child) => child.id === partToRemove.selectedTestId,
            );

            if (hasMatchingChild) {
              return {
                ...parentTest,
                // Restore parent remaining if it's a child test
                remainingParts: selectedTestAggregated?.isChildTest
                  ? toNumber(parentTest.remainingParts) + 1
                  : parentTest.remainingParts,
                childTests: (parentTest.childTests || []).map((child) => {
                  if (child.id === partToRemove.selectedTestId) {
                    return {
                      ...child,
                      remainingParts: toNumber(child.remainingParts) + 1,
                    };
                  }
                  return child;
                }),
              };
            }

            return parentTest;
          }),
        };
      });
    });

    // Update allocation limits
    setAllocationLimits((prev) => ({
      ...prev,
      [allocationKey]: {
        ...prev[allocationKey],
        partsLoadedInThisSession: Math.max(0, currentLoaded - 1),
      },
    }));

    // Update aggregated test UI counts
    if (selectedTestAggregated) {
      const updatedAllocations = selectedTestAggregated.allocations.map(
        (alloc) => {
          if (
            alloc.testId === partToRemove.selectedTestId &&
            alloc.ticketCode === partToRemove.ticketCode
          ) {
            return {
              ...alloc,
              remainingParts: alloc.remainingParts + 1,
            };
          }
          return alloc;
        },
      );

      const updatedTotalAvailable = updatedAllocations.reduce(
        (sum, alloc) => sum + alloc.remainingParts,
        0,
      );

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

    // Remove part from scanned list
    const updatedScannedParts = scannedParts.filter(
      (part) => part.id !== partId,
    );
    setScannedParts(updatedScannedParts);

    if (updatedScannedParts.length === 0) {
      setMachineDetails(null);
      setSelectedAllocation(null);
      setSessionTicketCode(null);
    }
  };
  const handleConfirmLoad = async () => {
    if (!selectedTestAggregated || !scannedParts.length) {
      toast({
        variant: "warning",
        title: "Cannot Confirm Load",
        description: "No test selected or parts scanned!",
        duration: 3000,
      });
      return;
    }

    // For non-hour tests, check if test is started
    if (selectedTestAggregated.unit !== "Hours" && !testStarted) {
      toast({
        variant: "warning",
        title: "Test Not Started",
        description: 'Please click "Start Test" button to begin the test',
        duration: 3000,
      });
      return;
    }

    // Allow parts from multiple tickets - removed ticket matching requirement
    // Parts can now belong to different tickets in the same session

    // ── BATCH UPDATE: group parts by ticketCode + testId
    const partGroups = new Map<
      string,
      { ticketCode: string; testId: string; count: number }
    >();

    // Check if this is an Excel-only test (no backend allocations)
    const isExcelOnlyTest = selectedTestAggregated.allocations.length === 0;

    for (const part of scannedParts) {
      // For Excel-only tests, selectedAllocation is a safe fallback — skip the guard
      if (!isExcelOnlyTest && !part.selectedAllocation) {
        toast({
          variant: "destructive",
          title: "Allocation Error",
          description: `No allocation found for part ${part.partNumber}`,
          duration: 2000,
        });
        return;
      }
      const key = `${part.ticketCode}|${part.selectedTestId}`;
      if (!partGroups.has(key)) {
        partGroups.set(key, {
          ticketCode: part.ticketCode,
          testId: part.selectedTestId,
          count: 0,
        });
      }
      partGroups.get(key)!.count += 1;
    }

    // Single atomic backend call per unique ticket+test group
    const updateAllocationBatch = async (
      ticketCode: string,
      testId: string,
      partsCount: number,
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

        // When the testId uses the excel-fallback prefix, match by test name instead of ID
        const excelFallbackName = testId.startsWith("excel-") ? testId.slice(6) : null;
        const testMatches = (id: string, name?: string) =>
          id === testId || (excelFallbackName !== null && name?.trim() === excelFallbackName.trim());

        const effectiveRemaining = (test: AllocationTestDto) =>
          test.remainingParts != null
            ? toNumber(test.remainingParts)
            : toNumber(test.requiredQty);

        for (const parentTest of clonedAllocation.testAllocations) {
          if (testMatches(parentTest.id, parentTest.testName)) {
            const remaining = effectiveRemaining(parentTest);
            if (remaining >= partsCount) {
              parentTest.remainingParts = remaining - partsCount;
              allocationUpdated = true;
            } else if (remaining > 0) {
              parentTest.remainingParts = 0;
              allocationUpdated = true;
            }
            break;
          }

          for (const childTest of parentTest.childTests || []) {
            if (testMatches(childTest.id, childTest.testName)) {
              const childRemaining = effectiveRemaining(childTest);
              if (childRemaining >= partsCount) {
                childTest.remainingParts = childRemaining - partsCount;
              } else if (childRemaining > 0) {
                childTest.remainingParts = 0;
              }

              if (isChildTest) {
                const parentRem = effectiveRemaining(parentTest);
                if (parentRem >= partsCount) {
                  parentTest.remainingParts = parentRem - partsCount;
                } else if (parentRem > 0) {
                  parentTest.remainingParts = 0;
                }
              }

              allocationUpdated = true;
              break;
            }
          }

          if (allocationUpdated) break;
        }

        if (!allocationUpdated) {
          console.warn(
            "Allocation not updated - no remaining parts available for test:",
            testId,
          );
          return false;
        }

        // Recalculate total remaining parts
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

        // Persist to backend
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
        console.error("Error updating allocation batch:", error);
        return false;
      }
    };

    // Run batch updates — skip groups where the testId is still an Excel-only fallback
    // (means no real allocation was found for that ticket). Groups where the fuzzy fallback
    // resolved a real child ID (e.g. UTM child of "THC + UTM") will have a proper UUID and
    // will be updated normally.
    let allocationErrors: string[] = [];
    for (const [, group] of partGroups) {
      if (group.testId.startsWith("excel-")) continue;
      console.log(
        `Updating allocation: ticket=${group.ticketCode}, test=${group.testId}, count=${group.count}`,
      );
      const allocationUpdated = await updateAllocationBatch(
        group.ticketCode,
        group.testId,
        group.count,
        selectedTestAggregated.isChildTest,
      );

      if (!allocationUpdated) {
        allocationErrors.push(
          `Failed to update allocation for ticket ${group.ticketCode} (test: ${group.testId}, parts: ${group.count})`,
        );
      }
    }

    if (allocationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Allocation Update Failed",
        description: (
          <div className="mt-1">
            {allocationErrors.map((error, idx) => (
              <div key={idx}>• {error}</div>
            ))}
          </div>
        ),
        duration: 5000,
      });
      return;
    }

    // Create chamber load record
    const currentTime = new Date().toISOString();
    const testDisplayName = selectedTestAggregated.displayName.split(" (")[0];

    const loadPayload: ChamberLoadPayload = {
      chamber: selectedChamber,
      machineId: machine?.machine_id || selectedChamber,
      machineDescription: machine?.machine_description || selectedChamber,
      parts: scannedParts.map((part) => ({
        customImages: Array.isArray(part.customImages)
          ? part.customImages.map((image) => ({
              label: (image.label || "").trim(),
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
        scannedPartRecord: part.scannedPartRecord,
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
      toast({
        variant: "destructive",
        title: "Failed to Create Chamber Load",
        description: "Please try again",
        duration: 3000,
      });
      setChamberLoading?.(selectedChamber, false);
      return;
    }

    setChamberLoading?.(selectedChamber, false);

    // // Summary
    // let summary = `Successfully loaded ${scannedParts.length} parts into ${machine?.machine_description || selectedChamber}\n`;
    // summary += `Equipment ID: ${machine?.machine_id || selectedChamber}\n`;
    // summary += `Test: ${selectedTestAggregated.displayName}\n`;
    // summary += `Ticket: ${scannedParts[0].ticketCode}\n`;

    // summary += "\nAllocation Summary:\n";
    // for (const [, group] of partGroups) {
    //   const allocationInfo = selectedTestAggregated.allocations.find(
    //     (a) => a.ticketCode === group.ticketCode,
    //   );
    //   const originalRemaining = allocationInfo?.remainingParts || 0;
    //   const remainingAfter = Math.max(0, originalRemaining - group.count);

    //   summary += `• Ticket ${group.ticketCode}: ${group.count} part(s) loaded\n`;
    //   summary += `  Required: ${allocationInfo?.requiredQty || 0} | Remaining after load: ${remainingAfter}\n`;
    // }

    // if (
    //   selectedTestAggregated.isChildTest &&
    //   selectedTestAggregated.sequenceNumber
    // ) {
    //   summary += `\nSequence: Step ${selectedTestAggregated.sequenceNumber} of ${selectedTestAggregated.totalInSequence}\n`;
    // }

    // summary += `\nStatus: ${testStarted ? "Test Started" : "Pending Start"}\n`;

    // summary += `\nTest Configuration:\n`;
    // summary += `• Test Unit: ${selectedTestAggregated.unit}\n`;
    // if (testValue) {
    //   summary += `• Test Value: ${testValue} ${selectedTestAggregated.unit === "Hours" ? "Hours" : selectedTestAggregated.unit}\n`;
    // }
    // summary += `• Test Status: ${testStarted ? "Started" : "Not Started"}\n`;
    // if (isAutoStart) {
    //   summary += `• Auto-start: Yes (Hour-based test)\n`;
    // }
    // if (
    //   selectedTestAggregated.isChildTest &&
    //   selectedTestAggregated.parentTestName
    // ) {
    //   summary += `• Combined Test: ${selectedTestAggregated.parentTestName}\n`;
    // }

    // summary += `\nLoaded Parts:\n`;
    // scannedParts.forEach((part) => {
    //   summary += `• ${part.partNumber}`;
    //   if (part.checkpointInfo) {
    //     summary += ` (Checkpoint ${part.checkpointInfo.checkpointIndex + 1}/${part.checkpointInfo.totalCheckpoints})`;
    //   }
    //   summary += "\n";
    // });

    // if (
    //   selectedTestAggregated.isChildTest &&
    //   selectedTestAggregated.nextTestId
    // ) {
    //   summary += `\nNext Step in Sequence:\n`;
    //   const allocations = getCurrentAllocations();
    //   let nextTestName = "Next Test";
    //   let nextEquipment = "";

    //   allocations.forEach((alloc) => {
    //     (alloc.testAllocations || []).forEach((parent) => {
    //       (parent.childTests || []).forEach((child) => {
    //         if (child.id === selectedTestAggregated.nextTestId) {
    //           nextTestName =
    //             child.subTestName || child.machineEquipment || "Next Test";
    //           nextEquipment =
    //             child.machineEquipment || child.machineEquipment2 || "";
    //         }
    //       });
    //     });
    //   });

    //   summary += `• After completion, load these parts into ${nextEquipment} for: ${nextTestName}\n`;
    // }

    // const partsWithImages = scannedParts.filter(
    //   (part) =>
    //     part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0,
    // ).length;

    // if (partsWithImages > 0) {
    //   summary += `\nImages uploaded for ${partsWithImages} part(s).`;
    // }

    // alert(summary);
    // Summary with toast
    toast({
      title: "✓ Load Successful",
      description: (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {/* Main Info */}
          <div className="space-y-1">
            <div className="font-semibold text-base">
              {scannedParts.length} parts loaded into{" "}
              {machine?.machine_description || selectedChamber}
            </div>
            <div className="text-sm text-gray-600">
              Equipment ID: {machine?.machine_id || selectedChamber}
            </div>
            <div className="text-sm text-gray-600">
              Test: {selectedTestAggregated.displayName}
            </div>
            <div className="text-sm text-gray-600">
              Ticket: {scannedParts[0].ticketCode}
            </div>
          </div>

          {/* Allocation Summary */}
          <div className="border-t pt-2">
            <div className="font-medium text-sm mb-1">Allocation Summary:</div>
            {Array.from(partGroups.entries()).map(([key, group]) => {
              const allocationInfo = selectedTestAggregated.allocations.find(
                (a) => a.ticketCode === group.ticketCode,
              );
              const originalRemaining = allocationInfo?.remainingParts || 0;
              const remainingAfter = Math.max(
                0,
                originalRemaining - group.count,
              );

              return (
                <div key={key} className="text-xs space-y-0.5 ml-2">
                  <div>
                    • Ticket {group.ticketCode}: {group.count} part(s) loaded
                  </div>
                  <div className="ml-3 text-gray-600">
                    Required: {allocationInfo?.requiredQty || 0} | Remaining:{" "}
                    {remainingAfter}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sequence Info */}
          {selectedTestAggregated.isChildTest &&
            selectedTestAggregated.sequenceNumber && (
              <div className="border-t pt-2">
                <div className="text-sm">
                  <span className="font-medium">Sequence:</span> Step{" "}
                  {selectedTestAggregated.sequenceNumber} of{" "}
                  {selectedTestAggregated.totalInSequence}
                </div>
              </div>
            )}

          {/* Status */}
          <div className="border-t pt-2">
            <div className="text-sm">
              <span className="font-medium">Status:</span>{" "}
              <span
                className={testStarted ? "text-green-600" : "text-yellow-600"}
              >
                {testStarted ? "Test Started" : "Pending Start"}
              </span>
            </div>
          </div>

          {/* Test Configuration */}
          <div className="border-t pt-2">
            <div className="font-medium text-sm mb-1">Test Configuration:</div>
            <div className="text-xs space-y-0.5 ml-2">
              <div>• Test Unit: {selectedTestAggregated.unit}</div>
              {testValue && (
                <div>
                  • Test Value: {testValue}{" "}
                  {selectedTestAggregated.unit === "Hours"
                    ? "Hours"
                    : selectedTestAggregated.unit}
                </div>
              )}
              <div>
                • Test Status: {testStarted ? "Started" : "Not Started"}
              </div>
              {isAutoStart && <div>• Auto-start: Yes (Hour-based test)</div>}
              {selectedTestAggregated.isChildTest &&
                selectedTestAggregated.parentTestName && (
                  <div>
                    • Combined Test: {selectedTestAggregated.parentTestName}
                  </div>
                )}
            </div>
          </div>

          {/* Loaded Parts */}
          <div className="border-t pt-2">
            <div className="font-medium text-sm mb-1">Loaded Parts:</div>
            <div className="text-xs space-y-0.5 ml-2 max-h-32 overflow-y-auto">
              {scannedParts.map((part) => (
                <div key={part.id}>
                  • {part.partNumber}
                  {part.checkpointInfo && (
                    <span className="text-yellow-600">
                      {" "}
                      (Checkpoint {part.checkpointInfo.checkpointIndex + 1}/
                      {part.checkpointInfo.totalCheckpoints})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Next Step */}
          {selectedTestAggregated.isChildTest &&
            selectedTestAggregated.nextTestId &&
            (() => {
              const allocations = getCurrentAllocations();
              let nextTestName = "Next Test";
              let nextEquipment = "";

              allocations.forEach((alloc) => {
                (alloc.testAllocations || []).forEach((parent) => {
                  (parent.childTests || []).forEach((child) => {
                    if (child.id === selectedTestAggregated.nextTestId) {
                      nextTestName =
                        child.subTestName ||
                        child.machineEquipment ||
                        "Next Test";
                      nextEquipment =
                        child.machineEquipment || child.machineEquipment2 || "";
                    }
                  });
                });
              });

              return (
                <div className="border-t pt-2">
                  <div className="font-medium text-sm mb-1">
                    Next Step in Sequence:
                  </div>
                  <div className="text-xs ml-2">
                    • After completion, load these parts into {nextEquipment}{" "}
                    for: {nextTestName}
                  </div>
                </div>
              );
            })()}

          {/* Images Info */}
          {(() => {
            const partsWithImages = scannedParts.filter(
              (part) =>
                part.cosmeticImages?.length > 0 ||
                part.nonCosmeticImages?.length > 0,
            ).length;

            return partsWithImages > 0 ? (
              <div className="border-t pt-2">
                <div className="text-sm text-blue-600">
                  📷 Images uploaded for {partsWithImages} part(s)
                </div>
              </div>
            ) : null;
          })()}
        </div>
      ),
      duration: 10000, // 10 seconds - adjust as needed
    });

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
                  (Based on Equipment ID)
                </span>
              </label>
              <div className="relative">
                {(() => {
                  // Build a set of all testNames present in the allocation API response
                  const allocationTestNames = new Set<string>();
                  allocationRecords.forEach((alloc) => {
                    (alloc.testAllocations || []).forEach((t) => {
                      if (t.testName) {
                        allocationTestNames.add(t.testName.toLowerCase().trim());
                      }
                      // Also check child tests
                      (t.childTests || []).forEach((child) => {
                        if (child.testName) {
                          allocationTestNames.add(child.testName.toLowerCase().trim());
                        }
                      });
                    });
                  });

                  // Show all configured tests for this machine — the machine is already selected
                  // so every test in its list is relevant. The handleTestSelect fallback
                  // maps each name to the correct allocation entry (or uses minimalTest if none).
                  const filteredExcelOptions = configTestOptions;

                  return (
                    <>
                      <select
                        value={
                          selectedTestAggregated
                            ? selectedTestAggregated.testName
                            : ""
                        }
                        onChange={(e) => handleTestSelect(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        disabled={scannedParts.length > 0}
                      >
                        <option value="">Select a test...</option>
                        {configTestOptions.length > 0
                          ? filteredExcelOptions.map((testName) => (
                              <option key={testName} value={testName}>
                                {testName}
                              </option>
                            ))
                          : (() => {
                              const machineDesc = (machine?.machine_description || "").toLowerCase().trim();
                              const machineIdLower = (machine?.machine_id || selectedChamber || "").toLowerCase().trim();
                              const equipsOf = (raw: string) =>
                                raw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                              const matchesMachine = (raw: string) =>
                                equipsOf(raw).some((p: string) => p === machineDesc || p === machineIdLower);
                              const machineTests = availableTests.filter((test) => {
                                const eq1 = test.machineEquipment || "";
                                const eq2 = test.machineEquipment2 || "";
                                const eqList = test.equipmentList || [];
                                if (!eq1 && !eq2 && eqList.length === 0) return true;
                                return matchesMachine(eq1) || matchesMachine(eq2) || eqList.some((e: string) => matchesMachine(e));
                              });
                              const seen = new Set<string>();
                              return machineTests.flatMap((test) => {
                                const rawName = test.testName || test.displayName || "";
                                const names = rawName
                                  .split(",")
                                  .map((n: string) => n.trim())
                                  .filter((n: string) => n && !seen.has(n));
                                names.forEach((n: string) => seen.add(n));
                                return names.map((name: string) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ));
                              });
                            })()}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown size={20} className="text-gray-400" />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Test Count Info */}
              {configTestOptions.length > 0 && (() => {
                const count = configTestOptions.length;
                return (
                  <div className="mt-2 text-xs text-gray-500">
                    Showing {count} test(s) for this equipment
                  </div>
                );
              })()}

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
                        isWatch={part.ticketCode?.split("_")[2]?.toUpperCase() === "W"}
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
