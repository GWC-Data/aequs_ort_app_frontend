import React from 'react';
import { X } from 'lucide-react';
import { ScanState, ScannedPart, ImageType } from '../../types';
import { ScanInput } from './ScanInput';
import { ScannedPartItem } from './ScannedPartItem';
import { ScanSummary } from './ScanSummary';

interface ScanModalProps {
    scanState: ScanState;
    setScanState: React.Dispatch<React.SetStateAction<ScanState>>;
    handlePartScan: () => void;
    handleRemoveScannedPart: (partId: number) => void;
    handleRemoveScannedImage?: (partId: number, type: ImageType, imageIndex: number) => void;
    handleScanImageUpload?: (partId: number, type: ImageType, file: File) => void;
    handleConfirmScannedParts: () => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({
    scanState,
    setScanState,
    handlePartScan,
    handleRemoveScannedPart,
    handleConfirmScannedParts
}) => {
    if (!scanState.showScanModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-white sticky top-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Scan Parts for Unload </h3>
                        <p className="text-sm text-gray-600 mt-1">Verify parts before uploading final images</p>
                    </div>
                    <button
                        onClick={() => setScanState(prev => ({ ...prev, showScanModal: false }))}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Part Scan Input */}
                    <ScanInput
                        partInput={scanState.partInput}
                        setPartInput={(value) => setScanState(prev => ({ ...prev, partInput: value }))}
                        isScanning={scanState.isScanning}
                        onScan={handlePartScan}
                    />

                    {/* Scanned Parts List */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Scanned Parts ({scanState.scannedParts.length})
                        </h4>
                        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                            {scanState.scannedParts.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No parts scanned yet
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {scanState.scannedParts.map((part) => (
                                        <ScannedPartItem
                                            key={part.id}
                                            part={part}
                                            onRemove={handleRemoveScannedPart}
                                            uploadingImages={scanState.uploadingImages}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    {scanState.scannedParts.length > 0 && (
                        <ScanSummary scannedParts={scanState.scannedParts} />
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setScanState(prev => ({ ...prev, showScanModal: false }))}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmScannedParts}
                            disabled={scanState.scannedParts.length === 0}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Scanned Parts ({scanState.scannedParts.length} parts)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};