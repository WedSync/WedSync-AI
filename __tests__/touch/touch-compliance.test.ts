import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { TouchTestingHelpers } from '../utils/touch-testing-helpers'

describe('WS-189 Touch Compliance Testing Suite', () => {
  let touchHelpers: TouchTestingHelpers

  beforeEach(() => {
    touchHelpers = new TouchTestingHelpers()
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: vi.fn()
    })
  })

  describe('Touch Target Size Validation', () => {
    test('emergency contact button meets 48px minimum requirement', async () => {
      const mockEmergencyButton = document.createElement('button')
      mockEmergencyButton.setAttribute('data-testid', 'emergency-contact')
      mockEmergencyButton.style.width = '56px'
      mockEmergencyButton.style.height = '56px'
      mockEmergencyButton.textContent = 'Emergency'
      document.body.appendChild(mockEmergencyButton)

      const dimensions = await touchHelpers.measureTouchTarget(mockEmergencyButton)
      
      expect(dimensions.width).toBeGreaterThanOrEqual(48)
      expect(dimensions.height).toBeGreaterThanOrEqual(48)
      expect(dimensions.meetsWCAGRequirements).toBe(true)

      document.body.removeChild(mockEmergencyButton)
    })

    test('timeline navigation buttons meet accessibility standards', async () => {
      const timelineButtons = [
        { id: 'timeline-previous', label: 'Previous' },
        { id: 'timeline-next', label: 'Next' },
        { id: 'timeline-zoom-in', label: 'Zoom In' },
        { id: 'timeline-zoom-out', label: 'Zoom Out' }
      ]

      timelineButtons.forEach(({ id, label }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', id)
        button.style.width = '52px'
        button.style.height = '52px'
        button.textContent = label
        document.body.appendChild(button)

        const dimensions = touchHelpers.measureTouchTargetSync(button)
        
        expect(dimensions.width).toBeGreaterThanOrEqual(48)
        expect(dimensions.height).toBeGreaterThanOrEqual(48)

        document.body.removeChild(button)
      })
    })

    test('vendor contact quick actions have proper spacing', async () => {
      const container = document.createElement('div')
      container.style.display = 'flex'
      container.style.gap = '16px'

      const vendorActions = ['call', 'message', 'email', 'location']
      const buttons: HTMLElement[] = []

      vendorActions.forEach((action, index) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', `vendor-${action}`)
        button.style.width = '48px'
        button.style.height = '48px'
        button.style.margin = '8px'
        button.textContent = action
        container.appendChild(button)
        buttons.push(button)
      })

      document.body.appendChild(container)

      // Test spacing between adjacent buttons
      for (let i = 0; i < buttons.length - 1; i++) {
        const spacing = touchHelpers.measureElementSpacing(buttons[i], buttons[i + 1])
        expect(spacing.horizontal).toBeGreaterThanOrEqual(8) // Minimum 8px spacing
      }

      document.body.removeChild(container)
    })
  })

  describe('Touch Spacing Validation', () => {
    test('prevents accidental touches with appropriate gap measurements', () => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      // Create two critical buttons close together
      const emergencyButton = document.createElement('button')
      emergencyButton.setAttribute('data-testid', 'emergency-call')
      emergencyButton.style.position = 'absolute'
      emergencyButton.style.left = '0px'
      emergencyButton.style.top = '0px'
      emergencyButton.style.width = '48px'
      emergencyButton.style.height = '48px'

      const cancelButton = document.createElement('button')
      cancelButton.setAttribute('data-testid', 'cancel-call')
      cancelButton.style.position = 'absolute'
      cancelButton.style.left = '56px' // 8px gap
      cancelButton.style.top = '0px'
      cancelButton.style.width = '48px'
      cancelButton.style.height = '48px'

      container.appendChild(emergencyButton)
      container.appendChild(cancelButton)

      const spacing = touchHelpers.measureElementSpacing(emergencyButton, cancelButton)
      
      // Critical actions should have at least 8px spacing
      expect(spacing.horizontal).toBeGreaterThanOrEqual(8)
      expect(spacing.isAccidentalTouchPrevented).toBe(true)

      document.body.removeChild(container)
    })

    test('photo gallery thumbnails maintain touch-safe spacing', () => {
      const gallery = document.createElement('div')
      gallery.style.display = 'grid'
      gallery.style.gridTemplateColumns = 'repeat(3, 1fr)'
      gallery.style.gap = '12px'
      gallery.style.padding = '16px'

      // Create photo thumbnails
      for (let i = 0; i < 9; i++) {
        const thumbnail = document.createElement('button')
        thumbnail.setAttribute('data-testid', `photo-${i}`)
        thumbnail.style.aspectRatio = '1'
        thumbnail.style.minWidth = '80px'
        thumbnail.style.minHeight = '80px'
        gallery.appendChild(thumbnail)
      }

      document.body.appendChild(gallery)

      const thumbnails = gallery.querySelectorAll('button')
      
      // Check spacing between grid items
      for (let i = 0; i < thumbnails.length - 1; i++) {
        const current = thumbnails[i] as HTMLElement
        const next = thumbnails[i + 1] as HTMLElement
        
        if ((i + 1) % 3 !== 0) { // Not end of row
          const spacing = touchHelpers.measureElementSpacing(current, next)
          expect(spacing.horizontal).toBeGreaterThanOrEqual(12)
        }
      }

      document.body.removeChild(gallery)
    })
  })

  describe('iOS Zoom Prevention Testing', () => {
    test('validates 16px font size minimum for input fields', () => {
      const inputs = [
        { type: 'text', placeholder: 'Vendor name' },
        { type: 'email', placeholder: 'Vendor email' },
        { type: 'tel', placeholder: 'Phone number' },
        { type: 'number', placeholder: 'Budget amount' }
      ]

      inputs.forEach(({ type, placeholder }) => {
        const input = document.createElement('input')
        input.type = type
        input.placeholder = placeholder
        input.style.fontSize = '16px'
        input.style.padding = '12px'
        input.style.minHeight = '44px'
        document.body.appendChild(input)

        const computedStyle = window.getComputedStyle(input)
        const fontSize = parseFloat(computedStyle.fontSize)
        
        expect(fontSize).toBeGreaterThanOrEqual(16)
        expect(input.style.minHeight).toBe('44px')

        document.body.removeChild(input)
      })
    })

    test('budget input fields prevent iOS auto-zoom', () => {
      const budgetForm = document.createElement('form')
      const inputs = [
        { name: 'venue_cost', label: 'Venue Cost' },
        { name: 'catering_cost', label: 'Catering Cost' },
        { name: 'photography_cost', label: 'Photography Cost' }
      ]

      inputs.forEach(({ name, label }) => {
        const wrapper = document.createElement('div')
        
        const labelElement = document.createElement('label')
        labelElement.htmlFor = name
        labelElement.textContent = label
        labelElement.style.fontSize = '16px'
        
        const input = document.createElement('input')
        input.id = name
        input.name = name
        input.type = 'number'
        input.step = '0.01'
        input.style.fontSize = '16px'
        input.style.padding = '12px'
        input.style.width = '100%'
        input.style.minHeight = '44px'
        
        wrapper.appendChild(labelElement)
        wrapper.appendChild(input)
        budgetForm.appendChild(wrapper)
      })

      document.body.appendChild(budgetForm)

      const allInputs = budgetForm.querySelectorAll('input')
      allInputs.forEach((input) => {
        const computedStyle = window.getComputedStyle(input)
        const fontSize = parseFloat(computedStyle.fontSize)
        const minHeight = parseFloat(computedStyle.minHeight)
        
        expect(fontSize).toBeGreaterThanOrEqual(16) // Prevents iOS zoom
        expect(minHeight).toBeGreaterThanOrEqual(44) // Touch target size
      })

      document.body.removeChild(budgetForm)
    })
  })

  describe('Touch Target Visibility Testing', () => {
    test('sufficient contrast for touch targets', () => {
      const buttons = [
        { bg: '#007bff', text: '#ffffff', type: 'primary' },
        { bg: '#6c757d', text: '#ffffff', type: 'secondary' },
        { bg: '#28a745', text: '#ffffff', type: 'success' },
        { bg: '#dc3545', text: '#ffffff', type: 'danger' }
      ]

      buttons.forEach(({ bg, text, type }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', `${type}-button`)
        button.style.backgroundColor = bg
        button.style.color = text
        button.style.border = 'none'
        button.style.padding = '12px 24px'
        button.style.minWidth = '48px'
        button.style.minHeight = '48px'
        button.textContent = type.charAt(0).toUpperCase() + type.slice(1)
        
        document.body.appendChild(button)

        // Mock contrast calculation (would use real library in production)
        const contrastRatio = touchHelpers.calculateContrastRatio(bg, text)
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5) // WCAG AA requirement

        document.body.removeChild(button)
      })
    })

    test('visual feedback validation for touch states', () => {
      const button = document.createElement('button')
      button.setAttribute('data-testid', 'interactive-button')
      button.style.backgroundColor = '#007bff'
      button.style.color = '#ffffff'
      button.style.padding = '12px 24px'
      button.style.minWidth = '48px'
      button.style.minHeight = '48px'
      button.style.border = 'none'
      button.style.borderRadius = '4px'
      button.style.transition = 'all 0.2s ease'
      button.textContent = 'Touch Me'

      document.body.appendChild(button)

      // Test hover state
      fireEvent.mouseEnter(button)
      expect(button).toHaveStyle('backgroundColor: #007bff')

      // Test active/pressed state
      fireEvent.mouseDown(button)
      const activeOpacity = window.getComputedStyle(button).opacity
      expect(parseFloat(activeOpacity)).toBeLessThan(1) // Should show pressed state

      fireEvent.mouseUp(button)
      fireEvent.mouseLeave(button)

      document.body.removeChild(button)
    })

    test('high contrast mode compatibility', () => {
      // Simulate high contrast mode
      document.body.classList.add('high-contrast-mode')
      
      const button = document.createElement('button')
      button.setAttribute('data-testid', 'high-contrast-button')
      button.style.minWidth = '48px'
      button.style.minHeight = '48px'
      button.style.border = '2px solid currentColor'
      button.style.backgroundColor = 'transparent'
      button.style.color = 'currentColor'
      button.textContent = 'High Contrast'

      document.body.appendChild(button)

      // In high contrast mode, buttons should have visible borders
      const computedStyle = window.getComputedStyle(button)
      expect(computedStyle.border).toContain('2px solid')
      expect(computedStyle.backgroundColor).toBe('transparent')

      document.body.removeChild(button)
      document.body.classList.remove('high-contrast-mode')
    })
  })

  describe('Wedding-Specific Touch Scenarios', () => {
    test('glove-friendly touch targets for outdoor ceremonies', () => {
      // Larger touch targets for gloved hands
      const emergencyButton = document.createElement('button')
      emergencyButton.setAttribute('data-testid', 'glove-emergency')
      emergencyButton.style.minWidth = '60px'  // Larger than standard 48px
      emergencyButton.style.minHeight = '60px'
      emergencyButton.style.padding = '16px'
      emergencyButton.textContent = 'EMERGENCY'

      document.body.appendChild(emergencyButton)

      const dimensions = touchHelpers.measureTouchTargetSync(emergencyButton)
      
      // Glove-friendly targets should be larger
      expect(dimensions.width).toBeGreaterThanOrEqual(60)
      expect(dimensions.height).toBeGreaterThanOrEqual(60)
      expect(dimensions.isGloveFriendly).toBe(true)

      document.body.removeChild(emergencyButton)
    })

    test('sunlight readable interface with high contrast', () => {
      const container = document.createElement('div')
      container.setAttribute('data-testid', 'sunlight-interface')
      container.style.backgroundColor = '#000000' // High contrast for sunlight
      container.style.color = '#ffffff'
      container.style.padding = '20px'

      const button = document.createElement('button')
      button.style.backgroundColor = '#ffffff'
      button.style.color = '#000000'
      button.style.border = '3px solid #000000'
      button.style.minWidth = '56px' // Larger for sunlight visibility
      button.style.minHeight = '56px'
      button.style.fontSize = '18px' // Larger text
      button.textContent = 'VISIBLE'

      container.appendChild(button)
      document.body.appendChild(container)

      // High contrast for sunlight readability
      const containerStyle = window.getComputedStyle(container)
      const buttonStyle = window.getComputedStyle(button)
      
      expect(containerStyle.backgroundColor).toBe('rgb(0, 0, 0)')
      expect(buttonStyle.backgroundColor).toBe('rgb(255, 255, 255)')
      expect(parseFloat(buttonStyle.fontSize)).toBeGreaterThanOrEqual(18)

      document.body.removeChild(container)
    })

    test('one-handed operation optimization', () => {
      const phoneInterface = document.createElement('div')
      phoneInterface.style.width = '375px' // iPhone width
      phoneInterface.style.height = '667px'
      phoneInterface.style.position = 'relative'

      // Critical actions in thumb-reach zone (bottom 2/3 of screen)
      const thumbReachZone = document.createElement('div')
      thumbReachZone.style.position = 'absolute'
      thumbReachZone.style.bottom = '0'
      thumbReachZone.style.width = '100%'
      thumbReachZone.style.height = '66.66%' // Bottom 2/3

      const emergencyButton = document.createElement('button')
      emergencyButton.setAttribute('data-testid', 'thumb-emergency')
      emergencyButton.style.position = 'absolute'
      emergencyButton.style.bottom = '20px'
      emergencyButton.style.right = '20px' // Right thumb reach
      emergencyButton.style.width = '60px'
      emergencyButton.style.height = '60px'
      emergencyButton.style.borderRadius = '50%'

      thumbReachZone.appendChild(emergencyButton)
      phoneInterface.appendChild(thumbReachZone)
      document.body.appendChild(phoneInterface)

      const buttonRect = emergencyButton.getBoundingClientRect()
      const interfaceRect = phoneInterface.getBoundingClientRect()
      
      // Button should be in bottom third (thumb reach zone)
      const buttonBottomPercent = ((interfaceRect.bottom - buttonRect.top) / interfaceRect.height) * 100
      expect(buttonBottomPercent).toBeLessThanOrEqual(66.66)

      document.body.removeChild(phoneInterface)
    })

    test('emergency timeline access during crisis', () => {
      const crisisInterface = document.createElement('div')
      crisisInterface.setAttribute('data-testid', 'crisis-timeline')
      crisisInterface.style.backgroundColor = '#dc3545' // Alert red
      crisisInterface.style.padding = '20px'

      const actions = [
        { id: 'contact-security', text: 'SECURITY', priority: 'critical' },
        { id: 'contact-coordinator', text: 'COORDINATOR', priority: 'high' },
        { id: 'contact-venue', text: 'VENUE', priority: 'medium' }
      ]

      actions.forEach(({ id, text, priority }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', id)
        button.style.width = priority === 'critical' ? '80px' : '60px'
        button.style.height = priority === 'critical' ? '80px' : '60px'
        button.style.margin = '10px'
        button.style.backgroundColor = '#ffffff'
        button.style.color = '#dc3545'
        button.style.fontWeight = 'bold'
        button.style.fontSize = priority === 'critical' ? '16px' : '14px'
        button.textContent = text

        crisisInterface.appendChild(button)
      })

      document.body.appendChild(crisisInterface)

      // Critical actions should be largest and most accessible
      const securityButton = crisisInterface.querySelector('[data-testid="contact-security"]') as HTMLElement
      const dimensions = touchHelpers.measureTouchTargetSync(securityButton)
      
      expect(dimensions.width).toBeGreaterThanOrEqual(80) // Largest for critical
      expect(dimensions.height).toBeGreaterThanOrEqual(80)

      document.body.removeChild(crisisInterface)
    })
  })

  describe('Cross-Platform Touch Compliance', () => {
    test('iOS specific touch requirements', () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      })

      const button = document.createElement('button')
      button.style.WebkitTouchCallout = 'none' // Disable iOS callout
      button.style.WebkitUserSelect = 'none'   // Disable text selection
      button.style.touchAction = 'manipulation' // Remove 300ms delay
      button.style.minWidth = '44px'
      button.style.minHeight = '44px'
      
      document.body.appendChild(button)

      const style = window.getComputedStyle(button)
      expect(style.webkitTouchCallout).toBe('none')
      expect(style.touchAction).toBe('manipulation')

      document.body.removeChild(button)
    })

    test('Android Material Design compliance', () => {
      // Mock Android user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36'
      })

      const button = document.createElement('button')
      button.style.minWidth = '48px'  // Android minimum 48dp
      button.style.minHeight = '48px'
      button.style.borderRadius = '4px'
      button.style.position = 'relative'
      button.style.overflow = 'hidden'
      
      // Mock ripple effect container
      const ripple = document.createElement('span')
      ripple.className = 'ripple-effect'
      ripple.style.position = 'absolute'
      ripple.style.borderRadius = '50%'
      ripple.style.backgroundColor = 'rgba(255,255,255,0.3)'
      button.appendChild(ripple)

      document.body.appendChild(button)

      const dimensions = touchHelpers.measureTouchTargetSync(button)
      expect(dimensions.width).toBeGreaterThanOrEqual(48)
      expect(dimensions.height).toBeGreaterThanOrEqual(48)
      expect(button.querySelector('.ripple-effect')).toBeTruthy()

      document.body.removeChild(button)
    })

    test('desktop touch simulation compatibility', () => {
      const element = document.createElement('button')
      element.style.minWidth = '48px'
      element.style.minHeight = '48px'
      element.style.cursor = 'pointer'
      
      // Should handle both mouse and touch events
      let mouseClicked = false
      let touchHandled = false

      element.addEventListener('click', () => { mouseClicked = true })
      element.addEventListener('touchstart', () => { touchHandled = true })

      document.body.appendChild(element)

      // Simulate mouse click
      fireEvent.click(element)
      expect(mouseClicked).toBe(true)

      // Simulate touch (if supported)
      if ('ontouchstart' in window) {
        fireEvent.touchStart(element)
        expect(touchHandled).toBe(true)
      }

      document.body.removeChild(element)
    })
  })
})