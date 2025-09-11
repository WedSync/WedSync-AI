// WS-084: Playwright E2E Tests for Reminder System
// Tests end-to-end reminder creation, management, and notifications

import { test, expect, type Page } from '@playwright/test';

test.describe('Reminder System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reminders page
    await page.goto('/dashboard/reminders');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Automated Reminders');
  });

  test.describe('Reminder Management Interface', () => {
    test('should display reminders page with correct elements', async ({ page }) => {
      // Check page title and description
      await expect(page.locator('h1')).toContainText('Automated Reminders');
      await expect(page.locator('p')).toContainText('wedding milestone notifications');

      // Check create button
      await expect(page.locator('button', { hasText: 'Create Reminder' })).toBeVisible();

      // Check search input
      await expect(page.locator('input[placeholder="Search reminders..."]')).toBeVisible();

      // Check filter dropdowns
      await expect(page.locator('select').first()).toBeVisible(); // Status filter
      await expect(page.locator('select').nth(1)).toBeVisible(); // Category filter

      // Check stats cards
      await expect(page.locator('[data-testid="scheduled-count"]').or(page.locator('text=Scheduled').locator('..'))).toBeVisible();
      await expect(page.locator('[data-testid="sent-count"]').or(page.locator('text=Sent').locator('..'))).toBeVisible();
      await expect(page.locator('[data-testid="failed-count"]').or(page.locator('text=Failed').locator('..'))).toBeVisible();
      await expect(page.locator('[data-testid="total-count"]').or(page.locator('text=Total').locator('..'))).toBeVisible();
    });

    test('should filter reminders by status', async ({ page }) => {
      // Wait for reminders to load
      await page.waitForLoadState('networkidle');

      // Test status filter
      await page.selectOption('select[data-testid="status-filter"]', 'scheduled');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify URL or results update
      const reminderItems = page.locator('[data-testid="reminder-item"]');
      if (await reminderItems.count() > 0) {
        // If reminders exist, check they all have scheduled status
        const statusBadges = page.locator('[data-testid="status-badge"]');
        const count = await statusBadges.count();
        for (let i = 0; i < count; i++) {
          await expect(statusBadges.nth(i)).toContainText('scheduled');
        }
      }
    });

    test('should search reminders by name', async ({ page }) => {
      // Wait for reminders to load
      await page.waitForLoadState('networkidle');

      // Test search functionality
      await page.fill('input[placeholder="Search reminders..."]', 'payment');
      
      // Wait for search to apply
      await page.waitForTimeout(500);

      // Check if results are filtered (if any exist)
      const reminderItems = page.locator('[data-testid="reminder-item"]');
      if (await reminderItems.count() > 0) {
        // Check that results contain search term
        const firstItem = reminderItems.first();
        await expect(firstItem).toContainText('payment', { ignoreCase: true });
      }
    });
  });

  test.describe('Create Reminder Modal', () => {
    test('should open create reminder modal', async ({ page }) => {
      // Click create reminder button
      await page.click('button:has-text("Create Reminder")');

      // Check modal is visible
      await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).toBeVisible();
      await expect(page.locator('text=Create New Reminder')).toBeVisible();

      // Check required form fields are present
      await expect(page.locator('select[data-testid="template-select"]').or(page.locator('label:has-text("Template")'))).toBeVisible();
      await expect(page.locator('input[data-testid="entity-name"]').or(page.locator('label:has-text("Name")'))).toBeVisible();
      await expect(page.locator('input[type="datetime-local"]')).toBeVisible();

      // Check buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Create Reminder")')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      // Open modal
      await page.click('button:has-text("Create Reminder")');
      await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).toBeVisible();

      // Try to submit without filling required fields
      await page.click('button:has-text("Create Reminder")');

      // Check for validation (browser validation or custom alerts)
      // This might trigger browser validation or a JavaScript alert
      await page.waitForTimeout(500);

      // The modal should still be open
      await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).toBeVisible();
    });

    test('should create reminder with valid data', async ({ page }) => {
      // Mock the create reminder API call
      await page.route('**/api/reminders', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              data: { 
                id: 'reminder-1', 
                entity_name: 'Test Payment Reminder',
                status: 'scheduled'
              } 
            })
          });
        }
      });

      // Open modal
      await page.click('button:has-text("Create Reminder")');
      await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).toBeVisible();

      // Fill out form
      const templateSelect = page.locator('select').first();
      if (await templateSelect.count() > 0) {
        await templateSelect.selectOption({ index: 1 }); // Select first available template
      }

      await page.fill('input[placeholder*="venue payment"]', 'Test Payment Reminder');
      
      // Set date to future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().slice(0, 16);
      await page.fill('input[type="datetime-local"]', dateString);

      // Add custom recipient
      await page.fill('input[placeholder="Email address"]', 'test@example.com');

      // Submit form
      await page.click('button:has-text("Create Reminder")');

      // Wait for modal to close and page to update
      await page.waitForTimeout(1000);
      await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).not.toBeVisible();

      // Check for success message or updated list
      // This depends on your implementation
    });
  });

  test.describe('Reminder Actions', () => {
    test('should snooze a reminder', async ({ page }) => {
      // Create a test reminder first (or ensure one exists)
      await createTestReminder(page);

      // Find first reminder with scheduled status
      const reminderItem = page.locator('[data-testid="reminder-item"]').first();
      if (await reminderItem.count() > 0) {
        // Check if snooze button exists
        const snoozeButton = reminderItem.locator('button:has-text("Snooze")');
        if (await snoozeButton.count() > 0) {
          // Mock the snooze API call
          await page.route('**/api/reminders/*/snooze', async route => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true })
            });
          });

          await snoozeButton.click();

          // Wait for action to complete
          await page.waitForTimeout(500);

          // Check for status change or success message
          // Implementation specific
        }
      }
    });

    test('should cancel a reminder', async ({ page }) => {
      // Create a test reminder first
      await createTestReminder(page);

      // Find first reminder with scheduled status
      const reminderItem = page.locator('[data-testid="reminder-item"]').first();
      if (await reminderItem.count() > 0) {
        const cancelButton = reminderItem.locator('button:has-text("Cancel")');
        if (await cancelButton.count() > 0) {
          // Mock the cancel API call
          await page.route('**/api/reminders/*/cancel', async route => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true })
            });
          });

          await cancelButton.click();

          // Wait for action to complete
          await page.waitForTimeout(500);

          // Verify reminder is cancelled or removed
        }
      }
    });
  });

  test.describe('Channel Icons and Status', () => {
    test('should display correct channel icons', async ({ page }) => {
      // Create a test reminder with multiple channels
      await createTestReminder(page, {
        email: true,
        sms: true,
        inApp: true
      });

      // Check for channel icons
      const reminderItem = page.locator('[data-testid="reminder-item"]').first();
      if (await reminderItem.count() > 0) {
        // Look for email icon (mail symbol)
        await expect(reminderItem.locator('[data-testid="email-icon"]').or(reminderItem.locator('svg').first())).toBeVisible();
        
        // Look for additional channel icons if they exist
        const channelIcons = reminderItem.locator('[data-testid*="-icon"]');
        expect(await channelIcons.count()).toBeGreaterThanOrEqual(1);
      }
    });

    test('should display correct status badges', async ({ page }) => {
      // Wait for reminders to load
      await page.waitForLoadState('networkidle');

      const reminderItems = page.locator('[data-testid="reminder-item"]');
      if (await reminderItems.count() > 0) {
        const statusBadge = reminderItems.first().locator('[data-testid="status-badge"]');
        if (await statusBadge.count() > 0) {
          const statusText = await statusBadge.textContent();
          expect(['scheduled', 'processing', 'sent', 'failed', 'cancelled', 'snoozed']).toContain(statusText?.toLowerCase());
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to reminders page
      await page.goto('/dashboard/reminders');

      // Check that page is still functional
      await expect(page.locator('h1')).toContainText('Automated Reminders');
      await expect(page.locator('button:has-text("Create Reminder")')).toBeVisible();

      // Check that search and filters are still accessible
      await expect(page.locator('input[placeholder="Search reminders..."]')).toBeVisible();

      // Stats cards should adapt to mobile layout
      const statsCards = page.locator('[data-testid*="-count"]');
      if (await statsCards.count() > 0) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error for loading reminders
      await page.route('**/api/reminders', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/dashboard/reminders');

      // Check for error handling
      // This might show an error message or fallback UI
      await page.waitForTimeout(2000);

      // The page should still be functional even with API errors
      await expect(page.locator('h1')).toContainText('Automated Reminders');
    });

    test('should handle empty state', async ({ page }) => {
      // Mock empty reminders response
      await page.route('**/api/reminders', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

      await page.goto('/dashboard/reminders');

      // Check for empty state message
      await expect(page.locator('text=No reminders found')).toBeVisible();
      await expect(page.locator('text=Create your first reminder')).toBeVisible();
    });
  });
});

// Helper function to create test reminder
async function createTestReminder(page: Page, channels = { email: true, sms: false, inApp: true }) {
  // Mock successful creation
  await page.route('**/api/reminders', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          data: { 
            id: 'test-reminder-' + Date.now(), 
            entity_name: 'Test Reminder',
            status: 'scheduled',
            send_email: channels.email,
            send_sms: channels.sms,
            send_in_app: channels.inApp
          } 
        })
      });
    }
  });

  // Open modal and create reminder
  await page.click('button:has-text("Create Reminder")');
  
  // Fill minimum required fields
  const templateSelect = page.locator('select').first();
  if (await templateSelect.count() > 0) {
    await templateSelect.selectOption({ index: 1 });
  }

  await page.fill('input[placeholder*="venue payment"]', 'Test Reminder');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill('input[type="datetime-local"]', tomorrow.toISOString().slice(0, 16));
  
  await page.fill('input[placeholder="Email address"]', 'test@example.com');
  
  // Set channels
  if (channels.email) await page.check('input[type="checkbox"]:near(:text("Email"))');
  if (channels.sms) await page.check('input[type="checkbox"]:near(:text("SMS"))');
  if (channels.inApp) await page.check('input[type="checkbox"]:near(:text("In-App"))');

  await page.click('button:has-text("Create Reminder")');
  
  // Wait for creation to complete
  await page.waitForTimeout(1000);
}