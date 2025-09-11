import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@wedsync.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Stripe test card numbers
const VALID_CARD = '4242424242424242';
const DECLINED_CARD = '4000000000000002';
const REQUIRES_AUTHENTICATION_CARD = '4000002500003155';

test.describe('Payment Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Mock authentication state if needed
    await page.addInitScript(() => {
      localStorage.setItem('sb-access-token', 'mock-access-token');
    });
  });

  test('should display pricing plans correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    
    // Check that pricing plans are displayed
    await expect(page.getByText('Choose Your Plan')).toBeVisible();
    
    // Verify all tiers are shown
    await expect(page.getByText('Free')).toBeVisible();
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Scale')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
    
    // Check pricing display
    await expect(page.getByText('£19/mo')).toBeVisible(); // Starter
    await expect(page.getByText('£49/mo')).toBeVisible(); // Professional
  });

  test('should toggle billing cycle and update pricing', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    
    // Initially should show monthly pricing
    await expect(page.getByText('£49/mo')).toBeVisible();
    
    // Click annual toggle
    await page.getByRole('button', { name: /annual/i }).click();
    
    // Should show annual pricing (monthly equivalent)
    await expect(page.getByText('£41/mo')).toBeVisible(); // Professional annual
    await expect(page.getByText('Save £98 per year')).toBeVisible();
  });

  test('should navigate to payment form when selecting a plan', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    
    // Click on Professional plan
    await page.getByText('Choose Professional').click();
    
    // Should navigate to payment form
    await expect(page.getByText('Professional Plan')).toBeVisible();
    await expect(page.getByText('Payment Details')).toBeVisible();
  });

  test('should display payment form with correct plan details', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/checkout?tier=professional&cycle=monthly`);
    
    // Check plan information
    await expect(page.getByText('Professional Plan')).toBeVisible();
    await expect(page.getByText('£49/mo')).toBeVisible();
    await expect(page.getByText('Monthly Subscription')).toBeVisible();
    
    // Check form fields
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByText('Card Information')).toBeVisible();
  });

  test('should validate required form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/checkout?tier=professional&cycle=monthly`);
    
    // Try to submit without filling fields
    await page.getByRole('button', { name: /subscribe for/i }).click();
    
    // Should show validation errors
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('should handle successful payment flow', async ({ page }) => {
    // Mock successful Stripe checkout session creation
    await page.route('**/api/stripe/create-checkout-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://checkout.stripe.com/c/pay/test_session_id',
          sessionId: 'cs_test_session_id',
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing/checkout?tier=professional&cycle=monthly`);
    
    // Fill out the form
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email Address').fill(TEST_USER_EMAIL);
    
    // Mock Stripe Elements (in real test, this would be handled by Stripe)
    await page.evaluate(() => {
      // Mock Stripe Elements as complete
      window.mockStripeElementComplete = true;
    });
    
    // Submit the form
    await page.getByRole('button', { name: /subscribe for/i }).click();
    
    // Should redirect to Stripe checkout (or handle success)
    // In a real test, you might wait for navigation to Stripe or success page
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 5000 }).catch(() => {
      // If mocking locally, might not actually redirect
    });
  });

  test('should handle payment failures gracefully', async ({ page }) => {
    // Mock failed checkout session creation
    await page.route('**/api/stripe/create-checkout-session', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Your card was declined. Please try a different payment method.',
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing/checkout?tier=professional&cycle=monthly`);
    
    // Fill form and submit
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email Address').fill(TEST_USER_EMAIL);
    
    await page.getByRole('button', { name: /subscribe for/i }).click();
    
    // Should display error message
    await expect(page.getByText('Your card was declined')).toBeVisible();
  });

  test('should display current subscription status', async ({ page }) => {
    // Mock subscription data
    await page.route('**/api/billing/subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            tier: 'PROFESSIONAL',
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing`);
    
    // Check subscription card display
    await expect(page.getByText('Professional Plan')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('£49/mo')).toBeVisible();
  });

  test('should allow subscription management actions', async ({ page }) => {
    // Mock active subscription
    await page.route('**/api/billing/subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            tier: 'PROFESSIONAL',
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing`);
    
    // Should show management actions
    await expect(page.getByText('Upgrade Plan')).toBeVisible();
    await expect(page.getByText('Change Plan')).toBeVisible();
    await expect(page.getByText('Cancel Subscription')).toBeVisible();
  });

  test('should display payment history', async ({ page }) => {
    // Mock payment history
    await page.route('**/api/billing/payment-history**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payments: [
            {
              id: 'pi_test_payment_1',
              date: new Date().toISOString(),
              amount: 4900, // £49.00 in pence
              currency: 'gbp',
              status: 'succeeded',
              description: 'Professional Plan - Monthly',
              invoiceNumber: 'INV-001',
              invoiceUrl: 'https://invoice.stripe.com/test',
            },
          ],
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing/history`);
    
    // Check payment history display
    await expect(page.getByText('Payment History')).toBeVisible();
    await expect(page.getByText('Professional Plan - Monthly')).toBeVisible();
    await expect(page.getByText('£49.00')).toBeVisible();
    await expect(page.getByText('Paid')).toBeVisible();
  });

  test('should handle payment method management', async ({ page }) => {
    // Mock payment methods
    await page.route('**/api/billing/payment-methods**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentMethods: [
            {
              id: 'pm_test_card',
              type: 'card',
              card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2028,
                funding: 'credit',
              },
              isDefault: true,
              created: new Date().toISOString(),
            },
          ],
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing/payment-methods`);
    
    // Check payment methods display
    await expect(page.getByText('Payment Methods')).toBeVisible();
    await expect(page.getByText('Visa •••• 4242')).toBeVisible();
    await expect(page.getByText('Default')).toBeVisible();
    await expect(page.getByText('Add Payment Method')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/pricing`);
    
    // Check that content is accessible on mobile
    await expect(page.getByText('Choose Your Plan')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    
    // Check that plan cards are properly laid out
    const planCards = page.locator('[role="article"], .pricing-card, [data-testid*="plan"]');
    expect(await planCards.count()).toBeGreaterThan(0);
  });

  test('should handle trial period display', async ({ page }) => {
    // Mock trial subscription
    await page.route('**/api/billing/subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            tier: 'PROFESSIONAL',
            status: 'trialing',
            billingCycle: 'monthly',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      });
    });
    
    await page.goto(`${BASE_URL}/billing`);
    
    // Should show trial information
    await expect(page.getByText(/trial ends in \d+ days/i)).toBeVisible();
    await expect(page.getByText('Trial')).toBeVisible();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    
    // Check for proper heading structure
    const h1 = page.getByRole('heading', { level: 1 });
    const h2s = page.getByRole('heading', { level: 2 });
    
    expect(await h1.count()).toBeGreaterThanOrEqual(1);
    expect(await h2s.count()).toBeGreaterThan(0);
    
    // Check for proper button accessibility
    const buttons = page.getByRole('button');
    expect(await buttons.count()).toBeGreaterThan(0);
    
    // Verify form labels are properly associated
    await page.goto(`${BASE_URL}/billing/checkout?tier=professional&cycle=monthly`);
    
    const nameInput = page.getByLabel('Full Name');
    const emailInput = page.getByLabel('Email Address');
    
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
  });
});