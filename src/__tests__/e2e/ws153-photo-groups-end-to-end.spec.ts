/**
 * WS-153 Photo Groups Management - End-to-End Tests
 * Complete user workflows from UI to database
 */

import { test, expect } from '@playwright/test'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
test.describe('WS-153 Photo Groups Advanced Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to photo groups management page
    await page.goto('/dashboard/clients/test-client-id/photo-groups')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })
  test.describe('Real-time Collaboration Workflow', () => {
    test('should allow multiple users to collaborate in real-time', async ({ page, context }) => {
      // Create a second browser context to simulate another user
      const secondUserContext = await context.newContext()
      const secondUserPage = await secondUserContext.newPage()
      // First user joins collaboration session
      await page.click('[data-testid="enable-collaboration"]')
      await expect(page.locator('[data-testid="collaboration-status"]')).toContainText('Active')
      // Second user joins the same session
      await secondUserPage.goto('/dashboard/clients/test-client-id/photo-groups')
      await secondUserPage.click('[data-testid="join-collaboration"]')
      // First user should see the second user joined
      await expect(page.locator('[data-testid="active-users"]')).toContainText('2 users')
      // First user starts editing a field
      await page.click('[data-testid="photo-group-name-input"]')
      await page.fill('[data-testid="photo-group-name-input"]', 'Family Photos Updated')
      // Second user should see the field is locked
      const lockedField = secondUserPage.locator('[data-testid="photo-group-name-input"]')
      await expect(lockedField).toHaveAttribute('data-locked', 'true')
      // First user finishes editing
      await page.keyboard.press('Tab')
      // Second user should now be able to edit
      await secondUserPage.click('[data-testid="photo-group-description-input"]')
      await secondUserPage.fill('[data-testid="photo-group-description-input"]', 'Updated description')
      // First user should see the change reflected
      await expect(page.locator('[data-testid="photo-group-description-input"]')).toHaveValue('Updated description')
      await secondUserContext.close()
    })
    test('should show cursor positions of other users', async ({ page, context }) => {
      // Both users join collaboration
      // Second user moves cursor to a field
      await secondUserPage.hover('[data-testid="photo-group-time-input"]')
      // First user should see the cursor indicator
      await expect(page.locator('[data-testid="user-cursor-indicator"]')).toBeVisible()
  test.describe('Conflict Detection Workflow', () => {
    test('should automatically detect and highlight time conflicts', async ({ page }) => {
      // Create first photo group
      await page.click('[data-testid="add-photo-group"]')
      await page.fill('[data-testid="group-name"]', 'Family Photos')
      await page.selectOption('[data-testid="group-type"]', 'family')
      await page.fill('[data-testid="start-time"]', '14:00')
      await page.fill('[data-testid="end-time"]', '14:30')
      await page.click('[data-testid="save-group"]')
      // Create second photo group with overlapping time
      await page.fill('[data-testid="group-name"]', 'Bridal Party Photos')
      await page.selectOption('[data-testid="group-type"]', 'bridal_party')
      await page.fill('[data-testid="start-time"]', '14:15')
      await page.fill('[data-testid="end-time"]', '14:45')
      // Conflict warning should appear
      await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('Time overlap detected')
      // Save the group anyway to trigger full conflict detection
      // Conflict resolution modal should appear
      await expect(page.locator('[data-testid="conflict-resolution-modal"]')).toBeVisible()
      
      // Check conflict details
      await expect(page.locator('[data-testid="conflict-details"]')).toContainText('15 minutes overlap')
      // Verify resolution suggestions are shown
      await expect(page.locator('[data-testid="resolution-suggestions"]')).toBeVisible()
      const suggestions = page.locator('[data-testid="resolution-suggestion"]')
      await expect(suggestions).toHaveCount(3) // Should have multiple suggestions
    test('should auto-resolve low severity conflicts', async ({ page }) => {
      // Create groups with minimal overlap (5 minutes)
      await page.fill('[data-testid="group-name"]', 'Quick Family Shot')
      await page.fill('[data-testid="end-time"]', '14:10')
      await page.fill('[data-testid="group-name"]', 'Individual Portraits')
      await page.fill('[data-testid="start-time"]', '14:05')
      await page.fill('[data-testid="end-time"]', '14:15')
      // Enable auto-resolution
      await page.check('[data-testid="auto-resolve-conflicts"]')
      // Should show auto-resolution notification
      await expect(page.locator('[data-testid="auto-resolve-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="auto-resolve-notification"]')).toContainText('Conflict automatically resolved')
  test.describe('Schedule Optimization Workflow', () => {
    test('should optimize photo group schedule using AI', async ({ page }) => {
      // Create multiple photo groups with suboptimal timing
      const groups = [
        { name: 'Family Group 1', type: 'family', start: '14:00', end: '14:30' },
        { name: 'Family Group 2', type: 'family', start: '15:30', end: '16:00' },
        { name: 'Bridal Party', type: 'bridal_party', start: '13:00', end: '13:45' },
        { name: 'Ceremony Shots', type: 'ceremony', start: '16:30', end: '17:00' }
      ]
      for (const group of groups) {
        await page.click('[data-testid="add-photo-group"]')
        await page.fill('[data-testid="group-name"]', group.name)
        await page.selectOption('[data-testid="group-type"]', group.type)
        await page.fill('[data-testid="start-time"]', group.start)
        await page.fill('[data-testid="end-time"]', group.end)
        await page.click('[data-testid="save-group"]')
      }
      // Open schedule optimizer
      await page.click('[data-testid="optimize-schedule"]')
      // Configure optimization preferences
      await page.selectOption('[data-testid="optimization-strategy"]', 'genetic_algorithm')
      await page.check('[data-testid="golden-hour-preference"]')
      await page.check('[data-testid="family-grouping"]')
      // Set constraints
      await page.fill('[data-testid="max-duration"]', '480')
      await page.fill('[data-testid="buffer-minutes"]', '15')
      // Start optimization
      await page.click('[data-testid="start-optimization"]')
      // Wait for optimization to complete
      await expect(page.locator('[data-testid="optimization-progress"]')).toBeVisible()
      await page.waitForSelector('[data-testid="optimization-complete"]', { timeout: 30000 })
      // Review optimization results
      await expect(page.locator('[data-testid="optimization-score"]')).toBeVisible()
      const score = await page.textContent('[data-testid="optimization-score"]')
      expect(parseFloat(score!)).toBeGreaterThan(0.7) // Should be a good score
      // Check that conflicts were resolved
      await expect(page.locator('[data-testid="conflicts-resolved"]')).toContainText(/\d+ conflicts resolved/)
      // Apply optimized schedule
      await page.click('[data-testid="apply-optimization"]')
      // Verify the schedule was updated
      await expect(page.locator('[data-testid="schedule-updated-notification"]')).toBeVisible()
    test('should show optimization recommendations', async ({ page }) => {
      // Create some groups
      await page.fill('[data-testid="group-name"]', 'Outdoor Portraits')
      await page.fill('[data-testid="start-time"]', '12:00') // Harsh midday light
      // Run optimization
      await page.waitForSelector('[data-testid="optimization-complete"]')
      // Check recommendations
      await expect(page.locator('[data-testid="recommendations-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="recommendation"]').first()).toContainText(/golden hour|lighting|outdoor/)
  test.describe('Batch Operations Workflow', () => {
    test('should perform bulk operations on photo groups', async ({ page }) => {
      // Create several photo groups first
        'Family Group A',
        'Family Group B', 
        'Family Group C'
      for (const groupName of groups) {
        await page.fill('[data-testid="group-name"]', groupName)
        await page.selectOption('[data-testid="group-type"]', 'family')
      // Enable batch mode
      await page.click('[data-testid="batch-operations-toggle"]')
      // Select multiple groups
      await page.check('[data-testid="select-all-groups"]')
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 selected')
      // Perform bulk update
      await page.click('[data-testid="bulk-actions-menu"]')
      await page.click('[data-testid="bulk-update"]')
      // Update priority for all selected groups
      await page.selectOption('[data-testid="bulk-priority"]', 'high')
      await page.fill('[data-testid="bulk-notes"]', 'Updated via bulk operation')
      await page.click('[data-testid="apply-bulk-update"]')
      // Wait for batch operation to complete
      await expect(page.locator('[data-testid="batch-success-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="batch-success-notification"]')).toContainText('3 groups updated')
      // Verify the updates were applied
      const firstGroup = page.locator('[data-testid="photo-group-row"]').first()
      await expect(firstGroup.locator('[data-testid="priority-badge"]')).toContainText('High')
    test('should handle batch operation failures gracefully', async ({ page }) => {
      await page.fill('[data-testid="group-name"]', 'Test Group')
      // Enable batch mode and select group
      await page.check('[data-testid="group-checkbox"]')
      // Perform an operation that will partially fail
      await page.click('[data-testid="bulk-delete"]')
      // Simulate network error by intercepting request
      await page.route('**/api/photo-groups/batch', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Database connection failed' })
        })
      })
      await page.click('[data-testid="confirm-bulk-delete"]')
      // Should show error notification
      await expect(page.locator('[data-testid="batch-error-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="batch-error-notification"]')).toContainText('Database connection failed')
  test.describe('Analytics Dashboard Workflow', () => {
    test('should display comprehensive photo groups analytics', async ({ page }) => {
      // Navigate to analytics page
      await page.click('[data-testid="analytics-tab"]')
      // Wait for analytics to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]')
      // Check that key metrics are displayed
      await expect(page.locator('[data-testid="metric-group-count-by-type"]')).toBeVisible()
      await expect(page.locator('[data-testid="metric-time-distribution"]')).toBeVisible()
      await expect(page.locator('[data-testid="metric-completion-rate"]')).toBeVisible()
      // Verify charts are rendered
      await expect(page.locator('[data-testid="chart-container"]')).toHaveCount(3, { timeout: 10000 })
      // Test date range filtering
      await page.fill('[data-testid="date-range-start"]', '2025-08-01')
      await page.fill('[data-testid="date-range-end"]', '2025-08-31')
      await page.click('[data-testid="apply-date-filter"]')
      // Analytics should refresh with filtered data
      await expect(page.locator('[data-testid="date-range-display"]')).toContainText('Aug 2025')
    test('should allow metric customization', async ({ page }) => {
      // Open metric customization
      await page.click('[data-testid="customize-metrics"]')
      // Deselect some metrics
      await page.uncheck('[data-testid="metric-toggle-photographer-workload"]')
      await page.uncheck('[data-testid="metric-toggle-cost-analysis"]')
      // Apply changes
      await page.click('[data-testid="apply-metric-changes"]')
      // Verify metrics are hidden
      await expect(page.locator('[data-testid="metric-photographer-workload"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="metric-cost-analysis"]')).not.toBeVisible()
    test('should export analytics data', async ({ page }) => {
      // Start download
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-analytics"]')
      await page.click('[data-testid="export-csv"]')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/photo-groups-analytics-\d+\.csv/)
  test.describe('Calendar Integration Workflow', () => {
    test('should sync photo groups to Google Calendar', async ({ page }) => {
      // Create a photo group first
      await page.fill('[data-testid="group-name"]', 'Family Portraits')
      // Open calendar integration
      await page.click('[data-testid="calendar-integration"]')
      // Connect to Google Calendar (mock OAuth flow)
      await page.click('[data-testid="connect-google-calendar"]')
      // Mock OAuth success
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('oauth-success', {
          detail: { provider: 'google', access_token: 'mock_token' }
        }))
      // Should show connected status
      await expect(page.locator('[data-testid="google-calendar-status"]')).toContainText('Connected')
      // Sync photo groups
      await page.click('[data-testid="sync-to-google-calendar"]')
      // Wait for sync to complete
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="synced-events-count"]')).toContainText('1 event synced')
    test('should handle calendar sync errors', async ({ page }) => {
      // Mock failed OAuth
        window.dispatchEvent(new CustomEvent('oauth-error', {
          detail: { error: 'access_denied' }
      // Should show error message
      await expect(page.locator('[data-testid="oauth-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="oauth-error"]')).toContainText('access denied')
    test('should show sync status for multiple providers', async ({ page }) => {
      // Mock multiple connected calendars
        window.dispatchEvent(new CustomEvent('calendars-loaded', {
          detail: {
            integrations: [
              { provider: 'google', status: 'connected', last_sync: '2025-01-26T10:00:00Z' },
              { provider: 'outlook', status: 'connected', last_sync: '2025-01-26T09:30:00Z' }
            ]
          }
      // Should show status for both providers
      await expect(page.locator('[data-testid="outlook-calendar-status"]')).toContainText('Connected')
      await expect(page.locator('[data-testid="last-sync-google"]')).toContainText('10:00')
  test.describe('Complete User Journey', () => {
    test('should complete full photo groups management workflow', async ({ page }) => {
      // Step 1: Create photo groups
        { name: 'Getting Ready', type: 'bridal_prep', start: '13:00', end: '14:00' },
        { name: 'Family Portraits', type: 'family', start: '14:30', end: '15:00' },
        { name: 'Ceremony', type: 'ceremony', start: '15:30', end: '16:30' },
        { name: 'Reception', type: 'reception', start: '17:00', end: '21:00' }
      // Step 2: Detect and resolve conflicts
      await page.click('[data-testid="run-conflict-detection"]')
      await page.waitForSelector('[data-testid="conflict-results"]')
      if (await page.isVisible('[data-testid="conflicts-found"]')) {
        await page.click('[data-testid="auto-resolve-conflicts"]')
        await expect(page.locator('[data-testid="conflicts-resolved"]')).toBeVisible()
      // Step 3: Optimize schedule
      await page.selectOption('[data-testid="optimization-strategy"]', 'ai_powered')
      // Step 4: Sync to calendar
      // Step 5: View analytics
      // Verify final state
      await page.click('[data-testid="groups-tab"]')
      await expect(page.locator('[data-testid="photo-group-row"]')).toHaveCount(4)
      await expect(page.locator('[data-testid="schedule-optimized-badge"]')).toBeVisible()
      await expect(page.locator('[data-testid="calendar-synced-badge"]')).toBeVisible()
  test.describe('Performance Tests', () => {
    test('should handle large numbers of photo groups efficiently', async ({ page }) => {
      // Create 50 photo groups via bulk import
      await page.click('[data-testid="bulk-import"]')
      // Upload CSV file (mock data)
      const csvContent = Array.from({ length: 50 }, (_, i) => 
        `Group ${i + 1},family,${14 + Math.floor(i / 10)}:${(i * 10) % 60 < 10 ? '0' : ''}${(i * 10) % 60},${14 + Math.floor(i / 10)}:${((i * 10) + 30) % 60 < 10 ? '0' : ''}${((i * 10) + 30) % 60}`
      ).join('\n')
      await page.setInputFiles('[data-testid="csv-upload"]', {
        name: 'photo-groups.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(`Name,Type,Start Time,End Time\n${csvContent}`)
      await page.click('[data-testid="import-groups"]')
      // Should complete import in reasonable time
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 30000 })
      await expect(page.locator('[data-testid="imported-count"]')).toContainText('50 groups imported')
      // UI should remain responsive
      const startTime = Date.now()
      await page.click('[data-testid="groups-list"]')
      await page.waitForSelector('[data-testid="photo-group-row"]:nth-child(10)')
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(5000) // Should load within 5 seconds
    test('should maintain real-time performance with multiple users', async ({ page, context }) => {
      // Simulate 5 concurrent users
      const userContexts = await Promise.all(
        Array.from({ length: 5 }, () => context.newContext())
      )
      const userPages = await Promise.all(
        userContexts.map(ctx => ctx.newPage())
      // All users navigate to the same photo group
      await Promise.all(
        userPages.map(userPage => 
          userPage.goto('/dashboard/clients/test-client-id/photo-groups')
        )
      // All users join collaboration
          userPage.click('[data-testid="enable-collaboration"]')
      // Measure response time for real-time updates
      // First user makes a change
      await userPages[0].fill('[data-testid="photo-group-name-input"]', 'Updated by User 1')
      // Wait for change to propagate to other users
        userPages.slice(1).map(userPage =>
          userPage.waitForFunction(() => 
            document.querySelector('[data-testid="photo-group-name-input"]')?.value === 'Updated by User 1'
          )
      expect(endTime - startTime).toBeLessThan(2000) // Real-time updates within 2 seconds
      // Clean up
      await Promise.all(userContexts.map(ctx => ctx.close()))
})
