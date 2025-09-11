/**
 * WS-156 Tasks Page Integration Tests - Revolutionary Playwright MCP
 * Testing the main task management page with accessibility-first approach
 * 
 * Page: /app/(dashboard)/tasks/page.tsx
 * Focus: Full page integration, navigation, and task management workflows
 */

import { test, expect } from '@playwright/test';

test.describe('WS-156 Tasks Page Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should render tasks dashboard with proper structure', async ({ page }) => {
    // ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
    const accessibilityStructure = await page.locator('main').innerText();
    
    // Verify main page structure
    expect(page.locator('h1')).toContainText('Task Management');
    expect(page.locator('[data-testid="tasks-dashboard"]')).toBeVisible();
    
    // Verify navigation elements
    expect(page.locator('[data-testid="create-task-button"]')).toBeVisible();
    expect(page.locator('[data-testid="task-filters"]')).toBeVisible();
    expect(page.locator('[data-testid="task-search"]')).toBeVisible();
    
    // Verify task views
    expect(page.locator('[data-testid="task-list-view"]')).toBeVisible();
    expect(page.locator('[data-testid="timeline-view-toggle"]')).toBeVisible();
  });

  test('should handle complete task creation workflow', async ({ page }) => {
    // COMPREHENSIVE TASK CREATION WORKFLOW
    await page.click('[data-testid="create-task-button"]');
    
    // Verify task creation modal opens
    await expect(page.locator('[data-testid="task-creator-modal"]')).toBeVisible();
    
    // Fill task creation form
    await page.fill('input[name="title"]', 'E2E Test Task Creation');
    await page.fill('textarea[name="description"]', 'End-to-end test for task creation workflow');
    await page.selectOption('select[name="category"]', 'logistics');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('input[name="estimated_duration"]', '2.5');
    await page.fill('input[name="buffer_time"]', '0.5');
    
    // Set future deadline
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    await page.fill('input[name="deadline"]', dateTimeString);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify task was created
    await expect(page.locator('[data-testid="task-created-success"]')).toBeVisible();
    await expect(page.locator('text=E2E Test Task Creation')).toBeVisible();
    
    // Verify task appears in list
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="task-item"]').first()).toContainText('E2E Test Task Creation');
  });

  test('should filter tasks by category and priority', async ({ page }) => {
    // Test category filtering
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="filter-photography"]');
    
    // Verify only photography tasks are shown
    await expect(page.locator('[data-testid="task-item"]')).toHaveCount(2); // Assuming 2 photography tasks
    await expect(page.locator('[data-testid="task-item"]').first()).toContainText('photography');
    
    // Test priority filtering
    await page.click('[data-testid="priority-filter"]');
    await page.click('[data-testid="filter-critical"]');
    
    // Should show intersection of photography + critical tasks
    await expect(page.locator('[data-testid="no-tasks-message"]')).toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="task-item"]')).toHaveCountGreaterThan(2);
  });

  test('should search tasks in real-time', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('[data-testid="task-search"] input');
    await searchInput.fill('ceremony');
    
    // Should filter tasks in real-time
    await page.waitForTimeout(500); // Debounce delay
    
    const visibleTasks = page.locator('[data-testid="task-item"]:visible');
    await expect(visibleTasks).toHaveCountGreaterThan(0);
    
    // Verify search results contain search term
    const firstTask = visibleTasks.first();
    await expect(firstTask).toContainText('ceremony');
    
    // Clear search
    await searchInput.clear();
    await expect(page.locator('[data-testid="task-item"]')).toHaveCountGreaterThan(3);
  });

  test('should switch between list and timeline views', async ({ page }) => {
    // Default should be list view
    await expect(page.locator('[data-testid="task-list-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-view"]')).not.toBeVisible();
    
    // Switch to timeline view
    await page.click('[data-testid="timeline-view-toggle"]');
    
    await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-list-view"]')).not.toBeVisible();
    
    // Verify timeline shows tasks
    await expect(page.locator('[data-testid="timeline-task"]')).toHaveCountGreaterThan(0);
    
    // Switch back to list view
    await page.click('[data-testid="list-view-toggle"]');
    await expect(page.locator('[data-testid="task-list-view"]')).toBeVisible();
  });

  test('should handle task template selection workflow', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Open template library
    await page.click('[data-testid="use-template-button"]');
    await expect(page.locator('[data-testid="template-library-modal"]')).toBeVisible();
    
    // Select a template
    await page.click('[data-testid="template-ceremony-setup"]');
    
    // Verify template data is populated
    await expect(page.locator('input[name="title"]')).toHaveValue('Ceremony Setup');
    await expect(page.locator('select[name="category"]')).toHaveValue('venue_management');
    
    // Customize template
    await page.fill('input[name="title"]', 'Customized Ceremony Setup');
    
    // Submit
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="task-created-success"]')).toBeVisible();
    await expect(page.locator('text=Customized Ceremony Setup')).toBeVisible();
  });

  test('should validate timing conflicts in real-time', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Fill basic task info
    await page.fill('input[name="title"]', 'Conflict Test Task');
    await page.selectOption('select[name="category"]', 'photography');
    
    // Set timing that conflicts with existing task
    await page.fill('input[name="start_time"]', '14:00');
    await page.fill('input[name="estimated_duration"]', '2');
    
    // Should detect conflict immediately
    await expect(page.locator('[data-testid="timing-conflict-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-details"]')).toContainText('Photography Session');
    
    // Should show suggestions
    await expect(page.locator('[data-testid="conflict-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-times"]')).toHaveCountGreaterThan(0);
    
    // Apply suggestion
    await page.click('[data-testid="suggestion-0"]');
    
    // Conflict warning should disappear
    await expect(page.locator('[data-testid="timing-conflict-warning"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="no-conflicts-indicator"]')).toBeVisible();
  });

  test('should handle task assignment and team member filtering', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Select photography category
    await page.selectOption('select[name="category"]', 'photography');
    
    // Should filter team members to photography specialists
    const assigneeOptions = page.locator('select[name="assigned_to"] option');
    await expect(assigneeOptions).toContainText('Sarah Photographer');
    
    // Assign task
    await page.selectOption('select[name="assigned_to"]', 'photographer-1');
    
    await page.fill('input[name="title"]', 'Assigned Photography Task');
    await page.fill('input[name="deadline"]', '2025-02-20T15:00');
    
    await page.click('button[type="submit"]');
    
    // Verify assignment in task list
    await expect(page.locator('[data-testid="task-assignee"]')).toContainText('Sarah Photographer');
  });

  test('should maintain performance with large task lists', async ({ page }) => {
    // Measure initial page load time
    const startTime = Date.now();
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Page should load in <3s
    
    // Test scrolling performance with many tasks
    const taskItems = page.locator('[data-testid="task-item"]');
    const taskCount = await taskItems.count();
    
    if (taskCount > 20) {
      // Test virtual scrolling performance
      const scrollStartTime = Date.now();
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(100);
      const scrollTime = Date.now() - scrollStartTime;
      
      expect(scrollTime).toBeLessThan(500); // Scrolling should be smooth
    }
    
    // Test search performance
    const searchStartTime = Date.now();
    await page.fill('[data-testid="task-search"] input', 'test');
    await page.waitForTimeout(300); // Debounce
    const searchTime = Date.now() - searchStartTime;
    
    expect(searchTime).toBeLessThan(1000); // Search should be <1s
  });

  test('should be fully accessible with keyboard navigation', async ({ page }) => {
    // Test tab order
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="task-search"] input')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="create-task-button"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="category-filter"]')).toBeFocused();
    
    // Test keyboard activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="category-dropdown"]')).toBeVisible();
    
    // Test escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="category-dropdown"]')).not.toBeVisible();
    
    // Navigate to first task
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="task-item"]').first()).toBeFocused();
    
    // Open task with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="task-details-modal"]')).toBeVisible();
  });

  test('should work responsively across all breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 375, height: 800, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 1024, name: 'desktop' },
      { width: 1920, height: 1080, name: 'large-desktop' }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      
      // Verify layout adapts
      await expect(page.locator('[data-testid="tasks-dashboard"]')).toBeVisible();
      
      // Test task creation at this size
      await page.click('[data-testid="create-task-button"]');
      await expect(page.locator('[data-testid="task-creator-modal"]')).toBeVisible();
      
      // Verify form is usable
      await expect(page.locator('input[name="title"]')).toBeVisible();
      
      if (breakpoint.width >= 768) {
        // Desktop/tablet should show side-by-side layout
        await expect(page.locator('[data-testid="form-grid"]')).toHaveClass(/md:grid-cols-2/);
      } else {
        // Mobile should stack vertically
        await expect(page.locator('[data-testid="form-grid"]')).toHaveClass(/grid-cols-1/);
      }
      
      await page.click('[data-testid="cancel-button"]');
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `tests/evidence/tasks-page-${breakpoint.width}px.png`,
        fullPage: true 
      });
    }
  });

  test('should maintain zero console errors during full workflow', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Perform complete task management workflow
    await page.click('[data-testid="create-task-button"]');
    await page.fill('input[name="title"]', 'Console Error Test Task');
    await page.selectOption('select[name="category"]', 'venue_management');
    await page.fill('input[name="deadline"]', '2025-03-01T16:00');
    await page.click('button[type="submit"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="task-created-success"]');
    
    // Test filtering
    await page.click('[data-testid="close-modal"]');
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="filter-venue_management"]');
    
    // Test search
    await page.fill('[data-testid="task-search"] input', 'console');
    await page.waitForTimeout(500);
    
    // Test timeline view
    await page.click('[data-testid="timeline-view-toggle"]');
    await page.waitForTimeout(1000);
    
    // Verify zero console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network error for task creation
    await page.route('**/api/tasks', route => {
      route.abort('failed');
    });
    
    await page.click('[data-testid="create-task-button"]');
    await page.fill('input[name="title"]', 'Error Test Task');
    await page.selectOption('select[name="category"]', 'logistics');
    await page.fill('input[name="deadline"]', '2025-02-28T14:00');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to create task');
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Form should remain open and editable
    await expect(page.locator('[data-testid="task-creator-modal"]')).toBeVisible();
    await expect(page.locator('input[name="title"]')).toHaveValue('Error Test Task');
  });

  test('should persist user preferences and state', async ({ page }) => {
    // Set filters and view preferences
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="filter-photography"]');
    await page.click('[data-testid="timeline-view-toggle"]');
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Preferences should be restored
    await expect(page.locator('[data-testid="filter-photography"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible();
    
    // Only photography tasks should be visible
    const visibleTasks = page.locator('[data-testid="timeline-task"]:visible');
    await expect(visibleTasks.first()).toHaveAttribute('data-category', 'photography');
  });
});