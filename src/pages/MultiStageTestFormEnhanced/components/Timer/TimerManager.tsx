import React, { useEffect } from 'react';
import { TestTimerState, TimerStatus, Stage2Record, FormsState } from '../../types';
import { updateChamberLoadsTimer } from '../../utils/localStorageHelper';

interface TimerManagerProps {
    timerStates: TestTimerState;
    setTimerStates: React.Dispatch<React.SetStateAction<TestTimerState>>;
    currentRecord: Stage2Record | null;
    forms: FormsState;
}

export const TimerManager: React.FC<TimerManagerProps> = ({
    timerStates,
    setTimerStates,
    currentRecord,
    forms
}) => {
    // Timer countdown effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTimerStates(prev => {
                const updated = { ...prev };
                let hasChanges = false;

                Object.keys(updated).forEach(timerKey => {
                    if (updated[timerKey].isRunning && updated[timerKey].remainingSeconds > 0) {
                        updated[timerKey] = {
                            ...updated[timerKey],
                            remainingSeconds: updated[timerKey].remainingSeconds - 1,
                            lastUpdated: new Date().toISOString()
                        };
                        hasChanges = true;

                        // Update chamberLoads every minute (60 seconds)
                        if (updated[timerKey].remainingSeconds % 60 === 0 && currentRecord?.machineLoadData) {
                            const formKey = timerKey.split('_')[0];
                            const formData = forms[formKey];
                            const currentChildTest = formData?.childTests?.[formData.currentChildTestIndex || 0];
                            const testId = timerKey.includes('_child-')
                                ? timerKey.split('_')[1]
                                : currentRecord.testRecords[parseInt(formKey.replace('test_', ''))]?.testId;

                            if (testId) {
                                updateChamberLoadsTimer(
                                    currentRecord.machineLoadData.loadId,
                                    testId,
                                    'start',
                                    updated[timerKey]
                                );
                            }
                        }
                    } else if (updated[timerKey].isRunning && updated[timerKey].remainingSeconds === 0) {
                        updated[timerKey] = {
                            ...updated[timerKey],
                            isRunning: false,
                            stopTime: new Date().toISOString(),
                            lastUpdated: new Date().toISOString()
                        };
                        hasChanges = true;

                        // Update chamberLoads when timer completes
                        if (currentRecord?.machineLoadData) {
                            const formKey = timerKey.split('_')[0];
                            const formData = forms[formKey];
                            const currentChildTest = formData?.childTests?.[formData.currentChildTestIndex || 0];
                            const testId = timerKey.includes('_child-')
                                ? timerKey.split('_')[1]
                                : currentRecord.testRecords[parseInt(formKey.replace('test_', ''))]?.testId;

                            if (testId) {
                                updateChamberLoadsTimer(
                                    currentRecord.machineLoadData.loadId,
                                    testId,
                                    'stop',
                                    updated[timerKey]
                                );
                            }
                        }

                        // Show alert when timer completes
                        alert(`⏰ Timer completed!`);
                    }
                });

                return hasChanges ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [currentRecord, forms, setTimerStates]);

    return null; // This component doesn't render anything
};