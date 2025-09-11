import { test, expect, Page } from '@playwright/test';

// Test data setup
const testData = {
  organization: {
    id: 'test-org-123',
    name: 'Test Wedding Co'
  },
  user: {
    email: 'planner@testwedding.com',
    password: 'TestPassword123!'
  },
  responseData: [
    { form_type: 'rsvp', total_sent: 150, total_completed: 120, response_rate: 80 },
    { form_type: 'vendor', total_sent: 8, total_completed: 6, response_rate: 75 },
    { form_type: 'dietary', total_sent: 120, total_completed: 95, response_rate: 79.2 }
  ],
  demographicData: [
    { age_group: '25-34', count: 45, avg_travel_distance: 120, accommodation_percentage: 35 },
    { age_group: '35-44', count: 38, count: 38, avg_travel_distance: 95, accommodation_percentage: 25 },
    { age_group: '18-24', count: 22, avg_travel_distance: 200, accommodation_percentage: 60 }
  ],
  vendorData: [
    { vendor_name: 'Elegant Flowers', total_forms: 3, completed_forms: 3, avg_completion_percentage: 100 },
    { vendor_name: 'DJ Music Masters', total_forms: 2, completed_forms: 1, avg_completion_percentage: 50 },
    { vendor_name: 'Perfect Photos', total_forms: 4, completed_forms: 2, avg_completion_percentage: 50 }
  ]
};

test.describe('WS-080 Analytics Dashboard', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock API responses
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: 'test-user', email: testData.user.email } })
      });
    });

    await page.route('**/analytics/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('calculate_response_rate')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify(testData.responseData)
        });
      } else if (url.includes('aggregate_guest_demographics')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify(testData.demographicData)
        });
      } else if (url.includes('vendor_completion_status')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify(testData.vendorData)
        });
      }
    });

    // Navigate to analytics dashboard
    await page.goto('/dashboard/analytics');
  });

  test('should display response rate dashboard correctly', async () => {
    // Wait for dashboard to load
    await expect(page.getByText('Response Rate Analytics')).toBeVisible();
    
    // Check key metrics cards
    await expect(page.getByText('Overall Response Rate')).toBeVisible();
    await expect(page.getByText('79%')).toBeVisible(); // Calculated overall rate
    
    // Check total forms sent
    await expect(page.getByText('Total Forms Sent')).toBeVisible();
    await expect(page.getByText('278')).toBeVisible(); // Sum of all sent forms
    
    // Check completed forms
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('221')).toBeVisible(); // Sum of completed forms
  });

  test('should display interactive charts with correct data', async () => {
    // Wait for charts to render
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
    
    // Verify line chart exists
    await expect(page.locator('.recharts-line')).toHaveCount(5); // 5 form types
    
    // Verify bar chart exists
    await expect(page.locator('.recharts-bar')).toBeVisible();
    
    // Test chart interactions
    const chartArea = page.locator('.recharts-wrapper').first();
    await chartArea.hover();
    
    // Verify tooltip appears on hover
    await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
  });

  test('should handle period and form type filters correctly', async () => {
    // Test period filter
    await page.selectOption('select[data-testid="period-selector"]', '7');
    await page.waitForResponse('**/calculate_response_rate**');
    
    // Test form type filter
    await page.selectOption('select[data-testid="form-type-selector"]', 'rsvp');
    await page.waitForResponse('**/calculate_response_rate**');
    
    // Verify URL parameters are updated
    const url = page.url();
    expect(url).toContain('period=7');
    expect(url).toContain('form_type=rsvp');
  });

  test('should display low response rate alert when threshold is exceeded', async () => {
    // Mock low response rate data
    await page.route('**/calculate_response_rate**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { form_type: 'rsvp', total_sent: 150, total_completed: 75, response_rate: 50 }
        ])
      });
    });
    
    await page.reload();
    
    // Check for alert
    await expect(page.getByText('Low Response Rate Alert')).toBeVisible();
    await expect(page.getByText('Current response rate (50%) is below the target threshold')).toBeVisible();
  });

  test('should display guest demographics analysis', async () => {
    // Navigate to demographics tab
    await page.click('text=Demographics');
    
    // Wait for demographics to load
    await expect(page.getByText('Guest Demographics Analysis')).toBeVisible();
    
    // Check key metrics
    await expect(page.getByText('Total Guests')).toBeVisible();
    await expect(page.getByText('105')).toBeVisible(); // Sum of all age groups
    
    // Check age group distribution chart
    await expect(page.locator('.recharts-bar')).toBeVisible();
    
    // Check demographic breakdown
    await expect(page.getByText('25-34')).toBeVisible();
    await expect(page.getByText('35-44')).toBeVisible();
    await expect(page.getByText('18-24')).toBeVisible();
    
    // Check travel metrics
    await expect(page.getByText('Avg Distance')).toBeVisible();
    await expect(page.getByText('138km')).toBeVisible(); // Weighted average
  });

  test('should render pie chart for RSVP status distribution', async () => {
    await page.click('text=Demographics');
    
    // Wait for pie chart to render
    await expect(page.locator('.recharts-pie')).toBeVisible();
    
    // Test pie chart interactions
    const pieSlice = page.locator('.recharts-pie-sector').first();
    await pieSlice.hover();
    
    // Verify tooltip shows
    await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
  });

  test('should display vendor completion tracking', async () => {
    // Navigate to vendor tracking tab
    await page.click('text=Vendors');
    
    // Wait for vendor data to load
    await expect(page.getByText('Vendor Completion Tracking')).toBeVisible();
    
    // Check key metrics
    await expect(page.getByText('Total Vendors')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    
    // Check individual vendors
    await expect(page.getByText('Elegant Flowers')).toBeVisible();
    await expect(page.getByText('DJ Music Masters')).toBeVisible();
    await expect(page.getByText('Perfect Photos')).toBeVisible();
    
    // Check completion percentages
    await expect(page.getByText('100%')).toBeVisible(); // Elegant Flowers
    await expect(page.getByText('50%')).toHaveCount(2); // DJ and Photos
  });

  test('should handle vendor detail modal', async () => {
    await page.click('text=Vendors');
    
    // Click on a vendor to view details
    await page.click('text=DJ Music Masters');
    
    // Wait for modal/details to load
    await expect(page.getByText('DJ Music Masters')).toBeVisible();
    await expect(page.getByText('Form Status')).toBeVisible();
  });

  test('should send reminder to overdue vendor', async () => {
    await page.click('text=Vendors');
    
    // Mock overdue vendor
    await page.route('**/vendor_completion_status**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { vendor_name: 'Late Vendor', total_forms: 2, completed_forms: 0, overdue_forms: 2, avg_completion_percentage: 0 }
        ])
      });
    });
    
    await page.reload();
    
    // Click remind button
    await page.click('button:has-text("Remind")');
    
    // Verify reminder sent
    await page.waitForResponse('**/notifications**');
  });

  test('should display alert system configuration', async () => {
    // Navigate to alerts tab
    await page.click('text=Alerts');
    
    await expect(page.getByText('Alert System')).toBeVisible();
    await expect(page.getByText('Alert Thresholds')).toBeVisible();
    
    // Test creating new threshold
    await page.click('text=Add Threshold');
    
    // Fill in threshold form
    await page.selectOption('select[name="alert_type"]', 'response_rate');
    await page.fill('input[name="threshold_value"]', '70');
    await page.selectOption('select[name="comparison_operator"]', '<');
    
    // Submit threshold
    await page.click('button:has-text("Create Threshold")');
    
    // Verify threshold created
    await page.waitForResponse('**/alert_thresholds**');
  });

  test('should acknowledge alert in alert history', async () => {
    await page.click('text=Alerts');
    await page.click('text=Alert History');
    
    // Mock alert history
    await page.route('**/alert_history**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'alert-1',
            alert_type: 'response_rate',
            message: 'Response rate below threshold',
            severity: 'high',
            acknowledged: false,
            created_at: new Date().toISOString()
          }
        ])
      });
    });
    
    await page.reload();
    
    // Click acknowledge button
    await page.click('button:has-text("Acknowledge")');
    
    // Verify acknowledgment
    await page.waitForResponse('**/alert_history**');
  });

  test('should export analytics report', async () => {
    // Navigate to export tab
    await page.click('text=Export');
    
    await expect(page.getByText('Export Analytics Reports')).toBeVisible();
    
    // Select report type
    await page.click('text=Response Rate Analysis');
    
    // Select format
    await page.selectOption('select[name="format"]', 'csv');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export
    await page.click('button:has-text("Export Report")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('response_rate_report');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle real-time updates', async () => {
    // Mock WebSocket connection for real-time updates
    await page.addInitScript(() => {
      // Mock supabase real-time subscription
      window.mockSupabaseChannel = {
        on: (event: string, callback: Function) => {
          setTimeout(() => {
            callback({
              eventType: 'INSERT',
              new: { form_type: 'rsvp', submitted_at: new Date().toISOString() }
            });
          }, 2000);
          return window.mockSupabaseChannel;
        },
        subscribe: () => window.mockSupabaseChannel
      };
    });
    
    // Wait for initial load
    await expect(page.getByText('Response Rate Analytics')).toBeVisible();
    
    // Verify metrics update after real-time event
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('real-time-indicator')).toBeVisible();
  });

  test('should be responsive on mobile viewports', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check responsive layout
    await expect(page.getByText('Response Rate Analytics')).toBeVisible();
    
    // Verify charts are responsive
    const chart = page.locator('.recharts-responsive-container').first();
    await expect(chart).toBeVisible();
    
    // Check mobile-friendly navigation
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });

  test('should handle loading states correctly', async () => {
    // Delay API responses to test loading states
    await page.route('**/calculate_response_rate**', async (route) => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        body: JSON.stringify(testData.responseData)
      });
    });
    
    await page.reload();
    
    // Check loading indicator
    await expect(page.getByText('Loading analytics...')).toBeVisible();
    
    // Wait for content to load
    await expect(page.getByText('Response Rate Analytics')).toBeVisible();
    await expect(page.getByText('Loading analytics...')).not.toBeVisible();
  });

  test('should handle error states gracefully', async () => {
    // Mock API error
    await page.route('**/calculate_response_rate**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.reload();
    
    // Check error handling
    await expect(page.getByText('Error loading data')).toBeVisible();
    
    // Check retry functionality
    await page.click('button:has-text("Retry")');
    await page.waitForResponse('**/calculate_response_rate**');
  });

  test('should validate data visualization accessibility', async () => {
    // Check ARIA labels on charts
    const charts = page.locator('.recharts-wrapper');
    await expect(charts.first()).toHaveAttribute('aria-label');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Check color contrast for chart elements
    const chartElements = page.locator('.recharts-bar');
    await expect(chartElements.first()).toHaveCSS('fill', /#[0-9a-f]{6}/i);
  });

  test('should maintain data consistency across components', async () => {
    // Get total from overview
    const overviewTotal = await page.getByTestId('total-guests').textContent();
    
    // Navigate to demographics
    await page.click('text=Demographics');
    
    // Verify same total in demographics view
    const demographicsTotal = await page.getByTestId('demographics-total').textContent();
    expect(overviewTotal).toBe(demographicsTotal);
    
    // Navigate to vendor section
    await page.click('text=Vendors');
    
    // Verify vendor counts are consistent
    const vendorCount = await page.getByTestId('vendor-count').textContent();
    expect(vendorCount).toBe('3');
  });
});

// Performance tests for large datasets
test.describe('Performance Tests', () => {
  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      form_type: `form_${i % 5}`,
      total_sent: 100 + i,
      total_completed: 80 + i,
      response_rate: Math.random() * 100
    }));
    
    await page.route('**/calculate_response_rate**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(largeDataset)
      });
    });
    
    const startTime = Date.now();
    await page.goto('/dashboard/analytics');
    await expect(page.getByText('Response Rate Analytics')).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Assert reasonable load time (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render charts smoothly with animation', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    
    // Wait for charts to render
    await page.waitForSelector('.recharts-wrapper');
    
    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('analytics-dashboard.png');
    
    // Test chart animations
    const chart = page.locator('.recharts-bar').first();
    await expect(chart).toHaveCSS('transition-duration', /\d+(\.\d+)?s/);
  });
});