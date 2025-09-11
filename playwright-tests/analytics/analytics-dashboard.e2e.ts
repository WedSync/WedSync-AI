import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * WS-246: Vendor Performance Analytics System - E2E Dashboard Testing
 * Complete dashboard workflow testing with real user interactions
 */

test.describe('Analytics Dashboard E2E Tests', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/analytics-dashboard' }
    })
  })

  test.beforeEach(async () => {
    page = await context.newPage()
    
    // Mock authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'test@photographer.com',
            role: 'supplier',
            tier: 'PROFESSIONAL'
          }
        })
      })
    })

    // Mock analytics API responses
    await page.route('**/api/analytics/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData)
      })
    })

    await page.route('**/api/analytics/vendors**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVendorsData)
      })
    })

    await page.route('**/api/analytics/charts/**', async route => {
      const chartType = route.request().url().split('/').pop()?.split('?')[0]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chartType,
          chartData: mockChartData[chartType] || []
        })
      })
    })

    // Navigate to analytics dashboard
    await page.goto('/analytics/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('should load analytics dashboard with all key metrics', async () => {
    // Check page title and main heading
    await expect(page).toHaveTitle(/Analytics Dashboard/)
    await expect(page.locator('h1')).toContainText('Analytics Dashboard')

    // Check overview metrics are displayed
    await expect(page.locator('[data-testid="total-vendors"]')).toContainText('245')
    await expect(page.locator('[data-testid="active-vendors"]')).toContainText('189')
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,234')
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('£2,450,000')
    await expect(page.locator('[data-testid="avg-response-time"]')).toContainText('2.3 hours')
    await expect(page.locator('[data-testid="satisfaction-rate"]')).toContainText('4.6')

    // Verify loading indicators are not present
    await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible()
  })

  test('should display performance trends chart', async () => {
    // Check chart container is visible
    await expect(page.locator('[data-testid="performance-trends-chart"]')).toBeVisible()
    
    // Check chart title
    await expect(page.locator('[data-testid="chart-title"]')).toContainText('Performance Trends')

    // Verify chart data points are rendered
    await expect(page.locator('[data-testid="chart-data-points"]')).toHaveCount(3)

    // Check legend is present
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible()
    await expect(page.locator('[data-testid="legend-bookings"]')).toContainText('Bookings')
    await expect(page.locator('[data-testid="legend-revenue"]')).toContainText('Revenue')
    await expect(page.locator('[data-testid="legend-satisfaction"]')).toContainText('Satisfaction')
  })

  test('should filter dashboard by date range', async () => {
    // Open date range filter
    await page.click('[data-testid="date-range-filter"]')
    await expect(page.locator('[data-testid="date-filter-dropdown"]')).toBeVisible()

    // Select 7 days filter
    await page.click('[data-testid="filter-7d"]')

    // Wait for API call and data update
    await page.waitForResponse('**/api/analytics/dashboard?timeframe=7d')
    await page.waitForTimeout(1000)

    // Verify filter is applied (check active state)
    await expect(page.locator('[data-testid="filter-7d"]')).toHaveClass(/active/)
    
    // Verify URL params are updated
    expect(page.url()).toContain('timeframe=7d')
  })

  test('should show top performing vendors', async () => {
    // Check top performers section
    await expect(page.locator('[data-testid="top-performers"]')).toBeVisible()
    await expect(page.locator('[data-testid="section-title"]')).toContainText('Top Performers')

    // Check vendor cards are displayed
    const vendorCards = page.locator('[data-testid="vendor-performance-card"]')
    await expect(vendorCards).toHaveCount(3)

    // Check first vendor card details
    const firstCard = vendorCards.first()
    await expect(firstCard.locator('[data-testid="vendor-name"]')).toContainText('Elegant Photography')
    await expect(firstCard.locator('[data-testid="vendor-score"]')).toContainText('92.5')
    await expect(firstCard.locator('[data-testid="vendor-bookings"]')).toContainText('156')
    await expect(firstCard.locator('[data-testid="vendor-revenue"]')).toContainText('£234,500')
  })

  test('should navigate to vendor details on card click', async () => {
    // Click on first vendor card
    await page.click('[data-testid="vendor-performance-card"]:first-child')

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Verify we're on vendor detail page
    expect(page.url()).toContain('/analytics/vendors/')
    await expect(page.locator('h1')).toContainText('Vendor Performance Details')
  })

  test('should display vendor type distribution chart', async () => {
    // Check vendor types chart
    await expect(page.locator('[data-testid="vendor-types-chart"]')).toBeVisible()
    
    // Check pie chart segments
    await expect(page.locator('[data-testid="pie-segment"]')).toHaveCount(4)

    // Verify chart tooltips on hover
    await page.hover('[data-testid="pie-segment"]:first-child')
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()
    await expect(page.locator('[data-testid="tooltip-content"]')).toContainText('photographer')
    await expect(page.locator('[data-testid="tooltip-content"]')).toContainText('36.3%')
  })

  test('should search vendors in dashboard', async () => {
    // Use search functionality
    await page.fill('[data-testid="vendor-search"]', 'photography')
    await page.press('[data-testid="vendor-search"]', 'Enter')

    // Wait for search results
    await page.waitForResponse('**/api/analytics/vendors?search=photography')
    await page.waitForTimeout(500)

    // Verify filtered results
    const searchResults = page.locator('[data-testid="vendor-performance-card"]')
    await expect(searchResults).toHaveCount.toBeGreaterThan(0)

    // Check that results contain search term
    const vendorNames = await searchResults.locator('[data-testid="vendor-name"]').allTextContents()
    vendorNames.forEach(name => {
      expect(name.toLowerCase()).toContain('photography')
    })
  })

  test('should sort vendors by different metrics', async () => {
    // Open sort dropdown
    await page.click('[data-testid="sort-dropdown"]')
    await expect(page.locator('[data-testid="sort-options"]')).toBeVisible()

    // Sort by revenue descending
    await page.click('[data-testid="sort-revenue-desc"]')

    // Wait for sort to apply
    await page.waitForResponse('**/api/analytics/vendors?sort=revenue&order=desc')
    await page.waitForTimeout(500)

    // Get revenue values and verify sorting
    const revenueElements = page.locator('[data-testid="vendor-revenue"]')
    const revenueTexts = await revenueElements.allTextContents()
    
    // Convert to numbers and verify descending order
    const revenueValues = revenueTexts.map(text => 
      parseFloat(text.replace(/[£,]/g, ''))
    )
    
    for (let i = 1; i < revenueValues.length; i++) {
      expect(revenueValues[i]).toBeLessThanOrEqual(revenueValues[i - 1])
    }
  })

  test('should refresh dashboard data', async () => {
    // Click refresh button
    await page.click('[data-testid="refresh-dashboard"]')

    // Verify loading state appears briefly
    await expect(page.locator('[data-testid="refresh-loading"]')).toBeVisible()

    // Wait for refresh to complete
    await page.waitForResponse('**/api/analytics/dashboard**')
    await page.waitForTimeout(1000)

    // Verify loading state disappears
    await expect(page.locator('[data-testid="refresh-loading"]')).not.toBeVisible()

    // Verify last updated timestamp is recent
    const lastUpdated = page.locator('[data-testid="last-updated"]')
    await expect(lastUpdated).toContainText('seconds ago')
  })

  test('should handle dashboard errors gracefully', async () => {
    // Navigate to a fresh page
    const errorPage = await context.newPage()

    // Mock API error
    await errorPage.route('**/api/analytics/dashboard**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await errorPage.goto('/analytics/dashboard')
    await errorPage.waitForLoadState('networkidle')

    // Check error state is displayed
    await expect(errorPage.locator('[data-testid="analytics-error"]')).toBeVisible()
    await expect(errorPage.locator('[data-testid="error-message"]')).toContainText('Failed to load analytics data')
    await expect(errorPage.locator('[data-testid="retry-button"]')).toBeVisible()

    await errorPage.close()
  })

  test('should validate real-time data updates', async () => {
    // Mock real-time data update
    await page.evaluate(() => {
      // Simulate real-time data update via WebSocket or Server-Sent Events
      const event = new MessageEvent('analytics-update', {
        data: JSON.stringify({
          type: 'metrics_update',
          data: {
            total_bookings: 1235, // Incremented by 1
            total_revenue: 2453000 // Increased
          }
        })
      })
      window.dispatchEvent(event)
    })

    // Verify metrics are updated without page reload
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,235')
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('£2,453,000')

    // Verify update indicator is shown
    await expect(page.locator('[data-testid="live-update-indicator"]')).toBeVisible()
  })

  test('should export dashboard data', async () => {
    // Click export button
    await page.click('[data-testid="export-dashboard"]')

    // Check export modal opens
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()

    // Select CSV format
    await page.click('[data-testid="export-format-csv"]')

    // Select date range
    await page.selectOption('[data-testid="export-timeframe"]', '30d')

    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="start-export"]')
    ])

    // Verify download started
    expect(download.suggestedFilename()).toMatch(/analytics-dashboard-.*\.csv/)
  })

  test('should maintain state across browser refresh', async () => {
    // Apply filters and search
    await page.fill('[data-testid="vendor-search"]', 'photography')
    await page.press('[data-testid="vendor-search"]', 'Enter')
    await page.click('[data-testid="date-range-filter"]')
    await page.click('[data-testid="filter-7d"]')
    
    await page.waitForLoadState('networkidle')

    // Refresh the browser
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify state is maintained
    await expect(page.locator('[data-testid="vendor-search"]')).toHaveValue('photography')
    await expect(page.locator('[data-testid="filter-7d"]')).toHaveClass(/active/)
    expect(page.url()).toContain('search=photography')
    expect(page.url()).toContain('timeframe=7d')
  })
})

// Mock data for testing
const mockDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6,
    last_updated: new Date().toISOString()
  },
  top_performers: [
    {
      id: 'vendor-1',
      name: 'Elegant Photography',
      type: 'photographer',
      overall_score: 92.5,
      total_bookings: 156,
      total_revenue: 234500,
      satisfaction_score: 4.8
    },
    {
      id: 'vendor-2',
      name: 'Perfect Venues',
      type: 'venue',
      overall_score: 88.2,
      total_bookings: 89,
      total_revenue: 445000,
      satisfaction_score: 4.6
    },
    {
      id: 'vendor-3',
      name: 'Bloom Florists',
      type: 'florist',
      overall_score: 85.7,
      total_bookings: 234,
      total_revenue: 156000,
      satisfaction_score: 4.7
    }
  ],
  performance_trends: [
    { date: '2025-01-01', bookings: 45, revenue: 67500, satisfaction: 4.5 },
    { date: '2025-01-08', bookings: 52, revenue: 78900, satisfaction: 4.6 },
    { date: '2025-01-15', bookings: 48, revenue: 72300, satisfaction: 4.7 }
  ],
  vendor_types: [
    { type: 'photographer', count: 89, percentage: 36.3 },
    { type: 'venue', count: 67, percentage: 27.3 },
    { type: 'florist', count: 45, percentage: 18.4 },
    { type: 'caterer', count: 44, percentage: 18.0 }
  ]
}

const mockVendorsData = {
  vendors: mockDashboardData.top_performers,
  pagination: {
    page: 1,
    limit: 20,
    total: 245,
    pages: 13
  }
}

const mockChartData = {
  'performance-trends': mockDashboardData.performance_trends,
  'vendor-types': mockDashboardData.vendor_types,
  'booking-funnel': [
    { stage: 'Inquiries', count: 1500, percentage: 100 },
    { stage: 'Responses', count: 1350, percentage: 90 },
    { stage: 'Quotes', count: 1080, percentage: 72 },
    { stage: 'Bookings', count: 756, percentage: 50.4 }
  ],
  'revenue-overview': [
    { month: 'Jan', revenue: 145000, bookings: 89 },
    { month: 'Feb', revenue: 167000, bookings: 102 },
    { month: 'Mar', revenue: 198000, bookings: 121 }
  ]
}