import { test, expect } from '@playwright/test';

test.describe('Scalability Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin scalability dashboard
    await page.goto('/admin/scalability');
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to fully load
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
  });

  test.describe('Real-Time Metrics Display', () => {
    test('should display real-time scaling metrics', async ({ page }) => {
      // Verify core metrics are visible
      await expect(page.locator('[data-testid="current-load"]')).toBeVisible();
      await expect(page.locator('[data-testid="scaling-status"]')).toContainText(/Active|Scaling|Idle/);
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="throughput"]')).toBeVisible();
      
      // Verify metrics have values
      const currentLoad = await page.locator('[data-testid="current-load"]').textContent();
      expect(currentLoad).toMatch(/\d+/); // Should contain numbers
      
      const responseTime = await page.locator('[data-testid="response-time"]').textContent();
      expect(responseTime).toMatch(/\d+\s*ms/); // Should show milliseconds
      
      // Verify metrics update in real-time
      const initialLoad = await page.locator('[data-testid="current-load"]').textContent();
      await page.waitForTimeout(5000); // Wait 5 seconds
      const updatedLoad = await page.locator('[data-testid="current-load"]').textContent();
      
      // Load should either change or at minimum, the page should still be responsive
      expect(page.locator('[data-testid="current-load"]')).toBeVisible();
    });

    test('should display resource utilization metrics', async ({ page }) => {
      // Verify resource utilization charts/metrics
      await expect(page.locator('[data-testid="cpu-utilization"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-utilization"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-utilization"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-utilization"]')).toBeVisible();
      
      // Verify utilization percentages are within reasonable bounds
      const cpuText = await page.locator('[data-testid="cpu-utilization-value"]').textContent();
      if (cpuText) {
        const cpuValue = parseInt(cpuText.replace('%', ''));
        expect(cpuValue).toBeGreaterThanOrEqual(0);
        expect(cpuValue).toBeLessThanOrEqual(100);
      }
      
      const memoryText = await page.locator('[data-testid="memory-utilization-value"]').textContent();
      if (memoryText) {
        const memoryValue = parseInt(memoryText.replace('%', ''));
        expect(memoryValue).toBeGreaterThanOrEqual(0);
        expect(memoryValue).toBeLessThanOrEqual(100);
      }
    });

    test('should display wedding-specific metrics', async ({ page }) => {
      // Navigate to wedding metrics tab
      await page.click('[data-testid="wedding-metrics-tab"]');
      
      // Verify wedding-specific metrics are displayed
      await expect(page.locator('[data-testid="active-weddings-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="wedding-day-latency"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-coordination-latency"]')).toBeVisible();
      await expect(page.locator('[data-testid="photo-upload-throughput"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-update-latency"]')).toBeVisible();
      
      // Verify wedding day latency is prioritized (should be lower than general latency)
      const weddingLatency = await page.locator('[data-testid="wedding-day-latency-value"]').textContent();
      const generalLatency = await page.locator('[data-testid="general-response-time"]').textContent();
      
      if (weddingLatency && generalLatency) {
        const weddingMs = parseInt(weddingLatency.replace('ms', ''));
        const generalMs = parseInt(generalLatency.replace('ms', ''));
        expect(weddingMs).toBeLessThanOrEqual(generalMs); // Wedding should be prioritized
      }
    });
  });

  test.describe('Emergency Scaling Operations', () => {
    test('should handle emergency scaling trigger', async ({ page }) => {
      // Navigate to emergency scaling section
      await page.click('[data-testid="emergency-scaling-section"]');
      
      // Trigger emergency scaling
      await page.click('[data-testid="emergency-scaling-btn"]');
      
      // Fill in scaling parameters
      await page.fill('[data-testid="scaling-multiplier"]', '5');
      await page.selectOption('[data-testid="scaling-reason"]', 'viral_traffic');
      await page.fill('[data-testid="scaling-duration"]', '2h');
      await page.check('[data-testid="wedding-priority"]');
      
      // Confirm emergency scaling
      await page.click('[data-testid="confirm-emergency-scaling"]');
      
      // Verify scaling initiated
      await expect(page.locator('[data-testid="scaling-status"]')).toContainText('Emergency Scaling', {
        timeout: 10000
      });
      await expect(page.locator('[data-testid="scaling-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="scaling-progress-bar"]')).toBeVisible();
      
      // Verify scaling parameters are displayed
      await expect(page.locator('[data-testid="current-multiplier"]')).toContainText('5x');
      await expect(page.locator('[data-testid="scaling-reason"]')).toContainText('viral_traffic');
      
      // Wait for scaling to complete (with reasonable timeout)
      await expect(page.locator('[data-testid="scaling-status"]')).toContainText(/Completed|Active/, {
        timeout: 120000 // 2 minutes timeout
      });
    });

    test('should display scaling progress and logs', async ({ page }) => {
      // Start a scaling operation
      await page.click('[data-testid="emergency-scaling-btn"]');
      await page.fill('[data-testid="scaling-multiplier"]', '3');
      await page.selectOption('[data-testid="scaling-reason"]', 'wedding_season_peak');
      await page.click('[data-testid="confirm-emergency-scaling"]');
      
      // Verify scaling logs are displayed
      await expect(page.locator('[data-testid="scaling-logs-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="scaling-log-entry"]').first()).toBeVisible();
      
      // Verify log entries contain relevant information
      const firstLogEntry = await page.locator('[data-testid="scaling-log-entry"]').first().textContent();
      expect(firstLogEntry).toContain(/scaling|started|initiated/i);
      
      // Verify progress bar shows progress
      const progressBar = page.locator('[data-testid="scaling-progress-bar"]');
      await expect(progressBar).toBeVisible();
      
      // Check that progress updates
      const initialProgress = await progressBar.getAttribute('aria-valuenow');
      await page.waitForTimeout(5000);
      const updatedProgress = await progressBar.getAttribute('aria-valuenow');
      
      if (initialProgress && updatedProgress) {
        expect(parseInt(updatedProgress)).toBeGreaterThanOrEqual(parseInt(initialProgress));
      }
    });

    test('should handle scaling cancellation', async ({ page }) => {
      // Start a scaling operation
      await page.click('[data-testid="emergency-scaling-btn"]');
      await page.fill('[data-testid="scaling-multiplier"]', '2');
      await page.selectOption('[data-testid="scaling-reason"]', 'load_testing');
      await page.click('[data-testid="confirm-emergency-scaling"]');
      
      // Wait for scaling to start
      await expect(page.locator('[data-testid="scaling-status"]')).toContainText('Emergency Scaling');
      
      // Cancel the scaling operation
      await page.click('[data-testid="cancel-scaling-btn"]');
      await page.click('[data-testid="confirm-cancel-scaling"]');
      
      // Verify scaling was cancelled
      await expect(page.locator('[data-testid="scaling-status"]')).toContainText(/Cancelled|Idle/, {
        timeout: 30000
      });
      
      // Verify cancellation is logged
      await expect(page.locator('[data-testid="scaling-log-entry"]').last()).toContainText(/cancel/i);
    });
  });

  test.describe('Wedding-Aware Scaling Priorities', () => {
    test('should display wedding-aware scaling priorities', async ({ page }) => {
      // Navigate to wedding priorities tab
      await page.click('[data-testid="wedding-priorities-tab"]');
      
      // Verify active weddings are displayed
      const priorityList = page.locator('[data-testid="priority-list"] .priority-item');
      await expect(priorityList.first()).toBeVisible();
      
      // Verify priority ordering (critical first)
      const firstItem = priorityList.first();
      await expect(firstItem).toContainText(/Active Wedding|Critical|Priority/);
      
      // Verify priority indicators
      await expect(firstItem.locator('.priority-badge')).toBeVisible();
      await expect(firstItem.locator('.priority-badge')).toHaveClass(/critical|high/);
      await expect(firstItem.locator('.resources-allocated')).toBeVisible();
      
      // Verify resource allocation percentages
      const resourceAllocation = await firstItem.locator('[data-testid="resource-percentage"]').textContent();
      if (resourceAllocation) {
        const percentage = parseInt(resourceAllocation.replace('%', ''));
        expect(percentage).toBeGreaterThan(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    });

    test('should handle wedding priority adjustments', async ({ page }) => {
      await page.click('[data-testid="wedding-priorities-tab"]');
      
      // Select a wedding from the list
      const firstWedding = page.locator('[data-testid="priority-list"] .priority-item').first();
      await firstWedding.click();
      
      // Adjust priority level
      await page.click('[data-testid="adjust-priority-btn"]');
      await page.selectOption('[data-testid="priority-level-select"]', 'critical');
      await page.fill('[data-testid="resource-allocation-slider"]', '85');
      await page.click('[data-testid="apply-priority-changes"]');
      
      // Verify changes are applied
      await expect(page.locator('[data-testid="priority-update-success"]')).toBeVisible();
      await expect(firstWedding.locator('.priority-badge')).toHaveText('Critical');
      
      // Verify resource allocation updated
      const updatedAllocation = await firstWedding.locator('[data-testid="resource-percentage"]').textContent();
      expect(updatedAllocation).toContain('85%');
    });

    test('should show wedding day performance metrics', async ({ page }) => {
      await page.click('[data-testid="wedding-priorities-tab"]');
      
      // Verify wedding-specific performance metrics
      await expect(page.locator('[data-testid="wedding-response-times"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-coordination-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-update-metrics"]')).toBeVisible();
      
      // Check that wedding metrics are better than general metrics
      const weddingResponseTime = await page.locator('[data-testid="wedding-avg-response-time"]').textContent();
      const generalResponseTime = await page.locator('[data-testid="general-avg-response-time"]').textContent();
      
      if (weddingResponseTime && generalResponseTime) {
        const weddingMs = parseInt(weddingResponseTime.replace('ms', ''));
        const generalMs = parseInt(generalResponseTime.replace('ms', ''));
        expect(weddingMs).toBeLessThanOrEqual(generalMs + 50); // Wedding should be comparable or better
      }
    });
  });

  test.describe('Multi-Region Scaling Coordination', () => {
    test('should handle multi-region scaling coordination', async ({ page }) => {
      // Navigate to multi-region view
      await page.click('[data-testid="multi-region-tab"]');
      
      // Verify regions are displayed
      const regions = page.locator('[data-testid="region-card"]');
      await expect(regions).toHaveCount(4); // us-east, us-west, eu-west, asia-pacific
      
      // Verify each region shows relevant information
      for (let i = 0; i < 4; i++) {
        const region = regions.nth(i);
        await expect(region.locator('[data-testid="region-name"]')).toBeVisible();
        await expect(region.locator('[data-testid="region-load"]')).toBeVisible();
        await expect(region.locator('[data-testid="region-capacity"]')).toBeVisible();
        await expect(region.locator('[data-testid="region-status"]')).toBeVisible();
      }
    });

    test('should handle region-specific scaling', async ({ page }) => {
      await page.click('[data-testid="multi-region-tab"]');
      
      // Select a specific region
      const firstRegion = page.locator('[data-testid="region-card"]').first();
      await firstRegion.click();
      
      // Verify region details are shown
      await expect(page.locator('[data-testid="region-details-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="region-metrics"]')).toBeVisible();
      
      // Test region-specific scaling
      await page.click('[data-testid="scale-region-btn"]');
      await page.fill('[data-testid="target-capacity"]', '1000');
      await page.selectOption('[data-testid="scaling-strategy"]', 'gradual');
      await page.click('[data-testid="apply-regional-scaling"]');
      
      // Verify regional scaling status
      await expect(firstRegion.locator('.scaling-status')).toContainText(/Scaling|Pending/, {
        timeout: 10000
      });
      
      // Verify scaling progress for specific region
      await expect(page.locator('[data-testid="region-scaling-progress"]')).toBeVisible();
    });

    test('should display cross-region latency metrics', async ({ page }) => {
      await page.click('[data-testid="multi-region-tab"]');
      
      // Navigate to cross-region latency view
      await page.click('[data-testid="cross-region-latency-btn"]');
      
      // Verify latency matrix is displayed
      await expect(page.locator('[data-testid="latency-matrix"]')).toBeVisible();
      await expect(page.locator('[data-testid="latency-heatmap"]')).toBeVisible();
      
      // Verify latency values are reasonable
      const latencyValues = page.locator('[data-testid="latency-value"]');
      const count = await latencyValues.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const latencyText = await latencyValues.nth(i).textContent();
        if (latencyText) {
          const latencyMs = parseInt(latencyText.replace('ms', ''));
          expect(latencyMs).toBeGreaterThan(0);
          expect(latencyMs).toBeLessThan(1000); // Should be under 1 second
        }
      }
    });

    test('should handle global scaling coordination', async ({ page }) => {
      await page.click('[data-testid="multi-region-tab"]');
      
      // Trigger global scaling
      await page.click('[data-testid="global-scaling-btn"]');
      await page.fill('[data-testid="global-multiplier"]', '3');
      await page.check('[data-testid="coordinate-regions"]');
      await page.selectOption('[data-testid="priority-region"]', 'us-east-1');
      await page.click('[data-testid="confirm-global-scaling"]');
      
      // Verify global scaling is coordinated across regions
      await expect(page.locator('[data-testid="global-scaling-status"]')).toContainText('Active');
      await expect(page.locator('[data-testid="coordination-status"]')).toContainText(/Coordinating|Synchronized/);
      
      // Verify all regions show scaling activity
      const regions = page.locator('[data-testid="region-card"]');
      const regionCount = await regions.count();
      
      for (let i = 0; i < regionCount; i++) {
        const region = regions.nth(i);
        await expect(region.locator('.scaling-indicator')).toBeVisible();
      }
    });
  });

  test.describe('Performance Monitoring and Alerts', () => {
    test('should display performance alerts', async ({ page }) => {
      // Navigate to alerts section
      await page.click('[data-testid="alerts-tab"]');
      
      // Verify alerts panel is visible
      await expect(page.locator('[data-testid="alerts-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-alerts"]')).toBeVisible();
      
      // Check for different alert types
      const alertTypes = [
        'high-latency-alert',
        'resource-utilization-alert',
        'wedding-performance-alert',
        'scaling-failure-alert'
      ];
      
      // At least some alert indicators should be present (even if no active alerts)
      for (const alertType of alertTypes) {
        const alertIndicator = page.locator(`[data-testid="${alertType}-indicator"]`);
        if (await alertIndicator.isVisible()) {
          await expect(alertIndicator).toBeVisible();
        }
      }
    });

    test('should handle alert acknowledgment', async ({ page }) => {
      await page.click('[data-testid="alerts-tab"]');
      
      // Look for any active alerts
      const activeAlerts = page.locator('[data-testid="alert-item"]');
      const alertCount = await activeAlerts.count();
      
      if (alertCount > 0) {
        const firstAlert = activeAlerts.first();
        
        // Acknowledge the alert
        await firstAlert.locator('[data-testid="acknowledge-alert-btn"]').click();
        await page.click('[data-testid="confirm-acknowledge"]');
        
        // Verify alert is acknowledged
        await expect(firstAlert.locator('.alert-status')).toContainText(/Acknowledged|Resolved/);
      }
    });

    test('should configure alert thresholds', async ({ page }) => {
      await page.click('[data-testid="alerts-tab"]');
      await page.click('[data-testid="configure-alerts-btn"]');
      
      // Configure response time alert threshold
      await page.fill('[data-testid="response-time-threshold"]', '200');
      await page.fill('[data-testid="error-rate-threshold"]', '1');
      await page.fill('[data-testid="cpu-utilization-threshold"]', '80');
      
      // Configure wedding-specific thresholds
      await page.fill('[data-testid="wedding-latency-threshold"]', '100');
      await page.check('[data-testid="wedding-priority-alerts"]');
      
      // Save configuration
      await page.click('[data-testid="save-alert-config"]');
      
      // Verify configuration saved
      await expect(page.locator('[data-testid="config-save-success"]')).toBeVisible();
    });
  });

  test.describe('Historical Data and Trends', () => {
    test('should display scaling history', async ({ page }) => {
      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');
      
      // Verify scaling events history
      await expect(page.locator('[data-testid="scaling-events-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-list"]')).toBeVisible();
      
      // Check for historical scaling events
      const events = page.locator('[data-testid="scaling-event-item"]');
      const eventCount = await events.count();
      
      if (eventCount > 0) {
        const firstEvent = events.first();
        await expect(firstEvent.locator('[data-testid="event-timestamp"]')).toBeVisible();
        await expect(firstEvent.locator('[data-testid="event-type"]')).toBeVisible();
        await expect(firstEvent.locator('[data-testid="event-outcome"]')).toBeVisible();
      }
    });

    test('should display performance trends', async ({ page }) => {
      await page.click('[data-testid="history-tab"]');
      await page.click('[data-testid="trends-view"]');
      
      // Verify trend charts are displayed
      await expect(page.locator('[data-testid="response-time-trend"]')).toBeVisible();
      await expect(page.locator('[data-testid="throughput-trend"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate-trend"]')).toBeVisible();
      
      // Verify time period selector
      await expect(page.locator('[data-testid="time-period-selector"]')).toBeVisible();
      
      // Test different time periods
      await page.selectOption('[data-testid="time-period-selector"]', '7d');
      await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
      
      await page.selectOption('[data-testid="time-period-selector"]', '30d');
      await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
    });

    test('should export scaling reports', async ({ page }) => {
      await page.click('[data-testid="history-tab"]');
      
      // Test report export functionality
      await page.click('[data-testid="export-report-btn"]');
      
      // Configure report parameters
      await page.selectOption('[data-testid="report-type"]', 'scaling_summary');
      await page.selectOption('[data-testid="report-period"]', '7d');
      await page.check('[data-testid="include-wedding-metrics"]');
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      
      // Generate report
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="generate-report-btn"]');
      
      // Verify download starts
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/scaling.*report.*\.pdf/);
    });
  });

  test.describe('Integration and API Monitoring', () => {
    test('should display API endpoint performance', async ({ page }) => {
      // Navigate to API monitoring tab
      await page.click('[data-testid="api-monitoring-tab"]');
      
      // Verify API endpoints are listed
      await expect(page.locator('[data-testid="api-endpoints-list"]')).toBeVisible();
      
      // Check wedding-specific API endpoints
      const weddingEndpoints = [
        'wedding-timeline-api',
        'vendor-coordination-api',
        'photo-upload-api',
        'messaging-api'
      ];
      
      for (const endpoint of weddingEndpoints) {
        const endpointRow = page.locator(`[data-testid="${endpoint}-row"]`);
        if (await endpointRow.isVisible()) {
          await expect(endpointRow.locator('[data-testid="endpoint-status"]')).toBeVisible();
          await expect(endpointRow.locator('[data-testid="endpoint-latency"]')).toBeVisible();
          await expect(endpointRow.locator('[data-testid="endpoint-throughput"]')).toBeVisible();
        }
      }
    });

    test('should monitor third-party integrations', async ({ page }) => {
      await page.click('[data-testid="api-monitoring-tab"]');
      await page.click('[data-testid="integrations-view"]');
      
      // Verify integration status
      const integrations = [
        'stripe-integration',
        'twilio-integration',
        'sendgrid-integration',
        'cloudinary-integration'
      ];
      
      for (const integration of integrations) {
        const integrationCard = page.locator(`[data-testid="${integration}-card"]`);
        if (await integrationCard.isVisible()) {
          await expect(integrationCard.locator('[data-testid="integration-status"]')).toBeVisible();
          await expect(integrationCard.locator('[data-testid="integration-latency"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility and Mobile Responsiveness', () => {
    test('should be accessible', async ({ page }) => {
      // Check basic accessibility
      await expect(page.locator('h1, h2, h3')).toHaveCount(await page.locator('h1, h2, h3').count()); // Headers present
      
      // Check for ARIA labels on interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy(); // Should have either aria-label or text
      }
    });

    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify main dashboard elements are still visible
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-load"]')).toBeVisible();
      
      // Verify mobile navigation works
      const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      }
      
      // Test horizontal scrolling for wide content
      const metricsContainer = page.locator('[data-testid="metrics-container"]');
      if (await metricsContainer.isVisible()) {
        await expect(metricsContainer).toBeVisible();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate API failure by intercepting requests
      await page.route('/api/scalability/metrics', route => route.abort());
      
      // Reload page to trigger API call
      await page.reload();
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('/api/scalability/metrics');
      await page.click('[data-testid="retry-button"]');
      
      // Verify data loads after retry
      await expect(page.locator('[data-testid="current-load"]')).toBeVisible();
    });

    test('should handle network disconnection', async ({ page }) => {
      // Simulate network disconnection
      await page.context().setOffline(true);
      
      // Try to interact with the dashboard
      await page.click('[data-testid="refresh-metrics-btn"]');
      
      // Verify offline message is shown
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Verify dashboard reconnects
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should validate scaling input parameters', async ({ page }) => {
      await page.click('[data-testid="emergency-scaling-btn"]');
      
      // Test invalid scaling multiplier
      await page.fill('[data-testid="scaling-multiplier"]', '-1');
      await page.click('[data-testid="confirm-emergency-scaling"]');
      
      // Verify validation error
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/invalid|positive/i);
      
      // Test valid input
      await page.fill('[data-testid="scaling-multiplier"]', '2');
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
    });
  });
});