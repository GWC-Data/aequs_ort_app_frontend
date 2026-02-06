import React, { useState } from 'react';
import { X, Upload, ImageIcon } from 'lucide-react';

interface CheckpointCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoint: any;
  partNumber: string;
  onComplete: (images: string[], notes: string) => void;
}

export const CheckpointCompletionModal: React.FC<CheckpointCompletionModalProps> = ({
  isOpen,
  onClose,
  checkpoint,
  partNumber,
  onComplete
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newImages: string[] = [];

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        
        if (newImages.length === files.length) {
          setImages(prev => [...prev, ...newImages]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (images.length === 0) {
      alert('Please upload at least one image');
      return;
    }
    
    onComplete(images, notes);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Complete Checkpoint: {checkpoint.displayName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Part: <span className="font-semibold">{partNumber}</span>
          </p>
          <p className="text-gray-600 mb-4">
            Checkpoint Type: {checkpoint.isPreImage ? 'Pre-Image (T0)' : 'Regular Checkpoint'}
          </p>
        </div>

        {/* Image Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Upload Images ({images.length}/10)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading || images.length >= 10}
            />
            <label
              htmlFor="image-upload"
              className={`cursor-pointer flex flex-col items-center ${uploading || images.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload size={48} className="text-gray-400 mb-2" />
              <p className="text-gray-600">
                {uploading ? 'Uploading...' : 'Click to upload images'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Maximum 10 images, JPG/PNG format
              </p>
            </label>
          </div>

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Images:</h4>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img}
                      alt={`Checkpoint image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any observations, comments, or issues..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={images.length === 0 || uploading}
            className={`px-4 py-2 rounded-lg ${images.length === 0 || uploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {uploading ? 'Uploading...' : 'Complete Checkpoint'}
          </button>
        </div>
      </div>
    </div>
  );
};