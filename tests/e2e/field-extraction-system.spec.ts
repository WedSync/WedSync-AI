/**
 * End-to-End Field Extraction System Tests
 * WS-122: Automated Field Extraction from Documents
 * Team E - Batch 9 - Round 2
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Field Extraction System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the field extraction section
    await page.goto('/dashboard/field-extraction');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete full field extraction workflow', async ({ page }) => {
    // Step 1: Upload a document
    await test.step('Upload document', async () => {
      await page.click('[data-testid="upload-document-btn"]');
      
      // Upload test PDF file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, '../fixtures/sample-invoice.pdf'));
      
      // Wait for upload to complete
      await page.waitForSelector('[data-testid="document-uploaded"]', { timeout: 10000 });
      
      // Verify document appears in list
      await expect(page.locator('[data-testid="document-list"]')).toContainText('sample-invoice.pdf');
    });

    // Step 2: Create extraction template
    await test.step('Create extraction template', async () => {
      await page.click('[data-testid="create-template-btn"]');
      
      // Fill template details
      await page.fill('[data-testid="template-name"]', 'Invoice Template E2E');
      await page.fill('[data-testid="template-description"]', 'Template for E2E testing');
      await page.selectOption('[data-testid="document-type"]', 'invoice');
      
      // Add field definitions
      await page.click('[data-testid="add-field-btn"]');
      
      // First field: Invoice Number
      await page.fill('[data-testid="field-name-0"]', 'Invoice Number');
      await page.selectOption('[data-testid="field-type-0"]', 'text');
      await page.check('[data-testid="field-required-0"]');
      await page.fill('[data-testid="field-pattern-0"]', 'INV-\\d{4,}');
      await page.fill('[data-testid="field-aliases-0"]', 'Invoice #, Invoice No., Inv Number');
      
      // Second field: Total Amount
      await page.click('[data-testid="add-field-btn"]');
      await page.fill('[data-testid="field-name-1"]', 'Total Amount');
      await page.selectOption('[data-testid="field-type-1"]', 'currency');
      await page.check('[data-testid="field-required-1"]');
      await page.fill('[data-testid="field-aliases-1"]', 'Total, Amount Due, Grand Total');
      
      // Third field: Due Date
      await page.click('[data-testid="add-field-btn"]');
      await page.fill('[data-testid="field-name-2"]', 'Due Date');
      await page.selectOption('[data-testid="field-type-2"]', 'date');
      await page.fill('[data-testid="field-aliases-2"]', 'Payment Due, Due By');
      
      // Save template
      await page.click('[data-testid="save-template-btn"]');
      
      // Wait for template to be saved
      await page.waitForSelector('[data-testid="template-saved"]', { timeout: 5000 });
      
      // Verify template appears in list
      await expect(page.locator('[data-testid="template-list"]')).toContainText('Invoice Template E2E');
    });

    // Step 3: Extract fields from document
    await test.step('Extract fields from document', async () => {
      // Select document and template
      await page.click('[data-testid="document-item"]:first-child');
      await page.selectOption('[data-testid="template-select"]', 'Invoice Template E2E');
      
      // Configure extraction options
      await page.check('[data-testid="enable-ocr"]');
      await page.check('[data-testid="enable-fuzzy-matching"]');
      await page.fill('[data-testid="confidence-threshold"]', '0.8');
      
      // Start extraction
      await page.click('[data-testid="extract-fields-btn"]');
      
      // Wait for extraction to complete
      await page.waitForSelector('[data-testid="extraction-completed"]', { timeout: 30000 });
      
      // Verify extraction results
      const resultsTable = page.locator('[data-testid="extraction-results"]');
      await expect(resultsTable).toBeVisible();
      
      // Check that fields were extracted
      await expect(resultsTable.locator('tr')).toHaveCount.greaterThan(1);
      
      // Verify specific field extractions
      const invoiceNumberRow = resultsTable.locator('tr', { hasText: 'Invoice Number' });
      await expect(invoiceNumberRow).toBeVisible();
      await expect(invoiceNumberRow.locator('[data-testid="field-value"]')).toContainText('INV-');
      await expect(invoiceNumberRow.locator('[data-testid="confidence-badge"]')).toContainText(/\d+%/);
      
      const totalAmountRow = resultsTable.locator('tr', { hasText: 'Total Amount' });
      await expect(totalAmountRow).toBeVisible();
      await expect(totalAmountRow.locator('[data-testid="field-value"]')).toContainText(/\$[\d,]+\.?\d{0,2}/);
      
      // Check validation status
      await expect(page.locator('[data-testid="validation-status"]')).toContainText(/Valid|Warning/);
    });

    // Step 4: Review and validate extracted fields
    await test.step('Review and validate fields', async () => {
      // Check extraction accuracy
      const accuracyBadge = page.locator('[data-testid="accuracy-badge"]');
      await expect(accuracyBadge).toBeVisible();
      
      const accuracyText = await accuracyBadge.textContent();
      const accuracy = parseFloat(accuracyText?.replace('%', '') || '0');
      expect(accuracy).toBeGreaterThan(90); // Requirement: >90% accuracy
      
      // Review field confidence levels
      const confidenceBadges = page.locator('[data-testid="confidence-badge"]');
      const badgeCount = await confidenceBadges.count();
      
      for (let i = 0; i < badgeCount; i++) {
        const badge = confidenceBadges.nth(i);
        const confidenceText = await badge.textContent();
        const confidence = parseFloat(confidenceText?.replace('%', '') || '0');
        
        // All extracted fields should have reasonable confidence
        expect(confidence).toBeGreaterThan(50);
      }
      
      // Manually correct any low-confidence fields if needed
      const lowConfidenceFields = page.locator('[data-testid="field-row"][data-confidence-level="low"]');
      const lowConfidenceCount = await lowConfidenceFields.count();
      
      for (let i = 0; i < lowConfidenceCount; i++) {
        const field = lowConfidenceFields.nth(i);
        await field.click();
        
        // Edit field value
        const editInput = field.locator('[data-testid="field-value-input"]');
        await editInput.fill('Corrected Value');
        
        // Save correction
        await field.locator('[data-testid="save-correction-btn"]').click();
        
        // Verify correction was saved
        await expect(field.locator('[data-testid="field-value"]')).toContainText('Corrected Value');
      }
    });

    // Step 5: Export extracted data in multiple formats
    await test.step('Export extracted data', async () => {
      await page.click('[data-testid="export-btn"]');
      
      // Test JSON export
      await page.selectOption('[data-testid="export-format"]', 'json');
      await page.check('[data-testid="include-metadata"]');
      await page.check('[data-testid="include-validation"]');
      
      const [jsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-export-btn"]')
      ]);
      
      expect(jsonDownload.suggestedFilename()).toMatch(/extraction_.*\.json$/);
      
      // Test CSV export
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.check('[data-testid="include-position"]');
      
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-export-btn"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toMatch(/extraction_.*\.csv$/);
      
      // Test XML export
      await page.selectOption('[data-testid="export-format"]', 'xml');
      
      const [xmlDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-export-btn"]')
      ]);
      
      expect(xmlDownload.suggestedFilename()).toMatch(/extraction_.*\.xml$/);
      
      // Verify export history
      await page.click('[data-testid="export-history-btn"]');
      const historyTable = page.locator('[data-testid="export-history"]');
      await expect(historyTable.locator('tr')).toHaveCount.greaterThan(3); // Header + 3 exports
    });

    // Step 6: Verify extraction analytics
    await test.step('View extraction analytics', async () => {
      await page.click('[data-testid="analytics-tab"]');
      
      // Check dashboard metrics
      await expect(page.locator('[data-testid="total-extractions"]')).toContainText('1');
      await expect(page.locator('[data-testid="success-rate"]')).toContainText(/\d+%/);
      await expect(page.locator('[data-testid="average-processing-time"]')).toContainText(/\d+ms/);
      
      // Check field-level statistics
      const fieldStatsTable = page.locator('[data-testid="field-statistics"]');
      await expect(fieldStatsTable).toBeVisible();
      
      // Verify that each field has statistics
      const fieldRows = fieldStatsTable.locator('tbody tr');
      const fieldCount = await fieldRows.count();
      expect(fieldCount).toBeGreaterThan(0);
      
      // Check that statistics include confidence and success rates
      for (let i = 0; i < fieldCount; i++) {
        const row = fieldRows.nth(i);
        await expect(row.locator('[data-testid="field-success-rate"]')).toContainText(/\d+%/);
        await expect(row.locator('[data-testid="field-avg-confidence"]')).toContainText(/\d+%/);
      }
    });
  });

  test('should handle extraction errors gracefully', async ({ page }) => {
    await test.step('Test error handling for corrupted document', async () => {
      // Upload a corrupted file
      await page.click('[data-testid="upload-document-btn"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, '../fixtures/corrupted-file.pdf'));
      
      // Select any template and try extraction
      await page.selectOption('[data-testid="template-select"]', { index: 0 });
      await page.click('[data-testid="extract-fields-btn"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="extraction-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/failed|error|corrupt/i);
      
      // Error should be recoverable
      await page.click('[data-testid="retry-extraction-btn"]');
      
      // Should attempt retry
      await expect(page.locator('[data-testid="extraction-retry"]')).toBeVisible();
    });

    await test.step('Test error handling for missing template fields', async () => {
      // Create template with no fields
      await page.click('[data-testid="create-template-btn"]');
      await page.fill('[data-testid="template-name"]', 'Empty Template');
      
      // Try to save without adding fields
      await page.click('[data-testid="save-template-btn"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/fields are required/i);
    });
  });

  test('should maintain performance requirements', async ({ page }) => {
    await test.step('Test extraction performance', async () => {
      // Upload multiple documents
      const documentCount = 5;
      
      for (let i = 0; i < documentCount; i++) {
        await page.click('[data-testid="upload-document-btn"]');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(path.join(__dirname, `../fixtures/sample-document-${i % 3}.pdf`));
        await page.waitForSelector('[data-testid="document-uploaded"]', { timeout: 5000 });
      }
      
      // Select template
      await page.selectOption('[data-testid="template-select"]', { index: 0 });
      
      // Measure batch extraction performance
      const startTime = Date.now();
      
      // Select all documents and extract
      await page.click('[data-testid="select-all-documents"]');
      await page.click('[data-testid="batch-extract-btn"]');
      
      // Wait for all extractions to complete
      await page.waitForSelector('[data-testid="batch-extraction-completed"]', { timeout: 60000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete batch extraction within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 5 documents
      
      // Check individual extraction times
      const processTimeBadges = page.locator('[data-testid="process-time-badge"]');
      const badgeCount = await processTimeBadges.count();
      
      for (let i = 0; i < badgeCount; i++) {
        const badge = processTimeBadges.nth(i);
        const timeText = await badge.textContent();
        const timeMs = parseFloat(timeText?.replace(/[^\d.]/g, '') || '0');
        
        // Each document should be processed within 10 seconds
        expect(timeMs).toBeLessThan(10000);
      }
    });

    await test.step('Test concurrent user simulation', async () => {
      // This would typically be done with multiple browser contexts
      // For now, we'll test rapid successive operations
      
      const operations = [];
      
      // Simulate rapid template creation
      for (let i = 0; i < 3; i++) {
        operations.push(async () => {
          await page.click('[data-testid="create-template-btn"]');
          await page.fill('[data-testid="template-name"]', `Concurrent Template ${i}`);
          await page.click('[data-testid="add-field-btn"]');
          await page.fill('[data-testid="field-name-0"]', 'Test Field');
          await page.selectOption('[data-testid="field-type-0"]', 'text');
          await page.click('[data-testid="save-template-btn"]');
          await page.waitForSelector('[data-testid="template-saved"]');
        });
      }
      
      // Execute operations concurrently
      const startTime = Date.now();
      await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 3 concurrent operations
      
      // Verify all templates were created
      await expect(page.locator('[data-testid="template-list"] tr')).toHaveCount.greaterThan(3);
    });
  });

  test('should be accessible to users with disabilities', async ({ page }) => {
    await test.step('Test keyboard navigation', async () => {
      // Test keyboard navigation through the interface
      await page.keyboard.press('Tab'); // Focus upload button
      await expect(page.locator('[data-testid="upload-document-btn"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus template selector
      await expect(page.locator('[data-testid="template-select"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus extract button
      await expect(page.locator('[data-testid="extract-fields-btn"]')).toBeFocused();
      
      // Test keyboard activation
      await page.keyboard.press('Enter');
      
      // Should show some form of feedback (error due to no document/template selected)
      await expect(page.locator('[data-testid="validation-message"]')).toBeVisible();
    });

    await test.step('Test screen reader compatibility', async () => {
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="upload-document-btn"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="template-select"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="extract-fields-btn"]')).toHaveAttribute('aria-label');
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toHaveCount.greaterThan(0);
      await expect(page.locator('h2')).toHaveCount.greaterThan(0);
      
      // Check for form labels
      const inputsWithLabels = page.locator('input[aria-labelledby], input[aria-label]');
      const inputsWithProperLabels = await inputsWithLabels.count();
      const allInputs = await page.locator('input').count();
      
      // Most inputs should have proper labels
      expect(inputsWithProperLabels / allInputs).toBeGreaterThan(0.8);
    });

    await test.step('Test color contrast and visual accessibility', async () => {
      // Test focus indicators
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Should have visible focus indicator
      const focusStyles = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });
      
      // Should have some form of focus indication
      expect(
        focusStyles.outline !== 'none' || 
        focusStyles.outlineWidth !== '0px' || 
        focusStyles.boxShadow !== 'none'
      ).toBeTruthy();
    });
  });

  test('should integrate properly with existing WedSync features', async ({ page }) => {
    await test.step('Test integration with document management', async () => {
      // Navigate to documents section
      await page.goto('/dashboard/documents');
      
      // Upload a document through document management
      await page.click('[data-testid="upload-new-document"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, '../fixtures/contract.pdf'));
      await page.waitForSelector('[data-testid="document-uploaded"]');
      
      // Navigate back to field extraction
      await page.goto('/dashboard/field-extraction');
      
      // Document should appear in extraction document list
      await expect(page.locator('[data-testid="document-list"]')).toContainText('contract.pdf');
    });

    await test.step('Test integration with client/vendor profiles', async () => {
      // Extract fields from a vendor contract
      await page.click('[data-testid="document-item"]', { hasText: 'contract.pdf' });
      await page.selectOption('[data-testid="template-select"]', 'Contract Template');
      await page.click('[data-testid="extract-fields-btn"]');
      
      await page.waitForSelector('[data-testid="extraction-completed"]');
      
      // Should have option to link extracted data to vendor profile
      await page.click('[data-testid="link-to-profile-btn"]');
      await page.selectOption('[data-testid="profile-type"]', 'vendor');
      await page.fill('[data-testid="profile-search"]', 'Test Vendor');
      await page.click('[data-testid="link-profile-btn"]');
      
      // Should confirm linking
      await expect(page.locator('[data-testid="profile-linked"]')).toBeVisible();
    });

    await test.step('Test integration with workflow automation', async () => {
      // Test that field extraction can trigger workflow actions
      await page.goto('/dashboard/workflows');
      
      // Create workflow trigger based on extraction completion
      await page.click('[data-testid="create-workflow-btn"]');
      await page.selectOption('[data-testid="trigger-type"]', 'field_extraction_completed');
      await page.selectOption('[data-testid="action-type"]', 'send_notification');
      await page.fill('[data-testid="notification-message"]', 'Field extraction completed for {{document.name}}');
      await page.click('[data-testid="save-workflow-btn"]');
      
      // Go back and trigger an extraction
      await page.goto('/dashboard/field-extraction');
      await page.click('[data-testid="document-item"]:first-child');
      await page.selectOption('[data-testid="template-select"]', { index: 0 });
      await page.click('[data-testid="extract-fields-btn"]');
      
      await page.waitForSelector('[data-testid="extraction-completed"]');
      
      // Should trigger notification
      await expect(page.locator('[data-testid="workflow-notification"]')).toBeVisible();
    });
  });
});