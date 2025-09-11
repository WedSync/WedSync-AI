/**
 * WS-189 Touch Performance Tracker - Team B Backend
 * Real-time touch performance monitoring with sub-50ms accuracy tracking
 * Automated optimization suggestions with A/B testing coordination
 */

import { createClient } from '@/lib/supabase/client';

export interface TouchPerformanceMetric {
  gesture_type: string;
  response_time: number;
  target_response_time: number;
  success: boolean;
  timestamp: string;
  device_context: {
    screen_size: string;
    device_type: 'mobile' | 'tablet' | 'desktop';
    connection_type?: string;
    cpu_performance?: number;
  };
  workflow_context: {
    workflow_type: string;
    urgency_level: 'emergency' | 'high' | 'normal' | 'low';
    concurrent_operations?: number;
  };
}

export interface PerformanceThresholds {
  emergency_gestures: number; // 25ms
  critical_gestures: number; // 40ms
  high_priority: number; // 50ms
  normal_gestures: number; // 100ms
  low_priority: number; // 150ms
}

export interface OptimizationSuggestion {
  type:
    | 'hardware_acceleration'
    | 'touch_target_size'
    | 'haptic_feedback'
    | 'visual_feedback'
    | 'rendering_optimization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  gesture_type: string;
  expected_improvement: number; // percentage
  implementation_effort: 'low' | 'medium' | 'high';
  description: string;
  technical_details: string;
}

export class TouchPerformanceTracker {
  private supabase = createClient();
  private metricsBuffer: TouchPerformanceMetric[] = [];
  private bufferSize = 50; // Batch size for efficient API calls
  private flushInterval = 5000; // 5 seconds
  private performanceThresholds: PerformanceThresholds;
  private optimizationCache = new Map<string, OptimizationSuggestion[]>();
  private lastFlushTime = 0;

  constructor() {
    this.performanceThresholds = {
      emergency_gestures: 25,
      critical_gestures: 40,
      high_priority: 50,
      normal_gestures: 100,
      low_priority: 150,
    };

    // Setup automatic flushing
    this.setupAutoFlush();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Track touch performance metric with real-time analysis
   */
  async trackTouchPerformance(
    userId: string,
    sessionId: string,
    metric: TouchPerformanceMetric,
  ): Promise<{
    recorded: boolean;
    performance_status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
    immediate_suggestions?: OptimizationSuggestion[];
    api_response_time: number;
  }> {
    const startTime = performance.now();

    try {
      // Add to metrics buffer
      this.metricsBuffer.push({
        ...metric,
        timestamp: metric.timestamp || new Date().toISOString(),
      });

      // Analyze performance immediately for critical gestures
      const performanceStatus = this.analyzePerformanceStatus(metric);
      let immediateSuggestions: OptimizationSuggestion[] = [];

      // Generate immediate suggestions for poor performance
      if (
        performanceStatus === 'critical' ||
        performanceStatus === 'needs_improvement'
      ) {
        immediateSuggestions =
          await this.generateImmediateOptimizations(metric);
      }

      // Flush buffer if it's full or if it's a critical performance issue
      if (
        this.metricsBuffer.length >= this.bufferSize ||
        performanceStatus === 'critical'
      ) {
        await this.flushMetricsBuffer(userId, sessionId);
      }

      const apiResponseTime = performance.now() - startTime;

      // Log API performance if it exceeds target
      if (apiResponseTime > 50) {
        console.warn(
          `Touch performance tracker API exceeded 50ms target: ${apiResponseTime.toFixed(2)}ms`,
        );
      }

      return {
        recorded: true,
        performance_status: performanceStatus,
        immediate_suggestions:
          immediateSuggestions.length > 0 ? immediateSuggestions : undefined,
        api_response_time: Math.round(apiResponseTime * 100) / 100,
      };
    } catch (error) {
      console.error('Touch performance tracking error:', error);
      return {
        recorded: false,
        performance_status: 'critical',
        api_response_time: performance.now() - startTime,
      };
    }
  }

  /**
   * Get real-time performance dashboard data
   */
  async getPerformanceDashboard(
    userId?: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<{
    summary: {
      total_interactions: number;
      average_response_time: number;
      success_rate: number;
      performance_score: number;
    };
    gesture_breakdown: Array<{
      gesture_type: string;
      count: number;
      avg_response_time: number;
      target_hit_rate: number;
      trend: 'improving' | 'stable' | 'degrading';
    }>;
    optimization_opportunities: OptimizationSuggestion[];
    real_time_alerts: Array<{
      type:
        | 'performance_degradation'
        | 'optimization_available'
        | 'target_missed';
      message: string;
      priority: 'high' | 'medium' | 'low';
      timestamp: string;
    }>;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);

      // Fetch performance metrics
      let query = this.supabase
        .from('touch_performance_metrics')
        .select('*')
        .gte('timestamp', timeFilter);

      if (userId) {
        const hashedUserId = await this.hashUserId(userId);
        query = query.eq('hashed_user_id', hashedUserId);
      }

      const { data: metrics, error } = await query
        .order('timestamp', { ascending: false })
        .limit(10000);

      if (error) {
        throw error;
      }

      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(metrics || []);

      // Analyze gesture breakdown
      const gestureBreakdown = this.analyzeGestureBreakdown(metrics || []);

      // Get optimization opportunities
      const optimizationOpportunities =
        await this.getOptimizationOpportunities(userId);

      // Get real-time alerts
      const realTimeAlerts = await this.getRealTimeAlerts(userId);

      return {
        summary,
        gesture_breakdown: gestureBreakdown,
        optimization_opportunities,
        real_time_alerts: realTimeAlerts,
      };
    } catch (error) {
      console.error('Performance dashboard error:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered optimization suggestions
   */
  async generateOptimizationSuggestions(
    userId: string,
    deviceId: string,
    workflowType?: string,
  ): Promise<OptimizationSuggestion[]> {
    try {
      const cacheKey = `${userId}-${deviceId}-${workflowType || 'all'}`;

      // Check cache first
      if (this.optimizationCache.has(cacheKey)) {
        const cached = this.optimizationCache.get(cacheKey);
        if (cached) return cached;
      }

      const hashedUserId = await this.hashUserId(userId);

      // Get user's recent performance data
      const { data: recentMetrics } = await this.supabase
        .from('touch_performance_metrics')
        .select('*')
        .eq('hashed_user_id', hashedUserId)
        .gte(
          'timestamp',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (!recentMetrics || recentMetrics.length === 0) {
        return [];
      }

      // Analyze performance patterns
      const suggestions = this.analyzeAndGenerateSuggestions(
        recentMetrics,
        workflowType,
      );

      // Cache suggestions for 1 hour
      this.optimizationCache.set(cacheKey, suggestions);
      setTimeout(() => this.optimizationCache.delete(cacheKey), 60 * 60 * 1000);

      return suggestions;
    } catch (error) {
      console.error('Optimization suggestions error:', error);
      return [];
    }
  }

  /**
   * Benchmark user performance against industry standards
   */
  async benchmarkPerformance(
    userId: string,
    workflowType?: string,
  ): Promise<{
    user_performance: {
      avg_response_time: number;
      success_rate: number;
      consistency_score: number;
    };
    industry_benchmarks: {
      p50: number;
      p75: number;
      p90: number;
      best_practice: number;
    };
    comparison: {
      percentile_rank: number;
      performance_gap: number;
      improvement_potential: number;
    };
    recommendations: OptimizationSuggestion[];
  }> {
    try {
      const hashedUserId = await this.hashUserId(userId);

      // Get user's performance data
      let userQuery = this.supabase
        .from('touch_performance_metrics')
        .select('response_time, success, gesture_type')
        .eq('hashed_user_id', hashedUserId)
        .gte(
          'timestamp',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (workflowType) {
        userQuery = userQuery.contains('workflow_context', {
          workflow_type: workflowType,
        });
      }

      const { data: userMetrics } = await userQuery;

      // Get industry benchmarks
      let benchmarkQuery = this.supabase
        .from('touch_performance_benchmarks')
        .select('avg_response_time, success_rate')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (workflowType) {
        benchmarkQuery = benchmarkQuery.eq('workflow_type', workflowType);
      }

      const { data: benchmarks } = await benchmarkQuery;

      if (
        !userMetrics ||
        !benchmarks ||
        userMetrics.length === 0 ||
        benchmarks.length === 0
      ) {
        throw new Error('Insufficient data for benchmarking');
      }

      // Calculate user performance
      const userPerformance = this.calculateUserPerformance(userMetrics);

      // Calculate industry benchmarks
      const industryBenchmarks = this.calculateIndustryBenchmarks(benchmarks);

      // Compare performance
      const comparison = this.comparePerformance(
        userPerformance,
        industryBenchmarks,
      );

      // Generate benchmarking-based recommendations
      const recommendations = this.generateBenchmarkRecommendations(comparison);

      return {
        user_performance: userPerformance,
        industry_benchmarks: industryBenchmarks,
        comparison,
        recommendations,
      };
    } catch (error) {
      console.error('Performance benchmarking error:', error);
      throw error;
    }
  }

  /**
   * Setup A/B testing for optimization experiments
   */
  async setupOptimizationExperiment(
    userId: string,
    deviceId: string,
    experimentConfig: {
      name: string;
      hypothesis: string;
      target_gestures: string[];
      optimization_type: string;
      duration_hours: number;
      success_criteria: {
        improvement_threshold: number;
        significance_level: number;
      };
    },
  ): Promise<{
    experiment_id: string;
    group_assignment: 'control' | 'treatment';
    experiment_config: any;
    monitoring_endpoints: {
      metrics: string;
      status: string;
      results: string;
    };
  }> {
    try {
      const hashedUserId = await this.hashUserId(userId);

      // Create experiment record
      const { data: experiment, error } = await this.supabase
        .from('optimization_experiments')
        .insert({
          hashed_user_id: hashedUserId,
          device_id: deviceId,
          name: experimentConfig.name,
          hypothesis: experimentConfig.hypothesis,
          target_gestures: experimentConfig.target_gestures,
          optimization_type: experimentConfig.optimization_type,
          duration_hours: experimentConfig.duration_hours,
          success_criteria: experimentConfig.success_criteria,
          status: 'active',
          started_at: new Date().toISOString(),
          ends_at: new Date(
            Date.now() + experimentConfig.duration_hours * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Assign user to control or treatment group (50/50 split)
      const groupAssignment = Math.random() < 0.5 ? 'control' : 'treatment';

      // Update experiment with group assignment
      await this.supabase
        .from('optimization_experiments')
        .update({ group_assignment: groupAssignment })
        .eq('id', experiment.id);

      return {
        experiment_id: experiment.id,
        group_assignment: groupAssignment,
        experiment_config: experimentConfig,
        monitoring_endpoints: {
          metrics: `/api/touch/performance/experiment/${experiment.id}/metrics`,
          status: `/api/touch/performance/experiment/${experiment.id}/status`,
          results: `/api/touch/performance/experiment/${experiment.id}/results`,
        },
      };
    } catch (error) {
      console.error('Optimization experiment setup error:', error);
      throw error;
    }
  }

  // Private helper methods

  private analyzePerformanceStatus(
    metric: TouchPerformanceMetric,
  ): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
    const threshold = this.getThresholdForGesture(metric.gesture_type);
    const responseTime = metric.response_time;

    if (responseTime <= threshold) {
      return 'excellent';
    } else if (responseTime <= threshold * 1.2) {
      return 'good';
    } else if (responseTime <= threshold * 1.5) {
      return 'needs_improvement';
    } else {
      return 'critical';
    }
  }

  private getThresholdForGesture(gestureType: string): number {
    // Map gesture types to performance thresholds
    if (gestureType.includes('emergency')) {
      return this.performanceThresholds.emergency_gestures;
    } else if (
      ['photo-capture-confirm', 'guest-seating-assign'].includes(gestureType)
    ) {
      return this.performanceThresholds.critical_gestures;
    } else if (
      ['supplier-message-send', 'task-status-update'].includes(gestureType)
    ) {
      return this.performanceThresholds.high_priority;
    } else if (gestureType.includes('settings')) {
      return this.performanceThresholds.low_priority;
    } else {
      return this.performanceThresholds.normal_gestures;
    }
  }

  private async generateImmediateOptimizations(
    metric: TouchPerformanceMetric,
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const threshold = this.getThresholdForGesture(metric.gesture_type);
    const overage = metric.response_time - threshold;

    if (overage > threshold * 0.5) {
      // 50% over threshold
      suggestions.push({
        type: 'hardware_acceleration',
        priority: 'critical',
        gesture_type: metric.gesture_type,
        expected_improvement: 30,
        implementation_effort: 'low',
        description: 'Enable GPU acceleration for this gesture type',
        technical_details:
          'Add transform3d and will-change CSS properties to touch targets',
      });
    }

    if (overage > threshold * 0.3) {
      // 30% over threshold
      suggestions.push({
        type: 'touch_target_size',
        priority: 'high',
        gesture_type: metric.gesture_type,
        expected_improvement: 20,
        implementation_effort: 'medium',
        description: 'Increase touch target size for improved accuracy',
        technical_details:
          'Increase minimum touch target to 44px with larger padding',
      });
    }

    if (!metric.success) {
      suggestions.push({
        type: 'haptic_feedback',
        priority: 'medium',
        gesture_type: metric.gesture_type,
        expected_improvement: 15,
        implementation_effort: 'low',
        description: 'Enable haptic feedback for better touch confirmation',
        technical_details: 'Add navigator.vibrate() on successful touch events',
      });
    }

    return suggestions;
  }

  private async flushMetricsBuffer(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];
      this.lastFlushTime = Date.now();

      // Send metrics to API
      const response = await fetch('/api/touch/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          metrics: metrics,
        }),
      });

      if (!response.ok) {
        // Re-add metrics to buffer if API call failed
        this.metricsBuffer.unshift(...metrics);
        throw new Error('Failed to flush metrics buffer');
      }
    } catch (error) {
      console.error('Metrics buffer flush error:', error);
    }
  }

  private setupAutoFlush(): void {
    setInterval(() => {
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      if (
        this.metricsBuffer.length > 0 &&
        timeSinceLastFlush >= this.flushInterval
      ) {
        // We'll need user ID and session ID for flushing - this would be handled by the client
        console.log(
          'Auto-flush triggered - metrics buffer has items but no user context',
        );
      }
    }, this.flushInterval);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor the performance tracker's own performance
    setInterval(() => {
      const bufferUsage = (this.metricsBuffer.length / this.bufferSize) * 100;

      if (bufferUsage > 80) {
        console.warn(
          `Touch performance tracker buffer is ${bufferUsage}% full`,
        );
      }

      if (this.optimizationCache.size > 100) {
        console.warn('Optimization cache size is growing - consider cleanup');
      }
    }, 30000); // Check every 30 seconds
  }

  private calculateSummaryMetrics(metrics: any[]) {
    if (metrics.length === 0) {
      return {
        total_interactions: 0,
        average_response_time: 0,
        success_rate: 0,
        performance_score: 0,
      };
    }

    const totalInteractions = metrics.length;
    const averageResponseTime =
      metrics.reduce((sum, m) => sum + m.response_time, 0) / totalInteractions;
    const successRate =
      metrics.filter((m) => m.success).length / totalInteractions;
    const targetHitRate =
      metrics.filter((m) => m.response_time <= m.target_response_time).length /
      totalInteractions;

    // Calculate performance score (0-100)
    const responseScore = Math.max(0, 100 - averageResponseTime / 10);
    const successScore = successRate * 100;
    const targetScore = targetHitRate * 100;
    const performanceScore = (responseScore + successScore + targetScore) / 3;

    return {
      total_interactions: totalInteractions,
      average_response_time: Math.round(averageResponseTime * 100) / 100,
      success_rate: Math.round(successRate * 10000) / 100,
      performance_score: Math.round(performanceScore * 100) / 100,
    };
  }

  private analyzeGestureBreakdown(metrics: any[]) {
    // Group metrics by gesture type
    const gestureGroups = metrics.reduce((acc, m) => {
      if (!acc[m.gesture_type]) {
        acc[m.gesture_type] = [];
      }
      acc[m.gesture_type].push(m);
      return acc;
    }, {});

    return Object.entries(gestureGroups)
      .map(([gestureType, gMetrics]: [string, any[]]) => {
        const count = gMetrics.length;
        const avgResponseTime =
          gMetrics.reduce((sum, m) => sum + m.response_time, 0) / count;
        const targetHitRate =
          gMetrics.filter((m) => m.response_time <= m.target_response_time)
            .length / count;

        // Simple trend analysis
        const sortedMetrics = gMetrics.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        const firstHalf = sortedMetrics.slice(0, Math.floor(count / 2));
        const secondHalf = sortedMetrics.slice(Math.floor(count / 2));

        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (firstHalf.length > 0 && secondHalf.length > 0) {
          const firstAvg =
            firstHalf.reduce((sum, m) => sum + m.response_time, 0) /
            firstHalf.length;
          const secondAvg =
            secondHalf.reduce((sum, m) => sum + m.response_time, 0) /
            secondHalf.length;
          const change = (secondAvg - firstAvg) / firstAvg;

          if (change > 0.1) trend = 'degrading';
          else if (change < -0.1) trend = 'improving';
        }

        return {
          gesture_type: gestureType,
          count,
          avg_response_time: Math.round(avgResponseTime * 100) / 100,
          target_hit_rate: Math.round(targetHitRate * 10000) / 100,
          trend,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private async getOptimizationOpportunities(
    userId?: string,
  ): Promise<OptimizationSuggestion[]> {
    // This would query the optimization_triggers table for pending suggestions
    try {
      let query = this.supabase
        .from('optimization_triggers')
        .select('*')
        .eq('status', 'pending');

      if (userId) {
        const hashedUserId = await this.hashUserId(userId);
        query = query.eq('hashed_user_id', hashedUserId);
      }

      const { data: triggers } = await query.limit(10);

      return (triggers || []).map((trigger) => ({
        type: trigger.recommended_action as any,
        priority: trigger.priority as any,
        gesture_type: trigger.gesture_type,
        expected_improvement: 20, // This would be calculated based on historical data
        implementation_effort: 'medium' as any,
        description: this.getOptimizationDescription(
          trigger.recommended_action,
        ),
        technical_details: this.getTechnicalDetails(trigger.recommended_action),
      }));
    } catch (error) {
      console.error('Error fetching optimization opportunities:', error);
      return [];
    }
  }

  private async getRealTimeAlerts(userId?: string) {
    // This would query for recent performance alerts
    try {
      let query = this.supabase
        .from('performance_alerts')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (userId) {
        const hashedUserId = await this.hashUserId(userId);
        query = query.eq('hashed_user_id', hashedUserId);
      }

      const { data: alerts } = await query
        .limit(5)
        .order('created_at', { ascending: false });

      return (alerts || []).map((alert) => ({
        type: alert.alert_type,
        message: this.formatAlertMessage(alert),
        priority: alert.severity,
        timestamp: alert.created_at,
      }));
    } catch (error) {
      console.error('Error fetching real-time alerts:', error);
      return [];
    }
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private async hashUserId(userId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private analyzeAndGenerateSuggestions(
    metrics: any[],
    workflowType?: string,
  ): OptimizationSuggestion[] {
    // This would implement sophisticated analysis to generate suggestions
    // For now, returning placeholder suggestions based on common optimization patterns
    const suggestions: OptimizationSuggestion[] = [];

    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.response_time, 0) / metrics.length;
    const successRate =
      metrics.filter((m) => m.success).length / metrics.length;

    if (avgResponseTime > 100) {
      suggestions.push({
        type: 'hardware_acceleration',
        priority: 'high',
        gesture_type: 'general',
        expected_improvement: 25,
        implementation_effort: 'low',
        description: 'Enable hardware acceleration for improved performance',
        technical_details: 'Add CSS transform3d and will-change properties',
      });
    }

    if (successRate < 0.9) {
      suggestions.push({
        type: 'touch_target_size',
        priority: 'medium',
        gesture_type: 'general',
        expected_improvement: 15,
        implementation_effort: 'medium',
        description: 'Increase touch target sizes for better accuracy',
        technical_details:
          'Increase minimum touch target to 48px with adequate spacing',
      });
    }

    return suggestions;
  }

  private calculateUserPerformance(metrics: any[]) {
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.response_time, 0) / metrics.length;
    const successRate =
      metrics.filter((m) => m.success).length / metrics.length;

    // Calculate consistency score based on standard deviation
    const variance =
      metrics.reduce(
        (sum, m) => sum + Math.pow(m.response_time - avgResponseTime, 2),
        0,
      ) / metrics.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(
      0,
      100 - (stdDev / avgResponseTime) * 100,
    );

    return {
      avg_response_time: Math.round(avgResponseTime * 100) / 100,
      success_rate: Math.round(successRate * 10000) / 100,
      consistency_score: Math.round(consistencyScore * 100) / 100,
    };
  }

  private calculateIndustryBenchmarks(benchmarks: any[]) {
    const responseTimes = benchmarks
      .map((b) => b.avg_response_time)
      .sort((a, b) => a - b);

    return {
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p75: responseTimes[Math.floor(responseTimes.length * 0.75)],
      p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
      best_practice: responseTimes[Math.floor(responseTimes.length * 0.1)],
    };
  }

  private comparePerformance(userPerf: any, industryBench: any) {
    const percentileRank = this.calculatePercentileRank(
      userPerf.avg_response_time,
      industryBench,
    );
    const performanceGap =
      userPerf.avg_response_time - industryBench.best_practice;
    const improvementPotential = Math.max(
      0,
      (performanceGap / userPerf.avg_response_time) * 100,
    );

    return {
      percentile_rank: Math.round(percentileRank * 100) / 100,
      performance_gap: Math.round(performanceGap * 100) / 100,
      improvement_potential: Math.round(improvementPotential * 100) / 100,
    };
  }

  private calculatePercentileRank(value: number, benchmarks: any): number {
    // Simple percentile calculation - would be more sophisticated in real implementation
    if (value <= benchmarks.p50) return 50;
    if (value <= benchmarks.p75) return 25;
    if (value <= benchmarks.p90) return 10;
    return 5;
  }

  private generateBenchmarkRecommendations(
    comparison: any,
  ): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];

    if (comparison.percentile_rank < 25) {
      recommendations.push({
        type: 'rendering_optimization',
        priority: 'high',
        gesture_type: 'all',
        expected_improvement: comparison.improvement_potential,
        implementation_effort: 'high',
        description: 'Comprehensive performance optimization needed',
        technical_details:
          'Focus on critical rendering path optimization and touch event handling',
      });
    }

    return recommendations;
  }

  private getOptimizationDescription(action: string): string {
    const descriptions = {
      increase_touch_target_size:
        'Increase touch target sizes for better usability',
      enable_haptic_feedback:
        'Enable haptic feedback for improved user experience',
      optimize_rendering:
        'Optimize rendering pipeline for faster response times',
    };
    return descriptions[action] || 'Optimize touch interaction performance';
  }

  private getTechnicalDetails(action: string): string {
    const details = {
      increase_touch_target_size:
        'Increase minimum touch target to 48px with 8px spacing',
      enable_haptic_feedback:
        'Add navigator.vibrate() calls with appropriate patterns',
      optimize_rendering:
        'Implement CSS contain property and optimize paint layers',
    };
    return (
      details[action] || 'Technical implementation details to be determined'
    );
  }

  private formatAlertMessage(alert: any): string {
    switch (alert.alert_type) {
      case 'touch_performance_degradation':
        return `Performance degradation detected for ${alert.gesture_type} gestures`;
      default:
        return 'Performance alert detected';
    }
  }
}

// Export singleton instance
export const touchPerformanceTracker = new TouchPerformanceTracker();
