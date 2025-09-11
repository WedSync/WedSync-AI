/**
 * WS-173 Team D - Mobile Performance Testing Suite
 * Mobile optimization validation for WedSync/WedMe app
 */

import { test, expect, devices } from '@playwright/test';

// Test configuration for mobile devices
const mobileDevices = [
  devices['iPhone 12'],
  devices['iPhone SE'],
  devices['Pixel 5'],
  devices['Galaxy S21'],
];

// Performance thresholds for WS-173
const PERFORMANCE_THRESHOLDS = {
  LOAD_TIME: 3000, // WedMe app loads < 3s on mobile networks
  TOUCH_RESPONSE: 100, // Touch interactions < 100ms
  FCP: 1800, // First Contentful Paint < 1.8s
  LCP: 2500, // Largest Contentful Paint < 2.5s  
  FID: 100, // First Input Delay < 100ms
  CLS: 0.1, // Cumulative Layout Shift < 0.1
};

test.describe('WS-173 Mobile Performance Optimization', () => {
  
  // Test mobile performance targets across devices
  for (const device of mobileDevices) {
    test.describe(`${device.name} Performance Tests`, () => {
      test.use({ ...device });

      test('should meet Core Web Vitals targets on mobile', async ({ page }) => {
        // Start performance measurement
        const startTime = Date.now();
        
        // Navigate with 3G throttling to simulate mobile conditions
        await page.context().addInitScript(() => {
          // Simulate 3G connection
          (navigator as any).connection = {
            effectiveType: '3g',
            downlink: 1.5,
            rtt: 300
          };
        });

        await page.goto('http://localhost:3000');
        
        // Wait for page load
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;
        
        // Validate load time threshold
        expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME);
        
        // Measure Core Web Vitals using Performance API
        const webVitals = await page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const vitals: Record<string, number> = {};
              
              entries.forEach((entry) => {
                if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
                  vitals.FCP = entry.startTime;
                }
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.LCP = (entry as any).startTime;
                }
                if (entry.entryType === 'first-input') {
                  vitals.FID = (entry as any).processingStart - entry.startTime;
                }
                if (entry.entryType === 'layout-shift') {
                  vitals.CLS = (vitals.CLS || 0) + (entry as any).value;
                }
              });
              
              resolve(vitals);
            });
            
            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
            
            // Fallback timeout
            setTimeout(() => resolve({}), 5000);
          });
        });
        
        console.log(`${device.name} Web Vitals:`, webVitals);
        
        // Validate Core Web Vitals
        if ((webVitals as any).FCP) {
          expect((webVitals as any).FCP).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
        }
        if ((webVitals as any).LCP) {
          expect((webVitals as any).LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
        }
        if ((webVitals as any).FID) {
          expect((webVitals as any).FID).toBeLessThan(PERFORMANCE_THRESHOLDS.FID);
        }
        if ((webVitals as any).CLS) {
          expect((webVitals as any).CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS);
        }
      });

      test('should have sub-100ms touch response times', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Test touch interactions on mobile components
        const touchElements = [
          '[data-testid="mobile-expense-entry-button"]',
          '[data-testid="mobile-budget-overview-tab"]',
          '[data-testid="mobile-schedule-item"]',
        ];
        
        for (const selector of touchElements) {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            const startTime = Date.now();
            
            // Simulate touch interaction
            await element.tap();
            
            // Wait for visual response
            await page.waitForTimeout(50);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TOUCH_RESPONSE);
            
            console.log(`${device.name} Touch response for ${selector}: ${responseTime}ms`);
          }
        }
      });

      test('should maintain performance with PWA features', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Check service worker registration
        const serviceWorkerRegistered = await page.evaluate(() => {
          return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
        });
        
        expect(serviceWorkerRegistered).toBe(true);
        
        // Test PWA cache performance
        const cachePerformance = await page.evaluate(async () => {
          const start = performance.now();
          
          // Test cache access
          if ('caches' in window) {
            const cache = await caches.open('wedsync-mobile-v1');
            const response = await cache.match('/');
            return {
              cacheAccessTime: performance.now() - start,
              cacheHit: !!response
            };
          }
          
          return { cacheAccessTime: 0, cacheHit: false };
        });
        
        console.log(`${device.name} Cache performance:`, cachePerformance);
        
        // Cache access should be fast
        expect(cachePerformance.cacheAccessTime).toBeLessThan(50);
      });

      test('should handle mobile network adaptation', async ({ page }) => {
        // Simulate slow 3G connection
        await page.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 300)); // Add 300ms delay
          await route.continue();
        });
        
        const startTime = Date.now();
        await page.goto('http://localhost:3000');
        
        // Should still load within threshold even with network delays
        await page.waitForSelector('[data-testid="mobile-performance-indicator"]', { timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME + 2000); // Allow 2s extra for network simulation
        
        // Check if mobile optimization features are active
        const mobileOptimizations = await page.evaluate(() => {
          return {
            networkAware: !!(window as any).navigator?.connection,
            lazyLoading: document.querySelectorAll('[loading="lazy"]').length > 0,
            imageOptimization: document.querySelectorAll('img[sizes]').length > 0
          };
        });
        
        console.log(`${device.name} Mobile optimizations:`, mobileOptimizations);
      });

      test('should maintain accessibility with performance optimizations', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Check touch target sizes (minimum 44px)
        const touchTargets = await page.evaluate(() => {
          const elements = document.querySelectorAll('button, [role="button"], a, input');
          const smallTargets: string[] = [];
          
          elements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
              smallTargets.push(element.tagName + (element.id ? `#${element.id}` : ''));
            }
          });
          
          return smallTargets;
        });
        
        // Should have no touch targets smaller than 44px
        expect(touchTargets.length).toBe(0);
        
        // Check color contrast (basic check)
        const contrastIssues = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          let issues = 0;
          
          elements.forEach((element) => {
            const style = getComputedStyle(element);
            if (style.color && style.backgroundColor) {
              // Basic contrast check (simplified)
              const textColor = style.color;
              const bgColor = style.backgroundColor;
              if (textColor === bgColor) {
                issues++;
              }
            }
          });
          
          return issues;
        });
        
        expect(contrastIssues).toBe(0);
      });
    });
  }

  // Cross-device consistency tests
  test.describe('Cross-Device Performance Consistency', () => {
    test('should have consistent performance across iOS and Android', async ({ browser }) => {
      const iosContext = await browser.newContext({ ...devices['iPhone 12'] });
      const androidContext = await browser.newContext({ ...devices['Pixel 5'] });
      
      const iosPage = await iosContext.newPage();
      const androidPage = await androidContext.newPage();
      
      // Measure load times on both platforms
      const [iosLoadTime, androidLoadTime] = await Promise.all([
        measureLoadTime(iosPage),
        measureLoadTime(androidPage)
      ]);
      
      console.log('iOS Load Time:', iosLoadTime);
      console.log('Android Load Time:', androidLoadTime);
      
      // Load times should be within 500ms of each other for consistency
      const difference = Math.abs(iosLoadTime - androidLoadTime);
      expect(difference).toBeLessThan(500);
      
      await iosContext.close();
      await androidContext.close();
    });
  });
  
  // Real-world mobile usage validation
  test.describe('Real-World Mobile Usage Scenarios', () => {
    test('should handle wedding venue workflow on mobile', async ({ page }) => {
      test.use({ ...devices['iPhone 12'] });
      
      await page.goto('http://localhost:3000');
      
      // Simulate wedding day workflow
      const workflow = [
        { action: 'navigate', target: '/dashboard' },
        { action: 'tap', target: '[data-testid="mobile-expense-add"]' },
        { action: 'fill', target: 'input[name="amount"]', value: '250.00' },
        { action: 'tap', target: '[data-testid="mobile-save-expense"]' },
        { action: 'navigate', target: '/schedule' },
        { action: 'tap', target: '[data-testid="mobile-schedule-item"]' },
      ];
      
      let totalTime = 0;
      
      for (const step of workflow) {
        const startTime = Date.now();
        
        switch (step.action) {
          case 'navigate':
            await page.goto(`http://localhost:3000${step.target}`);
            break;
          case 'tap':
            await page.tap(step.target);
            break;
          case 'fill':
            await page.fill(step.target, step.value!);
            break;
        }
        
        const stepTime = Date.now() - startTime;
        totalTime += stepTime;
        
        // Each step should be under 2 seconds
        expect(stepTime).toBeLessThan(2000);
      }
      
      console.log('Total workflow time:', totalTime);
      
      // Complete workflow should be under 15 seconds
      expect(totalTime).toBeLessThan(15000);
    });
    
    test('should handle offline-to-online transition smoothly', async ({ page }) => {
      test.use({ ...devices['Pixel 5'] });
      
      await page.goto('http://localhost:3000');
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to perform actions offline
      await page.tap('[data-testid="mobile-expense-add"]');
      await page.fill('input[name="amount"]', '150.00');
      await page.tap('[data-testid="mobile-save-expense"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should sync and show success
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 10000 });
    });
  });
});

// Helper functions
async function measureLoadTime(page: any): Promise<number> {
  const startTime = Date.now();
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');
  return Date.now() - startTime;
}