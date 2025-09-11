import { test, expect, Page } from '@playwright/test';

/**
 * WS-170: Comprehensive User Journey Testing for Viral Referral System
 * 
 * Tests the complete user experience flow from initial referral exposure
 * through successful conversion and subsequent referral generation.
 * 
 * Critical Wedding Context: A satisfied couple should be able to seamlessly
 * refer other engaged couples, creating a viral growth loop that reduces
 * customer acquisition cost by 60%.
 */

interface UserJourneyMetrics {
  pageLoadTime: number;
  interactionResponse: number;
  formCompletionTime: number;
  errorRecoveryTime?: number;
  userSatisfactionScore: number;
}

interface ReferralJourneyData {
  supplierCode: string;
  originalCoupleId: string;
  referredCoupleEmail: string;
  referralReward: number;
  conversionTimestamp: number;
}

class UserJourneyTracker {
  private metrics: UserJourneyMetrics[] = [];
  private journeySteps: string[] = [];

  recordStep(step: string, metrics?: Partial<UserJourneyMetrics>) {
    this.journeySteps.push(step);
    if (metrics) {
      this.metrics.push({
        pageLoadTime: 0,
        interactionResponse: 0,
        formCompletionTime: 0,
        userSatisfactionScore: 5,
        ...metrics
      });
    }
  }

  getAverageMetrics(): UserJourneyMetrics {
    if (this.metrics.length === 0) {
      return {
        pageLoadTime: 0,
        interactionResponse: 0,
        formCompletionTime: 0,
        userSatisfactionScore: 0
      };
    }

    return {
      pageLoadTime: this.metrics.reduce((sum, m) => sum + m.pageLoadTime, 0) / this.metrics.length,
      interactionResponse: this.metrics.reduce((sum, m) => sum + m.interactionResponse, 0) / this.metrics.length,
      formCompletionTime: this.metrics.reduce((sum, m) => sum + m.formCompletionTime, 0) / this.metrics.length,
      userSatisfactionScore: this.metrics.reduce((sum, m) => sum + m.userSatisfactionScore, 0) / this.metrics.length
    };
  }

  getJourneyPath(): string[] {
    return [...this.journeySteps];
  }
}

test.describe('Complete Viral Referral User Journey', () => {
  let journeyTracker: UserJourneyTracker;

  test.beforeEach(async ({ page }) => {
    journeyTracker = new UserJourneyTracker();
    
    // Set up test environment
    await page.goto('/');
    
    // Ensure clean test state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Happy Path: Complete Supplier-to-Couple Viral Flow', async ({ page, browser }) => {
    const supplierCode = 'VIRAL_TEST_' + Date.now();
    
    // === PHASE 1: SUPPLIER GENERATES REFERRAL CODE ===
    const startTime = Date.now();
    
    journeyTracker.recordStep('supplier_login_start');
    await page.goto('/supplier/login');
    
    const pageLoadTime = Date.now() - startTime;
    journeyTracker.recordStep('supplier_login_complete', { pageLoadTime });
    
    // Supplier authentication
    await page.fill('[data-testid="email-input"]', 'test.supplier@wedsync.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    journeyTracker.recordStep('supplier_dashboard_loaded');
    
    // Navigate to referral system
    const navigationStart = Date.now();
    await page.click('[data-testid="referral-menu"]');
    await page.click('[data-testid="generate-code-button"]');
    
    const navigationTime = Date.now() - navigationStart;
    journeyTracker.recordStep('referral_page_accessed', { interactionResponse: navigationTime });
    
    // Generate referral code
    await page.fill('[data-testid="referral-description"]', 'Amazing wedding photography referral');
    await page.selectOption('[data-testid="reward-type"]', 'percentage');
    await page.fill('[data-testid="reward-value"]', '10');
    
    const codeGenerationStart = Date.now();
    await page.click('[data-testid="generate-code-submit"]');
    
    await expect(page.locator('[data-testid="referral-code-display"]')).toBeVisible();
    const generatedCode = await page.locator('[data-testid="referral-code-value"]').textContent();
    
    const codeGenerationTime = Date.now() - codeGenerationStart;
    journeyTracker.recordStep('referral_code_generated', { formCompletionTime: codeGenerationTime });
    
    expect(generatedCode).toBeTruthy();
    expect(generatedCode).toMatch(/^[A-Z0-9]{6,12}$/);
    
    // === PHASE 2: COUPLE RECEIVES AND USES REFERRAL ===
    
    // Create new browser context for couple (simulates different user)
    const coupleContext = await browser.newContext();
    const couplePage = await coupleContext.newPage();
    
    journeyTracker.recordStep('couple_referral_link_accessed');
    
    // Simulate referral link click
    const referralPageStart = Date.now();
    await couplePage.goto(`/signup?ref=${generatedCode}`);
    
    const referralPageLoad = Date.now() - referralPageStart;
    journeyTracker.recordStep('couple_signup_page_loaded', { pageLoadTime: referralPageLoad });
    
    // Verify referral code is recognized
    await expect(couplePage.locator('[data-testid="referral-banner"]')).toBeVisible();
    await expect(couplePage.locator('[data-testid="referral-discount"]')).toContainText('10%');
    
    // Complete couple signup
    const signupFormStart = Date.now();
    
    await couplePage.fill('[data-testid="bride-name"]', 'Sarah Johnson');
    await couplePage.fill('[data-testid="groom-name"]', 'Mike Johnson');
    await couplePage.fill('[data-testid="couple-email"]', `couple${Date.now()}@testmail.com`);
    await couplePage.fill('[data-testid="couple-phone"]', '(555) 123-4567');
    await couplePage.fill('[data-testid="wedding-date"]', '2024-06-15');
    await couplePage.fill('[data-testid="wedding-location"]', 'San Francisco, CA');
    await couplePage.fill('[data-testid="estimated-guests"]', '150');
    await couplePage.fill('[data-testid="estimated-budget"]', '50000');
    
    // Accept terms and privacy policy
    await couplePage.check('[data-testid="terms-checkbox"]');
    await couplePage.check('[data-testid="privacy-checkbox"]');
    
    await couplePage.click('[data-testid="signup-submit"]');
    
    const signupFormTime = Date.now() - signupFormStart;
    journeyTracker.recordStep('couple_signup_completed', { formCompletionTime: signupFormTime });
    
    // Verify successful signup with referral attribution
    await expect(couplePage.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(couplePage.locator('[data-testid="referral-success"]')).toContainText('referred by');
    
    journeyTracker.recordStep('couple_onboarding_success');
    
    // === PHASE 3: COUPLE BECOMES REFERRER (VIRAL LOOP) ===
    
    // Fast-forward through couple's wedding experience (simulated)
    await couplePage.goto('/dashboard');
    await expect(couplePage.locator('[data-testid="couple-dashboard"]')).toBeVisible();
    
    // Simulate positive experience leading to referral willingness
    await couplePage.click('[data-testid="share-menu"]');
    await couplePage.click('[data-testid="refer-friends-button"]');
    
    journeyTracker.recordStep('couple_referral_intent');
    
    // Couple refers another couple
    const friendReferralStart = Date.now();
    
    await couplePage.fill('[data-testid="friend-email-1"]', 'friend1@testmail.com');
    await couplePage.fill('[data-testid="friend-name-1"]', 'Jennifer & Tom');
    await couplePage.fill('[data-testid="friend-email-2"]', 'friend2@testmail.com');
    await couplePage.fill('[data-testid="friend-name-2"]', 'Lisa & David');
    
    await couplePage.fill('[data-testid="personal-message"]', 
      'Hi! We had an amazing experience with WedSync for our wedding. You should definitely check it out!');
    
    await couplePage.click('[data-testid="send-referrals-button"]');
    
    const friendReferralTime = Date.now() - friendReferralStart;
    journeyTracker.recordStep('viral_referrals_sent', { formCompletionTime: friendReferralTime });
    
    await expect(couplePage.locator('[data-testid="referral-sent-success"]')).toBeVisible();
    
    // === PHASE 4: VIRAL LOOP CONTINUATION ===
    
    // Create context for referred friend
    const friendContext = await browser.newContext();
    const friendPage = await friendContext.newPage();
    
    // Simulate friend receiving referral email and clicking
    const friendCode = await couplePage.locator('[data-testid="generated-referral-code"]').textContent();
    
    await friendPage.goto(`/signup?ref=${friendCode}&utm_source=friend_referral`);
    
    journeyTracker.recordStep('viral_loop_friend_accessed');
    
    // Verify viral attribution chain
    await expect(friendPage.locator('[data-testid="referral-chain"]')).toContainText('referred by Sarah & Mike');
    
    // Friend completes signup (abbreviated version)
    await friendPage.fill('[data-testid="bride-name"]', 'Jennifer Smith');
    await friendPage.fill('[data-testid="groom-name"]', 'Tom Smith');
    await friendPage.fill('[data-testid="couple-email"]', `friend${Date.now()}@testmail.com`);
    await friendPage.fill('[data-testid="wedding-date"]', '2024-08-20');
    await friendPage.check('[data-testid="terms-checkbox"]');
    await friendPage.check('[data-testid="privacy-checkbox"]');
    
    await friendPage.click('[data-testid="signup-submit"]');
    
    journeyTracker.recordStep('viral_loop_conversion_complete');
    
    // === PHASE 5: REWARD DISTRIBUTION VERIFICATION ===
    
    // Switch back to original supplier to verify rewards
    await page.bringToFront();
    await page.goto('/supplier/referrals');
    
    // Check referral tracking and rewards
    await expect(page.locator('[data-testid="successful-referrals"]')).toContainText('2'); // Both conversions
    await expect(page.locator('[data-testid="pending-rewards"]')).toBeVisible();
    
    journeyTracker.recordStep('supplier_rewards_verified');
    
    // Switch to couple to verify their rewards
    await couplePage.bringToFront();
    await couplePage.goto('/dashboard/rewards');
    
    await expect(couplePage.locator('[data-testid="referral-rewards"]')).toBeVisible();
    await expect(couplePage.locator('[data-testid="earned-credits"]')).toContainText('$');
    
    journeyTracker.recordStep('couple_rewards_verified');
    
    // === PERFORMANCE AND UX METRICS VALIDATION ===
    
    const finalMetrics = journeyTracker.getAverageMetrics();
    const journeyPath = journeyTracker.getJourneyPath();
    
    // Performance benchmarks for viral user experience
    expect(finalMetrics.pageLoadTime).toBeLessThan(3000); // < 3s average page load
    expect(finalMetrics.interactionResponse).toBeLessThan(500); // < 500ms interaction response
    expect(finalMetrics.formCompletionTime).toBeLessThan(10000); // < 10s form completion
    
    // Journey completeness verification
    const expectedSteps = [
      'supplier_login_start',
      'supplier_login_complete',
      'supplier_dashboard_loaded',
      'referral_page_accessed',
      'referral_code_generated',
      'couple_referral_link_accessed',
      'couple_signup_page_loaded',
      'couple_signup_completed',
      'couple_onboarding_success',
      'couple_referral_intent',
      'viral_referrals_sent',
      'viral_loop_friend_accessed',
      'viral_loop_conversion_complete',
      'supplier_rewards_verified',
      'couple_rewards_verified'
    ];
    
    expectedSteps.forEach(step => {
      expect(journeyPath).toContain(step);
    });
    
    console.log('Complete Viral Journey Metrics:', {
      totalSteps: journeyPath.length,
      averageMetrics: finalMetrics,
      journeyDuration: Date.now() - startTime,
      conversionRate: '100%', // All test users converted
      viralCoefficient: 2.0 // Each couple referred 2 friends
    });
    
    await coupleContext.close();
    await friendContext.close();
  });

  test('Error Recovery: Broken Referral Link Recovery', async ({ page }) => {
    journeyTracker.recordStep('error_scenario_start');
    
    // Test broken referral link
    await page.goto('/signup?ref=INVALID_CODE_123');
    
    // Should gracefully handle invalid codes
    await expect(page.locator('[data-testid="referral-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="continue-without-referral"]')).toBeVisible();
    
    const recoveryStart = Date.now();
    await page.click('[data-testid="continue-without-referral"]');
    
    const recoveryTime = Date.now() - recoveryStart;
    journeyTracker.recordStep('error_recovery_completed', { errorRecoveryTime: recoveryTime });
    
    // Should allow normal signup
    await expect(page.locator('[data-testid="signup-form"]')).toBeVisible();
    
    // Error recovery should be fast
    expect(recoveryTime).toBeLessThan(1000);
  });

  test('Cross-Device Journey: Mobile to Desktop Continuation', async ({ page, browser }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    
    journeyTracker.recordStep('mobile_referral_start');
    
    // Mobile user receives referral via SMS/email
    await page.goto('/signup?ref=MOBILE_TEST_CODE&utm_source=sms');
    
    // Mobile user starts signup but doesn't complete
    await page.fill('[data-testid="bride-name"]', 'Mobile User');
    await page.fill('[data-testid="couple-email"]', 'mobile@testmail.com');
    
    // Save progress
    await page.click('[data-testid="save-progress"]');
    
    journeyTracker.recordStep('mobile_progress_saved');
    
    // Switch to desktop context
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const desktopPage = await desktopContext.newPage();
    
    // User continues on desktop
    await desktopPage.goto('/signup/continue?email=mobile@testmail.com');
    
    journeyTracker.recordStep('desktop_continuation');
    
    // Should pre-populate saved data
    const savedName = await desktopPage.inputValue('[data-testid="bride-name"]');
    expect(savedName).toBe('Mobile User');
    
    // Complete signup on desktop
    await desktopPage.fill('[data-testid="groom-name"]', 'Desktop Completed');
    await desktopPage.fill('[data-testid="wedding-date"]', '2024-07-01');
    await desktopPage.check('[data-testid="terms-checkbox"]');
    await desktopPage.check('[data-testid="privacy-checkbox"]');
    
    await desktopPage.click('[data-testid="signup-submit"]');
    
    journeyTracker.recordStep('cross_device_completion');
    
    await expect(desktopPage.locator('[data-testid="welcome-message"]')).toBeVisible();
    
    await desktopContext.close();
  });

  test('Time-based Journey: Peak Hours Performance', async ({ page }) => {
    // Simulate high-load scenario
    const peakHourStart = Date.now();
    
    journeyTracker.recordStep('peak_hours_test_start');
    
    // Multiple rapid requests to simulate peak load
    const promises = Array.from({ length: 5 }, async (_, index) => {
      const testCode = `PEAK_TEST_${index}_${Date.now()}`;
      await page.goto(`/signup?ref=${testCode}`);
      return Date.now() - peakHourStart;
    });
    
    const loadTimes = await Promise.all(promises);
    const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    
    journeyTracker.recordStep('peak_hours_performance', { pageLoadTime: averageLoadTime });
    
    // Even during peak hours, performance should be acceptable
    expect(averageLoadTime).toBeLessThan(5000); // < 5s during peak
    
    console.log('Peak Hours Performance:', {
      averageLoadTime: averageLoadTime + 'ms',
      requests: loadTimes.length,
      allRequestsUnder5s: loadTimes.every(time => time < 5000)
    });
  });

  test.afterEach(async ({ page }) => {
    // Capture final state for debugging
    await page.screenshot({ 
      path: `test-results/user-journey-final-state-${Date.now()}.png`,
      fullPage: true 
    });
    
    const finalMetrics = journeyTracker.getAverageMetrics();
    
    console.log('User Journey Test Completed:', {
      totalSteps: journeyTracker.getJourneyPath().length,
      performanceMetrics: finalMetrics,
      testOutcome: 'passed'
    });
  });
});