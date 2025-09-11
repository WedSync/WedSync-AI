/**
 * E2E RSVP Real-time Flow Tests
 * Revolutionary Playwright MCP testing with accessibility-first approach
 */

import { test, expect } from '@playwright/test'

test.describe('RSVP Real-time Flow', () => {
  let rsvpToken: string
  let adminPage: any
  let guestPage: any

  test.beforeAll(async ({ browser }) => {
    // Set up test data
    rsvpToken = 'test-token-' + Date.now()
    
    // Create admin context
    const adminContext = await browser.newContext()
    adminPage = await adminContext.newPage()
    
    // Create guest context  
    const guestContext = await browser.newContext()
    guestPage = await guestContext.newPage()
  })

  test('should handle complete RSVP submission flow with real-time updates', async () => {
    // STEP 1: Admin opens real-time dashboard
    await adminPage.goto('/wedme/rsvp-tracking')
    await adminPage.waitForLoadState('networkidle')
    
    // Use accessibility snapshot to understand dashboard structure
    const dashboardStructure = await adminPage.locator('[data-testid="rsvp-dashboard"]').screenshot()
    
    // Verify initial state
    await expect(adminPage.locator('[data-testid="total-responses"]')).toContainText('0')
    await expect(adminPage.locator('[data-testid="attending-count"]')).toContainText('0')
    
    // STEP 2: Guest opens RSVP form (no authentication required)
    await guestPage.goto(`/rsvp/${rsvpToken}`)
    await guestPage.waitForLoadState('networkidle')
    
    // Accessibility snapshot of RSVP form
    const rsvpFormStructure = await guestPage.locator('[data-testid="rsvp-form"]').screenshot()
    
    // Verify form loads correctly
    await expect(guestPage.locator('h1')).toContainText('You\'re Invited!')
    await expect(guestPage.locator('[data-testid="guest-name-input"]')).toBeVisible()
    
    // STEP 3: Guest fills out RSVP form
    await guestPage.fill('[data-testid="guest-name-input"]', 'John Smith')
    await guestPage.fill('[data-testid="guest-email-input"]', 'john@example.com')
    
    // Select response status
    await guestPage.click('[data-testid="response-dropdown"]')
    await guestPage.click('[data-testid="response-attending"]')
    
    // Select meal preference  
    await guestPage.click('[data-testid="meal-dropdown"]')
    await guestPage.click('[data-testid="meal-vegetarian"]')
    
    // Add dietary restrictions
    await guestPage.fill('[data-testid="dietary-input"]', 'Nut allergy')
    
    // STEP 4: Submit RSVP and verify real-time update
    const responsePromise = guestPage.waitForResponse('/api/rsvp/submit')
    await guestPage.click('[data-testid="submit-rsvp"]')
    
    // Wait for submission
    const response = await responsePromise
    expect(response.status()).toBe(201)
    
    // Verify success message
    await expect(guestPage.locator('[data-testid="success-message"]')).toContainText('Thank you for your response!')
    
    // STEP 5: Verify real-time update in admin dashboard (<200ms target)
    const startTime = Date.now()
    
    // Wait for real-time update
    await adminPage.waitForFunction(
      () => document.querySelector('[data-testid="total-responses"]')?.textContent !== '0',
      { timeout: 1000 }
    )
    
    const updateTime = Date.now() - startTime
    expect(updateTime).toBeLessThan(200) // <200ms real-time latency requirement
    
    // Verify updated counts
    await expect(adminPage.locator('[data-testid="total-responses"]')).toContainText('1')
    await expect(adminPage.locator('[data-testid="attending-count"]')).toContainText('1')
    
    // Verify guest appears in recent responses
    await expect(adminPage.locator('[data-testid="recent-responses"]')).toContainText('John Smith')
    await expect(adminPage.locator('[data-testid="recent-responses"]')).toContainText('vegetarian')
    await expect(adminPage.locator('[data-testid="recent-responses"]')).toContainText('Nut allergy')
  })

  test('should handle invalid/expired tokens gracefully', async () => {
    // Test invalid token
    await guestPage.goto('/rsvp/invalid-token-12345')
    await guestPage.waitForLoadState('networkidle')
    
    // Verify error message
    await expect(guestPage.locator('[data-testid="error-message"]')).toContainText('Invalid or expired RSVP link')
    
    // Test expired token
    await guestPage.goto('/rsvp/expired-token-12345')  
    await guestPage.waitForLoadState('networkidle')
    
    await expect(guestPage.locator('[data-testid="error-message"]')).toContainText('Invalid or expired RSVP link')
  })

  test('should validate form fields and show appropriate errors', async () => {
    await guestPage.goto(`/rsvp/${rsvpToken}`)
    await guestPage.waitForLoadState('networkidle')
    
    // Try to submit empty form
    await guestPage.click('[data-testid="submit-rsvp"]')
    
    // Check validation errors
    await expect(guestPage.locator('[data-testid="name-error"]')).toContainText('Name is required')
    await expect(guestPage.locator('[data-testid="email-error"]')).toContainText('Email is required')
    await expect(guestPage.locator('[data-testid="response-error"]')).toContainText('Please select your response')
    
    // Fill name but invalid email
    await guestPage.fill('[data-testid="guest-name-input"]', 'John Smith')
    await guestPage.fill('[data-testid="guest-email-input"]', 'invalid-email')
    await guestPage.click('[data-testid="submit-rsvp"]')
    
    await expect(guestPage.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email')
  })

  test('should handle connection loss and reconnection', async () => {
    await adminPage.goto('/wedme/rsvp-tracking')
    await adminPage.waitForLoadState('networkidle')
    
    // Verify initial connection
    await expect(adminPage.locator('[data-testid="connection-status"]')).toContainText('Live')
    
    // Simulate network disconnection
    await adminPage.setOffline(true)
    
    // Wait for disconnection indicator
    await expect(adminPage.locator('[data-testid="connection-status"]')).toContainText('Disconnected')
    
    // Restore connection
    await adminPage.setOffline(false)
    
    // Wait for reconnection (should auto-reconnect)
    await expect(adminPage.locator('[data-testid="connection-status"]')).toContainText('Live', { timeout: 10000 })
  })

  test('should handle concurrent RSVP submissions', async () => {
    const contexts = []
    const pages = []
    
    // Create multiple guest contexts
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext()
      const page = await context.newPage()
      contexts.push(context)
      pages.push(page)
      
      await page.goto(`/rsvp/${rsvpToken}`)
      await page.waitForLoadState('networkidle')
    }
    
    // Submit RSVPs concurrently
    const submissions = pages.map(async (page, index) => {
      await page.fill('[data-testid="guest-name-input"]', `Guest ${index + 1}`)
      await page.fill('[data-testid="guest-email-input"]', `guest${index + 1}@example.com`)
      await page.click('[data-testid="response-dropdown"]')
      await page.click('[data-testid="response-attending"]')
      await page.click('[data-testid="submit-rsvp"]')
      
      // Wait for success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    })
    
    // Wait for all submissions
    await Promise.all(submissions)
    
    // Verify all responses recorded in admin dashboard  
    await adminPage.reload()
    await adminPage.waitForLoadState('networkidle')
    
    await expect(adminPage.locator('[data-testid="total-responses"]')).toContainText('3')
    
    // Cleanup
    for (const context of contexts) {
      await context.close()
    }
  })

  test('should display real-time connection health', async () => {
    await adminPage.goto('/wedme/rsvp-tracking')
    await adminPage.waitForLoadState('networkidle')
    
    // Check connection health indicator
    const healthIndicator = adminPage.locator('[data-testid="health-indicator"]')
    await expect(healthIndicator).toBeVisible()
    
    // Should show healthy status initially
    await expect(healthIndicator).toContainText('Healthy')
    
    // Check detailed metrics tooltip/modal
    await adminPage.click('[data-testid="health-details"]')
    await expect(adminPage.locator('[data-testid="connection-score"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="error-count"]')).toBeVisible()
  })

  test('should handle plus-one functionality', async () => {
    await guestPage.goto(`/rsvp/${rsvpToken}`)
    await guestPage.waitForLoadState('networkidle')
    
    // Fill primary guest info
    await guestPage.fill('[data-testid="guest-name-input"]', 'Jane Smith')
    await guestPage.fill('[data-testid="guest-email-input"]', 'jane@example.com')
    await guestPage.click('[data-testid="response-dropdown"]')
    await guestPage.click('[data-testid="response-attending"]')
    
    // Enable plus-one if available
    const plusOneToggle = guestPage.locator('[data-testid="plus-one-toggle"]')
    if (await plusOneToggle.isVisible()) {
      await plusOneToggle.click()
      
      // Fill plus-one details
      await guestPage.fill('[data-testid="plus-one-name"]', 'John Doe')
      await guestPage.click('[data-testid="plus-one-meal-dropdown"]')  
      await guestPage.click('[data-testid="plus-one-meal-chicken"]')
    }
    
    // Submit
    await guestPage.click('[data-testid="submit-rsvp"]')
    await expect(guestPage.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Verify in admin dashboard
    await adminPage.waitForFunction(
      () => document.querySelector('[data-testid="recent-responses"]')?.textContent?.includes('Jane Smith')
    )
    
    if (await plusOneToggle.isVisible()) {
      await expect(adminPage.locator('[data-testid="recent-responses"]')).toContainText('+1 Guest')
    }
  })

  test('should measure and validate performance requirements', async () => {
    const performanceMetrics = []
    
    // Test RSVP form load performance
    const startLoad = Date.now()
    await guestPage.goto(`/rsvp/${rsvpToken}`)
    await guestPage.waitForLoadState('networkidle')
    const loadTime = Date.now() - startLoad
    
    expect(loadTime).toBeLessThan(2000) // <2s page load requirement
    performanceMetrics.push({ metric: 'page_load', value: loadTime })
    
    // Test form submission performance  
    await guestPage.fill('[data-testid="guest-name-input"]', 'Performance Test')
    await guestPage.fill('[data-testid="guest-email-input"]', 'perf@test.com')
    await guestPage.click('[data-testid="response-dropdown"]')
    await guestPage.click('[data-testid="response-attending"]')
    
    const startSubmit = Date.now()
    await guestPage.click('[data-testid="submit-rsvp"]')
    await guestPage.waitForResponse('/api/rsvp/submit')
    const submitTime = Date.now() - startSubmit
    
    expect(submitTime).toBeLessThan(500) // <500ms API response requirement
    performanceMetrics.push({ metric: 'api_response', value: submitTime })
    
    console.log('Performance Metrics:', performanceMetrics)
  })

  test.afterAll(async () => {
    await adminPage?.close()
    await guestPage?.close()
  })
})