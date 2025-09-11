'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BrandTheme {
  id?: string;
  supplier_id: string;
  name: string;
  description?: string;

  // Colors
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  text_color: string;
  background_color: string;
  surface_color: string;
  border_color: string;
  success_color?: string;
  warning_color?: string;
  error_color?: string;

  // Typography
  font_family: string;
  heading_font?: string;
  font_size_base: number;
  font_weight_normal: number;
  font_weight_bold: number;
  line_height: number;
  letter_spacing?: number;

  // Logo and Images
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  background_image_url?: string;
  background_pattern?: string;
  watermark_url?: string;

  // Layout
  border_radius: number;
  shadow_level: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing_scale: number;
  container_width: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  // Theme Settings
  theme_mode: 'light' | 'dark' | 'auto';
  color_scheme: 'vibrant' | 'muted' | 'monochrome' | 'pastel' | 'bold';
  contrast_level: 'standard' | 'high' | 'higher';

  // Custom CSS
  custom_css?: string;
  css_variables?: Record<string, string>;

  // Vendor Specific
  vendor_type: string;
  wedding_style: string;
  brand_personality: string[];

  // Metadata
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface BrandThemeState {
  theme: BrandTheme | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

interface BrandThemeActions {
  updateTheme: (updates: Partial<BrandTheme>) => void;
  saveTheme: () => Promise<void>;
  loadTheme: (supplierId: string) => Promise<void>;
  resetTheme: () => void;
  applyPreset: (presetName: string) => void;
  generateCSSVariables: () => Record<string, string>;
  previewTheme: (element?: HTMLElement) => void;
  clearPreview: () => void;
}

type BrandThemeHook = BrandThemeState & BrandThemeActions;

const DEFAULT_THEME: Omit<
  BrandTheme,
  'id' | 'supplier_id' | 'created_at' | 'updated_at'
> = {
  name: 'Default Wedding Theme',
  description: 'A professional, elegant theme for wedding businesses',

  // Colors - Wedding appropriate defaults
  primary_color: '#7F56D9', // Purple - elegant and professional
  secondary_color: '#6941C6',
  accent_color: '#F9F5FF',
  text_color: '#101828',
  background_color: '#FFFFFF',
  surface_color: '#F9FAFB',
  border_color: '#E4E7EC',
  success_color: '#12B76A',
  warning_color: '#F79009',
  error_color: '#F04438',

  // Typography
  font_family: 'Inter',
  heading_font: 'Inter',
  font_size_base: 16,
  font_weight_normal: 400,
  font_weight_bold: 600,
  line_height: 1.5,
  letter_spacing: 0,

  // Layout
  border_radius: 8,
  shadow_level: 'md' as const,
  spacing_scale: 1,
  container_width: 'lg' as const,

  // Theme Settings
  theme_mode: 'light' as const,
  color_scheme: 'vibrant' as const,
  contrast_level: 'standard' as const,

  // Vendor Specific
  vendor_type: '',
  wedding_style: '',
  brand_personality: [],

  // Metadata
  is_active: true,
  is_default: false,
};

const WEDDING_PRESETS = {
  elegant: {
    name: 'Elegant Classic',
    primary_color: '#8B4513',
    secondary_color: '#D4AF37',
    accent_color: '#F5F5DC',
    text_color: '#2C1810',
    background_color: '#FEFEFE',
    surface_color: '#F9F7F4',
    font_family: 'Playfair Display',
    wedding_style: 'traditional',
    brand_personality: ['elegant', 'sophisticated'],
  },
  modern: {
    name: 'Modern Minimal',
    primary_color: '#2563EB',
    secondary_color: '#64748B',
    accent_color: '#F1F5F9',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    surface_color: '#F8FAFC',
    font_family: 'Inter',
    wedding_style: 'modern',
    brand_personality: ['professional', 'creative'],
  },
  romantic: {
    name: 'Romantic Rose',
    primary_color: '#EC4899',
    secondary_color: '#F97316',
    accent_color: '#FEF3C7',
    text_color: '#1C1917',
    background_color: '#FFFBEB',
    surface_color: '#FEF7ED',
    font_family: 'Crimson Text',
    wedding_style: 'romantic',
    brand_personality: ['romantic', 'warm'],
  },
  luxury: {
    name: 'Luxury Gold',
    primary_color: '#7C2D12',
    secondary_color: '#D97706',
    accent_color: '#FEF3C7',
    text_color: '#1C1917',
    background_color: '#FFFBEB',
    surface_color: '#FDF4E6',
    font_family: 'Montserrat',
    wedding_style: 'luxury',
    brand_personality: ['luxury', 'sophisticated'],
  },
};

export function useBrandTheme(supplierId?: string): BrandThemeHook {
  const [state, setState] = useState<BrandThemeState>({
    theme: null,
    loading: false,
    saving: false,
    error: null,
    isDirty: false,
    lastSaved: null,
  });

  const supabase = createClient();
  const previewStyleRef = useRef<HTMLStyleElement | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save draft changes to localStorage
  const saveDraft = useCallback((theme: BrandTheme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'brand-theme-draft',
          JSON.stringify({
            ...theme,
            _draftTimestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.warn('Failed to save draft to localStorage:', error);
      }
    }
  }, []);

  // Load draft from localStorage
  const loadDraft = useCallback((): Partial<BrandTheme> | null => {
    if (typeof window !== 'undefined') {
      try {
        const draft = localStorage.getItem('brand-theme-draft');
        if (draft) {
          const parsed = JSON.parse(draft);
          // Only use draft if it's less than 24 hours old
          if (Date.now() - parsed._draftTimestamp < 24 * 60 * 60 * 1000) {
            return parsed;
          } else {
            localStorage.removeItem('brand-theme-draft');
          }
        }
      } catch (error) {
        console.warn('Failed to load draft from localStorage:', error);
      }
    }
    return null;
  }, []);

  const updateTheme = useCallback(
    (updates: Partial<BrandTheme>) => {
      setState((prev) => {
        if (!prev.theme) return prev;

        const updatedTheme = {
          ...prev.theme,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        // Auto-save draft
        saveDraft(updatedTheme);

        // Clear previous autosave timeout
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
        }

        // Set new autosave timeout (5 seconds)
        autosaveTimeoutRef.current = setTimeout(() => {
          if (prev.isDirty) {
            console.log('Auto-saving theme changes...');
            saveTheme();
          }
        }, 5000);

        return {
          ...prev,
          theme: updatedTheme,
          isDirty: true,
          error: null,
        };
      });
    },
    [saveDraft],
  );

  const saveTheme = useCallback(async () => {
    const currentTheme = state.theme;
    if (!currentTheme || state.saving) return;

    setState((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('branding_themes')
        .upsert({
          ...currentTheme,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        theme: data,
        saving: false,
        isDirty: false,
        lastSaved: new Date(),
        error: null,
      }));

      // Clear draft after successful save
      if (typeof window !== 'undefined') {
        localStorage.removeItem('brand-theme-draft');
      }

      return data;
    } catch (error) {
      console.error('Failed to save theme:', error);
      setState((prev) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save theme',
      }));
      throw error;
    }
  }, [state.theme, state.saving, supabase]);

  const loadTheme = useCallback(
    async (supplierIdParam: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
          .from('branding_themes')
          .select('*')
          .eq('supplier_id', supplierIdParam)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Not found error
          throw error;
        }

        let theme: BrandTheme;

        if (data) {
          theme = data;
        } else {
          // No existing theme, create default
          theme = {
            ...DEFAULT_THEME,
            supplier_id: supplierIdParam,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        // Check for draft changes
        const draft = loadDraft();
        if (draft && draft.supplier_id === supplierIdParam) {
          theme = { ...theme, ...draft };
          setState((prev) => ({ ...prev, isDirty: true }));
        }

        setState((prev) => ({
          ...prev,
          theme,
          loading: false,
          error: null,
        }));
      } catch (error) {
        console.error('Failed to load theme:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error.message : 'Failed to load theme',
        }));
      }
    },
    [supabase, loadDraft],
  );

  const resetTheme = useCallback(() => {
    if (!state.theme) return;

    const resetTheme = {
      ...DEFAULT_THEME,
      supplier_id: state.theme.supplier_id,
      id: state.theme.id,
      created_at: state.theme.created_at,
      updated_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      theme: resetTheme,
      isDirty: true,
    }));
  }, [state.theme]);

  const applyPreset = useCallback(
    (presetName: string) => {
      const preset =
        WEDDING_PRESETS[presetName as keyof typeof WEDDING_PRESETS];
      if (!preset || !state.theme) return;

      updateTheme(preset);
    },
    [state.theme, updateTheme],
  );

  const generateCSSVariables = useCallback((): Record<string, string> => {
    if (!state.theme) return {};

    return {
      '--color-primary': state.theme.primary_color,
      '--color-secondary':
        state.theme.secondary_color || state.theme.primary_color,
      '--color-accent': state.theme.accent_color || '#F3F4F6',
      '--color-text': state.theme.text_color,
      '--color-background': state.theme.background_color,
      '--color-surface': state.theme.surface_color,
      '--color-border': state.theme.border_color,
      '--color-success': state.theme.success_color || '#10B981',
      '--color-warning': state.theme.warning_color || '#F59E0B',
      '--color-error': state.theme.error_color || '#EF4444',
      '--font-family': state.theme.font_family,
      '--font-heading': state.theme.heading_font || state.theme.font_family,
      '--font-size-base': `${state.theme.font_size_base}px`,
      '--font-weight-normal': state.theme.font_weight_normal.toString(),
      '--font-weight-bold': state.theme.font_weight_bold.toString(),
      '--line-height': state.theme.line_height.toString(),
      '--border-radius': `${state.theme.border_radius}px`,
      '--spacing-scale': state.theme.spacing_scale.toString(),
      '--letter-spacing': `${state.theme.letter_spacing || 0}px`,
      ...state.theme.css_variables,
    };
  }, [state.theme]);

  const previewTheme = useCallback(
    (targetElement?: HTMLElement) => {
      if (!state.theme) return;

      const element = targetElement || document.documentElement;
      const cssVariables = generateCSSVariables();

      // Remove existing preview style
      if (previewStyleRef.current) {
        previewStyleRef.current.remove();
      }

      // Create preview CSS
      const css = `
      :root {
        ${Object.entries(cssVariables)
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n        ')}
      }
      
      ${state.theme.custom_css || ''}
    `;

      // Apply preview style
      const styleElement = document.createElement('style');
      styleElement.textContent = css;
      styleElement.dataset.brandThemePreview = 'true';
      document.head.appendChild(styleElement);
      previewStyleRef.current = styleElement;

      // Apply background pattern if specified
      if (
        state.theme.background_pattern &&
        state.theme.background_pattern !== 'none'
      ) {
        element.style.setProperty(
          '--bg-pattern',
          state.theme.background_pattern,
        );
      }
    },
    [state.theme, generateCSSVariables],
  );

  const clearPreview = useCallback(() => {
    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
      previewStyleRef.current = null;
    }

    // Remove any pattern styles
    document.documentElement.style.removeProperty('--bg-pattern');
  }, []);

  // Auto-load theme when supplier ID changes
  useEffect(() => {
    if (supplierId && !state.loading && !state.theme) {
      loadTheme(supplierId);
    }
  }, [supplierId, loadTheme, state.loading, state.theme]);

  // Auto-apply preview when theme changes
  useEffect(() => {
    if (state.theme && state.isDirty) {
      previewTheme();
    }
  }, [state.theme, state.isDirty, previewTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreview();
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [clearPreview]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty && !state.saving) {
        const message =
          'You have unsaved branding changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty, state.saving]);

  return {
    ...state,
    updateTheme,
    saveTheme,
    loadTheme,
    resetTheme,
    applyPreset,
    generateCSSVariables,
    previewTheme,
    clearPreview,
  };
}
