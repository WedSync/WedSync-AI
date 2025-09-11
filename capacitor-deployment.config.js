// Capacitor deployment configuration for WS-146
// This file contains environment-specific settings for native app builds

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get build information
const getBuildInfo = () => {
  try {
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const gitBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const buildDate = new Date().toISOString();
    
    return {
      gitHash,
      gitBranch,
      buildDate,
      version: process.env.npm_package_version || '1.0.0'
    };
  } catch (error) {
    return {
      gitHash: 'unknown',
      gitBranch: 'unknown',
      buildDate: new Date().toISOString(),
      version: '1.0.0'
    };
  }
};

// Environment configurations
const environments = {
  development: {
    appId: 'app.wedsync.supplier.dev',
    appName: 'WedSync Dev',
    server: {
      url: 'http://localhost:3000',
      cleartext: true
    },
    ios: {
      bundleId: 'app.wedsync.supplier.dev',
      buildNumber: '1',
      version: '1.0.0-dev'
    },
    android: {
      versionName: '1.0.0-dev',
      versionCode: 1
    }
  },
  
  staging: {
    appId: 'app.wedsync.supplier.staging',
    appName: 'WedSync Staging',
    server: {
      url: 'https://staging.wedsync.app',
      cleartext: false
    },
    ios: {
      bundleId: 'app.wedsync.supplier.staging',
      buildNumber: '1',
      version: '1.0.0-beta'
    },
    android: {
      versionName: '1.0.0-beta',
      versionCode: 1
    }
  },
  
  production: {
    appId: 'app.wedsync.supplier',
    appName: 'WedSync',
    server: {
      url: 'https://wedsync.app',
      cleartext: false
    },
    ios: {
      bundleId: 'app.wedsync.supplier',
      buildNumber: '1',
      version: '1.0.0'
    },
    android: {
      versionName: '1.0.0',
      versionCode: 1
    }
  }
};

// Generate Capacitor config based on environment
const generateCapacitorConfig = (environment = 'production') => {
  const buildInfo = getBuildInfo();
  const envConfig = environments[environment];
  
  if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const config = {
    appId: envConfig.appId,
    appName: envConfig.appName,
    webDir: 'out',
    bundledWebRuntime: false,
    
    // Build information
    buildInfo,
    
    // Server configuration
    server: {
      androidScheme: 'https',
      ...envConfig.server
    },
    
    // Plugin configuration
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: "#6366F1",
        showSpinner: false,
        spinnerColor: "#FFFFFF",
        splashFullScreen: true,
        splashImmersive: true
      },
      
      StatusBar: {
        style: "default",
        backgroundColor: "#6366F1",
        overlaysWebView: false
      },
      
      PushNotifications: {
        presentationOptions: ["badge", "sound", "alert"]
      },
      
      LocalNotifications: {
        smallIcon: "ic_stat_notification",
        iconColor: "#6366F1",
        sound: "default"
      },
      
      Camera: {
        permissions: {
          camera: "WedSync needs camera access to capture wedding photos and moments"
        }
      },
      
      Geolocation: {
        permissions: {
          location: "WedSync uses location to automatically tag photos and venues"
        }
      },
      
      Share: {
        // No additional configuration needed
      }
    },
    
    // iOS specific configuration
    ios: {
      scheme: 'WedSync',
      contentInset: 'automatic',
      backgroundColor: '#ffffff',
      
      // App Store metadata
      bundleId: envConfig.ios.bundleId,
      version: envConfig.ios.version,
      buildNumber: envConfig.ios.buildNumber,
      
      // Permissions with detailed descriptions
      permissions: {
        camera: 'WedSync uses the camera to capture wedding photos, document important moments, and create visual timelines for couples',
        photos: 'WedSync needs photo access to manage wedding galleries, import couple photos, and organize visual content',
        notifications: 'Stay informed about client updates, wedding timeline changes, and important reminders',
        location: 'Location services help automatically tag venues and provide location-based features for wedding planning'
      },
      
      // URL schemes for deep linking
      customUrlScheme: 'wedsync',
      
      // Universal Links
      associatedDomains: [
        'applinks:wedsync.app',
        'applinks:www.wedsync.app'
      ]
    },
    
    // Android specific configuration
    android: {
      buildOptions: {
        keystorePath: environment === 'production' ? 'android/app/wedsync-release.keystore' : undefined,
        keystoreAlias: environment === 'production' ? 'wedsync-key' : undefined,
        releaseType: 'AAB', // Android App Bundle
        minifyEnabled: environment === 'production',
        shrinkResources: environment === 'production'
      },
      
      // Google Play requirements
      targetSdk: 34,
      minSdk: 21,
      compileSdk: 34,
      versionCode: envConfig.android.versionCode,
      versionName: envConfig.android.versionName,
      
      // App Links configuration
      intentFilters: [
        {
          autoVerify: true,
          action: 'android.intent.action.VIEW',
          category: ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
          data: {
            scheme: 'https',
            host: 'wedsync.app'
          }
        },
        {
          action: 'android.intent.action.VIEW',
          category: ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
          data: {
            scheme: 'wedsync'
          }
        }
      ],
      
      // Permissions
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.VIBRATE',
        'android.permission.WAKE_LOCK',
        'com.google.android.c2dm.permission.RECEIVE'
      ]
    }
  };
  
  // Environment-specific adjustments
  if (environment === 'development') {
    // Development-specific settings
    config.plugins.SplashScreen.launchShowDuration = 500; // Shorter for dev
    config.server.cleartext = true;
  } else if (environment === 'production') {
    // Production optimizations
    config.android.buildOptions.minifyEnabled = true;
    config.android.buildOptions.shrinkResources = true;
  }
  
  return config;
};

// Deployment utilities
const deploymentUtils = {
  // Validate environment
  validateEnvironment: (environment) => {
    if (!environments[environment]) {
      throw new Error(`Invalid environment: ${environment}. Available: ${Object.keys(environments).join(', ')}`);
    }
    return true;
  },
  
  // Generate build metadata
  generateBuildMetadata: (environment) => {
    const buildInfo = getBuildInfo();
    const envConfig = environments[environment];
    
    return {
      timestamp: new Date().toISOString(),
      environment,
      version: envConfig.ios.version,
      buildNumber: envConfig.ios.buildNumber,
      gitHash: buildInfo.gitHash,
      gitBranch: buildInfo.gitBranch,
      platforms: ['ios', 'android'],
      features: [
        'camera-integration',
        'push-notifications',
        'deep-linking',
        'offline-support',
        'native-sharing'
      ]
    };
  },
  
  // Pre-build validation
  preBuildValidation: () => {
    const checks = [];
    
    // Check if Next.js build exists
    if (!fs.existsSync(path.join(__dirname, 'out'))) {
      checks.push('❌ Next.js build not found. Run `npm run build` first.');
    } else {
      checks.push('✅ Next.js build found');
    }
    
    // Check if Capacitor config exists
    if (!fs.existsSync(path.join(__dirname, 'capacitor.config.ts'))) {
      checks.push('❌ Capacitor config not found');
    } else {
      checks.push('✅ Capacitor config found');
    }
    
    // Check Node version
    const nodeVersion = process.version;
    if (nodeVersion < 'v16.0.0') {
      checks.push(`❌ Node version ${nodeVersion} is too old. Requires Node 16+`);
    } else {
      checks.push(`✅ Node version ${nodeVersion} is compatible`);
    }
    
    return checks;
  },
  
  // Post-build validation
  postBuildValidation: () => {
    const checks = [];
    
    // Check if iOS build exists
    if (fs.existsSync(path.join(__dirname, 'ios'))) {
      checks.push('✅ iOS platform configured');
    } else {
      checks.push('❌ iOS platform not found');
    }
    
    // Check if Android build exists  
    if (fs.existsSync(path.join(__dirname, 'android'))) {
      checks.push('✅ Android platform configured');
    } else {
      checks.push('❌ Android platform not found');
    }
    
    return checks;
  },
  
  // Generate deployment report
  generateDeploymentReport: (environment, validationResults) => {
    const buildInfo = getBuildInfo();
    const metadata = deploymentUtils.generateBuildMetadata(environment);
    
    return {
      deployment: {
        environment,
        timestamp: new Date().toISOString(),
        version: metadata.version,
        buildNumber: metadata.buildNumber
      },
      build: buildInfo,
      validation: validationResults,
      nextSteps: [
        '1. Test app on physical devices',
        '2. Run automated test suite',
        '3. Perform manual testing checklist',
        '4. Update app store metadata',
        '5. Submit for app store review'
      ]
    };
  }
};

module.exports = {
  environments,
  generateCapacitorConfig,
  deploymentUtils,
  getBuildInfo
};