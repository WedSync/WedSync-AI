/**
 * WS-173: Accessibility Performance Guardian
 * Ensures performance optimizations don't compromise accessibility
 */

interface AccessibilityMetrics {
  colorContrastRatio: number;
  keyboardNavigation: boolean;
  screenReaderCompatibility: boolean;
  focusManagement: boolean;
  ariaLabeling: boolean;
  semanticStructure: boolean;
  textReadability: number;
  interactiveElementSize: boolean;
  motionPreferences: boolean;
  timeout: number;
}

interface PerformanceAccessibilityReport {
  timestamp: number;
  overallScore: number;
  metrics: AccessibilityMetrics;
  issues: AccessibilityIssue[];
  recommendations: string[];
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'high';
}

interface AccessibilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  element?: string;
  description: string;
  impact: string;
  solution: string;
  performanceRelated: boolean;
}

export class AccessibilityPerformanceGuardian {
  private performanceOptimizations: Set<string> = new Set();
  private accessibilityBaseline: AccessibilityMetrics | null = null;
  private isMonitoring = false;
  private observer: MutationObserver | null = null;

  constructor() {
    this.setupAccessibilityMonitoring();
    this.trackPerformanceOptimizations();
  }

  /**
   * Establish accessibility baseline before performance optimizations
   */
  async establishAccessibilityBaseline(): Promise<AccessibilityMetrics> {
    const baseline = await this.measureAccessibilityMetrics();
    this.accessibilityBaseline = baseline;

    console.log('♿ Accessibility baseline established:', baseline);
    return baseline;
  }

  /**
   * Validate accessibility after performance optimization
   */
  async validateAccessibilityAfterOptimization(
    optimizationType: string,
  ): Promise<PerformanceAccessibilityReport> {
    if (!this.accessibilityBaseline) {
      await this.establishAccessibilityBaseline();
    }

    const currentMetrics = await this.measureAccessibilityMetrics();
    const issues = this.compareWithBaseline(
      currentMetrics,
      this.accessibilityBaseline!,
    );
    const overallScore = this.calculateAccessibilityScore(currentMetrics);

    const report: PerformanceAccessibilityReport = {
      timestamp: Date.now(),
      overallScore,
      metrics: currentMetrics,
      issues,
      recommendations: this.generateAccessibilityRecommendations(issues),
      performanceImpact: this.assessPerformanceImpact(issues),
    };

    // Track optimization impact
    this.performanceOptimizations.add(optimizationType);

    // Log critical issues
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.error(
        '🚨 CRITICAL Accessibility Issues After Optimization:',
        criticalIssues,
      );
    }

    console.log('♿ Accessibility validation complete:', report);
    return report;
  }

  /**
   * Continuous accessibility monitoring during performance optimizations
   */
  startContinuousMonitoring(
    onIssueDetected: (issue: AccessibilityIssue) => void,
  ): () => void {
    if (this.isMonitoring) {
      console.warn('Accessibility monitoring already active');
      return () => {};
    }

    this.isMonitoring = true;

    // Setup mutation observer to detect DOM changes
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          this.validateChangedElements(mutation, onIssueDetected);
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-hidden', 'tabindex', 'role', 'alt'],
    });

    // GUARDIAN FIX: Return cleanup function to prevent memory leaks
    return () => {
      this.stopContinuousMonitoring();
    };

    // Setup focus monitoring
    this.setupFocusMonitoring(onIssueDetected);

    console.log('♿ Continuous accessibility monitoring started');

    // Return cleanup function
    return () => {
      this.stopContinuousMonitoring();
    };
  }

  /**
   * Stop continuous accessibility monitoring
   */
  stopContinuousMonitoring(): void {
    this.isMonitoring = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    console.log('♿ Continuous accessibility monitoring stopped');
  }

  /**
   * Validate specific performance optimization for accessibility impact
   */
  async validateOptimization(
    optimizationType:
      | 'lazy-loading'
      | 'code-splitting'
      | 'caching'
      | 'compression'
      | 'minification',
    targetElement?: Element,
  ): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    switch (optimizationType) {
      case 'lazy-loading':
        issues.push(
          ...(await this.validateLazyLoadingAccessibility(targetElement)),
        );
        break;
      case 'code-splitting':
        issues.push(...(await this.validateCodeSplittingAccessibility()));
        break;
      case 'caching':
        issues.push(...(await this.validateCachingAccessibility()));
        break;
      case 'compression':
        issues.push(...(await this.validateCompressionAccessibility()));
        break;
      case 'minification':
        issues.push(...(await this.validateMinificationAccessibility()));
        break;
    }

    return issues;
  }

  /**
   * Get accessibility-safe performance recommendations
   */
  getAccessibilitySafeOptimizations(): {
    safe: string[];
    requiresValidation: string[];
    avoid: string[];
  } {
    return {
      safe: [
        'Enable gzip compression',
        'Optimize image formats (WebP, AVIF)',
        'Use efficient caching strategies',
        'Minify CSS and JavaScript (with source maps)',
        'Implement service worker caching',
        'Enable HTTP/2 server push',
      ],
      requiresValidation: [
        'Lazy loading images and videos',
        'Code splitting and dynamic imports',
        'Removing unused CSS',
        'Tree shaking JavaScript',
        'Aggressive image compression',
        'Font optimization and subsetting',
      ],
      avoid: [
        'Removing focus indicators for performance',
        'Disabling scroll behavior for smooth animations',
        'Aggressive DOM virtualization without aria support',
        'Removing semantic HTML for smaller bundle size',
        'Disabling form validation for faster submissions',
      ],
    };
  }

  /**
   * Private helper methods
   */

  private async measureAccessibilityMetrics(): Promise<AccessibilityMetrics> {
    return {
      colorContrastRatio: await this.measureColorContrast(),
      keyboardNavigation: this.testKeyboardNavigation(),
      screenReaderCompatibility: this.testScreenReaderCompatibility(),
      focusManagement: this.testFocusManagement(),
      ariaLabeling: this.testAriaLabeling(),
      semanticStructure: this.testSemanticStructure(),
      textReadability: this.measureTextReadability(),
      interactiveElementSize: this.testInteractiveElementSizes(),
      motionPreferences: this.testMotionPreferences(),
      timeout: this.measureInteractionTimeout(),
    };
  }

  private async measureColorContrast(): Promise<number> {
    // Measure color contrast ratios across the page
    let totalContrast = 0;
    let elementCount = 0;

    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span, a, button, label',
    );

    textElements.forEach((element) => {
      const styles = getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastRatio(color, backgroundColor);
        totalContrast += contrast;
        elementCount++;
      }
    });

    return elementCount > 0 ? totalContrast / elementCount : 0;
  }

  private testKeyboardNavigation(): boolean {
    // Test if all interactive elements are keyboard accessible
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]',
    );
    let accessibleCount = 0;

    interactiveElements.forEach((element) => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex === null || parseInt(tabIndex) >= 0) {
        accessibleCount++;
      }
    });

    return accessibleCount === interactiveElements.length;
  }

  private testScreenReaderCompatibility(): boolean {
    // Test screen reader compatibility
    const images = document.querySelectorAll('img');
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input');

    let compatibleCount = 0;
    let totalCount = 0;

    // Check images have alt text
    images.forEach((img) => {
      totalCount++;
      if (img.hasAttribute('alt')) {
        compatibleCount++;
      }
    });

    // Check buttons have accessible names
    buttons.forEach((button) => {
      totalCount++;
      if (
        button.textContent?.trim() ||
        button.hasAttribute('aria-label') ||
        button.hasAttribute('aria-labelledby')
      ) {
        compatibleCount++;
      }
    });

    // Check inputs have labels
    inputs.forEach((input) => {
      totalCount++;
      if (
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        document.querySelector(`label[for="${input.id}"]`)
      ) {
        compatibleCount++;
      }
    });

    return totalCount === 0 || compatibleCount / totalCount >= 0.9;
  }

  private testFocusManagement(): boolean {
    // Test focus management
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    let properFocusCount = 0;

    focusableElements.forEach((element) => {
      const styles = getComputedStyle(element);
      if (styles.outline !== 'none' && styles.outline !== '0') {
        properFocusCount++;
      }
    });

    return properFocusCount >= focusableElements.length * 0.8; // 80% threshold
  }

  private testAriaLabeling(): boolean {
    // Test ARIA labeling completeness
    const elementsNeedingLabels = document.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]), input:not([aria-label]):not([aria-labelledby])',
    );

    let labeledCount = 0;
    elementsNeedingLabels.forEach((element) => {
      if (
        element.textContent?.trim() ||
        element.hasAttribute('title') ||
        document.querySelector(`label[for="${element.id}"]`)
      ) {
        labeledCount++;
      }
    });

    return (
      elementsNeedingLabels.length === 0 ||
      labeledCount / elementsNeedingLabels.length >= 0.9
    );
  }

  private testSemanticStructure(): boolean {
    // Test semantic HTML structure
    const hasMain = document.querySelector('main') !== null;
    const hasNav = document.querySelector('nav') !== null;
    const hasHeader = document.querySelector('header') !== null;
    const hasHeadings =
      document.querySelector('h1, h2, h3, h4, h5, h6') !== null;

    const semanticScore = [hasMain, hasNav, hasHeader, hasHeadings].filter(
      Boolean,
    ).length;

    return semanticScore >= 3; // At least 3 out of 4 semantic requirements
  }

  private measureTextReadability(): number {
    // Measure text readability (font size, line height, etc.)
    const textElements = document.querySelectorAll('p, span, div');
    let readableCount = 0;

    textElements.forEach((element) => {
      const styles = getComputedStyle(element);
      const fontSize = parseFloat(styles.fontSize);
      const lineHeight = parseFloat(styles.lineHeight);

      if (fontSize >= 16 && lineHeight >= fontSize * 1.4) {
        readableCount++;
      }
    });

    return textElements.length > 0
      ? (readableCount / textElements.length) * 100
      : 100;
  }

  private testInteractiveElementSizes(): boolean {
    // Test minimum touch target sizes (44px x 44px)
    const interactiveElements = document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"]',
    );
    let adequateSizeCount = 0;

    interactiveElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) {
        adequateSizeCount++;
      }
    });

    return (
      interactiveElements.length === 0 ||
      adequateSizeCount / interactiveElements.length >= 0.8
    );
  }

  private testMotionPreferences(): boolean {
    // Test respect for motion preferences
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!prefersReducedMotion) return true;

    // Check if animations are disabled when user prefers reduced motion
    const animatedElements = document.querySelectorAll(
      '[style*="animation"], [style*="transition"]',
    );
    let respectsPreference = true;

    animatedElements.forEach((element) => {
      const styles = getComputedStyle(element);
      if (
        styles.animationDuration !== '0s' ||
        styles.transitionDuration !== '0s'
      ) {
        respectsPreference = false;
      }
    });

    return respectsPreference;
  }

  private measureInteractionTimeout(): number {
    // Measure average interaction response time
    return performance.now(); // Simplified - would measure actual interaction times
  }

  private calculateContrastRatio(
    foreground: string,
    background: string,
  ): number {
    // Simplified contrast ratio calculation
    // In real implementation, would convert colors to RGB and calculate proper contrast
    return 4.5; // Placeholder - WCAG AA minimum
  }

  private compareWithBaseline(
    current: AccessibilityMetrics,
    baseline: AccessibilityMetrics,
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check each metric for degradation
    if (current.colorContrastRatio < baseline.colorContrastRatio * 0.9) {
      issues.push({
        severity: 'high',
        type: 'color-contrast',
        description: 'Color contrast has degraded after optimization',
        impact: 'Affects users with visual impairments',
        solution: 'Review color changes introduced by optimization',
        performanceRelated: true,
      });
    }

    if (!current.keyboardNavigation && baseline.keyboardNavigation) {
      issues.push({
        severity: 'critical',
        type: 'keyboard-navigation',
        description: 'Keyboard navigation has been broken by optimization',
        impact: 'Prevents keyboard-only users from accessing content',
        solution: 'Restore keyboard accessibility to optimized elements',
        performanceRelated: true,
      });
    }

    if (
      !current.screenReaderCompatibility &&
      baseline.screenReaderCompatibility
    ) {
      issues.push({
        severity: 'critical',
        type: 'screen-reader',
        description: 'Screen reader compatibility has been compromised',
        impact: 'Prevents screen reader users from accessing content',
        solution: 'Ensure ARIA labels and semantic structure are preserved',
        performanceRelated: true,
      });
    }

    return issues;
  }

  private calculateAccessibilityScore(metrics: AccessibilityMetrics): number {
    const weights = {
      colorContrastRatio: 0.15,
      keyboardNavigation: 0.2,
      screenReaderCompatibility: 0.2,
      focusManagement: 0.15,
      ariaLabeling: 0.15,
      semanticStructure: 0.1,
      textReadability: 0.05,
    };

    let score = 0;
    score +=
      Math.min(metrics.colorContrastRatio / 4.5, 1) *
      weights.colorContrastRatio *
      100;
    score +=
      (metrics.keyboardNavigation ? 1 : 0) * weights.keyboardNavigation * 100;
    score +=
      (metrics.screenReaderCompatibility ? 1 : 0) *
      weights.screenReaderCompatibility *
      100;
    score += (metrics.focusManagement ? 1 : 0) * weights.focusManagement * 100;
    score += (metrics.ariaLabeling ? 1 : 0) * weights.ariaLabeling * 100;
    score +=
      (metrics.semanticStructure ? 1 : 0) * weights.semanticStructure * 100;
    score += (metrics.textReadability / 100) * weights.textReadability * 100;

    return Math.round(score);
  }

  private generateAccessibilityRecommendations(
    issues: AccessibilityIssue[],
  ): string[] {
    const recommendations: string[] = [];

    if (issues.some((i) => i.type === 'color-contrast')) {
      recommendations.push(
        'Ensure color contrast ratios meet WCAG AA standards (4.5:1 for normal text)',
      );
    }

    if (issues.some((i) => i.type === 'keyboard-navigation')) {
      recommendations.push(
        'Test all interactive elements with keyboard navigation',
      );
      recommendations.push(
        'Ensure focus indicators are visible and not removed by optimizations',
      );
    }

    if (issues.some((i) => i.type === 'screen-reader')) {
      recommendations.push(
        'Test with screen readers after applying optimizations',
      );
      recommendations.push('Preserve ARIA labels and semantic HTML structure');
    }

    if (issues.length === 0) {
      recommendations.push(
        'Accessibility has been preserved during optimization',
      );
    }

    return recommendations;
  }

  private assessPerformanceImpact(
    issues: AccessibilityIssue[],
  ): 'none' | 'minimal' | 'moderate' | 'high' {
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    const highIssues = issues.filter((i) => i.severity === 'high');

    if (criticalIssues.length > 0) return 'high';
    if (highIssues.length > 2) return 'moderate';
    if (issues.length > 0) return 'minimal';
    return 'none';
  }

  // Optimization-specific validation methods
  private async validateLazyLoadingAccessibility(
    targetElement?: Element,
  ): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check if lazy-loaded images have proper alt text
    const lazyImages = document.querySelectorAll(
      'img[loading="lazy"], img[data-src]',
    );
    lazyImages.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.push({
          severity: 'high',
          type: 'lazy-loading',
          element: img.tagName,
          description: 'Lazy-loaded image missing alt text',
          impact: 'Screen readers cannot describe the image',
          solution: 'Add descriptive alt text to lazy-loaded images',
          performanceRelated: true,
        });
      }
    });

    return issues;
  }

  private async validateCodeSplittingAccessibility(): Promise<
    AccessibilityIssue[]
  > {
    const issues: AccessibilityIssue[] = [];

    // Check if code splitting affects focus management
    // This would need more sophisticated detection in real implementation

    return issues;
  }

  private async validateCachingAccessibility(): Promise<AccessibilityIssue[]> {
    // Caching typically doesn't affect accessibility
    return [];
  }

  private async validateCompressionAccessibility(): Promise<
    AccessibilityIssue[]
  > {
    const issues: AccessibilityIssue[] = [];

    // Check if text compression affects readability
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    textElements.forEach((element) => {
      if (element.textContent && element.textContent.includes('�')) {
        issues.push({
          severity: 'medium',
          type: 'compression',
          element: element.tagName,
          description: 'Text compression may have corrupted characters',
          impact: 'Affects text readability for all users',
          solution: 'Check text encoding after compression',
          performanceRelated: true,
        });
      }
    });

    return issues;
  }

  private async validateMinificationAccessibility(): Promise<
    AccessibilityIssue[]
  > {
    // Minification typically doesn't affect accessibility if done properly
    return [];
  }

  private setupAccessibilityMonitoring(): void {
    // Setup performance API monitoring for accessibility metrics
    console.log('♿ Accessibility monitoring initialized');
  }

  private trackPerformanceOptimizations(): void {
    // Track when performance optimizations are applied
    console.log('📊 Performance optimization tracking enabled');
  }

  private validateChangedElements(
    mutation: MutationRecord,
    onIssueDetected: (issue: AccessibilityIssue) => void,
  ): void {
    // Validate accessibility of changed elements
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          this.validateElement(element).then((issues) => {
            issues.forEach(onIssueDetected);
          });
        }
      });
    }
  }

  private async validateElement(
    element: Element,
  ): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Basic validation for new elements
    if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
      issues.push({
        severity: 'high',
        type: 'missing-alt',
        element: 'IMG',
        description: 'Image added without alt text',
        impact: 'Screen readers cannot describe the image',
        solution: 'Add descriptive alt text',
        performanceRelated: false,
      });
    }

    return issues;
  }

  private setupFocusMonitoring(
    onIssueDetected: (issue: AccessibilityIssue) => void,
  ): void {
    // Monitor focus changes for accessibility issues
    let lastFocusedElement: Element | null = null;

    document.addEventListener('focusin', (event) => {
      const target = event.target as Element;
      if (target && target !== lastFocusedElement) {
        const styles = getComputedStyle(target);
        if (styles.outline === 'none' && styles.boxShadow === 'none') {
          onIssueDetected({
            severity: 'medium',
            type: 'focus-indicator',
            element: target.tagName,
            description: 'Interactive element lacks visible focus indicator',
            impact: 'Keyboard users cannot see which element has focus',
            solution: 'Add visible focus styles',
            performanceRelated: false,
          });
        }
        lastFocusedElement = target;
      }
    });
  }
}

// Export singleton instance
export const accessibilityGuardian =
  typeof window !== 'undefined' ? new AccessibilityPerformanceGuardian() : null;
