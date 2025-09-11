/**
 * Traffic Analytics Collector - Real-time Analytics Collection
 * WS-250 - Wedding industry focused traffic analytics and metrics
 */

import {
  TrafficMetrics,
  AggregatedMetrics,
  GatewayRequest,
  GatewayResponse,
  VendorTier,
  WeddingContext,
} from '@/types/api-gateway';

export class TrafficAnalyticsCollector {
  private metricsQueue: TrafficMetrics[] = [];
  private aggregatedCache: Map<string, AggregatedMetrics> = new Map();
  private realtimeStats: RealtimeStats = this.initializeRealtimeStats();

  // Wedding-specific analytics
  private weddingMetrics: WeddingAnalytics = {
    saturdayTraffic: 0,
    peakSeasonMultiplier: 1,
    criticalAPIUsage: 0,
    vendorTierDistribution: {
      enterprise: 0,
      scale: 0,
      professional: 0,
      starter: 0,
      free: 0,
    },
    weddingSuccessRate: 0,
  };

  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly BATCH_PROCESS_INTERVAL = 5000; // 5 seconds
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly WEDDING_SEASON_MONTHS = [5, 6, 7, 8, 9];

  constructor() {
    this.startBatchProcessing();
    this.startRealtimeUpdates();
    this.initializeWeddingAnalytics();
  }

  /**
   * Record a request/response pair for analytics
   */
  public recordTraffic(
    request: GatewayRequest,
    response: GatewayResponse,
  ): void {
    const metrics: TrafficMetrics = {
      timestamp: new Date(),
      endpoint: request.path,
      method: request.method,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      requestSize: this.calculateRequestSize(request),
      responseSize: this.calculateResponseSize(response),
      userAgent: request.userAgent,
      ip: request.ip,
      vendorId: request.vendorContext?.vendorId,
      weddingId: request.weddingContext?.isWeddingCritical
        ? 'wedding-critical'
        : undefined,
      tier: request.vendorContext?.tier || 'free',
      weddingContext: request.weddingContext,
    };

    // Add to queue for batch processing
    this.metricsQueue.push(metrics);

    // Update real-time stats immediately
    this.updateRealtimeStats(metrics);

    // Update wedding-specific metrics
    this.updateWeddingMetrics(metrics, request);

    // Keep queue size manageable
    if (this.metricsQueue.length > this.MAX_QUEUE_SIZE) {
      this.metricsQueue.splice(0, 1000); // Remove oldest 1000 entries
    }
  }

  /**
   * Get aggregated metrics for a time range
   */
  public getAggregatedMetrics(
    startTime: Date,
    endTime: Date,
  ): AggregatedMetrics {
    const cacheKey = `${startTime.getTime()}-${endTime.getTime()}`;
    const cached = this.aggregatedCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const relevantMetrics = this.metricsQueue.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime,
    );

    const aggregated = this.calculateAggregatedMetrics(
      relevantMetrics,
      startTime,
      endTime,
    );
    this.aggregatedCache.set(cacheKey, aggregated);

    return aggregated;
  }

  /**
   * Get real-time statistics
   */
  public getRealtimeStats(): RealtimeStats & WeddingAnalytics {
    return {
      ...this.realtimeStats,
      ...this.weddingMetrics,
    };
  }

  /**
   * Get wedding-specific analytics
   */
  public getWeddingAnalytics(): WeddingAnalytics & WeddingInsights {
    const insights = this.calculateWeddingInsights();
    return {
      ...this.weddingMetrics,
      ...insights,
    };
  }

  /**
   * Get traffic trends for forecasting
   */
  public getTrafficTrends(): TrafficTrends {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    const hourlyMetrics = this.getAggregatedMetrics(hourAgo, now);
    const dailyMetrics = this.getAggregatedMetrics(dayAgo, now);

    return {
      hourlyTrend: this.calculateTrend(hourlyMetrics),
      dailyTrend: this.calculateTrend(dailyMetrics),
      projectedLoad: this.projectLoad(),
      weddingSeasonImpact: this.calculateWeddingSeasonImpact(),
      saturdayPeakForecast: this.forecastSaturdayPeak(),
    };
  }

  /**
   * Get top endpoints by various metrics
   */
  public getTopEndpoints(
    metric: 'requests' | 'response_time' | 'errors',
    limit = 10,
  ): EndpointStats[] {
    const endpointStats: Map<string, EndpointStats> = new Map();

    this.metricsQueue.forEach((m) => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = endpointStats.get(key) || {
        endpoint: key,
        requests: 0,
        totalResponseTime: 0,
        errors: 0,
        avgResponseTime: 0,
        weddingCritical: !!m.weddingContext?.isWeddingCritical,
      };

      existing.requests++;
      existing.totalResponseTime += m.responseTime;
      if (m.statusCode >= 400) existing.errors++;
      existing.avgResponseTime = existing.totalResponseTime / existing.requests;

      endpointStats.set(key, existing);
    });

    const sortedStats = Array.from(endpointStats.values());

    switch (metric) {
      case 'requests':
        sortedStats.sort((a, b) => b.requests - a.requests);
        break;
      case 'response_time':
        sortedStats.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
        break;
      case 'errors':
        sortedStats.sort((a, b) => b.errors - a.errors);
        break;
    }

    return sortedStats.slice(0, limit);
  }

  /**
   * Generate analytics report for business insights
   */
  public generateAnalyticsReport(): AnalyticsReport {
    const realtimeStats = this.getRealtimeStats();
    const weddingAnalytics = this.getWeddingAnalytics();
    const trends = this.getTrafficTrends();
    const topEndpoints = this.getTopEndpoints('requests', 5);

    return {
      generatedAt: new Date(),
      summary: {
        totalRequests: realtimeStats.totalRequests,
        successRate: realtimeStats.successRate,
        avgResponseTime: realtimeStats.avgResponseTime,
        activeVendors: realtimeStats.activeVendors,
      },
      weddingInsights: {
        saturdayTrafficMultiplier:
          weddingAnalytics.saturdayTrafficIncrease || 1,
        peakSeasonActive: this.isPeakWeddingSeason(),
        criticalAPIHealth: weddingAnalytics.criticalAPISuccessRate || 0.95,
        topVendorTier: this.getTopVendorTier(),
      },
      recommendations: this.generateRecommendations(
        realtimeStats,
        weddingAnalytics,
        trends,
      ),
      alerts: this.generateAlerts(realtimeStats),
    };
  }

  // ========================================
  // Private Methods
  // ========================================

  private updateRealtimeStats(metrics: TrafficMetrics): void {
    this.realtimeStats.totalRequests++;
    this.realtimeStats.totalResponseTime += metrics.responseTime;
    this.realtimeStats.avgResponseTime =
      this.realtimeStats.totalResponseTime / this.realtimeStats.totalRequests;

    if (metrics.statusCode >= 200 && metrics.statusCode < 400) {
      this.realtimeStats.successfulRequests++;
    } else {
      this.realtimeStats.failedRequests++;
    }

    this.realtimeStats.successRate =
      this.realtimeStats.successfulRequests / this.realtimeStats.totalRequests;

    // Update tier stats
    this.realtimeStats.tierStats[metrics.tier]++;

    // Track unique vendors
    if (metrics.vendorId) {
      this.realtimeStats.uniqueVendors.add(metrics.vendorId);
      this.realtimeStats.activeVendors = this.realtimeStats.uniqueVendors.size;
    }

    // Update p95 response time (simplified calculation)
    if (this.realtimeStats.responseTimes.length >= 100) {
      this.realtimeStats.responseTimes.shift();
    }
    this.realtimeStats.responseTimes.push(metrics.responseTime);
    this.realtimeStats.p95ResponseTime = this.calculatePercentile(
      this.realtimeStats.responseTimes,
      0.95,
    );
  }

  private updateWeddingMetrics(
    metrics: TrafficMetrics,
    request: GatewayRequest,
  ): void {
    // Saturday traffic tracking
    if (new Date().getDay() === 6) {
      this.weddingMetrics.saturdayTraffic++;
    }

    // Wedding-critical API usage
    if (metrics.weddingContext?.isWeddingCritical) {
      this.weddingMetrics.criticalAPIUsage++;
    }

    // Vendor tier distribution
    this.weddingMetrics.vendorTierDistribution[metrics.tier]++;

    // Wedding success rate (for critical APIs)
    if (metrics.weddingContext?.isWeddingCritical) {
      const isSuccess = metrics.statusCode >= 200 && metrics.statusCode < 400;
      const currentTotal = this.weddingMetrics.criticalAPIUsage;
      const currentSuccesses =
        this.weddingMetrics.weddingSuccessRate * (currentTotal - 1);
      this.weddingMetrics.weddingSuccessRate = isSuccess
        ? (currentSuccesses + 1) / currentTotal
        : currentSuccesses / currentTotal;
    }
  }

  private calculateAggregatedMetrics(
    metrics: TrafficMetrics[],
    startTime: Date,
    endTime: Date,
  ): AggregatedMetrics {
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(
      (m) => m.statusCode >= 200 && m.statusCode < 400,
    ).length;
    const successRate =
      totalRequests > 0 ? successfulRequests / totalRequests : 0;

    const responseTimes = metrics.map((m) => m.responseTime);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0;

    const p95ResponseTime = this.calculatePercentile(responseTimes, 0.95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 0.99);

    // Error categorization
    const errorsByType: Record<string, number> = {};
    metrics
      .filter((m) => m.statusCode >= 400)
      .forEach((m) => {
        const errorType = `${Math.floor(m.statusCode / 100)}xx`;
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

    // Traffic by tier
    const trafficByTier: Record<VendorTier, number> = {
      enterprise: 0,
      scale: 0,
      professional: 0,
      starter: 0,
      free: 0,
    };
    metrics.forEach((m) => {
      trafficByTier[m.tier]++;
    });

    // Wedding-critical requests
    const weddingCriticalRequests = metrics.filter(
      (m) => m.weddingContext?.isWeddingCritical,
    ).length;

    // Top endpoints
    const endpointCounts: Map<
      string,
      { requests: number; avgResponseTime: number }
    > = new Map();
    metrics.forEach((m) => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = endpointCounts.get(key) || {
        requests: 0,
        avgResponseTime: 0,
      };
      existing.requests++;
      existing.avgResponseTime =
        (existing.avgResponseTime * (existing.requests - 1) + m.responseTime) /
        existing.requests;
      endpointCounts.set(key, existing);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([path, stats]) => ({ path, ...stats }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      timeRange: { start: startTime, end: endTime },
      totalRequests,
      successRate,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorsByType,
      trafficByTier,
      weddingCriticalRequests,
      topEndpoints,
    };
  }

  private calculateWeddingInsights(): WeddingInsights {
    const now = new Date();
    const isWeddingSeason = this.isPeakWeddingSeason();
    const isSaturday = now.getDay() === 6;

    return {
      saturdayTrafficIncrease: this.calculateSaturdayIncrease(),
      peakSeasonMultiplier: isWeddingSeason ? 1.5 : 1.0,
      criticalAPISuccessRate: this.weddingMetrics.weddingSuccessRate,
      recommendedCapacity: this.calculateRecommendedCapacity(),
      nextPeakPrediction: this.predictNextPeak(),
    };
  }

  private isPeakWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.WEDDING_SEASON_MONTHS.includes(currentMonth);
  }

  private calculateSaturdayIncrease(): number {
    // Calculate average Saturday vs weekday traffic
    // Simplified implementation
    return this.weddingMetrics.saturdayTraffic > 0 ? 2.5 : 1.0;
  }

  private calculateRecommendedCapacity(): number {
    const baseCapacity = 100; // Base capacity units
    const currentLoad = this.realtimeStats.totalRequests;
    const utilizationRate = currentLoad / baseCapacity;

    let recommendedCapacity = Math.ceil(baseCapacity * 1.2); // 20% buffer

    if (this.isPeakWeddingSeason()) {
      recommendedCapacity *= 1.5;
    }

    if (new Date().getDay() === 6) {
      recommendedCapacity *= 2.5;
    }

    return recommendedCapacity;
  }

  private predictNextPeak(): Date {
    const now = new Date();
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + (6 - now.getDay()));
    nextSaturday.setHours(14, 0, 0, 0); // 2 PM on Saturday

    return nextSaturday;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  private getTopVendorTier(): VendorTier {
    const tiers = Object.entries(
      this.weddingMetrics.vendorTierDistribution,
    ) as [VendorTier, number][];
    return tiers.reduce((top, current) =>
      current[1] > top[1] ? current : top,
    )[0];
  }

  private generateRecommendations(
    stats: RealtimeStats,
    wedding: WeddingAnalytics,
    trends: TrafficTrends,
  ): string[] {
    const recommendations: string[] = [];

    if (stats.successRate < 0.95) {
      recommendations.push(
        'Investigate high error rate - success rate below 95%',
      );
    }

    if (stats.avgResponseTime > 500) {
      recommendations.push(
        'Optimize API response times - average exceeds 500ms',
      );
    }

    if (trends.saturdayPeakForecast > stats.activeVendors * 100) {
      recommendations.push('Scale infrastructure for upcoming Saturday peak');
    }

    if (this.isPeakWeddingSeason()) {
      recommendations.push(
        'Enable peak season optimizations and additional capacity',
      );
    }

    return recommendations;
  }

  private generateAlerts(stats: RealtimeStats): string[] {
    const alerts: string[] = [];

    if (stats.successRate < 0.9) {
      alerts.push(
        `CRITICAL: Success rate dropped to ${(stats.successRate * 100).toFixed(1)}%`,
      );
    }

    if (stats.p95ResponseTime > 1000) {
      alerts.push(`WARNING: P95 response time is ${stats.p95ResponseTime}ms`);
    }

    return alerts;
  }

  private calculateTrend(
    metrics: AggregatedMetrics,
  ): 'increasing' | 'stable' | 'decreasing' {
    // Simplified trend calculation
    return 'stable';
  }

  private projectLoad(): number {
    // Simplified load projection
    return this.realtimeStats.totalRequests * 1.2;
  }

  private calculateWeddingSeasonImpact(): number {
    return this.isPeakWeddingSeason() ? 1.5 : 1.0;
  }

  private forecastSaturdayPeak(): number {
    return this.realtimeStats.totalRequests * 2.5;
  }

  private calculateRequestSize(request: GatewayRequest): number {
    return (
      JSON.stringify(request.body || {}).length +
      JSON.stringify(request.headers).length
    );
  }

  private calculateResponseSize(response: GatewayResponse): number {
    return JSON.stringify(response.body || {}).length;
  }

  private isCacheValid(metrics: AggregatedMetrics): boolean {
    return Date.now() - metrics.timeRange.end.getTime() < this.CACHE_TTL;
  }

  private initializeRealtimeStats(): RealtimeStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      p95ResponseTime: 0,
      tierStats: {
        enterprise: 0,
        scale: 0,
        professional: 0,
        starter: 0,
        free: 0,
      },
      uniqueVendors: new Set(),
      activeVendors: 0,
      responseTimes: [],
    };
  }

  private initializeWeddingAnalytics(): void {
    // Reset daily at midnight
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.weddingMetrics = {
        saturdayTraffic: 0,
        peakSeasonMultiplier: this.isPeakWeddingSeason() ? 1.5 : 1.0,
        criticalAPIUsage: 0,
        vendorTierDistribution: {
          enterprise: 0,
          scale: 0,
          professional: 0,
          starter: 0,
          free: 0,
        },
        weddingSuccessRate: 0,
      };

      // Set up daily reset interval
      setInterval(() => {
        this.weddingMetrics.saturdayTraffic = 0;
        this.weddingMetrics.criticalAPIUsage = 0;
      }, 86400000); // 24 hours
    }, msUntilMidnight);
  }

  private startBatchProcessing(): void {
    setInterval(() => {
      this.processBatch();
    }, this.BATCH_PROCESS_INTERVAL);
  }

  private startRealtimeUpdates(): void {
    // Log real-time statistics every minute
    setInterval(() => {
      const stats = this.getRealtimeStats();
      console.log(
        `[TrafficAnalyticsCollector] Requests: ${stats.totalRequests}, Success: ${(stats.successRate * 100).toFixed(1)}%, Avg Response: ${stats.avgResponseTime.toFixed(0)}ms`,
      );
    }, 60000);
  }

  private processBatch(): void {
    // In a production environment, this would:
    // 1. Process the metrics queue
    // 2. Store metrics in a time-series database
    // 3. Update aggregated metrics
    // 4. Clean up old cache entries

    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, metrics] of this.aggregatedCache.entries()) {
      if (now - metrics.timeRange.end.getTime() > this.CACHE_TTL * 2) {
        this.aggregatedCache.delete(key);
      }
    }
  }
}

// Supporting interfaces
interface RealtimeStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  totalResponseTime: number;
  p95ResponseTime: number;
  tierStats: Record<VendorTier, number>;
  uniqueVendors: Set<string>;
  activeVendors: number;
  responseTimes: number[];
}

interface WeddingAnalytics {
  saturdayTraffic: number;
  peakSeasonMultiplier: number;
  criticalAPIUsage: number;
  vendorTierDistribution: Record<VendorTier, number>;
  weddingSuccessRate: number;
}

interface WeddingInsights {
  saturdayTrafficIncrease: number;
  peakSeasonMultiplier: number;
  criticalAPISuccessRate: number;
  recommendedCapacity: number;
  nextPeakPrediction: Date;
}

interface TrafficTrends {
  hourlyTrend: 'increasing' | 'stable' | 'decreasing';
  dailyTrend: 'increasing' | 'stable' | 'decreasing';
  projectedLoad: number;
  weddingSeasonImpact: number;
  saturdayPeakForecast: number;
}

interface EndpointStats {
  endpoint: string;
  requests: number;
  totalResponseTime: number;
  errors: number;
  avgResponseTime: number;
  weddingCritical: boolean;
}

interface AnalyticsReport {
  generatedAt: Date;
  summary: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    activeVendors: number;
  };
  weddingInsights: {
    saturdayTrafficMultiplier: number;
    peakSeasonActive: boolean;
    criticalAPIHealth: number;
    topVendorTier: VendorTier;
  };
  recommendations: string[];
  alerts: string[];
}

// Singleton instance
export const trafficAnalyticsCollector = new TrafficAnalyticsCollector();
