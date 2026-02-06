// ==================== CONSTANTS ====================

export const REFERENCE_IMAGE_WIDTH = 480;
export const REFERENCE_IMAGE_HEIGHT = 320;

export const PREDEFINED_REGIONS = [
  { x: 32, y: 20, width: 60, height: 50, label: "FT-1" },
  { x: 112, y: 20, width: 50, height: 50, label: "CL-1" },
  { x: 170, y: 20, width: 50, height: 50, label: "CL-2" },
  { x: 228, y: 20, width: 50, height: 50, label: "CL-3" },
  { x: 286, y: 20, width: 50, height: 50, label: "CL-4" },
  { x: 360, y: 20, width: 60, height: 50, label: "FT-2" },
  { x: 32, y: 85, width: 55, height: 45, label: "SS-1" },
  { x: 370, y: 85, width: 55, height: 45, label: "SS-2" },
  { x: 32, y: 210, width: 55, height: 70, label: "FT-4" },
  { x: 370, y: 210, width: 55, height: 70, label: "SS-3" },
  { x: 100, y: 250, width: 60, height: 50, label: "SS-4" },
  { x: 280, y: 250, width: 60, height: 50, label: "FT-3" },
];

export const YELLOW_LABELS = [
  "FT-1",
  "CL-1",
  "CL-2",
  "CL-3",
  "CL-4",
  "FT-2",
  "SS-1",
  "SS-2",
  "FT-4",
  "SS-3",
  "SS-4",
  "FT-3",
];

export const LABEL_CATEGORY_MAP = {
  "ft-1": { form: "footPushOut", id: "F1" },
  "ft-2": { form: "footPushOut", id: "F2" },
  "ft-3": { form: "footPushOut", id: "F3" },
  "ft-4": { form: "footPushOut", id: "F4" },
  "cl-1": { form: "pullTestCleat", id: "Cleat 1" },
  "cl-2": { form: "pullTestCleat", id: "Cleat 2" },
  "cl-3": { form: "pullTestCleat", id: "Cleat 3" },
  "cl-4": { form: "pullTestCleat", id: "Cleat 4" },
  "ss-1": { form: "sidesnap", id: "Side snap 1" },
  "ss-2": { form: "sidesnap", id: "Side snap 2" },
  "ss-3": { form: "sidesnap", id: "Side snap 3" },
  "ss-4": { form: "sidesnap", id: "Side snap 4" },
};

export const MACHINE_NAME_MAPPINGS = {
  "dlsm random drop": "DLSM RANDOM DROP",
  "1.25m random drop": "1.25M RANDOM DROP",
  "lm random drop": "LM RANDOM DROP",
  "lm control drop": "LM CONTROL DROP",
  "rock tumbler": "ROCK TUMBLER",
  "x-rite spectralight iii": "X-RITE SPECTRALIGHT III",
  "heat soak-01": "HEAT SOAK-01",
  "heat soak-02": "HEAT SOAK-02",
  "thermal cycle chamber": "THERMAL CYCLE CHAMBER",
  "uv chamber": "UV CHAMBER",
  "salt spray": "SALT SPRAY",
  "taber linear abraser": "TABER LINEAR ABRASER",
  "electromechanical utm instron": "ELECTROMECHANICAL UTM INSTRON",
  "foot survivability test": "FOOT SURVIVABILITY TEST",
  "oslr camera": "OSLR Camera",
  "tap immersion": "TAP Immersion",
  "pool immersion": "POOL Immersion",
  "ocean immersion": "OCEAN Immersion",
  "asi immersion": "ASI Immersion",
};
