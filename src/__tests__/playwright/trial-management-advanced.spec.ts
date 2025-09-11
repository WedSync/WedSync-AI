import { test, expect } from '@playwright/test'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';

test.describe('WS-132: Advanced Trial Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test trial session
    await page.goto('/trial/setup')
    await page.fill('[data-testid=supplier-type]', 'photographer')
    await page.fill('[data-testid=business-size]', 'small')
    await page.click('[data-testid=start-trial]')
    await page.waitForURL('/trial/dashboard')
  })
  test('Advanced Analytics Dashboard Functionality', async ({ page }) => {
    // Navigate to trial dashboard
    await page.goto('http://localhost:3000/trial/dashboard')
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid=trial-dashboard]', { timeout: 10000 })
    // Verify ROI calculation display
    await expect(page.locator('[data-testid=total-roi-value]')).toBeVisible()
    await expect(page.locator('[data-testid=monthly-projection]')).toBeVisible()
    await expect(page.locator('[data-testid=annual-projection]')).toBeVisible()
    // Test interactive charts
    const roiChart = page.locator('[data-testid=roi-breakdown-chart]')
    await expect(roiChart).toBeVisible()
    // Hover over chart to test interactivity
    await roiChart.hover()
    await expect(page.locator('.recharts-tooltip')).toBeVisible()
    // Test conversion score display
    const conversionScore = page.locator('[data-testid=conversion-probability]')
    await expect(conversionScore).toBeVisible()
    // Verify score is between 0-100
    const scoreText = await conversionScore.textContent()
    const scoreValue = parseInt(scoreText?.replace('%', '') || '0')
    expect(scoreValue).toBeGreaterThanOrEqual(0)
    expect(scoreValue).toBeLessThanOrEqual(100)
    // Test risk factors display
    const riskFactors = page.locator('[data-testid=risk-factors]')
    await expect(riskFactors).toBeVisible()
    // Test recommendations panel
    const recommendations = page.locator('[data-testid=recommended-actions]')
    await expect(recommendations).toBeVisible()
    // Take screenshot for evidence
    await page.screenshot({ 
      path: `screenshots/trial-analytics-dashboard-${Date.now()}.png`,
      fullPage: true 
    })
  test('Multi-Tab Conversion Flow Testing', async ({ page, context }) => {
    // Create multiple tabs for comprehensive testing
    const analyticsTab = await context.newPage()
    const conversionTab = await context.newPage()
    const milestoneTab = await context.newPage()
    // Tab 1: Analytics
    await analyticsTab.goto('http://localhost:3000/trial/analytics')
    await analyticsTab.waitForSelector('[data-testid=analytics-dashboard]')
    await expect(analyticsTab.locator('text="ROI Analysis"')).toBeVisible()
    await expect(analyticsTab.locator('text="Projected Annual Savings"')).toBeVisible()
    // Tab 2: Conversion Flow
    await conversionTab.goto('http://localhost:3000/trial/conversion')
    await conversionTab.waitForSelector('[data-testid=conversion-dashboard]')
    await expect(conversionTab.locator('[data-testid=conversion-score]')).toBeVisible()
    // Tab 3: Milestone Tracking
    await milestoneTab.goto('http://localhost:3000/trial/milestone')
    await milestoneTab.waitForSelector('[data-testid=milestone-tracker]')
    await expect(milestoneTab.locator('[data-testid=milestone-progress]')).toBeVisible()
    // Test data consistency across tabs
    const analyticsROI = await analyticsTab.locator('[data-testid=total-roi]').textContent()
    const conversionROI = await conversionTab.locator('[data-testid=roi-value]').textContent()
    // Verify ROI values are consistent (within reasonable range)
    if (analyticsROI && conversionROI) {
      const analytics = parseFloat(analyticsROI.replace(/[$,]/g, ''))
      const conversion = parseFloat(conversionROI.replace(/[$,]/g, ''))
      expect(Math.abs(analytics - conversion)).toBeLessThan(100) // Allow for minor calculation differences
    }
    // Close additional tabs
    await analyticsTab.close()
    await conversionTab.close()
    await milestoneTab.close()
  test('Conversion Scoring System Testing', async ({ page }) => {
    // Navigate to conversion tracking
    await page.goto('/trial/conversion')
    // Simulate advanced trial usage
    const conversionResponse = await page.evaluate(async () => {
      const response = await fetch('/api/trial/conversion-score', {
        method: 'POST',
        body: JSON.stringify({
          trialId: 'test-trial-advanced',
          usage: {
            clientsAdded: 5,
            formsCreated: 3,
            journeysLaunched: 2,
            timeSaved: 15.5
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      return await response.json()
    // Verify conversion score components
    expect(conversionResponse.conversionScore).toBeDefined()
    expect(conversionResponse.readinessLevel).toBeDefined()
    expect(conversionResponse.recommendedTier).toBeDefined()
    expect(conversionResponse.personalizedMessage).toBeDefined()
    // Test that scores are within valid ranges
    expect(conversionResponse.conversionScore).toBeGreaterThanOrEqual(0)
    expect(conversionResponse.conversionScore).toBeLessThanOrEqual(100)
    // Verify personalized recommendations
    expect(conversionResponse.personalizedMessage).toBeTruthy()
    expect(typeof conversionResponse.personalizedMessage).toBe('string')
      path: `screenshots/conversion-scoring-${Date.now()}.png` 
  test('Email Automation Sequence Testing', async ({ page }) => {
    await page.goto('/trial/communications')
    // Wait for communication timeline to load
    await page.waitForSelector('text=Communication Timeline', { timeout: 10000 })
    // Verify email sequence display
    const emailSequence = page.locator('[data-testid=email-sequence]')
    await expect(emailSequence).toBeVisible()
    // Test milestone celebration email trigger
    const milestoneButton = page.locator('[data-testid=trigger-milestone-email]')
    await expect(milestoneButton).toBeVisible()
    await milestoneButton.click()
    // Wait for success confirmation
    await page.waitForSelector('text=Celebration email queued', { timeout: 5000 })
    await expect(page.locator('text=Celebration email queued')).toBeVisible()
    // Verify email appears in timeline
    const emailTimeline = page.locator('[data-testid=email-timeline]')
    await expect(emailTimeline).toContainText('Milestone Celebration')
    // Test email preview functionality
    const previewButton = page.locator('[data-testid=email-preview]').first()
    if (await previewButton.isVisible()) {
      await previewButton.click()
      await expect(page.locator('[data-testid=email-preview-modal]')).toBeVisible()
      await page.click('[data-testid=close-preview]')
      path: `screenshots/email-automation-${Date.now()}.png` 
  test('A/B Testing Experiment Validation', async ({ page }) => {
    // Check A/B test experiment assignment
    const experimentData = await page.evaluate(async () => {
      const response = await fetch('/api/trial/experiment-assignment')
    // Verify experiment assignment
    expect(experimentData.experimentActive).toBeDefined()
    expect(experimentData.variant).toBeDefined()
    expect(['control', 'variant']).toContain(experimentData.variant)
    if (experimentData.experimentActive) {
      expect(experimentData.trialModification).toBeDefined()
      // Test that variant affects UI appropriately
      const variantIndicator = page.locator('[data-testid=ab-test-variant]')
      if (await variantIndicator.isVisible()) {
        const variantText = await variantIndicator.textContent()
        expect(variantText).toContain(experimentData.variant)
      }
    // Navigate to A/B testing dashboard
    await page.goto('/trial/experiments')
    // Verify experiment status display
    await expect(page.locator('[data-testid=active-experiments]')).toBeVisible()
      await expect(page.locator(`[data-testid=experiment-${experimentData.variant}]`)).toBeVisible()
      path: `screenshots/ab-testing-${Date.now()}.png` 
  test('Trial Extension Request Flow', async ({ page }) => {
    await page.goto('/trial/extend')
    // Wait for extension form to load
    await page.waitForSelector('text=Request Trial Extension', { timeout: 10000 })
    // Fill out extension request form
    await page.fill('[name="requestedDays"]', '14')
    const justificationText = 'Need additional time to evaluate ROI with upcoming wedding season and test integration with existing photography workflow tools.'
    await page.fill('[name="businessJustification"]', justificationText)
    // Submit extension request
    await page.click('[data-testid=submit-extension]')
    // Wait for submission confirmation
    await page.waitForSelector('text=Extension request submitted', { timeout: 10000 })
    await expect(page.locator('text=Extension request submitted')).toBeVisible()
    // Verify request appears in history
    const extensionHistory = page.locator('[data-testid=extension-history]')
    if (await extensionHistory.isVisible()) {
      await expect(extensionHistory).toContainText('14 days')
      await expect(extensionHistory).toContainText('Pending')
    // Test auto-approval eligibility display
    const eligibilityIndicator = page.locator('[data-testid=auto-approval-eligible]')
    if (await eligibilityIndicator.isVisible()) {
      const eligibilityText = await eligibilityIndicator.textContent()
      expect(['Eligible', 'Not Eligible', 'Under Review']).toContain(eligibilityText?.trim())
      path: `screenshots/trial-extension-${Date.now()}.png` 
  test('Responsive Design for Advanced Analytics', async ({ page }) => {
    const devices = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ]
    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height })
      // Navigate to analytics dashboard
      await page.goto('/trial/analytics')
      await page.waitForSelector('[data-testid=analytics-dashboard]', { timeout: 10000 })
      // Verify ROI dashboard loads and is visible
      await expect(page.locator('text=ROI Dashboard')).toBeVisible()
      // Test that key metrics are still accessible on mobile
      if (device.name === 'mobile') {
        // Mobile-specific tests
        const mobileMenu = page.locator('[data-testid=mobile-menu]')
        if (await mobileMenu.isVisible()) {
          await mobileMenu.click()
        }
        
        // Verify critical information is still visible
        await expect(page.locator('[data-testid=total-roi-value]')).toBeVisible()
        await expect(page.locator('[data-testid=conversion-probability]')).toBeVisible()
      // Test chart responsiveness
      const chartContainer = page.locator('[data-testid=roi-chart-container]')
      if (await chartContainer.isVisible()) {
        const chartBounds = await chartContainer.boundingBox()
        if (chartBounds) {
          // Verify chart doesn't overflow container
          expect(chartBounds.width).toBeLessThanOrEqual(device.width)
      // Test table responsiveness on smaller screens
      if (device.width < 768) {
        const dataTable = page.locator('[data-testid=analytics-table]')
        if (await dataTable.isVisible()) {
          // Should either be horizontally scrollable or stacked
          const hasHorizontalScroll = await dataTable.evaluate(el => el.scrollWidth > el.clientWidth)
          const isStacked = await page.locator('[data-testid=stacked-layout]').isVisible()
          expect(hasHorizontalScroll || isStacked).toBeTruthy()
      // Take screenshot for each device
      await page.screenshot({
        path: `screenshots/trial-analytics-${device.name}-${Date.now()}.png`,
        fullPage: true
  test('Performance and Load Time Validation', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now()
    await page.goto('/trial/analytics', { waitUntil: 'networkidle' })
    const loadTime = Date.now() - startTime
    // Verify page loads within performance requirements
    expect(loadTime).toBeLessThan(5000) // 5 seconds max load time
    // Test analytics query performance
    const queryStartTime = Date.now()
    // Trigger a heavy analytics query
    await page.click('[data-testid=refresh-analytics]')
    await page.waitForSelector('[data-testid=analytics-loaded]', { timeout: 10000 })
    const queryTime = Date.now() - queryStartTime
    // Verify analytics queries complete within 2 seconds
    expect(queryTime).toBeLessThan(2000)
    // Test chart rendering performance
    const chartStartTime = Date.now()
    // Navigate to a page with heavy chart rendering
    await page.goto('/trial/roi-detailed')
    await page.waitForSelector('[data-testid=detailed-charts-loaded]', { timeout: 15000 })
    const chartRenderTime = Date.now() - chartStartTime
    // Verify charts render within reasonable time
    expect(chartRenderTime).toBeLessThan(3000)
    console.log(`Performance metrics:
      Page load: ${loadTime}ms
      Analytics query: ${queryTime}ms  
      Chart rendering: ${chartRenderTime}ms`)
  test('Data Persistence and State Management', async ({ page }) => {
    // Test that trial data persists across page reloads
    await page.goto('/trial/dashboard')
    // Get initial ROI value
    const initialROI = await page.locator('[data-testid=total-roi-value]').textContent()
    // Reload the page
    await page.reload()
    await page.waitForSelector('[data-testid=trial-dashboard]')
    // Verify ROI value is consistent
    const reloadedROI = await page.locator('[data-testid=total-roi-value]').textContent()
    expect(initialROI).toBe(reloadedROI)
    // Test data consistency across different pages
    const conversionPageROI = await page.locator('[data-testid=roi-display]').textContent()
    // Values should be consistent (allowing for formatting differences)
    if (initialROI && conversionPageROI) {
      const initial = parseFloat(initialROI.replace(/[$,]/g, ''))
      const conversion = parseFloat(conversionPageROI.replace(/[$,]/g, ''))
      expect(Math.abs(initial - conversion)).toBeLessThan(10)
  test('Error Handling and Edge Cases', async ({ page }) => {
    // Test error handling for invalid trial data
    await page.goto('/trial/analytics?id=invalid-trial-id')
    // Should show appropriate error message
    await page.waitForSelector('[data-testid=error-message]', { timeout: 5000 })
    await expect(page.locator('[data-testid=error-message]')).toBeVisible()
    // Test network error handling
    await page.route('/api/trial/**', route => route.fulfill({ status: 500 }))
    // Should show error state or fallback content
    const errorState = page.locator('[data-testid=error-state]')
    const fallbackContent = page.locator('[data-testid=fallback-content]')
    const hasError = await errorState.isVisible()
    const hasFallback = await fallbackContent.isVisible()
    expect(hasError || hasFallback).toBeTruthy()
    // Test retry mechanism
    if (await page.locator('[data-testid=retry-button]').isVisible()) {
      // Remove network error
      await page.unroute('/api/trial/**')
      await page.click('[data-testid=retry-button]')
      // Should recover from error
      await page.waitForSelector('[data-testid=trial-dashboard]', { timeout: 10000 })
      await expect(page.locator('[data-testid=trial-dashboard]')).toBeVisible()
  test('Accessibility and Keyboard Navigation', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    // Verify focus indicators are visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    // Test ARIA labels and roles
    const dashboard = page.locator('[data-testid=trial-dashboard]')
    const role = await dashboard.getAttribute('role')
    expect(role).toBe('main')
    // Test heading structure
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    // Test color contrast (simplified check)
    const backgroundColor = await page.evaluate(() => {
      const element = document.querySelector('[data-testid=trial-dashboard]')
      return window.getComputedStyle(element!).backgroundColor
    const textColor = await page.evaluate(() => {
      return window.getComputedStyle(element!).color
    // Basic contrast check (would need more sophisticated checking in real scenario)
    expect(backgroundColor).not.toBe(textColor)
    // Test screen reader compatibility
    const ariaLive = page.locator('[aria-live="polite"]')
    if (await ariaLive.isVisible()) {
      await expect(ariaLive).toHaveAttribute('aria-live', 'polite')
  test('Integration with External Services', async ({ page }) => {
    // Test email service integration
    // Mock email service response
    await page.route('/api/trial/send-email', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'test-123' })
    // Trigger email send
    await page.click('[data-testid=send-test-email]')
    // Verify success feedback
    await page.waitForSelector('[data-testid=email-sent-confirmation]', { timeout: 5000 })
    await expect(page.locator('[data-testid=email-sent-confirmation]')).toBeVisible()
    // Test analytics service integration
    await page.route('/api/trial/analytics', route => {
          roi: 2500,
          conversionScore: 75,
          engagement: 85
        })
    await page.goto('/trial/analytics')
    // Verify analytics data loads correctly
    await expect(page.locator('text="$2,500"')).toBeVisible()
    await expect(page.locator('text="75%"')).toBeVisible()
    await expect(page.locator('text="85%"')).toBeVisible()
  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await page.evaluate(() => {
      // Clear any test data from local storage
      localStorage.clear()
      sessionStorage.clear()
})
