/**
 * WS-167 Trial Management System - E2E Tests for Trial Signup Flow
 * Comprehensive Playwright MCP tests with accessibility-first validation
 * Tests the complete trial signup journey from landing to activation
 */

import { test, expect, describe, beforeAll, afterAll, beforeEach } from '@playwright/test';
import { TrialOnboardingData, BusinessType } from '@/types/trial';

// Test configuration and constants
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'trial-test@example.com';
const TEST_PASSWORD = 'TrialTest123!';

// Test user data for trial signup
const validTrialData: TrialOnboardingData = {
  business_type: 'wedding_planner',
  business_name: 'E2E Test Wedding Planning Co',
  primary_goals: ['save_time', 'grow_business', 'improve_efficiency'],
  current_challenges: ['manual_tasks', 'communication_delays', 'client_tracking'],
  weekly_time_spent_hours: 35,
  estimated_hourly_value: 85,
  team_size: 2,
  current_client_count: 12,
  growth_goals: 'Scale to 40+ weddings annually and establish premium positioning in local market'
};

describe('WS-167 Trial Signup Flow - E2E Tests with Playwright MCP', () => {
  
  beforeAll(async () => {
    console.log('🎭 Starting E2E Trial Signup Flow Tests');
    console.log(`Testing against: ${BASE_URL}`);
  });

  afterAll(async () => {
    console.log('✅ E2E Trial Signup Flow Tests Complete');
  });

  beforeEach(async ({ page }) => {
    // Set up realistic viewport for wedding planners (common screen sizes)
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Mock authentication state for testing
    await page.route('**/api/auth/**', route => {
      const url = route.request().url();
      if (url.includes('/session')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-e2e-123',
              email: TEST_USER_EMAIL,
              aud: 'authenticated'
            }
          })
        });
      } else {
        route.continue();
      }
    });

    // Navigate to application
    await page.goto(BASE_URL);
  });

  describe('Accessibility-First Trial Widget Validation', () => {
    test('Trial status widget should be fully accessible and functional', async ({ page }) => {
      // Navigate to dashboard where trial widget appears
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Take accessibility snapshot using Playwright MCP patterns
      await page.waitForLoadState('networkidle');
      const accessibilityStructure = await page.locator('[data-testid="trial-status-widget"]');
      
      // Verify trial widget is present and accessible
      await expect(accessibilityStructure).toBeVisible();
      
      // Check ARIA attributes for screen readers
      const widget = page.locator('[data-testid="trial-status-widget"]');
      await expect(widget).toHaveAttribute('role', 'region');
      await expect(widget).toHaveAttribute('aria-label');
      
      // Verify semantic structure
      const heading = widget.locator('h2, h3').first();
      await expect(heading).toBeVisible();
      
      // Test keyboard navigation
      await widget.focus();
      await page.keyboard.press('Tab');
      
      // Verify countdown functionality is accessible
      const countdown = widget.locator('[data-testid="trial-countdown"]');
      await expect(countdown).toBeVisible();
      await expect(countdown).toContainText(/days left|day left/i);
      
      // Test screen reader compatibility
      const srText = await widget.locator('[aria-live="polite"]').textContent();
      expect(srText).toBeTruthy();
      
      console.log('✅ Trial widget accessibility validation completed');
    });

    test('Trial signup form should meet WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Wait for form to load
      await page.waitForSelector('[data-testid="trial-signup-form"]', { timeout: 10000 });
      
      const form = page.locator('[data-testid="trial-signup-form"]');
      
      // Verify form has proper semantic structure
      await expect(form).toHaveAttribute('role', 'form');
      await expect(form).toHaveAttribute('aria-labelledby');
      
      // Check all form fields have proper labels
      const inputs = form.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate(el => {
          const id = el.id;
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const associatedLabel = document.querySelector(`label[for="${id}"]`);
          
          return !!(ariaLabel || ariaLabelledBy || associatedLabel);
        });
        
        expect(hasLabel).toBeTruthy();
      }
      
      // Verify error messages are properly associated
      await page.fill('[data-testid="business-name-input"]', ''); // Trigger validation
      await page.click('[data-testid="submit-trial-button"]');
      
      const errorMessage = page.locator('[data-testid="business-name-error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveAttribute('role', 'alert');
        await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      }
      
      console.log('✅ Form accessibility standards validation completed');
    });
  });

  describe('Complete Trial Signup Journey', () => {
    test('Should complete full trial signup flow with comprehensive validation', async ({ page }) => {
      // Step 1: Navigate to trial signup page
      await page.goto(`${BASE_URL}/trial/start`);
      await page.waitForLoadState('networkidle');
      
      // Take initial snapshot for debugging
      await page.screenshot({ path: 'screenshots/trial-signup-initial.png', fullPage: true });
      
      // Step 2: Verify page structure and accessibility
      const pageHeading = page.locator('h1').first();
      await expect(pageHeading).toContainText(/start.*trial|free trial/i);
      
      // Verify trial benefits are clearly displayed
      const benefitsList = page.locator('[data-testid="trial-benefits"]');
      await expect(benefitsList).toBeVisible();
      
      // Step 3: Fill out business type selection
      const businessTypeSelect = page.locator('[data-testid="business-type-select"]');
      await businessTypeSelect.selectOption(validTrialData.business_type);
      
      // Verify business type affects form fields (dynamic behavior)
      await page.waitForTimeout(500); // Allow form to update
      const industrySpecificFields = page.locator('[data-testid="wedding-planner-fields"]');
      await expect(industrySpecificFields).toBeVisible();
      
      // Step 4: Fill business information
      await page.fill('[data-testid="business-name-input"]', validTrialData.business_name);
      
      // Step 5: Select primary goals (multi-select behavior)
      for (const goal of validTrialData.primary_goals) {
        await page.check(`[data-testid="goal-${goal}"]`);
      }
      
      // Verify maximum selection limit (should not allow more than 5)
      const selectedGoals = page.locator('[data-testid^="goal-"]:checked');
      const goalCount = await selectedGoals.count();
      expect(goalCount).toBeLessThanOrEqual(5);
      
      // Step 6: Select current challenges
      for (const challenge of validTrialData.current_challenges) {
        await page.check(`[data-testid="challenge-${challenge}"]`);
      }
      
      // Step 7: Fill time and value estimates
      await page.fill('[data-testid="weekly-hours-input"]', validTrialData.weekly_time_spent_hours.toString());
      await page.fill('[data-testid="hourly-value-input"]', validTrialData.estimated_hourly_value.toString());
      
      // Verify real-time ROI calculation
      const roiPreview = page.locator('[data-testid="roi-preview"]');
      await expect(roiPreview).toBeVisible();
      await expect(roiPreview).toContainText(/save.*month/i);
      
      // Step 8: Fill team and client information
      await page.fill('[data-testid="team-size-input"]', validTrialData.team_size.toString());
      await page.fill('[data-testid="client-count-input"]', validTrialData.current_client_count.toString());
      
      // Step 9: Fill growth goals (textarea)
      await page.fill('[data-testid="growth-goals-textarea"]', validTrialData.growth_goals);
      
      // Step 10: Select plan tier
      const professionalPlan = page.locator('[data-testid="plan-professional"]');
      await professionalPlan.click();
      
      // Verify plan details are shown
      const planDetails = page.locator('[data-testid="professional-plan-details"]');
      await expect(planDetails).toBeVisible();
      await expect(planDetails).toContainText(/\$49/); // Professional plan pricing
      
      // Step 11: Review trial terms and conditions
      const termsCheckbox = page.locator('[data-testid="terms-agreement"]');
      await termsCheckbox.check();
      
      // Step 12: Submit trial signup
      const submitButton = page.locator('[data-testid="submit-trial-button"]');
      await expect(submitButton).not.toBeDisabled();
      
      // Mock successful API response
      await page.route('**/api/trial/start', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            trial_id: 'e2e-trial-123',
            trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            onboarding_required: false,
            next_steps: [
              'Complete your profile setup',
              'Add your first client',
              'Create your first journey',
              'Explore the milestone achievements'
            ]
          })
        });
      });
      
      await submitButton.click();
      
      // Step 13: Verify successful trial activation
      await page.waitForSelector('[data-testid="trial-success-message"]', { timeout: 10000 });
      
      const successMessage = page.locator('[data-testid="trial-success-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText(/trial activated|welcome/i);
      
      // Verify next steps are displayed
      const nextStepsList = page.locator('[data-testid="trial-next-steps"]');
      await expect(nextStepsList).toBeVisible();
      
      const nextStepsItems = nextStepsList.locator('li');
      const stepsCount = await nextStepsItems.count();
      expect(stepsCount).toBeGreaterThan(0);
      
      // Step 14: Verify redirection to onboarding flow
      await page.waitForURL(/\/trial\/welcome|\/dashboard/);
      
      // Take final success screenshot
      await page.screenshot({ path: 'screenshots/trial-signup-success.png', fullPage: true });
      
      console.log('✅ Complete trial signup flow test passed');
    });

    test('Should handle validation errors gracefully with accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Attempt to submit empty form
      const submitButton = page.locator('[data-testid="submit-trial-button"]');
      await submitButton.click();
      
      // Verify error messages appear and are accessible
      const errorSummary = page.locator('[data-testid="form-error-summary"]');
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toHaveAttribute('role', 'alert');
      await expect(errorSummary).toHaveAttribute('aria-live', 'assertive');
      
      // Check individual field errors
      const requiredFields = [
        'business-type-error',
        'business-name-error', 
        'goals-error',
        'challenges-error'
      ];
      
      for (const fieldError of requiredFields) {
        const errorElement = page.locator(`[data-testid="${fieldError}"]`);
        if (await errorElement.isVisible()) {
          await expect(errorElement).toHaveAttribute('role', 'alert');
        }
      }
      
      // Verify focus is moved to first error
      const firstError = page.locator('[data-testid$="-error"]').first();
      const firstErrorInput = await firstError.getAttribute('data-field-id');
      if (firstErrorInput) {
        const associatedInput = page.locator(`[data-testid="${firstErrorInput}"]`);
        await expect(associatedInput).toBeFocused();
      }
      
      console.log('✅ Form validation error handling test passed');
    });

    test('Should provide real-time feedback during form completion', async ({ page }) => {
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Test progressive disclosure based on business type
      const businessTypeSelect = page.locator('[data-testid="business-type-select"]');
      await businessTypeSelect.selectOption('wedding_planner');
      
      // Verify wedding planner specific fields appear
      await page.waitForSelector('[data-testid="wedding-planner-fields"]');
      const weddingFields = page.locator('[data-testid="wedding-planner-fields"]');
      await expect(weddingFields).toBeVisible();
      
      // Test ROI calculator updates
      await page.fill('[data-testid="weekly-hours-input"]', '40');
      await page.fill('[data-testid="hourly-value-input"]', '100');
      
      // Wait for calculation to update
      await page.waitForTimeout(1000);
      const roiCalculation = page.locator('[data-testid="roi-preview"]');
      const roiText = await roiCalculation.textContent();
      expect(roiText).toMatch(/\$\d+/); // Should contain dollar amount
      
      // Test plan comparison updates based on selections
      const goals = ['save_time', 'grow_business', 'improve_efficiency'];
      for (const goal of goals) {
        await page.check(`[data-testid="goal-${goal}"]`);
      }
      
      // Verify plan recommendations update
      const planRecommendation = page.locator('[data-testid="recommended-plan"]');
      await expect(planRecommendation).toBeVisible();
      
      console.log('✅ Real-time feedback test passed');
    });
  });

  describe('Multi-Tab Trial Experience Testing', () => {
    test('Should handle trial signup across multiple browser tabs', async ({ page, context }) => {
      // Open first tab with trial signup
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Fill partial form
      await page.fill('[data-testid="business-name-input"]', 'Multi Tab Test Business');
      await page.selectOption('[data-testid="business-type-select"]', 'photographer');
      
      // Open second tab
      const secondTab = await context.newPage();
      await secondTab.goto(`${BASE_URL}/trial/start`);
      
      // Verify form state is not shared between tabs (no unwanted persistence)
      const businessNameInSecondTab = await secondTab.locator('[data-testid="business-name-input"]').inputValue();
      expect(businessNameInSecondTab).toBe(''); // Should be empty
      
      // Complete signup in second tab
      await secondTab.fill('[data-testid="business-name-input"]', validTrialData.business_name);
      await secondTab.selectOption('[data-testid="business-type-select"]', validTrialData.business_type);
      
      // Fill remaining required fields in second tab
      for (const goal of validTrialData.primary_goals.slice(0, 2)) {
        await secondTab.check(`[data-testid="goal-${goal}"]`);
      }
      
      for (const challenge of validTrialData.current_challenges.slice(0, 2)) {
        await secondTab.check(`[data-testid="challenge-${challenge}"]`);
      }
      
      await secondTab.fill('[data-testid="weekly-hours-input"]', '35');
      await secondTab.fill('[data-testid="hourly-value-input"]', '85');
      await secondTab.fill('[data-testid="team-size-input"]', '2');
      await secondTab.fill('[data-testid="client-count-input"]', '10');
      await secondTab.fill('[data-testid="growth-goals-textarea"]', 'Test growth goals');
      
      // Select plan and agree to terms
      await secondTab.click('[data-testid="plan-professional"]');
      await secondTab.check('[data-testid="terms-agreement"]');
      
      // Mock API response for second tab
      await secondTab.route('**/api/trial/start', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            trial_id: 'multi-tab-trial-456',
            trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            onboarding_required: false,
            next_steps: ['Complete setup', 'Add clients']
          })
        });
      });
      
      // Submit in second tab
      await secondTab.click('[data-testid="submit-trial-button"]');
      
      // Verify success in second tab
      await secondTab.waitForSelector('[data-testid="trial-success-message"]');
      await expect(secondTab.locator('[data-testid="trial-success-message"]')).toBeVisible();
      
      // Switch back to first tab and verify it doesn't interfere
      await page.bringToFront();
      const firstTabForm = page.locator('[data-testid="trial-signup-form"]');
      await expect(firstTabForm).toBeVisible(); // Form should still be present
      
      // Close second tab
      await secondTab.close();
      
      console.log('✅ Multi-tab trial experience test passed');
    });
  });

  describe('Trial Widget Interaction Testing', () => {
    test('Should test trial countdown and extension functionality', async ({ page }) => {
      // Mock active trial state
      await page.route('**/api/trial/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            trial: {
              id: 'widget-test-trial-789',
              user_id: 'test-user-e2e-123',
              trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days remaining
              status: 'active'
            },
            progress: {
              days_remaining: 7,
              days_elapsed: 23,
              progress_percentage: 76.67,
              urgency_score: 4,
              roi_metrics: {
                total_time_saved_hours: 12.5,
                estimated_cost_savings: 1062.50,
                roi_percentage: 2067
              },
              conversion_recommendation: 'Great progress! Consider upgrading to maximize benefits.'
            }
          })
        });
      });
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for trial widget to load
      await page.waitForSelector('[data-testid="trial-status-widget"]');
      
      // Verify countdown display
      const countdown = page.locator('[data-testid="trial-countdown"]');
      await expect(countdown).toContainText('7 days left');
      
      // Verify urgency indicator
      const urgencyIndicator = page.locator('[data-testid="urgency-indicator"]');
      await expect(urgencyIndicator).toHaveClass(/urgent|warning/);
      
      // Test extension button
      const extensionButton = page.locator('[data-testid="extend-trial-btn"]');
      await expect(extensionButton).toBeVisible();
      
      // Mock extension API
      await page.route('**/api/trial/extend', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Trial extended by 15 days',
            new_end_date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      await extensionButton.click();
      
      // Verify extension confirmation
      await page.waitForSelector('[data-testid="extension-success"]');
      const extensionMessage = page.locator('[data-testid="extension-success"]');
      await expect(extensionMessage).toContainText(/extended.*15.*days/i);
      
      // Verify countdown updates
      await page.waitForTimeout(1000); // Allow UI to update
      await expect(countdown).toContainText('22 days left');
      
      console.log('✅ Trial widget interaction test passed');
    });

    test('Should test trial progress and milestone tracking', async ({ page }) => {
      // Mock trial with milestones
      await page.route('**/api/trial/milestones', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            milestones: [
              {
                id: 'milestone-1',
                milestone_type: 'first_client_connected',
                milestone_name: 'First Client Connected',
                achieved: true,
                achieved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                value_impact_score: 8,
                definition: {
                  name: 'First Client Connected',
                  description: 'Successfully add and configure your first client profile',
                  estimated_time_savings_hours: 2
                }
              },
              {
                id: 'milestone-2',
                milestone_type: 'initial_journey_created',
                milestone_name: 'Initial Journey Created',
                achieved: false,
                value_impact_score: 9,
                definition: {
                  name: 'Initial Journey Created',
                  description: 'Create your first automated client journey',
                  estimated_time_savings_hours: 5
                }
              }
            ],
            progress: {
              total_milestones: 2,
              achieved_count: 1,
              progress_percentage: 50,
              total_time_savings_hours: 2
            },
            next_recommended: {
              milestone_type: 'initial_journey_created',
              name: 'Initial Journey Created',
              description: 'Create your first automated client journey'
            }
          })
        });
      });
      
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Verify milestone progress widget
      const milestonesWidget = page.locator('[data-testid="trial-milestones-widget"]');
      await expect(milestonesWidget).toBeVisible();
      
      // Check progress bar
      const progressBar = milestonesWidget.locator('[data-testid="milestone-progress-bar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      
      // Verify achieved milestone is marked
      const achievedMilestone = milestonesWidget.locator('[data-testid="milestone-first_client_connected"]');
      await expect(achievedMilestone).toHaveClass(/completed|achieved/);
      
      // Verify next milestone is highlighted
      const nextMilestone = milestonesWidget.locator('[data-testid="milestone-initial_journey_created"]');
      await expect(nextMilestone).toHaveClass(/next|recommended/);
      
      // Test milestone click to get instructions
      await nextMilestone.click();
      
      const milestoneModal = page.locator('[data-testid="milestone-instructions-modal"]');
      await expect(milestoneModal).toBeVisible();
      await expect(milestoneModal).toContainText('Create your first automated client journey');
      
      console.log('✅ Trial progress and milestone tracking test passed');
    });
  });

  describe('Performance and Accessibility Benchmarks', () => {
    test('Should meet performance benchmarks for trial signup flow', async ({ page }) => {
      // Start performance measurement
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Wait for complete page load
      await page.waitForLoadState('networkidle');
      
      const pageLoadTime = Date.now() - startTime;
      
      // Verify page loads within acceptable time (5 seconds)
      expect(pageLoadTime).toBeLessThan(5000);
      
      // Test form interaction performance
      const formStartTime = Date.now();
      
      await page.fill('[data-testid="business-name-input"]', validTrialData.business_name);
      await page.selectOption('[data-testid="business-type-select"]', validTrialData.business_type);
      
      const formInteractionTime = Date.now() - formStartTime;
      
      // Form interactions should be responsive (under 500ms)
      expect(formInteractionTime).toBeLessThan(500);
      
      // Test ROI calculation performance
      const calcStartTime = Date.now();
      
      await page.fill('[data-testid="weekly-hours-input"]', '40');
      await page.fill('[data-testid="hourly-value-input"]', '100');
      
      // Wait for calculation update
      await page.waitForFunction(
        () => document.querySelector('[data-testid="roi-preview"]')?.textContent?.includes('$'),
        {},
        { timeout: 2000 }
      );
      
      const calcTime = Date.now() - calcStartTime;
      
      // ROI calculation should be fast (under 2 seconds)
      expect(calcTime).toBeLessThan(2000);
      
      console.log(`✅ Performance benchmarks met - Page Load: ${pageLoadTime}ms, Form: ${formInteractionTime}ms, Calc: ${calcTime}ms`);
    });

    test('Should pass comprehensive accessibility audit', async ({ page }) => {
      await page.goto(`${BASE_URL}/trial/start`);
      
      // Inject axe-core for accessibility testing
      await page.addScriptTag({ url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js' });
      
      // Run accessibility audit
      const accessibilityResults = await page.evaluate(async () => {
        // @ts-ignore
        const results = await axe.run();
        return {
          violations: results.violations,
          passes: results.passes.length,
          incomplete: results.incomplete.length
        };
      });
      
      // Verify no critical accessibility violations
      expect(accessibilityResults.violations).toHaveLength(0);
      
      // Verify good accessibility coverage
      expect(accessibilityResults.passes).toBeGreaterThan(10);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      
      // Navigate through all interactive elements
      let tabCount = 0;
      const maxTabs = 20; // Reasonable limit
      
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
        if (newFocusedElement === focusedElement) {
          break; // Reached end of tabbable elements
        }
        focusedElement = newFocusedElement;
        tabCount++;
      }
      
      expect(tabCount).toBeGreaterThan(5); // Should have multiple tabbable elements
      
      console.log(`✅ Accessibility audit passed - ${accessibilityResults.passes} checks passed, ${tabCount} tabbable elements`);
    });
  });
});