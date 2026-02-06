import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Logo from "../assets/logo.png";
import { getBackendApiUrl } from "./backendApi";
import { downloadUTMReport, transformChamberDataToUTMReport } from "./UTMreport";

export interface ChamberLoadSummaryItem {
  label: string;
  hint: string;
  value: string;
}

export interface ChamberResultHeader {
  testName: string;
  ers: string;
  machine: string;
  failureCriteria: string;
  testCondition: string;
  project: string;
}

export interface ChamberResultRow {
  date: string;
  testPart: string;
  checkpoint: string | number;
  cosmeticImage?: string;
  nonCosmeticImage?: string;
  image?: string;
  postCosmeticImage?: string;
  postNonCosmeticImage?: string;
  postCosmeticImages?: string[];
  postNonCosmeticImages?: string[];
  result: string;
  customData?: Record<string, string>;
  partIndex?: number;
  checkpointIndex?: number;
}

export interface ChamberCheckpointImages {
  cosmetic?: string[];
  nonCosmetic?: string[];
  cropped?: string[];
}

export interface ChamberCheckpointHistoryEntry {
  checkpoint?: string | number;
  completedAt?: string | null;
  status?: string;
  images?: ChamberCheckpointImages | null;
}

export interface ChamberCheckpointDataEntry {
  checkpointIndex?: number;
  checkpointValue?: number | string;
  label?: string;
  testDate?: string;
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  postCosmeticImages?: string[];
  postNonCosmeticImages?: string[];
  status?: string | null;
  customData?: Record<string, string> | null;
  submittedAt?: string;
  croppedImages?: Record<string, string | null> | null;
}

export interface ChamberCheckpointInfo {
  checkpoints?: Array<string | number>;
  checkpoint?: string | number;
  checkpointIndex?: number | null;
  currentCheckpointIndex?: number | null;
  totalCheckpoints?: number;
  nextCheckpointTime?: string | null;
  lastCheckpointTime?: string | null;
  checkpointHistory?: ChamberCheckpointHistoryEntry[];
}

export interface ChamberLoadPart {
  partNumber?: string;
  serialNumber?: string;
  ticketCode?: string;
  testId?: string;
  testName?: string;
  testType?: string;
  testUnit?: string | number;
  testCondition?: string;
  loadedAt?: string;
  duration?: string | number;
  scanStatus?: string | number;
  status?: string | number;
  testValue?: string | number;
  requiresReload?: boolean;
  requiresUnload?: boolean;
  checkpointInfo?: ChamberCheckpointInfo | null;
  checkpointData?: ChamberCheckpointDataEntry[];
  cosmeticImages?: string[];
  nonCosmeticImages?: string[];
  isCompleted?: boolean;
  completedAt?: string | null;
  t0ImagesComplete?: boolean;
  postCosmeticImages?: string[];
  postNonCosmeticImages?: string[];
  postCosmeticImage?: string | null;
  postNonCosmeticImage?: string | null;
  customColumnData?: Record<string, Record<string, unknown>>;
  utmCustomColumnData?: Record<string, Record<string, unknown>>;
}

export interface ChamberCustomColumnDefinition {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  options?: string[];
}

export interface ChamberLoadTest {
  id?: string | number;
  testName?: string;
  testType?: string;
  testUnit?: string | number;
  testCondition?: string;
  duration?: string | number;
  status?: number | string;
  requiredQty?: number | string;
  allocatedParts?: number | string;
  remainingQty?: number | string;
  alreadyAllocated?: number | string;
  time?: string | number;
  checkPoints?: string;
  checkpoints?: Array<string | number>;
  specification?: string;
  location?: string;
  currentCheckpoint?: string | number;
}

export interface ChamberLoadMachineDetails {
  machine?: string;
  machineId?: string;
  ticketCode?: string;
  project?: string;
  build?: string;
  colour?: string;
  totalTests?: number;
  tests?: ChamberLoadTest[];
  machineDescription?: string;
  selectedTest?: ChamberLoadTest | null;
}

export interface ChamberLoadData {
  id?: string | number;
  chamber?: string;
  machine?: string;
  machineDescription?: string;
  machineDetails?: ChamberLoadMachineDetails;
  parts?: ChamberLoadPart[];
  loadedAt?: string;
  estimatedCompletion?: string | null;
  completedAt?: string | null;
  duration?: string | number;
  testValue?: string | number;
  status?: string;
  timerStatus?: string;
  isCompleted?: boolean;
  testUnit?: string;
  testStarted?: boolean;
  testStatus?: string | number;
  timerStartTime?: string | null;
  actualStartTime?: string | null;
  lastUpdated?: string | null;
  totalParts?: number;
  summaryFields?: ChamberLoadSummaryItem[];
  customColumns?: ChamberCustomColumnDefinition[];
  customColumnData?: Record<string, string>;
}

export interface ChamberResultsData {
  header: ChamberResultHeader;
  results: ChamberResultRow[];
}

export interface ChamberLoadReportDownloadOptions {
  ticketCode?: string;
  reportNumber?: string | number;
  reportDate?: string;
  filename?: string;
  resultsHeader?: Partial<ChamberResultHeader>;
  resultsRows?: ChamberResultRow[];
}

const SUMMARY_FIELD_HINTS: Record<string, string> = {
  "Test Name": "(description)",
  "Ticket Code / Document No": "(reference)",
  "Project Name": "(name)",
  "Build": "(variant)",
  "Colour": "(name)",
  "Machine ID": "(equipment id)",
  "Machine Description": "(equipment)",
  "Chamber": "(chamber id)",
  "Test Location": "(location)",
  "Sample Quantity": "(total samples)",
  "Part Number": "(sample id)",
  "Serial Number": "(serial id)",
  "Test Condition": "(checkpoints)",
  "Test Unit": "(unit)",
  "Test Duration": "(planned)",
  "Loaded At": "(timestamp)",
  "Current Checkpoint": "(progress)",
  "Next Checkpoint": "(upcoming)",
  "Last Checkpoint Status": "(result)",
  "Overall Status": "(system status)",
  "Requires Reload": "(boolean)",
  "Requires Unload": "(boolean)",
  "Test Completed": "(boolean)"
};

const DEFAULT_DISPLAY_VALUE = "N/A";

const resolveSummaryHint = (label: string): string => SUMMARY_FIELD_HINTS[label] ?? "";

const tryParseJsonValue = <T>(value: unknown): T | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed) as T;
    } catch (_error) {
      return null;
    }
  }

  return null;
};

// Normalize custom column values so arrays/objects are safely stringified and trimmed
const normalizeCustomValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const filtered = value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    return filtered.length > 0 ? JSON.stringify(filtered) : null;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_err) {
      return null;
    }
  }

  const str = String(value).trim();
  return str || null;
};

const cloneSummary = (summary?: ChamberLoadSummaryItem[]): ChamberLoadSummaryItem[] => {
  return (summary ?? []).map((item) => ({ ...item }));
};

const cloneTests = (tests?: ChamberLoadTest[]): ChamberLoadTest[] => {
  return (tests ?? []).map((test) => ({ ...test }));
};

const cloneCheckpointImages = (images?: ChamberCheckpointImages | null): ChamberCheckpointImages | undefined => {
  if (!images) {
    return undefined;
  }

  return {
    cosmetic: images.cosmetic ? [...images.cosmetic] : undefined,
    nonCosmetic: images.nonCosmetic ? [...images.nonCosmetic] : undefined,
    cropped: images.cropped ? [...images.cropped] : undefined
  };
};

const cloneCheckpointData = (
  data?: ChamberCheckpointDataEntry[]
): ChamberCheckpointDataEntry[] | undefined => {
  if (!Array.isArray(data)) {
    return undefined;
  }

  return data.map((entry) => ({
    ...entry,
    cosmeticImages: entry.cosmeticImages ? [...entry.cosmeticImages] : undefined,
    nonCosmeticImages: entry.nonCosmeticImages ? [...entry.nonCosmeticImages] : undefined,
    customData: entry.customData ? { ...entry.customData } : undefined,
    croppedImages: entry.croppedImages ? { ...entry.croppedImages } : undefined,
  }));
};

const cloneCheckpointInfo = (info?: ChamberCheckpointInfo | null): ChamberCheckpointInfo | undefined => {
  if (!info) {
    return undefined;
  }

  return {
    ...info,
    checkpoints: info.checkpoints ? [...info.checkpoints] : undefined,
    checkpointHistory: info.checkpointHistory
      ? info.checkpointHistory.map((entry) => ({
        ...entry,
        images: cloneCheckpointImages(entry.images ?? undefined)
      }))
      : undefined
  };
};

const cloneParts = (parts?: ChamberLoadPart[]): ChamberLoadPart[] => {
  return (parts ?? []).map((part) => ({
    ...part,
    checkpointInfo: cloneCheckpointInfo(part.checkpointInfo ?? undefined),
    checkpointData: cloneCheckpointData(part.checkpointData ?? undefined)
  }));
};

export const getDefaultChamberLoadData = (): ChamberLoadData => ({
  machineDetails: {
    tests: []
  },
  parts: [],
  summaryFields: []
});

// If data is already from testing_parts, just return as-is (no merge/hydrate from other sources)
export const hydrateChamberLoadData = (load: ChamberLoadData): ChamberLoadData => {
  const normalizedCustomColumns = (() => {
    if (Array.isArray(load.customColumns)) {
      return load.customColumns.map((column) => ({ ...column }));
    }

    const parsed = tryParseJsonValue<ChamberCustomColumnDefinition[]>(load.customColumns);
    if (Array.isArray(parsed)) {
      return parsed.map((column) => ({ ...column }));
    }

    if (load.customColumns && typeof load.customColumns === "object") {
      if (Array.isArray((load.customColumns as any))) {
        return (load.customColumns as unknown as ChamberCustomColumnDefinition[]).map((column) => ({ ...column }));
      }
      return Object.values(load.customColumns as Record<string, ChamberCustomColumnDefinition>).map((column) => ({ ...column }));
    }

    return undefined;
  })();

  const normalizedCustomColumnData = (() => {
    if (load.customColumnData && typeof load.customColumnData === "object" && !Array.isArray(load.customColumnData)) {
      return { ...(load.customColumnData as Record<string, string>) };
    }

    const parsed = tryParseJsonValue<Record<string, string>>(load.customColumnData);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return undefined;
  })();

  const hydrated: ChamberLoadData = {
    ...load,
    parts: cloneParts(load.parts),
    summaryFields: load.summaryFields ? cloneSummary(load.summaryFields) : load.summaryFields,
    customColumns: normalizedCustomColumns,
    customColumnData: normalizedCustomColumnData,
  };

  if (load.machineDetails) {
    hydrated.machineDetails = {
      ...load.machineDetails,
      tests: cloneTests(load.machineDetails.tests),
    };
  }

  return hydrated;
};

const extractColumnIdFromCompositeKey = (key: string): string => {
  if (!key) {
    return key;
  }
  const compositeMatch = key.match(/^\d+-\d+-(.+)$/);
  return compositeMatch ? compositeMatch[1] : key;
};

const buildFriendlyColumnLabelFromId = (id: string | undefined, index: number): string => {
  if (!id) {
    return `Custom ${index + 1}`;
  }

  const cleaned = id.replace(/^custom[-_]?/i, "").replace(/[-_]+/g, " ").trim();
  if (!cleaned || /^\d+$/.test(cleaned)) {
    return `Custom ${index + 1}`;
  }

  return cleaned
    .split(" ")
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(" ");
};

const buildCustomColumnRegistry = (load: ChamberLoadData) => {
  const registry = new Map<string, ChamberCustomColumnDefinition>();

  const registerDefinition = (definition: Partial<ChamberCustomColumnDefinition> | string | null | undefined) => {
    if (!definition) {
      return;
    }

    if (typeof definition === "string") {
      const parsed = tryParseJsonValue<
        Partial<ChamberCustomColumnDefinition> | Partial<ChamberCustomColumnDefinition>[]
      >(definition);

      if (parsed) {
        if (Array.isArray(parsed)) {
          parsed.forEach(registerDefinition);
          return;
        }
        registerDefinition(parsed);
        return;
      }

      const id = definition.trim();
      if (!id) {
        return;
      }
      if (!registry.has(id)) {
        registry.set(id, { id, name: id, label: id });
      }
      return;
    }

    const rawId = definition.id ?? definition.name ?? definition.label;
    if (!rawId) {
      return;
    }

    const id = String(rawId).trim();
    if (!id) {
      return;
    }

    const existing = registry.get(id);
    const next: ChamberCustomColumnDefinition = {
      id,
      ...(existing ?? {}),
      ...definition,
      name: definition.name ?? existing?.name ?? id,
      label: definition.label ?? existing?.label ?? definition.name ?? existing?.name ?? id
    };

    if (definition.options) {
      next.options = Array.isArray(definition.options) ? definition.options.slice() : existing?.options;
    }

    registry.set(id, next);
  };

  const registerKeyRecord = (record: unknown) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return;
    }
    Object.keys(record as Record<string, unknown>).forEach((key) => {
      registerDefinition(extractColumnIdFromCompositeKey(key));
    });
  };

  const registerCollection = (value: unknown) => {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      const parsed = tryParseJsonValue<unknown>(value);
      if (parsed) {
        registerCollection(parsed);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => registerDefinition(entry as any));
      return;
    }

    if (typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((entry) => registerDefinition(entry as any));
    }
  };

  registerCollection(load.customColumns);

  const globalCustomColumnData =
    load.customColumnData && typeof load.customColumnData === "object" && !Array.isArray(load.customColumnData)
      ? (load.customColumnData as Record<string, string>)
      : {};

  Object.keys(globalCustomColumnData).forEach((key) => {
    registerDefinition(extractColumnIdFromCompositeKey(key));
  });

  const machineDetails = load.machineDetails as (ChamberLoadMachineDetails & { customColumns?: unknown }) | undefined;
  if (machineDetails) {
    registerCollection(machineDetails.customColumns);
    registerCollection((machineDetails.selectedTest as any)?.customColumns);

    (machineDetails.tests ?? []).forEach((test: any) => {
      registerCollection(test?.customColumns);
    });
  }

  (load.parts ?? []).forEach((part) => {
    registerKeyRecord((part as any)?.customColumnData);
    registerKeyRecord((part as any)?.utmCustomColumnData);

    const checkpointData = Array.isArray(part?.checkpointData) ? part.checkpointData : [];
    checkpointData.forEach((entry) => {
      registerKeyRecord(entry?.customData ?? null);
    });

    const history = Array.isArray(part?.checkpointInfo?.checkpointHistory)
      ? part.checkpointInfo?.checkpointHistory
      : [];
    history.forEach((entry: any) => {
      registerKeyRecord(entry?.customData ?? null);
    });
  });

  const definitions = Array.from(registry.values()).map((definition) => {
    const label = typeof definition.label === "string" && definition.label.trim()
      ? definition.label.trim()
      : definition.name ?? definition.id;
    const name = typeof definition.name === "string" && definition.name.trim()
      ? definition.name.trim()
      : definition.id;
    return {
      ...definition,
      id: definition.id,
      label,
      name
    } as ChamberCustomColumnDefinition;
  });

  const ids = definitions.map((definition) => definition.id);

  return {
    definitions,
    ids,
    globalData: globalCustomColumnData
  };
};

const coerceDisplayValue = (value: unknown, fallback: string): string => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const output = String(value).trim();
  return output || fallback;
};

const formatBooleanFlag = (value: unknown): string => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value !== 0 ? "Yes" : "No";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return "No";
    }
    if (["yes", "true", "1", "y", "completed", "done", "pass"].includes(normalized)) {
      return "Yes";
    }
    if (["no", "false", "0", "n"].includes(normalized)) {
      return "No";
    }
  }

  return "No";
};

const parseDateValue = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTimeLocal = (value?: string | null, fallback = "N/A"): string => {
  const date = parseDateValue(value);
  if (!date) {
    return fallback;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatDateOnly = (value?: string | null, fallback = "N/A"): string => {
  const date = parseDateValue(value);
  if (!date) {
    return fallback;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatList = (values: Array<string | number | null | undefined>, fallback: string, limit = 3): string => {
  const cleaned = values
    .map((item) => {
      if (item === undefined || item === null) {
        return "";
      }
      if (typeof item === "number") {
        return Number.isFinite(item) ? String(item) : "";
      }
      return String(item).trim();
    })
    .filter((item) => Boolean(item));

  if (cleaned.length === 0) {
    return fallback;
  }

  const unique = Array.from(new Set(cleaned));
  if (unique.length <= limit) {
    return unique.join(", ");
  }

  const displayed = unique.slice(0, limit).join(", ");
  return `${displayed} +${unique.length - limit} more`;
};

const formatCheckpointValue = (value: unknown, unit?: string, fallback = "N/A"): string => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "number") {
    return unit ? `${value} ${unit}` : String(value);
  }

  const output = String(value).trim();
  if (!output) {
    return fallback;
  }

  return output;
};

const deriveStatusString = (value: unknown): string => {
  if (typeof value === "number") {
    if (value === 3) return "completed";
    if (value === 2) return "in_progress";
    if (value === 4) return "failed";
    if (value === 1) return "pending";
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const normalizeOverallStatus = (load: ChamberLoadData): string => {
  if (load.isCompleted) {
    return "Completed";
  }

  const raw = deriveStatusString(load.status ?? load.testStatus).trim().toLowerCase();
  const timer = deriveStatusString(load.timerStatus).trim().toLowerCase();

  if (raw === "paused") {
    return "Paused";
  }

  if (raw === "checkpoint_failed" || raw === "failed") {
    return "Attention Needed";
  }

  if (raw === "start" || raw === "in_progress" || raw === "loaded" || timer === "start") {
    return "In Progress";
  }

  if (raw === "pending") {
    return "Queued";
  }

  if (!raw) {
    return "Queued";
  }

  return raw
    .split(/[_\s]+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim() || "Queued";
};

const formatResultStatus = (value?: string | null): string => {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "Pass";
  }

  if (normalized.includes("fail")) {
    return "Fail";
  }

  if (normalized.includes("pass")) {
    return "Pass";
  }

  if (["no", "pending", "in progress", "in_progress", "start", "started", "attention needed", "checkpoint_failed"].includes(normalized)) {
    return "Fail";
  }

  return "Pass";
};

export const buildChamberLoadSummary = (load: ChamberLoadData): ChamberLoadSummaryItem[] => {
  const summary = cloneSummary(load.summaryFields);
  const parts = load.parts ?? [];
  const machineDetails = load.machineDetails ?? {};
  const tests = machineDetails.tests ?? [];
  const primaryPart = parts[0];
  const primaryTest = tests[0];
  const checkpointInfo = primaryPart?.checkpointInfo;

  const checkpoints = checkpointInfo?.checkpoints ?? primaryTest?.checkpoints ?? [];
  const currentIndex = checkpointInfo?.currentCheckpointIndex ?? checkpointInfo?.checkpointIndex ?? null;

  const currentCheckpointRaw = typeof currentIndex === "number" && Array.isArray(checkpoints) && checkpoints[currentIndex] !== undefined
    ? checkpoints[currentIndex]
    : checkpointInfo?.checkpoint ?? primaryTest?.currentCheckpoint ?? (Array.isArray(checkpoints) ? checkpoints[0] : undefined);

  let nextCheckpointRaw: string | number | undefined;
  if (typeof currentIndex === "number" && Array.isArray(checkpoints) && checkpoints[currentIndex + 1] !== undefined) {
    nextCheckpointRaw = checkpoints[currentIndex + 1];
  } else if (Array.isArray(checkpoints)) {
    nextCheckpointRaw = checkpoints.find((value) => value !== currentCheckpointRaw);
  }

  const lastHistoryEntry = checkpointInfo?.checkpointHistory?.reduce<ChamberCheckpointHistoryEntry | undefined>((latest, entry) => {
    const entryTime = parseDateValue(entry.completedAt ?? null)?.getTime() ?? -Infinity;
    const latestTime = parseDateValue(latest?.completedAt ?? null)?.getTime() ?? -Infinity;
    return entryTime >= latestTime ? entry : latest;
  }, undefined);

  const testUnitRaw = primaryPart?.testUnit ?? load.testUnit;
  const summaryFallback = () => DEFAULT_DISPLAY_VALUE;
  const setSummaryValue = (label: string, rawValue: unknown) => {
    const fallbackValue = summaryFallback();
    const resolved = typeof rawValue === "string"
      ? (rawValue.trim() || fallbackValue)
      : coerceDisplayValue(rawValue, fallbackValue);

    const hint = resolveSummaryHint(label);
    const item = summary.find((entry) => entry.label === label);
    if (item) {
      item.value = resolved;
      if (!item.hint && hint) {
        item.hint = hint;
      }
    } else {
      summary.push({ label, hint, value: resolved });
    }
  };

  const machineIdValue = machineDetails.machineId ?? load.machine;
  const machineDescriptionValue = load.machineDescription
    ?? machineDetails.machineDescription
    ?? machineDetails.machine
    ?? machineIdValue
    ?? load.chamber;

  const nextCheckpointTime = formatDateTimeLocal(checkpointInfo?.nextCheckpointTime ?? null, "");
  const nextCheckpointValue = formatCheckpointValue(nextCheckpointRaw, typeof testUnitRaw === "string" ? testUnitRaw : undefined, "");
  const formattedNextCheckpoint = nextCheckpointValue
    ? (nextCheckpointTime ? `${nextCheckpointValue} (${nextCheckpointTime})` : nextCheckpointValue)
    : summaryFallback();

  const lastStatusLabel = formatResultStatus(lastHistoryEntry?.status ?? null);
  const lastStatusTime = formatDateTimeLocal(lastHistoryEntry?.completedAt ?? null, "");
  const lastCheckpointStatus = lastStatusTime ? `${lastStatusLabel} (${lastStatusTime})` : lastStatusLabel;

  setSummaryValue("Test Name", primaryPart?.testName ?? primaryTest?.testName);
  setSummaryValue("Ticket Code / Document No", machineDetails.ticketCode ?? primaryPart?.ticketCode);
  setSummaryValue("Project Name", machineDetails.project);
  setSummaryValue("Build", machineDetails.build);
  setSummaryValue("Colour", machineDetails.colour);
  setSummaryValue("Machine ID", machineIdValue);
  setSummaryValue("Machine Description", machineDescriptionValue);
  setSummaryValue("Chamber", load.chamber ?? machineIdValue);
  setSummaryValue("Test Location", primaryTest?.location);
  setSummaryValue("Sample Quantity", load.totalParts ?? parts.length);
  setSummaryValue("Part Number", formatList(parts.map((part) => part?.partNumber), summaryFallback()));
  setSummaryValue("Serial Number", formatList(parts.map((part) => part?.serialNumber), summaryFallback()));

  const testConditionValue = primaryPart?.testCondition
    ?? primaryTest?.testCondition
    ?? primaryTest?.checkPoints
    ?? (Array.isArray(primaryTest?.checkpoints) ? primaryTest?.checkpoints?.join(", ") : undefined);
  setSummaryValue("Test Condition", testConditionValue);

  setSummaryValue("Test Unit", testUnitRaw);
  setSummaryValue("Test Duration", primaryTest?.time ?? primaryTest?.duration ?? load.duration ?? load.testValue);
  setSummaryValue("Loaded At", formatDateTimeLocal(load.loadedAt ?? null, summaryFallback()));
  setSummaryValue(
    "Current Checkpoint",
    formatCheckpointValue(currentCheckpointRaw, typeof testUnitRaw === "string" ? testUnitRaw : undefined, "")
  );
  setSummaryValue("Next Checkpoint", formattedNextCheckpoint);
  setSummaryValue("Last Checkpoint Status", lastCheckpointStatus);
  setSummaryValue("Overall Status", normalizeOverallStatus(load));
  setSummaryValue("Requires Reload", formatBooleanFlag(primaryPart?.requiresReload));
  setSummaryValue("Requires Unload", formatBooleanFlag(primaryPart?.requiresUnload));
  setSummaryValue("Test Completed", formatBooleanFlag(load.isCompleted ?? primaryPart?.isCompleted));

  return summary;
};

export const buildChamberResultsHeader = (load: ChamberLoadData): ChamberResultHeader => {
  const fallback = () => DEFAULT_DISPLAY_VALUE;
  const parts = load.parts ?? [];
  const machineDetails = load.machineDetails ?? {};
  const tests = machineDetails.tests ?? [];
  const primaryPart = parts[0];
  const primaryTest = tests[0];

  const checkpointsSummary = (() => {
    if (typeof primaryTest?.checkPoints === "string" && primaryTest.checkPoints.trim()) {
      return primaryTest.checkPoints.trim();
    }
    if (Array.isArray(primaryTest?.checkpoints) && primaryTest.checkpoints.length > 0) {
      return primaryTest.checkpoints.join(", ");
    }
    if (Array.isArray(primaryPart?.checkpointInfo?.checkpoints) && primaryPart.checkpointInfo?.checkpoints?.length) {
      return primaryPart.checkpointInfo.checkpoints.join(", ");
    }
    return undefined;
  })();

  return {
    testName: coerceDisplayValue(primaryPart?.testName ?? primaryTest?.testName, fallback()),
    ers: coerceDisplayValue(machineDetails.ticketCode ?? primaryPart?.ticketCode, fallback()),
    machine: coerceDisplayValue(
      machineDetails.machineDescription ?? load.machineDescription ?? machineDetails.machine ?? load.machine,
      fallback()
    ),
    failureCriteria: coerceDisplayValue(primaryTest?.specification ?? checkpointsSummary, fallback()),
    testCondition: coerceDisplayValue(primaryPart?.testCondition ?? primaryTest?.testCondition ?? checkpointsSummary, fallback()),
    project: coerceDisplayValue(machineDetails.project, fallback())
  };
};

const dedupeResultRows = (rows: ChamberResultRow[]): ChamberResultRow[] => {
  const lookup = new Map<string, ChamberResultRow>();

  const imageScore = (row: ChamberResultRow): number => {
    let score = 0;
    if (row.cosmeticImage && String(row.cosmeticImage).trim()) {
      score += 2;
    }
    if (row.nonCosmeticImage && String(row.nonCosmeticImage).trim()) {
      score += 2;
    }
    if (row.postCosmeticImage && String(row.postCosmeticImage).trim()) {
      score += 2;
    }
    if (row.postNonCosmeticImage && String(row.postNonCosmeticImage).trim()) {
      score += 2;
    }
    if (row.image && String(row.image).trim()) {
      score += 1;
    }
    if (row.customData) {
      const hasCustom = Object.values(row.customData).some((value) => {
        return value !== undefined && value !== null && String(value).trim() !== "";
      });
      if (hasCustom) {
        score += 1;
      }
    }
    return score;
  };

  rows.forEach((row) => {
    const key = [row.date, row.testPart, row.checkpoint, row.result].join("|#|");
    const existing = lookup.get(key);

    if (!existing) {
      lookup.set(key, row);
      return;
    }

    if (imageScore(row) > imageScore(existing)) {
      lookup.set(key, row);
    }
  });

  return Array.from(lookup.values());
};

export const buildChamberResultsRows = (load: ChamberLoadData): ChamberResultRow[] => {
  const parts = load.parts ?? [];
  const rows: ChamberResultRow[] = [];
  const defaultDate = formatDateOnly(load.loadedAt ?? null, "N/A");
  const loadUnit = typeof load.testUnit === "string" ? load.testUnit : undefined;
  const { definitions: customColumnDefs, ids: customColumnIds, globalData: globalCustomColumnData } =
    buildCustomColumnRegistry(load);

  const toImageArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => entry.trim());
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return [value.trim()];
    }
    return [];
  };

  const resolvePostImages = (
    entryImages: unknown,
    partImages: unknown,
    partSingleImage: unknown
  ): string[] => {
    const entryList = toImageArray(entryImages);
    if (entryList.length > 0) {
      return entryList;
    }
    const partList = toImageArray(partImages);
    if (partList.length > 0) {
      return partList;
    }
    return toImageArray(partSingleImage);
  };

  const pickLastImage = (images: string[]): string | undefined =>
    images.length > 0 ? images[images.length - 1] : undefined;

  const parseImageList = (value?: string): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim())
        : [];
    } catch (_err) {
      return [];
    }
  };

  const firstCustomImage = (data: Record<string, string>): string | undefined => {
    for (let i = 0; i < customColumnIds.length; i++) {
      const columnId = customColumnIds[i];
      const def = customColumnDefs[i];
      if (!def || def.type !== "image") continue;
      const val = data[columnId];
      const imgs = parseImageList(val);
      if (imgs.length > 0) {
        return imgs[0];
      }
    }
    return undefined;
  };

  parts.forEach((part, partIndex) => {
    const unit = typeof part.testUnit === "string" ? part.testUnit : loadUnit;
    const checkpointData = Array.isArray(part.checkpointData) ? part.checkpointData : [];

    if (checkpointData.length > 0) {
      const sortedData = checkpointData.slice().sort((a, b) => {
        const aIndex = a.checkpointIndex ?? 0;
        const bIndex = b.checkpointIndex ?? 0;
        return aIndex - bIndex;
      });

      sortedData.forEach((entry, entryIndex) => {
        const checkpointIndex = typeof entry.checkpointIndex === "number" ? entry.checkpointIndex : entryIndex;
        const checkpointValue = entry.checkpointValue ?? part.checkpointInfo?.checkpoints?.[checkpointIndex] ?? checkpointIndex;
        const valueText = formatCheckpointValue(checkpointValue, unit, "");
        const displayCheckpoint = entry.label
          ? valueText
            ? `${entry.label} (${valueText})`
            : entry.label
          : valueText || `Checkpoint ${checkpointIndex + 1}`;
        const rowDate = formatDateOnly(
          entry.testDate ?? entry.submittedAt ?? part.loadedAt ?? load.loadedAt ?? null,
          defaultDate,
        );

        const rowCustomData: Record<string, string> = {};
        customColumnIds.forEach((columnId) => {
          const inlineValue = entry.customData?.[columnId] ?? null;
          const fallbackKey = `${partIndex}-${checkpointIndex}-${columnId}`;
          const fallbackValue = inlineValue ?? globalCustomColumnData[fallbackKey] ?? null;
          const normalized = normalizeCustomValue(fallbackValue);
          if (normalized) {
            rowCustomData[columnId] = normalized;
          }
        });

        const inlineCustomImages = firstCustomImage(rowCustomData);
        rows.push({
          date: rowDate,
          testPart: coerceDisplayValue(part.partNumber ?? part.serialNumber ?? "Unknown Part", "Unknown Part"),
          checkpoint: displayCheckpoint,
          image: inlineCustomImages,
          result: formatResultStatus(entry.status ?? null),
          customData: Object.keys(rowCustomData).length > 0 ? rowCustomData : undefined,
          partIndex,
          checkpointIndex,
        });
      });
      return;
    }

    const history = part.checkpointInfo?.checkpointHistory ?? [];
    if (history.length > 0) {
      const sortedHistory = history.slice().sort((a, b) => {
        const aTime = parseDateValue(a.completedAt ?? null)?.getTime() ?? 0;
        const bTime = parseDateValue(b.completedAt ?? null)?.getTime() ?? 0;
        return aTime - bTime;
      });

      sortedHistory.forEach((entry, entryIndex) => {
        const rowDate = formatDateOnly(entry.completedAt ?? part.loadedAt ?? load.loadedAt ?? null, defaultDate);
        const checkpointValue = entry.checkpoint ?? part.checkpointInfo?.checkpoints?.[entryIndex];
        const checkpoint = formatCheckpointValue(checkpointValue, unit);
        const inlineCustomImages = firstCustomImage({});
        const fallbackImage =
          entry.images?.cropped?.[0]
          ?? inlineCustomImages;

        rows.push({
          date: rowDate,
          testPart: coerceDisplayValue(part.partNumber ?? part.serialNumber ?? "Unknown Part", "Unknown Part"),
          checkpoint,
          image: fallbackImage,
          result: formatResultStatus(entry.status ?? null),
          partIndex,
          checkpointIndex: entryIndex,
        });
      });
      return;
    }

    const fallbackCheckpoint = formatCheckpointValue(
      part.checkpointInfo?.checkpoint ?? part.checkpointInfo?.checkpoints?.[0],
      unit,
      "",
    );

    if (fallbackCheckpoint) {
      const fallbackImage = undefined;

      rows.push({
        date: formatDateOnly(part.loadedAt ?? load.loadedAt ?? null, defaultDate),
        testPart: coerceDisplayValue(part.partNumber ?? part.serialNumber ?? "Unknown Part", "Unknown Part"),
        checkpoint: fallbackCheckpoint,
        image: fallbackImage,
        result: (() => {
          const statusSource = part.scanStatus ?? load.status ?? null;
          const normalized = statusSource === null || statusSource === undefined ? null : String(statusSource);
          return formatResultStatus(normalized);
        })(),
        partIndex,
        checkpointIndex: 0,
      });
    }
  });

  return rows.length > 0 ? dedupeResultRows(rows) : [];
};

export const buildChamberReportSections = (
  load: ChamberLoadData
): {
  hydrated: ChamberLoadData;
  summary: ChamberLoadSummaryItem[];
  resultsHeader: ChamberResultHeader;
  resultsRows: ChamberResultRow[];
} => {
  const hydrated = hydrateChamberLoadData(load);

  return {
    hydrated,
    summary: buildChamberLoadSummary(hydrated),
    resultsHeader: buildChamberResultsHeader(hydrated),
    resultsRows: buildChamberResultsRows(hydrated)
  };
};

type SupportedImageExtension = "png" | "jpeg";

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9+./-]+);base64,(.+)$/i;

const resolveImageRequestUrl = (imageSrc: string): string => {
  if (!imageSrc) {
    return imageSrc;
  }

  if (/^(?:https?:\/\/|data:|blob:)/i.test(imageSrc)) {
    return imageSrc;
  }

  const trimmedSrc = imageSrc.trim();

  if (/^\/?uploads\//i.test(trimmedSrc)) {
    try {
      const baseUrl = getBackendApiUrl();
      if (!baseUrl) {
        return trimmedSrc;
      }

      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(trimmedSrc.replace(/^\//, ""), normalizedBase).toString();
    } catch (_error) {
      return trimmedSrc;
    }
  }

  if (trimmedSrc.startsWith("//")) {
    const protocol = typeof window !== "undefined" && window.location ? window.location.protocol : "https:";
    return `${protocol}${trimmedSrc}`;
  }

  if (typeof window !== "undefined" && window.location) {
    try {
      return new URL(trimmedSrc, window.location.origin).toString();
    } catch (_error) {
      return trimmedSrc;
    }
  }

  return trimmedSrc;
};

const loadImageAsBase64 = async (imageSrc: string): Promise<{ base64: string; mime: string } | null> => {
  if (!imageSrc) {
    return null;
  }

  if (imageSrc.startsWith("blob:")) {
    return null;
  }

  const dataUrlMatch = DATA_URL_REGEX.exec(imageSrc);
  if (dataUrlMatch) {
    return { mime: dataUrlMatch[1], base64: dataUrlMatch[2] };
  }

  try {
    const fetchUrl = resolveImageRequestUrl(imageSrc);

    const fetchWithFallback = async (): Promise<Response | null> => {
      const attempt = async (init?: RequestInit): Promise<Response | null> => {
        try {
          const response = await fetch(fetchUrl, init);
          if (!response.ok) {
            console.warn("Failed to fetch image", fetchUrl, response.status);
            return null;
          }
          return response;
        } catch (error) {
          console.warn("Image fetch request errored", fetchUrl, error);
          return null;
        }
      };

      const credentialed = await attempt({ credentials: "include" });
      if (credentialed) {
        return credentialed;
      }

      return attempt();
    };

    const response = await fetchWithFallback();
    if (!response) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const match = DATA_URL_REGEX.exec(result);
          if (match) {
            resolve({ mime: match[1], base64: match[2] });
            return;
          }
          const commaIndex = result.indexOf(",");
          if (commaIndex !== -1) {
            resolve({ mime: blob.type || "image/png", base64: result.slice(commaIndex + 1) });
            return;
          }
        }
        resolve({ mime: blob.type || "image/png", base64: "" });
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load image", error);
    return null;
  }
};

const normalizeImageExtension = (mime?: string): SupportedImageExtension => {
  if (!mime) {
    return "png";
  }

  const match = /^image\/([a-z0-9+.-]+)/i.exec(mime);
  const subtype = match?.[1]?.toLowerCase() ?? "png";

  if (subtype === "jpg") {
    return "jpeg";
  }

  if (subtype === "jpeg" || subtype === "png") {
    return subtype as SupportedImageExtension;
  }

  return "png";
};

const resolveImageForWorksheet = async (
  imageSrc: string
): Promise<{ base64: string; extension: SupportedImageExtension } | null> => {
  const result = await loadImageAsBase64(imageSrc);
  if (!result || !result.base64) {
    return null;
  }

  return {
    base64: result.base64,
    extension: normalizeImageExtension(result.mime)
  };
};

const convertImageToBase64 = async (imageSrc: string): Promise<string | null> => {
  const result = await loadImageAsBase64(imageSrc);
  return result?.base64 ?? null;
};

const sanitizeFilenameSegment = (value: string | number | undefined, fallback: string): string => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const str = String(value).trim();
  if (!str) {
    return fallback;
  }

  return str.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
};

const buildFilename = (options: ChamberLoadReportDownloadOptions, load: ChamberLoadData): string => {
  if (options.filename) {
    return options.filename;
  }

  const ticket = sanitizeFilenameSegment(options.ticketCode ?? load.machineDetails?.ticketCode, "Chamber");
  const reportNumber = sanitizeFilenameSegment(options.reportNumber ?? load.id ?? "001", "001");

  const dateSource = options.reportDate ?? load.loadedAt ?? new Date().toISOString();
  const date = (() => {
    if (!dateSource) return new Date();
    const parsed = new Date(dateSource);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const dateSegment = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  return `${ticket}_Report-${reportNumber}_${dateSegment}.xlsx`;
};

const sanitizeSheetFragment = (value: string, fallback: string): string => {
  const cleaned = value.replace(/[\\\/\?\*\[\]:]/g, "").trim();
  return cleaned || fallback;
};

const buildSheetName = (base: string, suffix: string, fallback = "Test"): string => {
  const sanitizedBase = sanitizeSheetFragment(base, fallback);
  const sanitizedSuffix = sanitizeSheetFragment(suffix, "");

  const MAX_LENGTH = 31;
  const separator = sanitizedSuffix ? " " : "";
  let combined = `${sanitizedBase}${separator}${sanitizedSuffix}`.trim();

  if (!combined) {
    combined = fallback;
  }

  if (combined.length > MAX_LENGTH) {
    if (sanitizedSuffix && sanitizedSuffix.length < MAX_LENGTH) {
      const baseLimit = Math.max(0, MAX_LENGTH - sanitizedSuffix.length - 1);
      const truncatedBase = sanitizedBase.slice(0, baseLimit).trim();
      combined = `${truncatedBase}${truncatedBase ? " " : ""}${sanitizedSuffix}`.trim();
    }
    combined = combined.slice(0, MAX_LENGTH).trim();
  }

  return combined || fallback.slice(0, MAX_LENGTH);
};

export const downloadChamberLoadReport = async (
  load?: ChamberLoadData,
  options: ChamberLoadReportDownloadOptions = {}
): Promise<void> => {
  console.log(load)
  const hydrated = hydrateChamberLoadData(load ?? {});

  // MODIFIED: Check based on machineEquipment2 field instead of testName
  const isUTMReport = (() => {
    // Check in the root level
    const rootEquipment2 = (hydrated as any)?.machineEquipment2;
    if (typeof rootEquipment2 === 'string' && rootEquipment2.toLowerCase() === 'utm') {
      return true;
    }

    // Check in machineDetails
    const machineDetails = hydrated?.machineDetails ?? {};
    const machineDetailsEquipment2 = machineDetails?.selectedTest?.machineEquipment2;
    if (typeof machineDetailsEquipment2 === 'string' && machineDetailsEquipment2.toLowerCase() === 'utm') {
      return true;
    }

    // Check in machineDetails.originalTest
    const originalTestEquipment2 = machineDetails?.selectedTest?.originalTest?.machineEquipment2;
    if (typeof originalTestEquipment2 === 'string' && originalTestEquipment2.toLowerCase() === 'utm') {
      return true;
    }

    // Check in tests array
    if (Array.isArray(machineDetails?.tests)) {
      const hasUTMTest = machineDetails.tests.some((test: any) =>
        typeof test?.machineEquipment2 === 'string' && test.machineEquipment2.toLowerCase() === 'utm'
      );
      if (hasUTMTest) {
        return true;
      }
    }

    // Check in parts
    const parts = hydrated?.parts ?? [];
    if (parts.length > 0) {
      const primaryPart = parts[0];
      const partEquipment2 = (primaryPart as any)?.machineEquipment2;
      if (typeof partEquipment2 === 'string' && partEquipment2.toLowerCase() === 'utm') {
        return true;
      }
    }

    return false;
  })();

  if (isUTMReport) {
    const utmReportData = transformChamberDataToUTMReport(hydrated);
    await downloadUTMReport(utmReportData);
    return;
  }
  
  const summaryRows = buildChamberLoadSummary(hydrated);
  const resultsHeader: ChamberResultHeader = {
    testName: "",
    ers: "",
    machine: "",
    failureCriteria: "",
    testCondition: "",
    project: "",
    ...buildChamberResultsHeader(hydrated),
    ...options.resultsHeader
  };
  const baseSheetName = resultsHeader.testName || "Test";
  const resolvedResults = options.resultsRows
    ? dedupeResultRows(options.resultsRows ?? [])
    : buildChamberResultsRows(hydrated);
  const resultsRows = resolvedResults.map((row) => ({ ...row }));

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Chamber Load Report";
    workbook.created = new Date();

    const summarySheetName = buildSheetName("Summary", "", "Summary");
    let resultsSheetName = buildSheetName(baseSheetName, "", "Test");
    if (resultsSheetName === summarySheetName) {
      resultsSheetName = buildSheetName(baseSheetName, "Results", "Test");
      if (resultsSheetName === summarySheetName) {
        resultsSheetName = buildSheetName(summarySheetName, "Sheet", "Sheet");
      }
    }

    const summarySheet = workbook.addWorksheet(summarySheetName);
    summarySheet.columns = [
      { header: "Field", key: "label", width: 33 },
      { header: "Details", key: "hint", width: 33 },
      { header: "Value", key: "value", width: 33 }
    ];
    summarySheet.getRow(1).height = 30;
    summarySheet.getRow(1).values = [null, "GENERAL TEST INFO", null];
    summarySheet.mergeCells("B1:C1");
    summarySheet.getCell("B1").alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.getCell("B1").font = { bold: true, size: 14 };
    summarySheet.getCell("A1").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
    summarySheet.getCell("B1").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
    summarySheet.getCell("C1").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };

    const columnHeaderRow = summarySheet.getRow(2);
    columnHeaderRow.values = ["Field", "Details", "Value"];
    columnHeaderRow.height = 30;
    columnHeaderRow.font = { bold: true };
    columnHeaderRow.alignment = { horizontal: "center" };
    columnHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    const logoBase64 = await convertImageToBase64(Logo);
    if (logoBase64) {
      const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
      summarySheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 30 }
      });
    }

    const startRow = 3;

    summaryRows.forEach((item, index) => {
      const row = summarySheet.getRow(startRow + index);
      row.values = [item.label, item.hint, item.value];
      row.height = 30;
      row.alignment = { vertical: "middle" };
      const labelCell = row.getCell(1);
      labelCell.font = { ...labelCell.font, bold: true };
    });

    summarySheet.eachRow((row, rowIndex) => {
      if (rowIndex <= 2) {
        return;
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    const resultsSheet = workbook.addWorksheet(resultsSheetName);
    resultsSheet.addRow(["Test Name", resultsHeader.testName, "ERS", resultsHeader.ers]);
    resultsSheet.addRow(["Machine", resultsHeader.machine, "Failure Criteria", resultsHeader.failureCriteria]);
    resultsSheet.addRow(["Condition", resultsHeader.testCondition, "Project", resultsHeader.project]);
    resultsSheet.addRow([]);

    const { definitions: customColumnDefs, ids: customColumnIds, globalData: registryGlobalData } =
      buildCustomColumnRegistry(hydrated);
    const customColumnLabels = customColumnDefs.map((column, index) => {
      if (!column) {
        return `Custom ${index + 1}`;
      }
      const labelCandidate = typeof column.label === "string" && column.label.trim()
        ? column.label.trim()
        : undefined;
      const nameCandidate = typeof column.name === "string" && column.name.trim()
        ? column.name.trim()
        : undefined;
      return labelCandidate ?? nameCandidate ?? buildFriendlyColumnLabelFromId(column.id, index);
    });
    const baseHeader = [
      "Date",
      "Test Part",
      "Checkpoint (hrs)"
    ];
    const headerRow = resultsSheet.addRow([...baseHeader, ...customColumnLabels, "Status"]);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };
    const headerRowIndex = headerRow.number;

    customColumnLabels.forEach((_label, index) => {
      const column = resultsSheet.getColumn(baseHeader.length + index + 1);
      if (!column.width || column.width < 18) {
        column.width = 22;
      }
    });

    const normalizedGlobalCustomData: Record<string, string> = registryGlobalData;

    const buildT0CustomData = (part: ChamberLoadPart, partIndex: number): Record<string, string> => {
      const customData: Record<string, string> = {};
      const images = Array.isArray(part.customImages) ? part.customImages : [];
      customColumnIds.forEach((columnId, idx) => {
        const def = customColumnDefs[idx];
        if (!def || def.type !== "image") return;
        const labelMatch = images
          .filter((img) => {
            const lbl = (img as any)?.label ? String((img as any).label).trim().toLowerCase() : "";
            const normalizedId = (columnId || "").toLowerCase();
            const normalizedName = (def.name || def.label || "").toString().trim().toLowerCase();
            return lbl === normalizedId || lbl === normalizedName;
          })
          .map((img) => (img as any)?.path)
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
        const fallbackKey = `${partIndex}-0-${columnId}`;
        const fallbackVal = normalizedGlobalCustomData[fallbackKey];
        const combined = labelMatch.length > 0 ? labelMatch : toImageArray(fallbackVal);
        if (combined.length > 0) {
          customData[columnId] = JSON.stringify(combined);
        }
      });
      return customData;
    };

    // Helper function from second file for building synthetic rows
    const buildSyntheticRow = (
      part: ChamberLoadPart,
      partIndex: number,
      label: string,
      checkpointValue: unknown,
      customValues: string[],
      statusValue: unknown
    ) => {
      const displayValues = customValues.map((val, idx) => {
        const def = customColumnDefs[idx];
        return def && def.type === "image" ? "" : val;
      });
      const resolvedCheckpoint = (() => {
        const raw = checkpointValue;
        const text = raw === undefined || raw === null ? "" : String(raw).trim();
        if (text) {
          return label ? `${label} (${text})` : text;
        }
        return label || "T0";
      })();
      const row = resultsSheet.addRow([
        formatDateOnly(part.loadedAt ?? hydrated.loadedAt ?? null, "N/A"),
        part.partNumber ?? part.serialNumber ?? "Unknown Part",
        resolvedCheckpoint,
        ...displayValues,
        statusValue ?? ""
      ]);
      displayValues.forEach((_value, customIndex) => {
        const cell = row.getCell(baseHeader.length + customIndex + 1);
        cell.alignment = { vertical: "middle" };
      });
      customColumnDefs.forEach((def, customIndex) => {
        if (!def || def.type !== "image") {
          return;
        }
        const raw = customValues[customIndex];
        const parsed = (() => {
          try {
            return JSON.parse(raw);
          } catch (_err) {
            return raw;
          }
        })();
        const images = toImageArray(parsed);
        const zeroIndex = baseHeader.length + customIndex;
        const cellIndex = baseHeader.length + customIndex + 1;
        enqueueImagesForRow(row, images, zeroIndex, cellIndex);
      });
    };

    // For each part, show all checkpoint entries and all images
    const imageTasks: Promise<void>[] = [];

    const toImageArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .map((entry) => entry.trim());
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
              .map((entry) => entry.trim());
          }
        } catch (_err) {
          // not JSON; fall through
        }
        return [trimmed];
      }
      return [];
    };

    const enqueueImagesForRow = (
      row: ExcelJS.Row,
      images: unknown,
      columnZeroIndex: number,
      cellIndex: number
    ): void => {
      const normalizedImages = toImageArray(images);
      if (normalizedImages.length === 0) {
        return;
      }

      normalizedImages.forEach((imgPath) => {
        if (typeof imgPath !== "string" || imgPath.startsWith("blob:")) {
          return; // avoid rendering raw blob URL text
        }

        imageTasks.push((async () => {
          const imageData = await resolveImageForWorksheet(imgPath);
          if (imageData) {
            const imageId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
            resultsSheet.addImage(imageId, {
              tl: { col: columnZeroIndex, row: row.number - 1 },
              ext: { width: 90, height: 90 }
            });
            row.height = 90;
            row.getCell(cellIndex).alignment = { horizontal: "center", vertical: "middle" };
          }
        })());
      });
    };

    hydrated.parts?.forEach((part, partIndex) => {
      // Use checkpointData if available, else fallback to checkpointHistory
      // Merge both approaches: first file's hasT0 check with second file's hasT0Label check
      const checkpointsBase = part.checkpointData ?? part.checkpointInfo?.checkpointHistory ?? [];
      let checkpoints = Array.isArray(checkpointsBase) ? checkpointsBase.slice() : [];
      const t0CustomData = buildT0CustomData(part, partIndex);

      // Check for T0 using both methods from both files
      const hasT0Label = checkpoints.some((e) => (e.label ?? "").toLowerCase().includes("t0"));
      const t0Value = Array.isArray(part.checkpointInfo?.checkpoints)
        ? part.checkpointInfo.checkpoints[0]
        : part.checkpointInfo?.checkpoint ?? part.checkpointInfo?.currentCheckpoint ?? "T0";
      const hasT0 = checkpoints.some((e) => (e.checkpointValue ?? e.checkpoint) === t0Value || (e.label ?? "").toLowerCase().includes("t0"));

      // Always prepend a synthetic T0 when missing so it stays at the top
      const needsSyntheticT0 = !hasT0 && !hasT0Label && checkpoints.length > 0;
      if (needsSyntheticT0) {
        const syntheticT0CustomData = buildT0CustomData(part, partIndex);
        const syntheticT0Entry = {
          label: "T0",
          checkpointIndex: 0,
          checkpointValue: t0Value,
          testDate: part.loadedAt ?? hydrated.loadedAt ?? null,
          customData: Object.keys(syntheticT0CustomData).length > 0 ? syntheticT0CustomData : undefined,
          status: (() => {
            const statusSource = part.scanStatus ?? hydrated.status ?? null;
            if (statusSource === null || statusSource === undefined) {
              return null;
            }
            return String(statusSource);
          })()
        };
        checkpoints = [syntheticT0Entry, ...checkpoints];
      }

      if (Array.isArray(checkpoints) && checkpoints.length > 0) {
        let addedT0Row = false;
        let addedAnyRow = false;

        checkpoints.forEach((entry, entryIndex) => {
          const checkpointLabel = entry.label ?? "";
          const checkpointValue = entry.checkpointValue ?? entry.checkpoint ?? "";
          const checkpointIndex = typeof entry.checkpointIndex === "number" ? entry.checkpointIndex : entryIndex;
          if (
            (checkpointLabel ?? "").toString().toLowerCase().includes("t0") ||
            checkpointIndex === 0
          ) {
            addedT0Row = true;
          }
          const rawCustomValues = customColumnIds.map((columnId, customIndex) => {
            const inlineValue = (entry as any)?.customData?.[columnId] ?? null;
            const fallbackKey = `${partIndex}-${checkpointIndex}-${columnId}`;
            const t0Fallback = checkpointIndex === 0 ? t0CustomData[columnId] ?? null : null;
            const fallbackValue = inlineValue ?? t0Fallback ?? normalizedGlobalCustomData[fallbackKey] ?? null;
            const normalized = normalizeCustomValue(fallbackValue);
            return normalized ?? "";
          });
          const displayCustomValues = rawCustomValues.map((val, idx) => {
            const def = customColumnDefs[idx];
            return def && def.type === "image" ? "" : val;
          });
          const row = resultsSheet.addRow([
            formatDateOnly(entry.testDate ?? entry.completedAt ?? part.loadedAt ?? hydrated.loadedAt ?? null, "N/A"),
            part.partNumber ?? part.serialNumber ?? "Unknown Part",
            checkpointLabel ? `${checkpointLabel} (${checkpointValue})` : checkpointValue,
            ...displayCustomValues,
            formatResultStatus(entry.status ?? null)
          ]);
          addedAnyRow = true;
          displayCustomValues.forEach((_value, customIndex) => {
            const cell = row.getCell(baseHeader.length + customIndex + 1);
            cell.alignment = { vertical: "middle" };
          });
          customColumnDefs.forEach((def, customIndex) => {
            if (!def || def.type !== "image") {
              return;
            }
            const raw = rawCustomValues[customIndex];
            const parsed = (() => {
              try {
                return JSON.parse(raw);
              } catch (_err) {
                return raw;
              }
            })();
            const images = toImageArray(parsed);
            const zeroIndex = baseHeader.length + customIndex;
            const cellIndex = baseHeader.length + customIndex + 1;
            enqueueImagesForRow(row, images, zeroIndex, cellIndex);
          });
        });
      } else {
        // If no checkpointData or checkpointHistory, use the second file's approach with T0 and Final rows
        // T0 row
        const t0CustomData = buildT0CustomData(part, partIndex);
        const t0RawValues = customColumnIds.map((columnId) => {
          const inlineVal = t0CustomData[columnId];
          const fallbackKey = `${partIndex}-0-${columnId}`;
          const fallbackVal = normalizedGlobalCustomData[fallbackKey];
          const selected = inlineVal ?? fallbackVal ?? "";
          return selected.toString().trim();
        });
        buildSyntheticRow(part, partIndex, "T0", part.checkpointInfo?.checkpoints?.[0] ?? part.checkpointInfo?.checkpoint ?? "T0", t0RawValues, part.scanStatus ?? hydrated.status ?? "");

        // Final row (last checkpoint) - from second file
        const checkpointList = Array.isArray(part.checkpointInfo?.checkpoints) ? part.checkpointInfo?.checkpoints : [];
        const lastIndex = checkpointList && checkpointList.length > 0 ? checkpointList.length - 1 : 0;
        const finalLabel = checkpointList && checkpointList.length > 1 ? "Final" : "";
        const finalValue = checkpointList && checkpointList.length > 0 ? checkpointList[lastIndex] : part.checkpointInfo?.checkpoint ?? "";
        const finalRawValues = customColumnIds.map((columnId) => {
          const fallbackKey = `${partIndex}-${lastIndex}-${columnId}`;
          const fallbackVal = normalizedGlobalCustomData[fallbackKey];
          const selected = fallbackVal ?? "";
          return selected.toString().trim();
        });
        buildSyntheticRow(part, partIndex, finalLabel, finalValue, finalRawValues, part.scanStatus ?? hydrated.status ?? "");
      }
    });

    await Promise.all(imageTasks);

    const baseColumnConfigs: Array<{ key: string; width: number }> = [
      { key: "date", width: 14 },
      { key: "testPart", width: 20 },
      { key: "checkpoint", width: 18 }
    ];
    baseColumnConfigs.forEach((config, index) => {
      const column = resultsSheet.getColumn(index + 1);
      column.key = config.key;
      column.width = config.width;
    });

    resultsSheet.eachRow((row, rowIndex) => {
      if (rowIndex < headerRowIndex && row.cellCount > 0) {
        [1, 3].forEach((cellIndex) => {
          const cell = row.getCell(cellIndex);
          cell.font = { ...cell.font, bold: true };
        });
        [2, 4].forEach((cellIndex) => {
          const cell = row.getCell(cellIndex);
          cell.font = { ...cell.font, bold: false };
        });
      } else if (rowIndex === headerRowIndex) {
        row.eachCell((cell) => {
          cell.font = { ...cell.font, bold: true };
        });
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
        const currentAlignment = cell.alignment ?? {};
        cell.alignment = {
          ...currentAlignment,
          vertical: "middle",
          ...(rowIndex > headerRowIndex ? { horizontal: "center" } : {})
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = buildFilename(options, hydrated);
    saveAs(new Blob([buffer]), filename);
  } catch (error) {
    console.error("Unable to download report", error);
    throw error;
  }
};

export const downloadMultipleChamberLoadReports = async (
  loads: ChamberLoadData[],
  options: ChamberLoadReportDownloadOptions = {}
): Promise<void> => {
  if (!loads || loads.length === 0) return;
  if (loads.length === 1) return downloadChamberLoadReport(loads[0], options);

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Chamber Load Report";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("Summary");
    let summaryCurrentRow = 1;

    const imageTasks: Promise<void>[] = [];
    const logoBase64 = await convertImageToBase64(Logo);

    const allowedSummaryLabels = [
      "Ticket Code / Document No",
      "Project Name",
      "Build",
      "Colour",
      "Test Location",
      "Sample Quantity",
      "Requires Reload",
      "Requires Unload",
      "Test Completed"
    ];

    // --- Add to Single Summary Sheet (Once) ---
    if (loads.length > 0) {
      const firstHydrated = hydrateChamberLoadData(loads[0]);
      const allSummaryRows = buildChamberLoadSummary(firstHydrated);
      const filteredSummary = allSummaryRows.filter(row => allowedSummaryLabels.includes(row.label));

      summarySheet.getRow(summaryCurrentRow).height = 35;
      summarySheet.getCell(summaryCurrentRow, 2).value = "GENERAL TEST INFO";
      summarySheet.mergeCells(summaryCurrentRow, 2, summaryCurrentRow, 3);
      summarySheet.getCell(summaryCurrentRow, 2).font = { bold: true, size: 14 };
      summarySheet.getCell(summaryCurrentRow, 2).alignment = { horizontal: "center", vertical: "middle" };

      if (logoBase64) {
        const logoId = workbook.addImage({ base64: logoBase64, extension: "png" });
        summarySheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 30 }
        });
      }
      summaryCurrentRow++;

      const infoColHeader = summarySheet.getRow(summaryCurrentRow);
      infoColHeader.values = ["Field", "Details", "Value"];
      infoColHeader.font = { bold: true };
      infoColHeader.height = 30;
      infoColHeader.eachCell(c => {
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      summaryCurrentRow++;

      filteredSummary.forEach((item) => {
        const r = summarySheet.getRow(summaryCurrentRow);
        r.values = [item.label, item.hint, item.value];
        r.getCell(1).font = { bold: true };
        r.height = 30;
        r.alignment = { vertical: "middle" };
        r.eachCell(c => {
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
        summaryCurrentRow++;
      });

      summarySheet.getColumn(1).width = 30;
      summarySheet.getColumn(2).width = 30;
      summarySheet.getColumn(3).width = 40;
    }

    const usedSheetNames = new Map<string, number>();

    for (let i = 0; i < loads.length; i++) {
      const load = loads[i];
      const hydrated = hydrateChamberLoadData(load);
      const resHeader = buildChamberResultsHeader(hydrated);
      const resRows = buildChamberResultsRows(hydrated);

      // Clean test name: remove trailing duration (e.g. " 432h") and sanitize for Excel
      let cleanName = resHeader.testName
        .replace(/\s+\d+h$/i, "")
        .replace(/[\/\\\?\*\[\]]/g, "_")
        .trim();

      let resultSheetName = cleanName.substring(0, 31);

      // Ensure unique sheet names
      if (usedSheetNames.has(resultSheetName)) {
        const count = usedSheetNames.get(resultSheetName)! + 1;
        usedSheetNames.set(resultSheetName, count);
        resultSheetName = `${resultSheetName.substring(0, 27)} (${count})`;
      } else {
        usedSheetNames.set(resultSheetName, 1);
      }

      const resultsSheet = workbook.addWorksheet(resultSheetName);

      resultsSheet.getRow(1).values = ["Test Name", resHeader.testName, "ERS", resHeader.ers];
      resultsSheet.getRow(2).values = ["Machine", resHeader.machine, "Failure Criteria", resHeader.failureCriteria];
      resultsSheet.getRow(3).values = ["Condition", resHeader.testCondition, "Project", resHeader.project];

      for (let rOffset = 1; rOffset <= 3; rOffset++) {
        const r = resultsSheet.getRow(rOffset);
        r.height = 30;
        r.alignment = { vertical: "middle" };
        [1, 3].forEach(cIdx => r.getCell(cIdx).font = { bold: true });
        r.eachCell(c => {
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      }

      const { definitions: consolidatedCustomDefs, ids: consolidatedCustomIds } = buildCustomColumnRegistry(hydrated);
      const consolidatedCustomLabels = consolidatedCustomDefs.map((def, idx) => {
        if (!def) return `Custom ${idx + 1}`;
        const label = (def.label ?? def.name ?? def.id ?? "").toString().trim();
        return label || `Custom ${idx + 1}`;
      });

      const tableHeader = resultsSheet.getRow(5);
      tableHeader.values = [
        "Date",
        "Test Part",
        "Checkpoint",
        ...consolidatedCustomLabels,
        "Status"
      ];
      tableHeader.font = { bold: true };
      tableHeader.height = 30;
      tableHeader.alignment = { horizontal: "center", vertical: "middle" };
      tableHeader.eachCell(c => {
        c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      const toImageArray = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return value
            .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
            .map((entry) => entry.trim());
        }
        if (typeof value === "string" && value.trim().length > 0) {
          return [value.trim()];
        }
        return [];
      };

      resRows.forEach((entry, idx) => {
        const r = resultsSheet.getRow(6 + idx);
        const rawCustomValues = consolidatedCustomIds.map((colId) => (entry.customData?.[colId] ?? "").toString().trim());
        const displayCustomValues = rawCustomValues.map((val, idx) => {
          const def = consolidatedCustomDefs[idx];
          return def && def.type === "image" ? "" : val;
        });

        r.values = [
          entry.date,
          entry.testPart,
          entry.checkpoint,
          ...displayCustomValues,
          entry.result
        ];
        r.height = 90;
        r.alignment = { vertical: "middle", horizontal: "center" };

        const queueImage = (imageSrc: string | undefined, colIdx: number) => {
          if (!imageSrc || imageSrc.startsWith("blob:")) return;
          imageTasks.push((async () => {
            const imageData = await resolveImageForWorksheet(imageSrc);
            if (!imageData) return;
            const imgId = workbook.addImage({ base64: imageData.base64, extension: imageData.extension });
            resultsSheet.addImage(imgId, {
              tl: { col: colIdx - 1, row: r.number - 1 },
              ext: { width: 90, height: 90 }
            });
          })());
        };

        rawCustomValues.forEach((val, customIndex) => {
          const def = consolidatedCustomDefs[customIndex];
          if (!def || def.type !== "image") return;
          const parsed = (() => {
            try {
              return JSON.parse(val);
            } catch (_err) {
              return val;
            }
          })();
          const images = toImageArray(parsed);
          images.forEach((src) => queueImage(src, 4 + customIndex));
        });

        r.eachCell(c => {
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      });

      resultsSheet.getColumn(1).width = 20;
      resultsSheet.getColumn(2).width = 30;
      resultsSheet.getColumn(3).width = 18;
      consolidatedCustomLabels.forEach((_label, idx) => {
        const column = resultsSheet.getColumn(4 + idx);
        if (!column.width || column.width < 22) {
          column.width = 22;
        }
      });
      const statusCol = resultsSheet.getColumn(4 + consolidatedCustomLabels.length);
      if (!statusCol.width || statusCol.width < 14) {
        statusCol.width = 14;
      }
    }

    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 30;
    summarySheet.getColumn(3).width = 40;

    await Promise.all(imageTasks);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Consolidated_Test_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  } catch (error) {
    console.error("Unable to download multiple reports", error);
    throw error;
  }
};
