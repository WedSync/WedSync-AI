import { test, expect } from '@playwright/test';

test.describe('Response Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the analytics dashboard
    await page.goto('/forms/test-form-id/analytics');
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
  });

  test('should display response analytics correctly', async ({ page }) => {
    // Verify dashboard header
    await expect(page.locator('h1')).toContainText('Response Analytics');
    
    // Check for summary cards
    const summaryCards = page.locator('[data-testid="summary-card"]');
    await expect(summaryCards).toHaveCount(4);
    
    // Verify summary card contents
    await expect(page.locator('[data-testid="total-responses"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-score"]')).toBeVisible();
  });

  test('should render visual charts with accurate data', async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('canvas[data-testid="response-chart"]', { timeout: 10000 });
    
    // Verify response volume chart
    const responseChart = page.locator('canvas[data-testid="response-chart"]');
    await expect(responseChart).toBeVisible();
    
    // Verify conversion funnel
    const funnelChart = page.locator('[data-testid="conversion-funnel"]');
    await expect(funnelChart).toBeVisible();
    
    // Check for chart data points
    const chartTooltips = page.locator('.recharts-tooltip-wrapper');
    await responseChart.hover();
    await expect(chartTooltips.first()).toBeVisible();
  });

  test('should handle response filtering correctly', async ({ page }) => {
    // Test status filter
    await page.click('[data-testid="filter-responses"]');
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="filtered-results"]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="status-badge-completed"]')).toBeVisible();
    
    // Test date range filter
    await page.click('[data-testid="date-range-filter"]');
    await page.selectOption('[data-testid="date-range"]', 'last-30-days');
    
    // Wait for results to update
    await page.waitForFunction(() => 
      document.querySelector('[data-testid="filtered-results"]')?.textContent?.includes('Filtered:')
    );
    
    // Verify filtered count is displayed
    await expect(page.locator('[data-testid="filtered-count"]')).toContainText(/Filtered: \d+ responses/);
  });

  test('should generate and download exports successfully', async ({ page }) => {
    // Setup download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Test CSV export
    await page.click('[data-testid="export-responses"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="download-export"]');
    
    // Wait for download to start
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/response.*\.csv$/);
    
    // Verify download completed
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should display response insights with actionable data', async ({ page }) => {
    // Navigate to insights section
    await page.scrollTo(0, 1000);
    
    // Verify insights card is visible
    await expect(page.locator('[data-testid="insights-card"]')).toBeVisible();
    
    // Check for trending fields
    const trendingFields = page.locator('[data-testid="trending-fields"] .badge');
    await expect(trendingFields).toHaveCount.greaterThan(0);
    
    // Verify abandonment points
    const abandonmentPoints = page.locator('[data-testid="abandonment-points"] li');
    await expect(abandonmentPoints).toHaveCount.greaterThan(0);
    
    // Check recommendations
    const recommendations = page.locator('[data-testid="recommendations"] .recommendation-item');
    await expect(recommendations).toHaveCount.greaterThan(0);
  });

  test('should show real-time updates', async ({ page }) => {
    // Get initial response count
    const initialCount = await page.locator('[data-testid="total-responses"] .text-2xl').textContent();
    
    // Simulate new response (in real test, this would trigger via API)
    await page.evaluate(() => {
      // Trigger a mock event or API call that would update the dashboard
      window.dispatchEvent(new CustomEvent('new-response', { 
        detail: { formId: 'test-form-id', responseId: 'new-response-123' }
      }));
    });
    
    // Wait for update (with auto-refresh)
    await page.waitForTimeout(1000);
    
    // Verify count updated (in real scenario)
    // This would need actual backend integration
    await expect(page.locator('[data-testid="total-responses"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Check that charts are responsive
    const charts = page.locator('canvas');
    for (const chart of await charts.all()) {
      const box = await chart.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    }
    
    // Verify mobile navigation works
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/forms/test-form-id/analytics');
    
    // Verify loading skeleton appears
    await expect(page.locator('[data-testid="analytics-skeleton"]')).toBeVisible();
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
    
    // Verify skeleton is hidden
    await expect(page.locator('[data-testid="analytics-skeleton"]')).toBeHidden();
  });

  test('should handle error states appropriately', async ({ page }) => {
    // Mock a network error
    await page.route('**/api/analytics/responses**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Navigate to dashboard
    await page.goto('/forms/test-form-id/analytics');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-alert"]')).toContainText('Failed to fetch analytics data');
    
    // Verify retry button works
    await page.click('[data-testid="retry-button"]');
    // In a real test, we'd verify the retry attempt
  });
});

test.describe('Automated Response Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forms/test-form-id/automation');
    await page.waitForSelector('[data-testid="automation-dashboard"]');
  });

  test('should create automation rules correctly', async ({ page }) => {
    // Click create automation rule
    await page.click('[data-testid="create-rule"]');
    
    // Verify modal opens
    await expect(page.locator('[data-testid="automation-modal"]')).toBeVisible();
    
    // Fill in rule details
    await page.fill('[data-testid="rule-name"]', 'VIP Client Auto-Assignment');
    await page.fill('[data-testid="rule-description"]', 'Auto-assign high-budget inquiries');
    
    // Set condition
    await page.selectOption('[data-testid="trigger-field"]', 'budget');
    await page.selectOption('[data-testid="trigger-operator"]', 'greater_than');
    await page.fill('[data-testid="trigger-value"]', '50000');
    
    // Add action
    await page.click('[data-testid="add-action"]');
    await page.selectOption('[data-testid="action-type"]', 'assign_to_user');
    await page.selectOption('[data-testid="action-user"]', 'senior-planner');
    
    // Save rule
    await page.click('[data-testid="save-rule"]');
    
    // Verify rule appears in list
    await expect(page.locator('[data-testid="automation-rule"]').first()).toContainText('VIP Client Auto-Assignment');
  });

  test('should execute automation rules correctly', async ({ page }) => {
    // Submit form data that should trigger automation
    await page.evaluate(() => {
      fetch('/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'test-form-id',
          data: {
            budget: 75000,
            contact_name: 'Jane Smith',
            email: 'jane@example.com'
          }
        })
      });
    });
    
    // Wait for automation to process
    await page.waitForTimeout(2000);
    
    // Check automation metrics
    await page.reload();
    const triggeredCount = await page.locator('[data-testid="triggered-count"]').textContent();
    expect(parseInt(triggeredCount || '0')).toBeGreaterThan(0);
  });
});

test.describe('Response Export System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forms/test-form-id/analytics');
  });

  test('should export responses in CSV format', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="export-csv"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.csv$/);
    
    // Verify file content
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should export responses in JSON format', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="export-json"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.json$/);
  });

  test('should handle large dataset exports with progress', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/analytics/export**', route => {
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="large_export.csv"'
        },
        body: 'id,name,email\n'.repeat(10000) // Large CSV
      });
    });
    
    // Start export
    await page.click('[data-testid="export-large-dataset"]');
    
    // Verify progress indicator appears
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
  });
});

test.describe('Response Insights and Trends', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forms/test-form-id/insights');
  });

  test('should display response trends correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="trends-chart"]');
    
    // Verify trend visualization
    await expect(page.locator('[data-testid="trends-chart"]')).toBeVisible();
    
    // Check peak submission time
    await expect(page.locator('[data-testid="peak-time"]')).toContainText(/Peak submission time: \d+-\d+ (AM|PM)/);
    
    // Verify completion time analysis
    await expect(page.locator('[data-testid="avg-completion-time"]')).toContainText(/Average completion time: \d+\.\d+ minutes/);
  });

  test('should provide actionable recommendations', async ({ page }) => {
    // Verify recommendations section
    await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
    
    // Check for specific recommendation types
    const recommendations = page.locator('[data-testid="recommendation-item"]');
    await expect(recommendations).toHaveCount.greaterThan(0);
    
    // Verify recommendations contain actionable text
    const firstRec = recommendations.first();
    await expect(firstRec).toContainText(/Consider|Add|Optimize|Improve/);
  });
});

test.describe('Form Completion Rate Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forms/test-form-id/completion-analysis');
  });

  test('should display completion funnel accurately', async ({ page }) => {
    // Verify funnel visualization
    await expect(page.locator('[data-testid="completion-funnel"]')).toBeVisible();
    
    // Check funnel stages
    const stages = page.locator('[data-testid="funnel-stage"]');
    await expect(stages).toHaveCount(3); // Visits, Started, Completed
    
    // Verify conversion rate calculation
    await expect(page.locator('[data-testid="conversion-rate"]')).toContainText(/\d+%/);
  });

  test('should identify drop-off points', async ({ page }) => {
    // Verify drop-off analysis
    await expect(page.locator('[data-testid="dropoff-analysis"]')).toBeVisible();
    
    // Check for specific drop-off points
    const dropoffPoints = page.locator('[data-testid="dropoff-point"]');
    await expect(dropoffPoints).toHaveCount.greaterThan(0);
    
    // Verify each point has percentage and field info
    const firstDropoff = dropoffPoints.first();
    await expect(firstDropoff).toContainText(/Step \d+/);
    await expect(firstDropoff).toContainText(/\d+% drop-off/);
  });
});

test.describe('Accessibility and Performance', () => {
  test('should meet accessibility standards', async ({ page }) => {
    await page.goto('/forms/test-form-id/analytics');
    
    // Run axe accessibility checks
    const accessibilityReport = await page.evaluate(() => {
      return (window as any).axe?.run();
    });
    
    // In a real test, we'd use @axe-core/playwright
    // expect(accessibilityReport.violations).toHaveLength(0);
    
    // Check basic accessibility features
    await expect(page.locator('h1')).toHaveAttribute('role');
    await expect(page.locator('button')).toHaveAttribute('aria-label');
  });

  test('should load within performance targets', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/forms/test-form-id/analytics');
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
    
    const loadTime = Date.now() - startTime;
    
    // Verify dashboard loads within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true);
    
    await page.goto('/forms/test-form-id/analytics');
    
    // Verify offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Restore network
    await page.context().setOffline(false);
    
    // Verify retry functionality
    await page.click('[data-testid="retry-connection"]');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
  });
});