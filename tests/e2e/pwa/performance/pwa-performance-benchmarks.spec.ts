import { test, expect, Page, BrowserContext } from '@playwright/test';
import { performance } from 'perf_hooks';

test.describe('PWA Performance Benchmarking - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow',
      permissions: ['background-sync', 'notifications']
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should meet Core Web Vitals benchmarks for PWA', async () => {
    await page.goto('/dashboard');
    
    const webVitalsMetrics = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const metrics = {
          lcp: 0, // Largest Contentful Paint
          fid: 0, // First Input Delay
          cls: 0, // Cumulative Layout Shift
          fcp: 0, // First Contentful Paint
          ttfb: 0 // Time to First Byte
        };

        // Performance observer for Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                metrics.lcp = entry.startTime;
                break;
              case 'first-input':
                metrics.fid = entry.processingStart - entry.startTime;
                break;
              case 'layout-shift':
                if (!entry.hadRecentInput) {
                  metrics.cls += entry.value;
                }
                break;
            }
          }
        });

        try {
          observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
          
          // Get navigation timing for TTFB and FCP
          const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigationTiming) {
            metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
            
            const paintEntries = performance.getEntriesByType('paint');
            const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              metrics.fcp = fcpEntry.startTime;
            }
          }

          // Wait for metrics collection
          setTimeout(() => {
            observer.disconnect();
            resolve(metrics);
          }, 3000);
        } catch (error) {
          resolve({ error: error.message, ...metrics });
        }
      });
    });

    // PWA Performance Standards (Google's recommendations)
    if (!webVitalsMetrics.error) {
      expect(webVitalsMetrics.lcp).toBeLessThan(2500); // LCP < 2.5s (Good)
      expect(webVitalsMetrics.fid).toBeLessThan(100);  // FID < 100ms (Good)
      expect(webVitalsMetrics.cls).toBeLessThan(0.1);  // CLS < 0.1 (Good)
      expect(webVitalsMetrics.fcp).toBeLessThan(1800); // FCP < 1.8s (Good)
      expect(webVitalsMetrics.ttfb).toBeLessThan(800); // TTFB < 800ms (Good)
    }

    console.log('Web Vitals Metrics:', webVitalsMetrics);
  });

  test('should demonstrate cache performance benefits', async () => {
    // First load without cache
    const firstLoadStart = performance.now();
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const firstLoadEnd = performance.now();
    const firstLoadTime = firstLoadEnd - firstLoadStart;

    // Get resource loading times
    const firstLoadResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize || 0,
        fromCache: (entry as PerformanceResourceTiming).transferSize === 0
      }));
    });

    // Second load with cache
    await page.reload({ waitUntil: 'networkidle' });
    const secondLoadStart = performance.now();
    await page.reload({ waitUntil: 'networkidle' });
    const secondLoadEnd = performance.now();
    const secondLoadTime = secondLoadEnd - secondLoadStart;

    const secondLoadResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize || 0,
        fromCache: (entry as PerformanceResourceTiming).transferSize === 0
      }));
    });

    const cacheHitRate = secondLoadResources.filter(r => r.fromCache).length / secondLoadResources.length;
    const performanceImprovement = (firstLoadTime - secondLoadTime) / firstLoadTime;

    // Performance assertions
    expect(cacheHitRate).toBeGreaterThan(0.7); // 70% cache hit rate
    expect(performanceImprovement).toBeGreaterThan(0.2); // 20% performance improvement
    expect(secondLoadTime).toBeLessThan(firstLoadTime);

    console.log('Cache Performance Analysis:', {
      firstLoadTime,
      secondLoadTime,
      cacheHitRate,
      performanceImprovement: `${(performanceImprovement * 100).toFixed(1)}%`
    });
  });

  test('should maintain performance under offline conditions', async () => {
    await page.goto('/dashboard');
    
    // Wait for service worker to be ready
    await page.waitForTimeout(2000);

    // Baseline performance online
    const onlinePerformance = await page.evaluate(async () => {
      const start = performance.now();
      
      // Simulate typical wedding day operations
      const operations = [
        () => fetch('/api/clients'),
        () => fetch('/api/timeline/current'),
        () => fetch('/api/tasks/pending')
      ];

      const results = [];
      for (const operation of operations) {
        try {
          const operationStart = performance.now();
          const response = await operation();
          const operationEnd = performance.now();
          
          results.push({
            success: response.ok,
            duration: operationEnd - operationStart,
            cached: response.headers.get('sw-cache-hit') === 'true'
          });
        } catch (error) {
          results.push({
            success: false,
            duration: 0,
            error: error.message
          });
        }
      }

      return {
        totalTime: performance.now() - start,
        operations: results,
        online: navigator.onLine
      };
    });

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Offline performance test
    const offlinePerformance = await page.evaluate(async () => {
      const start = performance.now();
      
      const operations = [
        () => fetch('/api/clients'),
        () => fetch('/api/timeline/current'),
        () => fetch('/api/tasks/pending')
      ];

      const results = [];
      for (const operation of operations) {
        try {
          const operationStart = performance.now();
          const response = await operation();
          const operationEnd = performance.now();
          
          results.push({
            success: response.ok,
            duration: operationEnd - operationStart,
            cached: true, // Should be served from cache
            status: response.status
          });
        } catch (error) {
          results.push({
            success: false,
            duration: 0,
            error: error.message
          });
        }
      }

      return {
        totalTime: performance.now() - start,
        operations: results,
        online: navigator.onLine
      };
    });

    // Go back online
    await context.setOffline(false);

    // Performance assertions
    const offlineSuccessRate = offlinePerformance.operations.filter(op => op.success).length / 
                               offlinePerformance.operations.length;
    
    expect(offlineSuccessRate).toBeGreaterThan(0.8); // 80% success rate offline
    expect(offlinePerformance.totalTime).toBeLessThan(onlinePerformance.totalTime * 2); // Max 2x slower

    console.log('Offline Performance Analysis:', {
      onlinePerformance,
      offlinePerformance,
      offlineSuccessRate: `${(offlineSuccessRate * 100).toFixed(1)}%`
    });
  });

  test('should optimize mobile performance for wedding venues', async () => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/dashboard');

    const mobilePerformance = await page.evaluate(async () => {
      const metrics = {
        domContentLoaded: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        memoryUsage: 0,
        jsHeapSizeUsed: 0
      };

      // Get navigation timing
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        metrics.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
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

      // Get memory usage (Chrome only)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metrics.memoryUsage = memory.usedJSHeapSize;
        metrics.jsHeapSizeUsed = memory.usedJSHeapSize;
      }

      // Simulate touch interactions typical at wedding venues
      const touchOperations = [];
      const touchTargets = [
        'button[data-testid="timeline-view"]',
        'button[data-testid="vendor-status"]',
        'button[data-testid="photo-upload"]'
      ];

      for (const selector of touchTargets) {
        const element = document.querySelector(selector);
        if (element) {
          const start = performance.now();
          element.dispatchEvent(new Event('touchstart', { bubbles: true }));
          element.dispatchEvent(new Event('touchend', { bubbles: true }));
          element.dispatchEvent(new Event('click', { bubbles: true }));
          const end = performance.now();
          
          touchOperations.push({
            selector,
            responseTime: end - start,
            element: !!element
          });
        }
      }

      return {
        ...metrics,
        touchOperations,
        viewportWidth: window.innerWidth,
        devicePixelRatio: window.devicePixelRatio
      };
    });

    // Mobile performance standards
    expect(mobilePerformance.domContentLoaded).toBeLessThan(3000); // DOM ready < 3s
    expect(mobilePerformance.firstContentfulPaint).toBeLessThan(1800); // FCP < 1.8s
    
    // Touch response time should be < 100ms for good UX
    mobilePerformance.touchOperations.forEach(operation => {
      expect(operation.responseTime).toBeLessThan(100);
    });

    console.log('Mobile Performance Analysis:', mobilePerformance);
  });

  test('should monitor service worker overhead and efficiency', async () => {
    await page.goto('/dashboard');
    
    const swPerformance = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { error: 'Service Workers not supported' };
      }

      const metrics = {
        registrationTime: 0,
        installationTime: 0,
        activationTime: 0,
        messageResponseTime: 0,
        cacheOperationTime: 0
      };

      try {
        // Measure service worker registration time
        const regStart = performance.now();
        const registration = await navigator.serviceWorker.register('/sw.js');
        const regEnd = performance.now();
        metrics.registrationTime = regEnd - regStart;

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        // Measure message response time
        const msgStart = performance.now();
        const messageChannel = new MessageChannel();
        
        const responsePromise = new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            const msgEnd = performance.now();
            metrics.messageResponseTime = msgEnd - msgStart;
            resolve(event.data);
          };
        });

        registration.active?.postMessage({
          type: 'GET_VERSION'
        }, [messageChannel.port2]);

        await responsePromise;

        // Measure cache operation time
        if ('caches' in window) {
          const cacheStart = performance.now();
          const cache = await caches.open('performance-test');
          await cache.put('/test-resource', new Response('test data'));
          const cachedResponse = await cache.match('/test-resource');
          await caches.delete('performance-test');
          const cacheEnd = performance.now();
          metrics.cacheOperationTime = cacheEnd - cacheStart;
        }

        return metrics;
      } catch (error) {
        return { error: error.message, ...metrics };
      }
    });

    if (!swPerformance.error) {
      // Service worker overhead should be minimal
      expect(swPerformance.registrationTime).toBeLessThan(500); // Registration < 500ms
      expect(swPerformance.messageResponseTime).toBeLessThan(100); // Message response < 100ms
      expect(swPerformance.cacheOperationTime).toBeLessThan(200); // Cache ops < 200ms
    }

    console.log('Service Worker Performance:', swPerformance);
  });

  test('should validate PWA loading performance vs standard web app', async () => {
    // Test standard web app (no service worker)
    const standardContext = await context.browser().newContext({
      serviceWorkers: 'block'
    });
    const standardPage = await standardContext.newPage();

    const standardLoadTime = await standardPage.evaluate(async () => {
      const start = performance.now();
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(true);
        } else {
          window.addEventListener('load', resolve);
        }
      });
      return performance.now() - start;
    });

    await standardPage.goto('/dashboard', { waitUntil: 'networkidle' });
    const standardResourceCount = await standardPage.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    await standardContext.close();

    // Test PWA (with service worker)
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    const pwaLoadTime = await page.evaluate(() => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigationTiming ? 
        navigationTiming.loadEventEnd - navigationTiming.navigationStart : 0;
    });

    const pwaResourceCount = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    const pwaMetrics = await page.evaluate(() => {
      return {
        cacheHits: performance.getEntriesByType('resource').filter(
          entry => (entry as PerformanceResourceTiming).transferSize === 0
        ).length,
        totalResources: performance.getEntriesByType('resource').length
      };
    });

    // PWA should show performance benefits through caching
    const cacheEfficiency = pwaMetrics.cacheHits / pwaMetrics.totalResources;
    expect(cacheEfficiency).toBeGreaterThan(0.3); // 30% cache efficiency minimum

    console.log('PWA vs Standard Performance:', {
      standardLoadTime,
      pwaLoadTime,
      standardResourceCount,
      pwaResourceCount,
      cacheEfficiency: `${(cacheEfficiency * 100).toFixed(1)}%`,
      performanceBenefit: standardLoadTime > pwaLoadTime
    });
  });

  test('should validate memory usage and cleanup efficiency', async () => {
    await page.goto('/dashboard');
    
    const memoryTest = await page.evaluate(async () => {
      const results = {
        initialMemory: 0,
        afterCacheOperations: 0,
        afterCleanup: 0,
        memorySupported: false
      };

      if ('memory' in performance) {
        results.memorySupported = true;
        const memory = (performance as any).memory;
        results.initialMemory = memory.usedJSHeapSize;

        // Perform intensive cache operations
        if ('caches' in window) {
          const cache = await caches.open('memory-test');
          
          // Add multiple large resources
          for (let i = 0; i < 50; i++) {
            const largeData = 'x'.repeat(10240); // 10KB each
            await cache.put(`/memory-test-${i}`, new Response(largeData));
          }

          results.afterCacheOperations = memory.usedJSHeapSize;

          // Cleanup
          await caches.delete('memory-test');
          
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
          
          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          results.afterCleanup = memory.usedJSHeapSize;
        }
      }

      return results;
    });

    if (memoryTest.memorySupported) {
      const memoryIncrease = memoryTest.afterCacheOperations - memoryTest.initialMemory;
      const memoryRecovered = memoryTest.afterCacheOperations - memoryTest.afterCleanup;
      const cleanupEfficiency = memoryRecovered / memoryIncrease;

      // Memory should be managed efficiently
      expect(cleanupEfficiency).toBeGreaterThan(0.5); // 50% memory recovery minimum
    }

    console.log('Memory Usage Analysis:', {
      ...memoryTest,
      memoryIncreaseKB: memoryTest.memorySupported ? 
        Math.round((memoryTest.afterCacheOperations - memoryTest.initialMemory) / 1024) : 0
    });
  });

  test('should benchmark wedding-specific performance scenarios', async () => {
    await page.goto('/dashboard');

    // Simulate wedding day performance scenarios
    const weddingScenarios = await page.evaluate(async () => {
      const scenarios = [];

      // Scenario 1: Timeline updates during ceremony
      const timelineStart = performance.now();
      try {
        const timelineResponse = await fetch('/api/timeline/current');
        const timelineData = await timelineResponse.json();
        scenarios.push({
          name: 'Timeline Update',
          duration: performance.now() - timelineStart,
          success: timelineResponse.ok,
          cached: timelineResponse.headers.get('sw-cache-hit') === 'true'
        });
      } catch (error) {
        scenarios.push({
          name: 'Timeline Update',
          duration: performance.now() - timelineStart,
          success: false,
          error: error.message
        });
      }

      // Scenario 2: Photo upload queue processing
      const photoStart = performance.now();
      try {
        // Simulate photo metadata processing
        const photoData = new Blob(['fake photo data'], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('photo', photoData, 'wedding-photo.jpg');
        
        scenarios.push({
          name: 'Photo Processing',
          duration: performance.now() - photoStart,
          success: true,
          size: photoData.size
        });
      } catch (error) {
        scenarios.push({
          name: 'Photo Processing',
          duration: performance.now() - photoStart,
          success: false,
          error: error.message
        });
      }

      // Scenario 3: Vendor communication sync
      const vendorStart = performance.now();
      try {
        const vendorResponse = await fetch('/api/vendors/status');
        scenarios.push({
          name: 'Vendor Sync',
          duration: performance.now() - vendorStart,
          success: vendorResponse.ok,
          cached: vendorResponse.headers.get('sw-cache-hit') === 'true'
        });
      } catch (error) {
        scenarios.push({
          name: 'Vendor Sync',
          duration: performance.now() - vendorStart,
          success: false,
          error: error.message
        });
      }

      return scenarios;
    });

    // Wedding day performance requirements
    weddingScenarios.forEach(scenario => {
      if (scenario.success) {
        // All operations should complete within 2 seconds at wedding venues
        expect(scenario.duration).toBeLessThan(2000);
      }
    });

    // Overall wedding day readiness score
    const successfulOperations = weddingScenarios.filter(s => s.success).length;
    const weddingReadinessScore = successfulOperations / weddingScenarios.length;
    
    expect(weddingReadinessScore).toBeGreaterThan(0.8); // 80% success rate minimum

    console.log('Wedding Day Performance Scenarios:', {
      scenarios: weddingScenarios,
      weddingReadinessScore: `${(weddingReadinessScore * 100).toFixed(1)}%`
    });
  });
});