/**
 * WS-189 Touch Testing Utilities
 * Comprehensive utility functions for touch interaction testing
 */

export interface TouchTargetDimensions {
  width: number
  height: number
  effectiveWidth: number
  effectiveHeight: number
  meetsWCAGRequirements: boolean
  isGloveFriendly: boolean
  hasProperSpacing: boolean
}

export interface TouchEventSimulation {
  identifier: number
  clientX: number
  clientY: number
  force?: number
  radiusX?: number
  radiusY?: number
}

export interface ElementSpacing {
  horizontal: number
  vertical: number
  isAccidentalTouchPrevented: boolean
}

export interface TouchPerformanceMetrics {
  responseTime: number
  accuracy: number
  successRate: number
  errorRate: number
}

export interface AccessibilityTestResult {
  hasLabel: boolean
  hasFocusIndicator: boolean
  contrastRatio: number
  keyboardAccessible: boolean
  screenReaderCompatible: boolean
  wcagCompliant: boolean
}

export class TouchTestingHelpers {
  private performanceRecords: Array<{
    element: string
    action: string
    timestamp: number
    responseTime: number
  }> = []

  /**
   * Measure touch target dimensions and validate WCAG compliance
   */
  async measureTouchTarget(element: HTMLElement): Promise<TouchTargetDimensions> {
    return new Promise((resolve) => {
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      
      // Calculate padding and margin
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0
      
      const effectiveWidth = rect.width + paddingLeft + paddingRight
      const effectiveHeight = rect.height + paddingTop + paddingBottom
      
      // WCAG 2.1 AA requirements: minimum 44x44px
      const meetsWCAGRequirements = effectiveWidth >= 44 && effectiveHeight >= 44
      
      // Glove-friendly targets should be larger (60x60px minimum)
      const isGloveFriendly = effectiveWidth >= 60 && effectiveHeight >= 60
      
      // Check spacing with adjacent elements
      const hasProperSpacing = this.checkElementSpacing(element)
      
      resolve({
        width: rect.width,
        height: rect.height,
        effectiveWidth,
        effectiveHeight,
        meetsWCAGRequirements,
        isGloveFriendly,
        hasProperSpacing
      })
    })
  }

  /**
   * Synchronous version of measureTouchTarget for simple cases
   */
  measureTouchTargetSync(element: HTMLElement): TouchTargetDimensions {
    const rect = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)
    
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0
    
    const effectiveWidth = rect.width + paddingLeft + paddingRight
    const effectiveHeight = rect.height + paddingTop + paddingBottom
    
    const meetsWCAGRequirements = effectiveWidth >= 44 && effectiveHeight >= 44
    const isGloveFriendly = effectiveWidth >= 60 && effectiveHeight >= 60
    const hasProperSpacing = this.checkElementSpacing(element)
    
    return {
      width: rect.width,
      height: rect.height,
      effectiveWidth,
      effectiveHeight,
      meetsWCAGRequirements,
      isGloveFriendly,
      hasProperSpacing
    }
  }

  /**
   * Measure spacing between adjacent elements
   */
  measureElementSpacing(element1: HTMLElement, element2: HTMLElement): ElementSpacing {
    const rect1 = element1.getBoundingClientRect()
    const rect2 = element2.getBoundingClientRect()
    
    // Calculate horizontal and vertical gaps
    const horizontalGap = Math.abs(rect2.left - rect1.right)
    const verticalGap = Math.abs(rect2.top - rect1.bottom)
    
    // Use the smaller gap as the spacing measurement
    const horizontal = Math.min(horizontalGap, Math.abs(rect1.left - rect2.right))
    const vertical = Math.min(verticalGap, Math.abs(rect1.top - rect2.bottom))
    
    // Prevent accidental touches (minimum 8px spacing for critical actions)
    const isAccidentalTouchPrevented = horizontal >= 8 || vertical >= 8
    
    return {
      horizontal,
      vertical,
      isAccidentalTouchPrevented
    }
  }

  /**
   * Check spacing with all adjacent elements
   */
  private checkElementSpacing(element: HTMLElement): boolean {
    const siblings = Array.from(element.parentElement?.children || [])
      .filter(child => child !== element && child instanceof HTMLElement) as HTMLElement[]
    
    for (const sibling of siblings) {
      const spacing = this.measureElementSpacing(element, sibling)
      if (!spacing.isAccidentalTouchPrevented) {
        return false
      }
    }
    
    return true
  }

  /**
   * Simulate touch events with customizable parameters
   */
  simulateTouch(
    element: HTMLElement, 
    touchType: 'start' | 'move' | 'end' | 'cancel',
    touches: TouchEventSimulation[]
  ): TouchEvent {
    const touchList = touches.map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      force: touch.force || 1.0,
      radiusX: touch.radiusX || 5,
      radiusY: touch.radiusY || 5,
      target: element
    })) as unknown as TouchList

    const touchEvent = new TouchEvent(`touch${touchType}`, {
      touches: touchType === 'end' || touchType === 'cancel' ? [] as any : touchList,
      changedTouches: touchList,
      targetTouches: touchList,
      bubbles: true,
      cancelable: true
    })

    element.dispatchEvent(touchEvent)
    return touchEvent
  }

  /**
   * Simulate multi-touch pinch gesture
   */
  simulatePinchGesture(
    element: HTMLElement,
    centerX: number,
    centerY: number,
    initialDistance: number,
    finalDistance: number,
    steps: number = 10
  ): void {
    // Start touch with two fingers
    this.simulateTouch(element, 'start', [
      { identifier: 0, clientX: centerX - initialDistance/2, clientY: centerY },
      { identifier: 1, clientX: centerX + initialDistance/2, clientY: centerY }
    ])

    // Animate the pinch
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const currentDistance = initialDistance + (finalDistance - initialDistance) * progress
      
      this.simulateTouch(element, 'move', [
        { identifier: 0, clientX: centerX - currentDistance/2, clientY: centerY },
        { identifier: 1, clientX: centerX + currentDistance/2, clientY: centerY }
      ])
    }

    // End touch
    this.simulateTouch(element, 'end', [
      { identifier: 0, clientX: centerX - finalDistance/2, clientY: centerY },
      { identifier: 1, clientX: centerX + finalDistance/2, clientY: centerY }
    ])
  }

  /**
   * Simulate swipe gesture
   */
  simulateSwipeGesture(
    element: HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      const steps = 10
      const stepDuration = duration / steps
      const deltaX = (endX - startX) / steps
      const deltaY = (endY - startY) / steps

      // Start touch
      this.simulateTouch(element, 'start', [
        { identifier: 0, clientX: startX, clientY: startY }
      ])

      let currentStep = 0
      const moveInterval = setInterval(() => {
        currentStep++
        const currentX = startX + deltaX * currentStep
        const currentY = startY + deltaY * currentStep

        this.simulateTouch(element, 'move', [
          { identifier: 0, clientX: currentX, clientY: currentY }
        ])

        if (currentStep >= steps) {
          clearInterval(moveInterval)
          
          // End touch
          this.simulateTouch(element, 'end', [
            { identifier: 0, clientX: endX, clientY: endY }
          ])
          
          resolve()
        }
      }, stepDuration)
    })
  }

  /**
   * Simulate long press gesture
   */
  simulateLongPress(
    element: HTMLElement,
    x: number,
    y: number,
    duration: number = 800
  ): Promise<void> {
    return new Promise((resolve) => {
      // Start touch
      this.simulateTouch(element, 'start', [
        { identifier: 0, clientX: x, clientY: y }
      ])

      // Hold for specified duration
      setTimeout(() => {
        // End touch
        this.simulateTouch(element, 'end', [
          { identifier: 0, clientX: x, clientY: y }
        ])
        
        resolve()
      }, duration)
    })
  }

  /**
   * Measure touch response time
   */
  async measureTouchResponseTime(
    element: HTMLElement,
    touchAction: () => Promise<void> | void
  ): Promise<number> {
    const startTime = performance.now()
    await touchAction()
    const endTime = performance.now()
    
    const responseTime = endTime - startTime
    
    // Record performance data
    this.performanceRecords.push({
      element: element.tagName.toLowerCase() + (element.className ? `.${element.className.split(' ')[0]}` : ''),
      action: 'touch-response',
      timestamp: Date.now(),
      responseTime
    })
    
    return responseTime
  }

  /**
   * Test touch target accessibility
   */
  testTouchAccessibility(element: HTMLElement): AccessibilityTestResult {
    const computedStyle = window.getComputedStyle(element)
    
    // Check for accessible label
    const hasLabel = !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title')
    )
    
    // Check for focus indicator
    const hasFocusIndicator = computedStyle.outline !== 'none' || 
                              element.hasAttribute('data-custom-focus')
    
    // Calculate contrast ratio (simplified)
    const contrastRatio = this.calculateContrastRatio(
      computedStyle.backgroundColor,
      computedStyle.color
    )
    
    // Check keyboard accessibility
    const keyboardAccessible = element.hasAttribute('tabindex') || 
                               ['button', 'input', 'select', 'textarea', 'a'].includes(element.tagName.toLowerCase())
    
    // Check screen reader compatibility
    const screenReaderCompatible = hasLabel && 
                                   (element.hasAttribute('role') || this.hasImplicitRole(element))
    
    // Overall WCAG compliance
    const wcagCompliant = hasLabel && 
                         hasFocusIndicator && 
                         contrastRatio >= 4.5 && 
                         keyboardAccessible && 
                         screenReaderCompatible
    
    return {
      hasLabel,
      hasFocusIndicator,
      contrastRatio,
      keyboardAccessible,
      screenReaderCompatible,
      wcagCompliant
    }
  }

  /**
   * Calculate color contrast ratio
   */
  calculateContrastRatio(backgroundColor: string, textColor: string): number {
    // Simplified contrast calculation
    // In production, would use a full color library
    const getLuminance = (color: string): number => {
      if (!color || color === 'transparent') return 0.5
      
      // Extract RGB values (simplified)
      if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g)
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]) / 255
          const g = parseInt(matches[1]) / 255  
          const b = parseInt(matches[2]) / 255
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
      }
      
      // Fallback for named colors and hex
      const colorMap: { [key: string]: number } = {
        'white': 1.0,
        '#ffffff': 1.0,
        '#fff': 1.0,
        'black': 0.0,
        '#000000': 0.0,
        '#000': 0.0,
        'red': 0.299,
        'green': 0.587,
        'blue': 0.114
      }
      
      return colorMap[color.toLowerCase()] || 0.5
    }
    
    const lum1 = getLuminance(backgroundColor)
    const lum2 = getLuminance(textColor)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }

  /**
   * Check if element has implicit ARIA role
   */
  private hasImplicitRole(element: HTMLElement): boolean {
    const implicitRoles = {
      'button': 'button',
      'input': 'textbox',
      'select': 'combobox',
      'textarea': 'textbox',
      'a': 'link',
      'img': 'img',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading'
    }
    
    return element.tagName.toLowerCase() in implicitRoles
  }

  /**
   * Test gesture recognition accuracy
   */
  testGestureRecognition(
    element: HTMLElement,
    gestureType: 'swipe' | 'pinch' | 'tap' | 'long-press',
    expectedOutcome: string
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      let gestureRecognized = false
      let actualOutcome = ''
      
      // Set up outcome detection
      const outcomeDetector = () => {
        actualOutcome = element.getAttribute('data-gesture-result') || 'none'
        gestureRecognized = actualOutcome === expectedOutcome
      }
      
      element.addEventListener('gestureend', outcomeDetector)
      element.addEventListener('touchend', outcomeDetector)
      
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      try {
        switch (gestureType) {
          case 'tap':
            this.simulateTouch(element, 'start', [
              { identifier: 0, clientX: centerX, clientY: centerY }
            ])
            setTimeout(() => {
              this.simulateTouch(element, 'end', [
                { identifier: 0, clientX: centerX, clientY: centerY }
              ])
            }, 100)
            break
            
          case 'long-press':
            await this.simulateLongPress(element, centerX, centerY, 800)
            break
            
          case 'swipe':
            await this.simulateSwipeGesture(element, centerX - 50, centerY, centerX + 50, centerY)
            break
            
          case 'pinch':
            this.simulatePinchGesture(element, centerX, centerY, 50, 100)
            break
        }
        
        // Wait for gesture processing
        setTimeout(() => {
          outcomeDetector()
          element.removeEventListener('gestureend', outcomeDetector)
          element.removeEventListener('touchend', outcomeDetector)
          resolve(gestureRecognized)
        }, 500)
        
      } catch (error) {
        element.removeEventListener('gestureend', outcomeDetector)
        element.removeEventListener('touchend', outcomeDetector)
        resolve(false)
      }
    })
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): TouchPerformanceMetrics {
    if (this.performanceRecords.length === 0) {
      return {
        responseTime: 0,
        accuracy: 0,
        successRate: 0,
        errorRate: 0
      }
    }
    
    const responseTimes = this.performanceRecords.map(record => record.responseTime)
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    
    // Calculate success rate (response times under 150ms considered successful)
    const successfulResponses = responseTimes.filter(time => time <= 150).length
    const successRate = successfulResponses / responseTimes.length
    
    return {
      responseTime: averageResponseTime,
      accuracy: successRate, // Same as success rate for this metric
      successRate,
      errorRate: 1 - successRate
    }
  }

  /**
   * Test wedding-specific scenarios
   */
  testWeddingScenario(
    scenarioType: 'emergency-access' | 'gloved-operation' | 'one-handed-use' | 'sunlight-visibility',
    elements: HTMLElement[]
  ): Promise<{ passed: boolean; issues: string[] }> {
    return new Promise(async (resolve) => {
      const issues: string[] = []
      let passed = true
      
      switch (scenarioType) {
        case 'emergency-access':
          // Test emergency button accessibility under stress
          for (const element of elements) {
            const dimensions = this.measureTouchTargetSync(element)
            if (!dimensions.isGloveFriendly) {
              issues.push(`Emergency element too small: ${dimensions.width}x${dimensions.height}px`)
              passed = false
            }
            
            const responseTime = await this.measureTouchResponseTime(element, () => {
              this.simulateTouch(element, 'start', [{ identifier: 0, clientX: 30, clientY: 30 }])
              this.simulateTouch(element, 'end', [{ identifier: 0, clientX: 30, clientY: 30 }])
            })
            
            if (responseTime > 50) {
              issues.push(`Emergency response too slow: ${responseTime.toFixed(1)}ms`)
              passed = false
            }
          }
          break
          
        case 'gloved-operation':
          // Test operation with reduced touch sensitivity
          for (const element of elements) {
            const dimensions = this.measureTouchTargetSync(element)
            if (dimensions.effectiveWidth < 60 || dimensions.effectiveHeight < 60) {
              issues.push(`Element not glove-friendly: ${dimensions.effectiveWidth}x${dimensions.effectiveHeight}px`)
              passed = false
            }
          }
          break
          
        case 'one-handed-use':
          // Test thumb reach and single-hand operation
          for (const element of elements) {
            const rect = element.getBoundingClientRect()
            const isInThumbReach = rect.bottom <= window.innerHeight * 0.75 // Bottom 75% of screen
            
            if (!isInThumbReach) {
              issues.push(`Element outside thumb reach zone`)
              passed = false
            }
          }
          break
          
        case 'sunlight-visibility':
          // Test high contrast and visibility
          for (const element of elements) {
            const accessibility = this.testTouchAccessibility(element)
            
            if (accessibility.contrastRatio < 7.0) { // Higher standard for sunlight
              issues.push(`Insufficient contrast for sunlight: ${accessibility.contrastRatio.toFixed(1)}:1`)
              passed = false
            }
          }
          break
      }
      
      resolve({ passed, issues })
    })
  }

  /**
   * Clear performance records
   */
  clearPerformanceRecords(): void {
    this.performanceRecords = []
  }

  /**
   * Get performance records for analysis
   */
  getPerformanceRecords(): Array<{
    element: string
    action: string
    timestamp: number
    responseTime: number
  }> {
    return [...this.performanceRecords]
  }
}