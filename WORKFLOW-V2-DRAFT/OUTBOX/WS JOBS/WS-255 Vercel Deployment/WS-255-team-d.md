# WS-255 TEAM D PROMPT: Vercel Deployment - Platform & Mobile Optimization

## 🎯 TEAM D OBJECTIVE
Build platform-specific deployment optimizations, mobile-first performance configurations, PWA deployment settings, and cross-platform compatibility for Vercel deployment. Focus on ensuring flawless mobile experience across all devices and optimizing for wedding day mobile usage patterns.

## 📚 CONTEXT - MOBILE WEDDING DAY SCENARIO
**Critical Mobile Reality:** It's 4pm at an outdoor wedding venue with spotty 3G signal. The maid of honor needs to check the timeline on her iPhone SE while the photographer uploads 50 photos on his Android. Both need instant access despite poor connectivity. Your platform optimizations must ensure sub-3-second load times even on the slowest mobile connections.

## 🔐 EVIDENCE OF REALITY REQUIREMENTS

### 1. FILE EXISTENCE PROOF
Before claiming completion, provide evidence these EXACT files exist:
```bash
# Paste the actual terminal output of these commands:
ls -la /public/manifest.json
ls -la /public/sw.js
ls -la /src/lib/platform/MobileDeploymentOptimizer.ts
ls -la /src/lib/platform/PWAManager.ts
ls -la /next.config.js
ls -la /vercel.json
```

### 2. PWA FUNCTIONALITY PROOF
```bash
# Must register service worker successfully:
curl -I http://localhost:3000/sw.js | grep "200 OK"

# Must have valid web app manifest:
curl -s http://localhost:3000/manifest.json | jq .name
# Should return: "WedSync - Wedding Management Platform"
```

### 3. MOBILE PERFORMANCE PROOF
```bash
# Must pass Core Web Vitals on mobile:
npm run test:lighthouse:mobile
# Should show LCP < 2.5s, FID < 100ms, CLS < 0.1
```

## 📱 MOBILE-FIRST DEPLOYMENT CONFIGURATION

### Enhanced Next.js Configuration for Mobile
```javascript
// /next.config.js - PRODUCTION OPTIMIZED FOR MOBILE
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'wedding-images',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  
  // Mobile-first image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**'
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false
  },

  // Mobile performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Performance headers for mobile
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-UA-Compatible',
            value: 'IE=edge'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          }
        ]
      }
    ];
  },

  // Mobile-friendly redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'user-type',
            value: 'supplier'
          }
        ]
      },
      // Mobile app deep linking
      {
        source: '/m/:path*',
        destination: '/mobile/:path*',
        permanent: false
      }
    ];
  },

  // Bundle analysis and optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Mobile bundle size optimization
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            reuseExistingChunk: true
          },
          vendor: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            enforce: true
          },
          common: {
            name: 'commons',
            minChunks: 2,
            chunks: 'all',
            enforce: true
          }
        }
      };
    }

    // Performance monitoring
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_ID': JSON.stringify(buildId),
        'process.env.IS_MOBILE_BUILD': JSON.stringify(true)
      })
    );

    return config;
  },

  // Environment variables for mobile optimization
  env: {
    MOBILE_BREAKPOINT: '768',
    TABLET_BREAKPOINT: '1024',
    TOUCH_TARGET_SIZE: '48',
    MOBILE_VIEWPORT_WIDTH: '375',
    MOBILE_VIEWPORT_HEIGHT: '812'
  },

  // Experimental mobile features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },

  // Output optimization for Vercel
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
  compress: true
};

module.exports = withPWA(nextConfig);
```

### Progressive Web App Configuration
```json
// /public/manifest.json - MOBILE-OPTIMIZED PWA MANIFEST
{
  "name": "WedSync - Wedding Management Platform",
  "short_name": "WedSync",
  "description": "Professional wedding planning and vendor coordination platform",
  "start_url": "/dashboard?utm_source=pwa",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "scope": "/",
  "lang": "en-US",
  "dir": "ltr",
  
  "icons": [
    {
      "src": "/icons/manifest-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/manifest-icon-512.png", 
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "/icons/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    }
  ],
  
  "categories": ["business", "productivity", "lifestyle"],
  "shortcuts": [
    {
      "name": "Wedding Timeline",
      "short_name": "Timeline",
      "description": "View today's wedding timeline",
      "url": "/timeline?utm_source=pwa_shortcut",
      "icons": [
        {
          "src": "/icons/timeline-shortcut.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Upload Photos",
      "short_name": "Photos", 
      "description": "Upload wedding photos",
      "url": "/photos/upload?utm_source=pwa_shortcut",
      "icons": [
        {
          "src": "/icons/camera-shortcut.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Client Messages",
      "short_name": "Messages",
      "description": "Check client messages",
      "url": "/messages?utm_source=pwa_shortcut",
      "icons": [
        {
          "src": "/icons/messages-shortcut.png",
          "sizes": "96x96", 
          "type": "image/png"
        }
      ]
    }
  ],
  
  "prefer_related_applications": false,
  "edge_side_includes": true,
  
  "screenshots": [
    {
      "src": "/screenshots/mobile-dashboard.png",
      "sizes": "375x812",
      "type": "image/png",
      "platform": "narrow",
      "label": "Wedding dashboard on mobile"
    },
    {
      "src": "/screenshots/tablet-timeline.png", 
      "sizes": "768x1024",
      "type": "image/png",
      "platform": "wide",
      "label": "Wedding timeline on tablet"
    }
  ],

  "protocol_handlers": [
    {
      "protocol": "mailto",
      "url": "/compose?to=%s"
    }
  ]
}
```

## 🚀 MOBILE DEPLOYMENT OPTIMIZER SERVICE

### Core Mobile Optimization Service
```typescript
// /src/lib/platform/MobileDeploymentOptimizer.ts
import { supabase } from '@/lib/supabase/client';

export interface MobileOptimizationConfig {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi';
  screenDensity: number;
  availableMemory: number;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

export interface OptimizationResult {
  imageQuality: number;
  maxConcurrentUploads: number;
  cacheStrategy: 'aggressive' | 'normal' | 'minimal';
  enableOfflineMode: boolean;
  reducedAnimations: boolean;
  prioritizeContent: string[];
}

export class MobileDeploymentOptimizer {
  private static instance: MobileDeploymentOptimizer;
  private optimizationCache = new Map<string, OptimizationResult>();

  public static getInstance(): MobileDeploymentOptimizer {
    if (!MobileDeploymentOptimizer.instance) {
      MobileDeploymentOptimizer.instance = new MobileDeploymentOptimizer();
    }
    return MobileDeploymentOptimizer.instance;
  }

  async optimizeForDeployment(): Promise<void> {
    try {
      // 1. Optimize bundle for mobile
      await this.optimizeBundleSize();
      
      // 2. Configure mobile-specific caching
      await this.setupMobileCaching();
      
      // 3. Optimize images for mobile
      await this.optimizeMobileImages();
      
      // 4. Setup offline capabilities
      await this.configureOfflineMode();
      
      // 5. Optimize touch interactions
      await this.optimizeTouchInterface();
      
      console.log('✅ Mobile deployment optimization completed');
    } catch (error) {
      console.error('❌ Mobile optimization failed:', error);
      throw error;
    }
  }

  async detectDeviceCapabilities(): Promise<MobileOptimizationConfig> {
    // Server-side device detection fallback
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
    
    const config: MobileOptimizationConfig = {
      deviceType: this.detectDeviceType(userAgent),
      connectionType: this.detectConnectionType(),
      screenDensity: this.detectScreenDensity(),
      availableMemory: this.detectAvailableMemory()
    };

    // Client-side enhanced detection
    if (typeof window !== 'undefined') {
      // Battery API
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          config.batteryLevel = battery.level;
          config.isLowPowerMode = battery.level < 0.2;
        } catch (error) {
          console.warn('Battery API not supported:', error);
        }
      }

      // Memory API
      if ('memory' in performance) {
        config.availableMemory = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      // Connection API
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        config.connectionType = this.mapConnectionType(connection.effectiveType);
      }
    }

    return config;
  }

  async getOptimizedSettings(config: MobileOptimizationConfig): Promise<OptimizationResult> {
    const cacheKey = this.generateCacheKey(config);
    
    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey)!;
    }

    const result = this.calculateOptimizations(config);
    this.optimizationCache.set(cacheKey, result);
    
    // Log optimization decision for analytics
    await this.logOptimizationDecision(config, result);
    
    return result;
  }

  private calculateOptimizations(config: MobileOptimizationConfig): OptimizationResult {
    const result: OptimizationResult = {
      imageQuality: 80,
      maxConcurrentUploads: 2,
      cacheStrategy: 'normal',
      enableOfflineMode: false,
      reducedAnimations: false,
      prioritizeContent: ['timeline', 'messages', 'photos']
    };

    // Optimize based on device type
    if (config.deviceType === 'mobile') {
      result.imageQuality = 70;
      result.maxConcurrentUploads = 1;
      result.enableOfflineMode = true;
      result.prioritizeContent = ['timeline', 'messages'];
    }

    // Optimize based on connection
    switch (config.connectionType) {
      case '2g':
      case '3g':
        result.imageQuality = 50;
        result.maxConcurrentUploads = 1;
        result.cacheStrategy = 'aggressive';
        result.enableOfflineMode = true;
        result.reducedAnimations = true;
        break;
      case '4g':
        result.imageQuality = 70;
        result.maxConcurrentUploads = 2;
        result.cacheStrategy = 'normal';
        break;
      case '5g':
      case 'wifi':
        result.imageQuality = 90;
        result.maxConcurrentUploads = 3;
        result.cacheStrategy = 'minimal';
        break;
    }

    // Battery optimization
    if (config.isLowPowerMode || (config.batteryLevel && config.batteryLevel < 0.2)) {
      result.reducedAnimations = true;
      result.enableOfflineMode = true;
      result.maxConcurrentUploads = 1;
    }

    // Memory optimization
    if (config.availableMemory < 512) { // Less than 512MB
      result.imageQuality = Math.min(result.imageQuality, 60);
      result.cacheStrategy = 'minimal';
      result.reducedAnimations = true;
    }

    return result;
  }

  private async optimizeBundleSize(): Promise<void> {
    // This would run during build time to optimize bundles
    console.log('📦 Optimizing bundle size for mobile...');
    
    // Tree shaking optimization
    // Code splitting optimization
    // Dynamic imports for non-critical features
    // Remove unused dependencies
  }

  private async setupMobileCaching(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Register enhanced service worker for mobile
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        // Send mobile optimization settings to service worker
        if (registration.active) {
          const config = await this.detectDeviceCapabilities();
          const optimizations = await this.getOptimizedSettings(config);
          
          registration.active.postMessage({
            type: 'MOBILE_OPTIMIZATION_CONFIG',
            config: optimizations
          });
        }

        console.log('✅ Mobile service worker registered');
      }
    } catch (error) {
      console.error('❌ Failed to setup mobile caching:', error);
    }
  }

  private async optimizeMobileImages(): Promise<void> {
    console.log('🖼️ Optimizing images for mobile deployment...');
    
    // This would be handled by Next.js Image component with mobile-optimized settings
    // But we can set up dynamic quality based on device capabilities
    
    if (typeof window !== 'undefined') {
      const config = await this.detectDeviceCapabilities();
      const optimizations = await this.getOptimizedSettings(config);
      
      // Store image quality preference
      localStorage.setItem('mobileImageQuality', optimizations.imageQuality.toString());
      localStorage.setItem('mobileImageStrategy', optimizations.cacheStrategy);
    }
  }

  private async configureOfflineMode(): Promise<void> {
    console.log('📱 Configuring offline capabilities...');
    
    if (typeof window !== 'undefined') {
      // Setup offline event listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Initialize offline storage
      await this.initializeOfflineStorage();
    }
  }

  private async optimizeTouchInterface(): Promise<void> {
    console.log('👆 Optimizing touch interface...');
    
    if (typeof window === 'undefined') return;

    // Add touch-specific CSS classes
    document.documentElement.classList.add('touch-optimized');
    
    // Setup touch gesture handlers
    this.setupTouchGestures();
    
    // Optimize tap delays
    this.optimizeTapResponse();
  }

  private handleOnline(): void {
    console.log('📶 Device back online - syncing data...');
    
    // Trigger data sync
    this.syncOfflineData();
    
    // Update UI state
    document.body.classList.remove('offline-mode');
    document.body.classList.add('online-mode');
  }

  private handleOffline(): void {
    console.log('📵 Device offline - enabling offline mode...');
    
    // Update UI state
    document.body.classList.add('offline-mode');
    document.body.classList.remove('online-mode');
    
    // Show offline notification
    this.showOfflineNotification();
  }

  private async initializeOfflineStorage(): Promise<void> {
    try {
      // Initialize IndexedDB for offline data
      const dbName = 'WedSyncOffline';
      const dbVersion = 1;
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object stores for offline data
          if (!db.objectStoreNames.contains('timeline')) {
            db.createObjectStore('timeline', { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos', { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains('messages')) {
            db.createObjectStore('messages', { keyPath: 'id' });
          }
        };
      });

      console.log('✅ Offline storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline storage:', error);
    }
  }

  private async syncOfflineData(): Promise<void> {
    // Sync offline data when back online
    try {
      const dbName = 'WedSyncOffline';
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      // Sync each data type
      await this.syncDataStore(db, 'timeline');
      await this.syncDataStore(db, 'photos');
      await this.syncDataStore(db, 'messages');
      
      console.log('✅ Offline data synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync offline data:', error);
    }
  }

  private async syncDataStore(db: IDBDatabase, storeName: string): Promise<void> {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const offlineData = request.result;
        
        for (const item of offlineData) {
          try {
            // Sync to Supabase
            await supabase.from(storeName).upsert(item);
          } catch (error) {
            console.error(`Failed to sync ${storeName} item:`, error);
          }
        }
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private setupTouchGestures(): void {
    // Setup swipe gestures for mobile navigation
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Swipe right to go back
      if (deltaX > 100 && Math.abs(deltaY) < 50) {
        window.history.back();
      }
    }, { passive: true });
  }

  private optimizeTapResponse(): void {
    // Remove 300ms tap delay on mobile
    const style = document.createElement('style');
    style.textContent = `
      * {
        touch-action: manipulation;
      }
      
      button, a, input[type="button"], input[type="submit"] {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  private showOfflineNotification(): void {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <div class="offline-message">
        📵 You're offline. Some features may be limited.
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 9999;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    // Auto-hide when back online
    window.addEventListener('online', () => {
      notification.remove();
    }, { once: true });
  }

  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const tablet = /iPad|Android.*Tablet|Windows.*Touch/i.test(userAgent);
    
    if (tablet) return 'tablet';
    if (mobile) return 'mobile';
    return 'desktop';
  }

  private detectConnectionType(): '2g' | '3g' | '4g' | '5g' | 'wifi' {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return this.mapConnectionType(connection.effectiveType || '4g');
    }
    return '4g'; // Default assumption
  }

  private mapConnectionType(effectiveType: string): '2g' | '3g' | '4g' | '5g' | 'wifi' {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      case '5g':
        return '5g';
      default:
        return '4g';
    }
  }

  private detectScreenDensity(): number {
    if (typeof window !== 'undefined') {
      return window.devicePixelRatio || 1;
    }
    return 1;
  }

  private detectAvailableMemory(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.jsHeapSizeLimit / 1024 / 1024; // MB
    }
    return 512; // Default assumption
  }

  private generateCacheKey(config: MobileOptimizationConfig): string {
    return `${config.deviceType}-${config.connectionType}-${config.screenDensity}`;
  }

  private async logOptimizationDecision(
    config: MobileOptimizationConfig, 
    result: OptimizationResult
  ): Promise<void> {
    try {
      await supabase.from('mobile_optimizations').insert({
        device_type: config.deviceType,
        connection_type: config.connectionType,
        screen_density: config.screenDensity,
        available_memory: config.availableMemory,
        battery_level: config.batteryLevel,
        image_quality: result.imageQuality,
        cache_strategy: result.cacheStrategy,
        offline_enabled: result.enableOfflineMode,
        reduced_animations: result.reducedAnimations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log optimization decision:', error);
    }
  }
}

// Export singleton instance
export const mobileOptimizer = MobileDeploymentOptimizer.getInstance();
```

### Enhanced Service Worker for Mobile
```javascript
// /public/sw.js - MOBILE-OPTIMIZED SERVICE WORKER
const CACHE_NAME = 'wedsync-v2-mobile';
const STATIC_CACHE_NAME = 'wedsync-static-v2';
const RUNTIME_CACHE_NAME = 'wedsync-runtime-v2';

// Mobile-optimized cache configuration
let MOBILE_OPTIMIZATION_CONFIG = {
  imageQuality: 70,
  maxConcurrentUploads: 2,
  cacheStrategy: 'normal',
  enableOfflineMode: true,
  reducedAnimations: false
};

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/timeline',
  '/offline',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/'
];

// Wedding day critical paths
const WEDDING_DAY_PATHS = [
  '/timeline',
  '/photos/upload',
  '/messages',
  '/emergency-contacts'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      
      // Cache critical resources immediately
      await cache.addAll(CRITICAL_RESOURCES);
      
      // Skip waiting to activate immediately
      self.skipWaiting();
      
      console.log('✅ Service Worker installed with mobile optimizations');
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name !== CACHE_NAME && 
        name !== STATIC_CACHE_NAME && 
        name !== RUNTIME_CACHE_NAME
      );
      
      await Promise.all(oldCaches.map(name => caches.delete(name)));
      
      // Take control of all clients immediately
      await self.clients.claim();
      
      console.log('✅ Service Worker activated and cache cleaned');
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'MOBILE_OPTIMIZATION_CONFIG') {
    MOBILE_OPTIMIZATION_CONFIG = event.data.config;
    console.log('📱 Received mobile optimization config:', MOBILE_OPTIMIZATION_CONFIG);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different request types with mobile optimization
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Mobile-optimized image handling
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For mobile, implement network timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), 5000)
    );
    
    try {
      const response = await Promise.race([fetch(request), timeoutPromise]);
      
      if (response.ok) {
        // Cache successful image responses
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      // Return placeholder image for mobile on failure
      const placeholderResponse = await cache.match('/images/placeholder-mobile.webp');
      return placeholderResponse || new Response('', { status: 200 });
    }
  } catch (error) {
    console.error('Image request failed:', error);
    return new Response('', { status: 500 });
  }
}

// API requests with mobile-specific caching
async function handleAPIRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // For GET requests, try cache first on mobile
  if (request.method === 'GET' && MOBILE_OPTIMIZATION_CONFIG.cacheStrategy === 'aggressive') {
    if (cachedResponse) {
      // Serve from cache immediately, update in background
      fetchAndCache(request, cache);
      return cachedResponse;
    }
  }
  
  try {
    // Network timeout for mobile
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok && request.method === 'GET') {
      // Cache successful GET responses
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Return cached response if available during network failure
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical wedding day paths
    if (WEDDING_DAY_PATHS.some(path => request.url.includes(path))) {
      return new Response(JSON.stringify({
        error: 'Offline mode - data may be stale',
        offline: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Navigation requests with offline support
async function handleNavigationRequest(request) {
  try {
    // Network first for navigation
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Navigation request failed:', error);
    
    // Try cache
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for critical paths
    const url = new URL(request.url);
    if (WEDDING_DAY_PATHS.some(path => url.pathname.includes(path))) {
      const offlineResponse = await cache.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WedSync - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; padding: 20px; text-align: center; }
            .offline-message { 
              background: #f59e0b; 
              color: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .retry-btn {
              background: #6366f1;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <h1>📵 You're Offline</h1>
          <div class="offline-message">
            <p>Don't worry! Your wedding timeline and critical information are still available.</p>
          </div>
          <button class="retry-btn" onclick="window.location.reload()">
            Try Again
          </button>
          <p><a href="/">Return to Dashboard</a></p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Static resource handling
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Static request failed:', error);
    return new Response('', { status: 404 });
  }
}

// Background fetch and cache helper
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.error('Background fetch failed:', error);
  }
}

// Periodic background sync for wedding day data
self.addEventListener('sync', (event) => {
  if (event.tag === 'wedding-day-sync') {
    event.waitUntil(syncWeddingDayData());
  }
});

async function syncWeddingDayData() {
  try {
    // Sync critical wedding day data in background
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const criticalEndpoints = [
      '/api/timeline/today',
      '/api/messages/unread',
      '/api/photos/recent'
    ];
    
    await Promise.all(
      criticalEndpoints.map(endpoint => fetchAndCache(new Request(endpoint), cache))
    );
    
    console.log('✅ Wedding day data synced in background');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
```

## 🔧 TEAM D DELIVERABLES CHECKLIST
- [x] Mobile-optimized Next.js configuration with PWA support
- [x] Enhanced PWA manifest with wedding-specific shortcuts
- [x] MobileDeploymentOptimizer service with device detection
- [x] Advanced service worker with offline capabilities
- [x] Touch-optimized interface configurations
- [x] Mobile-specific caching strategies
- [x] Offline data storage and synchronization
- [x] Battery and memory optimization features
- [x] Connection-aware resource loading
- [x] Wedding day critical path prioritization
- [x] Mobile performance monitoring and logging
- [x] Cross-platform compatibility optimizations

**CRITICAL SUCCESS METRIC: Wedding photographers must be able to upload photos on iPhone SE with 3G connection in under 3 seconds per photo. Everything else is secondary!**