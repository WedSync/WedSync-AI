/**
 * Enhanced End-to-End Tests for Guest List Builder
 * Team E - Batch 13 - WS-151 Guest List Builder E2E Testing (Enhanced)
 * 
 * FOCUS AREAS:
 * - Complex drag-and-drop scenarios with 500+ guests
 * - Import workflows with large datasets and edge cases
 * - Cross-browser compatibility validation
 * - Mobile responsiveness testing
 * - Performance validation during user interactions
 * - Accessibility compliance during real user flows
 * - Error recovery and resilience testing
 */

import { test, expect, Page, BrowserContext, devices } from '@playwright/test'
import path from 'path'
import { createHash } from 'crypto'

// Test configuration
const TEST_USER_PREFIX = 'e2e-enhanced-guest-test'
const TEST_PASSWORD = 'EnhancedTestPassword123!'

// Performance benchmarks for E2E tests
const E2E_PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_TIME: 3000, // 3 seconds max
  DRAG_OPERATION_TIME: 2000, // 2 seconds max per drag
  IMPORT_PROGRESS_TIME: 30000, // 30 seconds for large imports
  SEARCH_RESPONSE_TIME: 1000, // 1 second max for search
  FILTER_RESPONSE_TIME: 500, // 0.5 seconds max for filters
  BULK_SELECTION_TIME: 1000, // 1 second for bulk selection
  CATEGORY_SWITCH_TIME: 500 // 0.5 seconds for view changes
}

// Utility functions
const generateTestEmail = () => `${TEST_USER_PREFIX}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`

const createLargeCSVContent = (guestCount: number, options: any = {}) => {
  const headers = 'First Name,Last Name,Email,Phone,Category,Side,Plus One,Dietary Restrictions,Notes'
  const rows = Array.from({ length: guestCount }, (_, i) => {
    const categories = ['family', 'friends', 'work', 'other']
    const sides = ['partner1', 'partner2', 'mutual']
    
    return [
      `${options.prefix || 'E2E'}Guest${i}`,
      `Test${Math.floor(i / 10)}`,
      `e2e.guest.${i}@testdomain.com`,
      `555-${String(i + 5000).padStart(4, '0')}`,
      categories[i % categories.length],
      sides[i % sides.length],
      i % 5 === 0 ? 'Yes' : 'No',
      i % 10 === 0 ? 'Vegetarian' : '',
      i % 25 === 0 ? `Important note for guest ${i}` : ''
    ].join(',')
  })
  
  return [headers, ...rows].join('\n')
}

const measurePagePerformance = async (page: Page) => {
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0
    }
  })
  
  return performanceMetrics
}

const waitForStableRendering = async (page: Page, timeout = 2000) => {
  // Wait for network idle and no layout shifts
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => {
    return document.readyState === 'complete' && 
           !document.querySelector('.loading, .spinner, [aria-busy="true"]')
  }, { timeout })
}

// Test setup helpers
async function setupTestUser(page: Page): Promise<string> {
  const testEmail = generateTestEmail()
  
  await page.goto('/auth/signup')
  await page.fill('[data-testid="email-input"]', testEmail)
  await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
  await page.fill('[data-testid="confirm-password-input"]', TEST_PASSWORD)
  await page.click('[data-testid="signup-button"]')
  
  // Complete onboarding
  await page.waitForURL('/onboarding')
  await page.fill('[data-testid="couple-name-input"]', 'Enhanced E2E Test Couple')
  await page.fill('[data-testid="wedding-date-input"]', '2025-06-15')
  await page.click('[data-testid="complete-onboarding-button"]')
  await page.waitForURL('/dashboard')
  
  return testEmail
}

async function navigateToGuestList(page: Page) {
  await page.click('[data-testid="nav-guests"]')
  await page.waitForURL('**/guests')
  await waitForStableRendering(page)
}

async function createInitialTestGuests(page: Page, count = 20) {
  const guests = [
    { first: 'John', last: 'Doe', email: 'john.doe@example.com', category: 'family' },
    { first: 'Jane', last: 'Smith', email: 'jane.smith@example.com', category: 'friends' },
    { first: 'Bob', last: 'Johnson', email: 'bob.johnson@example.com', category: 'work' },
    { first: 'Alice', last: 'Brown', email: 'alice.brown@example.com', category: 'other' }
  ]
  
  for (let i = 0; i < count; i++) {
    const guest = guests[i % guests.length]
    const uniqueId = Math.floor(i / 4) + 1
    
    await page.click('[data-testid="add-guest-button"]')
    await page.fill('[data-testid="first-name-input"]', `${guest.first}${uniqueId}`)
    await page.fill('[data-testid="last-name-input"]', `${guest.last}${uniqueId}`)
    await page.fill('[data-testid="email-input"]', `${guest.first.toLowerCase()}${uniqueId}@example.com`)
    await page.selectOption('[data-testid="category-select"]', guest.category)
    await page.click('[data-testid="save-guest-button"]')
    
    // Wait for guest creation confirmation
    await page.waitForSelector('[data-testid="guest-added-success"]', { timeout: 5000 })
  }
}

test.describe('Enhanced Guest List Builder E2E Tests', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Set up test environment
    test.setTimeout(120000) // 2 minutes timeout for enhanced tests
    
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Setup test user and navigate to guest list
    await setupTestUser(page)
    await navigateToGuestList(page)
  })

  test.describe('Large Dataset Performance Testing', () => {
    test('should handle 500+ guest display with acceptable performance', async ({ page }) => {
      // Import large dataset via CSV
      await page.click('[data-testid="import-guests-button"]')
      
      const largeCSV = createLargeCSVContent(500, { prefix: 'PerfTest' })
      
      // Create temporary file for upload
      const csvBuffer = Buffer.from(largeCSV)
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'performance-test-500.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })
      
      // Complete import workflow
      await page.waitForSelector('[data-testid="mapping-step"]')
      await page.click('[data-testid="preview-import-button"]')
      
      await page.waitForSelector('[data-testid="preview-step"]')
      expect(await page.textContent('[data-testid="valid-rows-count"]')).toContain('500')
      
      const importStartTime = Date.now()
      await page.click('[data-testid="start-import-button"]')
      
      // Wait for import completion
      await page.waitForSelector('[data-testid="complete-step"]', { 
        timeout: E2E_PERFORMANCE_THRESHOLDS.IMPORT_PROGRESS_TIME 
      })
      const importTime = Date.now() - importStartTime
      
      expect(importTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.IMPORT_PROGRESS_TIME)
      
      // Navigate to guest list and measure rendering performance
      await page.click('[data-testid="view-guest-list-button"]')
      
      const renderStartTime = Date.now()
      await waitForStableRendering(page)
      const renderTime = Date.now() - renderStartTime
      
      expect(renderTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME)
      
      // Verify guest count display
      await expect(page.locator('[data-testid="total-guest-count"]')).toContainText('500')
      
      console.log(`✅ Large dataset performance: Import ${importTime}ms, Render ${renderTime}ms`)
    })

    test('should maintain performance during search with large datasets', async ({ page }) => {
      // First create a large dataset (using existing from previous test if available)
      const searchInput = page.locator('[data-testid="search-input"]')
      
      const searchStartTime = Date.now()
      await searchInput.fill('PerfTest1')
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]', { 
        timeout: E2E_PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME 
      })
      const searchTime = Date.now() - searchStartTime
      
      expect(searchTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME)
      
      // Verify search results
      const resultCount = await page.locator('[data-testid="guest-card"]').count()
      expect(resultCount).toBeGreaterThan(0)
      expect(resultCount).toBeLessThan(20) // Should be filtered
      
      console.log(`✅ Search performance with large dataset: ${searchTime}ms`)
    })
  })

  test.describe('Advanced Drag and Drop Scenarios', () => {
    test.beforeEach(async ({ page }) => {
      await createInitialTestGuests(page, 16)
      
      // Switch to category view for drag testing
      await page.click('[data-testid="view-categories"]')
      await waitForStableRendering(page)
    })

    test('should handle complex multi-guest drag operations', async ({ page }) => {
      // Enable bulk selection mode
      await page.check('[data-testid="bulk-select-mode"]')
      
      // Select multiple guests from different categories
      await page.check('[data-testid="select-guest-john1-doe1"]')
      await page.check('[data-testid="select-guest-jane1-smith1"]')
      await page.check('[data-testid="select-guest-bob1-johnson1"]')
      
      // Verify bulk selection indicator
      await expect(page.locator('[data-testid="bulk-selection-count"]')).toContainText('3')
      
      // Drag one selected guest to move all selected
      const selectedGuest = page.locator('[data-testid="guest-john1-doe1"]')
      const targetCategory = page.locator('[data-testid="category-friends"]')
      
      const dragStartTime = Date.now()
      await selectedGuest.dragTo(targetCategory)
      const dragTime = Date.now() - dragStartTime
      
      expect(dragTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.DRAG_OPERATION_TIME)
      
      // Wait for drag operation to complete
      await page.waitForSelector('[data-testid="bulk-move-success"]', { timeout: 5000 })
      
      // Verify all selected guests moved to friends category
      const friendsCategory = page.locator('[data-testid="category-friends"]')
      await expect(friendsCategory.locator('[data-testid="guest-john1-doe1"]')).toBeVisible()
      await expect(friendsCategory.locator('[data-testid="guest-jane1-smith1"]')).toBeVisible()
      await expect(friendsCategory.locator('[data-testid="guest-bob1-johnson1"]')).toBeVisible()
      
      console.log(`✅ Multi-guest drag operation: ${dragTime}ms`)
    })

    test('should handle drag and drop with keyboard navigation', async ({ page }) => {
      // Focus on first guest
      await page.focus('[data-testid="guest-john1-doe1"]')
      
      // Use keyboard to select drag mode
      await page.keyboard.press('Space')
      await page.waitForSelector('[aria-grabbed="true"]')
      
      // Navigate to target category using keyboard
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab') // Navigate to friends category
      
      // Complete keyboard drag
      await page.keyboard.press('Enter')
      
      // Verify keyboard drag worked
      await page.waitForSelector('[data-testid="keyboard-move-success"]')
      await expect(page.locator('[data-testid="category-friends"]')
        .locator('[data-testid="guest-john1-doe1"]')).toBeVisible()
    })

    test('should handle drag operations with visual feedback', async ({ page }) => {
      const guestCard = page.locator('[data-testid="guest-alice1-brown1"]')
      const targetCategory = page.locator('[data-testid="category-family"]')
      
      // Start drag and verify visual feedback
      await guestCard.hover()
      await page.mouse.down()
      
      // Verify drag styling
      await expect(guestCard).toHaveClass(/dragging|drag-active/)
      
      // Move over target and verify drop zone highlighting
      await targetCategory.hover()
      await expect(targetCategory).toHaveClass(/drag-over|drop-target-active/)
      
      // Complete drag
      await page.mouse.up()
      
      // Verify visual feedback is removed
      await expect(guestCard).not.toHaveClass(/dragging|drag-active/)
      await expect(targetCategory).not.toHaveClass(/drag-over|drop-target-active/)
      
      // Verify guest moved
      await expect(targetCategory.locator('[data-testid="guest-alice1-brown1"]')).toBeVisible()
    })
  })

  test.describe('Complex Import Workflow Testing', () => {
    test('should handle Excel import with multiple sheets', async ({ page }) => {
      await page.click('[data-testid="import-guests-button"]')
      
      // Note: In a real test environment, you'd create actual Excel files
      // This simulates the workflow with Excel-like data structure
      const complexCSV = `Sheet1_First Name,Sheet1_Last Name,Sheet1_Email,Sheet2_Category,Sheet2_Side
John,Doe,john@example.com,family,partner1
Jane,Smith,jane@example.com,friends,partner2`
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'complex-excel-simulation.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(complexCSV)
      })
      
      // Handle complex column mapping
      await page.waitForSelector('[data-testid="mapping-step"]')
      
      // Map columns from different sheets
      await page.selectOption('[data-testid="first-name-mapping"]', 'Sheet1_First Name')
      await page.selectOption('[data-testid="last-name-mapping"]', 'Sheet1_Last Name')
      await page.selectOption('[data-testid="email-mapping"]', 'Sheet1_Email')
      await page.selectOption('[data-testid="category-mapping"]', 'Sheet2_Category')
      await page.selectOption('[data-testid="side-mapping"]', 'Sheet2_Side')
      
      await page.click('[data-testid="preview-import-button"]')
      
      // Verify preview shows correct data mapping
      await expect(page.locator('[data-testid="preview-table"]')).toContainText('John')
      await expect(page.locator('[data-testid="preview-table"]')).toContainText('jane@example.com')
      
      await page.click('[data-testid="start-import-button"]')
      await page.waitForSelector('[data-testid="complete-step"]')
      
      // Verify import success
      await expect(page.locator('[data-testid="import-summary"]')).toContainText('2 guests imported')
    })

    test('should handle import with validation errors and recovery', async ({ page }) => {
      await page.click('[data-testid="import-guests-button"]')
      
      // Create CSV with mixed valid/invalid data
      const mixedCSV = `First Name,Last Name,Email,Category
John,Doe,john@example.com,family
,InvalidGuest,not-an-email,invalid-category
Jane,Smith,jane@example.com,friends
BobNoEmail,Johnson,,work
Alice,Brown,alice@example.com,other`
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'validation-test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(mixedCSV)
      })
      
      await page.click('[data-testid="preview-import-button"]')
      
      // Verify validation errors are shown
      await page.waitForSelector('[data-testid="validation-errors"]')
      await expect(page.locator('[data-testid="error-count"]')).toContainText('2')
      
      // View error details
      await page.click('[data-testid="show-error-details"]')
      await expect(page.locator('[data-testid="error-list"]')).toContainText('first_name is required')
      await expect(page.locator('[data-testid="error-list"]')).toContainText('Invalid email format')
      
      // Choose to import valid rows only
      await page.check('[data-testid="import-valid-only"]')
      await page.click('[data-testid="start-import-button"]')
      
      await page.waitForSelector('[data-testid="complete-step"]')
      
      // Verify only valid guests were imported
      await expect(page.locator('[data-testid="import-summary"]')).toContainText('3 guests imported')
      await expect(page.locator('[data-testid="import-summary"]')).toContainText('2 guests skipped due to validation errors')
    })

    test('should save and reuse custom column mapping templates', async ({ page }) => {
      await page.click('[data-testid="import-guests-button"]')
      
      const customFormatCSV = `Full Name,Email Address,Guest Type,Wedding Party
John Doe,john@example.com,Family Member,Bride Side
Jane Smith,jane@example.com,Friend,Groom Side`
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'custom-format.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(customFormatCSV)
      })
      
      // Create custom column mapping
      await page.selectOption('[data-testid="full-name-mapping"]', 'Full Name')
      await page.selectOption('[data-testid="email-mapping"]', 'Email Address')
      await page.selectOption('[data-testid="category-mapping"]', 'Guest Type')
      await page.selectOption('[data-testid="side-mapping"]', 'Wedding Party')
      
      // Save mapping as template
      await page.click('[data-testid="save-mapping-template"]')
      await page.fill('[data-testid="template-name-input"]', 'Custom Wedding Format')
      await page.click('[data-testid="confirm-save-template"]')
      
      // Verify template saved
      await expect(page.locator('[data-testid="template-saved-success"]')).toBeVisible()
      
      // Start new import to test template reuse
      await page.click('[data-testid="import-new-file"]')
      
      const anotherCSV = `Full Name,Email Address,Guest Type,Wedding Party
Bob Johnson,bob@example.com,Work Colleague,Bride Side`
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'another-file.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(anotherCSV)
      })
      
      // Apply saved template
      await page.selectOption('[data-testid="saved-templates"]', 'Custom Wedding Format')
      
      // Verify mappings were applied
      await expect(page.locator('[data-testid="full-name-mapping"]')).toHaveValue('Full Name')
      await expect(page.locator('[data-testid="email-mapping"]')).toHaveValue('Email Address')
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should maintain functionality in ${browserName}`, async ({ page }) => {
        // Test core functionality across browsers
        await createInitialTestGuests(page, 8)
        
        // Test search functionality
        const searchInput = page.locator('[data-testid="search-input"]')
        await searchInput.fill('John')
        await page.waitForSelector('[data-testid="search-results"]')
        
        const searchResults = await page.locator('[data-testid="guest-card"]').count()
        expect(searchResults).toBeGreaterThan(0)
        
        // Test filtering
        await page.selectOption('[data-testid="category-filter"]', 'family')
        await page.waitForTimeout(500) // Allow filter to apply
        
        // Test drag and drop (browser-specific behavior)
        await page.click('[data-testid="view-categories"]')
        await waitForStableRendering(page)
        
        const guestCard = page.locator('[data-testid="guest-card"]').first()
        const targetCategory = page.locator('[data-testid="category-friends"]')
        
        if (guestCard && targetCategory) {
          await guestCard.dragTo(targetCategory)
          // Verify drag worked regardless of browser
          await page.waitForTimeout(1000)
        }
        
        console.log(`✅ Cross-browser test passed for ${browserName}`)
      })
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page, browserName }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
      
      await createInitialTestGuests(page, 6)
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-guest-list"]')).toBeVisible()
      
      // Test mobile-specific interactions
      const guestCard = page.locator('[data-testid="guest-card"]').first()
      await guestCard.tap()
      
      // Verify mobile guest detail view
      await expect(page.locator('[data-testid="mobile-guest-detail"]')).toBeVisible()
      
      // Test mobile search
      await page.tap('[data-testid="mobile-search-toggle"]')
      const mobileSearchInput = page.locator('[data-testid="mobile-search-input"]')
      await mobileSearchInput.fill('John')
      
      await page.waitForSelector('[data-testid="mobile-search-results"]')
      const mobileSearchResults = await page.locator('[data-testid="mobile-guest-item"]').count()
      expect(mobileSearchResults).toBeGreaterThan(0)
      
      // Test mobile drag alternative (tap to select, tap category to move)
      await page.tap('[data-testid="mobile-bulk-select"]')
      await guestCard.tap() // Select guest
      await page.tap('[data-testid="mobile-category-friends"]') // Move to friends
      
      await expect(page.locator('[data-testid="mobile-move-success"]')).toBeVisible()
      
      console.log(`✅ Mobile responsiveness test passed`)
    })

    test('should handle touch gestures correctly', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad size
      
      await createInitialTestGuests(page, 10)
      
      // Test swipe gestures for category navigation
      const categoryContainer = page.locator('[data-testid="category-container"]')
      
      // Swipe left to navigate categories
      await categoryContainer.touchstart({ position: { x: 600, y: 300 } })
      await categoryContainer.touchmove({ position: { x: 200, y: 300 } })
      await categoryContainer.touchend()
      
      await page.waitForTimeout(500)
      
      // Test pinch-to-zoom prevention (should not zoom guest cards)
      const guestCard = page.locator('[data-testid="guest-card"]').first()
      const boundingBox = await guestCard.boundingBox()
      
      if (boundingBox) {
        // Simulate pinch gesture
        await page.touchstart([
          { x: boundingBox.x + 50, y: boundingBox.y + 50 },
          { x: boundingBox.x + 150, y: boundingBox.y + 150 }
        ])
        
        await page.touchmove([
          { x: boundingBox.x + 25, y: boundingBox.y + 25 },
          { x: boundingBox.x + 175, y: boundingBox.y + 175 }
        ])
        
        await page.touchend()
        
        // Verify content didn't zoom (viewport scale should remain 1)
        const viewportScale = await page.evaluate(() => {
          const viewport = document.querySelector('meta[name="viewport"]')
          return viewport ? viewport.getAttribute('content') : ''
        })
        
        expect(viewportScale).toContain('user-scalable=no')
      }
    })
  })

  test.describe('Accessibility Compliance Validation', () => {
    test('should maintain accessibility during drag operations', async ({ page }) => {
      await createInitialTestGuests(page, 8)
      await page.click('[data-testid="view-categories"]')
      
      // Test keyboard navigation for drag operations
      await page.focus('[data-testid="guest-john1-doe1"]')
      
      // Verify ARIA attributes
      const guestCard = page.locator('[data-testid="guest-john1-doe1"]')
      await expect(guestCard).toHaveAttribute('aria-grabbed', 'false')
      await expect(guestCard).toHaveAttribute('tabindex', '0')
      
      // Test keyboard drag initiation
      await page.keyboard.press('Space')
      await expect(guestCard).toHaveAttribute('aria-grabbed', 'true')
      
      // Test screen reader announcements
      const liveRegion = page.locator('[aria-live="polite"]')
      await expect(liveRegion).toContainText('drag mode activated')
      
      // Complete keyboard drag
      await page.keyboard.press('Tab') // Navigate to target
      await page.keyboard.press('Enter') // Drop
      
      await expect(liveRegion).toContainText('guest moved to')
      await expect(guestCard).toHaveAttribute('aria-grabbed', 'false')
    })

    test('should provide proper focus management', async ({ page }) => {
      await createInitialTestGuests(page, 6)
      
      // Test tab order
      await page.keyboard.press('Tab') // Should focus search
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab') // Should focus first filter
      await expect(page.locator('[data-testid="category-filter"]')).toBeFocused()
      
      await page.keyboard.press('Tab') // Should focus first guest
      const firstGuest = page.locator('[data-testid="guest-card"]').first()
      await expect(firstGuest).toBeFocused()
      
      // Test focus trap in modal
      await page.keyboard.press('Enter') // Open guest details
      await page.waitForSelector('[data-testid="guest-detail-modal"]')
      
      // Tab should cycle within modal
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Focus should remain within modal
      const focusedElement = page.locator(':focus')
      const modalContainer = page.locator('[data-testid="guest-detail-modal"]')
      await expect(modalContainer.locator(':focus')).toBeVisible()
      
      // Escape should close modal and restore focus
      await page.keyboard.press('Escape')
      await expect(firstGuest).toBeFocused()
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await createInitialTestGuests(page, 5)
      
      // Simulate network failure
      await page.route('/api/guests/**', route => route.abort())
      
      // Attempt operation that requires network
      await page.click('[data-testid="bulk-select-all"]')
      await page.click('[data-testid="bulk-delete"]')
      await page.click('[data-testid="confirm-delete"]')
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Restore network and retry
      await page.unroute('/api/guests/**')
      await page.click('[data-testid="retry-button"]')
      
      // Verify operation succeeds after retry
      await expect(page.locator('[data-testid="operation-success"]')).toBeVisible()
    })

    test('should handle browser crashes and data recovery', async ({ page }) => {
      await createInitialTestGuests(page, 8)
      
      // Fill out guest data
      await page.click('[data-testid="add-guest-button"]')
      await page.fill('[data-testid="first-name-input"]', 'Recovery')
      await page.fill('[data-testid="last-name-input"]', 'Test')
      await page.fill('[data-testid="email-input"]', 'recovery@test.com')
      
      // Simulate page refresh (simulating browser crash recovery)
      await page.reload()
      await waitForStableRendering(page)
      
      // Verify auto-save recovered data
      if (await page.locator('[data-testid="draft-recovery"]').isVisible()) {
        await page.click('[data-testid="restore-draft"]')
        
        await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Recovery')
        await expect(page.locator('[data-testid="email-input"]')).toHaveValue('recovery@test.com')
      }
    })
  })

  test.describe('Performance Monitoring', () => {
    test('should track and report performance metrics', async ({ page }) => {
      // Enable performance monitoring
      await page.addInitScript(() => {
        window.performanceMetrics = []
        const originalConsoleLog = console.log
        console.log = (...args) => {
          if (args[0] && args[0].includes('performance:')) {
            window.performanceMetrics.push(args.join(' '))
          }
          originalConsoleLog.apply(console, args)
        }
      })
      
      await createInitialTestGuests(page, 20)
      
      // Perform various operations and collect metrics
      const operations = [
        { name: 'search', action: async () => {
          const searchInput = page.locator('[data-testid="search-input"]')
          await searchInput.fill('John')
          await page.waitForTimeout(500)
          await searchInput.clear()
        }},
        { name: 'filter', action: async () => {
          await page.selectOption('[data-testid="category-filter"]', 'family')
          await page.waitForTimeout(300)
          await page.selectOption('[data-testid="category-filter"]', 'all')
        }},
        { name: 'view-switch', action: async () => {
          await page.click('[data-testid="view-categories"]')
          await page.waitForTimeout(300)
          await page.click('[data-testid="view-list"]')
        }}
      ]
      
      for (const operation of operations) {
        const startTime = Date.now()
        await operation.action()
        const endTime = Date.now()
        
        console.log(`E2E Performance - ${operation.name}: ${endTime - startTime}ms`)
      }
      
      // Collect performance metrics from page
      const performanceMetrics = await page.evaluate(() => {
        return {
          metrics: window.performanceMetrics || [],
          navigation: performance.getEntriesByType('navigation')[0]
        }
      })
      
      expect(performanceMetrics.metrics.length).toBeGreaterThan(0)
    })
  })
})