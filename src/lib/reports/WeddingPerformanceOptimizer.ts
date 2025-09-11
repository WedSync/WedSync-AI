/**
 * WS-333 Team B: Wedding-Specific Performance Optimizer
 * Ultra-fine-tuned performance optimizations for wedding industry reporting patterns
 * Target: 60-70% performance improvements, 85%+ cache hit rates, sub-second response times
 */

import {
  ReportGenerationRequest,
  WeddingSpecificMetrics,
  WeddingSeasonalAnalysis,
  WeddingDateRange,
  WeekendWeddingOptimization,
} from '../types/reporting-backend.js';
import { WeddingQueryOptimizer } from './WeddingQueryOptimizer.js';
import { ReportCacheManager } from './ReportCacheManager.js';

export interface WeddingPerformanceConfig {
  // Wedding Season Optimizations (May-October peak season)
  peakSeasonOptimizations: {
    enabled: boolean;
    peakMonths: number[]; // 5,6,7,8,9,10 (May-October)
    resourceMultiplier: number; // 2x resources during peak season
    cacheWarming: {
      enabled: boolean;
      preloadDays: number; // Pre-warm cache 30 days before peak season
      popularReports: string[]; // Most requested wedding reports to pre-cache
    };
  };

  // Weekend Wedding Concentration (80% Saturday weddings)
  weekendConcentration: {
    enabled: boolean;
    saturdayLoadMultiplier: number; // 5x normal load on Saturdays
    fridayPreparationBoost: boolean; // Pre-cache Saturday reports on Friday
    sundayCleanupOptimization: boolean; // Background optimization on Sundays
    emergencyWeddingDayProtocol: {
      enabled: boolean;
      responseTimeTarget: number; // <5 seconds for wedding day queries
      priorityQueueBypass: boolean; // Skip normal queues for wedding day reports
      dedicatedResources: number; // % of resources reserved for wedding day
    };
  };

  // Supplier Performance Patterns
  supplierOptimizations: {
    enabled: boolean;
    photographerMetrics: {
      // Photographers need quick portfolio performance data
      quickDeliveryTargets: number; // <2 seconds for portfolio stats
      imageProcessingPriority: 'high' | 'medium' | 'low';
      bulkOperationOptimization: boolean; // Optimized for 500+ photo batches
    };
    venueMetrics: {
      // Venues need capacity and booking analytics
      capacityAnalyticsCache: number; // Cache capacity reports for 24h
      seasonalBookingPatterns: boolean; // Pre-compute seasonal trends
      competitorAnalysis: boolean; // Compare with other venues in area
    };
    floristMetrics: {
      // Florists need seasonal trend and order volume data
      seasonalTrendPrediction: boolean;
      orderVolumeForecasting: boolean;
      supplierIntegrationOptimization: boolean;
    };
  };

  // Wedding Timeline Optimizations
  timelineOptimizations: {
    enabled: boolean;
    // Wedding planning timeline averages 12-18 months
    planningPhaseCache: {
      earlyPlanning: number; // 12-18 months out cache (7 days)
      midPlanning: number; // 6-12 months out cache (3 days)
      finalPlanning: number; // <6 months out cache (1 day)
      lastMinute: number; // <30 days out cache (1 hour)
      weddingWeek: number; // <7 days out cache (5 minutes)
      weddingDay: number; // Wedding day cache (no cache, real-time only)
    };
    criticalPathOptimization: {
      enabled: boolean;
      identifyBottlenecks: boolean;
      autoResourceReallocation: boolean;
    };
  };

  // Regional Wedding Patterns
  regionalOptimizations: {
    enabled: boolean;
    ukSpecific: {
      // UK wedding season peaks June-September
      seasonPeak: number[]; // [6,7,8,9]
      bankHolidayBoost: boolean; // Extra load on UK bank holidays
      registryOfficeHours: {
        weekdayHours: [number, number]; // [9, 17] - Monday-Friday
        saturdayHours: [number, number]; // [9, 15] - Saturday
        sundayAvailable: boolean; // false - No Sunday civil ceremonies
      };
    };
    destinationWeddings: {
      timezoneOptimization: boolean;
      internationalSupplierSync: boolean;
      currencyConversionCache: number; // Cache exchange rates for 1 hour
    };
  };

  // Data Pattern Optimizations
  dataPatterns: {
    enabled: boolean;
    weddingPartySize: {
      // Average UK wedding: 60-80 guests
      smallWedding: { max: 50; optimization: 'memory' };
      mediumWedding: { max: 100; optimization: 'balanced' };
      largeWedding: { max: 200; optimization: 'throughput' };
      megaWedding: { max: 500; optimization: 'distributed' };
    };
    budgetRanges: {
      // UK average wedding cost: £20,000-£30,000
      budget: { max: 15000; optimization: 'cost_efficient' };
      midRange: { max: 35000; optimization: 'balanced' };
      luxury: { max: 75000; optimization: 'premium_features' };
      ultraLuxury: { max: 200000; optimization: 'white_glove' };
    };
    vendorCategories: {
      // Wedding vendor priority optimization
      essential: string[]; // ['venue', 'photographer', 'catering']
      important: string[]; // ['flowers', 'music', 'transport']
      optional: string[]; // ['favours', 'extras', 'entertainment']
    };
  };

  // Performance Targets (Wedding Industry Benchmarks)
  performanceTargets: {
    responseTime: {
      vendorDashboard: number; // <800ms for supplier dashboard
      couplePortal: number; // <500ms for couple portal
      reportGeneration: number; // <2s for standard reports
      bulkExport: number; // <30s for bulk data export
      realTimeMetrics: number; // <100ms for live metrics
    };
    throughput: {
      reportsPerSecond: number; // 50+ reports/second during peak
      concurrentUsers: number; // 5000+ concurrent users
      dataProcessingMB: number; // 100MB/s data processing
    };
    availability: {
      weddingDayUptime: number; // 99.99% uptime on Saturdays
      peakSeasonUptime: number; // 99.95% uptime May-October
      overallUptime: number; // 99.9% overall uptime
    };
  };
}

export class WeddingPerformanceOptimizer {
  private config: WeddingPerformanceConfig;
  private queryOptimizer: WeddingQueryOptimizer;
  private cacheManager: ReportCacheManager;
  private performanceMetrics: Map<string, number>;

  constructor(
    config: WeddingPerformanceConfig,
    queryOptimizer: WeddingQueryOptimizer,
    cacheManager: ReportCacheManager,
  ) {
    this.config = config;
    this.queryOptimizer = queryOptimizer;
    this.cacheManager = cacheManager;
    this.performanceMetrics = new Map();
  }

  /**
   * Optimize report generation based on wedding-specific patterns
   */
  async optimizeReportGeneration(
    request: ReportGenerationRequest,
  ): Promise<ReportGenerationRequest> {
    const optimizedRequest = { ...request };

    // Apply wedding date optimizations
    optimizedRequest.parameters = await this.optimizeWeddingDateParameters(
      optimizedRequest.parameters,
      optimizedRequest.type,
    );

    // Apply seasonal optimizations
    optimizedRequest.cacheStrategy = this.optimizeSeasonalCaching(
      optimizedRequest.dateRange,
      optimizedRequest.type,
    );

    // Apply supplier-specific optimizations
    if (optimizedRequest.supplierId) {
      optimizedRequest.queryOptimizations = await this.optimizeSupplierQueries(
        optimizedRequest.supplierId,
        optimizedRequest.type,
      );
    }

    // Apply weekend concentration optimizations
    optimizedRequest.executionStrategy = this.optimizeWeekendExecution(
      optimizedRequest.dateRange,
      optimizedRequest.priority,
    );

    return optimizedRequest;
  }

  /**
   * Optimize wedding date-based parameters for 80% Saturday wedding concentration
   */
  private async optimizeWeddingDateParameters(
    parameters: Record<string, any>,
    reportType: string,
  ): Promise<Record<string, any>> {
    const optimized = { ...parameters };

    if (this.config.weekendConcentration.enabled) {
      // Pre-filter for Saturday weddings if analyzing wedding performance
      if (
        reportType.includes('wedding_performance') ||
        reportType.includes('venue_utilization')
      ) {
        optimized.weekend_focus = true;
        optimized.saturday_weight = 0.8; // 80% Saturday concentration
        optimized.sunday_weight = 0.15; // 15% Sunday weddings
        optimized.weekday_weight = 0.05; // 5% weekday weddings
      }

      // Optimize for wedding timeline patterns (12-18 month planning)
      if (
        reportType.includes('booking_patterns') ||
        reportType.includes('lead_time')
      ) {
        optimized.planning_phase_weights = {
          early_planning: 0.3, // 12-18 months out
          mid_planning: 0.4, // 6-12 months out
          final_planning: 0.2, // 3-6 months out
          last_minute: 0.1, // <3 months out
        };
      }
    }

    return optimized;
  }

  /**
   * Optimize caching strategy based on wedding seasonal patterns
   */
  private optimizeSeasonalCaching(
    dateRange: WeddingDateRange | undefined,
    reportType: string,
  ): string {
    if (!this.config.peakSeasonOptimizations.enabled) {
      return 'standard';
    }

    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason =
      this.config.peakSeasonOptimizations.peakMonths.includes(currentMonth);

    if (isPeakSeason) {
      // Peak season (May-October): Aggressive caching
      if (reportType.includes('seasonal_analysis')) {
        return 'long_term'; // Cache seasonal reports for 7 days
      }
      if (reportType.includes('supplier_performance')) {
        return 'medium_term'; // Cache supplier reports for 3 days
      }
      return 'peak_season'; // General peak season caching (24 hours)
    } else {
      // Off-season (November-April): Standard caching
      if (reportType.includes('planning_ahead')) {
        return 'extended'; // Cache future planning reports longer
      }
      return 'standard'; // Standard caching (6 hours)
    }
  }

  /**
   * Optimize queries for specific supplier types and their usage patterns
   */
  private async optimizeSupplierQueries(
    supplierId: string,
    reportType: string,
  ): Promise<Record<string, any>> {
    const optimizations: Record<string, any> = {};

    // Get supplier category for optimization
    const supplierType = await this.getSupplierType(supplierId);

    switch (supplierType) {
      case 'photographer':
        if (this.config.supplierOptimizations.photographerMetrics) {
          optimizations.image_processing_priority = 'high';
          optimizations.bulk_operation_batching = 500; // Process 500 images at once
          optimizations.portfolio_cache_duration = 3600; // 1 hour for portfolio stats
        }
        break;

      case 'venue':
        if (this.config.supplierOptimizations.venueMetrics) {
          optimizations.capacity_analytics_cache = 86400; // 24 hours
          optimizations.booking_pattern_precompute = true;
          optimizations.competitor_analysis_enabled = true;
        }
        break;

      case 'florist':
        if (this.config.supplierOptimizations.floristMetrics) {
          optimizations.seasonal_trend_prediction = true;
          optimizations.order_volume_forecasting = true;
          optimizations.supplier_integration_optimization = true;
        }
        break;

      default:
        // General supplier optimizations
        optimizations.standard_supplier_cache = 3600; // 1 hour
        break;
    }

    return optimizations;
  }

  /**
   * Optimize execution strategy for weekend wedding concentration
   */
  private optimizeWeekendExecution(
    dateRange: WeddingDateRange | undefined,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): string {
    if (!this.config.weekendConcentration.enabled) {
      return 'standard';
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeddingDay = dayOfWeek === 6; // Saturday
    const isPreWeddingDay = dayOfWeek === 5; // Friday

    // Wedding day emergency protocol
    if (
      isWeddingDay &&
      this.config.weekendConcentration.emergencyWeddingDayProtocol.enabled
    ) {
      return 'wedding_day_emergency'; // Bypass all queues, maximum priority
    }

    // Friday preparation optimization
    if (
      isPreWeddingDay &&
      this.config.weekendConcentration.fridayPreparationBoost
    ) {
      return 'friday_preparation'; // Pre-cache Saturday reports
    }

    // Check if this report is for wedding day analysis
    if (dateRange && this.isWeddingDayReport(dateRange)) {
      return priority === 'critical'
        ? 'wedding_day_priority'
        : 'wedding_focused';
    }

    return 'standard';
  }

  /**
   * Check if the report covers wedding day analysis
   */
  private isWeddingDayReport(dateRange: WeddingDateRange): boolean {
    const today = new Date();
    const reportStart = new Date(dateRange.start);
    const reportEnd = new Date(dateRange.end);

    // Check if today (potential wedding day) falls within the report range
    return reportStart <= today && today <= reportEnd;
  }

  /**
   * Get supplier type from database or cache
   */
  private async getSupplierType(supplierId: string): Promise<string> {
    // Try cache first
    const cached = await this.cacheManager.get(`supplier_type:${supplierId}`);
    if (cached) {
      return cached;
    }

    // This would typically query the database
    // For optimization, we'll use a placeholder implementation
    const supplierType = 'photographer'; // Placeholder

    // Cache the supplier type for 24 hours
    await this.cacheManager.set(
      `supplier_type:${supplierId}`,
      supplierType,
      86400,
    );

    return supplierType;
  }

  /**
   * Apply wedding-specific index optimizations
   */
  async optimizeDatabaseIndexes(): Promise<string[]> {
    const recommendations: string[] = [];

    if (this.config.weekendConcentration.enabled) {
      recommendations.push(
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weddings_saturday_date ON weddings (wedding_date) WHERE EXTRACT(dow FROM wedding_date) = 6;',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weddings_weekend_date ON weddings (wedding_date) WHERE EXTRACT(dow FROM wedding_date) IN (6, 0);',
      );
    }

    if (this.config.peakSeasonOptimizations.enabled) {
      recommendations.push(
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weddings_peak_season ON weddings (wedding_date) WHERE EXTRACT(month FROM wedding_date) BETWEEN 5 AND 10;',
      );
    }

    if (this.config.supplierOptimizations.enabled) {
      recommendations.push(
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_type_active ON suppliers (supplier_type, is_active) WHERE is_active = true;',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_supplier_wedding_date ON bookings (supplier_id, wedding_date);',
      );
    }

    return recommendations;
  }

  /**
   * Monitor and record performance metrics
   */
  recordPerformanceMetric(metricName: string, value: number): void {
    this.performanceMetrics.set(metricName, value);

    // Check against wedding industry targets
    this.validatePerformanceTarget(metricName, value);
  }

  /**
   * Validate performance against wedding industry targets
   */
  private validatePerformanceTarget(metricName: string, value: number): void {
    const targets = this.config.performanceTargets;

    switch (metricName) {
      case 'vendor_dashboard_response_time':
        if (value > targets.responseTime.vendorDashboard) {
          console.warn(
            `Vendor dashboard response time ${value}ms exceeds target ${targets.responseTime.vendorDashboard}ms`,
          );
        }
        break;

      case 'couple_portal_response_time':
        if (value > targets.responseTime.couplePortal) {
          console.warn(
            `Couple portal response time ${value}ms exceeds target ${targets.responseTime.couplePortal}ms`,
          );
        }
        break;

      case 'report_generation_time':
        if (value > targets.responseTime.reportGeneration * 1000) {
          console.warn(
            `Report generation time ${value}ms exceeds target ${targets.responseTime.reportGeneration * 1000}ms`,
          );
        }
        break;
    }
  }

  /**
   * Get current performance metrics summary
   */
  getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.performanceMetrics);
  }

  /**
   * Generate wedding-specific performance recommendations
   */
  generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    // Wedding season recommendations
    if (this.config.peakSeasonOptimizations.enabled) {
      const currentMonth = new Date().getMonth() + 1;
      const isPeakSeason =
        this.config.peakSeasonOptimizations.peakMonths.includes(currentMonth);

      if (isPeakSeason) {
        recommendations.push(
          '🎯 Peak wedding season detected - Consider scaling up resources',
          '💾 Enable aggressive caching for seasonal reports',
          '⚡ Pre-warm cache for popular wedding reports',
        );
      } else {
        recommendations.push(
          '📊 Off-season optimization period - Perfect time for maintenance',
          '🔧 Consider running database maintenance and index optimization',
          '📈 Analyze peak season performance data for next year improvements',
        );
      }
    }

    // Weekend optimization recommendations
    if (this.config.weekendConcentration.enabled) {
      const dayOfWeek = new Date().getDay();

      if (dayOfWeek === 5) {
        // Friday
        recommendations.push(
          '🏃‍♂️ Friday preparation mode - Pre-cache Saturday wedding reports',
          '⚠️  Prepare for 5x normal load on Saturday',
          '🔄 Run maintenance tasks before weekend wedding rush',
        );
      } else if (dayOfWeek === 6) {
        // Saturday
        recommendations.push(
          '💒 Wedding day - All systems optimized for maximum performance',
          '🚨 Emergency protocols active for sub-5-second response times',
          '📊 Monitor real-time metrics closely',
        );
      }
    }

    return recommendations;
  }
}

/**
 * Default wedding industry performance configuration
 */
export const DEFAULT_WEDDING_PERFORMANCE_CONFIG: WeddingPerformanceConfig = {
  peakSeasonOptimizations: {
    enabled: true,
    peakMonths: [5, 6, 7, 8, 9, 10], // May through October
    resourceMultiplier: 2.0,
    cacheWarming: {
      enabled: true,
      preloadDays: 30,
      popularReports: [
        'wedding_performance_summary',
        'supplier_analytics',
        'seasonal_booking_trends',
        'venue_utilization',
        'photographer_portfolio_stats',
      ],
    },
  },

  weekendConcentration: {
    enabled: true,
    saturdayLoadMultiplier: 5.0,
    fridayPreparationBoost: true,
    sundayCleanupOptimization: true,
    emergencyWeddingDayProtocol: {
      enabled: true,
      responseTimeTarget: 5000, // 5 seconds maximum
      priorityQueueBypass: true,
      dedicatedResources: 30, // 30% of resources reserved for wedding day
    },
  },

  supplierOptimizations: {
    enabled: true,
    photographerMetrics: {
      quickDeliveryTargets: 2000, // 2 seconds
      imageProcessingPriority: 'high',
      bulkOperationOptimization: true,
    },
    venueMetrics: {
      capacityAnalyticsCache: 86400, // 24 hours
      seasonalBookingPatterns: true,
      competitorAnalysis: true,
    },
    floristMetrics: {
      seasonalTrendPrediction: true,
      orderVolumeForecasting: true,
      supplierIntegrationOptimization: true,
    },
  },

  timelineOptimizations: {
    enabled: true,
    planningPhaseCache: {
      earlyPlanning: 604800, // 7 days
      midPlanning: 259200, // 3 days
      finalPlanning: 86400, // 1 day
      lastMinute: 3600, // 1 hour
      weddingWeek: 300, // 5 minutes
      weddingDay: 0, // No cache, real-time only
    },
    criticalPathOptimization: {
      enabled: true,
      identifyBottlenecks: true,
      autoResourceReallocation: true,
    },
  },

  regionalOptimizations: {
    enabled: true,
    ukSpecific: {
      seasonPeak: [6, 7, 8, 9], // June through September
      bankHolidayBoost: true,
      registryOfficeHours: {
        weekdayHours: [9, 17],
        saturdayHours: [9, 15],
        sundayAvailable: false,
      },
    },
    destinationWeddings: {
      timezoneOptimization: true,
      internationalSupplierSync: true,
      currencyConversionCache: 3600, // 1 hour
    },
  },

  dataPatterns: {
    enabled: true,
    weddingPartySize: {
      smallWedding: { max: 50, optimization: 'memory' },
      mediumWedding: { max: 100, optimization: 'balanced' },
      largeWedding: { max: 200, optimization: 'throughput' },
      megaWedding: { max: 500, optimization: 'distributed' },
    },
    budgetRanges: {
      budget: { max: 15000, optimization: 'cost_efficient' },
      midRange: { max: 35000, optimization: 'balanced' },
      luxury: { max: 75000, optimization: 'premium_features' },
      ultraLuxury: { max: 200000, optimization: 'white_glove' },
    },
    vendorCategories: {
      essential: ['venue', 'photographer', 'catering'],
      important: ['flowers', 'music', 'transport'],
      optional: ['favours', 'extras', 'entertainment'],
    },
  },

  performanceTargets: {
    responseTime: {
      vendorDashboard: 800, // 800ms
      couplePortal: 500, // 500ms
      reportGeneration: 2, // 2 seconds
      bulkExport: 30, // 30 seconds
      realTimeMetrics: 100, // 100ms
    },
    throughput: {
      reportsPerSecond: 50, // 50 reports/second
      concurrentUsers: 5000, // 5000 concurrent users
      dataProcessingMB: 100, // 100MB/s
    },
    availability: {
      weddingDayUptime: 99.99, // 99.99%
      peakSeasonUptime: 99.95, // 99.95%
      overallUptime: 99.9, // 99.9%
    },
  },
};
