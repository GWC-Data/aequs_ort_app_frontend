import React from 'react';
import { AssignedPart, ChildTest, TestRecord } from '../../types';
import { ImageIcon, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ImageUploadSection } from './ImageUploadSection';

interface PartCardProps {
    part: AssignedPart;
    index: number;
    rowData: any;
    existingImages: any;
    isSecondRound: boolean;
    isPartVerified: boolean;
    currentChildTest?: ChildTest;
    currentTestRecord: TestRecord;
    projectType: string;
    shouldSplitImages: (testName?: string) => boolean;
    processing: boolean;
    processingImages: Record<string, boolean>;
    handleImageUpload: (partNumber: string, testName: string, type: 'cosmetic' | 'nonCosmetic', file: File, childTestId?: string) => void;
}

export const PartCard: React.FC<PartCardProps> = ({
    part,
    index,
    rowData,
    existingImages,
    isSecondRound,
    isPartVerified,
    currentChildTest,
    currentTestRecord,
    projectType,
    shouldSplitImages,
    processing,
    processingImages,
    handleImageUpload
}) => {
    return (
        <div key={part.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-800 text-lg">{part.partNumber}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${part.scanStatus === 'OK'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {part.scanStatus}
                        </span>

                        {/* Show pre-uploaded images badge */}
                        {(existingImages.cosmeticImages.length > 0 || existingImages.nonCosmeticImages.length > 0 || (isSecondRound && (existingImages.finalCosmeticImages?.length || 0) > 0) || (isSecondRound && (existingImages.finalNonCosmeticImages?.length || 0) > 0)) && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                <ImageIcon size={10} />
                                {isSecondRound ? 'Final images loaded' : 'Images loaded from storage'}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Serial:</span> {part.serialNumber}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Location:</span> {part.location}
                    </p>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Assigned:</span> {part.assignedToTest}
                    </p>
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-4 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${rowData?.status === "Pass" ? "bg-green-100 text-green-800" :
                    rowData?.status === "Fail" ? "bg-red-100 text-red-800" :
                        rowData?.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                    }`}>
                    {rowData?.status || "Not Started"}
                </span>
                {isSecondRound && !isPartVerified && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Not Scanned
                    </span>
                )}
                {isSecondRound && isPartVerified && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Verified
                    </span>
                )}
            </div>

            {/* Show warning if part is not verified in Unload  */}
            {isSecondRound && !isPartVerified && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                    <div className="text-xs text-red-800">
                        <p className="font-medium mb-1">This part has not been scanned yet</p>
                        <p>Please scan this part using the "Scan Parts" button before uploading final images.</p>
                    </div>
                </div>
            )}

            {/* Image Upload Sections */}
            <ImageUploadSection
                type="cosmetic"
                part={part}
                rowData={rowData}
                existingImages={existingImages}
                isSecondRound={isSecondRound}
                isPartVerified={isPartVerified}
                projectType={projectType}
                processing={processing}
                currentTestRecord={currentTestRecord}
                currentChildTest={currentChildTest}
                handleImageUpload={handleImageUpload}
            />

            <ImageUploadSection
                type="nonCosmetic"
                part={part}
                rowData={rowData}
                existingImages={existingImages}
                isSecondRound={isSecondRound}
                isPartVerified={isPartVerified}
                projectType={projectType}
                processing={processing}
                processingImages={processingImages}
                shouldSplitImages={shouldSplitImages}
                currentTestRecord={currentTestRecord}
                currentChildTest={currentChildTest}
                handleImageUpload={handleImageUpload}
            />
        </div>
    );
};