import { test, expect } from '@playwright/test';

/**
 * WS-057 Round 2: High-Performance Analytics Dashboard Tests
 * Testing the <200ms dashboard update requirement and real-time analytics
 */

test.describe('High-Performance Analytics Dashboard', () => {
  let testEventId: string;
  const PERFORMANCE_THRESHOLD = 200; // ms - strict requirement

  test.beforeEach(async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'vendor@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    testEventId = process.env.TEST_EVENT_ID || 'test-event-id';
  });

  test.describe('Dashboard Performance Requirements', () => {
    test('should load analytics dashboard within 200ms', async ({ page }) => {
      // Navigate to analytics dashboard
      const startTime = Date.now();
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Wait for critical analytics components to load
      await page.waitForSelector('[data-testid="analytics-dashboard-loaded"]');
      const loadTime = Date.now() - startTime;
      
      // Assert strict performance requirement
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      
      // Verify all critical components are present
      await expect(page.locator('[data-testid="response-rate-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="attendance-prediction"]')).toBeVisible();
      await expect(page.locator('[data-testid="real-time-stats"]')).toBeVisible();
    });

    test('should update analytics data within 200ms', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      await page.waitForSelector('[data-testid="analytics-dashboard-loaded"]');
      
      // Get initial data timestamp
      const initialTimestamp = await page.textContent('[data-testid="last-updated"]');
      
      // Trigger refresh
      const startTime = Date.now();
      await page.click('[data-testid="refresh-analytics"]');
      await page.waitForSelector('[data-testid="analytics-updated"]');
      const updateTime = Date.now() - startTime;
      
      // Assert performance requirement
      expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      
      // Verify data was actually updated
      const newTimestamp = await page.textContent('[data-testid="last-updated"]');
      expect(newTimestamp).not.toBe(initialTimestamp);
    });

    test('should handle real-time updates efficiently', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Enable real-time mode
      await page.click('[data-testid="enable-realtime"]');
      await expect(page.locator('[data-testid="realtime-indicator"]')).toBeVisible();
      
      // Simulate data change (e.g., new RSVP response)
      await page.click('[data-testid="simulate-new-response"]');
      
      // Measure real-time update performance
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="realtime-update-received"]');
      const realtimeUpdateTime = Date.now() - startTime;
      
      // Real-time updates should be even faster
      expect(realtimeUpdateTime).toBeLessThan(100); // 100ms for real-time
      
      // Verify the UI updated with new data
      await expect(page.locator('[data-testid="response-count"]')).not.toContainText('0');
    });
  });

  test.describe('Analytics Components & Accuracy', () => {
    test('should display accurate response rate analytics', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Verify response rate calculation
      const totalInvited = await page.textContent('[data-testid="total-invited"]');
      const totalResponded = await page.textContent('[data-testid="total-responded"]');
      const responseRate = await page.textContent('[data-testid="response-rate"]');
      
      // Calculate expected response rate
      const invited = parseInt(totalInvited || '0');
      const responded = parseInt(totalResponded || '0');
      const expectedRate = invited > 0 ? Math.round((responded / invited) * 100) : 0;
      
      // Verify accuracy
      const displayedRate = parseInt(responseRate?.replace('%', '') || '0');
      expect(displayedRate).toBe(expectedRate);
      
      // Verify trend indicators
      await expect(page.locator('[data-testid="response-trend"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-direction"]')).toBeVisible();
    });

    test('should show predictive analytics with confidence scores', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics/predictions`);
      
      // Verify prediction components
      await expect(page.locator('[data-testid="final-attendance-prediction"]')).toBeVisible();
      await expect(page.locator('[data-testid="prediction-confidence"]')).toBeVisible();
      
      // Verify confidence score is valid
      const confidenceText = await page.textContent('[data-testid="prediction-confidence"]');
      const confidence = parseInt(confidenceText?.replace('%', '') || '0');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
      
      // Verify prediction methodology display
      await expect(page.locator('[data-testid="prediction-methodology"]')).toBeVisible();
      
      // Test prediction confidence levels
      if (confidence >= 80) {
        await expect(page.locator('[data-testid="confidence-high"]')).toBeVisible();
      } else if (confidence >= 60) {
        await expect(page.locator('[data-testid="confidence-medium"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="confidence-low"]')).toBeVisible();
      }
    });

    test('should display response pattern analysis', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics/patterns`);
      
      // Verify pattern analysis components
      await expect(page.locator('[data-testid="response-velocity-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="peak-response-times"]')).toBeVisible();
      await expect(page.locator('[data-testid="guest-segment-analysis"]')).toBeVisible();
      
      // Verify velocity metrics
      await expect(page.locator('[data-testid="daily-response-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-acceleration"]')).toBeVisible();
      
      // Test pattern insights
      const insights = await page.locator('[data-testid="pattern-insight"]').all();
      expect(insights.length).toBeGreaterThan(0);
      
      // Verify each insight has meaningful content
      for (const insight of insights) {
        const text = await insight.textContent();
        expect(text?.length || 0).toBeGreaterThan(10);
      }
    });
  });

  test.describe('Visual Analytics & Charts', () => {
    test('should render interactive charts with proper performance', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics/charts`);
      
      // Wait for charts to load
      await page.waitForSelector('[data-testid="charts-loaded"]');
      
      // Verify chart components
      const chartSelectors = [
        '[data-testid="response-timeline-chart"]',
        '[data-testid="guest-type-breakdown"]',
        '[data-testid="rsvp-status-pie-chart"]',
        '[data-testid="weekly-trend-chart"]'
      ];
      
      for (const selector of chartSelectors) {
        await expect(page.locator(selector)).toBeVisible();
        
        // Test chart interactivity
        await page.hover(selector);
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      }
      
      // Test chart responsiveness
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Charts should adapt to mobile view
      await expect(page.locator('[data-testid="mobile-chart-view"]')).toBeVisible();
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Generate large dataset for testing
      await page.click('[data-testid="load-test-data"]');
      await page.selectOption('[data-testid="data-size"]', 'large');
      await page.click('[data-testid="generate-data"]');
      
      // Measure chart rendering with large dataset
      const startTime = Date.now();
      await page.click('[data-testid="render-charts"]');
      await page.waitForSelector('[data-testid="charts-rendered"]');
      const renderTime = Date.now() - startTime;
      
      // Should handle large datasets within reasonable time
      expect(renderTime).toBeLessThan(2000); // 2 seconds for large dataset
      
      // Verify chart pagination/virtualization
      await expect(page.locator('[data-testid="chart-pagination"]')).toBeVisible();
    });
  });

  test.describe('Caching & Performance Optimization', () => {
    test('should utilize caching for repeated requests', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // First load (should cache data)
      const firstLoadStart = Date.now();
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      const firstLoadTime = Date.now() - firstLoadStart;
      
      // Navigate away and return (should use cache)
      await page.goto(`/dashboard/events/${testEventId}`);
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      const cachedLoadStart = Date.now();
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      const cachedLoadTime = Date.now() - cachedLoadStart;
      
      // Cached load should be significantly faster
      expect(cachedLoadTime).toBeLessThan(firstLoadTime * 0.5);
      
      // Verify cache indicator
      await expect(page.locator('[data-testid="cached-data-indicator"]')).toBeVisible();
    });

    test('should invalidate cache when data changes', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      
      // Note initial cache timestamp
      const initialCacheTime = await page.textContent('[data-testid="cache-timestamp"]');
      
      // Simulate data change
      await page.click('[data-testid="simulate-rsvp-response"]');
      await page.waitForSelector('[data-testid="data-changed"]');
      
      // Refresh analytics
      await page.click('[data-testid="refresh-analytics"]');
      await page.waitForSelector('[data-testid="analytics-updated"]');
      
      // Verify cache was invalidated
      const newCacheTime = await page.textContent('[data-testid="cache-timestamp"]');
      expect(newCacheTime).not.toBe(initialCacheTime);
    });
  });

  test.describe('Error Handling & Resilience', () => {
    test('should handle analytics service failures gracefully', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Simulate analytics service failure
      await page.route('**/api/rsvp/analytics**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Analytics service unavailable' })
        });
      });
      
      // Attempt to refresh analytics
      await page.click('[data-testid="refresh-analytics"]');
      
      // Should show graceful error handling
      await expect(page.locator('[data-testid="analytics-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-error"]')).toContainText('Unable to load analytics');
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-analytics"]')).toBeVisible();
    });

    test('should handle partial data loads', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Simulate partial data failure
      await page.route('**/api/rsvp/analytics/predictions**', route => {
        route.fulfill({ status: 404 });
      });
      
      await page.reload();
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      
      // Should show available data
      await expect(page.locator('[data-testid="response-rate-widget"]')).toBeVisible();
      
      // Should indicate missing predictions
      await expect(page.locator('[data-testid="predictions-unavailable"]')).toBeVisible();
      await expect(page.locator('[data-testid="predictions-unavailable"]')).toContainText('Predictions temporarily unavailable');
    });
  });

  test.describe('Mobile Performance', () => {
    test('should maintain performance on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Load analytics on mobile
      const startTime = Date.now();
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      await page.waitForSelector('[data-testid="mobile-analytics-loaded"]');
      const mobileLoadTime = Date.now() - startTime;
      
      // Should meet performance requirements on mobile
      expect(mobileLoadTime).toBeLessThan(PERFORMANCE_THRESHOLD * 1.5); // Allow 50% more time for mobile
      
      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-analytics-layout"]')).toBeVisible();
      
      // Test mobile-specific interactions
      await page.click('[data-testid="mobile-chart-toggle"]');
      await expect(page.locator('[data-testid="mobile-chart-expanded"]')).toBeVisible();
    });
  });

  test.describe('Accessibility & Analytics', () => {
    test('should provide accessible analytics data', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/analytics`);
      
      // Verify screen reader support
      await expect(page.locator('[data-testid="analytics-summary"][role="region"]')).toBeVisible();
      await expect(page.locator('[aria-label="Response rate: "]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();
      
      // Verify alt text for charts
      const chartImages = await page.locator('[data-testid*="chart"] img').all();
      for (const img of chartImages) {
        const altText = await img.getAttribute('alt');
        expect(altText?.length || 0).toBeGreaterThan(10);
      }
    });
  });
});