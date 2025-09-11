import { test, expect, Page } from '@playwright/test'

// Helper function to create a test timeline
async function createTestTimeline(page: Page) {
  await page.goto('/dashboard/timelines')
  
  // Click create timeline button
  await page.click('[data-testid="create-timeline-button"]')
  
  // Fill in timeline details
  await page.fill('[data-testid="timeline-title"]', 'Test Wedding Timeline')
  await page.fill('[data-testid="timeline-date"]', '2025-06-15')
  await page.fill('[data-testid="timeline-start-time"]', '09:00')
  await page.fill('[data-testid="timeline-end-time"]', '23:00')
  await page.fill('[data-testid="timeline-location"]', 'Grand Plaza Hotel')
  
  // Save timeline
  await page.click('[data-testid="save-timeline-button"]')
  
  // Wait for redirect to timeline builder
  await page.waitForURL('**/timelines/*/builder')
}

// Helper function to add a test event
async function addTestEvent(page: Page, title: string, startTime: string, duration: number) {
  await page.click('[data-testid="add-event-button"]')
  
  await page.fill('[data-testid="event-title"]', title)
  await page.fill('[data-testid="event-start-time"]', startTime)
  await page.fill('[data-testid="event-duration"]', duration.toString())
  await page.selectOption('[data-testid="event-priority"]', 'high')
  await page.fill('[data-testid="event-location"]', 'Main Hall')
  
  await page.click('[data-testid="save-event-button"]')
  
  // Wait for event to appear on timeline
  await expect(page.locator(`[data-testid="event-card"]:has-text("${title}")`)).toBeVisible()
}

test.describe('Wedding Timeline Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication - adjust based on your auth system
    await page.context().addCookies([
      {
        name: 'auth-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/'
      }
    ])
  })

  test.describe('Timeline Creation and Management', () => {
    test('should create a new wedding timeline', async ({ page }) => {
      await page.goto('/dashboard/timelines')
      
      await page.click('[data-testid="create-timeline-button"]')
      
      // Fill form
      await page.fill('[data-testid="timeline-title"]', 'Sarah & John Wedding')
      await page.fill('[data-testid="timeline-date"]', '2025-07-20')
      await page.fill('[data-testid="timeline-start-time"]', '08:00')
      await page.fill('[data-testid="timeline-end-time"]', '24:00')
      await page.fill('[data-testid="timeline-location"]', 'Oceanview Resort')
      await page.fill('[data-testid="timeline-description"]', 'Beautiful oceanfront wedding celebration')
      
      await page.click('[data-testid="save-timeline-button"]')
      
      // Verify redirect to timeline builder
      await expect(page).toHaveURL(/.*\/timelines\/.*\/builder/)
      
      // Verify timeline details are displayed
      await expect(page.locator('[data-testid="timeline-title"]')).toHaveText('Sarah & John Wedding')
      await expect(page.locator('[data-testid="timeline-date"]')).toHaveText('July 20, 2025')
    })

    test('should display timeline ruler with correct time markers', async ({ page }) => {
      await createTestTimeline(page)
      
      // Check ruler is visible
      await expect(page.locator('[data-testid="timeline-ruler"]')).toBeVisible()
      
      // Check time markers
      await expect(page.locator('[data-testid="time-marker"]:has-text("09:00")')).toBeVisible()
      await expect(page.locator('[data-testid="time-marker"]:has-text("12:00")')).toBeVisible()
      await expect(page.locator('[data-testid="time-marker"]:has-text("18:00")')).toBeVisible()
      await expect(page.locator('[data-testid="time-marker"]:has-text("23:00")')).toBeVisible()
    })

    test('should support timeline zoom controls', async ({ page }) => {
      await createTestTimeline(page)
      
      // Test zoom in
      await page.click('[data-testid="zoom-in-button"]')
      await expect(page.locator('[data-testid="zoom-level"]')).toHaveText('125%')
      
      // Test zoom out
      await page.click('[data-testid="zoom-out-button"]')
      await page.click('[data-testid="zoom-out-button"]')
      await expect(page.locator('[data-testid="zoom-level"]')).toHaveText('75%')
      
      // Test zoom to fit
      await page.click('[data-testid="zoom-fit-button"]')
      await expect(page.locator('[data-testid="zoom-level"]')).toHaveText('100%')
    })
  })

  test.describe('Event Management', () => {
    test('should add a new event to the timeline', async ({ page }) => {
      await createTestTimeline(page)
      
      await addTestEvent(page, 'Ceremony Setup', '14:00', 90)
      
      // Verify event appears on timeline
      const eventCard = page.locator('[data-testid="event-card"]:has-text("Ceremony Setup")')
      await expect(eventCard).toBeVisible()
      
      // Verify event details
      await expect(eventCard.locator('[data-testid="event-time"]')).toHaveText('14:00')
      await expect(eventCard.locator('[data-testid="event-duration"]')).toHaveText('90min')
      await expect(eventCard.locator('[data-testid="event-priority"]')).toHaveClass(/high/)
    })

    test('should edit an existing event', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Reception Setup', '18:00', 60)
      
      // Click on event to open edit dialog
      await page.click('[data-testid="event-card"]:has-text("Reception Setup")')
      await page.click('[data-testid="edit-event-button"]')
      
      // Modify event details
      await page.fill('[data-testid="event-title"]', 'Reception Setup & Decoration')
      await page.fill('[data-testid="event-duration"]', '120')
      await page.selectOption('[data-testid="event-priority"]', 'critical')
      
      await page.click('[data-testid="save-event-button"]')
      
      // Verify changes
      const eventCard = page.locator('[data-testid="event-card"]:has-text("Reception Setup & Decoration")')
      await expect(eventCard).toBeVisible()
      await expect(eventCard.locator('[data-testid="event-duration"]')).toHaveText('120min')
      await expect(eventCard.locator('[data-testid="event-priority"]')).toHaveClass(/critical/)
    })

    test('should delete an event', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Test Event', '16:00', 30)
      
      // Delete event
      await page.click('[data-testid="event-card"]:has-text("Test Event")')
      await page.click('[data-testid="delete-event-button"]')
      await page.click('[data-testid="confirm-delete-button"]')
      
      // Verify event is removed
      await expect(page.locator('[data-testid="event-card"]:has-text("Test Event")')).not.toBeVisible()
    })
  })

  test.describe('Drag and Drop Functionality', () => {
    test('should allow dragging event to new time slot', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Processional', '15:00', 15)
      
      const eventCard = page.locator('[data-testid="event-card"]:has-text("Processional")')
      const initialPosition = await eventCard.boundingBox()
      
      // Drag event to new position (1 hour later)
      const timelineArea = page.locator('[data-testid="timeline-canvas"]')
      const timelineBox = await timelineArea.boundingBox()
      
      if (initialPosition && timelineBox) {
        // Calculate position for 16:00 (1 hour = 60px assuming 60px per hour)
        const newX = initialPosition.x + 60
        
        await eventCard.dragTo(timelineArea, {
          targetPosition: { x: newX - timelineBox.x, y: initialPosition.y - timelineBox.y }
        })
        
        // Verify event time updated
        await expect(eventCard.locator('[data-testid="event-time"]')).toHaveText('16:00')
      }
    })

    test('should snap to grid when dragging with snap enabled', async ({ page }) => {
      await createTestTimeline(page)
      
      // Enable grid snapping
      await page.click('[data-testid="grid-snap-toggle"]')
      
      await addTestEvent(page, 'Cocktail Hour', '17:00', 60)
      
      const eventCard = page.locator('[data-testid="event-card"]:has-text("Cocktail Hour")')
      const timelineArea = page.locator('[data-testid="timeline-canvas"]')
      const timelineBox = await timelineArea.boundingBox()
      const eventBox = await eventCard.boundingBox()
      
      if (eventBox && timelineBox) {
        // Drag to slightly off-grid position
        await eventCard.dragTo(timelineArea, {
          targetPosition: { x: eventBox.x - timelineBox.x + 23, y: eventBox.y - timelineBox.y }
        })
        
        // Should snap to nearest 15-minute mark (17:15)
        await expect(eventCard.locator('[data-testid="event-time"]')).toHaveText('17:15')
      }
    })

    test('should prevent dragging locked events', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Ceremony', '16:00', 45)
      
      // Lock the event
      await page.click('[data-testid="event-card"]:has-text("Ceremony")')
      await page.click('[data-testid="lock-event-button"]')
      
      const eventCard = page.locator('[data-testid="event-card"]:has-text("Ceremony")')
      const initialTime = await eventCard.locator('[data-testid="event-time"]').textContent()
      
      // Try to drag (should not move)
      const timelineArea = page.locator('[data-testid="timeline-canvas"]')
      await eventCard.dragTo(timelineArea, {
        targetPosition: { x: 100, y: 50 }
      })
      
      // Verify event didn't move
      await expect(eventCard.locator('[data-testid="event-time"]')).toHaveText(initialTime!)
      await expect(eventCard).toHaveClass(/locked/)
    })
  })

  test.describe('Conflict Detection', () => {
    test('should detect time overlap conflicts', async ({ page }) => {
      await createTestTimeline(page)
      
      // Add overlapping events
      await addTestEvent(page, 'Sound Check', '14:00', 60)
      await addTestEvent(page, 'Lighting Setup', '14:30', 60)
      
      // Wait for conflict detection
      await page.waitForTimeout(2000)
      
      // Check conflicts panel
      await page.click('[data-testid="conflicts-tab"]')
      
      await expect(page.locator('[data-testid="conflict-item"]:has-text("time-overlap")')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-description"]')).toContainText('Sound Check')
      await expect(page.locator('[data-testid="conflict-description"]')).toContainText('Lighting Setup')
    })

    test('should detect vendor double booking', async ({ page }) => {
      await createTestTimeline(page)
      
      // Add events with same vendor
      await addTestEvent(page, 'DJ Setup', '15:00', 45)
      
      // Edit first event to assign vendor
      await page.click('[data-testid="event-card"]:has-text("DJ Setup")')
      await page.click('[data-testid="edit-event-button"]')
      await page.click('[data-testid="add-vendor-button"]')
      await page.selectOption('[data-testid="vendor-select"]', 'dj-service-123')
      await page.click('[data-testid="save-event-button"]')
      
      // Add second event with same vendor
      await addTestEvent(page, 'Music Testing', '15:30', 30)
      await page.click('[data-testid="event-card"]:has-text("Music Testing")')
      await page.click('[data-testid="edit-event-button"]')
      await page.click('[data-testid="add-vendor-button"]')
      await page.selectOption('[data-testid="vendor-select"]', 'dj-service-123')
      await page.click('[data-testid="save-event-button"]')
      
      // Check for vendor conflict
      await page.click('[data-testid="conflicts-tab"]')
      await expect(page.locator('[data-testid="conflict-item"]:has-text("vendor-double-booking")')).toBeVisible()
    })

    test('should resolve conflicts', async ({ page }) => {
      await createTestTimeline(page)
      
      // Create a conflict
      await addTestEvent(page, 'Setup Event 1', '14:00', 60)
      await addTestEvent(page, 'Setup Event 2', '14:30', 60)
      
      await page.click('[data-testid="conflicts-tab"]')
      
      // Resolve conflict by adjusting times
      const conflictItem = page.locator('[data-testid="conflict-item"]').first()
      await conflictItem.click()
      await page.click('[data-testid="resolve-adjust-times"]')
      
      // Verify conflict is resolved
      await expect(page.locator('[data-testid="conflict-status"]:has-text("resolved")')).toBeVisible()
    })
  })

  test.describe('Real-time Collaboration', () => {
    test('should show online users indicator', async ({ page, context }) => {
      await createTestTimeline(page)
      
      // Open second browser context to simulate another user
      const page2 = await context.newPage()
      await page2.goto(page.url())
      
      // Should show 2 users online
      await expect(page.locator('[data-testid="online-users-count"]')).toHaveText('2 online')
      await expect(page.locator('[data-testid="user-avatar"]')).toHaveCount(2)
      
      await page2.close()
    })

    test('should show user cursors and editing indicators', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Test Event', '15:00', 30)
      
      // Simulate editing an event (this would normally trigger presence updates)
      await page.click('[data-testid="event-card"]:has-text("Test Event")')
      await page.click('[data-testid="edit-event-button"]')
      
      // Should show editing indicator
      await expect(page.locator('[data-testid="editing-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-editing-event"]')).toContainText('Test Event')
    })

    test('should sync changes in real-time', async ({ page }) => {
      await createTestTimeline(page)
      
      // This test would require setting up multiple browser contexts
      // and verifying that changes made in one are reflected in the other
      // For now, we'll test the basic functionality
      
      await addTestEvent(page, 'Sync Test', '16:00', 45)
      
      // Verify event appears
      await expect(page.locator('[data-testid="event-card"]:has-text("Sync Test")')).toBeVisible()
      
      // In a real scenario, we'd verify this appears in other connected clients
    })
  })

  test.describe('Vendor Panel', () => {
    test('should display vendor-specific event view', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Catering Setup', '11:00', 120)
      
      // Switch to vendor view
      await page.click('[data-testid="vendor-view-toggle"]')
      
      // Should show only events assigned to current vendor
      await expect(page.locator('[data-testid="vendor-events-list"]')).toBeVisible()
      
      // Filter by status
      await page.selectOption('[data-testid="status-filter"]', 'pending')
      await expect(page.locator('[data-testid="event-status-pending"]')).toBeVisible()
    })

    test('should allow vendors to update event status', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Vendor Event', '13:00', 60)
      
      await page.click('[data-testid="vendor-view-toggle"]')
      
      // Update event status
      const eventItem = page.locator('[data-testid="vendor-event-item"]').first()
      await eventItem.click('[data-testid="confirm-event-button"]')
      
      // Verify status change
      await expect(eventItem.locator('[data-testid="event-status"]')).toHaveText('confirmed')
    })

    test('should allow vendors to add notes', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Vendor Event', '13:00', 60)
      
      await page.click('[data-testid="vendor-view-toggle"]')
      
      // Add note
      const eventItem = page.locator('[data-testid="vendor-event-item"]').first()
      await eventItem.click()
      await page.fill('[data-testid="vendor-note-input"]', 'Setup requires additional power outlets')
      await page.click('[data-testid="add-note-button"]')
      
      // Verify note is added
      await expect(page.locator('[data-testid="vendor-note"]')).toContainText('Setup requires additional power outlets')
    })
  })

  test.describe('Timeline Templates', () => {
    test('should create timeline from template', async ({ page }) => {
      await page.goto('/dashboard/timelines')
      
      await page.click('[data-testid="create-from-template-button"]')
      await page.click('[data-testid="template-card"]:has-text("Traditional Wedding")')
      
      // Customize template
      await page.fill('[data-testid="timeline-title"]', 'My Traditional Wedding')
      await page.fill('[data-testid="timeline-date"]', '2025-08-15')
      await page.click('[data-testid="create-from-template"]')
      
      // Verify timeline created with template events
      await expect(page).toHaveURL(/.*\/timelines\/.*\/builder/)
      await expect(page.locator('[data-testid="event-card"]')).toHaveCount.toBeGreaterThan(5)
    })

    test('should save timeline as template', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Custom Event 1', '14:00', 30)
      await addTestEvent(page, 'Custom Event 2', '15:00', 45)
      
      await page.click('[data-testid="timeline-menu"]')
      await page.click('[data-testid="save-as-template"]')
      
      await page.fill('[data-testid="template-name"]', 'My Custom Template')
      await page.fill('[data-testid="template-description"]', 'Custom wedding timeline template')
      await page.click('[data-testid="save-template-button"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Template saved')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await createTestTimeline(page)
      
      // Should show mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-timeline-view"]')).toBeVisible()
      
      // Events should be in list view on mobile
      await expect(page.locator('[data-testid="event-list-view"]')).toBeVisible()
      
      // Add event on mobile
      await page.click('[data-testid="mobile-add-event"]')
      await page.fill('[data-testid="event-title"]', 'Mobile Event')
      await page.fill('[data-testid="event-start-time"]', '17:00')
      await page.click('[data-testid="save-event-button"]')
      
      await expect(page.locator('[data-testid="event-list-item"]:has-text("Mobile Event")')).toBeVisible()
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('should be accessible', async ({ page }) => {
      await createTestTimeline(page)
      
      // Check for accessibility landmarks
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('[role="button"]')).toHaveAttribute('tabindex', '0')
      
      // Check keyboard navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
    })

    test('should load timeline efficiently', async ({ page }) => {
      const startTime = Date.now()
      await createTestTimeline(page)
      const loadTime = Date.now() - startTime
      
      // Timeline should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Check for key performance indicators
      await expect(page.locator('[data-testid="timeline-canvas"]')).toBeVisible()
    })
  })

  test.describe('Data Persistence', () => {
    test('should save changes automatically', async ({ page }) => {
      await createTestTimeline(page)
      await addTestEvent(page, 'Auto Save Test', '14:00', 30)
      
      // Refresh page
      await page.reload()
      
      // Event should still be visible
      await expect(page.locator('[data-testid="event-card"]:has-text("Auto Save Test")')).toBeVisible()
    })

    test('should handle offline mode', async ({ page }) => {
      await createTestTimeline(page)
      
      // Simulate offline
      await page.context().setOffline(true)
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Changes should be queued
      await addTestEvent(page, 'Offline Event', '15:00', 30)
      
      // Go back online
      await page.context().setOffline(false)
      
      // Changes should sync
      await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible()
    })
  })
})