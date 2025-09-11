/**
 * E2E Tests for Conditional Journey System
 * Tests complete user workflows with conditional branching
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Conditional Journey System E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Setup test environment
    await page.goto('/dashboard/journeys');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="journey-canvas"]');
  });

  test.describe('Journey Builder - Conditional Nodes', () => {
    test('should create and configure conditional node', async () => {
      // Click add node button
      await page.click('[data-testid="add-node-button"]');
      
      // Select conditional node type
      await page.click('[data-testid="node-type-conditional"]');
      
      // Verify conditional node was created
      const conditionalNode = page.locator('[data-testid="node-conditional"]');
      await expect(conditionalNode).toBeVisible();
      
      // Configure node name
      await conditionalNode.locator('input[placeholder="Branch name..."]').fill('Destination Wedding Check');
      
      // Open node editor
      await conditionalNode.locator('[data-testid="expand-node"]').click();
      
      // Add condition
      await conditionalNode.locator('[data-testid="edit-conditions"]').click();
      await conditionalNode.locator('[data-testid="add-condition"]').click();
      
      // Configure condition
      await conditionalNode.locator('[data-testid="condition-field"]').selectOption('wedding.location.distance');
      await conditionalNode.locator('[data-testid="condition-operator"]').selectOption('greater_than');
      await conditionalNode.locator('[data-testid="condition-value"]').fill('100');
      
      // Save condition
      await conditionalNode.locator('[data-testid="save-conditions"]').click();
      
      // Verify condition is displayed
      await expect(conditionalNode.locator('text=wedding.location.distance > 100')).toBeVisible();
    });

    test('should configure true and false paths', async () => {
      // Assume conditional node exists
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Expand node
      await conditionalNode.locator('[data-testid="expand-node"]').click();
      
      // Configure true path
      await conditionalNode.locator('[data-testid="true-path-select"]').selectOption('destination_email_sequence');
      
      // Configure false path
      await conditionalNode.locator('[data-testid="false-path-select"]').selectOption('local_email_sequence');
      
      // Verify paths are set
      await expect(conditionalNode.locator('text=True: destination_email_sequence')).toBeVisible();
      await expect(conditionalNode.locator('text=False: local_email_sequence')).toBeVisible();
    });

    test('should enable and configure A/B testing', async () => {
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Expand node
      await conditionalNode.locator('[data-testid="expand-node"]').click();
      
      // Enable A/B testing
      await conditionalNode.locator('[data-testid="ab-test-toggle"]').click();
      
      // Verify A/B testing badge appears
      await expect(conditionalNode.locator('[data-testid="ab-test-badge"]')).toBeVisible();
      
      // Configure split percentage
      await conditionalNode.locator('[data-testid="split-percentage"]').fill('30');
      
      // Add variants
      await conditionalNode.locator('[data-testid="add-variant"]').click();
      await conditionalNode.locator('[data-testid="variant-0"]').selectOption('email_variant_a');
      
      await conditionalNode.locator('[data-testid="add-variant"]').click();
      await conditionalNode.locator('[data-testid="variant-1"]').selectOption('email_variant_b');
      
      // Verify configuration
      await expect(conditionalNode.locator('text=30% of users see variants')).toBeVisible();
    });

    test('should preview condition evaluation', async () => {
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Click preview button
      await conditionalNode.locator('[data-testid="preview-condition"]').click();
      
      // Verify preview result appears
      const previewResult = conditionalNode.locator('[data-testid="preview-result"]');
      await expect(previewResult).toBeVisible();
      
      // Should show either true (checkmark) or false (x) icon
      const resultIcon = conditionalNode.locator('[data-testid="preview-result"] svg');
      await expect(resultIcon).toBeVisible();
    });
  });

  test.describe('Journey Builder - Split Nodes', () => {
    test('should create and configure split node', async () => {
      // Add split node
      await page.click('[data-testid="add-node-button"]');
      await page.click('[data-testid="node-type-split"]');
      
      const splitNode = page.locator('[data-testid="node-split"]');
      await expect(splitNode).toBeVisible();
      
      // Configure node name
      await splitNode.locator('input[placeholder="Split test name..."]').fill('Email Template A/B Test');
      
      // Expand node
      await splitNode.locator('[data-testid="expand-node"]').click();
      
      // Add branches
      await splitNode.locator('[data-testid="add-branch"]').click();
      await splitNode.locator('[data-testid="add-branch"]').click();
      
      // Verify branches were added
      const branches = splitNode.locator('[data-testid="branch-editor"]');
      await expect(branches).toHaveCount(2);
    });

    test('should configure branch percentages and targets', async () => {
      const splitNode = page.locator('[data-testid="node-split"]').first();
      
      // Configure first branch
      const firstBranch = splitNode.locator('[data-testid="branch-editor"]').first();
      await firstBranch.locator('[data-testid="branch-name"]').fill('Traditional Email');
      await firstBranch.locator('[data-testid="branch-percentage"]').fill('60');
      await firstBranch.locator('[data-testid="branch-target"]').selectOption('traditional_email_node');
      
      // Configure second branch
      const secondBranch = splitNode.locator('[data-testid="branch-editor"]').nth(1);
      await secondBranch.locator('[data-testid="branch-name"]').fill('Modern Email');
      await secondBranch.locator('[data-testid="branch-percentage"]').fill('40');
      await secondBranch.locator('[data-testid="branch-target"]').selectOption('modern_email_node');
      
      // Verify total percentage
      await expect(splitNode.locator('text=100%')).toBeVisible();
    });

    test('should use auto-fix for invalid percentages', async () => {
      const splitNode = page.locator('[data-testid="node-split"]').first();
      
      // Set invalid percentages (total > 100)
      const firstBranch = splitNode.locator('[data-testid="branch-editor"]').first();
      await firstBranch.locator('[data-testid="branch-percentage"]').fill('70');
      
      const secondBranch = splitNode.locator('[data-testid="branch-editor"]').nth(1);
      await secondBranch.locator('[data-testid="branch-percentage"]').fill('60');
      
      // Should show warning
      await expect(splitNode.locator('text=Total percentage is 130%')).toBeVisible();
      
      // Click auto-fix
      await splitNode.locator('[data-testid="auto-fix-percentages"]').click();
      
      // Should now total 100%
      await expect(splitNode.locator('text=100%')).toBeVisible();
    });

    test('should enable analytics tracking', async () => {
      const splitNode = page.locator('[data-testid="node-split"]').first();
      
      // Expand node
      await splitNode.locator('[data-testid="expand-node"]').click();
      
      // Enable analytics
      await splitNode.locator('[data-testid="analytics-toggle"]').click();
      
      // Verify analytics badge appears
      await expect(splitNode.locator('[data-testid="analytics-badge"]')).toBeVisible();
      
      // Configure tracking
      await splitNode.locator('[data-testid="conversion-goal"]').fill('email_opened');
      
      // Select metrics
      await splitNode.locator('[data-testid="metric-click_through_rate"]').click();
      await splitNode.locator('[data-testid="metric-conversion_rate"]').click();
      
      // Verify configuration saved
      await expect(splitNode.locator('text=Tracked')).toBeVisible();
    });
  });

  test.describe('Journey Execution - Wedding Photographer Scenarios', () => {
    test('should execute destination wedding workflow', async () => {
      // Navigate to journey execution
      await page.goto('/dashboard/journeys/test-execution');
      
      // Input destination wedding data
      await page.fill('[data-testid="wedding-location-distance"]', '150');
      await page.fill('[data-testid="wedding-guest-count"]', '120');
      await page.fill('[data-testid="wedding-budget"]', '5000');
      
      // Start journey execution
      await page.click('[data-testid="start-journey-execution"]');
      
      // Wait for execution to complete
      await page.waitForSelector('[data-testid="execution-result"]');
      
      // Verify destination workflow was triggered
      const result = page.locator('[data-testid="execution-result"]');
      await expect(result).toContainText('destination_workflow');
      
      // Verify execution was fast (<10ms requirement)
      const executionTime = await result.locator('[data-testid="execution-time"]').textContent();
      const timeMs = parseFloat(executionTime?.replace('ms', '') || '0');
      expect(timeMs).toBeLessThan(10);
    });

    test('should execute local wedding workflow', async () => {
      // Input local wedding data
      await page.fill('[data-testid="wedding-location-distance"]', '25');
      await page.fill('[data-testid="wedding-guest-count"]', '80');
      await page.fill('[data-testid="wedding-budget"]', '3000');
      
      // Start journey execution
      await page.click('[data-testid="start-journey-execution"]');
      
      // Wait for execution
      await page.waitForSelector('[data-testid="execution-result"]');
      
      // Verify local workflow was triggered
      const result = page.locator('[data-testid="execution-result"]');
      await expect(result).toContainText('local_workflow');
    });

    test('should handle A/B test assignment consistently', async () => {
      // Set user ID for consistent assignment
      await page.fill('[data-testid="user-id"]', 'test_user_123');
      
      const results = [];
      
      // Execute journey multiple times with same user
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="start-journey-execution"]');
        await page.waitForSelector('[data-testid="execution-result"]');
        
        const result = await page.locator('[data-testid="execution-result"]').textContent();
        results.push(result);
        
        // Reset for next execution
        await page.click('[data-testid="reset-execution"]');
      }
      
      // All results should be the same for consistent user assignment
      const firstResult = results[0];
      expect(results.every(result => result === firstResult)).toBeTruthy();
    });

    test('should track analytics for split tests', async () => {
      // Navigate to analytics dashboard
      await page.goto('/dashboard/analytics/journey-performance');
      
      // Wait for analytics to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Verify split test metrics
      const metrics = page.locator('[data-testid="split-test-metrics"]');
      await expect(metrics).toBeVisible();
      
      // Check for A/B test results
      await expect(metrics.locator('text=Email Template A/B Test')).toBeVisible();
      await expect(metrics.locator('[data-testid="conversion-rate"]')).toBeVisible();
      await expect(metrics.locator('[data-testid="branch-performance"]')).toBeVisible();
    });
  });

  test.describe('Complex Journey Scenarios', () => {
    test('should handle nested conditions correctly', async () => {
      // Test complex wedding photographer logic:
      // IF (destination OR large_budget) AND (spring_wedding OR fall_wedding) 
      // THEN premium_package ELSE standard_package
      
      await page.goto('/dashboard/journeys/complex-test');
      
      // Input complex scenario data
      await page.fill('[data-testid="wedding-location-distance"]', '200'); // destination
      await page.fill('[data-testid="wedding-budget"]', '8000'); // large budget
      await page.selectOption('[data-testid="wedding-season"]', 'spring'); // spring wedding
      
      await page.click('[data-testid="start-journey-execution"]');
      
      // Should trigger premium package
      const result = page.locator('[data-testid="execution-result"]');
      await expect(result).toContainText('premium_package');
    });

    test('should handle variable-based conditions', async () => {
      // Test conditions based on session variables
      await page.goto('/dashboard/journeys/variable-test');
      
      // Set session variables
      await page.fill('[data-testid="completed-steps"]', 'consultation,proposal_sent');
      await page.fill('[data-testid="client-communication-preference"]', 'email');
      
      await page.click('[data-testid="start-journey-execution"]');
      
      // Should follow email communication path
      const result = page.locator('[data-testid="execution-result"]');
      await expect(result).toContainText('email_sequence');
    });

    test('should handle multiple split tests in sequence', async () => {
      // Test sequential A/B tests
      await page.goto('/dashboard/journeys/sequential-splits');
      
      await page.click('[data-testid="start-journey-execution"]');
      
      // Wait for first split
      await page.waitForSelector('[data-testid="first-split-result"]');
      
      // Continue to second split
      await page.click('[data-testid="continue-journey"]');
      
      // Wait for second split
      await page.waitForSelector('[data-testid="second-split-result"]');
      
      // Verify both splits were executed
      const firstResult = page.locator('[data-testid="first-split-result"]');
      const secondResult = page.locator('[data-testid="second-split-result"]');
      
      await expect(firstResult).toBeVisible();
      await expect(secondResult).toBeVisible();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should maintain performance under load', async () => {
      // Test concurrent journey executions
      const startTime = Date.now();
      
      // Execute multiple journeys concurrently
      const promises = Array.from({ length: 10 }, async () => {
        const newPage = await page.context().newPage();
        await newPage.goto('/dashboard/journeys/performance-test');
        await newPage.click('[data-testid="start-journey-execution"]');
        await newPage.waitForSelector('[data-testid="execution-result"]');
        return newPage;
      });
      
      const pages = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete all executions in reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      // Clean up pages
      for (const testPage of pages) {
        await testPage.close();
      }
    });

    test('should handle error conditions gracefully', async () => {
      // Test with malformed condition data
      await page.goto('/dashboard/journeys/error-test');
      
      // Input invalid data
      await page.fill('[data-testid="wedding-location-distance"]', 'invalid');
      
      await page.click('[data-testid="start-journey-execution"]');
      
      // Should show error handling
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Should still provide fallback path
      const fallbackResult = page.locator('[data-testid="fallback-result"]');
      await expect(fallbackResult).toBeVisible();
    });

    test('should validate journey configuration before execution', async () => {
      // Test journey validation
      await page.goto('/dashboard/journeys/validation-test');
      
      // Try to execute incomplete journey
      await page.click('[data-testid="start-journey-execution"]');
      
      // Should show validation errors
      const validationErrors = page.locator('[data-testid="validation-errors"]');
      await expect(validationErrors).toBeVisible();
      
      // Should prevent execution
      const executionResult = page.locator('[data-testid="execution-result"]');
      await expect(executionResult).not.toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('should maintain consistent visual appearance', async () => {
      await page.goto('/dashboard/journeys/visual-test');
      
      // Take screenshot of conditional node
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      await expect(conditionalNode).toHaveScreenshot('conditional-node.png');
      
      // Expand node and take screenshot
      await conditionalNode.locator('[data-testid="expand-node"]').click();
      await expect(conditionalNode).toHaveScreenshot('conditional-node-expanded.png');
      
      // Take screenshot of split node
      const splitNode = page.locator('[data-testid="node-split"]').first();
      await expect(splitNode).toHaveScreenshot('split-node.png');
    });

    test('should show correct visual states for different conditions', async () => {
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Test preview result visual states
      await conditionalNode.locator('[data-testid="preview-condition"]').click();
      
      // Wait for result and capture
      await page.waitForSelector('[data-testid="preview-result"]');
      await expect(conditionalNode).toHaveScreenshot('conditional-node-with-result.png');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto('/dashboard/journeys/accessibility-test');
      
      // Test keyboard navigation through conditional node
      await page.keyboard.press('Tab'); // Focus on first node
      await page.keyboard.press('Enter'); // Expand node
      
      await page.keyboard.press('Tab'); // Focus on condition editor
      await page.keyboard.press('Enter'); // Open condition editor
      
      // Should be able to navigate with keyboard
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels', async () => {
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Check for proper ARIA attributes
      await expect(conditionalNode).toHaveAttribute('role', 'region');
      await expect(conditionalNode).toHaveAttribute('aria-label');
      
      // Check interactive elements
      const expandButton = conditionalNode.locator('[data-testid="expand-node"]');
      await expect(expandButton).toHaveAttribute('aria-expanded');
    });

    test('should support screen readers', async () => {
      // Test screen reader announcements
      const conditionalNode = page.locator('[data-testid="node-conditional"]').first();
      
      // Click preview and check for announcement
      await conditionalNode.locator('[data-testid="preview-condition"]').click();
      
      // Check for live region updates
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toContainText(/condition evaluated/i);
    });
  });
});