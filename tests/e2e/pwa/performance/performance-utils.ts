/**
 * PWA Performance Testing Utilities - WS-171
 * Shared utilities for performance benchmarking and testing
 */

export interface PerformanceMetrics {
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToFirstByte: number;
  totalBlockingTime: number;
}

export interface ResourceMetrics {
  totalResources: number;
  cacheHits: number;
  networkRequests: number;
  totalTransferSize: number;
  totalDecodedSize: number;
  compressionRatio: number;
  averageLoadTime: number;
}

export interface PWACapabilities {
  serviceWorkerSupport: boolean;
  cacheAPISupport: boolean;
  backgroundSyncSupport: boolean;
  pushAPISupport: boolean;
  notificationSupport: boolean;
  installPromptSupport: boolean;
  offlineSupport: boolean;
}

export class PerformanceAnalyzer {
  /**
   * Collect comprehensive Web Vitals metrics
   */
  static async collectWebVitals(page: any): Promise<PerformanceMetrics> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: PerformanceMetrics = {
          domContentLoaded: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          cumulativeLayoutShift: 0,
          timeToFirstByte: 0,
          totalBlockingTime: 0
        };

        // Get navigation timing
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          metrics.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
          metrics.timeToFirstByte = navigationTiming.responseStart - navigationTiming.requestStart;
        }

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Performance observer for Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                metrics.largestContentfulPaint = entry.startTime;
                break;
              case 'first-input':
                metrics.firstInputDelay = entry.processingStart - entry.startTime;
                break;
              case 'layout-shift':
                if (!entry.hadRecentInput) {
                  metrics.cumulativeLayoutShift += entry.value;
                }
                break;
              case 'longtask':
                metrics.totalBlockingTime += Math.max(0, entry.duration - 50);
                break;
            }
          }
        });

        try {
          observer.observe({ 
            entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'longtask'] 
          });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(metrics);
          }, 5000);
        } catch (error) {
          resolve(metrics);
        }
      });
    });
  }

  /**
   * Analyze resource loading efficiency
   */
  static async analyzeResourcePerformance(page: any): Promise<ResourceMetrics> {
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const metrics: ResourceMetrics = {
        totalResources: resources.length,
        cacheHits: 0,
        networkRequests: 0,
        totalTransferSize: 0,
        totalDecodedSize: 0,
        compressionRatio: 0,
        averageLoadTime: 0
      };

      let totalLoadTime = 0;

      resources.forEach(resource => {
        const isFromCache = resource.transferSize === 0 && resource.decodedBodySize > 0;
        
        if (isFromCache) {
          metrics.cacheHits++;
        } else {
          metrics.networkRequests++;
        }

        metrics.totalTransferSize += resource.transferSize || 0;
        metrics.totalDecodedSize += resource.decodedBodySize || 0;
        totalLoadTime += resource.duration;
      });

      if (metrics.totalResources > 0) {
        metrics.averageLoadTime = totalLoadTime / metrics.totalResources;
      }

      if (metrics.totalDecodedSize > 0) {
        metrics.compressionRatio = 
          (metrics.totalDecodedSize - metrics.totalTransferSize) / metrics.totalDecodedSize;
      }

      return metrics;
    });
  }

  /**
   * Test PWA capabilities and support
   */
  static async testPWACapabilities(page: any): Promise<PWACapabilities> {
    return await page.evaluate(() => {
      const capabilities: PWACapabilities = {
        serviceWorkerSupport: 'serviceWorker' in navigator,
        cacheAPISupport: 'caches' in window,
        backgroundSyncSupport: 'sync' in window.ServiceWorkerRegistration?.prototype,
        pushAPISupport: 'PushManager' in window,
        notificationSupport: 'Notification' in window,
        installPromptSupport: 'onbeforeinstallprompt' in window,
        offlineSupport: false
      };

      // Test if app works offline (basic test)
      capabilities.offlineSupport = capabilities.serviceWorkerSupport && capabilities.cacheAPISupport;

      return capabilities;
    });
  }

  /**
   * Generate performance score based on Web Vitals thresholds
   */
  static calculatePerformanceScore(metrics: PerformanceMetrics): {
    score: number;
    grade: string;
    breakdown: Record<string, { value: number; score: number; threshold: number }>;
  } {
    const thresholds = {
      largestContentfulPaint: { good: 2500, needsImprovement: 4000 },
      firstInputDelay: { good: 100, needsImprovement: 300 },
      cumulativeLayoutShift: { good: 0.1, needsImprovement: 0.25 },
      firstContentfulPaint: { good: 1800, needsImprovement: 3000 },
      timeToFirstByte: { good: 800, needsImprovement: 1800 }
    };

    const breakdown = {};
    let totalScore = 0;
    let weightedScores = 0;

    // Weight factors for different metrics
    const weights = {
      largestContentfulPaint: 0.25,
      firstInputDelay: 0.25,
      cumulativeLayoutShift: 0.25,
      firstContentfulPaint: 0.15,
      timeToFirstByte: 0.1
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metrics[metric as keyof PerformanceMetrics];
      let score = 100;

      if (value > threshold.needsImprovement) {
        score = 0;
      } else if (value > threshold.good) {
        score = 50;
      }

      const weight = weights[metric as keyof typeof weights] || 0.1;
      totalScore += score * weight;
      weightedScores += weight;

      breakdown[metric] = {
        value,
        score,
        threshold: threshold.good
      };
    });

    const finalScore = Math.round(totalScore / weightedScores);
    const grade = finalScore >= 90 ? 'A' : 
                 finalScore >= 80 ? 'B' : 
                 finalScore >= 70 ? 'C' : 
                 finalScore >= 60 ? 'D' : 'F';

    return { score: finalScore, grade, breakdown };
  }

  /**
   * Test offline functionality
   */
  static async testOfflineCapability(page: any): Promise<{
    offlineSupported: boolean;
    criticalFeaturesWork: boolean;
    cacheEffectiveness: number;
  }> {
    return await page.evaluate(async () => {
      const result = {
        offlineSupported: false,
        criticalFeaturesWork: false,
        cacheEffectiveness: 0
      };

      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          // Check if service worker is active
          const registration = await navigator.serviceWorker.ready;
          result.offlineSupported = !!registration.active;

          if (result.offlineSupported) {
            // Test critical API endpoints for caching
            const criticalEndpoints = ['/api/auth', '/api/timeline', '/api/clients'];
            let cachedEndpoints = 0;

            for (const endpoint of criticalEndpoints) {
              try {
                const cacheKeys = await caches.keys();
                for (const cacheName of cacheKeys) {
                  const cache = await caches.open(cacheName);
                  const response = await cache.match(endpoint);
                  if (response) {
                    cachedEndpoints++;
                    break;
                  }
                }
              } catch (error) {
                console.warn('Cache check failed for', endpoint);
              }
            }

            result.cacheEffectiveness = cachedEndpoints / criticalEndpoints.length;
            result.criticalFeaturesWork = result.cacheEffectiveness > 0.5;
          }
        } catch (error) {
          console.error('Offline capability test failed:', error);
        }
      }

      return result;
    });
  }

  /**
   * Test installation prompt and PWA installability
   */
  static async testInstallability(page: any): Promise<{
    installPromptAvailable: boolean;
    manifestValid: boolean;
    serviceWorkerReady: boolean;
    httpsEnabled: boolean;
    installable: boolean;
  }> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const result = {
          installPromptAvailable: false,
          manifestValid: false,
          serviceWorkerReady: false,
          httpsEnabled: location.protocol === 'https:' || location.hostname === 'localhost',
          installable: false
        };

        // Check for manifest
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        result.manifestValid = !!manifestLink;

        // Check for service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => {
            result.serviceWorkerReady = true;
          }).catch(() => {
            result.serviceWorkerReady = false;
          });
        }

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
          result.installPromptAvailable = true;
          e.preventDefault(); // Don't show the prompt automatically
        });

        // Check overall installability
        setTimeout(() => {
          result.installable = result.manifestValid && 
                              result.serviceWorkerReady && 
                              result.httpsEnabled;
          resolve(result);
        }, 2000);
      });
    });
  }

  /**
   * Simulate wedding-specific performance scenarios
   */
  static async simulateWeddingDayScenarios(page: any): Promise<{
    timelineUpdateTime: number;
    photoUploadTime: number;
    vendorSyncTime: number;
    guestManagementTime: number;
    overallReadiness: number;
  }> {
    return await page.evaluate(async () => {
      const scenarios = {
        timelineUpdateTime: 0,
        photoUploadTime: 0,
        vendorSyncTime: 0,
        guestManagementTime: 0,
        overallReadiness: 0
      };

      try {
        // Simulate timeline update
        const timelineStart = performance.now();
        try {
          const timelineResponse = await fetch('/api/timeline/current');
          scenarios.timelineUpdateTime = performance.now() - timelineStart;
        } catch (error) {
          scenarios.timelineUpdateTime = -1; // Failed
        }

        // Simulate photo upload preparation
        const photoStart = performance.now();
        try {
          const photoBlob = new Blob(['test photo data'], { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('photo', photoBlob);
          scenarios.photoUploadTime = performance.now() - photoStart;
        } catch (error) {
          scenarios.photoUploadTime = -1;
        }

        // Simulate vendor status sync
        const vendorStart = performance.now();
        try {
          const vendorResponse = await fetch('/api/vendors/status');
          scenarios.vendorSyncTime = performance.now() - vendorStart;
        } catch (error) {
          scenarios.vendorSyncTime = -1;
        }

        // Simulate guest management operation
        const guestStart = performance.now();
        try {
          const guestResponse = await fetch('/api/guests');
          scenarios.guestManagementTime = performance.now() - guestStart;
        } catch (error) {
          scenarios.guestManagementTime = -1;
        }

        // Calculate overall readiness score
        const successfulOperations = [
          scenarios.timelineUpdateTime,
          scenarios.photoUploadTime,
          scenarios.vendorSyncTime,
          scenarios.guestManagementTime
        ].filter(time => time > 0 && time < 2000).length; // Operations that complete within 2s

        scenarios.overallReadiness = (successfulOperations / 4) * 100;

      } catch (error) {
        console.error('Wedding scenario simulation failed:', error);
      }

      return scenarios;
    });
  }

  /**
   * Monitor memory usage patterns during PWA operations
   */
  static async monitorMemoryUsage(page: any, operationCallback: () => Promise<void>): Promise<{
    initialMemory: number;
    peakMemory: number;
    finalMemory: number;
    memoryGrowth: number;
    memoryLeakDetected: boolean;
  }> {
    const initialMemory = await page.evaluate(() => {
      return 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0;
    });

    let peakMemory = initialMemory;
    const memoryMonitor = setInterval(async () => {
      const currentMemory = await page.evaluate(() => {
        return 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0;
      });
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }, 100);

    // Execute the operation
    await operationCallback();

    clearInterval(memoryMonitor);

    const finalMemory = await page.evaluate(() => {
      return 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0;
    });

    const memoryGrowth = finalMemory - initialMemory;
    const memoryLeakDetected = memoryGrowth > (initialMemory * 0.2); // 20% growth threshold

    return {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryGrowth,
      memoryLeakDetected
    };
  }

  /**
   * Generate comprehensive performance report
   */
  static generatePerformanceReport(
    webVitals: PerformanceMetrics,
    resources: ResourceMetrics,
    capabilities: PWACapabilities,
    weddingScenarios: any
  ): {
    overallScore: number;
    grade: string;
    summary: string;
    recommendations: string[];
    details: any;
  } {
    const performanceScore = this.calculatePerformanceScore(webVitals);
    
    const recommendations = [];
    
    // Web Vitals recommendations
    if (webVitals.largestContentfulPaint > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by reducing server response times and optimizing critical resources');
    }
    
    if (webVitals.firstInputDelay > 100) {
      recommendations.push('Improve First Input Delay by reducing JavaScript execution time and breaking up long tasks');
    }
    
    if (webVitals.cumulativeLayoutShift > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift by ensuring size attributes on images and avoiding dynamic content injection');
    }

    // Resource optimization recommendations
    if (resources.compressionRatio < 0.3) {
      recommendations.push('Enable better resource compression (gzip/brotli) to reduce transfer sizes');
    }
    
    if (resources.cacheHits / resources.totalResources < 0.5) {
      recommendations.push('Improve caching strategy to increase cache hit ratio for better performance');
    }

    // PWA capability recommendations
    if (!capabilities.backgroundSyncSupport) {
      recommendations.push('Consider implementing background sync fallback for browsers that don\'t support it');
    }
    
    if (!capabilities.installPromptSupport) {
      recommendations.push('Add custom install prompt for better user engagement');
    }

    // Wedding-specific recommendations
    if (weddingScenarios.overallReadiness < 80) {
      recommendations.push('Optimize critical wedding day operations for better venue performance');
    }

    const summary = `Performance Score: ${performanceScore.score}/100 (${performanceScore.grade}). ` +
                   `Cache efficiency: ${(resources.cacheHits / resources.totalResources * 100).toFixed(1)}%. ` +
                   `Wedding day readiness: ${weddingScenarios.overallReadiness.toFixed(1)}%.`;

    return {
      overallScore: performanceScore.score,
      grade: performanceScore.grade,
      summary,
      recommendations,
      details: {
        webVitals,
        resources,
        capabilities,
        weddingScenarios,
        breakdown: performanceScore.breakdown
      }
    };
  }
}

/**
 * Wedding-specific performance thresholds and benchmarks
 */
export const WEDDING_PERFORMANCE_THRESHOLDS = {
  // Critical operations that must work at wedding venues
  TIMELINE_UPDATE_MAX_TIME: 2000, // 2 seconds
  PHOTO_UPLOAD_PREP_MAX_TIME: 1000, // 1 second
  VENDOR_SYNC_MAX_TIME: 1500, // 1.5 seconds
  GUEST_UPDATE_MAX_TIME: 1000, // 1 second
  
  // Cache efficiency requirements
  MINIMUM_CACHE_HIT_RATIO: 0.6, // 60%
  CRITICAL_ASSET_CACHE_RATIO: 0.8, // 80%
  
  // Performance scores
  MINIMUM_PERFORMANCE_SCORE: 80, // B grade
  TARGET_PERFORMANCE_SCORE: 90, // A grade
  
  // Memory usage
  MAXIMUM_MEMORY_GROWTH: 0.2, // 20% growth
  MEMORY_LEAK_THRESHOLD: 0.3 // 30% growth indicates leak
};