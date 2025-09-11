/**
 * WS-132 Round 3: Trial Performance Monitoring Service
 * Real-time performance monitoring and optimization recommendations
 */

import { optimizedTrialIntegration } from './OptimizedTrialUsageIntegration';
import { trialCacheManager } from './TrialCacheManager';
import { createClient } from '@/lib/supabase/server';

interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'slow_query'
    | 'cache_miss'
    | 'high_memory'
    | 'db_bottleneck'
    | 'api_timeout';
  message: string;
  operation: string;
  value: number;
  threshold: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface SystemHealthMetrics {
  overall_health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  query_performance: {
    avg_response_time: number;
    percentile_95: number;
    slow_query_count: number;
  };
  cache_performance: {
    hit_rate: number;
    memory_usage_mb: number;
    entries_count: number;
    expired_entries: number;
  };
  database_performance: {
    active_connections: number;
    avg_query_time: number;
    lock_waits: number;
  };
  recommendations: string[];
  alerts: PerformanceAlert[];
  last_updated: string;
}

export class TrialPerformanceMonitor {
  private readonly supabase = createClient();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: PerformanceAlert[] = [];
  private performanceHistory: any[] = [];
  private readonly MAX_HISTORY_ENTRIES = 1000;

  // Performance thresholds
  private readonly THRESHOLDS = {
    SLOW_QUERY_MS: 200,
    CRITICAL_QUERY_MS: 1000,
    MIN_CACHE_HIT_RATE: 75,
    CRITICAL_CACHE_HIT_RATE: 50,
    MAX_MEMORY_MB: 256,
    CRITICAL_MEMORY_MB: 512,
  };

  /**
   * Start continuous performance monitoring
   */
  async startMonitoring(intervalSeconds: number = 30): Promise<void> {
    console.log(
      `Starting trial performance monitoring (interval: ${intervalSeconds}s)`,
    );

    // Stop existing monitoring
    this.stopMonitoring();

    // Initial health check
    await this.performHealthCheck();

    // Schedule regular monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Performance monitoring stopped');
    }
  }

  /**
   * Perform comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealthMetrics> {
    const startTime = Date.now();

    try {
      // Gather performance metrics in parallel
      const [queryMetrics, cacheMetrics, dbMetrics, performanceAnalytics] =
        await Promise.all([
          this.gatherQueryMetrics(),
          this.gatherCacheMetrics(),
          this.gatherDatabaseMetrics(),
          optimizedTrialIntegration.getPerformanceAnalytics(),
        ]);

      // Analyze alerts
      const newAlerts = this.analyzePerformanceAlerts(
        queryMetrics,
        cacheMetrics,
        dbMetrics,
      );
      this.alerts = [...this.alerts, ...newAlerts].slice(-50); // Keep last 50 alerts

      // Determine overall health
      const overallHealth = this.calculateOverallHealth(
        queryMetrics,
        cacheMetrics,
        dbMetrics,
      );

      // Generate recommendations
      const recommendations = this.generateSystemRecommendations(
        queryMetrics,
        cacheMetrics,
        dbMetrics,
        performanceAnalytics,
      );

      const healthMetrics: SystemHealthMetrics = {
        overall_health: overallHealth,
        query_performance: queryMetrics,
        cache_performance: cacheMetrics,
        database_performance: dbMetrics,
        recommendations,
        alerts: this.alerts,
        last_updated: new Date().toISOString(),
      };

      // Store performance history
      this.performanceHistory.push({
        ...healthMetrics,
        check_duration_ms: Date.now() - startTime,
      });

      // Keep history size manageable
      if (this.performanceHistory.length > this.MAX_HISTORY_ENTRIES) {
        this.performanceHistory = this.performanceHistory.slice(
          -this.MAX_HISTORY_ENTRIES,
        );
      }

      // Log critical issues
      if (overallHealth === 'critical' || overallHealth === 'poor') {
        console.error('Critical performance issue detected:', healthMetrics);
      }

      return healthMetrics;
    } catch (error) {
      console.error('Health check failed:', error);
      return this.getEmergencyHealthMetrics(error);
    }
  }

  /**
   * Get real-time performance dashboard data
   */
  async getPerformanceDashboard(): Promise<{
    currentHealth: SystemHealthMetrics;
    performanceTrends: any[];
    criticalAlerts: PerformanceAlert[];
    optimizationOpportunities: string[];
  }> {
    try {
      const currentHealth = await this.performHealthCheck();

      const performanceTrends = this.calculatePerformanceTrends();

      const criticalAlerts = this.alerts.filter(
        (alert) => alert.severity === 'critical' || alert.severity === 'high',
      );

      const optimizationOpportunities =
        this.identifyOptimizationOpportunities(currentHealth);

      return {
        currentHealth,
        performanceTrends,
        criticalAlerts,
        optimizationOpportunities,
      };
    } catch (error) {
      console.error('Performance dashboard generation failed:', error);
      return {
        currentHealth: this.getEmergencyHealthMetrics(error),
        performanceTrends: [],
        criticalAlerts: [],
        optimizationOpportunities: [
          'Performance monitoring temporarily unavailable',
        ],
      };
    }
  }

  /**
   * Trigger performance optimization actions
   */
  async triggerOptimization(): Promise<{
    actionsPerformed: string[];
    cacheCleanupResults: any;
    preWarmResults: any;
    performanceImprovement: number;
  }> {
    const startTime = Date.now();
    const actionsPerformed: string[] = [];

    try {
      // Clean up expired cache entries
      await trialCacheManager.cleanup();
      actionsPerformed.push('Cache cleanup completed');

      // Pre-warm frequently accessed data
      await optimizedTrialIntegration.preWarmCache();
      actionsPerformed.push('Cache pre-warming completed');

      // Run database maintenance if needed
      const dbCleanup = await this.performDatabaseMaintenance();
      if (dbCleanup.cleanedEntries > 0) {
        actionsPerformed.push(
          `Database cleanup: ${dbCleanup.cleanedEntries} entries removed`,
        );
      }

      // Measure performance improvement
      const healthBefore =
        this.performanceHistory[this.performanceHistory.length - 2];
      const healthAfter = await this.performHealthCheck();

      const improvement = this.calculatePerformanceImprovement(
        healthBefore,
        healthAfter,
      );

      return {
        actionsPerformed,
        cacheCleanupResults: { success: true },
        preWarmResults: { success: true },
        performanceImprovement: improvement,
      };
    } catch (error) {
      console.error('Performance optimization failed:', error);
      return {
        actionsPerformed: [...actionsPerformed, `Error: ${error.message}`],
        cacheCleanupResults: { error: error.message },
        preWarmResults: { error: error.message },
        performanceImprovement: 0,
      };
    }
  }

  // Private helper methods

  private async gatherQueryMetrics(): Promise<any> {
    try {
      // Test query performance with real operations
      const testQueries = [
        async () => optimizedTrialIntegration.generateBusinessIntelligence(),
        async () =>
          optimizedTrialIntegration.generateCrossTeamROI(
            'test-trial-performance',
          ),
      ];

      const queryTimes: number[] = [];

      for (const query of testQueries) {
        const start = Date.now();
        try {
          await query();
          queryTimes.push(Date.now() - start);
        } catch (error) {
          // Query failed, record as slow
          queryTimes.push(this.THRESHOLDS.CRITICAL_QUERY_MS);
        }
      }

      const avgTime =
        queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      const percentile95 =
        queryTimes.sort((a, b) => a - b)[
          Math.floor(queryTimes.length * 0.95)
        ] || 0;
      const slowQueries = queryTimes.filter(
        (time) => time > this.THRESHOLDS.SLOW_QUERY_MS,
      ).length;

      return {
        avg_response_time: avgTime,
        percentile_95: percentile95,
        slow_query_count: slowQueries,
      };
    } catch (error) {
      console.error('Query metrics gathering failed:', error);
      return {
        avg_response_time: this.THRESHOLDS.CRITICAL_QUERY_MS,
        percentile_95: this.THRESHOLDS.CRITICAL_QUERY_MS,
        slow_query_count: 99,
      };
    }
  }

  private async gatherCacheMetrics(): Promise<any> {
    try {
      const cacheStats = await trialCacheManager.getStats();

      return {
        hit_rate: cacheStats.memoryHitRate || 0,
        memory_usage_mb: (cacheStats.totalCacheSize || 0) / (1024 * 1024),
        entries_count: cacheStats.memoryEntries || 0,
        expired_entries: 0, // Would need to calculate from cache data
      };
    } catch (error) {
      console.error('Cache metrics gathering failed:', error);
      return {
        hit_rate: 0,
        memory_usage_mb: 0,
        entries_count: 0,
        expired_entries: 0,
      };
    }
  }

  private async gatherDatabaseMetrics(): Promise<any> {
    try {
      // Query database performance metrics
      const { data: dbStats } = await this.supabase.rpc('get_cache_statistics');

      return {
        active_connections: 10, // Would need actual DB connection monitoring
        avg_query_time: 50, // Would need actual query time monitoring
        lock_waits: 0, // Would need actual lock monitoring
      };
    } catch (error) {
      // GUARDIAN FIX: Use environment-aware logging to prevent data exposure
      if (process.env.NODE_ENV === 'development') {
        console.error('Database metrics gathering failed:', error);
      }

      // Return safe fallback values for production
      return {
        active_connections: 0,
        avg_query_time: this.THRESHOLDS.CRITICAL_QUERY_MS,
        lock_waits: 99,
      };
    }
  }

  private analyzePerformanceAlerts(
    queryMetrics: any,
    cacheMetrics: any,
    dbMetrics: any,
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Query performance alerts
    if (queryMetrics.avg_response_time > this.THRESHOLDS.CRITICAL_QUERY_MS) {
      alerts.push({
        id: `query-${Date.now()}`,
        severity: 'critical',
        type: 'slow_query',
        message: 'Average query response time exceeds critical threshold',
        operation: 'query_performance',
        value: queryMetrics.avg_response_time,
        threshold: this.THRESHOLDS.CRITICAL_QUERY_MS,
        timestamp: new Date().toISOString(),
        metadata: queryMetrics,
      });
    } else if (queryMetrics.avg_response_time > this.THRESHOLDS.SLOW_QUERY_MS) {
      alerts.push({
        id: `query-${Date.now()}`,
        severity: 'medium',
        type: 'slow_query',
        message: 'Average query response time above optimal threshold',
        operation: 'query_performance',
        value: queryMetrics.avg_response_time,
        threshold: this.THRESHOLDS.SLOW_QUERY_MS,
        timestamp: new Date().toISOString(),
        metadata: queryMetrics,
      });
    }

    // Cache performance alerts
    if (cacheMetrics.hit_rate < this.THRESHOLDS.CRITICAL_CACHE_HIT_RATE) {
      alerts.push({
        id: `cache-${Date.now()}`,
        severity: 'critical',
        type: 'cache_miss',
        message: 'Cache hit rate critically low',
        operation: 'cache_performance',
        value: cacheMetrics.hit_rate,
        threshold: this.THRESHOLDS.CRITICAL_CACHE_HIT_RATE,
        timestamp: new Date().toISOString(),
        metadata: cacheMetrics,
      });
    }

    // Memory usage alerts
    if (cacheMetrics.memory_usage_mb > this.THRESHOLDS.CRITICAL_MEMORY_MB) {
      alerts.push({
        id: `memory-${Date.now()}`,
        severity: 'critical',
        type: 'high_memory',
        message: 'Memory usage critically high',
        operation: 'memory_usage',
        value: cacheMetrics.memory_usage_mb,
        threshold: this.THRESHOLDS.CRITICAL_MEMORY_MB,
        timestamp: new Date().toISOString(),
        metadata: { memory_usage: cacheMetrics.memory_usage_mb },
      });
    }

    return alerts;
  }

  private calculateOverallHealth(
    queryMetrics: any,
    cacheMetrics: any,
    dbMetrics: any,
  ): SystemHealthMetrics['overall_health'] {
    let healthScore = 100;

    // Deduct points for poor query performance
    if (queryMetrics.avg_response_time > this.THRESHOLDS.CRITICAL_QUERY_MS) {
      healthScore -= 40;
    } else if (queryMetrics.avg_response_time > this.THRESHOLDS.SLOW_QUERY_MS) {
      healthScore -= 20;
    }

    // Deduct points for poor cache performance
    if (cacheMetrics.hit_rate < this.THRESHOLDS.CRITICAL_CACHE_HIT_RATE) {
      healthScore -= 30;
    } else if (cacheMetrics.hit_rate < this.THRESHOLDS.MIN_CACHE_HIT_RATE) {
      healthScore -= 15;
    }

    // Deduct points for high memory usage
    if (cacheMetrics.memory_usage_mb > this.THRESHOLDS.CRITICAL_MEMORY_MB) {
      healthScore -= 20;
    } else if (cacheMetrics.memory_usage_mb > this.THRESHOLDS.MAX_MEMORY_MB) {
      healthScore -= 10;
    }

    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 75) return 'good';
    if (healthScore >= 50) return 'fair';
    if (healthScore >= 25) return 'poor';
    return 'critical';
  }

  private generateSystemRecommendations(
    queryMetrics: any,
    cacheMetrics: any,
    dbMetrics: any,
    performanceAnalytics: any,
  ): string[] {
    const recommendations: string[] = [];

    if (queryMetrics.avg_response_time > this.THRESHOLDS.SLOW_QUERY_MS) {
      recommendations.push('Optimize slow queries or increase cache coverage');
    }

    if (cacheMetrics.hit_rate < this.THRESHOLDS.MIN_CACHE_HIT_RATE) {
      recommendations.push(
        'Improve caching strategy - consider longer TTL or pre-warming',
      );
    }

    if (cacheMetrics.memory_usage_mb > this.THRESHOLDS.MAX_MEMORY_MB) {
      recommendations.push(
        'Consider reducing cache size or implementing LRU eviction',
      );
    }

    if (queryMetrics.slow_query_count > 5) {
      recommendations.push(
        'Multiple slow queries detected - review database indexes',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal');
    }

    return recommendations;
  }

  private calculatePerformanceTrends(): any[] {
    if (this.performanceHistory.length < 2) return [];

    return this.performanceHistory.slice(-10).map((entry, index) => ({
      timestamp: entry.last_updated,
      query_time: entry.query_performance.avg_response_time,
      cache_hit_rate: entry.cache_performance.hit_rate,
      memory_usage: entry.cache_performance.memory_usage_mb,
      health_score: this.healthToScore(entry.overall_health),
    }));
  }

  private identifyOptimizationOpportunities(
    health: SystemHealthMetrics,
  ): string[] {
    const opportunities: string[] = [];

    if (health.query_performance.avg_response_time > 100) {
      opportunities.push(
        'Query optimization opportunity: Average response time can be improved',
      );
    }

    if (health.cache_performance.hit_rate < 85) {
      opportunities.push(
        'Cache optimization opportunity: Hit rate can be increased',
      );
    }

    if (health.cache_performance.expired_entries > 10) {
      opportunities.push('Cache cleanup opportunity: Remove expired entries');
    }

    return opportunities;
  }

  private async performDatabaseMaintenance(): Promise<{
    cleanedEntries: number;
  }> {
    try {
      const { data } = await this.supabase.rpc('cleanup_expired_cache');
      return { cleanedEntries: data || 0 };
    } catch (error) {
      console.error('Database maintenance failed:', error);
      return { cleanedEntries: 0 };
    }
  }

  private calculatePerformanceImprovement(before: any, after: any): number {
    if (!before || !after) return 0;

    const beforeScore = this.healthToScore(before.overall_health);
    const afterScore = this.healthToScore(after.overall_health);

    return ((afterScore - beforeScore) / beforeScore) * 100;
  }

  private healthToScore(health: string): number {
    const scores = {
      excellent: 95,
      good: 80,
      fair: 60,
      poor: 40,
      critical: 20,
    };
    return scores[health] || 20;
  }

  private getEmergencyHealthMetrics(error: any): SystemHealthMetrics {
    return {
      overall_health: 'critical',
      query_performance: {
        avg_response_time: this.THRESHOLDS.CRITICAL_QUERY_MS,
        percentile_95: this.THRESHOLDS.CRITICAL_QUERY_MS,
        slow_query_count: 99,
      },
      cache_performance: {
        hit_rate: 0,
        memory_usage_mb: 0,
        entries_count: 0,
        expired_entries: 0,
      },
      database_performance: {
        active_connections: 0,
        avg_query_time: this.THRESHOLDS.CRITICAL_QUERY_MS,
        lock_waits: 99,
      },
      recommendations: [`System monitoring failed: ${error.message}`],
      alerts: [
        {
          id: `emergency-${Date.now()}`,
          severity: 'critical',
          type: 'db_bottleneck',
          message: 'Performance monitoring system failure',
          operation: 'monitoring',
          value: 0,
          threshold: 0,
          timestamp: new Date().toISOString(),
          metadata: { error: error.message },
        },
      ],
      last_updated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const trialPerformanceMonitor = new TrialPerformanceMonitor();
