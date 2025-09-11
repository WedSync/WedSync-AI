import { test, expect, Page, BrowserContext, Download } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * WS-246: Vendor Performance Analytics System - Export Functionality E2E Testing
 * Tests data export functionality with various formats and validation
 */

test.describe('Analytics Export E2E Tests', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/analytics-export' },
      acceptDownloads: true
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
            id: 'export-test-user',
            email: 'export@photographer.com',
            role: 'supplier',
            tier: 'PROFESSIONAL'
          }
        })
      })
    })

    // Mock dashboard data API
    await page.route('**/api/analytics/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData)
      })
    })

    // Mock export APIs for different formats
    await page.route('**/api/analytics/export**', async route => {
      const requestBody = await route.request().postDataJSON()
      const format = requestBody.format
      
      let responseBody: string
      let contentType: string
      let filename: string

      switch (format) {
        case 'csv':
          responseBody = mockCSVData
          contentType = 'text/csv'
          filename = `analytics-export-${Date.now()}.csv`
          break
        case 'excel':
          responseBody = mockExcelData
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          filename = `analytics-export-${Date.now()}.xlsx`
          break
        case 'json':
          responseBody = JSON.stringify(mockJSONData)
          contentType = 'application/json'
          filename = `analytics-export-${Date.now()}.json`
          break
        case 'pdf':
          responseBody = mockPDFData
          contentType = 'application/pdf'
          filename = `analytics-report-${Date.now()}.pdf`
          break
        default:
          responseBody = mockCSVData
          contentType = 'text/csv'
          filename = 'export.csv'
      }

      await route.fulfill({
        status: 200,
        contentType,
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': responseBody.length.toString()
        },
        body: responseBody
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

  test('should display export options in dashboard', async () => {
    // Check export button is visible
    await expect(page.locator('[data-testid="export-dashboard"]')).toBeVisible()
    
    // Click export button to open modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Verify export modal opens
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-title"]')).toContainText('Export Analytics Data')

    // Check format options are available
    await expect(page.locator('[data-testid="format-csv"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-excel"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-json"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-pdf"]')).toBeVisible()

    // Check data type options
    await expect(page.locator('[data-testid="data-dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="data-vendors"]')).toBeVisible()
    await expect(page.locator('[data-testid="data-performance"]')).toBeVisible()
    await expect(page.locator('[data-testid="data-revenue"]')).toBeVisible()

    // Check date range options
    await expect(page.locator('[data-testid="date-range-selector"]')).toBeVisible()
    await expect(page.locator('[data-testid="custom-date-range"]')).toBeVisible()
  })

  test('should export dashboard data as CSV', async () => {
    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Select CSV format
    await page.click('[data-testid="format-csv"]')
    await expect(page.locator('[data-testid="format-csv"]')).toBeChecked()

    // Select dashboard data
    await page.click('[data-testid="data-dashboard"]')
    await expect(page.locator('[data-testid="data-dashboard"]')).toBeChecked()

    // Set date range
    await page.selectOption('[data-testid="date-range-selector"]', '30d')

    // Preview export options
    await expect(page.locator('[data-testid="export-preview"]')).toContainText('Dashboard metrics (last 30 days)')
    await expect(page.locator('[data-testid="estimated-size"]')).toContainText('Estimated size: ~2.5KB')

    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="start-export"]')
    ])

    // Verify download
    expect(download.suggestedFilename()).toMatch(/analytics-export-.*\.csv/)
    
    // Save and verify file content
    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8')
      expect(content).toContain('Total Vendors,Active Vendors,Total Bookings')
      expect(content).toContain('245,189,1234')
    }

    // Verify success message
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-success"]')).toContainText('Export completed successfully')
  })

  test('should export vendor data as Excel', async () => {
    // Navigate to vendors page first
    await page.goto('/analytics/vendors')
    await page.waitForLoadState('networkidle')

    // Open export from vendors page
    await page.click('[data-testid="export-vendors"]')
    
    // Select Excel format
    await page.click('[data-testid="format-excel"]')
    await expect(page.locator('[data-testid="format-excel"]')).toBeChecked()

    // Select all vendors
    await page.click('[data-testid="data-vendors-all"]')

    // Configure export options
    await page.check('[data-testid="include-metrics"]')
    await page.check('[data-testid="include-history"]')
    await page.check('[data-testid="include-contacts"]')

    // Set custom date range
    await page.click('[data-testid="custom-date-range"]')
    await page.fill('[data-testid="date-from"]', '2024-01-01')
    await page.fill('[data-testid="date-to"]', '2024-12-31')

    // Preview shows multiple sheets
    await expect(page.locator('[data-testid="excel-sheets-preview"]')).toContainText('3 sheets will be created')

    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="start-export"]')
    ])

    // Verify Excel download
    expect(download.suggestedFilename()).toMatch(/analytics-export-.*\.xlsx/)
    
    const downloadSize = fs.statSync(await download.path()!).size
    expect(downloadSize).toBeGreaterThan(1000) // Excel files should be larger than CSV
  })

  test('should export performance data as JSON', async () => {
    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Select JSON format
    await page.click('[data-testid="format-json"]')
    
    // Select performance data
    await page.click('[data-testid="data-performance"]')

    // Configure detailed options
    await page.check('[data-testid="include-raw-data"]')
    await page.check('[data-testid="include-calculations"]')
    await page.check('[data-testid="include-metadata"]')

    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="start-export"]')
    ])

    // Verify JSON download
    expect(download.suggestedFilename()).toMatch(/analytics-export-.*\.json/)
    
    // Validate JSON content
    const downloadPath = await download.path()
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8')
      const jsonData = JSON.parse(content)
      
      expect(jsonData).toHaveProperty('export_metadata')
      expect(jsonData).toHaveProperty('performance_data')
      expect(jsonData.export_metadata).toHaveProperty('timestamp')
      expect(jsonData.export_metadata).toHaveProperty('format', 'json')
    }
  })

  test('should generate PDF report', async () => {
    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Select PDF format
    await page.click('[data-testid="format-pdf"]')
    
    // PDF-specific options should appear
    await expect(page.locator('[data-testid="pdf-options"]')).toBeVisible()
    await expect(page.locator('[data-testid="include-charts"]')).toBeVisible()
    await expect(page.locator('[data-testid="include-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="report-title"]')).toBeVisible()

    // Configure PDF report
    await page.fill('[data-testid="report-title"]', 'Q4 2024 Analytics Report')
    await page.check('[data-testid="include-charts"]')
    await page.check('[data-testid="include-summary"]')
    await page.check('[data-testid="include-recommendations"]')

    // Select page orientation
    await page.selectOption('[data-testid="page-orientation"]', 'landscape')

    // Show generating indicator
    const exportPromise = page.waitForEvent('download')
    await page.click('[data-testid="start-export"]')

    // Should show PDF generation progress
    await expect(page.locator('[data-testid="pdf-generating"]')).toBeVisible()
    await expect(page.locator('[data-testid="generation-progress"]')).toContainText('Generating charts...')

    const download = await exportPromise

    // Verify PDF download
    expect(download.suggestedFilename()).toMatch(/analytics-report-.*\.pdf/)
    
    const downloadSize = fs.statSync(await download.path()!).size
    expect(downloadSize).toBeGreaterThan(5000) // PDF should be larger than text formats
  })

  test('should handle large data exports', async () => {
    // Mock large dataset API
    await page.route('**/api/analytics/export**', async route => {
      const requestBody = await route.request().postDataJSON()
      
      // Simulate processing time for large dataset
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="large-export.csv"',
          'X-Total-Records': '10000',
          'X-Export-Size': '2.5MB'
        },
        body: mockLargeCSVData
      })
    })

    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Select large dataset
    await page.click('[data-testid="data-vendors-all"]')
    await page.selectOption('[data-testid="date-range-selector"]', 'all')

    // Show size warning
    await expect(page.locator('[data-testid="large-export-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="estimated-records"]')).toContainText('~10,000 records')
    await expect(page.locator('[data-testid="estimated-size"]')).toContainText('~2.5MB')

    // Confirm large export
    await page.click('[data-testid="confirm-large-export"]')
    
    // Start export and show progress
    const exportPromise = page.waitForEvent('download')
    await page.click('[data-testid="start-export"]')

    // Should show progress indicator
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

    const download = await exportPromise
    expect(download.suggestedFilename()).toMatch(/large-export\.csv/)
  })

  test('should validate export parameters', async () => {
    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Try to export without selecting format
    await page.click('[data-testid="start-export"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="format-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="format-error"]')).toContainText('Please select an export format')

    // Select format but no data type
    await page.click('[data-testid="format-csv"]')
    await page.click('[data-testid="start-export"]')
    
    await expect(page.locator('[data-testid="data-type-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="data-type-error"]')).toContainText('Please select data to export')

    // Select invalid date range
    await page.click('[data-testid="data-dashboard"]')
    await page.click('[data-testid="custom-date-range"]')
    await page.fill('[data-testid="date-from"]', '2024-12-31')
    await page.fill('[data-testid="date-to"]', '2024-01-01') // End before start
    
    await page.click('[data-testid="start-export"]')
    
    await expect(page.locator('[data-testid="date-range-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="date-range-error"]')).toContainText('End date must be after start date')
  })

  test('should handle export failures gracefully', async () => {
    // Mock export API failure
    await page.route('**/api/analytics/export**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Export service temporarily unavailable' })
      })
    })

    // Open export modal and configure
    await page.click('[data-testid="export-dashboard"]')
    await page.click('[data-testid="format-csv"]')
    await page.click('[data-testid="data-dashboard"]')
    
    // Attempt export
    await page.click('[data-testid="start-export"]')
    
    // Should show error state
    await expect(page.locator('[data-testid="export-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Export failed')
    await expect(page.locator('[data-testid="retry-export"]')).toBeVisible()

    // Test retry functionality
    await page.route('**/api/analytics/export**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: { 'Content-Disposition': 'attachment; filename="retry-export.csv"' },
        body: mockCSVData
      })
    })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="retry-export"]')
    ])

    expect(download.suggestedFilename()).toBe('retry-export.csv')
  })

  test('should track export history', async () => {
    // Perform several exports
    const exports = [
      { format: 'csv', data: 'dashboard' },
      { format: 'excel', data: 'vendors' },
      { format: 'json', data: 'performance' }
    ]

    for (const exp of exports) {
      await page.click('[data-testid="export-dashboard"]')
      await page.click(`[data-testid="format-${exp.format}"]`)
      await page.click(`[data-testid="data-${exp.data}"]`)
      
      await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="start-export"]')
      ])

      // Close modal
      await page.click('[data-testid="close-export-modal"]')
      await page.waitForTimeout(500)
    }

    // Open export history
    await page.click('[data-testid="export-dashboard"]')
    await page.click('[data-testid="view-export-history"]')

    // Verify export history
    await expect(page.locator('[data-testid="export-history"]')).toBeVisible()
    
    const historyItems = page.locator('[data-testid="history-item"]')
    await expect(historyItems).toHaveCount(3)

    // Check history details
    await expect(historyItems.nth(0)).toContainText('JSON')
    await expect(historyItems.nth(0)).toContainText('Performance data')
    await expect(historyItems.nth(1)).toContainText('Excel')
    await expect(historyItems.nth(1)).toContainText('Vendors')
    await expect(historyItems.nth(2)).toContainText('CSV')
    await expect(historyItems.nth(2)).toContainText('Dashboard')

    // Test re-download from history
    const [redownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="redownload-0"]')
    ])

    expect(redownload).toBeTruthy()
  })

  test('should support scheduled exports', async () => {
    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Switch to scheduled export tab
    await page.click('[data-testid="scheduled-export-tab"]')
    
    // Configure scheduled export
    await page.click('[data-testid="format-csv"]')
    await page.click('[data-testid="data-dashboard"]')
    await page.selectOption('[data-testid="schedule-frequency"]', 'weekly')
    await page.selectOption('[data-testid="schedule-day"]', 'monday')
    await page.fill('[data-testid="schedule-time"]', '09:00')
    await page.fill('[data-testid="schedule-email"]', 'reports@wedsync.com')

    // Create schedule
    await page.click('[data-testid="create-schedule"]')

    // Verify schedule created
    await expect(page.locator('[data-testid="schedule-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="schedule-success"]')).toContainText('Scheduled export created')

    // View active schedules
    await expect(page.locator('[data-testid="active-schedules"]')).toBeVisible()
    const scheduleItem = page.locator('[data-testid="schedule-item"]')
    await expect(scheduleItem).toContainText('Weekly on Monday at 09:00')
    await expect(scheduleItem).toContainText('Dashboard data (CSV)')

    // Test schedule management
    await page.click('[data-testid="edit-schedule"]')
    await expect(page.locator('[data-testid="edit-schedule-modal"]')).toBeVisible()

    await page.click('[data-testid="cancel-edit"]')
    await page.click('[data-testid="delete-schedule"]')
    await page.click('[data-testid="confirm-delete"]')

    await expect(page.locator('[data-testid="schedule-deleted"]')).toBeVisible()
  })

  test('should export with custom filters applied', async () => {
    // Apply filters first
    await page.selectOption('[data-testid="vendor-type-filter"]', 'photographer')
    await page.selectOption('[data-testid="score-range-filter"]', 'high')
    await page.fill('[data-testid="search-vendors"]', 'studio')
    await page.press('[data-testid="search-vendors"]', 'Enter')
    await page.waitForTimeout(500)

    // Open export modal
    await page.click('[data-testid="export-dashboard"]')
    
    // Should show applied filters in export options
    await expect(page.locator('[data-testid="applied-filters"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-type"]')).toContainText('Type: photographer')
    await expect(page.locator('[data-testid="filter-score"]')).toContainText('Score: high')
    await expect(page.locator('[data-testid="filter-search"]')).toContainText('Search: studio')

    // Option to export with or without filters
    await expect(page.locator('[data-testid="export-with-filters"]')).toBeChecked()
    await expect(page.locator('[data-testid="export-all-data"]')).not.toBeChecked()

    // Configure export
    await page.click('[data-testid="format-csv"]')
    await page.click('[data-testid="data-vendors"]')

    // Export with filters applied
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="start-export"]')
    ])

    // Verify filtered export filename
    expect(download.suggestedFilename()).toMatch(/filtered.*\.csv/)
  })

  test('should handle concurrent exports', async () => {
    // Start multiple exports simultaneously
    const exportPromises = []

    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="export-dashboard"]')
      await page.click('[data-testid="format-csv"]')
      await page.click('[data-testid="data-dashboard"]')
      
      exportPromises.push(
        Promise.all([
          page.waitForEvent('download'),
          page.click('[data-testid="start-export"]')
        ])
      )

      // Small delay between starting exports
      await page.waitForTimeout(100)
      await page.click('[data-testid="close-export-modal"]')
    }

    // Wait for all exports to complete
    const downloads = await Promise.all(exportPromises)
    
    // Verify all exports completed
    expect(downloads).toHaveLength(3)
    downloads.forEach(([download]) => {
      expect(download.suggestedFilename()).toMatch(/analytics-export-.*\.csv/)
    })

    // Check no export conflicts occurred
    const downloadPaths = await Promise.all(
      downloads.map(([download]) => download.path())
    )
    
    const uniquePaths = new Set(downloadPaths)
    expect(uniquePaths.size).toBe(3) // All downloads should have unique paths
  })
})

// Mock data for testing exports
const mockDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6
  },
  performance_trends: [
    { date: '2024-01-01', bookings: 45, revenue: 67500 },
    { date: '2024-01-08', bookings: 52, revenue: 78900 },
    { date: '2024-01-15', bookings: 48, revenue: 72300 }
  ]
}

const mockCSVData = `Total Vendors,Active Vendors,Total Bookings,Total Revenue,Avg Response Time,Satisfaction Rate
245,189,1234,2450000,2.3,4.6
Date,Bookings,Revenue
2024-01-01,45,67500
2024-01-08,52,78900
2024-01-15,48,72300`

const mockExcelData = 'Mock Excel file content (binary data would go here)'

const mockJSONData = {
  export_metadata: {
    timestamp: '2025-01-15T10:00:00Z',
    format: 'json',
    version: '1.0'
  },
  performance_data: mockDashboardData
}

const mockPDFData = 'Mock PDF file content (binary data would go here)'

const mockLargeCSVData = Array.from({ length: 1000 }, (_, i) => 
  `Vendor ${i},Type ${i % 5},${Math.random() * 100},${Math.random() * 5}`
).join('\n')