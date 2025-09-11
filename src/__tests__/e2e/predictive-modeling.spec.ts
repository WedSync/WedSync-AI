/**
 * WS-232: Predictive Modeling System - E2E Tests
 * Team: team-c (Integration)
 *
 * Complete end-to-end testing of predictive modeling workflows
 * Tests user interactions from frontend to ML predictions
 */

import { test, expect, Page } from '@playwright/test';

// Test data setup
const testUser = {
  email: 'test-predictions@wedsync.com',
  password: 'TestPassword123!',
  organizationName: 'Test Wedding Studio',
};

const sampleWeddingData = {
  budget: 25000,
  guestCount: 120,
  weddingDate: '2025-06-15',
  venue: 'Garden Villa',
  vendorCount: 8,
  region: 'London',
};

test.describe('WS-232: Predictive Modeling System - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Budget Optimization Predictions', () => {
    test('should generate budget optimization prediction successfully', async ({
      page,
    }) => {
      // Navigate to budget analytics
      await page.goto('/dashboard/budget');
      await page.click('[data-testid="predictive-analytics-tab"]');

      // Wait for predictive modeling section to load
      await expect(
        page.locator('[data-testid="budget-prediction-section"]'),
      ).toBeVisible();

      // Fill in budget optimization form
      await page.fill(
        '[data-testid="total-budget-input"]',
        sampleWeddingData.budget.toString(),
      );
      await page.fill(
        '[data-testid="guest-count-input"]',
        sampleWeddingData.guestCount.toString(),
      );
      await page.selectOption('[data-testid="wedding-type-select"]', 'outdoor');
      await page.selectOption(
        '[data-testid="region-select"]',
        sampleWeddingData.region,
      );

      // Trigger prediction
      await page.click('[data-testid="generate-budget-prediction"]');

      // Wait for loading state
      await expect(
        page.locator('[data-testid="prediction-loading"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="prediction-loading"]'),
      ).toBeHidden({ timeout: 30000 });

      // Verify prediction results are displayed
      await expect(
        page.locator('[data-testid="prediction-results"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="recommended-breakdown"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="cost-optimization-tips"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="confidence-score"]'),
      ).toBeVisible();

      // Verify prediction was saved
      await page.click('[data-testid="prediction-history-tab"]');
      await expect(
        page.locator('[data-testid="history-item"]').first(),
      ).toContainText('Budget Optimization');
    });

    test('should handle budget prediction errors gracefully', async ({
      page,
    }) => {
      await page.goto('/dashboard/budget');
      await page.click('[data-testid="predictive-analytics-tab"]');

      // Submit with invalid data
      await page.fill('[data-testid="total-budget-input"]', '-1000');
      await page.click('[data-testid="generate-budget-prediction"]');

      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Budget must be positive',
      );
    });
  });

  test.describe('Vendor Performance Predictions', () => {
    test('should analyze vendor performance successfully', async ({ page }) => {
      await page.goto('/dashboard/vendors');
      await page.click('[data-testid="performance-analytics"]');

      // Select vendor for analysis
      await page.click('[data-testid="vendor-select"]');
      await page.click('[data-testid="vendor-option-photographer"]');

      // Fill performance criteria
      await page.fill('[data-testid="past-events-input"]', '15');
      await page.fill('[data-testid="average-rating-input"]', '4.5');
      await page.selectOption('[data-testid="service-type"]', 'photography');

      // Generate performance prediction
      await page.click('[data-testid="analyze-performance"]');

      // Wait for results
      await expect(
        page.locator('[data-testid="performance-results"]'),
      ).toBeVisible({ timeout: 30000 });

      // Verify performance metrics
      await expect(
        page.locator('[data-testid="reliability-score"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="quality-prediction"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="risk-assessment"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="recommendation-summary"]'),
      ).toBeVisible();
    });
  });

  test.describe('Timeline Optimization', () => {
    test('should optimize wedding timeline successfully', async ({ page }) => {
      await page.goto('/dashboard/timeline');
      await page.click('[data-testid="ai-optimization"]');

      // Input timeline parameters
      await page.fill('[data-testid="ceremony-time"]', '15:00');
      await page.fill('[data-testid="reception-start"]', '18:00');
      await page.fill(
        '[data-testid="guest-count"]',
        sampleWeddingData.guestCount.toString(),
      );
      await page.selectOption('[data-testid="venue-type"]', 'garden');

      // Add some events
      await page.click('[data-testid="add-event"]');
      await page.fill('[data-testid="event-name-0"]', 'Photography Session');
      await page.fill('[data-testid="event-duration-0"]', '90');

      // Generate optimized timeline
      await page.click('[data-testid="optimize-timeline"]');

      // Verify optimization results
      await expect(
        page.locator('[data-testid="optimized-schedule"]'),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.locator('[data-testid="time-conflicts"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="optimization-suggestions"]'),
      ).toBeVisible();
    });
  });

  test.describe('Guest Attendance Predictions', () => {
    test('should predict guest attendance accurately', async ({ page }) => {
      await page.goto('/dashboard/guests');
      await page.click('[data-testid="attendance-predictions"]');

      // Input guest parameters
      await page.fill('[data-testid="invited-count"]', '150');
      await page.selectOption('[data-testid="wedding-season"]', 'summer');
      await page.selectOption('[data-testid="day-of-week"]', 'saturday');
      await page.selectOption('[data-testid="location-type"]', 'destination');

      // Generate attendance prediction
      await page.click('[data-testid="predict-attendance"]');

      // Verify prediction results
      await expect(
        page.locator('[data-testid="predicted-attendance"]'),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.locator('[data-testid="attendance-range"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="factors-analysis"]'),
      ).toBeVisible();

      // Check prediction confidence
      const confidenceText = await page
        .locator('[data-testid="confidence-level"]')
        .textContent();
      expect(confidenceText).toMatch(/\d{1,3}%/);
    });
  });

  test.describe('Batch Predictions', () => {
    test('should process multiple predictions in batch', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      await page.click('[data-testid="batch-predictions"]');

      // Upload batch data or configure multiple predictions
      await page.click('[data-testid="add-batch-prediction"]');
      await page.selectOption(
        '[data-testid="batch-type-0"]',
        'budget_optimization',
      );

      await page.click('[data-testid="add-batch-prediction"]');
      await page.selectOption(
        '[data-testid="batch-type-1"]',
        'guest_attendance',
      );

      await page.click('[data-testid="add-batch-prediction"]');
      await page.selectOption(
        '[data-testid="batch-type-2"]',
        'vendor_performance',
      );

      // Process batch
      await page.click('[data-testid="process-batch"]');

      // Monitor batch progress
      await expect(
        page.locator('[data-testid="batch-progress"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="processing-status"]'),
      ).toContainText('Processing');

      // Wait for completion (with timeout)
      await expect(page.locator('[data-testid="batch-complete"]')).toBeVisible({
        timeout: 60000,
      });

      // Verify batch results
      await expect(page.locator('[data-testid="batch-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="batch-summary"]')).toBeVisible();
    });
  });

  test.describe('Prediction History and Management', () => {
    test('should display prediction history correctly', async ({ page }) => {
      await page.goto('/dashboard/predictions');

      // Wait for history to load
      await expect(
        page.locator('[data-testid="prediction-history"]'),
      ).toBeVisible();

      // Verify history items are displayed
      const historyItems = page.locator('[data-testid="history-item"]');
      await expect(historyItems.first()).toBeVisible();

      // Test filtering
      await page.selectOption(
        '[data-testid="type-filter"]',
        'budget_optimization',
      );
      await page.waitForTimeout(1000); // Wait for filter to apply

      const filteredItems = await historyItems.count();
      expect(filteredItems).toBeGreaterThan(0);

      // Test date range filter
      await page.fill('[data-testid="date-from"]', '2025-01-01');
      await page.fill('[data-testid="date-to"]', '2025-12-31');
      await page.click('[data-testid="apply-filter"]');

      await expect(historyItems.first()).toBeVisible();
    });

    test('should allow viewing detailed prediction results', async ({
      page,
    }) => {
      await page.goto('/dashboard/predictions');

      // Click on a prediction item
      await page.click('[data-testid="history-item"]');

      // Verify detailed view opens
      await expect(
        page.locator('[data-testid="prediction-detail-modal"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="detailed-results"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="input-parameters"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="confidence-metrics"]'),
      ).toBeVisible();

      // Test export functionality
      await page.click('[data-testid="export-results"]');
      // Note: In a real test, you'd verify the download
      await expect(
        page.locator('[data-testid="export-success"]'),
      ).toBeVisible();
    });
  });

  test.describe('Model Performance Monitoring', () => {
    test('should display model performance metrics', async ({ page }) => {
      await page.goto('/dashboard/analytics/model-performance');

      // Wait for performance dashboard to load
      await expect(
        page.locator('[data-testid="performance-dashboard"]'),
      ).toBeVisible();

      // Verify key metrics are displayed
      await expect(
        page.locator('[data-testid="accuracy-metric"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="prediction-volume"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="response-times"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="error-rates"]')).toBeVisible();

      // Test model comparison
      await page.selectOption(
        '[data-testid="model-select"]',
        'budget_optimization',
      );
      await page.click('[data-testid="compare-models"]');

      await expect(
        page.locator('[data-testid="comparison-chart"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="performance-trends"]'),
      ).toBeVisible();
    });
  });

  test.describe('Integration with Wedding Workflows', () => {
    test('should integrate predictions with wedding planning workflow', async ({
      page,
    }) => {
      // Start from wedding creation
      await page.goto('/dashboard/weddings/new');

      // Fill basic wedding info
      await page.fill('[data-testid="wedding-name"]', 'Smith Wedding');
      await page.fill(
        '[data-testid="wedding-date"]',
        sampleWeddingData.weddingDate,
      );
      await page.fill(
        '[data-testid="budget"]',
        sampleWeddingData.budget.toString(),
      );

      // Navigate to AI assistance section
      await page.click('[data-testid="ai-assistance"]');

      // Verify predictive suggestions are available
      await expect(
        page.locator('[data-testid="budget-suggestions"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="timeline-suggestions"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="vendor-recommendations"]'),
      ).toBeVisible();

      // Apply a suggestion
      await page.click('[data-testid="apply-budget-suggestion"]');

      // Verify suggestion was applied to wedding
      await expect(
        page.locator('[data-testid="budget-updated"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="suggestion-applied-message"]'),
      ).toContainText('Budget optimization applied');
    });

    test('should provide real-time predictions during planning', async ({
      page,
    }) => {
      await page.goto('/dashboard/weddings/123/plan'); // Existing wedding

      // Make changes that should trigger predictions
      await page.fill('[data-testid="guest-count"]', '200');

      // Wait for real-time prediction update
      await expect(
        page.locator('[data-testid="live-budget-impact"]'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="capacity-warning"]'),
      ).toBeVisible();

      // Verify predictions update as we make changes
      await page.fill('[data-testid="venue-capacity"]', '180');
      await expect(
        page.locator('[data-testid="over-capacity-alert"]'),
      ).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API timeouts gracefully', async ({ page }) => {
      // Simulate slow API by navigating to a page that makes many predictions
      await page.goto('/dashboard/predictions/batch');

      // Start a batch process
      await page.click('[data-testid="large-batch-process"]');

      // Verify loading states and timeout handling
      await expect(
        page.locator('[data-testid="batch-progress"]'),
      ).toBeVisible();

      // Wait for either success or timeout handling
      await page.waitForSelector(
        '[data-testid="batch-complete"], [data-testid="timeout-error"]',
        {
          timeout: 45000,
        },
      );

      // Verify appropriate messaging
      const isComplete = await page
        .locator('[data-testid="batch-complete"]')
        .isVisible();
      const hasTimeout = await page
        .locator('[data-testid="timeout-error"]')
        .isVisible();

      expect(isComplete || hasTimeout).toBe(true);
    });

    test('should handle insufficient data scenarios', async ({ page }) => {
      await page.goto('/dashboard/predictions/new');

      // Try to generate prediction with minimal data
      await page.selectOption(
        '[data-testid="prediction-type"]',
        'vendor_performance',
      );
      await page.fill('[data-testid="vendor-events"]', '1'); // Too few events

      await page.click('[data-testid="generate-prediction"]');

      // Verify appropriate warning/error
      await expect(
        page.locator('[data-testid="insufficient-data-warning"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="data-requirements"]'),
      ).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/predictions');

      // Verify mobile layout
      await expect(
        page.locator('[data-testid="mobile-prediction-nav"]'),
      ).toBeVisible();

      // Test mobile prediction flow
      await page.click('[data-testid="mobile-new-prediction"]');
      await page.selectOption(
        '[data-testid="prediction-type"]',
        'budget_optimization',
      );

      // Fill form on mobile
      await page.fill('[data-testid="budget-input"]', '20000');
      await page.click('[data-testid="mobile-generate"]');

      // Verify mobile results display
      await expect(page.locator('[data-testid="mobile-results"]')).toBeVisible({
        timeout: 30000,
      });
      await expect(
        page.locator('[data-testid="mobile-results-summary"]'),
      ).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible for screen readers', async ({ page }) => {
      await page.goto('/dashboard/predictions');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Verify ARIA labels and roles
      const predictionForm = page.locator('[data-testid="prediction-form"]');
      await expect(predictionForm).toHaveAttribute('role', 'form');
      await expect(predictionForm).toHaveAttribute('aria-label');

      // Test form labels
      const budgetInput = page.locator('[data-testid="budget-input"]');
      await expect(budgetInput).toHaveAttribute('aria-describedby');
      await expect(budgetInput).toHaveAttribute('aria-required', 'true');
    });
  });
});

// Helper functions for E2E tests
async function waitForPredictionComplete(page: Page, timeout = 30000) {
  await page.waitForSelector('[data-testid="prediction-complete"]', {
    timeout,
  });
}

async function verifyPredictionResult(page: Page, predictionType: string) {
  await expect(
    page.locator('[data-testid="prediction-results"]'),
  ).toBeVisible();
  await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
  await expect(
    page.locator(`[data-testid="${predictionType}-specific-results"]`),
  ).toBeVisible();
}

async function setupTestWeddingData(page: Page) {
  // Helper to set up consistent test data across tests
  await page.evaluate((data) => {
    window.localStorage.setItem('testWeddingData', JSON.stringify(data));
  }, sampleWeddingData);
}
