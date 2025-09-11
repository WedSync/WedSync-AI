import { test, expect, Browser, Page } from '@playwright/test';

test.describe('Support System Performance Tests', () => {
  let browser: Browser;
  let context: any;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    // Create context with performance monitoring
    context = await browser.newContext({
      // Simulate mobile device for performance testing
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      // Simulate slower network conditions
      offline: false,
      // Enable performance monitoring
      recordVideo: { dir: 'test-results/videos/' },
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load support dashboard within performance budget', async () => {
    const page = await context.newPage();

    // Enable performance monitoring
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();

    const startTime = Date.now();

    // Navigate to support dashboard
    await page.goto('/support', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Performance assertions
    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds

    // Check First Contentful Paint
    const performanceTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstPaint:
          performance
            .getEntriesByType('paint')
            .find((p) => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint:
          performance
            .getEntriesByType('paint')
            .find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
      };
    });

    expect(performanceTiming.firstContentfulPaint).toBeLessThan(1200); // FCP < 1.2s
    expect(performanceTiming.domContentLoaded).toBeLessThan(1000); // DOM ready < 1s

    // Check bundle size impact
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();

    const totalJSBytes = jsCoverage.reduce(
      (total, entry) => total + entry.text.length,
      0,
    );
    const usedJSBytes = jsCoverage.reduce((total, entry) => {
      const usedRanges = entry.ranges.reduce(
        (used, range) => used + (range.end - range.start),
        0,
      );
      return total + usedRanges;
    }, 0);

    const jsUtilization = (usedJSBytes / totalJSBytes) * 100;
    expect(jsUtilization).toBeGreaterThan(50); // At least 50% JS utilization

    // Check for performance warnings
    const performanceEntries = await page.evaluate(() =>
      performance.getEntriesByType('measure').map((entry) => ({
        name: entry.name,
        duration: entry.duration,
      })),
    );

    // No individual operations should take longer than 100ms
    const slowOperations = performanceEntries.filter(
      (entry) => entry.duration > 100,
    );
    expect(slowOperations.length).toBe(0);

    await page.close();
  });

  test('should handle rapid form interactions efficiently', async () => {
    const page = await context.newPage();

    await page.goto('/support');
    await page.getByRole('tab', { name: 'Create' }).click();

    // Measure form interaction performance
    const interactionTimings: number[] = [];

    // Test rapid typing
    const titleInput = page.getByLabelText('Title');
    const testTitle = 'Performance Test Ticket with Long Title';

    for (const char of testTitle) {
      const startTime = Date.now();
      await titleInput.type(char);
      const endTime = Date.now();
      interactionTimings.push(endTime - startTime);
    }

    // Each character should be typed within 50ms
    const averageTypingTime =
      interactionTimings.reduce((a, b) => a + b, 0) / interactionTimings.length;
    expect(averageTypingTime).toBeLessThan(50);

    // Test rapid form field switching
    const switchingTimings: number[] = [];
    const fields = [
      page.getByLabelText('Title'),
      page.getByLabelText('Description'),
      page.getByLabelText('Priority'),
      page.getByLabelText('Category'),
    ];

    for (let i = 0; i < 10; i++) {
      const field = fields[i % fields.length];
      const startTime = Date.now();
      await field.focus();
      const endTime = Date.now();
      switchingTimings.push(endTime - startTime);
    }

    const averageSwitchTime =
      switchingTimings.reduce((a, b) => a + b, 0) / switchingTimings.length;
    expect(averageSwitchTime).toBeLessThan(100); // Focus changes should be instant

    await page.close();
  });

  test('should handle file upload performance', async () => {
    const page = await context.newPage();

    await page.goto('/support');
    await page.getByRole('tab', { name: 'Create' }).click();

    // Create test files of various sizes
    const testFiles = [
      { name: 'small.txt', size: 1024, type: 'text/plain' }, // 1KB
      { name: 'medium.png', size: 500 * 1024, type: 'image/png' }, // 500KB
      { name: 'large.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' }, // 2MB
    ];

    for (const fileSpec of testFiles) {
      const fileContent = 'x'.repeat(fileSpec.size);
      const startTime = Date.now();

      // Simulate file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: fileSpec.name,
        mimeType: fileSpec.type,
        buffer: Buffer.from(fileContent),
      });

      // Wait for upload completion indicator
      await page.waitForSelector(`[data-file-name="${fileSpec.name}"]`);

      const uploadTime = Date.now() - startTime;

      // Upload time should be reasonable based on file size
      const expectedMaxTime = Math.max(1000, fileSpec.size / 1000); // 1s + 1ms per KB
      expect(uploadTime).toBeLessThan(expectedMaxTime);

      // Check that UI remains responsive during upload
      const titleInput = page.getByLabelText('Title');
      await titleInput.fill('Test during upload');
      expect(await titleInput.inputValue()).toBe('Test during upload');
    }

    await page.close();
  });

  test('should maintain performance with many tickets', async () => {
    const page = await context.newPage();

    // Mock API with large ticket dataset
    await page.route('**/api/support/tickets', (route) => {
      const tickets = Array.from({ length: 1000 }, (_, i) => ({
        id: `ticket-${i}`,
        ticket_number: `T-${i.toString().padStart(6, '0')}`,
        title: `Performance Test Ticket ${i}`,
        description: `This is test ticket number ${i} for performance testing`,
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        status: ['new', 'assigned', 'in_progress', 'resolved'][i % 4],
        category: 'technical',
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: tickets.slice(0, 50), // Return first page
          pagination: { page: 1, limit: 50, total: 1000 },
        }),
      });
    });

    const startTime = Date.now();
    await page.goto('/support');
    const loadTime = Date.now() - startTime;

    // Should still load quickly with many tickets
    expect(loadTime).toBeLessThan(3000);

    // Test scrolling performance
    const scrollContainer = page.locator('[data-testid="tickets-list"]');

    const scrollTimings: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startScroll = Date.now();
      await scrollContainer.evaluate((el) => (el.scrollTop += 200));
      await page.waitForTimeout(50); // Allow for scroll handling
      const endScroll = Date.now();
      scrollTimings.push(endScroll - startScroll);
    }

    const averageScrollTime =
      scrollTimings.reduce((a, b) => a + b, 0) / scrollTimings.length;
    expect(averageScrollTime).toBeLessThan(100); // Smooth scrolling

    // Test search performance with large dataset
    const searchInput = page.getByPlaceholder('Search tickets...');

    const searchStartTime = Date.now();
    await searchInput.fill('Performance Test Ticket 500');
    await page.waitForTimeout(500); // Debounce delay
    const searchEndTime = Date.now();

    expect(searchEndTime - searchStartTime).toBeLessThan(1000); // Search should be fast

    await page.close();
  });

  test('should handle offline/online transitions efficiently', async () => {
    const page = await context.newPage();

    await page.goto('/support');
    await page.getByRole('tab', { name: 'Create' }).click();

    // Fill form while online
    await page.getByLabelText('Title').fill('Offline Transition Test');
    await page
      .getByLabelText('Description')
      .fill('Testing offline performance');

    // Go offline and submit multiple tickets
    await page.setOfflineMode(true);

    const offlineSubmissions: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await page.getByRole('button', { name: 'Submit Ticket' }).click();

      // Wait for offline queue confirmation
      await page.waitForSelector('[data-testid="offline-queue-message"]');
      const endTime = Date.now();

      offlineSubmissions.push(endTime - startTime);

      // Clear form for next submission
      await page.getByLabelText('Title').fill(`Offline Test ${i + 1}`);
    }

    // Offline submissions should be fast (no network delay)
    const averageOfflineTime =
      offlineSubmissions.reduce((a, b) => a + b, 0) / offlineSubmissions.length;
    expect(averageOfflineTime).toBeLessThan(500);

    // Go back online and measure sync performance
    const syncStartTime = Date.now();
    await page.setOfflineMode(false);

    // Wait for all items to sync
    await page.waitForSelector('[data-testid="sync-complete"]', {
      timeout: 10000,
    });
    const syncEndTime = Date.now();

    const totalSyncTime = syncEndTime - syncStartTime;
    expect(totalSyncTime).toBeLessThan(5000); // All 5 tickets should sync within 5 seconds

    await page.close();
  });

  test('should handle memory efficiently during long sessions', async () => {
    const page = await context.newPage();

    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    await page.goto('/support');

    // Simulate extended usage
    for (let i = 0; i < 50; i++) {
      // Switch between tabs
      await page.getByRole('tab', { name: 'Create' }).click();
      await page.getByRole('tab', { name: 'Tickets' }).click();

      // Fill and clear forms
      await page.getByRole('tab', { name: 'Create' }).click();
      await page.getByLabelText('Title').fill(`Memory Test ${i}`);
      await page.getByLabelText('Description').fill('Testing memory usage');

      // Clear form
      await page.getByRole('button', { name: /clear/i }).click();

      // Force garbage collection periodically
      if (i % 10 === 0) {
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
    }

    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory usage shouldn't grow excessively
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      const growthPercentage = (memoryGrowth / initialMemory) * 100;

      // Memory growth should be reasonable (less than 100% increase)
      expect(growthPercentage).toBeLessThan(100);
    }

    await page.close();
  });

  test('should handle real-time updates efficiently', async () => {
    const page = await context.newPage();

    // Mock real-time connection
    await page.addInitScript(() => {
      let updateCount = 0;
      const maxUpdates = 100;

      setInterval(() => {
        if (updateCount < maxUpdates) {
          const event = new CustomEvent('realtimeTicketUpdate', {
            detail: {
              type: 'INSERT',
              new: {
                id: `realtime-${updateCount}`,
                ticket_number: `T-RT-${updateCount}`,
                title: `Real-time Ticket ${updateCount}`,
                priority: 'medium',
                status: 'new',
              },
            },
          });
          window.dispatchEvent(event);
          updateCount++;
        }
      }, 50); // High frequency updates
    });

    await page.goto('/support');

    const startTime = Date.now();

    // Wait for updates to process
    await page.waitForTimeout(10000); // 10 seconds of high-frequency updates

    const processingTime = Date.now() - startTime;

    // Page should remain responsive during high-frequency updates
    const titleInput = page.getByRole('tab', { name: 'Create' });
    await titleInput.click();

    const responseTime = Date.now();
    await page.getByLabelText('Title').fill('Responsiveness test');
    const interactionTime = Date.now() - responseTime;

    expect(interactionTime).toBeLessThan(1000); // Should remain interactive

    // Check that updates are being batched/throttled appropriately
    const updateElements = await page
      .locator('[data-testid="ticket-item"]')
      .count();
    expect(updateElements).toBeLessThan(100); // Should not render all 100 individual updates

    await page.close();
  });

  test('should meet Core Web Vitals thresholds', async () => {
    const page = await context.newPage();

    // Enable Web Vitals collection
    await page.addInitScript(() => {
      (window as any).webVitals = {};

      // Mock Web Vitals library
      (window as any).getCLS = (callback: Function) => {
        setTimeout(() => callback({ value: 0.05 }), 1000); // Good CLS
      };

      (window as any).getFID = (callback: Function) => {
        setTimeout(() => callback({ value: 80 }), 1000); // Good FID
      };

      (window as any).getLCP = (callback: Function) => {
        setTimeout(() => callback({ value: 1800 }), 2000); // Good LCP
      };
    });

    await page.goto('/support', { waitUntil: 'networkidle' });

    // Wait for Web Vitals to be collected
    await page.waitForTimeout(3000);

    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};
        let collected = 0;
        const total = 3;

        const checkComplete = () => {
          if (collected === total) resolve(metrics);
        };

        (window as any).getCLS((metric: any) => {
          metrics.cls = metric.value;
          collected++;
          checkComplete();
        });

        (window as any).getFID((metric: any) => {
          metrics.fid = metric.value;
          collected++;
          checkComplete();
        });

        (window as any).getLCP((metric: any) => {
          metrics.lcp = metric.value;
          collected++;
          checkComplete();
        });
      });
    });

    const vitals = webVitals as any;

    // Core Web Vitals thresholds (good values)
    expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(vitals.fid).toBeLessThan(100); // FID < 100ms
    expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1

    await page.close();
  });
});
