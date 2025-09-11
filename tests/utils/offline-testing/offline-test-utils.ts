/**
 * Offline Test Utilities
 * WS-172: Comprehensive offline functionality testing
 * 
 * Comprehensive utilities for testing offline functionality:
 * - Assertion helpers for offline states
 * - Database verification utilities  
 * - Sync queue inspection
 * - Performance measurement
 * - Browser/device simulation
 */

import { Page, expect, BrowserContext } from '@playwright/test'
import { NetworkSimulator } from './network-simulator'
import { WeddingDataGenerator, WeddingTestData, FormSubmission } from './wedding-data-generator'

export interface OfflineTestContext {
  page: Page
  context: BrowserContext
  networkSim: NetworkSimulator
  weddingData: WeddingTestData
}

export interface SyncQueueItem {
  id: string
  type: string
  action: string
  data: any
  timestamp: string
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'
  attempts: number
  priority: number
  nextRetry?: string
}

export interface OfflineStorage {
  weddings: any[]
  formDrafts: any[]
  syncQueue: SyncQueueItem[]
  cacheUsage: {
    size: number
    quota: number
    usage: number
  }
}

export class OfflineTestUtils {
  
  /**
   * Initialize offline test context
   */
  static async initializeContext(page: Page, context: BrowserContext): Promise<OfflineTestContext> {
    const networkSim = new NetworkSimulator(page, context)
    const weddingData = WeddingDataGenerator.generateWedding({
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      venueConnectivity: 'poor'
    })

    // Setup wedding data in the application
    await page.evaluate((data) => {
      // Mock API responses for initial data loading
      window.__WEDDING_TEST_DATA__ = data
    }, weddingData)

    return {
      page,
      context,
      networkSim,
      weddingData
    }
  }

  /**
   * Wait for service worker to be ready
   */
  static async waitForServiceWorker(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.ready
    }, { timeout: 10000 })

    // Wait a bit more for SW to fully initialize
    await page.waitForTimeout(1000)
  }

  /**
   * Check offline indicator is visible
   */
  static async assertOfflineIndicatorVisible(page: Page): Promise<void> {
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 })
    
    const offlineText = page.locator('text=Offline')
    await expect(offlineText).toBeVisible({ timeout: 3000 })
  }

  /**
   * Check online indicator is visible
   */
  static async assertOnlineIndicatorVisible(page: Page): Promise<void> {
    const onlineText = page.locator('text=Online')
    await expect(onlineText).toBeVisible({ timeout: 5000 })
  }

  /**
   * Get offline storage data from IndexedDB
   */
  static async getOfflineStorage(page: Page): Promise<OfflineStorage> {
    return await page.evaluate(async () => {
      const openDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('WedSyncOfflineDB')
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      }

      const getObjectStore = (db: IDBDatabase, storeName: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)
          const request = store.getAll()
          
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      }

      try {
        const db = await openDB()
        
        const [weddings, formDrafts, syncQueue] = await Promise.all([
          getObjectStore(db, 'weddings').catch(() => []),
          getObjectStore(db, 'formDrafts').catch(() => []),
          getObjectStore(db, 'syncQueue').catch(() => [])
        ])

        // Get cache usage
        let cacheUsage = { size: 0, quota: 0, usage: 0 }
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate()
          cacheUsage = {
            size: estimate.usage || 0,
            quota: estimate.quota || 0,
            usage: estimate.usage && estimate.quota ? (estimate.usage / estimate.quota) : 0
          }
        }

        db.close()
        
        return {
          weddings,
          formDrafts,
          syncQueue,
          cacheUsage
        }
      } catch (error) {
        console.error('Error getting offline storage:', error)
        return {
          weddings: [],
          formDrafts: [],
          syncQueue: [],
          cacheUsage: { size: 0, quota: 0, usage: 0 }
        }
      }
    })
  }

  /**
   * Verify data is cached offline
   */
  static async assertDataCachedOffline(page: Page, dataType: string, expectedCount?: number): Promise<void> {
    const storage = await this.getOfflineStorage(page)
    
    switch (dataType) {
      case 'weddings':
        expect(storage.weddings.length).toBeGreaterThan(0)
        if (expectedCount) {
          expect(storage.weddings.length).toBe(expectedCount)
        }
        break
        
      case 'formDrafts':
        expect(storage.formDrafts.length).toBeGreaterThan(0)
        if (expectedCount) {
          expect(storage.formDrafts.length).toBe(expectedCount)
        }
        break
        
      case 'syncQueue':
        expect(storage.syncQueue.length).toBeGreaterThan(0)
        if (expectedCount) {
          expect(storage.syncQueue.length).toBe(expectedCount)
        }
        break
    }
  }

  /**
   * Verify sync queue has pending items
   */
  static async assertSyncQueueHasPendingItems(page: Page, expectedCount?: number): Promise<void> {
    const storage = await this.getOfflineStorage(page)
    const pendingItems = storage.syncQueue.filter(item => item.status === 'pending')
    
    expect(pendingItems.length).toBeGreaterThan(0)
    if (expectedCount) {
      expect(pendingItems.length).toBe(expectedCount)
    }
  }

  /**
   * Verify sync queue is empty (all synced)
   */
  static async assertSyncQueueEmpty(page: Page): Promise<void> {
    const storage = await this.getOfflineStorage(page)
    const pendingItems = storage.syncQueue.filter(item => item.status === 'pending')
    
    expect(pendingItems.length).toBe(0)
  }

  /**
   * Simulate form submission while offline
   */
  static async submitFormOffline(page: Page, formData: {
    formSelector: string
    fields: Record<string, string>
    submitButtonSelector: string
  }): Promise<void> {
    // Navigate to form
    await page.locator(formData.formSelector).waitFor()
    
    // Fill form fields
    for (const [fieldSelector, value] of Object.entries(formData.fields)) {
      await page.fill(fieldSelector, value)
      await page.waitForTimeout(100) // Allow for auto-save
    }
    
    // Submit form
    await page.click(formData.submitButtonSelector)
    
    // Wait for offline submission confirmation
    await expect(page.locator('text=will be submitted when connection is restored')).toBeVisible({
      timeout: 5000
    })
  }

  /**
   * Verify form auto-save functionality
   */
  static async verifyFormAutoSave(page: Page, formSelector: string, fieldSelector: string, value: string): Promise<void> {
    // Fill form field
    await page.fill(fieldSelector, value)
    
    // Wait for auto-save (30 seconds in production, but we'll trigger it manually for testing)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auto-save-triggered'))
    })
    
    // Should show auto-save indicator
    await expect(page.locator('text=Auto-saved')).toBeVisible({ timeout: 5000 })
    
    // Refresh page to verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify field value was restored
    await expect(page.locator(fieldSelector)).toHaveValue(value)
  }

  /**
   * Measure cache operation performance
   */
  static async measureCachePerformance(page: Page, operation: () => Promise<void>): Promise<number> {
    const startTime = await page.evaluate(() => performance.now())
    
    await operation()
    
    const endTime = await page.evaluate(() => performance.now())
    return endTime - startTime
  }

  /**
   * Assert operation completes within time limit
   */
  static async assertPerformanceWithinLimit(
    page: Page, 
    operation: () => Promise<void>, 
    maxMs: number
  ): Promise<void> {
    const duration = await this.measureCachePerformance(page, operation)
    expect(duration).toBeLessThan(maxMs)
  }

  /**
   * Simulate vendor check-in process
   */
  static async simulateVendorCheckIn(
    page: Page, 
    vendorId: string, 
    status: string = 'arrived'
  ): Promise<void> {
    await page.goto('/dashboard/vendors')
    await page.waitForLoadState('networkidle')
    
    // Find and click vendor
    await page.click(`[data-testid="vendor-${vendorId}"]`)
    
    // Update status
    await page.selectOption('[data-testid="vendor-status"]', status)
    
    // Add notes
    await page.fill('[data-testid="vendor-notes"]', `${status} at ${new Date().toLocaleTimeString()}`)
    
    // Save
    await page.click('[data-testid="save-vendor-status"]')
  }

  /**
   * Simulate timeline event update
   */
  static async simulateTimelineUpdate(
    page: Page, 
    eventId: string, 
    newStatus: string
  ): Promise<void> {
    await page.goto('/dashboard/timeline')
    await page.waitForLoadState('networkidle')
    
    // Find event and update status
    await page.click(`[data-testid="event-${eventId}"]`)
    await page.selectOption('[data-testid="event-status"]', newStatus)
    
    // Add timestamp
    await page.fill('[data-testid="event-actual-time"]', new Date().toISOString())
    
    // Save
    await page.click('[data-testid="save-event-status"]')
  }

  /**
   * Verify conflict resolution UI appears
   */
  static async assertConflictResolutionUI(page: Page): Promise<void> {
    await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Choose version')).toBeVisible()
    await expect(page.locator('[data-testid="use-local-version"]')).toBeVisible()
    await expect(page.locator('[data-testid="use-server-version"]')).toBeVisible()
  }

  /**
   * Resolve conflict by choosing version
   */
  static async resolveConflict(page: Page, choice: 'local' | 'server'): Promise<void> {
    const button = choice === 'local' 
      ? '[data-testid="use-local-version"]' 
      : '[data-testid="use-server-version"]'
    
    await page.click(button)
    
    // Wait for resolution to complete
    await expect(page.locator('text=Conflict resolved')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Verify cache size is within limits
   */
  static async assertCacheWithinLimits(page: Page, maxSizeMB: number = 50): Promise<void> {
    const storage = await this.getOfflineStorage(page)
    const sizeMB = storage.cacheUsage.size / (1024 * 1024)
    
    expect(sizeMB).toBeLessThanOrEqual(maxSizeMB)
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // Clear IndexedDB
      const databases = await indexedDB.databases()
      await Promise.all(
        databases.map(db => {
          return new Promise((resolve) => {
            const deleteReq = indexedDB.deleteDatabase(db.name!)
            deleteReq.onsuccess = () => resolve(undefined)
            deleteReq.onerror = () => resolve(undefined)
          })
        })
      )

      // Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Clear local storage
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  /**
   * Setup mock API responses for offline testing
   */
  static async setupOfflineApiMocks(page: Page): Promise<void> {
    // Mock API endpoints to simulate server responses
    await page.route('**/api/weddings/**', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(window.__WEDDING_TEST_DATA__)
        })
      } else {
        // Simulate network error for POST/PUT requests when offline
        route.abort('internetdisconnected')
      }
    })

    await page.route('**/api/vendors/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.route('**/api/forms/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'form-123' })
      })
    })
  }

  /**
   * Simulate realistic wedding coordinator workflow
   */
  static async simulateCoordinatorWorkflow(testContext: OfflineTestContext): Promise<void> {
    const { page, networkSim } = testContext

    // 1. Coordinator arrives at venue - poor connectivity
    await networkSim.setNetworkCondition({
      name: 'Poor Venue WiFi',
      offline: false,
      downloadThroughput: 200000, // 200KB/s
      uploadThroughput: 100000,   // 100KB/s
      latency: 3000               // 3s latency
    })

    // 2. Check vendor statuses
    await this.simulateVendorCheckIn(page, 'vendor-1', 'arrived')
    await this.simulateVendorCheckIn(page, 'vendor-2', 'setup_complete')

    // 3. Network goes completely offline
    await networkSim.goOffline()

    // 4. Continue working offline - update timeline
    await this.simulateTimelineUpdate(page, 'event-1', 'in_progress')
    await this.simulateTimelineUpdate(page, 'event-2', 'completed')

    // 5. Add coordinator notes
    await page.goto('/dashboard/notes')
    await page.fill('[data-testid="coordinator-notes"]', 
      'All vendors arrived on time despite weather concerns. Ceremony proceeding as scheduled.')
    await page.click('[data-testid="save-notes"]')

    // 6. Network comes back online
    await networkSim.goOnline()

    // 7. Wait for sync to complete
    await page.waitForTimeout(3000)
  }

  /**
   * Generate test report data
   */
  static async generateTestReport(testContext: OfflineTestContext): Promise<any> {
    const { page } = testContext
    
    const storage = await this.getOfflineStorage(page)
    const performance = await page.evaluate(() => {
      if (window.performance && window.performance.getEntriesByType) {
        const navigation = window.performance.getEntriesByType('navigation')[0] as any
        return {
          loadTime: navigation?.loadEventEnd - navigation?.navigationStart,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart
        }
      }
      return { loadTime: 0, domContentLoaded: 0 }
    })

    return {
      timestamp: new Date().toISOString(),
      storage: {
        weddingsCached: storage.weddings.length,
        formDrafts: storage.formDrafts.length,
        syncQueueSize: storage.syncQueue.length,
        pendingSync: storage.syncQueue.filter(item => item.status === 'pending').length,
        cacheUsage: storage.cacheUsage
      },
      performance: {
        pageLoadTime: performance.loadTime,
        domContentLoadedTime: performance.domContentLoaded
      },
      testContext: {
        currentNetworkCondition: testContext.networkSim.getCurrentCondition().name,
        isOffline: testContext.networkSim.isOffline()
      }
    }
  }

  /**
   * Cleanup test resources
   */
  static async cleanup(testContext: OfflineTestContext): Promise<void> {
    await testContext.networkSim.cleanup()
    await this.clearOfflineData(testContext.page)
  }
}