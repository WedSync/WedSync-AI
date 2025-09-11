import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * WS-246: Vendor Performance Analytics System - Vendor Comparison E2E Testing
 * Tests vendor comparison functionality with complete user workflows
 */

test.describe('Vendor Comparison E2E Tests', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/vendor-comparison' }
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
            id: 'test-user-comparison',
            email: 'comparison@photographer.com',
            role: 'supplier',
            tier: 'PROFESSIONAL'
          }
        })
      })
    })

    // Mock vendor comparison API
    await page.route('**/api/analytics/vendors/compare**', async route => {
      const url = new URL(route.request().url())
      const vendorIds = url.searchParams.get('vendor_ids')?.split(',') || []
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          comparison_data: mockComparisonData.filter(v => vendorIds.includes(v.id)),
          metrics: mockComparisonMetrics,
          last_updated: new Date().toISOString()
        })
      })
    })

    // Mock vendors list API
    await page.route('**/api/analytics/vendors**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVendorsListData)
      })
    })

    // Mock export API
    await page.route('**/api/analytics/export**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="vendor-comparison.csv"'
        },
        body: mockExportData
      })
    })

    // Navigate to vendor comparison page
    await page.goto('/analytics/vendors/compare')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('should display vendor comparison interface', async () => {
    // Check main comparison interface elements
    await expect(page.locator('h1')).toContainText('Vendor Comparison')
    await expect(page.locator('[data-testid="vendor-selection-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="comparison-chart-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible()

    // Check vendor selection controls
    await expect(page.locator('[data-testid="vendor-search"]')).toBeVisible()
    await expect(page.locator('[data-testid="vendor-filter"]')).toBeVisible()
    await expect(page.locator('[data-testid="select-all-vendors"]')).toBeVisible()

    // Verify initial state shows instruction message
    await expect(page.locator('[data-testid="selection-instruction"]')).toContainText('Select vendors to compare')
  })

  test('should allow selecting vendors for comparison', async () => {
    // Search for photographers
    await page.fill('[data-testid="vendor-search"]', 'photography')
    await page.press('[data-testid="vendor-search"]', 'Enter')
    await page.waitForTimeout(500)

    // Verify search results
    const vendorCards = page.locator('[data-testid="vendor-card"]')
    await expect(vendorCards).toHaveCount.toBeGreaterThan(0)

    // Select first vendor
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await expect(page.locator('[data-testid="select-vendor-vendor-1"]')).toBeChecked()

    // Check selection counter
    await expect(page.locator('[data-testid="selection-counter"]')).toContainText('1 vendor selected')

    // Select second vendor
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await expect(page.locator('[data-testid="select-vendor-vendor-2"]')).toBeChecked()
    await expect(page.locator('[data-testid="selection-counter"]')).toContainText('2 vendors selected')

    // Verify compare button is enabled
    await expect(page.locator('[data-testid="compare-button"]')).toBeEnabled()
  })

  test('should enforce maximum vendor selection limit', async () => {
    const maxSelections = 5

    // Select maximum number of vendors
    for (let i = 1; i <= maxSelections; i++) {
      await page.click(`[data-testid="select-vendor-vendor-${i}"]`)
    }

    // Verify selection limit message
    await expect(page.locator('[data-testid="selection-limit-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="selection-limit-message"]')).toContainText(`Maximum ${maxSelections} vendors`)

    // Try to select one more - should be disabled
    const nextCheckbox = page.locator('[data-testid="select-vendor-vendor-6"]')
    await expect(nextCheckbox).toBeDisabled()

    // Deselect one vendor
    await page.click('[data-testid="select-vendor-vendor-1"]')
    
    // Now the next checkbox should be enabled again
    await expect(nextCheckbox).toBeEnabled()
  })

  test('should generate comparison chart', async () => {
    // Select vendors for comparison
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="select-vendor-vendor-3"]')

    // Start comparison
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check comparison chart is displayed
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible()

    // Verify chart contains all selected vendors
    const chartLegendItems = page.locator('[data-testid="legend-item"]')
    await expect(chartLegendItems).toHaveCount(3)

    // Check metric labels on radar chart
    const expectedMetrics = ['Overall Score', 'Response Time', 'Booking Success', 'Satisfaction', 'Portfolio Quality']
    for (const metric of expectedMetrics) {
      await expect(page.locator('[data-testid="radar-label"]')).toContainText(metric)
    }

    // Test chart interactions
    await page.hover('[data-testid="chart-data-point-vendor-1"]')
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()
    await expect(page.locator('[data-testid="tooltip-vendor-name"]')).toContainText('Elite Photography Studio')
  })

  test('should display detailed comparison table', async () => {
    // Select and compare vendors
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check comparison table structure
    await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible()
    
    // Verify table headers
    await expect(page.locator('[data-testid="table-header-metric"]')).toContainText('Metric')
    await expect(page.locator('[data-testid="table-header-vendor-1"]')).toContainText('Elite Photography')
    await expect(page.locator('[data-testid="table-header-vendor-2"]')).toContainText('Perfect Venues')

    // Check metric rows
    const metricRows = page.locator('[data-testid="metric-row"]')
    await expect(metricRows).toHaveCount.toBeGreaterThan(0)

    // Verify specific metrics are displayed
    await expect(page.locator('[data-testid="metric-overall-score"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-response-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-booking-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-satisfaction"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-total-revenue"]')).toBeVisible()

    // Check value formatting
    await expect(page.locator('[data-testid="value-overall-score-vendor-1"]')).toContainText('95.2')
    await expect(page.locator('[data-testid="value-revenue-vendor-1"]')).toContainText('£450,000')
    await expect(page.locator('[data-testid="value-satisfaction-vendor-1"]')).toContainText('4.8 ★')
  })

  test('should highlight best and worst performers', async () => {
    // Select multiple vendors for comparison
    await page.click('[data-testid="select-vendor-vendor-1"]') // High performer
    await page.click('[data-testid="select-vendor-vendor-4"]') // Low performer
    await page.click('[data-testid="select-vendor-vendor-2"]') // Medium performer
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check that best performers are highlighted in green
    await expect(page.locator('[data-testid="best-performer-overall-score"]')).toHaveClass(/text-green-600/)
    await expect(page.locator('[data-testid="best-performer-satisfaction"]')).toHaveClass(/text-green-600/)

    // Check that worst performers are highlighted in red
    await expect(page.locator('[data-testid="worst-performer-overall-score"]')).toHaveClass(/text-red-600/)
    await expect(page.locator('[data-testid="worst-performer-response-time"]')).toHaveClass(/text-red-600/)

    // Check winner badges
    await expect(page.locator('[data-testid="winner-badge-overall"]')).toBeVisible()
    await expect(page.locator('[data-testid="winner-badge-overall"]')).toContainText('🏆 Best Overall')
  })

  test('should allow switching between chart types', async () => {
    // Select vendors and start comparison
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check initial chart type (radar)
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-type-radar"]')).toHaveClass(/active/)

    // Switch to bar chart
    await page.click('[data-testid="chart-type-bar"]')
    await page.waitForTimeout(500)

    await expect(page.locator('[data-testid="comparison-bar-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="chart-type-bar"]')).toHaveClass(/active/)

    // Switch to line chart
    await page.click('[data-testid="chart-type-line"]')
    await page.waitForTimeout(500)

    await expect(page.locator('[data-testid="comparison-line-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="comparison-bar-chart"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="chart-type-line"]')).toHaveClass(/active/)
  })

  test('should filter vendors by criteria', async () => {
    // Test type filter
    await page.selectOption('[data-testid="vendor-type-filter"]', 'photographer')
    await page.waitForTimeout(500)

    const photographerCards = page.locator('[data-testid="vendor-card"][data-type="photographer"]')
    const venueCards = page.locator('[data-testid="vendor-card"][data-type="venue"]')
    
    await expect(photographerCards).toHaveCount.toBeGreaterThan(0)
    await expect(venueCards).toHaveCount(0)

    // Test score range filter
    await page.selectOption('[data-testid="score-range-filter"]', 'high') // 80+
    await page.waitForTimeout(500)

    const highScoreCards = page.locator('[data-testid="vendor-card"]')
    const count = await highScoreCards.count()
    
    // Verify all visible vendors have high scores
    for (let i = 0; i < count; i++) {
      const scoreElement = highScoreCards.nth(i).locator('[data-testid="vendor-score"]')
      const scoreText = await scoreElement.textContent()
      const score = parseFloat(scoreText?.replace(/[^\d.]/g, '') || '0')
      expect(score).toBeGreaterThanOrEqual(80)
    }

    // Clear filters
    await page.click('[data-testid="clear-filters"]')
    await page.waitForTimeout(500)

    // Verify all vendors are shown again
    await expect(page.locator('[data-testid="vendor-card"]')).toHaveCount(mockVendorsListData.vendors.length)
  })

  test('should save and load comparison presets', async () => {
    // Select specific vendors
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="select-vendor-vendor-3"]')

    // Save as preset
    await page.click('[data-testid="save-preset"]')
    await expect(page.locator('[data-testid="preset-modal"]')).toBeVisible()

    await page.fill('[data-testid="preset-name"]', 'Top Photography Studios')
    await page.fill('[data-testid="preset-description"]', 'Comparison of top-rated photography vendors')
    await page.click('[data-testid="save-preset-confirm"]')

    // Verify success message
    await expect(page.locator('[data-testid="preset-saved"]')).toBeVisible()
    await expect(page.locator('[data-testid="preset-saved"]')).toContainText('Preset saved successfully')

    // Clear current selection
    await page.click('[data-testid="clear-selection"]')
    await expect(page.locator('[data-testid="selection-counter"]')).toContainText('0 vendors selected')

    // Load saved preset
    await page.click('[data-testid="load-preset"]')
    await expect(page.locator('[data-testid="presets-dropdown"]')).toBeVisible()

    await page.click('[data-testid="preset-top-photography-studios"]')
    await page.waitForTimeout(500)

    // Verify vendors are selected
    await expect(page.locator('[data-testid="selection-counter"]')).toContainText('3 vendors selected')
    await expect(page.locator('[data-testid="select-vendor-vendor-1"]')).toBeChecked()
    await expect(page.locator('[data-testid="select-vendor-vendor-2"]')).toBeChecked()
    await expect(page.locator('[data-testid="select-vendor-vendor-3"]')).toBeChecked()
  })

  test('should export comparison data', async () => {
    // Select vendors and compare
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Test CSV export
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv"]')
    ])

    expect(download1.suggestedFilename()).toMatch(/vendor-comparison.*\.csv/)

    // Test PDF export
    await page.click('[data-testid="export-pdf"]')
    await expect(page.locator('[data-testid="pdf-generating"]')).toBeVisible()

    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForSelector('[data-testid="pdf-ready"]')
    ])

    expect(download2.suggestedFilename()).toMatch(/vendor-comparison.*\.pdf/)

    // Test Excel export
    const [download3] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-excel"]')
    ])

    expect(download3.suggestedFilename()).toMatch(/vendor-comparison.*\.xlsx/)
  })

  test('should handle comparison with large number of vendors', async () => {
    // Select maximum allowed vendors (5)
    for (let i = 1; i <= 5; i++) {
      await page.click(`[data-testid="select-vendor-vendor-${i}"]`)
    }

    // Start comparison
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check that chart handles 5 vendors appropriately
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).toBeVisible()
    
    // Verify chart legend shows all vendors
    const legendItems = page.locator('[data-testid="legend-item"]')
    await expect(legendItems).toHaveCount(5)

    // Check table handles large comparison
    const tableHeaders = page.locator('[data-testid^="table-header-vendor-"]')
    await expect(tableHeaders).toHaveCount(5)

    // Verify table is horizontally scrollable if needed
    const table = page.locator('[data-testid="comparison-table"]')
    const tableWidth = await table.evaluate(el => el.scrollWidth)
    const containerWidth = await table.evaluate(el => el.clientWidth)

    if (tableWidth > containerWidth) {
      // Test horizontal scrolling
      await table.evaluate(el => el.scrollTo(100, 0))
      const scrollLeft = await table.evaluate(el => el.scrollLeft)
      expect(scrollLeft).toBeGreaterThan(0)
    }
  })

  test('should provide contextual insights and recommendations', async () => {
    // Select vendors with different performance profiles
    await page.click('[data-testid="select-vendor-vendor-1"]') // High performer
    await page.click('[data-testid="select-vendor-vendor-4"]') // Low performer
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Check insights panel
    await expect(page.locator('[data-testid="insights-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="insights-title"]')).toContainText('Key Insights')

    // Verify specific insights are shown
    await expect(page.locator('[data-testid="insight-performance-gap"]')).toBeVisible()
    await expect(page.locator('[data-testid="insight-performance-gap"]')).toContainText('significant performance gap')

    await expect(page.locator('[data-testid="insight-best-category"]')).toBeVisible()
    await expect(page.locator('[data-testid="insight-improvement-opportunity"]')).toBeVisible()

    // Check recommendations
    await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible()
    const recommendations = page.locator('[data-testid="recommendation-item"]')
    await expect(recommendations).toHaveCount.toBeGreaterThan(0)

    // Verify actionable recommendations
    await expect(recommendations.first()).toContainText('Consider') // Should start with action word
  })

  test('should maintain comparison state across navigation', async () => {
    // Select vendors and compare
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="compare-button"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Navigate away and back
    await page.goto('/analytics/dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/analytics/vendors/compare')
    await page.waitForLoadState('networkidle')

    // Verify comparison state is preserved
    await expect(page.locator('[data-testid="select-vendor-vendor-1"]')).toBeChecked()
    await expect(page.locator('[data-testid="select-vendor-vendor-2"]')).toBeChecked()
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).toBeVisible()
  })

  test('should handle error states gracefully', async () => {
    // Mock API error for comparison
    await page.route('**/api/analytics/vendors/compare**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Comparison service temporarily unavailable' })
      })
    })

    // Select vendors and attempt comparison
    await page.click('[data-testid="select-vendor-vendor-1"]')
    await page.click('[data-testid="select-vendor-vendor-2"]')
    await page.click('[data-testid="compare-button"]')
    await page.waitForTimeout(1000)

    // Check error state
    await expect(page.locator('[data-testid="comparison-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load comparison')
    await expect(page.locator('[data-testid="retry-comparison"]')).toBeVisible()

    // Test retry functionality
    await page.route('**/api/analytics/vendors/compare**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          comparison_data: mockComparisonData.slice(0, 2),
          metrics: mockComparisonMetrics
        })
      })
    })

    await page.click('[data-testid="retry-comparison"]')
    await page.waitForResponse('**/api/analytics/vendors/compare**')

    // Verify comparison loads successfully
    await expect(page.locator('[data-testid="comparison-radar-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="comparison-error"]')).not.toBeVisible()
  })
})

// Mock data for testing
const mockComparisonData = [
  {
    id: 'vendor-1',
    name: 'Elite Photography Studio',
    type: 'photographer',
    overall_score: 95.2,
    response_time_score: 98.5,
    booking_success_rate: 0.92,
    satisfaction_score: 4.8,
    portfolio_quality: 94.0,
    total_bookings: 234,
    total_revenue: 450000,
    avg_response_time: 0.8,
    created_at: '2023-01-15T10:00:00Z'
  },
  {
    id: 'vendor-2',
    name: 'Perfect Venues Ltd',
    type: 'venue',
    overall_score: 88.7,
    response_time_score: 85.2,
    booking_success_rate: 0.89,
    satisfaction_score: 4.6,
    portfolio_quality: 91.5,
    total_bookings: 156,
    total_revenue: 620000,
    avg_response_time: 2.1,
    created_at: '2023-03-20T14:30:00Z'
  },
  {
    id: 'vendor-3',
    name: 'Bloom & Blossom Florists',
    type: 'florist',
    overall_score: 91.3,
    response_time_score: 93.8,
    booking_success_rate: 0.87,
    satisfaction_score: 4.7,
    portfolio_quality: 89.2,
    total_bookings: 298,
    total_revenue: 178000,
    avg_response_time: 1.2,
    created_at: '2023-02-10T09:15:00Z'
  },
  {
    id: 'vendor-4',
    name: 'Budget Photography Services',
    type: 'photographer',
    overall_score: 62.4,
    response_time_score: 55.8,
    booking_success_rate: 0.71,
    satisfaction_score: 3.9,
    portfolio_quality: 68.5,
    total_bookings: 89,
    total_revenue: 89000,
    avg_response_time: 8.5,
    created_at: '2023-06-01T16:45:00Z'
  },
  {
    id: 'vendor-5',
    name: 'Luxury Catering Co',
    type: 'caterer',
    overall_score: 86.9,
    response_time_score: 82.4,
    booking_success_rate: 0.84,
    satisfaction_score: 4.5,
    portfolio_quality: 88.7,
    total_bookings: 145,
    total_revenue: 345000,
    avg_response_time: 3.2,
    created_at: '2023-04-12T11:20:00Z'
  }
]

const mockComparisonMetrics = {
  overall_score: { min: 0, max: 100, unit: 'points' },
  response_time_score: { min: 0, max: 100, unit: 'points' },
  booking_success_rate: { min: 0, max: 1, unit: 'percentage' },
  satisfaction_score: { min: 1, max: 5, unit: 'stars' },
  portfolio_quality: { min: 0, max: 100, unit: 'points' },
  total_revenue: { min: 0, max: null, unit: 'GBP' },
  avg_response_time: { min: 0, max: null, unit: 'hours' }
}

const mockVendorsListData = {
  vendors: mockComparisonData,
  pagination: {
    page: 1,
    limit: 20,
    total: 5,
    pages: 1
  }
}

const mockExportData = `Vendor Name,Type,Overall Score,Response Time Score,Booking Success Rate,Satisfaction Score,Portfolio Quality,Total Bookings,Total Revenue,Avg Response Time
Elite Photography Studio,photographer,95.2,98.5,0.92,4.8,94.0,234,450000,0.8
Perfect Venues Ltd,venue,88.7,85.2,0.89,4.6,91.5,156,620000,2.1`