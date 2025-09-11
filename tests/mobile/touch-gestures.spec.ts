import { test, expect, Page } from '@playwright/test'

// Mobile viewport configuration
const mobileViewport = { width: 375, height: 667 }
const tabletViewport = { width: 768, height: 1024 }

test.describe('Mobile Touch Optimization Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(mobileViewport)
    
    // Enable touch events
    await page.addInitScript(() => {
      // Mock touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        writable: false
      })
    })
  })

  test.describe('Touch Target Sizes', () => {
    test('all interactive elements meet minimum 44px touch target', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check all buttons
      const buttons = await page.locator('button, a, input, select, textarea').all()
      
      for (const element of buttons) {
        const box = await element.boundingBox()
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('touch buttons have proper sizing', async ({ page }) => {
      await page.goto('/test/touch-components')
      
      const touchButton = page.locator('[data-testid="touch-button"]')
      const box = await touchButton.boundingBox()
      
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    })
  })

  test.describe('Swipe Navigation', () => {
    test('swipe left navigates to next page', async ({ page }) => {
      await page.goto('/clients')
      
      // Simulate swipe left
      await page.locator('body').evaluate((el) => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [new Touch({
            identifier: 1,
            target: el,
            clientX: 300,
            clientY: 400
          })]
        })
        
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [new Touch({
            identifier: 1,
            target: el,
            clientX: 50,
            clientY: 400
          })]
        })
        
        el.dispatchEvent(touchStart)
        el.dispatchEvent(touchEnd)
      })
      
      // Check navigation occurred
      await expect(page).toHaveURL(/\/clients\/\d+/)
    })

    test('swipe right navigates to previous page', async ({ page }) => {
      await page.goto('/clients/2')
      
      // Simulate swipe right
      await page.locator('body').evaluate((el) => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [new Touch({
            identifier: 1,
            target: el,
            clientX: 50,
            clientY: 400
          })]
        })
        
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [new Touch({
            identifier: 1,
            target: el,
            clientX: 300,
            clientY: 400
          })]
        })
        
        el.dispatchEvent(touchStart)
        el.dispatchEvent(touchEnd)
      })
      
      // Check navigation occurred
      await expect(page).toHaveURL('/clients/1')
    })
  })

  test.describe('Pinch to Zoom', () => {
    test('pinch gesture zooms images', async ({ page }) => {
      await page.goto('/gallery')
      
      const image = page.locator('[data-testid="zoomable-image"]')
      
      // Simulate pinch zoom
      await image.evaluate((el) => {
        const touch1Start = new Touch({
          identifier: 1,
          target: el,
          clientX: 150,
          clientY: 300
        })
        
        const touch2Start = new Touch({
          identifier: 2,
          target: el,
          clientX: 200,
          clientY: 300
        })
        
        const touchStart = new TouchEvent('touchstart', {
          touches: [touch1Start, touch2Start]
        })
        
        el.dispatchEvent(touchStart)
        
        // Simulate pinch out (zoom in)
        const touch1End = new Touch({
          identifier: 1,
          target: el,
          clientX: 100,
          clientY: 300
        })
        
        const touch2End = new Touch({
          identifier: 2,
          target: el,
          clientX: 250,
          clientY: 300
        })
        
        const touchMove = new TouchEvent('touchmove', {
          touches: [touch1End, touch2End]
        })
        
        el.dispatchEvent(touchMove)
      })
      
      // Check if image is zoomed
      const transform = await image.evaluate(el => 
        window.getComputedStyle(el).transform
      )
      
      expect(transform).toContain('scale')
    })

    test('double tap toggles zoom', async ({ page }) => {
      await page.goto('/gallery')
      
      const image = page.locator('[data-testid="zoomable-image"]')
      
      // Double tap
      await image.tap()
      await page.waitForTimeout(100)
      await image.tap()
      
      // Check zoom state
      const transform = await image.evaluate(el => 
        window.getComputedStyle(el).transform
      )
      
      expect(transform).toContain('scale(2)')
    })
  })

  test.describe('Pull to Refresh', () => {
    test('pull down gesture triggers refresh', async ({ page }) => {
      await page.goto('/dashboard')
      
      let refreshTriggered = false
      
      // Listen for refresh event
      await page.exposeFunction('onRefresh', () => {
        refreshTriggered = true
      })
      
      // Simulate pull to refresh
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="pull-to-refresh"]')
        if (!container) return
        
        const touchStart = new TouchEvent('touchstart', {
          touches: [new Touch({
            identifier: 1,
            target: container,
            clientX: 187,
            clientY: 100
          })]
        })
        
        const touchMove = new TouchEvent('touchmove', {
          touches: [new Touch({
            identifier: 1,
            target: container,
            clientX: 187,
            clientY: 200
          })]
        })
        
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [new Touch({
            identifier: 1,
            target: container,
            clientX: 187,
            clientY: 200
          })]
        })
        
        container.dispatchEvent(touchStart)
        container.dispatchEvent(touchMove)
        container.dispatchEvent(touchEnd)
      })
      
      await page.waitForTimeout(500)
      expect(refreshTriggered).toBe(true)
    })
  })

  test.describe('Drag and Drop Timeline', () => {
    test('timeline events can be dragged and reordered', async ({ page }) => {
      await page.goto('/timeline')
      
      const firstEvent = page.locator('[data-testid="timeline-event-1"]')
      const secondEvent = page.locator('[data-testid="timeline-event-2"]')
      
      const firstBox = await firstEvent.boundingBox()
      const secondBox = await secondEvent.boundingBox()
      
      if (firstBox && secondBox) {
        // Drag first event to second position
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height + 10)
        await page.mouse.up()
        
        // Check if order changed
        const newFirstEvent = page.locator('[data-testid="timeline-event-2"]')
        const newFirstBox = await newFirstEvent.boundingBox()
        
        expect(newFirstBox?.y).toBeLessThan(firstBox.y)
      }
    })

    test('long press enables edit mode', async ({ page }) => {
      await page.goto('/timeline')
      
      const event = page.locator('[data-testid="timeline-event-1"]')
      
      // Long press
      await event.tap({ delay: 600 })
      
      // Check if edit mode is active
      const editMenu = page.locator('[data-testid="edit-menu"]')
      await expect(editMenu).toBeVisible()
    })
  })

  test.describe('Haptic Feedback', () => {
    test('vibration API is called on interactions', async ({ page }) => {
      let vibrateCalled = false
      
      // Mock vibrate API
      await page.addInitScript(() => {
        navigator.vibrate = () => {
          window.vibrateCalled = true
          return true
        }
      })
      
      await page.goto('/dashboard')
      
      // Trigger haptic feedback
      const button = page.locator('[data-testid="touch-button"]')
      await button.tap()
      
      vibrateCalled = await page.evaluate(() => window.vibrateCalled)
      expect(vibrateCalled).toBe(true)
    })
  })

  test.describe('Responsive Behavior', () => {
    test('components adapt to mobile viewport', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check mobile-specific elements are visible
      const mobileNav = page.locator('[data-testid="mobile-nav"]')
      await expect(mobileNav).toBeVisible()
      
      // Check desktop elements are hidden
      const desktopNav = page.locator('[data-testid="desktop-nav"]')
      await expect(desktopNav).toBeHidden()
    })

    test('components adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize(tabletViewport)
      await page.goto('/dashboard')
      
      // Check tablet layout
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('touch interactions respond within 50ms', async ({ page }) => {
      await page.goto('/timeline')
      
      const startTime = Date.now()
      
      // Perform touch interaction
      const button = page.locator('[data-testid="touch-button"]')
      await button.tap()
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(responseTime).toBeLessThan(50)
    })

    test('smooth scrolling performance', async ({ page }) => {
      await page.goto('/clients')
      
      // Measure FPS during scroll
      const fps = await page.evaluate(async () => {
        let frames = 0
        const startTime = performance.now()
        
        const countFrame = () => {
          frames++
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame)
          }
        }
        
        requestAnimationFrame(countFrame)
        
        // Simulate scroll
        window.scrollTo({ top: 1000, behavior: 'smooth' })
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return frames
      })
      
      // Should maintain at least 30 FPS
      expect(fps).toBeGreaterThan(30)
    })
  })

  test.describe('Accessibility', () => {
    test('touch targets have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard')
      
      const buttons = await page.locator('button').all()
      
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        
        expect(ariaLabel || text).toBeTruthy()
      }
    })

    test('focus visible on keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Tab through elements
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tagName: el?.tagName,
          hasFocusVisible: window.getComputedStyle(el!).outlineStyle !== 'none'
        }
      })
      
      expect(focusedElement.hasFocusVisible).toBe(true)
    })
  })
})

// Gesture simulation helpers
async function simulateSwipe(
  page: Page,
  direction: 'left' | 'right' | 'up' | 'down',
  element?: string
) {
  const selector = element || 'body'
  const target = page.locator(selector)
  
  const box = await target.boundingBox()
  if (!box) return
  
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  
  const swipeDistance = 100
  
  let endX = centerX
  let endY = centerY
  
  switch (direction) {
    case 'left':
      endX = centerX - swipeDistance
      break
    case 'right':
      endX = centerX + swipeDistance
      break
    case 'up':
      endY = centerY - swipeDistance
      break
    case 'down':
      endY = centerY + swipeDistance
      break
  }
  
  await page.mouse.move(centerX, centerY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 10 })
  await page.mouse.up()
}

async function simulatePinch(
  page: Page,
  element: string,
  scale: number
) {
  await page.locator(element).evaluate((el, scale) => {
    // Simulate pinch gesture
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const distance = 50
    const newDistance = distance * scale
    
    // Create touch events
    const touch1 = new Touch({
      identifier: 1,
      target: el,
      clientX: centerX - distance,
      clientY: centerY
    })
    
    const touch2 = new Touch({
      identifier: 2,
      target: el,
      clientX: centerX + distance,
      clientY: centerY
    })
    
    const touchStart = new TouchEvent('touchstart', {
      touches: [touch1, touch2]
    })
    
    el.dispatchEvent(touchStart)
    
    // Move touches
    const touch1Move = new Touch({
      identifier: 1,
      target: el,
      clientX: centerX - newDistance,
      clientY: centerY
    })
    
    const touch2Move = new Touch({
      identifier: 2,
      target: el,
      clientX: centerX + newDistance,
      clientY: centerY
    })
    
    const touchMove = new TouchEvent('touchmove', {
      touches: [touch1Move, touch2Move]
    })
    
    el.dispatchEvent(touchMove)
    
    // End touches
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [touch1Move, touch2Move]
    })
    
    el.dispatchEvent(touchEnd)
  }, scale)
}