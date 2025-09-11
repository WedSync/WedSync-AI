/**
 * WS-221 Team D - High-Performance Branding System Integration
 * Mobile-optimized branding customization with advanced performance features
 */

export {
  AssetOptimizer,
  assetOptimizer,
  type BrandAsset,
  type OptimizationConfig,
} from './AssetOptimization';

export {
  BrandingPerformanceMonitor,
  brandingPerformanceMonitor,
  type PerformanceMetric,
  type BrandingPerformanceConfig,
} from './BrandingPerformanceMonitor';

export {
  BrandAssetCache,
  brandAssetCache,
  type CacheConfig,
  type CacheEntry,
} from './BrandAssetCache';

export {
  LoadTestingSystem,
  loadTestingSystem,
  BRANDING_TEST_SCENARIOS,
  type LoadTestConfig,
  type LoadTestResult,
  type UploadTestScenario,
} from './LoadTestingSystem';

// Import singletons for the BrandingSystem class
import { assetOptimizer } from './AssetOptimization';
import { brandingPerformanceMonitor } from './BrandingPerformanceMonitor';
import { brandAssetCache } from './BrandAssetCache';
import type { BrandAsset } from './AssetOptimization';

/**
 * High-performance branding system orchestrator
 */
export class BrandingSystem {
  private static instance: BrandingSystem;

  private constructor() {
    this.initializeSystem();
  }

  public static getInstance(): BrandingSystem {
    if (!BrandingSystem.instance) {
      BrandingSystem.instance = new BrandingSystem();
    }
    return BrandingSystem.instance;
  }

  /**
   * Initialize the complete branding system
   */
  async initialize(organizationId: string): Promise<void> {
    try {
      console.log(
        '[BrandingSystem] Initializing high-performance branding system...',
      );

      // Preload critical brand assets
      await assetOptimizer.preloadCriticalAssets(organizationId);
      await brandAssetCache.preloadCriticalAssets(organizationId);

      // Start performance monitoring
      brandingPerformanceMonitor.trackMemoryUsage();

      console.log('[BrandingSystem] System initialization complete');
    } catch (error) {
      console.error('[BrandingSystem] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize and upload brand asset with full performance tracking
   */
  async uploadBrandAsset(
    file: File,
    assetType: BrandAsset['type'],
    organizationId: string,
  ): Promise<BrandAsset> {
    const startTime = performance.now();
    const assetId = `${organizationId}-${assetType}-${file.name}`;

    try {
      // Track cache performance
      const cached = await brandAssetCache.get(assetId);
      if (cached) {
        brandingPerformanceMonitor.trackCachePerformance('hit', assetId);
        brandingPerformanceMonitor.trackAssetLoad(
          assetId,
          assetType,
          startTime,
        );
        return cached;
      }

      brandingPerformanceMonitor.trackCachePerformance('miss', assetId);

      // Optimize asset for multiple devices
      const optimizedAsset = await assetOptimizer.optimizeAsset(
        file,
        assetType,
      );

      // Cache the optimized asset
      await brandAssetCache.set(assetId, optimizedAsset);

      // Track performance metrics
      const optimizationTime = performance.now() - startTime;
      brandingPerformanceMonitor.trackOptimizationTime(
        assetId,
        optimizationTime,
      );
      brandingPerformanceMonitor.trackAssetLoad(assetId, assetType, startTime);

      return optimizedAsset;
    } catch (error) {
      brandingPerformanceMonitor.trackError(
        error,
        `uploadBrandAsset-${assetType}`,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive system performance metrics
   */
  getSystemMetrics(): {
    optimization: ReturnType<typeof assetOptimizer.getPerformanceMetrics>;
    monitoring: ReturnType<
      typeof brandingPerformanceMonitor.getDashboardMetrics
    >;
    cache: ReturnType<typeof brandAssetCache.getStats>;
  } {
    return {
      optimization: assetOptimizer.getPerformanceMetrics(),
      monitoring: brandingPerformanceMonitor.getDashboardMetrics(),
      cache: brandAssetCache.getStats(),
    };
  }

  /**
   * Run system health check
   */
  async runHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      component: string;
      status: 'pass' | 'fail';
      message: string;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check optimization system
    try {
      const optimizationMetrics = assetOptimizer.getPerformanceMetrics();
      if (optimizationMetrics.cacheHitRate < 0.7) {
        checks.push({
          component: 'AssetOptimization',
          status: 'fail',
          message: `Low cache hit rate: ${optimizationMetrics.cacheHitRate}`,
        });
        overallStatus = 'degraded';
      } else {
        checks.push({
          component: 'AssetOptimization',
          status: 'pass',
          message: 'Operating normally',
        });
      }
    } catch (error) {
      checks.push({
        component: 'AssetOptimization',
        status: 'fail',
        message: error.message,
      });
      overallStatus = 'unhealthy';
    }

    // Check monitoring system
    try {
      const monitoringMetrics =
        brandingPerformanceMonitor.getDashboardMetrics();
      if (monitoringMetrics.errorRate > 5) {
        checks.push({
          component: 'PerformanceMonitoring',
          status: 'fail',
          message: `High error rate: ${monitoringMetrics.errorRate}%`,
        });
        overallStatus = 'degraded';
      } else {
        checks.push({
          component: 'PerformanceMonitoring',
          status: 'pass',
          message: 'Monitoring active',
        });
      }
    } catch (error) {
      checks.push({
        component: 'PerformanceMonitoring',
        status: 'fail',
        message: error.message,
      });
      overallStatus = 'unhealthy';
    }

    // Check cache system
    try {
      const cacheStats = brandAssetCache.getStats();
      if (cacheStats.hitRate < 0.8) {
        checks.push({
          component: 'AssetCache',
          status: 'fail',
          message: `Low cache hit rate: ${cacheStats.hitRate}`,
        });
        overallStatus = 'degraded';
      } else {
        checks.push({
          component: 'AssetCache',
          status: 'pass',
          message: 'Cache operating efficiently',
        });
      }
    } catch (error) {
      checks.push({
        component: 'AssetCache',
        status: 'fail',
        message: error.message,
      });
      overallStatus = 'unhealthy';
    }

    return { status: overallStatus, checks };
  }

  /**
   * Optimize system performance
   */
  async optimizeSystem(): Promise<void> {
    try {
      console.log('[BrandingSystem] Running system optimization...');

      // Optimize cache
      await brandAssetCache.optimize();

      // Clear expired data
      await brandAssetCache.clear('expired');

      // Clean up old metrics
      brandingPerformanceMonitor.cleanupOldMetrics();

      // Clear optimization cache
      assetOptimizer.clearCache();

      console.log('[BrandingSystem] System optimization complete');
    } catch (error) {
      console.error('[BrandingSystem] Optimization failed:', error);
      throw error;
    }
  }

  private initializeSystem(): void {
    // Set up periodic system health checks
    setInterval(
      () => {
        this.runHealthCheck().then((health) => {
          if (health.status === 'unhealthy') {
            console.error(
              '[BrandingSystem] System health check failed:',
              health.checks,
            );
          }
        });
      },
      5 * 60 * 1000,
    ); // Every 5 minutes

    // Set up periodic optimization
    setInterval(
      () => {
        this.optimizeSystem();
      },
      60 * 60 * 1000,
    ); // Every hour
  }
}

export const brandingSystem = BrandingSystem.getInstance();
