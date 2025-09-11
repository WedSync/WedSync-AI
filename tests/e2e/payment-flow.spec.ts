/**
 * E2E Tests for Complete Payment Flows
 * Tests the entire user journey from pricing page to successful subscription
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT: '4000000000009995',
  THREE_D_SECURE: '4000000000003220',
  EXPIRED: '4000000000000069'
};

const PRICING_TIERS = [
  { name: 'STARTER', price: 19, features: ['Unlimited forms', 'PDF import', 'Email automation'] },
  { name: 'PROFESSIONAL', price: 49, features: ['AI chatbot', 'Full automation', 'Premium directory'] },
  { name: 'SCALE', price: 79, features: ['API access', 'Referral system', 'Multi-brand'] },
  { name: 'ENTERPRISE', price: 149, features: ['White-label', 'Custom integrations', 'Dedicated support'] }
];

// Helper functions
async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test@wedsync.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(/dashboard/);
}

async function fillStripeCheckoutForm(page: Page, cardNumber: string) {
  // Wait for Stripe iframe to load
  const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
  
  // Fill card details
  await stripeFrame.locator('[placeholder="Card number"]').fill(cardNumber);
  await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
  await stripeFrame.locator('[placeholder="CVC"]').fill('123');
  await stripeFrame.locator('[placeholder="ZIP"]').fill('12345');
  
  // Fill billing details
  await page.fill('[data-testid="billing-name"]', 'Test User');
  await page.fill('[data-testid="billing-email"]', 'billing@test.com');
  await page.fill('[data-testid="billing-address"]', '123 Test Street');
  await page.fill('[data-testid="billing-city"]', 'London');
  await page.fill('[data-testid="billing-postcode"]', 'SW1A 1AA');
  await page.selectOption('[data-testid="billing-country"]', 'GB');
}

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('should display all pricing tiers with correct prices', async ({ page }) => {
    for (const tier of PRICING_TIERS) {
      const tierCard = page.locator(`[data-testid="tier-${tier.name.toLowerCase()}"]`);
      await expect(tierCard).toBeVisible();
      
      // Verify price in GBP
      await expect(tierCard.locator('[data-testid="tier-price"]')).toContainText(`£${tier.price}`);
      await expect(tierCard.locator('[data-testid="tier-price"]')).toContainText('/month');
      
      // Verify key features are listed
      for (const feature of tier.features) {
        await expect(tierCard).toContainText(feature);
      }
    }
  });

  test('should show FREE tier limitations', async ({ page }) => {
    const freeTier = page.locator('[data-testid="tier-free"]');
    await expect(freeTier).toBeVisible();
    await expect(freeTier).toContainText('£0');
    await expect(freeTier).toContainText('1 form limit');
    await expect(freeTier).toContainText('1 login');
  });

  test('should highlight PROFESSIONAL as recommended', async ({ page }) => {
    const proTier = page.locator('[data-testid="tier-professional"]');
    await expect(proTier).toHaveAttribute('data-recommended', 'true');
    await expect(proTier.locator('[data-testid="recommended-badge"]')).toBeVisible();
  });

  test('should toggle between monthly and yearly billing', async ({ page }) => {
    const billingToggle = page.locator('[data-testid="billing-toggle"]');
    
    // Check monthly prices (default)
    await expect(page.locator('[data-testid="tier-starter"] [data-testid="tier-price"]')).toContainText('£19');
    
    // Switch to yearly
    await billingToggle.click();
    
    // Check yearly prices (with discount)
    await expect(page.locator('[data-testid="tier-starter"] [data-testid="tier-price"]')).toContainText('£190'); // ~20% discount
    await expect(page.locator('[data-testid="tier-starter"]')).toContainText('Save £38');
  });
});

test.describe('Subscription Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/pricing');
  });

  PRICING_TIERS.forEach(tier => {
    test(`should complete ${tier.name} tier subscription purchase`, async ({ page }) => {
      // Click upgrade button for the tier
      await page.click(`[data-testid="upgrade-${tier.name.toLowerCase()}"]`);
      
      // Should redirect to Stripe checkout
      await page.waitForURL(/checkout\.stripe\.com/);
      
      // Verify checkout session details
      await expect(page.locator('[data-testid="product-name"]')).toContainText(`WedSync ${tier.name}`);
      await expect(page.locator('[data-testid="amount"]')).toContainText(`£${tier.price}.00`);
      await expect(page.locator('[data-testid="trial-notice"]')).toContainText('14-day free trial');
      
      // Fill payment form
      await fillStripeCheckoutForm(page, TEST_CARDS.SUCCESS);
      
      // Submit payment
      await page.click('[data-testid="submit-payment"]');
      
      // Wait for success redirect
      await page.waitForURL(/dashboard\?success=true/);
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(`Successfully subscribed to ${tier.name}`);
      
      // Verify tier is updated in dashboard
      await expect(page.locator('[data-testid="current-tier"]')).toContainText(tier.name);
      
      // Verify features are unlocked
      if (tier.name === 'STARTER' || tier.name === 'PROFESSIONAL' || tier.name === 'SCALE' || tier.name === 'ENTERPRISE') {
        await expect(page.locator('[data-testid="pdf-import-enabled"]')).toBeVisible();
      }
      
      if (tier.name === 'PROFESSIONAL' || tier.name === 'SCALE' || tier.name === 'ENTERPRISE') {
        await expect(page.locator('[data-testid="ai-chatbot-enabled"]')).toBeVisible();
      }
    });
  });

  test('should handle declined card', async ({ page }) => {
    await page.click('[data-testid="upgrade-professional"]');
    await page.waitForURL(/checkout\.stripe\.com/);
    
    await fillStripeCheckoutForm(page, TEST_CARDS.DECLINE);
    await page.click('[data-testid="submit-payment"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Your card was declined');
    
    // Should stay on checkout page
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  test('should handle insufficient funds', async ({ page }) => {
    await page.click('[data-testid="upgrade-scale"]');
    await page.waitForURL(/checkout\.stripe\.com/);
    
    await fillStripeCheckoutForm(page, TEST_CARDS.INSUFFICIENT);
    await page.click('[data-testid="submit-payment"]');
    
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('insufficient funds');
  });

  test('should handle 3D Secure authentication', async ({ page }) => {
    await page.click('[data-testid="upgrade-enterprise"]');
    await page.waitForURL(/checkout\.stripe\.com/);
    
    await fillStripeCheckoutForm(page, TEST_CARDS.THREE_D_SECURE);
    await page.click('[data-testid="submit-payment"]');
    
    // Should show 3D Secure modal
    await expect(page.frameLocator('iframe[name="stripe-3ds"]')).toBeVisible();
    
    // Complete 3D Secure (test mode auto-completes)
    await page.locator('[data-testid="3ds-complete"]').click();
    
    // Should redirect to success
    await page.waitForURL(/dashboard\?success=true/);
  });

  test('should handle payment cancellation', async ({ page }) => {
    await page.click('[data-testid="upgrade-starter"]');
    await page.waitForURL(/checkout\.stripe\.com/);
    
    // Click cancel
    await page.click('[data-testid="cancel-payment"]');
    
    // Should redirect back to pricing with canceled param
    await page.waitForURL(/pricing\?canceled=true/);
    
    // Should show cancellation message
    await expect(page.locator('[data-testid="payment-canceled"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-canceled"]')).toContainText('Payment was canceled');
  });
});

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Assume user has STARTER subscription
    await page.goto('/account/subscription');
  });

  test('should display current subscription details', async ({ page }) => {
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('STARTER');
    await expect(page.locator('[data-testid="plan-price"]')).toContainText('£19/month');
    await expect(page.locator('[data-testid="next-billing"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method"]')).toContainText('•••• 4242');
  });

  test('should upgrade subscription tier', async ({ page }) => {
    // Current tier: STARTER, upgrading to PROFESSIONAL
    await page.click('[data-testid="change-plan"]');
    await page.click('[data-testid="select-professional"]');
    
    // Confirm upgrade
    await page.click('[data-testid="confirm-upgrade"]');
    
    // Should show proration notice
    await expect(page.locator('[data-testid="proration-amount"]')).toBeVisible();
    
    // Complete upgrade
    await page.click('[data-testid="complete-upgrade"]');
    
    // Wait for confirmation
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('PROFESSIONAL');
  });

  test('should downgrade subscription tier', async ({ page }) => {
    // Assume current tier is SCALE
    await page.evaluate(() => {
      localStorage.setItem('test-tier', 'SCALE');
    });
    await page.reload();
    
    await page.click('[data-testid="change-plan"]');
    await page.click('[data-testid="select-starter"]');
    
    // Should show downgrade warning
    await expect(page.locator('[data-testid="downgrade-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="downgrade-warning"]')).toContainText('You will lose access to');
    
    // Confirm downgrade
    await page.click('[data-testid="confirm-downgrade"]');
    
    // Should show when downgrade takes effect
    await expect(page.locator('[data-testid="downgrade-date"]')).toContainText('at the end of your billing period');
    
    await page.click('[data-testid="complete-downgrade"]');
    await expect(page.locator('[data-testid="downgrade-scheduled"]')).toBeVisible();
  });

  test('should cancel subscription', async ({ page }) => {
    await page.click('[data-testid="cancel-subscription"]');
    
    // Should show cancellation survey
    await expect(page.locator('[data-testid="cancellation-reason"]')).toBeVisible();
    await page.selectOption('[data-testid="cancellation-reason"]', 'too-expensive');
    await page.fill('[data-testid="cancellation-feedback"]', 'Test cancellation');
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"]');
    
    // Should show retention offer
    await expect(page.locator('[data-testid="retention-offer"]')).toBeVisible();
    await expect(page.locator('[data-testid="retention-offer"]')).toContainText('30% off');
    
    // Proceed with cancellation
    await page.click('[data-testid="proceed-cancel"]');
    
    // Should show cancellation confirmation
    await expect(page.locator('[data-testid="subscription-canceled"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-until"]')).toBeVisible();
  });

  test('should update payment method', async ({ page }) => {
    await page.click('[data-testid="update-payment"]');
    
    // Fill new card details
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('[placeholder="Card number"]').fill('5555555555554444'); // Mastercard
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/35');
    await stripeFrame.locator('[placeholder="CVC"]').fill('456');
    
    await page.click('[data-testid="save-payment-method"]');
    
    // Should show success
    await expect(page.locator('[data-testid="payment-updated"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method"]')).toContainText('•••• 4444');
  });
});

test.describe('Trial Period', () => {
  test('should show trial status for new users', async ({ page }) => {
    // Register new user
    await page.goto('/register');
    await page.fill('[data-testid="email"]', `trial-${Date.now()}@test.com`);
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.fill('[data-testid="organization"]', 'Trial Org');
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to dashboard with trial notice
    await page.waitForURL(/dashboard/);
    await expect(page.locator('[data-testid="trial-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-banner"]')).toContainText('30-day Professional trial');
    await expect(page.locator('[data-testid="trial-days-left"]')).toContainText('30 days left');
    
    // Should have access to Professional features
    await expect(page.locator('[data-testid="ai-chatbot-enabled"]')).toBeVisible();
  });

  test('should convert trial to paid subscription', async ({ page }) => {
    await loginAsTestUser(page);
    
    // Assume user is in trial
    await page.goto('/dashboard');
    await page.click('[data-testid="trial-banner"] [data-testid="upgrade-now"]');
    
    // Should go to pricing with trial context
    await expect(page).toHaveURL(/pricing\?from=trial/);
    
    // Select plan
    await page.click('[data-testid="upgrade-professional"]');
    
    // Should show trial conversion benefits
    await page.waitForURL(/checkout\.stripe\.com/);
    await expect(page.locator('[data-testid="trial-conversion"]')).toContainText('Continue with Professional');
    
    // Complete payment
    await fillStripeCheckoutForm(page, TEST_CARDS.SUCCESS);
    await page.click('[data-testid="submit-payment"]');
    
    // Should show successful conversion
    await page.waitForURL(/dashboard/);
    await expect(page.locator('[data-testid="trial-converted"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-banner"]')).not.toBeVisible();
  });
});

test.describe('Invoice and Billing History', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/account/billing');
  });

  test('should display billing history', async ({ page }) => {
    await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
    
    // Should show past invoices
    const invoices = page.locator('[data-testid="invoice-row"]');
    await expect(invoices).toHaveCount(3); // Assuming 3 months of history
    
    // Verify invoice details
    const firstInvoice = invoices.first();
    await expect(firstInvoice.locator('[data-testid="invoice-date"]')).toBeVisible();
    await expect(firstInvoice.locator('[data-testid="invoice-amount"]')).toContainText('£');
    await expect(firstInvoice.locator('[data-testid="invoice-status"]')).toContainText('Paid');
  });

  test('should download invoice PDF', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="invoice-row"]:first-child [data-testid="download-invoice"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('invoice');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should show upcoming invoice', async ({ page }) => {
    await expect(page.locator('[data-testid="upcoming-invoice"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-charge-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-charge-amount"]')).toContainText('£');
  });
});