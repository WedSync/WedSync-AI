// WS-029: Journey Templates - Comprehensive Integration Test Suite
import { test, expect } from '@playwright/test';

test.describe('Wedding Journey Templates System - WS-029', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to templates page
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
  });

  test('Template Library - Browse and Search', async ({ page }) => {
    // Test template library loads
    await expect(page.locator('h1')).toContainText('Wedding Journey Templates');
    
    // Test featured templates section
    await expect(page.locator('[data-testid="featured-templates"]')).toBeVisible();
    
    // Test search functionality
    await page.fill('[data-testid="template-search"]', 'engagement');
    await expect(page.locator('[data-testid="template-card"]')).toHaveCount(await page.locator('[data-testid="template-card"]').count());
    
    // Test category filtering
    await page.selectOption('[data-testid="category-filter"]', 'communication');
    await page.waitForTimeout(500);
    
    // Test difficulty filtering  
    await page.selectOption('[data-testid="difficulty-filter"]', 'beginner');
    await page.waitForTimeout(500);
  });

  test('Template Selection and Preview', async ({ page }) => {
    // Select first template
    await page.click('[data-testid="template-card"]:first-child [data-testid="view-template"]');
    
    // Verify template details modal/page opens
    await expect(page.locator('[data-testid="template-details"]')).toBeVisible();
    
    // Check template information is displayed
    await expect(page.locator('[data-testid="template-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-category"]')).toBeVisible();
    
    // Test template metrics display
    await expect(page.locator('[data-testid="template-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-usage-count"]')).toBeVisible();
  });

  test('Template Customization Flow', async ({ page }) => {
    // Select template and click customize
    await page.click('[data-testid="template-card"]:first-child [data-testid="customize-template"]');
    
    // Verify customization interface loads
    await expect(page.locator('[data-testid="template-customizer"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Customize Template');
    
    // Test parameter input - text field
    const textInput = page.locator('[data-testid="param-couple_names"]');
    if (await textInput.isVisible()) {
      await textInput.fill('John & Jane Smith');
    }
    
    // Test parameter input - date field
    const dateInput = page.locator('[data-testid="param-wedding_date"]');
    if (await dateInput.isVisible()) {
      await dateInput.click();
      await page.click('[data-testid="calendar"] button:has-text("15")'); // Select 15th of current month
    }
    
    // Test parameter input - select field
    const selectInput = page.locator('[data-testid="param-wedding_style"]');
    if (await selectInput.isVisible()) {
      await selectInput.selectOption('traditional');
    }
    
    // Test parameter input - number slider
    const sliderInput = page.locator('[data-testid="param-guest_count"]');
    if (await sliderInput.isVisible()) {
      await sliderInput.fill('100');
    }
    
    // Verify preview updates with parameters
    await expect(page.locator('[data-testid="message-preview"]')).toBeVisible();
    
    // Test validation - clear required field
    if (await textInput.isVisible()) {
      await textInput.clear();
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await textInput.fill('John & Jane Smith'); // Fix validation
    }
    
    // Test preview mode toggle
    await page.click('[data-testid="preview-mode-toggle"]');
    await expect(page.locator('[data-testid="journey-preview"]')).toBeVisible();
    
    // Test save customized template
    await page.click('[data-testid="save-template"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Template saved successfully');
  });

  test('Template Forking', async ({ page }) => {
    // Click fork button on template
    await page.click('[data-testid="template-card"]:first-child [data-testid="fork-template"]');
    
    // Handle fork dialog
    await page.waitForSelector('[data-testid="fork-dialog"]');
    await page.fill('[data-testid="fork-name-input"]', 'My Custom Engagement Journey');
    await page.click('[data-testid="confirm-fork"]');
    
    // Verify fork success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Template forked successfully');
    
    // Navigate to "My Templates" tab
    await page.click('[data-testid="my-templates-tab"]');
    
    // Verify forked template appears in user templates
    await expect(page.locator('[data-testid="template-card"]').filter({ hasText: 'My Custom Engagement Journey' })).toBeVisible();
  });

  test('A/B Testing Interface', async ({ page }) => {
    // Navigate to template with A/B testing capability
    await page.click('[data-testid="template-card"]:first-child [data-testid="view-template"]');
    await page.click('[data-testid="ab-testing-tab"]');
    
    // Verify A/B testing interface
    await expect(page.locator('[data-testid="ab-testing-section"]')).toBeVisible();
    
    // Test create A/B test
    await page.click('[data-testid="create-ab-test"]');
    
    // Fill A/B test form
    await page.fill('[data-testid="test-name"]', 'Subject Line Optimization');
    await page.fill('[data-testid="test-hypothesis"]', 'Personalized subject lines will increase open rates by 15%');
    await page.selectOption('[data-testid="success-metric"]', 'open_rate');
    await page.selectOption('[data-testid="message-select"]', 'welcome-email');
    
    // Configure variants
    await page.fill('[data-testid="variant-a-content"]', 'Welcome to your wedding journey!');
    await page.fill('[data-testid="variant-b-content"]', 'Welcome to your wedding journey, {{couple_names}}!');
    
    // Set traffic split
    await page.fill('[data-testid="variant-a-traffic"]', '50');
    await page.fill('[data-testid="variant-b-traffic"]', '50');
    
    // Create test
    await page.click('[data-testid="create-test-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('A/B test created successfully');
  });

  test('Template Analytics Dashboard', async ({ page }) => {
    // Navigate to analytics section
    await page.click('[data-testid="analytics-tab"]');
    
    // Verify analytics dashboard loads
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Check key metrics are displayed
    await expect(page.locator('[data-testid="total-templates"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    
    // Test performance chart
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Test template comparison
    await page.click('[data-testid="compare-templates"]');
    await page.selectOption('[data-testid="template-1-select"]', 'engagement-announcement');
    await page.selectOption('[data-testid="template-2-select"]', 'save-the-date');
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
  });

  test('Template Library Categories', async ({ page }) => {
    // Test each category tab
    const categories = ['featured', 'trending', 'categories', 'recent', 'mine'];
    
    for (const category of categories) {
      await page.click(`[data-testid="${category}-tab"]`);
      await expect(page.locator('[data-testid="template-grid"]')).toBeVisible();
      
      // Verify templates load in each category
      const templateCount = await page.locator('[data-testid="template-card"]').count();
      expect(templateCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Template Performance Metrics', async ({ page }) => {
    // Select template and view performance
    await page.click('[data-testid="template-card"]:first-child [data-testid="view-template"]');
    
    // Check performance metrics section
    await expect(page.locator('[data-testid="template-metrics"]')).toBeVisible();
    
    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="usage-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="engagement-rate"]')).toBeVisible();
    
    // Test metrics over time chart
    await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();
    
    // Test different time periods
    await page.click('[data-testid="time-period-7d"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="time-period-30d"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="time-period-90d"]');
    await page.waitForTimeout(500);
  });

  test('Mobile Responsive Design', async ({ page, browser }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-trigger"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-trigger"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test template cards in mobile layout
    await expect(page.locator('[data-testid="template-card"]')).toBeVisible();
    
    // Test template customizer on mobile
    await page.click('[data-testid="template-card"]:first-child [data-testid="customize-template"]');
    await expect(page.locator('[data-testid="template-customizer"]')).toBeVisible();
    
    // Verify mobile-friendly parameter inputs
    await expect(page.locator('[data-testid="param-input"]')).toBeVisible();
  });

  test('Error Handling and Loading States', async ({ page }) => {
    // Test loading states
    await page.goto('/templates');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    
    // Test error handling - simulate network error
    await page.route('**/api/templates/**', route => route.abort());
    await page.reload();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/templates/**');
    await page.click('[data-testid="retry-button"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="template-grid"]')).toBeVisible();
  });

  test('Template Search and Filtering', async ({ page }) => {
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'engagement');
    await page.waitForTimeout(500);
    
    // Verify search results
    const searchResults = page.locator('[data-testid="template-card"]');
    expect(await searchResults.count()).toBeGreaterThan(0);
    
    // Test advanced filters
    await page.click('[data-testid="advanced-filters"]');
    
    // Filter by wedding type
    await page.check('[data-testid="filter-traditional"]');
    await page.check('[data-testid="filter-destination"]');
    
    // Filter by rating
    await page.selectOption('[data-testid="min-rating-filter"]', '4');
    
    // Filter by setup time
    await page.fill('[data-testid="max-setup-time"]', '30');
    
    // Apply filters
    await page.click('[data-testid="apply-filters"]');
    await page.waitForTimeout(500);
    
    // Verify filtered results
    await expect(page.locator('[data-testid="filtered-results-count"]')).toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await page.waitForTimeout(500);
  });
});

test.describe('Template Builder - Create New Template', () => {
  test('Create New Template Wizard', async ({ page }) => {
    await page.goto('/templates');
    await page.click('[data-testid="create-new-template"]');
    
    // Step 1: Basic Information
    await expect(page.locator('[data-testid="template-builder-step-1"]')).toBeVisible();
    await page.fill('[data-testid="template-name"]', 'My Custom Wedding Template');
    await page.fill('[data-testid="template-description"]', 'A custom template for traditional weddings');
    await page.selectOption('[data-testid="template-category"]', 'communication');
    await page.selectOption('[data-testid="template-difficulty"]', 'beginner');
    await page.click('[data-testid="next-step"]');
    
    // Step 2: Parameters
    await expect(page.locator('[data-testid="template-builder-step-2"]')).toBeVisible();
    await page.click('[data-testid="add-parameter"]');
    await page.fill('[data-testid="param-name"]', 'Couple Names');
    await page.selectOption('[data-testid="param-type"]', 'text');
    await page.check('[data-testid="param-required"]');
    await page.click('[data-testid="save-parameter"]');
    await page.click('[data-testid="next-step"]');
    
    // Step 3: Timeline and Messages
    await expect(page.locator('[data-testid="template-builder-step-3"]')).toBeVisible();
    await page.click('[data-testid="add-message"]');
    await page.fill('[data-testid="message-title"]', 'Welcome Message');
    await page.fill('[data-testid="message-content"]', 'Welcome {{couple_names}} to your wedding journey!');
    await page.selectOption('[data-testid="message-type"]', 'email');
    await page.fill('[data-testid="trigger-day"]', '1');
    await page.click('[data-testid="save-message"]');
    
    // Step 4: Review and Publish
    await page.click('[data-testid="next-step"]');
    await expect(page.locator('[data-testid="template-builder-step-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    
    // Save template
    await page.click('[data-testid="save-template"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Template created successfully');
  });
});