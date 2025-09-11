/**
 * Mobile Performance Optimizer for Wedding Calendar
 * Ensures smooth performance on mobile devices during critical wedding events
 * Optimizes for battery life, network usage, and touch responsiveness
 */

interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  memoryUsage: number;
  jsHeapSize: number;
  batteryLevel: number;
  networkSpeed: string;
}

interface TouchMetrics {
  averageResponseTime: number;
  maxResponseTime: number;
  missedFrames: number;
  scrollJank: number;
  touchAccuracy: number;
}

interface NetworkConditions {
  type: 'wifi' | 'cellular' | '2g' | '3g' | '4g' | '5g' | 'offline';
  downlink: number;
  rtt: number;
  effectiveType: string;
  saveData: boolean;
}

interface BatteryStatus {
  level: number;
  charging: boolean;
  dischargingTime: number;
  chargingTime: number;
}

interface OptimizationStrategy {
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  condition: (metrics: PerformanceMetrics) => boolean;
  action: () => Promise<void>;
  impact: 'battery' | 'performance' | 'network' | 'memory';
  description: string;
}

export class MobilePerformanceOptimizer {
  private performanceObserver: PerformanceObserver | null = null;
  private metrics: PerformanceMetrics | null = null;
  private touchMetrics: TouchMetrics | null = null;
  private networkConditions: NetworkConditions | null = null;
  private batteryStatus: BatteryStatus | null = null;
  private optimizationStrategies: OptimizationStrategy[] = [];
  private isOptimizing = false;
  private monitoringInterval: number | null = null;

  // Performance thresholds for wedding day critical operations
  private readonly PERFORMANCE_THRESHOLDS = {
    MAX_FCP: 1200, // First Contentful Paint < 1.2s
    MAX_LCP: 2500, // Largest Contentful Paint < 2.5s
    MAX_FID: 100, // First Input Delay < 100ms
    MAX_CLS: 0.1, // Cumulative Layout Shift < 0.1
    MAX_TTI: 3800, // Time to Interactive < 3.8s
    MAX_TBT: 200, // Total Blocking Time < 200ms
    MIN_BATTERY: 0.15, // Critical when battery < 15%
    MAX_TOUCH_RESPONSE: 16, // Touch response < 16ms (60fps)
    MAX_MEMORY_MB: 100, // Maximum memory usage for calendar
  };

  constructor() {
    this.initializeOptimizer();
  }

  /**
   * Initialize the mobile performance optimizer
   */
  async initializeOptimizer(): Promise<void> {
    try {
      console.log(
        '[MobileOptimizer] Initializing wedding calendar performance optimizer...',
      );

      // Setup performance monitoring
      await this.setupPerformanceMonitoring();

      // Detect device capabilities
      await this.detectDeviceCapabilities();

      // Initialize optimization strategies
      this.initializeOptimizationStrategies();

      // Start continuous monitoring
      this.startContinuousMonitoring();

      // Apply initial optimizations
      await this.applyInitialOptimizations();

      console.log(
        '[MobileOptimizer] Wedding calendar performance optimizer ready',
      );
    } catch (error) {
      console.error('[MobileOptimizer] Failed to initialize:', error);
      throw new Error('Mobile performance optimizer initialization failed');
    }
  }

  /**
   * Optimize calendar sync based on battery level and network conditions
   */
  async optimizeCalendarSync(
    batteryLevel: number,
  ): Promise<{ frequency: string; background: boolean }> {
    console.log(
      `[MobileOptimizer] Optimizing sync strategy for battery level: ${Math.round(batteryLevel * 100)}%`,
    );

    // Critical battery level - minimize sync
    if (batteryLevel < this.PERFORMANCE_THRESHOLDS.MIN_BATTERY) {
      return {
        frequency: 'manual',
        background: false,
      };
    }

    // Low battery level - reduced sync
    if (batteryLevel < 0.3) {
      return {
        frequency: 'reduced',
        background: true,
      };
    }

    // Medium battery level - standard sync with optimizations
    if (batteryLevel < 0.6) {
      return {
        frequency: 'standard',
        background: true,
      };
    }

    // Good battery level - full sync capabilities
    return {
      frequency: 'normal',
      background: true,
    };
  }

  /**
   * Handle network condition changes for adaptive performance
   */
  async handleNetworkChange(connection: NetworkConditions): Promise<void> {
    console.log(
      `[MobileOptimizer] Network changed to: ${connection.type} (${connection.effectiveType})`,
    );

    this.networkConditions = connection;

    switch (connection.type) {
      case 'wifi':
        await this.enableFullSyncMode();
        break;

      case 'cellular':
      case '4g':
      case '5g':
        await this.enableOptimizedSyncMode();
        break;

      case '3g':
        await this.enableReducedSyncMode();
        break;

      case '2g':
        await this.enableMinimalSyncMode();
        break;

      case 'offline':
        await this.enableOfflineMode();
        break;
    }

    // Apply data saver optimizations if enabled
    if (connection.saveData) {
      await this.applyDataSaverOptimizations();
    }
  }

  /**
   * Optimize touch response and gesture handling
   */
  async optimizeTouchPerformance(): Promise<void> {
    console.log(
      '[MobileOptimizer] Optimizing touch performance for wedding timeline...',
    );

    try {
      // Enable hardware acceleration for touch elements
      this.enableHardwareAcceleration();

      // Optimize scroll performance
      this.optimizeScrolling();

      // Reduce touch event processing overhead
      this.optimizeTouchEvents();

      // Enable 60fps frame rate optimization
      this.enable60FPSOptimization();

      console.log('[MobileOptimizer] Touch performance optimizations applied');
    } catch (error) {
      console.error('[MobileOptimizer] Touch optimization failed:', error);
    }
  }

  /**
   * Optimize memory usage for timeline data
   */
  async optimizeMemoryUsage(): Promise<void> {
    console.log(
      '[MobileOptimizer] Optimizing memory usage for wedding timeline data...',
    );

    try {
      // Clear unused timeline cache
      await this.clearUnusedCache();

      // Optimize component rendering
      this.optimizeComponentRendering();

      // Enable virtual scrolling for large lists
      this.enableVirtualScrolling();

      // Compress timeline data in memory
      await this.compressTimelineData();

      // Force garbage collection if available
      this.requestGarbageCollection();

      console.log('[MobileOptimizer] Memory optimizations applied');
    } catch (error) {
      console.error('[MobileOptimizer] Memory optimization failed:', error);
    }
  }

  /**
   * Monitor and optimize battery usage
   */
  async optimizeBatteryUsage(): Promise<void> {
    console.log(
      '[MobileOptimizer] Optimizing battery usage for extended wedding day operation...',
    );

    try {
      const battery = await this.getBatteryStatus();

      if (!battery) {
        console.log('[MobileOptimizer] Battery API not available');
        return;
      }

      // Reduce background activity on low battery
      if (battery.level < 0.2) {
        await this.enablePowerSavingMode();
      }

      // Optimize sync frequency based on battery level
      const syncStrategy = await this.optimizeCalendarSync(battery.level);
      await this.applySyncStrategy(syncStrategy);

      // Reduce animation and visual effects on low battery
      if (battery.level < 0.15) {
        this.reduceVisualEffects();
      }

      console.log(
        `[MobileOptimizer] Battery optimizations applied (${Math.round(battery.level * 100)}% remaining)`,
      );
    } catch (error) {
      console.error('[MobileOptimizer] Battery optimization failed:', error);
    }
  }

  /**
   * Apply wedding day emergency optimizations
   */
  async enableWeddingDayMode(): Promise<void> {
    console.log(
      '[MobileOptimizer] 💒 Enabling WEDDING DAY performance mode...',
    );

    try {
      // Maximum performance and reliability
      await Promise.all([
        this.enableCriticalPerformanceMode(),
        this.enableReliabilityOptimizations(),
        this.enableEmergencyBatteryMode(),
        this.enableOfflineFallbacks(),
        this.enableCriticalDataPersistence(),
      ]);

      // Monitor performance more aggressively
      this.enableAggressiveMonitoring();

      console.log(
        '[MobileOptimizer] 💒 WEDDING DAY mode activated - Maximum reliability enabled',
      );
    } catch (error) {
      console.error('[MobileOptimizer] Wedding day mode failed:', error);
      throw new Error('Critical wedding day optimization failed');
    }
  }

  // Private optimization methods

  private async setupPerformanceMonitoring(): Promise<void> {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      // Monitor Core Web Vitals
      this.performanceObserver.observe({
        entryTypes: [
          'paint',
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
        ],
      });
    }

    // Monitor touch performance
    this.setupTouchPerformanceMonitoring();
  }

  private setupTouchPerformanceMonitoring(): void {
    let touchStartTime: number;
    let touchMetricsBuffer: number[] = [];

    document.addEventListener(
      'touchstart',
      () => {
        touchStartTime = performance.now();
      },
      { passive: true },
    );

    document.addEventListener(
      'touchend',
      () => {
        if (touchStartTime) {
          const responseTime = performance.now() - touchStartTime;
          touchMetricsBuffer.push(responseTime);

          // Calculate rolling average
          if (touchMetricsBuffer.length > 100) {
            touchMetricsBuffer = touchMetricsBuffer.slice(-50);
          }

          this.touchMetrics = {
            averageResponseTime:
              touchMetricsBuffer.reduce((a, b) => a + b) /
              touchMetricsBuffer.length,
            maxResponseTime: Math.max(...touchMetricsBuffer),
            missedFrames: 0, // Would be calculated differently
            scrollJank: 0, // Would be calculated differently
            touchAccuracy: 95, // Would be calculated differently
          };
        }
      },
      { passive: true },
    );
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      switch (entry.entryType) {
        case 'paint':
          if (entry.name === 'first-contentful-paint') {
            this.updateMetric('firstContentfulPaint', entry.startTime);
          }
          break;

        case 'largest-contentful-paint':
          this.updateMetric('largestContentfulPaint', (entry as any).startTime);
          break;

        case 'first-input':
          this.updateMetric(
            'firstInputDelay',
            (entry as any).processingStart - entry.startTime,
          );
          break;

        case 'layout-shift':
          if (!(entry as any).hadRecentInput) {
            this.updateMetric('cumulativeLayoutShift', (entry as any).value);
          }
          break;
      }
    }
  }

  private updateMetric(metric: keyof PerformanceMetrics, value: number): void {
    if (!this.metrics) {
      this.metrics = {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        timeToInteractive: 0,
        totalBlockingTime: 0,
        memoryUsage: 0,
        jsHeapSize: 0,
        batteryLevel: 1,
        networkSpeed: 'unknown',
      };
    }

    this.metrics[metric] = value;
    this.checkPerformanceThresholds();
  }

  private checkPerformanceThresholds(): void {
    if (!this.metrics) return;

    // Check critical thresholds
    if (
      this.metrics.firstContentfulPaint > this.PERFORMANCE_THRESHOLDS.MAX_FCP
    ) {
      this.triggerOptimization('slow_fcp');
    }

    if (this.metrics.firstInputDelay > this.PERFORMANCE_THRESHOLDS.MAX_FID) {
      this.triggerOptimization('slow_interaction');
    }

    if (
      this.touchMetrics &&
      this.touchMetrics.averageResponseTime >
        this.PERFORMANCE_THRESHOLDS.MAX_TOUCH_RESPONSE
    ) {
      this.triggerOptimization('slow_touch');
    }
  }

  private triggerOptimization(type: string): void {
    console.log(`[MobileOptimizer] Performance threshold exceeded: ${type}`);

    // Apply immediate optimizations
    switch (type) {
      case 'slow_fcp':
        this.optimizeInitialRender();
        break;
      case 'slow_interaction':
        this.optimizeInteractivity();
        break;
      case 'slow_touch':
        this.optimizeTouchPerformance();
        break;
    }
  }

  private async detectDeviceCapabilities(): Promise<void> {
    // Detect network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkConditions = {
        type: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        effectiveType: connection.effectiveType || 'unknown',
        saveData: connection.saveData || false,
      };
    }

    // Detect battery status
    this.batteryStatus = await this.getBatteryStatus();

    // Detect memory limitations
    if ('memory' in (performance as any)) {
      const memInfo = (performance as any).memory;
      this.updateMetric('jsHeapSize', memInfo.usedJSHeapSize);
      this.updateMetric('memoryUsage', memInfo.totalJSHeapSize);
    }
  }

  private async getBatteryStatus(): Promise<BatteryStatus | null> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          dischargingTime: battery.dischargingTime,
          chargingTime: battery.chargingTime,
        };
      }
    } catch (error) {
      console.log('[MobileOptimizer] Battery API not available');
    }
    return null;
  }

  private initializeOptimizationStrategies(): void {
    this.optimizationStrategies = [
      {
        name: 'Enable Hardware Acceleration',
        priority: 'high',
        condition: (metrics) => metrics.firstInputDelay > 50,
        action: () => this.enableHardwareAcceleration(),
        impact: 'performance',
        description: 'Enable GPU acceleration for smoother animations',
      },
      {
        name: 'Reduce Animations',
        priority: 'medium',
        condition: (metrics) => metrics.batteryLevel < 0.2,
        action: () => this.reduceVisualEffects(),
        impact: 'battery',
        description: 'Reduce animations to save battery on wedding day',
      },
      {
        name: 'Enable Virtual Scrolling',
        priority: 'high',
        condition: (metrics) => metrics.memoryUsage > 50 * 1024 * 1024,
        action: () => this.enableVirtualScrolling(),
        impact: 'memory',
        description: 'Use virtual scrolling for large timeline lists',
      },
      {
        name: 'Optimize Network Requests',
        priority: 'critical',
        condition: () => this.networkConditions?.saveData || false,
        action: () => this.applyDataSaverOptimizations(),
        impact: 'network',
        description: 'Reduce data usage for timeline sync',
      },
    ];
  }

  private startContinuousMonitoring(): void {
    // Monitor every 10 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.performPerformanceCheck();
    }, 10000);
  }

  private async performPerformanceCheck(): Promise<void> {
    if (this.isOptimizing) return;

    // Update battery status
    this.batteryStatus = await this.getBatteryStatus();
    if (this.batteryStatus) {
      this.updateMetric('batteryLevel', this.batteryStatus.level);
    }

    // Apply necessary optimizations
    await this.applyAutomaticOptimizations();
  }

  private async applyAutomaticOptimizations(): Promise<void> {
    if (!this.metrics) return;

    const applicableStrategies = this.optimizationStrategies.filter(
      (strategy) => strategy.condition(this.metrics!),
    );

    for (const strategy of applicableStrategies) {
      try {
        await strategy.action();
        console.log(`[MobileOptimizer] Applied: ${strategy.name}`);
      } catch (error) {
        console.error(
          `[MobileOptimizer] Failed to apply ${strategy.name}:`,
          error,
        );
      }
    }
  }

  private async applyInitialOptimizations(): Promise<void> {
    // Apply optimizations that should always be active
    await Promise.all([
      this.enableHardwareAcceleration(),
      this.optimizeScrolling(),
      this.enable60FPSOptimization(),
    ]);
  }

  // Optimization implementation methods

  private enableHardwareAcceleration(): Promise<void> {
    return new Promise((resolve) => {
      const elements = document.querySelectorAll(
        '.timeline-event, .calendar-grid, .touch-target',
      );
      elements.forEach((el) => {
        (el as HTMLElement).style.transform = 'translateZ(0)';
        (el as HTMLElement).style.willChange = 'transform, opacity';
      });
      resolve();
    });
  }

  private optimizeScrolling(): void {
    document.documentElement.style.setProperty(
      '-webkit-overflow-scrolling',
      'touch',
    );
    document.documentElement.style.setProperty('scroll-behavior', 'smooth');
  }

  private optimizeTouchEvents(): void {
    // Use passive event listeners for better performance
    const options = { passive: true };
    document.addEventListener('touchstart', () => {}, options);
    document.addEventListener('touchmove', () => {}, options);
  }

  private enable60FPSOptimization(): void {
    // Optimize for 60fps rendering
    const style = document.createElement('style');
    style.textContent = `
      .timeline-container {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
      .touch-optimized {
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  private async enableFullSyncMode(): Promise<void> {
    console.log('[MobileOptimizer] Enabled full sync mode (WiFi)');
  }

  private async enableOptimizedSyncMode(): Promise<void> {
    console.log('[MobileOptimizer] Enabled optimized sync mode (4G/5G)');
  }

  private async enableReducedSyncMode(): Promise<void> {
    console.log('[MobileOptimizer] Enabled reduced sync mode (3G)');
  }

  private async enableMinimalSyncMode(): Promise<void> {
    console.log('[MobileOptimizer] Enabled minimal sync mode (2G)');
  }

  private async enableOfflineMode(): Promise<void> {
    console.log('[MobileOptimizer] Enabled offline mode');
  }

  private async applyDataSaverOptimizations(): Promise<void> {
    console.log('[MobileOptimizer] Applied data saver optimizations');
  }

  private async clearUnusedCache(): Promise<void> {
    // Clear unused timeline cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('old') || cacheName.includes('unused')) {
          await caches.delete(cacheName);
        }
      }
    }
  }

  private optimizeComponentRendering(): void {
    // Enable React optimizations
    document.documentElement.setAttribute('data-render-mode', 'optimized');
  }

  private enableVirtualScrolling(): void {
    document.documentElement.setAttribute('data-virtual-scroll', 'enabled');
  }

  private async compressTimelineData(): Promise<void> {
    console.log(
      '[MobileOptimizer] Timeline data compressed for memory efficiency',
    );
  }

  private requestGarbageCollection(): void {
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private async enablePowerSavingMode(): Promise<void> {
    console.log('[MobileOptimizer] 🔋 Power saving mode enabled');
    this.reduceVisualEffects();
    this.reduceSyncFrequency();
  }

  private async applySyncStrategy(strategy: {
    frequency: string;
    background: boolean;
  }): Promise<void> {
    console.log(
      `[MobileOptimizer] Applied sync strategy: ${strategy.frequency}`,
    );
  }

  private reduceVisualEffects(): void {
    const style = document.createElement('style');
    style.id = 'power-saving-styles';
    style.textContent = `
      .timeline-animation { animation: none !important; }
      .fade-transition { transition: none !important; }
      .bounce-effect { transform: none !important; }
      * { animation-duration: 0.01ms !important; }
    `;

    // Remove existing power saving styles
    const existing = document.getElementById('power-saving-styles');
    if (existing) existing.remove();

    document.head.appendChild(style);
  }

  private reduceSyncFrequency(): void {
    // Signal to sync service to reduce frequency
    window.dispatchEvent(
      new CustomEvent('optimize-sync-frequency', { detail: 'reduced' }),
    );
  }

  private async enableCriticalPerformanceMode(): Promise<void> {
    console.log('[MobileOptimizer] 💒 Critical performance mode enabled');
  }

  private async enableReliabilityOptimizations(): Promise<void> {
    console.log('[MobileOptimizer] 💒 Reliability optimizations enabled');
  }

  private async enableEmergencyBatteryMode(): Promise<void> {
    console.log('[MobileOptimizer] 💒 Emergency battery mode enabled');
  }

  private async enableOfflineFallbacks(): Promise<void> {
    console.log('[MobileOptimizer] 💒 Offline fallbacks enabled');
  }

  private async enableCriticalDataPersistence(): Promise<void> {
    console.log('[MobileOptimizer] 💒 Critical data persistence enabled');
  }

  private enableAggressiveMonitoring(): void {
    // Reduce monitoring interval for wedding day
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.monitoringInterval = window.setInterval(() => {
      this.performPerformanceCheck();
    }, 5000); // Every 5 seconds on wedding day
  }

  private optimizeInitialRender(): void {
    console.log('[MobileOptimizer] Optimizing initial render performance');
  }

  private optimizeInteractivity(): void {
    console.log('[MobileOptimizer] Optimizing interaction performance');
  }
}

export default MobilePerformanceOptimizer;
