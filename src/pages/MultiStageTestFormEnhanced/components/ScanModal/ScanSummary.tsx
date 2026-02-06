import React from 'react';
import { ScannedPart } from '../../types';

interface ScanSummaryProps {
    scannedParts: ScannedPart[];
}

export const ScanSummary: React.FC<ScanSummaryProps> = ({ scannedParts }) => {
    const totalCosmeticImages = scannedParts.reduce((sum, part) => sum + (part.cosmeticImages?.length || 0), 0);
    const totalNonCosmeticImages = scannedParts.reduce((sum, part) => sum + (part.nonCosmeticImages?.length || 0), 0);
    const partsWithImages = scannedParts.filter(p => p.hasImages).length;

    return (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-purple-800 mb-2">Scan Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-600">Parts scanned:</span>
                    <span className="font-semibold ml-2">{scannedParts.length}</span>
                </div>
                <div>
                    <span className="text-gray-600">Parts with images:</span>
                    <span className="font-semibold ml-2">
                        {partsWithImages} / {scannedParts.length}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Total cosmetic images:</span>
                    <span className="font-semibold ml-2">{totalCosmeticImages}</span>
                </div>
                <div>
                    <span className="text-gray-600">Total non-cosmetic images:</span>
                    <span className="font-semibold ml-2">{totalNonCosmeticImages}</span>
                </div>
            </div>
        </div>
    );
};