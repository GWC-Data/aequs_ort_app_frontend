// ==================== FORM UTILITIES ====================

import type { ChildTest, FormRow, CustomColumn } from './types';

export const parseChildTests = (
  testName: string,
  machineEquipment: string,
  machineEquipment2: string,
): ChildTest[] => {
  const tests: ChildTest[] = [];

  if (testName.includes("+")) {
    const testNames = testName
      .split("+")
      .map((name) => name.trim())
      .filter((name) => name);
    const machines = [machineEquipment, machineEquipment2].filter((m) => m);

    testNames.forEach((name, index) => {
      const previousTestId =
        index > 0 ? `child-${Date.now()}-${index - 1}` : undefined;

      tests.push({
        id: `child-${Date.now()}-${index}`,
        name: name,
        machineEquipment: machines[index] || machines[0] || name,
        timing: "24",
        isCompleted: false,
        status: index === 0 ? "active" : "pending",
        requiresImages: true,
        dependsOnPrevious: index > 0,
        previousTestId: previousTestId,
      });
    });
  } else {
    tests.push({
      id: `child-${Date.now()}-0`,
      name: testName,
      machineEquipment: machineEquipment,
      timing: "24",
      isCompleted: false,
      status: "active",
      requiresImages: true,
    });
  }

  return tests;
};

export const createFormRow = (
  id: number,
  srNo: number,
  partNumber: string,
  serialNumber: string,
  childTestId?: string,
  childTestName?: string,
  isCheckpointRow: boolean = false,
  checkpointLabel?: string,
  customColumns?: CustomColumn[],
): FormRow => {
  const row: FormRow = {
    id,
    srNo,
    testDate: new Date().toISOString().split("T")[0],
    config: "",
    sampleId: partNumber,
    status: "Pending",
    partNumber,
    serialNumber,
    childTestId,
    childTestName,
    cosmeticImage: "",
    nonCosmeticImage: "",
    cosmeticImages: [],
    nonCosmeticImages: [],
    croppedImage: "",
    croppedImages: [],
    regionLabel: "",
    isCheckpointRow,
    checkpointLabel: checkpointLabel || "",
    checkpointStatus: "",
  };

  if (customColumns) {
    customColumns.forEach((col) => {
      row[col.id] = "";
    });
  }

  return row;
};

export const getTestConditionForPart = (partNumber: string): string => {
  try {
    const chamberLoadsStr = localStorage.getItem("chamberLoads");
    if (!chamberLoadsStr) return "";

    const chamberLoads = JSON.parse(chamberLoadsStr);

    for (const load of chamberLoads) {
      if (load.parts && Array.isArray(load.parts)) {
        const part = load.parts.find((p: any) => p.partNumber === partNumber);
        if (part && part.testCondition) {
          return part.testCondition;
        }
      }
    }

    return "";
  } catch (error) {
    console.error("Error getting test condition for part:", error);
    return "";
  }
};
