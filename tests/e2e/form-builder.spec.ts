import { test, expect } from '@playwright/test'

test.describe('Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
    
    // Navigate to forms
    await page.click('[data-testid="nav-forms"]')
  })

  test('should create a form with multiple field types', async ({ page }) => {
    // Start new form
    await page.click('[data-testid="new-form-button"]')
    
    // Set form name
    await page.fill('[data-testid="form-name"]', 'Comprehensive Wedding Form')
    
    // Add text field
    await page.dragAndDrop(
      '[data-testid="field-palette-text"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure text field
    await page.click('[data-testid="field-0"]')
    await page.fill('[data-testid="field-label"]', 'Couple Names')
    await page.fill('[data-testid="field-key"]', 'couple_names')
    
    // Add date field
    await page.dragAndDrop(
      '[data-testid="field-palette-date"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure date field
    await page.click('[data-testid="field-1"]')
    await page.fill('[data-testid="field-label"]', 'Wedding Date')
    await page.fill('[data-testid="field-key"]', 'wedding_date')
    
    // Add select field
    await page.dragAndDrop(
      '[data-testid="field-palette-select"]',
      '[data-testid="form-canvas"]'
    )
    
    // Configure select field
    await page.click('[data-testid="field-2"]')
    await page.fill('[data-testid="field-label"]', 'Photography Style')
    await page.click('[data-testid="add-option"]')
    await page.fill('[data-testid="option-0"]', 'Documentary')
    await page.click('[data-testid="add-option"]')
    await page.fill('[data-testid="option-1"]', 'Fine Art')
    
    // Save form
    await page.click('[data-testid="save-form"]')
    
    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Form saved')
    
    // Verify form appears in list
    await page.goto('/forms')
    await expect(page.locator('text=Comprehensive Wedding Form')).toBeVisible()
  })

  test('should detect and mark core fields', async ({ page }) => {
    await page.click('[data-testid="new-form-button"]')
    
    // Add a field and set key to core field
    await page.dragAndDrop(
      '[data-testid="field-palette-text"]',
      '[data-testid="form-canvas"]'
    )
    
    await page.click('[data-testid="field-0"]')
    await page.fill('[data-testid="field-key"]', 'venue_name')
    
    // Should show core field indicator
    await expect(page.locator('[data-testid="core-field-badge"]')).toBeVisible()
    await expect(page.locator('[data-testid="core-field-badge"]')).toContainText('Auto-fills')
  })

  test('should handle form validation', async ({ page }) => {
    await page.click('[data-testid="new-form-button"]')
    
    // Try to save without fields
    await page.click('[data-testid="save-form"]')
    
    // Should show error
    await expect(page.locator('[data-testid="toast-error"]')).toContainText('at least one field')
  })
})