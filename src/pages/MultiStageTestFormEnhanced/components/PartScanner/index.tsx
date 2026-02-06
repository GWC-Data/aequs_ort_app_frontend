import React from 'react';
import { Scan, AlertTriangle } from 'lucide-react';

interface PartScannerProps {
    onOpenScanModal: () => void;
    isSecondRound: boolean;
}

export const PartScanner: React.FC<PartScannerProps> = ({ onOpenScanModal, isSecondRound }) => {
    if (!isSecondRound) return null;

    return (
        <div className="mt-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                Unload  - Upload Final Images
            </span>
            <div className="mt-2 flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" size={16} />
                <span className="text-sm text-gray-700">
                    Scan parts before uploading final images
                </span>
                <button
                    onClick={onOpenScanModal}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                    <Scan size={16} />
                    Scan Parts
                </button>
            </div>
        </div>
    );
};