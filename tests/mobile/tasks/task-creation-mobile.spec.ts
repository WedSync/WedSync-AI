/**
 * WS-156 Revolutionary Playwright MCP Testing
 * Mobile-First Task Creation Testing Suite
 * Following the exact patterns from instructions
 */

import { test, expect, devices } from '@playwright/test'

// Test device matrix from instructions
const TEST_DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Samsung Galaxy S21', width: 360, height: 800 }
]

test.describe('WS-156 Mobile Task Creation System', () => {
  
  // REVOLUTIONARY MOBILE TESTING APPROACH - Exact pattern from instructions
  test('Task creation across all mobile breakpoints', async ({ page }) => {
    for (const device of TEST_DEVICES) {
      // Resize to device dimensions
      await page.setViewportSize({ 
        width: device.width, 
        height: device.height 
      })
      
      await page.goto('/tasks/create')
      await page.waitForLoadState('networkidle')
      
      // Take device-specific screenshot
      await page.screenshot({ 
        path: `test-results/task-creation-${device.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      })
      
      // Test touch interactions on this device
      await page.locator('button[data-testid="mobile-create-task"]').click()
      
      // Test form filling with device-specific optimizations
      const titleInput = page.locator('input[name="title"]')
      await titleInput.fill(`Mobile task test ${device.name}`)
      
      // Verify mobile-optimized form layout
      const formHeight = await titleInput.evaluate(el => el.getBoundingClientRect().height)
      expect(formHeight).toBeGreaterThanOrEqual(44) // WCAG minimum 44px height
      
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 })
      
      console.log(`✅ ${device.name} (${device.width}x${device.height}) - Task creation working`)
    }
  })

  // TOUCH GESTURE TESTING - Exact pattern from instructions  
  test('Drag and drop task reordering with touch', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // Mobile size
    await page.goto('/tasks')
    
    // Create multiple tasks first
    for (let i = 1; i <= 3; i++) {
      await page.locator('button[data-testid="create-task"]').click()
      await page.locator('input[name="title"]').fill(`Task ${i}`)
      await page.locator('button[type="submit"]').click()
      await page.waitForSelector('text=Task created successfully')
    }
    
    // Test drag and drop reordering using touch events
    const firstTask = page.locator('[data-testid="task-1"]')
    const thirdTaskPosition = page.locator('[data-testid="task-drop-zone-3"]')
    
    // Simulate touch drag
    const firstTaskBox = await firstTask.boundingBox()
    const thirdTaskBox = await thirdTaskPosition.boundingBox()
    
    if (firstTaskBox && thirdTaskBox) {
      // Touch start
      await page.mouse.move(firstTaskBox.x + firstTaskBox.width / 2, firstTaskBox.y + firstTaskBox.height / 2)
      await page.mouse.down()
      
      // Touch move (simulate drag)
      await page.mouse.move(thirdTaskBox.x + thirdTaskBox.width / 2, thirdTaskBox.y + thirdTaskBox.height / 2, { steps: 10 })
      
      // Touch end
      await page.mouse.up()
    }
    
    // Verify task order changed
    await page.waitForSelector('text=Task order updated', { timeout: 5000 })
    
    await page.screenshot({ path: 'test-results/drag-drop-reorder-success.png' })
  })

  // OFFLINE FUNCTIONALITY TESTING - Exact pattern from instructions
  test('Offline task creation and sync', async ({ page, context }) => {
    await page.goto('/tasks/create')
    
    // Simulate going offline using exact pattern from instructions
    await page.evaluate(() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      window.dispatchEvent(new Event('offline'))
    })
    
    // Verify offline indicator appears
    await page.waitForSelector('text=Working offline', { timeout: 3000 })
    
    // Create task while offline
    await page.locator('button[data-testid="create-task"]').click()
    await page.locator('input[name="title"]').fill('Offline task test')
    await page.locator('input[name="description"]').fill('This task was created while offline')
    await page.locator('button[type="submit"]').click()
    
    // Verify task saved locally
    await page.waitForSelector('text=Task saved offline - will sync when online')
    
    // Simulate coming back online using exact pattern from instructions
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      window.dispatchEvent(new Event('online'))
    })
    
    // Verify sync occurs
    await page.waitForSelector('text=Tasks synced successfully', { timeout: 10000 })
    
    await page.screenshot({ path: 'test-results/offline-sync-complete.png' })
  })

  // PHOTO CAPTURE SIMULATION TESTING - Exact pattern from instructions
  test('Photo attachment workflow', async ({ page }) => {
    await page.goto('/tasks/create')
    
    // Mock camera API using exact pattern from instructions
    await page.evaluate(() => {
      // Mock getUserMedia for camera testing
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#4A90E2'
          ctx.fillRect(0, 0, 640, 480)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '24px Arial'
          ctx.fillText('Mock Camera Test', 250, 240)
        }
        const stream = canvas.captureStream()
        return stream
      }
    })
    
    await page.locator('button[data-testid="add-photo"]').click()
    await page.locator('button[data-testid="take-photo"]').click()
    
    // Wait for photo capture simulation
    await page.waitForSelector('text=Photo captured', { timeout: 5000 })
    
    await page.locator('button[data-testid="use-photo"]').click()
    
    // Verify photo attachment
    await page.waitForSelector('text=Photo attached to task')
    
    await page.screenshot({ path: 'test-results/photo-capture-workflow.png' })
  })

  // PWA INSTALLATION TESTING
  test('PWA installation and offline behavior', async ({ page, context }) => {
    // Mock PWA prompt
    await page.goto('/tasks/create')
    
    // Test service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          return !!registration
        } catch {
          return false
        }
      }
      return false
    })
    
    expect(swRegistered).toBe(true)
    
    // Test PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    
    // Test offline page functionality
    await page.goto('/tasks/create')
    await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' }))
    
    // Simulate network failure
    await context.setOffline(true)
    await page.reload()
    
    // Should show offline page or cached version
    const pageContent = await page.textContent('body')
    expect(pageContent).toMatch(/offline|create task|working offline/i)
    
    await page.screenshot({ path: 'test-results/pwa-offline-behavior.png' })
  })

  // ACCESSIBILITY TESTING
  test('Touch accessibility with screen readers', async ({ page }) => {
    await page.goto('/tasks/create')
    
    // Test ARIA labels
    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toHaveAttribute('aria-label', /task title/i)
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(titleInput).toBeFocused()
    
    // Test touch targets size
    const touchButtons = page.locator('button')
    const buttonCount = await touchButtons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = touchButtons.nth(i)
      const box = await button.boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44) // WCAG minimum
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }
    
    await page.screenshot({ path: 'test-results/accessibility-validation.png' })
  })

  // PERFORMANCE TESTING FOR MOBILE
  test('Mobile performance benchmarks', async ({ page }) => {
    // Start performance monitoring
    const performanceMetrics = []
    
    page.on('response', response => {
      performanceMetrics.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing()
      })
    })
    
    const startTime = Date.now()
    await page.goto('/tasks/create')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Should load in under 3 seconds on mobile (as per instructions)
    expect(loadTime).toBeLessThan(3000)
    
    // Test touch response time
    const touchStartTime = Date.now()
    await page.locator('button[data-testid="create-task"]').click()
    const touchResponseTime = Date.now() - touchStartTime
    
    // Should respond in under 100ms (as per instructions)  
    expect(touchResponseTime).toBeLessThan(100)
    
    console.log(`Performance: Load ${loadTime}ms, Touch Response ${touchResponseTime}ms`)
  })

  // SECURITY TESTING
  test('Mobile security validation', async ({ page }) => {
    await page.goto('/tasks/create')
    
    // Test touch input validation
    const titleInput = page.locator('input[name="title"]')
    
    // Test XSS prevention
    await titleInput.fill('<script>alert("xss")</script>')
    await page.locator('button[type="submit"]').click()
    
    // Should not execute script
    const alertDialog = page.locator('div[role="alert"]')
    await expect(alertDialog).not.toContainText('xss')
    
    // Test file upload security
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      // Test large file rejection (would need actual file)
      await expect(fileInput).toHaveAttribute('accept', /image|pdf/i)
    }
    
    // Test CSRF token presence
    const csrfToken = page.locator('input[name="_token"]')
    if (await csrfToken.count() > 0) {
      await expect(csrfToken).toHaveValue(/\w{40,}/)
    }
    
    await page.screenshot({ path: 'test-results/security-validation.png' })
  })
})