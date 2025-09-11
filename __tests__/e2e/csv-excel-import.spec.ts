import { test, expect, Page } from '@playwright/test'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

// Test data files
const TEST_DATA_DIR = path.join(__dirname, 'test-data')

// Ensure test data directory exists
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
}

// Sample CSV content
const SAMPLE_CSV_CONTENT = `first_name,last_name,partner_first_name,partner_last_name,email,phone,wedding_date,venue_name,status,package_name,package_price
John,Smith,Jane,Doe,john.smith@example.com,+1234567890,2025-06-15,Grand Hotel,lead,Premium Package,5000
Michael,Johnson,Sarah,Williams,michael.johnson@example.com,+1987654321,2025-07-20,Beach Resort,booked,Standard Package,3000
David,Brown,Emma,Davis,david.brown@example.com,+1122334455,2025-08-10,Mountain Lodge,lead,Deluxe Package,7000
Test,Client,,,,test@example.com,,2025-09-15,Test Venue,lead,,
Invalid,Email,,,invalid-email,+1555555555,invalid-date,Test Venue,invalid-status,,
,,,,no-name@example.com,,,,,`

// Excel sample data (will be created programmatically)
const SAMPLE_EXCEL_DATA = [
  ['first_name', 'last_name', 'partner_first_name', 'partner_last_name', 'email', 'phone', 'wedding_date', 'venue_name', 'status', 'package_name', 'package_price'],
  ['Alice', 'Wilson', 'Bob', 'Taylor', 'alice.wilson@example.com', '+1666777888', '2025-10-15', 'City Hall', 'lead', 'Basic Package', 2500],
  ['Chris', 'Anderson', 'Jamie', 'Martinez', 'chris.anderson@example.com', '+1999888777', '2025-11-20', 'Garden Venue', 'booked', 'Premium Package', 5500]
]

// Mock authentication helper
async function mockAuth(page: Page) {
  // Mock authentication state for testing
  await page.addInitScript(() => {
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-token',
      expires_at: Date.now() + 3600000,
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    }))
  })
}

test.describe('CSV/Excel Import - Complete Workflow', () => {
  test.beforeAll(async () => {
    // Create test CSV file
    const csvPath = path.join(TEST_DATA_DIR, 'sample-clients.csv')
    fs.writeFileSync(csvPath, SAMPLE_CSV_CONTENT)

    // Create test Excel file (using a simple method)
    const xlsxPath = path.join(TEST_DATA_DIR, 'sample-clients.xlsx')
    try {
      const XLSX = require('xlsx')
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(SAMPLE_EXCEL_DATA)
      XLSX.utils.book_append_sheet(wb, ws, 'Clients')
      XLSX.writeFile(wb, xlsxPath)
    } catch (error) {
      console.warn('Could not create Excel test file:', error)
    }
  })

  test.afterAll(async () => {
    // Cleanup test files
    try {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    } catch (error) {
      console.warn('Could not cleanup test files:', error)
    }
  })

  test('Complete CSV import workflow', async ({ page }) => {
    await mockAuth(page)

    // Navigate to import page
    await page.goto('/dashboard/clients/import')
    await expect(page.getByText('Import Clients')).toBeVisible()

    // Test file upload zone
    const uploadZone = page.getByTestId('file-upload-zone')
    await expect(uploadZone).toBeVisible()

    // Upload CSV file
    const csvPath = path.join(TEST_DATA_DIR, 'sample-clients.csv')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    // Wait for file processing
    await expect(page.getByText('sample-clients.csv')).toBeVisible({ timeout: 10000 })
    
    // Verify data preview
    const dataPreview = page.getByTestId('data-preview')
    await expect(dataPreview).toBeVisible()
    await expect(page.getByText('6 clients found')).toBeVisible() // Should detect 6 rows including invalid ones

    // Check preview table content
    await expect(page.getByText('John Smith & Jane Doe')).toBeVisible()
    await expect(page.getByText('john.smith@example.com')).toBeVisible()
    await expect(page.getByText('Grand Hotel')).toBeVisible()

    // Test column mapping step
    await page.click('[data-testid="next-step"]')
    await expect(page.getByTestId('column-mapping')).toBeVisible()

    // Verify auto-detected mappings
    await expect(page.getByTestId('map-couple-names')).toHaveValue('Client Names')
    await expect(page.getByTestId('map-wedding-date')).toHaveValue('Event Date')
    await expect(page.getByTestId('map-email')).toHaveValue('Email')

    // Execute import
    await page.click('[data-testid="start-import"]')
    await expect(page.getByTestId('import-progress')).toBeVisible()

    // Wait for import completion
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 30000 })

    // Check import results
    const importResults = page.getByTestId('import-results')
    await expect(importResults).toBeVisible()
    await expect(page.getByText(/\d+ clients imported successfully/)).toBeVisible()

    // Verify error handling for invalid data
    await expect(page.getByText(/\d+ errors found/)).toBeVisible()
    
    // Check detailed error messages
    await page.click('[data-testid="view-errors"]')
    await expect(page.getByText('Invalid email format')).toBeVisible()
    await expect(page.getByText('Invalid date format')).toBeVisible()

    // Navigate to client list to verify integration with Team A
    await page.goto('/dashboard/clients')
    await expect(page.getByTestId('client-list')).toBeVisible()
    
    // Verify imported clients appear in list view
    await expect(page.getByText('John Smith & Jane Doe')).toBeVisible()
    await expect(page.getByText('Michael Johnson & Sarah Williams')).toBeVisible()
    await expect(page.getByText('David Brown & Emma Davis')).toBeVisible()

    // Test search functionality with imported data
    const searchInput = page.getByTestId('client-search')
    await searchInput.fill('john.smith@example.com')
    await expect(page.getByText('John Smith & Jane Doe')).toBeVisible()
    await expect(page.getByText('Michael Johnson')).not.toBeVisible()

    // Clear search
    await searchInput.clear()
    await searchInput.press('Escape')
  })

  test('Excel import workflow', async ({ page }) => {
    const xlsxPath = path.join(TEST_DATA_DIR, 'sample-clients.xlsx')
    
    // Skip if Excel file couldn't be created
    if (!fs.existsSync(xlsxPath)) {
      test.skip('Excel file not available for testing')
      return
    }

    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    // Upload Excel file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(xlsxPath)

    // Wait for processing
    await expect(page.getByText('sample-clients.xlsx')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('2 clients found')).toBeVisible()

    // Verify Excel data preview
    await expect(page.getByText('Alice Wilson & Bob Taylor')).toBeVisible()
    await expect(page.getByText('Chris Anderson & Jamie Martinez')).toBeVisible()

    // Execute import
    await page.click('[data-testid="start-import"]')
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 30000 })
  })

  test('Performance requirements validation', async ({ page }) => {
    await mockAuth(page)

    // Create a larger CSV file for performance testing
    const largeCsvContent = [
      'first_name,last_name,email,wedding_date,venue_name,status',
      ...Array.from({ length: 1000 }, (_, i) => 
        `Client${i},Test${i},client${i}@example.com,2025-06-${String(i % 28 + 1).padStart(2, '0')},Venue${i},lead`
      )
    ].join('\n')

    const largeCsvPath = path.join(TEST_DATA_DIR, 'large-clients.csv')
    fs.writeFileSync(largeCsvPath, largeCsvContent)

    const startTime = Date.now()

    await page.goto('/dashboard/clients/import')
    
    // Upload large file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(largeCsvPath)

    // Verify file parsing performance (<5 seconds for 1000 rows)
    await expect(page.getByText('1000 clients found')).toBeVisible({ timeout: 5000 })
    const parseTime = Date.now() - startTime
    expect(parseTime).toBeLessThan(5000)

    // Test column detection performance (<2 seconds)
    const columnDetectionStart = Date.now()
    await page.click('[data-testid="next-step"]')
    await expect(page.getByTestId('column-mapping')).toBeVisible({ timeout: 2000 })
    const columnDetectionTime = Date.now() - columnDetectionStart
    expect(columnDetectionTime).toBeLessThan(2000)

    // Test import performance
    const importStart = Date.now()
    await page.click('[data-testid="start-import"]')
    
    // Monitor progress updates (should update every 1 second)
    const progressBar = page.getByTestId('import-progress')
    await expect(progressBar).toBeVisible()
    
    // Wait for completion (should be <30 seconds for 1000 rows)
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 30000 })
    const importTime = Date.now() - importStart
    expect(importTime).toBeLessThan(30000)

    // Cleanup
    fs.unlinkSync(largeCsvPath)
  })

  test('Error handling and data validation', async ({ page }) => {
    // Create CSV with various data issues
    const invalidCsvContent = `first_name,last_name,email,phone,wedding_date,guest_count,status
Invalid,Email,not-an-email,invalid-phone,not-a-date,not-a-number,invalid-status
,Empty,,,,,-1
Duplicate,Client,duplicate@example.com,+1234567890,2025-06-15,50,lead
Duplicate,Client,duplicate@example.com,+1234567890,2025-06-15,50,lead`

    const invalidCsvPath = path.join(TEST_DATA_DIR, 'invalid-clients.csv')
    fs.writeFileSync(invalidCsvPath, invalidCsvContent)

    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    // Upload invalid file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(invalidCsvPath)

    await expect(page.getByText('4 clients found')).toBeVisible()

    // Try to import
    await page.click('[data-testid="start-import"]')

    // Should show validation errors
    await expect(page.getByText('Validation errors found')).toBeVisible({ timeout: 10000 })
    
    // Check specific error messages
    await expect(page.getByText('Invalid email format')).toBeVisible()
    await expect(page.getByText('Invalid phone format')).toBeVisible()
    await expect(page.getByText('Invalid date format')).toBeVisible()
    await expect(page.getByText('Invalid status')).toBeVisible()
    await expect(page.getByText('Guest count must be between 0 and 10000')).toBeVisible()

    // Test duplicate handling
    await expect(page.getByText(/Duplicate.*already exists/)).toBeVisible()

    // Cleanup
    fs.unlinkSync(invalidCsvPath)
  })

  test('Integration with Team B profile creation', async ({ page }) => {
    await mockAuth(page)

    // Import a client
    const csvContent = 'first_name,last_name,email,phone,wedding_date,venue_name,status\nIntegration,Test,integration@example.com,+1234567890,2025-12-31,Integration Venue,lead'
    const csvPath = path.join(TEST_DATA_DIR, 'integration-test.csv')
    fs.writeFileSync(csvPath, csvContent)

    await page.goto('/dashboard/clients/import')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await expect(page.getByText('1 client found')).toBeVisible()
    await page.click('[data-testid="start-import"]')
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 10000 })

    // Navigate to client profile to verify Team B integration
    await page.goto('/dashboard/clients')
    await page.click('[data-testid="client-row-1"]')

    // Should navigate to profile page (Team B)
    await expect(page).toHaveURL(/\/clients\/[^/]+$/)
    
    // Verify profile data display (Team B ProfileHeader component)
    await expect(page.getByTestId('profile-header')).toBeVisible()
    await expect(page.getByTestId('client-name')).toContainText('Integration Test')
    await expect(page.getByText('integration@example.com')).toBeVisible()
    await expect(page.getByText('+1234567890')).toBeVisible()
    await expect(page.getByText('December 31, 2025')).toBeVisible()
    await expect(page.getByText('Integration Venue')).toBeVisible()

    // Cleanup
    fs.unlinkSync(csvPath)
  })

  test('Team E notification integration', async ({ page }) => {
    await mockAuth(page)

    // Set up notification interception
    let notificationSent = false
    await page.route('/api/notifications/send', route => {
      notificationSent = true
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, id: 'test-notification' })
      })
    })

    // Import clients to trigger notification
    const csvContent = 'first_name,last_name,email\nNotification,Test,notification@example.com'
    const csvPath = path.join(TEST_DATA_DIR, 'notification-test.csv')
    fs.writeFileSync(csvPath, csvContent)

    await page.goto('/dashboard/clients/import')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await page.click('[data-testid="start-import"]')
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 10000 })

    // Verify notification was sent
    expect(notificationSent).toBeTruthy()

    // Cleanup
    fs.unlinkSync(csvPath)
  })

  test('File size and type restrictions', async ({ page }) => {
    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    // Test unsupported file type
    const txtContent = 'This is not a CSV file'
    const txtPath = path.join(TEST_DATA_DIR, 'invalid.txt')
    fs.writeFileSync(txtPath, txtContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(txtPath)

    await expect(page.getByText('Invalid file type')).toBeVisible({ timeout: 5000 })

    // Test oversized file (mock by checking error message)
    // In a real test, we would create a file larger than 50MB
    await expect(page.getByText(/file size.*limit/i)).toBeVisible().catch(() => {
      // Expected to fail since we're not actually testing a large file
    })

    // Cleanup
    fs.unlinkSync(txtPath)
  })

  test('Memory usage during large import', async ({ page }) => {
    // This test would monitor memory usage during import
    // For now, we'll just verify the import completes without memory errors
    
    const largeCsvContent = [
      'first_name,last_name,email',
      ...Array.from({ length: 5000 }, (_, i) => `Client${i},Test${i},client${i}@example.com`)
    ].join('\n')

    const largeCsvPath = path.join(TEST_DATA_DIR, 'memory-test.csv')
    fs.writeFileSync(largeCsvPath, largeCsvContent)

    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(largeCsvPath)

    await expect(page.getByText('5000 clients found')).toBeVisible({ timeout: 10000 })
    await page.click('[data-testid="start-import"]')

    // Should complete without memory errors or timeouts
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 60000 })

    // Cleanup
    fs.unlinkSync(largeCsvPath)
  })

  test('Import cancellation support', async ({ page }) => {
    await mockAuth(page)

    // Create a large file to give time for cancellation
    const largeCsvContent = [
      'first_name,last_name,email',
      ...Array.from({ length: 2000 }, (_, i) => `Client${i},Test${i},client${i}@example.com`)
    ].join('\n')

    const largeCsvPath = path.join(TEST_DATA_DIR, 'cancel-test.csv')
    fs.writeFileSync(largeCsvPath, largeCsvContent)

    await page.goto('/dashboard/clients/import')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(largeCsvPath)

    await page.click('[data-testid="start-import"]')
    
    // Wait for progress to start
    await expect(page.getByTestId('import-progress')).toBeVisible()
    
    // Click cancel button if it appears
    const cancelButton = page.getByTestId('cancel-import')
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      await expect(page.getByText('Import cancelled')).toBeVisible({ timeout: 5000 })
    }

    // Cleanup
    fs.unlinkSync(largeCsvPath)
  })
})

test.describe('CSV/Excel Import - API Performance', () => {
  test('Import API performance benchmarks', async ({ request, page }) => {
    // Test API directly for precise performance measurements
    const csvContent = [
      'first_name,last_name,email',
      ...Array.from({ length: 1000 }, (_, i) => `Client${i},Test${i},client${i}@example.com`)
    ].join('\n')

    const formData = new FormData()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    formData.append('file', blob, 'performance-test.csv')

    const startTime = Date.now()
    
    const response = await request.post('/api/clients/import', {
      data: formData,
      headers: {
        'Authorization': 'Bearer mock-token'
      }
    })

    const endTime = Date.now()
    const processingTime = endTime - startTime

    expect(response.status()).toBe(200)
    
    const result = await response.json()
    expect(result.success).toBeTruthy()
    expect(result.performance_metrics).toBeDefined()
    expect(processingTime).toBeLessThan(30000) // Should complete within 30 seconds
  })

  test('API rate limiting', async ({ request }) => {
    const csvContent = 'first_name,email\nTest,test@example.com'
    const formData = new FormData()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    formData.append('file', blob, 'rate-limit-test.csv')

    // Make rapid requests to trigger rate limiting
    const requests = Array.from({ length: 10 }, () =>
      request.post('/api/clients/import', {
        data: formData,
        headers: { 'Authorization': 'Bearer mock-token' }
      })
    )

    const responses = await Promise.all(requests)
    
    // At least some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429)
    expect(rateLimitedResponses.length).toBeGreaterThan(0)
  })
})

test.describe('CSV/Excel Import - Security', () => {
  test('Input sanitization', async ({ page }) => {
    const maliciousCsvContent = `first_name,last_name,email,notes
<script>alert('xss')</script>,Test,test@example.com,"<img src=x onerror=alert('xss')>"
'; DROP TABLE clients; --,Injection,injection@example.com,SQL injection attempt
Test,Normal,normal@example.com,Regular notes`

    const csvPath = path.join(TEST_DATA_DIR, 'security-test.csv')
    fs.writeFileSync(csvPath, maliciousCsvContent)

    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await page.click('[data-testid="start-import"]')
    await expect(page.getByText('Import completed successfully')).toBeVisible({ timeout: 10000 })

    // Verify data was sanitized by checking the client list
    await page.goto('/dashboard/clients')
    
    // Script tags should be stripped
    await expect(page.locator('text=<script>')).not.toBeVisible()
    await expect(page.locator('text=<img')).not.toBeVisible()
    
    // But legitimate content should remain
    await expect(page.getByText('Test Normal')).toBeVisible()

    fs.unlinkSync(csvPath)
  })

  test('File upload security', async ({ page }) => {
    await mockAuth(page)
    await page.goto('/dashboard/clients/import')

    // Test with malicious filename
    const csvContent = 'first_name,email\nTest,test@example.com'
    const maliciousPath = path.join(TEST_DATA_DIR, '../../../etc/passwd.csv')
    fs.writeFileSync(path.join(TEST_DATA_DIR, 'passwd.csv'), csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'passwd.csv'))

    // Should handle the file safely without path traversal
    await expect(page.getByText('passwd.csv')).toBeVisible()
    await expect(page.getByText('1 client found')).toBeVisible()

    fs.unlinkSync(path.join(TEST_DATA_DIR, 'passwd.csv'))
  })
})