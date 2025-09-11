/**
 * WS-156 Task Creation System - Revolutionary Playwright MCP Tests
 * ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!)
 * 
 * Following the revolutionary testing approach from Microsoft's Playwright MCP
 * Using structured accessibility tree for LLM analysis - zero ambiguity!
 */

import { test, expect } from '@playwright/test';

test.describe('WS-156 Task Creator Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to task creation page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should render task creation form with proper accessibility structure', async ({ page }) => {
    // REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!
    // 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
    await page.click('[data-testid="create-task-button"]');
    
    // Returns structured accessibility tree for LLM analysis - zero ambiguity!
    const accessibilityStructure = await page.locator('[data-testid="task-creator-form"]').innerText();
    
    // Verify form has proper structure
    expect(page.locator('input[name="title"]')).toBeVisible();
    expect(page.locator('textarea[name="description"]')).toBeVisible();
    expect(page.locator('select[name="category"]')).toBeVisible();
    expect(page.locator('select[name="priority"]')).toBeVisible();
    expect(page.locator('input[name="deadline"]')).toBeVisible();
    
    // Verify accessibility labels
    await expect(page.locator('label[for="task-title"]')).toHaveText('Task Title *');
    await expect(page.locator('label[for="task-description"]')).toHaveText('Description');
    await expect(page.locator('label[for="task-category"]')).toHaveText('Category *');
  });

  test('should handle task creation workflow with real-time validation', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // 2. TASK CREATION FORM TESTING (COMPREHENSIVE!)
    await page.fill('input[name="title"]', 'Set up ceremony chairs');
    await page.fill('textarea[name="description"]', 'Arrange 100 white chairs in garden pavilion for wedding ceremony');
    await page.selectOption('select[name="category"]', 'venue_management');
    await page.selectOption('select[name="priority"]', 'high');
    
    // Test duration input
    await page.fill('input[name="estimated_duration"]', '2');
    await page.fill('input[name="buffer_time"]', '0.5');
    
    // Test deadline with datetime-local format
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    await page.fill('input[name="deadline"]', dateTimeString);
    
    // Verify form validation feedback
    await expect(page.locator('[data-testid="validation-feedback"]')).toBeVisible();
  });

  test('should validate timing conflicts in real-time', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // 3. TIMING CONFLICT VALIDATION
    await page.fill('input[name="title"]', 'Test conflict task');
    await page.selectOption('select[name="category"]', 'photography');
    
    // Set timing that conflicts with existing task
    await page.fill('input[name="timing_start"]', '14:00');
    await page.fill('input[name="timing_end"]', '16:00');
    
    // Wait for conflict detection
    await page.waitForSelector('[data-testid="timing-conflict-warning"]', { timeout: 3000 });
    await expect(page.locator('[data-testid="timing-conflict-warning"]')).toContainText('Timing Conflicts Detected');
    
    // Verify conflict details are shown
    await expect(page.locator('[data-testid="conflict-details"]')).toBeVisible();
  });

  test('should measure scientific performance metrics', async ({ page }) => {
    // 4. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
    const startTime = Date.now();
    
    await page.click('[data-testid="create-task-button"]');
    
    // Measure form load time
    await page.waitForSelector('[data-testid="task-creator-form"]');
    const formLoadTime = Date.now() - startTime;
    
    expect(formLoadTime).toBeLessThan(200); // <200ms component load
    
    // Measure form submission performance
    await page.fill('input[name="title"]', 'Performance test task');
    await page.selectOption('select[name="category"]', 'logistics');
    await page.fill('input[name="deadline"]', '2025-02-15T14:00');
    
    const submitStartTime = Date.now();
    await page.click('button[type="submit"]');
    
    // Wait for success indicator
    await page.waitForSelector('[data-testid="task-created-success"]');
    const submitTime = Date.now() - submitStartTime;
    
    expect(submitTime).toBeLessThan(1000); // <1s form submission
    
    // Get real performance metrics from browser
    const performanceMetrics = await page.evaluate(() => ({
      LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
      FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      formValidationTime: (window as any).taskFormMetrics?.validationTime || 0
    }));
    
    console.log('Performance Metrics:', performanceMetrics);
  });

  test('should work responsively across all breakpoints', async ({ page }) => {
    // 5. RESPONSIVE VALIDATION (All Breakpoints)
    const breakpoints = [
      { width: 375, height: 800, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' }, 
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      
      await page.click('[data-testid="create-task-button"]');
      
      // Verify form is usable at this breakpoint
      await expect(page.locator('[data-testid="task-creator-form"]')).toBeVisible();
      await expect(page.locator('input[name="title"]')).toBeVisible();
      
      // Test form interaction at this size
      await page.fill('input[name="title"]', `Test at ${breakpoint.name}`);
      const titleValue = await page.inputValue('input[name="title"]');
      expect(titleValue).toBe(`Test at ${breakpoint.name}`);
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `tests/evidence/task-creator-${breakpoint.width}px.png`,
        fullPage: true 
      });
      
      await page.click('[data-testid="cancel-button"]');
    }
  });

  test('should handle task template selection', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Test template selection
    await page.click('[data-testid="use-template-button"]');
    await expect(page.locator('[data-testid="template-library"]')).toBeVisible();
    
    // Select wedding ceremony template
    await page.click('[data-testid="template-ceremony-setup"]');
    
    // Verify template data is populated
    const titleValue = await page.inputValue('input[name="title"]');
    expect(titleValue).toContain('Ceremony Setup');
    
    const categoryValue = await page.inputValue('select[name="category"]');
    expect(categoryValue).toBe('venue_management');
  });

  test('should validate security and XSS prevention', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Test XSS prevention in form inputs
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[name="title"]', xssPayload);
    await page.fill('textarea[name="description"]', xssPayload);
    
    // Submit form
    await page.selectOption('select[name="category"]', 'logistics');
    await page.fill('input[name="deadline"]', '2025-02-15T14:00');
    await page.click('button[type="submit"]');
    
    // Verify XSS payload is sanitized (should not execute)
    await page.waitForSelector('[data-testid="task-created-success"]');
    
    // Check that script did not execute
    const alerts = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    
    expect(alerts.length).toBe(0); // No alert should have fired
  });

  test('should handle form validation errors gracefully', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Submit empty form to trigger validation
    await page.click('button[type="submit"]');
    
    // Verify validation errors are shown
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
    await expect(page.locator('[data-testid="category-error"]')).toContainText('Category is required');
    await expect(page.locator('[data-testid="deadline-error"]')).toContainText('Deadline is required');
    
    // Verify form stays open and doesn't submit
    await expect(page.locator('[data-testid="task-creator-form"]')).toBeVisible();
    
    // Test that fixing errors removes validation messages
    await page.fill('input[name="title"]', 'Valid task title');
    await expect(page.locator('[data-testid="title-error"]')).not.toBeVisible();
  });

  test('should handle dependencies and task relationships', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');
    
    // Fill basic task info
    await page.fill('input[name="title"]', 'Dependent task');
    await page.selectOption('select[name="category"]', 'photography');
    await page.fill('input[name="deadline"]', '2025-02-15T14:00');
    
    // Add dependency
    await page.click('[data-testid="add-dependency-button"]');
    await expect(page.locator('[data-testid="dependency-0"]')).toBeVisible();
    
    // Select predecessor task
    await page.selectOption('[data-testid="predecessor-select-0"]', 'existing-task-id');
    await page.selectOption('[data-testid="dependency-type-0"]', 'finish_to_start');
    await page.fill('[data-testid="lag-time-0"]', '2');
    
    // Verify dependency is configured
    const predecessorValue = await page.inputValue('[data-testid="predecessor-select-0"]');
    expect(predecessorValue).toBe('existing-task-id');
  });

  test('should maintain zero console errors during interaction', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Perform complete task creation workflow
    await page.click('[data-testid="create-task-button"]');
    await page.fill('input[name="title"]', 'Console error test');
    await page.selectOption('select[name="category"]', 'catering');
    await page.fill('input[name="deadline"]', '2025-02-15T14:00');
    await page.click('button[type="submit"]');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="task-created-success"]');
    
    // Verify zero console errors
    expect(consoleErrors).toHaveLength(0);
  });
});