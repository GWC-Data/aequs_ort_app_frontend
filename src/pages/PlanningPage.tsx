import React, { useState, useEffect } from 'react';
import { RefreshCw, FileSpreadsheet, X, Scan, Search, Info, Clock, Calendar, Grid, Upload, Image as ImageIcon, TestTube, User, AlertCircle, CheckCircle, Trash2, Filter, Eye, Settings, Thermometer, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { machineData, MachineItem } from '@/data/MachineData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PlanningPage = () => {
  const [data, setData] = useState<MachineItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [runningTests, setRunningTests] = useState([]);
  const [numberOfDays, setNumberOfDays] = useState(30);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState('');
  const [scannedParts, setScannedParts] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [partInput, setPartInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [machineDetails, setMachineDetails] = useState(null);
  const [chamberLoadingStatus, setChamberLoadingStatus] = useState({});
  const [viewMode, setViewMode] = useState('table');
  const [machineAvailability, setMachineAvailability] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});

  const [showTestingModal, setShowTestingModal] = useState(false);
  const [selectedChamberForTesting, setSelectedChamberForTesting] = useState(null);
  const [chamberLoadDetails, setChamberLoadDetails] = useState([]);
  const [selectedLoadsForAction, setSelectedLoadsForAction] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState(null);
  const [showMachineDetailsModal, setShowMachineDetailsModal] = useState(false);
  const [selectedMachineDetails, setSelectedMachineDetails] = useState(null);

  // Timer states
  const [timerStatus, setTimerStatus] = useState('stop');
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerDuration, setTimerDuration] = useState(24);
  const [timerStarted, setTimerStarted] = useState(false);

  // Pause states
  const [pausedTimers, setPausedTimers] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      calculateMachineAvailability();

      const interval = setInterval(() => {
        calculateMachineAvailability();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [data]);

  useEffect(() => {
    let interval = null;

    if (timerStatus === 'start' && timerStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(timerStartTime);
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus, timerStartTime]);

  // Enhanced test condition parser for various formats
  const parseTestConditionCheckpoints = (testCondition) => {
    if (!testCondition || typeof testCondition !== 'string') {
      return [];
    }
    
    const condition = testCondition.trim();
    
    // 1. Check for "CP:" or "Checkpoints:" pattern (most common)
    const cpPattern = /(?:CP|Checkpoints?)[:\s]+(.+)/i;
    const cpMatch = condition.match(cpPattern);
    
    if (cpMatch) {
      const checkpointsStr = cpMatch[1].trim();
      return extractCheckpoints(checkpointsStr);
    }
    
    // 2. Check for "T" pattern (T0, T1, T2, etc.)
    const tPattern = /^T\d+.*/i;
    if (tPattern.test(condition)) {
      return extractCheckpoints(condition);
    }
    
    // 3. Check for time durations with hours/cycles
    const timePattern = /(\d+\s*(?:hrs?|hours?|cycles?|drops?))/gi;
    const timeMatches = condition.match(timePattern);
    
    if (timeMatches && timeMatches.length > 1) {
      return timeMatches.map(match => match.trim());
    }
    
    // 4. Check for comma-separated numbers
    const numbersPattern = /(\d+(?:\s*,\s*\d+)+)/;
    const numbersMatch = condition.match(numbersPattern);
    
    if (numbersMatch) {
      const numbersStr = numbersMatch[1];
      const numbers = numbersStr.split(',').map(num => {
        const trimmed = num.trim();
        const unitMatch = condition.match(/(?:cycles?|drops?|hrs?|hours?)$/i);
        const unit = unitMatch ? unitMatch[0] : '';
        return trimmed + (unit ? ' ' + unit : '');
      });
      
      if (numbers.length > 1) {
        return numbers;
      }
    }
    
    // 5. Check for ranges
    const rangePattern = /(\d+)\s*[-–]\s*(\d+)\s*(cycles?|drops?|hrs?|hours?)/i;
    const rangeMatch = condition.match(rangePattern);
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      const unit = rangeMatch[3];
      
      if (start < end) {
        const checkpoints = [];
        for (let i = start; i <= end; i++) {
          checkpoints.push(`${i} ${unit}`);
        }
        return checkpoints;
      }
    }
    
    // 6. Special cases
    if (condition.includes('multiple checkpoints') || 
        condition.includes('checkpoints') ||
        condition.includes('time points')) {
      const allNumbers = condition.match(/\d+/g);
      if (allNumbers && allNumbers.length > 1) {
        return allNumbers.map(num => `${num}hrs`);
      }
    }
    
    return [];
  };

  // Helper function to extract and clean checkpoints from a string
  const extractCheckpoints = (checkpointsStr) => {
    const cleanedStr = checkpointsStr
      .replace(/\s+(?:cycles?|drops?|hrs?|hours?)$/i, '')
      .trim();
    
    const splitPattern = /[,;]|\s+and\s+/i;
    const rawCheckpoints = cleanedStr.split(splitPattern);
    
    return rawCheckpoints
      .map(cp => {
        let checkpoint = cp.trim();
        
        if (checkpoint.startsWith('T')) {
          checkpoint = checkpoint.replace(/^T/, 'T');
        }
        
        if (/^\d+$/.test(checkpoint)) {
          checkpoint = `${checkpoint}hrs`;
        }
        
        if (/\d+$/.test(checkpoint) && !/(?:hrs?|hours?|cycles?|drops?)$/i.test(checkpoint)) {
          checkpoint = `${checkpoint}hrs`;
        }
        
        checkpoint = checkpoint.replace(/(\d+)\s*hr\b/gi, '$1hrs');
        
        return checkpoint;
      })
      .filter(cp => cp && cp !== '');
  };

  // Helper function to check if test matches the chamber with multiple equipment support
  const checkMachineMatch = (test, normalizedChamber) => {
    const machinesToCheck = [
      test.machineEquipment,
      test.machineEquipment2
    ].filter(m => m && m.trim());
    
    for (const machine of machinesToCheck) {
      const normalizedMachine = normalizeMachineName(machine);
      
      // Condition 1: If specification contains multiple equipment (e.g., "Heat Soak + Instron")
      if (test.specification && test.specification.includes('+')) {
        const equipmentList = test.specification.split('+').map(eq => eq.trim());
        if (equipmentList.some(eq => {
          const normalizedEq = normalizeMachineName(eq);
          return normalizedEq === normalizedChamber ||
                 normalizedEq.includes(normalizedChamber) ||
                 normalizedChamber.includes(normalizedEq);
        })) {
          return true;
        }
      }
      
      // Direct match
      if (normalizedMachine === normalizedChamber ||
          normalizedMachine.includes(normalizedChamber) ||
          normalizedChamber.includes(normalizedMachine)) {
        return true;
      }
    }
    
    return false;
  };

  // Function to get chamber loads from localStorage with timer calculations
  const getChamberLoadsFromStorage = () => {
    try {
      const chamberLoads = JSON.parse(localStorage.getItem('chamberLoads') || '[]');

      return chamberLoads.map(load => {
        if (load.timerStartTime && load.timerStatus !== 'start' && load.timerStatus !== 'paused') {
          const startTime = new Date(load.timerStartTime);
          const now = new Date();
          const elapsedMs = now - startTime;
          const durationMs = parseFloat(load.duration) * 60 * 60 * 1000;

          if (elapsedMs < durationMs) {
            const estimatedCompletion = new Date(startTime.getTime() + durationMs).toISOString();
            return {
              ...load,
              timerStatus: 'start',
              estimatedCompletion: estimatedCompletion,
              testStatus: 'start'
            };
          } else {
            return {
              ...load,
              timerStatus: 'stop',
              testStatus: 'completed',
              estimatedCompletion: new Date(startTime.getTime() + durationMs).toISOString()
            };
          }
        }

        return {
          ...load,
          timerStatus: load.timerStatus || 'stop',
          testStatus: load.testStatus || 'not_started'
        };
      });
    } catch (error) {
      console.error('Error loading chamber loads from storage:', error);
      return [];
    }
  };

  const getMachineTimerStatus = (machineIdentifier) => {
    const chamberLoads = getChamberLoadsFromStorage();
    
    let stage2Records = [];
    try {
      stage2Records = JSON.parse(localStorage.getItem('stage2Records') || '[]');
    } catch (error) {
      console.error('Error loading stage2Records:', error);
    }

    const machine = data.find(m =>
      m.machine_id === machineIdentifier ||
      m.machine_description === machineIdentifier
    );

    if (!machine) return null;

    const machineLoads = chamberLoads.filter(load =>
      load.chamber === machine.machine_id ||
      load.chamber === machine.machine_description
    );

    if (machineLoads.length === 0) return null;

    const completedStage2Tests = stage2Records.filter(record => {
      const isForThisMachine = record.chamber === machine.machine_id ||
                               record.chamber === machine.machine_description ||
                               (record.machineDetails && 
                                (record.machineDetails.machineId === machine.machine_id || 
                                 record.machineDetails.machineDescription === machine.machine_description));
      
      const isCompleted = record.status === 'Completed' || 
                         record.testStatus === 'completed';
      
      return isForThisMachine && isCompleted;
    });

    const allLoadsCompleted = machineLoads.every(load => {
      const isCompletedInStage2 = completedStage2Tests.some(record => 
        record.loadId === load.id
      );
      
      return isCompletedInStage2 || 
             load.status === 'completed' || 
             load.testStatus === 'completed';
    });

    if (allLoadsCompleted) {
      return null;
    }

    const activeLoad = machineLoads.find(load => {
      const isCompletedInStage2 = completedStage2Tests.some(record => 
        record.loadId === load.id
      );
      
      return !isCompletedInStage2 && 
             !(load.status === 'completed' || load.testStatus === 'completed') &&
             (load.timerStatus === 'start' || load.timerStatus === 'paused');
    });

    if (activeLoad) {
      const startTime = new Date(activeLoad.timerStartTime);
      const now = new Date();

      if (activeLoad.timerStatus === 'paused' && activeLoad.pausedElapsedTime) {
        return {
          status: 'paused',
          startTime: activeLoad.timerStartTime,
          duration: activeLoad.duration,
          elapsed: activeLoad.pausedElapsedTime,
          lastPausedAt: activeLoad.lastPausedAt,
          totalPausedTime: activeLoad.totalPausedTime || 0
        };
      }

      if (activeLoad.timerStatus === 'start') {
        let elapsed = Math.floor((now - startTime) / 1000);

        if (activeLoad.totalPausedTime) {
          elapsed -= activeLoad.totalPausedTime;
        }

        return {
          status: 'running',
          startTime: activeLoad.timerStartTime,
          duration: activeLoad.duration,
          elapsed: elapsed,
          totalPausedTime: activeLoad.totalPausedTime || 0
        };
      }
    }

    return null;
  };

  const getEquipmentStatus = (machineId) => {
    const machine = data.find(m => m.machine_id === machineId);
    if (!machine) return null;

    const availability = machineAvailability[machine.machine_description]?.[machineId];
    return availability || {
      status: 'available',
      activeLoads: 0,
      activeParts: 0,
      runningTimers: 0,
      pausedTimers: 0,
      lastUpdated: 'N/A',
      machineId: machineId,
      machineDescription: machine.machine_description
    };
  };

  const formatPausedTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    const startTime = new Date();
    setTimerStartTime(startTime);
    setTimerStatus('start');
    setTimerStarted(true);
    alert(`Timer will start when you confirm the load. Duration: ${timerDuration} hours.`);
  };

  const handleStopTimer = () => {
    setTimerStatus('stop');
    setTimerStarted(false);
    const chamberLoads = getChamberLoadsFromStorage();
    const updatedLoads = chamberLoads.map(load => {
      if (load.chamber === selectedChamber && load.status === 'loaded') {
        return {
          ...load,
          timerStatus: 'stop',
          testStatus: 'stop',
          estimatedCompletion: null
        };
      }
      return load;
    });

    localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));

    setTimeout(() => {
      const tests = loadRunningTests();
      loadMachineData(tests);
      calculateMachineAvailability();
    }, 100);

    alert(`Timer stopped for ${selectedChamber}.`);
  };

  const handlePauseTimer = (machineIdentifier) => {
    const chamberLoads = getChamberLoadsFromStorage();

    const activeLoads = chamberLoads.filter(load =>
      (load.chamber === machineIdentifier) &&
      load.status === 'loaded' &&
      load.timerStatus === 'start'
    );

    if (activeLoads.length === 0) {
      alert('No active tests found to pause');
      return;
    }

    const updatedLoads = chamberLoads.map(load => {
      if (load.chamber === machineIdentifier && 
          load.status === 'loaded' && 
          load.timerStatus === 'start') {
        
        const startTime = new Date(load.timerStartTime);
        const now = new Date();
        let elapsed = Math.floor((now - startTime) / 1000);

        if (load.totalPausedTime) {
          elapsed -= load.totalPausedTime;
        }

        return {
          ...load,
          timerStatus: 'paused',
          lastPausedAt: new Date().toISOString(),
          pausedElapsedTime: elapsed,
          totalPausedTime: load.totalPausedTime || 0,
          testStatus: 'paused'
        };
      }
      return load;
    });

    localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));

    const newPausedTimers = { ...pausedTimers };
    newPausedTimers[machineIdentifier] = {
      pausedAt: new Date().toISOString(),
      elapsedBeforePause: activeLoads[0].pausedElapsedTime || 0
    };
    setPausedTimers(newPausedTimers);

    setTimeout(() => {
      const tests = loadRunningTests();
      loadMachineData(tests);
      calculateMachineAvailability();
    }, 100);

    alert(`Test paused for ${machineIdentifier} (${activeLoads.length} load(s) affected).`);
  };

  const handleResumeTimer = (machineIdentifier) => {
    const chamberLoads = getChamberLoadsFromStorage();

    const pausedLoads = chamberLoads.filter(load =>
      (load.chamber === machineIdentifier) &&
      load.status === 'loaded' &&
      load.timerStatus === 'paused'
    );

    if (pausedLoads.length === 0) {
      alert('No paused tests found to resume');
      return;
    }

    const updatedLoads = chamberLoads.map(load => {
      if (load.chamber === machineIdentifier && 
          load.status === 'loaded' && 
          load.timerStatus === 'paused') {
        
        const timeSincePaused = Math.floor(
          (new Date() - new Date(load.lastPausedAt)) / 1000
        );
        const newTotalPausedTime = (load.totalPausedTime || 0) + timeSincePaused;

        return {
          ...load,
          timerStatus: 'start',
          timerStartTime: load.timerStartTime,
          totalPausedTime: newTotalPausedTime,
          lastPausedAt: null,
          pausedElapsedTime: null,
          testStatus: 'start'
        };
      }
      return load;
    });

    localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));

    setPausedTimers(prev => {
      const newState = { ...prev };
      delete newState[machineIdentifier];
      return newState;
    });

    setTimeout(() => {
      const tests = loadRunningTests();
      loadMachineData(tests);
      calculateMachineAvailability();
    }, 100);

    alert(`Test resumed for ${machineIdentifier} (${pausedLoads.length} load(s) affected).`);
  };

  const handleViewMachineDetails = (machine) => {
    const foundMachine = data.find(m => m.machine_description === machine.machine_description);

    if (foundMachine) {
      const machineDetails = {
        ...foundMachine,
        lastCalibration: '26-04-2025',
        nextCalibration: '26-04-2026',
        lastChamberCleaning: '09-12-2025',
        chamberId: 'HS-01',
        labTemperature: '19°C',
        labHumidity: '40%',
        notes: 'Strictly this data should remain with Aequa',
        allEquipmentIds: data
          .filter(m => m.machine_description === foundMachine.machine_description)
          .map(m => m.machine_id)
      };

      setSelectedMachineDetails(machineDetails);
      setShowMachineDetailsModal(true);
    }
  };

  const calculateMachineAvailability = () => {
    const availability = {};
    const chamberLoads = getChamberLoadsFromStorage();

    let stage2Records = [];
    try {
      stage2Records = JSON.parse(localStorage.getItem('stage2Records') || '[]');
    } catch (error) {
      console.error('Error loading stage2Records:', error);
    }

    data.forEach(machine => {
      const machineName = machine.machine_description;
      const machineId = machine.machine_id;

      const machineLoads = chamberLoads.filter(load =>
        load.chamber === machineName || load.chamber === machineId
      );

      const completedStage2Tests = stage2Records.filter(record => {
        const isForThisMachine = record.chamber === machineName || 
                                 record.chamber === machineId ||
                                 (record.machineDetails && 
                                  (record.machineDetails.machineId === machineId || 
                                   record.machineDetails.machineDescription === machineName));
        
        const isCompleted = record.status === 'Completed' || 
                           record.testStatus === 'completed';
        
        return isForThisMachine && isCompleted;
      });

      let status = 'available';

      if (chamberLoadingStatus[machineId] && selectedChamber === machineId) {
        status = 'loading';
      }
      else if (machineLoads.length > 0) {
        const allLoadsCompleted = machineLoads.every(load => {
          const isCompletedInStage2 = completedStage2Tests.some(record => 
            record.loadId === load.id
          );
          
          return isCompletedInStage2 || 
                 load.status === 'completed' || 
                 load.testStatus === 'completed';
        });

        if (allLoadsCompleted) {
          status = 'available';
        } else {
          const now = new Date();
          const hasActiveTimer = machineLoads.some(load => {
            const isCompletedInStage2 = completedStage2Tests.some(record => 
              record.loadId === load.id
            );
            
            if (isCompletedInStage2 || load.status === 'completed' || load.testStatus === 'completed') {
              return false;
            }
            
            return (load.timerStatus === 'start' || load.timerStatus === 'paused') &&
                   load.timerStartTime &&
                   load.estimatedCompletion &&
                   new Date(load.estimatedCompletion) > now;
          });

          if (hasActiveTimer) {
            status = 'occupied';
          } else {
            status = 'available';
          }
        }
      }

      const activePartsCount = machineLoads.reduce((sum, load) => {
        const isCompletedInStage2 = completedStage2Tests.some(record => 
          record.loadId === load.id
        );
        
        if (isCompletedInStage2 || load.status === 'completed' || load.testStatus === 'completed') {
          return sum;
        }
        return sum + (load.parts?.length || 0);
      }, 0);
      
      const runningTimers = machineLoads.filter(load => {
        const isCompletedInStage2 = completedStage2Tests.some(record => 
          record.loadId === load.id
        );
        
        return load.timerStatus === 'start' && 
               !isCompletedInStage2 && 
               !(load.status === 'completed' || load.testStatus === 'completed');
      }).length;
      
      const pausedTimersCount = machineLoads.filter(load => {
        const isCompletedInStage2 = completedStage2Tests.some(record => 
          record.loadId === load.id
        );
        
        return load.timerStatus === 'paused' && 
               !isCompletedInStage2 && 
               !(load.status === 'completed' || load.testStatus === 'completed');
      }).length;

      if (!availability[machineName]) {
        availability[machineName] = {};
      }

      availability[machineName][machineId] = {
        status,
        activeLoads: machineLoads.filter(load => {
          const isCompletedInStage2 = completedStage2Tests.some(record => 
            record.loadId === load.id
          );
          
          return !isCompletedInStage2 && 
                 !(load.status === 'completed' || load.testStatus === 'completed');
        }).length,
        activeParts: activePartsCount,
        runningTimers: runningTimers,
        pausedTimers: pausedTimersCount,
        lastUpdated: new Date().toLocaleTimeString(),
        machineId: machineId,
        machineDescription: machineName,
        completedTests: completedStage2Tests.length,
        totalLoads: machineLoads.length
      };
    });

    setMachineAvailability(availability);
  };

  const initializeData = async () => {
    setLoading(true);
    const tests = await loadRunningTests();
    loadMachineData(tests);
    setLoading(false);
  };

  const loadRunningTests = () => {
    return new Promise((resolve) => {
      try {
        const storedRecords = localStorage.getItem('stage2Records');
        console.log("Stored records:", storedRecords);
        if (storedRecords) {
          const recordsArray = JSON.parse(storedRecords);
          const tests = [];

          if (Array.isArray(recordsArray)) {
            console.log("Records array:", recordsArray);
            recordsArray.forEach(record => {
              if (record.status === 'Completed' || record.testStatus === 'completed') {
                return;
              }
              
              if (record.testRecords && Array.isArray(record.testRecords)) {
                record.testRecords.forEach(test => {
                  const machines = [];
                  if (test.machineEquipment && test.machineEquipment.trim() !== '' && test.machineEquipment.trim() !== '-') {
                    const machineList = test.machineEquipment.split(',').map(m => m.trim()).filter(m => m !== '');
                    machines.push(...machineList);
                  }
                  if (test.machineEquipment2 && test.machineEquipment2.trim() !== '' && test.machineEquipment2.trim() !== '-') {
                    const machineList = test.machineEquipment2.split(',').map(m => m.trim()).filter(m => m !== '');
                    machineList.forEach(m => {
                      if (!machines.includes(m)) {
                        machines.push(m);
                      }
                    });
                  }

                  machines.forEach(machine => {
                    tests.push({
                      machine: machine,
                      testName: test.testName || 'Test',
                      duration: parseFloat(test.timing) || 0,
                      startDateTime: test.startDateTime || record.submittedAt,
                      submittedAt: record.submittedAt
                    });
                  });
                });
              }
            });
          }
          console.log("Active tests data", tests);
          setRunningTests(tests);
          resolve(tests);
        } else {
          setRunningTests([]);
          resolve([]);
        }
      } catch (error) {
        console.error('Error loading running tests from localStorage:', error);
        setRunningTests([]);
        resolve([]);
      }
    });
  };

  const handleOpenTestingModal = (machineIdentifier) => {
    const chamberLoads = getChamberLoadsFromStorage();
    const activeMachineLoads = chamberLoads.filter(load =>
      load.chamber === machineIdentifier
    );

    if (activeMachineLoads.length === 0) {
      alert('No loads found for this equipment');
      return;
    }

    const sortedLoads = activeMachineLoads.sort((a, b) =>
      new Date(b.loadedAt) - new Date(a.loadedAt)
    );

    setSelectedChamberForTesting(machineIdentifier);
    setChamberLoadDetails(sortedLoads);
    setShowTestingModal(true);
  };

  const processLoadForDisplay = (load) => {
    const testGroups = {};

    load.parts?.forEach(part => {
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

  const handleNavigateToTestingForPart = (load, testGroup) => {
    const record = {
      loadId: load.id,
      chamber: load.chamber,
      parts: testGroup.parts,
      totalParts: testGroup.parts.length,
      machineDetails: load.machineDetails || {},
      loadedAt: load.loadedAt,
      estimatedCompletion: load.estimatedCompletion,
      duration: load.duration,
      testRecords: testGroup.parts,
      timerStatus: load.timerStatus,
      timerStartTime: load.timerStartTime,
      testName: testGroup.testName,
      testId: testGroup.testId
    };

    localStorage.setItem('testingLoadData', JSON.stringify(record));

    navigate('/form-default', {
      state: {
        record
      }
    });
  };

  const handleMarkLoadComplete = (loadId) => {
    const chamberLoads = getChamberLoadsFromStorage();
    const updatedLoads = chamberLoads.map(load => {
      if (load.id === loadId) {
        return {
          ...load,
          status: 'completed',
          testStatus: 'completed',
          timerStatus: 'stop',
          completedAt: new Date().toISOString()
        };
      }
      return load;
    });

    localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));

    setTimeout(() => {
      loadRunningTests().then(tests => {
        loadMachineData(tests);
        calculateMachineAvailability();

        if (selectedChamberForTesting) {
          const updatedChamberLoads = getChamberLoadsFromStorage();
          const activeChamberLoads = updatedChamberLoads.filter(load =>
            load.chamber === selectedChamberForTesting
          );
          const sortedLoads = activeChamberLoads.sort((a, b) =>
            new Date(b.loadedAt) - new Date(a.loadedAt)
          );
          setChamberLoadDetails(sortedLoads);
        }
      });
    }, 100);

    alert('Load marked as complete successfully!');
  };

  const loadMachineData = (tests) => {
    if (!Array.isArray(tests)) {
      console.error('loadMachineData: tests is not an array:', tests);
      tests = [];
    }
    console.log("tests", tests);
    const machineMap = new Map();

    machineData.forEach(machine => {
      machineMap.set(machine.machine_id, {
        ...machine,
        tests: []
      });
    });

    tests.forEach(test => {
      const testMachineName = test.machine;

      let matchedMachine = null;

      if (machineMap.has(testMachineName)) {
        matchedMachine = machineMap.get(testMachineName);
      } else {
        for (const [machineId, machine] of machineMap.entries()) {
          if (testMachineName.toLowerCase().includes(machine.machine_description.toLowerCase()) ||
            machine.machine_description.toLowerCase().includes(testMachineName.toLowerCase())) {
            matchedMachine = machine;
            break;
          }
        }
      }

      if (matchedMachine) {
        matchedMachine.tests.push(test);
      }
    });

    const result = Array.from(machineMap.values())
      .sort((a, b) => a.sr_no - b.sr_no);

    setData(result);
    setFileName('Equipment Schedule Data');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (hours) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  const calculateTimeRemaining = (load) => {
    if (load.timerStatus === 'paused') {
      return 'Paused';
    }

    if (load.timerStatus !== 'start' || !load.timerStartTime) return null;

    const now = new Date();
    const startTime = new Date(load.timerStartTime);
    const durationInMs = parseFloat(load.duration) * 60 * 60 * 1000;
    
    const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
    const endTime = new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);

    if (now > endTime) return 'Completed';

    const remainingMs = endTime - now;
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return `${hours}h ${minutes}m remaining`;
  };

  const getStatusInfo = (load) => {
    const estimatedCompletion = new Date(load.estimatedCompletion);
    const now = new Date();
    const timeRemaining = estimatedCompletion - now;

    if (load.status === 'completed') {
      return { label: 'Completed', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' };
    } else if (load.timerStatus === 'paused') {
      return { label: 'Paused', color: 'bg-yellow-100 text-yellow-800', icon: 'Pause' };
    } else if (timeRemaining <= 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800', icon: 'XCircle' };
    } else if (timeRemaining < 24 * 60 * 60 * 1000) {
      return { label: 'Finishing Soon', color: 'bg-yellow-100 text-yellow-800', icon: 'AlertCircle' };
    } else {
      return { label: 'Active', color: 'bg-blue-100 text-blue-800', icon: 'Play' };
    }
  };

  const normalizeMachineName = (machineName) => {
    if (!machineName) return '';
    
    // If it's a combined specification (e.g., "Heat Soak + Instron"), return as-is
    if (machineName.includes('+')) {
      return machineName.trim();
    }
    
    const name = machineName.toLowerCase().trim();

    const mappings = {
      'dlsm random drop': 'DLSM RANDOM DROP',
      '1.25m random drop': '1.25M RANDOM DROP',
      'lm random drop': 'LM RANDOM DROP',
      'lm control drop': 'LM CONTROL DROP',
      'rock tumbler': 'ROCK TUMBLER',
      'x-rite spectralight iii': 'X-RITE SPECTRALIGHT III',
      'heat soak-01': 'HEAT SOAK-01',
      'heat soak-02': 'HEAT SOAK-02',
      'thermal cycle chamber': 'THERMAL CYCLE CHAMBER',
      'uv chamber': 'UV CHAMBER',
      'salt spray': 'SALT SPRAY',
      'taber linear abraser': 'TABER LINEAR ABRASER',
      'electromechanical utm instron': 'ELECTROMECHANICAL UTM INSTRON',
      'foot survivability test': 'FOOT SURVIVABILITY TEST',
      'oslr camera': 'OSLR Camera',
      'tap immersion': 'TAP Immersion',
      'pool immersion': 'POOL Immersion',
      'ocean immersion': 'OCEAN Immersion',
      'asi immersion': 'ASI Immersion',
      'heat soak': 'HEAT SOAK',
      'instron': 'INSTRON',
      'random drop': 'RANDOM DROP',
      'taber 5750': 'TABER 5750',
      'ctrl drop': 'CTRL DROP',
      'uv': 'UV',
      'asi': 'ASI Immersion'
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (name.includes(key) || key.includes(name)) {
        return value;
      }
    }

    const matchedMachine = machineData.find(machine =>
      machine.machine_description.toLowerCase().includes(name) ||
      name.includes(machine.machine_description.toLowerCase()) ||
      machine.machine_id.toLowerCase() === name
    );

    return matchedMachine ? matchedMachine.machine_description : name;
  };

  const handleLoadChamber = (machineIdentifier) => {
    const machine = data.find(m => m.machine_id === machineIdentifier || m.machine_description === machineIdentifier);
    if (!machine) {
      alert('Equipment not found');
      return;
    }

    setSelectedChamber(machineIdentifier);
    setScannedParts([]);
    setPartInput('');
    setSelectedTest('');
    setAvailableTests([]);
    setMachineDetails(null);
    setShowLoadModal(true);

    setTimerStatus('stop');
    setTimerStartTime(null);
    setElapsedTime(0);
    setTimerDuration(24);
    setTimerStarted(false);
    setChamberLoadingStatus(prev => ({
      ...prev,
      [machineIdentifier]: true
    }));
  };

  const handleImageUpload = (partId, imageType, file) => {
    setUploadingImages(prev => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        [imageType]: true
      }
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;

      setScannedParts(prev => prev.map(part => {
        if (part.id === partId) {
          return {
            ...part,
            [imageType === 'cosmetic' ? 'cosmeticImage' : 'nonCosmeticImage']: imageData,
            [imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages']: [
              ...(part[imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages'] || []),
              imageData
            ]
          };
        }
        return part;
      }));

      setUploadingImages(prev => ({
        ...prev,
        [partId]: {
          ...prev[partId],
          [imageType]: false
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (partId, imageType, imageIndex) => {
    setScannedParts(prev => prev.map(part => {
      if (part.id === partId) {
        const imagesArray = part[imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages'] || [];
        const updatedImages = imagesArray.filter((_, idx) => idx !== imageIndex);

        return {
          ...part,
          [imageType === 'cosmetic' ? 'cosmeticImage' : 'nonCosmeticImage']: updatedImages[0] || '',
          [imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages']: updatedImages
        };
      }
      return part;
    }));
  };

  // UPDATED handlePartScan with both conditions
  const handlePartScan = async () => {
    if (!partInput.trim()) {
      alert('Please enter a part number');
      return;
    }

    setScanning(true);
    const partNumber = partInput.trim().toUpperCase();

    try {
      const oqcRecords = JSON.parse(localStorage.getItem('oqc_ticket_records') || '[]');
      let partDetails = null;
      let foundTicketCode = null;

      for (const record of oqcRecords) {
        for (const session of record.sessions || []) {
          const matchingPart = session.parts?.find(part =>
            part.partNumber?.toUpperCase() === partNumber
          );

          if (matchingPart) {
            partDetails = {
              partNumber: matchingPart.partNumber,
              serialNumber: matchingPart.serialNumber,
              id: matchingPart.id,
              ticketCode: record.ticketCode,
              project: record.project,
              build: record.build,
              colour: record.colour,
              anoType: record.anoType,
              oqcRecordId: record.id,
              sessionId: session.id,
              sessionNumber: session.sessionNumber
            };
            foundTicketCode = record.ticketCode;
            break;
          }
        }
        if (partDetails) break;
      }

      if (!partDetails) {
        alert(`Part ${partNumber} not found in OQC records!`);
        setScanning(false);
        return;
      }

      const existingLoads = getChamberLoadsFromStorage();
      const alreadyLoaded = existingLoads.some(load =>
        load.parts.some(part => part.partNumber === partNumber)
      );

      if (alreadyLoaded) {
        alert(`Part ${partNumber} is already loaded in another chamber!`);
        setScanning(false);
        return;
      }

      const allocations = JSON.parse(localStorage.getItem('ticket_allocations_array') || '[]');

      const machine = data.find(m =>
        m.machine_id === selectedChamber ||
        m.machine_description === selectedChamber
      );

      if (!machine) {
        alert('Equipment not found');
        setScanning(false);
        return;
      }

      const normalizedChamber = normalizeMachineName(machine.machine_description);

      const ticketAllocations = allocations.filter(allocation =>
        allocation.ticketCode === foundTicketCode
      );

      if (ticketAllocations.length === 0) {
        alert(`No allocations found for ticket ${foundTicketCode}`);
        setScanning(false);
        return;
      }

      const matchingTests = [];

      ticketAllocations.forEach(allocation => {
        allocation.testAllocations?.forEach(test => {
          // Condition 1: Check if test matches the chamber (including multiple equipment specifications)
          const isMatch = checkMachineMatch(test, normalizedChamber);

          if (isMatch) {
            const allocatedParts = test.allocatedParts || 0;
            const requiredQty = test.requiredQty || 0;
            const remainingToAllocate = allocatedParts;

            // Condition 2: Parse checkpoints from test condition
            const checkpoints = parseTestConditionCheckpoints(test.testCondition);
            const hasCheckpoints = checkpoints.length > 0;
            
            if (remainingToAllocate > 0 || hasCheckpoints) {
              const alreadyAllocated = requiredQty - allocatedParts;

              // Check how many times this part is already loaded for this test
              const existingLoadsForTest = existingLoads.filter(load =>
                load.parts.some(part => 
                  part.partNumber === partNumber && 
                  part.testId === test.id
                )
              );

              const timesAlreadyLoaded = existingLoadsForTest.length;
              
              // For tests with checkpoints, allow multiple loads (one per checkpoint)
              // For regular tests, only allow one load per part
              const maxAllowedLoads = hasCheckpoints ? checkpoints.length : 1;
              
              if (timesAlreadyLoaded < maxAllowedLoads) {
                // Check if we've reached allocation limit for non-checkpoint tests
                if (!hasCheckpoints) {
                  // Count how many parts for this test are already in scannedParts
                  const partsAlreadyScannedForThisTest = scannedParts.filter(scanPart =>
                    scanPart.selectedTestId === test.id
                  ).length;
                  
                  if (partsAlreadyScannedForThisTest >= remainingToAllocate) {
                    return; // Skip if allocation limit reached
                  }
                }

                // Determine which checkpoint this is (if applicable)
                const currentCheckpoint = hasCheckpoints ? 
                  checkpoints[timesAlreadyLoaded] : null;

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
                  // For checkpoint tracking
                  hasCheckpoints: hasCheckpoints,
                  checkpoints: checkpoints,
                  currentCheckpoint: currentCheckpoint,
                  checkpointIndex: timesAlreadyLoaded,
                  totalCheckpoints: checkpoints.length,
                  timesAlreadyLoaded: timesAlreadyLoaded,
                  canLoadMoreCheckpoints: timesAlreadyLoaded < checkpoints.length,
                  lastLoadedCheckpoint: existingLoadsForTest.length > 0 ? 
                    existingLoadsForTest[existingLoadsForTest.length - 1]?.checkpointInfo?.checkpoint : null
                });
              } else if (hasCheckpoints && timesAlreadyLoaded >= checkpoints.length) {
                console.log(`Part ${partNumber} already loaded for all ${checkpoints.length} checkpoints of test ${test.testName}`);
              }
            }
          }
        });
      });

      if (matchingTests.length === 0) {
        const allTestsForTicket = ticketAllocations.flatMap(a => a.testAllocations || []);
        const chamberTests = allTestsForTicket.filter(test => {
          return checkMachineMatch(test, normalizedChamber);
        });
        
        if (chamberTests.length === 0) {
          alert(`No tests found for ${machine.machine_description} in ticket ${foundTicketCode}`);
        } else {
          alert(`No available allocations or checkpoints remaining for ${machine.machine_description} in ticket ${foundTicketCode}`);
        }
        setScanning(false);
        return;
      }

      setAvailableTests(matchingTests);
      if (!selectedTest && matchingTests.length > 0) {
        setSelectedTest(matchingTests[0].id);
      }

      const newScannedPart = {
        id: Date.now(),
        ...partDetails,
        scannedAt: new Date().toLocaleString(),
        availableTests: matchingTests,
        selectedTestId: matchingTests[0]?.id,
        scanStatus: 'OK',
        cosmeticImage: '',
        nonCosmeticImage: '',
        cosmeticImages: [],
        nonCosmeticImages: [],
        // Store checkpoint info if applicable
        checkpointInfo: matchingTests[0]?.hasCheckpoints ? {
          checkpoint: matchingTests[0].currentCheckpoint,
          checkpointIndex: matchingTests[0].checkpointIndex,
          totalCheckpoints: matchingTests[0].totalCheckpoints,
          checkpoints: matchingTests[0].checkpoints
        } : null
      };

      setScannedParts([...scannedParts, newScannedPart]);
      setPartInput('');

      updateMachineDetails(matchingTests, machine);

      // Show specific message for checkpoint tests
      const checkpointTest = matchingTests.find(t => t.hasCheckpoints);
      if (checkpointTest) {
        const checkpointNumber = checkpointTest.checkpointIndex + 1;
        const totalCheckpoints = checkpointTest.totalCheckpoints;
        const currentCheckpoint = checkpointTest.currentCheckpoint;
        
        let message = `Part ${partNumber} scanned for ${checkpointTest.testName}\n`;
        message += `Checkpoint ${checkpointNumber} of ${totalCheckpoints}: ${currentCheckpoint}\n\n`;
        
        if (checkpointTest.timesAlreadyLoaded > 0) {
          message += `Already loaded for ${checkpointTest.timesAlreadyLoaded} checkpoint(s).\n`;
        }
        
        if (checkpointNumber < totalCheckpoints) {
          message += `This part can be loaded ${totalCheckpoints - checkpointNumber} more time(s) for remaining checkpoints.`;
        } else {
          message += `All ${totalCheckpoints} checkpoints completed for this part.`;
        }
        
        alert(message);
      }

    } catch (error) {
      console.error('Error scanning part:', error);
      alert('Error scanning part. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getTestStatusText = (statusCode) => {
    switch (statusCode) {
      case 1: return 'Pending';
      case 2: return 'In Progress';
      case 3: return 'Completed';
      case 4: return 'Failed';
      default: return 'Unknown';
    }
  };

  const updateMachineDetails = (tests, machine) => {
    if (tests.length > 0) {
      const firstTest = tests[0];
      const totalDuration = Math.max(...tests.map(t => parseFloat(t.time) || 0));

      setMachineDetails({
        machine: machine.machine_description,
        machineId: machine.machine_id,
        ticketCode: firstTest.ticketCode,
        project: firstTest.project,
        build: firstTest.build,
        colour: firstTest.colour,
        totalTests: tests.length,
        tests: tests.map(test => ({
          id: test.id,
          testName: test.testName,
          duration: test.time,
          status: test.status,
          statusText: getTestStatusText(test.status),
          requiredQty: test.requiredQty,
          allocatedParts: test.allocatedParts,
          remainingQty: test.remainingQty,
          alreadyAllocated: test.alreadyAllocated,
          // Add checkpoint info
          hasCheckpoints: test.hasCheckpoints,
          checkpoints: test.checkpoints,
          currentCheckpoint: test.currentCheckpoint,
          checkpointIndex: test.checkpointIndex,
          totalCheckpoints: test.totalCheckpoints,
          timesAlreadyLoaded: test.timesAlreadyLoaded,
          canLoadMoreCheckpoints: test.canLoadMoreCheckpoints,
          testCondition: test.testCondition || '',
        })),
        estimatedDuration: totalDuration
      });
    }
  };

  const handleTestSelection = (partId, testId) => {
    setScannedParts(prev => prev.map(part => {
      if (part.id === partId) {
        const selectedTest = availableTests.find(t => t.id === testId);
        return { 
          ...part, 
          selectedTestId: testId,
          checkpointInfo: selectedTest?.hasCheckpoints ? {
            checkpoint: selectedTest.currentCheckpoint,
            checkpointIndex: selectedTest.checkpointIndex,
            totalCheckpoints: selectedTest.totalCheckpoints,
            checkpoints: selectedTest.checkpoints
          } : null
        };
      }
      return part;
    }));
  };

  const handleRemovePart = (partId) => {
    setScannedParts(scannedParts.filter(part => part.id !== partId));

    if (scannedParts.length === 1) {
      setAvailableTests([]);
      setMachineDetails(null);
    }
  };

  const handleDeleteLoadConfirmation = (load) => {
    setLoadToDelete(load);
    setShowDeleteConfirm(true);
  };

  const handleConfirmLoad = () => {
    if (scannedParts.length === 0) {
      alert('No parts scanned!');
      return;
    }

    const partsWithoutTests = scannedParts.filter(part => !part.selectedTestId);
    if (partsWithoutTests.length > 0) {
      alert('Please select tests for all parts before loading');
      return;
    }

    const allocationViolations = [];
    const testConditionsByTest = {};

    const scannedPartsByTest = {};
    scannedParts.forEach(part => {
      if (part.selectedTestId) {
        if (!scannedPartsByTest[part.selectedTestId]) {
          scannedPartsByTest[part.selectedTestId] = [];
        }
        scannedPartsByTest[part.selectedTestId].push(part);
      }
    });

    Object.keys(scannedPartsByTest).forEach(testId => {
      const partsForTest = scannedPartsByTest[testId];
      const test = availableTests.find(t => t.id === testId);

      if (test) {
        if (!test.hasCheckpoints) {
          // For non-checkpoint tests, check allocation limits
          if (partsForTest.length > test.remainingQty) {
            allocationViolations.push(
              `${test.testName}: Scanned ${partsForTest.length} parts but only ${test.remainingQty} available`
            );
          }
        } else {
          // For checkpoint tests, check if we're within checkpoint limits
          const existingLoads = getChamberLoadsFromStorage();
          const existingLoadsForTest = existingLoads.filter(load =>
            load.parts.some(part => 
              part.partNumber === scannedParts[0]?.partNumber && 
              part.testId === testId
            )
          ).length;

          if (existingLoadsForTest + partsForTest.length > test.checkpoints.length) {
            allocationViolations.push(
              `${test.testName}: Can only load ${test.checkpoints.length} times for checkpoints`
            );
          }
        }
      }
    });

    if (allocationViolations.length > 0) {
      alert(`Allocation limits exceeded!\n\n${allocationViolations.join('\n')}\n\nPlease remove some parts.`);
      return;
    }

    const allocations = JSON.parse(localStorage.getItem('ticket_allocations_array') || '[]');
    const updatedAllocations = [...allocations];
    let hasCapacityIssues = false;
    let totalDuration = 0;

    const allocationSummary = {};

    scannedParts.forEach(part => {
      const selectedTest = part.availableTests.find(t => t.id === part.selectedTestId);
      if (selectedTest) {
        if (!testConditionsByTest[part.selectedTestId]) {
          testConditionsByTest[part.selectedTestId] = {
            testName: selectedTest.testName,
            testId: selectedTest.id,
            testCondition: selectedTest.testCondition,
            specification: selectedTest.specification,
            childTests: selectedTest.childTests || []
          };
        }

        const allocationIndex = updatedAllocations.findIndex(a => a.ticketCode === part.ticketCode);
        if (allocationIndex !== -1) {
          const testIndex = updatedAllocations[allocationIndex].testAllocations?.findIndex(
            t => t.id === part.selectedTestId
          );

          if (testIndex !== -1) {
            const test = updatedAllocations[allocationIndex].testAllocations[testIndex];
            
            // Only decrement allocation for non-checkpoint tests
            if (!selectedTest.hasCheckpoints) {
              const remainingToAllocate = test.allocatedParts || 0;

              if (remainingToAllocate <= 0) {
                hasCapacityIssues = true;
                alert(`Test "${test.testName}" has no remaining capacity!`);
              }
            }
          }
        }
      }
    });

    if (hasCapacityIssues) {
      return;
    }

    scannedParts.forEach(part => {
      const selectedTest = part.availableTests.find(t => t.id === part.selectedTestId);
      if (selectedTest) {
        const allocationIndex = updatedAllocations.findIndex(a => a.ticketCode === part.ticketCode);
        if (allocationIndex !== -1) {
          const testIndex = updatedAllocations[allocationIndex].testAllocations?.findIndex(
            t => t.id === part.selectedTestId
          );

          if (testIndex !== -1) {
            const test = updatedAllocations[allocationIndex].testAllocations[testIndex];
            const oldAllocatedCount = test.allocatedParts || 0;
            const requiredQty = test.requiredQty || 0;

            // Only decrement allocation for non-checkpoint tests
            let newAllocatedCount = oldAllocatedCount;
            if (!selectedTest.hasCheckpoints) {
              newAllocatedCount = Math.max(0, oldAllocatedCount - 1);
              updatedAllocations[allocationIndex].testAllocations[testIndex].allocatedParts = newAllocatedCount;
            }

            const actuallyAllocatedSoFar = requiredQty - newAllocatedCount;

            if (updatedAllocations[allocationIndex].testAllocations[testIndex].status === 1) {
              updatedAllocations[allocationIndex].testAllocations[testIndex].status = 2;
            }

            if (!allocationSummary[test.testName]) {
              allocationSummary[test.testName] = {
                count: 0,
                oldValue: oldAllocatedCount,
                newValue: newAllocatedCount,
                requiredQty: requiredQty,
                actuallyAllocated: actuallyAllocatedSoFar,
                hasCheckpoints: selectedTest.hasCheckpoints
              };
            }
            allocationSummary[test.testName].count++;
            allocationSummary[test.testName].newValue = newAllocatedCount;
            allocationSummary[test.testName].actuallyAllocated = actuallyAllocatedSoFar;

            totalDuration = Math.max(totalDuration, parseFloat(test.time) || 0);
          }
        }
      }
    });

    localStorage.setItem('ticket_allocations_array', JSON.stringify(updatedAllocations));

    const partImagesData = JSON.parse(localStorage.getItem('partImagesData') || '{}');

    scannedParts.forEach(part => {
      if (part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0) {
        partImagesData[part.partNumber] = {
          cosmeticImages: part.cosmeticImages || [],
          nonCosmeticImages: part.nonCosmeticImages || [],
          uploadedAt: new Date().toISOString()
        };
      }
    });

    localStorage.setItem('partImagesData', JSON.stringify(partImagesData));

    const machine = data.find(m =>
      m.machine_id === selectedChamber ||
      m.machine_description === selectedChamber
    );

    if (!machine) {
      alert('Equipment not found');
      return;
    }

    const loadTime = new Date();
    const actualTimerStartTime = timerStatus === 'start' && timerStartTime ? timerStartTime : null;
    const actualTimerStatus = timerStatus === 'start' ? 'start' : 'stop';
    const actualTestStatus = timerStatus === 'start' ? 'start' : 'not_started';

    let estimatedCompletion = null;
    if (actualTimerStatus === 'start' && actualTimerStartTime) {
      const durationInMs = (timerDuration || 24) * 60 * 60 * 1000;
      estimatedCompletion = new Date(actualTimerStartTime.getTime() + durationInMs).toISOString();
    }

    const loadData = {
      id: Date.now(),
      chamber: selectedChamber,
      machineId: machine.machine_id,
      machineDescription: machine.machine_description,
      parts: scannedParts.map(part => {
        const selectedTest = part.availableTests.find(t => t.id === part.selectedTestId);
        return {
          partNumber: part.partNumber,
          serialNumber: part.serialNumber,
          ticketCode: part.ticketCode,
          testId: part.selectedTestId,
          testName: selectedTest?.testName || 'Unknown',
          testCondition: selectedTest?.testCondition || '',
          // Include checkpoint info
          checkpointInfo: part.checkpointInfo || null,
          checkpoint: part.checkpointInfo?.checkpoint || null,
          checkpointIndex: part.checkpointInfo?.checkpointIndex || null,
          totalCheckpoints: part.checkpointInfo?.totalCheckpoints || null,
          loadedAt: new Date().toISOString(),
          scanStatus: part.scanStatus,
          duration: selectedTest?.time || 0,
          cosmeticImages: part.cosmeticImages || [],
          nonCosmeticImages: part.nonCosmeticImages || [],
          hasImages: (part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0)
        };
      }),
      machineDetails: {
        ...machineDetails,
        machineId: machine.machine_id,
        machineDescription: machine.machine_description
      },
      loadedAt: loadTime.toISOString(),
      duration: timerDuration || totalDuration,
      status: 'loaded',
      testStatus: actualTestStatus,
      timerStatus: actualTimerStatus,
      timerStartTime: actualTimerStartTime ? actualTimerStartTime.toISOString() : null,
      estimatedCompletion: estimatedCompletion,
      actualStartTime: actualTimerStatus === 'start' && actualTimerStartTime ? actualTimerStartTime.toISOString() : null
    };

    const existingLoads = getChamberLoadsFromStorage();
    existingLoads.push(loadData);
    localStorage.setItem('chamberLoads', JSON.stringify(existingLoads));

    let summary = `Successfully loaded ${scannedParts.length} parts into ${machine.machine_description}\n`;
    summary += `Equipment ID: ${machine.machine_id}\n\n`;

    if (actualTimerStatus === 'start') {
      summary += `Timer started! Duration: ${timerDuration} hours\n`;
      summary += `Will complete at: ${new Date(estimatedCompletion).toLocaleString()}\n\n`;
    } else {
      summary += `Parts loaded. Timer not started.\n\n`;
    }

    summary += 'Allocation Summary:\n';

    Object.entries(allocationSummary).forEach(([testName, data]) => {
      summary += `- ${testName}: ${data.count} part(s) allocated. `;
      if (!data.hasCheckpoints) {
        summary += `Allocated count decreased from ${data.oldValue} to ${data.newValue}. `;
        summary += `Now ${data.actuallyAllocated}/${data.requiredQty} allocated.\n`;
      } else {
        summary += `Checkpoint loaded. (Checkpoint-based test)\n`;
      }
    });

    const partsWithImages = scannedParts.filter(part =>
      part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0
    ).length;

    if (partsWithImages > 0) {
      summary += `\nImages uploaded for ${partsWithImages} part(s).`;
    }

    alert(summary);

    setChamberLoadingStatus(prev => ({
      ...prev,
      [selectedChamber]: false
    }));

    setShowLoadModal(false);
    setScannedParts([]);
    setPartInput('');
    setSelectedTest('');
    setTimerStatus('stop');
    setTimerStartTime(null);
    setElapsedTime(0);
    setTimerDuration(24);

    setTimeout(() => {
      loadRunningTests().then(tests => {
        loadMachineData(tests);
        calculateMachineAvailability();
      });
    }, 100);
  };

  const generateDateHeaders = (days) => {
    const headers = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      headers.push({
        date: date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`,
        dayOfMonth: date.getDate()
      });
    }

    return headers;
  };

  const dateHeaders = generateDateHeaders(numberOfDays);
  const totalDays = numberOfDays;

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'occupied': return '#F44336';
      case 'loading': return '#FFEB3B';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'loading': return 'Loading...';
      default: return 'Unknown';
    }
  };

  const calculateRemainingTime = (load) => {
    if (load.timerStatus === 'paused') {
      return 'Paused';
    }

    if (load.timerStatus !== 'start' || !load.timerStartTime) return null;

    const now = new Date();
    const startTime = new Date(load.timerStartTime);
    const durationInMs = parseFloat(load.duration) * 60 * 60 * 1000;

    const adjustedDuration = durationInMs - ((load.totalPausedTime || 0) * 1000);
    const endTime = new Date(startTime.getTime() + adjustedDuration);

    if (now > endTime) return 'Completed';

    const remainingMs = endTime - now;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    return `${remainingDays} days remaining`;
  };

  // Machine Details Modal Component
  const MachineDetailsModal = () => {
    if (!showMachineDetailsModal || !selectedMachineDetails) return null;

    const equipmentStatus = getEquipmentStatus(selectedMachineDetails.machine_id);

    return (
      <Dialog open={showMachineDetailsModal} onOpenChange={setShowMachineDetailsModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              <div className="flex items-center gap-3">
                <Settings className="text-blue-600" size={24} />
                <span>Equipment Details</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              {selectedMachineDetails.machine_id} - {selectedMachineDetails.machine_description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-blue-50 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 w-1/2">
                      {selectedMachineDetails.machine_description} ({selectedMachineDetails.machine_id})
                    </th>
                    <th className="px-4 py-3 bg-blue-50 text-left text-sm font-semibold text-gray-700 w-1/2">
                      Specifications
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="text-sm font-semibold text-gray-700">Results / Parameters</div>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Last Calibration:</span>
                        <span className="text-sm text-gray-500">(date)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.lastCalibration || '26-04-2025'}</div>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Next Calibration:</span>
                        <span className="text-sm text-gray-500">(date)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.nextCalibration || '26-04-2026'}</div>
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Date of Last Chamber Cleaning:</span>
                        <span className="text-sm text-gray-500">(date)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.lastChamberCleaning || '09-12-2025'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <tbody>
                  <tr className="bg-white">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Chamber ID(s) used:</span>
                        <span className="text-sm text-gray-500">(unique chamber ID)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.chamberId || 'HS-01'}</div>
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Thermometer size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Lab Temperature:</span>
                        </div>
                        <span className="text-sm text-gray-500">(temperature)</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.labTemperature || '19°C'}</div>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 border-r border-gray-300">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Droplets size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Lab Humidity:</span>
                        </div>
                        <span className="text-sm text-gray-500">(humidity)</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-gray-900">{selectedMachineDetails.labHumidity || '40%'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const TestingModal = () => {
    if (!showTestingModal) return null;

    return (
      <Dialog open={showTestingModal} onOpenChange={setShowTestingModal}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Testing - {selectedChamberForTesting}
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
                      Time Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Groups & Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chamberLoadDetails.map((load, loadIndex) => {
                    const statusInfo = getStatusInfo(load);
                    const testGroups = processLoadForDisplay(load);

                    return (
                      <React.Fragment key={load.id}>
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4" colSpan="6">
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
                                {load.parts?.length || 0} part(s) • {testGroups.length} test group(s)
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
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm font-medium">{formatDuration(load.duration)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDateTime(load.loadedAt)}</div>
                            <div className="text-xs text-gray-500">
                              Est. complete: {(() => {
                                if (load.timerStatus === 'start' || load.timerStatus === 'paused') {
                                  const startTime = new Date(load.timerStartTime);
                                  const durationInMs = parseFloat(load.duration) * 60 * 60 * 1000;
                                  const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
                                  const adjustedEndTime = new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);
                                  return formatDateTime(adjustedEndTime);
                                }
                                return formatDateTime(load.estimatedCompletion);
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-medium ${statusInfo.label === 'Active' ? 'text-blue-600' :
                              statusInfo.label === 'Finishing Soon' ? 'text-yellow-600' :
                                statusInfo.label === 'Completed' ? 'text-green-600' :
                                  statusInfo.label === 'Paused' ? 'text-yellow-600' :
                                    'text-red-600'
                              }`}>
                              {calculateTimeRemaining(load)}
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

                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleNavigateToTestingForPart(load, testGroup)}
                                        className="flex items-center gap-1 px-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium shadow-md"
                                      >
                                        <TestTube size={14} />
                                        Test All ({testGroup.parts.length})
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLoadConfirmation(load)}
                                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium shadow-md"
                                      >
                                        <Trash2 size={14} />
                                        Delete Load
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {testGroup.parts.map((part, partIndex) => (
                                      <div key={partIndex} className="text-xs text-gray-600 flex items-center gap-2 py-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <span className="font-medium">{part.partNumber}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>Serial: {part.serialNumber}</span>
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

            {chamberLoadDetails.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 text-lg">No loads found for this equipment</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const DeleteConfirmModal = () => {
    if (!showDeleteConfirm || !loadToDelete) return null;

    const handleDeleteLoad = () => {
      const chamberLoads = getChamberLoadsFromStorage();
      const updatedLoads = chamberLoads.filter(load => load.id !== loadToDelete.id);

      const allocations = JSON.parse(localStorage.getItem('ticket_allocations_array') || '[]');
      const updatedAllocations = [...allocations];

      loadToDelete.parts.forEach(part => {
        const allocationIndex = updatedAllocations.findIndex(a => a.ticketCode === part.ticketCode);
        if (allocationIndex !== -1) {
          const testIndex = updatedAllocations[allocationIndex].testAllocations?.findIndex(
            t => t.id === part.testId
          );

          if (testIndex !== -1) {
            const test = updatedAllocations[allocationIndex].testAllocations[testIndex];
            
            // Only increment allocation back for non-checkpoint tests
            if (!part.checkpointInfo) {
              const oldAllocatedCount = test.allocatedParts || 0;
              const newAllocatedCount = oldAllocatedCount + 1;

              updatedAllocations[allocationIndex].testAllocations[testIndex].allocatedParts = newAllocatedCount;

              const requiredQty = test.requiredQty || 0;
              if (newAllocatedCount >= requiredQty && test.status === 2) {
                updatedAllocations[allocationIndex].testAllocations[testIndex].status = 1;
              }
            }
          }
        }
      });

      localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));
      localStorage.setItem('ticket_allocations_array', JSON.stringify(updatedAllocations));

      alert(`Successfully deleted load from ${loadToDelete.chamber}\n\n${loadToDelete.parts.length} part(s) have been returned to available inventory.`);

      setShowDeleteConfirm(false);
      setLoadToDelete(null);

      setTimeout(() => {
        const tests = loadRunningTests();
        loadMachineData(tests);
        calculateMachineAvailability();
      }, 100);
    };

    return (
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              <div className="flex items-center gap-3">
                <Trash2 className="text-red-600" size={24} />
                <span>Confirm Deletion</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600" size={32} />
              </div>
            </div>

            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Delete Load from {loadToDelete?.chamber}?
              </h4>
              <p className="text-gray-600 mb-4">
                You are about to delete this load. This will remove all parts from the chamber and return them to available inventory.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Equipment:</span>
                    <span className="font-medium ml-2">{loadToDelete?.machineId || loadToDelete?.chamber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Parts:</span>
                    <span className="font-medium ml-2">{loadToDelete?.parts?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium ml-2">{formatDuration(loadToDelete?.duration)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium ml-2">
                      {loadToDelete?.timerStatus === 'start' ? 'Test Running' :
                        loadToDelete?.timerStatus === 'paused' ? 'Test Paused' : 'Loaded'}
                    </span>
                  </div>
                  {loadToDelete?.parts?.map((part, index) => (
                    <div key={index} className="col-span-2 text-xs bg-white p-2 rounded border">
                      <span className="font-medium">{part.partNumber}</span>
                      <span className="text-gray-500 ml-2">({part.testName})</span>
                      {part.checkpoint && (
                        <span className="text-purple-600 ml-2">[{part.checkpoint}]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLoadToDelete(null);
                }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLoad}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete Load
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderTableView = () => {
    return (
      <div className="p-6">
        <div className="overflow-x-auto bg-white rounded-lg shadow border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SR No
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine Description
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parts in Chamber
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timer Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((machine, index) => {
                const status = getEquipmentStatus(machine.machine_id);
                const timerStatus = getMachineTimerStatus(machine.machine_id);

                let stage2Records = [];
                try {
                  stage2Records = JSON.parse(localStorage.getItem('stage2Records') || '[]');
                } catch (error) {
                  console.error('Error loading stage2Records:', error);
                }

                const chamberLoads = getChamberLoadsFromStorage();
                const machineLoads = chamberLoads.filter(load =>
                  load.chamber === machine.machine_id || load.chamber === machine.machine_description
                );

                const completedStage2Tests = stage2Records.filter(record => {
                  const isForThisMachine = record.chamber === machine.machine_id ||
                                           record.chamber === machine.machine_description ||
                                           (record.machineDetails && 
                                            (record.machineDetails.machineId === machine.machine_id || 
                                             record.machineDetails.machineDescription === machine.machine_description));
                  
                  const isCompleted = record.status === 'Completed' || 
                                     record.testStatus === 'completed';
                  
                  return isForThisMachine && isCompleted;
                });

                const hasNonCompletedLoadedParts = machineLoads.some(load => {
                  const isCompletedInStage2 = completedStage2Tests.some(record => 
                    record.loadId === load.id
                  );
                  
                  return !isCompletedInStage2 && 
                         !(load.status === 'completed' || load.testStatus === 'completed') &&
                         load.parts?.length > 0;
                });

                return (
                  <tr key={machine.sr_no} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {machine.sr_no}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {machine.machine_id}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {machine.machine_description}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status?.status === 'available' ? 'bg-green-100 text-green-800' :
                        status?.status === 'occupied' ? 'bg-red-100 text-red-800' :
                          status?.status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {getStatusText(status?.status || 'available')}
                      </span>
                      
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {status?.activeParts || 0}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {timerStatus ? (
                        timerStatus.status === 'running' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Running</span>
                            <span className="text-xs text-gray-500">
                              {formatTime(timerStatus.elapsed)}
                            </span>
                          </div>
                        ) : timerStatus.status === 'paused' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm font-medium text-yellow-600">Paused</span>
                            <span className="text-xs text-gray-500">
                              {formatTime(timerStatus.elapsed)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-600">Stopped</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600">No Load</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex">
                      <button
                        onClick={() => handleLoadChamber(machine.machine_id)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors mb-1 text-left"
                        title="Load Equipment"
                      >
                        Load Chamber
                      </button>

                      <button
                        onClick={() => handleViewMachineDetails(machine)}
                        className="px-2 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors mb-1"
                        title="View Machine Details"
                      >
                        <Eye size={14} className="inline-block" />
                      </button>

                      <button
                        onClick={() => handleOpenTestingModal(machine.machine_id)}
                        disabled={!hasNonCompletedLoadedParts}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors block text-left flex items-center gap-2 ${hasNonCompletedLoadedParts
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        title={hasNonCompletedLoadedParts ? `View Testing for ${machine.machine_id}` : 'No active parts loaded in this equipment'}
                      >
                        <TestTube size={14} />
                        Testing
                      </button>

                      {hasNonCompletedLoadedParts && timerStatus && timerStatus.status === 'running' ? (
                        <button
                          onClick={() => handlePauseTimer(machine.machine_id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-yellow-600 text-white hover:bg-yellow-700 transition-colors text-left mt-1"
                          title="Pause Test"
                        >
                          Pause Timer
                        </button>
                      ) : hasNonCompletedLoadedParts && timerStatus && timerStatus.status === 'paused' ? (
                        <button
                          onClick={() => handleResumeTimer(machine.machine_id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors text-left mt-1"
                          title="Resume Test"
                        >
                          Resume Timer
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    return (
      <div className="overflow-x-auto border-t">
        <div style={{ minWidth: '1200px' }}>
          <div className="flex border-b bg-gray-50">
            <div className="w-80 p-4 border-r font-semibold text-sm text-gray-700">
              Equipment / Machine
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 flex">
                {dateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-center py-2 border-r border-gray-200"
                  >
                    <div className="text-[10px] font-semibold text-gray-700">{header.dayName}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{header.dateStr}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.map((machine, rowIdx) => {
            const chamberLoads = getChamberLoadsFromStorage();
            
            let stage2Records = [];
            try {
              stage2Records = JSON.parse(localStorage.getItem('stage2Records') || '[]');
            } catch (error) {
              console.error('Error loading stage2Records:', error);
            }

            const equipmentStatus = getEquipmentStatus(machine.machine_id);

            return (
              <div key={machine.sr_no} className="flex border-b hover:bg-blue-50 transition-colors">
                <div className="w-80 p-3 border-r bg-white font-medium text-sm text-gray-800 flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{
                        backgroundColor: getStatusColor(equipmentStatus?.status || 'available')
                      }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-semibold">{machine.machine_id}</div>
                      <div className="text-xs text-gray-500">{machine.machine_description}</div>
                    </div>
                    {equipmentStatus?.activeParts > 0 && (
                      <div className="ml-2 flex items-center text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                        <Clock size={12} className="mr-1" />
                        {equipmentStatus?.activeLoads || 0} load(s) • {equipmentStatus?.activeParts || 0} parts
                      </div>
                    )}
                    {equipmentStatus?.status === 'available' && equipmentStatus?.activeParts === 0 && equipmentStatus?.activeLoads === 0 && (
                      <div className="ml-2 flex items-center text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        <CheckCircle size={12} className="mr-1" />
                        Available
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative h-20 bg-gradient-to-r from-white to-gray-50">
                  <div className="absolute inset-0 flex">
                    {dateHeaders.map((_, i) => (
                      <div key={i} className="flex-1 border-r border-gray-100"></div>
                    ))}
                  </div>

                  <div
                    className="absolute top-2 bottom-2 rounded-lg transition-all duration-300 opacity-30"
                    style={{
                      left: '0%',
                      width: '100%',
                      backgroundColor:" #81c784"
                    }}
                  ></div>

                  {machine.tests.map((test, testIdx) => {
                    const isCompletedTest = stage2Records.some(record => 
                      (record.chamber === machine.machine_id || 
                       record.chamber === machine.machine_description ||
                       (record.machineDetails && 
                        (record.machineDetails.machineId === machine.machine_id || 
                         record.machineDetails.machineDescription === machine.machine_description))) &&
                      record.testName === test.testName &&
                      (record.status === 'Completed' || record.testStatus === 'completed')
                    );

                    if (isCompletedTest) {
                      return null;
                    }

                    const testStart = new Date(test.startDateTime || test.submittedAt);
                    testStart.setHours(0, 0, 0, 0);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const daysFromStart = Math.floor((testStart - today) / (1000 * 60 * 60 * 24));
                    const testDurationDays = Math.ceil(test.duration / 24);

                    const leftPercent = (daysFromStart / totalDays) * 100;
                    const widthPercent = (testDurationDays / totalDays) * 100;

                    if (leftPercent + widthPercent < 0 || leftPercent > 100) {
                      return null;
                    }

                    const adjustedLeft = Math.max(0, leftPercent);
                    const adjustedWidth = Math.min(100 - adjustedLeft, widthPercent + Math.min(0, leftPercent));

                    const endDate = new Date(testStart);
                    endDate.setDate(endDate.getDate() + testDurationDays);

                    return (
                      <div
                        key={testIdx}
                        className="absolute top-2 bottom-2 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium shadow-md transition-all hover:shadow-lg cursor-pointer z-10"
                        style={{
                          left: `${adjustedLeft}%`,
                          width: `${adjustedWidth}%`,
                          backgroundColor: '#e57373',
                          minWidth: '30px'
                        }}
                        title={`${test.testName}\nDuration: ${test.duration}h (${testDurationDays} days)\nFrom: ${testStart.toLocaleDateString()}\nTo: ${endDate.toLocaleDateString()}`}
                      >
                        {adjustedWidth > 8 && (
                          <div className="px-2 text-center">
                            <div className="font-semibold text-[11px] truncate">{test.testName}</div>
                            <div className="text-[9px] opacity-90 mt-0.5">
                              {testStart.getDate()} {testStart.toLocaleDateString('en-US', { month: 'short' })} - {endDate.getDate()} {endDate.toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="text-[9px] opacity-80">{testDurationDays}d</div>
                          </div>
                        )}
                        {adjustedWidth <= 8 && adjustedWidth > 3 && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white/90"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {getChamberLoadsFromStorage()
                    .filter(load => {
                      const isForThisMachine = load.chamber === machine.machine_id || 
                                               load.chamber === machine.machine_description;
                      
                      const isCompletedInStage2 = stage2Records.some(record => 
                        record.loadId === load.id && 
                        (record.status === 'Completed' || record.testStatus === 'completed')
                      );
                      
                      const isLoadCompleted = load.status === 'completed' || load.testStatus === 'completed';
                      
                      return isForThisMachine && 
                             !isCompletedInStage2 && 
                             !isLoadCompleted;
                    })
                    .map((load, loadIdx) => {
                      let startTime, endTime, shouldShowRed = false;

                      if (load.timerStatus === 'start' && load.timerStartTime) {
                        startTime = new Date(load.timerStartTime);
                        const durationInMs = parseFloat(load.duration) * 60 * 60 * 1000;
                        const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
                        endTime = new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);
                        shouldShowRed = true;
                      } else if (load.timerStatus === 'paused' && load.timerStartTime) {
                        startTime = new Date(load.timerStartTime);
                        const durationInMs = parseFloat(load.duration) * 60 * 60 * 1000;
                        const totalPausedTimeMs = (load.totalPausedTime || 0) * 1000;
                        endTime = new Date(startTime.getTime() + durationInMs + totalPausedTimeMs);
                        shouldShowRed = true;
                      } else {
                        return null;
                      }

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const loadDurationMs = endTime - startTime;
                      const loadDurationDays = loadDurationMs / (1000 * 60 * 60 * 24);

                      const loadStartDate = new Date(startTime);
                      loadStartDate.setHours(0, 0, 0, 0);
                      const daysFromStart = Math.floor((loadStartDate - today) / (1000 * 60 * 60 * 24));

                      const startHour = startTime.getHours();
                      const startMinute = startTime.getMinutes();
                      const startSecond = startTime.getSeconds();
                      const startMillisecond = startTime.getMilliseconds();

                      const totalSecondsInDay = 24 * 60 * 60;
                      const exactFraction = (startHour * 3600 + startMinute * 60 + startSecond + startMillisecond / 1000) / totalSecondsInDay;

                      const verticalLineLeftPercent = (daysFromStart / totalDays) * 100 + (exactFraction / totalDays) * 100;

                      const oneMsInDays = 1 / (1000 * 60 * 60 * 24);
                      const barStartPercent = verticalLineLeftPercent + (oneMsInDays / totalDays) * 100;

                      const barWidthPercent = (loadDurationDays / totalDays) * 100;

                      const verticalLineAdjustedLeft = Math.max(0, verticalLineLeftPercent);
                      const barAdjustedLeft = Math.max(0, barStartPercent);
                      const barAdjustedWidth = Math.min(100 - barAdjustedLeft, barWidthPercent + Math.min(0, barStartPercent));

                      const isVerticalVisible = verticalLineAdjustedLeft >= 0 && verticalLineAdjustedLeft <= 100;
                      const isBarVisible = barAdjustedWidth > 0 && shouldShowRed;

                      if (!isVerticalVisible && !isBarVisible) return null;

                      let verticalColor, barColor, borderColor, statusText;

                      if (load.timerStatus === 'start') {
                        verticalColor = '#FFEB3B';
                        barColor = '#f44336';
                        borderColor = '#d32f2f';
                        statusText = 'Test Started';
                      } else if (load.timerStatus === 'paused') {
                        verticalColor = '#FFEB3B';
                        barColor = '#f44336';
                        borderColor = '#d32f2f';
                        statusText = 'Test Paused';
                      } else {
                        return null;
                      }

                      const remainingTime = calculateRemainingTime(load);

                      return (
                        <React.Fragment key={`load-${load.id}-${loadIdx}`}>
                          {isVerticalVisible && (
                            <div
                              className="absolute top-0 bottom-0 cursor-pointer z-30"
                              style={{
                                left: `${verticalLineAdjustedLeft}%`,
                                width: '3px',
                                marginLeft: '-1.5px',
                                backgroundColor: verticalColor,
                                boxShadow: `0 0 5px 2px ${verticalColor === '#FFEB3B' ? 'rgba(255, 235, 59, 0.5)' :
                                  verticalColor === '#FF9800' ? 'rgba(255, 152, 0, 0.5)' :
                                    'rgba(158, 158, 158, 0.5)'}`,
                                pointerEvents: 'auto'
                              }}
                              title={`${statusText}\nEquipment: ${load.machineId || load.chamber}\nStart Time: ${startTime.toLocaleString()}\nOriginal Duration: ${load.duration} hours\nTotal Paused Time: ${formatTime(load.totalPausedTime || 0)}\nAdjusted End Time: ${endTime.toLocaleString()}\nStatus: ${load.timerStatus}\nParts: ${load.parts.map(p => p.partNumber).join(', ')}\n${remainingTime ? `Remaining: ${remainingTime}` : ''}`}
                            />
                          )}

                          {isBarVisible && shouldShowRed && (
                            <div
                              className="absolute top-2 bottom-2 flex flex-col items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer z-20"
                              style={{
                                left: `${barAdjustedLeft}%`,
                                width: `${barAdjustedWidth}%`,
                                backgroundColor: barColor,
                                minWidth: '2px',
                                borderRadius: '0 4px 4px 0',
                                border: `1px solid ${borderColor}`
                              }}
                              title={`${load.timerStatus === 'paused' ? 'Test Paused' : 'Test Running'}\nEquipment: ${load.machineId || load.chamber}\nStatus: ${load.timerStatus}\nStarted: ${startTime.toLocaleString()}\nOriginal End: ${new Date(startTime.getTime() + (parseFloat(load.duration) * 60 * 60 * 1000)).toLocaleString()}${load.timerStatus === 'paused' ? `\nTotal Paused: ${formatTime(load.totalPausedTime || 0)}\nAdjusted Ends: ${endTime.toLocaleString()}` : ''}\nDuration: ${load.duration} hours\nRemaining: ${Math.ceil((endTime - new Date()) / (1000 * 60 * 60 * 24))} days\nParts: ${load.parts.length}`}
                            >
                              {barAdjustedWidth > 3 && (
                                <div className="px-1 text-center">
                                  <div className="font-semibold text-[10px] truncate text-white">
                                    {load.parts.length} part{load.parts.length > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-[8px] text-white opacity-90 mt-0.5">
                                    {load.duration}h
                                  </div>
                                  <div className="text-[7px] text-white opacity-70 mt-0.5">
                                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-[7px] text-white opacity-70 mt-0.5">
                                    Status: {load.timerStatus}
                                  </div>
                                </div>
                              )}
                              {barAdjustedWidth <= 3 && barAdjustedWidth > 1 && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/90"></div>
                                </div>
                              )}
                              {barAdjustedWidth <= 1 && (
                                <div className="w-full h-full bg-red-600"></div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImageUploadSection = (part) => {
    const isUploadingCosmetic = uploadingImages[part.id]?.cosmetic || false;
    const isUploadingNonCosmetic = uploadingImages[part.id]?.nonCosmetic || false;

    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Upload Images for {part.partNumber}</h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cosmetic Images
            </label>

            {part.cosmeticImages && part.cosmeticImages.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {part.cosmeticImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Cosmetic ${index + 1}`}
                        className="w-16 h-16 object-cover border rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveImage(part.id, 'cosmetic', index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {part.cosmeticImages.length} image(s) uploaded
                </div>
              </div>
            )}

            <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed ${isUploadingCosmetic ? 'border-gray-300 bg-gray-100' : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'} rounded-lg cursor-pointer transition-colors`}>
              {isUploadingCosmetic ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <span className="text-sm text-blue-600">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="text-blue-400 mb-2" size={20} />
                  <span className="text-sm font-medium text-blue-600">
                    {part.cosmeticImages?.length > 0 ? 'Add More Cosmetic Images' : 'Upload Cosmetic Image'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Click to browse</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        handleImageUpload(part.id, 'cosmetic', file);
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </>
              )}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Non-Cosmetic Images
            </label>

            {part.nonCosmeticImages && part.nonCosmeticImages.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {part.nonCosmeticImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Non-Cosmetic ${index + 1}`}
                        className="w-16 h-16 object-cover border rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveImage(part.id, 'nonCosmetic', index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {part.nonCosmeticImages.length} image(s) uploaded
                </div>
              </div>
            )}

            <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed ${isUploadingNonCosmetic ? 'border-gray-300 bg-gray-100' : 'border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100'} rounded-lg cursor-pointer transition-colors`}>
              {isUploadingNonCosmetic ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <span className="text-sm text-green-600">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="text-green-400 mb-2" size={20} />
                  <span className="text-sm font-medium text-green-600">
                    {part.nonCosmeticImages?.length > 0 ? 'Add More Non-Cosmetic Images' : 'Upload Non-Cosmetic Image'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Click to browse</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        handleImageUpload(part.id, 'nonCosmetic', file);
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </>
              )}
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Equipment Schedule Gantt Chart</h2>
              <p className="text-sm text-gray-600">Timeline view of equipment testing schedules</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden mr-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Grid size={16} />
                Table View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Calendar size={16} />
                Calendar View
              </button>
            </div>

            <div className="mr-2">
              <label className="text-xs text-gray-600 mr-2">Timeline:</label>
              <select
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                const tests = await loadRunningTests();
                loadMachineData(tests);
                setLoading(false);
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading data...</p>
          </div>
        ) : (
          <>
            {viewMode === 'calendar' ? renderCalendarView() : renderTableView()}

            <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded-lg" style={{ backgroundColor: '#81c784' }}></div>
                    <span className="text-sm text-gray-700">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded-lg" style={{ backgroundColor: '#f44336' }}></div>
                    <span className="text-sm text-gray-700">Test Started (Active)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded-lg" style={{ backgroundColor: '#FF9800' }}></div>
                    <span className="text-sm text-gray-700">Test Paused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded-lg" style={{ backgroundColor: '#e57373' }}></div>
                    <span className="text-sm text-gray-700">Scheduled Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-4 bg-yellow-500"></div>
                    <span className="text-sm text-gray-700">Start Time Marker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-4 bg-gray-400"></div>
                    <span className="text-sm text-gray-700">Loaded (Not Started)</span>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  {viewMode === 'calendar'
                    ? `Showing ${numberOfDays} days • ${runningTests.length} active test(s)`
                    : `${data.length} equipment units • Last updated: ${new Date().toLocaleTimeString()}`
                  }
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Load Equipment Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-white sticky top-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Load Equipment: {selectedChamber}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const machine = data.find(m =>
                      m.machine_id === selectedChamber ||
                      m.machine_description === selectedChamber
                    );
                    return machine
                      ? `${machine.machine_description} (${machine.machine_id})`
                      : selectedChamber;
                  })()}
                </p>
              </div>
              <button
                onClick={() => {
                  setChamberLoadingStatus(prev => ({
                    ...prev,
                    [selectedChamber]: false
                  }));
                  setShowLoadModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {machineDetails && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="text-blue-600" size={20} />
                    <h4 className="font-semibold text-blue-800">Equipment Details</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Equipment ID:</span>
                      <span className="font-medium ml-2">{machineDetails.machineId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Machine:</span>
                      <span className="font-medium ml-2">{machineDetails.machine}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ticket:</span>
                      <span className="font-medium ml-2">{machineDetails.ticketCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Project:</span>
                      <span className="font-medium ml-2">{machineDetails.project} / {machineDetails.build}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Colour:</span>
                      <span className="font-medium ml-2">{machineDetails.colour}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Tests:</span>
                      <span className="font-medium ml-2">{machineDetails.totalTests}</span>
                    </div>
                  </div>
                  {machineDetails.tests.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-600">Available Tests:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {machineDetails.tests.map(test => (
                          <div
                            key={test.id}
                            className={`flex flex-col px-3 py-2 ${test.hasCheckpoints ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} rounded text-xs font-medium`}
                            title={`${test.testName}${test.hasCheckpoints ? `\nCheckpoints: ${test.checkpoints?.join(', ') || 'None'}` : ''}\nRequired: ${test.requiredQty} parts\nRemaining to allocate: ${test.remainingQty} parts\nAlready allocated: ${test.alreadyAllocated}/${test.requiredQty}\nStatus: ${test.statusText}`}
                          >
                            <span className="font-semibold">{test.testName}</span>
                            {test.hasCheckpoints && (
                              <div className="mt-1 text-xs">
                                <span>Checkpoint {test.checkpointIndex + 1} of {test.totalCheckpoints}</span>
                                <div className="text-xs mt-0.5">{test.currentCheckpoint}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timer Controls Section */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Clock className="text-blue-600" size={18} />
                  Test Timer Control
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(parseInt(e.target.value) || 24)}
                      min="1"
                      max="720"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={timerStatus === 'start'}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 24 hours</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Timer Status
                    </label>
                    <div className={`px-3 py-2 rounded-lg font-medium ${timerStatus === 'start' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {timerStatus === 'start' ? 'Running' : 'Stopped'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Elapsed Time
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-lg text-center">
                      {formatTime(elapsedTime)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleStartTimer}
                    disabled={timerStatus === 'start' || scannedParts.length === 0}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 ${timerStatus === 'start' || scannedParts.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    <Clock size={18} />
                    Start Timer ({timerDuration}h)
                  </button>

                  <button
                    onClick={handleStopTimer}
                    disabled={timerStatus === 'stop'}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 ${timerStatus === 'stop'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    <X size={18} />
                    Stop Timer
                  </button>
                </div>

                {timerStatus === 'start' && timerStartTime && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>Timer started at: {new Date(timerStartTime).toLocaleTimeString()}</p>
                    <p>Will complete at: {new Date(new Date(timerStartTime).getTime() + (timerDuration * 60 * 60 * 1000)).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan Part Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partInput}
                    onChange={(e) => setPartInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePartScan()}
                    placeholder="Enter part number (e.g., PART-001)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handlePartScan}
                    disabled={scanning || !partInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {scanning ? (
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
                  Enter part number to search in OQC records
                </p>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Scanned Parts ({scannedParts.length})
                </h4>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {scannedParts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      No parts scanned yet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {scannedParts.map((part) => (
                        <div key={part.id} className="p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="font-medium text-gray-800 text-lg">{part.partNumber}</div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${part.scanStatus === 'OK'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {part.scanStatus}
                                </span>
                                {part.checkpointInfo && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Checkpoint {part.checkpointInfo.checkpointIndex + 1}/{part.checkpointInfo.totalCheckpoints}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-2 space-y-1">
                                <div>Serial: {part.serialNumber} • Ticket: {part.ticketCode}</div>
                                <div>Project: {part.project} | Build: {part.build} | Colour: {part.colour}</div>
                                {part.checkpointInfo && (
                                  <div className="text-purple-600">
                                    Checkpoint: {part.checkpointInfo.checkpoint}
                                  </div>
                                )}
                                <div className="text-gray-400 text-xs">Scanned: {part.scannedAt}</div>
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

                          {renderImageUploadSection(part)}

                          {/* Test Selection Dropdown */}
                          {part.availableTests && part.availableTests.length > 0 && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Test
                              </label>
                              <select
                                value={part.selectedTestId || ''}
                                onChange={(e) => handleTestSelection(part.id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select a test...</option>
                                {part.availableTests.map(test => (
                                  <option key={test.id} value={test.id}>
                                    {test.testName}
                                    {test.hasCheckpoints ? ` - Checkpoint ${test.checkpointIndex + 1}/${test.totalCheckpoints}: ${test.currentCheckpoint}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {scannedParts.length > 0 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <ImageIcon size={16} />
                    Image Upload Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Parts with cosmetic images:</span>
                      <span className="font-medium ml-2">
                        {scannedParts.filter(p => p.cosmeticImages?.length > 0).length} / {scannedParts.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Parts with non-cosmetic images:</span>
                      <span className="font-medium ml-2">
                        {scannedParts.filter(p => p.nonCosmeticImages?.length > 0).length} / {scannedParts.length}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Total images uploaded:</span>
                      <span className="font-medium ml-2">
                        {scannedParts.reduce((sum, part) =>
                          sum + (part.cosmeticImages?.length || 0) + (part.nonCosmeticImages?.length || 0), 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setChamberLoadingStatus(prev => ({
                      ...prev,
                      [selectedChamber]: false
                    }));
                    setShowLoadModal(false);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLoad}
                  disabled={scannedParts.length === 0 || !timerStarted}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Load ({scannedParts.length} parts)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MachineDetailsModal />
      <TestingModal />
      <DeleteConfirmModal />
    </div>
  );
};

export default PlanningPage;