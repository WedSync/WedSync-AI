/**
 * Photo Groups Scheduling E2E Tests - Team A Round 2 WS-153
 * Advanced Playwright tests for scheduling scenarios and conflict resolution
 */

import { test, expect, type Page } from '@playwright/test'

test.describe('Photo Groups Scheduling - Advanced Scenarios', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext()
    page = await context.newPage()
    
    // Mock authentication
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-1', email: 'test@example.com' }
        })
      })
    })

    // Mock API responses
    await page.route('**/api/photo-groups/**', (route) => {
      const url = route.request().url()
      
      if (url.includes('/conflicts/detect')) {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              conflicts: [
                {
                  groupId: 'group-1',
                  conflictingGroupId: 'group-2',
                  reason: 'time_overlap',
                  severity: 'error',
                  message: 'Time conflict between Family Photos and Bridal Party'
                }
              ],
              summary: {
                total: 1,
                by_severity: { error: 1 },
                by_type: { time_overlap: 1 }
              },
              analyzed_groups: 2,
              detection_timestamp: new Date().toISOString()
            })
          })
        } else if (route.request().method() === 'PUT') {
          // Conflict resolution
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Conflict resolved successfully',
              conflict_id: 'conflict-1',
              resolution_strategy: 'reschedule_second',
              resolution_result: {},
              resolved_at: new Date().toISOString()
            })
          })
        }
      } else if (url.includes('/schedule/optimize')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            optimized_groups: [
              {
                id: 'group-1',
                recommended_timeline_slot: '2024-01-15T15:00:00Z',
                recommended_location: 'Garden Area',
                estimated_improvement: 15,
                reasoning: 'Reduces conflicts and optimizes travel time'
              }
            ],
            summary: {
              total_groups: 2,
              conflicts_resolved: 1,
              time_saved_minutes: 15,
              optimization_score: 85
            },
            implementation_plan: [
              {
                step: 1,
                action: 'Reschedule Family Photos to 3:00 PM',
                groups: ['group-1'],
                estimated_time: 5
              }
            ]
          })
        })
      }
    })

    // Navigate to photo groups page
    await page.goto('/dashboard/clients/test-couple-1/photo-groups')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Basic Scheduling Interface', () => {
    test('displays photo group scheduler with time slots', async () => {
      await expect(page.locator('[data-testid="photo-group-scheduler"]')).toBeVisible()
      await expect(page.getByText('Schedule: Family Photos')).toBeVisible()
      await expect(page.getByText('Duration: 30 minutes')).toBeVisible()
    })

    test('shows available time slots in timeline view', async () => {
      await expect(page.getByText('2:00 PM - 2:30 PM')).toBeVisible()
      await expect(page.getByText('2:30 PM - 3:00 PM')).toBeVisible()
      await expect(page.getByText('30 minutes')).toBeVisible()
    })

    test('allows switching between timeline and calendar view', async () => {
      await page.click('button:has-text("Calendar View")')
      await expect(page.getByText('Calendar view coming soon')).toBeVisible()
      await expect(page.getByText('Timeline View')).toBeVisible()

      await page.click('button:has-text("Timeline View")')
      await expect(page.getByText('2:00 PM - 2:30 PM')).toBeVisible()
    })
  })

  test.describe('Time Slot Selection', () => {
    test('selects available time slot and shows confirmation', async () => {
      // Click on an available time slot
      await page.click('button:has-text("2:00 PM - 2:30 PM")')
      
      // Should show selection in footer
      await expect(page.getByText('Selected: 2:00 PM - 2:30 PM')).toBeVisible()
      await expect(page.getByText('Confirm Schedule')).toBeVisible()
    })

    test('prevents selection of unavailable time slots', async () => {
      const unavailableSlot = page.locator('button:has-text("3:00 PM - 3:30 PM")')
      await expect(unavailableSlot).toBeDisabled()
    })

    test('clears selection when clear button is clicked', async () => {
      await page.click('button:has-text("2:00 PM - 2:30 PM")')
      await expect(page.getByText('Selected: 2:00 PM - 2:30 PM')).toBeVisible()

      await page.click('button:has-text("Clear")')
      await expect(page.getByText('Selected: 2:00 PM - 2:30 PM')).not.toBeVisible()
    })
  })

  test.describe('Conflict Detection and Resolution', () => {
    test('displays conflict detection panel with detected conflicts', async () => {
      await expect(page.locator('[data-testid="conflict-detection-panel"]')).toBeVisible()
      await expect(page.getByText('Conflict Detection')).toBeVisible()
      await expect(page.getByText('1 conflict detected')).toBeVisible()
      
      await expect(page.getByText('Time conflict between Family Photos and Bridal Party')).toBeVisible()
    })

    test('shows conflict resolution suggestions', async () => {
      await expect(page.getByText('Suggested Resolutions')).toBeVisible()
      await expect(page.getByText('Reschedule Second Group')).toBeVisible()
      await expect(page.getByText('85% confidence')).toBeVisible()
      await expect(page.getByText('15min saved')).toBeVisible()
    })

    test('resolves conflicts when Apply button is clicked', async () => {
      await page.click('button:has-text("Apply"):first')
      
      // Should show loading state
      await expect(page.getByText('Applying...')).toBeVisible({ timeout: 1000 })
      
      // Should refresh conflicts after resolution
      await expect(page.getByText('Applying...')).not.toBeVisible({ timeout: 5000 })
    })

    test('expands conflict details when expand button is clicked', async () => {
      await page.click('[data-testid="expand-conflict-button"]:first')
      
      await expect(page.getByText('Affected Groups')).toBeVisible()
      await expect(page.getByText('Family Photos')).toBeVisible()
      await expect(page.getByText('Bridal Party')).toBeVisible()
    })
  })

  test.describe('Preview Mode', () => {
    test('toggles preview mode and shows preview buttons', async () => {
      await page.click('button:has-text("Preview Mode")')
      await expect(page.getByText('Hide Preview')).toBeVisible()
      
      // Should show preview buttons for resolutions
      await expect(page.getByText('Preview')).toBeVisible()
    })

    test('previews resolution when preview button is clicked', async () => {
      await page.click('button:has-text("Preview Mode")')
      await page.click('button:has-text("Preview"):first')
      
      // Should call preview callback (mocked behavior would be tested in unit tests)
      await expect(page.locator('.preview-overlay')).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Real-time Collaboration', () => {
    test('shows real-time updates when other users make changes', async () => {
      // Simulate real-time update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('supabase-realtime', {
          detail: {
            type: 'photo_group_change',
            event: 'UPDATE',
            data: {
              id: 'group-1',
              timeline_slot: '2024-01-15T15:00:00Z'
            }
          }
        }))
      })

      // Should show notification or update UI
      await expect(page.getByText('Schedule updated by another user')).toBeVisible({ timeout: 3000 })
    })

    test('broadcasts updates when local changes are made', async () => {
      let broadcastReceived = false
      
      page.on('websocket', ws => {
        ws.on('framesent', event => {
          const data = JSON.parse(event.payload.toString())
          if (data.event === 'schedule_updated') {
            broadcastReceived = true
          }
        })
      })

      await page.click('button:has-text("2:00 PM - 2:30 PM")')
      await page.click('button:has-text("Confirm Schedule")')
      
      // Verify broadcast was sent
      expect(broadcastReceived).toBeTruthy()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('adapts layout for mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Should stack elements vertically on mobile
      await expect(page.locator('[data-testid="photo-group-scheduler"]')).toBeVisible()
      
      const scheduler = page.locator('[data-testid="photo-group-scheduler"]')
      const box = await scheduler.boundingBox()
      expect(box?.width).toBeLessThan(400)
    })

    test('provides touch-friendly interaction targets', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const timeSlotButtons = page.locator('button:has-text("PM")')
      const firstButton = timeSlotButtons.first()
      const box = await firstButton.boundingBox()
      
      // Touch targets should be at least 44px
      expect(box?.height).toBeGreaterThanOrEqual(44)
    })
  })

  test.describe('Accessibility', () => {
    test('provides proper ARIA labels and roles', async () => {
      await expect(page.locator('[role="region"][aria-label*="Photo Group Scheduler"]')).toBeVisible()
      await expect(page.locator('[role="button"][aria-label*="Select time slot"]')).toHaveCount({ min: 1 })
    })

    test('supports keyboard navigation', async () => {
      // Tab to first time slot
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should focus on first available time slot
      await expect(page.locator('button:has-text("2:00 PM - 2:30 PM")')).toBeFocused()
      
      // Enter should select
      await page.keyboard.press('Enter')
      await expect(page.getByText('Selected: 2:00 PM - 2:30 PM')).toBeVisible()
    })

    test('announces changes to screen readers', async () => {
      await page.click('button:has-text("2:00 PM - 2:30 PM")')
      
      // Should have live region updates
      await expect(page.locator('[aria-live="polite"]')).toContainText('Time slot selected')
    })
  })

  test.describe('Error Handling', () => {
    test('handles scheduling API errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/photo-groups/schedule', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Scheduling service unavailable'
          })
        })
      })

      await page.click('button:has-text("2:00 PM - 2:30 PM")')
      await page.click('button:has-text("Confirm Schedule")')
      
      await expect(page.getByText('Failed to schedule photo group')).toBeVisible()
      await expect(page.getByText('Please try again')).toBeVisible()
    })

    test('handles conflict resolution errors gracefully', async () => {
      // Mock API error for conflict resolution
      await page.route('**/api/photo-groups/conflicts/detect', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid resolution strategy'
            })
          })
        }
      })

      await page.click('button:has-text("Apply"):first')
      
      await expect(page.getByText('Failed to resolve conflict')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('loads quickly with large numbers of time slots', async () => {
      // Mock large dataset
      const manyTimeSlots = Array.from({ length: 100 }, (_, i) => ({
        id: `slot-${i}`,
        start_time: new Date(2024, 0, 15, 10 + Math.floor(i / 2), (i % 2) * 30).toISOString(),
        end_time: new Date(2024, 0, 15, 10 + Math.floor(i / 2), (i % 2) * 30 + 30).toISOString(),
        duration_minutes: 30,
        is_available: true,
        conflicts: []
      }))

      await page.route('**/api/photo-groups/time-slots', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(manyTimeSlots)
        })
      })

      const startTime = Date.now()
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
    })

    test('handles frequent real-time updates without performance degradation', async () => {
      // Send many real-time updates
      for (let i = 0; i < 10; i++) {
        await page.evaluate((index) => {
          window.dispatchEvent(new CustomEvent('supabase-realtime', {
            detail: {
              type: 'conflict_change',
              event: 'UPDATE',
              data: { id: `conflict-${index}` }
            }
          }))
        }, i)
        await page.waitForTimeout(100)
      }

      // UI should remain responsive
      await page.click('button:has-text("Refresh")')
      await expect(page.locator('[data-testid="conflict-detection-panel"]')).toBeVisible()
    })
  })

  test.describe('Complex Scheduling Scenarios', () => {
    test('handles multiple overlapping conflicts', async () => {
      // Mock complex conflict scenario
      await page.route('**/api/photo-groups/conflicts/detect', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conflicts: [
              {
                groupId: 'group-1',
                conflictingGroupId: 'group-2',
                reason: 'time_overlap',
                severity: 'error',
                message: 'Time conflict between Family Photos and Bridal Party'
              },
              {
                groupId: 'group-1',
                conflictingGroupId: 'group-3',
                reason: 'location_conflict',
                severity: 'warning',
                message: 'Location conflict with Ceremony photos'
              },
              {
                groupId: 'group-2',
                conflictingGroupId: 'group-3',
                reason: 'guest_overlap',
                severity: 'warning',
                message: 'Guest overlap between groups'
              }
            ],
            summary: {
              total: 3,
              by_severity: { error: 1, warning: 2 },
              by_type: { time_overlap: 1, location_conflict: 1, guest_overlap: 1 }
            }
          })
        })
      })

      await expect(page.getByText('3 conflicts detected')).toBeVisible()
      await expect(page.getByText('Time conflict between Family Photos and Bridal Party')).toBeVisible()
      await expect(page.getByText('Location conflict with Ceremony photos')).toBeVisible()
      await expect(page.getByText('Guest overlap between groups')).toBeVisible()
    })

    test('optimizes schedule with bulk resolution', async () => {
      await page.click('button:has-text("Optimize Schedule")')
      
      await expect(page.getByText('Optimization Complete')).toBeVisible()
      await expect(page.getByText('1 conflicts resolved')).toBeVisible()
      await expect(page.getByText('15 minutes saved')).toBeVisible()
      await expect(page.getByText('85% optimization score')).toBeVisible()
    })

    test('handles photographer availability constraints', async () => {
      // Mock photographer unavailability
      await page.route('**/api/photo-groups/photographer/availability', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            unavailable_slots: ['2024-01-15T15:00:00Z'],
            reason: 'Photographer break scheduled'
          })
        })
      })

      await page.click('button:has-text("3:00 PM - 3:30 PM")')
      
      await expect(page.getByText('Primary photographer is not available during this time')).toBeVisible()
      await expect(page.getByText('Consider backup photographer or different time slot')).toBeVisible()
    })
  })

  test.afterEach(async () => {
    await page.close()
  })
})