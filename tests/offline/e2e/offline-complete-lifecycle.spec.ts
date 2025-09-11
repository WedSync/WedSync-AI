/**
 * WS-144: Comprehensive E2E Tests for Offline Functionality
 * Tests complete offline-online lifecycle with multi-device scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { v4 as uuidv4 } from 'uuid'

// =====================================================
// TEST CONFIGURATION
// =====================================================

const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  testUser: {
    email: 'test.dj@wedsync.com',
    password: 'TestPassword123!',
    role: 'vendor'
  },
  weddingData: {
    couple: 'John & Jane Doe',
    date: '2025-12-25',
    venue: 'Mountain View Resort',
    guestCount: 150
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', TEST_CONFIG.testUser.email)
  await page.fill('input[name="password"]', TEST_CONFIG.testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

async function goOffline(context: BrowserContext) {
  await context.setOffline(true)
}

async function goOnline(context: BrowserContext) {
  await context.setOffline(false)
}

async function waitForSync(page: Page) {
  await page.waitForSelector('[data-testid="sync-indicator"][data-status="synced"]', {
    timeout: 30000
  })
}

async function createWeddingData(page: Page) {
  const weddingId = uuidv4()
  
  // Create client
  await page.goto('/clients/new')
  await page.fill('input[name="coupleName"]', TEST_CONFIG.weddingData.couple)
  await page.fill('input[name="weddingDate"]', TEST_CONFIG.weddingData.date)
  await page.fill('input[name="venue"]', TEST_CONFIG.weddingData.venue)
  await page.fill('input[name="guestCount"]', TEST_CONFIG.weddingData.guestCount.toString())
  await page.click('button[type="submit"]')
  
  // Wait for creation
  await page.waitForURL(/\/clients\/[a-z0-9-]+/)
  
  return weddingId
}

// =====================================================
// MAIN TEST SUITE
// =====================================================

test.describe('WS-144: Offline Functionality - Complete Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // =====================================================
  // TEST 1: BASIC OFFLINE-ONLINE CYCLE
  // =====================================================
  
  test('Complete offline-online lifecycle with data modifications', async ({ page, context }) => {
    // Step 1: Create initial data while online
    const weddingId = await createWeddingData(page)
    await waitForSync(page)
    
    // Step 2: Go offline
    await goOffline(context)
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Offline')
    
    // Step 3: Modify data while offline
    await page.goto(`/clients/${weddingId}/guests`)
    
    // Add new guest
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('input[name="firstName"]', 'Offline')
    await page.fill('input[name="lastName"]', 'Guest')
    await page.fill('input[name="email"]', 'offline.guest@example.com')
    await page.selectOption('select[name="rsvpStatus"]', 'accepted')
    await page.click('button[data-testid="save-guest"]')
    
    // Verify guest was added locally
    await expect(page.locator('text=Offline Guest')).toBeVisible()
    
    // Verify pending sync indicator
    await expect(page.locator('[data-testid="sync-indicator"][data-status="pending"]')).toBeVisible()
    
    // Step 4: Go back online
    await goOnline(context)
    
    // Wait for sync to complete
    await waitForSync(page)
    
    // Step 5: Verify data synced correctly
    await page.reload()
    await expect(page.locator('text=Offline Guest')).toBeVisible()
    
    // Verify sync success notification
    await expect(page.locator('[data-testid="notification-success"]')).toContainText('All changes synced')
  })

  // =====================================================
  // TEST 2: MULTI-DEVICE CONFLICT RESOLUTION
  // =====================================================
  
  test('Multi-device conflict resolution with intelligent merge', async ({ browser }) => {
    // Create two browser contexts (simulating two devices)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Login on both devices
      await login(page1)
      await login(page2)
      
      // Create wedding data on device 1
      const weddingId = await createWeddingData(page1)
      await waitForSync(page1)
      
      // Load same wedding on device 2
      await page2.goto(`/clients/${weddingId}`)
      await page2.waitForSelector('[data-testid="wedding-details"]')
      
      // Both devices go offline
      await goOffline(context1)
      await goOffline(context2)
      
      // Device 1: Update venue
      await page1.click('[data-testid="edit-wedding"]')
      await page1.fill('input[name="venue"]', 'Beach Resort')
      await page1.click('button[data-testid="save-changes"]')
      
      // Device 2: Update guest count
      await page2.click('[data-testid="edit-wedding"]')
      await page2.fill('input[name="guestCount"]', '200')
      await page2.click('button[data-testid="save-changes"]')
      
      // Device 1 comes online first
      await goOnline(context1)
      await waitForSync(page1)
      
      // Device 2 comes online
      await goOnline(context2)
      await waitForSync(page2)
      
      // Both devices should have merged data
      await page1.reload()
      await page2.reload()
      
      // Verify merged data on both devices
      await expect(page1.locator('[data-testid="venue-name"]')).toHaveText('Beach Resort')
      await expect(page1.locator('[data-testid="guest-count"]')).toHaveText('200')
      
      await expect(page2.locator('[data-testid="venue-name"]')).toHaveText('Beach Resort')
      await expect(page2.locator('[data-testid="guest-count"]')).toHaveText('200')
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  // =====================================================
  // TEST 3: EXTENDED OFFLINE PERIOD (7+ DAYS)
  // =====================================================
  
  test('Extended offline period with data integrity', async ({ page, context }) => {
    // Create initial data
    const weddingId = await createWeddingData(page)
    
    // Go offline
    await goOffline(context)
    
    // Simulate 7 days of offline work
    const operations = []
    
    for (let day = 1; day <= 7; day++) {
      // Add guests
      for (let i = 0; i < 5; i++) {
        await page.goto(`/clients/${weddingId}/guests`)
        await page.click('[data-testid="add-guest-button"]')
        await page.fill('input[name="firstName"]', `Day${day}`)
        await page.fill('input[name="lastName"]', `Guest${i}`)
        await page.click('button[data-testid="save-guest"]')
        operations.push(`Day${day} Guest${i}`)
      }
      
      // Update timeline
      await page.goto(`/clients/${weddingId}/timeline`)
      await page.click('[data-testid="add-event"]')
      await page.fill('input[name="eventName"]', `Day ${day} Event`)
      await page.fill('input[name="time"]', `${10 + day}:00`)
      await page.click('button[data-testid="save-event"]')
      
      // Add vendor notes
      await page.goto(`/clients/${weddingId}/vendors`)
      await page.click('[data-testid="add-note"]')
      await page.fill('textarea[name="note"]', `Day ${day} vendor coordination notes`)
      await page.click('button[data-testid="save-note"]')
    }
    
    // Verify all data is stored locally
    await page.goto(`/clients/${weddingId}/guests`)
    for (const guest of operations) {
      await expect(page.locator(`text=${guest}`)).toBeVisible()
    }
    
    // Go back online
    await goOnline(context)
    
    // Wait for batch sync
    await page.waitForSelector('[data-testid="sync-progress"]')
    await waitForSync(page)
    
    // Verify all data synced
    await page.reload()
    for (const guest of operations) {
      await expect(page.locator(`text=${guest}`)).toBeVisible()
    }
    
    // Check data integrity
    const integrityCheck = await page.evaluate(() => {
      return window.localStorage.getItem('integrity_check_result')
    })
    
    expect(JSON.parse(integrityCheck || '{}')).toMatchObject({
      status: 'valid',
      dataLoss: false
    })
  })

  // =====================================================
  // TEST 4: SERVICE WORKER CACHING
  // =====================================================
  
  test('Service worker caching and offline page loading', async ({ page, context }) => {
    // Pre-cache wedding data
    const weddingId = await createWeddingData(page)
    
    // Navigate through all main pages to cache them
    const pages = [
      '/dashboard',
      `/clients/${weddingId}`,
      `/clients/${weddingId}/guests`,
      `/clients/${weddingId}/timeline`,
      `/clients/${weddingId}/vendors`
    ]
    
    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
    }
    
    // Go offline
    await goOffline(context)
    
    // All pages should load from cache
    for (const url of pages) {
      await page.goto(url)
      await expect(page).toHaveURL(url)
      await expect(page.locator('[data-testid="offline-badge"]')).toBeVisible()
    }
    
    // Verify cached data is displayed
    await page.goto(`/clients/${weddingId}`)
    await expect(page.locator('[data-testid="wedding-details"]')).toBeVisible()
    await expect(page.locator(`text=${TEST_CONFIG.weddingData.couple}`)).toBeVisible()
  })

  // =====================================================
  // TEST 5: BACKGROUND SYNC
  // =====================================================
  
  test('Background sync with queued operations', async ({ page, context }) => {
    // Create initial data
    const weddingId = await createWeddingData(page)
    
    // Go offline
    await goOffline(context)
    
    // Queue multiple operations
    const operations = []
    
    // Add 10 guests
    for (let i = 0; i < 10; i++) {
      await page.goto(`/clients/${weddingId}/guests`)
      await page.click('[data-testid="add-guest-button"]')
      await page.fill('input[name="firstName"]', `Queued${i}`)
      await page.fill('input[name="lastName"]', 'Guest')
      await page.click('button[data-testid="save-guest"]')
      operations.push(`guest-${i}`)
    }
    
    // Update wedding details 5 times
    for (let i = 0; i < 5; i++) {
      await page.goto(`/clients/${weddingId}`)
      await page.click('[data-testid="edit-wedding"]')
      await page.fill('input[name="notes"]', `Update ${i}`)
      await page.click('button[data-testid="save-changes"]')
      operations.push(`update-${i}`)
    }
    
    // Check sync queue
    const queueStatus = await page.evaluate(() => {
      return window.localStorage.getItem('sync_queue_status')
    })
    
    const queue = JSON.parse(queueStatus || '{}')
    expect(queue.pending).toBe(15)
    
    // Go online
    await goOnline(context)
    
    // Monitor background sync
    await page.waitForSelector('[data-testid="sync-progress"]')
    
    // Wait for all operations to sync
    await page.waitForFunction(
      () => {
        const status = window.localStorage.getItem('sync_queue_status')
        const queue = JSON.parse(status || '{}')
        return queue.pending === 0
      },
      { timeout: 60000 }
    )
    
    // Verify all operations completed
    await page.reload()
    await page.goto(`/clients/${weddingId}/guests`)
    
    for (let i = 0; i < 10; i++) {
      await expect(page.locator(`text=Queued${i} Guest`)).toBeVisible()
    }
  })

  // =====================================================
  // TEST 6: OFFLINE ANALYTICS
  // =====================================================
  
  test('Offline analytics tracking and reporting', async ({ page, context }) => {
    // Enable analytics tracking
    await page.evaluate(() => {
      window.localStorage.setItem('analytics_enabled', 'true')
    })
    
    // Create wedding data
    const weddingId = await createWeddingData(page)
    
    // Go offline
    await goOffline(context)
    
    // Perform various offline operations
    const startTime = Date.now()
    
    // Navigate pages
    await page.goto('/dashboard')
    await page.goto(`/clients/${weddingId}`)
    await page.goto(`/clients/${weddingId}/guests`)
    
    // Add data
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('input[name="firstName"]', 'Analytics')
    await page.fill('input[name="lastName"]', 'Test')
    await page.click('button[data-testid="save-guest"]')
    
    // Trigger an error
    await page.goto('/non-existent-page')
    
    const offlineDuration = Date.now() - startTime
    
    // Go online
    await goOnline(context)
    await waitForSync(page)
    
    // Check analytics report
    await page.goto('/analytics/offline-report')
    await page.waitForSelector('[data-testid="analytics-report"]')
    
    const report = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="analytics-data"]')
      return element ? JSON.parse(element.textContent || '{}') : {}
    })
    
    expect(report).toMatchObject({
      offlineEvents: expect.any(Number),
      averageOfflineDuration: expect.any(Number),
      syncSuccessRate: expect.any(Number)
    })
    
    expect(report.offlineEvents).toBeGreaterThan(0)
    expect(report.syncSuccessRate).toBeGreaterThanOrEqual(90)
  })

  // =====================================================
  // TEST 7: CROSS-DEVICE SESSION HANDOFF
  // =====================================================
  
  test('Cross-device session handoff', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Start session on device 1
      await login(page1)
      const weddingId = await createWeddingData(page1)
      
      // Begin editing on device 1
      await page1.goto(`/clients/${weddingId}/timeline`)
      await page1.click('[data-testid="add-event"]')
      await page1.fill('input[name="eventName"]', 'Ceremony Start')
      
      // Initiate handoff to device 2
      await page1.click('[data-testid="session-handoff"]')
      await page1.click('[data-testid="generate-handoff-code"]')
      
      const handoffCode = await page1.locator('[data-testid="handoff-code"]').textContent()
      
      // Device 2: Receive handoff
      await login(page2)
      await page2.goto('/session/handoff')
      await page2.fill('input[name="handoffCode"]', handoffCode || '')
      await page2.click('button[data-testid="receive-handoff"]')
      
      // Verify session transferred
      await page2.waitForURL(`/clients/${weddingId}/timeline`)
      
      // Form should have partial data
      await expect(page2.locator('input[name="eventName"]')).toHaveValue('Ceremony Start')
      
      // Complete edit on device 2
      await page2.fill('input[name="time"]', '14:00')
      await page2.click('button[data-testid="save-event"]')
      
      // Verify on device 1
      await page1.reload()
      await expect(page1.locator('text=Ceremony Start')).toBeVisible()
      await expect(page1.locator('text=14:00')).toBeVisible()
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  // =====================================================
  // TEST 8: DATA INTEGRITY VALIDATION
  // =====================================================
  
  test('Data integrity validation during sync', async ({ page, context }) => {
    // Create wedding with complex data
    const weddingId = await createWeddingData(page)
    
    // Add various data types
    await page.goto(`/clients/${weddingId}/guests`)
    
    // Add guest with all fields
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('input[name="firstName"]', 'Complete')
    await page.fill('input[name="lastName"]', 'Guest')
    await page.fill('input[name="email"]', 'complete@example.com')
    await page.fill('input[name="phone"]', '+1234567890')
    await page.selectOption('select[name="rsvpStatus"]', 'accepted')
    await page.fill('input[name="tableNumber"]', '5')
    await page.fill('input[name="dietaryRestrictions"]', 'Vegan, Gluten-free')
    await page.click('button[data-testid="save-guest"]')
    
    // Go offline
    await goOffline(context)
    
    // Corrupt some data (simulate data corruption)
    await page.evaluate(() => {
      const corrupted = {
        id: 'corrupted-guest',
        firstName: null, // Invalid: required field
        lastName: 'Corrupted',
        email: 'invalid-email', // Invalid: bad format
        rsvpStatus: 'invalid-status', // Invalid: not in enum
        tableNumber: -1 // Invalid: negative number
      }
      
      const db = window.indexedDB.open('WedSyncOffline')
      db.onsuccess = () => {
        const transaction = db.result.transaction(['guests'], 'readwrite')
        transaction.objectStore('guests').add(corrupted)
      }
    })
    
    // Go online and trigger sync
    await goOnline(context)
    
    // Wait for validation
    await page.waitForSelector('[data-testid="validation-in-progress"]')
    
    // Check validation results
    await page.waitForSelector('[data-testid="validation-complete"]')
    
    const validationResult = await page.evaluate(() => {
      return window.localStorage.getItem('last_validation_result')
    })
    
    const result = JSON.parse(validationResult || '{}')
    
    expect(result).toMatchObject({
      totalValidated: expect.any(Number),
      repaired: expect.any(Number),
      failed: expect.any(Number)
    })
    
    expect(result.repaired).toBeGreaterThan(0)
    
    // Verify clean data after repair
    await page.reload()
    await page.goto(`/clients/${weddingId}/guests`)
    
    // Corrupted guest should not appear or should be fixed
    const guestCount = await page.locator('[data-testid="guest-row"]').count()
    expect(guestCount).toBeGreaterThan(0)
  })

  // =====================================================
  // TEST 9: PERFORMANCE UNDER LOAD
  // =====================================================
  
  test('Performance with large datasets offline', async ({ page, context }) => {
    const weddingId = await createWeddingData(page)
    
    // Go offline
    await goOffline(context)
    
    // Add 100 guests rapidly
    const startTime = performance.now()
    
    for (let i = 0; i < 100; i++) {
      await page.evaluate((index) => {
        // Direct IndexedDB operation for speed
        const guest = {
          id: `perf-guest-${index}`,
          firstName: `Perf${index}`,
          lastName: 'Guest',
          email: `perf${index}@example.com`,
          rsvpStatus: 'pending',
          createdAt: new Date().toISOString(),
          weddingId: window.location.pathname.split('/')[2]
        }
        
        const db = window.indexedDB.open('WedSyncOffline')
        db.onsuccess = () => {
          const transaction = db.result.transaction(['guests'], 'readwrite')
          transaction.objectStore('guests').add(guest)
        }
      }, i)
    }
    
    const operationTime = performance.now() - startTime
    
    // Should complete in under 10 seconds (100ms per operation)
    expect(operationTime).toBeLessThan(10000)
    
    // Verify UI responsiveness
    await page.goto(`/clients/${weddingId}/guests`)
    
    const renderStart = performance.now()
    await page.waitForSelector('[data-testid="guest-list"]')
    const renderTime = performance.now() - renderStart
    
    // Should render in under 2 seconds
    expect(renderTime).toBeLessThan(2000)
    
    // Verify all guests are displayed
    const guestCount = await page.locator('[data-testid="guest-row"]').count()
    expect(guestCount).toBeGreaterThanOrEqual(100)
    
    // Test search performance
    const searchStart = performance.now()
    await page.fill('input[data-testid="search-guests"]', 'Perf50')
    await page.waitForSelector('text=Perf50 Guest')
    const searchTime = performance.now() - searchStart
    
    // Search should be under 100ms
    expect(searchTime).toBeLessThan(100)
  })

  // =====================================================
  // TEST 10: ERROR RECOVERY
  // =====================================================
  
  test('Error recovery and resilience', async ({ page, context }) => {
    const weddingId = await createWeddingData(page)
    
    // Simulate various error conditions
    
    // 1. Network timeout during sync
    await page.route('**/api/sync/**', route => {
      setTimeout(() => route.abort(), 5000)
    })
    
    await goOffline(context)
    
    // Add data offline
    await page.goto(`/clients/${weddingId}/guests`)
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('input[name="firstName"]', 'Error')
    await page.fill('input[name="lastName"]', 'Test')
    await page.click('button[data-testid="save-guest"]')
    
    await goOnline(context)
    
    // Should show retry notification
    await expect(page.locator('[data-testid="sync-retry"]')).toBeVisible()
    
    // Clear route handler
    await page.unroute('**/api/sync/**')
    
    // Manual retry should work
    await page.click('[data-testid="retry-sync"]')
    await waitForSync(page)
    
    // 2. Quota exceeded error
    await page.evaluate(() => {
      // Fill up storage to simulate quota error
      const largeData = new Array(1000000).join('x')
      try {
        for (let i = 0; i < 100; i++) {
          window.localStorage.setItem(`quota_test_${i}`, largeData)
        }
      } catch (e) {
        // Expected quota error
      }
    })
    
    // Should show storage warning
    await expect(page.locator('[data-testid="storage-warning"]')).toBeVisible()
    
    // Clean up storage
    await page.click('[data-testid="clear-cache"]')
    await page.waitForSelector('[data-testid="cache-cleared"]')
    
    // 3. IndexedDB corruption
    await page.evaluate(() => {
      // Simulate corruption by closing DB abruptly
      const db = window.indexedDB.open('WedSyncOffline')
      db.onsuccess = () => {
        db.result.close()
        // Try to use closed DB
        const transaction = db.result.transaction(['guests'], 'readwrite')
        transaction.objectStore('guests').add({ id: 'will-fail' })
      }
    })
    
    // Should detect and recover
    await page.reload()
    await expect(page.locator('[data-testid="db-recovery"]')).toBeVisible()
    
    // Verify system recovered
    await page.goto(`/clients/${weddingId}/guests`)
    await expect(page.locator('text=Error Test')).toBeVisible()
  })
})

// =====================================================
// PERFORMANCE BENCHMARKS
// =====================================================

test.describe('Performance Benchmarks', () => {
  test('Offline operations under 100ms', async ({ page, context }) => {
    await login(page)
    const weddingId = await createWeddingData(page)
    
    await goOffline(context)
    
    const operations = [
      async () => {
        // Guest creation
        await page.goto(`/clients/${weddingId}/guests`)
        const start = performance.now()
        await page.click('[data-testid="add-guest-button"]')
        await page.fill('input[name="firstName"]', 'Speed')
        await page.fill('input[name="lastName"]', 'Test')
        await page.click('button[data-testid="save-guest"]')
        return performance.now() - start
      },
      async () => {
        // Timeline update
        await page.goto(`/clients/${weddingId}/timeline`)
        const start = performance.now()
        await page.click('[data-testid="add-event"]')
        await page.fill('input[name="eventName"]', 'Quick Event')
        await page.click('button[data-testid="save-event"]')
        return performance.now() - start
      },
      async () => {
        // Search operation
        await page.goto(`/clients/${weddingId}/guests`)
        const start = performance.now()
        await page.fill('input[data-testid="search-guests"]', 'Speed')
        await page.waitForSelector('text=Speed Test')
        return performance.now() - start
      }
    ]
    
    for (const operation of operations) {
      const time = await operation()
      expect(time).toBeLessThan(100)
    }
  })
})