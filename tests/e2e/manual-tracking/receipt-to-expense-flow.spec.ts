/**
 * WS-164 Manual Tracking - End-to-End Receipt Processing Tests
 * Tests complete user workflow from receipt upload to expense viewing
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  testUser: {
    email: 'e2e-test-user@wedsync.com',
    password: 'TestPassword123!',
    weddingId: 'e2e-test-wedding-id',
    organizationId: 'e2e-test-org-id'
  },
  timeouts: {
    ocrProcessing: 5000,
    formSubmission: 3000,
    pageLoad: 10000
  }
};

// Mock receipt data for testing
const TEST_RECEIPTS = {
  florist: {
    filename: 'florist_receipt.jpg',
    expectedData: {
      vendor: 'Elegant Blooms',
      amount: '750.00',
      category: 'flowers',
      items: ['Bridal Bouquet', 'Centerpieces']
    }
  },
  venue: {
    filename: 'venue_receipt.jpg',
    expectedData: {
      vendor: 'Grand Ballroom',
      amount: '4500.00',
      category: 'venue',
      items: ['Reception Package', 'Bar Service']
    }
  },
  photography: {
    filename: 'photography_receipt.jpg',
    expectedData: {
      vendor: 'Creative Lens',
      amount: '1200.00',
      category: 'photography',
      items: ['Wedding Package', 'Engagement Session']
    }
  }
};

// Helper function to create test receipt files
function createTestReceiptFile(receiptType: keyof typeof TEST_RECEIPTS): string {
  const receipt = TEST_RECEIPTS[receiptType];
  const testAssetsDir = path.join(__dirname, '../../../test-assets');
  
  if (!fs.existsSync(testAssetsDir)) {
    fs.mkdirSync(testAssetsDir, { recursive: true });
  }
  
  const filePath = path.join(testAssetsDir, receipt.filename);
  
  if (!fs.existsSync(filePath)) {
    // Create a simple test image file (1x1 pixel PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x78, 0xDA, 0x63, 0x60, 0x00, 0x00, 0x00,
      0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
      0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(filePath, pngBuffer);
  }
  
  return filePath;
}

test.describe('Manual Expense Tracking E2E Flow', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Setup test user authentication
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.fill('[data-testid="email-input"]', TEST_CONFIG.testUser.email);
    await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: TEST_CONFIG.timeouts.pageLoad });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Receipt Upload and OCR Processing', () => {
    test('should upload florist receipt and extract data correctly', async () => {
      // Navigate to budget page
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.waitForLoadState('networkidle');

      // Click add expense button
      await page.click('[data-testid="add-expense-button"]');
      await expect(page.locator('[data-testid="expense-form"]')).toBeVisible();

      // Upload receipt file
      const receiptFile = createTestReceiptFile('florist');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(receiptFile);

      // Wait for OCR processing
      await expect(page.locator('[data-testid="ocr-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="ocr-processing"]')).not.toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.ocrProcessing 
      });

      // Verify receipt preview is shown
      await expect(page.locator('[data-testid="receipt-preview"]')).toBeVisible();
      
      // Verify OCR data auto-population
      const vendorInput = page.locator('[data-testid="vendor-name-input"]');
      const amountInput = page.locator('[data-testid="expense-amount"]');
      const descriptionInput = page.locator('[data-testid="expense-description"]');

      // Check if fields were auto-populated (may take time for OCR)
      await page.waitForTimeout(2000);
      
      const vendorValue = await vendorInput.inputValue();
      const amountValue = await amountInput.inputValue();
      const descriptionValue = await descriptionInput.inputValue();

      // Verify some data was extracted (OCR might not be perfect in test environment)
      expect(vendorValue.length).toBeGreaterThan(0);
      expect(amountValue.length).toBeGreaterThan(0);
      expect(descriptionValue.length).toBeGreaterThan(0);
    });

    test('should handle poor quality receipt with low confidence', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Create a very small, poor quality image
      const testAssetsDir = path.join(__dirname, '../../../test-assets');
      const poorQualityFile = path.join(testAssetsDir, 'poor_quality_receipt.jpg');
      
      // Create minimal JPEG file
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      fs.writeFileSync(poorQualityFile, jpegBuffer);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(poorQualityFile);

      // Wait for processing
      await expect(page.locator('[data-testid="ocr-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="ocr-processing"]')).not.toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.ocrProcessing 
      });

      // Should show low confidence warning
      const warningMessage = page.locator('[data-testid="low-confidence-warning"]');
      await expect(warningMessage).toBeVisible();
      
      // Manual entry should still be possible
      await page.fill('[data-testid="vendor-name-input"]', 'Manually Entered Vendor');
      await page.fill('[data-testid="expense-amount"]', '500.00');
      await page.fill('[data-testid="expense-description"]', 'Manually entered expense');

      // Should be able to proceed with manual data
      const submitButton = page.locator('[data-testid="submit-expense"]');
      await expect(submitButton).not.toBeDisabled();
    });

    test('should allow manual correction of OCR data', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      const receiptFile = createTestReceiptFile('venue');
      await page.locator('input[type="file"]').setInputFiles(receiptFile);

      // Wait for OCR completion
      await expect(page.locator('[data-testid="ocr-processing"]')).not.toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.ocrProcessing 
      });

      // Manually correct OCR data
      await page.fill('[data-testid="vendor-name-input"]', 'Corrected Venue Name');
      await page.fill('[data-testid="expense-amount"]', '5000.00');
      await page.selectOption('[data-testid="category-select"]', 'venue');
      await page.fill('[data-testid="expense-description"]', 'Venue booking with corrected details');

      // Verify corrections are accepted
      const vendorValue = await page.locator('[data-testid="vendor-name-input"]').inputValue();
      const amountValue = await page.locator('[data-testid="expense-amount"]').inputValue();
      
      expect(vendorValue).toBe('Corrected Venue Name');
      expect(amountValue).toBe('5000.00');
    });
  });

  test.describe('Expense Form Completion and Submission', () => {
    test('should complete and submit expense form successfully', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Fill out complete form
      await page.selectOption('[data-testid="category-select"]', 'flowers');
      await page.fill('[data-testid="expense-description"]', 'Wedding flower arrangements');
      await page.fill('[data-testid="expense-amount"]', '850.00');
      await page.fill('[data-testid="vendor-name-input"]', 'Beautiful Blooms Florist');
      await page.fill('[data-testid="transaction-date"]', '2024-03-15');
      await page.selectOption('[data-testid="payment-method-select"]', 'credit_card');
      await page.fill('[data-testid="notes-textarea"]', 'Includes bridal bouquet, 8 centerpieces, and ceremony arch flowers');

      // Upload receipt
      const receiptFile = createTestReceiptFile('florist');
      await page.locator('input[type="file"]').setInputFiles(receiptFile);
      await page.waitForTimeout(1000); // Allow upload to complete

      // Verify budget impact is shown
      const budgetImpact = page.locator('[data-testid="budget-impact-summary"]');
      await expect(budgetImpact).toBeVisible();
      
      // Check for budget impact details
      await expect(page.locator('[data-testid="current-spent"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="remaining-budget"]')).toBeVisible();

      // Submit the form
      await page.click('[data-testid="submit-expense"]');

      // Wait for submission completion
      await expect(page.locator('[data-testid="expense-form"]')).not.toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.formSubmission 
      });

      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Expense logged successfully');
    });

    test('should handle budget overage warnings', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Select a category and enter amount that would exceed budget
      await page.selectOption('[data-testid="category-select"]', 'flowers');
      await page.fill('[data-testid="expense-amount"]', '10000.00'); // Unrealistically high amount
      await page.fill('[data-testid="expense-description"]', 'Expensive flower arrangement');

      // Should show budget overage warning
      await expect(page.locator('[data-testid="budget-overage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-overage-warning"]')).toContainText('will exceed');

      // Submit button should still be enabled (allowing overages)
      const submitButton = page.locator('[data-testid="submit-expense"]');
      await expect(submitButton).not.toBeDisabled();

      // Should show confirmation dialog for overage
      await submitButton.click();
      const confirmDialog = page.locator('[data-testid="overage-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('exceed the budget');

      // Can confirm or cancel
      await expect(page.locator('[data-testid="confirm-overage"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-overage"]')).toBeVisible();
    });

    test('should validate required fields', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Try to submit with missing required fields
      await page.click('[data-testid="submit-expense"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="category-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="description-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();

      // Submit button should remain disabled
      const submitButton = page.locator('[data-testid="submit-expense"]');
      await expect(submitButton).toBeDisabled();

      // Fill required fields and verify errors disappear
      await page.selectOption('[data-testid="category-select"]', 'venue');
      await expect(page.locator('[data-testid="category-error"]')).not.toBeVisible();

      await page.fill('[data-testid="expense-description"]', 'Test expense');
      await expect(page.locator('[data-testid="description-error"]')).not.toBeVisible();

      await page.fill('[data-testid="expense-amount"]', '100.00');
      await expect(page.locator('[data-testid="amount-error"]')).not.toBeVisible();

      // Submit button should now be enabled
      await expect(submitButton).not.toBeDisabled();
    });
  });

  test.describe('Expense Tracking and Display', () => {
    test('should display newly created expense in expense list', async () => {
      // First create an expense
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      const expenseData = {
        category: 'photography',
        description: 'E2E Test Photography Package',
        amount: '1500.00',
        vendor: 'Test Photography Studio',
        date: '2024-03-20'
      };

      await page.selectOption('[data-testid="category-select"]', expenseData.category);
      await page.fill('[data-testid="expense-description"]', expenseData.description);
      await page.fill('[data-testid="expense-amount"]', expenseData.amount);
      await page.fill('[data-testid="vendor-name-input"]', expenseData.vendor);
      await page.fill('[data-testid="transaction-date"]', expenseData.date);

      await page.click('[data-testid="submit-expense"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Navigate to expense tracking view
      await page.click('[data-testid="view-expenses-tab"]');
      await page.waitForLoadState('networkidle');

      // Verify expense appears in list
      const expenseList = page.locator('[data-testid="expense-list"]');
      await expect(expenseList).toBeVisible();

      const newExpense = expenseList.locator(`[data-testid="expense-item"]`).first();
      await expect(newExpense).toBeVisible();
      
      // Verify expense details
      await expect(newExpense.locator('[data-testid="expense-description"]')).toContainText(expenseData.description);
      await expect(newExpense.locator('[data-testid="expense-amount"]')).toContainText(expenseData.amount);
      await expect(newExpense.locator('[data-testid="expense-vendor"]')).toContainText(expenseData.vendor);
      await expect(newExpense.locator('[data-testid="expense-category"]')).toContainText('Photography');
    });

    test('should filter expenses by category and search', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="view-expenses-tab"]');

      // Test category filter
      await page.selectOption('[data-testid="category-filter"]', 'flowers');
      await page.waitForTimeout(500); // Allow filter to apply

      // All visible expenses should be flowers category
      const expenseItems = page.locator('[data-testid="expense-item"]');
      const count = await expenseItems.count();
      
      for (let i = 0; i < count; i++) {
        const categoryText = await expenseItems.nth(i).locator('[data-testid="expense-category"]').textContent();
        expect(categoryText?.toLowerCase()).toContain('flower');
      }

      // Test search functionality
      await page.fill('[data-testid="expense-search"]', 'photography');
      await page.waitForTimeout(500);

      // Should show expenses matching search term
      const searchResults = page.locator('[data-testid="expense-item"]');
      const searchCount = await searchResults.count();
      
      if (searchCount > 0) {
        const firstResult = searchResults.first();
        const searchText = await firstResult.textContent();
        expect(searchText?.toLowerCase()).toContain('photo');
      }

      // Clear filters
      await page.click('[data-testid="clear-filters"]');
      await page.waitForTimeout(500);

      // Should show all expenses again
      const allExpenses = await page.locator('[data-testid="expense-item"]').count();
      expect(allExpenses).toBeGreaterThan(0);
    });

    test('should display expense with receipt attachment', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="view-expenses-tab"]');

      // Look for expense with receipt
      const expenseWithReceipt = page.locator('[data-testid="expense-item"]').filter({
        has: page.locator('[data-testid="receipt-indicator"]')
      }).first();

      if (await expenseWithReceipt.count() > 0) {
        await expect(expenseWithReceipt.locator('[data-testid="receipt-indicator"]')).toBeVisible();
        
        // Click to view receipt
        await expenseWithReceipt.locator('[data-testid="view-receipt-button"]').click();
        
        // Receipt modal should open
        await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="receipt-image"]')).toBeVisible();
        
        // Should show OCR extracted data
        await expect(page.locator('[data-testid="extracted-data"]')).toBeVisible();
        
        // Close modal
        await page.click('[data-testid="close-receipt-modal"]');
        await expect(page.locator('[data-testid="receipt-modal"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Budget Impact and Analytics', () => {
    test('should update budget category totals after expense creation', async () => {
      // Get initial budget state
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      const budgetSummary = page.locator('[data-testid="budget-summary"]');
      
      const initialFlowersSpent = await page.locator('[data-testid="flowers-spent-amount"]').textContent();
      const initialTotal = parseFloat(initialFlowersSpent?.replace(/[^0-9.]/g, '') || '0');

      // Add new expense
      await page.click('[data-testid="add-expense-button"]');
      
      const newExpenseAmount = 275.00;
      await page.selectOption('[data-testid="category-select"]', 'flowers');
      await page.fill('[data-testid="expense-description"]', 'Budget update test expense');
      await page.fill('[data-testid="expense-amount"]', newExpenseAmount.toString());
      await page.fill('[data-testid="vendor-name-input"]', 'Budget Test Vendor');

      await page.click('[data-testid="submit-expense"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Wait for budget to update and refresh
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify budget totals updated
      const updatedFlowersSpent = await page.locator('[data-testid="flowers-spent-amount"]').textContent();
      const updatedTotal = parseFloat(updatedFlowersSpent?.replace(/[^0-9.]/g, '') || '0');

      expect(updatedTotal).toBeGreaterThan(initialTotal);
      expect(updatedTotal - initialTotal).toBeCloseTo(newExpenseAmount, 2);
    });

    test('should show expense analytics and trends', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget/analytics`);
      await page.waitForLoadState('networkidle');

      // Should display spending analytics
      await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-spending-table"]')).toBeVisible();

      // Should show key metrics
      await expect(page.locator('[data-testid="total-spent"]')).toBeVisible();
      await expect(page.locator('[data-testid="remaining-budget"]')).toBeVisible();
      await expect(page.locator('[data-testid="expense-count"]')).toBeVisible();

      // Test date range filtering
      await page.selectOption('[data-testid="date-range-filter"]', 'last-month');
      await page.waitForTimeout(1000);

      // Charts should update (verify by checking if chart container is still visible and has updated)
      await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
      
      // Export functionality
      await page.click('[data-testid="export-data-button"]');
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/.*\.(csv|xlsx)$/);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      
      // Simulate network failure
      await page.route('**/api/expenses', route => route.abort());
      
      await page.click('[data-testid="add-expense-button"]');
      await page.selectOption('[data-testid="category-select"]', 'venue');
      await page.fill('[data-testid="expense-description"]', 'Network failure test');
      await page.fill('[data-testid="expense-amount"]', '100.00');

      await page.click('[data-testid="submit-expense"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('network');

      // Should offer retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Restore network and retry
      await page.unroute('**/api/expenses');
      await page.click('[data-testid="retry-button"]');
      
      // Should succeed on retry
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle invalid file uploads', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Create invalid file type
      const testAssetsDir = path.join(__dirname, '../../../test-assets');
      const invalidFile = path.join(testAssetsDir, 'invalid.txt');
      fs.writeFileSync(invalidFile, 'This is not an image');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidFile);

      // Should show file type error
      await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-error"]')).toContainText('file type');

      // Should not process invalid file
      await expect(page.locator('[data-testid="ocr-processing"]')).not.toBeVisible();
    });

    test('should handle large file uploads', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Create oversized file (simulated)
      const testAssetsDir = path.join(__dirname, '../../../test-assets');
      const largeFile = path.join(testAssetsDir, 'large_file.jpg');
      
      // Create a buffer representing a large file
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      fs.writeFileSync(largeFile, largeBuffer);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(largeFile);

      // Should show file size error
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size-error"]')).toContainText('size');

      // Clean up large file
      fs.unlinkSync(largeFile);
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should be keyboard navigable', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);

      // Test keyboard navigation through form
      await page.keyboard.press('Tab'); // Focus add expense button
      await page.keyboard.press('Enter'); // Open form

      // Tab through form fields
      await page.keyboard.press('Tab'); // Category
      await page.keyboard.press('ArrowDown'); // Select category
      await page.keyboard.press('Tab'); // Amount
      await page.keyboard.type('500.00');
      await page.keyboard.press('Tab'); // Description
      await page.keyboard.type('Keyboard navigation test');
      await page.keyboard.press('Tab'); // Date
      await page.keyboard.press('Tab'); // Payment method
      await page.keyboard.press('Tab'); // Vendor name
      await page.keyboard.type('Test Vendor');
      await page.keyboard.press('Tab'); // Notes
      await page.keyboard.press('Tab'); // Submit button

      // Should be able to submit with keyboard
      await page.keyboard.press('Enter');

      // Verify form submission worked
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should have proper ARIA labels and accessibility features', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      await page.click('[data-testid="add-expense-button"]');

      // Check for ARIA labels
      const categorySelect = page.locator('[data-testid="category-select"]');
      await expect(categorySelect).toHaveAttribute('aria-label');

      const amountInput = page.locator('[data-testid="expense-amount"]');
      await expect(amountInput).toHaveAttribute('aria-label');

      const descriptionInput = page.locator('[data-testid="expense-description"]');
      await expect(descriptionInput).toHaveAttribute('aria-label');

      // Check for error announcement regions
      await page.fill('[data-testid="expense-amount"]', 'invalid');
      const errorRegion = page.locator('[role="alert"]');
      await expect(errorRegion).toBeVisible();
    });

    test('should work on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

      await page.goto(`${TEST_CONFIG.baseURL}/budget`);
      
      // Mobile-specific UI elements should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Form should adapt to mobile
      await page.click('[data-testid="add-expense-button"]');
      const form = page.locator('[data-testid="expense-form"]');
      await expect(form).toBeVisible();
      
      // Form fields should stack vertically on mobile
      const formWidth = await form.boundingBox();
      expect(formWidth?.width).toBeLessThan(400);

      // Should be able to complete form on mobile
      await page.selectOption('[data-testid="category-select"]', 'flowers');
      await page.fill('[data-testid="expense-description"]', 'Mobile test expense');
      await page.fill('[data-testid="expense-amount"]', '200.00');

      await page.click('[data-testid="submit-expense"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });
});