// WS-254: AI Menu Generator Integration Tests
import { test, expect } from '@playwright/test';

test.describe('AI Menu Generator Integration Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: 'supplier-123',
            email: 'caterer@example.com',
            role: 'supplier',
          },
        }),
      );
    });
  });

  test.describe('AI Menu Generation Workflow', () => {
    test('should complete full AI menu generation workflow', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Wait for component to load
      await expect(page.getByText('AI Menu Generator')).toBeVisible();

      // Step 1: Select wedding and basic parameters
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.fill('[data-testid="guest-count-input"]', '120');
      await page.selectOption('[data-testid="menu-style-select"]', 'buffet');
      await page.selectOption('[data-testid="meal-type-select"]', 'lunch');
      await page.fill('[data-testid="budget-input"]', '45');

      // Step 2: Configure dietary requirements
      await page.check('[data-testid="dietary-vegetarian"]');
      await page.check('[data-testid="dietary-vegan"]');
      await page.check('[data-testid="dietary-gluten-free"]');

      // Add specific allergies
      await page.click('[data-testid="add-allergy-btn"]');
      await page.fill('[data-testid="allergy-input"]', 'nuts');
      await page.click('[data-testid="confirm-allergy-btn"]');

      // Step 3: Set cultural and seasonal preferences
      await page.click('[data-testid="advanced-options-toggle"]');
      await page.selectOption(
        '[data-testid="cultural-preferences"]',
        'mediterranean',
      );
      await page.check('[data-testid="seasonal-autumn"]');
      await page.check('[data-testid="prefer-local"]');

      // Step 4: Generate menu with AI
      await page.click('[data-testid="generate-menu-btn"]');

      // Verify loading state
      await expect(
        page.getByText('Generating personalized menu...'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="ai-progress-bar"]'),
      ).toBeVisible();

      // Wait for AI generation to complete (up to 30 seconds)
      await page.waitForSelector('[data-testid="menu-results"]', {
        timeout: 35000,
      });

      // Step 5: Verify generated menu structure
      await expect(
        page.locator('[data-testid="appetizers-section"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="mains-section"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="desserts-section"]'),
      ).toBeVisible();

      // Verify menu items have required information
      const menuItems = page.locator('[data-testid="menu-item"]');
      await expect(menuItems).toHaveCount.atLeast(6); // At least 2 per section

      // Check first menu item details
      const firstItem = menuItems.first();
      await expect(
        firstItem.locator('[data-testid="item-name"]'),
      ).toBeVisible();
      await expect(
        firstItem.locator('[data-testid="item-description"]'),
      ).toBeVisible();
      await expect(
        firstItem.locator('[data-testid="item-price"]'),
      ).toBeVisible();
      await expect(
        firstItem.locator('[data-testid="compliance-score"]'),
      ).toBeVisible();

      // Step 6: Verify compliance analysis
      await expect(
        page.locator('[data-testid="overall-compliance"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="dietary-coverage"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="allergen-warnings"]'),
      ).toBeVisible();

      // Step 7: Test menu customization
      await page.click('[data-testid="customize-menu-btn"]');
      await expect(
        page.locator('[data-testid="customization-panel"]'),
      ).toBeVisible();

      // Replace a menu item
      await page.click('[data-testid="replace-item-btn"]:first-of-type');
      await expect(page.getByText('Finding alternative...')).toBeVisible();

      // Wait for replacement
      await page.waitForSelector('[data-testid="replacement-suggestions"]', {
        timeout: 15000,
      });
      await page.click('[data-testid="select-replacement"]:first-of-type');

      // Verify menu is updated
      await expect(page.getByText('Menu updated successfully')).toBeVisible();
    });

    test('should handle dietary requirement conflicts intelligently', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Mock conflicting dietary requirements
      await page.route('**/api/catering/dietary**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              requirements: [
                {
                  id: 'req-1',
                  guest_name: 'Guest A',
                  category: 'diet',
                  severity: 4,
                  notes: 'Strict vegan diet',
                },
                {
                  id: 'req-2',
                  guest_name: 'Guest B',
                  category: 'preference',
                  severity: 3,
                  notes: 'Loves meat dishes',
                },
              ],
            },
          }),
        });
      });

      // Generate menu with conflicting requirements
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Verify AI handles conflicts
      await page.waitForSelector('[data-testid="conflict-resolution"]', {
        timeout: 30000,
      });

      // Check conflict notification
      await expect(page.getByText('Dietary conflicts detected')).toBeVisible();
      await expect(
        page.locator('[data-testid="conflict-suggestions"]'),
      ).toBeVisible();

      // Verify AI suggests multiple options
      await expect(
        page.getByText('Recommended: Separate stations'),
      ).toBeVisible();
      await expect(
        page.getByText('Alternative: Flexible base dishes'),
      ).toBeVisible();
    });

    test('should provide detailed nutritional and allergen information', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Generate menu
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for results
      await page.waitForSelector('[data-testid="menu-results"]');

      // Click on menu item for detailed view
      await page.click('[data-testid="menu-item"]:first-of-type');

      // Verify detailed information modal
      await expect(
        page.locator('[data-testid="item-detail-modal"]'),
      ).toBeVisible();

      // Check nutritional information
      await expect(page.locator('[data-testid="calories"]')).toBeVisible();
      await expect(page.locator('[data-testid="protein"]')).toBeVisible();
      await expect(page.locator('[data-testid="carbohydrates"]')).toBeVisible();
      await expect(page.locator('[data-testid="fat"]')).toBeVisible();

      // Check allergen information
      await expect(page.locator('[data-testid="allergen-list"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="allergen-warnings"]'),
      ).toBeVisible();

      // Check ingredient list
      await expect(
        page.locator('[data-testid="ingredients-list"]'),
      ).toBeVisible();

      // Verify preparation notes
      await expect(
        page.locator('[data-testid="preparation-notes"]'),
      ).toBeVisible();
    });

    test('should generate menu variations for different budgets', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Test budget variations
      const budgets = ['25', '50', '100'];

      for (const budget of budgets) {
        // Set budget
        await page.fill('[data-testid="budget-input"]', budget);
        await page.selectOption(
          '[data-testid="wedding-select"]',
          'wedding-123',
        );

        // Generate menu
        await page.click('[data-testid="generate-menu-btn"]');

        // Wait for results
        await page.waitForSelector('[data-testid="menu-results"]');

        // Verify budget-appropriate items
        const totalCost = await page
          .locator('[data-testid="total-cost"]')
          .textContent();
        const expectedMaxCost = parseInt(budget) * 120; // 120 guests

        expect(parseInt(totalCost || '0')).toBeLessThanOrEqual(expectedMaxCost);

        // Clear results for next iteration
        await page.click('[data-testid="clear-results-btn"]');
      }
    });
  });

  test.describe('AI Quality and Compliance Scoring', () => {
    test('should calculate and display accurate compliance scores', async ({
      page,
    }) => {
      // Mock dietary requirements with known allergens
      await page.route('**/api/catering/dietary**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              requirements: [
                {
                  id: 'req-1',
                  category: 'allergy',
                  severity: 5,
                  notes: 'Severe shellfish allergy',
                },
                {
                  id: 'req-2',
                  category: 'diet',
                  severity: 4,
                  notes: 'Gluten-free celiac disease',
                },
              ],
            },
          }),
        });
      });

      await page.goto('http://localhost:3000/catering/menu-generator');

      // Generate menu
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for compliance analysis
      await page.waitForSelector('[data-testid="compliance-analysis"]');

      // Verify compliance score calculation
      const complianceScore = await page
        .locator('[data-testid="overall-compliance-score"]')
        .textContent();
      expect(parseInt(complianceScore || '0')).toBeGreaterThan(0);
      expect(parseInt(complianceScore || '0')).toBeLessThanOrEqual(100);

      // Verify detailed compliance breakdown
      await expect(
        page.locator('[data-testid="allergy-compliance"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="diet-compliance"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="preference-compliance"]'),
      ).toBeVisible();

      // Check risk indicators
      await expect(
        page.locator('[data-testid="high-risk-indicators"]'),
      ).toBeVisible();
      await expect(page.getByText('Severe allergy detected')).toBeVisible();
    });

    test('should flag potential cross-contamination risks', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Add severe allergy requirements
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="add-allergy-btn"]');
      await page.fill('[data-testid="allergy-input"]', 'nuts');
      await page.selectOption('[data-testid="allergy-severity"]', '5');
      await page.click('[data-testid="confirm-allergy-btn"]');

      // Generate menu
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for cross-contamination analysis
      await page.waitForSelector(
        '[data-testid="cross-contamination-analysis"]',
      );

      // Verify warnings
      await expect(
        page.locator('[data-testid="contamination-warnings"]'),
      ).toBeVisible();
      await expect(
        page.getByText('Separate preparation required'),
      ).toBeVisible();
      await expect(page.getByText('Dedicated equipment needed')).toBeVisible();

      // Check preparation protocols
      await expect(
        page.locator('[data-testid="safety-protocols"]'),
      ).toBeVisible();
      await expect(
        page.getByText('Clean all surfaces before preparation'),
      ).toBeVisible();
    });
  });

  test.describe('Menu Export and Sharing', () => {
    test('should export menu to various formats', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Generate a menu
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');
      await page.waitForSelector('[data-testid="menu-results"]');

      // Test PDF export
      const [download1] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-pdf-btn"]'),
      ]);

      expect(download1.suggestedFilename()).toContain('.pdf');

      // Test CSV export for supplier
      const [download2] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv-btn"]'),
      ]);

      expect(download2.suggestedFilename()).toContain('.csv');

      // Test share with couple functionality
      await page.click('[data-testid="share-with-couple-btn"]');

      // Verify sharing modal
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      await page.fill('[data-testid="couple-email"]', 'couple@example.com');
      await page.fill(
        '[data-testid="share-message"]',
        'Here is your wedding menu proposal',
      );
      await page.click('[data-testid="send-share-btn"]');

      // Verify success
      await expect(page.getByText('Menu shared successfully')).toBeVisible();
    });

    test('should allow saving menu as template', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Generate menu
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');
      await page.waitForSelector('[data-testid="menu-results"]');

      // Save as template
      await page.click('[data-testid="save-template-btn"]');

      // Fill template details
      await page.fill(
        '[data-testid="template-name"]',
        'Mediterranean Buffet Menu',
      );
      await page.fill(
        '[data-testid="template-description"]',
        'Perfect for outdoor spring weddings',
      );
      await page.selectOption('[data-testid="template-category"]', 'buffet');

      // Add template tags
      await page.fill(
        '[data-testid="template-tags"]',
        'mediterranean, spring, vegetarian-friendly',
      );

      // Save template
      await page.click('[data-testid="confirm-save-template-btn"]');

      // Verify success
      await expect(page.getByText('Template saved successfully')).toBeVisible();

      // Verify template appears in library
      await page.click('[data-testid="template-library-btn"]');
      await expect(page.getByText('Mediterranean Buffet Menu')).toBeVisible();
    });
  });

  test.describe('AI Error Handling and Recovery', () => {
    test('should handle AI service failures gracefully', async ({ page }) => {
      // Mock AI service failure
      await page.route('**/api/catering/menu/generate', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'AI service temporarily unavailable',
            code: 'AI_SERVICE_ERROR',
          }),
        });
      });

      await page.goto('http://localhost:3000/catering/menu-generator');

      // Attempt menu generation
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Verify error handling
      await expect(
        page.getByText('AI menu generation is temporarily unavailable'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="fallback-options"]'),
      ).toBeVisible();

      // Verify fallback template suggestions
      await expect(
        page.getByText('Try these pre-designed templates'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="template-suggestions"]'),
      ).toBeVisible();

      // Test retry mechanism
      await page.click('[data-testid="retry-ai-btn"]');
      await expect(page.getByText('Retrying AI generation...')).toBeVisible();
    });

    test('should handle invalid AI responses', async ({ page }) => {
      // Mock invalid AI response
      await page.route('**/api/catering/menu/generate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              menu_items: 'invalid_format', // Invalid format
              compliance_score: 'not_a_number',
            },
          }),
        });
      });

      await page.goto('http://localhost:3000/catering/menu-generator');

      // Attempt generation
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Verify error handling
      await expect(
        page.getByText('Generated menu format is invalid'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="manual-creation-option"]'),
      ).toBeVisible();

      // Verify manual creation fallback
      await page.click('[data-testid="create-manual-menu-btn"]');
      await expect(
        page.locator('[data-testid="manual-menu-builder"]'),
      ).toBeVisible();
    });

    test('should handle timeout scenarios', async ({ page }) => {
      // Mock slow AI response
      await page.route('**/api/catering/menu/generate', async (route) => {
        // Delay response beyond timeout
        await new Promise((resolve) => setTimeout(resolve, 35000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      });

      await page.goto('http://localhost:3000/catering/menu-generator');

      // Start generation
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for timeout handling
      await page.waitForSelector('[data-testid="timeout-message"]', {
        timeout: 35000,
      });

      // Verify timeout message
      await expect(
        page.getByText('Menu generation is taking longer than expected'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="continue-waiting-btn"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="cancel-generation-btn"]'),
      ).toBeVisible();

      // Test continue waiting
      await page.click('[data-testid="continue-waiting-btn"]');
      await expect(page.getByText('Continuing to generate...')).toBeVisible();
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should handle concurrent menu generations', async ({
      page,
      context,
    }) => {
      // Create multiple pages for concurrent testing
      const page2 = await context.newPage();
      const page3 = await context.newPage();

      // Navigate all pages to menu generator
      await page.goto('http://localhost:3000/catering/menu-generator');
      await page2.goto('http://localhost:3000/catering/menu-generator');
      await page3.goto('http://localhost:3000/catering/menu-generator');

      // Start concurrent generations
      const promises = [
        page.selectOption('[data-testid="wedding-select"]', 'wedding-123'),
        page2.selectOption('[data-testid="wedding-select"]', 'wedding-456'),
        page3.selectOption('[data-testid="wedding-select"]', 'wedding-789'),
      ];

      await Promise.all(promises);

      // Click generate on all pages simultaneously
      await Promise.all([
        page.click('[data-testid="generate-menu-btn"]'),
        page2.click('[data-testid="generate-menu-btn"]'),
        page3.click('[data-testid="generate-menu-btn"]'),
      ]);

      // Verify all generations complete successfully
      await Promise.all([
        page.waitForSelector('[data-testid="menu-results"]', {
          timeout: 45000,
        }),
        page2.waitForSelector('[data-testid="menu-results"]', {
          timeout: 45000,
        }),
        page3.waitForSelector('[data-testid="menu-results"]', {
          timeout: 45000,
        }),
      ]);

      // Verify each page has unique results
      const menu1 = await page
        .locator('[data-testid="menu-item"]:first-of-type')
        .textContent();
      const menu2 = await page2
        .locator('[data-testid="menu-item"]:first-of-type')
        .textContent();
      const menu3 = await page3
        .locator('[data-testid="menu-item"]:first-of-type')
        .textContent();

      // Results should be different (or at least not all identical)
      expect(menu1 !== menu2 || menu2 !== menu3).toBe(true);
    });
  });
});
