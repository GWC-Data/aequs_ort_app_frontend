import React, { useRef, useEffect, useState } from "react";
import { Scan, Zap, ZapOff, Square } from "lucide-react";

interface PartScannerProps {
  partInput: string;
  onInputChange: (value: string) => void;
  onScan: () => void;
  scanning: boolean;
  disabled?: boolean;
  selectedTestAggregated: any;
  testStarted: boolean;
  scannedParts: any[];
  sessionTicketCode?: string;
  onBarcodeScanned?: (barcode: string) => void;
  enableRealtimeScan?: boolean;
  // Add this prop to control auto-enable behavior
  autoEnableScanner?: boolean;
}

const PartScanner: React.FC<PartScannerProps> = ({
  partInput,
  onInputChange,
  onScan,
  scanning,
  disabled = false,
  selectedTestAggregated,
  testStarted,
  scannedParts,
  sessionTicketCode,
  onBarcodeScanned,
  enableRealtimeScan = true,
  autoEnableScanner = true, // New prop with default true
}) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");

  // NEW: Auto-enable scanner when test is selected and started
  useEffect(() => {
    if (
      autoEnableScanner &&
      selectedTestAggregated &&
      testStarted &&
      !isScannerActive
    ) {
      setIsScannerActive(true);
      console.log("Scanner auto-enabled: Test selected and started");
    }
  }, [selectedTestAggregated, testStarted, autoEnableScanner, isScannerActive]);

  // Auto-disable scanner when test is not started or no test selected
  useEffect(() => {
    if ((!selectedTestAggregated || !testStarted) && isScannerActive) {
      setIsScannerActive(false);
      console.log("Scanner auto-disabled: Test not ready");
    }
  }, [selectedTestAggregated, testStarted, isScannerActive]);

  // Auto-focus input when scanner is active and test is ready
  useEffect(() => {
    if (
      isScannerActive &&
      selectedTestAggregated &&
      testStarted &&
      inputRef.current
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isScannerActive, selectedTestAggregated, testStarted]);

  // Handle barcode scanner input - UPDATED
  useEffect(() => {
    // Only activate scanner logic if scanner is active
    if (!isScannerActive || !enableRealtimeScan) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for Enter key to avoid form submission
      if (e.key === "Enter") {
        e.preventDefault();
      }

      // If user is typing in the input field manually, let it handle normally
      if (document.activeElement === inputRef.current) {
        return;
      }

      // Handle barcode scanner input (rapid key presses + Enter)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Add character to buffer
        setBarcodeBuffer((prev) => prev + e.key);

        // Clear any existing timeout
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }

        // Set timeout to clear buffer (scanners usually send data quickly)
        scanTimeoutRef.current = setTimeout(() => {
          if (barcodeBuffer) {
            setBarcodeBuffer("");
          }
        }, 100);
      }

      // When Enter is pressed, process the barcode
      if (e.key === "Enter" && barcodeBuffer.trim()) {
        const scannedBarcode = barcodeBuffer.trim();
        console.log("Barcode scanned:", scannedBarcode);

        // Update the input field
        onInputChange(scannedBarcode);

        // Call the barcode scanned callback if provided
        if (onBarcodeScanned) {
          onBarcodeScanned(scannedBarcode);
        }

        // Auto-scan if conditions are met
        if (!scanning && selectedTestAggregated && testStarted) {
          // Small delay to ensure state is updated
          setTimeout(() => {
            onScan();
          }, 100);
        }

        // Clear buffer
        setBarcodeBuffer("");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [
    isScannerActive,
    barcodeBuffer,
    onInputChange,
    onBarcodeScanned,
    scanning,
    selectedTestAggregated,
    testStarted,
    onScan,
    enableRealtimeScan,
  ]);

  // Toggle scanner active state
  const toggleScanner = () => {
    if (!selectedTestAggregated || !testStarted) return;

    const newState = !isScannerActive;
    setIsScannerActive(newState);

    if (newState && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value);
    // Clear barcode buffer when typing manually
    setBarcodeBuffer("");
  };

  // Handle Enter key in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !scanning &&
      selectedTestAggregated &&
      testStarted &&
      partInput.trim()
    ) {
      e.preventDefault();
      onScan();
    }
  };

  // Handle input click to ensure focus
  const handleInputClick = () => {
    if (isScannerActive && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isInputDisabled = !selectedTestAggregated || !testStarted;
  const isButtonDisabled =
    scanning || !partInput.trim() || !selectedTestAggregated || !testStarted;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">
          Step 3: Scan Parts
          {!selectedTestAggregated && (
            <span className="ml-2 text-red-500 text-xs">
              (Select a test first)
            </span>
          )}
          {isScannerActive && selectedTestAggregated && testStarted && (
            <span className="ml-2 text-green-600 text-xs animate-pulse">
              (Scanner Auto-Enabled ✓)
            </span>
          )}
        </h4>
        {enableRealtimeScan && selectedTestAggregated && testStarted && (
          <div className="flex items-center gap-2">
            {/* <div className={`text-xs px-2 py-1 rounded-full ${
              isScannerActive
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
              {isScannerActive ? 'Auto-Scanner ON' : 'Auto-Scanner OFF'}
            </div> */}
            {/* <button
              type="button"
              onClick={toggleScanner}
              disabled={isInputDisabled}
              className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
                isScannerActive
                  ? "bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                  : "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
              } ${isInputDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isScannerActive ? (
                <>
                  <Square className="h-3 w-3" />
                  <span>Disable</span>
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" />
                  <span>Enable</span>
                </>
              )}
            </button> */}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={partInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onClick={handleInputClick}
            placeholder={
              !selectedTestAggregated
                ? "Select a test first"
                : scannedParts.length > 0
                  ? `Scan parts from Ticket: ${sessionTicketCode || scannedParts[0]?.ticketCode || ""}`
                  : isScannerActive
                    ? "Ready to scan barcodes automatically..."
                    : "Enter part number to scan"
            }
            disabled={isInputDisabled}
            className={`flex-1 w-full px-4 py-3 border rounded-lg bg-white text-gray-700 font-mono text-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              isInputDisabled
                ? "border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
                : isScannerActive
                  ? "border-green-400 ring-2 ring-green-200 bg-green-50"
                  : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
            }`}
            autoFocus={isScannerActive && !isInputDisabled}
          />
          {isScannerActive && selectedTestAggregated && testStarted && (
            <div className="absolute -top-2 right-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full border border-green-300 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Scanner Active</span>
                {barcodeBuffer && (
                  <span className="ml-1 font-mono">
                    ({barcodeBuffer.length} chars)
                  </span>
                )}
              </div>
            </div>
          )}
          {!isScannerActive && selectedTestAggregated && testStarted && (
            <div className="absolute -top-2 right-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300 shadow-sm">
                <ZapOff className="h-3 w-3" />
                <span>Press Enable or type manually</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onScan}
          disabled={isButtonDisabled}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
            isButtonDisabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isScannerActive
                ? "bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {scanning ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Scan size={20} />
              <span>Scan</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-start justify-between mt-2">
        <p className="text-start text-sm text-gray-500">
          {!selectedTestAggregated
            ? "Select a test from above first"
            : !testStarted
              ? "Start the test before scanning parts"
              : scannedParts.length > 0
                ? `Scanning parts from Ticket: ${sessionTicketCode || scannedParts[0]?.ticketCode || ""} - All parts must belong to this same ticket`
                : selectedTestAggregated?.isChildTest &&
                    selectedTestAggregated?.previousTestId
                  ? "Scan parts that have completed previous step in sequence"
                  : isScannerActive
                    ? "Barcode scanner auto-enabled. Scan barcodes directly or type in input field."
                    : "Enter part number to scan and assign to selected test"}
        </p>

        {isScannerActive && selectedTestAggregated && testStarted && (
          <div className="text-xs text-gray-500 ml-4">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Scanner listening for barcodes...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartScanner;
