/**
 * Mobile Performance Benchmarking Tests
 * WS-192 Integration Tests Suite - Performance Validation
 */

import { test, expect } from '@playwright/test';

// Performance thresholds for wedding day requirements
const PERFORMANCE_THRESHOLDS = {
  formLoadTime: 2000,      // 2s max for form loading
  photoUploadSpeed: 100000, // 100KB/s minimum
  touchResponseTime: 100,   // 100ms max for touch response
  offlineSyncTime: 10000,   // 10s max for offline sync
  pwaShellLoadTime: 1000,   // 1s max for PWA shell
  crossDeviceSyncLatency: 500 // 500ms max for cross-device sync
};

test.describe('Mobile Performance Benchmarking', () => {
  
  test('Form load time performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/forms/new');
    await page.waitForSelector('form input', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Form load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formLoadTime);
  });

  test('Photo upload performance with progress tracking', async ({ page }) => {
    await page.goto('/photos/upload');
    
    // Create test file (2MB)
    const testFile = {
      name: 'wedding-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(2 * 1024 * 1024) // 2MB
    };
    
    const uploadStartTime = Date.now();
    
    await page.setInputFiles('input[type="file"]', testFile);
    
    // Monitor upload progress
    let uploadComplete = false;
    const progressChecks = [];
    
    while (!uploadComplete && Date.now() - uploadStartTime < 30000) {
      try {
        const progressElement = await page.$('.upload-progress');
        if (progressElement) {
          const progressText = await progressElement.textContent();
          if (progressText?.includes('%')) {
            const match = progressText.match(/(\d+)%/);
            if (match) {
              progressChecks.push({
                time: Date.now() - uploadStartTime,
                progress: parseInt(match[1])
              });
              
              if (parseInt(match[1]) >= 100) {
                uploadComplete = true;
              }
            }
          }
        }
      } catch (e) {
        // Continue monitoring
      }
      
      await page.waitForTimeout(500);
    }
    
    const uploadDuration = Date.now() - uploadStartTime;
    const uploadSpeed = (testFile.buffer.length / uploadDuration) * 1000; // bytes per second
    
    console.log(`Upload completed in ${uploadDuration}ms`);
    console.log(`Upload speed: ${Math.round(uploadSpeed / 1024)}KB/s`);
    
    expect(uploadComplete).toBe(true);
    expect(uploadSpeed).toBeGreaterThan(PERFORMANCE_THRESHOLDS.photoUploadSpeed);
  });

  test('Touch response time validation', async ({ page }) => {
    await page.goto('/dashboard');
    
    const touchTargets = [
      '[data-testid="nav-menu-btn"]',
      '[data-testid="create-form-btn"]',
      '[data-testid="client-list-item"]'
    ];
    
    for (const selector of touchTargets) {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible' });
      
      const startTime = Date.now();
      await element.click();
      
      // Wait for visual response (e.g., button press animation)
      await page.waitForTimeout(50);
      const responseTime = Date.now() - startTime;
      
      console.log(`Touch response for ${selector}: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.touchResponseTime);
    }
  });

  test('Offline sync performance', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Create offline data
    await context.setOffline(true);
    
    const offlineDataItems = [
      { field: '#client-name', value: 'John Smith' },
      { field: '#wedding-date', value: '2024-06-15' },
      { field: '#venue-name', value: 'Garden Manor' }
    ];
    
    for (const item of offlineDataItems) {
      await page.fill(item.field, item.value);
      await page.click('#save-offline');
    }
    
    // Go back online and measure sync time
    const syncStartTime = Date.now();
    await context.setOffline(false);
    
    await page.click('#sync-data');
    await page.waitForSelector('.sync-complete', { timeout: 15000 });
    
    const syncDuration = Date.now() - syncStartTime;
    console.log(`Offline sync completed in ${syncDuration}ms`);
    
    expect(syncDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.offlineSyncTime);
  });

  test('PWA shell load performance', async ({ page }) => {
    const shellStartTime = Date.now();
    
    await page.goto('/');
    
    // Wait for PWA shell to be ready
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 5000 });
    
    const shellLoadTime = Date.now() - shellStartTime;
    console.log(`PWA shell load time: ${shellLoadTime}ms`);
    
    expect(shellLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pwaShellLoadTime);
  });

  test('Cross-device sync latency', async ({ page, browser }) => {
    // Create second browser context for another device
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    
    // Both pages navigate to timeline
    await Promise.all([
      page.goto('/timeline'),
      secondPage.goto('/timeline')
    ]);
    
    // Make change on first device and measure sync time
    const syncStartTime = Date.now();
    
    await page.click('.timeline-event:first-child .edit-btn');
    await page.fill('#event-time', '15:30');
    await page.click('#save-event');
    
    // Wait for change to appear on second device
    await secondPage.waitForFunction(
      () => document.querySelector('.timeline-event:first-child')?.textContent?.includes('15:30'),
      {},
      { timeout: 2000 }
    );
    
    const syncLatency = Date.now() - syncStartTime;
    console.log(`Cross-device sync latency: ${syncLatency}ms`);
    
    expect(syncLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.crossDeviceSyncLatency);
    
    await secondContext.close();
  });

  test('Network condition simulation - 3G performance', async ({ page, context }) => {
    // Simulate 3G network conditions
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024, // 400 KB/s (3G speed)
      uploadThroughput: 200 * 1024,   // 200 KB/s
      latency: 400 // 400ms latency
    });
    
    const loadStartTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - loadStartTime;
    console.log(`Dashboard load time on 3G: ${loadTime}ms`);
    
    // Should still be functional on 3G, though slower
    expect(loadTime).toBeLessThan(5000); // 5s max on 3G
    await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible();
  });

  test('Memory usage monitoring', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    if (initialMemory) {
      console.log(`Initial memory usage: ${Math.round(initialMemory.usedJSHeapSize / 1024 / 1024)}MB`);
      
      // Perform memory-intensive operations
      await page.click('[data-testid="load-large-dataset"]');
      await page.waitForTimeout(2000);
      
      const afterMemory = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        };
      });
      
      const memoryIncrease = afterMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Should not exceed 50MB increase for typical operations
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('Bundle size validation', async ({ page }) => {
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.map(resource => ({
        name: resource.name,
        size: resource.transferSize,
        type: resource.initiatorType
      }));
    });
    
    const jsResources = resourceSizes.filter(r => r.name.includes('.js'));
    const cssResources = resourceSizes.filter(r => r.name.includes('.css'));
    
    const totalJSSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
    
    console.log(`Total JS bundle size: ${Math.round(totalJSSize / 1024)}KB`);
    console.log(`Total CSS bundle size: ${Math.round(totalCSSSize / 1024)}KB`);
    
    // Wedding day performance requirements
    expect(totalJSSize).toBeLessThan(500 * 1024); // 500KB max for JS
    expect(totalCSSSize).toBeLessThan(100 * 1024); // 100KB max for CSS
  });
});