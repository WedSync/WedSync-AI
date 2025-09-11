// Performance Testing Configuration for WS-257
export interface PerformanceTestConfig {
  targets: {
    dashboardLoading: number;
    realTimeUpdates: number;
    mobileTouch: number;
    apiResponse: number;
    cacheHitRate: number;
    uptime: number;
    bundleSize: number;
  };
  scenarios: {
    weddingDay: WeddingDayScenario;
    multiCloud: MultiCloudScenario;
    mobile: MobileScenario;
    resilience: ResilienceScenario;
  };
  thresholds: {
    errorRate: number;
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      rps: number;
      concurrent: number;
    };
  };
}

export interface WeddingDayScenario {
  concurrentUsers: number;
  weddingCount: number;
  guestsPerWedding: number;
  testDuration: string;
  rampUpTime: string;
  peakLoadDuration: string;
  rampDownTime: string;
}

export interface MultiCloudScenario {
  providers: ('aws' | 'azure' | 'gcp')[];
  regions: string[];
  failoverTimeout: number;
  loadBalancingTest: boolean;
  costOptimizationTest: boolean;
}

export interface MobileScenario {
  devices: {
    name: string;
    viewport: { width: number; height: number };
    userAgent: string;
    networkConditions: string;
  }[];
  batteryThresholds: {
    low: number;
    critical: number;
  };
  dataUsageLimits: {
    daily: number;
    session: number;
  };
}

export interface ResilienceScenario {
  failureInjection: {
    cacheFailure: boolean;
    dbConnectionFailure: boolean;
    apiFailure: boolean;
    networkFailure: boolean;
  };
  recoveryTime: number;
  gracefulDegradation: boolean;
}

// Default Performance Configuration
export const defaultPerformanceConfig: PerformanceTestConfig = {
  targets: {
    dashboardLoading: 2000, // 2s
    realTimeUpdates: 500,   // 500ms
    mobileTouch: 100,       // 100ms
    apiResponse: 200,       // 200ms p95
    cacheHitRate: 90,       // 90%
    uptime: 100,           // 100%
    bundleSize: 250        // 250KB
  },
  scenarios: {
    weddingDay: {
      concurrentUsers: 5000,
      weddingCount: 50,
      guestsPerWedding: 500,
      testDuration: '10m',
      rampUpTime: '2m',
      peakLoadDuration: '5m',
      rampDownTime: '3m'
    },
    multiCloud: {
      providers: ['aws', 'azure', 'gcp'],
      regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      failoverTimeout: 30000, // 30s
      loadBalancingTest: true,
      costOptimizationTest: true
    },
    mobile: {
      devices: [
        {
          name: 'iPhone SE',
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          networkConditions: '3g'
        },
        {
          name: 'iPhone 14 Pro',
          viewport: { width: 393, height: 852 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          networkConditions: '4g'
        },
        {
          name: 'Samsung Galaxy S21',
          viewport: { width: 384, height: 854 },
          userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
          networkConditions: '4g'
        }
      ],
      batteryThresholds: {
        low: 20,
        critical: 5
      },
      dataUsageLimits: {
        daily: 50, // 50MB
        session: 10 // 10MB
      }
    },
    resilience: {
      failureInjection: {
        cacheFailure: true,
        dbConnectionFailure: true,
        apiFailure: true,
        networkFailure: true
      },
      recoveryTime: 5000, // 5s
      gracefulDegradation: true
    }
  },
  thresholds: {
    errorRate: 0.1, // 0.1%
    responseTime: {
      p50: 100,  // 100ms
      p95: 200,  // 200ms
      p99: 500   // 500ms
    },
    throughput: {
      rps: 1000,    // 1000 requests per second
      concurrent: 5000 // 5000 concurrent users
    }
  }
};

// Test Environment Configuration
export const testEnvironments = {
  local: {
    baseUrl: 'http://localhost:3000',
    dbUrl: 'postgresql://localhost:5432/wedsync_test',
    redisUrl: 'redis://localhost:6379'
  },
  staging: {
    baseUrl: 'https://staging.wedsync.com',
    dbUrl: process.env.STAGING_DB_URL,
    redisUrl: process.env.STAGING_REDIS_URL
  },
  production: {
    baseUrl: 'https://wedsync.com',
    dbUrl: process.env.PRODUCTION_DB_URL,
    redisUrl: process.env.PRODUCTION_REDIS_URL
  }
};

// Wedding Industry Specific Test Data
export const weddingTestData = {
  venues: [
    { name: 'Grand Ballroom', capacity: 300, location: 'New York' },
    { name: 'Garden Pavilion', capacity: 150, location: 'California' },
    { name: 'Historic Manor', capacity: 200, location: 'London' }
  ],
  vendors: [
    { type: 'photographer', name: 'Perfect Moments Photography' },
    { type: 'florist', name: 'Blooming Elegance' },
    { type: 'catering', name: 'Gourmet Celebrations' },
    { type: 'music', name: 'Wedding Harmonies' }
  ],
  commonGuestNames: [
    'John Smith', 'Emily Johnson', 'Michael Brown', 'Sarah Davis',
    'David Wilson', 'Jessica Miller', 'Christopher Lee', 'Amanda Taylor'
  ],
  sampleEmails: [
    'guest1@example.com', 'guest2@example.com', 'guest3@example.com'
  ]
};

// Performance Monitoring Integration
export const monitoringConfig = {
  metrics: {
    customMetrics: [
      'wedding_dashboard_load_time',
      'guest_list_render_time',
      'photo_upload_time',
      'timeline_update_latency',
      'mobile_battery_impact',
      'cache_hit_rate_wedding_day'
    ],
    alerts: {
      dashboardSlowLoad: { threshold: 2000, severity: 'critical' },
      highErrorRate: { threshold: 1, severity: 'critical' },
      lowCacheHitRate: { threshold: 90, severity: 'warning' },
      mobilePerformanceDegradation: { threshold: 150, severity: 'warning' }
    }
  },
  reporting: {
    generateAfterEachTest: true,
    includeHistoricalComparison: true,
    exportFormats: ['json', 'html', 'pdf'],
    distributionLists: ['dev-team@wedsync.com', 'performance-team@wedsync.com']
  }
};

export default defaultPerformanceConfig;