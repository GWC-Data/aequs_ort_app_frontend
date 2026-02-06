// RowFieldRenderer.tsx - No changes needed
import React from 'react';
import { Upload } from 'lucide-react';
import { FormRow, CustomColumn, COLUMN_TYPES } from '../../types';

interface RowFieldRendererProps {
    row: FormRow;
    column: CustomColumn;
    onFieldChange: (rowId: number, field: string, value: string) => void;
    onImageUpload?: (rowId: number, file: File) => void;
}

export const RowFieldRenderer: React.FC<RowFieldRendererProps> = ({
    row,
    column,
    onFieldChange,
    onImageUpload
}) => {
    const value = row[column.id] || '';

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(row.id, file);
        }
    };

    switch (column.type) {
        case COLUMN_TYPES.TEXT:
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onFieldChange(row.id, column.id, e.target.value)}
                    className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            );

        case COLUMN_TYPES.NUMBER:
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onFieldChange(row.id, column.id, e.target.value)}
                    className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            );

        case COLUMN_TYPES.DATE:
            return (
                <input
                    type="date"
                    value={value}
                    onChange={(e) => onFieldChange(row.id, column.id, e.target.value)}
                    className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            );

        case COLUMN_TYPES.SELECT:
            return (
                <select
                    value={value}
                    onChange={(e) => onFieldChange(row.id, column.id, e.target.value)}
                    className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Select</option>
                    {column.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            );

        case COLUMN_TYPES.TEXTAREA:
            return (
                <textarea
                    value={value}
                    onChange={(e) => onFieldChange(row.id, column.id, e.target.value)}
                    rows={3}
                    className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
            );

        case COLUMN_TYPES.IMAGE:
            return (
                <div className="space-y-2">
                    {!value ? (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                            <Upload size={20} className="text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Upload Image</span>
                            <span className="text-xs text-gray-500 mt-1">Click to browse</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="relative">
                            <img
                                src={value}
                                alt={`${column.label} preview`}
                                className="w-20 h-20 object-cover border rounded-lg"
                            />
                            <div className="flex gap-1 mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file && onImageUpload) {
                                                onImageUpload(row.id, file);
                                            }
                                        };
                                        input.click();
                                    }}
                                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                >
                                    Replace
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFieldChange(row.id, column.id, '')}
                                    className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );

        default:
            return null;
    }
};