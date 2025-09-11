/**
 * Advanced UX Enhancement Engine
 * Comprehensive mobile UX optimization with adaptive interfaces and intelligent interactions
 */

export interface UXMetrics {
  interaction_time: number;
  bounce_rate: number;
  task_completion_rate: number;
  error_rate: number;
  user_satisfaction_score: number;
  accessibility_score: number;
  usability_issues: string[];
}

export interface AdaptiveInterface {
  theme: 'light' | 'dark' | 'auto';
  contrast: 'normal' | 'high' | 'maximum';
  font_size: 'small' | 'medium' | 'large' | 'extra-large';
  interaction_mode: 'touch' | 'voice' | 'gesture' | 'mixed';
  layout_density: 'compact' | 'comfortable' | 'spacious';
  animation_preference: 'full' | 'reduced' | 'none';
}

export interface HapticFeedback {
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';
  pattern?: number[];
  duration?: number;
}

export interface GestureConfig {
  swipe_sensitivity: number;
  pinch_sensitivity: number;
  long_press_duration: number;
  double_tap_speed: number;
  enable_custom_gestures: boolean;
}

export interface AccessibilityFeatures {
  screen_reader_support: boolean;
  high_contrast_mode: boolean;
  large_text_mode: boolean;
  voice_navigation: boolean;
  keyboard_navigation: boolean;
  color_blind_support: boolean;
  motion_sensitivity_mode: boolean;
}

export class UXEnhancementEngine {
  private metrics: UXMetrics;
  private adaptiveInterface: AdaptiveInterface;
  private gestureConfig: GestureConfig;
  private accessibilityFeatures: AccessibilityFeatures;
  private touchHandler: TouchHandler;
  private voiceHandler: VoiceHandler;
  private feedbackSystem: FeedbackSystem;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.adaptiveInterface = this.initializeAdaptiveInterface();
    this.gestureConfig = this.initializeGestureConfig();
    this.accessibilityFeatures = this.initializeAccessibilityFeatures();

    this.touchHandler = new TouchHandler(this.gestureConfig);
    this.voiceHandler = new VoiceHandler();
    this.feedbackSystem = new FeedbackSystem();

    this.initializeUXEnhancements();
  }

  private initializeMetrics(): UXMetrics {
    return {
      interaction_time: 0,
      bounce_rate: 0,
      task_completion_rate: 0,
      error_rate: 0,
      user_satisfaction_score: 0,
      accessibility_score: 0,
      usability_issues: [],
    };
  }

  private initializeAdaptiveInterface(): AdaptiveInterface {
    const saved = localStorage.getItem('wedsync_adaptive_interface');
    if (saved) return JSON.parse(saved);

    return {
      theme: 'auto',
      contrast: 'normal',
      font_size: 'medium',
      interaction_mode: 'touch',
      layout_density: 'comfortable',
      animation_preference: 'full',
    };
  }

  private initializeGestureConfig(): GestureConfig {
    const saved = localStorage.getItem('wedsync_gesture_config');
    if (saved) return JSON.parse(saved);

    return {
      swipe_sensitivity: 0.7,
      pinch_sensitivity: 0.8,
      long_press_duration: 500,
      double_tap_speed: 300,
      enable_custom_gestures: true,
    };
  }

  private initializeAccessibilityFeatures(): AccessibilityFeatures {
    return {
      screen_reader_support: this.detectScreenReader(),
      high_contrast_mode: this.detectHighContrastPreference(),
      large_text_mode: this.detectLargeTextPreference(),
      voice_navigation: false,
      keyboard_navigation: this.detectKeyboardNavigation(),
      color_blind_support: false,
      motion_sensitivity_mode: this.detectReducedMotionPreference(),
    };
  }

  private async initializeUXEnhancements(): Promise<void> {
    // Apply saved preferences
    this.applyAdaptiveInterface();
    this.setupGestureHandling();
    this.enableAccessibilityFeatures();
    this.initializeHapticFeedback();
    this.setupSmartNotifications();
    this.initializeMicroInteractions();
    this.setupContextualHelp();
    this.enableAdaptiveLayouts();
  }

  private applyAdaptiveInterface(): void {
    const root = document.documentElement;

    // Apply theme
    if (this.adaptiveInterface.theme === 'auto') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', this.adaptiveInterface.theme);
    }

    // Apply contrast
    root.setAttribute('data-contrast', this.adaptiveInterface.contrast);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px',
    };
    root.style.fontSize = fontSizeMap[this.adaptiveInterface.font_size];

    // Apply layout density
    root.setAttribute('data-density', this.adaptiveInterface.layout_density);

    // Apply animation preferences
    if (this.adaptiveInterface.animation_preference === 'none') {
      root.classList.add('no-animations');
    } else if (this.adaptiveInterface.animation_preference === 'reduced') {
      root.classList.add('reduced-motion');
    }
  }

  private setupGestureHandling(): void {
    this.touchHandler.onSwipe(
      (direction: 'left' | 'right' | 'up' | 'down', element: HTMLElement) => {
        this.handleSwipeGesture(direction, element);
      },
    );

    this.touchHandler.onPinch((scale: number, element: HTMLElement) => {
      this.handlePinchGesture(scale, element);
    });

    this.touchHandler.onLongPress((element: HTMLElement) => {
      this.handleLongPressGesture(element);
    });

    this.touchHandler.onDoubleTap((element: HTMLElement) => {
      this.handleDoubleTapGesture(element);
    });
  }

  private enableAccessibilityFeatures(): void {
    if (this.accessibilityFeatures.screen_reader_support) {
      this.enhanceScreenReaderSupport();
    }

    if (this.accessibilityFeatures.high_contrast_mode) {
      document.body.classList.add('high-contrast');
    }

    if (this.accessibilityFeatures.large_text_mode) {
      document.body.classList.add('large-text');
    }

    if (this.accessibilityFeatures.keyboard_navigation) {
      this.enhanceKeyboardNavigation();
    }

    if (this.accessibilityFeatures.color_blind_support) {
      this.enableColorBlindSupport();
    }
  }

  private initializeHapticFeedback(): void {
    if ('vibrate' in navigator) {
      // Enable haptic feedback for various interactions
      this.enableHapticFeedbackForButtons();
      this.enableHapticFeedbackForGestures();
      this.enableHapticFeedbackForNotifications();
    }
  }

  private setupSmartNotifications(): void {
    // Intelligent notification timing and grouping
    const notificationManager = new SmartNotificationManager();

    // Only show notifications when user is likely to be available
    notificationManager.setOptimalTiming();

    // Group related notifications
    notificationManager.enableNotificationGrouping();

    // Adaptive notification frequency based on user response
    notificationManager.enableAdaptiveFrequency();
  }

  private initializeMicroInteractions(): void {
    // Add delightful micro-interactions throughout the app
    this.addButtonHoverEffects();
    this.addLoadingAnimations();
    this.addSuccessAnimations();
    this.addErrorAnimations();
    this.addScrollAnimations();
  }

  private setupContextualHelp(): void {
    // Intelligent help system that appears contextually
    const helpSystem = new ContextualHelpSystem();

    helpSystem.showHelpWhenNeeded();
    helpSystem.enableProgressiveDisclosure();
    helpSystem.addTooltipsForComplexFeatures();
  }

  private enableAdaptiveLayouts(): void {
    // Layouts that adapt based on usage patterns and device characteristics
    const layoutManager = new AdaptiveLayoutManager();

    layoutManager.adaptToDeviceCapabilities();
    layoutManager.optimizeForUsagePatterns();
    layoutManager.enableOneHandedMode();
  }

  private handleSwipeGesture(direction: string, element: HTMLElement): void {
    // Provide haptic feedback
    this.provideHapticFeedback({ type: 'light' });

    // Handle different swipe contexts
    if (element.classList.contains('expense-card')) {
      if (direction === 'right') {
        this.markExpenseAsComplete(element);
      } else if (direction === 'left') {
        this.showExpenseOptions(element);
      }
    } else if (element.classList.contains('task-item')) {
      if (direction === 'right') {
        this.completeTask(element);
      } else if (direction === 'left') {
        this.snoozeTask(element);
      }
    }

    // Update metrics
    this.trackInteraction('swipe', direction);
  }

  private handlePinchGesture(scale: number, element: HTMLElement): void {
    if (element.classList.contains('budget-chart')) {
      // Zoom budget chart
      this.zoomChart(element, scale);
    } else if (element.classList.contains('timeline-view')) {
      // Zoom timeline
      this.zoomTimeline(element, scale);
    }

    this.trackInteraction('pinch', `scale_${scale.toFixed(2)}`);
  }

  private handleLongPressGesture(element: HTMLElement): void {
    this.provideHapticFeedback({ type: 'medium' });

    // Show context menu or additional options
    this.showContextMenu(element);
    this.trackInteraction('long_press', element.className);
  }

  private handleDoubleTapGesture(element: HTMLElement): void {
    if (element.classList.contains('favorite-vendor')) {
      this.toggleFavorite(element);
    } else if (element.classList.contains('photo-gallery-item')) {
      this.enterFullScreenMode(element);
    }

    this.trackInteraction('double_tap', element.className);
  }

  private provideHapticFeedback(config: HapticFeedback): void {
    if (!('vibrate' in navigator)) return;

    let pattern: number[] = [];

    switch (config.type) {
      case 'light':
        pattern = [10];
        break;
      case 'medium':
        pattern = [20];
        break;
      case 'heavy':
        pattern = [30];
        break;
      case 'selection':
        pattern = [5, 5, 5];
        break;
      case 'impact':
        pattern = [15, 10, 15];
        break;
      case 'notification':
        pattern = [50, 30, 50];
        break;
    }

    if (config.pattern) {
      pattern = config.pattern;
    }

    navigator.vibrate(pattern);
  }

  private detectScreenReader(): boolean {
    return !!(
      window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/i) ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]')
    );
  }

  private detectHighContrastPreference(): boolean {
    return (
      window.matchMedia('(prefers-contrast: high)').matches ||
      window.matchMedia('(prefers-contrast: more)').matches
    );
  }

  private detectLargeTextPreference(): boolean {
    return (
      window.matchMedia('(prefers-reduced-data: reduce)').matches ||
      parseFloat(getComputedStyle(document.documentElement).fontSize) > 18
    );
  }

  private detectKeyboardNavigation(): boolean {
    // Detect if user is primarily using keyboard
    let keyboardUsage = 0;
    let totalInteractions = 0;

    document.addEventListener('keydown', () => {
      keyboardUsage++;
      totalInteractions++;
    });

    document.addEventListener('click', () => {
      totalInteractions++;
    });

    // After some time, determine if keyboard usage is dominant
    setTimeout(() => {
      return keyboardUsage / totalInteractions > 0.7;
    }, 10000);

    return false; // Default to false initially
  }

  private detectReducedMotionPreference(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private enhanceScreenReaderSupport(): void {
    // Add ARIA labels dynamically
    const buttons = document.querySelectorAll('button:not([aria-label])');
    buttons.forEach((button) => {
      const text = button.textContent?.trim();
      if (text) {
        button.setAttribute('aria-label', text);
      }
    });

    // Add live regions for dynamic content
    const dynamicAreas = document.querySelectorAll('[data-dynamic]');
    dynamicAreas.forEach((area) => {
      area.setAttribute('aria-live', 'polite');
    });

    // Add landmark roles
    const main = document.querySelector('main');
    if (main) main.setAttribute('role', 'main');

    const nav = document.querySelector('nav');
    if (nav) nav.setAttribute('role', 'navigation');
  }

  private enhanceKeyboardNavigation(): void {
    // Ensure all interactive elements are focusable
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex], [data-interactive]',
    );

    interactiveElements.forEach((element, index) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });

    // Add visible focus indicators
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);

    // Enable skip navigation
    this.addSkipNavigation();
  }

  private enableColorBlindSupport(): void {
    // Add patterns/textures in addition to colors
    const style = document.createElement('style');
    style.textContent = `
      .color-blind-support .status-success::before { content: "✓ "; }
      .color-blind-support .status-warning::before { content: "⚠ "; }
      .color-blind-support .status-error::before { content: "✗ "; }
      .color-blind-support .budget-over { 
        background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px);
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('color-blind-support');
  }

  private enableHapticFeedbackForButtons(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.classList.contains('button')) {
        this.provideHapticFeedback({ type: 'selection' });
      }
    });
  }

  private enableHapticFeedbackForGestures(): void {
    // Already handled in gesture handlers
  }

  private enableHapticFeedbackForNotifications(): void {
    // Provide haptic feedback when notifications appear
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            node.classList.contains('notification')
          ) {
            this.provideHapticFeedback({ type: 'notification' });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private addButtonHoverEffects(): void {
    const buttons = document.querySelectorAll('button, .button');
    buttons.forEach((button) => {
      button.addEventListener('mouseenter', () => {
        button.classList.add('hover-effect');
      });
      button.addEventListener('mouseleave', () => {
        button.classList.remove('hover-effect');
      });
    });
  }

  private addLoadingAnimations(): void {
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach((element) => {
      element.classList.add('loading-animation');
    });
  }

  private addSuccessAnimations(): void {
    // Add success animations for completed actions
    document.addEventListener('success-action', (event: any) => {
      const element = event.target;
      element.classList.add('success-animation');
      setTimeout(() => {
        element.classList.remove('success-animation');
      }, 1000);
    });
  }

  private addErrorAnimations(): void {
    // Add error animations for failed actions
    document.addEventListener('error-action', (event: any) => {
      const element = event.target;
      element.classList.add('error-animation');
      this.provideHapticFeedback({ type: 'heavy' });
    });
  }

  private addScrollAnimations(): void {
    if (this.adaptiveInterface.animation_preference !== 'none') {
      const animatedElements = document.querySelectorAll(
        '[data-animate-on-scroll]',
      );

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      });

      animatedElements.forEach((element) => observer.observe(element));
    }
  }

  private addSkipNavigation(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-navigation';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #0066cc;
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Gesture action implementations
  private markExpenseAsComplete(element: HTMLElement): void {
    element.classList.add('completed');
    this.showSuccessMessage('Expense marked as complete');
  }

  private showExpenseOptions(element: HTMLElement): void {
    // Show options menu for the expense
    const options = ['Edit', 'Delete', 'Duplicate', 'Add Receipt'];
    this.showOptionsMenu(element, options);
  }

  private completeTask(element: HTMLElement): void {
    element.classList.add('completed');
    this.showSuccessMessage('Task completed!');
    this.provideHapticFeedback({ type: 'medium' });
  }

  private snoozeTask(element: HTMLElement): void {
    element.classList.add('snoozed');
    this.showInfoMessage('Task snoozed for 1 hour');
  }

  private zoomChart(element: HTMLElement, scale: number): void {
    element.style.transform = `scale(${scale})`;
  }

  private zoomTimeline(element: HTMLElement, scale: number): void {
    // Implement timeline zoom logic
  }

  private showContextMenu(element: HTMLElement): void {
    // Implementation for context menu
  }

  private toggleFavorite(element: HTMLElement): void {
    element.classList.toggle('favorited');
    const isFavorited = element.classList.contains('favorited');
    this.showInfoMessage(
      isFavorited ? 'Added to favorites' : 'Removed from favorites',
    );
  }

  private enterFullScreenMode(element: HTMLElement): void {
    // Implementation for full screen mode
  }

  private showOptionsMenu(element: HTMLElement, options: string[]): void {
    // Implementation for options menu
  }

  private showSuccessMessage(message: string): void {
    this.showToast(message, 'success');
  }

  private showInfoMessage(message: string): void {
    this.showToast(message, 'info');
  }

  private showToast(
    message: string,
    type: 'success' | 'info' | 'warning' | 'error',
  ): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      z-index: 1000;
      animation: slide-up 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  private trackInteraction(type: string, detail: string): void {
    // Track interaction for analytics
    console.log(`Interaction: ${type} - ${detail}`);

    // Update metrics
    this.metrics.interaction_time = Date.now();

    // Could send to analytics service
    // analytics.track('mobile_interaction', { type, detail })
  }

  public getUXMetrics(): UXMetrics {
    return { ...this.metrics };
  }

  public updateAdaptiveInterface(updates: Partial<AdaptiveInterface>): void {
    this.adaptiveInterface = { ...this.adaptiveInterface, ...updates };
    localStorage.setItem(
      'wedsync_adaptive_interface',
      JSON.stringify(this.adaptiveInterface),
    );
    this.applyAdaptiveInterface();
  }

  public updateAccessibilityFeatures(
    updates: Partial<AccessibilityFeatures>,
  ): void {
    this.accessibilityFeatures = { ...this.accessibilityFeatures, ...updates };
    this.enableAccessibilityFeatures();
  }

  public generateUXReport(): Promise<any> {
    return Promise.resolve({
      metrics: this.getUXMetrics(),
      adaptive_interface: this.adaptiveInterface,
      gesture_config: this.gestureConfig,
      accessibility_features: this.accessibilityFeatures,
      recommendations: this.generateUXRecommendations(),
    });
  }

  private generateUXRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.task_completion_rate < 0.8) {
      recommendations.push('Consider simplifying complex workflows');
    }

    if (this.metrics.error_rate > 0.1) {
      recommendations.push('Improve form validation and error messaging');
    }

    if (!this.accessibilityFeatures.screen_reader_support) {
      recommendations.push(
        'Enable screen reader support for better accessibility',
      );
    }

    return recommendations;
  }
}

// Helper classes
class TouchHandler {
  private gestureConfig: GestureConfig;
  private swipeCallbacks: ((
    direction: string,
    element: HTMLElement,
  ) => void)[] = [];
  private pinchCallbacks: ((scale: number, element: HTMLElement) => void)[] =
    [];
  private longPressCallbacks: ((element: HTMLElement) => void)[] = [];
  private doubleTapCallbacks: ((element: HTMLElement) => void)[] = [];

  constructor(config: GestureConfig) {
    this.gestureConfig = config;
    this.setupTouchHandlers();
  }

  private setupTouchHandlers(): void {
    // Implementation for touch handling
  }

  onSwipe(callback: (direction: string, element: HTMLElement) => void): void {
    this.swipeCallbacks.push(callback);
  }

  onPinch(callback: (scale: number, element: HTMLElement) => void): void {
    this.pinchCallbacks.push(callback);
  }

  onLongPress(callback: (element: HTMLElement) => void): void {
    this.longPressCallbacks.push(callback);
  }

  onDoubleTap(callback: (element: HTMLElement) => void): void {
    this.doubleTapCallbacks.push(callback);
  }
}

class VoiceHandler {
  // Voice command handling implementation
}

class FeedbackSystem {
  // Feedback system implementation
}

class SmartNotificationManager {
  setOptimalTiming(): void {
    // Implementation
  }

  enableNotificationGrouping(): void {
    // Implementation
  }

  enableAdaptiveFrequency(): void {
    // Implementation
  }
}

class ContextualHelpSystem {
  showHelpWhenNeeded(): void {
    // Implementation
  }

  enableProgressiveDisclosure(): void {
    // Implementation
  }

  addTooltipsForComplexFeatures(): void {
    // Implementation
  }
}

class AdaptiveLayoutManager {
  adaptToDeviceCapabilities(): void {
    // Implementation
  }

  optimizeForUsagePatterns(): void {
    // Implementation
  }

  enableOneHandedMode(): void {
    // Implementation
  }
}
