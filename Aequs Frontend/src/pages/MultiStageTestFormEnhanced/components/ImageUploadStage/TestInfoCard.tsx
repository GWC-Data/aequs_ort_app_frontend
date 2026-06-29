import React from 'react';
import { ChildTest, TestRecord } from '../../types';

interface TestInfoCardProps {
    testRecord: TestRecord;
    currentChildTest?: ChildTest;
    projectType: string;
    shouldSplitImages: (testName?: string) => boolean;
}

export const TestInfoCard: React.FC<TestInfoCardProps> = ({
    testRecord,
    currentChildTest,
    projectType,
    shouldSplitImages
}) => {
    return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <span className="text-sm text-gray-600">Test Name:</span>
                    <div className="font-semibold">{testRecord?.testName}</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Assigned Parts:</span>
                    <div className="font-semibold">{testRecord?.assignedPartsCount}</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Timing:</span>
                    <div className="font-semibold">{currentChildTest?.timing || testRecord?.timing} hours</div>
                </div>
                <div className="col-span-2">
                    <span className="text-sm text-gray-600">Ticket Code:</span>
                    <div className="font-semibold">
                        {testRecord?.testName}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Test Condition:</span>
                    <div className="font-semibold">{testRecord?.testCondition}</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <div className={`font-semibold ${currentChildTest?.status === 'completed' ? "text-green-600" :
                        currentChildTest?.status === 'active' ? "text-yellow-600" :
                            "text-gray-600"
                        }`}>
                        {currentChildTest?.status?.toUpperCase() || "PENDING"}
                    </div>
                </div>
            </div>
            <div className="mt-2 text-sm">
                <span className="font-semibold">Project Type:</span> {projectType}
                {shouldSplitImages(testRecord?.testName) ? (
                    <span className="ml-2 text-blue-600">
                        (Non-cosmetic images will be split)
                    </span>
                ) : (
                    <span className="ml-2 text-green-600">
                        (No image splitting required)
                    </span>
                )}
            </div>
        </div>
    );
};