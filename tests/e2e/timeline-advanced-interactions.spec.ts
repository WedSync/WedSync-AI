// =====================================================
// TIMELINE ADVANCED INTERACTIONS - PLAYWRIGHT TESTS
// =====================================================
// Comprehensive E2E tests for timeline builder interactions
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20
// =====================================================

import { test, expect, Page } from '@playwright/test'
import { format, addDays } from 'date-fns'

// =====================================================
// TEST SETUP & UTILITIES
// =====================================================

interface TimelineTestFixture {
  timelineId: string
  clientId: string
  organizationId: string
  weddingDate: string
}

const createTestTimeline = (): TimelineTestFixture => ({
  timelineId: 'test-timeline-' + Date.now(),
  clientId: 'test-client-123',
  organizationId: 'test-org-456',
  weddingDate: format(addDays(new Date(), 90), 'yyyy-MM-dd')
})

const mockTimelineData = {
  events: [
    {
      id: 'event-ceremony',
      title: 'Wedding Ceremony',
      event_type: 'ceremony',
      start_time: '14:00',
      end_time: '15:00',
      location: 'Garden Pavilion',
      priority: 'critical'
    },
    {
      id: 'event-cocktails',
      title: 'Cocktail Hour',
      event_type: 'cocktails',
      start_time: '15:30',
      end_time: '16:30',
      location: 'Terrace',
      priority: 'high'
    },
    {
      id: 'event-reception',
      title: 'Reception Dinner',
      event_type: 'reception',
      start_time: '18:00',
      end_time: '22:00',
      location: 'Ballroom',
      priority: 'high'
    }
  ],
  vendors: [
    {
      id: 'vendor-photographer',
      name: 'Jane Doe Photography',
      type: 'photography'
    },
    {
      id: 'vendor-catering',
      name: 'ABC Catering',
      type: 'catering'
    }
  ]
}

// =====================================================
// TEST HELPERS
// =====================================================

class TimelineTestHelper {
  constructor(private page: Page) {}

  async navigateToTimeline(fixture: TimelineTestFixture) {
    await this.page.goto(`/timeline/${fixture.timelineId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async waitForTimelineLoad() {
    await this.page.waitForSelector('[data-testid="timeline-container"]')
    await this.page.waitForSelector('[data-testid="timeline-event"]')
  }

  async getEventElement(eventId: string) {
    return this.page.locator(`[data-event-id="${eventId}"]`)
  }

  async dragEventToTime(eventId: string, targetTime: string) {
    const eventElement = await this.getEventElement(eventId)
    const targetSlot = this.page.locator(`[data-time="${targetTime}"]`)
    
    await eventElement.dragTo(targetSlot)
  }

  async getEventPosition(eventId: string) {
    const eventElement = await this.getEventElement(eventId)
    return await eventElement.boundingBox()
  }

  async openExportDialog() {
    await this.page.click('[data-testid="export-timeline-button"]')
    await this.page.waitForSelector('[data-testid="export-dialog"]')
  }

  async selectExportFormat(format: string) {
    await this.page.click(`[data-format="${format}"]`)
  }

  async startExport() {
    await this.page.click('[data-testid="start-export-button"]')
  }

  async waitForExportComplete() {
    await this.page.waitForSelector('[data-testid="export-success"]', { timeout: 30000 })
  }

  async enableCollaboration() {
    await this.page.click('[data-testid="enable-collaboration-button"]')
    await this.page.waitForSelector('[data-testid="collaboration-active"]')
  }

  async simulateSecondUser(userName: string) {
    // Simulate presence of another user
    await this.page.evaluate((name) => {
      window.dispatchEvent(new CustomEvent('simulate-user-presence', {
        detail: {
          user_id: 'test-user-2',
          user_name: name,
          is_editing: false,
          cursor_position: { x: 200, y: 300 }
        }
      }))
    }, userName)
  }

  async openConflictDetector() {
    await this.page.click('[data-testid="conflict-detector-button"]')
    await this.page.waitForSelector('[data-testid="conflict-panel"]')
  }

  async openTemplateLibrary() {
    await this.page.click('[data-testid="template-library-button"]')
    await this.page.waitForSelector('[data-testid="template-library-dialog"]')
  }

  async selectTemplate(templateName: string) {
    await this.page.click(`[data-testid="template-${templateName}"]`)
    await this.page.click('[data-testid="apply-template-button"]')
  }
}

// =====================================================
// MAIN TEST SUITES
// =====================================================

test.describe('Timeline Advanced Interactions', () => {
  let fixture: TimelineTestFixture
  let helper: TimelineTestHelper

  test.beforeEach(async ({ page }) => {
    fixture = createTestTimeline()
    helper = new TimelineTestHelper(page)
    
    // Mock authentication and data
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', name: 'Test User' } })
      })
    })

    await page.route(`**/api/timelines/${fixture.timelineId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...fixture,
          name: 'Test Wedding Timeline',
          events: mockTimelineData.events,
          vendors: mockTimelineData.vendors
        })
      })
    })
  })

  // =====================================================
  // DRAG AND DROP TESTS
  // =====================================================

  test.describe('Drag and Drop Functionality', () => {
    test('should drag event to new time slot', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      const initialPosition = await helper.getEventPosition('event-ceremony')
      
      // Drag ceremony to earlier time
      await helper.dragEventToTime('event-ceremony', '13:00')
      
      // Verify position changed
      const newPosition = await helper.getEventPosition('event-ceremony')
      expect(newPosition?.x).not.toBe(initialPosition?.x)
      
      // Verify time updated in UI
      await expect(page.locator('[data-event-id="event-ceremony"] [data-testid="event-time"]'))
        .toContainText('13:00')
    })

    test('should detect conflicts when events overlap', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Drag cocktail hour to overlap with ceremony
      await helper.dragEventToTime('event-cocktails', '14:30')
      
      // Should show conflict warning
      await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-message"]'))
        .toContainText('Time overlap detected')
    })

    test('should auto-resolve simple conflicts', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Create conflict and trigger auto-resolution
      await helper.dragEventToTime('event-cocktails', '14:30')
      await page.click('[data-testid="auto-resolve-button"]')
      
      // Should resolve conflict automatically
      await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-warning"]')).not.toBeVisible()
    })

    test('should provide snap-to-grid functionality', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Enable snap-to-grid
      await page.check('[data-testid="snap-to-grid-toggle"]')
      
      // Drag event to approximate position
      const eventElement = await helper.getEventElement('event-ceremony')
      const targetArea = page.locator('[data-time-area="14:15-14:30"]')
      
      await eventElement.dragTo(targetArea)
      
      // Should snap to nearest 15-minute interval
      await expect(page.locator('[data-event-id="event-ceremony"] [data-testid="event-time"]'))
        .toContainText('14:15')
    })

    test('should handle mobile touch interactions', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-only test')
      
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Test touch drag
      const eventElement = await helper.getEventElement('event-ceremony')
      const targetSlot = page.locator('[data-time="15:00"]')
      
      // Simulate touch drag
      await eventElement.dispatchEvent('touchstart', { 
        touches: [{ clientX: 100, clientY: 200 }] 
      })
      await page.mouse.move(300, 400)
      await targetSlot.dispatchEvent('touchend')
      
      // Should update position
      await expect(page.locator('[data-event-id="event-ceremony"] [data-testid="event-time"]'))
        .toContainText('15:00')
    })
  })

  // =====================================================
  // REAL-TIME COLLABORATION TESTS
  // =====================================================

  test.describe('Real-time Collaboration', () => {
    test('should show other users cursors', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.enableCollaboration()

      // Simulate another user joining
      await helper.simulateSecondUser('John Doe')
      
      // Should show cursor
      await expect(page.locator('[data-testid="user-cursor"]')).toBeVisible()
      await expect(page.locator('[data-testid="cursor-label"]'))
        .toContainText('John Doe')
    })

    test('should show live editing indicators', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.enableCollaboration()

      // Simulate user editing an event
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('simulate-user-editing', {
          detail: {
            user_id: 'test-user-2',
            user_name: 'Jane Smith',
            selected_event_id: 'event-ceremony',
            is_editing: true
          }
        }))
      })

      // Should show editing indicator
      await expect(page.locator('[data-testid="editing-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="editing-user-name"]'))
        .toContainText('Jane Smith')
    })

    test('should sync changes in real-time', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.enableCollaboration()

      // Simulate remote change
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('simulate-remote-change', {
          detail: {
            type: 'event_update',
            event_id: 'event-ceremony',
            changes: {
              title: 'Updated Ceremony Title',
              start_time: '13:30'
            }
          }
        }))
      })

      // Should reflect changes immediately
      await expect(page.locator('[data-event-id="event-ceremony"] [data-testid="event-title"]'))
        .toContainText('Updated Ceremony Title')
    })

    test('should handle conflict resolution collaboratively', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.enableCollaboration()

      // Create conflict
      await helper.dragEventToTime('event-cocktails', '14:30')
      
      // Simulate another user resolving the conflict
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('simulate-conflict-resolution', {
          detail: {
            conflict_id: 'test-conflict-1',
            resolution: 'move_event',
            resolved_by: 'other-user'
          }
        }))
      })

      // Should show resolution notification
      await expect(page.locator('[data-testid="conflict-resolved-by-other"]')).toBeVisible()
    })
  })

  // =====================================================
  // EXPORT FUNCTIONALITY TESTS
  // =====================================================

  test.describe('Export Functionality', () => {
    test('should export timeline as PDF', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.openExportDialog()

      // Select PDF format
      await helper.selectExportFormat('pdf')
      
      // Configure options
      await page.check('[data-testid="include-vendor-details"]')
      await page.selectOption('[data-testid="page-orientation"]', 'landscape')
      
      // Start export
      const downloadPromise = page.waitForEvent('download')
      await helper.startExport()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    })

    test('should show export progress', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.openExportDialog()

      await helper.selectExportFormat('pdf')
      await helper.startExport()
      
      // Should show progress indicators
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-message"]')).toBeVisible()
    })

    test('should export to multiple formats', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      const formats = ['pdf', 'csv', 'excel', 'ical']
      
      for (const format of formats) {
        await helper.openExportDialog()
        await helper.selectExportFormat(format)
        
        const downloadPromise = page.waitForEvent('download')
        await helper.startExport()
        
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(new RegExp(`\\.(${format === 'excel' ? 'xlsx' : format === 'ical' ? 'ics' : format})$`))
        
        // Close dialog for next iteration
        await page.click('[data-testid="close-export-dialog"]')
      }
    })

    test('should handle export errors gracefully', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      
      // Mock export failure
      await page.route('**/api/export/**', async route => {
        await route.fulfill({ status: 500, body: 'Export failed' })
      })

      await helper.openExportDialog()
      await helper.selectExportFormat('pdf')
      await helper.startExport()
      
      // Should show error message
      await expect(page.locator('[data-testid="export-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('Export failed')
    })
  })

  // =====================================================
  // TEMPLATE LIBRARY TESTS
  // =====================================================

  test.describe('Template Library', () => {
    test('should open template library', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      
      await helper.openTemplateLibrary()
      
      // Should show template options
      await expect(page.locator('[data-testid="template-traditional"]')).toBeVisible()
      await expect(page.locator('[data-testid="template-modern"]')).toBeVisible()
      await expect(page.locator('[data-testid="template-destination"]')).toBeVisible()
    })

    test('should apply template to timeline', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.openTemplateLibrary()
      
      // Select and apply traditional template
      await helper.selectTemplate('traditional')
      
      // Should populate timeline with template events
      await expect(page.locator('[data-event-type="preparation"]')).toBeVisible()
      await expect(page.locator('[data-event-type="ceremony"]')).toBeVisible()
      await expect(page.locator('[data-event-type="reception"]')).toBeVisible()
    })

    test('should preview template before applying', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()
      await helper.openTemplateLibrary()
      
      // Hover over template to show preview
      await page.hover('[data-testid="template-modern"]')
      
      // Should show preview
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible()
      await expect(page.locator('[data-testid="preview-events"]')).toBeVisible()
    })
  })

  // =====================================================
  // CONFLICT DETECTION TESTS
  // =====================================================

  test.describe('Conflict Detection', () => {
    test('should detect vendor double-booking', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Assign same vendor to overlapping events
      await page.click('[data-event-id="event-ceremony"] [data-testid="assign-vendor"]')
      await page.selectOption('[data-testid="vendor-select"]', 'vendor-photographer')
      
      await page.click('[data-event-id="event-cocktails"] [data-testid="assign-vendor"]')
      await page.selectOption('[data-testid="vendor-select"]', 'vendor-photographer')
      
      // Create time overlap
      await helper.dragEventToTime('event-cocktails', '14:30')
      
      await helper.openConflictDetector()
      
      // Should detect vendor conflict
      await expect(page.locator('[data-testid="vendor-conflict"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-vendor-name"]'))
        .toContainText('Jane Doe Photography')
    })

    test('should suggest conflict resolutions', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Create overlapping events
      await helper.dragEventToTime('event-cocktails', '14:30')
      await helper.openConflictDetector()
      
      // Should show resolution suggestions
      await expect(page.locator('[data-testid="resolution-suggestions"]')).toBeVisible()
      await expect(page.locator('[data-testid="suggestion-move-event"]')).toBeVisible()
      await expect(page.locator('[data-testid="suggestion-adjust-duration"]')).toBeVisible()
    })

    test('should auto-fix simple conflicts', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Create minor overlap
      await helper.dragEventToTime('event-cocktails', '14:45')
      await helper.openConflictDetector()
      
      // Apply auto-fix
      await page.click('[data-testid="auto-fix-conflicts"]')
      
      // Should resolve automatically
      await expect(page.locator('[data-testid="conflicts-resolved"]')).toBeVisible()
      await expect(page.locator('[data-testid="no-conflicts-message"]')).toBeVisible()
    })
  })

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================

  test.describe('Performance', () => {
    test('should handle large number of events smoothly', async ({ page }) => {
      // Create timeline with many events
      const manyEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        start_time: `${String(9 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
        end_time: `${String(9 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15 + 30).padStart(2, '0')}`,
        event_type: 'other'
      }))

      await page.route(`**/api/timelines/${fixture.timelineId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...fixture,
            events: manyEvents
          })
        })
      })

      await helper.navigateToTimeline(fixture)
      
      // Measure load time
      const startTime = Date.now()
      await helper.waitForTimelineLoad()
      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000) // 3 seconds
      
      // Should show all events
      const eventCount = await page.locator('[data-testid="timeline-event"]').count()
      expect(eventCount).toBe(100)
    })

    test('should maintain smooth drag performance', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Measure drag performance
      const startTime = Date.now()
      await helper.dragEventToTime('event-ceremony', '13:00')
      const dragTime = Date.now() - startTime
      
      // Should complete drag within reasonable time
      expect(dragTime).toBeLessThan(500) // 500ms
    })
  })

  // =====================================================
  // ACCESSIBILITY TESTS
  // =====================================================

  test.describe('Accessibility', () => {
    test('should be navigable with keyboard', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Tab to first event
      await page.keyboard.press('Tab')
      const firstEvent = page.locator('[data-testid="timeline-event"]:first-child')
      await expect(firstEvent).toBeFocused()

      // Arrow keys should navigate between events
      await page.keyboard.press('ArrowRight')
      const secondEvent = page.locator('[data-testid="timeline-event"]:nth-child(2)')
      await expect(secondEvent).toBeFocused()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Check ARIA labels
      const timelineContainer = page.locator('[data-testid="timeline-container"]')
      await expect(timelineContainer).toHaveAttribute('role', 'application')
      await expect(timelineContainer).toHaveAttribute('aria-label', /timeline/i)

      const events = page.locator('[data-testid="timeline-event"]')
      await expect(events.first()).toHaveAttribute('role', 'button')
      await expect(events.first()).toHaveAttribute('tabindex', '0')
    })

    test('should support screen reader announcements', async ({ page }) => {
      await helper.navigateToTimeline(fixture)
      await helper.waitForTimelineLoad()

      // Move an event and check for announcements
      await helper.dragEventToTime('event-ceremony', '13:00')
      
      // Should have live region for announcements
      const liveRegion = page.locator('[aria-live="polite"]')
      await expect(liveRegion).toBeVisible()
      await expect(liveRegion).toContainText(/moved to 13:00/i)
    })
  })
})