/**
 * E2E Test Suite: Budget Export Flow
 * WS-166 - Team E - Round 1
 * 
 * Tests complete user journey from login to export download
 * Covers all export formats (PDF, CSV, Excel) and filtering options
 */

import { test, expect } from '@playwright/test';

interface BudgetExportTestData {
  format: 'pdf' | 'csv' | 'excel';
  filters?: {
    categories?: string[];
    dateRange?: { start: string; end: string };
    paymentStatus?: 'all' | 'paid' | 'pending' | 'planned';
  };
  expectedFileSize?: { min: number; max: number }; // in bytes
  expectedElements?: string[];
}

const exportTestScenarios: BudgetExportTestData[] = [
  {
    format: 'pdf',
    filters: { categories: ['venue', 'catering'] },
    expectedFileSize: { min: 500000, max: 5000000 }, // 500KB - 5MB
    expectedElements: ['summary', 'charts', 'payment_table']
  },
  {
    format: 'csv',
    filters: { 
      categories: ['venue', 'catering'], 
      dateRange: { start: '2025-01-01', end: '2025-12-31' }
    },
    expectedFileSize: { min: 1000, max: 100000 }, // 1KB - 100KB
    expectedElements: ['headers', 'data_rows']
  },
  {
    format: 'excel',
    filters: { paymentStatus: 'pending' },
    expectedFileSize: { min: 10000, max: 1000000 }, // 10KB - 1MB
    expectedElements: ['summary_sheet', 'details_sheet', 'charts_sheet']
  }
];

test.describe('Budget Export E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wedding dashboard and ensure authenticated
    await page.goto('http://localhost:3000/dashboard');
    
    // Mock authentication state for testing
    await page.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token');
      localStorage.setItem('user-id', 'test-couple-id');
      localStorage.setItem('wedding-id', 'test-wedding-123');
    });
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-content"]');
  });

  test('should complete full PDF export with all data', async ({ page }) => {
    // Navigate to budget section
    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    // Verify budget data is loaded
    const budgetItems = await page.locator('[data-testid="budget-item"]');
    expect(await budgetItems.count()).toBeGreaterThan(0);

    // Open export dialog
    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');

    // Select PDF format
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');

    // Configure export options
    await page.check('[data-testid="include-charts-checkbox"]');
    await page.check('[data-testid="include-timeline-checkbox"]');

    // Start export process
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="start-export-button"]');

    // Wait for progress indicator
    await page.waitForSelector('[data-testid="export-progress"]');

    // Verify progress updates
    const progressText = page.locator('[data-testid="export-progress-text"]');
    await expect(progressText).toContainText('Generating');

    // Wait for completion and download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/budget-export-.*\.pdf$/);

    // Verify file size is reasonable
    const downloadPath = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(100000); // > 100KB
    expect(stats.size).toBeLessThan(10000000); // < 10MB

    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should handle filtered CSV export with date range', async ({ page }) => {
    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    // Open export dialog
    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');

    // Select CSV format
    await page.selectOption('[data-testid="export-format-select"]', 'csv');

    // Apply category filter
    await page.check('[data-testid="category-venue-checkbox"]');
    await page.check('[data-testid="category-catering-checkbox"]');

    // Apply date range filter
    await page.fill('[data-testid="date-range-start"]', '2025-01-01');
    await page.fill('[data-testid="date-range-end"]', '2025-06-30');

    // Start export
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="start-export-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/budget-export-filtered-.*\.csv$/);

    // Verify CSV content structure
    const downloadPath = await download.path();
    const fs = require('fs');
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    
    // Check CSV headers
    const lines = csvContent.split('\n');
    expect(lines[0]).toContain('Category,Vendor,Amount,Due Date,Status');
    
    // Verify only filtered categories are included
    lines.slice(1).forEach(line => {
      if (line.trim()) {
        expect(line).toMatch(/^(Venue|Catering),/);
      }
    });

    fs.unlinkSync(downloadPath);
  });

  test('should export Excel with multiple sheets and charts', async ({ page }) => {
    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');

    // Select Excel format
    await page.selectOption('[data-testid="export-format-select"]', 'excel');

    // Enable advanced options
    await page.check('[data-testid="include-charts-checkbox"]');
    await page.check('[data-testid="include-payment-schedule-checkbox"]');
    await page.check('[data-testid="include-vendor-details-checkbox"]');

    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="start-export-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/budget-export-.*\.xlsx$/);

    const downloadPath = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    
    // Excel files should be larger than CSV due to formatting and charts
    expect(stats.size).toBeGreaterThan(10000); // > 10KB
    expect(stats.size).toBeLessThan(5000000); // < 5MB

    fs.unlinkSync(downloadPath);
  });

  test('should handle large dataset export performance', async ({ page }) => {
    // Mock large dataset for performance testing
    await page.evaluate(() => {
      // Override API response to return large dataset
      window.__MOCK_LARGE_BUDGET__ = true;
    });

    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');

    // Select PDF format for performance test
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');

    // Measure export time
    const startTime = Date.now();
    
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="start-export-button"]');

    const download = await downloadPromise;
    const endTime = Date.now();
    const exportTime = endTime - startTime;

    // Performance benchmark: PDF generation should complete within 15 seconds
    expect(exportTime).toBeLessThan(15000);

    // Verify file was generated successfully
    expect(download.suggestedFilename()).toMatch(/budget-export-.*\.pdf$/);

    const downloadPath = await download.path();
    const fs = require('fs');
    fs.unlinkSync(downloadPath);
  });

  test('should show proper error handling for failed exports', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/wedme/budget/export', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Export service temporarily unavailable' })
      });
    });

    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');

    await page.selectOption('[data-testid="export-format-select"]', 'csv');
    await page.click('[data-testid="start-export-button"]');

    // Verify error message is displayed
    await page.waitForSelector('[data-testid="export-error-message"]');
    const errorText = await page.textContent('[data-testid="export-error-message"]');
    expect(errorText).toContain('temporarily unavailable');

    // Verify retry button is available
    expect(await page.locator('[data-testid="retry-export-button"]').isVisible()).toBe(true);

    // Verify dialog can be closed
    await page.click('[data-testid="close-export-dialog"]');
    expect(await page.locator('[data-testid="budget-export-dialog"]').isVisible()).toBe(false);
  });

  test('should validate export permissions and authentication', async ({ page }) => {
    // Clear authentication
    await page.evaluate(() => {
      localStorage.removeItem('next-auth.session-token');
      localStorage.removeItem('user-id');
    });

    await page.goto('http://localhost:3000/dashboard/budget');

    // Should redirect to login or show unauthorized message
    await page.waitForSelector('[data-testid="login-required"], [data-testid="unauthorized-message"]');
    
    // Verify export button is not accessible without auth
    expect(await page.locator('[data-testid="export-budget-button"]').isVisible()).toBe(false);
  });

  test.describe('Mobile Export Flow', () => {
    test.use({ 
      viewport: { width: 375, height: 667 } // iPhone SE viewport
    });

    test('should handle mobile export interface', async ({ page }) => {
      await page.click('[data-testid="nav-budget"]');
      await page.waitForSelector('[data-testid="budget-overview"]');

      // Mobile export button might be in overflow menu
      const exportButton = page.locator('[data-testid="export-budget-button"]');
      if (!(await exportButton.isVisible())) {
        await page.click('[data-testid="mobile-menu-toggle"]');
        await page.waitForSelector('[data-testid="export-budget-button"]');
      }

      await page.click('[data-testid="export-budget-button"]');
      await page.waitForSelector('[data-testid="budget-export-dialog"]');

      // Verify mobile dialog layout
      const dialog = page.locator('[data-testid="budget-export-dialog"]');
      const dialogBox = await dialog.boundingBox();
      
      // Dialog should fit mobile viewport
      expect(dialogBox?.width).toBeLessThan(375);
      
      // Test mobile-friendly CSV export
      await page.selectOption('[data-testid="export-format-select"]', 'csv');
      
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="start-export-button"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/budget-export-.*\.csv$/);

      const downloadPath = await download.path();
      const fs = require('fs');
      fs.unlinkSync(downloadPath);
    });
  });

  test.describe('Cross-Browser Export Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should export correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        // Skip if not the target browser
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);

        await page.click('[data-testid="nav-budget"]');
        await page.waitForSelector('[data-testid="budget-overview"]');

        await page.click('[data-testid="export-budget-button"]');
        await page.waitForSelector('[data-testid="budget-export-dialog"]');

        await page.selectOption('[data-testid="export-format-select"]', 'pdf');

        const downloadPromise = page.waitForDownload();
        await page.click('[data-testid="start-export-button"]');

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/budget-export-.*\.pdf$/);

        // Verify download works across browsers
        const downloadPath = await download.path();
        const fs = require('fs');
        const stats = fs.statSync(downloadPath);
        expect(stats.size).toBeGreaterThan(1000); // Basic size check

        fs.unlinkSync(downloadPath);
      });
    });
  });
});

test.describe('Export Data Integrity Validation', () => {
  test('should match export data with source budget data', async ({ page }) => {
    await page.click('[data-testid="nav-budget"]');
    await page.waitForSelector('[data-testid="budget-overview"]');

    // Capture source data from UI
    const budgetItems = await page.locator('[data-testid="budget-item"]').all();
    const sourceData = [];
    
    for (const item of budgetItems) {
      const category = await item.locator('[data-testid="item-category"]').textContent();
      const vendor = await item.locator('[data-testid="item-vendor"]').textContent();
      const amount = await item.locator('[data-testid="item-amount"]').textContent();
      
      sourceData.push({ category, vendor, amount });
    }

    // Export CSV for data comparison
    await page.click('[data-testid="export-budget-button"]');
    await page.waitForSelector('[data-testid="budget-export-dialog"]');
    
    await page.selectOption('[data-testid="export-format-select"]', 'csv');

    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="start-export-button"]');

    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    // Verify CSV data matches source
    const fs = require('fs');
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header row
    const exportData = lines.slice(1).filter(line => line.trim()).map(line => {
      const [category, vendor, amount] = line.split(',');
      return { category, vendor, amount };
    });

    // Data integrity check
    expect(exportData.length).toBe(sourceData.length);
    
    exportData.forEach((exportItem, index) => {
      expect(exportItem.category?.trim()).toBe(sourceData[index].category?.trim());
      expect(exportItem.vendor?.trim()).toBe(sourceData[index].vendor?.trim());
      expect(exportItem.amount?.trim()).toBe(sourceData[index].amount?.trim());
    });

    fs.unlinkSync(downloadPath);
  });
});