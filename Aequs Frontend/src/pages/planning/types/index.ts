export interface MachineItem {
  sr_no: number;
  machine_id: string;
  machine_description: string;
  tests?: TestItem[];
}

export interface TestItem {
  machine: string;
  testName: string;
  duration: number;
  startDateTime?: string;
  submittedAt?: string;
}

export interface ChamberLoad {
  id: number;
  chamber: string;
  machineId: string;
  machineDescription: string;
  parts: Part[];
  loadedAt: string | null;
  duration?: number | null;
  status: 'loaded' | 'completed' | 'cancelled';
  testStatus: 'pending' | 'start' | 'completed' | 'paused';
  timerStatus: 'start' | 'stop' | 'paused';
  timerStartTime: string | null;
  actualStartTime?: string | null;
  estimatedCompletion: string | null;
  totalPausedTime?: number | null;
  lastPausedAt?: string | null;
  pausedElapsedTime?: number | null;
  testUnit?: string | null;
  testValue?: number | null;
  testStarted?: boolean;
  isCompleted?: boolean;
  completedAt?: string | null;
  operator?: string | null;
  lastUpdated?: string | null;
  totalParts?: number | null;
  selectedTestId?: string | null;
  selectedTestName?: string | null;
  machineDetails?: any;
  testResults?: unknown;
  testNotes?: string | null;
  actualTestValue?: number | null;
  ticketCode?: string | null;
  isCombinedTest?: boolean;
  combinedTestId?: string | null;
  isSingleTicketLoad?: boolean;
  sequenceNumber?: number | null;
  totalInSequence?: number | null;
  allocationId?: string | null;
  ortId?: number | null;
}

export interface PartImageAttachment {
  label: string;
  path: string;
  uploadedAt?: string;
}

export interface Part {
  id?: number;
  partNumber: string;
  serialNumber: string;
  ticketCode: string;
  testId?: string;
  testName?: string;
  testCondition?: string;
  checkpointInfo?: CheckpointInfo;
  checkpoint?: string | null;
  checkpointIndex?: number | null;
  totalCheckpoints?: number | null;
  customImages?: PartImageAttachment[];
  cosmeticImages: string[];
  nonCosmeticImages: string[];
  scannedAt?: string;
  availableTests?: any[];
  selectedTestId?: string;
  scanStatus?: string;
  duration?: number;
  combinedTestId?: string | null;
  sequenceNumber?: number | null;
  totalInSequence?: number | null;
  nextTestId?: string | null;
  previousTestId?: string | null;
  testUnit?: string | null;
  testValue?: number | null;
  testStarted?: boolean;
  testStatus?: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  hasImages?: boolean;
  testResults?: unknown;
  testNotes?: string | null;
  stage1Record?: unknown;
  [key: string]: unknown;
}

export interface CheckpointInfo {
  checkpoint: string;
  checkpointIndex: number;
  totalCheckpoints: number;
  checkpoints: string[];
}

export interface TimerState {
  status: 'start' | 'stop' | 'paused';
  startTime: Date | null;
  elapsedTime: number;
  duration: number;
  timerStarted: boolean;
}

export interface TimerStatus {
  status: 'running' | 'paused' | 'stopped';
  startTime: string | null;
  elapsed: number;
  remainingTime: number;
  lastPausedAt?: string | null;
  totalPausedTime?: number;
}

export interface MachineAvailability {
  [machineName: string]: {
    [machineId: string]: {
      status: 'available' | 'occupied' | 'loading';
      activeLoads: number;
      activeParts: number;
      runningTimers: number;
      pausedTimers: number;
      lastUpdated: string;
      machineId: string;
      machineDescription: string;
      completedTests: number;
      totalLoads: number;
      loads?: ChamberLoad[];
      estimatedCompletion?: string | null;
    };
  };
}

export interface TestAllocation {
  id: string;
  testName: string;
  testCondition?: string;
  machineEquipment?: string;
  machineEquipment2?: string;
  time?: string;
  requiredQty?: number;
  allocatedParts?: number;
  status?: number;
  specification?: string;
  childTests?: any[];
}

export interface OQCRecord {
  id: string;
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  anoType: string;
  sessions: OQCSession[];
}

export interface OQCSession {
  id: string;
  sessionNumber: number;
  parts: OQCPart[];
}

export interface OQCPart {
  id: string;
  partNumber: string;
  serialNumber: string;
}