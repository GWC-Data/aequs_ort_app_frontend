
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChamberData,
  Part,
  CustomColumn,
  PartCheckpointStatus,
  CustomColumnData,
  CheckpointLabels,
  CheckpointSubmission,
  CheckpointSubmissions,
} from "./types";
import {
  formatDate,
  getCheckpointsForPart,
  getCheckpointLabel,
} from "./utils/helpers";
import MachineDetails from "./components/MachineDetails";
import PartDetails from "./components/PartDetails";
import CheckpointProgress from "./components/CheckpointProgress";
import PartCheckpointTable from "./components/PartCheckpointTable";
import ScanVerificationModal from "./components/ScanVerificationModal";
import UnloadScanVerification from "./components/UnloadScanVerification";
import UnloadDataEntry from "./components/UnloadDataEntry";
import UnloadWithUTM from "./unloadingutm";
import {
  fetchTestingParts,
  fetchTestingPartById,
  getBackendApiUrl,
} from "@/lib/backendApi";
import { updateTestingPartInBackend } from "@/helpers/api/testingPage";
import { useToast } from "@/components/ui/use-toast";

// AddColumnModal Component
interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (columnData: { name: string; type: string; options: string[] }) => void;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState('');
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!columnName.trim()) {
      toast({
        title: "❌ Missing Name",
        description: "Please enter a column name",
        variant: "destructive",
      });
      return;
    }

    if (!columnType) {
      toast({
        title: "❌ Missing Type",
        description: "Please select a column type",
        variant: "destructive",
      });
      return;
    }

    if (columnType === 'dropdown' && !dropdownOptions.trim()) {
      toast({
        title: "❌ Missing Options",
        description: "Please enter dropdown options",
        variant: "destructive",
      });
      return;
    }

    const options = columnType === 'dropdown'
      ? dropdownOptions.split(',').map(opt => opt.trim()).filter(opt => opt)
      : [];

    onAdd({
      name: columnName.trim(),
      type: columnType,
      options
    });

    // Reset form
    setColumnName('');
    setColumnType('');
    setDropdownOptions('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Add Custom Column</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Name
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter column name"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Type
          </label>
          <select
            value={columnType}
            onChange={(e) => setColumnType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Select type</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="image">Image</option>
          </select>
        </div>

        {columnType === 'dropdown' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dropdown Options
            </label>
            <input
              type="text"
              value={dropdownOptions}
              onChange={(e) => setDropdownOptions(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Option1, Option2, Option3"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter options separated by commas
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
};

type ExtendedChamberData = ChamberData & {
  customColumns?: CustomColumn[];
  customColumnData?: CustomColumnData;
};

const LEGACY_COLUMN_ID_PATTERN = /^custom-/i;

const claimUniqueColumnId = (
  preferred: string,
  usedIds: Set<string>,
  fallbackLabel: string,
): string => {
  const trimmedPreferred = preferred.trim();
  const baseLabel =
    trimmedPreferred.length > 0 ? trimmedPreferred : fallbackLabel;
  if (!usedIds.has(baseLabel)) {
    usedIds.add(baseLabel);
    return baseLabel;
  }

  let suffix = 2;
  let candidate = `${baseLabel} (${suffix})`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseLabel} (${suffix})`;
  }
  usedIds.add(candidate);
  return candidate;
};

const generateUniqueColumnId = (
  preferredName: string,
  existingColumns: Iterable<string>,
  fallbackLabel: string,
): string => {
  const usedIds = new Set<string>();
  for (const rawId of existingColumns) {
    const trimmedId = typeof rawId === "string" ? rawId.trim() : "";
    if (trimmedId.length > 0) {
      usedIds.add(trimmedId);
    }
  }
  return claimUniqueColumnId(preferredName, usedIds, fallbackLabel);
};

const remapInlineCustomData = (
  data: Record<string, any> | undefined,
  idMap: Record<string, string>,
): Record<string, any> | undefined => {
  if (!data || Object.keys(idMap).length === 0) {
    return data;
  }

  let mutated = false;
  const remappedEntries = Object.entries(data).map(([key, value]) => {
    const mappedKey = idMap[key] ?? key;
    if (mappedKey !== key) {
      mutated = true;
    }
    return [mappedKey, value];
  });

  if (!mutated) {
    return data;
  }

  const remapped: Record<string, any> = {};
  remappedEntries.forEach(([key, value]) => {
    if (!(key in remapped)) {
      remapped[key] = value;
    }
  });
  return remapped;
};

const remapRowValueMap = (data: any, idMap: Record<string, string>): any => {
  if (!data || typeof data !== "object" || Object.keys(idMap).length === 0) {
    return data;
  }

  let mutated = false;
  const remappedRows = Object.entries(data as Record<string, any>).map(
    ([rowKey, rowValue]) => {
      if (!rowValue || typeof rowValue !== "object") {
        return [rowKey, rowValue];
      }
      const remappedRow = remapInlineCustomData(
        rowValue as Record<string, any>,
        idMap,
      );
      if (remappedRow !== rowValue) {
        mutated = true;
        return [rowKey, remappedRow];
      }
      return [rowKey, rowValue];
    },
  );

  if (!mutated) {
    return data;
  }

  const remapped: Record<string, any> = {};
  remappedRows.forEach(([rowKey, rowValue]) => {
    remapped[rowKey as string] = rowValue;
  });
  return remapped;
};

const remapCompositeColumnData = (
  data: CustomColumnData,
  idMap: Record<string, string>,
): CustomColumnData => {
  if (!data || Object.keys(idMap).length === 0) {
    return data;
  }

  let mutated = false;
  const remapped: CustomColumnData = {};

  Object.entries(data).forEach(([key, value]) => {
    const match = key.match(/^(\d+)-(\d+)-(.+)$/);
    if (match) {
      const mappedId = idMap[match[3]] ?? match[3];
      const remappedKey = `${match[1]}-${match[2]}-${mappedId}`;
      if (remappedKey !== key) {
        mutated = true;
      }
      remapped[remappedKey] = value;
      return;
    }

    const mappedKey = idMap[key] ?? key;
    if (mappedKey !== key) {
      mutated = true;
    }
    remapped[mappedKey] = value;
  });

  return mutated ? remapped : data;
};

const IMAGE_LABEL_SORT_ORDER = [
  "FRONT",
  "BACK",
  "E2",
  "E4",
  "E6",
  "E8",
  "COSMETIC_IMAGE",
  "NON_COSMETIC_IMAGE",
];

const sortCustomColumns = (columns: CustomColumn[]): CustomColumn[] => {
  const nonImageCols = columns.filter((c) => c.type !== "image");
  const imageCols = columns.filter((c) => c.type === "image");
  imageCols.sort((a, b) => {
    const ai = IMAGE_LABEL_SORT_ORDER.indexOf(
      (a.name || a.id || "").toUpperCase(),
    );
    const bi = IMAGE_LABEL_SORT_ORDER.indexOf(
      (b.name || b.id || "").toUpperCase(),
    );
    const aIdx = ai === -1 ? IMAGE_LABEL_SORT_ORDER.length : ai;
    const bIdx = bi === -1 ? IMAGE_LABEL_SORT_ORDER.length : bi;
    return aIdx - bIdx;
  });
  return [...nonImageCols, ...imageCols];
};

const addCustomImageColumnsFromParts = (
  parts: Part[],
  existingColumns: CustomColumn[],
): CustomColumn[] => {
  if (!Array.isArray(parts) || parts.length === 0) {
    return existingColumns;
  }

  const usedIds = new Set<string>(existingColumns.map((col) => col.id));
  const nextColumns = [...existingColumns];

  parts.forEach((part) => {
    if (!Array.isArray(part.customImages)) return;

    part.customImages.forEach((attachment) => {
      const label = (attachment?.label || "").trim();
      if (!label) return;

      const alreadyExists = nextColumns.some((col) => {
        const idVal = (col.id || "").trim().toLowerCase();
        const nameVal = (col.name || "").trim().toLowerCase();
        return idVal === label.toLowerCase() || nameVal === label.toLowerCase();
      });

      if (alreadyExists) return;

      const newId = claimUniqueColumnId(
        label,
        usedIds,
        label || `Custom Image ${usedIds.size + 1}`,
      );

      nextColumns.push({
        id: newId,
        name: label || newId,
        type: "image",
        options: [],
      });
    });
  });

  return sortCustomColumns(nextColumns);
};

const applyFriendlyCustomColumnIdentifiers = (
  columns: CustomColumn[],
  parts: Part[],
  columnData: CustomColumnData,
): {
  columns: CustomColumn[];
  parts: Part[];
  columnData: CustomColumnData;
} => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return { columns, parts, columnData };
  }

  const usedIds = new Set<string>();
  const idMap: Record<string, string> = {};

  const friendlyColumns = columns.map((column, index) => {
    const originalId = typeof column.id === "string" ? column.id.trim() : "";
    const trimmedName =
      typeof column.name === "string" ? column.name.trim() : "";
    const fallbackLabel = `Column ${index + 1}`;
    const shouldReplaceId =
      !originalId || LEGACY_COLUMN_ID_PATTERN.test(originalId);

    let finalId: string;
    if (shouldReplaceId) {
      const preferred = trimmedName || originalId;
      finalId = claimUniqueColumnId(preferred, usedIds, fallbackLabel);
      if (originalId && finalId !== originalId) {
        idMap[originalId] = finalId;
      }
    } else {
      finalId = claimUniqueColumnId(originalId, usedIds, fallbackLabel);
      if (finalId !== originalId) {
        idMap[originalId] = finalId;
      }
    }

    const finalName = trimmedName || finalId;

    return {
      ...column,
      id: finalId,
      name: finalName,
    };
  });

  if (Object.keys(idMap).length === 0) {
    return { columns: friendlyColumns, parts, columnData };
  }

  const remappedColumnData = remapCompositeColumnData(columnData, idMap);

  const remappedParts = parts.map((part) => {
    let checkpointDataChanged = false;
    const nextCheckpointData = Array.isArray(part.checkpointData)
      ? part.checkpointData.map((checkpoint) => {
          if (!checkpoint || !checkpoint.customData) {
            return checkpoint;
          }
          const remappedCustomData = remapInlineCustomData(
            checkpoint.customData,
            idMap,
          );
          if (remappedCustomData === checkpoint.customData) {
            return checkpoint;
          }
          checkpointDataChanged = true;
          return {
            ...checkpoint,
            customData: remappedCustomData,
          };
        })
      : part.checkpointData;

    const rawPart: any = part;
    const remappedRowData = remapRowValueMap(rawPart?.customColumnData, idMap);
    const remappedUtmData = remapRowValueMap(
      rawPart?.utmCustomColumnData,
      idMap,
    );

    if (
      !checkpointDataChanged &&
      remappedRowData === rawPart?.customColumnData &&
      remappedUtmData === rawPart?.utmCustomColumnData
    ) {
      return part;
    }

    const nextPart: any = { ...part };
    if (checkpointDataChanged) {
      nextPart.checkpointData = nextCheckpointData;
    }
    if (remappedRowData !== rawPart?.customColumnData) {
      nextPart.customColumnData = remappedRowData;
    }
    if (remappedUtmData !== rawPart?.utmCustomColumnData) {
      nextPart.utmCustomColumnData = remappedUtmData;
    }

    return nextPart;
  });

  return {
    columns: friendlyColumns,
    parts: remappedParts,
    columnData: remappedColumnData,
  };
};

const isDirectT0OnlyLoad = (parts?: Part[]): boolean => {
  if (!parts || parts.length === 0) {
    return false;
  }

  return parts.every((part) => {
    const checkpoints = getCheckpointsForPart(part);
    return checkpoints.length <= 1 && (checkpoints[0] ?? 0) === 0;
  });
};

// Hours-based checkpoint time gate
/**
 * Returns true if the current wall-clock time has reached (or passed) the
 * hour value of the NEXT checkpoint, measured from the moment the last
 * submitted checkpoint was completed (or from loadedAt for the 0→1 transition).
 *
 * If testUnit is not "Hours", always returns true (no time restriction).
 */
const isNextCheckpointTimeReached = (
  parts: Part[],
  currentCheckpointIndex: number,
  loadedAt: string | undefined,
): boolean => {
  if (!parts || parts.length === 0) return true;

  const firstPart = parts[0];
  const testUnit = firstPart?.testUnit;

  // Only apply time-gating for Hours-based tests
  if (testUnit !== "Hours") return true;

  const checkpoints = getCheckpointsForPart(firstPart);
  const nextCheckpointIndex = currentCheckpointIndex + 1;

  if (nextCheckpointIndex >= checkpoints.length) return true;

  const nextCheckpointHours = checkpoints[nextCheckpointIndex];

  if (typeof nextCheckpointHours !== "number") return true;

  // Find the reference start time:
  // - For transition 0→1: use loadedAt (test start time)
  // - For transition N→N+1: use the submittedAt timestamp of checkpoint N
  let referenceTime: Date | null = null;

  if (currentCheckpointIndex === 0) {
    // Use loadedAt as the reference (when the test was started / T0 submitted)
    if (loadedAt) {
      referenceTime = new Date(loadedAt);
    }
  } else {
    // Find the latest submittedAt among all parts for the current checkpoint
    let latestSubmittedAt: string | null = null;
    for (const part of parts) {
      const entry = part.checkpointData?.find(
        (cp) => cp.checkpointIndex === currentCheckpointIndex,
      );
      if (entry?.submittedAt) {
        if (
          !latestSubmittedAt ||
          new Date(entry.submittedAt) > new Date(latestSubmittedAt)
        ) {
          latestSubmittedAt = entry.submittedAt;
        }
      }
    }

    if (latestSubmittedAt) {
      referenceTime = new Date(latestSubmittedAt);
    } else if (loadedAt) {
      // Fallback: use loadedAt if no submittedAt found
      referenceTime = new Date(loadedAt);
    }
  }

  if (!referenceTime) return true;

  // Calculate how many hours have elapsed since loadedAt (test start),
  // because checkpoint values (0, 72, 168, 336, 504) are cumulative hours
  // from test start, not incremental from the last checkpoint.
  const testStartTime = loadedAt ? new Date(loadedAt) : referenceTime;
  const nowMs = Date.now();
  const elapsedHours = (nowMs - testStartTime.getTime()) / (1000 * 60 * 60);

  return elapsedHours >= nextCheckpointHours;
};

/**
 * Returns the remaining milliseconds until the next checkpoint hour is reached.
 * Returns 0 if already reached or not applicable.
 */
const getMsUntilNextCheckpoint = (
  parts: Part[],
  currentCheckpointIndex: number,
  loadedAt: string | undefined,
): number => {
  if (!parts || parts.length === 0) return 0;

  const firstPart = parts[0];
  const testUnit = firstPart?.testUnit;
  if (testUnit !== "Hours") return 0;

  const checkpoints = getCheckpointsForPart(firstPart);
  const nextCheckpointIndex = currentCheckpointIndex + 1;
  if (nextCheckpointIndex >= checkpoints.length) return 0;

  const nextCheckpointHours = checkpoints[nextCheckpointIndex];
  if (typeof nextCheckpointHours !== "number") return 0;

  const testStartTime = loadedAt ? new Date(loadedAt) : null;
  if (!testStartTime) return 0;

  const targetMs =
    testStartTime.getTime() + nextCheckpointHours * 60 * 60 * 1000;
  const remaining = targetMs - Date.now();
  return remaining > 0 ? remaining : 0;
};

/**
 * Formats a millisecond duration into a human-readable countdown string.
 * e.g. "47h 23m 15s"
 */
const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
};

const FinalTestingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadedTestingPartIdRef = React.useRef<string | number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chamberData, setChamberData] = useState<ExtendedChamberData | null>(
    null,
  );
  const [partCheckpointStatus, setPartCheckpointStatus] =
    useState<PartCheckpointStatus>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [checkpointLabels, setCheckpointLabels] = useState<CheckpointLabels>(
    {},
  );
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customColumnData, setCustomColumnData] = useState<CustomColumnData>(
    {},
  );
  const [showUnloadPage, setShowUnloadPage] = useState(false);
  const [unloadStep, setUnloadStep] = useState(0);
  const [unloadPartsToShow, setUnloadPartsToShow] = useState<Part[]>([]);
  const [showUTMUnload, setShowUTMUnload] = useState(false);
  const [showUTMScan, setShowUTMScan] = useState(false);
  const [forcedFinalCheckpointIndex, setForcedFinalCheckpointIndex] = useState<
    number | null
  >(null);
  const [autoUnloadMode, setAutoUnloadMode] = useState<"normal" | "utm" | null>(
    null,
  );
  const [unloadRedirectMode, setUnloadRedirectMode] = useState<
    "planning" | "table"
  >("planning");
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const { toast } = useToast();

  // State to store all submitted checkpoints
  const [submittedCheckpoints, setSubmittedCheckpoints] =
    useState<CheckpointSubmissions>({});

  // Countdown ticker state
  const [, setTickCounter] = useState(0);

  const imageColumns = useMemo(
    () => customColumns.filter((column) => column.type === "image"),
    [customColumns],
  );

  const sanitizePartsForPersist = useCallback((parts: Part[] | undefined) => {
    if (!Array.isArray(parts)) return [] as Part[];

    return parts.map((part) => {
      const {
        cosmeticImages, // legacy
        nonCosmeticImages, // legacy
        postCosmeticImage, // legacy
        postNonCosmeticImage, // legacy
        // keep customImages so pre-T0 uploads persist
        ...rest
      } = part as any;

      const checkpointData = Array.isArray(part.checkpointData)
        ? part.checkpointData.map((cp) => {
            const {
              cosmeticImages: cpCosmetic, // drop legacy field
              nonCosmeticImages: cpNonCosmetic, // drop legacy field
              ...cpRest
            } = cp as any;

            return {
              ...cpRest,
              customData: cpRest.customData
                ? { ...cpRest.customData }
                : cpRest.customData,
            };
          })
        : [];

      return {
        ...rest,
        customImages: part.customImages, // preserve pre/post custom images
        checkpointData,
      } as Part;
    });
  }, []);

  const resolvedCurrentCheckpointIndex = useMemo(() => {
    if (
      chamberData &&
      typeof chamberData.currentCheckpointIndex === "number" &&
      !Number.isNaN(chamberData.currentCheckpointIndex)
    ) {
      return chamberData.currentCheckpointIndex;
    }

    const partIndices =
      chamberData?.parts
        ?.map((part) => {
          const infoIndex = part.checkpointInfo?.checkpointIndex;
          if (typeof infoIndex === "number" && !Number.isNaN(infoIndex)) {
            return infoIndex;
          }

          const flatIndex = (part as Partial<Part>)?.checkpointIndex;
          if (typeof flatIndex === "number" && !Number.isNaN(flatIndex)) {
            return flatIndex;
          }

          return 0;
        })
        .filter((idx) => typeof idx === "number") ?? [];

    if (partIndices.length > 0) {
      return Math.max(...partIndices);
    }

    return 0;
  }, [chamberData]);

  // Tick every second while waiting for a time-gated checkpoint
  useEffect(() => {
    if (!chamberData?.parts) return;

    const firstPart = chamberData.parts[0];
    if (firstPart?.testUnit !== "Hours") return;

    const msRemaining = getMsUntilNextCheckpoint(
      chamberData.parts,
      resolvedCurrentCheckpointIndex,
      (chamberData as any).loadedAt,
    );

    if (msRemaining <= 0) return; // Already reached — no need to tick

    const interval = setInterval(() => {
      setTickCounter((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [chamberData, resolvedCurrentCheckpointIndex]);

  const parseImageJson = (value?: string): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const getCustomColumnValue = (
    part: Part,
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
  ): string | undefined => {
    const key = `${partIndex}-${checkpointIndex}-${columnId}`;
    if (customColumnData[key]) {
      return customColumnData[key];
    }

    const existingEntry = part.checkpointData?.find(
      (cp) => cp.checkpointIndex === checkpointIndex,
    );

    return existingEntry?.customData?.[columnId];
  };

  const hasRequiredImageData = (
    part: Part,
    partIndex: number,
    checkpointIndex: number,
  ): boolean => {
    console.log("=== FULL DEBUG ===");
    console.log("Part:", JSON.stringify(part, null, 2));
    console.log("Image columns:", imageColumns);

    // Check ALL possible image locations
    const checks = {
      partCosmeticImages: part.cosmeticImages,
      partNonCosmeticImages: part.nonCosmeticImages,
      checkpointData: part.checkpointData,
      customColumnData: (part as any).customColumnData,
      utmCustomColumnData: (part as any).utmCustomColumnData,
    };
    console.log("Image checks:", checks);

    // Check each column
    imageColumns.forEach((column, idx) => {
      const value = getCustomColumnValue(
        part,
        partIndex,
        checkpointIndex,
        column.id,
      );
      const parsed = parseImageJson(value);
      console.log(`Column ${idx} (${column.name}/${column.id}):`, {
        value,
        parsed,
        length: parsed.length,
      });
    });

    console.log("=== END DEBUG ===");

    // Temporary: allow submission for debugging
    return true;
  };

  const buildCustomDataPayload = (
    part: Part,
    partIndex: number,
    checkpointIndex: number,
  ): Record<string, string> => {
    const payload: Record<string, string> = {};
    customColumns.forEach((column) => {
      const value = getCustomColumnValue(
        part,
        partIndex,
        checkpointIndex,
        column.id,
      );
      if (value !== undefined) {
        payload[column.id] = value;
      }
    });
    return payload;
  };

  const buildLegacyImageBuckets = (
    part: Part,
    partIndex: number,
    checkpointIndex: number,
  ) => {
    const primaryColumn = imageColumns[0];
    const secondaryColumn = imageColumns[1];

    const primaryImages = primaryColumn
      ? parseImageJson(
          getCustomColumnValue(
            part,
            partIndex,
            checkpointIndex,
            primaryColumn.id,
          ),
        )
      : [];
    const secondaryImages = secondaryColumn
      ? parseImageJson(
          getCustomColumnValue(
            part,
            partIndex,
            checkpointIndex,
            secondaryColumn.id,
          ),
        )
      : [];

    return {
      cosmeticImages: primaryImages,
      nonCosmeticImages: secondaryImages,
    };
  };

  const mergeLegacyImagesIntoCustom = (
    baseCustom: Record<string, string>,
    _legacyImages: { cosmeticImages: string[]; nonCosmeticImages: string[] },
  ) => {
    // Do not carry legacy cosmetic/non-cosmetic fields forward; store only column-based custom images
    return { ...baseCustom };
  };

  useEffect(() => {
    try {
      const keysToRemove = [
        "chamberLoads",
        "customColumns",
        "customColumnData",
        "chamberloads",
        "testingLoadData",
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Unable to clear legacy final testing keys", error);
    }
  }, []);

  const persistChamberUpdate = useCallback(
    async (updates: Partial<ExtendedChamberData> = {}) => {
      if (!chamberData) {
        return;
      }

      const testingPartId =
        chamberData.id ??
        (chamberData as unknown as { loadId?: string | number }).loadId ??
        undefined;

      if (testingPartId === undefined) {
        return;
      }

      const payload: Partial<ExtendedChamberData> = {
        ...chamberData,
        customColumns: updates.customColumns ?? customColumns,
        customColumnData: updates.customColumnData ?? customColumnData,
        parts: sanitizePartsForPersist(updates.parts ?? chamberData.parts),
        ...updates,
      };

      if (payload.parts && payload.parts.length > 0) {
        const currentCheckpoints =
          chamberData.parts?.[0]?.checkpointData?.length || 0;
        const newCheckpoints = payload.parts[0]?.checkpointData?.length || 0;

        if (currentCheckpoints > 0 && newCheckpoints === 0) {
          console.error("❌ BLOCKED: Refusing to save empty checkpointData!");
          return;
        }

        if (currentCheckpoints > newCheckpoints && newCheckpoints > 0) {
          console.warn(
            `⚠️ WARNING: checkpointData shrinking from ${currentCheckpoints} to ${newCheckpoints} entries`,
          );
        }
      }

      try {
        const result = await updateTestingPartInBackend(
          testingPartId,
          payload as any,
        );
        return result;
      } catch (error) {
        console.error("Failed to persist final testing data", error);
        throw error;
      }
    },
    [chamberData, customColumns, customColumnData],
  );

  useEffect(() => {
    const loadData = async () => {
      console.log("📊 useEffect triggered");

      const recordFromState = location.state?.record;
      const testingPartId =
        recordFromState?.loadId ||
        chamberData?.id ||
        (chamberData as any)?.loadId;

      const hydrateCheckpointLabels = (parts: Part[]) => {
        const labels: CheckpointLabels = {};
        if (parts.length === 0) return labels;

        const firstPart = parts[0];
        const unit = firstPart?.testUnit;
        const checkpoints = getCheckpointsForPart(firstPart);
        checkpoints.forEach((checkpoint, index) => {
          labels[index] = getCheckpointLabel(checkpoint, index, unit);
        });
        return labels;
      };

      const normalizeRecord = (
        record: ExtendedChamberData,
      ): ExtendedChamberData => {
        const updatedParts = Array.isArray(record.parts)
          ? record.parts.map((part) => ({
              ...part,
              checkpointData: part.checkpointData || [],
              t0ImagesComplete: part.t0ImagesComplete || false,
              checkpointInfo: part.checkpointInfo || {
                checkpoint: null,
                checkpoints: [],
                checkpointIndex: 0,
                totalCheckpoints: 0,
                originalCheckPoints: "",
              },
            }))
          : [];

        const normalizedColumns = Array.isArray(record.customColumns)
          ? record.customColumns.map((column) => ({
              ...column,
              name:
                typeof column.name === "string"
                  ? column.name.trim()
                  : column.name,
            }))
          : [];

        const normalizedColumnData =
          record.customColumnData && typeof record.customColumnData === "object"
            ? (record.customColumnData as CustomColumnData)
            : {};

        const {
          columns: friendlyColumns,
          parts: remappedParts,
          columnData: remappedColumnData,
        } = applyFriendlyCustomColumnIdentifiers(
          normalizedColumns,
          updatedParts,
          normalizedColumnData,
        );

        return {
          ...record,
          parts: remappedParts,
          customColumns: friendlyColumns,
          customColumnData: remappedColumnData,
        };
      };

      const addT0CheckpointEntries = (
        record: ExtendedChamberData,
      ): ExtendedChamberData => {
        const partsWithT0 = record.parts.map((part) => {
          const hasTopLevelImages =
            part.cosmeticImages?.length > 0 &&
            part.nonCosmeticImages?.length > 0;
          const hasT0Entry = part.checkpointData?.some(
            (cp) => cp.checkpointIndex === 0,
          );

          if (hasTopLevelImages && !hasT0Entry) {
            console.log(
              "Creating T0 checkpoint entry from existing top-level images",
            );
            const t0Entry = {
              checkpointIndex: 0,
              checkpointValue: 0,
              label: "Pre-Test",
              testDate: part.loadedAt || new Date().toISOString(),
              cosmeticImages: part.cosmeticImages || [],
              nonCosmeticImages: part.nonCosmeticImages || [],
              status: null as const,
              submittedAt: part.loadedAt || new Date().toISOString(),
              customData: {},
            };

            return {
              ...part,
              checkpointData: [t0Entry, ...(part.checkpointData || [])],
            };
          }

          return part;
        });

        return {
          ...record,
          parts: partsWithT0,
        };
      };

      try {
        let record: ExtendedChamberData | null = null;

        if (testingPartId) {
          console.log("🔄 Fetching testing part by ID:", testingPartId);
          record = await fetchTestingPartById(testingPartId);
        } else {
          console.log("🔄 No specific ID, fetching all testing parts");
          const remoteRecords = await fetchTestingParts();
          if (Array.isArray(remoteRecords) && remoteRecords.length > 0) {
            record = remoteRecords[0];
          }
        }

        if (!record) {
          if (recordFromState && !refreshTrigger) {
            console.log("⚠️ No backend record found, using location state");
            record = recordFromState as ExtendedChamberData;
          } else {
            console.error("No testing data available");
            setIsLoading(false);
            return;
          }
        }

        const normalized = normalizeRecord(record);
        const withT0 = addT0CheckpointEntries(normalized);

        const columnsWithCustomImages = addCustomImageColumnsFromParts(
          withT0.parts,
          withT0.customColumns ?? [],
        );

        // If no image columns were derived from part.customImages, inject
        // defaults based on part type so users can still upload in testing.
        const hasImageCols = columnsWithCustomImages.some(
          (c) => c.type === "image",
        );
        const isWatchChamber = withT0.parts.some(
          (p) => (p.ticketCode ?? "").split("_")[2]?.toUpperCase() === "W",
        );
        const defaultWatchImageCols = [
          { id: "FRONT", name: "FRONT", type: "image" as const, options: [] },
          { id: "BACK", name: "BACK", type: "image" as const, options: [] },
          { id: "E2", name: "E2", type: "image" as const, options: [] },
          { id: "E4", name: "E4", type: "image" as const, options: [] },
          { id: "E6", name: "E6", type: "image" as const, options: [] },
          { id: "E8", name: "E8", type: "image" as const, options: [] },
          
        ];
        const defaultBackcaseImageCols = [
          {
            id: "COSMETIC_IMAGE",
            name: "COSMETIC_IMAGE",
            type: "image" as const,
            options: [],
          },
          {
            id: "NON_COSMETIC_IMAGE",
            name: "NON_COSMETIC_IMAGE",
            type: "image" as const,
            options: [],
          },
        ];
        const finalColumns = sortCustomColumns(
          !hasImageCols
            ? [
                ...columnsWithCustomImages,
                ...(isWatchChamber
                  ? defaultWatchImageCols
                  : defaultBackcaseImageCols),
              ]
            : columnsWithCustomImages,
        );

        const recordWithDerivedColumns: ExtendedChamberData = {
          ...withT0,
          customColumns: finalColumns,
        };

        setChamberData(recordWithDerivedColumns);
        setCheckpointLabels(
          hydrateCheckpointLabels(recordWithDerivedColumns.parts),
        );
        setCustomColumns(finalColumns);
        setCustomColumnData(recordWithDerivedColumns.customColumnData ?? {});

        // Initialize submittedCheckpoints from loaded data
        const initialCheckpoints: CheckpointSubmissions = {};
        recordWithDerivedColumns.parts.forEach((part, partIndex) => {
          part.checkpointData?.forEach((checkpoint) => {
            if (checkpoint.status !== null) {
              const key = `${partIndex}-${checkpoint.checkpointIndex}`;
              initialCheckpoints[key] = {
                partIndex,
                checkpointIndex: checkpoint.checkpointIndex,
                status: checkpoint.status || "",
                cosmeticImages: checkpoint.cosmeticImages || [],
                nonCosmeticImages: checkpoint.nonCosmeticImages || [],
                customData: checkpoint.customData || {},
                testDate: checkpoint.testDate || new Date().toISOString(),
                checkpointValue: checkpoint.checkpointValue || 0,
                partNumber: part.partNumber,
                serialNumber: part.serialNumber,
                submittedAt: checkpoint.submittedAt || new Date().toISOString(),
              };
            }
          });
        });
        setSubmittedCheckpoints(initialCheckpoints);

        const hasCreatedT0 = recordWithDerivedColumns.parts.some(
          (part, idx) => {
            const originalPart = normalized.parts[idx];
            const originalHasT0 = originalPart.checkpointData?.some(
              (cp) => cp.checkpointIndex === 0,
            );
            const newHasT0 = part.checkpointData?.some(
              (cp) => cp.checkpointIndex === 0,
            );
            return !originalHasT0 && newHasT0;
          },
        );

        if (hasCreatedT0) {
          console.log("Persisting newly created T0 entries to backend");
          setTimeout(async () => {
            try {
              const persistId =
                recordWithDerivedColumns.id ??
                (recordWithDerivedColumns as any).loadId;
              if (persistId) {
                await updateTestingPartInBackend(persistId, {
                  parts: recordWithDerivedColumns.parts,
                } as any);
                console.log("T0 entries saved to backend successfully");
              }
            } catch (error) {
              console.error("Failed to persist T0 entries:", error);
            }
          }, 100);
        }

        const derivedColumnCount =
          finalColumns.length - (withT0.customColumns?.length ?? 0);
        if (derivedColumnCount > 0) {
          const persistId =
            recordWithDerivedColumns.id ??
            (recordWithDerivedColumns as any).loadId;
          if (persistId) {
            updateTestingPartInBackend(persistId, {
              customColumns: finalColumns,
            } as any).catch((error) => {
              console.error(
                "Failed to persist derived custom image columns",
                error,
              );
            });
          }
        }

        loadedTestingPartIdRef.current = testingPartId || "loaded";
      } catch (error) {
        console.error("Failed to load testing parts", error);

        if (recordFromState && !refreshTrigger) {
          console.log("🔄 Using location state as fallback due to fetch error");
          const normalized = normalizeRecord(
            recordFromState as ExtendedChamberData,
          );
          const withT0 = addT0CheckpointEntries(normalized);

          const columnsWithCustomImages = addCustomImageColumnsFromParts(
            withT0.parts,
            withT0.customColumns ?? [],
          );

          const recordWithDerivedColumns: ExtendedChamberData = {
            ...withT0,
            customColumns: columnsWithCustomImages,
          };

          setChamberData(recordWithDerivedColumns);
          setCheckpointLabels(
            hydrateCheckpointLabels(recordWithDerivedColumns.parts),
          );
          setCustomColumns(columnsWithCustomImages);
          setCustomColumnData(recordWithDerivedColumns.customColumnData ?? {});
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshTrigger]);

  const handleAddColumn = () => {
    setShowAddColumnModal(true);
  };

  const handleAddColumnConfirm = async (columnData: { name: string; type: string; options: string[] }) => {
    const { name: trimmedName, type: columnType, options } = columnData;

    const normalizedType = columnType.toLowerCase();
    if (
      !["text", "number", "date", "dropdown", "image"].includes(normalizedType)
    ) {
      toast({
        title: "❌ Invalid Column Type",
        description: "Please use: text, number, date, dropdown, or image",
        variant: "destructive",
      });
      return;
    }

    const newColumnId = generateUniqueColumnId(
      trimmedName,
      customColumns.map((column) => column.id),
      trimmedName || `Custom Column ${customColumns.length + 1}`,
    );

    const newColumn: CustomColumn = {
      id: newColumnId,
      name: trimmedName || newColumnId,
      type: normalizedType as CustomColumn["type"],
      options,
    };

    const updatedColumns = [...customColumns, newColumn];
    setCustomColumns(updatedColumns);
    setChamberData((prev) =>
      prev
        ? {
            ...prev,
            customColumns: updatedColumns,
          }
        : prev,
    );

    try {
      await persistChamberUpdate({ customColumns: updatedColumns });
      toast({
        title: "✓ Column Added",
        description: `"${trimmedName}" has been added successfully.`,
        variant: "default",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      toast({
        title: "❌ Failed to Save",
        description: "Failed to save custom column. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCustomColumnChange = (
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
    value: string,
  ) => {
    const key = `${partIndex}-${checkpointIndex}-${columnId}`;
    const trimmedValue =
      typeof value === "string" ? value : String(value ?? "");
    const isEmptyValue = trimmedValue.trim() === "";

    const nextData: CustomColumnData = { ...customColumnData };
    if (isEmptyValue) {
      delete nextData[key];
    } else {
      nextData[key] = trimmedValue;
    }

    setCustomColumnData(nextData);

    let updatedPartsSnapshot: Part[] | null = null;
    setChamberData((prev) =>
      prev
        ? (() => {
            let partsUpdated = false;
            const nextParts = prev.parts.map((part, index) => {
              if (index !== partIndex) {
                return part;
              }

              if (!Array.isArray(part.checkpointData)) {
                return part;
              }

              const checkpointList = [...part.checkpointData];
              const checkpointPosition = checkpointList.findIndex(
                (entry) => entry.checkpointIndex === checkpointIndex,
              );

              if (checkpointPosition === -1) {
                return part;
              }

              const checkpointEntry = { ...checkpointList[checkpointPosition] };
              const nextCustomData = {
                ...(checkpointEntry.customData ?? {}),
              } as Record<string, string>;

              if (isEmptyValue) {
                delete nextCustomData[columnId];
              } else {
                nextCustomData[columnId] = trimmedValue;
              }

              if (Object.keys(nextCustomData).length > 0) {
                checkpointEntry.customData = nextCustomData;
              } else {
                delete checkpointEntry.customData;
              }

              checkpointList[checkpointPosition] = checkpointEntry;
              partsUpdated = true;
              return {
                ...part,
                checkpointData: checkpointList,
              };
            });

            if (partsUpdated) {
              updatedPartsSnapshot = nextParts.map((part) => ({
                ...part,
                checkpointData: Array.isArray(part.checkpointData)
                  ? part.checkpointData.map((entry) => ({
                      ...entry,
                      customData: entry.customData
                        ? { ...entry.customData }
                        : entry.customData,
                    }))
                  : part.checkpointData,
              }));
            }

            return partsUpdated
              ? {
                  ...prev,
                  parts: nextParts,
                  customColumnData: nextData,
                }
              : {
                  ...prev,
                  customColumnData: nextData,
                };
          })()
        : prev,
    );

    const persistPayload: Partial<ExtendedChamberData> = {
      customColumnData: nextData,
    };

    if (updatedPartsSnapshot) {
      persistPayload.parts = updatedPartsSnapshot;
    }

    persistChamberUpdate(persistPayload).catch((error) => {
      console.error("Failed to store custom column value", error);
    });
  };

  const handleCustomColumnImageUpload = async (
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const uploadedPaths: string[] = [];
    let updatedPartsSnapshot: Part[] | null = null;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("image", file);
      if (chamberData?.id) {
        formData.append("chamberLoadId", String(chamberData.id));
      }

      const part = chamberData?.parts?.[partIndex];
      if (part?.serialNumber) {
        formData.append("partId", String(part.serialNumber));
      } else if (part?.partNumber) {
        formData.append("partId", String(part.partNumber));
      }

      formData.append("imageType", `custom-${columnId}`);
      formData.append("checkpointIndex", String(checkpointIndex));

      try {
        const response = await fetch(
          `${getBackendApiUrl()}/uploads/part-images`,
          {
            method: "POST",
            body: formData,
          },
        );

        const data = await response.json();
        if (data?.success && data?.path) {
          uploadedPaths.push(data.path as string);
        }
      } catch (error) {
        console.error("Failed to upload custom column image", error);
      }
    }

    const key = `${partIndex}-${checkpointIndex}-${columnId}`;
    const imagePathsJson = JSON.stringify(uploadedPaths);

    const nextData: CustomColumnData = { ...customColumnData };
    nextData[key] = imagePathsJson;

    setCustomColumnData(nextData);

    setChamberData((prev) =>
      prev
        ? (() => {
            let partsUpdated = false;
            const nextParts = prev.parts.map((part, index) => {
              if (index !== partIndex) {
                return part;
              }

              if (!Array.isArray(part.checkpointData)) {
                part.checkpointData = [];
              }

              const checkpointList = [...part.checkpointData];
              const checkpointPosition = checkpointList.findIndex(
                (entry) => entry.checkpointIndex === checkpointIndex,
              );

              if (checkpointPosition === -1) {
                const newCheckpointEntry = {
                  checkpointIndex: checkpointIndex,
                  checkpointValue: checkpointIndex,
                  label: checkpointIndex === 0 ? "Pre-Test" : "Post-Test",
                  testDate: new Date().toISOString(),
                  cosmeticImages: [],
                  nonCosmeticImages: [],
                  status: null as const,
                  customData: {
                    [columnId]: imagePathsJson,
                  },
                };
                checkpointList.push(newCheckpointEntry);
                partsUpdated = true;

                return {
                  ...part,
                  checkpointData: checkpointList,
                };
              }

              const checkpointEntry = { ...checkpointList[checkpointPosition] };
              const nextCustomData = {
                ...(checkpointEntry.customData ?? {}),
              } as Record<string, string>;

              nextCustomData[columnId] = imagePathsJson;

              checkpointEntry.customData = nextCustomData;
              checkpointList[checkpointPosition] = checkpointEntry;
              partsUpdated = true;

              return {
                ...part,
                checkpointData: checkpointList,
              };
            });

            if (partsUpdated) {
              updatedPartsSnapshot = nextParts.map((part) => ({
                ...part,
                checkpointData: Array.isArray(part.checkpointData)
                  ? part.checkpointData.map((entry) => ({
                      ...entry,
                      customData: entry.customData
                        ? { ...entry.customData }
                        : entry.customData,
                    }))
                  : part.checkpointData,
              }));
            }

            return partsUpdated
              ? {
                  ...prev,
                  parts: nextParts,
                  customColumnData: nextData,
                }
              : {
                  ...prev,
                  customColumnData: nextData,
                };
          })()
        : prev,
    );

    const persistPayload: Partial<ExtendedChamberData> = {
      customColumnData: nextData,
    };

    if (updatedPartsSnapshot) {
      persistPayload.parts = updatedPartsSnapshot;
    }

    persistChamberUpdate(persistPayload).catch((error) => {
      console.error("Failed to persist custom column image upload", error);
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this column? All data in this column will be lost.",
    );

    if (!confirmDelete) {
      return;
    }

    const filteredColumns = customColumns.filter(
      (column) => column.id !== columnId,
    );

    const filteredDataEntries = Object.entries(customColumnData).filter(
      ([key]) => !key.endsWith(`-${columnId}`),
    );
    const filteredData: CustomColumnData =
      Object.fromEntries(filteredDataEntries);

    setCustomColumns(filteredColumns);
    setCustomColumnData(filteredData);
    setChamberData((prev) =>
      prev
        ? {
            ...prev,
            customColumns: filteredColumns,
            customColumnData: filteredData,
          }
        : prev,
    );

    persistChamberUpdate({
      customColumns: filteredColumns,
      customColumnData: filteredData,
    })
      .then(() => {
        toast({
          title: "✓ Column Deleted",
          description: "Custom column has been removed successfully.",
          variant: "default",
          className: "bg-green-50 border-green-200",
        });
      })
      .catch((error) => {
        console.error("Failed to delete custom column from backend", error);
        toast({
          title: "❌ Delete Failed",
          description: "Failed to delete column. Please try again.",
          variant: "destructive",
        });
      });
  };

  const handleT0ImageComplete = (partIndex: number) => {
    if (!chamberData) return;

    if (chamberData.parts[partIndex].t0ImagesComplete) {
      return;
    }

    console.log(`Marking T0 complete for part ${partIndex}`);

    const updatedParts = chamberData.parts.map((part, idx) => {
      if (idx === partIndex) {
        return {
          ...part,
          t0ImagesComplete: true,
        };
      }
      return part;
    });

    setChamberData((prev) =>
      prev
        ? {
            ...prev,
            parts: updatedParts,
          }
        : null,
    );
  };

  const handleStatusChange = (
    partIndex: number,
    checkpointIndex: number,
    status: "pass" | "fail" | "",
  ) => {
    setPartCheckpointStatus((prev) => ({
      ...prev,
      [`${partIndex}-${checkpointIndex}`]: status,
    }));
  };

  const handleRowSubmit = async (
    partIndex: number,
    checkpointIndex: number,
  ) => {
    if (!chamberData) return;

    const part = chamberData.parts[partIndex];
    const checkpoints = getCheckpointsForPart(part);
    const hasNoCheckpoints =
      checkpoints.length === 0 ||
      (checkpoints.length === 1 && checkpoints[0] === 0);

    const statusKey = `${partIndex}-${checkpointIndex}`;
    const status = partCheckpointStatus[statusKey];
    const resolvedStatus: "pass" | "fail" | null =
      status === "" || status === undefined ? null : status;

    if (hasNoCheckpoints && checkpointIndex === 0) {
      console.log("hasNoCheckpoints", hasNoCheckpoints);
      console.log("checkpointIndex", checkpointIndex);
      console.log("status", status);
      console.log(
        "hasRequiredImageData",
        hasRequiredImageData(part, partIndex, 0),
      );
      if (!hasRequiredImageData(part, partIndex, 0)) {
        toast({
          title: "⚠️ Missing Images",
          description:
            "Please upload images for all image columns before submitting.",
          variant: "destructive",
        });
        return;
      }

      const baseCustomData = buildCustomDataPayload(part, partIndex, 0);
      const legacyImages = buildLegacyImageBuckets(part, partIndex, 0);
      const customData = mergeLegacyImagesIntoCustom(
        baseCustomData,
        legacyImages,
      );
      const timestamp = new Date().toISOString();

      const checkpointData = {
        checkpointIndex: 0,
        checkpointValue: 0,
        label: "Pre-Test",
        testDate: timestamp,
        cosmeticImages: [],
        nonCosmeticImages: [],
        status: resolvedStatus,
        customData,
        submittedAt: timestamp,
      };

      const checkpointSubmission: CheckpointSubmission = {
        partIndex,
        checkpointIndex: 0,
        status: resolvedStatus ?? "",
        cosmeticImages: [],
        nonCosmeticImages: [],
        customData,
        testDate: timestamp,
        checkpointValue: 0,
        partNumber: part.partNumber,
        serialNumber: part.serialNumber,
        submittedAt: timestamp,
      };

      setSubmittedCheckpoints((prev) => ({
        ...prev,
        [`${partIndex}-0`]: checkpointSubmission,
      }));

      const updatedParts = [...chamberData.parts];
      updatedParts[partIndex].checkpointData = [checkpointData];
      updatedParts[partIndex].t0ImagesComplete = true;
      updatedParts[partIndex].isCompleted = true;
      updatedParts[partIndex].completedAt = timestamp;

      const existingInfo = updatedParts[partIndex].checkpointInfo;
      updatedParts[partIndex].checkpointInfo = {
        checkpoint: existingInfo?.checkpoint ?? null,
        checkpoints: existingInfo?.checkpoints ?? [],
        checkpointIndex: 1,
        totalCheckpoints:
          existingInfo?.totalCheckpoints ??
          existingInfo?.checkpoints?.length ??
          0,
        originalCheckPoints: existingInfo?.originalCheckPoints ?? "",
      };

      const newStatus = { ...partCheckpointStatus };
      delete newStatus[statusKey];
      setPartCheckpointStatus(newStatus);

      setChamberData((prev) =>
        prev
          ? {
              ...prev,
              parts: updatedParts,
            }
          : null,
      );

      const keysToRemove = customColumns.map(
        (col) => `${partIndex}-0-${col.id}`,
      );
      const cleanedColumnData: CustomColumnData = { ...customColumnData };
      keysToRemove.forEach((key) => delete cleanedColumnData[key]);
      setCustomColumnData(cleanedColumnData);

      persistChamberUpdate({
        parts: updatedParts,
        customColumns,
        customColumnData: cleanedColumnData,
      }).catch((error) => {
        console.error("Failed to persist T0 submission", error);
      });

      const outcome =
        resolvedStatus === "pass"
          ? "passed"
          : resolvedStatus === "fail"
            ? "failed"
            : "submitted";

      toast({
        title: "✓ Test Submitted",
        description: `Test ${outcome} for ${part.partNumber}`,
        variant: "default",
        className: "bg-green-50 border-green-200",
      });
      return;
    }

    if (checkpointIndex === 0 && !hasNoCheckpoints) {
      return;
    }

    console.log("=== BEFORE SUBMITTING CHECKPOINT ===");
    console.log(
      "Current chamberData.parts[partIndex].checkpointData:",
      chamberData.parts[partIndex].checkpointData,
    );
    console.log(
      "Number of existing checkpoints:",
      chamberData.parts[partIndex].checkpointData?.length || 0,
    );
    console.log("Submitting checkpoint index:", checkpointIndex);
    console.log("====================================");

    if (!status || !hasRequiredImageData(part, partIndex, checkpointIndex)) {
      toast({
        title: "⚠️ Incomplete Submission",
        description:
          "Please upload images for all image columns and select a status (Pass/Fail) before submitting.",
        variant: "destructive",
      });
      return;
    }

    const checkpointValue = checkpoints[checkpointIndex];
    const baseCustomData = buildCustomDataPayload(
      part,
      partIndex,
      checkpointIndex,
    );
    const legacyImages = buildLegacyImageBuckets(
      part,
      partIndex,
      checkpointIndex,
    );
    const customData = mergeLegacyImagesIntoCustom(
      baseCustomData,
      legacyImages,
    );
    const timestamp = new Date().toISOString();

    const checkpointSubmission: CheckpointSubmission = {
      partIndex,
      checkpointIndex,
      status,
      cosmeticImages: [],
      nonCosmeticImages: [],
      customData,
      testDate: timestamp,
      checkpointValue,
      partNumber: part.partNumber,
      serialNumber: part.serialNumber,
      submittedAt: timestamp,
    };

    setSubmittedCheckpoints((prev) => ({
      ...prev,
      [`${partIndex}-${checkpointIndex}`]: checkpointSubmission,
    }));

    const checkpointData = {
      checkpointIndex,
      checkpointValue,
      label: checkpointIndex === 0 ? "Pre-Test" : "Post-Test",
      testDate: timestamp,
      cosmeticImages: [],
      nonCosmeticImages: [],
      status,
      customData,
      submittedAt: timestamp,
    };

    const updatedParts = [...chamberData.parts];
    const existingCheckpointIndex = updatedParts[
      partIndex
    ].checkpointData?.findIndex((cp) => cp.checkpointIndex === checkpointIndex);

    if (existingCheckpointIndex !== undefined && existingCheckpointIndex >= 0) {
      updatedParts[partIndex].checkpointData[existingCheckpointIndex] =
        checkpointData;
    } else {
      if (!updatedParts[partIndex].checkpointData) {
        updatedParts[partIndex].checkpointData = [];
      }
      updatedParts[partIndex].checkpointData.push(checkpointData);
    }

    const newStatus = { ...partCheckpointStatus };
    delete newStatus[statusKey];
    setPartCheckpointStatus(newStatus);
    setChamberData((prev) => {
      if (!prev) return prev;
      const newParts = [...prev.parts];
      newParts[partIndex] = updatedParts[partIndex];
      return {
        ...prev,
        parts: newParts,
      };
    });

    const keysToRemove = customColumns.map(
      (col) => `${partIndex}-${checkpointIndex}-${col.id}`,
    );
    const cleanedColumnData: CustomColumnData = { ...customColumnData };
    keysToRemove.forEach((key) => delete cleanedColumnData[key]);
    setCustomColumnData(cleanedColumnData);

    persistChamberUpdate({
      parts: updatedParts,
      customColumns,
      customColumnData: cleanedColumnData,
    }).catch((error) => {
      console.error("Failed to persist checkpoint submission", error);
    });

    toast({
      title: "✓ Checkpoint Submitted",
      description: `Checkpoint ${status === "pass" ? "passed" : "failed"} for ${part.partNumber}`,
      variant: "default",
      className: "bg-green-50 border-green-200",
    });
  };

  const canProgressCheckpoint = (): boolean => {
    if (!chamberData?.parts || chamberData.parts.length === 0) {
      return false;
    }

    const currentCheckpointIndex = resolvedCurrentCheckpointIndex;
    const firstPart = chamberData.parts[0];
    const checkpoints = getCheckpointsForPart(firstPart);
    const totalCheckpoints = checkpoints.length;

    if (isDirectT0OnlyLoad(chamberData.parts)) {
      return false;
    }

    const hasNextCheckpoint = currentCheckpointIndex + 1 < totalCheckpoints;

    if (!hasNextCheckpoint) {
      return false;
    }

    const loadedAt = (chamberData as any).loadedAt as string | undefined;
    const timeGatePassed = isNextCheckpointTimeReached(
      chamberData.parts,
      currentCheckpointIndex,
      loadedAt,
    );

    if (!timeGatePassed) {
      return false;
    }

    if (currentCheckpointIndex === 0) {
      return chamberData.parts.every((part, idx) => {
        const checkpointEntry = part.checkpointData?.find(
          (cp) => cp.checkpointIndex === 0,
        );

        if (checkpointEntry) {
          if (imageColumns.length === 0) {
            const hasCosmetic =
              parseImageJson(checkpointEntry.customData?.cosmetic).length > 0;
            const hasNonCosmetic =
              parseImageJson(checkpointEntry.customData?.nonCosmetic).length >
              0;

            if (hasCosmetic || hasNonCosmetic) {
              return true;
            }
          } else {
            const hasImageColumns = imageColumns.every(
              (column) =>
                parseImageJson(checkpointEntry.customData?.[column.id]).length >
                0,
            );
            if (hasImageColumns) {
              return true;
            }
          }
        }

        return (
          hasRequiredImageData(part, idx, 0) ||
          Boolean((part as any).t0ImagesComplete)
        );
      });
    }

    const partsAtCurrentCheckpoint = chamberData.parts.filter((part) => {
      const partCurrentIndex = part.checkpointInfo?.checkpointIndex || 0;
      return partCurrentIndex === currentCheckpointIndex;
    });

    if (partsAtCurrentCheckpoint.length === 0) {
      return false;
    }

    const allSubmitted = partsAtCurrentCheckpoint.every((part) =>
      part.checkpointData?.some(
        (cp) => cp.checkpointIndex === currentCheckpointIndex,
      ),
    );

    if (!allSubmitted) {
      return false;
    }

    return partsAtCurrentCheckpoint.some((part) =>
      part.checkpointData?.some(
        (cp) =>
          cp.checkpointIndex === currentCheckpointIndex && cp.status === "pass",
      ),
    );
  };

  const sendCheckpointAlert = async (partData: any, checkpoint) => {
    try {
      const ticketCode = partData.ticketCode;
      const testName = partData.testName;
      const currentIndex = partData.checkpointIndex || 0;
      const nextCheckpointIndex = currentIndex + 1;
      const checkpoints = partData.checkpointInfo?.checkpoints || [];
      const nextCheckpointValue = checkpoints[nextCheckpointIndex];

      if (!nextCheckpointValue) {
        console.warn(`No next checkpoint for part ${partData.partNumber}`);
        return;
      }

      const checkpointHour = checkpoint;

      console.log(`Sending alert for Part ${partData.partNumber}:`, {
        ticketCode,
        testName,
        checkpointHour,
        partNumber: partData.partNumber,
      });

      const response = await fetch(
        "https://ort-digitalization.aequs.com/api/testing-checkpoint-mail",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketCode: ticketCode,
            testName: testName,
            checkpointHour: checkpointHour,
            partNumber: partData.partNumber,
          }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Alert sent for Part ${partData.partNumber}:`, result);
      } else {
        console.error(`❌ Failed for Part ${partData.partNumber}:`, result);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error for Part ${partData.partNumber}:`, error);
      throw error;
    }
  };

  const sendAlertsForAllParts = async (partDataArray: any[], checkpoint) => {
    console.log(`Sending alerts for ${partDataArray.length} parts...`);

    for (const partData of partDataArray) {
      await sendCheckpointAlert(partData, checkpoint);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("✅ All alerts sent!");
  };

  const handleProgressCheckpoint = (checkpoint: any, part: any) => {
    sendAlertsForAllParts(part, checkpoint);

    console.log("Progressing to next checkpoint:", checkpoint, part);

    if (!canProgressCheckpoint()) {
      const loadedAt = (chamberData as any)?.loadedAt as string | undefined;
      const firstPart = chamberData?.parts?.[0];
      const isHoursTest = firstPart?.testUnit === "Hours";

      if (isHoursTest) {
        const msRemaining = getMsUntilNextCheckpoint(
          chamberData?.parts ?? [],
          resolvedCurrentCheckpointIndex,
          loadedAt,
        );

        if (msRemaining > 0) {
          const countdown = formatCountdown(msRemaining);
          toast({
            title: "⏳ Not Yet Time",
            description: `Next checkpoint available in ${countdown}. Please wait until the required hours have elapsed.`,
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "⚠️ Cannot Progress",
        description:
          "Some parts are not ready. Please complete current checkpoint first.",
        variant: "destructive",
      });
      return;
    }

    setScannedParts([]);
    setShowScanModal(true);
  };

  const handleVerifyScan = (identifier: string) => {
    if (!identifier) {
      return;
    }

    setScannedParts((prev) =>
      prev.includes(identifier) ? prev : [...prev, identifier],
    );
  };

  const getPartIdentifier = (part: Part, fallbackIndex: number) => {
    return part.partNumber || part.serialNumber || `part-${fallbackIndex}`;
  };

  const handleContinueProgress = () => {
    if (!chamberData) return;

    const currentCheckpointIndex = resolvedCurrentCheckpointIndex;
    const nextCheckpointIndex = currentCheckpointIndex + 1;

    const activeParts = chamberData.parts.filter((part, index) => {
      const hasPassed = part.checkpointData?.some(
        (cp) =>
          cp.checkpointIndex === currentCheckpointIndex && cp.status === "pass",
      );

      const isT0 = currentCheckpointIndex === 0;
      const t0Flag = Boolean((part as any).t0ImagesComplete);

      return Boolean(
        hasPassed || (isT0 && (hasRequiredImageData(part, index, 0) || t0Flag)),
      );
    });

    const allActiveScanned = activeParts.every((part, index) => {
      const primary = getPartIdentifier(part, index);
      const identifiers = [primary];

      if (part.partNumber && part.partNumber !== primary) {
        identifiers.push(part.partNumber);
      }

      if (part.serialNumber && part.serialNumber !== primary) {
        identifiers.push(part.serialNumber);
      }

      return identifiers.some((id) => scannedParts.includes(id));
    });

    if (!allActiveScanned) {
      toast({
        title: "⚠️ Incomplete Scan",
        description: "Please scan all active parts before continuing.",
        variant: "destructive",
      });
      return;
    }

    const updatedParts = [...chamberData.parts];
    updatedParts.forEach((part, index) => {
      const passedCurrent = part.checkpointData?.some(
        (cp) =>
          cp.checkpointIndex === currentCheckpointIndex && cp.status === "pass",
      );

      const isT0 = currentCheckpointIndex === 0;
      const t0Flag = Boolean((part as any).t0ImagesComplete);

      if (
        passedCurrent ||
        (isT0 && (hasRequiredImageData(part, index, 0) || t0Flag))
      ) {
        const existingInfo = updatedParts[index].checkpointInfo;
        const checkpointsList =
          existingInfo?.checkpoints ?? part.checkpointInfo?.checkpoints ?? [];

        updatedParts[index].checkpointInfo = {
          checkpoint: existingInfo?.checkpoint ?? part.checkpoint ?? null,
          checkpoints: checkpointsList,
          checkpointIndex: nextCheckpointIndex,
          totalCheckpoints:
            existingInfo?.totalCheckpoints ??
            part.checkpointInfo?.totalCheckpoints ??
            checkpointsList.length,
          originalCheckPoints:
            existingInfo?.originalCheckPoints ??
            part.checkpointInfo?.originalCheckPoints ??
            checkpointsList.join(","),
        };

        updatedParts[index].checkpointIndex = nextCheckpointIndex;
      }
    });

    setChamberData((prev) =>
      prev
        ? {
            ...prev,
            parts: updatedParts,
            currentCheckpointIndex: nextCheckpointIndex,
          }
        : null,
    );

    setShowScanModal(false);
    setScannedParts([]);

    const totalCheckpoints = getCheckpointsForPart(
      chamberData.parts[0] ?? {},
    ).length;
    if (autoUnloadMode && nextCheckpointIndex >= totalCheckpoints - 1) {
      if (autoUnloadMode === "utm") {
        setShowUTMScan(true);
      } else {
        setShowUnloadPage(true);
      }
      setAutoUnloadMode(null);
    }

    toast({
      title: "✓ Progress Complete",
      description: `Successfully progressed to ${
        checkpointLabels[nextCheckpointIndex] ||
        `Checkpoint ${nextCheckpointIndex + 1}`
      }`,
      variant: "default",
      className: "bg-green-50 border-green-200",
    });
  };

  const handleUnloadScanVerified = (partsToShow: Part[]) => {
    setUnloadPartsToShow(partsToShow);
    setUnloadStep(1);
  };

  interface FinalPartData {
    partIndex: number;
    partNumber: string;
    serialNumber: string;
    status: "pass" | "fail" | "";
    customData?: Record<string, string>;
    testValue?: number;
    checkpointValue: number;
  }

  const handleUnloadSubmit = async (
    finalData?: FinalPartData[],
    updatedParts?: Part[],
  ) => {
    console.log("=== handleUnloadSubmit START ===");
    console.log("Received finalData:", finalData);
    console.log("Received updatedParts:", updatedParts);

    const baseParts = chamberData?.parts || [];

    const findUpdated = (part: Part) => {
      if (!updatedParts || updatedParts.length === 0) return undefined;
      return updatedParts.find((updated) => {
        const serialMatch =
          updated.serialNumber && part.serialNumber
            ? updated.serialNumber === part.serialNumber
            : false;
        const partMatch = updated.partNumber === part.partNumber;
        return serialMatch || partMatch;
      });
    };

    const mergedParts =
      updatedParts && updatedParts.length > 0
        ? (() => {
            const merged = baseParts.map((part) => findUpdated(part) || part);
            const unmatched = updatedParts.filter((updated) => {
              return !baseParts.some((part) => {
                const serialMatch =
                  updated.serialNumber && part.serialNumber
                    ? updated.serialNumber === part.serialNumber
                    : false;
                const partMatch = updated.partNumber === part.partNumber;
                return serialMatch || partMatch;
              });
            });
            return [...merged, ...unmatched];
          })()
        : baseParts;

    const allPartsCompleted =
      mergedParts.length > 0 && mergedParts.every((part) => part.isCompleted);

    const shouldNavigateToPlanning = unloadRedirectMode === "planning";
    const redirectToPlanning = () => {
      if (shouldNavigateToPlanning) {
        navigate("/planning-detail");
      }
    };

    setShowUnloadPage(false);
    setUnloadStep(0);
    setUnloadPartsToShow([]);
    setForcedFinalCheckpointIndex(null);

    setChamberData((prev) =>
      prev
        ? {
            ...prev,
            parts: mergedParts,
            ...(allPartsCompleted
              ? {
                  status: "unloaded",
                  completedAt: new Date().toISOString(),
                  isCompleted: true,
                }
              : {}),
          }
        : null,
    );

    try {
      if (!chamberData) {
        toast({
          title: "❌ No Data Available",
          description: "No chamber data available to persist.",
          variant: "destructive",
        });
        return;
      }

      const testingPartId = (chamberData.id ?? (chamberData as any).loadId) as
        | string
        | number
        | undefined;

      console.log(
        "Parts to persist:",
        mergedParts.map((p) => ({
          partNumber: p.partNumber,
          customData:
            p.checkpointData?.[p.checkpointData.length - 1]?.customData,
        })),
      );

      const payload = {
        ...(chamberData as any),
        status: allPartsCompleted ? "unloaded" : chamberData.status,
        isCompleted: allPartsCompleted ? true : chamberData.isCompleted,
        completedAt: allPartsCompleted
          ? new Date().toISOString()
          : chamberData.completedAt,
        parts: sanitizePartsForPersist(mergedParts),
        finalData: finalData,
      };

      console.log(payload);

      if (testingPartId) {
        console.log("Updating backend with testingPartId:", testingPartId);
        const response = await updateTestingPartInBackend(
          testingPartId,
          payload as any,
        );

        if (response) {
          console.log("Unload persisted to backend", response);

          const completedCount = finalData?.length || 0;
          const passedCount =
            finalData?.filter((fd) => fd.status === "pass").length || 0;
          const failedCount =
            finalData?.filter((fd) => fd.status === "fail").length || 0;

          toast({
            title: "✓ Unload Complete",
            description: `Parts processed: ${completedCount} • Passed: ${passedCount} • Failed: ${failedCount}${allPartsCompleted ? " • Data persisted to backend" : " • Partial unload saved"}`,
            variant: "default",
            className: "bg-green-50 border-green-200",
          });

          redirectToPlanning();
        } else {
          console.warn("Backend returned no data when updating unload.");
          toast({
            title: "⚠️ Partial Success",
            description:
              "Unload completed locally but backend returned no data.",
            variant: "default",
          });
          redirectToPlanning();
        }
      } else {
        console.warn("No testingPartId available; unload not persisted.");
        toast({
          title: "⚠️ No ID Available",
          description:
            "Unload completed locally but could not persist (no id).",
          variant: "default",
        });
        redirectToPlanning();
      }
    } catch (error) {
      console.error("Failed to persist unload to backend", error);

      toast({
        title: "❌ Persist Failed",
        description: `Failed to persist to backend: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      redirectToPlanning();
    } finally {
      console.log("=== handleUnloadSubmit END ===");
    }
  };

  const handleUnloadBack = () => {
    if (unloadStep === 1) {
      setUnloadStep(0);
    } else {
      setShowUnloadPage(false);
      setUnloadStep(0);
      setUnloadPartsToShow([]);
    }
  };

  const handleUTMScanComplete = (verifiedParts: Part[]) => {
    setShowUTMScan(false);
    setShowUTMUnload(true);
    setUnloadPartsToShow(verifiedParts);
  };

  const handleCompleteUTMUnload = async (
    updatedParts?: any[],
    utmMetadata?: any,
  ) => {
    try {
      if (!chamberData) return;

      const finalParts =
        updatedParts ||
        chamberData.parts?.map((part) => ({
          ...part,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          testStatus: "completed",
        }));

      const payload = {
        ...(chamberData as any),
        parts: sanitizePartsForPersist(finalParts),
        status: "completed",
        completedAt: new Date().toISOString(),
        testType: "UTM",
        utmMetadata: utmMetadata || null,
        customColumns:
          utmMetadata?.customColumns || chamberData.customColumns || [],
      };

      const testingPartId = (chamberData.id ?? (chamberData as any).loadId) as
        | string
        | number
        | undefined;

      if (testingPartId) {
        const response = await updateTestingPartInBackend(
          testingPartId,
          payload as any,
        );

        if (response) {
          console.log(
            "✅ UTM unload with all images persisted to backend",
            response,
          );
          toast({
            title: "✓ UTM Test Complete",
            description:
              "UTM test completed and persisted to backend successfully.",
            variant: "default",
            className: "bg-green-50 border-green-200",
          });
        } else {
          console.warn("Backend returned no data when updating UTM unload.");
          toast({
            title: "⚠️ Partial Success",
            description: "UTM completed locally but backend returned no data.",
            variant: "default",
          });
        }
      } else {
        console.warn("No testingPartId found; skipping backend persist.");
        toast({
          title: "⚠️ No ID Available",
          description: "UTM completed locally; no id to persist.",
          variant: "default",
        });
      }

      setShowUTMUnload(false);
      setShowUTMScan(false);
      setChamberData(null);
      setCustomColumns([]);
      setCustomColumnData({});
    } catch (error) {
      console.error("Error completing UTM unload", error);
      toast({
        title: "❌ UTM Unload Failed",
        description: "Error completing unload. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnloadButtonClick = () => {
    if (!chamberData) return;

    setUnloadRedirectMode("planning");

    console.log("Full chamber data:", chamberData);
    console.log("Machine Details:", chamberData.machineDetails);
    console.log("Selected test:", chamberData.machineDetails?.selectedTest);
    console.log(
      "Machine Equipment2:",
      chamberData.machineDetails?.selectedTest?.machineEquipment2,
    );

    const getLatestStatus = (part: Part): "pass" | "fail" | null => {
      if (!Array.isArray(part.checkpointData)) return null;
      const sorted = [...part.checkpointData].sort(
        (a, b) => b.checkpointIndex - a.checkpointIndex,
      );
      const latestWithStatus = sorted.find((cp) => cp.status !== null);
      return latestWithStatus?.status ?? null;
    };

    const directT0Only = isDirectT0OnlyLoad(chamberData.parts);

    const passedParts = chamberData.parts.filter((part, index) => {
      const checkpoints = getCheckpointsForPart(part);
      const finalIndex = Math.max(0, checkpoints.length - 1);
      const finalCheckpoint = part.checkpointData?.find(
        (cp) => cp.checkpointIndex === finalIndex,
      );
      const status = finalCheckpoint?.status ?? getLatestStatus(part);

      if (directT0Only && finalIndex === 0) {
        const hasImages =
          hasRequiredImageData(part, index, 0) ||
          Boolean(part.t0ImagesComplete);
        return Boolean(finalCheckpoint && hasImages);
      }

      return status === "pass";
    });

    if (passedParts.length === 0) {
      toast({
        title: "⚠️ No Parts Available",
        description: "No passed parts available for unload.",
        variant: "destructive",
      });
      return;
    }

    setUnloadPartsToShow(passedParts);
    setUnloadStep(0);

    const machineDetails = (chamberData as unknown as Record<string, any>)
      ?.machineDetails;
    const isUTM = machineDetails?.selectedTest?.machineEquipment2 === "UTM";

    console.log("Is UTM test?", isUTM);

    const currentIndex = resolvedCurrentCheckpointIndex;
    const firstPart = chamberData.parts[0];
    const checkpoints = firstPart ? getCheckpointsForPart(firstPart) : [];
    const hasNext = currentIndex + 1 < checkpoints.length;

    if (hasNext) {
      const proceedWithCurrent = window.confirm(
        `You are at ${
          checkpointLabels[currentIndex] || `Checkpoint ${currentIndex + 1}`
        }.\nDo you want to complete this checkpoint now?\nOK = Complete now, Cancel = Move to next checkpoint.`,
      );

      if (!proceedWithCurrent) {
        const totalCheckpoints = firstPart
          ? getCheckpointsForPart(firstPart).length
          : 0;
        const nextIndex = currentIndex + 1;
        if (nextIndex === totalCheckpoints - 1) {
          setAutoUnloadMode(isUTM ? "utm" : "normal");
        } else {
          setAutoUnloadMode(null);
        }
        handleProgressCheckpoint("0");
        return;
      }

      setForcedFinalCheckpointIndex(currentIndex);
    } else {
      setForcedFinalCheckpointIndex(null);
    }

    if (isUTM) {
      setShowUTMScan(true);
    } else {
      setShowUnloadPage(true);
    }
  };

  const isReadyForUnload = (): boolean => {
    if (!chamberData?.parts) {
      return false;
    }

    if (isDirectT0OnlyLoad(chamberData.parts)) {
      return chamberData.parts.every((part, index) => {
        const t0Entry = part.checkpointData?.find(
          (cp) => cp.checkpointIndex === 0,
        );
        const hasImageCoverage = hasRequiredImageData(part, index, 0);

        if (t0Entry) {
          return hasImageCoverage || Boolean(part.t0ImagesComplete);
        }

        const statusKey = `${index}-0`;
        const status = partCheckpointStatus[statusKey];
        return Boolean(hasImageCoverage && status);
      });
    }

    const results = chamberData.parts.map((part, index) => {
      const checkpoints = getCheckpointsForPart(part);
      const hasNoCheckpoints =
        checkpoints.length === 0 ||
        (checkpoints.length === 1 && checkpoints[0] === 0);

      if (hasNoCheckpoints) {
        const t0Entry = part.checkpointData?.find(
          (cp) => cp.checkpointIndex === 0,
        );
        const hasImageCoverage = hasRequiredImageData(part, index, 0);

        if (t0Entry) {
          return hasImageCoverage || Boolean(part.t0ImagesComplete);
        }

        const statusKey = `${index}-0`;
        const status = partCheckpointStatus[statusKey];
        return Boolean(hasImageCoverage && status);
      }

      const failedCheckpoint = part.checkpointData?.find(
        (cp) => cp.status === "fail",
      );

      if (failedCheckpoint !== undefined) {
        return true;
      }

      const currentIndex = Math.min(
        Math.max(part.checkpointInfo?.checkpointIndex || 0, 0),
        checkpoints.length - 1,
      );

      const submittedCurrent = part.checkpointData?.find(
        (cp) => cp.checkpointIndex === currentIndex,
      );

      return Boolean(submittedCurrent && submittedCurrent.status);
    });

    return results.every((ready) => ready === true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chamber data...</p>
        </div>
      </div>
    );
  }

  if (!chamberData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">No chamber data found.</p>
        </div>
      </div>
    );
  }

  if (showUTMScan) {
    return (
      <UnloadScanVerification
        onBack={() => setShowUTMScan(false)}
        onVerified={handleUTMScanComplete}
        chamberData={chamberData}
        partsToShow={
          unloadPartsToShow.length > 0 ? unloadPartsToShow : undefined
        }
      />
    );
  }

  if (showUTMUnload) {
    return (
      <UnloadWithUTM
        onBack={() => {
          setShowUTMUnload(false);
          setShowUTMScan(true);
        }}
        onSubmit={handleCompleteUTMUnload}
        chamberData={chamberData}
        partsToShow={
          unloadPartsToShow.length > 0 ? unloadPartsToShow : chamberData.parts
        }
      />
    );
  }

  if (showUnloadPage) {
    if (unloadStep === 0) {
      return (
        <UnloadScanVerification
          onBack={() => {
            setShowUnloadPage(false);
            setUnloadStep(0);
            setUnloadPartsToShow([]);
          }}
          onVerified={handleUnloadScanVerified}
          chamberData={chamberData}
          partsToShow={
            unloadPartsToShow.length > 0 ? unloadPartsToShow : undefined
          }
        />
      );
    }

    return (
      <UnloadDataEntry
        onBack={handleUnloadBack}
        onSubmit={handleUnloadSubmit}
        chamberData={chamberData}
        checkpointLabels={checkpointLabels}
        customColumns={customColumns}
        customColumnData={customColumnData}
        formatDate={formatDate}
        onStatusChange={handleStatusChange}
        onRowSubmit={handleRowSubmit}
        partsToShow={unloadPartsToShow}
        submittedCheckpoints={submittedCheckpoints}
        forcedFinalCheckpointIndex={forcedFinalCheckpointIndex}
      />
    );
  }

  const directT0OnlyLoad = isDirectT0OnlyLoad(chamberData.parts);
  const canProgress = directT0OnlyLoad ? false : canProgressCheckpoint();
  const readyForUnload = isReadyForUnload();
  const currentCheckpointIndex = resolvedCurrentCheckpointIndex;
  const nextCheckpointIndex = currentCheckpointIndex + 1;
  const firstPart = chamberData.parts[0];
  const totalCheckpoints = firstPart
    ? getCheckpointsForPart(firstPart).length
    : 0;
  const hasNextCheckpoint =
    !directT0OnlyLoad && nextCheckpointIndex < totalCheckpoints;
  const nextCheckpointLabel = hasNextCheckpoint
    ? (checkpointLabels[nextCheckpointIndex] ??
      `Checkpoint ${nextCheckpointIndex + 1}`)
    : null;
  const progressButtonText =
    hasNextCheckpoint && nextCheckpointLabel
      ? `Progress to ${nextCheckpointLabel}`
      : "Progress";

  const isHoursTest = firstPart?.testUnit === "Hours";
  const loadedAt = (chamberData as any).loadedAt as string | undefined;
  const msUntilNext = isHoursTest
    ? getMsUntilNextCheckpoint(
        chamberData.parts,
        currentCheckpointIndex,
        loadedAt,
      )
    : 0;
  const countdownText = msUntilNext > 0 ? formatCountdown(msUntilNext) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <AddColumnModal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onAdd={handleAddColumnConfirm}
      />
      
      <div className="max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Chamber Checkpoint Management
            </h1>
            <div className="text-sm text-gray-600">
              Last Updated: {formatDate(chamberData.lastUpdated)}
            </div>
          </div>

          <MachineDetails chamberData={chamberData} />

          {chamberData.parts.map((part, index) => (
            <PartDetails
              key={part.partNumber || part.serialNumber || index}
              part={part}
              index={index}
            />
          ))}

          <CheckpointProgress parts={chamberData.parts} />

          <div className="mb-4">
            <button
              onClick={handleAddColumn}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Custom Column
            </button>
          </div>

          {chamberData.parts.map((part, index) => (
            <PartCheckpointTable
              key={part.partNumber || part.serialNumber || index}
              part={part}
              partIndex={index}
              onRowSubmit={handleRowSubmit}
              onStatusChange={handleStatusChange}
              onUnloadPart={(pIndex, p) => {
                setUnloadPartsToShow([p]);
                setShowUnloadPage(true);
                setUnloadStep(0);
                setUnloadRedirectMode("table");
              }}
              partCheckpointStatus={partCheckpointStatus}
              onT0ImageComplete={handleT0ImageComplete}
              customColumns={customColumns}
              customColumnData={customColumnData}
              onCustomColumnChange={handleCustomColumnChange}
              onCustomColumnImageUpload={handleCustomColumnImageUpload}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      handleProgressCheckpoint(
                        nextCheckpointLabel,
                        chamberData.parts,
                      )
                    }
                    className={`px-6 py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
                      canProgress
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!canProgress}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    <span className="whitespace-nowrap">
                      {progressButtonText}
                    </span>
                  </button>

                  <button
                    onClick={handleUnloadButtonClick}
                    disabled={!readyForUnload}
                    className={`px-6 py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
                      readyForUnload
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="whitespace-nowrap">
                      Completed all checkpoints
                    </span>
                  </button>
                </div>

                {isHoursTest && hasNextCheckpoint && countdownText && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Next checkpoint ({nextCheckpointLabel}) available in:{" "}
                      <span className="font-mono font-semibold">
                        {countdownText}
                      </span>
                    </span>
                  </div>
                )}
                {isHoursTest && hasNextCheckpoint && !countdownText && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Time reached for{" "}
                      <span className="font-semibold">
                        {nextCheckpointLabel}
                      </span>{" "}
                      — ready to progress when checkpoint is submitted.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ScanVerificationModal
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          parts={chamberData.parts}
          currentCheckpointIndex={currentCheckpointIndex}
          nextCheckpointIndex={nextCheckpointIndex}
          onVerifyScan={handleVerifyScan}
          scannedParts={scannedParts}
          onContinue={handleContinueProgress}
          checkpointLabels={checkpointLabels}
        />
      </div>
    </div>
  );
};

export default FinalTestingPage;