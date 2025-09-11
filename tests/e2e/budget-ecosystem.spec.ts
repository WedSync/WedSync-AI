// WS-059 Budget Tracker - Complete E2E Test Suite
// Round 3 Final Integration Testing
// Tests all budget integrations across Teams A, B, C, and E

import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_WEDDING_ID = 'test-wedding-001'
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

// Test data constants
const TEST_DATA = {
  initialGuests: 120,
  updatedGuests: 135,
  rsvpConfirmed: 140,
  taskCost: 120,
  websitePlan: 'premium',
  monthlyWebsiteCost: 50,
  cateringPerPerson: 125,
  venueBaseCost: 5000
}

test.describe('WS-059 Budget Ecosystem - Complete Integration Tests', () => {
  let page: Page
  let supabase: any

  test.beforeAll(async () => {
    // Initialize Supabase client for test data setup
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Set up test wedding data
    await setupTestWedding()
  })

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto(`${BASE_URL}/wedme/budget`)
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    // Clean up test data
    await cleanupTestData()
  })

  // TEST 1: Guest Count Integration (Team A)
  test('Guest count changes should update budget calculations instantly', async () => {
    // Navigate to budget page
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Get initial budget values
    const initialTotal = await page.locator('[data-testid="total-budget"]').textContent()
    const initialPerGuest = await page.locator('[data-testid="per-guest-cost"]').textContent()
    
    // Simulate guest count change via API
    const response = await page.evaluate(async () => {
      return await fetch('/api/guests/update-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          weddingId: 'test-wedding-001',
          newCount: 135 
        })
      }).then(r => r.json())
    })
    
    expect(response.success).toBe(true)
    
    // Wait for budget to update
    await page.waitForSelector('text=Budget updated for 135 guests', { timeout: 5000 })
    
    // Verify catering cost update
    const cateringTotal = await page.locator('[data-testid="catering-total"]').textContent()
    const expectedCatering = 135 * TEST_DATA.cateringPerPerson
    expect(cateringTotal).toContain(expectedCatering.toLocaleString())
    
    // Verify venue cost tier adjustment
    const venueTotal = await page.locator('[data-testid="venue-total"]').textContent()
    expect(venueTotal).toBeTruthy()
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'evidence/guest-count-budget-update.png',
      fullPage: true 
    })
  })

  // TEST 2: RSVP Integration (Team B)
  test('RSVP changes should recalculate catering and venue costs', async () => {
    // Navigate to budget page
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Simulate RSVP bulk update
    const rsvpResponse = await page.evaluate(async () => {
      return await fetch('/api/rsvp/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: 'test-wedding-001',
          attending: 140,
          mealPreferences: {
            standard: 100,
            vegetarian: 25,
            vegan: 10,
            kidsMenu: 5
          }
        })
      }).then(r => r.json())
    })
    
    expect(rsvpResponse.success).toBe(true)
    
    // Wait for catering budget update
    await page.waitForSelector('text=Catering budget: +$450', { timeout: 5000 })
    
    // Verify meal preference breakdown
    const mealBreakdown = await page.locator('[data-testid="meal-breakdown"]')
    await expect(mealBreakdown).toContainText('Standard: 100')
    await expect(mealBreakdown).toContainText('Vegetarian: 25')
    
    // Verify service charge calculation
    const serviceCharge = await page.locator('[data-testid="service-charge"]').textContent()
    expect(serviceCharge).toBeTruthy()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'evidence/rsvp-budget-impact.png',
      fullPage: true 
    })
  })

  // TEST 3: Task Cost Integration (Team C)
  test('Task costs should sync with vendor payment schedules', async () => {
    // Navigate to budget page
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Add task with cost
    const taskResponse = await page.evaluate(async () => {
      return await fetch('/api/tasks/add-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: 'test-wedding-001',
          taskId: 'extra-chairs',
          taskName: 'Extra Chair Rentals',
          category: 'rentals',
          vendorId: 'vendor-001',
          cost: 120
        })
      }).then(r => r.json())
    })
    
    expect(taskResponse.success).toBe(true)
    
    // Wait for task cost to appear in budget
    await page.waitForSelector('text=Task costs: +$120', { timeout: 5000 })
    
    // Verify vendor payment schedule update
    await page.click('[data-testid="vendor-payments-tab"]')
    const vendorPayment = await page.locator('[data-testid="vendor-001-payment"]')
    await expect(vendorPayment).toContainText('$120')
    
    // Verify payment milestones
    const milestones = await page.locator('[data-testid="payment-milestones"]')
    await expect(milestones).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'evidence/task-cost-integration.png',
      fullPage: true 
    })
  })

  // TEST 4: Website Plan Integration (Team E)
  test('Website plan upgrades should update monthly budget costs', async () => {
    // Navigate to budget page
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Simulate website plan upgrade
    const websiteResponse = await page.evaluate(async () => {
      return await fetch('/api/website/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: 'test-wedding-001',
          plan: 'premium',
          monthlyCost: 50,
          features: ['unlimited-guests', 'livestreaming', 'analytics']
        })
      }).then(r => r.json())
    })
    
    expect(websiteResponse.success).toBe(true)
    
    // Wait for website cost update
    await page.waitForSelector('text=Website costs: +$600', { timeout: 5000 })
    
    // Verify annual projection (12 months)
    const annualProjection = await page.locator('[data-testid="website-annual-cost"]').textContent()
    expect(annualProjection).toContain('600')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'evidence/website-cost-update.png',
      fullPage: true 
    })
  })

  // TEST 5: Real-time Cross-System Synchronization
  test('Changes in one system should sync across all budget views', async () => {
    // Open multiple tabs for different systems
    const budgetPage = page
    const guestPage = await page.context().newPage()
    const rsvpPage = await page.context().newPage()
    const taskPage = await page.context().newPage()
    
    // Navigate to different pages
    await budgetPage.goto(`${BASE_URL}/wedme/budget`)
    await guestPage.goto(`${BASE_URL}/wedme/guests`)
    await rsvpPage.goto(`${BASE_URL}/wedme/rsvp-dashboard`)
    await taskPage.goto(`${BASE_URL}/wedme/tasks`)
    
    // Make change in RSVP system
    await rsvpPage.click('[data-testid="update-rsvp-btn"]')
    await rsvpPage.fill('[data-testid="rsvp-count"]', '145')
    await rsvpPage.click('[data-testid="save-rsvp"]')
    
    // Verify budget updates in main budget page
    await budgetPage.waitForSelector('text=Budget updated from RSVP change', { timeout: 5000 })
    
    // Verify guest count reflects in guest page
    await guestPage.waitForSelector('text=145 confirmed guests', { timeout: 5000 })
    
    // Take screenshots of all pages
    await budgetPage.screenshot({ path: 'evidence/budget-sync.png' })
    await guestPage.screenshot({ path: 'evidence/guest-sync.png' })
    await rsvpPage.screenshot({ path: 'evidence/rsvp-sync.png' })
    
    // Close additional pages
    await guestPage.close()
    await rsvpPage.close()
    await taskPage.close()
  })

  // TEST 6: Final Payment Dashboard Integration
  test('Final payment dashboard should aggregate all budget sources', async () => {
    // Navigate to final payments page
    await page.goto(`${BASE_URL}/wedme/final-payments`)
    await page.waitForLoadState('networkidle')
    
    // Verify all integration statuses are connected
    const integrationStatuses = await page.locator('[data-testid="integration-status"]')
    await expect(integrationStatuses).toContainText('Guest Management (Team A)')
    await expect(integrationStatuses).toContainText('RSVP System (Team B)')
    await expect(integrationStatuses).toContainText('Task Management (Team C)')
    await expect(integrationStatuses).toContainText('Website Builder (Team E)')
    
    // Verify total calculations
    const totalDue = await page.locator('[data-testid="total-due"]').textContent()
    expect(totalDue).toBeTruthy()
    
    const vendorCount = await page.locator('[data-vendor-payment]').count()
    expect(vendorCount).toBeGreaterThan(0)
    
    const confidenceLevel = await page.locator('[data-testid="confidence-level"]').textContent()
    expect(parseInt(confidenceLevel || '0')).toBeGreaterThan(80)
    
    // Take comprehensive screenshot
    await page.screenshot({ 
      path: 'evidence/final-payment-dashboard.png',
      fullPage: true 
    })
  })

  // TEST 7: Budget Calculation Accuracy Test
  test('All budget calculations should be accurate to the cent', async () => {
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Perform series of calculations
    const calculations = await page.evaluate(async () => {
      const results = []
      
      // Test 1: Guest count calculation
      const guestCalc = await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guest_count',
          guests: 150,
          perPersonCost: 125.50
        })
      }).then(r => r.json())
      results.push(guestCalc)
      
      // Test 2: Service charge calculation
      const serviceCalc = await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service_charge',
          subtotal: 18825.00,
          rate: 0.20
        })
      }).then(r => r.json())
      results.push(serviceCalc)
      
      // Test 3: Tax calculation
      const taxCalc = await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tax',
          amount: 22590.00,
          rate: 0.0875
        })
      }).then(r => r.json())
      results.push(taxCalc)
      
      return results
    })
    
    // Verify calculation accuracy
    expect(calculations[0].total).toBe(18825.00) // 150 * 125.50
    expect(calculations[1].serviceCharge).toBe(3765.00) // 18825 * 0.20
    expect(calculations[2].tax).toBe(1976.625) // 22590 * 0.0875
    
    // Verify no rounding errors in display
    const displayedTotal = await page.locator('[data-testid="calculated-total"]').textContent()
    expect(displayedTotal).not.toContain('.999')
    expect(displayedTotal).not.toContain('.001')
  })

  // TEST 8: Production Load Test
  test('System should handle 100 concurrent budget updates', async () => {
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    const loadTestStart = Date.now()
    
    const loadTestResults = await page.evaluate(async () => {
      const promises = []
      
      // Generate 100 concurrent budget update requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          fetch('/api/budget/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'guest_update',
              weddingId: 'test-wedding-001',
              guestCount: 120 + i,
              timestamp: Date.now()
            })
          }).then(r => r.json())
        )
      }
      
      const start = performance.now()
      const results = await Promise.all(promises)
      const duration = performance.now() - start
      
      return {
        duration,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      }
    })
    
    const loadTestDuration = Date.now() - loadTestStart
    
    // Performance assertions
    expect(loadTestResults.successCount).toBe(100)
    expect(loadTestResults.failureCount).toBe(0)
    expect(loadTestDuration).toBeLessThan(5000) // Should complete within 5 seconds
    
    // Verify UI still responsive
    const uiResponsive = await page.locator('[data-testid="total-budget"]').isVisible()
    expect(uiResponsive).toBe(true)
    
    console.log(`Load test completed in ${loadTestDuration}ms`)
  })

  // TEST 9: Error Recovery Test
  test('System should recover gracefully from calculation errors', async () => {
    await page.goto(`${BASE_URL}/wedme/budget`)
    
    // Simulate error condition
    const errorResponse = await page.evaluate(async () => {
      return await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid_calculation',
          invalidData: null
        })
      }).then(r => r.json())
    })
    
    expect(errorResponse.error).toBeDefined()
    
    // Verify error handling in UI
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 3000 })
    
    // Verify system can still process valid requests
    const validResponse = await page.evaluate(async () => {
      return await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guest_count',
          guests: 120,
          perPersonCost: 125
        })
      }).then(r => r.json())
    })
    
    expect(validResponse.success).toBe(true)
    expect(validResponse.total).toBe(15000)
  })

  // TEST 10: Data Consistency Test
  test('Budget data should remain consistent across all integrations', async () => {
    await page.goto(`${BASE_URL}/wedme/final-payments`)
    
    // Get budget totals from different sources
    const budgetData = await page.evaluate(async () => {
      const sources = {
        guestSystem: await fetch('/api/guests/budget-total').then(r => r.json()),
        rsvpSystem: await fetch('/api/rsvp/budget-total').then(r => r.json()),
        taskSystem: await fetch('/api/tasks/budget-total').then(r => r.json()),
        websiteSystem: await fetch('/api/website/budget-total').then(r => r.json()),
        masterBudget: await fetch('/api/budget/total').then(r => r.json())
      }
      return sources
    })
    
    // Verify all systems report consistent totals
    const expectedTotal = budgetData.guestSystem.total + 
                         budgetData.rsvpSystem.total + 
                         budgetData.taskSystem.total + 
                         budgetData.websiteSystem.total
    
    expect(budgetData.masterBudget.total).toBe(expectedTotal)
    
    // Verify audit trail
    const auditTrail = await page.locator('[data-testid="audit-trail"]')
    await expect(auditTrail).toBeVisible()
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'evidence/data-consistency-verified.png',
      fullPage: true 
    })
  })
})

// Helper Functions
async function setupTestWedding() {
  // Create test wedding in database
  const { data: wedding, error } = await supabase
    .from('weddings')
    .upsert({
      id: TEST_WEDDING_ID,
      user_id: 'test-user-001',
      wedding_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      budget_total: 50000,
      estimated_guests: TEST_DATA.initialGuests,
      created_at: new Date()
    })
    .select()
    .single()

  if (error) {
    console.error('Error setting up test wedding:', error)
  }

  // Set up initial budget categories
  await supabase.from('budget_items').insert([
    { wedding_id: TEST_WEDDING_ID, category: 'catering', amount: 15000 },
    { wedding_id: TEST_WEDDING_ID, category: 'venue', amount: 8000 },
    { wedding_id: TEST_WEDDING_ID, category: 'photography', amount: 3500 },
    { wedding_id: TEST_WEDDING_ID, category: 'florals', amount: 2500 }
  ])

  return wedding
}

async function cleanupTestData() {
  // Remove test data after tests complete
  await supabase
    .from('budget_items')
    .delete()
    .eq('wedding_id', TEST_WEDDING_ID)

  await supabase
    .from('weddings')
    .delete()
    .eq('id', TEST_WEDDING_ID)
}

// Export test configuration
export const testConfig = {
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  retries: 2,
  timeout: 30000,
  expect: {
    timeout: 10000
  }
}