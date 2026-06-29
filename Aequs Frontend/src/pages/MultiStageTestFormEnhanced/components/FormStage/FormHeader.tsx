import React from 'react';
import { TestRecord, ChildTest } from '../../types';
import { Clock } from 'lucide-react';

interface FormHeaderProps {
    testRecord: TestRecord;
    currentChildTest?: ChildTest;
    isSecondRound: boolean;
    projectType: string;
    shouldSplitImages: (testName?: string) => boolean;
}

export const FormHeader: React.FC<FormHeaderProps> = ({
    testRecord,
    currentChildTest,
    isSecondRound,
    projectType,
    shouldSplitImages
}) => {
    return (
        <div className="bg-white border-b border-gray-200 py-4">
            <div className="max-w-full mx-auto px-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{testRecord.testName}</h2>
                        <p className="text-gray-600 mt-1">
                            Test {testRecord.testIndex} of {testRecord.testIndex} |
                            <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {testRecord.processStage}
                            </span>
                            {currentChildTest && (
                                <span className="ml-2 text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Current: {currentChildTest.name}
                                </span>
                            )}
                            {isSecondRound && (
                                <span className="ml-2 text-sm font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                                    Unload
                                </span>
                            )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Project Type: <span className="font-semibold">{projectType}</span>
                            {shouldSplitImages(testRecord.testName) && (
                                <span className="ml-2 text-blue-600">
                                    (Non-cosmetic images will be split)
                                </span>
                            )}
                        </p>
                        
                        {/* Optional: Add checkpoint status note */}
                        {!isSecondRound && (
                            <div className="mt-2 flex items-center gap-1 text-sm text-yellow-600">
                                <Clock size={14} />
                                <span>Checkpoint system enabled. Use "Pass" status for checkpoint tests.</span>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Specification</p>
                        <p className="font-semibold text-gray-800">{testRecord.specification}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};