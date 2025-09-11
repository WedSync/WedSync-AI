/**
 * Network State Transition Testing Suite
 * WS-172: Comprehensive offline functionality testing - Round 3
 * 
 * Tests seamless transitions between online/offline states:
 * - Immediate offline/online switching
 * - Intermittent connectivity scenarios
 * - Network failure during operations
 * - Recovery and synchronization
 * - Wedding coordinator real-world scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { 
  OfflineTestUtils, 
  OfflineTestContext 
} from '../../utils/offline-testing/offline-test-utils'
import { 
  NetworkSimulator, 
  NetworkConditions,
  WeddingCoordinatorNetworkScenarios 
} from '../../utils/offline-testing/network-simulator'
import { WeddingDataGenerator } from '../../utils/offline-testing/wedding-data-generator'

test.describe('WS-172: Network State Transitions - Comprehensive Testing', () => {
  let testContext: OfflineTestContext

  test.beforeEach(async ({ page, context }) => {
    testContext = await OfflineTestUtils.initializeContext(page, context)
    await OfflineTestUtils.waitForServiceWorker(page)
    await OfflineTestUtils.setupOfflineApiMocks(page)
    
    // Navigate to wedding dashboard
    await page.goto('/dashboard/wedding-day')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await OfflineTestUtils.cleanup(testContext)
  })

  test.describe('Basic Network State Transitions', () => {
    
    test('should handle immediate offline transition', async () => {
      const { page, networkSim } = testContext

      // Verify initially online
      await OfflineTestUtils.assertOnlineIndicatorVisible(page)

      // Go offline immediately
      await networkSim.goOffline()

      // Should show offline indicator quickly
      await OfflineTestUtils.assertOfflineIndicatorVisible(page)

      // Should show offline capabilities message
      await expect(page.locator('text=works offline')).toBeVisible({ timeout: 3000 })

      // Wedding data should still be accessible
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
      await expect(page.locator('[data-testid="vendor-list"]')).toBeVisible()
    })

    test('should handle immediate online transition', async () => {
      const { page, networkSim } = testContext

      // Start offline
      await networkSim.goOffline()
      await OfflineTestUtils.assertOfflineIndicatorVisible(page)

      // Go online immediately
      await networkSim.goOnline()

      // Should show online indicator
      await OfflineTestUtils.assertOnlineIndicatorVisible(page)

      // Should show syncing indicator temporarily
      await expect(page.locator('text=Syncing')).toBeVisible({ timeout: 3000 })

      // Should eventually show all synced
      await expect(page.locator('text=All synced')).toBeVisible({ timeout: 10000 })
    })

    test('should handle rapid offline/online cycling', async () => {
      const { page, networkSim } = testContext

      // Rapid cycling test
      for (let i = 0; i < 5; i++) {
        await networkSim.goOffline()
        await page.waitForTimeout(200)
        
        await networkSim.goOnline()  
        await page.waitForTimeout(200)
      }

      // Should stabilize in online state
      await OfflineTestUtils.assertOnlineIndicatorVisible(page)

      // App should remain functional
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
    })
  })

  test.describe('Intermittent Connectivity Scenarios', () => {
    
    test('should handle intermittent connectivity during vendor check-in', async () => {
      const { page, networkSim } = testContext

      // Start intermittent connectivity
      await networkSim.startIntermittentConnectivity({
        onlineTime: 2000,   // 2s online
        offlineTime: 1000,  // 1s offline
        cycles: 3
      })

      // Attempt vendor check-in during intermittent connectivity
      await page.goto('/dashboard/vendors')
      await page.waitForLoadState('domcontentloaded')

      // Find first vendor and update status
      const vendorCard = page.locator('[data-testid^="vendor-"]').first()
      await vendorCard.click()

      await page.selectOption('[data-testid="vendor-status"]', 'arrived')
      await page.fill('[data-testid="vendor-notes"]', 'Arrived on time during network issues')
      
      // Submit - might succeed or queue depending on timing
      await page.click('[data-testid="save-vendor-status"]')

      // Stop intermittent connectivity
      networkSim.stopIntermittentConnectivity()
      await networkSim.goOnline()

      // Wait for final sync
      await page.waitForTimeout(3000)

      // Verify either immediate success or queued for sync
      const successMessage = page.locator('text=Status updated')
      const queuedMessage = page.locator('text=queued for sync')
      
      await expect(successMessage.or(queuedMessage)).toBeVisible({ timeout: 5000 })
    })

    test('should handle intermittent connectivity during timeline updates', async () => {
      const { page, networkSim } = testContext
      const scenarios = new WeddingCoordinatorNetworkScenarios(networkSim)

      // Simulate wedding setup connectivity issues
      await scenarios.weddingSetupConnectivity()

      await page.goto('/dashboard/timeline')
      await page.waitForLoadState('domcontentloaded')

      // Update multiple timeline events during intermittent connectivity
      const events = await page.locator('[data-testid^="event-"]').count()
      
      for (let i = 0; i < Math.min(3, events); i++) {
        const eventCard = page.locator('[data-testid^="event-"]').nth(i)
        await eventCard.click()
        
        await page.selectOption('[data-testid="event-status"]', 'completed')
        await page.fill('[data-testid="event-notes"]', `Completed during setup - event ${i + 1}`)
        await page.click('[data-testid="save-event"]')
        
        // Wait a bit between events
        await page.waitForTimeout(1000)
      }

      // Stop intermittent and ensure online
      networkSim.stopIntermittentConnectivity()
      await networkSim.goOnline()

      // Verify all events are eventually synced
      await expect(page.locator('text=All synced')).toBeVisible({ timeout: 15000 })
    })

    test('should maintain data integrity during network instability', async () => {
      const { page, networkSim } = testContext

      // Create test data while online
      await page.goto('/dashboard/forms/new')
      await page.waitForLoadState('networkidle')

      await page.fill('[data-testid="client-name"]', 'Network Test Client')
      await page.fill('[data-testid="phone"]', '555-TEST-NET')
      
      // Start network instability
      await networkSim.startIntermittentConnectivity({
        onlineTime: 1000,   // Very short online periods
        offlineTime: 2000,  // Longer offline periods
        cycles: 5
      })

      // Continue editing during instability
      await page.fill('[data-testid="email"]', 'network.test@wedding.com')
      await page.fill('[data-testid="notes"]', 'Testing network instability handling')

      // Try to save
      await page.click('[data-testid="save-form"]')

      // Stop instability and go online
      networkSim.stopIntermittentConnectivity()
      await networkSim.goOnline()
      await page.waitForTimeout(3000)

      // Verify data integrity - all fields should be preserved
      await page.reload()
      await page.waitForLoadState('networkidle')

      await expect(page.locator('[data-testid="client-name"]')).toHaveValue('Network Test Client')
      await expect(page.locator('[data-testid="phone"]')).toHaveValue('555-TEST-NET')
      await expect(page.locator('[data-testid="email"]')).toHaveValue('network.test@wedding.com')
    })
  })

  test.describe('Network Failure During Operations', () => {
    
    test('should handle network failure during form submission', async () => {
      const { page, networkSim } = testContext

      await page.goto('/dashboard/forms/new')
      await page.waitForLoadState('networkidle')

      // Fill form
      await page.fill('[data-testid="client-name"]', 'Failure Test Client')
      await page.fill('[data-testid="email"]', 'failure@test.com')
      await page.fill('[data-testid="phone"]', '555-FAILURE')

      // Simulate network failure during submission
      await networkSim.simulateNetworkFailureDuringOperation(
        async () => {
          await page.click('[data-testid="submit-form"]')
          await page.waitForTimeout(2000) // Let submission process
        },
        1000 // Network fails after 1 second
      )

      // Should show queued for sync message
      await expect(page.locator('text=will be submitted when connection is restored')).toBeVisible({
        timeout: 5000
      })

      // Verify data is queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 1)

      // Network comes back online (already handled by simulateNetworkFailureDuringOperation)
      await page.waitForTimeout(2000)

      // Should sync automatically
      await expect(page.locator('text=Form submitted successfully')).toBeVisible({
        timeout: 10000
      })
    })

    test('should handle network failure during photo upload', async () => {
      const { page, networkSim } = testContext

      await page.goto('/dashboard/photos')
      await page.waitForLoadState('networkidle')

      // Mock file upload
      await page.evaluate(() => {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.setAttribute('data-testid', 'photo-upload')
        document.body.appendChild(fileInput)
        
        // Mock file upload process
        window.__mockPhotoUpload = () => {
          return new Promise(resolve => {
            setTimeout(() => resolve({ success: true, id: 'photo-123' }), 3000)
          })
        }
      })

      // Start upload process
      const uploadPromise = page.evaluate(async () => {
        return window.__mockPhotoUpload()
      })

      // Network fails during upload
      await networkSim.simulateNetworkFailureDuringOperation(
        async () => {
          await uploadPromise.catch(() => {}) // Handle expected failure
        },
        1500 // Fail partway through upload
      )

      // Should show upload queued message
      await expect(page.locator('text=Photo queued for upload')).toBeVisible({
        timeout: 5000
      })

      // When network returns, should retry upload
      await expect(page.locator('text=Photo uploaded successfully')).toBeVisible({
        timeout: 15000
      })
    })

    test('should handle network failure during bulk operations', async () => {
      const { page, networkSim } = testContext

      await page.goto('/dashboard/vendors')
      await page.waitForLoadState('networkidle')

      // Select multiple vendors for bulk status update
      await page.click('[data-testid="select-all-vendors"]')
      await page.selectOption('[data-testid="bulk-status-select"]', 'arrived')

      // Start bulk operation
      const bulkUpdatePromise = page.click('[data-testid="bulk-update-vendors"]')

      // Network fails during bulk operation
      await networkSim.simulateNetworkFailureDuringOperation(
        async () => {
          await bulkUpdatePromise
          await page.waitForTimeout(3000)
        },
        1000
      )

      // Should show partial completion status
      await expect(page.locator('text=Bulk update queued for sync')).toBeVisible({
        timeout: 5000
      })

      // Verify some updates were queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page)

      // When online, should complete remaining updates
      await expect(page.locator('text=All vendor statuses updated')).toBeVisible({
        timeout: 15000
      })
    })
  })

  test.describe('Wedding Coordinator Real-World Scenarios', () => {
    
    test('should handle remote venue arrival scenario', async () => {
      const { page, networkSim } = testContext
      const scenarios = new WeddingCoordinatorNetworkScenarios(networkSim)

      // Simulate arriving at remote venue
      await scenarios.remoteVenueArrival()

      // Coordinator should still be able to work
      await page.goto('/dashboard/wedding-day')
      await page.waitForLoadState('domcontentloaded')

      // Verify offline functionality is accessible
      await OfflineTestUtils.assertOfflineIndicatorVisible(page)
      await expect(page.locator('[data-testid="offline-capabilities"]')).toBeVisible()

      // Should be able to access wedding timeline offline
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
      
      // Should be able to check vendor statuses
      await page.goto('/dashboard/vendors')
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('[data-testid="vendor-list"]')).toBeVisible()

      // Should be able to add notes
      await page.goto('/dashboard/notes')
      await page.fill('[data-testid="coordinator-notes"]', 'Arrived at venue, network is poor but continuing with setup')
      await page.click('[data-testid="save-notes"]')
      await expect(page.locator('text=Notes saved offline')).toBeVisible()
    })

    test('should handle wedding ceremony network conditions', async () => {
      const { page, networkSim } = testContext

      // During ceremony - complete network blackout
      await networkSim.goOffline()
      
      // Coordinator continues to work
      await page.goto('/dashboard/timeline')
      await page.waitForLoadState('domcontentloaded')

      // Update ceremony events
      const ceremonyEvent = page.locator('[data-testid="event-ceremony"]')
      await ceremonyEvent.click()
      await page.selectOption('[data-testid="event-status"]', 'in_progress')
      await page.fill('[data-testid="event-notes"]', 'Ceremony started on time')
      await page.click('[data-testid="save-event"]')

      // Should save offline
      await expect(page.locator('text=Event saved offline')).toBeVisible()

      // Update vendor statuses during ceremony
      await page.goto('/dashboard/vendors')
      await OfflineTestUtils.simulateVendorCheckIn(page, 'photographer', 'active')
      await OfflineTestUtils.simulateVendorCheckIn(page, 'videographer', 'active')

      // Post-ceremony - network returns
      const scenarios = new WeddingCoordinatorNetworkScenarios(networkSim)
      await scenarios.postCeremonySync()

      // Should sync all changes
      await expect(page.locator('text=All synced')).toBeVisible({ timeout: 15000 })
      
      // Verify sync queue is empty
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle multi-venue coordination with varying connectivity', async () => {
      const { page, networkSim } = testContext

      // Main venue - good connectivity
      await networkSim.setNetworkCondition(NetworkConditions.ONLINE)
      await page.goto('/dashboard/venues/main')
      await page.waitForLoadState('networkidle')

      // Update main venue status
      await page.fill('[data-testid="venue-status"]', 'Setup complete, ready for guests')
      await page.click('[data-testid="save-venue-status"]')

      // Move to photo location - slow 3G
      await networkSim.setNetworkCondition(NetworkConditions.SLOW_3G)
      await page.goto('/dashboard/venues/photo-location')
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 })

      // Photo session updates take longer but still work
      await page.fill('[data-testid="photo-session-notes"]', 'Beautiful lighting at sunset location')
      await page.click('[data-testid="save-photo-notes"]')

      // Reception venue - intermittent connectivity
      await networkSim.startIntermittentConnectivity({
        onlineTime: 3000,
        offlineTime: 2000,
        cycles: 2
      })

      await page.goto('/dashboard/venues/reception')
      await page.waitForLoadState('domcontentloaded')

      // Reception setup updates
      await page.selectOption('[data-testid="reception-setup-status"]', 'in_progress')
      await page.fill('[data-testid="reception-notes"]', 'Tables and flowers arranged, awaiting final touches')
      await page.click('[data-testid="save-reception-status"]')

      // Return to stable network
      networkSim.stopIntermittentConnectivity()
      await networkSim.goOnline()

      // Verify all venues are synchronized
      await expect(page.locator('text=All venue updates synced')).toBeVisible({ timeout: 20000 })
    })
  })

  test.describe('Advanced Network Transition Edge Cases', () => {
    
    test('should handle network flapping (rapid on/off cycles)', async () => {
      const { page, networkSim } = testContext

      // Simulate network flapping - very rapid on/off cycles
      for (let i = 0; i < 10; i++) {
        await networkSim.goOffline()
        await page.waitForTimeout(100)
        await networkSim.goOnline()
        await page.waitForTimeout(100)
      }

      // App should remain stable and functional
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
      
      // Should eventually stabilize in online state
      await OfflineTestUtils.assertOnlineIndicatorVisible(page)

      // Should be able to perform operations normally
      await OfflineTestUtils.simulateVendorCheckIn(page, 'vendor-1', 'arrived')
      await expect(page.locator('text=Status updated')).toBeVisible()
    })

    test('should handle DNS resolution failures', async () => {
      const { page, context } = testContext

      // Mock DNS failures by blocking all requests
      await page.route('**/*', route => {
        route.abort('namenotresolved')
      })

      // Should handle DNS failures gracefully
      await page.goto('/dashboard/timeline')
      await page.waitForLoadState('domcontentloaded')

      // Should show appropriate error handling
      await expect(page.locator('text=Connection problem')).toBeVisible({ timeout: 5000 })
      
      // Should continue working offline
      await OfflineTestUtils.assertOfflineIndicatorVisible(page)

      // Clear route blocking
      await page.unroute('**/*')
      await context.setOffline(false)

      // Should recover when network is restored
      await expect(page.locator('text=Connection restored')).toBeVisible({ timeout: 10000 })
    })

    test('should handle server errors during network transitions', async () => {
      const { page, networkSim } = testContext

      // Setup server error responses
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })

      // Try to perform operations with server errors
      await OfflineTestUtils.simulateVendorCheckIn(page, 'vendor-1', 'arrived')

      // Should handle server errors as offline condition
      await expect(page.locator('text=queued for sync')).toBeVisible({ timeout: 5000 })

      // Go offline then online with normal responses
      await networkSim.goOffline()
      await page.waitForTimeout(1000)

      // Restore normal responses
      await page.unroute('**/api/**')
      await OfflineTestUtils.setupOfflineApiMocks(page)

      await networkSim.goOnline()

      // Should sync successfully when server is healthy
      await expect(page.locator('text=All synced')).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Performance During Network Transitions', () => {
    
    test('should maintain performance during network state changes', async () => {
      const { page, networkSim } = testContext

      // Measure performance during rapid network changes
      const performanceStart = await page.evaluate(() => performance.now())

      // Rapid network state changes while using app
      for (let i = 0; i < 5; i++) {
        await networkSim.goOffline()
        await page.click('[data-testid="timeline-tab"]')
        await networkSim.goOnline()
        await page.click('[data-testid="vendors-tab"]')
      }

      const performanceEnd = await page.evaluate(() => performance.now())
      const totalTime = performanceEnd - performanceStart

      // Should complete within reasonable time despite network changes
      expect(totalTime).toBeLessThan(10000) // 10 seconds max

      // App should remain responsive
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
    })

    test('should not leak memory during extended network instability', async () => {
      const { page, networkSim } = testContext

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      // Extended period of network instability
      await networkSim.startIntermittentConnectivity({
        onlineTime: 500,
        offlineTime: 500,
        cycles: 20 // 20 cycles = ~20 seconds of instability
      })

      // Continue using app during instability
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="refresh-timeline"]')
        await page.waitForTimeout(1000)
      }

      networkSim.stopIntermittentConnectivity()
      await networkSim.goOnline()

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      // Memory usage should not have grown excessively
      const memoryGrowth = finalMemory - initialMemory
      expect(memoryGrowth).toBeLessThan(50000000) // Less than 50MB growth
    })
  })
})