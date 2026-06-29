export interface ProductData {
  id: string;
  batch: string;
  owner: string;
  qqc: string;
  cmr: string;
  testProgress: {
    completed: number;
    total: number;
  };
  status: string;
  statusColor: string;
}

export interface ActiveTest {
  name: string;
  status: string;
  statusColor: string;
}

export interface SystemStatusItem {
  name: string;
  status: string;
  statusColor: string;
}

export interface RightMenuItem {
  title: string;
  subtitle?: string;
  subtitle2?: string;
  subtitle3?: string;
}

export interface DashboardStats {
  totalProducts: number;
  underTesting: number;
  completed: number;
  scheduled: number;
}

// Dashboard Statistics
export const dashboardStats: DashboardStats = {
  totalProducts: 5,
  underTesting: 1,
  completed: 1,
  scheduled: 1
};

// All Products Data
export const allProducts: ProductData[] = [
  {
    id: "PROD-2025-001",
    batch: "Batch 2025 Q1 v.22",
    owner: "Assembly Line 1",
    qqc: "2025-05-25 09:00",
    cmr: "2025-05-15 10:35",
    testProgress: { completed: 2, total: 5 },
    status: "Under Testing",
    statusColor: "bg-blue-500 hover:bg-blue-600"
  },
  {
    id: "PROD-2025-002",
    batch: "Batch 2025 Q1 v.23",
    owner: "Assembly Line 1",
    qqc: "2025-05-25 10:00",
    cmr: "2025-05-15 10:45",
    testProgress: { completed: 5, total: 5 },
    status: "Complete",
    statusColor: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "PROD-2025-003",
    batch: "",
    owner: "Assembly Line 1",
    qqc: "2025-05-25 10:00",
    cmr: "2025-05-16 08:30",
    testProgress: { completed: 0, total: 5 },
    status: "Scheduled",
    statusColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "PROD-2025-004",
    batch: "Batch 2025 Q1 v.25",
    owner: "Assembly Line 2",
    qqc: "",
    cmr: "2025-05-15 12:35",
    testProgress: { completed: 0, total: 5 },
    status: "In Queue",
    statusColor: "bg-yellow-500 hover:bg-yellow-600"
  },
  {
    id: "PROD-2025-005",
    batch: "Batch 2025 Q1 v.26",
    owner: "Assembly Line 2",
    qqc: "2025-05-28 08:00",
    cmr: "2025-05-15 14:30",
    testProgress: { completed: 5, total: 5 },
    status: "Complete",
    statusColor: "bg-green-500 hover:bg-green-600"
  }
];

// Active Tests Data
export const activeTests: ActiveTest[] = [
  { name: "Salt Spray", status: "not done", statusColor: "bg-gray-300 hover:bg-gray-400" },
  { name: "Thermal Cycle", status: "warning", statusColor: "bg-yellow-500 hover:bg-yellow-600" },
  { name: "Drop Test", status: "complete", statusColor: "bg-blue-400 hover:bg-blue-500" },
  { name: "Push/Pull", status: "not done", statusColor: "bg-green-500 hover:bg-green-600" },
  { name: "Torque Test", status: "2h", statusColor: "bg-gray-300 hover:bg-gray-400" }
];

// System Status Data
export const systemStatus: SystemStatusItem[] = [
  { name: "Database", status: "Active", statusColor: "bg-green-500 hover:bg-green-600" },
  { name: "Test Equipment", status: "Active", statusColor: "bg-green-500 hover:bg-green-600" },
  { name: "Image Upload", status: "Active", statusColor: "bg-green-500 hover:bg-green-600" },
  { name: "Last Sync", status: "2 min ago", statusColor: "bg-gray-400 hover:bg-gray-500" }
];

// Right Side Menu Items
export const rightSideMenuItems: RightMenuItem[] = [
  { 
    title: "Machine details", 
  },
  { 
    title: "Equipment Details",  
  },
  { 
    title: "Calibration details" 
  },
  { 
    title: "AMC details" 
  },
  { 
    title: "Chemicals and Stock details" 
  },
  { 
    title: "Machine Availability", 
  },
  { 
    title: "Daily check points" 
  }
];