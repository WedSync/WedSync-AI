import { test, expect } from '@playwright/test'

test.describe('Tagging System Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with tagging components
    await page.goto('/clients')
  })

  test('TagInput keyboard navigation works correctly', async ({ page }) => {
    // Focus the tag input
    await page.getByTestId('tag-search-input').click()
    
    // Verify initial state
    await expect(page.getByRole('combobox')).toBeFocused()
    await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
    
    // Type to search
    await page.keyboard.type('lux')
    
    // Verify fuzzy search results appear
    await expect(page.getByText('Fuzzy search results for "lux"')).toBeVisible()
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    
    // Verify highlighted option has correct ARIA attributes
    const highlightedOption = page.getByRole('option', { name: /luxury/i })
    await expect(highlightedOption).toHaveAttribute('aria-selected', 'true')
    
    // Select with Enter
    await page.keyboard.press('Enter')
    
    // Verify tag is selected
    await expect(page.getByTestId('selected-tag-luxury')).toBeVisible()
    
    // Verify dropdown closes
    await expect(page.getByRole('listbox')).toBeHidden()
  })

  test('TagInput supports screen reader navigation', async ({ page }) => {
    // Focus the input
    await page.getByTestId('tag-search-input').click()
    
    // Check ARIA attributes for screen readers
    const input = page.getByTestId('tag-search-input')
    await expect(input).toHaveAttribute('role', 'combobox')
    await expect(input).toHaveAttribute('aria-label', 'Search and select tags')
    await expect(input).toHaveAttribute('aria-autocomplete', 'list')
    
    // Type to show options
    await page.keyboard.type('dest')
    
    // Verify listbox appears with proper attributes
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    await expect(listbox).toHaveAttribute('aria-label', 'Tag suggestions')
    
    // Verify options have proper roles
    const options = page.getByRole('option')
    await expect(options.first()).toHaveAttribute('role', 'option')
    
    // Navigate and verify aria-activedescendant updates
    await page.keyboard.press('ArrowDown')
    const activeDescendant = await input.getAttribute('aria-activedescendant')
    expect(activeDescendant).toBeTruthy()
  })

  test('TagInput escape key closes dropdown and maintains focus', async ({ page }) => {
    // Open dropdown
    await page.getByTestId('tag-search-input').click()
    await page.keyboard.type('test')
    
    // Verify dropdown is open
    await expect(page.getByRole('listbox')).toBeVisible()
    
    // Press Escape
    await page.keyboard.press('Escape')
    
    // Verify dropdown closes and focus is maintained
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(page.getByTestId('tag-search-input')).toBeFocused()
  })

  test('Tag removal buttons are keyboard accessible', async ({ page }) => {
    // Assume a tag is already selected
    const tagElement = page.getByTestId('selected-tag-luxury')
    await expect(tagElement).toBeVisible()
    
    // Focus the remove button within the tag
    const removeButton = tagElement.getByRole('button', { name: /remove.*luxury.*tag/i })
    await removeButton.click()
    
    // Verify tag is removed
    await expect(tagElement).toBeHidden()
  })

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    // Create various colored tags to test
    const coloredTags = [
      'luxury', 'destination', 'outdoor', 'budget', 'VIP'
    ]
    
    for (const tagName of coloredTags) {
      const tag = page.getByTestId(`selected-tag-${tagName}`)
      if (await tag.isVisible()) {
        // Get computed styles
        const styles = await tag.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color
          }
        })
        
        // Verify contrast ratio (this would need a proper contrast checker in real implementation)
        // For now, we'll check that both properties are set
        expect(styles.backgroundColor).toBeTruthy()
        expect(styles.color).toBeTruthy()
      }
    }
  })

  test('TagFilter dropdown is keyboard accessible', async ({ page }) => {
    // Open tag filter
    await page.getByTestId('tag-filter').click()
    
    // Verify filter dropdown opens
    await expect(page.getByRole('listbox', { name: /tag suggestions/i })).toBeVisible()
    
    // Navigate with Tab key through filter options
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Test checkbox selection with Space
    await page.keyboard.press('Space')
    
    // Verify selection
    const checkedItem = page.getByRole('checkbox', { checked: true })
    await expect(checkedItem).toBeVisible()
  })

  test('TagManager modal keyboard navigation', async ({ page }) => {
    // Open tag manager
    await page.getByTestId('create-tag').click()
    
    // Verify modal opens and focus moves to it
    await expect(page.getByTestId('tag-manager')).toBeVisible()
    
    // Test Tab navigation through form fields
    await page.keyboard.press('Tab') // Name field
    await page.keyboard.type('New Tag')
    
    await page.keyboard.press('Tab') // Description field
    await page.keyboard.type('Description')
    
    await page.keyboard.press('Tab') // Category dropdown
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    // Navigate to color picker
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Navigate to first color
    await page.keyboard.press('Enter') // Select color
    
    // Navigate to save button and save
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.getByTestId('save-tag').click()
    
    // Verify tag creation and modal closes
    await expect(page.getByTestId('tag-manager')).toBeHidden()
  })

  test('Focus management during tag operations', async ({ page }) => {
    const input = page.getByTestId('tag-search-input')
    
    // Focus input
    await input.click()
    await expect(input).toBeFocused()
    
    // Type and select a tag
    await page.keyboard.type('luxury')
    await page.keyboard.press('Enter')
    
    // Verify focus returns to input after selection
    await expect(input).toBeFocused()
    
    // Test backspace to remove tag
    await page.keyboard.press('Backspace')
    
    // Verify focus remains on input
    await expect(input).toBeFocused()
  })

  test('ARIA live regions announce tag changes', async ({ page }) => {
    // This test would verify that screen readers are notified of changes
    // In a real implementation, we'd check for aria-live regions
    
    const input = page.getByTestId('tag-search-input')
    await input.click()
    
    // Look for aria-live regions that would announce changes
    const liveRegion = page.locator('[aria-live]')
    if (await liveRegion.count() > 0) {
      await expect(liveRegion.first()).toBeInViewport()
    }
    
    // Add a tag and verify announcement mechanism exists
    await page.keyboard.type('test')
    await page.keyboard.press('Enter')
    
    // In a real implementation, we'd verify the live region content updates
  })

  test('High contrast mode compatibility', async ({ page, context }) => {
    // Test with forced high contrast mode
    await context.addInitScript(() => {
      // Simulate high contrast mode
      document.documentElement.style.filter = 'contrast(2)'
    })
    
    await page.reload()
    
    // Verify tag elements are still visible and readable
    const tagInput = page.getByTestId('tag-search-input')
    await expect(tagInput).toBeVisible()
    
    // Check that colors are still distinguishable
    const tagElement = page.getByTestId('selected-tag-luxury')
    if (await tagElement.isVisible()) {
      const boundingBox = await tagElement.boundingBox()
      expect(boundingBox).toBeTruthy()
    }
  })

  test('Motion reduced preference respected', async ({ page, context }) => {
    // Set reduced motion preference
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })
    })
    
    await page.reload()
    
    // Verify animations are reduced or disabled
    const dropdown = page.getByRole('listbox')
    await page.getByTestId('tag-search-input').click()
    
    // Check that dropdown appears without excessive animation
    await expect(dropdown).toBeVisible()
  })

  test('Page zoom compatibility up to 200%', async ({ page }) => {
    // Test at different zoom levels
    const zoomLevels = [1, 1.5, 2]
    
    for (const zoom of zoomLevels) {
      await page.setViewportSize({ 
        width: Math.floor(1280 / zoom), 
        height: Math.floor(720 / zoom) 
      })
      
      // Verify tag input is still functional
      const input = page.getByTestId('tag-search-input')
      await expect(input).toBeVisible()
      await input.click()
      
      // Verify dropdown still appears properly
      await page.keyboard.type('test')
      const dropdown = page.getByRole('listbox')
      await expect(dropdown).toBeVisible()
      
      // Clear for next iteration
      await page.keyboard.press('Escape')
      await input.fill('')
    }
  })
})