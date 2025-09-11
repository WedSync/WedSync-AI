import { test, expect, Page } from '@playwright/test';

// Test data constants
const MOCK_WEDDING_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_USER_EMAIL = 'test.couple@wedsync.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test payment data
const mockPaymentData = {
  vendor_name: 'E2E Test Vendor',
  amount: 1500.00,
  due_date: '2025-03-15',
  category: 'Testing',
  priority: 'medium',
  description: 'E2E test payment for validation'
};

class PaymentCalendarPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="payment-calendar"]');
    await this.page.waitForLoadState('networkidle');
  }

  async getPaymentSummary() {
    return {
      total_payments: await this.page.textContent('[data-testid="total-payments"]'),
      total_amount: await this.page.textContent('[data-testid="total-amount"]'),
      overdue_count: await this.page.textContent('[data-testid="overdue-count"]'),
      due_soon_count: await this.page.textContent('[data-testid="due-soon-count"]')
    };
  }

  async openAddPaymentModal() {
    await this.page.click('[data-testid="add-payment-button"]');
    await this.page.waitForSelector('[data-testid="payment-form-modal"]');
  }

  async fillPaymentForm(paymentData: any) {
    await this.page.fill('[data-testid="vendor-name-input"]', paymentData.vendor_name);
    await this.page.fill('[data-testid="amount-input"]', paymentData.amount.toString());
    await this.page.fill('[data-testid="due-date-input"]', paymentData.due_date);
    await this.page.selectOption('[data-testid="category-select"]', paymentData.category);
    await this.page.selectOption('[data-testid="priority-select"]', paymentData.priority);
    await this.page.fill('[data-testid="description-input"]', paymentData.description);
  }

  async submitPaymentForm() {
    await this.page.click('[data-testid="submit-payment"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async updatePaymentStatus(paymentId: string, status: string) {
    const paymentItem = this.page.locator(`[data-testid="payment-item-${paymentId}"]`);
    await paymentItem.locator('[data-testid="status-dropdown"]').click();
    await this.page.click(`[data-value="${status}"]`);
    await this.page.waitForSelector('[data-testid="status-updated-message"]');
  }

  async applyFilters(filters: { status?: string; category?: string; priority?: string }) {
    if (filters.status) {
      await this.page.selectOption('[data-testid="status-filter"]', filters.status);
    }
    if (filters.category) {
      await this.page.selectOption('[data-testid="category-filter"]', filters.category);
    }
    if (filters.priority) {
      await this.page.selectOption('[data-testid="priority-filter"]', filters.priority);
    }
    await this.page.waitForLoadState('networkidle');
  }

  async switchToCalendarView() {
    await this.page.click('[data-testid="view-toggle"]');
    await this.page.waitForSelector('[data-testid="payment-calendar-view"]');
  }

  async selectDateInCalendar(date: string) {
    await this.page.click(`[data-testid="calendar-date-${date}"]`);
  }

  async exportToCsv() {
    await this.page.click('[data-testid="export-csv-button"]');
  }

  async exportToPdf() {
    await this.page.click('[data-testid="export-pdf-button"]');
  }

  async getPaymentItems() {
    return await this.page.locator('[data-testid^="payment-item-"]').all();
  }

  async deletePayment(paymentId: string) {
    const paymentItem = this.page.locator(`[data-testid="payment-item-${paymentId}"]`);
    await paymentItem.locator('[data-testid="delete-button"]').click();
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForSelector('[data-testid="payment-deleted-message"]');
  }
}

test.describe('Payment Calendar E2E Tests', () => {
  let paymentPage: PaymentCalendarPage;

  test.beforeEach(async ({ page }) => {
    paymentPage = new PaymentCalendarPage(page);
    
    // Mock authentication
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: TEST_USER_EMAIL
          },
          access_token: 'mock-token'
        })
      });
    });

    // Mock payment schedules API
    await page.route('**/api/payments/schedules*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [
              {
                id: 'payment-001',
                weddingId: MOCK_WEDDING_ID,
                title: 'Venue Payment',
                amount: 15000,
                dueDate: '2025-03-01',
                status: 'pending',
                priority: 'high',
                vendor: { name: 'Elegant Gardens Venue', category: 'Venue' }
              },
              {
                id: 'payment-002',
                weddingId: MOCK_WEDDING_ID,
                title: 'Catering Payment',
                amount: 8500,
                dueDate: '2025-02-15',
                status: 'due-soon',
                priority: 'high',
                vendor: { name: 'Gourmet Catering Co', category: 'Catering' }
              },
              {
                id: 'payment-003',
                weddingId: MOCK_WEDDING_ID,
                title: 'Photography Payment',
                amount: 3200,
                dueDate: '2025-01-25',
                status: 'overdue',
                priority: 'medium',
                vendor: { name: 'Perfect Moments Photography', category: 'Photography' }
              }
            ],
            total: 3
          })
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            schedule: {
              id: 'payment-new',
              weddingId: MOCK_WEDDING_ID,
              ...JSON.parse(route.request().postData() || '{}')
            },
            message: 'Payment schedule created successfully'
          })
        });
      } else if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedule: {
              id: 'payment-updated',
              ...JSON.parse(route.request().postData() || '{}')
            },
            message: 'Payment updated successfully'
          })
        });
      }
    });
  });

  test.describe('Core Functionality', () => {
    test('displays payment calendar with all essential elements', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify main components are visible
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="calendar-controls"]')).toBeVisible();

      // Verify payment summary displays correct data
      const summary = await paymentPage.getPaymentSummary();
      expect(summary.total_payments).toBe('3');
      expect(summary.total_amount).toContain('$26,700.00');
      expect(summary.overdue_count).toBe('1');
      expect(summary.due_soon_count).toBe('1');
    });

    test('creates new payment successfully', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await paymentPage.openAddPaymentModal();

      // Verify modal is displayed
      await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();

      // Fill and submit form
      await paymentPage.fillPaymentForm(mockPaymentData);
      await paymentPage.submitPaymentForm();

      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Payment created successfully');

      // Verify modal closes
      await expect(page.locator('[data-testid="payment-form-modal"]')).not.toBeVisible();
    });

    test('updates payment status', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Mock update API
      await page.route('**/api/payments/schedules/payment-001', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedule: { id: 'payment-001', status: 'paid' },
            message: 'Payment status updated successfully'
          })
        });
      });

      await paymentPage.updatePaymentStatus('payment-001', 'paid');

      // Verify status update message
      await expect(page.locator('[data-testid="status-updated-message"]')).toBeVisible();

      // Verify visual status change
      const paymentItem = page.locator('[data-testid="payment-item-payment-001"]');
      await expect(paymentItem).toHaveClass(/status-paid/);
    });

    test('deletes payment with confirmation', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Mock delete API
      await page.route('**/api/payments/schedules/payment-003', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Payment deleted successfully'
          })
        });
      });

      await paymentPage.deletePayment('payment-003');

      // Verify deletion success message
      await expect(page.locator('[data-testid="payment-deleted-message"]')).toBeVisible();

      // Verify payment item is removed
      await expect(page.locator('[data-testid="payment-item-payment-003"]')).not.toBeVisible();
    });
  });

  test.describe('Filtering and Sorting', () => {
    test('filters payments by status', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await paymentPage.applyFilters({ status: 'overdue' });

      // Verify only overdue payments are shown
      const paymentItems = await paymentPage.getPaymentItems();
      expect(paymentItems.length).toBe(1);

      const overdueItem = page.locator('[data-testid="payment-item-payment-003"]');
      await expect(overdueItem).toBeVisible();
      await expect(overdueItem).toHaveClass(/status-overdue/);
    });

    test('filters payments by category', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await paymentPage.applyFilters({ category: 'Venue' });

      // Verify only venue payments are shown
      const paymentItems = await paymentPage.getPaymentItems();
      expect(paymentItems.length).toBe(1);

      const venueItem = page.locator('[data-testid="payment-item-payment-001"]');
      await expect(venueItem).toBeVisible();
      await expect(venueItem).toContainText('Venue');
    });

    test('combines multiple filters', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await paymentPage.applyFilters({ 
        status: 'pending', 
        priority: 'high' 
      });

      // Verify filtered results
      const paymentItems = await paymentPage.getPaymentItems();
      expect(paymentItems.length).toBe(1);

      const filteredItem = page.locator('[data-testid="payment-item-payment-001"]');
      await expect(filteredItem).toBeVisible();
      await expect(filteredItem).toHaveClass(/status-pending/);
      await expect(filteredItem).toHaveClass(/priority-high/);
    });

    test('sorts payments by due date', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await page.click('[data-testid="sort-by-due-date"]');

      // Verify sorting order
      const paymentItems = await page.locator('[data-testid^="payment-item-"]').all();
      const dates = await Promise.all(
        paymentItems.map(item => item.locator('[data-testid="due-date"]').textContent())
      );

      // Should be sorted chronologically (overdue first, then by due date)
      expect(dates[0]).toContain('Jan 25'); // Overdue payment
      expect(dates[1]).toContain('Feb 15'); // Due soon
      expect(dates[2]).toContain('Mar 01'); // Pending
    });

    test('sorts payments by amount', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await page.click('[data-testid="sort-by-amount"]');

      // Verify sorting by amount (highest first)
      const paymentItems = await page.locator('[data-testid^="payment-item-"]').all();
      const amounts = await Promise.all(
        paymentItems.map(item => item.locator('[data-testid="payment-amount"]').textContent())
      );

      expect(amounts[0]).toContain('$15,000.00'); // Venue
      expect(amounts[1]).toContain('$8,500.00');  // Catering
      expect(amounts[2]).toContain('$3,200.00');  // Photography
    });
  });

  test.describe('Calendar View', () => {
    test('switches between list and calendar view', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Default should be list view
      await expect(page.locator('[data-testid="payment-list-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-calendar-view"]')).not.toBeVisible();

      // Switch to calendar view
      await paymentPage.switchToCalendarView();

      await expect(page.locator('[data-testid="payment-calendar-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-list-view"]')).not.toBeVisible();
    });

    test('highlights dates with payments in calendar view', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.switchToCalendarView();

      // Verify dates with payments are highlighted
      await expect(page.locator('[data-testid="calendar-date-2025-01-25"]')).toHaveClass(/has-payments/);
      await expect(page.locator('[data-testid="calendar-date-2025-02-15"]')).toHaveClass(/has-payments/);
      await expect(page.locator('[data-testid="calendar-date-2025-03-01"]')).toHaveClass(/has-payments/);

      // Verify dates without payments are not highlighted
      await expect(page.locator('[data-testid="calendar-date-2025-02-01"]')).not.toHaveClass(/has-payments/);
    });

    test('shows payment details when clicking on calendar date', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.switchToCalendarView();

      await paymentPage.selectDateInCalendar('2025-02-15');

      // Verify payment details popup
      await expect(page.locator('[data-testid="date-payments-popup"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-payments-popup"]')).toContainText('Catering Payment');
      await expect(page.locator('[data-testid="date-payments-popup"]')).toContainText('$8,500.00');
    });
  });

  test.describe('Form Validation', () => {
    test('validates required fields', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.openAddPaymentModal();

      // Try to submit empty form
      await page.click('[data-testid="submit-payment"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="vendor-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-name-error"]')).toContainText('Vendor name is required');

      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount is required');

      await expect(page.locator('[data-testid="due-date-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="due-date-error"]')).toContainText('Due date is required');
    });

    test('validates negative amounts', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.openAddPaymentModal();

      await page.fill('[data-testid="amount-input"]', '-100');
      await page.click('[data-testid="submit-payment"]');

      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount must be positive');
    });

    test('validates maximum amount limits', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.openAddPaymentModal();

      await page.fill('[data-testid="amount-input"]', '10000000'); // 10 million
      await page.click('[data-testid="submit-payment"]');

      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount exceeds maximum limit');
    });

    test('validates date format and future dates', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();
      await paymentPage.openAddPaymentModal();

      // Test invalid date format
      await page.fill('[data-testid="due-date-input"]', 'invalid-date');
      await page.click('[data-testid="submit-payment"]');

      await expect(page.locator('[data-testid="due-date-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="due-date-error"]')).toContainText('Please enter a valid date');

      // Test past date
      await page.fill('[data-testid="due-date-input"]', '2020-01-01');
      await page.click('[data-testid="submit-payment"]');

      await expect(page.locator('[data-testid="due-date-error"]')).toContainText('Due date cannot be in the past');
    });
  });

  test.describe('Responsive Design', () => {
    test('adapts layout for mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="payment-calendar"]')).toHaveClass(/mobile-layout/);
      await expect(page.locator('[data-testid="mobile-summary-cards"]')).toBeVisible();
      
      // Verify desktop-only elements are hidden
      await expect(page.locator('[data-testid="desktop-calendar-view"]')).not.toBeVisible();
    });

    test('shows appropriate controls for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await expect(page.locator('[data-testid="payment-calendar"]')).toHaveClass(/tablet-layout/);
      await expect(page.locator('[data-testid="tablet-calendar-controls"]')).toBeVisible();
    });

    test('maintains functionality on different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },  // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await paymentPage.navigate();
        await paymentPage.waitForLoad();

        // Core functionality should work on all sizes
        await paymentPage.openAddPaymentModal();
        await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();
        
        await page.keyboard.press('Escape'); // Close modal
        await expect(page.locator('[data-testid="payment-form-modal"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Export Functionality', () => {
    test('exports payment data to CSV', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Mock download
      const downloadPromise = page.waitForEvent('download');
      await paymentPage.exportToCsv();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('payment-calendar.csv');
      expect(await download.failure()).toBeNull();
    });

    test('exports payment data to PDF', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      const downloadPromise = page.waitForEvent('download');
      await paymentPage.exportToPdf();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('payment-calendar.pdf');
      expect(await download.failure()).toBeNull();
    });
  });

  test.describe('Performance and Loading', () => {
    test('loads payment calendar within performance budget', async ({ page }) => {
      const navigationPromise = page.goto(`${BASE_URL}/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      
      // Measure loading time
      const start = Date.now();
      await navigationPromise;
      await paymentPage.waitForLoad();
      const loadTime = Date.now() - start;

      // Should load within 3 seconds (performance requirement)
      expect(loadTime).toBeLessThan(3000);

      // Verify critical elements are visible quickly
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
    });

    test('handles large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/payments/schedules*', (route) => {
        const largeDataset = Array.from({ length: 100 }, (_, i) => ({
          id: `payment-${i}`,
          weddingId: MOCK_WEDDING_ID,
          title: `Payment ${i}`,
          amount: Math.random() * 10000,
          dueDate: `2025-0${(i % 9) + 1}-${String(i % 28 + 1).padStart(2, '0')}`,
          status: ['pending', 'due-soon', 'overdue', 'paid'][i % 4],
          vendor: { name: `Vendor ${i}`, category: 'Testing' }
        }));

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: largeDataset, total: 100 })
        });
      });

      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Should handle large dataset without performance degradation
      const paymentItems = await paymentPage.getPaymentItems();
      expect(paymentItems.length).toBeGreaterThan(0);

      // Test scrolling performance with large dataset
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo(0, 0));
    });

    test('implements progressive loading', async ({ page }) => {
      await paymentPage.navigate();

      // Verify loading states
      await expect(page.locator('[data-testid="payment-calendar-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-calendar-loading"]')).toContainText('Loading payment data...');

      await paymentPage.waitForLoad();

      // Loading state should be replaced with content
      await expect(page.locator('[data-testid="payment-calendar-loading"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="payment-list"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await paymentPage.navigate();
      
      // Verify error state
      await expect(page.locator('[data-testid="payment-calendar-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-calendar-error"]')).toContainText('Failed to load payments');
      
      // Verify retry functionality
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('handles network failures', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Simulate network failure during operation
      await page.setOffline(true);
      
      await paymentPage.openAddPaymentModal();
      await paymentPage.fillPaymentForm(mockPaymentData);
      await paymentPage.submitPaymentForm();

      // Should show network error message
      await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-error-message"]')).toContainText('Network error');

      // Restore connection
      await page.setOffline(false);
    });

    test('displays empty state when no payments exist', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: [], total: 0 })
        });
      });

      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify empty state
      await expect(page.locator('[data-testid="payment-calendar-empty"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-calendar-empty"]')).toContainText('No payments scheduled');
      
      // Verify add payment CTA is prominent
      await expect(page.locator('[data-testid="add-first-payment-button"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Test tab navigation
      await page.keyboard.press('Tab'); // Focus on first interactive element
      await expect(page.locator(':focus')).toBeVisible();

      // Navigate through payment items
      const paymentItems = await page.locator('[data-testid^="payment-item-"]').all();
      for (let i = 0; i < paymentItems.length; i++) {
        await page.keyboard.press('Tab');
        await expect(paymentItems[i]).toBeFocused();
      }
    });

    test('provides proper ARIA labels and roles', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify main landmark roles
      await expect(page.locator('[role="main"]')).toHaveAttribute('aria-label', 'Payment Calendar');
      await expect(page.locator('[role="table"]')).toHaveAttribute('aria-label', 'Payment Schedule');
      await expect(page.locator('[role="region"]')).toHaveAttribute('aria-labelledby', 'payment-summary-heading');

      // Verify interactive elements have proper labels
      await expect(page.locator('[data-testid="add-payment-button"]')).toHaveAttribute('aria-label', 'Add new payment');
      await expect(page.locator('[data-testid="export-csv-button"]')).toHaveAttribute('aria-label', 'Export payments to CSV');
    });

    test('works with screen reader announcements', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      await paymentPage.openAddPaymentModal();
      await paymentPage.fillPaymentForm(mockPaymentData);
      await paymentPage.submitPaymentForm();

      // Verify screen reader announcements
      await expect(page.locator('[role="status"]')).toHaveText('Payment created successfully');
    });

    test('supports high contrast mode', async ({ page }) => {
      // Enable high contrast
      await page.addInitScript(() => {
        window.matchMedia = (query) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        });
      });

      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify high contrast styles are applied
      await expect(page.locator('[data-testid="payment-calendar"]')).toHaveClass(/high-contrast/);
    });

    test('supports reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.addInitScript(() => {
        window.matchMedia = (query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        });
      });

      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Verify animations are disabled
      await expect(page.locator('[data-testid="payment-calendar"]')).toHaveClass(/reduced-motion/);
    });
  });

  test.describe('Real-world Scenarios', () => {
    test('handles complete wedding payment lifecycle', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Create multiple vendor payments
      const vendors = [
        { name: 'Dream Venue', category: 'Venue', amount: 25000 },
        { name: 'Gourmet Catering', category: 'Catering', amount: 15000 },
        { name: 'Perfect Photos', category: 'Photography', amount: 5000 },
        { name: 'Beautiful Blooms', category: 'Flowers', amount: 2500 }
      ];

      for (const vendor of vendors) {
        await paymentPage.openAddPaymentModal();
        await paymentPage.fillPaymentForm({
          ...mockPaymentData,
          vendor_name: vendor.name,
          amount: vendor.amount,
          category: vendor.category
        });
        await paymentPage.submitPaymentForm();
        
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await page.waitForTimeout(500); // Allow for UI updates
      }

      // Verify all payments are created
      const paymentItems = await paymentPage.getPaymentItems();
      expect(paymentItems.length).toBeGreaterThanOrEqual(4);
    });

    test('manages payment updates throughout planning process', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Update payment status from pending to paid
      await paymentPage.updatePaymentStatus('payment-001', 'paid');
      await expect(page.locator('[data-testid="status-updated-message"]')).toBeVisible();

      // Update another payment to due-soon
      await paymentPage.updatePaymentStatus('payment-002', 'due-soon');
      await expect(page.locator('[data-testid="status-updated-message"]')).toBeVisible();

      // Verify summary updates reflect changes
      const summary = await paymentPage.getPaymentSummary();
      expect(summary.total_payments).toBe('3');
    });

    test('handles urgent payment scenarios', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Filter for overdue payments
      await paymentPage.applyFilters({ status: 'overdue' });

      // Verify overdue payment is highlighted prominently
      const overduePayment = page.locator('[data-testid="payment-item-payment-003"]');
      await expect(overduePayment).toHaveClass(/status-overdue/);
      await expect(overduePayment).toHaveClass(/urgent/);

      // Update overdue payment to paid
      await paymentPage.updatePaymentStatus('payment-003', 'paid');
      
      // Verify urgent styling is removed
      await expect(overduePayment).not.toHaveClass(/urgent/);
      await expect(overduePayment).toHaveClass(/status-paid/);
    });

    test('exports complete payment records for vendor management', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Export CSV for record keeping
      const csvDownloadPromise = page.waitForEvent('download');
      await paymentPage.exportToCsv();
      const csvDownload = await csvDownloadPromise;
      
      expect(csvDownload.suggestedFilename()).toMatch(/payment.*\.csv$/);

      // Export PDF for formal documentation
      const pdfDownloadPromise = page.waitForEvent('download');
      await paymentPage.exportToPdf();
      const pdfDownload = await pdfDownloadPromise;
      
      expect(pdfDownload.suggestedFilename()).toMatch(/payment.*\.pdf$/);
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('works consistently across browser engines', async ({ page, browserName }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Core functionality should work identically across browsers
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      
      const summary = await paymentPage.getPaymentSummary();
      expect(summary.total_payments).toBe('3');

      // Test form submission
      await paymentPage.openAddPaymentModal();
      await paymentPage.fillPaymentForm(mockPaymentData);
      await paymentPage.submitPaymentForm();
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      console.log(`✅ Payment calendar works correctly in ${browserName}`);
    });
  });

  test.describe('Wedding Disaster Prevention', () => {
    test('prevents venue cancellation due to payment errors', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Simulate high-priority venue payment
      const venuePayment = page.locator('[data-testid="payment-item-payment-001"]');
      await expect(venuePayment).toHaveClass(/priority-high/);
      await expect(venuePayment).toContainText('Venue');

      // Ensure payment can be marked as paid to prevent cancellation
      await paymentPage.updatePaymentStatus('payment-001', 'paid');
      await expect(page.locator('[data-testid="status-updated-message"]')).toBeVisible();
      
      // Verify visual confirmation
      await expect(venuePayment).toHaveClass(/status-paid/);
    });

    test('prevents notification loops through proper state management', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Test rapid status updates don't cause notification loops
      for (let i = 0; i < 5; i++) {
        await paymentPage.updatePaymentStatus('payment-002', i % 2 === 0 ? 'due-soon' : 'pending');
        await page.waitForTimeout(100);
      }

      // Should only show one success message at a time
      const successMessages = await page.locator('[data-testid="status-updated-message"]').count();
      expect(successMessages).toBeLessThanOrEqual(1);
    });

    test('ensures cross-device synchronization works correctly', async ({ page }) => {
      await paymentPage.navigate();
      await paymentPage.waitForLoad();

      // Simulate update from another device
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('payment-updated', {
          detail: { id: 'payment-001', status: 'paid' }
        }));
      });

      // Verify UI updates reflect the change
      await page.waitForTimeout(100);
      const updatedPayment = page.locator('[data-testid="payment-item-payment-001"]');
      await expect(updatedPayment).toHaveClass(/status-paid/);
    });
  });
});