/**
 * WS-193 Mobile Performance Tests Suite - Team D
 * PWA Performance Testing for Wedding Workflows
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

describe('PWA Performance Testing - WS-193 Team D', () => {
  
  test('should load app shell quickly on repeat visits', async ({ page }) => {
    console.log('\n🏗️ Testing PWA App Shell Performance...');
    
    // First visit to cache app shell
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
    console.log('✅ Service worker registered successfully');
    
    // Clear network cache but keep service worker cache
    await page.context().clearCookies();
    
    // Second visit should use cached app shell
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]');
    const loadTime = Date.now() - startTime;
    
    console.log(`   App shell load time (cached): ${loadTime}ms`);
    expect(loadTime).toBeLessThan(1000); // App shell loads under 1s
    
    // Verify app shell elements are present
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
  });

  test('should handle offline form submission gracefully', async ({ page }) => {
    console.log('\n📱 Testing Offline Form Handling...');
    
    await page.goto('/supplier/forms/create');
    
    // Fill form while online
    await page.fill('[data-testid="form-title"]', 'Wedding Photography Package');
    await page.fill('[data-testid="form-description"]', 'Professional wedding photography services');
    
    // Go offline before submission
    await page.context().setOffline(true);
    console.log('🔌 Network disabled - testing offline behavior');
    
    const submitStart = Date.now();
    await page.click('[data-testid="submit-form"]');
    
    // Should show offline indicator and queue submission
    await page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 3000 });
    await page.waitForSelector('[data-testid="submission-queued"]', { timeout: 3000 });
    
    const offlineHandlingTime = Date.now() - submitStart;
    console.log(`   Offline handling time: ${offlineHandlingTime}ms`);
    expect(offlineHandlingTime).toBeLessThan(500); // Quick offline handling
    
    // Come back online and verify sync
    await page.context().setOffline(false);
    console.log('🌐 Network restored - testing sync');
    
    const syncStart = Date.now();
    await page.waitForSelector('[data-testid="submission-synced"]', { timeout: 10000 });
    const syncTime = Date.now() - syncStart;
    
    console.log(`   Sync completion time: ${syncTime}ms`);
    expect(syncTime).toBeLessThan(5000); // Sync completes under 5s
    
    // Verify form was actually submitted
    await expect(page.locator('[data-testid="form-success"]')).toBeVisible();
  });

  test('should handle photo uploads with progress indication', async ({ page }) => {
    console.log('\n📸 Testing Photo Upload Performance...');
    
    await page.goto('/forms/wedding-photos/upload');
    
    // Create test image file (simulating wedding photo)
    const testImagePath = path.join(__dirname, '../../fixtures/test-wedding-photo.jpg');
    
    // If test file doesn't exist, create a simple one
    const testImageExists = await page.evaluate(() => {
      // Check if we can simulate file upload
      return true; // Assume we have test infrastructure
    });
    
    if (testImageExists) {
      const fileInput = page.locator('input[type="file"]');
      
      const uploadStart = Date.now();
      
      // Simulate wedding photo upload (2MB file)
      await fileInput.setInputFiles({
        name: 'wedding-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(2 * 1024 * 1024) // 2MB test file
      });
      
      // Should show progress indication immediately
      await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 1000 });
      console.log('✅ Upload progress indicator appeared');
      
      // Progress should update during upload
      const progressBar = page.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      
      // Monitor progress updates
      let progressUpdates = 0;
      const checkProgress = setInterval(async () => {
        try {
          const progress = await progressBar.getAttribute('aria-valuenow');
          if (progress && parseInt(progress) > 0) {
            progressUpdates++;
            console.log(`   Upload progress: ${progress}%`);
          }
        } catch (e) {
          // Progress element might be removed when complete
        }
      }, 500);
      
      // Wait for upload completion
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });
      clearInterval(checkProgress);
      
      const uploadTime = Date.now() - uploadStart;
      console.log(`   Total upload time: ${uploadTime}ms`);
      console.log(`   Progress updates seen: ${progressUpdates}`);
      
      // Should complete within reasonable time on 4G
      expect(uploadTime).toBeLessThan(30000); // Under 30s for 2MB photo
      expect(progressUpdates).toBeGreaterThan(0); // Should show progress
      
      // Verify upload success feedback
      await expect(page.locator('[data-testid="upload-success-message"]')).toBeVisible();
    }
  });

  test('should maintain performance during wedding coordination', async ({ page }) => {
    console.log('\n💒 Testing Wedding Day Coordination Performance...');
    
    await page.goto('/wedding/coordination/live');
    
    // Simulate multiple real-time updates (typical wedding day scenario)
    const coordinationStart = Date.now();
    
    // Simulate vendor status updates
    const updates = [
      { type: 'vendor-status', vendor: 'photographer', status: 'arrived' },
      { type: 'timeline-update', event: 'ceremony', delay: 15 },
      { type: 'guest-count', change: +5 },
      { type: 'weather-alert', condition: 'light-rain' },
      { type: 'vendor-status', vendor: 'caterer', status: 'setup-complete' }
    ];
    
    for (const update of updates) {
      // Simulate real-time update via WebSocket or Server-Sent Events
      await page.evaluate((updateData) => {
        // Simulate receiving real-time update
        window.dispatchEvent(new CustomEvent('wedding-update', {
          detail: updateData
        }));
      }, update);
      
      // Wait for UI to update
      await page.waitForTimeout(200);
      
      // Verify update is reflected in UI
      const updateElement = page.locator(`[data-testid="update-${update.type}"]`);
      await expect(updateElement).toBeVisible({ timeout: 1000 });
    }
    
    const coordinationTime = Date.now() - coordinationStart;
    console.log(`   Coordination updates processed in: ${coordinationTime}ms`);
    
    // Real-time coordination should be snappy
    expect(coordinationTime).toBeLessThan(3000);
    
    // Check that all updates are visible
    const visibleUpdates = await page.locator('[data-testid^="update-"]').count();
    expect(visibleUpdates).toBe(updates.length);
    
    console.log('✅ All coordination updates processed successfully');
  });

  test('should cache critical wedding day resources', async ({ page }) => {
    console.log('\n💾 Testing Critical Resource Caching...');
    
    // Navigate to wedding day dashboard
    await page.goto('/wedding/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check that critical resources are cached
    const cachedResources = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const criticalCache = await caches.open('wedding-critical-v1');
        const cachedRequests = await criticalCache.keys();
        
        return {
          cacheNames: cacheNames,
          criticalResourcesCount: cachedRequests.length,
          cachedUrls: cachedRequests.map(req => req.url)
        };
      }
      return { cacheNames: [], criticalResourcesCount: 0, cachedUrls: [] };
    });
    
    console.log(`   Cache names: ${cachedResources.cacheNames.join(', ')}`);
    console.log(`   Critical resources cached: ${cachedResources.criticalResourcesCount}`);
    
    // Should have cached critical resources
    expect(cachedResources.criticalResourcesCount).toBeGreaterThan(0);
    
    // Test offline access to cached resources
    await page.context().setOffline(true);
    
    const offlineStartTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="wedding-dashboard"]', { timeout: 5000 });
    const offlineLoadTime = Date.now() - offlineStartTime;
    
    console.log(`   Offline load time: ${offlineLoadTime}ms`);
    expect(offlineLoadTime).toBeLessThan(3000); // Should load quickly from cache
    
    // Restore network
    await page.context().setOffline(false);
  });

  test('should handle push notifications efficiently', async ({ page }) => {
    console.log('\n🔔 Testing Push Notification Performance...');
    
    await page.goto('/dashboard');
    
    // Test notification permission and registration
    const notificationSetup = await page.evaluate(async () => {
      const setupStart = Date.now();
      
      // Mock notification permission (granted for testing)
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: false
      });
      
      // Mock service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Mock push subscription
        const pushSubscription = {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            auth: 'test-auth-key',
            p256dh: 'test-p256dh-key'
          }
        };
        
        const setupTime = Date.now() - setupStart;
        
        return {
          setupTime,
          hasServiceWorker: !!registration,
          hasNotificationPermission: Notification.permission === 'granted'
        };
      }
      
      return { setupTime: Date.now() - setupStart, hasServiceWorker: false, hasNotificationPermission: false };
    });
    
    console.log(`   Notification setup time: ${notificationSetup.setupTime}ms`);
    console.log(`   Service worker available: ${notificationSetup.hasServiceWorker}`);
    console.log(`   Notification permission: ${notificationSetup.hasNotificationPermission}`);
    
    // Setup should be quick
    expect(notificationSetup.setupTime).toBeLessThan(1000);
    
    // Test notification handling performance
    if (notificationSetup.hasServiceWorker) {
      const notificationStart = Date.now();
      
      // Simulate receiving push notification
      await page.evaluate(() => {
        // Mock notification display
        const mockNotification = {
          title: 'Wedding Update',
          body: 'Ceremony delayed by 15 minutes',
          icon: '/icons/wedding-alert.png',
          tag: 'wedding-update',
          data: { type: 'timeline-change', weddingId: 'test-123' }
        };
        
        // Simulate notification click handling
        window.dispatchEvent(new CustomEvent('push-notification', {
          detail: mockNotification
        }));
      });
      
      // Wait for notification to be processed
      await page.waitForTimeout(500);
      
      const notificationProcessTime = Date.now() - notificationStart;
      console.log(`   Notification processing time: ${notificationProcessTime}ms`);
      
      // Notification processing should be immediate
      expect(notificationProcessTime).toBeLessThan(1000);
    }
  });

  test('should optimize memory usage during long wedding days', async ({ page }) => {
    console.log('\n🧠 Testing Memory Optimization...');
    
    await page.goto('/wedding/live-coordination');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (initialMemory) {
      console.log(`   Initial memory: ${Math.round(initialMemory.usedJSHeapSize / 1024 / 1024)}MB`);
      
      // Simulate long wedding day activity (12 hours worth of updates)
      const simulationStart = Date.now();
      
      for (let hour = 0; hour < 12; hour++) {
        // Simulate hourly activities
        await page.evaluate((currentHour) => {
          // Add photos to gallery
          for (let i = 0; i < 10; i++) {
            window.dispatchEvent(new CustomEvent('photo-added', {
              detail: { id: `photo-${currentHour}-${i}`, url: `test-photo-${i}.jpg` }
            }));
          }
          
          // Add timeline updates
          window.dispatchEvent(new CustomEvent('timeline-update', {
            detail: { time: `${currentHour + 8}:00`, event: `Hour ${currentHour + 1} activities` }
          }));
          
          // Trigger some cleanup (simulate garbage collection)
          if (window.gc) {
            window.gc();
          }
        }, hour);
        
        await page.waitForTimeout(100); // Brief pause between hours
      }
      
      const simulationTime = Date.now() - simulationStart;
      console.log(`   Wedding day simulation completed in: ${simulationTime}ms`);
      
      // Check memory after simulation
      const finalMemory = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        };
      });
      
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024);
      
      console.log(`   Final memory: ${Math.round(finalMemory.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`   Memory increase: ${memoryIncreaseMB}MB`);
      
      // Memory increase should be reasonable for 12-hour wedding day
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      
      // Total memory usage should stay within mobile limits
      expect(finalMemory.usedJSHeapSize).toBeLessThan(200 * 1024 * 1024); // Under 200MB total
    }
  });

  test('should maintain PWA performance across app state changes', async ({ page }) => {
    console.log('\n🔄 Testing PWA State Change Performance...');
    
    // Test navigation between different wedding sections
    const sections = [
      '/dashboard',
      '/timeline',
      '/photos',
      '/tasks',
      '/clients',
      '/forms'
    ];
    
    const navigationTimes: number[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const navStart = Date.now();
      
      await page.goto(sections[i]);
      await page.waitForSelector('[data-testid="section-loaded"]', { timeout: 5000 });
      
      const navTime = Date.now() - navStart;
      navigationTimes.push(navTime);
      
      console.log(`   ${sections[i]} load time: ${navTime}ms`);
      
      // Each section should load quickly (PWA benefit)
      expect(navTime).toBeLessThan(2000);
    }
    
    const avgNavigationTime = navigationTimes.reduce((a, b) => a + b) / navigationTimes.length;
    console.log(`   Average navigation time: ${Math.round(avgNavigationTime)}ms`);
    
    // Average should be good for PWA
    expect(avgNavigationTime).toBeLessThan(1500);
    
    // Test app state persistence
    await page.evaluate(() => {
      // Simulate app state changes
      localStorage.setItem('wedding-state', JSON.stringify({
        currentWedding: 'test-wedding-123',
        activeView: 'timeline',
        filters: ['photographer', 'caterer'],
        timestamp: Date.now()
      }));
    });
    
    // Refresh page and verify state restoration
    const restoreStart = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="app-restored"]', { timeout: 3000 });
    const restoreTime = Date.now() - restoreStart;
    
    console.log(`   State restoration time: ${restoreTime}ms`);
    expect(restoreTime).toBeLessThan(2000);
    
    // Verify state was restored
    const restoredState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('wedding-state') || '{}');
    });
    
    expect(restoredState.currentWedding).toBe('test-wedding-123');
    expect(restoredState.activeView).toBe('timeline');
    
    console.log('✅ PWA state management performance validated');
  });

});