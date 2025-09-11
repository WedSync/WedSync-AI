import { test, expect } from '@playwright/test';

/**
 * WS-057 Round 2: Vendor Export System Tests
 * Testing the <3s export generation requirement and multiple format support
 */

test.describe('Vendor Export System', () => {
  let testEventId: string;
  const EXPORT_PERFORMANCE_THRESHOLD = 3000; // ms - strict requirement

  test.beforeEach(async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'vendor@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    testEventId = process.env.TEST_EVENT_ID || 'test-event-id';
  });

  test.describe('Export Performance Requirements', () => {
    test('should generate CSV exports within 3 seconds', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure CSV export
      await page.selectOption('[data-testid="export-type"]', 'full');
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.selectOption('[data-testid="filter-status"]', 'all');
      
      // Generate export and measure time
      const startTime = Date.now();
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      
      const download = await downloadPromise;
      const exportTime = Date.now() - startTime;
      
      // Assert performance requirement
      expect(exportTime).toBeLessThan(EXPORT_PERFORMANCE_THRESHOLD);
      
      // Verify file properties
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
      expect(download.suggestedFilename()).toContain('full_rsvp_report');
    });

    test('should generate JSON exports within 3 seconds', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure JSON export
      await page.selectOption('[data-testid="export-type"]', 'analytics');
      await page.selectOption('[data-testid="export-format"]', 'json');
      
      // Generate export and measure time
      const startTime = Date.now();
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      
      const download = await downloadPromise;
      const exportTime = Date.now() - startTime;
      
      // Assert performance requirement
      expect(exportTime).toBeLessThan(EXPORT_PERFORMANCE_THRESHOLD);
      
      // Verify file properties
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      expect(download.suggestedFilename()).toContain('analytics');
    });

    test('should handle large datasets within performance limits', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Generate large test dataset
      await page.click('[data-testid="generate-test-data"]');
      await page.selectOption('[data-testid="test-data-size"]', 'large'); // 1000+ records
      await page.click('[data-testid="create-test-data"]');
      await page.waitForSelector('[data-testid="test-data-created"]');
      
      // Export large dataset
      await page.selectOption('[data-testid="export-type"]', 'full');
      await page.selectOption('[data-testid="export-format"]', 'csv');
      
      const startTime = Date.now();
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      
      const download = await downloadPromise;
      const exportTime = Date.now() - startTime;
      
      // Should still meet performance requirement for large datasets
      expect(exportTime).toBeLessThan(EXPORT_PERFORMANCE_THRESHOLD);
    });
  });

  test.describe('Round 2 Export Types', () => {
    test('should export analytics data with metrics', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure analytics export
      await page.selectOption('[data-testid="export-type"]', 'analytics');
      await page.selectOption('[data-testid="export-format"]', 'json');
      await page.check('[data-testid="include-predictions"]');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Verify analytics export content structure
      expect(download.suggestedFilename()).toContain('analytics');
      
      // Verify export metadata
      await expect(page.locator('[data-testid="export-metadata"]')).toContainText('Analytics Export');
      await expect(page.locator('[data-testid="records-exported"]')).toBeVisible();
    });

    test('should export plus-one data with relationships', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure plus-ones export
      await page.selectOption('[data-testid="export-type"]', 'plus_ones');
      await page.selectOption('[data-testid="export-format"]', 'csv');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Verify plus-ones export
      expect(download.suggestedFilename()).toContain('plus_ones');
      
      // Check export includes relationship data
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Primary Guest');
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Plus One Name');
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Relationship');
    });

    test('should export custom questions and responses', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure custom questions export
      await page.selectOption('[data-testid="export-type"]', 'custom_questions');
      await page.selectOption('[data-testid="export-format"]', 'csv');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Verify custom questions export
      expect(download.suggestedFilename()).toContain('custom_questions');
      
      // Check export includes question data
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Question');
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Answer');
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Question Type');
    });

    test('should export household groupings', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Configure households export (new Round 2 feature)
      await page.selectOption('[data-testid="export-type"]', 'households');
      await page.selectOption('[data-testid="export-format"]', 'json');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Verify households export
      expect(download.suggestedFilename()).toContain('households');
    });
  });

  test.describe('Export Templates & Customization', () => {
    test('should create and use custom export templates', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export/templates`);
      
      // Create custom template
      await page.click('[data-testid="create-template"]');
      await page.fill('[data-testid="template-name"]', 'Wedding Vendor Template');
      await page.selectOption('[data-testid="template-format"]', 'csv');
      
      // Configure column mapping
      await page.fill('[data-testid="map-guest-name"]', 'Guest Full Name');
      await page.fill('[data-testid="map-email"]', 'Contact Email');
      await page.fill('[data-testid="map-phone"]', 'Phone Number');
      await page.fill('[data-testid="map-dietary"]', 'Special Dietary Needs');
      
      await page.click('[data-testid="save-template"]');
      await expect(page.locator('[data-testid="template-saved"]')).toBeVisible();
      
      // Use template for export
      await page.goto(`/dashboard/events/${testEventId}/export`);
      await page.selectOption('[data-testid="export-template"]', 'Wedding Vendor Template');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Verify template was applied
      await expect(page.locator('[data-testid="template-applied"]')).toContainText('Wedding Vendor Template');
    });

    test('should support template-based column filtering', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export/templates`);
      
      // Create filtered template
      await page.click('[data-testid="create-template"]');
      await page.fill('[data-testid="template-name"]', 'Catering Export');
      
      // Select only catering-relevant columns
      await page.check('[data-testid="include-guest-name"]');
      await page.check('[data-testid="include-dietary-restrictions"]');
      await page.check('[data-testid="include-meal-preference"]');
      await page.check('[data-testid="include-allergies"]');
      await page.uncheck('[data-testid="include-contact-info"]');
      
      await page.click('[data-testid="save-template"]');
      
      // Use filtered template
      await page.goto(`/dashboard/events/${testEventId}/export`);
      await page.selectOption('[data-testid="export-template"]', 'Catering Export');
      
      // Verify preview shows only selected columns
      await expect(page.locator('[data-testid="column-preview"]')).toContainText('Guest Name');
      await expect(page.locator('[data-testid="column-preview"]')).toContainText('Dietary Restrictions');
      await expect(page.locator('[data-testid="column-preview"]')).not.toContainText('Email');
    });
  });

  test.describe('Export Audit Trail & History', () => {
    test('should maintain comprehensive export history', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Generate several exports
      const exportTypes = ['full', 'analytics', 'plus_ones'];
      
      for (const type of exportTypes) {
        await page.selectOption('[data-testid="export-type"]', type);
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="generate-export"]');
        await downloadPromise;
        await page.waitForTimeout(500); // Small delay between exports
      }
      
      // Check export history
      await page.goto(`/dashboard/events/${testEventId}/export/history`);
      
      // Verify history entries
      const historyEntries = await page.locator('[data-testid="export-history-entry"]').all();
      expect(historyEntries.length).toBeGreaterThanOrEqual(3);
      
      // Verify each entry has required information
      for (const entry of historyEntries.slice(0, 3)) {
        await expect(entry.locator('[data-testid="export-timestamp"]')).toBeVisible();
        await expect(entry.locator('[data-testid="export-type"]')).toBeVisible();
        await expect(entry.locator('[data-testid="export-format"]')).toBeVisible();
        await expect(entry.locator('[data-testid="record-count"]')).toBeVisible();
        await expect(entry.locator('[data-testid="file-size"]')).toBeVisible();
      }
    });

    test('should track export performance metrics', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export/history`);
      
      // Verify performance tracking
      await expect(page.locator('[data-testid="average-export-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-success-rate"]')).toBeVisible();
      
      // Check individual export performance
      const firstEntry = page.locator('[data-testid="export-history-entry"]').first();
      await firstEntry.click();
      
      await expect(page.locator('[data-testid="export-details-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="generation-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-status"]')).toBeVisible();
      
      // Verify performance status
      const performanceStatus = await page.textContent('[data-testid="performance-status"]');
      expect(['Excellent', 'Good', 'Needs Improvement']).toContain(performanceStatus);
    });

    test('should allow re-downloading previous exports', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export/history`);
      
      // Find a recent export
      const recentExport = page.locator('[data-testid="export-history-entry"]').first();
      
      // Re-download previous export
      const downloadPromise = page.waitForEvent('download');
      await recentExport.locator('[data-testid="re-download"]').click();
      const download = await downloadPromise;
      
      // Verify successful re-download
      expect(download.suggestedFilename()).toBeTruthy();
      
      // Verify no performance penalty for re-download
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="re-download-complete"]');
      const reDownloadTime = Date.now() - startTime;
      
      expect(reDownloadTime).toBeLessThan(1000); // Should be very fast for cached files
    });
  });

  test.describe('Export Error Handling', () => {
    test('should handle export service failures gracefully', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Simulate export service failure
      await page.route('**/api/rsvp/export**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Export service unavailable' })
        });
      });
      
      // Attempt export
      await page.click('[data-testid="generate-export"]');
      
      // Verify graceful error handling
      await expect(page.locator('[data-testid="export-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-error"]')).toContainText('Unable to generate export');
      
      // Verify retry option
      await expect(page.locator('[data-testid="retry-export"]')).toBeVisible();
    });

    test('should handle partial data export scenarios', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Select export type with potential data issues
      await page.selectOption('[data-testid="export-type"]', 'custom_questions');
      
      // Simulate partial data scenario
      await page.route('**/api/rsvp/custom-questions**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            questions: [], 
            warning: 'No custom questions found' 
          })
        });
      });
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-export"]');
      const download = await downloadPromise;
      
      // Should still generate export with warning
      expect(download.suggestedFilename()).toContain('custom_questions');
      await expect(page.locator('[data-testid="export-warning"]')).toContainText('No custom questions found');
    });
  });

  test.describe('Multi-format Support', () => {
    test('should support Excel format exports', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Note: Excel format might be future enhancement
      const formatOptions = await page.locator('[data-testid="export-format"] option').allTextContents();
      
      if (formatOptions.includes('Excel')) {
        await page.selectOption('[data-testid="export-format"]', 'excel');
        
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="generate-export"]');
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
      }
    });

    test('should maintain data integrity across formats', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Export same data in different formats
      const formats = ['csv', 'json'];
      const downloads = [];
      
      for (const format of formats) {
        await page.selectOption('[data-testid="export-format"]', format);
        
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="generate-export"]');
        downloads.push(await downloadPromise);
        
        await page.waitForTimeout(1000); // Prevent race conditions
      }
      
      // Verify both formats were generated
      expect(downloads[0].suggestedFilename()).toMatch(/\.csv$/);
      expect(downloads[1].suggestedFilename()).toMatch(/\.json$/);
      
      // Verify metadata consistency
      const csvMetadata = await page.locator('[data-testid="csv-export-metadata"]').textContent();
      const jsonMetadata = await page.locator('[data-testid="json-export-metadata"]').textContent();
      
      // Record counts should match
      const csvRecords = csvMetadata?.match(/(\d+) records/)?.[1];
      const jsonRecords = jsonMetadata?.match(/(\d+) records/)?.[1];
      expect(csvRecords).toBe(jsonRecords);
    });
  });

  test.describe('Bulk Export Operations', () => {
    test('should handle multiple simultaneous export requests', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/export`);
      
      // Queue multiple exports
      const exportPromises = [];
      const exportTypes = ['full', 'guests', 'dietary'];
      
      for (const type of exportTypes) {
        await page.selectOption('[data-testid="export-type"]', type);
        const downloadPromise = page.waitForEvent('download');
        exportPromises.push(page.click('[data-testid="generate-export"]').then(() => downloadPromise));
      }
      
      // Wait for all exports to complete
      const startTime = Date.now();
      const downloads = await Promise.all(exportPromises);
      const totalTime = Date.now() - startTime;
      
      // All exports should complete within reasonable time
      expect(totalTime).toBeLessThan(EXPORT_PERFORMANCE_THRESHOLD * 2);
      
      // Verify all downloads succeeded
      expect(downloads.length).toBe(exportTypes.length);
      downloads.forEach(download => {
        expect(download.suggestedFilename()).toBeTruthy();
      });
    });
  });
});