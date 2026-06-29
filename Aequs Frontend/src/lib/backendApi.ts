import axios from "axios";

// export const BACKEND_API_URL = "https://ort-digitalization.aequs.com/api";
export const BACKEND_API_URL = "http://localhost:6060";

export const backendApi = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getBackendApiUrl = (): string => BACKEND_API_URL;

export interface BackendResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

export interface ChamberLoadPart {
  partNumber: string;
  serialNumber?: string;
  ticketCode?: string;
  testId?: string;
  testName?: string;
  testCondition?: string;
  checkpointInfo?: unknown;
  checkpoint?: string | null;
  checkpointIndex?: number | null;
  totalCheckpoints?: number | null;
  loadedAt?: string;
  scanStatus?: string;
  duration?: number;
  customImages?: {
    label?: string;
    path: string;
    uploadedAt?: string | null;
  }[];
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  hasImages?: boolean;
  combinedTestId?: string | null;
  sequenceNumber?: number | null;
  totalInSequence?: number | null;
  nextTestId?: string | null;
  previousTestId?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  testStatus?: string;
  testResults?: unknown;
  testNotes?: string | null;
  stage1Record?: unknown;
  [key: string]: unknown;
}

export interface ChamberLoadPayload {
  chamber: string;
  machineId: string;
  machineDescription: string;
  parts: ChamberLoadPart[];
  machineDetails: unknown;
  testUnit?: string | null;
  testValue?: number | null;
  testStarted?: boolean;
  testStatus?: string;
  timerStatus?: string;
  timerStartTime?: string | null;
  actualStartTime?: string | null;
  totalPausedTime?: number | null;
  lastPausedAt?: string | null;
  pausedElapsedTime?: number | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  operator?: string | null;
  lastUpdated?: string | null;
  totalParts?: number | null;
  selectedTestId?: string | null;
  selectedTestName?: string | null;
  isCombinedTest?: boolean;
  combinedTestId?: string | null;
  ticketCode?: string | null;
  isSingleTicketLoad?: boolean;
  sequenceNumber?: number | null;
  totalInSequence?: number | null;
  testResults?: unknown;
  testNotes?: string | null;
  actualTestValue?: number | null;
  allocationId?: string | null;
  ortId?: number | null;
  [key: string]: unknown;
}

export interface ChamberLoadDto extends ChamberLoadPayload {
  id: number;
  status: string;
  testStatus: string;
  timerStatus: string;
  loadedAt: string;
  timerStartTime: string | null;
  actualStartTime: string | null;
  totalPausedTime: number | null;
  lastPausedAt: string | null;
  pausedElapsedTime: number | null;
  isCompleted: boolean;
  completedAt: string | null;
  operator: string | null;
  lastUpdated: string;
  totalParts: number | null;
  testResults?: unknown;
  testNotes?: string | null;
  actualTestValue?: number | null;
  allocationId?: string | null;
  ortId?: number | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface TestingPartDto extends Omit<ChamberLoadDto, 'id'> {
  id: number | string;
  [key: string]: unknown;
}
// export interface TestingPartDto {
//   id: number;
//   chamber: string;
//   machineDetails: any;
//   parts: any[];
//   loadedAt: string;
//   customColumns?: any[];
//   customColumnData?: any;
//   // ... other fields
// }
export type CalendarTaskStatus = 'scheduled' | 'ongoing' | 'completed';

export interface CalendarTaskDto {
  id: string;
  machineId: string;
  testName: string;
  startDateTime: string;
  endDateTime: string;
  comments: string | null;
  status: CalendarTaskStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCalendarTaskPayload {
  machineId: string;
  testName: string;
  startDateTime: string;
  endDateTime: string;
  comments?: string;
  id?: string;
}

export interface AllocationTestDto {
  id: string;
  testName?: string;
  subTestName?: string;
  testCondition?: string;
  machineEquipment?: string;
  machineEquipment2?: string;
  unit?: string;
  time?: string;
  checkPoints?: string;
  remainingParts?: number | string | null;
  requiredQty?: number | string | null;
  sequenceNumber?: number;
  totalInSequence?: number;
  nextTestId?: string;
  previousTestId?: string;
  childTests?: AllocationTestDto[];
}

export interface AllocationDto {
  id: string;
  ticketCode: string;
  totalQuantity?: number | null;
  location?: string | null;
  unit?: string | null;
  project?: string | null;
  anoType?: string | null;
  build?: string | null;
  colour?: string | null;
  totalRemainingParts?: number | null;
  processStage?: string | null;
  reason?: string | null;
  matchedProcessStage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  testAllocations: AllocationTestDto[];
};



interface PartEntry {
  part: string;
  status: string;
  scannedAt: string;
}

interface ScannedPart {
  Id: number;
  ticketId: number;
  ticketCode: string;
  totalQty: number;
  processStage: string;
  source: string;
  project: string;
  build: string;
  colour: string;
  date: string;
  location: string;
  reason: string;
  session: string;
  ortReceivedStatus: string;
  createdAt: string;
  updatedAt: string;
  parts: PartEntry[] | string; // Array of part objects OR string (for backward compatibility)
}

interface ScannedPartsResponse {
  scannedParts: ScannedPart[];
}


export const apiService = {
  createOqcForm: async (formData: any) => {
    try {
      const response = await axios.post(`${BACKEND_API_URL}/oqcForm`, formData);
      return response.data;
    } catch (error) {
      console.error("Error creating OQC form:", error);
      throw error;
    }
  },
  getAllOqcForms: async () => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/oqcForm`);
      console.log("reponse from backend", response.data);
      return response.data.Ticket;
    } catch (error) {
      console.error("Error fetching OQC forms:", error);
      throw error;
    }
  },
  createScannedParts: async (scannedPartsData: any) => {
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/scannedParts`,
        scannedPartsData,
      );
      return response.data;
    } catch (error) {
      console.error("Error saving scanned parts:", error);
      throw error;
    }
  },

  getAllScannedParts: async () => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/scannedParts`);
      return response.data.scannedParts || [];
    } catch (error) {
      console.error("Error fetching scanned parts:", error);
      throw error;
    }
  },
  getAllOrtRecords: async () => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/ort`);
      return response.data.orts || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Error fetching ORT records:", error);
      throw error;
    }
  },
  deleteOrtRecord: async (id: number) => {
    try {
      await axios.delete(`${BACKEND_API_URL}/ort/${id}`);
    } catch (error) {
      console.error("Error deleting ORT record:", error);
      throw error;
    }
  },
  deleteScannedParts: async (id: number) => {
    try {
      await axios.delete(`${BACKEND_API_URL}/scannedParts/${id}`);
    } catch (error) {
      console.error("Error deleting scanned parts record:", error);
      throw error;
    }
  },
  getScannedPartsByTicketSession: async (ticketId: number, session: number) => {
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/scannedParts/${ticketId}/${session}`,
      );
      return response.data.scannedParts || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Error fetching scanned parts by ticket/session:", error);
      throw error;
    }
  },
  getTestAllocations: async () => {
    try {
      const response = await backendApi.get<{ testAllocations: any[] }>("/configuration/test-allocations");
      return response.data.testAllocations || [];
    } catch (error) {
      console.error("Error fetching test allocations:", error);
      throw error;
    }
  },
  saveTestAllocations: async (rows: any[]) => {
    try {
      const response = await backendApi.post<{ testAllocations: any[] }>("/configuration/test-allocations", { rows });
      return response.data.testAllocations || [];
    } catch (error) {
      console.error("Error saving test allocations:", error);
      throw error;
    }
  },
  getOqcForms: async () => {
    try {
      const response = await backendApi.get<{ oqcForms: any[] }>("/configuration/oqc-forms");
      return response.data.oqcForms || [];
    } catch (error) {
      console.error("Error fetching OQC form configurations:", error);
      throw error;
    }
  },
  saveOqcForms: async (rows: any[]) => {
    try {
      const response = await backendApi.post<{ oqcForms: any[] }>("/configuration/oqc-forms", { rows });
      return response.data.oqcForms || [];
    } catch (error) {
      console.error("Error saving OQC form configurations:", error);
      throw error;
    }
  },
  getMachineDetails: async () => {
    try {
      const response = await backendApi.get<{ machineDetails: any[] }>("/configuration/machine-details");
      return response.data.machineDetails || [];
    } catch (error) {
      console.error("Error fetching machine details configurations:", error);
      throw error;
    }
  },
  saveMachineDetails: async (rows: any[]) => {
    try {
      const response = await backendApi.post<{ machineDetails: any[] }>("/configuration/machine-details", { rows });
      return response.data.machineDetails || [];
    } catch (error) {
      console.error("Error saving machine details configurations:", error);
      throw error;
    }
  },
};



// Fetch all scanned parts from backend
export const fetchAllScannedParts = async (): Promise<ScannedPart[]> => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/scannedParts`);
    console.log(response)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ScannedPartsResponse = await response.json();
    console.log('777777', data)
    return data.scannedParts || [];

  } catch (error) {
    console.error('Error fetching scanned parts:', error);
    return [];
  }
};

// Search for a specific part across all scanned parts
export const findPartInScannedParts = async (partNumber: string): Promise<{
  found: boolean;
  partDetails: {
    partNumber: string;
    ticketCode: string;
    project: string;
    build: string;
    colour: string;
    source: string;
    processStage: string;
    session: string;
    scannedPartRecord: ScannedPart;
  } | null;
}> => {
  try {
    const scannedParts = await fetchAllScannedParts();
    const normalizedTarget = normalizePartNumber(partNumber);

    for (const record of scannedParts) {
      const partsInRecord = parsePartsFromRecord(record);
      for (const part of partsInRecord) {
        if (normalizePartNumber(part) === normalizedTarget) {
          return {
            found: true,
            partDetails: {
              partNumber: part.toUpperCase(),
              ticketCode: record.ticketCode,
              project: record.project || '',
              build: record.build || '',
              colour: record.colour || '',
              source: record.source || '',
              processStage: record.processStage || '',
              session: record.session || '',
              scannedPartRecord: record
            }
          };
        }
      }
    }

    return { found: false, partDetails: null };
  } catch (error) {
    console.error('Error searching for part:', error);
    return { found: false, partDetails: null };
  }
};

// Parse parts from a record (handles different formats)
const parsePartsFromRecord = (record: ScannedPart): string[] => {
  try {
    if (!record.parts) return [];

    // If parts is already an array
    if (Array.isArray(record.parts)) {
      return record.parts.map(p => {
        // Handle object format: { part: "J5LHPC000B800012YT", status: "...", scannedAt: "..." }
        if (typeof p === 'object' && p !== null && 'part' in p) {
          return String(p.part).trim();
        }
        // Handle simple string format
        return String(p).trim();
      }).filter(Boolean);
    }

    // If parts is a string, try parsing as JSON array
    if (typeof record.parts === 'string') {
      try {
        const parsed = JSON.parse(record.parts);
        if (Array.isArray(parsed)) {
          return parsed.map(p => {
            if (typeof p === 'object' && p !== null && 'part' in p) {
              return String(p.part).trim();
            }
            return String(p).trim();
          }).filter(Boolean);
        }
      } catch (e) {
        // Not JSON, try comma-separated
      }

      // Parse as comma-separated string
      return record.parts
        .split(',')
        .map(part => part.trim())
        .filter(Boolean);
    }

    // Fallback for unexpected types
    console.warn('Unexpected parts type:', typeof record.parts, record.parts);
    return [];
  } catch (error) {
    console.error('Error parsing parts from record:', error, record);
    return [];
  }
};

// Normalize part number
const normalizePartNumber = (value: string): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
};


export const fetchChamberLoads = async (): Promise<ChamberLoadDto[]> => {
  const response = await backendApi.get<BackendResponse<ChamberLoadDto[]>>("/chamber-loads");
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const fetchTestingParts = async (): Promise<TestingPartDto[]> => {
  try {
    const response = await backendApi.get<{
      testingParts?: TestingPartDto[];
      data?: TestingPartDto[];
      success?: boolean;
      count?: number;
    }>("/testing-parts");

    if (Array.isArray(response.data?.testingParts)) {
      return response.data.testingParts;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};


// Add this function to your backendApi.ts file





// NEW: Fetch testing part by ID
export const fetchTestingPartById = async (id: string | number): Promise<TestingPartDto | null> => {
  try {
    const response = await backendApi.get<{
      testingPart?: TestingPartDto;
      data?: TestingPartDto;
      success?: boolean;
    }>(`/testing-parts/${id}`);

    if (response.data?.testingPart) {
      return response.data.testingPart;
    }

    if (response.data?.data) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const fetchAllocations = async (): Promise<AllocationDto[]> => {
  const response = await backendApi.get<{ allocations?: AllocationDto[] }>("/allocations");
  const { allocations } = response.data;
  return Array.isArray(allocations) ? allocations : [];
};



// ─────────────────────────────────────────────────────────────────────────────

export interface AllocationUpdatePayload {
  testAllocations: AllocationTestDto[];
  totalRemainingParts?: number | null;
  updatedAt?: string;
}

export const updateBackendAllocation = async (
  ticketCode: string,
  payload: AllocationUpdatePayload
): Promise<AllocationDto | null> => {
  const response = await backendApi.put<{ allocation?: AllocationDto }>(
    `/allocations/${encodeURIComponent(ticketCode)}`,
    payload
  );

  const updated = response.data?.allocation;
  return updated ?? null;
};

export const createChamberLoad = async (
  payload: ChamberLoadPayload
): Promise<ChamberLoadDto> => {
  const response = await backendApi.post<{ success: boolean; data: ChamberLoadDto }>(
    "/chamber-loads",
    payload
  );
  return response.data.data;
};


export const startChamberLoad = async (id: number): Promise<ChamberLoadDto> => {
  const response = await backendApi.post<{ success: boolean; data: ChamberLoadDto }>(
    `/chamber-loads/${id}/start`
  );
  return response.data.data;
};
export const updateChamberLoad = async (
  id: number,
  updates: Partial<ChamberLoadPayload>
): Promise<ChamberLoadDto> => {
  const response = await backendApi.put<{ success: boolean; data: ChamberLoadDto }>(
    `/chamber-loads/${id}`,
    updates
  );
  return response.data.data;
};

export const pauseChamberLoad = async (id: number): Promise<ChamberLoadDto> => {
  const response = await backendApi.post<{ success: boolean; data: ChamberLoadDto }>(
    `/chamber-loads/${id}/pause`
  );
  return response.data.data;
};

export const resumeChamberLoad = async (id: number): Promise<ChamberLoadDto> => {
  const response = await backendApi.post<{ success: boolean; data: ChamberLoadDto }>(
    `/chamber-loads/${id}/resume`
  );
  return response.data.data;
};

export const fetchCalendarTasks = async (): Promise<CalendarTaskDto[]> => {
  const response = await backendApi.get<{ success: boolean; data: CalendarTaskDto[] }>(
    '/calendar-tasks'
  );
  const tasks = response.data?.data;
  return Array.isArray(tasks) ? tasks : [];
};

export const createCalendarTask = async (
  payload: CreateCalendarTaskPayload
): Promise<CalendarTaskDto> => {
  const response = await backendApi.post<{ success: boolean; data: CalendarTaskDto }>(
    '/calendar-tasks',
    payload
  );
  return response.data.data;
};

export const deleteCalendarTask = async (id: string): Promise<void> => {
  await backendApi.delete(`/calendar-tasks/${id}`);
};

export const completeChamberLoad = async (id: number): Promise<ChamberLoadDto> => {
  const response = await backendApi.post<{ success: boolean; data: ChamberLoadDto }>(
    `/chamber-loads/${id}/complete`
  );
  return response.data.data;
};

export const deleteChamberLoad = async (id: number): Promise<void> => {
  await backendApi.delete(`/chamber-loads/${id}`);
};
