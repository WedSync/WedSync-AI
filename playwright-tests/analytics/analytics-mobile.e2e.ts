import { test, expect, Page, BrowserContext, devices } from '@playwright/test'

/**
 * WS-246: Vendor Performance Analytics System - Mobile E2E Testing
 * Mobile analytics experience testing across different devices and orientations
 */

// Device configurations for testing
const mobileDevices = [
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 13', device: devices['iPhone 13'] },
  { name: 'iPad', device: devices['iPad Pro'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] }
]

test.describe('Mobile Analytics Experience', () => {
  mobileDevices.forEach(({ name, device }) => {
    test.describe(`${name} Device Tests`, () => {
      let context: BrowserContext
      let page: Page

      test.beforeAll(async ({ browser }) => {
        context = await browser.newContext({
          ...device,
          recordVideo: { dir: `test-results/videos/mobile-${name.toLowerCase().replace(/\s+/g, '-')}` }
        })
      })

      test.beforeEach(async () => {
        page = await context.newPage()
        
        // Mock authentication for mobile
        await page.route('**/api/auth/**', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {
                id: 'mobile-test-user',
                email: 'mobile@photographer.com',
                role: 'supplier',
                tier: 'PROFESSIONAL'
              }
            })
          })
        })

        // Mock mobile-optimized analytics data
        await page.route('**/api/analytics/dashboard/mobile**', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockMobileDashboardData)
          })
        })

        await page.route('**/api/analytics/vendors**', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockMobileVendorsData)
          })
        })

        // Navigate to mobile analytics dashboard
        await page.goto('/analytics/dashboard?mobile=true')
        await page.waitForLoadState('networkidle')
      })

      test.afterEach(async () => {
        await page.close()
      })

      test.afterAll(async () => {
        await context.close()
      })

      test(`should display mobile-optimized dashboard on ${name}`, async () => {
        // Check mobile layout is applied
        await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()
        await expect(page.locator('[data-testid="desktop-only"]')).not.toBeVisible()

        // Verify mobile navigation
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()

        // Check key metrics are visible and readable
        await expect(page.locator('[data-testid="mobile-metrics"]')).toBeVisible()
        await expect(page.locator('[data-testid="mobile-metric-card"]')).toHaveCount(4)

        // Verify text is large enough for mobile (minimum 16px)
        const metricText = page.locator('[data-testid="metric-value"]').first()
        const fontSize = await metricText.evaluate(el => 
          window.getComputedStyle(el).fontSize
        )
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16)
      })

      test(`should have touch-friendly interface on ${name}`, async () => {
        // Check touch targets are at least 48px (accessibility standard)
        const touchTargets = page.locator('[data-testid="touch-target"]')
        const count = await touchTargets.count()

        for (let i = 0; i < count; i++) {
          const target = touchTargets.nth(i)
          const box = await target.boundingBox()
          
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(48)
            expect(box.height).toBeGreaterThanOrEqual(48)
          }
        }

        // Test tap interactions
        await page.tap('[data-testid="mobile-metric-card"]:first-child')
        await expect(page.locator('[data-testid="metric-detail-modal"]')).toBeVisible()

        // Close modal with tap
        await page.tap('[data-testid="close-modal"]')
        await expect(page.locator('[data-testid="metric-detail-modal"]')).not.toBeVisible()
      })

      test(`should handle swipe gestures on ${name}`, async () => {
        // Test horizontal swipe on chart carousel
        const chartContainer = page.locator('[data-testid="mobile-chart-carousel"]')
        await expect(chartContainer).toBeVisible()

        // Get initial chart
        const initialChart = await chartContainer.locator('[data-testid="active-chart"]').getAttribute('data-chart-type')

        // Perform swipe left gesture
        await chartContainer.hover()
        await page.mouse.down()
        await page.mouse.move(-100, 0) // Swipe left 100px
        await page.mouse.up()

        await page.waitForTimeout(500) // Wait for animation

        // Verify chart changed
        const newChart = await chartContainer.locator('[data-testid="active-chart"]').getAttribute('data-chart-type')
        expect(newChart).not.toBe(initialChart)

        // Test swipe indicators
        await expect(page.locator('[data-testid="swipe-indicator"]')).toBeVisible()
      })

      test(`should display charts optimally on ${name}`, async () => {
        // Check mobile charts are properly sized
        const mobileChart = page.locator('[data-testid="mobile-chart"]').first()
        await expect(mobileChart).toBeVisible()

        const chartBox = await mobileChart.boundingBox()
        const viewport = page.viewportSize()

        if (chartBox && viewport) {
          // Chart should not exceed viewport width
          expect(chartBox.width).toBeLessThanOrEqual(viewport.width)
          
          // Chart should be properly proportioned for mobile
          const aspectRatio = chartBox.width / chartBox.height
          expect(aspectRatio).toBeGreaterThan(0.5) // Not too tall
          expect(aspectRatio).toBeLessThan(2.5) // Not too wide
        }

        // Check chart labels are readable on mobile
        const chartLabels = page.locator('[data-testid="chart-label"]')
        const labelCount = await chartLabels.count()
        
        for (let i = 0; i < labelCount; i++) {
          const label = chartLabels.nth(i)
          const labelFontSize = await label.evaluate(el => 
            window.getComputedStyle(el).fontSize
          )
          expect(parseInt(labelFontSize)).toBeGreaterThanOrEqual(12)
        }
      })

      test(`should handle mobile navigation on ${name}`, async () => {
        // Test mobile menu toggle
        await page.tap('[data-testid="mobile-menu-toggle"]')
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

        // Test navigation items
        await page.tap('[data-testid="nav-vendors"]')
        await expect(page.url()).toContain('/analytics/vendors')

        // Test back button
        await page.tap('[data-testid="mobile-back-button"]')
        await expect(page.url()).toContain('/analytics/dashboard')

        // Test bottom navigation (if present)
        const bottomNav = page.locator('[data-testid="bottom-navigation"]')
        if (await bottomNav.isVisible()) {
          await page.tap('[data-testid="bottom-nav-analytics"]')
          await expect(page.locator('[data-testid="analytics-active"]')).toBeVisible()
        }
      })

      test(`should work offline on ${name}`, async () => {
        // Load page normally first
        await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()

        // Go offline
        await context.setOffline(true)

        // Refresh page
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Check offline indicator and cached data
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
        await expect(page.locator('[data-testid="cached-data-message"]')).toBeVisible()

        // Verify cached metrics are still displayed
        await expect(page.locator('[data-testid="mobile-metric-card"]')).toHaveCount.toBeGreaterThan(0)

        // Test offline functionality
        await page.tap('[data-testid="mobile-metric-card"]:first-child')
        await expect(page.locator('[data-testid="offline-feature-message"]')).toBeVisible()

        // Go back online
        await context.setOffline(false)
        await page.waitForTimeout(1000)

        // Check online indicator
        await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible()
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
      })

      test(`should optimize for battery usage on ${name}`, async () => {
        // Check for battery optimization features
        await expect(page.locator('[data-testid="power-save-mode"]')).toBeVisible()

        // Simulate low battery
        await page.evaluate(() => {
          // Mock battery API for testing
          (navigator as any).getBattery = () => Promise.resolve({
            level: 0.15, // 15% battery
            charging: false
          })
        })

        // Trigger battery check
        await page.dispatchEvent('[data-testid="mobile-dashboard"]', 'batterychange')
        await page.waitForTimeout(500)

        // Verify power saving mode is activated
        await expect(page.locator('[data-testid="low-battery-mode"]')).toBeVisible()
        await expect(page.locator('[data-testid="reduced-animations"]')).toHaveClass(/power-save/)

        // Check that auto-refresh is disabled in power save mode
        const refreshIndicator = page.locator('[data-testid="auto-refresh-disabled"]')
        await expect(refreshIndicator).toBeVisible()
      })

      test(`should handle orientation changes on ${name}`, async () => {
        // Only test orientation on devices that support it
        if (name.includes('iPhone') || name.includes('Samsung') || name.includes('Pixel')) {
          // Start in portrait
          await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible()

          // Rotate to landscape
          await page.setViewportSize({ width: 844, height: 390 }) // iPhone 13 landscape

          // Wait for layout adjustment
          await page.waitForTimeout(500)

          // Check landscape layout
          await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible()
          await expect(page.locator('[data-testid="horizontal-metrics"]')).toBeVisible()

          // Verify charts adapt to landscape
          const landscapeChart = page.locator('[data-testid="landscape-chart"]')
          await expect(landscapeChart).toBeVisible()

          // Rotate back to portrait
          await page.setViewportSize({ width: 390, height: 844 })
          await page.waitForTimeout(500)

          // Verify portrait layout restored
          await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible()
        }
      })

      test(`should handle slow connections on ${name}`, async () => {
        // Simulate slow 3G connection
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Add 1s delay
          await route.continue()
        })

        // Navigate to analytics page
        await page.goto('/analytics/dashboard?mobile=true')

        // Check loading states are shown
        await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible()
        await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible()

        // Wait for content to load
        await page.waitForLoadState('networkidle', { timeout: 10000 })

        // Verify content eventually loads
        await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()
        await expect(page.locator('[data-testid="mobile-loading"]')).not.toBeVisible()

        // Check that progressive loading worked
        await expect(page.locator('[data-testid="critical-metrics"]')).toBeVisible()
      })

      test(`should support accessibility features on ${name}`, async () => {
        // Check for mobile accessibility features
        await expect(page.locator('[data-testid="skip-to-content"]')).toBeVisible()

        // Test voice-over support (aria labels)
        const metricCard = page.locator('[data-testid="mobile-metric-card"]').first()
        const ariaLabel = await metricCard.getAttribute('aria-label')
        expect(ariaLabel).toBeTruthy()
        expect(ariaLabel).toContain('metric')

        // Test keyboard navigation (for external keyboards on mobile)
        await page.focus('[data-testid="mobile-metric-card"]:first-child')
        await page.keyboard.press('Enter')
        await expect(page.locator('[data-testid="metric-detail-modal"]')).toBeVisible()

        // Test screen reader announcements
        const liveRegion = page.locator('[aria-live="polite"]')
        await expect(liveRegion).toBeVisible()
      })

      test(`should handle mobile-specific gestures on ${name}`, async () => {
        // Test pinch to zoom on charts (if supported)
        const chartElement = page.locator('[data-testid="zoomable-chart"]')
        await expect(chartElement).toBeVisible()

        // Simulate pinch gesture
        await chartElement.hover()
        
        // Mock touch events for pinch
        await page.evaluate(() => {
          const chart = document.querySelector('[data-testid="zoomable-chart"]')
          if (chart) {
            const touchStart = new TouchEvent('touchstart', {
              touches: [
                new Touch({ identifier: 0, target: chart, clientX: 100, clientY: 100 }),
                new Touch({ identifier: 1, target: chart, clientX: 200, clientY: 200 })
              ]
            })
            chart.dispatchEvent(touchStart)

            setTimeout(() => {
              const touchMove = new TouchEvent('touchmove', {
                touches: [
                  new Touch({ identifier: 0, target: chart, clientX: 80, clientY: 80 }),
                  new Touch({ identifier: 1, target: chart, clientX: 220, clientY: 220 })
                ]
              })
              chart.dispatchEvent(touchMove)

              const touchEnd = new TouchEvent('touchend', { touches: [] })
              chart.dispatchEvent(touchEnd)
            }, 100)
          }
        })

        await page.waitForTimeout(500)

        // Check if zoom level changed
        const zoomLevel = await chartElement.evaluate(el => 
          el.getAttribute('data-zoom-level')
        )
        expect(zoomLevel).toBeTruthy()
      })
    })
  })

  test.describe('Cross-Device Consistency', () => {
    test('should maintain data consistency across mobile devices', async ({ browser }) => {
      const contexts = await Promise.all(
        mobileDevices.slice(0, 3).map(({ device }) => 
          browser.newContext({ ...device })
        )
      )

      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      )

      // Set up same mock data for all devices
      for (const page of pages) {
        await page.route('**/api/analytics/dashboard/mobile**', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockMobileDashboardData)
          })
        })

        await page.goto('/analytics/dashboard?mobile=true')
        await page.waitForLoadState('networkidle')
      }

      // Compare metric values across devices
      const metricValues = await Promise.all(
        pages.map(page => 
          page.locator('[data-testid="total-bookings"]').textContent()
        )
      )

      // All devices should show the same values
      expect(metricValues[0]).toBe(metricValues[1])
      expect(metricValues[1]).toBe(metricValues[2])

      // Cleanup
      await Promise.all(contexts.map(context => context.close()))
    })
  })
})

// Mock data optimized for mobile
const mockMobileDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6,
    last_updated: new Date().toISOString()
  },
  mobile_optimized: true,
  critical_metrics: [
    { key: 'bookings_today', value: 12, label: 'Today\'s Bookings', trend: '+2' },
    { key: 'revenue_week', value: 45000, label: 'This Week\'s Revenue', trend: '+15%' },
    { key: 'response_time', value: 1.8, label: 'Avg Response Time', trend: '-0.5h' },
    { key: 'satisfaction', value: 4.7, label: 'Customer Satisfaction', trend: '+0.1' }
  ],
  charts: [
    {
      type: 'bookings_trend',
      title: 'Bookings This Month',
      data: [
        { date: 'Week 1', value: 45 },
        { date: 'Week 2', value: 52 },
        { date: 'Week 3', value: 48 },
        { date: 'Week 4', value: 63 }
      ]
    },
    {
      type: 'revenue_breakdown',
      title: 'Revenue by Service',
      data: [
        { category: 'Photography', value: 156000 },
        { category: 'Videography', value: 89000 },
        { category: 'Albums', value: 34000 }
      ]
    }
  ],
  notifications: [
    {
      type: 'success',
      message: '3 new bookings this week',
      priority: 'high'
    },
    {
      type: 'info',
      message: 'Average response time improved',
      priority: 'medium'
    }
  ]
}

const mockMobileVendorsData = {
  vendors: [
    {
      id: 'vendor-mobile-1',
      name: 'Mobile Photography',
      type: 'photographer',
      overall_score: 92.5,
      total_bookings: 156,
      total_revenue: 234500,
      satisfaction_score: 4.8,
      mobile_optimized: true
    }
  ],
  pagination: {
    page: 1,
    limit: 10, // Smaller limit for mobile
    total: 245,
    pages: 25
  }
}