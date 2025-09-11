/**
 * Payment Test Helpers - WS-167 Round 2
 * Utilities for testing payment flows and Stripe integration
 */

import { Page } from '@playwright/test';

interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvc: string;
  name: string;
  email: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export class PaymentTestHelpers {
  
  async mockStripeElements(page: Page) {
    // Mock Stripe Elements for testing
    await page.addInitScript(() => {
      // @ts-ignore
      window.Stripe = () => {
        return {
          elements: () => ({
            create: () => ({
              mount: () => {},
              on: (event: string, callback: Function) => {
                if (event === 'ready') callback();
              },
              update: () => {},
              destroy: () => {}
            }),
            submit: () => Promise.resolve({})
          }),
          createPaymentMethod: () => Promise.resolve({
            paymentMethod: {
              id: 'pm_test_123',
              type: 'card',
              card: { brand: 'visa', last4: '4242' }
            }
          }),
          confirmCardPayment: () => Promise.resolve({
            paymentIntent: {
              id: 'pi_test_123',
              status: 'succeeded'
            }
          })
        };
      };
    });
  }

  async fillPaymentForm(page: Page, details: PaymentDetails) {
    // Mock Stripe Elements first
    await this.mockStripeElements(page);
    
    // Fill billing information
    await page.fill('[data-testid="billing-name"]', details.name);
    await page.fill('[data-testid="billing-email"]', details.email);
    
    if (details.address) {
      await page.fill('[data-testid="billing-address-line1"]', details.address.line1 || '123 Test St');
      await page.fill('[data-testid="billing-city"]', details.address.city || 'Test City');
      await page.fill('[data-testid="billing-state"]', details.address.state || 'CA');
      await page.fill('[data-testid="billing-postal-code"]', details.address.postal_code || '12345');
      if (details.address.country) {
        await page.selectOption('[data-testid="billing-country"]', details.address.country);
      }
    }
    
    // Handle Stripe Elements (mocked)
    await page.evaluate((cardDetails) => {
      // Simulate filling Stripe card element
      const cardNumberElement = document.querySelector('[data-testid="stripe-card-number"]');
      if (cardNumberElement) {
        cardNumberElement.setAttribute('data-card-filled', 'true');
        cardNumberElement.setAttribute('data-card-number', cardDetails.cardNumber);
      }
      
      const expiryElement = document.querySelector('[data-testid="stripe-card-expiry"]');
      if (expiryElement) {
        expiryElement.setAttribute('data-expiry-filled', 'true');
        expiryElement.setAttribute('data-expiry', cardDetails.expiry);
      }
      
      const cvcElement = document.querySelector('[data-testid="stripe-card-cvc"]');
      if (cvcElement) {
        cvcElement.setAttribute('data-cvc-filled', 'true');
        cvcElement.setAttribute('data-cvc', cardDetails.cvc);
      }
    }, details);
  }

  async selectPlan(page: Page, planType: 'starter' | 'professional' | 'enterprise') {
    await page.click(`[data-testid="plan-${planType}"]`);
    
    // Verify plan selection
    await page.waitForSelector(`[data-testid="selected-plan"][data-plan="${planType}"]`);
    
    // Get plan details for verification
    const planDetails = await page.evaluate((plan) => {
      const element = document.querySelector(`[data-testid="plan-${plan}"]`);
      return {
        name: element?.getAttribute('data-plan-name'),
        price: element?.getAttribute('data-plan-price'),
        interval: element?.getAttribute('data-plan-interval')
      };
    }, planType);
    
    return planDetails;
  }

  async processPayment(page: Page) {
    // Mock the payment processing
    await page.route('/api/billing/create-subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          subscriptionId: 'sub_test_' + Date.now(),
          paymentMethodId: 'pm_test_123',
          clientSecret: 'pi_test_123_secret',
          status: 'active'
        })
      });
    });

    // Click payment button and wait for processing
    const [response] = await Promise.all([
      page.waitForResponse('/api/billing/create-subscription'),
      page.click('[data-testid="complete-payment"]')
    ]);

    return await response.json();
  }

  async simulatePaymentFailure(page: Page, errorType: 'card_declined' | 'insufficient_funds' | 'processing_error' = 'card_declined') {
    await page.route('/api/billing/create-subscription', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            type: errorType,
            code: errorType === 'card_declined' ? 'card_declined' : 'payment_failed',
            message: this.getErrorMessage(errorType)
          }
        })
      });
    });

    await page.click('[data-testid="complete-payment"]');
    
    // Wait for error to display
    await page.waitForSelector('[data-testid="payment-error"]');
  }

  private getErrorMessage(errorType: string): string {
    const messages = {
      'card_declined': 'Your card was declined. Please try a different payment method.',
      'insufficient_funds': 'Your card has insufficient funds. Please try a different payment method.',
      'processing_error': 'There was an error processing your payment. Please try again.'
    };
    return messages[errorType as keyof typeof messages] || 'Payment failed. Please try again.';
  }

  async verifySubscriptionActive(page: Page) {
    // Check subscription status in UI
    await page.goto('/dashboard/billing');
    await page.waitForSelector('[data-testid="subscription-status"]');
    
    const status = await page.locator('[data-testid="subscription-status"]').textContent();
    const plan = await page.locator('[data-testid="current-plan"]').textContent();
    
    return { status, plan };
  }

  async testPaymentMethodUpdate(page: Page, newCardDetails: PaymentDetails) {
    await page.goto('/dashboard/billing');
    await page.click('[data-testid="update-payment-method"]');
    
    // Fill new payment details
    await this.fillPaymentForm(page, newCardDetails);
    
    // Mock the update API
    await page.route('/api/billing/update-payment-method', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentMethod: {
            id: 'pm_new_test_123',
            card: {
              brand: 'visa',
              last4: newCardDetails.cardNumber.slice(-4)
            }
          }
        })
      });
    });
    
    await page.click('[data-testid="save-payment-method"]');
    await page.waitForSelector('[data-testid="payment-method-updated"]');
  }

  async testSubscriptionCancellation(page: Page) {
    await page.goto('/dashboard/billing');
    await page.click('[data-testid="cancel-subscription"]');
    
    // Fill cancellation survey
    await page.selectOption('[data-testid="cancellation-reason"]', 'too_expensive');
    await page.fill('[data-testid="feedback"]', 'Test cancellation feedback');
    
    // Mock cancellation API
    await page.route('/api/billing/cancel-subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cancellationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });
    
    await page.click('[data-testid="confirm-cancellation"]');
    await page.waitForSelector('[data-testid="cancellation-confirmed"]');
  }

  async generateInvoiceTestData() {
    return {
      invoiceId: 'inv_test_' + Date.now(),
      amount: 9900, // $99.00 in cents
      currency: 'usd',
      status: 'paid',
      created: Math.floor(Date.now() / 1000),
      dueDate: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      lineItems: [
        {
          description: 'Professional Plan - Monthly',
          amount: 9900,
          quantity: 1
        }
      ]
    };
  }

  async mockWebhookEvent(page: Page, eventType: string, data: any) {
    // Mock Stripe webhook for testing
    await page.route('/api/webhooks/stripe', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ received: true })
        });
      }
    });
    
    // Simulate webhook call
    await page.evaluate(async (webhookData) => {
      await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature'
        },
        body: JSON.stringify(webhookData)
      });
    }, {
      type: eventType,
      data: { object: data },
      created: Math.floor(Date.now() / 1000)
    });
  }
}