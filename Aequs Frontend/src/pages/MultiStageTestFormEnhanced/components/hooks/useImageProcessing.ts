import { useState, useEffect } from 'react';
import { CroppedRegion } from '../../types';
import { 
    detectYellowMarks, 
    processImageWithYellowMarks, 
    processImageWithoutYellowMarks,
    detectLabelText,
    getLabelCategory
} from '../../utils/imageProcessor';

export const useImageProcessing = () => {
    const [cvLoaded, setCvLoaded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [hasYellowMarks, setHasYellowMarks] = useState<boolean | null>(null);
    const [croppedRegions, setCroppedRegions] = useState<CroppedRegion[]>([]);
    const [processingImages, setProcessingImages] = useState<Record<string, boolean>>({});

    // Load OpenCV
    useEffect(() => {
        if (window.cv && window.cv.Mat) {
            setCvLoaded(true);
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[src*="opencv.js"]');
        if (existingScript) {
            existingScript.onload = () => {
                if (window.cv && window.cv.onRuntimeInitialized) {
                    window.cv.onRuntimeInitialized = () => {
                        setCvLoaded(true);
                    };
                }
            };
            return;
        }

        const script = document.createElement("script");
        script.src = "https://docs.opencv.org/4.x/opencv.js";
        script.async = true;
        script.onload = () => {
            if (window.cv) {
                window.cv.onRuntimeInitialized = () => {
                    setCvLoaded(true);
                };
            }
        };
        document.body.appendChild(script);
    }, []);

    const processImage = async (
        file: File,
        partNumber: string,
        testName: string,
        childTestId?: string,
        isFinalRound: boolean = false
    ): Promise<{ croppedImages: CroppedRegion[], hasMarks: boolean }> => {
        if (!cvLoaded) {
            throw new Error("OpenCV not loaded yet. Please wait...");
        }

        return new Promise((resolve, reject) => {
            setProcessing(true);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        const cv = window.cv;
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
                        setHasYellowMarks(hasMarks);

                        let detectedRegions: any[] = [];

                        if (hasMarks) {
                            detectedRegions = processImageWithYellowMarks(src, img);
                        } else {
                            detectedRegions = processImageWithoutYellowMarks(src, img);
                        }

                        const croppedImages: CroppedRegion[] = [];
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
                                    id: i,
                                    data: croppedData,
                                    label: detectedLabel,
                                    category: category,
                                    rect: { x, y, width, height },
                                    partNumber: partNumber,
                                    childTestId: childTestId,
                                    isFinal: isFinalRound
                                });

                                roi.delete();
                            } catch (err) {
                                console.error(`Error cropping region ${i}:`, err);
                            }
                        });

                        src.delete();
                        resolve({ croppedImages, hasMarks });
                    } catch (err) {
                        reject(err);
                    } finally {
                        setProcessing(false);
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const setProcessingImage = (key: string, value: boolean) => {
        setProcessingImages(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return {
        cvLoaded,
        processing,
        hasYellowMarks,
        croppedRegions,
        setCroppedRegions,
        processingImages,
        setProcessingImages,
        setProcessingImage,
        processImage
    };
};