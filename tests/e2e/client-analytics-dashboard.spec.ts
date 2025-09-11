import { test, expect, Page } from '@playwright/test';

// Mock data for testing
const mockAnalyticsData = {
  data: {
    summary: {
      total_clients: 45,
      average_engagement_score: 72,
      total_open_alerts: 3,
      at_risk_clients: 5,
      ghost_clients: 2
    },
    segments: {
      champion: 8,
      highly_engaged: 15,
      normal: 20,
      at_risk: 5,
      ghost: 2
    },
    activity_status: {
      active: 35,
      needs_attention: 8,
      at_risk: 5,
      ghost: 2
    },
    clients: [
      {
        client_id: '1',
        client_name: 'Sarah & Mike Johnson',
        email: 'sarah@email.com',
        wedding_date: '2024-06-15',
        engagement_score: 85,
        segment: 'champion',
        activity_status: 'active',
        total_events_30d: 25,
        email_opens_30d: 8,
        email_clicks_30d: 3,
        form_submissions_30d: 2,
        portal_visits_30d: 12,
        last_activity: '2024-01-20T10:00:00Z',
        open_alerts: 0
      },
      {
        client_id: '2',
        client_name: 'Emma & David Chen',
        email: 'emma@email.com',
        wedding_date: '2024-08-20',
        engagement_score: 45,
        segment: 'normal',
        activity_status: 'needs_attention',
        total_events_30d: 8,
        email_opens_30d: 2,
        email_clicks_30d: 1,
        form_submissions_30d: 0,
        portal_visits_30d: 5,
        last_activity: '2024-01-15T14:30:00Z',
        open_alerts: 0
      },
      {
        client_id: '3',
        client_name: 'Jessica & Robert Wilson',
        email: 'jessica@email.com',
        wedding_date: '2024-09-10',
        engagement_score: 15,
        segment: 'at_risk',
        activity_status: 'at_risk',
        total_events_30d: 2,
        email_opens_30d: 0,
        email_clicks_30d: 0,
        form_submissions_30d: 0,
        portal_visits_30d: 2,
        last_activity: '2024-01-05T09:00:00Z',
        open_alerts: 1
      }
    ],
    engagement_trends: [
      { date: '2024-01-15', average_score: 68, total_events: 45 },
      { date: '2024-01-16', average_score: 70, total_events: 52 },
      { date: '2024-01-17', average_score: 72, total_events: 48 },
      { date: '2024-01-18', average_score: 71, total_events: 50 },
      { date: '2024-01-19', average_score: 73, total_events: 55 },
      { date: '2024-01-20', average_score: 72, total_events: 49 }
    ],
    last_refreshed: '2024-01-20T15:30:00Z'
  }
};

const mockAlertsData = {
  data: [
    {
      id: '1',
      client_name: 'Jessica & Robert Wilson',
      alert_type: 'going_silent',
      severity: 'high',
      message: 'Jessica & Robert Wilson hasn\'t engaged in 15 days (231 days before wedding)',
      recommended_actions: ['Send check-in email', 'Offer help', 'Schedule call'],
      days_since_activity: 15,
      wedding_date: '2024-09-10',
      created_at: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      client_name: 'Lisa & Mark Thompson',
      alert_type: 'low_engagement',
      severity: 'medium',
      message: 'Lisa & Mark Thompson has low engagement score of 25',
      recommended_actions: ['Send personal message', 'Share useful content'],
      days_since_activity: 8,
      wedding_date: '2024-07-22',
      created_at: '2024-01-18T14:00:00Z'
    }
  ],
  summary: {
    total_alerts: 2,
    by_severity: { high: 1, medium: 1 },
    by_type: { going_silent: 1, low_engagement: 1 },
    most_recent: '2024-01-20T10:00:00Z'
  }
};

// Helper function to setup API mocks
async function setupAPIMocks(page: Page) {
  // Mock analytics dashboard API
  await page.route('/api/analytics/engagement/dashboard**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAnalyticsData)
    });
  });

  // Mock alerts API
  await page.route('/api/analytics/engagement/alerts**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAlertsData)
    });
  });
}

test.describe('Client Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupAPIMocks(page);
    
    // Navigate to dashboard (assuming it's embedded in a page)
    await page.goto('/dashboard/analytics');
  });

  test('displays summary cards with correct metrics', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();

    // Check total clients
    await expect(page.getByTestId('total-clients')).toHaveText('45');

    // Check average engagement score
    await expect(page.getByTestId('avg-engagement')).toHaveText('72/100');

    // Check at-risk clients
    await expect(page.getByTestId('at-risk-count')).toHaveText('5');

    // Check ghost clients
    await expect(page.getByTestId('ghost-count')).toHaveText('2');

    // Check open alerts
    await expect(page.getByTestId('open-alerts')).toHaveText('3');
  });

  test('displays and interacts with time range selector', async ({ page }) => {
    // Check default selection
    await expect(page.locator('text=Last 30 days')).toBeVisible();

    // Click time range dropdown
    await page.locator('button:has-text("Last 30 days")').click();

    // Verify dropdown options are visible
    await expect(page.locator('text=Last 7 days')).toBeVisible();
    await expect(page.locator('text=Last 90 days')).toBeVisible();

    // Select different time range
    await page.locator('text=Last 7 days').click();

    // Verify selection changed
    await expect(page.locator('text=Last 7 days')).toBeVisible();
  });

  test('displays and filters by client segments', async ({ page }) => {
    // Check default selection
    await expect(page.locator('text=All segments')).toBeVisible();

    // Click segment dropdown
    await page.locator('button:has-text("All segments")').click();

    // Verify dropdown options
    await expect(page.locator('text=Champions')).toBeVisible();
    await expect(page.locator('text=Highly Engaged')).toBeVisible();
    await expect(page.locator('text=Normal')).toBeVisible();
    await expect(page.locator('text=At Risk')).toBeVisible();
    await expect(page.locator('text=Ghost')).toBeVisible();

    // Select at-risk segment
    await page.locator('text=At Risk').click();

    // Verify selection changed
    await expect(page.locator('button:has-text("at risk")')).toBeVisible();
  });

  test('displays critical alerts banner when alerts exist', async ({ page }) => {
    // Check alerts banner is visible
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('text=critical alerts')).toBeVisible();
    await expect(page.locator('text=other alerts')).toBeVisible();
    await expect(page.locator('text=View all alerts →')).toBeVisible();
  });

  test('displays charts correctly', async ({ page }) => {
    // Wait for charts to load (they are dynamically imported)
    await page.waitForTimeout(2000);

    // Check segment distribution chart container
    await expect(page.locator('h3:has-text("Client Segments")')).toBeVisible();

    // Check engagement trends chart container
    await expect(page.locator('h3:has-text("Engagement Trends")')).toBeVisible();

    // Check activity overview chart container  
    await expect(page.locator('h3:has-text("Activity Overview")')).toBeVisible();
  });

  test('displays at-risk alerts section', async ({ page }) => {
    // Check alerts section header
    await expect(page.locator('h3:has-text("At-Risk Alerts")')).toBeVisible();

    // Check first alert
    await expect(page.locator('text=Jessica & Robert Wilson')).toBeVisible();
    await expect(page.locator('text=high')).toBeVisible();
    await expect(page.locator('text=hasn\'t engaged in 15 days')).toBeVisible();

    // Check recommended actions
    await expect(page.locator('text=Send check-in email')).toBeVisible();
    await expect(page.locator('text=Offer help')).toBeVisible();
    await expect(page.locator('text=Schedule call')).toBeVisible();

    // Check second alert
    await expect(page.locator('text=Lisa & Mark Thompson')).toBeVisible();
    await expect(page.locator('text=medium')).toBeVisible();
  });

  test('displays client details table', async ({ page }) => {
    // Check table headers
    await expect(page.locator('th:has-text("Client")')).toBeVisible();
    await expect(page.locator('th:has-text("Score")')).toBeVisible();
    await expect(page.locator('th:has-text("Segment")')).toBeVisible();
    await expect(page.locator('th:has-text("Activity")')).toBeVisible();
    await expect(page.locator('th:has-text("Last Seen")')).toBeVisible();
    await expect(page.locator('th:has-text("Wedding Date")')).toBeVisible();

    // Check first client row
    await expect(page.locator('text=Sarah & Mike Johnson')).toBeVisible();
    await expect(page.locator('text=sarah@email.com')).toBeVisible();
    await expect(page.locator('text=85')).toBeVisible();
    await expect(page.locator('text=champion')).toBeVisible();

    // Check activity icons and counts
    await expect(page.locator('text=8').first()).toBeVisible(); // email opens
    await expect(page.locator('text=12')).toBeVisible(); // portal visits
    await expect(page.locator('text=2')).toBeVisible(); // form submissions
  });

  test('handles refresh functionality', async ({ page }) => {
    let refreshCalled = false;
    
    // Mock refresh API call
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      refreshCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAnalyticsData)
      });
    });

    // Click refresh button
    await page.locator('button:has-text("Refresh")').click();

    // Verify API was called (wait a moment for the call)
    await page.waitForTimeout(1000);
    expect(refreshCalled).toBe(true);
  });

  test('displays loading state', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAnalyticsData)
      });
    });

    // Navigate to trigger loading
    await page.goto('/dashboard/analytics');

    // Check loading state
    await expect(page.getByTestId('analytics-skeleton')).toBeVisible();
    await expect(page.locator('text=Loading client analytics...')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('displays error state and allows retry', async ({ page }) => {
    // Mock API error
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Navigate to trigger error
    await page.goto('/dashboard/analytics');

    // Check error state
    await expect(page.getByTestId('error-alert')).toBeVisible();
    await expect(page.locator('text=Failed to fetch analytics data')).toBeVisible();
    
    // Check retry button
    await expect(page.getByTestId('retry-button')).toBeVisible();

    // Setup successful mock for retry
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAnalyticsData)
      });
    });

    // Click retry
    await page.getByTestId('retry-button').click();

    // Verify dashboard loads successfully after retry
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();
    await expect(page.getByTestId('total-clients')).toHaveText('45');
  });

  test('displays progress bars correctly', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByTestId('avg-engagement')).toHaveText('72/100');

    // Check that progress bars are present and have correct styling
    const progressBars = page.locator('.bg-primary-600');
    await expect(progressBars).toHaveCount(4); // 1 in summary + 3 in client table

    // Check progress bar in summary card has correct width (72%)
    const summaryProgressBar = page.locator('[data-testid="summary-card"]:has-text("Avg Engagement") .bg-primary-600');
    await expect(summaryProgressBar).toHaveAttribute('style', /width: 72%/);
  });

  test('handles segment colors correctly', async ({ page }) => {
    // Check champion segment styling
    await expect(page.locator('.bg-green-50:has-text("champion")')).toBeVisible();

    // Check normal segment styling  
    await expect(page.locator('.bg-gray-50:has-text("normal")')).toBeVisible();

    // Check at-risk segment styling
    await expect(page.locator('.bg-orange-50:has-text("at risk")')).toBeVisible();
  });

  test('displays last updated timestamp', async ({ page }) => {
    // Check that last updated info is shown
    await expect(page.locator('text=Last updated:')).toBeVisible();
    
    // Check that it contains a reasonable timestamp format
    const timestampElement = page.locator('text=Last updated:').locator('..');
    await expect(timestampElement).toContainText('2024');
  });

  test('handles responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Dashboard should still be visible and functional
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();
    
    // Summary cards should stack on mobile (check grid behavior)
    const summaryCards = page.locator('[data-testid="summary-card"]');
    await expect(summaryCards).toHaveCount(5);

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();
  });

  test('accessibility compliance', async ({ page }) => {
    // Check for proper heading structure
    await expect(page.locator('h3:has-text("Client Segments")')).toBeVisible();
    await expect(page.locator('h3:has-text("At-Risk Alerts")')).toBeVisible();

    // Check for table headers
    await expect(page.locator('th[scope="col"], th:has-text("Client")')).toBeVisible();

    // Check for color-blind friendly elements (should have text, not just color)
    await expect(page.locator('text=champion')).toBeVisible();
    await expect(page.locator('text=high')).toBeVisible();
    await expect(page.locator('text=medium')).toBeVisible();

    // Check that buttons have accessible text
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("Last 30 days")')).toBeVisible();
  });
});

test.describe('Client Analytics Dashboard - Edge Cases', () => {
  test('handles empty data gracefully', async ({ page }) => {
    // Mock empty data response
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: {
              total_clients: 0,
              average_engagement_score: 0,
              total_open_alerts: 0,
              at_risk_clients: 0,
              ghost_clients: 0
            },
            segments: {},
            activity_status: {},
            clients: [],
            engagement_trends: [],
            last_refreshed: '2024-01-20T15:30:00Z'
          }
        })
      });
    });

    await page.route('/api/analytics/engagement/alerts**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.goto('/dashboard/analytics');

    // Check zero states
    await expect(page.getByTestId('total-clients')).toHaveText('0');
    await expect(page.getByTestId('avg-engagement')).toHaveText('0/100');
    await expect(page.getByTestId('at-risk-count')).toHaveText('0');

    // Alerts banner should not be visible
    await expect(page.locator('.bg-red-50')).not.toBeVisible();

    // Charts should handle empty data
    await expect(page.locator('h3:has-text("Client Segments")')).toBeVisible();
  });

  test('handles network timeouts gracefully', async ({ page }) => {
    // Mock timeout
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await page.waitForTimeout(10000); // Long timeout
    });

    await page.goto('/dashboard/analytics');

    // Should show loading state
    await expect(page.getByTestId('analytics-skeleton')).toBeVisible();
  });

  test('validates data types and prevents XSS', async ({ page }) => {
    // Mock malicious data
    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: {
              total_clients: '<script>alert("xss")</script>',
              average_engagement_score: 'invalid',
              total_open_alerts: null,
              at_risk_clients: undefined,
              ghost_clients: 'test'
            },
            segments: {},
            activity_status: {},
            clients: [{
              client_name: '<img src=x onerror=alert(1)>',
              email: 'javascript:alert("xss")',
              engagement_score: 'invalid'
            }],
            engagement_trends: [],
            last_refreshed: '2024-01-20T15:30:00Z'
          }
        })
      });
    });

    await page.goto('/dashboard/analytics');

    // Verify XSS attempts are rendered as text, not executed
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('img[onerror]')).toHaveCount(0);
  });
});

test.describe('Client Analytics Dashboard - Performance', () => {
  test('loads within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard/analytics');
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('handles large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeClientsList = Array.from({ length: 100 }, (_, i) => ({
      client_id: `${i + 1}`,
      client_name: `Client ${i + 1}`,
      email: `client${i + 1}@email.com`,
      wedding_date: '2024-06-15',
      engagement_score: Math.floor(Math.random() * 100),
      segment: ['champion', 'highly_engaged', 'normal', 'at_risk', 'ghost'][Math.floor(Math.random() * 5)],
      activity_status: 'active',
      total_events_30d: Math.floor(Math.random() * 50),
      email_opens_30d: Math.floor(Math.random() * 20),
      email_clicks_30d: Math.floor(Math.random() * 10),
      form_submissions_30d: Math.floor(Math.random() * 5),
      portal_visits_30d: Math.floor(Math.random() * 30),
      last_activity: '2024-01-20T10:00:00Z',
      open_alerts: Math.floor(Math.random() * 3)
    }));

    await page.route('/api/analytics/engagement/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...mockAnalyticsData.data,
            clients: largeClientsList
          }
        })
      });
    });

    await page.goto('/dashboard/analytics');

    // Should still load and be responsive
    await expect(page.getByTestId('client-analytics-dashboard')).toBeVisible();
    
    // Should only show first 20 clients in table
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(20);

    // Should have "Load more" button
    await expect(page.locator('text=Load more clients')).toBeVisible();
  });
});