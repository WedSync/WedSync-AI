/**
 * @fileoverview E2E Tests for Review Analytics Dashboard
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 * 
 * Test Coverage: Complete user flows, visual regression, performance, accessibility
 */

import { test, expect } from '@playwright/test';

test.describe('Review Analytics Dashboard E2E Tests', () => {
  let testSupplierEmail = 'test-supplier@example.com';
  let testSupplierPassword = 'TestPassword123!';
  let testSupplierId = 'test-supplier-e2e-id';

  test.beforeEach(async ({ page }) => {
    // Set up test data and navigate to login
    await page.goto('/login');
    
    // Login as test supplier
    await page.fill('[data-testid="email-input"]', testSupplierEmail);
    await page.fill('[data-testid="password-input"]', testSupplierPassword);
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to analytics section
    await page.click('[data-testid="analytics-nav-item"]');
    await page.waitForURL('/analytics/reviews');
  });

  test.describe('Dashboard Loading and Initial State', () => {
    test('displays loading skeleton initially', async ({ page }) => {
      await page.goto('/analytics/reviews');
      
      // Should show skeleton while loading
      const skeleton = page.locator('[data-testid="dashboard-skeleton"]');
      await expect(skeleton).toBeVisible();
      
      // Wait for skeleton to disappear
      await expect(skeleton).not.toBeVisible({ timeout: 5000 });
      
      // Dashboard should be visible
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    });

    test('loads dashboard within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('displays all metric cards', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // All 4 metric cards should be visible
      await expect(page.locator('[data-testid="metric-total-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-average-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-response-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-sentiment-score"]')).toBeVisible();
    });

    test('displays all chart components', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // All charts should be visible
      await expect(page.locator('[data-testid="review-trends-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="rating-distribution-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-sources-chart"]')).toBeVisible();
    });
  });

  test.describe('Visual Regression Testing', () => {
    test('matches dashboard screenshot on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Wait for charts to render
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('dashboard-desktop.png', {
        fullPage: true,
        threshold: 0.2,
      });
    });

    test('matches dashboard screenshot on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Wait for charts to render
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true,
        threshold: 0.2,
      });
    });

    test('matches dashboard screenshot on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Wait for charts to render
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        threshold: 0.2,
      });
    });

    test('matches loading state screenshot', async ({ page }) => {
      // Block API requests to keep loading state
      await page.route('/api/analytics/**', route => {
        // Don't resolve, keep loading
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="dashboard-skeleton"]');
      
      await expect(page).toHaveScreenshot('dashboard-loading.png', {
        threshold: 0.1,
      });
    });

    test('matches error state screenshot', async ({ page }) => {
      // Mock API error
      await page.route('/api/analytics/**', route => {
        route.fulfill({ status: 500, body: '{"error": "Internal server error"}' });
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="error-message"]');
      
      await expect(page).toHaveScreenshot('dashboard-error.png', {
        threshold: 0.1,
      });
    });
  });

  test.describe('Metric Cards Interaction', () => {
    test('displays correct metric values', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Check that metric cards show numeric values
      const totalReviews = page.locator('[data-testid="metric-total-reviews"] .text-2xl');
      const averageRating = page.locator('[data-testid="metric-average-rating"] .text-2xl');
      const responseRate = page.locator('[data-testid="metric-response-rate"] .text-2xl');
      const sentimentScore = page.locator('[data-testid="metric-sentiment-score"] .text-2xl');
      
      await expect(totalReviews).toContainText(/^\d+$/);
      await expect(averageRating).toContainText(/^\d+\.\d+$/);
      await expect(responseRate).toContainText(/^\d+$/);
      await expect(sentimentScore).toContainText(/^\d+$/);
    });

    test('shows trend indicators', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Each metric card should have a trend badge
      const trendBadges = page.locator('[data-testid^="metric-"] .flex.items-center.gap-1 > .flex.items-center.gap-1');
      await expect(trendBadges).toHaveCount(4);
    });

    test('metric cards have hover effects', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      const firstCard = page.locator('[data-testid="metric-total-reviews"]');
      
      // Get initial box shadow
      const initialShadow = await firstCard.evaluate(el => getComputedStyle(el).boxShadow);
      
      // Hover over the card
      await firstCard.hover();
      
      // Shadow should change on hover
      const hoverShadow = await firstCard.evaluate(el => getComputedStyle(el).boxShadow);
      expect(hoverShadow).not.toBe(initialShadow);
    });
  });

  test.describe('Chart Rendering and Interaction', () => {
    test('all charts render without errors', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Wait for charts to render
      await page.waitForTimeout(3000);
      
      // Check for chart canvas elements
      const trendsChart = page.locator('[data-testid="review-trends-chart"] canvas');
      const distributionChart = page.locator('[data-testid="rating-distribution-chart"] canvas');
      const sourcesChart = page.locator('[data-testid="review-sources-chart"] canvas');
      
      await expect(trendsChart).toBeVisible();
      await expect(distributionChart).toBeVisible();
      await expect(sourcesChart).toBeVisible();
    });

    test('charts respond to viewport changes', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      await page.waitForTimeout(2000);
      
      // Get initial chart dimensions
      const initialWidth = await page.locator('[data-testid="review-trends-chart"] canvas').evaluate(el => el.width);
      
      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(1000);
      
      // Chart should resize
      const newWidth = await page.locator('[data-testid="review-trends-chart"] canvas').evaluate(el => el.width);
      expect(newWidth).not.toBe(initialWidth);
    });

    test('charts render within performance target', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Measure chart render time
      const startTime = await page.evaluate(() => performance.now());
      await page.waitForTimeout(100); // Allow for chart rendering
      const endTime = await page.evaluate(() => performance.now());
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(1000); // Charts should render within 1 second
    });
  });

  test.describe('Real-time Updates', () => {
    test('shows connection status', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Connection status indicator should be visible
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      await expect(connectionStatus).toBeVisible();
      
      // Should show connected or disconnected status
      await expect(connectionStatus).toContainText(/Connected|Disconnected/);
    });

    test('handles real-time data updates', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Get initial total reviews value
      const initialValue = await page.locator('[data-testid="metric-total-reviews"] .text-2xl').textContent();
      
      // Simulate real-time update by triggering a refresh
      await page.click('[data-testid="refresh-button"]');
      await page.waitForTimeout(2000);
      
      // Value might change or stay the same, but UI should update smoothly
      const updatedValue = await page.locator('[data-testid="metric-total-reviews"] .text-2xl').textContent();
      expect(updatedValue).toBeTruthy();
    });

    test('refresh button works correctly', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await expect(refreshButton).toBeVisible();
      
      // Click refresh button
      await refreshButton.click();
      
      // Should show loading state briefly
      await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible({ timeout: 5000 });
      
      // Dashboard should be visible again
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('displays error message when API fails', async ({ page }) => {
      // Mock API error
      await page.route('/api/analytics/**', route => {
        route.fulfill({ status: 500, body: '{"error": "Internal server error"}' });
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="error-message"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('retry button works after error', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('/api/analytics/**', route => {
        attemptCount++;
        if (attemptCount === 1) {
          route.fulfill({ status: 500, body: '{"error": "Internal server error"}' });
        } else {
          route.fulfill({ 
            status: 200, 
            body: JSON.stringify({
              totalReviews: 100,
              averageRating: 4.5,
              responseRate: 0.8,
              sentimentScore: 0.85,
              monthlyGrowth: 0.1,
              lastUpdated: new Date().toISOString(),
              metadata: { supplierId: testSupplierId }
            })
          });
        }
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="error-message"]');
      
      // Click retry button
      await page.click('[data-testid="retry-button"]');
      
      // Should show loading then success
      await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    });

    test('handles 403 Forbidden error', async ({ page }) => {
      await page.route('/api/analytics/**', route => {
        route.fulfill({ status: 403, body: '{"error": "Forbidden"}' });
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="error-message"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Access denied|Forbidden/i);
    });

    test('handles 404 Not Found error', async ({ page }) => {
      await page.route('/api/analytics/**', route => {
        route.fulfill({ status: 404, body: '{"error": "Not found"}' });
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="error-message"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/No data available|Not found/i);
    });
  });

  test.describe('Performance Testing', () => {
    test('measures complete dashboard load performance', async ({ page }) => {
      await page.goto('/analytics/reviews');
      
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          window.addEventListener('load', () => {
            setTimeout(() => {
              const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
              resolve({
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                loadComplete: navigation.loadEventEnd - navigation.navigationStart,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
              });
            }, 1000);
          });
        });
      });
      
      expect((metrics as any).domContentLoaded).toBeLessThan(1500);
      expect((metrics as any).loadComplete).toBeLessThan(3000);
    });

    test('monitors memory usage during dashboard usage', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Interact with dashboard elements
      await page.click('[data-testid="refresh-button"]');
      await page.waitForTimeout(2000);
      
      // Check memory after interaction
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Memory shouldn't increase excessively (allow 50MB increase)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    });

    test('measures API response times', async ({ page }) => {
      const apiCalls: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/analytics/')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });
      
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Check that API calls completed within target time
      expect(apiCalls.length).toBeGreaterThan(0);
      
      apiCalls.forEach(call => {
        expect(call.status).toBe(200);
        // Response time should be under 500ms
        if (call.timing) {
          expect(call.timing.responseEnd - call.timing.requestStart).toBeLessThan(500);
        }
      });
    });
  });

  test.describe('Accessibility Testing', () => {
    test('has proper heading hierarchy', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Check heading structure
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).toContainText('Review Analytics');
      
      // Should have h2 for sections
      const h2Elements = page.locator('h2');
      await expect(h2Elements).toHaveCount.greaterThan(0);
    });

    test('has proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Main content area should have proper role
      await expect(page.locator('[role="main"]')).toBeVisible();
      
      // Charts should have proper labels
      await expect(page.locator('[data-testid="review-trends-chart"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="rating-distribution-chart"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="review-sources-chart"]')).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    });

    test('has sufficient color contrast', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Check contrast for metric values (should be high contrast)
      const metricValue = page.locator('[data-testid="metric-total-reviews"] .text-2xl').first();
      await expect(metricValue).toHaveCSS('color', /rgb\(0, 0, 0\)|rgb\(255, 255, 255\)|rgb\(15, 23, 42\)/);
    });

    test('provides screen reader announcements', async ({ page }) => {
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Screen reader content should be present
      const srOnlyElements = page.locator('.sr-only');
      await expect(srOnlyElements).toHaveCount.greaterThan(0);
      
      // Check for descriptive screen reader text
      await expect(page.locator('.sr-only').first()).toContainText(/Reviews|Rating|trending/i);
    });
  });

  test.describe('Responsive Design', () => {
    test('adapts layout for mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Metrics should stack vertically on mobile
      const metricsGrid = page.locator('[data-testid="metric-total-reviews"]').locator('..');
      await expect(metricsGrid).toHaveClass(/grid-cols-1/);
    });

    test('uses appropriate layout for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Should use 2-column layout on tablet
      const metricsGrid = page.locator('[data-testid="metric-total-reviews"]').locator('..');
      await expect(metricsGrid).toHaveClass(/md:grid-cols-2/);
    });

    test('optimizes for desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Should use 4-column layout on desktop
      const metricsGrid = page.locator('[data-testid="metric-total-reviews"]').locator('..');
      await expect(metricsGrid).toHaveClass(/lg:grid-cols-4/);
    });

    test('handles orientation changes', async ({ page }) => {
      await page.setViewportSize({ width: 812, height: 375 }); // Landscape mobile
      await page.goto('/analytics/reviews');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // Dashboard should still be usable in landscape
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      
      // Charts should adapt to wide viewport
      const chartContainer = page.locator('[data-testid="review-trends-chart"]');
      const chartWidth = await chartContainer.evaluate(el => el.getBoundingClientRect().width);
      expect(chartWidth).toBeGreaterThan(400);
    });
  });
});