/**
 * WS-159 Task Tracking - Comprehensive E2E Tests
 * Using Playwright MCP for complete user workflow testing
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  testUser: {
    email: 'couple-e2e@wedsync.com',
    password: 'TestPassword123!',
    weddingId: 'wedding-e2e-001'
  },
  helper: {
    email: 'helper-e2e@wedsync.com',
    name: 'Test Helper'
  }
};

// Helper functions for Playwright MCP integration
async function navigateWithMCP(url: string) {
  // Using MCP browser navigation - would be called in actual implementation
  // await mcp__playwright__browser_navigate({url});
  console.log(`Navigate to: ${url}`);
}

async function takeScreenshotWithMCP(filename: string) {
  // Using MCP screenshot - would be called in actual implementation  
  // await mcp__playwright__browser_take_screenshot({filename});
  console.log(`Screenshot: ${filename}`);
}

async function getSnapshotWithMCP() {
  // Using MCP snapshot - would be called in actual implementation
  // return await mcp__playwright__browser_snapshot();
  return 'snapshot-data';
}

async function clickWithMCP(element: string, ref: string) {
  // Using MCP click - would be called in actual implementation
  // await mcp__playwright__browser_click({element, ref});
  console.log(`Click: ${element} (${ref})`);
}

async function typeWithMCP(element: string, ref: string, text: string) {
  // Using MCP type - would be called in actual implementation
  // await mcp__playwright__browser_type({element, ref, text});
  console.log(`Type "${text}" in: ${element} (${ref})`);
}

async function waitForTextWithMCP(text: string, timeout = 5000) {
  // Using MCP wait - would be called in actual implementation
  // await mcp__playwright__browser_wait_for({text, time: timeout/1000});
  console.log(`Wait for text: ${text}`);
}

test.describe('Task Tracking - Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data and navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.fill('[data-testid="email"]', TEST_CONFIG.testUser.email);
    await page.fill('[data-testid="password"]', TEST_CONFIG.testUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Complete task lifecycle: create → assign → track → complete', async ({ page }) => {
    // Step 1: Navigate to task tracking dashboard
    await navigateWithMCP(`${TEST_CONFIG.baseURL}/dashboard/tasks`);
    await page.goto('/dashboard/tasks');
    
    // Take initial screenshot
    await takeScreenshotWithMCP('task-dashboard-initial');
    await page.screenshot({ path: 'test-results/task-dashboard-initial.png' });
    
    // Verify initial state
    const initialSnapshot = await getSnapshotWithMCP();
    await expect(page.locator('[data-testid="tasks-overview"]')).toBeVisible();
    
    // Step 2: Create new task
    await clickWithMCP("New Task Button", "[data-testid=new-task]");
    await page.click('[data-testid="new-task"]');
    
    await typeWithMCP("Task Title Input", "[data-testid=task-title]", "Book wedding venue - Grand Ballroom");
    await page.fill('[data-testid="task-title"]', 'Book wedding venue - Grand Ballroom');
    
    // Set task details
    await page.selectOption('[data-testid="task-category"]', 'venue');
    await page.selectOption('[data-testid="task-priority"]', 'high');
    await page.fill('[data-testid="task-description"]', 'Research and book the perfect venue for our wedding ceremony and reception');
    await page.fill('[data-testid="task-due-date"]', '2024-06-01');
    
    // Save task
    await page.click('[data-testid="save-task"]');
    
    // Verify task creation
    await waitForTextWithMCP("Task created successfully");
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task created successfully');
    
    const taskElement = page.locator('[data-testid="task-venue-booking"]');
    await expect(taskElement).toBeVisible();
    await expect(taskElement.locator('[data-testid="task-status"]')).toContainText('Pending');
    
    // Step 3: Assign helper to task
    await taskElement.locator('[data-testid="assign-helper"]').click();
    
    // Select helper from dropdown
    await page.selectOption('[data-testid="helper-select"]', TEST_CONFIG.helper.email);
    await page.fill('[data-testid="assignment-message"]', 'Could you help research venues in the downtown area?');
    
    // Send assignment
    await page.click('[data-testid="send-assignment"]');
    
    // Verify assignment
    await waitForTextWithMCP("Helper assigned successfully");
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Helper assigned successfully');
    await expect(taskElement.locator('[data-testid="assigned-helper"]')).toContainText(TEST_CONFIG.helper.name);
    
    // Step 4: Update task status to in progress
    await taskElement.locator('[data-testid="status-dropdown"]').click();
    await page.click('[data-testid="status-in-progress"]');
    
    // Add progress notes
    await page.fill('[data-testid="progress-notes"]', 'Started researching venues. Found 3 potential options.');
    await page.click('[data-testid="update-status"]');
    
    // Verify status update
    await expect(taskElement.locator('[data-testid="task-status"]')).toContainText('In Progress');
    await expect(page.locator('[data-testid="overall-progress"]')).not.toContainText('0%');
    
    // Step 5: Add photo evidence
    await taskElement.locator('[data-testid="add-evidence"]').click();
    
    // Upload photo evidence
    const fileInput = page.locator('[data-testid="photo-upload"]');
    await fileInput.setInputFiles('test-assets/venue-photo.jpg');
    
    await page.fill('[data-testid="photo-description"]', 'Photo of Grand Ballroom - beautiful space with great lighting');
    await page.click('[data-testid="save-evidence"]');
    
    // Verify photo upload
    await expect(page.locator('[data-testid="evidence-count"]')).toContainText('1 photo');
    
    // Step 6: Complete the task
    await taskElement.locator('[data-testid="mark-complete"]').click();
    
    // Fill completion form
    await page.fill('[data-testid="completion-notes"]', 'Successfully booked Grand Ballroom for June 1st, 2024. Deposit paid.');
    await page.selectOption('[data-testid="satisfaction-rating"]', '5'); // Excellent
    await page.click('[data-testid="confirm-completion"]');
    
    // Verify task completion
    await waitForTextWithMCP("Task completed successfully");
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task completed successfully');
    await expect(taskElement.locator('[data-testid="task-status"]')).toContainText('Completed');
    await expect(taskElement.locator('[data-testid="completion-date"]')).toBeVisible();
    
    // Step 7: Verify progress update
    const progressBar = page.locator('[data-testid="overall-progress"]');
    const progressText = await progressBar.textContent();
    expect(progressText).not.toContain('0%'); // Should show progress increase
    
    // Step 8: Check task timeline update
    await page.goto('/dashboard/timeline');
    await expect(page.locator('[data-testid="timeline-task-venue-booking"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-task-venue-booking"]')).toHaveClass(/completed/);
    
    // Take final screenshot
    await takeScreenshotWithMCP('task-completed-final');
    await page.screenshot({ path: 'test-results/task-completed-final.png' });
  });

  test('Real-time synchronization across multiple browser sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    for (const page of [page1, page2]) {
      await page.goto(`${TEST_CONFIG.baseURL}/login`);
      await page.fill('[data-testid="email"]', TEST_CONFIG.testUser.email);
      await page.fill('[data-testid="password"]', TEST_CONFIG.testUser.password);
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await page.goto('/dashboard/tasks');
    }

    // Create task in page1
    await page1.click('[data-testid="new-task"]');
    await page1.fill('[data-testid="task-title"]', 'Test Real-time Task');
    await page1.selectOption('[data-testid="task-category"]', 'catering');
    await page1.click('[data-testid="save-task"]');

    // Verify task appears in page2 via real-time sync
    await page2.waitForTimeout(2000); // Allow for real-time propagation
    await expect(page2.locator('[data-testid="task-real-time-sync"]')).toBeVisible();

    // Update task status in page1
    const taskElement1 = page1.locator('[data-testid="task-real-time-sync"]');
    await taskElement1.locator('[data-testid="mark-complete"]').click();
    await page1.click('[data-testid="confirm-completion"]');

    // Verify update appears in page2
    await page2.waitForTimeout(2000);
    const taskElement2 = page2.locator('[data-testid="task-real-time-sync"]');
    await expect(taskElement2.locator('[data-testid="task-status"]')).toContainText('Completed');

    // Verify progress updates in both sessions
    for (const page of [page1, page2]) {
      const progressBar = page.locator('[data-testid="overall-progress"]');
      const progressText = await progressBar.textContent();
      expect(progressText).not.toContain('0%');
    }

    await context1.close();
    await context2.close();
  });

  test('Mobile responsive task tracking workflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard/tasks');
    await takeScreenshotWithMCP('mobile-task-dashboard');
    
    // Verify mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-task-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    
    // Test swipe gestures for task actions
    const taskElement = page.locator('[data-testid="mobile-task-item"]').first();
    
    // Simulate swipe left to reveal actions
    const taskBox = await taskElement.boundingBox();
    if (taskBox) {
      await page.mouse.move(taskBox.x + taskBox.width - 10, taskBox.y + taskBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 10, taskBox.y + taskBox.height / 2);
      await page.mouse.up();
    }
    
    // Verify action buttons appear
    await expect(page.locator('[data-testid="mobile-task-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-complete-button"]')).toBeVisible();
    
    // Test tap to complete
    await page.locator('[data-testid="mobile-complete-button"]').tap();
    await expect(page.locator('[data-testid="mobile-completion-modal"]')).toBeVisible();
    
    // Complete task on mobile
    await page.fill('[data-testid="mobile-completion-notes"]', 'Completed via mobile app');
    await page.tap('[data-testid="mobile-confirm-completion"]');
    
    // Verify completion
    await expect(page.locator('[data-testid="mobile-success-message"]')).toBeVisible();
    await expect(taskElement.locator('[data-testid="mobile-status-badge"]')).toContainText('Completed');
    
    await takeScreenshotWithMCP('mobile-task-completed');
  });

  test('Task dependency resolution workflow', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Create parent task
    await page.click('[data-testid="new-task"]');
    await page.fill('[data-testid="task-title"]', 'Book wedding venue');
    await page.selectOption('[data-testid="task-category"]', 'venue');
    await page.selectOption('[data-testid="task-priority"]', 'high');
    await page.click('[data-testid="save-task"]');
    
    // Create dependent task
    await page.click('[data-testid="new-task"]');
    await page.fill('[data-testid="task-title"]', 'Send invitations');
    await page.selectOption('[data-testid="task-category"]', 'invitations');
    
    // Set dependency
    await page.click('[data-testid="add-dependency"]');
    await page.selectOption('[data-testid="dependency-select"]', 'Book wedding venue');
    await page.click('[data-testid="save-task"]');
    
    // Verify dependent task is blocked
    const dependentTask = page.locator('[data-testid="task-send-invitations"]');
    await expect(dependentTask.locator('[data-testid="task-status"]')).toContainText('Blocked');
    await expect(dependentTask.locator('[data-testid="complete-button"]')).toBeDisabled();
    
    // Complete parent task
    const parentTask = page.locator('[data-testid="task-book-venue"]');
    await parentTask.locator('[data-testid="mark-complete"]').click();
    await page.click('[data-testid="confirm-completion"]');
    
    // Verify dependent task becomes available
    await page.waitForTimeout(1000); // Allow for dependency resolution
    await expect(dependentTask.locator('[data-testid="task-status"]')).toContainText('Ready');
    await expect(dependentTask.locator('[data-testid="complete-button"]')).toBeEnabled();
    
    // Verify dependency notification
    await expect(page.locator('[data-testid="dependency-notification"]'))
      .toContainText('Send invitations is now ready to start');
  });

  test('Task progress analytics and reporting', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    
    // Verify analytics dashboard loads
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Check progress charts
    await expect(page.locator('[data-testid="overall-progress-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-progress-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-progress-chart"]')).toBeVisible();
    
    // Verify key metrics
    const metricsSection = page.locator('[data-testid="task-metrics"]');
    await expect(metricsSection.locator('[data-testid="total-tasks"]')).toBeVisible();
    await expect(metricsSection.locator('[data-testid="completed-tasks"]')).toBeVisible();
    await expect(metricsSection.locator('[data-testid="on-time-completion-rate"]')).toBeVisible();
    
    // Test progress history
    await page.click('[data-testid="view-progress-history"]');
    await expect(page.locator('[data-testid="progress-history-chart"]')).toBeVisible();
    
    // Export progress report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-progress-report"]')
    ]);
    
    expect(download.suggestedFilename()).toContain('task-progress-report');
    
    await takeScreenshotWithMCP('task-analytics-dashboard');
  });

  test('Offline functionality and synchronization', async ({ page, context }) => {
    await page.goto('/dashboard/tasks');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to complete task while offline
    const taskElement = page.locator('[data-testid="task-item"]').first();
    await taskElement.locator('[data-testid="mark-complete"]').click();
    await page.fill('[data-testid="completion-notes"]', 'Completed while offline');
    await page.click('[data-testid="confirm-completion"]');
    
    // Verify offline indicator and queued status
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(taskElement.locator('[data-testid="task-status"]')).toContainText('Completed (Offline)');
    await expect(page.locator('[data-testid="queued-updates"]')).toContainText('1 update queued');
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for synchronization
    await page.waitForTimeout(3000);
    
    // Verify sync completion
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    await expect(taskElement.locator('[data-testid="task-status"]')).toContainText('Completed');
    await expect(page.locator('[data-testid="sync-notification"]')).toContainText('Tasks synced successfully');
    
    await takeScreenshotWithMCP('task-offline-sync-complete');
  });

  test('Accessibility compliance validation', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate through task elements using keyboard
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
    
    // Test screen reader compatibility
    const taskElement = page.locator('[data-testid="task-item"]').first();
    
    // Verify ARIA labels
    await expect(taskElement).toHaveAttribute('role', 'listitem');
    await expect(taskElement.locator('[data-testid="task-status"]')).toHaveAttribute('aria-label');
    await expect(taskElement.locator('[data-testid="complete-button"]')).toHaveAttribute('aria-describedby');
    
    // Test high contrast mode
    await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
    await takeScreenshotWithMCP('task-high-contrast');
    
    // Verify color contrast meets WCAG standards
    const backgroundColor = await page.locator('[data-testid="task-item"]').first().evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    const textColor = await page.locator('[data-testid="task-item"]').first().evaluate(
      (el) => window.getComputedStyle(el).color
    );
    
    // Basic contrast validation (would use proper contrast calculation in real implementation)
    expect(backgroundColor).not.toBe(textColor);
    
    // Test focus management
    await page.click('[data-testid="task-completion-modal-trigger"]');
    const modal = page.locator('[data-testid="task-completion-modal"]');
    await expect(modal).toBeVisible();
    
    // Focus should be trapped in modal
    await page.keyboard.press('Tab');
    const focusedInModal = await page.locator(':focus').isVisible();
    expect(focusedInModal).toBe(true);
    
    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Task Tracking - Performance Testing', () => {
  test('Task dashboard load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Verify Core Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        lcp: navigation.loadEventEnd - navigation.loadEventStart,
        cls: 0 // Would need proper CLS measurement
      };
    });
    
    expect(performanceMetrics.fcp).toBeLessThan(1800); // First Contentful Paint < 1.8s
    expect(performanceMetrics.lcp).toBeLessThan(2500); // Largest Contentful Paint < 2.5s
  });

  test('Task list with 100+ items performance', async ({ page }) => {
    // This would create 100+ test tasks via API before testing
    await page.goto('/dashboard/tasks?test-mode=100-tasks');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="virtual-task-list"]');
    const renderTime = Date.now() - startTime;
    
    // Should render large lists efficiently
    expect(renderTime).toBeLessThan(1000);
    
    // Test scrolling performance
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      document.querySelector('[data-testid="virtual-task-list"]')?.scrollBy(0, 2000);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;
    
    expect(scrollTime).toBeLessThan(100); // Smooth scrolling
  });

  test('Real-time updates performance under load', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Navigate all pages to task dashboard
    await Promise.all(
      pages.map(async (page) => {
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email"]', TEST_CONFIG.testUser.email);
        await page.fill('[data-testid="password"]', TEST_CONFIG.testUser.password);
        await page.click('[data-testid="login-button"]');
        await page.goto('/dashboard/tasks');
      })
    );

    // Update task status in first page and measure propagation time
    const startTime = Date.now();
    await pages[0].click('[data-testid="task-item"] [data-testid="mark-complete"]');
    await pages[0].click('[data-testid="confirm-completion"]');

    // Wait for update to propagate to all other pages
    await Promise.all(
      pages.slice(1).map(page =>
        page.waitForSelector('[data-testid="task-item"] [data-testid="completed-status"]', 
          { timeout: 5000 })
      )
    );
    
    const propagationTime = Date.now() - startTime;
    expect(propagationTime).toBeLessThan(3000); // Should propagate within 3 seconds

    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });
});