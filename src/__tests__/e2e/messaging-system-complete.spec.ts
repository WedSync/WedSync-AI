import { test, expect, Page } from '@playwright/test'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-helpers'

interface TestContext {
  organizationId: string
  userId: string
  campaignId: string
  guestEmails: string[]
  guestPhones: string[]
}
/**
 * Complete End-to-End Tests for WS-155 Guest Communications System
 * Tests the entire messaging workflow from creation to delivery and compliance
 */
test.describe('WS-155 Complete Messaging System E2E Tests', () => {
  let testContext: TestContext
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    const organization = await createTestOrganization()
    const user = await createTestUser(organization.id)
    
    testContext = {
      organizationId: organization.id,
      userId: user.id,
      campaignId: '',
      guestEmails: [
        'guest1@test-wedding.com',
        'guest2@test-wedding.com',
        'guest3@test-wedding.com'
      ],
      guestPhones: [
        '+15551234567',
        '+15551234568',
        '+15551234569'
      ]
    }
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', 'test-password-123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })
  test.afterEach(async () => {
    await cleanupTestData(testContext.organizationId)
  test('Complete messaging workflow - Email campaign', async ({ page }) => {
    // Navigate to communications
    await page.click('nav a[href="/communications"]')
    await expect(page).toHaveURL('/communications')
    // Create new campaign
    await page.click('button:has-text("New Campaign")')
    // Fill campaign details
    await page.fill('input[name="campaignName"]', 'E2E Test Campaign')
    await page.fill('textarea[name="campaignDescription"]', 'End-to-end test campaign')
    await page.click('button:has-text("Create Campaign")')
    // Verify campaign creation
    await expect(page.locator('h1')).toContainText('E2E Test Campaign')
    // Get campaign ID from URL
    const url = page.url()
    const campaignMatch = url.match(/campaigns\/([^\/]+)/)
    testContext.campaignId = campaignMatch ? campaignMatch[1] : ''
    expect(testContext.campaignId).toBeTruthy()
    // Add recipients
    await page.click('button:has-text("Add Recipients")')
    // Select guests
    for (const email of testContext.guestEmails) {
      await page.check(`input[type="checkbox"][value="${email}"]`)
    await page.click('button:has-text("Add Selected")')
    // Verify recipient count
    await expect(page.locator('text=3 recipients selected')).toBeVisible()
    // Compose message
    await page.fill('input[name="subject"]', 'Test Wedding Update - E2E')
    await page.fill('textarea[name="message"]', `
      Dear {{guest_name}},
      
      This is a test message from our wedding communications system.
      Event Details:
      - Date: {{wedding_date}}
      - Venue: {{venue_name}}
      Please RSVP at: {{rsvp_link}}
      Best regards,
      The Happy Couple
    `)
    // Preview message
    await page.click('button:has-text("Preview")')
    await expect(page.locator('.message-preview')).toBeVisible()
    await expect(page.locator('.message-preview')).toContainText('Dear Guest')
    await page.click('button:has-text("Close Preview")')
    // Compliance check
    await page.click('button:has-text("Check Compliance")')
    await expect(page.locator('.compliance-status.success')).toBeVisible()
    await expect(page.locator('text=CAN-SPAM Compliant')).toBeVisible()
    // Schedule send (immediate)
    await page.selectOption('select[name="sendOption"]', 'immediate')
    // Send campaign
    await page.click('button:has-text("Send Campaign")')
    // Confirm send
    await page.click('button:has-text("Confirm Send")')
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page.locator('text=Campaign sent successfully')).toBeVisible()
    // Check delivery status
    await page.click('tab:has-text("Delivery Status")')
    // Wait for delivery updates
    await page.waitForTimeout(5000)
    // Verify delivery tracking
      const recipientRow = page.locator(`tr:has-text("${email}")`)
      await expect(recipientRow.locator('.status-email')).toContainText(['Queued', 'Sent', 'Delivered'])
    // Test unsubscribe functionality
    await page.click('tab:has-text("Analytics")')
    await expect(page.locator('.analytics-summary')).toBeVisible()
    // Simulate unsubscribe click
    const unsubscribeLink = page.locator('a:has-text("Test Unsubscribe")')
    if (await unsubscribeLink.isVisible()) {
      await unsubscribeLink.click()
      await expect(page.locator('text=Successfully unsubscribed')).toBeVisible()
  test('Multi-channel campaign (Email + SMS)', async ({ page }) => {
    await page.goto('/communications/new')
    // Setup multi-channel campaign
    await page.fill('input[name="campaignName"]', 'Multi-Channel Test')
    await page.check('input[name="channels"][value="email"]')
    await page.check('input[name="channels"][value="sms"]')
    await page.click('button:has-text("Next")')
    // Add recipients with both email and phone
    await page.click('button:has-text("Import Recipients")')
    // Fill recipient data
    const recipientData = testContext.guestEmails.map((email, i) => ({
      email,
      phone: testContext.guestPhones[i],
      name: `Guest ${i + 1}`
    }))
    for (const recipient of recipientData) {
      await page.click('button:has-text("Add Recipient")')
      await page.fill('input[name="email"]', recipient.email)
      await page.fill('input[name="phone"]', recipient.phone)
      await page.fill('input[name="name"]', recipient.name)
      await page.click('button:has-text("Save")')
    // Compose messages
    await page.fill('input[name="emailSubject"]', 'Wedding Update')
    await page.fill('textarea[name="emailMessage"]', 'Detailed wedding information...')
    await page.fill('textarea[name="smsMessage"]', 'Quick wedding update: {{venue_name}} on {{wedding_date}}')
    // Validate both messages
    await page.click('button:has-text("Validate Messages")')
    await expect(page.locator('.validation-success')).toHaveCount(2)
    await page.click('button:has-text("Confirm")')
    // Verify multi-channel delivery
    await page.waitForSelector('.delivery-dashboard')
    const emailStats = page.locator('.email-stats')
    const smsStats = page.locator('.sms-stats')
    await expect(emailStats.locator('.sent-count')).toContainText('3')
    await expect(smsStats.locator('.sent-count')).toContainText('3')
  test('Performance optimization with large recipient list', async ({ page }) => {
    // Create large recipient list (1000+ recipients)
    const largeRecipientList = Array.from({ length: 1000 }, (_, i) => ({
      email: `guest${i + 1}@performance-test.com`,
      name: `Performance Guest ${i + 1}`
    // Setup performance test campaign
    await page.fill('input[name="campaignName"]', 'Performance Test - 1000 Recipients')
    // Bulk import recipients
    await page.click('button:has-text("Bulk Import")')
    const csvData = [
      'email,name',
      ...largeRecipientList.map(r => `${r.email},${r.name}`)
    ].join('\n')
    await page.setInputFiles('input[type="file"]', {
      name: 'performance-test-recipients.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData)
    })
    await page.click('button:has-text("Import")')
    await page.waitForSelector('.import-success')
    await expect(page.locator('text=1000 recipients imported')).toBeVisible()
    await page.fill('input[name="subject"]', 'Performance Test Message')
    await page.fill('textarea[name="message"]', 'This is a performance test message for {{guest_name}}')
    // Enable performance optimization
    await page.click('button:has-text("Advanced Options")')
    await page.check('input[name="enablePerformanceMode"]')
    await page.fill('input[name="batchSize"]', '100')
    await page.fill('input[name="concurrencyLimit"]', '50')
    // Send with performance monitoring
    await page.click('button:has-text("Send with Monitoring")')
    // Monitor performance dashboard
    await expect(page.locator('.performance-dashboard')).toBeVisible()
    // Wait for batch processing to start
    await page.waitForSelector('.batch-progress')
    // Verify performance metrics
    const metricsPanel = page.locator('.performance-metrics')
    await expect(metricsPanel.locator('.messages-per-second')).toBeVisible()
    await expect(metricsPanel.locator('.batch-count')).toBeVisible()
    await expect(metricsPanel.locator('.error-rate')).toBeVisible()
    // Wait for completion (with timeout)
    await page.waitForSelector('.campaign-complete', { timeout: 120000 })
    // Verify final metrics
    const finalStats = page.locator('.final-statistics')
    await expect(finalStats.locator('.total-sent')).toContainText('1000')
    await expect(finalStats.locator('.success-rate')).toContainText(['99%', '100%'])
  test('Security validation and spam prevention', async ({ page }) => {
    // Setup campaign
    await page.fill('input[name="campaignName"]', 'Security Test Campaign')
    // Add test recipient
    await page.click('button:has-text("Add Recipient")')
    await page.fill('input[name="email"]', 'security-test@example.com')
    await page.fill('input[name="name"]', 'Security Test')
    await page.click('button:has-text("Save")')
    // Test spam content detection
    await page.fill('input[name="subject"]', 'URGENT!!! FREE MONEY WINNER!!!')
      CONGRATULATIONS!!! You are the WINNER!!!
      Click here NOW to claim your FREE $1,000,000 prize!
      ACT NOW! Limited time offer!
      http://suspicious-link.com/claim
      100% FREE! NO RISK! GUARANTEED!
    await page.click('button:has-text("Validate Content")')
    // Verify spam detection
    await expect(page.locator('.security-warning')).toBeVisible()
    await expect(page.locator('text=High spam score detected')).toBeVisible()
    await expect(page.locator('text=Suspicious content patterns found')).toBeVisible()
    // Try to send - should be blocked
    await expect(page.locator('.security-block')).toBeVisible()
    await expect(page.locator('text=Campaign blocked due to security concerns')).toBeVisible()
    // Fix content
    await page.fill('input[name="subject"]', 'Wedding Update')
      We hope you're as excited as we are about our upcoming wedding!
      Here are some important details:
      - Time: {{ceremony_time}}
      Please visit our wedding website for more information: {{wedding_website}}
      With love,
      {{couple_names}}
    // Re-validate
    await expect(page.locator('.security-success')).toBeVisible()
    // Should now be allowed to send
    await expect(page.locator('.send-confirmation')).toBeVisible()
  test('Error recovery and user feedback', async ({ page }) => {
    await page.fill('input[name="campaignName"]', 'Error Recovery Test')
    await page.fill('input[name="email"]', 'error-test@example.com')
    await page.fill('input[name="name"]', 'Error Test')
    // Simulate network error during send
    await page.route('**/api/communications/send', route => {
      // Fail the first request, succeed on retry
      const url = route.request().url()
      if (!url.includes('retry=1')) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary network failure' })
        })
      } else {
        route.continue()
      }
    await page.fill('input[name="subject"]', 'Test Subject')
    await page.fill('textarea[name="message"]', 'Test message content')
    // Attempt to send
    // Verify error handling UI
    await expect(page.locator('.error-notification')).toBeVisible()
    await expect(page.locator('text=Temporary network failure')).toBeVisible()
    // Verify auto-retry notification
    await expect(page.locator('.retry-notification')).toBeVisible()
    await expect(page.locator('text=Retrying automatically')).toBeVisible()
    // Wait for successful retry
    await expect(page.locator('.success-notification')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Completed after retry')).toBeVisible()
  test('Accessibility compliance validation', async ({ page }) => {
    await page.goto('/communications')
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('role', 'button')
    await page.keyboard.press('Enter')
    // Verify screen reader support
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    await expect(page.locator('[role="main"]')).toBeVisible()
    // Test form accessibility
    const form = page.locator('form')
    await expect(form).toHaveAttribute('novalidate')
    // Check required field indicators
    const requiredFields = page.locator('input[required], textarea[required]')
    for (let i = 0; i < await requiredFields.count(); i++) {
      const field = requiredFields.nth(i)
      const label = page.locator(`label[for="${await field.getAttribute('id')}"]`)
      await expect(label.locator('[aria-label="required"]')).toBeVisible()
    // Test error message accessibility
    await page.fill('input[name="subject"]', '')
    const errorMessage = page.locator('[role="alert"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
  test('Compliance and unsubscribe workflow', async ({ page }) => {
    // Create and send a campaign
    await page.fill('input[name="campaignName"]', 'Compliance Test')
    await page.fill('input[name="email"]', 'compliance-test@example.com')
    await page.fill('input[name="name"]', 'Compliance Test')
    // Wait for send completion
    await expect(page.locator('.success-notification')).toBeVisible()
    // Navigate to sent emails view
    await page.click('link:has-text("View Sent Emails")')
    // Find the test email and get unsubscribe link
    const emailRow = page.locator('tr:has-text("compliance-test@example.com")')
    await emailRow.click('button:has-text("View Content")')
    const unsubscribeLink = page.locator('a:has-text("Unsubscribe")')
    const unsubscribeUrl = await unsubscribeLink.getAttribute('href')
    // Test unsubscribe process
    await page.goto(unsubscribeUrl!)
    // Verify unsubscribe page
    await expect(page.locator('h1:has-text("Unsubscribe")')).toBeVisible()
    await expect(page.locator('text=compliance-test@example.com')).toBeVisible()
    await page.click('button:has-text("Confirm Unsubscribe")')
    // Verify success
    await expect(page.locator('.unsubscribe-success')).toBeVisible()
    await expect(page.locator('text=Successfully unsubscribed')).toBeVisible()
    // Test re-subscribe option
    await page.click('link:has-text("Changed your mind?")')
    await page.click('button:has-text("Resubscribe")')
    await expect(page.locator('.resubscribe-success')).toBeVisible()
  test('Real-time monitoring and analytics', async ({ page }) => {
    await page.goto('/communications/analytics')
    // Verify analytics dashboard loads
    await expect(page.locator('.analytics-dashboard')).toBeVisible()
    // Test real-time updates
    const realTimePanel = page.locator('.real-time-metrics')
    await expect(realTimePanel.locator('.messages-sent-today')).toBeVisible()
    await expect(realTimePanel.locator('.delivery-rate')).toBeVisible()
    await expect(realTimePanel.locator('.unsubscribe-rate')).toBeVisible()
    // Test date range filtering
    await page.click('button:has-text("Last 7 Days")')
    await expect(page.locator('.date-range-indicator')).toContainText('Last 7 Days')
    // Verify chart updates
    await page.waitForSelector('.analytics-chart')
    const chart = page.locator('.analytics-chart')
    await expect(chart).toBeVisible()
    // Test export functionality
    await page.click('button:has-text("Export Data")')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download CSV")')
    ])
    expect(download.suggestedFilename()).toMatch(/analytics.*\.csv/)
})
 * Performance Test Suite
test.describe('Performance Tests', () => {
  test('Campaign creation performance', async ({ page }) => {
    const startTime = Date.now()
    await page.fill('input[name="campaignName"]', 'Performance Test')
    await expect(page.locator('.campaign-created')).toBeVisible()
    const endTime = Date.now()
    const loadTime = endTime - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
  test('Large recipient list handling', async ({ page }) => {
    // Simulate large recipient import
    // Mock file with 5000 recipients
      name: 'large-recipients.csv',
      buffer: Buffer.from('email,name\n' + Array.from({ length: 5000 }, (_, i) => 
        `recipient${i}@test.com,Recipient ${i}`
      ).join('\n'))
    await expect(page.locator('.import-success')).toBeVisible()
    const importTime = endTime - startTime
    expect(importTime).toBeLessThan(10000) // Should import within 10 seconds
    // Verify UI remains responsive
    await page.click('tab:has-text("Recipients")')
    await expect(page.locator('.recipient-count')).toContainText('5000')
