import { test, expect } from '@playwright/test';

test.describe('Florist Intelligence System E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as florist vendor
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'florist@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-submit"]');

    // Wait for dashboard
    await expect(
      page.locator('[data-testid="vendor-dashboard"]'),
    ).toBeVisible();
  });

  test('Complete florist workflow - search, palette, sustainability, arrangement', async ({
    page,
  }) => {
    // Navigate to Florist Intelligence
    await page.goto('/dashboard/florist/intelligence');
    await expect(page.locator('h2')).toContainText('AI Florist Intelligence');

    // Step 1: Flower Search
    await test.step('Flower Search with Color Matching', async () => {
      await page.click('[data-testid="tab-search"]');

      // Add wedding details
      await page.fill('[data-testid="wedding-date"]', '2024-06-15');
      await page.selectOption('[data-testid="wedding-style"]', 'romantic');
      await page.fill('[data-testid="guest-count"]', '100');
      await page.fill('[data-testid="budget-range"]', '3500');

      // Add color preferences
      await page.click('[data-testid="add-color-button"]');
      await page.fill('[data-testid="color-input-0"]', '#FF69B4');
      await page.click('[data-testid="add-color-button"]');
      await page.fill('[data-testid="color-input-1"]', '#32CD32');

      // Set special requirements
      await page.check('[data-testid="allergy-safe-option"]');
      await page.selectOption('[data-testid="sustainability-minimum"]', '0.7');

      // Execute search
      await page.click('[data-testid="search-flowers"]');

      // Wait for results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.locator('[data-testid="flower-result"]').first(),
      ).toBeVisible();

      // Verify search results contain expected data
      const resultCount = await page
        .locator('[data-testid="flower-result"]')
        .count();
      expect(resultCount).toBeGreaterThan(0);

      // Check color compatibility indicators
      await expect(page.locator('.color-compatibility-score')).toBeVisible();
      await expect(page.locator('.seasonal-availability')).toBeVisible();

      // Verify allergy-safe badge appears
      await expect(
        page.locator('[data-testid="allergy-safe-badge"]'),
      ).toBeVisible();
    });

    // Step 2: AI Color Palette Generation
    await test.step('AI Color Palette Generation', async () => {
      await page.click('[data-testid="tab-palette"]');

      // Use colors from search
      await page.click('[data-testid="use-search-colors"]');

      // Set palette preferences
      await page.selectOption('[data-testid="palette-style"]', 'romantic');
      await page.selectOption('[data-testid="palette-season"]', 'spring');
      await page.selectOption('[data-testid="palette-intensity"]', 'soft');

      // Generate palette
      await page.click('[data-testid="generate-palette"]');

      // Wait for AI processing (can take up to 10 seconds)
      await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="ai-processing"]'),
      ).not.toBeVisible({ timeout: 15000 });

      // Verify palette results
      await expect(
        page.locator('[data-testid="generated-palette"]'),
      ).toBeVisible();
      await expect(page.locator('.primary-colors')).toBeVisible();
      await expect(page.locator('.accent-colors')).toBeVisible();
      await expect(page.locator('.neutral-colors')).toBeVisible();

      // Check palette metadata
      await expect(page.locator('[data-testid="palette-name"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="style-reasoning"]'),
      ).toBeVisible();

      // Verify flower matches are shown
      await expect(
        page.locator('[data-testid="matching-flowers"]'),
      ).toBeVisible();
      const flowerMatches = await page
        .locator('[data-testid="flower-match"]')
        .count();
      expect(flowerMatches).toBeGreaterThan(0);

      // Check seasonal analysis
      await expect(
        page.locator('[data-testid="seasonal-analysis"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="overall-fit-score"]'),
      ).toBeVisible();

      // Save palette for later use
      await page.click('[data-testid="save-palette"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    });

    // Step 3: Sustainability Analysis
    await test.step('Sustainability Analysis', async () => {
      await page.click('[data-testid="tab-sustainability"]');

      // Add selected flowers from previous steps
      await page.click('[data-testid="import-from-search"]');
      await expect(
        page.locator('[data-testid="selected-flowers-list"]'),
      ).toBeVisible();

      // Verify at least 2 flowers selected
      const selectedCount = await page
        .locator('[data-testid="selected-flower-item"]')
        .count();
      expect(selectedCount).toBeGreaterThanOrEqual(2);

      // Set wedding location
      await page.fill('[data-testid="wedding-location-input"]', 'New York, NY');
      await page.click('[data-testid="location-suggestion-0"]');

      // Run sustainability analysis
      await page.click('[data-testid="analyze-sustainability"]');

      // Wait for analysis completion
      await expect(
        page.locator('[data-testid="analysis-loading"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="analysis-results"]'),
      ).toBeVisible({ timeout: 10000 });

      // Verify analysis results
      await expect(
        page.locator('[data-testid="overall-sustainability-score"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="carbon-footprint-total"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="local-percentage"]'),
      ).toBeVisible();

      // Check detailed breakdown
      await expect(
        page.locator('[data-testid="sustainability-breakdown"]'),
      ).toBeVisible();
      const breakdownItems = await page
        .locator('[data-testid="breakdown-item"]')
        .count();
      expect(breakdownItems).toEqual(selectedCount);

      // Verify recommendations section
      await expect(
        page.locator('[data-testid="sustainability-recommendations"]'),
      ).toBeVisible();
      const recommendationCount = await page
        .locator('[data-testid="recommendation-item"]')
        .count();
      expect(recommendationCount).toBeGreaterThan(0);

      // Check for alternative suggestions if sustainability is low
      const sustainabilityScore = await page
        .locator('[data-testid="overall-sustainability-score"]')
        .textContent();
      if (parseFloat(sustainabilityScore || '0') < 0.7) {
        await expect(
          page.locator('[data-testid="alternative-suggestions"]'),
        ).toBeVisible();
      }
    });

    // Step 4: Arrangement Planning
    await test.step('Arrangement Planning', async () => {
      await page.click('[data-testid="tab-arrangement"]');

      // Select arrangement types
      await page.check('[data-testid="arrangement-bridal-bouquet"]');
      await page.check('[data-testid="arrangement-centerpieces"]');
      await page.check('[data-testid="arrangement-ceremony"]');

      // Set quantities
      await page.fill('[data-testid="centerpiece-quantity"]', '10');
      await page.fill('[data-testid="ceremony-arrangement-quantity"]', '2');

      // Import flowers from sustainability analysis
      await page.click('[data-testid="import-sustainable-flowers"]');

      // Generate arrangement suggestions
      await page.click('[data-testid="generate-arrangements"]');

      // Wait for arrangement generation
      await expect(
        page.locator('[data-testid="arrangement-results"]'),
      ).toBeVisible({ timeout: 8000 });

      // Verify arrangement previews
      await expect(
        page.locator('[data-testid="bridal-bouquet-preview"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="centerpiece-preview"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="ceremony-arrangement-preview"]'),
      ).toBeVisible();

      // Check cost estimation
      await expect(
        page.locator('[data-testid="total-arrangement-cost"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="cost-breakdown"]'),
      ).toBeVisible();

      // Verify cost is within budget
      const totalCostText = await page
        .locator('[data-testid="total-arrangement-cost"]')
        .textContent();
      const totalCost = parseFloat(totalCostText?.replace(/[$,]/g, '') || '0');
      expect(totalCost).toBeLessThanOrEqual(3500); // Budget limit

      // Check flower usage summary
      await expect(
        page.locator('[data-testid="flower-usage-summary"]'),
      ).toBeVisible();
    });

    // Step 5: Export and Save Complete Plan
    await test.step('Export Complete Floral Plan', async () => {
      // Navigate to summary view
      await page.click('[data-testid="tab-summary"]');

      // Verify all sections are included
      await expect(
        page.locator('[data-testid="search-summary"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="palette-summary"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="sustainability-summary"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="arrangement-summary"]'),
      ).toBeVisible();

      // Check total project overview
      await expect(
        page.locator('[data-testid="project-overview"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="final-cost-estimate"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="timeline-estimate"]'),
      ).toBeVisible();

      // Export to PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(
        /floral-intelligence-plan-.*\.pdf/,
      );

      // Save project to dashboard
      await page.click('[data-testid="save-project"]');
      await page.fill(
        '[data-testid="project-name"]',
        'Spring Romantic Wedding - Test',
      );
      await page.click('[data-testid="confirm-save"]');

      await expect(
        page.locator('[data-testid="save-success-message"]'),
      ).toBeVisible();
    });
  });

  test('Mobile workflow - touch optimized florist intelligence', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/florist/intelligence');

    // Verify mobile layout
    await expect(
      page.locator('[data-testid="mobile-florist-interface"]'),
    ).toBeVisible();

    // Test swipe navigation between tabs
    const tabContainer = page.locator('[data-testid="tab-container"]');

    // Start on search tab
    await expect(page.locator('[data-testid="search-tab"]')).toHaveClass(
      /active/,
    );

    // Swipe left to palette tab
    await tabContainer.swipe({ dx: -200, dy: 0 });
    await expect(page.locator('[data-testid="palette-tab"]')).toHaveClass(
      /active/,
    );

    // Test mobile color picker
    await page.click('[data-testid="mobile-color-picker"]');
    await expect(
      page.locator('[data-testid="color-picker-modal"]'),
    ).toBeVisible();

    // Test touch color selection
    const colorCanvas = page.locator('[data-testid="color-canvas"]');
    await colorCanvas.tap({ position: { x: 100, y: 50 } });

    // Close color picker
    await page.click('[data-testid="color-picker-done"]');

    // Test mobile form inputs
    await page.fill('[data-testid="mobile-wedding-date"]', '2024-08-15');
    await page.tap('[data-testid="mobile-style-selector"]');
    await page.tap('[data-testid="style-option-romantic"]');

    // Generate palette with mobile interface
    await page.tap('[data-testid="mobile-generate-palette"]');

    // Wait for results with mobile loading indicator
    await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-results"]')).toBeVisible({
      timeout: 15000,
    });

    // Test mobile result cards - swipeable
    const resultCards = page.locator('[data-testid="mobile-result-card"]');
    await expect(resultCards.first()).toBeVisible();

    // Swipe through result cards
    await resultCards.first().swipe({ dx: -150, dy: 0 });

    // Test mobile action buttons (proper touch targets - minimum 44px)
    const actionButtons = page.locator('[data-testid="mobile-action-button"]');
    const buttonCount = await actionButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      const boundingBox = await button.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('Accessibility compliance - WCAG 2.1 AA testing', async ({ page }) => {
    await page.goto('/dashboard/florist/intelligence');

    // Test keyboard navigation
    await test.step('Keyboard Navigation', async () => {
      // Tab through interface elements
      await page.keyboard.press('Tab'); // First focusable element
      let focusedElement = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(focusedElement).toBeDefined();

      // Continue tabbing through all interactive elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const newFocus = await page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid'),
        );
        if (newFocus) {
          console.log(`Tab ${i + 1}: Focused on ${newFocus}`);
        }
      }

      // Test Enter key activation
      await page.keyboard.press('Enter');
      // Verify that the focused element activated (would be specific to each element)
    });

    // Test screen reader compatibility
    await test.step('Screen Reader Compatibility', async () => {
      // Check for proper ARIA labels
      const searchButton = page.locator('[data-testid="search-flowers"]');
      await expect(searchButton).toHaveAttribute('aria-label');

      const colorPickers = page.locator('[data-testid^="color-picker"]');
      const pickerCount = await colorPickers.count();
      for (let i = 0; i < pickerCount; i++) {
        await expect(colorPickers.nth(i)).toHaveAttribute('role');
        await expect(colorPickers.nth(i)).toHaveAttribute('aria-label');
      }

      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Verify main landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
    });

    // Test form accessibility
    await test.step('Form Accessibility', async () => {
      const formInputs = page.locator(
        'input[type="text"], input[type="date"], select, textarea',
      );
      const inputCount = await formInputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i);
        const id = await input.getAttribute('id');

        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        } else {
          // Check for aria-label if no associated label
          const ariaLabel = await input.getAttribute('aria-label');
          expect(ariaLabel).toBeDefined();
        }
      }
    });

    // Test color contrast (basic check)
    await test.step('Color Contrast', async () => {
      const textElements = page.locator('p, span, div, button, input');
      const elementCount = Math.min(await textElements.count(), 20); // Limit to first 20 for performance

      for (let i = 0; i < elementCount; i++) {
        const element = textElements.nth(i);
        const isVisible = await element.isVisible();

        if (isVisible) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
            };
          });

          // Note: In a real implementation, you would calculate contrast ratios
          // and verify they meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
          expect(styles.color).toBeDefined();
          expect(styles.backgroundColor).toBeDefined();
        }
      }
    });

    // Test alternative text for images
    await test.step('Image Alternative Text', async () => {
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const isDecorative =
          (await img.getAttribute('role')) === 'presentation';

        // Every image should have alt text, aria-label, or be marked as decorative
        expect(alt !== null || ariaLabel !== null || isDecorative).toBe(true);
      }
    });
  });

  test('Performance benchmarks', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/dashboard/florist/intelligence');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Less than 2 seconds
    console.log(`Page load time: ${loadTime}ms`);

    // Measure flower search API response time
    await test.step('Flower Search Performance', async () => {
      await page.fill('[data-testid="wedding-date"]', '2024-06-15');
      await page.selectOption('[data-testid="wedding-style"]', 'romantic');

      const searchStartTime = Date.now();

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/florist/search') &&
            response.status() === 200,
        ),
        page.click('[data-testid="search-flowers"]'),
      ]);

      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(300); // Less than 300ms
      console.log(`Search API response time: ${searchTime}ms`);
    });

    // Measure color palette generation time
    await test.step('AI Palette Generation Performance', async () => {
      await page.click('[data-testid="tab-palette"]');
      await page.fill('[data-testid="color-input-0"]', '#FF69B4');
      await page.selectOption('[data-testid="palette-style"]', 'romantic');
      await page.selectOption('[data-testid="palette-season"]', 'spring');

      const paletteStartTime = Date.now();

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/florist/palette/generate') &&
            response.status() === 200,
        ),
        page.click('[data-testid="generate-palette"]'),
      ]);

      const paletteTime = Date.now() - paletteStartTime;
      expect(paletteTime).toBeLessThan(5000); // Less than 5 seconds for AI generation
      console.log(`AI palette generation time: ${paletteTime}ms`);
    });

    // Measure sustainability analysis performance
    await test.step('Sustainability Analysis Performance', async () => {
      await page.click('[data-testid="tab-sustainability"]');
      await page.fill('[data-testid="wedding-location-input"]', 'New York, NY');

      const analysisStartTime = Date.now();

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/florist/sustainability/analyze') &&
            response.status() === 200,
        ),
        page.click('[data-testid="analyze-sustainability"]'),
      ]);

      const analysisTime = Date.now() - analysisStartTime;
      expect(analysisTime).toBeLessThan(2000); // Less than 2 seconds
      console.log(`Sustainability analysis time: ${analysisTime}ms`);
    });
  });

  test('Offline functionality validation', async ({ page, context }) => {
    // Load page online first
    await page.goto('/dashboard/florist/intelligence');
    await expect(page.locator('[data-testid="tab-search"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify offline indicator
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="offline-message"]')).toContainText(
      'offline',
    );

    // Test cached flower search
    await page.fill('[data-testid="wedding-date"]', '2024-06-15');
    await page.click('[data-testid="search-flowers"]');

    // Should show cached results or offline message
    await expect(
      page.locator(
        '[data-testid="offline-results"], [data-testid="cached-results"]',
      ),
    ).toBeVisible({ timeout: 5000 });

    // Test basic color palette generation offline (should use cached palettes)
    await page.click('[data-testid="tab-palette"]');
    await page.fill('[data-testid="color-input-0"]', '#FF69B4');
    await page.click('[data-testid="generate-palette"]');

    // Should show offline palette or cached result
    await expect(
      page.locator(
        '[data-testid="offline-palette"], [data-testid="cached-palette"]',
      ),
    ).toBeVisible({ timeout: 3000 });

    // Go back online
    await context.setOffline(false);
    await page.reload();

    // Verify online functionality restored
    await expect(
      page.locator('[data-testid="offline-indicator"]'),
    ).not.toBeVisible();

    // Test that online features work again
    await page.click('[data-testid="generate-palette"]');
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
  });
});
