/**
 * WS-232 Predictive Modeling System - Test Configuration
 * Comprehensive test suite configuration for ML models and prediction accuracy
 */

export interface TestConfig {
  models: {
    [key: string]: {
      accuracy: {
        minimum: number;
        target: number;
        tolerance: number;
      };
      performance: {
        maxResponseTime: number;
        maxMemoryUsage: number;
        minThroughput: number;
      };
      reliability: {
        maxErrorRate: number;
        availabilityTarget: number;
      };
    };
  };
  datasets: {
    training: {
      minSize: number;
      maxAge: number; // days
      qualityThreshold: number;
    };
    validation: {
      minSize: number;
      splitRatio: number;
    };
    testing: {
      minSize: number;
      splitRatio: number;
    };
  };
  api: {
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
    timeouts: {
      prediction: number; // ms
      training: number; // ms
      evaluation: number; // ms
    };
  };
  monitoring: {
    alertThresholds: {
      accuracyDrop: number; // percentage points
      latencyIncrease: number; // percentage
      errorRateIncrease: number; // percentage
    };
    metrics: {
      retentionPeriod: number; // days
      aggregationInterval: number; // minutes
    };
  };
}

export const TEST_CONFIG: TestConfig = {
  models: {
    weddingTrends: {
      accuracy: {
        minimum: 75, // 75% minimum accuracy
        target: 85, // 85% target accuracy
        tolerance: 5, // ±5% tolerance
      },
      performance: {
        maxResponseTime: 200, // 200ms max response
        maxMemoryUsage: 100, // 100MB max memory
        minThroughput: 100, // 100 predictions/second
      },
      reliability: {
        maxErrorRate: 0.01, // 1% max error rate
        availabilityTarget: 0.995, // 99.5% uptime
      },
    },
    budgetOptimizer: {
      accuracy: {
        minimum: 80, // Higher accuracy required for financial data
        target: 90,
        tolerance: 3,
      },
      performance: {
        maxResponseTime: 300, // Budget calculations can take longer
        maxMemoryUsage: 150,
        minThroughput: 50,
      },
      reliability: {
        maxErrorRate: 0.005, // 0.5% max error rate for financial data
        availabilityTarget: 0.999, // 99.9% uptime for financial features
      },
    },
    vendorPerformance: {
      accuracy: {
        minimum: 78,
        target: 88,
        tolerance: 4,
      },
      performance: {
        maxResponseTime: 250,
        maxMemoryUsage: 120,
        minThroughput: 75,
      },
      reliability: {
        maxErrorRate: 0.01,
        availabilityTarget: 0.995,
      },
    },
    churnRisk: {
      accuracy: {
        minimum: 82, // High accuracy needed for retention
        target: 92,
        tolerance: 3,
      },
      performance: {
        maxResponseTime: 150, // Fast response for real-time alerts
        maxMemoryUsage: 80,
        minThroughput: 200,
      },
      reliability: {
        maxErrorRate: 0.005, // Low error rate for business critical feature
        availabilityTarget: 0.999,
      },
    },
    revenueForecaster: {
      accuracy: {
        minimum: 85, // Highest accuracy for revenue predictions
        target: 95,
        tolerance: 2,
      },
      performance: {
        maxResponseTime: 500, // Complex calculations allowed more time
        maxMemoryUsage: 200,
        minThroughput: 25,
      },
      reliability: {
        maxErrorRate: 0.002, // Lowest error rate for revenue critical
        availabilityTarget: 0.9999, // 99.99% uptime
      },
    },
  },
  datasets: {
    training: {
      minSize: 10000, // 10k minimum training samples
      maxAge: 365, // Data not older than 1 year
      qualityThreshold: 0.95, // 95% data quality
    },
    validation: {
      minSize: 2000, // 2k validation samples
      splitRatio: 0.2, // 20% of training data
    },
    testing: {
      minSize: 1000, // 1k test samples
      splitRatio: 0.1, // 10% of total data
    },
  },
  api: {
    rateLimits: {
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      requestsPerDay: 1000000,
    },
    timeouts: {
      prediction: 5000, // 5 seconds
      training: 300000, // 5 minutes
      evaluation: 60000, // 1 minute
    },
  },
  monitoring: {
    alertThresholds: {
      accuracyDrop: 5, // Alert if accuracy drops 5%
      latencyIncrease: 50, // Alert if latency increases 50%
      errorRateIncrease: 100, // Alert if error rate doubles
    },
    metrics: {
      retentionPeriod: 90, // Keep metrics for 90 days
      aggregationInterval: 5, // Aggregate every 5 minutes
    },
  },
};

// Wedding season specific test data
export const WEDDING_TEST_DATA = {
  seasons: {
    peak: { months: [4, 5, 6, 7, 8, 9], multiplier: 1.5 },
    moderate: { months: [3, 10], multiplier: 1.2 },
    low: { months: [11, 12, 1, 2], multiplier: 0.8 },
  },
  venues: [
    'outdoor',
    'indoor',
    'destination',
    'church',
    'registry',
    'beach',
    'garden',
    'manor',
    'hotel',
    'barn',
  ],
  regions: [
    'london',
    'southeast',
    'southwest',
    'midlands',
    'north',
    'scotland',
    'wales',
    'ni',
  ],
  budgetRanges: [
    { name: 'low', min: 5000, max: 15000 },
    { name: 'medium', min: 15000, max: 35000 },
    { name: 'high', min: 35000, max: 75000 },
    { name: 'luxury', min: 75000, max: 200000 },
  ],
  guestCounts: [25, 50, 75, 100, 150, 200, 300, 500],
  vendors: [
    'photography',
    'videography',
    'catering',
    'venue',
    'flowers',
    'music',
    'transport',
    'stationery',
    'cake',
    'decoration',
  ],
};

// Test data generators
export const generateTestWedding = (overrides: any = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  date: new Date(
    2024,
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1,
  ),
  venue:
    WEDDING_TEST_DATA.venues[
      Math.floor(Math.random() * WEDDING_TEST_DATA.venues.length)
    ],
  region:
    WEDDING_TEST_DATA.regions[
      Math.floor(Math.random() * WEDDING_TEST_DATA.regions.length)
    ],
  guestCount:
    WEDDING_TEST_DATA.guestCounts[
      Math.floor(Math.random() * WEDDING_TEST_DATA.guestCounts.length)
    ],
  budget: Math.floor(Math.random() * 100000) + 5000,
  vendors: WEDDING_TEST_DATA.vendors.slice(
    0,
    Math.floor(Math.random() * 5) + 3,
  ),
  ...overrides,
});

export const generateTestUser = (overrides: any = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  tier: ['free', 'starter', 'professional', 'scale', 'enterprise'][
    Math.floor(Math.random() * 5)
  ],
  signupDate: new Date(
    2023,
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1,
  ),
  lastActivity: new Date(
    2024,
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1,
  ),
  monthlyRevenue: Math.floor(Math.random() * 200) + 19,
  loginFrequency: Math.floor(Math.random() * 30),
  featureUsage: Math.random(),
  supportTickets: Math.floor(Math.random() * 10),
  ...overrides,
});

export const generateTestVendor = (overrides: any = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  name: `Test Vendor ${Math.random().toString(36).substr(2, 5)}`,
  category:
    WEDDING_TEST_DATA.vendors[
      Math.floor(Math.random() * WEDDING_TEST_DATA.vendors.length)
    ],
  region:
    WEDDING_TEST_DATA.regions[
      Math.floor(Math.random() * WEDDING_TEST_DATA.regions.length)
    ],
  rating: Math.random() * 5,
  reviewCount: Math.floor(Math.random() * 500),
  priceRange:
    WEDDING_TEST_DATA.budgetRanges[Math.floor(Math.random() * 4)].name,
  availability: Math.random(),
  responseRate: Math.random(),
  ...overrides,
});

// Utility functions for tests
export const withinTolerance = (
  actual: number,
  expected: number,
  tolerance: number,
): boolean => {
  return Math.abs(actual - expected) <= tolerance;
};

export const measureExecutionTime = async (
  fn: () => Promise<any>,
): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const generateTestDataset = (
  size: number,
  generator: (overrides?: any) => any,
): any[] => {
  return Array.from({ length: size }, () => generator());
};

export const calculateAccuracy = (
  predictions: any[],
  actual: any[],
  compareFn: (pred: any, act: any) => boolean,
): number => {
  if (predictions.length !== actual.length) {
    throw new Error('Predictions and actual arrays must have the same length');
  }

  const correct = predictions.reduce((count, pred, index) => {
    return count + (compareFn(pred, actual[index]) ? 1 : 0);
  }, 0);

  return (correct / predictions.length) * 100;
};

export const calculateMeanAbsoluteError = (
  predictions: number[],
  actual: number[],
): number => {
  if (predictions.length !== actual.length) {
    throw new Error('Predictions and actual arrays must have the same length');
  }

  const totalError = predictions.reduce((sum, pred, index) => {
    return sum + Math.abs(pred - actual[index]);
  }, 0);

  return totalError / predictions.length;
};

export const calculateRootMeanSquareError = (
  predictions: number[],
  actual: number[],
): number => {
  if (predictions.length !== actual.length) {
    throw new Error('Predictions and actual arrays must have the same length');
  }

  const totalSquaredError = predictions.reduce((sum, pred, index) => {
    return sum + Math.pow(pred - actual[index], 2);
  }, 0);

  return Math.sqrt(totalSquaredError / predictions.length);
};

// Mock data for testing
export const MOCK_WEDDING_DATA = generateTestDataset(1000, generateTestWedding);
export const MOCK_USER_DATA = generateTestDataset(500, generateTestUser);
export const MOCK_VENDOR_DATA = generateTestDataset(200, generateTestVendor);
