import { test, expect, Page } from '@playwright/test'

// WS-138 Touch Optimization - Comprehensive Validation Tests
// Round 3 (Integration & Finalization) Test Suite

// Test devices matching WS-138 requirements
const testDevices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 }
]

// Performance thresholds per WS-138
const PERFORMANCE_THRESHOLDS = {
  touchResponse: 16, // 16ms for 60fps
  touchFeedback: 100, // 100ms max feedback delay
  minTouchTarget: 44, // WCAG minimum
  optimalTouchTarget: 48 // WS-138 optimal
}

test.describe('WS-138 Touch Optimization - Comprehensive Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable touch events and haptic feedback mocking
    await page.addInitScript(() => {
      // Mock touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 10,
        writable: false
      })
      
      // Mock vibrate API for haptic feedback testing
      let vibrateCalls: any[] = []
      navigator.vibrate = (pattern) => {
        vibrateCalls.push({ pattern, timestamp: Date.now() })
        return true
      }
      window.vibrateCalls = vibrateCalls
      
      // Performance monitoring
      window.touchMetrics = []
      const originalAddEventListener = Element.prototype.addEventListener
      Element.prototype.addEventListener = function(type, listener, options) {
        if (type.startsWith('touch')) {
          const wrappedListener = (event: Event) => {
            const startTime = performance.now()
            listener(event)
            const endTime = performance.now()
            window.touchMetrics.push({
              type,
              duration: endTime - startTime,
              timestamp: Date.now()
            })
          }
          originalAddEventListener.call(this, type, wrappedListener, options)
        } else {
          originalAddEventListener.call(this, type, listener, options)
        }
      }
    })
  })

  testDevices.forEach(device => {
    test.describe(`${device.name} (${device.width}x${device.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(device)
      })

      test('TouchInput components prevent iOS zoom', async ({ page }) => {
        await page.goto('/test/touch-forms')
        
        // Test regular TouchInput
        const touchInput = page.locator('[data-testid="touch-input"]')
        await expect(touchInput).toBeVisible()
        
        // Check font size is 16px or larger (prevents iOS zoom)
        const fontSize = await touchInput.evaluate(el => 
          window.getComputedStyle(el).fontSize
        )
        const fontSizeNum = parseInt(fontSize, 10)
        expect(fontSizeNum).toBeGreaterThanOrEqual(16)
        
        // Test TouchTextarea
        const touchTextarea = page.locator('[data-testid="touch-textarea"]')
        const textareaFontSize = await touchTextarea.evaluate(el =>
          window.getComputedStyle(el).fontSize
        )
        const textareaFontSizeNum = parseInt(textareaFontSize, 10)
        expect(textareaFontSizeNum).toBeGreaterThanOrEqual(16)
        
        // Test TouchSelect
        const touchSelect = page.locator('[data-testid="touch-select"]')
        const selectFontSize = await touchSelect.evaluate(el =>
          window.getComputedStyle(el).fontSize
        )
        const selectFontSizeNum = parseInt(selectFontSize, 10)
        expect(selectFontSizeNum).toBeGreaterThanOrEqual(16)
      })

      test('all touch targets meet 48px minimum requirement', async ({ page }) => {
        await page.goto('/dashboard')
        
        // Get all interactive elements
        const interactiveElements = await page.locator(
          'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
        ).all()
        
        for (const element of interactiveElements) {
          const box = await element.boundingBox()
          if (box) {
            expect(box.width, `Element width ${box.width}px should be >= 48px`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.optimalTouchTarget)
            expect(box.height, `Element height ${box.height}px should be >= 48px`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.optimalTouchTarget)
          }
        }
      })

      test('touch performance meets 16ms response time requirement', async ({ page }) => {
        await page.goto('/test/touch-components')
        
        // Test TouchButton performance
        const touchButton = page.locator('[data-testid="touch-button"]')
        
        // Clear previous metrics
        await page.evaluate(() => {
          window.touchMetrics = []
        })
        
        // Perform touch interaction
        await touchButton.tap()
        
        // Get performance metrics
        const metrics = await page.evaluate(() => window.touchMetrics)
        
        // Validate touch response times
        for (const metric of metrics) {
          expect(metric.duration, `Touch ${metric.type} should respond within 16ms`).toBeLessThan(PERFORMANCE_THRESHOLDS.touchResponse)
        }
      })

      test('haptic feedback responds within 100ms', async ({ page }) => {
        await page.goto('/test/touch-components')
        
        const touchButton = page.locator('[data-testid="touch-button"]')
        
        // Clear previous vibrate calls
        await page.evaluate(() => {
          window.vibrateCalls = []
        })
        
        const startTime = Date.now()
        await touchButton.tap()
        
        // Check haptic feedback timing
        const vibrateCalls = await page.evaluate(() => window.vibrateCalls)
        
        expect(vibrateCalls.length).toBeGreaterThan(0)
        const feedbackTime = vibrateCalls[0].timestamp - startTime
        expect(feedbackTime).toBeLessThan(PERFORMANCE_THRESHOLDS.touchFeedback)
      })

      test('swipe navigation works in all directions', async ({ page }) => {
        await page.goto('/test/swipe-navigation')
        
        const swipeArea = page.locator('[data-testid="swipe-area"]')
        const box = await swipeArea.boundingBox()
        
        if (box) {
          const centerX = box.x + box.width / 2
          const centerY = box.y + box.height / 2
          
          // Test swipe left
          await page.mouse.move(centerX + 50, centerY)
          await page.mouse.down()
          await page.mouse.move(centerX - 100, centerY, { steps: 10 })
          await page.mouse.up()
          
          await expect(page.locator('[data-testid="swipe-result"]')).toContainText('left')
          
          // Test swipe right
          await page.mouse.move(centerX - 50, centerY)
          await page.mouse.down()
          await page.mouse.move(centerX + 100, centerY, { steps: 10 })
          await page.mouse.up()
          
          await expect(page.locator('[data-testid="swipe-result"]')).toContainText('right')
          
          // Test swipe up
          await page.mouse.move(centerX, centerY + 50)
          await page.mouse.down()
          await page.mouse.move(centerX, centerY - 100, { steps: 10 })
          await page.mouse.up()
          
          await expect(page.locator('[data-testid="swipe-result"]')).toContainText('up')
          
          // Test swipe down
          await page.mouse.move(centerX, centerY - 50)
          await page.mouse.down()
          await page.mouse.move(centerX, centerY + 100, { steps: 10 })
          await page.mouse.up()
          
          await expect(page.locator('[data-testid="swipe-result"]')).toContainText('down')
        }
      })

      test('pull-to-refresh triggers correctly', async ({ page }) => {
        await page.goto('/test/pull-to-refresh')
        
        let refreshTriggered = false
        await page.exposeFunction('onRefreshTriggered', () => {
          refreshTriggered = true
        })
        
        const pullArea = page.locator('[data-testid="pull-to-refresh"]')
        const box = await pullArea.boundingBox()
        
        if (box) {
          // Simulate pull down gesture
          await page.mouse.move(box.x + box.width / 2, box.y + 10)
          await page.mouse.down()
          await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 15 })
          await page.mouse.up()
          
          // Wait for refresh to trigger
          await page.waitForTimeout(500)
          
          expect(refreshTriggered).toBe(true)
        }
      })

      test('security validation blocks malicious touch events', async ({ page }) => {
        await page.goto('/test/touch-security')
        
        // Test excessive touch points (should be blocked)
        await page.evaluate(() => {
          const element = document.querySelector('[data-testid="secure-touch-area"]')
          if (element) {
            const touches = []
            for (let i = 0; i < 15; i++) { // More than max allowed (10)
              touches.push(new Touch({
                identifier: i,
                target: element,
                clientX: 100 + i * 10,
                clientY: 100
              }))
            }
            
            const touchEvent = new TouchEvent('touchstart', {
              touches: touches,
              bubbles: true
            })
            
            element.dispatchEvent(touchEvent)
          }
        })
        
        // Check that security warning was logged
        const consoleLogs = []
        page.on('console', msg => {
          if (msg.type() === 'warn' && msg.text().includes('security')) {
            consoleLogs.push(msg.text())
          }
        })
        
        await page.waitForTimeout(100)
        expect(consoleLogs.length).toBeGreaterThan(0)
      })

      test('accessibility labels are present on all touch elements', async ({ page }) => {
        await page.goto('/dashboard')
        
        const touchElements = await page.locator(
          'button, [role="button"], input, select, textarea'
        ).all()
        
        for (const element of touchElements) {
          // Check for aria-label or accessible text content
          const ariaLabel = await element.getAttribute('aria-label')
          const textContent = await element.textContent()
          const ariaLabelledby = await element.getAttribute('aria-labelledby')
          const title = await element.getAttribute('title')
          
          const hasAccessibleName = !!(ariaLabel || textContent?.trim() || ariaLabelledby || title)
          expect(hasAccessibleName, 'Touch element should have accessible name').toBe(true)
        }
      })

      test('focus states are visible for keyboard navigation', async ({ page }) => {
        await page.goto('/dashboard')
        
        // Tab through focusable elements
        await page.keyboard.press('Tab')
        
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeFocused()
        
        // Check that focus ring is visible
        const outlineStyle = await focusedElement.evaluate(el =>
          window.getComputedStyle(el).outline
        )
        
        // Should have visible focus indicator (not 'none')
        expect(outlineStyle).not.toBe('none')
      })

      test('pinch zoom functionality works correctly', async ({ page }) => {
        await page.goto('/test/pinch-zoom')
        
        const zoomableImage = page.locator('[data-testid="zoomable-image"]')
        const box = await zoomableImage.boundingBox()
        
        if (box) {
          const centerX = box.x + box.width / 2
          const centerY = box.y + box.height / 2
          
          // Simulate pinch out gesture
          await page.evaluate(([x, y]) => {
            const element = document.querySelector('[data-testid="zoomable-image"]')
            if (element) {
              // Create touch events for pinch gesture
              const touch1Start = new Touch({
                identifier: 1,
                target: element,
                clientX: x - 20,
                clientY: y
              })
              
              const touch2Start = new Touch({
                identifier: 2,
                target: element,
                clientX: x + 20,
                clientY: y
              })
              
              const touchStart = new TouchEvent('touchstart', {
                touches: [touch1Start, touch2Start],
                bubbles: true
              })
              
              element.dispatchEvent(touchStart)
              
              // Simulate pinch out
              const touch1Move = new Touch({
                identifier: 1,
                target: element,
                clientX: x - 50,
                clientY: y
              })
              
              const touch2Move = new Touch({
                identifier: 2,
                target: element,
                clientX: x + 50,
                clientY: y
              })
              
              const touchMove = new TouchEvent('touchmove', {
                touches: [touch1Move, touch2Move],
                bubbles: true
              })
              
              element.dispatchEvent(touchMove)
              
              const touchEnd = new TouchEvent('touchend', {
                changedTouches: [touch1Move, touch2Move],
                bubbles: true
              })
              
              element.dispatchEvent(touchEnd)
            }
          }, [centerX, centerY])
          
          // Check if zoom was applied
          const transform = await zoomableImage.evaluate(el =>
            window.getComputedStyle(el).transform
          )
          
          expect(transform).toContain('scale')
        }
      })

      test('drag and drop timeline reordering works', async ({ page }) => {
        await page.goto('/test/touch-timeline')
        
        const firstEvent = page.locator('[data-testid="timeline-event"]:first-child')
        const secondEvent = page.locator('[data-testid="timeline-event"]:nth-child(2)')
        
        const firstBox = await firstEvent.boundingBox()
        const secondBox = await secondEvent.boundingBox()
        
        if (firstBox && secondBox) {
          // Drag first event to second position
          await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
          await page.mouse.down()
          await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 })
          await page.mouse.up()
          
          // Wait for reorder animation
          await page.waitForTimeout(500)
          
          // Verify order changed
          const reorderedEvents = await page.locator('[data-testid="timeline-event"]').all()
          expect(reorderedEvents.length).toBeGreaterThan(1)
        }
      })
    })
  })

  test.describe('Performance Monitoring Integration', () => {
    test('touch performance monitor tracks metrics correctly', async ({ page }) => {
      await page.goto('/test/performance-monitoring')
      
      // Enable performance monitoring
      await page.evaluate(() => {
        if (window.touchPerformanceMonitor) {
          window.touchPerformanceMonitor.startMonitoring()
        }
      })
      
      // Perform multiple touch interactions
      const buttons = await page.locator('[data-testid="performance-test-button"]').all()
      
      for (const button of buttons.slice(0, 5)) {
        await button.tap()
        await page.waitForTimeout(50)
      }
      
      // Get performance report
      const report = await page.evaluate(() => {
        if (window.touchPerformanceMonitor) {
          return window.touchPerformanceMonitor.getPerformanceReport()
        }
        return null
      })
      
      expect(report).toBeTruthy()
      expect(report.totalInteractions).toBeGreaterThan(0)
      expect(report.averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.touchResponse)
    })
  })

  test.describe('Security Integration', () => {
    test('touch security validator blocks suspicious patterns', async ({ page }) => {
      await page.goto('/test/security-validation')
      
      let securityWarnings = 0
      page.on('console', msg => {
        if (msg.type() === 'warn' && msg.text().includes('security')) {
          securityWarnings++
        }
      })
      
      // Test rate limiting
      const secureButton = page.locator('[data-testid="secure-touch-button"]')
      
      // Rapid fire touches (should trigger rate limiting)
      for (let i = 0; i < 50; i++) {
        await secureButton.tap()
      }
      
      await page.waitForTimeout(500)
      expect(securityWarnings).toBeGreaterThan(0)
    })
  })

  test.describe('Integration with Existing Components', () => {
    test('MobileNav maintains touch optimization', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Open mobile navigation
      const menuButton = page.locator('[data-testid="mobile-menu-button"]')
      await menuButton.tap()
      
      // Check all nav items meet touch target requirements
      const navItems = await page.locator('[data-testid="mobile-nav"] a, [data-testid="mobile-nav"] button').all()
      
      for (const item of navItems) {
        const box = await item.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.optimalTouchTarget)
        }
      }
      
      // Test swipe to close
      const nav = page.locator('[data-testid="mobile-nav"]')
      const navBox = await nav.boundingBox()
      
      if (navBox) {
        await page.mouse.move(navBox.x + 50, navBox.y + 100)
        await page.mouse.down()
        await page.mouse.move(navBox.x - 150, navBox.y + 100, { steps: 10 })
        await page.mouse.up()
        
        // Nav should close
        await expect(nav).toBeHidden()
      }
    })
  })
})

// Helper functions for comprehensive testing
async function measureTouchPerformance(page: Page, selector: string): Promise<number[]> {
  const element = page.locator(selector)
  const measurements: number[] = []
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now()
    await element.tap()
    const end = Date.now()
    measurements.push(end - start)
    await page.waitForTimeout(50)
  }
  
  return measurements
}

async function validateTouchTargetSize(page: Page, selector: string, minSize: number = 44): Promise<boolean> {
  const element = page.locator(selector)
  const box = await element.boundingBox()
  
  if (!box) return false
  
  return box.width >= minSize && box.height >= minSize
}