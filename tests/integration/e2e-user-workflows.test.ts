/**
 * END-TO-END USER WORKFLOW TESTS
 * 
 * Tests complete user journeys across Session A and Session B:
 * - Form creation → submission → data retrieval
 * - Authentication flows
 * - Error handling and recovery
 * - Cross-session state management
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('End-to-End User Workflows', () => {
  let page: Page
  let context: BrowserContext
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      // Clear cookies and storage for each test
      storageState: undefined
    })
    page = await context.newPage()
    
    // Set up test environment
    await page.goto('/')
  })
  
  test.afterEach(async () => {
    await context.close()
  })

  test.describe('Complete Form Lifecycle Workflow', () => {
    test('should complete full form creation and submission workflow', async () => {
      // STEP 1: User Authentication (Session B)
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'workflow-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      // Verify authentication success
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      
      // STEP 2: Navigate to Form Builder (Session A)
      await page.click('[data-testid="nav-forms"]')
      await page.click('[data-testid="create-new-form"]')
      await expect(page).toHaveURL(/\/forms\/builder/)
      
      // STEP 3: Create Form with Security Validation (Session A → B)
      await page.fill('[data-testid="form-title"]', 'E2E Test Wedding Form')
      await page.fill('[data-testid="form-description"]', 'Complete workflow test form')
      
      // Add form fields
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'text')
      await page.fill('[data-testid="field-label"]', 'Bride Name')
      await page.check('[data-testid="field-required"]')
      await page.click('[data-testid="confirm-add-field"]')
      
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'email')
      await page.fill('[data-testid="field-label"]', 'Contact Email')
      await page.check('[data-testid="field-required"]')
      await page.click('[data-testid="confirm-add-field"]')
      
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'date')
      await page.fill('[data-testid="field-label"]', 'Wedding Date')
      await page.check('[data-testid="field-required"]')
      await page.click('[data-testid="confirm-add-field"]')
      
      // STEP 4: Save Form (Session A → B with CSRF protection)
      await page.click('[data-testid="save-form"]')
      
      // Wait for form to be saved
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="form-id"]')).toBeVisible()
      
      // Get form ID for later use
      const formId = await page.locator('[data-testid="form-id"]').textContent()
      expect(formId).toBeTruthy()
      
      // STEP 5: Publish Form (Session A → B)
      await page.click('[data-testid="publish-form"]')
      await expect(page.locator('[data-testid="publish-success"]')).toBeVisible()
      
      // Get public form URL
      const formUrl = await page.locator('[data-testid="public-form-url"]').textContent()
      expect(formUrl).toBeTruthy()
      
      // STEP 6: Test Form Submission as Public User (Session A)
      await page.goto(formUrl!)
      
      // Verify form loads correctly
      await expect(page.locator('[data-testid="form-title"]')).toContainText('E2E Test Wedding Form')
      await expect(page.locator('[data-testid="field-bride-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="field-contact-email"]')).toBeVisible()
      await expect(page.locator('[data-testid="field-wedding-date"]')).toBeVisible()
      
      // Fill out form
      await page.fill('[data-testid="field-bride-name"]', 'Sarah Johnson')
      await page.fill('[data-testid="field-contact-email"]', 'sarah.johnson@example.com')
      await page.fill('[data-testid="field-wedding-date"]', '2024-06-15')
      
      // Submit form (Session A → B with validation)
      await page.click('[data-testid="submit-form"]')
      
      // Verify submission success
      await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="submission-message"]')).toContainText('Thank you for your submission!')
      
      // STEP 7: Verify Data in Dashboard (Session B → Database)
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'workflow-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms')
      await page.click(`[data-testid="view-form-${formId}"]`)
      await page.click('[data-testid="view-submissions"]')
      
      // Verify submission appears in dashboard
      await expect(page.locator('[data-testid="submissions-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="submission-row"]').first()).toContainText('Sarah Johnson')
      await expect(page.locator('[data-testid="submission-row"]').first()).toContainText('sarah.johnson@example.com')
      
      // STEP 8: View Submission Details (Session B with RLS)
      await page.click('[data-testid="view-submission"]')
      
      await expect(page.locator('[data-testid="submission-detail-bride-name"]')).toContainText('Sarah Johnson')
      await expect(page.locator('[data-testid="submission-detail-contact-email"]')).toContainText('sarah.johnson@example.com')
      await expect(page.locator('[data-testid="submission-detail-wedding-date"]')).toContainText('2024-06-15')
    })
    
    test('should handle form submission validation errors gracefully', async () => {
      // Create and publish a form with validation rules
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'validation-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'Validation Test Form')
      
      // Add required field
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'text')
      await page.fill('[data-testid="field-label"]', 'Required Field')
      await page.check('[data-testid="field-required"]')
      await page.fill('[data-testid="field-min-length"]', '5')
      await page.click('[data-testid="confirm-add-field"]')
      
      await page.click('[data-testid="save-form"]')
      await page.click('[data-testid="publish-form"]')
      
      const formUrl = await page.locator('[data-testid="public-form-url"]').textContent()
      
      // Test validation errors
      await page.goto(formUrl!)
      
      // Submit empty form
      await page.click('[data-testid="submit-form"]')
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Required Field is required')
      
      // Submit with value too short
      await page.fill('[data-testid="field-required-field"]', 'abc')
      await page.click('[data-testid="submit-form"]')
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('too short')
      
      // Submit with valid value
      await page.fill('[data-testid="field-required-field"]', 'valid input')
      await page.click('[data-testid="submit-form"]')
      await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
    })
  })

  test.describe('Security and Authentication Workflows', () => {
    test('should enforce authentication for protected form operations', async () => {
      // Try to access form builder without authentication
      await page.goto('/forms/builder')
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
      
      // Try to access forms dashboard
      await page.goto('/forms')
      await expect(page).toHaveURL(/\/login/)
      
      // Login and verify access is granted
      await page.fill('[data-testid="email"]', 'auth-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await expect(page.locator('[data-testid="form-builder"]')).toBeVisible()
    })
    
    test('should handle session expiration gracefully', async () => {
      // Login
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'session-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      // Access protected area
      await page.goto('/forms/builder')
      await expect(page.locator('[data-testid="form-builder"]')).toBeVisible()
      
      // Simulate session expiration by clearing auth cookies
      await context.clearCookies()
      
      // Try to perform authenticated action
      await page.reload()
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
      
      // Should show session expired message
      await expect(page.locator('[data-testid="session-expired"]')).toBeVisible()
    })
    
    test('should prevent unauthorized access to other users forms', async () => {
      // User 1 creates a form
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'user1@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'User 1 Private Form')
      await page.click('[data-testid="save-form"]')
      
      const formId = await page.locator('[data-testid="form-id"]').textContent()
      
      // Logout and login as different user
      await page.click('[data-testid="logout"]')
      await page.fill('[data-testid="email"]', 'user2@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      // Try to access User 1's form
      await page.goto(`/forms/${formId}/edit`)
      
      // Should show unauthorized error or redirect
      await expect(page.locator('[data-testid="unauthorized-error"]')).toBeVisible()
    })
  })

  test.describe('Error Handling and Recovery Workflows', () => {
    test('should handle network errors during form submission', async () => {
      // Create and publish a form
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'network-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'Network Test Form')
      
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'text')
      await page.fill('[data-testid="field-label"]', 'Test Field')
      await page.click('[data-testid="confirm-add-field"]')
      
      await page.click('[data-testid="save-form"]')
      await page.click('[data-testid="publish-form"]')
      
      const formUrl = await page.locator('[data-testid="public-form-url"]').textContent()
      
      // Go to form and simulate network error
      await page.goto(formUrl!)
      
      // Intercept form submission to simulate network error
      await page.route('**/api/forms/*/submit', route => {
        route.abort('failed')
      })
      
      await page.fill('[data-testid="field-test-field"]', 'Test value')
      await page.click('[data-testid="submit-form"]')
      
      // Should show network error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Test retry functionality
      await page.unroute('**/api/forms/*/submit')
      await page.click('[data-testid="retry-button"]')
      
      // Should succeed on retry
      await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
    })
    
    test('should handle server errors gracefully', async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'server-error-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      
      // Simulate server error during form creation
      await page.route('**/api/forms', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await page.fill('[data-testid="form-title"]', 'Server Error Test Form')
      await page.click('[data-testid="save-form"]')
      
      // Should show generic error message (not internal details)
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong')
      await expect(page.locator('[data-testid="error-message"]')).not.toContainText('Internal server error')
    })
  })

  test.describe('Cross-Session State Management', () => {
    test('should maintain form state across page refreshes', async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'state-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      
      // Start creating a form
      await page.fill('[data-testid="form-title"]', 'State Test Form')
      await page.fill('[data-testid="form-description"]', 'Testing state persistence')
      
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'text')
      await page.fill('[data-testid="field-label"]', 'Persistent Field')
      await page.click('[data-testid="confirm-add-field"]')
      
      // Refresh page
      await page.reload()
      
      // Form should be auto-saved and restored
      await expect(page.locator('[data-testid="form-title"]')).toHaveValue('State Test Form')
      await expect(page.locator('[data-testid="form-description"]')).toHaveValue('Testing state persistence')
      await expect(page.locator('[data-testid="field-persistent-field"]')).toBeVisible()
    })
    
    test('should synchronize form data across browser tabs', async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'sync-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      // Create form in first tab
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'Sync Test Form')
      await page.click('[data-testid="save-form"]')
      
      const formId = await page.locator('[data-testid="form-id"]').textContent()
      
      // Open second tab and navigate to forms dashboard
      const secondPage = await context.newPage()
      await secondPage.goto('/forms')
      
      // Should see the form created in first tab
      await expect(secondPage.locator(`[data-testid="form-${formId}"]`)).toBeVisible()
      await expect(secondPage.locator(`[data-testid="form-${formId}"]`)).toContainText('Sync Test Form')
      
      // Update form in second tab
      await secondPage.click(`[data-testid="edit-form-${formId}"]`)
      await secondPage.fill('[data-testid="form-title"]', 'Updated Sync Test Form')
      await secondPage.click('[data-testid="save-form"]')
      
      // Refresh first tab and verify update
      await page.reload()
      await expect(page.locator('[data-testid="form-title"]')).toHaveValue('Updated Sync Test Form')
      
      await secondPage.close()
    })
  })

  test.describe('Performance and Load Testing', () => {
    test('should handle large forms with many fields', async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'performance-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'Large Form Test')
      
      // Add many fields
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="add-field-button"]')
        await page.selectOption('[data-testid="field-type-select"]', 'text')
        await page.fill('[data-testid="field-label"]', `Field ${i + 1}`)
        await page.click('[data-testid="confirm-add-field"]')
        
        // Wait for field to be added
        await expect(page.locator(`[data-testid="field-field-${i + 1}"]`)).toBeVisible()
      }
      
      // Save form (should handle large payload)
      const savePromise = page.click('[data-testid="save-form"]')
      await expect(savePromise).resolves.toBeUndefined()
      
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible()
      
      // Publish and test form loading performance
      await page.click('[data-testid="publish-form"]')
      const formUrl = await page.locator('[data-testid="public-form-url"]').textContent()
      
      const startTime = Date.now()
      await page.goto(formUrl!)
      const loadTime = Date.now() - startTime
      
      // Form should load within reasonable time (< 3 seconds)
      expect(loadTime).toBeLessThan(3000)
      
      // All fields should be visible
      for (let i = 0; i < 20; i++) {
        await expect(page.locator(`[data-testid="field-field-${i + 1}"]`)).toBeVisible()
      }
    })
    
    test('should handle rapid form submissions', async () => {
      // Create simple form
      await page.goto('/login')
      await page.fill('[data-testid="email"]', 'rapid-test@example.com')
      await page.fill('[data-testid="password"]', 'SecurePassword123!')
      await page.click('[data-testid="login-button"]')
      
      await page.goto('/forms/builder')
      await page.fill('[data-testid="form-title"]', 'Rapid Submission Test')
      
      await page.click('[data-testid="add-field-button"]')
      await page.selectOption('[data-testid="field-type-select"]', 'text')
      await page.fill('[data-testid="field-label"]', 'Test Field')
      await page.click('[data-testid="confirm-add-field"]')
      
      await page.click('[data-testid="save-form"]')
      await page.click('[data-testid="publish-form"]')
      
      const formUrl = await page.locator('[data-testid="public-form-url"]').textContent()
      
      // Test multiple rapid submissions
      await page.goto(formUrl!)
      
      const submissions = []
      for (let i = 0; i < 5; i++) {
        // Fill and submit form rapidly
        await page.fill('[data-testid="field-test-field"]', `Rapid submission ${i}`)
        submissions.push(page.click('[data-testid="submit-form"]'))
        
        // Small delay to prevent overwhelming
        await page.waitForTimeout(100)
      }
      
      // Should handle rapid submissions gracefully
      // Some may be rate limited, but system should remain stable
      const results = await Promise.allSettled(submissions)
      
      // At least first few should succeed
      expect(results.filter(r => r.status === 'fulfilled').length).toBeGreaterThan(0)
    })
  })
})