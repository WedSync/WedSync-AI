/**
 * WS-222: Custom Domains System - CDN Optimizer
 * Team D - Performance Optimization & Mobile Optimization
 *
 * Advanced CDN optimization for custom domain assets with mobile focus
 */

import { createClient } from '@supabase/supabase-js';

interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'vercel' | 'custom';
  endpoint: string;
  apiKey: string;
  zoneId?: string;
  distributionId?: string;
}

interface AssetOptimization {
  id: string;
  domain: string;
  assetType:
    | 'image'
    | 'video'
    | 'document'
    | 'stylesheet'
    | 'javascript'
    | 'font';
  originalUrl: string;
  optimizedUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  quality: number;
  mobileOptimized: boolean;
  webpSupport: boolean;
  avifSupport: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

interface CacheRule {
  id: string;
  domain: string;
  pathPattern: string;
  ttl: number; // seconds
  edgeTTL: number; // seconds
  browserTTL: number; // seconds
  mobileOverrides?: {
    ttl: number;
    quality: number;
    format: 'webp' | 'avif' | 'jpeg';
  };
  compressionLevel: number;
  priority: number;
  active: boolean;
}

interface CDNMetrics {
  domain: string;
  cacheHitRate: number;
  bandwidthSaved: number; // bytes
  avgResponseTime: number; // milliseconds
  mobilePerformance: number; // score 0-100
  totalRequests: number;
  cachedRequests: number;
  originRequests: number;
  errors: number;
  topAssets: Array<{
    url: string;
    requests: number;
    bandwidth: number;
    cacheHitRate: number;
  }>;
  measurementPeriod: {
    start: Date;
    end: Date;
  };
}

interface MobileOptimizationSettings {
  enableWebP: boolean;
  enableAVIF: boolean;
  responsiveImages: boolean;
  lazyLoading: boolean;
  progressiveJPEG: boolean;
  minQuality: number;
  maxQuality: number;
  adaptiveQuality: boolean;
  connectionTypeAware: boolean;
  devicePixelRatioAware: boolean;
}

class CDNOptimizer {
  private supabase;
  private configs: Map<string, CDNConfig>;
  private cacheRules: Map<string, CacheRule[]>;
  private optimizations: Map<string, AssetOptimization[]>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
    this.configs = new Map();
    this.cacheRules = new Map();
    this.optimizations = new Map();
  }

  /**
   * Configure CDN for a custom domain
   */
  async configureDomainCDN(
    domain: string,
    config: CDNConfig,
  ): Promise<boolean> {
    try {
      // Store CDN configuration
      const { error } = await this.supabase.from('cdn_configurations').upsert(
        {
          domain,
          provider: config.provider,
          endpoint: config.endpoint,
          zone_id: config.zoneId,
          distribution_id: config.distributionId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'domain' },
      );

      if (error) throw error;

      this.configs.set(domain, config);

      // Set up default cache rules optimized for mobile
      await this.setupDefaultCacheRules(domain);

      // Configure mobile optimizations
      await this.configureMobileOptimizations(domain);

      return true;
    } catch (error) {
      console.error(`CDN configuration failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Optimize assets for mobile delivery
   */
  async optimizeAssetsForMobile(
    domain: string,
    assets: string[],
    settings: MobileOptimizationSettings,
  ): Promise<AssetOptimization[]> {
    const optimizations: AssetOptimization[] = [];

    for (const assetUrl of assets) {
      try {
        const optimization = await this.optimizeSingleAsset(
          domain,
          assetUrl,
          settings,
        );
        if (optimization) {
          optimizations.push(optimization);
          await this.saveOptimization(optimization);
        }
      } catch (error) {
        console.error(`Asset optimization failed for ${assetUrl}:`, error);
      }
    }

    this.optimizations.set(domain, optimizations);
    return optimizations;
  }

  /**
   * Create responsive image variants for different screen sizes
   */
  async createResponsiveVariants(
    domain: string,
    imageUrl: string,
    sizes: number[] = [320, 480, 768, 1024, 1920],
  ): Promise<Map<number, string>> {
    const variants = new Map<number, string>();

    try {
      for (const size of sizes) {
        const optimizedUrl = await this.resizeAndOptimizeImage(
          domain,
          imageUrl,
          size,
          this.getOptimalQuality(size),
        );

        if (optimizedUrl) {
          variants.set(size, optimizedUrl);
        }
      }

      // Store variant information
      await this.saveResponsiveVariants(domain, imageUrl, variants);
    } catch (error) {
      console.error(`Responsive variants creation failed:`, error);
    }

    return variants;
  }

  /**
   * Set up intelligent caching rules based on mobile usage patterns
   */
  async setupMobileCacheRules(domain: string): Promise<boolean> {
    const mobileOptimizedRules: Omit<CacheRule, 'id'>[] = [
      {
        domain,
        pathPattern: '/images/*',
        ttl: 86400 * 30, // 30 days
        edgeTTL: 86400 * 7, // 7 days
        browserTTL: 86400 * 1, // 1 day
        mobileOverrides: {
          ttl: 86400 * 60, // Longer cache for mobile
          quality: 85,
          format: 'webp',
        },
        compressionLevel: 85,
        priority: 1,
        active: true,
      },
      {
        domain,
        pathPattern: '/videos/*',
        ttl: 86400 * 14, // 14 days
        edgeTTL: 86400 * 7, // 7 days
        browserTTL: 86400 * 1, // 1 day
        mobileOverrides: {
          ttl: 86400 * 21,
          quality: 75,
          format: 'webp',
        },
        compressionLevel: 75,
        priority: 2,
        active: true,
      },
      {
        domain,
        pathPattern: '*.css',
        ttl: 86400 * 7, // 7 days
        edgeTTL: 86400 * 7,
        browserTTL: 86400 * 1,
        compressionLevel: 95,
        priority: 3,
        active: true,
      },
      {
        domain,
        pathPattern: '*.js',
        ttl: 86400 * 7, // 7 days
        edgeTTL: 86400 * 7,
        browserTTL: 86400 * 1,
        compressionLevel: 90,
        priority: 4,
        active: true,
      },
      {
        domain,
        pathPattern: '/fonts/*',
        ttl: 86400 * 90, // 90 days - fonts rarely change
        edgeTTL: 86400 * 30,
        browserTTL: 86400 * 7,
        compressionLevel: 100,
        priority: 5,
        active: true,
      },
    ];

    try {
      for (const rule of mobileOptimizedRules) {
        await this.createCacheRule(rule);
      }
      return true;
    } catch (error) {
      console.error(`Mobile cache rules setup failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Get CDN performance metrics
   */
  async getCDNMetrics(
    domain: string,
    periodDays: number = 7,
  ): Promise<CDNMetrics | null> {
    try {
      const config = this.configs.get(domain);
      if (!config) {
        throw new Error(`No CDN configuration found for ${domain}`);
      }

      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - periodDays * 24 * 60 * 60 * 1000,
      );

      // Fetch metrics based on CDN provider
      let metrics: CDNMetrics;

      switch (config.provider) {
        case 'cloudflare':
          metrics = await this.getCloudflareMetrics(
            domain,
            config,
            startDate,
            endDate,
          );
          break;
        case 'aws':
          metrics = await this.getAWSMetrics(
            domain,
            config,
            startDate,
            endDate,
          );
          break;
        case 'vercel':
          metrics = await this.getVercelMetrics(
            domain,
            config,
            startDate,
            endDate,
          );
          break;
        default:
          metrics = await this.getGenericMetrics(domain, startDate, endDate);
      }

      // Calculate mobile performance score
      metrics.mobilePerformance = this.calculateMobilePerformanceScore(metrics);

      return metrics;
    } catch (error) {
      console.error(`Failed to get CDN metrics for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Purge CDN cache for specific assets
   */
  async purgeCacheForAssets(
    domain: string,
    assetUrls: string[],
  ): Promise<boolean> {
    try {
      const config = this.configs.get(domain);
      if (!config) {
        throw new Error(`No CDN configuration found for ${domain}`);
      }

      switch (config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(config, assetUrls);
        case 'aws':
          return await this.purgeAWSCache(config, assetUrls);
        case 'vercel':
          return await this.purgeVercelCache(config, assetUrls);
        default:
          return true; // Generic purge success
      }
    } catch (error) {
      console.error(`Cache purge failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Get optimized asset URL for specific device/network conditions
   */
  getOptimizedAssetUrl(
    domain: string,
    originalUrl: string,
    deviceInfo: {
      type: 'mobile' | 'tablet' | 'desktop';
      screenWidth: number;
      devicePixelRatio: number;
      connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi';
      webpSupport: boolean;
      avifSupport: boolean;
    },
  ): string {
    const optimizations = this.optimizations.get(domain) || [];
    const optimization = optimizations.find(
      (opt) => opt.originalUrl === originalUrl,
    );

    if (!optimization) {
      return originalUrl; // Return original if no optimization available
    }

    let optimizedUrl = optimization.optimizedUrl;
    const params = new URLSearchParams();

    // Device-aware optimizations
    if (deviceInfo.type === 'mobile') {
      // Reduce quality for slower connections
      if (
        deviceInfo.connectionType === '2g' ||
        deviceInfo.connectionType === '3g'
      ) {
        params.set('q', '70'); // Lower quality
      } else {
        params.set('q', '85'); // Higher quality for faster connections
      }
    }

    // Screen size optimization
    const optimalWidth = Math.min(
      Math.ceil(deviceInfo.screenWidth * deviceInfo.devicePixelRatio),
      1920, // Max width
    );
    params.set('w', optimalWidth.toString());

    // Format optimization
    if (deviceInfo.avifSupport && optimization.avifSupport) {
      params.set('f', 'avif');
    } else if (deviceInfo.webpSupport && optimization.webpSupport) {
      params.set('f', 'webp');
    }

    // Connection-specific optimizations
    if (deviceInfo.connectionType === '2g') {
      params.set('blur', '5'); // Add blur for faster loading
      params.set('q', '60'); // Aggressive quality reduction
    }

    // Append optimization parameters
    if (params.toString()) {
      optimizedUrl +=
        (optimizedUrl.includes('?') ? '&' : '?') + params.toString();
    }

    return optimizedUrl;
  }

  // Private methods

  private async setupDefaultCacheRules(domain: string): Promise<void> {
    const defaultRules: Omit<CacheRule, 'id'>[] = [
      {
        domain,
        pathPattern: '*',
        ttl: 3600, // 1 hour default
        edgeTTL: 3600,
        browserTTL: 300, // 5 minutes
        compressionLevel: 80,
        priority: 999,
        active: true,
      },
    ];

    for (const rule of defaultRules) {
      await this.createCacheRule(rule);
    }
  }

  private async configureMobileOptimizations(domain: string): Promise<void> {
    const settings: MobileOptimizationSettings = {
      enableWebP: true,
      enableAVIF: true,
      responsiveImages: true,
      lazyLoading: true,
      progressiveJPEG: true,
      minQuality: 60,
      maxQuality: 95,
      adaptiveQuality: true,
      connectionTypeAware: true,
      devicePixelRatioAware: true,
    };

    await this.supabase.from('mobile_optimization_settings').upsert(
      {
        domain,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'domain' },
    );
  }

  private async optimizeSingleAsset(
    domain: string,
    assetUrl: string,
    settings: MobileOptimizationSettings,
  ): Promise<AssetOptimization | null> {
    try {
      // Determine asset type
      const assetType = this.determineAssetType(assetUrl);

      // Get original asset info
      const originalInfo = await this.getAssetInfo(assetUrl);

      // Apply optimizations based on type and settings
      let optimizedUrl = assetUrl;
      let optimizedSize = originalInfo.size;
      let format = originalInfo.format;

      if (assetType === 'image') {
        const imageOptimization = await this.optimizeImage(assetUrl, settings);
        optimizedUrl = imageOptimization.url;
        optimizedSize = imageOptimization.size;
        format = imageOptimization.format;
      }

      const optimization: AssetOptimization = {
        id: this.generateId(),
        domain,
        assetType,
        originalUrl: assetUrl,
        optimizedUrl,
        originalSize: originalInfo.size,
        optimizedSize,
        compressionRatio:
          originalInfo.size > 0 ? optimizedSize / originalInfo.size : 1,
        format,
        quality: settings.adaptiveQuality
          ? this.calculateOptimalQuality(assetType)
          : settings.maxQuality,
        mobileOptimized: true,
        webpSupport: settings.enableWebP,
        avifSupport: settings.enableAVIF,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      return optimization;
    } catch (error) {
      console.error(`Single asset optimization failed:`, error);
      return null;
    }
  }

  private async resizeAndOptimizeImage(
    domain: string,
    imageUrl: string,
    targetWidth: number,
    quality: number,
  ): Promise<string | null> {
    try {
      // This would integrate with image optimization service (like Cloudinary, ImageOptim, etc.)
      const config = this.configs.get(domain);
      if (!config) return null;

      const optimizedUrl = `${config.endpoint}/image/resize?url=${encodeURIComponent(imageUrl)}&w=${targetWidth}&q=${quality}`;

      // Validate the optimized URL works
      const response = await fetch(optimizedUrl, { method: 'HEAD' });
      if (response.ok) {
        return optimizedUrl;
      }

      return null;
    } catch (error) {
      console.error('Image resize and optimization failed:', error);
      return null;
    }
  }

  private getOptimalQuality(screenWidth: number): number {
    // Adaptive quality based on screen size
    if (screenWidth <= 480) return 75; // Mobile
    if (screenWidth <= 768) return 80; // Small tablet
    if (screenWidth <= 1024) return 85; // Large tablet
    return 90; // Desktop
  }

  private async createCacheRule(rule: Omit<CacheRule, 'id'>): Promise<void> {
    const ruleWithId = { ...rule, id: this.generateId() };

    await this.supabase.from('cdn_cache_rules').insert({
      id: ruleWithId.id,
      domain: ruleWithId.domain,
      path_pattern: ruleWithId.pathPattern,
      ttl: ruleWithId.ttl,
      edge_ttl: ruleWithId.edgeTTL,
      browser_ttl: ruleWithId.browserTTL,
      mobile_overrides: ruleWithId.mobileOverrides,
      compression_level: ruleWithId.compressionLevel,
      priority: ruleWithId.priority,
      active: ruleWithId.active,
      created_at: new Date().toISOString(),
    });

    // Update local cache
    const domainRules = this.cacheRules.get(rule.domain) || [];
    domainRules.push(ruleWithId);
    this.cacheRules.set(rule.domain, domainRules);
  }

  private async saveOptimization(
    optimization: AssetOptimization,
  ): Promise<void> {
    await this.supabase.from('asset_optimizations').insert({
      id: optimization.id,
      domain: optimization.domain,
      asset_type: optimization.assetType,
      original_url: optimization.originalUrl,
      optimized_url: optimization.optimizedUrl,
      original_size: optimization.originalSize,
      optimized_size: optimization.optimizedSize,
      compression_ratio: optimization.compressionRatio,
      format: optimization.format,
      quality: optimization.quality,
      mobile_optimized: optimization.mobileOptimized,
      webp_support: optimization.webpSupport,
      avif_support: optimization.avifSupport,
      created_at: optimization.createdAt.toISOString(),
      last_updated: optimization.lastUpdated.toISOString(),
    });
  }

  private async saveResponsiveVariants(
    domain: string,
    originalUrl: string,
    variants: Map<number, string>,
  ): Promise<void> {
    const variantData = Array.from(variants.entries()).map(([size, url]) => ({
      id: this.generateId(),
      domain,
      original_url: originalUrl,
      variant_size: size,
      variant_url: url,
      created_at: new Date().toISOString(),
    }));

    await this.supabase.from('responsive_variants').insert(variantData);
  }

  // CDN Provider specific methods (placeholder implementations)
  private async getCloudflareMetrics(
    domain: string,
    config: CDNConfig,
    start: Date,
    end: Date,
  ): Promise<CDNMetrics> {
    // Implementation would call Cloudflare Analytics API
    return this.createDefaultMetrics(domain, start, end);
  }

  private async getAWSMetrics(
    domain: string,
    config: CDNConfig,
    start: Date,
    end: Date,
  ): Promise<CDNMetrics> {
    // Implementation would call CloudWatch API
    return this.createDefaultMetrics(domain, start, end);
  }

  private async getVercelMetrics(
    domain: string,
    config: CDNConfig,
    start: Date,
    end: Date,
  ): Promise<CDNMetrics> {
    // Implementation would call Vercel Analytics API
    return this.createDefaultMetrics(domain, start, end);
  }

  private async getGenericMetrics(
    domain: string,
    start: Date,
    end: Date,
  ): Promise<CDNMetrics> {
    return this.createDefaultMetrics(domain, start, end);
  }

  private createDefaultMetrics(
    domain: string,
    start: Date,
    end: Date,
  ): CDNMetrics {
    return {
      domain,
      cacheHitRate: 0.85,
      bandwidthSaved: 0,
      avgResponseTime: 200,
      mobilePerformance: 85,
      totalRequests: 0,
      cachedRequests: 0,
      originRequests: 0,
      errors: 0,
      topAssets: [],
      measurementPeriod: { start, end },
    };
  }

  private calculateMobilePerformanceScore(metrics: CDNMetrics): number {
    let score = 100;

    // Cache hit rate impact
    if (metrics.cacheHitRate < 0.8) score -= 20;
    else if (metrics.cacheHitRate < 0.9) score -= 10;

    // Response time impact
    if (metrics.avgResponseTime > 500) score -= 25;
    else if (metrics.avgResponseTime > 300) score -= 15;
    else if (metrics.avgResponseTime > 200) score -= 10;

    // Error rate impact
    const errorRate =
      metrics.totalRequests > 0 ? metrics.errors / metrics.totalRequests : 0;
    if (errorRate > 0.05) score -= 30;
    else if (errorRate > 0.02) score -= 15;
    else if (errorRate > 0.01) score -= 10;

    return Math.max(0, score);
  }

  // Helper methods
  private determineAssetType(url: string): AssetOptimization['assetType'] {
    const extension = url.split('.').pop()?.toLowerCase();

    if (
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(
        extension || '',
      )
    ) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) {
      return 'video';
    }
    if (['css'].includes(extension || '')) {
      return 'stylesheet';
    }
    if (['js'].includes(extension || '')) {
      return 'javascript';
    }
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension || '')) {
      return 'font';
    }

    return 'document';
  }

  private async getAssetInfo(
    url: string,
  ): Promise<{ size: number; format: string }> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const size = parseInt(response.headers.get('content-length') || '0');
      const contentType = response.headers.get('content-type') || '';
      const format = contentType.split('/')[1] || 'unknown';

      return { size, format };
    } catch (error) {
      return { size: 0, format: 'unknown' };
    }
  }

  private async optimizeImage(
    url: string,
    settings: MobileOptimizationSettings,
  ): Promise<{
    url: string;
    size: number;
    format: string;
  }> {
    // Placeholder implementation - would integrate with actual image optimization service
    return {
      url: url + '?optimized=true',
      size: 50000, // Simulated optimized size
      format: settings.enableWebP ? 'webp' : 'jpeg',
    };
  }

  private calculateOptimalQuality(
    assetType: AssetOptimization['assetType'],
  ): number {
    switch (assetType) {
      case 'image':
        return 85;
      case 'video':
        return 80;
      default:
        return 90;
    }
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  // CDN provider specific purge methods (placeholder implementations)
  private async purgeCloudflareCache(
    config: CDNConfig,
    urls: string[],
  ): Promise<boolean> {
    // Implementation would call Cloudflare Purge API
    return true;
  }

  private async purgeAWSCache(
    config: CDNConfig,
    urls: string[],
  ): Promise<boolean> {
    // Implementation would call CloudFront Invalidation API
    return true;
  }

  private async purgeVercelCache(
    config: CDNConfig,
    urls: string[],
  ): Promise<boolean> {
    // Implementation would call Vercel Purge API
    return true;
  }
}

export default CDNOptimizer;
export type {
  CDNConfig,
  AssetOptimization,
  CacheRule,
  CDNMetrics,
  MobileOptimizationSettings,
};
