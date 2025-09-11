import { test, expect } from '@playwright/test';

test.describe('AI Recommendation User Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/couples/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should provide personalized wedding style recommendations', async ({ page }) => {
    // Navigate to style recommendation section
    await page.click('[data-testid=ai-style-recommendations]');
    await expect(page.locator('[data-testid=style-quiz-interface]')).toBeVisible();

    // Complete style preference quiz
    await page.click('[data-testid=style-modern]');
    await page.click('[data-testid=atmosphere-elegant]');
    await page.click('[data-testid=color-neutral]');
    await page.click('[data-testid=venue-indoor]');
    
    // Submit preferences
    await page.click('[data-testid=submit-style-preferences]');
    
    // Wait for AI analysis
    await expect(page.locator('[data-testid=ai-analyzing-style]')).toBeVisible();
    await expect(page.locator('[data-testid=style-recommendations]')).toBeVisible({ timeout: 15000 });

    // Verify personalized recommendations
    const styleRecommendations = page.locator('[data-testid=style-recommendation-card]');
    await expect(styleRecommendations).toHaveCount.greaterThanOrEqual(3);

    // Check first recommendation
    const firstRecommendation = styleRecommendations.first();
    await expect(firstRecommendation.locator('.style-name')).toBeVisible();
    await expect(firstRecommendation.locator('.confidence-score')).toBeVisible();
    await expect(firstRecommendation.locator('.why-recommended')).toBeVisible();

    // Verify reasoning includes user preferences
    const reasoning = await firstRecommendation.locator('.why-recommended').textContent();
    expect(reasoning.toLowerCase()).toMatch(/(modern|elegant|neutral)/);

    // Test style exploration
    await firstRecommendation.click();
    await expect(page.locator('[data-testid=style-details-modal]')).toBeVisible();
    await expect(page.locator('[data-testid=style-gallery]')).toBeVisible();
    await expect(page.locator('[data-testid=vendor-examples]')).toBeVisible();
  });

  test('should show intelligent vendor matching with explanations', async ({ page }) => {
    // Navigate to vendor recommendations
    await page.click('[data-testid=find-vendors]');
    await expect(page.locator('[data-testid=vendor-finder-interface]')).toBeVisible();

    // Select photography category
    await page.click('[data-testid=category-photography]');
    
    // Fill requirements
    await page.fill('[data-testid=budget-max]', '3500');
    await page.selectOption('[data-testid=style-preference]', 'modern');
    await page.selectOption('[data-testid=quality-priority]', 'high');
    
    // Enable AI matching
    await page.check('[data-testid=enable-ai-matching]');
    
    // Start AI vendor search
    await page.click('[data-testid=find-vendors-ai]');

    // Wait for AI recommendations
    await expect(page.locator('[data-testid=ai-vendor-results]')).toBeVisible({ timeout: 20000 });

    // Verify intelligent matching
    const vendorCards = page.locator('[data-testid=ai-vendor-card]');
    await expect(vendorCards).toHaveCount.greaterThanOrEqual(5);

    // Check AI explanations
    const firstVendor = vendorCards.first();
    await expect(firstVendor.locator('[data-testid=ai-match-explanation]')).toBeVisible();
    await expect(firstVendor.locator('[data-testid=compatibility-score]')).toBeVisible();
    await expect(firstVendor.locator('[data-testid=why-good-match]')).toBeVisible();

    // Verify match reasoning
    const matchExplanation = await firstVendor.locator('[data-testid=why-good-match]').textContent();
    expect(matchExplanation.toLowerCase()).toMatch(/(style|budget|quality|experience)/);

    // Test detailed vendor analysis
    await firstVendor.locator('[data-testid=view-ai-analysis]').click();
    await expect(page.locator('[data-testid=vendor-ai-analysis-modal]')).toBeVisible();
    
    // Verify detailed analysis components
    await expect(page.locator('[data-testid=style-compatibility-analysis]')).toBeVisible();
    await expect(page.locator('[data-testid=personality-match-analysis]')).toBeVisible();
    await expect(page.locator('[data-testid=communication-style-analysis]')).toBeVisible();
    await expect(page.locator('[data-testid=reliability-analysis]')).toBeVisible();
  });

  test('should provide contextual budget optimization suggestions', async ({ page }) => {
    // Navigate to budget planner
    await page.click('[data-testid=budget-planner]');
    await expect(page.locator('[data-testid=budget-interface]')).toBeVisible();

    // Enter current budget allocation
    await page.fill('[data-testid=total-budget]', '28000');
    await page.fill('[data-testid=venue-allocation]', '10000');
    await page.fill('[data-testid=catering-allocation]', '8000');
    await page.fill('[data-testid=photography-allocation]', '4000');
    await page.fill('[data-testid=flowers-allocation]', '2500');
    await page.fill('[data-testid=music-allocation]', '2000');
    await page.fill('[data-testid=other-allocation]', '1500');

    // Enable AI budget analysis
    await page.click('[data-testid=analyze-budget-ai]');

    // Wait for AI analysis
    await expect(page.locator('[data-testid=ai-budget-analysis]')).toBeVisible({ timeout: 15000 });

    // Verify contextual suggestions
    const budgetSuggestions = page.locator('[data-testid=budget-suggestion]');
    await expect(budgetSuggestions).toHaveCount.greaterThanOrEqual(3);

    // Check suggestion types
    const suggestions = await budgetSuggestions.allTextContents();
    const hasOptimizationSuggestion = suggestions.some(s => 
      s.toLowerCase().includes('save') || s.toLowerCase().includes('optimize')
    );
    const hasReallocationSuggestion = suggestions.some(s => 
      s.toLowerCase().includes('reallocate') || s.toLowerCase().includes('adjust')
    );
    const hasAlternativeSuggestion = suggestions.some(s => 
      s.toLowerCase().includes('alternative') || s.toLowerCase().includes('consider')
    );

    expect(hasOptimizationSuggestion).toBe(true);
    expect(hasReallocationSuggestion).toBe(true);
    expect(hasAlternativeSuggestion).toBe(true);

    // Test suggestion interaction
    const firstSuggestion = budgetSuggestions.first();
    await firstSuggestion.locator('[data-testid=view-details]').click();
    
    await expect(page.locator('[data-testid=suggestion-details-modal]')).toBeVisible();
    await expect(page.locator('[data-testid=potential-savings]')).toBeVisible();
    await expect(page.locator('[data-testid=implementation-steps]')).toBeVisible();
    await expect(page.locator('[data-testid=risk-assessment]')).toBeVisible();
  });

  test('should guide users through timeline optimization with smart suggestions', async ({ page }) => {
    // Navigate to timeline builder
    await page.click('[data-testid=timeline-builder]');
    await expect(page.locator('[data-testid=timeline-interface]')).toBeVisible();

    // Set wedding date
    await page.fill('[data-testid=wedding-date]', '2024-09-21');
    
    // Add some tasks manually first
    await page.click('[data-testid=add-task]');
    await page.fill('[data-testid=task-name]', 'Book venue');
    await page.selectOption('[data-testid=task-category]', 'venue');
    await page.click('[data-testid=save-task]');

    await page.click('[data-testid=add-task]');
    await page.fill('[data-testid=task-name]', 'Send invitations');
    await page.selectOption('[data-testid=task-category]', 'invitations');
    await page.click('[data-testid=save-task]');

    // Enable AI timeline optimization
    await page.click('[data-testid=optimize-timeline-ai]');

    // Wait for AI suggestions
    await expect(page.locator('[data-testid=ai-timeline-suggestions]')).toBeVisible({ timeout: 20000 });

    // Verify smart suggestions
    const suggestions = page.locator('[data-testid=timeline-ai-suggestion]');
    await expect(suggestions).toHaveCount.greaterThanOrEqual(4);

    // Check for different types of suggestions
    const suggestionTexts = await suggestions.allTextContents();
    const hasMissingTaskSuggestion = suggestionTexts.some(s => 
      s.toLowerCase().includes('missing') || s.toLowerCase().includes('add')
    );
    const hasTimingSuggestion = suggestionTexts.some(s => 
      s.toLowerCase().includes('timing') || s.toLowerCase().includes('schedule')
    );
    const hasDependencySuggestion = suggestionTexts.some(s => 
      s.toLowerCase().includes('dependency') || s.toLowerCase().includes('before')
    );

    expect(hasMissingTaskSuggestion).toBe(true);
    expect(hasTimingSuggestion).toBe(true);
    expect(hasDependencySuggestion).toBe(true);

    // Test suggestion acceptance
    const firstSuggestion = suggestions.first();
    await firstSuggestion.locator('[data-testid=accept-suggestion]').click();
    
    await expect(page.locator('[data-testid=suggestion-applied]')).toBeVisible();
    await expect(page.locator('[data-testid=timeline-updated]')).toBeVisible();

    // Verify timeline was actually updated
    const timelineTasks = page.locator('[data-testid=timeline-task]');
    const taskCountAfter = await timelineTasks.count();
    expect(taskCountAfter).toBeGreaterThan(2); // More than the 2 we added manually
  });

  test('should provide crisis management recommendations proactively', async ({ page }) => {
    // Navigate to wedding overview
    await page.click('[data-testid=wedding-overview]');
    
    // Set up a potential crisis scenario
    await page.goto('/couples/dashboard/vendors');
    await page.click('[data-testid=add-vendor-issue]'); // Test method to simulate issue
    
    await page.selectOption('[data-testid=issue-type]', 'vendor_reliability');
    await page.selectOption('[data-testid=vendor-category]', 'photography');
    await page.fill('[data-testid=issue-details]', 'Photographer seems overbooked and not responding to messages');
    await page.click('[data-testid=report-issue]');

    // Wait for AI crisis detection
    await expect(page.locator('[data-testid=ai-crisis-alert]')).toBeVisible({ timeout: 10000 });
    
    // Verify proactive recommendations
    await expect(page.locator('[data-testid=crisis-severity-indicator]')).toBeVisible();
    await expect(page.locator('[data-testid=crisis-recommendations]')).toBeVisible();

    const crisisRecommendations = page.locator('[data-testid=crisis-recommendation]');
    await expect(crisisRecommendations).toHaveCount.greaterThanOrEqual(3);

    // Check recommendation quality
    const immediateActions = crisisRecommendations.filter({ hasText: /immediate|urgent|now/i });
    const preventiveActions = crisisRecommendations.filter({ hasText: /backup|alternative|prepare/i });
    
    await expect(immediateActions).toHaveCount.greaterThanOrEqual(1);
    await expect(preventiveActions).toHaveCount.greaterThanOrEqual(1);

    // Test crisis action implementation
    const firstRecommendation = crisisRecommendations.first();
    await firstRecommendation.locator('[data-testid=implement-recommendation]').click();
    
    await expect(page.locator('[data-testid=implementation-guide]')).toBeVisible();
    await expect(page.locator('[data-testid=step-by-step-actions]')).toBeVisible();
    await expect(page.locator('[data-testid=emergency-contacts]')).toBeVisible();
  });

  test('should learn from user feedback and improve recommendations', async ({ page }) => {
    // Complete a recommendation workflow first
    await page.click('[data-testid=ai-style-recommendations]');
    await page.click('[data-testid=style-modern]');
    await page.click('[data-testid=submit-style-preferences]');
    await expect(page.locator('[data-testid=style-recommendations]')).toBeVisible({ timeout: 15000 });

    // Interact with recommendations
    const recommendations = page.locator('[data-testid=style-recommendation-card]');
    const firstRecommendation = recommendations.first();
    
    // Accept first recommendation
    await firstRecommendation.locator('[data-testid=accept-recommendation]').click();
    
    // Provide feedback
    await expect(page.locator('[data-testid=feedback-modal]')).toBeVisible();
    
    // Rate the recommendation
    await page.click('[data-testid=rating-5-stars]');
    
    // Provide specific feedback
    await page.fill('[data-testid=feedback-text]', 'Perfect match for our vision! Love the color palette suggestions.');
    await page.click('[data-testid=submit-feedback]');

    // Reject second recommendation with feedback
    const secondRecommendation = recommendations.nth(1);
    await secondRecommendation.locator('[data-testid=reject-recommendation]').click();
    
    await expect(page.locator('[data-testid=rejection-feedback-modal]')).toBeVisible();
    await page.selectOption('[data-testid=rejection-reason]', 'style_mismatch');
    await page.fill('[data-testid=rejection-details]', 'Too formal for our casual beach wedding style');
    await page.click('[data-testid=submit-rejection-feedback]');

    // Navigate to vendor recommendations to see learning effect
    await page.click('[data-testid=find-vendors]');
    await page.click('[data-testid=category-photography]');
    await page.check('[data-testid=enable-ai-matching]');
    await page.click('[data-testid=find-vendors-ai]');

    await expect(page.locator('[data-testid=ai-vendor-results]')).toBeVisible({ timeout: 20000 });

    // Verify learning has been applied
    const vendorRecommendations = page.locator('[data-testid=ai-vendor-card]');
    const firstVendor = vendorRecommendations.first();
    
    const matchExplanation = await firstVendor.locator('[data-testid=why-good-match]').textContent();
    
    // Should reference learning from previous feedback
    expect(matchExplanation.toLowerCase()).toMatch(/(learned|preference|feedback|casual|beach)/);
    
    // Check for improved confidence scores
    const confidenceScore = await firstVendor.locator('[data-testid=compatibility-score]').textContent();
    const score = parseFloat(confidenceScore.replace(/[^0-9.]/g, ''));
    expect(score).toBeGreaterThan(0.8); // High confidence due to learning
  });

  test('should provide accessibility-optimized AI recommendations', async ({ page }) => {
    // Enable accessibility mode
    await page.goto('/couples/dashboard?accessibility=true');
    await page.waitForLoadState('networkidle');

    // Navigate to AI recommendations
    await page.click('[data-testid=ai-recommendations-accessible]');
    
    // Verify accessibility features
    await expect(page.locator('[data-testid=recommendations-main][role="main"]')).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus first recommendation
    const activeElement = page.locator(':focus');
    await expect(activeElement).toHaveAttribute('data-testid', 'recommendation-card-0');

    // Verify screen reader support
    const firstRecommendation = page.locator('[data-testid=recommendation-card-0]');
    await expect(firstRecommendation).toHaveAttribute('aria-label');
    await expect(firstRecommendation).toHaveAttribute('aria-describedby');

    // Test voice control simulation
    await page.keyboard.press('Enter'); // Activate recommendation
    await expect(page.locator('[data-testid=recommendation-details][role="dialog"]')).toBeVisible();
    
    // Verify modal accessibility
    const modal = page.locator('[data-testid=recommendation-details]');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');
    
    // Test focus management
    const modalCloseButton = modal.locator('[data-testid=close-modal]');
    await expect(modalCloseButton).toBeFocused();

    // Test with reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    
    // Verify animations are disabled/reduced
    const animatedElements = page.locator('[data-testid=recommendation-card]');
    await expect(animatedElements.first()).toHaveCSS('transition-duration', '0s');
  });

  test('should handle recommendation preferences and customization', async ({ page }) => {
    // Navigate to AI preferences
    await page.click('[data-testid=ai-preferences]');
    await expect(page.locator('[data-testid=preferences-interface]')).toBeVisible();

    // Customize AI behavior
    await page.selectOption('[data-testid=recommendation-frequency]', 'moderate');
    await page.selectOption('[data-testid=suggestion-style]', 'detailed');
    
    // Set priority preferences
    await page.check('[data-testid=prioritize-budget-optimization]');
    await page.check('[data-testid=prioritize-quality-vendors]');
    await page.uncheck('[data-testid=prioritize-trendy-options]');
    
    // Set communication preferences
    await page.selectOption('[data-testid=explanation-level]', 'comprehensive');
    await page.check('[data-testid=show-confidence-scores]');
    await page.check('[data-testid=include-alternatives]');

    // Save preferences
    await page.click('[data-testid=save-ai-preferences]');
    await expect(page.locator('[data-testid=preferences-saved]')).toBeVisible();

    // Test customized recommendations
    await page.click('[data-testid=get-recommendations]');
    await expect(page.locator('[data-testid=customized-recommendations]')).toBeVisible({ timeout: 15000 });

    // Verify preferences are applied
    const recommendations = page.locator('[data-testid=recommendation-card]');
    const firstRecommendation = recommendations.first();
    
    // Check for detailed explanations (as requested in preferences)
    await expect(firstRecommendation.locator('[data-testid=detailed-explanation]')).toBeVisible();
    await expect(firstRecommendation.locator('[data-testid=confidence-score-display]')).toBeVisible();
    await expect(firstRecommendation.locator('[data-testid=alternative-options]')).toBeVisible();

    // Verify budget optimization priority
    const budgetFocusedRecommendations = recommendations.filter({ hasText: /save|budget|cost|afford/i });
    await expect(budgetFocusedRecommendations).toHaveCount.greaterThanOrEqual(2);
  });

  test('should provide real-time recommendation updates during planning', async ({ page }) => {
    // Start with basic wedding info
    await page.goto('/couples/wedding-setup');
    await page.fill('[data-testid=wedding-date]', '2024-08-17');
    await page.fill('[data-testid=guest-count]', '150');
    await page.selectOption('[data-testid=wedding-style]', 'rustic');
    await page.fill('[data-testid=budget]', '30000');
    await page.click('[data-testid=save-basic-info]');

    // Navigate to dashboard
    await page.goto('/couples/dashboard');
    
    // Enable real-time AI recommendations
    await page.click('[data-testid=enable-realtime-ai]');
    await expect(page.locator('[data-testid=realtime-ai-active]')).toBeVisible();

    // Make a planning change that should trigger AI recommendations
    await page.click('[data-testid=budget-planner]');
    await page.fill('[data-testid=venue-budget]', '12000'); // High venue allocation
    await page.click('[data-testid=save-budget-change]');

    // Wait for real-time AI response
    await expect(page.locator('[data-testid=realtime-ai-notification]')).toBeVisible({ timeout: 5000 });
    
    // Click to view recommendation
    await page.click('[data-testid=view-realtime-recommendation]');
    await expect(page.locator('[data-testid=budget-adjustment-suggestion]')).toBeVisible();

    // Make another change - add venue
    await page.click('[data-testid=add-vendor]');
    await page.selectOption('[data-testid=vendor-type]', 'venue');
    await page.fill('[data-testid=vendor-name]', 'Rustic Barn Venue');
    await page.fill('[data-testid=vendor-cost]', '8000');
    await page.click('[data-testid=save-vendor]');

    // Wait for cascading AI recommendations
    await expect(page.locator('[data-testid=cascading-recommendations]')).toBeVisible({ timeout: 5000 });
    
    // Verify related recommendations appear
    const cascadingRecs = page.locator('[data-testid=cascading-recommendation]');
    await expect(cascadingRecs).toHaveCount.greaterThanOrEqual(2);
    
    // Should include related vendors and style suggestions
    const relatedVendorRec = cascadingRecs.filter({ hasText: /photographer|catering|florals/i });
    const styleRec = cascadingRecs.filter({ hasText: /rustic|barn|country/i });
    
    await expect(relatedVendorRec).toHaveCount.greaterThanOrEqual(1);
    await expect(styleRec).toHaveCount.greaterThanOrEqual(1);
  });
});