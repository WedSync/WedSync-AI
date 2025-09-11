/**
 * End-to-End Tests for WS-162, WS-163, WS-164 Integration Systems
 * Team C E2E Testing Suite - Complete User Workflows
 * Tests real user interactions across all integration features
 */

import { test, expect, Page } from '@playwright/test';

// Test data setup
const testWedding = {
  id: 'test-wedding-e2e-123',
  coupleName: 'John & Jane Test',
  weddingDate: '2024-08-15',
  budget: 50000
};

const testUser = {
  email: 'test.couple@wedsync.com',
  password: 'TestPassword123!'
};

test.describe('WS-162: Helper Schedule Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  });

  test('Real-time schedule updates flow', async ({ page }) => {
    // Navigate to schedule management
    await page.click('[data-testid="schedule-nav"]');
    await expect(page.locator('[data-testid="schedule-page"]')).toBeVisible();

    // Add new task to schedule
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-title"]', 'Venue walkthrough');
    await page.fill('[data-testid="task-date"]', '2024-07-15');
    await page.selectOption('[data-testid="task-assignee"]', 'Wedding Helper');
    
    const startTime = Date.now();
    await page.click('[data-testid="save-task-button"]');
    
    // Verify real-time update appears immediately
    await expect(page.locator('[data-testid="task-venue-walkthrough"]')).toBeVisible({ timeout: 1000 });
    
    const updateTime = Date.now() - startTime;
    expect(updateTime).toBeLessThan(100); // Success criteria: <100ms
  });

  test('Multi-channel notification system', async ({ page }) => {
    // Navigate to notification settings
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="notification-settings"]');
    
    // Configure multi-channel notifications
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.check('[data-testid="push-notifications"]');
    await page.click('[data-testid="save-notification-settings"]');
    
    // Trigger a schedule change
    await page.goto('/schedule');
    await page.click('[data-testid="edit-task-venue-walkthrough"]');
    await page.fill('[data-testid="task-date"]', '2024-07-16'); // Change date
    await page.click('[data-testid="update-task-button"]');
    
    // Verify notification sent confirmation
    await expect(page.locator('[data-testid="notification-sent-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-channels"]')).toContainText('Email, SMS, Push');
  });

  test('Google Calendar integration sync', async ({ page }) => {
    // Navigate to calendar integration
    await page.click('[data-testid="integrations-nav"]');
    await page.click('[data-testid="calendar-integration"]');
    
    // Connect Google Calendar (mock OAuth flow)
    await page.click('[data-testid="connect-google-calendar"]');
    await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 });
    
    // Mock successful OAuth return
    await page.goto('/integrations/calendar?auth_success=true');
    await expect(page.locator('[data-testid="calendar-connected"]')).toBeVisible();
    
    // Test calendar sync
    await page.click('[data-testid="sync-calendar-button"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced successfully');
  });
});

test.describe('WS-163: Budget Category Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.goto('/budget');
  });

  test('ML-powered expense categorization workflow', async ({ page }) => {
    // Add new expense
    await page.click('[data-testid="add-expense-button"]');
    await page.fill('[data-testid="expense-description"]', 'Downtown Event Hall rental payment');
    await page.fill('[data-testid="expense-amount"]', '5000');
    await page.fill('[data-testid="vendor-name"]', 'Grand Ballroom Events');
    
    await page.click('[data-testid="categorize-expense-button"]');
    
    // Verify ML categorization
    await expect(page.locator('[data-testid="suggested-category"]')).toContainText('Venue');
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('95%'); // High confidence
    
    // Accept ML suggestion
    await page.click('[data-testid="accept-category-button"]');
    
    // Verify expense added to correct category
    await expect(page.locator('[data-testid="venue-category-total"]')).toContainText('$5,000');
  });

  test('Real-time budget calculation and alerts', async ({ page }) => {
    // Set up budget category
    await page.click('[data-testid="venue-category"]');
    await page.fill('[data-testid="venue-budget"]', '15000');
    await page.fill('[data-testid="venue-threshold"]', '80'); // 80% threshold
    await page.click('[data-testid="save-category-budget"]');
    
    // Add expense that exceeds threshold
    await page.click('[data-testid="add-venue-expense"]');
    await page.fill('[data-testid="expense-amount"]', '13000'); // This will exceed 80% of $15,000
    
    const startTime = Date.now();
    await page.click('[data-testid="save-expense-button"]');
    
    // Verify real-time budget update
    await expect(page.locator('[data-testid="venue-spent-amount"]')).toContainText('$13,000');
    await expect(page.locator('[data-testid="venue-remaining"]')).toContainText('$2,000');
    
    const updateTime = Date.now() - startTime;
    expect(updateTime).toBeLessThan(100); // Success criteria: <100ms
    
    // Verify threshold alert triggered
    await expect(page.locator('[data-testid="budget-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-message"]')).toContainText('Budget threshold exceeded');
    await expect(page.locator('[data-testid="alert-severity"]')).toContainText('High');
  });

  test('Banking integration and transaction sync', async ({ page }) => {
    // Navigate to banking integration
    await page.click('[data-testid="banking-integration"]');
    
    // Connect bank account (mock Plaid Link)
    await page.click('[data-testid="connect-bank-account"]');
    await page.waitForSelector('[data-testid="plaid-link-modal"]');
    
    // Select mock bank for testing
    await page.click('[data-testid="select-test-bank"]');
    await page.fill('[data-testid="test-username"]', 'user_good');
    await page.fill('[data-testid="test-password"]', 'pass_good');
    await page.click('[data-testid="submit-credentials"]');
    
    // Select checking account
    await page.click('[data-testid="checking-account"]');
    await page.click('[data-testid="continue-button"]');
    
    // Verify connection successful
    await expect(page.locator('[data-testid="bank-connected"]')).toBeVisible();
    
    // Test transaction sync
    await page.click('[data-testid="sync-transactions"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Syncing transactions...');
    
    // Verify transactions imported and categorized
    await expect(page.locator('[data-testid="imported-transactions"]')).toBeVisible();
    await expect(page.locator('[data-testid="categorized-transaction"]')).toContainText('Wedding Flowers LLC');
  });

  test('Budget recommendations and vendor suggestions', async ({ page }) => {
    // Navigate to recommendations
    await page.click('[data-testid="budget-recommendations"]');
    
    // Select category for recommendations
    await page.selectOption('[data-testid="category-select"]', 'photography');
    await page.fill('[data-testid="min-budget"]', '2000');
    await page.fill('[data-testid="max-budget"]', '4000');
    
    await page.click('[data-testid="get-recommendations"]');
    
    // Verify vendor suggestions loaded
    await expect(page.locator('[data-testid="vendor-suggestions"]')).toBeVisible();
    
    const vendorCards = page.locator('[data-testid="vendor-card"]');
    await expect(vendorCards).toHaveCount(5);
    
    // Verify each card has required information
    const firstVendor = vendorCards.first();
    await expect(firstVendor.locator('[data-testid="vendor-name"]')).toBeVisible();
    await expect(firstVendor.locator('[data-testid="vendor-price-range"]')).toBeVisible();
    await expect(firstVendor.locator('[data-testid="vendor-rating"]')).toBeVisible();
  });
});

test.describe('WS-164: Manual Tracking Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.goto('/expenses');
  });

  test('Receipt upload and OCR processing workflow', async ({ page }) => {
    // Upload receipt file
    await page.click('[data-testid="upload-receipt-button"]');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="choose-file-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./tests/fixtures/sample-receipt.jpg');
    
    // Start OCR processing
    const startTime = Date.now();
    await page.click('[data-testid="process-receipt-button"]');
    
    // Verify OCR processing status
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('Processing...');
    
    // Wait for OCR completion
    await expect(page.locator('[data-testid="ocr-completed"]')).toBeVisible({ timeout: 5000 });
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(5000); // OCR should complete within 5 seconds
    
    // Verify extracted data
    await expect(page.locator('[data-testid="merchant-name"]')).toContainText('Wedding Flowers LLC');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$450.00');
    await expect(page.locator('[data-testid="receipt-date"]')).toContainText('06/10/2024');
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('95%');
  });

  test('Expense approval workflow', async ({ page }) => {
    // Create expense that requires approval
    await page.click('[data-testid="add-manual-expense"]');
    await page.fill('[data-testid="expense-description"]', 'Additional catering costs');
    await page.fill('[data-testid="expense-amount"]', '750'); // Above $500 threshold
    await page.selectOption('[data-testid="expense-category"]', 'catering');
    
    await page.click('[data-testid="submit-expense"]');
    
    // Verify approval workflow started
    await expect(page.locator('[data-testid="approval-required"]')).toBeVisible();
    await expect(page.locator('[data-testid="approval-status"]')).toContainText('Pending Couple Review');
    
    // Navigate to approval dashboard
    await page.click('[data-testid="view-pending-approvals"]');
    
    // Find the expense in pending approvals
    const expenseRow = page.locator('[data-testid="expense-approval-item"]').first();
    await expect(expenseRow.locator('[data-testid="expense-description"]')).toContainText('Additional catering costs');
    
    // Approve the expense (as couple)
    await expenseRow.locator('[data-testid="approve-button"]').click();
    await page.fill('[data-testid="approval-notes"]', 'Approved - necessary additional costs');
    await page.click('[data-testid="confirm-approval"]');
    
    // Verify status updated
    await expect(expenseRow.locator('[data-testid="expense-status"]')).toContainText('Approved');
  });

  test('Accounting API integration workflow', async ({ page }) => {
    // Navigate to accounting integrations
    await page.click('[data-testid="integrations-nav"]');
    await page.click('[data-testid="accounting-integration"]');
    
    // Connect QuickBooks (mock OAuth)
    await page.click('[data-testid="connect-quickbooks"]');
    await page.waitForURL(/developer\.intuit\.com/);
    
    // Mock successful OAuth return
    await page.goto('/integrations/accounting?provider=quickbooks&auth_success=true');
    await expect(page.locator('[data-testid="quickbooks-connected"]')).toBeVisible();
    
    // Create approved expense to sync
    await page.goto('/expenses');
    await page.click('[data-testid="add-manual-expense"]');
    await page.fill('[data-testid="expense-description"]', 'Venue deposit payment');
    await page.fill('[data-testid="expense-amount"]', '1200');
    await page.selectOption('[data-testid="expense-category"]', 'venue');
    await page.click('[data-testid="submit-expense"]');
    
    // Auto-approve (under threshold)
    await expect(page.locator('[data-testid="expense-approved"]')).toBeVisible();
    
    // Test sync to QuickBooks
    await page.click('[data-testid="sync-to-accounting"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Syncing to QuickBooks...');
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 3000 });
    
    // Verify external transaction ID assigned
    await expect(page.locator('[data-testid="quickbooks-transaction-id"]')).toBeVisible();
  });

  test('File security and validation', async ({ page }) => {
    // Test file type validation
    await page.click('[data-testid="upload-receipt-button"]');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="choose-file-button"]');
    const fileChooser = await fileChooserPromise;
    
    // Try to upload invalid file type
    await fileChooser.setFiles('./tests/fixtures/malicious-script.exe');
    
    // Verify rejection
    await expect(page.locator('[data-testid="file-type-error"]')).toContainText('Invalid file type');
    
    // Test file size validation
    const largeFileChooser = page.waitForEvent('filechooser');
    await page.click('[data-testid="choose-file-button"]');
    const largeFile = await largeFileChooser;
    await largeFile.setFiles('./tests/fixtures/large-image.jpg'); // >10MB file
    
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File size exceeds limit');
  });
});

test.describe('Cross-Feature Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
  });

  test('Receipt processing to budget update workflow', async ({ page }) => {
    // Start at expense upload page
    await page.goto('/expenses/upload');
    
    // Upload receipt
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-receipt"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./tests/fixtures/catering-receipt.jpg');
    
    // Process OCR
    await page.click('[data-testid="process-receipt"]');
    await expect(page.locator('[data-testid="ocr-completed"]')).toBeVisible();
    
    // Verify extracted data and category suggestion
    await expect(page.locator('[data-testid="suggested-category"]')).toContainText('Catering');
    await expect(page.locator('[data-testid="extracted-amount"]')).toContainText('$3,500');
    
    // Accept categorization and save
    await page.click('[data-testid="accept-and-save"]');
    
    // Navigate to budget page to verify update
    await page.goto('/budget');
    await page.click('[data-testid="catering-category"]');
    
    // Verify budget automatically updated
    await expect(page.locator('[data-testid="catering-spent"]')).toContainText('$3,500');
    await expect(page.locator('[data-testid="catering-remaining"]')).toBeVisible();
  });

  test('Schedule milestone triggers budget review', async ({ page }) => {
    // Navigate to schedule
    await page.goto('/schedule');
    
    // Mark a milestone as complete
    await page.click('[data-testid="milestone-venue-booking"]');
    await page.check('[data-testid="milestone-completed"]');
    await page.click('[data-testid="update-milestone"]');
    
    // Verify budget review notification appears
    await expect(page.locator('[data-testid="budget-review-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-message"]')).toContainText(
      'Venue booking deadline reached. Review your budget allocations.'
    );
    
    // Click to go to budget review
    await page.click('[data-testid="review-budget-button"]');
    
    // Verify redirected to budget with recommendations
    await expect(page).toHaveURL(/\/budget\/review/);
    await expect(page.locator('[data-testid="budget-recommendations"]')).toBeVisible();
  });

  test('Real-time notifications across all features', async ({ page }) => {
    // Open multiple tabs to test real-time sync
    const page2 = await page.context().newPage();
    
    // Login on second tab
    await page2.goto('/login');
    await page2.fill('[data-testid="email-input"]', testUser.email);
    await page2.fill('[data-testid="password-input"]', testUser.password);
    await page2.click('[data-testid="login-button"]');
    
    // Page 1: Schedule update
    await page.goto('/schedule');
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-title"]', 'Final dress fitting');
    await page.click('[data-testid="save-task"]');
    
    // Page 2: Should see real-time update
    await page2.goto('/schedule');
    await expect(page2.locator('[data-testid="task-final-dress-fitting"]')).toBeVisible({ timeout: 2000 });
    
    // Page 2: Budget update
    await page2.goto('/budget');
    await page2.click('[data-testid="add-expense-button"]');
    await page2.fill('[data-testid="expense-amount"]', '500');
    await page2.click('[data-testid="save-expense"]');
    
    // Page 1: Should see budget notification
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="budget-update-notification"]')).toBeVisible({ timeout: 2000 });
    
    await page2.close();
  });
});

test.describe('Performance and Monitoring E2E', () => {
  test('Performance metrics tracking', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Navigate to admin monitoring (if user has permissions)
    await page.goto('/admin/monitoring');
    
    // Verify performance metrics dashboard
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Check that key metrics are displayed
    await expect(page.locator('[data-testid="realtime-latency"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-calc-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="ocr-processing-time"]')).toBeVisible();
    
    // Verify metrics are within success criteria
    const realtimeLatency = await page.locator('[data-testid="realtime-latency-value"]').textContent();
    expect(parseInt(realtimeLatency || '0')).toBeLessThan(100); // <100ms requirement
  });

  test('Health check monitoring', async ({ page }) => {
    await page.goto('/api/health');
    
    // Verify health check endpoint returns proper status
    await expect(page.locator('pre')).toContainText('"status": "healthy"');
    await expect(page.locator('pre')).toContainText('"components"');
    
    // Verify all integration components are healthy
    await expect(page.locator('pre')).toContainText('"WS-162": "healthy"');
    await expect(page.locator('pre')).toContainText('"WS-163": "healthy"');
    await expect(page.locator('pre')).toContainText('"WS-164": "healthy"');
  });
});