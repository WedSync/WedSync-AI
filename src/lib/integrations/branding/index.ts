/**
 * WS-221: Branding Customization - Integration Module Exports
 * Team C - Complete branding customization system
 */

// Core branding system
export { BrandSync, type BrandTheme, type BrandSyncOptions } from './BrandSync';

// Asset management
export {
  BrandAssetManager,
  type BrandAsset,
  type AssetOptimizationOptions,
} from './BrandAssetManager';

// Validation system
export {
  BrandValidator,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type BrandConsistencyRules,
} from './BrandValidator';

// Monitoring system
export {
  BrandMonitor,
  type BrandHealthStatus,
  type BrandHealthIssue,
  type BrandHealthMetrics,
  type MonitoringConfig,
} from './BrandMonitor';

// React context and hooks
export {
  BrandPreviewProvider,
  useBrandPreview,
  useThemeProperty,
  useThemeValidation,
  useLiveCSSProperties,
  type BrandPreviewState,
  type BrandPreviewActions,
  type BrandPreviewContextValue,
  type BrandPreviewProviderProps,
} from './BrandPreviewContext';

// Utility functions
export const createBrandingSystem = (
  supabaseUrl: string,
  supabaseKey: string,
  organizationId: string,
) => {
  const brandSync = new BrandSync(supabaseUrl, supabaseKey, {
    enableRealTimeSync: true,
    cacheTimeout: 300000,
    autoApplyChanges: true,
  });

  return {
    brandSync,
    initialize: () => brandSync.initialize(organizationId),
    cleanup: () => brandSync.cleanup(),
  };
};

// Constants
export const BRAND_SYSTEM_VERSION = '1.0.0';
export const SUPPORTED_ASSET_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];
export const DEFAULT_THEME_COLORS = {
  primary: '#3B82F6',
  secondary: '#64748B',
  accent: '#F59E0B',
  background: '#FFFFFF',
  text: '#1F2937',
};

export const ACCESSIBILITY_STANDARDS = {
  MIN_CONTRAST_RATIO: 4.5,
  RECOMMENDED_CONTRAST_RATIO: 7.0,
  MIN_FONT_SIZE: 16,
  MAX_ASSET_SIZE: 5 * 1024 * 1024, // 5MB
};
