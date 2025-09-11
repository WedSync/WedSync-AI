/**
 * E2E TESTS: WS-236 User Feedback System Complete Workflows
 * Team E - Batch 2, Round 1
 *
 * Complete end-to-end testing using Playwright MCP for:
 * - NPS surveys with wedding context
 * - Feature feedback collection
 * - Mobile responsive feedback widgets
 * - Admin analytics dashboard
 * - Cross-user feedback scenarios
 */

import { test, expect } from '@playwright/test';

// Test data for wedding industry scenarios
const TEST_USERS = {
  photographer: {
    email: 'photographer.e2e@wedsync.test',
    password: 'TestPassword123!',
    vendorType: 'photographer',
    tier: 'professional',
  },
  venue: {
    email: 'venue.e2e@wedsync.test',
    password: 'TestPassword123!',
    vendorType: 'venue',
    tier: 'scale',
  },
  couple: {
    email: 'couple.e2e@wedsync.test',
    password: 'TestPassword123!',
    weddingDate: '2025-09-15',
    planningPhase: 'active_planning',
  },
  admin: {
    email: 'admin.e2e@wedsync.test',
    password: 'AdminPassword123!',
    role: 'admin',
  },
};

test.describe('NPS Feedback Workflow - Wedding Industry Context', () => {
  test.beforeEach(async ({ page }) => {
    // Login as photographer
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should complete NPS survey with photographer-specific questions', async ({
    page,
  }) => {
    // Simulate reaching NPS milestone (completed 5 client forms)
    await page.evaluate(() => {
      window.localStorage.setItem(
        'milestone_trigger',
        'client_forms_completed',
      );
      window.localStorage.setItem('milestone_count', '5');
    });

    // Trigger NPS survey
    await page.goto('/dashboard');

    // Wait for feedback widget to appear with NPS trigger
    await page.waitForSelector('[data-testid="feedback-widget"]');
    await page.click('[data-testid="feedback-widget"]');

    // Verify NPS survey modal appears
    await expect(
      page.locator('[data-testid="nps-survey-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=How likely are you to recommend WedSync'),
    ).toBeVisible();

    // Take screenshot of initial NPS survey
    await page.screenshot({ path: 'e2e-screenshots/nps-survey-initial.png' });

    // Select NPS score of 9 (promoter)
    await page.click('[data-testid="nps-score-9"]');
    await expect(page.locator('[data-testid="nps-score-9"]')).toHaveClass(
      /selected/,
    );

    // Verify photographer-specific follow-up question appears
    await expect(
      page.locator('text=How has WedSync impacted your wedding business'),
    ).toBeVisible();

    // Fill photographer-specific feedback
    const photographerFeedback =
      "WedSync has revolutionized my client onboarding process! I can create beautiful forms in minutes instead of hours. My couples love how organized everything is, and I've reduced my admin time by 60%. The automated workflows help me focus on what I do best - capturing amazing wedding photos.";
    await page.fill(
      '[data-testid="nps-business-impact-textarea"]',
      photographerFeedback,
    );

    // Verify character count and limits
    await expect(page.locator('[data-testid="character-count"]')).toContainText(
      '387/500',
    );

    // Answer vendor-specific question
    await expect(
      page.locator('text=As a photographer, what features are most valuable'),
    ).toBeVisible();
    await page.fill(
      '[data-testid="vendor-specific-feedback"]',
      'Form builder, client gallery sharing, and automated email sequences are game-changers for my photography workflow.',
    );

    // Select improvement priority
    await page.click('[data-testid="improvement-priority-select"]');
    await page.click('[data-option="better-client-communication"]');

    // Answer wedding season context question
    await page.click('[data-testid="wedding-season-select"]');
    await page.click('[data-option="very-busy-peak-season"]');

    // Take screenshot before submission
    await page.screenshot({ path: 'e2e-screenshots/nps-survey-completed.png' });

    // Submit NPS feedback
    await page.click('[data-testid="submit-nps-feedback"]');

    // Verify thank you message for promoter
    await expect(
      page.locator('[data-testid="nps-thank-you-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=Thank you for being a WedSync promoter'),
    ).toBeVisible();
    await expect(page.locator('text=referral program')).toBeVisible();

    // Take screenshot of thank you message
    await page.screenshot({
      path: 'e2e-screenshots/nps-thank-you-promoter.png',
    });

    // Verify referral program invitation
    await expect(
      page.locator('[data-testid="referral-program-invite"]'),
    ).toBeVisible();
    await page.click('[data-testid="join-referral-program"]');

    // Verify successful submission and feedback widget disappears
    await page.waitForSelector('[data-testid="feedback-widget"]', {
      state: 'hidden',
      timeout: 5000,
    });

    // Check that feedback was saved (verify in profile or settings)
    await page.goto('/settings/feedback-history');
    await expect(page.locator('text=NPS Survey - Completed')).toBeVisible();
    await expect(page.locator('text=Score: 9 (Promoter)')).toBeVisible();
  });

  test('should handle NPS detractor with support escalation', async ({
    page,
  }) => {
    // Trigger NPS survey
    await page.evaluate(() => {
      window.localStorage.setItem('nps_trigger', 'quarterly_check');
    });

    await page.reload();
    await page.click('[data-testid="feedback-widget"]');

    // Select low NPS score (detractor)
    await page.click('[data-testid="nps-score-3"]');

    // Fill negative feedback
    await page.fill(
      '[data-testid="nps-business-impact-textarea"]',
      "The platform is too complicated for a small photography business like mine. I spend more time trying to figure out features than actually using them. My clients get confused by the forms, and I've had several ask to go back to simple email.",
    );

    // Select specific pain point
    await page.click('[data-testid="improvement-priority-select"]');
    await page.click('[data-option="easier-form-creation"]');

    // Submit detractor feedback
    await page.click('[data-testid="submit-nps-feedback"]');

    // Verify detractor-specific response
    await expect(
      page.locator('[data-testid="nps-detractor-response"]'),
    ).toBeVisible();
    await expect(
      page.locator("text=We're sorry to hear about your experience"),
    ).toBeVisible();
    await expect(
      page.locator('text=customer success team will contact you'),
    ).toBeVisible();

    // Verify support ticket creation notification
    await expect(
      page.locator('[data-testid="support-ticket-notification"]'),
    ).toBeVisible();
    await expect(page.locator('text=Support ticket #')).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/nps-detractor-response.png',
    });
  });

  test('should adapt NPS questions for couple users', async ({ page }) => {
    // Logout and login as couple
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout"]');

    await page.fill('[data-testid="email-input"]', TEST_USERS.couple.email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.couple.password,
    );
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/wedme/dashboard');

    // Trigger NPS for couple
    await page.evaluate(() => {
      window.localStorage.setItem('nps_trigger', 'planning_milestone');
    });

    await page.reload();
    await page.click('[data-testid="feedback-widget"]');

    await page.click('[data-testid="nps-score-8"]');

    // Verify couple-specific question text
    await expect(
      page.locator('text=How has WedSync helped with your wedding planning'),
    ).toBeVisible();

    // Should NOT have business-related questions
    await expect(page.locator('text=business')).not.toBeVisible();
    await expect(page.locator('text=workflow')).not.toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/nps-couple-questions.png' });
  });
});

test.describe('Feature Feedback Collection - Context Sensitive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS.venue.email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.venue.password,
    );
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should collect feature feedback for form builder with venue context', async ({
    page,
  }) => {
    // Navigate to form builder to establish usage context
    await page.goto('/forms/builder');
    await page.waitForSelector('[data-testid="form-builder"]');

    // Simulate extensive form builder usage
    await page.click('[data-testid="add-field-button"]');
    await page.click('[data-option="text-field"]');
    await page.fill('[data-testid="field-label"]', 'Venue Requirements');

    await page.click('[data-testid="add-field-button"]');
    await page.click('[data-option="dropdown-field"]');
    await page.fill('[data-testid="field-label"]', 'Event Type');

    // Save form to trigger usage milestone
    await page.click('[data-testid="save-form"]');
    await expect(page.locator('text=Form saved successfully')).toBeVisible();

    // Trigger feature feedback (simulate after 5th use)
    await page.evaluate(() => {
      window.localStorage.setItem('feature_feedback_trigger', 'form_builder');
      window.localStorage.setItem('usage_count', '5');
    });

    await page.reload();

    // Wait for feature feedback prompt
    await page.waitForSelector('[data-testid="feature-feedback-modal"]');
    await expect(
      page.locator('text=How satisfied are you with the form builder'),
    ).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/feature-feedback-form-builder.png',
    });

    // Rate satisfaction (4/5)
    await page.click('[data-testid="satisfaction-rating-4"]');
    await expect(
      page.locator('[data-testid="satisfaction-rating-4"]'),
    ).toHaveClass(/selected/);

    // Rate ease of use (5/5)
    await page.click('[data-testid="ease-rating-5"]');

    // Rate value for wedding business (5/5)
    await page.click('[data-testid="value-rating-5"]');

    // Select usage frequency
    await page.click('[data-testid="usage-frequency-select"]');
    await page.click('[data-option="weekly"]');

    // Fill venue-specific feedback
    const venueFeedback =
      'The form builder is fantastic for creating client intake forms. I love how I can customize fields for different event types - weddings, corporate events, private parties. The conditional logic helps me gather specific venue requirements based on guest count and event style.';
    await page.fill(
      '[data-testid="feature-improvements-textarea"]',
      venueFeedback,
    );

    // Verify wedding context question appears
    await expect(
      page.locator('text=How busy is your current wedding season'),
    ).toBeVisible();
    await page.click('[data-testid="wedding-season-select"]');
    await page.click('[data-option="moderately-busy"]');

    // Take screenshot before submission
    await page.screenshot({
      path: 'e2e-screenshots/feature-feedback-completed.png',
    });

    // Submit feature feedback
    await page.click('[data-testid="submit-feature-feedback"]');

    // Verify success message
    await expect(
      page.locator('[data-testid="feature-feedback-success"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=Thank you for your feedback on form builder'),
    ).toBeVisible();

    // Verify feedback was recorded
    await page.goto('/settings/feedback-history');
    await expect(
      page.locator('text=Form Builder Feedback - Completed'),
    ).toBeVisible();
    await expect(page.locator('text=Satisfaction: 4/5')).toBeVisible();
  });

  test('should handle feature feedback for journey canvas with usage patterns', async ({
    page,
  }) => {
    // Navigate to journey canvas
    await page.goto('/journeys/canvas');

    // Simulate creating a journey
    await page.click('[data-testid="create-journey"]');
    await page.fill('[data-testid="journey-name"]', 'Venue Booking Process');

    // Add journey steps
    await page.click('[data-testid="add-step"]');
    await page.click('[data-option="email-step"]');
    await page.fill('[data-testid="step-name"]', 'Initial Inquiry Response');

    // Save journey
    await page.click('[data-testid="save-journey"]');

    // Trigger journey canvas feedback
    await page.evaluate(() => {
      window.localStorage.setItem('feature_feedback_trigger', 'journey_canvas');
      window.localStorage.setItem('usage_count', '3');
      window.localStorage.setItem('feature_usage_context', 'venue_workflow');
    });

    await page.reload();

    // Complete journey canvas specific feedback
    await page.waitForSelector('[data-testid="feature-feedback-modal"]');
    await page.click('[data-testid="satisfaction-rating-5"]');
    await page.click('[data-testid="ease-rating-4"]');
    await page.click('[data-testid="value-rating-5"]');

    await page.click('[data-testid="usage-frequency-select"]');
    await page.click('[data-option="monthly"]');

    // Journey canvas specific question
    await expect(
      page.locator('text=What do you primarily use the Journey Canvas for'),
    ).toBeVisible();
    await page.click('[data-testid="journey-usage-select"]');
    await page.click('[data-option="client-communication-workflow"]');

    await page.fill(
      '[data-testid="feature-improvements-textarea"]',
      'Love the visual workflow builder! Would be amazing to have templates specifically for venue bookings - like inquiry to contract to final details. Also integration with calendar systems would be perfect.',
    );

    await page.click('[data-testid="submit-feature-feedback"]');

    await page.screenshot({
      path: 'e2e-screenshots/journey-canvas-feedback.png',
    });
  });
});

test.describe('Mobile Responsive Feedback Widgets', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should display mobile-optimized feedback widgets', async ({ page }) => {
    // Login on mobile
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Navigate to mobile dashboard
    await page.waitForURL('/dashboard');

    // Trigger mobile feedback widget
    await page.evaluate(() => {
      window.localStorage.setItem('mobile_nps_trigger', 'mobile_milestone');
    });

    await page.reload();

    // Verify mobile feedback widget positioning
    const feedbackWidget = page.locator(
      '[data-testid="feedback-widget-mobile"]',
    );
    await expect(feedbackWidget).toBeVisible();

    // Should be positioned at bottom for thumb reach
    const widgetPosition = await feedbackWidget.boundingBox();
    const viewport = page.viewportSize()!;
    expect(widgetPosition!.y).toBeGreaterThan(viewport.height * 0.7); // Bottom 30%

    await page.screenshot({
      path: 'e2e-screenshots/mobile-feedback-widget.png',
    });

    // Open mobile NPS survey
    await feedbackWidget.click();

    // Verify mobile-optimized survey layout
    await expect(
      page.locator('[data-testid="nps-survey-mobile"]'),
    ).toBeVisible();

    // NPS scale should be easily tappable on mobile
    const npsButtons = page.locator('[data-testid^="nps-score-"]');
    const buttonSize = await npsButtons.first().boundingBox();
    expect(buttonSize!.width).toBeGreaterThan(44); // Minimum 44px touch target
    expect(buttonSize!.height).toBeGreaterThan(44);

    await page.screenshot({ path: 'e2e-screenshots/mobile-nps-survey.png' });

    // Test mobile interaction
    await page.click('[data-testid="nps-score-8"]');

    // Mobile textarea should be appropriately sized
    await expect(
      page.locator('[data-testid="nps-feedback-mobile"]'),
    ).toBeVisible();

    // Fill feedback (should handle mobile keyboard)
    await page.fill(
      '[data-testid="nps-feedback-mobile"]',
      'Great mobile experience!',
    );

    // Submit should be easily reachable
    const submitButton = page.locator('[data-testid="submit-mobile-nps"]');
    const submitPosition = await submitButton.boundingBox();
    expect(submitPosition!.y).toBeLessThan(viewport.height * 0.9); // Reachable area

    await page.click('[data-testid="submit-mobile-nps"]');

    await page.screenshot({ path: 'e2e-screenshots/mobile-nps-completed.png' });
  });

  test('should handle mobile feature feedback with swipe gestures', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS.couple.email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.couple.password,
    );
    await page.click('[data-testid="login-button"]');

    // Navigate to mobile-specific feature
    await page.goto('/wedme/vendors');

    // Trigger mobile feature feedback
    await page.evaluate(() => {
      window.localStorage.setItem('mobile_feature_trigger', 'vendor_directory');
    });

    await page.reload();

    // Open feature feedback on mobile
    await page.click('[data-testid="feedback-widget-mobile"]');

    // Test swipe navigation between questions (if implemented)
    await page.locator('[data-testid="feature-feedback-mobile"]').swipeLeft();

    // Verify mobile rating interface
    const ratingInterface = page.locator('[data-testid="mobile-rating-stars"]');
    await expect(ratingInterface).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/mobile-feature-feedback.png',
    });

    // Complete mobile feature feedback
    await ratingInterface.click();
    await page.click('[data-testid="rating-4"]');

    await page.fill(
      '[data-testid="mobile-feedback-text"]',
      'Easy to use on mobile',
    );
    await page.click('[data-testid="submit-mobile-feature"]');

    // Verify mobile success state
    await expect(
      page.locator('[data-testid="mobile-feedback-success"]'),
    ).toBeVisible();
  });
});

test.describe('Admin Feedback Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.admin.password,
    );
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should display comprehensive feedback analytics with wedding industry insights', async ({
    page,
  }) => {
    // Navigate to feedback analytics
    await page.goto('/admin/feedback-analytics');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="feedback-analytics-dashboard"]');

    // Verify key metrics display
    await expect(
      page.locator('[data-testid="nps-score-display"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="csat-score-display"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="response-rate-display"]'),
    ).toBeVisible();

    // Check NPS breakdown
    await expect(page.locator('[data-testid="promoters-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="passives-count"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="detractors-count"]'),
    ).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/admin-feedback-overview.png',
    });

    // Check wedding industry segmentation
    await page.click('[data-testid="segmentation-tab"]');
    await expect(page.locator('[data-testid="supplier-nps"]')).toBeVisible();
    await expect(page.locator('[data-testid="couple-nps"]')).toBeVisible();

    // Verify vendor type breakdown
    await expect(
      page.locator('[data-testid="photographer-metrics"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="venue-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="planner-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="florist-metrics"]')).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/admin-segmentation.png' });

    // Check seasonal analysis
    await page.click('[data-testid="seasonality-tab"]');
    await expect(
      page.locator('[data-testid="wedding-season-nps"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="off-season-nps"]')).toBeVisible();

    // Verify seasonal chart
    await expect(
      page.locator('[data-testid="seasonal-trends-chart"]'),
    ).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/admin-seasonal-analysis.png',
    });

    // Check insights and action items
    await page.click('[data-testid="insights-tab"]');
    await expect(page.locator('[data-testid="top-issues-list"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="improvement-opportunities"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="action-items-list"]'),
    ).toBeVisible();

    // Verify action items have proper priorities
    await expect(
      page.locator('[data-testid="high-priority-action"]'),
    ).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/admin-insights.png' });

    // Test filtering by date range
    await page.click('[data-testid="date-range-filter"]');
    await page.click('[data-option="last-30-days"]');
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
    });

    // Verify data updates after filtering
    await expect(
      page.locator('[data-testid="nps-score-display"]'),
    ).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/admin-filtered-view.png' });
  });

  test('should enable drill-down into specific feedback responses', async ({
    page,
  }) => {
    await page.goto('/admin/feedback-analytics');

    // Click on detractors to drill down
    await page.click('[data-testid="detractors-count"]');

    // Verify detractor details modal
    await expect(
      page.locator('[data-testid="detractor-details-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="detractor-responses-list"]'),
    ).toBeVisible();

    // Check individual response details
    await page.click('[data-testid="response-item-1"]');
    await expect(
      page.locator('[data-testid="response-details"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="response-sentiment"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="response-keywords"]'),
    ).toBeVisible();

    // Verify follow-up action tracking
    await expect(
      page.locator('[data-testid="follow-up-status"]'),
    ).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/admin-response-details.png',
    });

    // Test bulk action on multiple responses
    await page.check('[data-testid="select-response-1"]');
    await page.check('[data-testid="select-response-2"]');
    await page.click('[data-testid="bulk-actions"]');

    await expect(
      page.locator('[data-testid="bulk-action-options"]'),
    ).toBeVisible();
    await expect(page.locator('text=Create support tickets')).toBeVisible();
    await expect(page.locator('text=Schedule follow-up emails')).toBeVisible();
  });
});

test.describe('Cross-User Feedback Scenarios', () => {
  test('should coordinate feedback between supplier and couple when connected', async ({
    page,
    context,
  }) => {
    // Setup: Create a second browser context for the couple
    const coupleContext = await context.newContext();
    const couplePage = await coupleContext.newPage();

    // Supplier logs in and imports couple as client
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Navigate to client management
    await page.goto('/clients/import');
    await page.fill('[data-testid="client-email"]', TEST_USERS.couple.email);
    await page.click('[data-testid="import-client"]');

    // Verify import success
    await expect(
      page.locator('text=Client imported successfully'),
    ).toBeVisible();

    // Meanwhile, couple logs in
    await couplePage.goto('/login');
    await couplePage.fill(
      '[data-testid="email-input"]',
      TEST_USERS.couple.email,
    );
    await couplePage.fill(
      '[data-testid="password-input"]',
      TEST_USERS.couple.password,
    );
    await couplePage.click('[data-testid="login-button"]');

    // Couple should see vendor connection notification
    await expect(
      couplePage.locator('[data-testid="vendor-connection-notification"]'),
    ).toBeVisible();
    await expect(
      couplePage.locator('text=photographer has added you'),
    ).toBeVisible();

    // Both users should be eligible for connection feedback

    // Supplier gets client management feedback
    await page.evaluate(() => {
      window.localStorage.setItem(
        'connection_feedback_trigger',
        'client_imported',
      );
    });
    await page.reload();

    await page.click('[data-testid="feedback-widget"]');
    await expect(page.locator('text=client management feature')).toBeVisible();

    // Couple gets vendor collaboration feedback
    await couplePage.evaluate(() => {
      window.localStorage.setItem(
        'connection_feedback_trigger',
        'vendor_connected',
      );
    });
    await couplePage.reload();

    await couplePage.click('[data-testid="feedback-widget"]');
    await expect(couplePage.locator('text=vendor collaboration')).toBeVisible();

    // Take screenshots of both perspectives
    await page.screenshot({
      path: 'e2e-screenshots/supplier-connection-feedback.png',
    });
    await couplePage.screenshot({
      path: 'e2e-screenshots/couple-connection-feedback.png',
    });

    // Complete both feedback flows
    await page.click('[data-testid="satisfaction-rating-5"]');
    await page.click('[data-testid="submit-feature-feedback"]');

    await couplePage.click('[data-testid="satisfaction-rating-4"]');
    await couplePage.click('[data-testid="submit-feature-feedback"]');

    // Verify both responses were recorded
    await page.goto('/settings/feedback-history');
    await expect(page.locator('text=Client Management Feedback')).toBeVisible();

    await couplePage.goto('/settings/feedback-history');
    await expect(
      couplePage.locator('text=Vendor Collaboration Feedback'),
    ).toBeVisible();

    await coupleContext.close();
  });

  test('should prevent feedback fatigue across related users', async ({
    page,
  }) => {
    // Login as photographer who recently gave feedback
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Simulate recent feedback completion
    await page.evaluate(() => {
      window.localStorage.setItem(
        'recent_feedback_completed',
        Date.now() - 24 * 60 * 60 * 1000,
      ); // 1 day ago
      window.localStorage.setItem('feedback_fatigue_protection', 'true');
    });

    await page.goto('/dashboard');

    // Try to trigger another feedback session
    await page.evaluate(() => {
      window.localStorage.setItem('new_feedback_trigger', 'force_trigger');
    });
    await page.reload();

    // Should not show feedback widget due to fatigue protection
    await expect(
      page.locator('[data-testid="feedback-widget"]'),
    ).not.toBeVisible();

    // Should show fatigue protection message if user tries to access feedback
    await page.goto('/feedback/request');
    await expect(
      page.locator('[data-testid="feedback-fatigue-message"]'),
    ).toBeVisible();
    await expect(page.locator('text=recently provided feedback')).toBeVisible();
    await expect(page.locator('text=next opportunity')).toBeVisible();
  });
});

test.describe('Accessibility and Error Handling', () => {
  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Trigger feedback widget
    await page.evaluate(() => {
      window.localStorage.setItem('a11y_test_trigger', 'keyboard_navigation');
    });
    await page.reload();

    // Use keyboard to navigate to feedback widget
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to access feedback widget with keyboard
    const activeElement = await page
      .locator(':focus')
      .getAttribute('data-testid');
    expect(activeElement).toBe('feedback-widget');

    // Open with keyboard
    await page.keyboard.press('Enter');
    await expect(
      page.locator('[data-testid="nps-survey-modal"]'),
    ).toBeVisible();

    // Navigate NPS scale with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // Move to score 1
    await page.keyboard.press('ArrowRight'); // Move to score 2
    await page.keyboard.press('ArrowRight'); // Move to score 3
    await page.keyboard.press('Space'); // Select score 3

    // Verify selection
    await expect(page.locator('[data-testid="nps-score-3"]')).toHaveClass(
      /selected/,
    );

    // Continue with keyboard navigation through the form
    await page.keyboard.press('Tab');
    await page.keyboard.type('Keyboard navigation works well');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Submit

    await page.screenshot({
      path: 'e2e-screenshots/keyboard-navigation-complete.png',
    });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/feedback/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Try to submit feedback
    await page.evaluate(() => {
      window.localStorage.setItem('error_test_trigger', 'api_failure');
    });
    await page.reload();

    await page.click('[data-testid="feedback-widget"]');
    await page.click('[data-testid="nps-score-8"]');
    await page.fill('[data-testid="nps-feedback-textarea"]', 'Test feedback');
    await page.click('[data-testid="submit-nps-feedback"]');

    // Should show error message
    await expect(
      page.locator('[data-testid="feedback-error-message"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=unable to submit your feedback'),
    ).toBeVisible();
    await expect(page.locator('text=Please try again')).toBeVisible();

    // Should offer retry option
    await expect(
      page.locator('[data-testid="retry-feedback-button"]'),
    ).toBeVisible();

    // Should save draft locally
    await expect(
      page.locator('text=feedback has been saved locally'),
    ).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/api-error-handling.png' });
  });

  test('should handle offline scenarios with local storage', async ({
    page,
    context,
  }) => {
    await page.goto('/login');
    await page.fill(
      '[data-testid="email-input"]',
      TEST_USERS.photographer.email,
    );
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS.photographer.password,
    );
    await page.click('[data-testid="login-button"]');

    // Go offline
    await context.setOffline(true);

    // Try to use feedback system offline
    await page.evaluate(() => {
      window.localStorage.setItem('offline_test_trigger', 'offline_feedback');
    });
    await page.reload();

    await page.click('[data-testid="feedback-widget"]');
    await page.click('[data-testid="nps-score-9"]');
    await page.fill(
      '[data-testid="nps-feedback-textarea"]',
      'Offline feedback test',
    );
    await page.click('[data-testid="submit-nps-feedback"]');

    // Should detect offline state
    await expect(
      page.locator('[data-testid="offline-feedback-message"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=feedback will be sent when online'),
    ).toBeVisible();

    // Verify local storage contains feedback
    const localFeedback = await page.evaluate(() => {
      return localStorage.getItem('pending_feedback');
    });
    expect(localFeedback).toBeTruthy();

    // Go back online
    await context.setOffline(false);
    await page.reload();

    // Should sync pending feedback
    await expect(
      page.locator('[data-testid="sync-success-message"]'),
    ).toBeVisible();
    await expect(
      page.locator('text=offline feedback has been sent'),
    ).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/offline-sync-complete.png',
    });
  });
});
