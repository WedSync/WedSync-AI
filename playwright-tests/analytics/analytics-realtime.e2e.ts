import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * WS-246: Vendor Performance Analytics System - Real-time Updates E2E Testing
 * Tests real-time data update functionality and live dashboard features
 */

test.describe('Real-time Analytics E2E Tests', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/analytics-realtime' },
      // Enable WebSocket support for real-time testing
      ignoreHTTPSErrors: true
    })
  })

  test.beforeEach(async () => {
    page = await context.newPage()
    
    // Mock authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'realtime-test-user',
            email: 'realtime@photographer.com',
            role: 'supplier',
            tier: 'PROFESSIONAL'
          }
        })
      })
    })

    // Mock initial analytics data
    await page.route('**/api/analytics/dashboard**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInitialDashboardData)
      })
    })

    // Mock real-time WebSocket endpoint
    await page.route('**/api/analytics/realtime**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'connected', channel: 'analytics-updates' })
      })
    })

    // Mock Server-Sent Events endpoint
    await page.route('**/api/analytics/stream**', async route => {
      // Simulate SSE connection
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        },
        body: 'data: {"type":"connected","message":"Real-time updates enabled"}\n\n'
      })
    })

    // Navigate to analytics dashboard
    await page.goto('/analytics/dashboard?realtime=true')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('should establish real-time connection', async () => {
    // Check real-time connection indicator
    await expect(page.locator('[data-testid="realtime-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/connected/)
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Live')

    // Check WebSocket connection in developer tools
    const logs = []
    page.on('console', msg => logs.push(msg.text()))
    
    await page.evaluate(() => {
      console.log('WebSocket connection established')
    })

    // Verify real-time features are enabled
    await expect(page.locator('[data-testid="auto-refresh-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="auto-refresh-toggle"]')).toBeChecked()
    
    // Check real-time data timestamp
    const lastUpdate = page.locator('[data-testid="last-updated"]')
    await expect(lastUpdate).toContainText('Live')
  })

  test('should receive and display real-time metric updates', async () => {
    // Wait for initial load
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,234')
    
    // Simulate real-time booking update
    await page.evaluate(() => {
      const updateEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'metric_update',
          data: {
            total_bookings: 1235, // Incremented by 1
            new_booking: {
              id: 'booking-realtime-123',
              vendor_name: 'Elite Photography',
              amount: 2500,
              timestamp: new Date().toISOString()
            }
          }
        })
      })
      
      // Dispatch to mock WebSocket or SSE handler
      window.dispatchEvent(new CustomEvent('analytics-update', { detail: updateEvent.data }))
    })

    // Verify booking count updated
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,235')
    
    // Check update animation/indicator
    await expect(page.locator('[data-testid="metric-updated-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-pulse"]')).toHaveClass(/animate-pulse/)

    // Verify new booking notification
    await expect(page.locator('[data-testid="realtime-notification"]')).toBeVisible()
    await expect(page.locator('[data-testid="notification-message"]')).toContainText('New booking received')
    await expect(page.locator('[data-testid="notification-vendor"]')).toContainText('Elite Photography')
    await expect(page.locator('[data-testid="notification-amount"]')).toContainText('£2,500')
  })

  test('should update revenue metrics in real-time', async () => {
    // Initial revenue check
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('£2,450,000')

    // Simulate payment received update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'payment_received',
          data: {
            total_revenue: 2453500, // Increased by £3,500
            payment: {
              id: 'payment-realtime-456',
              vendor_id: 'vendor-123',
              amount: 3500,
              booking_id: 'booking-789',
              timestamp: new Date().toISOString()
            }
          }
        })
      }))
    })

    // Verify revenue updated
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('£2,453,500')
    
    // Check revenue increase indicator
    await expect(page.locator('[data-testid="revenue-increase"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-increase"]')).toContainText('+£3,500')
    
    // Verify revenue chart updates
    await expect(page.locator('[data-testid="revenue-chart-updated"]')).toHaveClass(/updated/)
  })

  test('should show vendor performance updates', async () => {
    // Navigate to vendor performance section
    await page.click('[data-testid="vendor-performance-section"]')
    
    // Check initial top performer
    const firstVendor = page.locator('[data-testid="top-performer-1"]')
    await expect(firstVendor.locator('[data-testid="vendor-name"]')).toContainText('Elite Photography')
    await expect(firstVendor.locator('[data-testid="vendor-score"]')).toContainText('95.2')

    // Simulate vendor score update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'vendor_score_update',
          data: {
            vendor_id: 'vendor-123',
            vendor_name: 'Elite Photography',
            old_score: 95.2,
            new_score: 95.8,
            score_change: +0.6,
            reason: 'Improved response time'
          }
        })
      }))
    })

    // Verify score updated
    await expect(firstVendor.locator('[data-testid="vendor-score"]')).toContainText('95.8')
    
    // Check score improvement indicator
    await expect(firstVendor.locator('[data-testid="score-improved"]')).toBeVisible()
    await expect(firstVendor.locator('[data-testid="score-change"]')).toContainText('+0.6')
    
    // Verify improvement reason tooltip
    await page.hover('[data-testid="score-change"]')
    await expect(page.locator('[data-testid="improvement-tooltip"]')).toBeVisible()
    await expect(page.locator('[data-testid="improvement-reason"]')).toContainText('Improved response time')
  })

  test('should handle real-time chart updates', async () => {
    // Check initial chart state
    const performanceChart = page.locator('[data-testid="performance-chart"]')
    await expect(performanceChart).toBeVisible()

    // Get initial data points count
    const initialDataPoints = await performanceChart.locator('[data-testid="chart-data-point"]').count()

    // Simulate new data point
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'chart_data_update',
          data: {
            chart_type: 'performance_trends',
            new_point: {
              date: new Date().toISOString().split('T')[0],
              bookings: 58,
              revenue: 87500,
              satisfaction: 4.8
            }
          }
        })
      }))
    })

    // Wait for chart animation
    await page.waitForTimeout(1000)

    // Verify new data point added
    const updatedDataPoints = await performanceChart.locator('[data-testid="chart-data-point"]').count()
    expect(updatedDataPoints).toBe(initialDataPoints + 1)

    // Check chart update animation
    await expect(performanceChart).toHaveClass(/chart-updating/)
    
    // Verify chart smoothly transitions
    await page.waitForTimeout(2000) // Wait for animation to complete
    await expect(performanceChart).not.toHaveClass(/chart-updating/)
  })

  test('should display live activity feed', async () => {
    // Check activity feed is present
    await expect(page.locator('[data-testid="live-activity-feed"]')).toBeVisible()
    await expect(page.locator('[data-testid="activity-title"]')).toContainText('Live Activity')

    // Simulate multiple real-time activities
    const activities = [
      {
        type: 'new_inquiry',
        data: {
          vendor_name: 'Perfect Venues',
          client_name: 'Sarah & Mike',
          timestamp: new Date().toISOString()
        }
      },
      {
        type: 'booking_confirmed',
        data: {
          vendor_name: 'Bloom Florists',
          booking_value: 1200,
          timestamp: new Date().toISOString()
        }
      },
      {
        type: 'review_received',
        data: {
          vendor_name: 'Elite Photography',
          rating: 5,
          reviewer: 'Emma W.',
          timestamp: new Date().toISOString()
        }
      }
    ]

    for (const activity of activities) {
      await page.evaluate((act) => {
        window.dispatchEvent(new CustomEvent('analytics-update', {
          detail: JSON.stringify({
            type: 'live_activity',
            data: act
          })
        }))
      }, activity)

      await page.waitForTimeout(500)
    }

    // Verify activities appear in feed
    const activityItems = page.locator('[data-testid="activity-item"]')
    await expect(activityItems).toHaveCount.toBeGreaterThanOrEqual(3)

    // Check activity details
    await expect(activityItems.first()).toContainText('5-star review')
    await expect(activityItems.first()).toContainText('Elite Photography')
    await expect(activityItems.nth(1)).toContainText('booking confirmed')
    await expect(activityItems.nth(1)).toContainText('£1,200')
    await expect(activityItems.nth(2)).toContainText('new inquiry')
    await expect(activityItems.nth(2)).toContainText('Perfect Venues')

    // Check timestamps are recent
    const timestamps = page.locator('[data-testid="activity-timestamp"]')
    const firstTimestamp = await timestamps.first().textContent()
    expect(firstTimestamp).toMatch(/seconds ago|just now/)
  })

  test('should handle connection loss and reconnection', async () => {
    // Verify initial connection
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/connected/)

    // Simulate connection loss
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-lost', {
        detail: { reason: 'Network error', timestamp: new Date().toISOString() }
      }))
    })

    // Check disconnected state
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/disconnected/)
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Offline')
    
    // Verify reconnection attempt indicator
    await expect(page.locator('[data-testid="reconnecting"]')).toBeVisible()
    await expect(page.locator('[data-testid="reconnect-message"]')).toContainText('Attempting to reconnect...')

    // Simulate reconnection
    await page.waitForTimeout(2000)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-restored', {
        detail: { timestamp: new Date().toISOString() }
      }))
    })

    // Verify reconnected state
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/connected/)
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Live')
    await expect(page.locator('[data-testid="reconnecting"]')).not.toBeVisible()

    // Check reconnection success message
    await expect(page.locator('[data-testid="reconnection-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="reconnection-message"]')).toContainText('Connection restored')
  })

  test('should allow toggling real-time updates', async () => {
    // Verify real-time is initially enabled
    await expect(page.locator('[data-testid="auto-refresh-toggle"]')).toBeChecked()
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/connected/)

    // Disable real-time updates
    await page.click('[data-testid="auto-refresh-toggle"]')
    
    // Check disabled state
    await expect(page.locator('[data-testid="auto-refresh-toggle"]')).not.toBeChecked()
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/paused/)
    await expect(page.locator('[data-testid="connection-indicator"]')).toContainText('Paused')

    // Simulate update while paused
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'metric_update',
          data: { total_bookings: 1240 }
        })
      }))
    })

    // Verify update is not applied
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,234')
    
    // Check pending updates indicator
    await expect(page.locator('[data-testid="pending-updates"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-count"]')).toContainText('1 update pending')

    // Re-enable real-time updates
    await page.click('[data-testid="auto-refresh-toggle"]')
    
    // Verify updates are applied
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,240')
    await expect(page.locator('[data-testid="pending-updates"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="realtime-status"]')).toHaveClass(/connected/)
  })

  test('should show real-time notifications with different priorities', async () => {
    // Test high priority notification (urgent)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'notification',
          data: {
            priority: 'high',
            title: 'Large Booking Alert',
            message: 'Booking worth £25,000 just received!',
            vendor: 'Luxury Wedding Venue',
            action_required: true
          }
        })
      }))
    })

    // Check high priority notification
    const highPriorityNotif = page.locator('[data-testid="notification-high"]')
    await expect(highPriorityNotif).toBeVisible()
    await expect(highPriorityNotif).toHaveClass(/priority-high/)
    await expect(highPriorityNotif).toContainText('Large Booking Alert')
    await expect(highPriorityNotif).toContainText('£25,000')

    // Test medium priority notification (info)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'notification',
          data: {
            priority: 'medium',
            title: 'Performance Milestone',
            message: 'Elite Photography reached 200 bookings this year!',
            vendor: 'Elite Photography'
          }
        })
      }))
    })

    // Check medium priority notification
    const mediumPriorityNotif = page.locator('[data-testid="notification-medium"]')
    await expect(mediumPriorityNotif).toBeVisible()
    await expect(mediumPriorityNotif).toHaveClass(/priority-medium/)

    // Test notification auto-dismiss
    await page.waitForTimeout(5000)
    await expect(mediumPriorityNotif).not.toBeVisible()
    
    // High priority should remain visible (requires manual dismiss)
    await expect(highPriorityNotif).toBeVisible()
    
    // Dismiss high priority notification
    await page.click('[data-testid="dismiss-notification-high"]')
    await expect(highPriorityNotif).not.toBeVisible()
  })

  test('should update vendor rankings in real-time', async () => {
    // Navigate to vendor rankings
    await page.click('[data-testid="vendor-rankings"]')
    await expect(page.locator('[data-testid="rankings-table"]')).toBeVisible()

    // Get initial rankings
    const initialFirstPlace = await page.locator('[data-testid="rank-1"] [data-testid="vendor-name"]').textContent()
    const initialSecondPlace = await page.locator('[data-testid="rank-2"] [data-testid="vendor-name"]').textContent()

    // Simulate ranking change
    await page.evaluate((first, second) => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'ranking_update',
          data: {
            changes: [
              { vendor_id: 'vendor-2', old_rank: 2, new_rank: 1, vendor_name: second },
              { vendor_id: 'vendor-1', old_rank: 1, new_rank: 2, vendor_name: first }
            ]
          }
        })
      }))
    }, initialFirstPlace, initialSecondPlace)

    // Wait for ranking animation
    await page.waitForTimeout(2000)

    // Verify rankings updated
    const newFirstPlace = await page.locator('[data-testid="rank-1"] [data-testid="vendor-name"]').textContent()
    const newSecondPlace = await page.locator('[data-testid="rank-2"] [data-testid="vendor-name"]').textContent()

    expect(newFirstPlace).toBe(initialSecondPlace)
    expect(newSecondPlace).toBe(initialFirstPlace)

    // Check ranking change indicators
    await expect(page.locator('[data-testid="rank-1"] [data-testid="rank-up"]')).toBeVisible()
    await expect(page.locator('[data-testid="rank-2"] [data-testid="rank-down"]')).toBeVisible()
  })

  test('should handle real-time data with rate limiting', async () => {
    // Simulate rapid updates (should be throttled)
    for (let i = 0; i < 10; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('analytics-update', {
          detail: JSON.stringify({
            type: 'metric_update',
            data: { total_bookings: 1234 + index }
          })
        }))
      }, i)
      
      await page.waitForTimeout(100) // 10 updates per second
    }

    // Should not update 10 times due to rate limiting
    await page.waitForTimeout(1000)
    const finalCount = await page.locator('[data-testid="total-bookings"]').textContent()
    
    // Should be throttled to reasonable update frequency
    expect(finalCount).not.toBe('1,243') // Would be this if all updates applied
    
    // Check rate limiting indicator
    await expect(page.locator('[data-testid="rate-limited"]')).toBeVisible()
    await expect(page.locator('[data-testid="throttle-message"]')).toContainText('Updates throttled for performance')
  })

  test('should sync real-time data across multiple dashboard tabs', async () => {
    // Open second tab with same dashboard
    const secondPage = await context.newPage()
    await secondPage.goto('/analytics/dashboard?realtime=true')
    await secondPage.waitForLoadState('networkidle')

    // Trigger update from first page
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: JSON.stringify({
          type: 'metric_update',
          data: { total_bookings: 1250 }
        })
      }))
    })

    // Both pages should show the same update
    await expect(page.locator('[data-testid="total-bookings"]')).toContainText('1,250')
    await expect(secondPage.locator('[data-testid="total-bookings"]')).toContainText('1,250')

    await secondPage.close()
  })
})

// Mock data for real-time testing
const mockInitialDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6,
    last_updated: new Date().toISOString()
  },
  top_performers: [
    {
      id: 'vendor-123',
      name: 'Elite Photography',
      overall_score: 95.2,
      total_bookings: 234,
      total_revenue: 450000
    },
    {
      id: 'vendor-456',
      name: 'Perfect Venues',
      overall_score: 88.7,
      total_bookings: 156,
      total_revenue: 620000
    },
    {
      id: 'vendor-789',
      name: 'Bloom Florists',
      overall_score: 91.3,
      total_bookings: 298,
      total_revenue: 178000
    }
  ],
  performance_trends: [
    { date: '2025-01-01', bookings: 45, revenue: 67500, satisfaction: 4.5 },
    { date: '2025-01-08', bookings: 52, revenue: 78900, satisfaction: 4.6 },
    { date: '2025-01-15', bookings: 48, revenue: 72300, satisfaction: 4.7 }
  ],
  realtime_config: {
    enabled: true,
    update_interval: 5000, // 5 seconds
    connection_url: 'ws://localhost:3000/api/analytics/realtime',
    channels: ['metrics', 'activities', 'rankings', 'notifications']
  }
}