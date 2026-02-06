import React from 'react';
import { Scan } from 'lucide-react';

interface ScanInputProps {
    partInput: string;
    setPartInput: (value: string) => void;
    isScanning: boolean;
    onScan: () => void;
}

export const ScanInput: React.FC<ScanInputProps> = ({
    partInput,
    setPartInput,
    isScanning,
    onScan
}) => {
    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan Part Number
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={partInput}
                    onChange={(e) => setPartInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onScan()}
                    placeholder="Enter part number (e.g., PART-001)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    onClick={onScan}
                    disabled={isScanning || !partInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {isScanning ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <>
                            <Scan size={20} />
                            <span>Scan</span>
                        </>
                    )}
                </button>
            </div>
            <p className="text-start text-sm text-gray-500 mt-2">
                Enter part number to verify for Unload  testing
            </p>
        </div>
    );
};