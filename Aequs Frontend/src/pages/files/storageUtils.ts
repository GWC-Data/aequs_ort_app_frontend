// ==================== LOCALSTORAGE UTILITIES ====================

import type { TimerStatus } from './types';
import { getBackendApiUrl } from '@/lib/backendApi';

export const loadTimerStateFromChamberLoads = (
  loadId: number,
  childTestId?: string
): TimerStatus | null => {
  try {
    const raw = localStorage.getItem("chamberLoads");
    if (!raw) return null;

    const loads = JSON.parse(raw);
    const load = loads.find((l: any) => l.id === loadId || l.loadId === loadId);

    if (!load || !load.timerStatus) return null;

    return {
      remainingSeconds: load.timerRemainingSeconds ?? 0,
      isRunning: load.timerStatus === "start",
      startTime: load.timerStartTime ?? null,
      stopTime: load.timerStopTime ?? null,
      lastUpdated: load.lastUpdated ?? null,
    };
  } catch (error) {
    console.error("Error loading timer state:", error);
    return null;
  }
};

export const updateChamberLoadsTimer = (
  loadId: number,
  testId: string,
  timerStatus: "start" | "stop",
  timerData: TimerStatus,
) => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (!chamberLoadsStr) {
      console.warn("No chamberLoads found in localStorage");
      return;
    }

    const chamberLoads = JSON.parse(chamberLoadsStr);
    const loadIndex = chamberLoads.findIndex(
      (load: any) => load.id === loadId
    );

    if (loadIndex === -1) {
      console.warn(`Load with ID ${loadId} not found`);
      return;
    }

    const updatedLoad = {
      ...chamberLoads[loadIndex],
      timerStatus: timerStatus,
      timerStartTime:
        timerStatus === "start"
          ? timerData.startTime
          : chamberLoads[loadIndex].timerStartTime,
      timerStopTime: timerStatus === "stop" ? timerData.stopTime : undefined,
      timerLastUpdated: timerData.lastUpdated,
      timerRemainingSeconds: timerData.remainingSeconds,
      machineDetails: {
        ...chamberLoads[loadIndex].machineDetails,
        tests: chamberLoads[loadIndex].machineDetails.tests.map(
          (test: any) => {
            if (test.id === testId) {
              return {
                ...test,
                timerStatus: timerStatus,
                timerStartTime:
                  timerStatus === "start"
                    ? timerData.startTime
                    : test.timerStartTime,
                timerStopTime:
                  timerStatus === "stop" ? timerData.stopTime : undefined,
                timerLastUpdated: timerData.lastUpdated,
                timerRemainingSeconds: timerData.remainingSeconds,
                status: timerStatus === "start" ? 2 : test.status,
                statusText:
                  timerStatus === "start" ? "In Progress" : test.statusText,
              };
            }
            return test;
          },
        ),
      },
    };

    chamberLoads[loadIndex] = updatedLoad;
    localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));

    console.log("Chamber loads updated successfully:", updatedLoad);
  } catch (error) {
    console.error("Error updating chamber loads timer:", error);
  }
};

export const updateCheckpointStatusInChamberLoads = (
  partNumber: string,
  checkpointHour: number,
  status: "Pass" | "Fail",
  processed: boolean = true,
) => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (!chamberLoadsStr) return;

    const chamberLoads = JSON.parse(chamberLoadsStr);
    let updated = false;

    const updatedLoads = chamberLoads.map((load: any) => {
      if (load.parts && Array.isArray(load.parts)) {
        const updatedParts = load.parts.map((part: any) => {
          if (
            part.partNumber === partNumber &&
            part.checkpointScans &&
            part.checkpointScans[checkpointHour]
          ) {
            updated = true;

            part.checkpointScans[checkpointHour] = {
              ...part.checkpointScans[checkpointHour],
              status: status,
              processed: processed,
            };

            if (!part.checkpointHistory) {
              part.checkpointHistory = [];
            }

            part.checkpointHistory.push({
              hour: checkpointHour,
              status: status,
              testedAt: new Date().toISOString(),
            });

            if (part.checkpointInfo) {
              part.checkpointInfo.lastStatus = status;
              part.checkpointInfo.lastUpdated = new Date().toISOString();
            }

            return part;
          }
          return part;
        });

        return {
          ...load,
          parts: updatedParts,
        };
      }
      return load;
    });

    if (updated) {
      localStorage.setItem("chamberLoads", JSON.stringify(updatedLoads));
      console.log(
        `Updated checkpoint status for ${partNumber} at hour ${checkpointHour}: ${status}`,
      );
    }
  } catch (error) {
    console.error("Error updating checkpoint status in chamberLoads:", error);
  }
};

export const updateCheckpointImagesInChamberLoads = (
  partNumber: string,
  checkpointLabel: string,
  type: "cosmetic" | "nonCosmetic" | "cropped",
  imageUrl: string,
) => {
  try {
    const chamberLoads = JSON.parse(
      localStorage.getItem("chamberLoads") || "[]",
    );

    let updated = false;

    for (let i = 0; i < chamberLoads.length; i++) {
      const load = chamberLoads[i];
      if (load.parts && Array.isArray(load.parts)) {
        for (let j = 0; j < load.parts.length; j++) {
          const part = load.parts[j];
          if (
            part.partNumber === partNumber &&
            part.checkpointInfo &&
            part.checkpointInfo.checkpointHistory
          ) {
            const historyIndex =
              part.checkpointInfo.checkpointHistory.findIndex(
                (h: any) => h.checkpoint === checkpointLabel,
              );

            if (historyIndex >= 0) {
              if (
                !chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                  historyIndex
                ].images
              ) {
                chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                  historyIndex
                ].images = {
                  cosmetic: [],
                  nonCosmetic: [],
                  cropped: [],
                };
              }

              chamberLoads[i].parts[j].checkpointInfo.checkpointHistory[
                historyIndex
              ].images[type].push(imageUrl);
              updated = true;
              break;
            } else {
              chamberLoads[i].parts[j].checkpointInfo.checkpointHistory.push({
                checkpoint: checkpointLabel,
                completedAt: new Date().toISOString(),
                status: "Pending",
                images: {
                  cosmetic: type === "cosmetic" ? [imageUrl] : [],
                  nonCosmetic: type === "nonCosmetic" ? [imageUrl] : [],
                  cropped: type === "cropped" ? [imageUrl] : [],
                },
              });
              updated = true;
              break;
            }
          }
        }
        if (updated) break;
      }
    }

    if (updated) {
      localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));
      console.log(
        `Updated ${type} image for checkpoint ${checkpointLabel} in chamberLoads`,
      );
    }
  } catch (error) {
    console.error("Error updating checkpoint images in chamberLoads:", error);
  }
};

export const updateChamberLoadsWithNewImages = (
  partNumber: string,
  type: "cosmetic" | "nonCosmetic",
  imageUrl: string,
  childTestId?: string,
  isFinal: boolean = false,
) => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (!chamberLoadsStr) return;

    const chamberLoads = JSON.parse(chamberLoadsStr);
    let updated = false;

    for (let i = 0; i < chamberLoads.length; i++) {
      const load = chamberLoads[i];
      if (load.parts && Array.isArray(load.parts)) {
        for (let j = 0; j < load.parts.length; j++) {
          const part = load.parts[j];
          if (part.partNumber === partNumber) {
            if (!part.cosmeticImages) part.cosmeticImages = [];
            if (!part.nonCosmeticImages) part.nonCosmeticImages = [];

            if (isFinal) {
              if (!part.finalCosmeticImages) part.finalCosmeticImages = [];
              if (!part.finalNonCosmeticImages)
                part.finalNonCosmeticImages = [];

              if (type === "cosmetic") {
                if (!part.finalCosmeticImages.includes(imageUrl)) {
                  chamberLoads[i].parts[j].finalCosmeticImages.push(imageUrl);
                  updated = true;
                }
              } else {
                if (!part.finalNonCosmeticImages.includes(imageUrl)) {
                  chamberLoads[i].parts[j].finalNonCosmeticImages.push(
                    imageUrl,
                  );
                  updated = true;
                }
              }
            } else {
              if (type === "cosmetic") {
                if (!part.cosmeticImages.includes(imageUrl)) {
                  chamberLoads[i].parts[j].cosmeticImages.push(imageUrl);
                  chamberLoads[i].parts[j].hasImages = true;
                  updated = true;
                }
              } else {
                if (!part.nonCosmeticImages.includes(imageUrl)) {
                  chamberLoads[i].parts[j].nonCosmeticImages.push(imageUrl);
                  chamberLoads[i].parts[j].hasImages = true;
                  updated = true;
                }
              }
            }

            break;
          }
        }
        if (updated) break;
      }
    }

    if (updated) {
      localStorage.setItem("chamberLoads", JSON.stringify(chamberLoads));
      console.log(
        `Updated ${isFinal ? "final " : ""}${type} image for ${partNumber} in chamberLoads`,
      );
    }
  } catch (error) {
    console.error("Error updating chamberLoads with new images:", error);
  }
};

export const loadImagesFromStorage = (
  partNumber: string,
  childTestId?: string,
  currentRecord?: any,
): {
  cosmeticImages: string[];
  nonCosmeticImages: string[];
  finalCosmeticImages?: string[];
  finalNonCosmeticImages?: string[];
  utmCroppedImages?: Record<string, string>;
} => {
  try {
    const toAbsoluteImage = (value: unknown): string | null => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
        return trimmed;
      }
      const baseUrl = getBackendApiUrl().replace(/\/$/, "");
      const normalizedPath = trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
      return `${baseUrl}${normalizedPath}`;
    };

    const toAbsoluteList = (values?: unknown): string[] => {
      if (!Array.isArray(values)) {
        return [];
      }
      const resolved = values
        .map((item) => toAbsoluteImage(item))
        .filter((item): item is string => Boolean(item));
      return Array.from(new Set(resolved));
    };

    const mergeUnique = (
      primary: string[],
      ...additional: string[][]
    ): string[] => {
      const seen = new Set<string>();
      const result: string[] = [];

      const append = (list?: string[]) => {
        list?.forEach((value) => {
          if (typeof value !== "string") {
            return;
          }
          const key = value.trim();
          if (!key || seen.has(key)) {
            return;
          }
          seen.add(key);
          result.push(value);
        });
      };

      append(primary);
      additional.forEach((list) => append(list));
      return result;
    };

    let chamberCosmeticImages: string[] = [];
    let chamberNonCosmeticImages: string[] = [];
    let chamberFinalCosmeticImages: string[] = [];
    let chamberFinalNonCosmeticImages: string[] = [];
    let utmImages: Record<string, string> = {};

    try {
      const chamberLoadsStr = localStorage.getItem("chamberLoads");
      if (chamberLoadsStr) {
        const chamberLoads = JSON.parse(chamberLoadsStr);
        const preferredLoadId = currentRecord?.machineLoadData?.loadId;

        const searchLoads = (loads: any[], allowAnyLoad = false): boolean => {
          for (const load of loads) {
            if (
              !allowAnyLoad &&
              preferredLoadId !== undefined &&
              load.id !== preferredLoadId &&
              load.loadId !== preferredLoadId
            ) {
              continue;
            }

            const part = load.parts?.find(
              (p: any) => p.partNumber === partNumber,
            );

            if (!part) {
              continue;
            }

            chamberCosmeticImages = toAbsoluteList(part.cosmeticImages);
            chamberNonCosmeticImages = toAbsoluteList(part.nonCosmeticImages);
            chamberFinalCosmeticImages = toAbsoluteList(
              part.finalCosmeticImages ||
                part.unloadCosmeticImages ||
                part.cosmeticImagesFinal,
            );
            chamberFinalNonCosmeticImages = toAbsoluteList(
              part.finalNonCosmeticImages ||
                part.unloadNonCosmeticImages ||
                part.nonCosmeticImagesFinal,
            );

            if (childTestId && part.utmCroppedImages) {
              const candidate =
                part.utmCroppedImages[childTestId] ||
                part.utmCroppedImages.default;
              if (candidate && typeof candidate === "object") {
                utmImages = candidate;
              }
            }

            if (
              chamberCosmeticImages.length > 0 ||
              chamberNonCosmeticImages.length > 0 ||
              chamberFinalCosmeticImages.length > 0 ||
              chamberFinalNonCosmeticImages.length > 0
            ) {
              return true;
            }
          }
          return false;
        };

        const foundInPreferred = searchLoads(chamberLoads);
        if (!foundInPreferred) {
          searchLoads(chamberLoads, true);
        }
      }
    } catch (error) {
      console.error("Error loading chamber load images:", error);
    }

    const backendPart = currentRecord?.machineLoadData?.parts?.find(
      (part: any) => part.partNumber === partNumber,
    ) as
      | (any & {
          finalCosmeticImages?: unknown;
          finalNonCosmeticImages?: unknown;
        })
      | undefined;

    const backendCosmeticImages = toAbsoluteList(backendPart?.cosmeticImages);
    const backendNonCosmeticImages = toAbsoluteList(
      backendPart?.nonCosmeticImages,
    );
    const backendFinalCosmeticImages = toAbsoluteList(
      backendPart?.finalCosmeticImages,
    );
    const backendFinalNonCosmeticImages = toAbsoluteList(
      backendPart?.finalNonCosmeticImages,
    );

    const cachedCosmeticImages: string[] = [];
    const cachedNonCosmeticImages: string[] = [];
    const cachedFinalCosmeticImages: string[] = [];
    const cachedFinalNonCosmeticImages: string[] = [];

    const cosmeticImages = mergeUnique(
      cachedCosmeticImages,
      chamberCosmeticImages,
      backendCosmeticImages,
    );
    const nonCosmeticImages = mergeUnique(
      cachedNonCosmeticImages,
      chamberNonCosmeticImages,
      backendNonCosmeticImages,
    );
    const finalCosmeticImages = mergeUnique(
      cachedFinalCosmeticImages,
      chamberFinalCosmeticImages,
      backendFinalCosmeticImages,
    );
    const finalNonCosmeticImages = mergeUnique(
      cachedFinalNonCosmeticImages,
      chamberFinalNonCosmeticImages,
      backendFinalNonCosmeticImages,
    );

    return {
      cosmeticImages,
      nonCosmeticImages,
      finalCosmeticImages,
      finalNonCosmeticImages,
      utmCroppedImages: utmImages,
    };
  } catch (error) {
    console.error("Error loading images from storage:", error);
    return {
      cosmeticImages: [],
      nonCosmeticImages: [],
      finalCosmeticImages: [],
      finalNonCosmeticImages: [],
      utmCroppedImages: {},
    };
  }
};
