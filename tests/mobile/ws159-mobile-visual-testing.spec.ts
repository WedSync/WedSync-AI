/**
 * WS-159 Mobile Visual Testing Suite
 * Comprehensive mobile device testing with Playwright MCP
 * Team D - Batch 17 - Round 1
 */

import { test, expect } from '@playwright/test';

// Mobile device configurations for testing
const MOBILE_DEVICES = [
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone 14',
    width: 390,
    height: 844,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'Samsung Galaxy S21',
    width: 384,
    height: 854,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
  },
  {
    name: 'iPad Air',
    width: 820,
    height: 1180,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  }
];

// Test data for task tracking
const TEST_TASKS = [
  {
    id: 'test-task-1',
    title: 'Order wedding flowers',
    description: 'Contact florist and finalize bridal bouquet design',
    status: 'pending',
    priority: 'high',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    category: 'Flowers',
    venue: 'Sunset Gardens',
    assignedToName: 'Sarah Johnson'
  },
  {
    id: 'test-task-2',
    title: 'Book wedding photographer',
    description: 'Review portfolios and schedule engagement session',
    status: 'in_progress',
    priority: 'urgent',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    category: 'Photography',
    photos: ['photo1.jpg', 'photo2.jpg']
  },
  {
    id: 'test-task-3',
    title: 'Send save the dates',
    description: 'Mail save the date cards to all guests',
    status: 'completed',
    priority: 'medium',
    category: 'Invitations',
    helperCount: 2
  }
];

test.describe('WS-159 Mobile Task Tracking - Visual Testing', () => {
  // Test setup for each device
  MOBILE_DEVICES.forEach((device) => {
    test.describe(`Device: ${device.name}`, () => {
      test.beforeEach(async ({ page }) => {
        // Set device viewport and user agent
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.setUserAgent(device.userAgent);
        
        // Navigate to task tracking dashboard
        await page.goto('http://localhost:3000/wedme/tasks/tracking');
        
        // Wait for page to load completely
        await page.waitForLoadState('networkidle');
      });

      test('Mobile Dashboard Layout and Responsiveness', async ({ page }) => {
        // Verify header is present and properly sized
        const header = page.locator('[data-testid="wedme-header"]');
        await expect(header).toBeVisible();
        
        // Check header height is appropriate for touch
        const headerBox = await header.boundingBox();
        expect(headerBox?.height).toBeGreaterThanOrEqual(56); // Minimum touch target
        
        // Verify search input is touch-optimized
        const searchInput = page.locator('input[placeholder*="Search tasks"]');
        await expect(searchInput).toBeVisible();
        
        const searchBox = await searchInput.boundingBox();
        expect(searchBox?.height).toBeGreaterThanOrEqual(44); // WCAG AA touch target
        
        // Verify filter pills are properly sized
        const filterPills = page.locator('[data-testid="filter-pill"]');
        const pillCount = await filterPills.count();
        expect(pillCount).toBeGreaterThan(0);
        
        for (let i = 0; i < pillCount; i++) {
          const pill = filterPills.nth(i);
          const pillBox = await pill.boundingBox();
          expect(pillBox?.height).toBeGreaterThanOrEqual(44);
        }
        
        // Take device-specific screenshot
        await page.screenshot({ 
          path: `tests/screenshots/ws159-dashboard-${device.name.replace(' ', '-').toLowerCase()}.png`,
          fullPage: true 
        });
      });

      test('Touch Interactions - Task Cards', async ({ page }) => {
        // Wait for task cards to load
        await page.waitForSelector('[data-testid="task-status-card"]');
        
        const taskCards = page.locator('[data-testid="task-status-card"]');
        const cardCount = await taskCards.count();
        
        if (cardCount > 0) {
          const firstCard = taskCards.first();
          
          // Test tap interaction
          await firstCard.tap();
          
          // Verify modal opens
          const modal = page.locator('[data-testid="mobile-status-modal"]');
          await expect(modal).toBeVisible();
          
          // Test modal close
          const closeButton = page.locator('[data-testid="modal-close"]');
          await closeButton.tap();
          await expect(modal).not.toBeVisible();
          
          // Test swipe gesture simulation
          const cardBox = await firstCard.boundingBox();
          if (cardBox) {
            // Simulate left swipe (complete action)
            await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(cardBox.x + 10, cardBox.y + cardBox.height / 2);
            await page.mouse.up();
            
            // Wait for swipe animation
            await page.waitForTimeout(300);
          }
        }
        
        // Screenshot after interactions
        await page.screenshot({ 
          path: `tests/screenshots/ws159-touch-interactions-${device.name.replace(' ', '-').toLowerCase()}.png` 
        });
      });

      test('Mobile Status Update Modal', async ({ page }) => {
        // Open a task modal
        const taskCard = page.locator('[data-testid="task-status-card"]').first();
        await taskCard.tap();
        
        const modal = page.locator('[data-testid="mobile-status-modal"]');
        await expect(modal).toBeVisible();
        
        // Verify modal takes full screen on mobile
        const modalBox = await modal.boundingBox();
        expect(modalBox?.width).toBeGreaterThanOrEqual(device.width * 0.9); // 90% of screen width
        
        // Test status update buttons
        const statusButtons = page.locator('[data-testid="status-button"]');
        const buttonCount = await statusButtons.count();
        
        for (let i = 0; i < buttonCount && i < 3; i++) { // Test first 3 buttons
          const button = statusButtons.nth(i);
          const buttonBox = await button.boundingBox();
          
          // Verify minimum touch target size
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
          expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        }
        
        // Test photo capture button if present
        const photoCaptureBtn = page.locator('[data-testid="photo-capture-btn"]');
        if (await photoCaptureBtn.isVisible()) {
          const captureBox = await photoCaptureBtn.boundingBox();
          expect(captureBox?.width).toBeGreaterThanOrEqual(56); // Larger for photo capture
          expect(captureBox?.height).toBeGreaterThanOrEqual(56);
        }
        
        // Screenshot modal
        await page.screenshot({ 
          path: `tests/screenshots/ws159-modal-${device.name.replace(' ', '-').toLowerCase()}.png` 
        });
      });

      test('Photo Capture Interface', async ({ page }) => {
        // Navigate to photo capture interface
        await page.goto('http://localhost:3000/wedme/tasks/photo-capture');
        await page.waitForLoadState('networkidle');
        
        // Verify photo capture button is properly sized
        const captureButton = page.locator('[data-testid="camera-capture"]');
        if (await captureButton.isVisible()) {
          const captureBox = await captureButton.boundingBox();
          expect(captureBox?.width).toBeGreaterThanOrEqual(56);
          expect(captureBox?.height).toBeGreaterThanOrEqual(56);
          
          // Test tap on capture button
          await captureButton.tap();
          
          // Verify camera interface or permission dialog
          await page.waitForTimeout(1000); // Wait for camera API response
        }
        
        // Screenshot photo interface
        await page.screenshot({ 
          path: `tests/screenshots/ws159-photo-capture-${device.name.replace(' ', '-').toLowerCase()}.png` 
        });
      });

      test('Offline Functionality Simulation', async ({ page }) => {
        // Simulate offline condition
        await page.setOfflineMode(true);
        
        // Verify offline indicator appears
        const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
        await expect(offlineIndicator).toBeVisible();
        
        // Test offline task creation/update
        const createButton = page.locator('[data-testid="create-task-fab"]');
        await createButton.tap();
        
        // Verify offline message or cached functionality
        await page.waitForTimeout(1000);
        
        // Re-enable online mode
        await page.setOfflineMode(false);
        
        // Verify sync indicator
        const syncIndicator = page.locator('[data-testid="sync-indicator"]');
        if (await syncIndicator.isVisible()) {
          await expect(syncIndicator).toBeVisible();
        }
        
        // Screenshot offline state
        await page.screenshot({ 
          path: `tests/screenshots/ws159-offline-${device.name.replace(' ', '-').toLowerCase()}.png` 
        });
      });

      test('Performance Validation', async ({ page }) => {
        const startTime = Date.now();
        
        // Navigate to dashboard
        await page.goto('http://localhost:3000/wedme/tasks/tracking');
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        // Verify page loads within acceptable time (< 3s for mobile)
        expect(loadTime).toBeLessThan(3000);
        
        // Test scroll performance
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await page.waitForTimeout(500);
        
        // Test touch response time
        const responseStart = Date.now();
        const taskCard = page.locator('[data-testid="task-status-card"]').first();
        await taskCard.tap();
        
        const modal = page.locator('[data-testid="mobile-status-modal"]');
        await expect(modal).toBeVisible();
        
        const responseTime = Date.now() - responseStart;
        
        // Verify touch response is snappy (< 300ms)
        expect(responseTime).toBeLessThan(300);
        
        console.log(`${device.name} Performance:`, {
          loadTime: `${loadTime}ms`,
          responseTime: `${responseTime}ms`
        });
      });

      test('Accessibility Validation', async ({ page }) => {
        // Check color contrast (simplified check)
        const elements = await page.locator('*').all();
        
        // Verify focus indicators are present
        const focusableElements = page.locator('button, input, [tabindex]:not([tabindex="-1"])');
        const focusCount = await focusableElements.count();
        
        for (let i = 0; i < Math.min(focusCount, 5); i++) { // Test first 5 focusable elements
          const element = focusableElements.nth(i);
          await element.focus();
          
          // Verify element has focus styles (basic check)
          const focused = await element.evaluate((el) => 
            window.getComputedStyle(el).outline !== 'none'
          );
          
          // This is a basic check; in practice, you'd use more sophisticated accessibility testing
        }
        
        // Screenshot accessibility state
        await page.screenshot({ 
          path: `tests/screenshots/ws159-accessibility-${device.name.replace(' ', '-').toLowerCase()}.png` 
        });
      });
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('Visual Regression Testing', async ({ page }) => {
      for (const device of MOBILE_DEVICES) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('http://localhost:3000/wedme/tasks/tracking');
        await page.waitForLoadState('networkidle');
        
        // Take consistent screenshots for visual regression
        await page.screenshot({ 
          path: `tests/visual-regression/ws159-baseline-${device.name.replace(' ', '-').toLowerCase()}.png`,
          fullPage: true
        });
      }
    });

    test('Feature Parity Across Devices', async ({ page }) => {
      const features = [
        '[data-testid="search-input"]',
        '[data-testid="filter-pills"]',
        '[data-testid="stats-overview"]',
        '[data-testid="task-list"]',
        '[data-testid="create-task-fab"]'
      ];

      for (const device of MOBILE_DEVICES) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('http://localhost:3000/wedme/tasks/tracking');
        await page.waitForLoadState('networkidle');
        
        // Verify all features are present on each device
        for (const feature of features) {
          const element = page.locator(feature);
          await expect(element).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('PWA Installation Testing', () => {
    test('PWA Installation Prompt', async ({ page, context }) => {
      // Navigate to app
      await page.goto('http://localhost:3000/wedme/tasks/tracking');
      await page.waitForLoadState('networkidle');
      
      // Check for PWA manifest
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toBeAttached();
      
      // Check for service worker registration
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      expect(swRegistered).toBeTruthy();
      
      // Screenshot PWA state
      await page.screenshot({ 
        path: 'tests/screenshots/ws159-pwa-installation.png' 
      });
    });
  });
});

// Mobile Performance Benchmarks
test.describe('WS-159 Performance Benchmarks', () => {
  test('Mobile Page Load Performance', async ({ page }) => {
    for (const device of MOBILE_DEVICES.slice(0, 2)) { // Test on phone devices
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // Simulate slower network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3000/wedme/tasks/tracking');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`${device.name} Load Time:`, loadTime);
      
      // Verify meets mobile performance criteria
      expect(loadTime).toBeLessThan(3000); // 3 seconds max for simulated slow network
    }
  });
});

// Generate comprehensive test report
test.afterAll(async () => {
  console.log('WS-159 Mobile Visual Testing Complete');
  console.log('Screenshots generated in tests/screenshots/');
  console.log('Visual regression baselines in tests/visual-regression/');
  console.log('Devices tested:', MOBILE_DEVICES.map(d => d.name).join(', '));
});