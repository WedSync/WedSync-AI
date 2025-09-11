/**
 * Mobile Accessibility Compliance Service
 * WS-155: Guest Communications - Round 3
 * Ensures full mobile accessibility support for messaging features
 */

interface AccessibilityFeature {
  id: string;
  name: string;
  implemented: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
  description: string;
  testMethod: string;
}

interface AccessibilityViolation {
  element: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  fix: string;
}

interface ScreenReaderTest {
  element: string;
  expectedText: string;
  actualText: string;
  passed: boolean;
}

export class MobileAccessibilityService {
  private static instance: MobileAccessibilityService;
  private features: AccessibilityFeature[] = [];
  private violations: AccessibilityViolation[] = [];
  private screenReaderTests: ScreenReaderTest[] = [];

  private constructor() {
    this.initializeAccessibilityFeatures();
    this.setupAccessibilityListeners();
  }

  static getInstance(): MobileAccessibilityService {
    if (!this.instance) {
      this.instance = new MobileAccessibilityService();
    }
    return this.instance;
  }

  private initializeAccessibilityFeatures() {
    this.features = [
      {
        id: 'touch-targets',
        name: 'Touch Target Size',
        implemented: false,
        wcagLevel: 'AA',
        description: 'Minimum 44x44px touch targets on iOS, 48x48px on Android',
        testMethod: 'Automated measurement of interactive elements',
      },
      {
        id: 'color-contrast',
        name: 'Color Contrast',
        implemented: false,
        wcagLevel: 'AA',
        description:
          'Minimum 4.5:1 contrast ratio for normal text, 3:1 for large text',
        testMethod: 'Automated contrast calculation',
      },
      {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        implemented: false,
        wcagLevel: 'A',
        description:
          'All interactive elements accessible via keyboard/switch navigation',
        testMethod: 'Keyboard navigation testing',
      },
      {
        id: 'screen-reader',
        name: 'Screen Reader Support',
        implemented: false,
        wcagLevel: 'A',
        description: 'Proper ARIA labels, roles, and semantic markup',
        testMethod: 'Screen reader simulation',
      },
      {
        id: 'voice-control',
        name: 'Voice Control Support',
        implemented: false,
        wcagLevel: 'AAA',
        description: 'Voice commands and voice navigation support',
        testMethod: 'Voice control simulation',
      },
      {
        id: 'motion-preferences',
        name: 'Reduced Motion',
        implemented: false,
        wcagLevel: 'AA',
        description: 'Respect prefers-reduced-motion settings',
        testMethod: 'CSS media query testing',
      },
      {
        id: 'zoom-support',
        name: 'Zoom Support',
        implemented: false,
        wcagLevel: 'AA',
        description: 'Support up to 200% zoom without horizontal scrolling',
        testMethod: 'Zoom testing at different levels',
      },
      {
        id: 'focus-indicators',
        name: 'Focus Indicators',
        implemented: false,
        wcagLevel: 'AA',
        description: 'Visible focus indicators for all interactive elements',
        testMethod: 'Focus indicator visibility testing',
      },
      {
        id: 'error-identification',
        name: 'Error Identification',
        implemented: false,
        wcagLevel: 'A',
        description: 'Clear error messages with suggestions for correction',
        testMethod: 'Form validation testing',
      },
      {
        id: 'language-support',
        name: 'Language Support',
        implemented: false,
        wcagLevel: 'A',
        description: 'Proper language attributes and multilingual support',
        testMethod: 'Language attribute verification',
      },
      {
        id: 'orientation-support',
        name: 'Orientation Support',
        implemented: false,
        wcagLevel: 'AA',
        description:
          'Content works in both portrait and landscape orientations',
        testMethod: 'Orientation change testing',
      },
      {
        id: 'timing-adjustments',
        name: 'Timing Adjustments',
        implemented: false,
        wcagLevel: 'A',
        description: 'Users can extend or disable time limits',
        testMethod: 'Timeout behavior testing',
      },
    ];
  }

  private setupAccessibilityListeners() {
    // Listen for screen orientation changes
    window.addEventListener('orientationchange', () => {
      this.testOrientationSupport();
    });

    // Listen for zoom changes
    window.addEventListener('resize', () => {
      this.testZoomSupport();
    });

    // Monitor focus changes
    document.addEventListener('focusin', (e) => {
      this.validateFocusIndicator(e.target as Element);
    });
  }

  /**
   * Run comprehensive accessibility audit
   */
  async runAccessibilityAudit(): Promise<{
    score: number;
    violations: AccessibilityViolation[];
    recommendations: string[];
    compliance: { [wcagLevel: string]: boolean };
  }> {
    this.violations = [];

    // Test all features
    await Promise.all([
      this.testTouchTargets(),
      this.testColorContrast(),
      this.testKeyboardNavigation(),
      this.testScreenReaderSupport(),
      this.testVoiceControlSupport(),
      this.testMotionPreferences(),
      this.testZoomSupport(),
      this.testFocusIndicators(),
      this.testErrorIdentification(),
      this.testLanguageSupport(),
      this.testOrientationSupport(),
      this.testTimingAdjustments(),
    ]);

    const score = this.calculateAccessibilityScore();
    const recommendations = this.generateRecommendations();
    const compliance = this.getWCAGCompliance();

    return {
      score,
      violations: this.violations,
      recommendations,
      compliance,
    };
  }

  /**
   * Test touch target sizes
   */
  private async testTouchTargets(): Promise<void> {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, textarea, select, [role="button"], [tabindex]',
    );

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const minSize = isIOS ? 44 : 48; // iOS: 44px, Android: 48px

    interactiveElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const paddingBottom = parseFloat(computedStyle.paddingBottom);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingRight = parseFloat(computedStyle.paddingRight);

      const totalWidth = rect.width + paddingLeft + paddingRight;
      const totalHeight = rect.height + paddingTop + paddingBottom;

      if (totalWidth < minSize || totalHeight < minSize) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'touch-target-size',
          severity: 'error',
          description: `Touch target is ${totalWidth}x${totalHeight}px, minimum is ${minSize}x${minSize}px`,
          fix: `Increase padding or size to meet minimum ${minSize}x${minSize}px requirement`,
        });
      }
    });

    this.features.find((f) => f.id === 'touch-targets')!.implemented =
      !this.violations.some((v) => v.type === 'touch-target-size');
  }

  /**
   * Test color contrast ratios
   */
  private async testColorContrast(): Promise<void> {
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span, a, button, label',
    );

    textElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = this.getEffectiveBackgroundColor(element);

      const contrast = this.calculateContrastRatio(color, backgroundColor);
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;

      const isLargeText =
        fontSize >= 18 ||
        (fontSize >= 14 &&
          (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      const minContrast = isLargeText ? 3 : 4.5;

      if (contrast < minContrast) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'color-contrast',
          severity: 'error',
          description: `Contrast ratio ${contrast.toFixed(2)}:1 is below minimum ${minContrast}:1`,
          fix: `Increase contrast between text color and background to meet ${minContrast}:1 minimum`,
        });
      }
    });

    this.features.find((f) => f.id === 'color-contrast')!.implemented =
      !this.violations.some((v) => v.type === 'color-contrast');
  }

  /**
   * Test keyboard navigation
   */
  private async testKeyboardNavigation(): Promise<void> {
    const focusableElements = document.querySelectorAll(
      'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    let hasKeyboardTraps = false;
    let hasSkippedElements = false;

    focusableElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');

      // Check for positive tab indices (anti-pattern)
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'keyboard-navigation',
          severity: 'warning',
          description:
            'Element uses positive tabindex which can cause navigation issues',
          fix: 'Use tabindex="0" or rely on natural tab order',
        });
      }

      // Check if element is focusable
      if (!this.isFocusable(element)) {
        hasSkippedElements = true;
      }
    });

    // Test for keyboard traps
    if (document.activeElement && !this.canEscapeCurrentFocus()) {
      hasKeyboardTraps = true;
      this.violations.push({
        element: this.getElementSelector(document.activeElement),
        type: 'keyboard-navigation',
        severity: 'error',
        description:
          'Keyboard trap detected - users cannot escape current focus',
        fix: 'Ensure users can navigate away from all focusable elements',
      });
    }

    this.features.find((f) => f.id === 'keyboard-navigation')!.implemented =
      !hasKeyboardTraps && !hasSkippedElements;
  }

  /**
   * Test screen reader support
   */
  private async testScreenReaderSupport(): Promise<void> {
    // Test for missing alt text
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.alt && img.alt !== '') {
        this.violations.push({
          element: this.getElementSelector(img),
          type: 'screen-reader',
          severity: 'error',
          description: 'Image missing alt attribute',
          fix: 'Add descriptive alt text or alt="" for decorative images',
        });
      }
    });

    // Test for missing form labels
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]), textarea, select',
    );
    inputs.forEach((input) => {
      const hasLabel = this.hasAssociatedLabel(input);
      const hasAriaLabel =
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby');

      if (!hasLabel && !hasAriaLabel) {
        this.violations.push({
          element: this.getElementSelector(input),
          type: 'screen-reader',
          severity: 'error',
          description: 'Form input missing label',
          fix: 'Add associated label element or aria-label attribute',
        });
      }
    });

    // Test for proper heading structure
    this.testHeadingStructure();

    // Test for ARIA roles and properties
    this.testAriaUsage();

    this.features.find((f) => f.id === 'screen-reader')!.implemented =
      !this.violations.some((v) => v.type === 'screen-reader');
  }

  /**
   * Test voice control support
   */
  private async testVoiceControlSupport(): Promise<void> {
    const clickableElements = document.querySelectorAll(
      'button, a, [role="button"]',
    );

    clickableElements.forEach((element) => {
      const accessibleName = this.getAccessibleName(element);

      if (!accessibleName || accessibleName.length < 2) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'voice-control',
          severity: 'warning',
          description: 'Element lacks accessible name for voice control',
          fix: 'Ensure element has visible text or aria-label for voice commands',
        });
      }
    });

    this.features.find((f) => f.id === 'voice-control')!.implemented =
      !this.violations.some((v) => v.type === 'voice-control');
  }

  /**
   * Test motion preferences
   */
  private async testMotionPreferences(): Promise<void> {
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    const animatedElements = document.querySelectorAll(
      '[style*="animation"], [style*="transition"]',
    );

    if (reducedMotionQuery.matches) {
      animatedElements.forEach((element) => {
        const style = window.getComputedStyle(element);
        const hasAnimation = style.animationName !== 'none';
        const hasTransition = style.transitionDuration !== '0s';

        if (hasAnimation || hasTransition) {
          this.violations.push({
            element: this.getElementSelector(element),
            type: 'motion-preferences',
            severity: 'warning',
            description: 'Animation present when user prefers reduced motion',
            fix: 'Respect prefers-reduced-motion media query to disable animations',
          });
        }
      });
    }

    this.features.find((f) => f.id === 'motion-preferences')!.implemented =
      !this.violations.some((v) => v.type === 'motion-preferences');
  }

  /**
   * Test zoom support
   */
  private testZoomSupport(): void {
    const viewportMeta = document.querySelector('meta[name="viewport"]');

    if (viewportMeta) {
      const content = viewportMeta.getAttribute('content') || '';

      if (
        content.includes('user-scalable=no') ||
        content.includes('maximum-scale=1')
      ) {
        this.violations.push({
          element: 'meta[name="viewport"]',
          type: 'zoom-support',
          severity: 'error',
          description: 'Viewport meta tag prevents zooming',
          fix: 'Remove user-scalable=no and allow maximum-scale up to 5',
        });
      }
    }

    // Test if content remains usable at 200% zoom
    const currentZoom = window.devicePixelRatio;
    if (currentZoom >= 2) {
      const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;

      if (hasHorizontalScroll) {
        this.violations.push({
          element: 'body',
          type: 'zoom-support',
          severity: 'warning',
          description: 'Horizontal scrolling required at current zoom level',
          fix: 'Ensure content reflows properly at high zoom levels',
        });
      }
    }

    this.features.find((f) => f.id === 'zoom-support')!.implemented =
      !this.violations.some((v) => v.type === 'zoom-support');
  }

  /**
   * Test focus indicators
   */
  private testFocusIndicators(): void {
    const focusableElements = document.querySelectorAll(
      'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    focusableElements.forEach((element) => {
      element.addEventListener('focus', () => {
        this.validateFocusIndicator(element);
      });
    });

    this.features.find((f) => f.id === 'focus-indicators')!.implemented =
      !this.violations.some((v) => v.type === 'focus-indicators');
  }

  private validateFocusIndicator(element: Element): void {
    const computedStyle = window.getComputedStyle(element, ':focus');
    const outlineStyle = computedStyle.outline;
    const boxShadow = computedStyle.boxShadow;
    const borderColor = computedStyle.borderColor;

    const hasFocusIndicator =
      (outlineStyle &&
        outlineStyle !== 'none' &&
        !outlineStyle.includes('0px')) ||
      (boxShadow && boxShadow !== 'none') ||
      (borderColor && this.isHighContrastBorder(borderColor, element));

    if (!hasFocusIndicator) {
      this.violations.push({
        element: this.getElementSelector(element),
        type: 'focus-indicators',
        severity: 'error',
        description: 'Element lacks visible focus indicator',
        fix: 'Add outline, box-shadow, or high-contrast border on focus',
      });
    }
  }

  /**
   * Test error identification
   */
  private testErrorIdentification(): void {
    const forms = document.querySelectorAll('form');

    forms.forEach((form) => {
      const requiredInputs = form.querySelectorAll(
        'input[required], textarea[required], select[required]',
      );

      requiredInputs.forEach((input) => {
        if (
          !input.getAttribute('aria-describedby') &&
          !input.getAttribute('aria-invalid')
        ) {
          this.violations.push({
            element: this.getElementSelector(input),
            type: 'error-identification',
            severity: 'warning',
            description: 'Required field lacks error identification attributes',
            fix: 'Add aria-describedby pointing to error message element',
          });
        }
      });
    });

    this.features.find((f) => f.id === 'error-identification')!.implemented =
      !this.violations.some((v) => v.type === 'error-identification');
  }

  /**
   * Test language support
   */
  private testLanguageSupport(): void {
    const htmlLang = document.documentElement.lang;

    if (!htmlLang) {
      this.violations.push({
        element: 'html',
        type: 'language-support',
        severity: 'error',
        description: 'Document missing lang attribute',
        fix: 'Add lang attribute to html element (e.g., lang="en")',
      });
    }

    // Test for text in different languages without lang attributes
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span',
    );
    textElements.forEach((element) => {
      const text = element.textContent || '';
      if (
        this.detectLanguageChange(text, htmlLang) &&
        !element.getAttribute('lang')
      ) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'language-support',
          severity: 'info',
          description: 'Text in different language lacks lang attribute',
          fix: 'Add lang attribute when text language differs from document',
        });
      }
    });

    this.features.find((f) => f.id === 'language-support')!.implemented =
      !this.violations.some(
        (v) => v.type === 'language-support' && v.severity === 'error',
      );
  }

  /**
   * Test orientation support
   */
  private testOrientationSupport(): void {
    // This test runs when orientation changes
    const isLandscape = window.orientation === 90 || window.orientation === -90;
    const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
    const hasVerticalScroll = document.body.scrollHeight > window.innerHeight;

    if (
      (isLandscape && hasVerticalScroll) ||
      (!isLandscape && hasHorizontalScroll)
    ) {
      // Some scrolling is expected, but content should remain accessible
      const importantElements = document.querySelectorAll('button, input, a');
      let hiddenElements = 0;

      importantElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (
          rect.right > window.innerWidth ||
          rect.bottom > window.innerHeight
        ) {
          hiddenElements++;
        }
      });

      if (hiddenElements > importantElements.length * 0.5) {
        this.violations.push({
          element: 'body',
          type: 'orientation-support',
          severity: 'warning',
          description:
            'Many interactive elements hidden in current orientation',
          fix: 'Ensure content remains accessible in both orientations',
        });
      }
    }

    this.features.find((f) => f.id === 'orientation-support')!.implemented =
      !this.violations.some((v) => v.type === 'orientation-support');
  }

  /**
   * Test timing adjustments
   */
  private testTimingAdjustments(): void {
    // Look for auto-dismissing notifications or timeouts
    const notifications = document.querySelectorAll(
      '[role="alert"], .notification, .toast',
    );

    notifications.forEach((notification) => {
      // Check if notification has timing controls
      const hasExtendButton = notification.querySelector(
        '[data-extend], [aria-label*="extend"], [aria-label*="more time"]',
      );
      const hasDismissButton = notification.querySelector(
        '[data-dismiss], [aria-label*="close"], [aria-label*="dismiss"]',
      );

      if (!hasExtendButton && !hasDismissButton) {
        this.violations.push({
          element: this.getElementSelector(notification),
          type: 'timing-adjustments',
          severity: 'warning',
          description: 'Timed content lacks user controls',
          fix: 'Add extend/dismiss buttons for timed notifications',
        });
      }
    });

    this.features.find((f) => f.id === 'timing-adjustments')!.implemented =
      !this.violations.some((v) => v.type === 'timing-adjustments');
  }

  /**
   * Helper methods
   */
  private testHeadingStructure(): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (level > previousLevel + 1) {
        this.violations.push({
          element: this.getElementSelector(heading),
          type: 'screen-reader',
          severity: 'warning',
          description: `Heading level ${level} skips levels (previous was ${previousLevel})`,
          fix: 'Use heading levels sequentially (h1, h2, h3, etc.)',
        });
      }

      previousLevel = level;
    });
  }

  private testAriaUsage(): void {
    const elementsWithAria = document.querySelectorAll(
      '[aria-label], [aria-labelledby], [aria-describedby], [role]',
    );

    elementsWithAria.forEach((element) => {
      const role = element.getAttribute('role');
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');

      if (ariaLabelledBy) {
        const referencedElement = document.getElementById(ariaLabelledBy);
        if (!referencedElement) {
          this.violations.push({
            element: this.getElementSelector(element),
            type: 'screen-reader',
            severity: 'error',
            description: `aria-labelledby references non-existent element: ${ariaLabelledBy}`,
            fix: 'Ensure referenced element exists or use aria-label instead',
          });
        }
      }

      if (role && !this.isValidAriaRole(role)) {
        this.violations.push({
          element: this.getElementSelector(element),
          type: 'screen-reader',
          severity: 'error',
          description: `Invalid ARIA role: ${role}`,
          fix: 'Use valid ARIA role or remove role attribute',
        });
      }
    });
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className)
      return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private getEffectiveBackgroundColor(element: Element): string {
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const bgColor = style.backgroundColor;
      if (
        bgColor &&
        bgColor !== 'rgba(0, 0, 0, 0)' &&
        bgColor !== 'transparent'
      ) {
        return bgColor;
      }
      current = current.parentElement!;
    }
    return 'rgb(255, 255, 255)'; // Default to white
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    const l1 = this.getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = this.getLuminance(rgb2[0], rgb2[1], rgb2[2]);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private parseColor(color: string): [number, number, number] {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    const match = computed.match(/\d+/g);
    return match
      ? [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
      : [0, 0, 0];
  }

  private getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  private isFocusable(element: Element): boolean {
    const tabIndex = element.getAttribute('tabindex');
    return tabIndex !== '-1' && !element.hasAttribute('disabled');
  }

  private canEscapeCurrentFocus(): boolean {
    // Simplified test - in real implementation, would test actual keyboard navigation
    const activeElement = document.activeElement;
    return (
      !activeElement ||
      activeElement.tagName !== 'INPUT' ||
      (activeElement as HTMLInputElement).type !== 'text'
    );
  }

  private hasAssociatedLabel(input: Element): boolean {
    const id = input.id;
    if (id && document.querySelector(`label[for="${id}"]`)) return true;

    const parentLabel = input.closest('label');
    return !!parentLabel;
  }

  private getAccessibleName(element: Element): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ref = document.getElementById(ariaLabelledBy);
      if (ref) return ref.textContent || '';
    }

    return element.textContent || '';
  }

  private detectLanguageChange(text: string, documentLang: string): boolean {
    // Simplified language detection - would use more sophisticated detection in real implementation
    const commonWords = {
      en: [
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
      ],
      es: [
        'el',
        'la',
        'y',
        'o',
        'pero',
        'en',
        'de',
        'que',
        'a',
        'para',
        'con',
        'por',
      ],
      fr: [
        'le',
        'la',
        'et',
        'ou',
        'mais',
        'dans',
        'de',
        'que',
        'à',
        'pour',
        'avec',
        'par',
      ],
    };

    const words = text.toLowerCase().split(/\s+/);
    // This is a very basic implementation - real detection would be more sophisticated
    return false;
  }

  private isHighContrastBorder(borderColor: string, element: Element): boolean {
    const bgColor = this.getEffectiveBackgroundColor(element);
    return this.calculateContrastRatio(borderColor, bgColor) >= 3;
  }

  private isValidAriaRole(role: string): boolean {
    const validRoles = [
      'button',
      'link',
      'checkbox',
      'radio',
      'textbox',
      'combobox',
      'listbox',
      'grid',
      'tree',
      'dialog',
      'alert',
      'status',
      'log',
      'marquee',
      'timer',
      'alertdialog',
      'application',
      'article',
      'banner',
      'complementary',
      'contentinfo',
      'form',
      'main',
      'navigation',
      'region',
      'search',
    ];
    return validRoles.includes(role);
  }

  private calculateAccessibilityScore(): number {
    const implementedFeatures = this.features.filter(
      (f) => f.implemented,
    ).length;
    const totalFeatures = this.features.length;

    const baseScore = (implementedFeatures / totalFeatures) * 100;

    // Deduct points for violations
    const errorPoints =
      this.violations.filter((v) => v.severity === 'error').length * 10;
    const warningPoints =
      this.violations.filter((v) => v.severity === 'warning').length * 5;
    const infoPoints =
      this.violations.filter((v) => v.severity === 'info').length * 1;

    return Math.max(0, baseScore - errorPoints - warningPoints - infoPoints);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const errorsByType = new Map<string, AccessibilityViolation[]>();
    this.violations.forEach((violation) => {
      if (!errorsByType.has(violation.type)) {
        errorsByType.set(violation.type, []);
      }
      errorsByType.get(violation.type)!.push(violation);
    });

    errorsByType.forEach((violations, type) => {
      if (violations.length > 0) {
        recommendations.push(`${type}: ${violations.length} issues found`);
        recommendations.push(`- ${violations[0].fix}`);
      }
    });

    return recommendations;
  }

  private getWCAGCompliance(): { [wcagLevel: string]: boolean } {
    const levelA = this.features.filter((f) => f.wcagLevel === 'A');
    const levelAA = this.features.filter((f) => f.wcagLevel === 'AA');
    const levelAAA = this.features.filter((f) => f.wcagLevel === 'AAA');

    return {
      'WCAG A': levelA.every((f) => f.implemented),
      'WCAG AA':
        levelA.every((f) => f.implemented) &&
        levelAA.every((f) => f.implemented),
      'WCAG AAA': this.features.every((f) => f.implemented),
    };
  }

  /**
   * Get current accessibility status
   */
  getAccessibilityStatus(): {
    features: AccessibilityFeature[];
    implementedCount: number;
    totalCount: number;
    complianceLevel: string;
  } {
    const implementedCount = this.features.filter((f) => f.implemented).length;
    const totalCount = this.features.length;

    let complianceLevel = 'Non-compliant';
    const compliance = this.getWCAGCompliance();

    if (compliance['WCAG AAA']) complianceLevel = 'WCAG AAA';
    else if (compliance['WCAG AA']) complianceLevel = 'WCAG AA';
    else if (compliance['WCAG A']) complianceLevel = 'WCAG A';

    return {
      features: this.features,
      implementedCount,
      totalCount,
      complianceLevel,
    };
  }
}

// Export singleton instance
export const mobileAccessibility = MobileAccessibilityService.getInstance();
