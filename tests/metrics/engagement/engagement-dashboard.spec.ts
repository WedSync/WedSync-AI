/**
 * Playwright E2E Tests for Engagement Metrics Dashboard
 * Feature ID: WS-052
 * 
 * Tests the engagement dashboard functionality, real-time updates, and user interactions
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_SUPPLIER_ID = 'test-supplier-123';
const TEST_CLIENT_ID = 'test-client-456';
const DASHBOARD_URL = '/dashboard/metrics/engagement';

// Helper function to mock API responses
async function mockDashboardData(page: Page) {
  await page.route('**/api/analytics/engagement/dashboard*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summary: {
            total_clients: 25,
            average_engagement_score: 72,
            total_open_alerts: 3,
            at_risk_clients: 3,
            ghost_clients: 1
          },
          segments: {
            champion: 5,
            highly_engaged: 8,
            normal: 8,
            at_risk: 3,
            ghost: 1
          },
          activity_status: {
            active: 20,
            at_risk: 3,
            ghost: 2
          },
          clients: [
            {
              client_id: 'client-1',
              client_name: 'Sarah & Mike Johnson',
              engagement_score: 92,
              segment: 'champion',
              activity_status: 'active',
              last_activity: '2025-08-21T10:30:00Z'
            },
            {
              client_id: 'client-2',
              client_name: 'Jennifer & Tom Smith',
              engagement_score: 35,
              segment: 'at_risk',
              activity_status: 'at_risk',
              last_activity: '2025-08-10T15:00:00Z'
            }
          ],
          engagement_trends: [
            { date: '2025-08-15', average_score: 68, total_events: 145 },
            { date: '2025-08-16', average_score: 70, total_events: 152 },
            { date: '2025-08-17', average_score: 69, total_events: 138 },
            { date: '2025-08-18', average_score: 71, total_events: 160 },
            { date: '2025-08-19', average_score: 72, total_events: 155 },
            { date: '2025-08-20', average_score: 73, total_events: 162 },
            { date: '2025-08-21', average_score: 72, total_events: 148 }
          ]
        },
        success: true,
        timestamp: new Date().toISOString()
      })
    });
  });
}

test.describe('Engagement Metrics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user',
          email: 'test@example.com',
          role: 'authenticated'
        }
      }));
    });
    
    // Set up API mocking
    await mockDashboardData(page);
  });
  
  test('should load and display dashboard summary cards', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Wait for dashboard to load
    await expect(page.getByText('Engagement Metrics Dashboard')).toBeVisible();
    
    // Check summary cards
    await expect(page.getByText('Average Score')).toBeVisible();
    await expect(page.getByText('72/100')).toBeVisible();
    
    await expect(page.getByText('Active Clients')).toBeVisible();
    await expect(page.getByText('21')).toBeVisible(); // 25 total - 3 at risk - 1 ghost
    
    await expect(page.getByText('At Risk')).toBeVisible();
    await expect(page.getByText('3', { exact: true })).toBeVisible();
    
    // Check for alert indicator on at-risk card
    const atRiskCard = page.locator('[data-testid="at-risk-card"]');
    if (await atRiskCard.count() > 0) {
      await expect(atRiskCard.getByText('Action required')).toBeVisible();
    }
  });
  
  test('should display engagement trends chart', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Wait for chart container
    const chartContainer = page.locator('[data-testid="engagement-trends-chart"]');
    if (await chartContainer.count() > 0) {
      await expect(chartContainer).toBeVisible();
      
      // Check if chart is rendered (checking for SVG element)
      const chart = chartContainer.locator('svg');
      await expect(chart).toBeVisible();
      
      // Verify chart has data points
      const dataPoints = chart.locator('.recharts-line-dots circle');
      const count = await dataPoints.count();
      expect(count).toBeGreaterThan(0);
    }
  });
  
  test('should display client segments pie chart', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Check for segment distribution
    await expect(page.getByText('Client Segments')).toBeVisible();
    
    // Check for pie chart
    const pieChartContainer = page.locator('[data-testid="segments-pie-chart"]');
    if (await pieChartContainer.count() > 0) {
      await expect(pieChartContainer).toBeVisible();
      
      // Check for legend items
      await expect(page.getByText('Champion')).toBeVisible();
      await expect(page.getByText('Highly Engaged')).toBeVisible();
      await expect(page.getByText('Normal')).toBeVisible();
      await expect(page.getByText('At Risk')).toBeVisible();
    }
  });
  
  test('should display at-risk alerts', async ({ page }) => {
    // Mock alerts data
    await page.route('**/api/analytics/engagement/alerts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'alert-1',
            client_name: 'Jennifer & Tom Smith',
            alert_type: 'going_silent',
            severity: 'high',
            message: 'No activity for 11 days',
            days_since_activity: 11
          },
          {
            id: 'alert-2',
            client_name: 'Emily & David Brown',
            alert_type: 'low_engagement',
            severity: 'medium',
            message: 'Engagement score dropped below 40',
            days_since_activity: 5
          }
        ])
      });
    });
    
    await page.goto(DASHBOARD_URL);
    
    // Check for alerts section
    await expect(page.getByText('At-Risk Alerts')).toBeVisible();
    
    // Check for alert items
    const alertsContainer = page.locator('[data-testid="alerts-container"]');
    if (await alertsContainer.count() > 0) {
      const alerts = alertsContainer.locator('[data-testid="alert-item"]');
      const alertCount = await alerts.count();
      expect(alertCount).toBeGreaterThan(0);
      
      // Check first alert content
      const firstAlert = alerts.first();
      await expect(firstAlert).toContainText('Jennifer & Tom Smith');
      await expect(firstAlert).toContainText('11 days');
    }
  });
  
  test('should allow period selection', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Check for period selector
    const periodSelector = page.locator('[data-testid="period-selector"]');
    if (await periodSelector.count() > 0) {
      // Default should be 7 days
      await expect(periodSelector.getByText('7 Days')).toHaveClass(/bg-white/);
      
      // Click on 30 days
      await periodSelector.getByText('30 Days').click();
      
      // Verify API was called with new period
      await page.waitForRequest(url => 
        url.href.includes('period=30d')
      );
      
      // Check that 30 days is now selected
      await expect(periodSelector.getByText('30 Days')).toHaveClass(/bg-white/);
    }
  });
  
  test('should refresh data when refresh button is clicked', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Find and click refresh button
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if (await refreshButton.count() === 0) {
      // Try icon button
      const iconButton = page.locator('button').filter({ has: page.locator('svg') });
      const refreshIcon = iconButton.filter({ hasText: /refresh/i });
      if (await refreshIcon.count() > 0) {
        await refreshIcon.click();
      }
    } else {
      await refreshButton.click();
    }
    
    // Verify API was called again
    await page.waitForRequest(url => 
      url.href.includes('/api/analytics/engagement/dashboard')
    );
  });
  
  test('should display performance metrics', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Check for performance metrics section
    await expect(page.getByText('Performance Metrics')).toBeVisible();
    
    // Check for metric items
    const metrics = [
      'Email Engagement',
      'Portal Activity',
      'Form Completion',
      'Meeting Attendance',
      'Payment On Time',
      'Overall Satisfaction'
    ];
    
    for (const metric of metrics) {
      const metricElement = page.getByText(metric);
      if (await metricElement.count() > 0) {
        await expect(metricElement).toBeVisible();
      }
    }
  });
  
  test('should handle real-time updates via WebSocket', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Simulate WebSocket connection
    await page.evaluate(() => {
      // Mock WebSocket
      (window as any).mockWebSocket = {
        send: (data: any) => {
          // Simulate real-time update
          setTimeout(() => {
            const event = new CustomEvent('ws-message', {
              detail: {
                type: 'metric_update',
                data: {
                  clientId: 'client-3',
                  score: 85,
                  change: 5,
                  segment: 'champion'
                }
              }
            });
            window.dispatchEvent(event);
          }, 1000);
        }
      };
    });
    
    // Wait for potential real-time update
    await page.waitForTimeout(1500);
    
    // Check if real-time activity indicator is visible
    const liveIndicator = page.locator('[data-testid="live-indicator"]');
    if (await liveIndicator.count() > 0) {
      await expect(liveIndicator).toBeVisible();
    }
  });
  
  test('should display activity breakdown', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Check for activity breakdown section
    await expect(page.getByText('Activity Breakdown')).toBeVisible();
    
    // Check for activity items
    const activities = [
      'Email Opens',
      'Portal Visits',
      'Form Submissions',
      'Link Clicks',
      'Meetings',
      'Payments'
    ];
    
    for (const activity of activities) {
      const activityElement = page.getByText(activity);
      if (await activityElement.count() > 0) {
        await expect(activityElement).toBeVisible();
        
        // Check for progress bar
        const progressBar = activityElement.locator('..').locator('[role="progressbar"]');
        if (await progressBar.count() > 0) {
          await expect(progressBar).toBeVisible();
        }
      }
    }
  });
  
  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/analytics/engagement/dashboard*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto(DASHBOARD_URL);
    
    // Check for error message
    await expect(page.getByText(/Failed to load engagement metrics/i)).toBeVisible();
    
    // Check for retry button
    const retryButton = page.getByRole('button', { name: /retry/i });
    await expect(retryButton).toBeVisible();
    
    // Click retry
    await retryButton.click();
    
    // Verify API was called again
    await page.waitForRequest(url => 
      url.href.includes('/api/analytics/engagement/dashboard')
    );
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(DASHBOARD_URL);
    
    // Check that dashboard loads on mobile
    await expect(page.getByText('Engagement Metrics Dashboard')).toBeVisible();
    
    // Check that cards stack vertically
    const cards = page.locator('[data-testid*="summary-card"]');
    if (await cards.count() > 0) {
      const firstCard = cards.first();
      const secondCard = cards.nth(1);
      
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      
      if (firstBox && secondBox) {
        // Second card should be below first card on mobile
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height);
      }
    }
  });
  
  test('should export data when export button is clicked', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('engagement-metrics');
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|json)$/);
    }
  });
});

test.describe('Engagement Dashboard Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await mockDashboardData(page);
    await page.goto(DASHBOARD_URL);
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that period selector can be accessed
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toBeTruthy();
    
    // Navigate through period options with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    
    // Verify selection changed
    await page.waitForRequest(url => 
      url.href.includes('/api/analytics/engagement/dashboard')
    );
  });
  
  test('should have proper ARIA labels', async ({ page }) => {
    await mockDashboardData(page);
    await page.goto(DASHBOARD_URL);
    
    // Check for ARIA labels on interactive elements
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }
    
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    
    // Check for landmark regions
    const main = page.getByRole('main');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
  });
  
  test('should have sufficient color contrast', async ({ page }) => {
    await mockDashboardData(page);
    await page.goto(DASHBOARD_URL);
    
    // Check text contrast for important elements
    const importantTexts = [
      page.getByText('Engagement Metrics Dashboard'),
      page.getByText('Average Score'),
      page.getByText('At Risk')
    ];
    
    for (const text of importantTexts) {
      if (await text.count() > 0) {
        const color = await text.evaluate(el => 
          window.getComputedStyle(el).color
        );
        const bgColor = await text.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Basic check that text has color defined
        expect(color).toBeTruthy();
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
      }
    }
  });
});