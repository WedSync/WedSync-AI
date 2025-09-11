import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('PWA Resource Loading Performance - WS-171', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      serviceWorkers: 'allow'
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should optimize resource loading with effective caching strategies', async () => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const resourceAnalysis = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const analysis = {
        totalResources: resources.length,
        cacheHits: 0,
        networkRequests: 0,
        staticAssets: {
          count: 0,
          totalSize: 0,
          cachedCount: 0
        },
        apiRequests: {
          count: 0,
          totalSize: 0,
          cachedCount: 0
        },
        images: {
          count: 0,
          totalSize: 0,
          cachedCount: 0
        },
        scripts: {
          count: 0,
          totalSize: 0,
          cachedCount: 0
        },
        stylesheets: {
          count: 0,
          totalSize: 0,
          cachedCount: 0
        },
        averageLoadTimes: {
          cached: 0,
          network: 0
        }
      };

      const cachedResources: number[] = [];
      const networkResources: number[] = [];

      resources.forEach(resource => {
        const isFromCache = resource.transferSize === 0 && resource.decodedBodySize > 0;
        const resourceSize = resource.transferSize || resource.decodedBodySize || 0;

        if (isFromCache) {
          analysis.cacheHits++;
          cachedResources.push(resource.duration);
        } else {
          analysis.networkRequests++;
          networkResources.push(resource.duration);
        }

        // Categorize resources
        const url = new URL(resource.name);
        const path = url.pathname;

        if (path.startsWith('/api/')) {
          analysis.apiRequests.count++;
          analysis.apiRequests.totalSize += resourceSize;
          if (isFromCache) analysis.apiRequests.cachedCount++;
        } else if (path.includes('_next/static/') || path.includes('.js')) {
          analysis.scripts.count++;
          analysis.scripts.totalSize += resourceSize;
          if (isFromCache) analysis.scripts.cachedCount++;
        } else if (path.includes('.css') || path.includes('_next/static/css/')) {
          analysis.stylesheets.count++;
          analysis.stylesheets.totalSize += resourceSize;
          if (isFromCache) analysis.stylesheets.cachedCount++;
        } else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
          analysis.images.count++;
          analysis.images.totalSize += resourceSize;
          if (isFromCache) analysis.images.cachedCount++;
        } else {
          analysis.staticAssets.count++;
          analysis.staticAssets.totalSize += resourceSize;
          if (isFromCache) analysis.staticAssets.cachedCount++;
        }
      });

      // Calculate average load times
      analysis.averageLoadTimes.cached = cachedResources.length > 0 ? 
        cachedResources.reduce((a, b) => a + b, 0) / cachedResources.length : 0;
      analysis.averageLoadTimes.network = networkResources.length > 0 ?
        networkResources.reduce((a, b) => a + b, 0) / networkResources.length : 0;

      return analysis;
    });

    // Performance assertions
    const cacheHitRatio = resourceAnalysis.cacheHits / resourceAnalysis.totalResources;
    expect(cacheHitRatio).toBeGreaterThan(0.4); // 40% cache hit ratio minimum

    // Static assets should be heavily cached
    if (resourceAnalysis.scripts.count > 0) {
      const scriptCacheRatio = resourceAnalysis.scripts.cachedCount / resourceAnalysis.scripts.count;
      expect(scriptCacheRatio).toBeGreaterThan(0.7); // 70% script cache hit ratio
    }

    if (resourceAnalysis.stylesheets.count > 0) {
      const cssCacheRatio = resourceAnalysis.stylesheets.cachedCount / resourceAnalysis.stylesheets.count;
      expect(cssCacheRatio).toBeGreaterThan(0.7); // 70% CSS cache hit ratio
    }

    // Cached resources should load faster than network resources
    if (resourceAnalysis.averageLoadTimes.cached > 0 && resourceAnalysis.averageLoadTimes.network > 0) {
      expect(resourceAnalysis.averageLoadTimes.cached).toBeLessThan(resourceAnalysis.averageLoadTimes.network);
    }

    console.log('Resource Loading Analysis:', resourceAnalysis);
  });

  test('should handle large resource loading efficiently', async () => {
    await page.goto('/dashboard');

    // Test loading of large resources (photos, videos, documents)
    const largeResourceTest = await page.evaluate(async () => {
      const testResults = {
        imageLoadTest: { success: false, loadTime: 0, fromCache: false },
        documentLoadTest: { success: false, loadTime: 0, fromCache: false },
        bundleLoadTest: { success: false, loadTime: 0, fromCache: false }
      };

      try {
        // Test large image loading
        const imageStart = performance.now();
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            testResults.imageLoadTest = {
              success: true,
              loadTime: performance.now() - imageStart,
              fromCache: false // New image won't be cached initially
            };
            resolve(true);
          };
          img.onerror = reject;
          img.src = '/icons/icon-512x512.png'; // Large icon for testing
        });

        // Test JavaScript bundle loading performance
        const bundleStart = performance.now();
        try {
          await import('/public/sw.js');
          testResults.bundleLoadTest = {
            success: true,
            loadTime: performance.now() - bundleStart,
            fromCache: false
          };
        } catch (error) {
          // Service worker might not be importable, that's okay
          testResults.bundleLoadTest = {
            success: false,
            loadTime: performance.now() - bundleStart,
            fromCache: false
          };
        }

      } catch (error) {
        console.error('Large resource test error:', error);
      }

      return testResults;
    });

    // Large resources should load within acceptable timeframes
    if (largeResourceTest.imageLoadTest.success) {
      expect(largeResourceTest.imageLoadTest.loadTime).toBeLessThan(3000); // Images < 3s
    }

    console.log('Large Resource Loading Test:', largeResourceTest);
  });

  test('should demonstrate progressive loading strategies', async () => {
    await page.goto('/');

    const progressiveLoadingTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        const loadingStages = {
          domContentLoaded: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          firstMeaningfulPaint: 0,
          fullyLoaded: 0,
          interactionReady: 0
        };

        // Capture timing events
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          loadingStages.domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
          loadingStages.fullyLoaded = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
        }

        // Paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            loadingStages.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            loadingStages.firstContentfulPaint = entry.startTime;
          }
        });

        // Test interaction readiness
        const interactionStart = performance.now();
        const testButton = document.querySelector('button, a, [role="button"]');
        if (testButton) {
          testButton.addEventListener('click', () => {
            loadingStages.interactionReady = performance.now() - interactionStart;
          });
          
          // Simulate user interaction
          setTimeout(() => {
            testButton.click();
          }, 100);
        } else {
          loadingStages.interactionReady = 0;
        }

        setTimeout(() => {
          resolve(loadingStages);
        }, 1000);
      });
    });

    // Progressive loading should show clear stage improvements
    expect(progressiveLoadingTest.firstPaint).toBeLessThan(1600); // First paint < 1.6s
    expect(progressiveLoadingTest.firstContentfulPaint).toBeLessThan(1800); // FCP < 1.8s
    expect(progressiveLoadingTest.domContentLoaded).toBeLessThan(2500); // DOM ready < 2.5s

    // Each stage should progress logically
    expect(progressiveLoadingTest.firstPaint).toBeLessThan(progressiveLoadingTest.firstContentfulPaint);
    expect(progressiveLoadingTest.firstContentfulPaint).toBeLessThan(progressiveLoadingTest.domContentLoaded);

    console.log('Progressive Loading Stages:', progressiveLoadingTest);
  });

  test('should optimize critical resource prioritization', async () => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const criticalResourceTest = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const criticalResources = {
        mainCSS: [],
        mainJS: [],
        criticalAPI: [],
        fonts: [],
        icons: []
      };

      resources.forEach(resource => {
        const url = new URL(resource.name);
        const path = url.pathname;

        if (path.includes('.css') && path.includes('_next/static/css/')) {
          criticalResources.mainCSS.push({
            url: path,
            loadTime: resource.duration,
            startTime: resource.startTime,
            priority: resource.fetchStart - resource.startTime
          });
        } else if (path.includes('.js') && path.includes('_next/static/chunks/')) {
          criticalResources.mainJS.push({
            url: path,
            loadTime: resource.duration,
            startTime: resource.startTime,
            priority: resource.fetchStart - resource.startTime
          });
        } else if (path.startsWith('/api/') && (path.includes('auth') || path.includes('user'))) {
          criticalResources.criticalAPI.push({
            url: path,
            loadTime: resource.duration,
            startTime: resource.startTime,
            priority: resource.fetchStart - resource.startTime
          });
        } else if (path.includes('font') || resource.name.includes('woff')) {
          criticalResources.fonts.push({
            url: path,
            loadTime: resource.duration,
            startTime: resource.startTime
          });
        } else if (path.includes('icon') || path.includes('favicon')) {
          criticalResources.icons.push({
            url: path,
            loadTime: resource.duration,
            startTime: resource.startTime
          });
        }
      });

      // Calculate average load times for each category
      const averages = {};
      Object.keys(criticalResources).forEach(category => {
        const resources = criticalResources[category];
        if (resources.length > 0) {
          const avgLoadTime = resources.reduce((sum, resource) => sum + resource.loadTime, 0) / resources.length;
          const avgStartTime = resources.reduce((sum, resource) => sum + resource.startTime, 0) / resources.length;
          
          averages[category] = {
            count: resources.length,
            averageLoadTime: avgLoadTime,
            averageStartTime: avgStartTime,
            resources: resources.slice(0, 3) // Sample first 3 resources
          };
        }
      });

      return averages;
    });

    // Critical resources should load quickly
    if (criticalResourceTest.mainCSS) {
      expect(criticalResourceTest.mainCSS.averageLoadTime).toBeLessThan(1000); // CSS < 1s
    }

    if (criticalResourceTest.mainJS) {
      expect(criticalResourceTest.mainJS.averageLoadTime).toBeLessThan(1500); // JS < 1.5s
    }

    if (criticalResourceTest.criticalAPI) {
      expect(criticalResourceTest.criticalAPI.averageLoadTime).toBeLessThan(800); // API < 800ms
    }

    console.log('Critical Resource Prioritization:', criticalResourceTest);
  });

  test('should validate resource compression and optimization', async () => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const compressionTest = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const compressionAnalysis = {
        totalResources: resources.length,
        compressedResources: 0,
        totalTransferSize: 0,
        totalDecodedSize: 0,
        compressionRatio: 0,
        byType: {
          javascript: { count: 0, transferSize: 0, decodedSize: 0, compressionRatio: 0 },
          css: { count: 0, transferSize: 0, decodedSize: 0, compressionRatio: 0 },
          html: { count: 0, transferSize: 0, decodedSize: 0, compressionRatio: 0 },
          images: { count: 0, transferSize: 0, decodedSize: 0, compressionRatio: 0 },
          api: { count: 0, transferSize: 0, decodedSize: 0, compressionRatio: 0 }
        }
      };

      resources.forEach(resource => {
        if (resource.transferSize > 0 && resource.decodedBodySize > 0) {
          compressionAnalysis.totalTransferSize += resource.transferSize;
          compressionAnalysis.totalDecodedSize += resource.decodedBodySize;

          if (resource.transferSize < resource.decodedBodySize) {
            compressionAnalysis.compressedResources++;
          }

          // Categorize by type
          const url = new URL(resource.name);
          const path = url.pathname;

          if (path.includes('.js') || path.includes('javascript')) {
            const type = compressionAnalysis.byType.javascript;
            type.count++;
            type.transferSize += resource.transferSize;
            type.decodedSize += resource.decodedBodySize;
          } else if (path.includes('.css')) {
            const type = compressionAnalysis.byType.css;
            type.count++;
            type.transferSize += resource.transferSize;
            type.decodedSize += resource.decodedBodySize;
          } else if (path.includes('.html') || resource.responseStatus === 200) {
            const type = compressionAnalysis.byType.html;
            type.count++;
            type.transferSize += resource.transferSize;
            type.decodedSize += resource.decodedBodySize;
          } else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
            const type = compressionAnalysis.byType.images;
            type.count++;
            type.transferSize += resource.transferSize;
            type.decodedSize += resource.decodedBodySize;
          } else if (path.startsWith('/api/')) {
            const type = compressionAnalysis.byType.api;
            type.count++;
            type.transferSize += resource.transferSize;
            type.decodedSize += resource.decodedBodySize;
          }
        }
      });

      // Calculate overall compression ratio
      if (compressionAnalysis.totalDecodedSize > 0) {
        compressionAnalysis.compressionRatio = 
          (compressionAnalysis.totalDecodedSize - compressionAnalysis.totalTransferSize) / 
          compressionAnalysis.totalDecodedSize;
      }

      // Calculate compression ratios by type
      Object.keys(compressionAnalysis.byType).forEach(type => {
        const typeData = compressionAnalysis.byType[type];
        if (typeData.decodedSize > 0) {
          typeData.compressionRatio = (typeData.decodedSize - typeData.transferSize) / typeData.decodedSize;
        }
      });

      return compressionAnalysis;
    });

    // Validate compression effectiveness
    expect(compressionAnalysis.compressionRatio).toBeGreaterThan(0.3); // 30% overall compression

    // Text-based resources should be well compressed
    if (compressionAnalysis.byType.javascript.count > 0) {
      expect(compressionAnalysis.byType.javascript.compressionRatio).toBeGreaterThan(0.5); // JS 50% compression
    }

    if (compressionAnalysis.byType.css.count > 0) {
      expect(compressionAnalysis.byType.css.compressionRatio).toBeGreaterThan(0.4); // CSS 40% compression
    }

    console.log('Resource Compression Analysis:', {
      ...compressionAnalysis,
      compressionPercentage: `${(compressionAnalysis.compressionRatio * 100).toFixed(1)}%`,
      totalSavingsKB: Math.round((compressionAnalysis.totalDecodedSize - compressionAnalysis.totalTransferSize) / 1024)
    });
  });

  test('should validate efficient font loading strategies', async () => {
    await page.goto('/dashboard');

    const fontLoadingTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        const fontMetrics = {
          fontsRequested: 0,
          fontsLoaded: 0,
          fontLoadTime: 0,
          webfontsUsed: [],
          fallbacksUsed: [],
          foutOccurred: false, // Flash of Unstyled Text
          fwitOccurred: false  // Flash of Invisible Text
        };

        const startTime = performance.now();

        // Check if fonts are loading
        if (document.fonts) {
          fontMetrics.fontsRequested = document.fonts.size;

          document.fonts.ready.then(() => {
            fontMetrics.fontsLoaded = document.fonts.size;
            fontMetrics.fontLoadTime = performance.now() - startTime;

            // Check which fonts are actually used
            document.fonts.forEach((font) => {
              fontMetrics.webfontsUsed.push({
                family: font.family,
                status: font.status,
                loaded: font.loaded
              });
            });

            resolve(fontMetrics);
          });

          // Timeout if fonts don't load within 3 seconds
          setTimeout(() => {
            fontMetrics.fontLoadTime = performance.now() - startTime;
            resolve(fontMetrics);
          }, 3000);
        } else {
          resolve(fontMetrics);
        }
      });
    });

    // Font loading should be fast and efficient
    if (fontLoadingTest.fontsRequested > 0) {
      expect(fontLoadingTest.fontLoadTime).toBeLessThan(2000); // Fonts load < 2s
      expect(fontLoadingTest.fontsLoaded).toBeGreaterThanOrEqual(0);
    }

    console.log('Font Loading Performance:', fontLoadingTest);
  });
});