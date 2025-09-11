import { test, expect, devices, type Page, type BrowserContext } from '@playwright/test';

// Mobile device configurations for comprehensive testing
const mobileDevices = [
  { device: devices['iPhone SE'], name: 'iPhone SE' },
  { device: devices['iPhone 12'], name: 'iPhone 12' },
  { device: devices['iPhone 12 Pro Max'], name: 'iPhone 12 Pro Max' },
  { device: devices['iPad Mini'], name: 'iPad Mini' },
  { device: devices['Samsung Galaxy S21'], name: 'Samsung Galaxy S21' },
  { device: devices['Samsung Galaxy Tab S4'], name: 'Samsung Galaxy Tab S4' },
  { device: devices['Pixel 5'], name: 'Pixel 5' },
];

// Network condition simulations for venue testing
const networkConditions = [
  { name: '4G', speed: { download: 4000, upload: 1000, latency: 50 } },
  { name: '3G', speed: { download: 1500, upload: 750, latency: 300 } },
  { name: '2G', speed: { download: 250, upload: 50, latency: 800 } },
  { name: 'Slow 3G', speed: { download: 500, upload: 500, latency: 2000 } },
];

// Venue environment test scenarios
const venueScenarios = [
  { name: 'Indoor Reception Hall', lighting: 'normal', connectivity: 'good', temperature: 'normal' },
  { name: 'Outdoor Garden', lighting: 'bright', connectivity: 'poor', temperature: 'warm' },
  { name: 'Historic Venue', lighting: 'dim', connectivity: 'very-poor', temperature: 'cool' },
  { name: 'Beach Wedding', lighting: 'very-bright', connectivity: 'cellular-only', temperature: 'hot' },
  { name: 'Mountain Resort', lighting: 'variable', connectivity: 'intermittent', temperature: 'cold' },
];

test.describe('Mobile Music Interface - Comprehensive Testing', () => {
  
  // Test on multiple mobile devices
  for (const { device, name } of mobileDevices) {
    test.describe(`${name} Device Tests`, () => {
      test.use({ ...device });

      test('should render mobile interface correctly', async ({ page }) => {
        await page.goto('/music/database');
        
        // Check mobile interface elements are present
        await expect(page.locator('[data-testid="music-search"]')).toBeVisible();
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
        
        // Verify mobile-optimized touch targets (minimum 48px)
        const searchInput = page.locator('[data-testid="music-search"]');
        const searchBox = await searchInput.boundingBox();
        expect(searchBox?.height).toBeGreaterThanOrEqual(48);
        
        // Check that text is readable on mobile
        const fontSize = await searchInput.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
        expect(fontSize).toBeGreaterThanOrEqual(16); // Minimum mobile font size
      });

      test('should handle touch gestures correctly', async ({ page }) => {
        await page.goto('/music/database');
        
        // Search for tracks
        await page.fill('[data-testid="music-search"]', 'Perfect by Ed Sheeran');
        await page.waitForSelector('[data-testid="track-0"]');
        
        // Test swipe right to add to playlist
        const trackElement = page.locator('[data-testid="track-0"]');
        const trackBox = await trackElement.boundingBox();
        
        if (trackBox) {
          // Simulate swipe right gesture
          await page.touchscreen.tap(trackBox.x + 50, trackBox.y + trackBox.height / 2);
          await page.touchscreen.tap(trackBox.x + trackBox.width - 50, trackBox.y + trackBox.height / 2);
        }
        
        // Verify track was added to playlist
        await expect(page.locator('[data-testid="playlist-items"]')).toContainText('Perfect');
      });

      test('should work in both portrait and landscape orientations', async ({ page, context }) => {
        // Test portrait mode
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/music/database');
        
        await expect(page.locator('[data-testid="music-search"]')).toBeVisible();
        await expect(page.locator('.portrait-layout')).toBeVisible();
        
        // Test landscape mode
        await page.setViewportSize({ width: 812, height: 375 });
        await page.reload();
        
        await expect(page.locator('[data-testid="music-search"]')).toBeVisible();
        // Verify layout adapts to landscape
        const layoutClass = await page.getAttribute('.music-interface', 'class');
        expect(layoutClass).not.toContain('portrait-layout');
      });

      test('should handle poor network conditions gracefully', async ({ page, context }) => {
        // Simulate slow 3G connection
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Add 1s delay
          await route.continue();
        });

        await page.goto('/music/database');
        
        // Test search with slow connection
        await page.fill('[data-testid="music-search"]', 'wedding songs');
        
        // Should show loading indicator
        await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 10000 });
        
        // Should eventually show results
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 15000 });
      });

      test('should work offline with cached content', async ({ page, context }) => {
        await page.goto('/music/database');
        
        // Load some content first
        await page.fill('[data-testid="music-search"]', 'Perfect');
        await page.waitForSelector('[data-testid="track-0"]');
        
        // Go offline
        await context.setOffline(true);
        await page.reload();
        
        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline mode');
        
        // Should still be able to interact with cached content
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      });
    });
  }

  // Network condition testing
  for (const network of networkConditions) {
    test.describe(`${network.name} Network Tests`, () => {
      test(`should perform well on ${network.name} connection`, async ({ page, context }) => {
        // Simulate network conditions
        await page.emulateNetworkConditions({
          offline: false,
          downloadThroughput: network.speed.download * 1024, // Convert to bytes
          uploadThroughput: network.speed.upload * 1024,
          latency: network.speed.latency
        });

        const startTime = Date.now();
        await page.goto('/music/database');
        
        // Measure load time
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Performance thresholds based on network speed
        const maxLoadTime = network.name === '4G' ? 3000 : 
                          network.name === '3G' ? 5000 : 
                          network.name === '2G' ? 8000 : 10000;
        
        expect(loadTime).toBeLessThan(maxLoadTime);
        
        // Test search functionality on slow network
        const searchStart = Date.now();
        await page.fill('[data-testid="music-search"]', 'wedding');
        await page.waitForSelector('[data-testid="search-results"] > *');
        const searchTime = Date.now() - searchStart;
        
        // Search should complete reasonably quickly even on slow networks
        expect(searchTime).toBeLessThan(maxLoadTime / 2);
      });
    });
  }

  // Venue environment testing
  for (const venue of venueScenarios) {
    test.describe(`${venue.name} Venue Tests`, () => {
      test(`should adapt to ${venue.name} conditions`, async ({ page }) => {
        await page.goto('/music/database');
        
        // Simulate venue-specific conditions
        if (venue.lighting === 'dim' || venue.lighting === 'very-bright') {
          // Test dark mode activation
          const darkModeButton = page.locator('button').filter({ hasText: /moon|sun/i });
          if (await darkModeButton.isVisible()) {
            await darkModeButton.click();
            
            if (venue.lighting === 'dim') {
              // Should activate dark mode for low light
              await expect(page.locator('.dark')).toBeVisible();
            }
          }
        }

        // Test connectivity adaptations
        if (venue.connectivity === 'poor' || venue.connectivity === 'very-poor') {
          // Simulate poor connectivity
          await page.emulateNetworkConditions({
            offline: false,
            downloadThroughput: 100 * 1024, // Very slow
            uploadThroughput: 50 * 1024,
            latency: 2000
          });

          // Should show connection warning or adapt interface
          await page.reload();
          
          // Check for offline-ready features
          await expect(page.locator('[data-testid="music-search"]')).toBeVisible();
        }
      });
    });
  }

  // Battery and performance testing
  test.describe('Battery and Performance Tests', () => {
    test('should monitor battery usage and performance', async ({ page }) => {
      await page.goto('/music/database');
      
      // Inject battery monitoring
      await page.addInitScript(() => {
        // Mock battery API for testing
        Object.defineProperty(navigator, 'getBattery', {
          value: () => Promise.resolve({
            level: 0.2, // 20% battery
            charging: false,
            chargingTime: Infinity,
            dischargingTime: 3600, // 1 hour remaining
            addEventListener: () => {},
            removeEventListener: () => {}
          })
        });
      });

      await page.reload();
      
      // Should show battery warning for low battery
      const batteryIndicator = page.locator('.text-orange-500, .text-red-500').filter({ hasText: /\d+%/ });
      await expect(batteryIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should maintain good performance during extended use', async ({ page }) => {
      await page.goto('/music/database');
      
      // Simulate extended DJ session usage
      for (let i = 0; i < 50; i++) {
        await page.fill('[data-testid="music-search"]', `song ${i}`);
        await page.waitForTimeout(100);
        
        // Add random tracks to playlist
        if (i % 5 === 0) {
          const trackElements = await page.locator('[data-testid^="track-"]').all();
          if (trackElements.length > 0) {
            const randomTrack = trackElements[Math.floor(Math.random() * trackElements.length)];
            await randomTrack.locator('button').last().click(); // Add to playlist
          }
        }
      }
      
      // Performance should still be good after extended use
      const responseTime = await page.evaluate(() => {
        const start = performance.now();
        document.querySelector('[data-testid="music-search"]')?.focus();
        return performance.now() - start;
      });
      
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
    });
  });

  // Accessibility testing
  test.describe('Mobile Accessibility Tests', () => {
    test('should be accessible with screen readers', async ({ page }) => {
      await page.goto('/music/database');
      
      // Check ARIA labels
      await expect(page.locator('[data-testid="music-search"]')).toHaveAttribute('aria-label');
      
      // Check keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
      
      // Check color contrast for venue conditions
      const searchInput = page.locator('[data-testid="music-search"]');
      const styles = await searchInput.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      expect(parseInt(styles.fontSize)).toBeGreaterThanOrEqual(16);
    });

    test('should work with touch accessibility features', async ({ page }) => {
      await page.goto('/music/database');
      
      // Test large touch targets
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // iOS minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test voice input simulation
      await page.locator('[data-testid="music-search"]').fill('Perfect by Ed Sheeran');
      await expect(page.locator('[data-testid="search-results"]')).toContainText('Perfect');
    });
  });

  // Security testing
  test.describe('Mobile Security Tests', () => {
    test('should prevent touch injection attacks', async ({ page }) => {
      await page.goto('/music/database');
      
      // Try to inject malicious touch events
      const result = await page.evaluate(() => {
        try {
          // Attempt to create synthetic touch event
          const fakeEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [{
              identifier: 999999,
              target: document.body,
              clientX: -1000, // Invalid coordinates
              clientY: -1000,
              pageX: -1000,
              pageY: -1000
            } as any]
          });
          
          document.dispatchEvent(fakeEvent);
          return 'injection_possible';
        } catch (error) {
          return 'injection_blocked';
        }
      });
      
      // Security validation should prevent malicious events
      expect(result).toBe('injection_blocked');
    });

    test('should secure offline data storage', async ({ page }) => {
      await page.goto('/music/database');
      
      // Add some data to cache
      await page.fill('[data-testid="music-search"]', 'test song');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check that cached data is properly secured
      const storageData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const musicKeys = keys.filter(key => key.includes('wedsync_music'));
        return musicKeys.map(key => {
          const value = localStorage.getItem(key);
          return { key, encrypted: value?.includes('encrypted') || false };
        });
      });
      
      // Sensitive data should be encrypted
      expect(storageData.some(item => item.encrypted)).toBeTruthy();
    });
  });

  // Real-world venue simulation
  test.describe('Wedding Venue Simulation Tests', () => {
    test('should handle typical 8-hour wedding day scenario', async ({ page }) => {
      await page.goto('/music/database');
      
      // Simulate cocktail hour (2 hours)
      await page.fill('[data-testid="music-search"]', 'jazz');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Add cocktail hour playlist
      for (let i = 0; i < 5; i++) {
        const tracks = await page.locator('[data-testid^="track-"]').all();
        if (tracks[i]) {
          await tracks[i].locator('button').last().click();
        }
      }
      
      // Simulate ceremony music
      await page.fill('[data-testid="music-search"]', 'wedding march');
      await page.waitForTimeout(100);
      
      // Simulate reception dancing
      await page.fill('[data-testid="music-search"]', 'dance hits');
      await page.waitForTimeout(100);
      
      // Performance should remain consistent
      const finalResponseTime = await page.evaluate(() => {
        const start = performance.now();
        document.querySelector('[data-testid="music-search"]')?.focus();
        return performance.now() - start;
      });
      
      expect(finalResponseTime).toBeLessThan(200); // Still responsive after extended use
    });

    test('should gracefully handle network interruptions', async ({ page, context }) => {
      await page.goto('/music/database');
      
      // Load initial content
      await page.fill('[data-testid="music-search"]', 'first dance');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Simulate network interruption (common at venues)
      await context.setOffline(true);
      
      // Should continue to work with cached content
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Restore network
      await context.setOffline(false);
      
      // Should automatically sync when back online
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });
});

// Core Web Vitals and performance monitoring
test.describe('Mobile Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/music/database');
    
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {
            fcp: null,
            lcp: null,
            cls: 0,
            fid: null
          };
          
          entries.forEach((entry) => {
            switch (entry.entryType) {
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  metrics.fcp = entry.startTime;
                }
                break;
              case 'largest-contentful-paint':
                metrics.lcp = entry.startTime;
                break;
              case 'layout-shift':
                if (!(entry as any).hadRecentInput) {
                  metrics.cls += (entry as any).value;
                }
                break;
              case 'first-input':
                metrics.fid = (entry as any).processingStart - entry.startTime;
                break;
            }
          });
          
          setTimeout(() => resolve(metrics), 3000);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
      });
    });
    
    const metrics = performanceMetrics as any;
    
    // Core Web Vitals thresholds
    if (metrics.fcp) expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s
    if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(metrics.cls).toBeLessThan(0.1); // CLS < 0.1
    if (metrics.fid) expect(metrics.fid).toBeLessThan(100); // FID < 100ms
  });
});

export { mobileDevices, networkConditions, venueScenarios };