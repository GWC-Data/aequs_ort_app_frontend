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
import { formatDate, getCheckpointsForPart } from "./utils/helpers";
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

  return nextColumns;
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
  const [forcedFinalCheckpointIndex, setForcedFinalCheckpointIndex] =
    useState<number | null>(null);
  const [autoUnloadMode, setAutoUnloadMode] = useState<"normal" | "utm" | null>(null);

  // ✅ ADD THIS: State to store all submitted checkpoints
  const [submittedCheckpoints, setSubmittedCheckpoints] =
    useState<CheckpointSubmissions>({});

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
        customImages, // legacy aggregated
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
              customData: cpRest.customData ? { ...cpRest.customData } : cpRest.customData,
            };
          })
        : [];

      return {
        ...rest,
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

  // const hasRequiredImageData = (
  //   part: Part,
  //   partIndex: number,
  //   checkpointIndex: number,
  // ): boolean => {
  //   if (imageColumns.length === 0) {
  //     return true;
  //   }

  //   const legacyBuckets = buildLegacyImageBuckets(part, partIndex, checkpointIndex);

  //   return imageColumns.every((column, columnIndex) => {
  //     const value = getCustomColumnValue(part, partIndex, checkpointIndex, column.id);
  //     const parsed = parseImageJson(value);
  //     if (parsed.length > 0) {
  //       return true;
  //     }

  //     if (columnIndex === 0 && legacyBuckets.cosmeticImages.length > 0) {
  //       return true;
  //     }

  //     if (columnIndex === 1 && legacyBuckets.nonCosmeticImages.length > 0) {
  //       return true;
  //     }

  //     return false;
  //   });
  // };
const hasRequiredImageData = (
  part: Part,
  partIndex: number,
  checkpointIndex: number,
): boolean => {
  console.log('=== FULL DEBUG ===');
  console.log('Part:', JSON.stringify(part, null, 2));
  console.log('Image columns:', imageColumns);
  
  // Check ALL possible image locations
  const checks = {
    partCosmeticImages: part.cosmeticImages,
    partNonCosmeticImages: part.nonCosmeticImages,
    checkpointData: part.checkpointData,
    customColumnData: (part as any).customColumnData,
    utmCustomColumnData: (part as any).utmCustomColumnData,
  };
  console.log('Image checks:', checks);
  
  // Check each column
  imageColumns.forEach((column, idx) => {
    const value = getCustomColumnValue(part, partIndex, checkpointIndex, column.id);
    const parsed = parseImageJson(value);
    console.log(`Column ${idx} (${column.name}/${column.id}):`, {
      value,
      parsed,
      length: parsed.length
    });
  });
  
  console.log('=== END DEBUG ===');
  
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
      const value = getCustomColumnValue(part, partIndex, checkpointIndex, column.id);
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
          getCustomColumnValue(part, partIndex, checkpointIndex, primaryColumn.id),
        )
      : [];
    const secondaryImages = secondaryColumn
      ? parseImageJson(
          getCustomColumnValue(part, partIndex, checkpointIndex, secondaryColumn.id),
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

      const stack = new Error().stack;
      const callerLine = stack?.split("\n")[2]?.trim() || "unknown";

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

        const checkpoints = getCheckpointsForPart(parts[0]);
        checkpoints.forEach((checkpoint, index) => {
          labels[index] = index === 0 ? "T0" : `${checkpoint}hr`;
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

        const recordWithDerivedColumns: ExtendedChamberData = {
          ...withT0,
          customColumns: columnsWithCustomImages,
        };

        setChamberData(recordWithDerivedColumns);
        setCheckpointLabels(hydrateCheckpointLabels(recordWithDerivedColumns.parts));
        setCustomColumns(columnsWithCustomImages);
        setCustomColumnData(recordWithDerivedColumns.customColumnData ?? {});

        // ✅ Initialize submittedCheckpoints from loaded data
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

        const hasCreatedT0 = recordWithDerivedColumns.parts.some((part, idx) => {
          const originalPart = normalized.parts[idx];
          const originalHasT0 = originalPart.checkpointData?.some(
            (cp) => cp.checkpointIndex === 0,
          );
          const newHasT0 = part.checkpointData?.some(
            (cp) => cp.checkpointIndex === 0,
          );
          return !originalHasT0 && newHasT0;
        });

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

        const derivedColumnCount = columnsWithCustomImages.length - (withT0.customColumns?.length ?? 0);
        if (derivedColumnCount > 0) {
          const persistId = recordWithDerivedColumns.id ?? (recordWithDerivedColumns as any).loadId;
          if (persistId) {
            updateTestingPartInBackend(persistId, {
              customColumns: columnsWithCustomImages,
            } as any).catch((error) => {
              console.error("Failed to persist derived custom image columns", error);
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

  const handleAddColumn = async () => {
    const columnName = prompt("Enter column name:");
    if (!columnName) return;

    const columnType = prompt(
      "Enter column type (text/number/date/dropdown/image):",
    );
    if (!columnType) return;

    const normalizedType = columnType.toLowerCase();
    if (
      !["text", "number", "date", "dropdown", "image"].includes(normalizedType)
    ) {
      alert(
        "Invalid column type. Please use: text, number, date, dropdown, or image",
      );
      return;
    }

    let options: string[] = [];
    if (normalizedType === "dropdown") {
      const optionInput = prompt("Enter dropdown options (comma-separated):");
      if (!optionInput) return;
      options = optionInput.split(",").map((option) => option.trim());
    }

    const trimmedName = columnName.trim();
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
    } catch (error) {
      alert("Failed to save custom column. Please try again.");
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
    }).catch((error) => {
      console.error("Failed to delete custom column from backend", error);
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

  // ✅ UPDATED: handleRowSubmit now stores checkpoint submissions
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

    if (hasNoCheckpoints && checkpointIndex === 0) {
      console.log("hasNoCheckpoints", hasNoCheckpoints);
      console.log("checkpointIndex", checkpointIndex);
      console.log("status", status);
      console.log("hasRequiredImageData", hasRequiredImageData(part, partIndex, 0));
      if (!status || !hasRequiredImageData(part, partIndex, 0)) {
        alert(
          "Please upload images for all image columns and select a status (Pass/Fail) before submitting.",
        );
        return;
      }

      const baseCustomData = buildCustomDataPayload(part, partIndex, 0);
      const legacyImages = buildLegacyImageBuckets(part, partIndex, 0);
      const customData = mergeLegacyImagesIntoCustom(baseCustomData, legacyImages);
      const timestamp = new Date().toISOString();

      const checkpointData = {
        checkpointIndex: 0,
        checkpointValue: 0,
        label: "Pre-Test",
        testDate: timestamp,
        cosmeticImages: [],
        nonCosmeticImages: [],
        status,
        customData,
        submittedAt: timestamp,
      };

      const checkpointSubmission: CheckpointSubmission = {
        partIndex,
        checkpointIndex: 0,
        status,
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

      persistChamberUpdate({
        parts: updatedParts,
        customColumns,
        customColumnData,
      }).catch((error) => {
        console.error("Failed to persist T0 submission", error);
      });

      alert(
        `Test ${status === "pass" ? "passed" : "failed"} for ${part.partNumber}`,
      );
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
      alert(
        "Please upload images for all image columns and select a status (Pass/Fail) before submitting.",
      );
      return;
    }

    const checkpointValue = checkpoints[checkpointIndex];
    const baseCustomData = buildCustomDataPayload(part, partIndex, checkpointIndex);
    const legacyImages = buildLegacyImageBuckets(part, partIndex, checkpointIndex);
    const customData = mergeLegacyImagesIntoCustom(baseCustomData, legacyImages);
    const timestamp = new Date().toISOString();

    // ✅ CREATE CHECKPOINT SUBMISSION
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

    // ✅ STORE CHECKPOINT SUBMISSION
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

    persistChamberUpdate({
      parts: updatedParts,
      customColumns,
      customColumnData,
    })
      .then(() => {
        console.log("✅ Checkpoint submitted - triggering data refresh");
        setRefreshTrigger((prev) => prev + 1);
      })
      .catch((error) => {
        console.error("Failed to persist checkpoint submission", error);
      });

    alert(
      `Checkpoint ${status === "pass" ? "passed" : "failed"} for ${part.partNumber}`,
    );
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

    if (currentCheckpointIndex === 0) {
      return chamberData.parts.every((part, idx) => {
        const checkpointEntry = part.checkpointData?.find(
          (cp) => cp.checkpointIndex === 0,
        );

        if (checkpointEntry) {
          if (imageColumns.length === 0) {
            const hasCosmetic = parseImageJson(
              checkpointEntry.customData?.cosmetic,
            ).length > 0;
            const hasNonCosmetic = parseImageJson(
              checkpointEntry.customData?.nonCosmetic,
            ).length > 0;

            if (hasCosmetic || hasNonCosmetic) {
              return true;
            }
          } else {
            const hasImageColumns = imageColumns.every((column) =>
              parseImageJson(checkpointEntry.customData?.[column.id]).length > 0,
            );
            if (hasImageColumns) {
              return true;
            }
          }
        }

        return hasRequiredImageData(part, idx, 0) || Boolean((part as any).t0ImagesComplete);
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
// Function to send checkpoint alert for a single part

const sendCheckpointAlert = async (partData: any,checkpoint) => {

    try {

        const ticketCode = partData.ticketCode;

        const testName = partData.testName;

        // Get the next checkpoint hour

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

            partNumber: partData.partNumber

        });
 
       const response = await fetch('http://localhost:6060/testing-checkpoint-mail', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        ticketCode: ticketCode,
        testName: testName,
        checkpointHour: checkpointHour,
        partNumber: partData.partNumber
    })
});
 
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
 
// Send alerts for all parts in the array

const sendAlertsForAllParts = async (partDataArray: any[],checkpoint) => {

    console.log(`Sending alerts for ${partDataArray.length} parts...`);

    for (const partData of partDataArray) {

        await sendCheckpointAlert(partData,checkpoint);

        // Optional: Add delay between requests to avoid overwhelming the server

        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

    }

    console.log('✅ All alerts sent!');

};
 
// Usage


 
  const handleProgressCheckpoint = (checkpoint:any,part:any) => {






sendAlertsForAllParts(part,checkpoint); // Send alerts for all parts in the chamber

    
    console.log("Progressing to next checkpoint:", checkpoint,part);

    if (!canProgressCheckpoint()) {
      alert("Cannot progress: Some parts are not ready.");
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
      alert("Please scan all active parts before continuing.");
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

      if (passedCurrent || (isT0 && (hasRequiredImageData(part, index, 0) || t0Flag))) {
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

    const totalCheckpoints = getCheckpointsForPart(chamberData.parts[0] ?? {}).length;
    if (autoUnloadMode && nextCheckpointIndex >= totalCheckpoints - 1) {
      if (autoUnloadMode === "utm") {
        setShowUTMScan(true);
      } else {
        setShowUnloadPage(true);
      }
      setAutoUnloadMode(null);
    }

    alert(
      `Successfully progressed to ${
        checkpointLabels[nextCheckpointIndex] ||
        `Checkpoint ${nextCheckpointIndex + 1}`
      }`,
    );
  };

  const handleUnloadScanVerified = (partsToShow: Part[]) => {
    setUnloadPartsToShow(partsToShow);
    setUnloadStep(1);
  };

  // const handleUnloadSubmit = async (
  //   _finalData?: unknown,
  //   updatedParts?: Part[],
  // ) => {
  //   const partsToPersist =
  //     updatedParts && updatedParts.length > 0
  //       ? updatedParts
  //       : chamberData?.parts || [];
  //   setShowUnloadPage(false);
  //   setUnloadStep(0);
  //   setUnloadPartsToShow([]);
  //   setForcedFinalCheckpointIndex(null);

  //   setChamberData((prev) =>
  //     prev
  //       ? {
  //           ...prev,
  //           parts: partsToPersist,
  //           status: "unloaded",
  //           completedAt: new Date().toISOString(),
  //           isCompleted: true,
  //         }
  //       : null,
  //   );

  //   try {
  //     if (!chamberData) {
  //       alert("No chamber data available to persist.");
  //       return;
  //     }

  //     const testingPartId = (chamberData.id ?? (chamberData as any).loadId) as
  //       | string
  //       | number
  //       | undefined;

  //     const payload = {
  //       ...(chamberData as any),
  //       status: "unloaded",
  //       isCompleted: true,
  //       completedAt: new Date().toISOString(),
  //       parts: partsToPersist,
  //     };

  //     if (testingPartId) {
  //       const response = await updateTestingPartInBackend(
  //         testingPartId,
  //         payload as any,
  //       );

  //       if (response) {
  //         console.log("Unload persisted to backend", response);
  //         alert("Unload completed and persisted to backend.");
  //         navigate("/planning-detail");
  //       } else {
  //         console.warn("Backend returned no data when updating unload.");
  //         alert("Unload completed locally but backend returned no data.");
  //         navigate("/planning-detail");
  //       }
  //     } else {
  //       console.warn("No testingPartId available; unload not persisted.");
  //       alert("Unload completed locally but could not persist (no id).");
  //       navigate("/planning-detail");
  //     }
  //   } catch (error) {
  //     console.error("Failed to persist unload to backend", error);
  //     alert(
  //       "Unload completed locally but failed to persist to backend. See console for details.",
  //     );
  //     navigate("/planning-detail");
  //   }
  // };

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
  
  const partsToPersist =
    updatedParts && updatedParts.length > 0
      ? updatedParts
      : chamberData?.parts || [];
  
  setShowUnloadPage(false);
  setUnloadStep(0);
  setUnloadPartsToShow([]);
  setForcedFinalCheckpointIndex(null);

  // Update local state
  setChamberData((prev) =>
    prev
      ? {
          ...prev,
          parts: partsToPersist,
          status: "unloaded",
          completedAt: new Date().toISOString(),
          isCompleted: true,
        }
      : null,
  );

  try {
    if (!chamberData) {
      alert("No chamber data available to persist.");
      return;
    }

    const testingPartId = (chamberData.id ?? (chamberData as any).loadId) as
      | string
      | number
      | undefined;

    // Log what we're about to persist
    console.log("Parts to persist:", partsToPersist.map(p => ({
      partNumber: p.partNumber,
      customData: p.checkpointData?.[p.checkpointData.length - 1]?.customData,
    })));

    const payload = {
      ...(chamberData as any),
      status: "unloaded",
      isCompleted: true,
      completedAt: new Date().toISOString(),
      parts: sanitizePartsForPersist(partsToPersist),
      finalData: finalData, // Optional, for debugging
    };

    if (testingPartId) {
      console.log("Updating backend with testingPartId:", testingPartId);
      const response = await updateTestingPartInBackend(
        testingPartId,
        payload as any,
      );

      if (response) {
        console.log("Unload persisted to backend", response);
        
        // Show detailed success message
        const completedCount = finalData?.length || 0;
        const passedCount = finalData?.filter(fd => fd.status === 'pass').length || 0;
        const failedCount = finalData?.filter(fd => fd.status === 'fail').length || 0;
        
        alert(
          `Unload completed successfully!\n` +
          `• Parts processed: ${completedCount}\n` +
          `• Passed: ${passedCount}\n` +
          `• Failed: ${failedCount}\n` +
          `• Images uploaded: ${finalData?.reduce((acc, fd) => 
            acc + Object.values(fd.customData || {}).reduce((sum, val) => 
              sum + (JSON.parse(val || '[]') as string[]).length, 0
            ), 0
          )}\n` +
          `Data persisted to backend.`
        );
        navigate("/planning-detail");
      } else {
        console.warn("Backend returned no data when updating unload.");
        alert("Unload completed locally but backend returned no data.");
        navigate("/planning-detail");
      }
    } else {
      console.warn("No testingPartId available; unload not persisted.");
      alert("Unload completed locally but could not persist (no id).");
      navigate("/planning-detail");
    }
  } catch (error) {
    console.error("Failed to persist unload to backend", error);
    
    alert(
      "Unload completed locally but failed to persist to backend.\n" +
      "Error: " + (error instanceof Error ? error.message : "Unknown error") +
      "\nSee console for details."
    );
    navigate("/planning-detail");
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

  // const handleCompleteUTMUnload = async () => {
  //   try {
  //     if (!chamberData) return;

  //     const updatedParts = chamberData.parts?.map((part) => ({
  //       ...part,
  //       isCompleted: true,
  //       completedAt: new Date().toISOString(),
  //       testStatus: "completed",
  //     }));

  //     const payload = {
  //       ...(chamberData as any),
  //       parts: updatedParts,
  //       status: "completed",
  //       completedAt: new Date().toISOString(),
  //       testType: "UTM",
  //     };

  //     const testingPartId = (chamberData.id ?? (chamberData as any).loadId) as
  //       | string
  //       | number
  //       | undefined;

  //     if (testingPartId) {
  //       const response = await updateTestingPartInBackend(
  //         testingPartId,
  //         payload as any,
  //       );

  //       if (response) {
  //         console.log("UTM unload persisted to backend", response);
  //         alert("UTM test completed and persisted to backend.");
  //       } else {
  //         console.warn("Backend returned no data when updating UTM unload.");
  //         alert("UTM completed locally but backend returned no data.");
  //       }
  //     } else {
  //       console.warn("No testingPartId found; skipping backend persist.");
  //       alert("UTM completed locally; no id to persist.");
  //     }

  //     setShowUTMUnload(false);
  //     setShowUTMScan(false);
  //     setChamberData(null);
  //     setCustomColumns([]);
  //     setCustomColumnData({});
  //   } catch (error) {
  //     console.error("Error completing UTM unload", error);
  //     alert("Error completing unload. Please try again.");
  //   }
  // };

  const handleCompleteUTMUnload = async (
    updatedParts?: any[],
    utmMetadata?: any,
  ) => {
    try {
      if (!chamberData) return;

      // Merge updated parts with existing chamber data
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
          console.log(
            "Image paths saved:",
            finalParts.map((p) => ({
              partNumber: p.partNumber,
              postCosmetic: p.postCosmeticImage,
              postNonCosmetic: p.postNonCosmeticImage,
            })),
          );
        } else {
          console.warn("Backend returned no data when updating UTM unload.");
        }
      } else {
        console.warn("No testingPartId found; skipping backend persist.");
      }

      setShowUTMUnload(false);
      setShowUTMScan(false);
      setChamberData(null);
      setCustomColumns([]);
      setCustomColumnData({});
    } catch (error) {
      console.error("Error completing UTM unload", error);
      alert("Error completing unload. Please try again.");
    }
  };

  const handleUnloadButtonClick = () => {
    if (!chamberData) return;

    console.log("Full chamber data:", chamberData);
    console.log("Machine Details:", chamberData.machineDetails);
    console.log("Selected test:", chamberData.machineDetails?.selectedTest);
    console.log(
      "Machine Equipment2:",
      chamberData.machineDetails?.selectedTest?.machineEquipment2,
    );

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
        const totalCheckpoints = firstPart ? getCheckpointsForPart(firstPart).length : 0;
        const nextIndex = currentIndex + 1;
        if (nextIndex === totalCheckpoints - 1) {
          setAutoUnloadMode(isUTM ? "utm" : "normal");
        } else {
          setAutoUnloadMode(null);
        }
        handleProgressCheckpoint('0');
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
        const hasSubmittedT0 = part.checkpointData?.some(
          (cp) =>
            cp.checkpointIndex === 0 &&
            (cp.status === "pass" || cp.status === "fail"),
        );

        if (hasSubmittedT0) {
          return true;
        }

        const statusKey = `${index}-0`;
        const status = partCheckpointStatus[statusKey];
        const hasImageCoverage = hasRequiredImageData(part, index, 0);

        return Boolean(hasImageCoverage && status);
      });
    }

    const results = chamberData.parts.map((part) => {
      const checkpoints = getCheckpointsForPart(part);
      const hasNoCheckpoints =
        checkpoints.length === 0 ||
        (checkpoints.length === 1 && checkpoints[0] === 0);

      if (hasNoCheckpoints) {
        const hasT0Data = part.checkpointData?.some(
          (cp) =>
            cp.checkpointIndex === 0 &&
            (cp.status === "pass" || cp.status === "fail"),
        );

        return hasT0Data === true;
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
          submittedCheckpoints={submittedCheckpoints} // ✅ PASS THE STORED CHECKPOINTS
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
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
            {customColumns.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Custom columns:{" "}
                {customColumns.map((col) => col.name).join(", ")}
              </p>
            )}
          </div>

          {chamberData.parts.map((part, index) => (
            <PartCheckpointTable
              key={part.partNumber || part.serialNumber || index}
              part={part}
              partIndex={index}
              onRowSubmit={handleRowSubmit}
              onStatusChange={handleStatusChange}
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
              <div className="flex items-center gap-4">
                <button
                  onClick={()=>handleProgressCheckpoint(nextCheckpointLabel,chamberData.parts)}
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
