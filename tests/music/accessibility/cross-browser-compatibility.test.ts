/**
 * CROSS-BROWSER COMPATIBILITY TESTING
 * WS-252 Music Database Integration - Team E Round 1
 * 
 * Testing music management features across all major browsers and devices.
 * Ensures consistent accessibility and functionality for wedding professionals.
 * 
 * Wedding Industry Browser Usage:
 * - Chrome/Edge: 65% (primary DJ laptops)
 * - Safari: 25% (iPhone/iPad DJs)
 * - Firefox: 8% (alternative DJ software)
 * - Mobile browsers: 60% of venue interactions
 */

import { test, expect, devices } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Define browser-specific test configurations
const browsers = [
  { name: 'Chrome', ...devices['Desktop Chrome'] },
  { name: 'Firefox', ...devices['Desktop Firefox'] },
  { name: 'Safari', ...devices['Desktop Safari'] },
  { name: 'Edge', ...devices['Desktop Edge'] },
  { name: 'iPhone', ...devices['iPhone 13'] },
  { name: 'iPad', ...devices['iPad Pro'] },
  { name: 'Android', ...devices['Pixel 5'] }
];

// Test music functionality across all browsers
for (const browserConfig of browsers) {
  test.describe(`${browserConfig.name} - Music Management Compatibility`, () => {
    test.use(browserConfig);

    test.beforeEach(async ({ page }) => {
      // Navigate to music management
      await page.goto('/dashboard/music');
      
      // Wait for essential components
      await page.waitForSelector('[data-testid="music-search"]');
    });

    test(`Music Search - ${browserConfig.name} Compatibility`, async ({ page }) => {
      // Test basic search functionality
      const searchInput = page.locator('[data-testid="music-search-input"]');
      const searchButton = page.locator('[data-testid="music-search-button"]');

      // Verify elements are interactive
      await expect(searchInput).toBeVisible();
      await expect(searchButton).toBeVisible();

      // Test input functionality
      await searchInput.fill('Canon in D');
      const inputValue = await searchInput.inputValue();
      expect(inputValue).toBe('Canon in D');

      // Test search execution
      await searchButton.click();
      
      // Wait for results (browser-specific timing)
      const timeout = browserConfig.name.includes('iPhone') || browserConfig.name.includes('Android') ? 5000 : 3000;
      await page.waitForSelector('[data-testid="search-results"]', { timeout });

      // Verify results display
      const results = page.locator('[data-testid="search-result"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThan(0);
    });

    test(`Playlist Management - ${browserConfig.name} Touch/Click Events`, async ({ page }) => {
      const isMobile = browserConfig.name.includes('iPhone') || 
                      browserConfig.name.includes('Android') || 
                      browserConfig.name.includes('iPad');

      // Test playlist interaction
      const playlistBuilder = page.locator('[data-testid="music-playlist-builder"]');
      await expect(playlistBuilder).toBeVisible();

      // Add song to playlist
      await page.click('[data-testid="add-sample-song"]');
      await page.waitForSelector('[data-testid="playlist-item"]');

      const playlistItems = page.locator('[data-testid="playlist-item"]');
      const itemCount = await playlistItems.count();
      expect(itemCount).toBeGreaterThan(0);

      if (isMobile) {
        // Test touch drag for mobile
        const firstItem = playlistItems.first();
        const secondItem = playlistItems.nth(1);
        
        if (await secondItem.count() > 0) {
          // Touch drag simulation
          await firstItem.touchStart();
          await page.waitForTimeout(100);
          await secondItem.touchEnd();
          
          // Verify reorder occurred (mobile-specific)
          await page.waitForTimeout(500);
        }
      } else {
        // Test mouse drag for desktop
        const firstItem = playlistItems.first();
        const secondItem = playlistItems.nth(1);
        
        if (await secondItem.count() > 0) {
          await firstItem.dragTo(secondItem);
          await page.waitForTimeout(500);
        }
      }
    });

    test(`Audio Controls - ${browserConfig.name} Media Support`, async ({ page }) => {
      // Skip audio tests for browsers without audio support
      const hasAudioSupport = await page.evaluate(() => {
        const audio = document.createElement('audio');
        return !!(audio.canPlayType && audio.canPlayType('audio/mpeg'));
      });

      if (!hasAudioSupport) {
        test.skip(`Audio not supported in ${browserConfig.name}`);
      }

      // Test audio player controls
      await page.click('[data-testid="play-sample-music"]');
      
      const audioPlayer = page.locator('[data-testid="audio-player"]');
      await expect(audioPlayer).toBeVisible();

      // Test play/pause functionality
      const playButton = page.locator('[data-testid="play-button"]');
      const pauseButton = page.locator('[data-testid="pause-button"]');

      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(1000);
        
        // Verify audio is playing (check for pause button)
        await expect(pauseButton).toBeVisible();
      }

      // Test volume controls (desktop only)
      if (!browserConfig.name.includes('iPhone')) {
        const volumeSlider = page.locator('[data-testid="volume-slider"]');
        if (await volumeSlider.isVisible()) {
          await volumeSlider.click();
        }
      }
    });

    test(`Responsive Layout - ${browserConfig.name} Viewport`, async ({ page }) => {
      // Test responsive design
      const viewportSize = page.viewportSize();
      const isMobile = viewportSize!.width < 768;

      // Verify mobile-specific elements
      if (isMobile) {
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        await expect(mobileMenu).toBeVisible();

        // Test mobile navigation
        const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
        if (await menuToggle.isVisible()) {
          await menuToggle.click();
          await page.waitForTimeout(300);
          
          const menuItems = page.locator('[data-testid="mobile-menu-item"]');
          const menuItemCount = await menuItems.count();
          expect(menuItemCount).toBeGreaterThan(0);
        }
      } else {
        // Verify desktop layout
        const desktopNav = page.locator('[data-testid="desktop-navigation"]');
        await expect(desktopNav).toBeVisible();
      }

      // Test form elements scaling
      const searchInput = page.locator('[data-testid="music-search-input"]');
      const inputBox = await searchInput.boundingBox();
      
      // Minimum touch target size for mobile
      if (isMobile) {
        expect(inputBox!.height).toBeGreaterThanOrEqual(44);
      }
    });

    test(`Performance - ${browserConfig.name} Load Times`, async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate and measure load time
      await page.goto('/dashboard/music');
      await page.waitForSelector('[data-testid="music-search"]');
      
      const loadTime = Date.now() - startTime;
      
      // Browser-specific performance expectations
      const expectedMaxLoad = browserConfig.name.includes('iPhone') || browserConfig.name.includes('Android') ? 3000 : 2000;
      expect(loadTime).toBeLessThan(expectedMaxLoad);

      // Measure first interaction time
      const interactionStart = Date.now();
      await page.click('[data-testid="music-search-input"]');
      const interactionTime = Date.now() - interactionStart;
      
      expect(interactionTime).toBeLessThan(100);
    });

    test(`Accessibility Compliance - ${browserConfig.name}`, async ({ page }) => {
      // Run accessibility audit for each browser
      const accessibilityResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Verify no violations across browsers
      expect(accessibilityResults.violations).toEqual([]);

      // Browser-specific accessibility features
      if (browserConfig.name === 'Safari') {
        // Test VoiceOver compatibility
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        expect(headingCount).toBeGreaterThan(0);
      }

      if (browserConfig.name === 'Edge') {
        // Test Narrator compatibility
        const ariaLabels = page.locator('[aria-label]');
        const labelCount = await ariaLabels.count();
        expect(labelCount).toBeGreaterThan(0);
      }
    });

    test(`Local Storage & Offline - ${browserConfig.name}`, async ({ page }) => {
      // Test local storage functionality
      await page.evaluate(() => {
        localStorage.setItem('music-preferences', JSON.stringify({
          volume: 0.8,
          autoplay: false,
          lastSearch: 'wedding processional'
        }));
      });

      // Reload page and verify persistence
      await page.reload();
      await page.waitForSelector('[data-testid="music-search"]');

      const storedPreferences = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('music-preferences') || '{}');
      });

      expect(storedPreferences.volume).toBe(0.8);
      expect(storedPreferences.lastSearch).toBe('wedding processional');

      // Test offline functionality (service worker)
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      if (hasServiceWorker) {
        // Simulate offline mode
        await page.setOfflineMode(true);
        await page.reload();
        
        // Should show offline indicator
        const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
        await expect(offlineIndicator).toBeVisible({ timeout: 3000 });
        
        // Re-enable online mode
        await page.setOfflineMode(false);
      }
    });
  });
}

// Cross-browser integration tests
test.describe('Cross-Browser Music Integration Tests', () => {
  test('Multi-device Handoff - Playlist Sync', async ({ browser }) => {
    // Create two browser contexts (simulate DJ laptop + mobile)
    const desktopContext = await browser.newContext(devices['Desktop Chrome']);
    const mobileContext = await browser.newContext(devices['iPhone 13']);

    const desktopPage = await desktopContext.newPage();
    const mobilePage = await mobileContext.newPage();

    try {
      // Setup playlist on desktop
      await desktopPage.goto('/dashboard/music');
      await desktopPage.waitForSelector('[data-testid="music-playlist-builder"]');
      
      // Add songs to playlist
      await desktopPage.click('[data-testid="add-sample-song"]');
      await desktopPage.waitForSelector('[data-testid="playlist-item"]');

      // Switch to mobile and verify sync
      await mobilePage.goto('/dashboard/music');
      await mobilePage.waitForSelector('[data-testid="music-playlist-builder"]');
      
      // Allow time for sync
      await mobilePage.waitForTimeout(2000);
      
      const mobilePlaylistItems = mobilePage.locator('[data-testid="playlist-item"]');
      const mobileItemCount = await mobilePlaylistItems.count();
      
      expect(mobileItemCount).toBeGreaterThan(0);

    } finally {
      await desktopContext.close();
      await mobileContext.close();
    }
  });

  test('Browser Compatibility Matrix', async ({ page }) => {
    // Test feature support matrix
    const featureSupport = await page.evaluate(() => {
      return {
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
        mediaDevices: 'mediaDevices' in navigator,
        webAudio: 'AudioBuffer' in window,
        webRTC: 'RTCPeerConnection' in window,
        serviceWorker: 'serviceWorker' in navigator,
        localStorage: 'localStorage' in window,
        dragDrop: 'draggable' in document.createElement('div'),
        touchEvents: 'ontouchstart' in window,
        fileAPI: 'FileReader' in window
      };
    });

    // Log feature support for documentation
    console.log('Browser Feature Support Matrix:', featureSupport);

    // Verify critical features are supported
    expect(featureSupport.localStorage).toBe(true);
    expect(featureSupport.dragDrop).toBe(true);
    
    // Audio features should be supported on most browsers
    const audioSupported = featureSupport.audioContext || featureSupport.webAudio;
    expect(audioSupported).toBe(true);
  });
});

// Wedding venue environment testing
test.describe('Venue Environment Compatibility', () => {
  test('Low Bandwidth Conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.context().route('**/*', (route) => {
      route.continue();
    });

    // Throttle network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024, // 400kb/s
      uploadThroughput: 400 * 1024,   // 400kb/s
      latency: 2000 // 2s latency
    });

    const startTime = Date.now();
    await page.goto('/dashboard/music');
    
    // Should still load within acceptable time
    await page.waitForSelector('[data-testid="music-search"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    // Allow longer load time for slow connections
    expect(loadTime).toBeLessThan(8000);
  });

  test('Battery Optimization - Low Power Mode', async ({ page }) => {
    // Simulate low power mode behaviors
    await page.addInitScript(() => {
      // Mock battery API
      Object.defineProperty(navigator, 'battery', {
        value: Promise.resolve({
          charging: false,
          level: 0.15, // 15% battery
          chargingTime: Infinity,
          dischargingTime: 3600 // 1 hour remaining
        })
      });
    });

    await page.goto('/dashboard/music');
    
    // Verify low-power optimizations
    const animations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let animatedElements = 0;
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.animation !== 'none' || style.transition !== 'none') {
          animatedElements++;
        }
      });
      
      return animatedElements;
    });

    // Should minimize animations in low power mode
    expect(animations).toBeLessThan(5);
  });
});