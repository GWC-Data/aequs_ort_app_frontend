import React from 'react';
import { ChamberData } from '../types';
import { formatDate } from '../utils/helpers';

interface MachineDetailsProps {
  chamberData: ChamberData;
}

const MachineDetails: React.FC<MachineDetailsProps> = ({ chamberData }) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 ">
        Machine Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-2">
        <div>
          <p className="text-sm text-gray-600 mb-1">Chamber ID</p>
          <span className="text-lg font-semibold text-gray-800">{chamberData.chamber}</span>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Machine Description</p>
          <p className="text-lg font-semibold text-gray-800">{chamberData.machineDetails?.machineDescription}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="text-lg font-semibold text-green-600 capitalize">{chamberData.timerStatus}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Test Duration</p>
          <p className="text-lg font-semibold text-gray-800">
            {chamberData.duration} {chamberData.testUnit}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Started At</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatDate(chamberData.timerStartTime)}
          </p>
        </div>
        {/* <div>
          <p className="text-sm text-gray-600 mb-1">Est. Completion</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatDate(chamberData.estimatedCompletion)}
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default MachineDetails;