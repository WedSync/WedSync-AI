/**
 * Vendor-specific Cache Configuration for WedSync
 *
 * Defines caching strategies and policies for different vendor types
 * and wedding-related data patterns.
 *
 * Features:
 * - Vendor type specific TTL policies
 * - Wedding timeline-aware caching
 * - Emergency protocol overrides
 * - Performance optimization rules
 */

export interface VendorCacheConfig {
  /** Cache TTL in seconds */
  ttl: number;
  /** Cache tags for group invalidation */
  tags: string[];
  /** Headers to vary cache by */
  varyBy: string[];
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate: boolean;
  /** Maximum stale age in seconds */
  maxStaleAge?: number;
  /** Priority level for cache eviction */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Wedding day behavior overrides */
  weddingDayOverrides?: {
    ttl: number;
    priority: 'high' | 'critical';
  };
}

export interface WeddingTimelineConfig {
  /** Days before wedding when cache behavior changes */
  criticalPeriodDays: number;
  /** Cache multiplier during critical period */
  criticalTTLMultiplier: number;
  /** Emergency protocol cache extension (minutes) */
  emergencyExtensionMinutes: number;
}

/**
 * Vendor type cache configurations
 */
const VENDOR_CACHE_CONFIGS: Record<string, VendorCacheConfig> = {
  // Photography vendors - high update frequency
  photographer: {
    ttl: 1800, // 30 minutes
    tags: ['vendor', 'photography', 'media'],
    varyBy: ['user-id', 'wedding-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 3600, // 1 hour
    priority: 'high',
    weddingDayOverrides: {
      ttl: 300, // 5 minutes on wedding day
      priority: 'critical',
    },
  },

  // Venue vendors - medium update frequency
  venue: {
    ttl: 3600, // 1 hour
    tags: ['vendor', 'venue', 'location'],
    varyBy: ['user-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 7200, // 2 hours
    priority: 'high',
    weddingDayOverrides: {
      ttl: 1800, // 30 minutes on wedding day
      priority: 'critical',
    },
  },

  // Catering vendors - schedule sensitive
  catering: {
    ttl: 1800, // 30 minutes
    tags: ['vendor', 'catering', 'timeline'],
    varyBy: ['user-id', 'wedding-id', 'date'],
    staleWhileRevalidate: true,
    maxStaleAge: 3600,
    priority: 'high',
    weddingDayOverrides: {
      ttl: 600, // 10 minutes on wedding day
      priority: 'critical',
    },
  },

  // Florist vendors - timing critical
  florist: {
    ttl: 2400, // 40 minutes
    tags: ['vendor', 'florist', 'timeline'],
    varyBy: ['user-id', 'wedding-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 3600,
    priority: 'medium',
    weddingDayOverrides: {
      ttl: 900, // 15 minutes on wedding day
      priority: 'high',
    },
  },

  // DJ/Music vendors - equipment sensitive
  dj: {
    ttl: 3600, // 1 hour
    tags: ['vendor', 'music', 'equipment'],
    varyBy: ['user-id', 'wedding-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 7200,
    priority: 'medium',
    weddingDayOverrides: {
      ttl: 1200, // 20 minutes on wedding day
      priority: 'high',
    },
  },

  // Wedding planner - coordination critical
  planner: {
    ttl: 900, // 15 minutes
    tags: ['vendor', 'planner', 'coordination'],
    varyBy: ['user-id', 'wedding-id', 'timeline'],
    staleWhileRevalidate: true,
    maxStaleAge: 1800,
    priority: 'critical',
    weddingDayOverrides: {
      ttl: 300, // 5 minutes on wedding day
      priority: 'critical',
    },
  },

  // Transport vendors - timing critical
  transport: {
    ttl: 1800, // 30 minutes
    tags: ['vendor', 'transport', 'logistics'],
    varyBy: ['user-id', 'wedding-id', 'location'],
    staleWhileRevalidate: true,
    maxStaleAge: 3600,
    priority: 'high',
    weddingDayOverrides: {
      ttl: 600, // 10 minutes on wedding day
      priority: 'critical',
    },
  },

  // Default vendor configuration
  default: {
    ttl: 3600, // 1 hour
    tags: ['vendor', 'general'],
    varyBy: ['user-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 7200,
    priority: 'medium',
    weddingDayOverrides: {
      ttl: 1800, // 30 minutes on wedding day
      priority: 'high',
    },
  },
};

/**
 * API endpoint cache configurations
 */
const API_CACHE_CONFIGS: Record<string, VendorCacheConfig> = {
  // Vendor list endpoints - medium frequency updates
  '/api/vendors': {
    ttl: 1800, // 30 minutes
    tags: ['api', 'vendors', 'list'],
    varyBy: ['authorization', 'location', 'vendor-type'],
    staleWhileRevalidate: true,
    maxStaleAge: 3600,
    priority: 'medium',
  },

  // Individual vendor details - higher frequency
  '/api/vendors/[id]': {
    ttl: 900, // 15 minutes
    tags: ['api', 'vendor', 'details'],
    varyBy: ['authorization', 'vendor-id'],
    staleWhileRevalidate: true,
    maxStaleAge: 1800,
    priority: 'high',
  },

  // Wedding timeline - critical updates
  '/api/weddings/[id]/timeline': {
    ttl: 300, // 5 minutes
    tags: ['api', 'wedding', 'timeline', 'critical'],
    varyBy: ['authorization', 'wedding-id'],
    staleWhileRevalidate: false, // Always fresh for timeline
    priority: 'critical',
    weddingDayOverrides: {
      ttl: 60, // 1 minute on wedding day
      priority: 'critical',
    },
  },

  // Guest communications - real-time sensitive
  '/api/communications': {
    ttl: 180, // 3 minutes
    tags: ['api', 'communications', 'realtime'],
    varyBy: ['authorization', 'wedding-id', 'message-type'],
    staleWhileRevalidate: false,
    priority: 'critical',
    weddingDayOverrides: {
      ttl: 60, // 1 minute on wedding day
      priority: 'critical',
    },
  },

  // Forms and templates - moderate updates
  '/api/forms': {
    ttl: 3600, // 1 hour
    tags: ['api', 'forms', 'templates'],
    varyBy: ['authorization', 'form-type'],
    staleWhileRevalidate: true,
    maxStaleAge: 7200,
    priority: 'medium',
  },

  // File uploads - no caching
  '/api/upload': {
    ttl: 0, // No caching
    tags: ['api', 'upload', 'files'],
    varyBy: [],
    staleWhileRevalidate: false,
    priority: 'low',
  },
};

/**
 * Wedding timeline configuration
 */
const WEDDING_TIMELINE_CONFIG: WeddingTimelineConfig = {
  criticalPeriodDays: 7, // Last week before wedding
  criticalTTLMultiplier: 0.5, // Reduce TTL by 50% in critical period
  emergencyExtensionMinutes: 60, // Extend cache by 1 hour during emergencies
};

/**
 * Get cache configuration for vendor type
 */
export function getVendorCacheConfig(vendorType: string): VendorCacheConfig {
  const config =
    VENDOR_CACHE_CONFIGS[vendorType.toLowerCase()] ||
    VENDOR_CACHE_CONFIGS.default;

  // Clone to prevent mutations
  return {
    ...config,
    tags: [...config.tags],
    varyBy: [...config.varyBy],
    weddingDayOverrides: config.weddingDayOverrides
      ? { ...config.weddingDayOverrides }
      : undefined,
  };
}

/**
 * Get cache configuration for API endpoint
 */
export function getAPICacheConfig(endpoint: string): VendorCacheConfig | null {
  // Normalize endpoint path
  const normalizedPath = endpoint.split('?')[0]; // Remove query params

  // Direct match first
  if (API_CACHE_CONFIGS[normalizedPath]) {
    const config = API_CACHE_CONFIGS[normalizedPath];
    return {
      ...config,
      tags: [...config.tags],
      varyBy: [...config.varyBy],
      weddingDayOverrides: config.weddingDayOverrides
        ? { ...config.weddingDayOverrides }
        : undefined,
    };
  }

  // Pattern matching for dynamic routes
  for (const pattern in API_CACHE_CONFIGS) {
    const regex = new RegExp(pattern.replace(/\[.*?\]/g, '[^/]+'));
    if (regex.test(normalizedPath)) {
      const config = API_CACHE_CONFIGS[pattern];
      return {
        ...config,
        tags: [...config.tags],
        varyBy: [...config.varyBy],
        weddingDayOverrides: config.weddingDayOverrides
          ? { ...config.weddingDayOverrides }
          : undefined,
      };
    }
  }

  return null;
}

/**
 * Get wedding timeline configuration
 */
export function getWeddingTimelineConfig(): WeddingTimelineConfig {
  return { ...WEDDING_TIMELINE_CONFIG };
}

/**
 * Check if wedding is in critical period
 */
export function isWeddingInCriticalPeriod(weddingDate: Date | string): boolean {
  const wedding =
    typeof weddingDate === 'string' ? new Date(weddingDate) : weddingDate;
  const now = new Date();
  const daysUntilWedding = Math.ceil(
    (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    daysUntilWedding >= 0 &&
    daysUntilWedding <= WEDDING_TIMELINE_CONFIG.criticalPeriodDays
  );
}

/**
 * Apply wedding day overrides to cache config
 */
export function applyWeddingDayOverrides(
  config: VendorCacheConfig,
  isWeddingDay: boolean = false,
): VendorCacheConfig {
  if (!isWeddingDay || !config.weddingDayOverrides) {
    return config;
  }

  return {
    ...config,
    ttl: config.weddingDayOverrides.ttl,
    priority: config.weddingDayOverrides.priority,
  };
}

/**
 * Apply critical period adjustments
 */
export function applyCriticalPeriodAdjustments(
  config: VendorCacheConfig,
  weddingDate?: Date | string,
): VendorCacheConfig {
  if (!weddingDate || !isWeddingInCriticalPeriod(weddingDate)) {
    return config;
  }

  const adjustedTTL = Math.floor(
    config.ttl * WEDDING_TIMELINE_CONFIG.criticalTTLMultiplier,
  );

  return {
    ...config,
    ttl: Math.max(adjustedTTL, 60), // Minimum 1 minute TTL
    priority:
      config.priority === 'low'
        ? 'medium'
        : config.priority === 'medium'
          ? 'high'
          : 'critical',
  };
}

/**
 * Get comprehensive cache strategy for vendor and context
 */
export function getComprehensiveCacheStrategy(options: {
  vendorType?: string;
  apiEndpoint?: string;
  weddingDate?: Date | string;
  isWeddingDay?: boolean;
}): VendorCacheConfig | null {
  const {
    vendorType,
    apiEndpoint,
    weddingDate,
    isWeddingDay = false,
  } = options;

  let baseConfig: VendorCacheConfig | null = null;

  // Determine base configuration
  if (apiEndpoint) {
    baseConfig = getAPICacheConfig(apiEndpoint);
  }

  if (!baseConfig && vendorType) {
    baseConfig = getVendorCacheConfig(vendorType);
  }

  if (!baseConfig) {
    return null;
  }

  // Apply wedding day overrides
  let finalConfig = applyWeddingDayOverrides(baseConfig, isWeddingDay);

  // Apply critical period adjustments
  finalConfig = applyCriticalPeriodAdjustments(finalConfig, weddingDate);

  return finalConfig;
}

export default {
  getVendorCacheConfig,
  getAPICacheConfig,
  getWeddingTimelineConfig,
  isWeddingInCriticalPeriod,
  applyWeddingDayOverrides,
  applyCriticalPeriodAdjustments,
  getComprehensiveCacheStrategy,
};
