import React from 'react';
import { X, ImageIcon } from 'lucide-react';
import { ScannedPart, ImageType } from '../../types';

interface ScannedPartItemProps {
    part: ScannedPart;
    onRemove: (partId: number) => void;
    onImageUpload?: (partId: number, type: ImageType, file: File) => void;
    onRemoveImage?: (partId: number, type: ImageType, imageIndex: number) => void;
    uploadingImages?: { [key: string]: { [key: string]: boolean } };
}

export const ScannedPartItem: React.FC<ScannedPartItemProps> = ({
    part,
    onRemove,
    uploadingImages
}) => {
    const isUploadingCosmetic = uploadingImages?.[part.id]?.cosmetic || false;
    const isUploadingNonCosmetic = uploadingImages?.[part.id]?.nonCosmetic || false;

    return (
        <div className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="font-medium text-gray-800 text-lg">{part.partNumber}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${part.scanStatus === 'OK' || part.scanStatus === 'SECOND_ROUND_OK'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {part.scanStatus === 'SECOND_ROUND_OK' ? 'Verified for Unload ' : part.scanStatus}
                        </span>
                        {(part.cosmeticImages?.length > 0 || part.nonCosmeticImages?.length > 0) && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                                <ImageIcon size={12} />
                                {part.cosmeticImages?.length || 0} cosmetic, {part.nonCosmeticImages?.length || 0} non-cosmetic
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                        <div>Serial: {part.serialNumber} • Ticket: {part.ticketCode}</div>
                        <div>Project: {part.project} | Build: {part.build} | Colour: {part.colour}</div>
                        <div className="text-gray-400 text-xs">Scanned: {part.scannedAt}</div>
                    </div>
                </div>
                <button
                    onClick={() => onRemove(part.id)}
                    className="text-red-500 hover:text-red-700 transition-colors ml-4"
                    title="Remove part"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};