/**
 * WS-167 Trial Management System - Round 2 Enhanced E2E Tests
 * Team E - Comprehensive testing infrastructure with visual validation
 * Integration testing with Teams A, B, C, D components
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TrialTestHelpers } from './helpers/trial-test-helpers';
import { PaymentTestHelpers } from './helpers/payment-helpers';
import { EmailTestHelpers } from './helpers/email-helpers';

const trialHelpers = new TrialTestHelpers();
const paymentHelpers = new PaymentTestHelpers();
const emailHelpers = new EmailTestHelpers();

test.describe('WS-167 Enhanced Trial Management - Round 2', () => {
  let page: Page;
  let context: BrowserContext;
  let testUser: any;
  
  test.beforeAll(async () => {
    // Setup test environment
    await trialHelpers.setupTestEnvironment();
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      recordVideo: {
        dir: './test-results/videos/',
        size: { width: 1280, height: 720 }
      },
      recordHar: { path: './test-results/har/network.har' }
    });
    page = await context.newPage();
    
    // Create test user for each test
    testUser = await trialHelpers.createTestTrialUser();
  });

  test.afterEach(async () => {
    await trialHelpers.cleanupTestUser(testUser);
    await context.close();
  });

  test('Complete Trial Lifecycle with Payment Integration', async () => {
    await test.step('Register new trial user', async () => {
      await page.goto('/auth/register');
      
      // Fill registration form
      await page.fill('[data-testid="name-input"]', testUser.name);
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="company-input"]', 'Test Wedding Co');
      await page.check('[data-testid="trial-checkbox"]');
      
      // Screenshot before submission
      await expect(page).toHaveScreenshot('trial-registration-filled.png');
      
      // Submit and wait for API response
      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/auth/register')),
        page.click('[data-testid="register-button"]')
      ]);
      
      expect(response.status()).toBe(201);
      
      // Verify redirect to trial dashboard
      await expect(page).toHaveURL(/\/dashboard\/trial/);
      await expect(page.locator('[data-testid="trial-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="trial-days-remaining"]')).toContainText('14 days');
    });

    await test.step('Track trial activity and engagement', async () => {
      // Perform tracked activities
      const activities = [
        { type: 'create_client', data: { name: 'John & Jane Wedding', date: '2025-06-15' } },
        { type: 'create_journey', data: { name: 'Wedding Planning Journey' } },
        { type: 'view_reports', data: {} },
        { type: 'customize_dashboard', data: { widgets: ['calendar', 'tasks', 'revenue'] } }
      ];
      
      for (const activity of activities) {
        await trialHelpers.performActivity(page, activity);
        
        // Verify activity is tracked
        const activityLog = await page.evaluate(() => 
          window.localStorage.getItem('trial_activity_log')
        );
        expect(activityLog).toContain(activity.type);
      }
      
      // Check engagement score update
      await page.goto('/dashboard/trial');
      const engagementScore = await page.locator('[data-testid="engagement-score"]').textContent();
      expect(parseInt(engagementScore || '0')).toBeGreaterThan(50);
    });

    await test.step('Test feature limitations', async () => {
      // Test client limit (3 for trial)
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="create-client-button"]');
        await page.fill('[data-testid="client-name"]', `Client ${i}`);
        await page.click('[data-testid="save-client"]');
        await page.waitForSelector(`[data-testid="client-card-${i}"]`);
      }
      
      // Try to create 4th client - should show limit
      await page.click('[data-testid="create-client-button"]');
      await expect(page.locator('[data-testid="trial-limit-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-cta"]')).toBeVisible();
      await expect(page).toHaveScreenshot('trial-limit-reached.png');
    });

    await test.step('Initiate trial conversion', async () => {
      await page.click('[data-testid="upgrade-cta"]');
      await expect(page).toHaveURL(/\/billing\/upgrade/);
      
      // Select Professional plan
      await page.click('[data-testid="plan-professional"]');
      await expect(page.locator('[data-testid="selected-plan"]')).toHaveText('Professional Plan');
      
      // Enter payment details
      await paymentHelpers.fillPaymentForm(page, {
        cardNumber: '4242424242424242',
        expiry: '12/30',
        cvc: '123',
        name: testUser.name,
        email: testUser.email
      });
      
      // Process payment
      const [paymentResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/billing/subscribe')),
        page.click('[data-testid="complete-payment"]')
      ]);
      
      expect(paymentResponse.status()).toBe(200);
      
      // Verify conversion success
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="subscription-badge"]')).toContainText('Professional');
      await expect(page.locator('[data-testid="trial-banner"]')).not.toBeVisible();
    });
  });

  test('Trial Extension Flow with Admin Approval', async () => {
    await test.step('Setup expiring trial user', async () => {
      // Set trial to expire in 2 days
      await trialHelpers.setTrialExpiration(testUser.id, 2);
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Verify expiring warning
      await expect(page.locator('[data-testid="trial-expiring-banner"]')).toBeVisible();
      await expect(page).toHaveScreenshot('trial-expiring-warning.png');
    });

    await test.step('Request extension', async () => {
      await page.click('[data-testid="request-extension-button"]');
      
      // Fill extension request form
      await page.fill('[data-testid="extension-reason"]', 'Need more time to evaluate advanced features');
      await page.selectOption('[data-testid="extension-duration"]', '7');
      await page.check('[data-testid="actively-testing"]');
      
      await page.click('[data-testid="submit-extension-request"]');
      
      // Verify request submitted
      await expect(page.locator('[data-testid="extension-pending"]')).toBeVisible();
    });

    await test.step('Admin approves extension', async () => {
      const adminPage = await context.newPage();
      const adminUser = await trialHelpers.getAdminUser();
      
      await adminPage.goto('/admin/login');
      await adminPage.fill('[data-testid="email-input"]', adminUser.email);
      await adminPage.fill('[data-testid="password-input"]', adminUser.password);
      await adminPage.click('[data-testid="login-button"]');
      
      // Navigate to extension requests
      await adminPage.click('[data-testid="nav-extensions"]');
      await expect(adminPage.locator(`[data-testid="request-${testUser.id}"]`)).toBeVisible();
      
      // Approve extension
      await adminPage.click(`[data-testid="approve-${testUser.id}"]`);
      await adminPage.fill('[data-testid="admin-notes"]', 'Approved - actively using platform');
      await adminPage.click('[data-testid="confirm-approval"]');
      
      await expect(adminPage.locator('[data-testid="approval-success"]')).toBeVisible();
      await adminPage.close();
    });

    await test.step('Verify extension applied', async () => {
      await page.reload();
      
      // Check updated expiration
      await expect(page.locator('[data-testid="trial-days-remaining"]')).toContainText('9 days');
      await expect(page.locator('[data-testid="extension-approved-notice"]')).toBeVisible();
      
      // Verify email notification
      const extensionEmail = await emailHelpers.getLastEmail(testUser.email);
      expect(extensionEmail.subject).toContain('Trial Extended');
      expect(extensionEmail.body).toContain('7 additional days');
    });
  });

  test('Multi-tenant Isolation and Security', async () => {
    const tenant1 = await trialHelpers.createTestTrialUser('tenant1');
    const tenant2 = await trialHelpers.createTestTrialUser('tenant2');
    
    await test.step('Create data for Tenant 1', async () => {
      const page1 = await context.newPage();
      await page1.goto('/auth/login');
      await page1.fill('[data-testid="email-input"]', tenant1.email);
      await page1.fill('[data-testid="password-input"]', tenant1.password);
      await page1.click('[data-testid="login-button"]');
      
      // Create client
      await page1.click('[data-testid="create-client-button"]');
      await page1.fill('[data-testid="client-name"]', 'Tenant 1 Client');
      await page1.click('[data-testid="save-client"]');
      
      const clientId = await page1.locator('[data-testid^="client-card-"]').first().getAttribute('data-client-id');
      tenant1.clientId = clientId;
      
      await page1.close();
    });

    await test.step('Verify Tenant 2 cannot access Tenant 1 data', async () => {
      const page2 = await context.newPage();
      await page2.goto('/auth/login');
      await page2.fill('[data-testid="email-input"]', tenant2.email);
      await page2.fill('[data-testid="password-input"]', tenant2.password);
      await page2.click('[data-testid="login-button"]');
      
      // Verify cannot see Tenant 1's client
      await expect(page2.locator(`[data-client-id="${tenant1.clientId}"]`)).not.toBeVisible();
      
      // Try direct URL access
      await page2.goto(`/clients/${tenant1.clientId}`);
      await expect(page2.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page2).toHaveScreenshot('tenant-isolation-enforced.png');
      
      await page2.close();
    });
    
    await trialHelpers.cleanupTestUser(tenant1);
    await trialHelpers.cleanupTestUser(tenant2);
  });

  test('Trial Analytics and Reporting', async () => {
    await test.step('Generate trial activities', async () => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Perform various activities for analytics
      const actions = [
        { nav: '/clients', action: 'view' },
        { nav: '/journey-builder', action: 'create' },
        { nav: '/reports', action: 'generate' },
        { nav: '/settings', action: 'customize' }
      ];
      
      for (const { nav, action } of actions) {
        await page.goto(nav);
        await page.waitForLoadState('networkidle');
        
        // Track time on page
        await page.waitForTimeout(2000);
        
        // Perform action
        if (await page.locator(`[data-testid="${action}-button"]`).isVisible()) {
          await page.click(`[data-testid="${action}-button"]`);
        }
      }
    });

    await test.step('View trial analytics dashboard', async () => {
      await page.goto('/dashboard/trial/analytics');
      
      // Verify metrics display
      await expect(page.locator('[data-testid="total-activities"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversion-probability"]')).toBeVisible();
      
      // Check conversion probability calculation
      const probability = await page.locator('[data-testid="conversion-probability"]').textContent();
      expect(parseFloat(probability || '0')).toBeGreaterThan(0);
      
      await expect(page).toHaveScreenshot('trial-analytics-dashboard.png');
    });
  });
});

// Additional cross-browser tests
test.describe('Cross-Browser Trial Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];
  
  browsers.forEach(browserName => {
    test(`Trial flow works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      if (currentBrowser !== browserName) {
        test.skip();
      }
      
      await page.goto('/auth/register');
      await expect(page).toHaveScreenshot(`trial-register-${browserName}.png`);
      
      // Test form interactions
      await page.fill('[data-testid="name-input"]', `${browserName} Test User`);
      await page.fill('[data-testid="email-input"]', `${browserName}@test.com`);
      await page.fill('[data-testid="password-input"]', 'Test123!');
      
      // Browser-specific checkbox handling
      const checkbox = page.locator('[data-testid="trial-checkbox"]');
      if (browserName === 'webkit') {
        await checkbox.click();
      } else {
        await checkbox.check();
      }
      
      await expect(page).toHaveScreenshot(`trial-form-${browserName}.png`);
    });
  });
});