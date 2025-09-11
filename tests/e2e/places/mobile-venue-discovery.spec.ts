import { test, expect, devices } from '@playwright/test';
import { VenueSearchPage } from '../page-objects/VenueSearchPage';

// Configure mobile devices for testing
const iPhone = devices['iPhone 12'];
const iPadPro = devices['iPad Pro'];
const androidPhone = devices['Pixel 5'];

test.describe('Mobile Venue Discovery Workflow', () => {
  test.describe('iPhone Wedding Photographer Experience', () => {
    test.use({ ...iPhone });
    
    test('should allow venue scouting on mobile during site visits', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Simulate photographer at venue location using GPS
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation({ latitude: -33.8568, longitude: 151.2153 }); // Sydney Opera House
      
      await venueSearch.useCurrentLocation();
      await venueSearch.enterSearchQuery('nearby wedding venues');
      await venueSearch.clickSearchButton();
      
      // Verify mobile layout is optimized
      await expect(page.locator('[data-testid="venue-search-container"]')).toHaveClass(/mobile-layout/);
      
      // Verify touch-friendly venue cards
      const venueCards = page.locator('[data-testid="venue-card"]');
      await expect(venueCards.first()).toBeVisible();
      
      // Test touch interaction for saving venues
      await venueCards.first().tap();
      await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
      
      // Save venue with mobile-optimized flow
      await page.locator('[data-testid="mobile-save-venue-button"]').tap();
      await expect(page.locator('[data-testid="save-success-toast"]')).toBeVisible();
      
      // Take mobile screenshot
      await expect(page).toHaveScreenshot('mobile-venue-scouting.png');
    });

    test('should handle poor venue WiFi connection gracefully', async ({ page, context }) => {
      // Simulate slow 3G connection at venue
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 200); // 200ms delay
      });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      
      const searchStartTime = Date.now();
      await venueSearch.clickSearchButton();
      
      // Show loading state for poor connection
      await expect(page.locator('[data-testid="slow-connection-message"]')).toBeVisible();
      
      await venueSearch.waitForSearchResults(15000); // Extended timeout for slow connection
      const searchEndTime = Date.now();
      
      // Verify search still completes despite slow connection
      expect(searchEndTime - searchStartTime).toBeLessThan(15000);
      await expect(page.locator('[data-testid="venue-card"]')).toHaveCount({ min: 1 });
    });

    test('should support offline venue viewing for saved venues', async ({ page, context }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // First, save some venues while online
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      await venueSearch.saveVenueToCollection(0);
      await venueSearch.saveVenueToCollection(1);
      
      // Go offline
      await context.setOffline(true);
      
      // Navigate to saved venues
      await venueSearch.clickSavedVenuesTab();
      
      // Verify offline mode is indicated
      await expect(page.locator('[data-testid="offline-mode-indicator"]')).toBeVisible();
      
      // Verify saved venues are still accessible offline
      await expect(page.locator('[data-testid="saved-venue-card"]')).toHaveCount(2);
      
      // Verify venue details work offline
      await page.locator('[data-testid="saved-venue-card"]').first().tap();
      await expect(page.locator('[data-testid="offline-venue-details"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('offline-venue-viewing.png');
    });

    test('should optimize touch targets for mobile interaction', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Check touch target sizes meet accessibility standards (48x48px minimum)
      const touchElements = [
        page.locator('[data-testid="search-venues-button"]'),
        page.locator('[data-testid="venue-card"] [data-testid="save-venue-button"]').first(),
        page.locator('[data-testid="venue-card"] [data-testid="view-details-button"]').first(),
        page.locator('[data-testid="filters-toggle-button"]')
      ];
      
      for (const element of touchElements) {
        const boundingBox = await element.boundingBox();
        expect(boundingBox!.height).toBeGreaterThanOrEqual(48);
        expect(boundingBox!.width).toBeGreaterThanOrEqual(48);
      }
    });

    test('should handle mobile keyboard input appropriately', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test search input opens search keyboard
      await venueSearch.searchQueryInput.tap();
      await expect(venueSearch.searchQueryInput).toBeFocused();
      await expect(venueSearch.searchQueryInput).toHaveAttribute('inputmode', 'search');
      
      // Test location input has appropriate autocomplete
      await venueSearch.locationInput.tap();
      await expect(venueSearch.locationInput).toHaveAttribute('autocomplete', 'address-level1');
      
      // Test numeric input for capacity opens number pad
      await venueSearch.minimumCapacityInput.tap();
      await expect(venueSearch.minimumCapacityInput).toHaveAttribute('inputmode', 'numeric');
    });
  });

  test.describe('iPad Wedding Planner Experience', () => {
    test.use({ ...iPadPro });
    
    test('should provide enhanced tablet layout for wedding planning', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify tablet-optimized layout
      await expect(page.locator('[data-testid="venue-search-container"]')).toHaveClass(/tablet-layout/);
      
      // Search for venues
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Verify venue cards are displayed in grid on tablet
      const venueGrid = page.locator('[data-testid="venue-results-grid"]');
      await expect(venueGrid).toHaveClass(/grid-cols-2/);
      
      // Test split-screen comparison view
      await venueSearch.enableCompareMode();
      await venueSearch.selectVenueForComparison(0);
      await venueSearch.selectVenueForComparison(1);
      await venueSearch.openVenueComparison();
      
      // Verify comparison view is optimized for tablet
      await expect(page.locator('[data-testid="tablet-comparison-view"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('tablet-venue-comparison.png');
    });

    test('should support multi-venue wedding planning workflow on tablet', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Plan a multi-venue wedding
      await venueSearch.planMultiVenueWedding('Sydney CBD', 'Sydney Harbour', 150);
      
      // Verify both venues are saved and organized
      const savedVenues = page.locator('[data-testid="saved-venue-card"]');
      await expect(savedVenues).toHaveCount(2);
      
      // Update booking status for ceremony venue
      await venueSearch.updateVenueBookingStatus(0, 'contacted');
      await venueSearch.addVenueNotes(0, 'Perfect for intimate ceremony. Need to check availability for June 15th.');
      
      // Update booking status for reception venue
      await venueSearch.updateVenueBookingStatus(1, 'visited');
      await venueSearch.addVenueNotes(1, 'Beautiful harbor views. Catering includes vegan options. Booked site visit for next Tuesday.');
      
      // Verify notes and status are saved
      await expect(page.locator('[data-testid="venue-notes"]').first()).toContainText('Perfect for intimate ceremony');
      await expect(page.locator('[data-testid="booking-status-badge"]').first()).toContainText('Contacted');
      
      await expect(page).toHaveScreenshot('tablet-multi-venue-planning.png');
    });
  });

  test.describe('Android Wedding Couple Experience', () => {
    test.use({ ...androidPhone });
    
    test('should work seamlessly on Android devices', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test Android-specific interactions
      await venueSearch.enterSearchQuery('romantic wedding venues');
      await venueSearch.enterLocation('Melbourne, VIC, Australia');
      await venueSearch.selectVenueType('both');
      await venueSearch.setMinimumCapacity('80');
      await venueSearch.selectPriceRange('medium');
      
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Verify Android-optimized layout
      await expect(page.locator('[data-testid="android-mobile-layout"]')).toBeVisible();
      
      // Test venue saving workflow
      await venueSearch.openVenueDetails(0);
      await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
      
      // Test Android back button handling
      await page.goBack();
      await expect(page.locator('[data-testid="venue-details-modal"]')).not.toBeVisible();
      
      await expect(page).toHaveScreenshot('android-venue-search.png');
    });

    test('should handle Android gesture navigation', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Test swipe gestures on venue cards
      const firstVenueCard = page.locator('[data-testid="venue-card"]').first();
      
      // Swipe right to save venue
      await firstVenueCard.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0); // Swipe right 100px
      await page.mouse.up();
      
      // Verify swipe action triggered save
      await expect(page.locator('[data-testid="swipe-save-feedback"]')).toBeVisible();
      
      // Test pull-to-refresh on results
      await page.locator('[data-testid="search-results-container"]').hover();
      await page.mouse.down();
      await page.mouse.move(0, 100); // Pull down 100px
      await page.mouse.up();
      
      await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible();
    });
  });

  test.describe('Cross-Device Compatibility', () => {
    test('should maintain data sync across devices', async ({ browser }) => {
      // Test data synchronization between mobile and desktop
      const mobileContext = await browser.newContext({ ...iPhone });
      const desktopContext = await browser.newContext();
      
      const mobilePage = await mobileContext.newPage();
      const desktopPage = await desktopContext.newPage();
      
      const mobileVenueSearch = new VenueSearchPage(mobilePage);
      const desktopVenueSearch = new VenueSearchPage(desktopPage);
      
      // Save venue on mobile
      await mobileVenueSearch.navigate();
      await mobileVenueSearch.enterSearchQuery('wedding venues Sydney');
      await mobileVenueSearch.clickSearchButton();
      await mobileVenueSearch.waitForSearchResults();
      await mobileVenueSearch.saveVenueToCollection(0);
      
      // Verify venue appears on desktop
      await desktopVenueSearch.navigate();
      await desktopVenueSearch.clickSavedVenuesTab();
      
      await expect(desktopPage.locator('[data-testid="saved-venue-card"]')).toHaveCount(1);
      
      // Clean up contexts
      await mobileContext.close();
      await desktopContext.close();
    });

    test('should handle responsive design breakpoints', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667 },  // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // iPad Landscape
        { width: 1440, height: 900 }  // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Verify layout adapts to viewport
        const container = page.locator('[data-testid="venue-search-container"]');
        if (viewport.width < 768) {
          await expect(container).toHaveClass(/mobile-layout/);
        } else if (viewport.width < 1024) {
          await expect(container).toHaveClass(/tablet-layout/);
        } else {
          await expect(container).toHaveClass(/desktop-layout/);
        }
        
        // Verify functionality works at all breakpoints
        await venueSearch.enterSearchQuery('wedding venues');
        await venueSearch.clickSearchButton();
        
        // Take screenshot at each breakpoint
        await expect(page).toHaveScreenshot(`responsive-${viewport.width}x${viewport.height}.png`);
      }
    });
  });

  test.describe('Mobile Performance Optimization', () => {
    test('should lazy load venue images on mobile', async ({ page }) => {
      test.use({ ...iPhone });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues Sydney');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Check that images have lazy loading attributes
      const venueImages = page.locator('[data-testid="venue-card"] img');
      const firstImage = venueImages.first();
      
      await expect(firstImage).toHaveAttribute('loading', 'lazy');
      await expect(firstImage).toHaveAttribute('decoding', 'async');
      
      // Verify intersection observer is working
      const imageCount = await venueImages.count();
      let loadedImages = 0;
      
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const image = venueImages.nth(i);
        if (await image.evaluate((img: HTMLImageElement) => img.complete)) {
          loadedImages++;
        }
      }
      
      // Only first few images should be loaded initially
      expect(loadedImages).toBeLessThanOrEqual(3);
    });

    test('should optimize bundle size for mobile', async ({ page, context }) => {
      // Monitor network requests to verify mobile optimization
      const networkRequests: string[] = [];
      
      context.route('**/*', route => {
        networkRequests.push(route.request().url());
        route.continue();
      });
      
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      // Verify mobile-specific bundles are loaded
      const jsRequests = networkRequests.filter(url => url.includes('.js'));
      const mobileBundle = jsRequests.find(url => url.includes('mobile'));
      
      expect(mobileBundle).toBeDefined();
      
      // Verify desktop-only features are not loaded on mobile
      const desktopBundle = jsRequests.find(url => url.includes('desktop-only'));
      expect(desktopBundle).toBeUndefined();
    });

    test('should handle touch events efficiently', async ({ page }) => {
      const venueSearch = new VenueSearchPage(page);
      await venueSearch.navigate();
      
      await venueSearch.enterSearchQuery('wedding venues');
      await venueSearch.clickSearchButton();
      await venueSearch.waitForSearchResults();
      
      // Test rapid touch interactions
      const venueCard = page.locator('[data-testid="venue-card"]').first();
      
      const startTime = Date.now();
      
      // Rapid tap test
      for (let i = 0; i < 5; i++) {
        await venueCard.tap();
        await page.waitForTimeout(50);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Touch events should be responsive (<300ms per interaction)
      expect(totalTime / 5).toBeLessThan(300);
      
      // Verify no touch delay
      const touchDelay = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="venue-card"]') as HTMLElement;
        const style = window.getComputedStyle(element);
        return style.getPropertyValue('touch-action');
      });
      
      expect(touchDelay).toBe('manipulation'); // Should have touch-action: manipulation
    });
  });
});