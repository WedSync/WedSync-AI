/**
 * Mobile Alert E2E Interaction Tests
 * WS-228 Team D - Mobile/PWA Alert System
 * Tests swipe gestures, touch interactions, and mobile workflows
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Mobile Alert Interactions', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone 12 Pro
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
      isMobile: true
    });

    page = await context.newPage();
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'admin-user-1', role: 'admin' }
      }));
    });

    // Navigate to mobile alerts page
    await page.goto('/admin/alerts/mobile');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Touch Interactions', () => {
    test('should handle tap interactions on alert cards', async () => {
      // Wait for alerts to load
      await page.waitForSelector('[data-testid="alert-card"]');
      
      // Tap on first alert card
      await page.tap('[data-testid="alert-card"]:first-child');
      
      // Bottom sheet should open
      await expect(page.locator('[data-testid="alert-bottom-sheet"]')).toBeVisible();
      
      // Verify bottom sheet content
      await expect(page.locator('[data-testid="alert-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-description"]')).toBeVisible();
    });

    test('should close bottom sheet when tapping backdrop', async () => {
      await page.waitForSelector('[data-testid="alert-card"]');
      await page.tap('[data-testid="alert-card"]:first-child');
      
      // Wait for bottom sheet to open
      await page.waitForSelector('[data-testid="alert-bottom-sheet"]');
      
      // Tap backdrop to close
      await page.tap('[data-testid="bottom-sheet-backdrop"]');
      
      // Bottom sheet should close
      await expect(page.locator('[data-testid="alert-bottom-sheet"]')).not.toBeVisible();
    });

    test('should handle pull-to-refresh gesture', async () => {
      // Get initial alert count
      const initialAlerts = await page.locator('[data-testid="alert-card"]').count();
      
      // Perform pull-to-refresh gesture
      await page.touchscreen.tap(200, 100);
      await page.mouse.move(200, 100);
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000);
      
      // Verify refresh indicator appeared
      await expect(page.locator('[data-testid="refresh-indicator"]')).toHaveBeenVisible();
    });
  });

  test.describe('Swipe Gestures', () => {
    test('should acknowledge alert with right swipe', async () => {
      await page.waitForSelector('[data-testid="alert-card"][data-status="active"]');
      
      const alertCard = page.locator('[data-testid="alert-card"][data-status="active"]').first();
      const alertId = await alertCard.getAttribute('data-alert-id');
      
      // Perform right swipe gesture
      const box = await alertCard.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + box.height / 2);
        await page.mouse.up();
      }
      
      // Verify acknowledge action
      await page.waitForTimeout(500);
      await expect(alertCard).toHaveAttribute('data-status', 'acknowledged');
      
      // Verify API call was made
      const response = await page.waitForResponse(
        response => response.url().includes(`/api/admin/alerts/${alertId}/acknowledge`)
      );
      expect(response.status()).toBe(200);
    });

    test('should dismiss alert with left swipe', async () => {
      await page.waitForSelector('[data-testid="alert-card"][data-status="active"]');
      
      const alertCard = page.locator('[data-testid="alert-card"][data-status="active"]').first();
      const alertId = await alertCard.getAttribute('data-alert-id');
      
      // Perform left swipe gesture
      const box = await alertCard.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 150, box.y + box.height / 2);
        await page.mouse.up();
      }
      
      // Alert should be removed from view
      await page.waitForTimeout(500);
      await expect(alertCard).not.toBeVisible();
      
      // Verify API call was made
      const response = await page.waitForResponse(
        response => response.url().includes(`/api/admin/alerts/${alertId}/dismiss`)
      );
      expect(response.status()).toBe(200);
    });

    test('should show swipe hints for critical alerts', async () => {
      await page.waitForSelector('[data-testid="alert-card"][data-priority="critical"]');
      
      const criticalAlert = page.locator('[data-testid="alert-card"][data-priority="critical"]').first();
      
      // Swipe hint should be visible
      await expect(criticalAlert.locator('[data-testid="swipe-hint"]')).toBeVisible();
      
      // Hint should animate (check for animation class)
      await expect(criticalAlert.locator('[data-testid="swipe-hint"]')).toHaveClass(/animate-/);
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly on iPhone SE (375px)', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Header should be visible and properly sized
      const header = page.locator('[data-testid="mobile-header"]');
      await expect(header).toBeVisible();
      
      // Alert cards should fit within viewport
      const alertCard = page.locator('[data-testid="alert-card"]').first();
      const box = await alertCard.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });

    test('should handle landscape orientation', async () => {
      await page.setViewportSize({ width: 812, height: 375 }); // Landscape
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Layout should adapt to landscape
      const dashboard = page.locator('[data-testid="mobile-dashboard"]');
      await expect(dashboard).toBeVisible();
      
      // Bottom sheet should still work in landscape
      await page.tap('[data-testid="alert-card"]:first-child');
      await expect(page.locator('[data-testid="alert-bottom-sheet"]')).toBeVisible();
    });
  });

  test.describe('Offline Functionality', () => {
    test('should work offline and show offline indicator', async () => {
      // Go offline
      await page.context().setOffline(true);
      await page.reload();
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).toHaveText('Offline');
    });

    test('should queue actions when offline', async () => {
      // Go offline after loading
      await page.waitForSelector('[data-testid="alert-card"]');
      await page.context().setOffline(true);
      
      // Perform swipe action
      const alertCard = page.locator('[data-testid="alert-card"][data-status="active"]').first();
      const box = await alertCard.boundingBox();
      
      if (box) {
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + box.height / 2);
        await page.mouse.up();
      }
      
      // Should show queued indicator
      await expect(page.locator('[data-testid="action-queued"]')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      // Action should be processed
      await expect(alertCard).toHaveAttribute('data-status', 'acknowledged');
    });
  });

  test.describe('Performance', () => {
    test('should load and render alerts quickly', async () => {
      const startTime = Date.now();
      
      await page.goto('/admin/alerts/mobile');
      await page.waitForSelector('[data-testid="alert-card"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
    });

    test('should handle swipe gestures responsively', async () => {
      await page.waitForSelector('[data-testid="alert-card"]');
      
      const alertCard = page.locator('[data-testid="alert-card"]').first();
      const box = await alertCard.boundingBox();
      
      const startTime = Date.now();
      
      if (box) {
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + box.height / 2);
        await page.mouse.up();
      }
      
      // Wait for animation to complete
      await page.waitForTimeout(300);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // Should respond in under 500ms
    });
  });

  test.describe('Wedding Day Context', () => {
    test('should highlight wedding day alerts prominently', async () => {
      await page.waitForSelector('[data-testid="alert-card"][data-wedding-day="true"]');
      
      const weddingAlert = page.locator('[data-testid="alert-card"][data-wedding-day="true"]').first();
      
      // Should have wedding day badge
      await expect(weddingAlert.locator('[data-testid="wedding-day-badge"]')).toBeVisible();
      
      // Should be at top of list (first child)
      const firstAlert = page.locator('[data-testid="alert-card"]').first();
      await expect(firstAlert).toHaveAttribute('data-wedding-day', 'true');
    });

    test('should provide quick contact actions for wedding emergencies', async () => {
      await page.waitForSelector('[data-testid="alert-card"][data-wedding-day="true"]');
      
      // Open wedding day alert
      await page.tap('[data-testid="alert-card"][data-wedding-day="true"]');
      
      // Should show contact actions
      await expect(page.locator('[data-testid="contact-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-email"]')).toBeVisible();
      
      // Phone link should be properly formatted
      const phoneLink = page.locator('[data-testid="contact-phone"]');
      const href = await phoneLink.getAttribute('href');
      expect(href).toMatch(/^tel:\+/);
    });
  });

  test.describe('Accessibility', () => {
    test('should support screen readers', async () => {
      await page.waitForSelector('[data-testid="alert-card"]');
      
      // Check for proper ARIA labels
      const alertCard = page.locator('[data-testid="alert-card"]').first();
      await expect(alertCard).toHaveAttribute('role', 'button');
      await expect(alertCard).toHaveAttribute('aria-label');
      
      // Should have proper heading structure
      await expect(page.locator('h1')).toHaveText('Alerts');
    });

    test('should have proper color contrast', async () => {
      await page.waitForSelector('[data-testid="alert-card"]');
      
      // Run axe accessibility test
      const violations = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore - axe is injected by playwright
          axe.run().then((results) => {
            resolve(results.violations);
          });
        });
      });
      
      expect(violations).toHaveLength(0);
    });
  });
});