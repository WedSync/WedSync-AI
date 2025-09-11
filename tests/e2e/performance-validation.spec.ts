import { test, expect } from '@playwright/test';

/**
 * Performance Validation Testing Suite
 * Tests application performance, load times, and resource optimization
 */

test.describe('Performance Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      // Mock slow API responses for stress testing
      if (url.includes('/api/') && url.includes('stress-test')) {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'ok', delay: 'simulated' })
          });
        }, 2000); // 2 second delay
      } else {
        route.continue();
      }
    });
  });

  test('Page Load Performance - Dashboard', async ({ page }) => {
    // Start performance monitoring
    const startTime = Date.now();
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for critical content to load
    await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Verify load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    // Performance assertions
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // DOM ready in 2s
    expect(performanceMetrics.firstPaint).toBeLessThan(1500); // First paint in 1.5s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // FCP in 2s

    console.log('Dashboard Performance Metrics:', performanceMetrics);
  });

  test('Journey Builder Performance - Large Canvas', async ({ page }) => {
    // Navigate to Journey Builder
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    const startTime = Date.now();
    
    // Simulate adding many nodes for performance testing
    for (let i = 0; i < 20; i++) {
      await page.evaluate((index) => {
        // Mock adding nodes to test canvas performance
        const event = new CustomEvent('addNode', {
          detail: {
            id: `perf-node-${index}`,
            type: 'action',
            position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 150 }
          }
        });
        window.dispatchEvent(event);
      }, i);
      
      // Small delay to simulate real interaction
      await page.waitForTimeout(50);
    }
    
    const canvasRenderTime = Date.now() - startTime;
    
    // Verify canvas can handle 20 nodes efficiently
    expect(canvasRenderTime).toBeLessThan(5000); // Should render in under 5 seconds
    
    // Test canvas interactions remain responsive
    const interactionStart = Date.now();
    await page.click('.react-flow');
    await page.waitForTimeout(100);
    const interactionTime = Date.now() - interactionStart;
    
    expect(interactionTime).toBeLessThan(500); // Interactions should be under 500ms
    
    console.log(`Canvas Performance - Render: ${canvasRenderTime}ms, Interaction: ${interactionTime}ms`);
  });

  test('API Response Performance', async ({ page }) => {
    const apiMetrics: Array<{ endpoint: string; responseTime: number; status: number }> = [];
    
    // Monitor API calls
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.timing();
        apiMetrics.push({
          endpoint: url.split('/api/')[1],
          responseTime: timing.responseEnd - timing.requestStart,
          status: response.status()
        });
      }
    });

    // Navigate through key pages to trigger API calls
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/journeys');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Analyze API performance
    const slowEndpoints = apiMetrics.filter(metric => metric.responseTime > 1000);
    const failedRequests = apiMetrics.filter(metric => metric.status >= 400);
    
    // Assertions
    expect(slowEndpoints.length).toBeLessThan(2); // At most 1 slow endpoint allowed
    expect(failedRequests.length).toBe(0); // No failed requests
    
    // Log performance summary
    console.log('API Performance Summary:');
    console.log(`Total API calls: ${apiMetrics.length}`);
    console.log(`Average response time: ${apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length}ms`);
    console.log(`Slow endpoints (>1s): ${slowEndpoints.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
  });

  test('Memory Usage - Extended Session', async ({ page }) => {
    // Start memory monitoring
    await page.goto('/dashboard');
    
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (!initialMemory) {
      console.log('Memory API not available in this browser');
      return;
    }

    // Simulate extended user session
    const pages = ['/clients', '/vendors', '/journeys', '/forms', '/analytics', '/dashboard'];
    
    for (let i = 0; i < 3; i++) { // 3 cycles through all pages
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Simulate user reading time
      }
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      // Memory should not increase by more than 50% during normal usage
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log('Memory Usage Analysis:');
      console.log(`Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)`);
    }
  });

  test('Network Resource Loading', async ({ page }) => {
    const resourceMetrics: Array<{ url: string; size: number; type: string; loadTime: number }> = [];
    
    // Monitor resource loading
    page.on('response', async (response) => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      const timing = response.timing();
      
      resourceMetrics.push({
        url: url.split('/').pop() || url,
        size: contentLength ? parseInt(contentLength) : 0,
        type: response.request().resourceType(),
        loadTime: timing.responseEnd - timing.requestStart
      });
    });

    // Load resource-heavy page
    await page.goto('/journeys');
    await page.waitForLoadState('networkidle');

    // Analyze resource loading
    const totalSize = resourceMetrics.reduce((sum, resource) => sum + resource.size, 0);
    const slowResources = resourceMetrics.filter(resource => resource.loadTime > 2000);
    const largeResources = resourceMetrics.filter(resource => resource.size > 500 * 1024); // > 500KB
    
    // Assertions
    expect(totalSize).toBeLessThan(5 * 1024 * 1024); // Total page size under 5MB
    expect(slowResources.length).toBeLessThan(3); // At most 2 slow resources
    expect(largeResources.length).toBeLessThan(5); // At most 4 large resources
    
    console.log('Resource Loading Analysis:');
    console.log(`Total resources: ${resourceMetrics.length}`);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Slow resources (>2s): ${slowResources.length}`);
    console.log(`Large resources (>500KB): ${largeResources.length}`);
  });

  test('Form Submission Performance Under Load', async ({ page }) => {
    // Navigate to form
    await page.goto('/forms/contact');
    await page.waitForLoadState('networkidle');
    
    const submissionTimes: number[] = [];
    
    // Simulate multiple rapid form submissions
    for (let i = 0; i < 5; i++) {
      // Fill form
      await page.fill('[data-testid="contact-name"]', `Test User ${i}`);
      await page.fill('[data-testid="contact-email"]', `test${i}@example.com`);
      await page.fill('[data-testid="contact-message"]', `Test message ${i}`);
      
      // Time submission
      const startTime = Date.now();
      await page.click('[data-testid="submit-contact"]');
      await page.waitForSelector('[data-testid="submission-success"]');
      const submissionTime = Date.now() - startTime;
      
      submissionTimes.push(submissionTime);
      
      // Reset form for next submission
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Analyze submission performance
    const averageTime = submissionTimes.reduce((sum, time) => sum + time, 0) / submissionTimes.length;
    const maxTime = Math.max(...submissionTimes);
    
    // Assertions
    expect(averageTime).toBeLessThan(2000); // Average under 2 seconds
    expect(maxTime).toBeLessThan(5000); // Max under 5 seconds
    
    console.log('Form Submission Performance:');
    console.log(`Average time: ${averageTime.toFixed(0)}ms`);
    console.log(`Max time: ${maxTime}ms`);
    console.log(`All submissions: ${submissionTimes.map(t => `${t}ms`).join(', ')}`);
  });

  test('Bundle Size and Loading Optimization', async ({ page }) => {
    // Monitor JavaScript bundle loading
    const jsResources: Array<{ url: string; size: number; loadTime: number }> = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        const contentLength = response.headers()['content-length'];
        const timing = response.timing();
        
        jsResources.push({
          url: url.split('/').pop() || url,
          size: contentLength ? parseInt(contentLength) : 0,
          loadTime: timing.responseEnd - timing.requestStart
        });
      }
    });

    // Load application
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Analyze bundle performance
    const totalJSSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    const mainBundle = jsResources.find(r => r.url.includes('main') || r.url.includes('app'));
    
    // Assertions
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // Total JS under 2MB
    if (mainBundle) {
      expect(mainBundle.size).toBeLessThan(500 * 1024); // Main bundle under 500KB
    }
    
    console.log('Bundle Analysis:');
    console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(0)} KB`);
    console.log(`JS resources count: ${jsResources.length}`);
    if (mainBundle) {
      console.log(`Main bundle size: ${(mainBundle.size / 1024).toFixed(0)} KB`);
    }
  });

  test('Concurrent User Simulation', async ({ browser }) => {
    // Simulate multiple concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const results = await Promise.all(
      contexts.map(async (context, index) => {
        const page = await context.newPage();
        const startTime = Date.now();
        
        try {
          // Each user performs different actions
          switch (index) {
            case 0:
              await page.goto('/dashboard');
              await page.waitForLoadState('networkidle');
              break;
            case 1:
              await page.goto('/journeys');
              await page.waitForLoadState('networkidle');
              break;
            case 2:
              await page.goto('/forms/contact');
              await page.waitForLoadState('networkidle');
              await page.fill('[data-testid="contact-name"]', 'Concurrent User');
              await page.click('[data-testid="submit-contact"]');
              break;
          }
          
          const loadTime = Date.now() - startTime;
          await context.close();
          
          return { userId: index + 1, loadTime, success: true };
        } catch (error) {
          await context.close();
          return { userId: index + 1, loadTime: Date.now() - startTime, success: false, error: error.message };
        }
      })
    );

    // Analyze concurrent performance
    const successfulUsers = results.filter(r => r.success);
    const averageLoadTime = successfulUsers.reduce((sum, r) => sum + r.loadTime, 0) / successfulUsers.length;

    // Assertions
    expect(successfulUsers.length).toBe(3); // All users should succeed
    expect(averageLoadTime).toBeLessThan(5000); // Average load time under 5 seconds

    console.log('Concurrent User Performance:');
    results.forEach(result => {
      console.log(`User ${result.userId}: ${result.loadTime}ms ${result.success ? '✓' : '✗'}`);
    });
    console.log(`Average load time: ${averageLoadTime.toFixed(0)}ms`);
  });
});