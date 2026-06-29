import React from 'react';
import { DefaultForm } from './DefaultForm';
import { FormHeader } from './FormHeader';
import { TestRecord, FormsState, CroppedRegion, TestTimerState, FormRow } from '../../types';

interface FormStageProps {
    currentTestRecord: TestRecord;
    currentTestIndex: number;
    forms: FormsState;
    isSecondRound: boolean;
    projectType: string;
    croppedRegions: CroppedRegion[];
    timerStates: TestTimerState;
    updateFormField: (formKey: string, field: string, value: any) => void;
    updateRowField: (formKey: string, rowId: number, field: string, value: string) => void;
    addRow: (formKey: string, partNumber?: string, rowData?: Partial<FormRow>) => void; // Updated
    getPartsForCurrentTest: () => any[];
    handleTimerToggle: (formKey: string, childTestId?: string) => void;
    handleChildTestComplete: (formKey: string) => void;
    handleChildTestChange: (formKey: string, childTestIndex: number) => void;
    handleFinalImageUpload: (partNumber: string, type: 'cosmetic' | 'nonCosmetic', file: File, childTestId?: string) => void;
    // NEW: Checkpoint handlers
    handleCheckpointClick?: (row: FormRow) => void;
    handleCompleteTestClick?: (row: FormRow) => void;
}

export const FormStage: React.FC<FormStageProps> = ({
    currentTestRecord,
    currentTestIndex,
    forms,
    isSecondRound,
    projectType,
    croppedRegions,
    timerStates,
    updateFormField,
    updateRowField,
    addRow,
    getPartsForCurrentTest,
    handleTimerToggle,
    handleChildTestComplete,
    handleChildTestChange,
    handleFinalImageUpload,
    // NEW
    handleCheckpointClick,
    handleCompleteTestClick
}) => {
    if (!currentTestRecord) return null;

    const formKey = `test_${currentTestIndex}`;
    const formData = forms[formKey];

    if (!formData) return null;

    const currentChildTestIndex = formData.currentChildTestIndex || 0;
    const currentChildTest = formData.childTests?.[currentChildTestIndex];
    const checkpointHours = parseInt(currentChildTest?.timing || currentTestRecord.timing || "24");
    const checkpointStatus = "Pending";
    const timerKey = currentChildTest ? `${formKey}_${currentChildTest.id}` : formKey;
    const timerState = timerStates[timerKey] || { remainingSeconds: checkpointHours * 3600, isRunning: false };

    const shouldSplitImages = (testName?: string) => {
        return projectType === "Flash";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Test Navigation Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-full mx-auto px-6">
                    <div className="flex flex-wrap gap-2 py-4">
                        {/* Test tabs would go here */}
                    </div>
                </div>
            </div>

            {/* Form Header */}
            <FormHeader
                testRecord={currentTestRecord}
                currentChildTest={currentChildTest}
                isSecondRound={isSecondRound}
                projectType={projectType}
                shouldSplitImages={shouldSplitImages}
            />

            {/* Main Form */}
            <DefaultForm
                formData={formData}
                updateFormField={(field, value) => updateFormField(formKey, field, value)}
                updateRowField={(rowId, field, value) => updateRowField(formKey, rowId, field, value)}
                addRow={(partNumber, rowData) => addRow(formKey, partNumber, rowData)} // Updated
                selectedParts={getPartsForCurrentTest()}
                checkpointHours={checkpointHours}
                checkpointStatus={checkpointStatus}
                formKey={formKey}
                timerState={timerState}
                onTimerToggle={() => handleTimerToggle(formKey, currentChildTest?.id)}
                croppedRegions={croppedRegions.filter(region => {
                    const testParts = getPartsForCurrentTest().map(p => p.partNumber);
                    return testParts.includes(region.partNumber || '') &&
                        region.childTestId === currentChildTest?.id &&
                        region.isFinal === isSecondRound;
                })}
                isSecondRound={isSecondRound}
                currentChildTest={currentChildTest}
                onChildTestComplete={() => handleChildTestComplete(formKey)}
                onChildTestChange={(childTestIndex) => handleChildTestChange(formKey, childTestIndex)}
                machineLoadData={undefined}
                loadImagesFromStorage={() => ({ cosmeticImages: [], nonCosmeticImages: [], finalCosmeticImages: [], finalNonCosmeticImages: [] })}
                projectType={projectType}
                handleFinalImageUpload={handleFinalImageUpload}
                // NEW: Pass checkpoint handlers
                onCheckpointClick={handleCheckpointClick}
                onCompleteTestClick={handleCompleteTestClick}
            />
        </div>
    );
};