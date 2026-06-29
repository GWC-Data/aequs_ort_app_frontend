import * as XLSX from 'xlsx';

export interface ExcelRow {
    [key: string]: any;
}

export interface TestConditionMapping {
    testName: string;
    testCondition: string;
    [key: string]: any;
}

export const loadMasterExcelSheet = async (filePath: string = '/aequs_master_sheet.xlsx'): Promise<{
    data: ExcelRow[];
    testConditions: Map<string, string>;
}> => {
    try {
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        // Create a map of test names to test conditions
        const testConditions = new Map<string, string>();
        jsonData.forEach((row: ExcelRow) => {
            const testName = row['Test Name']?.toString().trim() || '';
            const testCondition = row['Test Condition']?.toString().trim() || '';
            if (testName && testCondition) {
                testConditions.set(testName, testCondition);
            }
        });

        return {
            data: jsonData,
            testConditions
        };
    } catch (error) {
        console.error('Failed to load master Excel sheet:', error);
        throw error;
    }
};

export const findTestCondition = (testName: string, testConditions: Map<string, string>): string => {
    return testConditions.get(testName) || '';
};

export const extractTestNames = (data: ExcelRow[]): string[] => {
    const testNames = new Set<string>();
    data.forEach(row => {
        const testName = row['Test Name']?.toString().trim();
        if (testName) {
            testNames.add(testName);
        }
    });
    return Array.from(testNames);
};

export const getTestConditionForPart = (partNumber: string): string => {
    try {
        const chamberLoadsStr = localStorage.getItem('chamberLoads');
        if (!chamberLoadsStr) return '';

        const chamberLoads = JSON.parse(chamberLoadsStr);

        // Find the part in chamberLoads
        for (const load of chamberLoads) {
            if (load.parts && Array.isArray(load.parts)) {
                const part = load.parts.find((p: any) => p.partNumber === partNumber);
                if (part && part.testCondition) {
                    return part.testCondition;
                }
            }
        }

        return '';
    } catch (error) {
        console.error('Error getting test condition for part:', error);
        return '';
    }
};