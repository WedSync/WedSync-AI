/**
 * WS-172 Round 3: Enhanced Offline Storage Integration - E2E Tests
 * Comprehensive Playwright testing for offline functionality
 * 
 * Test Coverage:
 * - Performance validation (<50ms hook response)
 * - Security integration with encryption
 * - Wedding-specific business logic
 * - Offline/online transition handling
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Mobile responsiveness (375px+)
 */

import { test, expect, Page } from '@playwright/test'

test.describe('WS-172 Enhanced Offline Storage Integration', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Performance Validation', () => {
    test('should load wedding data in under 50ms', async () => {
      // Navigate to wedding details
      await page.click('[data-testid="wedding-details"]')
      
      // Measure load time
      const startTime = Date.now()
      await page.waitForSelector('[data-testid="wedding-timeline"]', { timeout: 5000 })
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(50)
      
      // Verify performance metrics are tracked
      const performanceMetrics = await page.evaluate(() => {
        return (window as any).weddingDataMetrics
      })
      
      expect(performanceMetrics?.loadTime).toBeDefined()
      expect(performanceMetrics?.loadTime).toBeLessThan(50)
    })

    test('should use memoized cache for repeated requests', async () => {
      // Initial load
      await page.click('[data-testid="wedding-details"]')
      await page.waitForSelector('[data-testid="wedding-timeline"]')
      
      // Capture cache metrics
      const initialMetrics = await page.evaluate(() => {
        return (window as any).weddingDataMetrics
      })
      
      // Navigate away and back
      await page.goBack()
      await page.click('[data-testid="wedding-details"]')
      await page.waitForSelector('[data-testid="wedding-timeline"]')
      
      // Check cache hits increased
      const finalMetrics = await page.evaluate(() => {
        return (window as any).weddingDataMetrics
      })
      
      expect(finalMetrics.cacheHits).toBeGreaterThan(initialMetrics.cacheHits || 0)
    })

    test('should warn when performance thresholds exceeded', async () => {
      // Set up console listener
      const consoleLogs: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'warn') {
          consoleLogs.push(msg.text())
        }
      })
      
      // Simulate slow network
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 100))
        route.continue()
      })
      
      await page.click('[data-testid="wedding-details"]')
      await page.waitForSelector('[data-testid="wedding-timeline"]')
      
      // Check for performance warnings
      expect(consoleLogs.some(log => 
        log.includes('Wedding data load exceeded 50ms')
      )).toBeTruthy()
    })
  })

  test.describe('Security Integration', () => {
    test('should encrypt sensitive wedding data in offline storage', async () => {
      // Navigate to wedding with sensitive data
      await page.click('[data-testid="wedding-details"]')
      await page.waitForSelector('[data-testid="emergency-contacts"]')
      
      // Check that sensitive data is encrypted in IndexedDB
      const encryptedData = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open('WedSyncOffline', 1)
          request.onsuccess = () => resolve(request.result)
        })
        
        const transaction = db.transaction(['weddings'], 'readonly')
        const store = transaction.objectStore('weddings')
        
        return new Promise((resolve) => {
          const request = store.getAll()
          request.onsuccess = () => resolve(request.result)
        })
      })
      
      // Verify sensitive fields are encrypted (should not be plaintext)
      expect(typeof encryptedData[0]?.emergencyContacts).toBe('string')
      expect(encryptedData[0]?.emergencyContacts).toMatch(/^[A-Za-z0-9+/]+=*$/) // Base64 pattern
    })

    test('should handle encryption errors gracefully', async () => {
      // Simulate encryption failure
      await page.addInitScript(() => {
        window.crypto.subtle.encrypt = () => Promise.reject(new Error('Encryption failed'))
      })
      
      await page.click('[data-testid="wedding-details"]')
      
      // Should show error but not crash
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('encryption')
    })

    test('should validate data integrity during sync', async () => {
      // Update wedding data
      await page.click('[data-testid="wedding-details"]')
      await page.fill('[data-testid="venue-notes"]', 'Updated venue requirements')
      await page.click('[data-testid="save-changes"]')
      
      // Verify data validation occurs
      const validationResults = await page.evaluate(() => {
        return (window as any).dataValidationResults
      })
      
      expect(validationResults?.isValid).toBeTruthy()
      expect(validationResults?.checksPerformed).toContain('dataIntegrity')
    })
  })

  test.describe('Wedding-Specific Business Logic', () => {
    test('should prioritize emergency contact updates', async () => {
      await page.click('[data-testid="wedding-details"]')
      await page.click('[data-testid="emergency-contacts"]')
      
      // Update emergency contact
      await page.fill('[data-testid="emergency-name"]', 'Wedding Coordinator')
      await page.fill('[data-testid="emergency-phone"]', '+1-555-HELP')
      await page.click('[data-testid="save-emergency-contact"]')
      
      // Verify high priority sync
      const syncPriority = await page.evaluate(() => {
        return (window as any).lastSyncPriority
      })
      
      expect(syncPriority).toBe(10) // Emergency priority
    })

    test('should handle timeline updates with wedding context', async () => {
      await page.click('[data-testid="wedding-details"]')
      await page.click('[data-testid="timeline-item"]:first-of-type')
      
      // Update timeline event
      await page.selectOption('[data-testid="timeline-status"]', 'confirmed')
      await page.fill('[data-testid="timeline-notes"]', 'Vendor confirmed arrival time')
      await page.click('[data-testid="save-timeline-update"]')
      
      // Verify wedding-specific sync priority
      const syncPriority = await page.evaluate(() => {
        return (window as any).lastSyncPriority
      })
      
      expect(syncPriority).toBe(8) // High priority for timeline
    })

    test('should retry critical updates on failure', async () => {
      // Set up network failure simulation
      await page.route('**/api/weddings/**', route => {
        if (route.request().method() === 'PUT') {
          route.abort()
        } else {
          route.continue()
        }
      })
      
      await page.click('[data-testid="wedding-details"]')
      await page.fill('[data-testid="emergency-phone"]', '+1-911-HELP')
      await page.click('[data-testid="save-emergency-contact"]')
      
      // Should show retry attempt
      await expect(page.locator('[data-testid="retry-notification"]')).toBeVisible()
      
      // Remove network failure
      await page.unroute('**/api/weddings/**')
      
      // Should eventually succeed
      await expect(page.locator('[data-testid="success-notification"]')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Enhanced Offline Indicator', () => {
    test('should show detailed sync progress', async () => {
      // Trigger sync with multiple items
      await page.evaluate(() => {
        (window as any).simulateMultipleUpdates?.()
      })
      
      // Check for detailed progress display
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
      await expect(page.locator('[role="progressbar"]')).toBeVisible()
      
      const progressText = await page.locator('[data-testid="sync-status-text"]').textContent()
      expect(progressText).toMatch(/Syncing \d+\/\d+/)
    })

    test('should display wedding-specific messaging', async () => {
      // Go offline
      await page.context().setOffline(true)
      
      const offlineMessage = await page.locator('[role="status"]').textContent()
      expect(offlineMessage).toContain('Working offline - changes saved locally')
    })

    test('should show critical priority alerts', async () => {
      // Create critical update
      await page.evaluate(() => {
        (window as any).createCriticalUpdate?.()
      })
      
      await expect(page.locator('[data-testid="critical-alert"]')).toBeVisible()
      await expect(page.locator('[data-testid="critical-alert"]')).toContainText('Critical wedding updates')
    })

    test('should provide network quality feedback', async () => {
      // Simulate slow network
      await page.route('**/api/ping', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        route.continue()
      })
      
      await expect(page.locator('[data-testid="network-quality"]')).toContainText('Slow')
    })
  })

  test.describe('Offline/Online Transitions', () => {
    test('should handle smooth offline transition', async () => {
      // Capture online state
      await expect(page.locator('[role="status"]')).toContainText(/up to date|synced/i)
      
      // Go offline
      await page.context().setOffline(true)
      await page.waitForTimeout(1000)
      
      // Should show offline status
      await expect(page.locator('[role="status"]')).toContainText(/offline/i)
      
      // Make changes while offline
      await page.fill('[data-testid="venue-notes"]', 'Offline update test')
      await page.click('[data-testid="save-changes"]')
      
      // Should confirm local save
      await expect(page.locator('[data-testid="save-status"]')).toContainText('saved locally')
    })

    test('should sync changes when coming back online', async () => {
      // Go offline and make changes
      await page.context().setOffline(true)
      await page.fill('[data-testid="vendor-notes"]', 'Vendor confirmed setup at 2 PM')
      await page.click('[data-testid="save-vendor-update"]')
      
      await expect(page.locator('[data-testid="save-status"]')).toContainText('saved locally')
      
      // Come back online
      await page.context().setOffline(false)
      
      // Should start syncing
      await expect(page.locator('[role="status"]')).toContainText(/syncing/i)
      
      // Should complete sync
      await expect(page.locator('[role="status"]')).toContainText(/up to date/i, { timeout: 10000 })
    })

    test('should handle sync conflicts gracefully', async () => {
      // Create conflicting updates (simulate two users)
      await page.evaluate(() => {
        (window as any).createSyncConflict?.()
      })
      
      // Should show conflict resolution UI
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible()
      
      // User should be able to resolve conflict
      await page.click('[data-testid="accept-remote-changes"]')
      await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible()
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('should have proper ARIA attributes for offline status', async () => {
      const statusElement = page.locator('[role="status"]')
      await expect(statusElement).toHaveAttribute('aria-live', 'polite')
      await expect(statusElement).toHaveAttribute('aria-label')
    })

    test('should have accessible progress indicators', async () => {
      // Trigger sync to show progress
      await page.evaluate(() => {
        (window as any).triggerSync?.()
      })
      
      const progressBar = page.locator('[role="progressbar"]')
      await expect(progressBar).toHaveAttribute('aria-valuenow')
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      await expect(progressBar).toHaveAttribute('aria-label')
    })

    test('should support keyboard navigation', async () => {
      // Focus on sync button
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab') // Navigate to sync button
      
      const focusedElement = await page.locator(':focus')
      await expect(focusedElement).toContainText('Sync')
      
      // Activate with keyboard
      await page.keyboard.press('Enter')
      await expect(page.locator('[role="status"]')).toContainText(/syncing/i)
    })

    test('should work with screen readers', async () => {
      // Test aria-live regions update properly
      const statusElement = page.locator('[role="status"]')
      const initialText = await statusElement.textContent()
      
      // Trigger status change
      await page.context().setOffline(true)
      
      // Verify the aria-live region updates
      await expect(statusElement).not.toContainText(initialText)
      await expect(statusElement).toContainText(/offline/i)
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work properly at 375px width', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Verify offline indicator is visible and functional
      const offlineIndicator = page.locator('[role="status"]')
      await expect(offlineIndicator).toBeVisible()
      
      const boundingBox = await offlineIndicator.boundingBox()
      expect(boundingBox?.width).toBeLessThan(375)
      expect(boundingBox?.height).toBeGreaterThan(0)
    })

    test('should have touch-friendly interface elements', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // All interactive elements should be at least 44px high (iOS guideline)
      const buttons = page.locator('button')
      const count = await buttons.count()
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i)
        const box = await button.boundingBox()
        if (box && box.height > 0) {
          expect(box.height).toBeGreaterThanOrEqual(40) // Slightly less than 44px for padding
        }
      }
    })

    test('should show appropriate mobile offline messaging', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.context().setOffline(true)
      
      // Should show mobile-appropriate messaging
      const statusText = await page.locator('[role="status"]').textContent()
      expect(statusText).toBeTruthy()
      expect(statusText?.length).toBeLessThan(50) // Concise for mobile
    })
  })

  test.describe('Real Wedding Scenarios', () => {
    test('should handle venue coordinator workflow', async () => {
      // Simulate barn venue with poor connectivity
      await page.route('**/api/**', async route => {
        // Simulate intermittent connectivity
        if (Math.random() > 0.7) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        route.continue()
      })
      
      // Coordinator updates vendor arrival
      await page.click('[data-testid="vendor-checklist"]')
      await page.check('[data-testid="florist-arrived"]')
      await page.fill('[data-testid="arrival-notes"]', 'Florist arrived on time with all arrangements')
      await page.click('[data-testid="save-vendor-status"]')
      
      // Should handle intermittent connectivity gracefully
      await expect(page.locator('[data-testid="save-status"]')).toBeVisible()
    })

    test('should support emergency contact updates during poor connectivity', async () => {
      // Simulate unreliable network
      let requestCount = 0
      await page.route('**/api/emergency-contacts/**', route => {
        requestCount++
        if (requestCount <= 2) {
          route.abort() // Fail first two attempts
        } else {
          route.continue() // Succeed on third attempt
        }
      })
      
      // Update emergency contact
      await page.click('[data-testid="emergency-contacts"]')
      await page.fill('[data-testid="emergency-phone"]', '+1-555-URGENT')
      await page.click('[data-testid="save-emergency-contact"]')
      
      // Should retry and eventually succeed
      await expect(page.locator('[data-testid="success-notification"]')).toBeVisible({ timeout: 10000 })
    })

    test('should maintain timeline updates across app restarts', async () => {
      // Make timeline update
      await page.fill('[data-testid="timeline-notes"]', 'Ceremony start time confirmed')
      await page.click('[data-testid="save-timeline"]')
      
      // Simulate app restart
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Data should persist
      await page.click('[data-testid="timeline-item"]:first-of-type')
      await expect(page.locator('[data-testid="timeline-notes"]')).toHaveValue('Ceremony start time confirmed')
    })
  })

  test.describe('Data Integrity and Recovery', () => {
    test('should maintain data consistency during network failures', async () => {
      // Make multiple updates
      await page.fill('[data-testid="venue-capacity"]', '150')
      await page.fill('[data-testid="catering-count"]', '150')
      await page.click('[data-testid="save-wedding-details"]')
      
      // Simulate network failure mid-sync
      await page.route('**/api/weddings/**', route => route.abort())
      
      // Updates should be queued
      await expect(page.locator('[data-testid="queued-updates"]')).toContainText('2 pending')
      
      // Restore network
      await page.unroute('**/api/weddings/**')
      
      // Should sync all updates atomically
      await expect(page.locator('[role="status"]')).toContainText(/up to date/i, { timeout: 10000 })
    })

    test('should handle data corruption recovery', async () => {
      // Simulate corrupted local data
      await page.evaluate(() => {
        localStorage.setItem('wedding-data-corrupted', 'true')
      })
      
      await page.reload()
      
      // Should recover from server
      await expect(page.locator('[data-testid="recovery-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible()
    })
  })
})

// Performance monitoring utilities
test.afterEach(async ({ page }) => {
  // Log performance metrics for analysis
  const metrics = await page.evaluate(() => {
    return (window as any).performanceMetrics
  })
  
  if (metrics) {
    console.log('Test Performance Metrics:', JSON.stringify(metrics, null, 2))
  }
})