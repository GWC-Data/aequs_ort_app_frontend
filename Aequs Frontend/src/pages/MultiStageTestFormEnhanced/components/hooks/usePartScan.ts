import { useState, useCallback } from 'react';
import { ScanState, ScannedPart, ImageType } from '../../types';
import { getOqcRecords, getTicketAllocations } from '../../utils/localStorageHelper';
import { normalizeMachineName } from '../../utils/testConditionParser';

export const usePartScan = (
    isSecondRound: boolean = false,
    setVerifiedPartsForFinalUpload?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
    const [scanState, setScanState] = useState<ScanState>({
        isScanning: false,
        scannedParts: [],
        partInput: '',
        showScanModal: false,
        availableTests: [],
        selectedTest: '',
        machineDetails: null,
        uploadingImages: {}
    });

    const handlePartScan = useCallback(async () => {
        if (!scanState.partInput.trim()) {
            alert('Please enter a part number');
            return;
        }

        setScanState(prev => ({ ...prev, isScanning: true }));
        const partNumber = scanState.partInput.trim().toUpperCase();

        try {
            // For Unload , we need to check if the part is already loaded in the current test
            if (isSecondRound) {
                // This check would be implemented based on the current context
                // For now, we'll skip it
            }

            const oqcRecords = getOqcRecords();
            let partDetails: ScannedPart | null = null;
            let foundTicketCode = null;

            // Search for part in OQC records
            for (const record of oqcRecords) {
                for (const session of record.sessions || []) {
                    const matchingPart = session.parts?.find(part =>
                        part.partNumber?.toUpperCase() === partNumber
                    );

                    if (matchingPart) {
                        partDetails = {
                            id: Date.now(),
                            partNumber: matchingPart.partNumber,
                            serialNumber: matchingPart.serialNumber,
                            ticketCode: record.ticketCode,
                            project: record.project,
                            build: record.build,
                            colour: record.colour,
                            anoType: record.anoType,
                            oqcRecordId: record.id,
                            sessionId: session.id,
                            sessionNumber: session.sessionNumber,
                            scannedAt: new Date().toLocaleString(),
                            availableTests: [],
                            selectedTestId: '',
                            scanStatus: 'OK',
                            cosmeticImage: '',
                            nonCosmeticImage: '',
                            cosmeticImages: [],
                            nonCosmeticImages: []
                        };
                        foundTicketCode = record.ticketCode;
                        break;
                    }
                }
                if (partDetails) break;
            }

            if (!partDetails) {
                alert(`Part ${partNumber} not found in OQC records!`);
                setScanState(prev => ({ ...prev, isScanning: false }));
                return;
            }

            // Check if part is already scanned in this session
            const alreadyScanned = scanState.scannedParts.some(part => part.partNumber === partNumber);
            if (alreadyScanned) {
                alert(`Part ${partNumber} is already scanned in this session!`);
                setScanState(prev => ({ ...prev, isScanning: false }));
                return;
            }

            // For Unload , don't check allocations - just add the part
            if (!isSecondRound) {
                // Check existing loads
                const chamberLoads = getOqcRecords();
                const alreadyLoaded = chamberLoads.some(load =>
                    load.parts?.some(part => part.partNumber === partNumber)
                );

                if (alreadyLoaded) {
                    alert(`Part ${partNumber} is already loaded in another chamber!`);
                    setScanState(prev => ({ ...prev, isScanning: false }));
                    return;
                }

                // Find test allocations for this part
                const allocations = getTicketAllocations();
                const ticketAllocations = allocations.filter(allocation =>
                    allocation.ticketCode === foundTicketCode
                );

                if (ticketAllocations.length === 0) {
                    alert(`No allocations found for ticket ${foundTicketCode}`);
                    setScanState(prev => ({ ...prev, isScanning: false }));
                    return;
                }

                // The actual test matching logic would go here
                // For now, we'll just add the part
                partDetails.scanStatus = 'NO_MACHINE_DATA';
            } else {
                // For Unload , just mark as OK
                partDetails.scanStatus = 'SECOND_ROUND_OK';
            }

            setScanState(prev => ({
                ...prev,
                scannedParts: [...prev.scannedParts, partDetails],
                partInput: ''
            }));

        } catch (error) {
            console.error('Error scanning part:', error);
            alert('Error scanning part. Please try again.');
        } finally {
            setScanState(prev => ({ ...prev, isScanning: false }));
        }
    }, [scanState.partInput, isSecondRound]);

    const handleRemoveScannedPart = useCallback((partId: number) => {
        setScanState(prev => ({
            ...prev,
            scannedParts: prev.scannedParts.filter(part => part.id !== partId)
        }));
    }, []);

    const handleScanImageUpload = useCallback((partId: number, imageType: ImageType, file: File) => {
        setScanState(prev => ({
            ...prev,
            uploadingImages: {
                ...prev.uploadingImages,
                [partId]: {
                    ...prev.uploadingImages[partId],
                    [imageType]: true
                }
            }
        }));

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target?.result as string;

            setScanState(prev => {
                const updatedScannedParts = prev.scannedParts.map(part => {
                    if (part.id === partId) {
                        const fieldName = imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages';
                        const currentImages = part[fieldName] || [];
                        const updatedImages = [...currentImages, imageData];

                        return {
                            ...part,
                            [imageType === 'cosmetic' ? 'cosmeticImage' : 'nonCosmeticImage']: imageData,
                            [fieldName]: updatedImages,
                            hasImages: true
                        };
                    }
                    return part;
                });

                return {
                    ...prev,
                    scannedParts: updatedScannedParts,
                    uploadingImages: {
                        ...prev.uploadingImages,
                        [partId]: {
                            ...prev.uploadingImages[partId],
                            [imageType]: false
                        }
                    }
                };
            });
        };
        reader.readAsDataURL(file);
    }, []);

    const handleRemoveScannedImage = useCallback((partId: number, imageType: ImageType, imageIndex: number) => {
        setScanState(prev => {
            const updatedScannedParts = prev.scannedParts.map(part => {
                if (part.id === partId) {
                    const fieldName = imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages';
                    const imagesArray = part[fieldName] || [];
                    const updatedImages = imagesArray.filter((_, idx) => idx !== imageIndex);

                    return {
                        ...part,
                        [fieldName]: updatedImages,
                        [imageType === 'cosmetic' ? 'cosmeticImage' : 'nonCosmeticImage']: updatedImages[0] || ''
                    };
                }
                return part;
            });

            return {
                ...prev,
                scannedParts: updatedScannedParts
            };
        });
    }, []);

    const handleConfirmScannedParts = useCallback(() => {
        if (scanState.scannedParts.length === 0) {
            alert('No parts scanned!');
            return;
        }

        // For Unload , update verified parts
        if (isSecondRound && setVerifiedPartsForFinalUpload) {
            const newVerifiedParts = new Set<string>();
            scanState.scannedParts.forEach(part => {
                newVerifiedParts.add(part.partNumber);
            });
            setVerifiedPartsForFinalUpload(newVerifiedParts);
        }

        // Close scan modal and show success
        setScanState(prev => ({ ...prev, showScanModal: false, scannedParts: [], partInput: '' }));
        alert(`${scanState.scannedParts.length} part(s) verified!`);
    }, [scanState.scannedParts, isSecondRound, setVerifiedPartsForFinalUpload]);

    return {
        scanState,
        setScanState,
        handlePartScan,
        handleRemoveScannedPart,
        handleRemoveScannedImage,
        handleScanImageUpload,
        handleConfirmScannedParts
    };
};