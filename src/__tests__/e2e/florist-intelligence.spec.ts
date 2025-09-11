import { test, expect } from '@playwright/test';

test.describe('Florist Intelligence System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the florist intelligence page
    await page.goto('/dashboard/florist/intelligence');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the main florist intelligence interface', async ({
    page,
  }) => {
    // Check page title and header
    await expect(page.locator('h1')).toContainText(
      'Florist Intelligence System',
    );

    // Check breadcrumb navigation
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Florist Tools')).toBeVisible();
    await expect(page.locator('text=AI Intelligence')).toBeVisible();

    // Check main component is rendered
    await expect(
      page.locator('[role="main"][aria-label="Florist Intelligence System"]'),
    ).toBeVisible();
  });

  test('should show all four main tabs', async ({ page }) => {
    // Check all tabs are visible
    await expect(
      page.locator('button:has-text("🔍 Flower Search")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("🎨 Color Palette")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("💐 Arrangement")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("🌱 Sustainability")'),
    ).toBeVisible();
  });

  test('should allow flower search functionality', async ({ page }) => {
    // Click on flower search tab (should be active by default)
    await page.locator('button:has-text("🔍 Flower Search")').click();

    // Check flower search interface elements
    await expect(page.locator('h3:has-text("AI Flower Search")')).toBeVisible();
    await expect(
      page.locator('label:has-text("Wedding Colors")'),
    ).toBeVisible();
    await expect(page.locator('label:has-text("Wedding Date")')).toBeVisible();
    await expect(page.locator('label:has-text("Wedding Style")')).toBeVisible();

    // Test color picker functionality
    await page.locator('[aria-label="Select wedding colors"]').click();

    // Select a wedding date
    await page.locator('input[type="date"]').fill('2024-06-15');

    // Select a wedding style
    await page.locator('select').first().selectOption('romantic');

    // Click search button (but expect no results in test environment)
    await page.locator('button:has-text("Search Flowers with AI")').click();

    // Verify loading state appears
    await expect(page.locator('text=Searching...')).toBeVisible({
      timeout: 2000,
    });
  });

  test('should allow color palette generation', async ({ page }) => {
    // Click on color palette tab
    await page.locator('button:has-text("🎨 Color Palette")').click();

    // Check color palette interface elements
    await expect(
      page.locator('h3:has-text("AI Color Palette Generator")'),
    ).toBeVisible();
    await expect(page.locator('label:has-text("Base Colors")')).toBeVisible();
    await expect(page.locator('label:has-text("Wedding Style")')).toBeVisible();
    await expect(
      page.locator('label:has-text("Wedding Season")'),
    ).toBeVisible();

    // Test color picker
    const colorPicker = page.locator('[aria-label="Add base color"]');
    await colorPicker.click();

    // Fill in wedding style and season
    await page.locator('#wedding-style').selectOption('romantic');
    await page.locator('#season').selectOption('summer');

    // The generate button should be enabled after filling required fields
    const generateButton = page.locator(
      'button:has-text("Generate AI Color Palette")',
    );
    await expect(generateButton).toBeEnabled();
  });

  test('should show arrangement planner', async ({ page }) => {
    // Click on arrangement tab
    await page.locator('button:has-text("💐 Arrangement")').click();

    // Check arrangement planner interface
    await expect(
      page.locator('h3:has-text("AI Arrangement Planner")'),
    ).toBeVisible();
    await expect(
      page.locator('label:has-text("Arrangement Type")'),
    ).toBeVisible();
    await expect(
      page.locator('h4:has-text("Available Flowers")'),
    ).toBeVisible();
    await expect(
      page.locator('h4:has-text("Arrangement Builder")'),
    ).toBeVisible();

    // Test arrangement type selection
    await page.locator('#arrangement-type').selectOption('bridal_bouquet');

    // Check for empty state message
    await expect(page.locator('text=No flowers selected')).toBeVisible();
  });

  test('should show sustainability analyzer', async ({ page }) => {
    // Click on sustainability tab
    await page.locator('button:has-text("🌱 Sustainability")').click();

    // Check sustainability analyzer interface
    await expect(
      page.locator('h3:has-text("Sustainability Analyzer")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Run Sustainability Analysis")'),
    ).toBeVisible();

    // Check for empty state
    await expect(page.locator('text=No flowers to analyze')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that the interface adapts to mobile
    await expect(page.locator('h1')).toBeVisible();

    // Check that tabs are still functional on mobile
    const tabs = page.locator('button[role="tab"]');
    await expect(tabs).toHaveCount(4);

    // Check mobile navigation helper
    await expect(
      page.locator('button[aria-label="Back to previous page"]'),
    ).toBeVisible();

    // Test tab switching on mobile
    await page.locator('button:has-text("🎨")').click(); // Color palette tab
    await expect(
      page.locator('[aria-label="Color Palette Generator Panel"]'),
    ).toBeVisible();

    await page.locator('button:has-text("💐")').click(); // Arrangement tab
    await expect(
      page.locator('[aria-label="Arrangement Planner Panel"]'),
    ).toBeVisible();

    await page.locator('button:has-text("🌱")').click(); // Sustainability tab
    await expect(
      page.locator('[aria-label="Sustainability Analyzer Panel"]'),
    ).toBeVisible();
  });

  test('should have proper accessibility features', async ({ page }) => {
    // Check ARIA labels and roles
    await expect(page.locator('[role="main"]')).toHaveAttribute(
      'aria-label',
      'Florist Intelligence System',
    );

    // Check tab navigation
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toHaveAttribute('aria-selected');

    // Test keyboard navigation
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected');

    // Check form labels
    await expect(page.locator('label[for="wedding-date"]')).toBeVisible();
    await expect(page.locator('label[for="wedding-style"]')).toBeVisible();

    // Check focus management
    await page.locator('button:has-text("🎨 Color Palette")').click();
    await page.keyboard.press('Tab');
    // Should focus on first interactive element in the panel
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock network errors to test error handling
    await page.route('**/api/florist/**', (route) => route.abort());

    // Try to trigger a search that will fail
    await page.locator('input[type="date"]').fill('2024-06-15');
    await page.locator('select').first().selectOption('romantic');

    await page.locator('button:has-text("Search Flowers with AI")').click();

    // Should show error state (implementation-dependent)
    // This would need to be updated based on actual error handling implementation
  });

  test('should maintain state when switching between tabs', async ({
    page,
  }) => {
    // Fill in flower search criteria
    await page.locator('input[type="date"]').fill('2024-06-15');
    await page.locator('select').first().selectOption('romantic');

    // Switch to color palette tab
    await page.locator('button:has-text("🎨 Color Palette")').click();

    // Fill in color palette data
    await page.locator('#wedding-style').selectOption('romantic');
    await page.locator('#season').selectOption('summer');

    // Switch back to flower search
    await page.locator('button:has-text("🔍 Flower Search")').click();

    // Verify data is still there
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-06-15');
    await expect(page.locator('select').first()).toHaveValue('romantic');
  });
});

test.describe('Florist Intelligence Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard/florist/intelligence');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds (adjust based on requirements)
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle rapid tab switching', async ({ page }) => {
    await page.goto('/dashboard/florist/intelligence');

    // Rapidly switch between tabs
    for (let i = 0; i < 5; i++) {
      await page.locator('button:has-text("🎨 Color Palette")').click();
      await page.locator('button:has-text("💐 Arrangement")').click();
      await page.locator('button:has-text("🌱 Sustainability")').click();
      await page.locator('button:has-text("🔍 Flower Search")').click();
    }

    // Should still be functional
    await expect(page.locator('h3:has-text("AI Flower Search")')).toBeVisible();
  });
});
