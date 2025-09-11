import { test, expect } from '@playwright/test';

test.describe('AI Wedding Optimization E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/couples/wedding-planner/ai-optimization');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full AI optimization workflow', async ({ page }) => {
    // Step 1: Initiate AI optimization
    await page.click('[data-testid=start-ai-optimization]');
    
    // Verify optimization interface loads
    await expect(page.locator('[data-testid=optimization-categories]')).toBeVisible();
    await expect(page.locator('[data-testid=budget-optimization]')).toBeVisible();
    await expect(page.locator('[data-testid=vendor-optimization]')).toBeVisible();
    await expect(page.locator('[data-testid=timeline-optimization]')).toBeVisible();

    // Step 2: Select comprehensive optimization
    await page.click('[data-testid=comprehensive-optimization]');
    await page.click('[data-testid=confirm-optimization]');

    // Verify optimization starts
    await expect(page.locator('[data-testid=optimization-progress]')).toBeVisible();
    await expect(page.locator('text=Analyzing your wedding plan')).toBeVisible();

    // Step 3: Wait for AI optimization to complete (max 30 seconds)
    await expect(page.locator('[data-testid=optimization-complete]')).toBeVisible({
      timeout: 30000
    });

    // Step 4: Verify AI recommendations are displayed
    const recommendationCards = page.locator('[data-testid=ai-recommendation-card]');
    await expect(recommendationCards).toHaveCount.greaterThanOrEqual(4);

    // Verify each recommendation has required elements
    const firstRecommendation = recommendationCards.first();
    await expect(firstRecommendation.locator('.recommendation-title')).toBeVisible();
    await expect(firstRecommendation.locator('.potential-savings')).toBeVisible();
    await expect(firstRecommendation.locator('.confidence-score')).toBeVisible();
    await expect(firstRecommendation.locator('.accept-button')).toBeVisible();

    // Step 5: Accept a high-confidence recommendation
    await firstRecommendation.locator('.accept-button').click();
    await expect(page.locator('[data-testid=recommendation-accepted]')).toBeVisible();

    // Step 6: Verify optimization results are saved
    await page.click('[data-testid=save-optimization]');
    await expect(page.locator('text=Optimization saved successfully')).toBeVisible();
  });

  test('should handle AI optimization errors gracefully', async ({ page }) => {
    // Mock AI service failure
    await page.route('/api/ai/optimize', route => 
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'AI service unavailable' }) })
    );

    await page.click('[data-testid=start-ai-optimization]');
    await page.click('[data-testid=comprehensive-optimization]');
    await page.click('[data-testid=confirm-optimization]');

    // Verify error handling
    await expect(page.locator('[data-testid=optimization-error]')).toBeVisible();
    await expect(page.locator('text=AI optimization temporarily unavailable')).toBeVisible();
    await expect(page.locator('[data-testid=retry-optimization]')).toBeVisible();

    // Verify retry functionality
    await page.unroute('/api/ai/optimize');
    await page.click('[data-testid=retry-optimization]');
    await expect(page.locator('[data-testid=optimization-progress]')).toBeVisible();
  });

  test('should provide real-time optimization progress', async ({ page }) => {
    await page.click('[data-testid=start-ai-optimization]');
    await page.click('[data-testid=comprehensive-optimization]');
    await page.click('[data-testid=confirm-optimization]');

    // Verify progress indicators update
    const progressSteps = [
      'Analyzing wedding preferences',
      'Evaluating budget allocation',
      'Matching optimal vendors',
      'Optimizing timeline',
      'Generating recommendations'
    ];

    for (const step of progressSteps) {
      await expect(page.locator(`text=${step}`)).toBeVisible({ timeout: 10000 });
    }

    // Verify progress bar updates
    const progressBar = page.locator('[data-testid=optimization-progress-bar]');
    await expect(progressBar).toHaveAttribute('data-progress', '100');
  });

  test('should allow recommendation customization', async ({ page }) => {
    // Complete optimization first
    await page.click('[data-testid=start-ai-optimization]');
    await page.click('[data-testid=comprehensive-optimization]');
    await page.click('[data-testid=confirm-optimization]');
    await expect(page.locator('[data-testid=optimization-complete]')).toBeVisible({ timeout: 30000 });

    // Select a recommendation to customize
    const recommendationCard = page.locator('[data-testid=ai-recommendation-card]').first();
    await recommendationCard.locator('[data-testid=customize-recommendation]').click();

    // Verify customization panel opens
    await expect(page.locator('[data-testid=recommendation-customization-panel]')).toBeVisible();

    // Customize budget range
    await page.fill('[data-testid=budget-range-min]', '2000');
    await page.fill('[data-testid=budget-range-max]', '3500');

    // Customize preferences
    await page.check('[data-testid=preference-eco-friendly]');
    await page.uncheck('[data-testid=preference-traditional]');

    // Apply customization
    await page.click('[data-testid=apply-customization]');

    // Verify recommendation updates
    await expect(page.locator('[data-testid=customization-applied]')).toBeVisible();
    await expect(recommendationCard.locator('.budget-range')).toContainText('£2,000 - £3,500');
  });

  test('should handle budget optimization workflow', async ({ page }) => {
    // Navigate to budget optimization
    await page.click('[data-testid=budget-optimization]');
    await expect(page.locator('[data-testid=budget-optimization-interface]')).toBeVisible();

    // Enter current budget details
    await page.fill('[data-testid=total-budget]', '25000');
    await page.fill('[data-testid=venue-budget]', '8000');
    await page.fill('[data-testid=catering-budget]', '6000');
    await page.fill('[data-testid=photography-budget]', '3500');
    await page.fill('[data-testid=flowers-budget]', '2000');

    // Set savings target
    await page.selectOption('[data-testid=savings-target]', '25'); // 25% savings

    // Mark non-negotiable items
    await page.check('[data-testid=non-negotiable-photography]');
    await page.check('[data-testid=non-negotiable-venue]');

    // Start budget optimization
    await page.click('[data-testid=optimize-budget]');

    // Wait for optimization results
    await expect(page.locator('[data-testid=budget-optimization-results]')).toBeVisible({ timeout: 20000 });

    // Verify optimization results
    const totalSavings = page.locator('[data-testid=total-savings]');
    await expect(totalSavings).toBeVisible();
    
    const savingsAmount = await totalSavings.textContent();
    const savingsValue = parseInt(savingsAmount.replace(/[£,]/g, ''));
    expect(savingsValue).toBeGreaterThan(5000); // At least £5000 savings

    // Verify non-negotiable items preserved
    await expect(page.locator('[data-testid=photography-preserved]')).toContainText('£3,500');
    
    // Check optimization strategies
    const strategies = page.locator('[data-testid=optimization-strategy]');
    await expect(strategies).toHaveCount.greaterThanOrEqual(3);
  });

  test('should handle vendor recommendation workflow', async ({ page }) => {
    // Navigate to vendor optimization
    await page.click('[data-testid=vendor-optimization]');
    await expect(page.locator('[data-testid=vendor-optimization-interface]')).toBeVisible();

    // Select vendor categories to optimize
    await page.check('[data-testid=optimize-photography]');
    await page.check('[data-testid=optimize-catering]');
    await page.check('[data-testid=optimize-flowers]');

    // Set preferences
    await page.selectOption('[data-testid=style-preference]', 'modern');
    await page.selectOption('[data-testid=quality-priority]', 'high');
    await page.fill('[data-testid=budget-range-max]', '30000');

    // Start vendor optimization
    await page.click('[data-testid=optimize-vendors]');

    // Wait for vendor recommendations
    await expect(page.locator('[data-testid=vendor-recommendations]')).toBeVisible({ timeout: 25000 });

    // Verify vendor recommendations by category
    const photographyRecommendations = page.locator('[data-testid=photography-recommendations] .vendor-card');
    await expect(photographyRecommendations).toHaveCount.greaterThanOrEqual(3);

    const cateringRecommendations = page.locator('[data-testid=catering-recommendations] .vendor-card');
    await expect(cateringRecommendations).toHaveCount.greaterThanOrEqual(3);

    // Verify vendor cards have required information
    const firstPhotographer = photographyRecommendations.first();
    await expect(firstPhotographer.locator('.vendor-name')).toBeVisible();
    await expect(firstPhotographer.locator('.vendor-rating')).toBeVisible();
    await expect(firstPhotographer.locator('.vendor-price')).toBeVisible();
    await expect(firstPhotographer.locator('.style-match-score')).toBeVisible();

    // Test vendor comparison
    await firstPhotographer.locator('[data-testid=compare-vendor]').check();
    await photographyRecommendations.nth(1).locator('[data-testid=compare-vendor]').check();
    
    await page.click('[data-testid=compare-selected-vendors]');
    await expect(page.locator('[data-testid=vendor-comparison-modal]')).toBeVisible();
    
    // Verify comparison details
    await expect(page.locator('[data-testid=comparison-table]')).toBeVisible();
    await expect(page.locator('[data-testid=comparison-scores]')).toBeVisible();
  });

  test('should handle timeline optimization workflow', async ({ page }) => {
    // Navigate to timeline optimization
    await page.click('[data-testid=timeline-optimization]');
    await expect(page.locator('[data-testid=timeline-optimization-interface]')).toBeVisible();

    // Enter wedding details
    await page.fill('[data-testid=wedding-date]', '2024-09-15');
    await page.fill('[data-testid=current-progress]', '30'); // 30% complete
    
    // Select optimization goals
    await page.check('[data-testid=minimize-conflicts]');
    await page.check('[data-testid=optimize-vendor-scheduling]');
    await page.check('[data-testid=add-buffer-time]');

    // Start timeline optimization
    await page.click('[data-testid=optimize-timeline]');

    // Wait for timeline results
    await expect(page.locator('[data-testid=optimized-timeline]')).toBeVisible({ timeout: 20000 });

    // Verify timeline visualization
    await expect(page.locator('[data-testid=timeline-gantt-chart]')).toBeVisible();
    await expect(page.locator('[data-testid=critical-path]')).toBeVisible();

    // Check for conflict resolution
    const conflicts = page.locator('[data-testid=timeline-conflicts]');
    const conflictCount = await conflicts.count();
    expect(conflictCount).toBeLessThan(3); // Should minimize conflicts

    // Verify key milestones
    const milestones = page.locator('[data-testid=timeline-milestone]');
    await expect(milestones).toHaveCount.greaterThanOrEqual(5);

    // Test timeline adjustments
    await page.click('[data-testid=adjust-timeline]');
    await expect(page.locator('[data-testid=timeline-adjustment-panel]')).toBeVisible();
    
    await page.fill('[data-testid=buffer-days]', '7');
    await page.click('[data-testid=apply-adjustments]');
    
    await expect(page.locator('[data-testid=timeline-updated]')).toBeVisible();
  });

  test('should handle mobile responsive AI optimization', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/couples/wedding-planner/ai-optimization');
    await page.waitForLoadState('networkidle');

    // Verify mobile-optimized interface
    await expect(page.locator('[data-testid=mobile-optimization-interface]')).toBeVisible();
    await expect(page.locator('[data-testid=optimization-carousel]')).toBeVisible();

    // Navigate through optimization options
    await page.click('[data-testid=comprehensive-optimization-mobile]');
    
    // Verify mobile progress indicator
    await page.click('[data-testid=start-optimization-mobile]');
    await expect(page.locator('[data-testid=mobile-progress-steps]')).toBeVisible();

    // Wait for completion and verify mobile recommendations
    await expect(page.locator('[data-testid=mobile-recommendations]')).toBeVisible({ timeout: 30000 });
    
    const mobileRecommendationCards = page.locator('[data-testid=mobile-recommendation-card]');
    await expect(mobileRecommendationCards).toHaveCount.greaterThanOrEqual(3);

    // Test mobile swipe navigation
    const firstCard = mobileRecommendationCards.first();
    await expect(firstCard).toBeVisible();
    
    // Swipe to next recommendation
    await page.touchscreen.tap(200, 400);
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(100, 400);
    await page.mouse.up();

    // Verify next card is visible
    const secondCard = mobileRecommendationCards.nth(1);
    await expect(secondCard).toBeVisible();
  });

  test('should handle AI optimization with accessibility features', async ({ page }) => {
    // Navigate with keyboard only
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Start optimization

    // Verify screen reader support
    const optimizationInterface = page.locator('[data-testid=optimization-categories]');
    await expect(optimizationInterface).toHaveAttribute('aria-label');
    await expect(optimizationInterface).toHaveAttribute('role');

    // Check high contrast mode compatibility
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await expect(page.locator('[data-testid=high-contrast-optimization]')).toBeVisible();
    
    // Test with reduced motion
    const progressAnimation = page.locator('[data-testid=optimization-progress]');
    await expect(progressAnimation).toHaveCSS('animation-duration', '0s');

    // Verify keyboard navigation through recommendations
    await page.keyboard.press('Tab'); // Focus first recommendation
    await page.keyboard.press('Enter'); // Accept recommendation
    await expect(page.locator('[data-testid=recommendation-accepted]')).toBeVisible();

    // Test ARIA live regions for dynamic updates
    const liveRegion = page.locator('[data-testid=optimization-status][aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
  });

  test('should persist optimization data across sessions', async ({ page, context }) => {
    // Complete an optimization
    await page.click('[data-testid=start-ai-optimization]');
    await page.click('[data-testid=comprehensive-optimization]');
    await page.click('[data-testid=confirm-optimization]');
    await expect(page.locator('[data-testid=optimization-complete]')).toBeVisible({ timeout: 30000 });

    // Save optimization
    await page.click('[data-testid=save-optimization]');
    await expect(page.locator('text=Optimization saved successfully')).toBeVisible();

    // Get optimization ID for verification
    const optimizationId = await page.locator('[data-testid=optimization-id]').textContent();

    // Close browser and create new session
    await context.close();
    const newContext = await page.context().browser().newContext();
    const newPage = await newContext.newPage();

    // Navigate back to optimization page
    await newPage.goto('/couples/wedding-planner/ai-optimization');
    await newPage.waitForLoadState('networkidle');

    // Verify saved optimization is available
    await expect(newPage.locator('[data-testid=saved-optimizations]')).toBeVisible();
    
    const savedOptimization = newPage.locator(`[data-optimization-id="${optimizationId}"]`);
    await expect(savedOptimization).toBeVisible();
    
    // Load saved optimization
    await savedOptimization.click();
    await expect(newPage.locator('[data-testid=optimization-loaded]')).toBeVisible();
    
    // Verify recommendations are restored
    const restoredRecommendations = newPage.locator('[data-testid=ai-recommendation-card]');
    await expect(restoredRecommendations).toHaveCount.greaterThanOrEqual(3);

    await newContext.close();
  });

  test('should handle concurrent optimizations efficiently', async ({ page, browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Start concurrent optimizations
    const optimizationPromises = pages.map(async (concurrentPage, index) => {
      await concurrentPage.goto('/couples/wedding-planner/ai-optimization');
      await concurrentPage.waitForLoadState('networkidle');
      
      await concurrentPage.click('[data-testid=start-ai-optimization]');
      await concurrentPage.click('[data-testid=comprehensive-optimization]');
      await concurrentPage.click('[data-testid=confirm-optimization]');
      
      return concurrentPage.waitForSelector('[data-testid=optimization-complete]', { timeout: 45000 });
    });

    // Wait for all optimizations to complete
    const results = await Promise.all(optimizationPromises);
    
    // Verify all completed successfully
    expect(results.length).toBe(3);
    results.forEach(result => {
      expect(result).toBeTruthy();
    });

    // Verify individual page results
    for (const concurrentPage of pages) {
      const recommendations = concurrentPage.locator('[data-testid=ai-recommendation-card]');
      await expect(recommendations).toHaveCount.greaterThanOrEqual(3);
    }

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});