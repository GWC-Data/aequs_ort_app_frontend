export interface TestData {
  project: string;
  testType: string;
  build: string;
  testName: string;
  testCondition: string;
  machine: string;
  duration: string | number;
  qty: number;
  startTime: string;
  tentativeEnd: string;
  operatorLoaded: string;
  operatorUnload: string;
  checkPoint: string;
  remaining: string;
  status: string;
}

export const testData: TestData[] = [
  {
    project: "Hulk",
    testType: "Mechanical",
    build: "DOE 4.0",
    testName: "Ano hardness",
    testCondition: "NA",
    machine: "",
    duration: "NA",
    qty: 10,
    startTime: "11-11-2025",
    tentativeEnd: "12-11-2025",
    operatorLoaded: "Subramani",
    operatorUnload: "Vishal",
    checkPoint: "72 Hr, 112Hr, 300 hr, 500 hr",
    remaining: "",
    status: "On Time"
  },
  {
    project: "Flash",
    testType: "Chemical",
    build: "PRB",
    testName: "SST",
    testCondition: "",
    machine: "",
    duration: 24,
    qty: 10,
    startTime: "",
    tentativeEnd: "",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "",
    status: "Pending"
  },
  {
    project: "Aqua",
    testType: "Mechanical",
    build: "DOE 3.0",
    testName: "Ano Hardness",
    testCondition: "RT",
    machine: "",
    duration: "N/A",
    qty: 3,
    startTime: "08:30 AM",
    tentativeEnd: "Nov 8, 8:30 AM",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "40h",
    status: "On Time"
  },
  {
    project: "Aqua",
    testType: "Environmental",
    build: "DOE 3.0",
    testName: "Salt Spray (SST)",
    testCondition: "ASTM B117",
    machine: "",
    duration: "24 hr",
    qty: 5,
    startTime: "10:00 AM",
    tentativeEnd: "Nov 8, 10:00 AM",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "22h",
    status: "Warning"
  },
  {
    project: "Aqua",
    testType: "Chemical",
    build: "DOE 3.0",
    testName: "Chemical Sensitivity",
    testCondition: "temp: 65°C, RH ...",
    machine: "",
    duration: "72 hr",
    qty: 4,
    startTime: "09:00 AM",
    tentativeEnd: "Nov 7, 09:00 AM",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "2h",
    status: "Overdue"
  },
  {
    project: "Assembly",
    testType: "ORT",
    build: "Production",
    testName: "Screw half shear push test",
    testCondition: "RT",
    machine: "",
    duration: "-",
    qty: 6,
    startTime: "01:00 PM",
    tentativeEnd: "Nov 8, 02:00 PM",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "24h",
    status: "On Time"
  },
  {
    project: "Assembly",
    testType: "Environmental + ORT",
    build: "Production",
    testName: "Temperature & Humidity...",
    testCondition: "-20 ~ +65°C and ...",
    machine: "",
    duration: "72 hr",
    qty: 3,
    startTime: "11:00 AM",
    tentativeEnd: "Nov 8, 11:00 AM",
    operatorLoaded: "",
    operatorUnload: "",
    checkPoint: "",
    remaining: "48h",
    status: "On Time"
  }
];