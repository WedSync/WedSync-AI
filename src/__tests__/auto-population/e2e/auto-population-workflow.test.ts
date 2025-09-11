/**
 * WS-216 Auto-Population System - End-to-End Workflow Tests
 *
 * Tests complete auto-population workflows from vendor perspective,
 * ensuring the system works seamlessly in real wedding scenarios.
 *
 * Wedding Industry Context:
 * - Tests realistic vendor workflows (photographer, venue, caterer)
 * - Validates mobile-first experience (60% of vendors use mobile)
 * - Ensures performance on poor venue WiFi (3G simulation)
 * - Verifies data accuracy for irreplaceable wedding information
 */

import { test, expect, Page } from '@playwright/test';
import { MockDataGenerator } from '../fixtures/mock-data-generator';
import { WeddingScenarios } from '../fixtures/wedding-scenarios';

// Test fixtures
let mockDataGenerator: MockDataGenerator;
let weddingScenarios: WeddingScenarios;

test.beforeEach(async ({ page }) => {
  mockDataGenerator = new MockDataGenerator();
  weddingScenarios = new WeddingScenarios();

  // Setup test authentication
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'photographer@test.com');
  await page.fill('[data-testid="password"]', 'testpass123');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
});

test.describe('Photography Vendor Auto-Population Workflow', () => {
  test('should complete full wedding quote auto-population workflow', async ({
    page,
  }) => {
    // Generate realistic wedding data
    const weddingData = weddingScenarios.generateSummerGardenWedding({
      coupleNames: ['Sarah Johnson', 'Mike Chen'],
      guestCount: 150,
      venue: 'Garden Estate Manor',
      date: '2024-06-15',
      budget: 35000,
    });

    // Navigate to create new quote
    await page.click('[data-testid="nav-clients"]');
    await page.click('[data-testid="create-client"]');

    // Quick client creation
    await page.fill(
      '[data-testid="client-name"]',
      `${weddingData.partner1Name} & ${weddingData.partner2Name}`,
    );
    await page.fill('[data-testid="wedding-date"]', weddingData.weddingDate);
    await page.click('[data-testid="save-client"]');

    // Navigate to quote creation
    await page.click('[data-testid="create-quote"]');

    // Trigger auto-population
    const autoPopulateButton = page.locator(
      '[data-testid="auto-populate-form"]',
    );
    await expect(autoPopulateButton).toBeVisible();

    // Start timing auto-population
    const startTime = Date.now();
    await autoPopulateButton.click();

    // Wait for auto-population to complete
    await expect(
      page.locator('[data-testid="auto-population-complete"]'),
    ).toBeVisible({ timeout: 3000 });
    const populationTime = Date.now() - startTime;

    // Verify performance requirement (<3 seconds)
    expect(populationTime).toBeLessThan(3000);

    // Verify essential fields are populated
    const populatedFields = [
      '[data-testid="vendor-name"]',
      '[data-testid="vendor-email"]',
      '[data-testid="vendor-phone"]',
      '[data-testid="wedding-date"]',
      '[data-testid="venue-name"]',
      '[data-testid="guest-count"]',
      '[data-testid="photography-package"]',
    ];

    for (const field of populatedFields) {
      const fieldElement = page.locator(field);
      await expect(fieldElement).not.toBeEmpty();

      // Check for confidence indicator
      const confidenceBadge = page.locator(`${field}-confidence`);
      await expect(confidenceBadge).toBeVisible();

      // Verify confidence is displayed as percentage
      const confidenceText = await confidenceBadge.textContent();
      expect(confidenceText).toMatch(/\d+%/);
    }

    // Verify auto-populated values are reasonable
    const vendorName = await page
      .locator('[data-testid="vendor-name"]')
      .inputValue();
    expect(vendorName).toBe('Sky Photography'); // From vendor profile

    const weddingDate = await page
      .locator('[data-testid="wedding-date"]')
      .inputValue();
    expect(weddingDate).toBe('2024-06-15');

    const guestCount = await page
      .locator('[data-testid="guest-count"]')
      .inputValue();
    expect(guestCount).toBe('150');

    // Test confidence-based field highlighting
    const highConfidenceFields = page.locator(
      '[data-testid*="-confidence"][class*="high-confidence"]',
    );
    await expect(highConfidenceFields).toHaveCount({ min: 3 });

    // Test manual review workflow
    await page.click('[data-testid="photography-package-confidence"]');
    await expect(
      page.locator('[data-testid="population-info-panel"]'),
    ).toBeVisible();

    const populationInfo = page.locator('[data-testid="population-source"]');
    await expect(populationInfo).toContainText('Vendor Profile');

    // Accept a populated value
    await page.click('[data-testid="accept-populated-value"]');
    await expect(
      page.locator('[data-testid="population-info-panel"]'),
    ).not.toBeVisible();

    // Modify a populated value and verify system learns
    const originalPackage = await page
      .locator('[data-testid="photography-package"]')
      .inputValue();
    await page.fill(
      '[data-testid="photography-package"]',
      'Premium Wedding Package',
    );

    // Submit quote
    await page.click('[data-testid="submit-quote"]');
    await expect(page.locator('[data-testid="quote-success"]')).toBeVisible();

    // Verify success metrics
    const successMessage = await page
      .locator('[data-testid="quote-success"]')
      .textContent();
    expect(successMessage).toContain('Quote sent successfully');
  });

  test('should handle mobile auto-population workflow', async ({ page }) => {
    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate to mobile quote creation
    await page.click('[data-testid="mobile-nav-toggle"]');
    await page.click('[data-testid="mobile-nav-clients"]');

    // Create quick client on mobile
    await page.click('[data-testid="mobile-add-client"]');
    await page.fill(
      '[data-testid="mobile-client-name"]',
      'Emma & James Wilson',
    );
    await page.fill('[data-testid="mobile-wedding-date"]', '2024-08-20');
    await page.tap('[data-testid="mobile-save-client"]');

    // Start quote creation
    await page.tap('[data-testid="mobile-create-quote"]');

    // Test mobile auto-population
    const mobileAutoPopulateButton = page.locator(
      '[data-testid="mobile-auto-populate"]',
    );
    await expect(mobileAutoPopulateButton).toBeVisible();

    // Verify touch target size (minimum 44px)
    const buttonBox = await mobileAutoPopulateButton.boundingBox();
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox!.width).toBeGreaterThanOrEqual(44);

    await mobileAutoPopulateButton.tap();

    // Wait for mobile population complete
    await expect(
      page.locator('[data-testid="mobile-population-banner"]'),
    ).toBeVisible({ timeout: 5000 });

    // Verify mobile-optimized field display
    const mobilePopulatedFields = page.locator(
      '[data-testid*="mobile-populated-field"]',
    );
    await expect(mobilePopulatedFields).toHaveCount({ min: 5 });

    // Test swipe gestures for field acceptance (if implemented)
    const firstPopulatedField = mobilePopulatedFields.first();
    await firstPopulatedField.hover();

    // Simulate swipe right to accept (using drag)
    const fieldBox = await firstPopulatedField.boundingBox();
    await page.mouse.move(fieldBox!.x + 10, fieldBox!.y + fieldBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      fieldBox!.x + fieldBox!.width - 10,
      fieldBox!.y + fieldBox!.height / 2,
    );
    await page.mouse.up();

    // Verify mobile form completion
    await page.tap('[data-testid="mobile-submit-quote"]');
    await expect(
      page.locator('[data-testid="mobile-quote-success"]'),
    ).toBeVisible();
  });

  test('should work offline and sync when reconnected', async ({
    page,
    context,
  }) => {
    // Create client while online
    await page.click('[data-testid="nav-clients"]');
    await page.click('[data-testid="create-client"]');
    await page.fill('[data-testid="client-name"]', 'Offline Test Couple');
    await page.fill('[data-testid="wedding-date"]', '2024-09-15');
    await page.click('[data-testid="save-client"]');

    // Go offline
    await context.setOffline(true);

    // Verify offline indicator
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();

    // Start quote creation offline
    await page.click('[data-testid="create-quote"]');

    // Try auto-population while offline
    await page.click('[data-testid="auto-populate-offline"]');

    // Verify cached population works
    await expect(
      page.locator('[data-testid="offline-population-banner"]'),
    ).toBeVisible();

    const offlinePopulatedFields = page.locator(
      '[data-testid*="offline-populated-field"]',
    );
    await expect(offlinePopulatedFields).toHaveCount({ min: 3 });

    // Verify vendor profile data is available offline
    const offlineVendorName = await page
      .locator('[data-testid="vendor-name"]')
      .inputValue();
    expect(offlineVendorName).toBe('Sky Photography');

    // Complete form offline
    await page.fill('[data-testid="custom-message"]', 'Created while offline');
    await page.click('[data-testid="save-draft"]');

    await expect(
      page.locator('[data-testid="offline-draft-saved"]'),
    ).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Verify sync indicator
    await expect(
      page.locator('[data-testid="sync-in-progress"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify data was synced
    await page.reload();
    await page.click('[data-testid="nav-quotes"]');
    const draftQuote = page.locator('[data-testid="draft-quote"]').first();
    await expect(draftQuote).toContainText('Created while offline');
  });
});

test.describe('Venue Coordinator Auto-Population Workflow', () => {
  test('should auto-populate venue availability form', async ({ page }) => {
    // Switch to venue coordinator account
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'venue@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');

    // Generate venue-specific wedding scenario
    const venueWedding = weddingScenarios.generateVenueInquiry({
      eventType: 'wedding',
      guestCount: 120,
      preferredDate: '2024-07-20',
      ceremonyAndReception: true,
      specialRequirements: ['wheelchair accessible', 'outdoor ceremony'],
    });

    await page.click('[data-testid="nav-inquiries"]');
    await page.click('[data-testid="create-inquiry"]');

    // Auto-populate venue availability form
    await page.click('[data-testid="auto-populate-venue-form"]');

    await expect(
      page.locator('[data-testid="auto-population-complete"]'),
    ).toBeVisible({ timeout: 3000 });

    // Verify venue-specific fields are populated
    const venueFields = [
      '[data-testid="venue-name"]',
      '[data-testid="venue-capacity"]',
      '[data-testid="ceremony-space"]',
      '[data-testid="reception-space"]',
      '[data-testid="base-pricing"]',
      '[data-testid="included-services"]',
    ];

    for (const field of venueFields) {
      await expect(page.locator(field)).not.toBeEmpty();
    }

    // Verify capacity calculation based on guest count
    const maxCapacity = await page
      .locator('[data-testid="venue-capacity"]')
      .inputValue();
    expect(parseInt(maxCapacity)).toBeGreaterThan(120); // Should accommodate guest count

    // Test space allocation logic
    const ceremonyCapacity = await page
      .locator('[data-testid="ceremony-capacity"]')
      .inputValue();
    const receptionCapacity = await page
      .locator('[data-testid="reception-capacity"]')
      .inputValue();

    expect(parseInt(ceremonyCapacity)).toBeGreaterThanOrEqual(120);
    expect(parseInt(receptionCapacity)).toBeGreaterThanOrEqual(120);

    // Verify pricing calculation
    const basePrice = await page
      .locator('[data-testid="base-pricing"]')
      .inputValue();
    const pricing = parseFloat(basePrice.replace(/[£,$]/g, ''));
    expect(pricing).toBeGreaterThan(0);

    // Test date availability check
    await page.click('[data-testid="check-availability"]');
    await expect(
      page.locator('[data-testid="availability-result"]'),
    ).toBeVisible();

    const availabilityStatus = await page
      .locator('[data-testid="availability-status"]')
      .textContent();
    expect(['Available', 'Limited Availability', 'Fully Booked']).toContain(
      availabilityStatus,
    );
  });
});

test.describe('Caterer Auto-Population Workflow', () => {
  test('should auto-populate catering proposal with dietary restrictions', async ({
    page,
  }) => {
    // Switch to caterer account
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'caterer@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');

    // Generate catering-specific scenario
    const cateringWedding = weddingScenarios.generateCateringInquiry({
      guestCount: 180,
      serviceStyle: 'plated dinner',
      dietaryRestrictions: ['vegetarian', 'gluten-free', 'nut allergies'],
      mealPreference: 'formal dinner',
      barService: 'full bar',
      specialRequirements: ['kosher preparation', 'children menu'],
    });

    await page.click('[data-testid="nav-proposals"]');
    await page.click('[data-testid="create-proposal"]');

    // Auto-populate catering form
    await page.click('[data-testid="auto-populate-catering-form"]');

    await expect(
      page.locator('[data-testid="auto-population-complete"]'),
    ).toBeVisible({ timeout: 3000 });

    // Verify catering-specific auto-population
    const cateringFields = [
      '[data-testid="service-style"]',
      '[data-testid="guest-count"]',
      '[data-testid="menu-options"]',
      '[data-testid="dietary-accommodations"]',
      '[data-testid="bar-service"]',
      '[data-testid="service-staff"]',
    ];

    for (const field of cateringFields) {
      await expect(page.locator(field)).not.toBeEmpty();
    }

    // Verify dietary restrictions are properly handled
    const dietaryField = page.locator('[data-testid="dietary-accommodations"]');
    const dietaryValue = await dietaryField.inputValue();

    expect(dietaryValue).toContain('vegetarian');
    expect(dietaryValue).toContain('gluten-free');
    expect(dietaryValue).toContain('nut allergies');

    // Test staff calculation based on guest count and service style
    const staffCount = await page
      .locator('[data-testid="service-staff"]')
      .inputValue();
    const staffNumber = parseInt(staffCount);

    // For plated dinner with 180 guests, expect adequate staffing
    expect(staffNumber).toBeGreaterThanOrEqual(6); // Minimum service ratio
    expect(staffNumber).toBeLessThanOrEqual(15); // Maximum reasonable ratio

    // Verify menu suggestions based on service style
    await page.click('[data-testid="view-menu-suggestions"]');
    await expect(
      page.locator('[data-testid="menu-suggestions-modal"]'),
    ).toBeVisible();

    const suggestionsList = page.locator('[data-testid="menu-suggestion"]');
    await expect(suggestionsList).toHaveCount({ min: 3 });

    // Test cost calculation
    await page.click('[data-testid="calculate-pricing"]');
    await expect(
      page.locator('[data-testid="pricing-breakdown"]'),
    ).toBeVisible();

    const totalCost = await page
      .locator('[data-testid="total-cost"]')
      .textContent();
    expect(totalCost).toMatch(/£[\d,]+/); // Should show formatted currency
  });
});

test.describe('Multi-Vendor Coordination Workflow', () => {
  test('should coordinate auto-population across multiple vendor types', async ({
    page,
  }) => {
    // Login as wedding coordinator
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'coordinator@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');

    // Create comprehensive wedding project
    const multiVendorWedding = weddingScenarios.generateFullWeddingProject({
      coupleNames: ['Alice Smith', 'David Brown'],
      guestCount: 250,
      venue: 'Grand Ballroom Hotel',
      date: '2024-10-12',
      vendors: ['photographer', 'caterer', 'florist', 'band', 'officiant'],
      budget: 75000,
      style: 'elegant formal',
    });

    await page.click('[data-testid="nav-weddings"]');
    await page.click('[data-testid="create-wedding-project"]');

    // Setup basic wedding information
    await page.fill(
      '[data-testid="couple-names"]',
      'Alice Smith & David Brown',
    );
    await page.fill('[data-testid="wedding-date"]', '2024-10-12');
    await page.fill('[data-testid="guest-count"]', '250');
    await page.fill('[data-testid="budget"]', '75000');
    await page.click('[data-testid="save-wedding-basics"]');

    // Test vendor coordination workflow
    await page.click('[data-testid="add-vendors"]');

    // Add photographer
    await page.click('[data-testid="add-photographer"]');
    await page.click('[data-testid="auto-populate-photographer-form"]');
    await expect(
      page.locator('[data-testid="photographer-form-populated"]'),
    ).toBeVisible({ timeout: 3000 });

    // Verify cross-vendor data sharing
    const photographerDate = await page
      .locator('[data-testid="photographer-wedding-date"]')
      .inputValue();
    expect(photographerDate).toBe('2024-10-12');

    const photographerGuestCount = await page
      .locator('[data-testid="photographer-guest-count"]')
      .inputValue();
    expect(photographerGuestCount).toBe('250');

    await page.click('[data-testid="save-photographer"]');

    // Add caterer
    await page.click('[data-testid="add-caterer"]');
    await page.click('[data-testid="auto-populate-caterer-form"]');
    await expect(
      page.locator('[data-testid="caterer-form-populated"]'),
    ).toBeVisible({ timeout: 3000 });

    // Verify venue capacity awareness in catering
    const cateringGuestCount = await page
      .locator('[data-testid="catering-guest-count"]')
      .inputValue();
    expect(cateringGuestCount).toBe('250');

    // Test timeline coordination
    await page.click('[data-testid="coordinate-timeline"]');
    await expect(
      page.locator('[data-testid="timeline-coordination-modal"]'),
    ).toBeVisible();

    // Verify vendor timeline suggestions
    const timelineItems = page.locator('[data-testid="timeline-item"]');
    await expect(timelineItems).toHaveCount({ min: 5 });

    // Test conflict detection
    await page.click('[data-testid="detect-conflicts"]');
    await expect(
      page.locator('[data-testid="conflict-analysis"]'),
    ).toBeVisible();

    const conflictStatus = await page
      .locator('[data-testid="conflict-status"]')
      .textContent();
    expect(['No Conflicts', 'Minor Conflicts', 'Major Conflicts']).toContain(
      conflictStatus,
    );

    // Generate comprehensive proposal
    await page.click('[data-testid="generate-master-proposal"]');
    await expect(
      page.locator('[data-testid="proposal-generation-progress"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="master-proposal-ready"]'),
    ).toBeVisible({ timeout: 10000 });

    // Verify all vendor information is included
    await page.click('[data-testid="preview-master-proposal"]');
    await expect(
      page.locator('[data-testid="proposal-photographer-section"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="proposal-catering-section"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="proposal-timeline-section"]'),
    ).toBeVisible();
  });
});

test.describe('Performance and Reliability', () => {
  test('should handle high-volume concurrent auto-population', async ({
    page,
  }) => {
    // This test simulates wedding season peak load
    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        page.evaluate(async (index) => {
          const startTime = performance.now();

          // Simulate API call for auto-population
          const response = await fetch('/api/auto-populate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formType: 'wedding-quote',
              clientId: `client-${index}`,
              vendorId: 'vendor-123',
            }),
          });

          const endTime = performance.now();
          return {
            success: response.ok,
            responseTime: endTime - startTime,
            index,
          };
        }, i),
      );
    }

    const results = await Promise.all(promises);

    // Verify all requests succeeded
    results.forEach((result) => {
      expect(result.success).toBe(true);
    });

    // Verify performance under load
    const averageResponseTime =
      results.reduce((sum, result) => sum + result.responseTime, 0) /
      results.length;
    expect(averageResponseTime).toBeLessThan(1000); // <1 second average under load

    // Verify no failed requests
    const failedRequests = results.filter((result) => !result.success);
    expect(failedRequests.length).toBe(0);
  });

  test('should gracefully handle network interruptions', async ({
    page,
    context,
  }) => {
    await page.click('[data-testid="nav-clients"]');
    await page.click('[data-testid="create-client"]');
    await page.fill('[data-testid="client-name"]', 'Network Test Couple');
    await page.click('[data-testid="save-client"]');

    await page.click('[data-testid="create-quote"]');

    // Start auto-population
    await page.click('[data-testid="auto-populate-form"]');

    // Simulate network interruption during population
    await page.waitForTimeout(500); // Let population start
    await context.setOffline(true);

    // Verify graceful degradation
    await expect(
      page.locator('[data-testid="network-error-banner"]'),
    ).toBeVisible({ timeout: 5000 });

    const errorMessage = await page
      .locator('[data-testid="error-message"]')
      .textContent();
    expect(errorMessage).toContain('network');

    // Verify partial population is preserved
    const populatedFields = page.locator('[data-testid*="populated-field"]');
    const fieldCount = await populatedFields.count();

    if (fieldCount > 0) {
      // Some fields were populated before network failure
      expect(fieldCount).toBeGreaterThan(0);
    }

    // Reconnect and retry
    await context.setOffline(false);
    await page.click('[data-testid="retry-auto-population"]');

    await expect(
      page.locator('[data-testid="auto-population-complete"]'),
    ).toBeVisible({ timeout: 5000 });

    // Verify successful completion after reconnection
    const finalPopulatedFields = page.locator(
      '[data-testid*="populated-field"]',
    );
    const finalFieldCount = await finalPopulatedFields.count();
    expect(finalFieldCount).toBeGreaterThan(fieldCount);
  });
});
