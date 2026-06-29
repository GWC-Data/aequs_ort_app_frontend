// ==================== OPENCV IMAGE PROCESSING ====================

import { PREDEFINED_REGIONS, REFERENCE_IMAGE_WIDTH, REFERENCE_IMAGE_HEIGHT } from './constants';
import { detectLabelText, getLabelCategory } from './utils';
import type { CroppedRegion } from './types';

export const detectYellowMarks = (src: any): boolean => {
  try {
    const cv = window.cv;
    const hsv = new cv.Mat();
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

    const lower = new cv.Mat(
      hsv.rows,
      hsv.cols,
      hsv.type(),
      [20, 100, 100, 0],
    );
    const upper = new cv.Mat(
      hsv.rows,
      hsv.cols,
      hsv.type(),
      [40, 255, 255, 255],
    );
    const mask = new cv.Mat();
    cv.inRange(hsv, lower, upper, mask);

    const yellowPixels = cv.countNonZero(mask);
    const totalPixels = mask.rows * mask.cols;
    const yellowRatio = yellowPixels / totalPixels;

    hsv.delete();
    mask.delete();
    lower.delete();
    upper.delete();

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
  const upper = new cv.Mat(
    hsv.rows,
    hsv.cols,
    hsv.type(),
    [45, 255, 255, 255],
  );
  const mask = new cv.Mat();
  cv.inRange(hsv, lower, upper, mask);

  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
  cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    mask,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  let detectedRegions: any[] = [];
  const minArea = 300;
  const maxArea = 50000;

  for (let i = 0; i < contours.size(); ++i) {
    const rect = cv.boundingRect(contours.get(i));
    const area = rect.width * rect.height;
    const aspectRatio = rect.width / rect.height;
    if (
      area >= minArea &&
      area <= maxArea &&
      aspectRatio > 0.5 &&
      aspectRatio < 5
    ) {
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
  console.log(
    `Scale factors: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`,
  );

  const scaledRegions = PREDEFINED_REGIONS.map((region) => ({
    x: Math.round(region.x * scaleX),
    y: Math.round(region.y * scaleY),
    width: Math.round(region.width * scaleX),
    height: Math.round(region.height * scaleY),
    label: region.label,
  }));

  console.log("Scaled regions:", scaledRegions);
  return scaledRegions;
};

export const cropImageRegions = (
  src: any,
  detectedRegions: any[],
  hasYellowMarks: boolean,
  partNumber: string,
  childTestId?: string,
  isFinalRound: boolean = false
): CroppedRegion[] => {
  const cv = window.cv;
  const croppedImages: CroppedRegion[] = [];

  detectedRegions.forEach((rect, i) => {
    try {
      const x = Math.max(0, Math.min(rect.x, src.cols - 1));
      const y = Math.max(0, Math.min(rect.y, src.rows - 1));
      const width = Math.min(rect.width, src.cols - x);
      const height = Math.min(rect.height, src.rows - y);

      if (width <= 0 || height <= 0) {
        console.warn(
          `Invalid dimensions for region ${i}: ${width}x${height}`,
        );
        return;
      }

      const validRect = new cv.Rect(x, y, width, height);
      const roi = src.roi(validRect);

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = width;
      cropCanvas.height = height;
      cv.imshow(cropCanvas, roi);

      const croppedData = cropCanvas.toDataURL("image/png", 1.0);

      const detectedLabel = hasYellowMarks
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
        isFinal: isFinalRound,
      });

      console.log(
        `Part ${partNumber} - Region ${i}: ${detectedLabel} → ${category?.form}`,
      );

      roi.delete();
    } catch (err) {
      console.error(`Error cropping region ${i}:`, err);
    }
  });

  return croppedImages;
};
