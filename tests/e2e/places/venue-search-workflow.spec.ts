import { test, expect, Page, BrowserContext } from '@playwright/test';
import { VenueSearchPage } from '../page-objects/VenueSearchPage';

test.describe('Google Places Venue Search Workflow', () => {
  let venueSearchPage: VenueSearchPage;

  test.beforeEach(async ({ page }) => {
    venueSearchPage = new VenueSearchPage(page);
    await venueSearchPage.navigate();
  });

  test('should complete full wedding venue search workflow', async ({ page }) => {
    // Step 1: Enter search criteria for wedding venues
    await venueSearchPage.enterSearchQuery('wedding venues Sydney');
    await venueSearchPage.enterLocation('Sydney, NSW, Australia');
    
    // Step 2: Apply wedding-specific filters
    await venueSearchPage.selectVenueType('both'); // Ceremony and reception
    await venueSearchPage.setMinimumCapacity('150'); // Guest count
    await venueSearchPage.selectPriceRange('medium'); // Budget range
    
    // Step 3: Execute search
    await venueSearchPage.clickSearchButton();
    
    // Step 4: Verify search results
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount({ min: 1 });
    await expect(page.locator('[data-testid="search-results-count"]')).toBeVisible();
    
    // Step 5: View venue details
    await venueSearchPage.clickFirstVenueCard();
    await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
    
    // Step 6: Save venue to wedding planning collection
    await venueSearchPage.saveVenueToCollection();
    await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();
    
    // Step 7: Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('venue-search-results.png');
  });

  test('should handle venue type filtering for wedding planning', async ({ page }) => {
    // Test ceremony venue filtering
    await venueSearchPage.enterSearchQuery('ceremony venues Sydney');
    await venueSearchPage.selectVenueType('ceremony');
    await venueSearchPage.clickSearchButton();
    
    await expect(page.locator('[data-testid="venue-card"][data-venue-type="ceremony"]')).toHaveCount({ min: 1 });
    await expect(page).toHaveScreenshot('ceremony-venues.png');
    
    // Test reception venue filtering
    await venueSearchPage.selectVenueType('reception');
    await venueSearchPage.clickSearchButton();
    
    await expect(page.locator('[data-testid="venue-card"][data-venue-type="reception"]')).toHaveCount({ min: 1 });
    await expect(page).toHaveScreenshot('reception-venues.png');
  });

  test('should support multi-venue wedding planning workflow', async ({ page }) => {
    // Search and save ceremony venue
    await venueSearchPage.enterSearchQuery('wedding ceremony Sydney');
    await venueSearchPage.selectVenueType('ceremony');
    await venueSearchPage.setMinimumCapacity('100');
    await venueSearchPage.clickSearchButton();
    
    await venueSearchPage.clickFirstVenueCard();
    await venueSearchPage.saveVenueToCollection();
    await page.locator('[data-testid="venue-details-modal"] [aria-label="Close"]').click();
    
    // Search and save reception venue  
    await venueSearchPage.enterSearchQuery('wedding reception Sydney');
    await venueSearchPage.selectVenueType('reception');
    await venueSearchPage.setMinimumCapacity('150');
    await venueSearchPage.clickSearchButton();
    
    await venueSearchPage.clickFirstVenueCard();
    await venueSearchPage.saveVenueToCollection();
    
    // Navigate to saved venues collection
    await venueSearchPage.clickSavedVenuesTab();
    
    // Verify both venues are saved
    await expect(page.locator('[data-testid="saved-venue-card"]')).toHaveCount(2);
    await expect(page.locator('[data-venue-type="ceremony"]')).toBeVisible();
    await expect(page.locator('[data-venue-type="reception"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('multi-venue-planning.png');
  });

  test('should handle wedding guest capacity filtering', async ({ page }) => {
    // Test small wedding (50 guests)
    await venueSearchPage.enterSearchQuery('intimate wedding venues Sydney');
    await venueSearchPage.setMinimumCapacity('20');
    await venueSearchPage.setMaximumCapacity('60');
    await venueSearchPage.clickSearchButton();
    
    // Verify all results support small wedding capacity
    const venueCards = page.locator('[data-testid="venue-card"]');
    await expect(venueCards).toHaveCount({ min: 1 });
    
    // Test large wedding (300+ guests)
    await venueSearchPage.setMinimumCapacity('300');
    await venueSearchPage.setMaximumCapacity('1000');
    await venueSearchPage.clickSearchButton();
    
    // Verify results support large wedding capacity
    await expect(venueCards).toHaveCount({ min: 1 });
    await expect(page).toHaveScreenshot('large-wedding-venues.png');
  });

  test('should provide autocomplete suggestions for venues', async ({ page }) => {
    // Start typing venue name
    await venueSearchPage.startTypingLocation('Shangri-La');
    
    // Wait for autocomplete suggestions
    await expect(page.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="autocomplete-option"]')).toHaveCount({ min: 1 });
    
    // Select suggestion
    await page.locator('[data-testid="autocomplete-option"]').first().click();
    
    // Verify location is filled
    await expect(venueSearchPage.locationInput).toHaveValue(/Shangri-La/);
    
    await expect(page).toHaveScreenshot('autocomplete-suggestions.png');
  });

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/maps.googleapis.com/maps/api/place/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await venueSearchPage.enterSearchQuery('wedding venues Sydney');
    await venueSearchPage.clickSearchButton();
    
    // Verify error is displayed gracefully
    await expect(page.locator('[data-testid="search-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-error-message"]')).toContainText('Unable to search venues');
    
    // Verify retry functionality
    await page.locator('[data-testid="retry-search-button"]').click();
    
    await expect(page).toHaveScreenshot('search-error-state.png');
  });

  test('should support venue comparison for wedding planning', async ({ page }) => {
    // Search for venues
    await venueSearchPage.enterSearchQuery('wedding venues Sydney');
    await venueSearchPage.clickSearchButton();
    
    // Select multiple venues for comparison
    await page.locator('[data-testid="venue-card"]').first().locator('[data-testid="compare-checkbox"]').check();
    await page.locator('[data-testid="venue-card"]').nth(1).locator('[data-testid="compare-checkbox"]').check();
    
    // Open comparison view
    await page.locator('[data-testid="compare-venues-button"]').click();
    
    // Verify comparison table
    await expect(page.locator('[data-testid="venue-comparison-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="comparison-venue-row"]')).toHaveCount(2);
    
    // Verify key comparison metrics are shown
    await expect(page.locator('[data-testid="capacity-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="rating-comparison"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('venue-comparison.png');
  });

  test('should handle venue booking status tracking', async ({ page }) => {
    // Navigate to saved venues
    await venueSearchPage.clickSavedVenuesTab();
    
    // Update booking status for a venue
    const venueCard = page.locator('[data-testid="saved-venue-card"]').first();
    await venueCard.locator('[data-testid="booking-status-select"]').selectOption('contacted');
    
    // Verify status is updated
    await expect(venueCard.locator('[data-testid="booking-status-badge"]')).toContainText('Contacted');
    
    // Add notes to venue
    await venueCard.locator('[data-testid="add-notes-button"]').click();
    await venueCard.locator('[data-testid="venue-notes-textarea"]').fill('Called venue, available for our date. Need to schedule site visit.');
    await venueCard.locator('[data-testid="save-notes-button"]').click();
    
    // Verify notes are saved
    await expect(venueCard.locator('[data-testid="venue-notes"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('venue-booking-status.png');
  });
});

test.describe('Performance and Load Testing', () => {
  test('should perform venue search within performance thresholds', async ({ page }) => {
    const venueSearchPage = new VenueSearchPage(page);
    await venueSearchPage.navigate();
    
    // Measure search performance
    const startTime = Date.now();
    
    await venueSearchPage.enterSearchQuery('wedding venues Sydney');
    await venueSearchPage.clickSearchButton();
    
    // Wait for results to load
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount({ min: 1 });
    
    const searchDuration = Date.now() - startTime;
    
    // Verify search completes within 3 seconds (including network)
    expect(searchDuration).toBeLessThan(3000);
    
    // Verify page performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    // Wedding planning performance requirements
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500); // 1.5 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1200); // 1.2 seconds
  });

  test('should handle concurrent venue searches', async ({ context }) => {
    const concurrentSearches = 5;
    const pages: Page[] = [];
    
    // Create multiple pages for concurrent testing
    for (let i = 0; i < concurrentSearches; i++) {
      const page = await context.newPage();
      pages.push(page);
      
      const venueSearchPage = new VenueSearchPage(page);
      await venueSearchPage.navigate();
    }
    
    // Perform concurrent searches
    const searchPromises = pages.map(async (page, index) => {
      const venueSearchPage = new VenueSearchPage(page);
      await venueSearchPage.enterSearchQuery(`wedding venues location ${index}`);
      await venueSearchPage.clickSearchButton();
      
      // Verify each search completes successfully
      await expect(page.locator('[data-testid="venue-card"]')).toHaveCount({ min: 0 });
      return page;
    });
    
    // Wait for all searches to complete
    await Promise.all(searchPromises);
    
    // Clean up pages
    await Promise.all(pages.map(page => page.close()));
  });
});