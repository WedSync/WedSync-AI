import { test, expect, Page, BrowserContext, chromium, firefox, webkit } from '@playwright/test';

test.describe('Cross-Browser PWA Performance - WS-171', () => {
  
  test('should maintain consistent performance across Chromium browsers', async () => {
    const chromiumBrowser = await chromium.launch();
    const context = await chromiumBrowser.newContext({
      serviceWorkers: 'allow',
      permissions: ['background-sync', 'notifications']
    });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const chromiumMetrics = await page.evaluate(async () => {
        const metrics = {
          browserEngine: 'Chromium',
          supportFeatures: {
            serviceWorkers: 'serviceWorker' in navigator,
            cacheAPI: 'caches' in window,
            backgroundSync: 'sync' in window.ServiceWorkerRegistration.prototype,
            pushAPI: 'PushManager' in window,
            notifications: 'Notification' in window,
            webAppManifest: 'getInstalledRelatedApps' in navigator
          },
          performance: {
            domContentLoaded: 0,
            firstContentfulPaint: 0,
            memoryUsage: 0
          }
        };

        // Get performance timing
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          metrics.performance.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
        }

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.performance.firstContentfulPaint = fcpEntry.startTime;
        }

        // Get memory usage if available
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          metrics.performance.memoryUsage = memory.usedJSHeapSize;
        }

        // Test PWA installation capability
        let installPromptAvailable = false;
        window.addEventListener('beforeinstallprompt', (e) => {
          installPromptAvailable = true;
        });

        return {
          ...metrics,
          installPromptAvailable
        };
      });

      // Chromium should support all PWA features
      expect(chromiumMetrics.supportFeatures.serviceWorkers).toBeTruthy();
      expect(chromiumMetrics.supportFeatures.cacheAPI).toBeTruthy();
      expect(chromiumMetrics.supportFeatures.backgroundSync).toBeTruthy();
      expect(chromiumMetrics.supportFeatures.pushAPI).toBeTruthy();

      // Performance benchmarks for Chromium
      expect(chromiumMetrics.performance.domContentLoaded).toBeLessThan(3000);
      expect(chromiumMetrics.performance.firstContentfulPaint).toBeLessThan(2000);

      console.log('Chromium Performance:', chromiumMetrics);
    } finally {
      await context.close();
      await chromiumBrowser.close();
    }
  });

  test('should handle Safari/WebKit PWA limitations gracefully', async () => {
    const webkitBrowser = await webkit.launch();
    const context = await webkitBrowser.newContext({
      serviceWorkers: 'allow'
    });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const safariMetrics = await page.evaluate(async () => {
        const metrics = {
          browserEngine: 'WebKit/Safari',
          supportFeatures: {
            serviceWorkers: 'serviceWorker' in navigator,
            cacheAPI: 'caches' in window,
            backgroundSync: 'sync' in window.ServiceWorkerRegistration?.prototype,
            pushAPI: 'PushManager' in window,
            notifications: 'Notification' in window,
            addToHomeScreen: 'standalone' in window.navigator
          },
          performance: {
            domContentLoaded: 0,
            firstContentfulPaint: 0,
            resourceLoadTime: 0
          },
          safariSpecific: {
            standaloneMode: (window.navigator as any).standalone,
            webAppCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
            webAppTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content')
          }
        };

        // Get performance timing
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          metrics.performance.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
        }

        // Get paint timing (may not be available in Safari)
        try {
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            metrics.performance.firstContentfulPaint = fcpEntry.startTime;
          }
        } catch (error) {
          metrics.performance.firstContentfulPaint = -1; // Not supported
        }

        // Test resource loading efficiency
        const resources = performance.getEntriesByType('resource');
        if (resources.length > 0) {
          metrics.performance.resourceLoadTime = resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length;
        }

        return metrics;
      });

      // Safari has more limited PWA support
      expect(safariMetrics.supportFeatures.serviceWorkers).toBeTruthy();
      expect(safariMetrics.supportFeatures.cacheAPI).toBeTruthy();
      
      // Background sync may not be supported in Safari
      if (!safariMetrics.supportFeatures.backgroundSync) {
        console.warn('Background Sync not supported in Safari - graceful degradation expected');
      }

      // Performance should still be acceptable
      expect(safariMetrics.performance.domContentLoaded).toBeLessThan(4000); // Slightly more lenient for Safari
      
      if (safariMetrics.performance.firstContentfulPaint > 0) {
        expect(safariMetrics.performance.firstContentfulPaint).toBeLessThan(2500);
      }

      console.log('Safari/WebKit Performance:', safariMetrics);
    } finally {
      await context.close();
      await webkitBrowser.close();
    }
  });

  test('should optimize for Firefox PWA experience', async () => {
    const firefoxBrowser = await firefox.launch();
    const context = await firefoxBrowser.newContext({
      serviceWorkers: 'allow'
    });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const firefoxMetrics = await page.evaluate(async () => {
        const metrics = {
          browserEngine: 'Firefox',
          supportFeatures: {
            serviceWorkers: 'serviceWorker' in navigator,
            cacheAPI: 'caches' in window,
            backgroundSync: 'sync' in window.ServiceWorkerRegistration?.prototype,
            pushAPI: 'PushManager' in window,
            notifications: 'Notification' in window,
            installPrompt: 'onbeforeinstallprompt' in window
          },
          performance: {
            domContentLoaded: 0,
            loadComplete: 0,
            resourceEfficiency: 0
          },
          firefoxSpecific: {
            geckoVersion: navigator.userAgent.match(/Gecko\/(\d+)/)?.[1] || 'unknown',
            firefoxVersion: navigator.userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown'
          }
        };

        // Get performance timing
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          metrics.performance.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
          metrics.performance.loadComplete = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
        }

        // Calculate resource efficiency
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        if (resources.length > 0) {
          const cachedResources = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0).length;
          metrics.performance.resourceEfficiency = cachedResources / resources.length;
        }

        return metrics;
      });

      // Firefox should support most PWA features
      expect(firefoxMetrics.supportFeatures.serviceWorkers).toBeTruthy();
      expect(firefoxMetrics.supportFeatures.cacheAPI).toBeTruthy();

      // Performance expectations for Firefox
      expect(firefoxMetrics.performance.domContentLoaded).toBeLessThan(3500);
      expect(firefoxMetrics.performance.loadComplete).toBeLessThan(5000);

      console.log('Firefox Performance:', firefoxMetrics);
    } finally {
      await context.close();
      await firefoxBrowser.close();
    }
  });

  test('should compare performance metrics across all browsers', async () => {
    const browsers = [
      { name: 'Chromium', launcher: chromium },
      { name: 'Firefox', launcher: firefox },
      { name: 'WebKit', launcher: webkit }
    ];

    const crossBrowserResults = [];

    for (const browserConfig of browsers) {
      const browser = await browserConfig.launcher.launch();
      const context = await browser.newContext({
        serviceWorkers: 'allow'
      });
      const page = await context.newPage();

      try {
        const startTime = Date.now();
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        const pageLoadTime = Date.now() - startTime;

        const browserMetrics = await page.evaluate(() => {
          const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const resources = performance.getEntriesByType('resource');

          return {
            domContentLoaded: navigationTiming ? 
              navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart : 0,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            resourceCount: resources.length,
            totalTransferSize: resources.reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0),
            cacheHitRate: resources.filter(r => (r as PerformanceResourceTiming).transferSize === 0).length / resources.length,
            
            // Feature support
            serviceWorkerSupport: 'serviceWorker' in navigator,
            cacheAPISupport: 'caches' in window,
            backgroundSyncSupport: 'sync' in window.ServiceWorkerRegistration?.prototype,
            
            // User Agent
            userAgent: navigator.userAgent
          };
        });

        crossBrowserResults.push({
          browser: browserConfig.name,
          pageLoadTime,
          ...browserMetrics
        });

      } finally {
        await context.close();
        await browser.close();
      }
    }

    // Analyze cross-browser performance
    const performanceComparison = {
      browsers: crossBrowserResults.map(result => result.browser),
      averageLoadTime: crossBrowserResults.reduce((sum, result) => sum + result.pageLoadTime, 0) / crossBrowserResults.length,
      fastestBrowser: crossBrowserResults.reduce((fastest, current) => 
        current.pageLoadTime < fastest.pageLoadTime ? current : fastest
      ),
      slowestBrowser: crossBrowserResults.reduce((slowest, current) => 
        current.pageLoadTime > slowest.pageLoadTime ? current : slowest
      ),
      featureSupport: {
        serviceWorkers: crossBrowserResults.filter(r => r.serviceWorkerSupport).length,
        cacheAPI: crossBrowserResults.filter(r => r.cacheAPISupport).length,
        backgroundSync: crossBrowserResults.filter(r => r.backgroundSyncSupport).length
      }
    };

    // Performance consistency checks
    const loadTimeVariance = Math.max(...crossBrowserResults.map(r => r.pageLoadTime)) - 
                            Math.min(...crossBrowserResults.map(r => r.pageLoadTime));
    
    expect(loadTimeVariance).toBeLessThan(3000); // Load time variance < 3s across browsers
    expect(performanceComparison.featureSupport.serviceWorkers).toBe(3); // All browsers support SW
    expect(performanceComparison.featureSupport.cacheAPI).toBe(3); // All browsers support Cache API

    console.log('Cross-Browser Performance Comparison:', {
      ...performanceComparison,
      results: crossBrowserResults,
      loadTimeVariance
    });
  });

  test('should validate mobile browser performance differences', async () => {
    const mobileContexts = [
      {
        name: 'iPhone Safari',
        context: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          viewport: { width: 375, height: 667 },
          deviceScaleFactor: 2,
          hasTouch: true
        }
      },
      {
        name: 'Android Chrome',
        context: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          viewport: { width: 360, height: 640 },
          deviceScaleFactor: 3,
          hasTouch: true
        }
      }
    ];

    const mobileResults = [];

    for (const deviceConfig of mobileContexts) {
      const browser = await chromium.launch(); // Use Chromium for consistency
      const context = await browser.newContext({
        ...deviceConfig.context,
        serviceWorkers: 'allow'
      });
      const page = await context.newPage();

      try {
        await page.goto('/dashboard', { waitUntil: 'networkidle' });

        const mobileMetrics = await page.evaluate(() => {
          const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          return {
            domContentLoaded: timing ? timing.domContentLoadedEventEnd - timing.navigationStart : 0,
            loadComplete: timing ? timing.loadEventEnd - timing.navigationStart : 0,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            
            // Mobile-specific metrics
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            touchSupport: 'ontouchstart' in window,
            
            // Performance under mobile constraints
            resourceCount: performance.getEntriesByType('resource').length,
            memoryPressure: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0,
            
            // PWA features
            installable: 'onbeforeinstallprompt' in window,
            standalone: (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
          };
        });

        // Test touch responsiveness
        const touchResponseTest = await page.evaluate(() => {
          return new Promise((resolve) => {
            const testButton = document.querySelector('button, a[role="button"]');
            if (testButton) {
              let touchStartTime = 0;
              
              testButton.addEventListener('touchstart', () => {
                touchStartTime = performance.now();
              });
              
              testButton.addEventListener('touchend', () => {
                const touchResponseTime = performance.now() - touchStartTime;
                resolve({ touchResponseTime, touchSupported: true });
              });
              
              // Simulate touch
              testButton.dispatchEvent(new Event('touchstart', { bubbles: true }));
              testButton.dispatchEvent(new Event('touchend', { bubbles: true }));
            } else {
              resolve({ touchResponseTime: -1, touchSupported: false });
            }
          });
        });

        mobileResults.push({
          device: deviceConfig.name,
          ...mobileMetrics,
          touchResponse: touchResponseTest
        });

      } finally {
        await context.close();
        await browser.close();
      }
    }

    // Mobile performance validations
    mobileResults.forEach(result => {
      // Mobile should load within acceptable timeframes
      expect(result.domContentLoaded).toBeLessThan(4000); // 4s on mobile
      expect(result.loadComplete).toBeLessThan(6000); // 6s total load time
      
      // Touch response should be fast
      if (result.touchResponse.touchSupported && result.touchResponse.touchResponseTime > 0) {
        expect(result.touchResponse.touchResponseTime).toBeLessThan(100); // Touch response < 100ms
      }
      
      // PWA features should be available
      expect(result.touchSupport).toBeTruthy();
    });

    console.log('Mobile Browser Performance Results:', mobileResults);
  });

  test('should validate PWA performance under different network conditions', async () => {
    const networkConditions = [
      { name: 'Fast 3G', downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
      { name: 'Slow 3G', downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 },
      { name: '2G', downloadThroughput: 250 * 1024 / 8, uploadThroughput: 250 * 1024 / 8, latency: 800 }
    ];

    const networkResults = [];

    const browser = await chromium.launch();

    for (const networkConfig of networkConditions) {
      const context = await browser.newContext({
        serviceWorkers: 'allow'
      });
      const page = await context.newPage();

      try {
        // Throttle network
        const client = await context.newCDPSession(page);
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          ...networkConfig
        });

        const loadStart = Date.now();
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - loadStart;

        const networkMetrics = await page.evaluate(async () => {
          const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const resources = performance.getEntriesByType('resource');
          
          // Test offline capability
          let offlineCapable = false;
          if ('serviceWorker' in navigator && 'caches' in window) {
            try {
              const registration = await navigator.serviceWorker.ready;
              offlineCapable = !!registration.active;
            } catch (error) {
              offlineCapable = false;
            }
          }

          return {
            domContentLoaded: timing ? timing.domContentLoadedEventEnd - timing.navigationStart : 0,
            resourceCount: resources.length,
            totalBytes: resources.reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0),
            cacheHits: resources.filter(r => (r as PerformanceResourceTiming).transferSize === 0).length,
            offlineCapable
          };
        });

        networkResults.push({
          network: networkConfig.name,
          loadTime,
          ...networkMetrics,
          cacheHitRate: networkMetrics.cacheHits / networkMetrics.resourceCount
        });

      } finally {
        await context.close();
      }
    }

    await browser.close();

    // Network performance validations
    networkResults.forEach((result, index) => {
      // Slower networks should benefit more from caching
      if (index > 0) {
        expect(result.cacheHitRate).toBeGreaterThan(networkResults[0].cacheHitRate * 0.8);
      }
      
      // All network conditions should support offline capability
      expect(result.offlineCapable).toBeTruthy();
    });

    // Performance should degrade gracefully with slower networks
    const fastestLoad = Math.min(...networkResults.map(r => r.loadTime));
    const slowestLoad = Math.max(...networkResults.map(r => r.loadTime));
    
    expect(slowestLoad / fastestLoad).toBeLessThan(5); // Max 5x slowdown on worst network

    console.log('Network Performance Results:', networkResults);
  });
});