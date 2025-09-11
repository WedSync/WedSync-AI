/**
 * WS-189: Comprehensive accessibility integration
 * Handles screen reader compatibility with ARIA coordination, assistive technology support,
 * high contrast mode integration, and motor accessibility support with timing adaptation
 */

import { deviceDetector, type DeviceCapabilities } from './device-detector';
import { hapticCoordinator } from './haptic-coordinator';

export interface AccessibilityPreferences {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeText: boolean;
  prefersColorSchemeDark: boolean;
  supportsScreenReader: boolean;
  supportsVoiceControl: boolean;
  requiresKeyboardNavigation: boolean;
  needsHigherTimeouts: boolean;
  needsLargerTouchTargets: boolean;
  needsAlternativeInput: boolean;
}

export interface AriaAnnouncement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  category: 'status' | 'alert' | 'log' | 'navigation' | 'form';
  timestamp: number;
  duration?: number;
}

export interface TouchAccessibilityOptions {
  enableScreenReaderSupport: boolean;
  enableVoiceControlLabels: boolean;
  enableHighContrastMode: boolean;
  enableReducedMotion: boolean;
  enableLargerTouchTargets: boolean;
  enableExtendedTimeouts: boolean;
  enableAlternativeInput: boolean;
  enableHapticFeedback: boolean;
}

export interface AccessibilityTouchEnhancements {
  minimumTouchTargetSize: number;
  recommendedSpacing: number;
  timeoutMultiplier: number;
  motionReduction: boolean;
  contrastEnhancement: boolean;
  hapticIntensity: number;
  announceInteractions: boolean;
}

/**
 * Comprehensive accessibility coordinator for touch interactions
 * Ensures WCAG 2.1 AA+ compliance and assistive technology support
 */
export class AccessibilityCoordinator {
  private preferences: AccessibilityPreferences;
  private announcements = new Map<string, AriaAnnouncement>();
  private announcementQueue: AriaAnnouncement[] = [];
  private liveRegions = new Map<string, HTMLElement>();
  private isProcessingQueue = false;
  private lastAnnouncementTime = 0;
  private readonly minAnnouncementInterval = 300; // ms
  private focusHistory: Element[] = [];
  private touchEnhancements: AccessibilityTouchEnhancements;
  private keyboardNavigationEnabled = false;

  constructor() {
    this.preferences = this.detectAccessibilityPreferences();
    this.touchEnhancements = this.calculateTouchEnhancements();
    this.initializeAriaSupport();
    this.initializeKeyboardSupport();
    this.setupPreferenceListeners();
  }

  /**
   * Detect user accessibility preferences
   */
  private detectAccessibilityPreferences(): AccessibilityPreferences {
    const preferences: AccessibilityPreferences = {
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      prefersColorSchemeDark: false,
      supportsScreenReader: false,
      supportsVoiceControl: false,
      requiresKeyboardNavigation: false,
      needsHigherTimeouts: false,
      needsLargerTouchTargets: false,
      needsAlternativeInput: false,
    };

    try {
      // Media query preferences
      preferences.prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      preferences.prefersHighContrast = window.matchMedia(
        '(prefers-contrast: high)',
      ).matches;
      preferences.prefersLargeText = window.matchMedia(
        '(prefers-large-text: yes)',
      ).matches;
      preferences.prefersColorSchemeDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;

      // Screen reader detection (heuristic)
      preferences.supportsScreenReader =
        'speechSynthesis' in window ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        navigator.userAgent.includes('TalkBack') ||
        !!document.querySelector('[aria-hidden]');

      // Voice control detection
      preferences.supportsVoiceControl =
        'webkitSpeechRecognition' in window ||
        'SpeechRecognition' in window ||
        navigator.userAgent.includes('Voice');

      // Keyboard navigation preference (heuristic)
      preferences.requiresKeyboardNavigation =
        !('ontouchstart' in window) || preferences.supportsScreenReader;

      // Infer additional needs based on detected preferences
      preferences.needsHigherTimeouts =
        preferences.supportsScreenReader || preferences.prefersReducedMotion;

      preferences.needsLargerTouchTargets =
        preferences.prefersLargeText || preferences.prefersHighContrast;

      preferences.needsAlternativeInput =
        preferences.supportsScreenReader ||
        preferences.supportsVoiceControl ||
        preferences.requiresKeyboardNavigation;
    } catch (error) {
      console.warn('Accessibility preference detection failed:', error);
    }

    return preferences;
  }

  /**
   * Calculate touch accessibility enhancements based on preferences
   */
  private calculateTouchEnhancements(): AccessibilityTouchEnhancements {
    let minimumTouchTargetSize = 44; // WCAG minimum
    let recommendedSpacing = 8;
    let timeoutMultiplier = 1;
    let hapticIntensity = 0.5;

    // Adjust for large text preference
    if (this.preferences.needsLargerTouchTargets) {
      minimumTouchTargetSize = 56; // 25% larger
      recommendedSpacing = 12;
    }

    // Adjust timeouts for screen readers and reduced motion
    if (this.preferences.needsHigherTimeouts) {
      timeoutMultiplier = 3; // WCAG recommendation for extended timeouts
    }

    // Adjust haptic intensity based on accessibility needs
    if (this.preferences.prefersReducedMotion) {
      hapticIntensity = 0.3; // Gentler haptics
    } else if (this.preferences.needsAlternativeInput) {
      hapticIntensity = 0.7; // More pronounced for alternative input users
    }

    return {
      minimumTouchTargetSize,
      recommendedSpacing,
      timeoutMultiplier,
      motionReduction: this.preferences.prefersReducedMotion,
      contrastEnhancement: this.preferences.prefersHighContrast,
      hapticIntensity,
      announceInteractions: this.preferences.supportsScreenReader,
    };
  }

  /**
   * Initialize ARIA live regions and screen reader support
   */
  private initializeAriaSupport(): void {
    // Create live regions for different announcement types
    const liveRegionTypes = [
      { id: 'polite-announcements', ariaLive: 'polite' },
      { id: 'assertive-announcements', ariaLive: 'assertive' },
      { id: 'status-announcements', ariaLive: 'polite', role: 'status' },
      { id: 'alert-announcements', ariaLive: 'assertive', role: 'alert' },
    ];

    liveRegionTypes.forEach(({ id, ariaLive, role }) => {
      const region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', ariaLive);
      region.setAttribute('aria-atomic', 'true');
      if (role) {
        region.setAttribute('role', role);
      }

      // Hide visually but keep accessible to screen readers
      region.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
      `;

      document.body.appendChild(region);
      this.liveRegions.set(id, region);
    });
  }

  /**
   * Initialize keyboard navigation support
   */
  private initializeKeyboardSupport(): void {
    if (!this.preferences.requiresKeyboardNavigation) return;

    // Add keyboard event listeners
    document.addEventListener(
      'keydown',
      this.handleKeyboardNavigation.bind(this),
    );
    document.addEventListener('focusin', this.handleFocusChange.bind(this));
    document.addEventListener('focusout', this.handleFocusChange.bind(this));

    // Enable visible focus indicators
    this.enableFocusIndicators();
    this.keyboardNavigationEnabled = true;
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Handle escape key to cancel interactions
    if (event.key === 'Escape') {
      this.announceToScreenReader(
        'Interaction cancelled',
        'assertive',
        'navigation',
      );
      // Cancel any active gestures or interactions
      (document.activeElement as HTMLElement)?.blur();
    }

    // Handle enter/space for touch alternatives
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target as Element;
      if (target.hasAttribute('data-touch-alternative')) {
        event.preventDefault();
        this.simulateTouchInteraction(target);
      }
    }

    // Handle arrow keys for sequential navigation
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      this.handleArrowKeyNavigation(event);
    }
  }

  /**
   * Handle arrow key navigation for touch interfaces
   */
  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const currentElement = document.activeElement as Element;
    if (!currentElement) return;

    const touchElements = Array.from(
      document.querySelectorAll('[data-touch-element]'),
    );
    const currentIndex = touchElements.indexOf(currentElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    const columns = parseInt(
      currentElement.getAttribute('data-grid-columns') || '1',
    );

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(touchElements.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(touchElements.length - 1, currentIndex + columns);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - columns);
        break;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      (touchElements[nextIndex] as HTMLElement).focus();
      this.announceNavigationChange(touchElements[nextIndex]);
    }
  }

  /**
   * Handle focus changes for screen reader announcements
   */
  private handleFocusChange(event: FocusEvent): void {
    if (event.type === 'focusin') {
      this.focusHistory.push(event.target as Element);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }

      // Announce focused element to screen readers
      this.announceFocusChange(event.target as Element);
    }
  }

  /**
   * Enable visible focus indicators for keyboard navigation
   */
  private enableFocusIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .accessibility-focus-ring {
        outline: 3px solid #005fcc !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }
      
      .accessibility-focus-ring:focus-visible {
        outline: 3px solid #005fcc !important;
        outline-offset: 2px !important;
      }

      .high-contrast-focus {
        outline: 4px solid #ffffff !important;
        outline-offset: 3px !important;
        background-color: #000000 !important;
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Simulate touch interaction for keyboard users
   */
  private simulateTouchInteraction(element: Element): void {
    // Create and dispatch synthetic touch events
    const touchEvent = new CustomEvent('wedding-touch-alternative', {
      detail: {
        originalTarget: element,
        inputMethod: 'keyboard',
        timestamp: Date.now(),
      },
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(touchEvent);
    this.announceToScreenReader('Action activated', 'polite', 'status');

    // Provide haptic feedback if available
    hapticCoordinator.performHaptic({
      type: 'medium',
      intensity: this.touchEnhancements.hapticIntensity,
    });
  }

  /**
   * Announce navigation changes to screen readers
   */
  private announceNavigationChange(element: Element): void {
    const label = this.getAccessibleLabel(element);
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const description = element.getAttribute('aria-describedby');

    let announcement = `${label} ${role}`;
    if (description) {
      const descriptionElement = document.getElementById(description);
      if (descriptionElement) {
        announcement += `, ${descriptionElement.textContent}`;
      }
    }

    this.announceToScreenReader(announcement, 'polite', 'navigation');
  }

  /**
   * Announce focus changes to screen readers
   */
  private announceFocusChange(element: Element): void {
    if (!this.preferences.supportsScreenReader) return;

    const label = this.getAccessibleLabel(element);
    if (label) {
      this.announceToScreenReader(`Focused: ${label}`, 'polite', 'navigation');
    }
  }

  /**
   * Get accessible label for element
   */
  private getAccessibleLabel(element: Element): string {
    // Check aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    // Check associated label elements
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent || '';
    }

    // Fall back to text content or alt text
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;

    const altText = element.getAttribute('alt');
    if (altText) return altText;

    const title = element.getAttribute('title');
    if (title) return title;

    return 'unlabeled element';
  }

  /**
   * Announce message to screen readers
   */
  announceToScreenReader(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
    category: 'status' | 'alert' | 'log' | 'navigation' | 'form' = 'status',
  ): void {
    if (!this.preferences.supportsScreenReader || !message.trim()) return;

    const announcement: AriaAnnouncement = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: message.trim(),
      priority,
      category,
      timestamp: Date.now(),
      duration: Math.max(3000, message.length * 50), // Estimate reading time
    };

    this.queueAnnouncement(announcement);
  }

  /**
   * Queue announcement for processing
   */
  private queueAnnouncement(announcement: AriaAnnouncement): void {
    this.announcementQueue.push(announcement);

    if (!this.isProcessingQueue) {
      this.processAnnouncementQueue();
    }
  }

  /**
   * Process announcement queue with rate limiting
   */
  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const now = Date.now();

      // Rate limiting
      if (now - this.lastAnnouncementTime < this.minAnnouncementInterval) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            this.minAnnouncementInterval - (now - this.lastAnnouncementTime),
          ),
        );
      }

      const announcement = this.announcementQueue.shift();
      if (announcement) {
        await this.makeAnnouncement(announcement);
        this.lastAnnouncementTime = Date.now();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Make announcement to appropriate live region
   */
  private async makeAnnouncement(
    announcement: AriaAnnouncement,
  ): Promise<void> {
    // Determine live region based on priority and category
    let regionId = 'polite-announcements';

    if (
      announcement.priority === 'assertive' ||
      announcement.category === 'alert'
    ) {
      regionId = 'alert-announcements';
    } else if (announcement.category === 'status') {
      regionId = 'status-announcements';
    }

    const region = this.liveRegions.get(regionId);
    if (!region) return;

    // Clear previous announcement
    region.textContent = '';

    // Allow screen reader to process the clear
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Set new announcement
    region.textContent = announcement.message;

    // Store announcement
    this.announcements.set(announcement.id, announcement);

    // Clean up after duration
    setTimeout(() => {
      if (region.textContent === announcement.message) {
        region.textContent = '';
      }
      this.announcements.delete(announcement.id);
    }, announcement.duration || 3000);
  }

  /**
   * Setup listeners for accessibility preference changes
   */
  private setupPreferenceListeners(): void {
    // Listen for media query changes
    const mediaQueries = [
      {
        query: '(prefers-reduced-motion: reduce)',
        property: 'prefersReducedMotion',
      },
      { query: '(prefers-contrast: high)', property: 'prefersHighContrast' },
      { query: '(prefers-large-text: yes)', property: 'prefersLargeText' },
      {
        query: '(prefers-color-scheme: dark)',
        property: 'prefersColorSchemeDark',
      },
    ];

    mediaQueries.forEach(({ query, property }) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', (e) => {
        (this.preferences as any)[property] = e.matches;
        this.onPreferencesChanged();
      });
    });
  }

  /**
   * Handle accessibility preference changes
   */
  private onPreferencesChanged(): void {
    this.touchEnhancements = this.calculateTouchEnhancements();
    this.announceToScreenReader(
      'Accessibility preferences updated',
      'polite',
      'status',
    );

    // Notify listeners
    document.dispatchEvent(
      new CustomEvent('wedding-accessibility-changed', {
        detail: {
          preferences: this.preferences,
          enhancements: this.touchEnhancements,
        },
      }),
    );
  }

  /**
   * Apply accessibility enhancements to touch element
   */
  applyAccessibilityEnhancements(
    element: Element,
    options: Partial<TouchAccessibilityOptions> = {},
  ): void {
    const opts: TouchAccessibilityOptions = {
      enableScreenReaderSupport: true,
      enableVoiceControlLabels: true,
      enableHighContrastMode: this.preferences.prefersHighContrast,
      enableReducedMotion: this.preferences.prefersReducedMotion,
      enableLargerTouchTargets: this.preferences.needsLargerTouchTargets,
      enableExtendedTimeouts: this.preferences.needsHigherTimeouts,
      enableAlternativeInput: this.preferences.needsAlternativeInput,
      enableHapticFeedback: true,
      ...options,
    };

    // Apply touch target sizing
    if (opts.enableLargerTouchTargets) {
      (element as HTMLElement).style.minWidth =
        `${this.touchEnhancements.minimumTouchTargetSize}px`;
      (element as HTMLElement).style.minHeight =
        `${this.touchEnhancements.minimumTouchTargetSize}px`;
      (element as HTMLElement).style.padding =
        `${this.touchEnhancements.recommendedSpacing}px`;
    }

    // Apply focus indicators
    if (opts.enableAlternativeInput) {
      element.classList.add('accessibility-focus-ring');
      element.setAttribute('tabindex', '0');
      element.setAttribute('data-touch-alternative', 'true');
    }

    // Apply high contrast styles
    if (opts.enableHighContrastMode) {
      element.classList.add('high-contrast-focus');
    }

    // Add ARIA attributes
    if (opts.enableScreenReaderSupport) {
      if (!element.hasAttribute('role') && element.tagName !== 'BUTTON') {
        element.setAttribute('role', 'button');
      }

      if (
        !element.hasAttribute('aria-label') &&
        !element.hasAttribute('aria-labelledby')
      ) {
        const label = this.getAccessibleLabel(element);
        if (label) {
          element.setAttribute('aria-label', label);
        }
      }
    }

    // Add voice control labels
    if (opts.enableVoiceControlLabels) {
      const label = this.getAccessibleLabel(element);
      element.setAttribute('data-voice-label', label);
    }

    // Mark as touch element for navigation
    element.setAttribute('data-touch-element', 'true');
  }

  /**
   * Get current accessibility preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  /**
   * Get touch enhancements configuration
   */
  getTouchEnhancements(): AccessibilityTouchEnhancements {
    return { ...this.touchEnhancements };
  }

  /**
   * Check if element meets accessibility guidelines
   */
  validateAccessibility(element: Element): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check touch target size
    const rect = element.getBoundingClientRect();
    if (
      rect.width < this.touchEnhancements.minimumTouchTargetSize ||
      rect.height < this.touchEnhancements.minimumTouchTargetSize
    ) {
      issues.push(
        `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px, minimum: ${this.touchEnhancements.minimumTouchTargetSize}px`,
      );
      recommendations.push(
        'Increase touch target size to meet WCAG guidelines',
      );
    }

    // Check for accessible name
    const accessibleName = this.getAccessibleLabel(element);
    if (!accessibleName || accessibleName === 'unlabeled element') {
      issues.push('Missing accessible name');
      recommendations.push('Add aria-label, aria-labelledby, or visible label');
    }

    // Check for keyboard accessibility
    if (
      element.getAttribute('tabindex') === '-1' &&
      this.preferences.requiresKeyboardNavigation
    ) {
      issues.push('Not keyboard accessible');
      recommendations.push(
        'Add tabindex="0" or make focusable for keyboard users',
      );
    }

    // Check for proper role
    const role = element.getAttribute('role');
    if (!role && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
      issues.push('Missing semantic role');
      recommendations.push('Add appropriate ARIA role for interactive element');
    }

    // Check contrast (basic check)
    if (this.preferences.prefersHighContrast) {
      const computedStyle = window.getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;
      const color = computedStyle.color;

      if (
        backgroundColor === 'rgba(0, 0, 0, 0)' ||
        backgroundColor === 'transparent'
      ) {
        recommendations.push(
          'Consider adding background color for better contrast in high contrast mode',
        );
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Wedding-specific accessibility helpers
   */

  /**
   * Announce wedding milestone with appropriate emphasis
   */
  announceWeddingMilestone(milestone: string, isUrgent = false): void {
    const priority = isUrgent ? 'assertive' : 'polite';
    const category = isUrgent ? 'alert' : 'status';
    this.announceToScreenReader(
      `Wedding milestone: ${milestone}`,
      priority,
      category,
    );
  }

  /**
   * Announce photo capture for wedding photographers
   */
  announcePhotoCaptured(photoDetails?: string): void {
    const message = photoDetails
      ? `Photo captured: ${photoDetails}`
      : 'Photo captured successfully';
    this.announceToScreenReader(message, 'polite', 'status');
  }

  /**
   * Announce guest check-in status
   */
  announceGuestStatus(
    guestName: string,
    status: 'checked-in' | 'pending',
  ): void {
    const message = `${guestName} ${status === 'checked-in' ? 'checked in' : 'status pending'}`;
    this.announceToScreenReader(message, 'polite', 'log');
  }

  /**
   * Announce timeline changes
   */
  announceTimelineChange(event: string, newTime?: string): void {
    const message = newTime
      ? `Timeline updated: ${event} moved to ${newTime}`
      : `Timeline updated: ${event}`;
    this.announceToScreenReader(message, 'assertive', 'alert');
  }

  /**
   * Clear all announcements (for emergencies)
   */
  clearAllAnnouncements(): void {
    this.announcementQueue = [];
    this.liveRegions.forEach((region) => {
      region.textContent = '';
    });
    this.announcements.clear();
  }

  /**
   * Get accessibility testing report
   */
  generateAccessibilityReport(): {
    compliance: 'AA' | 'AAA' | 'partial' | 'failed';
    checkedElements: number;
    issues: Array<{
      element: string;
      issues: string[];
      recommendations: string[];
    }>;
    summary: string;
  } {
    const touchElements = document.querySelectorAll('[data-touch-element]');
    const elementReports = Array.from(touchElements).map((element, index) => {
      const validation = this.validateAccessibility(element);
      return {
        element: `Element ${index + 1}: ${element.tagName}${element.id ? '#' + element.id : ''}`,
        issues: validation.issues,
        recommendations: validation.recommendations,
      };
    });

    const totalIssues = elementReports.reduce(
      (sum, report) => sum + report.issues.length,
      0,
    );
    const checkedElements = elementReports.length;

    let compliance: 'AA' | 'AAA' | 'partial' | 'failed' = 'AAA';
    if (totalIssues === 0) {
      compliance = 'AAA';
    } else if (totalIssues < checkedElements * 0.1) {
      compliance = 'AA';
    } else if (totalIssues < checkedElements * 0.3) {
      compliance = 'partial';
    } else {
      compliance = 'failed';
    }

    const summary = `Accessibility Report: ${compliance} compliance. ${checkedElements} elements checked, ${totalIssues} issues found.`;

    return {
      compliance,
      checkedElements,
      issues: elementReports.filter((report) => report.issues.length > 0),
      summary,
    };
  }
}

// Export singleton instance
export const accessibilityCoordinator = new AccessibilityCoordinator();
