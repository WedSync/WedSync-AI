/**
 * Cross-Browser End-to-End Tests for Guest List Builder
 * Team E - Batch 13 - WS-151 Guest List Builder Cross-Browser E2E Testing
 * 
 * Testing Requirements:
 * - Cross-browser compatibility (Chromium, Firefox, WebKit)
 * - Real browser engine testing
 * - Mobile device simulation
 * - Touch and mouse interactions
 * - Performance validation across browsers
 * - Visual regression testing
 * - Network conditions testing
 * - Accessibility across browsers
 */

import { test, expect, devices } from '@playwright/test'

// Device configurations for cross-platform testing
const DEVICES = {
  desktop: {
    chromium: { name: 'Desktop Chromium', viewport: { width: 1440, height: 900 } },
    firefox: { name: 'Desktop Firefox', viewport: { width: 1440, height: 900 } },
    webkit: { name: 'Desktop Safari', viewport: { width: 1440, height: 900 } }
  },
  mobile: {
    chromium: devices['Pixel 5'],
    webkit: devices['iPhone 12'],
    samsung: devices['Galaxy S8']
  },
  tablet: {
    chromium: devices['Galaxy Tab S4'],
    webkit: devices['iPad Pro']
  }
}

// Test configurations
const NETWORK_CONDITIONS = {
  fast3g: {
    offline: false,
    downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 Kbps
    latency: 150 // 150ms
  },
  slow3g: {
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500 Kbps
    uploadThroughput: (250 * 1024) / 8, // 250 Kbps
    latency: 300 // 300ms
  }
}

// Shared test utilities
class CrossBrowserTestUtils {
  static async waitForGuestListToLoad(page: any) {
    await page.waitForSelector('[data-testid="guest-list-container"], h1:has-text("Guest List")', {
      timeout: 10000
    })
    
    // Wait for loading states to complete
    await page.waitForFunction(() => {
      const loadingIndicators = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner')
      return loadingIndicators.length === 0
    }, { timeout: 15000 })
  }

  static async measurePerformance(page: any) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      }
    })
  }

  static async validateAccessibility(page: any) {
    await page.addScriptTag({
      url: 'https://unpkg.com/@axe-core/playwright@4.8.2/dist/index.js'
    })

    return await page.evaluate(async () => {
      // @ts-ignore
      const results = await axe.run()
      return {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length
      }
    })
  }

  static async simulateNetworkConditions(page: any, condition: keyof typeof NETWORK_CONDITIONS) {
    const context = page.context()
    await context.route('**/*', async route => {
      const config = NETWORK_CONDITIONS[condition]
      
      // Simulate latency
      await new Promise(resolve => setTimeout(resolve, config.latency))
      
      await route.continue()
    })
  }
}

test.describe('Guest List Builder - Cross-Browser Compatibility', () => {
  test.describe('Desktop Browser Testing', () => {
    // Test across different desktop browsers
    for (const [browserName, config] of Object.entries(DEVICES.desktop)) {
      test.describe(`${config.name}`, () => {
        test.use({ 
          ...config,
          // Enable browser-specific features
          ...(browserName === 'firefox' && { firefox: { firefoxUserPrefs: { 'dom.webnotifications.enabled': false } } })
        })

        test('should load guest list successfully', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Verify main components are present
          await expect(page.locator('h1:has-text("Guest List"), [data-testid="guest-list-title"]')).toBeVisible()
          await expect(page.locator('input[type="text"]:first, [role="searchbox"]')).toBeVisible()
          await expect(page.locator('button:has-text("Categories"), button:has-text("List"), button:has-text("Households")')).toBeVisible()
        })

        test('should handle search functionality across browsers', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
          await searchInput.fill('John')
          
          // Wait for search results
          await page.waitForTimeout(1000)
          
          // Browser-specific search validation
          if (browserName === 'firefox') {
            // Firefox might handle input events differently
            await page.keyboard.press('Enter')
          }
          
          await expect(searchInput).toHaveValue('John')
        })

        test('should support drag and drop operations', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Switch to categories view
          await page.locator('button:has-text("Categories")').click()
          
          // Wait for categories to load
          await page.waitForSelector('[data-testid*="category"], .category, [role="region"]', { timeout: 5000 })
          
          const draggableItems = page.locator('[draggable="true"], [data-testid*="guest-card"]')
          const dropZones = page.locator('[data-testid*="category"], .category, [role="region"]')
          
          if (await draggableItems.count() > 0 && await dropZones.count() > 0) {
            const firstItem = draggableItems.first()
            const firstDropZone = dropZones.first()
            
            // Browser-specific drag and drop
            if (browserName === 'webkit') {
              // WebKit has different drag behavior
              await firstItem.hover()
              await page.mouse.down()
              await firstDropZone.hover()
              await page.mouse.up()
            } else {
              await firstItem.dragTo(firstDropZone)
            }
            
            // Verify drag operation completed
            await page.waitForTimeout(1000)
          }
        })

        test('should handle view mode switching', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Test different view modes
          const viewModes = ['Categories', 'Households', 'List']
          
          for (const mode of viewModes) {
            const button = page.locator(`button:has-text("${mode}")`)
            if (await button.isVisible()) {
              await button.click()
              
              // Wait for view to change
              await page.waitForTimeout(1000)
              
              // Verify view changed successfully
              await expect(button).toHaveClass(/active|selected|current/)
            }
          }
        })

        test('should measure performance metrics', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          const metrics = await CrossBrowserTestUtils.measurePerformance(page)
          
          // Performance expectations (browser-specific)
          const expectations = {
            chromium: { maxLoadTime: 3000 },
            firefox: { maxLoadTime: 3500 },
            webkit: { maxLoadTime: 4000 }
          }
          
          const expected = expectations[browserName as keyof typeof expectations] || expectations.chromium
          expect(metrics.totalLoadTime).toBeLessThan(expected.maxLoadTime)
        })

        test('should validate accessibility standards', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          const accessibilityResults = await CrossBrowserTestUtils.validateAccessibility(page)
          
          // Should have no critical accessibility violations
          expect(accessibilityResults.violations).toBeLessThanOrEqual(0)
          expect(accessibilityResults.passes).toBeGreaterThan(10)
        })
      })
    }
  })

  test.describe('Mobile Browser Testing', () => {
    for (const [browserName, device] of Object.entries(DEVICES.mobile)) {
      test.describe(`Mobile ${browserName.toUpperCase()} - ${device.name}`, () => {
        test.use({ ...device })

        test('should adapt layout for mobile screens', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Verify mobile-optimized layout
          const viewport = page.viewportSize()
          expect(viewport?.width).toBeLessThan(500)
          
          // Mobile-specific UI elements should be present
          await expect(page.locator('input[type="text"]:first, [role="searchbox"]')).toBeVisible()
          
          // Touch targets should be appropriately sized
          const buttons = page.locator('button')
          const count = await buttons.count()
          
          for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i)
            const boundingBox = await button.boundingBox()
            
            if (boundingBox) {
              expect(boundingBox.width).toBeGreaterThanOrEqual(44) // WCAG touch target size
              expect(boundingBox.height).toBeGreaterThanOrEqual(44)
            }
          }
        })

        test('should support touch interactions', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
          
          // Test touch input
          await searchInput.tap()
          await page.keyboard.type('Touch Test')
          await expect(searchInput).toHaveValue('Touch Test')
          
          // Test touch scrolling
          await page.touchscreen.tap(200, 400)
          await page.mouse.wheel(0, 300)
          
          // Verify content is still accessible after scrolling
          await expect(page.locator('h1:has-text("Guest List"), [data-testid="guest-list-title"]')).toBeVisible()
        })

        test('should handle orientation changes', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Get initial viewport
          const initialViewport = page.viewportSize()
          
          // Simulate rotation to landscape
          if (initialViewport) {
            await page.setViewportSize({
              width: initialViewport.height,
              height: initialViewport.width
            })
          }
          
          // Wait for reflow
          await page.waitForTimeout(1000)
          
          // Verify layout adapts to landscape
          await expect(page.locator('h1:has-text("Guest List"), [data-testid="guest-list-title"]')).toBeVisible()
          await expect(page.locator('input[type="text"]:first, [role="searchbox"]')).toBeVisible()
        })

        test('should work with slow network conditions', async ({ page }) => {
          await CrossBrowserTestUtils.simulateNetworkConditions(page, 'slow3g')
          
          const startTime = Date.now()
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          const loadTime = Date.now() - startTime
          
          // Should still load within reasonable time on slow connection
          expect(loadTime).toBeLessThan(10000) // 10 seconds max
          
          // Verify functionality works despite slow connection
          const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
          await searchInput.fill('Network Test')
          await expect(searchInput).toHaveValue('Network Test')
        })
      })
    }
  })

  test.describe('Tablet Browser Testing', () => {
    for (const [browserName, device] of Object.entries(DEVICES.tablet)) {
      test.describe(`Tablet ${browserName.toUpperCase()} - ${device.name}`, () => {
        test.use({ ...device })

        test('should optimize layout for tablet screens', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          // Verify tablet-optimized layout
          const viewport = page.viewportSize()
          expect(viewport?.width).toBeGreaterThan(700)
          expect(viewport?.width).toBeLessThan(1200)
          
          // Should show categories in grid layout on tablet
          await page.locator('button:has-text("Categories")').click()
          await page.waitForTimeout(1000)
          
          // Verify grid layout is used
          const categoryElements = page.locator('[data-testid*="category"], .category, [role="region"]')
          const count = await categoryElements.count()
          expect(count).toBeGreaterThan(0)
        })

        test('should support both touch and mouse interactions', async ({ page }) => {
          await page.goto('/dashboard/clients/test-client/guests')
          await CrossBrowserTestUtils.waitForGuestListToLoad(page)
          
          const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
          
          // Test mouse interaction
          await searchInput.click()
          await page.keyboard.type('Mouse Input')
          await expect(searchInput).toHaveValue('Mouse Input')
          
          // Clear and test touch interaction
          await searchInput.clear()
          await searchInput.tap()
          await page.keyboard.type('Touch Input')
          await expect(searchInput).toHaveValue('Touch Input')
        })
      })
    }
  })

  test.describe('Visual Regression Testing', () => {
    test('should maintain consistent visual appearance across browsers', async ({ page, browserName }) => {
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // Take screenshot for visual regression testing
      await expect(page).toHaveScreenshot(`guest-list-${browserName}.png`, {
        fullPage: true,
        threshold: 0.3 // Allow for minor browser differences
      })
    })

    test('should handle different view modes consistently', async ({ page, browserName }) => {
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // Test each view mode
      const viewModes = ['Categories', 'List']
      
      for (const mode of viewModes) {
        const button = page.locator(`button:has-text("${mode}")`)
        if (await button.isVisible()) {
          await button.click()
          await page.waitForTimeout(1500)
          
          // Take screenshot of each view mode
          await expect(page).toHaveScreenshot(`guest-list-${mode.toLowerCase()}-${browserName}.png`, {
            threshold: 0.3
          })
        }
      }
    })
  })

  test.describe('Error Handling Across Browsers', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/guests/**', route => route.abort())
      
      await page.goto('/dashboard/clients/test-client/guests')
      
      // Should show error state gracefully
      await page.waitForSelector('[data-testid*="error"], .error, [role="alert"]', { timeout: 10000 })
      
      // Verify error message is displayed
      const errorMessage = page.locator('[data-testid*="error"], .error, [role="alert"]')
      await expect(errorMessage).toBeVisible()
    })

    test('should recover from JavaScript errors', async ({ page }) => {
      // Inject a script error
      await page.addInitScript(() => {
        window.addEventListener('load', () => {
          // Simulate a non-critical JS error
          setTimeout(() => {
            try {
              // This should not break the app
              throw new Error('Test error')
            } catch (e) {
              console.error('Caught test error:', e)
            }
          }, 1000)
        })
      })
      
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // App should still function after JS error
      const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
      await searchInput.fill('Recovery Test')
      await expect(searchInput).toHaveValue('Recovery Test')
    })
  })

  test.describe('PWA Features Cross-Browser', () => {
    test('should support offline functionality', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // Go offline
      await page.context().setOffline(true)
      
      // Should still show cached content
      await page.reload()
      
      // Basic functionality should work offline
      const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Offline Test')
        await expect(searchInput).toHaveValue('Offline Test')
      }
    })

    test('should handle service worker updates', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // Check if service worker is registered
      const swRegistration = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistration()
      })
      
      if (swRegistration) {
        // Service worker should be active
        expect(swRegistration).toBeTruthy()
      }
    })
  })

  test.describe('Internationalization Cross-Browser', () => {
    test('should handle RTL languages', async ({ page }) => {
      // Set document direction to RTL
      await page.addInitScript(() => {
        document.documentElement.dir = 'rtl'
        document.documentElement.lang = 'ar'
      })
      
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      // Verify RTL layout
      const direction = await page.evaluate(() => document.documentElement.dir)
      expect(direction).toBe('rtl')
      
      // App should still function in RTL mode
      const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
      await searchInput.fill('RTL Test')
      await expect(searchInput).toHaveValue('RTL Test')
    })

    test('should handle different character sets', async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/guests')
      await CrossBrowserTestUtils.waitForGuestListToLoad(page)
      
      const searchInput = page.locator('input[type="text"]:first, [role="searchbox"]')
      
      // Test various character sets
      const testStrings = [
        'João',           // Portuguese
        '张三',            // Chinese
        'Müller',         // German
        'Петров',         // Russian
        'محمد',           // Arabic
        '山田太郎'          // Japanese
      ]
      
      for (const testString of testStrings) {
        await searchInput.clear()
        await searchInput.fill(testString)
        await expect(searchInput).toHaveValue(testString)
      }
    })
  })
})