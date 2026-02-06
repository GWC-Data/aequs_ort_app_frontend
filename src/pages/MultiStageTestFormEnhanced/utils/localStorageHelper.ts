import { 
    STORAGE_KEYS, 
    SharedImagesByPart,
    AssignedPart,
    LoadedPart
} from '../types';

// Generic localStorage helper functions
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        return defaultValue;
    }
};

export const setToStorage = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage (${key}):`, error);
    }
};

export const removeFromStorage = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing from localStorage (${key}):`, error);
    }
};

// Specific helper functions for the application
export const loadImagesFromStorage = (partNumber: string): {
    cosmeticImages: string[],
    nonCosmeticImages: string[],
    finalCosmeticImages?: string[],
    finalNonCosmeticImages?: string[]
} => {
    try {
        const partImagesData = getFromStorage<SharedImagesByPart>(STORAGE_KEYS.PART_IMAGES_DATA, {});
        const images = partImagesData[partNumber];

        if (images) {
            return {
                cosmeticImages: images.cosmetic || [],
                nonCosmeticImages: images.nonCosmetic || [],
                finalCosmeticImages: images.finalCosmeticImages || [],
                finalNonCosmeticImages: images.finalNonCosmeticImages || []
            };
        }
    } catch (error) {
        console.error('Error loading images from storage:', error);
    }

    return {
        cosmeticImages: [],
        nonCosmeticImages: [],
        finalCosmeticImages: [],
        finalNonCosmeticImages: []
    };
};

export const saveImagesToStorage = (partNumber: string, images: {
    cosmeticImages?: string[],
    nonCosmeticImages?: string[],
    finalCosmeticImages?: string[],
    finalNonCosmeticImages?: string[]
}): void => {
    try {
        const partImagesData = getFromStorage<SharedImagesByPart>(STORAGE_KEYS.PART_IMAGES_DATA, {});
        
        if (!partImagesData[partNumber]) {
            partImagesData[partNumber] = {
                cosmetic: [],
                nonCosmetic: [],
                childTestImages: {}
            };
        }

        if (images.cosmeticImages) {
            partImagesData[partNumber].cosmetic = images.cosmeticImages;
        }
        
        if (images.nonCosmeticImages) {
            partImagesData[partNumber].nonCosmetic = images.nonCosmeticImages;
        }
        
        if (images.finalCosmeticImages) {
            partImagesData[partNumber].finalCosmeticImages = images.finalCosmeticImages;
        }
        
        if (images.finalNonCosmeticImages) {
            partImagesData[partNumber].finalNonCosmeticImages = images.finalNonCosmeticImages;
        }

        setToStorage(STORAGE_KEYS.PART_IMAGES_DATA, partImagesData);
    } catch (error) {
        console.error('Error saving images to storage:', error);
    }
};

export const getCheckpointResults = (testName: string): { pass: string[], fail: string[] } => {
    const checkpointResults = getFromStorage<Record<string, { pass: string[], fail: string[] }>>(
        STORAGE_KEYS.CHECKPOINT_RESULTS, 
        {}
    );
    
    return checkpointResults[testName] || { pass: [], fail: [] };
};

export const updateCheckpointResults = (testName: string, partNumber: string, status: 'Pass' | 'Fail'): void => {
    const checkpointResults = getFromStorage<Record<string, { pass: string[], fail: string[] }>>(
        STORAGE_KEYS.CHECKPOINT_RESULTS, 
        {}
    );

    if (!checkpointResults[testName]) {
        checkpointResults[testName] = { pass: [], fail: [] };
    }

    // Remove from both arrays first
    checkpointResults[testName].pass = checkpointResults[testName].pass.filter(p => p !== partNumber);
    checkpointResults[testName].fail = checkpointResults[testName].fail.filter(p => p !== partNumber);

    // Add to appropriate array
    if (status === 'Pass') {
        checkpointResults[testName].pass.push(partNumber);
    } else if (status === 'Fail') {
        checkpointResults[testName].fail.push(partNumber);
    }

    setToStorage(STORAGE_KEYS.CHECKPOINT_RESULTS, checkpointResults);
};

export const getChamberLoads = () => {
    return getFromStorage<any[]>(STORAGE_KEYS.CHAMBER_LOADS, []);
};

export const updateChamberLoadsTimer = (
    loadId: number, 
    testId: string, 
    timerStatus: 'start' | 'stop', 
    timerData: any
): void => {
    try {
        const chamberLoads = getChamberLoads();
        const loadIndex = chamberLoads.findIndex((load: any) => load.id === loadId);

        if (loadIndex === -1) {
            console.warn(`Load with ID ${loadId} not found`);
            return;
        }

        const updatedLoad = {
            ...chamberLoads[loadIndex],
            timerStatus: timerStatus,
            timerStartTime: timerStatus === 'start' ? timerData.startTime : chamberLoads[loadIndex].timerStartTime,
            timerStopTime: timerStatus === 'stop' ? timerData.stopTime : undefined,
            timerLastUpdated: timerData.lastUpdated,
            timerRemainingSeconds: timerData.remainingSeconds,
            machineDetails: {
                ...chamberLoads[loadIndex].machineDetails,
                tests: chamberLoads[loadIndex].machineDetails.tests.map((test: any) => {
                    if (test.id === testId) {
                        return {
                            ...test,
                            timerStatus: timerStatus,
                            timerStartTime: timerStatus === 'start' ? timerData.startTime : test.timerStartTime,
                            timerStopTime: timerStatus === 'stop' ? timerData.stopTime : undefined,
                            timerLastUpdated: timerData.lastUpdated,
                            timerRemainingSeconds: timerData.remainingSeconds,
                            status: timerStatus === 'start' ? 2 : test.status,
                            statusText: timerStatus === 'start' ? 'In Progress' : test.statusText
                        };
                    }
                    return test;
                })
            }
        };

        chamberLoads[loadIndex] = updatedLoad;
        setToStorage(STORAGE_KEYS.CHAMBER_LOADS, chamberLoads);
    } catch (error) {
        console.error('Error updating chamber loads timer:', error);
    }
};

export const getOqcRecords = () => {
    return getFromStorage<any[]>(STORAGE_KEYS.OQC_TICKET_RECORDS, []);
};

export const getTicketAllocations = () => {
    return getFromStorage<any[]>(STORAGE_KEYS.TICKET_ALLOCATIONS, []);
};