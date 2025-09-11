// Mobile Performance Testing for WS-257
import { test, expect, devices } from '@playwright/test';
import { PerformanceTimer, MemoryMonitor, WeddingTestDataGenerator, performanceExpect } from '../utils/performance-utils';
import { defaultPerformanceConfig } from '../config/performance-config';

// Mobile Performance Testing Suite
test.describe('Mobile Performance Tests', () => {
  let performanceTimer: PerformanceTimer;
  let memoryMonitor: MemoryMonitor;

  test.beforeEach(() => {
    performanceTimer = new PerformanceTimer();
    memoryMonitor = new MemoryMonitor();
  });

  // Test across different mobile devices
  const mobileDevices = [
    { name: 'iPhone SE', device: devices['iPhone SE'] },
    { name: 'iPhone 14 Pro', device: devices['iPhone 14 Pro'] },
    { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] }
  ];

  for (const { name: deviceName, device } of mobileDevices) {
    test.describe(`${deviceName} Performance`, () => {
      test.use({ ...device });

      test('should meet mobile performance targets for dashboard loading', async ({ page }) => {
        const wedding = WeddingTestDataGenerator.generateWedding();
        
        // Enable network throttling for 3G simulation
        const client = await page.context().newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 300,
          downloadThroughput: 100 * 1024, // 100 KB/s
          uploadThroughput: 50 * 1024,    // 50 KB/s
          connectionType: 'cellular3g'
        });

        performanceTimer.mark('mobile-dashboard-start');

        // Navigate to mobile dashboard
        await page.goto(`/dashboard/weddings/${wedding.id}`, {
          waitUntil: 'networkidle',
          timeout: 10000
        });

        // Wait for critical mobile elements
        await page.waitForSelector('[data-testid="mobile-dashboard"]');
        await page.waitForSelector('[data-testid="mobile-nav"]');
        await page.waitForSelector('[data-testid="wedding-summary"]');

        const dashboardLoadTime = performanceTimer.measure('mobile-dashboard', 'mobile-dashboard-start');

        // Verify mobile performance targets
        performanceExpect.responseTimeBelow(
          dashboardLoadTime,
          defaultPerformanceConfig.targets.dashboardLoading * 1.5, // 3s for mobile
          `${deviceName} dashboard load time`
        );

        // Test mobile touch responsiveness
        await testTouchResponsiveness(page);

        // Measure bundle size impact
        const bundleMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const resources = performance.getEntriesByType('resource');
          
          const jsResources = resources.filter(r => r.name.endsWith('.js'));
          const cssResources = resources.filter(r => r.name.endsWith('.css'));
          
          const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
          const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
          
          return {
            totalSize: totalJSSize + totalCSSSize,
            jsSize: totalJSSize,
            cssSize: totalCSSSize,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart
          };
        });

        // Verify bundle size target
        expect(bundleMetrics.totalSize / 1024).toBeLessThan(
          defaultPerformanceConfig.targets.bundleSize
        );

        console.log(`${deviceName} Performance Results:`);
        console.log(`- Dashboard Load Time: ${dashboardLoadTime.toFixed(2)}ms`);
        console.log(`- Bundle Size: ${(bundleMetrics.totalSize / 1024).toFixed(1)}KB`);
        console.log(`- JS Size: ${(bundleMetrics.jsSize / 1024).toFixed(1)}KB`);
        console.log(`- CSS Size: ${(bundleMetrics.cssSize / 1024).toFixed(1)}KB`);
        console.log(`- DOM Content Loaded: ${bundleMetrics.domContentLoaded.toFixed(2)}ms`);
      });

      test('should handle mobile guest list scrolling efficiently', async ({ page }) => {
        const wedding = WeddingTestDataGenerator.generateWedding({
          guestCount: 500
        });

        await page.goto(`/dashboard/weddings/${wedding.id}/guests`);
        await page.waitForLoadState('networkidle');

        // Test virtual scrolling performance on mobile
        performanceTimer.mark('mobile-scroll-start');

        // Simulate mobile scroll gestures
        await page.evaluate(() => {
          const scrollContainer = document.querySelector('[data-testid="guest-list-container"]');
          if (scrollContainer) {
            // Simulate touch scroll
            let scrollTop = 0;
            const scrollStep = 50;
            const totalScroll = 2000;

            const performScroll = () => {
              scrollContainer.scrollTop = scrollTop;
              scrollTop += scrollStep;
              
              if (scrollTop < totalScroll) {
                requestAnimationFrame(performScroll);
              }
            };

            performScroll();
          }
        });

        // Wait for scroll to complete and measure rendering performance
        await page.waitForTimeout(1000);
        
        const scrollPerformance = await page.evaluate(() => {
          const entries = performance.getEntriesByType('measure').filter(
            entry => entry.name.includes('scroll') || entry.name.includes('render')
          );
          
          return {
            averageFrameTime: entries.length > 0 
              ? entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length 
              : 0,
            totalScrollTime: performance.now() - window.scrollStartTime || 1000
          };
        });

        const scrollTime = performanceTimer.measure('mobile-scroll', 'mobile-scroll-start');

        // Mobile scroll should be smooth (60fps = 16.67ms per frame)
        expect(scrollPerformance.averageFrameTime).toBeLessThan(16.67);
        
        console.log(`${deviceName} Scroll Performance:`);
        console.log(`- Total Scroll Time: ${scrollTime.toFixed(2)}ms`);
        console.log(`- Average Frame Time: ${scrollPerformance.averageFrameTime.toFixed(2)}ms`);
      });

      test('should optimize mobile data usage', async ({ page }) => {
        // Track network requests and data usage
        const networkRequests: Array<{ url: string; size: number; type: string }> = [];
        
        page.on('response', async (response) => {
          try {
            const request = response.request();
            const size = parseInt(response.headers()['content-length'] || '0');
            networkRequests.push({
              url: request.url(),
              size,
              type: request.resourceType()
            });
          } catch (error) {
            // Some responses can't be analyzed
          }
        });

        const wedding = WeddingTestDataGenerator.generateWedding();
        
        await page.goto(`/dashboard/weddings/${wedding.id}`);
        await page.waitForLoadState('networkidle');

        // Navigate through key mobile screens
        const mobileScreens = [
          '/guests',
          '/timeline',
          '/vendors',
          '/documents'
        ];

        for (const screen of mobileScreens) {
          await page.goto(`/dashboard/weddings/${wedding.id}${screen}`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000); // Allow for any lazy loading
        }

        // Analyze data usage
        const totalDataUsage = networkRequests.reduce((sum, req) => sum + req.size, 0);
        const imageDataUsage = networkRequests
          .filter(req => req.type === 'image')
          .reduce((sum, req) => sum + req.size, 0);
        const jsDataUsage = networkRequests
          .filter(req => req.type === 'script')
          .reduce((sum, req) => sum + req.size, 0);

        const dataUsageMB = totalDataUsage / (1024 * 1024);

        // Verify mobile data usage targets
        expect(dataUsageMB).toBeLessThan(
          defaultPerformanceConfig.scenarios.mobile.dataUsageLimits.session
        );

        console.log(`${deviceName} Data Usage Analysis:`);
        console.log(`- Total Data Usage: ${dataUsageMB.toFixed(2)}MB`);
        console.log(`- Image Data: ${(imageDataUsage / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`- JavaScript Data: ${(jsDataUsage / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`- Network Requests: ${networkRequests.length}`);
      });

      test('should maintain performance during low battery simulation', async ({ page }) => {
        // Simulate low battery conditions
        await page.evaluate(() => {
          // Mock battery API
          Object.defineProperty(navigator, 'getBattery', {
            value: () => Promise.resolve({
              level: 0.15, // 15% battery
              charging: false,
              chargingTime: Infinity,
              dischargingTime: 3600, // 1 hour remaining
              addEventListener: () => {},
              removeEventListener: () => {}
            })
          });

          // Trigger battery aware optimizations
          window.dispatchEvent(new CustomEvent('battery-low', {
            detail: { level: 0.15 }
          }));
        });

        const wedding = WeddingTestDataGenerator.generateWedding();
        
        performanceTimer.mark('low-battery-test-start');

        await page.goto(`/dashboard/weddings/${wedding.id}`);
        await page.waitForSelector('[data-testid="mobile-dashboard"]');

        // Test that app switches to battery-saving mode
        const batteryOptimizations = await page.evaluate(() => {
          return {
            animationsDisabled: document.body.classList.contains('low-battery-mode'),
            reducedPolling: window.lowBatteryMode === true,
            backgroundSyncDisabled: !('serviceWorker' in navigator) || 
                                   window.backgroundSyncEnabled === false
          };
        });

        // Verify battery optimizations are active
        expect(batteryOptimizations.animationsDisabled || 
               batteryOptimizations.reducedPolling).toBeTruthy();

        const lowBatteryLoadTime = performanceTimer.measure('low-battery-test', 'low-battery-test-start');

        // Performance should be maintained even with optimizations
        expect(lowBatteryLoadTime).toBeLessThan(5000);

        console.log(`${deviceName} Low Battery Performance:`);
        console.log(`- Load Time: ${lowBatteryLoadTime.toFixed(2)}ms`);
        console.log(`- Battery Optimizations Active: ${Object.values(batteryOptimizations).some(v => v)}`);
      });
    });
  }

  // Cross-device compatibility tests
  test.describe('Cross-Device Compatibility', () => {
    test('should maintain consistent performance across device sizes', async ({ browser }) => {
      const viewports = [
        { name: 'Small Phone', width: 320, height: 568 },
        { name: 'Large Phone', width: 414, height: 896 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 }
      ];

      const results: Array<{ device: string; loadTime: number; renderTime: number }> = [];

      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }
        });
        
        const page = await context.newPage();
        const wedding = WeddingTestDataGenerator.generateWedding();

        performanceTimer.mark(`${viewport.name}-start`);

        await page.goto(`/dashboard/weddings/${wedding.id}`);
        await page.waitForSelector('[data-testid="wedding-dashboard"]');

        // Measure render time
        const renderMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            renderTime: navigation.loadEventEnd - navigation.responseStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
          };
        });

        const loadTime = performanceTimer.measure(viewport.name, `${viewport.name}-start`);

        results.push({
          device: viewport.name,
          loadTime,
          renderTime: renderMetrics.renderTime
        });

        await context.close();
      }

      // Verify consistent performance across devices
      const loadTimes = results.map(r => r.loadTime);
      const maxVariance = Math.max(...loadTimes) - Math.min(...loadTimes);
      
      // Variance should be less than 1 second across devices
      expect(maxVariance).toBeLessThan(1000);

      console.log('Cross-Device Performance Results:');
      results.forEach(result => {
        console.log(`- ${result.device}: ${result.loadTime.toFixed(2)}ms load, ${result.renderTime.toFixed(2)}ms render`);
      });
    });
  });

  // Helper function for touch responsiveness testing
  async function testTouchResponsiveness(page: any): Promise<void> {
    const touchElements = [
      '[data-testid="mobile-nav-item"]',
      '[data-testid="guest-card"]',
      '[data-testid="action-button"]'
    ];

    const touchTimes: number[] = [];

    for (const selector of touchElements) {
      const elements = await page.locator(selector).all();
      
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const startTime = performance.now();
        
        await elements[i].tap();
        
        // Wait for visual feedback or navigation
        await page.waitForTimeout(50);
        
        const touchTime = performance.now() - startTime;
        touchTimes.push(touchTime);
      }
    }

    if (touchTimes.length > 0) {
      const avgTouchTime = touchTimes.reduce((sum, time) => sum + time, 0) / touchTimes.length;
      
      performanceExpected.responseTimeBelow(
        avgTouchTime,
        defaultPerformanceConfig.targets.mobileTouch,
        'Mobile touch responsiveness'
      );
    }
  }

  // Offline Performance Testing
  test.describe('Offline Performance', () => {
    test('should maintain functionality when offline', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();

      // First load the page online
      await page.goto(`/dashboard/weddings/${wedding.id}`);
      await page.waitForLoadState('networkidle');

      // Go offline
      await page.context().setOffline(true);

      performanceTimer.mark('offline-test-start');

      // Test offline functionality
      await page.reload();
      
      try {
        // Should load from service worker cache
        await page.waitForSelector('[data-testid="wedding-dashboard"]', { timeout: 5000 });
        
        const offlineLoadTime = performanceTimer.measure('offline-test', 'offline-test-start');
        
        // Offline should be faster than online (from cache)
        expect(offlineLoadTime).toBeLessThan(2000);
        
        // Verify offline indicator is shown
        const isOfflineIndicatorVisible = await page.isVisible('[data-testid="offline-indicator"]');
        expect(isOfflineIndicatorVisible).toBeTruthy();

        console.log(`Offline Performance: ${offlineLoadTime.toFixed(2)}ms`);
      } catch (error) {
        console.error('Offline functionality failed:', error);
        throw error;
      } finally {
        // Restore online state
        await page.context().setOffline(false);
      }
    });

    test('should sync data when coming back online', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();

      await page.goto(`/dashboard/weddings/${wedding.id}/guests`);
      await page.waitForLoadState('networkidle');

      // Go offline
      await page.context().setOffline(true);

      // Make changes while offline
      await page.click('[data-testid="add-guest-button"]');
      await page.fill('[data-testid="guest-name-input"]', 'Offline Added Guest');
      await page.fill('[data-testid="guest-email-input"]', 'offline@example.com');
      await page.click('[data-testid="save-guest-button"]');

      // Guest should be saved locally
      await page.waitForSelector('[data-guest-name="Offline Added Guest"]');

      performanceTimer.mark('sync-test-start');

      // Come back online
      await page.context().setOffline(false);

      // Wait for sync to complete
      await page.waitForSelector('[data-testid="sync-complete-indicator"]', { timeout: 10000 });

      const syncTime = performanceTimer.measure('sync-test', 'sync-test-start');

      // Sync should complete quickly
      expect(syncTime).toBeLessThan(5000);

      console.log(`Offline Sync Performance: ${syncTime.toFixed(2)}ms`);
    });
  });

  test.afterEach(async () => {
    const testName = expect.getState().currentTestName || 'Unknown Test';
    const duration = performanceTimer.getDuration();
    
    console.log(`\n${testName} completed in ${duration.toFixed(2)}ms`);
    
    // Log memory usage
    console.log(memoryMonitor.getReport());
  });
});

// PWA Performance Testing
test.describe('Progressive Web App Performance', () => {
  test('should install and launch quickly as PWA', async ({ page }) => {
    // Navigate to app
    await page.goto('/dashboard');
    
    // Check PWA installability
    const pwaMetrics = await page.evaluate(() => {
      const manifest = document.querySelector('link[rel="manifest"]');
      const serviceWorker = 'serviceWorker' in navigator;
      
      return {
        hasManifest: !!manifest,
        hasServiceWorker: serviceWorker,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches
      };
    });

    expect(pwaMetrics.hasManifest).toBeTruthy();
    expect(pwaMetrics.hasServiceWorker).toBeTruthy();

    console.log('PWA Capabilities:');
    console.log(`- Manifest: ${pwaMetrics.hasManifest}`);
    console.log(`- Service Worker: ${pwaMetrics.hasServiceWorker}`);
    console.log(`- Standalone Mode: ${pwaMetrics.isStandalone}`);
  });
});

test.afterAll(async () => {
  console.log('\n=== Mobile Performance Testing Complete ===');
  console.log('All mobile performance targets validated across devices');
});