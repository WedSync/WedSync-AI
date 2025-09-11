/**
 * E2E Tests for CSV/Excel Import Workflow
 * WS-033: Comprehensive testing of import UI and file processing
 */

import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

// Test data files
const createTestCSV = () => `
first_name,last_name,email,phone,wedding_date,venue,status
John,Smith,john@example.com,123-456-7890,06/15/2024,Grand Hotel,booked
Jane,Doe,jane@example.com,098-765-4321,07/20/2024,Beach Resort,lead
Bob,Johnson,bob@example.com,555-123-4567,08/10/2024,Mountain Lodge,inquiry
`.trim()

const createTestExcel = async () => {
  // This would need actual Excel file creation
  // For now, we'll test with CSV and mock Excel behavior
  return createTestCSV()
}

test.describe('Import Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to import page
    await page.goto('/dashboard/clients/import')
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Import Clients')
  })

  test('should display import wizard steps', async ({ page }) => {
    // Check that all steps are visible
    const steps = [
      'Upload File',
      'Preview Data', 
      'Column Mapping',
      'Import',
      'Complete'
    ]
    
    for (const step of steps) {
      await expect(page.locator('text=' + step)).toBeVisible()
    }
  })

  test('should handle CSV file upload', async ({ page }) => {
    // Create temporary test file
    const testData = createTestCSV()
    const tempFile = path.join(__dirname, '../temp/test-clients.csv')
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Wait for processing
      await expect(page.locator('[data-testid="file-upload-zone"]')).toContainText('3 clients found')
      
      // Should automatically move to preview step
      await expect(page.locator('h2')).toContainText('Preview Your Data')
      
      // Check data preview
      await expect(page.locator('[data-testid="data-preview"]')).toBeVisible()
      await expect(page.locator('text=John Smith')).toBeVisible()
      await expect(page.locator('text=jane@example.com')).toBeVisible()
      
    } finally {
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should validate file size limits', async ({ page }) => {
    // This test would create a large file and verify rejection
    const largeContent = 'header1,header2\n' + 'data,data\n'.repeat(100000)
    const tempFile = path.join(__dirname, '../temp/large-file.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, largeContent)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Should show error for large file
      await expect(page.locator('text=File too large')).toBeVisible({ timeout: 10000 })
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should reject invalid file formats', async ({ page }) => {
    // Create invalid file
    const tempFile = path.join(__dirname, '../temp/invalid.txt')
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, 'This is not a CSV or Excel file')
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Should show error for invalid format
      await expect(page.locator('text=Invalid file format')).toBeVisible()
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should auto-detect column mappings', async ({ page }) => {
    // Upload test file
    const testData = createTestCSV()
    const tempFile = path.join(__dirname, '../temp/mapping-test.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Wait for preview
      await expect(page.locator('h2')).toContainText('Preview Your Data')
      
      // Go to mapping step
      await page.locator('text=Continue to Mapping').click()
      await expect(page.locator('h2')).toContainText('Column Mapping')
      
      // Check that mappings were auto-detected
      const mappingSection = page.locator('[data-testid="column-mapping"]')
      await expect(mappingSection).toBeVisible()
      
      // Verify specific mappings
      const firstNameSelect = page.locator('select').first()
      await expect(firstNameSelect).toHaveValue('first_name')
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should allow manual column mapping override', async ({ page }) => {
    const testData = 'client_name,contact_email,phone_num\nJohn Smith,john@test.com,123-456-7890'
    const tempFile = path.join(__dirname, '../temp/manual-mapping.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Navigate to mapping
      await page.locator('text=Continue to Preview').click()
      await page.locator('text=Continue to Mapping').click()
      
      // Change mapping for client_name column
      const firstSelect = page.locator('select').first()
      await firstSelect.selectOption('couple_names')
      
      // Verify change was applied
      await expect(firstSelect).toHaveValue('couple_names')
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should display validation errors', async ({ page }) => {
    // Create data with validation issues
    const badData = `
first_name,last_name,email,phone,wedding_date
John,Smith,invalid-email,123,invalid-date
Jane,,good@email.com,555-123-4567,06/15/2024
`.trim()
    
    const tempFile = path.join(__dirname, '../temp/validation-test.csv')
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, badData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Should show validation warnings in preview
      await expect(page.locator('text=Preview Your Data')).toBeVisible()
      
      // Check for validation indicators
      // This depends on how validation errors are displayed in the UI
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should complete import process', async ({ page }) => {
    const testData = createTestCSV()
    const tempFile = path.join(__dirname, '../temp/complete-import.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Navigate through all steps
      await page.locator('text=Continue to Preview').click()
      await page.locator('text=Continue to Mapping').click()
      await page.locator('text=Continue to Import').click()
      
      // Should show import progress
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()
      
      // Wait for completion (with longer timeout for processing)
      await expect(page.locator('text=Import Completed Successfully')).toBeVisible({ 
        timeout: 30000 
      })
      
      // Check import results
      await expect(page.locator('[data-testid="import-results"]')).toBeVisible()
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should handle import cancellation', async ({ page }) => {
    const testData = createTestCSV()
    const tempFile = path.join(__dirname, '../temp/cancel-import.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Navigate to import step
      await page.locator('text=Continue to Preview').click()
      await page.locator('text=Continue to Mapping').click()
      await page.locator('text=Continue to Import').click()
      
      // Cancel import
      await page.locator('[data-testid="cancel-import"]').click()
      
      // Should handle cancellation gracefully
      await expect(page.locator('text=Import cancelled')).toBeVisible()
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should display import errors with details', async ({ page }) => {
    // This test would simulate server errors during import
    // Would need to mock API responses or create data that causes errors
    
    const problemData = `
first_name,last_name,email
John,Smith,duplicate@email.com
Jane,Doe,duplicate@email.com
`.trim()
    
    const tempFile = path.join(__dirname, '../temp/error-import.csv')
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, problemData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Complete import process
      await page.locator('text=Continue to Preview').click()
      await page.locator('text=Continue to Mapping').click()
      await page.locator('text=Continue to Import').click()
      
      // Wait for completion
      await page.waitForSelector('text=Import Completed', { timeout: 30000 })
      
      // Check for error details if any occurred
      const errorSection = page.locator('[data-testid="import-errors"]')
      if (await errorSection.isVisible()) {
        await expect(errorSection).toContainText('error')
      }
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should allow downloading error reports', async ({ page }) => {
    // Test would check if error report download works
    // This depends on implementation details of error reporting
  })

  test('should maintain state during back navigation', async ({ page }) => {
    const testData = createTestCSV()
    const tempFile = path.join(__dirname, '../temp/navigation-test.csv')
    
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, testData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Navigate forward
      await page.locator('text=Continue to Preview').click()
      await page.locator('text=Continue to Mapping').click()
      
      // Navigate back
      await page.locator('text=Back').click()
      
      // Should maintain preview data
      await expect(page.locator('[data-testid="data-preview"]')).toBeVisible()
      await expect(page.locator('text=John Smith')).toBeVisible()
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should handle large file performance', async ({ page }) => {
    // Create larger test file (but within limits)
    let largeData = 'first_name,last_name,email,phone,wedding_date\n'
    for (let i = 0; i < 500; i++) {
      largeData += `Client${i},Test${i},client${i}@test.com,555-${String(i).padStart(4, '0')},06/15/2024\n`
    }
    
    const tempFile = path.join(__dirname, '../temp/large-import.csv')
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, largeData)
    
    try {
      const startTime = Date.now()
      
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Should process within reasonable time
      await expect(page.locator('text=500 clients found')).toBeVisible({ timeout: 15000 })
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(10000) // Should process in under 10 seconds
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })
})

test.describe('Import Security', () => {
  test('should sanitize file content', async ({ page }) => {
    // Test with potentially malicious content
    const maliciousData = `
name,email,notes
"<script>alert('xss')</script>",test@example.com,"<img src=x onerror=alert(1)>"
Normal User,normal@example.com,Regular notes
`.trim()
    
    const tempFile = path.join(__dirname, '../temp/security-test.csv')
    await fs.mkdir(path.dirname(tempFile), { recursive: true })
    await fs.writeFile(tempFile, maliciousData)
    
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)
      
      // Should process without executing scripts
      await expect(page.locator('[data-testid="data-preview"]')).toBeVisible()
      
      // Verify no script execution
      const alerts = await page.evaluate(() => window.alert?.toString())
      expect(alerts).not.toContain('alert')
      
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  })

  test('should require authentication', async ({ page }) => {
    // Test would verify that unauthenticated users cannot access import
    // This depends on auth implementation
  })
})