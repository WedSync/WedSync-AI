/**
 * WS-246: Data Aggregation Service
 * Team B Round 1: Metrics collection and processing service
 *
 * Service for collecting vendor performance metrics from multiple sources,
 * aggregating data, and maintaining data quality for wedding industry analytics.
 */

import { createClient } from '@supabase/supabase-js';
import {
  DataAggregationServiceInterface,
  VendorPerformanceMetric,
  VendorPerformanceBenchmark,
  AggregatedMetrics,
  DataQualityReport,
  DateRange,
  DataSource,
  MetricType,
  IndustryCategory,
} from '@/types/analytics';

export class DataAggregationService implements DataAggregationServiceInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly DATA_QUALITY_THRESHOLDS = {
    MIN_SAMPLE_SIZE: 5,
    MAX_OUTLIER_PERCENTAGE: 0.1, // 10% outliers allowed
    MIN_CONFIDENCE_SCORE: 0.7,
    MAX_DATA_AGE_DAYS: 90,
    MIN_TEMPORAL_COVERAGE: 0.3, // 30% of expected time period
  };

  private readonly METRIC_VALIDATION_RULES = {
    response_time: { min: 0, max: 1000, unit: 'hours' },
    booking_conversion: { min: 0, max: 1, unit: 'percentage' },
    wedding_day_execution: { min: 0, max: 100, unit: 'score' },
    client_satisfaction: { min: 0, max: 100, unit: 'score' },
    reliability_score: { min: 0, max: 100, unit: 'score' },
    communication_quality: { min: 0, max: 100, unit: 'score' },
    on_time_delivery: { min: 0, max: 100, unit: 'percentage' },
    budget_adherence: { min: 0, max: 200, unit: 'percentage' },
    vendor_rating: { min: 1, max: 5, unit: 'rating' },
  };

  /**
   * Collect metrics from various data sources for a vendor
   */
  async collectMetrics(
    vendorId: string,
    sources: DataSource[],
  ): Promise<VendorPerformanceMetric[]> {
    try {
      const collectedMetrics: VendorPerformanceMetric[] = [];

      // Collect from each specified source
      for (const source of sources) {
        const sourceMetrics = await this.collectFromSource(vendorId, source);
        collectedMetrics.push(...sourceMetrics);
      }

      // Validate and clean collected metrics
      const validatedMetrics =
        await this.validateAndCleanMetrics(collectedMetrics);

      // Store validated metrics in database
      if (validatedMetrics.length > 0) {
        await this.storeMetrics(validatedMetrics);
      }

      return validatedMetrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Aggregate metrics for a specific period
   */
  async aggregatePeriodData(
    vendorId: string,
    period: DateRange,
  ): Promise<AggregatedMetrics> {
    try {
      const { data: metrics, error } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('calculation_date', period.start)
        .lte('calculation_date', period.end);

      if (error) {
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      if (!metrics || metrics.length === 0) {
        throw new Error('No metrics found for the specified period');
      }

      // Group metrics by type and calculate aggregations
      const groupedMetrics: Record<MetricType, number[]> = {} as Record<
        MetricType,
        number[]
      >;

      metrics.forEach((metric) => {
        const metricType = metric.metric_type as MetricType;
        if (!groupedMetrics[metricType]) {
          groupedMetrics[metricType] = [];
        }
        groupedMetrics[metricType].push(metric.metric_value);
      });

      // Calculate statistical aggregations for each metric type
      const aggregatedData: Record<MetricType, any> = {} as Record<
        MetricType,
        any
      >;

      Object.entries(groupedMetrics).forEach(([metricType, values]) => {
        if (values.length > 0) {
          aggregatedData[metricType as MetricType] = {
            count: values.length,
            sum: values.reduce((sum, val) => sum + val, 0),
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            standard_deviation: this.calculateStandardDeviation(values),
          };
        }
      });

      return {
        vendor_id: vendorId,
        period,
        metrics: aggregatedData,
      };
    } catch (error) {
      console.error('Error aggregating period data:', error);
      throw error;
    }
  }

  /**
   * Update industry benchmarks based on current vendor performance
   */
  async updateBenchmarks(
    category: IndustryCategory,
  ): Promise<VendorPerformanceBenchmark[]> {
    try {
      // Get all vendors in this category
      const { data: vendors } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('vendor_category', category);

      if (!vendors || vendors.length === 0) {
        throw new Error(`No vendors found for category: ${category}`);
      }

      const vendorIds = vendors.map((v) => v.id);

      // Get recent performance metrics (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: metrics } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .in('vendor_id', vendorIds)
        .gte('calculation_date', sixMonthsAgo.toISOString().split('T')[0]);

      if (!metrics || metrics.length === 0) {
        throw new Error(`No recent metrics found for category: ${category}`);
      }

      // Calculate benchmarks for each metric type
      const metricTypes = [...new Set(metrics.map((m) => m.metric_type))];
      const updatedBenchmarks: VendorPerformanceBenchmark[] = [];

      for (const metricType of metricTypes) {
        const typeMetrics = metrics
          .filter((m) => m.metric_type === metricType)
          .map((m) => m.metric_value)
          .sort((a, b) => a - b);

        if (typeMetrics.length < this.DATA_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE) {
          continue; // Skip if insufficient data
        }

        const benchmark = await this.calculateBenchmarkThresholds(
          category,
          metricType as MetricType,
          typeMetrics,
        );

        updatedBenchmarks.push(benchmark);

        // Upsert benchmark to database
        await this.upsertBenchmark(benchmark);
      }

      return updatedBenchmarks;
    } catch (error) {
      console.error('Error updating benchmarks:', error);
      throw error;
    }
  }

  /**
   * Validate data quality for a set of metrics
   */
  async validateDataQuality(
    metrics: VendorPerformanceMetric[],
  ): Promise<DataQualityReport> {
    try {
      if (metrics.length === 0) {
        throw new Error('No metrics provided for validation');
      }

      const vendorId = metrics[0].vendor_id;
      const assessmentDate = new Date().toISOString();

      // Calculate quality indicators
      const completeness = this.calculateCompleteness(metrics);
      const accuracy = this.calculateAccuracy(metrics);
      const consistency = this.calculateConsistency(metrics);
      const timeliness = this.calculateTimeliness(metrics);

      // Calculate overall quality score
      const overallQualityScore =
        ((completeness + accuracy + consistency + timeliness) / 4) * 100;

      // Identify issues
      const issues = this.identifyDataQualityIssues(metrics);

      return {
        vendor_id: vendorId,
        assessment_date: assessmentDate,
        overall_quality_score: overallQualityScore,
        completeness: completeness * 100,
        accuracy: accuracy * 100,
        consistency: consistency * 100,
        timeliness: timeliness * 100,
        issues,
      };
    } catch (error) {
      console.error('Error validating data quality:', error);
      throw error;
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Collect metrics from a specific data source
   */
  private async collectFromSource(
    vendorId: string,
    source: DataSource,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    switch (source) {
      case 'internal':
        return this.collectInternalMetrics(vendorId);

      case 'external':
        return this.collectExternalMetrics(vendorId);

      case 'manual':
        return this.collectManualMetrics(vendorId);

      case 'automated':
        return this.collectAutomatedMetrics(vendorId);

      default:
        console.warn(`Unknown data source: ${source}`);
        return metrics;
    }
  }

  /**
   * Collect metrics from internal system data
   */
  private async collectInternalMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    try {
      // Collect response time metrics from communications
      const responseTimeMetrics =
        await this.calculateResponseTimeMetrics(vendorId);
      metrics.push(...responseTimeMetrics);

      // Collect booking conversion metrics
      const bookingMetrics =
        await this.calculateBookingConversionMetrics(vendorId);
      metrics.push(...bookingMetrics);

      // Collect client satisfaction from feedback
      const satisfactionMetrics =
        await this.calculateSatisfactionMetrics(vendorId);
      metrics.push(...satisfactionMetrics);

      // Collect reliability metrics from wedding execution
      const reliabilityMetrics =
        await this.calculateReliabilityMetrics(vendorId);
      metrics.push(...reliabilityMetrics);
    } catch (error) {
      console.error('Error collecting internal metrics:', error);
    }

    return metrics;
  }

  /**
   * Calculate response time metrics from communication data
   */
  private async calculateResponseTimeMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    try {
      // Query communication logs for response times
      const { data: communications } = await this.supabase
        .from('communications')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('message_type', 'inquiry_response')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false });

      if (communications && communications.length > 0) {
        // Calculate average response time per day
        const dailyResponseTimes = this.groupByDate(
          communications,
          'created_at',
        );

        Object.entries(dailyResponseTimes).forEach(([date, dayComms]) => {
          const avgResponseTime =
            dayComms.reduce(
              (sum: number, comm: any) => sum + (comm.response_time_hours || 0),
              0,
            ) / dayComms.length;

          if (avgResponseTime > 0) {
            metrics.push(
              this.createMetric(
                vendorId,
                'response_time',
                avgResponseTime,
                date,
                'internal',
                dayComms.length,
              ),
            );
          }
        });
      }
    } catch (error) {
      console.error('Error calculating response time metrics:', error);
    }

    return metrics;
  }

  /**
   * Calculate booking conversion metrics
   */
  private async calculateBookingConversionMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    try {
      // Get inquiry to booking conversion data
      const { data: inquiries } = await this.supabase
        .from('client_inquiries')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const { data: bookings } = await this.supabase
        .from('vendor_bookings')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (inquiries && bookings) {
        // Calculate daily conversion rates
        const dailyInquiries = this.groupByDate(inquiries, 'created_at');
        const dailyBookings = this.groupByDate(bookings, 'created_at');

        Object.keys(dailyInquiries).forEach((date) => {
          const inquiryCount = dailyInquiries[date].length;
          const bookingCount = dailyBookings[date]?.length || 0;
          const conversionRate =
            inquiryCount > 0 ? bookingCount / inquiryCount : 0;

          if (inquiryCount >= 3) {
            // Only calculate if sufficient sample size
            metrics.push(
              this.createMetric(
                vendorId,
                'booking_conversion',
                conversionRate,
                date,
                'internal',
                inquiryCount,
              ),
            );
          }
        });
      }
    } catch (error) {
      console.error('Error calculating booking conversion metrics:', error);
    }

    return metrics;
  }

  /**
   * Calculate client satisfaction metrics
   */
  private async calculateSatisfactionMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    try {
      // Get client feedback and ratings
      const { data: feedback } = await this.supabase
        .from('client_feedback')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (feedback && feedback.length > 0) {
        const dailyFeedback = this.groupByDate(feedback, 'created_at');

        Object.entries(dailyFeedback).forEach(([date, dayFeedback]) => {
          const avgRating =
            dayFeedback.reduce(
              (sum: number, fb: any) => sum + (fb.rating || 0),
              0,
            ) / dayFeedback.length;

          // Convert 1-5 rating to 0-100 scale
          const satisfactionScore = ((avgRating - 1) / 4) * 100;

          metrics.push(
            this.createMetric(
              vendorId,
              'client_satisfaction',
              satisfactionScore,
              date,
              'internal',
              dayFeedback.length,
            ),
          );
        });
      }
    } catch (error) {
      console.error('Error calculating satisfaction metrics:', error);
    }

    return metrics;
  }

  /**
   * Calculate reliability metrics from wedding execution
   */
  private async calculateReliabilityMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    const metrics: VendorPerformanceMetric[] = [];

    try {
      // Get wedding execution data
      const { data: executions } = await this.supabase
        .from('wedding_executions')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte(
          'wedding_date',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (executions && executions.length > 0) {
        const dailyExecutions = this.groupByDate(executions, 'wedding_date');

        Object.entries(dailyExecutions).forEach(([date, dayExecutions]) => {
          // Calculate reliability score based on on-time arrival, setup completion, etc.
          const reliabilityScore =
            dayExecutions.reduce((sum: number, exec: any) => {
              let score = 0;
              if (exec.arrived_on_time) score += 25;
              if (exec.setup_completed_on_time) score += 25;
              if (exec.no_equipment_issues) score += 25;
              if (exec.client_satisfied) score += 25;
              return sum + score;
            }, 0) / dayExecutions.length;

          metrics.push(
            this.createMetric(
              vendorId,
              'reliability_score',
              reliabilityScore,
              date,
              'internal',
              dayExecutions.length,
            ),
          );
        });
      }
    } catch (error) {
      console.error('Error calculating reliability metrics:', error);
    }

    return metrics;
  }

  /**
   * Collect external metrics (placeholder - would integrate with external APIs)
   */
  private async collectExternalMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    // Placeholder for external API integrations
    // Could integrate with Google Reviews, social media, etc.
    return [];
  }

  /**
   * Collect manual metrics (user-entered data)
   */
  private async collectManualMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    try {
      const { data: manualMetrics } = await this.supabase
        .from('manual_performance_entries')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte(
          'entry_date',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      return (manualMetrics || []).map((entry) =>
        this.createMetric(
          vendorId,
          entry.metric_type,
          entry.value,
          entry.entry_date,
          'manual',
          1,
          { manual_entry_id: entry.id },
        ),
      );
    } catch (error) {
      console.error('Error collecting manual metrics:', error);
      return [];
    }
  }

  /**
   * Collect automated metrics from system processes
   */
  private async collectAutomatedMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetric[]> {
    // Placeholder for automated metric collection
    // Could include system-generated performance indicators
    return [];
  }

  /**
   * Validate and clean collected metrics
   */
  private async validateAndCleanMetrics(
    metrics: VendorPerformanceMetric[],
  ): Promise<VendorPerformanceMetric[]> {
    const validatedMetrics: VendorPerformanceMetric[] = [];

    for (const metric of metrics) {
      // Validate metric value against rules
      if (this.isValidMetricValue(metric.metric_type, metric.metric_value)) {
        // Clean and standardize the metric
        const cleanedMetric = this.cleanMetric(metric);
        validatedMetrics.push(cleanedMetric);
      } else {
        console.warn(
          `Invalid metric value: ${metric.metric_type} = ${metric.metric_value}`,
        );
      }
    }

    return validatedMetrics;
  }

  /**
   * Store validated metrics in database
   */
  private async storeMetrics(
    metrics: VendorPerformanceMetric[],
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vendor_performance_metrics')
        .upsert(metrics, {
          onConflict: 'vendor_id,metric_type,calculation_date',
          ignoreDuplicates: false,
        });

      if (error) {
        throw new Error(`Failed to store metrics: ${error.message}`);
      }
    } catch (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
  }

  /**
   * Helper method to create a metric object
   */
  private createMetric(
    vendorId: string,
    metricType: MetricType,
    value: number,
    date: string,
    source: DataSource,
    sampleSize: number,
    metadata: Record<string, any> = {},
  ): VendorPerformanceMetric {
    const calculationDate = new Date(date);
    const isWeddingSeason = this.isWeddingSeason(calculationDate);
    const isPeakSeason = this.isPeakSeason(calculationDate);

    return {
      id: crypto.randomUUID(),
      vendor_id: vendorId,
      metric_type: metricType,
      metric_value: value,
      calculation_date: calculationDate.toISOString().split('T')[0],
      wedding_season: isWeddingSeason,
      peak_season: isPeakSeason,
      data_source: source,
      confidence_score: this.calculateConfidenceScore(sampleSize, source),
      sample_size: sampleSize,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Check if metric value is valid according to validation rules
   */
  private isValidMetricValue(metricType: MetricType, value: number): boolean {
    const rule = this.METRIC_VALIDATION_RULES[metricType];
    if (!rule) return true; // No rule defined, assume valid

    return (
      value >= rule.min && value <= rule.max && !isNaN(value) && isFinite(value)
    );
  }

  /**
   * Clean and standardize a metric
   */
  private cleanMetric(
    metric: VendorPerformanceMetric,
  ): VendorPerformanceMetric {
    return {
      ...metric,
      metric_value: Math.round(metric.metric_value * 10000) / 10000, // Round to 4 decimal places
      confidence_score: Math.max(0, Math.min(1, metric.confidence_score)), // Clamp to [0,1]
    };
  }

  /**
   * Calculate confidence score based on sample size and data source
   */
  private calculateConfidenceScore(
    sampleSize: number,
    source: DataSource,
  ): number {
    const baseConfidence = Math.min(
      1,
      sampleSize / this.DATA_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE,
    );

    const sourceMultiplier =
      {
        internal: 1.0,
        external: 0.8,
        manual: 0.6,
        automated: 0.9,
      }[source] || 0.5;

    return baseConfidence * sourceMultiplier;
  }

  /**
   * Group data by date
   */
  private groupByDate(data: any[], dateField: string): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    data.forEach((item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    return grouped;
  }

  /**
   * Check if date falls in wedding season
   */
  private isWeddingSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    return [4, 5, 6, 7, 8, 9, 10, 11].includes(month);
  }

  /**
   * Check if date falls in peak wedding season
   */
  private isPeakSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    return [5, 6, 9, 10].includes(month);
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDifferences.reduce((sum, sq) => sum + sq, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate benchmark thresholds for a metric type
   */
  private async calculateBenchmarkThresholds(
    category: IndustryCategory,
    metricType: MetricType,
    values: number[],
  ): Promise<VendorPerformanceBenchmark> {
    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;

    const median =
      n % 2 === 0
        ? (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2
        : sortedValues[Math.floor(n / 2)];

    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Calculate percentile thresholds
    const p90 = sortedValues[Math.floor(n * 0.9)];
    const p75 = sortedValues[Math.floor(n * 0.75)];
    const p50 = median;
    const p25 = sortedValues[Math.floor(n * 0.25)];

    return {
      id: crypto.randomUUID(),
      industry_category: category,
      geographic_region: 'global',
      metric_type: metricType,
      excellent_threshold: p90,
      good_threshold: p75,
      average_threshold: p50,
      poor_threshold: p25,
      industry_median: median,
      industry_mean: mean,
      sample_size: n,
      last_updated: new Date().toISOString(),
      peak_season_multiplier: 1.2,
      off_season_multiplier: 0.8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Upsert benchmark to database
   */
  private async upsertBenchmark(
    benchmark: VendorPerformanceBenchmark,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_performance_benchmarks')
      .upsert(benchmark, {
        onConflict: 'industry_category,geographic_region,metric_type',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(`Failed to upsert benchmark: ${error.message}`);
    }
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(metrics: VendorPerformanceMetric[]): number {
    const expectedMetricTypes = Object.keys(this.METRIC_VALIDATION_RULES);
    const availableMetricTypes = new Set(metrics.map((m) => m.metric_type));

    return availableMetricTypes.size / expectedMetricTypes.length;
  }

  /**
   * Calculate data accuracy score
   */
  private calculateAccuracy(metrics: VendorPerformanceMetric[]): number {
    const validMetrics = metrics.filter((m) =>
      this.isValidMetricValue(m.metric_type, m.metric_value),
    );

    return metrics.length > 0 ? validMetrics.length / metrics.length : 1;
  }

  /**
   * Calculate data consistency score
   */
  private calculateConsistency(metrics: VendorPerformanceMetric[]): number {
    // Group metrics by type and check for consistency
    const grouped = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.metric_type]) acc[metric.metric_type] = [];
        acc[metric.metric_type].push(metric.metric_value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    let consistencyScore = 0;
    let typeCount = 0;

    Object.entries(grouped).forEach(([type, values]) => {
      if (values.length > 1) {
        const stdDev = this.calculateStandardDeviation(values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

        // Lower coefficient of variation indicates better consistency
        consistencyScore += Math.max(0, 1 - coefficientOfVariation);
        typeCount++;
      }
    });

    return typeCount > 0 ? consistencyScore / typeCount : 1;
  }

  /**
   * Calculate data timeliness score
   */
  private calculateTimeliness(metrics: VendorPerformanceMetric[]): number {
    const now = new Date();
    const maxAgeMs =
      this.DATA_QUALITY_THRESHOLDS.MAX_DATA_AGE_DAYS * 24 * 60 * 60 * 1000;

    const recentMetrics = metrics.filter((m) => {
      const ageMs = now.getTime() - new Date(m.created_at).getTime();
      return ageMs <= maxAgeMs;
    });

    return metrics.length > 0 ? recentMetrics.length / metrics.length : 1;
  }

  /**
   * Identify data quality issues
   */
  private identifyDataQualityIssues(metrics: VendorPerformanceMetric[]): any[] {
    const issues: any[] = [];

    // Check for insufficient sample size
    if (metrics.length < this.DATA_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE) {
      issues.push({
        severity: 'high' as const,
        description: `Insufficient sample size: ${metrics.length} metrics (minimum ${this.DATA_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE} required)`,
        affected_metrics: [...new Set(metrics.map((m) => m.metric_type))],
        recommendations: [
          'Collect more data points',
          'Extend collection period',
          'Add additional data sources',
        ],
      });
    }

    // Check for low confidence scores
    const lowConfidenceMetrics = metrics.filter(
      (m) =>
        m.confidence_score < this.DATA_QUALITY_THRESHOLDS.MIN_CONFIDENCE_SCORE,
    );
    if (lowConfidenceMetrics.length > 0) {
      issues.push({
        severity: 'medium' as const,
        description: `${lowConfidenceMetrics.length} metrics with low confidence scores`,
        affected_metrics: [
          ...new Set(lowConfidenceMetrics.map((m) => m.metric_type)),
        ],
        recommendations: [
          'Improve data collection methods',
          'Increase sample sizes',
          'Verify data sources',
        ],
      });
    }

    return issues;
  }
}
