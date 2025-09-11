/**
 * WS-165 Payment Calendar E2E Testing Suite
 * Team E - Round 1 Implementation
 * 
 * End-to-end tests using Playwright for complete user workflows:
 * - User authentication and authorization
 * - Payment calendar navigation and interaction
 * - Payment creation, editing, and deletion
 * - Mobile responsiveness and touch interactions
 * - Visual regression testing
 * - Performance and accessibility validation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  mockPaymentData,
  mockPaymentSummary,
  testUtils,
  MOCK_WEDDING_ID,
  MOCK_USER_ID 
} from '@/tests/payments/fixtures/payment-fixtures';

// Test configuration constants
const TEST_TIMEOUT = 30000;
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Authentication helper
async function authenticateUser(page: Page) {
  await page.goto('/auth/signin');
  await page.fill('[data-testid="email-input"]', 'test@wedsync.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.click('[data-testid="signin-button"]');
  await page.waitForURL('/dashboard');
}

// Navigation helper
async function navigateToPaymentCalendar(page: Page) {
  await page.click('[data-testid="payments-nav-link"]');
  await page.waitForURL('/payments/calendar');
  await page.waitForSelector('[data-testid="payment-calendar"]');
}

// Setup test data
async function setupTestPayments(page: Page) {
  // Mock API responses for consistent testing
  await page.route('**/api/payments**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === 'GET' && url.pathname === '/api/payments') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payments: mockPaymentData,
          summary: mockPaymentSummary,
        }),
      });
    } else if (method === 'POST' && url.pathname === '/api/payments') {
      const newPayment = testUtils.createPayment({
        wedding_id: MOCK_WEDDING_ID,
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          payment: newPayment,
          message: 'Payment created successfully',
        }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Payment Calendar E2E Tests - WS-165', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPayments(page);
  });

  /**
   * AUTHENTICATION AND AUTHORIZATION TESTS
   */
  test.describe('Authentication and Authorization', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/payments/calendar');
      await page.waitForURL('/auth/signin');
      
      expect(page.url()).toContain('/auth/signin');
      await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
    });

    test('allows authenticated users to access payment calendar', async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-summary"]')).toBeVisible();
    });

    test('enforces wedding-specific payment access', async ({ page }) => {
      await authenticateUser(page);
      
      // Try to access another wedding's payments
      await page.goto(`/payments/calendar?wedding_id=unauthorized-wedding-id`);
      
      await expect(page.locator('[data-testid="access-denied-message"]')).toBeVisible();
      await expect(page.locator('text=Access denied')).toBeVisible();
    });
  });

  /**
   * PAYMENT CALENDAR NAVIGATION TESTS
   */
  test.describe('Payment Calendar Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
    });

    test('displays current month calendar correctly', async ({ page }) => {
      // Verify calendar structure
      await expect(page.locator('[role="grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-month-header"]')).toBeVisible();
      
      // Verify day names header
      const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const day of dayHeaders) {
        await expect(page.locator(`text=${day}`)).toBeVisible();
      }
      
      // Verify date cells
      const dateCells = page.locator('[role="gridcell"]');
      await expect(dateCells.first()).toBeVisible();
    });

    test('navigates between months using arrow buttons', async ({ page }) => {
      const currentMonth = await page.locator('[data-testid="current-month-header"]').textContent();
      
      // Navigate to next month
      await page.click('[data-testid="next-month-button"]');
      await page.waitForTimeout(500); // Allow animation to complete
      
      const nextMonth = await page.locator('[data-testid="current-month-header"]').textContent();
      expect(nextMonth).not.toBe(currentMonth);
      
      // Navigate back to previous month
      await page.click('[data-testid="prev-month-button"]');
      await page.waitForTimeout(500);
      
      const backToOriginal = await page.locator('[data-testid="current-month-header"]').textContent();
      expect(backToOriginal).toBe(currentMonth);
    });

    test('highlights dates with payments', async ({ page }) => {
      // Check that dates with payments have special styling
      const paymentDates = page.locator('[data-has-payments="true"]');
      await expect(paymentDates.first()).toBeVisible();
      
      // Verify payment indicators
      const paymentIndicators = page.locator('[data-testid="payment-indicator"]');
      const count = await paymentIndicators.count();
      expect(count).toBeGreaterThan(0);
    });

    test('displays payment details on date selection', async ({ page }) => {
      // Click on a date with payments
      await page.click('[data-has-payments="true"]');
      
      // Verify payment details panel opens
      await expect(page.locator('[data-testid="payment-details-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-list"]')).toBeVisible();
      
      // Verify payment information is displayed
      await expect(page.locator('[data-testid^="payment-item-"]').first()).toBeVisible();
    });
  });

  /**
   * PAYMENT MANAGEMENT TESTS
   */
  test.describe('Payment Management', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
    });

    test('creates new payment successfully', async ({ page }) => {
      // Open payment creation modal
      await page.click('[data-testid="add-payment-button"]');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Fill payment form
      await page.fill('[data-testid="vendor-name-input"]', 'E2E Test Vendor');
      await page.fill('[data-testid="amount-input"]', '1500.00');
      await page.fill('[data-testid="due-date-input"]', '2025-04-15');
      await page.selectOption('[data-testid="category-select"]', 'Testing');
      await page.selectOption('[data-testid="priority-select"]', 'medium');
      await page.fill('[data-testid="description-input"]', 'E2E test payment creation');
      
      // Submit form
      await page.click('[data-testid="save-payment-button"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('text=Payment created successfully')).toBeVisible();
      
      // Verify payment appears in calendar
      await expect(page.locator('text=E2E Test Vendor')).toBeVisible();
    });

    test('validates payment form input', async ({ page }) => {
      await page.click('[data-testid="add-payment-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="save-payment-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="vendor-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="due-date-error"]')).toBeVisible();
      
      // Test invalid amount
      await page.fill('[data-testid="amount-input"]', '-100');
      await page.click('[data-testid="save-payment-button"]');
      
      await expect(page.locator('text=Amount must be positive')).toBeVisible();
    });

    test('updates payment status', async ({ page }) => {
      // Find a pending payment
      const pendingPayment = page.locator('[data-status="pending"]').first();
      await pendingPayment.click();
      
      // Open payment details
      await expect(page.locator('[data-testid="payment-details-panel"]')).toBeVisible();
      
      // Update status to paid
      await page.click('[data-testid="status-dropdown"]');
      await page.click('[data-testid="status-paid"]');
      
      // Confirm update
      await page.click('[data-testid="confirm-status-update"]');
      
      // Verify success message
      await expect(page.locator('text=Payment status updated')).toBeVisible();
      
      // Verify visual status change
      await expect(pendingPayment.locator('[data-status="paid"]')).toBeVisible();
    });

    test('edits existing payment', async ({ page }) => {
      // Click on an existing payment
      await page.click('[data-testid^="payment-item-"]');
      await page.click('[data-testid="edit-payment-button"]');
      
      // Verify edit modal opens with existing data
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-name-input"]')).toHaveValue(/\S+/);
      
      // Update payment details
      await page.fill('[data-testid="vendor-name-input"]', 'Updated Vendor Name');
      await page.fill('[data-testid="amount-input"]', '2000.00');
      
      // Save changes
      await page.click('[data-testid="save-payment-button"]');
      
      // Verify update
      await expect(page.locator('text=Payment updated successfully')).toBeVisible();
      await expect(page.locator('text=Updated Vendor Name')).toBeVisible();
    });

    test('deletes payment with confirmation', async ({ page }) => {
      // Click on a payment to select it
      await page.click('[data-testid^="payment-item-"]');
      
      // Click delete button
      await page.click('[data-testid="delete-payment-button"]');
      
      // Verify confirmation dialog
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to delete this payment?')).toBeVisible();
      
      // Cancel first
      await page.click('[data-testid="cancel-delete-button"]');
      await expect(page.locator('[role="alertdialog"]')).toBeHidden();
      
      // Try delete again and confirm
      await page.click('[data-testid="delete-payment-button"]');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify deletion
      await expect(page.locator('text=Payment deleted successfully')).toBeVisible();
    });
  });

  /**
   * FILTERING AND SEARCH TESTS
   */
  test.describe('Filtering and Search', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
    });

    test('filters payments by status', async ({ page }) => {
      // Open filter dropdown
      await page.click('[data-testid="filter-dropdown"]');
      
      // Select 'overdue' filter
      await page.click('[data-testid="filter-overdue"]');
      
      // Verify only overdue payments are shown
      const visiblePayments = page.locator('[data-testid^="payment-item-"]');
      const count = await visiblePayments.count();
      
      for (let i = 0; i < count; i++) {
        await expect(visiblePayments.nth(i)).toHaveAttribute('data-status', 'overdue');
      }
      
      // Verify filter indicator
      await expect(page.locator('[data-testid="active-filter-overdue"]')).toBeVisible();
    });

    test('searches payments by vendor name', async ({ page }) => {
      const searchTerm = 'Elegant';
      
      // Enter search term
      await page.fill('[data-testid="payment-search-input"]', searchTerm);
      await page.waitForTimeout(500); // Wait for debounce
      
      // Verify filtered results
      const searchResults = page.locator('[data-testid^="payment-item-"]');
      const count = await searchResults.count();
      
      for (let i = 0; i < count; i++) {
        const vendorText = await searchResults.nth(i).locator('[data-testid="vendor-name"]').textContent();
        expect(vendorText?.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('sorts payments by different criteria', async ({ page }) => {
      // Open sort dropdown
      await page.click('[data-testid="sort-dropdown"]');
      
      // Sort by amount (ascending)
      await page.click('[data-testid="sort-amount-asc"]');
      
      // Verify sorting
      const paymentAmounts = page.locator('[data-testid="payment-amount"]');
      const amountTexts = await paymentAmounts.allTextContents();
      
      const amounts = amountTexts.map(text => 
        parseFloat(text.replace(/[$,]/g, ''))
      );
      
      // Check if sorted in ascending order
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
      }
    });

    test('combines multiple filters', async ({ page }) => {
      // Apply status filter
      await page.click('[data-testid="filter-dropdown"]');
      await page.click('[data-testid="filter-pending"]');
      
      // Apply category filter
      await page.click('[data-testid="category-filter-dropdown"]');
      await page.click('[data-testid="category-filter-venue"]');
      
      // Apply search
      await page.fill('[data-testid="payment-search-input"]', 'Elegant');
      await page.waitForTimeout(500);
      
      // Verify combined filtering
      const filteredPayments = page.locator('[data-testid^="payment-item-"]');
      const count = await filteredPayments.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(filteredPayments.nth(i)).toHaveAttribute('data-status', 'pending');
          await expect(filteredPayments.nth(i)).toHaveAttribute('data-category', 'venue');
        }
      }
    });
  });

  /**
   * MOBILE RESPONSIVENESS TESTS
   */
  test.describe('Mobile Responsiveness', () => {
    test('displays mobile-optimized layout', async ({ browser }) => {
      const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
      const page = await context.newPage();
      
      await setupTestPayments(page);
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      // Verify mobile layout elements
      await expect(page.locator('[data-testid="mobile-calendar-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Verify touch-friendly buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const boundingBox = await button.boundingBox();
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44); // 44px minimum touch target
        }
      }
      
      await context.close();
    });

    test('handles swipe gestures for navigation', async ({ browser }) => {
      const context = await browser.newContext({ 
        viewport: MOBILE_VIEWPORT,
        hasTouch: true 
      });
      const page = await context.newPage();
      
      await setupTestPayments(page);
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      const calendar = page.locator('[data-testid="payment-calendar"]');
      const currentMonth = await page.locator('[data-testid="current-month-header"]').textContent();
      
      // Perform swipe left gesture (next month)
      await calendar.hover();
      await page.mouse.down();
      await page.mouse.move(-200, 0);
      await page.mouse.up();
      
      // Wait for transition
      await page.waitForTimeout(500);
      
      // Verify month changed
      const newMonth = await page.locator('[data-testid="current-month-header"]').textContent();
      expect(newMonth).not.toBe(currentMonth);
      
      await context.close();
    });

    test('adapts to tablet layout', async ({ browser }) => {
      const context = await browser.newContext({ viewport: TABLET_VIEWPORT });
      const page = await context.newPage();
      
      await setupTestPayments(page);
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      // Verify tablet-specific layout
      await expect(page.locator('[data-testid="tablet-side-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="expanded-calendar-view"]')).toBeVisible();
      
      await context.close();
    });
  });

  /**
   * ACCESSIBILITY TESTS
   */
  test.describe('Accessibility Compliance', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
    });

    test('supports keyboard navigation', async ({ page }) => {
      // Focus on calendar
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="grid"]')).toBeFocused();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Should open payment details
      await expect(page.locator('[data-testid="payment-details-panel"]')).toBeVisible();
    });

    test('provides proper ARIA labels', async ({ page }) => {
      // Check calendar has proper ARIA attributes
      await expect(page.locator('[role="grid"]')).toHaveAttribute('aria-label');
      
      // Check payment items have labels
      const paymentItems = page.locator('[data-testid^="payment-item-"]');
      const count = await paymentItems.count();
      
      for (let i = 0; i < count; i++) {
        await expect(paymentItems.nth(i)).toHaveAttribute('aria-label');
      }
    });

    test('announces screen reader updates', async ({ page }) => {
      // Check for live regions
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Create a payment to test announcements
      await page.click('[data-testid="add-payment-button"]');
      await page.fill('[data-testid="vendor-name-input"]', 'Screen Reader Test');
      await page.fill('[data-testid="amount-input"]', '1000.00');
      await page.fill('[data-testid="due-date-input"]', '2025-04-20');
      await page.click('[data-testid="save-payment-button"]');
      
      // Verify announcement region gets updated
      await expect(page.locator('[aria-live="polite"]')).toContainText('Payment created');
    });

    test('maintains focus management', async ({ page }) => {
      // Open modal
      await page.click('[data-testid="add-payment-button"]');
      
      // Focus should be trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeFocused();
      
      // Tab through modal elements
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      
      // Focus should return to trigger button
      await expect(page.locator('[data-testid="add-payment-button"]')).toBeFocused();
    });
  });

  /**
   * PERFORMANCE TESTS
   */
  test.describe('Performance Validation', () => {
    test('loads payment calendar within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      // Wait for calendar to be fully loaded
      await page.waitForSelector('[data-testid="payment-calendar"]');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('handles large payment datasets smoothly', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/payments**', async (route) => {
        const largeDataset = testUtils.createPayments(200, {
          wedding_id: MOCK_WEDDING_ID,
        });
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            payments: largeDataset,
            summary: testUtils.calculateSummary(largeDataset),
          }),
        });
      });
      
      await authenticateUser(page);
      const startTime = Date.now();
      await navigateToPaymentCalendar(page);
      
      // Should still render efficiently
      await page.waitForSelector('[data-testid="payment-calendar"]');
      const renderTime = Date.now() - startTime;
      
      expect(renderTime).toBeLessThan(5000); // 5 second budget for 200 payments
    });

    test('maintains smooth scroll performance', async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      // Scroll through payment list
      const scrollContainer = page.locator('[data-testid="payment-list-container"]');
      
      // Perform rapid scrolling
      for (let i = 0; i < 10; i++) {
        await scrollContainer.evaluate(el => el.scrollTop += 100);
        await page.waitForTimeout(50);
      }
      
      // Should maintain smooth scrolling without lag
      const finalScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
      expect(finalScrollTop).toBeGreaterThan(500);
    });
  });

  /**
   * VISUAL REGRESSION TESTS
   */
  test.describe('Visual Regression', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
    });

    test('matches payment calendar visual baseline', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of full calendar
      await expect(page.locator('[data-testid="payment-calendar"]')).toHaveScreenshot('payment-calendar-baseline.png');
    });

    test('matches payment details panel visual baseline', async ({ page }) => {
      // Open payment details
      await page.click('[data-testid^="payment-item-"]');
      await page.waitForSelector('[data-testid="payment-details-panel"]');
      
      // Take screenshot of details panel
      await expect(page.locator('[data-testid="payment-details-panel"]')).toHaveScreenshot('payment-details-panel-baseline.png');
    });

    test('matches mobile layout visual baseline', async ({ browser }) => {
      const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
      const page = await context.newPage();
      
      await setupTestPayments(page);
      await authenticateUser(page);
      await navigateToPaymentCalendar(page);
      
      await page.waitForLoadState('networkidle');
      
      // Take mobile screenshot
      await expect(page.locator('[data-testid="mobile-calendar-view"]')).toHaveScreenshot('mobile-calendar-baseline.png');
      
      await context.close();
    });

    test('matches different payment status states', async ({ page }) => {
      // Test each status state
      const statuses = ['pending', 'due-soon', 'overdue', 'paid'];
      
      for (const status of statuses) {
        // Filter by status
        await page.click('[data-testid="filter-dropdown"]');
        await page.click(`[data-testid="filter-${status}"]`);
        await page.waitForTimeout(500);
        
        // Take screenshot
        await expect(page.locator('[data-testid="payment-list"]')).toHaveScreenshot(`payment-status-${status}-baseline.png`);
      }
    });
  });
});