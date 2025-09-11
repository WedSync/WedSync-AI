/**
 * WS-192 Mobile Integration Test Suite
 * Team D - Round 1: Mobile-focused integration tests and performance validation
 */

import { test, expect, devices } from '@playwright/test';

const MOBILE_BREAKPOINTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12/13': { width: 390, height: 844 },
  'iPad': { width: 768, height: 1024 },
  'Desktop': { width: 1920, height: 1080 }
};

// Test across critical mobile breakpoints
for (const [deviceName, viewport] of Object.entries(MOBILE_BREAKPOINTS)) {
  test.describe(`Mobile Integration - ${deviceName}`, () => {
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      // Mock mobile APIs
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', {
          value: { effectiveType: '4g', downlink: 2.5 },
          writable: true
        });
      });
    });

    test('Wedding supplier form creation workflow', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible();

      // Create new form
      await page.click('[data-testid="create-form-btn"]');
      await expect(page.locator('[data-testid="form-builder"]')).toBeVisible();

      // Add form fields optimized for mobile
      await page.fill('#form-title', 'Wedding Client Intake Form');
      await page.click('[data-testid="add-field-btn"]');
      
      // Verify mobile-optimized touch targets
      const addButton = page.locator('[data-testid="add-field-btn"]');
      const boundingBox = await addButton.boundingBox();
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      
      // Save form
      await page.click('[data-testid="save-form-btn"]');
      await expect(page.locator('.success-message')).toBeVisible();
    });

    test('Photo upload with mobile camera integration', async ({ page }) => {
      await page.goto('/photos/upload');
      
      // Mock file upload from mobile camera
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'wedding-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(1024 * 1024 * 2) // 2MB test file
      });

      // Wait for upload progress
      await expect(page.locator('.upload-progress')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.upload-complete')).toBeVisible({ timeout: 30000 });
    });

    test('Offline form submission and sync', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Fill form while online
      await page.fill('#client-name', 'John & Jane Smith');
      await page.fill('#wedding-date', '2024-06-15');
      
      // Go offline
      await context.setOffline(true);
      await page.click('#save-offline');
      
      // Verify offline indicator
      await expect(page.locator('.offline-indicator')).toBeVisible();
      
      // Add more data offline
      await page.fill('#venue-name', 'Garden Manor');
      await page.click('#save-offline');
      
      // Go back online
      await context.setOffline(false);
      
      // Trigger sync
      await page.click('#sync-data');
      await expect(page.locator('.sync-complete')).toBeVisible({ timeout: 15000 });
    });

    test('Touch interaction validation', async ({ page }) => {
      await page.goto('/timeline/builder');
      
      // Test drag and drop with touch events
      const timelineItem = page.locator('[data-testid="timeline-item"]').first();
      const dropZone = page.locator('[data-testid="drop-zone"]').first();
      
      // Simulate touch drag
      await timelineItem.dragTo(dropZone);
      
      // Verify item moved
      await expect(dropZone.locator('[data-testid="timeline-item"]')).toBeVisible();
    });

    test('Cross-device real-time sync', async ({ page, browser }) => {
      // Create second page to simulate another device
      const secondContext = await browser.newContext();
      const secondPage = await secondContext.newPage();
      await secondPage.setViewportSize(viewport);
      
      // Both pages navigate to timeline
      await Promise.all([
        page.goto('/timeline'),
        secondPage.goto('/timeline')
      ]);
      
      // Make change on first device
      await page.click('.timeline-event:first-child .edit-btn');
      await page.fill('#event-time', '15:30');
      await page.click('#save-event');
      
      // Verify change appears on second device
      await expect(secondPage.locator('.timeline-event:first-child')).toContainText('15:30');
      
      await secondContext.close();
    });
  });
}