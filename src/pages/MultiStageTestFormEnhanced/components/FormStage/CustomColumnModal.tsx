import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CustomColumn, COLUMN_TYPES } from '../../types';

interface CustomColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddColumn: (column: CustomColumn) => void;
}

export const CustomColumnModal: React.FC<CustomColumnModalProps> = ({
    isOpen,
    onClose,
    onAddColumn
}) => {
    const [newColumn, setNewColumn] = useState({
        label: '',
        type: 'text' as 'text' | 'number' | 'date' | 'select' | 'textarea' | 'image',
        options: [] as string[]
    });
    const [newOption, setNewOption] = useState('');

    const handleAddColumn = () => {
        if (!newColumn.label.trim()) return;

        const columnId = newColumn.label.trim().toLowerCase().replace(/\s+/g, '_');

        const customColumn: CustomColumn = {
            id: columnId,
            label: newColumn.label.trim(),
            type: newColumn.type,
            options: newColumn.type === 'select' ? newColumn.options : undefined
        };

        onAddColumn(customColumn);
        onClose();
        setNewColumn({ label: '', type: 'text', options: [] });
        setNewOption('');
    };

    const addOption = () => {
        if (newOption.trim() && !newColumn.options.includes(newOption.trim())) {
            setNewColumn(prev => ({
                ...prev,
                options: [...prev.options, newOption.trim()]
            }));
            setNewOption('');
        }
    };

    const removeOption = (optionToRemove: string) => {
        setNewColumn(prev => ({
            ...prev,
            options: prev.options.filter(opt => opt !== optionToRemove)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Column</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Column Label
                        </label>
                        <input
                            type="text"
                            value={newColumn.label}
                            onChange={(e) => setNewColumn(prev => ({ ...prev, label: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter column name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Data Type
                        </label>
                        <select
                            value={newColumn.type}
                            onChange={(e) => setNewColumn(prev => ({
                                ...prev,
                                type: e.target.value as any,
                                options: e.target.value === 'select' ? [] : undefined
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={COLUMN_TYPES.TEXT}>Text</option>
                            <option value={COLUMN_TYPES.NUMBER}>Number</option>
                            <option value={COLUMN_TYPES.DATE}>Date</option>
                            <option value={COLUMN_TYPES.SELECT}>Dropdown</option>
                            <option value={COLUMN_TYPES.TEXTAREA}>Text Area</option>
                            <option value={COLUMN_TYPES.IMAGE}>Image</option>
                        </select>
                    </div>
                    {newColumn.type === 'select' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Options
                            </label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newOption}
                                        onChange={(e) => setNewOption(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addOption()}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Add option"
                                    />
                                    <button
                                        onClick={addOption}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newColumn.options.map((option, index) => (
                                        <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                            <span className="text-sm">{option}</span>
                                            <button
                                                onClick={() => removeOption(option)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleAddColumn}
                        disabled={!newColumn.label.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Column
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};