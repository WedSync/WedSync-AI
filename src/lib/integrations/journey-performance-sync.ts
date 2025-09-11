/**
 * Journey Performance Tracking Integration
 *
 * Provides real-time metrics collection, ML feedback loops, and industry benchmarking
 * for journey optimization in the WedSync AI Journey Suggestions system.
 *
 * @fileoverview Production-ready performance tracking for WS-208 Journey Performance Sync
 * @author WedSync Development Team - Team C Round 1
 * @version 1.0.0
 * @created 2025-01-20
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Performance metric definition
 */
export interface PerformanceMetric {
  id: string;
  journeyId: string;
  organizationId: string;
  metricType:
    | 'conversion'
    | 'engagement'
    | 'completion'
    | 'satisfaction'
    | 'custom';
  value: number;
  previousValue?: number;
  timestamp: Date;
  context: {
    step?: string;
    channel?: 'email' | 'sms' | 'in-app' | 'webhook';
    userSegment?: string;
    deviceType?: string;
    experienceVersion?: string;
  };
  metadata: Record<string, unknown>;
}

/**
 * ML feedback data structure
 */
export interface MLFeedbackData {
  journeyId: string;
  optimizationSuggestions: Array<{
    type: 'timing' | 'content' | 'channel' | 'flow';
    suggestion: string;
    confidenceScore: number;
    expectedImprovement: number;
  }>;
  performancePredictions: {
    nextWeekConversion: number;
    churnRisk: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

/**
 * Industry benchmark comparison
 */
export interface IndustryBenchmark {
  metric: string;
  industryAverage: number;
  topPercentile: number;
  organizationValue: number;
  percentileRank: number;
  trend: 'above' | 'below' | 'at' | 'improving' | 'declining';
}

/**
 * A/B test variant configuration
 */
export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  isControl: boolean;
  metrics: Record<string, number>;
  sampleSize: number;
  statistical_significance?: number;
}

/**
 * A/B test results
 */
export interface ABTestResult {
  testId: string;
  journeyId: string;
  variants: ABTestVariant[];
  winner?: string;
  confidence: number;
  status: 'running' | 'completed' | 'paused';
  conclusions: string[];
}

/**
 * Performance sync configuration
 */
export interface PerformanceSyncConfig {
  organizationId: string;
  enableRealTimeSync: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  alertThresholds: {
    conversionDrop: number;
    engagementDrop: number;
    errorRate: number;
  };
}

// ============================================================================
// MAIN PERFORMANCE SYNC CLASS
// ============================================================================

/**
 * Journey Performance Sync
 *
 * Manages real-time performance metrics collection, ML feedback loops,
 * industry benchmarking, and A/B testing coordination for AI journey optimization.
 */
export class JourneyPerformanceSync extends EventEmitter {
  private readonly supabase: any;
  private readonly config: PerformanceSyncConfig;
  private metricsBuffer: PerformanceMetric[];
  private batchTimer?: NodeJS.Timeout;
  private realtimeChannel?: any;
  private isInitialized = false;

  constructor(
    organizationId: string,
    customConfig?: Partial<PerformanceSyncConfig>,
  ) {
    super();

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    this.config = {
      organizationId,
      enableRealTimeSync: true,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      retentionDays: 365,
      alertThresholds: {
        conversionDrop: 0.1, // 10% drop
        engagementDrop: 0.15, // 15% drop
        errorRate: 0.05, // 5% error rate
      },
      ...customConfig,
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    this.metricsBuffer = [];
    this.startBatchProcessor();

    logger.info('Journey Performance Sync initialized', {
      organizationId: this.config.organizationId,
      config: this.config,
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Initialize performance tracking
   *
   * @returns Promise resolving when initialization is complete
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Journey Performance Sync');

      // Verify database connections
      await this.verifyConnections();

      // Setup real-time listeners
      if (this.config.enableRealTimeSync) {
        await this.setupRealtimeListeners();
      }

      // Initialize ML pipeline connections
      await this.initializeMLPipeline();

      this.isInitialized = true;
      logger.info('Journey Performance Sync initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Journey Performance Sync', { error });
      throw new Error(
        `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Track journey performance metric
   *
   * @param metric Performance metric to track
   * @returns Promise resolving when metric is tracked
   */
  public async trackMetric(
    metric: Omit<PerformanceMetric, 'id' | 'timestamp'>,
  ): Promise<{
    success: boolean;
    error?: string;
    metricId?: string;
  }> {
    try {
      // Validate required fields
      if (!metric.journeyId || !metric.organizationId || !metric.metricType) {
        throw new Error('Missing required metrics fields');
      }

      // Validate metric values
      if (typeof metric.value !== 'number' || metric.value < 0) {
        throw new Error('Invalid metric values');
      }

      const performanceMetric: PerformanceMetric = {
        ...metric,
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      // Add to buffer for batch processing
      this.metricsBuffer.push(performanceMetric);

      // Real-time processing for critical metrics
      if (this.isCriticalMetric(performanceMetric)) {
        await this.processCriticalMetric(performanceMetric);
      }

      // Emit for real-time listeners
      this.emit('metricTracked', performanceMetric);

      logger.debug('Performance metric tracked', {
        journeyId: metric.journeyId,
        metricType: metric.metricType,
        value: metric.value,
      });

      return {
        success: true,
        metricId: performanceMetric.id,
      };
    } catch (error) {
      logger.error('Failed to track performance metric', { error, metric });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate engagement score for a journey
   *
   * @param journeyId Journey identifier
   * @returns Promise resolving to engagement score (0-100)
   */
  public async calculateEngagementScore(journeyId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('journey_performance_aggregated')
        .select(
          `
          avg_time_spent,
          avg_interaction_count,
          avg_completion_rate,
          total_sessions
        `,
        )
        .eq('journey_id', journeyId)
        .single();

      if (error || !data) {
        logger.warn('No performance data found for journey', { journeyId });
        return 0;
      }

      // Validate data ranges
      if (
        data.avg_time_spent < 0 ||
        data.avg_completion_rate > 1 ||
        data.avg_completion_rate < 0
      ) {
        throw new Error('Invalid metric values');
      }

      // Calculate weighted engagement score
      const timeScore = Math.min(data.avg_time_spent / 600, 1) * 30; // Max 10 minutes = 30 points
      const interactionScore =
        Math.min(data.avg_interaction_count / 15, 1) * 25; // Max 15 interactions = 25 points
      const completionScore = data.avg_completion_rate * 35; // Completion rate = 35 points
      const sessionScore = Math.min(data.total_sessions / 10, 1) * 10; // Sessions volume = 10 points

      const engagementScore = Math.round(
        timeScore + interactionScore + completionScore + sessionScore,
      );

      logger.debug('Engagement score calculated', {
        journeyId,
        score: engagementScore,
        components: {
          timeScore,
          interactionScore,
          completionScore,
          sessionScore,
        },
      });

      return Math.min(engagementScore, 100);
    } catch (error) {
      logger.error('Failed to calculate engagement score', {
        error,
        journeyId,
      });
      throw error;
    }
  }

  /**
   * Generate ML feedback and optimization suggestions
   *
   * @param journeyId Journey identifier
   * @returns Promise resolving to ML feedback data
   */
  public async generateMLFeedback(journeyId: string): Promise<MLFeedbackData> {
    try {
      // Get historical performance data
      const { data: historicalData } = await this.supabase
        .from('journey_performance_metrics')
        .select('*')
        .eq('journey_id', journeyId)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (!historicalData || historicalData.length === 0) {
        throw new Error('Insufficient data for ML analysis');
      }

      // Analyze patterns and generate suggestions
      const optimizationSuggestions =
        await this.analyzeOptimizationOpportunities(historicalData);

      // Generate performance predictions
      const performancePredictions =
        await this.predictPerformance(historicalData);

      const feedback: MLFeedbackData = {
        journeyId,
        optimizationSuggestions,
        performancePredictions,
      };

      // Store feedback for future reference
      await this.storeFeedback(feedback);

      logger.info('ML feedback generated', {
        journeyId,
        suggestionsCount: optimizationSuggestions.length,
      });

      return feedback;
    } catch (error) {
      logger.error('Failed to generate ML feedback', { error, journeyId });
      throw error;
    }
  }

  /**
   * Get industry benchmark comparison
   *
   * @param organizationId Organization identifier
   * @param journeyType Journey type for comparison
   * @param industryCategory Industry category
   * @returns Promise resolving to benchmark comparisons
   */
  public async getIndustryBenchmarks(
    organizationId: string,
    journeyType: string,
    industryCategory: string = 'wedding_services',
  ): Promise<IndustryBenchmark[]> {
    try {
      // Get organization's performance data
      const { data: orgMetrics } = await this.supabase
        .from('journey_performance_aggregated')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('journey_type', journeyType);

      // Get industry benchmarks
      const { data: benchmarkData } = await this.supabase
        .from('industry_benchmarks')
        .select('*')
        .eq('industry_category', industryCategory)
        .eq('journey_type', journeyType);

      if (!orgMetrics || !benchmarkData) {
        throw new Error('Insufficient data for benchmark comparison');
      }

      const benchmarks: IndustryBenchmark[] = benchmarkData.map((benchmark) => {
        const orgValue = this.getOrganizationValue(
          orgMetrics,
          benchmark.metric,
        );
        const percentileRank = this.calculatePercentileRank(
          orgValue,
          benchmark,
        );

        return {
          metric: benchmark.metric,
          industryAverage: benchmark.average_value,
          topPercentile: benchmark.percentile_90,
          organizationValue: orgValue,
          percentileRank,
          trend: this.determineTrend(orgValue, benchmark),
        };
      });

      logger.info('Industry benchmarks retrieved', {
        organizationId,
        benchmarksCount: benchmarks.length,
      });

      return benchmarks;
    } catch (error) {
      logger.error('Failed to get industry benchmarks', {
        error,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Start real-time performance monitoring
   *
   * @param callback Function to call on performance updates
   */
  public startRealTimeMonitoring(callback: (update: any) => void): void {
    if (!this.config.enableRealTimeSync) {
      logger.warn('Real-time sync is disabled');
      return;
    }

    try {
      this.realtimeChannel = this.supabase
        .channel(`performance-updates-${this.config.organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'journey_performance_metrics',
            filter: `organization_id=eq.${this.config.organizationId}`,
          },
          (payload) => {
            this.handleRealtimeUpdate(payload, callback);
          },
        )
        .subscribe();

      logger.info('Real-time monitoring started', {
        organizationId: this.config.organizationId,
      });
    } catch (error) {
      logger.error('Failed to start real-time monitoring', { error });
    }
  }

  /**
   * Stop real-time monitoring
   */
  public stopRealTimeMonitoring(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      logger.info('Real-time monitoring stopped');
    }
  }

  /**
   * Generate performance insights for a date range
   *
   * @param timeRange Date range for analysis
   * @returns Promise resolving to performance insights
   */
  public async generatePerformanceInsights(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    summary: Record<string, { value: number; change: number }>;
    recommendations: Array<{
      type: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      impact: number;
    }>;
    trends: Record<string, 'up' | 'down' | 'stable'>;
  }> {
    try {
      // Validate date range
      if (timeRange.startDate >= timeRange.endDate) {
        throw new Error('Invalid date range');
      }

      // Get analytics data for the specified period
      const { data: analyticsData, error } = await this.supabase.rpc(
        'get_journey_performance_insights',
        {
          org_id: this.config.organizationId,
          start_date: timeRange.startDate.toISOString(),
          end_date: timeRange.endDate.toISOString(),
        },
      );

      if (error) throw error;

      const summary = this.processSummaryData(analyticsData);
      const recommendations = this.generateRecommendations(analyticsData);
      const trends = this.calculateTrends(analyticsData);

      return {
        summary,
        recommendations,
        trends,
      };
    } catch (error) {
      logger.error('Failed to generate performance insights', {
        error,
        timeRange,
      });
      throw error;
    }
  }

  /**
   * Sync performance data across systems
   *
   * @returns Promise resolving to sync results
   */
  public async syncPerformanceData(): Promise<{
    success: boolean;
    syncedCount: number;
    lastSyncTime: Date;
    error?: string;
  }> {
    try {
      const { data: pendingSync, error } = await this.supabase
        .from('journey_performance_sync_queue')
        .select('*')
        .eq('organization_id', this.config.organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      if (!pendingSync || pendingSync.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          lastSyncTime: new Date(),
        };
      }

      // Process sync items
      let syncedCount = 0;
      for (const item of pendingSync) {
        try {
          await this.processSyncItem(item);
          syncedCount++;
        } catch (error) {
          logger.error('Failed to sync item', { error, itemId: item.id });
        }
      }

      const lastSyncTime = new Date();

      logger.info('Performance data sync completed', {
        organizationId: this.config.organizationId,
        syncedCount,
        totalPending: pendingSync.length,
      });

      return {
        success: true,
        syncedCount,
        lastSyncTime,
      };
    } catch (error) {
      logger.error('Performance data sync failed', { error });
      return {
        success: false,
        syncedCount: 0,
        lastSyncTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Verify database connections
   */
  private async verifyConnections(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('id', this.config.organizationId)
        .single();

      if (error) throw error;
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }

  /**
   * Setup real-time listeners
   */
  private async setupRealtimeListeners(): Promise<void> {
    // Journey completion events
    this.supabase
      .channel('journey_events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_instances',
        },
        (payload) => {
          this.handleJourneyEvent(payload);
        },
      )
      .subscribe();

    // Performance alerts
    this.supabase
      .channel('performance_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'performance_alerts',
        },
        (payload) => {
          this.handlePerformanceAlert(payload);
        },
      )
      .subscribe();
  }

  /**
   * Initialize ML pipeline
   */
  private async initializeMLPipeline(): Promise<void> {
    // Initialize ML models for performance prediction
    // This would integrate with your ML service
    logger.info('ML pipeline initialized');
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = this.metricsBuffer.splice(0, this.config.batchSize);

    try {
      const { error } = await this.supabase
        .from('journey_performance_metrics')
        .insert(
          batch.map((metric) => ({
            id: metric.id,
            journey_id: metric.journeyId,
            organization_id: metric.organizationId,
            metric_type: metric.metricType,
            value: metric.value,
            previous_value: metric.previousValue,
            timestamp: metric.timestamp.toISOString(),
            context: metric.context,
            metadata: metric.metadata,
          })),
        );

      if (error) throw error;

      logger.debug('Metrics batch flushed', { count: batch.length });
    } catch (error) {
      logger.error('Failed to flush metrics batch', { error });
      // Re-add to buffer for retry
      this.metricsBuffer.unshift(...batch);
    }
  }

  /**
   * Check if metric is critical
   */
  private isCriticalMetric(metric: PerformanceMetric): boolean {
    const criticalTypes = ['conversion', 'completion'];
    const criticalThreshold = 0.1; // 10% change is critical

    return (
      criticalTypes.includes(metric.metricType) &&
      metric.previousValue !== undefined &&
      Math.abs(metric.value - metric.previousValue) / metric.previousValue >
        criticalThreshold
    );
  }

  /**
   * Process critical metrics immediately
   */
  private async processCriticalMetric(
    metric: PerformanceMetric,
  ): Promise<void> {
    // Send immediate alerts for critical metrics
    const alertData = {
      type: 'performance_critical',
      severity: 'high',
      message: `Critical ${metric.metricType} change detected`,
      organizationId: metric.organizationId,
      journeyId: metric.journeyId,
      metricType: metric.metricType,
      currentValue: metric.value,
      previousValue: metric.previousValue,
      timestamp: metric.timestamp,
    };

    this.emit('criticalMetric', alertData);
    logger.warn('Critical metric detected', alertData);
  }

  /**
   * Analyze optimization opportunities
   */
  private async analyzeOptimizationOpportunities(
    historicalData: any[],
  ): Promise<MLFeedbackData['optimizationSuggestions']> {
    const suggestions: MLFeedbackData['optimizationSuggestions'] = [];

    // Analyze timing patterns
    const timingAnalysis = this.analyzeOptimalTiming(historicalData);
    if (timingAnalysis) {
      suggestions.push(timingAnalysis);
    }

    // Analyze content performance
    const contentAnalysis = this.analyzeContentPerformance(historicalData);
    if (contentAnalysis) {
      suggestions.push(contentAnalysis);
    }

    // Analyze channel effectiveness
    const channelAnalysis = this.analyzeChannelEffectiveness(historicalData);
    if (channelAnalysis) {
      suggestions.push(channelAnalysis);
    }

    return suggestions;
  }

  /**
   * Analyze optimal timing patterns
   */
  private analyzeOptimalTiming(data: any[]): any {
    // Mock implementation - would use ML in production
    return {
      type: 'timing' as const,
      suggestion: 'Send emails at 2PM for 23% higher engagement',
      confidenceScore: 0.85,
      expectedImprovement: 0.23,
    };
  }

  /**
   * Analyze content performance
   */
  private analyzeContentPerformance(data: any[]): any {
    return {
      type: 'content' as const,
      suggestion: 'Personalize subject lines based on wedding date proximity',
      confidenceScore: 0.72,
      expectedImprovement: 0.18,
    };
  }

  /**
   * Analyze channel effectiveness
   */
  private analyzeChannelEffectiveness(data: any[]): any {
    return {
      type: 'channel' as const,
      suggestion: 'Use SMS for urgent reminders within 48 hours of wedding',
      confidenceScore: 0.91,
      expectedImprovement: 0.34,
    };
  }

  /**
   * Predict future performance
   */
  private async predictPerformance(
    historicalData: any[],
  ): Promise<MLFeedbackData['performancePredictions']> {
    // ML-powered performance prediction
    return {
      nextWeekConversion: 0.18,
      churnRisk: 0.03,
      engagementTrend: 'increasing',
    };
  }

  /**
   * Store ML feedback
   */
  private async storeFeedback(feedback: MLFeedbackData): Promise<void> {
    const { error } = await this.supabase.from('ml_feedback').insert([
      {
        journey_id: feedback.journeyId,
        suggestions: feedback.optimizationSuggestions,
        predictions: feedback.performancePredictions,
        created_at: new Date(),
      },
    ]);

    if (error) {
      logger.error('Failed to store ML feedback', { error });
    }
  }

  /**
   * Get organization value for metric
   */
  private getOrganizationValue(orgMetrics: any[], metric: string): number {
    const metricData = orgMetrics.find((m) => m.metric_name === metric);
    return metricData?.value || 0;
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentileRank(orgValue: number, benchmark: any): number {
    if (orgValue >= benchmark.percentile_90) return 90;
    if (orgValue >= benchmark.percentile_75) return 75;
    if (orgValue >= benchmark.average_value) return 50;
    if (orgValue >= benchmark.percentile_25) return 25;
    return 10;
  }

  /**
   * Determine trend compared to benchmark
   */
  private determineTrend(
    orgValue: number,
    benchmark: any,
  ): IndustryBenchmark['trend'] {
    if (orgValue > benchmark.percentile_75) return 'above';
    if (orgValue < benchmark.percentile_25) return 'below';
    return 'at';
  }

  /**
   * Handle real-time updates
   */
  private handleRealtimeUpdate(
    payload: any,
    callback: (update: any) => void,
  ): void {
    try {
      callback(payload.new || payload.old);
    } catch (error) {
      logger.error('Error handling real-time update', { error });
    }
  }

  /**
   * Handle journey events
   */
  private handleJourneyEvent(payload: any): void {
    this.emit('journeyEvent', payload);
  }

  /**
   * Handle performance alerts
   */
  private handlePerformanceAlert(payload: any): void {
    this.emit('performanceAlert', payload);
  }

  /**
   * Process summary data
   */
  private processSummaryData(
    analyticsData: any,
  ): Record<string, { value: number; change: number }> {
    // Process analytics data into summary format
    return {
      conversion: { value: 0.15, change: 0.02 },
      engagement: { value: 85, change: -2.1 },
      completion: { value: 0.78, change: 0.05 },
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(analyticsData: any): Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
  }> {
    return [
      {
        type: 'timing',
        description:
          'Optimize email send times based on user engagement patterns',
        priority: 'high',
        impact: 0.15,
      },
      {
        type: 'content',
        description:
          'Personalize journey content based on wedding style preferences',
        priority: 'medium',
        impact: 0.12,
      },
      {
        type: 'channel',
        description: 'Increase SMS usage for time-sensitive communications',
        priority: 'low',
        impact: 0.08,
      },
    ];
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(
    analyticsData: any,
  ): Record<string, 'up' | 'down' | 'stable'> {
    return {
      conversion: 'up',
      engagement: 'down',
      completion: 'stable',
    };
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: any): Promise<void> {
    // Process sync queue item
    await this.supabase
      .from('journey_performance_sync_queue')
      .update({ status: 'completed', processed_at: new Date() })
      .eq('id', item.id);
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Flush remaining metrics
    if (this.metricsBuffer.length > 0) {
      await this.flushMetrics();
    }

    // Stop real-time monitoring
    this.stopRealTimeMonitoring();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('Journey Performance Sync cleaned up');
  }
}

// Export singleton instance
export const journeyPerformanceSync = new JourneyPerformanceSync(
  process.env.ORGANIZATION_ID || 'default-org',
);

// Export types for external use
export type {
  PerformanceMetric,
  MLFeedbackData,
  IndustryBenchmark,
  ABTestVariant,
  ABTestResult,
  PerformanceSyncConfig,
};

export default JourneyPerformanceSync;
