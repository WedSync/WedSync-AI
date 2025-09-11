/**
 * WS-257 Team D: Performance Analytics Engine
 * Advanced analytics system for infrastructure performance monitoring
 */

import { supabase } from '@/lib/supabase/client';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  source_system: string;
  environment: 'production' | 'staging' | 'development';
  region?: string;
  tags?: Record<string, string>;
}

export interface AnalyticsQuery {
  metrics: string[];
  startTime: number;
  endTime: number;
  groupBy?: string[];
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95' | 'p99';
  filters?: Record<string, any>;
  interval?: '1m' | '5m' | '15m' | '1h' | '6h' | '1d';
}

export interface AnalyticsResult {
  metric: string;
  data: TimeSeriesPoint[];
  summary: {
    avg: number;
    min: number;
    max: number;
    latest: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface PerformanceAlert {
  id: string;
  metric_name: string;
  condition: 'above' | 'below' | 'change' | 'anomaly';
  threshold: number;
  duration_minutes: number;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  is_active: boolean;
  notification_channels: string[];
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  confidence: number;
  forecast: TimeSeriesPoint[];
  anomalies: AnomalyPoint[];
}

export interface AnomalyPoint {
  timestamp: number;
  value: number;
  expected_value: number;
  deviation_score: number;
  severity: 'low' | 'medium' | 'high';
}

export interface WeddingDayInsights {
  date: string;
  total_events: number;
  peak_load_time: number;
  avg_response_time: number;
  error_rate: number;
  capacity_utilization: number;
  vendor_performance: VendorPerformance[];
  critical_moments: CriticalMoment[];
}

export interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  response_time_p95: number;
  error_rate: number;
  availability: number;
  satisfaction_score: number;
}

export interface CriticalMoment {
  timestamp: number;
  event_type: string;
  impact_score: number;
  description: string;
  affected_systems: string[];
  recovery_time: number;
}

export class PerformanceAnalyticsEngine {
  private metricsCache = new Map<string, AnalyticsResult>();
  private alertsCache = new Map<string, PerformanceAlert[]>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor() {
    // Initialize real-time metric collection
    this.initializeRealTimeCollection();
  }

  /**
   * Initialize real-time metric collection
   */
  private initializeRealTimeCollection(): void {
    if (typeof window === 'undefined') return;

    // Performance Observer for web vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordWebVital(entry);
        });
      });

      try {
        observer.observe({
          entryTypes: [
            'navigation',
            'paint',
            'largest-contentful-paint',
            'layout-shift',
          ],
        });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }

    // Network information monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordNetworkMetrics(connection);

      connection.addEventListener('change', () => {
        this.recordNetworkMetrics(connection);
      });
    }

    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryMetrics();
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Record web vital metrics
   */
  private async recordWebVital(entry: PerformanceEntry): Promise<void> {
    const metric: Partial<PerformanceMetric> = {
      timestamp: Date.now(),
      source_system: 'web-vitals',
      environment: (process.env.NODE_ENV as any) || 'development',
      tags: {
        page: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 100),
      },
    };

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        await Promise.all([
          this.recordMetric({
            ...metric,
            metric_name: 'page_load_time',
            metric_value: navEntry.loadEventEnd - navEntry.navigationStart,
            metric_unit: 'ms',
          }),
          this.recordMetric({
            ...metric,
            metric_name: 'dns_lookup_time',
            metric_value: navEntry.domainLookupEnd - navEntry.domainLookupStart,
            metric_unit: 'ms',
          }),
          this.recordMetric({
            ...metric,
            metric_name: 'server_response_time',
            metric_value: navEntry.responseEnd - navEntry.requestStart,
            metric_unit: 'ms',
          }),
        ]);
        break;

      case 'paint':
        await this.recordMetric({
          ...metric,
          metric_name:
            entry.name === 'first-paint'
              ? 'first_paint'
              : 'first_contentful_paint',
          metric_value: entry.startTime,
          metric_unit: 'ms',
        });
        break;

      case 'largest-contentful-paint':
        await this.recordMetric({
          ...metric,
          metric_name: 'largest_contentful_paint',
          metric_value: entry.startTime,
          metric_unit: 'ms',
        });
        break;

      case 'layout-shift':
        const clsEntry = entry as any;
        await this.recordMetric({
          ...metric,
          metric_name: 'cumulative_layout_shift',
          metric_value: clsEntry.value,
          metric_unit: 'score',
        });
        break;
    }
  }

  /**
   * Record network metrics
   */
  private async recordNetworkMetrics(connection: any): Promise<void> {
    await Promise.all([
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'connection_type',
        metric_value: this.getConnectionTypeScore(connection.effectiveType),
        metric_unit: 'score',
        source_system: 'network',
        environment: 'production',
        tags: {
          effective_type: connection.effectiveType,
          downlink: connection.downlink?.toString(),
          rtt: connection.rtt?.toString(),
        },
      }),
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'network_downlink',
        metric_value: connection.downlink || 0,
        metric_unit: 'mbps',
        source_system: 'network',
        environment: 'production',
      }),
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'network_rtt',
        metric_value: connection.rtt || 0,
        metric_unit: 'ms',
        source_system: 'network',
        environment: 'production',
      }),
    ]);
  }

  /**
   * Record memory metrics
   */
  private async recordMemoryMetrics(): Promise<void> {
    const memory = (performance as any).memory;

    await Promise.all([
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'memory_used',
        metric_value: memory.usedJSHeapSize,
        metric_unit: 'bytes',
        source_system: 'browser',
        environment: 'production',
      }),
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'memory_total',
        metric_value: memory.totalJSHeapSize,
        metric_unit: 'bytes',
        source_system: 'browser',
        environment: 'production',
      }),
      this.recordMetric({
        timestamp: Date.now(),
        metric_name: 'memory_limit',
        metric_value: memory.jsHeapSizeLimit,
        metric_unit: 'bytes',
        source_system: 'browser',
        environment: 'production',
      }),
    ]);
  }

  /**
   * Convert connection type to numeric score for analysis
   */
  private getConnectionTypeScore(effectiveType: string): number {
    switch (effectiveType) {
      case 'slow-2g':
        return 1;
      case '2g':
        return 2;
      case '3g':
        return 3;
      case '4g':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Partial<PerformanceMetric>): Promise<void> {
    try {
      const fullMetric: PerformanceMetric = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        metric_name: '',
        metric_value: 0,
        metric_unit: '',
        source_system: 'unknown',
        environment: 'production',
        ...metric,
      };

      // Store in Supabase
      const { error } = await supabase
        .from('performance_metrics')
        .insert([fullMetric]);

      if (error) {
        console.error('Failed to record metric:', error);
        // Store locally as fallback
        this.storeMetricLocally(fullMetric);
      }

      // Invalidate cache
      this.invalidateCache(fullMetric.metric_name);
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  /**
   * Store metric locally as fallback
   */
  private storeMetricLocally(metric: PerformanceMetric): void {
    const storageKey = `perf_metrics_${metric.metric_name}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push(metric);

    // Keep only last 100 entries
    const trimmed = existing.slice(-100);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  }

  /**
   * Query performance analytics
   */
  async queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult[]> {
    const cacheKey = this.getCacheKey(query);

    // Check cache first
    const cached = this.metricsCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return [cached];
    }

    try {
      const results: AnalyticsResult[] = [];

      for (const metric of query.metrics) {
        const { data, error } = await supabase
          .from('performance_metrics')
          .select('*')
          .eq('metric_name', metric)
          .gte('timestamp', query.startTime)
          .lte('timestamp', query.endTime)
          .order('timestamp', { ascending: true });

        if (error) {
          console.error('Analytics query error:', error);
          continue;
        }

        const timeSeries = this.processTimeSeriesData(
          data || [],
          query.interval || '5m',
          query.aggregation || 'avg',
        );

        const summary = this.calculateSummary(timeSeries);

        const result: AnalyticsResult = {
          metric,
          data: timeSeries,
          summary,
        };

        results.push(result);

        // Cache the result
        this.metricsCache.set(cacheKey, result);
      }

      return results;
    } catch (error) {
      console.error('Analytics query failed:', error);
      return this.getFallbackData(query);
    }
  }

  /**
   * Process time series data with aggregation
   */
  private processTimeSeriesData(
    rawData: PerformanceMetric[],
    interval: string,
    aggregation: string,
  ): TimeSeriesPoint[] {
    const intervalMs = this.getIntervalMs(interval);
    const buckets = new Map<number, PerformanceMetric[]>();

    // Group data into time buckets
    rawData.forEach((point) => {
      const bucketTime = Math.floor(point.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(point);
    });

    // Aggregate each bucket
    const result: TimeSeriesPoint[] = [];
    buckets.forEach((points, timestamp) => {
      const values = points.map((p) => p.metric_value);
      let aggregatedValue: number;

      switch (aggregation) {
        case 'avg':
          aggregatedValue =
            values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        case 'p95':
          aggregatedValue = this.calculatePercentile(values, 0.95);
          break;
        case 'p99':
          aggregatedValue = this.calculatePercentile(values, 0.99);
          break;
        default:
          aggregatedValue =
            values.reduce((sum, val) => sum + val, 0) / values.length;
      }

      result.push({
        timestamp,
        value: aggregatedValue,
        metadata: {
          count: values.length,
          aggregation,
        },
      });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate performance summary statistics
   */
  private calculateSummary(
    data: TimeSeriesPoint[],
  ): AnalyticsResult['summary'] {
    if (data.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        latest: 0,
        trend: 'stable',
        changePercent: 0,
      };
    }

    const values = data.map((d) => d.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    // Calculate trend
    const trend = this.calculateTrend(data);
    const changePercent =
      data.length > 1 ? ((latest - values[0]) / values[0]) * 100 : 0;

    return {
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  /**
   * Calculate trend direction using linear regression
   */
  private calculateTrend(data: TimeSeriesPoint[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';

    const n = data.length;
    const sumX = data.reduce((sum, point, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce(
      (sum, point, index) => sum + index * point.value,
      0,
    );
    const sumXX = data.reduce((sum, point, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Threshold for determining trend (adjust based on metric scale)
    const threshold = Math.abs(sumY / n) * 0.05; // 5% of average

    if (Math.abs(slope) < threshold) return 'stable';
    return slope > 0 ? 'up' : 'down';
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Perform trend analysis with forecasting
   */
  async performTrendAnalysis(
    metric: string,
    period: '1h' | '1d' | '1w' | '1m',
  ): Promise<TrendAnalysis> {
    const endTime = Date.now();
    const startTime = endTime - this.getPeriodMs(period);

    const query: AnalyticsQuery = {
      metrics: [metric],
      startTime,
      endTime,
      interval: '5m',
      aggregation: 'avg',
    };

    const results = await this.queryAnalytics(query);
    const data = results[0]?.data || [];

    // Detect anomalies
    const anomalies = this.detectAnomalies(data);

    // Generate forecast (simple linear regression)
    const forecast = this.generateForecast(data, 12); // Forecast next 12 intervals

    // Calculate trend confidence
    const confidence = this.calculateTrendConfidence(data);

    return {
      metric,
      period,
      trend: this.calculateDetailedTrend(data),
      slope: this.calculateSlope(data),
      confidence,
      forecast,
      anomalies,
    };
  }

  /**
   * Detect anomalies in time series data
   */
  private detectAnomalies(data: TimeSeriesPoint[]): AnomalyPoint[] {
    if (data.length < 10) return []; // Need enough data points

    const anomalies: AnomalyPoint[] = [];
    const values = data.map((d) => d.value);

    // Calculate moving average and standard deviation
    const windowSize = Math.min(10, Math.floor(data.length / 4));

    for (let i = windowSize; i < data.length; i++) {
      const window = values.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const std = Math.sqrt(
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          window.length,
      );

      const currentValue = values[i];
      const deviationScore = Math.abs(currentValue - mean) / (std || 1);

      // Flag as anomaly if more than 2 standard deviations away
      if (deviationScore > 2) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (deviationScore > 4) severity = 'high';
        else if (deviationScore > 3) severity = 'medium';

        anomalies.push({
          timestamp: data[i].timestamp,
          value: currentValue,
          expected_value: mean,
          deviation_score: deviationScore,
          severity,
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate forecast using linear regression
   */
  private generateForecast(
    data: TimeSeriesPoint[],
    periods: number,
  ): TimeSeriesPoint[] {
    if (data.length < 2) return [];

    const slope = this.calculateSlope(data);
    const lastPoint = data[data.length - 1];
    const interval =
      data.length > 1 ? data[1].timestamp - data[0].timestamp : 300000; // 5min default

    const forecast: TimeSeriesPoint[] = [];
    for (let i = 1; i <= periods; i++) {
      const timestamp = lastPoint.timestamp + interval * i;
      const value = lastPoint.value + slope * i;

      forecast.push({
        timestamp,
        value: Math.max(0, value), // Ensure non-negative values
        metadata: {
          forecasted: true,
          confidence: Math.max(0, 1 - i / periods),
        },
      });
    }

    return forecast;
  }

  /**
   * Calculate slope of the trend line
   */
  private calculateSlope(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = data.reduce((sum, point, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce(
      (sum, point, index) => sum + index * point.value,
      0,
    );
    const sumXX = data.reduce((sum, point, index) => sum + index * index, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * Calculate detailed trend classification
   */
  private calculateDetailedTrend(
    data: TimeSeriesPoint[],
  ): TrendAnalysis['trend'] {
    if (data.length < 3) return 'stable';

    const values = data.map((d) => d.value);
    const slope = this.calculateSlope(data);

    // Calculate volatility (coefficient of variation)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length,
    );
    const cv = std / mean;

    // High volatility threshold
    if (cv > 0.3) return 'volatile';

    // Trend thresholds relative to mean
    const threshold = mean * 0.01; // 1% of mean

    if (Math.abs(slope) < threshold) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate trend confidence score
   */
  private calculateTrendConfidence(data: TimeSeriesPoint[]): number {
    if (data.length < 5) return 0;

    // Calculate R-squared for linear regression
    const n = data.length;
    const slope = this.calculateSlope(data);
    const yMean = data.reduce((sum, point) => sum + point.value, 0) / n;

    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares

    data.forEach((point, index) => {
      const predicted = slope * index + (yMean - (slope * (n - 1)) / 2);
      ssRes += Math.pow(point.value - predicted, 2);
      ssTot += Math.pow(point.value - yMean, 2);
    });

    const rSquared = 1 - ssRes / ssTot;
    return Math.max(0, Math.min(1, rSquared)); // Clamp between 0 and 1
  }

  /**
   * Get wedding day insights
   */
  async getWeddingDayInsights(date: string): Promise<WeddingDayInsights> {
    const startTime = new Date(date).setHours(0, 0, 0, 0);
    const endTime = new Date(date).setHours(23, 59, 59, 999);

    try {
      // Query wedding day metrics
      const { data: metrics, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startTime)
        .lte('timestamp', endTime)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Wedding day insights query error:', error);
        return this.getDefaultWeddingInsights(date);
      }

      // Process metrics to generate insights
      return this.processWeddingDayMetrics(metrics || [], date);
    } catch (error) {
      console.error('Failed to get wedding day insights:', error);
      return this.getDefaultWeddingInsights(date);
    }
  }

  /**
   * Process wedding day metrics into insights
   */
  private processWeddingDayMetrics(
    metrics: PerformanceMetric[],
    date: string,
  ): WeddingDayInsights {
    // Group metrics by type
    const metricGroups = new Map<string, PerformanceMetric[]>();
    metrics.forEach((metric) => {
      if (!metricGroups.has(metric.metric_name)) {
        metricGroups.set(metric.metric_name, []);
      }
      metricGroups.get(metric.metric_name)!.push(metric);
    });

    // Calculate key insights
    const responseTimeMetrics = metricGroups.get('server_response_time') || [];
    const errorRateMetrics = metricGroups.get('error_rate') || [];
    const cpuMetrics = metricGroups.get('cpu_usage') || [];

    const avgResponseTime =
      responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
          responseTimeMetrics.length
        : 0;

    const errorRate =
      errorRateMetrics.length > 0
        ? errorRateMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
          errorRateMetrics.length
        : 0;

    // Find peak load time
    const peakLoadTime = this.findPeakLoadTime(cpuMetrics);

    // Calculate capacity utilization
    const capacityUtilization =
      cpuMetrics.length > 0
        ? Math.max(...cpuMetrics.map((m) => m.metric_value))
        : 0;

    return {
      date,
      total_events: this.estimateEventCount(metrics),
      peak_load_time: peakLoadTime,
      avg_response_time: Math.round(avgResponseTime),
      error_rate: Math.round(errorRate * 1000) / 1000, // Round to 3 decimal places
      capacity_utilization: Math.round(capacityUtilization),
      vendor_performance: this.calculateVendorPerformance(metrics),
      critical_moments: this.identifyCriticalMoments(metrics),
    };
  }

  /**
   * Helper methods for analytics calculations
   */
  private getIntervalMs(interval: string): number {
    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '6h': 21600000,
      '1d': 86400000,
    };
    return intervalMap[interval] || 300000;
  }

  private getPeriodMs(period: string): number {
    const periodMap: Record<string, number> = {
      '1h': 3600000,
      '1d': 86400000,
      '1w': 604800000,
      '1m': 2592000000,
    };
    return periodMap[period] || 86400000;
  }

  private getCacheKey(query: AnalyticsQuery): string {
    return JSON.stringify({
      metrics: query.metrics.sort(),
      startTime: query.startTime,
      endTime: query.endTime,
      interval: query.interval,
      aggregation: query.aggregation,
    });
  }

  private isCacheValid(cacheKey: string): boolean {
    // Simple TTL-based cache validation
    const cacheTime = this.cacheTimes.get(cacheKey);
    return cacheTime ? Date.now() - cacheTime < this.CACHE_TTL : false;
  }

  private cacheTimes = new Map<string, number>();

  private invalidateCache(metricName: string): void {
    // Invalidate all cache entries that include this metric
    for (const [key] of this.metricsCache) {
      if (key.includes(metricName)) {
        this.metricsCache.delete(key);
        this.cacheTimes.delete(key);
      }
    }
  }

  private getFallbackData(query: AnalyticsQuery): AnalyticsResult[] {
    // Return mock data as fallback
    return query.metrics.map((metric) => ({
      metric,
      data: [],
      summary: {
        avg: 0,
        min: 0,
        max: 0,
        latest: 0,
        trend: 'stable' as const,
        changePercent: 0,
      },
    }));
  }

  private getDefaultWeddingInsights(date: string): WeddingDayInsights {
    return {
      date,
      total_events: 0,
      peak_load_time: 0,
      avg_response_time: 0,
      error_rate: 0,
      capacity_utilization: 0,
      vendor_performance: [],
      critical_moments: [],
    };
  }

  private estimateEventCount(metrics: PerformanceMetric[]): number {
    // Estimate based on request count or similar metrics
    const requestMetrics = metrics.filter((m) =>
      m.metric_name.includes('request'),
    );
    return requestMetrics.length > 0
      ? requestMetrics.reduce((sum, m) => sum + m.metric_value, 0)
      : 0;
  }

  private findPeakLoadTime(cpuMetrics: PerformanceMetric[]): number {
    if (cpuMetrics.length === 0) return 0;

    const maxCpu = Math.max(...cpuMetrics.map((m) => m.metric_value));
    const peakMetric = cpuMetrics.find((m) => m.metric_value === maxCpu);
    return peakMetric?.timestamp || 0;
  }

  private calculateVendorPerformance(
    metrics: PerformanceMetric[],
  ): VendorPerformance[] {
    // Group metrics by vendor (if vendor info is in tags)
    const vendorMetrics = new Map<string, PerformanceMetric[]>();

    metrics.forEach((metric) => {
      const vendorId = metric.tags?.vendor_id;
      if (vendorId) {
        if (!vendorMetrics.has(vendorId)) {
          vendorMetrics.set(vendorId, []);
        }
        vendorMetrics.get(vendorId)!.push(metric);
      }
    });

    const vendorPerformance: VendorPerformance[] = [];

    vendorMetrics.forEach((vendorData, vendorId) => {
      const responseTimeMetrics = vendorData.filter((m) =>
        m.metric_name.includes('response_time'),
      );
      const errorMetrics = vendorData.filter((m) =>
        m.metric_name.includes('error'),
      );

      const responseTimeP95 =
        responseTimeMetrics.length > 0
          ? this.calculatePercentile(
              responseTimeMetrics.map((m) => m.metric_value),
              0.95,
            )
          : 0;

      const errorRate =
        errorMetrics.length > 0
          ? errorMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
            errorMetrics.length
          : 0;

      vendorPerformance.push({
        vendor_id: vendorId,
        vendor_name: vendorData[0]?.tags?.vendor_name || vendorId,
        response_time_p95: Math.round(responseTimeP95),
        error_rate: Math.round(errorRate * 1000) / 1000,
        availability: Math.round((1 - errorRate) * 100),
        satisfaction_score: Math.round(
          (1 - errorRate) * (1 - responseTimeP95 / 5000) * 100,
        ), // Simple scoring
      });
    });

    return vendorPerformance;
  }

  private identifyCriticalMoments(
    metrics: PerformanceMetric[],
  ): CriticalMoment[] {
    const moments: CriticalMoment[] = [];

    // Identify high error rates
    const errorMetrics = metrics.filter((m) => m.metric_name.includes('error'));
    errorMetrics.forEach((metric) => {
      if (metric.metric_value > 0.05) {
        // > 5% error rate
        moments.push({
          timestamp: metric.timestamp,
          event_type: 'High Error Rate',
          impact_score: metric.metric_value * 100,
          description: `Error rate spiked to ${(metric.metric_value * 100).toFixed(2)}%`,
          affected_systems: [metric.source_system],
          recovery_time: 0, // Would be calculated based on when errors dropped
        });
      }
    });

    // Identify slow response times
    const responseMetrics = metrics.filter((m) =>
      m.metric_name.includes('response_time'),
    );
    responseMetrics.forEach((metric) => {
      if (metric.metric_value > 5000) {
        // > 5 second response time
        moments.push({
          timestamp: metric.timestamp,
          event_type: 'Slow Response Time',
          impact_score: Math.min(100, metric.metric_value / 100),
          description: `Response time reached ${Math.round(metric.metric_value)}ms`,
          affected_systems: [metric.source_system],
          recovery_time: 0,
        });
      }
    });

    return moments.sort((a, b) => b.impact_score - a.impact_score).slice(0, 10); // Top 10
  }
}
