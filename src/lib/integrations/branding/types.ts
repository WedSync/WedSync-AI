/**
 * Branding System - Shared Type Definitions
 *
 * Shared type definitions to prevent circular dependencies in the branding
 * system. All branding services should use these types to ensure compatibility
 * and avoid circular imports.
 */

// Core branding interfaces
export interface BrandTheme {
  id: string;
  organizationId: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily: string;
  borderRadius: number;
  customCSS?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandSyncOptions {
  enableRealTimeSync: boolean;
  cacheTimeout: number;
  autoApplyChanges: boolean;
  fallbackTheme?: Partial<BrandTheme>;
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 accessibility/consistency score
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  code: string;
}

export interface BrandConsistencyRules {
  minContrastRatio: number;
  maxColors: number;
  allowedFontSizes: number[];
  requiredFields: string[];
  customCSSMaxLength: number;
  allowedFileFormats: string[];
  maxAssetSize: number; // in bytes
}

// Service interfaces for dependency injection
export interface BrandValidatorInterface {
  validateTheme(theme: BrandTheme): Promise<ValidationResult>;
  validateThemeData(themeData: Partial<BrandTheme>): Promise<ValidationResult>;
}

export interface BrandSyncInterface {
  initialize(organizationId: string): Promise<void>;
  loadBrandTheme(organizationId: string): Promise<BrandTheme | null>;
  applyBrandTheme(theme: BrandTheme): Promise<void>;
  saveBrandTheme(theme: Partial<BrandTheme>): Promise<BrandTheme | null>;
  getCurrentTheme(): BrandTheme | null;
  onThemeChange(listener: (theme: BrandTheme) => void): void;
  offThemeChange(listener: (theme: BrandTheme) => void): void;
  cleanup(): Promise<void>;
}

export interface BrandAssetManagerInterface {
  preloadAsset(url: string): Promise<void>;
}

export interface BrandMonitorInterface {
  startHealthCheck(organizationId: string): Promise<void>;
  stopHealthCheck(): Promise<void>;
}

// Service dependency injection interface
export interface BrandingServices {
  validator?: BrandValidatorInterface;
  assetManager?: BrandAssetManagerInterface;
  monitor?: BrandMonitorInterface;
}
