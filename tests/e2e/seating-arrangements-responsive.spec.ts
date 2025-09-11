/**
 * @file Playwright E2E Tests for WS-154 Seating Arrangements Responsive Design
 * @description Testing responsive behavior, mobile interactions, and cross-device compatibility
 * @requirements MANDATORY: Cross-viewport drag-drop testing and touch optimization
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Device configurations for comprehensive testing
const deviceConfigs = [
  {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  {
    name: 'iPad',  
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  {
    name: 'iPad Pro',
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  {
    name: 'Desktop',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    hasTouch: false,
    deviceScaleFactor: 1,
  },
];

// Helper functions
async function setupResponsiveTestData(page: Page) {
  await page.route('**/api/seating/**', async route => {
    const url = route.request().url();
    
    if (url.includes('/guests')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          guests: [
            { id: '1', name: 'John Doe', priority: 'vip' },
            { id: '2', name: 'Jane Smith', priority: 'family' },
            { id: '3', name: 'Bob Wilson', priority: 'friend' },
          ],
        }),
      });
    } else if (url.includes('/tables')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tables: [
            { id: '1', name: 'Head Table', capacity: 8, shape: 'round', position: { x: 300, y: 200 } },
            { id: '2', name: 'Family Table', capacity: 6, shape: 'square', position: { x: 600, y: 200 } },
          ],
        }),
      });
    } else {
      await route.fulfill({ status: 200, body: '{}' });
    }
  });
}

async function waitForResponsiveLayout(page: Page, deviceType: string) {
  if (deviceType === 'mobile') {
    await expect(page.locator('[data-testid="mobile-seating-interface"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="seating-arrangement-desktop"]')).toBeVisible();
  }
  await page.waitForTimeout(500); // Allow layout stabilization
}

test.describe('WS-154 Seating Arrangements - Responsive Design E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupResponsiveTestData(page);
  });

  test.describe('Cross-Device Layout Adaptation', () => {
    deviceConfigs.forEach(({ name, viewport, userAgent, hasTouch, deviceScaleFactor }) => {
      test(`should adapt layout correctly on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport,
          userAgent,
          hasTouch,
          deviceScaleFactor,
        });
        const page = await context.newPage();
        
        await setupResponsiveTestData(page);
        await page.goto('/dashboard/clients/test-client/seating');
        await page.waitForLoadState('networkidle');

        if (viewport.width < 768) {
          // Mobile layout expectations
          await waitForResponsiveLayout(page, 'mobile');
          await expect(page.locator('[data-testid="mobile-tab-navigation"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-seating-tabs"]')).toBeVisible();
          
          // Verify mobile-specific controls
          await expect(page.locator('[data-testid="mobile-guest-selector"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-table-selector"]')).toBeVisible();
          
        } else if (viewport.width < 1200) {
          // Tablet layout expectations
          await waitForResponsiveLayout(page, 'tablet');
          await expect(page.locator('[data-testid="tablet-seating-interface"]')).toBeVisible();
          await expect(page.locator('[data-testid="collapsible-sidebar"]')).toBeVisible();
          
        } else {
          // Desktop layout expectations
          await waitForResponsiveLayout(page, 'desktop');
          await expect(page.locator('[data-testid="guest-list-sidebar"]')).toBeVisible();
          await expect(page.locator('[data-testid="table-canvas"]')).toBeVisible();
          await expect(page.locator('[data-testid="seating-controls-panel"]')).toBeVisible();
        }
        
        await context.close();
      });
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test.use({ 
      viewport: { width: 375, height: 667 },
      hasTouch: true,
    });

    test('should handle touch drag-and-drop gestures', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Navigate to guests tab
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      
      // Test long press to initiate drag
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await guestChip.tap({ duration: 800 }); // Long press
      
      // Verify drag mode is activated
      await expect(page.locator('[data-testid="mobile-drag-mode"]')).toBeVisible();
      await expect(guestChip).toHaveClass(/mobile-dragging/);
      
      // Switch to tables tab while dragging
      await page.locator('[data-testid="mobile-tab-tables"]').tap();
      
      // Tap target table to complete assignment
      const targetTable = page.locator('[data-testid="mobile-table-Head Table"]');
      await targetTable.tap();
      
      // Verify success feedback
      await expect(page.locator('[data-testid="mobile-assignment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-haptic-feedback"]')).toBeVisible();
    });

    test('should support swipe gestures for navigation', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Test swipe left to navigate between tabs
      const tabContainer = page.locator('[data-testid="mobile-seating-content"]');
      
      // Perform swipe gesture
      await tabContainer.touchscreen.swipe({ startX: 300, startY: 400 }, { endX: 100, endY: 400 });
      
      // Verify tab changed
      await expect(page.locator('[data-testid="mobile-tab-tables"]')).toHaveClass(/active/);
      
      // Test swipe right to go back
      await tabContainer.touchscreen.swipe({ startX: 100, startY: 400 }, { endX: 300, endY: 400 });
      await expect(page.locator('[data-testid="mobile-tab-guests"]')).toHaveClass(/active/);
    });

    test('should handle pinch-to-zoom on table canvas', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Navigate to tables tab
      await page.locator('[data-testid="mobile-tab-tables"]').tap();
      
      const canvas = page.locator('[data-testid="mobile-table-canvas"]');
      
      // Simulate pinch gesture to zoom in
      await canvas.evaluate(el => {
        const pinchEvent = new TouchEvent('touchstart', {
          touches: [
            new Touch({ identifier: 0, target: el, clientX: 100, clientY: 100 }),
            new Touch({ identifier: 1, target: el, clientX: 200, clientY: 200 }),
          ],
        });
        el.dispatchEvent(pinchEvent);
      });
      
      // Verify zoom controls are visible
      await expect(page.locator('[data-testid="mobile-zoom-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="zoom-level-indicator"]')).toContainText('1.5x');
    });

    test('should provide haptic feedback for interactions', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Mock haptic feedback API
      await page.addInitScript(() => {
        window.navigator.vibrate = (pattern) => {
          window.mockHapticFeedback = { pattern, timestamp: Date.now() };
          return true;
        };
      });
      
      // Perform assignment action
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await guestChip.tap({ duration: 800 });
      
      // Verify haptic feedback was triggered
      const hapticData = await page.evaluate(() => window.mockHapticFeedback);
      expect(hapticData).toBeTruthy();
      expect(hapticData.pattern).toEqual([50, 30, 50]); // Success pattern
    });
  });

  test.describe('Tablet-Specific Interactions', () => {
    test.use({
      viewport: { width: 768, height: 1024 },
      hasTouch: true,
    });

    test('should handle tablet split-screen layout', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'tablet');
      
      // Verify split-screen components are visible
      await expect(page.locator('[data-testid="tablet-guest-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-table-canvas"]')).toBeVisible();
      
      // Test panel resizing
      const panelDivider = page.locator('[data-testid="panel-divider"]');
      await panelDivider.dragTo(page.locator('[data-testid="resize-target"]'), {
        targetPosition: { x: 400, y: 0 }
      });
      
      // Verify panels resized correctly
      const guestPanel = page.locator('[data-testid="tablet-guest-panel"]');
      const panelWidth = await guestPanel.boundingBox();
      expect(panelWidth.width).toBeCloseTo(400, 20);
    });

    test('should optimize touch targets for tablet use', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'tablet');
      
      // Verify touch target sizes meet minimum requirements (44px)
      const touchTargets = page.locator('[data-testid^="touch-target-"]');
      const count = await touchTargets.count();
      
      for (let i = 0; i < count; i++) {
        const target = touchTargets.nth(i);
        const box = await target.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape transition', async ({ page, context }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Verify portrait layout
      await expect(page.locator('[data-testid="mobile-portrait-layout"]')).toBeVisible();
      
      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow layout adjustment
      
      // Verify landscape layout
      await expect(page.locator('[data-testid="mobile-landscape-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="landscape-table-canvas"]')).toBeVisible();
      
      // Verify functionality still works in landscape
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await guestChip.tap({ duration: 800 });
      await expect(page.locator('[data-testid="mobile-drag-mode"]')).toBeVisible();
    });

    test('should maintain state across orientation changes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Make assignment in portrait
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await guestChip.tap({ duration: 800 });
      await page.locator('[data-testid="mobile-tab-tables"]').tap();
      await page.locator('[data-testid="mobile-table-Head Table"]').tap();
      
      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      // Verify assignment persisted
      await expect(page.locator('[data-testid="mobile-table-Head Table"] [data-testid="guest-indicator-John Doe"]')).toBeVisible();
    });
  });

  test.describe('Performance Across Viewports', () => {
    test('should maintain performance on resource-constrained devices', async ({ page, context }) => {
      // Simulate low-end device conditions
      await context.setCPUThrottling(4); // 4x CPU slowdown
      await context.setNetworkConditions({
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps  
        latency: 40, // 40ms RTT
      });
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds even on slow devices
      expect(loadTime).toBeLessThan(3000);
      
      // Test interaction performance
      const interactionStart = Date.now();
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      const interactionTime = Date.now() - interactionStart;
      
      // Interactions should be responsive (< 100ms)
      expect(interactionTime).toBeLessThan(100);
    });

    test('should efficiently handle large datasets on mobile', async ({ page }) => {
      // Mock large dataset
      const largeGuestList = Array.from({ length: 500 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        priority: 'friend',
      }));
      
      await page.route('**/api/seating/guests', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ guests: largeGuestList }),
        });
      });
      
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Verify virtual scrolling is implemented
      await expect(page.locator('[data-testid="mobile-virtual-scroll"]')).toBeVisible();
      
      // Test scrolling performance
      const guestList = page.locator('[data-testid="mobile-guest-list"]');
      await guestList.scrollIntoViewIfNeeded();
      
      // Should render only visible items
      const renderedItems = await page.locator('[data-testid^="guest-chip-"]').count();
      expect(renderedItems).toBeLessThan(50); // Only visible items rendered
    });
  });

  test.describe('Cross-Browser Responsive Compatibility', () => {
    test('should work consistently across mobile browsers', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Test browser-specific behaviors
      if (browserName === 'webkit') {
        // iOS Safari specific tests
        await expect(page.locator('[data-testid="ios-safe-area-support"]')).toBeVisible();
        
        // Test viewport meta tag handling
        const viewportMeta = await page.evaluate(() => 
          document.querySelector('meta[name="viewport"]')?.getAttribute('content')
        );
        expect(viewportMeta).toContain('viewport-fit=cover');
        
      } else if (browserName === 'chromium') {
        // Chrome/Android specific tests
        await expect(page.locator('[data-testid="android-navigation-bar-support"]')).toBeVisible();
      }
      
      // Common functionality should work regardless of browser
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      await expect(page.locator('[data-testid="guest-chip-John Doe"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Across Viewports', () => {
    test('should maintain accessibility on all screen sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];
      
      for (const { width, height, name } of viewports) {
        await page.setViewportSize({ width, height });
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Check focus management
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Check ARIA landmarks
        await expect(page.locator('[role="main"]')).toBeVisible();
        await expect(page.locator('[role="navigation"]')).toBeVisible();
        
        // Check heading structure
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
        expect(headings).toBeGreaterThan(0);
        
        // Check color contrast (simplified)
        const contrastElements = await page.locator('[data-testid^="contrast-check-"]').count();
        expect(contrastElements).toBeGreaterThan(0);
      }
    });

    test('should support screen readers on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/clients/test-client/seating');
      await waitForResponsiveLayout(page, 'mobile');
      
      // Check mobile-specific ARIA labels
      await expect(page.locator('[data-testid="mobile-main-content"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="mobile-tab-guests"]')).toHaveAttribute('aria-selected');
      
      // Check live regions for mobile feedback
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Test gesture descriptions for screen readers
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      const ariaDescription = await guestChip.getAttribute('aria-describedby');
      expect(ariaDescription).toBeTruthy();
      
      const description = page.locator(`#${ariaDescription}`);
      await expect(description).toContainText('long press to assign');
    });
  });
});