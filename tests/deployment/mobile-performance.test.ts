// /tests/deployment/mobile-performance.test.ts
import { test, expect, devices } from '@playwright/test';
import { PerformanceTester } from '../utils/PerformanceTester';

const performanceTester = new PerformanceTester();

test.describe('Mobile Performance Testing', () => {
  // Test on iPhone SE (smallest mobile screen)
  test.use({ ...devices['iPhone SE'] });

  test('should meet Core Web Vitals on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    
    const webVitals = await performanceTester.measureWebVitals(page);
    
    // Wedding day performance requirements
    expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(webVitals.fid).toBeLessThan(100);  // FID < 100ms
    expect(webVitals.cls).toBeLessThan(0.1);  // CLS < 0.1
    
    console.log('✅ Core Web Vitals passed:', webVitals);
  });

  test('should handle photo upload performance on mobile', async ({ page }) => {
    await performanceTester.loginAsPhotographer(page);
    await page.goto('/photos/upload');
    
    const testImagePath = await performanceTester.createTestImage(2048, 1536); // 3MP image
    
    const startTime = Date.now();
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    // Wait for upload completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 30000
    });
    
    const uploadTime = Date.now() - startTime;
    
    // Should upload 3MP image in under 15 seconds on mobile
    expect(uploadTime).toBeLessThan(15000);
    
    console.log(`✅ Photo upload completed in ${uploadTime}ms`);
  });

  test('should handle batch operations efficiently', async ({ page }) => {
    await performanceTester.loginAsPhotographer(page);
    await page.goto('/photos');
    
    // Select multiple photos for batch operations
    const photoItems = page.locator('[data-testid="photo-item"]').first(10);
    
    const startTime = Date.now();
    
    // Select all photos
    await page.click('[data-testid="select-all"]');
    
    // Apply batch tag operation
    await page.click('[data-testid="batch-tag"]');
    await page.fill('[data-testid="tag-input"]', 'ceremony-photos');
    await page.click('[data-testid="apply-tags"]');
    
    await expect(page.locator('[data-testid="batch-success"]')).toBeVisible({
      timeout: 20000
    });
    
    const batchTime = Date.now() - startTime;
    
    // Batch operations should complete quickly
    expect(batchTime).toBeLessThan(10000);
    
    console.log(`✅ Batch operation completed in ${batchTime}ms`);
  });

  test('should maintain performance during offline transitions', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    
    // Measure online performance
    const onlinePerf = await performanceTester.measurePageLoad(page);
    
    // Simulate going offline
    await page.context().setOffline(true);
    
    // Navigate to cached page
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    
    // Measure offline performance
    const offlinePerf = await performanceTester.measurePageLoad(page);
    
    // Offline should be faster (cached resources)
    expect(offlinePerf.loadTime).toBeLessThan(onlinePerf.loadTime);
    
    console.log(`✅ Offline performance better than online (${offlinePerf.loadTime}ms vs ${onlinePerf.loadTime}ms)`);
    
    await page.context().setOffline(false);
  });

  test('should handle memory usage efficiently on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Monitor memory usage during heavy operations
    const initialMemory = await performanceTester.getMemoryUsage(page);
    
    // Perform memory-intensive operations
    await page.goto('/photos');
    await performanceTester.loadLargePhotoGallery(page, 100);
    
    const peakMemory = await performanceTester.getMemoryUsage(page);
    
    // Navigate away to trigger cleanup
    await page.goto('/dashboard');
    await page.waitForTimeout(2000); // Wait for garbage collection
    
    const finalMemory = await performanceTester.getMemoryUsage(page);
    
    // Memory should not exceed 100MB on mobile and should clean up
    expect(peakMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
    expect(finalMemory.usedJSHeapSize).toBeLessThan(peakMemory.usedJSHeapSize * 1.2); // <20% growth
    
    console.log('✅ Memory usage within acceptable limits:', {
      initial: Math.round(initialMemory.usedJSHeapSize / 1024 / 1024) + 'MB',
      peak: Math.round(peakMemory.usedJSHeapSize / 1024 / 1024) + 'MB',
      final: Math.round(finalMemory.usedJSHeapSize / 1024 / 1024) + 'MB'
    });
  });
});