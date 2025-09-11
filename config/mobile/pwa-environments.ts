/**
 * WS-194 Team D - Mobile Environment Management
 * PWA Environment Configuration Manager for Wedding Coordination Platform
 * 
 * Provides environment-specific PWA configurations for:
 * - Development: Debug-friendly settings, network-first caching
 * - Staging: Testing-optimized settings, validation features
 * - Production: Performance-optimized, wedding-day reliability
 */

export interface PWAEnvironmentConfig {
  manifest: {
    name: string;
    short_name: string;
    description: string;
    start_url: string;
    scope: string;
    display: string;
    theme_color: string;
    background_color: string;
    icons: Array<{
      src: string;
      sizes: string;
      type: string;
      purpose?: string;
    }>;
  };
  serviceWorker: {
    version: string;
    cacheStrategy: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    cacheName: string;
    offlinePages: string[];
    networkTimeout: number;
    maxCacheSize: number;
    debugMode: boolean;
  };
  pushNotifications: {
    vapidPublicKey: string;
    serviceWorkerPath: string;
    enabled: boolean;
    debugNotifications: boolean;
  };
  deployment: {
    buildVariant: string;
    appStoreConfig: {
      bundleId: string;
      displayName: string;
      version: string;
      iconSet: string;
    };
    features: {
      debugMenu: boolean;
      performanceMonitoring: boolean;
      offlineDevTools: boolean;
      weddingDayMode: boolean;
    };
  };
}

export class PWAEnvironmentManager {
  private environments: Map<string, PWAEnvironmentConfig> = new Map();
  private currentEnvironment: string;

  constructor(environment?: string) {
    this.currentEnvironment = environment || this.detectEnvironment();
    this.loadEnvironmentConfigurations();
  }

  private detectEnvironment(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
      if (hostname.includes('staging') || hostname.includes('preview')) return 'staging';
      return 'production';
    }
    
    return process.env.NODE_ENV === 'production' ? 'production' : 
           process.env.NODE_ENV === 'test' ? 'staging' : 'development';
  }

  private loadEnvironmentConfigurations(): void {
    // Development Environment - Debug-friendly, network-first
    this.environments.set('development', {
      manifest: {
        name: 'WedSync (Development)',
        short_name: 'WS-Dev',
        description: 'Wedding coordination platform - Development build with debugging features',
        start_url: '/?utm_source=pwa_dev',
        scope: '/',
        display: 'standalone',
        theme_color: '#f59e0b', // Amber theme for dev
        background_color: '#ffffff',
        icons: this.getEnvironmentIcons('development'),
      },
      serviceWorker: {
        version: `v${Date.now()}-dev`,
        cacheStrategy: 'networkFirst',
        cacheName: 'wedsync-cache-dev',
        offlinePages: [
          '/offline',
          '/dashboard',
          '/dashboard/clients',
          '/dashboard/timeline',
          '/dev-tools', // Debug pages
        ],
        networkTimeout: 10000, // Longer timeout for debugging
        maxCacheSize: 50, // Smaller cache for development
        debugMode: true,
      },
      pushNotifications: {
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY_DEV || '',
        serviceWorkerPath: '/sw.js',
        enabled: true,
        debugNotifications: true,
      },
      deployment: {
        buildVariant: 'dev',
        appStoreConfig: {
          bundleId: 'com.wedsync.dev',
          displayName: 'WedSync Dev',
          version: '1.0.0-dev',
          iconSet: 'dev-icons',
        },
        features: {
          debugMenu: true,
          performanceMonitoring: true,
          offlineDevTools: true,
          weddingDayMode: true,
        },
      },
    });

    // Staging Environment - Testing-optimized, validation features
    this.environments.set('staging', {
      manifest: {
        name: 'WedSync (Staging)',
        short_name: 'WS-Stage',
        description: 'Wedding coordination platform - Staging build for testing and validation',
        start_url: '/?utm_source=pwa_staging',
        scope: '/',
        display: 'standalone',
        theme_color: '#eab308', // Yellow theme for staging
        background_color: '#ffffff',
        icons: this.getEnvironmentIcons('staging'),
      },
      serviceWorker: {
        version: `v${Date.now()}-staging`,
        cacheStrategy: 'staleWhileRevalidate',
        cacheName: 'wedsync-cache-staging',
        offlinePages: [
          '/offline',
          '/dashboard',
          '/dashboard/clients',
          '/dashboard/timeline',
          '/dashboard/wedding-day',
          '/test-scenarios', // Testing pages
        ],
        networkTimeout: 5000, // Balanced timeout
        maxCacheSize: 75, // Medium cache for testing
        debugMode: false,
      },
      pushNotifications: {
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY_STAGING || '',
        serviceWorkerPath: '/sw.js',
        enabled: true,
        debugNotifications: false,
      },
      deployment: {
        buildVariant: 'staging',
        appStoreConfig: {
          bundleId: 'com.wedsync.staging',
          displayName: 'WedSync Staging',
          version: '1.0.0-staging',
          iconSet: 'staging-icons',
        },
        features: {
          debugMenu: false,
          performanceMonitoring: true,
          offlineDevTools: false,
          weddingDayMode: true,
        },
      },
    });

    // Production Environment - Wedding-day reliability, optimized performance
    this.environments.set('production', {
      manifest: {
        name: 'WedSync - Wedding Vendor Platform',
        short_name: 'WedSync',
        description: 'Professional wedding vendor management platform. Manage clients, automate workflows, and coordinate with couples seamlessly.',
        start_url: '/?utm_source=pwa',
        scope: '/',
        display: 'standalone',
        theme_color: '#6366f1', // Indigo theme for production
        background_color: '#ffffff',
        icons: this.getEnvironmentIcons('production'),
      },
      serviceWorker: {
        version: `v${Date.now()}-prod`,
        cacheStrategy: 'staleWhileRevalidate',
        cacheName: 'wedsync-cache-prod',
        offlinePages: [
          '/offline',
          '/dashboard',
          '/dashboard/clients',
          '/dashboard/timeline',
          '/dashboard/wedding-day',
          '/dashboard/wedding-day/check-in',
          '/dashboard/emergency',
          '/helpers/schedules',
          '/budget/categories',
          '/expenses/capture',
        ],
        networkTimeout: 3000, // Fast timeout for production
        maxCacheSize: 100, // Larger cache for production
        debugMode: false,
      },
      pushNotifications: {
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY_PRODUCTION || '',
        serviceWorkerPath: '/sw.js',
        enabled: true,
        debugNotifications: false,
      },
      deployment: {
        buildVariant: 'production',
        appStoreConfig: {
          bundleId: 'com.wedsync.app',
          displayName: 'WedSync',
          version: '1.0.0',
          iconSet: 'production-icons',
        },
        features: {
          debugMenu: false,
          performanceMonitoring: true,
          offlineDevTools: false,
          weddingDayMode: true,
        },
      },
    });
  }

  private getEnvironmentIcons(environment: string): Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }> {
    const iconPrefix = environment === 'production' ? '' : `${environment}-`;
    
    return [
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-72x72.png`,
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-96x96.png`,
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-128x128.png`,
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-144x144.png`,
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-152x152.png`,
        sizes: '152x152',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-384x384.png`,
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: `/app-store-assets/icons/${iconPrefix}icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any'
      }
    ];
  }

  /**
   * Generate environment-specific manifest JSON
   */
  public generateManifest(environment?: string): string {
    const env = environment || this.currentEnvironment;
    const config = this.getEnvironmentConfig(env);
    
    // Enhanced manifest with wedding-specific features
    const manifest = {
      ...config.manifest,
      orientation: 'portrait-primary',
      lang: 'en-US',
      dir: 'ltr',
      categories: ['business', 'productivity', 'wedding'],
      id: config.deployment.appStoreConfig.bundleId,
      
      // Wedding-specific shortcuts with environment awareness
      shortcuts: this.getEnvironmentShortcuts(env),
      
      // Environment-specific features
      features: [
        'Wedding Day Coordination',
        'Offline Vendor Management',
        'Real-time Timeline Updates',
        'Emergency Response',
        'Client Communication',
        ...(config.deployment.features.debugMenu ? ['Debug Tools'] : []),
        ...(config.deployment.features.offlineDevTools ? ['Offline Development'] : [])
      ],
      
      // PWA display options
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      prefer_related_applications: false,
      
      // Environment-specific file and protocol handlers
      file_handlers: environment === 'development' ? [
        {
          action: '/debug/import',
          accept: {
            'application/json': ['.json'],
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls', '.xlsx']
          }
        }
      ] : [
        {
          action: '/import',
          accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls', '.xlsx']
          }
        }
      ],
      
      protocol_handlers: [
        {
          protocol: 'web+wedsync',
          url: '/handle-protocol?protocol=%s'
        }
      ],
      
      // Share target for wedding data
      share_target: {
        action: '/share',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          title: 'title',
          text: 'text',
          url: 'url',
          files: [
            {
              name: 'files',
              accept: ['image/*', '.pdf', '.csv', '.xlsx']
            }
          ]
        }
      },
    };

    return JSON.stringify(manifest, null, 2);
  }

  private getEnvironmentShortcuts(environment: string) {
    const baseShortcuts = [
      {
        name: 'Wedding Day Dashboard',
        short_name: 'Wedding Day',
        description: 'Access wedding day coordination tools (works offline)',
        url: `/dashboard/wedding-day?utm_source=pwa_shortcut&env=${environment}`,
        icons: [
          {
            src: '/icons/wedding-day-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      {
        name: 'Timeline',
        short_name: 'Timeline',
        description: 'View and manage timeline events (offline capable)',
        url: `/dashboard/timeline?utm_source=pwa_shortcut&env=${environment}`,
        icons: [
          {
            src: '/icons/timeline-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      {
        name: 'Emergency Response',
        short_name: 'Emergency',
        description: 'Emergency incident response dashboard (works offline)',
        url: `/mobile-dashboard?mode=emergency&utm_source=pwa_shortcut&env=${environment}`,
        icons: [
          {
            src: '/icons/emergency-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    ];

    // Add environment-specific shortcuts
    if (environment === 'development') {
      baseShortcuts.push({
        name: 'Debug Tools',
        short_name: 'Debug',
        description: 'Development debugging and testing tools',
        url: '/dev-tools?utm_source=pwa_shortcut',
        icons: [
          {
            src: '/icons/debug-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      });
    }

    return baseShortcuts;
  }

  /**
   * Get environment configuration
   */
  public getEnvironmentConfig(env: string): PWAEnvironmentConfig {
    const config = this.environments.get(env);
    if (!config) {
      console.warn(`Unknown PWA environment: ${env}, falling back to production`);
      return this.environments.get('production')!;
    }
    return config;
  }

  /**
   * Get current environment
   */
  public getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  /**
   * Switch environment (useful for testing)
   */
  public switchEnvironment(environment: string): void {
    if (!this.environments.has(environment)) {
      throw new Error(`Environment ${environment} not found`);
    }
    this.currentEnvironment = environment;
  }

  /**
   * Get all available environments
   */
  public getAvailableEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }

  /**
   * Generate service worker configuration for environment
   */
  public generateServiceWorkerConfig(environment?: string): object {
    const env = environment || this.currentEnvironment;
    const config = this.getEnvironmentConfig(env);
    
    return {
      version: config.serviceWorker.version,
      environment: env,
      cacheStrategy: config.serviceWorker.cacheStrategy,
      cacheName: config.serviceWorker.cacheName,
      networkTimeout: config.serviceWorker.networkTimeout,
      maxCacheSize: config.serviceWorker.maxCacheSize,
      debugMode: config.serviceWorker.debugMode,
      offlinePages: config.serviceWorker.offlinePages,
      pushNotifications: config.pushNotifications,
      features: config.deployment.features,
    };
  }

  /**
   * Validate environment configuration
   */
  public validateEnvironmentConfig(environment: string): boolean {
    const config = this.environments.get(environment);
    if (!config) return false;

    // Validate required fields
    const requiredFields = [
      'manifest.name',
      'manifest.short_name',
      'serviceWorker.version',
      'pushNotifications.vapidPublicKey'
    ];

    return requiredFields.every(field => {
      const keys = field.split('.');
      let value: any = config;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined && value !== '';
    });
  }

  /**
   * Get environment-specific build configuration
   */
  public getBuildConfig(environment?: string) {
    const env = environment || this.currentEnvironment;
    const config = this.getEnvironmentConfig(env);
    
    return {
      buildVariant: config.deployment.buildVariant,
      appStoreConfig: config.deployment.appStoreConfig,
      features: config.deployment.features,
      optimizations: {
        minify: env === 'production',
        sourceMaps: env !== 'production',
        bundleAnalyzer: env === 'development',
        performanceHints: env === 'production',
      }
    };
  }
}

// Singleton instance for global access
export const pwaEnvironmentManager = new PWAEnvironmentManager();

// Environment detection utilities
export const getCurrentEnvironment = (): string => {
  return pwaEnvironmentManager.getCurrentEnvironment();
};

export const isProductionEnvironment = (): boolean => {
  return getCurrentEnvironment() === 'production';
};

export const isDevelopmentEnvironment = (): boolean => {
  return getCurrentEnvironment() === 'development';
};

export const isStagingEnvironment = (): boolean => {
  return getCurrentEnvironment() === 'staging';
};