// WS-230 Enhanced Viral Coefficient Tracking System
// E2E Tests for Enhanced Viral Dashboard using Playwright MCP

import { test, expect } from '@playwright/test';

test.describe('WS-230 Enhanced Viral Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'admin-test-user',
            role: 'admin',
            email: 'admin@wedsync.com',
          },
          expires: '2025-12-31T23:59:59.999Z',
        },
      });
    });

    // Mock viral metrics API responses
    await page.route('/api/admin/viral-metrics', async (route) => {
      await route.fulfill({
        json: {
          enhanced: {
            coefficient: 1.24,
            adjustedCoefficient: 1.48,
            sustainableCoefficient: 1.12,
            invitationRate: 0.72,
            acceptanceRate: 0.68,
            activationRate: 0.84,
            avgInvitesPerUser: 3.2,
            qualityScore: 0.89,
            timeToInvite: 4.5,
            viralCycleTime: 12.3,
            velocityTrend: 'accelerating',
            weddingSeasonMultiplier: 1.4,
            loops: [
              {
                type: 'supplier_to_couple',
                count: 450,
                conversionRate: 0.74,
                avgCycleTime: 8.2,
                revenue: 12500,
                quality: 0.86,
                amplification: 2.1,
              },
              {
                type: 'couple_to_supplier',
                count: 280,
                conversionRate: 0.62,
                avgCycleTime: 15.7,
                revenue: 8900,
                quality: 0.79,
                amplification: 1.8,
              },
            ],
            vendorTypeBreakdown: [
              { type: 'photographer', coefficient: 1.6, count: 180 },
              { type: 'venue', coefficient: 1.8, count: 95 },
              { type: 'florist', coefficient: 1.2, count: 125 },
            ],
          },
          historical: [
            { date: '2024-01-01', coefficient: 0.89 },
            { date: '2024-02-01', coefficient: 1.02 },
            { date: '2024-03-01', coefficient: 1.18 },
            { date: '2024-04-01', coefficient: 1.24 },
          ],
          seasonal: {
            current: 'peak',
            multiplier: 1.4,
            forecast: [
              { month: 'May', predicted: 1.52 },
              { month: 'June', predicted: 1.68 },
              { month: 'July', predicted: 1.71 },
            ],
          },
        },
      });
    });

    // Mock bottlenecks API
    await page.route('/api/admin/viral-metrics/bottlenecks', async (route) => {
      await route.fulfill({
        json: {
          bottlenecks: [
            {
              type: 'INVITE_ACCEPTANCE',
              severity: 'MEDIUM',
              impact: 0.15,
              currentRate: 0.68,
              targetRate: 0.75,
              recommendation: 'Improve invite messaging and timing',
            },
          ],
          recommendations: [
            'Personalize invite messages based on vendor type',
            'Send follow-up invites after 3 days',
            'Implement invite preview feature',
          ],
        },
      });
    });

    // Mock simulation API
    await page.route('/api/admin/viral-metrics/simulate', async (route) => {
      const request = await route.request().postDataJSON();
      await route.fulfill({
        json: {
          currentCoefficient: 1.24,
          projectedCoefficient: 1.45,
          userGrowthImpact: 2100,
          revenueImpact: 125000,
          confidence: 0.82,
          breakEvenDays: 45,
          intervention: request.intervention,
          risks: ['Implementation timeline risk', 'User adoption uncertainty'],
          assumptions: ['Seasonal patterns continue', 'No competitor launches'],
        },
      });
    });
  });

  test('should load enhanced viral dashboard with all key metrics', async ({
    page,
  }) => {
    await page.goto('/admin/viral-metrics');

    // Verify page loads
    await expect(page).toHaveTitle(/Viral Metrics Dashboard/);

    // Verify main viral coefficient display
    await expect(
      page.locator('[data-testid="current-coefficient"]'),
    ).toContainText('1.24');
    await expect(
      page.locator('[data-testid="adjusted-coefficient"]'),
    ).toContainText('1.48');
    await expect(
      page.locator('[data-testid="sustainable-coefficient"]'),
    ).toContainText('1.12');

    // Verify seasonal adjustment indicator
    await expect(
      page.locator('[data-testid="season-indicator"]'),
    ).toContainText('Peak Season');
    await expect(
      page.locator('[data-testid="season-multiplier"]'),
    ).toContainText('1.4x');

    // Verify trend indicator
    await expect(page.locator('[data-testid="velocity-trend"]')).toContainText(
      'accelerating',
    );

    // Take screenshot for visual validation
    await page.screenshot({
      path: 'test-results/ws-230-viral-dashboard-overview.png',
      fullPage: true,
    });
  });

  test('should display viral loops Sankey diagram correctly', async ({
    page,
  }) => {
    await page.goto('/admin/viral-metrics');

    // Switch to loops view
    await page.click('[data-testid="viral-loops-tab"]');

    // Wait for Sankey diagram to load
    await page.waitForSelector('[data-testid="sankey-diagram"]');

    // Verify loop types are displayed
    await expect(
      page.locator('[data-testid="loop-type-supplier-to-couple"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="loop-type-couple-to-supplier"]'),
    ).toBeVisible();

    // Verify loop metrics
    await expect(
      page.locator('[data-testid="supplier-to-couple-count"]'),
    ).toContainText('450');
    await expect(
      page.locator('[data-testid="supplier-to-couple-conversion"]'),
    ).toContainText('74%');
    await expect(
      page.locator('[data-testid="supplier-to-couple-revenue"]'),
    ).toContainText('£12,500');

    // Hover over loop to see details
    await page.hover('[data-testid="loop-type-supplier-to-couple"]');
    await expect(page.locator('[data-testid="loop-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="loop-tooltip"]')).toContainText(
      '8.2 days avg cycle time',
    );

    // Take screenshot of Sankey diagram
    await page.screenshot({
      path: 'test-results/ws-230-viral-loops-sankey.png',
      clip: { x: 0, y: 0, width: 1200, height: 600 },
    });
  });

  test('should show vendor type performance heatmap', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Switch to vendor analysis tab
    await page.click('[data-testid="vendor-analysis-tab"]');

    // Wait for heatmap to load
    await page.waitForSelector('[data-testid="vendor-heatmap"]');

    // Verify vendor types are displayed
    await expect(
      page.locator('[data-testid="vendor-photographer"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="vendor-venue"]')).toBeVisible();
    await expect(page.locator('[data-testid="vendor-florist"]')).toBeVisible();

    // Verify photographer metrics (highest coefficient)
    await expect(
      page.locator('[data-testid="photographer-coefficient"]'),
    ).toContainText('1.6');
    await expect(
      page.locator('[data-testid="photographer-count"]'),
    ).toContainText('180');

    // Verify venue metrics (highest coefficient)
    await expect(
      page.locator('[data-testid="venue-coefficient"]'),
    ).toContainText('1.8');
    await expect(page.locator('[data-testid="venue-count"]')).toContainText(
      '95',
    );

    // Click on photographer segment to see details
    await page.click('[data-testid="vendor-photographer"]');
    await expect(
      page.locator('[data-testid="vendor-details-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="vendor-details-title"]'),
    ).toContainText('Photographer');

    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(
      page.locator('[data-testid="vendor-details-modal"]'),
    ).not.toBeVisible();
  });

  test('should identify and display viral bottlenecks', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Switch to bottlenecks tab
    await page.click('[data-testid="bottlenecks-tab"]');

    // Wait for bottlenecks analysis to load
    await page.waitForSelector('[data-testid="bottlenecks-analysis"]');

    // Verify bottleneck is displayed
    await expect(
      page.locator('[data-testid="bottleneck-invite-acceptance"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="bottleneck-severity-medium"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="bottleneck-impact"]'),
    ).toContainText('15%');

    // Verify improvement metrics
    await expect(page.locator('[data-testid="current-rate"]')).toContainText(
      '68%',
    );
    await expect(page.locator('[data-testid="target-rate"]')).toContainText(
      '75%',
    );

    // Verify recommendations are displayed
    await expect(
      page.locator('[data-testid="recommendations-list"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="recommendation-0"]'),
    ).toContainText('Personalize invite messages');
    await expect(
      page.locator('[data-testid="recommendation-1"]'),
    ).toContainText('Send follow-up invites');
    await expect(
      page.locator('[data-testid="recommendation-2"]'),
    ).toContainText('Implement invite preview');

    // Take screenshot of bottlenecks analysis
    await page.screenshot({
      path: 'test-results/ws-230-bottlenecks-analysis.png',
      clip: { x: 0, y: 200, width: 1200, height: 800 },
    });
  });

  test('should run viral intervention simulation', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Switch to simulation tab
    await page.click('[data-testid="simulation-tab"]');

    // Wait for simulation interface to load
    await page.waitForSelector('[data-testid="simulation-interface"]');

    // Select intervention type
    await page.selectOption(
      '[data-testid="intervention-type-select"]',
      'ENGAGEMENT_BOOST',
    );

    // Fill in intervention details
    await page.fill(
      '[data-testid="intervention-name"]',
      'Test Photo Gallery Showcase',
    );
    await page.fill('[data-testid="expected-improvement"]', '25');
    await page.fill('[data-testid="implementation-cost"]', '5000');
    await page.fill('[data-testid="duration"]', '90');

    // Select target segment
    await page.selectOption(
      '[data-testid="target-segment-select"]',
      'photographers',
    );

    // Run simulation
    await page.click('[data-testid="run-simulation-btn"]');

    // Wait for simulation results
    await page.waitForSelector('[data-testid="simulation-results"]');

    // Verify simulation results
    await expect(
      page.locator('[data-testid="current-coefficient-result"]'),
    ).toContainText('1.24');
    await expect(
      page.locator('[data-testid="projected-coefficient-result"]'),
    ).toContainText('1.45');
    await expect(
      page.locator('[data-testid="user-growth-impact"]'),
    ).toContainText('2,100');
    await expect(page.locator('[data-testid="revenue-impact"]')).toContainText(
      '£125,000',
    );
    await expect(page.locator('[data-testid="roi-percentage"]')).toContainText(
      '2,400%',
    ); // (125000-5000)/5000*100
    await expect(page.locator('[data-testid="break-even-days"]')).toContainText(
      '45 days',
    );
    await expect(
      page.locator('[data-testid="confidence-score"]'),
    ).toContainText('82%');

    // Verify risks and assumptions are displayed
    await expect(page.locator('[data-testid="risks-section"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="assumptions-section"]'),
    ).toBeVisible();

    // Take screenshot of simulation results
    await page.screenshot({
      path: 'test-results/ws-230-simulation-results.png',
      clip: { x: 0, y: 300, width: 1200, height: 700 },
    });
  });

  test('should handle real-time metric updates', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Verify initial coefficient
    await expect(
      page.locator('[data-testid="current-coefficient"]'),
    ).toContainText('1.24');

    // Simulate real-time update by intercepting and updating the API response
    await page.route('/api/admin/viral-metrics', async (route) => {
      await route.fulfill({
        json: {
          enhanced: {
            coefficient: 1.28, // Updated value
            adjustedCoefficient: 1.52,
            sustainableCoefficient: 1.16,
            invitationRate: 0.74,
            acceptanceRate: 0.7,
            activationRate: 0.86,
            avgInvitesPerUser: 3.4,
            qualityScore: 0.91,
            timeToInvite: 4.2,
            viralCycleTime: 11.8,
            velocityTrend: 'accelerating',
            weddingSeasonMultiplier: 1.4,
            loops: [],
            vendorTypeBreakdown: [],
          },
          historical: [],
          seasonal: {},
        },
      });
    });

    // Trigger refresh (simulate real-time update)
    await page.click('[data-testid="refresh-metrics-btn"]');

    // Verify updated coefficient
    await expect(
      page.locator('[data-testid="current-coefficient"]'),
    ).toContainText('1.28');
    await expect(
      page.locator('[data-testid="adjusted-coefficient"]'),
    ).toContainText('1.52');

    // Verify update notification appears
    await expect(
      page.locator('[data-testid="update-notification"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="update-notification"]'),
    ).toContainText('Metrics updated');
  });

  test('should export viral metrics data', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Wait for data to load
    await page.waitForSelector('[data-testid="current-coefficient"]');

    // Start download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('[data-testid="export-metrics-btn"]');

    // Select export format
    await page.click('[data-testid="export-format-csv"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('viral-metrics');
    expect(download.suggestedFilename()).toContain('.csv');

    // Save the download for verification
    await download.saveAs('test-results/ws-230-exported-metrics.csv');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/admin/viral-metrics', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal server error' },
      });
    });

    await page.goto('/admin/viral-metrics');

    // Verify error state is displayed
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Unable to load viral metrics',
    );

    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();

    // Mock successful response for retry
    await page.route('/api/admin/viral-metrics', async (route) => {
      await route.fulfill({
        json: {
          enhanced: {
            coefficient: 1.24,
            adjustedCoefficient: 1.48,
            loops: [],
            vendorTypeBreakdown: [],
          },
          historical: [],
          seasonal: {},
        },
      });
    });

    // Click retry
    await page.click('[data-testid="retry-btn"]');

    // Verify successful load after retry
    await expect(
      page.locator('[data-testid="current-coefficient"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/viral-metrics');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="desktop-sidebar"]'),
    ).not.toBeVisible();

    // Verify coefficient cards stack vertically
    const coefficientCards = page.locator('[data-testid^="coefficient-card-"]');
    const firstCardBounds = await coefficientCards.first().boundingBox();
    const secondCardBounds = await coefficientCards.nth(1).boundingBox();

    if (firstCardBounds && secondCardBounds) {
      // Second card should be below first card (vertical stacking)
      expect(secondCardBounds.y).toBeGreaterThan(
        firstCardBounds.y + firstCardBounds.height - 10,
      );
    }

    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(
      page.locator('[data-testid="mobile-nav-dropdown"]'),
    ).toBeVisible();

    await page.click('[data-testid="mobile-nav-bottlenecks"]');
    await expect(
      page.locator('[data-testid="bottlenecks-analysis"]'),
    ).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({
      path: 'test-results/ws-230-mobile-view.png',
      fullPage: true,
    });
  });

  test('should maintain performance under load', async ({ page }) => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        loadStart: performance.now(),
      };
    });

    await page.goto('/admin/viral-metrics');

    // Wait for all critical content to load
    await page.waitForSelector('[data-testid="current-coefficient"]');
    await page.waitForSelector('[data-testid="viral-loops-tab"]');
    await page.waitForSelector('[data-testid="vendor-analysis-tab"]');

    // Measure load time
    const loadTime = await page.evaluate(() => {
      return performance.now() - window.performanceMetrics.loadStart;
    });

    // Verify performance requirements (under 3 seconds)
    expect(loadTime).toBeLessThan(3000);

    // Test rapid tab switching (stress test)
    const tabs = [
      'viral-loops-tab',
      'vendor-analysis-tab',
      'bottlenecks-tab',
      'simulation-tab',
    ];

    const switchStart = await page.evaluate(() => performance.now());

    for (let i = 0; i < 10; i++) {
      for (const tab of tabs) {
        await page.click(`[data-testid="${tab}"]`);
        await page.waitForTimeout(100); // Brief pause
      }
    }

    const switchEnd = await page.evaluate(() => performance.now());
    const switchTime = switchEnd - switchStart;

    // Verify tab switching performance (should handle 40 switches in under 5 seconds)
    expect(switchTime).toBeLessThan(5000);

    console.log(`Performance metrics:
      - Initial load time: ${loadTime.toFixed(2)}ms
      - Tab switching time (40 switches): ${switchTime.toFixed(2)}ms
      - Average switch time: ${(switchTime / 40).toFixed(2)}ms`);
  });

  test('should validate data accuracy and consistency', async ({ page }) => {
    await page.goto('/admin/viral-metrics');

    // Extract displayed metrics
    const currentCoefficient = await page
      .locator('[data-testid="current-coefficient"]')
      .textContent();
    const adjustedCoefficient = await page
      .locator('[data-testid="adjusted-coefficient"]')
      .textContent();
    const seasonalMultiplier = await page
      .locator('[data-testid="season-multiplier"]')
      .textContent();

    // Verify mathematical relationships
    const current = parseFloat(
      currentCoefficient?.replace(/[^\d.]/g, '') || '0',
    );
    const adjusted = parseFloat(
      adjustedCoefficient?.replace(/[^\d.]/g, '') || '0',
    );
    const multiplier = parseFloat(
      seasonalMultiplier?.replace(/[^\d.]/g, '') || '0',
    );

    // Verify seasonal adjustment is applied correctly
    // Note: This is a simplified check - actual calculation may be more complex
    expect(adjusted).toBeGreaterThan(current);
    expect(multiplier).toBe(1.4); // Peak season multiplier

    // Switch to loops tab to verify consistency
    await page.click('[data-testid="viral-loops-tab"]');

    const totalLoopRevenue = await page.evaluate(() => {
      const revenueElements = document.querySelectorAll(
        '[data-testid*="loop-revenue"]',
      );
      let total = 0;
      revenueElements.forEach((el) => {
        const revenue = parseFloat(el.textContent?.replace(/[£,]/g, '') || '0');
        total += revenue;
      });
      return total;
    });

    // Verify total revenue is reasonable (should be > 0)
    expect(totalLoopRevenue).toBeGreaterThan(0);

    console.log(`Data validation results:
      - Current coefficient: ${current}
      - Adjusted coefficient: ${adjusted}
      - Seasonal multiplier: ${multiplier}
      - Total loop revenue: £${totalLoopRevenue}`);
  });
});
