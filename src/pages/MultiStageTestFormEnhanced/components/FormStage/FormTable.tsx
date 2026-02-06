import React from 'react';
import { Upload, X, ImageIcon, Clock } from 'lucide-react';
import { AssignedPart, FormRow, CustomColumn, ChildTest, FormData } from '../../types';
import { RowFieldRenderer } from './RowFieldRenderer';

interface FormTableProps {
    selectedParts: AssignedPart[];
    rowsByPart: Record<string, FormRow[]>;
    forms: FormData;
    isSecondRound: boolean;
    projectType: string;
    currentChildTest?: ChildTest;
    updateRowField: (rowId: number, field: string, value: string) => void;
    removeCustomColumn: (columnId: string) => void;
    handleImageUpload: (rowId: number, type: 'cosmetic' | 'nonCosmetic', file: File) => void;
    handleFinalImageUpload: (partNumber: string, type: 'cosmetic' | 'nonCosmetic', file: File, childTestId?: string) => void;
    loadImagesFromStorage: (partNumber: string) => { cosmeticImages: string[], nonCosmeticImages: string[], finalCosmeticImages?: string[], finalNonCosmeticImages?: string[] };
    shouldSplitImages: () => boolean;
    verifiedPartsForFinalUpload?: Set<string>;
    // NEW: Checkpoint props
    onCheckpointClick?: (row: FormRow) => void;
    onCompleteTestClick?: (row: FormRow) => void;
}

export const FormTable: React.FC<FormTableProps> = ({
    selectedParts,
    rowsByPart,
    forms,
    isSecondRound,
    projectType,
    currentChildTest,
    updateRowField,
    removeCustomColumn,
    handleImageUpload,
    handleFinalImageUpload,
    loadImagesFromStorage,
    shouldSplitImages,
    verifiedPartsForFinalUpload = new Set(),
    // NEW
    onCheckpointClick,
    onCompleteTestClick
}) => {
    // Function to handle final round image uploads
    const handleFinalRoundImageUpload = (rowId: number, partNumber: string, type: 'cosmetic' | 'nonCosmetic', file: File) => {
        if (isSecondRound) {
            if (type === 'cosmetic') {
                updateRowField(rowId, 'finalCosmeticImages', JSON.stringify([]));
                updateRowField(rowId, 'finalCosmeticImage', '');
            } else {
                updateRowField(rowId, 'nonCosmeticImages', JSON.stringify([]));
                updateRowField(rowId, 'nonCosmeticImage', '');
                updateRowField(rowId, 'croppedImages', JSON.stringify([]));
                updateRowField(rowId, 'croppedImage', '');
                updateRowField(rowId, 'finalNonCosmeticImage', '');
                updateRowField(rowId, 'finalCroppedNonCosmeticImage', '');
            }
        }

        if (type === 'cosmetic') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                const currentRow = forms.rows.find(r => r.id === rowId);

                if (currentRow) {
                    if (projectType === "Hulk") {
                        const currentFinalImages = currentRow.finalCosmeticImages || [];
                        const updatedFinalImages = [...currentFinalImages, imageUrl];
                        updateRowField(rowId, 'finalCosmeticImages', JSON.stringify(updatedFinalImages));
                        updateRowField(rowId, 'finalCosmeticImage', imageUrl);
                    } else {
                        updateRowField(rowId, 'finalCosmeticImage', imageUrl);
                    }
                }
            };
            reader.readAsDataURL(file);
        } else {
            handleFinalImageUpload(partNumber, type, file, currentChildTest?.id);
        }
    };

    // NEW: Get checkpoint data for part
    const getCheckpointDataForPart = (partNumber: string) => {
        try {
            const chamberLoadsStr = localStorage.getItem('chamberLoads');
            if (!chamberLoadsStr) return null;

            const chamberLoads = JSON.parse(chamberLoadsStr);
            
            for (const load of chamberLoads) {
                if (load.parts && Array.isArray(load.parts)) {
                    const part = load.parts.find((p: any) => p.partNumber === partNumber);
                   
                    if (part) {
                        return {
                            testUnit: part.testUnit?.toLowerCase(),
                            checkpoints: part.checkpoints || [],
                            checkpointIndex: part.checkpointIndex || 0,
                            totalCheckpoints: part.totalCheckpoints || (part.checkpoints ? part.checkpoints.length : 0),
                            currentCheckpoint: part.currentCheckpoint || ''
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting checkpoint data:', error);
            return null;
        }
    };

    // NEW: Check if checkpoint button should be shown for a row
    const shouldShowCheckpointButton = (row: FormRow): boolean => {
        // CONDITION 1: Status must be "Pass"
        if (row.status !== "Pass") return false;
        
        const checkpointData = getCheckpointDataForPart(row.partNumber);
        if (!checkpointData) return false;
        
        // CONDITION 2: Check testUnit
        // const validTestUnits = ['cycle', 'hour', 'drops', 'orientations'];
        // if (!checkpointData.testUnit || !validTestUnits.includes(checkpointData.testUnit)) return false;
        
        // CONDITION 3: Check if checkpoints array exists
        // if (!checkpointData.checkpoints || checkpointData.checkpoints.length === 0) return false;
        
        // CONDITION 4: Check if checkpoints remain
        // return checkpointData.checkpointIndex < checkpointData.totalCheckpoints - 1;
    };

    // NEW: Get next checkpoint name
    const getNextCheckpointName = (row: FormRow): string => {
        const checkpointData = getCheckpointDataForPart(row.partNumber);
        if (!checkpointData || !checkpointData.checkpoints) return 'Checkpoint';
        
        const nextIndex = checkpointData.checkpointIndex + 1;
        if (nextIndex >= checkpointData.checkpoints.length) return 'Complete';
        
        return checkpointData.checkpoints[nextIndex];
    };

    // Render image cell for a row
    const renderImageCell = (row: FormRow, imageType: 'cosmetic' | 'nonCosmetic', isFinal: boolean = false) => {
        const existingImages = loadImagesFromStorage(row.partNumber);
        const isPartVerified = isSecondRound ? verifiedPartsForFinalUpload.has(row.partNumber) : true;

        if (isFinal) {
            const imagesKey = imageType === 'cosmetic' ? 'finalCosmeticImages' : 'nonCosmeticImages';
            const storedImages = imageType === 'cosmetic' 
                ? existingImages.finalCosmeticImages || []
                : existingImages.finalNonCosmeticImages || [];
            const uploadedImages = row[imagesKey] || [];

            return (
                <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                    <div className="space-y-2">
                        {storedImages.length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 mb-1">
                                    Final {imageType} images ({storedImages.length}):
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    {storedImages.map((img, imgIndex) => (
                                        <div key={imgIndex} className="relative group">
                                            <img
                                                src={img}
                                                alt={`Final ${imageType} ${imgIndex + 1}`}
                                                className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : uploadedImages.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {uploadedImages.map((img: string, imgIndex: number) => (
                                        <div key={imgIndex} className="relative group">
                                            <img
                                                src={img}
                                                alt={`Final ${imageType} ${imgIndex + 1}`}
                                                className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {imageType === 'cosmetic' && projectType === "Hulk" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = true;
                                            input.onchange = (e) => {
                                                const files = (e.target as HTMLInputElement).files;
                                                if (files) {
                                                    Array.from(files).forEach(file => {
                                                        handleFinalRoundImageUpload(row.id, row.partNumber, imageType, file);
                                                    });
                                                }
                                            };
                                            input.click();
                                        }}
                                        className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                        + Add More
                                    </button>
                                )}
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors ${!isPartVerified ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50' : 'cursor-pointer hover:border-purple-400 border-purple-300 bg-purple-50'}`}>
                                <Upload size={20} className={`mb-2 ${!isPartVerified ? 'text-gray-400' : 'text-purple-400'}`} />
                                <span className={`text-sm font-medium ${!isPartVerified ? 'text-gray-500' : 'text-purple-600'}`}>
                                    {!isPartVerified ? 'Scan Part First' : `Upload Final ${imageType === 'cosmetic' ? 'Cosmetic' : 'Non-Cosmetic'}`}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {!isPartVerified ? 'Part must be scanned' : 'Click to browse'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple={imageType === 'cosmetic' && projectType === "Hulk"}
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files && isPartVerified) {
                                            Array.from(files).forEach(file => {
                                                handleFinalRoundImageUpload(row.id, row.partNumber, imageType, file);
                                            });
                                        }
                                    }}
                                    className="hidden"
                                    disabled={!isPartVerified}
                                />
                            </label>
                        )}
                    </div>
                </td>
            );
        } else {
            const imagesKey = imageType === 'cosmetic' ? 'cosmeticImages' : 'nonCosmeticImages';
            const storedImages = imageType === 'cosmetic' 
                ? existingImages.cosmeticImages
                : existingImages.nonCosmeticImages;
            const uploadedImages = row[imagesKey] || [];

            return (
                <td className="px-4 py-4 border-r border-gray-200 min-w-[200px]">
                    <div className="space-y-2">
                        {storedImages.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {storedImages.map((img, imgIndex) => (
                                        <div key={imgIndex} className="relative group">
                                            <img
                                                src={img}
                                                alt={`${imageType === 'cosmetic' ? 'Cosmetic' : 'Non-Cosmetic'} ${imgIndex + 1}`}
                                                className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : uploadedImages.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {uploadedImages.map((img: string, imgIndex: number) => (
                                        <div key={imgIndex} className="relative group">
                                            <img
                                                src={img}
                                                alt={`${imageType === 'cosmetic' ? 'Cosmetic' : 'Non-Cosmetic'} ${imgIndex + 1}`}
                                                className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.multiple = imageType === 'cosmetic';
                                        input.onchange = (e) => {
                                            const files = (e.target as HTMLInputElement).files;
                                            if (files) {
                                                Array.from(files).forEach(file => {
                                                    if (imageType === 'cosmetic') {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const imageUrl = event.target?.result as string;
                                                            const updatedCosmeticImages = [...uploadedImages, imageUrl];
                                                            updateRowField(row.id, imagesKey, JSON.stringify(updatedCosmeticImages));
                                                            updateRowField(row.id, `${imageType}Image`, updatedCosmeticImages[0] || '');
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } else {
                                                        handleImageUpload(row.id, imageType, file);
                                                    }
                                                });
                                            }
                                        };
                                        input.click();
                                    }}
                                    className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                >
                                    + Add More
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-blue-50">
                                <Upload size={20} className="text-blue-400 mb-2" />
                                <span className="text-sm font-medium text-blue-600">
                                    Upload {imageType === 'cosmetic' ? 'Cosmetic' : 'Non-Cosmetic'}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">Click to browse</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files) {
                                            if (imageType === 'cosmetic') {
                                                Array.from(files).forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const imageUrl = event.target?.result as string;
                                                        const updatedCosmeticImages = [...uploadedImages, imageUrl];
                                                        updateRowField(row.id, imagesKey, JSON.stringify(updatedCosmeticImages));
                                                        updateRowField(row.id, `${imageType}Image`, updatedCosmeticImages[0] || '');
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            } else {
                                                const file = files[0];
                                                if (file) {
                                                    handleImageUpload(row.id, imageType, file);
                                                }
                                            }
                                        }
                                    }}
                                    className="hidden"
                                    multiple={imageType === 'cosmetic'}
                                />
                            </label>
                        )}
                    </div>
                </td>
            );
        }
    };

    // Render cropped images cell
    const renderCroppedImagesCell = (row: FormRow, isFinal: boolean = false) => {
        const existingImages = loadImagesFromStorage(row.partNumber);
        const imagesKey = isFinal ? 'finalNonCosmeticImages' : 'nonCosmeticImages';
        const storedImages = isFinal 
            ? existingImages.finalNonCosmeticImages || []
            : existingImages.nonCosmeticImages;

        if (row.croppedImages && row.croppedImages.length > 0) {
            return (
                <td className="px-4 py-4 border-r border-gray-200 min-w-[150px]">
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                            {row.croppedImages.map((img, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                    <img
                                        src={img}
                                        alt={`${isFinal ? 'Final Cropped' : 'Cropped'} ${imgIndex + 1}`}
                                        className="w-16 h-16 object-contain border rounded-lg"
                                    />
                                    {row.regionLabel && imgIndex === 0 && (
                                        <div className="text-xs text-center font-semibold text-gray-700 mt-1">
                                            {row.regionLabel}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </td>
            );
        } else if (storedImages.length > 0 && shouldSplitImages()) {
            return (
                <td className="px-4 py-4 border-r border-gray-200 min-w-[150px]">
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <span className="text-xs text-gray-500">
                            {isFinal ? 'Processing final cropped images...' : 'Processing cropped images...'}
                        </span>
                    </div>
                </td>
            );
        } else {
            return (
                <td className="px-4 py-4 border-r border-gray-200 min-w-[150px]">
                    <div className="text-xs text-gray-400 text-center">
                        {shouldSplitImages() ? 'No images uploaded' : 'No splitting required'}
                    </div>
                </td>
            );
        }
    };

    // Render read-only first round images for Unload
    const renderReadOnlyFirstRoundImages = (row: FormRow, imageType: 'cosmetic' | 'nonCosmetic') => {
        const existingImages = loadImagesFromStorage(row.partNumber);
        const storedImages = imageType === 'cosmetic' 
            ? existingImages.cosmeticImages
            : existingImages.nonCosmeticImages;

        return (
            <td className="px-4 py-4 border-r border-gray-200 min-w-[150px] bg-gray-50">
                {storedImages.length > 0 ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                            {storedImages.slice(0, 4).map((img, imgIndex) => (
                                <div key={imgIndex} className="relative group">
                                    <img
                                        src={img}
                                        alt={`First Round ${imageType === 'cosmetic' ? 'Cosmetic' : 'Non-Cosmetic'} ${imgIndex + 1}`}
                                        className="w-16 h-16 object-cover border rounded-lg cursor-pointer"
                                        onClick={() => {
                                            window.open(img, '_blank');
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {storedImages.length > 4 && (
                            <div className="text-xs text-gray-500">
                                +{storedImages.length - 4} more
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 text-center py-2">No first round images</div>
                )}
            </td>
        );
    };

    // Render read-only first round cropped images for Unload
    const renderReadOnlyFirstRoundCroppedImages = (row: FormRow) => {
        return (
            <td className="px-4 py-4 border-r border-gray-200 min-w-[150px] bg-gray-50">
                {row.croppedImages && row.croppedImages.length > 0 ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                            {row.croppedImages.slice(0, 4).map((img, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                    <img
                                        src={img}
                                        alt={`First Round Cropped ${imgIndex + 1}`}
                                        className="w-16 h-16 object-contain border rounded-lg cursor-pointer"
                                        onClick={() => {
                                            window.open(img, '_blank');
                                        }}
                                    />
                                    {row.regionLabel && imgIndex === 0 && (
                                        <div className="text-[10px] text-center font-semibold text-gray-700 mt-1 truncate">
                                            {row.regionLabel}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {row.croppedImages.length > 4 && (
                            <div className="text-xs text-gray-500">
                                +{row.croppedImages.length - 4} more
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 text-center py-2">
                        {shouldSplitImages() ? 'No cropped images' : 'N/A'}
                    </div>
                )}
            </td>
        );
    };

    return (
        <>
            {selectedParts.map((part) => {
                const existingImages = loadImagesFromStorage(part.partNumber);
                const checkpointData = getCheckpointDataForPart(part.partNumber);
                const hasCheckpoints = checkpointData?.checkpoints?.length > 0;
                const isCheckpointTest = checkpointData?.testUnit && 
                    ['cycle', 'hour', 'drops', 'orientations'].includes(checkpointData.testUnit);

                return (
                    <div key={part.id} className="mb-8">
                        <div className="bg-gray-100 border border-gray-300 rounded-t-lg p-3">
                            <h4 className="font-semibold text-gray-800 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                                    {selectedParts.indexOf(part) + 1}
                                </span>
                                Part: {part.partNumber} (Serial: {part.serialNumber})
                                {currentChildTest && (
                                    <span className="ml-2 text-sm text-blue-600 font-normal">
                                        - {currentChildTest.name}
                                    </span>
                                )}

                                {/* Show checkpoint status */}
                                {hasCheckpoints && isCheckpointTest && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                                        <Clock size={10} />
                                        Checkpoint Test ({checkpointData.testUnit})
                                    </span>
                                )}

                                {/* Show image status badge */}
                                {(existingImages.cosmeticImages.length > 0 || existingImages.nonCosmeticImages.length > 0 || (isSecondRound && (existingImages.finalCosmeticImages?.length || 0) > 0) || (isSecondRound && (existingImages.finalNonCosmeticImages?.length || 0) > 0)) && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                        <ImageIcon size={10} />
                                        {isSecondRound ? 'Final images loaded from storage' : 'Images loaded from storage'}
                                    </span>
                                )}
                            </h4>
                        </div>
                        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                SR.No
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                Test Date
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                Config
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                Sample ID
                                            </th>

                                            {/* First Round Images (only show if not Unload) */}
                                            {!isSecondRound && (
                                                <>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Non-Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Cropped Images
                                                    </th>
                                                </>
                                            )}

                                            {/* Unload Images */}
                                            {isSecondRound && (
                                                <>
                                                    {/* First Round Images (Read-only display) */}
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 bg-gray-50">
                                                        Pre Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 bg-gray-50">
                                                        Pre Non-Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 bg-gray-50">
                                                        Pre Cropped Images
                                                    </th>

                                                    {/* Unload Images */}
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Post Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Post Non-Cosmetic Images
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                        Post Cropped Images
                                                    </th>
                                                </>
                                            )}

                                            {forms.customColumns?.map((column) => (
                                                <th key={column.id} className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 relative group">
                                                    <div className="flex items-center justify-between">
                                                        <span>{column.label}</span>
                                                        <button
                                                            onClick={() => removeCustomColumn(column.id)}
                                                            className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700 transition-opacity"
                                                            title="Remove column"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}

                                            {/* Single Status Column */}
                                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                                Status
                                            </th>

                                            {/* Actions Column (for checkpoints) */}
                                            {hasCheckpoints && isCheckpointTest && !isSecondRound && (
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {rowsByPart[part.partNumber]?.map((row, index) => {
                                            const isPartVerified = verifiedPartsForFinalUpload.has(row.partNumber);
                                            const showCheckpointBtn = shouldShowCheckpointButton(row);
                                            const nextCheckpointName = getNextCheckpointName(row);

                                            return (
                                                <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                                    <td className="px-4 py-4 text-center font-semibold text-gray-900 border-r border-gray-200">
                                                        {row.srNo}
                                                    </td>

                                                    <td className="px-4 py-4 border-r border-gray-200">
                                                        <input
                                                            type="date"
                                                            value={row.testDate}
                                                            onChange={(e) => updateRowField(row.id, 'testDate', e.target.value)}
                                                            className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 border-r border-gray-200">
                                                        <input
                                                            value={row.config}
                                                            onChange={(e) => updateRowField(row.id, 'config', e.target.value)}
                                                            className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 border-r border-gray-200">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                value={row.sampleId}
                                                                onChange={(e) => updateRowField(row.id, 'sampleId', e.target.value)}
                                                                className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                            {row.checkpointName && (
                                                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                                                    {row.checkpointName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* First Round Images (only show if not Unload) */}
                                                    {!isSecondRound && (
                                                        <>
                                                            {renderImageCell(row, 'cosmetic', false)}
                                                            {renderImageCell(row, 'nonCosmetic', false)}
                                                            {renderCroppedImagesCell(row, false)}
                                                        </>
                                                    )}

                                                    {/* Unload Images */}
                                                    {isSecondRound && (
                                                        <>
                                                            {/* First Round Images (Read-only) */}
                                                            {renderReadOnlyFirstRoundImages(row, 'cosmetic')}
                                                            {renderReadOnlyFirstRoundImages(row, 'nonCosmetic')}
                                                            {renderReadOnlyFirstRoundCroppedImages(row)}

                                                            {/* Unload Images */}
                                                            {renderImageCell(row, 'cosmetic', true)}
                                                            {renderImageCell(row, 'nonCosmetic', true)}
                                                            {renderCroppedImagesCell(row, true)}
                                                        </>
                                                    )}

                                                    {/* Custom Columns */}
                                                    {forms.customColumns?.map((column) => (
                                                        <td key={column.id} className={`px-4 py-4 border-r border-gray-200 ${column.type === 'image' ? 'min-w-[200px]' : ''}`}>
                                                            <RowFieldRenderer
                                                                row={row}
                                                                column={column}
                                                                onFieldChange={updateRowField}
                                                                onImageUpload={(rowId, file) => {
                                                                    if (column.type === 'image') {
                                                                        const reader = new FileReader();
                                                                        reader.onload = (e) => {
                                                                            updateRowField(rowId, column.id, e.target?.result as string);
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                    ))}

                                                    {/* Single Status Column */}
                                                    <td className="px-4 py-4 border-r border-gray-200">
                                                        <select
                                                            value={row.status}
                                                            onChange={(e) => {
                                                                updateRowField(row.id, 'status', e.target.value);
                                                                // If status changes to Fail, trigger complete test
                                                                if (e.target.value === "Fail" && onCompleteTestClick) {
                                                                    setTimeout(() => onCompleteTestClick(row), 100);
                                                                }
                                                            }}
                                                            className={`w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                                row.status === "Pass" ? "bg-green-50 text-green-700 border-green-200" :
                                                                row.status === "Fail" ? "bg-red-50 text-red-700 border-red-200" :
                                                                row.status === "Checkpoint" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                "bg-white border-gray-300 text-gray-700"
                                                            }`}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="Pass">Pass</option>
                                                            <option value="Fail">Fail</option>
                                                            {hasCheckpoints && <option value="Checkpoint">Checkpoint</option>}
                                                        </select>
                                                    </td>

                                                    {/* Actions Column (for checkpoints) */}
                                                    { (
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col gap-2">
                                                                {/* Checkpoint Button - Only shows when ALL conditions met */}
                                                                {showCheckpointBtn && (
                                                                    <button
                                                                        onClick={() => onCheckpointClick && onCheckpointClick(row)}
                                                                        className="w-full px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
                                                                    >
                                                                        Checkpoint: {nextCheckpointName}
                                                                    </button>
                                                                )}
                                                         
                                                                {/* Complete Test Button - Always visible */}
                                                                <button
                                                                    onClick={() => onCompleteTestClick && onCompleteTestClick(row)}
                                                                    className={`w-full px-3 py-2 rounded-lg font-medium text-sm ${
                                                                        row.status === "Fail" 
                                                                            ? "bg-red-600 text-white hover:bg-red-700" 
                                                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                                                    } transition-colors`}
                                                                >
                                                                    {row.status === "Fail" ? "Complete Test (Fail)" : "Complete Test"}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
};