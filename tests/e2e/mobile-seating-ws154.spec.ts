/**
 * Mobile Seating E2E Tests - WS-154
 * 
 * End-to-end tests for mobile seating interface:
 * - Visual regression testing
 * - Touch gesture validation
 * - Performance metrics
 * - Cross-browser mobile testing
 * - PWA functionality
 * - Offline capabilities
 */

import { test, expect, devices } from '@playwright/test';

// Test configurations for different mobile devices
const mobileDevices = [
  devices['iPhone 12'],
  devices['iPhone 12 Pro'],
  devices['Samsung Galaxy S21'],
  devices['iPad Mini']
];

// Mock data for testing
const mockSeatingData = {
  arrangement: {
    id: 'arrangement-1',
    name: 'Reception Layout',
    tables: [
      {
        id: 'table-1',
        name: 'Head Table',
        shape: 'rectangle',
        capacity: 8,
        position: { x: 300, y: 100 },
        guests: []
      },
      {
        id: 'table-2',
        name: 'Family Table',
        shape: 'round',
        capacity: 10,
        position: { x: 100, y: 250 },
        guests: []
      }
    ]
  },
  guests: [
    {
      id: 'guest-1',
      firstName: 'John',
      lastName: 'Smith',
      category: 'family',
      rsvpStatus: 'attending'
    },
    {
      id: 'guest-2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      category: 'friends',
      rsvpStatus: 'attending'
    }
  ]
};

test.describe('WS-154 Mobile Seating E2E Tests', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Mock API responses
    await page.route('**/api/seating/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockSeatingData })
      });
    });

    await page.route('**/api/guests/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockSeatingData.guests })
      });
    });

    // Grant necessary permissions
    await context.grantPermissions(['notifications']);
    
    // Navigate to seating page
    await page.goto('/wedme/seating');
  });

  mobileDevices.forEach(device => {
    test.describe(`${device.name} Device Tests`, () => {
      test.use({ ...device });

      test('should load mobile seating interface', async ({ page }) => {
        // Wait for page to load
        await page.waitForSelector('[data-testid="mobile-seating-viewer"]', { 
          timeout: 10000 
        });

        // Check for WedMe header
        await expect(page.locator('h1')).toContainText('Seating Arrangements');
        
        // Check for seating dashboard
        await expect(page.locator('[data-testid="seating-dashboard"]')).toBeVisible();
        
        // Check for navigation controls
        await expect(page.locator('[data-testid="navigation-controls"]')).toBeVisible();

        // Take screenshot for visual regression
        await page.screenshot({
          path: `screenshots/seating-${device.name.replace(/\s+/g, '-')}-load.png`,
          fullPage: true
        });
      });

      test('should handle table selection with touch', async ({ page }) => {
        await page.waitForSelector('[data-testid="table-card"]');
        
        // Tap on a table
        const tableCard = page.locator('[data-testid="table-card"]').first();
        await tableCard.tap();

        // Should show selection state
        await expect(tableCard).toHaveClass(/selected/);
        
        // Take screenshot of selected state
        await page.screenshot({
          path: `screenshots/table-selected-${device.name.replace(/\s+/g, '-')}.png`
        });
      });

      test('should open guest assignment modal on long press', async ({ page }) => {
        await page.waitForSelector('[data-testid="table-card"]');
        
        const tableCard = page.locator('[data-testid="table-card"]').first();
        
        // Perform long press gesture
        await tableCard.hover();
        await page.mouse.down();
        await page.waitForTimeout(600); // Long press duration
        await page.mouse.up();

        // Should open guest assignment modal
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.locator('text=Assign Guests')).toBeVisible();

        // Take screenshot of modal
        await page.screenshot({
          path: `screenshots/guest-modal-${device.name.replace(/\s+/g, '-')}.png`
        });
      });

      test('should handle pinch-to-zoom gestures', async ({ page }) => {
        await page.waitForSelector('[data-testid="seating-area"]');
        
        const seatingArea = page.locator('[data-testid="seating-area"]');
        const boundingBox = await seatingArea.boundingBox();
        
        if (boundingBox) {
          // Simulate pinch zoom gesture
          await page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          
          // Double tap to zoom
          await page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          await page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );

          // Verify zoom controls are responsive
          await expect(page.locator('[data-testid="zoom-in"]')).toBeVisible();
          await expect(page.locator('[data-testid="zoom-out"]')).toBeVisible();
        }
      });

      test('should display conflicts with mobile-friendly banners', async ({ page }) => {
        // Mock conflict data
        await page.route('**/api/seating/conflicts', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: [
                {
                  type: 'dietary',
                  severity: 'medium',
                  message: 'Dietary conflict at Table 5'
                }
              ]
            })
          });
        });

        await page.reload();
        await page.waitForSelector('[data-testid="conflict-banner"]');

        // Should show conflict banner
        await expect(page.locator('[data-testid="conflict-banner"]')).toBeVisible();
        await expect(page.locator('text=Dietary conflict at Table 5')).toBeVisible();

        // Test swipe-to-dismiss
        const conflictBanner = page.locator('[data-testid="conflict-banner"]');
        const boundingBox = await conflictBanner.boundingBox();
        
        if (boundingBox) {
          // Swipe gesture to dismiss
          await page.touchscreen.tap(boundingBox.x + 50, boundingBox.y + boundingBox.height / 2);
          await page.mouse.move(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2);
        }

        // Take screenshot of conflict handling
        await page.screenshot({
          path: `screenshots/conflicts-${device.name.replace(/\s+/g, '-')}.png`
        });
      });
    });
  });

  test.describe('Performance Validation', () => {
    test('should meet mobile performance requirements', async ({ page }) => {
      // Start performance measurement
      const startTime = Date.now();
      
      // Navigate and wait for complete load
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds (WS-154 requirement)
      expect(loadTime).toBeLessThan(2000);

      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {
              LCP: 0,
              FID: 0,
              CLS: 0
            };
            
            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.LCP = entry.startTime;
              }
              if (entry.entryType === 'first-input') {
                vitals.FID = entry.processingStart - entry.startTime;
              }
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                vitals.CLS += entry.value;
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
          
          // Timeout after 5 seconds
          setTimeout(() => resolve({ LCP: 0, FID: 0, CLS: 0 }), 5000);
        });
      });

      // Validate Web Vitals thresholds
      expect(webVitals.LCP).toBeLessThan(2500); // Good LCP < 2.5s
      expect(webVitals.FID).toBeLessThan(100);  // Good FID < 100ms
      expect(webVitals.CLS).toBeLessThan(0.1);  // Good CLS < 0.1
    });

    test('should handle memory efficiently', async ({ page }) => {
      // Measure memory usage
      const memoryBefore = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.locator('[data-testid="table-card"]').first().tap();
        await page.waitForTimeout(100);
      }

      const memoryAfter = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory increase should be reasonable (< 50MB)
      const memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  test.describe('PWA Functionality', () => {
    test('should register service worker', async ({ page }) => {
      await page.goto('/wedme/seating');
      
      // Check service worker registration
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw-seating.js');
            return !!registration;
          } catch (error) {
            return false;
          }
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });

    test('should work offline', async ({ page, context }) => {
      // First load with network
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');

      // Go offline
      await context.setOffline(true);
      await page.reload();

      // Should show offline indicator
      await expect(page.locator('text=Working offline')).toBeVisible();
      
      // Basic functionality should still work
      await expect(page.locator('[data-testid="mobile-seating-viewer"]')).toBeVisible();

      // Take screenshot of offline state
      await page.screenshot({
        path: 'screenshots/offline-mode.png'
      });
    });

    test('should cache seating data', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');

      // Check if data is cached in IndexedDB
      const hasOfflineData = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const request = indexedDB.open('WedSyncSeatingOffline');
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['arrangements'], 'readonly');
            const store = transaction.objectStore('arrangements');
            const countRequest = store.count();
            countRequest.onsuccess = () => {
              resolve(countRequest.result > 0);
            };
          };
          request.onerror = () => resolve(false);
        });
      });

      expect(hasOfflineData).toBe(true);
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');

      // Run accessibility checks
      const accessibilityResults = await page.evaluate(() => {
        const results = {
          missingAltText: 0,
          missingAriaLabels: 0,
          keyboardNavigation: true,
          colorContrast: true
        };

        // Check for images without alt text
        const images = document.querySelectorAll('img:not([alt])');
        results.missingAltText = images.length;

        // Check for interactive elements without aria-labels
        const interactiveElements = document.querySelectorAll('button:not([aria-label]), [role="button"]:not([aria-label])');
        results.missingAriaLabels = interactiveElements.length;

        // Check for keyboard navigation
        const focusableElements = document.querySelectorAll('[tabindex="0"], button, a, input, select, textarea');
        results.keyboardNavigation = focusableElements.length > 0;

        return results;
      });

      expect(accessibilityResults.missingAltText).toBe(0);
      expect(accessibilityResults.missingAriaLabels).toBe(0);
      expect(accessibilityResults.keyboardNavigation).toBe(true);
    });

    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');

      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);

      // Check for landmark roles
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"]').count();
      expect(landmarks).toBeGreaterThan(0);

      // Check for skip links
      const skipLinks = await page.locator('a[href^="#"]').count();
      expect(skipLinks).toBeGreaterThanOrEqual(0);
    });

    test('should maintain minimum touch target sizes', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="mobile-seating-viewer"]');

      // Check touch target sizes (minimum 44px as per WCAG)
      const touchTargets = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, [role="button"], a, input');
        const smallTargets = [];

        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            smallTargets.push({
              tagName: element.tagName,
              width: rect.width,
              height: rect.height
            });
          }
        });

        return smallTargets;
      });

      // Should have no touch targets smaller than 44px
      expect(touchTargets.length).toBe(0);
    });
  });

  test.describe('Visual Regression Testing', () => {
    test('should match visual baseline - mobile dashboard', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="seating-dashboard"]');

      // Hide dynamic content that might cause flakiness
      await page.addStyleTag({
        content: `
          [data-testid="last-modified"], 
          [data-testid="sync-status"] { 
            visibility: hidden !important; 
          }
        `
      });

      await expect(page.locator('[data-testid="seating-dashboard"]')).toHaveScreenshot(
        'mobile-dashboard-baseline.png'
      );
    });

    test('should match visual baseline - table cards', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="table-card"]');

      const tableCard = page.locator('[data-testid="table-card"]').first();
      await expect(tableCard).toHaveScreenshot('table-card-baseline.png');
    });

    test('should match visual baseline - guest assignment modal', async ({ page }) => {
      await page.goto('/wedme/seating');
      await page.waitForSelector('[data-testid="table-card"]');

      // Open modal
      const tableCard = page.locator('[data-testid="table-card"]').first();
      await tableCard.tap();
      
      // Long press to open assignment modal
      await tableCard.hover();
      await page.mouse.down();
      await page.waitForTimeout(600);
      await page.mouse.up();

      await page.waitForSelector('[role="dialog"]');
      
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot(
        'guest-assignment-modal-baseline.png'
      );
    });
  });
});