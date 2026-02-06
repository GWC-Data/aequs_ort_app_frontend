export interface Stage1Record {
  id: number;
  build: string;
  colour: string;
  reason: string;
  source: string;
  status: string;
  anoType: string;
  project: string;
  dateTime: string;
  createdAt: string;
  ticketCode: string;
  oqcApproved: boolean;
  totalQuantity: number;
}

export interface PartImageAttachment {
  label: string;
  path: string;
  uploadedAt?: string;
}

export interface CheckpointInfo {
  checkpoint: number | null;
  checkpoints: number[];
  checkpointIndex: number;
  totalCheckpoints: number;
  originalCheckPoints: string;
}

export interface CheckpointData {
  checkpointIndex: number;
  checkpointValue: number;
  label: string;
  testDate: string;
  cosmeticImages: string[];
  nonCosmeticImages: string[];
  status: 'pass' | 'fail' | null;
  customData?: Record<string, string>; // For image columns, value is JSON string of image paths
  isFinal?: boolean;
  submittedAt?: string;
}

export interface Part {
  testId: string;
  loadedAt: string;
  testName: string;
  testUnit: string;
  hasImages: boolean;
  testNotes: string | null;
  testValue: number;
  checkpoint: number | null;
  partNumber: string;
  scanStatus: string;
  testStatus: string;
  ticketCode: string;
  completedAt: string | null;
  isCompleted: boolean;
  testResults: any | null;
  testStarted: boolean;
  serialNumber: string;
  stage1Record: Stage1Record;
  testCondition: string;
  checkpointInfo: CheckpointInfo;
  cosmeticImages: string[];
  actualTestValue: number | null;
  checkpointIndex: number;
  allocationTestId: string;
  totalCheckpoints: number;
  nonCosmeticImages: string[];
  allocationTicketCode: string;
  checkpointData: CheckpointData[];
  t0ImagesComplete: boolean;
  customColumnData?: Record<string, any>; // Custom column data per part
  utmCustomColumnData?: Record<string, any>; // UTM-specific custom column data
  customImages?: PartImageAttachment[];
}

export interface MachineDetails {
  machineId: string;
  machineDescription: string;
  machine: string;
  selectedTest?: {
    machineEquipment2?: string;
  };
}

export interface ChamberData {
  id: number;
  chamber: string;
  machineDetails: MachineDetails;
  parts: Part[];
  loadedAt: string;
  duration: number;
  status: string;
  testStatus: string;
  timerStatus: string;
  timerStartTime: string;
  actualStartTime: string;
  estimatedCompletion: string;
  totalPausedTime: number;
  lastPausedAt: string | null;
  pausedElapsedTime: number | null;
  testUnit: string;
  testValue: number;
  testStarted: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  operator: string;
  lastUpdated: string;
  totalParts: number;
  currentCheckpointIndex: number;
  checkpoints: number[];
  customColumns?: CustomColumn[]; // Custom column definitions
  customColumnData?: CustomColumnData; // Custom column values
}

export interface CustomColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'image'; // Added 'image' type
  options: string[];
}

export interface PartCheckpointStatus {
  [key: string]: 'pass' | 'fail' | '';
}

export interface CustomColumnData {
  [key: string]: string; // For image type, this stores JSON stringified array of image paths
}

export interface CheckpointSubmission {
  partIndex: number;
  partNumber: string;
  serialNumber: string;
  checkpointIndex: number;
  checkpointValue: number;
  status: 'pass' | 'fail' | '';
  cosmeticImages: string[];
  nonCosmeticImages: string[];
  customData?: Record<string, string>;
  testDate: string;
  submittedAt: string;
}

export interface CheckpointSubmissions {
  [key: string]: CheckpointSubmission;
}

export interface TempScannedPart {
  partNumber: string;
  scanStatus: "Cosmetic OK" | "Cosmetic Not OK" | null;
}

export interface CheckpointLabels {
  [key: number]: string;
}

