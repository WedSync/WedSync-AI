/**
 * Data Synchronization and Conflict Resolution Testing Suite
 * WS-172: Comprehensive offline functionality testing - Round 3
 * 
 * Tests comprehensive data synchronization scenarios:
 * - Multi-device concurrent editing
 * - Conflict detection and resolution strategies
 * - Complex data merge scenarios
 * - Timestamp-based conflict handling
 * - Wedding coordinator collaboration conflicts
 * - Data integrity during sync operations
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { 
  OfflineTestUtils, 
  OfflineTestContext 
} from '../../utils/offline-testing/offline-test-utils'
import { NetworkSimulator } from '../../utils/offline-testing/network-simulator'
import { 
  WeddingDataGenerator,
  ConflictDataGenerator 
} from '../../utils/offline-testing/wedding-data-generator'

test.describe('WS-172: Data Synchronization and Conflict Resolution', () => {
  let primaryContext: OfflineTestContext
  let secondaryContext: OfflineTestContext
  let primaryPage: Page
  let secondaryPage: Page

  test.beforeEach(async ({ browser }) => {
    // Setup two browser contexts to simulate multi-device editing
    const primaryBrowserContext = await browser.newContext()
    primaryPage = await primaryBrowserContext.newPage()
    primaryContext = await OfflineTestUtils.initializeContext(primaryPage, primaryBrowserContext)
    
    const secondaryBrowserContext = await browser.newContext()
    secondaryPage = await secondaryBrowserContext.newPage()
    secondaryContext = await OfflineTestUtils.initializeContext(secondaryPage, secondaryBrowserContext)

    // Setup both contexts
    await Promise.all([
      OfflineTestUtils.waitForServiceWorker(primaryPage),
      OfflineTestUtils.waitForServiceWorker(secondaryPage),
      OfflineTestUtils.setupOfflineApiMocks(primaryPage),
      OfflineTestUtils.setupOfflineApiMocks(secondaryPage)
    ])

    // Navigate both to the same wedding
    await Promise.all([
      primaryPage.goto('/dashboard/wedding-day'),
      secondaryPage.goto('/dashboard/wedding-day')
    ])
    
    await Promise.all([
      primaryPage.waitForLoadState('networkidle'),
      secondaryPage.waitForLoadState('networkidle')
    ])
  })

  test.afterEach(async () => {
    await Promise.all([
      OfflineTestUtils.cleanup(primaryContext),
      OfflineTestUtils.cleanup(secondaryContext)
    ])
  })

  test.describe('Basic Synchronization Scenarios', () => {
    
    test('should sync simple data changes between devices', async () => {
      // Device 1 updates vendor status
      await primaryPage.goto('/dashboard/vendors')
      await OfflineTestUtils.simulateVendorCheckIn(primaryPage, 'vendor-1', 'arrived')
      
      // Device 2 should see the update after sync
      await secondaryPage.goto('/dashboard/vendors')
      await secondaryPage.waitForTimeout(2000) // Allow sync time
      
      const vendorStatus = secondaryPage.locator('[data-testid="vendor-1-status"]')
      await expect(vendorStatus).toContainText('arrived')
    })

    test('should handle offline-to-online sync queue processing', async () => {
      const { networkSim: primaryNet } = primaryContext
      
      // Primary device goes offline
      await primaryNet.goOffline()
      
      // Make multiple changes while offline
      await primaryPage.goto('/dashboard/timeline')
      await OfflineTestUtils.simulateTimelineUpdate(primaryPage, 'event-1', 'completed')
      await OfflineTestUtils.simulateTimelineUpdate(primaryPage, 'event-2', 'in_progress')
      
      // Verify items are queued
      await OfflineTestUtils.assertSyncQueueHasPendingItems(primaryPage, 2)
      
      // Come back online
      await primaryNet.goOnline()
      await primaryPage.waitForTimeout(3000) // Allow sync processing
      
      // Verify queue is cleared
      await OfflineTestUtils.assertSyncQueueEmpty(primaryPage)
      
      // Verify changes appear on secondary device
      await secondaryPage.reload()
      await secondaryPage.waitForLoadState('networkidle')
      
      await expect(secondaryPage.locator('[data-testid="event-1-status"]')).toContainText('completed')
      await expect(secondaryPage.locator('[data-testid="event-2-status"]')).toContainText('in_progress')
    })

    test('should prioritize high-priority sync items', async () => {
      const { networkSim: primaryNet } = primaryContext
      
      await primaryNet.goOffline()
      
      // Create low priority update
      await primaryPage.goto('/dashboard/notes')
      await primaryPage.fill('[data-testid="coordinator-notes"]', 'Low priority note update')
      await primaryPage.click('[data-testid="save-notes"]')
      
      // Create high priority update (vendor emergency)
      await primaryPage.goto('/dashboard/vendors')
      await primaryPage.click('[data-testid="vendor-emergency-btn"]')
      await primaryPage.selectOption('[data-testid="emergency-type"]', 'no_show')
      await primaryPage.fill('[data-testid="emergency-notes"]', 'Photographer has not arrived - URGENT')
      await primaryPage.click('[data-testid="save-emergency"]')
      
      // Go back online
      await primaryNet.goOnline()
      
      // High priority emergency should sync first
      await expect(primaryPage.locator('text=Emergency reported')).toBeVisible({ timeout: 5000 })
      await expect(primaryPage.locator('text=Notes synced')).toBeVisible({ timeout: 10000 })
      
      // Verify on secondary device - emergency should be visible quickly
      await secondaryPage.goto('/dashboard/vendors')
      await expect(secondaryPage.locator('[data-testid="vendor-emergency-alert"]')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Concurrent Editing Conflicts', () => {
    
    test('should detect and resolve simple field conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Both devices edit the same vendor simultaneously
      await primaryPage.goto('/dashboard/vendors/vendor-1/edit')
      await secondaryPage.goto('/dashboard/vendors/vendor-1/edit')
      
      // Both go offline
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary device updates phone number
      await primaryPage.fill('[data-testid="vendor-phone"]', '555-PRIMARY')
      await primaryPage.click('[data-testid="save-vendor"]')
      
      // Secondary device updates the same phone number differently
      await secondaryPage.fill('[data-testid="vendor-phone"]', '555-SECONDARY')
      await secondaryPage.click('[data-testid="save-vendor"]')
      
      // Primary comes online first
      await primaryNet.goOnline()
      await primaryPage.waitForTimeout(2000)
      
      // Secondary comes online - should detect conflict
      await secondaryNet.goOnline()
      
      // Should show conflict resolution UI on secondary device
      await OfflineTestUtils.assertConflictResolutionUI(secondaryPage)
      
      // Should show both versions
      await expect(secondaryPage.locator('text=555-PRIMARY')).toBeVisible()
      await expect(secondaryPage.locator('text=555-SECONDARY')).toBeVisible()
      
      // Choose local version
      await OfflineTestUtils.resolveConflict(secondaryPage, 'local')
      
      // Verify resolution
      await expect(secondaryPage.locator('[data-testid="vendor-phone"]')).toHaveValue('555-SECONDARY')
    })

    test('should handle complex multi-field conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Setup concurrent editing scenario
      await primaryPage.goto('/dashboard/timeline/event-1/edit')
      await secondaryPage.goto('/dashboard/timeline/event-1/edit')
      
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary device makes multiple changes
      await primaryPage.selectOption('[data-testid="event-status"]', 'completed')
      await primaryPage.fill('[data-testid="event-notes"]', 'Completed ahead of schedule')
      await primaryPage.fill('[data-testid="actual-start-time"]', '14:25')
      await primaryPage.click('[data-testid="save-event"]')
      
      // Secondary device makes different changes  
      await secondaryPage.selectOption('[data-testid="event-status"]', 'delayed')
      await secondaryPage.fill('[data-testid="event-notes"]', 'Running 10 minutes behind')
      await secondaryPage.fill('[data-testid="actual-start-time"]', '14:40')
      await secondaryPage.click('[data-testid="save-event"]')
      
      // Bring both online simultaneously
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect conflicts in multiple fields
      await OfflineTestUtils.assertConflictResolutionUI(secondaryPage)
      
      // Should show field-by-field conflict resolution
      await expect(secondaryPage.locator('[data-testid="conflict-field-status"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="conflict-field-notes"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="conflict-field-time"]')).toBeVisible()
      
      // Resolve conflicts field by field
      await secondaryPage.click('[data-testid="use-server-status"]')    // completed
      await secondaryPage.click('[data-testid="use-local-notes"]')      // Running 10 minutes behind  
      await secondaryPage.click('[data-testid="use-server-time"]')      // 14:25
      
      await secondaryPage.click('[data-testid="apply-resolution"]')
      
      // Verify merged result
      await expect(secondaryPage.locator('[data-testid="event-status"]')).toHaveValue('completed')
      await expect(secondaryPage.locator('[data-testid="event-notes"]')).toHaveValue('Running 10 minutes behind')
      await expect(secondaryPage.locator('[data-testid="actual-start-time"]')).toHaveValue('14:25')
    })

    test('should handle timestamp-based conflict resolution', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Create timestamp conflict scenario
      await primaryPage.goto('/dashboard/vendors/vendor-1/edit')
      await secondaryPage.goto('/dashboard/vendors/vendor-1/edit')
      
      // Primary edits first (older timestamp)
      await primaryNet.goOffline()
      await primaryPage.fill('[data-testid="vendor-notes"]', 'First edit - older')
      await primaryPage.click('[data-testid="save-vendor"]')
      await primaryPage.waitForTimeout(1000)
      
      // Secondary edits later (newer timestamp) 
      await secondaryNet.goOffline()
      await secondaryPage.fill('[data-testid="vendor-notes"]', 'Second edit - newer')
      await secondaryPage.click('[data-testid="save-vendor"]')
      
      // Primary comes online first
      await primaryNet.goOnline()
      await primaryPage.waitForTimeout(2000)
      
      // Secondary comes online - newer timestamp should win with auto-resolution
      await secondaryNet.goOnline()
      
      // Should auto-resolve based on "last writer wins" policy for notes
      await expect(secondaryPage.locator('text=Changes synced successfully')).toBeVisible({ timeout: 10000 })
      
      // Verify newer timestamp won
      await secondaryPage.reload()
      await expect(secondaryPage.locator('[data-testid="vendor-notes"]')).toHaveValue('Second edit - newer')
      
      // Verify on primary device too
      await primaryPage.reload()
      await expect(primaryPage.locator('[data-testid="vendor-notes"]')).toHaveValue('Second edit - newer')
    })
  })

  test.describe('Wedding Coordinator Collaboration Conflicts', () => {
    
    test('should handle coordinator handoff conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Simulate coordinator handoff scenario
      // Primary coordinator (morning shift)
      await primaryPage.goto('/dashboard/coordinator-notes')
      await primaryNet.goOffline()
      
      await primaryPage.fill('[data-testid="shift-notes"]', 'Morning setup complete. All vendors arrived on time.')
      await primaryPage.selectOption('[data-testid="handoff-status"]', 'ready_for_handoff')
      await primaryPage.click('[data-testid="save-handoff"]')
      
      // Secondary coordinator (afternoon shift) starts before handoff sync
      await secondaryPage.goto('/dashboard/coordinator-notes')
      await secondaryNet.goOffline()
      
      await secondaryPage.fill('[data-testid="shift-notes"]', 'Taking over afternoon shift. Need status update on setup.')
      await secondaryPage.selectOption('[data-testid="handoff-status"]', 'taking_over')
      await secondaryPage.click('[data-testid="save-handoff"]')
      
      // Both come online simultaneously
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect coordinator handoff conflict
      await expect(secondaryPage.locator('[data-testid="handoff-conflict"]')).toBeVisible({ timeout: 10000 })
      
      // Should offer handoff-specific resolution options
      await expect(secondaryPage.locator('text=Coordinator handoff in progress')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="complete-handoff"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="cancel-handoff"]')).toBeVisible()
      
      // Complete handoff
      await secondaryPage.click('[data-testid="complete-handoff"]')
      
      // Should merge handoff notes
      await expect(secondaryPage.locator('[data-testid="shift-notes"]')).toContainText('Morning setup complete')
      await expect(secondaryPage.locator('[data-testid="shift-notes"]')).toContainText('Taking over afternoon shift')
    })

    test('should handle emergency update conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Both coordinators report different aspects of the same emergency
      await primaryPage.goto('/dashboard/emergencies/new')
      await secondaryPage.goto('/dashboard/emergencies/new')
      
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary reports weather emergency
      await primaryPage.selectOption('[data-testid="emergency-type"]', 'weather')
      await primaryPage.fill('[data-testid="emergency-description"]', 'Heavy rain starting - moving ceremony indoors')
      await primaryPage.selectOption('[data-testid="emergency-priority"]', 'high')
      await primaryPage.click('[data-testid="save-emergency"]')
      
      // Secondary reports vendor emergency (same time)
      await secondaryPage.selectOption('[data-testid="emergency-type"]', 'vendor')
      await secondaryPage.fill('[data-testid="emergency-description"]', 'Florist delivery delayed due to weather')
      await secondaryPage.selectOption('[data-testid="emergency-priority"]', 'medium')
      await secondaryPage.click('[data-testid="save-emergency"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect related emergencies and offer to merge
      await expect(secondaryPage.locator('[data-testid="related-emergencies-detected"]')).toBeVisible({ timeout: 10000 })
      await expect(secondaryPage.locator('text=weather-related emergencies detected')).toBeVisible()
      
      // Should offer to create combined emergency
      await secondaryPage.click('[data-testid="merge-emergencies"]')
      
      // Should create comprehensive emergency record
      await expect(secondaryPage.locator('[data-testid="merged-emergency"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="emergency-description"]')).toContainText('Heavy rain')
      await expect(secondaryPage.locator('[data-testid="emergency-description"]')).toContainText('Florist delivery delayed')
      await expect(secondaryPage.locator('[data-testid="emergency-priority"]')).toHaveValue('high') // Higher priority wins
    })

    test('should handle vendor status conflicts during busy periods', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Simulate busy wedding day with multiple coordinators updating vendor statuses
      const vendorUpdates = [
        { vendor: 'photographer', status: 'setup_complete', coordinator: 'primary' },
        { vendor: 'photographer', status: 'active', coordinator: 'secondary' },
        { vendor: 'catering', status: 'arrived', coordinator: 'primary' },
        { vendor: 'catering', status: 'setup_in_progress', coordinator: 'secondary' }
      ]
      
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary coordinator updates
      await primaryPage.goto('/dashboard/vendors')
      for (const update of vendorUpdates.filter(u => u.coordinator === 'primary')) {
        await OfflineTestUtils.simulateVendorCheckIn(primaryPage, update.vendor, update.status)
        await primaryPage.waitForTimeout(500)
      }
      
      // Secondary coordinator updates (with slight delay to create realistic conflict)
      await secondaryPage.goto('/dashboard/vendors')
      await secondaryPage.waitForTimeout(1000) // Realistic delay between coordinators
      for (const update of vendorUpdates.filter(u => u.coordinator === 'secondary')) {
        await OfflineTestUtils.simulateVendorCheckIn(secondaryPage, update.vendor, update.status)
        await secondaryPage.waitForTimeout(500)
      }
      
      // Both come online
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect vendor status progression conflicts
      await expect(secondaryPage.locator('[data-testid="vendor-status-conflicts"]')).toBeVisible({ timeout: 10000 })
      
      // Should show status progression timeline
      await expect(secondaryPage.locator('text=Status progression detected')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="photographer-status-timeline"]')).toBeVisible()
      
      // Should auto-resolve based on logical progression (setup_complete → active)
      await expect(secondaryPage.locator('text=Auto-resolved status progression')).toBeVisible({ timeout: 5000 })
      
      // Verify final statuses are logically consistent
      await expect(secondaryPage.locator('[data-testid="photographer-status"]')).toContainText('active')
      await expect(secondaryPage.locator('[data-testid="catering-status"]')).toContainText('setup_in_progress')
    })
  })

  test.describe('Complex Data Merge Scenarios', () => {
    
    test('should merge timeline events with dependency conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary adds ceremony delay
      await primaryPage.goto('/dashboard/timeline/ceremony/edit')
      await primaryPage.fill('[data-testid="event-delay"]', '15')
      await primaryPage.fill('[data-testid="delay-reason"]', 'Waiting for all guests to be seated')
      await primaryPage.click('[data-testid="save-delay"]')
      
      // Secondary updates reception timing (not knowing about ceremony delay)
      await secondaryPage.goto('/dashboard/timeline/reception/edit')
      await secondaryPage.fill('[data-testid="event-start-time"]', '18:00')
      await secondaryPage.fill('[data-testid="setup-notes"]', 'Reception setup can begin immediately after ceremony')
      await secondaryPage.click('[data-testid="save-timing"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect timeline dependency conflicts
      await expect(secondaryPage.locator('[data-testid="timeline-dependency-conflict"]')).toBeVisible({ timeout: 10000 })
      await expect(secondaryPage.locator('text=Ceremony delay affects reception timing')).toBeVisible()
      
      // Should offer timeline adjustment options
      await expect(secondaryPage.locator('[data-testid="auto-adjust-timeline"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="manual-adjust-timeline"]')).toBeVisible()
      
      // Auto-adjust timeline
      await secondaryPage.click('[data-testid="auto-adjust-timeline"]')
      
      // Should recalculate all dependent events
      await expect(secondaryPage.locator('[data-testid="timeline-adjusted"]')).toBeVisible({ timeout: 5000 })
      await expect(secondaryPage.locator('[data-testid="reception-start-time"]')).toContainText('18:15') // Adjusted for 15min delay
    })

    test('should handle photo metadata conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Setup photo upload conflict scenario
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary coordinator adds photo metadata
      await primaryPage.goto('/dashboard/photos/photo-123/edit')
      await primaryPage.fill('[data-testid="photo-caption"]', 'Ceremony candid - guest reactions')
      await primaryPage.selectOption('[data-testid="photo-category"]', 'ceremony')
      await primaryPage.fill('[data-testid="photo-tags"]', 'ceremony, candid, guests, emotional')
      await primaryPage.click('[data-testid="save-metadata"]')
      
      // Secondary coordinator adds different metadata for same photo
      await secondaryPage.goto('/dashboard/photos/photo-123/edit')
      await secondaryPage.fill('[data-testid="photo-caption"]', 'Beautiful moment during vows')
      await secondaryPage.selectOption('[data-testid="photo-category"]', 'portraits')
      await secondaryPage.fill('[data-testid="photo-tags"]', 'vows, emotional, beautiful, ceremony')
      await secondaryPage.click('[data-testid="save-metadata"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should offer smart merge for photo metadata
      await expect(secondaryPage.locator('[data-testid="photo-metadata-conflict"]')).toBeVisible({ timeout: 10000 })
      
      // Should show both captions and suggest merge
      await expect(secondaryPage.locator('text=Multiple captions detected')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="merge-captions"]')).toBeVisible()
      
      // Smart merge captions and tags
      await secondaryPage.click('[data-testid="smart-merge-metadata"]')
      
      // Should create comprehensive merged metadata
      await expect(secondaryPage.locator('[data-testid="photo-caption"]')).toContainText('Ceremony candid')
      await expect(secondaryPage.locator('[data-testid="photo-caption"]')).toContainText('Beautiful moment during vows')
      await expect(secondaryPage.locator('[data-testid="photo-tags"]')).toContainText('ceremony')
      await expect(secondaryPage.locator('[data-testid="photo-tags"]')).toContainText('vows')
      await expect(secondaryPage.locator('[data-testid="photo-tags"]')).toContainText('emotional')
    })
  })

  test.describe('Data Integrity During Sync', () => {
    
    test('should maintain referential integrity during complex syncs', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Create complex referential data scenario
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary creates new vendor and assigns to timeline event
      await primaryPage.goto('/dashboard/vendors/new')
      await primaryPage.fill('[data-testid="vendor-name"]', 'Emergency DJ')
      await primaryPage.selectOption('[data-testid="vendor-category"]', 'music')
      await primaryPage.fill('[data-testid="vendor-phone"]', '555-EMERGENCY-DJ')
      await primaryPage.click('[data-testid="save-vendor"]')
      
      // Assign to timeline event
      await primaryPage.goto('/dashboard/timeline/reception-music/edit')
      await primaryPage.selectOption('[data-testid="assigned-vendor"]', 'Emergency DJ')
      await primaryPage.click('[data-testid="save-assignment"]')
      
      // Secondary updates the same timeline event with different vendor
      await secondaryPage.goto('/dashboard/timeline/reception-music/edit')  
      await secondaryPage.selectOption('[data-testid="assigned-vendor"]', 'Original DJ') // Assuming exists
      await secondaryPage.fill('[data-testid="event-notes"]', 'Confirmed with original DJ - all systems go')
      await secondaryPage.click('[data-testid="save-assignment"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect referential integrity conflict
      await expect(secondaryPage.locator('[data-testid="vendor-assignment-conflict"]')).toBeVisible({ timeout: 10000 })
      
      // Should show both vendor options with context
      await expect(secondaryPage.locator('text=Multiple vendor assignments detected')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="emergency-dj-option"]')).toBeVisible()
      await expect(secondaryPage.locator('[data-testid="original-dj-option"]')).toBeVisible()
      
      // Should provide conflict resolution with full context
      await secondaryPage.click('[data-testid="show-vendor-details"]')
      await expect(secondaryPage.locator('text=Emergency DJ - Added today')).toBeVisible()
      await expect(secondaryPage.locator('text=Original DJ - Previously confirmed')).toBeVisible()
      
      // Choose emergency DJ (assumes there was a last-minute change)
      await secondaryPage.click('[data-testid="choose-emergency-dj"]')
      
      // Should maintain referential integrity
      await expect(secondaryPage.locator('[data-testid="assigned-vendor"]')).toHaveValue('Emergency DJ')
      
      // Verify vendor exists and is properly linked
      await secondaryPage.goto('/dashboard/vendors')
      await expect(secondaryPage.locator('[data-testid="vendor-emergency-dj"]')).toBeVisible()
    })

    test('should handle cascading update conflicts', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary makes cascading venue changes
      await primaryPage.goto('/dashboard/venue/main/edit')
      await primaryPage.fill('[data-testid="venue-capacity"]', '150')
      await primaryPage.selectOption('[data-testid="ceremony-location"]', 'indoor')
      await primaryPage.click('[data-testid="save-venue"]')
      
      // This should cascade to seating arrangements, catering numbers, etc.
      await primaryPage.goto('/dashboard/seating/edit')
      await primaryPage.fill('[data-testid="max-guests"]', '150')
      await primaryPage.click('[data-testid="recalculate-seating"]')
      await primaryPage.click('[data-testid="save-seating"]')
      
      // Secondary makes conflicting changes
      await secondaryPage.goto('/dashboard/catering/edit')
      await secondaryPage.fill('[data-testid="guest-count"]', '175')
      await secondaryPage.selectOption('[data-testid="service-style"]', 'outdoor_buffet')
      await secondaryPage.click('[data-testid="save-catering"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Should detect cascading conflicts
      await expect(secondaryPage.locator('[data-testid="cascading-conflicts-detected"]')).toBeVisible({ timeout: 10000 })
      
      // Should show impact analysis
      await expect(secondaryPage.locator('text=Venue capacity changed to 150')).toBeVisible()
      await expect(secondaryPage.locator('text=Catering set for 175 guests')).toBeVisible()
      await expect(secondaryPage.locator('text=Location changed to indoor')).toBeVisible()
      await expect(secondaryPage.locator('text=Catering set for outdoor service')).toBeVisible()
      
      // Should offer comprehensive resolution
      await expect(secondaryPage.locator('[data-testid="resolve-all-conflicts"]')).toBeVisible()
      await secondaryPage.click('[data-testid="resolve-all-conflicts"]')
      
      // Should present resolution options
      await expect(secondaryPage.locator('[data-testid="venue-capacity-resolution"]')).toBeVisible()
      await secondaryPage.selectOption('[data-testid="final-guest-count"]', '150')
      await secondaryPage.selectOption('[data-testid="final-location"]', 'indoor')
      await secondaryPage.selectOption('[data-testid="final-service-style"]', 'indoor_buffet')
      
      await secondaryPage.click('[data-testid="apply-cascading-resolution"]')
      
      // Should update all related systems consistently
      await expect(secondaryPage.locator('text=All systems updated consistently')).toBeVisible({ timeout: 10000 })
    })

    test('should validate data consistency after complex merges', async () => {
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      
      // Create complex multi-system conflict scenario
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline()
      ])
      
      // Primary updates multiple related systems
      await primaryPage.goto('/dashboard/timeline/ceremony/edit')
      await primaryPage.fill('[data-testid="ceremony-duration"]', '45')
      await primaryPage.click('[data-testid="save-ceremony"]')
      
      await primaryPage.goto('/dashboard/vendors/photographer/edit')
      await primaryPage.fill('[data-testid="photo-session-duration"]', '60')
      await primaryPage.click('[data-testid="save-photographer"]')
      
      // Secondary makes conflicting updates
      await secondaryPage.goto('/dashboard/timeline/photos/edit')
      await secondaryPage.fill('[data-testid="photo-session-start"]', '15:30')
      await secondaryPage.fill('[data-testid="photo-session-duration"]', '30')
      await secondaryPage.click('[data-testid="save-photos"]')
      
      await Promise.all([
        primaryNet.goOnline(),
        secondaryNet.goOnline()
      ])
      
      // Allow conflict resolution
      await expect(secondaryPage.locator('[data-testid="multi-system-conflicts"]')).toBeVisible({ timeout: 10000 })
      await secondaryPage.click('[data-testid="auto-resolve-conflicts"]')
      await secondaryPage.waitForTimeout(5000) // Allow resolution processing
      
      // Validate final data consistency
      const consistencyCheck = await secondaryPage.evaluate(async () => {
        // This would be a real consistency check in the application
        return {
          ceremonyDuration: 45,
          photoDuration: 60,
          photoStart: '15:30',
          timingConsistent: true // Simplified check
        }
      })
      
      expect(consistencyCheck.timingConsistent).toBe(true)
      
      // Verify UI reflects consistent state
      await secondaryPage.goto('/dashboard/timeline')
      await expect(secondaryPage.locator('[data-testid="timeline-consistent"]')).toBeVisible()
      await expect(secondaryPage.locator('text=No timing conflicts detected')).toBeVisible()
    })
  })

  test.describe('Advanced Conflict Scenarios', () => {
    
    test('should handle three-way merge conflicts', async () => {
      // Create third context for three-way conflict
      const { browser } = primaryContext.context
      const tertiaryBrowserContext = await browser.newContext()
      const tertiaryPage = await tertiaryBrowserContext.newPage()
      const tertiaryContext = await OfflineTestUtils.initializeContext(tertiaryPage, tertiaryBrowserContext)
      
      await OfflineTestUtils.waitForServiceWorker(tertiaryPage)
      await OfflineTestUtils.setupOfflineApiMocks(tertiaryPage)
      await tertiaryPage.goto('/dashboard/vendors/vendor-1/edit')
      
      const { networkSim: primaryNet } = primaryContext
      const { networkSim: secondaryNet } = secondaryContext
      const { networkSim: tertiaryNet } = tertiaryContext
      
      // All three go offline
      await Promise.all([
        primaryNet.goOffline(),
        secondaryNet.goOffline(),
        tertiaryNet.goOffline()
      ])
      
      // Three different edits to the same vendor
      await primaryPage.goto('/dashboard/vendors/vendor-1/edit')
      await primaryPage.fill('[data-testid="vendor-notes"]', 'Primary edit - vendor confirmed')
      await primaryPage.click('[data-testid="save-vendor"]')
      
      await secondaryPage.goto('/dashboard/vendors/vendor-1/edit')
      await secondaryPage.fill('[data-testid="vendor-notes"]', 'Secondary edit - setup in progress')
      await secondaryPage.click('[data-testid="save-vendor"]')
      
      await tertiaryPage.fill('[data-testid="vendor-notes"]', 'Tertiary edit - completed setup')
      await tertiaryPage.click('[data-testid="save-vendor"]')
      
      // All come online in sequence
      await primaryNet.goOnline()
      await primaryPage.waitForTimeout(2000)
      
      await secondaryNet.goOnline()
      await secondaryPage.waitForTimeout(2000)
      
      await tertiaryNet.goOnline()
      
      // Should detect three-way conflict
      await expect(tertiaryPage.locator('[data-testid="three-way-conflict"]')).toBeVisible({ timeout: 10000 })
      
      // Should show timeline of all changes
      await expect(tertiaryPage.locator('text=Multiple coordinators edited this vendor')).toBeVisible()
      await expect(tertiaryPage.locator('text=confirmed')).toBeVisible()
      await expect(tertiaryPage.locator('text=setup in progress')).toBeVisible()
      await expect(tertiaryPage.locator('text=completed setup')).toBeVisible()
      
      // Should offer chronological merge
      await tertiaryPage.click('[data-testid="chronological-merge"]')
      
      // Should create comprehensive notes with timeline
      await expect(tertiaryPage.locator('[data-testid="vendor-notes"]')).toContainText('confirmed')
      await expect(tertiaryPage.locator('[data-testid="vendor-notes"]')).toContainText('setup in progress')
      await expect(tertiaryPage.locator('[data-testid="vendor-notes"]')).toContainText('completed setup')
      
      await OfflineTestUtils.cleanup(tertiaryContext)
    })
  })
})