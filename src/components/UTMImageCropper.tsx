import React, { useState, useEffect } from "react";
import { Upload, Loader2, Plus, X, ImageIcon } from "lucide-react";

interface UTMImageCropperProps {
  chamberData: any;
  formData: any;
  updateRowField: (rowId: number, field: string, value: string) => void;
  selectedParts: any[];
  machineEquipment2: string;
  isSecondRound?: boolean;
  currentChildTest?: any;
  onDataChange?: (data: any) => void;
}

interface CustomColumn {
  id: string;
  label: string;
  type: "text" | "number" | "image" | "dropdown";
  options?: string[];
}

interface CustomImage {
  label: string;
  path: string;
  uploadedAt: string | null;
}

const UTM_REGIONS = {
  clear: [
    { x: 88, y: 3, width: 50, height: 48, label: "CL-1" },
    { x: 162, y: 3, width: 50, height: 48, label: "CL-2" },
    { x: 240, y: 1.5, width: 50, height: 50, label: "CL-3" },
    { x: 318, y: 1.5, width: 50, height: 50, label: "CL-4" },
  ],
  foot: [
    { x: 20, y: 10, width: 48, height: 55, label: "FT-1" },
    { x: 387, y: 10, width: 60, height: 50, label: "FT-2" },
    { x: 388, y: 250, width: 60, height: 50, label: "FT-3" },
    { x: 20, y: 245, width: 55, height: 70, label: "FT-4" },
  ],
  sideSnap: [
    { x: 17, y: 100, width: 55, height: 45, label: "SS-1" },
    { x: 395, y: 85, width: 55, height: 45, label: "SS-2" },
    { x: 117, y: 280, width: 55, height: 45, label: "SS-3" },
    { x: 300, y: 278, width: 60, height: 50, label: "SS-4" },
  ],
};

const ALL_REGIONS = [
  ...UTM_REGIONS.clear,
  ...UTM_REGIONS.foot,
  ...UTM_REGIONS.sideSnap,
];

const PLACEHOLDER_PRE_COSMETIC =
  "https://via.placeholder.com/150x150/90EE90/000000?text=Pre+Cosmetic";
const PLACEHOLDER_PRE_NON_COSMETIC =
  "https://via.placeholder.com/150x150/87CEEB/000000?text=Pre+Non-Cosmetic";

const BACKEND_URL = "http://localhost:6060";
// const BACKEND_URL = "http://172.16.106.44:6060";

const UTMImageCropper: React.FC<UTMImageCropperProps> = ({
  chamberData,
  formData,
  updateRowField,
  selectedParts = [],
  machineEquipment2,
  isSecondRound = false,
  currentChildTest,
  onDataChange,
}) => {
  if (!chamberData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 font-medium">Loading chamber data...</p>
          </div>
        </div>
      </div>
    );
  }

  const [postCosmeticImages, setPostCosmeticImages] = useState<Record<string, string>>({});
  const [postNonCosmeticImages, setPostNonCosmeticImages] = useState<Record<string, string>>({});
  const [croppedImages, setCroppedImages] = useState<Record<string, Record<string, string>>>({});
  const [processing, setProcessing] = useState(false);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<"text" | "number" | "image" | "dropdown">("text");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [customColumnData, setCustomColumnData] = useState<Record<string, string>>({});

  const [showPreImagesModal, setShowPreImagesModal] = useState(false);
  const [selectedPartForModal, setSelectedPartForModal] = useState<string>("");
  const [selectedImageType, setSelectedImageType] = useState<"cosmetic" | "nonCosmetic">("cosmetic");

  useEffect(() => {
    if (!chamberData) return;

    console.log("chamberData", chamberData);

    // Load custom columns from chamberData - IMPORTANT: Use chamberData.customColumns
    const rawColumns = Array.isArray(chamberData.customColumns) ? chamberData.customColumns : [];

    // Also check if there are any custom columns defined, if not, initialize from customImages
    if (rawColumns.length === 0 && chamberData.parts && chamberData.parts.length > 0) {
      const part = chamberData.parts[0];
      if (part.customImages && part.customImages.length > 0) {
        // Create columns from customImages labels
        const imageColumns: CustomColumn[] = part.customImages.map((img: CustomImage) => ({
          id: img.label,
          label: img.label,
          type: "image" as const,
          options: []
        }));

        if (imageColumns.length > 0) {
          setCustomColumns(imageColumns);
        }
      }
    } else if (rawColumns.length > 0) {
      const hydratedColumns: CustomColumn[] = rawColumns.map((col: any, index: number) => ({
        id: col.id ?? col.name ?? col.label ?? `utm-column-${index}`,
        label: col.label ?? col.name ?? `Column ${index + 1}`,
        type: (col.type as CustomColumn["type"]) ?? "text",
        options: Array.isArray(col.options) ? col.options : undefined,
      }));

      setCustomColumns(hydratedColumns);
    }

    // Load custom column data from chamberData
    const rawColumnData = chamberData.customColumnData;
    if (rawColumnData && typeof rawColumnData === "object") {
      // Flatten the data structure for easier access
      const flattenedData: Record<string, string> = {};

      Object.keys(rawColumnData).forEach(partNumber => {
        Object.keys(rawColumnData[partNumber]).forEach(rowNum => {
          Object.keys(rawColumnData[partNumber][rowNum]).forEach(columnId => {
            const key = `${partNumber}-${rowNum}-${columnId}`;
            flattenedData[key] = rawColumnData[partNumber][rowNum][columnId];
          });
        });
      });

      setCustomColumnData(flattenedData);
    }
  }, [chamberData]);

  useEffect(() => {
    console.log("=== UTMImageCropper State Debug ===");
    console.log("Custom Columns:", customColumns);
    console.log("Custom Column Data:", customColumnData);
    console.log("Selected Parts:", selectedParts);
    console.log("===================================");
  }, [customColumns, customColumnData, selectedParts]);

  // ✅ Notify parent component when data changes
  useEffect(() => {
    if (onDataChange) {
      const data = {
        postCosmeticImages,
        postNonCosmeticImages,
        croppedImages, // For UI display only
        customColumns,
        customColumnData, // Now contains image paths, not base64
      };
      console.log("📤 Sending data to parent:", data);
      onDataChange(data);
    }
  }, [postCosmeticImages, postNonCosmeticImages, croppedImages, customColumns, customColumnData, onDataChange]);

  const getImageUrl = (imgPath: string) => {
    if (!imgPath) return "";
    if (imgPath.startsWith("http")) return imgPath;
    if (imgPath.startsWith("/uploads")) {
      return `${BACKEND_URL}${imgPath}`;
    }
    return imgPath;
  };

  // Get custom images for a specific part
  const getPartCustomImages = (partNumber: string): CustomImage[] => {
    if (!chamberData?.parts) return [];

    const part = chamberData.parts.find((p: any) => p.partNumber === partNumber);
    return part?.customImages || [];
  };

  // Get all images for a specific part (for modal view)
  const getAllPartImages = (partNumber: string): CustomImage[] => {
    return getPartCustomImages(partNumber);
  };

  // Get images by label for a specific part
  const getImagesByLabel = (partNumber: string, label: string): string[] => {
    const images = getPartCustomImages(partNumber);
    return images
      .filter(img => img.label === label)
      .map(img => getImageUrl(img.path));
  };

  // Get cosmetic image specifically (for cosmetic column)
  const getCosmeticImage = (partNumber: string, label: string): string => {
    const images = getImagesByLabel(partNumber, label);
    return images.length > 0 ? images[0] : "";
  };

  // For backward compatibility - get first cosmetic image
  const getFirstCosmeticImage = (partNumber: string): string => {
    const images = getPartCustomImages(partNumber);
    const cosmeticImage = images.find(img =>
      img.label.toLowerCase().includes('cosmetic') ||
      img.label.toLowerCase().includes('pre')
    );
    return cosmeticImage ? getImageUrl(cosmeticImage.path) : PLACEHOLDER_PRE_COSMETIC;
  };

  // For backward compatibility - get first non-cosmetic image
  const getFirstNonCosmeticImage = (partNumber: string): string => {
    const images = getPartCustomImages(partNumber);
    const nonCosmeticImage = images.find(img =>
      img.label.toLowerCase().includes('non-cosmetic') ||
      img.label.toLowerCase().includes('noncosmetic')
    );
    return nonCosmeticImage ? getImageUrl(nonCosmeticImage.path) : PLACEHOLDER_PRE_NON_COSMETIC;
  };

  const openPreImagesModal = (partNumber: string, type: "cosmetic" | "nonCosmetic") => {
    setSelectedPartForModal(partNumber);
    setSelectedImageType(type);
    setShowPreImagesModal(true);
  };

  // Update custom column value
  const updateCustomColumnValue = (partNumber: string, rowNum: number, columnId: string, value: string) => {
    const key = `${partNumber}-${rowNum}-${columnId}`;

    setCustomColumnData(prev => {
      const updated = { ...prev };

      if (!value || value.trim() === "") {
        delete updated[key];
      } else {
        updated[key] = value;
      }

      console.log(`Updated custom column: ${key} = ${value}`);
      return updated;
    });
  };

  // ✅ Handle custom column image upload - Upload to server and store path
  const handleCustomColumnImageUpload = async (
    partNumber: string,
    rowNum: number,
    columnId: string,
    file: File,
  ) => {
    try {
      console.log(`📤 Uploading custom column image for ${partNumber}, row ${rowNum}, column ${columnId}`);

      const formData = new FormData();
      formData.append("image", file);

      // Add metadata
      if (chamberData?.id) {
        formData.append("chamberLoadId", String(chamberData.id));
      }

      const part = selectedParts.find(p => p.partNumber === partNumber);
      if (part?.serialNumber) {
        formData.append("partId", String(part.serialNumber));
      } else if (part?.partNumber) {
        formData.append("partId", String(part.partNumber));
      }

      // Use imageType format: custom-{columnId}
      formData.append("imageType", `custom-${columnId}`);
      formData.append("checkpointIndex", String(0)); // UTM images go to checkpoint 0

      console.log("📤 Uploading with parameters:", {
        chamberLoadId: chamberData?.id,
        partId: part?.serialNumber || part?.partNumber,
        imageType: `custom-${columnId}`,
        checkpointIndex: 0,
        filename: file.name
      });

      // Upload to backend
      const response = await fetch(
        `${BACKEND_URL}/uploads/part-images`,
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
        console.log(`✅ Uploaded custom column image: ${result.path}`);

        // Get existing images for this column
        const key = `${partNumber}-${rowNum}-${columnId}`;
        const existingValue = customColumnData[key] || "[]";
        let existingPaths: string[] = [];

        try {
          existingPaths = JSON.parse(existingValue);
          if (!Array.isArray(existingPaths)) {
            existingPaths = [];
          }
        } catch (e) {
          existingPaths = [];
        }

        // Add new path to array
        const updatedPaths = [...existingPaths, result.path];
        const imagePathsJson = JSON.stringify(updatedPaths);

        // Update custom column data with JSON array of paths
        updateCustomColumnValue(partNumber, rowNum, columnId, imagePathsJson);

        console.log(`✅ Stored image path in customColumnData[${key}]:`, imagePathsJson);
      } else if (result?.path) {
        console.log(`✅ Uploaded custom column image: ${result.path}`);

        // Get existing images for this column
        const key = `${partNumber}-${rowNum}-${columnId}`;
        const existingValue = customColumnData[key] || "[]";
        let existingPaths: string[] = [];

        try {
          existingPaths = JSON.parse(existingValue);
          if (!Array.isArray(existingPaths)) {
            existingPaths = [];
          }
        } catch (e) {
          existingPaths = [];
        }

        // Add new path to array
        const updatedPaths = [...existingPaths, result.path];
        const imagePathsJson = JSON.stringify(updatedPaths);

        updateCustomColumnValue(partNumber, rowNum, columnId, imagePathsJson);

        console.log(`✅ Stored image path in customColumnData[${key}]:`, imagePathsJson);
      } else {
        throw new Error("Upload response missing path");
      }
    } catch (error) {
      console.error("Error uploading custom column image:", error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Render custom column cell
  const renderCustomColumnCell = (part: any, rowNum: number, column: CustomColumn) => {
    const key = `${part.partNumber}-${rowNum}-${column.id}`;
    const value = customColumnData[key] || "";

    // For image columns, check if we have images from customImages array
    const existingImages = column.type === "image" ?
      getImagesByLabel(part.partNumber, column.label) : [];

    // Parse uploaded images from customColumnData
    let uploadedImages: string[] = [];
    if (column.type === "image" && value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          uploadedImages = parsed.map(path =>
            path.startsWith('/') ? `${BACKEND_URL}${path}` : path
          );
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }

    switch (column.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Enter text"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Enter number"
          />
        );

      case "dropdown":
        return (
          <select
            value={value}
            onChange={(e) => updateCustomColumnValue(part.partNumber, rowNum, column.id, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "image":
        return (
          <div className="flex flex-col items-center">
            {/* Upload button */}
            <label className="cursor-pointer px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center mb-2">
              <ImageIcon size={14} className="mr-1" />
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCustomColumnImageUpload(part.partNumber, rowNum, column.id, file);
                  }
                }}
                className="hidden"
              />
            </label>

            {/* Show uploaded images from current session */}
            {uploadedImages.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Uploaded:</p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {uploadedImages.map((imgSrc, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={imgSrc}
                        alt={`Uploaded ${idx + 1}`}
                        className="w-12 h-12 object-cover border-2 border-blue-300 rounded cursor-pointer"
                        onClick={() => window.open(imgSrc, "_blank")}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show existing images from customImages array - only for cosmetic images */}
            {existingImages.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">From pre-test:</p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {existingImages.map((imgSrc, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={imgSrc}
                        alt={`${column.label} ${idx + 1}`}
                        className="w-10 h-10 object-cover border border-gray-300 rounded cursor-pointer"
                        onClick={() => window.open(imgSrc, "_blank")}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Add these handler functions after the existing upload handlers

  const handleRemovePostCosmetic = (partNumber: string) => {
    setPostCosmeticImages((prev) => {
      const updated = { ...prev };
      delete updated[partNumber];
      return updated;
    });
  };

  const handleRemovePostNonCosmetic = (partNumber: string) => {
    setPostNonCosmeticImages((prev) => {
      const updated = { ...prev };
      delete updated[partNumber];
      return updated;
    });

    // Also clear cropped images when removing non-cosmetic image
    setCroppedImages((prev) => {
      const updated = { ...prev };
      delete updated[partNumber];
      return updated;
    });
  };

  const handlePostCosmeticUpload = (partNumber: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPostCosmeticImages(prev => ({
        ...prev,
        [partNumber]: imageData,
      }));

      // Also crop the cosmetic image for custom image columns
      cropCosmeticImage(partNumber, imageData);
    };
    reader.readAsDataURL(file);
  };

  const handlePostNonCosmeticUpload = async (partNumber: string, file: File) => {
    setProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const fullImageData = e.target?.result as string;
      setPostNonCosmeticImages(prev => ({
        ...prev,
        [partNumber]: fullImageData,
      }));

      try {
        await cropWithCanvas(partNumber, fullImageData);
        alert(`✅ Image cropped successfully`);
      } catch (error) {
        console.error("Error:", error);
        alert("❌ Failed to crop image");
      } finally {
        setProcessing(false);
      }
    };

    reader.onerror = () => {
      alert("Failed to read image file");
      setProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  // Crop cosmetic image for custom image columns
  const cropCosmeticImage = async (partNumber: string, imageData: string) => {
    // For cosmetic images, we don't crop to specific regions
    // We can store the full image or process it differently if needed
    console.log(`Cosmetic image uploaded for part ${partNumber}`);

    // If you need to process cosmetic image differently, add logic here
    // For now, just store it in postCosmeticImages state
  };

  const cropImageWithCanvas = (
    imageElement: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(imageElement, x, y, width, height, 0, 0, width, height);
    return canvas.toDataURL("image/png", 1.0);
  };

  const cropWithCanvas = async (
    partNumber: string,
    imageData: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scaleX = img.width / 480;
          const scaleY = img.height / 320;
          const croppedImageData: Record<string, string> = {};

          ALL_REGIONS.forEach((region) => {
            try {
              const x = Math.round(region.x * scaleX);
              const y = Math.round(region.y * scaleY);
              const width = Math.round(region.width * scaleX);
              const height = Math.round(region.height * scaleY);

              if (width <= 0 || height <= 0) return;

              const validX = Math.max(0, Math.min(x, img.width - 1));
              const validY = Math.max(0, Math.min(y, img.height - 1));
              const validWidth = Math.min(width, img.width - validX);
              const validHeight = Math.min(height, img.height - validY);

              const croppedData = cropImageWithCanvas(
                img,
                validX,
                validY,
                validWidth,
                validHeight,
              );
              croppedImageData[region.label] = croppedData;
            } catch (err) {
              console.error(`Error cropping ${region.label}:`, err);
            }
          });

          setCroppedImages(prev => ({
            ...prev,
            [partNumber]: croppedImageData,
          }));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageData;
    });
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      alert("Please enter a column name");
      return;
    }

    if (newColumnType === "dropdown" && dropdownOptions.length === 0) {
      alert("Please add at least one option for dropdown");
      return;
    }

    const columnId = newColumnName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const newColumn: CustomColumn = {
      id: columnId,
      label: newColumnName.trim(),
      type: newColumnType,
      options: newColumnType === "dropdown" ? dropdownOptions : undefined,
    };

    setCustomColumns(prev => [...prev, newColumn]);
    setShowAddColumnModal(false);
    setNewColumnName("");
    setNewColumnType("text");
    setDropdownOptions([]);
    setNewOption("");
  };

  const addDropdownOption = () => {
    if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) {
      setDropdownOptions(prev => [...prev, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeDropdownOption = (option: string) => {
    setDropdownOptions(prev => prev.filter(opt => opt !== option));
  };

  const handleRemoveColumn = (columnId: string) => {
    setCustomColumns(prev => prev.filter(col => col.id !== columnId));

    // Remove associated data
    const newCustomColumnData = { ...customColumnData };
    Object.keys(newCustomColumnData).forEach(key => {
      if (key.includes(`-${columnId}`)) {
        delete newCustomColumnData[key];
      }
    });
    setCustomColumnData(newCustomColumnData);
  };

  const uniqueParts = Array.isArray(selectedParts)
    ? selectedParts.reduce((acc, part) => {
      if (!acc.find((p: any) => p.partNumber === part.partNumber)) {
        acc.push(part);
      }
      return acc;
    }, [] as any[])
    : [];

  if (!Array.isArray(selectedParts) || selectedParts.length === 0) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No parts available for unload</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Add Column Button */}
      <div className="max-w-full mx-auto mb-4">
        <button
          onClick={() => setShowAddColumnModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <Plus size={18} />
          Add Custom Column
        </button>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add Custom Column</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Column Name</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Column Type</label>
                <select
                  value={newColumnType}
                  onChange={(e) => {
                    setNewColumnType(e.target.value as any);
                    if (e.target.value !== "dropdown") {
                      setDropdownOptions([]);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="image">Image</option>
                </select>
              </div>

              {newColumnType === "dropdown" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Dropdown Options</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addDropdownOption()}
                      placeholder="Add option"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addDropdownOption}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dropdownOptions.map((option) => (
                      <div key={option} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        <span className="text-sm">{option}</span>
                        <button
                          onClick={() => removeDropdownOption(option)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddColumn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Add Column
              </button>
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName("");
                  setNewColumnType("text");
                  setDropdownOptions([]);
                  setNewOption("");
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Test Images Modal */}
      {showPreImagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Pre-Test Images - Part {selectedPartForModal}
              </h3>
              <button
                onClick={() => setShowPreImagesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {getAllPartImages(selectedPartForModal).map((img: CustomImage, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <img
                    src={getImageUrl(img.path)}
                    alt={img.label}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-2 text-center bg-gray-100">
                    <span className="text-sm font-medium">{img.label}</span>
                    {img.uploadedAt && (
                      <p className="text-xs text-gray-500">
                        {new Date(img.uploadedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowPreImagesModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto space-y-8">
        {uniqueParts.map((part) => {
          const postCosmetic = postCosmeticImages[part.partNumber];
          const postNonCosmetic = postNonCosmeticImages[part.partNumber];
          const partCroppedImages = croppedImages[part.partNumber] || {};
          const partCustomImages = getPartCustomImages(part.partNumber);

          return (
            <div key={part.partNumber} className="space-y-4">
              {/* Part Header */}
              <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg">
                <h2 className="text-lg font-bold">{part.partNumber}</h2>
                <div className="flex gap-4 mt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span>
                      Pre Images: {partCustomImages.length} images
                    </span>
                  </div>
                </div>
              </div>

              {/* UTM Table */}
              <div className="bg-white rounded-b-xl shadow-md border-2 border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-400">
                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">
                          Row #
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-green-700 uppercase border-r border-gray-300 bg-green-50">
                          Post Cosmetic
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 bg-blue-50">
                          Post Non-Cosmetic
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Clear
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Foot
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase border-r border-gray-300 bg-purple-50">
                          Side Snap
                        </th>

                        {/* Custom Columns Headers - DYNAMIC from chamberData */}
                        {customColumns.map((column) => (
                          <th
                            key={column.id}
                            className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-300 bg-gray-50 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span>{column.label}</span>
                              <button
                                onClick={() => handleRemoveColumn(column.id)}
                                className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <span className="text-[10px] font-normal text-gray-500">
                              ({column.type})
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[1, 2, 3, 4].map((rowNum, index) => {
                        const clearImg = partCroppedImages[`CL-${rowNum}`];
                        const footImg = partCroppedImages[`FT-${rowNum}`];
                        const sideSnapImg = partCroppedImages[`SS-${rowNum}`];

                        return (
                          <tr
                            key={rowNum}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {/* Row Number */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              <div className="text-sm font-bold text-gray-800">
                                {rowNum}
                              </div>
                            </td>

                            {/* Post Cosmetic */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {rowNum === 1 ? (
                                postCosmetic ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img
                                      src={postCosmetic}
                                      alt="Post Cosmetic"
                                      className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg cursor-pointer"
                                      onClick={() =>
                                        window.open(postCosmetic, "_blank")
                                      }
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleRemovePostCosmetic(
                                            part.partNumber,
                                          )
                                        }
                                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
                                      >
                                        <X size={12} />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="inline-flex items-center cursor-pointer px-4 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                                    <Upload size={14} className="mr-1" />
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handlePostCosmeticUpload(
                                            part.partNumber,
                                            file,
                                          );
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )
                              ) : (
                                postCosmetic && (
                                  <img
                                    src={postCosmetic}
                                    alt="Post Cosmetic"
                                    className="w-20 h-20 object-contain mx-auto border-2 border-green-500 rounded-lg"
                                  />
                                )
                              )}
                            </td>

                            {/* Post Non-Cosmetic */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {rowNum === 1 ? (
                                postNonCosmetic ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img
                                      src={postNonCosmetic}
                                      alt="Post Non-Cosmetic"
                                      className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg cursor-pointer"
                                      onClick={() =>
                                        window.open(postNonCosmetic, "_blank")
                                      }
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleRemovePostNonCosmetic(
                                            part.partNumber,
                                          )
                                        }
                                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
                                        disabled={processing}
                                      >
                                        <X size={12} />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label
                                    className={`inline-flex items-center cursor-pointer px-4 py-2 text-white text-xs rounded ${processing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                                  >
                                    {processing ? (
                                      <>
                                        <Loader2
                                          size={14}
                                          className="mr-1 animate-spin"
                                        />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <Upload size={14} className="mr-1" />
                                        Upload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handlePostNonCosmeticUpload(
                                            part.partNumber,
                                            file,
                                          );
                                      }}
                                      className="hidden"
                                      disabled={processing}
                                    />
                                  </label>
                                )
                              ) : (
                                postNonCosmetic && (
                                  <img
                                    src={postNonCosmetic}
                                    alt="Post Non-Cosmetic"
                                    className="w-20 h-20 object-contain mx-auto border-2 border-blue-500 rounded-lg"
                                  />
                                )
                              )}
                            </td>

                            {/* Clear */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {clearImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={clearImg}
                                    alt={`CL-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() => window.open(clearImg, "_blank")}
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    CL-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  CL-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Foot */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {footImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={footImg}
                                    alt={`FT-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() => window.open(footImg, "_blank")}
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    FT-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  FT-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Side Snap */}
                            <td className="px-4 py-4 border-r border-gray-300 text-center">
                              {sideSnapImg ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={sideSnapImg}
                                    alt={`SS-${rowNum}`}
                                    className="w-20 h-20 object-contain border-2 border-purple-400 rounded-lg cursor-pointer"
                                    onClick={() => window.open(sideSnapImg, "_blank")}
                                  />
                                  <span className="text-xs text-purple-600 mt-1 font-medium">
                                    SS-{rowNum}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  SS-{rowNum}
                                </span>
                              )}
                            </td>

                            {/* Custom Columns Data - DYNAMIC from chamberData */}
                            {customColumns.map((column) => (
                              <td
                                key={column.id}
                                className="px-4 py-4 border-r border-gray-300 text-center"
                              >
                                {renderCustomColumnCell(part, rowNum, column)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UTMImageCropper;