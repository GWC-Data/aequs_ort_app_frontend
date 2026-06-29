// Reference image dimensions
export const REFERENCE_IMAGE_WIDTH = 480;
export const REFERENCE_IMAGE_HEIGHT = 320;

// Predefined regions
export const PREDEFINED_REGIONS = [
    { x: 32, y: 20, width: 60, height: 50, label: "F1" },
    { x: 112, y: 20, width: 50, height: 50, label: "Cleat 1" },
    { x: 170, y: 20, width: 50, height: 50, label: "Cleat 2" },
    { x: 228, y: 20, width: 50, height: 50, label: "Cleat 3" },
    { x: 286, y: 20, width: 50, height: 50, label: "Cleat 4" },
    { x: 360, y: 20, width: 60, height: 50, label: "F2" },
    { x: 32, y: 85, width: 55, height: 45, label: "Side snap 1" },
    { x: 370, y: 85, width: 55, height: 45, label: "Side snap 4" },
    { x: 32, y: 210, width: 55, height: 70, label: "F4" },
    { x: 370, y: 210, width: 55, height: 70, label: "F3" },
    { x: 100, y: 250, width: 60, height: 50, label: "Side snap 2" },
    { x: 280, y: 250, width: 60, height: 50, label: "Side snap 3" },
] as const;

// Types

// Checkpoint Data Interface
export interface CheckpointData {
    checkpointName: string;
    completedAt: string;
    status: 'Pass' | 'Fail' | 'Checkpoint';
    rowId: number;
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    croppedImages: string[];
    rowData?: Partial<FormRow>; // Complete row data
}

// Update FormRow interface
export interface FormRow {
    id: number;
    srNo: number;
    testDate: string;
    config: string;
    sampleId: string;
    status: 'Pass' | 'Fail' | 'Checkpoint' | ''; // Single status field
    checkpointName?: string; // Added for checkpoint rows
    parentRowId?: number; // Reference to original row
    partNumber: string;
    serialNumber: string;
    childTestId?: string;
    childTestName?: string;
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    croppedImages: string[];
    cosmeticImage?: string;
    nonCosmeticImage?: string;
    croppedImage?: string;
    regionLabel?: string;
    finalNonCosmeticImage?: string;
    finalCroppedNonCosmeticImage?: string;
    finalCosmeticImage?: string;
    finalCosmeticImages?: string[];
    checkpointHours?: number;
    nonCosmeticImages?: string[];
    croppedImages?: string[];
    testUnit?: string; // Add testUnit to row
    [key: string]: any;
}

export interface AssignedPart {
    id: string;
    partNumber: string;
    serialNumber: string;
    location: string;
    scanStatus: string;
    assignedToTest: string;
}

export interface LoadedPart {
    partNumber: string;
    serialNumber: string;
    ticketCode: string;
    testId: string;
    testName: string;
    loadedAt: string;
    scanStatus: string;
    duration: string;
    testCondition?: string;
    cosmeticImages?: string[];
    nonCosmeticImages?: string[];
    hasImages?: boolean;
    checkpointHistory?: Array<{
        hour: number;
        status: string;
        testedAt: string;
        result?: string;
    }>;
    lastCheckpointHour?: number;
    lastCheckpointStatus?: string;
    requiresReload?: boolean;
    requiresUnload?: boolean;
    nextCheckpointHour?: number | null;
    status?: string;
}

export interface MachineTest {
    id: string;
    testName: string;
    duration: string;
    status: number;
    statusText: string;
    requiredQty: number;
    allocatedParts: number;
    remainingQty: number;
    alreadyAllocated: number;
    timerStatus?: 'start' | 'stop';
    timerStartTime?: string;
    timerStopTime?: string;
    timerLastUpdated?: string;
    timerRemainingSeconds?: number;
}

export interface MachineDetails {
    machine: string;
    ticketCode: string;
    project: string;
    build: string;
    colour: string;
    machineId: string;
    machineDescription: string;
    totalTests: number;
    tests: MachineTest[];
    estimatedDuration: number;
}

export interface MachineLoadData {
    loadId: number;
    chamber: string;
    parts: LoadedPart[];
    totalParts: number;
    machineDetails: MachineDetails;
    machineId: string;
    machineDescription: string;
    loadedAt: string;
    estimatedCompletion: string;
    duration: number;
    testRecords?: LoadedPart[];
    timerStatus?: 'start' | 'stop';
    timerStartTime?: string;
    timerStopTime?: string;
    timerLastUpdated?: string;
    timerRemainingSeconds?: number;
}

export interface ChildTest {
    id: string;
    name: string;
    machineEquipment: string;
    timing: string;
    isCompleted: boolean;
    startTime?: string;
    endTime?: string;
    status: 'pending' | 'active' | 'completed';
    dependsOnPrevious?: boolean;
    previousTestId?: string;
    requiresImages?: boolean;
}

export interface TestRecord {
    testId: string;
    testName: string;
    processStage: string;
    testIndex: number;
    testCondition: string;
    requiredQuantity: string;
    specification: string;
    machineEquipment: string;
    machineEquipment2: string;
    timing: string;
    startDateTime: string;
    endDateTime: string;
    assignedParts: AssignedPart[];
    assignedPartsCount: number;
    remark: string;
    status: string;
    submittedAt: string;
    testResults?: FormRow[];
    childTests?: ChildTest[];
    currentChildTestIndex?: number;
}

export interface Stage2Record {
    id: number;
    submissionId: string;
    ticketId: number;
    ticketCode: string;
    totalQuantity: number;
    anoType: string;
    source: string;
    reason: string;
    project: string;
    build: string;
    colour: string;
    processStage: string;
    selectedTestNames: string[];
    testRecords: TestRecord[];
    formData: any;
    submittedAt: string;
    version: string;
    testingStatus?: string;
    machineLoadData?: MachineLoadData;
}

export const COLUMN_TYPES = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Select", value: "select" },
  { label: "Textarea", value: "textarea" },
  { label: "Image", value: "image" },
] as const;

export type ColumnType = typeof COLUMN_TYPES[number]['value'];

export interface CustomColumn {
    id: string;
    label: string;
    type: ColumnType;
    options?: string[];
}

export interface FormData {
    testName: string;
    processStage: string;
    testCondition: string;
    date: string;
    specification: string;
    machineEquipment: string;
    machineEquipment2: string;
    timing: string;
    sampleQty: string;
    rows: FormRow[];
    remark?: string;
    customColumns?: CustomColumn[];
    childTests?: ChildTest[];
    currentChildTestIndex?: number;
    [key: string]: any;
}

export interface FormsState {
    [key: string]: FormData;
}

export interface SharedImagesByPart {
    [partNumber: string]: {
        cosmetic: string[];
        nonCosmetic: string[];
        childTestImages: {
            [childTestId: string]: {
                cosmetic: string[];
                nonCosmetic: string[];
            };
        };
        finalCosmeticImages?: string[];
        finalNonCosmeticImages?: string[];
    };
}

export interface CroppedRegion {
    id: number;
    data: string;
    label: string;
    category: any;
    rect: any;
    partNumber?: string;
    childTestId?: string;
    isFinal?: boolean;
}

export interface TimerStatus {
    remainingSeconds: number;
    isRunning: boolean;
    startTime?: string;
    stopTime?: string;
    lastUpdated?: string;
}

export interface TestTimerState {
    [testKey: string]: TimerStatus;
}

export interface ScanState {
    isScanning: boolean;
    scannedParts: ScannedPart[];
    partInput: string;
    showScanModal: boolean;
    availableTests: any[];
    selectedTest: string;
    machineDetails: any;
    uploadingImages: { [key: string]: { [key: string]: boolean } };
}

export interface ScannedPart {
    id: number;
    partNumber: string;
    serialNumber: string;
    ticketCode: string;
    project: string;
    build: string;
    colour: string;
    anoType: string;
    oqcRecordId: string;
    sessionId: string;
    sessionNumber: string;
    scannedAt: string;
    availableTests: any[];
    selectedTestId: string;
    scanStatus: string;
    cosmeticImage: string;
    nonCosmeticImage: string;
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    hasImages?: boolean;
}

// Update DefaultFormProps with checkpoint handlers
export interface DefaultFormProps {
    formData: FormData;
    updateFormField: (field: string, value: any) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: (partNumber?: string, rowData?: Partial<FormRow>) => void; // Updated
    selectedParts: AssignedPart[];
    checkpointHours: number;
    checkpointStatus: string;
    formKey: string;
    timerState: TimerStatus;
    onTimerToggle: () => void;
    croppedRegions: CroppedRegion[];
    isSecondRound?: boolean;
    currentChildTest?: ChildTest;
    onChildTestComplete: () => void;
    onChildTestChange: (childTestIndex: number) => void;
    machineLoadData?: MachineLoadData;
    loadImagesFromStorage: (partNumber: string) => { 
        cosmeticImages: string[], 
        nonCosmeticImages: string[], 
        finalCosmeticImages?: string[], 
        finalNonCosmeticImages?: string[] 
    };
    projectType?: string;
    handleFinalImageUpload: (partNumber: string, type: 'cosmetic' | 'nonCosmetic', file: File, childTestId?: string) => void;
    
    // NEW: Checkpoint handlers
    onCheckpointClick?: (row: FormRow) => void;
    onCompleteTestClick?: (row: FormRow) => void;
}

// Utility types
export type ImageType = 'cosmetic' | 'nonCosmetic';
export type CheckpointStatus = 'Pass' | 'Fail' | 'Pending';

// Additional interfaces based on actual usage
export interface PartImagesData {
    [partNumber: string]: {
        cosmeticImages: string[];
        nonCosmeticImages: string[];
        finalCosmeticImages?: string[];
        finalNonCosmeticImages?: string[];
    };
}

export interface CheckpointResults {
    [testName: string]: {
        pass: string[];
        fail: string[];
    };
}

export interface CheckpointPassedPart {
    partNumber: string;
    serialNumber: string;
    checkpointHour: number;
    nextCheckpointHour: number | null;
    testName: string;
    testCondition: string;
    chamber: string;
    loadId: number;
    timestamp: string;
    checkpointHistory: Array<{
        hour: number;
        status: string;
        testedAt: string;
    }>;
}

export interface CheckpointPassedParts {
    parts: CheckpointPassedPart[];
}

export interface PartsNeedingReload {
    passedParts: string[];
    timestamp: string;
    chamber: string;
    loadId: number;
}

// Storage keys - CORRECTED based on actual usage
export const STORAGE_KEYS = {
  // Timer states
  TIMER_STATES: "testTimerStates",
  
  // Image storage
  PART_IMAGES_DATA: "partImagesData",
  CROPPED_REGIONS: "mst_cropped_regions",
  SHARED_IMAGES: "mst_shared_images",
  
  // Machine/Chamber data
  CHAMBER_LOADS: "chamberLoads",
  MACHINE_LOAD_DATA: "mst_machine_load_data",
  
  // OQC and allocation data
  OQC_TICKET_RECORDS: "oqc_ticket_records",
  TICKET_ALLOCATIONS: "ticket_allocations_array",
  
  // Checkpoint management
  CHECKPOINT_RESULTS: "checkpointResults",
  CHECKPOINT_PASSED_PARTS: "checkpointPassedParts",
  PARTS_NEEDING_RELOAD: "partsNeedingReload",
  
  // Testing data
  TESTING_LOAD_DATA: "testingLoadData",
  STAGE2_RECORDS: "stage2Records",
  
  // Form state
  FORM_DATA: "mst_form_data",
  
  // Scan state
  SCAN_STATE: "mst_scan_state",
} as const;