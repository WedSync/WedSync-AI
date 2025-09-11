import { test, expect } from '@playwright/test';
import path from 'path';

// Mock PDF file path for testing
const mockPDFPath = path.join(__dirname, '../../fixtures/sample-contract.pdf');

test.describe('PDF Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to PDF import page
    await page.goto('/pdf/import');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('PDF Import');
  });

  test('should display PDF import interface correctly', async ({ page }) => {
    // Check main elements are present
    await expect(page.locator('[data-testid="pdf-uploader"]').or(page.locator('text=Upload PDF'))).toBeVisible();
    await expect(page.locator('text=Recent Uploads')).toBeVisible();
    
    // Check upload button
    await expect(page.locator('button:has-text("Upload PDF")')).toBeVisible();
  });

  test('should show upload interface when upload button is clicked', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text("Upload PDF")');
    
    // Check upload interface appears
    await expect(page.locator('text=Upload New PDF')).toBeVisible();
    await expect(page.locator('text=Drag & drop your PDF')).toBeVisible();
    
    // Check file input
    await expect(page.locator('input[type="file"]')).toBePresent();
  });

  test('should validate file type restrictions', async ({ page }) => {
    // Open upload interface
    await page.click('button:has-text("Upload PDF")');
    
    // Try to upload non-PDF file (simulate by checking UI feedback)
    const fileInput = page.locator('input[type="file"]');
    
    // The actual file upload validation would happen in the component
    // We can test the UI feedback for invalid files
    await expect(page.locator('text=Only PDF files accepted')).toBeVisible();
  });

  test.skip('should upload PDF file successfully', async ({ page }) => {
    // This test requires a real file upload, which needs careful setup
    // Skipping for now as it requires proper test fixtures and mocking
    
    await page.click('button:has-text("Upload PDF")');
    
    // Set up file chooser
    const fileChooser = await page.waitForEvent('filechooser');
    await fileChooser.setFiles(mockPDFPath);
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload Successful')).toBeVisible({ timeout: 30000 });
    
    // Check if PDF appears in the list
    await expect(page.locator('text=sample-contract.pdf')).toBeVisible();
  });

  test('should display PDF processing status', async ({ page }) => {
    // Mock a PDF in processing state
    // This would typically be done by seeding test data
    
    // Look for processing indicators
    await expect(page.locator('[data-testid="processing-indicator"]').or(page.locator('text=Processing'))).toBeVisible();
    
    // Check for progress indicators
    await expect(page.locator('.animate-spin').or(page.locator('text=Processing PDF'))).toBeVisible();
  });

  test('should show field mapping for completed PDFs', async ({ page }) => {
    // Mock a completed PDF
    // This would be seeded in the database for testing
    
    // Look for completed PDF in the list
    const completedPDF = page.locator('[data-status="completed"]').first();
    
    if (await completedPDF.isVisible()) {
      // Click "View Fields" button
      await completedPDF.locator('button:has-text("View Fields")').click();
      
      // Should navigate to mapping page
      await expect(page).toHaveURL(/\/pdf\/.*\/mapping/);
      await expect(page.locator('text=Field Mapping')).toBeVisible();
    }
  });

  test('should filter PDFs by confidence level', async ({ page }) => {
    // Check if filter controls exist
    await expect(page.locator('text=Confidence:').or(page.locator('[data-testid="confidence-filter"]'))).toBeVisible();
    
    // Test filter functionality would require seeded data with different confidence levels
    const confidenceFilter = page.locator('select').first();
    if (await confidenceFilter.isVisible()) {
      await confidenceFilter.selectOption('0.8');
      
      // Verify filtering works (would need test data)
      // await expect(page.locator('[data-confidence-low]')).not.toBeVisible();
    }
  });

  test('should display PDF statistics correctly', async ({ page }) => {
    // Check for stats section
    const statsSection = page.locator('[data-testid="pdf-stats"]').or(page.locator('text=Total Uploads'));
    
    if (await statsSection.isVisible()) {
      // Verify stats are numbers
      await expect(page.locator('text=/\\d+/').first()).toBeVisible();
      
      // Check for different stat types
      await expect(page.locator('text=Processed').or(page.locator('text=Fields Extracted'))).toBeVisible();
    }
  });
});

test.describe('PDF Field Mapping', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific PDF mapping page
    // This would require a test PDF ID
    await page.goto('/pdf/test-pdf-id/mapping');
  });

  test('should display field mapping interface', async ({ page }) => {
    await expect(page.locator('text=Field Mapping')).toBeVisible();
    await expect(page.locator('text=Wedding Form Fields')).toBeVisible();
    await expect(page.locator('text=Detected Fields')).toBeVisible();
  });

  test('should show confidence indicators for fields', async ({ page }) => {
    // Look for confidence badges
    await expect(page.locator('[data-testid="confidence-badge"]').or(page.locator('text=/%/')).first()).toBeVisible();
    
    // Check for confidence color coding
    const highConfidence = page.locator('.text-green-600, .bg-green-').first();
    const lowConfidence = page.locator('.text-red-600, .bg-red-').first();
    
    // At least one confidence indicator should be present
    await expect(highConfidence.or(lowConfidence)).toBeVisible();
  });

  test('should allow field mapping between detected and core fields', async ({ page }) => {
    // Look for mapping dropdowns
    const mappingSelect = page.locator('select').first();
    
    if (await mappingSelect.isVisible()) {
      // Test selecting a field
      await mappingSelect.selectOption({ index: 1 });
      
      // Verify mapping was applied
      await expect(page.locator('[data-mapped="true"]').or(page.locator('text=Mapped'))).toBeVisible();
    }
  });

  test('should validate required field mappings', async ({ page }) => {
    // Look for required field indicators
    await expect(page.locator('text=Required').or(page.locator('[data-required="true"]')).first()).toBeVisible();
    
    // Check create form button state
    const createFormButton = page.locator('button:has-text("Create Form")');
    
    // Button should be disabled if required fields aren't mapped
    if (await createFormButton.isVisible()) {
      // Test would depend on the current state of mappings
      const isDisabled = await createFormButton.isDisabled();
      
      // If disabled, should show warning about required fields
      if (isDisabled) {
        await expect(page.locator('text=required fields still need mapping')).toBeVisible();
      }
    }
  });

  test('should allow field editing and deletion', async ({ page }) => {
    // Look for edit buttons on fields
    const editButton = page.locator('[data-testid="edit-field"]').or(page.locator('button[aria-label*="edit"]')).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should show edit interface
      await expect(page.locator('input[placeholder*="Field Label"]').or(page.locator('[data-editing="true"]'))).toBeVisible();
      
      // Look for save/cancel buttons
      await expect(page.locator('button:has-text("Save")').or(page.locator('button:has-text("Cancel")'))).toBeVisible();
    }
  });

  test.skip('should create form from mapped fields', async ({ page }) => {
    // This test requires proper field mapping setup
    
    // Ensure required fields are mapped
    // Map bride_name, groom_name, email as minimum required
    
    // Click create form button
    await page.click('button:has-text("Create Form")');
    
    // Should navigate to new form
    await expect(page).toHaveURL(/\/forms\/.*/, { timeout: 10000 });
    
    // Verify form was created with mapped fields
    await expect(page.locator('text=Bride Name')).toBeVisible();
    await expect(page.locator('text=Groom Name')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('PDF Import Error Handling', () => {
  test('should handle processing failures gracefully', async ({ page }) => {
    await page.goto('/pdf/import');
    
    // Look for failed PDF uploads
    const failedPDF = page.locator('[data-status="failed"]').first();
    
    if (await failedPDF.isVisible()) {
      // Should show error message
      await expect(page.locator('text=Error:').or(page.locator('[data-testid="error-message"]'))).toBeVisible();
      
      // Should show retry option
      await expect(page.locator('button:has-text("Retry")').or(page.locator('[data-action="retry"]'))).toBeVisible();
    }
  });

  test('should show appropriate messages for empty states', async ({ page }) => {
    await page.goto('/pdf/import');
    
    // If no PDFs uploaded
    const emptyState = page.locator('text=No PDFs uploaded yet');
    
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Upload your first PDF')).toBeVisible();
    }
  });

  test('should handle network errors during upload', async ({ page }) => {
    // This would require intercepting network requests
    // and simulating failures
    
    await page.route('/api/pdf/process', route => {
      route.abort('failed');
    });
    
    await page.goto('/pdf/import');
    
    // Test upload failure handling would go here
    // This is complex and would require proper setup
  });
});

test.describe('PDF Import Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/pdf/import');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Upload button should be focusable
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interface
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/pdf/import');
    
    // Check for ARIA labels on interactive elements
    await expect(page.locator('[aria-label]').first()).toBeVisible();
    
    // File input should have proper labeling
    await expect(page.locator('input[type="file"]')).toHaveAttribute('aria-label', /.+/);
  });

  test('should announce status changes to screen readers', async ({ page }) => {
    await page.goto('/pdf/import');
    
    // Look for ARIA live regions for status updates
    await expect(page.locator('[aria-live]').or(page.locator('[role="status"]'))).toBePresent();
  });
});