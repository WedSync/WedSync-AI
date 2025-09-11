/**
 * WS-168: Customer Success Dashboard - E2E Admin Intervention Tests
 * Testing complete admin workflows for health monitoring and interventions
 */

import { test, expect, Page } from '@playwright/test';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { loginAsAdmin } from '../helpers/auth';

test.describe('WS-168: Admin Health Dashboard E2E', () => {
  let page: Page;
  let adminToken: string;

  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test.afterAll(async () => {
    await cleanupTestDatabase();
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    adminToken = await loginAsAdmin(page);
    await page.goto('/admin/customer-success');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Health Score Monitoring', () => {
    test('should display health score dashboard with all suppliers', async () => {
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="health-dashboard"]');

      // Verify dashboard elements
      await expect(page.locator('[data-testid="total-suppliers"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-health-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="at-risk-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="champion-count"]')).toBeVisible();

      // Check health score table
      const healthTable = page.locator('[data-testid="health-scores-table"]');
      await expect(healthTable).toBeVisible();

      // Verify table has data
      const rows = await healthTable.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);

      // Verify health score indicators
      const firstRow = healthTable.locator('tbody tr').first();
      await expect(firstRow.locator('[data-testid="health-score-badge"]')).toBeVisible();
      await expect(firstRow.locator('[data-testid="trend-indicator"]')).toBeVisible();
    });

    test('should filter suppliers by health status', async () => {
      // Wait for filters to load
      await page.waitForSelector('[data-testid="health-filter"]');

      // Test "At Risk" filter
      await page.click('[data-testid="filter-at-risk"]');
      await page.waitForTimeout(500);

      const atRiskRows = await page.locator('[data-testid="health-scores-table"] tbody tr').count();
      
      // Verify all displayed users are at risk (score < 50)
      for (let i = 0; i < atRiskRows; i++) {
        const scoreText = await page
          .locator(`[data-testid="health-scores-table"] tbody tr:nth-child(${i + 1}) [data-testid="health-score"]`)
          .textContent();
        const score = parseInt(scoreText || '0');
        expect(score).toBeLessThan(50);
      }

      // Test "Healthy" filter
      await page.click('[data-testid="filter-healthy"]');
      await page.waitForTimeout(500);

      const healthyRows = await page.locator('[data-testid="health-scores-table"] tbody tr').count();
      
      // Verify all displayed users are healthy (score >= 70)
      for (let i = 0; i < healthyRows; i++) {
        const scoreText = await page
          .locator(`[data-testid="health-scores-table"] tbody tr:nth-child(${i + 1}) [data-testid="health-score"]`)
          .textContent();
        const score = parseInt(scoreText || '0');
        expect(score).toBeGreaterThanOrEqual(70);
      }
    });

    test('should sort suppliers by health score', async () => {
      // Click health score column header to sort
      await page.click('[data-testid="sort-health-score"]');
      await page.waitForTimeout(500);

      // Get all health scores
      const scores = await page.locator('[data-testid="health-score"]').allTextContents();
      const numericScores = scores.map(s => parseInt(s));

      // Verify descending order
      for (let i = 0; i < numericScores.length - 1; i++) {
        expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
      }

      // Click again for ascending order
      await page.click('[data-testid="sort-health-score"]');
      await page.waitForTimeout(500);

      const ascScores = await page.locator('[data-testid="health-score"]').allTextContents();
      const ascNumericScores = ascScores.map(s => parseInt(s));

      // Verify ascending order
      for (let i = 0; i < ascNumericScores.length - 1; i++) {
        expect(ascNumericScores[i]).toBeLessThanOrEqual(ascNumericScores[i + 1]);
      }
    });

    test('should show health score details on click', async () => {
      // Click on first supplier row
      await page.click('[data-testid="health-scores-table"] tbody tr:first-child');

      // Wait for details modal
      await page.waitForSelector('[data-testid="health-details-modal"]');

      // Verify component scores are displayed
      await expect(page.locator('[data-testid="onboarding-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-adoption-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="support-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="retention-score"]')).toBeVisible();

      // Verify risk factors if present
      const riskFactors = page.locator('[data-testid="risk-factors"]');
      if (await riskFactors.isVisible()) {
        const factorCount = await riskFactors.locator('[data-testid="risk-factor-item"]').count();
        expect(factorCount).toBeGreaterThan(0);
      }

      // Verify recommendations
      await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
    });
  });

  test.describe('Intervention Workflow', () => {
    test('should create intervention for at-risk supplier', async () => {
      // Navigate to at-risk suppliers
      await page.click('[data-testid="filter-at-risk"]');
      await page.waitForTimeout(500);

      // Click intervention button on first at-risk supplier
      await page.click('[data-testid="health-scores-table"] tbody tr:first-child [data-testid="create-intervention"]');

      // Wait for intervention form
      await page.waitForSelector('[data-testid="intervention-form"]');

      // Fill intervention details
      await page.selectOption('[data-testid="intervention-type"]', 'success_call');
      await page.selectOption('[data-testid="priority"]', 'high');
      await page.fill('[data-testid="intervention-reason"]', 'Health score dropped below 40, immediate attention required');
      await page.selectOption('[data-testid="assigned-to"]', 'admin-1');
      
      // Set due date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('[data-testid="due-date"]', tomorrow.toISOString().split('T')[0]);

      // Submit intervention
      await page.click('[data-testid="submit-intervention"]');

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Intervention created successfully');

      // Verify intervention appears in list
      await page.goto('/admin/interventions');
      await page.waitForSelector('[data-testid="interventions-list"]');
      
      const newIntervention = page.locator('[data-testid="intervention-item"]').first();
      await expect(newIntervention).toContainText('success_call');
      await expect(newIntervention).toContainText('high');
    });

    test('should update intervention status', async () => {
      await page.goto('/admin/interventions');
      await page.waitForSelector('[data-testid="interventions-list"]');

      // Click on first pending intervention
      await page.click('[data-testid="intervention-item"][data-status="pending"]:first-child');

      // Wait for intervention details
      await page.waitForSelector('[data-testid="intervention-details"]');

      // Update status to in-progress
      await page.click('[data-testid="start-intervention"]');
      
      // Add notes
      await page.fill('[data-testid="intervention-notes"]', 'Called supplier, scheduled training session for tomorrow at 2 PM');
      await page.click('[data-testid="save-notes"]');

      // Verify status update
      await expect(page.locator('[data-testid="intervention-status"]')).toContainText('In Progress');

      // Complete intervention
      await page.click('[data-testid="complete-intervention"]');
      
      // Add completion notes
      await page.fill('[data-testid="completion-notes"]', 'Training completed successfully. Supplier is now comfortable with all features.');
      await page.selectOption('[data-testid="outcome"]', 'successful');
      await page.click('[data-testid="submit-completion"]');

      // Verify completion
      await expect(page.locator('[data-testid="intervention-status"]')).toContainText('Completed');
      await expect(page.locator('[data-testid="outcome-badge"]')).toContainText('Successful');
    });

    test('should trigger automated interventions for critical scores', async () => {
      // Create a mock supplier with critical health score
      await page.evaluate(async () => {
        const response = await fetch('/api/test/create-critical-supplier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            health_score: 25,
            trend: 'declining',
            at_risk_score: 85
          })
        });
        return response.json();
      });

      // Navigate to dashboard
      await page.goto('/admin/customer-success');
      await page.waitForTimeout(2000); // Wait for automated trigger

      // Check for automated intervention alert
      await expect(page.locator('[data-testid="automated-intervention-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="automated-intervention-alert"]')).toContainText('Automated intervention created');

      // Navigate to interventions
      await page.goto('/admin/interventions');
      
      // Find automated intervention
      const automatedIntervention = page.locator('[data-testid="intervention-item"][data-automated="true"]').first();
      await expect(automatedIntervention).toBeVisible();
      await expect(automatedIntervention).toContainText('Critical health score detected');
      await expect(automatedIntervention).toContainText('priority: critical');
    });

    test('should bulk assign interventions', async () => {
      await page.goto('/admin/customer-success');
      
      // Filter to at-risk suppliers
      await page.click('[data-testid="filter-at-risk"]');
      await page.waitForTimeout(500);

      // Select multiple suppliers
      await page.click('[data-testid="select-all-checkbox"]');
      
      // Click bulk action
      await page.click('[data-testid="bulk-actions"]');
      await page.click('[data-testid="bulk-create-intervention"]');

      // Fill bulk intervention form
      await page.waitForSelector('[data-testid="bulk-intervention-form"]');
      await page.selectOption('[data-testid="bulk-intervention-type"]', 'feature_training');
      await page.selectOption('[data-testid="bulk-priority"]', 'medium');
      await page.fill('[data-testid="bulk-reason"]', 'Bulk intervention for all at-risk suppliers');
      
      // Assign to team
      await page.selectOption('[data-testid="bulk-assign-to"]', 'success-team');
      
      // Submit bulk interventions
      await page.click('[data-testid="submit-bulk-intervention"]');

      // Verify success
      await expect(page.locator('[data-testid="bulk-success-message"]')).toBeVisible();
      const successText = await page.locator('[data-testid="bulk-success-message"]').textContent();
      expect(successText).toMatch(/Created \d+ interventions successfully/);
    });
  });

  test.describe('Dashboard Real-time Updates', () => {
    test('should update health scores in real-time', async ({ browser }) => {
      // Open second browser context as another admin
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await loginAsAdmin(page2);
      await page2.goto('/admin/customer-success');

      // Find a supplier in first browser
      const supplierName = await page.locator('[data-testid="supplier-name"]').first().textContent();

      // Update health score via API in second browser
      await page2.evaluate(async (supplier) => {
        const response = await fetch('/api/admin/health-scores/recalculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplier_name: supplier })
        });
        return response.json();
      }, supplierName);

      // Wait for real-time update in first browser
      await page.waitForTimeout(2000);

      // Verify health score changed indicator
      await expect(page.locator(`[data-testid="supplier-row"][data-name="${supplierName}"] [data-testid="updated-indicator"]`)).toBeVisible();

      // Close second context
      await context2.close();
    });

    test('should show notification for new critical interventions', async ({ browser }) => {
      // Open second browser as another admin
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await loginAsAdmin(page2);

      // Create critical intervention in second browser
      await page2.goto('/admin/interventions/create');
      await page2.fill('[data-testid="intervention-user"]', 'critical-user-123');
      await page2.selectOption('[data-testid="intervention-type"]', 'emergency_call');
      await page2.selectOption('[data-testid="priority"]', 'critical');
      await page2.fill('[data-testid="intervention-reason"]', 'Emergency: Supplier about to churn');
      await page2.click('[data-testid="submit-intervention"]');

      // Check for notification in first browser
      await page.waitForSelector('[data-testid="critical-intervention-notification"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="critical-intervention-notification"]')).toContainText('New critical intervention');
      
      // Click notification to view
      await page.click('[data-testid="critical-intervention-notification"]');
      await expect(page).toHaveURL(/\/admin\/interventions/);

      // Close second context
      await context2.close();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large datasets efficiently', async () => {
      // Navigate to dashboard with 1000+ suppliers
      await page.goto('/admin/customer-success?test=large-dataset');

      // Measure load time
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="health-dashboard"]');
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Verify pagination works
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      const totalPages = await page.locator('[data-testid="total-pages"]').textContent();
      expect(parseInt(totalPages || '0')).toBeGreaterThan(10);

      // Test pagination performance
      const pageStartTime = Date.now();
      await page.click('[data-testid="next-page"]');
      await page.waitForSelector('[data-testid="health-scores-table"]');
      const pageChangeTime = Date.now() - pageStartTime;

      // Page change should be under 1 second
      expect(pageChangeTime).toBeLessThan(1000);
    });

    test('should handle concurrent admin actions', async ({ browser }) => {
      // Create multiple admin sessions
      const contexts = await Promise.all(
        Array(5).fill(null).map(() => browser.newContext())
      );
      
      const pages = await Promise.all(
        contexts.map(async (context) => {
          const p = await context.newPage();
          await loginAsAdmin(p);
          return p;
        })
      );

      // All admins navigate to dashboard simultaneously
      await Promise.all(
        pages.map(p => p.goto('/admin/customer-success'))
      );

      // All admins create interventions simultaneously
      const interventionPromises = pages.map(async (p, index) => {
        await p.click('[data-testid="health-scores-table"] tbody tr:nth-child(' + (index + 1) + ') [data-testid="create-intervention"]');
        await p.waitForSelector('[data-testid="intervention-form"]');
        await p.selectOption('[data-testid="intervention-type"]', 'success_call');
        await p.fill('[data-testid="intervention-reason"]', `Concurrent test ${index}`);
        await p.click('[data-testid="submit-intervention"]');
        return p.waitForSelector('[data-testid="success-message"]');
      });

      // All should complete successfully
      await expect(Promise.all(interventionPromises)).resolves.toBeDefined();

      // Clean up
      await Promise.all(contexts.map(c => c.close()));
    });
  });

  test.describe('Export and Reporting', () => {
    test('should export health scores to CSV', async () => {
      // Apply filters
      await page.click('[data-testid="filter-at-risk"]');
      await page.waitForTimeout(500);

      // Click export button
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv"]')
      ]);

      // Verify download
      expect(download.suggestedFilename()).toContain('health-scores');
      expect(download.suggestedFilename()).toContain('.csv');

      // Save and verify content
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should generate intervention report', async () => {
      await page.goto('/admin/interventions/reports');

      // Set date range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      await page.fill('[data-testid="report-start-date"]', startDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="report-end-date"]', new Date().toISOString().split('T')[0]);

      // Generate report
      await page.click('[data-testid="generate-report"]');
      await page.waitForSelector('[data-testid="report-results"]');

      // Verify report sections
      await expect(page.locator('[data-testid="total-interventions"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-resolution-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="interventions-by-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="interventions-by-outcome"]')).toBeVisible();
    });
  });
});