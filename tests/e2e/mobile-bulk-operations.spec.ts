import { test, expect, devices } from '@playwright/test'

// Configure mobile device emulation
test.use(devices['iPhone 12'])

test.describe('Mobile Bulk Operations - WS-034', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to clients page
    await page.goto('/clients')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="client-list"]', { timeout: 10000 })
  })

  test('Touch selection workflow - single client', async ({ page }) => {
    // Test single tap to enter selection mode
    const firstClient = page.locator('[data-testid="client-row"]').first()
    
    // Long press to enter selection mode
    await firstClient.touchscreen.tap()
    await page.waitForTimeout(500) // Long press simulation
    await firstClient.touchscreen.tap()
    
    // Verify selection mode is active
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('1')
  })

  test('Multi-select with touch gestures', async ({ page }) => {
    // Enter selection mode
    const firstClient = page.locator('[data-testid="client-row"]').first()
    await firstClient.touchscreen.tap()
    
    // Select multiple clients with taps
    const secondClient = page.locator('[data-testid="client-row"]').nth(1)
    const thirdClient = page.locator('[data-testid="client-row"]').nth(2)
    
    await secondClient.touchscreen.tap()
    await thirdClient.touchscreen.tap()
    
    // Verify multiple selection
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('3')
    
    // Verify bulk actions bar is visible
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
  })

  test('Swipe to select range - mobile gesture', async ({ page }) => {
    // Start selection
    const firstClient = page.locator('[data-testid="client-row"]').first()
    await firstClient.touchscreen.tap()
    
    // Simulate swipe down to select range
    const startPoint = await firstClient.boundingBox()
    const endClient = page.locator('[data-testid="client-row"]').nth(4)
    const endPoint = await endClient.boundingBox()
    
    if (startPoint && endPoint) {
      await page.touchscreen.tap(startPoint.x + startPoint.width / 2, startPoint.y + startPoint.height / 2)
      await page.touchscreen.swipe(
        startPoint.x + startPoint.width / 2,
        startPoint.y + startPoint.height / 2,
        endPoint.x + endPoint.width / 2,
        endPoint.y + endPoint.height / 2
      )
    }
    
    // Verify range selection (should select 5 clients)
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('5')
  })

  test('Mobile bulk actions bottom sheet', async ({ page }) => {
    // Select clients first
    await selectMultipleClients(page, 3)
    
    // Open bulk actions
    await page.locator('[data-testid="bulk-actions"]').tap()
    
    // Verify bottom sheet appears
    await expect(page.locator('[data-testid="mobile-bulk-actions"]')).toBeVisible()
    
    // Test action buttons are touch-friendly (44x44px minimum)
    const emailButton = page.locator('[data-testid="mobile-bulk-email"]')
    const buttonBox = await emailButton.boundingBox()
    
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('Email bulk operation workflow', async ({ page }) => {
    // Select clients
    await selectMultipleClients(page, 2)
    
    // Open bulk actions
    await page.locator('[data-testid="bulk-actions"]').tap()
    
    // Select email action
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    
    // Configure email
    await page.locator('text=Timeline Request').tap()
    
    // Execute action
    await page.locator('text=Execute Send Email').tap()
    
    // Verify progress modal appears
    await expect(page.locator('[data-testid="bulk-progress-modal"]')).toBeVisible()
    
    // Wait for completion
    await page.waitForSelector('text=Operation Completed', { timeout: 30000 })
    
    // Verify success message
    await expect(page.locator('text=All 2 items were processed successfully')).toBeVisible()
  })

  test('Form distribution workflow', async ({ page }) => {
    // Select clients
    await selectMultipleClients(page, 3)
    
    // Open bulk actions
    await page.locator('[data-testid="bulk-actions"]').tap()
    
    // Select form action
    await page.locator('[data-testid="mobile-bulk-form"]').tap()
    
    // Select timeline form
    await page.locator('text=Timeline Form').tap()
    
    // Execute
    await page.locator('text=Execute Send Form').tap()
    
    // Verify progress tracking
    await expect(page.locator('[data-testid="mobile-progress-indicator"]')).toBeVisible()
    
    // Check progress updates
    await expect(page.locator('text=Sending Forms')).toBeVisible()
    await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible()
  })

  test('Expandable actions interface', async ({ page }) => {
    // Select clients
    await selectMultipleClients(page, 2)
    
    // Verify collapsed state shows primary actions
    await expect(page.locator('[data-testid="bulk-action-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="bulk-action-form"]')).toBeVisible()
    
    // Double tap to expand
    const expandHandle = page.locator('[aria-label="Expand actions"]')
    await expandHandle.dblclick()
    
    // Verify expanded state shows additional actions
    await expect(page.locator('text=Update Status')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()
  })

  test('Pull to refresh functionality', async ({ page }) => {
    // Simulate pull to refresh gesture
    const clientList = page.locator('[data-testid="client-list"]')
    const listBox = await clientList.boundingBox()
    
    if (listBox) {
      // Pull down from top
      await page.touchscreen.swipe(
        listBox.x + listBox.width / 2,
        listBox.y + 50,
        listBox.x + listBox.width / 2,
        listBox.y + 200
      )
      
      // Verify refresh indicator
      await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
      
      // Wait for refresh to complete
      await page.waitForSelector('[data-testid="refresh-indicator"]', { state: 'hidden', timeout: 5000 })
    }
  })

  test('Offline support and sync queue', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true)
    
    // Select clients and perform action
    await selectMultipleClients(page, 2)
    await page.locator('[data-testid="bulk-actions"]').tap()
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    await page.locator('text=Timeline Request').tap()
    await page.locator('text=Execute Send Email').tap()
    
    // Verify offline queue notification
    await expect(page.locator('text=Queued for sync')).toBeVisible()
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Go back online
    await page.context().setOffline(false)
    
    // Verify sync starts automatically
    await expect(page.locator('text=Syncing queued operations')).toBeVisible()
    
    // Wait for sync completion
    await page.waitForSelector('[data-testid="offline-indicator"]', { state: 'hidden', timeout: 10000 })
  })

  test('Haptic feedback simulation', async ({ page }) => {
    // Mock vibration API
    await page.addInitScript(() => {
      let vibrationCalls = 0
      Object.defineProperty(navigator, 'vibrate', {
        value: (pattern: number | number[]) => {
          window.vibrationCalls = (window.vibrationCalls || 0) + 1
          return true
        }
      })
    })
    
    // Long press should trigger haptic feedback
    const firstClient = page.locator('[data-testid="client-row"]').first()
    await firstClient.touchscreen.tap()
    await page.waitForTimeout(600) // Long press
    
    // Check if vibration was called
    const vibrationCalls = await page.evaluate(() => (window as any).vibrationCalls)
    expect(vibrationCalls).toBeGreaterThan(0)
  })

  test('Performance on 3G connection', async ({ page }) => {
    // Simulate slow 3G connection
    await page.context().route('**/*', async route => {
      // Add 500ms delay to simulate slow connection
      await new Promise(resolve => setTimeout(resolve, 500))
      return route.continue()
    })
    
    const startTime = Date.now()
    
    // Perform bulk operation
    await selectMultipleClients(page, 5)
    await page.locator('[data-testid="bulk-actions"]').tap()
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    await page.locator('text=Timeline Request').tap()
    await page.locator('text=Execute Send Email').tap()
    
    // Wait for completion
    await page.waitForSelector('text=Operation Completed', { timeout: 45000 })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Should complete within 30 seconds even on slow connection
    expect(duration).toBeLessThan(30000)
  })

  test('Battery optimization - background processing', async ({ page }) => {
    // Mock Page Visibility API
    await page.addInitScript(() => {
      let hidden = false
      Object.defineProperty(document, 'hidden', {
        get: () => hidden,
        configurable: true
      })
      
      window.setDocumentHidden = (value: boolean) => {
        hidden = value
        document.dispatchEvent(new Event('visibilitychange'))
      }
    })
    
    // Start bulk operation
    await selectMultipleClients(page, 10)
    await page.locator('[data-testid="bulk-actions"]').tap()
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    await page.locator('text=Timeline Request').tap()
    await page.locator('text=Execute Send Email').tap()
    
    // Simulate going to background
    await page.evaluate(() => (window as any).setDocumentHidden(true))
    
    // Verify operation continues (check progress periodically)
    await page.waitForTimeout(2000)
    const progressText = await page.locator('[data-testid="progress-percentage"]').textContent()
    expect(progressText).toMatch(/\d+%/)
    
    // Return to foreground
    await page.evaluate(() => (window as any).setDocumentHidden(false))
    
    // Verify operation completes
    await page.waitForSelector('text=Operation Completed', { timeout: 30000 })
  })

  test('Accessibility - screen reader support', async ({ page }) => {
    // Enable screen reader simulation
    await page.context().grantPermissions(['accessibility-events'])
    
    // Select clients
    await selectMultipleClients(page, 3)
    
    // Verify ARIA labels and roles
    await expect(page.locator('[aria-label="3 clients selected"]')).toBeVisible()
    await expect(page.locator('[role="toolbar"]')).toBeVisible()
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Verify focus management
    const focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('Large dataset performance - 100+ clients', async ({ page }) => {
    // Mock API to return large dataset
    await page.route('**/api/clients', async route => {
      const clients = Array.from({ length: 150 }, (_, i) => ({
        id: `client-${i}`,
        first_name: `Client${i}`,
        last_name: 'Test',
        email: `client${i}@test.com`,
        status: 'lead',
        wedding_date: '2024-12-01'
      }))
      
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: clients })
      })
    })
    
    // Reload page with large dataset
    await page.reload()
    await page.waitForSelector('[data-testid="client-list"]')
    
    const startTime = Date.now()
    
    // Select all clients
    await page.locator('[data-testid="select-all-toggle"]').tap()
    
    const selectionTime = Date.now() - startTime
    
    // Should select all within 2 seconds
    expect(selectionTime).toBeLessThan(2000)
    
    // Verify count
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('150')
  })

  test('Error handling and retry mechanism', async ({ page }) => {
    // Mock API to fail initially then succeed
    let attemptCount = 0
    await page.route('**/api/clients/bulk', async route => {
      attemptCount++
      if (attemptCount === 1) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, processedCount: 2 })
      })
    })
    
    // Perform bulk operation
    await selectMultipleClients(page, 2)
    await page.locator('[data-testid="bulk-actions"]').tap()
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    await page.locator('text=Timeline Request').tap()
    await page.locator('text=Execute Send Email').tap()
    
    // Verify error message appears
    await expect(page.locator('text=Operation failed')).toBeVisible()
    
    // Test retry functionality
    await page.locator('text=Retry Failed').tap()
    
    // Verify success on retry
    await page.waitForSelector('text=Operation Completed', { timeout: 10000 })
  })
})

// Helper function to select multiple clients
async function selectMultipleClients(page: any, count: number) {
  for (let i = 0; i < count; i++) {
    const client = page.locator('[data-testid="client-row"]').nth(i)
    await client.touchscreen.tap()
    
    // Small delay between selections for realistic interaction
    await page.waitForTimeout(100)
  }
  
  // Verify selection count
  await expect(page.locator('[data-testid="selection-count"]')).toContainText(count.toString())
}

// Performance measurement utilities
test.describe('Performance Metrics', () => {
  test('Measure touch response time', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    
    // Measure touch to visual feedback time
    const client = page.locator('[data-testid="client-row"]').first()
    
    const startTime = Date.now()
    await client.touchscreen.tap()
    
    // Wait for visual feedback (selection highlight)
    await page.waitForSelector('[data-selected="true"]')
    const responseTime = Date.now() - startTime
    
    // Touch response should be < 100ms for good UX
    expect(responseTime).toBeLessThan(100)
  })

  test('Memory usage monitoring', async ({ page }) => {
    // Monitor memory during large operations
    await page.goto('/clients')
    
    const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
    
    // Select many clients
    await selectMultipleClients(page, 50)
    
    // Perform bulk operation
    await page.locator('[data-testid="bulk-actions"]').tap()
    await page.locator('[data-testid="mobile-bulk-email"]').tap()
    await page.locator('text=Timeline Request').tap()
    await page.locator('text=Execute Send Email').tap()
    
    await page.waitForSelector('text=Operation Completed')
    
    const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be reasonable (< 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
  })
})