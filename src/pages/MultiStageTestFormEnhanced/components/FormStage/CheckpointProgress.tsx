// components/FormStage/CheckpointProgress.tsx
import React from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';

interface CheckpointProgressProps {
    partNumber: string;
}

interface CheckpointInfo {
    checkpoints: string[];
    currentCheckpoint: string;
    checkpointIndex: number;
    totalCheckpoints: number;
    testUnit: string;
    testValue?: number;
}

export const CheckpointProgress: React.FC<CheckpointProgressProps> = ({ partNumber }) => {
    const getCheckpointInfo = (): CheckpointInfo | null => {
        try {
            const chamberLoadsStr = localStorage.getItem('chamberLoads');
            if (!chamberLoadsStr) return null;

            const chamberLoads = JSON.parse(chamberLoadsStr);

            for (const load of chamberLoads) {
                if (load.parts && Array.isArray(load.parts)) {
                    const part = load.parts.find((p: any) => p.partNumber === partNumber);
                    if (part) {
                        return {
                            checkpoints: part.checkpoints || [],
                            currentCheckpoint: part.currentCheckpoint || '',
                            checkpointIndex: part.checkpointIndex || 0,
                            totalCheckpoints: part.totalCheckpoints || 0,
                            testUnit: part.testUnit || '',
                            testValue: part.testValue
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting checkpoint info:', error);
            return null;
        }
    };

    const checkpointInfo = getCheckpointInfo();

    if (!checkpointInfo || !checkpointInfo.checkpoints || checkpointInfo.checkpoints.length === 0) {
        return null;
    }

    const { checkpoints, checkpointIndex, totalCheckpoints, testUnit, testValue } = checkpointInfo;
    const completedCount = checkpointIndex;

    // Calculate progress percentage
    const progressPercentage = totalCheckpoints > 0 
        ? Math.round((checkpointIndex / totalCheckpoints) * 100)
        : 0;

    // Format test unit display
    const formatTestUnit = (unit: string): string => {
        const unitMap: Record<string, string> = {
            'cycle': 'Cycles',
            'hour': 'Hours',
            'drops': 'Drops',
            'orientations': 'Orientations'
        };
        return unitMap[unit] || unit;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Checkpoint Progress</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                                {formatTestUnit(testUnit)} Test
                            </span>
                            {testValue && (
                                <span className="text-sm text-blue-600 font-medium">
                                    ({testValue} {formatTestUnit(testUnit).toLowerCase()})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                        {completedCount}/{totalCheckpoints}
                    </div>
                    <div className="text-sm text-gray-500">Checkpoints Completed</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Checkpoint Steps */}
            <div className="overflow-x-auto">
                <div className="flex items-center justify-between min-w-max">
                    {checkpoints.map((checkpoint, index) => {
                        const isCompleted = index < checkpointIndex;
                        const isCurrent = index === checkpointIndex;
                        const isFuture = index > checkpointIndex;

                        return (
                            <React.Fragment key={checkpoint}>
                                {/* Checkpoint Step */}
                                <div className={`flex flex-col items-center ${isCurrent ? 'z-10' : ''}`}>
                                    <div className={`
                                        flex items-center justify-center w-10 h-10 rounded-full border-2 
                                        ${isCompleted 
                                            ? 'bg-green-100 border-green-500 text-green-600' 
                                            : isCurrent
                                            ? 'bg-blue-100 border-blue-500 text-blue-600'
                                            : 'bg-gray-100 border-gray-300 text-gray-400'
                                        }
                                    `}>
                                        {isCompleted ? (
                                            <CheckCircle size={20} />
                                        ) : (
                                            <span className="font-semibold">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`
                                        text-sm font-medium mt-2 whitespace-nowrap
                                        ${isCompleted ? 'text-green-700' : 
                                          isCurrent ? 'text-blue-700 font-semibold' : 
                                          'text-gray-500'}
                                    `}>
                                        {checkpoint}
                                        {isCurrent && (
                                            <span className="ml-1 text-xs text-blue-600">(Current)</span>
                                        )}
                                    </span>
                                </div>

                                {/* Connector Line */}
                                {index < checkpoints.length - 1 && (
                                    <div className="flex-1 mx-2">
                                        <ChevronRight className={`
                                            ${isCompleted ? 'text-green-500' : 'text-gray-300'}
                                        `} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Status Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-600">1</div>
                        <div className="text-sm text-gray-600">Current</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-400">
                            {Math.max(0, totalCheckpoints - completedCount - 1)}
                        </div>
                        <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                    <div className="text-sm text-blue-800">
                        <strong>Instructions:</strong> When status is "Pass", click "Checkpoint" button to proceed to next checkpoint. 
                        Each checkpoint will create a new test row. Status "Fail" will bypass all remaining checkpoints.
                    </div>
                </div>
            </div>
        </div>
    );
};