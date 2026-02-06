import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, FileText, Info, ChevronDown } from "lucide-react";
import { Part, PartImageAttachment } from "../types";

interface PartImageUploadProps {
  part: Part;
  onImageUpload: (label: string, file: File) => Promise<string | null>;
  onImageRemove: (index: number, image: PartImageAttachment) => void;
  isUploadingImage: boolean;
}

interface ImagePreview {
  filePath: string; // Original system path
  previewUrl: string; // Blob URL for preview
  label: string;
}

// Predefined image label options
const IMAGE_LABEL_OPTIONS = [
  { value: "FRONT", label: "Front" },
  { value: "BACK", label: "Back" },
  { value: "E2", label: "E2" },
  { value: "E4", label: "E4" },
  { value: "E6", label: "E6" },
  { value: "E8", label: "E8" },
  { value: "COSMETIC_IMAGE", label: "Cosmetic Image" },
  { value: "NON_COSMETIC_IMAGE", label: "Non-Cosmetic Image" },
];

const PartImageUpload: React.FC<PartImageUploadProps> = ({
  part,
  onImageUpload,
  onImageRemove,
  isUploadingImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [imagePreviews, setImagePreviews] = useState<
    Record<string, ImagePreview>
  >({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const previewsRef = useRef(imagePreviews);

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((preview) => {
        if (preview.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, []);

  const normalizedImages = useMemo<PartImageAttachment[]>(() => {
    if (Array.isArray(part.customImages) && part.customImages.length > 0) {
      return part.customImages;
    }

    const legacy: PartImageAttachment[] = [];
    (part.cosmeticImages || []).forEach((path, index) => {
      if (!path) return;
      legacy.push({
        label: `cosmetic-${index + 1}`,
        path,
      });
    });

    (part.nonCosmeticImages || []).forEach((path, index) => {
      if (!path) return;
      legacy.push({
        label: `non-cosmetic-${index + 1}`,
        path,
      });
    });

    return legacy;
  }, [part]);

  // Get used labels to disable them in dropdown
  const usedLabels = useMemo(() => {
    return new Set(normalizedImages.map(img => img.label.toUpperCase()));
  }, [normalizedImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!selectedLabel) {
      alert("Please select an image label from the dropdown.");
      event.target.value = "";
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, etc.)");
      event.target.value = "";
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      event.target.value = "";
      return;
    }

    try {
      // Create preview URL so the user sees the selected image immediately
      const previewUrl = URL.createObjectURL(file);

      const storedPath = await onImageUpload(selectedLabel, file);

      if (!storedPath) {
        URL.revokeObjectURL(previewUrl);
        alert("Failed to store image path. Please try again.");
        return;
      }

      const previewKey = storedPath;
      setImagePreviews((prev) => ({
        ...prev,
        [previewKey]: {
          filePath: storedPath,
          previewUrl,
          label: selectedLabel,
        },
      }));

      setSelectedLabel("");
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing image file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    if (!selectedLabel) {
      alert("Please select an image label from the dropdown.");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLabelSelect = (label: string) => {
    setSelectedLabel(label);
    setIsDropdownOpen(false);
  };

  // Helper to extract file name from path
  const getFileName = (path: string): string => {
    if (!path) return "Unknown file";
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
  };

  // Handle image removal
  const handleRemoveImage = (index: number, image: PartImageAttachment) => {
    // Clean up blob URL
    if (imagePreviews[image.path]) {
      const previewUrl = imagePreviews[image.path].previewUrl;
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setImagePreviews((prev) => {
        const newPreviews = { ...prev };
        delete newPreviews[image.path];
        return newPreviews;
      });
    }

    // Call parent to remove from state
    onImageRemove(index, image);
  };

  // Get display label from value
  const getDisplayLabel = (value: string): string => {
    const option = IMAGE_LABEL_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        Upload Images for {part.partNumber}
        <span className="ml-2 text-xs text-gray-500">
          (Select a label from the dropdown)
        </span>
      </h5>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Image Label
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-left flex items-center justify-between"
              >
                <span className={selectedLabel ? "text-gray-800" : "text-gray-400"}>
                  {selectedLabel ? getDisplayLabel(selectedLabel) : "Select label..."}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {IMAGE_LABEL_OPTIONS.map((option) => {
                    const isUsed = usedLabels.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => !isUsed && handleLabelSelect(option.value)}
                        disabled={isUsed}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          isUsed 
                            ? "text-gray-400 cursor-not-allowed bg-gray-50" 
                            : "text-gray-800 hover:bg-blue-50"
                        } ${
                          selectedLabel === option.value 
                            ? "bg-blue-50 text-blue-700 font-medium" 
                            : ""
                        }`}
                        title={isUsed ? "This label is already used" : ""}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {isUsed && (
                            <span className="text-xs text-gray-400">Used</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={!selectedLabel || isUploadingImage}
              className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Upload size={14} />
              {isUploadingImage ? "Uploading..." : "Select Image"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {normalizedImages.length > 0 ? (
            normalizedImages.map((image, index) => {
              const previewUrl =
                imagePreviews[image.path]?.previewUrl || image.path || null;
              const fileName = getFileName(image.path);
              const displayLabel = getDisplayLabel(image.label);

              return (
                <div
                  key={`${image.path}-${index}`}
                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100 overflow-hidden flex-shrink-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={image.label || fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback =
                              e.currentTarget.nextElementSibling as
                                | HTMLElement
                                | null;
                            if (fallback) {
                              fallback.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <ImageIcon
                        size={16}
                        className="text-blue-500"
                        style={{ display: previewUrl ? "none" : "block" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {displayLabel || fileName}
                      </div>
                      <div
                        className="text-xs text-gray-500 truncate"
                        title={image.path}
                      >
                        {fileName}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index, image)}
                    className="text-red-500 hover:text-red-700 transition-colors ml-2"
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText size={24} className="mx-auto mb-2" />
              <div className="text-sm">No images uploaded yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <div className="font-medium mb-1">How it works:</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Select a label from the dropdown for the image you want to upload.</li>
              <li>Each label can only be used once per part.</li>
              <li>Files are uploaded to the server and the stored path is saved for the part.</li>
              <li>You can remove and re-upload images at any point before final submission.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartImageUpload;