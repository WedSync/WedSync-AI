import { test, expect } from '@playwright/test';

test.describe('Helper Scheduling System - Complete Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data and authentication
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'helper@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('Complete Helper Schedule Workflow', async ({ page }) => {
    // Navigate to helper schedules
    await page.click('[data-testid="schedules-nav"]');
    await expect(page.locator('[data-testid="schedule-overview"]')).toBeVisible();

    // Test schedule creation
    await page.click('[data-testid="add-task-btn"]');
    await page.fill('[data-testid="task-title"]', 'Set up ceremony decorations');
    await page.fill('[data-testid="task-description"]', 'Place flowers and arrange seating for ceremony');
    await page.selectOption('[data-testid="task-category"]', 'Setup');
    await page.fill('[data-testid="task-duration"]', '60'); // 60 minutes
    await page.fill('[data-testid="task-start-time"]', '14:00');
    await page.click('[data-testid="save-task"]');
    
    // Verify task appears in schedule
    await expect(page.locator('[data-testid="task-Set up ceremony decorations"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-Set up ceremony decorations"]')).toContainText('2:00 PM');

    // Test task assignment
    await page.click('[data-testid="task-Set up ceremony decorations"] [data-testid="assign-btn"]');
    await page.selectOption('[data-testid="helper-select"]', 'helper-1');
    await page.click('[data-testid="confirm-assignment"]');
    
    // Verify assignment
    await expect(page.locator('[data-testid="task-Set up ceremony decorations"] .assigned-to')).toContainText('Helper 1');

    // Test task status updates
    await page.click('[data-testid="task-Set up ceremony decorations"] [data-testid="status-btn"]');
    await page.selectOption('[data-testid="status-select"]', 'in-progress');
    await page.click('[data-testid="update-status"]');
    
    // Verify status change
    await expect(page.locator('[data-testid="task-Set up ceremony decorations"] [data-badge="in-progress"]')).toBeVisible();

    // Test photo evidence upload
    await page.click('[data-testid="task-Set up ceremony decorations"] [data-testid="add-evidence-btn"]');
    await page.setInputFiles('[data-testid="evidence-upload"]', './test-fixtures/setup-photo.jpg');
    await page.fill('[data-testid="evidence-notes"]', 'Ceremony setup completed as requested');
    await page.click('[data-testid="submit-evidence"]');
    
    // Verify evidence appears
    await expect(page.locator('[data-testid="task-Set up ceremony decorations"] .evidence-count')).toContainText('1 photo');

    // Test timeline view
    await page.click('[data-testid="timeline-view-btn"]');
    await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-task-Set up ceremony decorations"]')).toBeVisible();

    // Test calendar export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-calendar-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('wedding-schedule.ics');
  });

  test('Real-time Schedule Updates', async ({ page, context }) => {
    // Create coordinator context
    const coordinatorPage = await context.newPage();
    
    // Both users navigate to schedule page
    await page.goto('/wedding/helpers/schedule?wedding_id=shared-wedding');
    await coordinatorPage.goto('/wedding/coordinator/schedule?wedding_id=shared-wedding');
    
    // Coordinator adds new task
    await coordinatorPage.click('[data-testid="add-task-btn"]');
    await coordinatorPage.fill('[data-testid="task-title"]', 'Emergency Task');
    await coordinatorPage.fill('[data-testid="task-start-time"]', '15:30');
    await coordinatorPage.click('[data-testid="save-task"]');
    
    // Helper should see the new task appear in real-time
    await expect(page.locator('[data-testid="task-Emergency Task"]')).toBeVisible({ timeout: 5000 });
    
    // Helper updates task status
    await page.click('[data-testid="task-Emergency Task"] [data-testid="status-btn"]');
    await page.selectOption('[data-testid="status-select"]', 'completed');
    await page.click('[data-testid="update-status"]');
    
    // Coordinator sees status update
    await expect(coordinatorPage.locator('[data-testid="task-Emergency Task"] [data-badge="completed"]')).toBeVisible({ timeout: 5000 });
    
    await coordinatorPage.close();
  });

  test('Task Dependencies and Conflicts', async ({ page }) => {
    await page.goto('/wedding/helpers/schedule');
    
    // Create first task
    await page.click('[data-testid="add-task-btn"]');
    await page.fill('[data-testid="task-title"]', 'Setup sound system');
    await page.fill('[data-testid="task-start-time"]', '13:00');
    await page.fill('[data-testid="task-duration"]', '30');
    await page.click('[data-testid="save-task"]');
    
    // Create dependent task
    await page.click('[data-testid="add-task-btn"]');
    await page.fill('[data-testid="task-title"]', 'Sound check');
    await page.fill('[data-testid="task-start-time"]', '13:15'); // Overlapping time
    await page.selectOption('[data-testid="depends-on"]', 'Setup sound system');
    await page.click('[data-testid="save-task"]');
    
    // System should detect conflict
    await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('dependency conflict');
    
    // Resolve conflict by adjusting time
    await page.click('[data-testid="resolve-conflict-btn"]');
    await page.click('[data-testid="auto-resolve"]');
    
    // Verify conflict is resolved
    await expect(page.locator('[data-testid="task-Sound check"]')).toContainText('1:30 PM');
    await expect(page.locator('[data-testid="conflict-warning"]')).not.toBeVisible();
  });

  test('Mobile Responsive Schedule Management', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/wedding/helpers/schedule');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-schedule-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-cards"]')).toHaveClass(/flex-col/);
    
    // Test mobile task interaction
    await page.click('[data-testid="task-card-1"]');
    await expect(page.locator('[data-testid="task-details-drawer"]')).toBeVisible();
    
    // Test swipe actions
    const taskCard = page.locator('[data-testid="task-card-1"]');
    await taskCard.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0); // Swipe right
    await page.mouse.up();
    
    // Should reveal action buttons
    await expect(page.locator('[data-testid="task-card-1"] .swipe-actions')).toBeVisible();
    
    // Test quick status update
    await page.click('[data-testid="task-card-1"] [data-testid="quick-complete"]');
    await expect(page.locator('[data-testid="task-card-1"] [data-badge="completed"]')).toBeVisible();
  });

  test('Schedule Analytics and Reporting', async ({ page }) => {
    await page.goto('/wedding/helpers/schedule');
    
    // Navigate to analytics tab
    await page.click('[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="schedule-analytics"]')).toBeVisible();
    
    // Verify analytics widgets
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-tracking"]')).toBeVisible();
    await expect(page.locator('[data-testid="helper-performance"]')).toBeVisible();
    
    // Test filtering
    await page.selectOption('[data-testid="date-range-filter"]', 'last-week');
    await page.click('[data-testid="apply-filter"]');
    
    // Verify filtered data
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    // Test report export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-report-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/schedule-report-.*\.pdf$/);
  });

  test('Notification and Reminder System', async ({ page }) => {
    await page.goto('/wedding/helpers/schedule');
    
    // Set up a task with reminder
    await page.click('[data-testid="add-task-btn"]');
    await page.fill('[data-testid="task-title"]', 'Final venue check');
    await page.fill('[data-testid="task-start-time"]', '16:00');
    await page.check('[data-testid="enable-reminder"]');
    await page.selectOption('[data-testid="reminder-time"]', '30'); // 30 minutes before
    await page.click('[data-testid="save-task"]');
    
    // Mock time to trigger reminder
    await page.evaluate(() => {
      // Mock current time to be 30 minutes before task
      const mockTime = new Date();
      mockTime.setHours(15, 30, 0, 0);
      Date.now = () => mockTime.getTime();
    });
    
    // Trigger reminder check
    await page.click('[data-testid="refresh-notifications"]');
    
    // Verify notification appears
    await expect(page.locator('[data-testid="notification-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Final venue check starts in 30 minutes');
    
    // Test notification interaction
    await page.click('[data-testid="notification-banner"] [data-testid="mark-ready"]');
    await expect(page.locator('[data-testid="task-Final venue check"] [data-badge="ready"]')).toBeVisible();
  });

  test('Integration with Budget System', async ({ page }) => {
    await page.goto('/wedding/helpers/schedule');
    
    // Create task with budget impact
    await page.click('[data-testid="add-task-btn"]');
    await page.fill('[data-testid="task-title"]', 'Purchase decorative items');
    await page.fill('[data-testid="task-start-time"]', '10:00');
    await page.check('[data-testid="has-budget-impact"]');
    await page.selectOption('[data-testid="budget-category"]', 'Decorations');
    await page.fill('[data-testid="estimated-cost"]', '250.00');
    await page.click('[data-testid="save-task"]');
    
    // Verify budget integration
    await expect(page.locator('[data-testid="task-Purchase decorative items"] .budget-info')).toContainText('$250.00');
    
    // Navigate to budget section to verify update
    await page.click('[data-testid="budget-nav"]');
    await expect(page.locator('[data-testid="category-Decorations"] .pending-expenses')).toContainText('$250.00');
    
    // Complete task and add actual expense
    await page.click('[data-testid="schedules-nav"]');
    await page.click('[data-testid="task-Purchase decorative items"] [data-testid="complete-with-expense"]');
    await page.fill('[data-testid="actual-amount"]', '275.00');
    await page.setInputFiles('[data-testid="receipt-upload"]', './test-fixtures/receipt.jpg');
    await page.click('[data-testid="submit-expense"]');
    
    // Verify expense is recorded in budget
    await page.click('[data-testid="budget-nav"]');
    await expect(page.locator('[data-testid="category-Decorations"] .spent')).toContainText('$275.00');
  });

  test('Accessibility in Helper Scheduling', async ({ page }) => {
    await page.goto('/wedding/helpers/schedule');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'skip-to-schedule');
    
    // Navigate through task cards
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('role', 'button');
    
    // Test ARIA labels and descriptions
    const taskCard = page.locator('[data-testid="task-card-1"]');
    await expect(taskCard).toHaveAttribute('aria-label');
    await expect(taskCard).toHaveAttribute('aria-describedby');
    
    // Test screen reader announcements for status changes
    await taskCard.focus();
    await page.keyboard.press('Enter'); // Open task details
    await page.keyboard.press('Tab'); // Navigate to status button
    await page.keyboard.press('Enter'); // Open status menu
    await page.keyboard.press('ArrowDown'); // Select completed
    await page.keyboard.press('Enter'); // Confirm
    
    // Verify announcement
    const announcement = page.locator('[aria-live="assertive"]');
    await expect(announcement).toContainText('Task status updated to completed');
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('[data-testid="schedule-overview"]')).toBeVisible();
    
    // Verify focus indicators are visible
    await taskCard.focus();
    const focusStyle = await taskCard.evaluate(el => getComputedStyle(el).outline);
    expect(focusStyle).not.toBe('none');
  });

  test('Performance with Large Schedule Data', async ({ page }) => {
    // Navigate to schedule with large dataset
    await page.goto('/wedding/helpers/schedule?test-data=large&tasks=100');
    
    // Measure load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
    
    // Test virtualized scrolling
    const tasksList = page.locator('[data-testid="tasks-list"]');
    await tasksList.scrollIntoView();
    
    // Should only render visible tasks
    const visibleTasks = page.locator('[data-testid*="task-card-"]');
    const taskCount = await visibleTasks.count();
    expect(taskCount).toBeLessThan(20); // Virtual scrolling should limit rendered items
    
    // Test search performance
    await page.fill('[data-testid="task-search"]', 'setup');
    await page.waitForTimeout(300); // Debounced search
    
    const searchResults = page.locator('[data-testid*="task-card-"]:visible');
    const resultsCount = await searchResults.count();
    expect(resultsCount).toBeGreaterThan(0);
    expect(resultsCount).toBeLessThan(50); // Filtered results
    
    // Measure search response time
    const searchStartTime = Date.now();
    await page.fill('[data-testid="task-search"]', 'decorations');
    await page.waitForSelector('[data-testid="search-results-updated"]');
    const searchTime = Date.now() - searchStartTime;
    
    expect(searchTime).toBeLessThan(500); // Search should be fast
  });
});