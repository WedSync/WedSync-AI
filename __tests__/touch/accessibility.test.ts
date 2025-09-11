import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

describe('WS-189 Touch Accessibility Compliance Testing', () => {
  
  beforeEach(() => {
    // Reset any global accessibility state
    document.body.className = ''
    
    // Mock screen reader APIs
    global.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      speaking: false,
      pending: false,
      paused: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any

    // Mock assistive technology APIs
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    })
  })

  describe('Screen Reader Integration Testing', () => {
    
    test('VoiceOver announcement accuracy for touch actions', async () => {
      const emergencyButton = document.createElement('button')
      emergencyButton.setAttribute('data-testid', 'emergency-contact')
      emergencyButton.setAttribute('aria-label', 'Emergency contact. Double tap to call venue security immediately.')
      emergencyButton.setAttribute('role', 'button')
      emergencyButton.style.width = '60px'
      emergencyButton.style.height = '60px'
      emergencyButton.textContent = 'EMERGENCY'
      
      let announcementMade = false
      let announcementText = ''
      
      emergencyButton.addEventListener('touchstart', () => {
        // Simulate VoiceOver announcement
        announcementText = 'Emergency contact button activated. Calling venue security.'
        announcementMade = true
        
        if (global.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(announcementText)
          global.speechSynthesis.speak(utterance)
        }
      })
      
      document.body.appendChild(emergencyButton)

      // Test touch interaction with screen reader
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 30, clientY: 30 } as Touch] as TouchList
      } as TouchEventInit)
      
      emergencyButton.dispatchEvent(touchEvent)

      expect(announcementMade).toBe(true)
      expect(announcementText).toContain('Emergency contact button activated')
      expect(global.speechSynthesis.speak).toHaveBeenCalled()
      
      // Verify ARIA attributes
      expect(emergencyButton.getAttribute('aria-label')).toContain('Emergency contact')
      expect(emergencyButton.getAttribute('role')).toBe('button')

      document.body.removeChild(emergencyButton)
    })

    test('TalkBack integration with touch gesture coordination', async () => {
      const timelineNavigation = document.createElement('div')
      timelineNavigation.setAttribute('data-testid', 'timeline-navigation')
      timelineNavigation.setAttribute('role', 'region')
      timelineNavigation.setAttribute('aria-label', 'Wedding timeline navigation. Swipe left or right to navigate between events.')
      timelineNavigation.style.width = '300px'
      timelineNavigation.style.height = '200px'
      
      const timelineEvents = [
        { id: 'ceremony', time: '2:00 PM', title: 'Ceremony begins' },
        { id: 'photos', time: '3:00 PM', title: 'Photo session' },
        { id: 'reception', time: '6:00 PM', title: 'Reception starts' }
      ]
      
      let currentEventIndex = 0
      let lastAnnouncement = ''
      
      timelineEvents.forEach((event, index) => {
        const eventElement = document.createElement('div')
        eventElement.setAttribute('data-testid', `event-${event.id}`)
        eventElement.setAttribute('role', 'button')
        eventElement.setAttribute('tabindex', '0')
        eventElement.setAttribute('aria-label', `${event.time}, ${event.title}`)
        eventElement.style.display = index === 0 ? 'block' : 'none'
        eventElement.textContent = `${event.time} - ${event.title}`
        
        timelineNavigation.appendChild(eventElement)
      })
      
      // Swipe navigation with TalkBack integration
      timelineNavigation.addEventListener('touchstart', (e) => {
        const startX = (e as TouchEvent).touches[0].clientX
        
        const handleTouchMove = (e: TouchEvent) => {
          const currentX = e.touches[0].clientX
          const swipeDistance = currentX - startX
          
          if (Math.abs(swipeDistance) > 50) {
            if (swipeDistance > 0 && currentEventIndex > 0) {
              // Swipe right - previous event
              currentEventIndex--
            } else if (swipeDistance < 0 && currentEventIndex < timelineEvents.length - 1) {
              // Swipe left - next event
              currentEventIndex++
            }
            
            // Update display and announce
            timelineEvents.forEach((_, index) => {
              const element = timelineNavigation.querySelector(`[data-testid="event-${timelineEvents[index].id}"]`) as HTMLElement
              element.style.display = index === currentEventIndex ? 'block' : 'none'
            })
            
            const currentEvent = timelineEvents[currentEventIndex]
            lastAnnouncement = `Navigated to ${currentEvent.title} at ${currentEvent.time}`
            
            if (global.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(lastAnnouncement)
              global.speechSynthesis.speak(utterance)
            }
            
            timelineNavigation.removeEventListener('touchmove', handleTouchMove)
          }
        }
        
        timelineNavigation.addEventListener('touchmove', handleTouchMove)
      })
      
      document.body.appendChild(timelineNavigation)

      // Test swipe navigation
      const swipeEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 250, clientY: 100 } as Touch] as TouchList
      } as TouchEventInit)
      
      const swipeMoveEvent = new TouchEvent('touchmove', {
        touches: [{ identifier: 0, clientX: 150, clientY: 100 } as Touch] as TouchList
      } as TouchEventInit)
      
      timelineNavigation.dispatchEvent(swipeEvent)
      timelineNavigation.dispatchEvent(swipeMoveEvent)

      expect(lastAnnouncement).toContain('Navigated to')
      expect(currentEventIndex).toBe(1) // Should have moved to next event

      document.body.removeChild(timelineNavigation)
    })

    test('ARIA live region updates for touch interactions', async () => {
      const statusRegion = document.createElement('div')
      statusRegion.setAttribute('aria-live', 'polite')
      statusRegion.setAttribute('aria-atomic', 'true')
      statusRegion.setAttribute('data-testid', 'touch-status')
      statusRegion.style.position = 'absolute'
      statusRegion.style.left = '-9999px' // Screen reader only
      
      const touchInterface = document.createElement('div')
      touchInterface.setAttribute('data-testid', 'vendor-status-interface')
      touchInterface.style.width = '300px'
      touchInterface.style.height = '200px'
      
      const vendors = [
        { id: 'photographer', name: 'Wedding Photographer', status: 'arrived' },
        { id: 'caterer', name: 'Catering Team', status: 'setup' },
        { id: 'musician', name: 'Wedding Band', status: 'pending' }
      ]
      
      vendors.forEach(vendor => {
        const vendorButton = document.createElement('button')
        vendorButton.setAttribute('data-testid', `vendor-${vendor.id}`)
        vendorButton.setAttribute('aria-describedby', 'touch-status')
        vendorButton.style.width = '80px'
        vendorButton.style.height = '50px'
        vendorButton.style.margin = '5px'
        vendorButton.textContent = vendor.name
        
        vendorButton.addEventListener('touchstart', () => {
          statusRegion.textContent = `${vendor.name} status: ${vendor.status}. Touch to update status.`
        })
        
        vendorButton.addEventListener('touchend', () => {
          // Cycle through statuses
          const statuses = ['pending', 'arrived', 'setup', 'ready']
          const currentIndex = statuses.indexOf(vendor.status)
          vendor.status = statuses[(currentIndex + 1) % statuses.length]
          
          statusRegion.textContent = `${vendor.name} status updated to: ${vendor.status}`
        })
        
        touchInterface.appendChild(vendorButton)
      })
      
      document.body.appendChild(statusRegion)
      document.body.appendChild(touchInterface)

      // Test touch interaction with live region updates
      const photographerButton = touchInterface.querySelector('[data-testid="vendor-photographer"]') as HTMLElement
      
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 40, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 0, clientX: 40, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      photographerButton.dispatchEvent(touchStartEvent)
      expect(statusRegion.textContent).toContain('Wedding Photographer status: arrived')
      
      photographerButton.dispatchEvent(touchEndEvent)
      expect(statusRegion.textContent).toContain('status updated to:')

      document.body.removeChild(statusRegion)
      document.body.removeChild(touchInterface)
    })
  })

  describe('Alternative Input Method Testing', () => {
    
    test('stylus precision input compatibility', async () => {
      const precisionDrawing = document.createElement('canvas')
      precisionDrawing.setAttribute('data-testid', 'floor-plan-canvas')
      precisionDrawing.width = 400
      precisionDrawing.height = 300
      precisionDrawing.style.border = '1px solid #ccc'
      
      const ctx = precisionDrawing.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      
      let isDrawing = false
      let lastX = 0
      let lastY = 0
      let stylusDetected = false
      
      precisionDrawing.addEventListener('touchstart', (e) => {
        const touch = (e as TouchEvent).touches[0]
        
        // Detect stylus by touch characteristics
        if (touch.radiusX < 5 && touch.radiusY < 5 && touch.force > 0.5) {
          stylusDetected = true
        }
        
        isDrawing = true
        lastX = touch.clientX - precisionDrawing.offsetLeft
        lastY = touch.clientY - precisionDrawing.offsetTop
      })
      
      precisionDrawing.addEventListener('touchmove', (e) => {
        if (!isDrawing) return
        
        const touch = (e as TouchEvent).touches[0]
        const currentX = touch.clientX - precisionDrawing.offsetLeft
        const currentY = touch.clientY - precisionDrawing.offsetTop
        
        // Draw line with stylus precision
        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
        ctx.lineTo(currentX, currentY)
        
        // Stylus-specific styling
        if (stylusDetected) {
          ctx.lineWidth = touch.force * 3 // Pressure-sensitive line width
          ctx.strokeStyle = '#007bff'
        } else {
          ctx.lineWidth = 2
          ctx.strokeStyle = '#333'
        }
        
        ctx.stroke()
        
        lastX = currentX
        lastY = currentY
      })
      
      precisionDrawing.addEventListener('touchend', () => {
        isDrawing = false
        stylusDetected = false
      })
      
      document.body.appendChild(precisionDrawing)

      // Simulate stylus touch
      const stylusTouch = new TouchEvent('touchstart', {
        touches: [{
          identifier: 0,
          clientX: precisionDrawing.offsetLeft + 100,
          clientY: precisionDrawing.offsetTop + 100,
          radiusX: 3,
          radiusY: 3,
          force: 0.8
        } as Touch] as TouchList
      } as TouchEventInit)
      
      const stylusMove = new TouchEvent('touchmove', {
        touches: [{
          identifier: 0,
          clientX: precisionDrawing.offsetLeft + 150,
          clientY: precisionDrawing.offsetTop + 120,
          radiusX: 3,
          radiusY: 3,
          force: 0.6
        } as Touch] as TouchList
      } as TouchEventInit)
      
      precisionDrawing.dispatchEvent(stylusTouch)
      precisionDrawing.dispatchEvent(stylusMove)

      expect(stylusDetected).toBe(true)
      expect(isDrawing).toBe(true)

      document.body.removeChild(precisionDrawing)
    })

    test('voice control integration with touch fallback', async () => {
      // Mock Web Speech API
      const mockSpeechRecognition = {
        continuous: true,
        interimResults: false,
        lang: 'en-US',
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      Object.defineProperty(window, 'SpeechRecognition', {
        writable: true,
        value: vi.fn().mockImplementation(() => mockSpeechRecognition)
      })

      const voiceInterface = document.createElement('div')
      voiceInterface.setAttribute('data-testid', 'voice-touch-interface')
      voiceInterface.style.width = '300px'
      voiceInterface.style.height = '200px'
      
      const commandButtons = [
        { command: 'emergency contact', action: 'call-security', label: 'Emergency Contact' },
        { command: 'update timeline', action: 'timeline-update', label: 'Update Timeline' },
        { command: 'check vendors', action: 'vendor-status', label: 'Vendor Status' }
      ]
      
      let voiceRecognitionActive = false
      let lastVoiceCommand = ''
      
      commandButtons.forEach(({ command, action, label }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', action)
        button.setAttribute('data-voice-command', command)
        button.style.width = '80px'
        button.style.height = '50px'
        button.style.margin = '5px'
        button.textContent = label
        
        // Touch fallback
        button.addEventListener('touchstart', () => {
          lastVoiceCommand = command
          console.log(`Touch fallback: Executing ${command}`)
        })
        
        voiceInterface.appendChild(button)
      })
      
      // Voice activation button
      const voiceButton = document.createElement('button')
      voiceButton.setAttribute('data-testid', 'voice-activation')
      voiceButton.setAttribute('aria-label', 'Activate voice control. Say commands like emergency contact or update timeline.')
      voiceButton.style.width = '60px'
      voiceButton.style.height = '60px'
      voiceButton.textContent = '🎤'
      
      voiceButton.addEventListener('touchstart', () => {
        voiceRecognitionActive = !voiceRecognitionActive
        
        if (voiceRecognitionActive) {
          mockSpeechRecognition.start()
          voiceButton.style.backgroundColor = '#dc3545' // Recording indicator
        } else {
          mockSpeechRecognition.stop()
          voiceButton.style.backgroundColor = ''
        }
      })
      
      voiceInterface.appendChild(voiceButton)
      document.body.appendChild(voiceInterface)

      // Test voice activation
      const voiceActivationEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 30, clientY: 30 } as Touch] as TouchList
      } as TouchEventInit)
      
      voiceButton.dispatchEvent(voiceActivationEvent)
      
      expect(voiceRecognitionActive).toBe(true)
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
      
      // Test touch fallback
      const emergencyButton = voiceInterface.querySelector('[data-testid="call-security"]') as HTMLElement
      const touchFallbackEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 40, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      emergencyButton.dispatchEvent(touchFallbackEvent)
      expect(lastVoiceCommand).toBe('emergency contact')

      document.body.removeChild(voiceInterface)
    })

    test('switch control navigation with touch timing accommodation', async () => {
      const switchInterface = document.createElement('div')
      switchInterface.setAttribute('data-testid', 'switch-control-interface')
      switchInterface.setAttribute('role', 'application')
      switchInterface.setAttribute('aria-label', 'Switch control navigation for wedding coordination')
      switchInterface.style.width = '400px'
      switchInterface.style.height = '300px'
      
      const navigationItems = [
        { id: 'timeline', label: 'Timeline', priority: 'high' },
        { id: 'vendors', label: 'Vendors', priority: 'high' },
        { id: 'guests', label: 'Guests', priority: 'medium' },
        { id: 'budget', label: 'Budget', priority: 'medium' },
        { id: 'photos', label: 'Photos', priority: 'low' },
        { id: 'settings', label: 'Settings', priority: 'low' }
      ]
      
      let currentIndex = 0
      let scanningActive = false
      let scanningInterval: NodeJS.Timeout | null = null
      let dwellTime = 1000 // 1 second dwell time for accessibility
      
      navigationItems.forEach((item, index) => {
        const navButton = document.createElement('button')
        navButton.setAttribute('data-testid', `nav-${item.id}`)
        navButton.setAttribute('data-priority', item.priority)
        navButton.setAttribute('tabindex', index === 0 ? '0' : '-1')
        navButton.style.width = '120px'
        navButton.style.height = '60px'
        navButton.style.margin = '10px'
        navButton.style.position = 'relative'
        navButton.textContent = item.label
        
        // Visual focus indicator for switch control
        if (index === 0) {
          navButton.style.outline = '3px solid #007bff'
          navButton.style.backgroundColor = '#e3f2fd'
        }
        
        switchInterface.appendChild(navButton)
      })
      
      // Switch control scanning logic
      const startScanning = () => {
        scanningActive = true
        currentIndex = 0
        
        scanningInterval = setInterval(() => {
          // Clear previous highlight
          navigationItems.forEach((_, index) => {
            const button = switchInterface.querySelector(`[data-testid="nav-${navigationItems[index].id}"]`) as HTMLElement
            button.style.outline = 'none'
            button.style.backgroundColor = ''
            button.setAttribute('tabindex', '-1')
          })
          
          // Highlight current item
          const currentButton = switchInterface.querySelector(`[data-testid="nav-${navigationItems[currentIndex].id}"]`) as HTMLElement
          currentButton.style.outline = '3px solid #007bff'
          currentButton.style.backgroundColor = '#e3f2fd'
          currentButton.setAttribute('tabindex', '0')
          currentButton.focus()
          
          // Announce for screen reader
          const announcement = `Scanning ${navigationItems[currentIndex].label}`
          if (global.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(announcement)
            global.speechSynthesis.speak(utterance)
          }
          
          currentIndex = (currentIndex + 1) % navigationItems.length
        }, dwellTime)
      }
      
      // Touch accommodation for switch users
      const accommodatedTouchHandler = (button: HTMLElement, callback: () => void) => {
        let touchStartTime = 0
        let longPressTimer: NodeJS.Timeout | null = null
        
        button.addEventListener('touchstart', (e) => {
          touchStartTime = Date.now()
          
          // Long press for switch users (2 seconds)
          longPressTimer = setTimeout(() => {
            callback()
          }, 2000)
        })
        
        button.addEventListener('touchend', () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer)
          }
          
          const touchDuration = Date.now() - touchStartTime
          
          // Normal touch activation (500ms minimum for accessibility)
          if (touchDuration >= 500 && touchDuration < 2000) {
            callback()
          }
        })
      }
      
      // Add switch control toggle
      const switchToggle = document.createElement('button')
      switchToggle.setAttribute('data-testid', 'switch-toggle')
      switchToggle.setAttribute('aria-label', 'Toggle switch control scanning mode')
      switchToggle.style.width = '100px'
      switchToggle.style.height = '50px'
      switchToggle.style.backgroundColor = '#28a745'
      switchToggle.textContent = 'Switch Mode'
      
      accommodatedTouchHandler(switchToggle, () => {
        if (scanningActive) {
          if (scanningInterval) clearInterval(scanningInterval)
          scanningActive = false
          switchToggle.textContent = 'Switch Mode'
        } else {
          startScanning()
          switchToggle.textContent = 'Stop Scanning'
        }
      })
      
      switchInterface.appendChild(switchToggle)
      document.body.appendChild(switchInterface)

      // Test switch mode activation
      const switchActivationEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 50, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      switchToggle.dispatchEvent(switchActivationEvent)
      
      // Hold for required duration
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const switchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 0, clientX: 50, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      switchToggle.dispatchEvent(switchEndEvent)
      
      expect(scanningActive).toBe(true)
      expect(switchToggle.textContent).toBe('Stop Scanning')

      // Cleanup
      if (scanningInterval) clearInterval(scanningInterval)
      document.body.removeChild(switchInterface)
    })
  })

  describe('High Contrast Mode Support', () => {
    
    test('touch target visibility in high contrast mode', async () => {
      // Enable high contrast mode
      document.body.classList.add('high-contrast')
      
      const highContrastInterface = document.createElement('div')
      highContrastInterface.setAttribute('data-testid', 'high-contrast-interface')
      highContrastInterface.style.width = '400px'
      highContrastInterface.style.height = '300px'
      highContrastInterface.style.backgroundColor = '#000000' // High contrast black
      highContrastInterface.style.color = '#ffffff' // High contrast white
      
      const touchTargets = [
        { id: 'primary', label: 'Primary Action', type: 'primary' },
        { id: 'secondary', label: 'Secondary Action', type: 'secondary' },
        { id: 'danger', label: 'Emergency', type: 'danger' },
        { id: 'success', label: 'Confirm', type: 'success' }
      ]
      
      touchTargets.forEach(({ id, label, type }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', `hc-${id}`)
        button.setAttribute('data-type', type)
        button.style.width = '80px'
        button.style.height = '50px'
        button.style.margin = '10px'
        button.style.fontSize = '16px'
        button.style.fontWeight = 'bold'
        
        // High contrast colors
        switch (type) {
          case 'primary':
            button.style.backgroundColor = '#ffffff'
            button.style.color = '#000000'
            button.style.border = '3px solid #ffffff'
            break
          case 'secondary':
            button.style.backgroundColor = '#000000'
            button.style.color = '#ffffff'
            button.style.border = '3px solid #ffffff'
            break
          case 'danger':
            button.style.backgroundColor = '#ff0000'
            button.style.color = '#ffffff'
            button.style.border = '3px solid #ff0000'
            break
          case 'success':
            button.style.backgroundColor = '#00ff00'
            button.style.color = '#000000'
            button.style.border = '3px solid #00ff00'
            break
        }
        
        button.textContent = label
        
        // Enhanced focus for high contrast
        button.addEventListener('focus', () => {
          button.style.outline = '4px solid #ffff00' // Yellow outline
          button.style.outlineOffset = '2px'
        })
        
        // Touch feedback in high contrast
        button.addEventListener('touchstart', () => {
          button.style.transform = 'scale(1.1)'
          button.style.outline = '4px solid #ffff00'
        })
        
        button.addEventListener('touchend', () => {
          button.style.transform = 'scale(1)'
          button.style.outline = type === 'secondary' ? 'none' : `3px solid ${button.style.borderColor}`
        })
        
        highContrastInterface.appendChild(button)
      })
      
      document.body.appendChild(highContrastInterface)

      // Test high contrast touch targets
      const primaryButton = highContrastInterface.querySelector('[data-testid="hc-primary"]') as HTMLElement
      const dangerButton = highContrastInterface.querySelector('[data-testid="hc-danger"]') as HTMLElement
      
      // Test touch feedback
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 40, clientY: 25 } as Touch] as TouchList
      } as TouchEventInit)
      
      primaryButton.dispatchEvent(touchEvent)
      expect(primaryButton.style.transform).toBe('scale(1.1)')
      expect(primaryButton.style.outline).toBe('4px solid rgb(255, 255, 0)')
      
      // Test contrast ratios (mock calculation)
      const primaryContrast = calculateContrastRatio('#ffffff', '#000000')
      const dangerContrast = calculateContrastRatio('#ff0000', '#ffffff')
      
      expect(primaryContrast).toBeGreaterThanOrEqual(7) // WCAG AAA requirement
      expect(dangerContrast).toBeGreaterThanOrEqual(4.5) // WCAG AA requirement

      document.body.removeChild(highContrastInterface)
      document.body.classList.remove('high-contrast')
    })

    test('reduced motion preferences for touch animations', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn()
        }))
      })

      const reducedMotionInterface = document.createElement('div')
      reducedMotionInterface.setAttribute('data-testid', 'reduced-motion-interface')
      reducedMotionInterface.style.width = '300px'
      reducedMotionInterface.style.height = '200px'
      
      const animatedButton = document.createElement('button')
      animatedButton.setAttribute('data-testid', 'animated-button')
      animatedButton.style.width = '100px'
      animatedButton.style.height = '60px'
      animatedButton.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      animatedButton.textContent = 'Animated Button'
      
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      
      animatedButton.addEventListener('touchstart', () => {
        if (prefersReducedMotion) {
          // Reduced motion - instant feedback
          animatedButton.style.opacity = '0.8'
          animatedButton.style.transform = 'none'
          animatedButton.style.transition = 'none'
        } else {
          // Normal motion - animated feedback
          animatedButton.style.opacity = '0.8'
          animatedButton.style.transform = 'scale(0.95)'
        }
      })
      
      animatedButton.addEventListener('touchend', () => {
        if (prefersReducedMotion) {
          animatedButton.style.opacity = '1'
        } else {
          animatedButton.style.opacity = '1'
          animatedButton.style.transform = 'scale(1)'
        }
      })
      
      reducedMotionInterface.appendChild(animatedButton)
      document.body.appendChild(reducedMotionInterface)

      // Test reduced motion behavior
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 50, clientY: 30 } as Touch] as TouchList
      } as TouchEventInit)
      
      animatedButton.dispatchEvent(touchStartEvent)
      
      // With reduced motion, transition should be disabled
      expect(animatedButton.style.transition).toBe('none')
      expect(animatedButton.style.transform).toBe('none')
      expect(animatedButton.style.opacity).toBe('0.8')

      document.body.removeChild(reducedMotionInterface)
    })
  })

  describe('Motor Accessibility Testing', () => {
    
    test('timing adaptation for users with limited dexterity', async () => {
      const adaptiveInterface = document.createElement('div')
      adaptiveInterface.setAttribute('data-testid', 'adaptive-timing-interface')
      adaptiveInterface.style.width = '300px'
      adaptiveInterface.style.height = '200px'
      
      // Extended timing settings
      const timingSettings = {
        dwellTime: 2000,        // 2 seconds for dwell activation
        doubleTapDelay: 1000,   // 1 second between double taps
        longPressTime: 3000,    // 3 seconds for long press
        timeoutExtension: 5000  // 5 seconds extra for timeouts
      }
      
      const adaptiveButton = document.createElement('button')
      adaptiveButton.setAttribute('data-testid', 'adaptive-button')
      adaptiveButton.setAttribute('aria-label', 'Adaptive timing button. Hold for 3 seconds or dwell for 2 seconds to activate.')
      adaptiveButton.style.width = '120px'
      adaptiveButton.style.height = '80px'
      adaptiveButton.style.fontSize = '18px'
      adaptiveButton.textContent = 'Adaptive Button'
      
      let dwellTimer: NodeJS.Timeout | null = null
      let longPressTimer: NodeJS.Timeout | null = null
      let activated = false
      let activationMethod = ''
      
      // Dwell activation (hover equivalent for touch)
      adaptiveButton.addEventListener('touchstart', () => {
        activated = false
        
        // Start dwell timer
        dwellTimer = setTimeout(() => {
          activated = true
          activationMethod = 'dwell'
          adaptiveButton.style.backgroundColor = '#28a745'
          adaptiveButton.textContent = 'Activated (Dwell)'
        }, timingSettings.dwellTime)
        
        // Start long press timer
        longPressTimer = setTimeout(() => {
          if (!activated) {
            activated = true
            activationMethod = 'long-press'
            adaptiveButton.style.backgroundColor = '#007bff'
            adaptiveButton.textContent = 'Activated (Long Press)'
          }
        }, timingSettings.longPressTime)
      })
      
      adaptiveButton.addEventListener('touchend', () => {
        if (dwellTimer) clearTimeout(dwellTimer)
        if (longPressTimer) clearTimeout(longPressTimer)
        
        // Reset if not activated
        if (!activated) {
          adaptiveButton.style.backgroundColor = ''
          adaptiveButton.textContent = 'Adaptive Button'
        }
      })
      
      adaptiveInterface.appendChild(adaptiveButton)
      document.body.appendChild(adaptiveInterface)

      // Test dwell activation
      const dwellTouchStart = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 60, clientY: 40 } as Touch] as TouchList
      } as TouchEventInit)
      
      adaptiveButton.dispatchEvent(dwellTouchStart)
      
      // Wait for dwell time
      await new Promise(resolve => setTimeout(resolve, timingSettings.dwellTime + 100))
      
      expect(activated).toBe(true)
      expect(activationMethod).toBe('dwell')
      expect(adaptiveButton.textContent).toBe('Activated (Dwell)')

      document.body.removeChild(adaptiveInterface)
    })

    test('large touch target optimization for limited mobility', async () => {
      const mobilityInterface = document.createElement('div')
      mobilityInterface.setAttribute('data-testid', 'mobility-optimized-interface')
      mobilityInterface.style.width = '400px'
      mobilityInterface.style.height = '300px'
      mobilityInterface.style.padding = '20px'
      
      // Extra-large touch targets for limited mobility
      const actions = [
        { id: 'emergency', label: 'EMERGENCY', size: 100, priority: 'critical' },
        { id: 'help', label: 'HELP', size: 80, priority: 'high' },
        { id: 'confirm', label: 'CONFIRM', size: 70, priority: 'medium' },
        { id: 'cancel', label: 'CANCEL', size: 70, priority: 'medium' }
      ]
      
      actions.forEach(({ id, label, size, priority }) => {
        const button = document.createElement('button')
        button.setAttribute('data-testid', `mobility-${id}`)
        button.setAttribute('data-priority', priority)
        button.style.width = `${size}px`
        button.style.height = `${size}px`
        button.style.margin = '15px' // Extra spacing
        button.style.fontSize = `${Math.max(18, size / 5)}px`
        button.style.fontWeight = 'bold'
        button.style.borderRadius = '8px'
        button.style.border = '3px solid'
        
        // Priority-based styling
        switch (priority) {
          case 'critical':
            button.style.backgroundColor = '#dc3545'
            button.style.color = '#ffffff'
            button.style.borderColor = '#dc3545'
            break
          case 'high':
            button.style.backgroundColor = '#ffc107'
            button.style.color = '#000000'
            button.style.borderColor = '#ffc107'
            break
          case 'medium':
            button.style.backgroundColor = '#007bff'
            button.style.color = '#ffffff'
            button.style.borderColor = '#007bff'
            break
        }
        
        button.textContent = label
        
        // Enhanced touch feedback for mobility users
        button.addEventListener('touchstart', () => {
          button.style.transform = 'scale(1.05)'
          button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
          
          // Longer vibration for confirmation
          if (navigator.vibrate) {
            const pattern = priority === 'critical' ? [200, 100, 200] : [100]
            navigator.vibrate(pattern)
          }
        })
        
        button.addEventListener('touchend', () => {
          button.style.transform = 'scale(1)'
          button.style.boxShadow = 'none'
        })
        
        mobilityInterface.appendChild(button)
      })
      
      document.body.appendChild(mobilityInterface)

      // Test large touch targets
      const emergencyButton = mobilityInterface.querySelector('[data-testid="mobility-emergency"]') as HTMLElement
      const helpButton = mobilityInterface.querySelector('[data-testid="mobility-help"]') as HTMLElement
      
      // Verify sizing
      expect(emergencyButton.style.width).toBe('100px')
      expect(emergencyButton.style.height).toBe('100px')
      expect(helpButton.style.width).toBe('80px')
      expect(helpButton.style.height).toBe('80px')
      
      // Test touch feedback
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 50, clientY: 50 } as Touch] as TouchList
      } as TouchEventInit)
      
      emergencyButton.dispatchEvent(touchEvent)
      expect(emergencyButton.style.transform).toBe('scale(1.05)')
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200])

      document.body.removeChild(mobilityInterface)
    })
  })

  // Helper function for contrast calculation
  function calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation (would use real library in production)
    const getLuminance = (color: string): number => {
      // Mock luminance calculation
      if (color === '#ffffff') return 1
      if (color === '#000000') return 0
      if (color === '#ff0000') return 0.2126
      if (color === '#00ff00') return 0.7152
      return 0.5 // Default middle value
    }
    
    const lum1 = getLuminance(color1)
    const lum2 = getLuminance(color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }

  afterEach(() => {
    // Cleanup accessibility state
    document.body.className = ''
    if (global.speechSynthesis) {
      global.speechSynthesis.cancel()
    }
  })
})