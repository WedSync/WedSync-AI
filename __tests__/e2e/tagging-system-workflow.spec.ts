import { test, expect } from '@playwright/test'

test.describe('Complete Tagging System Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login to the application
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'photographer@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Complete tagging system workflow - Tag creation, assignment, filtering, and bulk operations', async ({ page }) => {
    // Step 1: Navigate to client list
    await page.goto('/dashboard/clients')
    await expect(page.getByTestId('client-search')).toBeVisible()

    // Step 2: Test tag creation via tag manager
    await page.click('[data-testid="manage-tags"]')
    await expect(page.getByTestId('tag-manager')).toBeVisible()
    
    // Create VIP Client tag
    await page.click('[data-testid="create-tag"]')
    await page.fill('[data-testid="tag-name"]', 'VIP Client')
    await page.selectOption('[data-testid="tag-category"]', 'relationship')
    await page.click('[data-testid="tag-color-blue"]')
    await page.click('[data-testid="save-tag"]')
    await expect(page.getByText('Tag created successfully')).toBeVisible()

    // Create Outdoor Wedding tag
    await page.click('[data-testid="create-tag"]')
    await page.fill('[data-testid="tag-name"]', 'Outdoor Wedding')
    await page.selectOption('[data-testid="tag-category"]', 'venue')
    await page.click('[data-testid="tag-color-green"]')
    await page.click('[data-testid="save-tag"]')
    await expect(page.getByText('Tag created successfully')).toBeVisible()

    // Create Summer tag
    await page.click('[data-testid="create-tag"]')
    await page.fill('[data-testid="tag-name"]', 'Summer')
    await page.selectOption('[data-testid="tag-category"]', 'season')
    await page.click('[data-testid="tag-color-amber"]')
    await page.click('[data-testid="save-tag"]')
    await expect(page.getByText('Tag created successfully')).toBeVisible()

    // Verify tags appear in manager
    await expect(page.getByTestId('tag-vip-client')).toBeVisible()
    await expect(page.getByTestId('tag-outdoor-wedding')).toBeVisible()
    await expect(page.getByTestId('tag-summer')).toBeVisible()

    // Close tag manager
    await page.press('Escape')

    // Step 3: Test individual tag assignment in client profile
    await page.goto('/dashboard/clients')
    
    // Navigate to first client profile
    const firstClientRow = page.locator('[data-testid="list-view"] tbody tr').first()
    await firstClientRow.click()
    
    await expect(page.getByTestId('profile-header')).toBeVisible()
    await expect(page.getByTestId('client-tags-section')).toBeVisible()

    // Add tags to client
    await page.click('[data-testid="add-tags"]')
    
    // Use tag input to search and select tags
    await page.fill('[data-testid="tag-search-input"]', 'VIP')
    await page.click('[data-testid="tag-option-vip-client"]')
    
    await page.fill('[data-testid="tag-search-input"]', 'Outdoor')
    await page.click('[data-testid="tag-option-outdoor-wedding"]')

    await page.fill('[data-testid="tag-search-input"]', 'Summer')
    await page.click('[data-testid="tag-option-summer"]')

    // Verify tags are selected in the input
    await expect(page.getByTestId('selected-tag-vip-client')).toBeVisible()
    await expect(page.getByTestId('selected-tag-outdoor-wedding')).toBeVisible()
    await expect(page.getByTestId('selected-tag-summer')).toBeVisible()

    // Save tags
    await page.click('[data-testid="save-tags"]')
    await expect(page.getByText('Tags updated successfully')).toBeVisible()

    // Verify tags appear in profile
    await expect(page.getByTestId('client-tag-vip-client')).toBeVisible()
    await expect(page.getByTestId('client-tag-outdoor-wedding')).toBeVisible()
    await expect(page.getByTestId('client-tag-summer')).toBeVisible()

    // Step 4: Test tag filtering in client list
    await page.goto('/dashboard/clients')
    await page.click('[data-testid="tag-filter"]')
    
    // Filter by VIP Client tag
    await page.click('[data-testid="filter-tag-vip-client"]')
    await expect(page.getByTestId('filtered-clients')).toBeVisible()
    await expect(page.getByText('1 client with VIP Client tag')).toBeVisible()

    // Add Outdoor Wedding filter
    await page.click('[data-testid="filter-tag-outdoor-wedding"]')
    
    // Should show clients that have both tags
    await expect(page.getByText('Outdoor Wedding & VIP Client')).toBeVisible()

    // Clear filters
    await page.click('text=Clear all')
    await expect(page.getByTestId('filtered-clients')).not.toBeVisible()

    // Step 5: Test bulk tag operations (Team D integration)
    await page.goto('/dashboard/clients')
    
    // Select multiple clients for bulk operations
    await page.check('[data-testid="select-client-1"]')
    await page.check('[data-testid="select-client-2"]')
    await page.check('[data-testid="select-client-3"]')
    
    await expect(page.getByTestId('selection-count')).toContainText('3 clients selected')

    // Open bulk actions modal
    await page.click('[data-testid="bulk-actions"]')
    await expect(page.getByText('Bulk Operations')).toBeVisible()

    // Select tag add operation
    await page.click('[data-testid="bulk-tag_add"]')
    
    // Enter tags to add
    await page.fill('input[placeholder*="Enter tags"]', 'Luxury, Premium Service')
    
    // Verify tags are parsed
    await expect(page.getByText('Luxury')).toBeVisible()
    await expect(page.getByText('Premium Service')).toBeVisible()

    // Proceed to confirmation
    await page.click('button:has-text("Review & Confirm")')
    
    // Verify confirmation details
    await expect(page.getByText('3 clients will be affected')).toBeVisible()
    await expect(page.getByText('Tags to add: Luxury, Premium Service')).toBeVisible()

    // Execute bulk operation
    await page.click('[data-testid="confirm-bulk-operation"]')
    
    // Wait for completion
    await expect(page.getByText('Tags added successfully')).toBeVisible()

    // Step 6: Test tag analytics functionality
    await page.click('[data-testid="tag-analytics"]')
    await expect(page.getByTestId('tag-usage-chart')).toBeVisible()
    
    // Verify tag usage statistics
    await expect(page.getByText('VIP Client: 1 client')).toBeVisible()
    await expect(page.getByText('Outdoor Wedding: 1 client')).toBeVisible()
    await expect(page.getByText('Summer: 1 client')).toBeVisible()
    await expect(page.getByText('Luxury: 3 clients')).toBeVisible()
    await expect(page.getByText('Premium Service: 3 clients')).toBeVisible()

    // Step 7: Test tag management - Edit existing tag
    await page.goto('/dashboard/tags')
    
    // Edit VIP Client tag
    const vipTag = page.getByTestId('tag-vip-client').first()
    await vipTag.hover()
    await vipTag.locator('[data-testid="edit-tag"]').click()
    
    // Update description
    await page.fill('input[placeholder*="description"]', 'High-value client with premium service needs')
    await page.click('button:has-text("Save Changes")')
    await expect(page.getByText('Tag updated successfully')).toBeVisible()

    // Step 8: Test tag deletion with safety check
    // Try to delete a tag that's in use
    const luxuryTag = page.getByTestId('tag-luxury').first()
    await luxuryTag.hover()
    await luxuryTag.locator('[data-testid="delete-tag"]').click()
    
    // Should show warning about clients using this tag
    await expect(page.getByText('3 clients are using this tag')).toBeVisible()
    await expect(page.getByText('This will remove the tag from all clients')).toBeVisible()
    
    // Confirm deletion
    await page.fill('[data-testid="confirm-delete-input"]', 'DELETE')
    await page.click('button:has-text("Delete Tag")')
    await expect(page.getByText('Tag deleted successfully')).toBeVisible()

    // Step 9: Verify integration across all team components
    await page.goto('/dashboard/clients')
    
    // Team A: Verify filtering still works after tag deletion  
    await page.click('[data-testid="tag-filter"]')
    await expect(page.getByTestId('filter-tag-vip-client')).toBeVisible()
    await expect(page.getByTestId('filter-tag-luxury')).not.toBeVisible() // Should be gone
    
    // Team B: Check profile still shows remaining tags
    const firstClient = page.locator('[data-testid="list-view"] tbody tr').first()
    await firstClient.click()
    
    await expect(page.getByTestId('client-tag-vip-client')).toBeVisible()
    await expect(page.getByTestId('client-tag-outdoor-wedding')).toBeVisible()
    await expect(page.getByTestId('client-tag-summer')).toBeVisible()
    await expect(page.getByTestId('client-tag-luxury')).not.toBeVisible() // Should be gone

    // Step 10: Test performance with large number of tags
    await page.goto('/dashboard/tags')
    
    // Create multiple tags quickly to test performance
    for (let i = 1; i <= 10; i++) {
      await page.click('[data-testid="create-tag"]')
      await page.fill('[data-testid="tag-name"]', `Test Tag ${i}`)
      await page.selectOption('[data-testid="tag-category"]', 'custom')
      await page.click('[data-testid="save-tag"]')
    }
    
    // Verify all tags load quickly (should be under 2 seconds)
    const startTime = Date.now()
    await page.reload()
    await expect(page.getByTestId('tag-test-tag-1')).toBeVisible()
    await expect(page.getByTestId('tag-test-tag-10')).toBeVisible()
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(2000) // Performance requirement
  })

  test('Tag system accessibility validation', async ({ page }) => {
    await page.goto('/dashboard/clients')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab') // Focus search
    await page.keyboard.press('Tab') // Focus tag filter
    await page.keyboard.press('Enter') // Open tag filter
    
    // Should be able to navigate tags with keyboard
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space') // Select tag
    await page.keyboard.press('Escape') // Close filter
    
    // Test screen reader compatibility
    const tagFilter = page.getByTestId('tag-filter')
    await expect(tagFilter).toHaveAttribute('aria-label')
    
    // Test focus indicators
    await tagFilter.focus()
    // Should have visible focus indicator (tested via CSS)
  })

  test('Tag system error handling', async ({ page }) => {
    await page.goto('/dashboard/clients')
    
    // Test network error handling
    await page.route('/api/tags', route => route.abort())
    
    await page.click('[data-testid="manage-tags"]')
    await expect(page.getByText('Failed to load tags')).toBeVisible()
    
    // Test validation errors
    await page.unroute('/api/tags')
    await page.reload()
    
    await page.click('[data-testid="create-tag"]')
    await page.click('[data-testid="save-tag"]') // Empty name
    await expect(page.getByText('Tag name is required')).toBeVisible()
    
    // Test duplicate tag creation
    await page.fill('[data-testid="tag-name"]', 'VIP Client') // Already exists
    await page.click('[data-testid="save-tag"]')
    await expect(page.getByText('Tag with this name already exists')).toBeVisible()
  })
})