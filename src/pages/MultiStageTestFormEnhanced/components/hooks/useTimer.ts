// hooks/useTimer.ts
import { useState, useEffect, useCallback } from 'react';
import { TestTimerState, TimerStatus } from '../types';

const STORAGE_KEY = 'testTimerStates';

export const useTimer = () => {
    const [timerStates, setTimerStates] = useState<TestTimerState>({});

    // Load timer states from localStorage on component mount
    useEffect(() => {
        try {
            const savedTimerStates = localStorage.getItem(STORAGE_KEY);
            if (savedTimerStates) {
                const parsedStates = JSON.parse(savedTimerStates);
                setTimerStates(parsedStates);
            }
        } catch (error) {
            console.error("Error loading timer states:", error);
        }
    }, []);

    // Save timer states to localStorage whenever they change
    useEffect(() => {
        if (Object.keys(timerStates).length === 0) return;
        
        try {
            // Clean up timer states before saving
            const cleanedStates = cleanupTimerStates(timerStates);
            
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedStates));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Clearing old data and retrying...');
                
                // Clear old timer data and try again
                clearOldTimerData();
                
                try {
                    const cleanedStates = cleanupTimerStates(timerStates);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedStates));
                } catch (retryError) {
                    console.error('Failed to save timer states after cleanup:', retryError);
                }
            } else {
                console.error("Error saving timer states:", error);
            }
        }
    }, [timerStates]);

    // Function to cleanup timer states - remove old/inactive timers
    const cleanupTimerStates = useCallback((states: TestTimerState): TestTimerState => {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const oneDayAgo = now - 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        const cleanedStates: TestTimerState = {};
        
        Object.entries(states).forEach(([key, state]) => {
            // Skip if state is incomplete
            if (!state || typeof state !== 'object') return;

            // Keep active timers (running or stopped less than a day ago)
            const lastUpdated = state.lastUpdated ? new Date(state.lastUpdated).getTime() : 0;
            
            if (state.isRunning || lastUpdated > oneDayAgo) {
                // Keep this timer
                cleanedStates[key] = state;
            } else if (lastUpdated > oneWeekAgo) {
                // Keep timers from the last week (for historical data)
                // But remove large data like images or unnecessary fields
                const { imageData, largeFields, ...cleanState } = state as any;
                cleanedStates[key] = cleanState;
            }
            // Older than a week - don't include
        });

        return cleanedStates;
    }, []);

    // Function to clear old timer data
    const clearOldTimerData = useCallback(() => {
        try {
            // Get current data
            const currentData = localStorage.getItem(STORAGE_KEY);
            if (!currentData) return;

            const parsedData = JSON.parse(currentData);
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;

            // Filter out old data
            const newData: TestTimerState = {};
            Object.entries(parsedData).forEach(([key, state]: [string, any]) => {
                if (state && state.lastUpdated) {
                    const lastUpdated = new Date(state.lastUpdated).getTime();
                    if (lastUpdated > oneDayAgo || state.isRunning) {
                        newData[key] = state;
                    }
                }
            });

            // Save cleaned data
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        } catch (error) {
            console.error('Error clearing old timer data:', error);
            // If clearing fails, remove the entire key
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // Function to manually clear localStorage
    const clearLocalStorage = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setTimerStates({});
            console.log('Timer storage cleared');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const handleTimerToggle = useCallback((timerKey: string, isStarting: boolean) => {
        setTimerStates(prev => {
            const now = new Date().toISOString();
            const currentState = prev[timerKey];

            const updatedState: TimerStatus = {
                ...currentState,
                isRunning: isStarting,
                lastUpdated: now
            };

            if (isStarting) {
                // Starting the timer
                updatedState.startTime = now;
                updatedState.stopTime = undefined;
                
                // Set remaining seconds if not present
                if (!updatedState.remainingSeconds) {
                    updatedState.remainingSeconds = 24 * 3600; // Default 24 hours
                }
            } else {
                // Stopping the timer
                updatedState.stopTime = now;
            }

            return {
                ...prev,
                [timerKey]: updatedState
            };
        });
    }, []);

    const startTimer = useCallback((timerKey: string, durationHours: number = 24) => {
        handleTimerToggle(timerKey, true);
        
        // Also set the duration
        setTimerStates(prev => ({
            ...prev,
            [timerKey]: {
                ...prev[timerKey],
                remainingSeconds: durationHours * 3600
            }
        }));
    }, [handleTimerToggle]);

    const stopTimer = useCallback((timerKey: string) => {
        handleTimerToggle(timerKey, false);
    }, [handleTimerToggle]);

    const getTimerState = useCallback((timerKey: string): TimerStatus => {
        return timerStates[timerKey] || { 
            remainingSeconds: 24 * 3600, 
            isRunning: false 
        };
    }, [timerStates]);

    // Function to update remaining seconds for a timer
    const updateTimerSeconds = useCallback((timerKey: string, seconds: number) => {
        setTimerStates(prev => ({
            ...prev,
            [timerKey]: {
                ...prev[timerKey],
                remainingSeconds: seconds,
                lastUpdated: new Date().toISOString()
            }
        }));
    }, []);

    return {
        timerStates,
        setTimerStates,
        formatTime,
        handleTimerToggle,
        startTimer,
        stopTimer,
        getTimerState,
        updateTimerSeconds,
        clearLocalStorage,
        clearOldTimerData
    };
};