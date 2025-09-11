import { test, expect, devices } from '@playwright/test'

const TOUCH_DEVICES = [
  { name: 'iPhone 14 Pro', device: devices['iPhone 14 Pro'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
  { name: 'Galaxy S22', device: devices['Galaxy S22'] },
  { name: 'Pixel Tablet', device: devices['Pixel Tablet'] }
]

test.describe('WS-189 Gesture Recognition Testing Suite', () => {
  
  test.describe('Multi-Touch Gesture Testing', () => {
    
    TOUCH_DEVICES.forEach(({ name, device }) => {
      test(`${name} - Complex multi-touch interactions`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        })
        const page = await context.newPage()
        
        await page.goto('/wedding/photo-gallery')
        
        // Test pinch-to-zoom gesture on photo gallery
        const photoGallery = page.locator('[data-testid="photo-gallery"]')
        await expect(photoGallery).toBeVisible()
        
        // Simulate pinch-to-zoom
        await page.touchscreen.tap(400, 400)
        await page.evaluate(() => {
          const gallery = document.querySelector('[data-testid="photo-gallery"]') as HTMLElement
          if (gallery) {
            // Mock pinch gesture with touch events
            const touchStart = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: 350, clientY: 400 } as Touch,
                { identifier: 1, clientX: 450, clientY: 400 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            const touchMove = new TouchEvent('touchmove', {
              touches: [
                { identifier: 0, clientX: 300, clientY: 400 } as Touch,
                { identifier: 1, clientX: 500, clientY: 400 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            gallery.dispatchEvent(touchStart)
            gallery.dispatchEvent(touchMove)
          }
        })
        
        // Verify zoom functionality
        const zoomLevel = await page.evaluate(() => {
          const gallery = document.querySelector('[data-testid="photo-gallery"]') as HTMLElement
          return gallery ? window.getComputedStyle(gallery).transform : 'none'
        })
        
        // Should have transform applied (zoom effect)
        expect(zoomLevel).not.toBe('none')
        
        await context.close()
      })
      
      test(`${name} - Two-finger swipe navigation`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        })
        const page = await context.newPage()
        
        await page.goto('/wedding/timeline')
        
        // Test two-finger swipe for timeline navigation
        const timeline = page.locator('[data-testid="timeline-container"]')
        await expect(timeline).toBeVisible()
        
        // Get initial timeline position
        const initialPosition = await page.evaluate(() => {
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          return container ? container.scrollLeft : 0
        })
        
        // Perform two-finger swipe
        await page.evaluate(() => {
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          if (container) {
            const swipeStart = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: 500, clientY: 300 } as Touch,
                { identifier: 1, clientX: 520, clientY: 320 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            const swipeMove = new TouchEvent('touchmove', {
              touches: [
                { identifier: 0, clientX: 300, clientY: 300 } as Touch,
                { identifier: 1, clientX: 320, clientY: 320 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            const swipeEnd = new TouchEvent('touchend', {
              changedTouches: [
                { identifier: 0, clientX: 300, clientY: 300 } as Touch,
                { identifier: 1, clientX: 320, clientY: 320 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            container.dispatchEvent(swipeStart)
            container.dispatchEvent(swipeMove)
            container.dispatchEvent(swipeEnd)
          }
        })
        
        // Wait for animation
        await page.waitForTimeout(300)
        
        // Verify timeline moved
        const finalPosition = await page.evaluate(() => {
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          return container ? container.scrollLeft : 0
        })
        
        expect(finalPosition).not.toBe(initialPosition)
        
        await context.close()
      })
      
      test(`${name} - Three-finger gesture for context menu`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        })
        const page = await context.newPage()
        
        await page.goto('/wedding/vendor-management')
        
        const vendorCard = page.locator('[data-testid="vendor-card"]').first()
        await expect(vendorCard).toBeVisible()
        
        // Perform three-finger tap for context menu
        await page.evaluate(() => {
          const card = document.querySelector('[data-testid="vendor-card"]') as HTMLElement
          if (card) {
            const threeTouchTap = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: 300, clientY: 200 } as Touch,
                { identifier: 1, clientX: 320, clientY: 210 } as Touch,
                { identifier: 2, clientX: 340, clientY: 220 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            card.dispatchEvent(threeTouchTap)
            
            // Immediately end the touch
            const touchEnd = new TouchEvent('touchend', {
              changedTouches: [
                { identifier: 0, clientX: 300, clientY: 200 } as Touch,
                { identifier: 1, clientX: 320, clientY: 210 } as Touch,
                { identifier: 2, clientX: 340, clientY: 220 } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            card.dispatchEvent(touchEnd)
          }
        })
        
        // Context menu should appear
        const contextMenu = page.locator('[data-testid="context-menu"]')
        await expect(contextMenu).toBeVisible({ timeout: 1000 })
        
        await context.close()
      })
    })
  })

  test.describe('Swipe Gesture Accuracy Testing', () => {
    
    test('Timeline swipe navigation with directional recognition', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
      await page.goto('/wedding/timeline')
      
      const timeline = page.locator('[data-testid="timeline-view"]')
      await expect(timeline).toBeVisible()
      
      // Test horizontal swipe (left to right)
      const timelineBox = await timeline.boundingBox()
      expect(timelineBox).not.toBeNull()
      
      if (timelineBox) {
        const centerX = timelineBox.x + timelineBox.width / 2
        const centerY = timelineBox.y + timelineBox.height / 2
        
        // Swipe right to left (go to next day)
        await page.touchscreen.tap(centerX + 100, centerY)
        await page.mouse.move(centerX - 100, centerY, { steps: 10 })
        
        // Verify navigation occurred
        const currentView = await page.textContent('[data-testid="timeline-date"]')
        expect(currentView).toBeTruthy()
        
        // Swipe left to right (go to previous day)
        await page.touchscreen.tap(centerX - 100, centerY)
        await page.mouse.move(centerX + 100, centerY, { steps: 10 })
        
        // Should return to original or show previous
        const newView = await page.textContent('[data-testid="timeline-date"]')
        expect(newView).toBeTruthy()
        expect(newView).not.toBe(currentView)
      }
    })
    
    test('Photo gallery swipe with threshold validation', async ({ page }) => {
      await page.goto('/wedding/photo-gallery')
      
      const photoViewer = page.locator('[data-testid="photo-viewer"]')
      await expect(photoViewer).toBeVisible()
      
      // Get current photo index
      const initialPhoto = await page.getAttribute('[data-testid="current-photo"]', 'data-photo-index')
      
      const viewerBox = await photoViewer.boundingBox()
      expect(viewerBox).not.toBeNull()
      
      if (viewerBox) {
        const centerX = viewerBox.x + viewerBox.width / 2
        const centerY = viewerBox.y + viewerBox.height / 2
        
        // Short swipe (should not trigger navigation)
        await page.touchscreen.tap(centerX, centerY)
        await page.mouse.move(centerX - 20, centerY, { steps: 3 })
        
        await page.waitForTimeout(300)
        const afterShortSwipe = await page.getAttribute('[data-testid="current-photo"]', 'data-photo-index')
        expect(afterShortSwipe).toBe(initialPhoto) // Should not change
        
        // Long swipe (should trigger navigation)
        await page.touchscreen.tap(centerX, centerY)
        await page.mouse.move(centerX - 150, centerY, { steps: 10 })
        
        await page.waitForTimeout(300)
        const afterLongSwipe = await page.getAttribute('[data-testid="current-photo"]', 'data-photo-index')
        expect(afterLongSwipe).not.toBe(initialPhoto) // Should change
      }
    })
    
    test('Vendor list vertical swipe with momentum', async ({ page }) => {
      await page.goto('/wedding/vendor-directory')
      
      const vendorList = page.locator('[data-testid="vendor-list"]')
      await expect(vendorList).toBeVisible()
      
      // Get initial scroll position
      const initialScroll = await page.evaluate(() => {
        const list = document.querySelector('[data-testid="vendor-list"]') as HTMLElement
        return list ? list.scrollTop : 0
      })
      
      // Perform vertical swipe with momentum
      const listBox = await vendorList.boundingBox()
      expect(listBox).not.toBeNull()
      
      if (listBox) {
        const centerX = listBox.x + listBox.width / 2
        const topY = listBox.y + 50
        const bottomY = listBox.y + listBox.height - 50
        
        // Fast swipe upward
        await page.touchscreen.tap(centerX, bottomY)
        await page.mouse.move(centerX, topY, { steps: 5 }) // Fast movement
        
        // Wait for momentum scrolling
        await page.waitForTimeout(1000)
        
        const finalScroll = await page.evaluate(() => {
          const list = document.querySelector('[data-testid="vendor-list"]') as HTMLElement
          return list ? list.scrollTop : 0
        })
        
        // Should have scrolled more than just the swipe distance due to momentum
        expect(finalScroll).toBeGreaterThan(initialScroll + 100)
      }
    })
  })

  test.describe('Pinch-to-Zoom Testing', () => {
    
    test('Smooth scaling and momentum physics validation', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // Tablet size
      await page.goto('/wedding/floor-plan')
      
      const floorPlan = page.locator('[data-testid="floor-plan-viewer"]')
      await expect(floorPlan).toBeVisible()
      
      // Get initial zoom level
      const initialZoom = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="floor-plan-viewer"]') as HTMLElement
        const transform = viewer ? window.getComputedStyle(viewer).transform : 'none'
        if (transform === 'none') return 1
        const matrix = transform.match(/matrix.*\((.+)\)/)
        return matrix ? parseFloat(matrix[1].split(', ')[0]) : 1
      })
      
      const planBox = await floorPlan.boundingBox()
      expect(planBox).not.toBeNull()
      
      if (planBox) {
        const centerX = planBox.x + planBox.width / 2
        const centerY = planBox.y + planBox.height / 2
        
        // Simulate pinch-to-zoom (expand)
        await page.evaluate((coords) => {
          const viewer = document.querySelector('[data-testid="floor-plan-viewer"]') as HTMLElement
          if (viewer) {
            // Start with fingers close together
            const startTouch = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: coords.x - 25, clientY: coords.y } as Touch,
                { identifier: 1, clientX: coords.x + 25, clientY: coords.y } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            viewer.dispatchEvent(startTouch)
            
            // Move fingers apart (zoom in)
            setTimeout(() => {
              const moveTouch = new TouchEvent('touchmove', {
                touches: [
                  { identifier: 0, clientX: coords.x - 75, clientY: coords.y } as Touch,
                  { identifier: 1, clientX: coords.x + 75, clientY: coords.y } as Touch
                ] as TouchList
              } as TouchEventInit)
              
              viewer.dispatchEvent(moveTouch)
              
              // End touch
              setTimeout(() => {
                const endTouch = new TouchEvent('touchend', {
                  changedTouches: [
                    { identifier: 0, clientX: coords.x - 75, clientY: coords.y } as Touch,
                    { identifier: 1, clientX: coords.x + 75, clientY: coords.y } as Touch
                  ] as TouchList
                } as TouchEventInit)
                
                viewer.dispatchEvent(endTouch)
              }, 100)
            }, 100)
          }
        }, { x: centerX, y: centerY })
        
        // Wait for zoom animation
        await page.waitForTimeout(500)
        
        // Verify zoom level increased
        const finalZoom = await page.evaluate(() => {
          const viewer = document.querySelector('[data-testid="floor-plan-viewer"]') as HTMLElement
          const transform = viewer ? window.getComputedStyle(viewer).transform : 'none'
          if (transform === 'none') return 1
          const matrix = transform.match(/matrix.*\((.+)\)/)
          return matrix ? parseFloat(matrix[1].split(', ')[0]) : 1
        })
        
        expect(finalZoom).toBeGreaterThan(initialZoom)
        
        // Test zoom limits
        expect(finalZoom).toBeLessThanOrEqual(3.0) // Maximum zoom limit
        expect(finalZoom).toBeGreaterThanOrEqual(0.5) // Minimum zoom limit
      }
    })
    
    test('Budget chart zoom with data point precision', async ({ page }) => {
      await page.goto('/wedding/budget-analytics')
      
      const budgetChart = page.locator('[data-testid="budget-chart"]')
      await expect(budgetChart).toBeVisible()
      
      // Test precision zooming on specific data points
      const dataPoint = page.locator('[data-testid="budget-data-point"]').first()
      await expect(dataPoint).toBeVisible()
      
      const pointBox = await dataPoint.boundingBox()
      expect(pointBox).not.toBeNull()
      
      if (pointBox) {
        const pointX = pointBox.x + pointBox.width / 2
        const pointY = pointBox.y + pointBox.height / 2
        
        // Precise zoom on data point
        await page.evaluate((coords) => {
          const chart = document.querySelector('[data-testid="budget-chart"]') as HTMLElement
          if (chart) {
            // Small pinch gesture for precision
            const touchStart = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: coords.x - 10, clientY: coords.y } as Touch,
                { identifier: 1, clientX: coords.x + 10, clientY: coords.y } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            const touchMove = new TouchEvent('touchmove', {
              touches: [
                { identifier: 0, clientX: coords.x - 30, clientY: coords.y } as Touch,
                { identifier: 1, clientX: coords.x + 30, clientY: coords.y } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            chart.dispatchEvent(touchStart)
            chart.dispatchEvent(touchMove)
          }
        }, { x: pointX, y: pointY })
        
        await page.waitForTimeout(300)
        
        // Verify data point becomes more detailed when zoomed
        const detailLevel = await page.evaluate(() => {
          const point = document.querySelector('[data-testid="budget-data-point"]') as HTMLElement
          return point ? point.getAttribute('data-detail-level') : 'basic'
        })
        
        expect(detailLevel).toBe('detailed')
      }
    })
  })

  test.describe('Long-Press Recognition Testing', () => {
    
    test('Context menu activation with timing accuracy', async ({ page }) => {
      await page.goto('/wedding/guest-list')
      
      const guestItem = page.locator('[data-testid="guest-item"]').first()
      await expect(guestItem).toBeVisible()
      
      // Test long press timing
      const itemBox = await guestItem.boundingBox()
      expect(itemBox).not.toBeNull()
      
      if (itemBox) {
        const centerX = itemBox.x + itemBox.width / 2
        const centerY = itemBox.y + itemBox.height / 2
        
        // Short press (should not trigger context menu)
        await page.touchscreen.tap(centerX, centerY)
        await page.waitForTimeout(200)
        
        let contextMenu = page.locator('[data-testid="guest-context-menu"]')
        expect(await contextMenu.count()).toBe(0)
        
        // Long press (should trigger context menu)
        await page.evaluate((coords) => {
          const item = document.querySelector('[data-testid="guest-item"]') as HTMLElement
          if (item) {
            const longPressStart = new TouchEvent('touchstart', {
              touches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
            } as TouchEventInit)
            
            item.dispatchEvent(longPressStart)
            
            // Hold for long press duration
            setTimeout(() => {
              const longPressEnd = new TouchEvent('touchend', {
                changedTouches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
              } as TouchEventInit)
              
              item.dispatchEvent(longPressEnd)
            }, 800) // Long press threshold
          }
        }, { x: centerX, y: centerY })
        
        await page.waitForTimeout(1000)
        
        // Context menu should now be visible
        contextMenu = page.locator('[data-testid="guest-context-menu"]')
        await expect(contextMenu).toBeVisible()
      }
    })
    
    test('Photo selection with long press feedback', async ({ page }) => {
      await page.goto('/wedding/photo-gallery')
      
      const photo = page.locator('[data-testid="gallery-photo"]').first()
      await expect(photo).toBeVisible()
      
      // Verify initial state (not selected)
      const initialSelection = await photo.getAttribute('data-selected')
      expect(initialSelection).toBeFalsy()
      
      // Perform long press for selection
      const photoBox = await photo.boundingBox()
      expect(photoBox).not.toBeNull()
      
      if (photoBox) {
        const centerX = photoBox.x + photoBox.width / 2
        const centerY = photoBox.y + photoBox.height / 2
        
        await page.touchscreen.tap(centerX, centerY)
        
        // Hold for selection
        await page.evaluate((coords) => {
          const photoEl = document.querySelector('[data-testid="gallery-photo"]') as HTMLElement
          if (photoEl) {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
            } as TouchEventInit)
            
            photoEl.dispatchEvent(touchStart)
            
            setTimeout(() => {
              const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
              } as TouchEventInit)
              
              photoEl.dispatchEvent(touchEnd)
            }, 600) // Selection threshold
          }
        }, { x: centerX, y: centerY })
        
        await page.waitForTimeout(800)
        
        // Photo should now be selected
        const finalSelection = await photo.getAttribute('data-selected')
        expect(finalSelection).toBe('true')
        
        // Should show selection feedback
        const selectionIndicator = page.locator('[data-testid="selection-indicator"]')
        await expect(selectionIndicator).toBeVisible()
      }
    })
    
    test('Vendor quick actions with haptic feedback simulation', async ({ page }) => {
      await page.goto('/wedding/vendor-management')
      
      // Mock haptic feedback
      await page.evaluate(() => {
        const mockVibrate = jest.fn()
        Object.defineProperty(navigator, 'vibrate', {
          writable: true,
          value: mockVibrate
        })
        
        // Store for verification
        ;(window as any).mockVibrate = mockVibrate
      })
      
      const vendorCard = page.locator('[data-testid="vendor-card"]').first()
      await expect(vendorCard).toBeVisible()
      
      const cardBox = await vendorCard.boundingBox()
      expect(cardBox).not.toBeNull()
      
      if (cardBox) {
        const centerX = cardBox.x + cardBox.width / 2
        const centerY = cardBox.y + cardBox.height / 2
        
        // Long press for quick actions
        await page.evaluate((coords) => {
          const card = document.querySelector('[data-testid="vendor-card"]') as HTMLElement
          if (card) {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
            } as TouchEventInit)
            
            card.dispatchEvent(touchStart)
            
            // Simulate haptic feedback trigger
            setTimeout(() => {
              if (navigator.vibrate) {
                navigator.vibrate(50) // Quick haptic pulse
              }
              
              const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
              } as TouchEventInit)
              
              card.dispatchEvent(touchEnd)
            }, 500)
          }
        }, { x: centerX, y: centerY })
        
        await page.waitForTimeout(700)
        
        // Quick actions menu should appear
        const quickActions = page.locator('[data-testid="vendor-quick-actions"]')
        await expect(quickActions).toBeVisible()
        
        // Verify haptic feedback was triggered
        const hapticTriggered = await page.evaluate(() => {
          const mockVibrate = (window as any).mockVibrate
          return mockVibrate && mockVibrate.mock.calls.length > 0
        })
        
        expect(hapticTriggered).toBe(true)
      }
    })
  })

  test.describe('Edge Cases and Error Handling', () => {
    
    test('Interrupted gesture recovery', async ({ page }) => {
      await page.goto('/wedding/timeline')
      
      const timeline = page.locator('[data-testid="timeline-container"]')
      await expect(timeline).toBeVisible()
      
      // Start a swipe gesture
      const timelineBox = await timeline.boundingBox()
      expect(timelineBox).not.toBeNull()
      
      if (timelineBox) {
        const startX = timelineBox.x + 100
        const startY = timelineBox.y + timelineBox.height / 2
        
        // Start touch
        await page.evaluate((coords) => {
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          if (container) {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ identifier: 0, clientX: coords.x, clientY: coords.y } as Touch] as TouchList
            } as TouchEventInit)
            
            container.dispatchEvent(touchStart)
          }
        }, { x: startX, y: startY })
        
        // Interrupt gesture (simulate phone call or notification)
        await page.evaluate(() => {
          // Simulate interruption by clearing touches
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          if (container) {
            const touchCancel = new TouchEvent('touchcancel', {
              changedTouches: [{ identifier: 0, clientX: 0, clientY: 0 } as Touch] as TouchList
            } as TouchEventInit)
            
            container.dispatchEvent(touchCancel)
          }
        })
        
        await page.waitForTimeout(300)
        
        // Timeline should remain in stable state
        const timelineState = await page.evaluate(() => {
          const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement
          return container ? {
            scrollPosition: container.scrollLeft,
            hasActiveTouch: container.classList.contains('touching')
          } : null
        })
        
        expect(timelineState?.hasActiveTouch).toBe(false)
        expect(timelineState?.scrollPosition).toBeGreaterThanOrEqual(0)
      }
    })
    
    test('Conflicting gestures resolution', async ({ page }) => {
      await page.goto('/wedding/seating-chart')
      
      const seatingChart = page.locator('[data-testid="seating-chart"]')
      await expect(seatingChart).toBeVisible()
      
      // Attempt conflicting gestures simultaneously
      const chartBox = await seatingChart.boundingBox()
      expect(chartBox).not.toBeNull()
      
      if (chartBox) {
        const centerX = chartBox.x + chartBox.width / 2
        const centerY = chartBox.y + chartBox.height / 2
        
        // Start with a pinch gesture
        await page.evaluate((coords) => {
          const chart = document.querySelector('[data-testid="seating-chart"]') as HTMLElement
          if (chart) {
            const pinchStart = new TouchEvent('touchstart', {
              touches: [
                { identifier: 0, clientX: coords.x - 50, clientY: coords.y } as Touch,
                { identifier: 1, clientX: coords.x + 50, clientY: coords.y } as Touch
              ] as TouchList
            } as TouchEventInit)
            
            chart.dispatchEvent(pinchStart)
            
            // Add a third finger (potential conflict)
            setTimeout(() => {
              const conflictTouch = new TouchEvent('touchstart', {
                touches: [
                  { identifier: 0, clientX: coords.x - 50, clientY: coords.y } as Touch,
                  { identifier: 1, clientX: coords.x + 50, clientY: coords.y } as Touch,
                  { identifier: 2, clientX: coords.x, clientY: coords.y - 50 } as Touch
                ] as TouchList
              } as TouchEventInit)
              
              chart.dispatchEvent(conflictTouch)
            }, 100)
          }
        }, { x: centerX, y: centerY })
        
        await page.waitForTimeout(500)
        
        // System should handle conflict gracefully
        const gestureState = await page.evaluate(() => {
          const chart = document.querySelector('[data-testid="seating-chart"]') as HTMLElement
          return chart ? {
            activeGesture: chart.getAttribute('data-active-gesture'),
            hasError: chart.classList.contains('gesture-error')
          } : null
        })
        
        // Should not be in error state
        expect(gestureState?.hasError).toBe(false)
        // Should have resolved to one gesture type
        expect(gestureState?.activeGesture).toBeTruthy()
      }
    })
    
    test('Performance under rapid gesture sequences', async ({ page }) => {
      await page.goto('/wedding/photo-gallery')
      
      const gallery = page.locator('[data-testid="photo-gallery"]')
      await expect(gallery).toBeVisible()
      
      // Record performance during rapid gestures
      await page.evaluate(() => {
        performance.mark('rapid-gesture-test-start')
      })
      
      // Perform rapid gesture sequence
      for (let i = 0; i < 10; i++) {
        const photo = page.locator('[data-testid="gallery-photo"]').nth(i % 3) // Cycle through photos
        
        if (await photo.count() > 0) {
          const photoBox = await photo.boundingBox()
          
          if (photoBox) {
            const x = photoBox.x + photoBox.width / 2
            const y = photoBox.y + photoBox.height / 2
            
            // Rapid tap
            await page.touchscreen.tap(x, y)
            await page.waitForTimeout(50) // Very short delay
          }
        }
      }
      
      // Measure performance
      const performanceData = await page.evaluate(() => {
        performance.mark('rapid-gesture-test-end')
        performance.measure('rapid-gesture-duration', 'rapid-gesture-test-start', 'rapid-gesture-test-end')
        
        const measure = performance.getEntriesByName('rapid-gesture-duration')[0]
        return {
          duration: measure.duration,
          averagePerGesture: measure.duration / 10
        }
      })
      
      // Each gesture should complete quickly even under rapid conditions
      expect(performanceData.averagePerGesture).toBeLessThan(100) // Less than 100ms per gesture
      expect(performanceData.duration).toBeLessThan(2000) // Total under 2 seconds
      
      // Gallery should remain responsive
      const galleryResponsive = await page.evaluate(() => {
        const gallery = document.querySelector('[data-testid="photo-gallery"]') as HTMLElement
        return gallery ? !gallery.classList.contains('frozen') : true
      })
      
      expect(galleryResponsive).toBe(true)
    })
  })
})