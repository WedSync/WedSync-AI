import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

test.describe('Vendor Portal Flow', () => {
  let supabase: ReturnType<typeof createClient>
  let testVendorId: string
  let testClientId: string

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test data
    // Note: In a real test, this would use a test-specific database
    const { data: testVendor } = await supabase
      .from('suppliers')
      .insert({
        business_name: 'Test E2E Photography',
        slug: 'test-e2e-photography',
        primary_category: 'photography',
        email: 'test-vendor@example.com',
        is_published: true,
        organization_id: 'test-org-id'
      })
      .select()
      .single()
    
    testVendorId = testVendor?.id

    const { data: testClient } = await supabase
      .from('clients')
      .insert({
        first_name: 'John',
        last_name: 'Doe',
        partner_first_name: 'Jane',
        partner_last_name: 'Doe',
        email: 'test-couple@example.com',
        wedding_date: '2024-06-15',
        venue_name: 'Test Venue',
        status: 'booked',
        organization_id: 'test-org-id'
      })
      .select()
      .single()

    testClientId = testClient?.id

    // Create vendor-client connection
    await supabase
      .from('supplier_client_connections')
      .insert({
        supplier_id: testVendorId,
        client_id: testClientId,
        organization_id: 'test-org-id',
        connection_type: 'primary',
        connection_status: 'active',
        can_view_core_fields: true
      })
  })

  test.afterAll(async () => {
    // Clean up test data
    if (testVendorId && testClientId) {
      await supabase.from('supplier_client_connections').delete().eq('supplier_id', testVendorId)
      await supabase.from('suppliers').delete().eq('id', testVendorId)
      await supabase.from('clients').delete().eq('id', testClientId)
    }
  })

  test('vendor can access portal and view assigned weddings', async ({ page }) => {
    // Navigate to vendor portal
    await page.goto('/vendor-portal')

    // Should be redirected to login if not authenticated
    await expect(page).toHaveURL(/.*login/)

    // Simulate login (in real test, you'd have proper auth setup)
    await page.goto('/vendor-portal')
    
    // Mock authentication by setting up the page state
    await page.addInitScript(() => {
      // Mock user state
      window.localStorage.setItem('supabase.auth.token', 'mock-token')
    })

    // Wait for page to load
    await expect(page.getByText('Test E2E Photography')).toBeVisible({ timeout: 10000 })

    // Check main dashboard elements
    await expect(page.getByText('Active Weddings')).toBeVisible()
    await expect(page.getByText('Upcoming Weddings')).toBeVisible()
    await expect(page.getByText('Average Rating')).toBeVisible()
    await expect(page.getByText('Total Reviews')).toBeVisible()
  })

  test('vendor can navigate between tabs', async ({ page }) => {
    await page.goto('/vendor-portal')

    // Wait for page to load
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Test My Weddings tab
    await page.getByRole('button', { name: /My Weddings/i }).click()
    await expect(page.getByText('John Doe & Jane Doe')).toBeVisible()
    await expect(page.getByText('Test Venue')).toBeVisible()

    // Test Performance tab
    await page.getByRole('button', { name: /Performance/i }).click()
    await expect(page.getByText('Performance Dashboard')).toBeVisible()
    await expect(page.getByText('Overall Performance Score')).toBeVisible()

    // Test Communications tab
    await page.getByRole('button', { name: /Communications/i }).click()
    await expect(page.getByText('Vendor Communications')).toBeVisible()
    await expect(page.getByText('New Message')).toBeVisible()
  })

  test('vendor can view wedding details', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to My Weddings tab
    await page.getByRole('button', { name: /My Weddings/i }).click()

    // Click on a wedding to view details
    await page.getByRole('button', { name: /View Details/i }).first().click()

    // Should show detailed wedding information
    await expect(page.getByText('John Doe & Jane Doe')).toBeVisible()
    await expect(page.getByText('Wedding Details')).toBeVisible()
    await expect(page.getByText('Contact Information')).toBeVisible()
    await expect(page.getByText('Wedding Status')).toBeVisible()

    // Should show timeline access status
    await expect(page.getByText('Timeline Access')).toBeVisible()
    await expect(page.getByText('Full Timeline Access Granted')).toBeVisible()

    // Test back navigation
    await page.getByRole('button', { name: /Back to Weddings/i }).click()
    await expect(page.getByText('My Weddings')).toBeVisible()
  })

  test('vendor can filter weddings by status', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to My Weddings tab
    await page.getByRole('button', { name: /My Weddings/i }).click()

    // Test status filter
    const statusFilter = page.getByRole('combobox')
    await statusFilter.selectOption('upcoming')

    // Should show upcoming weddings only
    await expect(page.getByText(/Upcoming/i)).toBeVisible()

    // Test active filter
    await statusFilter.selectOption('active')
    await expect(page.getByText(/showing.*wedding/i)).toBeVisible()
  })

  test('vendor can search for weddings', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to My Weddings tab
    await page.getByRole('button', { name: /My Weddings/i }).click()

    // Test search functionality
    const searchInput = page.getByPlaceholder(/Search couples or venues/i)
    await searchInput.fill('John')

    // Should filter results
    await expect(page.getByText('John Doe & Jane Doe')).toBeVisible()

    // Test search with venue name
    await searchInput.fill('Test Venue')
    await expect(page.getByText('Test Venue')).toBeVisible()

    // Clear search
    await searchInput.fill('')
    await expect(page.getByText('John Doe & Jane Doe')).toBeVisible()
  })

  test('performance dashboard shows metrics correctly', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to Performance tab
    await page.getByRole('button', { name: /Performance/i }).click()

    // Should show performance scores
    await expect(page.getByText('Overall Performance Score')).toBeVisible()
    await expect(page.getByText('Delivery')).toBeVisible()
    await expect(page.getByText('Communication')).toBeVisible()
    await expect(page.getByText('Quality')).toBeVisible()
    await expect(page.getByText('Reliability')).toBeVisible()

    // Should show key metrics
    await expect(page.getByText('Key Performance Metrics')).toBeVisible()
    await expect(page.getByText('On-Time Delivery Rate')).toBeVisible()
    await expect(page.getByText('Average Response Time')).toBeVisible()
    await expect(page.getByText('Customer Satisfaction')).toBeVisible()

    // Should show business performance
    await expect(page.getByText('Business Performance')).toBeVisible()
    await expect(page.getByText('Completed Weddings')).toBeVisible()
    await expect(page.getByText('Active Weddings')).toBeVisible()
  })

  test('performance period selector works', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to Performance tab
    await page.getByRole('button', { name: /Performance/i }).click()

    // Test period selector
    const periodSelect = page.getByRole('combobox').first()
    await periodSelect.selectOption('1month')

    // Should still show performance data
    await expect(page.getByText('Overall Performance Score')).toBeVisible()

    // Test different periods
    await periodSelect.selectOption('1year')
    await expect(page.getByText('Performance Dashboard')).toBeVisible()
  })

  test('communications interface is accessible', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to Communications tab
    await page.getByRole('button', { name: /Communications/i }).click()

    // Should show communication interface
    await expect(page.getByText('Vendor Communications')).toBeVisible()
    await expect(page.getByText('New Message')).toBeVisible()

    // Should show tabs
    await expect(page.getByRole('button', { name: /Messages/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vendor Network/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Group Chats/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Notifications/i })).toBeVisible()

    // Test search functionality
    const searchInput = page.getByPlaceholder(/Search messages/i)
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')

    // Test priority filter
    const priorityFilter = page.getByRole('combobox').first()
    await priorityFilter.selectOption('high')
  })

  test('vendor network tab shows contacts', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Navigate to Communications tab
    await page.getByRole('button', { name: /Communications/i }).click()

    // Switch to Vendor Network tab
    await page.getByRole('button', { name: /Vendor Network/i }).click()

    // Should show vendor contacts interface
    await expect(page.getByText('No matching vendors').or(page.getByText('Message'))).toBeVisible()
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Main content should be visible on mobile
    await expect(page.getByText('Active Weddings')).toBeVisible()
    await expect(page.getByText('Upcoming Weddings')).toBeVisible()

    // Tabs should work on mobile
    await page.getByRole('button', { name: /My Weddings/i }).click()
    await expect(page.getByText('No weddings assigned').or(page.getByText('John Doe'))).toBeVisible()

    // Performance tab should work
    await page.getByRole('button', { name: /Performance/i }).click()
    await expect(page.getByText('Performance Dashboard')).toBeVisible()
  })

  test('accessibility features are present', async ({ page }) => {
    await page.goto('/vendor-portal')
    await expect(page.getByText('Test E2E Photography')).toBeVisible()

    // Check for proper headings
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // Check for proper button labels
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)

    // Check tab accessibility
    const tabs = page.getByRole('button', { name: /Dashboard|My Weddings|Performance|Communications/ })
    const tabCount = await tabs.count()
    expect(tabCount).toBe(4)

    // Check for form labels
    await page.getByRole('button', { name: /Communications/i }).click()
    const searchInput = page.getByPlaceholder(/Search messages/i)
    await expect(searchInput).toBeVisible()
  })
})