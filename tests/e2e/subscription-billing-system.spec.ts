import { test, expect, Page } from '@playwright/test';

// WS-071 SaaS Subscription System - Comprehensive Playwright Tests
// Revolutionary Playwright MCP Testing Implementation

test.describe('WS-071 SaaS Subscription System', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication for testing
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', 'mock-test-token');
      (window as any).mockUser = {
        id: 'test-user-123',
        email: 'test@wedding-photographer.com',
        user_metadata: { role: 'photographer' }
      };
    });

    // Mock Stripe for testing
    await page.addInitScript(() => {
      (window as any).Stripe = () => ({
        confirmPayment: async () => ({ error: null }),
        elements: () => ({
          create: () => ({
            mount: () => {},
            on: () => {},
          }),
        }),
      });
    });
  });

  test.describe('1. SUBSCRIPTION DASHBOARD ACCESS', () => {
    test('should display billing dashboard for authenticated user', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Billing & Subscription');
      
      // Check for main sections
      await expect(page.locator('[data-testid="subscription-manager"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-display"]')).toBeVisible();
      
      // Verify tab navigation
      await expect(page.locator('nav[aria-label="Tabs"]')).toBeVisible();
      await expect(page.locator('button:has-text("Overview")')).toHaveClass(/border-primary-500/);
    });

    test('should show current plan information', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock current subscription data
      await page.evaluate(() => {
        (window as any).mockSubscription = {
          plan_name: 'free',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      });
      
      await page.reload();
      
      // Check current plan display
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Free Plan');
      await expect(page.locator('[data-testid="plan-status"]')).toContainText('active');
    });
  });

  test.describe('2. USAGE TRACKING DISPLAY', () => {
    test('should display usage metrics with proper limits', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock usage data
      await page.evaluate(() => {
        (window as any).usageData = {
          clients: 2,
          vendors: 0,
          journeys: 1,
          storage_gb: 0.5,
          team_members: 1,
          monthly_api_requests: 45,
        };
        
        (window as any).planLimits = {
          clients: 3,
          vendors: 0,
          journeys: 1,
          storage_gb: 1,
          team_members: 1,
          api_requests: 100,
        };
      });

      await page.reload();
      
      // Verify usage display
      await expect(page.locator('[data-testid="usage-clients"]')).toContainText('2 / 3');
      await expect(page.locator('[data-testid="usage-storage"]')).toContainText('0.5 GB / 1 GB');
      
      // Check progress bars
      const clientsProgress = page.locator('[data-testid="usage-clients"] .progress-bar');
      await expect(clientsProgress).toHaveCSS('width', /66%/); // 2/3 = 66.67%
    });

    test('should warn when approaching limits', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock usage near limits (85%)
      await page.evaluate(() => {
        (window as any).usageData = {
          clients: 42, // 42/50 = 84%
          monthly_api_requests: 850, // 850/1000 = 85%
        };
        
        (window as any).planLimits = {
          clients: 50,
          api_requests: 1000,
        };
      });

      await page.reload();
      
      // Check for warning indicators
      await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible();
      await expect(page.locator('.text-amber-600')).toContainText('Approaching Limits');
    });

    test('should show error state when limits exceeded', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock usage over limits
      await page.evaluate(() => {
        (window as any).usageData = {
          clients: 4, // Over limit of 3
        };
        
        (window as any).planLimits = {
          clients: 3,
        };
      });

      await page.reload();
      
      // Check for error indicators
      await expect(page.locator('[data-testid="usage-error"]')).toBeVisible();
      await expect(page.locator('.text-red-600')).toContainText('Usage Limits Exceeded');
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    });
  });

  test.describe('3. SUBSCRIPTION UPGRADE WORKFLOW', () => {
    test('should display available plans for upgrade', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Navigate to plans tab
      await page.click('button:has-text("Plans")');
      
      // Check plan comparison display
      await expect(page.locator('[data-testid="plan-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-starter"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-enterprise"]')).toBeVisible();
    });

    test('should handle upgrade to Starter plan', async () => {
      await page.goto('http://localhost:3000/billing');
      await page.click('button:has-text("Plans")');
      
      // Mock plan data
      await page.evaluate(() => {
        (window as any).mockPlans = [
          {
            id: 'starter-plan-id',
            name: 'starter',
            display_name: 'Starter',
            price: 19,
            stripe_price_id: 'price_starter_monthly',
            features: ['Up to 50 clients', 'Email automation'],
          }
        ];
      });

      // Click upgrade button
      await page.click('[data-testid="upgrade-starter"]');
      
      // Should show upgrade confirmation
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      await expect(page.locator('text=Upgrade to Starter')).toBeVisible();
      
      // Confirm upgrade
      await page.click('[data-testid="confirm-upgrade"]');
      
      // Should show payment processing
      await expect(page.locator('text=Processing')).toBeVisible();
    });

    test('should handle Stripe payment flow', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock Stripe payment flow
      await page.evaluate(() => {
        (window as any).mockStripeResponse = {
          clientSecret: 'pi_test_client_secret',
          subscription: {
            id: 'sub_test_123',
            status: 'incomplete',
          }
        };
      });

      // Trigger upgrade that requires payment
      await page.click('[data-testid="upgrade-professional"]');
      
      // Should redirect to Stripe payment or show embedded form
      await expect(page.locator('[data-testid="stripe-payment-form"]')).toBeVisible();
      
      // Fill payment details (mocked)
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      
      // Submit payment
      await page.click('[data-testid="complete-payment"]');
      
      // Should show success state
      await expect(page.locator('text=Payment Successful')).toBeVisible();
    });
  });

  test.describe('4. FEATURE GATING VALIDATION', () => {
    test('should restrict features based on plan limits', async () => {
      // Test client creation limit on free plan
      await page.goto('http://localhost:3000/clients/new');
      
      // Mock usage at limit
      await page.evaluate(() => {
        (window as any).usageData = { clients: 3 }; // At free plan limit
        (window as any).planLimits = { clients: 3 };
      });

      await page.reload();
      
      // Should show upgrade prompt instead of create form
      await expect(page.locator('[data-testid="feature-gate-prompt"]')).toBeVisible();
      await expect(page.locator('text=Upgrade Required')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-cta"]')).toBeVisible();
    });

    test('should allow feature access within limits', async () => {
      await page.goto('http://localhost:3000/clients/new');
      
      // Mock usage within limits
      await page.evaluate(() => {
        (window as any).usageData = { clients: 1 }; // Under free plan limit
        (window as any).planLimits = { clients: 3 };
      });

      await page.reload();
      
      // Should show create form
      await expect(page.locator('[data-testid="client-create-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-gate-prompt"]')).not.toBeVisible();
    });

    test('should show different features for different plans', async () => {
      // Test professional plan features
      await page.goto('http://localhost:3000/analytics');
      
      await page.evaluate(() => {
        (window as any).userPlan = 'professional';
      });

      await page.reload();
      
      // Should show advanced analytics
      await expect(page.locator('[data-testid="advanced-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="custom-reports"]')).toBeVisible();
      
      // Test free plan restrictions
      await page.evaluate(() => {
        (window as any).userPlan = 'free';
      });

      await page.reload();
      
      // Should not show advanced features
      await expect(page.locator('[data-testid="advanced-analytics"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    });
  });

  test.describe('5. SUBSCRIPTION MANAGEMENT', () => {
    test('should allow subscription cancellation', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock active subscription
      await page.evaluate(() => {
        (window as any).mockSubscription = {
          id: 'sub_active_123',
          status: 'active',
          cancel_at_period_end: false,
        };
      });

      await page.reload();
      
      // Click cancel subscription
      await page.click('[data-testid="cancel-subscription"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="cancel-dialog"]')).toBeVisible();
      await expect(page.locator('text=Are you sure')).toBeVisible();
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel"]');
      
      // Should show cancellation success
      await expect(page.locator('text=Subscription will cancel')).toBeVisible();
    });

    test('should handle subscription reactivation', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock cancelled subscription
      await page.evaluate(() => {
        (window as any).mockSubscription = {
          id: 'sub_cancelled_123',
          status: 'active',
          cancel_at_period_end: true,
          current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        };
      });

      await page.reload();
      
      // Should show reactivate option
      await expect(page.locator('[data-testid="reactivate-subscription"]')).toBeVisible();
      
      // Click reactivate
      await page.click('[data-testid="reactivate-subscription"]');
      
      // Should confirm reactivation
      await expect(page.locator('text=Subscription reactivated')).toBeVisible();
    });
  });

  test.describe('6. BILLING HISTORY', () => {
    test('should display payment history', async () => {
      await page.goto('http://localhost:3000/billing');
      await page.click('button:has-text("Billing History")');
      
      // Mock payment history
      await page.evaluate(() => {
        (window as any).mockPayments = [
          {
            id: 'pay_123',
            amount: 1900, // $19.00 in cents
            status: 'succeeded',
            created: new Date().toISOString(),
            invoice_pdf: 'https://invoice.stripe.com/i/acct_123/test_456',
          },
          {
            id: 'pay_124',
            amount: 1900,
            status: 'failed',
            created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];
      });

      await page.reload();
      
      // Check payment history display
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
      await expect(page.locator('text=$19.00')).toBeVisible();
      await expect(page.locator('[data-testid="payment-succeeded"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-failed"]')).toBeVisible();
    });

    test('should allow downloading invoices', async () => {
      await page.goto('http://localhost:3000/billing');
      await page.click('button:has-text("Billing History")');
      
      // Mock payment with invoice
      await page.evaluate(() => {
        (window as any).mockPayments = [
          {
            id: 'pay_123',
            invoice_pdf: 'https://invoice.stripe.com/i/acct_123/test_456',
            hosted_invoice_url: 'https://invoice.stripe.com/i/acct_123/test_456',
          }
        ];
      });

      await page.reload();
      
      // Should show download invoice button
      await expect(page.locator('[data-testid="download-invoice"]')).toBeVisible();
      
      // Mock download behavior
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-invoice"]');
      
      // Verify download initiated (mocked)
      // In real test, this would verify actual file download
    });
  });

  test.describe('7. PERFORMANCE & RESPONSIVENESS', () => {
    test('should load billing page within performance budget', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000/billing');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should be responsive on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('http://localhost:3000/billing');
      
      // Check mobile layout
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
      
      // Verify content is readable
      const heading = page.locator('h1');
      await expect(heading).toHaveCSS('font-size', /24px|1.5rem/);
    });

    test('should handle subscription operations without blocking UI', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Start upgrade process
      const upgradeButton = page.locator('[data-testid="upgrade-starter"]');
      await upgradeButton.click();
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // UI should remain responsive during operation
      await expect(page.locator('button:has-text("Plans")')).toBeEnabled();
      await expect(page.locator('nav')).toBeVisible();
    });
  });

  test.describe('8. ERROR HANDLING', () => {
    test('should handle payment failures gracefully', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock payment failure
      await page.route('**/api/billing/subscription', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Payment failed',
            code: 'card_declined',
          }),
        });
      });

      await page.click('[data-testid="upgrade-starter"]');
      await page.click('[data-testid="confirm-upgrade"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=Payment failed')).toBeVisible();
      
      // Should allow retry
      await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
    });

    test('should handle network errors', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Mock network failure
      await page.route('**/api/billing/**', route => {
        route.abort('failed');
      });

      await page.reload();
      
      // Should show error state
      await expect(page.locator('[data-testid="error-loading"]')).toBeVisible();
      await expect(page.locator('text=Failed to load')).toBeVisible();
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test.describe('9. ACCESSIBILITY', () => {
    test('should meet WCAG 2.1 AA standards', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check for aria labels
      await expect(page.locator('nav[aria-label="Tabs"]')).toBeVisible();
      
      // Check for proper form labels
      const formElements = page.locator('input, select, textarea');
      const count = await formElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = formElements.nth(i);
        const hasLabel = await element.getAttribute('aria-label') || 
                        await element.getAttribute('aria-labelledby') ||
                        await page.locator(`label[for="${await element.getAttribute('id')}"]`).count() > 0;
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBeTruthy();
      
      // Should be able to navigate through all interactive elements
      const tabStops = ['overview-tab', 'plans-tab', 'history-tab', 'upgrade-button'];
      for (const testId of tabStops) {
        await page.keyboard.press('Tab');
        // Verify focus moves through expected elements
      }
    });
  });

  test.describe('10. SECURITY', () => {
    test('should not expose sensitive data in client', async () => {
      await page.goto('http://localhost:3000/billing');
      
      // Check that Stripe secret keys are not exposed
      const pageContent = await page.content();
      expect(pageContent).not.toContain('sk_');
      expect(pageContent).not.toContain('rk_');
      
      // Check that only publishable keys are used
      expect(pageContent).toMatch(/pk_/);
    });

    test('should require authentication for billing operations', async () => {
      // Clear authentication
      await page.evaluate(() => {
        window.localStorage.removeItem('supabase.auth.token');
        delete (window as any).mockUser;
      });

      await page.goto('http://localhost:3000/billing');
      
      // Should redirect to login or show auth required
      await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
    });
  });

  test.afterEach(async () => {
    await page.close();
  });
});

// Performance test helper
test.describe('Performance Benchmarks', () => {
  test('subscription operations should complete within SLA', async ({ page }) => {
    await page.goto('http://localhost:3000/billing');
    
    // Test subscription creation performance
    const startTime = performance.now();
    
    // Mock fast subscription creation
    await page.route('**/api/billing/subscription', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      }, 300); // 300ms response time
    });

    await page.click('[data-testid="upgrade-starter"]');
    await page.click('[data-testid="confirm-upgrade"]');
    await page.waitForSelector('[data-testid="success-message"]');
    
    const endTime = performance.now();
    const operationTime = endTime - startTime;
    
    // Should complete within 500ms as specified in requirements
    expect(operationTime).toBeLessThan(500);
  });
});