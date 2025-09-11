import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const WEDDING_PHASES = ['setup', 'ceremony', 'reception', 'breakdown'] as const;
const PHASE_COLORS = {
  setup: '#10B981',     // green-500
  ceremony: '#3B82F6',  // blue-500
  reception: '#8B5CF6', // purple-500
  breakdown: '#F59E0B'  // amber-500
} as const;

test.describe('Task Categorization - Complete E2E Workflow', () => {
  let page: Page;
  let supabase: any;
  
  test.beforeAll(async () => {
    // Initialize Supabase client for test data setup
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@wedding.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Task Creation with Categories', () => {
    test('should create task with wedding phase category', async () => {
      // Navigate to task creation
      await page.goto('/tasks/create');
      
      // Fill in task details
      await page.fill('[data-testid="task-title"]', 'Set up ceremony chairs');
      await page.fill('[data-testid="task-description"]', 'Arrange 100 chairs in rows for ceremony');
      
      // Select wedding phase category
      await page.click('[data-testid="category-select"]');
      await page.click('[data-testid="category-setup"]');
      
      // Verify color coding preview
      const categoryBadge = await page.locator('[data-testid="category-badge"]');
      await expect(categoryBadge).toHaveCSS('background-color', 'rgb(16, 185, 129)'); // green-500
      
      // Set priority within phase
      await page.click('[data-testid="priority-select"]');
      await page.click('[data-testid="priority-high"]');
      
      // Save task
      await page.click('[data-testid="save-task"]');
      
      // Verify task was created with category
      await expect(page.locator('[data-testid="task-created-toast"]')).toBeVisible();
      await page.waitForURL('/tasks');
      
      // Verify task appears in correct category filter
      await page.click('[data-testid="filter-setup"]');
      await expect(page.locator('text=Set up ceremony chairs')).toBeVisible();
    });

    test('should create tasks for all wedding phases', async () => {
      const testTasks = [
        { title: 'Decorate venue entrance', phase: 'setup', priority: 'high' },
        { title: 'Coordinate processional', phase: 'ceremony', priority: 'critical' },
        { title: 'Manage dinner service', phase: 'reception', priority: 'high' },
        { title: 'Pack decorations', phase: 'breakdown', priority: 'medium' }
      ];

      for (const task of testTasks) {
        await page.goto('/tasks/create');
        await page.fill('[data-testid="task-title"]', task.title);
        await page.click('[data-testid="category-select"]');
        await page.click(`[data-testid="category-${task.phase}"]`);
        await page.click('[data-testid="priority-select"]');
        await page.click(`[data-testid="priority-${task.priority}"]`);
        await page.click('[data-testid="save-task"]');
        await page.waitForSelector('[data-testid="task-created-toast"]');
      }

      // Verify all tasks are categorized correctly
      await page.goto('/tasks');
      
      for (const phase of WEDDING_PHASES) {
        await page.click(`[data-testid="filter-${phase}"]`);
        const tasks = await page.locator(`[data-category="${phase}"]`).count();
        expect(tasks).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Helper Assignment with Category Focus', () => {
    test('should assign helpers to specific wedding phases', async () => {
      // Navigate to helper management
      await page.goto('/helpers');
      
      // Add new helper
      await page.click('[data-testid="add-helper"]');
      await page.fill('[data-testid="helper-name"]', 'John Setup Specialist');
      await page.fill('[data-testid="helper-email"]', 'john@helpers.com');
      
      // Assign to setup phase
      await page.click('[data-testid="phase-assignment"]');
      await page.check('[data-testid="phase-setup"]');
      await page.click('[data-testid="save-helper"]');
      
      // Verify helper appears in setup team
      await page.goto('/tasks/teams');
      await page.click('[data-testid="setup-team"]');
      await expect(page.locator('text=John Setup Specialist')).toBeVisible();
    });

    test('should show phase-filtered tasks for helpers', async () => {
      // Create helper with ceremony phase assignment
      await page.goto('/helpers');
      await page.click('[data-testid="add-helper"]');
      await page.fill('[data-testid="helper-name"]', 'Sarah Ceremony Lead');
      await page.fill('[data-testid="helper-email"]', 'sarah@helpers.com');
      await page.click('[data-testid="phase-assignment"]');
      await page.check('[data-testid="phase-ceremony"]');
      await page.click('[data-testid="save-helper"]');
      
      // Switch to helper view
      await page.goto('/helpers/sarah-ceremony-lead/tasks');
      
      // Verify only ceremony tasks are visible
      const visibleTasks = await page.locator('[data-testid="task-item"]').all();
      for (const task of visibleTasks) {
        const category = await task.getAttribute('data-category');
        expect(category).toBe('ceremony');
      }
    });
  });

  test.describe('Real-time Category Updates', () => {
    test('should update task categories in real-time', async () => {
      // Create a task
      await page.goto('/tasks/create');
      await page.fill('[data-testid="task-title"]', 'Mobile category test');
      await page.click('[data-testid="category-select"]');
      await page.click('[data-testid="category-setup"]');
      await page.click('[data-testid="save-task"]');
      
      // Open task in another tab
      const page2 = await page.context().newPage();
      await page2.goto('/tasks');
      
      // Change category in first tab
      await page.goto('/tasks');
      await page.click('[data-testid="task-Mobile category test"]');
      await page.click('[data-testid="edit-category"]');
      await page.click('[data-testid="category-ceremony"]');
      await page.click('[data-testid="save-changes"]');
      
      // Verify real-time update in second tab
      await page2.reload();
      const taskCategory = await page2.locator('[data-testid="task-Mobile category test"]')
        .getAttribute('data-category');
      expect(taskCategory).toBe('ceremony');
    });
  });

  test.describe('Category Analytics Dashboard', () => {
    test('should display task distribution by category', async () => {
      await page.goto('/dashboard/analytics');
      
      // Verify category distribution chart
      await expect(page.locator('[data-testid="category-distribution-chart"]')).toBeVisible();
      
      // Check phase progress indicators
      for (const phase of WEDDING_PHASES) {
        const progressBar = page.locator(`[data-testid="progress-${phase}"]`);
        await expect(progressBar).toBeVisible();
        
        // Verify color coding
        const expectedColor = PHASE_COLORS[phase];
        const rgbColor = hexToRgb(expectedColor);
        await expect(progressBar).toHaveCSS('background-color', rgbColor);
      }
    });

    test('should show completion rates by category', async () => {
      await page.goto('/dashboard/analytics');
      
      // Check completion metrics
      for (const phase of WEDDING_PHASES) {
        const metric = page.locator(`[data-testid="completion-${phase}"]`);
        await expect(metric).toBeVisible();
        
        // Verify percentage is displayed
        const text = await metric.textContent();
        expect(text).toMatch(/\d+%/);
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should handle category selection on mobile', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const mobilePage = await mobileContext.newPage();
      
      // Login
      await mobilePage.goto('/login');
      await mobilePage.fill('[data-testid="email-input"]', 'test@wedding.com');
      await mobilePage.fill('[data-testid="password-input"]', 'testpassword123');
      await mobilePage.click('[data-testid="login-button"]');
      await mobilePage.waitForURL('/dashboard');
      
      // Navigate to tasks
      await mobilePage.goto('/tasks');
      
      // Open mobile filter menu
      await mobilePage.click('[data-testid="mobile-filter-menu"]');
      
      // Select category filter
      await mobilePage.click('[data-testid="mobile-category-filter"]');
      await mobilePage.click('[data-testid="mobile-filter-ceremony"]');
      
      // Verify filter applied
      await expect(mobilePage.locator('[data-testid="active-filter-ceremony"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should have proper ARIA labels for categories', async () => {
      await page.goto('/tasks');
      
      // Check ARIA labels on category filters
      for (const phase of WEDDING_PHASES) {
        const filter = page.locator(`[data-testid="filter-${phase}"]`);
        const ariaLabel = await filter.getAttribute('aria-label');
        expect(ariaLabel).toContain(phase);
      }
      
      // Check keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on first category filter
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toContain('filter-');
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      const newFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(newFocus).not.toBe(focusedElement);
    });

    test('should support screen reader announcements', async () => {
      await page.goto('/tasks');
      
      // Check for live regions
      const liveRegion = page.locator('[role="status"][aria-live="polite"]');
      await expect(liveRegion).toBeAttached();
      
      // Change category filter
      await page.click('[data-testid="filter-ceremony"]');
      
      // Check announcement
      const announcement = await liveRegion.textContent();
      expect(announcement).toContain('ceremony');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle category update failures gracefully', async () => {
      // Create task
      await page.goto('/tasks/create');
      await page.fill('[data-testid="task-title"]', 'Error test task');
      await page.click('[data-testid="save-task"]');
      
      // Simulate network failure
      await page.route('**/api/tasks/*/category', route => {
        route.abort('failed');
      });
      
      // Try to update category
      await page.goto('/tasks');
      await page.click('[data-testid="task-Error test task"]');
      await page.click('[data-testid="edit-category"]');
      await page.click('[data-testid="category-reception"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('Failed to update category');
      
      // Original category should remain
      const taskCategory = await page.locator('[data-testid="task-Error test task"]')
        .getAttribute('data-category');
      expect(taskCategory).not.toBe('reception');
    });
  });

  test.afterEach(async () => {
    await page.close();
  });
});

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}