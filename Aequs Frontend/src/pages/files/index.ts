// ==================== CENTRAL EXPORT INDEX ====================
// Import and re-export everything for convenient access

// Types
export * from './types';

// Constants
export * from './constants';

// Utilities
export * from './utils';

// Image Processing
export * from './imageProcessing';

// Storage Utilities
export * from './storageUtils';

// Checkpoint Utilities
export * from './checkpointUtils';

// Form Utilities
export * from './formUtils';

// ==================== USAGE EXAMPLES ====================
/*

// Instead of importing from multiple files:
import { FormRow } from './types';
import { PREDEFINED_REGIONS } from './constants';
import { normalizeCheckpointLabel } from './utils';

// You can now import from a single source:
import { 
  FormRow, 
  PREDEFINED_REGIONS, 
  normalizeCheckpointLabel 
} from './index';

// Or organize imports by category:
import type { FormRow, AssignedPart } from './index';
import { PREDEFINED_REGIONS, YELLOW_LABELS } from './index';
import { normalizeCheckpointLabel, getLabelCategory } from './index';

*/
