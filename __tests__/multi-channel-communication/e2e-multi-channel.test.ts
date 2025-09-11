import { test, expect } from '@playwright/test'

test.describe('Multi-Channel Communication System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for testing
    await page.route('**/api/whatsapp/route', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        
        if (body.action === 'test_connection') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'WhatsApp connection configured successfully'
            })
          })
        } else if (body.action === 'get_templates') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              templates: [
                {
                  id: 'template-1',
                  template_name: 'wedding_reminder',
                  display_name: 'Wedding Reminder',
                  category: 'UTILITY',
                  body_text: 'Hi {{1}}, your wedding is on {{2}}!'
                }
              ]
            })
          })
        }
      }
      
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url())
        const action = url.searchParams.get('action')
        
        if (action === 'status') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              configured: true,
              phone_number: '+1234567890',
              display_name: 'Test Business',
              is_verified: true
            })
          })
        }
      }
    })

    // Mock communications API
    await page.route('**/api/communications/**', async route => {
      if (route.request().url().includes('/preview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            previews: [
              {
                channel: 'email',
                preview: 'Subject: Test Subject\n\nHello John, this is a test message.',
                cost: 0.001
              },
              {
                channel: 'sms',
                preview: 'Hello John, this is a test message.',
                cost: 0.0075
              },
              {
                channel: 'whatsapp',
                preview: 'Hello John, this is a test message.',
                cost: 0.005
              }
            ]
          })
        })
      } else if (route.request().url().includes('/send')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'unified-123',
            results: [
              { channel: 'email', status: 'sent', messageId: 'email-123' },
              { channel: 'sms', status: 'sent', messageId: 'sms-123' },
              { channel: 'whatsapp', status: 'sent', messageId: 'wa-123' }
            ],
            successCount: 3,
            failureCount: 0
          })
        })
      }
    })

    // Mock clients API
    await page.route('**/api/clients*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'client-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            whatsapp_number: '+1234567890',
            communication_preferences: {
              primary: 'email',
              excludeChannels: []
            }
          },
          {
            id: 'client-2',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            phone: '+0987654321',
            whatsapp_number: null,
            communication_preferences: {
              primary: 'sms',
              excludeChannels: ['whatsapp']
            }
          }
        ])
      })
    })

    // Navigate to the communications page
    await page.goto('/communications')
  })

  test('should display multi-channel composer', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Multi-Channel Message Composer')
    
    // Check that all three channel options are visible
    await expect(page.locator('[data-testid="channel-selector"]')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('SMS')).toBeVisible()
    await expect(page.getByText('WhatsApp')).toBeVisible()
  })

  test('should select communication channels', async ({ page }) => {
    // Email should be selected by default
    await expect(page.locator('[data-channel="email"]')).toHaveClass(/border-blue-500/)
    
    // Select SMS channel
    await page.locator('[data-channel="sms"]').click()
    await expect(page.locator('[data-channel="sms"]')).toHaveClass(/border-green-500/)
    
    // Select WhatsApp channel
    await page.locator('[data-channel="whatsapp"]').click()
    await expect(page.locator('[data-channel="whatsapp"]')).toHaveClass(/border-emerald-500/)
    
    // Deselect email
    await page.locator('[data-channel="email"]').click()
    await expect(page.locator('[data-channel="email"]')).not.toHaveClass(/border-blue-500/)
  })

  test('should load and display recipients', async ({ page }) => {
    // Wait for recipients to load
    await expect(page.getByText('John Doe')).toBeVisible()
    await expect(page.getByText('Jane Smith')).toBeVisible()
    
    // Check available channels for each recipient
    await expect(page.getByText('email, sms, whatsapp')).toBeVisible() // John Doe
    await expect(page.getByText('email, sms')).toBeVisible() // Jane Smith (no WhatsApp)
  })

  test('should select recipients', async ({ page }) => {
    // Select first recipient
    await page.getByText('John Doe').click()
    await expect(page.getByText('Selected')).toBeVisible()
    
    // Check recipient counter updates
    await expect(page.getByText('Recipients (1)')).toBeVisible()
    
    // Select second recipient
    await page.getByText('Jane Smith').click()
    await expect(page.getByText('Recipients (2)')).toBeVisible()
  })

  test('should compose and preview message', async ({ page }) => {
    // Select all channels
    await page.locator('[data-channel="sms"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    
    // Enter email subject
    await page.fill('#subject', 'Test Subject')
    
    // Enter message content
    await page.fill('#message', 'Hello {{recipient_name}}, this is a test message.')
    
    // Add template variables
    await page.fill('#recipient_name', 'John')
    
    // Wait for preview to generate
    await expect(page.getByText('Message Preview')).toBeVisible()
    await expect(page.getByText('Hello John, this is a test message.')).toBeVisible()
    
    // Check cost estimate
    await expect(page.getByText('Estimated Total Cost')).toBeVisible()
  })

  test('should handle template selection', async ({ page }) => {
    // Open template selector
    await page.locator('text=Select a template...').click()
    
    // Select template
    await page.getByText('Wedding Reminder').click()
    
    // Verify template content is loaded
    await expect(page.locator('#message')).toHaveValue(/wedding/)
  })

  test('should upload media attachment', async ({ page }) => {
    // Select WhatsApp channel (supports media)
    await page.locator('[data-channel="whatsapp"]').click()
    
    // Create a test file
    const fileContent = 'test image content'
    const file = Buffer.from(fileContent)
    
    // Upload file
    await page.setInputFiles('#media', {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: file
    })
    
    // Verify file is uploaded
    await expect(page.getByText('test-image.jpg')).toBeVisible()
  })

  test('should enable scheduling options', async ({ page }) => {
    // Enable scheduling
    await page.locator('#scheduling').click()
    
    // Verify date and time inputs appear
    await expect(page.locator('#scheduleDate')).toBeVisible()
    await expect(page.locator('#scheduleTime')).toBeVisible()
    
    // Set schedule date and time
    await page.fill('#scheduleDate', '2024-12-25')
    await page.fill('#scheduleTime', '10:00')
  })

  test('should validate required fields before sending', async ({ page }) => {
    // Try to send without selecting recipients or channels
    await page.getByRole('button', { name: 'Send Messages' }).click()
    
    // Should show validation errors
    await expect(page.getByText('Please select at least one recipient')).toBeVisible()
    await expect(page.getByText('Please select at least one communication channel')).toBeVisible()
  })

  test('should send multi-channel message successfully', async ({ page }) => {
    // Setup: Select channels, recipients, and content
    await page.locator('[data-channel="sms"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    
    await page.getByText('John Doe').click()
    
    await page.fill('#subject', 'Test Wedding Update')
    await page.fill('#message', 'Hello {{recipient_name}}, your wedding photos are ready!')
    await page.fill('#recipient_name', 'John')
    
    // Send message
    await page.getByRole('button', { name: 'Send Messages' }).click()
    
    // Verify sending state
    await expect(page.getByText('Sending...')).toBeVisible()
    
    // Wait for completion (mocked to succeed immediately)
    await expect(page.getByRole('button', { name: 'Send Messages' })).toBeVisible()
    
    // Verify form is cleared after successful send
    await expect(page.locator('#message')).toHaveValue('')
    await expect(page.locator('#subject')).toHaveValue('')
  })

  test('should handle channel-specific content correctly', async ({ page }) => {
    // Select only WhatsApp
    await page.locator('[data-channel="email"]').click() // Deselect default email
    await page.locator('[data-channel="whatsapp"]').click()
    
    await page.fill('#message', 'WhatsApp-only message')
    
    // Email subject should not be required
    await page.getByText('John Doe').click()
    await page.getByRole('button', { name: 'Send Messages' }).click()
    
    // Should not show email subject validation error
    await expect(page.getByText('Email subject is required')).not.toBeVisible()
  })

  test('should respect recipient channel availability', async ({ page }) => {
    // Select all channels
    await page.locator('[data-channel="sms"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    
    // Select Jane Smith (who doesn't have WhatsApp)
    await page.getByText('Jane Smith').click()
    
    await page.fill('#subject', 'Test')
    await page.fill('#message', 'Test message')
    
    // Try to send
    await page.getByRole('button', { name: 'Send Messages' }).click()
    
    // Should show validation error for missing WhatsApp
    await expect(page.getByText('does not have a WhatsApp number')).toBeVisible()
  })

  test('should display cost estimates accurately', async ({ page }) => {
    // Select all channels and a recipient
    await page.locator('[data-channel="sms"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    await page.getByText('John Doe').click()
    
    await page.fill('#subject', 'Cost Test')
    await page.fill('#message', 'Testing cost calculation')
    
    // Wait for preview and cost calculation
    await expect(page.getByText('Estimated Total Cost')).toBeVisible()
    
    // Should show cost breakdown by channel
    await expect(page.getByText('$0.001')).toBeVisible() // Email cost
    await expect(page.getByText('$0.0075')).toBeVisible() // SMS cost  
    await expect(page.getByText('$0.005')).toBeVisible() // WhatsApp cost
  })

  test('should handle media preview in WhatsApp', async ({ page }) => {
    // Select WhatsApp only
    await page.locator('[data-channel="email"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    
    await page.fill('#message', 'Check out this photo!')
    
    // Upload media
    await page.setInputFiles('#media', {
      name: 'wedding-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data')
    })
    
    // Check preview shows media indicator
    await expect(page.getByText('[IMAGE:')).toBeVisible()
    
    // Cost should be higher for media message
    await expect(page.getByText('$0.01')).toBeVisible() // 2x base cost for media
  })

  test('should switch between template preview tabs', async ({ page }) => {
    // Select all channels
    await page.locator('[data-channel="sms"]').click()
    await page.locator('[data-channel="whatsapp"]').click()
    
    await page.fill('#subject', 'Multi-channel test')
    await page.fill('#message', 'Hello from all channels!')
    
    // Wait for preview to load
    await expect(page.getByText('Message Preview')).toBeVisible()
    
    // Click through channel tabs
    await page.getByRole('tab', { name: 'SMS' }).click()
    await expect(page.getByText('SMS')).toBeVisible()
    
    await page.getByRole('tab', { name: 'WhatsApp' }).click()
    await expect(page.getByText('WHATSAPP')).toBeVisible()
    
    await page.getByRole('tab', { name: 'Email' }).click()
    await expect(page.getByText('EMAIL')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/communications/send', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Service temporarily unavailable'
        })
      })
    })
    
    // Setup and try to send
    await page.getByText('John Doe').click()
    await page.fill('#subject', 'Error Test')
    await page.fill('#message', 'This should fail')
    
    await page.getByRole('button', { name: 'Send Messages' }).click()
    
    // Should handle error gracefully (implementation would show error message)
    await expect(page.getByRole('button', { name: 'Send Messages' })).toBeEnabled()
  })

  test('should maintain form state during interactions', async ({ page }) => {
    // Fill out form
    await page.locator('[data-channel="sms"]').click()
    await page.getByText('John Doe').click()
    await page.fill('#subject', 'State Test')
    await page.fill('#message', 'Testing form state persistence')
    
    // Switch to different tab (if available) and back
    // Form should maintain its state
    await expect(page.locator('#subject')).toHaveValue('State Test')
    await expect(page.locator('#message')).toHaveValue('Testing form state persistence')
    
    // Recipient should still be selected
    await expect(page.getByText('Recipients (1)')).toBeVisible()
    
    // Channel should still be selected
    await expect(page.locator('[data-channel="sms"]')).toHaveClass(/border-green-500/)
  })
})