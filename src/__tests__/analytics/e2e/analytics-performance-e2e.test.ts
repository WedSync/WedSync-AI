/**
 * WS-332 Team E: End-to-End Analytics Performance Testing with Playwright
 *
 * Comprehensive browser-based performance testing for WedSync analytics dashboard.
 * Validates user experience, visual performance, and real-world usage scenarios
 * using Playwright automation for enterprise-grade E2E testing coverage.
 *
 * @feature WS-332
 * @team Team-E-QA-Testing
 * @category E2E Performance Testing
 */

import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { AnalyticsPerformanceRunner } from '../utils/analytics-performance-runner';
import { AnalyticsLoadScenarios } from '../scenarios/analytics-load-scenarios';

// Helper functions to reduce nesting complexity (S2004 compliance)
const createAnalyticsUpdatePromise = (updateIndex: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const event = new CustomEvent('analytics-update', {
        detail: {
          type: 'revenue',
          value: Math.random() * 1000,
          timestamp: Date.now(),
          update: updateIndex,
        },
      });
      window.dispatchEvent(event);
      resolve(updateIndex);
    }, updateIndex * 100);
  });
};

const createWeddingUpdateEvents = () => {
  return [
    { type: 'guest_arrival', count: Math.floor(Math.random() * 5) },
    { type: 'photo_uploaded', count: Math.floor(Math.random() * 3) },
    { type: 'payment_processed', amount: Math.random() * 500 },
    { type: 'vendor_check_in', vendor: `vendor_${Math.floor(Math.random() * 10)}` },
  ];
};

const startRealTimeWeddingUpdates = () => {
  setInterval(() => {
    const events = createWeddingUpdateEvents();
    events.forEach((event) => {
      window.dispatchEvent(new CustomEvent('wedding-update', { detail: event }));
    });
  }, 500);
};

const createConcurrentPageLoad = async (page: any, index: number) => {
  const pageLoadStart = Date.now();
  await page.goto('/analytics/dashboard');
  await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
  const pageLoadTime = Date.now() - pageLoadStart;
  return { pageIndex: index, loadTime: pageLoadTime };
};

const createHighVolumeDataEvent = (type: string, processedCount: number) => {
  return {
    type,
    timestamp: Date.now(),
    volume: Math.floor(Math.random() * 100),
    processed: processedCount,
  };
};

const processHighVolumeDataTypes = (processedCount: number) => {
  const dataTypes = ['bookings', 'payments', 'client_communications', 'vendor_interactions'];
  return dataTypes.map(type => createHighVolumeDataEvent(type, processedCount));
};

// Performance thresholds for wedding analytics platform
const PERFORMANCE_THRESHOLDS = {
  pageLoadTime: 3000, // ms - Critical for wedding day usage
  dashboardRenderTime: 2000, // ms - Real-time dashboard must be fast
  chartLoadTime: 1500, // ms - Analytics charts load time
  apiResponseTime: 500, // ms - API calls response time
  interactionResponseTime: 300, // ms - User interaction response
  memoryUsage: 100 * 1024 * 1024, // 100MB - Browser memory limit
  networkRequests: 50, // Maximum requests per page load
  firstContentfulPaint: 1200, // ms - FCP threshold
  largestContentfulPaint: 2500, // ms - LCP threshold
  cumulativeLayoutShift: 0.1, // CLS threshold
  timeToInteractive: 3000, // ms - TTI threshold
};

// Test configuration for different wedding business scenarios
const WEDDING_SCENARIOS = {
  peakSeason: {
    name: 'Peak Wedding Season (June-September)',
    concurrentUsers: 500,
    dataVolume: 'high',
    expectedLoad: 'peak',
  },
  weddingDay: {
    name: 'Live Wedding Day',
    concurrentUsers: 100,
    dataVolume: 'medium',
    expectedLoad: 'critical',
    realTimeUpdates: true,
  },
  yearEndReporting: {
    name: 'Year-End Business Analytics',
    concurrentUsers: 50,
    dataVolume: 'very_high',
    expectedLoad: 'heavy',
  },
  dailyOperations: {
    name: 'Daily Business Operations',
    concurrentUsers: 25,
    dataVolume: 'medium',
    expectedLoad: 'normal',
  },
};

test.describe('WS-332: Analytics Dashboard E2E Performance Testing', () => {
  let performanceRunner: AnalyticsPerformanceRunner;
  let loadScenarios: AnalyticsLoadScenarios;

  test.beforeAll(async () => {
    console.log('[WS-332] Initializing E2E Analytics Performance Testing...');

    // Initialize performance testing utilities
    performanceRunner = new AnalyticsPerformanceRunner({
      testMode: 'comprehensive',
      includeMemoryProfiling: true,
      includeNetworkProfiling: true,
      includeCPUProfiling: true,
      enableScreenshots: true,
      enableVideoRecording: true,
      enableTracing: true,
    });

    loadScenarios = new AnalyticsLoadScenarios();

    console.log('[WS-332] E2E Performance testing environment ready');
  });

  test.describe('Core Analytics Dashboard Performance', () => {
    test('should load analytics dashboard within performance thresholds', async ({
      page,
      browser,
    }) => {
      console.log('[WS-332] Testing analytics dashboard core performance...');

      // Start performance monitoring
      const performanceStartTime = Date.now();
      await page.goto('/analytics/dashboard', { waitUntil: 'networkidle' });

      // Helper function to get paint timing - EXTRACTED TO REDUCE NESTING
      const getFirstContentfulPaint = (performance: Performance): number => {
        return performance
          .getEntriesByType('paint')
          .find((entry) => entry.name === 'first-contentful-paint')
          ?.startTime || 0;
      };

      const getLargestContentfulPaint = (performance: Performance): number => {
        return performance.getEntriesByType('largest-contentful-paint')[0]
          ?.startTime || 0;
      };

      // Measure page load performance with extracted helpers (S2004 compliance)
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const firstContentfulPaint = getFirstContentfulPaint(performance);
        const largestContentfulPaint = getLargestContentfulPaint(performance);

        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          firstContentfulPaint,
          largestContentfulPaint,
          totalLoadTime: Date.now() - performance.timeOrigin,
        };
      });

      // Assert performance thresholds
      expect(performanceMetrics.totalLoadTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.pageLoadTime,
      );
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(
        PERFORMANCE_THRESHOLDS.firstContentfulPaint,
      );
      expect(performanceMetrics.largestContentfulPaint).toBeLessThan(
        PERFORMANCE_THRESHOLDS.largestContentfulPaint,
      );

      // Validate dashboard elements are visible
      await expect(
        page.locator('[data-testid="analytics-dashboard"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="performance-metrics"]'),
      ).toBeVisible();

      const pageLoadTime = Date.now() - performanceStartTime;
      console.log(`[WS-332] Dashboard loaded in ${pageLoadTime}ms`);

      // Take screenshot for visual validation
      await page.screenshot({
        path: `test-results/analytics-dashboard-${Date.now()}.png`,
        fullPage: true,
      });
    });

    test('should handle real-time data updates without performance degradation', async ({
      page,
    }) => {
      console.log('[WS-332] Testing real-time analytics performance...');

      await page.goto('/analytics/dashboard');

      // Start monitoring performance during real-time updates
      const initialMemory = await page.evaluate(
        () => (performance as any).memory?.usedJSHeapSize || 0,
      );

      // Simulate real-time wedding data updates with reduced nesting (S2004 compliance)
      const updatePromises = Array.from({ length: 10 }, (_, i) => 
        page.evaluate(createAnalyticsUpdatePromise, i)
      );

      await Promise.all(updatePromises);

      // Measure performance after updates
      const finalMemory = await page.evaluate(
        () => (performance as any).memory?.usedJSHeapSize || 0,
      );
      const memoryIncrease = finalMemory - initialMemory;

      // Assert memory usage didn't exceed threshold
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);

      // Verify charts still render quickly after updates
      const chartRenderStart = Date.now();
      await expect(
        page.locator('[data-testid="revenue-chart"] canvas'),
      ).toBeVisible();
      const chartRenderTime = Date.now() - chartRenderStart;

      expect(chartRenderTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.chartLoadTime,
      );

      console.log(
        `[WS-332] Real-time updates completed. Memory increase: ${Math.round(memoryIncrease / 1024)}KB, Chart render: ${chartRenderTime}ms`,
      );
    });

    test('should maintain performance under wedding day critical load', async ({
      page,
      context,
    }) => {
      console.log('[WS-332] Testing wedding day critical load performance...');

      // Simulate wedding day scenario
      const weddingScenario = WEDDING_SCENARIOS.weddingDay;

      await page.goto('/analytics/dashboard');

      // Enable real-time monitoring with reduced nesting (S2004 compliance)
      await page.evaluate(startRealTimeWeddingUpdates);

      // Monitor performance over 30 seconds (simulated wedding period)
      const performanceData = [];
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000); // Wait 5 seconds

        const metrics = await page.evaluate(() => {
          return {
            timestamp: Date.now(),
            memory: (performance as any).memory?.usedJSHeapSize || 0,
            performanceEntries: performance.getEntriesByType('measure').length,
            domNodes: document.querySelectorAll('*').length,
          };
        });

        performanceData.push(metrics);

        // Verify dashboard is still responsive
        const interactionStart = Date.now();
        await page.locator('[data-testid="refresh-analytics"]').click();
        await page.waitForSelector('[data-testid="analytics-loading"]', {
          state: 'hidden',
        });
        const interactionTime = Date.now() - interactionStart;

        expect(interactionTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.interactionResponseTime,
        );
      }

      // Analyze performance degradation
      const initialMemory = performanceData[0].memory;
      const finalMemory = performanceData[performanceData.length - 1].memory;
      const memoryGrowth =
        ((finalMemory - initialMemory) / initialMemory) * 100;

      // Assert no significant memory leaks during wedding day load
      expect(memoryGrowth).toBeLessThan(50); // Less than 50% memory growth

      console.log(
        `[WS-332] Wedding day load test completed. Memory growth: ${memoryGrowth.toFixed(2)}%`,
      );
    });
  });

  test.describe('Analytics Charts and Data Visualization Performance', () => {
    test('should render complex wedding analytics charts efficiently', async ({
      page,
    }) => {
      console.log('[WS-332] Testing analytics charts performance...');

      await page.goto('/analytics/charts');

      // Test multiple chart types common in wedding analytics
      const chartTypes = [
        {
          selector: '[data-testid="revenue-line-chart"]',
          type: 'Revenue Trends',
        },
        {
          selector: '[data-testid="booking-bar-chart"]',
          type: 'Monthly Bookings',
        },
        {
          selector: '[data-testid="client-pie-chart"]',
          type: 'Client Demographics',
        },
        {
          selector: '[data-testid="seasonal-heatmap"]',
          type: 'Seasonal Patterns',
        },
        {
          selector: '[data-testid="vendor-performance-radar"]',
          type: 'Vendor Performance',
        },
      ];

      const chartPerformance = [];

      for (const chart of chartTypes) {
        const renderStart = Date.now();

        // Wait for chart to be visible and fully rendered
        await expect(page.locator(chart.selector)).toBeVisible();
        await page.waitForSelector(
          `${chart.selector} canvas, ${chart.selector} svg`,
          { timeout: 5000 },
        );

        const renderTime = Date.now() - renderStart;

        // Verify chart interactivity
        await page.hover(chart.selector);
        const tooltipVisible = await page
          .locator('[data-testid="chart-tooltip"]')
          .isVisible({ timeout: 1000 })
          .catch(() => false);

        chartPerformance.push({
          type: chart.type,
          renderTime,
          interactive: tooltipVisible,
        });

        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.chartLoadTime);
      }

      console.log(
        `[WS-332] Charts performance:`,
        chartPerformance.map((c) => `${c.type}: ${c.renderTime}ms`),
      );
    });

    test('should handle large wedding dataset visualization without blocking UI', async ({
      page,
    }) => {
      console.log(
        '[WS-332] Testing large dataset visualization performance...',
      );

      await page.goto('/analytics/large-dataset');

      // Simulate loading large wedding dataset (10,000+ records)
      const dataLoadStart = Date.now();
      await page.click('[data-testid="load-annual-data"]');

      // Verify loading state is shown
      await expect(
        page.locator('[data-testid="data-loading-spinner"]'),
      ).toBeVisible();

      // Wait for data to load without blocking main thread
      await expect(page.locator('[data-testid="data-table"]')).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.locator('[data-testid="data-loading-spinner"]'),
      ).not.toBeVisible();

      const dataLoadTime = Date.now() - dataLoadStart;

      // Verify UI remains responsive during data processing
      const scrollStart = Date.now();
      await page.mouse.wheel(0, 1000);
      const scrollResponse = Date.now() - scrollStart;

      expect(scrollResponse).toBeLessThan(100); // UI should remain responsive
      expect(dataLoadTime).toBeLessThan(10000); // Data should load within 10 seconds

      // Test pagination performance
      const paginationStart = Date.now();
      await page.click('[data-testid="next-page"]');
      await page.waitForSelector('[data-testid="page-2-loaded"]');
      const paginationTime = Date.now() - paginationStart;

      expect(paginationTime).toBeLessThan(1000);

      console.log(
        `[WS-332] Large dataset: Load ${dataLoadTime}ms, Scroll ${scrollResponse}ms, Pagination ${paginationTime}ms`,
      );
    });
  });

  test.describe('Cross-Platform Analytics Performance', () => {
    test('should integrate efficiently with external BI platforms', async ({
      page,
    }) => {
      console.log(
        '[WS-332] Testing cross-platform BI integration performance...',
      );

      await page.goto('/analytics/integrations');

      // Test integration with mock BI platforms
      const integrations = [
        { platform: 'tableau', testId: 'tableau-integration' },
        { platform: 'powerbi', testId: 'powerbi-integration' },
        { platform: 'looker', testId: 'looker-integration' },
      ];

      const integrationResults = [];

      for (const integration of integrations) {
        const syncStart = Date.now();

        // Trigger data sync with BI platform
        await page.click(`[data-testid="${integration.testId}-sync"]`);

        // Wait for sync completion
        await expect(
          page.locator(`[data-testid="${integration.testId}-status"]`),
        ).toContainText('Synced');

        const syncTime = Date.now() - syncStart;

        // Verify sync was successful
        const syncStatus = await page
          .locator(`[data-testid="${integration.testId}-status"]`)
          .textContent();

        integrationResults.push({
          platform: integration.platform,
          syncTime,
          status: syncStatus,
        });

        expect(syncTime).toBeLessThan(5000); // BI sync should complete within 5 seconds
        expect(syncStatus).toContain('Synced');
      }

      console.log(`[WS-332] BI Integration Results:`, integrationResults);
    });

    test('should handle concurrent analytics requests efficiently', async ({
      browser,
    }) => {
      console.log('[WS-332] Testing concurrent analytics requests...');

      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);

      const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

      // Simulate concurrent dashboard loads with reduced nesting (S2004 compliance)
      const concurrentLoadStart = Date.now();
      const loadPromises = pages.map((page, index) => createConcurrentPageLoad(page, index));

      const results = await Promise.all(loadPromises);
      const totalConcurrentTime = Date.now() - concurrentLoadStart;

      // Verify all pages loaded efficiently
      results.forEach((result) => {
        expect(result.loadTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.pageLoadTime * 1.5,
        ); // Allow 50% overhead for concurrency
      });

      const averageLoadTime =
        results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;

      console.log(
        `[WS-332] Concurrent load test: ${results.length} pages, Average: ${averageLoadTime}ms, Total: ${totalConcurrentTime}ms`,
      );

      // Cleanup
      await Promise.all(contexts.map((ctx) => ctx.close()));
    });
  });

  test.describe('Mobile Analytics Performance', () => {
    test('should perform well on mobile devices during wedding events', async ({
      browser,
    }) => {
      console.log('[WS-332] Testing mobile analytics performance...');

      // Create mobile context
      const mobileContext = await browser.newContext({
        ...browser.devices()['iPhone 12'],
        // Simulate slower mobile network
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
      });

      const mobilePage = await mobileContext.newPage();

      // Test mobile dashboard performance
      const mobileLoadStart = Date.now();
      await mobilePage.goto('/analytics/mobile-dashboard');

      // Wait for mobile-optimized dashboard
      await expect(
        mobilePage.locator('[data-testid="mobile-analytics-dashboard"]'),
      ).toBeVisible();
      const mobileLoadTime = Date.now() - mobileLoadStart;

      // Mobile should load within stricter thresholds
      expect(mobileLoadTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.pageLoadTime * 1.2,
      );

      // Test touch interactions
      const touchStart = Date.now();
      await mobilePage.tap('[data-testid="revenue-chart"]');
      await expect(
        mobilePage.locator('[data-testid="chart-details"]'),
      ).toBeVisible();
      const touchResponse = Date.now() - touchStart;

      expect(touchResponse).toBeLessThan(500); // Touch interactions should be responsive

      // Test scrolling performance on mobile
      const scrollStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await mobilePage.mouse.wheel(0, 200);
        await mobilePage.waitForTimeout(100);
      }
      const scrollTime = Date.now() - scrollStart;

      expect(scrollTime).toBeLessThan(1000); // Smooth scrolling

      // Take mobile screenshot
      await mobilePage.screenshot({
        path: `test-results/mobile-analytics-${Date.now()}.png`,
        fullPage: true,
      });

      console.log(
        `[WS-332] Mobile performance: Load ${mobileLoadTime}ms, Touch ${touchResponse}ms, Scroll ${scrollTime}ms`,
      );

      await mobileContext.close();
    });

    test('should handle offline capabilities for wedding venue scenarios', async ({
      page,
      context,
    }) => {
      console.log('[WS-332] Testing offline analytics capabilities...');

      await page.goto('/analytics/dashboard');

      // Wait for initial load
      await expect(
        page.locator('[data-testid="analytics-dashboard"]'),
      ).toBeVisible();

      // Simulate going offline (common at wedding venues)
      await context.setOffline(true);

      // Verify offline indicator appears
      await expect(
        page.locator('[data-testid="offline-indicator"]'),
      ).toBeVisible();

      // Test cached data access
      await page.click('[data-testid="cached-reports"]');
      await expect(
        page.locator('[data-testid="offline-report"]'),
      ).toBeVisible();

      // Verify offline functionality works
      const offlineInteraction = Date.now();
      await page.click('[data-testid="view-cached-revenue"]');
      await expect(
        page.locator('[data-testid="cached-revenue-chart"]'),
      ).toBeVisible();
      const offlineResponseTime = Date.now() - offlineInteraction;

      expect(offlineResponseTime).toBeLessThan(1000); // Cached data should load quickly

      // Test data sync when back online
      await context.setOffline(false);

      const syncStart = Date.now();
      await page.click('[data-testid="sync-data"]');
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
      const syncTime = Date.now() - syncStart;

      expect(syncTime).toBeLessThan(3000); // Data sync should be fast

      console.log(
        `[WS-332] Offline test: Response ${offlineResponseTime}ms, Sync ${syncTime}ms`,
      );
    });
  });

  test.describe('Performance Under Wedding Season Load', () => {
    test('should maintain performance during peak wedding season', async ({
      page,
    }) => {
      console.log('[WS-332] Testing peak wedding season performance...');

      // Simulate peak season conditions
      const peakScenario = WEDDING_SCENARIOS.peakSeason;

      await page.goto('/analytics/dashboard');

      // Simulate high data volume typical of peak season with reduced nesting (S2004 compliance)
      await page.evaluate(() => {
        let processedCount = 0;
        const interval = setInterval(() => {
          const mockDataEvents = processHighVolumeDataTypes(processedCount++);
          mockDataEvents.forEach(mockData => {
            window.dispatchEvent(new CustomEvent('high-volume-data', { detail: mockData }));
          });
          
          if (processedCount > 500) {
            clearInterval(interval);
          }
        }, 50);
      });

      // Monitor performance during high volume processing
      const performanceChecks = [];
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2000);

        const performanceCheck = await page.evaluate(() => {
          const timing = performance.now();
          const memory = (performance as any).memory?.usedJSHeapSize || 0;

          return {
            timestamp: timing,
            memory: memory,
            domNodes: document.querySelectorAll('*').length,
          };
        });

        performanceChecks.push(performanceCheck);

        // Verify dashboard remains interactive
        const interactionStart = Date.now();
        await page.hover('[data-testid="revenue-chart"]');
        const interactionTime = Date.now() - interactionStart;

        expect(interactionTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.interactionResponseTime,
        );
      }

      // Analyze performance trend during peak load
      const memoryGrowth =
        performanceChecks[performanceChecks.length - 1].memory -
        performanceChecks[0].memory;
      const avgMemoryGrowthPerCheck = memoryGrowth / performanceChecks.length;

      expect(avgMemoryGrowthPerCheck).toBeLessThan(1024 * 1024); // Less than 1MB growth per check

      console.log(
        `[WS-332] Peak season test completed. Memory growth: ${Math.round(memoryGrowth / 1024)}KB total`,
      );
    });

    test('should handle year-end analytics reporting efficiently', async ({
      page,
    }) => {
      console.log(
        '[WS-332] Testing year-end analytics reporting performance...',
      );

      await page.goto('/analytics/year-end-report');

      // Trigger year-end report generation
      const reportStart = Date.now();
      await page.click('[data-testid="generate-annual-report"]');

      // Monitor report generation progress
      await expect(
        page.locator('[data-testid="report-progress"]'),
      ).toBeVisible();

      // Wait for report completion
      await expect(
        page.locator('[data-testid="annual-report-complete"]'),
      ).toBeVisible({ timeout: 30000 });
      const reportTime = Date.now() - reportStart;

      // Verify report is comprehensive
      await expect(
        page.locator('[data-testid="revenue-summary"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="client-analytics"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="business-insights"]'),
      ).toBeVisible();

      // Test report export performance
      const exportStart = Date.now();
      await page.click('[data-testid="export-pdf"]');
      await page.waitForDownload();
      const exportTime = Date.now() - exportStart;

      expect(reportTime).toBeLessThan(25000); // Report generation within 25 seconds
      expect(exportTime).toBeLessThan(10000); // PDF export within 10 seconds

      console.log(
        `[WS-332] Year-end report: Generation ${reportTime}ms, Export ${exportTime}ms`,
      );
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture performance metrics after each test
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/failed-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`,
        fullPage: true,
      });
    }

    // Log performance metrics
    const finalMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        timing: performance.now(),
        entries: performance.getEntriesByType('navigation').length,
      };
    });

    console.log(
      `[WS-332] Test completed - Memory: ${Math.round(finalMetrics.memory / 1024)}KB`,
    );
  });
});
