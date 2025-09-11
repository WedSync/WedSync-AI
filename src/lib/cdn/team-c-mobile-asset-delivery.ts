import React from 'react';

/**
 * WS-173 Team D Round 2: Mobile Asset Delivery Integration with Team C's CDN
 *
 * Advanced CDN integration for mobile-optimized asset delivery:
 * - Dynamic format selection (WebP, AVIF for modern browsers)
 * - Responsive image optimization with device-aware sizing
 * - Wedding-specific asset prioritization
 * - Network-aware quality adjustment
 * - Critical asset preloading for mobile performance
 * - CDN edge location optimization for venue connectivity
 */

interface MobileAssetConfig {
  baseUrl: string;
  regions: string[];
  formats: ('webp' | 'avif' | 'jpeg' | 'png')[];
  qualities: number[];
  breakpoints: number[];
  weddingPriorities: WeddingAssetPriority[];
}

interface WeddingAssetPriority {
  phase: 'planning' | 'ceremony' | 'reception' | 'post-wedding';
  assetTypes: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  preloadStrategy: 'immediate' | 'idle' | 'visible' | 'never';
}

interface AssetDeliveryMetrics {
  loadTime: number;
  transferSize: number;
  compressionRatio: number;
  cacheHitRate: number;
  edgeLatency: number;
  mobileOptimization: number;
}

interface MobileAssetRequest {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  loading?: 'eager' | 'lazy';
  weddingContext?: {
    phase: string;
    role: string;
    deviceType: string;
  };
}

class TeamCMobileAssetDelivery {
  private config: MobileAssetConfig;
  private networkAdapter: any;
  private metrics: AssetDeliveryMetrics;
  private assetCache: Map<string, string>;
  private preloadQueue: Set<string>;
  private observerintersection?: IntersectionObserver;

  constructor() {
    this.config = {
      baseUrl: 'https://cdn-team-c.wedsync.com',
      regions: ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'],
      formats: ['avif', 'webp', 'jpeg'],
      qualities: [40, 60, 80, 95],
      breakpoints: [320, 640, 768, 1024, 1280, 1920],
      weddingPriorities: [
        {
          phase: 'ceremony',
          assetTypes: ['timeline', 'seating-chart', 'program'],
          priority: 'critical',
          preloadStrategy: 'immediate',
        },
        {
          phase: 'reception',
          assetTypes: ['menu', 'music-playlist', 'photo-booth'],
          priority: 'high',
          preloadStrategy: 'visible',
        },
        {
          phase: 'planning',
          assetTypes: ['venue-photos', 'vendor-portfolios'],
          priority: 'medium',
          preloadStrategy: 'idle',
        },
      ],
    };

    this.metrics = {
      loadTime: 0,
      transferSize: 0,
      compressionRatio: 0,
      cacheHitRate: 0,
      edgeLatency: 0,
      mobileOptimization: 0,
    };

    this.assetCache = new Map();
    this.preloadQueue = new Set();
    this.initializeIntersectionObserver();
  }

  /**
   * Initialize intersection observer for lazy loading optimization
   */
  private initializeIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observerintersection = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              if (src) {
                this.loadAsset(src).then((optimizedSrc) => {
                  img.src = optimizedSrc;
                  img.classList.remove('lazy-loading');
                  img.classList.add('lazy-loaded');
                });
                this.observerintersection?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1,
        },
      );
    }
  }

  /**
   * Get optimal CDN region based on user location and latency
   */
  private async getOptimalRegion(): Promise<string> {
    try {
      // Simulate latency testing to different regions
      const latencyTests = await Promise.all(
        this.config.regions.map(async (region) => {
          const start = performance.now();
          try {
            await fetch(
              `${this.config.baseUrl}/health-check?region=${region}`,
              {
                method: 'HEAD',
                cache: 'no-cache',
              },
            );
            const latency = performance.now() - start;
            return { region, latency };
          } catch {
            return { region, latency: Infinity };
          }
        }),
      );

      const optimal = latencyTests.reduce((best, current) =>
        current.latency < best.latency ? current : best,
      );

      return optimal.region;
    } catch {
      // Fallback to default region
      return this.config.regions[0];
    }
  }

  /**
   * Detect optimal image format based on browser support
   */
  private getSupportedFormat(): string {
    if (typeof window === 'undefined') return 'jpeg';

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Check AVIF support
    if (canvas.toDataURL('image/avif').indexOf('image/avif') !== -1) {
      return 'avif';
    }

    // Check WebP support
    if (canvas.toDataURL('image/webp').indexOf('image/webp') !== -1) {
      return 'webp';
    }

    return 'jpeg';
  }

  /**
   * Calculate optimal image dimensions for mobile device
   */
  private getOptimalDimensions(
    originalWidth?: number,
    originalHeight?: number,
  ): {
    width: number;
    height: number;
  } {
    const devicePixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const screenWidth =
      typeof window !== 'undefined' ? window.screen.width : 375;

    // Find appropriate breakpoint
    const breakpoint =
      this.config.breakpoints.find((bp) => bp >= screenWidth) ||
      this.config.breakpoints[this.config.breakpoints.length - 1];

    const targetWidth = Math.min(
      breakpoint * devicePixelRatio,
      originalWidth || breakpoint,
    );

    if (originalWidth && originalHeight) {
      const aspectRatio = originalHeight / originalWidth;
      return {
        width: targetWidth,
        height: Math.round(targetWidth * aspectRatio),
      };
    }

    return { width: targetWidth, height: targetWidth };
  }

  /**
   * Get network-aware quality setting
   */
  private getNetworkAwareQuality(): number {
    if (typeof navigator === 'undefined') return 80;

    const connection = (navigator as any).connection;
    if (!connection) return 80;

    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink || 1;

    // Adjust quality based on network conditions
    if (effectiveType === '4g' && downlink > 10) return 95;
    if (effectiveType === '4g' && downlink > 5) return 80;
    if (effectiveType === '3g') return 60;
    if (effectiveType === '2g') return 40;

    return 80; // Default
  }

  /**
   * Build optimized CDN URL with mobile-specific parameters
   */
  private async buildCDNUrl(request: MobileAssetRequest): Promise<string> {
    const region = await this.getOptimalRegion();
    const format = request.format || this.getSupportedFormat();
    const quality = request.quality || this.getNetworkAwareQuality();
    const dimensions = this.getOptimalDimensions(request.width, request.height);

    const params = new URLSearchParams({
      w: dimensions.width.toString(),
      h: dimensions.height.toString(),
      q: quality.toString(),
      f: format,
      region,
      mobile: '1',
      dpr: (typeof window !== 'undefined'
        ? window.devicePixelRatio || 1
        : 1
      ).toString(),
    });

    // Add wedding context parameters for CDN optimization
    if (request.weddingContext) {
      params.set('phase', request.weddingContext.phase);
      params.set('role', request.weddingContext.role);
      params.set('device', request.weddingContext.deviceType);
    }

    return `${this.config.baseUrl}/${request.src}?${params.toString()}`;
  }

  /**
   * Load and optimize asset with mobile-specific optimizations
   */
  async loadAsset(
    src: string,
    options: Partial<MobileAssetRequest> = {},
  ): Promise<string> {
    const request: MobileAssetRequest = {
      src,
      ...options,
    };

    const cacheKey = JSON.stringify(request);

    // Check cache first
    if (this.assetCache.has(cacheKey)) {
      this.metrics.cacheHitRate++;
      return this.assetCache.get(cacheKey)!;
    }

    const startTime = performance.now();

    try {
      const optimizedUrl = await this.buildCDNUrl(request);

      // For critical assets, preload them
      if (request.priority === 'critical') {
        this.preloadAsset(optimizedUrl);
      }

      // Cache the optimized URL
      this.assetCache.set(cacheKey, optimizedUrl);

      // Update metrics
      const loadTime = performance.now() - startTime;
      this.updateMetrics(loadTime);

      return optimizedUrl;
    } catch (error) {
      console.error('CDN asset optimization failed:', error);
      return src; // Fallback to original source
    }
  }

  /**
   * Preload critical assets for wedding phases
   */
  async preloadCriticalAssets(
    weddingPhase: string,
    role: string,
  ): Promise<void> {
    const priorities = this.config.weddingPriorities.find(
      (p) => p.phase === weddingPhase,
    );
    if (!priorities || priorities.preloadStrategy === 'never') return;

    const criticalAssets = this.getCriticalAssetsForPhase(weddingPhase, role);

    for (const asset of criticalAssets) {
      if (!this.preloadQueue.has(asset.src)) {
        this.preloadQueue.add(asset.src);

        try {
          const optimizedUrl = await this.loadAsset(asset.src, {
            priority: 'critical',
            weddingContext: { phase: weddingPhase, role, deviceType: 'mobile' },
          });

          this.preloadAsset(optimizedUrl);
        } catch (error) {
          console.warn('Failed to preload critical asset:', asset.src, error);
        }
      }
    }
  }

  /**
   * Preload asset using link rel=preload
   */
  private preloadAsset(url: string): void {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'image';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  /**
   * Get critical assets for specific wedding phase and role
   */
  private getCriticalAssetsForPhase(
    phase: string,
    role: string,
  ): Array<{ src: string; priority: string }> {
    // This would typically come from your wedding data
    const assetMap: Record<string, Array<{ src: string; priority: string }>> = {
      ceremony: [
        { src: 'wedding-timeline.jpg', priority: 'critical' },
        { src: 'seating-chart.jpg', priority: 'critical' },
        { src: 'ceremony-program.pdf', priority: 'high' },
      ],
      reception: [
        { src: 'reception-menu.jpg', priority: 'critical' },
        { src: 'music-playlist.jpg', priority: 'high' },
        { src: 'photo-booth-props.jpg', priority: 'medium' },
      ],
      planning: [
        { src: 'venue-gallery.jpg', priority: 'medium' },
        { src: 'vendor-portfolios.jpg', priority: 'medium' },
      ],
    };

    return assetMap[phase] || [];
  }

  /**
   * Setup lazy loading for images
   */
  setupLazyLoading(
    img: HTMLImageElement,
    src: string,
    options: Partial<MobileAssetRequest> = {},
  ): void {
    if (!this.observerintersection) {
      // Fallback for browsers without IntersectionObserver
      this.loadAsset(src, options).then((optimizedSrc) => {
        img.src = optimizedSrc;
      });
      return;
    }

    img.dataset.src = src;
    img.classList.add('lazy-loading');
    this.observerintersection.observe(img);
  }

  /**
   * Optimize assets for specific wedding context
   */
  async optimizeForWeddingContext(
    assets: string[],
    context: { phase: string; role: string; priority: string },
  ): Promise<string[]> {
    const optimizedAssets = await Promise.all(
      assets.map((src) =>
        this.loadAsset(src, {
          priority: context.priority as any,
          weddingContext: {
            phase: context.phase,
            role: context.role,
            deviceType: 'mobile',
          },
        }),
      ),
    );

    return optimizedAssets;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(loadTime: number): void {
    this.metrics.loadTime = (this.metrics.loadTime + loadTime) / 2;
    this.metrics.mobileOptimization = this.calculateMobileOptimizationScore();
  }

  /**
   * Calculate mobile optimization score based on various factors
   */
  private calculateMobileOptimizationScore(): number {
    const factors = {
      loadTime: Math.max(0, 100 - this.metrics.loadTime / 10),
      cacheHitRate: this.metrics.cacheHitRate,
      compressionRatio: this.metrics.compressionRatio,
      edgeLatency: Math.max(0, 100 - this.metrics.edgeLatency / 5),
    };

    return Object.values(factors).reduce((sum, score) => sum + score, 0) / 4;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): AssetDeliveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear asset cache (useful for development or memory management)
   */
  clearCache(): void {
    this.assetCache.clear();
    this.preloadQueue.clear();
  }

  /**
   * Destroy the CDN integration instance
   */
  destroy(): void {
    this.observerintersection?.disconnect();
    this.clearCache();
  }
}

/**
 * React hook for Team C mobile asset delivery integration
 */
export function useTeamCMobileAssetDelivery() {
  const [cdnIntegration] = React.useState(() => new TeamCMobileAssetDelivery());
  const [metrics, setMetrics] = React.useState<AssetDeliveryMetrics | null>(
    null,
  );

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(cdnIntegration.getMetrics());
    };

    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial metrics

    return () => {
      clearInterval(interval);
      cdnIntegration.destroy();
    };
  }, [cdnIntegration]);

  const loadOptimizedAsset = React.useCallback(
    (src: string, options?: Partial<MobileAssetRequest>) => {
      return cdnIntegration.loadAsset(src, options);
    },
    [cdnIntegration],
  );

  const preloadCriticalAssets = React.useCallback(
    (phase: string, role: string) => {
      return cdnIntegration.preloadCriticalAssets(phase, role);
    },
    [cdnIntegration],
  );

  const setupLazyLoading = React.useCallback(
    (
      img: HTMLImageElement,
      src: string,
      options?: Partial<MobileAssetRequest>,
    ) => {
      cdnIntegration.setupLazyLoading(img, src, options);
    },
    [cdnIntegration],
  );

  return {
    loadOptimizedAsset,
    preloadCriticalAssets,
    setupLazyLoading,
    metrics,
    optimizeForWeddingContext:
      cdnIntegration.optimizeForWeddingContext.bind(cdnIntegration),
    clearCache: cdnIntegration.clearCache.bind(cdnIntegration),
  };
}

export default TeamCMobileAssetDelivery;
export type { MobileAssetRequest, AssetDeliveryMetrics, WeddingAssetPriority };
