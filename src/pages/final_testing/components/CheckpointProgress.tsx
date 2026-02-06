import React from 'react';
import { Part } from '../types';
import { getCheckpointsForPart } from '../utils/helpers';

interface CheckpointProgressProps {
  parts: Part[];
}

const CheckpointProgress: React.FC<CheckpointProgressProps> = ({ parts }) => {
  if (!parts || parts.length === 0) return null;

  const getOverallProgress = () => {
    let totalCheckpoints = 0;
    let completedCheckpoints = 0;

    parts.forEach(part => {
      const checkpoints = getCheckpointsForPart(part);
      const currentIndex = part.checkpointInfo?.checkpointIndex || 0;
      totalCheckpoints += checkpoints.length;
      completedCheckpoints += Math.min(currentIndex, checkpoints.length);
    });

    return totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;
  };

  const getCompletedCount = () => {
    let completed = 0;
    parts.forEach(part => {
      const checkpoints = getCheckpointsForPart(part);
      const currentIndex = part.checkpointInfo?.checkpointIndex || 0;
      completed += Math.min(currentIndex, checkpoints.length);
    });
    return completed;
  };

  const getTotalCheckpoints = () => {
    let total = 0;
    parts.forEach(part => {
      total += getCheckpointsForPart(part).length;
    });
    return total;
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
        Checkpoint Progress
      </h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span>{getCompletedCount()} of {getTotalCheckpoints()} checkpoints completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getOverallProgress()}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parts.map((part, partIndex) => {
          const checkpoints = getCheckpointsForPart(part);
          const currentIndex = part.checkpointInfo?.checkpointIndex || 0;
          const totalForPart = checkpoints.length;
          const isFailed = part.checkpointData?.some(cp => cp.status === 'fail');

          return (
            <div
              key={partIndex}
              className={`bg-white border rounded-lg p-4 ${
                isFailed ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">{part.partNumber}</h3>
                {isFailed && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">FAILED</span>
                )}
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{Math.min(currentIndex, totalForPart)}/{totalForPart}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    isFailed ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(Math.min(currentIndex, totalForPart) / totalForPart) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Status: {currentIndex >= totalForPart ? 'Completed' : isFailed ? 'Failed' : 'In Progress'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckpointProgress;