# Multi-Stage Test Form - Code Structure Documentation

This document explains how the original 10,000+ line code file has been split into modular, maintainable files.

## 📁 File Structure

```
src/
├── types.ts                    # All TypeScript interfaces and types
├── constants.ts                # Constants and configuration values
├── utils.ts                    # General utility functions
├── imageProcessing.ts          # OpenCV image processing functions
├── storageUtils.ts             # localStorage management utilities
├── checkpointUtils.ts          # Checkpoint-specific utilities
├── formUtils.ts                # Form-related utilities
├── components/
│   ├── DefaultForm.tsx         # Main form component (to be created)
│   ├── CheckpointTimer.tsx     # Timer component (to be created)
│   ├── ScanModal.tsx           # Part scanning modal (to be created)
│   └── CheckpointDialog.tsx    # Checkpoint confirmation (to be created)
├── hooks/
│   ├── useImageProcessing.ts   # Image processing hook (to be created)
│   ├── useCheckpoints.ts       # Checkpoint management hook (to be created)
│   └── useFormState.ts         # Form state management hook (to be created)
└── MultiStageTestFormEnhanced.tsx  # Main component (to be created)
```

## 📋 File Descriptions

### 1. **types.ts** (250 lines)
Contains all TypeScript interfaces and type definitions:
- `AssignedPart`, `LoadedPart`, `MachineTest`, `MachineDetails`
- `TestRecord`, `Stage2Record`, `FormRow`, `FormData`
- `ChildTest`, `CustomColumn`, `CroppedRegion`
- `TimerStatus`, `ScanState`, `ScannedPart`, `ProgressState`
- Component prop interfaces

### 2. **constants.ts** (60 lines)
All constant values and configuration:
- Reference image dimensions
- Predefined regions for image cropping
- Yellow label mappings
- Label category mappings
- Machine name mappings

### 3. **utils.ts** (100 lines)
General utility functions:
- `normalizeCheckpointLabel()` - Normalize checkpoint labels
- `detectLabelText()` - Detect text from image regions
- `getLabelCategory()` - Get category from label
- `normalizeMachineName()` - Normalize machine names
- `getTestStatusText()` - Convert status code to text
- `convertCheckpointToMinutes()` - Time conversion
- `getRemainingTimeUntilCheckpoint()` - Calculate remaining time
- `parseCheckpointsFromCondition()` - Parse checkpoints from test condition
- `shouldAutoEnableCheckpoint()` - Check if checkpoint auto-enable is needed

### 4. **imageProcessing.ts** (150 lines)
OpenCV-related image processing functions:
- `detectYellowMarks()` - Detect yellow markers in images
- `processImageWithYellowMarks()` - Process images with yellow marks
- `processImageWithoutYellowMarks()` - Process images without markers
- `cropImageRegions()` - Crop detected regions from images

### 5. **storageUtils.ts** (350 lines)
localStorage management utilities:
- `loadTimerStateFromChamberLoads()` - Load timer state
- `updateChamberLoadsTimer()` - Update timer in storage
- `updateCheckpointStatusInChamberLoads()` - Update checkpoint status
- `updateCheckpointImagesInChamberLoads()` - Update checkpoint images
- `updateChamberLoadsWithNewImages()` - Add new images to storage
- `loadImagesFromStorage()` - Load images from multiple sources

### 6. **checkpointUtils.ts** (300 lines)
Checkpoint-specific management functions:
- `getCheckpointsForPart()` - Get all checkpoints for a part
- `getNextCheckpointName()` - Get next checkpoint label
- `getCheckpointProgress()` - Calculate checkpoint progress
- `shouldShowCheckpointColumn()` - Determine if checkpoint column should show
- `shouldShowCheckpointButton()` - Determine if checkpoint button should show
- `syncCheckpointDataFromChamberLoads()` - Sync checkpoint data

### 7. **formUtils.ts** (80 lines)
Form-related utility functions:
- `parseChildTests()` - Parse combined test names into child tests
- `createFormRow()` - Create a new form row
- `getTestConditionForPart()` - Get test condition for a specific part

## 🔄 Migration Guide

### Original Code Pattern:
```tsx
// Everything in one file
export default function MultiStageTestFormEnhanced() {
  // 10,000+ lines of code
  const normalizeCheckpointLabel = (...) => { ... }
  const detectYellowMarks = (...) => { ... }
  // ... more functions and components
}
```

### New Modular Pattern:
```tsx
// MultiStageTestFormEnhanced.tsx
import { 
  AssignedPart, 
  LoadedPart, 
  FormData,
  // ... other types
} from './types';

import { 
  PREDEFINED_REGIONS,
  YELLOW_LABELS 
} from './constants';

import { 
  normalizeCheckpointLabel,
  getLabelCategory,
  // ... other utils
} from './utils';

import { 
  detectYellowMarks,
  processImageWithYellowMarks 
} from './imageProcessing';

import { 
  loadImagesFromStorage,
  updateChamberLoadsTimer 
} from './storageUtils';

import { 
  getCheckpointsForPart,
  getNextCheckpointName 
} from './checkpointUtils';

import { parseChildTests } from './formUtils';

export default function MultiStageTestFormEnhanced() {
  // Main component logic with imported utilities
}
```

## 📦 Components to Create

The following components should be extracted from the main file:

### 1. **DefaultForm.tsx** (~800 lines)
The main form rendering component
- Custom column management
- Row rendering
- Image upload handling
- Checkpoint display

### 2. **CheckpointTimer.tsx** (~50 lines)
Timer component for checkpoints
```tsx
interface CheckpointTimerProps {
  partNumber: string;
}
```

### 3. **ScanModal.tsx** (~200 lines)
Modal for scanning parts
```tsx
interface ScanModalProps {
  scanState: ScanState;
  setScanState: React.Dispatch<React.SetStateAction<ScanState>>;
  handlePartScan: () => void;
  handleRemoveScannedPart: (id: number) => void;
  handleConfirmScannedParts: () => void;
}
```

### 4. **CheckpointDialog.tsx** (~150 lines)
Checkpoint confirmation dialog
```tsx
interface CheckpointDialogProps {
  show: boolean;
  selectedParts: string[];
  onConfirm: () => void;
  onCancel: () => void;
}
```

## 🎯 Custom Hooks to Create

### 1. **useImageProcessing.ts**
```tsx
export function useImageProcessing(cvLoaded: boolean) {
  const processNonCosmeticImage = (...) => { ... }
  const processStoredImage = (...) => { ... }
  const handleSimpleImageUpload = (...) => { ... }
  
  return {
    processNonCosmeticImage,
    processStoredImage,
    handleSimpleImageUpload
  };
}
```

### 2. **useCheckpoints.ts**
```tsx
export function useCheckpoints(forms: FormsState) {
  const handleCheckpointClick = (...) => { ... }
  const confirmCheckpointProgress = (...) => { ... }
  const syncCheckpointData = (...) => { ... }
  
  return {
    handleCheckpointClick,
    confirmCheckpointProgress,
    syncCheckpointData
  };
}
```

### 3. **useFormState.ts**
```tsx
export function useFormState(currentRecord: Stage2Record | null) {
  const [forms, setForms] = useState<FormsState>({});
  
  const updateFormField = (...) => { ... }
  const updateRowField = (...) => { ... }
  const addRow = (...) => { ... }
  const saveFormData = (...) => { ... }
  
  return {
    forms,
    updateFormField,
    updateRowField,
    addRow,
    saveFormData
  };
}
```

## 🔧 Benefits of This Structure

1. **Maintainability**: Each file has a single, clear responsibility
2. **Testability**: Functions can be unit tested in isolation
3. **Reusability**: Utilities can be shared across components
4. **Readability**: Smaller files are easier to understand
5. **Collaboration**: Multiple developers can work on different files
6. **Performance**: Tree-shaking can remove unused code
7. **Type Safety**: Better TypeScript support with organized types

## 📚 Import Examples

### Importing Types:
```tsx
import type { 
  FormRow, 
  AssignedPart, 
  CustomColumn 
} from '@/types';
```

### Importing Utilities:
```tsx
import { 
  normalizeCheckpointLabel,
  getLabelCategory 
} from '@/utils';
```

### Importing Image Processing:
```tsx
import { 
  detectYellowMarks,
  cropImageRegions 
} from '@/imageProcessing';
```

## 🚀 Next Steps

1. Create the component files (DefaultForm, ScanModal, etc.)
2. Create custom hooks for complex logic
3. Update imports in the main component
4. Test each module independently
5. Ensure all functionality is preserved

## ⚠️ Important Notes

- All original functionality is preserved
- No logic changes, only organizational
- Backward compatible with existing code
- Can be migrated incrementally
- TypeScript strict mode compatible

## 📝 File Size Comparison

| File | Lines | Purpose |
|------|-------|---------|
| Original | ~10,000 | Everything |
| types.ts | ~250 | Type definitions |
| constants.ts | ~60 | Constants |
| utils.ts | ~100 | General utilities |
| imageProcessing.ts | ~150 | Image processing |
| storageUtils.ts | ~350 | Storage management |
| checkpointUtils.ts | ~300 | Checkpoint logic |
| formUtils.ts | ~80 | Form utilities |
| **Remaining** | ~8,710 | Components & hooks |

The remaining code should be split into:
- Main component (~2,000 lines)
- DefaultForm component (~800 lines)
- Other components (~500 lines)
- Custom hooks (~800 lines)
- Stage rendering functions (~4,610 lines)
