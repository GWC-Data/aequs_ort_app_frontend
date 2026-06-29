import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Table,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { machineData, MachineItem } from "@/data/MachineData";
import { useChamberLoads } from "./hooks/useChamberLoads";
import { useMachineAvailability } from "./hooks/useMachineAvailability";
import MachineTableView from "./components/MachineTableView";
import CalendarView from "./components/CalendarView";
import LoadEquipmentModal from "./components/LoadEquipmentModal";
import TestingModal from "./components/TestingModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import MachineDetailsModal from "./components/MachineDetailsModal";
import StatusLegend from "./components/StatusLegend";
import { apiService } from "@/lib/backendApi";
import { toast } from "@/components/ui/use-toast";

const PlanningPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MachineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [selectedChamber, setSelectedChamber] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showTestingModal, setShowTestingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMachineDetailsModal, setShowMachineDetailsModal] = useState(false);

  // Selected Items
  const [selectedChamberForTesting, setSelectedChamberForTesting] = useState<
    string | null
  >(null);
  const [loadToDelete, setLoadToDelete] = useState<any>(null);
  const [selectedMachineDetails, setSelectedMachineDetails] =
    useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Custom Hooks
  const {
    chamberLoads,
    refreshChamberLoads,
    deleteChamberLoad,
    startChamberLoad,
    pauseChamberLoad,
    resumeChamberLoad,
    completeChamberLoad,
  } = useChamberLoads();

  const {
    machineAvailability,
    calculateMachineAvailability,
    getEquipmentStatus,
    getMachineTimerStatus,
    getEstimatedCompletion,
    calculateRemainingTime,
    isLoadCompleted,
    isLoadActive,
    setChamberLoading,
    refreshAvailability,
  } = useMachineAvailability(data, chamberLoads, selectedChamber);

  const loadMachineDataFromDB = async () => {
    try {
      const dbMachines = await apiService.getMachineDetails();
      const machines: MachineItem[] = dbMachines.map((item, idx) => ({
        sr_no: idx + 1,
        machine_id: String(item.machineId || "").trim(),
        machine_description: String(item.machineDescription || "").trim(),
      }));

      console.log("DB machine data loaded:", machines);

      if (machines.length === 0) {
        console.warn("No machine data found in Machine_Details database config");
        setError("No machine data found in database configuration");
        return [];
      }

      return machines;
    } catch (error) {
      console.error("Error loading Machine_Details from Database:", error);
      setError("Failed to load machine data from database");
      return [];
    }
  };

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Update availability periodically
  useEffect(() => {
    if (data.length > 0 && chamberLoads.length > 0) {
      calculateMachineAvailability();

      // Update every minute for running timers
      const interval = setInterval(() => {
        const hasActiveLoads = chamberLoads.some(
          (load) =>
            !isLoadCompleted(load) &&
            (load.timerStatus === "start" || load.timerStatus === "paused"),
        );

        if (hasActiveLoads) {
          calculateMachineAvailability();
        }
      }, 60000); // Every minute

      return () => clearInterval(interval);
    }
  }, [data, chamberLoads, calculateMachineAvailability, isLoadCompleted]);

  const getUserRole = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    try {
      const userData = JSON.parse(user);
      return userData.role || localStorage.getItem("userRole");
    } catch {
      return localStorage.getItem("userRole");
    }
  };

  const userRole = getUserRole();

  const initializeData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load machine data from DB
      const machinesFromExcel = await loadMachineDataFromDB();
      console.log("Machines from DB:", machinesFromExcel);

      if (machinesFromExcel.length > 0) {
        // Sort by sr_no
        const sortedMachineData = [...machinesFromExcel].sort(
          (a, b) => a.sr_no - b.sr_no,
        );
        setData(sortedMachineData);
      } else {
        // Fallback to hardcoded data if Excel loading fails
        console.warn("Using fallback machine data");
        // If you still have machineData import, uncomment below:
        // const sortedMachineData = [...machineData].sort((a, b) => a.sr_no - b.sr_no);
        // setData(sortedMachineData);
      }

      // Refresh chamber loads
      await refreshChamberLoads();

      // Initial availability calculation
      calculateMachineAvailability();
    } catch (err) {
      console.error("Error initializing data:", err);
      setError("Failed to load equipment data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadChamber = (machineIdentifier: string) => {
    setSelectedChamber(machineIdentifier);
    setShowLoadModal(true);
  };

  const handleViewMachineDetails = (machine: MachineItem) => {
    // Get active loads for this machine
    const machineLoads = chamberLoads.filter(
      (load) =>
        load.chamber === machine.machine_id ||
        load.chamber === machine.machine_description ||
        load.machineId === machine.machine_id ||
        load.machineDescription === machine.machine_description,
    );

    const activeLoads = machineLoads.filter((load) => !isLoadCompleted(load));
    const completedLoads = machineLoads.filter(isLoadCompleted);

    const machineDetails = {
      ...machine,
      lastCalibration: "26-04-2025",
      nextCalibration: "26-04-2026",
      lastChamberCleaning: "09-12-2025",
      chamberId: machine.machine_id,
      labTemperature: "19°C",
      labHumidity: "40%",
      notes: "Strictly this data should remain with Aequa",
      allEquipmentIds: data
        .filter((m) => m.machine_description === machine.machine_description)
        .map((m) => m.machine_id),
      activeLoads: activeLoads.length,
      completedLoads: completedLoads.length,
      totalLoads: machineLoads.length,
      currentStatus:
        getEquipmentStatus(machine.machine_id)?.status || "available",
    };

    setSelectedMachineDetails(machineDetails);
    setShowMachineDetailsModal(true);
  };

  const handleOpenTestingModal = (machineIdentifier: string) => {
    const machineLoads = chamberLoads.filter(
      (load) =>
        load.chamber === machineIdentifier ||
        data.find((m) => m.machine_id === machineIdentifier)
          ?.machine_description === load.chamber,
    );

    const activeLoads = machineLoads.filter((load) => !isLoadCompleted(load));

    if (activeLoads.length === 0) {
      toast({
        variant: "warning",
        title: "No Active Loads",
        description: "No active loads found for this equipment",
        duration: 2000,
      });
      return;
    }

    setSelectedChamberForTesting(machineIdentifier);
    setShowTestingModal(true);
  };

  const handlePauseTimer = async (machineIdentifier: string) => {
    const machine = data.find((m) => m.machine_id === machineIdentifier);
    if (!machine) return;

    const machineLoads = chamberLoads.filter(
      (load) =>
        (load.chamber === machineIdentifier ||
          load.chamber === machine.machine_description) &&
        !isLoadCompleted(load) &&
        load.timerStatus === "start",
    );

    if (machineLoads.length === 0) {
      toast({
        variant: "warning",
        title: "No Tests to Pause",
        description: "No active tests found to pause",
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      await Promise.all(machineLoads.map((load) => pauseChamberLoad(load.id)));
      await refreshChamberLoads();
      refreshAvailability();
      setError(null);
      toast({
        variant: "success",
        title: "Tests Paused",
        description: `Test paused for ${machineIdentifier} (${machineLoads.length} load(s) affected).`,
        duration: 2000,
      });
    } catch (err) {
      console.error("Error pausing tests:", err);
      setError("Failed to pause tests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTimer = async (machineIdentifier: string) => {
    const machine = data.find((m) => m.machine_id === machineIdentifier);
    if (!machine) return;

    const machineLoads = chamberLoads.filter(
      (load) =>
        (load.chamber === machineIdentifier ||
          load.chamber === machine.machine_description) &&
        !isLoadCompleted(load) &&
        load.timerStatus === "paused",
    );

    if (machineLoads.length === 0) {
      toast({
        variant: "warning",
        title: "No Tests to Resume",
        description: "No paused tests found to resume",
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      await Promise.all(machineLoads.map((load) => resumeChamberLoad(load.id)));
      await refreshChamberLoads();
      refreshAvailability();
      setError(null);
      toast({
        variant: "success",
        title: "Tests Resumed",
        description: `Test resumed for ${machineIdentifier} (${machineLoads.length} load(s) affected).`,
        duration: 2000,
      });
    } catch (err) {
      console.error("Error resuming tests:", err);
      setError("Failed to resume tests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async (machineIdentifier: string) => {
    const machine = data.find((m) => m.machine_id === machineIdentifier);
    if (!machine) return;

    const machineLoads = chamberLoads.filter(
      (load) =>
        (load.chamber === machineIdentifier ||
          load.chamber === machine.machine_description) &&
        !isLoadCompleted(load) &&
        load.timerStatus === "stop" &&
        load.testStatus === "pending",
    );

    if (machineLoads.length === 0) {
      toast({
        variant: "warning",
        title: "No Tests to Start",
        description: "No pending tests found to start",
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      await Promise.all(machineLoads.map((load) => startChamberLoad(load.id)));
      await refreshChamberLoads();
      refreshAvailability();
      setError(null);
      toast({
        variant: "success",
        title: "Tests Started",
        description: `Test started for ${machineIdentifier} (${machineLoads.length} load(s) affected).`,
        duration: 2000,
      });
    } catch (err) {
      console.error("Error starting tests:", err);
      setError("Failed to start tests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToTestingForPart = (load: any, testGroup: any) => {
    const record = {
      loadId: load.id,
      chamber: load.chamber,
      parts: testGroup.parts,
      totalParts: testGroup.parts.length,
      machineDetails: load.machineDetails || {},
      loadedAt: load.loadedAt,
      estimatedCompletion: getEstimatedCompletion?.(load)?.toISOString(),
      duration: load.duration,
      testRecords: testGroup.parts,
      timerStatus: load.timerStatus,
      timerStartTime: load.timerStartTime,
      testName: testGroup.testName,
      testId: testGroup.testId,
      remainingTime: calculateRemainingTime?.(load) || 0,
    };

    // In your navigation code:
    navigate(`/form-default/${record.id || record.loadId}`, {
      state: { record },
    });
  };

  const handleRefresh = async () => {
    await initializeData();
  };

  const getDisplayMachineDescription = useCallback(
    (machine: MachineItem) => {
      const matchesMachine = (load: any) =>
        load.machineId === machine.machine_id ||
        load.chamber === machine.machine_id ||
        load.chamber === machine.machine_description ||
        load.machineDescription === machine.machine_description ||
        load.machineDetails?.machineDescription === machine.machine_description;

      const activeLoad = chamberLoads.find(
        (load) => matchesMachine(load) && !isLoadCompleted(load),
      );
      const anyLoad =
        activeLoad || chamberLoads.find((load) => matchesMachine(load));

      return (
        machine.machine_description ||
        anyLoad?.machineDescription ||
        anyLoad?.machineDetails?.machineDescription
      );
    },
    [chamberLoads, isLoadCompleted],
  );

  // Format remaining time for display
  const formatTime = (seconds: number) => {
    if (seconds < 0) return "00:00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Equipment Schedule Gantt Chart
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Timeline view of equipment testing schedules
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Available:{" "}
                    {
                      Object.values(machineAvailability)
                        .flatMap((m) => Object.values(m))
                        .filter((m) => m.status === "available").length
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Occupied:{" "}
                    {
                      Object.values(machineAvailability)
                        .flatMap((m) => Object.values(m))
                        .filter((m) => m.status === "occupied").length
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Active Loads:{" "}
                    {
                      chamberLoads.filter((load) => !isLoadCompleted(load))
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-all ${viewMode === "table"
                  ? "bg-blue-600 text-white shadow-inner"
                  : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Table size={16} />
                Table View
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-all ${viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-inner"
                  : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Calendar size={16} />
                Calendar View
              </button>
            </div>

            {/* Timeline Selector */}
            {viewMode === "calendar" && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">
                  Timeline:
                </label>
                <select
                  value={numberOfDays}
                  onChange={(e) => setNumberOfDays(parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <div>
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-sm text-red-600 hover:text-red-800 font-medium mt-1"
                >
                  Click here to try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading equipment data...
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Please wait while we fetch the latest information
            </p>
          </div>
        ) : (
          <>
            {/* Main Content */}
            {viewMode === "calendar" ? (
              <CalendarView
                data={data}
                numberOfDays={numberOfDays}
                chamberLoads={chamberLoads}
                onLoadChamber={handleLoadChamber}
                onViewDetails={handleViewMachineDetails}
                onOpenTesting={handleOpenTestingModal}
                getEquipmentStatus={getEquipmentStatus}
                calculateRemainingTime={calculateRemainingTime}
                getDisplayMachineDescription={getDisplayMachineDescription}
              />
            ) : (
              <MachineTableView
                data={data}
                chamberLoads={chamberLoads}
                onLoadChamber={handleLoadChamber}
                onViewDetails={handleViewMachineDetails}
                onOpenTesting={handleOpenTestingModal}
                onPauseTimer={handlePauseTimer}
                onResumeTimer={handleResumeTimer}
                getEquipmentStatus={getEquipmentStatus}
                getMachineTimerStatus={getMachineTimerStatus}
                calculateRemainingTime={calculateRemainingTime}
                getDisplayMachineDescription={getDisplayMachineDescription}
                userRole={userRole}
              />
            )}

            {/* Status Legend */}
            <StatusLegend
              viewMode={viewMode}
              numberOfDays={numberOfDays}
              data={data}
              chamberLoads={chamberLoads}
              getEquipmentStatus={getEquipmentStatus}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <LoadEquipmentModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        selectedChamber={selectedChamber}
        data={data}
        onLoadComplete={initializeData}
        setChamberLoading={setChamberLoading}
      />

      <TestingModal
        isOpen={showTestingModal}
        onClose={() => setShowTestingModal(false)}
        machineIdentifier={selectedChamberForTesting}
        chamberLoads={chamberLoads}
        onNavigateToTesting={handleNavigateToTestingForPart}
        onDeleteLoad={(load) => {
          setLoadToDelete(load);
          setShowDeleteConfirm(true);
        }}
        onMarkComplete={async (loadId) => {
          setLoading(true);
          try {
            await completeChamberLoad(loadId);
            await refreshChamberLoads();
            refreshAvailability();
            setError(null);
          } catch (err) {
            console.error("Error completing load:", err);
            setError("Failed to mark load complete. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
        getEquipmentStatus={getEquipmentStatus}
        calculateRemainingTime={calculateRemainingTime}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setLoadToDelete(null);
        }}
        load={loadToDelete}
        onConfirm={async () => {
          if (!loadToDelete) {
            return;
          }

          setLoading(true);
          try {
            await deleteChamberLoad(loadToDelete.id);
            await refreshChamberLoads();
            refreshAvailability();
            setError(null);
          } catch (err) {
            console.error("Error deleting load:", err);
            setError("Failed to delete load. Please try again.");
          } finally {
            setShowDeleteConfirm(false);
            setLoadToDelete(null);
            setLoading(false);
          }
        }}
      />

      <MachineDetailsModal
        isOpen={showMachineDetailsModal}
        onClose={() => setShowMachineDetailsModal(false)}
        machine={selectedMachineDetails}
        getEquipmentStatus={getEquipmentStatus}
        chamberLoads={chamberLoads.filter(
          (load) =>
            load.chamber === selectedMachineDetails?.machine_id ||
            load.chamber === selectedMachineDetails?.machine_description,
        )}
      />
    </div>
  );
};

export default PlanningPage;
