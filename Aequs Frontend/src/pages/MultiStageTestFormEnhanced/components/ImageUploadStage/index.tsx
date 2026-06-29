import React from 'react';
import { ChevronRight, ChevronLeft, AlertTriangle, Scan } from 'lucide-react';
import { Stage2Record, TestRecord, FormsState, AssignedPart, ChildTest } from '../../types';
import { MachineLoadInfo } from './MachineLoadInfo';
import { ChildTestProgress } from './ChildTestProgress';
import { TestInfoCard } from './TestInfoCard';
import { PartCard } from './PartCard';

interface ImageUploadStageProps {
    currentRecord: Stage2Record | null;
    currentTestRecord: TestRecord | undefined;
    currentTestIndex: number;
    forms: FormsState;
    isSecondRound: boolean;
    projectType: string;
    verifiedPartsForFinalUpload: Set<string>;
    processing: boolean;
    processingImages: Record<string, boolean>;
    shouldSplitImages: (testName?: string) => boolean;
    getPartsForCurrentTest: () => AssignedPart[];
    handleOpenScanModal: () => void;
    saveFormData: () => boolean;
    setCurrentTestIndex: (index: number) => void;
    setCurrentStage: (stage: number) => void;
    handleImageUpload: (partNumber: string, testName: string, type: 'cosmetic' | 'nonCosmetic', file: File, childTestId?: string) => void;
}

export const ImageUploadStage: React.FC<ImageUploadStageProps> = ({
    currentRecord,
    currentTestRecord,
    currentTestIndex,
    forms,
    isSecondRound,
    projectType,
    verifiedPartsForFinalUpload,
    processing,
    processingImages,
    shouldSplitImages,
    getPartsForCurrentTest,
    handleOpenScanModal,
    saveFormData,
    setCurrentTestIndex,
    setCurrentStage,
    handleImageUpload
}) => {
    if (!currentRecord || !currentTestRecord) return null;

    const currentTestParts = getPartsForCurrentTest();
    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];
    const currentChildTestIndex = formData?.currentChildTestIndex || 0;
    const currentChildTest = formData?.childTests?.[currentChildTestIndex];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Step 1: Upload Images by Test
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Current Test: <span className="font-semibold text-blue-600">
                            {currentTestRecord?.testName}
                        </span>
                        {currentChildTest && (
                            <span className="ml-2 text-gray-600">
                                (Child Test: <span className="font-semibold">{currentChildTest.name}</span>)
                            </span>
                        )}
                    </p>
                    <div className="text-sm text-gray-500 mt-2">
                        Ticket: <span className="font-semibold">{currentRecord.ticketCode}</span> |
                        Project: <span className="font-semibold">{currentRecord.project}</span> |
                        Build: <span className="font-semibold">{currentRecord.build}</span> |
                        Type: <span className="font-semibold">{projectType}</span>
                    </div>
                    {isSecondRound && (
                        <div className="mt-2">
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                                Unload  - Upload Final Images
                            </span>
                            <div className="mt-2 flex items-center gap-2">
                                <AlertTriangle className="text-yellow-600" size={16} />
                                <span className="text-sm text-gray-700">
                                    Scan parts before uploading final images
                                </span>
                                <button
                                    onClick={handleOpenScanModal}
                                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                                >
                                    <Scan size={16} />
                                    Scan Parts
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Test Navigation */}
                <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-700">
                        Test {currentTestIndex + 1} of {currentRecord.testRecords.length}
                    </div>
                    <div className="flex gap-2">
                        {currentRecord.testRecords.map((test, idx) => (
                            <button
                                key={test.testId}
                                onClick={() => {
                                    saveFormData();
                                    setCurrentTestIndex(idx);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${currentTestIndex === idx
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                            >
                                {test.testName}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Machine Load Information */}
            {currentRecord.machineLoadData && (
                <MachineLoadInfo machineLoadData={currentRecord.machineLoadData} />
            )}

            {/* Child Test Progress */}
            {formData?.childTests && formData.childTests.length > 1 && (
                <ChildTestProgress
                    childTests={formData.childTests}
                    currentChildTestIndex={currentChildTestIndex}
                    onChildTestChange={(index) => {
                        // This would be connected to a parent handler
                        console.log('Change child test to:', index);
                    }}
                />
            )}

            {/* Current Test Info Card */}
            <TestInfoCard
                testRecord={currentTestRecord}
                currentChildTest={currentChildTest}
                projectType={projectType}
                shouldSplitImages={shouldSplitImages}
            />

            {/* Parts for Current Test */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Assigned Parts for {currentChildTest?.name || currentTestRecord?.testName}
                        {isSecondRound && <span className="ml-2 text-red-600">(Unload  - Final Images)</span>}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {currentTestParts.length} Parts
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentTestParts.map((part, index) => {
                        const rowData = formData?.rows?.find(row =>
                            row.partNumber === part.partNumber &&
                            row.childTestId === currentChildTest?.id
                        );
                        // In a real implementation, this would come from props
                        const existingImages = {
                            cosmeticImages: [],
                            nonCosmeticImages: [],
                            finalCosmeticImages: [],
                            finalNonCosmeticImages: []
                        };
                        const isPartVerified = isSecondRound ? verifiedPartsForFinalUpload.has(part.partNumber) : true;

                        return (
                            <PartCard
                                key={part.id}
                                part={part}
                                index={index}
                                rowData={rowData}
                                existingImages={existingImages}
                                isSecondRound={isSecondRound}
                                isPartVerified={isPartVerified}
                                currentChildTest={currentChildTest}
                                currentTestRecord={currentTestRecord}
                                projectType={projectType}
                                shouldSplitImages={shouldSplitImages}
                                processing={processing}
                                processingImages={processingImages}
                                handleImageUpload={handleImageUpload}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                {currentTestIndex > 0 && (
                    <button
                        onClick={() => {
                            saveFormData();
                            setCurrentTestIndex(prev => prev - 1);
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center font-medium transition-colors"
                    >
                        <ChevronLeft size={20} className="mr-2" />
                        Previous Test
                    </button>
                )}

                {currentTestIndex < (currentRecord.testRecords.length - 1) ? (
                    <button
                        onClick={() => {
                            saveFormData();
                            setCurrentTestIndex(prev => prev + 1);
                            setCurrentStage(0);
                        }}
                        className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-medium transition-colors"
                    >
                        Next Test
                        <ChevronRight size={20} className="ml-2" />
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            saveFormData();
                            setCurrentStage(1);
                        }}
                        className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-medium transition-colors"
                    >
                        Continue to Forms
                        <ChevronRight size={20} className="ml-2" />
                    </button>
                )}
            </div>
        </div>
    );
};