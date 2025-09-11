/**
 * @fileoverview Data Models for Review Analytics System
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * Business logic and data transformation models for analytics operations
 */

import {
  ReviewAnalyticsData,
  MetricData,
  ChartData,
  TrendDataPoint,
  RatingDistribution,
  ReviewSource,
  AnalyticsError,
  PerformanceMetrics,
  ExportRequest,
  ValidationResult,
  AnalyticsFilters,
} from '@/types/analytics';

// Metric calculation models
export class AnalyticsCalculator {
  static calculateAverageRating(reviews: { rating: number }[]): number {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  static calculateResponseRate(
    totalRequests: number,
    totalResponses: number,
  ): number {
    if (totalRequests === 0) return 0;
    return Math.round((totalResponses / totalRequests) * 100) / 100;
  }

  static calculateSentimentScore(sentimentScores: number[]): number {
    if (sentimentScores.length === 0) return 0;
    const sum = sentimentScores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / sentimentScores.length) * 100) / 100;
  }

  static calculateMonthlyGrowth(
    currentMonth: number,
    previousMonth: number,
  ): number {
    if (previousMonth === 0) return currentMonth > 0 ? 1 : 0;
    return (
      Math.round(((currentMonth - previousMonth) / previousMonth) * 100) / 100
    );
  }

  static calculateTrendDirection(
    current: number,
    previous: number,
  ): 'up' | 'down' | 'neutral' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  }

  static calculateTrendPercentage(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  }
}

// Data transformation models
export class AnalyticsTransformer {
  static transformRawDataToAnalytics(rawData: any): ReviewAnalyticsData {
    return {
      totalReviews: rawData.total_reviews || 0,
      averageRating: this.sanitizeRating(rawData.average_rating),
      responseRate: this.sanitizePercentage(rawData.response_rate),
      sentimentScore: this.sanitizePercentage(rawData.sentiment_score),
      monthlyGrowth: rawData.monthly_growth || 0,
      lastUpdated: rawData.last_updated || new Date().toISOString(),
      chartData: this.transformChartData(rawData.chart_data || {}),
      metadata: {
        supplierId: rawData.supplier_id || '',
        dateRange: {
          start: rawData.date_range?.start || '',
          end: rawData.date_range?.end || '',
        },
        queryTime: rawData.query_time || 0,
        cached: rawData.cached || false,
      },
    };
  }

  static transformChartData(rawChartData: any): ChartData {
    return {
      trends: this.transformTrendData(rawChartData.trends || []),
      distribution: this.transformDistributionData(
        rawChartData.distribution || [],
      ),
      sources: this.transformSourcesData(rawChartData.sources || []),
      timeline: this.transformTimelineData(rawChartData.timeline || []),
    };
  }

  static transformTrendData(rawTrends: any[]): TrendDataPoint[] {
    return rawTrends
      .map((trend) => ({
        date: trend.date || trend.period,
        reviews: parseInt(trend.reviews || trend.count || 0),
        rating: this.sanitizeRating(trend.rating || trend.avg_rating || 0),
        responses: parseInt(trend.responses || 0),
        timestamp: new Date(trend.date || trend.period).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  static transformDistributionData(
    rawDistribution: any[],
  ): RatingDistribution[] {
    const distribution: RatingDistribution[] = [];
    const total = rawDistribution.reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );

    [5, 4, 3, 2, 1].forEach((rating) => {
      const item = rawDistribution.find((d) => d.rating === rating);
      const count = item?.count || 0;
      distribution.push({
        rating: rating as 1 | 2 | 3 | 4 | 5,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      });
    });

    return distribution;
  }

  static transformSourcesData(rawSources: any[]): ReviewSource[] {
    const total = rawSources.reduce(
      (sum, source) => sum + (source.count || 0),
      0,
    );

    return rawSources
      .map((source) => ({
        platform: this.sanitizePlatform(source.platform || source.source),
        count: parseInt(source.count || 0),
        percentage: total > 0 ? Math.round((source.count / total) * 100) : 0,
        averageRating: this.sanitizeRating(
          source.average_rating || source.avg_rating || 0,
        ),
        responseRate: this.sanitizePercentage(source.response_rate || 0),
      }))
      .sort((a, b) => b.count - a.count);
  }

  static transformTimelineData(rawTimeline: any[]): any[] {
    return rawTimeline
      .map((item) => ({
        date: item.date,
        value: item.value || item.count || 0,
        label: item.label || item.type || 'Event',
        type: item.type || 'review',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  static sanitizeRating(rating: any): number {
    const num = parseFloat(rating);
    if (isNaN(num)) return 0;
    return Math.min(Math.max(num, 0), 5);
  }

  static sanitizePercentage(percentage: any): number {
    const num = parseFloat(percentage);
    if (isNaN(num)) return 0;
    return Math.min(Math.max(num, 0), 1);
  }

  static sanitizePlatform(platform: any): ReviewSource['platform'] {
    const validPlatforms: ReviewSource['platform'][] = [
      'Google',
      'Yelp',
      'Facebook',
      'Website',
      'Direct',
      'Other',
    ];
    const platformStr = String(platform).toLowerCase();

    if (platformStr.includes('google')) return 'Google';
    if (platformStr.includes('yelp')) return 'Yelp';
    if (platformStr.includes('facebook')) return 'Facebook';
    if (platformStr.includes('website')) return 'Website';
    if (platformStr.includes('direct')) return 'Direct';

    return 'Other';
  }
}

// Metric data models
export class MetricDataBuilder {
  static buildTotalReviewsMetric(
    current: number,
    previous: number,
    icon: any,
  ): MetricData {
    const trend = AnalyticsCalculator.calculateTrendDirection(
      current,
      previous,
    );
    const trendValue = AnalyticsCalculator.calculateTrendPercentage(
      current,
      previous,
    );

    return {
      value: current,
      label: 'Total Reviews',
      icon,
      trend,
      trendValue,
      description: 'Total number of reviews received',
    };
  }

  static buildAverageRatingMetric(
    current: number,
    previous: number,
    icon: any,
  ): MetricData {
    const trend = AnalyticsCalculator.calculateTrendDirection(
      current,
      previous,
    );
    const trendValue = AnalyticsCalculator.calculateTrendPercentage(
      current,
      previous,
    );

    return {
      value: current.toFixed(1),
      label: 'Average Rating',
      icon,
      trend,
      trendValue,
      suffix: '★',
      description: 'Average rating across all reviews',
    };
  }

  static buildResponseRateMetric(
    current: number,
    previous: number,
    icon: any,
  ): MetricData {
    const percentage = Math.round(current * 100);
    const previousPercentage = Math.round(previous * 100);
    const trend = AnalyticsCalculator.calculateTrendDirection(
      percentage,
      previousPercentage,
    );
    const trendValue = AnalyticsCalculator.calculateTrendPercentage(
      percentage,
      previousPercentage,
    );

    return {
      value: percentage,
      label: 'Response Rate',
      icon,
      trend,
      trendValue,
      suffix: '%',
      description: 'Percentage of reviews that received responses',
    };
  }

  static buildSentimentScoreMetric(
    current: number,
    previous: number,
    icon: any,
  ): MetricData {
    const percentage = Math.round(current * 100);
    const previousPercentage = Math.round(previous * 100);
    const trend = AnalyticsCalculator.calculateTrendDirection(
      percentage,
      previousPercentage,
    );
    const trendValue = AnalyticsCalculator.calculateTrendPercentage(
      percentage,
      previousPercentage,
    );

    return {
      value: percentage,
      label: 'Sentiment Score',
      icon,
      trend,
      trendValue,
      suffix: '%',
      description: 'Overall sentiment positivity score',
    };
  }
}

// Error handling models
export class AnalyticsErrorHandler {
  static createError(
    code: string,
    message: string,
    details?: any,
    recoverable: boolean = true,
  ): AnalyticsError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      recoverable,
    };
  }

  static handleApiError(error: any): AnalyticsError {
    if (error.status === 401) {
      return this.createError(
        'UNAUTHORIZED',
        'Authentication required to access analytics data',
        error,
        false,
      );
    }

    if (error.status === 403) {
      return this.createError(
        'FORBIDDEN',
        'Access denied to analytics data',
        error,
        false,
      );
    }

    if (error.status === 404) {
      return this.createError(
        'NOT_FOUND',
        'No data available for the specified criteria',
        error,
        true,
      );
    }

    if (error.status === 429) {
      return this.createError(
        'RATE_LIMITED',
        'Too many requests. Please try again later',
        error,
        true,
      );
    }

    if (error.status >= 500) {
      return this.createError(
        'SERVER_ERROR',
        'Internal server error. Please try again',
        error,
        true,
      );
    }

    return this.createError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      error,
      true,
    );
  }

  static isRetryableError(error: AnalyticsError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_ERROR',
      'RATE_LIMITED',
    ];

    return error.recoverable && retryableCodes.includes(error.code);
  }

  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
}

// Performance monitoring models
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  measureDashboardLoad(startTime: number): void {
    const loadTime = performance.now() - startTime;
    this.addMetric('dashboardLoadTime', loadTime);

    if (loadTime > 2000) {
      console.warn(`Dashboard load time exceeded threshold: ${loadTime}ms`);
    }
  }

  measureChartRender(startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.addMetric('chartRenderTime', renderTime);

    if (renderTime > 1000) {
      console.warn(`Chart render time exceeded threshold: ${renderTime}ms`);
    }
  }

  measureApiCall(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.addMetric('apiResponseTime', responseTime);

    if (responseTime > 500) {
      console.warn(`API response time exceeded threshold: ${responseTime}ms`);
    }
  }

  private addMetric(type: string, value: number): void {
    const metric: PerformanceMetrics = {
      dashboardLoadTime: type === 'dashboardLoadTime' ? value : 0,
      chartRenderTime: type === 'chartRenderTime' ? value : 0,
      apiResponseTime: type === 'apiResponseTime' ? value : 0,
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const sums = this.metrics.reduce(
      (acc, metric) => ({
        dashboardLoadTime: acc.dashboardLoadTime + metric.dashboardLoadTime,
        chartRenderTime: acc.chartRenderTime + metric.chartRenderTime,
        apiResponseTime: acc.apiResponseTime + metric.apiResponseTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
      }),
      {
        dashboardLoadTime: 0,
        chartRenderTime: 0,
        apiResponseTime: 0,
        memoryUsage: 0,
      },
    );

    const count = this.metrics.length;
    return {
      dashboardLoadTime: sums.dashboardLoadTime / count,
      chartRenderTime: sums.chartRenderTime / count,
      apiResponseTime: sums.apiResponseTime / count,
      memoryUsage: sums.memoryUsage / count,
    };
  }
}

// Data validation models
export class AnalyticsValidator {
  static validateDateRange(start: Date, end: Date): ValidationResult {
    const errors = [];

    if (start > end) {
      errors.push({
        field: 'dateRange',
        message: 'Start date must be before end date',
      });
    }

    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push({
        field: 'dateRange',
        message: 'Date range cannot exceed 365 days',
      });
    }

    if (start > new Date()) {
      errors.push({
        field: 'dateRange',
        message: 'Start date cannot be in the future',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateExportRequest(request: ExportRequest): ValidationResult {
    const errors = [];

    if (!['csv', 'json'].includes(request.format)) {
      errors.push({
        field: 'format',
        message: 'Format must be either csv or json',
      });
    }

    if (request.maxRecords < 1 || request.maxRecords > 10000) {
      errors.push({
        field: 'maxRecords',
        message: 'Max records must be between 1 and 10,000',
      });
    }

    const dateRangeValidation = this.validateDateRange(
      new Date(request.dateRange.start),
      new Date(request.dateRange.end),
    );

    if (!dateRangeValidation.isValid) {
      errors.push(...dateRangeValidation.errors);
    }

    // Check export date range limit (90 days)
    const daysDiff =
      (new Date(request.dateRange.end).getTime() -
        new Date(request.dateRange.start).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      errors.push({
        field: 'dateRange',
        message: 'Export date range cannot exceed 90 days',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateSupplierAccess(
    userSupplierId: string,
    requestedSupplierId: string,
  ): boolean {
    if (!userSupplierId || !requestedSupplierId) return false;
    return userSupplierId === requestedSupplierId;
  }

  static validateAnalyticsFilters(filters: AnalyticsFilters): ValidationResult {
    const errors = [];

    const dateRangeValidation = this.validateDateRange(
      filters.dateRange.start,
      filters.dateRange.end,
    );
    if (!dateRangeValidation.isValid) {
      errors.push(...dateRangeValidation.errors);
    }

    if (filters.ratingRange) {
      const [min, max] = filters.ratingRange;
      if (min < 1 || min > 5 || max < 1 || max > 5 || min > max) {
        errors.push({
          field: 'ratingRange',
          message: 'Rating range must be between 1 and 5, with min ≤ max',
        });
      }
    }

    if (filters.sentimentRange) {
      const [min, max] = filters.sentimentRange;
      if (min < 0 || min > 1 || max < 0 || max > 1 || min > max) {
        errors.push({
          field: 'sentimentRange',
          message: 'Sentiment range must be between 0 and 1, with min ≤ max',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Data aggregation models
export class AnalyticsAggregator {
  static aggregateByPeriod(
    data: any[],
    period: 'day' | 'week' | 'month',
  ): TrendDataPoint[] {
    const grouped = new Map<string, any[]>();

    data.forEach((item) => {
      const date = new Date(item.created_at || item.date);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });

    return Array.from(grouped.entries())
      .map(([date, items]) => ({
        date,
        reviews: items.length,
        rating: AnalyticsCalculator.calculateAverageRating(items),
        responses: items.filter((item) => item.has_response).length,
        timestamp: new Date(date).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  static calculatePlatformMetrics(reviews: any[]): ReviewSource[] {
    const platformGroups = new Map<string, any[]>();

    reviews.forEach((review) => {
      const platform = AnalyticsTransformer.sanitizePlatform(review.platform);
      if (!platformGroups.has(platform)) {
        platformGroups.set(platform, []);
      }
      platformGroups.get(platform)!.push(review);
    });

    const total = reviews.length;
    return Array.from(platformGroups.entries())
      .map(([platform, platformReviews]) => ({
        platform: platform as ReviewSource['platform'],
        count: platformReviews.length,
        percentage: Math.round((platformReviews.length / total) * 100),
        averageRating:
          AnalyticsCalculator.calculateAverageRating(platformReviews),
        responseRate: AnalyticsCalculator.calculateResponseRate(
          platformReviews.length,
          platformReviews.filter((r) => r.has_response).length,
        ),
      }))
      .sort((a, b) => b.count - a.count);
  }

  static calculateRatingDistribution(reviews: any[]): RatingDistribution[] {
    const distribution = new Map<number, number>();

    // Initialize all ratings
    [1, 2, 3, 4, 5].forEach((rating) => distribution.set(rating, 0));

    // Count ratings
    reviews.forEach((review) => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution.set(rating, (distribution.get(rating) || 0) + 1);
      }
    });

    const total = reviews.length;
    return Array.from(distribution.entries())
      .map(([rating, count]) => ({
        rating: rating as 1 | 2 | 3 | 4 | 5,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .reverse(); // Show 5 stars first
  }
}
