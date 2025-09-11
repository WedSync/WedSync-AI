/**
 * WS-189: Comprehensive device capability detection
 * Handles touch capability detection with feature support validation and mapping,
 * screen size optimization with responsive scaling, and accessibility feature detection
 */

export interface TouchCapabilities {
  supportsTouch: boolean;
  maxTouchPoints: number;
  supportsPressure: boolean;
  supportsHover: boolean;
  touchPrecision: 'coarse' | 'fine';
}

export interface ScreenCapabilities {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  colorDepth: number;
  refreshRate?: number;
  supportsHighContrast: boolean;
}

export interface PerformanceCapabilities {
  deviceMemory?: number;
  hardwareConcurrency: number;
  connectionType?: string;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  batteryLevel?: number;
  isCharging?: boolean;
  cpuClass?: string;
}

export interface AccessibilityCapabilities {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeText: boolean;
  supportsScreenReader: boolean;
  supportsVoiceControl: boolean;
  prefersColorScheme: 'light' | 'dark' | 'no-preference';
}

export interface PlatformCapabilities {
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'unknown';
  browserVersion: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsPWA: boolean;
}

export interface DeviceCapabilities {
  touch: TouchCapabilities;
  screen: ScreenCapabilities;
  performance: PerformanceCapabilities;
  accessibility: AccessibilityCapabilities;
  platform: PlatformCapabilities;
  lastUpdated: Date;
  confidence: number; // 0-1, how confident we are in the detection
}

/**
 * Comprehensive device capability detector with caching and progressive enhancement
 */
export class DeviceDetector {
  private static instance: DeviceDetector;
  private capabilities: DeviceCapabilities | null = null;
  private detectionPromise: Promise<DeviceCapabilities> | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  private listeners: Array<(capabilities: DeviceCapabilities) => void> = [];

  constructor() {
    // Bind methods to preserve context
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * Get device capabilities with caching
   */
  async getCapabilities(): Promise<DeviceCapabilities> {
    // Return cached capabilities if still valid
    if (this.capabilities && this.isCacheValid()) {
      return this.capabilities;
    }

    // Return existing detection promise if in progress
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    // Start new detection
    this.detectionPromise = this.performDetection();
    this.capabilities = await this.detectionPromise;
    this.detectionPromise = null;

    // Notify listeners
    this.notifyListeners(this.capabilities);

    return this.capabilities;
  }

  /**
   * Check if cached capabilities are still valid
   */
  private isCacheValid(): boolean {
    if (!this.capabilities) return false;
    const now = Date.now();
    const lastUpdated = this.capabilities.lastUpdated.getTime();
    return now - lastUpdated < this.cacheExpiry;
  }

  /**
   * Perform comprehensive device capability detection
   */
  private async performDetection(): Promise<DeviceCapabilities> {
    const startTime = performance.now();

    try {
      const [touch, screen, performance, accessibility, platform] =
        await Promise.all([
          this.detectTouchCapabilities(),
          this.detectScreenCapabilities(),
          this.detectPerformanceCapabilities(),
          this.detectAccessibilityCapabilities(),
          this.detectPlatformCapabilities(),
        ]);

      const detectionTime = performance.now() - startTime;
      const confidence = this.calculateConfidence(
        touch,
        screen,
        performance,
        accessibility,
        platform,
      );

      const capabilities: DeviceCapabilities = {
        touch,
        screen,
        performance,
        accessibility,
        platform,
        lastUpdated: new Date(),
        confidence,
      };

      // Log detection for performance monitoring
      this.logDetection(capabilities, detectionTime);

      return capabilities;
    } catch (error) {
      console.warn('Device detection failed, using fallback:', error);
      return this.getFallbackCapabilities();
    }
  }

  /**
   * Detect touch capabilities with comprehensive feature detection
   */
  private async detectTouchCapabilities(): Promise<TouchCapabilities> {
    const capabilities: TouchCapabilities = {
      supportsTouch: false,
      maxTouchPoints: 0,
      supportsPressure: false,
      supportsHover: false,
      touchPrecision: 'coarse',
    };

    try {
      // Basic touch support detection
      capabilities.supportsTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        ('DocumentTouch' in window &&
          document instanceof (window as any).DocumentTouch);

      // Maximum touch points
      capabilities.maxTouchPoints = navigator.maxTouchPoints || 0;

      // Pressure sensitivity detection (Safari/WebKit)
      capabilities.supportsPressure =
        'force' in TouchEvent.prototype ||
        'webkitForce' in TouchEvent.prototype;

      // Hover support detection
      capabilities.supportsHover = window.matchMedia('(hover: hover)').matches;

      // Touch precision detection
      capabilities.touchPrecision = window.matchMedia('(pointer: coarse)')
        .matches
        ? 'coarse'
        : 'fine';

      // Additional mobile-specific touch detection
      if (!capabilities.supportsTouch) {
        // Fallback detection methods
        const testElement = document.createElement('div');
        testElement.setAttribute('ontouchstart', 'return;');
        if (typeof testElement.ontouchstart === 'function') {
          capabilities.supportsTouch = true;
        }
      }
    } catch (error) {
      console.warn('Touch capability detection failed:', error);
      // Minimal fallback
      capabilities.supportsTouch = 'ontouchstart' in window;
      capabilities.touchPrecision = 'coarse';
    }

    return capabilities;
  }

  /**
   * Detect screen capabilities and display properties
   */
  private async detectScreenCapabilities(): Promise<ScreenCapabilities> {
    const capabilities: ScreenCapabilities = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation:
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      colorDepth: screen.colorDepth || 24,
      supportsHighContrast: false,
    };

    try {
      // Screen orientation API
      if (screen.orientation) {
        capabilities.orientation =
          screen.orientation.angle === 0 || screen.orientation.angle === 180
            ? 'portrait'
            : 'landscape';
      }

      // Refresh rate detection (experimental)
      if ('getDisplayMedia' in navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 120 } },
          });
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          if (settings.frameRate) {
            capabilities.refreshRate = settings.frameRate;
          }
          track.stop();
        } catch {
          // Display capture not available or permission denied
        }
      }

      // High contrast support detection
      capabilities.supportsHighContrast =
        window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches ||
        window.matchMedia('(-webkit-high-contrast: active)').matches;

      // Additional display properties
      if (screen.availWidth && screen.availHeight) {
        capabilities.width = Math.max(capabilities.width, screen.availWidth);
        capabilities.height = Math.max(capabilities.height, screen.availHeight);
      }
    } catch (error) {
      console.warn('Screen capability detection failed:', error);
    }

    return capabilities;
  }

  /**
   * Detect device performance capabilities
   */
  private async detectPerformanceCapabilities(): Promise<PerformanceCapabilities> {
    const capabilities: PerformanceCapabilities = {
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
    };

    try {
      // Device memory (Chrome/Edge)
      if ('deviceMemory' in navigator) {
        capabilities.deviceMemory = (navigator as any).deviceMemory;
      }

      // Network connection information
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (connection) {
        capabilities.connectionType = connection.type;
        capabilities.effectiveType = connection.effectiveType;
      }

      // Battery status
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          capabilities.batteryLevel = battery.level;
          capabilities.isCharging = battery.charging;
        } catch (batteryError) {
          console.warn('Battery API access failed:', batteryError);
        }
      }

      // CPU class (legacy IE, but might be useful for fallback detection)
      if ('cpuClass' in navigator) {
        capabilities.cpuClass = (navigator as any).cpuClass;
      }
    } catch (error) {
      console.warn('Performance capability detection failed:', error);
    }

    return capabilities;
  }

  /**
   * Detect accessibility preferences and capabilities
   */
  private async detectAccessibilityCapabilities(): Promise<AccessibilityCapabilities> {
    const capabilities: AccessibilityCapabilities = {
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      supportsScreenReader: false,
      supportsVoiceControl: false,
      prefersColorScheme: 'no-preference',
    };

    try {
      // Reduced motion preference
      capabilities.prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      // High contrast preference
      capabilities.prefersHighContrast = window.matchMedia(
        '(prefers-contrast: high)',
      ).matches;

      // Large text preference (not widely supported yet)
      capabilities.prefersLargeText = window.matchMedia(
        '(prefers-large-text: yes)',
      ).matches;

      // Color scheme preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        capabilities.prefersColorScheme = 'dark';
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        capabilities.prefersColorScheme = 'light';
      }

      // Screen reader detection (heuristic)
      capabilities.supportsScreenReader =
        'speechSynthesis' in window ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver');

      // Voice control detection (heuristic)
      capabilities.supportsVoiceControl =
        'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    } catch (error) {
      console.warn('Accessibility capability detection failed:', error);
    }

    return capabilities;
  }

  /**
   * Detect platform and browser capabilities
   */
  private async detectPlatformCapabilities(): Promise<PlatformCapabilities> {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || 'unknown';

    const capabilities: PlatformCapabilities = {
      platform: 'unknown',
      browser: 'unknown',
      browserVersion: '',
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      supportsPWA: false,
    };

    try {
      // Platform detection
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        capabilities.platform = 'ios';
        capabilities.isMobile = /iPhone|iPod/.test(userAgent);
        capabilities.isTablet = /iPad/.test(userAgent);
      } else if (/Android/.test(userAgent)) {
        capabilities.platform = 'android';
        capabilities.isMobile = /Mobile/.test(userAgent);
        capabilities.isTablet = !capabilities.isMobile;
      } else if (/Win/.test(platform)) {
        capabilities.platform = 'windows';
        capabilities.isDesktop = true;
      } else if (/Mac/.test(platform)) {
        capabilities.platform = 'macos';
        capabilities.isDesktop = true;
      } else if (/Linux/.test(platform)) {
        capabilities.platform = 'linux';
        capabilities.isDesktop = true;
      }

      // Browser detection with version
      if (userAgent.includes('Chrome/')) {
        capabilities.browser = 'chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        capabilities.browserVersion = match ? match[1] : '';
      } else if (
        userAgent.includes('Safari/') &&
        !userAgent.includes('Chrome')
      ) {
        capabilities.browser = 'safari';
        const match = userAgent.match(/Version\/(\d+)/);
        capabilities.browserVersion = match ? match[1] : '';
      } else if (userAgent.includes('Firefox/')) {
        capabilities.browser = 'firefox';
        const match = userAgent.match(/Firefox\/(\d+)/);
        capabilities.browserVersion = match ? match[1] : '';
      } else if (userAgent.includes('Edge/') || userAgent.includes('Edg/')) {
        capabilities.browser = 'edge';
        const match = userAgent.match(/(?:Edge|Edg)\/(\d+)/);
        capabilities.browserVersion = match ? match[1] : '';
      } else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) {
        capabilities.browser = 'opera';
        const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
        capabilities.browserVersion = match ? match[1] : '';
      }

      // PWA support detection
      capabilities.supportsPWA =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        'fetch' in window &&
        'caches' in window;

      // Mobile/tablet detection refinement
      if (
        !capabilities.isMobile &&
        !capabilities.isTablet &&
        !capabilities.isDesktop
      ) {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const maxDimension = Math.max(screenWidth, screenHeight);
        const minDimension = Math.min(screenWidth, screenHeight);

        if (maxDimension <= 768) {
          capabilities.isMobile = true;
        } else if (maxDimension <= 1024) {
          capabilities.isTablet = true;
        } else {
          capabilities.isDesktop = true;
        }
      }
    } catch (error) {
      console.warn('Platform capability detection failed:', error);
    }

    return capabilities;
  }

  /**
   * Calculate confidence score based on detection quality
   */
  private calculateConfidence(
    touch: TouchCapabilities,
    screen: ScreenCapabilities,
    performance: PerformanceCapabilities,
    accessibility: AccessibilityCapabilities,
    platform: PlatformCapabilities,
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for known platforms
    if (platform.platform !== 'unknown' && platform.browser !== 'unknown') {
      confidence += 0.2;
    }

    // Higher confidence for definitive touch detection
    if (touch.supportsTouch && touch.maxTouchPoints > 0) {
      confidence += 0.1;
    }

    // Higher confidence for complete performance data
    if (performance.deviceMemory && performance.connectionType) {
      confidence += 0.1;
    }

    // Higher confidence for accessibility data
    if (accessibility.prefersReducedMotion !== undefined) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Get fallback capabilities for when detection fails
   */
  private getFallbackCapabilities(): DeviceCapabilities {
    return {
      touch: {
        supportsTouch: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        supportsPressure: false,
        supportsHover: false,
        touchPrecision: 'coarse',
      },
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation:
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        colorDepth: screen.colorDepth || 24,
        supportsHighContrast: false,
      },
      performance: {
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
      },
      accessibility: {
        prefersReducedMotion: false,
        prefersHighContrast: false,
        prefersLargeText: false,
        supportsScreenReader: false,
        supportsVoiceControl: false,
        prefersColorScheme: 'no-preference',
      },
      platform: {
        platform: 'unknown',
        browser: 'unknown',
        browserVersion: '',
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        isTablet: false,
        isDesktop: true,
        supportsPWA: 'serviceWorker' in navigator,
      },
      lastUpdated: new Date(),
      confidence: 0.3,
    };
  }

  /**
   * Log detection results for monitoring and optimization
   */
  private logDetection(
    capabilities: DeviceCapabilities,
    detectionTime: number,
  ): void {
    if (typeof window !== 'undefined' && (window as any).weddingAnalytics) {
      (window as any).weddingAnalytics.track('device_detection_completed', {
        platform: capabilities.platform.platform,
        browser: capabilities.platform.browser,
        supports_touch: capabilities.touch.supportsTouch,
        max_touch_points: capabilities.touch.maxTouchPoints,
        is_mobile: capabilities.platform.isMobile,
        confidence: capabilities.confidence,
        detection_time: Math.round(detectionTime),
        has_accessibility_preferences:
          capabilities.accessibility.prefersReducedMotion ||
          capabilities.accessibility.prefersHighContrast ||
          capabilities.accessibility.prefersLargeText,
      });
    }
  }

  /**
   * Add listener for capability changes
   */
  addListener(callback: (capabilities: DeviceCapabilities) => void): void {
    this.listeners.push(callback);

    // Set up event listeners for capability changes on first listener
    if (this.listeners.length === 1) {
      this.setupChangeListeners();
    }
  }

  /**
   * Remove listener
   */
  removeListener(callback: (capabilities: DeviceCapabilities) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }

    // Clean up event listeners if no more listeners
    if (this.listeners.length === 0) {
      this.cleanupChangeListeners();
    }
  }

  /**
   * Set up listeners for capability changes
   */
  private setupChangeListeners(): void {
    // Orientation change
    window.addEventListener('orientationchange', this.handleOrientationChange);
    window.addEventListener('resize', this.handleOrientationChange);

    // Visibility change (for battery updates)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Media query listeners for accessibility changes
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    reducedMotionQuery.addEventListener('change', this.handleOrientationChange);

    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', this.handleOrientationChange);

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', this.handleOrientationChange);
  }

  /**
   * Clean up event listeners
   */
  private cleanupChangeListeners(): void {
    window.removeEventListener(
      'orientationchange',
      this.handleOrientationChange,
    );
    window.removeEventListener('resize', this.handleOrientationChange);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
  }

  /**
   * Handle orientation/capability changes
   */
  private handleOrientationChange(): void {
    // Debounce rapid changes
    setTimeout(() => {
      this.capabilities = null; // Force re-detection
      this.getCapabilities().then((capabilities) => {
        this.notifyListeners(capabilities);
      });
    }, 100);
  }

  /**
   * Handle visibility change (update battery status)
   */
  private handleVisibilityChange(): void {
    if (!document.hidden && this.capabilities) {
      // Update battery status when page becomes visible
      this.updateBatteryStatus();
    }
  }

  /**
   * Update battery status
   */
  private async updateBatteryStatus(): Promise<void> {
    if (!this.capabilities || !('getBattery' in navigator)) return;

    try {
      const battery = await (navigator as any).getBattery();
      this.capabilities.performance.batteryLevel = battery.level;
      this.capabilities.performance.isCharging = battery.charging;
      this.notifyListeners(this.capabilities);
    } catch (error) {
      console.warn('Battery status update failed:', error);
    }
  }

  /**
   * Notify all listeners of capability changes
   */
  private notifyListeners(capabilities: DeviceCapabilities): void {
    this.listeners.forEach((callback) => {
      try {
        callback(capabilities);
      } catch (error) {
        console.error('Device capability listener error:', error);
      }
    });
  }

  /**
   * Force refresh of capabilities
   */
  async refresh(): Promise<DeviceCapabilities> {
    this.capabilities = null;
    return this.getCapabilities();
  }

  /**
   * Get current capabilities synchronously (may be null if not yet detected)
   */
  getCurrentCapabilities(): DeviceCapabilities | null {
    return this.capabilities && this.isCacheValid() ? this.capabilities : null;
  }

  /**
   * Wedding-specific device optimization helpers
   */

  /**
   * Check if device is suitable for wedding photography workflows
   */
  async isPhotographyOptimized(): Promise<boolean> {
    const caps = await this.getCapabilities();
    return caps.touch.supportsTouch &&
      caps.touch.maxTouchPoints >= 2 &&
      caps.screen.width >= 768 &&
      caps.performance.deviceMemory
      ? caps.performance.deviceMemory >= 2
      : true;
  }

  /**
   * Check if device needs accessibility enhancements
   */
  async needsAccessibilityEnhancements(): Promise<boolean> {
    const caps = await this.getCapabilities();
    return (
      caps.accessibility.prefersReducedMotion ||
      caps.accessibility.prefersHighContrast ||
      caps.accessibility.prefersLargeText ||
      caps.accessibility.supportsScreenReader
    );
  }

  /**
   * Get recommended touch target size for this device
   */
  async getRecommendedTouchSize(): Promise<number> {
    const caps = await this.getCapabilities();

    let baseSize = 44; // iOS standard

    if (caps.platform.platform === 'android') {
      baseSize = 48; // Material Design standard
    }

    if (caps.accessibility.prefersLargeText) {
      baseSize *= 1.25;
    }

    if (caps.touch.touchPrecision === 'coarse') {
      baseSize *= 1.1;
    }

    return Math.round(baseSize);
  }
}

// Export singleton instance
export const deviceDetector = DeviceDetector.getInstance();
