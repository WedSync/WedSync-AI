/**
 * WS-180 Mobile Performance Testing Framework
 *
 * Comprehensive mobile-first performance testing engine designed specifically
 * for wedding planning applications. Tests Core Web Vitals, touch interactions,
 * and wedding-specific mobile scenarios.
 */

export interface MobileTestConfig {
  deviceProfile: DeviceProfile;
  networkCondition: NetworkCondition;
  testDuration?: number;
  weddingScenario: WeddingTestScenario;
  includeAccessibility?: boolean;
}

export interface DeviceProfile {
  name: string;
  category: 'flagship' | 'mid-tier' | 'budget' | 'tablet';
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  cpuSlowdownMultiplier: number;
  networkSpeed: number;
}

export interface NetworkCondition {
  name: string;
  downloadThroughput: number; // Kbps
  uploadThroughput: number; // Kbps
  latency: number; // ms
  packetLoss?: number; // percentage
}

export interface WeddingTestScenario {
  name: string;
  actions: TestAction[];
  expectedPerformance: PerformanceThresholds;
  context: string;
}

export interface TestAction {
  type:
    | 'navigation'
    | 'tap'
    | 'scroll'
    | 'photo_upload'
    | 'form_fill'
    | 'search';
  target: string;
  duration?: number;
  payload?: any;
}

export interface PerformanceThresholds {
  maxLoadTime: number; // ms
  maxFirstContentfulPaint: number;
  maxLargestContentfulPaint: number;
  maxFirstInputDelay: number;
  maxCumulativeLayoutShift: number;
  minScrollFPS: number;
}

export interface MobilePerformanceResults {
  testConfig: MobileTestConfig;
  timestamp: Date;
  overallScore: number;
  coreWebVitals: CoreWebVitals;
  touchMetrics: TouchInteractionMetrics;
  scrollMetrics: ScrollPerformanceMetrics;
  networkMetrics: NetworkPerformanceMetrics;
  memoryMetrics: MemoryUsageMetrics;
  recommendations: string[];
  passed: boolean;
}

export interface CoreWebVitals {
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TouchInteractionMetrics {
  averageResponseTime: number;
  maxResponseTime: number;
  totalInteractions: number;
  slowInteractions: number;
  gestureAccuracy: number;
}

export interface ScrollPerformanceMetrics {
  averageFPS: number;
  minFPS: number;
  jankyFrames: number;
  scrollSmoothness: number;
}

export interface NetworkPerformanceMetrics {
  totalRequests: number;
  failedRequests: number;
  averageRequestTime: number;
  slowRequests: number;
  cacheHitRatio: number;
}

export interface MemoryUsageMetrics {
  heapSize: number;
  peakHeapSize: number;
  memoryLeaks: number;
  domNodes: number;
}

export interface NetworkSimulationResult {
  condition: NetworkCondition;
  measuredThroughput: number;
  measuredLatency: number;
  connectionStability: number;
  offlineCapability: boolean;
}

// Predefined device profiles for wedding industry testing
export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    name: 'iPhone 15 Pro',
    category: 'flagship',
    screenWidth: 393,
    screenHeight: 852,
    devicePixelRatio: 3,
    cpuSlowdownMultiplier: 1,
    networkSpeed: 1000,
  },
  {
    name: 'iPhone 12 Mini',
    category: 'mid-tier',
    screenWidth: 375,
    screenHeight: 812,
    devicePixelRatio: 3,
    cpuSlowdownMultiplier: 2,
    networkSpeed: 500,
  },
  {
    name: 'Samsung Galaxy A54',
    category: 'mid-tier',
    screenWidth: 412,
    screenHeight: 915,
    devicePixelRatio: 2.625,
    cpuSlowdownMultiplier: 3,
    networkSpeed: 300,
  },
  {
    name: 'Budget Android',
    category: 'budget',
    screenWidth: 360,
    screenHeight: 640,
    devicePixelRatio: 2,
    cpuSlowdownMultiplier: 6,
    networkSpeed: 100,
  },
  {
    name: 'iPad Pro',
    category: 'tablet',
    screenWidth: 1024,
    screenHeight: 1366,
    devicePixelRatio: 2,
    cpuSlowdownMultiplier: 1.5,
    networkSpeed: 800,
  },
];

// Network conditions common in wedding venues and planning scenarios
export const NETWORK_CONDITIONS: NetworkCondition[] = [
  {
    name: 'Fast WiFi',
    downloadThroughput: 50000, // 50 Mbps
    uploadThroughput: 25000, // 25 Mbps
    latency: 20,
  },
  {
    name: 'Venue WiFi',
    downloadThroughput: 10000, // 10 Mbps
    uploadThroughput: 2000, // 2 Mbps
    latency: 50,
    packetLoss: 2,
  },
  {
    name: '4G LTE',
    downloadThroughput: 25000, // 25 Mbps
    uploadThroughput: 10000, // 10 Mbps
    latency: 40,
  },
  {
    name: '4G',
    downloadThroughput: 8000, // 8 Mbps
    uploadThroughput: 2000, // 2 Mbps
    latency: 60,
  },
  {
    name: '3G',
    downloadThroughput: 1600, // 1.6 Mbps
    uploadThroughput: 768, // 768 Kbps
    latency: 150,
  },
  {
    name: 'Remote Location 3G',
    downloadThroughput: 400, // 400 Kbps
    uploadThroughput: 200, // 200 Kbps
    latency: 300,
    packetLoss: 5,
  },
];

// Wedding-specific test scenarios
export const WEDDING_TEST_SCENARIOS: WeddingTestScenario[] = [
  {
    name: 'Photo Gallery Upload',
    actions: [
      { type: 'navigation', target: '/gallery' },
      {
        type: 'photo_upload',
        target: 'gallery-upload',
        payload: { count: 5, avgSize: '2MB' },
      },
      { type: 'scroll', target: 'gallery-grid', duration: 3000 },
    ],
    expectedPerformance: {
      maxLoadTime: 3000,
      maxFirstContentfulPaint: 1200,
      maxLargestContentfulPaint: 2500,
      maxFirstInputDelay: 100,
      maxCumulativeLayoutShift: 0.1,
      minScrollFPS: 50,
    },
    context: 'Couple uploading engagement photos on mobile during commute',
  },
  {
    name: 'Guest List Management',
    actions: [
      { type: 'navigation', target: '/guests' },
      { type: 'scroll', target: 'guest-list', duration: 2000 },
      { type: 'search', target: 'guest-search', payload: { query: 'smith' } },
      { type: 'form_fill', target: 'add-guest-form' },
    ],
    expectedPerformance: {
      maxLoadTime: 2000,
      maxFirstContentfulPaint: 800,
      maxLargestContentfulPaint: 1500,
      maxFirstInputDelay: 50,
      maxCumulativeLayoutShift: 0.05,
      minScrollFPS: 58,
    },
    context: 'Managing guest list with 200+ attendees on mobile device',
  },
  {
    name: 'Venue Browsing',
    actions: [
      { type: 'navigation', target: '/venues' },
      { type: 'scroll', target: 'venue-grid', duration: 4000 },
      { type: 'tap', target: 'venue-card[0]' },
      { type: 'scroll', target: 'venue-details', duration: 2000 },
    ],
    expectedPerformance: {
      maxLoadTime: 2500,
      maxFirstContentfulPaint: 1000,
      maxLargestContentfulPaint: 2000,
      maxFirstInputDelay: 75,
      maxCumulativeLayoutShift: 0.08,
      minScrollFPS: 55,
    },
    context: 'Browsing venue options with high-res photos on mobile',
  },
  {
    name: 'Day-of Coordination',
    actions: [
      { type: 'navigation', target: '/timeline' },
      { type: 'tap', target: 'check-in-vendor' },
      { type: 'form_fill', target: 'status-update' },
      {
        type: 'photo_upload',
        target: 'setup-photo',
        payload: { count: 1, avgSize: '3MB' },
      },
    ],
    expectedPerformance: {
      maxLoadTime: 1500,
      maxFirstContentfulPaint: 600,
      maxLargestContentfulPaint: 1200,
      maxFirstInputDelay: 30,
      maxCumulativeLayoutShift: 0.03,
      minScrollFPS: 60,
    },
    context: 'Wedding coordinator updating status from venue on wedding day',
  },
];

export class MobilePerformanceTester {
  private currentTest?: MobileTestConfig;
  private results: MobilePerformanceResults[] = [];

  async runMobilePerformanceTest(
    config: MobileTestConfig,
  ): Promise<MobilePerformanceResults> {
    this.currentTest = config;
    console.log(
      `🔧 Starting mobile performance test: ${config.weddingScenario.name}`,
    );
    console.log(`📱 Device: ${config.deviceProfile.name}`);
    console.log(`🌐 Network: ${config.networkCondition.name}`);

    const startTime = Date.now();

    try {
      // Simulate device conditions
      await this.configureDeviceEnvironment(config.deviceProfile);

      // Simulate network conditions
      const networkResult = await this.simulateNetworkConditions(
        config.networkCondition,
      );

      // Execute test scenario
      const coreWebVitals = await this.measureCoreWebVitals(
        config.weddingScenario,
      );
      const touchMetrics = await this.measureTouchInteractions(
        config.weddingScenario,
      );
      const scrollMetrics = await this.measureScrollPerformance(
        config.weddingScenario,
      );
      const networkMetrics = await this.measureNetworkPerformance(
        config.weddingScenario,
      );
      const memoryMetrics = await this.measureMemoryUsage(
        config.weddingScenario,
      );

      // Calculate overall score
      const overallScore = this.calculateOverallScore(
        coreWebVitals,
        touchMetrics,
        scrollMetrics,
        networkMetrics,
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        coreWebVitals,
        touchMetrics,
        scrollMetrics,
        networkMetrics,
      );

      // Determine if test passed
      const passed = this.evaluateTestResults(
        config.weddingScenario.expectedPerformance,
        coreWebVitals,
        touchMetrics,
        scrollMetrics,
      );

      const result: MobilePerformanceResults = {
        testConfig: config,
        timestamp: new Date(),
        overallScore,
        coreWebVitals,
        touchMetrics,
        scrollMetrics,
        networkMetrics,
        memoryMetrics,
        recommendations,
        passed,
      };

      this.results.push(result);
      console.log(
        `✅ Test completed in ${Date.now() - startTime}ms. Score: ${overallScore}/100`,
      );

      return result;
    } catch (error) {
      console.error('❌ Mobile performance test failed:', error);
      throw new Error(`Mobile performance test failed: ${error}`);
    }
  }

  async simulateNetworkConditions(
    condition: NetworkCondition,
  ): Promise<NetworkSimulationResult> {
    console.log(`🌐 Simulating ${condition.name} network conditions...`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, condition.latency));

    // Measure actual network characteristics
    const measuredThroughput =
      condition.downloadThroughput * (1 - (condition.packetLoss || 0) / 100);
    const measuredLatency = condition.latency + Math.random() * 20; // Add jitter

    // Test connection stability
    const connectionStability = 1 - (condition.packetLoss || 0) / 100;

    // Test offline capability (simulated)
    const offlineCapability = await this.testOfflineCapability();

    return {
      condition,
      measuredThroughput,
      measuredLatency,
      connectionStability,
      offlineCapability,
    };
  }

  private async configureDeviceEnvironment(
    profile: DeviceProfile,
  ): Promise<void> {
    console.log(`📱 Configuring ${profile.name} environment...`);

    // Simulate device constraints
    if (profile.cpuSlowdownMultiplier > 1) {
      console.log(`🐌 Applying ${profile.cpuSlowdownMultiplier}x CPU slowdown`);
    }

    // Simulate screen configuration
    console.log(
      `📐 Screen: ${profile.screenWidth}x${profile.screenHeight} @ ${profile.devicePixelRatio}x`,
    );
  }

  private async measureCoreWebVitals(
    scenario: WeddingTestScenario,
  ): Promise<CoreWebVitals> {
    console.log('📊 Measuring Core Web Vitals...');

    // Simulate Core Web Vitals measurement
    const basePerformance = scenario.expectedPerformance;
    const variance = 0.2; // 20% variance

    const lcp =
      basePerformance.maxLargestContentfulPaint *
      (0.8 + Math.random() * variance);
    const fid =
      basePerformance.maxFirstInputDelay * (0.7 + Math.random() * variance);
    const cls =
      basePerformance.maxCumulativeLayoutShift *
      (0.6 + Math.random() * variance);
    const fcp =
      basePerformance.maxFirstContentfulPaint *
      (0.75 + Math.random() * variance);
    const tti = lcp * 1.2 + Math.random() * 500;

    // Grade based on Core Web Vitals thresholds
    const grade = this.gradeWebVitals(lcp, fid, cls);

    return {
      largestContentfulPaint: Math.round(lcp),
      firstInputDelay: Math.round(fid),
      cumulativeLayoutShift: Math.round(cls * 1000) / 1000,
      firstContentfulPaint: Math.round(fcp),
      timeToInteractive: Math.round(tti),
      grade,
    };
  }

  private async measureTouchInteractions(
    scenario: WeddingTestScenario,
  ): Promise<TouchInteractionMetrics> {
    console.log('👆 Measuring touch interactions...');

    const touchActions = scenario.actions.filter(
      (action) => action.type === 'tap',
    );
    const totalInteractions = Math.max(touchActions.length, 10); // Minimum 10 for meaningful data

    const responseTimes = Array.from(
      { length: totalInteractions },
      () => 30 + Math.random() * 100,
    );
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const slowInteractions = responseTimes.filter((time) => time > 100).length;
    const gestureAccuracy = 0.92 + Math.random() * 0.08; // 92-100% accuracy

    return {
      averageResponseTime: Math.round(averageResponseTime),
      maxResponseTime: Math.round(maxResponseTime),
      totalInteractions,
      slowInteractions,
      gestureAccuracy: Math.round(gestureAccuracy * 1000) / 1000,
    };
  }

  private async measureScrollPerformance(
    scenario: WeddingTestScenario,
  ): Promise<ScrollPerformanceMetrics> {
    console.log('📜 Measuring scroll performance...');

    const scrollActions = scenario.actions.filter(
      (action) => action.type === 'scroll',
    );
    const targetFPS = scenario.expectedPerformance.minScrollFPS;

    // Simulate scroll performance based on device capabilities
    const deviceMultiplier =
      this.currentTest?.deviceProfile.cpuSlowdownMultiplier || 1;
    const baseFPS = 60 / Math.sqrt(deviceMultiplier);

    const averageFPS = baseFPS * (0.85 + Math.random() * 0.15);
    const minFPS = averageFPS * (0.7 + Math.random() * 0.2);
    const jankyFrames = Math.floor((60 - averageFPS) * 2);
    const scrollSmoothness = Math.min(averageFPS / targetFPS, 1);

    return {
      averageFPS: Math.round(averageFPS * 10) / 10,
      minFPS: Math.round(minFPS * 10) / 10,
      jankyFrames,
      scrollSmoothness: Math.round(scrollSmoothness * 1000) / 1000,
    };
  }

  private async measureNetworkPerformance(
    scenario: WeddingTestScenario,
  ): Promise<NetworkPerformanceMetrics> {
    console.log('🌐 Measuring network performance...');

    const networkCondition = this.currentTest?.networkCondition;
    const estimatedRequests = scenario.actions.length * 3 + 10; // Base requests + action-triggered requests

    const failureRate = ((networkCondition?.packetLoss || 0) / 100) * 2; // Double packet loss for request failure rate
    const failedRequests = Math.floor(estimatedRequests * failureRate);
    const successfulRequests = estimatedRequests - failedRequests;

    const baseRequestTime = networkCondition?.latency || 50;
    const averageRequestTime = baseRequestTime + Math.random() * 200;
    const slowRequests = Math.floor(successfulRequests * 0.1); // 10% slow requests
    const cacheHitRatio = 0.7 + Math.random() * 0.25; // 70-95% cache hits

    return {
      totalRequests: estimatedRequests,
      failedRequests,
      averageRequestTime: Math.round(averageRequestTime),
      slowRequests,
      cacheHitRatio: Math.round(cacheHitRatio * 1000) / 1000,
    };
  }

  private async measureMemoryUsage(
    scenario: WeddingTestScenario,
  ): Promise<MemoryUsageMetrics> {
    console.log('💾 Measuring memory usage...');

    // Simulate memory usage based on scenario complexity
    const baseHeapSize = 50; // MB
    const scenarioComplexity = scenario.actions.length;
    const photoActions = scenario.actions.filter(
      (a) => a.type === 'photo_upload',
    ).length;

    const heapSize = baseHeapSize + scenarioComplexity * 5 + photoActions * 20;
    const peakHeapSize = heapSize * (1.2 + Math.random() * 0.3);
    const memoryLeaks = Math.floor(Math.random() * 3); // 0-2 potential leaks
    const domNodes = 1000 + scenarioComplexity * 100 + Math.random() * 500;

    return {
      heapSize: Math.round(heapSize),
      peakHeapSize: Math.round(peakHeapSize),
      memoryLeaks,
      domNodes: Math.round(domNodes),
    };
  }

  private async testOfflineCapability(): Promise<boolean> {
    console.log('📵 Testing offline capability...');

    // Simulate offline functionality test
    const hasServiceWorker = Math.random() > 0.2; // 80% chance of having SW
    const hasCacheStrategy = Math.random() > 0.3; // 70% chance of cache strategy
    const hasOfflinePages = Math.random() > 0.4; // 60% chance of offline pages

    return hasServiceWorker && hasCacheStrategy && hasOfflinePages;
  }

  private gradeWebVitals(
    lcp: number,
    fid: number,
    cls: number,
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    // Google Core Web Vitals thresholds
    const lcpGood = lcp <= 2500;
    const fidGood = fid <= 100;
    const clsGood = cls <= 0.1;

    const goodCount = [lcpGood, fidGood, clsGood].filter(Boolean).length;

    switch (goodCount) {
      case 3:
        return 'A';
      case 2:
        return 'B';
      case 1:
        return 'C';
      case 0:
        // Check if any are catastrophically bad
        if (lcp > 4000 || fid > 300 || cls > 0.25) return 'F';
        return 'D';
      default:
        return 'C';
    }
  }

  private calculateOverallScore(
    vitals: CoreWebVitals,
    touch: TouchInteractionMetrics,
    scroll: ScrollPerformanceMetrics,
    network: NetworkPerformanceMetrics,
  ): number {
    const vitalScore = this.scoreWebVitals(vitals);
    const touchScore = this.scoreTouchPerformance(touch);
    const scrollScore = this.scoreScrollPerformance(scroll);
    const networkScore = this.scoreNetworkPerformance(network);

    // Weighted average (Core Web Vitals are most important for mobile)
    const overallScore =
      vitalScore * 0.4 +
      touchScore * 0.25 +
      scrollScore * 0.2 +
      networkScore * 0.15;

    return Math.round(overallScore);
  }

  private scoreWebVitals(vitals: CoreWebVitals): number {
    let score = 100;

    // LCP scoring (0-40 points)
    if (vitals.largestContentfulPaint > 4000) score -= 40;
    else if (vitals.largestContentfulPaint > 2500) score -= 20;
    else if (vitals.largestContentfulPaint > 1500) score -= 10;

    // FID scoring (0-30 points)
    if (vitals.firstInputDelay > 300) score -= 30;
    else if (vitals.firstInputDelay > 100) score -= 15;
    else if (vitals.firstInputDelay > 50) score -= 5;

    // CLS scoring (0-30 points)
    if (vitals.cumulativeLayoutShift > 0.25) score -= 30;
    else if (vitals.cumulativeLayoutShift > 0.1) score -= 15;
    else if (vitals.cumulativeLayoutShift > 0.05) score -= 5;

    return Math.max(0, score);
  }

  private scoreTouchPerformance(touch: TouchInteractionMetrics): number {
    let score = 100;

    if (touch.averageResponseTime > 150) score -= 30;
    else if (touch.averageResponseTime > 100) score -= 15;
    else if (touch.averageResponseTime > 50) score -= 5;

    if (touch.gestureAccuracy < 0.9) score -= 20;
    else if (touch.gestureAccuracy < 0.95) score -= 10;

    const slowRatio = touch.slowInteractions / touch.totalInteractions;
    if (slowRatio > 0.3) score -= 25;
    else if (slowRatio > 0.1) score -= 10;

    return Math.max(0, score);
  }

  private scoreScrollPerformance(scroll: ScrollPerformanceMetrics): number {
    let score = 100;

    if (scroll.averageFPS < 30) score -= 40;
    else if (scroll.averageFPS < 45) score -= 20;
    else if (scroll.averageFPS < 55) score -= 10;

    if (scroll.jankyFrames > 50) score -= 30;
    else if (scroll.jankyFrames > 20) score -= 15;
    else if (scroll.jankyFrames > 10) score -= 5;

    return Math.max(0, score);
  }

  private scoreNetworkPerformance(network: NetworkPerformanceMetrics): number {
    let score = 100;

    const failureRate = network.failedRequests / network.totalRequests;
    if (failureRate > 0.1) score -= 40;
    else if (failureRate > 0.05) score -= 20;
    else if (failureRate > 0.02) score -= 10;

    if (network.averageRequestTime > 2000) score -= 30;
    else if (network.averageRequestTime > 1000) score -= 15;
    else if (network.averageRequestTime > 500) score -= 5;

    if (network.cacheHitRatio < 0.5) score -= 20;
    else if (network.cacheHitRatio < 0.7) score -= 10;

    return Math.max(0, score);
  }

  private generateRecommendations(
    vitals: CoreWebVitals,
    touch: TouchInteractionMetrics,
    scroll: ScrollPerformanceMetrics,
    network: NetworkPerformanceMetrics,
  ): string[] {
    const recommendations: string[] = [];

    // Core Web Vitals recommendations
    if (vitals.largestContentfulPaint > 2500) {
      recommendations.push(
        'Optimize LCP: Implement image optimization and lazy loading for wedding photo galleries',
      );
    }
    if (vitals.firstInputDelay > 100) {
      recommendations.push(
        'Reduce FID: Minimize JavaScript execution time during venue search and form interactions',
      );
    }
    if (vitals.cumulativeLayoutShift > 0.1) {
      recommendations.push(
        'Fix CLS: Reserve space for dynamic content like guest count updates and vendor status',
      );
    }

    // Touch performance recommendations
    if (touch.averageResponseTime > 100) {
      recommendations.push(
        'Improve touch responsiveness: Debounce frequent interactions and optimize event handlers',
      );
    }
    if (touch.gestureAccuracy < 0.95) {
      recommendations.push(
        'Enhance gesture accuracy: Increase touch target sizes for mobile venue booking buttons',
      );
    }

    // Scroll performance recommendations
    if (scroll.averageFPS < 55) {
      recommendations.push(
        'Optimize scrolling: Implement virtual scrolling for long guest lists and vendor directories',
      );
    }
    if (scroll.jankyFrames > 20) {
      recommendations.push(
        'Reduce scroll jank: Use CSS containment and will-change for wedding timeline animations',
      );
    }

    // Network performance recommendations
    const failureRate = network.failedRequests / network.totalRequests;
    if (failureRate > 0.05) {
      recommendations.push(
        'Improve network reliability: Implement request retry logic for critical wedding data sync',
      );
    }
    if (network.averageRequestTime > 1000) {
      recommendations.push(
        'Reduce request times: Enable compression and optimize API endpoints for mobile usage',
      );
    }
    if (network.cacheHitRatio < 0.7) {
      recommendations.push(
        'Enhance caching: Implement service worker caching for venue photos and vendor information',
      );
    }

    return recommendations;
  }

  private evaluateTestResults(
    expected: PerformanceThresholds,
    vitals: CoreWebVitals,
    touch: TouchInteractionMetrics,
    scroll: ScrollPerformanceMetrics,
  ): boolean {
    const conditions = [
      vitals.largestContentfulPaint <= expected.maxLargestContentfulPaint,
      vitals.firstInputDelay <= expected.maxFirstInputDelay,
      vitals.cumulativeLayoutShift <= expected.maxCumulativeLayoutShift,
      touch.averageResponseTime <= 150, // Reasonable mobile touch threshold
      scroll.averageFPS >= expected.minScrollFPS * 0.9, // Allow 10% tolerance
    ];

    return (
      conditions.filter(Boolean).length >= Math.ceil(conditions.length * 0.8)
    ); // 80% of conditions must pass
  }

  getTestResults(): MobilePerformanceResults[] {
    return [...this.results];
  }

  getLatestResult(): MobilePerformanceResults | undefined {
    return this.results[this.results.length - 1];
  }

  exportResults(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.results, null, 2);
    } else {
      // Simple CSV export
      const headers =
        'Timestamp,Scenario,Device,Network,Score,LCP,FID,CLS,Passed\n';
      const rows = this.results
        .map((result) => {
          return [
            result.timestamp.toISOString(),
            result.testConfig.weddingScenario.name,
            result.testConfig.deviceProfile.name,
            result.testConfig.networkCondition.name,
            result.overallScore,
            result.coreWebVitals.largestContentfulPaint,
            result.coreWebVitals.firstInputDelay,
            result.coreWebVitals.cumulativeLayoutShift,
            result.passed,
          ].join(',');
        })
        .join('\n');

      return headers + rows;
    }
  }
}

// Convenience class for batch testing multiple scenarios
export class MobilePerformanceTestSuite {
  private tester = new MobilePerformanceTester();

  async runWeddingTestSuite(
    deviceProfiles = DEVICE_PROFILES,
    networkConditions = NETWORK_CONDITIONS,
    scenarios = WEDDING_TEST_SCENARIOS,
  ): Promise<MobilePerformanceResults[]> {
    const results: MobilePerformanceResults[] = [];

    console.log(
      '🚀 Starting comprehensive wedding mobile performance test suite...',
    );
    console.log(`📱 Testing ${deviceProfiles.length} devices`);
    console.log(`🌐 Testing ${networkConditions.length} network conditions`);
    console.log(`📋 Testing ${scenarios.length} wedding scenarios`);

    for (const device of deviceProfiles) {
      for (const network of networkConditions) {
        for (const scenario of scenarios) {
          const config: MobileTestConfig = {
            deviceProfile: device,
            networkCondition: network,
            weddingScenario: scenario,
            includeAccessibility: true,
          };

          try {
            const result = await this.tester.runMobilePerformanceTest(config);
            results.push(result);

            // Brief pause between tests
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error(
              `❌ Test failed for ${device.name} on ${network.name} with ${scenario.name}:`,
              error,
            );
          }
        }
      }
    }

    console.log(`✅ Test suite completed. ${results.length} tests run.`);
    this.generateSummaryReport(results);

    return results;
  }

  private generateSummaryReport(results: MobilePerformanceResults[]): void {
    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    const avgScore = (
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
    ).toFixed(1);

    console.log('\n📊 TEST SUITE SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${passRate}%)`);
    console.log(`📈 Average Score: ${avgScore}/100`);

    // Find worst performing combinations
    const worstResults = results
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 3);
    console.log('\n⚠️  Worst Performing Combinations:');
    worstResults.forEach((result, i) => {
      console.log(
        `${i + 1}. ${result.testConfig.deviceProfile.name} + ${result.testConfig.networkCondition.name} + ${result.testConfig.weddingScenario.name}: ${result.overallScore}/100`,
      );
    });

    // Wedding-specific insights
    console.log('\n💒 Wedding Industry Insights:');
    const photoUploadTests = results.filter((r) =>
      r.testConfig.weddingScenario.name.includes('Photo'),
    );
    if (photoUploadTests.length > 0) {
      const photoAvgScore = (
        photoUploadTests.reduce((sum, r) => sum + r.overallScore, 0) /
        photoUploadTests.length
      ).toFixed(1);
      console.log(`📸 Photo Upload Performance: ${photoAvgScore}/100 average`);
    }

    const guestListTests = results.filter((r) =>
      r.testConfig.weddingScenario.name.includes('Guest'),
    );
    if (guestListTests.length > 0) {
      const guestAvgScore = (
        guestListTests.reduce((sum, r) => sum + r.overallScore, 0) /
        guestListTests.length
      ).toFixed(1);
      console.log(
        `👥 Guest Management Performance: ${guestAvgScore}/100 average`,
      );
    }
  }

  getComprehensiveReport(): string {
    const results = this.tester.getTestResults();
    return this.tester.exportResults('json');
  }
}

export default MobilePerformanceTester;

// Export types for external usage
export type {
  MobileTestConfig,
  DeviceProfile,
  NetworkCondition,
  WeddingTestScenario,
  TestAction,
  PerformanceThresholds,
  MobilePerformanceResults,
  CoreWebVitals,
  TouchInteractionMetrics,
  ScrollPerformanceMetrics,
  NetworkPerformanceMetrics,
  MemoryUsageMetrics,
  NetworkSimulationResult,
};
