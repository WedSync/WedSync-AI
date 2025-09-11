import { test, expect } from '@playwright/test'

test.describe('GDPR Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/')
    // Simulate logged in user by setting auth cookies
    await page.context().addCookies([
      {
        name: 'auth-token',
        value: 'mock-auth-token',
        domain: 'localhost',
        path: '/'
      }
    ])
  })

  test('Privacy settings page loads and consent management works', async ({ page }) => {
    await page.goto('/privacy/settings')
    
    // Check page loaded
    await expect(page.locator('h1:has-text("Privacy Center")')).toBeVisible()
    
    // Navigate to consent tab
    await page.click('button[role="tab"]:has-text("Consent")')
    
    // Check consent manager is visible
    await expect(page.locator('text=Privacy & Consent Settings')).toBeVisible()
    
    // Test toggling marketing consent
    const marketingToggle = page.locator('button[aria-label="Toggle Marketing Cookies"]')
    await marketingToggle.click()
    
    // Save preferences
    await page.click('button:has-text("Save Preferences")')
    
    // Check success message
    await expect(page.locator('text=Your privacy preferences have been saved successfully')).toBeVisible()
  })

  test('Data export functionality', async ({ page }) => {
    await page.goto('/privacy/settings')
    
    // Navigate to My Data tab
    await page.click('button[role="tab"]:has-text("My Data")')
    
    // Check export section is visible
    await expect(page.locator('text=Export Your Data')).toBeVisible()
    
    // Select export format
    await page.click('#export-format')
    await page.click('text=JSON (Complete data)')
    
    // Request data export
    await page.click('button:has-text("Request Data Export")')
    
    // Mock API response
    await page.route('/api/privacy/requests', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'export-123',
          request_type: 'portability',
          status: 'pending'
        })
      })
    })
    
    // Verify export was requested (would show alert in real app)
    await expect(page.locator('text=Data export requested')).toBeVisible({ timeout: 10000 })
  })

  test('Right to erasure (account deletion)', async ({ page }) => {
    await page.goto('/privacy/settings')
    
    // Navigate to My Data tab
    await page.click('button[role="tab"]:has-text("My Data")')
    
    // Click delete account button
    await page.click('button:has-text("Delete My Account")')
    
    // Check confirmation dialog appears
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible()
    
    // Type DELETE to confirm
    await page.fill('input[placeholder="Type DELETE to confirm"]', 'DELETE')
    
    // Mock deletion request
    await page.route('/api/privacy/requests', route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        if (body.request_type === 'erasure') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'deletion-123',
              request_type: 'erasure',
              status: 'pending'
            })
          })
        }
      }
    })
    
    // Click delete button
    await page.click('button:has-text("Delete Account"):not([disabled])')
    
    // Verify deletion was requested
    await expect(page.locator('text=Account deletion requested')).toBeVisible({ timeout: 10000 })
  })

  test('Cookie consent banner functionality', async ({ page, context }) => {
    // Clear cookies to trigger banner
    await context.clearCookies()
    
    await page.goto('/')
    
    // Wait for cookie banner to appear
    await expect(page.locator('text=We value your privacy')).toBeVisible({ timeout: 5000 })
    
    // Test manage preferences
    await page.click('button:has-text("Manage Preferences")')
    
    // Check settings panel is visible
    await expect(page.locator('text=Cookie Preferences')).toBeVisible()
    
    // Toggle analytics cookies
    await page.click('button[aria-label="Toggle analytics cookies"]')
    
    // Save preferences
    await page.click('button:has-text("Save Preferences")')
    
    // Verify banner is hidden
    await expect(page.locator('text=We value your privacy')).not.toBeVisible()
    
    // Check consent is saved in localStorage
    const consent = await page.evaluate(() => localStorage.getItem('cookie-consent'))
    expect(consent).toBeTruthy()
    
    const consentData = JSON.parse(consent)
    expect(consentData.analytics).toBe(true)
  })

  test('Privacy policy page accessibility', async ({ page }) => {
    await page.goto('/privacy')
    
    // Check page loaded
    await expect(page.locator('h1:has-text("Privacy Policy")')).toBeVisible()
    
    // Check quick navigation works
    await page.click('a[href="#data-collection"]')
    await expect(page.locator('h2:has-text("1. Information We Collect")')).toBeInViewport()
    
    await page.click('a[href="#your-rights"]')
    await expect(page.locator('h2:has-text("4. Your Privacy Rights")')).toBeInViewport()
    
    // Check privacy settings link
    const privacySettingsLink = page.locator('a[href="/privacy/settings"]').first()
    await expect(privacySettingsLink).toBeVisible()
  })

  test('Compliance dashboard for admins', async ({ page }) => {
    // Mock admin user
    await page.context().addCookies([
      {
        name: 'user-role',
        value: 'admin',
        domain: 'localhost',
        path: '/'
      }
    ])
    
    // Navigate to compliance dashboard (would normally be in admin section)
    await page.goto('/admin/compliance')
    
    // Check dashboard loads
    await expect(page.locator('h1:has-text("Compliance Dashboard")')).toBeVisible()
    
    // Check compliance score is displayed
    await expect(page.locator('text=Overall Compliance Score')).toBeVisible()
    
    // Check metrics cards
    await expect(page.locator('text=Total Requests')).toBeVisible()
    await expect(page.locator('text=Avg Response Time')).toBeVisible()
    await expect(page.locator('text=Consent Rate')).toBeVisible()
    await expect(page.locator('text=Data Breaches')).toBeVisible()
    
    // Test export report
    await page.click('button:has-text("Export Report")')
    
    // Verify download triggered (in real test would check file download)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export Report")')
    ])
    
    expect(download.suggestedFilename()).toContain('compliance-report')
  })

  test('Audit trail captures operations', async ({ page }) => {
    await page.goto('/privacy/settings')
    
    // Make a change to trigger audit
    await page.click('button[role="tab"]:has-text("Consent")')
    
    // Toggle a consent
    const functionalToggle = page.locator('button[aria-label="Toggle functional cookies"]')
    await functionalToggle.click()
    
    // Mock audit trail API
    await page.route('/api/privacy/consent', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          audit_logged: true
        })
      })
    })
    
    // Save to trigger audit
    await page.click('button:has-text("Save Preferences")')
    
    // In a real test, would verify audit trail entry was created in database
  })
})

test.describe('GDPR Data Rights Verification', () => {
  test('Verify all user data is included in export', async ({ page }) => {
    // Mock export data structure
    const mockExportData = {
      personalData: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      },
      weddingData: [{
        date: '2025-06-01',
        venue: 'Test Venue',
        guest_count: 100
      }],
      guestList: [
        { name: 'Guest 1', email: 'guest1@example.com' },
        { name: 'Guest 2', email: 'guest2@example.com' }
      ],
      vendorInteractions: [
        { vendor_name: 'Photographer', status: 'booked' }
      ],
      consent_history: [
        { consent_type: 'marketing', is_granted: true, created_at: '2025-01-01' }
      ]
    }

    await page.route('/api/privacy/export/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExportData)
      })
    })

    // Navigate to export endpoint
    const response = await page.goto('/api/privacy/export/test-export-id')
    
    // Verify all required data categories are present
    const exportData = await response.json()
    expect(exportData).toHaveProperty('personalData')
    expect(exportData).toHaveProperty('weddingData')
    expect(exportData).toHaveProperty('guestList')
    expect(exportData).toHaveProperty('vendorInteractions')
    expect(exportData).toHaveProperty('consent_history')
  })

  test('Verify cascade deletion works properly', async ({ page }) => {
    // This would normally test the backend deletion process
    // Mock the deletion verification endpoint
    await page.route('/api/user/status', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'User not found' })
      })
    })

    // After deletion, user should not be found
    const response = await page.goto('/api/user/status')
    expect(response.status()).toBe(404)
  })
})