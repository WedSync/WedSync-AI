/**
 * Mobile Domain Management E2E Tests (WS-222)
 * Testing domain management interface on mobile devices
 */

import { test, expect, Page, devices } from '@playwright/test';

// Mobile test configurations
const mobileDevices = [
  devices['iPhone SE'],
  devices['iPhone 12'],
  devices['Samsung Galaxy S21'],
  devices['iPad Mini'],
];

const testDomain = {
  domainName: 'mobiletestvendor.wedding',
  subdomain: 'photos',
  fullDomain: 'photos.mobiletestvendor.wedding',
  targetCname: 'wedsync.com',
};

const testUser = {
  email: 'mobile-test@wedsync.com',
  password: 'MobileTest123!',
};

// Helper functions for mobile interactions
async function mobileLogin(page: Page) {
  await page.goto('/login');
  
  // Mobile-specific login flow
  await page.fill('[data-testid="mobile-email-input"]', testUser.email);
  await page.fill('[data-testid="mobile-password-input"]', testUser.password);
  
  // Tap login button (mobile touch)
  await page.tap('[data-testid="mobile-login-button"]');
  await page.waitForURL('/dashboard');
}

async function openMobileMenu(page: Page) {
  // Open mobile navigation menu
  await page.tap('[data-testid="mobile-menu-toggle"]');
  await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
}

async function navigateToMobileDomains(page: Page) {
  await openMobileMenu(page);
  await page.tap('[data-testid="mobile-nav-domains"]');
  await page.waitForURL('/domains');
  await expect(page.locator('[data-testid="mobile-domains-header"]')).toBeVisible();
}

test.describe('Mobile Domain Management', () => {
  mobileDevices.forEach((device) => {
    test.describe(`${device.name}`, () => {
      test.use({ ...device });

      test('should display domain list optimized for mobile', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);

        // Check mobile-optimized layout
        await expect(page.locator('[data-testid="mobile-domain-cards"]')).toBeVisible();
        
        // Domains should be displayed as cards, not table
        const domainCards = page.locator('[data-testid^="mobile-domain-card-"]');
        await expect(domainCards.first()).toBeVisible();
        
        // Check card content structure
        const firstCard = domainCards.first();
        await expect(firstCard.locator('[data-testid="domain-name-mobile"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="domain-status-mobile"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="domain-health-mobile"]')).toBeVisible();
        
        // Check mobile-specific actions
        await expect(firstCard.locator('[data-testid="mobile-domain-actions"]')).toBeVisible();
      });

      test('should support pull-to-refresh on mobile', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);

        // Perform pull-to-refresh gesture
        await page.touchscreen.tap(100, 100);
        await page.mouse.move(100, 100);
        await page.mouse.down();
        await page.mouse.move(100, 300); // Pull down
        await page.waitForTimeout(500);
        await page.mouse.up();

        // Should show refresh indicator
        await expect(page.locator('[data-testid="mobile-refresh-indicator"]')).toBeVisible();
        
        // Wait for refresh to complete
        await page.waitForSelector('[data-testid="mobile-refresh-complete"]');
        await expect(page.locator('[data-testid="mobile-domains-header"]')).toBeVisible();
      });

      test('should open mobile-optimized add domain form', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);

        // Tap floating action button (mobile pattern)
        await page.tap('[data-testid="mobile-add-domain-fab"]');
        
        // Should open full-screen modal on mobile
        await expect(page.locator('[data-testid="mobile-add-domain-modal"]')).toBeVisible();
        
        // Check mobile form layout
        await expect(page.locator('[data-testid="mobile-form-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-form-close"]')).toBeVisible();
        
        // Form fields should be mobile-optimized
        const domainNameInput = page.locator('[data-testid="mobile-domain-name-input"]');
        await expect(domainNameInput).toBeVisible();
        
        // Test mobile keyboard input
        await domainNameInput.tap();
        await expect(page.locator('[data-testid="mobile-keyboard-active"]')).toBeVisible();
        
        await domainNameInput.fill(testDomain.domainName);
        await page.locator('[data-testid="mobile-subdomain-input"]').fill(testDomain.subdomain);
        await page.locator('[data-testid="mobile-cname-input"]').fill(testDomain.targetCname);
        
        // Submit form
        await page.tap('[data-testid="mobile-form-submit"]');
        
        // Should show mobile success message
        await expect(page.locator('[data-testid="mobile-success-toast"]')).toBeVisible();
        
        // Should return to domain list
        await expect(page.locator('[data-testid="mobile-domains-header"]')).toBeVisible();
      });

      test('should display mobile domain details with swipe navigation', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);

        // Tap on domain card to open details
        await page.tap('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Should open mobile domain detail view
        await expect(page.locator('[data-testid="mobile-domain-detail"]')).toBeVisible();
        
        // Check mobile detail sections
        await expect(page.locator('[data-testid="mobile-domain-header"]')).toContainText(testDomain.fullDomain);
        
        // Test swipe navigation between sections
        const detailContainer = page.locator('[data-testid="mobile-detail-container"]');
        
        // Swipe left to DNS section
        await page.touchscreen.tap(300, 400);
        await page.mouse.move(300, 400);
        await page.mouse.down();
        await page.mouse.move(50, 400); // Swipe left
        await page.mouse.up();
        
        await expect(page.locator('[data-testid="mobile-dns-section"]')).toBeVisible();
        
        // Swipe left to SSL section
        await page.touchscreen.tap(300, 400);
        await page.mouse.move(300, 400);
        await page.mouse.down();
        await page.mouse.move(50, 400); // Swipe left again
        await page.mouse.up();
        
        await expect(page.locator('[data-testid="mobile-ssl-section"]')).toBeVisible();
        
        // Test tab indicators
        await expect(page.locator('[data-testid="mobile-tab-indicator"]')).toBeVisible();
        const tabDots = page.locator('[data-testid="mobile-tab-dot"]');
        await expect(tabDots).toHaveCount(3); // Overview, DNS, SSL
      });

      test('should show mobile-optimized DNS instructions', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        await page.tap('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Navigate to DNS section
        await page.tap('[data-testid="mobile-dns-tab"]');
        
        // DNS instructions should be mobile-friendly
        await expect(page.locator('[data-testid="mobile-dns-instructions"]')).toBeVisible();
        
        // Check copy functionality on mobile
        await page.tap('[data-testid="mobile-copy-cname-record"]');
        
        // Should show mobile copy feedback
        await expect(page.locator('[data-testid="mobile-copy-success"]')).toBeVisible();
        
        // Test expandable sections
        await page.tap('[data-testid="mobile-dns-help-expand"]');
        await expect(page.locator('[data-testid="mobile-dns-help-content"]')).toBeVisible();
        
        // Test QR code for easy setup
        await expect(page.locator('[data-testid="mobile-dns-qr-code"]')).toBeVisible();
      });

      test('should handle mobile verification workflow', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        await page.tap('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');

        // Start verification on mobile
        await page.tap('[data-testid="mobile-verify-domain-button"]');
        
        // Should show mobile verification progress
        await expect(page.locator('[data-testid="mobile-verification-progress"]')).toBeVisible();
        
        // Test verification steps indicator
        await expect(page.locator('[data-testid="mobile-verification-steps"]')).toBeVisible();
        const steps = page.locator('[data-testid="mobile-verification-step"]');
        await expect(steps).toHaveCount(3); // DNS check, Domain verification, SSL provisioning
        
        // Mock successful verification
        await page.waitForSelector('[data-testid="mobile-verification-success"]');
        
        // Should show mobile success animation
        await expect(page.locator('[data-testid="mobile-success-animation"]')).toBeVisible();
        
        // Test mobile share functionality
        await page.tap('[data-testid="mobile-share-domain-button"]');
        await expect(page.locator('[data-testid="mobile-share-options"]')).toBeVisible();
      });

      test('should display mobile health monitoring dashboard', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        await page.tap('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Navigate to health section
        await page.tap('[data-testid="mobile-health-tab"]');
        
        // Health dashboard should be mobile-optimized
        await expect(page.locator('[data-testid="mobile-health-dashboard"]')).toBeVisible();
        
        // Check mobile health metrics
        await expect(page.locator('[data-testid="mobile-health-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-response-time"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-uptime-percentage"]')).toBeVisible();
        
        // Test mobile chart interactions
        const healthChart = page.locator('[data-testid="mobile-health-chart"]');
        await expect(healthChart).toBeVisible();
        
        // Pinch to zoom on chart
        await page.touchscreen.tap(200, 300);
        await page.touchscreen.tap(250, 350);
        // Simulate pinch gesture
        await page.mouse.move(200, 300);
        await page.mouse.down();
        await page.mouse.move(180, 280); // Pinch in
        await page.mouse.up();
        
        // Chart should respond to touch interaction
        await expect(page.locator('[data-testid="mobile-chart-zoomed"]')).toBeVisible();
      });

      test('should handle mobile alerts and notifications', async ({ page }) => {
        // Mock mobile push notification permission
        await page.context().grantPermissions(['notifications']);
        
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        
        // Should show mobile notification setup
        await expect(page.locator('[data-testid="mobile-notification-setup"]')).toBeVisible();
        
        // Enable mobile notifications
        await page.tap('[data-testid="mobile-enable-notifications"]');
        
        // Should show mobile alert preferences
        await expect(page.locator('[data-testid="mobile-alert-preferences"]')).toBeVisible();
        
        // Configure mobile alert settings
        await page.tap('[data-testid="mobile-ssl-expiry-alerts"]');
        await page.tap('[data-testid="mobile-health-alerts"]');
        
        // Save mobile preferences
        await page.tap('[data-testid="mobile-save-preferences"]');
        
        // Should show mobile confirmation
        await expect(page.locator('[data-testid="mobile-preferences-saved"]')).toBeVisible();
      });

      test('should support mobile offline functionality', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        
        // Load domain data while online
        await expect(page.locator('[data-testid="mobile-domains-header"]')).toBeVisible();
        
        // Go offline
        await page.context().setOffline(true);
        
        // Should show offline indicator
        await expect(page.locator('[data-testid="mobile-offline-indicator"]')).toBeVisible();
        
        // Should still show cached domain data
        await expect(page.locator('[data-testid^="mobile-domain-card-"]')).toBeVisible();
        
        // Try to perform action while offline
        await page.tap('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Should show offline message
        await expect(page.locator('[data-testid="mobile-offline-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-offline-message"]')).toContainText('No internet connection');
        
        // Go back online
        await page.context().setOffline(false);
        
        // Should sync automatically
        await expect(page.locator('[data-testid="mobile-sync-indicator"]')).toBeVisible();
        await page.waitForSelector('[data-testid="mobile-sync-complete"]');
      });

      test('should optimize performance on slower mobile connections', async ({ page }) => {
        // Simulate slow 3G connection
        await page.context().route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, 200)); // Add delay
          await route.continue();
        });

        const startTime = Date.now();
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        
        // Should show loading skeleton while data loads
        await expect(page.locator('[data-testid="mobile-loading-skeleton"]')).toBeVisible();
        
        // Should progressively load content
        await page.waitForSelector('[data-testid="mobile-domains-header"]');
        const loadTime = Date.now() - startTime;
        
        // Should load core content within reasonable time even on slow connection
        expect(loadTime).toBeLessThan(10000);
        
        // Images should lazy load
        const domainCards = page.locator('[data-testid^="mobile-domain-card-"]');
        await expect(domainCards.first()).toBeVisible();
        
        // Should show image placeholders initially
        await expect(page.locator('[data-testid="mobile-image-placeholder"]')).toBeVisible();
      });

      test('should handle mobile accessibility features', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        
        // Test voice over / screen reader support
        const domainCard = page.locator('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Should have proper ARIA labels
        await expect(domainCard).toHaveAttribute('aria-label');
        await expect(domainCard).toHaveAttribute('role', 'button');
        
        // Test high contrast mode compatibility
        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(page.locator('[data-testid="mobile-domains-header"]')).toBeVisible();
        
        // Test larger text support
        await page.addStyleTag({
          content: `
            * {
              font-size: 1.5em !important;
            }
          `
        });
        
        // Content should still be readable with larger text
        await expect(domainCard).toBeVisible();
        
        // Test keyboard navigation on mobile (external keyboard)
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
      });

      test('should support mobile gesture navigation', async ({ page }) => {
        await mobileLogin(page);
        await navigateToMobileDomains(page);
        
        // Test swipe to delete domain (with confirmation)
        const domainCard = page.locator('[data-testid="mobile-domain-card-photos.mobiletestvendor.wedding"]');
        
        // Swipe left to reveal delete action
        await page.touchscreen.tap(300, 200);
        await page.mouse.move(300, 200);
        await page.mouse.down();
        await page.mouse.move(50, 200); // Swipe left
        await page.mouse.up();
        
        // Should show delete action
        await expect(page.locator('[data-testid="mobile-delete-action"]')).toBeVisible();
        
        // Test swipe to refresh
        await page.touchscreen.tap(200, 100);
        await page.mouse.move(200, 100);
        await page.mouse.down();
        await page.mouse.move(200, 300); // Swipe down
        await page.mouse.up();
        
        // Should trigger refresh
        await expect(page.locator('[data-testid="mobile-refresh-indicator"]')).toBeVisible();
        
        // Test long press for context menu
        await domainCard.press(); // Long press
        await page.waitForTimeout(800);
        
        // Should show context menu
        await expect(page.locator('[data-testid="mobile-context-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-context-edit"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-context-delete"]')).toBeVisible();
      });
    });
  });

  test.describe('Cross-Device Synchronization', () => {
    test('should sync domain changes across mobile and desktop', async ({ browser }) => {
      // Create two contexts: mobile and desktop
      const mobileContext = await browser.newContext(devices['iPhone 12']);
      const desktopContext = await browser.newContext();
      
      const mobilePage = await mobileContext.newPage();
      const desktopPage = await desktopContext.newPage();
      
      // Login on both devices
      await mobileLogin(mobilePage);
      await navigateToMobileDomains(mobilePage);
      
      await desktopPage.goto('/login');
      await desktopPage.fill('[data-testid="email-input"]', testUser.email);
      await desktopPage.fill('[data-testid="password-input"]', testUser.password);
      await desktopPage.click('[data-testid="login-button"]');
      await desktopPage.goto('/domains');
      
      // Create domain on mobile
      await mobilePage.tap('[data-testid="mobile-add-domain-fab"]');
      await mobilePage.fill('[data-testid="mobile-domain-name-input"]', 'syncdomain.com');
      await mobilePage.fill('[data-testid="mobile-cname-input"]', testDomain.targetCname);
      await mobilePage.tap('[data-testid="mobile-form-submit"]');
      
      // Should appear on desktop (with real-time sync)
      await desktopPage.waitForSelector('[data-testid="domain-row-syncdomain.com"]');
      await expect(desktopPage.locator('[data-testid="domain-row-syncdomain.com"]')).toBeVisible();
      
      // Update domain on desktop
      await desktopPage.click('[data-testid="domain-row-syncdomain.com"]');
      await desktopPage.click('[data-testid="edit-domain-button"]');
      await desktopPage.fill('[data-testid="domain-notes-input"]', 'Updated from desktop');
      await desktopPage.click('[data-testid="save-domain-button"]');
      
      // Should sync to mobile
      await mobilePage.reload();
      await mobilePage.tap('[data-testid="mobile-domain-card-syncdomain.com"]');
      await expect(mobilePage.locator('[data-testid="mobile-domain-notes"]')).toContainText('Updated from desktop');
      
      await mobileContext.close();
      await desktopContext.close();
    });
  });
});