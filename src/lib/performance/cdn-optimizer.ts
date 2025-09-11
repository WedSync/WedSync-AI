// WS-173: CDN Optimization Manager for Wedding Photo Performance
'use client';

interface CDNConfig {
  regions: {
    [key: string]: {
      endpoint: string;
      priority: number;
      latencyThreshold: number;
    };
  };
  formats: {
    modern: string[];
    fallback: string[];
  };
  qualitySettings: {
    [networkType: string]: {
      quality: number;
      format: string;
      maxWidth: number;
    };
  };
}

interface GeographicPerformanceMetrics {
  region: string;
  averageLatency: number;
  cacheHitRatio: number;
  errorRate: number;
  lastUpdated: number;
}

interface AssetOptimizationOptions {
  src: string;
  networkType?: string;
  geographic?: 'auto' | 'us' | 'eu' | 'asia';
  isWeddingPhoto?: boolean;
  venue?: string;
  quality?: number;
  maxWidth?: number;
}

class CDNOptimizer {
  private config: CDNConfig;
  private performanceMetrics: Map<string, GeographicPerformanceMetrics>;
  private networkMonitor: NetworkInformation | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.performanceMetrics = new Map();
    this.initializeNetworkMonitoring();
  }

  private getDefaultConfig(): CDNConfig {
    return {
      regions: {
        'us-east-1': {
          endpoint: 'https://cdn-us-east.supabase.co',
          priority: 1,
          latencyThreshold: 100,
        },
        'us-west-1': {
          endpoint: 'https://cdn-us-west.supabase.co',
          priority: 2,
          latencyThreshold: 120,
        },
        'eu-west-1': {
          endpoint: 'https://cdn-eu-west.supabase.co',
          priority: 1,
          latencyThreshold: 150,
        },
        'ap-southeast-1': {
          endpoint: 'https://cdn-asia.supabase.co',
          priority: 1,
          latencyThreshold: 200,
        },
      },
      formats: {
        modern: ['avif', 'webp'],
        fallback: ['jpeg', 'png'],
      },
      qualitySettings: {
        'slow-2g': { quality: 40, format: 'webp', maxWidth: 600 },
        '2g': { quality: 50, format: 'webp', maxWidth: 800 },
        '3g': { quality: 70, format: 'webp', maxWidth: 1200 },
        '4g': { quality: 85, format: 'avif', maxWidth: 1920 },
        unknown: { quality: 75, format: 'webp', maxWidth: 1200 },
      },
    };
  }

  private initializeNetworkMonitoring(): void {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      this.networkMonitor = (navigator as any).connection;
    }
  }

  /**
   * WS-173: Optimize asset URL for geographic and network conditions
   */
  public optimizeAsset(options: AssetOptimizationOptions): string {
    const {
      src,
      networkType = this.getCurrentNetworkType(),
      geographic = 'auto',
      isWeddingPhoto = false,
      venue,
      quality,
      maxWidth,
    } = options;

    // Skip optimization for non-CDN URLs
    if (!this.isCDNUrl(src)) {
      return src;
    }

    const url = new URL(src);
    const qualitySettings =
      this.config.qualitySettings[networkType] ||
      this.config.qualitySettings.unknown;

    // Apply quality optimization
    const targetQuality = quality || qualitySettings.quality;
    url.searchParams.set('q', targetQuality.toString());

    // Apply format optimization
    url.searchParams.set('format', qualitySettings.format);

    // Apply width optimization
    const targetWidth = maxWidth || qualitySettings.maxWidth;
    url.searchParams.set('w', targetWidth.toString());

    // Geographic optimization
    if (geographic !== 'auto') {
      url.searchParams.set('geo', geographic);
    } else {
      const detectedRegion = this.detectOptimalRegion();
      if (detectedRegion) {
        url.searchParams.set('geo', detectedRegion);
      }
    }

    // Wedding photo specific optimizations
    if (isWeddingPhoto) {
      url.searchParams.set('auto', 'compress,enhance');
      url.searchParams.set('fit', 'cover');

      if (venue) {
        url.searchParams.set('venue', encodeURIComponent(venue));
      }

      // Wedding day priority routing
      url.searchParams.set('priority', 'high');
    }

    return url.toString();
  }

  /**
   * WS-173: Generate responsive srcset with CDN optimization
   */
  public generateResponsiveSrcSet(
    baseSrc: string,
    widths: number[] = [400, 800, 1200, 1600, 2000],
    options: Omit<AssetOptimizationOptions, 'src'> = {},
  ): string {
    if (!this.isCDNUrl(baseSrc)) {
      return baseSrc;
    }

    const srcsetEntries = widths.map((width) => {
      const optimizedSrc = this.optimizeAsset({
        ...options,
        src: baseSrc,
        maxWidth: width,
      });
      return `${optimizedSrc} ${width}w`;
    });

    return srcsetEntries.join(', ');
  }

  /**
   * WS-173: Preload critical wedding assets
   */
  public preloadCriticalAssets(
    assets: Array<{
      src: string;
      isWeddingPhoto?: boolean;
      venue?: string;
      priority?: 'high' | 'medium' | 'low';
    }>,
  ): void {
    assets.forEach((asset) => {
      const optimizedSrc = this.optimizeAsset({
        src: asset.src,
        isWeddingPhoto: asset.isWeddingPhoto,
        venue: asset.venue,
      });

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;

      if (asset.priority) {
        link.setAttribute('fetchpriority', asset.priority);
      }

      document.head.appendChild(link);
    });
  }

  /**
   * WS-173: Monitor geographic performance
   */
  public async measureRegionPerformance(
    region: string,
  ): Promise<GeographicPerformanceMetrics> {
    const regionConfig = this.config.regions[region];
    if (!regionConfig) {
      throw new Error(`Unknown region: ${region}`);
    }

    const startTime = performance.now();

    try {
      // Test latency with a small request
      const testUrl = `${regionConfig.endpoint}/ping`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
      });

      const latency = performance.now() - startTime;
      const cacheHit = response.headers.get('cf-cache-status') === 'HIT';

      const metrics: GeographicPerformanceMetrics = {
        region,
        averageLatency: latency,
        cacheHitRatio: cacheHit ? 1 : 0,
        errorRate: response.ok ? 0 : 1,
        lastUpdated: Date.now(),
      };

      this.performanceMetrics.set(region, metrics);
      return metrics;
    } catch (error) {
      const metrics: GeographicPerformanceMetrics = {
        region,
        averageLatency: 9999,
        cacheHitRatio: 0,
        errorRate: 1,
        lastUpdated: Date.now(),
      };

      this.performanceMetrics.set(region, metrics);
      return metrics;
    }
  }

  /**
   * WS-173: Get performance metrics for all regions
   */
  public async getAllRegionMetrics(): Promise<
    Map<string, GeographicPerformanceMetrics>
  > {
    const regions = Object.keys(this.config.regions);

    await Promise.allSettled(
      regions.map((region) => this.measureRegionPerformance(region)),
    );

    return this.performanceMetrics;
  }

  /**
   * WS-173: Detect optimal CDN region based on performance
   */
  private detectOptimalRegion(): string | null {
    if (this.performanceMetrics.size === 0) {
      return null;
    }

    let bestRegion = '';
    let bestScore = Infinity;

    for (const [region, metrics] of this.performanceMetrics) {
      // Score based on latency and error rate (lower is better)
      const score = metrics.averageLatency + metrics.errorRate * 1000;

      if (score < bestScore) {
        bestScore = score;
        bestRegion = region;
      }
    }

    return bestRegion || null;
  }

  private getCurrentNetworkType(): string {
    if (this.networkMonitor) {
      return this.networkMonitor.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private isCDNUrl(url: string): boolean {
    return (
      url.includes('supabase.co') ||
      url.includes('cdn.') ||
      url.includes('cloudfront.net') ||
      url.includes('cloudflare.com')
    );
  }

  /**
   * WS-173: Cache performance optimization
   */
  public getCacheOptimizationHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      Expires: new Date(Date.now() + 31536000000).toUTCString(),
      Vary: 'Accept, Accept-Encoding',
      'X-Content-Type-Options': 'nosniff',
    };
  }

  /**
   * WS-173: Asset compression optimization
   */
  public getCompressionSettings(networkType: string) {
    const settings =
      this.config.qualitySettings[networkType] ||
      this.config.qualitySettings.unknown;

    return {
      quality: settings.quality,
      format: settings.format,
      progressive: true,
      optimizeScans: true,
      strip: ['exif', 'icc'], // Remove metadata to reduce size
      mozjpeg: networkType === 'slow-2g' || networkType === '2g',
    };
  }
}

// WS-173: Global CDN optimizer instance
export const cdnOptimizer = new CDNOptimizer();

// WS-173: Wedding photo optimization helpers
export const weddingPhotoOptimization = {
  /**
   * Optimize wedding photo for mobile venues
   */
  optimizeForVenue: (src: string, venue?: string, networkType?: string) => {
    return cdnOptimizer.optimizeAsset({
      src,
      isWeddingPhoto: true,
      venue,
      networkType,
      geographic: 'auto',
    });
  },

  /**
   * Generate wedding photo srcset for responsive loading
   */
  generateWeddingPhotoSrcSet: (src: string, venue?: string) => {
    return cdnOptimizer.generateResponsiveSrcSet(src, [600, 1000, 1600, 2400], {
      isWeddingPhoto: true,
      venue,
    });
  },

  /**
   * Preload critical wedding day photos
   */
  preloadWeddingDayPhotos: (photos: Array<{ src: string; venue?: string }>) => {
    const assets = photos.map((photo) => ({
      ...photo,
      isWeddingPhoto: true,
      priority: 'high' as const,
    }));

    cdnOptimizer.preloadCriticalAssets(assets);
  },
};

export default cdnOptimizer;
