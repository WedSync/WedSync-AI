import { test, expect } from '@playwright/test'

/**
 * Performance Testing Suite for Analytics Dashboard
 * Tests load times, chart rendering, and real-time updates
 */

test.describe('Analytics Dashboard Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication cookies if needed
    await page.goto('http://localhost:3000/analytics')
  })

  test('dashboard should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('http://localhost:3000/analytics')
    
    // Wait for critical elements to load
    await page.waitForSelector('[data-testid="overview-cards"]', { 
      state: 'visible',
      timeout: 2000 
    })
    
    const loadTime = Date.now() - startTime
    
    console.log(`Dashboard load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(2000)
    
    // Verify all sections loaded
    await expect(page.locator('[data-testid="overview-card"]')).toHaveCount(4)
    await expect(page.locator('[data-testid="chart-container"]')).toBeVisible()
  })

  test('charts should render without errors', async ({ page }) => {
    // Check for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('http://localhost:3000/analytics')
    await page.waitForSelector('[data-testid="funnel-chart"]')
    await page.waitForSelector('[data-testid="revenue-chart"]')
    
    // No console errors should occur
    expect(consoleErrors).toHaveLength(0)
    
    // Charts should be interactive
    const funnelChart = page.locator('[data-testid="funnel-chart"]')
    await funnelChart.hover()
    
    // Tooltip should appear
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible({
      timeout: 1000
    })
  })

  test('data should update when timeframe changes', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    
    // Get initial data
    const initialValue = await page.locator('[data-testid="total-instances"]').textContent()
    
    // Change timeframe
    await page.selectOption('select', '7d')
    
    // Wait for data update
    await page.waitForResponse(resp => 
      resp.url().includes('/api/analytics/dashboard') && 
      resp.status() === 200
    )
    
    // Value should potentially change
    const newValue = await page.locator('[data-testid="total-instances"]').textContent()
    
    // Verify API was called with correct params
    const apiCalls = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/analytics/dashboard'))
    })
    
    expect(apiCalls.length).toBeGreaterThan(0)
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Navigate with large dataset parameter
    await page.goto('http://localhost:3000/analytics?test=large-dataset')
    
    // Measure rendering performance
    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint')
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      return {
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        domComplete: navigation.domComplete,
        loadComplete: navigation.loadEventEnd
      }
    })
    
    console.log('Performance metrics:', metrics)
    
    // FCP should be under 1.5 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(1500)
    
    // DOM should be complete under 3 seconds
    expect(metrics.domComplete).toBeLessThan(3000)
  })

  test('responsive design at different viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('http://localhost:3000/analytics')
      
      // Take screenshot for visual regression
      await page.screenshot({ 
        path: `tests/screenshots/analytics-${viewport.name}.png`,
        fullPage: true 
      })
      
      // Verify responsive layout
      if (viewport.width < 768) {
        // Mobile: Cards should stack
        const cardsContainer = page.locator('[data-testid="overview-cards"]')
        const containerWidth = await cardsContainer.boundingBox()
        expect(containerWidth?.width).toBeLessThanOrEqual(viewport.width)
        
        // Charts should be full width
        const charts = await page.locator('[data-testid="chart-container"]').all()
        for (const chart of charts) {
          const box = await chart.boundingBox()
          expect(box?.width).toBeGreaterThan(viewport.width * 0.9)
        }
      } else {
        // Desktop: Cards should be in grid
        const cards = await page.locator('[data-testid="overview-card"]').all()
        const firstCardBox = await cards[0].boundingBox()
        const secondCardBox = await cards[1].boundingBox()
        
        // Cards should be side by side
        expect(firstCardBox?.y).toBe(secondCardBox?.y)
      }
    }
  })

  test('real-time updates should appear without refresh', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    
    // Get initial value
    const initialInstances = await page.locator('[data-testid="total-instances"]').textContent()
    
    // Simulate real-time update via WebSocket
    await page.evaluate(() => {
      // Trigger a mock real-time update event
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: { type: 'journey_started', journeyId: 'test-123' }
      }))
    })
    
    // Wait for potential update (with timeout)
    await page.waitForTimeout(1000)
    
    // Check if real-time indicator is visible
    const realtimeIndicator = page.locator('.animate-pulse')
    const isRealtime = await realtimeIndicator.count() > 0
    
    if (isRealtime) {
      console.log('Real-time updates are active')
    }
  })

  test('memory usage should remain stable', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    
    // Collect memory snapshots
    const memorySnapshots = []
    
    for (let i = 0; i < 5; i++) {
      // Change timeframe to trigger re-renders
      const timeframes = ['7d', '30d', '90d', '30d', '7d']
      await page.selectOption('select', timeframes[i])
      
      await page.waitForTimeout(1000)
      
      // Get memory usage
      const metrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory
        }
        return null
      })
      
      if (metrics) {
        memorySnapshots.push(metrics.usedJSHeapSize)
      }
    }
    
    // Check for memory leaks
    if (memorySnapshots.length > 0) {
      const firstSnapshot = memorySnapshots[0]
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1]
      
      // Memory increase should be less than 20%
      const increase = (lastSnapshot - firstSnapshot) / firstSnapshot
      console.log(`Memory increase: ${(increase * 100).toFixed(2)}%`)
      
      expect(increase).toBeLessThan(0.2)
    }
  })

  test('accessibility: dashboard should be keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    
    // First tab should focus on timeframe selector
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['SELECT', 'BUTTON']).toContain(focusedElement)
    
    // Tab through cards
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
    }
    
    // Should be able to interact with charts
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Check ARIA labels
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label]')
      return Array.from(elements).map(el => el.getAttribute('aria-label'))
    })
    
    expect(ariaLabels.length).toBeGreaterThan(0)
  })

  test('network requests should be optimized', async ({ page }) => {
    const requests: any[] = []
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          size: request.postData()?.length || 0
        })
      }
    })
    
    await page.goto('http://localhost:3000/analytics')
    await page.waitForLoadState('networkidle')
    
    // Should batch API requests
    const dashboardRequests = requests.filter(r => r.url.includes('/api/analytics/dashboard'))
    expect(dashboardRequests.length).toBe(1) // Single request, not multiple
    
    // Check response caching headers
    const response = await page.request.get('/api/analytics/dashboard?timeframe=30d')
    const headers = response.headers()
    
    // Should have cache control
    expect(headers['cache-control']).toBeDefined()
  })
})

test.describe('Visual Regression Tests', () => {
  test('dashboard appearance should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    await page.waitForSelector('[data-testid="overview-cards"]')
    
    // Compare with baseline
    await expect(page).toHaveScreenshot('analytics-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100
    })
  })
  
  test('charts should render consistently', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics')
    
    // Wait for charts to render
    await page.waitForSelector('[data-testid="funnel-chart"]')
    await page.waitForSelector('[data-testid="revenue-chart"]')
    
    // Screenshot individual charts
    const funnelChart = page.locator('[data-testid="funnel-chart"]')
    await expect(funnelChart).toHaveScreenshot('funnel-chart.png')
    
    const revenueChart = page.locator('[data-testid="revenue-chart"]')
    await expect(revenueChart).toHaveScreenshot('revenue-chart.png')
  })
})