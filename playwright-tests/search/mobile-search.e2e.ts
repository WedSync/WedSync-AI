import { test, expect, Page, BrowserContext } from '@playwright/test';
import { devices } from '@playwright/test';

// Mobile device configurations for testing
const MOBILE_DEVICES = {
  iPhoneSE: devices['iPhone SE'],
  iPhone12: devices['iPhone 12'],
  iPhone14Pro: devices['iPhone 14 Pro'],
  galaxyS21: devices['Galaxy S21'],
  pixel5: devices['Pixel 5']
};

// Test data for mobile search scenarios
const TEST_SEARCHES = {
  simple: 'wedding photographer',
  location: 'wedding venue New York',
  complex: 'luxury wedding photographer Manhattan under 5000',
  voice: 'find wedding florist near me',
  misspelled: 'weding photgrapher'
};

// Utility functions for mobile testing
async function setupMobileViewport(page: Page, device: string = 'iPhone 12') {
  const deviceConfig = MOBILE_DEVICES[device as keyof typeof MOBILE_DEVICES];
  if (deviceConfig) {
    await page.setViewportSize(deviceConfig.viewport);
    await page.setUserAgent(deviceConfig.userAgent);
  }
}

async function waitForSearchResults(page: Page, timeout = 5000) {
  await page.waitForSelector('[data-testid="search-results"]', { timeout });
  await page.waitForFunction(() => {
    const results = document.querySelector('[data-testid="search-results"]');
    return results && results.children.length > 0;
  }, { timeout });
}

async function performSearch(page: Page, query: string) {
  await page.fill('[data-testid="search-input"]', query);
  await page.press('[data-testid="search-input"]', 'Enter');
  await waitForSearchResults(page);
}

// Test configuration for mobile
test.describe('WS-248: Mobile Search Experience', () => {
  test.beforeEach(async ({ page }) => {
    await setupMobileViewport(page);
    await page.goto('/search');
  });

  test.describe('Mobile UI/UX Tests', () => {
    test('should display mobile-optimized search interface on iPhone SE', async ({ page }) => {
      await setupMobileViewport(page, 'iPhoneSE');
      await page.goto('/search');

      // Check search input is properly sized for small screens
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();
      
      const inputBox = await searchInput.boundingBox();
      expect(inputBox?.width).toBeGreaterThan(300); // Minimum touch-friendly width
      expect(inputBox?.height).toBeGreaterThan(44); // Minimum touch target height
      
      // Check mobile-specific UI elements
      await expect(page.locator('[data-testid="mobile-search-filters"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-sort-button"]')).toBeVisible();
    });

    test('should have touch-friendly search buttons and controls', async ({ page }) => {
      await setupMobileViewport(page, 'iPhone12');
      
      // Check touch targets meet accessibility guidelines (minimum 44x44px)
      const searchButton = page.locator('[data-testid="search-button"]');
      const filterButton = page.locator('[data-testid="filter-toggle"]');
      const sortButton = page.locator('[data-testid="sort-button"]');

      const searchBox = await searchButton.boundingBox();
      const filterBox = await filterButton.boundingBox();
      const sortBox = await sortButton.boundingBox();

      expect(searchBox?.width).toBeGreaterThanOrEqual(44);
      expect(searchBox?.height).toBeGreaterThanOrEqual(44);
      expect(filterBox?.width).toBeGreaterThanOrEqual(44);
      expect(filterBox?.height).toBeGreaterThanOrEqual(44);
      expect(sortBox?.width).toBeGreaterThanOrEqual(44);
      expect(sortBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should display search results in mobile-optimized cards', async ({ page }) => {
      await performSearch(page, TEST_SEARCHES.simple);

      // Check result cards are properly formatted for mobile
      const resultCards = page.locator('[data-testid="vendor-card"]');
      await expect(resultCards.first()).toBeVisible();

      const cardBox = await resultCards.first().boundingBox();
      const viewport = page.viewportSize();
      
      // Card should take most of screen width with proper margins
      expect(cardBox?.width).toBeGreaterThan((viewport?.width || 375) * 0.85);
      
      // Check mobile-specific card elements
      await expect(resultCards.first().locator('[data-testid="vendor-image"]')).toBeVisible();
      await expect(resultCards.first().locator('[data-testid="vendor-rating"]')).toBeVisible();
      await expect(resultCards.first().locator('[data-testid="vendor-location"]')).toBeVisible();
      await expect(resultCards.first().locator('[data-testid="contact-button"]')).toBeVisible();
    });

    test('should handle mobile gestures for filtering and sorting', async ({ page }) => {
      await performSearch(page, TEST_SEARCHES.location);

      // Test filter drawer functionality
      await page.click('[data-testid="filter-toggle"]');
      await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible();

      // Test swipe gestures (simulated with touch events)
      const filterDrawer = page.locator('[data-testid="mobile-filter-drawer"]');
      await filterDrawer.dragTo(page.locator('body'), { targetPosition: { x: 50, y: 300 } });
      
      // Drawer should remain open for partial swipe
      await expect(filterDrawer).toBeVisible();

      // Close drawer with close button
      await page.click('[data-testid="filter-close-button"]');
      await expect(filterDrawer).not.toBeVisible();
    });
  });

  test.describe('Mobile Search Performance', () => {
    test('should load search results within 2 seconds on 3G network', async ({ page, context }) => {
      // Simulate slow 3G network
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      const startTime = Date.now();
      await performSearch(page, TEST_SEARCHES.simple);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000); // 2 second requirement for mobile
    });

    test('should maintain 60fps scrolling through search results', async ({ page }) => {
      await performSearch(page, TEST_SEARCHES.location);

      // Generate many results for scroll testing
      await page.evaluate(() => {
        // Mock additional results for scrolling
        const container = document.querySelector('[data-testid="search-results"]');
        if (container) {
          for (let i = 0; i < 50; i++) {
            const card = document.createElement('div');
            card.className = 'vendor-card';
            card.setAttribute('data-testid', 'vendor-card');
            card.innerHTML = `<div>Vendor ${i}</div>`;
            container.appendChild(card);
          }
        }
      });

      // Test smooth scrolling performance
      let frameCount = 0;
      const startTime = performance.now();

      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let frames = 0;
          function countFrames() {
            frames++;
            if (frames < 60) {
              requestAnimationFrame(countFrames);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(countFrames);
          
          // Simulate scrolling
          window.scrollTo({ top: 1000, behavior: 'smooth' });
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      const fps = 60000 / duration;

      expect(fps).toBeGreaterThan(55); // Allow slight tolerance for 60fps
    });

    test('should handle rapid search queries without performance degradation', async ({ page }) => {
      const queries = ['wedding', 'wedding photo', 'wedding photographer', 'wedding photographer ny'];
      const searchTimes: number[] = [];

      for (const query of queries) {
        const startTime = Date.now();
        await page.fill('[data-testid="search-input"]', '');
        await page.fill('[data-testid="search-input"]', query);
        await page.press('[data-testid="search-input"]', 'Enter');
        await waitForSearchResults(page);
        const searchTime = Date.now() - startTime;
        searchTimes.push(searchTime);

        // Wait briefly between searches
        await page.waitForTimeout(200);
      }

      // Performance should remain consistent or improve (due to caching)
      const firstSearch = searchTimes[0];
      const lastSearch = searchTimes[searchTimes.length - 1];
      
      expect(lastSearch).toBeLessThan(firstSearch * 1.5); // Allow some degradation but not more than 50%
      searchTimes.forEach(time => {
        expect(time).toBeLessThan(1500); // All searches under 1.5s
      });
    });
  });

  test.describe('Mobile Search Functionality', () => {
    test('should support voice search input on supported browsers', async ({ page, browserName }) => {
      // Skip on Firefox as it has limited Web Speech API support
      test.skip(browserName === 'firefox', 'Voice search not supported in Firefox');

      await expect(page.locator('[data-testid="voice-search-button"]')).toBeVisible();
      
      // Mock voice search functionality
      await page.evaluate(() => {
        (window as any).webkitSpeechRecognition = class {
          onresult = null;
          onerror = null;
          onstart = null;
          onend = null;
          
          start() {
            setTimeout(() => {
              if (this.onstart) this.onstart();
              setTimeout(() => {
                if (this.onresult) {
                  this.onresult({
                    results: [[{ transcript: 'wedding photographer' }]]
                  });
                }
                if (this.onend) this.onend();
              }, 500);
            }, 100);
          }
          
          stop() {}
        };
      });

      await page.click('[data-testid="voice-search-button"]');
      await page.waitForTimeout(1000);

      const searchValue = await page.inputValue('[data-testid="search-input"]');
      expect(searchValue).toBe('wedding photographer');
    });

    test('should provide search suggestions on mobile keyboards', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Type partial query
      await searchInput.fill('wedding pho');
      
      // Check for autocomplete dropdown
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      
      const suggestions = page.locator('[data-testid="suggestion-item"]');
      await expect(suggestions).toHaveCount.greaterThan(0);
      
      // Tap on first suggestion
      await suggestions.first().click();
      
      const finalValue = await searchInput.inputValue();
      expect(finalValue).toContain('wedding pho');
      expect(finalValue.length).toBeGreaterThan('wedding pho'.length);
    });

    test('should handle location-based search on mobile devices', async ({ page, context }) => {
      // Mock geolocation API
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 }); // New York

      await page.click('[data-testid="location-search-button"]');
      await page.waitForTimeout(500);

      // Should detect current location
      const locationInput = page.locator('[data-testid="location-input"]');
      const locationValue = await locationInput.inputValue();
      expect(locationValue).toContain('New York'); // Should detect NYC

      // Perform location-based search
      await performSearch(page, 'wedding photographer');

      // Results should prioritize local vendors
      const firstResult = page.locator('[data-testid="vendor-card"]').first();
      const location = await firstResult.locator('[data-testid="vendor-location"]').textContent();
      expect(location).toContain('NY');
    });

    test('should support offline search functionality', async ({ page, context }) => {
      // First load with network
      await performSearch(page, TEST_SEARCHES.simple);
      await waitForSearchResults(page);

      // Go offline
      await context.setOffline(true);

      // Perform cached search
      await page.fill('[data-testid="search-input"]', '');
      await performSearch(page, TEST_SEARCHES.simple);

      // Should show cached results or offline message
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      const cachedResults = page.locator('[data-testid="search-results"]');

      // Either offline indicator should be visible OR cached results should load
      await expect(offlineIndicator.or(cachedResults)).toBeVisible();
    });
  });

  test.describe('Mobile Search Accessibility', () => {
    test('should support screen reader navigation', async ({ page }) => {
      // Check ARIA labels and roles
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toHaveAttribute('aria-label');
      await expect(searchInput).toHaveAttribute('role', 'searchbox');

      const searchButton = page.locator('[data-testid="search-button"]');
      await expect(searchButton).toHaveAttribute('aria-label');

      // Perform search and check results accessibility
      await performSearch(page, TEST_SEARCHES.simple);

      const resultsContainer = page.locator('[data-testid="search-results"]');
      await expect(resultsContainer).toHaveAttribute('aria-live');
      await expect(resultsContainer).toHaveAttribute('role', 'region');

      const resultCards = page.locator('[data-testid="vendor-card"]');
      const firstCard = resultCards.first();
      await expect(firstCard).toHaveAttribute('role', 'article');
      await expect(firstCard).toHaveAttribute('tabindex');
    });

    test('should support keyboard navigation on mobile', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Focus search input
      await searchInput.focus();
      
      // Type and navigate with keyboard
      await page.keyboard.type('wedding photographer');
      await page.keyboard.press('Tab');
      
      // Should focus on search button
      const searchButton = page.locator('[data-testid="search-button"]');
      await expect(searchButton).toBeFocused();
      
      await page.keyboard.press('Enter');
      await waitForSearchResults(page);

      // Tab through results
      await page.keyboard.press('Tab');
      const firstResult = page.locator('[data-testid="vendor-card"]').first();
      await expect(firstResult).toBeFocused();

      await page.keyboard.press('Tab');
      const contactButton = firstResult.locator('[data-testid="contact-button"]');
      await expect(contactButton).toBeFocused();
    });

    test('should provide high contrast mode support', async ({ page }) => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      await performSearch(page, TEST_SEARCHES.simple);

      // Check critical elements are visible in high contrast
      const searchInput = page.locator('[data-testid="search-input"]');
      const searchButton = page.locator('[data-testid="search-button"]');
      const resultCards = page.locator('[data-testid="vendor-card"]');

      await expect(searchInput).toBeVisible();
      await expect(searchButton).toBeVisible();
      await expect(resultCards.first()).toBeVisible();

      // Check text contrast
      const textElement = resultCards.first().locator('[data-testid="vendor-name"]');
      await expect(textElement).toBeVisible();
    });
  });

  test.describe('Cross-Device Mobile Testing', () => {
    test('should work consistently across different mobile devices', async ({ browser }) => {
      const devices = ['iPhoneSE', 'iPhone12', 'galaxyS21', 'pixel5'];
      
      for (const deviceName of devices) {
        const context = await browser.newContext({
          ...MOBILE_DEVICES[deviceName as keyof typeof MOBILE_DEVICES]
        });
        const page = await context.newPage();
        
        await page.goto('/search');
        await performSearch(page, TEST_SEARCHES.simple);

        // Basic functionality should work on all devices
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
        const resultCards = page.locator('[data-testid="vendor-card"]');
        await expect(resultCards).toHaveCount.greaterThan(0);

        await context.close();
      }
    });

    test('should handle different mobile orientations', async ({ page }) => {
      // Portrait mode
      await setupMobileViewport(page, 'iPhone12');
      await performSearch(page, TEST_SEARCHES.simple);
      
      const portraitResultsCount = await page.locator('[data-testid="vendor-card"]').count();
      expect(portraitResultsCount).toBeGreaterThan(0);

      // Landscape mode
      await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
      await page.reload();
      await performSearch(page, TEST_SEARCHES.simple);

      const landscapeResultsCount = await page.locator('[data-testid="vendor-card"]').count();
      expect(landscapeResultsCount).toBeGreaterThan(0);

      // Results should be consistent between orientations
      expect(landscapeResultsCount).toBe(portraitResultsCount);
    });

    test('should handle mobile browser variations', async ({ browserName, page }) => {
      await performSearch(page, TEST_SEARCHES.complex);
      
      // Core functionality should work regardless of browser
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      const resultCards = page.locator('[data-testid="vendor-card"]');
      await expect(resultCards).toHaveCount.greaterThan(0);

      // Check browser-specific features
      if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page.locator('[data-testid="voice-search-button"]')).toBeVisible();
      } else if (browserName === 'chromium') {
        // Chrome-specific tests
        await expect(page.locator('[data-testid="location-search-button"]')).toBeVisible();
      }
    });
  });

  test.describe('Mobile Error Handling', () => {
    test('should display mobile-friendly error messages', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/search**', route => route.abort());

      await page.fill('[data-testid="search-input"]', TEST_SEARCHES.simple);
      await page.press('[data-testid="search-input"]', 'Enter');

      // Check for mobile-optimized error message
      await expect(page.locator('[data-testid="mobile-error-message"]')).toBeVisible();
      
      const errorMessage = page.locator('[data-testid="mobile-error-message"]');
      const errorBox = await errorMessage.boundingBox();
      const viewport = page.viewportSize();
      
      // Error message should be properly sized for mobile
      expect(errorBox?.width).toBeLessThan((viewport?.width || 375) * 0.9);
    });

    test('should handle slow network connections gracefully', async ({ page, context }) => {
      // Simulate very slow network
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.continue();
      });

      await page.fill('[data-testid="search-input"]', TEST_SEARCHES.simple);
      await page.press('[data-testid="search-input"]', 'Enter');

      // Should show loading indicator
      await expect(page.locator('[data-testid="mobile-loading-spinner"]')).toBeVisible();
      
      // Should eventually load results or show timeout message
      await expect(
        page.locator('[data-testid="search-results"]')
          .or(page.locator('[data-testid="timeout-message"]'))
      ).toBeVisible({ timeout: 10000 });
    });
  });
});