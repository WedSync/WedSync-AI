/**
 * WS-131 Pricing Strategy System - Comprehensive Playwright Tests
 * Team D Round 1 - Subscription Management Flow Testing
 * 
 * Tests the new 4-tier pricing system with AI service integration
 */

import { test, expect, Page } from '@playwright/test';

test.describe('WS-131 Pricing Strategy System', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication for testing
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', 'mock-test-token-ws131');
      (window as any).mockUser = {
        id: 'test-user-ws131',
        email: 'photographer@wedsync-test.com',
        user_metadata: { role: 'user' }
      };
    });

    // Enhanced Stripe mock for WS-131 testing
    await page.addInitScript(() => {
      (window as any).Stripe = () => ({
        confirmPayment: async () => ({ error: null }),
        elements: () => ({
          create: () => ({
            mount: () => {},
            on: () => {},
            unmount: () => {},
          }),
        }),
        createPaymentMethod: async () => ({
          paymentMethod: { id: 'pm_test_card' },
          error: null
        }),
      });
    });

    // Mock fetch for API calls
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      (window as any).fetch = async (url: string, options?: RequestInit) => {
        // Mock API responses for WS-131 endpoints
        if (url.includes('/api/billing/tiers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                billing_cycle: 'monthly',
                plans: [
                  {
                    id: 'starter',
                    tier: 'starter',
                    name: 'Starter',
                    tagline: 'Perfect for intimate weddings',
                    price: { monthly: 0, yearly: 0, currency: 'USD' },
                    limits: { guests: 100, events: 1, storage_gb: 1, team_members: 2 },
                    features: ['Guest list management', 'RSVP tracking'],
                    popular: false,
                    cta: { primary: 'Start Free', secondary: 'No credit card required' }
                  },
                  {
                    id: 'professional',
                    tier: 'professional',
                    name: 'Professional',
                    tagline: 'Most popular for medium weddings',
                    price: { monthly: 29, yearly: 290, currency: 'USD' },
                    limits: { guests: 300, events: 3, storage_gb: 10, team_members: 5 },
                    features: ['Advanced guest management', 'Analytics', 'AI Photo Processing'],
                    popular: true,
                    badge: { text: 'Most Popular', variant: 'success' },
                    cta: { primary: 'Start 14-day trial', secondary: 'Cancel anytime' }
                  },
                  {
                    id: 'premium',
                    tier: 'premium',
                    name: 'Premium',
                    tagline: 'For professional planners',
                    price: { monthly: 79, yearly: 790, currency: 'USD' },
                    limits: { guests: 1000, events: 10, storage_gb: 50, team_members: 15 },
                    features: ['Unlimited AI services', 'Advanced analytics', 'Priority support'],
                    popular: false,
                    cta: { primary: 'Upgrade to Premium', secondary: 'Full feature access' }
                  },
                  {
                    id: 'enterprise',
                    tier: 'enterprise',
                    name: 'Enterprise',
                    tagline: 'For large wedding businesses',
                    price: { monthly: 199, yearly: 1990, currency: 'USD' },
                    limits: { guests: -1, events: -1, storage_gb: -1, team_members: -1 },
                    features: ['Everything unlimited', 'Custom integrations', 'Dedicated support'],
                    popular: false,
                    cta: { primary: 'Contact Sales', secondary: 'Custom pricing available' }
                  }
                ]
              }
            })
          });
        }
        
        if (url.includes('/api/billing/subscription/upgrade')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                subscription: { id: 'sub-test-123' },
                plan: { tier: 'professional', name: 'Professional' },
                upgrade_benefits: {
                  improved_limits: ['Increased guest capacity', 'More storage'],
                  new_features: ['AI Photo Processing']
                }
              },
              message: 'Successfully upgraded to Professional'
            })
          });
        }

        if (url.includes('/api/billing/usage/ai')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              ai_services: {
                photo_processing: { current: 25, limit: 100 },
                music_recommendations: { current: 10, limit: 50 },
                floral_suggestions: { current: 5, limit: 50 },
                chatbot_interactions: { current: 100, limit: 500 }
              },
              plan: 'professional'
            })
          });
        }

        return originalFetch(url, options);
      };
    });
  });

  test.describe('1. PRICING TIERS DISPLAY', () => {
    test('should display all four pricing tiers correctly', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Wait for pricing tiers to load
      await expect(page.locator('[data-testid="pricing-tiers"]')).toBeVisible();
      
      // Check all four tiers are present
      await expect(page.locator('[data-testid="plan-starter"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-premium"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-enterprise"]')).toBeVisible();
      
      // Verify professional plan is marked as popular
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="popular-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="popular-badge"]')).toContainText('Most Popular');
    });

    test('should toggle between monthly and yearly billing correctly', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Check monthly pricing is default
      await expect(page.locator('[data-testid="billing-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="price-amount"]')).toContainText('$29');
      
      // Toggle to yearly
      await page.click('[data-testid="billing-yearly"]');
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="price-amount"]')).toContainText('$290');
      
      // Check savings display
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="savings"]')).toContainText('17% savings');
      
      // Toggle back to monthly
      await page.click('[data-testid="billing-monthly"]');
      await expect(page.locator('[data-testid="plan-professional"] [data-testid="price-amount"]')).toContainText('$29');
    });

    test('should display plan features and limits correctly', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Check starter plan features
      const starterPlan = page.locator('[data-testid="plan-starter"]');
      await expect(starterPlan.locator('[data-testid="feature-list"]')).toContainText('Guest list management');
      await expect(starterPlan.locator('[data-testid="limits"]')).toContainText('100 guests');
      
      // Check professional plan has AI features
      const professionalPlan = page.locator('[data-testid="plan-professional"]');
      await expect(professionalPlan.locator('[data-testid="feature-list"]')).toContainText('AI Photo Processing');
      await expect(professionalPlan.locator('[data-testid="limits"]')).toContainText('300 guests');
      
      // Check premium plan unlimited features
      const premiumPlan = page.locator('[data-testid="plan-premium"]');
      await expect(premiumPlan.locator('[data-testid="feature-list"]')).toContainText('Unlimited AI services');
      await expect(premiumPlan.locator('[data-testid="limits"]')).toContainText('1,000 guests');
      
      // Check enterprise plan unlimited
      const enterprisePlan = page.locator('[data-testid="plan-enterprise"]');
      await expect(enterprisePlan.locator('[data-testid="limits"]')).toContainText('Unlimited');
    });
  });

  test.describe('2. SUBSCRIPTION UPGRADE FLOW', () => {
    test('should handle upgrade from starter to professional', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Click upgrade on professional plan
      await page.click('[data-testid="plan-professional"] [data-testid="cta-primary"]');
      
      // Should redirect to checkout or show upgrade modal
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible({ timeout: 10000 });
      
      // Verify plan details in modal
      await expect(page.locator('[data-testid="upgrade-plan-name"]')).toContainText('Professional');
      await expect(page.locator('[data-testid="upgrade-price"]')).toContainText('$29');
      
      // Check upgrade benefits are displayed
      await expect(page.locator('[data-testid="upgrade-benefits"]')).toBeVisible();
      await expect(page.locator('[data-testid="benefit-ai-processing"]')).toContainText('AI Photo Processing');
    });

    test('should validate payment method during upgrade', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Start upgrade process
      await page.click('[data-testid="plan-professional"] [data-testid="cta-primary"]');
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      
      // Try to confirm without payment method
      await page.click('[data-testid="confirm-upgrade"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Payment method required');
    });

    test('should handle trial period for professional plan', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Click trial button for professional plan
      await page.click('[data-testid="plan-professional"] [data-testid="cta-primary"]');
      
      // Check trial information
      await expect(page.locator('[data-testid="trial-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="trial-info"]')).toContainText('14-day free trial');
      await expect(page.locator('[data-testid="trial-disclaimer"]')).toContainText('Cancel anytime');
    });
  });

  test.describe('3. SUBSCRIPTION DOWNGRADE FLOW', () => {
    test.beforeEach(async () => {
      // Mock user with premium subscription
      await page.addInitScript(() => {
        (window as any).mockSubscription = {
          plan_name: 'premium',
          status: 'active',
          current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        };
      });
    });

    test('should show data loss warnings when downgrading', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Click downgrade option
      await page.click('[data-testid="manage-subscription"]');
      await page.click('[data-testid="downgrade-option"]');
      
      // Select professional plan (downgrade from premium)
      await page.click('[data-testid="select-professional"]');
      
      // Should show data loss warnings
      await expect(page.locator('[data-testid="data-loss-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('may be restricted');
      
      // Should require confirmation
      await expect(page.locator('[data-testid="confirm-data-loss"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-downgrade"]')).toBeDisabled();
      
      // Check confirmation box
      await page.check('[data-testid="confirm-data-loss"]');
      await expect(page.locator('[data-testid="confirm-downgrade"]')).toBeEnabled();
    });

    test('should offer immediate vs end-of-period options', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Start downgrade process
      await page.click('[data-testid="manage-subscription"]');
      await page.click('[data-testid="downgrade-option"]');
      await page.click('[data-testid="select-professional"]');
      
      // Check timing options
      await expect(page.locator('[data-testid="downgrade-timing"]')).toBeVisible();
      await expect(page.locator('[data-testid="immediate-downgrade"]')).toBeVisible();
      await expect(page.locator('[data-testid="period-end-downgrade"]')).toBeVisible();
      
      // Default should be end of period
      await expect(page.locator('[data-testid="period-end-downgrade"]')).toBeChecked();
      
      // Show period end date
      await expect(page.locator('[data-testid="period-end-date"]')).toBeVisible();
    });
  });

  test.describe('4. AI SERVICES USAGE TRACKING', () => {
    test('should display AI usage dashboard', async () => {
      await page.goto('http://localhost:3000/billing?tab=usage');
      
      // Check AI services section
      await expect(page.locator('[data-testid="ai-services-usage"]')).toBeVisible();
      
      // Verify individual AI service tracking
      await expect(page.locator('[data-testid="photo-processing-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="music-recommendations-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="floral-suggestions-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="chatbot-interactions-usage"]')).toBeVisible();
      
      // Check usage progress bars
      await expect(page.locator('[data-testid="photo-processing-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="photo-processing-count"]')).toContainText('25 / 100');
    });

    test('should show upgrade prompts when approaching limits', async () => {
      // Mock high usage scenario
      await page.addInitScript(() => {
        (window as any).mockHighUsage = {
          photo_processing: { current: 95, limit: 100 },
          plan: 'professional'
        };
      });

      await page.goto('http://localhost:3000/billing?tab=usage');
      
      // Should show warning for high usage
      await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-warning"]')).toContainText('approaching limit');
      
      // Should show upgrade suggestion
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-to-premium"]')).toBeVisible();
    });

    test('should track AI service usage correctly', async () => {
      await page.goto('http://localhost:3000/billing?tab=usage');
      
      // Check current usage display
      await expect(page.locator('[data-testid="total-ai-usage"]')).toContainText('140'); // Sum of all services
      
      // Check individual service limits
      const photoService = page.locator('[data-testid="photo-processing-usage"]');
      await expect(photoService.locator('[data-testid="usage-percentage"]')).toContainText('25%');
      
      const musicService = page.locator('[data-testid="music-recommendations-usage"]');
      await expect(musicService.locator('[data-testid="usage-count"]')).toContainText('10 / 50');
    });
  });

  test.describe('5. BILLING CYCLE MANAGEMENT', () => {
    test('should allow switching between monthly and yearly billing', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Check current billing cycle
      await expect(page.locator('[data-testid="current-billing-cycle"]')).toContainText('Monthly');
      
      // Click change billing cycle
      await page.click('[data-testid="change-billing-cycle"]');
      
      // Should show options
      await expect(page.locator('[data-testid="billing-cycle-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="yearly-option"]')).toBeVisible();
      
      // Show savings for yearly
      await expect(page.locator('[data-testid="yearly-savings"]')).toContainText('Save 17%');
      
      // Select yearly billing
      await page.click('[data-testid="yearly-option"]');
      await page.click('[data-testid="confirm-billing-change"]');
      
      // Should update billing cycle
      await expect(page.locator('[data-testid="billing-change-success"]')).toBeVisible();
    });

    test('should show prorated charges for billing changes', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Start billing cycle change
      await page.click('[data-testid="change-billing-cycle"]');
      await page.click('[data-testid="yearly-option"]');
      
      // Should show proration details
      await expect(page.locator('[data-testid="proration-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="credit-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="charge-amount"]')).toBeVisible();
      
      // Should show next billing date
      await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
    });
  });

  test.describe('6. ERROR HANDLING AND EDGE CASES', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      await page.route('**/api/billing/**', route => {
        route.abort('failed');
      });

      await page.goto('http://localhost:3000/pricing');
      
      // Should show error state
      await expect(page.locator('[data-testid="pricing-error"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/billing/**');
      await page.click('[data-testid="retry-button"]');
      
      // Should reload pricing data
      await expect(page.locator('[data-testid="pricing-tiers"]')).toBeVisible();
    });

    test('should validate subscription limits before actions', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock limit exceeded scenario
      await page.addInitScript(() => {
        (window as any).mockLimitExceeded = true;
      });

      // Try to perform action that would exceed limits
      await page.click('[data-testid="add-team-member"]');
      
      // Should show limit exceeded message
      await expect(page.locator('[data-testid="limit-exceeded-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-required"]')).toContainText('upgrade required');
      
      // Should offer upgrade path
      await expect(page.locator('[data-testid="upgrade-now"]')).toBeVisible();
    });

    test('should handle payment failures during subscription changes', async () => {
      // Mock Stripe payment failure
      await page.addInitScript(() => {
        (window as any).Stripe = () => ({
          confirmPayment: async () => ({ 
            error: { 
              type: 'card_error',
              code: 'card_declined',
              message: 'Your card was declined.'
            } 
          }),
          elements: () => ({
            create: () => ({
              mount: () => {},
              on: () => {},
            }),
          }),
        });
      });

      await page.goto('http://localhost:3000/pricing');
      
      // Start upgrade process
      await page.click('[data-testid="plan-premium"] [data-testid="cta-primary"]');
      await page.click('[data-testid="confirm-upgrade"]');
      
      // Should show payment error
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('card was declined');
      
      // Should offer to try again
      await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
    });
  });

  test.describe('7. ACCESSIBILITY AND MOBILE RESPONSIVENESS', () => {
    test('should be accessible with keyboard navigation', async () => {
      await page.goto('http://localhost:3000/pricing');
      
      // Test tab navigation through pricing tiers
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      
      // Check focus indicators
      await expect(page.locator('[data-testid="plan-professional"]:focus-within')).toBeVisible();
      
      // Test Enter key activation
      await page.press('[data-testid="plan-professional"] [data-testid="cta-primary"]', 'Enter');
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      
      // Test Escape key to close modal
      await page.press('body', 'Escape');
      await expect(page.locator('[data-testid="upgrade-modal"]')).not.toBeVisible();
    });

    test('should work correctly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/pricing');
      
      // Check mobile layout
      await expect(page.locator('[data-testid="pricing-tiers"]')).toBeVisible();
      
      // Check mobile billing toggle
      await expect(page.locator('[data-testid="billing-toggle"]')).toBeVisible();
      
      // Test mobile upgrade flow
      await page.click('[data-testid="plan-professional"] [data-testid="cta-primary"]');
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      
      // Modal should fit mobile screen
      const modal = page.locator('[data-testid="upgrade-modal"]');
      const modalBox = await modal.boundingBox();
      expect(modalBox!.width).toBeLessThanOrEqual(375);
    });
  });
});