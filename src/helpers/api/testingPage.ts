import { isAxiosError } from "axios";
import { backendApi } from "@/lib/backendApi";

export interface TestingPartData {
  id: string | number;
  chamber?: string | null;
  machineId?: string | null;
  machineDescription?: string | null;
  parts?: unknown;
  machineDetails?: unknown;
  loadedAt?: string | null;
  status?: string | null;
  testUnit?: string | null;
  testValue?: number | string | null;
  testStarted?: boolean;
  testStatus?: string | null;
  timerStatus?: string | null;
  timerStartTime?: string | null;
  actualStartTime?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  lastUpdated?: string | null;
  totalParts?: number | null;
  selectedTestId?: string | null;
  selectedTestName?: string | null;
  isCombinedTest?: boolean;
  estimatedCompletion?: string | null;
  ticketCode?: string | null;
  [key: string]: unknown;
}

interface TestingPartResponse {
  testingPart?: TestingPartData;
  testingParts?: TestingPartData[];
  data?: TestingPartData | TestingPartData[];
  message?: string;
  count?: number;
}

const sanitizePayload = (payload: TestingPartData): TestingPartData => {
  const ensureSerializable = (value: unknown) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value ?? null;
    }
  };

  return {
    ...payload,
    parts: ensureSerializable(payload.parts ?? []),
    machineDetails: ensureSerializable(payload.machineDetails ?? {}),
    lastUpdated: payload.lastUpdated ?? new Date().toISOString(),
  };
};

const extractSinglePart = (responseData: TestingPartResponse | TestingPartData | undefined): TestingPartData | null => {
  if (!responseData) {
    return null;
  }

  if (Array.isArray((responseData as TestingPartResponse).testingParts)) {
    const [first] = (responseData as TestingPartResponse).testingParts ?? [];
    return first ?? null;
  }

  if ((responseData as TestingPartResponse).testingPart) {
    return (responseData as TestingPartResponse).testingPart ?? null;
  }

  if ((responseData as TestingPartResponse).data) {
    const dataValue = (responseData as TestingPartResponse).data;
    if (Array.isArray(dataValue)) {
      const [first] = dataValue;
      return (first ?? null) as TestingPartData | null;
    }
    return (dataValue ?? null) as TestingPartData | null;
  }

  if ((responseData as TestingPartData).id !== undefined) {
    return responseData as TestingPartData;
  }

  return null;
};

export const saveTestingPartToBackend = async (
  payload: TestingPartData,
): Promise<TestingPartData | null> => {
  const body = sanitizePayload(payload);
  const response = await backendApi.post<TestingPartResponse>(
    "/testing-parts",
    body,
  );
  return extractSinglePart(response.data);
};

export const updateTestingPartInBackend = async (
  id: string | number,
  updates: Partial<TestingPartData>,
): Promise<TestingPartData | null> => {
  const body = sanitizePayload({ ...(updates as TestingPartData), id });

  try {
    const response = await backendApi.put<TestingPartResponse>(
      `/testing-parts/${encodeURIComponent(id)}`,
      body,
    );
    return extractSinglePart(response.data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      // Do not create a new row if update fails
      return null;
    }
    throw error;
  }
};

export const fetchTestingPartById = async (
  id: string | number,
): Promise<TestingPartData | null> => {
  try {
    const response = await backendApi.get<TestingPartResponse>(
      `/testing-parts/${encodeURIComponent(id)}`,
    );
    return extractSinglePart(response.data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};


