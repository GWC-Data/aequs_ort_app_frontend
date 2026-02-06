import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Trash2 } from 'lucide-react';
import { ChamberLoad } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: ChamberLoad | null;
  onConfirm: () => void | Promise<void>;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  load,
  onConfirm
}) => {
  if (!load) return null;

  const formatDuration = (hours?: number | null) => {
    if (!hours || Number.isNaN(hours)) {
      return '0h';
    }

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            <div className="flex items-center gap-3">
              <Trash2 className="text-red-600" size={24} />
              <span>Confirm Deletion</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            This action cannot be undone
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Delete Load from {load.chamber}?
            </h4>
            <p className="text-gray-600 mb-4">
              You are about to delete this load. This will remove all parts from the chamber and return them to available inventory.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Equipment:</span>
                  <span className="font-medium ml-2">{load.machineId || load.chamber}</span>
                </div>
                <div>
                  <span className="text-gray-500">Parts:</span>
                  <span className="font-medium ml-2">{load.parts.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium ml-2">{formatDuration(load.duration)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium ml-2">
                    {load.timerStatus === 'start' ? 'Test Running' :
                     load.timerStatus === 'paused' ? 'Test Paused' : 'Loaded'}
                  </span>
                </div>
                {load.parts.map((part, index) => (
                  <div key={index} className="col-span-2 text-xs bg-white p-2 rounded border">
                    <span className="font-medium">{part.partNumber}</span>
                    <span className="text-gray-500 ml-2">({part.testName})</span>
                    {part.checkpoint && (
                      <span className="text-purple-600 ml-2">[{part.checkpoint}]</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete Load
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmModal;