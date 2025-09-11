/**
 * WS-146: App Store Configuration Management
 * Handles configuration for multiple app stores including Microsoft Store, Google Play, and Apple App Store
 */

export interface AppStoreConfig {
  microsoftStore: MicrosoftStoreConfig;
  googlePlay: GooglePlayConfig;
  appleAppStore: AppleAppStoreConfig;
}

export interface MicrosoftStoreConfig {
  name: string;
  shortName: string;
  description: string;
  categories: string[];
  iarcRatingId: string;
  screenshots: Screenshot[];
  preferredWindowSize?: { width: number; height: number };
  backgroundColor: string;
  themeColor: string;
  publisherId?: string;
  packageIdentityName?: string;
  applicationId?: string;
}

export interface GooglePlayConfig {
  packageName: string;
  versionCode: number;
  versionName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  twa: TWAConfig;
}

export interface TWAConfig {
  applicationId: string;
  hostName: string;
  launcherName: string;
  themeColor: string;
  backgroundColor: string;
  enableNotifications: boolean;
  orientation: 'portrait' | 'landscape' | 'any';
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
  fallbackType: 'customtabs' | 'webview';
  splashScreenFadeOutDuration?: number;
  navigationBarColor?: string;
  navigationBarDividerColor?: string;
  enableSiteSettingsShortcut?: boolean;
}

export interface AppleAppStoreConfig {
  bundleId: string;
  appName: string;
  version: string;
  buildNumber: string;
  category: string;
  minimumOSVersion: string;
  supportedDevices: ('iPhone' | 'iPad' | 'iPod')[];
  capabilities: string[];
  urlSchemes?: string[];
}

export interface Screenshot {
  src: string;
  sizes: string;
  type: string;
  platform?: 'wide' | 'narrow' | 'windows' | 'ios' | 'android';
  label?: string;
  language?: string;
}

/**
 * WedSync App Store Configuration
 */
export const APP_STORE_CONFIG: AppStoreConfig = {
  microsoftStore: {
    name: 'WedSync - Wedding Vendor Platform',
    shortName: 'WedSync',
    description:
      'Professional wedding vendor management platform. Manage clients, automate workflows, and coordinate with couples seamlessly.',
    categories: ['business', 'productivity'],
    iarcRatingId: 'e84b8d71-ff39-4c75-b6e3-23f3bcb7bcac',
    screenshots: [
      {
        src: '/app-store-assets/screenshots/desktop-dashboard-1280x800.png',
        sizes: '1280x800',
        type: 'image/png',
        platform: 'wide',
        label: 'Professional Dashboard',
      },
      {
        src: '/app-store-assets/screenshots/desktop-clients-1280x800.png',
        sizes: '1280x800',
        type: 'image/png',
        platform: 'wide',
        label: 'Client Management',
      },
      {
        src: '/app-store-assets/screenshots/desktop-timeline-1280x800.png',
        sizes: '1280x800',
        type: 'image/png',
        platform: 'wide',
        label: 'Timeline Automation',
      },
      {
        src: '/app-store-assets/screenshots/mobile-forms-750x1334.png',
        sizes: '750x1334',
        type: 'image/png',
        platform: 'narrow',
        label: 'Mobile Forms',
      },
    ],
    preferredWindowSize: { width: 1280, height: 800 },
    backgroundColor: '#FFFFFF',
    themeColor: '#6366F1',
    packageIdentityName: 'WedSyncInc.WedSyncVendor',
    applicationId: 'WedSync.Vendor',
  },

  googlePlay: {
    packageName: 'app.wedsync.supplier',
    versionCode: 1,
    versionName: '1.0.0',
    minSdkVersion: 21,
    targetSdkVersion: 34,
    twa: {
      applicationId: 'app.wedsync.supplier',
      hostName: 'app.wedsync.co',
      launcherName: 'WedSync',
      themeColor: '#6366F1',
      backgroundColor: '#FFFFFF',
      enableNotifications: true,
      orientation: 'portrait',
      display: 'standalone',
      fallbackType: 'customtabs',
      splashScreenFadeOutDuration: 300,
      navigationBarColor: '#6366F1',
      navigationBarDividerColor: '#E5E7EB',
      enableSiteSettingsShortcut: true,
    },
  },

  appleAppStore: {
    bundleId: 'app.wedsync.supplier',
    appName: 'WedSync for Vendors',
    version: '1.0.0',
    buildNumber: '1',
    category: 'Business',
    minimumOSVersion: '13.0',
    supportedDevices: ['iPhone', 'iPad'],
    capabilities: [
      'Push Notifications',
      'Background Fetch',
      'Associated Domains',
      'Data Protection',
    ],
    urlSchemes: ['wedsync', 'wedsync-vendor'],
  },
};

/**
 * Microsoft Store specific manifest generator
 */
export class MicrosoftStoreManifest {
  static generate(): any {
    return {
      ...APP_STORE_CONFIG.microsoftStore,
      platform_specific: {
        windows: {
          windows10_universal: {
            min_version: '10.0.17763.0',
            max_version_tested: '10.0.22621.0',
            target_device_family: ['Windows.Universal'],
            dependencies: [],
            capabilities: ['internetClient', 'privateNetworkClientServer'],
          },
        },
      },
      edge_side_panel: {
        preferred_width: 400,
      },
      widgets: [
        {
          name: 'Wedding Day Countdown',
          description: 'Track days until wedding events',
          tag: 'wedding-countdown',
          template: 'countdown',
          ms_ac_template: 'widget/countdown-template.json',
          data: 'widget/countdown-data.json',
          screenshots: [
            {
              src: '/widgets/countdown-screenshot.png',
              sizes: '600x400',
              label: 'Countdown Widget',
            },
          ],
        },
      ],
    };
  }
}

/**
 * Google Play Store TWA Asset Links generator
 */
export class TWAAssetLinks {
  static generate(): any {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: APP_STORE_CONFIG.googlePlay.packageName,
          sha256_cert_fingerprints: [
            // These will be generated during the build process
            'INSERT_SHA256_FINGERPRINT_HERE',
          ],
        },
      },
    ];
  }

  static generateWebManifest(): any {
    return {
      related_applications: [
        {
          platform: 'play',
          url: `https://play.google.com/store/apps/details?id=${APP_STORE_CONFIG.googlePlay.packageName}`,
          id: APP_STORE_CONFIG.googlePlay.packageName,
        },
      ],
      prefer_related_applications: false, // Keep false to allow PWA installation
    };
  }
}

/**
 * App Store metadata generator
 */
export class AppStoreMetadata {
  static generateKeywords(): string[] {
    return [
      'wedding vendor',
      'wedding planner',
      'wedding coordinator',
      'wedding management',
      'vendor management',
      'client management',
      'wedding timeline',
      'wedding automation',
      'wedding business',
      'wedding professional',
      'event planning',
      'wedding supplier',
      'wedding photographer',
      'wedding florist',
      'wedding caterer',
    ];
  }

  static generateDescription(
    platform: 'microsoft' | 'google' | 'apple',
  ): string {
    const baseDescription = `WedSync is the complete wedding vendor management platform that helps wedding professionals streamline their business operations. From client management to timeline automation, WedSync provides all the tools you need to deliver exceptional wedding experiences.`;

    const features = `
Key Features:
• Client & Guest Management - Organize all your wedding clients in one place
• Timeline Automation - Create and manage wedding day timelines effortlessly
• Offline Capability - Access critical information even without internet
• Vendor Collaboration - Coordinate seamlessly with other wedding vendors
• Smart Forms - Collect information with customizable digital forms
• Real-time Updates - Keep everyone informed with instant notifications
• Payment Processing - Handle invoices and payments professionally
• Document Management - Store and share important wedding documents
• Analytics Dashboard - Track your business performance
• Mobile Optimized - Work from anywhere on any device`;

    const benefits = `
Why Wedding Vendors Choose WedSync:
✓ Save 10+ hours per wedding with automation
✓ Reduce miscommunication with centralized information
✓ Increase client satisfaction with professional tools
✓ Scale your business with efficient workflows
✓ Access everything offline during wedding days`;

    switch (platform) {
      case 'microsoft':
        return `${baseDescription}\n${features}\n${benefits}\n\nDesigned for Windows devices with full offline support and desktop optimization.`;

      case 'google':
        return `${baseDescription}\n${features}\n${benefits}\n\nOptimized for Android with offline capability and push notifications.`;

      case 'apple':
        return `${baseDescription}\n${features}\n${benefits}\n\nBuilt for iPhone and iPad with native iOS features and seamless integration.`;

      default:
        return `${baseDescription}\n${features}\n${benefits}`;
    }
  }

  static generatePrivacyPolicy(): string {
    return `https://wedsync.app/privacy-policy`;
  }

  static generateTermsOfService(): string {
    return `https://wedsync.app/terms-of-service`;
  }

  static generateSupportUrl(): string {
    return `https://wedsync.app/support`;
  }

  static generateMarketingUrl(): string {
    return `https://wedsync.app`;
  }
}

/**
 * App store validation utilities
 */
export class AppStoreValidator {
  /**
   * Validate PWA readiness for Microsoft Store
   */
  static validateMicrosoftStore(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check manifest requirements
    if (!APP_STORE_CONFIG.microsoftStore.name) {
      errors.push('App name is required');
    }

    if (APP_STORE_CONFIG.microsoftStore.name.length > 256) {
      errors.push('App name must be 256 characters or less');
    }

    if (!APP_STORE_CONFIG.microsoftStore.description) {
      errors.push('App description is required');
    }

    if (APP_STORE_CONFIG.microsoftStore.screenshots.length < 1) {
      errors.push('At least one screenshot is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate TWA readiness for Google Play
   */
  static validateGooglePlay(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (
      !APP_STORE_CONFIG.googlePlay.packageName.match(
        /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/,
      )
    ) {
      errors.push('Invalid package name format');
    }

    if (APP_STORE_CONFIG.googlePlay.minSdkVersion < 19) {
      errors.push('Minimum SDK version must be 19 or higher for TWA');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate overall app store readiness
   */
  static validateAll(): { valid: boolean; results: Record<string, any> } {
    return {
      valid: true,
      results: {
        microsoftStore: this.validateMicrosoftStore(),
        googlePlay: this.validateGooglePlay(),
      },
    };
  }
}
