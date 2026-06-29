import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, ZapOff, Square, Play } from "lucide-react";

// Types for scanned parts
interface TempScannedPart {
  partNumber: string; // This stores the scanned barcode directly
  scanStatus: "Cosmetic OK" | "Cosmetic Not OK" | null;
}

interface ScannerInputProps {
  isScanningActive: boolean;
  barcodeInput: string;
  tempScannedParts: TempScannedPart[];
  selectedTicket: any;
  onToggleScanning: () => void;
  onBarcodeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAutoScan: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onProcessBarcode: (data: string) => void;
}

const ScannerInputBox: React.FC<ScannerInputProps> = ({
  isScanningActive,
  barcodeInput,
  tempScannedParts,
  selectedTicket,
  onToggleScanning,
  onBarcodeInputChange,
  onAutoScan,
  onProcessBarcode,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when scanning is active
  useEffect(() => {
    if (isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanningActive, tempScannedParts]);

  // Start/Stop scanning function
  const toggleScanning = () => {
    if (!isScanningActive) {
      // Start scanning
      onToggleScanning();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      // Stop scanning
      onToggleScanning();
    }
  };

  // Handle barcode scanning in auto mode
  const handleAutoScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedTicket) {
      e.preventDefault();
      const barcodeData = barcodeInput.trim();
      if (barcodeData) {
        onProcessBarcode(barcodeData);

        // Auto-focus back to input for continuous scanning
        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      }
    }
  };

  // Handle input change
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBarcodeInputChange(e);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Start/Stop Scanner Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Scanner Control</h3>
              <p className="text-sm text-gray-500">
                {isScanningActive
                  ? "Scanner is active - scan barcodes continuously"
                  : "Click Start to begin continuous scanning"}
              </p>
            </div>
            <Button
              onClick={toggleScanning}
              className={`${isScanningActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-medium px-6 py-3`}
              size="lg"
            >
              {isScanningActive ? (
                <>
                  <Square className="mr-2 h-5 w-5" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start Scanning
                </>
              )}
            </Button>
          </div>

          {/* Scanner Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
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
                  <Badge className="ml-2 bg-green-100 text-green-800 text-xs animate-pulse">
                    Active - Keep cursor in this box
                  </Badge>
                )}
              </Label>
              <Input
                id="barcodeInput"
                ref={inputRef}
                value={barcodeInput}
                onChange={handleBarcodeInputChange}
                onKeyDown={handleAutoScan}
                placeholder={
                  isScanningActive
                    ? "Keep cursor here and scan barcodes (Press Enter after each scan)"
                    : "Click 'Start Scanning' to begin"
                }
                className="h-12 font-mono text-lg border-2 border-blue-300 focus:border-green-500"
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
      </CardContent>
    </Card>
  );
};

// Utility function to process barcode
const processBarcode = (
  data: string,
  selectedTicket: any,
  tempScannedParts: TempScannedPart[],
  setTempScannedParts: React.Dispatch<React.SetStateAction<TempScannedPart[]>>,
) => {
  if (!selectedTicket) return;

  const totalScannedInSession = tempScannedParts.length;
  const totalScannedOverall = selectedTicket.sessions.reduce(
    (sum: number, session: any) => sum + session.parts.length,
    0,
  );
  const totalScanned = totalScannedInSession + totalScannedOverall;

  if (totalScanned >= selectedTicket.totalQuantity) {
    // Show notification: All parts have been scanned
    return;
  }

  const barcodeData = data.trim();

  // Check for duplicates in current session
  const duplicateInSession = tempScannedParts.find(
    (p) => p.partNumber === barcodeData,
  );
  if (duplicateInSession) {
    // Show notification: Duplicate barcode
    return;
  }

  // Check for duplicates in all sessions of this ticket
  const duplicateInAllSessions = selectedTicket.sessions.some((session: any) =>
    session.parts.some((part: any) => part.partNumber === barcodeData),
  );
  if (duplicateInAllSessions) {
    // Show notification: Duplicate barcode in ticket
    return;
  }

  const newPart: TempScannedPart = {
    partNumber: barcodeData, // Store barcode directly as partNumber
    scanStatus: null,
  };

  setTempScannedParts((prev) => [...prev, newPart]);
};

export default ScannerInputBox;
export { processBarcode };
export type { TempScannedPart };
