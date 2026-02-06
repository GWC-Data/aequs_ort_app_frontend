// ==================== UTILITY FUNCTIONS ====================

import { YELLOW_LABELS, LABEL_CATEGORY_MAP, MACHINE_NAME_MAPPINGS, PREDEFINED_REGIONS } from './constants';

export const normalizeCheckpointLabel = (
  label: string | number | null | undefined,
): string =>
  typeof label === "number"
    ? label.toString().trim().toLowerCase()
    : (label || "").toString().trim().toLowerCase();

export const detectLabelText = (
  imageData: string,
  regionId: number,
  regions: any[],
  hasYellowMarks: boolean,
): string => {
  if (hasYellowMarks) {
    const sortedRegions = [...regions].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
      return a.x - b.x;
    });

    const sortedIndex = sortedRegions.findIndex(
      (region) =>
        region.x === regions[regionId].x && region.y === regions[regionId].y,
    );

    return YELLOW_LABELS[sortedIndex] || `Yellow-${sortedIndex + 1}`;
  } else {
    return regions[regionId]?.label || `Region ${regionId + 1}`;
  }
};

export const getLabelCategory = (label: string) => {
  if (!label) return null;

  const lower = label.toLowerCase().trim();

  // Check predefined mappings
  if (LABEL_CATEGORY_MAP[lower as keyof typeof LABEL_CATEGORY_MAP]) {
    return LABEL_CATEGORY_MAP[lower as keyof typeof LABEL_CATEGORY_MAP];
  }

  // Backward compatibility checks
  if (
    lower.includes("f1") ||
    lower.includes("f2") ||
    lower.includes("f3") ||
    lower.includes("f4")
  ) {
    return { form: "footPushOut", id: label.toUpperCase() };
  }

  if (lower.includes("cleat")) {
    return { form: "pullTestCleat", id: label };
  }

  if (lower.includes("side snap")) {
    return { form: "sidesnap", id: label };
  }

  return null;
};

export const normalizeMachineName = (machineName: string) => {
  if (!machineName) return "";
  const name = machineName.toLowerCase().trim();

  for (const [key, value] of Object.entries(MACHINE_NAME_MAPPINGS)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }

  return name;
};

export const getTestStatusText = (statusCode: number) => {
  switch (statusCode) {
    case 1:
      return "Pending";
    case 2:
      return "In Progress";
    case 3:
      return "Completed";
    case 4:
      return "Failed";
    default:
      return "Unknown";
  }
};

export const convertCheckpointToMinutes = (checkpoint: string): number => {
  if (!checkpoint) {
    console.warn("Checkpoint is undefined or null");
    return 0;
  }

  if (checkpoint.toLowerCase().includes("t0")) return 0;

  const match = checkpoint.match(/(\d+)\s*hr/i);
  if (match) {
    return parseInt(match[1]) * 60;
  }

  return 0;
};

export const getRemainingTimeUntilCheckpoint = (
  lastCheckpointTime: string | null,
  nextCheckpointMinutes: number,
): number => {
  if (!lastCheckpointTime) return 0;

  const lastTime = new Date(lastCheckpointTime).getTime();
  const currentTime = new Date().getTime();
  const minutesPassed = (currentTime - lastTime) / (1000 * 60);

  return Math.max(0, nextCheckpointMinutes - minutesPassed);
};

export const parseCheckpointsFromCondition = (testCondition: string): string[] => {
  if (!testCondition) return [];

  const cpMatch = testCondition.match(/CP[:\s]+([^,\n]+(?:,\s*[^,\n]+)*)/i);
  if (!cpMatch) return [];

  const checkpoints = cpMatch[1]
    .split(",")
    .map((cp) => cp.trim())
    .filter((cp) => cp && cp.length > 0);

  console.log(
    "Parsed checkpoints from condition:",
    testCondition,
    "→",
    checkpoints,
  );
  return checkpoints;
};

export const shouldAutoEnableCheckpoint = (testCondition: string): boolean => {
  if (!testCondition) return false;

  const lowerCondition = testCondition.toLowerCase();
  const autoEnableUnits = ["drops", "grams", "orientations", "cycle"];

  return autoEnableUnits.some((unit) => lowerCondition.includes(unit));
};
