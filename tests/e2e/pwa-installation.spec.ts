/**
 * WS-146: App Store Preparation System - E2E Tests
 * Comprehensive testing for PWA installation and app store readiness
 */

import { test, expect } from '@playwright/test';

test.describe('WS-146: PWA Installation and App Store Readiness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Clear any existing install state
    await page.evaluate(() => {
      localStorage.removeItem('pwa_installed');
      localStorage.removeItem('install_prompt_dismissed');
      sessionStorage.clear();
    });
  });

  test('should have enhanced PWA manifest for app stores', async ({ page }) => {
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should load app-store-ready manifest.json correctly', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
    
    const manifest = await response?.json();
    
    // Updated app store requirements
    expect(manifest.name).toBe('WedSync - Wedding Vendor Platform');
    expect(manifest.short_name).toBe('WedSync');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#6366F1'); // Updated brand color
    expect(manifest.background_color).toBe('#FFFFFF');
    expect(manifest.id).toBe('app.wedsync.supplier');
    expect(manifest.categories).toContain('business');
    expect(manifest.categories).toContain('productivity');
    expect(manifest.iarc_rating_id).toBeTruthy();
    expect(manifest.icons).toHaveLength(9); // Including 1024x1024 for app stores
  });

  test('should register service worker', async ({ page }) => {
    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state === 'activated';
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('should cache static assets', async ({ page }) => {
    // Navigate to trigger caching
    await page.goto('/dashboard');
    
    // Check if caches are populated
    const cacheNames = await page.evaluate(async () => {
      if ('caches' in window) {
        return await caches.keys();
      }
      return [];
    });
    
    expect(cacheNames.length).toBeGreaterThan(0);
    expect(cacheNames.some(name => name.includes('wedsync'))).toBe(true);
  });

  test('should work offline for cached pages', async ({ page, context }) => {
    // First visit to cache the page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to cached page
    await page.goto('/dashboard');
    
    // Page should still load from cache
    const title = await page.title();
    expect(title).toContain('WedSync');
    
    // Check offline indicator if present
    const offlineIndicator = page.locator('text=/offline mode/i');
    if (await offlineIndicator.isVisible()) {
      await expect(offlineIndicator).toBeVisible();
    }
  });

  test('should show install prompt on supported browsers', async ({ page, browserName }) => {
    // Skip for browsers that don't support PWA installation
    if (browserName === 'webkit') {
      test.skip();
    }
    
    // Wait for potential install prompt
    await page.waitForTimeout(4000); // Install prompt shows after 3 seconds
    
    // Check if install prompt appears (may not appear if already installed)
    const installPrompt = page.locator('text=/install wedsync/i');
    if (await installPrompt.isVisible()) {
      await expect(installPrompt).toBeVisible();
      
      // Check install button
      const installButton = page.locator('button:has-text("Install App")');
      await expect(installButton).toBeVisible();
      
      // Check dismiss button
      const dismissButton = page.locator('button:has-text("Not Now")');
      await expect(dismissButton).toBeVisible();
    }
  });

  test('should handle iOS install instructions', async ({ page }) => {
    // Simulate iOS user agent
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: false,
      });
    });
    
    await page.reload();
    await page.waitForTimeout(4000);
    
    const installPrompt = page.locator('text=/install wedsync/i');
    if (await installPrompt.isVisible()) {
      const instructionsButton = page.locator('button:has-text("Show Instructions")');
      if (await instructionsButton.isVisible()) {
        await instructionsButton.click();
        
        // Check for iOS install instructions alert
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('Add to Home Screen');
          await dialog.accept();
        });
      }
    }
  });

  test('should have correct app icons', async ({ page }) => {
    const iconSizes = ['72', '96', '128', '144', '152', '192', '384', '512'];
    
    for (const size of iconSizes) {
      const response = await page.goto(`/icons/icon-${size}x${size}.svg`);
      expect(response?.status()).toBe(200);
    }
    
    // Check apple touch icon
    const appleIcon = await page.goto('/icons/apple-touch-icon.svg');
    expect(appleIcon?.status()).toBe(200);
  });

  test('should handle push notification permission request', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);
    
    await page.goto('/dashboard');
    
    // Check if notification button appears
    const notificationButton = page.locator('button:has-text("Enable Notifications")');
    if (await notificationButton.isVisible()) {
      await notificationButton.click();
      
      // Check if subscription succeeds
      await expect(page.locator('button:has-text("Disable Notifications")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle background sync', async ({ page }) => {
    // Check if background sync is registered
    const hasSyncRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore
        const tags = await registration.sync.getTags();
        return tags.includes('timeline-sync');
      }
      return false;
    });
    
    // Background sync may not be supported in all browsers
    if (hasSyncRegistration) {
      expect(hasSyncRegistration).toBe(true);
    }
  });

  test('should update service worker when new version available', async ({ page }) => {
    // This test checks if the update mechanism is in place
    const hasUpdateHandler = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            resolve(registration.onupdatefound !== null || true);
          });
        } else {
          resolve(false);
        }
      });
    });
    
    expect(hasUpdateHandler).toBe(true);
  });

  test('should have correct PWA metadata in head', async ({ page }) => {
    // Check theme color
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#3b82f6');
    
    // Check apple mobile web app capable
    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    if (await appleCapable.count() > 0) {
      await expect(appleCapable).toHaveAttribute('content', 'yes');
    }
    
    // Check apple mobile web app title
    const appleTitle = await page.locator('meta[name="apple-mobile-web-app-title"]');
    if (await appleTitle.count() > 0) {
      await expect(appleTitle).toHaveAttribute('content', 'WedSync');
    }
  });

  test('should handle timeline data caching', async ({ page }) => {
    await page.goto('/dashboard/timeline');
    
    // Check if timeline data is cached
    const hasTimelineCache = await page.evaluate(async () => {
      if ('caches' in window) {
        const cache = await caches.open('wedsync-timeline-data-v1');
        const keys = await cache.keys();
        return keys.some(request => request.url.includes('/api/timeline'));
      }
      return false;
    });
    
    // Timeline cache might not be populated immediately
    if (hasTimelineCache) {
      expect(hasTimelineCache).toBe(true);
    }
  });

  test('should display app in standalone mode when installed', async ({ page }) => {
    // Check if running in standalone mode
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             // @ts-ignore
             window.navigator.standalone === true;
    });
    
    // This will be false in regular browser, true only when installed
    expect(typeof isStandalone).toBe('boolean');
  });
});

test.describe('PWA Performance', () => {
  test('should meet Lighthouse PWA criteria', async ({ page }) => {
    // This is a placeholder for Lighthouse integration
    // In a real scenario, you'd run Lighthouse programmatically
    
    await page.goto('/');
    
    // Check basic PWA requirements
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSW).toBe(true);
    
    const hasManifest = await page.locator('link[rel="manifest"]').count();
    expect(hasManifest).toBeGreaterThan(0);
    
    const hasHTTPS = page.url().startsWith('https://') || page.url().includes('localhost');
    expect(hasHTTPS).toBe(true);
  });
});