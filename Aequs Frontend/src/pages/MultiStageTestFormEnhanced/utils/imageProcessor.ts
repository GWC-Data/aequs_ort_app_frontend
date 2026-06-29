import { PREDEFINED_REGIONS, REFERENCE_IMAGE_WIDTH, REFERENCE_IMAGE_HEIGHT } from '../types';

declare global {
    interface Window {
        cv: any;
    }
}

export const detectYellowMarks = (src: any): boolean => {
    try {
        const cv = window.cv;
        const hsv = new cv.Mat();
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

        const lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [20, 100, 100, 0]);
        const upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [40, 255, 255, 255]);
        const mask = new cv.Mat();
        cv.inRange(hsv, lower, upper, mask);

        const yellowPixels = cv.countNonZero(mask);
        const totalPixels = mask.rows * mask.cols;
        const yellowRatio = yellowPixels / totalPixels;

        hsv.delete(); mask.delete(); lower.delete(); upper.delete();

        return yellowRatio > 0.01;
    } catch (error) {
        console.error("Error detecting yellow marks:", error);
        return false;
    }
};

export const processImageWithYellowMarks = (src: any, img: HTMLImageElement) => {
    const cv = window.cv;
    const hsv = new cv.Mat();
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

    const lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [15, 80, 80, 0]);
    const upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [45, 255, 255, 255]);
    const mask = new cv.Mat();
    cv.inRange(hsv, lower, upper, mask);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let detectedRegions: any[] = [];
    const minArea = 300;
    const maxArea = 50000;

    for (let i = 0; i < contours.size(); ++i) {
        const rect = cv.boundingRect(contours.get(i));
        const area = rect.width * rect.height;
        const aspectRatio = rect.width / rect.height;
        if (area >= minArea && area <= maxArea && aspectRatio > 0.5 && aspectRatio < 5) {
            detectedRegions.push(rect);
        }
    }

    detectedRegions.sort((a, b) => {
        const rowTolerance = 30;
        if (Math.abs(a.y - b.y) > rowTolerance) {
            return a.y - b.y;
        }
        return a.x - b.x;
    });

    hsv.delete();
    mask.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();

    return detectedRegions;
};

export const processImageWithoutYellowMarks = (src: any, img: HTMLImageElement) => {
    const scaleX = img.width / REFERENCE_IMAGE_WIDTH;
    const scaleY = img.height / REFERENCE_IMAGE_HEIGHT;

    console.log(`Image dimensions: ${img.width}x${img.height}`);
    console.log(`Scale factors: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`);

    const scaledRegions = PREDEFINED_REGIONS.map(region => ({
        x: Math.round(region.x * scaleX),
        y: Math.round(region.y * scaleY),
        width: Math.round(region.width * scaleX),
        height: Math.round(region.height * scaleY),
        label: region.label
    }));

    console.log("Scaled regions:", scaledRegions);
    return scaledRegions;
};

// Enhanced OCR simulation
export const detectLabelText = (imageData: string, regionId: number, regions: any[], hasYellowMarks: boolean): string => {
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
export const getLabelCategory = (label: string) => {
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

export const processNonCosmeticImage = async (
    file: File,
    cv: any,
    partNumber: string,
    testName: string,
    childTestId?: string,
    isFinalRound: boolean = false
): Promise<{
    croppedImages: Array<{ data: string; label: string; category: any }>;
    hasMarks: boolean;
    imageUrl: string;
}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("Could not get canvas context"));
                        return;
                    }

                    ctx.drawImage(img, 0, 0);
                    const src = cv.imread(canvas);

                    const srcForDetection = cv.imread(canvas);
                    const hasMarks = detectYellowMarks(srcForDetection);
                    srcForDetection.delete();

                    let detectedRegions: any[] = [];

                    if (hasMarks) {
                        detectedRegions = processImageWithYellowMarks(src, img);
                    } else {
                        detectedRegions = processImageWithoutYellowMarks(src, img);
                    }

                    const croppedImages: Array<{ data: string; label: string; category: any }> = [];
                    detectedRegions.forEach((rect, i) => {
                        try {
                            const x = Math.max(0, Math.min(rect.x, src.cols - 1));
                            const y = Math.max(0, Math.min(rect.y, src.rows - 1));
                            const width = Math.min(rect.width, src.cols - x);
                            const height = Math.min(rect.height, src.rows - y);

                            if (width <= 0 || height <= 0) {
                                console.warn(`Invalid dimensions for region ${i}: ${width}x${height}`);
                                return;
                            }

                            const validRect = new cv.Rect(x, y, width, height);
                            const roi = src.roi(validRect);

                            const cropCanvas = document.createElement("canvas");
                            cropCanvas.width = width;
                            cropCanvas.height = height;
                            cv.imshow(cropCanvas, roi);

                            const croppedData = cropCanvas.toDataURL("image/png", 1.0);

                            const detectedLabel = hasMarks
                                ? detectLabelText(croppedData, i, detectedRegions, true)
                                : rect.label;

                            const category = getLabelCategory(detectedLabel);

                            croppedImages.push({
                                data: croppedData,
                                label: detectedLabel,
                                category: category
                            });

                            roi.delete();
                        } catch (err) {
                            console.error(`Error cropping region ${i}:`, err);
                        }
                    });

                    src.delete();

                    resolve({
                        croppedImages,
                        hasMarks,
                        imageUrl: e.target?.result as string
                    });
                } catch (err) {
                    reject(err);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};