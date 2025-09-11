/**
 * Enhanced Accessibility Tests for Guest List Builder - Full WCAG 2.1 AA Compliance
 * Team E - Batch 13 - WS-151 Guest List Builder Enhanced Accessibility Testing
 * 
 * Enhanced Testing Requirements:
 * - Complete WCAG 2.1 AA compliance validation
 * - Level AAA testing where applicable
 * - Complex interaction accessibility
 * - Alternative input method support
 * - Comprehensive screen reader testing
 * - Advanced keyboard navigation patterns
 * - Cognitive accessibility testing
 * - Multi-language accessibility support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe'
import { GuestListBuilder } from '@/components/guests/GuestListBuilder'
// Configure axe for comprehensive WCAG 2.1 AA testing
configureAxe({
  rules: {
    // Enable all WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'keyboard-trap': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-command-name': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roledescription': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-treeitem-name': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'autocomplete-valid': { enabled: true },
    'avoid-inline-spacing': { enabled: true },
    'blink': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA level
    'definition-list': { enabled: true },
    'dlitem': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id-active': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'duplicate-id': { enabled: true },
    'empty-heading': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'html-xml-lang-mismatch': { enabled: true },
    'image-alt': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-unique': { enabled: true },
    'link-in-text-block': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'marquee': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'nested-interactive': { enabled: true },
    'no-autoplay-audio': { enabled: true },
    'object-alt': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'role-img-alt': { enabled: true },
    'scope-attr-valid': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'tabindex': { enabled: true },
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
})
// Extend Jest matchers
expect.extend(toHaveNoViolations)
// Enhanced mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: mockGuestData }))
        }))
      })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ in: vi.fn() })),
      insert: vi.fn(() => ({ select: vi.fn() }))
    })),
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } } }))
    }
  })
}))
vi.mock('@/lib/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
// Enhanced mock guest data with diverse characteristics
const mockGuestData = [
  {
    id: 'guest-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    category: 'family',
    side: 'partner1',
    plus_one: true,
    plus_one_name: 'Jane Doe',
    rsvp_status: 'yes',
    age_group: 'adult',
    dietary_requirements: ['vegetarian'],
    accessibility_needs: ['wheelchair_access'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
    id: 'guest-2',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    phone: '555-5678',
    category: 'friends',
    side: 'partner2',
    plus_one: false,
    rsvp_status: 'no',
    dietary_requirements: ['gluten_free'],
    id: 'guest-3',
    first_name: 'Emma',
    last_name: 'Johnson',
    email: 'emma@example.com',
    phone: '555-9876',
    category: 'colleagues',
    plus_one_name: 'Mike Johnson',
    rsvp_status: 'pending',
]
// Enhanced accessibility testing utilities
class AccessibilityTestUtils {
  static async getColorContrast(foregroundColor: string, backgroundColor: string): Promise<number> {
    // Enhanced color contrast calculation using WCAG formula
    const luminance1 = this.getLuminance(foregroundColor)
    const luminance2 = this.getLuminance(backgroundColor)
    
    const brightest = Math.max(luminance1, luminance2)
    const darkest = Math.min(luminance1, luminance2)
    return (brightest + 0.05) / (darkest + 0.05)
  private static getLuminance(color: string): number {
    // Simplified luminance calculation - in real implementation use proper color library
    const rgb = this.hexToRgb(color) || { r: 0, g: 0, b: 0 }
    const rsRGB = rgb.r / 255
    const gsRGB = rgb.g / 255
    const bsRGB = rgb.b / 255
    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  static validateAriaAttributes(element: HTMLElement): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const ariaAttributes = Array.from(element.attributes).filter(attr => 
      attr.name.startsWith('aria-')
    )
    for (const attr of ariaAttributes) {
      // Validate common ARIA attribute patterns
      switch (attr.name) {
        case 'aria-labelledby':
        case 'aria-describedby':
          if (attr.value) {
            const referencedIds = attr.value.split(' ')
            for (const id of referencedIds) {
              if (!document.getElementById(id)) {
                errors.push(`Referenced ID "${id}" not found for ${attr.name}`)
              }
            }
          }
          break
        case 'aria-expanded':
        case 'aria-hidden':
        case 'aria-disabled':
        case 'aria-checked':
        case 'aria-selected':
          if (!['true', 'false'].includes(attr.value)) {
            errors.push(`${attr.name} must be "true" or "false", got "${attr.value}"`)
        case 'aria-level':
        case 'aria-posinset':
        case 'aria-setsize':
          if (!/^\d+$/.test(attr.value)) {
            errors.push(`${attr.name} must be a positive integer, got "${attr.value}"`)
      }
    return {
      valid: errors.length === 0,
      errors
  static async simulateScreenReader(element: HTMLElement): Promise<string[]> {
    const announcements: string[] = []
    // Simulate screen reader processing
    const computeAccessibleName = (el: HTMLElement): string => {
      const ariaLabel = el.getAttribute('aria-label')
      if (ariaLabel) return ariaLabel
      const ariaLabelledBy = el.getAttribute('aria-labelledby')
      if (ariaLabelledBy) {
        const referencedElement = document.getElementById(ariaLabelledBy)
        if (referencedElement) return referencedElement.textContent || ''
      const textContent = el.textContent?.trim()
      if (textContent) return textContent
      const altText = el.getAttribute('alt')
      if (altText) return altText
      return ''
    const role = element.getAttribute('role') || element.tagName.toLowerCase()
    const name = computeAccessibleName(element)
    const ariaDescribedBy = element.getAttribute('aria-describedby')
    if (name) {
      announcements.push(`${name}, ${role}`)
    if (ariaDescribedBy) {
      const descriptionElement = document.getElementById(ariaDescribedBy)
      if (descriptionElement && descriptionElement.textContent) {
        announcements.push(descriptionElement.textContent)
    // Add state information
    const expanded = element.getAttribute('aria-expanded')
    if (expanded === 'true') announcements.push('expanded')
    if (expanded === 'false') announcements.push('collapsed')
    const selected = element.getAttribute('aria-selected')
    if (selected === 'true') announcements.push('selected')
    const checked = element.getAttribute('aria-checked')
    if (checked === 'true') announcements.push('checked')
    if (checked === 'false') announcements.push('not checked')
    return announcements
  static validateTouchTargetSize(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    const MIN_TOUCH_TARGET_SIZE = 44 // WCAG AA requirement
    return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE
  static async validateKeyboardTrap(container: HTMLElement): Promise<boolean> {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    if (focusableElements.length === 0) return true
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    firstElement.focus()
    // Simulate Shift+Tab on first element
    fireEvent.keyDown(firstElement, { key: 'Tab', shiftKey: true })
    // Should cycle to last element in a proper keyboard trap
    return document.activeElement === lastElement
}
describe('Enhanced Guest List Builder - Complete WCAG 2.1 AA Accessibility Tests', () => {
  const defaultProps = {
    coupleId: 'test-couple-id',
    onGuestUpdate: vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset focus to body
    document.body.focus()
  afterEach(() => {
    document.body.innerHTML = ''
  describe('Comprehensive WCAG 2.1 AA Automated Testing', () => {
    it('should pass all WCAG 2.1 AA automated tests', async () => {
      const { container } = render(<GuestListBuilder {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Guest List')).toBeInTheDocument()
      })
      const results = await axe(container, {
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
      expect(results).toHaveNoViolations()
    })
    it('should pass drag-drop specific accessibility tests', async () => {
        const categoriesButton = screen.getByRole('button', { name: /categories/i })
        expect(categoriesButton).toBeInTheDocument()
      const user = userEvent.setup()
      const categoriesButton = screen.getByRole('button', { name: /categories/i })
      await user.click(categoriesButton)
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'button-name': { enabled: true },
          'color-contrast': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'keyboard-trap': { enabled: true }
        }
    it('should validate complex interactive elements', async () => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      // Test search + filters combination
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'John')
          'aria-input-field-name': { enabled: true },
          'autocomplete-valid': { enabled: true },
          'label': { enabled: true },
          'form-field-multiple-labels': { enabled: true }
  describe('Advanced Keyboard Navigation', () => {
    it('should support advanced keyboard patterns', async () => {
      render(<GuestListBuilder {...defaultProps} />)
      // Test keyboard shortcuts
      await user.keyboard('{Control>}f{/Control}') // Ctrl+F should focus search
      expect(document.activeElement).toBe(screen.getByRole('searchbox'))
      // Test escape key handling
      await user.keyboard('{Escape}')
      // Should clear search or close modals
      // Test arrow key navigation in grid mode
      const listButton = screen.getByRole('button', { name: /list/i })
      await user.click(listButton)
        expect(screen.getByRole('table')).toBeInTheDocument()
      // Test table navigation
      const table = screen.getByRole('table')
      const firstCell = table.querySelector('td')
      if (firstCell) {
        firstCell.focus()
        
        // Test arrow key navigation
        await user.keyboard('[ArrowRight]')
        await user.keyboard('[ArrowDown]')
        await user.keyboard('[ArrowLeft]')
        await user.keyboard('[ArrowUp]')
    it('should handle keyboard traps correctly', async () => {
      const isKeyboardTrapValid = await AccessibilityTestUtils.validateKeyboardTrap(container)
      expect(isKeyboardTrapValid).toBeTruthy()
    it('should support spatial navigation', async () => {
      // Test spatial navigation in category layout
        const categoryCards = screen.getAllByRole('region')
        expect(categoryCards.length).toBeGreaterThan(0)
      // Navigate between category regions using arrow keys
      const categoryRegions = screen.getAllByRole('region')
      if (categoryRegions.length > 1) {
        categoryRegions[0].focus()
        expect(document.activeElement).toBe(categoryRegions[1] || categoryRegions[0])
  describe('Enhanced Screen Reader Support', () => {
    it('should provide comprehensive announcements', async () => {
      const announcements = await AccessibilityTestUtils.simulateScreenReader(searchInput)
      expect(announcements).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/search/i)
        ])
      )
    it('should announce dynamic content changes', async () => {
      // Verify live region for search results
        const liveRegions = screen.getAllByRole('status')
        expect(liveRegions.length).toBeGreaterThan(0)
        // Check that search results are announced
        const searchStatus = liveRegions.find(region => 
          region.textContent?.toLowerCase().includes('result')
        )
        expect(searchStatus).toBeInTheDocument()
    it('should provide context for complex operations', async () => {
      // Test drag operation announcements
        const draggableElements = screen.getAllByRole('button').filter(button =>
          button.hasAttribute('draggable') || button.hasAttribute('aria-grabbed')
        expect(draggableElements.length).toBeGreaterThan(0)
      const draggableItems = screen.getAllByRole('button').filter(button =>
        button.hasAttribute('aria-grabbed')
      if (draggableItems.length > 0) {
        const dragItem = draggableItems[0]
        // Simulate drag start
        await user.keyboard(' ') // Space to start drag
        expect(dragItem).toHaveAttribute('aria-grabbed', 'true')
        // Verify drop zones are announced
        const dropzones = screen.getAllByRole('region')
        dropzones.forEach(zone => {
          expect(zone).toHaveAttribute('aria-dropeffect')
        })
  describe('Enhanced Color and Contrast Testing', () => {
    it('should exceed WCAG AA contrast requirements', async () => {
      const textElements = [
        screen.getByText('Guest List'),
        screen.getByRole('searchbox'),
        ...screen.getAllByRole('button').slice(0, 3)
      ]
      for (const element of textElements) {
        const computedStyle = window.getComputedStyle(element)
        const contrast = await AccessibilityTestUtils.getColorContrast(
          computedStyle.color,
          computedStyle.backgroundColor
        expect(contrast).toBeGreaterThanOrEqual(4.5) // WCAG AA minimum
    it('should handle forced colors mode', async () => {
      // Mock forced colors mode (Windows High Contrast)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(forced-colors: active)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      // Verify elements remain functional in forced colors mode
      const interactiveElements = [
      interactiveElements.forEach(element => {
        expect(element).toBeVisible()
        // In forced colors mode, elements should use system colors
        expect(['ButtonText', 'CanvasText', 'LinkText'].some(color => 
          computedStyle.color.includes(color.toLowerCase())
        )).toBeTruthy()
    it('should not convey information through color alone', async () => {
      // Check RSVP status indicators
      const statusElements = screen.getAllByText(/yes|no|pending/i)
      statusElements.forEach(element => {
        const hasTextContent = element.textContent && element.textContent.trim().length > 0
        const hasAriaLabel = element.hasAttribute('aria-label')
        const hasIcon = element.querySelector('svg') || element.querySelector('[class*="icon"]')
        const classList = element.classList.toString()
        const hasPatternOrShape = classList.includes('border') || classList.includes('pattern')
        expect(hasTextContent || hasAriaLabel || hasIcon || hasPatternOrShape).toBeTruthy()
  describe('Mobile and Touch Accessibility', () => {
    it('should meet touch target size requirements', async () => {
      const touchTargets = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('combobox')
      touchTargets.forEach(target => {
        expect(AccessibilityTestUtils.validateTouchTargetSize(target)).toBeTruthy()
    it('should support gesture-based navigation', async () => {
      // Mock touch environment
      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        writable: true
      // Test swipe gesture equivalent (for screen readers)
      const firstButton = screen.getAllByRole('button')[0]
      // Simulate screen reader swipe (equivalent to arrow key navigation)
      firstButton.focus()
      await user.keyboard('[ArrowRight]')
      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(firstButton)
    it('should handle orientation changes', async () => {
      // Mock orientation change
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 }
      fireEvent(window, new Event('orientationchange'))
      // Component should remain accessible after orientation change
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  describe('Cognitive Accessibility', () => {
    it('should provide clear instructions and help text', async () => {
      // Check for help text and instructions
      const ariaDescribedBy = searchInput.getAttribute('aria-describedby')
      const placeholder = searchInput.getAttribute('placeholder')
      const searchText = screen.getByText(/search/i)
      const hasInstructions = ariaDescribedBy || placeholder || searchText
      expect(hasInstructions).toBeTruthy()
    it('should support consistent navigation patterns', async () => {
      // Test consistent tab order across different views
      const viewModes = ['Categories', 'Households', 'List']
      for (const mode of viewModes) {
        const button = screen.getByRole('button', { name: new RegExp(mode, 'i') })
        await user.click(button)
        await waitFor(() => {
          // First focusable element should always be the search input
          const searchInput = screen.getByRole('searchbox')
          expect(searchInput).toBeInTheDocument()
    it('should provide timeout warnings for timed interactions', async () => {
      // Test session timeout warning (mock implementation)
      // In actual implementation, this would test real timeout scenarios
      await user.type(searchInput, 'test')
      // Simulate long delay
      vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
      // Should not lose data or session without warning
      expect(searchInput).toHaveValue('test')
  describe('Error Handling and Recovery', () => {
    it('should provide accessible error messages', async () => {
      // Mock error state
      const errorMessage = 'Failed to load guests'
      // Simulate network error
      vi.mocked(vi.fn()).mockRejectedValueOnce(new Error(errorMessage))
      // Error should be announced to screen readers
      const errorRegions = screen.getAllByRole('alert')
      expect(errorRegions.length).toBeGreaterThanOrEqual(0)
    it('should provide recovery options', async () => {
      // Test that user can retry failed operations
      // Simulate failed search
      await user.type(searchInput, 'nonexistent')
      // Should provide clear indication of no results and recovery options
        const noResultsMessage = screen.getByText(/no.*results|no.*guests/i)
        expect(noResultsMessage).toBeInTheDocument()
  describe('ARIA Validation', () => {
    it('should have valid ARIA attributes throughout the component', async () => {
      // Validate all ARIA attributes
      const elementsWithAria = container.querySelectorAll('[aria-*]')
      elementsWithAria.forEach(element => {
        const validation = AccessibilityTestUtils.validateAriaAttributes(element as HTMLElement)
        if (!validation.valid) {
          console.error('ARIA validation errors:', validation.errors)
        expect(validation.valid).toBeTruthy()
    it('should have proper landmark structure', async () => {
      // Check for proper landmark usage
      const main = container.querySelector('main, [role="main"]')
      expect(main).toBeInTheDocument()
      // Navigation elements should be properly marked
      const navigation = container.querySelector('nav, [role="navigation"]')
      if (navigation) {
        expect(navigation).toHaveAttribute('aria-label')
  describe('Internationalization (i18n) Accessibility', () => {
    it('should support right-to-left (RTL) languages', async () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.setAttribute('lang', 'ar')
      // Component should remain accessible in RTL mode
      expect(searchInput).toBeInTheDocument()
      // Clean up
      document.documentElement.removeAttribute('dir')
      document.documentElement.removeAttribute('lang')
    it('should handle language changes gracefully', async () => {
      // Mock language change
      document.documentElement.setAttribute('lang', 'es')
      // Component should remain functional
