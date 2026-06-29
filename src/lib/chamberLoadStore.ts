import { isAxiosError } from "axios";
import {
  fetchChamberLoads,
  fetchTestingParts,
  type ChamberLoadDto,
  type TestingPartDto,
} from "@/lib/backendApi";
import {
  hydrateChamberLoadData,
  type ChamberLoadData,
} from "@/lib/chamberloadreport";
import {
  saveTestingPartToBackend,
  updateTestingPartInBackend,
  type TestingPartData,
} from "@/helpers/api/testingPage";

export type NormalizedChamberLoad = ChamberLoadData & {
  loadId?: string | number;
  machine?: string;
  parts: Array<any>;
  machineDetails?: Record<string, any>;
  status?: string | null;
  testStatus?: string | number;
  timerStatus?: string | number;
  testValue?: string | number;
  testUnit?: string | null;
  isCompleted?: boolean;
  chamberLoad?: any;
};

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (value == null) {
    return fallback;
  }

  return value as T;
};

const pickChamberIdentifier = (
  record: Partial<TestingPartDto | ChamberLoadDto | NormalizedChamberLoad>,
  machineDetails: Record<string, any>,
): string | undefined => {
  return (
    (record as any)?.chamber ??
    (record as any)?.machine ??
    (record as any)?.machineDescription ??
    machineDetails?.machine ??
    machineDetails?.machineDescription ??
    undefined
  );
};

export const normalizeTestingPartRecord = (
  record: TestingPartDto,
): NormalizedChamberLoad => {
  const parsedParts = parseJsonField(record.parts, []);
  const parsedMachineDetails = parseJsonField(record.machineDetails, {});

  const hydrated = hydrateChamberLoadData({
    ...record,
    parts: parsedParts,
    machineDetails: parsedMachineDetails,
  });

  return {
    ...hydrated,
    loadId: record.id,
    chamber: hydrated.chamber ?? pickChamberIdentifier(record, parsedMachineDetails) ?? "Unknown Chamber",
    machine: hydrated.machine ?? parsedMachineDetails?.machine,
    parts: Array.isArray(parsedParts) ? parsedParts : [],
    machineDetails: parsedMachineDetails ?? {},
    status: hydrated.status ?? record.status,
    testStatus: hydrated.testStatus ?? record.testStatus ?? record.status,
    timerStatus: hydrated.timerStatus ?? record.timerStatus ?? "stop",
    testValue: hydrated.testValue ?? record.testValue,
    testUnit: hydrated.testUnit ?? record.testUnit ?? parsedMachineDetails?.unit ?? null,
    isCompleted: hydrated.isCompleted ?? record.isCompleted ?? false,
    chamberLoad: {
      ...record,
      parts: parsedParts,
      machineDetails: parsedMachineDetails,
    },
  };
};

export const normalizeChamberLoadRecord = (
  record: ChamberLoadDto,
): NormalizedChamberLoad => {
  const hydrated = hydrateChamberLoadData(record);
  const machineDetails = hydrated.machineDetails ?? {};
  return {
    ...hydrated,
    loadId: hydrated.id,
    chamber: hydrated.chamber ?? pickChamberIdentifier(record, machineDetails) ?? "Unknown Chamber",
    machine: hydrated.machine ?? machineDetails.machine,
    parts: Array.isArray(hydrated.parts) ? hydrated.parts : [],
    machineDetails,
    status: hydrated.status ?? record.status,
    testStatus: hydrated.testStatus ?? record.testStatus,
    timerStatus: hydrated.timerStatus ?? record.timerStatus,
    testValue: hydrated.testValue ?? record.testValue,
    testUnit: hydrated.testUnit ?? machineDetails?.unit ?? null,
    isCompleted: hydrated.isCompleted ?? record.isCompleted ?? false,
    chamberLoad: {
      ...record,
      parts: hydrated.parts,
      machineDetails,
    },
  };
};

const mergeChamberLoads = (
  primary: NormalizedChamberLoad[],
  secondary: NormalizedChamberLoad[],
): NormalizedChamberLoad[] => {
  const map = new Map<string | number, NormalizedChamberLoad>();
  const withoutId: NormalizedChamberLoad[] = [];

  const addToMap = (load: NormalizedChamberLoad) => {
    const key = load.loadId ?? (load as any).id;
    if (key === undefined || key === null) {
      withoutId.push(load);
      return;
    }
    map.set(key, load);
  };

  secondary.forEach(addToMap);
  primary.forEach(addToMap);

  return [...map.values(), ...withoutId];
};

export const getCachedChamberLoads = (): NormalizedChamberLoad[] => {
  try {
    const raw = localStorage.getItem("chamberLoads");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse cached chamber loads:", error);
    return [];
  }
};

export const cacheChamberLoads = (
  loads: NormalizedChamberLoad[],
): void => {
  // localStorage.setItem("chamberLoads", JSON.stringify(loads));
};

export const syncChamberLoadsFromBackend = async (): Promise<
  NormalizedChamberLoad[]
> => {
  const [testingPartsResult, chamberLoadsResult] = await Promise.allSettled([
    fetchTestingParts(),
    fetchChamberLoads(),
  ]);

  if (
    testingPartsResult.status === "rejected" &&
    (!isAxiosError(testingPartsResult.reason) ||
      testingPartsResult.reason.response?.status !== 404)
  ) {
    console.error(
      "Failed to load testing parts from backend:",
      testingPartsResult.reason,
    );
  }

  if (
    chamberLoadsResult.status === "rejected" &&
    (!isAxiosError(chamberLoadsResult.reason) ||
      chamberLoadsResult.reason.response?.status !== 404)
  ) {
    console.error(
      "Failed to load chamber loads from backend:",
      chamberLoadsResult.reason,
    );
  }

  const normalizedTestingParts =
    testingPartsResult.status === "fulfilled"
      ? testingPartsResult.value.map(normalizeTestingPartRecord)
      : [];

  const normalizedChamberLoads =
    chamberLoadsResult.status === "fulfilled"
      ? chamberLoadsResult.value.map(normalizeChamberLoadRecord)
      : [];

  const merged = mergeChamberLoads(
    normalizedTestingParts,
    normalizedChamberLoads,
  );

  cacheChamberLoads(merged);
  return merged;
};

const sanitizeForJson = (value: unknown) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value ?? null;
  }
};

export const toTestingPartPayload = (
  load: NormalizedChamberLoad,
): TestingPartData | null => {
  const source = load.chamberLoad ?? load;
  const id = (source as any)?.id ?? load.loadId;

  if (id === undefined || id === null) {
    return null;
  }

  const parts = sanitizeForJson((source as any)?.parts ?? load.parts ?? []);
  const machineDetails = sanitizeForJson(
    (source as any)?.machineDetails ?? load.machineDetails ?? {},
  );

  return {
    id,
    chamber:
      (source as any)?.chamber ??
      load.chamber ??
      pickChamberIdentifier(source as any, load.machineDetails ?? {}) ??
      "Unknown Chamber",
    machineId:
      (source as any)?.machineId ??
      (load.machineDetails as any)?.machineId ??
      (load as any)?.machineId ??
      null,
    machineDescription:
      (source as any)?.machineDescription ??
      (load.machineDetails as any)?.machineDescription ??
      load.machine ??
      null,
    parts,
    machineDetails,
    loadedAt:
      (source as any)?.loadedAt ?? load.loadedAt ?? new Date().toISOString(),
    status:
      (source as any)?.status ??
      (typeof load.status === "string" ? load.status : null) ??
      "loaded",
    testUnit:
      (source as any)?.testUnit ??
      (load.machineDetails as any)?.unit ??
      load.testUnit ??
      null,
    testValue:
      (source as any)?.testValue ?? load.testValue ?? null,
    testStarted:
      (source as any)?.testStarted ?? load.testStarted ?? false,
    testStatus:
      (source as any)?.testStatus ?? load.testStatus ?? "pending",
    timerStatus:
      (source as any)?.timerStatus ?? load.timerStatus ?? "stop",
    timerStartTime:
      (source as any)?.timerStartTime ?? load.timerStartTime ?? null,
    actualStartTime:
      (source as any)?.actualStartTime ?? load.actualStartTime ?? null,
    isCompleted:
      (source as any)?.isCompleted ?? load.isCompleted ?? false,
    completedAt:
      (source as any)?.completedAt ?? load.completedAt ?? null,
    lastUpdated: new Date().toISOString(),
    totalParts:
      (source as any)?.totalParts ??
      load.totalParts ??
      (Array.isArray(parts) ? parts.length : null),
    selectedTestId:
      (source as any)?.selectedTestId ??
      (load.machineDetails as any)?.selectedTestId ??
      null,
    selectedTestName:
      (source as any)?.selectedTestName ??
      (load.machineDetails as any)?.selectedTestName ??
      null,
    isCombinedTest:
      (source as any)?.isCombinedTest ?? load.isCombinedTest ?? false,
    estimatedCompletion:
      (source as any)?.estimatedCompletion ?? load.estimatedCompletion ?? null,
    ticketCode:
      (source as any)?.ticketCode ??
      (load.machineDetails as any)?.ticketCode ??
      null,
  };
};

export const persistChamberLoadsToBackend = async (
  loads: NormalizedChamberLoad[],
  targetIds?: Array<string | number>,
): Promise<void> => {
  cacheChamberLoads(loads);

  const targets = targetIds
    ? loads.filter((load) => {
      const id = load.loadId ?? (load as any).id;
      return id !== undefined && id !== null && targetIds.includes(id);
    })
    : loads;

  await Promise.all(
    targets.map(async (load) => {
      const payload = toTestingPartPayload(load);
      if (!payload) {
        return;
      }

      try {
        await updateTestingPartInBackend(payload.id, payload);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          await saveTestingPartToBackend(payload);
          return;
        }
        console.error("Failed to persist chamber load", payload.id, error);
      }
    }),
  );
};
