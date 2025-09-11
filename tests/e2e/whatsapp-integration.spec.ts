import { test, expect } from '@playwright/test'

// WhatsApp Business Integration Tests
test.describe('WhatsApp Business Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to WhatsApp settings page
    await page.goto('/settings/whatsapp')
  })

  test('should configure WhatsApp Business API settings', async ({ page }) => {
    // Test WhatsApp configuration form
    await expect(page.getByRole('heading', { name: 'WhatsApp Business API' })).toBeVisible()

    // Configure Business Account ID
    await page.fill('input[name="businessAccountId"]', 'TEST_BUSINESS_ID')
    
    // Configure Phone Number ID
    await page.fill('input[name="phoneNumberId"]', 'TEST_PHONE_ID')
    
    // Configure Access Token
    await page.fill('input[name="accessToken"]', 'TEST_ACCESS_TOKEN')
    
    // Configure Webhook Verify Token
    await page.fill('input[name="webhookVerifyToken"]', 'TEST_WEBHOOK_TOKEN')

    // Save configuration
    await page.click('button:has-text("Save Configuration")')
    
    // Verify success message
    await expect(page.getByText('WhatsApp configuration saved successfully')).toBeVisible()
  })

  test('should create a new message template', async ({ page }) => {
    // Navigate to templates section
    await page.click('a[href="/settings/whatsapp/templates"]')
    
    // Click create template button
    await page.click('button:has-text("Create Template")')
    
    // Fill template form
    await page.fill('input[name="templateName"]', 'venue_confirmation')
    await page.selectOption('select[name="category"]', 'UTILITY')
    await page.fill('input[name="headerText"]', 'Venue Confirmation')
    await page.fill('textarea[name="bodyText"]', 'Your venue booking for {{1}} has been confirmed for {{2}}.')
    await page.fill('input[name="footerText"]', 'WedSync - Your wedding coordination partner')
    
    // Submit template
    await page.click('button:has-text("Create Template")')
    
    // Verify template was created
    await expect(page.getByText('Template created successfully')).toBeVisible()
    await expect(page.getByText('venue_confirmation')).toBeVisible()
  })

  test('should send a template message', async ({ page }) => {
    // Navigate to messaging section
    await page.click('a[href="/whatsapp/messaging"]')
    
    // Select template message type
    await page.click('button:has-text("Template")')
    
    // Enter recipient phone number
    await page.fill('input[name="phoneNumber"]', '+1234567890')
    
    // Select template
    await page.selectOption('select[name="template"]', 'venue_confirmation')
    
    // Send message
    await page.click('button:has-text("Send Message")')
    
    // Verify success
    await expect(page.getByText('Message sent successfully')).toBeVisible()
  })

  test('should handle media upload and sending', async ({ page }) => {
    // Navigate to messaging section
    await page.click('a[href="/whatsapp/messaging"]')
    
    // Select media message type
    await page.click('button:has-text("Media")')
    
    // Enter recipient phone number
    await page.fill('input[name="phoneNumber"]', '+1234567890')
    
    // Select image type
    await page.check('input[value="image"]')
    
    // Upload test image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('/path/to/test-image.jpg')
    
    // Add caption
    await page.fill('input[name="caption"]', 'Wedding venue preview')
    
    // Send media message
    await page.click('button:has-text("Send Message")')
    
    // Verify upload and send success
    await expect(page.getByText('Media uploaded successfully')).toBeVisible()
    await expect(page.getByText('Message sent successfully')).toBeVisible()
  })

  test('should create and manage message groups', async ({ page }) => {
    // Navigate to groups section
    await page.click('a[href="/whatsapp/groups"]')
    
    // Create new group
    await page.click('button:has-text("Create Group")')
    
    // Fill group form
    await page.fill('input[name="groupName"]', 'Wedding Party')
    await page.selectOption('select[name="groupType"]', 'wedding_party')
    await page.fill('textarea[name="description"]', 'Main wedding party coordination group')
    
    // Create group
    await page.click('button:has-text("Create Group")')
    
    // Verify group created
    await expect(page.getByText('Group created successfully')).toBeVisible()
    await expect(page.getByText('Wedding Party')).toBeVisible()
    
    // Add member to group
    await page.click('button[title="Add Member"]')
    await page.fill('input[name="phoneNumber"]', '+1234567890')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.click('button:has-text("Add Member")')
    
    // Verify member added
    await expect(page.getByText('Member added successfully')).toBeVisible()
    await expect(page.getByText('John Doe')).toBeVisible()
  })

  test('should send bulk message to group', async ({ page }) => {
    // Navigate to groups section
    await page.click('a[href="/whatsapp/groups"]')
    
    // Select a group (assuming one exists)
    await page.click('.group-item:first-child')
    
    // Send message to group
    await page.click('button[title="Send Message"]')
    
    // Select template
    await page.selectOption('select[name="template"]', 'venue_confirmation')
    
    // Send to group
    await page.click('button:has-text("Send to Group")')
    
    // Verify bulk send
    await expect(page.getByText('Bulk message sent successfully')).toBeVisible()
    await expect(page.getByText('sent to')).toBeVisible()
  })

  test('should handle opt-in/opt-out privacy controls', async ({ page }) => {
    // Navigate to privacy section
    await page.click('a[href="/whatsapp/privacy"]')
    
    // Test opt-in process
    await page.fill('input[name="phoneNumber"]', '+1234567890')
    await page.selectOption('select[name="consentType"]', 'marketing')
    await page.click('button:has-text("Record Opt-In")')
    
    // Verify opt-in recorded
    await expect(page.getByText('Opt-in recorded successfully')).toBeVisible()
    
    // Test status check
    await page.fill('input[name="statusCheckPhone"]', '+1234567890')
    await page.click('button:has-text("Check Status")')
    
    // Verify status displayed
    await expect(page.getByText('Status: opted_in')).toBeVisible()
    
    // Test opt-out process
    await page.fill('input[name="optOutPhone"]', '+1234567890')
    await page.fill('input[name="optOutReason"]', 'No longer interested')
    await page.click('button:has-text("Record Opt-Out")')
    
    // Verify opt-out recorded
    await expect(page.getByText('Opt-out recorded successfully')).toBeVisible()
  })

  test('should display webhook status and logs', async ({ page }) => {
    // Navigate to webhooks section
    await page.click('a[href="/whatsapp/webhooks"]')
    
    // Check webhook configuration
    await expect(page.getByText('Webhook URL')).toBeVisible()
    await expect(page.getByText('Status: Active')).toBeVisible()
    
    // View webhook logs
    await page.click('button:has-text("View Logs")')
    
    // Check logs are displayed
    await expect(page.getByText('Webhook Logs')).toBeVisible()
    await expect(page.locator('.log-entry')).toBeVisible()
  })

  test('should validate message permissions before sending', async ({ page }) => {
    // Navigate to messaging section
    await page.click('a[href="/whatsapp/messaging"]')
    
    // Enter phone number of opted-out user
    await page.fill('input[name="phoneNumber"]', '+0987654321')
    
    // Select marketing message type
    await page.click('button:has-text("Template")')
    await page.selectOption('select[name="template"]', 'marketing_promotion')
    
    // Try to send message
    await page.click('button:has-text("Send Message")')
    
    // Verify permission error
    await expect(page.getByText('Cannot send marketing messages to opted-out users')).toBeVisible()
  })

  test('should export user data (GDPR compliance)', async ({ page }) => {
    // Navigate to privacy section
    await page.click('a[href="/whatsapp/privacy"]')
    
    // Go to data export
    await page.click('a[href="#data-export"]')
    
    // Enter phone number for export
    await page.fill('input[name="exportPhoneNumber"]', '+1234567890')
    
    // Request data export
    await page.click('button:has-text("Export Data")')
    
    // Verify export initiated
    await expect(page.getByText('Data export initiated')).toBeVisible()
    
    // Check for download link
    await expect(page.getByText('Download export')).toBeVisible()
  })

  test('should process data deletion request', async ({ page }) => {
    // Navigate to privacy section
    await page.click('a[href="/whatsapp/privacy"]')
    
    // Go to data deletion
    await page.click('a[href="#data-deletion"]')
    
    // Enter phone number for deletion
    await page.fill('input[name="deletePhoneNumber"]', '+1234567890')
    
    // Confirm deletion
    await page.fill('input[name="confirmationText"]', 'DELETE')
    
    // Process deletion
    await page.click('button:has-text("Delete User Data")')
    
    // Verify deletion processed
    await expect(page.getByText('User data deletion processed')).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test invalid phone number
    await page.fill('input[name="phoneNumber"]', 'invalid-phone')
    await page.click('button:has-text("Send Message")')
    
    // Verify error message
    await expect(page.getByText('Invalid phone number format')).toBeVisible()
    
    // Test network error scenario
    // Mock network failure
    await page.route('/api/whatsapp/messages', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    // Try to send message
    await page.fill('input[name="phoneNumber"]', '+1234567890')
    await page.click('button:has-text("Send Message")')
    
    // Verify error handling
    await expect(page.getByText('Failed to send message')).toBeVisible()
  })

  test('should display message analytics and status', async ({ page }) => {
    // Navigate to analytics section
    await page.click('a[href="/whatsapp/analytics"]')
    
    // Check analytics widgets
    await expect(page.getByText('Messages Sent')).toBeVisible()
    await expect(page.getByText('Delivery Rate')).toBeVisible()
    await expect(page.getByText('Template Approvals')).toBeVisible()
    
    // View message status details
    await page.click('a[href="#message-status"]')
    
    // Check status breakdown
    await expect(page.getByText('Delivered')).toBeVisible()
    await expect(page.getByText('Read')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
  })
})