import { PREDEFINED_REGIONS } from '../types';

// Enhanced OCR simulation
export const detectLabelText = (
    imageData: string, 
    regionId: number, 
    regions: any[], 
    hasYellowMarks: boolean
): string => {
    if (hasYellowMarks) {
        const sortedRegions = [...regions].sort((a, b) => {
            if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
            return a.x - b.x;
        });

        const sortedIndex = sortedRegions.findIndex(region =>
            region.x === regions[regionId].x && region.y === regions[regionId].y
        );

        const labels = [
            "F1", "Cleat 1", "Cleat 2", "Cleat 3", "Cleat 4", "F2",
            "Side snap 1", "Side snap 4", "F4", "F3",
            "Side snap 2", "Side snap 3"
        ];

        return labels[sortedIndex] || `Region ${sortedIndex + 1}`;
    } else {
        const manualLabels = [
            "F1", "Cleat 1", "Cleat 2", "Cleat 3", "Cleat 4", "F2",
            "Side snap 1", "Side snap 4", "F4", "F3",
            "Side snap 2", "Side snap 3"
        ];
        return manualLabels[regionId] || `Region ${regionId + 1}`;
    }
};

// Enhanced label to form mapping
export const getLabelCategory = (label: string): { form: string; id: string } | null => {
    if (!label) return null;

    const lower = label.toLowerCase().trim();

    // Foot Push Out mapping
    if (lower.includes('f1') || lower.includes('f2') || lower.includes('f3') || lower.includes('f4')) {
        return { form: 'footPushOut', id: label.toUpperCase().replace('F', 'F') };
    }

    // Pull Test Cleat mapping
    if (lower.includes('cleat') || lower.includes('clear')) {
        const cleanLabel = label.replace(/clear/gi, 'Cleat');
        return { form: 'pullTestCleat', id: cleanLabel };
    }

    // Side Snap mapping
    if (lower.includes('side snap') || lower.includes('sidesnap')) {
        return { form: 'sidesnap', id: label };
    }

    return null;
};

// Text recognition utilities
export const extractTextFromImage = async (imageData: string): Promise<string> => {
    // This is a placeholder for actual OCR implementation
    // In a real implementation, you would use Tesseract.js or similar
    return new Promise((resolve) => {
        // Simulate OCR processing
        setTimeout(() => {
            resolve("Sample OCR Text");
        }, 100);
    });
};

// Region label validation
export const validateRegionLabel = (label: string): boolean => {
    const validLabels = [
        "F1", "F2", "F3", "F4",
        "Cleat 1", "Cleat 2", "Cleat 3", "Cleat 4",
        "Side snap 1", "Side snap 2", "Side snap 3", "Side snap 4"
    ];
    
    return validLabels.includes(label);
};

// Label grouping utilities
export const groupLabelsByType = (labels: string[]) => {
    const groups = {
        footPushOut: [] as string[],
        cleat: [] as string[],
        sideSnap: [] as string[]
    };

    labels.forEach(label => {
        const category = getLabelCategory(label);
        if (category) {
            if (category.form === 'footPushOut') {
                groups.footPushOut.push(category.id);
            } else if (category.form === 'pullTestCleat') {
                groups.cleat.push(category.id);
            } else if (category.form === 'sidesnap') {
                groups.sideSnap.push(category.id);
            }
        }
    });

    return groups;
};