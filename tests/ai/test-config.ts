/**
 * AI Version Intelligence Test Configuration
 * WS-200 API Versioning Strategy - Team D Implementation
 */

export const AI_TEST_CONFIG = {
  // Wedding Industry Test Data
  WEDDING_SUPPLIERS: {
    photographer: {
      businessType: 'photographer',
      technicalCapability: 3,
      size: 'small',
      weddingsPerYear: 25,
      peakSeason: { start: 'may', end: 'october' },
      avgResponseTime: 200,
      errorTolerance: 0.01
    },
    venue: {
      businessType: 'venue',
      technicalCapability: 2,
      size: 'medium',
      weddingsPerYear: 150,
      peakSeason: { start: 'april', end: 'november' },
      avgResponseTime: 150,
      errorTolerance: 0.005 // Venues need higher reliability
    },
    florist: {
      businessType: 'florist',
      technicalCapability: 4,
      size: 'small',
      weddingsPerYear: 40,
      peakSeason: { start: 'may', end: 'september' },
      avgResponseTime: 300,
      errorTolerance: 0.02
    },
    caterer: {
      businessType: 'caterer',
      technicalCapability: 2,
      size: 'medium',
      weddingsPerYear: 80,
      peakSeason: { start: 'may', end: 'october' },
      avgResponseTime: 250,
      errorTolerance: 0.01
    },
    dj: {
      businessType: 'dj',
      technicalCapability: 4,
      size: 'small',
      weddingsPerYear: 60,
      peakSeason: { start: 'june', end: 'september' },
      avgResponseTime: 180,
      errorTolerance: 0.015
    }
  },

  // Cultural Wedding Traditions
  CULTURAL_TRADITIONS: {
    hindu: {
      tradition: 'hindu',
      region: 'india',
      language: 'hi',
      ceremonies: ['mehendi', 'sangam', 'wedding', 'reception'],
      duration: 3,
      peakMonths: ['november', 'december', 'february', 'march'],
      complexityScore: 0.9, // Very complex
      apiComplexityMultiplier: 1.8
    },
    islamic: {
      tradition: 'islamic',
      region: 'middle_east',
      language: 'ar',
      ceremonies: ['nikah', 'walima'],
      duration: 2,
      peakMonths: ['april', 'may', 'september', 'october'],
      complexityScore: 0.7,
      apiComplexityMultiplier: 1.4
    },
    jewish: {
      tradition: 'jewish',
      region: 'global',
      language: 'he',
      ceremonies: ['ceremony', 'reception'],
      duration: 1,
      peakMonths: ['may', 'june', 'september', 'october'],
      complexityScore: 0.6,
      apiComplexityMultiplier: 1.3
    },
    christian: {
      tradition: 'christian',
      region: 'global',
      language: 'en',
      ceremonies: ['ceremony', 'reception'],
      duration: 1,
      peakMonths: ['june', 'july', 'august', 'september'],
      complexityScore: 0.4,
      apiComplexityMultiplier: 1.1
    },
    buddhist: {
      tradition: 'buddhist',
      region: 'asia',
      language: 'zh',
      ceremonies: ['blessing', 'ceremony', 'reception'],
      duration: 1,
      peakMonths: ['april', 'may', 'october', 'november'],
      complexityScore: 0.8,
      apiComplexityMultiplier: 1.6
    }
  },

  // API Version Test Scenarios
  API_VERSIONS: {
    major_breaking: {
      from: '2.1.0',
      to: '3.0.0',
      changeType: 'breaking',
      complexity: 'high',
      expectedCompatibility: 0.3,
      migrationDifficulty: 0.8,
      changes: {
        '/api/bookings': { type: 'schema_change', breaking: true, impact: 'high' },
        '/api/payments': { type: 'removed', breaking: true, impact: 'critical' },
        '/api/venues': { type: 'parameter_change', breaking: true, impact: 'medium' },
        '/api/timeline': { type: 'restructured', breaking: true, impact: 'high' }
      }
    },
    minor_non_breaking: {
      from: '2.1.0',
      to: '2.2.0',
      changeType: 'non_breaking',
      complexity: 'low',
      expectedCompatibility: 0.95,
      migrationDifficulty: 0.1,
      changes: {
        '/api/photos': { type: 'new_field', breaking: false, impact: 'none' },
        '/api/timeline': { type: 'enhancement', breaking: false, impact: 'positive' },
        '/api/notifications': { type: 'new_endpoint', breaking: false, impact: 'none' }
      }
    },
    patch_fixes: {
      from: '2.1.0',
      to: '2.1.1',
      changeType: 'patch',
      complexity: 'minimal',
      expectedCompatibility: 0.99,
      migrationDifficulty: 0.05,
      changes: {
        '/api/users': { type: 'bug_fix', breaking: false, impact: 'positive' },
        '/api/auth': { type: 'security_fix', breaking: false, impact: 'positive' }
      }
    },
    feature_addition: {
      from: '2.1.0',
      to: '2.3.0',
      changeType: 'feature',
      complexity: 'medium',
      expectedCompatibility: 0.85,
      migrationDifficulty: 0.3,
      changes: {
        '/api/ai/recommendations': { type: 'new_feature', breaking: false, impact: 'positive' },
        '/api/analytics': { type: 'enhanced', breaking: false, impact: 'positive' },
        '/api/bookings': { type: 'parameter_optional', breaking: false, impact: 'none' }
      }
    }
  },

  // Performance Test Thresholds
  PERFORMANCE_THRESHOLDS: {
    // Wedding day critical requirements
    WEDDING_DAY_RESPONSE_TIME: 500, // milliseconds
    WEDDING_DAY_AVAILABILITY: 0.9999, // 99.99% uptime
    WEDDING_DAY_ERROR_RATE: 0.001, // 0.1% max error rate
    
    // General API performance
    API_ANALYSIS_MAX_TIME: 2000, // milliseconds
    BATCH_PROCESSING_MAX_TIME: 10000, // 10 seconds for 100 suppliers
    CONCURRENT_ANALYSIS_COUNT: 50, // Peak Saturday load
    MEMORY_USAGE_MAX_MB: 512, // Per analysis
    
    // Wedding season requirements
    PEAK_SEASON_MULTIPLIER: 10, // 10x normal traffic
    CONCURRENT_WEDDINGS: 500, // Saturday peak
    SUPPLIER_ANALYSIS_BATCH: 1000, // Large supplier networks
    
    // Machine Learning performance
    ML_TRAINING_MAX_TIME: 300000, // 5 minutes
    ML_PREDICTION_MAX_TIME: 1000, // 1 second
    ML_ACCURACY_THRESHOLD: 0.85, // 85% minimum
    
    // Genetic algorithm optimization
    GA_OPTIMIZATION_MAX_TIME: 30000, // 30 seconds
    GA_MIN_PERFORMANCE_SCORE: 0.7, // 70% minimum
    GA_CONVERGENCE_GENERATIONS: 100 // Max generations
  },

  // Wedding Season Calendar
  WEDDING_SEASONS: {
    peak: {
      months: ['may', 'june', 'july', 'august', 'september', 'october'],
      trafficMultiplier: 5.0,
      errorTolerance: 0.001, // Extra strict during peak
      responseTimeTarget: 300 // Faster response needed
    },
    high: {
      months: ['april', 'november'],
      trafficMultiplier: 3.0,
      errorTolerance: 0.005,
      responseTimeTarget: 400
    },
    medium: {
      months: ['march', 'december'],
      trafficMultiplier: 2.0,
      errorTolerance: 0.01,
      responseTimeTarget: 500
    },
    low: {
      months: ['january', 'february'],
      trafficMultiplier: 1.0,
      errorTolerance: 0.02,
      responseTimeTarget: 1000
    }
  },

  // Test Data Generators
  GENERATORS: {
    // Generate realistic supplier profiles
    generateSupplierProfile: (type: string, overrides: any = {}) => ({
      businessType: type,
      technicalCapability: Math.floor(Math.random() * 5) + 1,
      size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      weddingsPerYear: Math.floor(Math.random() * 200) + 10,
      region: ['north_america', 'europe', 'asia', 'oceania'][Math.floor(Math.random() * 4)],
      ...overrides
    }),

    // Generate API change scenarios
    generateAPIChanges: (complexity: 'low' | 'medium' | 'high') => {
      const changeTypes = ['schema_change', 'parameter_change', 'new_endpoint', 'deprecated', 'removed'];
      const changeCount = complexity === 'low' ? 2 : complexity === 'medium' ? 5 : 10;
      
      const changes: any = {};
      for (let i = 0; i < changeCount; i++) {
        changes[`/api/endpoint_${i}`] = {
          type: changeTypes[Math.floor(Math.random() * changeTypes.length)],
          breaking: Math.random() > 0.7,
          impact: ['none', 'low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 5)]
        };
      }
      return changes;
    },

    // Generate cultural wedding scenarios
    generateCulturalScenario: () => {
      const traditions = Object.keys(AI_TEST_CONFIG.CULTURAL_TRADITIONS);
      const tradition = traditions[Math.floor(Math.random() * traditions.length)];
      const traditionData = AI_TEST_CONFIG.CULTURAL_TRADITIONS[tradition as keyof typeof AI_TEST_CONFIG.CULTURAL_TRADITIONS];
      
      return {
        ...traditionData,
        guestCount: Math.floor(Math.random() * 300) + 50,
        budgetTier: ['budget', 'mid', 'luxury'][Math.floor(Math.random() * 3)],
        locationConstraints: Math.random() > 0.5,
        multiCultural: Math.random() > 0.7 // 30% chance of multi-cultural wedding
      };
    },

    // Generate peak season scenarios
    generatePeakSeasonScenario: () => {
      const currentMonth = ['may', 'june', 'july', 'august', 'september'][Math.floor(Math.random() * 5)];
      const seasonData = AI_TEST_CONFIG.WEDDING_SEASONS.peak;
      
      return {
        month: currentMonth,
        expectedTraffic: seasonData.trafficMultiplier,
        concurrentWeddings: Math.floor(Math.random() * 50) + 10,
        isWeekend: Math.random() > 0.3, // 70% chance of weekend
        weatherImpact: Math.random() > 0.8 ? 'adverse' : 'favorable'
      };
    }
  },

  // Mock Data Templates
  MOCK_DATA: {
    // OpenAI API responses
    openai: {
      embedding: {
        data: [{ embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1) }]
      },
      chatCompletion: {
        choices: [{
          message: {
            content: JSON.stringify({
              compatibility: Math.random(),
              breakingChanges: [],
              recommendations: ['test_recommendation'],
              performanceScore: Math.random(),
              culturalCompatibility: Math.random()
            })
          }
        }]
      }
    },

    // Supabase responses
    supabase: {
      select: { data: [], error: null },
      insert: { data: {}, error: null },
      update: { data: {}, error: null },
      upsert: { data: {}, error: null },
      rpc: { data: [], error: null }
    }
  },

  // Test Environment Settings
  ENVIRONMENT: {
    // Database settings
    database: {
      connectionTimeout: 5000,
      queryTimeout: 10000,
      maxConnections: 20
    },

    // AI Service settings
    openai: {
      timeout: 30000,
      maxRetries: 3,
      rateLimitRetryDelay: 1000
    },

    // Test execution settings
    test: {
      timeout: 60000, // 1 minute per test
      concurrency: 10, // Max concurrent tests
      retries: 2, // Retry failed tests
      verbose: process.env.NODE_ENV === 'development'
    }
  }
};

// Helper functions for tests
export const TestHelpers = {
  // Create realistic wedding day scenario
  createWeddingDayScenario: (overrides: any = {}) => ({
    isWeddingDay: true,
    date: new Date(),
    supplierCount: Math.floor(Math.random() * 10) + 5,
    guestCount: Math.floor(Math.random() * 200) + 50,
    culturalTradition: 'christian',
    weatherRisk: 'low',
    venueType: 'outdoor',
    ...overrides
  }),

  // Create API migration scenario
  createMigrationScenario: (complexity: 'simple' | 'complex' = 'simple') => ({
    fromVersion: '2.1.0',
    toVersion: complexity === 'simple' ? '2.1.1' : '3.0.0',
    affectedEndpoints: complexity === 'simple' ? 2 : 8,
    breakingChanges: complexity === 'simple' ? 0 : 4,
    clientCount: Math.floor(Math.random() * 1000) + 100,
    culturalRequirements: complexity === 'complex' ? ['hindu', 'christian'] : ['christian']
  }),

  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test IDs
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Validate AI response structure
  validateAIResponse: (response: any, requiredFields: string[]) => {
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return true;
  },

  // Calculate success metrics
  calculateSuccessMetrics: (results: any[]) => {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = successful / total;
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / total;

    return {
      total,
      successful,
      failed,
      successRate,
      avgResponseTime
    };
  }
};

export default AI_TEST_CONFIG;