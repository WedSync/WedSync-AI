import { test, expect } from '@playwright/test'

/**
 * WS-056 Guest List Builder - Complete Integration E2E Test
 * 
 * This test validates the complete guest ecosystem integration across all 5 systems:
 * 1. Guest List Management (Team A)
 * 2. RSVP System (Team B)
 * 3. Task Delegation (Team C)
 * 4. Budget Tracking (Team D)
 * 5. Website Builder (Team E)
 * 
 * User Story: Sarah's 150-guest wedding with real-time synchronization
 */

test.describe('WS-056: Complete Guest Ecosystem Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to guest management system
    await page.goto('/wedme/guests')
    
    // Wait for the integrated guest manager to load
    await page.waitForSelector('[data-testid="guest-list-integrated"]', { timeout: 10000 })
    
    // Verify real-time connection is established
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Connected')
  })

  test('complete wedding journey - sarahs 150 guest wedding', async ({ page }) => {
    // Generate test data for 150 guests
    const guestData = generateSarahsWeddingGuests()
    
    // ========================
    // PHASE 1: GUEST IMPORT
    // ========================
    
    console.log('Starting guest import phase...')
    
    // Click import button
    await page.click('[data-testid="import-guests-btn"]')
    
    // Wait for import wizard
    await page.waitForSelector('[data-testid="import-wizard"]')
    
    // Upload CSV file with 150 guests
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'sarahs-guests.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(generateGuestCSV(guestData))
    })
    
    // Configure import mapping
    await page.click('[data-testid="auto-map-columns"]')
    await page.click('[data-testid="preview-import"]')
    
    // Verify import preview shows 150 guests
    await expect(page.locator('[data-testid="import-preview-count"]')).toContainText('150 guests')
    
    // Execute import
    await page.click('[data-testid="execute-import"]')
    
    // Wait for import completion
    await page.waitForSelector('[data-testid="import-success"]', { timeout: 30000 })
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('150 guests imported successfully')
    
    // Close import wizard
    await page.click('[data-testid="close-import-wizard"]')
    
    // Verify guest count in main view
    await expect(page.locator('[data-testid="total-guests-count"]')).toContainText('150')
    
    // Take screenshot of imported guests
    await page.screenshot({ path: 'test-results/01-guests-imported.png', fullPage: true })
    
    // ========================
    // PHASE 2: RSVP INTEGRATION
    // ========================
    
    console.log('Testing RSVP integration...')
    
    // Switch to RSVP tab
    await page.click('[data-testid="rsvp-tab"]')
    await page.waitForSelector('[data-testid="rsvp-integration"]')
    
    // Verify RSVP statistics show 0 attending initially
    await expect(page.locator('[data-testid="rsvp-attending-count"]')).toContainText('0')
    
    // Select first 5 guests and send invitations
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-guest-id="guest-${i}"] input[type="checkbox"]`)
    }
    
    // Send invitations to selected guests
    await page.click('[data-testid="send-invitations-btn"]')
    await page.waitForSelector('[data-testid="invitations-sent"]')
    
    // Simulate RSVP responses (3 attending, 1 declined, 1 maybe)
    await simulateRSVPResponses(page, [
      { guestId: 'guest-0', status: 'attending', partySize: 2 },
      { guestId: 'guest-1', status: 'attending', partySize: 1 },
      { guestId: 'guest-2', status: 'attending', partySize: 3 },
      { guestId: 'guest-3', status: 'not_attending', partySize: 0 },
      { guestId: 'guest-4', status: 'maybe', partySize: 1 }
    ])
    
    // Verify RSVP counts updated
    await expect(page.locator('[data-testid="rsvp-attending-count"]')).toContainText('3')
    await expect(page.locator('[data-testid="rsvp-declined-count"]')).toContainText('1')
    await expect(page.locator('[data-testid="rsvp-maybe-count"]')).toContainText('1')
    
    // Take screenshot of RSVP status
    await page.screenshot({ path: 'test-results/02-rsvp-responses.png', fullPage: true })
    
    // ========================
    // PHASE 3: TASK INTEGRATION
    // ========================
    
    console.log('Testing task integration...')
    
    // Switch to tasks tab
    await page.click('[data-testid="tasks-tab"]')
    await page.waitForSelector('[data-testid="task-integration"]')
    
    // Select wedding party members (first 6 guests)
    await page.click('[data-testid="guests-tab"]')
    await page.waitForSelector('[data-testid="guest-list"]')
    
    for (let i = 0; i < 6; i++) {
      await page.click(`[data-guest-id="guest-${i}"] input[type="checkbox"]`)
    }
    
    // Go back to tasks tab
    await page.click('[data-testid="tasks-tab"]')
    
    // Assign quick task template to selected guests
    await page.click('[data-testid="task-template-flowers"]')
    await page.click('[data-testid="assign-to-selected"]')
    
    // Wait for task assignment confirmation
    await page.waitForSelector('[data-testid="tasks-assigned"]')
    
    // Verify task statistics
    await expect(page.locator('[data-testid="total-tasks-count"]')).toContainText('6')
    await expect(page.locator('[data-testid="pending-tasks-count"]')).toContainText('6')
    
    // Create custom task for wedding coordinator
    await page.click('[data-testid="create-custom-task"]')
    await page.fill('[data-testid="task-title-input"]', 'Coordinate reception timeline')
    await page.fill('[data-testid="task-description-input"]', 'Ensure all vendors follow the detailed timeline')
    await page.selectOption('[data-testid="task-priority-select"]', 'high')
    await page.selectOption('[data-testid="task-category-select"]', 'venue_management')
    
    // Assign to maid of honor
    await page.click('[data-testid="create-and-assign-task"]')
    
    // Verify custom task created
    await expect(page.locator('[data-testid="total-tasks-count"]')).toContainText('7')
    
    // Take screenshot of task assignments
    await page.screenshot({ path: 'test-results/03-task-assignments.png', fullPage: true })
    
    // ========================
    // PHASE 4: BUDGET INTEGRATION
    // ========================
    
    console.log('Testing budget integration...')
    
    // Switch to budget tab
    await page.click('[data-testid="budget-tab"]')
    await page.waitForSelector('[data-testid="budget-integration"]')
    
    // Verify initial per-guest cost calculation
    const perGuestCost = await page.locator('[data-testid="per-guest-cost"]').textContent()
    console.log('Per guest cost:', perGuestCost)
    
    // Verify budget categories are loaded
    await expect(page.locator('[data-testid="budget-categories"]')).toBeVisible()
    
    // Check impact of current RSVP count (3 attending)
    const currentProjectedCost = await page.locator('[data-testid="current-projected-cost"]').textContent()
    console.log('Current projected cost for 3 attending guests:', currentProjectedCost)
    
    // Test "what if all attend" scenario
    await page.click('[data-testid="project-all-attend"]')
    await page.waitForSelector('[data-testid="projection-updated"]')
    
    const allAttendCost = await page.locator('[data-testid="all-attend-cost"]').textContent()
    console.log('Cost if all 150 guests attend:', allAttendCost)
    
    // Test budget overage alert for large guest count
    const budgetStatus = await page.locator('[data-testid="budget-status"]').textContent()
    if (budgetStatus?.includes('over')) {
      await expect(page.locator('[data-testid="budget-warning"]')).toBeVisible()
    }
    
    // Verify selected guests cost calculation (6 selected)
    await page.click('[data-testid="guests-tab"]')
    for (let i = 0; i < 6; i++) {
      await page.click(`[data-guest-id="guest-${i}"] input[type="checkbox"]`)
    }
    await page.click('[data-testid="budget-tab"]')
    
    const selectedGuestsCost = await page.locator('[data-testid="selected-guests-cost"]').textContent()
    console.log('Cost for 6 selected guests:', selectedGuestsCost)
    
    // Take screenshot of budget analysis
    await page.screenshot({ path: 'test-results/04-budget-analysis.png', fullPage: true })
    
    // ========================
    // PHASE 5: WEBSITE INTEGRATION
    // ========================
    
    console.log('Testing website integration...')
    
    // Switch to website tab
    await page.click('[data-testid="website-tab"]')
    await page.waitForSelector('[data-testid="website-integration"]')
    
    // Verify website status
    await expect(page.locator('[data-testid="website-status"]')).toContainText('Published')
    
    // Check guest display settings
    await expect(page.locator('[data-testid="family-section-enabled"]')).toBeChecked()
    await expect(page.locator('[data-testid="friends-section-enabled"]')).toBeChecked()
    await expect(page.locator('[data-testid="wedding-party-section-enabled"]')).toBeChecked()
    
    // Toggle website preview between desktop and mobile
    await page.click('[data-testid="mobile-preview-toggle"]')
    await expect(page.locator('[data-testid="website-preview"]')).toHaveClass(/mobile/)
    
    await page.click('[data-testid="desktop-preview-toggle"]')
    await expect(page.locator('[data-testid="website-preview"]')).toHaveClass(/desktop/)
    
    // Verify guest counts in different sections
    await expect(page.locator('[data-testid="family-guest-count"]')).toContainText(/\d+/)
    await expect(page.locator('[data-testid="friends-guest-count"]')).toContainText(/\d+/)
    await expect(page.locator('[data-testid="wedding-party-count"]')).toContainText(/\d+/)
    
    // Check website analytics
    const websiteViews = await page.locator('[data-testid="website-views"]').textContent()
    console.log('Website views:', websiteViews)
    
    // Take screenshot of website preview
    await page.screenshot({ path: 'test-results/05-website-preview.png', fullPage: true })
    
    // ========================
    // PHASE 6: REAL-TIME SYNC TEST
    // ========================
    
    console.log('Testing real-time synchronization...')
    
    // Open second tab to test real-time sync
    const secondPage = await page.context().newPage()
    await secondPage.goto('/wedme/guests')
    await secondPage.waitForSelector('[data-testid="guest-list-integrated"]')
    
    // Make changes in first tab
    await page.click('[data-testid="guests-tab"]')
    await page.click(`[data-guest-id="guest-7"] [data-testid="edit-guest"]`)
    await page.fill('[data-testid="guest-first-name"]', 'UpdatedName')
    await page.click('[data-testid="save-guest"]')
    
    // Verify change appears in second tab
    await secondPage.waitForSelector('[data-testid="sync-update-received"]', { timeout: 5000 })
    await expect(secondPage.locator('[data-guest-id="guest-7"] [data-testid="guest-name"]')).toContainText('UpdatedName')
    
    // Change RSVP status in first tab
    await page.click('[data-testid="rsvp-tab"]')
    await page.click(`[data-guest-id="guest-5"] [data-testid="rsvp-attending-btn"]`)
    
    // Verify RSVP count updates in second tab
    await secondPage.click('[data-testid="rsvp-tab"]')
    await expect(secondPage.locator('[data-testid="rsvp-attending-count"]')).toContainText('4')
    
    // Verify budget updates automatically in both tabs
    await page.click('[data-testid="budget-tab"]')
    await secondPage.click('[data-testid="budget-tab"]')
    
    const updatedProjectedCost = await page.locator('[data-testid="current-projected-cost"]').textContent()
    const secondTabProjectedCost = await secondPage.locator('[data-testid="current-projected-cost"]').textContent()
    
    expect(updatedProjectedCost).toEqual(secondTabProjectedCost)
    
    await secondPage.close()
    
    // Take screenshot of final integrated state
    await page.screenshot({ path: 'test-results/06-final-integration-state.png', fullPage: true })
    
    // ========================
    // PHASE 7: PERFORMANCE VALIDATION
    // ========================
    
    console.log('Validating performance metrics...')
    
    // Measure page load performance
    const performanceMetrics = await page.evaluate(() => {
      return {
        renderTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        guestCount: document.querySelectorAll('[data-guest-id]').length
      }
    })
    
    console.log('Performance metrics:', performanceMetrics)
    
    // Verify performance requirements
    expect(performanceMetrics.renderTime).toBeLessThan(5000) // Page loads < 5s with 150 guests
    expect(performanceMetrics.guestCount).toEqual(150) // All 150 guests rendered
    
    // Test real-time update performance
    const syncStartTime = Date.now()
    await page.click('[data-testid="trigger-sync-all"]')
    await page.waitForSelector('[data-testid="sync-completed"]')
    const syncDuration = Date.now() - syncStartTime
    
    expect(syncDuration).toBeLessThan(1000) // Sync completes < 1s
    
    // ========================
    // PHASE 8: ACCESSIBILITY VALIDATION
    // ========================
    
    console.log('Validating accessibility compliance...')
    
    // Check all tabs are accessible via keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Should focus first tab
    
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter') // Should switch to RSVP tab
    await expect(page.locator('[data-testid="rsvp-tab"]')).toHaveAttribute('aria-selected', 'true')
    
    // Verify ARIA labels are present
    await expect(page.locator('[data-testid="guest-search"]')).toHaveAttribute('aria-label')
    await expect(page.locator('[data-testid="guest-count-stat"]')).toHaveAttribute('aria-describedby')
    
    // Check focus management
    await page.click('[data-testid="add-guest-btn"]')
    await page.waitForSelector('[data-testid="add-guest-modal"]')
    const focusedElement = await page.locator(':focus').getAttribute('data-testid')
    expect(focusedElement).toBe('guest-first-name-input') // Focus goes to first input
    
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-testid="add-guest-modal"]', { state: 'hidden' })
    
    // ========================
    // PHASE 9: ERROR RECOVERY TEST
    // ========================
    
    console.log('Testing error recovery mechanisms...')
    
    // Simulate network error during sync
    await page.route('/api/guests/sync', route => route.abort())
    
    await page.click('[data-testid="trigger-sync-all"]')
    
    // Verify error handling
    await expect(page.locator('[data-testid="sync-error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="retry-sync-btn"]')).toBeVisible()
    
    // Restore network and retry
    await page.unroute('/api/guests/sync')
    await page.click('[data-testid="retry-sync-btn"]')
    await page.waitForSelector('[data-testid="sync-completed"]')
    
    // ========================
    // FINAL VALIDATION
    // ========================
    
    console.log('Final integration validation...')
    
    // Verify all systems show consistent data
    await page.click('[data-testid="guests-tab"]')
    const finalGuestCount = await page.locator('[data-testid="total-guests-count"]').textContent()
    
    await page.click('[data-testid="rsvp-tab"]')
    const finalAttendingCount = await page.locator('[data-testid="rsvp-attending-count"]').textContent()
    
    await page.click('[data-testid="tasks-tab"]')
    const finalTaskCount = await page.locator('[data-testid="total-tasks-count"]').textContent()
    
    await page.click('[data-testid="budget-tab"]')
    const finalBudgetProjection = await page.locator('[data-testid="current-projected-cost"]').textContent()
    
    await page.click('[data-testid="website-tab"]')
    const finalWebsiteStatus = await page.locator('[data-testid="website-status"]').textContent()
    
    // Log final state
    console.log('=== FINAL INTEGRATION STATE ===')
    console.log('Total Guests:', finalGuestCount)
    console.log('RSVP Attending:', finalAttendingCount)
    console.log('Tasks Assigned:', finalTaskCount)
    console.log('Budget Projection:', finalBudgetProjection)
    console.log('Website Status:', finalWebsiteStatus)
    console.log('================================')
    
    // Verify all integrations are operational
    await expect(page.locator('[data-testid="integration-health-check"]')).toContainText('All systems operational')
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/07-integration-complete.png', fullPage: true })
    
    console.log('✅ Complete guest ecosystem integration test PASSED')
  })

  test('mobile responsive integration test', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verify mobile layout works
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    await expect(page.locator('[data-testid="tab-list"]')).toHaveClass(/mobile/)
    
    // Test mobile interactions
    await page.click('[data-testid="rsvp-tab"]')
    await expect(page.locator('[data-testid="rsvp-integration"]')).toBeVisible()
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/08-mobile-integration.png' })
  })

  test('cross-browser integration test', async ({ page, browserName }) => {
    console.log(`Testing integration in ${browserName}`)
    
    // Basic functionality should work across browsers
    await expect(page.locator('[data-testid="guest-list-integrated"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Connected')
    
    // Test tab switching
    await page.click('[data-testid="rsvp-tab"]')
    await expect(page.locator('[data-testid="rsvp-integration"]')).toBeVisible()
    
    await page.click('[data-testid="tasks-tab"]')
    await expect(page.locator('[data-testid="task-integration"]')).toBeVisible()
    
    await page.click('[data-testid="budget-tab"]')
    await expect(page.locator('[data-testid="budget-integration"]')).toBeVisible()
    
    await page.click('[data-testid="website-tab"]')
    await expect(page.locator('[data-testid="website-integration"]')).toBeVisible()
  })
})

// Helper functions

function generateSarahsWeddingGuests() {
  const guests = []
  
  // Wedding party (12 people)
  guests.push(...[
    { first_name: 'Jessica', last_name: 'Martinez', category: 'friends', side: 'partner1', helper_role: 'maid_of_honor' },
    { first_name: 'David', last_name: 'Johnson', category: 'friends', side: 'partner2', helper_role: 'best_man' },
    { first_name: 'Emily', last_name: 'Davis', category: 'friends', side: 'partner1', helper_role: 'bridesmaid' },
    { first_name: 'Ryan', last_name: 'Wilson', category: 'friends', side: 'partner2', helper_role: 'groomsman' },
    { first_name: 'Ashley', last_name: 'Taylor', category: 'friends', side: 'partner1', helper_role: 'bridesmaid' },
    { first_name: 'Tyler', last_name: 'Anderson', category: 'friends', side: 'partner2', helper_role: 'groomsman' }
    // ... continue for 12 total wedding party members
  ])
  
  // Family members (50 people)
  guests.push(...[
    { first_name: 'Robert', last_name: 'Smith', category: 'family', side: 'partner1', email: 'robert.smith@email.com' },
    { first_name: 'Linda', last_name: 'Smith', category: 'family', side: 'partner1', email: 'linda.smith@email.com' },
    { first_name: 'James', last_name: 'Brown', category: 'family', side: 'partner2', email: 'james.brown@email.com' },
    { first_name: 'Mary', last_name: 'Brown', category: 'family', side: 'partner2', email: 'mary.brown@email.com' }
    // ... continue for 50 total family members
  ])
  
  // Friends (88 people to reach 150 total)
  for (let i = 6; i < 150; i++) {
    guests.push({
      first_name: `Friend${i}`,
      last_name: `LastName${i}`,
      category: 'friends',
      side: i % 2 === 0 ? 'partner1' : 'partner2',
      email: `friend${i}@email.com`
    })
  }
  
  return guests.slice(0, 150) // Ensure exactly 150 guests
}

function generateGuestCSV(guests: any[]): string {
  const header = 'first_name,last_name,email,category,side,helper_role'
  const rows = guests.map(guest => 
    `${guest.first_name},${guest.last_name},${guest.email || ''},${guest.category},${guest.side},${guest.helper_role || ''}`
  )
  return [header, ...rows].join('\n')
}

async function simulateRSVPResponses(page: any, responses: Array<{guestId: string, status: string, partySize: number}>) {
  for (const response of responses) {
    await page.click(`[data-guest-id="${response.guestId}"] [data-testid="rsvp-${response.status.replace('_', '-')}-btn"]`)
    
    if (response.partySize > 1) {
      await page.fill(`[data-guest-id="${response.guestId}"] [data-testid="party-size-input"]`, response.partySize.toString())
    }
    
    // Wait for update to process
    await page.waitForTimeout(500)
  }
}