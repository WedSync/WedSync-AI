import { test, expect, Page } from '@playwright/test'

test.describe('Client Profile Integration (WS-002)', () => {
  let page: Page
  let clientId: string

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-submit"]')
    await expect(page).toHaveURL('/dashboard')
    
    // Create a test client for integration testing
    const response = await page.request.post('/api/clients', {
      data: {
        first_name: 'John',
        last_name: 'Smith',
        partner_first_name: 'Jane',
        partner_last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '+44 123 456 7890',
        wedding_date: '2025-08-15',
        venue_name: 'Test Venue',
        status: 'booked',
        package_name: 'Premium Package',
        package_price: 2500
      }
    })
    
    expect(response.status()).toBe(201)
    const client = await response.json()
    clientId = client.id
  })

  test.afterEach(async () => {
    // Cleanup test client
    if (clientId) {
      await page.request.delete(`/api/clients/${clientId}`)
    }
    await page.close()
  })

  test('Complete client profile workflow from Team A integration', async () => {
    // Test navigation from Team A's client list to profile
    await page.goto('/dashboard/clients')
    await expect(page.getByTestId('client-search')).toBeVisible()
    
    // Search for our test client
    await page.fill('[data-testid="client-search"]', 'John Smith')
    await page.waitForTimeout(1000) // Wait for search
    
    // Click on client row (Team A integration point)
    const clientRow = page.locator(`[data-client-id="${clientId}"]`).first()
    await expect(clientRow).toBeVisible()
    await clientRow.click()
    
    // Verify navigation to profile page
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`))
    
    // Test profile header loads with Team A data
    await expect(page.getByTestId('profile-header')).toBeVisible()
    await expect(page.getByTestId('client-name')).toContainText('John Smith & Jane Smith')
    
    // Verify all profile data is displayed correctly
    await expect(page.getByText('john.smith@example.com')).toBeVisible()
    await expect(page.getByText('+44 123 456 7890')).toBeVisible()
    await expect(page.getByText('Test Venue')).toBeVisible()
    await expect(page.getByText('Premium Package')).toBeVisible()
  })

  test('Profile tabs navigation and content loading', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Test all profile tabs are accessible
    const tabs = ['info-tab', 'activity-tab', 'documents-tab', 'notes-tab', 'journey-tab']
    
    for (const tabId of tabs) {
      await page.click(`[data-testid="${tabId}"]`)
      await page.waitForTimeout(500) // Wait for tab content to load
      
      // Verify corresponding content is visible
      const contentId = tabId.replace('-tab', '')
      if (contentId === 'info') {
        await expect(page.getByTestId('client-info')).toBeVisible()
      } else {
        await expect(page.locator(`[data-testid="${contentId}-${contentId === 'activity' ? 'feed' : contentId === 'documents' ? 'list' : 'section'}"]`)).toBeVisible()
      }
    }
  })

  test('Profile information display and structure', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    await page.click('[data-testid="info-tab"]')
    
    const infoSection = page.getByTestId('client-info')
    await expect(infoSection).toBeVisible()
    
    // Test wedding information section
    await expect(infoSection.getByText('Wedding Information')).toBeVisible()
    await expect(infoSection.getByText('Test Venue')).toBeVisible()
    
    // Test booking information section
    await expect(infoSection.getByText('Booking Information')).toBeVisible()
    await expect(infoSection.getByText('Premium Package')).toBeVisible()
    await expect(infoSection.getByText('£2,500')).toBeVisible()
    
    // Test contact details section
    await expect(infoSection.getByText('Contact Details')).toBeVisible()
    await expect(infoSection.getByText('john.smith@example.com')).toBeVisible()
    await expect(infoSection.getByText('+44 123 456 7890')).toBeVisible()
  })

  test('Activity feed functionality', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    await page.click('[data-testid="activity-tab"]')
    
    const activityFeed = page.getByTestId('activity-feed')
    await expect(activityFeed).toBeVisible()
    
    // Should show client creation activity
    await expect(activityFeed.getByText('Client created')).toBeVisible()
    
    // Test refresh functionality
    await page.click('button:has-text("Refresh")')
    await page.waitForTimeout(1000)
    await expect(activityFeed).toBeVisible()
  })

  test('Notes system with RBAC integration (Team C)', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    await page.click('[data-testid="notes-tab"]')
    
    const notesSection = page.getByTestId('notes-section')
    await expect(notesSection).toBeVisible()
    
    // Test adding a new note
    await page.click('button:has-text("Add Note")')
    
    // Fill note form
    await page.selectOption('select[name="note_type"]', 'client')
    await page.selectOption('select[name="visibility"]', 'public')
    await page.fill('textarea', 'Test note for client profile integration')
    
    // Save note
    await page.click('button:has-text("Save Note")')
    
    // Verify note appears in list
    await expect(notesSection.getByText('Test note for client profile integration')).toBeVisible()
    
    // Test note editing
    await page.click('button[title="Edit note"]')
    await page.fill('textarea', 'Updated test note content')
    await page.click('button:has-text("Save")')
    
    // Verify updated content
    await expect(notesSection.getByText('Updated test note content')).toBeVisible()
  })

  test('Document management system', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    await page.click('[data-testid="documents-tab"]')
    
    const documentsSection = page.getByTestId('document-manager')
    await expect(documentsSection).toBeVisible()
    
    // Should show empty state initially
    await expect(documentsSection.getByText('No documents found')).toBeVisible()
    
    // Test search functionality
    await page.fill('input[placeholder="Search documents..."]', 'contract')
    await page.waitForTimeout(500)
    
    // Test category filtering
    await page.selectOption('select', 'Contract')
    await page.waitForTimeout(500)
    
    // Test view mode toggle
    await page.click('button:has-text("List")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Grid")')
  })

  test('Profile editing with real-time updates (Team E integration)', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Click edit profile button
    await page.click('button:has-text("Edit Profile")')
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}/edit$`))
    
    // Update partner email
    await page.fill('[data-testid="partner-email"]', 'jane.updated@example.com')
    await page.click('button:has-text("Save Changes")')
    
    // Should show success notification (Team E integration)
    await expect(page.getByText('Profile updated')).toBeVisible()
    
    // Navigate back to profile
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Verify updated information is displayed
    await expect(page.getByText('jane.updated@example.com')).toBeVisible()
  })

  test('Performance requirements validation', async () => {
    const startTime = Date.now()
    
    // Navigate to profile page
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Wait for profile header to be visible (main content loaded)
    await expect(page.getByTestId('profile-header')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Profile should load in <1.5 seconds as per requirements
    expect(loadTime).toBeLessThan(1500)
    console.log(`Profile load time: ${loadTime}ms`)
  })

  test('Tab switching performance', async () => {
    await page.goto(`/dashboard/clients/${clientId}`)
    
    const tabs = ['activity-tab', 'documents-tab', 'notes-tab', 'info-tab']
    
    for (const tabId of tabs) {
      const startTime = Date.now()
      
      await page.click(`[data-testid="${tabId}"]`)
      
      // Wait for content to be visible
      const contentId = tabId.replace('-tab', '')
      if (contentId === 'info') {
        await expect(page.getByTestId('client-info')).toBeVisible()
      } else {
        await expect(page.locator(`[data-testid*="${contentId}"]`)).toBeVisible()
      }
      
      const switchTime = Date.now() - startTime
      
      // Tab switching should be <300ms as per requirements
      expect(switchTime).toBeLessThan(300)
      console.log(`Tab switch time (${tabId}): ${switchTime}ms`)
    }
  })

  test('Mobile responsive design', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Profile header should be visible and responsive
    await expect(page.getByTestId('profile-header')).toBeVisible()
    
    // Client name should be visible
    await expect(page.getByTestId('client-name')).toBeVisible()
    
    // Tabs should be accessible on mobile
    await page.click('[data-testid="activity-tab"]')
    await expect(page.getByTestId('activity-feed')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    
    await expect(page.getByTestId('profile-header')).toBeVisible()
    await expect(page.getByTestId('client-name')).toBeVisible()
  })

  test('Error handling and edge cases', async () => {
    // Test with invalid client ID
    await page.goto('/dashboard/clients/invalid-uuid')
    await expect(page.getByText('Invalid client ID format')).toBeVisible()
    
    // Test with non-existent client ID
    await page.goto('/dashboard/clients/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('Client not found')).toBeVisible()
    
    // Test network error handling
    await page.route('/api/clients/**/activities', route => route.abort())
    await page.goto(`/dashboard/clients/${clientId}`)
    await page.click('[data-testid="activity-tab"]')
    
    // Should show error state or loading state gracefully
    await expect(page.getByTestId('activity-feed')).toBeVisible()
  })

  test('Security and permissions validation', async () => {
    // Test RBAC integration (Team C)
    await page.goto(`/dashboard/clients/${clientId}`)
    
    // Edit button should be visible for authorized users
    await expect(page.getByText('Edit Profile')).toBeVisible()
    
    // Notes section should respect visibility permissions
    await page.click('[data-testid="notes-tab"]')
    await page.click('button:has-text("Add Note")')
    
    // Internal visibility should be available if user has permissions
    const visibilitySelect = page.locator('select[name="visibility"]')
    await expect(visibilitySelect).toBeVisible()
  })
})

test.describe('API Integration Testing', () => {
  test('Client profile API endpoints', async ({ request }) => {
    // Test client profile GET endpoint
    const profileResponse = await request.get('/api/clients/test-client-id', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    })
    
    // Should handle authentication properly
    expect([401, 403, 404].includes(profileResponse.status())).toBeTruthy()
  })

  test('Activity feed API endpoints', async ({ request }) => {
    // Test activities GET endpoint
    const activitiesResponse = await request.get('/api/clients/test-client-id/activities')
    
    // Should require authentication
    expect(activitiesResponse.status()).toBe(401)
  })

  test('Notes API endpoints', async ({ request }) => {
    // Test notes GET endpoint
    const notesResponse = await request.get('/api/clients/test-client-id/notes')
    
    // Should require authentication
    expect(notesResponse.status()).toBe(401)
    
    // Test notes POST endpoint
    const createNoteResponse = await request.post('/api/clients/test-client-id/notes', {
      data: {
        content: 'Test API note',
        note_type: 'client',
        visibility: 'public'
      }
    })
    
    // Should require authentication
    expect(createNoteResponse.status()).toBe(401)
  })
})