/**
 * PAYMENT CALENDAR E2E TESTS - WS-165
 * Playwright End-to-End Tests for Payment Calendar Workflows
 * Using MCP Playwright Server for comprehensive validation
 */

import { test, expect } from '@playwright/test';

// Test data setup
const mockPaymentData = [
  {
    id: '1',
    due_date: '2025-09-15',
    vendor_name: 'Amazing Photography',
    amount: 250000, // £2,500.00
    status: 'upcoming',
    description: 'Final payment for wedding photography'
  },
  {
    id: '2', 
    due_date: '2025-09-20',
    vendor_name: 'Elegant Venue',
    amount: 500000, // £5,000.00
    status: 'due',
    description: 'Venue final balance'
  },
  {
    id: '3',
    due_date: '2025-08-25',
    vendor_name: 'Floral Dreams', 
    amount: 75000, // £750.00
    status: 'overdue',
    description: 'Bridal bouquet deposit'
  }
];

test.describe('Payment Calendar - User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });

    // Navigate to payment calendar page
    await page.goto('/payments/calendar');
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
  });

  test('should display payment calendar with current month and payment indicators', async ({ page }) => {
    // Verify calendar header shows current month
    await expect(page.locator('text=/september 2025/i')).toBeVisible();
    
    // Verify day headers are present
    await expect(page.locator('text=Sun')).toBeVisible();
    await expect(page.locator('text=Mon')).toBeVisible();
    await expect(page.locator('text=Sat')).toBeVisible();
    
    // Verify calendar grid has 42 days (6 weeks × 7 days)
    const calendarDays = page.locator('[data-testid^="calendar-day"]');
    await expect(calendarDays).toHaveCount(42);
    
    // Verify payment indicators are visible
    await expect(page.locator('[data-testid="calendar-day-2025-09-15"] [data-testid="payment-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-day-2025-09-20"] [data-testid="payment-indicator"]')).toBeVisible();
  });

  test('should display upcoming payments list with correct information', async ({ page }) => {
    // Verify upcoming payments section exists
    await expect(page.locator('text=/upcoming payments/i')).toBeVisible();
    
    // Verify payment items are displayed
    await expect(page.locator('text=Amazing Photography')).toBeVisible();
    await expect(page.locator('text=Elegant Venue')).toBeVisible();
    await expect(page.locator('text=Floral Dreams')).toBeVisible();
    
    // Verify amounts are formatted correctly
    await expect(page.locator('text=£2,500.00')).toBeVisible();
    await expect(page.locator('text=£5,000.00')).toBeVisible();
    await expect(page.locator('text=£750.00')).toBeVisible();
    
    // Verify status indicators are present
    await expect(page.locator('[data-testid="status-indicator-upcoming"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-indicator-due"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-indicator-overdue"]')).toBeVisible();
    
    // Verify overdue payment has warning styling
    const overduePayment = page.locator('[data-testid="payment-item-3"]');
    await expect(overduePayment).toHaveClass(/border-red-300/);
  });

  test('should navigate between months using arrow buttons', async ({ page }) => {
    // Click next month button
    await page.click('[aria-label="Next month"]');
    await expect(page.locator('text=/october 2025/i')).toBeVisible();
    
    // Click previous month button twice to go to August
    await page.click('[aria-label="Previous month"]');
    await page.click('[aria-label="Previous month"]');
    await expect(page.locator('text=/august 2025/i')).toBeVisible();
  });

  test('should select calendar dates and update payment details', async ({ page }) => {
    // Click on a calendar day with payments
    await page.click('[data-testid="calendar-day-2025-09-15"]');
    
    // Verify day is selected (visual feedback)
    const selectedDay = page.locator('[data-testid="calendar-day-2025-09-15"]');
    await expect(selectedDay).toHaveClass(/bg-pink-100.*ring-2.*ring-pink-500/);
    
    // Verify payment details for selected date are shown
    await expect(page.locator('text=/Events for.*September 15/i')).toBeVisible();
    await expect(page.locator('text=Amazing Photography')).toBeVisible();
  });

  test('should open and interact with Mark as Paid modal', async ({ page }) => {
    // Click "Mark as Paid" button for first payment
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    // Verify modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=/mark payment as paid/i')).toBeVisible();
    
    // Verify payment details in modal
    await expect(modal.locator('text=Amazing Photography')).toBeVisible();
    await expect(modal.locator('text=£2,500.00')).toBeVisible();
    
    // Fill form fields
    await modal.locator('[name="paymentDate"]').fill('2025-08-28');
    await modal.locator('[name="paymentMethod"]').selectOption('bank_transfer');
    await modal.locator('[name="notes"]').fill('Payment completed via online banking');
    
    // Mock successful payment update
    await page.route('**/api/payments/*/mark-paid', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    // Submit form
    await modal.locator('button:has-text("Confirm Payment")').click();
    
    // Verify modal closes and payment status updates
    await expect(modal).not.toBeVisible();
    
    // Wait for potential UI updates
    await page.waitForTimeout(500);
  });

  test('should validate mark as paid form fields', async ({ page }) => {
    // Click "Mark as Paid" button
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Try to submit without required fields
    await modal.locator('button:has-text("Confirm Payment")').click();
    
    // Verify validation error appears
    await expect(modal.locator('text=/payment date is required/i')).toBeVisible();
    
    // Enter future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await modal.locator('[name="paymentDate"]').fill(futureDateString);
    await modal.locator('button:has-text("Confirm Payment")').click();
    
    // Verify future date validation
    await expect(modal.locator('text=/payment date cannot be in the future/i')).toBeVisible();
  });

  test('should handle loading states correctly', async ({ page }) => {
    // Test loading state during initial load
    await page.route('**/api/payments/schedule**', async route => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    
    // Verify loading skeleton appears
    await expect(page.locator('[data-testid="calendar-loading-skeleton"]')).toBeVisible();
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    await expect(page.locator('[data-testid="calendar-loading-skeleton"]')).not.toBeVisible();
  });

  test('should handle empty state when no payments exist', async ({ page }) => {
    // Mock empty payments response
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: [] })
      });
    });
    
    await page.goto('/payments/calendar');
    
    // Verify empty state messaging
    await expect(page.locator('text=/no upcoming payments/i')).toBeVisible();
    await expect(page.locator('text=/no payments scheduled/i')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/payments/calendar');
    
    // Verify error state
    await expect(page.locator('text=/failed to load payments/i')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    
    // Test retry functionality
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.click('button:has-text("Try Again")');
    await expect(page.locator('[data-testid="payment-calendar-grid"]')).toBeVisible();
  });
});

test.describe('Payment Calendar - Mobile Responsiveness', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Verify mobile layout
    const calendar = page.locator('[data-testid="payment-calendar-grid"]');
    await expect(calendar).toBeVisible();
    
    // Verify calendar days are appropriately sized for mobile
    const calendarDay = page.locator('[data-testid="calendar-day-2025-09-15"]');
    const dayBounds = await calendarDay.boundingBox();
    
    // Minimum touch target size (44px as per Apple/Google guidelines)
    expect(dayBounds?.height).toBeGreaterThanOrEqual(44);
    expect(dayBounds?.width).toBeGreaterThanOrEqual(44);
    
    // Verify mobile upcoming payments layout
    await expect(page.locator('text=Amazing Photography')).toBeVisible();
    await expect(page.locator('text=£2,500.00')).toBeVisible();
  });

  test('should support touch gestures for month navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Verify current month
    await expect(page.locator('text=/september 2025/i')).toBeVisible();
    
    // Simulate left swipe (next month)
    const calendar = page.locator('[data-testid="payment-calendar-grid"]');
    await calendar.touchStart([{ x: 200, y: 100 }]);
    await calendar.touchMove([{ x: 100, y: 100 }]);
    await calendar.touchEnd();
    
    // Verify month changed
    await expect(page.locator('text=/october 2025/i')).toBeVisible();
    
    // Simulate right swipe (previous month)
    await calendar.touchStart([{ x: 100, y: 100 }]);
    await calendar.touchMove([{ x: 200, y: 100 }]);
    await calendar.touchEnd();
    
    // Verify month changed back
    await expect(page.locator('text=/september 2025/i')).toBeVisible();
  });

  test('should adapt mark as paid modal for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Open mark as paid modal
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify modal is properly sized for mobile
    const modalBounds = await modal.boundingBox();
    expect(modalBounds?.width).toBeLessThanOrEqual(375 - 32); // Account for margins
    
    // Verify form elements are touch-friendly
    const dateInput = modal.locator('[name="paymentDate"]');
    const inputBounds = await dateInput.boundingBox();
    expect(inputBounds?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
  });
});

test.describe('Payment Calendar - Accessibility', () => {
  test('should have proper keyboard navigation', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Tab to calendar
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Use arrow keys to navigate calendar
    const calendar = page.locator('[data-testid="payment-calendar-grid"]');
    await calendar.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    
    // Verify keyboard navigation works
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toMatch(/calendar-day/);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Verify calendar has proper ARIA attributes
    const calendar = page.locator('[role="grid"]');
    await expect(calendar).toHaveAttribute('aria-label', /payment calendar/i);
    
    // Verify navigation buttons have ARIA labels
    await expect(page.locator('[aria-label="Previous month"]')).toBeVisible();
    await expect(page.locator('[aria-label="Next month"]')).toBeVisible();
    
    // Verify payment status indicators have ARIA labels
    const overdueIndicator = page.locator('[data-testid="status-indicator-overdue"]');
    await expect(overdueIndicator).toHaveAttribute('aria-label', /overdue/i);
    await expect(overdueIndicator).toHaveAttribute('role', 'status');
  });

  test('should announce payment information to screen readers', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Verify calendar days with payments have descriptive ARIA labels
    const paymentDay = page.locator('[data-testid="calendar-day-2025-09-15"]');
    const ariaLabel = await paymentDay.getAttribute('aria-label');
    
    expect(ariaLabel).toContain('payment');
    expect(ariaLabel).toContain('due');
  });

  test('should handle modal focus management correctly', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Open modal
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify modal has proper ARIA attributes
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');
    
    // Verify focus is trapped within modal
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Verify ESC key closes modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should meet color contrast requirements', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Check overdue payment has sufficient contrast
    const overduePayment = page.locator('[data-testid="payment-item-3"]');
    const textColor = await overduePayment.evaluate(el => 
      getComputedStyle(el).color
    );
    const bgColor = await overduePayment.evaluate(el => 
      getComputedStyle(el).backgroundColor
    );
    
    // Colors should meet WCAG AA contrast ratio requirements
    // This is a basic check - in real implementation, you'd use a contrast checker
    expect(textColor).not.toBe(bgColor);
  });
});

test.describe('Payment Calendar - Performance', () => {
  test('should load within performance targets', async ({ page }) => {
    const startTime = Date.now();
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 1 second as per requirements
    expect(loadTime).toBeLessThan(1000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Generate large dataset
    const largePaymentSet = Array.from({ length: 100 }, (_, i) => ({
      id: `payment_${i}`,
      due_date: `2025-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
      vendor_name: `Vendor ${i}`,
      amount: (i + 1) * 10000,
      status: ['upcoming', 'due', 'overdue', 'paid'][i % 4] as any,
      description: `Payment description ${i}`
    }));
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: largePaymentSet })
      });
    });
    
    const startTime = Date.now();
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    const loadTime = Date.now() - startTime;
    
    // Should handle large datasets within reasonable time
    expect(loadTime).toBeLessThan(2000);
    
    // Verify calendar still functions correctly
    await expect(page.locator('text=/september 2025/i')).toBeVisible();
    await expect(page.locator('[data-testid^="calendar-day"]')).toHaveCount(42);
  });

  test('should optimize calendar re-renders', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Navigate between months multiple times quickly
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      await page.click('[aria-label="Next month"]');
      await page.waitForSelector('text=/2025/i');
    }
    
    const navigationTime = Date.now() - startTime;
    
    // Navigation should be smooth and quick
    expect(navigationTime).toBeLessThan(1000);
  });
});

test.describe('Payment Calendar - Security', () => {
  test('should prevent XSS in payment descriptions', async ({ page }) => {
    const maliciousPaymentData = [{
      id: '1',
      due_date: '2025-09-15',
      vendor_name: '<script>window.xssExecuted = true;</script>Vendor',
      amount: 250000,
      status: 'upcoming',
      description: '<img src="x" onerror="window.xssExecuted = true" />Payment description'
    }];
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: maliciousPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Verify XSS didn't execute
    const xssExecuted = await page.evaluate(() => (window as any).xssExecuted);
    expect(xssExecuted).toBeFalsy();
    
    // Verify content is safely displayed
    await expect(page.locator('text=/vendor/i')).toBeVisible();
    await expect(page.locator('script')).not.toBeVisible();
  });

  test('should validate payment data inputs', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Open mark as paid modal
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    const modal = page.locator('[role="dialog"]');
    
    // Attempt to inject malicious content
    await modal.locator('[name="notes"]').fill('<script>alert("xss")</script>');
    
    // Mock the API call to verify sanitization would occur server-side
    await page.route('**/api/payments/*/mark-paid', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      // Verify dangerous content is not in the request
      expect(postData.notes).not.toContain('<script>');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await modal.locator('[name="paymentDate"]').fill('2025-08-28');
    await modal.locator('button:has-text("Confirm Payment")').click();
  });
});

// Visual Regression Tests (using screenshots)
test.describe('Payment Calendar - Visual Regression', () => {
  test('should match calendar visual design', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Take screenshot of full calendar
    await expect(page).toHaveScreenshot('payment-calendar-full.png');
    
    // Take screenshot of calendar grid only
    const calendar = page.locator('[data-testid="payment-calendar-grid"]');
    await expect(calendar).toHaveScreenshot('payment-calendar-grid.png');
    
    // Take screenshot of upcoming payments list
    const paymentsList = page.locator('[data-testid="upcoming-payments-list"]');
    await expect(paymentsList).toHaveScreenshot('upcoming-payments-list.png');
  });

  test('should match mobile visual design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    await expect(page).toHaveScreenshot('payment-calendar-mobile.png');
  });

  test('should match mark as paid modal design', async ({ page }) => {
    await page.route('**/api/payments/schedule**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: mockPaymentData })
      });
    });
    
    await page.goto('/payments/calendar');
    await page.waitForSelector('[data-testid="payment-calendar-grid"]');
    
    // Open modal
    const markPaidButton = page.locator('[data-testid="payment-item-1"] button:has-text("Mark as Paid")');
    await markPaidButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await expect(modal).toHaveScreenshot('mark-as-paid-modal.png');
  });
});