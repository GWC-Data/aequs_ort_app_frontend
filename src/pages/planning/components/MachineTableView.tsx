import React from 'react';
import { Eye, TestTube, Clock, Play, Pause, AlertCircle } from 'lucide-react';
import { MachineItem } from '../types';

interface MachineTableViewProps {
  data: MachineItem[];
  chamberLoads: any[];
  onLoadChamber: (machineId: string) => void;
  onViewDetails: (machine: MachineItem) => void;
  onOpenTesting: (machineId: string) => void;
  onPauseTimer: (machineId: string) => void;
  onResumeTimer: (machineId: string) => void;
  getEquipmentStatus: (machineId: string) => any;
  getMachineTimerStatus: (machineId: string) => any;
  calculateRemainingTime?: (load: any) => number; // Optional prop for remaining time
}

const MachineTableView: React.FC<MachineTableViewProps> = ({
  data,
  chamberLoads,
  onLoadChamber,
  onViewDetails,
  onOpenTesting,
  onPauseTimer,
  onResumeTimer,
  getEquipmentStatus,
  getMachineTimerStatus,
  calculateRemainingTime
}) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'loading': return 'Loading...';
      default: return 'Unknown';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'loading':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Fixed: Helper to get active loads for a machine
  const getActiveLoadsForMachine = (machineId: string) => {
    const machine = data.find(m => m.machine_id === machineId);
    if (!machine) return [];

    return chamberLoads.filter(load => {
      // Match by machineId, machineId property, or machine description
      const isChamberMatch = 
        load.chamber === machineId || 
        load.machineId === machineId ||
        load.chamber === machine.machine_description ||
        (load.machineDetails && load.machineDetails.machineId === machineId);
      
      // Check if load is active (not completed)
      const isActive = 
        !load.isCompleted && 
        load.status !== 'completed' && 
        load.testStatus !== 'completed' &&
        load.timerStatus !== 'completed';
      
      // Additional check for parts
      const hasParts = load.parts && load.parts.length > 0;
      
      return isChamberMatch && isActive && hasParts;
    });
  };

  // Fixed: Helper to check if machine has pending tests (loaded but not started)
  const hasPendingTests = (machineId: string) => {
    const activeLoads = getActiveLoadsForMachine(machineId);
    return activeLoads.some(load => {
      // Check if timer is not started or is in a pending state
      return !load.timerStatus || 
             load.timerStatus === 'loaded' || 
             load.timerStatus === 'stopped' ||
             load.timerStatus === 'stop' ||
             (load.timerStatus !== 'start' && 
              load.timerStatus !== 'paused' &&
              load.timerStatus !== 'running');
    });
  };

  // Fixed: Helper to get remaining time for display
  const getDisplayRemainingTime = (machineId: string) => {
    const timerStatus = getMachineTimerStatus(machineId);
    if (timerStatus?.remainingTime !== undefined) {
      return timerStatus.remainingTime;
    }
    
    // Fallback: calculate from first active load
    const activeLoads = getActiveLoadsForMachine(machineId);
    if (activeLoads.length > 0 && calculateRemainingTime) {
      return calculateRemainingTime(activeLoads[0]);
    }
    
    // If no active loads but machine has timer running, check timer status
    const machineTimer = getMachineTimerStatus(machineId);
    if (machineTimer?.remainingTime) {
      return machineTimer.remainingTime;
    }
    
    return 0;
  };

  // Helper to check if machine has any loaded parts
  const hasNonCompletedLoadedParts = (machineId: string) => {
    const activeLoads = getActiveLoadsForMachine(machineId);
    return activeLoads.some(load => 
      load.parts && 
      load.parts.length > 0 && 
      load.parts.some(part => !part.isCompleted && part.testStatus !== 'completed')
    );
  };

  return (
    <div className="p-6">
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-50 to-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Equipment ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Machine Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Parts in Chamber
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Timer Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Remaining Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((machine) => {
              const status = getEquipmentStatus(machine.machine_id);
              const timerStatus = getMachineTimerStatus(machine.machine_id);
              const activeLoads = getActiveLoadsForMachine(machine.machine_id);
              const remainingTime = getDisplayRemainingTime(machine.machine_id);
              const hasPending = hasPendingTests(machine.machine_id);
              const hasNonCompletedParts = hasNonCompletedLoadedParts(machine.machine_id);
              
              // Debug logging (remove in production)
              // console.log(`Machine ${machine.machine_id}:`, {
              //   activeLoads: activeLoads.length,
              //   hasPending,
              //   hasNonCompletedParts,
              //   status,
              //   timerStatus
              // });

              return (
                <tr 
                  key={machine.sr_no} 
                  className={`hover:bg-gray-50 transition-colors duration-150 ${
                    status?.status === 'occupied' ? 'bg-red-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{machine.machine_id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{machine.machine_description}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(status?.status || 'available')}`}>
                        {status?.status === 'occupied' && (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {getStatusText(status?.status || 'available')}
                      </span>
                      {activeLoads.length > 0 && (
                        <span className="text-xs text-gray-600">
                          {activeLoads.length} active load(s)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold ${
                        status?.activeParts > 0 ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {status?.activeParts || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {timerStatus ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {timerStatus.status === 'running' || timerStatus.status === 'start' ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-green-600">Running</span>
                              <Clock className="w-3 h-3 text-gray-400" />
                            </>
                          ) : timerStatus.status === 'paused' ? (
                            <>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-sm font-medium text-yellow-600">Paused</span>
                              <Pause className="w-3 h-3 text-gray-400" />
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-600">Stopped</span>
                            </>
                          )}
                        </div>
                        {timerStatus.elapsed > 0 && (
                          <div className="text-xs text-gray-500">
                            Elapsed: {formatTime(timerStatus.elapsed)}
                          </div>
                        )}
                      </div>
                    ) : hasPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-600">Loaded - Ready</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-600">No load</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {remainingTime > 0 ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm font-semibold ${
                          remainingTime < 3600 ? 'text-red-600' : 
                          remainingTime < 7200 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {formatTime(remainingTime)}
                        </span>
                        {remainingTime < 3600 && (
                          <span className="text-xs text-red-500 font-medium">(Soon)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">0</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onLoadChamber(machine.machine_id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow"
                        title="Load Equipment into Chamber"
                      >
                        <span>Load</span>
                      </button>
                      
                      <button
                        onClick={() => onViewDetails(machine)}
                        className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow"
                        title="View Machine Details"
                      >
                        <Eye size={14} />
                      </button>
                      
                      <button
                        onClick={() => onOpenTesting(machine.machine_id)}
                        disabled={!hasNonCompletedParts}
                        className={`inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow ${
                          hasNonCompletedParts
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        title={
                          hasNonCompletedParts 
                            ? `View Testing for ${machine.machine_id}` 
                            : 'No active parts loaded'
                        }
                      >
                        <TestTube size={14} />
                      </button>
                      
                      {hasNonCompletedParts && (timerStatus?.status === 'running' || timerStatus?.status === 'start') && (
                        <button
                          onClick={() => onPauseTimer(machine.machine_id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-sm hover:shadow"
                          title="Pause Test Timer"
                        >
                          <Pause size={12} className="mr-1" />
                          Pause
                        </button>
                      )}
                      
                      {hasNonCompletedParts && timerStatus?.status === 'paused' && (
                        <button
                          onClick={() => onResumeTimer(machine.machine_id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow"
                          title="Resume Test Timer"
                        >
                          <Play size={12} className="mr-1" />
                          Resume
                        </button>
                      )}
                      
                      {hasPending && (
                        <button
                          onClick={() => onResumeTimer(machine.machine_id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow"
                          title="Start Test Timer"
                        >
                          <Play size={12} className="mr-1" />
                          Start
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {data.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Equipment Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No machine data is available. Please check your data source or refresh the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineTableView;