import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { ChildTest } from '../../types';

interface ChildTestProgressProps {
    childTests: ChildTest[];
    currentChildTestIndex: number;
    onChildTestChange: (index: number) => void;
}

export const ChildTestProgress: React.FC<ChildTestProgressProps> = ({
    childTests,
    currentChildTestIndex,
    onChildTestChange
}) => {
    return (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Child Tests Progress</h3>
            <div className="flex flex-wrap gap-2">
                {childTests.map((childTest, index) => {
                    const isLocked = childTest.dependsOnPrevious &&
                        childTests?.some((test, idx) =>
                            test.id === childTest.previousTestId &&
                            test.status !== 'completed' &&
                            idx < index
                        );

                    return (
                        <div
                            key={childTest.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${currentChildTestIndex === index
                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                : childTest.status === 'completed'
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : isLocked
                                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                }`}
                            title={isLocked ? `Complete ${childTests?.[index - 1]?.name} first` : ''}
                            onClick={() => !isLocked && onChildTestChange(index)}
                        >
                            <span className="font-medium">{childTest.name}</span>
                            {childTest.status === 'completed' && (
                                <CheckCircle size={16} />
                            )}
                            {isLocked && !childTest.status && (
                                <Clock size={16} className="text-gray-400" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};