/**
 * Device Compatibility Testing Service
 * WS-155: Guest Communications - Round 3
 * Tests messaging features across all supported mobile devices
 */

interface DeviceProfile {
  name: string;
  type: 'ios' | 'android' | 'tablet' | 'desktop';
  os: string;
  minVersion: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  features: string[];
  limitations?: string[];
}

interface TestResult {
  device: DeviceProfile;
  feature: string;
  status: 'pass' | 'fail' | 'partial';
  issues?: string[];
  performance?: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  };
}

export class DeviceCompatibilityTester {
  private static instance: DeviceCompatibilityTester;
  private supportedDevices: DeviceProfile[] = [];
  private testResults: TestResult[] = [];
  private currentDevice: DeviceProfile | null = null;

  private constructor() {
    this.initializeSupportedDevices();
    this.detectCurrentDevice();
  }

  static getInstance(): DeviceCompatibilityTester {
    if (!this.instance) {
      this.instance = new DeviceCompatibilityTester();
    }
    return this.instance;
  }

  private initializeSupportedDevices() {
    // iOS Devices
    this.supportedDevices.push(
      {
        name: 'iPhone 15 Pro Max',
        type: 'ios',
        os: 'iOS',
        minVersion: '17.0',
        screenSize: { width: 430, height: 932 },
        pixelRatio: 3,
        features: ['push', 'camera', 'biometric', 'haptic', 'nfc'],
      },
      {
        name: 'iPhone 15',
        type: 'ios',
        os: 'iOS',
        minVersion: '17.0',
        screenSize: { width: 393, height: 852 },
        pixelRatio: 3,
        features: ['push', 'camera', 'biometric', 'haptic'],
      },
      {
        name: 'iPhone 14',
        type: 'ios',
        os: 'iOS',
        minVersion: '16.0',
        screenSize: { width: 390, height: 844 },
        pixelRatio: 3,
        features: ['push', 'camera', 'biometric', 'haptic'],
      },
      {
        name: 'iPhone SE 3rd Gen',
        type: 'ios',
        os: 'iOS',
        minVersion: '15.0',
        screenSize: { width: 375, height: 667 },
        pixelRatio: 2,
        features: ['push', 'camera', 'biometric'],
        limitations: ['smaller-screen', 'lower-resolution'],
      },
      {
        name: 'iPad Pro 12.9',
        type: 'tablet',
        os: 'iPadOS',
        minVersion: '17.0',
        screenSize: { width: 1024, height: 1366 },
        pixelRatio: 2,
        features: ['push', 'camera', 'biometric', 'pencil', 'multitasking'],
      },
      {
        name: 'iPad Air',
        type: 'tablet',
        os: 'iPadOS',
        minVersion: '16.0',
        screenSize: { width: 820, height: 1180 },
        pixelRatio: 2,
        features: ['push', 'camera', 'biometric', 'multitasking'],
      },
    );

    // Android Devices
    this.supportedDevices.push(
      {
        name: 'Samsung Galaxy S24 Ultra',
        type: 'android',
        os: 'Android',
        minVersion: '14',
        screenSize: { width: 412, height: 915 },
        pixelRatio: 3.5,
        features: ['push', 'camera', 'biometric', 'stylus', 'nfc'],
      },
      {
        name: 'Google Pixel 8 Pro',
        type: 'android',
        os: 'Android',
        minVersion: '14',
        screenSize: { width: 412, height: 892 },
        pixelRatio: 3,
        features: ['push', 'camera', 'biometric', 'nfc'],
      },
      {
        name: 'Samsung Galaxy A54',
        type: 'android',
        os: 'Android',
        minVersion: '13',
        screenSize: { width: 412, height: 915 },
        pixelRatio: 2.625,
        features: ['push', 'camera', 'biometric'],
        limitations: ['mid-range-performance'],
      },
      {
        name: 'OnePlus 11',
        type: 'android',
        os: 'Android',
        minVersion: '13',
        screenSize: { width: 412, height: 915 },
        pixelRatio: 3,
        features: ['push', 'camera', 'biometric', 'fast-charging'],
      },
      {
        name: 'Samsung Galaxy Tab S9',
        type: 'tablet',
        os: 'Android',
        minVersion: '13',
        screenSize: { width: 753, height: 1205 },
        pixelRatio: 2,
        features: ['push', 'camera', 'biometric', 'stylus', 'multitasking'],
      },
    );
  }

  private detectCurrentDevice() {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio;

    // Detect iOS
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      const isTablet = /iPad/.test(userAgent);
      this.currentDevice = {
        name: 'Current iOS Device',
        type: isTablet ? 'tablet' : 'ios',
        os: 'iOS',
        minVersion: this.getIOSVersion(userAgent),
        screenSize: { width: screenWidth, height: screenHeight },
        pixelRatio: pixelRatio,
        features: this.detectFeatures(),
      };
    }
    // Detect Android
    else if (/Android/.test(userAgent)) {
      const isTablet = Math.min(screenWidth, screenHeight) > 600;
      this.currentDevice = {
        name: 'Current Android Device',
        type: isTablet ? 'tablet' : 'android',
        os: 'Android',
        minVersion: this.getAndroidVersion(userAgent),
        screenSize: { width: screenWidth, height: screenHeight },
        pixelRatio: pixelRatio,
        features: this.detectFeatures(),
      };
    }
    // Desktop fallback
    else {
      this.currentDevice = {
        name: 'Desktop Browser',
        type: 'desktop',
        os: 'Desktop',
        minVersion: '1.0',
        screenSize: { width: screenWidth, height: screenHeight },
        pixelRatio: pixelRatio,
        features: this.detectFeatures(),
      };
    }
  }

  /**
   * Test messaging features on current device
   */
  async testMessagingFeatures(): Promise<TestResult[]> {
    if (!this.currentDevice) {
      throw new Error('No device detected');
    }

    const results: TestResult[] = [];

    // Test core messaging
    results.push(
      await this.testFeature('core-messaging', async () => {
        return this.testCoreMessaging();
      }),
    );

    // Test push notifications
    results.push(
      await this.testFeature('push-notifications', async () => {
        return this.testPushNotifications();
      }),
    );

    // Test offline support
    results.push(
      await this.testFeature('offline-support', async () => {
        return this.testOfflineSupport();
      }),
    );

    // Test media handling
    results.push(
      await this.testFeature('media-handling', async () => {
        return this.testMediaHandling();
      }),
    );

    // Test performance
    results.push(
      await this.testFeature('performance', async () => {
        return this.testPerformance();
      }),
    );

    // Test accessibility
    results.push(
      await this.testFeature('accessibility', async () => {
        return this.testAccessibility();
      }),
    );

    // Test touch interactions
    results.push(
      await this.testFeature('touch-interactions', async () => {
        return this.testTouchInteractions();
      }),
    );

    this.testResults = results;
    return results;
  }

  private async testFeature(
    featureName: string,
    testFunc: () => Promise<{
      status: 'pass' | 'fail' | 'partial';
      issues?: string[];
    }>,
  ): Promise<TestResult> {
    const startTime = performance.now();

    try {
      const result = await testFunc();
      const endTime = performance.now();

      return {
        device: this.currentDevice!,
        feature: featureName,
        status: result.status,
        issues: result.issues,
        performance: {
          loadTime: endTime - startTime,
          renderTime: 0,
          memoryUsage: this.getMemoryUsage(),
        },
      };
    } catch (error) {
      return {
        device: this.currentDevice!,
        feature: featureName,
        status: 'fail',
        issues: [
          `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  private async testCoreMessaging(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    // Test message composition
    if (!this.canUseTextarea()) {
      issues.push('Textarea input not supported properly');
    }

    // Test real-time updates
    if (!this.supportsWebSockets()) {
      issues.push('WebSocket support missing for real-time updates');
    }

    // Test local storage
    if (!this.supportsLocalStorage()) {
      issues.push('Local storage not available for message drafts');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testPushNotifications(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    if (!('Notification' in window)) {
      issues.push('Push notifications not supported');
      return { status: 'fail', issues };
    }

    if (Notification.permission === 'denied') {
      issues.push('Push notifications denied by user');
    }

    if (!('serviceWorker' in navigator)) {
      issues.push('Service Worker not supported for background notifications');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 1 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testOfflineSupport(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    if (!('serviceWorker' in navigator)) {
      issues.push('Service Worker not supported');
    }

    if (!('caches' in window)) {
      issues.push('Cache API not supported');
    }

    if (!this.supportsIndexedDB()) {
      issues.push('IndexedDB not supported for offline data');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testMediaHandling(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    // Test image support
    const imageFormats = ['webp', 'avif'];
    for (const format of imageFormats) {
      if (!this.supportsImageFormat(format)) {
        issues.push(`${format.toUpperCase()} image format not supported`);
      }
    }

    // Test file upload
    if (!this.supportsFileUpload()) {
      issues.push('File upload not properly supported');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testPerformance(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    // Test rendering performance
    const fps = await this.measureFrameRate();
    if (fps < 30) {
      issues.push(`Low frame rate detected: ${fps} FPS`);
    }

    // Test memory usage
    const memory = this.getMemoryUsage();
    if (memory > 100) {
      issues.push(`High memory usage: ${memory}MB`);
    }

    // Test network conditions
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType === '2g') {
      issues.push('Poor network conditions detected');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 1 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testAccessibility(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    // Check for screen reader support
    if (!this.supportsScreenReader()) {
      issues.push('Screen reader support may be limited');
    }

    // Check touch target sizes
    const minTouchSize = this.currentDevice?.type === 'ios' ? 44 : 48;
    const touchTargets = document.querySelectorAll('button, a, input');
    let smallTargets = 0;

    touchTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width < minTouchSize || rect.height < minTouchSize) {
        smallTargets++;
      }
    });

    if (smallTargets > 0) {
      issues.push(`${smallTargets} touch targets are below minimum size`);
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 1 ? 'fail' : 'partial',
      issues,
    };
  }

  private async testTouchInteractions(): Promise<{
    status: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }> {
    const issues: string[] = [];

    if (!this.supportsTouchEvents()) {
      issues.push('Touch events not properly supported');
    }

    if (!this.supportsGestures()) {
      issues.push('Gesture recognition limited');
    }

    if (!this.supportsHapticFeedback()) {
      // Not critical but nice to have
      issues.push('Haptic feedback not available');
    }

    return {
      status:
        issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'partial',
      issues,
    };
  }

  /**
   * Helper methods
   */
  private getIOSVersion(userAgent: string): string {
    const match = userAgent.match(/OS (\d+)_/);
    return match ? match[1] : '15';
  }

  private getAndroidVersion(userAgent: string): string {
    const match = userAgent.match(/Android (\d+)/);
    return match ? match[1] : '11';
  }

  private detectFeatures(): string[] {
    const features: string[] = [];

    if ('Notification' in window) features.push('push');
    if ('mediaDevices' in navigator) features.push('camera');
    if ('ontouchstart' in window) features.push('touch');
    if ('vibrate' in navigator) features.push('haptic');
    if ('bluetooth' in navigator) features.push('bluetooth');
    if ('geolocation' in navigator) features.push('location');

    return features;
  }

  private canUseTextarea(): boolean {
    const textarea = document.createElement('textarea');
    return 'selectionStart' in textarea;
  }

  private supportsWebSockets(): boolean {
    return 'WebSocket' in window;
  }

  private supportsLocalStorage(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private supportsIndexedDB(): boolean {
    return 'indexedDB' in window;
  }

  private supportsImageFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 5;
  }

  private supportsFileUpload(): boolean {
    const input = document.createElement('input');
    input.type = 'file';
    return input.type === 'file';
  }

  private async measureFrameRate(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const startTime = performance.now();

      function count() {
        frames++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(count);
        } else {
          resolve(frames);
        }
      }

      requestAnimationFrame(count);
    });
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1048576);
    }
    return 0;
  }

  private supportsScreenReader(): boolean {
    // Check for ARIA support
    return 'ariaLabel' in document.createElement('div');
  }

  private supportsTouchEvents(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private supportsGestures(): boolean {
    return 'ongesturestart' in window;
  }

  private supportsHapticFeedback(): boolean {
    return 'vibrate' in navigator;
  }

  /**
   * Get compatibility report
   */
  getCompatibilityReport(): {
    currentDevice: DeviceProfile | null;
    testResults: TestResult[];
    overallStatus: 'compatible' | 'partial' | 'incompatible';
    recommendations: string[];
  } {
    const failedTests = this.testResults.filter((r) => r.status === 'fail');
    const partialTests = this.testResults.filter((r) => r.status === 'partial');

    let overallStatus: 'compatible' | 'partial' | 'incompatible' = 'compatible';
    if (failedTests.length > 0) {
      overallStatus = failedTests.length > 2 ? 'incompatible' : 'partial';
    } else if (partialTests.length > 3) {
      overallStatus = 'partial';
    }

    const recommendations: string[] = [];
    if (failedTests.length > 0) {
      recommendations.push('Critical issues detected:');
      failedTests.forEach((test) => {
        if (test.issues) {
          test.issues.forEach((issue) => recommendations.push(`- ${issue}`));
        }
      });
    }

    if (partialTests.length > 0) {
      recommendations.push('Minor issues to address:');
      partialTests.forEach((test) => {
        if (test.issues) {
          test.issues.forEach((issue) => recommendations.push(`- ${issue}`));
        }
      });
    }

    return {
      currentDevice: this.currentDevice,
      testResults: this.testResults,
      overallStatus,
      recommendations,
    };
  }
}

// Export singleton instance
export const deviceCompatibility = DeviceCompatibilityTester.getInstance();
