// Define TypeScript type
export interface FlaskItem {
  processStage: string;
  type: string;
  testName: string;
  testCondition: string;
  requiredQty: string;
  equipment: string;
}

// JSON Data as TS variable
export const flaskData: FlaskItem[] = [
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Ano Hardness",
    "testCondition": "Room temperature",
    "requiredQty": "10pcs/build",
    "equipment": "Hardness machine"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "5x5 Delam",
    "testCondition": "Room temperature",
    "requiredQty": "10pcs/build",
    "equipment": "Out source"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "CS- 17 Taber",
    "testCondition": "Room temperature",
    "requiredQty": "3pcs/build",
    "equipment": "Taber Leanear abbraster"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Steel Wool",
    "testCondition": "Room temperature",
    "requiredQty": "3pcs/build",
    "equipment": "Taber Leanear abbraster"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Short Term Survivability (STS)",
    "testCondition": "Temp : 85°C",
    "requiredQty": "3pcs/build",
    "equipment": "Heat Soak"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Temperature & Humidity Cycling (THC)",
    "testCondition": "-20 ~ +65℃ and 90% RH 6 Cycles",
    "requiredQty": "3pcs/build",
    "equipment": "Heat Soak"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Heat Soak",
    "testCondition": "Temp : 65°C RH : 90%",
    "requiredQty": "10pcs/build",
    "equipment": "Heat Soak"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Salt Spray (SST)",
    "testCondition": "as per ASTM B117",
    "requiredQty": "10pcs/build",
    "equipment": "Salt spray"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "UV/ Solar Exposure",
    "testCondition": "Natural Sunlight-2.4",
    "requiredQty": "10pcs/build",
    "equipment": "UV"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "NPI",
    "testName": "Steel Rain + Heat Soak",
    "testCondition": "Temp : 65°C RH : 90%",
    "requiredQty": "3pcs/build",
    "equipment": "Heat soak + Steel rain"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Screw half",
    "testCondition": "Room temperature",
    "requiredQty": "10pcs/build",
    "equipment": "UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Post 24 Hrs",
    "testCondition": "Room temperature",
    "requiredQty": "32pcs/build",
    "equipment": "UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Foot Chemical",
    "testCondition": "Oleic Acid + Heat Soak 168H",
    "requiredQty": "3pcs/build/foot vendor 3pcs/build/foot vendor",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Foot Survivability",
    "testCondition": "Temp : 65°C RH : 90%",
    "requiredQty": "3pcs/build/foot vendor",
    "equipment": "Heat Soak + Foot Survivability+ UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Temperature & Humidity Cycling (THC)",
    "testCondition": "-20 ~ +65℃ and 90% RH 6 Cycles",
    "requiredQty": "10pcs/build",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Salt Spray (SST)",
    "testCondition": "ASTM B117",
    "requiredQty": "6pcs/build",
    "equipment": "Salt spray + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Thermal Cycling",
    "testCondition": "-40℃ to +85℃ 100 Cycles",
    "requiredQty": "10pcs/build",
    "equipment": "Thermal cycle + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Heat Soak",
    "testCondition": "65℃ and 90%",
    "requiredQty": "32pcs/build",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "NPI",
    "testName": "Heat Soak",
    "testCondition": "65℃ and 90%",
    "requiredQty": "10pcs/build",
    "equipment": "Heat soak + UTM"
  },

  /* ---------- MP DATA ---------- */

  {
    "processStage": "Ano Bottom Case",
    "type": "MP",
    "testName": "Ano Hardness",
    "testCondition": "Ano Hardness",
    "requiredQty": "3x/color/line/month",
    "equipment": "Hardness machine"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "MP",
    "testName": "5x5 Delam",
    "testCondition": "5x5 Delam",
    "requiredQty": "3x/color/line/month",
    "equipment": "Out source"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "MP",
    "testName": "Salt Spray (SST)",
    "testCondition": "Salt Spray (SST)",
    "requiredQty": "3x/color/month",
    "equipment": "Salt spray"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "MP",
    "testName": "UV/ Solar Exposure",
    "testCondition": "UV/ Solar Exposure",
    "requiredQty": "5x/color/biweekly",
    "equipment": "UV"
  },
  {
    "processStage": "Ano Bottom Case",
    "type": "MP",
    "testName": "Chemical Sensitivity",
    "testCondition": "Chemical Sensitivity",
    "requiredQty": "2x/color/month",
    "equipment": "Heat Soak"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Screw half shear push test",
    "testCondition": "Screw half shear push test",
    "requiredQty": "1x/day/each RM vendor",
    "equipment": "UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Post 24 Hrs",
    "testCondition": "Post 24 Hrs",
    "requiredQty": "1x/2h/Line (180)",
    "equipment": "UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Foot Chemical",
    "testCondition": "Foot Chemical",
    "requiredQty": "3x/month/foot vendor",
    "equipment": "Heat Soak"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Foot Survivability Temp : 65°C RH 90%",
    "testCondition": "Foot Survivability Temp : 65°C RH 90%",
    "requiredQty": "3x/month/foot vendor",
    "equipment": "Heat Soak + Foot Survivability+ UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Temperature & Humidity Cycling (THC) -20 ~ +65℃ and 90% RH 6 Cycles",
    "testCondition": "Temperature & Humidity Cycling (THC) -20 ~ +65℃ and 90% RH 6 Cycles",
    "requiredQty": "10x/month",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Salt Spray (SST)",
    "testCondition": "Salt Spray (SST)",
    "requiredQty": "3x/month",
    "equipment": "Salt spray + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Thermal Cycling -40℃ to +85℃ 100 Cycles",
    "testCondition": "Thermal Cycling -40℃ to +85℃ 100 Cycles",
    "requiredQty": "10x/month",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Heat Soak 65℃ and 90% 168",
    "testCondition": "Heat Soak 65℃ and 90% 168",
    "requiredQty": "10x/month",
    "equipment": "Heat soak + UTM"
  },
  {
    "processStage": "Assembly Bottom Case",
    "type": "MP",
    "testName": "Heat Soak 65℃ and 90% 500H",
    "testCondition": "Heat Soak 65℃ and 90% 500H",
    "requiredQty": "10x/month",
    "equipment": "Heat soak + UTM"
  }
];
