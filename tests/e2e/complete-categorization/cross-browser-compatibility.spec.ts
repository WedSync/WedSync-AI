import { test, expect, devices } from '@playwright/test';

// Browser configurations for testing
const BROWSER_CONFIGS = {
  desktop: {
    chrome: { ...devices['Desktop Chrome'] },
    firefox: { ...devices['Desktop Firefox'] },
    safari: { ...devices['Desktop Safari'] },
    edge: { ...devices['Desktop Edge'] }
  },
  mobile: {
    iphone12: { ...devices['iPhone 12'] },
    iphone13Pro: { ...devices['iPhone 13 Pro Max'] },
    pixel5: { ...devices['Pixel 5'] },
    galaxyS21: { ...devices['Galaxy S21'] }
  },
  tablet: {
    ipadPro: { ...devices['iPad Pro'] },
    ipadMini: { ...devices['iPad Mini'] },
    galaxyTab: { ...devices['Galaxy Tab S7'] }
  }
};

test.describe('Cross-Browser and Cross-Device Compatibility', () => {
  // Desktop Browser Tests
  test.describe('Desktop Browsers', () => {
    Object.entries(BROWSER_CONFIGS.desktop).forEach(([browserName, config]) => {
      test.describe(`${browserName} Browser`, () => {
        test.use(config);

        test('should render task categories correctly', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Verify category filters are visible
          await expect(page.locator('[data-testid="filter-setup"]')).toBeVisible();
          await expect(page.locator('[data-testid="filter-ceremony"]')).toBeVisible();
          await expect(page.locator('[data-testid="filter-reception"]')).toBeVisible();
          await expect(page.locator('[data-testid="filter-breakdown"]')).toBeVisible();
          
          // Verify category colors render correctly
          const setupBadge = page.locator('[data-testid="category-badge-setup"]').first();
          if (await setupBadge.isVisible()) {
            const bgColor = await setupBadge.evaluate(el => 
              window.getComputedStyle(el).backgroundColor
            );
            expect(bgColor).toBeTruthy();
          }
        });

        test('should handle category selection', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks/create');
          
          // Test category dropdown
          await page.click('[data-testid="category-select"]');
          await expect(page.locator('[data-testid="category-options"]')).toBeVisible();
          
          await page.click('[data-testid="category-ceremony"]');
          
          // Verify selection
          const selectedCategory = await page.locator('[data-testid="selected-category"]').textContent();
          expect(selectedCategory).toContain('ceremony');
        });

        test('should display analytics charts', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/dashboard/analytics');
          
          // Wait for charts to render
          await expect(page.locator('[data-testid="category-distribution-chart"]')).toBeVisible();
          
          // Verify SVG/Canvas elements are present
          const chartContainer = page.locator('[data-testid="category-distribution-chart"]');
          const hasSvg = await chartContainer.locator('svg').count() > 0;
          const hasCanvas = await chartContainer.locator('canvas').count() > 0;
          
          expect(hasSvg || hasCanvas).toBe(true);
        });
      });
    });
  });

  // Mobile Device Tests
  test.describe('Mobile Devices', () => {
    Object.entries(BROWSER_CONFIGS.mobile).forEach(([deviceName, config]) => {
      test.describe(`${deviceName}`, () => {
        test.use(config);

        test('should adapt UI for mobile viewport', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Mobile menu should be visible
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          
          // Desktop navigation should be hidden
          await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
          
          // Open mobile menu
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        });

        test('should handle touch interactions', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Test swipe on task items
          const taskItem = page.locator('[data-testid="task-item"]').first();
          if (await taskItem.isVisible()) {
            // Simulate swipe
            const box = await taskItem.boundingBox();
            if (box) {
              await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
              
              // Verify action menu appears
              await expect(page.locator('[data-testid="task-actions"]')).toBeVisible();
            }
          }
        });

        test('should display mobile-optimized category filters', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Mobile filter button should be visible
          await expect(page.locator('[data-testid="mobile-filter-button"]')).toBeVisible();
          
          // Open filter drawer
          await page.click('[data-testid="mobile-filter-button"]');
          await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible();
          
          // Category filters should be stacked vertically
          const filters = page.locator('[data-testid^="mobile-filter-"]');
          const count = await filters.count();
          expect(count).toBeGreaterThan(0);
        });

        test('should handle viewport rotation', async ({ page, context }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Portrait orientation
          await page.setViewportSize({ width: 375, height: 667 });
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          
          // Landscape orientation
          await page.setViewportSize({ width: 667, height: 375 });
          
          // UI should adapt
          const isDesktopNavVisible = await page.locator('[data-testid="desktop-nav"]').isVisible();
          const isMobileMenuVisible = await page.locator('[data-testid="mobile-menu-button"]').isVisible();
          
          // Either desktop or mobile UI should be visible
          expect(isDesktopNavVisible || isMobileMenuVisible).toBe(true);
        });
      });
    });
  });

  // Tablet Device Tests
  test.describe('Tablet Devices', () => {
    Object.entries(BROWSER_CONFIGS.tablet).forEach(([deviceName, config]) => {
      test.describe(`${deviceName}`, () => {
        test.use(config);

        test('should use tablet-optimized layout', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Should use hybrid layout
          const hasSidebar = await page.locator('[data-testid="sidebar"]').isVisible();
          const hasMainContent = await page.locator('[data-testid="main-content"]').isVisible();
          
          expect(hasSidebar && hasMainContent).toBe(true);
          
          // Category grid should be 2-3 columns
          const categoryGrid = page.locator('[data-testid="category-grid"]');
          if (await categoryGrid.isVisible()) {
            const gridColumns = await categoryGrid.evaluate(el => 
              window.getComputedStyle(el).gridTemplateColumns
            );
            expect(gridColumns).toContain('2') || expect(gridColumns).toContain('3');
          }
        });

        test('should support both touch and mouse interactions', async ({ page }) => {
          await page.goto('/login');
          await page.fill('[data-testid="email-input"]', 'test@wedding.com');
          await page.fill('[data-testid="password-input"]', 'testpassword123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');

          await page.goto('/tasks');
          
          // Test hover states (for tablets with mouse support)
          const taskItem = page.locator('[data-testid="task-item"]').first();
          if (await taskItem.isVisible()) {
            await taskItem.hover();
            
            // Hover actions should appear
            const hoverActions = page.locator('[data-testid="hover-actions"]');
            const isHoverVisible = await hoverActions.isVisible();
            
            // Also test touch
            const box = await taskItem.boundingBox();
            if (box) {
              await page.touchscreen.tap(box.x + 10, box.y + 10);
              const touchActions = await page.locator('[data-testid="task-actions"]').isVisible();
              
              // Either hover or touch actions should work
              expect(isHoverVisible || touchActions).toBe(true);
            }
          }
        });
      });
    });
  });

  // Browser-Specific Features
  test.describe('Browser-Specific Features', () => {
    test('should handle Safari specific quirks', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/tasks');
      
      // Check for Safari-specific CSS fixes
      const hasWebkitStyles = await page.evaluate(() => {
        const styles = document.styleSheets;
        for (let i = 0; i < styles.length; i++) {
          try {
            const rules = styles[i].cssRules || styles[i].rules;
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].cssText && rules[j].cssText.includes('-webkit-')) {
                return true;
              }
            }
          } catch (e) {
            // Cross-origin stylesheets
          }
        }
        return false;
      });
      
      expect(hasWebkitStyles).toBe(true);
    });

    test('should handle Firefox specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/tasks');
      
      // Firefox handles date inputs differently
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.click();
        
        // Firefox native date picker should work
        await dateInput.fill('2024-12-31');
        const value = await dateInput.inputValue();
        expect(value).toBe('2024-12-31');
      }
    });
  });

  // Progressive Web App Features
  test.describe('PWA Features', () => {
    test('should work offline with service worker', async ({ page, context }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Load tasks page to cache
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Should still be able to view cached content
      await page.reload();
      
      // Offline indicator should appear
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Basic UI should still work
      await expect(page.locator('[data-testid="tasks-container"]')).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      
      // Should reconnect
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should be installable as PWA', async ({ page }) => {
      await page.goto('/');
      
      // Check for manifest
      const manifest = await page.evaluate(() => {
        const link = document.querySelector('link[rel="manifest"]');
        return link ? link.getAttribute('href') : null;
      });
      
      expect(manifest).toBeTruthy();
      
      // Check for service worker
      const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator);
      expect(hasServiceWorker).toBe(true);
      
      // Check for install prompt (in supported browsers)
      const installable = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="mobile-web-app-capable"]');
        return metaTag ? metaTag.getAttribute('content') === 'yes' : false;
      });
      
      expect(installable).toBe(true);
    });
  });

  // Performance Across Browsers
  test.describe('Cross-Browser Performance', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserType => {
      test(`should maintain performance standards on ${browserType}`, async ({ page, browserName }) => {
        test.skip(browserName !== browserType, `Skipping for ${browserName}`);
        
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'test@wedding.com');
        await page.fill('[data-testid="password-input"]', 'testpassword123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/dashboard');

        // Measure page load performance
        const startTime = Date.now();
        await page.goto('/tasks');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 3 seconds on any browser
        expect(loadTime).toBeLessThan(3000);
        
        // Check for browser-specific performance metrics
        const metrics = await page.evaluate(() => {
          if ('performance' in window && 'getEntriesByType' in performance) {
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart
            };
          }
          return null;
        });
        
        if (metrics) {
          expect(metrics.domContentLoaded).toBeLessThan(1000);
          expect(metrics.loadComplete).toBeLessThan(2000);
        }
      });
    });
  });
});