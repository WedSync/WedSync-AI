/**
 * WS-168: E2E Tests for Customer Success Intervention Workflows
 * Comprehensive testing using Browser MCP and Playwright MCP
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminUser: {
    email: 'admin@wedsync-test.com',
    password: 'TestPassword123!'
  },
  supplierUser: {
    email: 'supplier@wedsync-test.com',
    password: 'SupplierPass123!'
  },
  testOrganizationId: 'test-org-456'
};

// Helper functions for Browser MCP integration
async function captureBrowserState(page: Page, step: string) {
  await page.screenshot({ 
    path: `test-evidence/intervention-workflow-${step}-${Date.now()}.png`,
    fullPage: true 
  });
}

async function waitForHealthScoreUpdate(page: Page) {
  // Wait for health score calculation to complete
  await page.waitForSelector('[data-testid="health-score-value"]', { timeout: 10000 });
}

async function simulateHealthScoreDrop(page: Page, supplierId: string) {
  // Simulate conditions that cause health score to drop
  const response = await page.request.post('/api/test/simulate-health-drop', {
    data: { supplierId, scoreReduction: 40 }
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Customer Success Intervention Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  });

  test.describe('Admin Health Monitoring Dashboard', () => {
    test('should display real-time health metrics and alerts', async ({ page }) => {
      // Login as admin
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await captureBrowserState(page, 'admin-login-success');

      // Navigate to customer success dashboard
      await page.click('[data-testid="admin-menu"]');
      await page.click('[data-testid="customer-success-link"]');
      
      await captureBrowserState(page, 'customer-success-dashboard');

      // Verify health metrics are displayed
      await expect(page.locator('[data-testid="total-suppliers"]')).toBeVisible();
      await expect(page.locator('[data-testid="critical-risk-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-health-score"]')).toBeVisible();

      // Check health score distribution chart
      await expect(page.locator('[data-testid="health-distribution-chart"]')).toBeVisible();

      // Verify real-time updates work
      const initialCriticalCount = await page.textContent('[data-testid="critical-risk-count"]');
      
      // Simulate a health score drop that should trigger critical alert
      await simulateHealthScoreDrop(page, 'test-supplier-1');
      
      // Wait for real-time update
      await page.waitForTimeout(3000);
      
      const updatedCriticalCount = await page.textContent('[data-testid="critical-risk-count"]');
      expect(parseInt(updatedCriticalCount || '0')).toBeGreaterThan(parseInt(initialCriticalCount || '0'));
      
      await captureBrowserState(page, 'health-metrics-updated');
    });

    test('should show and manage admin alerts effectively', async ({ page }) => {
      // Login as admin and navigate to alerts
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/alerts`);
      await captureBrowserState(page, 'admin-alerts-page');

      // Check alert list is displayed
      await expect(page.locator('[data-testid="alerts-list"]')).toBeVisible();

      // Test alert filtering
      await page.click('[data-testid="filter-unacknowledged"]');
      await expect(page.locator('[data-testid="alert-item"]')).toHaveCount(await page.locator('[data-testid="alert-item"][data-acknowledged="false"]').count());

      // Test alert acknowledgment
      const firstAlert = page.locator('[data-testid="alert-item"]').first();
      await firstAlert.click();
      
      await expect(page.locator('[data-testid="alert-details-modal"]')).toBeVisible();
      await page.click('[data-testid="acknowledge-alert-btn"]');
      
      // Verify alert was acknowledged
      await expect(firstAlert.locator('[data-testid="alert-status"]')).toContainText('Acknowledged');
      
      await captureBrowserState(page, 'alert-acknowledged');
    });

    test('should trigger automatic interventions for critical health drops', async ({ page }) => {
      // Setup: Login as admin
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);

      // Monitor interventions tab
      await page.click('[data-testid="interventions-tab"]');
      await captureBrowserState(page, 'interventions-tab');

      const initialInterventionCount = await page.textContent('[data-testid="total-interventions"]');

      // Trigger critical health drop
      await simulateHealthScoreDrop(page, 'test-supplier-2');

      // Wait for automatic intervention to be triggered
      await page.waitForTimeout(5000);
      
      // Verify intervention was created
      const updatedInterventionCount = await page.textContent('[data-testid="total-interventions"]');
      expect(parseInt(updatedInterventionCount || '0')).toBeGreaterThan(parseInt(initialInterventionCount || '0'));

      // Check intervention details
      const latestIntervention = page.locator('[data-testid="intervention-item"]').first();
      await expect(latestIntervention).toBeVisible();
      await expect(latestIntervention.locator('[data-testid="intervention-type"]')).toContainText('Critical Health Drop');
      
      await captureBrowserState(page, 'automatic-intervention-triggered');
    });
  });

  test.describe('Health Score Calculation and Display', () => {
    test('should calculate and display accurate health scores', async ({ page }) => {
      // Login as supplier to check their health score
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
      await page.click('[data-testid="login-button"]');
      
      await captureBrowserState(page, 'supplier-login');

      // Navigate to health dashboard
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
      
      // Wait for health score to load
      await waitForHealthScoreUpdate(page);
      await captureBrowserState(page, 'health-score-displayed');

      // Verify health score components are shown
      await expect(page.locator('[data-testid="overall-health-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="onboarding-completion"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-adoption"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-frequency"]')).toBeVisible();

      // Test health score breakdown
      await page.click('[data-testid="show-breakdown"]');
      await expect(page.locator('[data-testid="health-breakdown-modal"]')).toBeVisible();
      
      // Verify all component scores are displayed with proper values
      const components = [
        'onboarding-completion',
        'feature-adoption-breadth',
        'feature-adoption-depth',
        'engagement-frequency',
        'engagement-quality'
      ];

      for (const component of components) {
        const scoreElement = page.locator(`[data-testid="${component}-score"]`);
        await expect(scoreElement).toBeVisible();
        
        const scoreText = await scoreElement.textContent();
        const score = parseInt(scoreText || '0');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }

      await captureBrowserState(page, 'health-score-breakdown');
    });

    test('should show health trends and historical data', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
      
      // Check health trends chart
      await expect(page.locator('[data-testid="health-trends-chart"]')).toBeVisible();
      
      // Test time range selection
      await page.click('[data-testid="time-range-selector"]');
      await page.click('[data-testid="30-days-option"]');
      
      // Wait for chart to update
      await page.waitForTimeout(2000);
      await captureBrowserState(page, 'health-trends-30-days');
      
      // Verify trend data points are displayed
      const trendPoints = await page.locator('[data-testid="trend-point"]').count();
      expect(trendPoints).toBeGreaterThan(0);

      // Test hover functionality on trend chart
      await page.hover('[data-testid="trend-point"]');
      await expect(page.locator('[data-testid="trend-tooltip"]')).toBeVisible();
    });

    test('should display risk factors and recommendations', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
      await waitForHealthScoreUpdate(page);

      // Check risk factors section
      await expect(page.locator('[data-testid="risk-factors-section"]')).toBeVisible();
      
      // Verify recommendations are displayed
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible();
      
      const recommendations = await page.locator('[data-testid="recommendation-item"]').count();
      expect(recommendations).toBeGreaterThanOrEqual(0);

      // Test recommendation interaction
      if (recommendations > 0) {
        const firstRecommendation = page.locator('[data-testid="recommendation-item"]').first();
        await firstRecommendation.click();
        
        await expect(page.locator('[data-testid="recommendation-details"]')).toBeVisible();
        await captureBrowserState(page, 'recommendation-details');
      }
    });
  });

  test.describe('Intervention Notification System', () => {
    test('should send and track intervention notifications', async ({ page }) => {
      // Login as admin
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/interventions`);
      await captureBrowserState(page, 'interventions-dashboard');

      // Manual intervention trigger test
      await page.click('[data-testid="manual-intervention-btn"]');
      await expect(page.locator('[data-testid="intervention-modal"]')).toBeVisible();
      
      // Select supplier and intervention type
      await page.selectOption('[data-testid="supplier-select"]', 'test-supplier-1');
      await page.selectOption('[data-testid="intervention-type"]', 'engagement_reminder');
      await page.click('[data-testid="send-intervention"]');
      
      // Verify intervention was sent
      await expect(page.locator('[data-testid="intervention-success"]')).toBeVisible();
      await captureBrowserState(page, 'manual-intervention-sent');

      // Check notification tracking
      await page.click('[data-testid="notifications-tab"]');
      const latestNotification = page.locator('[data-testid="notification-item"]').first();
      
      await expect(latestNotification).toBeVisible();
      await expect(latestNotification.locator('[data-testid="notification-status"]')).toContainText('Sent');
    });

    test('should handle email tracking events', async ({ page }) => {
      // Login as admin and navigate to notifications
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/notifications`);

      // Simulate email open event via API
      const response = await page.request.put('/api/customer-success/health-interventions', {
        data: {
          event: 'email.opened',
          data: {
            metadata: {
              notificationId: 'test-notification-1'
            },
            timestamp: new Date().toISOString()
          }
        }
      });
      
      expect(response.ok()).toBeTruthy();

      // Refresh page to see updated tracking
      await page.reload();
      
      // Find the notification and check its status
      const notificationRow = page.locator('[data-notification-id="test-notification-1"]');
      await expect(notificationRow.locator('[data-testid="open-status"]')).toContainText('Opened');
      
      await captureBrowserState(page, 'email-tracking-updated');
    });

    test('should batch process interventions efficiently', async ({ page }) => {
      // Login as admin
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);

      // Access batch processing interface
      await page.click('[data-testid="batch-process-btn"]');
      await expect(page.locator('[data-testid="batch-process-modal"]')).toBeVisible();

      // Select multiple suppliers
      await page.check('[data-testid="supplier-checkbox"][data-supplier-id="test-supplier-1"]');
      await page.check('[data-testid="supplier-checkbox"][data-supplier-id="test-supplier-2"]');
      await page.check('[data-testid="supplier-checkbox"][data-supplier-id="test-supplier-3"]');

      await captureBrowserState(page, 'batch-process-selection');

      // Start batch processing
      await page.click('[data-testid="start-batch-process"]');

      // Monitor progress
      await expect(page.locator('[data-testid="batch-progress-bar"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 30000 });
      
      // Verify results
      const processedCount = await page.textContent('[data-testid="processed-count"]');
      const successCount = await page.textContent('[data-testid="success-count"]');
      
      expect(parseInt(processedCount || '0')).toBe(3);
      expect(parseInt(successCount || '0')).toBeGreaterThanOrEqual(2);

      await captureBrowserState(page, 'batch-process-complete');
    });
  });

  test.describe('Responsive Design and Cross-Browser Testing', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should work correctly on ${viewport.name} viewport`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Login process
        await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
        await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
        await page.click('[data-testid="login-button"]');
        
        await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);
        
        // Verify responsive layout
        await expect(page.locator('[data-testid="health-metrics"]')).toBeVisible();
        
        await captureBrowserState(page, `responsive-${viewport.name}`);

        // Test mobile-specific interactions
        if (viewport.name === 'mobile') {
          await page.click('[data-testid="mobile-menu-toggle"]');
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        }

        // Verify all critical elements are accessible
        await expect(page.locator('[data-testid="total-suppliers"]')).toBeVisible();
        await expect(page.locator('[data-testid="average-health-score"]')).toBeVisible();
      });
    }
  });

  test.describe('Performance Testing', () => {
    test('should load health dashboard within performance budget', async ({ page }) => {
      // Start performance monitoring
      await page.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      const startTime = Date.now();
      
      // Login and navigate to dashboard
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);
      
      // Wait for all health metrics to load
      await page.waitForSelector('[data-testid="health-metrics-loaded"]');
      
      const loadTime = Date.now() - startTime;
      
      // Performance assertions
      expect(loadTime).toBeLessThan(5000); // Page should load within 5 seconds
      
      // Check for performance markers
      const performanceMetrics = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('measure'));
      });
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Setup: Create large dataset
      await page.request.post('/api/test/create-large-dataset', {
        data: { supplierCount: 1000, organizationId: TEST_CONFIG.testOrganizationId }
      });

      // Login as admin
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      const startTime = Date.now();
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);
      
      // Wait for health metrics to load
      await page.waitForSelector('[data-testid="health-metrics-loaded"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should handle large datasets within reasonable time
      expect(loadTime).toBeLessThan(10000);
      
      // Verify pagination or virtualization is working
      const supplierList = page.locator('[data-testid="supplier-list-item"]');
      const visibleSuppliers = await supplierList.count();
      
      // Should not load all 1000 suppliers at once
      expect(visibleSuppliers).toBeLessThanOrEqual(50);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('/api/customer-success/health-score', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
      
      // Should display error state gracefully
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      await captureBrowserState(page, 'api-error-handling');
      
      // Test retry functionality
      await page.unroute('/api/customer-success/health-score');
      await page.click('[data-testid="retry-button"]');
      
      // Should recover after retry
      await waitForHealthScoreUpdate(page);
      await expect(page.locator('[data-testid="overall-health-score"]')).toBeVisible();
    });

    test('should handle network disconnection', async ({ page, context }) => {
      // Login first
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);
      
      // Simulate network disconnection
      await context.setOffline(true);
      
      // Try to refresh data
      await page.click('[data-testid="refresh-data"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      await captureBrowserState(page, 'offline-state');
      
      // Reconnect
      await context.setOffline(false);
      
      // Should automatically recover
      await page.waitForSelector('[data-testid="online-indicator"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should validate user permissions correctly', async ({ page }) => {
      // Login as regular supplier (not admin)
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Try to access admin-only routes
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/customer-success`);
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      
      await captureBrowserState(page, 'permission-denied');
      
      // But should be able to access own health dashboard
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
      await waitForHealthScoreUpdate(page);
      await expect(page.locator('[data-testid="overall-health-score"]')).toBeVisible();
    });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Take final screenshot
    await captureBrowserState(page, 'test-complete');
    
    // Clear test data if needed
    await page.request.post('/api/test/cleanup', {
      data: { organizationId: TEST_CONFIG.testOrganizationId }
    });
  });
});

// Test utilities for Browser MCP integration
test.describe('Browser MCP Interactive Testing', () => {
  test('interactive health score calculation verification', async ({ page }) => {
    // This test demonstrates Browser MCP-style interactive testing
    
    // 1. Navigate and capture state
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await captureBrowserState(page, 'initial-state');
    
    // 2. Interactive form testing
    await page.fill('[data-testid="email-input"]', TEST_CONFIG.supplierUser.email);
    await page.fill('[data-testid="password-input"]', TEST_CONFIG.supplierUser.password);
    await page.click('[data-testid="login-button"]');
    
    // 3. Visual regression testing
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/health`);
    await waitForHealthScoreUpdate(page);
    await captureBrowserState(page, 'health-dashboard-loaded');
    
    // 4. Responsive testing
    const viewports = [375, 768, 1024, 1920];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(1000);
      await captureBrowserState(page, `responsive-${width}px`);
    }
    
    // 5. Console and network monitoring
    const logs: any[] = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    
    // Trigger health score recalculation
    await page.click('[data-testid="recalculate-health"]');
    await waitForHealthScoreUpdate(page);
    
    // Check for console errors
    const errors = logs.filter(log => log.type === 'error');
    expect(errors.length).toBe(0);
    
    // 6. Multi-tab testing
    const newPage = await page.context().newPage();
    await newPage.goto(`${TEST_CONFIG.baseUrl}/dashboard/settings`);
    await captureBrowserState(newPage, 'settings-page');
    
    // Switch back to health dashboard
    await page.bringToFront();
    await expect(page.locator('[data-testid="overall-health-score"]')).toBeVisible();
    
    await newPage.close();
  });
});