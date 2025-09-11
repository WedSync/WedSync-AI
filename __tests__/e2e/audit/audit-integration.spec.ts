import { test, expect } from '@playwright/test';
import { AuditTestFramework } from '../framework/AuditTestFramework';

test.describe('Audit System End-to-End Integration Tests', () => {
  let testFramework: AuditTestFramework;

  test.beforeEach(async ({ page }) => {
    testFramework = new AuditTestFramework();
    await page.goto('/login');
    
    // Login as admin to access audit features
    await page.fill('[data-testid="email"]', 'admin@wedsync.test');
    await page.fill('[data-testid="password"]', 'test_password');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test.describe('Audit Log Creation and Viewing Flow', () => {
    test('should create audit logs when performing wedding actions', async ({ page }) => {
      // Navigate to wedding creation
      await page.click('[data-testid="create-wedding-button"]');
      await expect(page.locator('[data-testid="wedding-form"]')).toBeVisible();

      // Fill wedding form
      const weddingData = testFramework.generateWeddingData();
      await page.fill('[data-testid="wedding-name"]', weddingData.name);
      await page.fill('[data-testid="wedding-date"]', weddingData.date);
      await page.fill('[data-testid="wedding-venue"]', weddingData.venue);

      // Submit form - this should create audit logs
      await page.click('[data-testid="submit-wedding"]');
      
      // Verify wedding created
      await expect(page.locator('[data-testid="wedding-created-message"]')).toBeVisible();

      // Navigate to audit logs
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      await expect(page.locator('[data-testid="audit-logs-page"]')).toBeVisible();

      // Verify audit log entries were created
      await expect(page.locator('[data-testid="audit-log-entry"]').first()).toBeVisible();
      
      // Check for wedding creation audit entry
      const auditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(auditEntries.filter({ hasText: 'wedding.create' })).toBeVisible();
      await expect(auditEntries.filter({ hasText: weddingData.name })).toBeVisible();

      // Verify audit entry contains required fields
      const firstEntry = auditEntries.first();
      await firstEntry.click();
      
      await expect(page.locator('[data-testid="audit-entry-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-user-id"]')).toContainText('admin@wedsync.test');
      await expect(page.locator('[data-testid="audit-action"]')).toContainText('wedding.create');
      await expect(page.locator('[data-testid="audit-timestamp"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-resource-id"]')).toBeVisible();
    });

    test('should create audit logs for guest management actions', async ({ page }) => {
      // First create a wedding
      const weddingData = testFramework.generateWeddingData();
      await testFramework.createTestWedding(page, weddingData);

      // Navigate to guest management
      await page.click('[data-testid="manage-guests-button"]');
      await expect(page.locator('[data-testid="guest-management-page"]')).toBeVisible();

      // Add multiple guests
      const guests = [
        { name: 'John Doe', email: 'john@example.com', rsvpStatus: 'pending' },
        { name: 'Jane Smith', email: 'jane@example.com', rsvpStatus: 'attending' },
        { name: 'Bob Johnson', email: 'bob@example.com', rsvpStatus: 'declined' }
      ];

      for (const guest of guests) {
        await page.click('[data-testid="add-guest-button"]');
        await page.fill('[data-testid="guest-name"]', guest.name);
        await page.fill('[data-testid="guest-email"]', guest.email);
        await page.selectOption('[data-testid="rsvp-status"]', guest.rsvpStatus);
        await page.click('[data-testid="save-guest-button"]');
        
        // Verify guest added
        await expect(page.locator(`[data-testid="guest-row"][data-guest-name="${guest.name}"]`)).toBeVisible();
      }

      // Navigate to audit logs
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');

      // Filter audit logs by guest actions
      await page.selectOption('[data-testid="action-filter"]', 'wedding.guest.add');
      await page.click('[data-testid="apply-filter-button"]');

      // Verify guest addition audit entries
      const guestAuditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(guestAuditEntries).toHaveCount(3);

      // Verify each guest audit entry
      for (const guest of guests) {
        await expect(guestAuditEntries.filter({ hasText: guest.name })).toBeVisible();
        await expect(guestAuditEntries.filter({ hasText: guest.email })).toBeVisible();
      }
    });
  });

  test.describe('Real-time Audit Monitoring', () => {
    test('should display real-time audit updates', async ({ page, context }) => {
      // Open audit monitoring page
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-monitor-link"]');
      await expect(page.locator('[data-testid="audit-monitor-page"]')).toBeVisible();

      // Enable real-time monitoring
      await page.check('[data-testid="real-time-monitor-toggle"]');
      await expect(page.locator('[data-testid="real-time-status"]')).toContainText('Connected');

      // Open a new tab to perform actions
      const newPage = await context.newPage();
      await newPage.goto('/login');
      await newPage.fill('[data-testid="email"]', 'user@wedsync.test');
      await newPage.fill('[data-testid="password"]', 'test_password');
      await newPage.click('[data-testid="login-button"]');

      // Perform actions in new tab
      const weddingData = testFramework.generateWeddingData();
      await testFramework.createTestWedding(newPage, weddingData);

      // Verify real-time audit updates in monitoring tab
      await page.waitForSelector('[data-testid="real-time-audit-entry"]', { timeout: 5000 });
      
      const realtimeEntries = page.locator('[data-testid="real-time-audit-entry"]');
      await expect(realtimeEntries.first()).toBeVisible();
      await expect(realtimeEntries.first()).toContainText('wedding.create');
      await expect(realtimeEntries.first()).toContainText(weddingData.name);

      // Verify timestamp is recent (within last minute)
      const timestampText = await realtimeEntries.first().locator('[data-testid="audit-timestamp"]').textContent();
      const timestamp = new Date(timestampText!);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 60 seconds

      await newPage.close();
    });

    test('should handle high-volume real-time audit events', async ({ page, context }) => {
      // Open audit monitoring with performance view
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-monitor-link"]');
      await page.click('[data-testid="performance-view-tab"]');
      
      await expect(page.locator('[data-testid="audit-performance-dashboard"]')).toBeVisible();

      // Start monitoring performance metrics
      await page.check('[data-testid="performance-monitor-toggle"]');

      // Simulate high-volume activity
      const activityPages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);

      // Login all activity pages
      for (const activityPage of activityPages) {
        await activityPage.goto('/login');
        await activityPage.fill('[data-testid="email"]', 'user@wedsync.test');
        await activityPage.fill('[data-testid="password"]', 'test_password');
        await activityPage.click('[data-testid="login-button"]');
      }

      // Perform concurrent actions
      const actionPromises = activityPages.map(async (activityPage, index) => {
        const weddingData = testFramework.generateWeddingData();
        weddingData.name = `Concurrent Wedding ${index + 1}`;
        
        await testFramework.createTestWedding(activityPage, weddingData);
        
        // Add multiple guests rapidly
        await activityPage.click('[data-testid="manage-guests-button"]');
        for (let i = 0; i < 5; i++) {
          await activityPage.click('[data-testid="add-guest-button"]');
          await activityPage.fill('[data-testid="guest-name"]', `Guest ${i + 1}`);
          await activityPage.fill('[data-testid="guest-email"]', `guest${i + 1}@example.com`);
          await activityPage.click('[data-testid="save-guest-button"]');
        }
      });

      await Promise.all(actionPromises);

      // Verify performance metrics in monitoring dashboard
      await expect(page.locator('[data-testid="audit-throughput-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate-metric"]')).toBeVisible();

      // Check that throughput increased
      const throughputText = await page.locator('[data-testid="audit-throughput-value"]').textContent();
      const throughput = parseFloat(throughputText!);
      expect(throughput).toBeGreaterThan(10); // Should be > 10 events/second

      // Check that response time is acceptable
      const responseTimeText = await page.locator('[data-testid="response-time-value"]').textContent();
      const responseTime = parseFloat(responseTimeText!);
      expect(responseTime).toBeLessThan(500); // Should be < 500ms

      // Check that error rate is low
      const errorRateText = await page.locator('[data-testid="error-rate-value"]').textContent();
      const errorRate = parseFloat(errorRateText!);
      expect(errorRate).toBeLessThan(1); // Should be < 1%

      // Cleanup
      await Promise.all(activityPages.map(page => page.close()));
    });
  });

  test.describe('Audit Search and Filtering', () => {
    test('should support complex audit log searching and filtering', async ({ page }) => {
      // Create test data first
      const testData = await testFramework.createTestAuditData(page, {
        weddings: 2,
        guestsPerWedding: 3,
        vendorsPerWedding: 2,
        tasksPerWedding: 5
      });

      // Navigate to audit search
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-search-link"]');
      await expect(page.locator('[data-testid="audit-search-page"]')).toBeVisible();

      // Test date range filtering
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await page.fill('[data-testid="date-from"]', yesterday.toISOString().split('T')[0]);
      await page.fill('[data-testid="date-to"]', tomorrow.toISOString().split('T')[0]);
      await page.click('[data-testid="apply-date-filter"]');

      // Should show all recent entries
      const allEntries = page.locator('[data-testid="audit-search-result"]');
      await expect(allEntries.first()).toBeVisible();
      const totalCount = await allEntries.count();
      expect(totalCount).toBeGreaterThan(20); // Should have many entries from test data

      // Test action filtering
      await page.selectOption('[data-testid="action-filter"]', 'wedding.guest.add');
      await page.click('[data-testid="apply-action-filter"]');
      
      const guestEntries = page.locator('[data-testid="audit-search-result"]');
      await expect(guestEntries.first()).toBeVisible();
      const guestCount = await guestEntries.count();
      expect(guestCount).toBe(6); // 2 weddings * 3 guests each

      // Test user filtering
      await page.selectOption('[data-testid="action-filter"]', 'all'); // Clear action filter
      await page.fill('[data-testid="user-filter"]', 'admin@wedsync.test');
      await page.click('[data-testid="apply-user-filter"]');
      
      const adminEntries = page.locator('[data-testid="audit-search-result"]');
      await expect(adminEntries.first()).toBeVisible();
      
      // Verify all entries are from admin user
      const entryCount = await adminEntries.count();
      for (let i = 0; i < Math.min(entryCount, 10); i++) {
        await expect(adminEntries.nth(i).locator('[data-testid="audit-user"]')).toContainText('admin@wedsync.test');
      }

      // Test text search
      await page.fill('[data-testid="user-filter"]', ''); // Clear user filter
      await page.fill('[data-testid="text-search"]', testData.weddings[0].name);
      await page.click('[data-testid="apply-text-search"]');
      
      const textSearchEntries = page.locator('[data-testid="audit-search-result"]');
      await expect(textSearchEntries.first()).toBeVisible();
      
      // Verify entries contain the searched wedding name
      const searchResults = await textSearchEntries.count();
      for (let i = 0; i < Math.min(searchResults, 5); i++) {
        await expect(textSearchEntries.nth(i)).toContainText(testData.weddings[0].name);
      }
    });

    test('should export audit logs with proper formatting', async ({ page }) => {
      // Navigate to audit search
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-search-link"]');

      // Set up filters for specific data
      await page.selectOption('[data-testid="action-filter"]', 'wedding.create');
      await page.click('[data-testid="apply-action-filter"]');

      // Start export
      await page.click('[data-testid="export-audit-logs"]');
      
      // Choose export format
      await expect(page.locator('[data-testid="export-format-dialog"]')).toBeVisible();
      await page.selectOption('[data-testid="export-format"]', 'json');
      await page.click('[data-testid="confirm-export"]');

      // Wait for export to complete
      await expect(page.locator('[data-testid="export-status"]')).toContainText('Export completed');
      
      // Verify download link
      await expect(page.locator('[data-testid="download-export"]')).toBeVisible();
      
      // Click download and verify file
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-export"]');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/audit-export-.*\.json/);

      // Test CSV export as well
      await page.click('[data-testid="export-audit-logs"]');
      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.click('[data-testid="confirm-export"]');
      
      await expect(page.locator('[data-testid="export-status"]')).toContainText('Export completed');
      
      const csvDownloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-export"]');
      const csvDownload = await csvDownloadPromise;
      
      expect(csvDownload.suggestedFilename()).toMatch(/audit-export-.*\.csv/);
    });
  });

  test.describe('Integration with Teams A-D Components', () => {
    test('should audit vendor management actions (Team A integration)', async ({ page }) => {
      // Navigate to vendor management (Team A feature)
      await page.click('[data-testid="vendors-menu"]');
      await page.click('[data-testid="manage-vendors-link"]');
      await expect(page.locator('[data-testid="vendor-management-page"]')).toBeVisible();

      // Add a new vendor
      await page.click('[data-testid="add-vendor-button"]');
      await page.fill('[data-testid="vendor-name"]', 'Elite Catering Services');
      await page.fill('[data-testid="vendor-email"]', 'info@elitecatering.com');
      await page.selectOption('[data-testid="vendor-category"]', 'catering');
      await page.fill('[data-testid="vendor-phone"]', '+1-555-0123');
      await page.click('[data-testid="save-vendor-button"]');

      // Verify vendor created
      await expect(page.locator('[data-testid="vendor-created-message"]')).toBeVisible();

      // Contact the vendor
      await page.click('[data-testid="contact-vendor-button"]');
      await page.fill('[data-testid="contact-message"]', 'Interested in catering services for June wedding');
      await page.click('[data-testid="send-contact-button"]');

      // Check audit logs for vendor actions
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      
      // Filter for vendor actions
      await page.selectOption('[data-testid="action-filter"]', 'vendor');
      await page.click('[data-testid="apply-filter-button"]');

      const vendorAuditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(vendorAuditEntries).toHaveCount(2); // vendor.add and vendor.contact

      // Verify vendor.add entry
      await expect(vendorAuditEntries.filter({ hasText: 'vendor.add' })).toBeVisible();
      await expect(vendorAuditEntries.filter({ hasText: 'Elite Catering Services' })).toBeVisible();

      // Verify vendor.contact entry
      await expect(vendorAuditEntries.filter({ hasText: 'vendor.contact' })).toBeVisible();
    });

    test('should audit budget management actions (Team B integration)', async ({ page }) => {
      // First create a wedding
      const weddingData = testFramework.generateWeddingData();
      await testFramework.createTestWedding(page, weddingData);

      // Navigate to budget management (Team B feature)
      await page.click('[data-testid="budget-menu"]');
      await page.click('[data-testid="manage-budget-link"]');
      await expect(page.locator('[data-testid="budget-management-page"]')).toBeVisible();

      // Create budget categories
      const budgetCategories = [
        { name: 'Venue', amount: 8000 },
        { name: 'Catering', amount: 12000 },
        { name: 'Photography', amount: 3500 },
        { name: 'Flowers', amount: 2000 }
      ];

      for (const category of budgetCategories) {
        await page.click('[data-testid="add-budget-category"]');
        await page.fill('[data-testid="category-name"]', category.name);
        await page.fill('[data-testid="category-amount"]', category.amount.toString());
        await page.click('[data-testid="save-category-button"]');
      }

      // Add expenses to categories
      await page.click('[data-testid="venue-category"]');
      await page.click('[data-testid="add-expense-button"]');
      await page.fill('[data-testid="expense-description"]', 'Venue deposit');
      await page.fill('[data-testid="expense-amount"]', '2000');
      await page.click('[data-testid="save-expense-button"]');

      // Check audit logs for budget actions
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      
      // Filter for budget actions
      await page.selectOption('[data-testid="action-filter"]', 'budget');
      await page.click('[data-testid="apply-filter-button"]');

      const budgetAuditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(budgetAuditEntries.first()).toBeVisible();

      // Should have entries for category creation and expense addition
      await expect(budgetAuditEntries.filter({ hasText: 'budget.category.add' })).toHaveCount(4);
      await expect(budgetAuditEntries.filter({ hasText: 'budget.expense.add' })).toHaveCount(1);
    });

    test('should audit task management actions (Team C integration)', async ({ page }) => {
      // First create a wedding
      const weddingData = testFramework.generateWeddingData();
      await testFramework.createTestWedding(page, weddingData);

      // Navigate to task management (Team C feature)
      await page.click('[data-testid="tasks-menu"]');
      await page.click('[data-testid="manage-tasks-link"]');
      await expect(page.locator('[data-testid="task-management-page"]')).toBeVisible();

      // Create wedding planning tasks
      const tasks = [
        {
          name: 'Book wedding venue',
          description: 'Research and book the perfect venue',
          dueDate: '2024-03-15',
          priority: 'high',
          assignee: 'couple'
        },
        {
          name: 'Send invitations',
          description: 'Design, print, and send wedding invitations',
          dueDate: '2024-04-01',
          priority: 'medium',
          assignee: 'wedding_planner'
        }
      ];

      for (const task of tasks) {
        await page.click('[data-testid="add-task-button"]');
        await page.fill('[data-testid="task-name"]', task.name);
        await page.fill('[data-testid="task-description"]', task.description);
        await page.fill('[data-testid="task-due-date"]', task.dueDate);
        await page.selectOption('[data-testid="task-priority"]', task.priority);
        await page.selectOption('[data-testid="task-assignee"]', task.assignee);
        await page.click('[data-testid="save-task-button"]');
      }

      // Mark a task as complete
      await page.click('[data-testid="task-checkbox"]:first-child');
      await page.fill('[data-testid="completion-notes"]', 'Venue successfully booked at Garden Hall');
      await page.click('[data-testid="confirm-completion"]');

      // Check audit logs for task actions
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      
      // Filter for task actions
      await page.selectOption('[data-testid="action-filter"]', 'task');
      await page.click('[data-testid="apply-filter-button"]');

      const taskAuditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(taskAuditEntries.first()).toBeVisible();

      // Should have entries for task creation and completion
      await expect(taskAuditEntries.filter({ hasText: 'task.create' })).toHaveCount(2);
      await expect(taskAuditEntries.filter({ hasText: 'task.complete' })).toHaveCount(1);
      await expect(taskAuditEntries.filter({ hasText: 'Book wedding venue' })).toBeVisible();
    });

    test('should audit analytics dashboard actions (Team D integration)', async ({ page }) => {
      // Navigate to analytics dashboard (Team D feature)
      await page.click('[data-testid="analytics-menu"]');
      await page.click('[data-testid="dashboard-link"]');
      await expect(page.locator('[data-testid="analytics-dashboard-page"]')).toBeVisible();

      // View different analytics sections
      const analyticsActions = [
        { section: 'wedding-metrics', action: 'analytics.wedding_metrics.view' },
        { section: 'vendor-performance', action: 'analytics.vendor_performance.view' },
        { section: 'budget-analysis', action: 'analytics.budget_analysis.view' },
        { section: 'guest-insights', action: 'analytics.guest_insights.view' }
      ];

      for (const analytics of analyticsActions) {
        await page.click(`[data-testid="${analytics.section}-tab"]`);
        await expect(page.locator(`[data-testid="${analytics.section}-content"]`)).toBeVisible();
        
        // Wait for data to load
        await page.waitForTimeout(1000);
      }

      // Export analytics report
      await page.click('[data-testid="export-analytics-button"]');
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      await page.click('[data-testid="generate-report-button"]');
      
      await expect(page.locator('[data-testid="report-generated-message"]')).toBeVisible();

      // Check audit logs for analytics actions
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      
      // Filter for analytics actions
      await page.selectOption('[data-testid="action-filter"]', 'analytics');
      await page.click('[data-testid="apply-filter-button"]');

      const analyticsAuditEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(analyticsAuditEntries.first()).toBeVisible();

      // Should have entries for each analytics view and export
      await expect(analyticsAuditEntries.filter({ hasText: 'analytics' })).toHaveCount(5); // 4 views + 1 export
      await expect(analyticsAuditEntries.filter({ hasText: 'analytics.report.export' })).toHaveCount(1);
    });
  });

  test.describe('Cross-System Data Flow Validation', () => {
    test('should maintain audit trail across wedding lifecycle', async ({ page }) => {
      // Create complete wedding workflow and verify audit trail
      const weddingData = testFramework.generateWeddingData();
      
      // Step 1: Create wedding
      await testFramework.createTestWedding(page, weddingData);
      
      // Step 2: Add vendors
      await page.click('[data-testid="manage-vendors-link"]');
      await testFramework.addTestVendor(page, {
        name: 'Elite Photography',
        category: 'photography',
        email: 'info@elitephoto.com'
      });
      
      // Step 3: Set up budget
      await page.click('[data-testid="manage-budget-link"]');
      await testFramework.createTestBudget(page, {
        categories: [
          { name: 'Photography', amount: 3500 },
          { name: 'Venue', amount: 8000 }
        ]
      });
      
      // Step 4: Create tasks
      await page.click('[data-testid="manage-tasks-link"]');
      await testFramework.createTestTasks(page, [
        { name: 'Confirm photography package', assignee: 'couple' },
        { name: 'Schedule venue walkthrough', assignee: 'wedding_planner' }
      ]);
      
      // Step 5: Add guests
      await page.click('[data-testid="manage-guests-link"]');
      await testFramework.addTestGuests(page, [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ]);

      // Navigate to audit trail view
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-trail-link"]');
      
      // Filter by wedding ID to see complete lifecycle
      await page.fill('[data-testid="wedding-id-filter"]', weddingData.id);
      await page.click('[data-testid="apply-wedding-filter"]');

      // Verify complete audit trail
      const lifecycleEntries = page.locator('[data-testid="audit-trail-entry"]');
      await expect(lifecycleEntries.first()).toBeVisible();

      // Should have entries for all major actions
      const expectedActions = [
        'wedding.create',
        'vendor.add',
        'budget.category.add',
        'task.create',
        'guest.add'
      ];

      for (const action of expectedActions) {
        await expect(lifecycleEntries.filter({ hasText: action })).toBeVisible();
      }

      // Verify chronological order
      const timestamps = await lifecycleEntries.locator('[data-testid="entry-timestamp"]').allTextContents();
      const parsedTimestamps = timestamps.map(ts => new Date(ts).getTime());
      
      // Timestamps should be in descending order (newest first)
      for (let i = 1; i < parsedTimestamps.length; i++) {
        expect(parsedTimestamps[i]).toBeLessThanOrEqual(parsedTimestamps[i - 1]);
      }
    });

    test('should handle concurrent multi-user audit scenarios', async ({ page, context }) => {
      // Create multiple user sessions
      const userSessions = await Promise.all([
        { page: await context.newPage(), role: 'wedding_planner' },
        { page: await context.newPage(), role: 'couple' },
        { page: await context.newPage(), role: 'vendor' }
      ]);

      // Login all users
      for (const session of userSessions) {
        await session.page.goto('/login');
        await session.page.fill('[data-testid="email"]', `${session.role}@wedsync.test`);
        await session.page.fill('[data-testid="password"]', 'test_password');
        await session.page.click('[data-testid="login-button"]');
        await expect(session.page.locator('[data-testid="dashboard"]')).toBeVisible();
      }

      // Create shared wedding data
      const weddingData = testFramework.generateWeddingData();
      await testFramework.createTestWedding(userSessions[0].page, weddingData);
      
      // Share wedding ID with other sessions
      const weddingId = weddingData.id;

      // Perform concurrent actions
      const concurrentActions = [
        // Wedding planner adds tasks
        testFramework.createTestTasks(userSessions[0].page, [
          { name: 'Finalize menu selection', assignee: 'couple' },
          { name: 'Confirm vendor contracts', assignee: 'wedding_planner' }
        ]),
        
        // Couple adds guests
        testFramework.addTestGuests(userSessions[1].page, [
          { name: 'Alice Johnson', email: 'alice@example.com' },
          { name: 'Bob Wilson', email: 'bob@example.com' }
        ]),
        
        // Vendor updates availability
        testFramework.updateVendorAvailability(userSessions[2].page, {
          weddingId: weddingId,
          available: true,
          notes: 'Available for June date'
        })
      ];

      await Promise.all(concurrentActions);

      // Verify audit logs capture all concurrent actions correctly
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-logs-link"]');
      
      // Filter by wedding ID and recent timeframe
      await page.fill('[data-testid="wedding-id-filter"]', weddingId);
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      await page.fill('[data-testid="date-from"]', oneMinuteAgo.toISOString().slice(0, 16));
      await page.fill('[data-testid="date-to"]', now.toISOString().slice(0, 16));
      await page.click('[data-testid="apply-filters"]');

      const concurrentEntries = page.locator('[data-testid="audit-log-entry"]');
      await expect(concurrentEntries.first()).toBeVisible();

      // Verify all users' actions are captured
      await expect(concurrentEntries.filter({ hasText: 'wedding_planner@wedsync.test' })).toBeVisible();
      await expect(concurrentEntries.filter({ hasText: 'couple@wedsync.test' })).toBeVisible();
      await expect(concurrentEntries.filter({ hasText: 'vendor@wedsync.test' })).toBeVisible();

      // Verify no audit conflicts or missing entries
      const entryCount = await concurrentEntries.count();
      expect(entryCount).toBeGreaterThan(5); // Should have multiple entries from concurrent actions

      // Cleanup sessions
      await Promise.all(userSessions.map(session => session.page.close()));
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle audit system failures gracefully', async ({ page }) => {
      // Simulate audit system connectivity issues
      await page.route('**/api/audit/**', route => route.abort());

      // Try to perform actions that would normally create audit logs
      const weddingData = testFramework.generateWeddingData();
      
      // This should show error but not block functionality
      await page.click('[data-testid="create-wedding-button"]');
      await page.fill('[data-testid="wedding-name"]', weddingData.name);
      await page.fill('[data-testid="wedding-date"]', weddingData.date);
      await page.click('[data-testid="submit-wedding"]');

      // Wedding should be created despite audit failure
      await expect(page.locator('[data-testid="wedding-created-message"]')).toBeVisible();
      
      // But there should be a warning about audit logging
      await expect(page.locator('[data-testid="audit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-warning"]')).toContainText('Audit logging temporarily unavailable');

      // Restore audit connectivity
      await page.unroute('**/api/audit/**');

      // Verify that subsequent actions create audit logs normally
      await page.click('[data-testid="manage-guests-link"]');
      await page.click('[data-testid="add-guest-button"]');
      await page.fill('[data-testid="guest-name"]', 'Test Guest');
      await page.fill('[data-testid="guest-email"]', 'test@example.com');
      await page.click('[data-testid="save-guest-button"]');

      // Should not show warning this time
      await expect(page.locator('[data-testid="audit-warning"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="guest-created-message"]')).toBeVisible();
    });

    test('should recover from audit data corruption', async ({ page }) => {
      // Navigate to audit system diagnostics
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="system-diagnostics-link"]');
      await page.click('[data-testid="audit-diagnostics-tab"]');

      // Run audit integrity check
      await page.click('[data-testid="run-integrity-check"]');
      await expect(page.locator('[data-testid="integrity-check-running"]')).toBeVisible();
      
      // Wait for check completion
      await expect(page.locator('[data-testid="integrity-check-complete"]')).toBeVisible({ timeout: 10000 });

      // Should show integrity status
      await expect(page.locator('[data-testid="integrity-status"]')).toBeVisible();
      
      // If issues found, should offer recovery options
      const integrityStatus = await page.locator('[data-testid="integrity-status"]').textContent();
      
      if (integrityStatus?.includes('Issues found')) {
        // Should have recovery options
        await expect(page.locator('[data-testid="recovery-options"]')).toBeVisible();
        await expect(page.locator('[data-testid="restore-from-backup"]')).toBeVisible();
        await expect(page.locator('[data-testid="rebuild-indices"]')).toBeVisible();
        
        // Test rebuild indices option
        await page.click('[data-testid="rebuild-indices"]');
        await expect(page.locator('[data-testid="rebuild-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="rebuild-complete"]')).toBeVisible({ timeout: 15000 });
        
        // Run integrity check again
        await page.click('[data-testid="run-integrity-check"]');
        await expect(page.locator('[data-testid="integrity-check-complete"]')).toBeVisible({ timeout: 10000 });
        
        // Should show improved status
        const newIntegrityStatus = await page.locator('[data-testid="integrity-status"]').textContent();
        expect(newIntegrityStatus).toContain('Healthy');
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain audit performance during high-load scenarios', async ({ page, context }) => {
      // Start performance monitoring
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="audit-performance-link"]');
      await page.click('[data-testid="start-performance-monitoring"]');

      // Create multiple concurrent sessions for load testing
      const loadSessions = [];
      for (let i = 0; i < 5; i++) {
        const sessionPage = await context.newPage();
        await sessionPage.goto('/login');
        await sessionPage.fill('[data-testid="email"]', `loadtest${i}@wedsync.test`);
        await sessionPage.fill('[data-testid="password"]', 'test_password');
        await sessionPage.click('[data-testid="login-button"]');
        loadSessions.push(sessionPage);
      }

      // Generate heavy audit load
      const loadPromises = loadSessions.map(async (sessionPage, sessionIndex) => {
        // Each session creates multiple weddings with full data
        for (let i = 0; i < 3; i++) {
          const weddingData = testFramework.generateWeddingData();
          weddingData.name = `Load Test Wedding ${sessionIndex}-${i}`;
          
          await testFramework.createTestWedding(sessionPage, weddingData);
          await testFramework.addTestGuests(sessionPage, [
            { name: `Guest 1`, email: `g1-${sessionIndex}-${i}@example.com` },
            { name: `Guest 2`, email: `g2-${sessionIndex}-${i}@example.com` },
            { name: `Guest 3`, email: `g3-${sessionIndex}-${i}@example.com` }
          ]);
        }
      });

      const startTime = Date.now();
      await Promise.all(loadPromises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;

      // Check performance metrics
      await expect(page.locator('[data-testid="audit-throughput"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time-p95"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate"]')).toBeVisible();

      // Verify acceptable performance
      const throughputText = await page.locator('[data-testid="throughput-value"]').textContent();
      const throughput = parseFloat(throughputText!);
      expect(throughput).toBeGreaterThan(20); // > 20 audits/second

      const responseTimeText = await page.locator('[data-testid="p95-response-time"]').textContent();
      const responseTime = parseFloat(responseTimeText!);
      expect(responseTime).toBeLessThan(1000); // < 1 second 95th percentile

      const errorRateText = await page.locator('[data-testid="error-rate-value"]').textContent();
      const errorRate = parseFloat(errorRateText!);
      expect(errorRate).toBeLessThan(2); // < 2% error rate

      // Total load test should complete in reasonable time
      expect(totalTime).toBeLessThan(60000); // < 60 seconds for all operations

      // Cleanup
      await Promise.all(loadSessions.map(sessionPage => sessionPage.close()));
    });
  });
});