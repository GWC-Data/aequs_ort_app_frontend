// src/data/machineMapping.ts
export interface MachineDetails {
  id: string;
  name: string;
  description: string;
}

export const machineMapping: MachineDetails[] = [
  { id: 'ORD-001', name: '0.5M RANDOM DROP', description: '0.5M RANDOM DROP' },
  { id: 'ORD-002', name: '1.25M RANDOM DROP', description: '1.25M RANDOM DROP' },
  { id: 'ORD-003', name: '1M RANDOM DROP', description: '1M RANDOM DROP' },
  { id: '4165', name: '1M CONTROL DROP', description: '1M CONTROL DROP' },
  { id: 'ORT-001', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'ORT-002', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'ORT-003', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'ORT-004', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'ORT-005', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'ORT-006', name: 'ROCK TUMBLER', description: 'ROCK TUMBLER' },
  { id: 'M-192', name: 'X-RITE SPECTRALIGHT III', description: 'X-RITE SPECTRALIGHT III' },
  { id: 'A10000052', name: 'HEAT SOAK-01', description: 'HEAT SOAK-01' },
  { id: 'AQS-U3-01', name: 'HEAT SOAK-02', description: 'HEAT SOAK-02' },
  { id: 'AQS-U3-02', name: 'THERMAL CYCLE CHAMBER', description: 'THERMAL CYCLE CHAMBER' },
  { id: '32261', name: 'UV CHAMBER', description: 'UV CHAMBER' },
  { id: '32259', name: 'SALT SPRAY', description: 'SALT SPRAY' },
  { id: '20231191', name: 'TABER LINEAR ABRASER', description: 'TABER LINEAR ABRASER' },
  { id: 'M-125', name: 'ELECTROMECHANICAL UTM INSTRON', description: 'ELECTROMECHANICAL UTM INSTRON' },
  { id: 'SF20240111FW03001', name: 'FOOT SURVIVABILITY TEST', description: 'FOOT SURVIVABILITY TEST' },
  { id: '348102/ODCS001', name: 'DSLR Camera', description: 'DSLR Camera' },
  { id: 'IBA2041905', name: 'TAP Immersion', description: 'TAP Immersion' },
  { id: 'IBA2041904', name: 'POOL Immersion', description: 'POOL Immersion' },
  { id: 'IBA2039109', name: 'OCEAN Immersion', description: 'OCEAN Immersion' },
  { id: 'PCD73239004001', name: 'ASI Immersion', description: 'ASI Immersion' }
];

// Helper function to find machine details by name
// In src/data/machineMapping.ts - update the getMachineDetails function
export const getMachineDetails = (machineName: string): MachineDetails => {
  if (!machineName) return { id: '', name: machineName, description: machineName };
  
  const normalizedInput = machineName.toLowerCase().trim();
  
  // First, try exact match
  const exactMatch = machineMapping.find(machine => 
    machine.name.toLowerCase() === normalizedInput
  );
  
  if (exactMatch) return exactMatch;
  
  // Try partial match for known variations - only for names in our mapping
  const variations: Record<string, string> = {
    'hardness machine': 'HARDNESS MACHINE',
    'taber linear abrasion': 'TABER LINEAR ABRASER',
    'taber leanear abbraster': 'TABER LINEAR ABRASER',
    'heat soak': 'HEAT SOAK-01',
    'heat soak + steel rain': 'HEAT SOAK-01',
    'instron': 'ELECTROMECHANICAL UTM INSTRON',
    'utm': 'ELECTROMECHANICAL UTM INSTRON',
    'random drop': '1M RANDOM DROP',
    'thermal cycle': 'THERMAL CYCLE CHAMBER',
    'salt spray': 'SALT SPRAY',
    'uv': 'UV CHAMBER',
    'rock tumble': 'ROCK TUMBLER',
    'foot survivability': 'FOOT SURVIVABILITY TEST',
    'asi immersion': 'ASI Immersion',
    'ocean immersion': 'OCEAN Immersion',
    'pool immersion': 'POOL Immersion',
    'tap immersion': 'TAP Immersion'
  };
  
  // Remove 'out source' and 'ckv1' from variations since they're not in your mapping
  
  for (const [key, value] of Object.entries(variations)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      const match = machineMapping.find(m => m.name === value);
      if (match) return match;
    }
  }
  
  // If no match found, check if this machine exists in our mapping with partial match
  const partialMatch = machineMapping.find(machine => 
    machine.name.toLowerCase().includes(normalizedInput) ||
    normalizedInput.includes(machine.name.toLowerCase())
  );
  
  if (partialMatch) return partialMatch;
  
  // If no match found at all, return a placeholder
  return { 
    id: 'N/A', 
    name: machineName, 
    description: `Unknown: ${machineName}` 
  };
};