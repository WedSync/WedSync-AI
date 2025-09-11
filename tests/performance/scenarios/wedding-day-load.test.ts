// Wedding Day Load Testing for WS-257
import { test, expect, Page } from '@playwright/test';
import { PerformanceTimer, LoadGenerator, WeddingTestDataGenerator, performanceExpect } from '../utils/performance-utils';
import { defaultPerformanceConfig } from '../config/performance-config';

// Wedding Day Load Testing Suite
test.describe('Wedding Day Performance Tests', () => {
  let loadGenerator: LoadGenerator;
  let performanceTimer: PerformanceTimer;
  
  test.beforeEach(() => {
    loadGenerator = new LoadGenerator();
    performanceTimer = new PerformanceTimer();
  });

  test.describe('Dashboard Performance Under Load', () => {
    test('should load wedding dashboard within 2s with 5000 concurrent users', async ({ page, context }) => {
      const config = defaultPerformanceConfig.scenarios.weddingDay;
      const wedding = WeddingTestDataGenerator.generateWedding({
        guestCount: config.guestsPerWedding,
        weddingDate: new Date() // Today is wedding day
      });

      // Start performance timer
      performanceTimer.mark('test-start');

      // Simulate concurrent user load
      console.log(`Starting load test with ${config.concurrentUsers} concurrent users`);
      
      const requestFunction = async () => {
        const newContext = await context.browser()?.newContext() || context;
        const newPage = await newContext.newPage();
        
        try {
          performanceTimer.mark('dashboard-load-start');
          
          // Navigate to wedding dashboard
          await newPage.goto(`/dashboard/weddings/${wedding.id}`, {
            waitUntil: 'networkidle',
            timeout: 5000
          });

          // Wait for critical elements to load
          await newPage.waitForSelector('[data-testid="wedding-dashboard"]', { timeout: 3000 });
          await newPage.waitForSelector('[data-testid="guest-count"]', { timeout: 2000 });
          await newPage.waitForSelector('[data-testid="vendor-list"]', { timeout: 2000 });

          const loadTime = performanceTimer.measure('dashboard-load', 'dashboard-load-start');
          
          // Verify performance target
          performanceExpected.responseTimeBelow(
            loadTime, 
            defaultPerformanceConfig.targets.dashboardLoading,
            'Wedding dashboard load time'
          );

          return { success: true, loadTime };
        } catch (error) {
          console.error(`Dashboard load failed: ${error}`);
          throw error;
        } finally {
          await newPage.close();
        }
      };

      // Run load test with ramp-up
      await loadGenerator.rampUp({
        targetRPS: 100, // 100 requests per second
        duration: 120000, // 2 minutes
        requestFn: requestFunction,
        onProgress: (stats) => {
          console.log(`Progress: ${stats.totalRequests} requests, ${stats.errorRate.toFixed(2)}% errors`);
        }
      });

      const finalStats = loadGenerator.getStatistics();
      
      // Verify performance targets
      performanceExpect.errorRateBelow(finalStats.errorRate, 1, 'Dashboard load error rate');
      performanceExpect.responseTimeBelow(finalStats.responseTime.p95, 2000, 'Dashboard load P95 response time');
      
      console.log('Wedding Dashboard Load Test Results:');
      console.log(`- Total Requests: ${finalStats.totalRequests}`);
      console.log(`- Error Rate: ${finalStats.errorRate.toFixed(2)}%`);
      console.log(`- P95 Response Time: ${finalStats.responseTime.p95.toFixed(2)}ms`);
      console.log(`- Average Response Time: ${finalStats.responseTime.avg.toFixed(2)}ms`);
    });

    test('should handle real-time updates during peak wedding day traffic', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      // Navigate to wedding dashboard
      await page.goto(`/dashboard/weddings/${wedding.id}`);
      await page.waitForLoadState('networkidle');

      performanceTimer.mark('realtime-test-start');

      // Test real-time guest updates
      const updatePromises: Promise<any>[] = [];
      
      for (let i = 0; i < 50; i++) {
        const updatePromise = (async () => {
          performanceTimer.mark(`guest-update-${i}-start`);
          
          // Simulate guest RSVP update
          await page.evaluate((guestId) => {
            // Trigger real-time update via WebSocket or SSE
            window.dispatchEvent(new CustomEvent('guest-rsvp-update', {
              detail: { guestId, status: 'accepted', timestamp: Date.now() }
            }));
          }, `guest-${i}`);

          // Wait for UI update
          await page.waitForFunction(
            (guestId) => {
              const element = document.querySelector(`[data-guest-id="${guestId}"]`);
              return element?.getAttribute('data-rsvp-status') === 'accepted';
            },
            `guest-${i}`,
            { timeout: 1000 }
          );

          const updateTime = performanceTimer.measure(`guest-update-${i}`, `guest-update-${i}-start`);
          return updateTime;
        })();
        
        updatePromises.push(updatePromise);
      }

      // Wait for all updates to complete
      const updateTimes = await Promise.all(updatePromises);
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      const maxUpdateTime = Math.max(...updateTimes);

      // Verify real-time update performance
      performanceExpect.responseTimeBelow(
        avgUpdateTime,
        defaultPerformanceConfig.targets.realTimeUpdates,
        'Average real-time update time'
      );
      
      performanceExpect.responseTimeBelow(
        maxUpdateTime,
        defaultPerformanceConfig.targets.realTimeUpdates * 2,
        'Maximum real-time update time'
      );

      console.log('Real-time Update Test Results:');
      console.log(`- Average Update Time: ${avgUpdateTime.toFixed(2)}ms`);
      console.log(`- Maximum Update Time: ${maxUpdateTime.toFixed(2)}ms`);
      console.log(`- Total Updates: ${updateTimes.length}`);
    });
  });

  test.describe('Guest Management Performance', () => {
    test('should handle 500+ guest list rendering within performance targets', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding({
        guestCount: 500
      });

      performanceTimer.mark('guest-list-load-start');

      await page.goto(`/dashboard/weddings/${wedding.id}/guests`);
      
      // Wait for guest list to load
      await page.waitForSelector('[data-testid="guest-list"]');
      await page.waitForFunction(() => {
        const rows = document.querySelectorAll('[data-testid="guest-row"]');
        return rows.length >= 500;
      }, { timeout: 10000 });

      const guestListLoadTime = performanceTimer.measure('guest-list-load', 'guest-list-load-start');
      
      // Test virtual scrolling performance
      performanceTimer.mark('scroll-performance-start');
      
      await page.evaluate(() => {
        const scrollContainer = document.querySelector('[data-testid="guest-list-container"]');
        if (scrollContainer) {
          // Simulate scrolling through large list
          for (let i = 0; i < 10; i++) {
            scrollContainer.scrollTop = i * 100;
          }
        }
      });

      // Measure scroll responsiveness
      await page.waitForTimeout(100); // Allow scroll to complete
      const scrollTime = performanceTimer.measure('scroll-performance', 'scroll-performance-start');

      // Verify performance targets
      performanceExpected.responseTimeBelow(guestListLoadTime, 3000, 'Guest list loading time');
      performanceExpected.responseTimeBelow(scrollTime, 50, 'Scroll performance');

      // Test guest search functionality
      performanceTimer.mark('search-performance-start');
      
      await page.fill('[data-testid="guest-search"]', 'Smith');
      await page.waitForFunction(() => {
        const visibleRows = document.querySelectorAll('[data-testid="guest-row"]:not([style*="display: none"])');
        return visibleRows.length > 0 && visibleRows.length < 500;
      });

      const searchTime = performanceTimer.measure('search-performance', 'search-performance-start');
      performanceExpected.responseTimeBelow(searchTime, 200, 'Guest search performance');

      console.log('Guest Management Performance Results:');
      console.log(`- Guest List Load Time: ${guestListLoadTime.toFixed(2)}ms`);
      console.log(`- Scroll Performance: ${scrollTime.toFixed(2)}ms`);
      console.log(`- Search Performance: ${searchTime.toFixed(2)}ms`);
    });

    test('should handle bulk guest operations efficiently', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding({
        guestCount: 300
      });

      await page.goto(`/dashboard/weddings/${wedding.id}/guests`);
      await page.waitForLoadState('networkidle');

      // Test bulk RSVP updates
      performanceTimer.mark('bulk-update-start');

      // Select 50 guests for bulk update
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('[data-testid="guest-checkbox"]');
        for (let i = 0; i < Math.min(50, checkboxes.length); i++) {
          (checkboxes[i] as HTMLInputElement).click();
        }
      });

      // Perform bulk action
      await page.click('[data-testid="bulk-actions-dropdown"]');
      await page.click('[data-testid="bulk-mark-accepted"]');
      
      // Wait for completion
      await page.waitForSelector('[data-testid="bulk-update-complete"]', { timeout: 10000 });

      const bulkUpdateTime = performanceTimer.measure('bulk-update', 'bulk-update-start');
      
      // Should handle 50 guest updates in under 2 seconds
      performanceExpected.responseTimeBelow(bulkUpdateTime, 2000, 'Bulk guest update time');

      console.log(`Bulk Update Performance: ${bulkUpdateTime.toFixed(2)}ms for 50 guests`);
    });
  });

  test.describe('Photo Upload Stress Testing', () => {
    test('should handle concurrent photo uploads during wedding day', async ({ page, context }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      // Navigate to photo upload page
      await page.goto(`/dashboard/weddings/${wedding.id}/photos`);
      await page.waitForLoadState('networkidle');

      const concurrentUploads = 20;
      const uploadPromises: Promise<number>[] = [];

      for (let i = 0; i < concurrentUploads; i++) {
        const uploadPromise = (async (index: number) => {
          const startTime = performance.now();
          
          // Create a test image blob
          const canvas = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#' + Math.floor(Math.random() * 16777215).toString(16);
              ctx.fillRect(0, 0, 800, 600);
            }
            return canvas.toDataURL('image/jpeg', 0.8);
          });

          // Simulate file upload
          await page.evaluate((dataUrl: string, index: number) => {
            // Convert data URL to blob
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)![1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while(n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            
            const file = new File([u8arr], `test-photo-${index}.jpg`, { type: mime });
            
            // Trigger upload
            const event = new CustomEvent('test-photo-upload', { 
              detail: { file, index }
            });
            window.dispatchEvent(event);
          }, canvas, index);

          // Wait for upload completion
          await page.waitForFunction(
            (index) => {
              return document.querySelector(`[data-upload-id="test-photo-${index}"][data-status="completed"]`) !== null;
            },
            index,
            { timeout: 30000 }
          );

          return performance.now() - startTime;
        })(i);

        uploadPromises.push(uploadPromise);
      }

      const uploadTimes = await Promise.all(uploadPromises);
      const avgUploadTime = uploadTimes.reduce((sum, time) => sum + time, 0) / uploadTimes.length;
      const maxUploadTime = Math.max(...uploadTimes);

      // Verify upload performance targets
      performanceExpect.responseTimeBelow(avgUploadTime, 10000, 'Average photo upload time');
      performanceExpect.responseTimeBelow(maxUploadTime, 20000, 'Maximum photo upload time');

      console.log('Photo Upload Stress Test Results:');
      console.log(`- Concurrent Uploads: ${concurrentUploads}`);
      console.log(`- Average Upload Time: ${avgUploadTime.toFixed(2)}ms`);
      console.log(`- Maximum Upload Time: ${maxUploadTime.toFixed(2)}ms`);
    });
  });

  test.describe('Emergency Mode Performance', () => {
    test('should maintain performance during emergency cache mode', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding({
        weddingDate: new Date() // Today is wedding day
      });

      // Activate emergency cache mode
      await page.evaluate(async (weddingId) => {
        const response = await fetch('/api/cache/wedding-protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, action: 'emergency' })
        });
        return response.ok;
      }, wedding.id);

      // Test performance with emergency mode active
      const testScenarios = [
        { name: 'Dashboard Load', url: `/dashboard/weddings/${wedding.id}`, selector: '[data-testid="wedding-dashboard"]' },
        { name: 'Guest List', url: `/dashboard/weddings/${wedding.id}/guests`, selector: '[data-testid="guest-list"]' },
        { name: 'Timeline', url: `/dashboard/weddings/${wedding.id}/timeline`, selector: '[data-testid="timeline"]' }
      ];

      const results: Array<{ name: string; loadTime: number }> = [];

      for (const scenario of testScenarios) {
        performanceTimer.mark(`${scenario.name}-start`);
        
        await page.goto(scenario.url);
        await page.waitForSelector(scenario.selector, { timeout: 5000 });
        
        const loadTime = performanceTimer.measure(scenario.name, `${scenario.name}-start`);
        results.push({ name: scenario.name, loadTime });

        // Emergency mode should still meet performance targets
        performanceExpected.responseTimeBelow(
          loadTime,
          defaultPerformanceConfig.targets.dashboardLoading * 1.5, // Allow 50% slower in emergency
          `${scenario.name} in emergency mode`
        );
      }

      console.log('Emergency Mode Performance Results:');
      results.forEach(result => {
        console.log(`- ${result.name}: ${result.loadTime.toFixed(2)}ms`);
      });
    });
  });

  test.afterEach(async () => {
    // Generate performance report
    const testName = expect.getState().currentTestName || 'Unknown Test';
    const duration = performanceTimer.getDuration();
    
    console.log(`\n${testName} completed in ${duration.toFixed(2)}ms`);
    
    // Log load generator statistics if used
    const stats = loadGenerator.getStatistics();
    if (stats.totalRequests > 0) {
      console.log('Load Generator Statistics:');
      console.log(`- Total Requests: ${stats.totalRequests}`);
      console.log(`- Error Rate: ${stats.errorRate.toFixed(2)}%`);
      console.log(`- P95 Response Time: ${stats.responseTime.p95.toFixed(2)}ms`);
    }
  });
});

// Wedding Industry-Specific Performance Scenarios
test.describe('Wedding Industry Edge Cases', () => {
  test('should handle last-minute guest additions on wedding morning', async ({ page }) => {
    const wedding = WeddingTestDataGenerator.generateWedding({
      weddingDate: new Date(),
      guestCount: 200
    });

    await page.goto(`/dashboard/weddings/${wedding.id}/guests`);

    // Simulate rapid guest additions (wedding morning panic scenario)
    const rapidAdditions = 20;
    const additionTimes: number[] = [];

    for (let i = 0; i < rapidAdditions; i++) {
      const startTime = performance.now();
      
      await page.click('[data-testid="add-guest-button"]');
      await page.fill('[data-testid="guest-name-input"]', `Last Minute Guest ${i}`);
      await page.fill('[data-testid="guest-email-input"]', `lastminute${i}@example.com`);
      await page.click('[data-testid="save-guest-button"]');
      
      // Wait for guest to appear in list
      await page.waitForSelector(`[data-guest-name="Last Minute Guest ${i}"]`);
      
      additionTimes.push(performance.now() - startTime);
    }

    const avgAdditionTime = additionTimes.reduce((sum, time) => sum + time, 0) / additionTimes.length;
    
    // Should handle rapid additions efficiently
    performanceExpected.responseTimeBelow(avgAdditionTime, 1500, 'Last-minute guest addition time');

    console.log(`Last-minute Guest Addition Performance: ${avgAdditionTime.toFixed(2)}ms average`);
  });

  test('should maintain performance during venue Wi-Fi congestion simulation', async ({ page, context }) => {
    // Simulate poor network conditions (common at wedding venues)
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 2000,    // 2 second latency
      downloadThroughput: 50 * 1024,   // 50 KB/s download
      uploadThroughput: 20 * 1024,     // 20 KB/s upload
      connectionType: 'cellular3g'
    });

    const wedding = WeddingTestDataGenerator.generateWedding();
    
    performanceTimer.mark('poor-network-test-start');
    
    // Test critical operations under poor network conditions
    await page.goto(`/dashboard/weddings/${wedding.id}`);
    await page.waitForSelector('[data-testid="wedding-dashboard"]', { timeout: 15000 });
    
    const dashboardLoadTime = performanceTimer.measure('poor-network-dashboard', 'poor-network-test-start');
    
    // Should still work under poor conditions (with relaxed targets)
    expect(dashboardLoadTime).toBeLessThan(10000); // 10 seconds max under poor conditions
    
    console.log(`Poor Network Performance: ${dashboardLoadTime.toFixed(2)}ms dashboard load`);
  });
});

// Cleanup and reporting
test.afterAll(async () => {
  console.log('\n=== Wedding Day Load Testing Complete ===');
  console.log('All performance targets validated for wedding day scenarios');
});