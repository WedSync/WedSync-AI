/**
 * WS-344 Supplier Referral Gamification System - End-to-End Tests
 * Complete user flow testing with Playwright
 * Tests viral referral chains, mobile sharing, and cross-platform compatibility
 */

import { test, expect, devices, Page, BrowserContext } from '@playwright/test';
import { createMockSupplier, createMockReferral } from '../utils/factories';

// Test configuration for different scenarios
const TEST_CONFIG = {
  BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  MOBILE_VIEWPORT: { width: 375, height: 812 }, // iPhone SE
  DESKTOP_VIEWPORT: { width: 1280, height: 720 }
};

// Test data
const testSuppliers = {
  referrer: {
    email: 'referrer@wedsync-test.com',
    password: 'TestPassword123!',
    name: 'Sarah Photography Pro',
    category: 'photography'
  },
  referred: {
    email: 'referred@wedsync-test.com', 
    password: 'TestPassword123!',
    name: 'Mike DJ Services',
    category: 'music'
  },
  secondary: {
    email: 'secondary@wedsync-test.com',
    password: 'TestPassword123!', 
    name: 'Emma Catering Co',
    category: 'catering'
  }
};

/**
 * Helper functions for common actions
 */
class ReferralTestHelpers {
  static async loginSupplier(page: Page, email: string, password: string) {
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('[data-testid="email"]', email);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await expect(page).toHaveURL(/.*dashboard.*/);
    await page.waitForLoadState('networkidle');
  }

  static async navigateToReferrals(page: Page) {
    await page.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the referrals page
    await expect(page.locator('[data-testid="referral-dashboard"]')).toBeVisible();
  }

  static async createReferralLink(page: Page, customMessage?: string): Promise<string> {
    await page.click('[data-testid="create-referral-link"]');
    
    if (customMessage) {
      await page.fill('[data-testid="custom-message"]', customMessage);
    }
    
    await page.click('[data-testid="generate-link"]');
    
    // Wait for link generation
    await expect(page.locator('[data-testid="referral-link"]')).toBeVisible({ timeout: 10000 });
    
    const referralLink = await page.locator('[data-testid="referral-link"]').textContent();
    expect(referralLink).toMatch(/wedsync\.com\/join\/[A-Z0-9]{8}/);
    
    return referralLink!;
  }

  static async signupNewSupplier(page: Page, email: string, password: string, name: string, referralCode?: string) {
    // Navigate to signup (with referral code if provided)
    const signupUrl = referralCode 
      ? `${TEST_CONFIG.BASE_URL}/signup?ref=${referralCode}`
      : `${TEST_CONFIG.BASE_URL}/signup`;
    
    await page.goto(signupUrl);
    await page.waitForLoadState('networkidle');
    
    // If referral code was provided, verify referral banner is shown
    if (referralCode) {
      await expect(page.locator('[data-testid="referral-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="referral-banner"]')).toContainText('referred you');
      await expect(page.locator('[data-testid="extended-trial-notice"]')).toContainText('30 days');
    }
    
    // Fill signup form
    await page.fill('[data-testid="business-name"]', name);
    await page.fill('[data-testid="email"]', email);
    await page.fill('[data-testid="password"]', password);
    await page.fill('[data-testid="confirm-password"]', password);
    
    // Select category
    await page.click('[data-testid="category-dropdown"]');
    await page.click('[data-testid="category-photography"]');
    
    // Accept terms
    await page.check('[data-testid="terms-checkbox"]');
    await page.check('[data-testid="privacy-checkbox"]');
    
    // Submit signup
    await page.click('[data-testid="signup-button"]');
    
    // Wait for successful signup
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  }

  static async subscribeToPlan(page: Page, plan: 'starter' | 'professional' | 'scale' = 'professional') {
    await page.goto(`${TEST_CONFIG.BASE_URL}/billing/subscribe`);
    await page.waitForLoadState('networkidle');
    
    // Select plan
    await page.click(`[data-testid="${plan}-plan"]`);
    
    // Fill billing information (using test data)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/30');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="billing-name"]', 'Test User');
    
    // Complete payment
    await page.click('[data-testid="complete-payment"]');
    
    // Wait for success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 15000 });
  }

  static async extractReferralCodeFromLink(link: string): Promise<string> {
    const match = link.match(/\/join\/([A-Z0-9]{8})/);
    if (!match) throw new Error('Could not extract referral code from link');
    return match[1];
  }

  static async waitForNotification(page: Page, message: string) {
    await expect(page.locator('[data-testid="notification"]')).toContainText(message);
    await page.locator('[data-testid="notification"]').waitFor({ state: 'hidden', timeout: 5000 });
  }
}

test.describe('Supplier Referral System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set reasonable timeouts
    test.setTimeout(120000); // 2 minutes per test
    
    // Setup page with error handling
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
    
    page.on('requestfailed', (request) => {
      console.warn('Failed request:', request.url(), request.failure()?.errorText);
    });
  });

  test('should display referral dashboard correctly', async ({ page }) => {
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    await ReferralTestHelpers.navigateToReferrals(page);
    
    // Verify main sections are present
    await expect(page.locator('[data-testid="referral-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="referral-tools"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaderboard-preview"]')).toBeVisible();
    
    // Check stats display - should show numbers
    await expect(page.locator('[data-testid="total-referrals"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="paid-conversions"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="conversion-rate"]')).toContainText(/%/);
    
    // Verify referral tools are functional
    await expect(page.locator('[data-testid="create-referral-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-leaderboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-tools"]')).toBeVisible();
    
    // Check responsive layout
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 768) {
      // Mobile layout checks
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="stats-cards"]')).toHaveCSS('flex-direction', 'column');
    }
  });

  test('should create and display referral link with all components', async ({ page }) => {
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    await ReferralTestHelpers.navigateToReferrals(page);
    
    const customMessage = 'Join me on WedSync - the best platform for wedding suppliers!';
    const referralLink = await ReferralTestHelpers.createReferralLink(page, customMessage);
    
    // Verify all link components are generated
    await expect(page.locator('[data-testid="referral-link"]')).toHaveText(referralLink);
    await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-text"]')).toContainText(customMessage);
    
    // Test copy functionality
    await page.click('[data-testid="copy-link"]');
    await ReferralTestHelpers.waitForNotification(page, 'Link copied to clipboard');
    
    // Test QR code functionality
    await page.click('[data-testid="download-qr"]');
    
    // Verify QR code download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-qr"]')
    ]);
    expect(download.suggestedFilename()).toMatch(/referral-qr-.*\.png/);
    
    // Test social sharing links
    const whatsappLink = await page.locator('[data-testid="share-whatsapp"]').getAttribute('href');
    expect(whatsappLink).toContain('wa.me');
    expect(whatsappLink).toContain(encodeURIComponent(referralLink));
    
    const facebookLink = await page.locator('[data-testid="share-facebook"]').getAttribute('href');
    expect(facebookLink).toContain('facebook.com/sharer');
    
    const twitterLink = await page.locator('[data-testid="share-twitter"]').getAttribute('href');
    expect(twitterLink).toContain('twitter.com/intent/tweet');
    
    // Verify link expiration is shown
    await expect(page.locator('[data-testid="expiry-date"]')).toContainText(/expires in \d+ days/i);
  });

  test('complete A→B→C viral referral chain', async ({ browser }) => {
    // Create three browser contexts (3 different users)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const contextC = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const pageC = await contextC.newPage();
    
    try {
      // User A: Login and create referral
      await ReferralTestHelpers.loginSupplier(pageA, testSuppliers.referrer.email, testSuppliers.referrer.password);
      await ReferralTestHelpers.navigateToReferrals(pageA);
      
      const referralLinkA = await ReferralTestHelpers.createReferralLink(pageA, 'Join our wedding supplier network!');
      const referralCodeA = await ReferralTestHelpers.extractReferralCodeFromLink(referralLinkA);
      
      // User B: Sign up using User A's referral
      await ReferralTestHelpers.signupNewSupplier(
        pageB, 
        testSuppliers.referred.email, 
        testSuppliers.referred.password, 
        testSuppliers.referred.name,
        referralCodeA
      );
      
      // User B: Subscribe to trigger conversion for User A
      await ReferralTestHelpers.subscribeToPlan(pageB, 'professional');
      
      // Verify User A received conversion notification
      await pageA.reload();
      await pageA.waitForLoadState('networkidle');
      await expect(pageA.locator('[data-testid="conversion-notification"]')).toBeVisible();
      await expect(pageA.locator('[data-testid="total-earned"]')).toContainText('£39'); // 1 month professional credit
      
      // User B: Create their own referral link
      await ReferralTestHelpers.navigateToReferrals(pageB);
      const referralLinkB = await ReferralTestHelpers.createReferralLink(pageB, 'Amazing platform - highly recommend!');
      const referralCodeB = await ReferralTestHelpers.extractReferralCodeFromLink(referralLinkB);
      
      // User C: Sign up using User B's referral
      await ReferralTestHelpers.signupNewSupplier(
        pageC,
        testSuppliers.secondary.email,
        testSuppliers.secondary.password,
        testSuppliers.secondary.name,
        referralCodeB
      );
      
      // User C: Subscribe to trigger conversion for User B
      await ReferralTestHelpers.subscribeToPlan(pageC, 'professional');
      
      // Verify complete referral chain statistics
      // User A should have 1 direct referral + 1 indirect referral
      await pageA.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals/stats`);
      await expect(pageA.locator('[data-testid="direct-referrals"]')).toContainText('1');
      await expect(pageA.locator('[data-testid="indirect-referrals"]')).toContainText('1');
      await expect(pageA.locator('[data-testid="viral-coefficient"]')).toContainText('2.0');
      
      // User B should have 1 direct referral
      await pageB.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals/stats`);
      await expect(pageB.locator('[data-testid="direct-referrals"]')).toContainText('1');
      await expect(pageB.locator('[data-testid="indirect-referrals"]')).toContainText('0');
      
      // Check leaderboard reflects the viral chain
      await pageA.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals/leaderboard`);
      const leaderboardEntries = pageA.locator('[data-testid="leaderboard-entry"]');
      await expect(leaderboardEntries.first()).toContainText(testSuppliers.referrer.name);
      await expect(leaderboardEntries.first().locator('[data-testid="conversions-count"]')).toContainText('1 paid');
      
    } finally {
      await contextA.close();
      await contextB.close();  
      await contextC.close();
    }
  });

  test('should handle mobile sharing experience', async ({ browser }) => {
    // Test on iPhone SE (smallest mobile screen)
    const mobileContext = await browser.newContext({
      ...devices['iPhone SE'],
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await mobileContext.newPage();
    
    try {
      await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
      await ReferralTestHelpers.navigateToReferrals(page);
      
      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-referral-dashboard"]')).toBeVisible();
      
      // Test touch-friendly interface
      const shareButton = page.locator('[data-testid="mobile-share-button"]');
      await expect(shareButton).toHaveCSS('min-height', '48px'); // Touch target size
      await expect(shareButton).toBeVisible();
      
      // Create referral link
      const referralLink = await ReferralTestHelpers.createReferralLink(page);
      
      // Test native sharing API
      await page.addInitScript(() => {
        // Mock native sharing for testing
        (window.navigator as any).share = async (data: any) => {
          (window as any).shareData = data;
          return Promise.resolve();
        };
        (window.navigator as any).canShare = () => true;
      });
      
      await page.click('[data-testid="mobile-share-button"]');
      
      // Verify share data
      const shareData = await page.evaluate(() => (window as any).shareData);
      expect(shareData.title).toContain('WedSync');
      expect(shareData.url).toContain('/join/');
      expect(shareData.text).toContain('referral code');
      
      // Test WhatsApp sharing (most common on mobile)
      const whatsappButton = page.locator('[data-testid="share-whatsapp"]');
      await expect(whatsappButton).toBeVisible();
      
      const whatsappUrl = await whatsappButton.getAttribute('href');
      expect(whatsappUrl).toContain('wa.me');
      expect(whatsappUrl).toContain(encodeURIComponent(referralLink));
      
      // Test QR code display on mobile
      await page.click('[data-testid="show-qr-mobile"]');
      await expect(page.locator('[data-testid="mobile-qr-modal"]')).toBeVisible();
      
      const qrImage = page.locator('[data-testid="mobile-qr-image"]');
      await expect(qrImage).toBeVisible();
      await expect(qrImage).toHaveAttribute('src', /.+/);
      
      // Test copy functionality on mobile
      await page.click('[data-testid="copy-link-mobile"]');
      await ReferralTestHelpers.waitForNotification(page, 'Copied!');
      
    } finally {
      await mobileContext.close();
    }
  });

  test('should display and interact with leaderboard', async ({ page }) => {
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    await page.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals/leaderboard`);
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard loads
    await expect(page.locator('[data-testid="leaderboard-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaderboard-entries"]')).toBeVisible();
    
    // Test category filtering
    await page.selectOption('[data-testid="category-filter"]', 'photography');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="leaderboard-entries"]')).toBeVisible();
    
    // Verify filtered results only show photography suppliers
    const entries = page.locator('[data-testid="leaderboard-entry"]');
    const entryCount = await entries.count();
    
    if (entryCount > 0) {
      for (let i = 0; i < Math.min(entryCount, 3); i++) {
        await expect(entries.nth(i).locator('[data-testid="supplier-category"]')).toContainText('Photography');
      }
    }
    
    // Test geographic filtering
    await page.selectOption('[data-testid="location-filter"]', 'London');
    await page.waitForLoadState('networkidle');
    
    // Test time period filtering
    await page.selectOption('[data-testid="period-filter"]', 'this_month');
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard structure
    if (entryCount > 0) {
      const firstEntry = entries.first();
      await expect(firstEntry.locator('[data-testid="supplier-rank"]')).toContainText('1');
      await expect(firstEntry.locator('[data-testid="supplier-name"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="conversions-count"]')).toContainText(/\d+ paid/);
      await expect(firstEntry.locator('[data-testid="conversion-rate"]')).toContainText(/%/);
      
      // Test trend indicators
      const trendIndicator = firstEntry.locator('[data-testid="trend-indicator"]');
      if (await trendIndicator.count() > 0) {
        await expect(trendIndicator).toHaveAttribute('data-trend', /^(up|down|stable)$/);
      }
    }
    
    // Test pagination if results exceed page size
    const nextPageButton = page.locator('[data-testid="next-page"]');
    if (await nextPageButton.count() > 0 && await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="page-indicator"]')).toContainText('2');
    }
    
    // Test search functionality
    await page.fill('[data-testid="supplier-search"]', testSuppliers.referrer.name);
    await page.press('[data-testid="supplier-search"]', 'Enter');
    await page.waitForLoadState('networkidle');
    
    const searchResults = page.locator('[data-testid="leaderboard-entry"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first().locator('[data-testid="supplier-name"]')).toContainText(testSuppliers.referrer.name);
    }
  });

  test('should track referral conversion flow with analytics', async ({ browser }) => {
    const referrerContext = await browser.newContext();
    const referredContext = await browser.newContext();
    
    const referrerPage = await referrerContext.newPage();
    const referredPage = await referredContext.newPage();
    
    try {
      // Referrer: Create referral link
      await ReferralTestHelpers.loginSupplier(referrerPage, testSuppliers.referrer.email, testSuppliers.referrer.password);
      await ReferralTestHelpers.navigateToReferrals(referrerPage);
      
      const referralLink = await ReferralTestHelpers.createReferralLink(referrerPage, 'Join our amazing community!');
      const referralCode = await ReferralTestHelpers.extractReferralCodeFromLink(referralLink);
      
      // Track initial referral creation analytics
      await expect(referrerPage.locator('[data-testid="analytics-link-created"]')).toBeVisible();
      
      // Referred user: Click referral link (simulate click tracking)
      await referredPage.goto(referralLink);
      await referredPage.waitForLoadState('networkidle');
      
      // Should redirect to signup with referral context
      await expect(referredPage).toHaveURL(new RegExp(`signup\\?ref=${referralCode}`));
      await expect(referredPage.locator('[data-testid="referral-banner"]')).toBeVisible();
      await expect(referredPage.locator('[data-testid="referrer-name"]')).toContainText(testSuppliers.referrer.name);
      
      // Complete signup flow (this should track signup_started)
      await ReferralTestHelpers.signupNewSupplier(
        referredPage,
        'newuser@wedsync-test.com',
        'TestPassword123!',
        'New Wedding Vendor',
        referralCode
      );
      
      // Check referrer sees updated analytics
      await referrerPage.reload();
      await referrerPage.waitForLoadState('networkidle');
      
      // Should show funnel progression
      await expect(referrerPage.locator('[data-testid="funnel-link-clicked"]')).toContainText('1');
      await expect(referrerPage.locator('[data-testid="funnel-signup-started"]')).toContainText('1');
      await expect(referrerPage.locator('[data-testid="funnel-signup-completed"]')).toContainText('1');
      
      // Simulate subscription (conversion)
      await ReferralTestHelpers.subscribeToPlan(referredPage, 'professional');
      
      // Check final conversion tracking
      await referrerPage.reload();
      await referrerPage.waitForLoadState('networkidle');
      
      await expect(referrerPage.locator('[data-testid="funnel-first-payment"]')).toContainText('1');
      await expect(referrerPage.locator('[data-testid="conversion-rate"]')).toContainText('100%');
      await expect(referrerPage.locator('[data-testid="reward-notification"]')).toBeVisible();
      await expect(referrerPage.locator('[data-testid="total-earned"]')).toContainText('£39');
      
      // Verify detailed analytics
      await referrerPage.click('[data-testid="view-detailed-analytics"]');
      await expect(referrerPage.locator('[data-testid="time-to-conversion"]')).toContainText(/\d+ (minutes|hours|days)/);
      await expect(referrerPage.locator('[data-testid="conversion-source"]')).toContainText('Direct Link');
      await expect(referrerPage.locator('[data-testid="device-type"]')).toContainText('Desktop');
      
    } finally {
      await referrerContext.close();
      await referredContext.close();
    }
  });

  test('should handle errors and edge cases gracefully', async ({ page }) => {
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    
    // Test invalid referral code
    await page.goto(`${TEST_CONFIG.BASE_URL}/join/INVALID1`);
    await expect(page.locator('[data-testid="invalid-referral-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="invalid-referral-message"]')).toContainText('Invalid or expired referral link');
    
    // Test expired referral code
    await page.goto(`${TEST_CONFIG.BASE_URL}/join/EXPIRED1`);
    await expect(page.locator('[data-testid="expired-referral-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="signup-without-referral"]')).toBeVisible();
    
    // Test network error handling during referral creation
    await ReferralTestHelpers.navigateToReferrals(page);
    
    // Mock network failure
    await page.route('**/api/referrals/create-link', route => route.abort());
    
    await page.click('[data-testid="create-referral-link"]');
    await page.click('[data-testid="generate-link"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to create referral link');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/referrals/create-link');
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="referral-link"]')).toBeVisible({ timeout: 10000 });
    
    // Test rate limiting
    for (let i = 0; i < 6; i++) { // Attempt to exceed rate limit
      await page.click('[data-testid="create-referral-link"]');
      await page.click('[data-testid="generate-link"]');
      
      if (i >= 4) { // Should be rate limited after 5 attempts
        await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Too many requests');
        break;
      }
    }
  });

  test('should be accessible on all screen sizes', async ({ browser }) => {
    const screenSizes = [
      { name: 'Mobile', viewport: { width: 375, height: 812 } },
      { name: 'Tablet', viewport: { width: 768, height: 1024 } },
      { name: 'Desktop', viewport: { width: 1280, height: 720 } },
      { name: 'Large Desktop', viewport: { width: 1920, height: 1080 } }
    ];
    
    for (const screen of screenSizes) {
      const context = await browser.newContext({ viewport: screen.viewport });
      const page = await context.newPage();
      
      try {
        await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
        await ReferralTestHelpers.navigateToReferrals(page);
        
        // All critical elements should be visible and accessible
        await expect(page.locator('[data-testid="referral-stats"]')).toBeVisible();
        await expect(page.locator('[data-testid="create-referral-link"]')).toBeVisible();
        
        // Touch targets should be appropriate size on mobile
        if (screen.viewport.width < 768) {
          const buttons = page.locator('button[data-testid*="share"], button[data-testid*="create"]');
          const buttonCount = await buttons.count();
          
          for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const box = await button.boundingBox();
            expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
          }
        }
        
        // Test responsive navigation
        if (screen.viewport.width < 768) {
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
        } else {
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        }
        
        console.log(`✅ ${screen.name} (${screen.viewport.width}x${screen.viewport.height}): All tests passed`);
        
      } finally {
        await context.close();
      }
    }
  });
});

// Performance-focused tests
test.describe('Referral System Performance Tests', () => {
  test('should load referral dashboard within performance budget', async ({ page }) => {
    // Set up performance monitoring
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    
    // Measure dashboard load time
    const start = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    
    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Measure referral link creation time
    const creationStart = Date.now();
    await ReferralTestHelpers.createReferralLink(page);
    const creationTime = Date.now() - creationStart;
    
    // Should create link within 3 seconds
    expect(creationTime).toBeLessThan(3000);
    
    console.log(`Performance metrics - Dashboard: ${loadTime}ms, Link creation: ${creationTime}ms`);
  });

  test('should handle large leaderboards efficiently', async ({ page }) => {
    await ReferralTestHelpers.loginSupplier(page, testSuppliers.referrer.email, testSuppliers.referrer.password);
    
    // Navigate to leaderboard
    const start = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/dashboard/referrals/leaderboard`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    
    // Should load leaderboard within 1 second
    expect(loadTime).toBeLessThan(1000);
    
    // Test scrolling performance with large dataset
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Should handle infinite scroll smoothly
    await page.waitForTimeout(500); // Allow for smooth scrolling
    const newEntries = page.locator('[data-testid="leaderboard-entry"]');
    await expect(newEntries.first()).toBeVisible();
    
    console.log(`Leaderboard load time: ${loadTime}ms`);
  });

  test('should maintain performance under concurrent sharing', async ({ browser }) => {
    // Create 5 concurrent browser contexts
    const contexts = await Promise.all(
      Array.from({ length: 5 }, () => browser.newContext())
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    try {
      // All users create referral links simultaneously
      const start = Date.now();
      
      await Promise.all(pages.map(async (page, index) => {
        await ReferralTestHelpers.loginSupplier(
          page, 
          `concurrent${index}@wedsync-test.com`, 
          'TestPassword123!'
        );
        await ReferralTestHelpers.navigateToReferrals(page);
        return ReferralTestHelpers.createReferralLink(page);
      }));
      
      const totalTime = Date.now() - start;
      
      // Should handle 5 concurrent operations within 10 seconds
      expect(totalTime).toBeLessThan(10000);
      
      console.log(`Concurrent sharing performance: ${totalTime}ms for 5 users`);
      
    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});