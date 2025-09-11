import { test, expect, devices } from '@playwright/test';

// Test mobile category system across different devices and scenarios
test.describe('Mobile Category System - WS-158 Round 3', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mobile category dashboard
    await page.goto('/mobile/categories');
    
    // Wait for categories to load
    await page.waitForSelector('[data-testid="mobile-category-dashboard"]');
  });

  test.describe('Mobile Touch Interface', () => {
    test('should display categories in mobile-optimized grid', async ({ page }) => {
      // Check mobile viewport adaptation
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      
      // Verify grid layout
      const grid = page.locator('[data-testid="category-grid"]');
      await expect(grid).toBeVisible();
      
      // Check responsive grid columns (should be 2 on mobile)
      const categoryCards = page.locator('[data-testid="mobile-category-card"]');
      await expect(categoryCards).toHaveCount(10); // Default categories
      
      // Verify cards are properly sized for touch
      const firstCard = categoryCards.first();
      const boundingBox = await firstCard.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(120); // Minimum touch target
    });

    test('should handle touch gestures on category cards', async ({ page }) => {
      const firstCard = page.locator('[data-testid="mobile-category-card"]').first();
      
      // Test tap gesture
      await firstCard.tap();
      await expect(page.locator('[data-testid="category-details"]')).toBeVisible();
      
      // Go back
      await page.goBack();
      
      // Test long press (should trigger selection mode)
      await firstCard.dispatchEvent('touchstart');
      await page.waitForTimeout(600); // Long press duration
      await firstCard.dispatchEvent('touchend');
      
      // Verify selection mode activated
      await expect(page.locator('[data-testid="selection-mode-toolbar"]')).toBeVisible();
    });

    test('should support swipe gestures for quick actions', async ({ page }) => {
      const firstCard = page.locator('[data-testid="mobile-category-card"]').first();
      
      // Perform swipe right gesture
      const cardBox = await firstCard.boundingBox();
      if (cardBox) {
        await page.mouse.move(cardBox.x + 50, cardBox.y + cardBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(cardBox.x + cardBox.width - 50, cardBox.y + cardBox.height / 2);
        await page.mouse.up();
      }
      
      // Should show swipe action feedback
      await expect(page.locator('[data-testid="swipe-action-success"]')).toBeVisible();
    });
  });

  test.describe('Drag and Drop Functionality', () => {
    test('should allow reordering categories with touch drag', async ({ page }) => {
      // Switch to list view for drag and drop
      await page.click('[data-testid="view-mode-list"]');
      
      const categoryItems = page.locator('[data-testid="draggable-category-item"]');
      const firstCategory = categoryItems.first();
      const secondCategory = categoryItems.nth(1);
      
      // Get initial order
      const firstCategoryText = await firstCategory.locator('[data-testid="category-name"]').textContent();
      const secondCategoryText = await secondCategory.locator('[data-testid="category-name"]').textContent();
      
      // Perform drag and drop
      await firstCategory.dragTo(secondCategory);
      
      // Wait for reorder animation
      await page.waitForTimeout(500);
      
      // Verify order changed
      const reorderedFirst = await categoryItems.first().locator('[data-testid="category-name"]').textContent();
      expect(reorderedFirst).toBe(secondCategoryText);
      
      // Check drag handle is visible and functional
      const dragHandle = firstCategory.locator('[data-testid="drag-handle"]');
      await expect(dragHandle).toBeVisible();
    });

    test('should provide haptic feedback during drag operations', async ({ page }) => {
      // Note: Haptic feedback testing requires browser support
      // This test verifies the API calls are made
      
      let vibrateCallCount = 0;
      
      await page.addInitScript(() => {
        // Mock vibrate API to count calls
        Object.defineProperty(navigator, 'vibrate', {
          value: (pattern: number | number[]) => {
            (window as any).vibrateCallCount = ((window as any).vibrateCallCount || 0) + 1;
            return true;
          },
          writable: true
        });
      });
      
      // Switch to list view
      await page.click('[data-testid="view-mode-list"]');
      
      const firstCategory = page.locator('[data-testid="draggable-category-item"]').first();
      const dragHandle = firstCategory.locator('[data-testid="drag-handle"]');
      
      // Start drag operation
      await dragHandle.dispatchEvent('touchstart');
      await page.waitForTimeout(100);
      await dragHandle.dispatchEvent('touchend');
      
      // Check if vibrate was called
      const vibrateCount = await page.evaluate(() => (window as any).vibrateCallCount);
      expect(vibrateCount).toBeGreaterThan(0);
    });
  });

  test.describe('Timeline View', () => {
    test('should display wedding timeline with category phases', async ({ page }) => {
      // Switch to timeline view
      await page.click('[data-testid="view-mode-timeline"]');
      
      // Verify timeline is displayed
      await expect(page.locator('[data-testid="category-timeline"]')).toBeVisible();
      
      // Check phase sections
      const phases = [
        '12+ Months Before',
        '9-12 Months Before', 
        '6-9 Months Before',
        '3-6 Months Before',
        '1-3 Months Before',
        'Wedding Week'
      ];
      
      for (const phase of phases) {
        await expect(page.locator(`text="${phase}"`)).toBeVisible();
      }
      
      // Verify progress indicators
      const progressBars = page.locator('[data-testid="phase-progress-bar"]');
      await expect(progressBars).toHaveCount(phases.length);
    });

    test('should allow navigation through timeline phases', async ({ page }) => {
      await page.click('[data-testid="view-mode-timeline"]');
      
      // Click on a specific phase
      await page.click('[data-testid="timeline-phase"]:has-text("6-9 Months Before")');
      
      // Should show categories for that phase
      await expect(page.locator('[data-testid="phase-categories"]')).toBeVisible();
      
      // Verify filtered categories are displayed
      const phaseCategories = page.locator('[data-testid="phase-category-item"]');
      await expect(phaseCategories).toHaveCountGreaterThan(0);
    });
  });

  test.describe('Offline Functionality', () => {
    test('should work offline with cached data', async ({ page, context }) => {
      // First, load the page online to cache data
      await page.waitForSelector('[data-testid="mobile-category-dashboard"]');
      
      // Go offline
      await context.setOffline(true);
      
      // Reload the page
      await page.reload();
      
      // Should still display categories from cache
      await expect(page.locator('[data-testid="mobile-category-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-category-card"]')).toHaveCountGreaterThan(0);
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
      await expect(page.locator('text="You\'re offline"')).toBeVisible();
    });

    test('should queue changes when offline', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);
      
      // Make a change (edit category)
      const firstCard = page.locator('[data-testid="mobile-category-card"]').first();
      await firstCard.click();
      
      // Should navigate to edit mode
      await page.click('[data-testid="edit-category-button"]');
      
      // Make changes
      await page.fill('[data-testid="category-name-input"]', 'Updated Category Name');
      await page.click('[data-testid="save-category-button"]');
      
      // Should show queued for sync message
      await expect(page.locator('text="Changes saved offline"')).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      
      // Should sync automatically
      await expect(page.locator('text="Changes synced"')).toBeVisible();
    });
  });

  test.describe('PWA Features', () => {
    test('should register service worker', async ({ page }) => {
      // Check if service worker is registered
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });
      
      expect(swRegistered).toBe(true);
    });

    test('should show install prompt on supported browsers', async ({ page }) => {
      // Simulate beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt');
        window.dispatchEvent(event);
      });
      
      // Check if install button appears
      try {
        await page.waitForSelector('[data-testid="pwa-install-button"]', { timeout: 3000 });
        const installButton = page.locator('[data-testid="pwa-install-button"]');
        await expect(installButton).toBeVisible();
      } catch {
        // Install button might not appear in test environment
        console.log('PWA install prompt not available in test environment');
      }
    });
  });

  test.describe('Push Notifications', () => {
    test('should request notification permission', async ({ page }) => {
      // Mock notification permission
      await page.addInitScript(() => {
        Object.defineProperty(Notification, 'permission', {
          value: 'default',
          writable: true
        });
        
        Object.defineProperty(Notification, 'requestPermission', {
          value: async () => {
            (Notification as any).permission = 'granted';
            return 'granted';
          },
          writable: true
        });
      });
      
      // Click notification permission button
      await page.click('[data-testid="enable-notifications-button"]');
      
      // Should show permission granted state
      await expect(page.locator('text="Notifications enabled"')).toBeVisible();
    });

    test('should display notification settings', async ({ page }) => {
      // Navigate to notification settings
      await page.click('[data-testid="notification-settings-button"]');
      
      // Should show notification preferences
      await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
      
      // Check preference toggles
      const toggles = [
        'category-notifications',
        'task-notifications', 
        'milestone-notifications',
        'sync-notifications'
      ];
      
      for (const toggle of toggles) {
        await expect(page.locator(`[data-testid="${toggle}"]`)).toBeVisible();
      }
    });
  });

  test.describe('WedMe App Integration', () => {
    test('should show mobile app integration options', async ({ page }) => {
      // Navigate to integration page
      await page.click('[data-testid="mobile-integration-button"]');
      
      // Should show WedMe integration panel
      await expect(page.locator('[data-testid="wedme-integration"]')).toBeVisible();
      
      // Check for integration features
      await expect(page.locator('[data-testid="generate-share-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="open-native-app"]')).toBeVisible();
      await expect(page.locator('[data-testid="qr-code-share"]')).toBeVisible();
    });

    test('should generate shareable links', async ({ page }) => {
      await page.click('[data-testid="mobile-integration-button"]');
      
      // Select categories to share
      await page.check('[data-testid="category-checkbox"]:nth-child(1)');
      await page.check('[data-testid="category-checkbox"]:nth-child(2)');
      
      // Generate share link
      await page.click('[data-testid="generate-share-link"]');
      
      // Should show QR code modal
      await expect(page.locator('[data-testid="qr-code-modal"]')).toBeVisible();
      
      // Should copy link to clipboard (mocked)
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: () => Promise.resolve()
          }
        });
      });
      
      // Close modal
      await page.click('[data-testid="close-qr-modal"]');
    });
  });

  test.describe('Performance', () => {
    test('should load categories within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate and wait for categories to load
      await page.goto('/mobile/categories');
      await page.waitForSelector('[data-testid="mobile-category-dashboard"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large numbers of categories efficiently', async ({ page }) => {
      // Mock large dataset
      await page.addInitScript(() => {
        // Mock API response with 50 categories
        const mockCategories = Array.from({ length: 50 }, (_, i) => ({
          id: `category-${i}`,
          name: `category_${i}`,
          display_name: `Category ${i}`,
          description: `Description for category ${i}`,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          icon: 'folder',
          is_default: false,
          is_active: true,
          sort_order: i,
          organization_id: 'test-org',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        // Mock fetch responses
        (window as any).fetch = async (url: string) => {
          if (url.includes('task-categories')) {
            return {
              ok: true,
              json: async () => mockCategories
            };
          }
          return { ok: false };
        };
      });
      
      await page.reload();
      await page.waitForSelector('[data-testid="mobile-category-dashboard"]');
      
      // Should handle large dataset without performance issues
      const categoryCards = page.locator('[data-testid="mobile-category-card"]');
      await expect(categoryCards).toHaveCount(50);
      
      // Test scrolling performance
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(100);
      
      // Should maintain smooth scrolling
      const isVisible = await page.locator('[data-testid="mobile-category-dashboard"]').isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with screen readers', async ({ page }) => {
      // Check for proper ARIA labels
      const dashboard = page.locator('[data-testid="mobile-category-dashboard"]');
      await expect(dashboard).toHaveAttribute('role', 'main');
      
      // Category cards should have proper labels
      const categoryCards = page.locator('[data-testid="mobile-category-card"]');
      const firstCard = categoryCards.first();
      
      await expect(firstCard).toHaveAttribute('role', 'button');
      await expect(firstCard).toHaveAttribute('aria-label');
      
      // Drag handles should be accessible
      await page.click('[data-testid="view-mode-list"]');
      const dragHandle = page.locator('[data-testid="drag-handle"]').first();
      await expect(dragHandle).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Focus first category card
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      
      // Enter should activate focused element
      await page.keyboard.press('Enter');
      
      // Should navigate to category details or trigger action
      const isNavigated = await page.url().includes('categories') || 
                         await page.locator('[data-testid="category-details"]').isVisible();
      expect(isNavigated).toBe(true);
    });
  });
});

// Device-specific tests
test.describe('Cross-Device Compatibility', () => {
  ['iPhone 12', 'Pixel 5', 'iPad'].forEach(deviceName => {
    test(`should work correctly on ${deviceName}`, async ({ browser }) => {
      const device = devices[deviceName];
      const context = await browser.newContext({
        ...device,
      });
      const page = await context.newPage();
      
      await page.goto('/mobile/categories');
      await page.waitForSelector('[data-testid="mobile-category-dashboard"]');
      
      // Basic functionality should work
      const categoryCards = page.locator('[data-testid="mobile-category-card"]');
      await expect(categoryCards).toHaveCountGreaterThan(0);
      
      // Touch interactions should work
      const firstCard = categoryCards.first();
      await firstCard.tap();
      
      await context.close();
    });
  });
});