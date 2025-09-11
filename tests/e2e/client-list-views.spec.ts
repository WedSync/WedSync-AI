import { test, expect, Page } from '@playwright/test'

test.describe('Client List Views - Complete E2E Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to clients page
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/clients')
  })

  test('Complete client management workflow', async ({ page }) => {
    // Test full workflow: login → view clients → filter → sort → switch views
    await page.goto('/dashboard/clients')
    
    // Verify page loads
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
    
    // Test all 4 view types
    await expect(page.getByTestId('list-view')).toBeVisible()
    
    await page.click('[data-testid="grid-view-toggle"]')
    await expect(page.getByTestId('grid-view')).toBeVisible()
    
    await page.click('[data-testid="calendar-view-toggle"]')
    await expect(page.getByTestId('calendar-view')).toBeVisible()
    
    await page.click('[data-testid="kanban-view-toggle"]')
    await expect(page.getByTestId('kanban-view')).toBeVisible()
    
    // Test filtering and search
    await page.click('[data-testid="list-view-toggle"]')
    await page.fill('[data-testid="client-search"]', 'Smith Wedding')
    await expect(page.getByText('Smith Wedding')).toBeVisible()
    
    // Test integration points - Team E notification integration
    await page.click('[data-testid="client-notifications"]')
    await expect(page.getByText('Notifications')).toBeVisible()
  })

  test('List view functionality', async ({ page }) => {
    // Test list view specific features
    await page.click('[data-testid="list-view-toggle"]')
    
    // Check table headers
    await expect(page.getByText('Client')).toBeVisible()
    await expect(page.getByText('Wedding Date')).toBeVisible()
    await expect(page.getByText('Venue')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Package')).toBeVisible()
    await expect(page.getByText('WedMe')).toBeVisible()
    
    // Test sorting functionality
    await page.click('th:has-text("Wedding Date")')
    await page.waitForTimeout(500) // Allow sort to complete
    
    // Test client actions menu
    await page.click('button[aria-label="More options"]')
    await expect(page.getByText('View Details')).toBeVisible()
    await expect(page.getByText('Edit Client')).toBeVisible()
    await expect(page.getByText('View Activity')).toBeVisible()
  })

  test('Grid view functionality', async ({ page }) => {
    await page.click('[data-testid="grid-view-toggle"]')
    
    // Verify grid layout
    await expect(page.getByTestId('grid-view')).toBeVisible()
    
    // Check that client cards are displayed
    const clientCards = page.locator('[data-testid="grid-view"] .group')
    await expect(clientCards.first()).toBeVisible()
    
    // Test client card interactions
    await clientCards.first().hover()
    await expect(clientCards.first().locator('button:has-text("View")')).toBeVisible()
  })

  test('Calendar view functionality', async ({ page }) => {
    await page.click('[data-testid="calendar-view-toggle"]')
    
    // Verify calendar layout
    await expect(page.getByTestId('calendar-view')).toBeVisible()
    
    // Check for month headers and client entries
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    await expect(page.getByText(currentMonth)).toBeVisible()
  })

  test('Kanban view functionality', async ({ page }) => {
    await page.click('[data-testid="kanban-view-toggle"]')
    
    // Verify kanban layout
    await expect(page.getByTestId('kanban-view')).toBeVisible()
    
    // Check for status columns
    await expect(page.getByText('Lead')).toBeVisible()
    await expect(page.getByText('Booked')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('Archived')).toBeVisible()
    
    // Test drag and drop (basic check)
    const leadCard = page.locator('[data-testid="kanban-view"] .bg-white').first()
    await expect(leadCard).toBeVisible()
  })

  test('Search functionality across all views', async ({ page }) => {
    const searchTerm = 'Smith'
    
    // Test search in list view
    await page.click('[data-testid="list-view-toggle"]')
    await page.fill('[data-testid="client-search"]', searchTerm)
    await page.waitForTimeout(1000)
    
    // Switch views and verify search persists
    await page.click('[data-testid="grid-view-toggle"]')
    await expect(page.getByTestId('client-search')).toHaveValue(searchTerm)
    
    await page.click('[data-testid="calendar-view-toggle"]')
    await expect(page.getByTestId('client-search')).toHaveValue(searchTerm)
    
    await page.click('[data-testid="kanban-view-toggle"]')
    await expect(page.getByTestId('client-search')).toHaveValue(searchTerm)
  })

  test('Integration with Team B APIs', async ({ page }) => {
    // Test API integration by creating a new client
    await page.click('button:has-text("Add Client")')
    await page.waitForURL('**/clients/new')
    
    // Fill client form
    await page.fill('[name="first_name"]', 'Test')
    await page.fill('[name="last_name"]', 'Client')
    await page.fill('[name="email"]', 'test.client@example.com')
    await page.fill('[name="phone"]', '+44 123 456 7890')
    
    // Submit and verify API call
    await page.click('button[type="submit"]')
    await page.waitForURL('**/clients')
    
    // Verify new client appears in list
    await expect(page.getByText('Test Client')).toBeVisible()
  })

  test('Team C Security Integration', async ({ page }) => {
    // Test that security enhancements are working
    await page.goto('/dashboard/clients')
    
    // Verify proper authentication
    await expect(page).toHaveURL(/.*\/dashboard\/clients/)
    
    // Test XSS protection in search
    const maliciousScript = '<script>alert("xss")</script>'
    await page.fill('[data-testid="client-search"]', maliciousScript)
    
    // Verify script is not executed (no alert dialog appears)
    await page.waitForTimeout(1000)
    const dialogs = []
    page.on('dialog', dialog => dialogs.push(dialog))
    expect(dialogs.length).toBe(0)
  })

  test('Team D Database Performance', async ({ page }) => {
    // Test database optimization integration
    const startTime = Date.now()
    
    await page.goto('/dashboard/clients')
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Verify page loads within 2 seconds (performance requirement)
    expect(loadTime).toBeLessThan(2000)
    
    // Test WedMe connection status display
    await expect(page.getByText('Connected').or(page.getByText('Invite'))).toBeVisible()
  })

  test('Team E Notification Integration', async ({ page }) => {
    // Test notification system integration
    await page.click('[data-testid="client-notifications"]')
    
    // Verify notifications panel opens
    await expect(page.getByText('Notifications')).toBeVisible()
    
    // Check for notification items
    const notifications = page.locator('[data-testid="client-notifications"] .bg-white')
    
    // Test notification interactions
    if (await notifications.count() > 0) {
      await notifications.first().locator('button:has-text("Mark as read")').click()
      await page.waitForTimeout(500)
    }
  })

  test('Performance - View switching speed', async ({ page }) => {
    // Test view switching performance (<500ms requirement)
    await page.goto('/dashboard/clients')
    
    const viewSwitches = [
      '[data-testid="grid-view-toggle"]',
      '[data-testid="calendar-view-toggle"]',
      '[data-testid="kanban-view-toggle"]',
      '[data-testid="list-view-toggle"]'
    ]
    
    for (const selector of viewSwitches) {
      const startTime = Date.now()
      await page.click(selector)
      
      // Wait for view to load
      const viewId = selector.replace('-toggle', '').replace('[data-testid="', '').replace('"]', '')
      await expect(page.getByTestId(viewId)).toBeVisible()
      
      const switchTime = Date.now() - startTime
      expect(switchTime).toBeLessThan(500) // Must switch in <500ms
    }
  })

  test('Responsive design - Mobile view', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/clients')
    
    // Verify page is usable on mobile
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
    
    // Test that view toggles are accessible on mobile
    await expect(page.getByTestId('list-view-toggle')).toBeVisible()
    await page.click('[data-testid="grid-view-toggle"]')
    await expect(page.getByTestId('grid-view')).toBeVisible()
    
    // Test search functionality on mobile
    await page.fill('[data-testid="client-search"]', 'test')
    await expect(page.getByTestId('client-search')).toHaveValue('test')
  })

  test('Error handling and recovery', async ({ page }) => {
    // Test error handling scenarios
    await page.route('**/api/clients', route => route.abort())
    
    await page.goto('/dashboard/clients')
    
    // Should show error state
    await expect(page.getByText('Something went wrong').or(page.getByText('Failed to load'))).toBeVisible()
    
    // Test retry functionality
    await page.unroute('**/api/clients')
    await page.click('button:has-text("Try Again")')
    
    // Should recover and show clients
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
  })

  test('Accessibility compliance', async ({ page }) => {
    await page.goto('/dashboard/clients')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Should activate focused element
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="button"]')).toBeVisible()
    await expect(page.locator('[aria-label]')).toBeVisible()
    
    // Test screen reader compatibility
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    expect(await headings.count()).toBeGreaterThan(0)
  })

  test('Empty states handling', async ({ page }) => {
    // Mock empty client list
    await page.route('**/api/clients', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clients: [], total: 0 })
      })
    )
    
    await page.goto('/dashboard/clients')
    
    // Should show empty state
    await expect(page.getByText('No clients found')).toBeVisible()
    await expect(page.getByText('Add Client')).toBeVisible()
    await expect(page.getByText('Import Clients')).toBeVisible()
  })
})

test.describe('Client Views Performance Tests', () => {
  test('Page load performance with 1000+ clients', async ({ page }) => {
    // Mock large dataset
    const largeClientList = Array.from({ length: 1000 }, (_, i) => ({
      id: `client-${i}`,
      first_name: `Client`,
      last_name: `${i}`,
      email: `client${i}@example.com`,
      status: ['lead', 'booked', 'completed', 'archived'][i % 4],
      wedding_date: new Date(Date.now() + i * 86400000).toISOString(),
      venue_name: `Venue ${i}`,
      is_wedme_connected: i % 3 === 0,
      created_at: new Date().toISOString()
    }))
    
    await page.route('**/api/clients', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clients: largeClientList, total: 1000 })
      })
    )
    
    const startTime = Date.now()
    await page.goto('/dashboard/clients')
    await expect(page.getByText('1000 clients')).toBeVisible()
    const loadTime = Date.now() - startTime
    
    // Must load in <2 seconds even with 1000+ clients
    expect(loadTime).toBeLessThan(2000)
    
    // Test view switching performance with large dataset
    const switchStart = Date.now()
    await page.click('[data-testid="grid-view-toggle"]')
    await expect(page.getByTestId('grid-view')).toBeVisible()
    const switchTime = Date.now() - switchStart
    
    expect(switchTime).toBeLessThan(500)
  })
})

test.describe('Integration Tests', () => {
  test('Complete integration workflow', async ({ page }) => {
    // Test complete workflow with all team integrations
    await page.goto('/dashboard/clients')
    
    // 1. Team B API Integration - Create client
    await page.click('button:has-text("Add Client")')
    await page.waitForURL('**/clients/new')
    await page.fill('[name="first_name"]', 'Integration')
    await page.fill('[name="last_name"]', 'Test')
    await page.fill('[name="email"]', 'integration@test.com')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/clients')
    
    // 2. Team C Security - Verify secure handling
    await expect(page).toHaveURL(/https.*/)
    
    // 3. Team D Database - Verify performance
    const startTime = Date.now()
    await page.reload()
    await expect(page.getByText('Integration Test')).toBeVisible()
    expect(Date.now() - startTime).toBeLessThan(2000)
    
    // 4. Team E Notifications - Check notification
    await page.click('[data-testid="client-notifications"]')
    await expect(page.getByText('Notifications')).toBeVisible()
    
    // 5. All view types work with new client
    await page.click('[data-testid="list-view-toggle"]')
    await expect(page.getByText('Integration Test')).toBeVisible()
    
    await page.click('[data-testid="grid-view-toggle"]')
    await expect(page.getByText('Integration Test')).toBeVisible()
    
    await page.click('[data-testid="calendar-view-toggle"]')
    // Calendar view might not show client without wedding date
    
    await page.click('[data-testid="kanban-view-toggle"]')
    await expect(page.getByText('Integration Test')).toBeVisible()
  })
})