'use client';

/**
 * Branding Sync Component - WS-211 Team C
 * Synchronizes branding across templates ensuring consistency
 * Manages brand assets, themes, and inheritance rules
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { toast } from 'sonner';
import { z } from 'zod';

// Brand Configuration Types
interface BrandConfig {
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

interface BrandOverride {
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

interface BrandTheme {
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
}

interface BrandAsset {
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

interface BrandingSyncState {
  isLoading: boolean;
  currentBrand: BrandConfig | null;
  availableThemes: BrandTheme[];
  brandAssets: BrandAsset[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  validationErrors: Record<string, string>;
  isDirty: boolean;
  lastSync: Date | null;
}

// Validation Schemas
const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');
const urlSchema = z.string().url().optional().or(z.literal(''));
const fontSchema = z.string().min(1, 'Font family is required');

const brandConfigSchema = z.object({
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

// Context Definition
interface BrandingSyncContextValue {
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

interface BrandChange {
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

const BrandingSyncContext = createContext<BrandingSyncContextValue | null>(
  null,
);

export const useBrandingSync = () => {
  const context = useContext(BrandingSyncContext);
  if (!context) {
    throw new Error(
      'useBrandingSync must be used within a BrandingSyncProvider',
    );
  }
  return context;
};

// Provider Component
interface BrandingSyncProviderProps {
  children: React.ReactNode;
  supplierId: string;
  enableRealtime?: boolean;
  autoSync?: boolean;
  validationLevel?: 'strict' | 'moderate' | 'lenient';
}

export function BrandingSyncProvider({
  children,
  supplierId,
  enableRealtime = true,
  autoSync = true,
  validationLevel = 'moderate',
}: BrandingSyncProviderProps) {
  const { user } = useSupabaseUser();
  const supabase = createClient();

  // State Management
  const [state, setState] = useState<BrandingSyncState>({
    isLoading: false,
    currentBrand: null,
    availableThemes: [],
    brandAssets: [],
    syncStatus: 'idle',
    validationErrors: {},
    isDirty: false,
    lastSync: null,
  });

  // Refs for cleanup
  const realtimeChannelRef = useRef<any>(null);
  const changeSubscribersRef = useRef<Set<(change: BrandChange) => void>>(
    new Set(),
  );
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default Brand Configuration
  const defaultBrandConfig: Partial<BrandConfig> = {
    name: 'Default Brand',
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
    css_variables: {},
    template_overrides: {},
  };

  // Validation Function
  const validateBrandConfig = useCallback(
    (config: Partial<BrandConfig>): Record<string, string> => {
      const errors: Record<string, string> = {};

      try {
        brandConfigSchema.parse(config);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            errors[err.path.join('.')] = err.message;
          });
        }
      }

      // Additional business rules based on validation level
      if (validationLevel === 'strict') {
        // Strict validation rules
        if (config.primary_color === config.secondary_color) {
          errors.secondary_color =
            'Secondary color should be different from primary';
        }

        if (config.font_primary === config.font_secondary) {
          errors.font_secondary =
            'Secondary font should be different from primary for better hierarchy';
        }

        // Check color contrast
        const checkContrast = (bg: string, text: string, field: string) => {
          // Simplified contrast check - in production, use proper contrast calculation
          const bgLight = parseInt(bg.slice(1), 16) > 0x888888;
          const textLight = parseInt(text.slice(1), 16) > 0x888888;

          if (bgLight === textLight) {
            errors[field] = 'Insufficient color contrast for accessibility';
          }
        };

        if (config.background_color && config.text_color_primary) {
          checkContrast(
            config.background_color,
            config.text_color_primary,
            'text_color_primary',
          );
        }
      }

      return errors;
    },
    [validationLevel],
  );

  // CSS Variables Generation
  const generateCSSVariables = useCallback(
    (config: BrandConfig): Record<string, string> => {
      const variables: Record<string, string> = {
        // Colors
        '--brand-primary': config.primary_color,
        '--brand-secondary': config.secondary_color,
        '--brand-accent': config.accent_color,
        '--brand-text-primary': config.text_color_primary,
        '--brand-text-secondary': config.text_color_secondary,
        '--brand-background': config.background_color,

        // Typography
        '--brand-font-primary': config.font_primary,
        '--brand-font-secondary': config.font_secondary,
        '--brand-font-size-base': `${config.font_size_base}px`,
        '--brand-font-weight-normal': config.font_weight_normal.toString(),
        '--brand-font-weight-bold': config.font_weight_bold.toString(),
        '--brand-line-height': config.line_height.toString(),

        // Spacing & Layout
        '--brand-border-radius': `${config.border_radius}px`,
        '--brand-spacing-unit': `${config.spacing_unit}px`,
        '--brand-grid-gap': `${config.grid_gap}px`,
        '--brand-section-padding': `${config.section_padding}px`,

        // Calculated values
        '--brand-spacing-xs': `${config.spacing_unit * 0.5}px`,
        '--brand-spacing-sm': `${config.spacing_unit}px`,
        '--brand-spacing-md': `${config.spacing_unit * 2}px`,
        '--brand-spacing-lg': `${config.spacing_unit * 3}px`,
        '--brand-spacing-xl': `${config.spacing_unit * 4}px`,

        // Merge custom CSS variables
        ...config.css_variables,
      };

      return variables;
    },
    [],
  );

  // Brand Configuration Operations
  const loadBrandConfig = useCallback(
    async (configId?: string): Promise<BrandConfig> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        let query = supabase
          .from('brand_configurations')
          .select('*')
          .eq('supplier_id', supplierId);

        if (configId) {
          query = query.eq('id', configId);
        } else {
          query = query.eq('is_default', true);
        }

        const { data, error } = await query.single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No brand config found, create default
            const newConfigId = await createBrandConfig(
              defaultBrandConfig as any,
            );
            return await loadBrandConfig(newConfigId);
          }
          throw error;
        }

        const brandConfig = data as BrandConfig;
        setState((prev) => ({
          ...prev,
          currentBrand: brandConfig,
          isLoading: false,
          lastSync: new Date(),
        }));

        return brandConfig;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to load brand configuration');
        throw error;
      }
    },
    [supabase, supplierId, defaultBrandConfig],
  );

  const saveBrandConfig = useCallback(
    async (config: Partial<BrandConfig>): Promise<void> => {
      if (!state.currentBrand) {
        throw new Error('No current brand configuration to update');
      }

      // Validate configuration
      const errors = validateBrandConfig(config);
      if (Object.keys(errors).length > 0 && validationLevel === 'strict') {
        setState((prev) => ({ ...prev, validationErrors: errors }));
        throw new Error('Brand configuration has validation errors');
      }

      setState((prev) => ({ ...prev, isLoading: true, syncStatus: 'syncing' }));

      try {
        const updatedConfig = {
          ...state.currentBrand,
          ...config,
          css_variables: generateCSSVariables({
            ...state.currentBrand,
            ...config,
          } as BrandConfig),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('brand_configurations')
          .update(updatedConfig)
          .eq('id', state.currentBrand.id)
          .eq('supplier_id', supplierId)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          currentBrand: data as BrandConfig,
          isLoading: false,
          syncStatus: 'success',
          validationErrors: {},
          isDirty: false,
          lastSync: new Date(),
        }));

        // Auto-sync to templates if enabled
        if (autoSync) {
          await syncBrandingAcrossTemplates(state.currentBrand.id);
        }

        toast.success('Brand configuration saved successfully');
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'error',
        }));
        toast.error('Failed to save brand configuration');
        throw error;
      }
    },
    [
      state.currentBrand,
      validateBrandConfig,
      validationLevel,
      generateCSSVariables,
      supabase,
      supplierId,
      autoSync,
    ],
  );

  const createBrandConfig = useCallback(
    async (
      config: Omit<
        BrandConfig,
        'id' | 'supplier_id' | 'created_at' | 'updated_at'
      >,
    ): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const newConfig = {
          ...config,
          supplier_id: supplierId,
          css_variables: generateCSSVariables(config as BrandConfig),
        };

        const { data, error } = await supabase
          .from('brand_configurations')
          .insert(newConfig)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          currentBrand: data as BrandConfig,
          isLoading: false,
          lastSync: new Date(),
        }));

        toast.success('Brand configuration created successfully');
        return data.id;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to create brand configuration');
        throw error;
      }
    },
    [supplierId, generateCSSVariables, supabase],
  );

  const deleteBrandConfig = useCallback(
    async (configId: string): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const { error } = await supabase
          .from('brand_configurations')
          .delete()
          .eq('id', configId)
          .eq('supplier_id', supplierId);

        if (error) throw error;

        if (state.currentBrand?.id === configId) {
          setState((prev) => ({ ...prev, currentBrand: null }));
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastSync: new Date(),
        }));
        toast.success('Brand configuration deleted successfully');
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to delete brand configuration');
        throw error;
      }
    },
    [supabase, supplierId, state.currentBrand],
  );

  // Template Branding Operations
  const applyBrandToTemplate = useCallback(
    async (templateId: string, brandConfigId?: string): Promise<void> => {
      const configId = brandConfigId || state.currentBrand?.id;
      if (!configId) {
        throw new Error('No brand configuration available');
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Apply brand configuration to template
        const response = await fetch('/api/templates/branding/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            templateId,
            brandConfigId: configId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to apply branding: ${response.statusText}`);
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastSync: new Date(),
        }));
        toast.success('Branding applied to template successfully');
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to apply branding to template');
        throw error;
      }
    },
    [state.currentBrand, supplierId],
  );

  const createTemplateOverride = useCallback(
    async (
      templateId: string,
      overrides: BrandOverride['overrides'],
    ): Promise<void> => {
      if (!state.currentBrand) {
        throw new Error('No current brand configuration');
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const override: BrandOverride = {
          template_id: templateId,
          overrides,
          inherit_from_default: true,
          is_active: true,
        };

        const updatedBrand = {
          ...state.currentBrand,
          template_overrides: {
            ...state.currentBrand.template_overrides,
            [templateId]: override,
          },
        };

        await saveBrandConfig(updatedBrand);
        toast.success('Template override created successfully');
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to create template override');
        throw error;
      }
    },
    [state.currentBrand, saveBrandConfig],
  );

  const removeTemplateOverride = useCallback(
    async (templateId: string): Promise<void> => {
      if (!state.currentBrand) {
        throw new Error('No current brand configuration');
      }

      const updatedOverrides = { ...state.currentBrand.template_overrides };
      delete updatedOverrides[templateId];

      await saveBrandConfig({
        template_overrides: updatedOverrides,
      });

      toast.success('Template override removed successfully');
    },
    [state.currentBrand, saveBrandConfig],
  );

  // Theme Management
  const loadAvailableThemes = useCallback(async (): Promise<BrandTheme[]> => {
    try {
      const { data, error } = await supabase
        .from('brand_themes')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const themes = data as BrandTheme[];
      setState((prev) => ({ ...prev, availableThemes: themes }));

      return themes;
    } catch (error) {
      console.error('Failed to load themes:', error);
      return [];
    }
  }, [supabase]);

  const applyTheme = useCallback(
    async (themeId: string): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const { data: theme, error } = await supabase
          .from('brand_themes')
          .select('*')
          .eq('id', themeId)
          .single();

        if (error) throw error;

        const themeConfig = theme as BrandTheme;
        await saveBrandConfig(themeConfig.config);

        // Increment theme usage count
        await supabase
          .from('brand_themes')
          .update({ usage_count: themeConfig.usage_count + 1 })
          .eq('id', themeId);

        toast.success(`${themeConfig.name} theme applied successfully`);
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to apply theme');
        throw error;
      }
    },
    [supabase, saveBrandConfig],
  );

  // Asset Management (simplified - full implementation would include file uploads)
  const uploadAsset = useCallback(
    async (
      file: File,
      type: BrandAsset['type'],
      metadata?: Partial<BrandAsset>,
    ): Promise<BrandAsset> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${supplierId}/${type}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('brand-assets')
          .getPublicUrl(fileName);

        // Save asset metadata
        const assetData = {
          supplier_id: supplierId,
          type,
          name: metadata?.name || file.name,
          url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          tags: metadata?.tags || [],
          is_active: true,
          usage_count: 0,
        };

        const { data: asset, error: dbError } = await supabase
          .from('brand_assets')
          .insert(assetData)
          .select()
          .single();

        if (dbError) throw dbError;

        setState((prev) => ({
          ...prev,
          brandAssets: [...prev.brandAssets, asset as BrandAsset],
          isLoading: false,
          lastSync: new Date(),
        }));

        toast.success('Asset uploaded successfully');
        return asset as BrandAsset;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toast.error('Failed to upload asset');
        throw error;
      }
    },
    [supabase, supplierId],
  );

  const getAssets = useCallback(
    async (type?: BrandAsset['type']): Promise<BrandAsset[]> => {
      try {
        let query = supabase
          .from('brand_assets')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (type) {
          query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) throw error;

        const assets = data as BrandAsset[];
        setState((prev) => ({ ...prev, brandAssets: assets }));

        return assets;
      } catch (error) {
        console.error('Failed to load assets:', error);
        return [];
      }
    },
    [supabase, supplierId],
  );

  const deleteAsset = useCallback(
    async (assetId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('brand_assets')
          .delete()
          .eq('id', assetId)
          .eq('supplier_id', supplierId);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          brandAssets: prev.brandAssets.filter((asset) => asset.id !== assetId),
          lastSync: new Date(),
        }));

        toast.success('Asset deleted successfully');
      } catch (error) {
        toast.error('Failed to delete asset');
        throw error;
      }
    },
    [supabase, supplierId],
  );

  // Bulk Operations
  const syncBrandingAcrossTemplates = useCallback(
    async (configId: string, templateIds?: string[]): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, syncStatus: 'syncing' }));

      try {
        const response = await fetch('/api/templates/branding/bulk-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            brandConfigId: configId,
            templateIds,
          }),
        });

        if (!response.ok) {
          throw new Error(`Bulk sync failed: ${response.statusText}`);
        }

        const result = await response.json();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'success',
          lastSync: new Date(),
        }));

        toast.success(
          `Branding synced across ${result.updatedCount} templates`,
        );
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'error',
        }));
        toast.error('Failed to sync branding across templates');
        throw error;
      }
    },
    [supplierId],
  );

  // Preview Generation
  const previewBrandOnTemplate = useCallback(
    (templateId: string, config: BrandConfig): string => {
      const cssVariables = generateCSSVariables(config);
      const cssString = Object.entries(cssVariables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');

      return `
      .template-preview-${templateId} {
        ${cssString}
      }
      
      .template-preview-${templateId} .header {
        background-color: var(--brand-primary);
        color: var(--brand-background);
        font-family: var(--brand-font-primary);
        padding: var(--brand-section-padding);
        border-radius: var(--brand-border-radius);
      }
      
      .template-preview-${templateId} .content {
        background-color: var(--brand-background);
        color: var(--brand-text-primary);
        font-family: var(--brand-font-secondary);
        gap: var(--brand-grid-gap);
      }
      
      ${config.custom_css || ''}
    `;
    },
    [generateCSSVariables],
  );

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !user) return;

    const channel = supabase
      .channel(`brand_changes_${supplierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brand_configurations',
          filter: `supplier_id=eq.${supplierId}`,
        },
        (payload) => {
          const change: BrandChange = {
            type: 'brand_updated',
            brandConfigId: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
            timestamp: new Date(),
          };

          // Notify subscribers
          changeSubscribersRef.current.forEach((callback) => {
            try {
              callback(change);
            } catch (error) {
              console.error('Error in brand change subscriber:', error);
            }
          });

          // Update current brand if it's the one that changed
          if (state.currentBrand?.id === change.brandConfigId) {
            setState((prev) => ({
              ...prev,
              currentBrand: (payload.new as BrandConfig) || null,
            }));
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [enableRealtime, user, supabase, supplierId, state.currentBrand]);

  // Change Subscription
  const subscribeToChanges = useCallback(
    (callback: (change: BrandChange) => void) => {
      changeSubscribersRef.current.add(callback);

      return () => {
        changeSubscribersRef.current.delete(callback);
      };
    },
    [],
  );

  // Export/Import (simplified)
  const exportBrandConfig = useCallback(
    async (configId: string): Promise<Blob> => {
      const config = await loadBrandConfig(configId);
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        brand_config: config,
      };

      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
    },
    [loadBrandConfig],
  );

  const importBrandConfig = useCallback(
    async (file: File): Promise<string> => {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.brand_config) {
        throw new Error('Invalid brand configuration file');
      }

      const config = importData.brand_config;
      delete config.id;
      delete config.supplier_id;
      delete config.created_at;
      delete config.updated_at;

      config.name = `${config.name} (Imported)`;

      return await createBrandConfig(config);
    },
    [createBrandConfig],
  );

  // Initialize
  useEffect(() => {
    loadBrandConfig();
    loadAvailableThemes();
    getAssets();
  }, []);

  // Context Value
  const contextValue: BrandingSyncContextValue = {
    state,
    loadBrandConfig,
    saveBrandConfig,
    createBrandConfig,
    deleteBrandConfig,
    applyBrandToTemplate,
    createTemplateOverride,
    removeTemplateOverride,
    loadAvailableThemes,
    applyTheme,
    createThemeFromBrand: async () => '', // Simplified
    uploadAsset,
    getAssets,
    deleteAsset,
    validateBrandConfig,
    generateCSSVariables,
    previewBrandOnTemplate,
    syncBrandingAcrossTemplates,
    exportBrandConfig,
    importBrandConfig,
    subscribeToChanges,
  };

  return (
    <BrandingSyncContext.Provider value={contextValue}>
      {children}
    </BrandingSyncContext.Provider>
  );
}

// Status Component
export function BrandingSyncStatus() {
  const { state } = useBrandingSync();

  const getStatusColor = () => {
    if (state.syncStatus === 'error') return 'bg-red-500';
    if (state.syncStatus === 'syncing') return 'bg-yellow-500';
    if (state.isDirty) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (state.syncStatus === 'error') return 'Sync Error';
    if (state.syncStatus === 'syncing') return 'Syncing...';
    if (state.isDirty) return 'Unsaved Changes';
    return 'Synced';
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {state.lastSync && (
        <span className="text-xs text-gray-500">
          {state.lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

export default BrandingSync;
