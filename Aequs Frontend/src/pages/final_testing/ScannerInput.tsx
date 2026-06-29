import React, { useRef, useEffect } from "react";
import { Zap, ZapOff, Square, Play } from "lucide-react";

interface TempScannedPart {
  partNumber: string;
  scanStatus: "Cosmetic OK" | "Cosmetic Not OK" | null;
}

interface ScannerInputProps {
  isScanningActive: boolean;
  barcodeInput: string;
  tempScannedParts: TempScannedPart[];
  selectedTicket: any;
  onToggleScanning: () => void;
  onBarcodeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessBarcode: (data: string) => void;
}

const ScannerInput: React.FC<ScannerInputProps> = ({
  isScanningActive,
  barcodeInput,
  tempScannedParts,
  selectedTicket,
  onToggleScanning,
  onBarcodeInputChange,
  onProcessBarcode,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanningActive, tempScannedParts]);

  const handleAutoScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedTicket) {
      e.preventDefault();
      const barcodeData = barcodeInput.trim();
      if (barcodeData) {
        onProcessBarcode(barcodeData);

        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="space-y-6">
        {/* Start/Stop Scanner Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">Scanner Control</h3>
            <p className="text-sm text-gray-500">
              {isScanningActive
                ? "Scanner is active - scan barcodes continuously"
                : "Click Start to begin continuous scanning"}
            </p>
          </div>
          <button
            onClick={onToggleScanning}
            className={`${
              isScanningActive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition-colors`}
          >
            {isScanningActive ? (
              <>
                <Square className="h-5 w-5" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Start Scanning
              </>
            )}
          </button>
        </div>

        {/* Scanner Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="barcodeInput"
              className="text-base font-medium flex items-center gap-2"
            >
              {isScanningActive ? (
                <Zap className="h-4 w-4 text-green-600 animate-pulse" />
              ) : (
                <ZapOff className="h-4 w-4 text-gray-400" />
              )}
              Scanner Input <span className="text-red-600">*</span>
              {isScanningActive && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded animate-pulse">
                  Active - Keep cursor in this box
                </span>
              )}
            </label>
            <input
              id="barcodeInput"
              ref={inputRef}
              value={barcodeInput}
              onChange={onBarcodeInputChange}
              onKeyDown={handleAutoScan}
              placeholder={
                isScanningActive
                  ? "Keep cursor here and scan barcodes (Press Enter after each scan)"
                  : "Click 'Start Scanning' to begin"
              }
              className="w-full h-12 px-4 font-mono text-lg border-2 border-blue-300 focus:border-green-500 focus:outline-none rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!isScanningActive}
              autoComplete="off"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {isScanningActive
                  ? "Keep your cursor in this box and scan barcodes. Press Enter after each scan."
                  : "Scan barcodes directly - no input box needed"}
              </p>
              {isScanningActive && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">
                    Ready to scan
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerInput;