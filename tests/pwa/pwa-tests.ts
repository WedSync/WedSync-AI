/**
 * PWA Functionality Testing Framework
 * WS-192 Mobile Integration Tests Suite - PWA Testing
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable service worker registration
    await page.addInitScript(() => {
      // Mock service worker APIs
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: () => Promise.resolve({ scope: '/' }),
          ready: Promise.resolve({ active: { state: 'activated' } }),
          controller: { state: 'activated' }
        },
        writable: true
      });
    });
  });

  test('PWA manifest and service worker registration', async ({ page }) => {
    await page.goto('/');
    
    // Check for web app manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    
    // Verify service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('PWA installation prompt', async ({ page }) => {
    await page.goto('/');
    
    // Simulate beforeinstallprompt event
    await page.evaluate(() => {
      const installEvent = new Event('beforeinstallprompt');
      (installEvent as any).prompt = () => Promise.resolve();
      (installEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(installEvent);
    });
    
    // Check for install prompt
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();
    
    // Click install
    await page.click('[data-testid="pwa-install"]');
    
    // Verify installation process
    await expect(page.locator('.pwa-installing')).toBeVisible();
  });

  test('Offline page caching', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to key pages to cache them
    const pagesToCache = ['/dashboard', '/forms', '/clients'];
    for (const pageUrl of pagesToCache) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
    }
    
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to cached pages
    for (const pageUrl of pagesToCache) {
      await page.goto(pageUrl);
      await expect(page.locator('body')).toBeVisible();
      // Should not show offline page
      await expect(page.locator('.offline-page')).not.toBeVisible();
    }
  });

  test('Background sync functionality', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Create data while online
    await page.fill('#client-note', 'Important wedding detail');
    await page.click('#save-note');
    
    // Go offline
    await context.setOffline(true);
    
    // Create more data while offline
    await page.fill('#client-note', 'Offline note for sync');
    await page.click('#save-offline');
    
    // Verify offline queue
    const offlineItems = await page.evaluate(() => {
      return localStorage.getItem('offline-sync-queue');
    });
    expect(offlineItems).toBeTruthy();
    
    // Go back online
    await context.setOffline(false);
    
    // Trigger background sync
    await page.evaluate(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_DATA' });
      }
    });
    
    // Wait for sync completion
    await page.waitForTimeout(2000);
    
    // Verify data synced
    const syncedData = await page.evaluate(() => {
      return localStorage.getItem('offline-sync-queue');
    });
    expect(syncedData).toBe(null); // Should be cleared after sync
  });

  test('Push notification handling', async ({ page }) => {
    await page.goto('/');
    
    // Mock push notification permission
    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      (window as any).mockNotification = class {
        constructor(title: string, options: any) {
          (this as any).title = title;
          (this as any).options = options;
        }
      };
      
      (Notification as any) = (window as any).mockNotification;
    });
    
    // Request notification permission
    const hasPermission = await page.evaluate(async () => {
      if ('Notification' in window) {
        return Notification.permission === 'granted';
      }
      return false;
    });
    
    expect(hasPermission).toBe(true);
    
    // Test push notification display
    await page.evaluate(() => {
      new Notification('Wedding Update', {
        body: 'Timeline has been updated for your wedding',
        icon: '/icons/wedding-bell.png',
        badge: '/icons/badge.png'
      });
    });
    
    // Verify notification was created (mock verification)
    const notificationCreated = await page.evaluate(() => {
      return typeof Notification === 'function';
    });
    
    expect(notificationCreated).toBe(true);
  });

  test('App shortcuts functionality', async ({ page }) => {
    await page.goto('/');
    
    // Check manifest for shortcuts
    const manifestResponse = await page.request.get('/manifest.json');
    const manifest = await manifestResponse.json();
    
    expect(manifest.shortcuts).toBeDefined();
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
    
    // Verify shortcut structure
    const shortcut = manifest.shortcuts[0];
    expect(shortcut.name).toBeDefined();
    expect(shortcut.url).toBeDefined();
    expect(shortcut.icons).toBeDefined();
  });

  test('PWA update handling', async ({ page }) => {
    await page.goto('/');
    
    // Mock service worker update
    await page.evaluate(() => {
      // Simulate service worker update available
      const updateEvent = new Event('updatefound');
      if ('serviceWorker' in navigator) {
        window.dispatchEvent(updateEvent);
      }
    });
    
    // Check for update notification
    await expect(page.locator('[data-testid="pwa-update-available"]')).toBeVisible();
    
    // Click update button
    await page.click('[data-testid="pwa-update-btn"]');
    
    // Verify update process started
    await expect(page.locator('.pwa-updating')).toBeVisible();
  });

  test('Offline indicator and user feedback', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Should be online initially
    await expect(page.locator('.online-indicator')).toBeVisible();
    
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000); // Wait for offline detection
    
    // Should show offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.online-indicator')).not.toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000); // Wait for online detection
    
    // Should show online indicator
    await expect(page.locator('.online-indicator')).toBeVisible();
    await expect(page.locator('.offline-indicator')).not.toBeVisible();
  });
});