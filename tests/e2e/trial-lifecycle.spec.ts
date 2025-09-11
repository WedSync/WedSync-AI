/**
 * WS-140: End-to-End Tests for Trial Lifecycle
 * Complete testing of 30-day trial journey from signup to conversion
 */

import { test, expect, Page } from '@playwright/test';
import { addDays, format } from 'date-fns';

// Test configuration
const TEST_USER = {
  email: `trial.test.${Date.now()}@wedsync.com`,
  password: 'Test123!@#',
  firstName: 'Trial',
  lastName: 'Tester',
  businessName: 'Dream Weddings Co',
  businessType: 'venue_coordinator'
};

const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/25',
  cvc: '123',
  zip: '10001'
};

// Helper functions
async function signupForTrial(page: Page, user: typeof TEST_USER) {
  await page.goto('/signup');
  
  // Fill signup form
  await page.fill('[data-testid="email"]', user.email);
  await page.fill('[data-testid="password"]', user.password);
  await page.fill('[data-testid="firstName"]', user.firstName);
  await page.fill('[data-testid="lastName"]', user.lastName);
  await page.fill('[data-testid="businessName"]', user.businessName);
  await page.selectOption('[data-testid="businessType"]', user.businessType);
  
  // Select trial plan
  await page.click('[data-testid="plan-professional-trial"]');
  
  // Submit
  await page.click('[data-testid="signup-submit"]');
  
  // Wait for redirect to onboarding
  await page.waitForURL('/onboarding/**');
}

async function completeOnboarding(page: Page) {
  // Step 1: Business Goals
  await page.check('[data-testid="goal-save-time"]');
  await page.check('[data-testid="goal-grow-business"]');
  await page.click('[data-testid="onboarding-next"]');
  
  // Step 2: Current Challenges
  await page.check('[data-testid="challenge-coordination"]');
  await page.check('[data-testid="challenge-communication"]');
  await page.click('[data-testid="onboarding-next"]');
  
  // Step 3: Expected Usage
  await page.fill('[data-testid="weekly-hours"]', '20');
  await page.fill('[data-testid="monthly-weddings"]', '5');
  await page.click('[data-testid="onboarding-complete"]');
  
  // Wait for dashboard
  await page.waitForURL('/dashboard');
}

async function simulateTrialActivity(page: Page, days: number) {
  for (let day = 1; day <= days; day++) {
    // Create wedding
    if (day === 1 || day === 10 || day === 20) {
      await page.goto('/weddings/new');
      await page.fill('[data-testid="wedding-couple-names"]', `Couple ${day}`);
      await page.fill('[data-testid="wedding-date"]', format(addDays(new Date(), 90), 'yyyy-MM-dd'));
      await page.fill('[data-testid="wedding-venue"]', `Venue ${day}`);
      await page.click('[data-testid="save-wedding"]');
    }
    
    // Add suppliers
    if (day % 3 === 0) {
      await page.goto('/suppliers');
      await page.click('[data-testid="add-supplier"]');
      await page.fill('[data-testid="supplier-name"]', `Supplier ${day}`);
      await page.selectOption('[data-testid="supplier-type"]', 'photographer');
      await page.click('[data-testid="save-supplier"]');
    }
    
    // Create journey
    if (day === 5 || day === 15) {
      await page.goto('/journeys/new');
      await page.fill('[data-testid="journey-name"]', `Journey ${day}`);
      await page.click('[data-testid="add-step"]');
      await page.fill('[data-testid="step-name"]', 'Send Welcome Email');
      await page.click('[data-testid="save-journey"]');
    }
    
    // Trigger automation
    if (day % 5 === 0) {
      await page.goto('/automations');
      await page.click('[data-testid="trigger-automation"]');
      await page.waitForSelector('[data-testid="automation-success"]');
    }
  }
}

// Test Suite
test.describe('Trial Lifecycle', () => {
  test.setTimeout(120000); // 2 minutes timeout for long tests

  test('Complete trial signup and onboarding flow', async ({ page }) => {
    // Signup
    await signupForTrial(page, TEST_USER);
    
    // Verify trial badge is shown
    await expect(page.locator('[data-testid="trial-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-badge"]')).toContainText('30 days left');
    
    // Complete onboarding
    await completeOnboarding(page);
    
    // Verify dashboard shows trial widgets
    await expect(page.locator('[data-testid="trial-progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-checklist"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-tips"]')).toBeVisible();
  });

  test('Track trial progress and milestones', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', TEST_USER.email);
    await page.fill('[data-testid="password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    
    // Simulate first week activity
    await simulateTrialActivity(page, 7);
    
    // Check milestones
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="milestone-quick-starter"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="milestone-team-builder"]')).toBeVisible();
    
    // Verify ROI display
    await expect(page.locator('[data-testid="roi-hours-saved"]')).toBeVisible();
    const hoursSaved = await page.locator('[data-testid="roi-hours-saved"]').textContent();
    expect(parseInt(hoursSaved || '0')).toBeGreaterThan(0);
  });

  test('Display trial summary report', async ({ page, context }) => {
    // Navigate to day 28 (mock time)
    await context.addCookies([{
      name: 'mock_trial_day',
      value: '28',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/dashboard');
    
    // Check summary report is accessible
    await page.click('[data-testid="view-trial-summary"]');
    await page.waitForURL('/trial/summary');
    
    // Verify report contents
    await expect(page.locator('[data-testid="summary-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-achievements"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-roi"]')).toBeVisible();
    
    // Test PDF download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('WedSync-Trial-Report');
  });

  test('Trial extension flow for qualified users', async ({ page, context }) => {
    // Set high engagement context
    await context.addCookies([{
      name: 'mock_trial_day',
      value: '25',
      domain: 'localhost',
      path: '/'
    }, {
      name: 'mock_engagement_score',
      value: '85',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/dashboard');
    
    // Open extension modal
    await page.click('[data-testid="trial-countdown"]');
    await page.click('[data-testid="request-extension"]');
    
    // Verify eligibility
    await expect(page.locator('[data-testid="extension-eligible"]')).toBeVisible();
    await expect(page.locator('[data-testid="extension-eligible"]')).toContainText('Eligible');
    
    // Select extension option
    await page.click('[data-testid="extension-7-days"]');
    await page.click('[data-testid="confirm-extension"]');
    
    // Verify success
    await expect(page.locator('[data-testid="extension-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-badge"]')).toContainText('12 days left');
  });

  test('Trial to paid conversion flow', async ({ page, context }) => {
    // Set trial ending context
    await context.addCookies([{
      name: 'mock_trial_day',
      value: '28',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/dashboard');
    
    // Click conversion CTA
    await page.click('[data-testid="convert-to-paid"]');
    await page.waitForURL('/trial/convert');
    
    // View value metrics
    await expect(page.locator('[data-testid="conversion-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="hours-saved-total"]')).toContainText('42');
    await expect(page.locator('[data-testid="tasks-automated-total"]')).toContainText('156');
    
    // Continue to plans
    await page.click('[data-testid="continue-to-plans"]');
    
    // Select professional plan
    await page.click('[data-testid="select-professional"]');
    
    // Confirm conversion
    await page.click('[data-testid="confirm-subscription"]');
    
    // Fill Stripe checkout (in test mode)
    await page.waitForSelector('iframe[name="stripe_checkout_app"]');
    const stripeFrame = page.frameLocator('iframe[name="stripe_checkout_app"]');
    
    await stripeFrame.locator('[placeholder="Card number"]').fill(STRIPE_TEST_CARD.number);
    await stripeFrame.locator('[placeholder="MM / YY"]').fill(STRIPE_TEST_CARD.expiry);
    await stripeFrame.locator('[placeholder="CVC"]').fill(STRIPE_TEST_CARD.cvc);
    await stripeFrame.locator('[placeholder="ZIP"]').fill(STRIPE_TEST_CARD.zip);
    
    await stripeFrame.locator('button[type="submit"]').click();
    
    // Wait for success redirect
    await page.waitForURL('/dashboard?converted=true');
    
    // Verify conversion success
    await expect(page.locator('[data-testid="conversion-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-badge"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="subscription-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="subscription-badge"]')).toContainText('Professional');
  });

  test('Data preservation during conversion', async ({ page, context }) => {
    // Create test data before conversion
    await page.goto('/weddings/new');
    const weddingName = `Test Wedding ${Date.now()}`;
    await page.fill('[data-testid="wedding-couple-names"]', weddingName);
    await page.fill('[data-testid="wedding-date"]', format(addDays(new Date(), 90), 'yyyy-MM-dd'));
    await page.click('[data-testid="save-wedding"]');
    
    // Get wedding ID from URL
    const weddingUrl = page.url();
    const weddingId = weddingUrl.split('/').pop();
    
    // Convert to paid
    await context.addCookies([{
      name: 'mock_instant_conversion',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/trial/convert');
    await page.click('[data-testid="instant-convert-professional"]');
    
    // Wait for conversion
    await page.waitForURL('/dashboard?converted=true');
    
    // Verify data preserved
    await page.goto(`/weddings/${weddingId}`);
    await expect(page.locator('[data-testid="wedding-name"]')).toContainText(weddingName);
    
    // Check all sections preserved
    await expect(page.locator('[data-testid="wedding-suppliers"]')).toBeVisible();
    await expect(page.locator('[data-testid="wedding-guests"]')).toBeVisible();
    await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible();
  });

  test('Email sequence triggers', async ({ page, context }) => {
    // Mock email tracking
    await context.route('**/api/email/track', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ tracked: true }) });
    });
    
    // Day 0 - Welcome email
    await signupForTrial(page, {
      ...TEST_USER,
      email: `welcome.${Date.now()}@test.com`
    });
    
    // Check welcome email sent
    const welcomeEmail = await page.waitForRequest(req => 
      req.url().includes('/api/email/send') && 
      req.postDataJSON()?.template === 'trial_welcome'
    );
    expect(welcomeEmail).toBeTruthy();
    
    // Day 7 - Week summary
    await context.addCookies([{
      name: 'mock_trial_day',
      value: '7',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/dashboard');
    
    const weekSummary = await page.waitForRequest(req => 
      req.url().includes('/api/email/send') && 
      req.postDataJSON()?.template === 'trial_week1_summary'
    );
    expect(weekSummary).toBeTruthy();
  });

  test('Performance requirements - sub-200ms response', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Measure trial component load times
    const metrics = await page.evaluate(() => {
      return {
        conversionFlow: performance.getEntriesByName('TrialConversionFlow').pop()?.duration,
        summaryReport: performance.getEntriesByName('TrialSummaryReport').pop()?.duration,
        extensionModal: performance.getEntriesByName('TrialExtensionModal').pop()?.duration
      };
    });
    
    // Verify all components load under 200ms
    expect(metrics.conversionFlow).toBeLessThan(200);
    expect(metrics.summaryReport).toBeLessThan(200);
    expect(metrics.extensionModal).toBeLessThan(200);
    
    // Test API response times
    const apiMetrics = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/trial')) {
        apiMetrics.push({
          url: response.url(),
          duration: response.timing()?.responseEnd || 0
        });
      }
    });
    
    // Trigger API calls
    await page.goto('/trial/summary');
    await page.goto('/trial/convert');
    
    // Verify API responses under 200ms
    apiMetrics.forEach(metric => {
      expect(metric.duration).toBeLessThan(200);
    });
  });

  test('Analytics tracking throughout trial', async ({ page, context }) => {
    const analyticsEvents: any[] = [];
    
    // Intercept analytics calls
    await context.route('**/api/analytics/track', async route => {
      const request = route.request();
      const data = request.postDataJSON();
      analyticsEvents.push(data);
      await route.fulfill({ status: 200 });
    });
    
    // Perform trial activities
    await signupForTrial(page, {
      ...TEST_USER,
      email: `analytics.${Date.now()}@test.com`
    });
    await completeOnboarding(page);
    
    // Create first wedding
    await page.goto('/weddings/new');
    await page.fill('[data-testid="wedding-couple-names"]', 'Analytics Test');
    await page.click('[data-testid="save-wedding"]');
    
    // Verify analytics events
    expect(analyticsEvents).toContainEqual(
      expect.objectContaining({ event: 'trial_started' })
    );
    expect(analyticsEvents).toContainEqual(
      expect.objectContaining({ event: 'onboarding_completed' })
    );
    expect(analyticsEvents).toContainEqual(
      expect.objectContaining({ event: 'first_wedding_created' })
    );
  });

  test('Trial expiration handling', async ({ page, context }) => {
    // Set expired trial
    await context.addCookies([{
      name: 'mock_trial_day',
      value: '31',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/dashboard');
    
    // Verify trial expired message
    await expect(page.locator('[data-testid="trial-expired-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-expired-banner"]')).toContainText('Trial Ended');
    
    // Verify limited functionality
    await page.goto('/weddings/new');
    await expect(page.locator('[data-testid="upgrade-required"]')).toBeVisible();
    
    // Verify data still accessible (read-only)
    await page.goto('/weddings');
    await expect(page.locator('[data-testid="wedding-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-wedding"]')).toBeDisabled();
    
    // Test reactivation flow
    await page.click('[data-testid="reactivate-account"]');
    await page.waitForURL('/trial/convert');
    await expect(page.locator('[data-testid="special-reactivation-offer"]')).toBeVisible();
  });
});

// Mobile responsive tests
test.describe('Trial Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Mobile trial dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify mobile-optimized components
    await expect(page.locator('[data-testid="mobile-trial-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-trial-cta"]')).toBeVisible();
    
    // Test touch interactions
    await page.locator('[data-testid="mobile-trial-menu"]').tap();
    await expect(page.locator('[data-testid="trial-menu-items"]')).toBeVisible();
  });

  test('Mobile conversion flow', async ({ page }) => {
    await page.goto('/trial/convert');
    
    // Verify mobile-friendly plan selection
    await expect(page.locator('[data-testid="mobile-plan-cards"]')).toBeVisible();
    
    // Swipe through plans
    await page.locator('[data-testid="plan-carousel"]').swipe({ direction: 'left' });
    await expect(page.locator('[data-testid="plan-professional"]')).toBeInViewport();
    
    // Select plan
    await page.locator('[data-testid="select-plan-mobile"]').tap();
    await expect(page.locator('[data-testid="mobile-checkout"]')).toBeVisible();
  });
});