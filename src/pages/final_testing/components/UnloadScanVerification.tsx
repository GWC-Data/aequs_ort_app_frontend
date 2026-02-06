

import React, { useState, useRef, useEffect } from "react";
import { ChamberData, Part } from "../types";
import { formatDate, getCheckpointsForPart } from "../utils/helpers";
import MachineDetails from "./MachineDetails";
import CheckpointProgress from "./CheckpointProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, ZapOff, Square, Play } from "lucide-react";

interface UnloadScanVerificationProps {
  onBack: () => void;
  onVerified: (partsToShow: Part[]) => void;
  chamberData: ChamberData;
}

const UnloadScanVerification: React.FC<UnloadScanVerificationProps> = ({
  onBack,
  onVerified,
  chamberData,
}) => {
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanningActive, setIsScanningActive] = useState(true); // Auto-start scanning
  const inputRef = useRef<HTMLInputElement>(null);

  // All parts (completed, in-progress, failed)
  const partsToShow = chamberData.parts;

  // Auto-focus when scanning is active
  useEffect(() => {
    if (isScanningActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanningActive, scannedParts]);

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

    const part = chamberData.parts.find(
      (p) => p.partNumber.toUpperCase() === inputValue,
    );

    if (part) {
      if (!scannedParts.includes(part.partNumber)) {
        setScannedParts((prev) => [...prev, part.partNumber]);
        setBarcodeInput("");

        // Auto-focus back to input for continuous scanning
        if (isScanningActive) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      } else {
        alert(`${part.partNumber} already scanned.`);
        setBarcodeInput("");
        inputRef.current?.focus();
      }
    } else {
      alert(`Invalid scan! Part number "${inputValue}" not found.`);
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

  const allPartsScanned = partsToShow.every((part) =>
    scannedParts.includes(part.partNumber),
  );

  const handleProceed = () => {
    if (!allPartsScanned) {
      alert("Please scan all parts before proceeding.");
      return;
    }

    onVerified(partsToShow);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Unload - Scan All Parts
            </h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Back
            </button>
          </div>

          <MachineDetails chamberData={chamberData} />
          <CheckpointProgress parts={chamberData.parts} />

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Step 1: Scan All Parts for Unload
            </h2>
            <p className="text-gray-600 mb-4">
              Please scan all parts before unloading. This includes completed
              parts, failed parts, and parts still in progress.
            </p>
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
                        Progress: {scannedParts.length} / {partsToShow.length}{" "}
                        parts scanned
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
            <h3 className="font-semibold text-gray-700 mb-4 text-lg">
              All Parts:
            </h3>
            <div className="space-y-3">
              {partsToShow.map((part) => {
                const checkpoints = getCheckpointsForPart(part);
                const currentIndex = part.checkpointInfo?.checkpointIndex || 0;
                const isFailed = part.checkpointData?.some(
                  (cp) => cp.status === "fail",
                );
                const isCompleted = currentIndex >= checkpoints.length - 1;
                const isScanned = scannedParts.includes(part.partNumber);

                let statusText = "In Progress";
                let statusColor = "text-yellow-600 bg-yellow-50";
                if (isFailed) {
                  statusText = "Failed";
                  statusColor = "text-red-600 bg-red-50";
                } else if (isCompleted) {
                  statusText = "Completed";
                  statusColor = "text-green-600 bg-green-50";
                }

                return (
                  <div
                    key={part.partNumber}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isScanned
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-800 text-lg">
                          {part.partNumber}
                        </div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}
                        >
                          {statusText}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Serial: {part.serialNumber}
                      </div>
                    </div>
                    {isScanned && (
                      <div className="text-green-600 text-3xl font-bold">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back
              </button>
              <div className="flex items-center gap-4">
                {allPartsScanned ? (
                  <span className="text-green-600 font-semibold">
                    ✓ All parts scanned
                  </span>
                ) : (
                  <span className="text-gray-600">
                    {partsToShow.length - scannedParts.length} parts remaining
                  </span>
                )}
                <button
                  onClick={handleProceed}
                  disabled={!allPartsScanned}
                  className={`px-6 py-3 rounded-lg font-semibold text-lg ${
                    allPartsScanned
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Proceed to Final Data Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnloadScanVerification;
