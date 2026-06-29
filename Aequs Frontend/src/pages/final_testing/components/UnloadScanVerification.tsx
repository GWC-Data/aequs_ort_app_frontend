import React, { useState, useRef, useEffect } from "react";
import { ChamberData, Part } from "../types";
import { useToast } from "@/components/ui/use-toast";
 
interface UnloadScanVerificationProps {
  onBack: () => void;
  onVerified: (partsToShow: Part[]) => void;
  chamberData: ChamberData;
  partsToShow?: Part[];
  preUnloadedParts?: Part[]; // ✅ NEW: Previously unloaded failed parts
}
 
const UnloadScanVerification: React.FC<UnloadScanVerificationProps> = ({
  onBack,
  onVerified,
  chamberData, 
  partsToShow,
  preUnloadedParts = [], // ✅ NEW: Default to empty array
}) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
 
  const partsToVerify = partsToShow || chamberData.parts;
 
  // ✅ NEW: Separate parts into those needing scan vs already unloaded
  const partsNeedingScan = partsToVerify.filter(
    (part) => !preUnloadedParts.some((p) => p.partNumber === part.partNumber),
  );
 
  // ✅ NEW: Automatically mark pre-unloaded parts as "scanned"
  useEffect(() => {
    if (preUnloadedParts.length > 0) {
      const preUnloadedIdentifiers = preUnloadedParts.map((p) => p.partNumber);
      setScannedParts((prev) => {
        const combined = [...prev, ...preUnloadedIdentifiers];
        return Array.from(new Set(combined)); // Remove duplicates
      });
    }
  }, [preUnloadedParts]);
 
  // Auto-focus when modal opens and scanning becomes active
  useEffect(() => {
    if (isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanningActive]);
 
  // Auto-start scanning when modal opens
  useEffect(() => {
    setIsScanningActive(true);
  }, []);
 
  const toggleScanning = () => {
    setIsScanningActive((prev) => !prev);
    if (!isScanningActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };
 
  const processBarcode = (barcodeData: string) => {
    const inputValue = barcodeData.trim().toUpperCase();
    if (!inputValue) return;
 
    // ✅ UPDATED: Only check parts needing scan
    const part = partsNeedingScan.find(
      (p) =>
        p.partNumber.toUpperCase() === inputValue ||
        p.serialNumber?.toUpperCase() === inputValue,
    );
 
    if (part) {
      if (!scannedParts.includes(part.partNumber)) {
        setScannedParts((prev) => [...prev, part.partNumber]);
        setBarcodeInput("");
 
        // Show success toast
        toast({
          title: "✓ Part Scanned Successfully",
          description: `${part.partNumber} has been verified for unload.`,
          variant: "default",
          className: "bg-green-50 border-green-200",
        });
 
        // Auto-focus back to input for continuous scanning
        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      } else {
        // Show warning toast for already scanned part
        toast({
          title: "⚠️ Already Scanned",
          description: `${part.partNumber} has already been scanned.`,
          variant: "destructive",
        });
        setBarcodeInput("");
        inputRef.current?.focus();
      }
    } else {
      // Show error toast for invalid scan
      toast({
        title: "❌ Invalid Scan",
        description: `Part number "${inputValue}" not found in parts to unload.`,
        variant: "destructive",
      });
      setBarcodeInput("");
      inputRef.current?.focus();
    }
  };
 
  const handleAutoScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcode(barcodeInput);
    }
  };
 
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };
 
  // ✅ UPDATED: Check if all parts needing scan have been scanned
  const allPartsScanned = partsNeedingScan.every((part) =>
    scannedParts.includes(part.partNumber),
  );
 
  const handleContinue = () => {
    if (!allPartsScanned) {
      // Show warning toast
      toast({
        title: "⚠️ Incomplete Scan",
        description: "Please scan all required parts before continuing.",
        variant: "destructive",
      });
      return;
    }
 
    onVerified(partsToVerify);
  };
 
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Scan Parts for Unload Verification
            </h2>
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
 
          {/* ✅ NEW: Show summary of parts */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Unload Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Total parts:</span>
                <span className="ml-2 font-semibold">
                  {partsToVerify.length}
                </span>
              </div>
              <div>
                <span className="text-green-700">Need scanning:</span>
                <span className="ml-2 font-semibold">
                  {partsNeedingScan.length}
                </span>
              </div>
              <div>
                <span className="text-gray-700">Pre-unloaded:</span>
                <span className="ml-2 font-semibold">
                  {preUnloadedParts.length}
                </span>
              </div>
            </div>
          </div>
 
          {/* Scanner Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Scanner Control</h3>
                <p className="text-sm text-gray-500">
                  {isScanningActive
                    ? "Scanner is active - scan barcodes continuously"
                    : "Click Start to begin continuous scanning"}
                </p>
              </div>
              <button
                onClick={toggleScanning}
                className={`${
                  isScanningActive
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white font-medium px-6 py-3 rounded-lg transition-all duration-200`}
              >
                {isScanningActive ? (
                  <>⏹ Stop Scanning</>
                ) : (
                  <>▶ Start Scanning</>
                )}
              </button>
            </div>
 
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isScanningActive ? "⚡ " : ""}Scanner Input
                {isScanningActive && (
                  <span className="ml-2 text-xs text-green-600 animate-pulse">
                    Active - Keep cursor in this box
                  </span>
                )}
              </label>
              <input
                ref={inputRef}
                value={barcodeInput}
                onChange={handleBarcodeInputChange}
                onKeyDown={handleAutoScan}
                placeholder={
                  isScanningActive
                    ? "Keep cursor here and scan barcodes (Press Enter after each scan)"
                    : "Click 'Start Scanning' to begin"
                }
                className="w-full h-12 px-4 text-lg font-mono border-2 border-blue-300 rounded-lg focus:border-green-500 focus:outline-none"
                disabled={!isScanningActive}
                autoComplete="off"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Scanned: {scannedParts.length - preUnloadedParts.length} /{" "}
                  {partsNeedingScan.length}
                </span>
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
 
          {/* ✅ NEW: Show pre-unloaded parts separately */}
          {preUnloadedParts.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                Previously Unloaded (Failed Parts) - No Scan Required:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {preUnloadedParts.map((part) => (
                  <div
                    key={part.partNumber}
                    className="p-3 rounded border-2 bg-yellow-50 border-yellow-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {part.partNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          Serial: {part.serialNumber}
                        </div>
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Status: FAILED (Already Unloaded)
                        </div>
                      </div>
                      <span className="text-yellow-600 text-2xl">⚠️</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* Parts needing scan */}
          {partsNeedingScan.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">
                Parts to Scan for Unload:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {partsNeedingScan.map((part) => (
                  <div
                    key={part.partNumber}
                    className={`p-3 rounded border-2 ${
                      scannedParts.includes(part.partNumber)
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {part.partNumber}
                        </div>
                      </div>
                      {scannedParts.includes(part.partNumber) && (
                        <span className="text-green-600 text-2xl">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="text-sm">
              {allPartsScanned ? (
                <span className="text-green-600 font-semibold text-lg">
                  ✓ All required parts scanned
                </span>
              ) : (
                <span className="text-gray-600">
                  Please scan all {partsNeedingScan.length} parts to continue
                </span>
              )}
            </div>
            <div className="space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!allPartsScanned}
                className={`px-6 py-3 rounded font-semibold ${
                  allPartsScanned
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Continue to Data Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default UnloadScanVerification;
 
 