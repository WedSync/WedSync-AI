/**
 * Template Integration Types - WS-211 Team C
 * Consolidated TypeScript types and interfaces for the template integration layer
 * Provides type safety across TemplateIntegration, BrandingSync, and WidgetOrchestrator
 */

import { z } from 'zod';
import { ComponentType } from 'react';

// =============================================================================
// CORE TEMPLATE TYPES (Extending from dashboardTemplateService)
// =============================================================================

export interface DashboardTemplate {
  id: string;
  supplier_id: string;
  name: string;
  description: string;
  category: 'luxury' | 'standard' | 'budget' | 'destination' | 'venue_specific';
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  target_criteria: Record<string, any>;
  assignment_rules: any[];
  brand_color: string;
  custom_css?: string;
  logo_url?: string;
  background_image_url?: string;
  cache_duration_minutes: number;
  priority_loading: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardSection {
  id: string;
  template_id: string;
  section_type: string;
  title: string;
  description: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  section_config: Record<string, any>;
  conditional_rules?: any;
  mobile_config?: any;
  tablet_config?: any;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// TEMPLATE INTEGRATION TYPES
// =============================================================================

export interface TemplateIntegrationState {
  isLoading: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  pendingOperations: PendingOperation[];
  cache: TemplateCache;
  connectionHealth: 'healthy' | 'degraded' | 'failed';
}

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  templateId?: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface TemplateCache {
  templates: Record<string, DashboardTemplate>;
  sections: Record<string, DashboardSection[]>;
  metadata: Record<string, TemplateCacheMetadata>;
}

export interface TemplateCacheMetadata {
  lastFetched: Date;
  ttl: number; // Time to live in minutes
  size?: number;
  hitCount?: number;
}

export interface TemplateChange {
  type:
    | 'template_created'
    | 'template_updated'
    | 'template_deleted'
    | 'section_updated';
  templateId: string;
  data?: any;
  timestamp: Date;
  source?: 'user' | 'system' | 'realtime';
}

export interface TemplateFilters {
  category?: string;
  isActive?: boolean;
  includeUsageStats?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'created_at' | 'usage_count' | 'last_used_at';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// BRANDING SYNC TYPES
// =============================================================================

export interface BrandConfig {
  id: string;
  supplier_id: string;
  name: string;
  is_default: boolean;

  // Core Brand Elements
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color_primary: string;
  text_color_secondary: string;
  background_color: string;

  // Typography
  font_primary: string;
  font_secondary: string;
  font_size_base: number;
  font_weight_normal: number;
  font_weight_bold: number;
  line_height: number;

  // Brand Assets
  logo_primary_url?: string;
  logo_secondary_url?: string;
  logo_icon_url?: string;
  watermark_url?: string;
  background_image_url?: string;
  favicon_url?: string;

  // Spacing & Layout
  border_radius: number;
  spacing_unit: number;
  grid_gap: number;
  section_padding: number;

  // Advanced Styling
  custom_css?: string;
  css_variables: Record<string, string>;

  // Template Overrides
  template_overrides: Record<string, BrandOverride>;

  created_at: string;
  updated_at: string;
}

export interface BrandOverride {
  template_id: string;
  overrides: {
    colors?: Partial<
      Pick<BrandConfig, 'primary_color' | 'secondary_color' | 'accent_color'>
    >;
    typography?: Partial<
      Pick<BrandConfig, 'font_primary' | 'font_secondary' | 'font_size_base'>
    >;
    assets?: Partial<
      Pick<BrandConfig, 'logo_primary_url' | 'background_image_url'>
    >;
    spacing?: Partial<Pick<BrandConfig, 'border_radius' | 'spacing_unit'>>;
    custom?: Record<string, any>;
  };
  inherit_from_default: boolean;
  is_active: boolean;
}

export interface BrandTheme {
  id: string;
  name: string;
  description: string;
  category:
    | 'wedding'
    | 'corporate'
    | 'luxury'
    | 'rustic'
    | 'modern'
    | 'classic';
  config: Partial<BrandConfig>;
  preview_image_url?: string;
  is_premium: boolean;
  usage_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  supplier_id: string;
  type: 'logo' | 'background' | 'watermark' | 'icon' | 'pattern';
  name: string;
  url: string;
  alt_text?: string;
  dimensions?: { width: number; height: number };
  file_size: number;
  mime_type: string;
  tags: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface BrandingSyncState {
  isLoading: boolean;
  currentBrand: BrandConfig | null;
  availableThemes: BrandTheme[];
  brandAssets: BrandAsset[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  validationErrors: Record<string, string>;
  isDirty: boolean;
  lastSync: Date | null;
}

export interface BrandChange {
  type:
    | 'brand_updated'
    | 'theme_applied'
    | 'asset_uploaded'
    | 'override_created';
  brandConfigId?: string;
  templateId?: string;
  data?: any;
  timestamp: Date;
}

// =============================================================================
// WIDGET ORCHESTRATOR TYPES
// =============================================================================

export interface Widget {
  id: string;
  type: string;
  name: string;
  description: string;
  version: string;

  // Component and Configuration
  component: ComponentType<WidgetProps>;
  defaultProps: Record<string, any>;
  configSchema: z.ZodSchema<any>;

  // Metadata
  category:
    | 'data'
    | 'display'
    | 'input'
    | 'navigation'
    | 'media'
    | 'communication'
    | 'analytics';
  tags: string[];
  requirements: WidgetRequirements;

  // State and Behavior
  stateful: boolean;
  persistent: boolean;
  refreshable: boolean;
  resizable: boolean;

  // Wedding-specific
  weddingStages: ('planning' | 'day_of' | 'post_wedding')[];
  clientTypes: ('couple' | 'vendor' | 'guest' | 'admin')[];

  // Performance
  loadPriority: 'high' | 'normal' | 'low' | 'lazy';
  cacheStrategy: 'memory' | 'storage' | 'network' | 'hybrid';

  // Integration
  apiEndpoints?: string[];
  permissions: string[];
  dependencies: string[];

  created_at: string;
  updated_at: string;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  templateId: string;
  sectionId: string;

  // Position and Layout
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;

  // Configuration
  config: Record<string, any>;
  customProps: Record<string, any>;
  overrides: Record<string, any>;

  // State
  state: WidgetState;
  data: any;
  errors: WidgetError[];

  // Behavior
  isVisible: boolean;
  isInteractive: boolean;
  isLoading: boolean;

  // Lifecycle
  mountedAt?: Date;
  lastUpdated: Date;
  refreshCount: number;

  // Events
  eventHandlers: Record<string, Function>;
  eventHistory: WidgetEvent[];

  created_at: string;
  updated_at: string;
}

export interface WidgetProps {
  instance: WidgetInstance;
  config: Record<string, any>;
  data: any;
  onUpdate: (updates: Partial<WidgetInstance>) => void;
  onEvent: (event: WidgetEvent) => void;
  onError: (error: WidgetError) => void;
  orchestrator: WidgetOrchestratorAPI;
}

export interface WidgetRequirements {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  dataSource?: string[];
  permissions?: string[];
  browsers?: string[];
  responsive?: boolean;
}

export interface WidgetState {
  status: 'initializing' | 'loading' | 'ready' | 'error' | 'disabled';
  progress?: number;
  lastFetch?: Date;
  cacheExpiry?: Date;
  metadata: Record<string, any>;
}

export interface WidgetEvent {
  id: string;
  instanceId: string;
  type:
    | 'mount'
    | 'unmount'
    | 'update'
    | 'refresh'
    | 'interact'
    | 'error'
    | 'custom';
  action: string;
  data?: any;
  timestamp: Date;
  source: 'user' | 'system' | 'api' | 'timer';
}

export interface WidgetError {
  id: string;
  instanceId: string;
  type: 'config' | 'data' | 'render' | 'permission' | 'network' | 'validation';
  message: string;
  stack?: string;
  recoverable: boolean;
  timestamp: Date;
}

export interface WidgetCommunication {
  type: 'broadcast' | 'direct' | 'request' | 'response';
  from: string;
  to?: string | string[];
  action: string;
  payload: any;
  timestamp: Date;
  id: string;
}

export interface WidgetOrchestratorState {
  widgets: Record<string, Widget>;
  instances: Record<string, WidgetInstance>;
  communications: WidgetCommunication[];
  isLoading: boolean;
  errors: WidgetError[];
  performance: {
    loadTimes: Record<string, number>;
    renderTimes: Record<string, number>;
    errorRates: Record<string, number>;
  };
}

export interface WidgetFilters {
  category?: string;
  weddingStage?: string;
  clientType?: string;
  tags?: string[];
  searchTerm?: string;
}

// =============================================================================
// API INTERFACES
// =============================================================================

export interface TemplateIntegrationAPI {
  state: TemplateIntegrationState;

  // Template Operations
  createTemplate: (
    template: Omit<DashboardTemplate, 'id'>,
    sections: DashboardSection[],
  ) => Promise<string>;
  updateTemplate: (
    templateId: string,
    updates: Partial<DashboardTemplate>,
    sections?: DashboardSection[],
  ) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (templateId: string, newName: string) => Promise<string>;

  // Data Fetching with Cache
  getTemplate: (templateId: string) => Promise<{
    template: DashboardTemplate;
    sections: DashboardSection[];
  } | null>;
  getTemplates: (filters?: TemplateFilters) => Promise<DashboardTemplate[]>;
  refreshCache: (templateId?: string) => Promise<void>;

  // Real-time Sync
  syncNow: () => Promise<void>;
  subscribeToChanges: (
    callback: (change: TemplateChange) => void,
  ) => () => void;

  // Offline/Online Management
  queueOperation: (
    operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>,
  ) => void;
  retryPendingOperations: () => Promise<void>;
  clearPendingOperations: () => void;
}

export interface BrandingSyncAPI {
  state: BrandingSyncState;

  // Brand Configuration
  loadBrandConfig: (configId?: string) => Promise<BrandConfig>;
  saveBrandConfig: (config: Partial<BrandConfig>) => Promise<void>;
  createBrandConfig: (
    config: Omit<
      BrandConfig,
      'id' | 'supplier_id' | 'created_at' | 'updated_at'
    >,
  ) => Promise<string>;
  deleteBrandConfig: (configId: string) => Promise<void>;

  // Template Branding
  applyBrandToTemplate: (
    templateId: string,
    brandConfigId?: string,
  ) => Promise<void>;
  createTemplateOverride: (
    templateId: string,
    overrides: BrandOverride['overrides'],
  ) => Promise<void>;
  removeTemplateOverride: (templateId: string) => Promise<void>;

  // Theme Management
  loadAvailableThemes: () => Promise<BrandTheme[]>;
  applyTheme: (themeId: string) => Promise<void>;
  createThemeFromBrand: (
    name: string,
    description: string,
    category: BrandTheme['category'],
  ) => Promise<string>;

  // Asset Management
  uploadAsset: (
    file: File,
    type: BrandAsset['type'],
    metadata?: Partial<BrandAsset>,
  ) => Promise<BrandAsset>;
  getAssets: (type?: BrandAsset['type']) => Promise<BrandAsset[]>;
  deleteAsset: (assetId: string) => Promise<void>;

  // Validation & Preview
  validateBrandConfig: (config: Partial<BrandConfig>) => Record<string, string>;
  generateCSSVariables: (config: BrandConfig) => Record<string, string>;
  previewBrandOnTemplate: (templateId: string, config: BrandConfig) => string;

  // Bulk Operations
  syncBrandingAcrossTemplates: (
    configId: string,
    templateIds?: string[],
  ) => Promise<void>;
  exportBrandConfig: (configId: string) => Promise<Blob>;
  importBrandConfig: (file: File) => Promise<string>;

  // Real-time Updates
  subscribeToChanges: (callback: (change: BrandChange) => void) => () => void;
}

export interface WidgetOrchestratorAPI {
  // Widget Management
  registerWidget: (widget: Omit<Widget, 'created_at' | 'updated_at'>) => void;
  unregisterWidget: (widgetId: string) => void;
  getWidget: (widgetId: string) => Widget | null;
  getWidgets: (filters?: WidgetFilters) => Widget[];

  // Instance Management
  createInstance: (
    widgetId: string,
    templateId: string,
    sectionId: string,
    config?: Record<string, any>,
  ) => Promise<string>;
  updateInstance: (
    instanceId: string,
    updates: Partial<WidgetInstance>,
  ) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  getInstance: (instanceId: string) => WidgetInstance | null;
  getInstances: (templateId?: string, sectionId?: string) => WidgetInstance[];

  // State Management
  getInstanceState: (instanceId: string) => WidgetState | null;
  updateInstanceState: (
    instanceId: string,
    state: Partial<WidgetState>,
  ) => void;
  refreshInstance: (instanceId: string) => Promise<void>;
  refreshAllInstances: (templateId?: string) => Promise<void>;

  // Data Management
  getInstanceData: (instanceId: string) => any;
  updateInstanceData: (instanceId: string, data: any, merge?: boolean) => void;
  clearInstanceData: (instanceId: string) => void;
  syncInstanceData: (instanceId: string) => Promise<void>;

  // Communication
  sendMessage: (message: Omit<WidgetCommunication, 'id' | 'timestamp'>) => void;
  subscribeToMessages: (
    instanceId: string,
    handler: (message: WidgetCommunication) => void,
  ) => () => void;
  broadcastEvent: (event: Omit<WidgetEvent, 'id' | 'timestamp'>) => void;

  // Lifecycle
  mountInstance: (instanceId: string) => Promise<void>;
  unmountInstance: (instanceId: string) => Promise<void>;

  // Error Handling
  reportError: (error: Omit<WidgetError, 'id' | 'timestamp'>) => void;
  getErrors: (instanceId?: string) => WidgetError[];
  clearErrors: (instanceId?: string) => void;

  // Performance
  getPerformanceMetrics: (instanceId?: string) => any;
  trackPerformance: (instanceId: string, metric: string, value: number) => void;

  // Validation
  validateConfiguration: (
    widgetId: string,
    config: any,
  ) => { valid: boolean; errors: string[] };
  validateRequirements: (
    widgetId: string,
    context: any,
  ) => { valid: boolean; errors: string[] };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');
export const urlSchema = z.string().url().optional().or(z.literal(''));
export const fontSchema = z.string().min(1, 'Font family is required');

export const templateCategorySchema = z.enum([
  'luxury',
  'standard',
  'budget',
  'destination',
  'venue_specific',
]);

export const sectionTypeSchema = z.enum([
  'welcome',
  'timeline',
  'budget_tracker',
  'vendor_portfolio',
  'guest_list',
  'task_manager',
  'gallery',
  'documents',
  'contracts',
  'payments',
  'communication',
  'booking_calendar',
  'notes',
  'activity_feed',
  'weather',
  'travel_info',
  'rsvp_manager',
  'seating_chart',
  'menu_planning',
  'music_playlist',
  'ceremony_details',
  'reception_details',
  'vendor_contacts',
  'emergency_contacts',
  'countdown',
  'inspiration_board',
  'checklist',
]);

export const brandConfigSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  primary_color: colorSchema,
  secondary_color: colorSchema,
  accent_color: colorSchema,
  text_color_primary: colorSchema,
  text_color_secondary: colorSchema,
  background_color: colorSchema,
  font_primary: fontSchema,
  font_secondary: fontSchema,
  font_size_base: z.number().min(10).max(24),
  font_weight_normal: z.number().min(100).max(900),
  font_weight_bold: z.number().min(100).max(900),
  line_height: z.number().min(1).max(2),
  border_radius: z.number().min(0).max(50),
  spacing_unit: z.number().min(2).max(16),
  grid_gap: z.number().min(4).max(32),
  section_padding: z.number().min(8).max(64),
  logo_primary_url: urlSchema,
  logo_secondary_url: urlSchema,
  logo_icon_url: urlSchema,
  watermark_url: urlSchema,
  background_image_url: urlSchema,
  favicon_url: urlSchema,
  custom_css: z.string().optional(),
});

export const widgetRequirementsSchema = z.object({
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  aspectRatio: z.number().positive().optional(),
  dataSource: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  browsers: z.array(z.string()).optional(),
  responsive: z.boolean().optional(),
});

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TemplateIntegrationConfig = {
  enableRealtime?: boolean;
  cacheConfig?: {
    defaultTtl: number; // minutes
    maxCacheSize: number; // number of templates
    enablePersistence?: boolean;
  };
};

export type BrandingSyncConfig = {
  enableRealtime?: boolean;
  autoSync?: boolean;
  validationLevel?: 'strict' | 'moderate' | 'lenient';
};

export type WidgetOrchestratorConfig = {
  enableCommunication?: boolean;
  enablePerformanceTracking?: boolean;
  errorBoundary?: boolean;
  maxInstances?: number;
  maxCommunications?: number;
};

// Event Handler Types
export type TemplateChangeHandler = (change: TemplateChange) => void;
export type BrandChangeHandler = (change: BrandChange) => void;
export type WidgetEventHandler = (event: WidgetEvent) => void;
export type WidgetMessageHandler = (message: WidgetCommunication) => void;

// Integration Status Types
export type IntegrationStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type ValidationStatus = 'valid' | 'invalid' | 'warning';

// Performance Types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  errorRate: number;
  cacheHitRate?: number;
  memoryUsage?: number;
}

export interface IntegrationMetrics {
  templates: {
    total: number;
    active: number;
    cached: number;
  };
  brands: {
    total: number;
    active: number;
    synced: number;
  };
  widgets: {
    registered: number;
    instances: number;
    active: number;
    errors: number;
  };
  performance: PerformanceMetrics;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const WIDGET_CATEGORIES = [
  'data',
  'display',
  'input',
  'navigation',
  'media',
  'communication',
  'analytics',
] as const;

export const WEDDING_STAGES = ['planning', 'day_of', 'post_wedding'] as const;

export const CLIENT_TYPES = ['couple', 'vendor', 'guest', 'admin'] as const;

export const BRAND_CATEGORIES = [
  'wedding',
  'corporate',
  'luxury',
  'rustic',
  'modern',
  'classic',
] as const;

export const TEMPLATE_CATEGORIES = [
  'luxury',
  'standard',
  'budget',
  'destination',
  'venue_specific',
] as const;

export const CACHE_STRATEGIES = [
  'memory',
  'storage',
  'network',
  'hybrid',
] as const;

export const LOAD_PRIORITIES = ['high', 'normal', 'low', 'lazy'] as const;

// Default configurations
export const DEFAULT_CACHE_CONFIG = {
  defaultTtl: 5, // 5 minutes
  maxCacheSize: 50,
  enablePersistence: false,
};

export const DEFAULT_BRAND_CONFIG = {
  primary_color: '#7F56D9',
  secondary_color: '#667085',
  accent_color: '#F04438',
  text_color_primary: '#101828',
  text_color_secondary: '#667085',
  background_color: '#FFFFFF',
  font_primary: 'Inter, sans-serif',
  font_secondary: 'Inter, sans-serif',
  font_size_base: 16,
  font_weight_normal: 400,
  font_weight_bold: 600,
  line_height: 1.5,
  border_radius: 8,
  spacing_unit: 4,
  grid_gap: 16,
  section_padding: 24,
};

export const DEFAULT_WIDGET_REQUIREMENTS = {
  minWidth: 200,
  minHeight: 150,
  responsive: true,
};
