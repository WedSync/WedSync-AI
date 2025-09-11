// WS-254: Dietary Management Integration Tests
import { test, expect } from '@playwright/test';

test.describe('Dietary Management User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'supplier',
          },
        }),
      );
    });
  });

  test.describe('Dietary Management Dashboard', () => {
    test('should load dashboard and display key metrics', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for dashboard to load
      await expect(page.getByText('Dietary Management')).toBeVisible();

      // Check key dashboard elements
      await expect(page.getByText('Risk Assessment')).toBeVisible();
      await expect(page.getByText('Compliance Score')).toBeVisible();
      await expect(page.getByText('Guest Requirements')).toBeVisible();

      // Verify metrics cards are displayed
      await expect(
        page.locator('[data-testid="total-requirements"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="high-risk-count"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="compliance-percentage"]'),
      ).toBeVisible();
    });

    test('should filter dietary requirements by category', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for data to load
      await page.waitForSelector('[data-testid="dietary-table"]');

      // Click on allergy filter
      await page.click('[data-testid="filter-allergy"]');

      // Verify filtered results
      const rows = page.locator('[data-testid="dietary-row"]');
      await expect(rows.first()).toContainText('allergy');

      // Test severity filter
      await page.click('[data-testid="severity-filter"]');
      await page.selectOption('[data-testid="severity-filter"]', '5');

      // Verify high-severity requirements are shown
      await expect(page.locator('[data-testid="severity-5"]')).toBeVisible();
    });

    test('should display risk warnings for high-severity requirements', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="risk-assessment"]');

      // Check for risk warnings
      const riskWarnings = page.locator('[data-testid="risk-warning"]');
      const warningCount = await riskWarnings.count();

      if (warningCount > 0) {
        await expect(riskWarnings.first()).toContainText('High Risk');
        await expect(
          page.getByText('Emergency protocols required'),
        ).toBeVisible();
      }
    });
  });

  test.describe('Create New Dietary Requirement', () => {
    test('should successfully create a new dietary requirement', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Click Add New button
      await page.click('[data-testid="add-requirement-btn"]');

      // Fill out the form
      await page.fill('[data-testid="guest-name-input"]', 'John Doe');
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.selectOption('[data-testid="category-select"]', 'allergy');
      await page.fill('[data-testid="severity-input"]', '4');
      await page.fill(
        '[data-testid="notes-textarea"]',
        'Severe nut allergy - EpiPen required',
      );
      await page.fill(
        '[data-testid="emergency-contact-input"]',
        '+44123456789',
      );

      // Submit the form
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify success message
      await expect(
        page.getByText('Dietary requirement created successfully'),
      ).toBeVisible();

      // Verify requirement appears in table
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Severe nut allergy')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Click Add New button
      await page.click('[data-testid="add-requirement-btn"]');

      // Try to submit empty form
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify validation errors
      await expect(page.getByText('Guest name is required')).toBeVisible();
      await expect(
        page.getByText('Wedding selection is required'),
      ).toBeVisible();
      await expect(page.getByText('Category is required')).toBeVisible();
    });

    test('should require emergency contact for high-severity requirements', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Click Add New button
      await page.click('[data-testid="add-requirement-btn"]');

      // Fill form with high severity but no emergency contact
      await page.fill('[data-testid="guest-name-input"]', 'Jane Doe');
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.selectOption('[data-testid="category-select"]', 'allergy');
      await page.fill('[data-testid="severity-input"]', '5');
      await page.fill(
        '[data-testid="notes-textarea"]',
        'Life-threatening allergy',
      );

      // Try to submit without emergency contact
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify validation error
      await expect(
        page.getByText(
          'Emergency contact is required for high-severity requirements',
        ),
      ).toBeVisible();
    });
  });

  test.describe('Edit Dietary Requirement', () => {
    test('should successfully edit an existing requirement', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for table to load
      await page.waitForSelector('[data-testid="dietary-table"]');

      // Click edit button on first row
      await page.click('[data-testid="edit-btn"]:first-of-type');

      // Update the notes field
      await page.fill(
        '[data-testid="notes-textarea"]',
        'Updated dietary requirement notes',
      );

      // Update severity
      await page.fill('[data-testid="severity-input"]', '3');

      // Save changes
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify success message
      await expect(
        page.getByText('Dietary requirement updated successfully'),
      ).toBeVisible();

      // Verify changes are reflected
      await expect(
        page.getByText('Updated dietary requirement notes'),
      ).toBeVisible();
    });

    test('should prevent editing if insufficient permissions', async ({
      page,
    }) => {
      // Mock user with limited permissions
      await page.evaluate(() => {
        window.localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            access_token: 'mock-token',
            user: {
              id: 'user-456',
              email: 'readonly@example.com',
              role: 'viewer',
            },
          }),
        );
      });

      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for table to load
      await page.waitForSelector('[data-testid="dietary-table"]');

      // Verify edit buttons are disabled or not present
      const editButtons = page.locator('[data-testid="edit-btn"]');
      const buttonCount = await editButtons.count();

      if (buttonCount > 0) {
        await expect(editButtons.first()).toBeDisabled();
      }
    });
  });

  test.describe('AI Menu Generator', () => {
    test('should generate menu suggestions based on dietary requirements', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Wait for component to load
      await expect(page.getByText('AI Menu Generator')).toBeVisible();

      // Fill out menu generation form
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.fill('[data-testid="guest-count-input"]', '150');
      await page.selectOption('[data-testid="menu-style-select"]', 'formal');
      await page.selectOption('[data-testid="meal-type-select"]', 'dinner');
      await page.fill('[data-testid="budget-input"]', '75');

      // Select dietary preferences
      await page.check('[data-testid="dietary-vegetarian"]');
      await page.check('[data-testid="dietary-gluten-free"]');

      // Generate menu
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for AI generation (with loading state)
      await expect(page.getByText('Generating menu...')).toBeVisible();

      // Wait for results
      await page.waitForSelector('[data-testid="menu-results"]', {
        timeout: 30000,
      });

      // Verify menu suggestions are displayed
      await expect(
        page.locator('[data-testid="menu-item"]'),
      ).toHaveCount.atLeast(3);
      await expect(page.getByText('Compliance Score')).toBeVisible();

      // Verify dietary compliance information
      await expect(
        page.locator('[data-testid="compliance-score"]'),
      ).toBeVisible();
      await expect(page.getByText('%')).toBeVisible(); // Percentage display
    });

    test('should display compliance warnings for menu items', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Mock menu generation with compliance issues
      await page.route('**/api/catering/menu/generate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              menu_items: [
                {
                  name: 'Herb Crusted Salmon',
                  description: 'Fresh salmon with herbs',
                  compliance_score: 85,
                  warnings: ['Contains fish allergen'],
                },
              ],
              overall_compliance: 85,
              risk_assessment: {
                high_risk_items: 1,
                total_items: 3,
              },
            },
          }),
        });
      });

      // Generate menu
      await page.selectOption('[data-testid="wedding-select"]', 'wedding-123');
      await page.click('[data-testid="generate-menu-btn"]');

      // Wait for results
      await page.waitForSelector('[data-testid="menu-results"]');

      // Verify compliance warnings are displayed
      await expect(page.getByText('Contains fish allergen')).toBeVisible();
      await expect(page.locator('[data-testid="warning-icon"]')).toBeVisible();
    });

    test('should allow customizing menu preferences', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/menu-generator');

      // Expand advanced options
      await page.click('[data-testid="advanced-options-toggle"]');

      // Set cultural preferences
      await page.selectOption(
        '[data-testid="cultural-preferences"]',
        'mediterranean',
      );

      // Set seasonal preferences
      await page.check('[data-testid="seasonal-spring"]');
      await page.check('[data-testid="seasonal-local"]');

      // Set cooking preferences
      await page.selectOption('[data-testid="cooking-method"]', 'grilled');

      // Verify options are saved
      await expect(
        page.locator('[data-testid="cultural-preferences"]'),
      ).toHaveValue('mediterranean');
      await expect(
        page.locator('[data-testid="seasonal-spring"]'),
      ).toBeChecked();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/catering/dietary');

      // Verify mobile navigation
      await expect(
        page.locator('[data-testid="mobile-menu-toggle"]'),
      ).toBeVisible();

      // Verify table adapts to mobile
      await expect(
        page.locator('[data-testid="mobile-dietary-card"]'),
      ).toBeVisible();

      // Test mobile form interactions
      await page.click('[data-testid="add-requirement-btn"]');
      await expect(page.locator('[data-testid="mobile-form"]')).toBeVisible();

      // Verify touch-friendly controls
      const addButton = page.locator('[data-testid="add-requirement-btn"]');
      const boundingBox = await addButton.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(48); // Minimum touch target
    });

    test('should handle touch gestures for navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/catering/dietary');

      // Test swipe navigation (simulate touch events)
      await page.dispatchEvent('[data-testid="dietary-table"]', 'touchstart', {
        touches: [{ pageX: 300, pageY: 200 }],
      });

      await page.dispatchEvent('[data-testid="dietary-table"]', 'touchmove', {
        touches: [{ pageX: 100, pageY: 200 }],
      });

      await page.dispatchEvent('[data-testid="dietary-table"]', 'touchend', {
        touches: [],
      });

      // Verify gesture handling (implementation would depend on actual gesture library)
      await expect(page.locator('[data-testid="dietary-table"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Features', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus indicators
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Test Enter key activation
      await page.keyboard.press('Enter');

      // Verify keyboard navigation works
      await expect(
        page.locator('[data-testid="add-requirement-btn"]'),
      ).toBeFocused();
    });

    test('should provide appropriate ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Check ARIA labels on key elements
      await expect(
        page.locator('[data-testid="dietary-table"]'),
      ).toHaveAttribute('aria-label', 'Dietary Requirements Table');
      await expect(
        page.locator('[data-testid="add-requirement-btn"]'),
      ).toHaveAttribute('aria-label', 'Add New Dietary Requirement');

      // Check form labels
      await page.click('[data-testid="add-requirement-btn"]');
      await expect(
        page.locator('[data-testid="guest-name-input"]'),
      ).toHaveAttribute('aria-label');
    });

    test('should announce important changes to screen readers', async ({
      page,
    }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Check for aria-live regions
      await expect(
        page.locator('[data-testid="status-announcements"]'),
      ).toHaveAttribute('aria-live', 'polite');

      // Test status announcements
      await page.click('[data-testid="add-requirement-btn"]');
      await page.fill('[data-testid="guest-name-input"]', 'Test Guest');
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify announcement area is updated
      const announcementArea = page.locator(
        '[data-testid="status-announcements"]',
      );
      await expect(announcementArea).toContainText('requirement');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/catering/dietary**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
          }),
        });
      });

      await page.goto('http://localhost:3000/catering/dietary');

      // Verify error message is displayed
      await expect(
        page.getByText('Failed to load dietary requirements'),
      ).toBeVisible();

      // Verify retry mechanism
      await page.click('[data-testid="retry-btn"]');
      await expect(page.getByText('Retrying...')).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ page }) => {
      await page.goto('http://localhost:3000/catering/dietary');

      // Simulate network failure
      await page.context().setOffline(true);

      // Try to create a new requirement
      await page.click('[data-testid="add-requirement-btn"]');
      await page.fill('[data-testid="guest-name-input"]', 'Offline Test');
      await page.click('[data-testid="save-requirement-btn"]');

      // Verify offline message
      await expect(
        page.getByText(
          'Connection lost. Changes will be saved when reconnected.',
        ),
      ).toBeVisible();

      // Verify auto-save indicator
      await expect(
        page.locator('[data-testid="auto-save-indicator"]'),
      ).toBeVisible();

      // Restore connectivity
      await page.context().setOffline(false);

      // Verify sync indicator
      await expect(page.getByText('Syncing changes...')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for main content to be visible
      await expect(page.getByText('Dietary Management')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Verify page loads within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/catering/dietary**', async (route) => {
        const largeDietary = Array.from({ length: 100 }, (_, i) => ({
          id: `req-${i}`,
          guest_name: `Guest ${i}`,
          category: 'allergy',
          severity: Math.floor(Math.random() * 5) + 1,
          notes: `Dietary requirement ${i}`,
          created_at: new Date().toISOString(),
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              requirements: largeDietary,
              pagination: {
                total: 100,
                page: 1,
                limit: 50,
              },
            },
          }),
        });
      });

      await page.goto('http://localhost:3000/catering/dietary');

      // Wait for table to load
      await page.waitForSelector('[data-testid="dietary-table"]');

      // Verify virtualization or pagination is working
      const visibleRows = page.locator('[data-testid="dietary-row"]');
      const rowCount = await visibleRows.count();

      // Should not render all 100 rows at once
      expect(rowCount).toBeLessThanOrEqual(50);

      // Verify pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    });
  });
});
