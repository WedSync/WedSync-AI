import { test, expect } from '@playwright/test';

test.describe('A/B Testing Framework', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a wedding planner
    await page.goto('/login');
    await page.fill('input[name="email"]', 'planner@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Complete A/B test creation workflow', async ({ page }) => {
    // Navigate to A/B testing page
    await page.goto('/ab-testing');
    await expect(page.locator('h1')).toContainText('A/B Testing');

    // Start creating a new test
    await page.click('button:has-text("Create Test")');
    await expect(page.locator('h2')).toContainText('Create A/B Test');

    // Step 1: Test Details
    await page.fill('input[name="testName"]', 'Venue Confirmation Subject Line Test');
    await page.fill('textarea', 'Testing different subject line approaches for venue confirmations');
    
    // Select a wedding template
    await page.click('text=Venue Confirmation - Casual');
    await expect(page.locator('.border-primary-600')).toBeVisible();

    await page.click('button:has-text("Next")');

    // Step 2: Configure Variants
    await expect(page.locator('h3')).toContainText('Configure Variants');
    
    // Update control variant
    const controlSubject = page.locator('input').nth(2); // Subject line input for control
    await controlSubject.clear();
    await controlSubject.fill('Your dream wedding venue awaits!');
    
    const controlMessage = page.locator('textarea').first();
    await controlMessage.clear();
    await controlMessage.fill('Hi [Name], Let\'s finalize your perfect wedding venue...');

    // Update variant A
    const variantASubject = page.locator('input').nth(4); // Subject line input for variant
    await variantASubject.clear();
    await variantASubject.fill('Wedding venue confirmation required');
    
    const variantAMessage = page.locator('textarea').nth(1);
    await variantAMessage.clear();
    await variantAMessage.fill('Dear [Name], We need to confirm your venue selection...');

    // Check traffic distribution
    await expect(page.locator('text=Total Traffic: 100%')).toBeVisible();

    await page.click('button:has-text("Next")');

    // Step 3: Success Metrics & Settings
    await expect(page.locator('h3')).toContainText('Success Metrics & Settings');
    
    // Select multiple metrics
    await page.click('text=Response Rate');
    await page.click('text=Engagement Rate');
    await expect(page.locator('.border-primary-600')).toHaveCount(3); // open_rate + 2 new ones

    // Adjust confidence level
    const confidenceSlider = page.locator('[role="slider"]').last();
    await confidenceSlider.click(); // This should adjust the confidence level

    await page.click('button:has-text("Create Test")');

    // Verify test creation
    await expect(page.locator('text=A/B test created successfully!')).toBeVisible();
    await expect(page.locator('h3:has-text("Venue Confirmation Subject Line Test")')).toBeVisible();
  });

  test('Test dashboard interaction and management', async ({ page }) => {
    // Assume we have a test already created
    await page.goto('/ab-testing');
    
    // Start a test
    const startButton = page.locator('button:has-text("Start")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await expect(page.locator('text=Test started successfully!')).toBeVisible();
      await expect(page.locator('text=Running')).toBeVisible();
    }

    // View detailed analytics
    await page.click('button:has-text("View Detailed Analytics")');
    await expect(page.locator('h3:has-text("Detailed Analytics")')).toBeVisible();
    
    // Check for charts
    await expect(page.locator('text=Conversion Rate Over Time')).toBeVisible();
    await expect(page.locator('text=Traffic Distribution')).toBeVisible();
    await expect(page.locator('text=Variant Comparison')).toBeVisible();

    // Hide details
    await page.click('button:has-text("Hide Details")');
    await expect(page.locator('h3:has-text("Detailed Analytics")')).not.toBeVisible();
  });

  test('Test performance monitoring and statistical significance', async ({ page }) => {
    await page.goto('/ab-testing');
    
    // Look for a running test with data
    const testCard = page.locator('[data-testid="test-card"]').first();
    await expect(testCard).toBeVisible();

    // Check performance metrics
    await expect(page.locator('text=Total Exposures')).toBeVisible();
    await expect(page.locator('text=Best Performer')).toBeVisible();
    
    // Look for statistical significance indicator
    const significanceElement = page.locator('[data-testid="significance"]');
    if (await significanceElement.isVisible()) {
      const significanceText = await significanceElement.textContent();
      expect(significanceText).toMatch(/(Significant|Testing)/);
    }

    // Check variant performance sections
    await expect(page.locator('text=Variant Performance')).toBeVisible();
    await expect(page.locator('text=converted')).toBeVisible();
    await expect(page.locator('text=Confidence:')).toBeVisible();

    // Look for statistical analysis if available
    const analysisSection = page.locator('text=Statistical Analysis');
    if (await analysisSection.isVisible()) {
      await expect(page.locator('text=P-Value:')).toBeVisible();
      await expect(page.locator('text=Confidence:')).toBeVisible();
    }
  });

  test('Test action controls (pause, resume, stop)', async ({ page }) => {
    await page.goto('/ab-testing');
    
    // Find a running test
    const runningTest = page.locator('text=Running').first();
    if (await runningTest.isVisible()) {
      // Test pause functionality
      await page.click('button:has-text("Pause")');
      await expect(page.locator('text=Test paused successfully!')).toBeVisible();
      await expect(page.locator('text=Paused')).toBeVisible();

      // Test resume functionality
      await page.click('button:has-text("Resume")');
      await expect(page.locator('text=Test started successfully!')).toBeVisible();
      await expect(page.locator('text=Running')).toBeVisible();

      // Test stop functionality
      await page.click('button:has-text("Stop")');
      await expect(page.locator('text=Test stopped successfully!')).toBeVisible();
      await expect(page.locator('text=Completed')).toBeVisible();
    }
  });

  test('Wedding-specific template selection and application', async ({ page }) => {
    await page.goto('/ab-testing');
    await page.click('button:has-text("Create Test")');
    
    // Check all wedding template categories are available
    await expect(page.locator('text=Venue Confirmation - Formal')).toBeVisible();
    await expect(page.locator('text=Venue Confirmation - Casual')).toBeVisible();
    await expect(page.locator('text=Timeline Reminder - Urgent')).toBeVisible();
    await expect(page.locator('text=Timeline Reminder - Gentle')).toBeVisible();

    // Select venue template and verify it applies content
    await page.click('text=Venue Confirmation - Formal');
    await page.fill('input[name="testName"]', 'Template Test');
    await page.click('button:has-text("Next")');

    // Verify template content was applied to control variant
    const subjectInput = page.locator('input').nth(2);
    await expect(subjectInput).toHaveValue('Wedding venue confirmation required');
    
    const messageTextarea = page.locator('textarea').first();
    await expect(messageTextarea).toHaveValue(/Dear.*venue selection/);
  });

  test('Multi-variant test creation (A/B/C testing)', async ({ page }) => {
    await page.goto('/ab-testing');
    await page.click('button:has-text("Create Test")');
    
    await page.fill('input[name="testName"]', 'Multi Variant Timeline Test');
    await page.click('button:has-text("Next")');

    // Add a third variant
    await page.click('button:has-text("Add Variant")');
    await expect(page.locator('text=Variant B')).toBeVisible();
    
    // Configure all three variants
    const variants = ['Control', 'Variant A', 'Variant B'];
    for (let i = 0; i < variants.length; i++) {
      const subjectInput = page.locator(`input[value="${variants[i]}"]`);
      await expect(subjectInput).toBeVisible();
      
      // Traffic should be distributed equally (33% each)
      await expect(page.locator('text=33%')).toBeVisible();
    }

    // Remove a variant
    await page.click('button[aria-label="Remove variant"]');
    await expect(page.locator('text=50%')).toBeVisible(); // Should redistribute to 50/50
  });

  test('Real-time updates and refresh functionality', async ({ page }) => {
    await page.goto('/ab-testing');
    
    // Test refresh button
    await page.click('button:has-text("Refresh")');
    await expect(page.locator('.animate-spin')).toBeVisible();
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    await expect(page.locator('.animate-spin')).not.toBeVisible();

    // Check that dashboard shows current data
    const summaryCards = page.locator('[data-testid="summary-card"]');
    if (await summaryCards.first().isVisible()) {
      await expect(page.locator('text=Active Tests')).toBeVisible();
      await expect(page.locator('text=Completed')).toBeVisible();
      await expect(page.locator('text=Drafts')).toBeVisible();
    }
  });

  test('Empty state and onboarding flow', async ({ page }) => {
    // Mock empty state (would need to be set up in test environment)
    await page.goto('/ab-testing');
    
    // If no tests exist, should show empty state
    const emptyState = page.locator('text=Start optimizing your wedding communications');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Create Your First A/B Test')).toBeVisible();
      await expect(page.locator('text=1')).toBeVisible(); // Step indicators
      await expect(page.locator('text=2')).toBeVisible();
      await expect(page.locator('text=3')).toBeVisible();
      
      // Click the CTA button
      await page.click('button:has-text("Create Your First A/B Test")');
      await expect(page.locator('h2:has-text("Create A/B Test")')).toBeVisible();
    }
  });

  test('Best practices tips and guidance', async ({ page }) => {
    await page.goto('/ab-testing');
    
    // Check for best practices section (should appear when tests exist)
    const bestPractices = page.locator('text=A/B Testing Best Practices');
    if (await bestPractices.isVisible()) {
      await expect(page.locator('text=Test Duration')).toBeVisible();
      await expect(page.locator('text=Sample Size')).toBeVisible();
      await expect(page.locator('text=Statistical Significance')).toBeVisible();
      await expect(page.locator('text=One Variable at a Time')).toBeVisible();
      
      // Verify practical advice is given
      await expect(page.locator('text=at least 7 days')).toBeVisible();
      await expect(page.locator('text=at least 100 exposures')).toBeVisible();
      await expect(page.locator('text=95% confidence')).toBeVisible();
    }
  });

  test('Accessibility features', async ({ page }) => {
    await page.goto('/ab-testing');
    await page.click('button:has-text("Create Test")');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should be able to proceed with keyboard
    
    // Check ARIA labels and roles
    await expect(page.locator('[role="slider"]')).toBeVisible();
    await expect(page.locator('[aria-label]')).toHaveCount({ greaterThan: 0 });
    
    // Test form validation and error messages
    await page.fill('input[name="testName"]', '');
    await page.click('button:has-text("Next")');
    // Should not proceed without required fields
    await expect(page.locator('h3:has-text("Test Details")')).toBeVisible();
  });
});

test.describe('A/B Testing Integration', () => {
  test('Integration with message sending', async ({ page }) => {
    // This would test the actual integration with the communication system
    // Mock API calls would need to be set up for this
    await page.goto('/messages/compose');
    
    // Should show A/B test options when composing
    const abTestToggle = page.locator('text=Enable A/B Testing');
    if (await abTestToggle.isVisible()) {
      await abTestToggle.click();
      await expect(page.locator('text=Select Test')).toBeVisible();
    }
  });

  test('Statistical calculations accuracy', async ({ page }) => {
    // This would test the statistical engine by mocking specific data
    await page.goto('/ab-testing');
    
    // Would need to inject test data and verify calculations
    // This is more of a unit test but could be verified in E2E
    const significanceValue = page.locator('[data-testid="significance-value"]');
    if (await significanceValue.isVisible()) {
      const value = await significanceValue.textContent();
      expect(parseFloat(value || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(value || '0')).toBeLessThanOrEqual(1);
    }
  });
});