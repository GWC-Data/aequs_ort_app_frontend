import React, { useRef } from 'react';
import { Upload, ImageIcon, AlertCircle, X } from 'lucide-react';
import { AssignedPart, ChildTest, TestRecord, ImageType } from '../../types';

interface ImageUploadSectionProps {
    type: ImageType;
    part: AssignedPart;
    rowData: any;
    existingImages: {
        cosmeticImages: string[];
        nonCosmeticImages: string[];
        finalCosmeticImages?: string[];
        finalNonCosmeticImages?: string[];
    };
    isSecondRound: boolean;
    isPartVerified: boolean;
    projectType: string;
    processing: boolean;
    processingImages?: Record<string, boolean>;
    shouldSplitImages?: (testName?: string) => boolean;
    currentTestRecord: TestRecord;
    currentChildTest?: ChildTest;
    handleImageUpload: (partNumber: string, testName: string, type: ImageType, file: File, childTestId?: string) => void;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    type,
    part,
    rowData,
    existingImages,
    isSecondRound,
    isPartVerified,
    projectType,
    processing,
    processingImages = {},
    shouldSplitImages = () => false,
    currentTestRecord,
    currentChildTest,
    handleImageUpload
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCosmetic = type === 'cosmetic';
    const imagesKey = isSecondRound 
        ? (isCosmetic ? 'finalCosmeticImages' : 'finalNonCosmeticImages')
        : (isCosmetic ? 'cosmeticImages' : 'nonCosmeticImages');
    
    const storedImages = isSecondRound
        ? (isCosmetic ? existingImages.finalCosmeticImages : existingImages.finalNonCosmeticImages) || []
        : (isCosmetic ? existingImages.cosmeticImages : existingImages.nonCosmeticImages);

    const uploadedImages = rowData?.[imagesKey] || [];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && !processing && !(isSecondRound && !isPartVerified)) {
            const files = Array.from(e.target.files);
            
            if (isCosmetic && projectType === "Hulk") {
                // For Hulk project, allow multiple cosmetic images
                files.forEach(file => {
                    handleImageUpload(
                        part.partNumber,
                        currentTestRecord.testName,
                        type,
                        file,
                        currentChildTest?.id
                    );
                });
            } else {
                // For Flash project or non-cosmetic images, single upload
                const file = files[0];
                if (file) {
                    handleImageUpload(
                        part.partNumber,
                        currentTestRecord.testName,
                        type,
                        file,
                        currentChildTest?.id
                    );
                }
            }
            
            e.target.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        // This would be connected to a parent handler
        console.log(`Remove image ${index} for part ${part.partNumber}, type ${type}`);
    };

    const getSectionTitle = () => {
        if (isSecondRound) {
            return isCosmetic ? 'Final Cosmetic Images' : 'Final Non-Cosmetic Images';
        }
        return isCosmetic ? 'Cosmetic Images' : 'Non-Cosmetic Images';
    };

    const getBorderColor = () => {
        if (processing || (isSecondRound && !isPartVerified)) return 'border-gray-300';
        if (isSecondRound) return isCosmetic ? 'border-purple-300' : 'border-orange-300';
        return isCosmetic ? 'border-blue-300' : 'border-green-300';
    };

    const getBgColor = () => {
        if (processing || (isSecondRound && !isPartVerified)) return 'bg-gray-50';
        if (isSecondRound) return isCosmetic ? 'bg-purple-50' : 'bg-orange-50';
        return isCosmetic ? 'bg-blue-50' : 'bg-green-50';
    };

    const getTextColor = () => {
        if (processing || (isSecondRound && !isPartVerified)) return 'text-gray-500';
        if (isSecondRound) return isCosmetic ? 'text-purple-600' : 'text-orange-600';
        return isCosmetic ? 'text-blue-600' : 'text-green-600';
    };

    const getIconColor = () => {
        if (processing || (isSecondRound && !isPartVerified)) return 'text-gray-400';
        if (isSecondRound) return isCosmetic ? 'text-purple-400' : 'text-orange-400';
        return isCosmetic ? 'text-blue-400' : 'text-green-400';
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {getSectionTitle()}
            </label>

            {!isCosmetic && processing && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm text-blue-600">Processing with OpenCV...</span>
                </div>
            )}

            {/* Display existing images */}
            {storedImages.length > 0 ? (
                <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">
                        {isSecondRound ? 'Final ' : 'Pre-uploaded '}images ({storedImages.length}):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {storedImages.map((img, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={img}
                                    alt={`${getSectionTitle()} ${index + 1}`}
                                    className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                    {isSecondRound ? 'Final ' : 'Pre-uploaded '} {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : uploadedImages.length > 0 ? (
                <div className="mb-3">
                    <div className="space-y-4">
                        {uploadedImages.map((img: string, index: number) => {
                            const croppedImage = !isCosmetic ? rowData?.croppedImages?.[index] : null;

                            return (
                                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        {/* Original image */}
                                        <div className="flex-1">
                                            <div className="relative group">
                                                <img
                                                    src={img}
                                                    alt={`${getSectionTitle()} ${index + 1}`}
                                                    className="w-full h-32 object-cover border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                />
                                                <button
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="Remove this image"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                                    Image {index + 1}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Corresponding cropped image for non-cosmetic */}
                                        {!isCosmetic && croppedImage && shouldSplitImages(currentTestRecord?.testName) && (
                                            <div className="flex-1">
                                                <div className="h-full flex flex-col justify-center">
                                                    <div className="text-xs text-gray-600 mb-1">
                                                        <span className="font-semibold">Detected Region:</span> {rowData.regionLabel}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <img
                                                            src={croppedImage}
                                                            alt={`Cropped ${index + 1}`}
                                                            className="w-24 h-24 object-contain border rounded-lg shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {isCosmetic && projectType === "Hulk" && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors mt-2"
                        >
                            + Add More
                        </button>
                    )}
                </div>
            ) : (
                <div className="text-center py-4 text-gray-500">
                    No {isSecondRound ? 'final ' : ''}{type} images uploaded yet
                </div>
            )}

            {/* Upload area */}
            <div
                className={`flex items-center justify-center h-20 border-2 border-dashed rounded-lg transition-colors ${processing || (isSecondRound && !isPartVerified) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} ${getBorderColor()} ${getBgColor()}`}
                onClick={() => !processing && !(isSecondRound && !isPartVerified) && fileInputRef.current?.click()}
            >
                <div className="text-center">
                    <Upload className={`mx-auto mb-1 ${getIconColor()}`} size={20} />
                    <span className={`text-sm font-medium ${getTextColor()}`}>
                        {processing ? 'Processing...' : (isSecondRound && !isPartVerified) ? 'Scan Part First' : `Upload ${getSectionTitle()}`}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                        {(isSecondRound && !isPartVerified) ? 'Part must be scanned' : 'Click to add image' + (isCosmetic && projectType === "Hulk" ? 's' : '')}
                    </p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple={isCosmetic && projectType === "Hulk"}
                    onChange={handleFileSelect}
                    disabled={processing || (isSecondRound && !isPartVerified)}
                />
            </div>

            {/* Show total count */}
            {(storedImages.length > 0 || uploadedImages.length > 0) && (
                <div className="mt-2 text-xs text-gray-600">
                    Total: {storedImages.length + uploadedImages.length} image(s)
                </div>
            )}
        </div>
    );
};