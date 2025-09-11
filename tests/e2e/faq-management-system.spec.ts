// FAQ Management System E2E Tests - Feature ID: WS-070
// Comprehensive testing for wedding client support automation

import { test, expect } from '@playwright/test'

test.describe('FAQ Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a supplier/photographer
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'photographer@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
  })

  test.describe('FAQ Manager Interface', () => {
    test('should display FAQ management dashboard', async ({ page }) => {
      await page.goto('/faq')
      
      // Verify main elements are present
      await expect(page.locator('h1')).toContainText('FAQ Management')
      await expect(page.locator('[data-testid="create-faq"]')).toBeVisible()
      
      // Check dashboard overview cards
      await expect(page.locator('[data-testid="total-faqs"]')).toBeVisible()
      await expect(page.locator('[data-testid="views-30d"]')).toBeVisible()
      await expect(page.locator('[data-testid="helpfulness"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-success"]')).toBeVisible()

      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'evidence/faq-manager-dashboard.png',
        fullPage: true 
      })
    })

    test('should create a new FAQ successfully', async ({ page }) => {
      await page.goto('/faq')
      
      // Click create FAQ button
      await page.click('[data-testid="create-faq"]')
      await expect(page.locator('[data-testid="faq-editor-modal"]')).toBeVisible()

      // Fill in FAQ details
      await page.fill('[data-testid="faq-question"]', 'When will my wedding photos be ready?')
      
      // Select category
      await page.selectOption('[data-testid="faq-category"]', 'timeline-delivery')
      
      // Fill in comprehensive answer
      await page.fill('[data-testid="faq-answer"]', 
        'Your wedding photos will be delivered within 4-6 weeks after your wedding day. ' +
        'We provide a sneak peek gallery within 48 hours featuring 15-20 highlight images. ' +
        'The full gallery includes professionally edited photos with color correction and retouching.')
      
      // Add search tags
      await page.fill('[data-testid="search-tags"]', 'photos, delivery, timeline, wedding day, editing')
      
      // Enable publishing
      await page.check('[data-testid="is-published"]')
      
      // Save FAQ
      await page.click('[data-testid="save-faq"]')
      await expect(page.locator('[data-testid="success-message"]')).toContainText('FAQ created successfully')

      // Verify FAQ appears in list
      await expect(page.locator('[data-testid="faq-list"]')).toContainText('When will my wedding photos be ready?')

      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'evidence/faq-creation-success.png',
        fullPage: true 
      })
    })

    test('should edit existing FAQ', async ({ page }) => {
      await page.goto('/faq')
      
      // Click edit on first FAQ
      await page.click('[data-testid="faq-item"]:first-child [data-testid="edit-faq"]')
      await expect(page.locator('[data-testid="faq-editor-modal"]')).toBeVisible()

      // Modify the answer
      await page.fill('[data-testid="faq-answer"]', 
        'UPDATED: Your wedding photos will be delivered within 3-4 weeks after your wedding day. ' +
        'We now provide faster turnaround with our new editing workflow.')
      
      // Save changes
      await page.click('[data-testid="save-faq"]')
      await expect(page.locator('[data-testid="success-message"]')).toContainText('FAQ updated successfully')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-edit-success.png' })
    })

    test('should perform bulk operations on FAQs', async ({ page }) => {
      await page.goto('/faq')
      
      // Select multiple FAQs
      await page.check('[data-testid="select-all-faqs"]')
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()

      // Perform bulk publish
      await page.click('[data-testid="bulk-publish"]')
      await expect(page.locator('[data-testid="success-message"]')).toContainText('FAQs updated successfully')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-bulk-operations.png' })
    })
  })

  test.describe('FAQ Search Functionality', () => {
    test('should perform basic search', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Perform search
      const searchInput = page.locator('[data-testid="faq-search"]')
      await searchInput.fill('photos ready')
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]')
      await expect(page.locator('[data-testid="search-results"]')).toContainText('When will my wedding photos be ready?')

      // Verify search performance
      const searchDuration = await page.locator('[data-testid="search-duration"]').textContent()
      expect(parseInt(searchDuration?.match(/\d+/)?.[0] || '0')).toBeLessThan(300) // <300ms requirement

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-basic-search.png' })
    })

    test('should handle fuzzy search', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Test fuzzy search with typos/partial words
      await page.fill('[data-testid="faq-search"]', 'pic delivery time')
      
      // Should still find the photo delivery FAQ
      await page.waitForSelector('[data-testid="search-results"]')
      await expect(page.locator('[data-testid="search-results"]')).toContainText('When will my wedding photos be ready?')

      // Test another fuzzy search
      await page.fill('[data-testid="faq-search"]', 'rain weather backup')
      await page.waitForSelector('[data-testid="search-results"]')
      
      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-fuzzy-search.png' })
    })

    test('should display search suggestions', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Type partial search query
      await page.fill('[data-testid="faq-search"]', 'photo')
      
      // Wait for and verify suggestions appear
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-suggestions"]')).toContainText('photos ready')

      // Click on a suggestion
      await page.click('[data-testid="suggestion"]:first-child')
      await page.waitForSelector('[data-testid="search-results"]')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-search-suggestions.png' })
    })
  })

  test.describe('FAQ Categorization and Filtering', () => {
    test('should filter FAQs by category', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Click on Timeline & Delivery category
      await page.click('[data-category="timeline-delivery"]')
      
      // Verify category filtering
      await expect(page.locator('[data-testid="category-title"]')).toContainText('Timeline & Delivery Questions')
      await expect(page.locator('[data-testid="faq-results"]')).toBeVisible()

      // Verify URL includes category filter
      expect(page.url()).toContain('category=timeline-delivery')

      // Test showing all categories
      await page.click('[data-testid="show-all-categories"]')
      await expect(page.locator('[data-testid="all-categories"]')).toBeVisible()

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-category-filtering.png' })
    })

    test('should display category overview', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Verify all wedding categories are present
      const expectedCategories = [
        'Booking & Pricing',
        'Timeline & Delivery',
        'Photography Process',
        'Wedding Day Logistics',
        'Packages & Add-ons',
        'Weather & Backup Plans',
        'Image Rights & Usage',
        'Payment & Contracts'
      ]

      for (const category of expectedCategories) {
        await expect(page.locator('[data-testid="category-card"]')).toContainText(category)
      }

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-category-overview.png' })
    })
  })

  test.describe('FAQ Analytics Tracking', () => {
    test('should track FAQ views', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Perform search to find a FAQ
      await page.fill('[data-testid="faq-search"]', 'photos ready')
      await page.waitForSelector('[data-testid="search-results"]')

      // Click on a FAQ to expand it
      await page.click('[data-faq="photo-delivery-timeline"]')
      
      // Verify FAQ expansion and view tracking
      await expect(page.locator('[data-testid="faq-content"]')).toContainText('Your wedding photos will be delivered')

      // Navigate to analytics dashboard (as supplier)
      await page.goto('/faq/analytics')
      
      // Verify analytics tracking shows the view
      await expect(page.locator('[data-testid="analytics-views"]')).toContainText('Photo delivery FAQ: 1 view')
      await expect(page.locator('[data-testid="search-queries"]')).toContainText('Search query: "photos ready"')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-analytics-tracking.png' })
    })

    test('should track helpful/unhelpful feedback', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Find and expand a FAQ
      await page.fill('[data-testid="faq-search"]', 'timeline')
      await page.waitForSelector('[data-testid="search-results"]')
      await page.click('[data-testid="faq-item"]:first-child')

      // Provide helpful feedback
      await page.click('[data-testid="helpful-yes"]')
      await expect(page.locator('[data-testid="feedback-thanks"]')).toContainText('Thank you for your feedback!')

      // Navigate to analytics to verify tracking
      await page.goto('/faq/analytics')
      await expect(page.locator('[data-testid="helpful-votes"]')).toContainText('1 helpful vote')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-feedback-tracking.png' })
    })

    test('should display analytics dashboard', async ({ page }) => {
      await page.goto('/faq/analytics')
      
      // Verify key analytics metrics are displayed
      await expect(page.locator('[data-testid="total-views"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-success-rate"]')).toBeVisible()
      await expect(page.locator('[data-testid="helpfulness-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible()

      // Verify top search terms section
      await expect(page.locator('[data-testid="top-search-terms"]')).toBeVisible()
      
      // Verify content gaps section
      await expect(page.locator('[data-testid="content-gaps"]')).toBeVisible()
      
      // Verify business impact summary
      await expect(page.locator('[data-testid="business-impact"]')).toBeVisible()

      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'evidence/faq-analytics-dashboard.png',
        fullPage: true 
      })
    })
  })

  test.describe('Client Dashboard Integration', () => {
    test('should display FAQ section in client dashboard', async ({ page }) => {
      await page.goto('/clients/wedding-client-123')
      
      // Test FAQ section in dashboard
      await page.click('[data-testid="dashboard-faq-section"]')
      
      // Verify FAQ integration
      await expect(page.locator('[data-testid="faq-widget"]')).toContainText('Frequently Asked Questions')
      
      // Test recommended FAQs based on wedding timeline
      await expect(page.locator('[data-testid="recommended-faqs"]')).toContainText('Recommended for you:')

      // Click on a recommended FAQ
      await page.click('[data-testid="recommended-faq"]:first-child')
      await expect(page.locator('[data-testid="faq-modal"]')).toBeVisible()

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-dashboard-integration.png' })
    })

    test('should handle FAQ search from dashboard', async ({ page }) => {
      await page.goto('/clients/wedding-client-123')
      
      // Access FAQ widget and perform search
      await page.click('[data-testid="dashboard-faq-section"]')
      await page.fill('[data-testid="dashboard-faq-search"]', 'delivery')
      await page.waitForSelector('[data-testid="dashboard-faq-results"]')
      
      // Verify search results within dashboard context
      await expect(page.locator('[data-testid="dashboard-faq-results"]')).toContainText('photos will be delivered')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-dashboard-search.png' })
    })
  })

  test.describe('FAQ Organization and Management', () => {
    test('should reorder FAQs with drag and drop', async ({ page }) => {
      await page.goto('/faq/manager')
      
      // Test FAQ reordering
      const sourceElement = page.locator('[data-faq="photo-delivery"][data-testid="faq-item"]')
      const targetElement = page.locator('[data-testid="faq-list"][data-position="0"]')
      
      await sourceElement.dragTo(targetElement)
      
      // Verify reordering worked
      await expect(page.locator('[data-testid="faq-list"] [data-testid="faq-item"]:first-child'))
        .toContainText('When will my wedding photos be ready?')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-drag-drop-reorder.png' })
    })

    test('should perform bulk operations', async ({ page }) => {
      await page.goto('/faq/manager')
      
      // Select multiple FAQs for bulk operations
      await page.click('[data-testid="select-multiple"]')
      
      await page.check('[data-faq="faq-1"][data-testid="faq-checkbox"]')
      await page.check('[data-faq="faq-2"][data-testid="faq-checkbox"]')
      
      // Perform bulk category change
      await page.click('[data-testid="bulk-edit-category"]')
      await page.selectOption('[data-testid="bulk-category-select"]', 'timeline-delivery')
      await page.click('[data-testid="apply-bulk-changes"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bulk update completed')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-bulk-operations.png' })
    })
  })

  test.describe('Performance Measurement', () => {
    test('should measure search response time', async ({ page }) => {
      await page.goto('/client-portal/faq')
      
      // Enable performance timing
      await page.addInitScript(() => {
        window.performance.mark = window.performance.mark || function() {}
        window.performance.measure = window.performance.measure || function() {}
      })

      // Perform search and measure performance
      const searchStartTime = Date.now()
      await page.fill('[data-testid="faq-search"]', 'wedding photos timeline')
      await page.waitForSelector('[data-testid="search-results"]')
      const searchEndTime = Date.now()
      
      const searchDuration = searchEndTime - searchStartTime
      expect(searchDuration).toBeLessThan(300) // Requirement: <300ms
      
      console.log(`FAQ Search Response Time: ${searchDuration}ms`)

      // Test comprehensive search performance
      const performanceMetrics = await page.evaluate(() => {
        const faqSearch = performance.getEntriesByName('faq-search')[0]
        const faqLoad = performance.getEntriesByName('faq-load')[0]
        const analyticsProcessing = performance.getEntriesByName('faq-analytics')[0]
        
        return {
          searchResponseTime: faqSearch?.duration || 0,
          faqLoadTime: faqLoad?.duration || 0,
          analyticsProcessingTime: analyticsProcessing?.duration || 0
        }
      })
      
      // Verify all performance metrics meet requirements
      expect(performanceMetrics.searchResponseTime).toBeLessThan(300)
      console.log('FAQ Performance Metrics:', performanceMetrics)

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-performance-metrics.png' })
    })

    test('should handle large FAQ datasets efficiently', async ({ page }) => {
      // This test would require seeding the database with many FAQs
      await page.goto('/client-portal/faq')
      
      // Test search with many results
      await page.fill('[data-testid="faq-search"]', 'wedding')
      
      const startTime = Date.now()
      await page.waitForSelector('[data-testid="search-results"]')
      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(300)
      
      // Verify pagination works efficiently
      if (await page.locator('[data-testid="pagination"]').isVisible()) {
        await page.click('[data-testid="next-page"]')
        await page.waitForSelector('[data-testid="search-results"]')
      }

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-large-dataset-performance.png' })
    })
  })

  test.describe('FAQ System Integration', () => {
    test('should integrate with client communication workflows', async ({ page }) => {
      // Test FAQ suggestions in client communication
      await page.goto('/clients/wedding-client-123/messages')
      
      // Type a message that could be answered by FAQ
      await page.fill('[data-testid="message-input"]', 'When will our photos be ready?')
      
      // Check if FAQ suggestions appear
      await expect(page.locator('[data-testid="faq-suggestions"]')).toBeVisible()
      await expect(page.locator('[data-testid="faq-suggestion"]')).toContainText('FAQ: Photo delivery timeline')

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-communication-integration.png' })
    })

    test('should support FAQ visibility based on client status', async ({ page }) => {
      // Test FAQ visibility for different client types
      await page.goto('/client-portal/faq')
      
      // Verify client can only see published FAQs
      const faqItems = await page.locator('[data-testid="faq-item"]').all()
      
      for (const item of faqItems) {
        const statusBadge = item.locator('[data-testid="faq-status"]')
        if (await statusBadge.isVisible()) {
          await expect(statusBadge).toContainText('Published')
        }
      }

      // Take screenshot for evidence
      await page.screenshot({ path: 'evidence/faq-client-visibility.png' })
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Capture additional debugging info on test failure
    if (testInfo.status !== 'passed') {
      const screenshot = await page.screenshot({ fullPage: true })
      await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' })
      
      // Capture console errors
      const logs = await page.evaluate(() => {
        return window.console?.errors || []
      })
      
      if (logs.length > 0) {
        await testInfo.attach('console-errors', { 
          body: JSON.stringify(logs, null, 2), 
          contentType: 'application/json' 
        })
      }
    }
  })
})