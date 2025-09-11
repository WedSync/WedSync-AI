// Mobile Field Management Components - Team D Implementation
// WS-215 Field Management System - Mobile Optimized

export { MobileFieldManager } from './MobileFieldManager';
export { MobileFieldEditor } from './MobileFieldEditor';
export {
  MobileFieldStatusIndicator,
  MobileFieldCompletionBadge,
  MobileFieldSyncStatus,
} from './MobileFieldStatusIndicator';
export { MobileFieldSyncTracker } from './MobileFieldSyncTracker';
export {
  MobileFieldValidator,
  MobileFieldValidationUtils,
  type ValidationError,
} from './MobileFieldValidator';

// Performance optimizations for mobile
export { MobileFieldPerformanceProvider } from './MobileFieldPerformanceProvider';

// Types (re-exported from types.ts to avoid circular dependencies)
export { MobileFieldConfig, DEFAULT_MOBILE_CONFIG } from './types';
