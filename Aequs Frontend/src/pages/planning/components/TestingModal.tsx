import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, TestTube, Clock, Calendar, Trash2, CheckCircle, Pencil } from 'lucide-react';
import PartScanner from "./PartScanner";
import PartImageUpload from "./PartImageUpload";
import { usePartScanning } from "../hooks/usePartScanning";
import { findPartInScannedParts, updateChamberLoad, fetchAllocations, updateBackendAllocation, AllocationTestDto } from "@/lib/backendApi";
import { updateTestingPartInBackend } from "@/helpers/api/testingPage";
import { ChamberLoad, Part } from '../types';
import { machineData } from "@/data/MachineData";
import { toast } from "@/components/ui/use-toast";

interface TestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineIdentifier: string | null;
  chamberLoads: ChamberLoad[];
  onNavigateToTesting: (load: ChamberLoad, testGroup: any) => void;
  onDeleteLoad: (load: ChamberLoad) => void;
  onMarkComplete: (loadId: number) => void | Promise<void>;
}

const TestingModal: React.FC<TestingModalProps> = ({
  isOpen,
  onClose,
  machineIdentifier,
  chamberLoads,
  onNavigateToTesting,
  onDeleteLoad,
  onMarkComplete
}) => {
  const [localChamberLoads, setLocalChamberLoads] = useState<ChamberLoad[]>(chamberLoads);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<ChamberLoad | null>(null);
  const [editingGroupMeta, setEditingGroupMeta] = useState<any | null>(null);
  const [editingOriginalTestName, setEditingOriginalTestName] = useState<string>("");
  const [editingTestName, setEditingTestName] = useState<string>("");
  const [editingParts, setEditingParts] = useState<Part[]>([]);
  const [editPartInput, setEditPartInput] = useState<string>("");
  const [editScanning, setEditScanning] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [availableTests, setAvailableTests] = useState<AllocationTestDto[]>([]);
  const [selectedTestOption, setSelectedTestOption] = useState<AllocationTestDto | null>(null);
  const [loadingTests, setLoadingTests] = useState<boolean>(false);
  const [allocationWarning, setAllocationWarning] = useState<string | null>(null);
  const { handleImageUpload: uploadPartImage, isUploading } = usePartScanning();

  useEffect(() => {
    setLocalChamberLoads(chamberLoads);
  }, [chamberLoads]);

  // const activeMachineLoads = useMemo(() => {
  //   if (!machineIdentifier) return [];
  //   return localChamberLoads
  //     .filter(load => load.chamber === machineIdentifier)
  //     .sort((a, b) => new Date(b.loadedAt).getTime() - new Date(a.loadedAt).getTime());
  // }, [machineIdentifier, localChamberLoads]);

  // Memoize the test object passed to PartScanner to prevent it from stealing focus
  
  const activeMachineLoads = useMemo(() => {
  if (!machineIdentifier) return [];
  return localChamberLoads
    .filter(load => {
      const isChamberMatch = load.chamber === machineIdentifier;
      
      // Exclude completed loads
      const isCompleted = 
        load.isCompleted === true ||
        load.status === 'completed' ||
        load.testStatus === 'completed' ||
        (load.timerStatus === 'stop' && load.completedAt != null);
      
      return isChamberMatch && !isCompleted;
    })
    .sort((a, b) => new Date(b.loadedAt).getTime() - new Date(a.loadedAt).getTime());
}, [machineIdentifier, localChamberLoads]);
  
  
  const scannerTestObject = useMemo(() => {
    return editingTestName ? { displayName: editingTestName, testName: editingTestName } : null;
  }, [!!editingTestName]);

  const normalizeGroupParts = (load: ChamberLoad, testGroup: any): Part[] => {
    return load.parts
      .filter((part) => part.testName === testGroup.testName)
      .map((part, index) => ({
        ...part,
        id: part.id ?? Number(`${load.id}${index}${Date.now()}`),
        project: part.project || (load.machineDetails as any)?.project || "",
        customImages: Array.isArray(part.customImages) ? part.customImages : [],
        cosmeticImages: Array.isArray(part.cosmeticImages) ? part.cosmeticImages : [],
        nonCosmeticImages: Array.isArray(part.nonCosmeticImages) ? part.nonCosmeticImages : [],
      }));
  };

  const startEditingGroup = (load: ChamberLoad, testGroup: any) => {
    const normalizedParts = normalizeGroupParts(load, testGroup);
    setEditingLoad(load);
    setEditingGroupMeta(testGroup);
    setEditingOriginalTestName(testGroup.testName || "");
    setEditingTestName(testGroup.testName || "");
    setEditingParts(normalizedParts);
    setEditPartInput("");
    setSelectedTestOption(null);
    setAllocationWarning(null);
    loadAvailableTests(load, testGroup);
    setEditDialogOpen(true);
  };

  const resetEditState = () => {
    setEditDialogOpen(false);
    setEditingLoad(null);
    setEditingGroupMeta(null);
    setEditingOriginalTestName("");
    setEditingTestName("");
    setEditingParts([]);
    setEditPartInput("");
    setEditScanning(false);
    setSavingEdit(false);
    setAvailableTests([]);
    setSelectedTestOption(null);
    setAllocationWarning(null);
  };

  const normalizeMachineName = (name?: string | null) =>
    (name || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

  const flattenTests = (tests: AllocationTestDto[], parentName?: string): AllocationTestDto[] => {
    const list: AllocationTestDto[] = [];
    tests.forEach((test) => {
      const withDisplay: AllocationTestDto = {
        ...test,
        testName: parentName ? `${parentName} (${test.subTestName || test.testName || ""})` : test.testName,
      };
      list.push(withDisplay);
      if (Array.isArray(test.childTests) && test.childTests.length > 0) {
        list.push(...flattenTests(test.childTests, test.testName));
      }
    });
    return list;
  };

  const loadAvailableTests = async (load: ChamberLoad, testGroup: any) => {
    setLoadingTests(true);
    try {
      const allocations = await fetchAllocations();
      const ticketCode =
        load.ticketCode ||
        (load.machineDetails as any)?.ticketCode ||
        load.parts?.[0]?.ticketCode ||
        "";

      const ticketAllocation = allocations.find((a) =>
        (a.ticketCode || "").toUpperCase() === ticketCode.toUpperCase()
      );
      if (!ticketAllocation) {
        const fallback = testGroup?.testId
          ? [{
            id: testGroup.testId,
            testName: testGroup.testName,
            testCondition: testGroup.testCondition,
            unit: load.testUnit,
            time: load.testValue,
            remainingParts: load.totalParts,
            requiredQty: load.totalParts,
            displayName: `${testGroup.testName} (${load.totalParts ?? 0}/${load.totalParts ?? 0})`
          } as AllocationTestDto & { displayName?: string }]
          : [];
        setAvailableTests(fallback as AllocationTestDto[]);
        setSelectedTestOption(fallback[0] as AllocationTestDto || null);
        return;
      }

      const flattened = flattenTests(ticketAllocation.testAllocations || []);
      const withCounts = flattened.map((t) => {
        const required = Number(t.requiredQty ?? t.remainingParts ?? 0) || 0;
        const remaining = Number(t.remainingParts ?? required) || 0;
        return {
          ...t,
          displayName: `${t.testName || "Test"} (${remaining}/${required || remaining})`,
        } as AllocationTestDto & { displayName?: string };
      });

      setAvailableTests(withCounts as AllocationTestDto[]);

      const matchById = withCounts.find((t) => String(t.id) === String(testGroup.testId));
      const matchByName = withCounts.find((t) => (t.testName || "").toLowerCase() === (testGroup.testName || "").toLowerCase());
      const nextSelected = matchById || matchByName || null;
      setSelectedTestOption((nextSelected as AllocationTestDto) || (withCounts[0] as AllocationTestDto) || null);
    } catch (error) {
      console.error("Failed to load available tests for edit", error);
      setAvailableTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  const updatePartField = (partId: number, updates: Partial<Part>) => {
    setEditingParts((prev) => prev.map((part) => (part.id === partId ? { ...part, ...updates } : part)));
  };

  const handleRemoveEditingPart = (partId: number) => {
    setEditingParts((prev) => prev.filter((part) => part.id !== partId));
  };

  const handleImageUploadForPart = async (
    partId: number,
    label: string,
    file: File
  ): Promise<string | null> => {
    let storedPath: string | null = null;

    await uploadPartImage(partId, label, file, (filePath) => {
      storedPath = filePath || file.name;
      setEditingParts((prev) =>
        prev.map((part) => {
          if (part.id !== partId) return part;

          const nextCustomImages = Array.isArray(part.customImages) ? [...part.customImages] : [];
          nextCustomImages.push({ label, path: storedPath as string, uploadedAt: new Date().toISOString() });

          const nextCosmetic = Array.isArray(part.cosmeticImages) ? [...part.cosmeticImages] : [];
          nextCosmetic.push(storedPath as string);

          return {
            ...part,
            customImages: nextCustomImages,
            cosmeticImages: nextCosmetic,
            hasImages: true,
          };
        })
      );
    });

    return storedPath;
  };

  const handleImageRemoveForPart = (
    partId: number,
    index: number,
    image: { path: string; label?: string }
  ) => {
    setEditingParts((prev) =>
      prev.map((part) => {
        if (part.id !== partId) return part;

        const nextCustomImages = Array.isArray(part.customImages)
          ? part.customImages.filter((_, idx) => idx !== index)
          : [];

        const removePath = (list?: string[]) =>
          Array.isArray(list) ? list.filter((item) => item !== image.path) : [];

        const cosmeticImages = removePath(part.cosmeticImages as string[]);
        const nonCosmeticImages = removePath(part.nonCosmeticImages as string[]);

        return {
          ...part,
          customImages: nextCustomImages,
          cosmeticImages,
          nonCosmeticImages,
          hasImages:
            nextCustomImages.length > 0 ||
            cosmeticImages.length > 0 ||
            nonCosmeticImages.length > 0,
        };
      })
    );
  };

  const handleEditPartScan = async () => {
    if (!editingLoad || !editingGroupMeta) return;

    if (!editPartInput.trim()) {
      toast({
        variant: "warning",
        title: "Empty Part Number",
        description: "Please enter a part number to scan",
        duration: 2000,
      });
      return;
    }

    const partNumber = editPartInput.trim().toUpperCase();

    if (editingParts.some((part) => (part.partNumber || "").toUpperCase() === partNumber)) {
      toast({
        variant: "warning",
        title: "Duplicate Part",
        description: "This part is already in the test group",
        duration: 2000,
      });
      setEditPartInput("");
      return;
    }

    setEditScanning(true);

    try {
      const result = await findPartInScannedParts(partNumber);

      if (!result.found || !result.partDetails) {
        toast({
          variant: "destructive",
          title: "Part Not Found",
          description: "Part not found in scanned records. Please scan a valid part.",
          duration: 2000,
        });
        return;
      }

      // Validate ticket consistency with current load
      const loadTicket =
        (editingLoad.machineDetails as any)?.ticketCode ||
        editingLoad.ticketCode ||
        editingLoad.parts?.[0]?.ticketCode ||
        "";

      if (
        loadTicket &&
        result.partDetails.ticketCode &&
        result.partDetails.ticketCode !== loadTicket
      ) {
        toast({
          variant: "destructive",
          title: "Ticket Mismatch",
          description: `Part belongs to ticket ${result.partDetails.ticketCode}, but this load is for ticket ${loadTicket}.`,
          duration: 2000,
        });
        return;
      }

      // Check if part already exists in any load for same ticket
      const existingLoadEntry = localChamberLoads
        .flatMap((load) => (load.parts || []).map((p) => ({ load, part: p })))
        .find(
          ({ part }) =>
            (part.partNumber || "").toUpperCase() === partNumber &&
            part.ticketCode === result.partDetails.ticketCode,
        );

      if (existingLoadEntry) {
        const existingTestName = existingLoadEntry.part.testName || "another test";
        toast({
          variant: "destructive",
          title: "Part Already Loaded",
          description: `Part ${partNumber} is already loaded under ticket ${result.partDetails.ticketCode} in test: ${existingTestName}.`,
          duration: 2000,
        });
        return;
      }

      // Reuse checkpoint setup from an existing part in this group (keeps checkpointInfo/indices)
      const checkpointTemplate =
        editingParts[0] ||
        (editingLoad.parts || []).find(
          (p) => (p.testName || "") === (editingTestName || editingGroupMeta.testName),
        );

      const newPart: Part = {
        id: Date.now(),
        partNumber: result.partDetails.partNumber,
        serialNumber: result.partDetails.partNumber,
        ticketCode: result.partDetails.ticketCode,
        project: result.partDetails.project,
        build: result.partDetails.build,
        colour: result.partDetails.colour,
        source: result.partDetails.source,
        processStage: result.partDetails.processStage,
        customImages: [],
        cosmeticImages: [],
        nonCosmeticImages: [],
        scanStatus: "OK",
        testId: editingGroupMeta.testId,
        testName: editingTestName || editingGroupMeta.testName,
        testCondition: editingGroupMeta.testCondition,
        duration: editingGroupMeta.duration,
        checkpointInfo: checkpointTemplate?.checkpointInfo,
        checkpoint: checkpointTemplate?.checkpoint ?? null,
        checkpointIndex: checkpointTemplate?.checkpointIndex ?? 0,
        totalCheckpoints: checkpointTemplate?.totalCheckpoints ?? (checkpointTemplate?.checkpointInfo as any)?.totalCheckpoints ?? null,
      };

      setEditingParts((prev) => [...prev, newPart]);
      setEditPartInput("");
    } catch (error) {
      console.error("Error scanning part for edit", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Failed to scan part. Please try again.",
        duration: 2000,
      });
    } finally {
      setEditScanning(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!editingLoad || !editingGroupMeta) return;

    setSavingEdit(true);

    const chosenTest = selectedTestOption;

    const remainingParts = editingLoad.parts.filter(
      (part) => part.testName !== editingOriginalTestName,
    );

    const updatedGroupParts = editingParts.map((part) => ({
      ...part,
      testName: chosenTest?.testName || editingTestName || part.testName,
      testId: chosenTest?.id ?? part.testId ?? editingGroupMeta.testId,
      testCondition: chosenTest?.testCondition ?? part.testCondition ?? editingGroupMeta.testCondition,
      duration: chosenTest?.time ? Number(chosenTest.time) : part.duration ?? editingGroupMeta.duration,
      testUnit: chosenTest?.unit || part.testUnit,
    }));

    const findMachineByDescription = (desc?: string | null) => {
      if (!desc) return null;
      const norm = desc.toLowerCase().trim();
      return (
        machineData.find((m) => m.machine_description?.toLowerCase() === norm) ||
        machineData.find((m) => m.machine_description?.toLowerCase().includes(norm)) ||
        null
      );
    };

    const resolveTargetMachine = (test?: AllocationTestDto | null) => {
      const testName = test?.testName || "";
      const equip = (test as any)?.machineEquipment || (test as any)?.machineEquipment2 || "";
      const candidates = [equip, testName].filter(Boolean) as string[];

      // explicit keyword routing
      const keyword = candidates.join(" ").toLowerCase();
      if (keyword.includes("immersion")) {
        const tap = findMachineByDescription("Tap Immersion");
        if (tap) return tap;
      }
      if (keyword.includes("salt spray") || keyword.includes("sst")) {
        const sst = findMachineByDescription("Salt Spray");
        if (sst) return sst;
      }

      // fallback: try any candidate description
      for (const c of candidates) {
        const found = findMachineByDescription(c);
        if (found) return found;
      }

      return null;
    };

    const isSwitchingTest = chosenTest && String(chosenTest.id) !== String(editingGroupMeta.testId);
    const targetMachine = isSwitchingTest ? resolveTargetMachine(chosenTest) : null;

    const targetMachineId = targetMachine?.machine_id || editingLoad.machineId || editingLoad.chamber;
    const updatedMachineDescription = targetMachine?.machine_description || editingLoad.machineDescription;
    const updatedMachineDetails = isSwitchingTest
      ? {
        ...(editingLoad.machineDetails || {}),
        machineDescription: updatedMachineDescription,
        machineId: targetMachineId,
        machine: targetMachine?.machine_description || (editingLoad.machineDetails as any)?.machine,
        selectedTest: {
          ...(editingLoad.machineDetails as any)?.selectedTest,
          testName: chosenTest?.testName || (editingLoad.machineDetails as any)?.selectedTest?.testName,
          displayName: chosenTest?.displayName || (editingLoad.machineDetails as any)?.selectedTest?.displayName,
          time: chosenTest?.time ?? (editingLoad.machineDetails as any)?.selectedTest?.time,
          unit: chosenTest?.unit ?? (editingLoad.machineDetails as any)?.selectedTest?.unit,
          testCondition: chosenTest?.testCondition ?? (editingLoad.machineDetails as any)?.selectedTest?.testCondition,
        },
      }
      : (editingLoad.machineDetails || {});

    const updatedLoad: ChamberLoad = {
      ...editingLoad,
      parts: [...remainingParts, ...updatedGroupParts],
      chamber: targetMachineId,
      machineId: targetMachineId,
      machineDescription: updatedMachineDescription,
      machineDetails: updatedMachineDetails,
      selectedTestName:
        editingLoad.selectedTestName === editingOriginalTestName
          ? chosenTest?.testName || editingTestName
          : editingLoad.selectedTestName,
      selectedTestId: chosenTest?.id ?? editingLoad.selectedTestId,
      testUnit: chosenTest?.unit || editingLoad.testUnit,
      testValue: chosenTest?.time ? Number(chosenTest.time) : editingLoad.testValue,
    };


    console.log(updatedLoad)

    try {
      const partsCount = updatedGroupParts.length;

      if (partsCount > 0 && editingLoad.ticketCode && chosenTest?.id) {
        try {
          await rebalanceAllocations(editingLoad.ticketCode, editingGroupMeta.testId, chosenTest.id, partsCount);
          setAllocationWarning(null);
        } catch (allocErr) {
          console.error("Allocation rebalance failed", allocErr);
          setAllocationWarning("Allocation update failed; please review ticket allocations manually.");
        }
      }

      const saved = await updateChamberLoad(editingLoad.id, {
        parts: updatedLoad.parts,
        selectedTestName: updatedLoad.selectedTestName,
        selectedTestId: updatedLoad.selectedTestId,
        testUnit: updatedLoad.testUnit,
        testValue: updatedLoad.testValue,
        chamber: updatedLoad.chamber,
        machineId: updatedLoad.machineId,
        machineDescription: updatedLoad.machineDescription,
        machineDetails: updatedLoad.machineDetails,
        allowMachineChange: isSwitchingTest,
      });

      const nextLoad = saved || updatedLoad;

      // Sync testing_parts table with the same payload shape
      try {
        await updateTestingPartInBackend(editingLoad.id, {
          id: editingLoad.id,
          chamber: nextLoad.chamber,
          machineId: nextLoad.machineId,
          machineDescription: nextLoad.machineDescription,
          parts: nextLoad.parts,
          machineDetails: nextLoad.machineDetails,
          loadedAt: nextLoad.loadedAt,
          status: nextLoad.status,
          testUnit: nextLoad.testUnit,
          testValue: nextLoad.testValue,
          testStarted: nextLoad.testStarted,
          testStatus: nextLoad.testStatus,
          timerStatus: nextLoad.timerStatus,
          timerStartTime: nextLoad.timerStartTime,
          actualStartTime: nextLoad.actualStartTime,
          isCompleted: nextLoad.isCompleted,
          completedAt: nextLoad.completedAt,
          lastUpdated: new Date().toISOString(),
          totalParts: nextLoad.parts?.length ?? 0,
          selectedTestId: nextLoad.selectedTestId,
          selectedTestName: nextLoad.selectedTestName,
          isCombinedTest: nextLoad.isCombinedTest,
          estimatedCompletion: nextLoad.estimatedCompletion,
          ticketCode: nextLoad.ticketCode,
          testUnit: nextLoad.testUnit,
          testValue: nextLoad.testValue,
          selectedTestId: nextLoad.selectedTestId,
        });
      } catch (testingSyncError) {
        console.error("Failed to update testing_parts", testingSyncError);
      }

      setLocalChamberLoads((prev) =>
        prev.map((load) => (load.id === editingLoad.id ? { ...load, ...nextLoad } : load)),
      );

      resetEditState();
    } catch (error) {
      console.error("Failed to update load", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update load. Please try again.",
        duration: 2000,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const rebalanceAllocations = async (
    ticketCode: string,
    oldTestId: string | undefined,
    newTestId: string | number,
    delta: number,
  ) => {
    const allocations = await fetchAllocations();
    const target = allocations.find((a) => a.ticketCode === ticketCode);
    if (!target) return;

    const adjust = (tests: AllocationTestDto[], testId: string | number, change: number): boolean => {
      let updated = false;
      tests.forEach((t) => {
        if (String(t.id) === String(testId)) {
          const current = t.remainingParts ?? 0;
          t.remainingParts = Math.max(0, Number(current) + change);
          updated = true;
        }
        if (Array.isArray(t.childTests) && t.childTests.length > 0) {
          updated = adjust(t.childTests, testId, change) || updated;
        }
      });
      return updated;
    };

    if (oldTestId) {
      adjust(target.testAllocations, oldTestId, delta);
    }
    adjust(target.testAllocations, newTestId, -delta);

    await updateBackendAllocation(ticketCode, {
      testAllocations: target.testAllocations,
      updatedAt: new Date().toISOString(),
    });
  };

  const processLoadForDisplay = (load: ChamberLoad) => {
    const testGroups: Record<string, any> = {};

    load.parts.forEach(part => {
      const testKey = part.testName || 'Unknown Test';
      if (!testGroups[testKey]) {
        testGroups[testKey] = {
          testName: testKey,
          testId: part.testId,
          parts: [],
          duration: part.duration,
          testCondition: part.testCondition,
        };
      }
      testGroups[testKey].parts.push(part);
    });

    return Object.values(testGroups);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (hours: number | undefined | null) => {
    if (!hours) return '0h';

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  const calculateTimeRemaining = (load: ChamberLoad) => {

// ✅ Check completed FIRST, before any timer status checks
  if (load.isCompleted || load.status === 'completed' || load.testStatus === 'completed') {
    return {
      statusText: 'Completed',
      isCompleted: true,
      isExpired: true,
      estimatedEndTime: load.completedAt ? new Date(load.completedAt) : null,
      timeRemainingText: 'Completed'
    };
  }

  // Check for paused status
  if (load.timerStatus === 'paused') {
    return {
      statusText: 'Paused',
      isCompleted: false,
      isExpired: false,
      estimatedEndTime: null,
      timeRemainingText: 'Paused'
    };
  }

  // Check if test hasn't started
  if (!load.timerStartTime || load.timerStatus !== 'start') {
    return {
      statusText: 'Not Started',
      isCompleted: false,
      isExpired: false,
      estimatedEndTime: null,
      timeRemainingText: 'Not Started'
    };
  }

    // Check for paused status
    if (load.timerStatus === 'paused') {
      return {
        statusText: 'Paused',
        isCompleted: false,
        isExpired: false,
        estimatedEndTime: null,
        timeRemainingText: 'Paused'
      };
    }

    // Check if test hasn't started
    if (!load.timerStartTime || load.timerStatus !== 'start') {
      return {
        statusText: 'Not Started',
        isCompleted: false,
        isExpired: false,
        estimatedEndTime: null,
        timeRemainingText: 'Not Started'
      };
    }

    const now = new Date();
    const startTime = new Date(load.timerStartTime);

    // Get total duration from testValue (in hours)
    const totalDurationHours = load.testValue || load.duration || 0;
    const durationInMs = totalDurationHours * 60 * 60 * 1000;

    // Add paused time if any
    const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;

    // Calculate end time
    const endTime = new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);

    // Calculate remaining time
    const remainingMs = endTime.getTime() - now.getTime();

    if (remainingMs <= 0) {
      return {
        statusText: 'Completed',
        isCompleted: true,
        isExpired: true, // Technically expired since time is up
        estimatedEndTime: endTime,
        timeRemainingText: 'Completed'
      };
    }

    // Calculate remaining hours/minutes
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let timeRemainingText = '';
    if (hours > 0) {
      timeRemainingText = `${hours}h ${minutes}m`;
    } else {
      timeRemainingText = `${minutes}m ${seconds}s`;
    }

    return {
      statusText: 'Active',
      isCompleted: false,
      isExpired: false,
      estimatedEndTime: endTime,
      timeRemainingText: `${timeRemainingText} remaining`,
      rawRemainingMs: remainingMs
    };
  };

  const getStatusInfo = (load: ChamberLoad) => {
    const timeInfo = calculateTimeRemaining(load);

    if (timeInfo.statusText === 'Completed' || timeInfo.isCompleted) {
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      };
    } else if (timeInfo.statusText === 'Paused') {
      return {
        label: 'Paused',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏸️'
      };
    } else if (timeInfo.statusText === 'Not Started') {
      return {
        label: 'Not Started',
        color: 'bg-gray-100 text-gray-800',
        icon: '⏱️'
      };
    } else if (timeInfo.rawRemainingMs && timeInfo.rawRemainingMs < 60 * 60 * 1000) { // Less than 1 hour
      return {
        label: 'Finishing Soon',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⚠️'
      };
    } else {
      return {
        label: 'Active',
        color: 'bg-blue-100 text-blue-800',
        icon: '▶️'
      };
    }
  };

  if (!isOpen || !machineIdentifier) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Testing - {machineIdentifier}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Load Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loaded At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Remaining / End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Groups & Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeMachineLoads.map((load, loadIndex) => {
                    const statusInfo = getStatusInfo(load);
                    const testGroups = processLoadForDisplay(load);
                    const timeInfo = calculateTimeRemaining(load);

                    return (
                      <React.Fragment key={load.id}>
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4" colSpan="5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-gray-800">
                                  Load #{loadIndex + 1} - ID: {load.id}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Equipment: {load.machineId} |
                                  Ticket: {load.machineDetails?.ticketCode || 'N/A'} |
                                  Project: {load.machineDetails?.project || 'N/A'} / {load.machineDetails?.build || 'N/A'} |
                                  Colour: {load.machineDetails?.colour || 'N/A'}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {load.parts.length} part(s) • {testGroups.length} test group(s) • Unit: {load.testUnit}
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 font-medium">
                              {load.chamber}
                            </div>
                            <div className="text-xs text-gray-500">
                              Equipment ID: {load.machineId}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">
                                {formatDuration(load.testValue || load.duration)}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({load.testUnit})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDateTime(load.loadedAt)}</div>
                            {load.timerStartTime && (
                              <div className="text-xs text-gray-500">
                                Started: {formatDateTime(load.timerStartTime)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {/* Status Badge */}
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                <span className="mr-1">{statusInfo.icon}</span>
                                {statusInfo.label}
                              </div>

                              {/* Time Information */}
                              {timeInfo.estimatedEndTime && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <div className="font-medium">Ends at:</div>
                                  <div>{formatDateTime(timeInfo.estimatedEndTime.toISOString())}</div>
                                </div>
                              )}

                              {/* Time Remaining */}
                              <div className={`text-sm font-medium ${statusInfo.label === 'Active' ? 'text-blue-600' :
                                statusInfo.label === 'Finishing Soon' ? 'text-yellow-600' :
                                  statusInfo.label === 'Completed' ? 'text-green-600' :
                                    statusInfo.label === 'Paused' ? 'text-yellow-600' :
                                      'text-gray-600'
                                }`}>
                                {timeInfo.timeRemainingText}
                              </div>

                              {/* Progress Bar (optional visual indicator) */}
                              {load.timerStartTime && timeInfo.rawRemainingMs && !timeInfo.isCompleted && (
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{
                                      width: `${Math.max(5, 100 - ((timeInfo.rawRemainingMs / (load.testValue * 60 * 60 * 1000)) * 100))}%`
                                    }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {testGroups.map((testGroup, groupIndex) => (
                                <div key={groupIndex} className="bg-white border-2 border-blue-200 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                        <TestTube size={16} className="text-blue-600" />
                                        {testGroup.testName}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {testGroup.parts.length} parts • {formatDuration(testGroup.duration)}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => startEditingGroup(load, testGroup)}
                                        className="flex items-center gap-1 px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-md"
                                      >
                                        <Pencil size={14} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => onNavigateToTesting(load, testGroup)}
                                        className="flex items-center gap-1 px-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium shadow-md"
                                      >
                                        <TestTube size={14} />
                                        Test All ({testGroup.parts.length})
                                      </button>
                                      {statusInfo.label !== 'Completed' && (
                                        <button
                                          onClick={() => onMarkComplete(load.id)}
                                          className="flex items-center gap-1 px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium shadow-md"
                                        >
                                          <CheckCircle size={14} />
                                          Mark Complete
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onDeleteLoad(load)}
                                        className="flex items-center gap-2 px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium shadow-md"
                                      >
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {testGroup.parts.map((part, partIndex) => (
                                      <div key={partIndex} className="text-xs text-gray-600 flex items-center gap-2 py-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <span className="font-medium">{part.partNumber}</span>

                                        {part.checkpoint && (
                                          <span className="text-purple-600 font-semibold ml-2">
                                            [{part.checkpoint}]
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {activeMachineLoads.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 text-lg">No loads found for this equipment</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit test group dialog */}
      <Dialog open={editDialogOpen} onOpenChange={resetEditState}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">
              Edit Test Group {editingOriginalTestName ? `- ${editingOriginalTestName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Switch Test</label>
                <select
                  value={selectedTestOption ? String(selectedTestOption.id) : ""}
                  onChange={(e) => {
                    const next = availableTests.find((t: any) => String(t.id) === e.target.value) || null;
                    setSelectedTestOption(next);
                    setEditingTestName(next?.testName || "");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loadingTests}
                >
                  <option value="">Select a test...</option>
                  {availableTests.map((t: any) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.displayName || t.testName}
                    </option>
                  ))}
                </select>
                {loadingTests && (
                  <p className="text-xs text-gray-500 mt-1">Loading available tests…</p>
                )}
                {!loadingTests && availableTests.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No tests available for this ticket.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Changing the test will move this load to the new test’s equipment and rebalance allocations.</p>
              </div>
              <div className="flex items-end justify-end text-sm text-gray-600">
                <div className="text-right">
                  <div className="font-medium">Parts in group</div>
                  <div>{editingParts.length}</div>
                </div>
              </div>
            </div>

            {editingLoad?.timerStatus === 'start' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                Timer is running. Switching tests will proceed, but verify timing on the new equipment.
              </div>
            )}
            {allocationWarning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                {allocationWarning}
              </div>
            )}

            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700">Add or scan parts</div>
                {editingLoad && (
                  <div className="text-xs text-gray-500">Load ID: {editingLoad.id}</div>
                )}
              </div>
              <PartScanner
                partInput={editPartInput}
                onInputChange={setEditPartInput}
                onScan={handleEditPartScan}
                scanning={editScanning}
                disabled={!editingTestName}
                selectedTestAggregated={scannerTestObject}
                testStarted
                scannedParts={editingParts}
                sessionTicketCode={editingParts[0]?.ticketCode}
                enableRealtimeScan
                autoEnableScanner
              />
            </div>

            <div className="space-y-3">
              {editingParts.length === 0 && (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 text-center">
                  No parts in this group yet. Scan a part to add it.
                </div>
              )}

              {editingParts.map((part, index) => (
                <div
                  key={part.id || `${part.partNumber}-${index}`}
                  className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold text-gray-800">{part.partNumber}</div>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Ticket: {part.ticketCode}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {part.project && <span className="mr-3">Project: {part.project}</span>}
                        {part.build && <span className="mr-3">Build: {part.build}</span>}
                        {part.colour && <span className="mr-3">Colour: {part.colour}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEditingPart(part.id as number)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <PartImageUpload
                    part={part}
                    isWatch={(part.ticketCode || "").split("_")[2]?.toUpperCase() === "W"}
                    onImageUpload={(label, file) => handleImageUploadForPart(part.id as number, label, file)}
                    onImageRemove={(imgIndex, image) => handleImageRemoveForPart(part.id as number, imgIndex, image)}
                    isUploadingImage={isUploading(part.id as number)}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetEditState}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                disabled={savingEdit || !editingLoad}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestingModal;