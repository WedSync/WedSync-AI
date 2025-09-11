import { test, expect } from '@playwright/test';

test.describe('Payment Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/login');
    
    // Login with test credentials
    await page.fill('[data-testid="email-input"]', 'test@wedsync.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('/dashboard');
  });

  test('Payment field integration with Stripe Elements', async ({ page }) => {
    // Navigate to payment page
    await page.goto('/payments/create');
    
    // Wait for payment form to load
    await page.waitForSelector('[data-testid="payment-form"]');
    
    // Check that Stripe Elements loaded
    await expect(page.locator('#card-element')).toBeVisible();
    
    // Fill payment amount
    await page.fill('[data-testid="amount-input"]', '150.00');
    
    // Fill card details using Stripe test card
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    // Verify card validation
    await expect(page.locator('[data-testid="card-errors"]')).toBeEmpty();
    
    // Verify pay button is enabled
    await expect(page.locator('[data-testid="pay-button"]')).toBeEnabled();
  });

  test('Complete payment process end-to-end', async ({ page }) => {
    // Navigate to payment form
    await page.goto('/payments/create?amount=100.00');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="payment-form"]');
    
    // Fill card information
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    // Submit payment
    await page.click('[data-testid="pay-button"]');
    
    // Wait for processing state
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="pay-button"]')).toHaveText('Processing...');
    
    // Wait for payment success
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="payment-success"]')).toContainText('Payment successful');
    
    // Verify payment appears in history
    await page.goto('/payments/history');
    await expect(page.locator('[data-testid="payment-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="payment-amount"]').first()).toContainText('$100.00');
  });

  test('Payment failure handling', async ({ page }) => {
    // Navigate to payment form
    await page.goto('/payments/create?amount=50.00');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="payment-form"]');
    
    // Use card that will be declined
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000000000000002');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    // Submit payment
    await page.click('[data-testid="pay-button"]');
    
    // Wait for error message
    await page.waitForSelector('[data-testid="payment-error"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Your card was declined');
    
    // Verify button is re-enabled for retry
    await expect(page.locator('[data-testid="pay-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="pay-button"]')).toHaveText(/Pay \$50\.00/);
  });

  test('Invoice generation and download', async ({ page }) => {
    // Complete a payment first
    await page.goto('/payments/create?amount=200.00');
    await page.waitForSelector('[data-testid="payment-form"]');
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    await page.click('[data-testid="pay-button"]');
    await page.waitForSelector('[data-testid="payment-success"]');
    
    // Navigate to invoices
    await page.goto('/invoices');
    
    // Create invoice for payment
    await page.click('[data-testid="create-invoice-button"]');
    
    // Fill invoice details
    await page.fill('[data-testid="invoice-description"]', 'Wedding Photography Service');
    await page.fill('[data-testid="invoice-amount"]', '200.00');
    
    // Generate invoice
    await page.click('[data-testid="generate-invoice-button"]');
    
    // Wait for invoice creation
    await page.waitForSelector('[data-testid="invoice-generated"]');
    await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible();
    
    // Download invoice PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-invoice-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/^WS-\d{4}-\d{6}\.pdf$/);
  });

  test('Payment plan creation and management', async ({ page }) => {
    // Navigate to payment plans
    await page.goto('/payment-plans/create');
    
    // Fill payment plan details
    await page.fill('[data-testid="total-amount"]', '1500.00');
    await page.selectOption('[data-testid="installments"]', '3');
    await page.selectOption('[data-testid="interval"]', 'monthly');
    await page.fill('[data-testid="plan-description"]', 'Wedding Service Payment Plan');
    
    // Create payment plan
    await page.click('[data-testid="create-plan-button"]');
    
    // Wait for plan creation
    await page.waitForSelector('[data-testid="plan-created"]');
    
    // Verify plan details
    await expect(page.locator('[data-testid="plan-total"]')).toContainText('$1,500.00');
    await expect(page.locator('[data-testid="plan-installments"]')).toContainText('3 payments of $500.00');
    
    // View installment schedule
    await page.click('[data-testid="view-schedule-button"]');
    await expect(page.locator('[data-testid="installment-row"]')).toHaveCount(3);
    
    // Check first installment details
    const firstInstallment = page.locator('[data-testid="installment-row"]').first();
    await expect(firstInstallment.locator('[data-testid="installment-amount"]')).toContainText('$500.00');
    await expect(firstInstallment.locator('[data-testid="installment-status"]')).toContainText('Pending');
  });

  test('Payment status tracking real-time updates', async ({ page }) => {
    // Navigate to payment status page
    await page.goto('/payments/status');
    
    // Create a new payment
    await page.click('[data-testid="new-payment-button"]');
    await page.fill('[data-testid="amount-input"]', '75.00');
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    // Start payment
    await page.click('[data-testid="pay-button"]');
    
    // Monitor status changes
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('Processing payment...');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="payment-completed"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('Payment successful');
    await expect(page.locator('[data-testid="transaction-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('$75.00');
  });

  test('Payment method management', async ({ page }) => {
    // Navigate to payment methods
    await page.goto('/settings/payment-methods');
    
    // Add new payment method
    await page.click('[data-testid="add-payment-method-button"]');
    
    // Fill card details
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000056655665556');
    await cardElement.locator('[name="exp-date"]').fill('12/25');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    // Save payment method
    await page.click('[data-testid="save-payment-method-button"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="payment-method-added"]');
    
    // Verify payment method appears in list
    await expect(page.locator('[data-testid="payment-method-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-info"]')).toContainText('•••• 5556');
    
    // Set as default
    await page.click('[data-testid="set-default-button"]');
    await expect(page.locator('[data-testid="default-badge"]')).toBeVisible();
    
    // Delete payment method
    await page.click('[data-testid="delete-payment-method-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify removal
    await expect(page.locator('[data-testid="payment-method-card"]')).not.toBeVisible();
  });

  test('Refund request and processing', async ({ page }) => {
    // First complete a payment
    await page.goto('/payments/create?amount=100.00');
    await page.waitForSelector('[data-testid="payment-form"]');
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    await page.click('[data-testid="pay-button"]');
    await page.waitForSelector('[data-testid="payment-success"]');
    
    // Navigate to payment history
    await page.goto('/payments/history');
    
    // Request refund
    await page.click('[data-testid="refund-button"]');
    await page.fill('[data-testid="refund-amount"]', '50.00');
    await page.fill('[data-testid="refund-reason"]', 'Partial refund requested by customer');
    
    // Submit refund request
    await page.click('[data-testid="submit-refund-button"]');
    
    // Wait for refund processing
    await page.waitForSelector('[data-testid="refund-submitted"]');
    await expect(page.locator('[data-testid="refund-status"]')).toContainText('Refund pending');
    
    // Check refund appears in list
    await page.goto('/refunds');
    await expect(page.locator('[data-testid="refund-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="refund-amount"]').first()).toContainText('$50.00');
  });

  test('Payment analytics dashboard', async ({ page }) => {
    // Navigate to analytics
    await page.goto('/analytics/payments');
    
    // Wait for charts to load
    await page.waitForSelector('[data-testid="revenue-chart"]');
    await page.waitForSelector('[data-testid="payment-metrics"]');
    
    // Verify metrics are displayed
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="successful-payments"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-success-rate"]')).toBeVisible();
    
    // Test date range filter
    await page.selectOption('[data-testid="date-range"]', 'last_30_days');
    await page.waitForSelector('[data-testid="analytics-updated"]');
    
    // Verify chart updates
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    
    // Export analytics
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-analytics-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/payment-analytics-.*\.csv$/);
  });

  test('Security and PCI compliance validation', async ({ page }) => {
    // Navigate to payment form
    await page.goto('/payments/create');
    
    // Verify HTTPS
    expect(page.url()).toMatch(/^https:/);
    
    // Check CSP headers
    const response = await page.goto('/payments/create');
    const cspHeader = response?.headers()['content-security-policy'];
    expect(cspHeader).toContain('https://js.stripe.com');
    
    // Verify no card data in DOM
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    
    // Check that card number is not visible in page source
    const pageContent = await page.content();
    expect(pageContent).not.toContain('4242424242424242');
    
    // Verify Stripe iframe isolation
    await expect(page.locator('iframe[name^="__privateStripeFrame"]')).toBeVisible();
    
    // Check no sensitive data in network requests
    page.on('request', request => {
      const postData = request.postData();
      if (postData) {
        expect(postData).not.toContain('4242424242424242');
      }
    });
  });
});

test.describe('Payment Error Scenarios', () => {
  test('Insufficient funds error handling', async ({ page }) => {
    await page.goto('/payments/create?amount=100.00');
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000000000000341');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    await page.click('[data-testid="pay-button"]');
    
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('insufficient funds');
  });

  test('Expired card error handling', async ({ page }) => {
    await page.goto('/payments/create?amount=100.00');
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000000000000069');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    await page.click('[data-testid="pay-button"]');
    
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('expired');
  });

  test('Network error recovery', async ({ page }) => {
    await page.goto('/payments/create?amount=100.00');
    
    // Simulate network failure
    await page.route('**/api/stripe/**', route => route.abort());
    
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/28');
    await cardElement.locator('[name="cvc"]').fill('123');
    
    await page.click('[data-testid="pay-button"]');
    
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('network error');
    
    // Restore network and retry
    await page.unroute('**/api/stripe/**');
    await page.click('[data-testid="retry-payment-button"]');
    
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
  });
});