/**
 * WS-221: Branding Customization - Brand Preview Integration
 * Team C - Brand preview integration with client portals
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { BrandSync, BrandTheme, BrandSyncOptions } from './BrandSync';
import { BrandValidator, ValidationResult } from './BrandValidator';

export interface BrandPreviewState {
  currentTheme: BrandTheme | null;
  previewTheme: BrandTheme | null;
  isPreviewMode: boolean;
  isLoading: boolean;
  validationResult: ValidationResult | null;
  error: string | null;
}

export interface BrandPreviewActions {
  applyTheme: (theme: BrandTheme) => Promise<void>;
  previewTheme: (theme: Partial<BrandTheme>) => Promise<void>;
  resetPreview: () => void;
  saveCurrentTheme: () => Promise<BrandTheme | null>;
  validateTheme: (theme: Partial<BrandTheme>) => Promise<ValidationResult>;
  loadOrganizationTheme: (organizationId: string) => Promise<void>;
  updateThemeProperty: (property: keyof BrandTheme, value: any) => void;
}

export interface BrandPreviewContextValue
  extends BrandPreviewState,
    BrandPreviewActions {}

const BrandPreviewContext = createContext<BrandPreviewContextValue | null>(
  null,
);

export interface BrandPreviewProviderProps {
  children: React.ReactNode;
  organizationId: string;
  supabaseUrl: string;
  supabaseKey: string;
  syncOptions?: BrandSyncOptions;
}

export function BrandPreviewProvider({
  children,
  organizationId,
  supabaseUrl,
  supabaseKey,
  syncOptions = {
    enableRealTimeSync: true,
    cacheTimeout: 300000, // 5 minutes
    autoApplyChanges: false,
    fallbackTheme: {
      primaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter, sans-serif',
    },
  },
}: BrandPreviewProviderProps) {
  const [state, setState] = useState<BrandPreviewState>({
    currentTheme: null,
    previewTheme: null,
    isPreviewMode: false,
    isLoading: false,
    validationResult: null,
    error: null,
  });

  const [brandSync] = useState(
    () => new BrandSync(supabaseUrl, supabaseKey, syncOptions),
  );
  const [validator] = useState(() => new BrandValidator());

  // Initialize brand sync
  useEffect(() => {
    const initializeBrandSync = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await brandSync.initialize(organizationId);
        const theme = brandSync.getCurrentTheme();

        setState((prev) => ({
          ...prev,
          currentTheme: theme,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[BrandPreview] Initialization failed:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Initialization failed',
          isLoading: false,
        }));
      }
    };

    initializeBrandSync();

    // Setup theme change listener
    const handleThemeChange = (theme: BrandTheme) => {
      setState((prev) => ({
        ...prev,
        currentTheme: theme,
        previewTheme: prev.isPreviewMode ? prev.previewTheme : null,
      }));
    };

    brandSync.onThemeChange(handleThemeChange);

    return () => {
      brandSync.offThemeChange(handleThemeChange);
      brandSync.cleanup();
    };
  }, [organizationId, brandSync]);

  // Apply theme
  const applyTheme = useCallback(
    async (theme: BrandTheme) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await brandSync.applyBrandTheme(theme);
        setState((prev) => ({
          ...prev,
          currentTheme: theme,
          isPreviewMode: false,
          previewTheme: null,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[BrandPreview] Failed to apply theme:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to apply theme',
          isLoading: false,
        }));
      }
    },
    [brandSync],
  );

  // Preview theme without saving
  const previewTheme = useCallback(
    async (themeData: Partial<BrandTheme>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create preview theme by merging with current theme
        const baseTheme = state.currentTheme || {
          id: 'preview',
          organizationId,
          name: 'Preview Theme',
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B',
          accentColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const previewTheme: BrandTheme = {
          ...baseTheme,
          ...themeData,
          id: 'preview',
        };

        // Validate the preview theme
        const validation = await validator.validateTheme(previewTheme);

        // Apply preview theme to DOM
        await brandSync.applyBrandTheme(previewTheme);

        setState((prev) => ({
          ...prev,
          previewTheme,
          isPreviewMode: true,
          validationResult: validation,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[BrandPreview] Failed to preview theme:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to preview theme',
          isLoading: false,
        }));
      }
    },
    [state.currentTheme, organizationId, brandSync, validator],
  );

  // Reset preview mode
  const resetPreview = useCallback(() => {
    if (state.currentTheme && state.isPreviewMode) {
      brandSync.applyBrandTheme(state.currentTheme);
    }

    setState((prev) => ({
      ...prev,
      previewTheme: null,
      isPreviewMode: false,
      validationResult: null,
      error: null,
    }));
  }, [state.currentTheme, state.isPreviewMode, brandSync]);

  // Save current theme
  const saveCurrentTheme = useCallback(async (): Promise<BrandTheme | null> => {
    const themeToSave = state.previewTheme || state.currentTheme;
    if (!themeToSave) return null;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const savedTheme = await brandSync.saveBrandTheme(themeToSave);

      if (savedTheme) {
        setState((prev) => ({
          ...prev,
          currentTheme: savedTheme,
          previewTheme: null,
          isPreviewMode: false,
          isLoading: false,
        }));
      }

      return savedTheme;
    } catch (error) {
      console.error('[BrandPreview] Failed to save theme:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save theme',
        isLoading: false,
      }));
      return null;
    }
  }, [state.previewTheme, state.currentTheme, brandSync]);

  // Validate theme
  const validateTheme = useCallback(
    async (themeData: Partial<BrandTheme>): Promise<ValidationResult> => {
      try {
        const validation = await validator.validateThemeData(themeData);
        setState((prev) => ({ ...prev, validationResult: validation }));
        return validation;
      } catch (error) {
        console.error('[BrandPreview] Theme validation failed:', error);
        const errorResult: ValidationResult = {
          isValid: false,
          errors: [
            {
              field: 'validation',
              message:
                error instanceof Error ? error.message : 'Validation failed',
              severity: 'error',
              code: 'VALIDATION_ERROR',
            },
          ],
          warnings: [],
          score: 0,
        };
        setState((prev) => ({ ...prev, validationResult: errorResult }));
        return errorResult;
      }
    },
    [validator],
  );

  // Load organization theme
  const loadOrganizationTheme = useCallback(
    async (orgId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const theme = await brandSync.loadBrandTheme(orgId);

        if (theme) {
          await brandSync.applyBrandTheme(theme);
          setState((prev) => ({
            ...prev,
            currentTheme: theme,
            previewTheme: null,
            isPreviewMode: false,
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: 'No theme found for organization',
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error(
          '[BrandPreview] Failed to load organization theme:',
          error,
        );
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to load theme',
          isLoading: false,
        }));
      }
    },
    [brandSync],
  );

  // Update theme property (for live editing)
  const updateThemeProperty = useCallback(
    (property: keyof BrandTheme, value: any) => {
      if (state.isPreviewMode && state.previewTheme) {
        const updatedTheme = { ...state.previewTheme, [property]: value };
        previewTheme(updatedTheme);
      } else if (state.currentTheme) {
        const updatedTheme = { ...state.currentTheme, [property]: value };
        previewTheme(updatedTheme);
      }
    },
    [state.isPreviewMode, state.previewTheme, state.currentTheme, previewTheme],
  );

  const contextValue: BrandPreviewContextValue = {
    ...state,
    applyTheme,
    previewTheme,
    resetPreview,
    saveCurrentTheme,
    validateTheme,
    loadOrganizationTheme,
    updateThemeProperty,
  };

  return (
    <BrandPreviewContext.Provider value={contextValue}>
      {children}
    </BrandPreviewContext.Provider>
  );
}

// Hook to use brand preview context
export function useBrandPreview(): BrandPreviewContextValue {
  const context = useContext(BrandPreviewContext);

  if (!context) {
    throw new Error(
      'useBrandPreview must be used within a BrandPreviewProvider',
    );
  }

  return context;
}

// Hook for theme properties with live updates
export function useThemeProperty<T extends keyof BrandTheme>(
  property: T,
): [BrandTheme[T] | undefined, (value: BrandTheme[T]) => void] {
  const { previewTheme, currentTheme, updateThemeProperty } = useBrandPreview();

  const value = previewTheme?.[property] || currentTheme?.[property];

  const setValue = useCallback(
    (newValue: BrandTheme[T]) => {
      updateThemeProperty(property, newValue);
    },
    [property, updateThemeProperty],
  );

  return [value, setValue];
}

// Hook for theme validation with debouncing
export function useThemeValidation(
  themeData: Partial<BrandTheme>,
  debounceMs: number = 500,
) {
  const { validateTheme } = useBrandPreview();
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (Object.keys(themeData).length > 0) {
        setIsValidating(true);
        const result = await validateTheme(themeData);
        setValidationResult(result);
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [themeData, validateTheme, debounceMs]);

  return { validationResult, isValidating };
}

// Utility hook for live CSS custom properties
export function useLiveCSSProperties() {
  const { previewTheme, currentTheme } = useBrandPreview();
  const activeTheme = previewTheme || currentTheme;

  useEffect(() => {
    if (activeTheme) {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', activeTheme.primaryColor);
      root.style.setProperty('--brand-secondary', activeTheme.secondaryColor);
      root.style.setProperty('--brand-accent', activeTheme.accentColor);
      root.style.setProperty('--brand-background', activeTheme.backgroundColor);
      root.style.setProperty('--brand-text', activeTheme.textColor);
      root.style.setProperty('--brand-font-family', activeTheme.fontFamily);
      root.style.setProperty(
        '--brand-border-radius',
        `${activeTheme.borderRadius}px`,
      );
    }
  }, [activeTheme]);

  return activeTheme;
}

export default BrandPreviewProvider;
