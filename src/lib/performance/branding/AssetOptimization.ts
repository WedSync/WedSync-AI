/**
 * WS-221 Team D - Branding Asset Optimization System
 * High-performance asset management for mobile branding customization
 */

export interface BrandAsset {
  id: string;
  type: 'logo' | 'background' | 'theme' | 'favicon' | 'watermark';
  originalUrl: string;
  optimizedUrls: {
    mobile: string;
    tablet: string;
    desktop: string;
    thumbnail: string;
  };
  metadata: {
    size: number;
    dimensions: { width: number; height: number };
    format: string;
    optimizedAt: Date;
    compressionRatio: number;
  };
}

export interface OptimizationConfig {
  quality: number; // 0.1 to 1.0
  maxWidth: number;
  maxHeight: number;
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  progressive: boolean;
  cacheControl: string;
}

export class AssetOptimizer {
  private static instance: AssetOptimizer;
  private cache = new Map<string, BrandAsset>();
  private compressionWorker?: Worker;

  private readonly mobileConfig: OptimizationConfig = {
    quality: 0.8,
    maxWidth: 400,
    maxHeight: 400,
    format: 'webp',
    progressive: true,
    cacheControl: 'public, max-age=31536000', // 1 year
  };

  private readonly desktopConfig: OptimizationConfig = {
    quality: 0.9,
    maxWidth: 1200,
    maxHeight: 1200,
    format: 'webp',
    progressive: true,
    cacheControl: 'public, max-age=31536000',
  };

  public static getInstance(): AssetOptimizer {
    if (!AssetOptimizer.instance) {
      AssetOptimizer.instance = new AssetOptimizer();
    }
    return AssetOptimizer.instance;
  }

  /**
   * Optimize brand asset for multiple device sizes
   */
  async optimizeAsset(
    file: File,
    assetType: BrandAsset['type'],
  ): Promise<BrandAsset> {
    const startTime = performance.now();
    const assetId = this.generateAssetId(file);

    try {
      // Check cache first
      const cached = this.cache.get(assetId);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Create canvas for optimization
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = await this.loadImage(file);
      const originalDimensions = { width: img.width, height: img.height };

      // Generate optimized versions for different screen sizes
      const optimizedUrls = {
        mobile: await this.optimizeForDevice(
          img,
          this.mobileConfig,
          canvas,
          ctx,
        ),
        tablet: await this.optimizeForDevice(
          img,
          { ...this.mobileConfig, maxWidth: 800, maxHeight: 800 },
          canvas,
          ctx,
        ),
        desktop: await this.optimizeForDevice(
          img,
          this.desktopConfig,
          canvas,
          ctx,
        ),
        thumbnail: await this.optimizeForDevice(
          img,
          { ...this.mobileConfig, maxWidth: 150, maxHeight: 150, quality: 0.7 },
          canvas,
          ctx,
        ),
      };

      const optimizedAsset: BrandAsset = {
        id: assetId,
        type: assetType,
        originalUrl: URL.createObjectURL(file),
        optimizedUrls,
        metadata: {
          size: file.size,
          dimensions: originalDimensions,
          format: file.type,
          optimizedAt: new Date(),
          compressionRatio: this.calculateCompressionRatio(
            file.size,
            optimizedUrls,
          ),
        },
      };

      // Cache the optimized asset
      this.cache.set(assetId, optimizedAsset);

      // Log performance metrics
      const optimizationTime = performance.now() - startTime;
      this.logOptimizationMetrics(assetId, optimizationTime, optimizedAsset);

      return optimizedAsset;
    } catch (error) {
      console.error(`Asset optimization failed for ${assetId}:`, error);
      throw new Error(`Failed to optimize ${assetType} asset`);
    }
  }

  /**
   * Preload critical brand assets for mobile performance
   */
  async preloadCriticalAssets(organizationId: string): Promise<void> {
    const criticalAssets = await this.getCriticalAssets(organizationId);

    const preloadPromises = criticalAssets.map(async (asset) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = this.selectOptimalAssetUrl(asset);
      document.head.appendChild(link);

      return new Promise<void>((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve(); // Don't fail the whole process
        setTimeout(resolve, 2000); // Timeout fallback
      });
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    cacheHitRate: number;
    averageCompressionRatio: number;
    totalOptimizedAssets: number;
    cacheSize: number;
  } {
    const assets = Array.from(this.cache.values());
    const totalCompressionRatio = assets.reduce(
      (sum, asset) => sum + asset.metadata.compressionRatio,
      0,
    );

    return {
      cacheHitRate: this.calculateCacheHitRate(),
      averageCompressionRatio:
        assets.length > 0 ? totalCompressionRatio / assets.length : 0,
      totalOptimizedAssets: assets.length,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear cache and free memory
   */
  clearCache(): void {
    this.cache.forEach((asset) => {
      // Revoke object URLs to free memory
      URL.revokeObjectURL(asset.originalUrl);
      Object.values(asset.optimizedUrls).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    });
    this.cache.clear();
  }

  // Private helper methods
  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async optimizeForDevice(
    img: HTMLImageElement,
    config: OptimizationConfig,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): Promise<string> {
    const { width, height } = this.calculateOptimalDimensions(
      img.width,
      img.height,
      config.maxWidth,
      config.maxHeight,
    );

    canvas.width = width;
    canvas.height = height;

    // Use high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas and draw optimized image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to optimized format
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(img.src); // Fallback to original
          }
        },
        this.getMimeType(config.format),
        config.quality,
      );
    });
  }

  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = Math.min(originalWidth, maxWidth);
    let height = Math.min(originalHeight, maxHeight);

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  private getMimeType(format: OptimizationConfig['format']): string {
    const mimeTypes = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
      avif: 'image/avif',
    };
    return mimeTypes[format] || 'image/webp';
  }

  private generateAssetId(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  private isCacheValid(asset: BrandAsset): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Date.now() - asset.metadata.optimizedAt.getTime() < oneDayMs;
  }

  private async getCriticalAssets(
    organizationId: string,
  ): Promise<BrandAsset[]> {
    // In real implementation, fetch from database
    return Array.from(this.cache.values()).filter(
      (asset) => asset.type === 'logo' || asset.type === 'favicon',
    );
  }

  private selectOptimalAssetUrl(asset: BrandAsset): string {
    // Select based on device characteristics
    if (window.innerWidth <= 768) {
      return asset.optimizedUrls.mobile;
    } else if (window.innerWidth <= 1024) {
      return asset.optimizedUrls.tablet;
    }
    return asset.optimizedUrls.desktop;
  }

  private calculateCompressionRatio(
    originalSize: number,
    optimizedUrls: BrandAsset['optimizedUrls'],
  ): number {
    // Estimate compression ratio (in real implementation, calculate from actual optimized file sizes)
    return 0.7; // Placeholder
  }

  private calculateCacheHitRate(): number {
    // Track cache hits vs misses (implement in real usage)
    return 0.85; // Placeholder
  }

  private logOptimizationMetrics(
    assetId: string,
    time: number,
    asset: BrandAsset,
  ): void {
    console.log(
      `[AssetOptimizer] Optimized ${assetId} in ${time.toFixed(2)}ms`,
      {
        type: asset.type,
        compressionRatio: asset.metadata.compressionRatio,
        dimensions: asset.metadata.dimensions,
      },
    );
  }
}

export const assetOptimizer = AssetOptimizer.getInstance();
