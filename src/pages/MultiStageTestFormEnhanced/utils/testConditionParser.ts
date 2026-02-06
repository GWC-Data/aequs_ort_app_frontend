// Function to parse checkpoint hours from test condition
export const parseCheckpointHours = (testCondition: string): number[] => {
    console.log('Parsing test condition for checkpoint hours:', testCondition);
    
    if (!testCondition || !testCondition.toUpperCase().includes('CP:')) {
        console.log('No CP: found or empty condition');
        return [];
    }

    // Extract hours from format like "CP: T0, 72hr, 144hr, 216hr"
    const hoursMatch = testCondition.match(/\d+\s*hr/gi);
    console.log('Hours match found:', hoursMatch);
    
    if (!hoursMatch) return [];

    const hours = hoursMatch.map(h => parseInt(h.replace(/[^\d]/g, '')));
    console.log('Parsed hours:', hours);

    // Add T0 (0 hours) if present
    if (testCondition.toUpperCase().includes('T0')) {
        hours.unshift(0);
        console.log('Added T0 (0 hours)');
    }

    console.log('Final hours array:', hours.sort((a, b) => a - b));
    return hours.sort((a, b) => a - b);
};

// Function to get next checkpoint hour
export const getNextCheckpointHour = (testCondition: string, currentHour: number): number | null => {
    const checkpoints = parseCheckpointHours(testCondition);
    const currentIndex = checkpoints.indexOf(currentHour);

    if (currentIndex < checkpoints.length - 1) {
        return checkpoints[currentIndex + 1];
    }

    return null;
};

// Get current checkpoint for a part
export const getCurrentCheckpoint = (part: any, elapsedHours: number): {
    current: number,
    next: number | null,
    isComplete: boolean,
    checkpoints: number[]
} => {
    const checkpoints = parseCheckpointHours(part.testCondition || '');

    if (checkpoints.length === 0) {
        return { current: 0, next: null, isComplete: false, checkpoints: [] };
    }

    // Find current checkpoint
    let current = 0;
    let next: number | null = null;

    for (let i = 0; i < checkpoints.length; i++) {
        if (elapsedHours >= checkpoints[i]) {
            current = checkpoints[i];
            next = i < checkpoints.length - 1 ? checkpoints[i + 1] : null;
        } else {
            next = checkpoints[i];
            break;
        }
    }

    const isComplete = next === null && elapsedHours >= checkpoints[checkpoints.length - 1];

    return { current, next, isComplete, checkpoints };
};

// Calculate elapsed hours from timer
export const calculateElapsedHours = (timerStartTime: string | null): number => {
    if (!timerStartTime) return 0;

    const now = new Date();
    const startTime = new Date(timerStartTime);
    const elapsedMs = now.getTime() - startTime.getTime();
    return Math.floor(elapsedMs / (1000 * 60 * 60)); // Convert to hours
};

// Parse combined test names into child tests with sequential dependency
export const parseChildTests = (testName: string, machineEquipment: string, machineEquipment2: string): ChildTest[] => {
    const tests: ChildTest[] = [];

    if (testName.includes('+')) {
        // Split by '+' and trim
        const testNames = testName.split('+').map(name => name.trim()).filter(name => name);
        const machines = [machineEquipment, machineEquipment2].filter(m => m);

        testNames.forEach((name, index) => {
            const previousTestId = index > 0 ? `child-${Date.now()}-${index - 1}` : undefined;

            tests.push({
                id: `child-${Date.now()}-${index}`,
                name: name,
                machineEquipment: machines[index] || machines[0] || name,
                timing: "24", // Default timing
                isCompleted: false,
                status: index === 0 ? 'active' : 'pending',
                requiresImages: true, // All child tests require images by default
                dependsOnPrevious: index > 0, // All tests after first depend on previous
                previousTestId: previousTestId
            });
        });
    } else {
        // Single test
        tests.push({
            id: `child-${Date.now()}-0`,
            name: testName,
            machineEquipment: machineEquipment,
            timing: "24",
            isCompleted: false,
            status: 'active',
            requiresImages: true
        });
    }

    return tests;
};

// Helper function to normalize machine name
export const normalizeMachineName = (machineName: string) => {
    if (!machineName) return '';
    const name = machineName.toLowerCase().trim();

    const mappings = {
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
    };

    for (const [key, value] of Object.entries(mappings)) {
        if (name.includes(key) || key.includes(name)) {
            return value;
        }
    }

    return name;
};