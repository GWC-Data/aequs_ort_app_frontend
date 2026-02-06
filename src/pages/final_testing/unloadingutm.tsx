import React, { useState } from "react";
import UTMImageCropper from "../../components/UTMImageCropper";
import { getBackendApiUrl } from "../../lib/backendApi";
import { useNavigate } from "react-router-dom";

interface UnloadWithUTMProps {
  onBack: () => void;
  onSubmit: (updatedParts: any[], utmMetadata?: any) => Promise<void>;
  chamberData: any;
  partsToShow: any[];
}

const UnloadWithUTM: React.FC<UnloadWithUTMProps> = ({
  onBack,
  onSubmit,
  chamberData,
  partsToShow,
}) => {
  const [utmFormData, setUtmFormData] = useState({
    rows: [],
    customColumns: [],
  });

  const [utmData, setUtmData] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { uploaded: number; total: number }>>({});
  const navigate = useNavigate();


  const updateRowField = (rowId: number, field: string, value: string) => {
    setUtmFormData((prev) => ({
      ...prev,
      rows: prev.rows.map((row: any) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const handleUTMDataChange = (data: any) => {
    console.log("UTM data received from UTMImageCropper:", data);
    setUtmData(data);
  };

  // ✅ Upload post-cosmetic and post-non-cosmetic images to backend (using same pattern as custom images)
  const uploadImageToBackend = async (
    imageData: string,
    partNumber: string,
    serialNumber: string,
    imageType: "postCosmetic" | "postNonCosmetic",
    checkpointIndex: number,
  ): Promise<string> => {
    try {
      console.log(`📤 Uploading ${imageType} for ${partNumber} at checkpoint ${checkpointIndex}`);

      // Convert base64 to blob/file
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      const filename = `${partNumber}_${imageType}_${Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Create FormData - matching the pattern from handleCustomColumnImageUpload
      const formData = new FormData();
      formData.append("image", file);

      // Add metadata matching the existing pattern
      if (chamberData?.id) {
        formData.append("chamberLoadId", String(chamberData.id));
      }

      const part = partsToShow.find(p => p.partNumber === partNumber);
      if (part?.serialNumber) {
        formData.append("partId", String(part.serialNumber));
      } else if (part?.partNumber) {
        formData.append("partId", String(part.partNumber));
      }

      // ✅ Use specific imageType values that match your backend expectations
      // For UTM images, we'll use "cosmetic" and "nonCosmetic" 
      const backendImageType = imageType === "postCosmetic" ? "cosmetic" : "nonCosmetic";
      formData.append("imageType", backendImageType);
      formData.append("checkpointIndex", String(checkpointIndex));

      console.log("📤 Uploading with parameters:", {
        chamberLoadId: chamberData?.id,
        partId: part?.serialNumber || part?.partNumber,
        imageType: backendImageType,
        checkpointIndex,
        filename
      });

      // Upload to backend - same endpoint as custom images
      const response = await fetch(
        `${getBackendApiUrl()}/uploads/part-images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload failed:", errorData);
        throw new Error(
          `Upload failed with status: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      const result = await response.json();
      console.log("📥 Upload response:", result);

      if (result?.success && result?.path) {
        console.log(`✅ Uploaded ${backendImageType} for ${partNumber}: ${result.path}`);
        return result.path;
      }

      // Alternative response format check
      if (result?.path) {
        console.log(`✅ Uploaded ${backendImageType} for ${partNumber}: ${result.path}`);
        return result.path;
      }

      throw new Error("Upload response missing path");
    } catch (error) {
      console.error(`❌ Error uploading ${imageType} for ${partNumber}:`, error);
      throw error;
    }
  };

  // ✅ Main submit handler - Similar to UnloadDataEntry pattern
  const handleUTMSubmit = async () => {
    // Validate that UTM data is loaded
    if (!utmData) {
      alert("Please wait for UTM data to load");
      return;
    }

    const {
      postCosmeticImages,
      postNonCosmeticImages,
      customColumns,
      customColumnData,
    } = utmData;

    // Check if all parts have required images
    const missingImages: string[] = [];

    for (const part of partsToShow) {
      const hasCosmetic = postCosmeticImages[part.partNumber];
      const hasNonCosmetic = postNonCosmeticImages[part.partNumber];

      if (!hasCosmetic) {
        missingImages.push(`${part.partNumber} - Missing Post-Cosmetic Image`);
      }
      if (!hasNonCosmetic) {
        missingImages.push(
          `${part.partNumber} - Missing Post-Non-Cosmetic Image`,
        );
      }
    }

    if (missingImages.length > 0) {
      alert(`Please upload required images:\n\n${missingImages.join("\n")}`);
      return;
    }

    try {
      setIsUploading(true);

      console.log("=== UTM handleSubmitAll START ===");
      console.log("Selected dropdown value:", selectedOption);
      console.log("Custom Columns:", customColumns);
      console.log("Custom Column Data:", customColumnData);
      console.log(
        "📝 Note: Only uploading post-cosmetic and post-non-cosmetic images.",
      );
      console.log(
        "📝 Cropped images (Clear, Foot, Side Snap) will NOT be uploaded to backend.",
      );

      const updatedParts = [];

      for (let i = 0; i < partsToShow.length; i++) {
        const part = partsToShow[i];
        const partNumber = part.partNumber;
        const serialNumber = part.serialNumber;

        console.log(`\n=== Processing part ${i}: ${partNumber} ===`);

        // ✅ Calculate final checkpoint index (same as UnloadDataEntry)
        const checkpoints = part.checkpointInfo?.checkpoints || [];
        const hasNoCheckpoints =
          checkpoints.length === 0 ||
          (checkpoints.length === 1 && checkpoints[0] === 0);
        const finalCheckpointIndex = hasNoCheckpoints
          ? 0
          : Math.max(checkpoints.length - 1, 0);
        const finalCheckpointValue = hasNoCheckpoints
          ? part.testValue || 0
          : checkpoints[finalCheckpointIndex];

        console.log(
          `Final checkpoint: index=${finalCheckpointIndex}, value=${finalCheckpointValue}`,
        );

        // Update upload progress
        const totalImages = 2; // post-cosmetic + post-non-cosmetic
        setUploadProgress((prev) => ({
          ...prev,
          [partNumber]: { uploaded: 0, total: totalImages },
        }));

        let uploadedCount = 0;

        // Upload post-cosmetic image
        console.log(`Uploading post-cosmetic for ${partNumber}`);
        let postCosmeticPath = "";
        if (postCosmeticImages[partNumber]) {
          try {
            postCosmeticPath = await uploadImageToBackend(
              postCosmeticImages[partNumber],
              partNumber,
              serialNumber,
              "postCosmetic",
              finalCheckpointIndex,
            );
            console.log(`✅ Uploaded post-cosmetic:`, postCosmeticPath);
            uploadedCount++;
            setUploadProgress((prev) => ({
              ...prev,
              [partNumber]: { uploaded: uploadedCount, total: totalImages },
            }));
          } catch (uploadError) {
            console.error(
              `Failed to upload post-cosmetic for ${partNumber}:`,
              uploadError,
            );
          }
        }

        // Upload post-non-cosmetic image
        console.log(`Uploading post-non-cosmetic for ${partNumber}`);
        let postNonCosmeticPath = "";
        if (postNonCosmeticImages[partNumber]) {
          try {
            postNonCosmeticPath = await uploadImageToBackend(
              postNonCosmeticImages[partNumber],
              partNumber,
              serialNumber,
              "postNonCosmetic",
              finalCheckpointIndex,
            );
            console.log(`✅ Uploaded post-non-cosmetic:`, postNonCosmeticPath);
            uploadedCount++;
            setUploadProgress((prev) => ({
              ...prev,
              [partNumber]: { uploaded: uploadedCount, total: totalImages },
            }));
          } catch (uploadError) {
            console.error(
              `Failed to upload post-non-cosmetic for ${partNumber}:`,
              uploadError,
            );
          }
        }

        // ✅ Build customData with uploaded images (same pattern as UnloadDataEntry)
        const finalCustomData: Record<string, string> = {};

        // Store post images in customData if they exist
        if (postCosmeticPath) {
          finalCustomData["cosmetic"] = JSON.stringify([postCosmeticPath]);
        } else {
          finalCustomData["cosmetic"] = "[]";
        }

        if (postNonCosmeticPath) {
          finalCustomData["nonCosmetic"] = JSON.stringify([
            postNonCosmeticPath,
          ]);
        } else {
          finalCustomData["nonCosmetic"] = "[]";
        }

        // ✅ Add selectedOption to customData
        finalCustomData["selectedOption"] = selectedOption;

        // ✅ Process custom column data with readable structure
        console.log(`Processing custom column data for ${partNumber}`);

        // Create a map of columnId to column label for better readability
        const columnMap: Record<string, string> = {};
        customColumns.forEach((col: any) => {
          columnMap[col.id] = col.label;
        });

        // Build custom column data array with row, column name, and value
        const customColumnEntries: Array<{
          row: number;
          columnId: string;
          columnName: string;
          columnType: string;
          value: string;
        }> = [];

        Object.entries(customColumnData).forEach(([key, value]) => {
          const keyParts = key.split("-");
          // Format: {partNumber}-{rowNum}-{columnId}
          if (keyParts.length >= 3 && keyParts[0] === partNumber) {
            const rowNum = parseInt(keyParts[1]);
            const columnId = keyParts.slice(2).join("-"); // Handle column IDs with dashes

            if (rowNum >= 1 && rowNum <= 4) {
              if (value && String(value).trim() !== "") {
                const column = customColumns.find(
                  (col: any) => col.id === columnId,
                );

                customColumnEntries.push({
                  row: rowNum,
                  columnId: columnId,
                  columnName: columnMap[columnId] || columnId,
                  columnType: column?.type || "unknown",
                  value: String(value),
                });

                console.log(
                  `Row ${rowNum}, Column "${columnMap[columnId]}" (${columnId}):`,
                  value,
                );
              }
            }
          }
        });

        console.log("Custom column entries:", customColumnEntries);
        console.log("Final customData:", finalCustomData);

        // ✅ Create final checkpoint data (same structure as UnloadDataEntry)
        // const finalCheckpointData = {
        //   checkpointIndex: finalCheckpointIndex,
        //   checkpointValue: finalCheckpointValue,
        //   label: "UTM Final Test",
        //   testDate: new Date().toISOString(),
        //   cosmeticImages: postCosmeticPath ? [postCosmeticPath] : [],
        //   nonCosmeticImages: postNonCosmeticPath ? [postNonCosmeticPath] : [],
        //   status: "pass", // UTM tests are typically pass
        //   customData: finalCustomData,
        //   selectedOption: selectedOption, // ✅ Add at checkpoint level
        //   submittedAt: new Date().toISOString(),
        // };

        // ✅ Create final checkpoint data (same structure as UnloadDataEntry)
        const finalCheckpointData = {
          checkpointIndex: finalCheckpointIndex,
          checkpointValue: finalCheckpointValue,
          label: "UTM Final Test",
          testDate: new Date().toISOString(),
          cosmeticImages: postCosmeticPath ? [postCosmeticPath] : [],
          nonCosmeticImages: postNonCosmeticPath ? [postNonCosmeticPath] : [],
          status: "pass",
          customData: finalCustomData,
          customColumnEntries: customColumnEntries, // ✅ Store directly as array at checkpoint level
          selectedOption: selectedOption,
          submittedAt: new Date().toISOString(),
        };

        console.log(
          "Final checkpoint data with all custom columns:",
          finalCheckpointData,
        );

        // ✅ Update part data (same structure as UnloadDataEntry)
        const updatedPart = {
          ...part,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          selectedOption: selectedOption, // ✅ Add at part level
          checkpointData: [
            ...(part.checkpointData || []).filter(
              (cp: any) => cp.checkpointIndex !== finalCheckpointIndex,
            ),
            finalCheckpointData,
          ].sort((a: any, b: any) => a.checkpointIndex - b.checkpointIndex),
          checkpointInfo: {
            ...part.checkpointInfo,
            checkpointIndex: finalCheckpointIndex + 1,
          },
        };

        console.log("Updated part with all custom column data:", {
          partNumber: updatedPart.partNumber,
          selectedOption: updatedPart.selectedOption,
          checkpointData: updatedPart.checkpointData,
          customData: finalCheckpointData.customData,
        });

        updatedParts.push(updatedPart);

        // Complete progress
        setUploadProgress((prev) => ({
          ...prev,
          [partNumber]: { uploaded: totalImages, total: totalImages },
        }));

        console.log(`✅ Completed processing part ${partNumber}`);
      }

      // Log final submission data
      console.log("\n=== FINAL UTM SUBMISSION DATA ===");
      console.log("Selected Option:", selectedOption);
      console.log("Custom Columns Definition:", customColumns);
      console.log("updatedParts:", updatedParts);
      console.log(
        "📝 Cropped images (Clear, Foot, Side Snap) remain in UI only, not uploaded.",
      );

      // Save custom columns definition and all metadata
      const utmMetadata = {
        customColumns, // Column definitions
        uploadedAt: new Date().toISOString(),
        totalParts: partsToShow.length,
        imageTypesUploaded: ["postCosmetic", "postNonCosmetic"],
        selectedOption: selectedOption, // ✅ Store in metadata
        note: "Cropped images (Clear, Foot, Side Snap) are for UI display only, not uploaded to backend.",
        customColumnDataSummary:
          Object.keys(customColumnData).length + " custom data entries",
      };

      console.log("UTM Metadata:", utmMetadata);

      // Call the parent submit handler with updated parts
      await onSubmit(updatedParts, utmMetadata);

      const completedCount = updatedParts.length;
      const totalImagesUploaded = updatedParts.reduce((acc, part) => {
        const cpData = part.checkpointData[part.checkpointData.length - 1];
        return (
          acc +
          (cpData?.cosmeticImages?.length || 0) +
          (cpData?.nonCosmeticImages?.length || 0)
        );
      }, 0);

      const totalCustomDataEntries = Object.keys(customColumnData).length;

      alert(
        `✅ UTM unload completed successfully!\n\n` +
        `• Parts processed: ${completedCount}\n` +
        `• Images uploaded: ${totalImagesUploaded}\n` +
        `• Selected option: ${selectedOption}\n` +
        `• Custom column entries: ${totalCustomDataEntries}\n` +
        `• Data persisted to backend.\n\n` +
        `Note: Cropped images (Clear, Foot, Side Snap) remain in UI for reference only.`,
      );

      // ✅ Navigate to planning-detail page after successful submission
      navigate("/planning-detail");

      console.log("=== UTM handleSubmitAll END ===");
    } catch (error) {
      console.error("❌ Error during UTM submission:", error);
      alert(
        `Failed to complete UTM unload.\n` +
        `Error: ${error instanceof Error ? error.message : "Unknown error"}\n\n` +
        `Please check your connection and try again.`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                UTM Unload - Image Upload
              </h1>
              <div className="flex items-center mt-1">
                <p className="text-sm text-green-600">
                  ✓ All parts scanned - Upload post-test images
                </p>
                <div className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  <span className="font-medium">Note:</span> Only post-cosmetic and post-non-cosmetic images will be uploaded
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isUploading && (
                <div className="flex items-center text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={isUploading}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="bg-white rounded-lg shadow p-4 mb-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Upload Progress
            </h3>
            <div className="space-y-3">
              {Object.entries(uploadProgress).map(([partNumber, progress]) => (
                <div key={partNumber} className="bg-blue-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">{partNumber}</span>
                    <span className="text-sm text-gray-600">
                      {progress.uploaded}/{progress.total} images
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.uploaded / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Important Note */}
      <div className="max-w-full mx-auto px-6 mb-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Important Information
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• <span className="font-medium">Only post-cosmetic and post-non-cosmetic images</span> will be uploaded to the backend</li>
            <li>• Images are stored in the <span className="font-medium">checkpointData array</span> (same as UnloadDataEntry)</li>
            <li>• Cropped images (Clear, Foot, Side Snap) are for <span className="font-medium">UI reference only</span> and will not be saved</li>
            <li>• All parts must have both post-cosmetic and post-non-cosmetic images before submission</li>
            <li>• Custom column data will be saved along with the images</li>
          </ul>
        </div>
      </div>

      {/* UTM Image Cropper Component - Main Content */}
      <div className="max-w-full mx-auto">
        <UTMImageCropper
          formData={utmFormData}
          chamberData={chamberData}
          updateRowField={updateRowField}
          selectedParts={partsToShow}
          machineEquipment2="UTM"
          isSecondRound={false}
          currentChildTest={{
            id: chamberData.testId || "default",
            name: chamberData.testName || "UTM Test",
          }}
          onDataChange={handleUTMDataChange}
        />
      </div>

      {/* Footer with Submit Button */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
              disabled={isUploading}
            >
              Back to Scan
            </button>
            <div className="flex items-center space-x-4">
              {/* Dropdown */}
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="ss-select"
                  className="text-sm font-medium text-gray-700"
                >
                  Select Option:
                </label>
                <select
                  id="ss-select"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  disabled={isUploading}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Option</option>
                  <option value="ss1">SS1</option>
                  <option value="ss2">SS2</option>
                  <option value="ss3">SS3</option>
                  <option value="ss4">SS4</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-medium">Required:</span> Post-cosmetic and
                post-non-cosmetic images for all parts
              </div>
              <button
                onClick={handleUTMSubmit}
                disabled={isUploading}
                className={`px-8 py-3 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all ${isUploading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading Images...
                  </div>
                ) : (
                  "Complete UTM Unload"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnloadWithUTM;