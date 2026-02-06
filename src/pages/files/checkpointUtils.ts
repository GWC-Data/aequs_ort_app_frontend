// ==================== CHECKPOINT MANAGEMENT ====================

import { normalizeCheckpointLabel } from './utils';

export const getCheckpointsForPart = (partNumber: string): string[] => {
  try {
    const chamberLoads = JSON.parse(
      localStorage.getItem("chamberLoads") || "[]",
    );

    for (const load of chamberLoads) {
      const part = load.parts?.find(
        (p: any) => p.partNumber === partNumber,
      );

      if (!part) continue;

      const testUnit = part.testUnit || load.testUnit;
      const normalizedUnit = testUnit?.toLowerCase().trim();

      const formatCheckpoint = (cp: any) => {
        const numericValue =
          typeof cp === "number" ? cp : parseFloat(cp as string);

        if (Number.isNaN(numericValue)) {
          return typeof cp === "string" ? cp : "";
        }

        if (
          numericValue === 0 ||
          (typeof cp === "string" && cp.toLowerCase() === "t0")
        ) {
          return "T0";
        }

        switch (normalizedUnit) {
          case "hours":
          case "hour":
            return `${numericValue} hrs`;
          case "cycles":
          case "cycle":
            return `${numericValue} cycles`;
          case "drops":
            return `${numericValue} drops`;
          case "grams":
            return `${numericValue} g`;
          case "orientation":
            return `${numericValue} deg`;
          default:
            return typeof cp === "string" ? cp : `${numericValue}`;
        }
      };

      if (
        part.checkpointInfo?.checkpoints &&
        Array.isArray(part.checkpointInfo.checkpoints)
      ) {
        return part.checkpointInfo.checkpoints.map((cp: any) =>
          typeof cp === "string" ? cp : formatCheckpoint(cp),
        );
      }

      if (Array.isArray(part.allCheckpoints)) {
        return part.allCheckpoints.map(formatCheckpoint);
      }

      if (Array.isArray(load.machineDetails?.selectedTest?.checkpoints)) {
        return load.machineDetails.selectedTest.checkpoints.map(
          formatCheckpoint,
        );
      }
    }

    return [];
  } catch (error) {
    console.error("Error resolving checkpoints for part:", error);
    return [];
  }
};

export const getNextCheckpointName = (partNumber: string): string => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (!chamberLoadsStr) return "";

    const chamberLoads = JSON.parse(chamberLoadsStr);

    for (const load of chamberLoads) {
      if (load.parts && Array.isArray(load.parts)) {
        const part = load.parts.find((p: any) => p.partNumber === partNumber);
        if (part && part.checkpointInfo) {
          const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;

          if (currentCheckpointIndex < checkpoints.length) {
            return checkpoints[currentCheckpointIndex];
          }
        }
      }
    }

    return "";
  } catch (error) {
    console.error("Error getting next checkpoint name:", error);
    return "";
  }
};

export const getCheckpointProgress = (
  partNumber: string,
): { completed: number; total: number } => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (chamberLoadsStr) {
      const chamberLoads = JSON.parse(chamberLoadsStr);

      for (const load of chamberLoads) {
        if (load.parts && Array.isArray(load.parts)) {
          const part = load.parts.find(
            (p: any) => p.partNumber === partNumber,
          );

          if (part) {
            let checkpoints: string[] = [];
            if (
              part.checkpointInfo &&
              Array.isArray(part.checkpointInfo.checkpoints)
            ) {
              checkpoints = part.checkpointInfo.checkpoints;
            } else if (Array.isArray(part.checkpoints)) {
              checkpoints = part.checkpoints;
            }

            if (!checkpoints.length) {
              checkpoints = getCheckpointsForPart(partNumber);
            }

            const total = checkpoints.length;

            let currentIndex = 0;
            if (
              part.checkpointInfo &&
              typeof part.checkpointInfo.currentCheckpointIndex === "number"
            ) {
              currentIndex = part.checkpointInfo.currentCheckpointIndex;
            } else if (
              part.checkpointInfo &&
              typeof part.checkpointInfo.checkpointIndex === "number"
            ) {
              currentIndex = part.checkpointInfo.checkpointIndex;
            } else if (typeof part.checkpointIndex === "number") {
              currentIndex = part.checkpointIndex;
            }

            const completed = total > 0 ? Math.min(currentIndex, total) : 0;

            if (total > 0) {
              return { completed, total };
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error getting checkpoint progress:", error);
  }

  return { completed: 0, total: 0 };
};

export const shouldShowCheckpointColumn = (partNumber: string, getTestConditionForPart: (pn: string) => string): boolean => {
  try {
    const chamberLoads = JSON.parse(
      localStorage.getItem("chamberLoads") || "[]",
    );

    for (const load of chamberLoads) {
      const part = load.parts?.find(
        (p: any) => p.partNumber === partNumber,
      );

      if (part) {
        const testUnit = part.testUnit || load.testUnit;
        const normalizedUnit = testUnit?.toLowerCase().trim();

        if (
          ["cycle", "drops", "grams", "orientation"].includes(normalizedUnit)
        ) {
          if (part.checkpointInfo) {
            const { currentCheckpointIndex, checkpoints } =
              part.checkpointInfo;

            const currentCheckpoint = checkpoints[currentCheckpointIndex];

            if (
              currentCheckpoint === "T0" ||
              currentCheckpoint === "0" ||
              currentCheckpoint?.toString().toLowerCase() === "t0" ||
              currentCheckpointIndex === 0
            ) {
              return false;
            }

            return currentCheckpointIndex > 0;
          }
          return false;
        }

        const testCondition = getTestConditionForPart(partNumber);
        if (testCondition) {
          const trimmed = testCondition.toUpperCase().trim();
          const conditionMatch =
            trimmed.startsWith("CP:") ||
            trimmed.startsWith("CP ") ||
            /^CP[:]?\s/.test(trimmed);

          if (conditionMatch) return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking testUnit for column:", error);
    return false;
  }
};

export const shouldShowCheckpointButton = (
  row: any | undefined,
  partNumber: string,
): boolean => {
  try {
    const chamberLoads = JSON.parse(
      localStorage.getItem("chamberLoads") || "[]",
    );

    for (const load of chamberLoads) {
      const part = load.parts?.find((p: any) => p.partNumber === partNumber);

      if (part) {
        const testUnit = part.testUnit || load.testUnit;
        const normalizedUnit = testUnit?.toLowerCase().trim();

        if (
          ["drops", "grams", "orientation", "cycle"].includes(normalizedUnit)
        ) {
          if (part.checkpointInfo) {
            const { checkpoints, currentCheckpointIndex } =
              part.checkpointInfo;

            if (currentCheckpointIndex < checkpoints.length) {
              return true;
            }
          }

          return true;
        }

        if (part.checkpointInfo) {
          const { checkpoints, currentCheckpointIndex } = part.checkpointInfo;
          return currentCheckpointIndex < checkpoints.length;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking checkpoint button visibility:", error);
    return false;
  }
};

export const syncCheckpointDataFromChamberLoads =
  (
    chamberLoads: any[],
    normalizeLabel: (label: string | number | null | undefined) => string,
  ) =>
  (prev: any): any => {
    const updatedForms = { ...prev };
    let anyChanges = false;

    Object.keys(updatedForms).forEach((formKey) => {
      const formData = updatedForms[formKey];
      if (!formData || !Array.isArray(formData.rows)) {
        return;
      }

      let formChanged = false;

      const updatedRows = formData.rows.map((row: any) => {
        if (!row.isCheckpointRow) {
          return row;
        }

        let matchedPart: any = null;
        let rowCheckpointData: any = null;

        for (const load of chamberLoads) {
          if (!Array.isArray(load.parts)) {
            continue;
          }

          const candidate = load.parts.find(
            (p: any) => p.partNumber === row.partNumber,
          );

          if (candidate) {
            matchedPart = candidate;

            if (
              candidate.checkpointScans &&
              typeof row.checkpointNumber !== "undefined" &&
              candidate.checkpointScans[row.checkpointNumber]
            ) {
              rowCheckpointData =
                candidate.checkpointScans[row.checkpointNumber];
            }
            break;
          }
        }

        let nextRow = row;

        if (rowCheckpointData) {
          const updatedRow = {
            ...nextRow,
            cosmeticImages:
              rowCheckpointData.cosmeticImages || nextRow.cosmeticImages,
            cosmeticImage:
              rowCheckpointData.cosmeticImages?.[0] || nextRow.cosmeticImage,
            nonCosmeticImages:
              rowCheckpointData.nonCosmeticImages ||
              nextRow.nonCosmeticImages,
            nonCosmeticImage:
              rowCheckpointData.nonCosmeticImages?.[0] ||
              nextRow.nonCosmeticImage,
          };

          if (
            updatedRow.cosmeticImage !== nextRow.cosmeticImage ||
            updatedRow.nonCosmeticImage !== nextRow.nonCosmeticImage ||
            updatedRow.cosmeticImages !== nextRow.cosmeticImages ||
            updatedRow.nonCosmeticImages !== nextRow.nonCosmeticImages
          ) {
            nextRow = updatedRow;
          }
        }

        if (matchedPart && !nextRow.checkpointStatus) {
          const normalizedLabel = normalizeLabel(nextRow.checkpointLabel);

          let derivedStatus: "Pass" | "Fail" | undefined;

          const history = matchedPart.checkpointInfo?.checkpointHistory || [];
          if (Array.isArray(history) && history.length > 0) {
            const historyMatch = history.find(
              (entry: any) =>
                normalizeLabel(entry?.checkpoint) === normalizedLabel,
            );

            if (
              historyMatch &&
              (historyMatch.status === "Pass" ||
                historyMatch.status === "Fail")
            ) {
              derivedStatus = historyMatch.status;
            }
          }

          if (!derivedStatus) {
            const checkpoints = matchedPart.checkpointInfo?.checkpoints || [];
            const checkpointIndex = checkpoints.findIndex(
              (cp: any) => normalizeLabel(cp) === normalizedLabel,
            );

            const currentIndex = (() => {
              const infoIndex =
                matchedPart.checkpointInfo?.currentCheckpointIndex;
              if (typeof infoIndex === "number") return infoIndex;
              const legacyIndex = matchedPart.checkpointInfo?.checkpointIndex;
              if (typeof legacyIndex === "number") return legacyIndex;
              if (typeof matchedPart.checkpointIndex === "number") {
                return matchedPart.checkpointIndex;
              }
              return undefined;
            })();

            if (
              typeof currentIndex === "number" &&
              checkpointIndex > -1 &&
              checkpointIndex < currentIndex
            ) {
              derivedStatus = "Pass";
            }
          }

          if (derivedStatus) {
            const updatedRow = {
              ...nextRow,
              checkpointStatus: derivedStatus,
              status:
                derivedStatus === "Pass"
                  ? "Pass"
                  : derivedStatus === "Fail"
                    ? "Fail"
                    : nextRow.status,
            };

            if (
              updatedRow.checkpointStatus !== nextRow.checkpointStatus ||
              updatedRow.status !== nextRow.status
            ) {
              nextRow = updatedRow;
            }
          }
        }

        if (nextRow !== row) {
          formChanged = true;
        }

        return nextRow;
      });

      if (formChanged) {
        updatedForms[formKey] = {
          ...formData,
          rows: updatedRows,
        };
        anyChanges = true;
      }
    });

    return anyChanges ? updatedForms : prev;
  };
