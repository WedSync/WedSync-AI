/**
 * WS-221: Branding Customization - Brand Synchronization System
 * Team C - Real-time brand theme synchronization and management
 */

import { createClient } from '@supabase/supabase-js';
import {
  BrandTheme,
  BrandSyncOptions,
  BrandSyncInterface,
  BrandValidatorInterface,
  BrandAssetManagerInterface,
  BrandMonitorInterface,
  BrandingServices,
} from './types';

// Interfaces now imported from types.ts

export class BrandSync implements BrandSyncInterface {
  private supabase: ReturnType<typeof createClient>;
  private assetManager?: BrandAssetManagerInterface;
  private validator?: BrandValidatorInterface;
  private monitor?: BrandMonitorInterface;
  private currentTheme: BrandTheme | null = null;
  private options: BrandSyncOptions;
  private syncListeners: Set<(theme: BrandTheme) => void> = new Set();
  private realtimeSubscription: any = null;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    options: BrandSyncOptions,
    services: BrandingServices = {},
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.assetManager = services.assetManager;
    this.validator = services.validator;
    this.monitor = services.monitor;
    this.options = options;
  }

  /**
   * Initialize brand synchronization for an organization
   */
  async initialize(organizationId: string): Promise<void> {
    try {
      // Load current theme
      const theme = await this.loadBrandTheme(organizationId);
      if (theme) {
        await this.applyBrandTheme(theme);
      }

      // Setup real-time synchronization if enabled
      if (this.options.enableRealTimeSync) {
        await this.setupRealtimeSync(organizationId);
      }

      // Initialize monitoring (if monitor is available)
      if (this.monitor) {
        await this.monitor.startHealthCheck(organizationId);
      }

      console.log(`[BrandSync] Initialized for organization ${organizationId}`);
    } catch (error) {
      console.error('[BrandSync] Initialization failed:', error);
      await this.applyFallbackTheme();
    }
  }

  /**
   * Load brand theme from database
   */
  async loadBrandTheme(organizationId: string): Promise<BrandTheme | null> {
    try {
      const { data, error } = await this.supabase
        .from('brand_themes')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn(
          `[BrandSync] No active theme found for organization ${organizationId}`,
        );
        return null;
      }

      const theme: BrandTheme = {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color,
        accentColor: data.accent_color,
        backgroundColor: data.background_color,
        textColor: data.text_color,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
        fontFamily: data.font_family,
        borderRadius: data.border_radius,
        customCSS: data.custom_css,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Validate theme before applying (if validator is available)
      if (this.validator) {
        const validationResult = await this.validator.validateTheme(theme);
        if (!validationResult.isValid) {
          console.error(
            '[BrandSync] Theme validation failed:',
            validationResult.errors,
          );
          return null;
        }
      }

      this.currentTheme = theme;
      return theme;
    } catch (error) {
      console.error('[BrandSync] Failed to load brand theme:', error);
      return null;
    }
  }

  /**
   * Apply brand theme to the DOM
   */
  async applyBrandTheme(theme: BrandTheme): Promise<void> {
    try {
      // Update CSS custom properties
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', theme.primaryColor);
      root.style.setProperty('--brand-secondary', theme.secondaryColor);
      root.style.setProperty('--brand-accent', theme.accentColor);
      root.style.setProperty('--brand-background', theme.backgroundColor);
      root.style.setProperty('--brand-text', theme.textColor);
      root.style.setProperty('--brand-font-family', theme.fontFamily);
      root.style.setProperty(
        '--brand-border-radius',
        `${theme.borderRadius}px`,
      );

      // Apply custom CSS if provided
      if (theme.customCSS) {
        let customStyleElement = document.getElementById('brand-custom-styles');
        if (!customStyleElement) {
          customStyleElement = document.createElement('style');
          customStyleElement.id = 'brand-custom-styles';
          document.head.appendChild(customStyleElement);
        }
        customStyleElement.textContent = theme.customCSS;
      }

      // Update logo and favicon (if asset manager is available)
      if (theme.logoUrl) {
        if (this.assetManager) {
          await this.assetManager.preloadAsset(theme.logoUrl);
        }
        this.updateLogo(theme.logoUrl);
      }

      if (theme.faviconUrl) {
        if (this.assetManager) {
          await this.assetManager.preloadAsset(theme.faviconUrl);
        }
        this.updateFavicon(theme.faviconUrl);
      }

      // Notify listeners
      this.syncListeners.forEach((listener) => listener(theme));

      // Update current theme reference
      this.currentTheme = theme;

      console.log(`[BrandSync] Applied theme: ${theme.name}`);
    } catch (error) {
      console.error('[BrandSync] Failed to apply brand theme:', error);
      await this.applyFallbackTheme();
    }
  }

  /**
   * Save brand theme to database
   */
  async saveBrandTheme(theme: Partial<BrandTheme>): Promise<BrandTheme | null> {
    try {
      // Validate theme data (if validator is available)
      if (this.validator) {
        const validationResult = await this.validator.validateThemeData(theme);
        if (!validationResult.isValid) {
          console.error(
            '[BrandSync] Theme data validation failed:',
            validationResult.errors,
          );
          return null;
        }
      }

      const now = new Date().toISOString();
      const themeData = {
        organization_id: theme.organizationId,
        name: theme.name,
        primary_color: theme.primaryColor,
        secondary_color: theme.secondaryColor,
        accent_color: theme.accentColor,
        background_color: theme.backgroundColor,
        text_color: theme.textColor,
        logo_url: theme.logoUrl,
        favicon_url: theme.faviconUrl,
        font_family: theme.fontFamily,
        border_radius: theme.borderRadius,
        custom_css: theme.customCSS,
        is_active: theme.isActive ?? true,
        updated_at: now,
      };

      let result;
      if (theme.id) {
        // Update existing theme
        const { data, error } = await this.supabase
          .from('brand_themes')
          .update(themeData)
          .eq('id', theme.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new theme
        const { data, error } = await this.supabase
          .from('brand_themes')
          .insert({ ...themeData, created_at: now })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Convert to BrandTheme interface
      const savedTheme: BrandTheme = {
        id: result.id,
        organizationId: result.organization_id,
        name: result.name,
        primaryColor: result.primary_color,
        secondaryColor: result.secondary_color,
        accentColor: result.accent_color,
        backgroundColor: result.background_color,
        textColor: result.text_color,
        logoUrl: result.logo_url,
        faviconUrl: result.favicon_url,
        fontFamily: result.font_family,
        borderRadius: result.border_radius,
        customCSS: result.custom_css,
        isActive: result.is_active,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
      };

      console.log(`[BrandSync] Saved theme: ${savedTheme.name}`);
      return savedTheme;
    } catch (error) {
      console.error('[BrandSync] Failed to save brand theme:', error);
      return null;
    }
  }

  /**
   * Setup real-time synchronization
   */
  private async setupRealtimeSync(organizationId: string): Promise<void> {
    try {
      this.realtimeSubscription = this.supabase
        .channel(`brand_themes:${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brand_themes',
            filter: `organization_id=eq.${organizationId}`,
          },
          async (payload) => {
            console.log('[BrandSync] Real-time update received:', payload);

            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedTheme = await this.loadBrandTheme(organizationId);
              if (updatedTheme && this.options.autoApplyChanges) {
                await this.applyBrandTheme(updatedTheme);
              }
            }
          },
        )
        .subscribe();

      console.log(
        `[BrandSync] Real-time sync enabled for organization ${organizationId}`,
      );
    } catch (error) {
      console.error('[BrandSync] Failed to setup real-time sync:', error);
    }
  }

  /**
   * Apply fallback theme when primary theme fails
   */
  private async applyFallbackTheme(): Promise<void> {
    if (this.options.fallbackTheme) {
      const fallbackTheme: BrandTheme = {
        id: 'fallback',
        organizationId: 'fallback',
        name: 'Fallback Theme',
        primaryColor: this.options.fallbackTheme.primaryColor || '#3B82F6',
        secondaryColor: this.options.fallbackTheme.secondaryColor || '#64748B',
        accentColor: this.options.fallbackTheme.accentColor || '#F59E0B',
        backgroundColor:
          this.options.fallbackTheme.backgroundColor || '#FFFFFF',
        textColor: this.options.fallbackTheme.textColor || '#1F2937',
        fontFamily:
          this.options.fallbackTheme.fontFamily || 'Inter, sans-serif',
        borderRadius: this.options.fallbackTheme.borderRadius || 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.applyBrandTheme(fallbackTheme);
      console.log('[BrandSync] Fallback theme applied');
    }
  }

  /**
   * Update logo elements
   */
  private updateLogo(logoUrl: string): void {
    const logoElements = document.querySelectorAll('[data-brand-logo]');
    logoElements.forEach((element) => {
      if (element instanceof HTMLImageElement) {
        element.src = logoUrl;
      }
    });
  }

  /**
   * Update favicon
   */
  private updateFavicon(faviconUrl: string): void {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;
  }

  /**
   * Add sync listener
   */
  onThemeChange(listener: (theme: BrandTheme) => void): void {
    this.syncListeners.add(listener);
  }

  /**
   * Remove sync listener
   */
  offThemeChange(listener: (theme: BrandTheme) => void): void {
    this.syncListeners.delete(listener);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): BrandTheme | null {
    return this.currentTheme;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.realtimeSubscription) {
      await this.supabase.removeChannel(this.realtimeSubscription);
    }
    this.syncListeners.clear();
    if (this.monitor) {
      await this.monitor.stopHealthCheck();
    }
    console.log('[BrandSync] Cleanup completed');
  }
}

// Factory function for creating BrandSync with dependencies
export function createBrandSync(
  supabaseUrl: string,
  supabaseKey: string,
  options: BrandSyncOptions,
  services: BrandingServices = {},
): BrandSync {
  return new BrandSync(supabaseUrl, supabaseKey, options, services);
}

export default BrandSync;
