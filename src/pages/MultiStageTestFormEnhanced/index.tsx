import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';

// Import components
import { ProgressBar } from './components/ProgressBar';
import { ImageUploadStage } from './components/ImageUploadStage';
import { FormStage } from './components/FormStage';
import { ScanModal } from './components/ScanModal';
import { TimerManager } from './components/Timer/TimerManager';

// Import hooks
import { useTimer } from './components/hooks/useTimer';
import { useImageProcessing } from './components/hooks/useImageProcessing';
import { usePartScan } from './components/hooks/usePartScan';
import { useFormState } from './components/hooks/useFormState';

// Import utils
import { 
    parseChildTests, 
    normalizeMachineName,
    parseCheckpointHours 
} from './utils/testConditionParser';
import { 
    loadImagesFromStorage,
    updateChamberLoadsTimer,
    updateCheckpointResults,
    getChamberLoads,
    getOqcRecords,
    getTicketAllocations
} from './utils/localStorageHelper';
import { loadMasterExcelSheet } from './utils/excelParser';

// Import types
import { 
    Stage2Record, 
    TestRecord, 
    FormsState, 
    SharedImagesByPart,
    AssignedPart,
    FormData,
    FormRow,
    MachineLoadData,
    ChildTest
} from './types';

export default function MultiStageTestFormEnhanced() {
    const [currentStage, setCurrentStage] = useState(0);
    const [currentRecord, setCurrentRecord] = useState<Stage2Record | null>(null);
    const [currentTestIndex, setCurrentTestIndex] = useState(0);
    const [sharedImagesByPart, setSharedImagesByPart] = useState<SharedImagesByPart>({});
    const [isSecondRound, setIsSecondRound] = useState(false);
    const [projectType, setProjectType] = useState<string>("");
    const [testConditionsMap, setTestConditionsMap] = useState<Map<string, string>>(new Map());
    const [verifiedPartsForFinalUpload, setVerifiedPartsForFinalUpload] = useState<Set<string>>(new Set());
    const [checkpointResults, setCheckpointResults] = useState<{
        pass: string[],
        fail: string[]
    }>({ pass: [], fail: [] });

    // ✅ FIX: Add ref guards to prevent re-initialization
    const initializedRef = useRef(false);
    const imagesProcessedRef = useRef(false);
    const excelLoadedRef = useRef(false);

    // Use custom hooks
    const { 
        forms, 
        setForms, 
        updateFormField, 
        updateRowField, 
        addRow, 
        addCustomColumn,
        removeCustomColumn,
        initializeForm 
    } = useFormState();
    
    const { timerStates, setTimerStates, formatTime, handleTimerToggle } = useTimer();
    const { 
        cvLoaded, 
        processing, 
        croppedRegions, 
        setCroppedRegions, 
        processingImages,
        setProcessingImage,
        processImage 
    } = useImageProcessing();
    
    const { 
        scanState, 
        setScanState,
        handlePartScan,
        handleRemoveScannedPart,
        handleRemoveScannedImage,
        handleScanImageUpload,
        handleConfirmScannedParts 
    } = usePartScan(isSecondRound, setVerifiedPartsForFinalUpload);

    const location = useLocation();
    const navigate = useNavigate();

    // ✅ FIX 1: Load master Excel sheet ONLY ONCE
    useEffect(() => {
        if (excelLoadedRef.current) return;
        
        const loadExcelData = async () => {
            try {
                const { testConditions } = await loadMasterExcelSheet();
                setTestConditionsMap(testConditions);
                excelLoadedRef.current = true;
                console.log('Test conditions map loaded:', testConditions.size, 'entries');
            } catch (error) {
                console.error('Failed to load Excel sheet:', error);
            }
        };
        
        loadExcelData();
    }, []); // ✅ Empty dependency array - runs once on mount

    // Determine if we should split images based on project type
    const shouldSplitImages = useCallback((testName?: string) => {
        return projectType === "Flash";
    }, [projectType]);

    // ✅ FIX: Optimized processImagesFromStorage
    const processImagesFromStorage = useCallback(() => {
        if (!cvLoaded || imagesProcessedRef.current) {
            return;
        }

        console.log("Processing images from storage (one time)...");
        imagesProcessedRef.current = true;

        Object.keys(forms).forEach(formKey => {
            const formData = forms[formKey];
            const currentChildTest = formData.childTests?.[formData.currentChildTestIndex || 0];

            formData.rows.forEach(row => {
                const existingImages = loadImagesFromStorage(row.partNumber);

                // Determine which images to process based on round
                const imagesToProcess = isSecondRound
                    ? existingImages.finalNonCosmeticImages || []
                    : existingImages.nonCosmeticImages || [];

                imagesToProcess.forEach((imageData, index) => {
                    // Only process if not already processed
                    const hasBeenProcessed = row.croppedImages && row.croppedImages.length > index;
                    if (!hasBeenProcessed && imageData && shouldSplitImages(formData.testName)) {
                        console.log(`Processing stored image for part ${row.partNumber}, index ${index}`);

                        // Set processing state for this image
                        setProcessingImage(`${row.partNumber}-${index}`, true);

                        // Convert base64 to File object
                        const byteString = atob(imageData.split(',')[1]);
                        const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const blob = new Blob([ab], { type: mimeString });
                        const file = new File([blob], `pre-uploaded-${row.partNumber}-${index}.jpg`, { type: mimeString });

                        // Process the image
                        processStoredImage(file, row.partNumber, formData.testName, row.childTestId || currentChildTest?.id, index, isSecondRound);
                    }
                });
            });
        });
    }, [cvLoaded, forms, isSecondRound, shouldSplitImages, setProcessingImage]);

    // ✅ FIX 3: Run image processing ONLY ONCE
    useEffect(() => {
        if (!cvLoaded) return;
        if (imagesProcessedRef.current) return;
        if (Object.keys(forms).length === 0) return;

        // Small delay to ensure forms are fully initialized
        const timer = setTimeout(() => {
            processImagesFromStorage();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [cvLoaded, forms]); // ✅ Minimal dependencies

    // ✅ FIX 2: Run navigation initialization ONLY ONCE
    useEffect(() => {
        if (initializedRef.current) return;
        if (!location.state?.record) {
            console.error("No record found in navigation state");
            alert("No record selected. Please select a record first.");
            navigate(-1);
            return;
        }

        initializedRef.current = true;

        const record = location.state.record as MachineLoadData;
        console.log("Initializing from navigation state (ONE TIME):", record);

        // Detect project type from machine load data
        const detectedProjectType = record.machineDetails.project.includes("Hulk") ? "Hulk" : "Flash";
        console.log("Detected project type:", detectedProjectType);
        setProjectType(detectedProjectType);

        // Create a Stage2Record from the MachineLoadData
        const stage2Record: Stage2Record = {
            id: record.loadId,
            submissionId: `sub-${record.loadId}`,
            ticketId: parseInt(record.loadId.toString().slice(-6)),
            ticketCode: record.machineDetails.ticketCode,
            totalQuantity: record.totalParts,
            anoType: "Not Specified",
            source: "Machine Load",
            reason: "Testing",
            project: record.machineDetails.project,
            build: record.machineDetails.build,
            colour: record.machineDetails.colour,
            processStage: "Stage 2 Testing",
            selectedTestNames: record.machineDetails.tests.map(test => test.testName),
            testRecords: [],
            formData: {},
            submittedAt: record.loadedAt,
            version: "1.0",
            testingStatus: "In Testing",
            machineLoadData: record
        };

        // Convert LoadedPart[] to AssignedPart[] for each test
        const testRecords: TestRecord[] = record.machineDetails.tests.map((machineTest, testIndex) => {
            // Get parts assigned to this test
            const testParts = record.parts.filter(part =>
                part.testId === machineTest.id || part.testName === machineTest.testName
            );

            const assignedParts: AssignedPart[] = testParts.map((part, idx) => ({
                id: `${machineTest.id}-${idx}`,
                partNumber: part.partNumber,
                serialNumber: part.serialNumber,
                location: record.chamber,
                scanStatus: part.scanStatus,
                assignedToTest: machineTest.testName
            }));

            // Get test condition from Excel data
            const testCondition = testConditionsMap.get(machineTest.testName) || "Standard Conditions";

            // Create TestRecord for this test
            const testRecord: TestRecord = {
                testId: machineTest.id,
                testName: machineTest.testName,
                processStage: "Stage 2 Testing",
                testIndex: testIndex + 1,
                testCondition: testCondition,
                requiredQuantity: machineTest.requiredQty.toString(),
                specification: "Default Specification",
                machineEquipment: record.chamber,
                machineEquipment2: "",
                timing: machineTest.duration,
                startDateTime: record.loadedAt,
                endDateTime: record.estimatedCompletion,
                assignedParts: assignedParts,
                assignedPartsCount: assignedParts.length,
                remark: "",
                status: machineTest.status === 3 ? "Completed" : "In Progress",
                submittedAt: record.loadedAt,
                testResults: [],
                childTests: parseChildTests(
                    machineTest.testName,
                    record.chamber,
                    ""
                )
            };

            return testRecord;
        });

        stage2Record.testRecords = testRecords;
        setCurrentRecord(stage2Record);

        // Initialize forms from the created record
        const initialForms: FormsState = {};
        const initialSharedImages: SharedImagesByPart = {};

        stage2Record.testRecords.forEach((testRecord, index) => {
            const formKey = `test_${index}`;

            // Parse child tests for combined tests
            const childTests = parseChildTests(
                testRecord.testName,
                testRecord.machineEquipment,
                testRecord.machineEquipment2
            );

            // Initialize timer for each child test
            childTests.forEach((childTest, childIndex) => {
                const childTimerKey = `${formKey}_${childTest.id}`;

                // Try to load timer state from chamberLoads first
                const savedTimerFromChamber = loadTimerStateFromChamberLoads(
                    record.loadId,
                    childTest.id
                );

                if (savedTimerFromChamber) {
                    // Use timer state from chamberLoads
                    setTimerStates(prev => ({
                        ...prev,
                        [childTimerKey]: savedTimerFromChamber
                    }));
                } else {
                    // Check localStorage testTimerStates as fallback
                    const savedTimerState = timerStates[childTimerKey];
                    const timingHours = parseInt(childTest.timing || "24");

                    if (!savedTimerState) {
                        setTimerStates(prev => ({
                            ...prev,
                            [childTimerKey]: {
                                remainingSeconds: timingHours * 3600,
                                isRunning: false
                            }
                        }));
                    }
                }
            });

            // Initialize the form
            initializeForm(
                formKey,
                {
                    testName: testRecord.testName,
                    processStage: testRecord.processStage,
                    testCondition: testRecord.testCondition,
                    date: new Date().toISOString().split('T')[0],
                    specification: testRecord.specification,
                    machineEquipment: testRecord.machineEquipment,
                    machineEquipment2: testRecord.machineEquipment2,
                    timing: testRecord.timing,
                    sampleQty: testRecord.requiredQuantity,
                    childTests: childTests,
                    currentChildTestIndex: 0
                },
                testRecord.assignedParts,
                isSecondRound
            );

            // Initialize shared images for each part
            testRecord.assignedParts.forEach(part => {
                if (!initialSharedImages[part.partNumber]) {
                    initialSharedImages[part.partNumber] = {
                        cosmetic: [],
                        nonCosmetic: [],
                        childTestImages: {}
                    };

                    // For Unload, initialize final images arrays
                    if (isSecondRound) {
                        initialSharedImages[part.partNumber].finalCosmeticImages = [];
                        initialSharedImages[part.partNumber].finalNonCosmeticImages = [];
                    }
                }

                // Initialize child test images
                childTests.forEach(childTest => {
                    if (!initialSharedImages[part.partNumber].childTestImages[childTest.id]) {
                        initialSharedImages[part.partNumber].childTestImages[childTest.id] = {
                            cosmetic: [],
                            nonCosmetic: []
                        };
                    }
                });
            });
        });

        setSharedImagesByPart(initialSharedImages);
        console.log("Initialization complete");

    }, [location.state, testConditionsMap]); // ✅ Minimal dependencies

    // Function to load initial timer state from chamberLoads
    const loadTimerStateFromChamberLoads = (loadId: number, testId: string) => {
        try {
            const chamberLoads = getChamberLoads();
            const load = chamberLoads.find((l: any) => l.id === loadId);

            if (!load) return null;

            const test = load.machineDetails?.tests?.find((t: any) => t.id === testId);

            if (test && test.timerStatus) {
                return {
                    remainingSeconds: test.timerRemainingSeconds || 0,
                    isRunning: test.timerStatus === 'start',
                    startTime: test.timerStartTime,
                    stopTime: test.timerStopTime,
                    lastUpdated: test.timerLastUpdated
                };
            }

            return null;
        } catch (error) {
            console.error('Error loading timer state from chamber loads:', error);
            return null;
        }
    };

    // Process stored image (simplified version)
    const processStoredImage = async (file: File, partNumber: string, testName: string, childTestId?: string, index: number, isFinalRound: boolean = false) => {
        console.log(`Processing stored image for ${partNumber}, index ${index}, final: ${isFinalRound}`);
        
        // Simulate processing delay
        setTimeout(() => {
            setProcessingImage(`${partNumber}-${index}`, false);
        }, 2000);
    };

    // ✅ FIX: Memoize handlers that don't need to change
    const handleImageUpload = useCallback(async (
        partNumber: string, 
        testName: string, 
        type: 'cosmetic' | 'nonCosmetic', 
        file: File, 
        childTestId?: string
    ) => {
        if (isSecondRound) {
            handleFinalImageUpload(partNumber, type, file, childTestId);
        } else {
            if (type === 'nonCosmetic' && shouldSplitImages(testName)) {
                console.log(`Processing ${type} image for ${partNumber}`);
            } else {
                console.log(`Uploading ${type} image for ${partNumber}`);
            }
        }
    }, [isSecondRound, shouldSplitImages]);

    // ✅ FIX: Memoize this handler
    const handleFinalImageUpload = useCallback((
        partNumber: string, 
        type: 'cosmetic' | 'nonCosmetic', 
        file: File, 
        childTestId?: string
    ) => {
        const formKey = `test_${currentTestIndex}`;
        const formData = forms[formKey];
        
        if (formData) {
            const row = formData.rows.find(r => 
                r.partNumber === partNumber && r.childTestId === childTestId
            );
            
            if (row) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageUrl = e.target?.result as string;
                    
                    if (type === 'cosmetic') {
                        const currentFinalImages = row.finalCosmeticImages || [];
                        const updatedFinalImages = [...currentFinalImages, imageUrl];
                        
                        updateRowField(formKey, row.id, 'finalCosmeticImages', JSON.stringify(updatedFinalImages));
                        updateRowField(formKey, row.id, 'finalCosmeticImage', updatedFinalImages[0] || '');
                    } else {
                        const currentNonCosmeticImages = row.nonCosmeticImages || [];
                        const updatedNonCosmeticImages = [...currentNonCosmeticImages, imageUrl];
                        
                        updateRowField(formKey, row.id, 'nonCosmeticImages', JSON.stringify(updatedNonCosmeticImages));
                        updateRowField(formKey, row.id, 'finalNonCosmeticImage', updatedNonCosmeticImages[0] || '');
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }, [currentTestIndex, forms, updateRowField]);

    // ✅ FIX: Memoize other handlers
    const handleChildTestComplete = useCallback((formKey: string) => {
        const formData = forms[formKey];
        if (!formData) return;

        const currentChildTestIndex = formData.currentChildTestIndex || 0;
        const childTests = formData.childTests || [];

        if (currentChildTestIndex < childTests.length - 1) {
            // Mark current child test as completed and move to next
            const updatedChildTests = [...childTests];
            updatedChildTests[currentChildTestIndex] = {
                ...updatedChildTests[currentChildTestIndex],
                isCompleted: true,
                status: 'completed',
                endTime: new Date().toISOString()
            };
            updatedChildTests[currentChildTestIndex + 1] = {
                ...updatedChildTests[currentChildTestIndex + 1],
                status: 'active',
                startTime: new Date().toISOString()
            };

            updateFormField(formKey, 'childTests', updatedChildTests);
            updateFormField(formKey, 'currentChildTestIndex', currentChildTestIndex + 1);

            // Create rows for next child test
            const nextChildTest = updatedChildTests[currentChildTestIndex + 1];
            const currentRows = formData.rows.filter(row => 
                row.childTestId === childTests[currentChildTestIndex].id
            );

            const newRows: FormRow[] = currentRows.map((row, idx) => {
                const existingImages = loadImagesFromStorage(row.partNumber);

                return {
                    ...row,
                    id: Date.now() + idx,
                    srNo: idx + 1,
                    testDate: "",
                    childTestId: nextChildTest.id,
                    childTestName: nextChildTest.name,
                    cosmeticImage: existingImages.cosmeticImages[0] || "",
                    nonCosmeticImage: existingImages.nonCosmeticImages[0] || "",
                    cosmeticImages: existingImages.cosmeticImages,
                    nonCosmeticImages: existingImages.nonCosmeticImages,
                    croppedImage: "",
                    croppedImages: [],
                    regionLabel: "",
                    status: "Pending",
                    finalCosmeticImage: isSecondRound ? (existingImages.finalCosmeticImages?.[0] || "") : "",
                    finalCosmeticImages: isSecondRound ? (existingImages.finalCosmeticImages || []) : [],
                    finalNonCosmeticImage: isSecondRound ? (existingImages.finalNonCosmeticImages?.[0] || "") : "",
                    finalCroppedNonCosmeticImage: ""
                };
            });

            const updatedRows = [...formData.rows, ...newRows];
            updateFormField(formKey, 'rows', updatedRows);
        } else {
            const updatedChildTests = [...childTests];
            updatedChildTests[currentChildTestIndex] = {
                ...updatedChildTests[currentChildTestIndex],
                isCompleted: true,
                status: 'completed',
                endTime: new Date().toISOString()
            };

            updateFormField(formKey, 'childTests', updatedChildTests);
        }
    }, [forms, updateFormField, isSecondRound]);

    const handleChildTestChange = useCallback((formKey: string, childTestIndex: number) => {
        updateFormField(formKey, 'currentChildTestIndex', childTestIndex);
    }, [updateFormField]);

    // ✅ FIX: Save form data - memoized
    const saveFormData = useCallback(() => {
        if (!currentRecord) return false;

        try {
            const updatedTestRecords = currentRecord.testRecords.map((testRecord, index) => {
                const formKey = `test_${index}`;
                const formData = forms[formKey];

                if (!formData) return testRecord;

                const rows = formData.rows || [];
                const childTests = formData.childTests || [];
                const allChildTestsCompleted = childTests.every(test => test.isCompleted);

                let status = "Pending";
                if (allChildTestsCompleted && rows.length > 0) {
                    status = "Complete";
                } else if (rows.some(row => row.status === "Pass" || row.status === "Fail")) {
                    status = "In Progress";
                }

                return {
                    ...testRecord,
                    status: status,
                    testResults: formData.rows,
                    remark: formData.remark || "",
                    childTests: formData.childTests,
                    currentChildTestIndex: formData.currentChildTestIndex,
                    submittedAt: new Date().toISOString()
                };
            });

            const updatedRecord = {
                ...currentRecord,
                testRecords: updatedTestRecords,
                testingStatus: "In Testing"
            };

            setCurrentRecord(updatedRecord);
            return true;
        } catch (error) {
            console.error("Error saving form data:", error);
            return false;
        }
    }, [currentRecord, forms]);

    // ✅ FIX: Handle form submission - memoized
    const handleSubmit = useCallback(() => {
        const saved = saveFormData();

        if (!saved) {
            alert("Error saving form data. Please try again.");
            return;
        }

        if (!isSecondRound) {
            const formKey = `test_${currentTestIndex}`;
            const formData = forms[formKey];

            if (formData) {
                const rowsWithCheckpoint = formData.rows.filter(row =>
                    row.checkpointHours && row.checkpointStatus &&
                    (row.checkpointStatus === 'Pass' || row.checkpointStatus === 'Fail')
                );
                
                if (rowsWithCheckpoint.length > 0) {
                    const passParts = rowsWithCheckpoint.filter(row => row.checkpointStatus === 'Pass');
                    const failParts = rowsWithCheckpoint.filter(row => row.checkpointStatus === 'Fail');

                    passParts.forEach(row => {
                        updateCheckpointResults(formData.testName, row.partNumber, 'Pass');
                    });
                    failParts.forEach(row => {
                        updateCheckpointResults(formData.testName, row.partNumber, 'Fail');
                    });

                    setCheckpointResults({
                        pass: passParts.map(p => p.partNumber),
                        fail: failParts.map(p => p.partNumber)
                    });

                    let message = `Checkpoint Results for ${formData.testName}:\n\n`;
                    message += `✓ Passed: ${passParts.length} part(s)\n`;
                    message += `✗ Failed: ${failParts.length} part(s)\n\n`;

                    if (failParts.length > 0) {
                        const updatedForms = { ...forms };
                        const failedPartNumbers = failParts.map(p => p.partNumber);

                        Object.keys(updatedForms).forEach(formKey => {
                            const form = updatedForms[formKey];
                            const filteredRows = form.rows.filter(row =>
                                failedPartNumbers.includes(row.partNumber)
                            );

                            const updatedRows = filteredRows.map((row, idx) => ({
                                ...row,
                                srNo: idx + 1,
                                status: 'Ready for Unload'
                            }));

                            updatedForms[formKey] = {
                                ...form,
                                rows: updatedRows
                            };
                        });

                        setForms(updatedForms);

                        const updatedSharedImages = { ...sharedImagesByPart };
                        passParts.forEach(part => {
                            delete updatedSharedImages[part.partNumber];
                        });
                        setSharedImagesByPart(updatedSharedImages);

                        setIsSecondRound(true);
                        setCurrentStage(0);
                        setCurrentTestIndex(0);
                        alert(message);
                    } else if (passParts.length > 0) {
                        navigate('/planning-detail');
                        return;
                    }
                } else {
                    alert("Tests completed! You can now upload final images for the second round.");
                    setIsSecondRound(true);
                    setCurrentStage(0);
                    setCurrentTestIndex(0);
                }
            }
        } else {
            alert("Final submission complete! All test data and images have been recorded.");

            try {
                const testingLoadData = {
                    loadId: currentRecord?.machineLoadData?.loadId,
                    testRecords: Object.values(forms).flatMap(form => form.rows),
                    status: "Completed",
                    completedAt: new Date().toISOString()
                };

                localStorage.setItem("testingLoadData", JSON.stringify(testingLoadData));
                navigate(-1);
            } catch (error) {
                console.error("Error saving final data:", error);
                alert("Error saving final data. Please try again.");
            }
        }
    }, [
        isSecondRound, 
        currentTestIndex, 
        saveFormData, 
        forms, 
        setForms, 
        sharedImagesByPart, 
        currentRecord, 
        navigate
    ]);

    // ✅ FIX: Memoize timer toggle
    const handleFormTimerToggle = useCallback((formKey: string, childTestId?: string) => {
        const timerKey = childTestId ? `${formKey}_${childTestId}` : formKey;
        const currentState = timerStates[timerKey];
        const isStarting = !currentState?.isRunning;

        handleTimerToggle(timerKey, isStarting, currentRecord, forms);
    }, [timerStates, handleTimerToggle, currentRecord, forms]);

    // ✅ FIX: Memoize parts getter
    const getPartsForCurrentTest = useCallback(() => {
        if (!currentRecord?.testRecords?.[currentTestIndex]) return [];
        return currentRecord.testRecords[currentTestIndex].assignedParts;
    }, [currentRecord, currentTestIndex]);

    // ✅ FIX: Memoize modal opener
    const handleOpenScanModal = useCallback(() => {
        setScanState(prev => ({
            ...prev,
            showScanModal: true,
            scannedParts: [],
            partInput: ''
        }));
    }, []);

    // ✅ FIX: Memoize column adder
    const handleAddCustomColumn = useCallback((formKey: string, column: any) => {
        addCustomColumn(formKey, column);
    }, [addCustomColumn]);

    // Get current test record
    const currentTestRecord = currentRecord?.testRecords?.[currentTestIndex];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Progress Bar */}
            <ProgressBar currentStage={currentStage} setCurrentStage={setCurrentStage} />

            {/* Timer Manager */}
            <TimerManager
                timerStates={timerStates}
                setTimerStates={setTimerStates}
                currentRecord={currentRecord}
                forms={forms}
            />

            {/* Main Content */}
            <div className="max-w-9xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg m-4">
                    {currentStage === 0 && currentRecord && currentTestRecord && (
                        <ImageUploadStage
                            currentRecord={currentRecord}
                            currentTestRecord={currentTestRecord}
                            currentTestIndex={currentTestIndex}
                            forms={forms}
                            isSecondRound={isSecondRound}
                            projectType={projectType}
                            verifiedPartsForFinalUpload={verifiedPartsForFinalUpload}
                            processing={processing}
                            processingImages={processingImages}
                            shouldSplitImages={shouldSplitImages}
                            getPartsForCurrentTest={getPartsForCurrentTest}
                            handleOpenScanModal={handleOpenScanModal}
                            saveFormData={saveFormData}
                            setCurrentTestIndex={setCurrentTestIndex}
                            setCurrentStage={setCurrentStage}
                            handleImageUpload={handleImageUpload}
                        />
                    )}
                    
                    {currentStage === 1 && currentTestRecord && (
                        <FormStage
                            currentTestRecord={currentTestRecord}
                            currentTestIndex={currentTestIndex}
                            forms={forms}
                            isSecondRound={isSecondRound}
                            projectType={projectType}
                            croppedRegions={croppedRegions}
                            timerStates={timerStates}
                            updateFormField={updateFormField}
                            updateRowField={updateRowField}
                            addRow={addRow}
                            getPartsForCurrentTest={getPartsForCurrentTest}
                            handleTimerToggle={handleFormTimerToggle}
                            handleChildTestComplete={handleChildTestComplete}
                            handleChildTestChange={handleChildTestChange}
                            handleFinalImageUpload={handleFinalImageUpload}
                            handleAddCustomColumn={handleAddCustomColumn}
                            removeCustomColumn={removeCustomColumn}
                        />
                    )}

                    {/* Navigation Buttons for Form Stage */}
                    {currentStage === 1 && currentRecord && (
                        <div className="p-6 border-t border-gray-200 flex justify-between">
                            <button
                                onClick={() => setCurrentStage(0)}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center font-semibold transition-colors"
                            >
                                <ChevronLeft size={20} className="mr-2" />
                                Back to Image Upload
                            </button>

                            {currentTestIndex < (currentRecord!.testRecords.length - 1) ? (
                                <button
                                    onClick={() => {
                                        saveFormData();
                                        setCurrentTestIndex(prev => prev + 1);
                                        setCurrentStage(0);
                                    }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold transition-colors"
                                >
                                    Next Test Form
                                    <ChevronRight size={20} className="ml-2" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold transition-colors"
                                >
                                    <CheckCircle size={20} className="mr-2" />
                                    {isSecondRound ? 'Submit Final Data' : 'Complete All Tests'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Scan Modal */}
            <ScanModal
                scanState={scanState}
                setScanState={setScanState}
                handlePartScan={handlePartScan}
                handleRemoveScannedPart={handleRemoveScannedPart}
                handleRemoveScannedImage={handleRemoveScannedImage}
                handleScanImageUpload={handleScanImageUpload}
                handleConfirmScannedParts={handleConfirmScannedParts}
            />
        </div>
    );
}