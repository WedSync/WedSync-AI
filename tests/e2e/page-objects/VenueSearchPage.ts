import { Page, Locator, expect } from '@playwright/test';

export class VenueSearchPage {
  readonly page: Page;
  readonly searchQueryInput: Locator;
  readonly locationInput: Locator;
  readonly venueTypeSelect: Locator;
  readonly minimumCapacityInput: Locator;
  readonly maximumCapacityInput: Locator;
  readonly priceRangeSelect: Locator;
  readonly searchButton: Locator;
  readonly filtersToggle: Locator;
  readonly useLocationButton: Locator;
  readonly savedVenuesTab: Locator;
  readonly searchResultsTab: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly resultsCount: Locator;
  readonly venueCards: Locator;
  readonly autocompleteContainer: Locator;
  readonly autocompleteSuggestions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchQueryInput = page.locator('[data-testid="venue-search-input"]');
    this.locationInput = page.locator('[data-testid="location-search-input"]');
    this.venueTypeSelect = page.locator('[data-testid="venue-type-select"]');
    this.minimumCapacityInput = page.locator('[data-testid="min-capacity-input"]');
    this.maximumCapacityInput = page.locator('[data-testid="max-capacity-input"]');
    this.priceRangeSelect = page.locator('[data-testid="price-range-select"]');
    this.searchButton = page.locator('[data-testid="search-venues-button"]');
    this.filtersToggle = page.locator('[data-testid="filters-toggle-button"]');
    this.useLocationButton = page.locator('[data-testid="use-location-button"]');
    this.savedVenuesTab = page.locator('[data-testid="saved-venues-tab"]');
    this.searchResultsTab = page.locator('[data-testid="search-results-tab"]');
    this.loadingSpinner = page.locator('[data-testid="search-loading"]');
    this.errorMessage = page.locator('[data-testid="search-error-message"]');
    this.retryButton = page.locator('[data-testid="retry-search-button"]');
    this.resultsCount = page.locator('[data-testid="search-results-count"]');
    this.venueCards = page.locator('[data-testid="venue-card"]');
    this.autocompleteContainer = page.locator('[data-testid="autocomplete-container"]');
    this.autocompleteSuggestions = page.locator('[data-testid="autocomplete-suggestions"]');
  }

  async navigate() {
    await this.page.goto('/venue-search');
    await this.page.waitForLoadState('networkidle');
  }

  async enterSearchQuery(query: string) {
    await this.searchQueryInput.fill(query);
  }

  async enterLocation(location: string) {
    await this.locationInput.fill(location);
  }

  async startTypingLocation(partial: string) {
    await this.locationInput.fill(partial);
    // Wait a bit for autocomplete to trigger
    await this.page.waitForTimeout(300);
  }

  async selectAutocompleteOption(index: number = 0) {
    await this.autocompleteSuggestions.locator('[data-testid="autocomplete-option"]').nth(index).click();
  }

  async selectVenueType(type: 'ceremony' | 'reception' | 'both' | 'hotel' | 'restaurant' | 'outdoor') {
    await this.venueTypeSelect.selectOption(type);
  }

  async setMinimumCapacity(capacity: string) {
    await this.minimumCapacityInput.fill(capacity);
  }

  async setMaximumCapacity(capacity: string) {
    await this.maximumCapacityInput.fill(capacity);
  }

  async selectPriceRange(range: 'low' | 'medium' | 'high' | 'premium') {
    await this.priceRangeSelect.selectOption(range);
  }

  async toggleFilters() {
    await this.filtersToggle.click();
  }

  async clickSearchButton() {
    await this.searchButton.click();
    // Wait for search to complete (either results or error)
    await this.page.waitForFunction(
      () => !document.querySelector('[data-testid="search-loading"]')?.classList.contains('visible'),
      undefined,
      { timeout: 10000 }
    );
  }

  async useCurrentLocation() {
    await this.useLocationButton.click();
    // Wait for geolocation to complete
    await this.page.waitForTimeout(2000);
  }

  async clickSavedVenuesTab() {
    await this.savedVenuesTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickSearchResultsTab() {
    await this.searchResultsTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getSearchResultsCount(): Promise<number> {
    const countText = await this.resultsCount.textContent();
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async waitForSearchResults(timeout: number = 10000) {
    await expect(this.venueCards.first()).toBeVisible({ timeout });
  }

  async waitForNoResults(timeout: number = 5000) {
    await expect(this.page.locator('[data-testid="no-results-message"]')).toBeVisible({ timeout });
  }

  async waitForSearchError(timeout: number = 5000) {
    await expect(this.errorMessage).toBeVisible({ timeout });
  }

  async clickFirstVenueCard() {
    await this.venueCards.first().click();
  }

  async clickVenueCard(index: number) {
    await this.venueCards.nth(index).click();
  }

  async hoverVenueCard(index: number) {
    await this.venueCards.nth(index).hover();
  }

  async saveVenueToCollection(venueIndex: number = 0) {
    const venueCard = this.venueCards.nth(venueIndex);
    await venueCard.locator('[data-testid="save-venue-button"]').click();
    
    // Wait for save confirmation
    await expect(this.page.locator('[data-testid="save-success-message"]')).toBeVisible();
  }

  async removeVenueFromCollection(venueIndex: number = 0) {
    const venueCard = this.page.locator('[data-testid="saved-venue-card"]').nth(venueIndex);
    await venueCard.locator('[data-testid="remove-venue-button"]').click();
    
    // Confirm removal in modal
    await this.page.locator('[data-testid="confirm-remove-button"]').click();
  }

  async updateVenueBookingStatus(venueIndex: number, status: 'interested' | 'contacted' | 'visited' | 'booked' | 'declined') {
    const venueCard = this.page.locator('[data-testid="saved-venue-card"]').nth(venueIndex);
    await venueCard.locator('[data-testid="booking-status-select"]').selectOption(status);
  }

  async addVenueNotes(venueIndex: number, notes: string) {
    const venueCard = this.page.locator('[data-testid="saved-venue-card"]').nth(venueIndex);
    await venueCard.locator('[data-testid="add-notes-button"]').click();
    await venueCard.locator('[data-testid="venue-notes-textarea"]').fill(notes);
    await venueCard.locator('[data-testid="save-notes-button"]').click();
  }

  async openVenueDetails(venueIndex: number = 0) {
    const venueCard = this.venueCards.nth(venueIndex);
    await venueCard.locator('[data-testid="view-details-button"]').click();
    
    // Wait for modal to open
    await expect(this.page.locator('[data-testid="venue-details-modal"]')).toBeVisible();
  }

  async closeVenueDetails() {
    await this.page.locator('[data-testid="venue-details-modal"] [aria-label="Close"]').click();
    
    // Wait for modal to close
    await expect(this.page.locator('[data-testid="venue-details-modal"]')).not.toBeVisible();
  }

  async getVenueCardInfo(index: number) {
    const card = this.venueCards.nth(index);
    
    const name = await card.locator('[data-testid="venue-name"]').textContent();
    const address = await card.locator('[data-testid="venue-address"]').textContent();
    const rating = await card.locator('[data-testid="venue-rating"]').textContent();
    const capacity = await card.locator('[data-testid="venue-capacity"]').textContent();
    const priceLevel = await card.locator('[data-testid="venue-price-level"]').textContent();
    const venueType = await card.getAttribute('data-venue-type');
    
    return {
      name: name?.trim(),
      address: address?.trim(),
      rating: rating ? parseFloat(rating) : null,
      capacity: capacity ? parseInt(capacity.replace(/\D/g, '')) : null,
      priceLevel: priceLevel?.trim(),
      venueType
    };
  }

  async verifyVenueMatchesFilters(venueIndex: number, filters: {
    venueType?: string;
    minCapacity?: number;
    maxCapacity?: number;
    priceRange?: string;
  }) {
    const venueInfo = await this.getVenueCardInfo(venueIndex);
    
    if (filters.venueType) {
      expect(venueInfo.venueType).toBe(filters.venueType);
    }
    
    if (filters.minCapacity && venueInfo.capacity) {
      expect(venueInfo.capacity).toBeGreaterThanOrEqual(filters.minCapacity);
    }
    
    if (filters.maxCapacity && venueInfo.capacity) {
      expect(venueInfo.capacity).toBeLessThanOrEqual(filters.maxCapacity);
    }
    
    if (filters.priceRange) {
      expect(venueInfo.priceLevel).toBe(filters.priceRange);
    }
  }

  async clearAllFilters() {
    await this.page.locator('[data-testid="clear-filters-button"]').click();
  }

  async applyFilters() {
    await this.page.locator('[data-testid="apply-filters-button"]').click();
  }

  async enableCompareMode() {
    await this.page.locator('[data-testid="compare-mode-toggle"]').click();
  }

  async selectVenueForComparison(venueIndex: number) {
    const venueCard = this.venueCards.nth(venueIndex);
    await venueCard.locator('[data-testid="compare-checkbox"]').check();
  }

  async openVenueComparison() {
    await this.page.locator('[data-testid="compare-venues-button"]').click();
    await expect(this.page.locator('[data-testid="venue-comparison-modal"]')).toBeVisible();
  }

  async closeVenueComparison() {
    await this.page.locator('[data-testid="venue-comparison-modal"] [aria-label="Close"]').click();
  }

  async sortResults(sortBy: 'relevance' | 'rating' | 'price' | 'distance' | 'capacity') {
    await this.page.locator('[data-testid="sort-results-select"]').selectOption(sortBy);
    await this.page.waitForLoadState('networkidle');
  }

  async loadMoreResults() {
    await this.page.locator('[data-testid="load-more-button"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  // Wedding-specific helper methods
  async searchForCeremonyVenues(location: string, guestCount: number) {
    await this.enterSearchQuery('wedding ceremony venues');
    await this.enterLocation(location);
    await this.selectVenueType('ceremony');
    await this.setMinimumCapacity(guestCount.toString());
    await this.clickSearchButton();
  }

  async searchForReceptionVenues(location: string, guestCount: number, priceRange: 'low' | 'medium' | 'high' | 'premium') {
    await this.enterSearchQuery('wedding reception venues');
    await this.enterLocation(location);
    await this.selectVenueType('reception');
    await this.setMinimumCapacity(guestCount.toString());
    await this.selectPriceRange(priceRange);
    await this.clickSearchButton();
  }

  async searchForCompleteWeddingVenues(location: string, guestCount: number) {
    await this.enterSearchQuery('complete wedding venues');
    await this.enterLocation(location);
    await this.selectVenueType('both');
    await this.setMinimumCapacity(guestCount.toString());
    await this.clickSearchButton();
  }

  async planMultiVenueWedding(ceremonyLocation: string, receptionLocation: string, guestCount: number) {
    // Search and save ceremony venue
    await this.searchForCeremonyVenues(ceremonyLocation, Math.floor(guestCount * 0.8)); // Assume ceremony has fewer guests
    await this.waitForSearchResults();
    await this.saveVenueToCollection(0);
    
    // Search and save reception venue
    await this.searchForReceptionVenues(receptionLocation, guestCount, 'medium');
    await this.waitForSearchResults();
    await this.saveVenueToCollection(0);
    
    // Verify both venues are saved
    await this.clickSavedVenuesTab();
    await expect(this.page.locator('[data-testid="saved-venue-card"]')).toHaveCount(2);
  }

  // Performance and accessibility helpers
  async measureSearchPerformance() {
    const startTime = Date.now();
    await this.clickSearchButton();
    await this.waitForSearchResults();
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  async checkAccessibilityTree() {
    // Take accessibility snapshot
    const snapshot = await this.page.accessibility.snapshot();
    return snapshot;
  }

  async verifyKeyboardNavigation() {
    // Test tab navigation through search form
    await this.page.keyboard.press('Tab'); // Search input
    await expect(this.searchQueryInput).toBeFocused();
    
    await this.page.keyboard.press('Tab'); // Location input
    await expect(this.locationInput).toBeFocused();
    
    await this.page.keyboard.press('Tab'); // Venue type select
    await expect(this.venueTypeSelect).toBeFocused();
    
    await this.page.keyboard.press('Tab'); // Capacity input
    await expect(this.minimumCapacityInput).toBeFocused();
    
    await this.page.keyboard.press('Tab'); // Price range select
    await expect(this.priceRangeSelect).toBeFocused();
    
    await this.page.keyboard.press('Tab'); // Search button
    await expect(this.searchButton).toBeFocused();
  }

  async testScreenReaderAnnouncements() {
    // This would integrate with screen reader testing tools
    // For now, verify ARIA attributes are present
    await expect(this.searchQueryInput).toHaveAttribute('aria-label');
    await expect(this.locationInput).toHaveAttribute('aria-label');
    await expect(this.searchButton).toHaveAttribute('aria-label');
    
    // Verify live regions for search results
    await expect(this.page.locator('[aria-live="polite"]')).toBeVisible();
  }

  // Visual regression testing helpers
  async takeSearchFormScreenshot(name: string) {
    await expect(this.page.locator('[data-testid="venue-search-form"]')).toHaveScreenshot(`${name}-search-form.png`);
  }

  async takeResultsScreenshot(name: string) {
    await expect(this.page.locator('[data-testid="search-results-container"]')).toHaveScreenshot(`${name}-results.png`);
  }

  async takeFullPageScreenshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}-full-page.png`, { fullPage: true });
  }
}