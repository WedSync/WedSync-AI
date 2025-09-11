// Mobile Field Management Types - Team D Implementation
// WS-215 Field Management System - Shared Types to prevent circular dependencies

// Types
export interface MobileFieldConfig {
  enableOfflineMode: boolean;
  autoSaveInterval: number;
  maxCacheSize: number;
  enableTouchOptimizations: boolean;
  enableVirtualization: boolean;
}

export const DEFAULT_MOBILE_CONFIG: MobileFieldConfig = {
  enableOfflineMode: true,
  autoSaveInterval: 1500, // 1.5 seconds for mobile
  maxCacheSize: 100,
  enableTouchOptimizations: true,
  enableVirtualization: false,
};
