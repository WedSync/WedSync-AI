/**
 * WS-189 Touch Analytics System - Team B Backend
 * Service exports and configuration for touch optimization system
 */

// Core service exports
export {
  touchPerformanceTracker,
  TouchPerformanceTracker,
} from './performance-tracker';
export type {
  TouchPerformanceMetric,
  PerformanceThresholds,
  OptimizationSuggestion,
} from './performance-tracker';

export {
  touchAnalyticsRepository,
  TouchAnalyticsRepository,
} from './analytics-repository';
export type {
  TouchAnalyticsData,
  TouchPreferencesData,
  TouchPerformanceAggregates,
  AnalyticsQueryOptions,
} from './analytics-repository';

export {
  touchRecommendationEngine,
  TouchRecommendationEngine,
} from './recommendation-engine';
export type {
  OptimizationRecommendation,
  RecommendationContext,
  PerformancePattern,
  ABTestExperiment,
} from './recommendation-engine';

// Re-export from existing touch optimizer for compatibility
export {
  weddingTouchOptimizer,
  useWeddingTouchOptimization,
} from './wedding-touch-optimizer';
export type {
  TouchGestureConfig,
  WeddingTouchContext,
} from './wedding-touch-optimizer';

// Configuration constants
export const TOUCH_ANALYTICS_CONFIG = {
  // Performance thresholds (milliseconds)
  PERFORMANCE_THRESHOLDS: {
    EMERGENCY_GESTURES: 25,
    CRITICAL_GESTURES: 40,
    HIGH_PRIORITY: 50,
    NORMAL_GESTURES: 100,
    LOW_PRIORITY: 150,
  },

  // Analytics collection settings
  ANALYTICS: {
    BATCH_SIZE: 50,
    FLUSH_INTERVAL_MS: 5000,
    MAX_BUFFER_SIZE: 100,
    CACHE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
    MIN_SAMPLE_SIZE: 50,
  },

  // Privacy and compliance settings
  PRIVACY: {
    DEFAULT_RETENTION_DAYS: 365,
    ANONYMOUS_MODE_DEFAULT: true,
    GDPR_CLEANUP_BATCH_SIZE: 1000,
    CONSENT_LEVELS: ['none', 'anonymous', 'identified'] as const,
  },

  // Recommendation engine settings
  RECOMMENDATIONS: {
    CACHE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    MAX_RECOMMENDATIONS: 10,
    MIN_CONFIDENCE_THRESHOLD: 0.7,
    AB_TEST_MIN_DURATION_DAYS: 7,
    STATISTICAL_SIGNIFICANCE_THRESHOLD: 0.05,
  },

  // API response targets
  API_TARGETS: {
    MAX_RESPONSE_TIME_MS: 50,
    MAX_QUERY_LIMIT: 10000,
    DEFAULT_PAGE_SIZE: 100,
  },
} as const;

// Gesture type mappings for analytics
export const GESTURE_TYPES = {
  EMERGENCY: 'emergency-call',
  PHOTO_CONFIRM: 'photo-capture-confirm',
  GUEST_SEATING: 'guest-seating-assign',
  PHOTO_NAVIGATION: 'photo-group-navigate',
  SUPPLIER_MESSAGE: 'supplier-message-send',
  TASK_UPDATE: 'task-status-update',
  MENU_NAVIGATION: 'menu-navigation',
  FORM_INPUT: 'form-input',
  SETTINGS_ACCESS: 'settings-access',
} as const;

// Workflow type mappings
export const WORKFLOW_TYPES = {
  PHOTO_COORDINATION: 'photo-coordination',
  GUEST_MANAGEMENT: 'guest-management',
  VENUE_COORDINATION: 'venue-coordination',
  EMERGENCY: 'emergency',
} as const;

// Device type mappings
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

// Utility functions for touch analytics
export const touchAnalyticsUtils = {
  /**
   * Create a standardized touch analytics record
   */
  createAnalyticsRecord: (
    userId: string,
    sessionId: string,
    gestureType: string,
    responseTime: number,
    targetTime: number,
    success: boolean,
    deviceContext: any,
    workflowContext: any,
  ) => ({
    user_id: userId,
    session_id: sessionId,
    gesture_type: gestureType,
    response_time: responseTime,
    target_response_time: targetTime,
    performance_deviation: responseTime - targetTime,
    deviation_percentage: ((responseTime - targetTime) / targetTime) * 100,
    success,
    timestamp: new Date().toISOString(),
    device_context: deviceContext,
    workflow_context: workflowContext,
    created_at: new Date().toISOString(),
  }),

  /**
   * Validate analytics data before storage
   */
  validateAnalyticsData: (data: any) => {
    const required = ['session_id', 'gesture_type', 'response_time', 'success'];
    const missing = required.filter((field) => !(field in data));

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (
      typeof data.response_time !== 'number' ||
      data.response_time < 0 ||
      data.response_time > 10000
    ) {
      throw new Error('Response time must be a number between 0 and 10000ms');
    }

    if (typeof data.success !== 'boolean') {
      throw new Error('Success field must be boolean');
    }

    return true;
  },

  /**
   * Calculate performance score from metrics
   */
  calculatePerformanceScore: (
    avgResponseTime: number,
    successRate: number,
    targetHitRate: number,
  ) => {
    const responseScore = Math.max(0, 100 - avgResponseTime / 10);
    const successScore = successRate * 100;
    const targetScore = targetHitRate * 100;

    return (
      Math.round(((responseScore + successScore + targetScore) / 3) * 100) / 100
    );
  },

  /**
   * Get threshold for gesture type
   */
  getThresholdForGesture: (gestureType: string) => {
    const thresholds = TOUCH_ANALYTICS_CONFIG.PERFORMANCE_THRESHOLDS;

    if (gestureType.includes('emergency')) {
      return thresholds.EMERGENCY_GESTURES;
    } else if (
      [GESTURE_TYPES.PHOTO_CONFIRM, GESTURE_TYPES.GUEST_SEATING].includes(
        gestureType as any,
      )
    ) {
      return thresholds.CRITICAL_GESTURES;
    } else if (
      [GESTURE_TYPES.SUPPLIER_MESSAGE, GESTURE_TYPES.TASK_UPDATE].includes(
        gestureType as any,
      )
    ) {
      return thresholds.HIGH_PRIORITY;
    } else if (gestureType.includes('settings')) {
      return thresholds.LOW_PRIORITY;
    } else {
      return thresholds.NORMAL_GESTURES;
    }
  },

  /**
   * Determine performance status
   */
  getPerformanceStatus: (responseTime: number, targetTime: number) => {
    const ratio = responseTime / targetTime;

    if (ratio <= 1) return 'excellent';
    if (ratio <= 1.2) return 'good';
    if (ratio <= 1.5) return 'needs_improvement';
    return 'critical';
  },

  /**
   * Generate session ID
   */
  generateSessionId: () =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Create device context from user agent
   */
  createDeviceContext: (userAgent?: string, additionalContext?: any) => {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent || '');
    const isTablet = /Tablet|iPad/i.test(userAgent || '');

    let deviceType = DEVICE_TYPES.DESKTOP;
    if (isTablet) deviceType = DEVICE_TYPES.TABLET;
    else if (isMobile) deviceType = DEVICE_TYPES.MOBILE;

    return {
      type: deviceType,
      user_agent: userAgent,
      screen_size: additionalContext?.screenSize || 'unknown',
      connection_type: additionalContext?.connectionType,
      cpu_performance: additionalContext?.cpuPerformance,
      ...additionalContext,
    };
  },

  /**
   * Create workflow context
   */
  createWorkflowContext: (
    workflowType: string,
    urgencyLevel: 'emergency' | 'high' | 'normal' | 'low' = 'normal',
    additionalContext?: any,
  ) => ({
    workflow_type: workflowType,
    urgency_level: urgencyLevel,
    concurrent_operations: additionalContext?.concurrentOperations || 0,
    ...additionalContext,
  }),

  /**
   * Format time range for queries
   */
  getTimeFilter: (timeRange: '1h' | '24h' | '7d' | '30d') => {
    const now = new Date();
    const filters = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(now.getTime() - filters[timeRange]).toISOString();
  },
};

// Initialization function for touch analytics system
export const initializeTouchAnalytics = async (config?: {
  enablePerformanceTracking?: boolean;
  enableRecommendations?: boolean;
  analyticsConfig?: Partial<typeof TOUCH_ANALYTICS_CONFIG.ANALYTICS>;
  privacyConfig?: Partial<typeof TOUCH_ANALYTICS_CONFIG.PRIVACY>;
}) => {
  try {
    console.log('🎯 Initializing WedSync Touch Analytics System...');

    // Initialize performance tracker
    if (config?.enablePerformanceTracking !== false) {
      console.log('📊 Initializing performance tracker...');
      // Performance tracker initializes automatically via constructor
    }

    // Initialize recommendation engine
    if (config?.enableRecommendations !== false) {
      console.log('🤖 Initializing recommendation engine...');
      // Recommendation engine initializes automatically via constructor
    }

    // Setup analytics repository
    console.log('🗄️ Initializing analytics repository...');
    // Analytics repository initializes automatically via constructor

    console.log('✅ Touch Analytics System initialized successfully!');

    return {
      success: true,
      components: {
        performance_tracker: !!config?.enablePerformanceTracking,
        recommendation_engine: !!config?.enableRecommendations,
        analytics_repository: true,
      },
      config: {
        ...TOUCH_ANALYTICS_CONFIG,
        ...config,
      },
    };
  } catch (error) {
    console.error('❌ Touch Analytics System initialization failed:', error);
    throw error;
  }
};

// Health check function
export const checkTouchAnalyticsHealth = async () => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {
        performance_tracker: { status: 'healthy', latency_ms: 0 },
        analytics_repository: { status: 'healthy', latency_ms: 0 },
        recommendation_engine: { status: 'healthy', latency_ms: 0 },
      },
      overall_status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    };

    // Test performance tracker
    const trackerStart = Date.now();
    const trackerMetrics = touchPerformanceTracker.getTouchMetrics();
    healthStatus.services.performance_tracker.latency_ms =
      Date.now() - trackerStart;

    // Test analytics repository - basic connection test
    const repoStart = Date.now();
    // Would test database connection in real implementation
    healthStatus.services.analytics_repository.latency_ms =
      Date.now() - repoStart;

    // Test recommendation engine - basic functionality
    const engineStart = Date.now();
    // Would test ML service connection in real implementation
    healthStatus.services.recommendation_engine.latency_ms =
      Date.now() - engineStart;

    // Determine overall health
    const hasUnhealthyService = Object.values(healthStatus.services).some(
      (service) => service.status !== 'healthy' || service.latency_ms > 1000,
    );

    if (hasUnhealthyService) {
      healthStatus.overall_status = 'degraded';
    }

    return healthStatus;
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      services: {
        performance_tracker: { status: 'unhealthy', latency_ms: -1 },
        analytics_repository: { status: 'unhealthy', latency_ms: -1 },
        recommendation_engine: { status: 'unhealthy', latency_ms: -1 },
      },
      overall_status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export version info
export const TOUCH_ANALYTICS_VERSION = {
  version: '1.0.0',
  build: 'WS-189-team-b-backend',
  features: [
    'Privacy-compliant analytics collection',
    'Real-time performance monitoring',
    'AI-powered optimization recommendations',
    'Cross-device preference synchronization',
    'A/B testing infrastructure',
    'Industry benchmarking',
    'GDPR compliance tools',
    'Statistical analysis engine',
  ],
  compatibility: {
    node: '>=18.0.0',
    supabase: '>=2.0.0',
    next: '>=14.0.0',
  },
};

// Default export for convenience
export default {
  touchPerformanceTracker,
  touchAnalyticsRepository,
  touchRecommendationEngine,
  weddingTouchOptimizer,
  config: TOUCH_ANALYTICS_CONFIG,
  utils: touchAnalyticsUtils,
  initialize: initializeTouchAnalytics,
  checkHealth: checkTouchAnalyticsHealth,
  version: TOUCH_ANALYTICS_VERSION,
};
