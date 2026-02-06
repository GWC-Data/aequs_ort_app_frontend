import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Settings, Thermometer, Droplets } from 'lucide-react';

interface MachineDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: any;
  getEquipmentStatus: (machineId: string) => any;
}

const MachineDetailsModal: React.FC<MachineDetailsModalProps> = ({
  isOpen,
  onClose,
  machine,
  getEquipmentStatus
}) => {
  if (!machine) return null;

  const equipmentStatus = getEquipmentStatus(machine.machine_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            <div className="flex items-center gap-3">
              <Settings className="text-blue-600" size={24} />
              <span>Equipment Details</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            {machine.machine_id} - {machine.machine_description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-blue-50 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 w-1/2">
                    {machine.machine_description} ({machine.machine_id})
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
                    <div className="text-sm font-medium text-gray-900">{machine.lastCalibration || '26-04-2025'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{machine.nextCalibration || '26-04-2026'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{machine.lastChamberCleaning || '09-12-2025'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{machine.chamberId || 'HS-01'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{machine.labTemperature || '19°C'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{machine.labHumidity || '40%'}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Equipment Status */}
          {equipmentStatus && (
            <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h4 className="text-sm font-semibold text-gray-700">Current Equipment Status</h4>
              </div>
              <div className="p-4 bg-white">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      equipmentStatus.status === 'available' ? 'bg-green-100 text-green-800' :
                      equipmentStatus.status === 'occupied' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {equipmentStatus.status === 'available' ? 'Available' :
                       equipmentStatus.status === 'occupied' ? 'Occupied' : 'Loading'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Loads:</span>
                    <span className="font-medium ml-2">{equipmentStatus.activeLoads}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Parts:</span>
                    <span className="font-medium ml-2">{equipmentStatus.activeParts}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Running Timers:</span>
                    <span className="font-medium ml-2">{equipmentStatus.runningTimers}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium ml-2">{equipmentStatus.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MachineDetailsModal;