/**
 * WS-158 Task Categories System - E2E Tests
 * Team A - Round 3: Complete task categorization with drag-and-drop and visual timeline
 * 
 * Test Coverage:
 * - Task categorization interface
 * - Drag and drop functionality  
 * - Color-coded category system
 * - Visual timeline
 * - Category-based filtering and search
 * - Helper assignment integration
 * - Wedding type preferences
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test data
const TEST_WEDDING_ID = 'test-wedding-123';
const TEST_ORG_ID = 'test-org-456';

const SAMPLE_CATEGORIES = [
  {
    id: 'cat-planning',
    name: 'Wedding Planning',
    phase: 'planning',
    color_hex: '#9333EA',
    icon_name: 'clipboard-list'
  },
  {
    id: 'cat-ceremony',
    name: 'Ceremony Tasks',
    phase: 'ceremony', 
    color_hex: '#10B981',
    icon_name: 'heart'
  },
  {
    id: 'cat-reception',
    name: 'Reception Activities',
    phase: 'reception',
    color_hex: '#EF4444', 
    icon_name: 'star'
  }
];

const SAMPLE_TASKS = [
  {
    id: 'task-1',
    title: 'Finalize guest list',
    description: 'Confirm final headcount with venue',
    category_id: 'cat-planning',
    status: 'todo',
    priority: 'high',
    duration_minutes: 60
  },
  {
    id: 'task-2', 
    title: 'Setup ceremony arch',
    description: 'Install floral arch at ceremony location',
    category_id: 'cat-ceremony',
    status: 'in_progress',
    priority: 'medium',
    duration_minutes: 120
  },
  {
    id: 'task-3',
    title: 'Test sound system',
    description: 'Check microphones and speakers',
    category_id: null, // Uncategorized
    status: 'todo',
    priority: 'critical',
    duration_minutes: 30
  }
];

test.describe('WS-158 Task Categories System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await setupTestData();
    
    // Navigate to task categories page
    await page.goto('/tasks/categories');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="task-category-manager"]');
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  test.describe('Category Board Interface', () => {
    test('should display task categories with correct colors', async ({ page }) => {
      // Verify all categories are displayed
      for (const category of SAMPLE_CATEGORIES) {
        const categoryColumn = page.locator(`[data-testid="category-column-${category.id}"]`);
        
        await expect(categoryColumn).toBeVisible();
        await expect(categoryColumn.locator('.category-name')).toContainText(category.name);
        
        // Check color styling
        const colorElement = categoryColumn.locator('.category-color');
        await expect(colorElement).toHaveCSS('background-color', hexToRgb(category.color_hex));
      }
    });

    test('should show tasks in correct categories', async ({ page }) => {
      // Verify categorized tasks appear in correct columns
      const planningColumn = page.locator('[data-testid="category-column-cat-planning"]');
      await expect(planningColumn.locator('[data-testid="task-card-task-1"]')).toBeVisible();
      
      const ceremonyColumn = page.locator('[data-testid="category-column-cat-ceremony"]');
      await expect(ceremonyColumn.locator('[data-testid="task-card-task-2"]')).toBeVisible();
      
      // Verify uncategorized tasks appear in uncategorized column
      const uncategorizedColumn = page.locator('[data-testid="category-column-uncategorized"]');
      await expect(uncategorizedColumn.locator('[data-testid="task-card-task-3"]')).toBeVisible();
    });

    test('should display task count badges', async ({ page }) => {
      const planningColumn = page.locator('[data-testid="category-column-cat-planning"]');
      const taskCountBadge = planningColumn.locator('[data-testid="task-count-badge"]');
      
      await expect(taskCountBadge).toContainText('1');
    });

    test('should show phase icons and labels', async ({ page }) => {
      const planningColumn = page.locator('[data-testid="category-column-cat-planning"]');
      
      await expect(planningColumn.locator('.phase-icon')).toBeVisible();
      await expect(planningColumn.locator('.phase-label')).toContainText('Planning');
    });
  });

  test.describe('Drag and Drop Functionality', () => {
    test('should allow dragging task between categories', async ({ page }) => {
      // Get the uncategorized task
      const uncategorizedTask = page.locator('[data-testid="task-card-task-3"]');
      const planningColumn = page.locator('[data-testid="category-column-cat-planning"]');
      
      // Perform drag and drop
      await uncategorizedTask.dragTo(planningColumn);
      
      // Wait for API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks/') && response.status() === 200
      );
      
      // Verify task moved to planning column
      await expect(planningColumn.locator('[data-testid="task-card-task-3"]')).toBeVisible();
      
      // Verify task is no longer in uncategorized
      const uncategorizedColumn = page.locator('[data-testid="category-column-uncategorized"]');
      await expect(uncategorizedColumn.locator('[data-testid="task-card-task-3"]')).not.toBeVisible();
    });

    test('should update task color when moved to new category', async ({ page }) => {
      const task = page.locator('[data-testid="task-card-task-3"]');
      const ceremonyColumn = page.locator('[data-testid="category-column-cat-ceremony"]');
      
      // Drag task to ceremony category
      await task.dragTo(ceremonyColumn);
      await page.waitForResponse(response => response.url().includes('/api/tasks/'));
      
      // Check task now has ceremony category color
      const taskBorder = task.locator('.task-border');
      await expect(taskBorder).toHaveCSS('border-color', hexToRgb('#10B981'));
    });

    test('should show drag preview during drag operation', async ({ page }) => {
      const task = page.locator('[data-testid="task-card-task-1"]');
      
      // Start drag operation
      await task.hover();
      await page.mouse.down();
      
      // Verify drag preview appears
      await expect(task).toHaveClass(/dragging/);
      
      await page.mouse.up();
    });

    test('should show drop zones when dragging', async ({ page }) => {
      const task = page.locator('[data-testid="task-card-task-1"]');
      
      await task.hover();
      await page.mouse.down();
      
      // Move over different category
      const ceremonyColumn = page.locator('[data-testid="category-column-cat-ceremony"]');
      await ceremonyColumn.hover();
      
      // Verify drop zone highlighting
      await expect(ceremonyColumn).toHaveClass(/drop-zone-active/);
      
      await page.mouse.up();
    });

    test('should handle drag cancellation', async ({ page }) => {
      const task = page.locator('[data-testid="task-card-task-1"]');
      const originalParent = page.locator('[data-testid="category-column-cat-planning"]');
      
      // Start drag and cancel (drag back to original position)
      await task.dragTo(originalParent);
      
      // Verify task remains in original category
      await expect(originalParent.locator('[data-testid="task-card-task-1"]')).toBeVisible();
    });
  });

  test.describe('Visual Timeline', () => {
    test('should switch to timeline view', async ({ page }) => {
      const timelineButton = page.locator('[data-testid="timeline-view-button"]');
      await timelineButton.click();
      
      // Verify timeline container appears
      await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();
    });

    test('should display time grid with hour markers', async ({ page }) => {
      await page.locator('[data-testid="timeline-view-button"]').click();
      
      // Check time markers are present
      await expect(page.locator('[data-testid="time-marker-8-00"]')).toBeVisible();
      await expect(page.locator('[data-testid="time-marker-12-00"]')).toBeVisible();
      await expect(page.locator('[data-testid="time-marker-18-00"]')).toBeVisible();
    });

    test('should show tasks on timeline with correct positioning', async ({ page }) => {
      await page.locator('[data-testid="timeline-view-button"]').click();
      
      // Verify tasks appear on timeline
      const timelineTask = page.locator('[data-testid="timeline-task-task-1"]');
      await expect(timelineTask).toBeVisible();
      
      // Verify positioning based on timeline_position
      const leftPosition = await timelineTask.evaluate(el => el.style.left);
      expect(leftPosition).toBeTruthy();
    });

    test('should allow dragging tasks on timeline to change time', async ({ page }) => {
      await page.locator('[data-testid="timeline-view-button"]').click();
      
      const timelineTask = page.locator('[data-testid="timeline-task-task-1"]');
      const newPosition = page.locator('[data-testid="timeline-position-600"]'); // 10:00 AM
      
      // Drag task to new time position
      await timelineTask.dragTo(newPosition);
      
      // Wait for update
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks/') && response.status() === 200
      );
      
      // Verify task position updated
      const updatedPosition = await timelineTask.evaluate(el => el.style.left);
      expect(parseInt(updatedPosition)).toBeGreaterThan(0);
    });

    test('should show color coding based on selected mode', async ({ page }) => {
      await page.locator('[data-testid="timeline-view-button"]').click();
      
      // Test category color mode
      await page.selectOption('[data-testid="color-by-select"]', 'category');
      const taskElement = page.locator('[data-testid="timeline-task-task-1"]');
      await expect(taskElement).toHaveCSS('background-color', hexToRgb('#9333EA'));
      
      // Test priority color mode
      await page.selectOption('[data-testid="color-by-select"]', 'priority');
      await expect(taskElement).toHaveCSS('background-color', hexToRgb('#F59E0B')); // High priority
    });

    test('should display task details on selection', async ({ page }) => {
      await page.locator('[data-testid="timeline-view-button"]').click();
      
      // Click on timeline task
      await page.locator('[data-testid="timeline-task-task-1"]').click();
      
      // Verify details panel appears
      const detailsPanel = page.locator('[data-testid="task-details-panel"]');
      await expect(detailsPanel).toBeVisible();
      await expect(detailsPanel.locator('.task-title')).toContainText('Finalize guest list');
      await expect(detailsPanel.locator('.task-duration')).toContainText('60 min');
    });
  });

  test.describe('Filtering and Search', () => {
    test('should filter tasks by search term', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Search for specific task
      await searchInput.fill('guest list');
      
      // Verify only matching task is visible
      await expect(page.locator('[data-testid="task-card-task-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-card-task-2"]')).not.toBeVisible();
    });

    test('should filter by phase', async ({ page }) => {
      const phaseFilter = page.locator('[data-testid="phase-filter"]');
      
      // Select ceremony phase
      await phaseFilter.selectOption('ceremony');
      
      // Verify only ceremony tasks and categories are visible
      await expect(page.locator('[data-testid="category-column-cat-ceremony"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-column-cat-planning"]')).not.toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
      const statusFilter = page.locator('[data-testid="status-filter"]');
      
      // Select in_progress status
      await statusFilter.selectOption('in_progress');
      
      // Verify only in-progress tasks are visible
      await expect(page.locator('[data-testid="task-card-task-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-card-task-1"]')).not.toBeVisible();
    });

    test('should open advanced filters dialog', async ({ page }) => {
      const filtersButton = page.locator('[data-testid="filters-button"]');
      await filtersButton.click();
      
      // Verify advanced filters dialog opens
      const filtersDialog = page.locator('[data-testid="advanced-filters-dialog"]');
      await expect(filtersDialog).toBeVisible();
    });

    test('should apply multiple filters', async ({ page }) => {
      // Open advanced filters
      await page.locator('[data-testid="filters-button"]').click();
      
      // Select multiple categories
      await page.locator('[data-testid="filter-category-cat-planning"]').check();
      await page.locator('[data-testid="filter-priority-high"]').check();
      
      // Apply filters
      await page.locator('[data-testid="apply-filters-button"]').click();
      
      // Verify correct tasks are visible
      await expect(page.locator('[data-testid="task-card-task-1"]')).toBeVisible(); // Planning + High priority
      await expect(page.locator('[data-testid="task-card-task-2"]')).not.toBeVisible(); // Wrong category
    });

    test('should show active filter count', async ({ page }) => {
      await page.locator('[data-testid="search-input"]').fill('test');
      
      // Verify filter count badge appears
      const filterBadge = page.locator('[data-testid="active-filter-count"]');
      await expect(filterBadge).toContainText('1');
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters
      await page.locator('[data-testid="search-input"]').fill('test');
      await page.locator('[data-testid="phase-filter"]').selectOption('ceremony');
      
      // Clear all filters
      await page.locator('[data-testid="clear-filters-button"]').click();
      
      // Verify all tasks are visible again
      await expect(page.locator('[data-testid="task-card-task-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-card-task-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-card-task-3"]')).toBeVisible();
    });
  });

  test.describe('Helper Assignment Integration', () => {
    test('should show helper assignment interface', async ({ page }) => {
      await page.goto('/tasks/categories/helpers');
      
      // Verify helper assignment page loads
      await expect(page.locator('[data-testid="category-helper-assignment"]')).toBeVisible();
    });

    test('should display helper workload statistics', async ({ page }) => {
      await page.goto('/tasks/categories/helpers');
      
      // Verify stats cards are present
      await expect(page.locator('[data-testid="stat-total-helpers"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-assigned-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-unassigned-tasks"]')).toBeVisible();
    });

    test('should allow assigning helper to category', async ({ page }) => {
      await page.goto('/tasks/categories/helpers');
      
      // Click assign button for a category
      await page.locator('[data-testid="assign-helper-cat-planning"]').click();
      
      // Verify assignment dialog opens
      const assignDialog = page.locator('[data-testid="assign-helper-dialog"]');
      await expect(assignDialog).toBeVisible();
      
      // Select a helper
      await page.locator('[data-testid="helper-option-helper-1"]').click();
      
      // Assign
      await page.locator('[data-testid="assign-button"]').click();
      
      // Verify success message
      await expect(page.locator('.toast')).toContainText('Helper assigned successfully');
    });

    test('should show helper workload indicators', async ({ page }) => {
      await page.goto('/tasks/categories/helpers');
      
      // Verify workload status badges
      const helperCard = page.locator('[data-testid="helper-card-helper-1"]');
      await expect(helperCard.locator('[data-testid="workload-badge"]')).toBeVisible();
    });

    test('should support bulk helper assignment', async ({ page }) => {
      await page.goto('/tasks/categories/helpers');
      
      // Click bulk assign button
      await page.locator('[data-testid="bulk-assign-button"]').click();
      
      // Verify bulk assignment dialog
      const bulkDialog = page.locator('[data-testid="bulk-assign-dialog"]');
      await expect(bulkDialog).toBeVisible();
      
      // Select category and multiple helpers
      await page.selectOption('[data-testid="category-select"]', 'cat-ceremony');
      await page.locator('[data-testid="helper-checkbox-helper-1"]').check();
      await page.locator('[data-testid="helper-checkbox-helper-2"]').check();
      
      // Perform bulk assignment
      await page.locator('[data-testid="bulk-assign-confirm"]').click();
      
      // Verify success
      await expect(page.locator('.toast')).toContainText('2 helpers assigned');
    });
  });

  test.describe('Wedding Type Preferences', () => {
    test('should display wedding type preference tabs', async ({ page }) => {
      await page.goto('/tasks/categories/preferences');
      
      // Verify all wedding type tabs are present
      await expect(page.locator('[data-testid="wedding-type-traditional"]')).toBeVisible();
      await expect(page.locator('[data-testid="wedding-type-destination"]')).toBeVisible();
      await expect(page.locator('[data-testid="wedding-type-elopement"]')).toBeVisible();
    });

    test('should allow editing category preferences', async ({ page }) => {
      await page.goto('/tasks/categories/preferences');
      
      // Switch to edit mode
      await page.locator('[data-testid="edit-mode-button"]').click();
      
      // Modify a preference
      const requiredToggle = page.locator('[data-testid="required-toggle-cat-ceremony"]');
      await requiredToggle.click();
      
      // Save changes
      await page.locator('[data-testid="save-preferences-button"]').click();
      
      // Verify success message
      await expect(page.locator('.toast')).toContainText('preferences saved');
    });

    test('should show preference summary statistics', async ({ page }) => {
      await page.goto('/tasks/categories/preferences');
      
      // Verify summary stats are displayed
      await expect(page.locator('[data-testid="required-categories-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-tasks-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-time"]')).toBeVisible();
    });

    test('should support copying preferences between wedding types', async ({ page }) => {
      await page.goto('/tasks/categories/preferences');
      
      // Enable edit mode
      await page.locator('[data-testid="edit-mode-button"]').click();
      
      // Select destination wedding tab
      await page.locator('[data-testid="wedding-type-destination"]').click();
      
      // Copy from traditional
      await page.selectOption('[data-testid="copy-preferences-select"]', 'traditional');
      
      // Verify preferences were copied
      await expect(page.locator('.toast')).toContainText('Copied preferences');
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/tasks/categories');
      await page.waitForSelector('[data-testid="task-category-manager"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
    });

    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/tasks/categories');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus management
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/tasks/categories');
      
      // Check drag and drop ARIA labels
      const draggableTask = page.locator('[data-testid="task-card-task-1"]');
      await expect(draggableTask).toHaveAttribute('aria-label');
      await expect(draggableTask).toHaveAttribute('draggable', 'true');
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/tasks/categories');
      
      // Verify mobile-friendly layout
      await expect(page.locator('[data-testid="mobile-category-view"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/api/tasks/**', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.goto('/tasks/categories');
      
      // Verify error state is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load');
    });

    test('should handle drag and drop failures', async ({ page }) => {
      await page.goto('/tasks/categories');
      
      // Intercept update API and return error
      await page.route('**/api/tasks/*/category', route => {
        route.fulfill({ status: 400, body: 'Invalid category' });
      });
      
      // Attempt drag and drop
      const task = page.locator('[data-testid="task-card-task-1"]');
      const targetColumn = page.locator('[data-testid="category-column-cat-ceremony"]');
      
      await task.dragTo(targetColumn);
      
      // Verify error handling
      await expect(page.locator('.toast')).toContainText('Failed to move task');
    });

    test('should validate required fields in preferences', async ({ page }) => {
      await page.goto('/tasks/categories/preferences');
      await page.locator('[data-testid="edit-mode-button"]').click();
      
      // Try to save with invalid data
      await page.locator('[data-testid="task-count-input-cat-planning"]').fill('');
      await page.locator('[data-testid="save-preferences-button"]').click();
      
      // Verify validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });
  });
});

// Utility functions
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgb(${r}, ${g}, ${b})`;
}

async function setupTestData() {
  // Setup test categories, tasks, and wedding data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert test categories
  await supabase.from('task_categories').upsert(
    SAMPLE_CATEGORIES.map(cat => ({
      ...cat,
      organization_id: TEST_ORG_ID,
      is_default: true,
      is_active: true
    }))
  );

  // Insert test tasks
  await supabase.from('workflow_tasks').upsert(
    SAMPLE_TASKS.map(task => ({
      ...task,
      wedding_id: TEST_WEDDING_ID,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      created_by: 'test-user',
      assigned_by: 'test-user'
    }))
  );
}

async function cleanupTestData() {
  // Clean up test data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('workflow_tasks').delete().eq('wedding_id', TEST_WEDDING_ID);
  await supabase.from('task_categories').delete().eq('organization_id', TEST_ORG_ID);
}