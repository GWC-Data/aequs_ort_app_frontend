// hooks/usePartScanning.ts
import { useState, useCallback } from 'react';
import { Part, OQCRecord, TestAllocation } from '../types';
import { useTestParsing } from './useTestParsing';
import { getBackendApiUrl } from '@/lib/backendApi';

export const usePartScanning = () => {
  const [scanning, setScanning] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});
  const testParser = useTestParsing();

  const scanPart = useCallback(async (ticketCode: string): Promise<Part | null> => {
    setScanning(true);
    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, return a basic part structure
      // In a real implementation, this would parse the ticketCode or scan a barcode
      const part: Part = {
        id: Date.now(),
        partNumber: `PN-${ticketCode}`,
        serialNumber: `SN-${ticketCode}`,
        ticketCode,
        customImages: [],
        cosmeticImages: [],
        nonCosmeticImages: [],
        scannedAt: new Date().toISOString(),
      };
      
      return part;
    } catch (error) {
      console.error('Error scanning part:', error);
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  // UPDATED: Upload image to server and get real path
  const handleImageUpload = useCallback(async (
    partId: number,
    label: string,
    file: File,
    callback: (filePath: string) => void
  ) => {
    setUploadingImages(prev => ({
      ...prev,
      [partId]: true
    }));

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('partId', partId.toString());
      formData.append('imageLabel', label);
      formData.append('imageType', 'custom');

      const uploadUrl = `${getBackendApiUrl()}/uploads/part-images`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const filePath = typeof result?.path === 'string' ? result.path : null;

      if (!filePath) {
        throw new Error('Invalid upload response');
      }

      callback(filePath);
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback: since we can't get the real path, store the file name
      // Note: This won't display the image without a server
      callback(file.name);
    } finally {
      setUploadingImages(prev => ({
        ...prev,
        [partId]: false
      }));
    }
  }, []);

  const isUploading = useCallback((partId: number) => {
    return Boolean(uploadingImages[partId]);
  }, [uploadingImages]);

  return {
    scanning,
    scanPart,
    handleImageUpload,
    isUploading,
    testParser
  };
};