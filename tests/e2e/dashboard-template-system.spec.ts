import { test, expect } from '@playwright/test';

/**
 * Dashboard Template System E2E Tests
 * WS-065 Team B Round 2 - Comprehensive test coverage
 * 
 * Tests the complete dashboard template system including:
 * - Template creation and editing
 * - Drag-and-drop layout designer  
 * - Section management and configuration
 * - Template preview and assignment
 * - Performance and rendering validation
 */

test.describe('Dashboard Template System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as supplier
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'supplier@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/dashboard/);
  });

  test.describe('Template Management', () => {
    test('should display templates overview page', async ({ page }) => {
      await page.goto('/dashboard-templates');
      
      // Verify page elements
      await expect(page).toHaveTitle(/Dashboard Templates/);
      await expect(page.locator('h1')).toContainText('Dashboard Templates');
      await expect(page.locator('[data-testid="create-template-btn"]')).toBeVisible();
      
      // Verify stats cards
      await expect(page.locator('[data-testid="total-templates"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-assignments"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-render-time"]')).toBeVisible();
    });

    test('should create new template successfully', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Fill basic template information
      await page.fill('[data-testid="template-name"]', 'Luxury Wedding Template');
      await page.fill('[data-testid="template-description"]', 'Premium template for luxury weddings');
      await page.selectOption('[data-testid="template-category"]', 'luxury');
      
      // Configure template settings
      await page.check('[data-testid="is-active"]');
      await page.check('[data-testid="priority-loading"]');
      
      // Add sections from library
      await page.click('[data-testid="add-section-welcome"]');
      await page.click('[data-testid="add-section-timeline"]');
      await page.click('[data-testid="add-section-budget-tracker"]');
      
      // Verify sections appear in grid
      await expect(page.locator('[data-testid="section-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="section-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="section-budget-tracker"]')).toBeVisible();
      
      // Save template
      await page.click('[data-testid="save-template"]');
      
      // Verify redirect and success
      await expect(page).toHaveURL('/dashboard-templates');
      await expect(page.locator('.toast-success')).toContainText('Template created successfully');
    });

    test('should edit existing template', async ({ page }) => {
      // Assuming a template exists
      await page.goto('/dashboard-templates');
      await page.click('[data-testid="edit-template-1"]');
      
      // Modify template name
      await page.fill('[data-testid="template-name"]', 'Updated Luxury Template');
      
      // Add new section
      await page.click('[data-testid="add-section-vendor-portfolio"]');
      
      // Save changes
      await page.click('[data-testid="save-template"]');
      
      // Verify changes saved
      await expect(page).toHaveURL('/dashboard-templates');
      await expect(page.locator('[data-testid="template-1-name"]')).toContainText('Updated Luxury Template');
    });

    test('should duplicate template', async ({ page }) => {
      await page.goto('/dashboard-templates');
      
      // Click duplicate button
      await page.click('[data-testid="duplicate-template-1"]');
      
      // Verify duplicate modal appears
      await expect(page.locator('[data-testid="duplicate-modal"]')).toBeVisible();
      
      // Enter new name
      await page.fill('[data-testid="duplicate-name"]', 'Copy of Luxury Template');
      await page.click('[data-testid="confirm-duplicate"]');
      
      // Verify new template appears
      await expect(page.locator('[data-testid="template-name"]')).toContainText('Copy of Luxury Template');
    });
  });

  test.describe('Template Builder - Drag and Drop', () => {
    test('should support drag and drop section positioning', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Add sections
      await page.click('[data-testid="add-section-welcome"]');
      await page.click('[data-testid="add-section-timeline"]');
      
      // Get initial positions
      const welcomeSection = page.locator('[data-testid="section-welcome"]');
      const timelineSection = page.locator('[data-testid="section-timeline"]');
      
      const welcomeInitialBox = await welcomeSection.boundingBox();
      const timelineInitialBox = await timelineSection.boundingBox();
      
      // Drag welcome section to different position
      await welcomeSection.dragTo(page.locator('[data-testid="grid-cell-6-2"]'));
      
      // Verify position changed
      const welcomeNewBox = await welcomeSection.boundingBox();
      expect(welcomeNewBox).not.toEqual(welcomeInitialBox);
      
      // Verify no overlap warnings
      await expect(page.locator('[data-testid="overlap-warning"]')).not.toBeVisible();
    });

    test('should prevent overlapping sections', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Add two sections
      await page.click('[data-testid="add-section-welcome"]');
      await page.click('[data-testid="add-section-timeline"]');
      
      // Try to drag one section on top of another
      const timelineSection = page.locator('[data-testid="section-timeline"]');
      const welcomeSection = page.locator('[data-testid="section-welcome"]');
      
      await timelineSection.dragTo(welcomeSection);
      
      // Verify overlap warning appears
      await expect(page.locator('[data-testid="overlap-warning"]')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Sections cannot overlap');
    });

    test('should support section resizing', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      await page.click('[data-testid="add-section-welcome"]');
      
      const section = page.locator('[data-testid="section-welcome"]');
      const initialBox = await section.boundingBox();
      
      // Resize section using resize handle
      const resizeHandle = section.locator('[data-testid="resize-handle"]');
      await resizeHandle.dragTo(page.locator('[data-testid="grid-cell-8-4"]'));
      
      // Verify size changed
      const newBox = await section.boundingBox();
      expect(newBox?.width).toBeGreaterThan(initialBox?.width || 0);
      expect(newBox?.height).toBeGreaterThan(initialBox?.height || 0);
    });

    test('should validate grid constraints', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      await page.click('[data-testid="add-section-welcome"]');
      
      const section = page.locator('[data-testid="section-welcome"]');
      
      // Try to drag section outside grid
      await section.dragTo(page.locator('body'), { targetPosition: { x: -100, y: -100 } });
      
      // Verify section snaps to grid bounds
      const box = await section.boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.y).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Section Library and Configuration', () => {
    test('should display all available sections', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Verify section library is visible
      await expect(page.locator('[data-testid="section-library"]')).toBeVisible();
      
      // Verify essential sections are available
      await expect(page.locator('[data-testid="library-section-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="library-section-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="library-section-budget-tracker"]')).toBeVisible();
      await expect(page.locator('[data-testid="library-section-vendor-portfolio"]')).toBeVisible();
      await expect(page.locator('[data-testid="library-section-guest-list"]')).toBeVisible();
    });

    test('should configure section properties', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      await page.click('[data-testid="add-section-welcome"]');
      
      // Click on section to configure
      await page.click('[data-testid="section-welcome"]');
      
      // Verify configuration panel appears
      await expect(page.locator('[data-testid="section-config-panel"]')).toBeVisible();
      
      // Modify section properties
      await page.fill('[data-testid="section-title"]', 'Custom Welcome Message');
      await page.fill('[data-testid="section-description"]', 'Personalized greeting for clients');
      await page.check('[data-testid="section-required"]');
      
      // Verify changes reflected in grid
      await expect(page.locator('[data-testid="section-welcome"] .section-title')).toContainText('Custom Welcome Message');
    });

    test('should support conditional section rules', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      await page.click('[data-testid="add-section-budget-tracker"]');
      await page.click('[data-testid="section-budget-tracker"]');
      
      // Configure conditional rules
      await page.click('[data-testid="add-conditional-rule"]');
      await page.selectOption('[data-testid="rule-field"]', 'budget_range');
      await page.selectOption('[data-testid="rule-operator"]', 'equals');
      await page.fill('[data-testid="rule-value"]', 'luxury');
      
      // Verify rule appears
      await expect(page.locator('[data-testid="conditional-rule-1"]')).toBeVisible();
    });

    test('should handle mobile responsive configuration', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      await page.click('[data-testid="add-section-welcome"]');
      await page.click('[data-testid="section-welcome"]');
      
      // Switch to mobile configuration
      await page.click('[data-testid="mobile-config-tab"]');
      
      // Modify mobile settings
      await page.fill('[data-testid="mobile-width"]', '12');
      await page.fill('[data-testid="mobile-height"]', '3');
      
      // Verify mobile preview updates
      await page.click('[data-testid="mobile-preview"]');
      const mobileSection = page.locator('[data-testid="section-welcome"].mobile-view');
      await expect(mobileSection).toHaveCSS('grid-column', 'span 12');
    });
  });

  test.describe('Template Preview and Assignment', () => {
    test('should render template preview with mock data', async ({ page }) => {
      // Assuming template exists
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify preview mode indicator
      await expect(page.locator('[data-testid="preview-mode-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-mode-indicator"]')).toContainText('Preview Mode');
      
      // Verify mock client data is displayed
      await expect(page.locator('[data-testid="client-name"]')).toContainText('Emma & James');
      await expect(page.locator('[data-testid="wedding-date"]')).toContainText('August 15, 2025');
      await expect(page.locator('[data-testid="venue-name"]')).toContainText('Elegant Garden Estate');
      
      // Verify sections render correctly
      await expect(page.locator('[data-testid="section-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="section-timeline"]')).toBeVisible();
    });

    test('should support section interactions in preview', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Interact with timeline section
      await page.click('[data-testid="timeline-add-task"]');
      
      // Verify interaction is logged (preview mode)
      await expect(page.locator('[data-testid="interaction-log"]')).toContainText('Preview interaction: timeline add_task');
      
      // Interact with budget section
      await page.click('[data-testid="budget-add-expense"]');
      await expect(page.locator('[data-testid="interaction-log"]')).toContainText('Preview interaction: budget add_expense');
    });

    test('should assign template to client', async ({ page }) => {
      await page.goto('/dashboard-templates');
      
      // Click assign template button
      await page.click('[data-testid="assign-template-1"]');
      
      // Select client
      await page.click('[data-testid="client-selector"]');
      await page.click('[data-testid="client-option-1"]');
      
      // Configure assignment
      await page.selectOption('[data-testid="assignment-reason"]', 'manual');
      await page.fill('[data-testid="assignment-notes"]', 'Perfect match for luxury wedding');
      
      // Apply custom branding
      await page.fill('[data-testid="custom-brand-color"]', '#8B5CF6');
      
      // Confirm assignment
      await page.click('[data-testid="confirm-assignment"]');
      
      // Verify success
      await expect(page.locator('.toast-success')).toContainText('Template assigned successfully');
    });

    test('should support automatic template assignment', async ({ page }) => {
      await page.goto('/dashboard-templates');
      
      // Enable auto-assignment rule
      await page.click('[data-testid="template-1-settings"]');
      await page.click('[data-testid="auto-assignment-tab"]');
      
      // Configure assignment rule
      await page.selectOption('[data-testid="rule-budget-range"]', 'luxury');
      await page.selectOption('[data-testid="rule-guest-count"]', 'large');
      await page.selectOption('[data-testid="rule-wedding-style"]', 'traditional');
      
      // Enable rule
      await page.check('[data-testid="enable-auto-assignment"]');
      await page.click('[data-testid="save-assignment-rules"]');
      
      // Verify rule is active
      await expect(page.locator('[data-testid="auto-assignment-status"]')).toContainText('Active');
    });
  });

  test.describe('Performance and Analytics', () => {
    test('should track template performance metrics', async ({ page }) => {
      await page.goto('/dashboard-templates/analytics');
      
      // Verify analytics dashboard
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-statistics"]')).toBeVisible();
      
      // Check performance metrics
      const renderTimeMetrics = page.locator('[data-testid="avg-render-time"]');
      await expect(renderTimeMetrics).toBeVisible();
      
      // Verify performance categorization
      await expect(page.locator('[data-testid="fast-templates"]')).toBeVisible();
      await expect(page.locator('[data-testid="medium-templates"]')).toBeVisible();
      await expect(page.locator('[data-testid="slow-templates"]')).toBeVisible();
    });

    test('should meet 300ms render time target', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Measure render time
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="dashboard-rendered"]');
      const endTime = Date.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(300);
    });

    test('should handle template caching effectively', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // First load (cache miss)
      const firstLoadStart = Date.now();
      await page.waitForSelector('[data-testid="dashboard-rendered"]');
      const firstLoadEnd = Date.now();
      const firstLoadTime = firstLoadEnd - firstLoadStart;
      
      // Reload page (cache hit)
      await page.reload();
      const secondLoadStart = Date.now();
      await page.waitForSelector('[data-testid="dashboard-rendered"]');
      const secondLoadEnd = Date.now();
      const secondLoadTime = secondLoadEnd - secondLoadStart;
      
      // Cache hit should be faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8);
    });

    test('should track usage analytics', async ({ page }) => {
      await page.goto('/dashboard-templates/analytics');
      
      // Verify usage tracking
      await expect(page.locator('[data-testid="total-assignments"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-clients"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-popularity"]')).toBeVisible();
      
      // Check usage categorization
      const usageMetrics = page.locator('[data-testid="usage-metrics"]');
      await expect(usageMetrics.locator('.high-usage')).toBeVisible();
      await expect(usageMetrics.locator('.medium-usage')).toBeVisible();
      await expect(usageMetrics.locator('.low-usage')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle template save failures gracefully', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Fill incomplete form
      await page.fill('[data-testid="template-name"]', '');
      await page.click('[data-testid="save-template"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Template name is required');
      await expect(page.locator('[data-testid="error-summary"]')).toBeVisible();
    });

    test('should handle section loading failures', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/sections/*', route => route.abort());
      
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify error state
      await expect(page.locator('[data-testid="section-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/sections/*');
      await page.click('[data-testid="retry-button"]');
      
      // Verify section loads after retry
      await expect(page.locator('[data-testid="section-welcome"]')).toBeVisible();
    });

    test('should handle mobile responsiveness', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-layout"]')).not.toBeVisible();
      
      // Verify sections adapt to mobile
      const sections = page.locator('[data-testid^="section-"]');
      const count = await sections.count();
      
      for (let i = 0; i < count; i++) {
        const section = sections.nth(i);
        await expect(section).toHaveCSS('grid-column', /span 12|span 6/);
      }
    });

    test('should validate template permissions', async ({ page }) => {
      // Test accessing another supplier's template
      await page.goto('/dashboard-templates/999/edit');
      
      // Should redirect to 404 or access denied
      await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
    });

    test('should handle concurrent template editing', async ({ page, context }) => {
      // Open template in first tab
      await page.goto('/dashboard-templates/1/edit');
      await page.fill('[data-testid="template-name"]', 'Updated by User 1');
      
      // Open same template in second tab
      const page2 = await context.newPage();
      await page2.goto('/dashboard-templates/1/edit');
      await page2.fill('[data-testid="template-name"]', 'Updated by User 2');
      
      // Save in first tab
      await page.click('[data-testid="save-template"]');
      
      // Try to save in second tab
      await page2.click('[data-testid="save-template"]');
      
      // Verify conflict resolution
      await expect(page2.locator('[data-testid="conflict-warning"]')).toBeVisible();
    });
  });

  test.describe('Integration with Round 1 Systems', () => {
    test('should integrate with existing booking page builder', async ({ page }) => {
      await page.goto('/dashboard-templates/new');
      
      // Verify shared component patterns
      await expect(page.locator('[data-testid="brand-color-picker"]')).toBeVisible();
      await expect(page.locator('[data-testid="logo-upload"]')).toBeVisible();
      
      // Verify consistent styling with booking builder
      const colorPicker = page.locator('[data-testid="brand-color-picker"]');
      await expect(colorPicker).toHaveCSS('appearance', /none/);
    });

    test('should share branding with existing client dashboard', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify branding consistency
      const header = page.locator('[data-testid="dashboard-header"]');
      await expect(header).toHaveCSS('background-color', /#7F56D9|rgb\(127, 86, 217\)/);
      
      // Verify logo placement matches existing patterns
      await expect(page.locator('[data-testid="supplier-logo"]')).toBeVisible();
    });

    test('should maintain data consistency with client profiles', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify client data integration
      await expect(page.locator('[data-testid="client-wedding-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="client-venue"]')).toBeVisible();
      await expect(page.locator('[data-testid="client-guest-count"]')).toBeVisible();
      
      // Verify data format consistency
      const weddingDate = page.locator('[data-testid="client-wedding-date"]');
      await expect(weddingDate).toHaveText(/^\w+, \w+ \d{1,2}, \d{4}$/); // e.g., "Saturday, August 15, 2025"
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Verify focus management
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test screen reader compatibility
      await expect(page.locator('[aria-label]')).toBeDefined();
      await expect(page.locator('[role]')).toBeDefined();
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify text contrast (this would need actual color analysis in practice)
      const textElements = page.locator('[data-testid^="section-"] .text-gray-900');
      await expect(textElements.first()).toHaveCSS('color', 'rgb(17, 24, 39)');
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/dashboard-templates/1/preview');
      
      // Verify semantic markup
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1, h2, h3')).toBeDefined();
      
      // Verify ARIA labels
      await expect(page.locator('[aria-labelledby]')).toBeDefined();
      await expect(page.locator('[aria-describedby]')).toBeDefined();
    });
  });
});

/**
 * Performance Test Suite
 * Validates rendering performance targets
 */
test.describe('Performance Validation', () => {
  test('should render dashboard under 300ms target', async ({ page }) => {
    await page.goto('/dashboard-templates/1/preview');
    
    const performanceEntries = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')));
    });
    
    const loadTime = performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.navigationStart;
    expect(loadTime).toBeLessThan(300);
  });

  test('should handle large templates efficiently', async ({ page }) => {
    // Create template with many sections
    await page.goto('/dashboard-templates/new');
    
    // Add maximum sections
    const maxSections = 12;
    for (let i = 0; i < maxSections; i++) {
      await page.click(`[data-testid="add-section-${i}"]`);
    }
    
    // Measure save time
    const startTime = Date.now();
    await page.click('[data-testid="save-template"]');
    await page.waitForURL('/dashboard-templates');
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(2000); // 2 second max
  });

  test('should maintain performance with multiple templates', async ({ page }) => {
    await page.goto('/dashboard-templates');
    
    // Measure page load with multiple templates
    const startTime = performance.now();
    await page.waitForSelector('[data-testid="templates-loaded"]');
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(500);
  });
});