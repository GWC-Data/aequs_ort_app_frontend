import React from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, Loader, Play, Pause } from 'lucide-react';

interface StatusLegendProps {
  viewMode: 'table' | 'calendar';
  numberOfDays: number;
  data: any[];
  chamberLoads: any[];
  getEquipmentStatus?: (machineId: string) => any;
}

const StatusLegend: React.FC<StatusLegendProps> = ({
  viewMode,
  numberOfDays,
  data,
  chamberLoads,
  getEquipmentStatus
}) => {
  // Helper to count active loads
  const countActiveLoads = () => {
    if (!chamberLoads) return 0;
    return chamberLoads.filter(load => {
      const isCompleted = load.isCompleted || 
                         load.status === 'completed' || 
                         load.testStatus === 'completed';
      return !isCompleted && 
             (load.timerStatus === 'start' || load.timerStatus === 'paused');
    }).length;
  };

  // Helper to count completed loads
  const countCompletedLoads = () => {
    if (!chamberLoads) return 0;
    return chamberLoads.filter(load => {
      return load.isCompleted || 
             load.status === 'completed' || 
             load.testStatus === 'completed';
    }).length;
  };

  // Helper to count available equipment
  const countAvailableEquipment = () => {
    if (!data || !getEquipmentStatus) return 0;
    return data.filter(machine => {
      const status = getEquipmentStatus(machine.machine_id);
      return status?.status === 'available';
    }).length;
  };

  // Helper to count occupied equipment
  const countOccupiedEquipment = () => {
    if (!data || !getEquipmentStatus) return 0;
    return data.filter(machine => {
      const status = getEquipmentStatus(machine.machine_id);
      return status?.status === 'occupied';
    }).length;
  };

  const activeLoadsCount = countActiveLoads();
  const completedLoadsCount = countCompletedLoads();
  const availableEquipmentCount = countAvailableEquipment();
  const occupiedEquipmentCount = countOccupiedEquipment();

  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          {/* Available Status */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <span className="text-sm text-gray-700 font-medium">Available</span>
            {availableEquipmentCount > 0 && (
              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                {availableEquipmentCount}
              </span>
            )}
          </div>

          {/* Occupied/Running Status */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-sm text-gray-700 font-medium">Running Test</span>
            {activeLoadsCount > 0 && (
              <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                {activeLoadsCount}
              </span>
            )}
          </div>

          {/* Paused Status */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-sm text-gray-700 font-medium">Paused Test</span>
          </div>

          {/* Loading Status */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full animate-pulse" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="text-sm text-gray-700 font-medium">Loading...</span>
          </div>

          {/* Completed Status */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span className="text-sm text-gray-700 font-medium">Completed</span>
            {completedLoadsCount > 0 && (
              <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                {completedLoadsCount}
              </span>
            )}
          </div>

          {viewMode === 'calendar' && (
            <>
              {/* Today Marker */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-5 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700 font-medium">Today</span>
              </div>

              {/* Weekend */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border border-gray-300 bg-gray-50"></div>
                <span className="text-sm text-gray-700 font-medium">Weekend</span>
              </div>
            </>
          )}
        </div>

        {/* Statistics */}
        <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-wrap gap-4">
            {viewMode === 'calendar' ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>{numberOfDays} days view</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-500" />
                  <span>{activeLoadsCount} active test(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  <span>{completedLoadsCount} completed</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <span>{data?.length || 0} equipment units</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{availableEquipmentCount} available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{occupiedEquipmentCount} occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Key Information */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Status Key:</span>
            <ul className="mt-1 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Available - Ready for loading</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Occupied - Test in progress</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Paused - Test temporarily stopped</span>
              </li>
            </ul>
          </div>
          
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Timer Status:</span>
            <ul className="mt-1 space-y-1">
              <li className="flex items-center gap-2">
                <Play className="w-3 h-3 text-green-500" />
                <span>Running - Test timer is active</span>
              </li>
              <li className="flex items-center gap-2">
                <Pause className="w-3 h-3 text-yellow-500" />
                <span>Paused - Timer stopped manually</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-purple-500" />
                <span>Completed - Test finished</span>
              </li>
            </ul>
          </div>
          
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Quick Actions:</span>
            <ul className="mt-1 space-y-1">
              <li>• Click <span className="font-medium text-green-600">Load</span> to add equipment</li>
              <li>• Click <span className="font-medium text-blue-600">Details</span> for machine info</li>
              <li>• Click <span className="font-medium text-purple-600">Test</span> for active loads</li>
              <li>• Use timeline bars to navigate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusLegend;