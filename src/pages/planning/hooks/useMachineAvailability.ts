import { useState, useCallback, useMemo } from 'react';
import { MachineItem, ChamberLoad, MachineAvailability, TimerStatus } from '../types';

export const useMachineAvailability = (
  data: MachineItem[],
  chamberLoads: ChamberLoad[],
  selectedChamber?: string
) => {
  const [machineAvailability, setMachineAvailability] = useState<MachineAvailability>({});
  const [chamberLoadingStatus, setChamberLoadingStatus] = useState<Record<string, boolean>>({});

  // Helper function to calculate total duration in seconds based on testUnit and testValue
  // const calculateTotalDuration = useCallback((load: ChamberLoad): number => {
  //   const { testUnit, testValue } = load;
    
  //   if (testValue === null || testValue === undefined || testValue <= 0) {
  //     return 0;
  //   }

  //   switch (testUnit) {
  //     case 'hour':
  //       return testValue * 3600; // hours to seconds
  //     case 'minute':
  //       return testValue * 60; // minutes to seconds
  //     case 'cycle':
  //       // For cycles, check if we have cycle duration in machineDetails
  //       // or use a default (1 hour per cycle)
  //       const cycleDuration = load.machineDetails?.cycleDuration || 
  //                            load.machineDetails?.tests?.[0]?.cycleDuration || 
  //                            3600; // default 1 hour per cycle
  //       return testValue * cycleDuration;
  //     case 'day':
  //       return testValue * 86400; // days to seconds
  //     case 'second':
  //       return testValue; // already in seconds
  //     default:
  //       console.warn(`Unknown testUnit: ${testUnit} for load:`, load.id);
  //       return 0;
  //   }
  // }, []);

  const calculateTotalDuration = useCallback((load: ChamberLoad): number => {
  const testUnit = (load.testUnit || '').toLowerCase().trim();
  const testValue = load.testValue;
  
  if (testValue === null || testValue === undefined || testValue <= 0) {
    return 0;
  }

  switch (testUnit) {
    case 'hours':
    case 'hour':
      return testValue * 3600;
    case 'minute':
    case 'minutes':
      return testValue * 60;
    case 'cycle':
    case 'cycles':
      // Cycles don't have a time duration — return 0 so no countdown shows
      return 0;
    case 'day':
    case 'days':
      return testValue * 86400;
    case 'second':
    case 'seconds':
      return testValue;
    default:
      return 0;
  }
}, []);

  // Helper function to calculate elapsed time in seconds
  const calculateElapsedTime = useCallback((load: ChamberLoad): number => {
    if (!load.timerStartTime) return 0;

    const startTime = new Date(load.timerStartTime);
    const now = new Date();
    let elapsedSeconds = Math.floor((now - startTime) / 1000);

    // Subtract total paused time if any
    if (load.totalPausedTime) {
      elapsedSeconds -= load.totalPausedTime;
    }

    return Math.max(0, elapsedSeconds);
  }, []);

  // Calculate remaining time for a load
  const calculateRemainingTime = useCallback((load: ChamberLoad): number => {
    if (!load || load.isCompleted || load.testStatus === 'completed') {
      return 0;
    }

    const totalDuration = calculateTotalDuration(load);
    
    if (totalDuration <= 0) return 0;

    if (load.timerStatus === 'paused') {
      // If paused, return pausedElapsedTime or total duration
      return load.pausedElapsedTime || totalDuration;
    }

    if (load.timerStatus === 'start' && load.timerStartTime) {
      const elapsed = calculateElapsedTime(load);
      const remaining = Math.max(0, totalDuration - elapsed);
      return remaining;
    }

    // Timer not started yet
    return totalDuration;
  }, [calculateTotalDuration, calculateElapsedTime]);

  // Helper to check if load is completed
  // const isLoadCompleted = useCallback((load: ChamberLoad): boolean => {
  //   return load.isCompleted || 
  //          load.status === 'completed' || 
  //          load.testStatus === 'completed' ||
  //          (load.timerStatus === 'stop' && load.completedAt !== null);
  // }, []);

const isLoadCompleted = useCallback((load: ChamberLoad): boolean => {
  // Must have explicit completion signals, not just timerStatus === 'stop'
  if (load.isCompleted === true) return true;
  if (load.status === 'completed') return true;
  if (load.testStatus === 'completed') return true;
  
  // timerStatus 'stop' only means completed if there's a completedAt timestamp
  // AND isCompleted is explicitly true
  if (load.timerStatus === 'stop' && load.completedAt !== null && load.completedAt !== undefined) return true;
  
  return false;
}, []);

  // Helper to check if load is active (has timer running or paused)
  const isLoadActive = useCallback((load: ChamberLoad): boolean => {
    return !isLoadCompleted(load) && 
           (load.timerStatus === 'start' || load.timerStatus === 'paused');
  }, [isLoadCompleted]);

  // Calculate machine availability
  const calculateMachineAvailability = useCallback(() => {
    const availability: MachineAvailability = {};

    data.forEach(machine => {
      const machineName = machine.machine_description;
      const machineId = machine.machine_id;

      // Find loads for this machine
      const machineLoads = chamberLoads.filter(load =>
        load.chamber === machineId ||
        load.machineId === machineId 
      );

      let status: 'available' | 'occupied' | 'loading' = 'available';

      // Check if chamber is currently loading
      if (chamberLoadingStatus[machineId] && selectedChamber === machineId) {
        status = 'loading';
      }
      // Check if machine has loads
      else if (machineLoads.length > 0) {
        // Check if all loads are completed
        const completedLoads = machineLoads.filter(isLoadCompleted);
        
        if (completedLoads.length === machineLoads.length) {
          status = 'available';
        } else {
          // Check if there are any active loads
          const activeLoads = machineLoads.filter(isLoadActive);
          
          if (activeLoads.length > 0) {
            status = 'occupied';
          } else {
            // Check if there are pending loads (not started yet)
            const pendingLoads = machineLoads.filter(load => 
              !isLoadCompleted(load) && 
              load.timerStatus !== 'start' && 
              load.timerStatus !== 'paused'
            );
            
            if (pendingLoads.length > 0) {
              status = 'occupied'; // Loaded but timer not started
            } else {
              status = 'available';
            }
          }
        }
      }

      // Calculate statistics
      const activeLoadsList = machineLoads.filter(load => !isLoadCompleted(load));
      const activePartsCount = activeLoadsList.reduce((sum, load) => 
        sum + (load.parts?.length || 0), 0
      );
      
      const runningTimers = machineLoads.filter(load => 
        !isLoadCompleted(load) && load.timerStatus === 'start'
      ).length;
      
      const pausedTimersCount = machineLoads.filter(load => 
        !isLoadCompleted(load) && load.timerStatus === 'paused'
      ).length;

      const completedLoadsCount = machineLoads.filter(isLoadCompleted).length;

      // Create or update availability entry
      if (!availability[machineName]) {
        availability[machineName] = {};
      }

      availability[machineName][machineId] = {
        status,
        activeLoads: activeLoadsList.length,
        activeParts: activePartsCount,
        runningTimers,
        pausedTimers: pausedTimersCount,
        lastUpdated: new Date().toISOString(),
        machineId,
        machineDescription: machineName,
        completedTests: completedLoadsCount,
        totalLoads: machineLoads.length,
        loads: machineLoads, // Include full load data if needed
        estimatedCompletion: getEstimatedCompletionForMachine(machineLoads)
      };
    });

    setMachineAvailability(availability);
  }, [data, chamberLoads, chamberLoadingStatus, selectedChamber, isLoadCompleted, isLoadActive]);

  // Get estimated completion time for a machine (earliest among active loads)
  const getEstimatedCompletionForMachine = useCallback((machineLoads: ChamberLoad[]): string | null => {
    const activeLoads = machineLoads.filter(isLoadActive);
    
    if (activeLoads.length === 0) return null;

    const completionTimes = activeLoads
      .map(load => {
        if (!load.timerStartTime) return null;
        const remaining = calculateRemainingTime(load);
        if (remaining <= 0) return null;
        return new Date(new Date(load.timerStartTime).getTime() + remaining * 1000);
      })
      .filter(Boolean) as Date[];

    if (completionTimes.length === 0) return null;

    // Return the earliest completion time
    const earliestCompletion = new Date(Math.min(...completionTimes.map(d => d.getTime())));
    return earliestCompletion.toISOString();
  }, [isLoadActive, calculateRemainingTime]);

  // Get equipment status for a specific machine
  const getEquipmentStatus = useCallback((machineId: string) => {
    const machine = data.find(m => m.machine_id === machineId);
    if (!machine) return null;

    const availability = machineAvailability[machine.machine_description]?.[machineId];
    
    if (availability) {
      return availability;
    }

    // Default status if not calculated yet
    return {
      status: 'available' as const,
      activeLoads: 0,
      activeParts: 0,
      runningTimers: 0,
      pausedTimers: 0,
      lastUpdated: new Date().toISOString(),
      machineId,
      machineDescription: machine.machine_description,
      completedTests: 0,
      totalLoads: 0
    };
  }, [data, machineAvailability]);

  // Get timer status for a specific machine
 const getMachineTimerStatus = useCallback((machineIdentifier: string): TimerStatus | null => {
  const machine = data.find(m =>
    m.machine_id === machineIdentifier ||
    m.machine_description === machineIdentifier
  );

  if (!machine) return null;

  const machineLoads = chamberLoads.filter(load =>
    load.chamber === machine.machine_id ||
    load.chamber === machine.machine_description ||
    load.machineId === machine.machine_id 
  );

  // ✅ ADD THIS - if ALL loads are completed, return null (no timer)
  const nonCompletedLoads = machineLoads.filter(load => !isLoadCompleted(load));
  if (nonCompletedLoads.length === 0) return null;

    // Find active loads
    const activeLoads = machineLoads.filter(isLoadActive);

    if (activeLoads.length === 0) {
      // Check if there are loaded but not started tests
      const loadedNotStarted = machineLoads.find(load => 
        !isLoadCompleted(load) && 
        load.timerStatus !== 'start' && 
        load.timerStatus !== 'paused'
      );

      if (loadedNotStarted) {
        return {
          status: 'stopped' as const,
          startTime: null,
          elapsed: 0,
          remainingTime: calculateRemainingTime(loadedNotStarted)
        };
      }

      return null;
    }

    // For simplicity, get the first active load
    // You might want to handle multiple active loads differently
    const activeLoad = activeLoads[0];

    if (activeLoad.timerStatus === 'paused') {
      return {
        status: 'paused' as const,
        startTime: activeLoad.timerStartTime,
        elapsed: activeLoad.pausedElapsedTime || calculateElapsedTime(activeLoad),
        remainingTime: calculateRemainingTime(activeLoad),
        lastPausedAt: activeLoad.lastPausedAt,
        totalPausedTime: activeLoad.totalPausedTime || 0
      };
    }

    if (activeLoad.timerStatus === 'start' && activeLoad.timerStartTime) {
      const elapsed = calculateElapsedTime(activeLoad);
      const totalDuration = calculateTotalDuration(activeLoad);
      return {
        status: 'running' as const,
        startTime: activeLoad.timerStartTime,
        elapsed: totalDuration > 0 ? elapsed : 0, // ← don't show elapsed for cycle tests

        remainingTime: calculateRemainingTime(activeLoad),
        totalPausedTime: activeLoad.totalPausedTime || 0
      };
    }

    return null;
  }, [data, chamberLoads, isLoadCompleted, isLoadActive, calculateRemainingTime, calculateElapsedTime]);

  // Get estimated completion time for a specific load
  const getEstimatedCompletion = useCallback((load: ChamberLoad): Date | null => {
    if (!load.timerStartTime) return null;

    const remaining = calculateRemainingTime(load);
    if (remaining <= 0) return null;

    const startTime = new Date(load.timerStartTime);
    return new Date(startTime.getTime() + remaining * 1000);
  }, [calculateRemainingTime]);

  // Set chamber loading status
  const setChamberLoading = useCallback((machineId: string, loading: boolean) => {
    setChamberLoadingStatus(prev => ({
      ...prev,
      [machineId]: loading
    }));
  }, []);

  // Refresh availability calculation
  const refreshAvailability = useCallback(() => {
    calculateMachineAvailability();
  }, [calculateMachineAvailability]);

  return {
    machineAvailability,
    calculateMachineAvailability,
    getEquipmentStatus,
    getMachineTimerStatus,
    getEstimatedCompletion,
    calculateRemainingTime,
    calculateTotalDuration,
    calculateElapsedTime,
    isLoadCompleted,
    isLoadActive,
    setChamberLoading,
    refreshAvailability
  };
};