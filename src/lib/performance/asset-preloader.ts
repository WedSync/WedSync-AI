// WS-173: Asset Preloading Service for Critical Wedding Resources
'use client';

import { cdnOptimizer } from './cdn-optimizer';

interface PreloadOptions {
  priority: 'high' | 'medium' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  media?: string;
  as?: 'image' | 'script' | 'style' | 'font' | 'video' | 'audio';
}

interface WeddingAsset {
  src: string;
  type:
    | 'hero-image'
    | 'timeline-photo'
    | 'vendor-photo'
    | 'critical-css'
    | 'critical-js';
  venue?: string;
  priority: 'critical' | 'important' | 'normal';
  isWeddingPhoto?: boolean;
}

interface PreloadMetrics {
  assetSrc: string;
  preloadTime: number;
  actualLoadTime: number;
  cacheHit: boolean;
  networkType: string;
  venue?: string;
}

class AssetPreloader {
  private preloadedAssets = new Set<string>();
  private preloadMetrics: PreloadMetrics[] = [];
  private observer: IntersectionObserver | null = null;
  private networkType = 'unknown';

  constructor() {
    this.initializeNetworkMonitoring();
    this.initializeIntersectionObserver();
  }

  private initializeNetworkMonitoring(): void {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkType = connection.effectiveType || 'unknown';

        connection.addEventListener('change', () => {
          this.networkType = connection.effectiveType || 'unknown';
        });
      }
    }
  }

  private initializeIntersectionObserver(): void {
    if (typeof window !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const assetSrc = element.dataset.preloadSrc;
              if (assetSrc && !this.preloadedAssets.has(assetSrc)) {
                this.preloadAsset(assetSrc, {
                  priority: 'medium',
                  as: 'image',
                });
              }
            }
          });
        },
        { rootMargin: '200px' }, // Start preloading 200px before element comes into view
      );
    }
  }

  /**
   * WS-173: Preload critical wedding day assets
   */
  public preloadCriticalWeddingAssets(assets: WeddingAsset[]): Promise<void[]> {
    const criticalAssets = assets.filter(
      (asset) => asset.priority === 'critical',
    );
    const importantAssets = assets.filter(
      (asset) => asset.priority === 'important',
    );

    // Preload critical assets immediately
    const criticalPromises = criticalAssets.map((asset) =>
      this.preloadWeddingAsset(asset),
    );

    // Preload important assets after critical ones
    Promise.all(criticalPromises).then(() => {
      importantAssets.forEach((asset) => this.preloadWeddingAsset(asset));
    });

    return Promise.all(criticalPromises);
  }

  /**
   * WS-173: Preload wedding asset with optimization
   */
  private async preloadWeddingAsset(asset: WeddingAsset): Promise<void> {
    const optimizedSrc = asset.isWeddingPhoto
      ? cdnOptimizer.optimizeAsset({
          src: asset.src,
          isWeddingPhoto: true,
          venue: asset.venue,
          networkType: this.networkType,
        })
      : asset.src;

    const options: PreloadOptions = {
      priority: this.mapPriorityToFetchPriority(asset.priority),
      as: this.getAssetType(asset.type),
    };

    return this.preloadAsset(optimizedSrc, options);
  }

  /**
   * WS-173: Generic asset preloading with performance tracking
   */
  public preloadAsset(src: string, options: PreloadOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedAssets.has(src)) {
        resolve();
        return;
      }

      const startTime = performance.now();
      const link = document.createElement('link');

      link.rel = 'preload';
      link.href = src;
      link.as = options.as || 'image';

      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin;
      }

      if (options.integrity) {
        link.integrity = options.integrity;
      }

      if (options.media) {
        link.media = options.media;
      }

      // Set fetch priority if supported
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = options.priority;
      }

      link.onload = () => {
        const preloadTime = performance.now() - startTime;

        this.preloadMetrics.push({
          assetSrc: src,
          preloadTime,
          actualLoadTime: 0, // Will be updated when asset is actually used
          cacheHit: true, // Assuming cache hit since preloaded
          networkType: this.networkType,
        });

        this.preloadedAssets.add(src);
        resolve();
      };

      link.onerror = () => {
        console.warn(`Failed to preload asset: ${src}`);
        reject(new Error(`Failed to preload: ${src}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * WS-173: Preload wedding day timeline photos
   */
  public preloadTimelinePhotos(
    timelineItems: Array<{
      photoUrl?: string;
      venue?: string;
      time?: string;
    }>,
  ): void {
    const photos = timelineItems
      .filter((item) => item.photoUrl)
      .map((item) => ({
        src: item.photoUrl!,
        type: 'timeline-photo' as const,
        venue: item.venue,
        priority: 'important' as const,
        isWeddingPhoto: true,
      }));

    this.preloadCriticalWeddingAssets(photos);
  }

  /**
   * WS-173: Preload vendor portfolio images
   */
  public preloadVendorPhotos(
    vendors: Array<{
      portfolioImages: string[];
      name?: string;
    }>,
  ): void {
    const assets: WeddingAsset[] = [];

    vendors.forEach((vendor) => {
      // Preload first 3 images from each vendor portfolio
      vendor.portfolioImages.slice(0, 3).forEach((imageSrc, index) => {
        assets.push({
          src: imageSrc,
          type: 'vendor-photo',
          venue: vendor.name,
          priority: index === 0 ? 'important' : 'normal',
          isWeddingPhoto: false,
        });
      });
    });

    this.preloadCriticalWeddingAssets(assets);
  }

  /**
   * WS-173: Smart preloading based on user behavior
   */
  public preloadBasedOnUserIntent(
    currentPage: string,
    userBehavior: {
      timeOnPage: number;
      scrollDepth: number;
      clickedElements: string[];
    },
  ): void {
    // Predict next likely pages based on current behavior
    const likelyNextAssets = this.predictNextAssets(currentPage, userBehavior);

    // Preload with lower priority
    likelyNextAssets.forEach((asset) => {
      this.preloadAsset(asset.src, {
        priority: 'low',
        as: asset.as || 'image',
      });
    });
  }

  /**
   * WS-173: Setup lazy loading observer for images
   */
  public observeForLazyPreloading(
    element: HTMLElement,
    assetSrc: string,
  ): void {
    if (!this.observer) return;

    element.dataset.preloadSrc = assetSrc;
    this.observer.observe(element);
  }

  /**
   * WS-173: Preload critical CSS for wedding themes
   */
  public preloadWeddingThemeCSS(themeId: string): Promise<void> {
    const themeCSSUrl = `/themes/${themeId}/critical.css`;

    return this.preloadAsset(themeCSSUrl, {
      priority: 'high',
      as: 'style',
    });
  }

  /**
   * WS-173: Get preload performance metrics
   */
  public getPreloadMetrics(): PreloadMetrics[] {
    return [...this.preloadMetrics];
  }

  /**
   * WS-173: Update actual load time for preloaded asset
   */
  public recordActualLoadTime(assetSrc: string, loadTime: number): void {
    const metric = this.preloadMetrics.find((m) => m.assetSrc === assetSrc);
    if (metric) {
      metric.actualLoadTime = loadTime;
    }
  }

  /**
   * WS-173: Clear preload metrics (for privacy)
   */
  public clearMetrics(): void {
    this.preloadMetrics = [];
  }

  /**
   * WS-173: Get cache hit ratio for preloaded assets
   */
  public getCacheHitRatio(): number {
    if (this.preloadMetrics.length === 0) return 0;

    const cacheHits = this.preloadMetrics.filter((m) => m.cacheHit).length;
    return cacheHits / this.preloadMetrics.length;
  }

  private mapPriorityToFetchPriority(
    priority: 'critical' | 'important' | 'normal',
  ): 'high' | 'medium' | 'low' {
    switch (priority) {
      case 'critical':
        return 'high';
      case 'important':
        return 'medium';
      case 'normal':
        return 'low';
      default:
        return 'medium';
    }
  }

  private getAssetType(
    type: WeddingAsset['type'],
  ): 'image' | 'script' | 'style' | 'font' | 'video' | 'audio' {
    switch (type) {
      case 'hero-image':
      case 'timeline-photo':
      case 'vendor-photo':
        return 'image';
      case 'critical-css':
        return 'style';
      case 'critical-js':
        return 'script';
      default:
        return 'image';
    }
  }

  private predictNextAssets(
    currentPage: string,
    behavior: {
      timeOnPage: number;
      scrollDepth: number;
      clickedElements: string[];
    },
  ): Array<{ src: string; as?: string }> {
    const predictions: Array<{ src: string; as?: string }> = [];

    // Basic prediction logic based on common wedding planning flows
    switch (currentPage) {
      case '/dashboard':
        if (behavior.timeOnPage > 5000) {
          // 5 seconds
          predictions.push(
            { src: '/dashboard/timeline', as: 'script' },
            { src: '/dashboard/guests', as: 'script' },
          );
        }
        break;

      case '/dashboard/timeline':
        if (behavior.scrollDepth > 0.5) {
          // Scrolled past 50%
          predictions.push(
            { src: '/dashboard/vendors', as: 'script' },
            { src: '/dashboard/photos', as: 'script' },
          );
        }
        break;

      case '/dashboard/vendors':
        // If user clicked on vendor cards, likely to view portfolios
        if (behavior.clickedElements.includes('vendor-card')) {
          predictions.push({
            src: '/api/vendors/portfolio-images',
            as: 'image',
          });
        }
        break;
    }

    return predictions;
  }

  /**
   * WS-173: Cleanup resources
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.preloadedAssets.clear();
    this.preloadMetrics = [];
  }
}

// WS-173: Global asset preloader instance
export const assetPreloader = new AssetPreloader();

// WS-173: Wedding-specific preloading utilities
export const weddingAssetPreloader = {
  /**
   * Preload assets for wedding day dashboard
   */
  preloadWeddingDayAssets: async (weddingId: string) => {
    const assets: WeddingAsset[] = [
      {
        src: `/api/weddings/${weddingId}/hero-image`,
        type: 'hero-image',
        priority: 'critical',
        isWeddingPhoto: true,
      },
      {
        src: `/api/weddings/${weddingId}/timeline-photos`,
        type: 'timeline-photo',
        priority: 'important',
        isWeddingPhoto: true,
      },
    ];

    return assetPreloader.preloadCriticalWeddingAssets(assets);
  },

  /**
   * Preload vendor-specific assets for wedding
   */
  preloadVendorAssets: (vendors: any[], venue?: string) => {
    const assets: WeddingAsset[] = vendors.map((vendor) => ({
      src: vendor.portfolioImage || vendor.profileImage,
      type: 'vendor-photo',
      venue,
      priority: 'normal',
      isWeddingPhoto: false,
    }));

    return assetPreloader.preloadCriticalWeddingAssets(assets);
  },
};

export default assetPreloader;
