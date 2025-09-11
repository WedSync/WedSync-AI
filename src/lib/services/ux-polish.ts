/**
 * UX Polish Service
 * WS-155: Guest Communications - Round 3
 * Final user experience optimization for production users
 */

import { mobilePerformance } from './mobile-messaging-performance';
import { batteryOptimization } from './battery-optimization';
import { mobileAccessibility } from './mobile-accessibility-service';

interface UIPolishRule {
  id: string;
  name: string;
  description: string;
  condition: () => boolean;
  apply: () => void;
  priority: 'high' | 'medium' | 'low';
}

interface AnimationSettings {
  reduceMotion: boolean;
  duration: number;
  easing: string;
  enabled: boolean;
}

interface InteractionSettings {
  touchFeedback: boolean;
  hapticFeedback: boolean;
  soundFeedback: boolean;
  gestureSupport: boolean;
}

interface VisualSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorContrast: 'normal' | 'high';
  densityLevel: 'compact' | 'comfortable' | 'spacious';
}

interface UXState {
  isLoading: boolean;
  hasError: boolean;
  isOffline: boolean;
  batteryLevel: number;
  networkSpeed: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
}

export class UXPolishService {
  private static instance: UXPolishService;
  private polishRules: UIPolishRule[] = [];
  private animationSettings: AnimationSettings;
  private interactionSettings: InteractionSettings;
  private visualSettings: VisualSettings;
  private uxState: UXState;
  private polishInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.animationSettings = this.getDefaultAnimationSettings();
    this.interactionSettings = this.getDefaultInteractionSettings();
    this.visualSettings = this.getDefaultVisualSettings();
    this.uxState = this.getInitialUXState();

    this.initializePolishRules();
    this.loadUserPreferences();
    this.setupEventListeners();
    this.startPolishLoop();
  }

  static getInstance(): UXPolishService {
    if (!this.instance) {
      this.instance = new UXPolishService();
    }
    return this.instance;
  }

  /**
   * Initialize polish rules
   */
  private initializePolishRules() {
    this.polishRules = [
      {
        id: 'loading-optimization',
        name: 'Loading State Optimization',
        description: 'Show appropriate loading indicators based on context',
        condition: () => this.uxState.isLoading,
        apply: () => this.optimizeLoadingStates(),
        priority: 'high',
      },
      {
        id: 'offline-experience',
        name: 'Offline Experience',
        description: 'Enhance offline user experience',
        condition: () => this.uxState.isOffline,
        apply: () => this.optimizeOfflineExperience(),
        priority: 'high',
      },
      {
        id: 'battery-aware-ui',
        name: 'Battery-Aware UI',
        description: 'Adapt UI based on battery level',
        condition: () => this.uxState.batteryLevel < 20,
        apply: () => this.adaptToBatteryLevel(),
        priority: 'medium',
      },
      {
        id: 'network-aware-ui',
        name: 'Network-Aware UI',
        description: 'Adapt UI based on network speed',
        condition: () => ['2g', 'slow-2g'].includes(this.uxState.networkSpeed),
        apply: () => this.adaptToNetworkSpeed(),
        priority: 'medium',
      },
      {
        id: 'orientation-optimization',
        name: 'Orientation Optimization',
        description: 'Optimize layout for device orientation',
        condition: () => true,
        apply: () => this.optimizeForOrientation(),
        priority: 'medium',
      },
      {
        id: 'gesture-enhancement',
        name: 'Gesture Enhancement',
        description: 'Add intuitive gesture support',
        condition: () =>
          this.interactionSettings.gestureSupport &&
          this.uxState.deviceType === 'mobile',
        apply: () => this.enhanceGestureSupport(),
        priority: 'low',
      },
      {
        id: 'micro-interactions',
        name: 'Micro-Interactions',
        description: 'Add delightful micro-interactions',
        condition: () =>
          this.animationSettings.enabled &&
          !this.animationSettings.reduceMotion,
        apply: () => this.addMicroInteractions(),
        priority: 'low',
      },
      {
        id: 'accessibility-enhancement',
        name: 'Accessibility Enhancement',
        description: 'Dynamic accessibility improvements',
        condition: () => true,
        apply: () => this.enhanceAccessibility(),
        priority: 'high',
      },
    ];
  }

  /**
   * Load user preferences
   */
  private loadUserPreferences() {
    const savedPrefs = localStorage.getItem('ux_preferences');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      this.animationSettings = {
        ...this.animationSettings,
        ...prefs.animations,
      };
      this.interactionSettings = {
        ...this.interactionSettings,
        ...prefs.interactions,
      };
      this.visualSettings = { ...this.visualSettings, ...prefs.visual };
    }

    // Apply system preferences
    this.applySystemPreferences();
  }

  /**
   * Apply system preferences
   */
  private applySystemPreferences() {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    this.animationSettings.reduceMotion = prefersReducedMotion.matches;

    // Respect prefers-color-scheme
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (this.visualSettings.theme === 'auto') {
      document.documentElement.setAttribute(
        'data-theme',
        prefersDarkScheme.matches ? 'dark' : 'light',
      );
    }

    // Respect prefers-contrast
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    if (prefersHighContrast.matches) {
      this.visualSettings.colorContrast = 'high';
      document.documentElement.classList.add('high-contrast');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    // Orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.uxState.orientation =
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        this.applyPolishRule('orientation-optimization');
      }, 100);
    });

    // Network changes
    window.addEventListener('online', () => {
      this.uxState.isOffline = false;
      this.removePolishRule('offline-experience');
    });

    window.addEventListener('offline', () => {
      this.uxState.isOffline = true;
      this.applyPolishRule('offline-experience');
    });

    // Battery updates
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener('levelchange', () => {
          this.uxState.batteryLevel = battery.level * 100;
          if (battery.level < 0.2) {
            this.applyPolishRule('battery-aware-ui');
          }
        });
      });
    }

    // Connection updates
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.uxState.networkSpeed = connection.effectiveType;
        if (['2g', 'slow-2g'].includes(connection.effectiveType)) {
          this.applyPolishRule('network-aware-ui');
        }
      });
    }

    // User preference changes
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', (e) => {
        this.animationSettings.reduceMotion = e.matches;
        this.updateAnimationSettings();
      });

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (this.visualSettings.theme === 'auto') {
          document.documentElement.setAttribute(
            'data-theme',
            e.matches ? 'dark' : 'light',
          );
        }
      });
  }

  /**
   * Start polish loop
   */
  private startPolishLoop() {
    this.polishInterval = setInterval(() => {
      this.applyPolishRules();
    }, 5000); // Every 5 seconds
  }

  /**
   * Apply all applicable polish rules
   */
  applyPolishRules() {
    const applicableRules = this.polishRules
      .filter((rule) => rule.condition())
      .sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[b.priority] - priorities[a.priority];
      });

    applicableRules.forEach((rule) => {
      rule.apply();
    });
  }

  /**
   * Apply specific polish rule
   */
  applyPolishRule(ruleId: string) {
    const rule = this.polishRules.find((r) => r.id === ruleId);
    if (rule && rule.condition()) {
      rule.apply();
    }
  }

  /**
   * Remove specific polish rule effects
   */
  removePolishRule(ruleId: string) {
    // Implementation would depend on specific rule
    switch (ruleId) {
      case 'offline-experience':
        document.body.classList.remove('offline-mode');
        break;
      case 'battery-aware-ui':
        document.body.classList.remove('battery-saver-ui');
        break;
    }
  }

  /**
   * Optimize loading states
   */
  private optimizeLoadingStates() {
    // Smart loading indicators
    const loadingElements = document.querySelectorAll('.loading');

    loadingElements.forEach((element) => {
      // Add skeleton loading for better perceived performance
      if (!element.querySelector('.skeleton')) {
        this.addSkeletonLoader(element as HTMLElement);
      }

      // Progressive loading hints
      this.addProgressiveLoadingHints(element as HTMLElement);
    });

    // Optimize for slow networks
    if (['2g', 'slow-2g'].includes(this.uxState.networkSpeed)) {
      this.enableProgressiveLoading();
    }
  }

  /**
   * Optimize offline experience
   */
  private optimizeOfflineExperience() {
    document.body.classList.add('offline-mode');

    // Show offline banner
    this.showOfflineBanner();

    // Enable offline features
    this.enableOfflineFeatures();

    // Queue actions for when online
    this.enableOfflineActionQueuing();
  }

  /**
   * Adapt to battery level
   */
  private adaptToBatteryLevel() {
    document.body.classList.add('battery-saver-ui');

    // Reduce animations
    if (this.uxState.batteryLevel < 10) {
      this.animationSettings.enabled = false;
      this.updateAnimationSettings();
    }

    // Reduce visual effects
    this.reduceBatteryIntensiveEffects();

    // Show battery warning
    if (this.uxState.batteryLevel < 5) {
      this.showBatteryWarning();
    }
  }

  /**
   * Adapt to network speed
   */
  private adaptToNetworkSpeed() {
    document.body.classList.add('slow-network');

    // Reduce image quality
    this.reduceImageQuality();

    // Lazy load more aggressively
    this.enableAggressiveLazyLoading();

    // Show network indicator
    this.showNetworkSpeedIndicator();
  }

  /**
   * Optimize for orientation
   */
  private optimizeForOrientation() {
    const isLandscape = this.uxState.orientation === 'landscape';

    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);

    // Adjust layouts
    if (isLandscape && this.uxState.deviceType === 'mobile') {
      this.enableLandscapeOptimizations();
    } else {
      this.enablePortraitOptimizations();
    }
  }

  /**
   * Enhance gesture support
   */
  private enhanceGestureSupport() {
    // Add swipe gestures to messages
    this.addSwipeGestures();

    // Add pull-to-refresh
    this.addPullToRefresh();

    // Add pinch-to-zoom for images
    this.addPinchToZoom();

    // Add haptic feedback
    if (this.interactionSettings.hapticFeedback) {
      this.enableHapticFeedback();
    }
  }

  /**
   * Add micro-interactions
   */
  private addMicroInteractions() {
    // Button press animations
    this.addButtonPressAnimations();

    // Message send animations
    this.addMessageSendAnimations();

    // Notification animations
    this.addNotificationAnimations();

    // Transition animations
    this.addPageTransitionAnimations();
  }

  /**
   * Enhance accessibility
   */
  private enhanceAccessibility() {
    // Dynamic focus management
    this.improveFocusManagement();

    // Screen reader optimizations
    this.optimizeForScreenReaders();

    // High contrast mode
    if (this.visualSettings.colorContrast === 'high') {
      this.enableHighContrastMode();
    }

    // Large text support
    if (
      this.visualSettings.fontSize === 'large' ||
      this.visualSettings.fontSize === 'extra-large'
    ) {
      this.optimizeForLargeText();
    }
  }

  /**
   * Helper methods for UI polish implementations
   */
  private addSkeletonLoader(element: HTMLElement) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton animate-pulse bg-gray-200 rounded';
    skeleton.style.width = '100%';
    skeleton.style.height = '20px';
    element.appendChild(skeleton);
  }

  private addProgressiveLoadingHints(element: HTMLElement) {
    const hint = document.createElement('div');
    hint.className = 'loading-hint text-sm text-gray-500';
    hint.textContent = 'Loading messages...';
    element.appendChild(hint);
  }

  private enableProgressiveLoading() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      const element = img as HTMLImageElement;
      element.loading = 'lazy';
    });
  }

  private showOfflineBanner() {
    if (document.querySelector('.offline-banner')) return;

    const banner = document.createElement('div');
    banner.className =
      'offline-banner bg-yellow-100 border-yellow-500 text-yellow-700 px-4 py-2 fixed top-0 left-0 right-0 z-50';
    banner.innerHTML = `
      <div class="flex items-center justify-between">
        <span>You're offline. Some features may be limited.</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-yellow-700 hover:text-yellow-900">×</button>
      </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }

  private enableOfflineFeatures() {
    // Enable offline message drafts
    const messageInputs = document.querySelectorAll('textarea[data-message]');
    messageInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLTextAreaElement;
        localStorage.setItem('offline_draft', target.value);
      });
    });
  }

  private enableOfflineActionQueuing() {
    // Queue send actions for when online
    (window as any).offlineActionQueue =
      (window as any).offlineActionQueue || [];
  }

  private reduceBatteryIntensiveEffects() {
    // Remove expensive CSS effects
    document.body.classList.add('reduce-effects');

    const style = document.createElement('style');
    style.textContent = `
      .reduce-effects * {
        box-shadow: none !important;
        text-shadow: none !important;
        background-image: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  private showBatteryWarning() {
    if (document.querySelector('.battery-warning')) return;

    const warning = document.createElement('div');
    warning.className =
      'battery-warning bg-red-100 border-red-500 text-red-700 px-4 py-2 rounded m-4';
    warning.textContent =
      'Critical battery level. Some features have been disabled to save power.';
    document.body.insertBefore(warning, document.body.firstChild);
  }

  private reduceImageQuality() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      const element = img as HTMLImageElement;
      if (element.dataset.src) {
        element.dataset.src += '?quality=60&format=webp';
      }
    });
  }

  private enableAggressiveLazyLoading() {
    const options = {
      rootMargin: '50px 0px',
      threshold: 0.1,
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              observer.unobserve(img);
            }
          }
        });
      }, options);

      document.querySelectorAll('img[data-src]').forEach((img) => {
        observer.observe(img);
      });
    }
  }

  private showNetworkSpeedIndicator() {
    const indicator = document.createElement('div');
    indicator.className =
      'network-indicator text-xs text-gray-500 fixed bottom-4 right-4';
    indicator.textContent = `Network: ${this.uxState.networkSpeed.toUpperCase()}`;
    document.body.appendChild(indicator);
  }

  private enableLandscapeOptimizations() {
    // Optimize layouts for landscape
    const containers = document.querySelectorAll('.message-container');
    containers.forEach((container) => {
      container.classList.add('landscape-layout');
    });
  }

  private enablePortraitOptimizations() {
    // Optimize layouts for portrait
    const containers = document.querySelectorAll('.message-container');
    containers.forEach((container) => {
      container.classList.remove('landscape-layout');
    });
  }

  private addSwipeGestures() {
    let startX: number;
    let startY: number;

    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    });

    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Swipe right to go back
      if (deltaX > 50 && Math.abs(deltaY) < 50) {
        this.handleSwipeRight();
      }
    });
  }

  private addPullToRefresh() {
    let startY: number;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startY = touch.clientY;
    });

    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;

      if (deltaY > 50 && window.scrollY === 0) {
        isPulling = true;
        this.showPullToRefreshIndicator();
      }
    });

    document.addEventListener('touchend', () => {
      if (isPulling) {
        this.handlePullToRefresh();
        isPulling = false;
      }
    });
  }

  private addPinchToZoom() {
    // Implement pinch-to-zoom for images
    let initialDistance = 0;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;
        // Apply zoom
      }
    });
  }

  private enableHapticFeedback() {
    if ('vibrate' in navigator) {
      // Light haptic feedback for button taps
      document.addEventListener('click', (e) => {
        if ((e.target as Element)?.matches('button, .button')) {
          navigator.vibrate(10);
        }
      });
    }
  }

  private addButtonPressAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      .button, button {
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .button:active, button:active {
        transform: scale(0.98);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  private addMessageSendAnimations() {
    // Add send animation to messages
    document.addEventListener('message-sent', (e) => {
      const messageElement = (e as CustomEvent).detail.element;
      messageElement.classList.add('message-sent-animation');
    });
  }

  private addNotificationAnimations() {
    // Smooth notification slide-in
    const style = document.createElement('style');
    style.textContent = `
      .notification {
        animation: slideInFromTop 0.3s ease-out;
      }
      @keyframes slideInFromTop {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  private addPageTransitionAnimations() {
    // Smooth page transitions
    if (!this.animationSettings.reduceMotion) {
      const style = document.createElement('style');
      style.textContent = `
        .page-transition {
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .page-transition.entering {
          transform: translateX(100%);
          opacity: 0;
        }
        .page-transition.entered {
          transform: translateX(0);
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private improveFocusManagement() {
    // Skip links for keyboard navigation
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.className = 'skip-link sr-only focus:not-sr-only';
      skipLink.href = '#main-content';
      skipLink.textContent = 'Skip to main content';
      document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Focus trap for modals
    this.setupFocusTraps();
  }

  private optimizeForScreenReaders() {
    // Add live regions for dynamic content
    if (!document.querySelector('#live-region')) {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    // Enhance ARIA labels
    this.enhanceAriaLabels();
  }

  private enableHighContrastMode() {
    document.documentElement.classList.add('high-contrast');

    const style = document.createElement('style');
    style.textContent = `
      .high-contrast {
        filter: contrast(150%);
      }
      .high-contrast button, .high-contrast input {
        border: 2px solid currentColor;
      }
    `;
    document.head.appendChild(style);
  }

  private optimizeForLargeText() {
    const scale = this.visualSettings.fontSize === 'extra-large' ? 1.4 : 1.2;
    document.documentElement.style.fontSize = `${scale}rem`;

    // Adjust layouts for large text
    document.body.classList.add('large-text');
  }

  /**
   * Helper methods
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private handleSwipeRight() {
    // Navigate back if possible
    if (window.history.length > 1) {
      window.history.back();
    }
  }

  private showPullToRefreshIndicator() {
    if (!document.querySelector('.pull-refresh-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'pull-refresh-indicator text-center py-2';
      indicator.innerHTML = '↓ Pull to refresh';
      document.body.insertBefore(indicator, document.body.firstChild);
    }
  }

  private handlePullToRefresh() {
    // Refresh messages
    window.dispatchEvent(new CustomEvent('pull-to-refresh'));

    // Remove indicator
    const indicator = document.querySelector('.pull-refresh-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  private setupFocusTraps() {
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach((modal) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length > 0) {
        const firstFocusable = focusableElements[0] as HTMLElement;
        const lastFocusable = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        modal.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable.focus();
            } else if (
              !e.shiftKey &&
              document.activeElement === lastFocusable
            ) {
              e.preventDefault();
              firstFocusable.focus();
            }
          }
        });
      }
    });
  }

  private enhanceAriaLabels() {
    // Add missing aria-labels
    document.querySelectorAll('button:not([aria-label])').forEach((button) => {
      if (!button.textContent?.trim()) {
        const icon = button.querySelector('svg, i');
        if (icon) {
          button.setAttribute('aria-label', 'Button');
        }
      }
    });
  }

  private updateAnimationSettings() {
    if (
      this.animationSettings.reduceMotion ||
      !this.animationSettings.enabled
    ) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    // Update CSS custom properties
    document.documentElement.style.setProperty(
      '--animation-duration',
      this.animationSettings.enabled
        ? `${this.animationSettings.duration}ms`
        : '0ms',
    );
  }

  /**
   * Default settings
   */
  private getDefaultAnimationSettings(): AnimationSettings {
    return {
      reduceMotion: false,
      duration: 300,
      easing: 'ease-in-out',
      enabled: true,
    };
  }

  private getDefaultInteractionSettings(): InteractionSettings {
    return {
      touchFeedback: true,
      hapticFeedback: 'vibrate' in navigator,
      soundFeedback: false,
      gestureSupport: 'ontouchstart' in window,
    };
  }

  private getDefaultVisualSettings(): VisualSettings {
    return {
      theme: 'auto',
      fontSize: 'medium',
      colorContrast: 'normal',
      densityLevel: 'comfortable',
    };
  }

  private getInitialUXState(): UXState {
    return {
      isLoading: false,
      hasError: false,
      isOffline: !navigator.onLine,
      batteryLevel: 100,
      networkSpeed: 'unknown',
      deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop',
      orientation:
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    };
  }

  /**
   * Public API methods
   */
  updateUXState(updates: Partial<UXState>) {
    this.uxState = { ...this.uxState, ...updates };
    this.applyPolishRules();
  }

  setAnimationSettings(settings: Partial<AnimationSettings>) {
    this.animationSettings = { ...this.animationSettings, ...settings };
    this.updateAnimationSettings();
    this.saveUserPreferences();
  }

  setInteractionSettings(settings: Partial<InteractionSettings>) {
    this.interactionSettings = { ...this.interactionSettings, ...settings };
    this.saveUserPreferences();
  }

  setVisualSettings(settings: Partial<VisualSettings>) {
    this.visualSettings = { ...this.visualSettings, ...settings };
    this.applyVisualSettings();
    this.saveUserPreferences();
  }

  private applyVisualSettings() {
    // Apply theme
    if (this.visualSettings.theme !== 'auto') {
      document.documentElement.setAttribute(
        'data-theme',
        this.visualSettings.theme,
      );
    }

    // Apply font size
    const fontSizes = {
      small: 0.875,
      medium: 1,
      large: 1.125,
      'extra-large': 1.25,
    };
    document.documentElement.style.fontSize = `${fontSizes[this.visualSettings.fontSize]}rem`;

    // Apply density
    document.body.className = document.body.className.replace(
      /density-\w+/g,
      '',
    );
    document.body.classList.add(`density-${this.visualSettings.densityLevel}`);
  }

  private saveUserPreferences() {
    const prefs = {
      animations: this.animationSettings,
      interactions: this.interactionSettings,
      visual: this.visualSettings,
    };
    localStorage.setItem('ux_preferences', JSON.stringify(prefs));
  }

  /**
   * Get current UX status
   */
  getUXStatus(): {
    polishRulesActive: number;
    animationSettings: AnimationSettings;
    interactionSettings: InteractionSettings;
    visualSettings: VisualSettings;
    uxState: UXState;
  } {
    const activeRules = this.polishRules.filter((rule) =>
      rule.condition(),
    ).length;

    return {
      polishRulesActive: activeRules,
      animationSettings: this.animationSettings,
      interactionSettings: this.interactionSettings,
      visualSettings: this.visualSettings,
      uxState: this.uxState,
    };
  }

  /**
   * Cleanup on service destruction
   */
  cleanup() {
    if (this.polishInterval) {
      clearInterval(this.polishInterval);
    }
  }
}

// Export singleton instance
export const uxPolish = UXPolishService.getInstance();
