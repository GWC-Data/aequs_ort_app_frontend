// ImageUploadComponent.tsx
import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Camera, FileText, Info } from 'lucide-react';

interface ImagePreview {
  filePath: string; // Base64 or blob URL
  previewUrl: string; // Blob URL for preview
  fileName: string;
}

interface ImageUploadComponentProps {
  partNumber: string;
  serialNumber: string;
  imageType: 'cosmetic' | 'nonCosmetic' | 'finalCosmetic' | 'finalNonCosmetic';
  images: string[]; // Array of base64 or blob URLs
  onImageUpload: (file: File) => void;
  onImageRemove: (index: number) => void;
  isUploading?: boolean;
  disabled?: boolean;
  label?: string;
  isCheckpointRow?: boolean;
  checkpointLabel?: string;
  isSecondRound?: boolean;
  allowMultiple?: boolean;
  projectType?: string;
}

const ImageUploadComponent: React.FC<ImageUploadComponentProps> = ({
  partNumber,
  serialNumber,
  imageType,
  images,
  onImageUpload,
  onImageRemove,
  isUploading = false,
  disabled = false,
  label,
  isCheckpointRow = false,
  checkpointLabel,
  isSecondRound = false,
  allowMultiple = false,
  projectType = 'Flash'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, ImagePreview>>({});

  const getDisplayLabel = () => {
    if (label) return label;
    
    switch (imageType) {
      case 'cosmetic':
        return isSecondRound ? 'Post Cosmetic Images' : 'Cosmetic Images';
      case 'nonCosmetic':
        return isSecondRound ? 'Post Non-Cosmetic Images' : 'Non-Cosmetic Images';
      case 'finalCosmetic':
        return 'Final Cosmetic Images';
      case 'finalNonCosmetic':
        return 'Final Non-Cosmetic Images';
      default:
        return 'Images';
    }
  };

  const getIconColor = () => {
    if (isSecondRound) {
      return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
        ? 'text-purple-600' 
        : 'text-orange-600';
    }
    return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
      ? 'text-blue-600' 
      : 'text-green-600';
  };

  const getBgColor = () => {
    if (isSecondRound) {
      return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
        ? 'bg-purple-50 border-purple-100' 
        : 'bg-orange-50 border-orange-100';
    }
    return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
      ? 'bg-blue-50 border-blue-100' 
      : 'bg-green-50 border-green-100';
  };

  const getButtonColor = () => {
    if (isSecondRound) {
      return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
        ? 'bg-purple-600 hover:bg-purple-700' 
        : 'bg-orange-600 hover:bg-orange-700';
    }
    return imageType === 'cosmetic' || imageType === 'finalCosmetic' 
      ? 'bg-blue-600 hover:bg-blue-700' 
      : 'bg-green-600 hover:bg-green-700';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filesToProcess = allowMultiple ? Array.from(files) : [files[0]];

    for (const file of filesToProcess) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        continue;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Image ${file.name} size should be less than 5MB`);
        continue;
      }

      try {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        const fileName = file.name;

        const previewKey = `${imageType}_${partNumber}_${Date.now()}_${Math.random()}`;
        setImagePreviews(prev => ({
          ...prev,
          [previewKey]: {
            filePath: previewUrl, // Temporary - will be replaced by base64
            previewUrl,
            fileName
          }
        }));

        // Call parent upload handler
        onImageUpload(file);

      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing image file');
      }
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.click();
    }
  };

  // Helper to extract file name from path
  const getFileName = (path: string): string => {
    if (!path) return 'Unknown file';
    if (path.startsWith('data:image')) return 'Uploaded image';
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    // Clean up blob URLs associated with this image
    const imageToRemove = images[index];
    const previewKey = Object.keys(imagePreviews).find(key => 
      imagePreviews[key].filePath === imageToRemove
    );
    
    if (previewKey && imagePreviews[previewKey]) {
      URL.revokeObjectURL(imagePreviews[previewKey].previewUrl);
      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[previewKey];
        return newPreviews;
      });
    }
    
    // Call parent to remove from state
    onImageRemove(index);
  };

  // Clean up blob URLs on unmount
  React.useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach(preview => {
        URL.revokeObjectURL(preview.previewUrl);
      });
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={14} className={getIconColor()} />
          <span className="text-xs font-medium text-gray-700">
            {getDisplayLabel()}
          </span>
          {isCheckpointRow && checkpointLabel && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {checkpointLabel}
            </span>
          )}
          <span className="text-xs text-gray-500">({images?.length || 0})</span>
        </div>
      </div>

      {/* Images display */}
      <div className="space-y-2">
        {images && images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {images.map((imagePath, index) => {
              const fileName = getFileName(imagePath);
              
              // Find preview for this image
              const previewKey = Object.keys(imagePreviews).find(key => 
                imagePreviews[key].filePath === imagePath
              );
              const previewUrl = previewKey ? imagePreviews[previewKey].previewUrl : imagePath;
              
              return (
                <div key={index} className="relative group">
                  <div className={`w-full h-32 flex items-center justify-center ${getBgColor()} rounded-lg border overflow-hidden`}>
                    <img 
                      src={previewUrl} 
                      alt={fileName} 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(previewUrl, '_blank')}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const iconDiv = document.createElement('div');
                          iconDiv.className = 'flex flex-col items-center justify-center';
                          iconDiv.innerHTML = `<svg class="w-8 h-8 ${getIconColor()}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
                          parent.appendChild(iconDiv);
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {isSecondRound ? 'Post ' : ''}{index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText size={20} className="mx-auto mb-1" />
            <div className="text-xs">
              No {isSecondRound ? 'post ' : ''}{imageType.includes('Cosmetic') ? 'cosmetic' : 'non-cosmetic'} images
            </div>
          </div>
        )}
      </div>

      {/* Upload button */}
      <label 
        className={`flex items-center justify-center h-16 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          disabled || isUploading 
            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300' 
            : `hover:border-opacity-70 ${
                isSecondRound 
                  ? (imageType === 'cosmetic' || imageType === 'finalCosmetic' ? 'border-purple-300 bg-purple-50 hover:bg-purple-100' : 'border-orange-300 bg-orange-50 hover:bg-orange-100')
                  : (imageType === 'cosmetic' || imageType === 'finalCosmetic' ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' : 'border-green-300 bg-green-50 hover:bg-green-100')
              }`
        }`}
      >
        <div className="text-center">
          <Upload 
            className={`mx-auto mb-1 ${
              disabled || isUploading ? 'text-gray-400' : getIconColor()
            }`}
            size={18}
          />
          <span className={`text-xs font-medium ${
            disabled || isUploading ? 'text-gray-500' : 'text-gray-700'
          }`}>
            {isUploading ? 'Uploading...' : `Upload ${getDisplayLabel()}`}
          </span>
          {allowMultiple && (
            <p className="text-xs text-gray-500 mt-1">
              {projectType === 'Hulk' ? 'Multiple files allowed' : 'Single file'}
            </p>
          )}
        </div>
        <input
          type="file"
          ref={inputRef}
          accept="image/*"
          multiple={allowMultiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </label>
    </div>
  );
};

export default ImageUploadComponent;