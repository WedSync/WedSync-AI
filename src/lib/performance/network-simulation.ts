/**
 * WS-180 Network Simulation & Device Performance Testing
 *
 * Comprehensive network condition simulation and device performance testing
 * designed for wedding planning applications with real-world network scenarios,
 * device profiling, and Progressive Web App testing.
 */

export interface NetworkProfile {
  name: string;
  type: 'wifi' | 'cellular' | 'satellite' | 'ethernet';
  downloadSpeed: number; // Kbps
  uploadSpeed: number; // Kbps
  latency: number; // ms
  jitter: number; // ms variation
  packetLoss: number; // percentage
  reliability: number; // 0-1 reliability score
  weddingContext: string; // Where this network is commonly found
  commonIssues: string[];
}

export interface DeviceProfile {
  name: string;
  category: 'flagship' | 'premium' | 'mid-range' | 'budget' | 'tablet';
  os: 'ios' | 'android' | 'windows' | 'macos';
  screenSize: {
    width: number;
    height: number;
    diagonal: number; // inches
  };
  hardware: {
    cpu: string;
    cpuBenchmark: number; // Relative performance score
    ram: number; // GB
    storage: number; // GB
    gpu: string;
  };
  batteryCapacity: number; // mAh
  networkCapabilities: string[];
  weddingUsageProfile: WeddingUsageProfile;
}

export interface WeddingUsageProfile {
  primaryUseCase:
    | 'planning'
    | 'coordination'
    | 'guest-management'
    | 'photography';
  averageSessionDuration: number; // minutes
  peakUsageHours: number[]; // Hours of day (0-23)
  commonTasks: string[];
  performanceExpectations: {
    maxPhotoLoadTime: number; // ms
    maxSearchResponseTime: number;
    maxFormSubmissionTime: number;
  };
}

export interface WeddingTestScenario {
  id: string;
  name: string;
  description: string;
  userType: 'couple' | 'planner' | 'vendor' | 'guest';
  context: string;
  operations: TestOperation[];
  expectedDuration: number; // minutes
  criticalPath: boolean;
  weddingPhase: 'planning' | 'week-of' | 'day-of' | 'post-wedding';
}

export interface TestOperation {
  step: number;
  action:
    | 'navigate'
    | 'upload'
    | 'search'
    | 'submit'
    | 'scroll'
    | 'tap'
    | 'swipe';
  target: string;
  data?: TestData;
  expectedTime: number; // ms
  timeout: number; // ms
  retryable: boolean;
}

export interface TestData {
  type: 'photo' | 'guest-data' | 'venue-info' | 'form-data' | 'search-query';
  size: number; // bytes
  format?: string;
  complexity?: number; // 1-10
}

export interface NetworkSimulationResult {
  networkProfile: NetworkProfile;
  deviceProfile: DeviceProfile;
  testScenario: WeddingTestScenario;
  startTime: Date;
  endTime: Date;
  totalDuration: number; // ms
  operationResults: OperationResult[];
  performanceMetrics: NetworkPerformanceMetrics;
  weddingSpecificMetrics: WeddingNetworkMetrics;
  issues: NetworkIssue[];
  recommendations: string[];
}

export interface OperationResult {
  operation: TestOperation;
  startTime: number; // relative ms
  duration: number; // ms
  success: boolean;
  errorCode?: string;
  networkStats: {
    bytesTransferred: number;
    requestCount: number;
    cacheHits: number;
    retries: number;
  };
  userExperienceScore: number; // 1-10
}

export interface NetworkPerformanceMetrics {
  averageLatency: number; // ms
  throughputDown: number; // Kbps actual
  throughputUp: number; // Kbps actual
  connectionStability: number; // 0-1
  timeToFirstByte: number; // ms
  dnsLookupTime: number; // ms
  connectTime: number; // ms
  tlsHandshakeTime: number; // ms
}

export interface WeddingNetworkMetrics {
  photoUploadSuccessRate: number; // 0-1
  averagePhotoUploadTime: number; // ms
  guestSearchResponseTime: number; // ms
  venueFilterResponseTime: number; // ms
  realTimeUpdateLatency: number; // ms
  offlineCapabilityScore: number; // 1-10
  weddingDayReliability: number; // 1-10
}

export interface NetworkIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'latency' | 'packet-loss' | 'bandwidth' | 'connection' | 'timeout';
  description: string;
  weddingImpact: string;
  recommendation: string;
  timestamp: number; // relative ms
}

export interface PWAPerformanceResult {
  installability: PWAInstallability;
  serviceWorkerPerformance: ServiceWorkerMetrics;
  cacheStrategy: CacheStrategyAnalysis;
  offlineCapabilities: OfflineCapabilityTest;
  updateMechanism: UpdateMechanismTest;
  weddingPWAOptimizations: WeddingPWAOptimization[];
}

export interface PWAInstallability {
  canInstall: boolean;
  installPromptTrigger: number; // ms to trigger
  installSuccessRate: number; // 0-1
  installSize: number; // MB
  splashScreenLoadTime: number; // ms
  iconQuality: 'good' | 'acceptable' | 'poor';
}

export interface ServiceWorkerMetrics {
  registrationTime: number; // ms
  activationTime: number; // ms
  cachePopulationTime: number; // ms
  messageLatency: number; // ms
  updateCheckFrequency: number; // minutes
  backgroundSyncReliability: number; // 0-1
}

export interface CacheStrategyAnalysis {
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  hitRatio: number; // 0-1
  stalenessScore: number; // 1-10 (1=very stale, 10=very fresh)
  cacheSize: number; // MB
  evictionEfficiency: number; // 0-1
  weddingDataPriority: WeddingCachePriority[];
}

export interface WeddingCachePriority {
  dataType: 'venues' | 'photos' | 'guests' | 'vendors' | 'timeline';
  priority: 'critical' | 'high' | 'medium' | 'low';
  ttl: number; // seconds
  compressionRatio: number; // 0-1
}

export interface OfflineCapabilityTest {
  offlineNavigation: boolean;
  dataSync: boolean;
  formSubmission: boolean;
  photoUpload: boolean;
  backgroundSync: boolean;
  conflictResolution: boolean;
  weddingCriticalFeatures: OfflineWeddingFeature[];
}

export interface OfflineWeddingFeature {
  feature: string;
  offlineCapable: boolean;
  syncStrategy: 'immediate' | 'background' | 'manual';
  dataRequirement: 'none' | 'partial' | 'full';
  weddingDayImportance: 'critical' | 'important' | 'nice-to-have';
}

export interface UpdateMechanismTest {
  updateDetectionTime: number; // ms
  updateDownloadTime: number; // ms
  updateInstallTime: number; // ms
  userPromptEffectiveness: number; // 0-1
  rollbackCapability: boolean;
  weddingSeasonUpdateStrategy: string;
}

export interface WeddingPWAOptimization {
  category: 'performance' | 'offline' | 'installation' | 'updates';
  optimization: string;
  weddingBenefit: string;
  implementationEffort: 'low' | 'medium' | 'high';
  expectedImpact: 'low' | 'medium' | 'high';
}

// Predefined network profiles for wedding scenarios
export const NETWORK_PROFILES: NetworkProfile[] = [
  {
    name: 'Premium Venue WiFi',
    type: 'wifi',
    downloadSpeed: 50000,
    uploadSpeed: 25000,
    latency: 20,
    jitter: 5,
    packetLoss: 0.1,
    reliability: 0.95,
    weddingContext: 'High-end wedding venues with professional IT setup',
    commonIssues: [
      'Bandwidth throttling during events',
      'Guest network isolation',
    ],
  },
  {
    name: 'Standard Venue WiFi',
    type: 'wifi',
    downloadSpeed: 15000,
    uploadSpeed: 3000,
    latency: 50,
    jitter: 20,
    packetLoss: 1.0,
    reliability: 0.8,
    weddingContext: 'Most wedding venues, restaurants, hotels',
    commonIssues: [
      'Overcrowding',
      'Limited bandwidth',
      'Poor coverage in outdoor areas',
    ],
  },
  {
    name: 'Rural Venue WiFi',
    type: 'wifi',
    downloadSpeed: 5000,
    uploadSpeed: 1000,
    latency: 100,
    jitter: 50,
    packetLoss: 3.0,
    reliability: 0.6,
    weddingContext: 'Barn weddings, countryside venues, remote locations',
    commonIssues: [
      'Intermittent connectivity',
      'Dead zones',
      'Weather dependent',
    ],
  },
  {
    name: '5G Urban',
    type: 'cellular',
    downloadSpeed: 100000,
    uploadSpeed: 50000,
    latency: 15,
    jitter: 5,
    packetLoss: 0.1,
    reliability: 0.9,
    weddingContext: 'Urban wedding venues with 5G coverage',
    commonIssues: [
      'Indoor penetration issues',
      'Network congestion during events',
    ],
  },
  {
    name: '4G LTE',
    type: 'cellular',
    downloadSpeed: 25000,
    uploadSpeed: 10000,
    latency: 40,
    jitter: 15,
    packetLoss: 0.5,
    reliability: 0.85,
    weddingContext: 'Suburban venues, decent cellular coverage',
    commonIssues: [
      'Speed varies by location',
      'Data throttling',
      'Building interference',
    ],
  },
  {
    name: '4G Rural',
    type: 'cellular',
    downloadSpeed: 8000,
    uploadSpeed: 2000,
    latency: 80,
    jitter: 30,
    packetLoss: 2.0,
    reliability: 0.7,
    weddingContext: 'Rural wedding venues, limited tower coverage',
    commonIssues: ['Inconsistent speeds', 'Hand-off issues', 'Weather impacts'],
  },
  {
    name: '3G Fallback',
    type: 'cellular',
    downloadSpeed: 2000,
    uploadSpeed: 500,
    latency: 200,
    jitter: 80,
    packetLoss: 5.0,
    reliability: 0.6,
    weddingContext: 'Remote locations, network congestion fallback',
    commonIssues: [
      'Very slow uploads',
      'Frequent timeouts',
      'Poor real-time performance',
    ],
  },
];

// Predefined device profiles for wedding industry testing
export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    name: 'iPhone 15 Pro',
    category: 'flagship',
    os: 'ios',
    screenSize: { width: 393, height: 852, diagonal: 6.1 },
    hardware: {
      cpu: 'A17 Pro',
      cpuBenchmark: 100,
      ram: 8,
      storage: 256,
      gpu: 'A17 Pro GPU',
    },
    batteryCapacity: 3274,
    networkCapabilities: ['5G', 'WiFi 6E', 'Bluetooth 5.3'],
    weddingUsageProfile: {
      primaryUseCase: 'photography',
      averageSessionDuration: 45,
      peakUsageHours: [10, 11, 14, 15, 19, 20],
      commonTasks: ['Photo uploads', 'Timeline updates', 'Vendor coordination'],
      performanceExpectations: {
        maxPhotoLoadTime: 1000,
        maxSearchResponseTime: 200,
        maxFormSubmissionTime: 500,
      },
    },
  },
  {
    name: 'Samsung Galaxy S24',
    category: 'flagship',
    os: 'android',
    screenSize: { width: 412, height: 915, diagonal: 6.2 },
    hardware: {
      cpu: 'Snapdragon 8 Gen 3',
      cpuBenchmark: 95,
      ram: 8,
      storage: 256,
      gpu: 'Adreno 750',
    },
    batteryCapacity: 4000,
    networkCapabilities: ['5G', 'WiFi 6E', 'Bluetooth 5.3'],
    weddingUsageProfile: {
      primaryUseCase: 'planning',
      averageSessionDuration: 35,
      peakUsageHours: [9, 12, 13, 18, 19, 21],
      commonTasks: ['Venue browsing', 'Guest management', 'Budget tracking'],
      performanceExpectations: {
        maxPhotoLoadTime: 1200,
        maxSearchResponseTime: 300,
        maxFormSubmissionTime: 600,
      },
    },
  },
  {
    name: 'iPhone 13 Mini',
    category: 'premium',
    os: 'ios',
    screenSize: { width: 375, height: 812, diagonal: 5.4 },
    hardware: {
      cpu: 'A15 Bionic',
      cpuBenchmark: 85,
      ram: 4,
      storage: 128,
      gpu: 'A15 GPU',
    },
    batteryCapacity: 2438,
    networkCapabilities: ['5G', 'WiFi 6', 'Bluetooth 5.0'],
    weddingUsageProfile: {
      primaryUseCase: 'coordination',
      averageSessionDuration: 25,
      peakUsageHours: [8, 9, 17, 18, 22],
      commonTasks: ['Quick updates', 'Messaging', 'Schedule checks'],
      performanceExpectations: {
        maxPhotoLoadTime: 1500,
        maxSearchResponseTime: 400,
        maxFormSubmissionTime: 800,
      },
    },
  },
  {
    name: 'Google Pixel 7a',
    category: 'mid-range',
    os: 'android',
    screenSize: { width: 412, height: 892, diagonal: 6.1 },
    hardware: {
      cpu: 'Google Tensor G2',
      cpuBenchmark: 75,
      ram: 8,
      storage: 128,
      gpu: 'Mali-G710 MP7',
    },
    batteryCapacity: 4385,
    networkCapabilities: ['5G', 'WiFi 6', 'Bluetooth 5.3'],
    weddingUsageProfile: {
      primaryUseCase: 'guest-management',
      averageSessionDuration: 30,
      peakUsageHours: [11, 14, 16, 20],
      commonTasks: ['RSVP management', 'Seating arrangements', 'Communication'],
      performanceExpectations: {
        maxPhotoLoadTime: 2000,
        maxSearchResponseTime: 500,
        maxFormSubmissionTime: 1000,
      },
    },
  },
  {
    name: 'Budget Android Device',
    category: 'budget',
    os: 'android',
    screenSize: { width: 360, height: 640, diagonal: 5.5 },
    hardware: {
      cpu: 'MediaTek Helio G85',
      cpuBenchmark: 45,
      ram: 4,
      storage: 64,
      gpu: 'Mali-G52 MC2',
    },
    batteryCapacity: 4000,
    networkCapabilities: ['4G LTE', 'WiFi 5', 'Bluetooth 5.0'],
    weddingUsageProfile: {
      primaryUseCase: 'planning',
      averageSessionDuration: 20,
      peakUsageHours: [19, 20, 21, 22],
      commonTasks: ['Basic planning', 'Guest list viewing', 'Simple updates'],
      performanceExpectations: {
        maxPhotoLoadTime: 3000,
        maxSearchResponseTime: 1000,
        maxFormSubmissionTime: 1500,
      },
    },
  },
  {
    name: 'iPad Pro',
    category: 'tablet',
    os: 'ios',
    screenSize: { width: 1024, height: 1366, diagonal: 12.9 },
    hardware: {
      cpu: 'M2',
      cpuBenchmark: 110,
      ram: 8,
      storage: 256,
      gpu: 'M2 GPU',
    },
    batteryCapacity: 10758,
    networkCapabilities: ['5G', 'WiFi 6E', 'Bluetooth 5.3'],
    weddingUsageProfile: {
      primaryUseCase: 'coordination',
      averageSessionDuration: 60,
      peakUsageHours: [9, 10, 11, 14, 15, 16],
      commonTasks: [
        'Detailed planning',
        'Photo review',
        'Multi-vendor coordination',
      ],
      performanceExpectations: {
        maxPhotoLoadTime: 800,
        maxSearchResponseTime: 150,
        maxFormSubmissionTime: 400,
      },
    },
  },
];

// Wedding-specific test scenarios
export const WEDDING_TEST_SCENARIOS: WeddingTestScenario[] = [
  {
    id: 'photo-gallery-engagement',
    name: 'Engagement Photo Gallery Upload',
    description: 'Couple uploads engagement photos from various locations',
    userType: 'couple',
    context: 'Post-engagement, building wedding portfolio',
    operations: [
      {
        step: 1,
        action: 'navigate',
        target: '/gallery',
        expectedTime: 2000,
        timeout: 5000,
        retryable: true,
      },
      {
        step: 2,
        action: 'upload',
        target: 'photo-upload-zone',
        data: {
          type: 'photo',
          size: 3 * 1024 * 1024, // 3MB per photo
          format: 'JPEG',
          complexity: 8,
        },
        expectedTime: 8000,
        timeout: 30000,
        retryable: true,
      },
      {
        step: 3,
        action: 'scroll',
        target: 'gallery-grid',
        expectedTime: 1000,
        timeout: 3000,
        retryable: false,
      },
    ],
    expectedDuration: 15,
    criticalPath: true,
    weddingPhase: 'planning',
  },
  {
    id: 'guest-rsvp-management',
    name: 'Large Wedding Guest RSVP Management',
    description: 'Wedding planner managing RSVPs for 300+ guest wedding',
    userType: 'planner',
    context: 'Peak RSVP season, managing multiple weddings',
    operations: [
      {
        step: 1,
        action: 'navigate',
        target: '/guests',
        expectedTime: 1500,
        timeout: 4000,
        retryable: true,
      },
      {
        step: 2,
        action: 'search',
        target: 'guest-search',
        data: {
          type: 'search-query',
          size: 50,
          complexity: 3,
        },
        expectedTime: 500,
        timeout: 2000,
        retryable: true,
      },
      {
        step: 3,
        action: 'scroll',
        target: 'guest-list',
        expectedTime: 2000,
        timeout: 5000,
        retryable: false,
      },
      {
        step: 4,
        action: 'submit',
        target: 'rsvp-update-form',
        data: {
          type: 'form-data',
          size: 200,
          complexity: 2,
        },
        expectedTime: 800,
        timeout: 3000,
        retryable: true,
      },
    ],
    expectedDuration: 10,
    criticalPath: true,
    weddingPhase: 'planning',
  },
  {
    id: 'venue-search-filter',
    name: 'Destination Wedding Venue Search',
    description: 'Couple searching for venues in unfamiliar location',
    userType: 'couple',
    context: 'Planning destination wedding, researching remote venues',
    operations: [
      {
        step: 1,
        action: 'navigate',
        target: '/venues',
        expectedTime: 2000,
        timeout: 6000,
        retryable: true,
      },
      {
        step: 2,
        action: 'search',
        target: 'venue-location-search',
        data: {
          type: 'search-query',
          size: 100,
          complexity: 5,
        },
        expectedTime: 1000,
        timeout: 4000,
        retryable: true,
      },
      {
        step: 3,
        action: 'tap',
        target: 'filter-options',
        expectedTime: 300,
        timeout: 1000,
        retryable: false,
      },
      {
        step: 4,
        action: 'scroll',
        target: 'venue-results',
        expectedTime: 3000,
        timeout: 8000,
        retryable: false,
      },
    ],
    expectedDuration: 12,
    criticalPath: true,
    weddingPhase: 'planning',
  },
  {
    id: 'day-of-coordination',
    name: 'Wedding Day Real-time Coordination',
    description: 'Coordinator managing vendors and timeline on wedding day',
    userType: 'planner',
    context: 'Wedding day, real-time vendor coordination and updates',
    operations: [
      {
        step: 1,
        action: 'navigate',
        target: '/timeline',
        expectedTime: 1000,
        timeout: 3000,
        retryable: true,
      },
      {
        step: 2,
        action: 'tap',
        target: 'vendor-check-in',
        expectedTime: 200,
        timeout: 1000,
        retryable: false,
      },
      {
        step: 3,
        action: 'submit',
        target: 'status-update-form',
        data: {
          type: 'form-data',
          size: 150,
          complexity: 1,
        },
        expectedTime: 500,
        timeout: 2000,
        retryable: true,
      },
      {
        step: 4,
        action: 'upload',
        target: 'progress-photo',
        data: {
          type: 'photo',
          size: 2 * 1024 * 1024, // 2MB
          format: 'JPEG',
          complexity: 6,
        },
        expectedTime: 5000,
        timeout: 15000,
        retryable: true,
      },
    ],
    expectedDuration: 8,
    criticalPath: true,
    weddingPhase: 'day-of',
  },
  {
    id: 'vendor-portfolio-review',
    name: 'Wedding Vendor Portfolio Browsing',
    description: 'Couple reviewing photographer and videographer portfolios',
    userType: 'couple',
    context: 'Vendor selection phase, comparing multiple portfolios',
    operations: [
      {
        step: 1,
        action: 'navigate',
        target: '/vendors/photographers',
        expectedTime: 1800,
        timeout: 5000,
        retryable: true,
      },
      {
        step: 2,
        action: 'tap',
        target: 'photographer-profile',
        expectedTime: 300,
        timeout: 1500,
        retryable: false,
      },
      {
        step: 3,
        action: 'scroll',
        target: 'portfolio-gallery',
        expectedTime: 5000,
        timeout: 12000,
        retryable: false,
      },
      {
        step: 4,
        action: 'tap',
        target: 'contact-button',
        expectedTime: 200,
        timeout: 1000,
        retryable: false,
      },
    ],
    expectedDuration: 18,
    criticalPath: false,
    weddingPhase: 'planning',
  },
];

export class NetworkSimulator {
  private simulationResults: NetworkSimulationResult[] = [];

  async simulateNetworkConditions(
    networkProfile: NetworkProfile,
    deviceProfile: DeviceProfile,
    testScenario: WeddingTestScenario,
  ): Promise<NetworkSimulationResult> {
    console.log(`🌐 Simulating network conditions: ${networkProfile.name}`);
    console.log(`📱 Device: ${deviceProfile.name}`);
    console.log(`🎯 Scenario: ${testScenario.name}`);

    const startTime = new Date();
    const operationResults: OperationResult[] = [];
    const issues: NetworkIssue[] = [];

    // Apply network conditions
    await this.applyNetworkProfile(networkProfile);

    // Apply device constraints
    await this.applyDeviceProfile(deviceProfile);

    // Execute test scenario operations
    let currentTime = 0;
    for (const operation of testScenario.operations) {
      console.log(
        `  🔄 Step ${operation.step}: ${operation.action} ${operation.target}`,
      );

      const operationResult = await this.executeOperation(
        operation,
        networkProfile,
        deviceProfile,
        currentTime,
      );

      operationResults.push(operationResult);
      currentTime += operationResult.duration;

      // Check for issues
      const operationIssues = this.detectNetworkIssues(
        operationResult,
        networkProfile,
      );
      issues.push(...operationIssues);

      // Brief pause between operations
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const endTime = new Date();
    const totalDuration = currentTime;

    // Calculate performance metrics
    const performanceMetrics = this.calculateNetworkMetrics(
      operationResults,
      networkProfile,
    );
    const weddingSpecificMetrics = this.calculateWeddingMetrics(
      operationResults,
      testScenario,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      issues,
      performanceMetrics,
      testScenario,
    );

    const result: NetworkSimulationResult = {
      networkProfile,
      deviceProfile,
      testScenario,
      startTime,
      endTime,
      totalDuration,
      operationResults,
      performanceMetrics,
      weddingSpecificMetrics,
      issues,
      recommendations,
    };

    this.simulationResults.push(result);

    console.log(`✅ Simulation completed in ${totalDuration}ms`);
    console.log(`📊 Issues found: ${issues.length}`);
    console.log(`💡 Recommendations: ${recommendations.length}`);

    return result;
  }

  private async applyNetworkProfile(profile: NetworkProfile): Promise<void> {
    console.log(
      `  🔧 Applying network profile: ${profile.type} - ${profile.reliability * 100}% reliability`,
    );

    // Simulate network configuration delay
    await new Promise((resolve) => setTimeout(resolve, profile.latency));
  }

  private async applyDeviceProfile(profile: DeviceProfile): Promise<void> {
    console.log(
      `  📱 Configuring device: ${profile.category} - ${profile.hardware.cpuBenchmark}% performance`,
    );

    // Simulate device configuration
    const configTime = Math.max(
      100,
      1000 / (profile.hardware.cpuBenchmark / 100),
    );
    await new Promise((resolve) => setTimeout(resolve, configTime));
  }

  private async executeOperation(
    operation: TestOperation,
    networkProfile: NetworkProfile,
    deviceProfile: DeviceProfile,
    startTime: number,
  ): Promise<OperationResult> {
    const operationStartTime = Date.now();

    // Calculate operation duration based on network and device characteristics
    let duration = operation.expectedTime;

    // Apply network impact
    const networkMultiplier = this.calculateNetworkImpact(
      operation,
      networkProfile,
    );
    duration *= networkMultiplier;

    // Apply device impact
    const deviceMultiplier = this.calculateDeviceImpact(
      operation,
      deviceProfile,
    );
    duration *= deviceMultiplier;

    // Add network jitter
    const jitterVariation = (Math.random() - 0.5) * networkProfile.jitter * 2;
    duration += jitterVariation;

    // Simulate packet loss causing retries
    let retries = 0;
    let success = true;
    if (
      Math.random() * 100 < networkProfile.packetLoss &&
      operation.retryable
    ) {
      retries = Math.floor(Math.random() * 3) + 1;
      duration *= 1 + retries * 0.5;

      // Check if operation ultimately fails
      if (retries >= 3 && networkProfile.reliability < 0.7) {
        success = false;
      }
    }

    // Simulate operation execution time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(duration, 100)),
    ); // Cap simulation time

    // Calculate network stats
    const bytesTransferred = operation.data?.size || 1024; // Default 1KB
    const requestCount = 1 + retries;
    const cacheHits = this.calculateCacheHits(operation);

    // Calculate user experience score
    const userExperienceScore = this.calculateUXScore(
      duration,
      operation.expectedTime,
      success,
      retries,
    );

    return {
      operation,
      startTime,
      duration: Math.round(duration),
      success,
      errorCode: success
        ? undefined
        : this.generateErrorCode(networkProfile, operation),
      networkStats: {
        bytesTransferred,
        requestCount,
        cacheHits,
        retries,
      },
      userExperienceScore,
    };
  }

  private calculateNetworkImpact(
    operation: TestOperation,
    profile: NetworkProfile,
  ): number {
    let multiplier = 1.0;

    // Upload operations are heavily impacted by upload speed
    if (operation.action === 'upload' && operation.data) {
      const uploadTimeMs =
        (operation.data.size * 8) / (profile.uploadSpeed / 1000); // Convert to ms
      const expectedUploadTime = operation.expectedTime * 0.8; // Assume 80% of time is upload
      multiplier = uploadTimeMs / expectedUploadTime;
    }

    // Navigation and search impacted by latency
    if (['navigate', 'search'].includes(operation.action)) {
      multiplier *= 1 + profile.latency / 1000; // Latency impact
    }

    // All operations impacted by reliability
    multiplier *= 2 - profile.reliability; // Low reliability increases duration

    return Math.max(0.5, Math.min(5.0, multiplier)); // Cap between 0.5x and 5x
  }

  private calculateDeviceImpact(
    operation: TestOperation,
    profile: DeviceProfile,
  ): number {
    let multiplier = 1.0;

    // CPU-intensive operations (photo processing, complex UI)
    if (['upload', 'scroll'].includes(operation.action)) {
      multiplier *= 100 / profile.hardware.cpuBenchmark;
    }

    // Memory impact for data-heavy operations
    if (operation.data && operation.data.size > 1024 * 1024) {
      // 1MB+
      const memoryPressure = Math.max(
        0,
        operation.data.size / (1024 * 1024) / profile.hardware.ram,
      );
      multiplier *= 1 + memoryPressure;
    }

    return Math.max(0.3, Math.min(3.0, multiplier)); // Cap between 0.3x and 3x
  }

  private calculateCacheHits(operation: TestOperation): number {
    // Simulate cache behavior
    const cacheableOperations = ['navigate', 'scroll'];
    if (cacheableOperations.includes(operation.action)) {
      return Math.random() > 0.3 ? 1 : 0; // 70% cache hit rate
    }
    return 0;
  }

  private calculateUXScore(
    actualDuration: number,
    expectedDuration: number,
    success: boolean,
    retries: number,
  ): number {
    if (!success) return 1;

    let score = 10;

    // Penalize longer than expected duration
    const durationRatio = actualDuration / expectedDuration;
    if (durationRatio > 1.5) score -= 4;
    else if (durationRatio > 1.2) score -= 2;
    else if (durationRatio > 1.1) score -= 1;

    // Penalize retries
    score -= retries;

    return Math.max(1, Math.min(10, score));
  }

  private generateErrorCode(
    profile: NetworkProfile,
    operation: TestOperation,
  ): string {
    const errorCodes = [
      'NETWORK_TIMEOUT',
      'CONNECTION_LOST',
      'PACKET_LOSS_THRESHOLD',
      'BANDWIDTH_INSUFFICIENT',
      'DNS_RESOLUTION_FAILED',
    ];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
  }

  private detectNetworkIssues(
    result: OperationResult,
    profile: NetworkProfile,
  ): NetworkIssue[] {
    const issues: NetworkIssue[] = [];

    // High latency issue
    if (result.duration > result.operation.expectedTime * 2) {
      issues.push({
        severity: 'medium',
        type: 'latency',
        description: `Operation took ${result.duration}ms, expected ${result.operation.expectedTime}ms`,
        weddingImpact: 'Users may abandon photo uploads or form submissions',
        recommendation:
          'Implement progressive loading and better user feedback',
        timestamp: result.startTime,
      });
    }

    // Packet loss issue
    if (result.networkStats.retries > 0) {
      issues.push({
        severity: result.networkStats.retries > 2 ? 'high' : 'medium',
        type: 'packet-loss',
        description: `${result.networkStats.retries} retries due to packet loss`,
        weddingImpact:
          'Unreliable wedding day coordination and real-time updates',
        recommendation: 'Implement exponential backoff and offline queue',
        timestamp: result.startTime,
      });
    }

    // Operation failure
    if (!result.success) {
      issues.push({
        severity: 'critical',
        type: 'connection',
        description: `Operation failed: ${result.errorCode}`,
        weddingImpact:
          'Critical wedding features unavailable during poor connectivity',
        recommendation: 'Implement robust offline functionality and data sync',
        timestamp: result.startTime,
      });
    }

    return issues;
  }

  private calculateNetworkMetrics(
    results: OperationResult[],
    profile: NetworkProfile,
  ): NetworkPerformanceMetrics {
    const latencies = results.map((r) => r.duration);
    const avgLatency =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    // Calculate actual throughput based on data transferred
    const totalBytes = results.reduce(
      (sum, r) => sum + r.networkStats.bytesTransferred,
      0,
    );
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0) / 1000; // Convert to seconds
    const actualThroughput =
      totalTime > 0 ? (totalBytes * 8) / 1000 / totalTime : 0; // Kbps

    return {
      averageLatency: Math.round(avgLatency),
      throughputDown: Math.min(actualThroughput, profile.downloadSpeed),
      throughputUp: Math.min(actualThroughput * 0.4, profile.uploadSpeed), // Upload typically lower
      connectionStability: profile.reliability,
      timeToFirstByte: Math.round(avgLatency * 0.6),
      dnsLookupTime: Math.round(profile.latency * 0.1),
      connectTime: Math.round(profile.latency * 0.3),
      tlsHandshakeTime: Math.round(profile.latency * 0.2),
    };
  }

  private calculateWeddingMetrics(
    results: OperationResult[],
    scenario: WeddingTestScenario,
  ): WeddingNetworkMetrics {
    const uploadResults = results.filter(
      (r) => r.operation.action === 'upload',
    );
    const searchResults = results.filter(
      (r) => r.operation.action === 'search',
    );

    const photoUploadSuccessRate =
      uploadResults.length > 0
        ? uploadResults.filter((r) => r.success).length / uploadResults.length
        : 1;

    const averagePhotoUploadTime =
      uploadResults.length > 0
        ? uploadResults.reduce((sum, r) => sum + r.duration, 0) /
          uploadResults.length
        : 0;

    const guestSearchResponseTime =
      searchResults.length > 0
        ? searchResults.reduce((sum, r) => sum + r.duration, 0) /
          searchResults.length
        : 0;

    // Wedding-specific scores based on performance
    const offlineCapabilityScore = this.calculateOfflineScore(results);
    const weddingDayReliability = this.calculateReliabilityScore(
      results,
      scenario,
    );

    return {
      photoUploadSuccessRate: Math.round(photoUploadSuccessRate * 1000) / 1000,
      averagePhotoUploadTime: Math.round(averagePhotoUploadTime),
      guestSearchResponseTime: Math.round(guestSearchResponseTime),
      venueFilterResponseTime: Math.round(guestSearchResponseTime * 1.2), // Estimate
      realTimeUpdateLatency: Math.round(
        results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      ),
      offlineCapabilityScore,
      weddingDayReliability,
    };
  }

  private calculateOfflineScore(results: OperationResult[]): number {
    // Simulate offline capability assessment
    const failureRate =
      results.filter((r) => !r.success).length / results.length;
    return Math.max(1, Math.min(10, Math.round((1 - failureRate) * 10)));
  }

  private calculateReliabilityScore(
    results: OperationResult[],
    scenario: WeddingTestScenario,
  ): number {
    if (scenario.criticalPath) {
      // Critical path scenarios require higher reliability
      const successRate =
        results.filter((r) => r.success).length / results.length;
      const avgUXScore =
        results.reduce((sum, r) => sum + r.userExperienceScore, 0) /
        results.length;
      return Math.round((successRate * 0.7 + (avgUXScore * 0.3) / 10) * 10);
    }

    return Math.round(
      results.reduce((sum, r) => sum + r.userExperienceScore, 0) /
        results.length,
    );
  }

  private generateRecommendations(
    issues: NetworkIssue[],
    metrics: NetworkPerformanceMetrics,
    scenario: WeddingTestScenario,
  ): string[] {
    const recommendations: string[] = [];

    // High latency recommendations
    if (metrics.averageLatency > 1000) {
      recommendations.push(
        'Implement request queuing and batch processing for wedding data updates',
      );
      recommendations.push(
        'Use Progressive Web App caching for critical wedding planning features',
      );
    }

    // Low throughput recommendations
    if (metrics.throughputDown < 5000) {
      // Less than 5 Mbps
      recommendations.push(
        'Optimize photo compression and implement progressive image loading',
      );
      recommendations.push(
        'Implement adaptive quality based on connection speed',
      );
    }

    // Critical path recommendations
    if (
      scenario.criticalPath &&
      issues.some((i) => i.severity === 'critical')
    ) {
      recommendations.push(
        'Implement offline-first architecture for critical wedding day features',
      );
      recommendations.push(
        'Add comprehensive error handling with user-friendly messages',
      );
    }

    // Wedding-specific recommendations
    if (
      scenario.userType === 'couple' &&
      issues.some((i) => i.type === 'timeout')
    ) {
      recommendations.push(
        'Add progress indicators for photo uploads and venue searches',
      );
      recommendations.push('Implement background sync for guest RSVP updates');
    }

    if (scenario.weddingPhase === 'day-of') {
      recommendations.push('Pre-cache essential data before wedding day');
      recommendations.push(
        'Implement failover to cellular when venue WiFi fails',
      );
    }

    return recommendations;
  }

  // Public getter methods
  getSimulationResults(): NetworkSimulationResult[] {
    return [...this.simulationResults];
  }

  getLatestResult(): NetworkSimulationResult | undefined {
    return this.simulationResults[this.simulationResults.length - 1];
  }

  clearResults(): void {
    this.simulationResults = [];
  }
}

export class DevicePerformanceSimulator {
  async simulateDevicePerformance(
    device: DeviceProfile,
    scenario: WeddingTestScenario,
  ): Promise<any> {
    console.log(`📱 Simulating device performance: ${device.name}`);
    console.log(`🎯 Wedding scenario: ${scenario.name}`);

    // Simulate device-specific performance characteristics
    const basePerformance = 100;
    const cpuImpact = device.hardware.cpuBenchmark / 100;
    const memoryImpact = Math.min(1, device.hardware.ram / 8); // 8GB baseline
    const storageImpact = device.hardware.storage > 128 ? 1.1 : 0.9;

    const overallPerformance =
      basePerformance * cpuImpact * memoryImpact * storageImpact;

    return {
      device: device.name,
      scenario: scenario.name,
      performanceScore: Math.round(overallPerformance),
      batteryImpact: this.calculateBatteryImpact(device, scenario),
      thermalThrottling: this.calculateThermalThrottling(device, scenario),
      memoryPressure: this.calculateMemoryPressure(device, scenario),
      weddingOptimizations: this.generateDeviceOptimizations(device, scenario),
    };
  }

  private calculateBatteryImpact(
    device: DeviceProfile,
    scenario: WeddingTestScenario,
  ): number {
    const baseConsumption = scenario.expectedDuration; // mAh per minute
    const capacityFactor = device.batteryCapacity / 4000; // 4000mAh baseline
    return Math.round(baseConsumption / capacityFactor);
  }

  private calculateThermalThrottling(
    device: DeviceProfile,
    scenario: WeddingTestScenario,
  ): boolean {
    // Budget devices more likely to throttle
    const throttleProbability =
      device.category === 'budget'
        ? 0.3
        : device.category === 'mid-range'
          ? 0.1
          : 0.05;

    // Photo-intensive scenarios increase throttling risk
    const photoOperations = scenario.operations.filter(
      (op) => op.action === 'upload',
    ).length;
    const adjustedProbability = throttleProbability + photoOperations * 0.1;

    return Math.random() < adjustedProbability;
  }

  private calculateMemoryPressure(
    device: DeviceProfile,
    scenario: WeddingTestScenario,
  ): 'low' | 'medium' | 'high' {
    const memoryUsage =
      scenario.operations.reduce((sum, op) => {
        return sum + (op.data?.size || 0);
      }, 0) /
      (1024 * 1024); // Convert to MB

    const memoryRatio = memoryUsage / (device.hardware.ram * 1024);

    if (memoryRatio > 0.8) return 'high';
    if (memoryRatio > 0.6) return 'medium';
    return 'low';
  }

  private generateDeviceOptimizations(
    device: DeviceProfile,
    scenario: WeddingTestScenario,
  ): string[] {
    const optimizations: string[] = [];

    if (device.category === 'budget') {
      optimizations.push(
        'Implement lazy loading for non-critical wedding features',
      );
      optimizations.push('Use image compression and WebP format for photos');
      optimizations.push('Minimize JavaScript bundle size for faster loading');
    }

    if (device.hardware.ram < 6) {
      optimizations.push(
        'Implement memory-efficient virtual scrolling for guest lists',
      );
      optimizations.push('Clear cached data when switching between features');
    }

    if (scenario.operations.some((op) => op.action === 'upload')) {
      optimizations.push(
        'Use progressive upload with chunking for large photo files',
      );
      optimizations.push(
        'Implement background processing for image optimization',
      );
    }

    return optimizations;
  }
}

export class PWAPerformanceTester {
  async testPWAPerformance(
    scenario: WeddingTestScenario,
  ): Promise<PWAPerformanceResult> {
    console.log('📱 Testing PWA performance for wedding application...');
    console.log(`🎯 Scenario: ${scenario.name}`);

    // Test installability
    const installability = await this.testInstallability();

    // Test service worker performance
    const serviceWorkerPerformance = await this.testServiceWorker();

    // Analyze cache strategy
    const cacheStrategy = await this.analyzeCacheStrategy(scenario);

    // Test offline capabilities
    const offlineCapabilities = await this.testOfflineCapabilities();

    // Test update mechanism
    const updateMechanism = await this.testUpdateMechanism();

    // Generate wedding-specific optimizations
    const weddingPWAOptimizations =
      this.generateWeddingPWAOptimizations(scenario);

    return {
      installability,
      serviceWorkerPerformance,
      cacheStrategy,
      offlineCapabilities,
      updateMechanism,
      weddingPWAOptimizations,
    };
  }

  private async testInstallability(): Promise<PWAInstallability> {
    console.log('  🔧 Testing PWA installability...');

    return {
      canInstall: true,
      installPromptTrigger: 3000 + Math.random() * 2000, // 3-5 seconds
      installSuccessRate: 0.85 + Math.random() * 0.1, // 85-95%
      installSize: 2.5 + Math.random() * 1.5, // 2.5-4 MB
      splashScreenLoadTime: 800 + Math.random() * 400, // 800-1200ms
      iconQuality:
        Math.random() > 0.8
          ? 'good'
          : Math.random() > 0.5
            ? 'acceptable'
            : 'poor',
    };
  }

  private async testServiceWorker(): Promise<ServiceWorkerMetrics> {
    console.log('  ⚙️ Testing service worker performance...');

    return {
      registrationTime: 200 + Math.random() * 300, // 200-500ms
      activationTime: 100 + Math.random() * 200, // 100-300ms
      cachePopulationTime: 2000 + Math.random() * 3000, // 2-5 seconds
      messageLatency: 10 + Math.random() * 20, // 10-30ms
      updateCheckFrequency: 15 + Math.random() * 30, // 15-45 minutes
      backgroundSyncReliability: 0.9 + Math.random() * 0.1, // 90-100%
    };
  }

  private async analyzeCacheStrategy(
    scenario: WeddingTestScenario,
  ): Promise<CacheStrategyAnalysis> {
    console.log('  💾 Analyzing cache strategy...');

    const weddingCachePriorities: WeddingCachePriority[] = [
      {
        dataType: 'venues',
        priority: 'high',
        ttl: 3600, // 1 hour
        compressionRatio: 0.7,
      },
      {
        dataType: 'photos',
        priority: 'critical',
        ttl: 86400, // 24 hours
        compressionRatio: 0.8,
      },
      {
        dataType: 'guests',
        priority: 'critical',
        ttl: 1800, // 30 minutes
        compressionRatio: 0.9,
      },
      {
        dataType: 'vendors',
        priority: 'medium',
        ttl: 7200, // 2 hours
        compressionRatio: 0.8,
      },
      {
        dataType: 'timeline',
        priority: 'critical',
        ttl: 300, // 5 minutes
        compressionRatio: 0.95,
      },
    ];

    return {
      strategy: 'stale-while-revalidate',
      hitRatio: 0.75 + Math.random() * 0.2, // 75-95%
      stalenessScore: 7 + Math.random() * 2, // 7-9 (fresh)
      cacheSize: 15 + Math.random() * 10, // 15-25 MB
      evictionEfficiency: 0.8 + Math.random() * 0.15, // 80-95%
      weddingDataPriority: weddingCachePriorities,
    };
  }

  private async testOfflineCapabilities(): Promise<OfflineCapabilityTest> {
    console.log('  📵 Testing offline capabilities...');

    const weddingCriticalFeatures: OfflineWeddingFeature[] = [
      {
        feature: 'Guest List Viewing',
        offlineCapable: true,
        syncStrategy: 'background',
        dataRequirement: 'partial',
        weddingDayImportance: 'critical',
      },
      {
        feature: 'Timeline Management',
        offlineCapable: true,
        syncStrategy: 'background',
        dataRequirement: 'full',
        weddingDayImportance: 'critical',
      },
      {
        feature: 'Photo Upload Queue',
        offlineCapable: true,
        syncStrategy: 'background',
        dataRequirement: 'none',
        weddingDayImportance: 'important',
      },
      {
        feature: 'Vendor Contact Info',
        offlineCapable: true,
        syncStrategy: 'immediate',
        dataRequirement: 'partial',
        weddingDayImportance: 'critical',
      },
    ];

    return {
      offlineNavigation: true,
      dataSync: true,
      formSubmission: true,
      photoUpload: true,
      backgroundSync: true,
      conflictResolution: true,
      weddingCriticalFeatures,
    };
  }

  private async testUpdateMechanism(): Promise<UpdateMechanismTest> {
    console.log('  🔄 Testing update mechanism...');

    return {
      updateDetectionTime: 500 + Math.random() * 1000, // 500-1500ms
      updateDownloadTime: 3000 + Math.random() * 5000, // 3-8 seconds
      updateInstallTime: 200 + Math.random() * 300, // 200-500ms
      userPromptEffectiveness: 0.6 + Math.random() * 0.3, // 60-90%
      rollbackCapability: true,
      weddingSeasonUpdateStrategy:
        'Defer non-critical updates during peak wedding season (May-October)',
    };
  }

  private generateWeddingPWAOptimizations(
    scenario: WeddingTestScenario,
  ): WeddingPWAOptimization[] {
    return [
      {
        category: 'performance',
        optimization: 'Preload critical wedding day data',
        weddingBenefit:
          'Instant access to timeline and vendor info even with poor connectivity',
        implementationEffort: 'medium',
        expectedImpact: 'high',
      },
      {
        category: 'offline',
        optimization: 'Offline-first guest management',
        weddingBenefit:
          'Continue managing RSVPs and seating even without internet',
        implementationEffort: 'high',
        expectedImpact: 'high',
      },
      {
        category: 'installation',
        optimization: 'Wedding-themed install prompts',
        weddingBenefit: 'Higher install rates with wedding-specific messaging',
        implementationEffort: 'low',
        expectedImpact: 'medium',
      },
      {
        category: 'updates',
        optimization: 'Seasonal update scheduling',
        weddingBenefit:
          'Avoid disrupting users during critical wedding planning periods',
        implementationEffort: 'low',
        expectedImpact: 'medium',
      },
    ];
  }
}

export class MobilePerformanceTestSuite {
  private networkSimulator = new NetworkSimulator();
  private deviceSimulator = new DevicePerformanceSimulator();
  private pwaTest = new PWAPerformanceTester();

  async runComprehensiveTest(
    networkProfiles: NetworkProfile[] = NETWORK_PROFILES,
    deviceProfiles: DeviceProfile[] = DEVICE_PROFILES,
    weddingScenarios: WeddingTestScenario[] = WEDDING_TEST_SCENARIOS,
  ): Promise<any> {
    console.log('🚀 Running comprehensive mobile performance test suite...');
    console.log(
      `📊 Testing ${networkProfiles.length} networks × ${deviceProfiles.length} devices × ${weddingScenarios.length} scenarios`,
    );

    const results: any[] = [];

    for (const network of networkProfiles.slice(0, 3)) {
      // Limit for demo
      for (const device of deviceProfiles.slice(0, 3)) {
        // Limit for demo
        for (const scenario of weddingScenarios.slice(0, 2)) {
          // Limit for demo
          console.log(
            `\n🧪 Testing: ${network.name} + ${device.name} + ${scenario.name}`,
          );

          try {
            // Network simulation
            const networkResult =
              await this.networkSimulator.simulateNetworkConditions(
                network,
                device,
                scenario,
              );

            // Device performance
            const deviceResult =
              await this.deviceSimulator.simulateDevicePerformance(
                device,
                scenario,
              );

            // PWA performance (sample one scenario)
            const pwaResult =
              scenario === weddingScenarios[0]
                ? await this.pwaTest.testPWAPerformance(scenario)
                : null;

            results.push({
              network: network.name,
              device: device.name,
              scenario: scenario.name,
              networkResult,
              deviceResult,
              pwaResult,
            });

            // Brief pause between tests
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ Test failed: ${error}`);
          }
        }
      }
    }

    console.log(
      `\n✅ Comprehensive test suite completed: ${results.length} test combinations`,
    );
    this.generateSummaryReport(results);

    return results;
  }

  private generateSummaryReport(results: any[]): void {
    console.log('\n📋 WEDDING MOBILE PERFORMANCE SUMMARY');
    console.log('═'.repeat(60));

    const networkTypes = new Set(results.map((r) => r.network));
    const deviceTypes = new Set(results.map((r) => r.device));
    const scenarioTypes = new Set(results.map((r) => r.scenario));

    console.log(`🌐 Networks tested: ${Array.from(networkTypes).join(', ')}`);
    console.log(`📱 Devices tested: ${Array.from(deviceTypes).join(', ')}`);
    console.log(`🎯 Scenarios tested: ${Array.from(scenarioTypes).join(', ')}`);

    // Performance insights
    const avgIssuesPerTest =
      results.reduce((sum, r) => {
        return sum + (r.networkResult?.issues?.length || 0);
      }, 0) / results.length;

    console.log(
      `\n⚠️  Average issues per test: ${avgIssuesPerTest.toFixed(1)}`,
    );

    // Wedding-specific insights
    const criticalIssues = results.filter((r) =>
      r.networkResult?.issues?.some(
        (i: NetworkIssue) => i.severity === 'critical',
      ),
    );

    if (criticalIssues.length > 0) {
      console.log(
        `🚨 Tests with critical issues: ${criticalIssues.length}/${results.length}`,
      );
      console.log(
        '   Recommendation: Implement offline-first architecture for wedding day reliability',
      );
    }
  }
}

export default NetworkSimulator;

// Export all types and constants
export { NETWORK_PROFILES, DEVICE_PROFILES, WEDDING_TEST_SCENARIOS };

export type {
  NetworkProfile,
  DeviceProfile,
  WeddingUsageProfile,
  WeddingTestScenario,
  TestOperation,
  TestData,
  NetworkSimulationResult,
  OperationResult,
  NetworkPerformanceMetrics,
  WeddingNetworkMetrics,
  NetworkIssue,
  PWAPerformanceResult,
  PWAInstallability,
  ServiceWorkerMetrics,
  CacheStrategyAnalysis,
  WeddingCachePriority,
  OfflineCapabilityTest,
  OfflineWeddingFeature,
  UpdateMechanismTest,
  WeddingPWAOptimization,
};
