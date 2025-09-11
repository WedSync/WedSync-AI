import { test, expect, Page, BrowserContext } from '@playwright/test'
import { createTestAttachment } from '../fixtures/test-files'

// Test configuration
const CHAT_PAGE_URL = '/chat'
const TEST_ROOM_NAME = 'Test Vendor Coordination - Weather Update'
const TEST_MESSAGE = 'Weather update: 80% chance of rain tomorrow'
const FILE_ATTACHMENT_NAME = 'test-contract.pdf'

// Authentication helper
async function authenticateUser(page: Page, userType: 'planner' | 'vendor' = 'planner') {
  // This would be replaced with actual authentication logic
  await page.goto('/login')
  await page.fill('input[name="email"]', userType === 'planner' ? 'planner@test.com' : 'vendor@test.com')
  await page.fill('input[name="password"]', 'testpassword')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

test.describe('Vendor Chat System - WS-078', () => {
  
  test.beforeEach(async ({ page }) => {
    // Authenticate as planner before each test
    await authenticateUser(page, 'planner')
    await page.goto(CHAT_PAGE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('should display chat interface with rooms list', async ({ page }) => {
    // Verify main chat layout
    await expect(page.locator('.flex.h-\\[calc\\(100vh-64px\\)\\]')).toBeVisible()
    
    // Verify sidebar with rooms
    await expect(page.locator('.w-80.border-r')).toBeVisible()
    
    // Verify search functionality
    const searchInput = page.locator('input[placeholder="Search conversations..."]')
    await expect(searchInput).toBeVisible()
    
    // Verify connection status indicator
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 })
  })

  test('should create vendor coordination room', async ({ page }) => {
    // Click create room button (assuming this exists in UI)
    await page.click('button:has-text("New Room")')
    
    // Fill room creation form
    await page.fill('input[name="room_name"]', TEST_ROOM_NAME)
    await page.selectOption('select[name="room_type"]', 'vendor_coordination')
    
    // Select vendors (simulate vendor selection)
    await page.click('button:has-text("Add Vendors")')
    await page.click('input[type="checkbox"][data-vendor-type="photographer"]')
    await page.click('input[type="checkbox"][data-vendor-type="caterer"]')
    
    // Create the room
    await page.click('button:has-text("Create Room")')
    
    // Verify room appears in sidebar
    await expect(page.locator(`text=${TEST_ROOM_NAME}`)).toBeVisible()
    
    // Verify room is selected
    await expect(page.locator('.bg-primary-50')).toContainText(TEST_ROOM_NAME)
  })

  test('should send and receive real-time messages', async ({ browser }) => {
    // Create two browser contexts for real-time testing
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // Authenticate both users
    await authenticateUser(page1, 'planner')
    await authenticateUser(page2, 'vendor')
    
    // Navigate to chat page
    await page1.goto(CHAT_PAGE_URL)
    await page2.goto(CHAT_PAGE_URL)
    
    // Wait for both pages to load
    await page1.waitForLoadState('networkidle')
    await page2.waitForLoadState('networkidle')
    
    // Select the same room on both pages
    await page1.click(`text=${TEST_ROOM_NAME}`)
    await page2.click(`text=${TEST_ROOM_NAME}`)
    
    // Send message from page1
    const messageInput1 = page1.locator('textarea[placeholder*="Type a message"]')
    await messageInput1.fill(TEST_MESSAGE)
    await page1.click('button:has(svg):has-text("")') // Send button with Send icon
    
    // Verify message appears on page1
    await expect(page1.locator(`text=${TEST_MESSAGE}`)).toBeVisible()
    
    // Verify message appears on page2 in real-time
    await expect(page2.locator(`text=${TEST_MESSAGE}`)).toBeVisible({ timeout: 5000 })
    
    // Verify message timestamp
    await expect(page1.locator('text=just now')).toBeVisible()
    
    // Clean up
    await context1.close()
    await context2.close()
  })

  test('should support file sharing functionality', async ({ page }) => {
    // Select a room
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    // Create test file
    const testFile = await createTestAttachment(FILE_ATTACHMENT_NAME, 'application/pdf')
    
    // Click file attachment button
    const fileButton = page.locator('button:has(svg[data-lucide="paperclip"])')
    await fileButton.click()
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile.path)
    
    // Wait for upload to complete
    await expect(page.locator(`text=${FILE_ATTACHMENT_NAME} uploaded`)).toBeVisible({ timeout: 10000 })
    
    // Verify file appears in chat
    await expect(page.locator(`text=${FILE_ATTACHMENT_NAME}`)).toBeVisible()
    
    // Verify file is clickable/downloadable
    const fileLink = page.locator(`a:has-text("${FILE_ATTACHMENT_NAME}")`)
    await expect(fileLink).toBeVisible()
    await expect(fileLink).toHaveAttribute('href')
  })

  test('should handle typing indicators', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    await authenticateUser(page1, 'planner')
    await authenticateUser(page2, 'vendor')
    
    await page1.goto(CHAT_PAGE_URL)
    await page2.goto(CHAT_PAGE_URL)
    
    // Select same room
    await page1.click(`text=${TEST_ROOM_NAME}`)
    await page2.click(`text=${TEST_ROOM_NAME}`)
    
    // Start typing on page1
    const messageInput1 = page1.locator('textarea[placeholder*="Type a message"]')
    await messageInput1.fill('Testing typing indicator...')
    
    // Verify typing indicator appears on page2
    await expect(page2.locator('text=person is typing')).toBeVisible({ timeout: 3000 })
    
    // Stop typing by clearing input
    await messageInput1.fill('')
    
    // Verify typing indicator disappears on page2
    await expect(page2.locator('text=person is typing')).toBeHidden({ timeout: 5000 })
    
    await context1.close()
    await context2.close()
  })

  test('should support message threading', async ({ page }) => {
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    // Send initial message
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    await messageInput.fill('Original message for threading test')
    await page.click('button:has(svg):has-text("")')
    
    // Wait for message to appear
    await expect(page.locator('text=Original message for threading test')).toBeVisible()
    
    // Click reply button on the message
    const replyButton = page.locator('button:has(svg[data-lucide="reply"])').first()
    await replyButton.click()
    
    // Verify reply preview appears
    await expect(page.locator('text=Replying to')).toBeVisible()
    
    // Send reply
    await messageInput.fill('This is a reply to the original message')
    await page.click('button:has(svg):has-text("")')
    
    // Verify threaded message appears
    await expect(page.locator('text=This is a reply to the original message')).toBeVisible()
    
    // Verify reply preview is shown above the reply
    await expect(page.locator('.bg-gray-50:has-text("Original message for threading test")')).toBeVisible()
  })

  test('should handle message editing and deletion', async ({ page }) => {
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    // Send a message
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    await messageInput.fill('Message to edit and delete')
    await page.click('button:has(svg):has-text("")')
    
    // Wait for message
    await expect(page.locator('text=Message to edit and delete')).toBeVisible()
    
    // Hover over message to show actions
    const messageContainer = page.locator('text=Message to edit and delete').locator('..')
    await messageContainer.hover()
    
    // Click edit button
    await page.click('button:has(svg[data-lucide="edit-2"])')
    
    // Edit the message
    const editInput = page.locator('input[value*="Message to edit and delete"]')
    await editInput.fill('Edited message content')
    await editInput.press('Enter')
    
    // Verify edited message
    await expect(page.locator('text=Edited message content')).toBeVisible()
    await expect(page.locator('text=(edited)')).toBeVisible()
    
    // Now test deletion
    await messageContainer.hover()
    await page.click('button:has(svg[data-lucide="trash-2"])')
    
    // Verify message is deleted
    await expect(page.locator('text=This message was deleted')).toBeVisible()
  })

  test('should show message read receipts', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    await authenticateUser(page1, 'planner')
    await authenticateUser(page2, 'vendor')
    
    await page1.goto(CHAT_PAGE_URL)
    await page2.goto(CHAT_PAGE_URL)
    
    // Select same room
    await page1.click(`text=${TEST_ROOM_NAME}`)
    await page2.click(`text=${TEST_ROOM_NAME}`)
    
    // Send message from page1
    const messageInput1 = page1.locator('textarea[placeholder*="Type a message"]')
    await messageInput1.fill('Message with read receipt test')
    await page1.click('button:has(svg):has-text("")')
    
    // Initially should show single check (sent)
    await expect(page1.locator('svg[data-lucide="check"]')).toBeVisible()
    
    // When page2 sees the message, it should show double check (delivered)
    await expect(page2.locator('text=Message with read receipt test')).toBeVisible()
    await expect(page1.locator('svg[data-lucide="check-check"]')).toBeVisible()
    
    // Simulate reading message on page2 (scroll into view)
    await page2.locator('text=Message with read receipt test').scrollIntoViewIfNeeded()
    
    // Should show read receipt (blue double check)
    await expect(page1.locator('svg[data-lucide="check-check"].text-primary-600')).toBeVisible({ timeout: 5000 })
    
    await context1.close()
    await context2.close()
  })

  test('should support presence indicators', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    await authenticateUser(page1, 'planner')
    await authenticateUser(page2, 'vendor')
    
    await page1.goto(CHAT_PAGE_URL)
    await page2.goto(CHAT_PAGE_URL)
    
    // Select same room
    await page1.click(`text=${TEST_ROOM_NAME}`)
    await page2.click(`text=${TEST_ROOM_NAME}`)
    
    // Verify both users show as online in participants
    await expect(page1.locator('.w-2.h-2.bg-success-500')).toBeVisible() // Online indicator
    await expect(page2.locator('.w-2.h-2.bg-success-500')).toBeVisible()
    
    // Close page2 to test offline status
    await page2.close()
    
    // Page1 should eventually show user as offline
    await expect(page1.locator('.w-2.h-2.bg-gray-400')).toBeVisible({ timeout: 10000 })
    
    await context1.close()
    await context2.close()
  })

  test('should handle mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to chat page
    await page.goto(CHAT_PAGE_URL)
    
    // Take screenshot for mobile layout verification
    await page.screenshot({ path: 'test-results/vendor-chat-mobile.png', fullPage: true })
    
    // Verify mobile-optimized layout
    await expect(page.locator('.flex.h-\\[calc\\(100vh-64px\\)\\]')).toBeVisible()
    
    // Verify search input is responsive
    const searchInput = page.locator('input[placeholder="Search conversations..."]')
    await expect(searchInput).toBeVisible()
    
    // Verify message input is accessible on mobile
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    await expect(messageInput).toBeVisible()
    
    // Test sending message on mobile
    await messageInput.fill('Mobile test message')
    await page.click('button:has(svg):has-text("")')
    
    await expect(page.locator('text=Mobile test message')).toBeVisible()
  })

  test('should handle network disconnection gracefully', async ({ page, context }) => {
    await page.goto(CHAT_PAGE_URL)
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    // Simulate network disconnection
    await context.setOffline(true)
    
    // Verify connection status changes
    await expect(page.locator('text=Disconnected')).toBeVisible({ timeout: 10000 })
    
    // Try to send message while offline
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    await messageInput.fill('Offline message test')
    await page.click('button:has(svg):has-text("")')
    
    // Message should show as failed or pending
    await expect(page.locator('svg[data-lucide="alert-circle"]')).toBeVisible()
    
    // Restore connection
    await context.setOffline(false)
    
    // Verify connection is restored
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 })
  })

  test('should support search functionality', async ({ page }) => {
    await page.goto(CHAT_PAGE_URL)
    
    // Send some searchable messages first
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    const searchableMessages = [
      'Contract details discussion',
      'Weather contingency planning',
      'Final payment schedule'
    ]
    
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    
    for (const message of searchableMessages) {
      await messageInput.fill(message)
      await page.click('button:has(svg):has-text("")')
      await page.waitForTimeout(1000) // Wait between messages
    }
    
    // Use search functionality
    const searchInput = page.locator('input[placeholder="Search conversations..."]')
    await searchInput.fill('contract')
    
    // Verify search results
    await expect(page.locator('text=Contract details discussion')).toBeVisible()
    
    // Clear search
    await searchInput.fill('')
    
    // All messages should be visible again
    for (const message of searchableMessages) {
      await expect(page.locator(`text=${message}`)).toBeVisible()
    }
  })

  test('should handle large file uploads', async ({ page }) => {
    await page.click(`text=${TEST_ROOM_NAME}`)
    
    // Create a larger test file (simulated)
    const largeFile = await createTestAttachment('large-presentation.pdf', 'application/pdf', 5 * 1024 * 1024) // 5MB
    
    // Upload large file
    const fileButton = page.locator('button:has(svg[data-lucide="paperclip"])')
    await fileButton.click()
    
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(largeFile.path)
    
    // Should show upload progress or success message
    await expect(page.locator('text=large-presentation.pdf uploaded')).toBeVisible({ timeout: 30000 })
  })

  test('should maintain accessibility standards', async ({ page }) => {
    await page.goto(CHAT_PAGE_URL)
    
    // Check for proper ARIA labels
    await expect(page.locator('[aria-label]')).toHaveCount({ min: 1 })
    
    // Check keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // Test contrast ratios (basic check)
    const messageInput = page.locator('textarea[placeholder*="Type a message"]')
    const styles = await messageInput.evaluate((el) => getComputedStyle(el))
    
    // Verify proper focus states exist
    await messageInput.focus()
    await expect(messageInput).toBeFocused()
    
    // Test screen reader content
    await expect(page.locator('[aria-live]')).toBeVisible()
  })

  test.afterAll(async ({ }) => {
    // Cleanup: Remove test data if needed
    console.log('Vendor Chat System tests completed')
  })

})