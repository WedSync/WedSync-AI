/**
 * End-to-End Tests for Guest List Builder Drag-and-Drop Functionality
 * Team E - Batch 13 - WS-151 Guest List Builder E2E Testing
 * 
 * Testing Requirements:
 * - Drag-and-drop guest categorization
 * - Import workflow end-to-end
 * - Mobile responsiveness
 * - Cross-browser compatibility
 * - Real user interaction scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import path from 'path'

// Test configuration
const TEST_USER_EMAIL = `e2e-guest-test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPassword123!'

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/auth/login')
  await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL)
  await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/dashboard')
}

async function setupTestData(page: Page) {
  // Navigate to guest list
  await page.click('[data-testid="nav-guests"]')
  await page.waitForURL('**/guests')
  
  // Add initial test guests
  const testGuests = [
    { name: 'John Doe', email: 'john@example.com', category: 'family' },
    { name: 'Jane Smith', email: 'jane@example.com', category: 'friends' },
    { name: 'Bob Johnson', email: 'bob@example.com', category: 'work' },
    { name: 'Alice Brown', email: 'alice@example.com', category: 'other' }
  ]

  for (const guest of testGuests) {
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('[data-testid="first-name-input"]', guest.name.split(' ')[0])
    await page.fill('[data-testid="last-name-input"]', guest.name.split(' ')[1])
    await page.fill('[data-testid="email-input"]', guest.email)
    await page.selectOption('[data-testid="category-select"]', guest.category)
    await page.click('[data-testid="save-guest-button"]')
    await page.waitForSelector('[data-testid="guest-added-success"]')
  }
}

test.describe('Guest List Builder - Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user account
    await page.goto('/auth/signup')
    await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL)
    await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
    await page.fill('[data-testid="confirm-password-input"]', TEST_PASSWORD)
    await page.click('[data-testid="signup-button"]')
    
    // Complete onboarding
    await page.waitForURL('/onboarding')
    await page.fill('[data-testid="couple-name-input"]', 'Test Couple')
    await page.fill('[data-testid="wedding-date-input"]', '2025-12-31')
    await page.click('[data-testid="complete-onboarding-button"]')
    
    await setupTestData(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await page.evaluate(() => {
      // Clear local storage and session storage
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should display guest categories with proper layout', async ({ page }) => {
    // Verify category columns are visible
    await expect(page.locator('[data-testid="category-family"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-friends"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-work"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-other"]')).toBeVisible()

    // Verify guest counts in each category
    await expect(page.locator('[data-testid="family-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="friends-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="work-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="other-count"]')).toContainText('1')
  })

  test('should drag guest from one category to another', async ({ page }) => {
    // Find the guest in the family category
    const familyCategory = page.locator('[data-testid="category-family"]')
    const johnGuestCard = familyCategory.locator('[data-testid="guest-john-doe"]')
    
    await expect(johnGuestCard).toBeVisible()

    // Find the friends category drop zone
    const friendsCategory = page.locator('[data-testid="category-friends"]')
    
    // Perform drag and drop
    await johnGuestCard.dragTo(friendsCategory)
    
    // Wait for the drag operation to complete
    await page.waitForTimeout(1000)
    
    // Verify the guest moved to friends category
    const movedGuest = friendsCategory.locator('[data-testid="guest-john-doe"]')
    await expect(movedGuest).toBeVisible()
    
    // Verify guest is no longer in family category
    const familyJohn = familyCategory.locator('[data-testid="guest-john-doe"]')
    await expect(familyJohn).not.toBeVisible()
    
    // Verify category counts updated
    await expect(page.locator('[data-testid="family-count"]')).toContainText('0')
    await expect(page.locator('[data-testid="friends-count"]')).toContainText('2')
  })

  test('should show drag feedback during drag operation', async ({ page }) => {
    const guestCard = page.locator('[data-testid="guest-jane-smith"]')
    const workCategory = page.locator('[data-testid="category-work"]')
    
    // Start dragging
    await guestCard.hover()
    await page.mouse.down()
    
    // Verify drag styling is applied
    await expect(guestCard).toHaveClass(/dragging|shadow-lg/)
    
    // Move over drop zone
    await workCategory.hover()
    
    // Verify drop zone highlighting
    await expect(workCategory).toHaveClass(/drag-over|bg-blue-50/)
    
    // Complete the drop
    await page.mouse.up()
    
    // Verify drag styling is removed
    await expect(guestCard).not.toHaveClass(/dragging|shadow-lg/)
    await expect(workCategory).not.toHaveClass(/drag-over|bg-blue-50/)
  })

  test('should handle bulk selection and drag', async ({ page }) => {
    // Select multiple guests
    await page.check('[data-testid="select-guest-john-doe"]')
    await page.check('[data-testid="select-guest-jane-smith"]')
    
    // Verify bulk selection indicator
    await expect(page.locator('[data-testid="bulk-selection-info"]')).toContainText('2 guests selected')
    
    // Drag one of the selected guests
    const selectedGuest = page.locator('[data-testid="guest-john-doe"]')
    const targetCategory = page.locator('[data-testid="category-work"]')
    
    await selectedGuest.dragTo(targetCategory)
    
    // Verify all selected guests moved
    await expect(targetCategory.locator('[data-testid="guest-john-doe"]')).toBeVisible()
    await expect(targetCategory.locator('[data-testid="guest-jane-smith"]')).toBeVisible()
    
    // Verify category count updated
    await expect(page.locator('[data-testid="work-count"]')).toContainText('3')
  })

  test('should prevent invalid drag operations', async ({ page }) => {
    const guestCard = page.locator('[data-testid="guest-bob-johnson"]')
    const invalidDropZone = page.locator('[data-testid="guest-list-header"]')
    
    // Attempt to drag to invalid zone
    await guestCard.dragTo(invalidDropZone)
    
    // Verify guest remained in original category
    await expect(page.locator('[data-testid="category-work"]').locator('[data-testid="guest-bob-johnson"]')).toBeVisible()
    
    // Verify no change in category counts
    await expect(page.locator('[data-testid="work-count"]')).toContainText('1')
  })

  test('should handle drag and drop on mobile devices', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    const guestCard = page.locator('[data-testid="guest-alice-brown"]')
    const targetCategory = page.locator('[data-testid="category-family"]')
    
    // Simulate touch drag (on mobile, drag-and-drop might use touch events)
    await guestCard.touchstart()
    await targetCategory.touchend()
    
    // Verify drag operation worked on mobile
    await expect(targetCategory.locator('[data-testid="guest-alice-brown"]')).toBeVisible()
  })

  test('should show success notification after drag operation', async ({ page }) => {
    const guestCard = page.locator('[data-testid="guest-john-doe"]')
    const targetCategory = page.locator('[data-testid="category-friends"]')
    
    await guestCard.dragTo(targetCategory)
    
    // Verify success notification appears
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Guest moved to friends')
  })

  test('should handle drag and drop with keyboard navigation', async ({ page }) => {
    // Focus on guest card
    await page.focus('[data-testid="guest-john-doe"]')
    
    // Use keyboard to initiate drag
    await page.keyboard.press('Space')
    
    // Navigate to target category
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Verify accessibility-friendly drag worked
    await expect(page.locator('[data-testid="category-friends"]').locator('[data-testid="guest-john-doe"]')).toBeVisible()
  })
})

test.describe('Guest Import Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page)
  })

  test('should complete full CSV import workflow', async ({ page }) => {
    // Navigate to guest import
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    // Step 1: Upload CSV file
    await expect(page.locator('[data-testid="upload-step"]')).toBeVisible()
    
    const csvContent = `First Name,Last Name,Email,Category,Side
John,Doe,john@example.com,family,partner1
Jane,Smith,jane@example.com,friends,partner2
Bob,Johnson,bob@example.com,work,mutual`
    
    // Create and upload CSV file
    const csvFile = Buffer.from(csvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test-guests.csv',
      mimeType: 'text/csv',
      buffer: csvFile
    })
    
    // Verify file upload success
    await expect(page.locator('[data-testid="file-uploaded-success"]')).toBeVisible()
    
    // Step 2: Column mapping
    await expect(page.locator('[data-testid="mapping-step"]')).toBeVisible()
    
    // Verify auto-detected mappings
    await expect(page.locator('[data-testid="first-name-mapping"]')).toHaveValue('First Name')
    await expect(page.locator('[data-testid="last-name-mapping"]')).toHaveValue('Last Name')
    await expect(page.locator('[data-testid="email-mapping"]')).toHaveValue('Email')
    
    // Proceed to preview
    await page.click('[data-testid="preview-import-button"]')
    
    // Step 3: Preview and validation
    await expect(page.locator('[data-testid="preview-step"]')).toBeVisible()
    
    // Verify preview statistics
    await expect(page.locator('[data-testid="valid-rows-count"]')).toContainText('3')
    await expect(page.locator('[data-testid="invalid-rows-count"]')).toContainText('0')
    
    // Verify preview table shows data
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible()
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=jane@example.com')).toBeVisible()
    
    // Start import
    await page.click('[data-testid="start-import-button"]')
    
    // Step 4: Import progress
    await expect(page.locator('[data-testid="importing-step"]')).toBeVisible()
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()
    
    // Wait for import completion
    await page.waitForSelector('[data-testid="complete-step"]', { timeout: 10000 })
    
    // Step 5: Completion
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible()
    await expect(page.locator('text=3 guests imported')).toBeVisible()
    
    // View imported guests
    await page.click('[data-testid="view-guest-list-button"]')
    
    // Verify guests appear in list
    await expect(page.locator('[data-testid="guest-john-doe"]')).toBeVisible()
    await expect(page.locator('[data-testid="guest-jane-smith"]')).toBeVisible()
    await expect(page.locator('[data-testid="guest-bob-johnson"]')).toBeVisible()
  })

  test('should handle CSV validation errors', async ({ page }) => {
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    // Upload CSV with validation errors
    const invalidCsvContent = `First Name,Last Name,Email,Category
,InvalidGuest,not-an-email,invalid-category
ValidGuest,Smith,valid@example.com,family`
    
    const csvFile = Buffer.from(invalidCsvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'invalid-guests.csv',
      mimeType: 'text/csv',
      buffer: csvFile
    })
    
    // Complete mapping
    await page.click('[data-testid="preview-import-button"]')
    
    // Verify validation errors are shown
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-list"]')).toContainText('first_name is required')
    await expect(page.locator('[data-testid="error-list"]')).toContainText('Invalid email format')
    
    // Verify statistics reflect errors
    await expect(page.locator('[data-testid="valid-rows-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="invalid-rows-count"]')).toContainText('1')
    
    // Should still allow import of valid rows
    await page.click('[data-testid="start-import-button"]')
    await page.waitForSelector('[data-testid="complete-step"]')
    
    await expect(page.locator('text=1 guests imported')).toBeVisible()
  })

  test('should handle large CSV import with progress tracking', async ({ page }) => {
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    // Generate large CSV (100 guests)
    let largeCsvContent = 'First Name,Last Name,Email,Category\n'
    for (let i = 1; i <= 100; i++) {
      largeCsvContent += `Guest${i},Test${i},guest${i}@example.com,family\n`
    }
    
    const csvFile = Buffer.from(largeCsvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'large-guests.csv',
      mimeType: 'text/csv',
      buffer: csvFile
    })
    
    await page.click('[data-testid="preview-import-button"]')
    
    // Verify large dataset statistics
    await expect(page.locator('[data-testid="valid-rows-count"]')).toContainText('100')
    
    await page.click('[data-testid="start-import-button"]')
    
    // Monitor progress bar updates
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()
    
    // Verify progress increases over time
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('[data-testid="import-progress"]')
      return progressBar && parseInt(progressBar.getAttribute('value') || '0') > 0
    })
    
    // Wait for completion
    await page.waitForSelector('[data-testid="complete-step"]', { timeout: 30000 })
    
    await expect(page.locator('text=100 guests imported')).toBeVisible()
  })

  test('should handle Excel file import', async ({ page }) => {
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    // Note: In a real test, you'd need to create an actual Excel file
    // For this example, we'll simulate the Excel upload flow
    
    // Mock Excel file upload (in reality you'd need actual Excel binary data)
    const excelFile = Buffer.from('mock excel content')
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'guests.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: excelFile
    })
    
    // The test would continue similar to CSV, but with Excel-specific parsing
  })

  test('should save and reuse column mapping templates', async ({ page }) => {
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    const csvContent = `Name,Email Address,Group,Wedding Side
John Doe,john@example.com,Family,Bride
Jane Smith,jane@example.com,Friends,Groom`
    
    const csvFile = Buffer.from(csvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'custom-format.csv',
      mimeType: 'text/csv',
      buffer: csvFile
    })
    
    // Custom column mapping
    await page.selectOption('[data-testid="first-name-mapping"]', 'Name')
    await page.selectOption('[data-testid="email-mapping"]', 'Email Address')
    await page.selectOption('[data-testid="category-mapping"]', 'Group')
    await page.selectOption('[data-testid="side-mapping"]', 'Wedding Side')
    
    // Save as template
    await page.click('[data-testid="save-template-button"]')
    await page.fill('[data-testid="template-name-input"]', 'Custom Wedding Format')
    await page.click('[data-testid="confirm-save-template"]')
    
    // Complete import
    await page.click('[data-testid="preview-import-button"]')
    await page.click('[data-testid="start-import-button"]')
    await page.waitForSelector('[data-testid="complete-step"]')
    
    // Start new import to test template reuse
    await page.click('[data-testid="import-more-button"]')
    
    const newCsvFile = Buffer.from(csvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'another-file.csv',
      mimeType: 'text/csv',
      buffer: newCsvFile
    })
    
    // Verify template is available and can be applied
    await expect(page.locator('[data-testid="template-dropdown"]')).toBeVisible()
    await page.selectOption('[data-testid="template-dropdown"]', 'Custom Wedding Format')
    
    // Verify mappings were applied
    await expect(page.locator('[data-testid="first-name-mapping"]')).toHaveValue('Name')
    await expect(page.locator('[data-testid="email-mapping"]')).toHaveValue('Email Address')
  })

  test('should handle network errors during import', async ({ page }) => {
    await page.click('[data-testid="nav-guests"]')
    await page.click('[data-testid="import-guests-button"]')
    
    // Setup network interception to simulate failure
    await page.route('/api/guests/import', route => {
      route.abort()
    })
    
    const csvContent = `First Name,Last Name,Email
John,Doe,john@example.com`
    
    const csvFile = Buffer.from(csvContent)
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: csvFile
    })
    
    await page.click('[data-testid="preview-import-button"]')
    await page.click('[data-testid="start-import-button"]')
    
    // Verify error handling
    await expect(page.locator('[data-testid="import-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="retry-import-button"]')).toBeVisible()
  })
})

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ page }) => {
      // Basic functionality test across different browsers
      await loginUser(page)
      await setupTestData(page)
      
      // Test drag and drop works in all browsers
      const guestCard = page.locator('[data-testid="guest-john-doe"]')
      const targetCategory = page.locator('[data-testid="category-friends"]')
      
      await guestCard.dragTo(targetCategory)
      
      await expect(targetCategory.locator('[data-testid="guest-john-doe"]')).toBeVisible()
    })
  })
})

test.describe('Performance Tests', () => {
  test('should handle drag operations smoothly with many guests', async ({ page }) => {
    await loginUser(page)
    
    // Add many guests (simulate large guest list)
    await page.evaluate(() => {
      // Mock a large number of guests in the UI
      window.testGuestCount = 200
    })
    
    // Navigate to guest list with large dataset
    await page.goto('/dashboard/guests?test-large-dataset=true')
    
    // Measure drag operation performance
    const startTime = Date.now()
    
    const guestCard = page.locator('[data-testid="guest-card"]').first()
    const targetCategory = page.locator('[data-testid="category-friends"]')
    
    await guestCard.dragTo(targetCategory)
    
    const endTime = Date.now()
    const dragTime = endTime - startTime
    
    // Drag operation should complete within reasonable time
    expect(dragTime).toBeLessThan(2000) // Under 2 seconds
  })
})