// ==================== TYPES AND INTERFACES ====================

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
  testUnit: string;
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  hasImages?: boolean;
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
  selectedTest: string;
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
}

export interface ChildTest {
  id: string;
  name: string;
  machineEquipment: string;
  timing: string;
  isCompleted: boolean;
  startTime?: string;
  endTime?: string;
  status: "pending" | "active" | "completed";
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
  isUTMTest?: boolean;
  utmRegionsProcessed?: boolean;
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

export interface FormRow {
  id: number;
  srNo: number;
  testDate: string;
  config: string;
  sampleId: string;
  status: string;
  partNumber: string;
  serialNumber: string;
  childTestId?: string;
  childTestName?: string;
  cosmeticImage?: string;
  nonCosmeticImage?: string;
  croppedImage?: string;
  regionLabel?: string;
  finalNonCosmeticImage?: string;
  finalCroppedNonCosmeticImage?: string;
  finalCosmeticImage?: string;
  cosmeticImages?: string[];
  checkpointHours?: number;
  checkpointStatus?: string;
  checkpointLabel?: string;
  isT0?: boolean;
  isCheckpointRow?: boolean;
  nonCosmeticImages?: string[];
  croppedImages?: string[];
  finalCosmeticImages?: string[];
  preCosmeticImages?: string[];
  preNonCosmeticImages?: string[];
  preCroppedImages?: string[];
  preStatus?: string;
  [key: string]: any;
  utmImages?: Record<string, string>;
  utmRegionLabels?: string[];
}

export interface CustomColumn {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "image";
  options?: string[];
  originalId: string;
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
  [testName: string]: TimerStatus;
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
  isScanningForCheckpoint?: boolean;
  checkpointHour?: number;
  checkpointImages?: {
    [partNumber: string]: {
      cosmetic: File[];
      nonCosmetic: File[];
    };
  };
  eligibleParts?: string[];
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

export interface ProgressState {
  [partNumber: string]: {
    currentProgress: number;
    completedAt: string;
    lastCheckpoint: string;
    images: {
      [hour: number]: {
        cosmeticImages: string[];
        nonCosmeticImages: string[];
        croppedImages: string[];
      };
    };
  };
}

export interface DefaultFormProps {
  formData: FormData;
  updateFormField: (field: string, value: any) => void;
  updateRowField: (rowId: number, field: string, value: string) => void;
  addRow: (partNumber?: string) => void;
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
    cosmeticImages: string[];
    nonCosmeticImages: string[];
    finalCosmeticImages?: string[];
    finalNonCosmeticImages?: string[];
  };
  projectType?: string;
  handleFinalImageUpload: (
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    childTestId?: string,
  ) => void;
  handleCheckpointClick: (partNumber: string) => void;
  getNextCheckpointName: (partNumber: string) => string;
  getTestConditionForPart: (partNumber: string) => string;
  handleCheckpointImageUpload?: (
    rowId: number,
    partNumber: string,
    type: "cosmetic" | "nonCosmetic",
    file: File,
    checkpointLabel: string,
    childTestId?: string,
  ) => void;
}
