/**
 * WS-336 Calendar Integration System - End-to-End Tests
 * Cross-browser E2E testing for calendar integration user flows
 * 
 * WEDDING CONTEXT: E2E tests validate complete user journeys for wedding vendors
 * These tests ensure calendar integration works flawlessly across all devices and browsers
 */

import { test, expect, Page, Browser } from '@playwright/test'

// Test data for wedding scenarios
const WEDDING_SCENARIOS = {
  standardWedding: {
    coupleName: 'Emma & James Johnson',
    weddingDate: '2024-07-20',
    venue: 'Grand Hotel Wedding Venue',
    timeline: [
      { name: 'Getting Ready Photos', time: '10:00', duration: '2h' },
      { name: 'First Look', time: '12:30', duration: '30m' },
      { name: 'Ceremony', time: '14:00', duration: '1h' },
      { name: 'Cocktail Hour', time: '15:00', duration: '1h' },
      { name: 'Reception', time: '18:00', duration: '5h' }
    ]
  },
  destinationWedding: {
    coupleName: 'Sarah & Michael Chen',
    weddingDate: '2024-08-15',
    venue: 'Maui Beach Resort',
    timezone: 'Pacific/Honolulu',
    timeline: [
      { name: 'Sunrise Photos', time: '06:00', duration: '2h' },
      { name: 'Beach Ceremony', time: '16:00', duration: '45m' },
      { name: 'Sunset Reception', time: '18:00', duration: '4h' }
    ]
  },
  multiVendorWedding: {
    coupleName: 'Lisa & David Wilson',
    weddingDate: '2024-09-05',
    venue: 'Mountain Lodge',
    vendors: [
      { type: 'photographer', name: 'Pro Photography' },
      { type: 'videographer', name: 'Wedding Films' },
      { type: 'florist', name: 'Bloom Designs' },
      { type: 'caterer', name: 'Gourmet Catering' }
    ]
  }
}

test.describe('Calendar Integration E2E Tests', () => {
  let vendorEmail: string

  test.beforeEach(async ({ page }) => {
    // Setup unique test vendor for each test
    vendorEmail = `e2e-vendor-${Date.now()}@wedsync.com`
    
    // Create and authenticate test vendor
    await createTestVendor(page, vendorEmail)
    await authenticateVendor(page, vendorEmail)
  })

  test.describe('Calendar Provider Connection Flow', () => {
    test('should connect Google Calendar successfully across browsers', async ({ page, browserName }) => {
      // Navigate to calendar integration page
      await page.goto('/dashboard/calendar')
      await expect(page.locator('[data-testid="calendar-dashboard"]')).toBeVisible()

      // Verify initial state shows no connections
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('0')

      // Start Google Calendar connection
      await page.click('[data-testid="connect-google-calendar"]')

      // Verify OAuth initiation (in test mode, this is mocked)
      await expect(page.locator('[data-testid="oauth-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="oauth-provider"]')).toHaveText('Google Calendar')

      // Handle OAuth flow (mocked in test environment)
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('[data-testid="proceed-oauth"]')
      ])

      // Mock successful OAuth completion
      await popup.goto('/test/mock-oauth-success?provider=google&email=photographer@gmail.com')
      await popup.close()

      // Verify connection success
      await expect(page.locator('[data-testid="connection-success-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="google-calendar-status"]')).toHaveText('✓ Connected')
      await expect(page.locator('[data-testid="google-calendar-email"]')).toContainText('photographer@gmail.com')
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('1')

      // Verify last sync timestamp is shown
      await expect(page.locator('[data-testid="google-last-sync"]')).toBeVisible()

      // Take screenshot for cross-browser verification
      await page.screenshot({ 
        path: `test-results/google-calendar-connected-${browserName}.png`,
        fullPage: true 
      })
    })

    test('should connect multiple calendar providers simultaneously', async ({ page }) => {
      await page.goto('/dashboard/calendar')

      // Connect Google Calendar
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('1')

      // Connect Outlook Calendar
      await connectCalendarProvider(page, 'outlook', 'photographer@outlook.com')
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('2')

      // Connect Apple Calendar
      await connectCalendarProvider(page, 'apple', 'photographer@icloud.com')
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('3')

      // Verify all providers show as connected
      await expect(page.locator('[data-testid="google-calendar-status"]')).toHaveText('✓ Connected')
      await expect(page.locator('[data-testid="outlook-calendar-status"]')).toHaveText('✓ Connected')
      await expect(page.locator('[data-testid="apple-calendar-status"]')).toHaveText('✓ Connected')

      // Verify sync settings are available
      await expect(page.locator('[data-testid="sync-settings-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="auto-sync-toggle"]')).toBeEnabled()
      await expect(page.locator('[data-testid="sync-direction-select"]')).toBeVisible()
    })

    test('should handle OAuth connection errors gracefully', async ({ page }) => {
      await page.goto('/dashboard/calendar')

      // Attempt to connect calendar
      await page.click('[data-testid="connect-google-calendar"]')

      // Simulate OAuth error
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('[data-testid="proceed-oauth"]')
      ])

      await popup.goto('/test/mock-oauth-error?error=access_denied')
      await popup.close()

      // Verify error handling
      await expect(page.locator('[data-testid="connection-error-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Calendar connection was denied')
      await expect(page.locator('[data-testid="retry-connection-button"]')).toBeVisible()
      
      // Verify connection status remains disconnected
      await expect(page.locator('[data-testid="google-calendar-status"]')).toHaveText('Not Connected')
      await expect(page.locator('[data-testid="connected-calendars-count"]')).toHaveText('0')
    })
  })

  test.describe('Wedding Timeline Synchronization', () => {
    test('should sync complete wedding timeline to connected calendar', async ({ page }) => {
      // Setup: Connect Google Calendar
      await page.goto('/dashboard/calendar')
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')

      // Navigate to wedding timeline
      await page.click('[data-testid="timeline-tab"]')
      await expect(page.locator('[data-testid="timeline-builder"]')).toBeVisible()

      // Create wedding timeline for standard wedding
      const wedding = WEDDING_SCENARIOS.standardWedding
      await createWeddingTimeline(page, wedding)

      // Verify timeline events created
      for (const event of wedding.timeline) {
        await expect(page.locator(`[data-testid="timeline-event-${event.name.toLowerCase().replace(/\s+/g, '-')}"]`)).toBeVisible()
      }

      // Enable calendar sync for all events
      await page.click('[data-testid="select-all-events"]')
      await page.click('[data-testid="enable-calendar-sync"]')
      
      // Choose sync settings
      await page.selectOption('[data-testid="sync-provider-select"]', 'google')
      await page.check('[data-testid="auto-sync-enabled"]')
      await page.click('[data-testid="save-sync-settings"]')

      // Initiate sync
      await page.click('[data-testid="sync-timeline-now"]')

      // Verify sync progress
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Syncing timeline events...')

      // Wait for sync completion
      await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="sync-status"]')).toHaveText('✓ All events synced successfully')

      // Verify sync results
      await expect(page.locator('[data-testid="synced-events-count"]')).toHaveText(`${wedding.timeline.length} events synced`)
      await expect(page.locator('[data-testid="failed-events-count"]')).toHaveText('0 failed')

      // Verify individual event sync status
      for (const event of wedding.timeline) {
        const eventSelector = `[data-testid="timeline-event-${event.name.toLowerCase().replace(/\s+/g, '-')}"]`
        await expect(page.locator(`${eventSelector} [data-testid="sync-indicator"]`)).toHaveText('✓')
        await expect(page.locator(`${eventSelector} [data-testid="calendar-event-id"]`)).toBeVisible()
      }

      // Take screenshot of successful timeline sync
      await page.screenshot({ 
        path: 'test-results/wedding-timeline-synced.png',
        fullPage: true 
      })
    })

    test('should handle wedding day conflicts and provide resolution options', async ({ page }) => {
      await page.goto('/dashboard/calendar')
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')

      // Create first wedding timeline
      await page.click('[data-testid="timeline-tab"]')
      const firstWedding = WEDDING_SCENARIOS.standardWedding
      await createWeddingTimeline(page, firstWedding)
      await syncTimelineEvents(page, firstWedding.timeline)

      // Create conflicting second wedding
      const conflictingWedding = {
        coupleName: 'Mary & John Brown',
        weddingDate: '2024-07-20', // Same date as first wedding
        venue: 'Different Venue',
        timeline: [
          { name: 'Ceremony Photography', time: '15:00', duration: '2h' }, // Conflicts with first wedding
          { name: 'Reception', time: '18:30', duration: '4h' }
        ]
      }

      // Attempt to sync conflicting wedding
      await page.click('[data-testid="new-wedding-timeline"]')
      await createWeddingTimeline(page, conflictingWedding)
      await page.click('[data-testid="sync-timeline-now"]')

      // Verify conflict detection
      await expect(page.locator('[data-testid="conflict-detection-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-title"]')).toContainText('Wedding Day Conflict Detected')
      
      // Verify conflict details
      await expect(page.locator('[data-testid="conflict-existing-wedding"]')).toContainText('Emma & James Johnson')
      await expect(page.locator('[data-testid="conflict-proposed-wedding"]')).toContainText('Mary & John Brown')
      await expect(page.locator('[data-testid="conflict-overlap-duration"]')).toContainText('2 hours')

      // Verify resolution options are presented
      await expect(page.locator('[data-testid="resolution-options"]')).toBeVisible()
      await expect(page.locator('[data-testid="option-adjust-times"]')).toBeVisible()
      await expect(page.locator('[data-testid="option-decline-booking"]')).toBeVisible()
      await expect(page.locator('[data-testid="option-contact-client"]')).toBeVisible()

      // Test time adjustment resolution
      await page.click('[data-testid="option-adjust-times"]')
      await expect(page.locator('[data-testid="suggested-times"]')).toBeVisible()
      
      // Select suggested alternative time
      await page.click('[data-testid="suggested-time-1"]') // First suggested alternative
      await page.click('[data-testid="apply-time-adjustment"]')

      // Verify conflict resolution
      await expect(page.locator('[data-testid="conflict-resolved-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="timeline-updated"]')).toBeVisible()

      // Verify timeline sync proceeds with adjusted times
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 })
    })

    test('should handle destination wedding timezone conversion', async ({ page }) => {
      await page.goto('/dashboard/calendar')
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')

      // Create destination wedding timeline
      const destinationWedding = WEDDING_SCENARIOS.destinationWedding
      
      await page.click('[data-testid="timeline-tab"]')
      await page.click('[data-testid="new-wedding-timeline"]')

      // Set destination wedding details with timezone
      await page.fill('[data-testid="couple-name"]', destinationWedding.coupleName)
      await page.fill('[data-testid="wedding-date"]', destinationWedding.weddingDate)
      await page.fill('[data-testid="venue-name"]', destinationWedding.venue)
      await page.selectOption('[data-testid="wedding-timezone"]', destinationWedding.timezone!)

      // Add timeline events
      for (const event of destinationWedding.timeline) {
        await page.click('[data-testid="add-timeline-event"]')
        await page.fill('[data-testid="event-name"]', event.name)
        await page.fill('[data-testid="event-time"]', event.time)
        await page.fill('[data-testid="event-duration"]', event.duration)
        await page.click('[data-testid="save-event"]')
      }

      // Sync timeline
      await page.click('[data-testid="sync-timeline-now"]')
      await expect(page.locator('[data-testid="timezone-conversion-notice"]')).toBeVisible()
      await expect(page.locator('[data-testid="timezone-conversion-notice"]')).toContainText('Events will be synced in Hawaii time (UTC-10)')

      // Verify sync completion
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 })

      // Verify timezone display in timeline
      const sunriseEvent = page.locator('[data-testid="timeline-event-sunrise-photos"]')
      await expect(sunriseEvent.locator('[data-testid="event-time-display"]')).toContainText('6:00 AM HST')
      await expect(sunriseEvent.locator('[data-testid="event-time-utc"]')).toContainText('4:00 PM UTC')
    })
  })

  test.describe('Mobile Device Compatibility', () => {
    test('should work perfectly on mobile viewports', async ({ page, isMobile }) => {
      if (!isMobile) {
        // Set mobile viewport for non-mobile browsers
        await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
      }

      await page.goto('/dashboard/calendar')

      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-calendar-dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()

      // Test mobile calendar connection flow
      await page.tap('[data-testid="mobile-menu-toggle"]')
      await page.tap('[data-testid="mobile-connect-calendar"]')

      // Verify mobile calendar provider selection
      await expect(page.locator('[data-testid="mobile-provider-selection"]')).toBeVisible()
      
      // Test touch interactions
      await page.tap('[data-testid="mobile-google-calendar-option"]')
      await expect(page.locator('[data-testid="mobile-oauth-flow"]')).toBeVisible()

      // Complete mobile OAuth flow
      await page.tap('[data-testid="mobile-proceed-oauth"]')
      
      // Mock mobile OAuth success
      await page.goto('/test/mock-mobile-oauth-success?provider=google')

      // Verify mobile success state
      await expect(page.locator('[data-testid="mobile-connection-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-calendar-connected-badge"]')).toBeVisible()

      // Test mobile timeline creation
      await page.tap('[data-testid="mobile-timeline-tab"]')
      await expect(page.locator('[data-testid="mobile-timeline-view"]')).toBeVisible()

      // Verify touch-friendly timeline controls
      await page.tap('[data-testid="mobile-add-event-button"]')
      await expect(page.locator('[data-testid="mobile-event-form"]')).toBeVisible()

      // Test touch-friendly form inputs
      await page.tap('[data-testid="mobile-event-name-input"]')
      await page.fill('[data-testid="mobile-event-name-input"]', 'Mobile Test Event')

      // Use mobile date/time pickers
      await page.tap('[data-testid="mobile-date-picker"]')
      await page.tap('[data-testid="mobile-date-today"]')
      await page.tap('[data-testid="mobile-time-picker"]')
      await page.tap('[data-testid="mobile-time-14-00"]')

      // Save event using mobile UI
      await page.tap('[data-testid="mobile-save-event"]')
      await expect(page.locator('[data-testid="mobile-event-saved-toast"]')).toBeVisible()

      // Test mobile sync functionality
      await page.tap('[data-testid="mobile-sync-button"]')
      await expect(page.locator('[data-testid="mobile-sync-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-sync-complete"]')).toBeVisible({ timeout: 10000 })

      // Take mobile screenshot
      await page.screenshot({ 
        path: 'test-results/mobile-calendar-integration.png',
        fullPage: true 
      })
    })

    test('should support touch gestures on timeline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard/calendar')

      // Setup timeline with multiple events
      await connectCalendarProvider(page, 'google', 'mobile@gmail.com')
      await createSampleTimeline(page)

      // Navigate to timeline view
      await page.tap('[data-testid="mobile-timeline-tab"]')
      await expect(page.locator('[data-testid="touch-timeline-container"]')).toBeVisible()

      const timeline = page.locator('[data-testid="touch-timeline-container"]')

      // Test horizontal swipe to scroll timeline
      const timelineBox = await timeline.boundingBox()
      if (timelineBox) {
        // Swipe right to left (scroll forward in time)
        await page.mouse.move(timelineBox.x + timelineBox.width - 50, timelineBox.y + timelineBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(timelineBox.x + 50, timelineBox.y + timelineBox.height / 2, { steps: 10 })
        await page.mouse.up()

        // Verify timeline scrolled
        const scrollPosition = await timeline.evaluate(el => el.scrollLeft)
        expect(scrollPosition).toBeGreaterThan(0)
      }

      // Test pinch to zoom simulation (using wheel events)
      await timeline.hover()
      await page.mouse.wheel(0, -100) // Simulate zoom in

      // Verify timeline scale changed
      const timelineScale = await timeline.evaluate(el => 
        window.getComputedStyle(el).transform
      )
      expect(timelineScale).not.toBe('none')

      // Test long press to show event details
      const firstEvent = timeline.locator('[data-testid="timeline-event"]').first()
      await firstEvent.hover()
      await page.mouse.down()
      await page.waitForTimeout(1000) // Long press duration
      await page.mouse.up()

      // Verify event details modal opened
      await expect(page.locator('[data-testid="mobile-event-details-modal"]')).toBeVisible()
    })
  })

  test.describe('Performance and Reliability', () => {
    test('should maintain responsive UI during sync operations', async ({ page }) => {
      await page.goto('/dashboard/calendar')
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')

      // Create large wedding timeline (20+ events)
      const largeWedding = {
        coupleName: 'Performance Test Wedding',
        weddingDate: '2024-08-15',
        venue: 'Large Event Venue',
        timeline: Array(25).fill(null).map((_, index) => ({
          name: `Event ${index + 1}`,
          time: `${8 + Math.floor(index / 2)}:${index % 2 === 0 ? '00' : '30'}`,
          duration: '30m'
        }))
      }

      await createWeddingTimeline(page, largeWedding)

      // Start sync operation
      const startTime = Date.now()
      await page.click('[data-testid="sync-timeline-now"]')

      // Verify UI remains responsive during sync
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
      
      // Test UI interactions during sync
      await expect(page.locator('[data-testid="add-event-button"]')).toBeEnabled()
      await expect(page.locator('[data-testid="timeline-settings"]')).toBeEnabled()

      // Test other page navigation works during sync
      await page.click('[data-testid="dashboard-nav"]')
      await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible()
      
      // Return to calendar and verify sync completed
      await page.click('[data-testid="calendar-nav"]')
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 15000 })

      const syncDuration = Date.now() - startTime
      console.log(`Large timeline sync completed in ${syncDuration}ms`)

      // Verify all events synced successfully
      await expect(page.locator('[data-testid="synced-events-count"]')).toHaveText('25 events synced')
    })

    test('should handle network interruptions gracefully', async ({ page }) => {
      await page.goto('/dashboard/calendar')
      await connectCalendarProvider(page, 'google', 'photographer@gmail.com')

      // Create wedding timeline
      const wedding = WEDDING_SCENARIOS.standardWedding
      await createWeddingTimeline(page, wedding)

      // Simulate network interruption by blocking requests
      await page.route('**/api/calendar/sync**', route => {
        // Delay first few requests to simulate poor connection
        setTimeout(() => route.continue(), 3000)
      })

      // Start sync with network delays
      await page.click('[data-testid="sync-timeline-now"]')

      // Verify sync handles delays gracefully
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('Syncing... This may take a moment')

      // Verify retry mechanism activates
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('[data-testid="retry-count"]')).toBeVisible()

      // Remove network interference
      await page.unroute('**/api/calendar/sync**')

      // Verify sync eventually completes
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('[data-testid="sync-status"]')).toHaveText('✓ All events synced successfully')
    })
  })

  // Helper functions
  async function createTestVendor(page: Page, email: string) {
    await page.goto('/signup')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    await page.fill('[data-testid="business-name-input"]', 'E2E Test Photography')
    await page.selectOption('[data-testid="business-type-select"]', 'photographer')
    await page.check('[data-testid="terms-agreement"]')
    await page.click('[data-testid="signup-button"]')
    
    // Wait for account creation confirmation
    await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
  }

  async function authenticateVendor(page: Page, email: string) {
    // If not already authenticated, sign in
    if (page.url().includes('/login')) {
      await page.fill('[data-testid="email-input"]', email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.click('[data-testid="login-button"]')
    }
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  }

  async function connectCalendarProvider(page: Page, provider: string, email: string) {
    await page.click(`[data-testid="connect-${provider}-calendar"]`)
    
    // Handle OAuth flow (mocked)
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="proceed-oauth"]')
    ])

    await popup.goto(`/test/mock-oauth-success?provider=${provider}&email=${email}`)
    await popup.close()

    // Wait for connection success
    await expect(page.locator(`[data-testid="${provider}-calendar-status"]`)).toHaveText('✓ Connected')
  }

  async function createWeddingTimeline(page: Page, wedding: any) {
    // Create new timeline
    await page.click('[data-testid="new-wedding-timeline"]')
    
    // Fill wedding details
    await page.fill('[data-testid="couple-name"]', wedding.coupleName)
    await page.fill('[data-testid="wedding-date"]', wedding.weddingDate)
    await page.fill('[data-testid="venue-name"]', wedding.venue)
    
    if (wedding.timezone) {
      await page.selectOption('[data-testid="wedding-timezone"]', wedding.timezone)
    }

    // Add timeline events
    for (const event of wedding.timeline) {
      await page.click('[data-testid="add-timeline-event"]')
      await page.fill('[data-testid="event-name"]', event.name)
      await page.fill('[data-testid="event-time"]', event.time)
      await page.fill('[data-testid="event-duration"]', event.duration)
      await page.click('[data-testid="save-event"]')
      
      // Verify event was added
      await expect(page.locator(`[data-testid="timeline-event-${event.name.toLowerCase().replace(/\s+/g, '-')}"]`)).toBeVisible()
    }

    // Save timeline
    await page.click('[data-testid="save-timeline"]')
    await expect(page.locator('[data-testid="timeline-saved"]')).toBeVisible()
  }

  async function syncTimelineEvents(page: Page, timeline: any[]) {
    await page.click('[data-testid="select-all-events"]')
    await page.click('[data-testid="sync-timeline-now"]')
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 })
  }

  async function createSampleTimeline(page: Page) {
    const sampleWedding = {
      coupleName: 'Sample Wedding',
      weddingDate: '2024-08-01',
      venue: 'Sample Venue',
      timeline: [
        { name: 'Prep', time: '10:00', duration: '2h' },
        { name: 'Ceremony', time: '14:00', duration: '1h' },
        { name: 'Reception', time: '18:00', duration: '4h' }
      ]
    }
    
    await createWeddingTimeline(page, sampleWedding)
  }
})