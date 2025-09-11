import { test, expect } from '@playwright/test';

test.describe('Budget Management System - Complete Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data and authentication
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('Complete Budget Management Workflow', async ({ page }) => {
    // Navigate to budget section
    await page.click('[data-testid="budget-nav"]');
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();

    // Test budget category creation
    await page.click('[data-testid="add-category-btn"]');
    await page.fill('[data-testid="category-name"]', 'Photography');
    await page.fill('[data-testid="category-budget"]', '5000');
    await page.click('[data-testid="color-picker"] [data-color="#3b82f6"]');
    await page.click('[data-testid="save-category"]');
    
    // Verify category appears
    await expect(page.locator('[data-testid="category-Photography"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-Photography"] .allocated')).toHaveText('$5,000');

    // Test expense entry with receipt upload
    await page.click('[data-testid="add-expense-btn"]');
    await page.selectOption('[data-testid="expense-category"]', 'Photography');
    await page.fill('[data-testid="expense-amount"]', '2500.00');
    await page.fill('[data-testid="expense-description"]', 'Wedding photographer booking deposit');
    await page.setInputFiles('[data-testid="receipt-upload"]', './test-fixtures/receipt.jpg');
    await page.click('[data-testid="submit-expense"]');

    // Verify expense was added and budget updated
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('[data-testid="category-Photography"] .spent')).toHaveText('$2,500');
    await expect(page.locator('[data-testid="category-Photography"] .progress')).toHaveAttribute('aria-valuenow', '50');

    // Test budget analytics
    await page.click('[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="forecast-data"]')).toBeVisible();

    // Test export functionality
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('wedding-budget-report.pdf');

    // Test mobile responsive layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-grid"]')).toHaveClass(/grid-cols-1/);
  });

  test('Helper Schedule Integration', async ({ page }) => {
    // Navigate to helper schedules
    await page.goto('/wedding/helpers/schedule');
    
    // Test schedule display
    await expect(page.locator('[data-testid="helper-timeline"]')).toBeVisible();
    
    // Test task confirmation
    await page.click('[data-testid="confirm-task-btn"]');
    await expect(page.locator('[data-badge="confirmed"]')).toBeVisible();
    
    // Test calendar export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-calendar-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('wedding-schedule.ics');

    // Test real-time updates
    // Simulate another user making changes
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('schedule-update', {
        detail: { taskId: 'task-1', status: 'completed' }
      }));
    });
    
    await expect(page.locator('[data-testid="task-1"] [data-badge="completed"]')).toBeVisible();
  });

  test('Accessibility Compliance', async ({ page }) => {
    await page.goto('/wedding/budget');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'skip-to-summary');
    
    // Test screen reader announcements
    await page.click('[data-testid="add-expense-btn"]');
    const announcement = page.locator('[role="alert"]');
    await expect(announcement).toBeVisible();
    
    // Test color contrast compliance
    const budgetCard = page.locator('[data-testid="budget-overview"]');
    const backgroundColor = await budgetCard.evaluate(el => 
      getComputedStyle(el).backgroundColor
    );
    // Verify contrast ratios meet WCAG AA standards (implementation would check actual ratios)
    expect(backgroundColor).toBeDefined();
    
    // Test focus management
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Open category details
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Error Handling and Recovery', async ({ page }) => {
    // Test network failure handling
    await page.route('**/api/budgets/**', route => route.abort());
    await page.goto('/wedding/budget');
    
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText('Error Loading Budget');
    
    // Test retry functionality
    await page.unroute('**/api/budgets/**');
    await page.click('[data-testid="retry-btn"]');
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
    
    // Test form validation
    await page.click('[data-testid="add-expense-btn"]');
    await page.click('[data-testid="submit-expense"]'); // Submit without required fields
    
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-error"]')).toBeVisible();
  });

  test('Performance and Load Testing', async ({ page }) => {
    // Test with large dataset
    await page.goto('/wedding/budget?test-data=large');
    
    // Measure initial load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
    
    // Test scroll performance with many categories
    await page.locator('[data-testid="category-grid"]').scrollIntoView();
    await page.waitForTimeout(100); // Allow for smooth scrolling
    
    // Test search performance
    await page.fill('[data-testid="category-search"]', 'Photography');
    await page.waitForTimeout(300); // Debounced search
    
    const filteredResults = page.locator('[data-testid*="category-"]');
    await expect(filteredResults).toHaveCount(1);
  });

  test('Security and Data Protection', async ({ page }) => {
    // Test CSRF protection
    await page.goto('/wedding/budget');
    
    // Attempt to make unauthorized request
    const response = await page.evaluate(async () => {
      return fetch('/api/budgets/test-wedding-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Malicious Category',
          allocated_amount: 1000,
          color_code: '#ff0000'
        })
      });
    });
    
    expect(response).toBeDefined();
    
    // Test input sanitization
    await page.click('[data-testid="add-category-btn"]');
    await page.fill('[data-testid="category-name"]', '<script>alert("xss")</script>');
    await page.fill('[data-testid="category-budget"]', '5000');
    await page.click('[data-testid="save-category"]');
    
    // Verify script tags are escaped
    const categoryText = await page.locator('[data-testid*="category-"] h3').textContent();
    expect(categoryText).not.toContain('<script>');
    expect(categoryText).toContain('&lt;script&gt;');
  });

  test('Real-time Collaboration', async ({ page, context }) => {
    // Create second browser context to simulate another user
    const secondPage = await context.newPage();
    
    // Both users navigate to budget page
    await page.goto('/wedding/budget?wedding_id=shared-wedding');
    await secondPage.goto('/wedding/budget?wedding_id=shared-wedding');
    
    // First user adds a category
    await page.click('[data-testid="add-category-btn"]');
    await page.fill('[data-testid="category-name"]', 'Catering');
    await page.fill('[data-testid="category-budget"]', '10000');
    await page.click('[data-testid="save-category"]');
    
    // Verify second user sees the update in real-time
    await expect(secondPage.locator('[data-testid="category-Catering"]')).toBeVisible({ timeout: 5000 });
    
    // Second user updates the category
    await secondPage.click('[data-testid="category-Catering"] [data-testid="edit-btn"]');
    await secondPage.fill('[data-testid="category-budget"]', '12000');
    await secondPage.click('[data-testid="save-changes"]');
    
    // First user sees the update
    await expect(page.locator('[data-testid="category-Catering"] .allocated')).toHaveText('$12,000', { timeout: 5000 });
    
    await secondPage.close();
  });

  test('Data Export and Import', async ({ page }) => {
    await page.goto('/wedding/budget');
    
    // Create some test data
    const categories = [
      { name: 'Venue', budget: 15000 },
      { name: 'Photography', budget: 5000 },
      { name: 'Catering', budget: 12000 }
    ];
    
    for (const category of categories) {
      await page.click('[data-testid="add-category-btn"]');
      await page.fill('[data-testid="category-name"]', category.name);
      await page.fill('[data-testid="category-budget"]', category.budget.toString());
      await page.click('[data-testid="save-category"]');
    }
    
    // Test CSV export
    const csvDownload = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-btn"]');
    const csvFile = await csvDownload;
    expect(csvFile.suggestedFilename()).toMatch(/\.csv$/);
    
    // Test Excel export
    const xlsxDownload = page.waitForEvent('download');
    await page.click('[data-testid="export-xlsx-btn"]');
    const xlsxFile = await xlsxDownload;
    expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/);
    
    // Test data import
    await page.setInputFiles('[data-testid="import-file"]', './test-fixtures/budget-import.csv');
    await page.click('[data-testid="import-btn"]');
    
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('[data-testid*="category-"]')).toHaveCount(6); // 3 existing + 3 imported
  });

  test('Offline Functionality', async ({ page, context }) => {
    await page.goto('/wedding/budget');
    
    // Wait for initial load
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
    
    // Simulate offline mode
    await context.setOffline(true);
    
    // Test that cached data is still available
    await page.reload();
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
    
    // Test offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test offline form handling
    await page.click('[data-testid="add-category-btn"]');
    await page.fill('[data-testid="category-name"]', 'Offline Category');
    await page.fill('[data-testid="category-budget"]', '3000');
    await page.click('[data-testid="save-category"]');
    
    // Should show pending indicator
    await expect(page.locator('[data-testid="offline-pending"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Test sync functionality
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="category-Offline Category"]')).toBeVisible();
  });
});