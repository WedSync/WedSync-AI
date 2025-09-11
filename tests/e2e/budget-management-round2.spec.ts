import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * WS-083 Budget Management Round 2 - Advanced Playwright Test Scenarios
 * 
 * Comprehensive end-to-end testing for enhanced budget tracking system including:
 * - Real-time dashboard interactions with multiple chart types
 * - Transaction management with file uploads and advanced filtering
 * - Drag-and-drop budget reallocation with validation
 * - Automated alert configuration and notification testing
 * - Financial reporting with PDF/CSV/Excel export functionality
 */

test.describe('Budget Management Round 2 - WS-083', () => {
  let clientId: string;
  let organizationId: string;
  let totalBudget: number;

  test.beforeEach(async ({ page }) => {
    // Set up test data
    totalBudget = 45000; // $45k budget from user story
    organizationId = faker.string.uuid();
    clientId = faker.string.uuid();

    // Mock authentication and navigate to budget dashboard
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@wedsync.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to specific client's budget dashboard
    await page.goto(`/dashboard/clients/${clientId}/budget`);
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}/budget`));
  });

  test.describe('Budget Dashboard - Real-time Visualization', () => {
    test('should display comprehensive budget dashboard with multiple chart types', async ({ page }) => {
      // Test dashboard loading with all chart components
      await expect(page.locator('[data-testid="budget-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-overview-cards"]')).toBeVisible();
      
      // Verify all chart types are rendered
      await expect(page.locator('[data-testid="budget-pie-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="spending-bar-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-radar-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-area-chart"]')).toBeVisible();
      
      // Test budget overview metrics display
      const totalBudgetDisplay = page.locator('[data-testid="total-budget-amount"]');
      const totalSpentDisplay = page.locator('[data-testid="total-spent-amount"]');
      const remainingBudgetDisplay = page.locator('[data-testid="remaining-budget-amount"]');
      
      await expect(totalBudgetDisplay).toBeVisible();
      await expect(totalSpentDisplay).toBeVisible();
      await expect(remainingBudgetDisplay).toBeVisible();
      
      // Verify percentage calculations
      const spendingPercentage = page.locator('[data-testid="spending-percentage"]');
      await expect(spendingPercentage).toBeVisible();
      await expect(spendingPercentage).toContainText('%');
    });

    test('should allow chart type switching and filtering', async ({ page }) => {
      // Test chart type toggle buttons
      const chartToggleButtons = page.locator('[data-testid="chart-toggle-buttons"]');
      await expect(chartToggleButtons).toBeVisible();
      
      // Switch to different chart views
      await page.click('[data-testid="view-pie-chart"]');
      await expect(page.locator('[data-testid="budget-pie-chart"]')).toBeVisible();
      
      await page.click('[data-testid="view-bar-chart"]');
      await expect(page.locator('[data-testid="spending-bar-chart"]')).toBeVisible();
      
      await page.click('[data-testid="view-timeline-chart"]');
      await expect(page.locator('[data-testid="timeline-area-chart"]')).toBeVisible();
      
      // Test date range filtering
      const dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
      await expect(dateRangeFilter).toBeVisible();
      
      await page.click('[data-testid="date-range-filter"]');
      await page.click('[data-testid="last-30-days"]');
      
      // Wait for chart to update with filtered data
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="chart-loading-indicator"]')).not.toBeVisible();
      
      // Test category filtering
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      await expect(categoryFilter).toBeVisible();
      
      await page.click('[data-testid="category-filter"]');
      await page.check('[data-testid="filter-venue"]');
      await page.uncheck('[data-testid="filter-catering"]');
      
      // Verify filtered results
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="filtered-results-count"]')).toBeVisible();
    });

    test('should display real-time budget calculations and updates', async ({ page }) => {
      // Test real-time calculation updates
      const originalSpentAmount = await page.locator('[data-testid="total-spent-amount"]').textContent();
      
      // Add a new transaction to trigger real-time update
      await page.click('[data-testid="quick-add-transaction"]');
      await page.fill('[data-testid="transaction-amount"]', '500');
      await page.selectOption('[data-testid="transaction-category"]', 'venue');
      await page.fill('[data-testid="transaction-description"]', 'Venue deposit payment');
      await page.click('[data-testid="save-transaction"]');
      
      // Wait for real-time update
      await page.waitForTimeout(2000);
      
      // Verify spending amount updated
      const updatedSpentAmount = await page.locator('[data-testid="total-spent-amount"]').textContent();
      expect(updatedSpentAmount).not.toBe(originalSpentAmount);
      
      // Verify remaining budget updated
      const remainingBudget = await page.locator('[data-testid="remaining-budget-amount"]').textContent();
      expect(remainingBudget).toMatch(/\$[\d,]+\.?\d*/);
      
      // Verify percentage indicators updated
      const spendingPercentage = await page.locator('[data-testid="spending-percentage"]').textContent();
      expect(spendingPercentage).toMatch(/\d+%/);
    });
  });

  test.describe('Transaction Manager - CRUD Operations', () => {
    test('should allow creating, editing, and deleting transactions', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/transactions`);
      
      // Test creating new transaction
      await page.click('[data-testid="add-new-transaction"]');
      
      const transactionModal = page.locator('[data-testid="transaction-modal"]');
      await expect(transactionModal).toBeVisible();
      
      // Fill transaction details
      await page.fill('[data-testid="transaction-amount"]', '1200.50');
      await page.selectOption('[data-testid="transaction-category"]', 'catering');
      await page.selectOption('[data-testid="transaction-type"]', 'expense');
      await page.selectOption('[data-testid="payment-method"]', 'credit_card');
      await page.fill('[data-testid="transaction-description"]', 'Catering tasting session');
      await page.fill('[data-testid="transaction-date"]', '2024-01-15');
      
      // Test file upload for receipt
      const fileInput = page.locator('[data-testid="receipt-upload"]');
      await fileInput.setInputFiles('tests/test-assets/sample-receipt.pdf');
      
      // Save transaction
      await page.click('[data-testid="save-transaction"]');
      
      // Verify transaction appears in list
      await expect(transactionModal).not.toBeVisible();
      await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible();
      
      const newTransaction = page.locator('[data-testid="transaction-item"]').first();
      await expect(newTransaction).toContainText('$1,200.50');
      await expect(newTransaction).toContainText('Catering tasting session');
      
      // Test editing transaction
      await newTransaction.locator('[data-testid="edit-transaction"]').click();
      await expect(transactionModal).toBeVisible();
      
      await page.fill('[data-testid="transaction-amount"]', '1350.75');
      await page.click('[data-testid="save-transaction"]');
      
      // Verify edit
      await expect(newTransaction).toContainText('$1,350.75');
      
      // Test deleting transaction
      await newTransaction.locator('[data-testid="delete-transaction"]').click();
      
      const confirmDialog = page.locator('[data-testid="confirm-delete-dialog"]');
      await expect(confirmDialog).toBeVisible();
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify deletion
      await expect(confirmDialog).not.toBeVisible();
      await expect(page.locator('[data-testid="transaction-list"]')).not.toContainText('Catering tasting session');
    });

    test('should support advanced filtering and search functionality', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/transactions`);
      
      // Test search functionality
      const searchInput = page.locator('[data-testid="transaction-search"]');
      await expect(searchInput).toBeVisible();
      
      await searchInput.fill('venue');
      await page.waitForTimeout(500);
      
      // Verify search results
      const searchResults = page.locator('[data-testid="transaction-item"]');
      await expect(searchResults.first()).toBeVisible();
      
      // Test category filter
      await page.click('[data-testid="filter-by-category"]');
      await page.check('[data-testid="filter-catering"]');
      await page.uncheck('[data-testid="filter-venue"]');
      
      // Test date range filter
      await page.click('[data-testid="date-range-filter"]');
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      
      // Test payment method filter
      await page.click('[data-testid="payment-method-filter"]');
      await page.check('[data-testid="filter-credit-card"]');
      
      // Test amount range filter
      await page.fill('[data-testid="min-amount"]', '100');
      await page.fill('[data-testid="max-amount"]', '2000');
      
      // Apply filters and verify results
      await page.click('[data-testid="apply-filters"]');
      await page.waitForTimeout(1000);
      
      const filteredResults = page.locator('[data-testid="filtered-transaction-count"]');
      await expect(filteredResults).toBeVisible();
      
      // Test clearing filters
      await page.click('[data-testid="clear-all-filters"]');
      await page.waitForTimeout(500);
      
      const allTransactions = page.locator('[data-testid="transaction-item"]');
      await expect(allTransactions).toHaveCount(await allTransactions.count());
    });

    test('should handle bulk operations on transactions', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/transactions`);
      
      // Test bulk selection
      const selectAllCheckbox = page.locator('[data-testid="select-all-transactions"]');
      await expect(selectAllCheckbox).toBeVisible();
      
      await selectAllCheckbox.check();
      
      // Verify all transactions are selected
      const selectedTransactions = page.locator('[data-testid="transaction-checkbox"]:checked');
      const totalTransactions = page.locator('[data-testid="transaction-checkbox"]');
      
      expect(await selectedTransactions.count()).toBe(await totalTransactions.count());
      
      // Test bulk actions menu
      const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]');
      await expect(bulkActionsMenu).toBeVisible();
      
      // Test bulk export
      await page.click('[data-testid="bulk-export"]');
      
      const exportDialog = page.locator('[data-testid="export-dialog"]');
      await expect(exportDialog).toBeVisible();
      
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.click('[data-testid="export-selected"]');
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/transactions.*\.csv$/);
      
      // Test bulk categorize
      await page.click('[data-testid="bulk-categorize"]');
      await page.selectOption('[data-testid="bulk-category-select"]', 'venue');
      await page.click('[data-testid="apply-bulk-category"]');
      
      // Verify categorization
      await page.waitForTimeout(1000);
      const categorizedTransactions = page.locator('[data-testid="transaction-item"][data-category="venue"]');
      expect(await categorizedTransactions.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Budget Reallocation - Drag & Drop Interface', () => {
    test('should allow drag-and-drop budget reallocation between categories', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reallocation`);
      
      // Wait for reallocation interface to load
      await expect(page.locator('[data-testid="budget-reallocation-interface"]')).toBeVisible();
      
      // Verify category cards are draggable
      const sourceCategoryCard = page.locator('[data-testid="category-card-venue"]');
      const targetCategoryCard = page.locator('[data-testid="category-card-catering"]');
      
      await expect(sourceCategoryCard).toBeVisible();
      await expect(targetCategoryCard).toBeVisible();
      
      // Get initial budget values
      const initialVenueBudget = await sourceCategoryCard.locator('[data-testid="allocated-amount"]').textContent();
      const initialCateringBudget = await targetCategoryCard.locator('[data-testid="allocated-amount"]').textContent();
      
      // Test drag and drop functionality
      await sourceCategoryCard.hover();
      await page.mouse.down();
      
      // Drag to reallocation area
      const reallocationArea = page.locator('[data-testid="reallocation-workspace"]');
      await reallocationArea.hover();
      await page.mouse.up();
      
      // Open reallocation modal
      const reallocationModal = page.locator('[data-testid="reallocation-modal"]');
      await expect(reallocationModal).toBeVisible();
      
      // Configure reallocation
      await page.fill('[data-testid="reallocation-amount"]', '2500');
      await page.selectOption('[data-testid="target-category"]', 'catering');
      await page.fill('[data-testid="reallocation-reason"]', 'Catering costs increased due to guest count changes');
      
      // Apply reallocation
      await page.click('[data-testid="apply-reallocation"]');
      
      // Wait for reallocation to process
      await page.waitForTimeout(2000);
      
      // Verify budget amounts updated
      const updatedVenueBudget = await sourceCategoryCard.locator('[data-testid="allocated-amount"]').textContent();
      const updatedCateringBudget = await targetCategoryCard.locator('[data-testid="allocated-amount"]').textContent();
      
      expect(updatedVenueBudget).not.toBe(initialVenueBudget);
      expect(updatedCateringBudget).not.toBe(initialCateringBudget);
      
      // Verify reallocation history entry created
      await page.click('[data-testid="view-reallocation-history"]');
      
      const historyList = page.locator('[data-testid="reallocation-history-list"]');
      await expect(historyList).toBeVisible();
      
      const latestEntry = historyList.locator('[data-testid="history-entry"]').first();
      await expect(latestEntry).toContainText('$2,500');
      await expect(latestEntry).toContainText('venue');
      await expect(latestEntry).toContainText('catering');
    });

    test('should provide smart reallocation suggestions', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reallocation`);
      
      // Wait for smart suggestions to load
      const suggestionsPanel = page.locator('[data-testid="smart-suggestions-panel"]');
      await expect(suggestionsPanel).toBeVisible();
      
      // Verify overspent category suggestions
      const overspentSuggestions = page.locator('[data-testid="overspent-suggestions"]');
      await expect(overspentSuggestions).toBeVisible();
      
      // Verify underutilized category suggestions
      const underutilizedSuggestions = page.locator('[data-testid="underutilized-suggestions"]');
      await expect(underutilizedSuggestions).toBeVisible();
      
      // Test applying a smart suggestion
      const firstSuggestion = overspentSuggestions.locator('[data-testid="suggestion-item"]').first();
      await expect(firstSuggestion).toBeVisible();
      
      await firstSuggestion.click();
      
      // Verify suggestion details modal
      const suggestionModal = page.locator('[data-testid="suggestion-details-modal"]');
      await expect(suggestionModal).toBeVisible();
      
      // Apply suggested reallocation
      await page.click('[data-testid="apply-suggestion"]');
      
      // Confirm application
      const confirmDialog = page.locator('[data-testid="confirm-suggestion-dialog"]');
      await expect(confirmDialog).toBeVisible();
      await page.click('[data-testid="confirm-apply"]');
      
      // Verify reallocation applied
      await page.waitForTimeout(2000);
      await expect(suggestionModal).not.toBeVisible();
      
      // Check updated budget distributions
      const budgetDistribution = page.locator('[data-testid="budget-distribution-chart"]');
      await expect(budgetDistribution).toBeVisible();
    });

    test('should validate reallocation constraints and rules', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reallocation`);
      
      // Test reallocation amount validation
      const venueCard = page.locator('[data-testid="category-card-venue"]');
      await venueCard.click();
      
      const reallocationModal = page.locator('[data-testid="reallocation-modal"]');
      await expect(reallocationModal).toBeVisible();
      
      // Test exceeding available budget
      await page.fill('[data-testid="reallocation-amount"]', '999999');
      await page.click('[data-testid="apply-reallocation"]');
      
      // Verify validation error
      const validationError = page.locator('[data-testid="validation-error"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText('exceeds available budget');
      
      // Test minimum reallocation amount
      await page.fill('[data-testid="reallocation-amount"]', '10');
      await page.click('[data-testid="apply-reallocation"]');
      
      await expect(validationError).toContainText('minimum reallocation amount');
      
      // Test valid reallocation
      await page.fill('[data-testid="reallocation-amount"]', '1000');
      await page.selectOption('[data-testid="target-category"]', 'photography');
      await page.fill('[data-testid="reallocation-reason"]', 'Additional photography coverage needed');
      
      await page.click('[data-testid="apply-reallocation"]');
      
      // Verify successful reallocation
      await expect(reallocationModal).not.toBeVisible();
      
      const successNotification = page.locator('[data-testid="success-notification"]');
      await expect(successNotification).toBeVisible();
      await expect(successNotification).toContainText('Budget reallocation completed successfully');
    });
  });

  test.describe('Budget Alerts - Automated Notifications', () => {
    test('should configure and manage budget alert thresholds', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/alerts`);
      
      // Verify alerts configuration panel
      const alertsPanel = page.locator('[data-testid="budget-alerts-panel"]');
      await expect(alertsPanel).toBeVisible();
      
      // Configure spending threshold alerts
      const spendingAlerts = page.locator('[data-testid="spending-alerts-config"]');
      await expect(spendingAlerts).toBeVisible();
      
      // Set up 80% threshold alert
      await page.check('[data-testid="enable-80-percent-alert"]');
      await page.check('[data-testid="alert-email-notification"]');
      await page.check('[data-testid="alert-in-app-notification"]');
      
      // Set up 90% threshold alert
      await page.check('[data-testid="enable-90-percent-alert"]');
      await page.check('[data-testid="alert-sms-notification"]');
      
      // Set up 100% threshold alert
      await page.check('[data-testid="enable-100-percent-alert"]');
      await page.check('[data-testid="alert-push-notification"]');
      
      // Configure custom threshold
      await page.check('[data-testid="enable-custom-threshold"]');
      await page.fill('[data-testid="custom-threshold-percentage"]', '85');
      
      // Save alert configuration
      await page.click('[data-testid="save-alert-config"]');
      
      // Verify configuration saved
      const successMessage = page.locator('[data-testid="config-saved-message"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('Alert configuration saved successfully');
      
      // Test category-specific alerts
      const categoryAlerts = page.locator('[data-testid="category-alerts-config"]');
      await expect(categoryAlerts).toBeVisible();
      
      await page.selectOption('[data-testid="alert-category-select"]', 'venue');
      await page.fill('[data-testid="category-alert-threshold"]', '95');
      await page.check('[data-testid="category-alert-enabled"]');
      
      await page.click('[data-testid="add-category-alert"]');
      
      // Verify category alert added
      const categoryAlertsList = page.locator('[data-testid="category-alerts-list"]');
      await expect(categoryAlertsList).toContainText('venue');
      await expect(categoryAlertsList).toContainText('95%');
    });

    test('should display real-time alert notifications', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget`);
      
      // Simulate spending that triggers alert threshold
      await page.click('[data-testid="quick-add-transaction"]');
      
      // Add transaction that pushes category over threshold
      await page.fill('[data-testid="transaction-amount"]', '8500'); // Large amount to trigger alert
      await page.selectOption('[data-testid="transaction-category"]', 'venue');
      await page.fill('[data-testid="transaction-description"]', 'Final venue payment');
      await page.click('[data-testid="save-transaction"]');
      
      // Wait for real-time processing and alert generation
      await page.waitForTimeout(3000);
      
      // Verify in-app notification appears
      const alertNotification = page.locator('[data-testid="budget-alert-notification"]');
      await expect(alertNotification).toBeVisible();
      await expect(alertNotification).toContainText('Budget Alert');
      await expect(alertNotification).toContainText('venue');
      await expect(alertNotification).toContainText('threshold exceeded');
      
      // Test notification interaction
      await alertNotification.click();
      
      const alertDetails = page.locator('[data-testid="alert-details-modal"]');
      await expect(alertDetails).toBeVisible();
      await expect(alertDetails).toContainText('Spending Threshold Exceeded');
      
      // Test alert actions
      await page.click('[data-testid="view-category-details"]');
      
      // Should navigate to category breakdown
      await expect(page).toHaveURL(new RegExp('/budget/category/venue'));
      
      // Navigate back and dismiss alert
      await page.goBack();
      await page.click('[data-testid="dismiss-alert"]');
      
      // Verify alert dismissed
      await expect(alertNotification).not.toBeVisible();
      
      // Check alert history
      await page.click('[data-testid="view-alert-history"]');
      
      const alertHistory = page.locator('[data-testid="alert-history-panel"]');
      await expect(alertHistory).toBeVisible();
      
      const latestAlert = alertHistory.locator('[data-testid="alert-history-item"]').first();
      await expect(latestAlert).toContainText('venue');
      await expect(latestAlert).toContainText('threshold exceeded');
    });

    test('should handle multiple notification channels', async ({ page }) => {
      // Mock notification service responses
      await page.route('**/api/notifications/send', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, messageId: 'test-123' })
        });
      });
      
      await page.goto(`/dashboard/clients/${clientId}/budget/alerts`);
      
      // Configure multiple notification channels
      const notificationChannels = page.locator('[data-testid="notification-channels-config"]');
      await expect(notificationChannels).toBeVisible();
      
      // Enable all notification types
      await page.check('[data-testid="enable-email-notifications"]');
      await page.fill('[data-testid="notification-email"]', 'couple@example.com');
      
      await page.check('[data-testid="enable-sms-notifications"]');
      await page.fill('[data-testid="notification-phone"]', '+1234567890');
      
      await page.check('[data-testid="enable-push-notifications"]');
      await page.check('[data-testid="enable-in-app-notifications"]');
      
      // Test notification preferences
      await page.selectOption('[data-testid="notification-frequency"]', 'immediate');
      await page.check('[data-testid="weekend-notifications"]');
      
      // Save notification settings
      await page.click('[data-testid="save-notification-settings"]');
      
      // Trigger test notification
      await page.click('[data-testid="send-test-notification"]');
      
      // Verify test notification success
      const testResult = page.locator('[data-testid="test-notification-result"]');
      await expect(testResult).toBeVisible();
      await expect(testResult).toContainText('Test notifications sent successfully');
      
      // Verify notification log entries
      const notificationLog = page.locator('[data-testid="notification-log"]');
      await expect(notificationLog).toBeVisible();
      
      const logEntries = notificationLog.locator('[data-testid="log-entry"]');
      expect(await logEntries.count()).toBeGreaterThan(0);
      
      await expect(logEntries.first()).toContainText('Email');
      await expect(logEntries.nth(1)).toContainText('SMS');
    });
  });

  test.describe('Financial Reporting - Export & Analytics', () => {
    test('should generate comprehensive financial reports', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reports`);
      
      // Verify reports dashboard
      const reportsPanel = page.locator('[data-testid="financial-reports-panel"]');
      await expect(reportsPanel).toBeVisible();
      
      // Test budget summary report generation
      await page.click('[data-testid="generate-budget-summary"]');
      
      const reportConfig = page.locator('[data-testid="report-configuration-modal"]');
      await expect(reportConfig).toBeVisible();
      
      // Configure report parameters
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      await page.fill('[data-testid="report-start-date"]', '2024-01-01');
      await page.fill('[data-testid="report-end-date"]', '2024-12-31');
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-transaction-details"]');
      
      // Generate report
      await page.click('[data-testid="generate-report"]');
      
      // Wait for report generation
      const generationProgress = page.locator('[data-testid="report-generation-progress"]');
      await expect(generationProgress).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="report-ready-notification"]', { timeout: 30000 });
      
      const reportReady = page.locator('[data-testid="report-ready-notification"]');
      await expect(reportReady).toBeVisible();
      
      // Download report
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-report"]');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/budget-summary.*\.pdf$/);
      
      // Test detailed spending report
      await page.click('[data-testid="generate-detailed-spending"]');
      await page.selectOption('[data-testid="report-format"]', 'excel');
      await page.check('[data-testid="group-by-category"]');
      await page.check('[data-testid="include-receipts"]');
      
      await page.click('[data-testid="generate-report"]');
      await page.waitForSelector('[data-testid="report-ready-notification"]', { timeout: 30000 });
      
      const excelDownload = page.waitForEvent('download');
      await page.click('[data-testid="download-report"]');
      const excelFile = await excelDownload;
      
      expect(excelFile.suggestedFilename()).toMatch(/detailed-spending.*\.xlsx$/);
    });

    test('should support scheduled report generation', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reports`);
      
      // Navigate to scheduled reports section
      await page.click('[data-testid="scheduled-reports-tab"]');
      
      const scheduledReports = page.locator('[data-testid="scheduled-reports-panel"]');
      await expect(scheduledReports).toBeVisible();
      
      // Create new scheduled report
      await page.click('[data-testid="create-scheduled-report"]');
      
      const scheduleModal = page.locator('[data-testid="schedule-report-modal"]');
      await expect(scheduleModal).toBeVisible();
      
      // Configure scheduled report
      await page.fill('[data-testid="report-name"]', 'Monthly Budget Summary');
      await page.selectOption('[data-testid="report-type"]', 'budget-summary');
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      await page.selectOption('[data-testid="schedule-frequency"]', 'monthly');
      await page.selectOption('[data-testid="schedule-day"]', '1'); // First day of month
      
      // Set recipients
      await page.fill('[data-testid="report-recipients"]', 'couple@example.com, planner@example.com');
      
      // Save scheduled report
      await page.click('[data-testid="save-scheduled-report"]');
      
      // Verify scheduled report created
      const reportsList = page.locator('[data-testid="scheduled-reports-list"]');
      await expect(reportsList).toBeVisible();
      
      const newSchedule = reportsList.locator('[data-testid="scheduled-report-item"]').first();
      await expect(newSchedule).toContainText('Monthly Budget Summary');
      await expect(newSchedule).toContainText('monthly');
      await expect(newSchedule).toContainText('Active');
      
      // Test editing scheduled report
      await newSchedule.locator('[data-testid="edit-schedule"]').click();
      await expect(scheduleModal).toBeVisible();
      
      await page.selectOption('[data-testid="schedule-frequency"]', 'weekly');
      await page.click('[data-testid="save-scheduled-report"]');
      
      // Verify update
      await expect(newSchedule).toContainText('weekly');
      
      // Test pausing scheduled report
      await newSchedule.locator('[data-testid="pause-schedule"]').click();
      await expect(newSchedule).toContainText('Paused');
      
      // Test resuming scheduled report
      await newSchedule.locator('[data-testid="resume-schedule"]').click();
      await expect(newSchedule).toContainText('Active');
    });

    test('should provide advanced analytics and insights', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget/reports/analytics`);
      
      // Verify analytics dashboard
      const analyticsPanel = page.locator('[data-testid="budget-analytics-panel"]');
      await expect(analyticsPanel).toBeVisible();
      
      // Test spending trends analysis
      const spendingTrends = page.locator('[data-testid="spending-trends-chart"]');
      await expect(spendingTrends).toBeVisible();
      
      // Test category performance metrics
      const categoryMetrics = page.locator('[data-testid="category-performance-metrics"]');
      await expect(categoryMetrics).toBeVisible();
      
      // Verify key insights section
      const keyInsights = page.locator('[data-testid="budget-insights-section"]');
      await expect(keyInsights).toBeVisible();
      
      const insights = keyInsights.locator('[data-testid="insight-item"]');
      expect(await insights.count()).toBeGreaterThan(0);
      
      // Test variance analysis
      const varianceAnalysis = page.locator('[data-testid="variance-analysis-chart"]');
      await expect(varianceAnalysis).toBeVisible();
      
      // Test forecast predictions
      const forecastChart = page.locator('[data-testid="spending-forecast-chart"]');
      await expect(forecastChart).toBeVisible();
      
      // Test export analytics data
      await page.click('[data-testid="export-analytics-data"]');
      
      const exportOptions = page.locator('[data-testid="analytics-export-options"]');
      await expect(exportOptions).toBeVisible();
      
      await page.selectOption('[data-testid="analytics-export-format"]', 'csv');
      await page.check('[data-testid="include-raw-data"]');
      await page.check('[data-testid="include-calculated-metrics"]');
      
      const analyticsDownload = page.waitForEvent('download');
      await page.click('[data-testid="export-analytics"]');
      const analyticsFile = await analyticsDownload;
      
      expect(analyticsFile.suggestedFilename()).toMatch(/budget-analytics.*\.csv$/);
      
      // Test interactive chart filtering
      await page.click('[data-testid="filter-by-date-range"]');
      await page.fill('[data-testid="analytics-start-date"]', '2024-06-01');
      await page.fill('[data-testid="analytics-end-date"]', '2024-12-31');
      await page.click('[data-testid="apply-date-filter"]');
      
      // Wait for charts to update
      await page.waitForTimeout(2000);
      
      // Verify filtered data display
      const dateRange = page.locator('[data-testid="active-date-range"]');
      await expect(dateRange).toContainText('Jun 2024 - Dec 2024');
    });
  });

  test.describe('Performance & Accessibility', () => {
    test('should meet performance benchmarks', async ({ page }) => {
      // Test page load performance
      const startTime = Date.now();
      await page.goto(`/dashboard/clients/${clientId}/budget`);
      await page.waitForSelector('[data-testid="budget-dashboard"]');
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Test chart rendering performance
      const chartStart = Date.now();
      await page.click('[data-testid="view-detailed-charts"]');
      await page.waitForSelector('[data-testid="detailed-charts-loaded"]');
      const chartLoadTime = Date.now() - chartStart;
      
      // Charts should render within 2 seconds
      expect(chartLoadTime).toBeLessThan(2000);
      
      // Test real-time update performance
      const updateStart = Date.now();
      await page.click('[data-testid="refresh-data"]');
      await page.waitForSelector('[data-testid="data-refreshed"]');
      const updateTime = Date.now() - updateStart;
      
      // Real-time updates should complete within 1 second
      expect(updateTime).toBeLessThan(1000);
    });

    test('should be fully accessible', async ({ page }) => {
      await page.goto(`/dashboard/clients/${clientId}/budget`);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      // Navigate through main budget cards
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();
      }
      
      // Test screen reader support
      const dashboard = page.locator('[data-testid="budget-dashboard"]');
      await expect(dashboard).toHaveAttribute('role', 'main');
      
      // Check ARIA labels on charts
      const pieChart = page.locator('[data-testid="budget-pie-chart"]');
      await expect(pieChart).toHaveAttribute('aria-label');
      
      // Test color contrast compliance
      const primaryButton = page.locator('[data-testid="add-new-transaction"]');
      await expect(primaryButton).toHaveCSS('background-color', /rgb\(99, 102, 241\)/); // Untitled UI primary color
      
      // Test focus indicators
      await primaryButton.focus();
      await expect(primaryButton).toHaveCSS('outline-style', 'solid');
      
      // Test alternative text for visual elements
      const chartImages = page.locator('canvas');
      for (let i = 0; i < await chartImages.count(); i++) {
        const chart = chartImages.nth(i);
        await expect(chart).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Integration & Data Flow', () => {
    test('should integrate seamlessly with existing WedSync systems', async ({ page }) => {
      // Test client data integration
      await page.goto(`/dashboard/clients/${clientId}`);
      
      // Navigate to budget from client profile
      await page.click('[data-testid="client-budget-tab"]');
      await expect(page).toHaveURL(new RegExp(`/clients/${clientId}/budget`));
      
      // Verify client context maintained
      const clientHeader = page.locator('[data-testid="client-header"]');
      await expect(clientHeader).toBeVisible();
      await expect(clientHeader).toContainText('Budget Management');
      
      // Test vendor integration
      await page.goto(`/dashboard/clients/${clientId}/budget/vendors`);
      
      const vendorBudgetAllocation = page.locator('[data-testid="vendor-budget-allocation"]');
      await expect(vendorBudgetAllocation).toBeVisible();
      
      // Verify vendor payments tracked
      const vendorPayments = page.locator('[data-testid="vendor-payment-tracking"]');
      await expect(vendorPayments).toBeVisible();
      
      // Test contract integration
      await page.click('[data-testid="link-to-contract"]');
      
      const contractModal = page.locator('[data-testid="contract-payment-modal"]');
      await expect(contractModal).toBeVisible();
      
      // Verify milestone payments
      const milestonePayments = page.locator('[data-testid="milestone-payments-list"]');
      await expect(milestonePayments).toBeVisible();
      
      // Test timeline integration
      await page.goto(`/dashboard/clients/${clientId}/timeline`);
      await page.click('[data-testid="budget-milestones-view"]');
      
      const timelineBudgetItems = page.locator('[data-testid="timeline-budget-item"]');
      expect(await timelineBudgetItems.count()).toBeGreaterThan(0);
    });

    test('should handle real-time data synchronization', async ({ page }) => {
      // Open budget dashboard in two tabs
      const secondPage = await page.context().newPage();
      
      await page.goto(`/dashboard/clients/${clientId}/budget`);
      await secondPage.goto(`/dashboard/clients/${clientId}/budget`);
      
      // Get initial budget total from first tab
      const initialBudgetPage1 = await page.locator('[data-testid="total-spent-amount"]').textContent();
      
      // Add transaction in second tab
      await secondPage.click('[data-testid="quick-add-transaction"]');
      await secondPage.fill('[data-testid="transaction-amount"]', '750');
      await secondPage.selectOption('[data-testid="transaction-category"]', 'flowers');
      await secondPage.fill('[data-testid="transaction-description"]', 'Bridal bouquet deposit');
      await secondPage.click('[data-testid="save-transaction"]');
      
      // Wait for real-time sync
      await page.waitForTimeout(3000);
      
      // Verify first tab updated automatically
      const updatedBudgetPage1 = await page.locator('[data-testid="total-spent-amount"]').textContent();
      expect(updatedBudgetPage1).not.toBe(initialBudgetPage1);
      
      // Verify real-time notification in first tab
      const realtimeNotification = page.locator('[data-testid="realtime-update-notification"]');
      await expect(realtimeNotification).toBeVisible({ timeout: 5000 });
      await expect(realtimeNotification).toContainText('Budget updated');
      
      await secondPage.close();
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data if needed
    await page.evaluate(() => {
      // Clear any local storage or session data
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});