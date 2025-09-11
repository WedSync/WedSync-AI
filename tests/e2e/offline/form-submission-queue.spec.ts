/**
 * Offline Form Submission and Queue Testing Suite
 * WS-172: Comprehensive offline functionality testing - Round 3
 * 
 * Tests comprehensive offline form handling:
 * - Form submission queuing when offline
 * - Auto-save functionality for form drafts
 * - Priority-based queue processing
 * - Form validation in offline mode
 * - Complex form workflows (multi-step forms)
 * - Large form data handling
 * - Queue persistence across browser sessions
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { 
  OfflineTestUtils, 
  OfflineTestContext,
  SyncQueueItem 
} from '../../utils/offline-testing/offline-test-utils'
import { NetworkSimulator } from '../../utils/offline-testing/network-simulator'
import { 
  WeddingDataGenerator,
  FormSubmission 
} from '../../utils/offline-testing/wedding-data-generator'

test.describe('WS-172: Offline Form Submission and Queue Testing', () => {
  let testContext: OfflineTestContext

  test.beforeEach(async ({ page, context }) => {
    testContext = await OfflineTestUtils.initializeContext(page, context)
    await OfflineTestUtils.waitForServiceWorker(page)
    await OfflineTestUtils.setupOfflineApiMocks(page)
  })

  test.afterEach(async () => {
    await OfflineTestUtils.cleanup(testContext)
  })

  test.describe('Basic Form Submission Queuing', () => {
    
    test('should queue simple form submissions when offline', async () => {
      const { page, networkSim } = testContext

      // Go offline
      await networkSim.goOffline()
      await OfflineTestUtils.assertOfflineIndicatorVisible(page)

      // Navigate to vendor check-in form
      await page.goto('/dashboard/vendors/checkin')
      await page.waitForLoadState('domcontentloaded')

      // Fill out vendor check-in form
      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="vendor-checkin-form"]',
        fields: {
          '[data-testid="vendor-name"]': 'Test Florist',
          '[data-testid="arrival-time"]': '14:30',
          '[data-testid="vendor-status"]': 'arrived',
          '[data-testid="setup-notes"]': 'Flowers look beautiful, setting up in main hall'
        },
        submitButtonSelector: '[data-testid="submit-checkin"]'
      })

      // Verify form is queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 1)

      // Verify queue contains correct data
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const queueItem = storage.syncQueue[0]
      
      expect(queueItem.type).toBe('vendor_checkin')
      expect(queueItem.status).toBe('pending')
      expect(queueItem.data.vendor_name).toBe('Test Florist')
      expect(queueItem.data.setup_notes).toContain('Flowers look beautiful')
    })

    test('should process queued forms when coming back online', async () => {
      const { page, networkSim } = testContext

      // Submit form while offline
      await networkSim.goOffline()
      
      await page.goto('/dashboard/timeline/event-update')
      await page.waitForLoadState('domcontentloaded')

      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="event-update-form"]',
        fields: {
          '[data-testid="event-id"]': 'ceremony',
          '[data-testid="event-status"]': 'completed',
          '[data-testid="actual-time"]': '15:45',
          '[data-testid="completion-notes"]': 'Ceremony completed successfully, everyone happy'
        },
        submitButtonSelector: '[data-testid="update-event"]'
      })

      // Verify queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 1)

      // Come back online
      await networkSim.goOnline()
      
      // Wait for sync processing
      await expect(page.locator('text=Syncing')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Event updated successfully')).toBeVisible({ timeout: 10000 })

      // Verify queue is cleared
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle form submission failures and retry', async () => {
      const { page, networkSim } = testContext

      // Go offline and submit form
      await networkSim.goOffline()
      
      await page.goto('/dashboard/forms/coordinator-notes')
      await page.waitForLoadState('domcontentloaded')

      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="coordinator-notes-form"]',
        fields: {
          '[data-testid="notes-title"]': 'Important Venue Update',
          '[data-testid="notes-content"]': 'Weather looking questionable, have backup indoor plan ready',
          '[data-testid="notes-priority"]': 'high',
          '[data-testid="notes-category"]': 'weather'
        },
        submitButtonSelector: '[data-testid="save-notes"]'
      })

      // Mock server error on first sync attempt
      await page.route('**/api/forms/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        })
      })

      // Come back online - should fail first attempt
      await networkSim.goOnline()
      await page.waitForTimeout(2000)

      // Verify retry is scheduled
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const queueItem = storage.syncQueue.find(item => item.type === 'coordinator_notes')
      expect(queueItem?.attempts).toBeGreaterThan(0)
      expect(queueItem?.nextRetry).toBeTruthy()

      // Clear the error route and allow successful retry
      await page.unroute('**/api/forms/**')
      await OfflineTestUtils.setupOfflineApiMocks(page)

      // Wait for retry
      await expect(page.locator('text=Notes saved successfully')).toBeVisible({ timeout: 15000 })
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })
  })

  test.describe('Form Auto-Save Functionality', () => {
    
    test('should auto-save form data every 30 seconds', async () => {
      const { page, networkSim } = testContext

      // Start with online mode for initial load
      await page.goto('/dashboard/forms/client-information')
      await page.waitForLoadState('networkidle')

      // Go offline
      await networkSim.goOffline()

      // Start filling form
      await page.fill('[data-testid="bride-name"]', 'Sarah Smith')
      await page.fill('[data-testid="groom-name"]', 'John Johnson')
      await page.waitForTimeout(500)

      // Trigger auto-save (simulated - in real app would be 30s timer)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('force-auto-save'))
      })

      // Should show auto-save indicator
      await expect(page.locator('text=Auto-saved')).toBeVisible({ timeout: 5000 })

      // Verify draft is stored
      await OfflineTestUtils.assertDataCachedOffline(page, 'formDrafts', 1)

      // Continue filling form
      await page.fill('[data-testid="wedding-date"]', '2024-07-15')
      await page.fill('[data-testid="guest-count"]', '150')
      await page.waitForTimeout(500)

      // Trigger another auto-save
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('force-auto-save'))
      })

      // Refresh page to test draft restoration
      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      // Form should be restored from draft
      await expect(page.locator('[data-testid="bride-name"]')).toHaveValue('Sarah Smith')
      await expect(page.locator('[data-testid="groom-name"]')).toHaveValue('John Johnson')
      await expect(page.locator('[data-testid="wedding-date"]')).toHaveValue('2024-07-15')
      await expect(page.locator('[data-testid="guest-count"]')).toHaveValue('150')
    })

    test('should handle auto-save conflicts with manual saves', async () => {
      const { page, networkSim } = testContext

      await page.goto('/dashboard/forms/vendor-contact')
      await page.waitForLoadState('networkidle')
      
      await networkSim.goOffline()

      // Fill form data
      await page.fill('[data-testid="vendor-company"]', 'Beautiful Blooms Florist')
      await page.fill('[data-testid="contact-name"]', 'Maria Gonzalez')
      await page.fill('[data-testid="contact-phone"]', '555-FLOWERS')

      // Trigger auto-save
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('force-auto-save'))
      })
      
      await expect(page.locator('text=Auto-saved')).toBeVisible({ timeout: 3000 })

      // Add more data and manually save
      await page.fill('[data-testid="contact-email"]', 'maria@beautifulblooms.com')
      await page.fill('[data-testid="service-notes"]', 'Specializes in tropical arrangements')
      
      await page.click('[data-testid="save-contact"]')
      
      // Should show queued for sync (manual save)
      await expect(page.locator('text=Contact saved - will sync when online')).toBeVisible({ timeout: 3000 })

      // Come back online
      await networkSim.goOnline()
      
      // Should sync manual save (which includes auto-saved data)
      await expect(page.locator('text=Contact saved successfully')).toBeVisible({ timeout: 10000 })

      // Draft should be cleaned up after successful save
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const vendorDrafts = storage.formDrafts.filter(draft => draft.formId === 'vendor-contact')
      expect(vendorDrafts.length).toBe(0)
    })

    test('should handle auto-save with form validation errors', async () => {
      const { page, networkSim } = testContext

      await page.goto('/dashboard/forms/emergency-contact')
      await page.waitForLoadState('networkidle')
      
      await networkSim.goOffline()

      // Fill form with some invalid data
      await page.fill('[data-testid="contact-name"]', 'Emergency Contact')
      await page.fill('[data-testid="contact-phone"]', '555') // Invalid - too short
      await page.fill('[data-testid="relationship"]', 'Mother')

      // Trigger auto-save
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('force-auto-save'))
      })

      // Should still auto-save despite validation errors
      await expect(page.locator('text=Auto-saved (with validation issues)')).toBeVisible({ timeout: 3000 })

      // Fix validation issues
      await page.fill('[data-testid="contact-phone"]', '555-123-4567')
      await page.fill('[data-testid="contact-email"]', 'mother@family.com')

      // Auto-save again
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('force-auto-save'))
      })

      // Should now show clean auto-save
      await expect(page.locator('text=Auto-saved')).toBeVisible({ timeout: 3000 })

      // Try to submit
      await page.click('[data-testid="save-emergency-contact"]')
      
      // Should queue successfully now that validation passes
      await expect(page.locator('text=Emergency contact saved - will sync when online')).toBeVisible()
    })
  })

  test.describe('Priority-Based Queue Processing', () => {
    
    test('should process high-priority forms first', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Submit low priority form
      await page.goto('/dashboard/forms/general-notes')
      await page.waitForLoadState('domcontentloaded')
      
      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="general-notes-form"]',
        fields: {
          '[data-testid="notes-title"]': 'General Update',
          '[data-testid="notes-content"]': 'Regular status update for the day',
          '[data-testid="priority"]': 'low'
        },
        submitButtonSelector: '[data-testid="save-notes"]'
      })

      // Submit medium priority form
      await page.goto('/dashboard/forms/vendor-update')
      await page.waitForLoadState('domcontentloaded')

      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="vendor-update-form"]',
        fields: {
          '[data-testid="vendor-name"]': 'Catering Company',
          '[data-testid="update-type"]': 'schedule_change',
          '[data-testid="priority"]': 'medium'
        },
        submitButtonSelector: '[data-testid="submit-update"]'
      })

      // Submit high priority emergency form
      await page.goto('/dashboard/forms/emergency-report')
      await page.waitForLoadState('domcontentloaded')

      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="emergency-form"]',
        fields: {
          '[data-testid="emergency-type"]': 'weather',
          '[data-testid="emergency-description"]': 'Heavy rain approaching - need immediate action',
          '[data-testid="priority"]': 'emergency'
        },
        submitButtonSelector: '[data-testid="report-emergency"]'
      })

      // Verify all are queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 3)

      // Come back online - emergency should process first
      await networkSim.goOnline()

      // Emergency should be processed first
      await expect(page.locator('text=Emergency reported successfully')).toBeVisible({ timeout: 5000 })
      
      // Medium priority next
      await expect(page.locator('text=Vendor update submitted')).toBeVisible({ timeout: 8000 })
      
      // Low priority last  
      await expect(page.locator('text=Notes saved')).toBeVisible({ timeout: 12000 })

      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle emergency form priority escalation', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Submit regular form
      await page.goto('/dashboard/forms/photo-request')
      await page.waitForLoadState('domcontentloaded')

      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="photo-request-form"]',
        fields: {
          '[data-testid="photo-type"]': 'group_shot',
          '[data-testid="location"]': 'garden',
          '[data-testid="priority"]': 'medium'
        },
        submitButtonSelector: '[data-testid="request-photo"]'
      })

      // Submit another regular form that becomes emergency
      await page.goto('/dashboard/forms/vendor-issue')
      await page.waitForLoadState('domcontentloaded')

      await page.fill('[data-testid="vendor-name"]', 'DJ Equipment')
      await page.fill('[data-testid="issue-type"]', 'equipment_failure')
      await page.fill('[data-testid="issue-description"]', 'Sound system completely down')
      
      // Escalate to emergency priority
      await page.selectOption('[data-testid="priority"]', 'emergency')
      await page.click('[data-testid="escalate-to-emergency"]')

      await page.click('[data-testid="submit-vendor-issue"]')

      // Should show emergency escalation
      await expect(page.locator('text=Issue escalated to emergency priority')).toBeVisible()

      // Verify queue priorities
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const emergencyItem = storage.syncQueue.find(item => item.data.priority === 'emergency')
      const regularItem = storage.syncQueue.find(item => item.data.priority === 'medium')
      
      expect(emergencyItem?.priority).toBeGreaterThan(regularItem?.priority || 0)

      // Come online and verify emergency processes first
      await networkSim.goOnline()

      await expect(page.locator('text=Emergency issue reported')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Photo request submitted')).toBeVisible({ timeout: 8000 })
    })
  })

  test.describe('Complex Form Workflows', () => {
    
    test('should handle multi-step form submissions offline', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Start multi-step wedding details form
      await page.goto('/dashboard/forms/wedding-details/step1')
      await page.waitForLoadState('domcontentloaded')

      // Step 1: Basic Information
      await page.fill('[data-testid="couple-names"]', 'Sarah & John')
      await page.fill('[data-testid="wedding-date"]', '2024-08-15')
      await page.fill('[data-testid="venue-name"]', 'Garden Paradise Venue')
      await page.click('[data-testid="next-step"]')

      // Should auto-save step 1 and continue offline
      await expect(page.locator('text=Step 1 saved offline')).toBeVisible()

      // Step 2: Guest Information
      await page.fill('[data-testid="total-guests"]', '150')
      await page.fill('[data-testid="children-count"]', '12')
      await page.selectOption('[data-testid="dietary-requirements"]', 'vegetarian_options')
      await page.click('[data-testid="next-step"]')

      await expect(page.locator('text=Step 2 saved offline')).toBeVisible()

      // Step 3: Vendor Assignments
      await page.selectOption('[data-testid="photographer"]', 'Amazing Photos Studio')
      await page.selectOption('[data-testid="caterer"]', 'Gourmet Catering Co')
      await page.selectOption('[data-testid="florist"]', 'Flower Power')
      await page.click('[data-testid="finish-form"]')

      // Should complete multi-step form offline
      await expect(page.locator('text=Wedding details saved offline - will sync when connected')).toBeVisible()

      // Verify all steps are stored as single form submission
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 1)

      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const multiStepForm = storage.syncQueue.find(item => item.type === 'wedding_details')
      
      expect(multiStepForm?.data.step1?.couple_names).toBe('Sarah & John')
      expect(multiStepForm?.data.step2?.total_guests).toBe('150')
      expect(multiStepForm?.data.step3?.photographer).toBe('Amazing Photos Studio')

      // Come online and sync
      await networkSim.goOnline()
      
      await expect(page.locator('text=Wedding details submitted successfully')).toBeVisible({ timeout: 10000 })
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle form dependencies and validation chains', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Start dependent form workflow
      await page.goto('/dashboard/forms/seating-arrangement')
      await page.waitForLoadState('domcontentloaded')

      // Step 1: Table Configuration (affects all subsequent steps)
      await page.fill('[data-testid="total-tables"]', '15')
      await page.selectOption('[data-testid="table-size"]', '10_person')
      await page.fill('[data-testid="head-table-size"]', '12')
      await page.click('[data-testid="configure-tables"]')

      // Should validate table math offline
      await expect(page.locator('text=Table configuration saved (150 total seats)')).toBeVisible()

      // Step 2: Guest Assignments (depends on table configuration)
      await page.click('[data-testid="assign-guests"]')
      
      // Add VIP assignments
      await page.fill('[data-testid="head-table-guests"]', 'Bride, Groom, Parents, Officiant')
      await page.selectOption('[data-testid="table-1-type"]', 'family')
      await page.fill('[data-testid="table-1-guests"]', 'Bride family: Aunt Mary, Uncle Bob, Cousin Lisa')

      // Try to over-assign (should validate offline)
      await page.fill('[data-testid="table-2-guests"]', 'Groom family: Way too many people for this table size')
      
      await page.click('[data-testid="validate-assignments"]')
      
      // Should show validation error without network
      await expect(page.locator('text=Table 2 exceeds capacity')).toBeVisible()

      // Fix the assignment
      await page.fill('[data-testid="table-2-guests"]', 'Groom family: Parents, Siblings')
      await page.click('[data-testid="save-seating"]')

      // Should save complex form with validations
      await expect(page.locator('text=Seating arrangement saved offline')).toBeVisible()

      // Verify complex form data structure
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const seatingForm = storage.syncQueue.find(item => item.type === 'seating_arrangement')
      
      expect(seatingForm?.data.table_config?.total_tables).toBe('15')
      expect(seatingForm?.data.guest_assignments?.head_table).toContain('Bride, Groom')
      expect(seatingForm?.data.validation_status).toBe('passed')

      await networkSim.goOnline()
      await expect(page.locator('text=Seating arrangement submitted successfully')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Large Form Data Handling', () => {
    
    test('should handle forms with large text content', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      await page.goto('/dashboard/forms/comprehensive-notes')
      await page.waitForLoadState('domcontentloaded')

      // Generate large text content (simulating detailed notes)
      const largeNotes = Array(1000).fill('Detailed wedding coordination notes with vendor interactions, timeline adjustments, and guest management details. ').join('')

      await page.fill('[data-testid="comprehensive-notes"]', largeNotes)
      await page.fill('[data-testid="timeline-details"]', Array(500).fill('Timeline entry with detailed timestamps and coordination notes. ').join(''))
      await page.fill('[data-testid="vendor-communications"]', Array(750).fill('Vendor communication log with detailed interaction history. ').join(''))

      await page.click('[data-testid="save-comprehensive-notes"]')

      // Should handle large form data
      await expect(page.locator('text=Comprehensive notes saved offline')).toBeVisible({ timeout: 10000 })

      // Verify large data is stored
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const largeForm = storage.syncQueue.find(item => item.type === 'comprehensive_notes')
      
      expect(largeForm?.data.comprehensive_notes.length).toBeGreaterThan(50000)
      expect(largeForm?.data.timeline_details.length).toBeGreaterThan(25000)

      await networkSim.goOnline()
      
      // Should sync large form data
      await expect(page.locator('text=Comprehensive notes submitted successfully')).toBeVisible({ timeout: 20000 })
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle forms with file attachments', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      await page.goto('/dashboard/forms/vendor-contracts')
      await page.waitForLoadState('domcontentloaded')

      // Mock file upload handling
      await page.evaluate(() => {
        // Mock file attachment
        const mockFile = new File(['Contract content for florist with detailed terms and conditions'], 'florist-contract.pdf', { type: 'application/pdf' })
        
        // Simulate file selection
        const fileInput = document.querySelector('[data-testid="contract-upload"]') as HTMLInputElement
        if (fileInput) {
          Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false,
          })
        }
      })

      await page.fill('[data-testid="contract-vendor"]', 'Beautiful Flowers Inc')
      await page.fill('[data-testid="contract-value"]', '$2,500.00')
      await page.selectOption('[data-testid="contract-status"]', 'signed')
      
      await page.click('[data-testid="save-contract"]')

      // Should queue contract with file attachment
      await expect(page.locator('text=Contract saved offline (including attachments)')).toBeVisible()

      // Verify file data is handled
      const storage = await OfflineTestUtils.getOfflineStorage(page)
      const contractForm = storage.syncQueue.find(item => item.type === 'vendor_contract')
      
      expect(contractForm?.data.contract_vendor).toBe('Beautiful Flowers Inc')
      expect(contractForm?.data.has_attachments).toBe(true)

      await networkSim.goOnline()
      
      // Should upload form with attachments
      await expect(page.locator('text=Contract and attachments uploaded successfully')).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Queue Persistence and Recovery', () => {
    
    test('should persist queue across browser sessions', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Submit several forms
      const formsToSubmit = [
        {
          url: '/dashboard/forms/vendor-status',
          data: { vendor: 'photographer', status: 'arrived', notes: 'Equipment setup in progress' }
        },
        {
          url: '/dashboard/forms/timeline-update', 
          data: { event: 'ceremony', status: 'delayed', delay: '15_minutes' }
        },
        {
          url: '/dashboard/forms/guest-request',
          data: { request_type: 'dietary', details: 'Additional vegetarian options needed' }
        }
      ]

      for (const form of formsToSubmit) {
        await page.goto(form.url)
        await page.waitForLoadState('domcontentloaded')
        
        // Fill and submit each form
        for (const [field, value] of Object.entries(form.data)) {
          await page.fill(`[data-testid="${field}"]`, value)
        }
        await page.click('[data-testid="submit-form"]')
        
        await expect(page.locator('text=will be submitted when connection is restored')).toBeVisible()
      }

      // Verify all forms are queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 3)

      // Simulate browser session restart (reload page)
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      
      // Queue should persist after reload
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 3)

      // Come back online and verify all forms sync
      await networkSim.goOnline()
      
      await expect(page.locator('text=All offline forms synced successfully')).toBeVisible({ timeout: 15000 })
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })

    test('should handle queue corruption recovery', async () => {
      const { page, networkSim } = testContext

      await networkSim.goOffline()

      // Submit valid forms
      await page.goto('/dashboard/forms/general')
      await page.waitForLoadState('domcontentloaded')
      
      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="general-form"]',
        fields: {
          '[data-testid="form-title"]': 'Valid Form 1',
          '[data-testid="form-content"]': 'This is valid form data'
        },
        submitButtonSelector: '[data-testid="submit-general"]'
      })

      // Simulate queue corruption
      await page.evaluate(() => {
        const corruptedData = {
          id: 'corrupted-item',
          type: 'invalid_form',
          data: { malformed: true, circular: {} },
          timestamp: 'invalid-timestamp',
          status: 'pending',
          attempts: 'not-a-number'
        }
        
        // Add circular reference
        corruptedData.circular = corruptedData
        
        // Try to add corrupted data to storage
        const db = indexedDB.open('WedSyncOfflineDB')
        db.onsuccess = function(event) {
          const database = event.target.result
          const transaction = database.transaction(['syncQueue'], 'readwrite')
          const store = transaction.objectStore('syncQueue')
          
          try {
            store.add(corruptedData)
          } catch (error) {
            console.log('Expected error adding corrupted data:', error)
          }
        }
      })

      // Add another valid form
      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="general-form"]',
        fields: {
          '[data-testid="form-title"]': 'Valid Form 2',
          '[data-testid="form-content"]': 'This is also valid form data'
        },
        submitButtonSelector: '[data-testid="submit-general"]'
      })

      // Come online - should handle corruption gracefully
      await networkSim.goOnline()

      // Should show recovery process
      await expect(page.locator('text=Queue corruption detected, recovering...')).toBeVisible({ timeout: 5000 })
      
      // Should sync valid forms despite corruption
      await expect(page.locator('text=Valid forms synchronized')).toBeVisible({ timeout: 10000 })
      
      // Should clean up corrupted entries
      await expect(page.locator('text=Queue cleaned and recovered')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Wedding Coordinator Workflow Integration', () => {
    
    test('should handle complete wedding day form workflow', async () => {
      const { page, networkSim } = testContext

      // Simulate wedding day at venue with poor connectivity
      await networkSim.setNetworkCondition({
        name: 'Poor Venue WiFi',
        offline: false,
        downloadThroughput: 100000,  // 100KB/s
        uploadThroughput: 50000,     // 50KB/s
        latency: 5000                // 5s latency
      })

      // Start wedding day checklist
      await page.goto('/dashboard/wedding-day/checklist')
      await page.waitForLoadState('networkidle')

      // Network goes completely offline during venue setup
      await networkSim.goOffline()

      // Complete vendor arrival forms
      const vendors = ['florist', 'photographer', 'caterer', 'dj', 'officiant']
      
      for (let i = 0; i < vendors.length; i++) {
        const vendor = vendors[i]
        const arrivalTime = `${8 + i}:00`
        
        await page.goto(`/dashboard/forms/vendor-arrival/${vendor}`)
        await page.waitForLoadState('domcontentloaded')
        
        await OfflineTestUtils.submitFormOffline(page, {
          formSelector: '[data-testid="vendor-arrival-form"]',
          fields: {
            '[data-testid="vendor-name"]': vendor,
            '[data-testid="arrival-time"]': arrivalTime,
            '[data-testid="setup-status"]': 'in_progress',
            '[data-testid="coordinator-notes"]': `${vendor} arrived on time, setup proceeding normally`
          },
          submitButtonSelector: '[data-testid="confirm-arrival"]'
        })
      }

      // Timeline updates during ceremony
      const timelineEvents = [
        { event: 'guest_arrival', status: 'in_progress', notes: 'Guests arriving steadily' },
        { event: 'processional', status: 'completed', notes: 'Beautiful processional music' },
        { event: 'ceremony', status: 'in_progress', notes: 'Ceremony proceeding perfectly' },
        { event: 'recessional', status: 'completed', notes: 'Everyone happy and celebrating' }
      ]

      for (const event of timelineEvents) {
        await page.goto(`/dashboard/timeline/${event.event}/update`)
        await page.waitForLoadState('domcontentloaded')
        
        await OfflineTestUtils.submitFormOffline(page, {
          formSelector: '[data-testid="timeline-update-form"]',
          fields: {
            '[data-testid="event-status"]': event.status,
            '[data-testid="coordinator-notes"]': event.notes,
            '[data-testid="timestamp"]': new Date().toISOString()
          },
          submitButtonSelector: '[data-testid="update-timeline"]'
        })
      }

      // Emergency situation requiring immediate form
      await page.goto('/dashboard/forms/emergency')
      await page.waitForLoadState('domcontentloaded')
      
      await OfflineTestUtils.submitFormOffline(page, {
        formSelector: '[data-testid="emergency-form"]',
        fields: {
          '[data-testid="emergency-type"]': 'minor_injury',
          '[data-testid="description"]': 'Guest twisted ankle on dance floor, first aid provided',
          '[data-testid="action-taken"]': 'Applied ice, guest able to continue, no further assistance needed',
          '[data-testid="priority"]': 'low'
        },
        submitButtonSelector: '[data-testid="report-emergency"]'
      })

      // Verify all forms are queued (5 vendors + 4 timeline + 1 emergency = 10)
      await OfflineTestUtils.assertSyncQueueHasPendingItems(page, 10)

      // Network returns after wedding (typical scenario)
      await networkSim.goOnline()
      
      // Should sync all wedding day forms in priority order
      await expect(page.locator('text=Syncing wedding day updates...')).toBeVisible({ timeout: 5000 })
      
      // Emergency should sync first despite being low priority (it's still an emergency type)
      await expect(page.locator('text=Emergency report synchronized')).toBeVisible({ timeout: 8000 })
      
      // Timeline events should sync next (high importance for wedding coordination)  
      await expect(page.locator('text=Timeline updates synchronized')).toBeVisible({ timeout: 12000 })
      
      // Vendor arrivals should sync last
      await expect(page.locator('text=All vendor arrivals synchronized')).toBeVisible({ timeout: 15000 })

      // Final confirmation
      await expect(page.locator('text=Wedding day coordination complete - all data synchronized')).toBeVisible({ timeout: 20000 })
      
      await OfflineTestUtils.assertSyncQueueEmpty(page)
    })
  })
})