import { test, expect, Page, BrowserContext } from '@playwright/test'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';

const DEVICES = [
  { width: 375, height: 667, name: 'iPhone SE', userAgent: 'iPhone' },
  { width: 390, height: 844, name: 'iPhone 12', userAgent: 'iPhone' },
  { width: 768, height: 1024, name: 'iPad', userAgent: 'iPad' },
  { width: 360, height: 640, name: 'Android Small', userAgent: 'Android' }
]
const TOUCH_TARGET_MIN_SIZE = 44 // WCAG minimum
const TOUCH_TARGET_OPTIMAL_SIZE = 48 // WS-138 requirement
const TARGET_60FPS_MS = 16.67
test.describe('WS-138 Touch Optimization - Multi-Device Validation', () => {
  
  DEVICES.forEach((device) => {
    test.describe(`${device.name} Device Tests`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height })
        await page.setUserAgent(`Mozilla/5.0 (${device.userAgent}) Touch`)
      })
      test(`should have minimum 48px touch targets on ${device.name}`, async ({ page }) => {
        await page.goto('http://localhost:3000/dashboard')
        
        // Get all interactive elements
        const interactiveElements = await page.locator('button, [role="button"], input, textarea, select, a[href]').all()
        for (const element of interactiveElements) {
          const box = await element.boundingBox()
          if (box) {
            expect(box.height, `${device.name}: Element too small (height)`).toBeGreaterThanOrEqual(TOUCH_TARGET_OPTIMAL_SIZE)
            expect(box.width, `${device.name}: Element too small (width)`).toBeGreaterThanOrEqual(TOUCH_TARGET_OPTIMAL_SIZE)
          }
        }
      test(`should prevent iOS zoom on form inputs for ${device.name}`, async ({ page }) => {
        await page.goto('http://localhost:3000/clients/new')
        // Check all input elements have font-size >= 16px
        const inputs = await page.locator('input, textarea, select').all()
        for (const input of inputs) {
          const fontSize = await input.evaluate(el => {
            const style = window.getComputedStyle(el)
            return parseFloat(style.fontSize)
          })
          
          expect(fontSize, `${device.name}: Input font size too small (causes zoom)`).toBeGreaterThanOrEqual(16)
      test(`should handle swipe navigation on ${device.name}`, async ({ page }) => {
        await page.goto('http://localhost:3000/clients/123')
        // Simulate swipe right gesture (back navigation)
        const viewport = page.viewportSize()!
        const startX = viewport.width * 0.1
        const endX = viewport.width * 0.8
        const y = viewport.height * 0.5
        await page.mouse.move(startX, y)
        await page.mouse.down()
        await page.mouse.move(endX, y)
        await page.mouse.up()
        // Should navigate back to clients list
        await expect(page).toHaveURL(/\/clients\/?$/)
      test(`should implement pull-to-refresh on ${device.name}`, async ({ page }) => {
        await page.goto('http://localhost:3000/clients')
        // Simulate pull down gesture
        const x = viewport.width * 0.5
        const startY = 100
        const endY = 200
        await page.mouse.move(x, startY)
        await page.mouse.move(x, endY, { steps: 10 })
        // Look for refresh indicator
        await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
        // Wait for refresh to complete
        await page.waitForLoadState('networkidle')
      test(`should measure touch performance on ${device.name}`, async ({ page }) => {
        // Enable performance monitoring
        const performanceMetrics = await page.evaluate(() => {
          // Inject performance monitoring
          let touchStartTime: number
          let responseTimes: number[] = []
          const handleTouchStart = () => {
            touchStartTime = performance.now()
          const handleTouchEnd = () => {
            const responseTime = performance.now() - touchStartTime
            responseTimes.push(responseTime)
          document.addEventListener('touchstart', handleTouchStart, { passive: true })
          document.addEventListener('touchend', handleTouchEnd, { passive: true })
          return new Promise<{ averageResponseTime: number; maxResponseTime: number }>((resolve) => {
            setTimeout(() => {
              resolve({
                averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
                maxResponseTime: Math.max(...responseTimes) || 0
              })
            }, 5000) // Collect for 5 seconds
        })
        // Perform touch interactions
        const buttons = await page.locator('button').all()
        for (let i = 0; i < Math.min(buttons.length, 5); i++) {
          await buttons[i].click()
          await page.waitForTimeout(200)
        const metrics = await performanceMetrics
        expect(metrics.averageResponseTime, `${device.name}: Average response time too slow`).toBeLessThan(TARGET_60FPS_MS * 2) // Allow some tolerance
        expect(metrics.maxResponseTime, `${device.name}: Max response time too slow`).toBeLessThan(100) // Max 100ms
      test(`should handle multi-touch gestures appropriately on ${device.name}`, async ({ page }) => {
        // Test that single-touch buttons don't respond to multi-touch
        const button = page.locator('button').first()
        // Simulate multi-touch (should be ignored for single-touch buttons)
        await page.evaluate(() => {
          const button = document.querySelector('button')
          if (button) {
            const touchEvent = new TouchEvent('touchstart', {
              touches: [
                new Touch({ identifier: 1, target: button, clientX: 100, clientY: 100 }),
                new Touch({ identifier: 2, target: button, clientX: 120, clientY: 120 })
              ] as any
            })
            button.dispatchEvent(touchEvent)
        // Button should not have been triggered (no navigation or state change)
        await expect(page).toHaveURL('http://localhost:3000/dashboard')
      test(`should provide haptic feedback on supported devices for ${device.name}`, async ({ page }) => {
        // Test haptic feedback capability
        const hapticSupport = await page.evaluate(() => {
          return 'vibrate' in navigator
        if (hapticSupport && device.userAgent.includes('iPhone')) {
          // Test that haptic feedback is triggered
          const hapticCalled = await page.evaluate(() => {
            let vibrateCalled = false
            const originalVibrate = navigator.vibrate
            
            navigator.vibrate = function(...args) {
              vibrateCalled = true
              return originalVibrate.apply(navigator, args)
            }
            // Simulate button press
            const button = document.querySelector('button')
            if (button) {
              button.click()
            return vibrateCalled
          expect(hapticCalled, `${device.name}: Haptic feedback should be triggered`).toBe(true)
      test(`should maintain accessibility with touch features on ${device.name}`, async ({ page }) => {
        // Check that touch elements have proper ARIA labels
        const interactiveElements = await page.locator('button, [role="button"]').all()
          const ariaLabel = await element.getAttribute('aria-label')
          const textContent = await element.textContent()
          expect(
            ariaLabel || textContent, 
            `${device.name}: Interactive element missing accessible name`
          ).toBeTruthy()
        // Check focus indicators are visible
        const firstButton = page.locator('button').first()
        await firstButton.focus()
        const focusVisible = await firstButton.evaluate(el => {
          const style = window.getComputedStyle(el)
          return style.outline !== 'none' || style.boxShadow.includes('focus') || style.border.includes('focus')
        expect(focusVisible, `${device.name}: Focus indicator not visible`).toBe(true)
      test(`should handle touch events securely on ${device.name}`, async ({ page }) => {
        // Test rate limiting
        const rapidClickResults = await page.evaluate(() => {
          let clickCount = 0
            const handleClick = () => {
              clickCount++
            button.addEventListener('click', handleClick)
            // Simulate rapid clicks
            for (let i = 0; i < 20; i++) {
            return clickCount
          return 0
        // Should have rate limiting (not all 20 clicks processed)
        expect(rapidClickResults, `${device.name}: Rate limiting not working`).toBeLessThan(20)
    })
  })
  test('should generate comprehensive performance report', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000/dashboard')
    
    // Enable performance debugging component
    await page.evaluate(() => {
      window.__ENABLE_TOUCH_DEBUG = true
    // Perform various touch interactions
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 5)) {
      await button.click()
      await page.waitForTimeout(100)
    }
    // Check that performance debugger is showing metrics
    const debugger = page.locator('[data-testid="touch-performance-debugger"]')
    if (await debugger.isVisible()) {
      const performanceGrade = await debugger.locator('.performance-grade').textContent()
      expect(performanceGrade).toMatch(/Grade: [A-F]/)
      const averageResponse = await debugger.locator('.average-response').textContent()
      expect(averageResponse).toMatch(/\d+\.\d+ms/)
})
