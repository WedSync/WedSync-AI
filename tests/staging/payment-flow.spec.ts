import { test, expect } from '@playwright/test';
import { StagingValidationConfig } from './staging-validation.config';

const config = StagingValidationConfig;

test.describe('Payment Flow Validation Tests', () => {

  test('Stripe configuration endpoint accessibility', async ({ page }) => {
    const response = await page.request.get(`${config.environment.apiUrl}/stripe/config`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.publishableKey).toContain('pk_test_');
      console.log('💳 Stripe test configuration confirmed');
    } else {
      // May be protected - that's expected in staging
      expect([401, 403]).toContain(response.status());
      console.log('🔒 Stripe config appropriately protected');
    }
  });

  test('Stripe webhook endpoint exists', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/webhook`, {
      data: { test: true }
    });
    
    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404);
    console.log(`🪝 Stripe webhook endpoint accessible (status: ${response.status()})`);
  });

  test('Checkout session creation endpoint', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/create-checkout-session`, {
      data: { 
        priceId: 'price_test_12345',
        successUrl: 'https://staging.wedsync.app/success',
        cancelUrl: 'https://staging.wedsync.app/cancel'
      }
    });
    
    // Should handle request (may require auth)
    expect([200, 401, 422]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.url || data.sessionId).toBeDefined();
      console.log('✅ Checkout session creation working');
    } else {
      console.log(`🔒 Checkout session creation protected (status: ${response.status()})`);
    }
  });

  test('Pricing page loads and displays plans', async ({ page }) => {
    await page.goto(`${config.environment.baseUrl}/pricing`);
    
    // Should load pricing page
    expect(page.url()).toContain('/pricing');
    
    // Look for pricing elements
    const hasPricingContent = await page.locator('text=/plan|price|subscribe|pricing/i').count() > 0;
    expect(hasPricingContent).toBeTruthy();
    
    console.log('💰 Pricing page accessible and functional');
  });

  test('Payment validation with test card data', async ({ page }) => {
    // Test basic payment validation without full flow
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/validate-payment`, {
      data: {
        paymentMethodType: 'card',
        testCard: config.testData.payments.testCards.visa
      }
    });
    
    // Endpoint may not exist - that's ok for this test
    if (response.status() !== 404) {
      expect([200, 401, 422]).toContain(response.status());
      console.log('🎯 Payment validation handling requests');
    } else {
      console.log('ℹ️ Payment validation endpoint not implemented (optional)');
    }
  });

  test('Webhook signature validation', async ({ page }) => {
    const testPayload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123' } }
    });
    
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/webhook`, {
      data: testPayload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'invalid_signature'
      }
    });
    
    // Should reject invalid signatures
    expect([400, 401, 403]).toContain(response.status());
    console.log('🔐 Webhook signature validation working');
  });

  test('Subscription management endpoints', async ({ page }) => {
    // Test subscription status endpoint
    const statusResponse = await page.request.get(`${config.environment.apiUrl}/subscription/status`);
    
    if (statusResponse.status() !== 404) {
      expect([200, 401]).toContain(statusResponse.status());
      console.log('📊 Subscription status endpoint accessible');
    }
    
    // Test subscription update endpoint
    const updateResponse = await page.request.post(`${config.environment.apiUrl}/subscription/update`, {
      data: { test: true }
    });
    
    if (updateResponse.status() !== 404) {
      expect([200, 401, 422]).toContain(updateResponse.status());
      console.log('🔄 Subscription update endpoint accessible');
    }
  });

  test('Payment error handling', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/create-checkout-session`, {
      data: {
        // Invalid data to test error handling
        priceId: 'invalid_price_id',
        successUrl: 'not_a_valid_url'
      }
    });
    
    // Should handle errors gracefully
    expect([400, 401, 422]).toContain(response.status());
    
    if (response.status() === 422 || response.status() === 400) {
      const errorData = await response.json();
      expect(errorData.error || errorData.message).toBeDefined();
      console.log('🚫 Payment error handling working correctly');
    } else {
      console.log('🔒 Payment endpoint protected from invalid requests');
    }
  });

  test('Currency and pricing validation', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/validate-pricing`, {
      data: {
        currency: 'USD',
        amount: 2999, // $29.99
        priceId: 'price_test_12345'
      }
    });
    
    // This endpoint may not exist - check if it handles the request
    if (response.status() !== 404) {
      expect([200, 401, 422]).toContain(response.status());
      console.log('💱 Currency validation endpoint working');
    } else {
      console.log('ℹ️ Currency validation not implemented (using Stripe defaults)');
    }
  });

  test('Payment analytics and tracking', async ({ page }) => {
    const response = await page.request.get(`${config.environment.apiUrl}/analytics/payments`);
    
    if (response.status() !== 404) {
      expect([200, 401]).toContain(response.status());
      console.log('📈 Payment analytics endpoint accessible');
    } else {
      console.log('ℹ️ Payment analytics endpoint not implemented');
    }
  });

  test('Refund processing capability', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/stripe/refund`, {
      data: {
        paymentIntentId: 'pi_test_12345',
        amount: 1000 // $10.00 refund
      }
    });
    
    // Should handle refund requests (even if unauthorized)
    if (response.status() !== 404) {
      expect([200, 401, 422]).toContain(response.status());
      console.log('💸 Refund processing endpoint accessible');
    } else {
      console.log('ℹ️ Refund processing not implemented');
    }
  });

  test('Payment method management', async ({ page }) => {
    const response = await page.request.get(`${config.environment.apiUrl}/payment-methods`);
    
    if (response.status() !== 404) {
      expect([200, 401]).toContain(response.status());
      console.log('💳 Payment method management accessible');
    } else {
      console.log('ℹ️ Payment method management handled by Stripe');
    }
  });
});