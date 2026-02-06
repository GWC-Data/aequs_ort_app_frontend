

import React, { useState, useEffect, useRef } from "react";
import { Part, CheckpointLabels } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, ZapOff, Square, Play } from "lucide-react";

interface ScanVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  currentCheckpointIndex: number;
  nextCheckpointIndex: number;
  onVerifyScan: (partNumber: string) => void;
  scannedParts: string[];
  onContinue: () => void;
  checkpointLabels: CheckpointLabels;
}

const ScanVerificationModal: React.FC<ScanVerificationModalProps> = ({
  isOpen,
  onClose,
  parts,
  currentCheckpointIndex,
  nextCheckpointIndex,
  onVerifyScan,
  scannedParts,
  onContinue,
  checkpointLabels,
}) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanningActive, setIsScanningActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkpointValues = parts?.[0]?.checkpointInfo?.checkpoints || [];

  const resolveLabel = (index: number) => {
    if (index <= 0) {
      return "T0";
    }

    const valueFromArray = checkpointValues[index];
    if (typeof valueFromArray === "number") {
      return `${valueFromArray}hr`;
    }

    return checkpointLabels[index] || `Checkpoint ${index + 1}`;
  };

  // Auto-focus when modal opens and scanning becomes active
  useEffect(() => {
    if (isOpen && isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isScanningActive]);

  // Auto-start scanning when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsScanningActive(true);
    } else {
      setIsScanningActive(false);
      setBarcodeInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const safeNextIndex = checkpointValues.length > 0
    ? Math.min(nextCheckpointIndex, checkpointValues.length - 1)
    : nextCheckpointIndex;

  const currentLabel = resolveLabel(currentCheckpointIndex);
  const nextLabel = resolveLabel(safeNextIndex);

  // Parts that will progress (pass)
  const activeParts = parts.filter((part) => {
    if(part.checkpointData.length < 0){
  return part.checkpointData?.some(
      (cp) =>
        cp.checkpointIndex === currentCheckpointIndex && cp.status === "pass" ,
    );
    }
    else{
      return part.partNumber;
    }
    
  
  });

  // Failed parts
  const failedParts = parts.filter((part) => {
    return part.checkpointData?.some(
      (cp) =>
        cp.checkpointIndex === currentCheckpointIndex && cp.status === "fail",
    );
  });

  const toggleScanning = () => {
    setIsScanningActive((prev) => !prev);
    if (!isScanningActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const processBarcode = (barcodeData: string) => {
    console.log(barcodeData)
    const inputValue = barcodeData;
    console.log(inputValue)
    if (!inputValue) return;


    // Find part by partNumber
    const part = activeParts.find(
      (p) => p.partNumber.toUpperCase() === inputValue,
    );

    if (part) {
      if (!scannedParts.includes(part.partNumber)) {
        onVerifyScan(part.partNumber);
        setBarcodeInput("");

        // Auto-focus back to input for continuous scanning
        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      } else {
        console.log(`${part} already scanned.`);
        alert(`${part.partNumber} already scanned.`);
        setBarcodeInput("");
        inputRef.current?.focus();
      }
    } else {
      alert(
        `Invalid scan! Part number "${inputValue}" not found in active parts.`,
      );
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

  const allActiveScanned = activeParts.every((part) =>
    scannedParts.includes(part.partNumber),
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Progress from {currentLabel} to {nextLabel}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Scanner Input Box */}
          <Card className="mb-6">
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
                        Scanned: {scannedParts.length} / {activeParts.length}
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

          {/* Parts List */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">
              Active Parts to Scan:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeParts.map((part) => (
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
                      <div className="text-sm text-gray-500">
                        Serial: {part.serialNumber}
                      </div>
                    </div>
                    {scannedParts.includes(part.partNumber) && (
                      <span className="text-green-600 text-2xl">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {failedParts.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                <h4 className="font-semibold text-red-700 mb-2">
                  Failed parts (will not progress):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {failedParts.map((part) => (
                    <div key={part.partNumber} className="text-red-600 text-sm">
                      ✗ {part.partNumber} (Serial: {part.serialNumber})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm">
              {allActiveScanned && activeParts.length > 0 ? (
                <span className="text-green-600 font-semibold">
                  ✓ All active parts scanned
                </span>
              ) : (
                <span className="text-gray-600">
                  Please scan all {activeParts.length} active parts to continue
                </span>
              )}
            </div>
            <div className="space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onContinue}
                disabled={!allActiveScanned || activeParts.length === 0}
                className={`px-6 py-3 rounded font-semibold ${
                  allActiveScanned && activeParts.length > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Continue to {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanVerificationModal;
