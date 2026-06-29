export const PROJECT_TYPES = {
    FLASH: "Flash",
    HULK: "Hulk"
} as const;

export const TEST_STATUS = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    FAILED: "Failed"
} as const;

export const IMAGE_TYPES = {
    COSMETIC: "cosmetic",
    NON_COSMETIC: "nonCosmetic"
} as const;

export const CHECKPOINT_STATUS = {
    PASS: "Pass",
    FAIL: "Fail",
    PENDING: "Pending"
} as const;

export const COLUMN_TYPES = {
    TEXT: "text",
    NUMBER: "number",
    DATE: "date",
    SELECT: "select",
    TEXTAREA: "textarea",
    IMAGE: "image"
} as const;

export const CHILD_TEST_STATUS = {
    PENDING: "pending",
    ACTIVE: "active",
    COMPLETED: "completed"
} as const;

export const SCAN_STATUS = {
    OK: "OK",
    SECOND_ROUND_OK: "SECOND_ROUND_OK",
    NO_MACHINE_DATA: "NO_MACHINE_DATA",
    VERIFIED: "VERIFIED"
} as const;

// Machine name mappings
export const MACHINE_NAME_MAPPINGS = {
    'dlsm random drop': 'DLSM RANDOM DROP',
    '1.25m random drop': '1.25M RANDOM DROP',
    'lm random drop': 'LM RANDOM DROP',
    'lm control drop': 'LM CONTROL DROP',
    'rock tumbler': 'ROCK TUMBLER',
    'x-rite spectralight iii': 'X-RITE SPECTRALIGHT III',
    'heat soak-01': 'HEAT SOAK-01',
    'heat soak-02': 'HEAT SOAK-02',
    'thermal cycle chamber': 'THERMAL CYCLE CHAMBER',
    'uv chamber': 'UV CHAMBER',
    'salt spray': 'SALT SPRAY',
    'taber linear abraser': 'TABER LINEAR ABRASER',
    'electromechanical utm instron': 'ELECTROMECHANICAL UTM INSTRON',
    'foot survivability test': 'FOOT SURVIVABILITY TEST',
    'oslr camera': 'OSLR Camera',
    'tap immersion': 'TAP Immersion',
    'pool immersion': 'POOL Immersion',
    'ocean immersion': 'OCEAN Immersion',
    'asi immersion': 'ASI Immersion'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
    CHAMBER_LOADS: 'chamberLoads',
    TEST_TIMER_STATES: 'testTimerStates',
    PART_IMAGES_DATA: 'partImagesData',
    CHECKPOINT_RESULTS: 'checkpointResults',
    OQC_TICKET_RECORDS: 'oqc_ticket_records',
    TICKET_ALLOCATIONS: 'ticket_allocations_array',
    CHECKPOINT_PASSED_PARTS: 'checkpointPassedParts',
    STAGE2_RECORDS: 'stage2Records',
    TESTING_LOAD_DATA: 'testingLoadData'
} as const;