import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF to Form Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PDF import page
    await page.goto('/forms/import');
    
    // Mock authentication if needed
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
  });

  test('Complete PDF import to form creation workflow', async ({ page }) => {
    // Step 1: Upload PDF
    const fileInput = page.locator('input[type="file"]');
    const testPDFPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
    await fileInput.setInputFiles(testPDFPath);
    
    // Verify upload started
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Step 2: Wait for OCR processing
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Extracting text with AI');
    
    // Wait for field detection
    await page.waitForSelector('[data-testid="detected-fields"]', { timeout: 30000 });
    
    // Step 3: Verify field detection accuracy
    const detectedFields = await page.locator('[data-testid="field-item"]').all();
    expect(detectedFields.length).toBeGreaterThan(10); // Should detect at least 10 fields
    
    // Check for key wedding fields
    await expect(page.locator('[data-testid="field-bride-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-groom-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-wedding-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-venue"]')).toBeVisible();
    
    // Step 4: Verify accuracy indicator
    const accuracyText = await page.locator('[data-testid="accuracy-score"]').textContent();
    const accuracy = parseInt(accuracyText?.replace('%', '') || '0');
    expect(accuracy).toBeGreaterThan(85); // Should achieve >85% accuracy
    
    // Step 5: Map fields to core fields
    await page.click('[data-testid="auto-map-fields"]');
    
    // Verify mapping suggestions
    await expect(page.locator('[data-testid="mapping-suggestion"]').first()).toBeVisible();
    
    // Accept mappings
    await page.click('[data-testid="accept-all-mappings"]');
    
    // Step 6: Create form
    await page.click('[data-testid="create-form-button"]');
    
    // Wait for form creation
    await page.waitForSelector('[data-testid="form-created-success"]', { timeout: 10000 });
    
    // Step 7: Verify form was created with correct fields
    const formUrl = await page.locator('[data-testid="form-url"]').getAttribute('href');
    expect(formUrl).toBeTruthy();
    
    // Navigate to the created form
    await page.goto(formUrl!);
    
    // Verify form fields are populated
    await expect(page.locator('input[name="bride_first_name"]')).toHaveValue(/\w+/);
    await expect(page.locator('input[name="wedding_date"]')).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    
    // Step 8: Verify form can be submitted
    await page.click('[data-testid="submit-form"]');
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
  });

  test('Handle corrupted PDF gracefully', async ({ page }) => {
    // Upload corrupted PDF
    const fileInput = page.locator('input[type="file"]');
    const corruptedPDFPath = path.join(__dirname, '../fixtures/corrupted.pdf');
    await fileInput.setInputFiles(corruptedPDFPath);
    
    // Should show error message
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid PDF|corrupted/i);
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();
  });

  test('Handle encrypted PDF with appropriate message', async ({ page }) => {
    // Upload encrypted PDF
    const fileInput = page.locator('input[type="file"]');
    const encryptedPDFPath = path.join(__dirname, '../fixtures/encrypted.pdf');
    await fileInput.setInputFiles(encryptedPDFPath);
    
    // Should show encryption error
    await expect(page.locator('[data-testid="encryption-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/encrypted|password protected/i);
  });

  test('Process multi-page PDF within time limit', async ({ page }) => {
    // Upload 10-page PDF
    const fileInput = page.locator('input[type="file"]');
    const multiPagePDFPath = path.join(__dirname, '../fixtures/10-page-timeline.pdf');
    await fileInput.setInputFiles(multiPagePDFPath);
    
    // Start timer
    const startTime = Date.now();
    
    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 35000 });
    
    // Check processing time
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    expect(processingTime).toBeLessThan(30); // Should process in <30 seconds
    
    // Verify all pages were processed
    const pageCount = await page.locator('[data-testid="pages-processed"]').textContent();
    expect(pageCount).toBe('10');
  });

  test('Progress indicator shows real-time updates', async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    const testPDFPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
    await fileInput.setInputFiles(testPDFPath);
    
    // Check progress steps
    const steps = [
      'Uploading PDF',
      'Extracting text with AI',
      'Detecting wedding fields',
      'Mapping to core fields',
      'Validating data',
      'Creating form'
    ];
    
    for (const step of steps) {
      await expect(page.locator(`[data-testid="step-${step.toLowerCase().replace(/\s+/g, '-')}"]`))
        .toHaveAttribute('data-status', /(processing|completed)/, { timeout: 30000 });
    }
    
    // Verify progress percentage updates
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('style', /width:\s*100%/, { timeout: 30000 });
  });

  test('Field mapping allows manual corrections', async ({ page }) => {
    // Upload PDF and wait for field detection
    const fileInput = page.locator('input[type="file"]');
    const testPDFPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
    await fileInput.setInputFiles(testPDFPath);
    
    await page.waitForSelector('[data-testid="detected-fields"]', { timeout: 30000 });
    
    // Click on a field to edit mapping
    await page.click('[data-testid="field-item"]:first-child [data-testid="edit-mapping"]');
    
    // Change mapping
    await page.selectOption('[data-testid="core-field-select"]', 'bride_email');
    
    // Save mapping
    await page.click('[data-testid="save-mapping"]');
    
    // Verify mapping was updated
    await expect(page.locator('[data-testid="field-item"]:first-child'))
      .toContainText('Bride Email');
  });

  test('Integration with Session A forms', async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    const testPDFPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
    await fileInput.setInputFiles(testPDFPath);
    
    // Wait for processing
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });
    
    // Create form
    await page.click('[data-testid="create-form-button"]');
    
    // Wait for form creation
    await page.waitForSelector('[data-testid="form-created-success"]', { timeout: 10000 });
    
    // Navigate to forms list
    await page.goto('/forms');
    
    // Verify new form appears in list
    await expect(page.locator('[data-testid="form-list-item"]').first())
      .toContainText(/Form from wedding-contract.pdf/);
    
    // Verify form has PDF import badge
    await expect(page.locator('[data-testid="pdf-imported-badge"]').first()).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('Measure field detection accuracy across document types', async ({ page }) => {
    const testDocuments = [
      { file: 'contract.pdf', expectedAccuracy: 85 },
      { file: 'invoice.pdf', expectedAccuracy: 90 },
      { file: 'timeline.pdf', expectedAccuracy: 88 },
      { file: 'questionnaire.pdf', expectedAccuracy: 92 }
    ];
    
    for (const doc of testDocuments) {
      await page.goto('/forms/import');
      
      const fileInput = page.locator('input[type="file"]');
      const pdfPath = path.join(__dirname, '../fixtures', doc.file);
      await fileInput.setInputFiles(pdfPath);
      
      await page.waitForSelector('[data-testid="accuracy-score"]', { timeout: 30000 });
      
      const accuracyText = await page.locator('[data-testid="accuracy-score"]').textContent();
      const accuracy = parseInt(accuracyText?.replace('%', '') || '0');
      
      expect(accuracy).toBeGreaterThanOrEqual(doc.expectedAccuracy);
      
      console.log(`${doc.file}: ${accuracy}% accuracy (expected: ${doc.expectedAccuracy}%)`);
    }
  });
});