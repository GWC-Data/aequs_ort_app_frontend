import { useState, useCallback } from 'react';
import { FormsState, FormData, FormRow, AssignedPart, CustomColumn } from '../types';
import { loadImagesFromStorage } from '../../utils/localStorageHelper';

export const useFormState = () => {
    const [forms, setForms] = useState<FormsState>({});

    const updateFormField = useCallback((formKey: string, field: string, value: any) => {
        setForms(prev => ({
            ...prev,
            [formKey]: { ...prev[formKey], [field]: value }
        }));
    }, []);

    const updateRowField = useCallback((formKey: string, rowId: number, field: string, value: string) => {
        setForms(prev => {
            const formData = prev[formKey];
            if (!formData) return prev;

            const updatedRows = formData.rows.map(row => {
                if (row.id === rowId) {
                    return { ...row, [field]: value };
                }
                return row;
            });

            return {
                ...prev,
                [formKey]: {
                    ...formData,
                    rows: updatedRows
                }
            };
        });
    }, []);

    const addRow = useCallback((formKey: string, partNumber?: string) => {
        setForms(prev => {
            const currentForm = prev[formKey];
            if (!currentForm) return prev;

            const currentChildTestIndex = currentForm.currentChildTestIndex || 0;
            const currentChildTest = currentForm.childTests?.[currentChildTestIndex];

            // Find rows for current child test
            const childTestRows = currentForm.rows.filter(row => row.childTestId === currentChildTest?.id);
            const newId = Math.max(...childTestRows.map(r => r.id), 0) + 1;

            // Find the part to assign the new row to
            const targetPartNumber = partNumber || childTestRows[0]?.partNumber || currentForm.rows[0]?.partNumber;

            // Load existing images for the part
            const existingImages = loadImagesFromStorage(targetPartNumber);

            const newRow: FormRow = {
                id: newId,
                srNo: childTestRows.length + 1,
                testDate: new Date().toISOString().split('T')[0],
                config: "",
                sampleId: `${targetPartNumber}-${childTestRows.length + 1}`,
                status: "Pending",
                partNumber: targetPartNumber || "",
                serialNumber: "",
                childTestId: currentChildTest?.id,
                childTestName: currentChildTest?.name,
                cosmeticImage: existingImages.cosmeticImages[0] || "",
                nonCosmeticImage: existingImages.nonCosmeticImages[0] || "",
                cosmeticImages: existingImages.cosmeticImages,
                nonCosmeticImages: existingImages.nonCosmeticImages,
                croppedImage: "",
                croppedImages: [],
                regionLabel: "",
                finalCosmeticImage: "",
                finalCosmeticImages: [],
                finalNonCosmeticImage: "",
                finalCroppedNonCosmeticImage: ""
            };

            // Add all custom column fields with empty values
            if (currentForm.customColumns) {
                currentForm.customColumns.forEach(col => {
                    newRow[col.id] = '';
                });
            }

            return {
                ...prev,
                [formKey]: {
                    ...currentForm,
                    rows: [...currentForm.rows, newRow]
                }
            };
        });
    }, []);

    const addCustomColumn = useCallback((formKey: string, column: CustomColumn) => {
        setForms(prev => {
            const currentForm = prev[formKey];
            if (!currentForm) return prev;

            const updatedCustomColumns = [...(currentForm.customColumns || []), column];

            // Add the new column to all existing rows
            const updatedRows = currentForm.rows.map(row => ({
                ...row,
                [column.id]: ''
            }));

            return {
                ...prev,
                [formKey]: {
                    ...currentForm,
                    customColumns: updatedCustomColumns,
                    rows: updatedRows
                }
            };
        });
    }, []);

    const removeCustomColumn = useCallback((formKey: string, columnId: string) => {
        setForms(prev => {
            const currentForm = prev[formKey];
            if (!currentForm) return prev;

            const updatedColumns = currentForm.customColumns?.filter(col => col.id !== columnId) || [];

            return {
                ...prev,
                [formKey]: {
                    ...currentForm,
                    customColumns: updatedColumns
                }
            };
        });
    }, []);

    const getFormData = useCallback((formKey: string): FormData | undefined => {
        return forms[formKey];
    }, [forms]);

    const initializeForm = useCallback((
        formKey: string,
        initialData: Partial<FormData>,
        assignedParts: AssignedPart[],
        isSecondRound: boolean = false
    ) => {
        const existingImages = assignedParts.reduce((acc, part) => {
            acc[part.partNumber] = loadImagesFromStorage(part.partNumber);
            return acc;
        }, {} as Record<string, ReturnType<typeof loadImagesFromStorage>>);

        const initialRows: FormRow[] = assignedParts.map((part, idx) => {
            const images = existingImages[part.partNumber];

            return {
                id: Date.now() + idx,
                srNo: idx + 1,
                testDate: new Date().toISOString().split('T')[0],
                config: "",
                sampleId: part.serialNumber,
                status: "Pending",
                partNumber: part.partNumber,
                serialNumber: part.serialNumber,
                childTestId: initialData.childTests?.[0]?.id,
                childTestName: initialData.childTests?.[0]?.name,
                checkpointHours: 0,
                checkpointStatus: "Pending",
                cosmeticImage: images.cosmeticImages[0] || "",
                nonCosmeticImage: images.nonCosmeticImages[0] || "",
                cosmeticImages: images.cosmeticImages,
                nonCosmeticImages: images.nonCosmeticImages,
                croppedImage: "",
                croppedImages: [],
                regionLabel: "",
                finalCosmeticImage: isSecondRound ? (images.finalCosmeticImages?.[0] || "") : "",
                finalCosmeticImages: isSecondRound ? (images.finalCosmeticImages || []) : [],
                finalNonCosmeticImage: isSecondRound ? (images.finalNonCosmeticImages?.[0] || "") : "",
                finalCroppedNonCosmeticImage: ""
            };
        });

        setForms(prev => ({
            ...prev,
            [formKey]: {
                ...initialData,
                rows: initialRows,
                customColumns: [],
                currentChildTestIndex: 0
            } as FormData
        }));
    }, []);

    return {
        forms,
        setForms,
        updateFormField,
        updateRowField,
        addRow,
        addCustomColumn,
        removeCustomColumn,
        getFormData,
        initializeForm
    };
};