// WS-077 Guest List Manager - Comprehensive E2E Tests
// TDD Implementation - Tests written FIRST
// Testing 180+ guest capacity with performance requirements

import { test, expect } from '@playwright/test'

test.describe('WS-077 Guest List Manager - Comprehensive System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment with sample couple
    await page.goto('/dashboard/clients/test-couple-id/guests')
    await page.waitForLoadState('networkidle')
  })

  test('should load guest list within 1 second performance requirement', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to guest management
    await page.goto('/dashboard/clients/test-couple-id/guests')
    
    // Wait for guest list to load
    await page.waitForSelector('[data-testid="guest-list-container"]', { timeout: 30000 })
    
    const loadTime = Date.now() - startTime
    
    // Performance requirement: <1s load time
    expect(loadTime).toBeLessThan(1000)
    
    // Verify guest list is visible
    await expect(page.locator('[data-testid="guest-list-container"]')).toBeVisible()
  })

  test('should support filtering with <200ms response time', async ({ page }) => {
    // Load initial guest list
    await page.waitForSelector('[data-testid="guest-search-input"]')
    
    const startTime = Date.now()
    
    // Perform search filter
    await page.fill('[data-testid="guest-search-input"]', 'John')
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="guest-table-row"]', { timeout: 5000 })
    
    const filterTime = Date.now() - startTime
    
    // Performance requirement: <200ms filtering
    expect(filterTime).toBeLessThan(200)
    
    // Verify filtered results
    const visibleRows = await page.locator('[data-testid="guest-table-row"]').count()
    expect(visibleRows).toBeGreaterThan(0)
  })

  test('should add new guest with family relationship', async ({ page }) => {
    // Click add guest button
    await page.click('[data-testid="add-guest-button"]')
    
    // Wait for modal
    await page.waitForSelector('[data-testid="add-guest-modal"]')
    
    // Fill guest information
    await page.fill('[data-testid="guest-first-name"]', 'John')
    await page.fill('[data-testid="guest-last-name"]', 'Smith')
    await page.fill('[data-testid="guest-email"]', 'john.smith@example.com')
    await page.fill('[data-testid="guest-phone"]', '+1234567890')
    
    // Select category
    await page.selectOption('[data-testid="guest-category"]', 'family')
    
    // Select side
    await page.selectOption('[data-testid="guest-side"]', 'partner1')
    
    // Add dietary restrictions
    await page.fill('[data-testid="guest-dietary-restrictions"]', 'Vegetarian')
    
    // Submit form
    await page.click('[data-testid="save-guest-button"]')
    
    // Wait for modal to close
    await page.waitForSelector('[data-testid="add-guest-modal"]', { state: 'hidden' })
    
    // Verify guest appears in list
    await expect(page.locator('text=John Smith')).toBeVisible()
    await expect(page.locator('text=john.smith@example.com')).toBeVisible()
    await expect(page.locator('text=Vegetarian')).toBeVisible()
  })

  test('should manage RSVP status tracking', async ({ page }) => {
    // Wait for guest table to load
    await page.waitForSelector('[data-testid="guest-table-row"]')
    
    // Find first guest row
    const firstGuestRow = page.locator('[data-testid="guest-table-row"]').first()
    
    // Click RSVP status dropdown
    await firstGuestRow.locator('[data-testid="rsvp-status-select"]').click()
    
    // Select "attending"
    await page.click('[data-testid="rsvp-option-attending"]')
    
    // Verify status update
    await expect(firstGuestRow.locator('text=attending')).toBeVisible()
    
    // Check if RSVP date is recorded
    await expect(firstGuestRow.locator('[data-testid="rsvp-date"]')).toBeVisible()
  })

  test('should handle household grouping', async ({ page }) => {
    // Switch to household view
    await page.click('[data-testid="view-households-button"]')
    
    // Wait for household view to load
    await page.waitForSelector('[data-testid="household-container"]')
    
    // Verify household groupings are visible
    await expect(page.locator('[data-testid="household-card"]')).toHaveCount({ min: 1 })
    
    // Click create household button
    await page.click('[data-testid="create-household-button"]')
    
    // Fill household name
    await page.fill('[data-testid="household-name-input"]', 'Smith Family')
    
    // Select guests for household
    await page.check('[data-testid="guest-checkbox-1"]')
    await page.check('[data-testid="guest-checkbox-2"]')
    
    // Create household
    await page.click('[data-testid="create-household-submit"]')
    
    // Verify household created
    await expect(page.locator('text=Smith Family')).toBeVisible()
  })

  test('should import CSV with 180+ guests', async ({ page }) => {
    // Click import button
    await page.click('[data-testid="import-guests-button"]')
    
    // Wait for import wizard
    await page.waitForSelector('[data-testid="import-wizard-modal"]')
    
    // Upload test CSV with 180+ guests
    const fileInput = page.locator('[data-testid="file-upload-input"]')
    await fileInput.setInputFiles('./tests/fixtures/large-guest-list-180.csv')
    
    // Proceed to mapping step
    await page.click('[data-testid="upload-next-button"]')
    
    // Wait for field mapping
    await page.waitForSelector('[data-testid="field-mapping-container"]')
    
    // Map required fields
    await page.selectOption('[data-testid="mapping-first-name"]', 'First Name')
    await page.selectOption('[data-testid="mapping-last-name"]', 'Last Name')
    await page.selectOption('[data-testid="mapping-email"]', 'Email')
    
    // Proceed to preview
    await page.click('[data-testid="mapping-next-button"]')
    
    // Wait for preview
    await page.waitForSelector('[data-testid="import-preview-container"]')
    
    // Verify preview shows 180+ guests
    const previewCount = await page.locator('[data-testid="preview-guest-count"]').textContent()
    expect(parseInt(previewCount || '0')).toBeGreaterThanOrEqual(180)
    
    // Start import
    await page.click('[data-testid="start-import-button"]')
    
    // Wait for import completion (with generous timeout for large dataset)
    await page.waitForSelector('[data-testid="import-complete-message"]', { timeout: 30000 })
    
    // Verify success message
    await expect(page.locator('[data-testid="import-success-count"]')).toContainText('180')
    
    // Close wizard and verify guests in main list
    await page.click('[data-testid="import-close-button"]')
    
    // Wait for list to refresh
    await page.waitForTimeout(2000)
    
    // Verify large guest count in analytics
    const totalGuests = await page.locator('[data-testid="total-guest-count"]').textContent()
    expect(parseInt(totalGuests || '0')).toBeGreaterThanOrEqual(180)
  })

  test('should export guests to CSV', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-guests-button"]')
    
    // Wait for export modal
    await page.waitForSelector('[data-testid="export-modal"]')
    
    // Select CSV format
    await page.selectOption('[data-testid="export-format"]', 'csv')
    
    // Select fields to include
    await page.check('[data-testid="export-field-name"]')
    await page.check('[data-testid="export-field-email"]')
    await page.check('[data-testid="export-field-rsvp-status"]')
    await page.check('[data-testid="export-field-dietary-restrictions"]')
    
    // Start export
    await page.click('[data-testid="start-export-button"]')
    
    // Wait for download link
    await page.waitForSelector('[data-testid="export-download-link"]', { timeout: 10000 })
    
    // Verify export success
    await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible()
  })

  test('should perform bulk operations on multiple guests', async ({ page }) => {
    // Select multiple guests
    await page.check('[data-testid="guest-checkbox-1"]')
    await page.check('[data-testid="guest-checkbox-2"]')
    await page.check('[data-testid="guest-checkbox-3"]')
    
    // Wait for bulk selection bar
    await page.waitForSelector('[data-testid="bulk-selection-bar"]')
    
    // Click bulk update
    await page.click('[data-testid="bulk-update-button"]')
    
    // Wait for bulk operations modal
    await page.waitForSelector('[data-testid="bulk-operations-modal"]')
    
    // Update category for all selected
    await page.selectOption('[data-testid="bulk-category"]', 'friends')
    
    // Update RSVP status
    await page.selectOption('[data-testid="bulk-rsvp-status"]', 'attending')
    
    // Apply changes
    await page.click('[data-testid="apply-bulk-changes"]')
    
    // Wait for success message
    await page.waitForSelector('[data-testid="bulk-update-success"]')
    
    // Verify changes applied
    await expect(page.locator('[data-testid="guest-table-row"]:has([data-testid="guest-checkbox-1"]) text=friends')).toBeVisible()
    await expect(page.locator('[data-testid="guest-table-row"]:has([data-testid="guest-checkbox-2"]) text=attending')).toBeVisible()
  })

  test('should handle dietary restrictions management', async ({ page }) => {
    // Filter by guests with dietary restrictions
    await page.click('[data-testid="filters-button"]')
    await page.waitForSelector('[data-testid="filters-panel"]')
    
    await page.check('[data-testid="filter-has-dietary-restrictions"]')
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="guest-table-row"]')
    
    // Verify only guests with dietary restrictions shown
    const dietaryRows = page.locator('[data-testid="guest-table-row"]:has([data-testid="dietary-restrictions-cell"]:not(:empty))')
    expect(await dietaryRows.count()).toBeGreaterThan(0)
    
    // Click on dietary restrictions to edit
    await dietaryRows.first().locator('[data-testid="dietary-restrictions-cell"]').click()
    
    // Edit dietary restrictions
    await page.fill('[data-testid="dietary-restrictions-input"]', 'Vegan, Gluten-free')
    await page.keyboard.press('Enter')
    
    // Verify update
    await expect(page.locator('text=Vegan, Gluten-free')).toBeVisible()
  })

  test('should integrate with vendor systems for headcounts', async ({ page }) => {
    // Navigate to vendor integration
    await page.click('[data-testid="vendor-integration-tab"]')
    
    // Wait for vendor panel
    await page.waitForSelector('[data-testid="vendor-integration-panel"]')
    
    // Generate caterer report
    await page.click('[data-testid="generate-caterer-report"]')
    
    // Wait for report generation
    await page.waitForSelector('[data-testid="caterer-report-ready"]')
    
    // Verify report contents
    await expect(page.locator('[data-testid="total-attending-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="dietary-breakdown"]')).toBeVisible()
    await expect(page.locator('[data-testid="age-group-breakdown"]')).toBeVisible()
    
    // Test sharing with vendor
    await page.click('[data-testid="share-with-vendor-button"]')
    
    // Verify share success
    await expect(page.locator('[data-testid="vendor-share-success"]')).toBeVisible()
  })

  test('should support mobile responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 800 })
    
    // Navigate to guests page
    await page.goto('/dashboard/clients/test-couple-id/guests')
    await page.waitForSelector('[data-testid="guest-list-container"]')
    
    // Verify mobile-specific elements
    await expect(page.locator('[data-testid="mobile-guest-card"]')).toBeVisible()
    
    // Test mobile actions
    await page.tap('[data-testid="mobile-guest-actions-1"]')
    await expect(page.locator('[data-testid="mobile-action-menu"]')).toBeVisible()
    
    // Test swipe actions (simulated)
    const guestCard = page.locator('[data-testid="mobile-guest-card"]').first()
    await guestCard.click({ position: { x: 300, y: 50 } })
    
    // Verify swipe menu
    await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible()
  })

  test('should maintain data integrity with concurrent operations', async ({ page, context }) => {
    // Open second page to simulate concurrent user
    const secondPage = await context.newPage()
    await secondPage.goto('/dashboard/clients/test-couple-id/guests')
    
    // Both pages modify same guest simultaneously
    const guestName = 'Test Concurrent Guest'
    
    // Page 1: Update guest
    await page.locator('[data-testid="guest-table-row"]:has-text("' + guestName + '")').locator('[data-testid="edit-guest"]').click()
    await page.fill('[data-testid="guest-notes"]', 'Updated by User 1')
    
    // Page 2: Update same guest
    await secondPage.locator('[data-testid="guest-table-row"]:has-text("' + guestName + '")').locator('[data-testid="edit-guest"]').click()
    await secondPage.fill('[data-testid="guest-notes"]', 'Updated by User 2')
    
    // Save from both pages
    await Promise.all([
      page.click('[data-testid="save-guest"]'),
      secondPage.click('[data-testid="save-guest"]')
    ])
    
    // Verify one update succeeded and data integrity maintained
    await page.reload()
    await page.waitForSelector('[data-testid="guest-list-container"]')
    
    const notes = await page.locator('[data-testid="guest-table-row"]:has-text("' + guestName + '") [data-testid="guest-notes"]').textContent()
    expect(notes).toMatch(/Updated by User [12]/)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: Reset test data if needed
    await page.evaluate(() => {
      // Clear any test artifacts
      localStorage.removeItem('guest-list-filters')
      sessionStorage.clear()
    })
  })
})