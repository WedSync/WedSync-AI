import { test, expect } from '@playwright/test'

test.describe('Budget Tracker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to budget tracker page
    await page.goto('/dashboard/clients/test-client-id/budget')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Budget Overview', () => {
    test('displays budget overview with summary cards', async ({ page }) => {
      // Check header
      await expect(page.getByText('Budget Tracker')).toBeVisible()
      
      // Check summary cards
      await expect(page.getByText('Total Budget')).toBeVisible()
      await expect(page.getByText('Total Spent')).toBeVisible()
      await expect(page.getByText('Remaining')).toBeVisible()
      await expect(page.getByText('At Risk')).toBeVisible()
      
      // Check for currency amounts
      await expect(page.locator('text=/\\$[0-9,]+/')).toHaveCount({ min: 3 })
    })

    test('shows budget progress bar', async ({ page }) => {
      await expect(page.getByText('Overall Progress')).toBeVisible()
      await expect(page.getByText(/\d+\.\d+% of budget used/)).toBeVisible()
      
      // Check progress bar exists
      await expect(page.locator('.bg-success-500, .bg-warning-500, .bg-error-500')).toBeVisible()
    })

    test('displays budget categories with progress', async ({ page }) => {
      await expect(page.getByText('Budget Categories')).toBeVisible()
      
      // Should show categories or empty state
      const hasCategories = await page.getByText('No budget categories set up yet').isVisible()
      
      if (!hasCategories) {
        // Check for category items
        await expect(page.locator('[data-testid="category-item"]')).toHaveCount({ min: 1 })
      } else {
        await expect(page.getByText('Set up categories')).toBeVisible()
      }
    })

    test('shows recent transactions', async ({ page }) => {
      await expect(page.getByText('Recent Transactions')).toBeVisible()
      
      // Should show transactions or empty state
      const hasTransactions = await page.getByText('No transactions yet').isVisible()
      
      if (!hasTransactions) {
        await expect(page.locator('[data-testid="transaction-item"]')).toHaveCount({ min: 1 })
      }
    })

    test('changes time period selector', async ({ page }) => {
      // Check period selector is present
      await expect(page.getByText('Month')).toBeVisible()
      await expect(page.getByText('Week')).toBeVisible()
      await expect(page.getByText('Quarter')).toBeVisible()
      
      // Click different periods
      await page.getByText('Week').click()
      await expect(page.getByText('Week')).toHaveClass(/bg-white/)
      
      await page.getByText('Quarter').click()
      await expect(page.getByText('Quarter')).toHaveClass(/bg-white/)
    })
  })

  test.describe('Category Management', () => {
    test('navigates to category management tab', async ({ page }) => {
      await page.getByText('Categories').click()
      await expect(page.getByText('Budget Categories')).toBeVisible()
      await expect(page.getByText('Organize your wedding budget into categories')).toBeVisible()
    })

    test('opens add category form', async ({ page }) => {
      await page.getByText('Categories').click()
      await page.getByText('Add Category').click()
      
      // Check form fields
      await expect(page.getByText('Add Category')).toBeVisible()
      await expect(page.getByPlaceholder('e.g., Venue, Catering, Photography')).toBeVisible()
      await expect(page.getByPlaceholder('0.0')).toBeVisible()
    })

    test('creates a new category with percentage input', async ({ page }) => {
      await page.getByText('Categories').click()
      await page.getByText('Add Category').click()
      
      // Fill form
      await page.getByPlaceholder('e.g., Venue, Catering, Photography').fill('Photography')
      await page.getByPlaceholder('0.0').fill('15')
      
      // Select color
      const colorButtons = page.locator('button[style*="background-color"]')
      await colorButtons.nth(2).click()
      
      // Add description
      await page.getByPlaceholder('Additional notes about this category...').fill('Wedding photography services')
      
      // Submit form
      await page.getByRole('button', { name: 'Add Category' }).click()
      
      // Should close form and show success
      await expect(page.getByText('Photography')).toBeVisible()
    })

    test('switches between percentage and amount input modes', async ({ page }) => {
      await page.getByText('Categories').click()
      await page.getByText('Add Category').click()
      
      // Default should be percentage mode
      await expect(page.getByPlaceholder('0.0')).toBeVisible()
      
      // Switch to amount mode
      await page.getByText('Amount').click()
      await expect(page.getByPlaceholder('0')).toBeVisible()
      await expect(page.getByText('$')).toBeVisible()
      
      // Enter amount and see percentage calculation
      await page.getByPlaceholder('0').fill('5000')
      await expect(page.getByText(/= \d+\.\d+% of total budget/)).toBeVisible()
    })

    test('validates form inputs', async ({ page }) => {
      await page.getByText('Categories').click()
      await page.getByText('Add Category').click()
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Add Category' }).click()
      
      // Check validation messages
      await expect(page.getByText('Category name is required')).toBeVisible()
      await expect(page.getByText('Budget amount must be greater than 0')).toBeVisible()
    })

    test('creates default categories', async ({ page }) => {
      await page.getByText('Categories').click()
      
      // Check if Use Defaults button is available (when no categories exist)
      const useDefaultsVisible = await page.getByText('Use Defaults').isVisible()
      
      if (useDefaultsVisible) {
        await page.getByText('Use Defaults').click()
        
        // Check modal content
        await expect(page.getByText('Set Up Default Categories')).toBeVisible()
        await expect(page.getByText('Venue')).toBeVisible()
        await expect(page.getByText('40%')).toBeVisible()
        
        // Create categories
        await page.getByText('Create Categories').click()
        
        // Should see categories created
        await expect(page.getByText('Venue')).toBeVisible()
      }
    })

    test('edits existing category', async ({ page }) => {
      await page.getByText('Categories').click()
      
      // Look for edit button (assuming categories exist)
      const editButton = page.locator('button[title="Edit"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        // Check edit form
        await expect(page.getByText('Edit Category')).toBeVisible()
        
        // Make changes
        await page.getByDisplayValue(/.+/).first().fill('Updated Category Name')
        
        // Submit
        await page.getByText('Update Category').click()
        
        // Should see updated name
        await expect(page.getByText('Updated Category Name')).toBeVisible()
      }
    })
  })

  test.describe('Transaction Entry', () => {
    test('opens transaction entry form', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Check form is displayed
      await expect(page.getByText('Add Expense')).toBeVisible()
      await expect(page.getByText('Record a new wedding expense')).toBeVisible()
    })

    test('creates a new transaction', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Fill form
      await page.getByLabel(/Amount/).fill('250.00')
      await page.getByLabel(/Description/).fill('Venue deposit')
      await page.getByLabel(/Category/).selectOption({ index: 1 }) // Select first available category
      await page.getByLabel(/Vendor/).fill('Grand Ballroom')
      
      // Add notes
      await page.getByPlaceholder('Additional notes about this expense...').fill('Initial venue deposit payment')
      
      // Submit form
      await page.getByRole('button', { name: 'Add Expense' }).click()
      
      // Should close form and refresh data
      await expect(page.getByText('Record a new wedding expense')).not.toBeVisible()
    })

    test('validates transaction form', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Add Expense' }).click()
      
      // Check validation messages
      await expect(page.getByText('Amount must be greater than 0')).toBeVisible()
      await expect(page.getByText('Description is required')).toBeVisible()
      await expect(page.getByText('Category is required')).toBeVisible()
    })

    test('uploads receipt file', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Create a test file
      const fileBuffer = Buffer.from('fake receipt data')
      
      // Upload file
      await page.setInputFiles('input[type="file"]', {
        name: 'receipt.jpg',
        mimeType: 'image/jpeg',
        buffer: fileBuffer
      })
      
      // Should show file info
      await expect(page.getByText('receipt.jpg')).toBeVisible()
      
      // Should show processing message if OCR is enabled
      const processingVisible = await page.getByText('Processing receipt...').isVisible()
      
      if (processingVisible) {
        await expect(page.getByText('Receipt processed!')).toBeVisible()
      }
    })

    test('manages tags', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Add tag
      await page.getByText('Add Tag').click()
      await page.getByPlaceholder('Tag name').fill('urgent')
      await page.keyboard.press('Enter')
      
      // Should show tag
      await expect(page.getByText('urgent')).toBeVisible()
      
      // Add another tag
      await page.getByText('Add Tag').click()
      await page.getByPlaceholder('Tag name').fill('deposit')
      await page.getByRole('button', { name: /check/i }).click()
      
      await expect(page.getByText('deposit')).toBeVisible()
      
      // Remove tag
      await page.locator('span:has-text("urgent") button').click()
      await expect(page.getByText('urgent')).not.toBeVisible()
    })

    test('cancels transaction entry', async ({ page }) => {
      await page.getByText('Add Expense').click()
      
      // Fill some data
      await page.getByLabel(/Amount/).fill('100')
      
      // Cancel
      await page.getByText('Cancel').click()
      
      // Should close form
      await expect(page.getByText('Record a new wedding expense')).not.toBeVisible()
    })
  })

  test.describe('Budget Analytics', () => {
    test('navigates to analytics tab', async ({ page }) => {
      await page.getByText('Analytics').click()
      
      await expect(page.getByText('Budget Analytics')).toBeVisible()
      await expect(page.getByText('Visual insights into your wedding spending')).toBeVisible()
    })

    test('switches between chart types', async ({ page }) => {
      await page.getByText('Analytics').click()
      
      // Check chart type selector
      await expect(page.getByText('Distribution')).toBeVisible()
      await expect(page.getByText('Comparison')).toBeVisible()
      await expect(page.getByText('Trends')).toBeVisible()
      await expect(page.getByText('Progress')).toBeVisible()
      
      // Switch to bar chart
      await page.getByText('Comparison').click()
      await expect(page.getByText('Comparison')).toHaveClass(/bg-white/)
      
      // Switch to trends
      await page.getByText('Trends').click()
      await expect(page.getByText('Trends')).toHaveClass(/bg-white/)
    })

    test('displays chart content or empty state', async ({ page }) => {
      await page.getByText('Analytics').click()
      
      // Should show either charts or empty state
      const hasData = await page.getByText('No budget data available').isVisible()
      
      if (hasData) {
        await expect(page.getByText('Set up budget categories to see analytics')).toBeVisible()
      } else {
        // Should have chart container
        await expect(page.locator('.recharts-wrapper')).toBeVisible()
      }
    })

    test('shows key insights when data is available', async ({ page }) => {
      await page.getByText('Analytics').click()
      
      // Look for insights section
      const insightsVisible = await page.getByText('Key Insights').isVisible()
      
      if (insightsVisible) {
        await expect(page.getByText(/Highest:/)).toBeVisible()
        await expect(page.getByText(/Over budget:/)).toBeVisible()
        await expect(page.getByText(/Budget used:/)).toBeVisible()
      }
    })
  })

  test.describe('Navigation and Integration', () => {
    test('navigates between tabs', async ({ page }) => {
      // Start on overview
      await expect(page.getByText('Budget Overview')).toBeVisible()
      
      // Go to categories
      await page.getByText('Categories').click()
      await expect(page.getByText('Organize your wedding budget into categories')).toBeVisible()
      
      // Go to transactions
      await page.getByText('Transactions').click()
      await expect(page.getByText('Recent Transactions')).toBeVisible()
      
      // Go to analytics
      await page.getByText('Analytics').click()
      await expect(page.getByText('Visual insights into your wedding spending')).toBeVisible()
      
      // Back to overview
      await page.getByText('Overview').click()
      await expect(page.getByText('Track your wedding spending and stay on budget')).toBeVisible()
    })

    test('refreshes data using refresh button', async ({ page }) => {
      // Click refresh button
      await page.getByRole('button', { name: /refresh/i }).click()
      
      // Should trigger data reload (check for loading state or updated content)
      await page.waitForTimeout(500) // Brief wait for refresh
    })

    test('exports budget data', async ({ page }) => {
      // Mock download
      const downloadPromise = page.waitForEvent('download')
      
      await page.getByText('Export').click()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/budget-export-\d{4}-\d{2}-\d{2}\.csv/)
    })

    test('handles responsive layout', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Header should be stacked
      await expect(page.getByText('Budget Tracker')).toBeVisible()
      await expect(page.getByText('Add Expense')).toBeVisible()
      
      // Tab navigation should work
      await page.getByText('Categories').click()
      await expect(page.getByText('Budget Categories')).toBeVisible()
      
      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 })
    })

    test('shows error states gracefully', async ({ page }) => {
      // Intercept API calls to return errors
      await page.route('**/api/budget/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      // Reload page
      await page.reload()
      
      // Should show error state
      await expect(page.getByText(/Failed to Load/)).toBeVisible()
      await expect(page.getByText('Try Again')).toBeVisible()
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('meets performance benchmarks', async ({ page }) => {
      // Navigate to budget tracker
      await page.goto('/dashboard/clients/test-client-id/budget')
      
      // Measure page load performance
      const navigationTiming = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart
        }
      })
      
      // Performance requirements from job spec
      expect(navigationTiming.domContentLoaded).toBeLessThan(1000) // <1s page load
      
      // Check chart rendering performance
      await page.getByText('Analytics').click()
      
      const chartRenderStart = Date.now()
      await page.waitForSelector('.recharts-wrapper', { timeout: 2000 })
      const chartRenderTime = Date.now() - chartRenderStart
      
      expect(chartRenderTime).toBeLessThan(1000) // <1s chart rendering
    })

    test('is accessible', async ({ page }) => {
      // Check for proper heading structure
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      
      // Check for form labels
      await page.getByText('Add Expense').click()
      await expect(page.getByLabel(/Amount/)).toBeVisible()
      await expect(page.getByLabel(/Description/)).toBeVisible()
      await expect(page.getByLabel(/Category/)).toBeVisible()
      
      // Check for proper button roles
      await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
      
      // Check tab navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
    })

    test('supports keyboard navigation', async ({ page }) => {
      // Navigate using keyboard
      await page.keyboard.press('Tab') // Should focus first interactive element
      
      // Navigate through tabs
      await page.keyboard.press('ArrowRight') // If tab list supports arrow keys
      
      // Navigate to form and interact
      await page.getByText('Add Expense').click()
      
      // Tab through form fields
      await page.keyboard.press('Tab') // Amount field
      await page.keyboard.type('100')
      
      await page.keyboard.press('Tab') // Date field
      await page.keyboard.press('Tab') // Description field
      await page.keyboard.type('Test expense')
      
      // Should be able to submit with keyboard
      await page.keyboard.press('Tab') // Continue until submit button
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter') // Submit form
    })
  })
})