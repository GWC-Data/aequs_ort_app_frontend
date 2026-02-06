import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, TestTube, Clock, Calendar, Trash2, CheckCircle } from 'lucide-react';
import { ChamberLoad, Part } from '../types';

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
  const [selectedLoadsForAction, setSelectedLoadsForAction] = useState<number[]>([]);

  const activeMachineLoads = useMemo(() => {
    if (!machineIdentifier) return [];
    return chamberLoads
      .filter(load => load.chamber === machineIdentifier)
      .sort((a, b) => new Date(b.loadedAt).getTime() - new Date(a.loadedAt).getTime());
  }, [machineIdentifier, chamberLoads]);

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
                            <div className={`text-sm font-medium ${
                              statusInfo.label === 'Active' ? 'text-blue-600' :
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

          {activeMachineLoads.length === 0 && (
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

export default TestingModal;