import { test, expect } from '@playwright/test';

test.describe('Auto-Scaling Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auto-scaling testing interface
    await page.goto('/admin/scalability/testing');
    await page.waitForLoadState('networkidle');
    
    // Ensure testing interface is loaded
    await expect(page.locator('[data-testid="scaling-test-interface"]')).toBeVisible();
  });

  test.describe('Traffic Spike Simulation', () => {
    test('should automatically scale up during traffic spike simulation', async ({ page }) => {
      // Start traffic spike simulation
      await page.click('[data-testid="simulate-traffic-spike"]');
      
      // Configure viral wedding traffic scenario
      await page.selectOption('[data-testid="spike-type"]', 'viral_wedding');
      await page.fill('[data-testid="spike-multiplier"]', '8');
      await page.fill('[data-testid="spike-duration"]', '2h');
      await page.selectOption('[data-testid="traffic-pattern"]', 'exponential_growth');
      await page.check('[data-testid="enable-auto-scaling"]');
      
      // Set realistic traffic parameters
      await page.fill('[data-testid="baseline-users"]', '10000');
      await page.fill('[data-testid="peak-users"]', '80000');
      await page.selectOption('[data-testid="geographic-distribution"]', 'global');
      
      // Start simulation
      await page.click('[data-testid="start-simulation"]');
      
      // Verify simulation is running
      await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Running', {
        timeout: 10000
      });
      
      // Monitor auto-scaling response
      await expect(page.locator('[data-testid="auto-scaling-triggered"]')).toBeVisible({
        timeout: 30000 // Auto-scaling should trigger within 30 seconds
      });
      
      // Verify scaling metrics during simulation
      const responseTime = await page.locator('[data-testid="current-response-time"]').textContent();
      if (responseTime) {
        const responseMs = parseInt(responseTime.replace('ms', ''));
        expect(responseMs).toBeLessThan(200); // Should maintain <200ms response time
      }
      
      // Verify capacity increased
      const currentCapacity = await page.locator('[data-testid="current-capacity"]').textContent();
      if (currentCapacity) {
        const capacity = parseInt(currentCapacity.replace(/,/g, ''));
        expect(capacity).toBeGreaterThan(10000); // Should be higher than baseline
      }
      
      // Verify auto-scaling effectiveness
      await expect(page.locator('[data-testid="scaling-effectiveness"]')).toBeVisible();
      const effectiveness = await page.locator('[data-testid="effectiveness-percentage"]').textContent();
      if (effectiveness) {
        const effectivenessPercent = parseInt(effectiveness.replace('%', ''));
        expect(effectivenessPercent).toBeGreaterThan(80); // >80% effectiveness
      }
    });

    test('should handle celebrity wedding viral scenario', async ({ page }) => {
      // Configure extreme viral scenario
      await page.click('[data-testid="simulate-traffic-spike"]');
      await page.selectOption('[data-testid="spike-type"]', 'celebrity_wedding');
      await page.fill('[data-testid="spike-multiplier"]', '25'); // Extreme multiplier
      await page.fill('[data-testid="viral-coefficient"]', '15.7');
      await page.selectOption('[data-testid="social-platforms"]', 'all_platforms');
      
      // Configure high-priority scaling
      await page.check('[data-testid="high-priority-scaling"]');
      await page.fill('[data-testid="scaling-budget"]', '50000'); // $50k budget
      await page.selectOption('[data-testid="scaling-strategy"]', 'aggressive');
      
      // Start extreme simulation
      await page.click('[data-testid="start-simulation"]');
      
      // Verify rapid scaling response
      await expect(page.locator('[data-testid="rapid-scaling-active"]')).toBeVisible({
        timeout: 15000 // Should trigger rapid scaling quickly
      });
      
      // Monitor performance under extreme load
      const errorRate = await page.locator('[data-testid="current-error-rate"]').textContent();
      if (errorRate) {
        const errorPercent = parseFloat(errorRate.replace('%', ''));
        expect(errorPercent).toBeLessThan(5); // Should maintain <5% error rate
      }
      
      // Verify cost management
      const scalingCost = await page.locator('[data-testid="scaling-cost"]').textContent();
      if (scalingCost) {
        const cost = parseInt(scalingCost.replace(/[$,]/g, ''));
        expect(cost).toBeLessThan(50000); // Should stay within budget
      }
    });

    test('should simulate wedding season peak load', async ({ page }) => {
      // Configure wedding season scenario
      await page.click('[data-testid="simulate-traffic-spike"]');
      await page.selectOption('[data-testid="spike-type"]', 'wedding_season_peak');
      await page.fill('[data-testid="spike-multiplier"]', '6');
      await page.fill('[data-testid="sustained-duration"]', '8h'); // Full day peak
      
      // Configure seasonal parameters
      await page.selectOption('[data-testid="season-intensity"]', 'peak');
      await page.fill('[data-testid="simultaneous-weddings"]', '2500');
      await page.check('[data-testid="weekend-traffic"]');
      
      // Start seasonal simulation
      await page.click('[data-testid="start-simulation"]');
      
      // Verify sustained scaling
      await expect(page.locator('[data-testid="sustained-scaling-active"]')).toBeVisible();
      
      // Check resource optimization during sustained load
      const cpuUtilization = await page.locator('[data-testid="cpu-utilization-percent"]').textContent();
      if (cpuUtilization) {
        const cpuPercent = parseInt(cpuUtilization.replace('%', ''));
        expect(cpuPercent).toBeLessThan(80); // Should optimize CPU usage
      }
      
      // Verify wedding operations remain prioritized
      const weddingLatency = await page.locator('[data-testid="wedding-operation-latency"]').textContent();
      if (weddingLatency) {
        const latencyMs = parseInt(weddingLatency.replace('ms', ''));
        expect(latencyMs).toBeLessThan(100); // Wedding operations should stay fast
      }
    });

    test('should handle gradual traffic ramp-up', async ({ page }) => {
      // Configure gradual scaling scenario
      await page.click('[data-testid="simulate-traffic-spike"]');
      await page.selectOption('[data-testid="spike-type"]', 'gradual_increase');
      await page.fill('[data-testid="ramp-duration"]', '1h');
      await page.fill('[data-testid="final-multiplier"]', '4');
      await page.selectOption('[data-testid="ramp-pattern"]', 'linear');
      
      // Start gradual simulation
      await page.click('[data-testid="start-simulation"]');
      
      // Verify predictive scaling activates
      await expect(page.locator('[data-testid="predictive-scaling-active"]')).toBeVisible();
      
      // Check that scaling stays ahead of demand
      const capacityBuffer = await page.locator('[data-testid="capacity-buffer"]').textContent();
      if (capacityBuffer) {
        const bufferPercent = parseInt(capacityBuffer.replace('%', ''));
        expect(bufferPercent).toBeGreaterThan(10); // Should maintain buffer
      }
      
      // Verify cost efficiency during gradual scaling
      const costEfficiency = await page.locator('[data-testid="cost-efficiency"]').textContent();
      if (costEfficiency) {
        const efficiency = parseInt(costEfficiency.replace('%', ''));
        expect(efficiency).toBeGreaterThan(85); // Should be cost efficient
      }
    });
  });

  test.describe('Wedding Day Priority Scenarios', () => {
    test('should maintain wedding day priorities during scaling', async ({ page }) => {
      // Navigate to wedding simulation section
      await page.goto('/admin/scalability/wedding-simulation');
      
      // Create active wedding scenario
      await page.click('[data-testid="create-wedding-scenario"]');
      await page.fill('[data-testid="active-weddings"]', '25');
      await page.selectOption('[data-testid="wedding-phase"]', 'ceremony_day');
      await page.selectOption('[data-testid="coordination-intensity"]', 'high');
      await page.fill('[data-testid="vendors-per-wedding"]', '8');
      
      // Configure priority scaling
      await page.check('[data-testid="wedding-priority-mode"]');
      await page.selectOption('[data-testid="priority-level"]', 'maximum');
      
      // Start wedding simulation
      await page.click('[data-testid="start-wedding-simulation"]');
      
      // Verify wedding priority indicators
      await expect(page.locator('[data-testid="wedding-priority-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="priority-mode-indicator"]')).toContainText('Maximum');
      
      // Add general load to test priority handling
      await page.click('[data-testid="add-general-load"]');
      await page.fill('[data-testid="general-load-amount"]', '5000');
      await page.selectOption('[data-testid="general-traffic-type"]', 'social_media_surge');
      await page.click('[data-testid="apply-load"]');
      
      // Verify wedding traffic gets priority
      const weddingLatency = await page.locator('[data-testid="wedding-avg-latency"]').textContent();
      const generalLatency = await page.locator('[data-testid="general-avg-latency"]').textContent();
      
      if (weddingLatency && generalLatency) {
        const weddingMs = parseInt(weddingLatency.replace('ms', ''));
        const generalMs = parseInt(generalLatency.replace('ms', ''));
        expect(weddingMs).toBeLessThan(generalMs); // Wedding should be prioritized
        expect(weddingMs).toBeLessThan(80); // Wedding latency should be excellent
      }
      
      // Verify resource allocation favors weddings
      const weddingResourcePercent = await page.locator('[data-testid="wedding-resource-allocation"]').textContent();
      if (weddingResourcePercent) {
        const allocation = parseInt(weddingResourcePercent.replace('%', ''));
        expect(allocation).toBeGreaterThan(70); // >70% resources for weddings
      }
    });

    test('should handle emergency wedding day scenarios', async ({ page }) => {
      await page.goto('/admin/scalability/wedding-simulation');
      
      // Create emergency scenario
      await page.click('[data-testid="create-emergency-scenario"]');
      await page.selectOption('[data-testid="emergency-type"]', 'weather_disruption');
      await page.fill('[data-testid="affected-weddings"]', '15');
      await page.selectOption('[data-testid="urgency-level"]', 'critical');
      
      // Configure emergency response
      await page.check('[data-testid="emergency-scaling"]');
      await page.check('[data-testid="vendor-notification"]');
      await page.check('[data-testid="couple-communication"]');
      
      // Trigger emergency scenario
      await page.click('[data-testid="trigger-emergency"]');
      
      // Verify emergency response activation
      await expect(page.locator('[data-testid="emergency-response-active"]')).toBeVisible({
        timeout: 5000
      });
      
      // Check emergency scaling speed
      const emergencyResponseTime = await page.locator('[data-testid="emergency-response-time"]').textContent();
      if (emergencyResponseTime) {
        const responseSeconds = parseInt(emergencyResponseTime.replace('s', ''));
        expect(responseSeconds).toBeLessThan(30); // <30 seconds emergency response
      }
      
      // Verify communication systems activated
      await expect(page.locator('[data-testid="vendor-alerts-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="couple-notifications-sent"]')).toBeVisible();
      
      // Check system performance during emergency
      const systemStability = await page.locator('[data-testid="system-stability"]').textContent();
      expect(systemStability).toMatch(/stable|operational/i);
    });

    test('should coordinate multi-vendor wedding workflows', async ({ page }) => {
      await page.goto('/admin/scalability/wedding-simulation');
      
      // Setup complex multi-vendor scenario
      await page.click('[data-testid="create-multi-vendor-scenario"]');
      await page.fill('[data-testid="wedding-count"]', '40');
      await page.selectOption('[data-testid="vendor-complexity"]', 'high');
      
      // Configure vendor types
      const vendorTypes = ['photographer', 'videographer', 'florist', 'catering', 'dj', 'coordinator'];
      for (const vendor of vendorTypes) {
        await page.check(`[data-testid="vendor-${vendor}"]`);
      }
      
      // Set coordination parameters
      await page.fill('[data-testid="messages-per-minute"]', '500');
      await page.fill('[data-testid="file-uploads-per-minute"]', '200');
      await page.check('[data-testid="real-time-coordination"]');
      
      // Start multi-vendor simulation
      await page.click('[data-testid="start-multi-vendor-simulation"]');
      
      // Verify coordination scaling
      await expect(page.locator('[data-testid="coordination-scaling-active"]')).toBeVisible();
      
      // Check message throughput
      const messageThroughput = await page.locator('[data-testid="message-throughput"]').textContent();
      if (messageThroughput) {
        const throughput = parseInt(messageThroughput.replace('/min', ''));
        expect(throughput).toBeGreaterThan(450); // Should handle 90%+ of target
      }
      
      // Verify file upload performance
      const uploadLatency = await page.locator('[data-testid="upload-latency"]').textContent();
      if (uploadLatency) {
        const latency = parseInt(uploadLatency.replace('ms', ''));
        expect(latency).toBeLessThan(2000); // <2s for file uploads
      }
      
      // Check vendor coordination metrics
      const coordinationScore = await page.locator('[data-testid="coordination-efficiency"]').textContent();
      if (coordinationScore) {
        const score = parseInt(coordinationScore.replace('%', ''));
        expect(score).toBeGreaterThan(90); // High coordination efficiency
      }
    });
  });

  test.describe('Performance Validation During Scaling', () => {
    test('should maintain SLA compliance during auto-scaling', async ({ page }) => {
      // Start comprehensive performance test
      await page.click('[data-testid="performance-validation-test"]');
      
      // Configure SLA requirements
      await page.fill('[data-testid="response-time-sla"]', '150'); // 150ms SLA
      await page.fill('[data-testid="availability-sla"]', '99.9'); // 99.9% availability
      await page.fill('[data-testid="error-rate-sla"]', '0.1'); // 0.1% error rate
      
      // Configure scaling scenario
      await page.selectOption('[data-testid="scaling-pattern"]', 'realistic_mixed');
      await page.fill('[data-testid="test-duration"]', '30min');
      await page.check('[data-testid="include-wedding-traffic"]');
      
      // Start SLA validation test
      await page.click('[data-testid="start-sla-validation"]');
      
      // Monitor SLA compliance in real-time
      await expect(page.locator('[data-testid="sla-monitoring-active"]')).toBeVisible();
      
      // Check response time compliance
      const responseTimeSLA = page.locator('[data-testid="response-time-compliance"]');
      await expect(responseTimeSLA).toBeVisible();
      
      // Wait for some test data
      await page.waitForTimeout(10000);
      
      // Verify SLA metrics
      const currentResponseTime = await page.locator('[data-testid="current-avg-response-time"]').textContent();
      if (currentResponseTime) {
        const responseMs = parseInt(currentResponseTime.replace('ms', ''));
        expect(responseMs).toBeLessThan(150); // Should meet SLA
      }
      
      const currentAvailability = await page.locator('[data-testid="current-availability"]').textContent();
      if (currentAvailability) {
        const availability = parseFloat(currentAvailability.replace('%', ''));
        expect(availability).toBeGreaterThan(99.8); // Should meet availability SLA
      }
    });

    test('should validate database performance during scaling', async ({ page }) => {
      // Navigate to database scaling validation
      await page.click('[data-testid="database-scaling-test"]');
      
      // Configure database load test
      await page.fill('[data-testid="db-concurrent-connections"]', '5000');
      await page.fill('[data-testid="queries-per-second"]', '25000');
      await page.selectOption('[data-testid="query-mix"]', 'wedding_realistic');
      
      // Configure auto-scaling for database
      await page.check('[data-testid="enable-db-scaling"]');
      await page.fill('[data-testid="db-scale-threshold"]', '70'); // Scale at 70% utilization
      
      // Start database scaling test
      await page.click('[data-testid="start-db-scaling-test"]');
      
      // Monitor database performance
      await expect(page.locator('[data-testid="db-performance-monitor"]')).toBeVisible();
      
      // Check database scaling triggers
      const dbUtilization = page.locator('[data-testid="db-utilization"]');
      await expect(dbUtilization).toBeVisible();
      
      // Wait for scaling to potentially trigger
      await page.waitForTimeout(15000);
      
      // Verify database response times
      const dbResponseTime = await page.locator('[data-testid="db-avg-response-time"]').textContent();
      if (dbResponseTime) {
        const responseMs = parseInt(dbResponseTime.replace('ms', ''));
        expect(responseMs).toBeLessThan(50); // Database should be fast
      }
      
      // Check connection pool health
      const connectionPoolHealth = await page.locator('[data-testid="connection-pool-health"]').textContent();
      expect(connectionPoolHealth).toMatch(/healthy|optimal/i);
    });

    test('should validate CDN and asset scaling', async ({ page }) => {
      // Test CDN scaling for wedding photos/assets
      await page.click('[data-testid="cdn-scaling-test"]');
      
      // Configure asset delivery test
      await page.fill('[data-testid="asset-requests-per-second"]', '10000');
      await page.selectOption('[data-testid="asset-types"]', 'wedding_photos');
      await page.fill('[data-testid="asset-size-mb"]', '5'); // 5MB average photo
      await page.selectOption('[data-testid="geographic-regions"]', 'global');
      
      // Enable CDN auto-scaling
      await page.check('[data-testid="enable-cdn-scaling"]');
      await page.check('[data-testid="enable-image-optimization"]');
      
      // Start CDN scaling test
      await page.click('[data-testid="start-cdn-test"]');
      
      // Monitor CDN performance
      await expect(page.locator('[data-testid="cdn-performance-dashboard"]')).toBeVisible();
      
      // Check cache hit rates
      const cacheHitRate = await page.locator('[data-testid="cache-hit-rate"]').textContent();
      if (cacheHitRate) {
        const hitRate = parseInt(cacheHitRate.replace('%', ''));
        expect(hitRate).toBeGreaterThan(85); // Good cache performance
      }
      
      // Verify global delivery performance
      const globalLatency = await page.locator('[data-testid="global-avg-latency"]').textContent();
      if (globalLatency) {
        const latency = parseInt(globalLatency.replace('ms', ''));
        expect(latency).toBeLessThan(200); // Fast global delivery
      }
      
      // Check bandwidth scaling
      const bandwidthUtilization = await page.locator('[data-testid="bandwidth-utilization"]').textContent();
      if (bandwidthUtilization) {
        const utilization = parseInt(bandwidthUtilization.replace('%', ''));
        expect(utilization).toBeLessThan(80); // Should have headroom
      }
    });
  });

  test.describe('Cost Optimization During Scaling', () => {
    test('should optimize costs during auto-scaling events', async ({ page }) => {
      // Navigate to cost optimization testing
      await page.click('[data-testid="cost-optimization-test"]');
      
      // Configure cost-aware scaling
      await page.fill('[data-testid="scaling-budget"]', '5000'); // $5k budget
      await page.selectOption('[data-testid="cost-optimization-level"]', 'aggressive');
      await page.check('[data-testid="enable-spot-instances"]');
      await page.check('[data-testid="enable-reserved-capacity"]');
      
      // Configure scaling scenario with cost constraints
      await page.selectOption('[data-testid="scaling-scenario"]', 'budget_constrained');
      await page.fill('[data-testid="target-multiplier"]', '6');
      await page.fill('[data-testid="duration"]', '4h');
      
      // Start cost optimization test
      await page.click('[data-testid="start-cost-optimization-test"]');
      
      // Monitor cost metrics
      await expect(page.locator('[data-testid="cost-tracking-active"]')).toBeVisible();
      
      // Check cost efficiency
      const currentCost = await page.locator('[data-testid="current-scaling-cost"]').textContent();
      if (currentCost) {
        const cost = parseInt(currentCost.replace(/[$,]/g, ''));
        expect(cost).toBeLessThan(5000); // Should stay within budget
      }
      
      // Verify cost per unit performance
      const costPerUser = await page.locator('[data-testid="cost-per-user"]').textContent();
      if (costPerUser) {
        const costCents = parseFloat(costPerUser.replace('$', ''));
        expect(costCents).toBeLessThan(0.10); // <10 cents per user
      }
      
      // Check optimization recommendations
      await expect(page.locator('[data-testid="cost-optimization-suggestions"]')).toBeVisible();
      const savings = await page.locator('[data-testid="potential-savings"]').textContent();
      if (savings) {
        const savingsPercent = parseInt(savings.replace('%', ''));
        expect(savingsPercent).toBeGreaterThan(10); // >10% potential savings
      }
    });

    test('should balance cost and performance during wedding season', async ({ page }) => {
      await page.click('[data-testid="cost-optimization-test"]');
      
      // Configure wedding season scenario
      await page.selectOption('[data-testid="optimization-scenario"]', 'wedding_season_balanced');
      await page.fill('[data-testid="performance-priority"]', '80'); // 80% performance priority
      await page.fill('[data-testid="cost-priority"]', '20'); // 20% cost priority
      
      // Set wedding-specific constraints
      await page.check('[data-testid="wedding-day-performance-protection"]');
      await page.fill('[data-testid="wedding-sla-override"]', '99.99'); // Stricter for weddings
      
      // Start balanced optimization test
      await page.click('[data-testid="start-balanced-optimization"]');
      
      // Verify performance protection is active
      await expect(page.locator('[data-testid="wedding-performance-protection"]')).toBeVisible();
      
      // Check balanced metrics
      const performanceScore = await page.locator('[data-testid="performance-score"]').textContent();
      const costScore = await page.locator('[data-testid="cost-score"]').textContent();
      
      if (performanceScore && costScore) {
        const perfScore = parseInt(performanceScore);
        const costScoreNum = parseInt(costScore);
        expect(perfScore).toBeGreaterThan(85); // Good performance
        expect(costScoreNum).toBeGreaterThan(70); // Reasonable cost efficiency
      }
      
      // Verify wedding operations aren't compromised
      const weddingLatency = await page.locator('[data-testid="wedding-operation-latency"]').textContent();
      if (weddingLatency) {
        const latency = parseInt(weddingLatency.replace('ms', ''));
        expect(latency).toBeLessThan(100); // Excellent wedding performance
      }
    });
  });

  test.describe('Integration and Monitoring', () => {
    test('should integrate with monitoring and alerting systems', async ({ page }) => {
      // Navigate to monitoring integration test
      await page.click('[data-testid="monitoring-integration-test"]');
      
      // Configure monitoring systems
      await page.check('[data-testid="enable-prometheus-metrics"]');
      await page.check('[data-testid="enable-grafana-dashboards"]');
      await page.check('[data-testid="enable-slack-alerts"]');
      await page.check('[data-testid="enable-pagerduty-escalation"]');
      
      // Set alert thresholds
      await page.fill('[data-testid="response-time-alert-threshold"]', '200');
      await page.fill('[data-testid="error-rate-alert-threshold"]', '1');
      await page.fill('[data-testid="wedding-latency-alert-threshold"]', '100');
      
      // Start monitoring integration test
      await page.click('[data-testid="start-monitoring-test"]');
      
      // Verify monitoring systems are connected
      await expect(page.locator('[data-testid="prometheus-connected"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="grafana-connected"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="alerting-connected"]')).toContainText('Connected');
      
      // Test alert generation
      await page.click('[data-testid="trigger-test-alert"]');
      await page.selectOption('[data-testid="alert-type"]', 'high_latency');
      await page.click('[data-testid="send-test-alert"]');
      
      // Verify alert was sent
      await expect(page.locator('[data-testid="alert-sent-confirmation"]')).toBeVisible();
      
      // Check monitoring data flow
      const metricsFlow = await page.locator('[data-testid="metrics-flow-status"]').textContent();
      expect(metricsFlow).toMatch(/active|flowing|healthy/i);
    });

    test('should validate auto-scaling decision logging', async ({ page }) => {
      // Test scaling decision audit trail
      await page.click('[data-testid="scaling-audit-test"]');
      
      // Configure audit logging
      await page.check('[data-testid="enable-decision-logging"]');
      await page.check('[data-testid="enable-performance-logging"]');
      await page.check('[data-testid="enable-cost-logging"]');
      await page.selectOption('[data-testid="log-level"]', 'detailed');
      
      // Trigger scaling event for logging
      await page.click('[data-testid="trigger-scaling-for-audit"]');
      await page.fill('[data-testid="scaling-multiplier"]', '3');
      await page.selectOption('[data-testid="scaling-reason"]', 'audit_test');
      await page.click('[data-testid="start-scaling"]');
      
      // Wait for scaling decisions
      await page.waitForTimeout(10000);
      
      // Verify audit logs are generated
      await expect(page.locator('[data-testid="scaling-decision-logs"]')).toBeVisible();
      
      // Check log entries
      const logEntries = page.locator('[data-testid="audit-log-entry"]');
      const logCount = await logEntries.count();
      expect(logCount).toBeGreaterThan(0);
      
      // Verify log content
      const firstLog = await logEntries.first().textContent();
      expect(firstLog).toMatch(/scaling|decision|triggered|reason/i);
      
      // Check log structure includes required fields
      await expect(page.locator('[data-testid="log-timestamp"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="log-decision-type"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="log-metrics"]').first()).toBeVisible();
    });

    test('should validate external API integrations during scaling', async ({ page }) => {
      // Test third-party integrations under scaling load
      await page.click('[data-testid="api-integration-test"]');
      
      // Configure external API tests
      await page.check('[data-testid="test-payment-apis"]'); // Stripe
      await page.check('[data-testid="test-communication-apis"]'); // Twilio, SendGrid
      await page.check('[data-testid="test-storage-apis"]'); // Cloudinary
      await page.check('[data-testid="test-analytics-apis"]'); // Custom analytics
      
      // Set integration performance targets
      await page.fill('[data-testid="api-response-time-target"]', '500'); // 500ms for external APIs
      await page.fill('[data-testid="api-success-rate-target"]', '99'); // 99% success rate
      
      // Start integration testing during scaling
      await page.click('[data-testid="start-integration-test"]');
      
      // Monitor API performance
      await expect(page.locator('[data-testid="api-performance-monitor"]')).toBeVisible();
      
      // Check payment API performance
      const paymentApiLatency = await page.locator('[data-testid="payment-api-latency"]').textContent();
      if (paymentApiLatency) {
        const latency = parseInt(paymentApiLatency.replace('ms', ''));
        expect(latency).toBeLessThan(1000); // Payment APIs should be reasonable
      }
      
      // Verify communication APIs
      const communicationApiStatus = await page.locator('[data-testid="communication-api-status"]').textContent();
      expect(communicationApiStatus).toMatch(/healthy|operational/i);
      
      // Check rate limiting compliance
      const rateLimitStatus = await page.locator('[data-testid="rate-limit-compliance"]').textContent();
      expect(rateLimitStatus).toMatch(/compliant|within_limits/i);
    });
  });

  test.describe('Recovery and Rollback Testing', () => {
    test('should handle scaling failure and recovery', async ({ page }) => {
      // Test scaling failure scenarios
      await page.click('[data-testid="scaling-failure-test"]');
      
      // Configure failure scenario
      await page.selectOption('[data-testid="failure-type"]', 'resource_exhaustion');
      await page.fill('[data-testid="failure-trigger-point"]', '5'); // Fail at 5x scaling
      await page.check('[data-testid="enable-automatic-recovery"]');
      
      // Start scaling until failure
      await page.click('[data-testid="start-failure-test"]');
      
      // Wait for failure to occur
      await expect(page.locator('[data-testid="scaling-failure-detected"]')).toBeVisible({
        timeout: 60000
      });
      
      // Verify automatic recovery kicks in
      await expect(page.locator('[data-testid="automatic-recovery-active"]')).toBeVisible({
        timeout: 30000
      });
      
      // Check recovery effectiveness
      const recoveryTime = await page.locator('[data-testid="recovery-time"]').textContent();
      if (recoveryTime) {
        const timeSeconds = parseInt(recoveryTime.replace('s', ''));
        expect(timeSeconds).toBeLessThan(300); // <5 minutes recovery
      }
      
      // Verify system stability after recovery
      const systemStatus = await page.locator('[data-testid="post-recovery-status"]').textContent();
      expect(systemStatus).toMatch(/stable|operational|recovered/i);
    });

    test('should perform emergency scaling rollback', async ({ page }) => {
      // Start scaling operation that will be rolled back
      await page.click('[data-testid="emergency-rollback-test"]');
      
      // Configure scaling operation
      await page.fill('[data-testid="scaling-multiplier"]', '10');
      await page.selectOption('[data-testid="scaling-type"]', 'emergency');
      await page.click('[data-testid="start-scaling-for-rollback"]');
      
      // Wait for scaling to start
      await expect(page.locator('[data-testid="scaling-in-progress"]')).toBeVisible();
      
      // Trigger emergency rollback
      await page.click('[data-testid="emergency-rollback-btn"]');
      await page.selectOption('[data-testid="rollback-reason"]', 'performance_degradation');
      await page.check('[data-testid="force-rollback"]');
      await page.click('[data-testid="confirm-rollback"]');
      
      // Verify rollback execution
      await expect(page.locator('[data-testid="rollback-in-progress"]')).toBeVisible();
      
      // Check rollback completion
      await expect(page.locator('[data-testid="rollback-completed"]')).toBeVisible({
        timeout: 120000 // 2 minutes for rollback
      });
      
      // Verify system returned to baseline
      const currentCapacity = await page.locator('[data-testid="current-capacity"]').textContent();
      const baselineCapacity = await page.locator('[data-testid="baseline-capacity"]').textContent();
      
      if (currentCapacity && baselineCapacity) {
        const current = parseInt(currentCapacity.replace(/,/g, ''));
        const baseline = parseInt(baselineCapacity.replace(/,/g, ''));
        expect(Math.abs(current - baseline)).toBeLessThan(baseline * 0.1); // Within 10% of baseline
      }
      
      // Check that wedding operations weren't impacted
      const weddingImpact = await page.locator('[data-testid="wedding-rollback-impact"]').textContent();
      expect(weddingImpact).toMatch(/minimal|none|protected/i);
    });
  });
});