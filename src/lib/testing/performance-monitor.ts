/**
 * WS-180 Performance Testing Framework - Core Performance Monitor
 * Team B - Round 1 Implementation
 *
 * Central orchestrator for performance test execution, results processing,
 * and integration with existing WedSync performance monitoring infrastructure.
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { PerformanceBaselineManager } from './performance-baseline-manager';

// Type definitions for performance testing
export interface PerformanceTestResults {
  testId: string;
  testType: 'load' | 'stress' | 'spike' | 'endurance' | 'volume' | 'smoke';
  testScenario: string;
  userType: 'couple' | 'supplier' | 'admin' | 'guest' | 'anonymous';
  weddingSizeCategory: 'small' | 'medium' | 'large' | 'xl';
  environment: 'development' | 'staging' | 'production';

  // Core metrics
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughputRps: number;

  // Wedding-specific metrics
  weddingSeason: boolean;
  concurrentUsers: number;
  totalRequests: number;
  failedRequests: number;

  // Detailed metrics from k6
  metrics: {
    http_req_duration?: {
      avg: number;
      med: number;
      min: number;
      max: number;
      p90: number;
      p95: number;
      p99: number;
    };
    http_req_failed?: number;
    http_reqs?: number;
    iterations?: number;
    vus?: number;
    vus_max?: number;
    [key: string]: any;
  };

  // Test configuration
  testConfiguration: {
    duration: string;
    virtualUsers: number;
    rampUpTime?: string;
    thresholds: Record<string, string[]>;
    scenarios?: any[];
  };

  // Timestamps
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface PerformanceThresholds {
  maxAvgResponseTime: number; // milliseconds
  maxP95ResponseTime: number; // milliseconds
  maxP99ResponseTime: number; // milliseconds
  maxErrorRate: number; // decimal (0.01 = 1%)
  minThroughput: number; // requests per second
}

export interface RegressionAnalysis {
  hasRegression: boolean;
  regressionSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedMetrics: string[];
  comparisonDetails: {
    metric: string;
    currentValue: number;
    baselineValue: number;
    percentageChange: number;
    threshold: number;
  }[];
  recommendations: string[];
}

export interface TestExecutionStatus {
  testId: string;
  status:
    | 'pending'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled';
  progress: number; // 0-100
  estimatedCompletion?: Date;
  currentPhase: string;
  logs: string[];
}

/**
 * Core Performance Monitor class for WS-180 testing framework
 * Integrates with existing WedSync performance infrastructure
 */
export class PerformanceMonitor {
  private supabase;
  private baselineManager: PerformanceBaselineManager;

  // Default thresholds based on WS-180 specification
  private readonly defaultThresholds: Record<string, PerformanceThresholds> = {
    // Guest list operations - critical for couple experience
    guest_list_import: {
      maxAvgResponseTime: 1500,
      maxP95ResponseTime: 3000,
      maxP99ResponseTime: 5000,
      maxErrorRate: 0.01, // 1%
      minThroughput: 20,
    },

    // Photo operations - high bandwidth, longer acceptable times
    photo_upload: {
      maxAvgResponseTime: 3000,
      maxP95ResponseTime: 6000,
      maxP99ResponseTime: 10000,
      maxErrorRate: 0.02, // 2%
      minThroughput: 10,
    },

    // RSVP collection - guest-facing, must be fast
    rsvp_collection: {
      maxAvgResponseTime: 800,
      maxP95ResponseTime: 1500,
      maxP99ResponseTime: 2500,
      maxErrorRate: 0.005, // 0.5%
      minThroughput: 50,
    },

    // Supplier search - business critical
    supplier_search: {
      maxAvgResponseTime: 1200,
      maxP95ResponseTime: 2500,
      maxP99ResponseTime: 4000,
      maxErrorRate: 0.01, // 1%
      minThroughput: 30,
    },

    // Real-time notifications - ultra-fast requirement
    realtime_notifications: {
      maxAvgResponseTime: 200,
      maxP95ResponseTime: 500,
      maxP99ResponseTime: 1000,
      maxErrorRate: 0.005, // 0.5%
      minThroughput: 100,
    },

    // Default fallback thresholds
    default: {
      maxAvgResponseTime: 1500,
      maxP95ResponseTime: 3000,
      maxP99ResponseTime: 5000,
      maxErrorRate: 0.01, // 1%
      minThroughput: 25,
    },
  };

  constructor() {
    this.supabase = createClient();
    this.baselineManager = new PerformanceBaselineManager();
  }

  /**
   * Records performance test results and performs analysis
   */
  async recordTestResults(results: PerformanceTestResults): Promise<{
    success: boolean;
    performanceScore: number;
    thresholdsPassed: boolean;
    regressionAnalysis: RegressionAnalysis;
    testRunId: string;
  }> {
    try {
      // Calculate performance score (0-100)
      const performanceScore = this.calculatePerformanceScore(results);

      // Validate against thresholds
      const thresholdsPassed =
        await this.validatePerformanceThresholds(results);

      // Perform regression analysis
      const regressionAnalysis =
        await this.detectPerformanceRegression(results);

      // Store test results in database
      const { data: testRun, error } = await this.supabase
        .from('performance_test_runs')
        .insert({
          name: `${results.testType}_${results.testScenario}_${Date.now()}`,
          test_type: results.testType,
          test_scenario: results.testScenario,
          status: 'completed',
          start_time: results.startTime.toISOString(),
          end_time: results.endTime.toISOString(),
          duration_ms: results.duration,
          wedding_season: results.weddingSeason,
          user_type: results.userType,
          wedding_size_category: results.weddingSizeCategory,
          test_configuration: results.testConfiguration,
          environment: results.environment,
          metrics: {
            avg_response_time: results.avgResponseTime,
            p95_response_time: results.p95ResponseTime,
            p99_response_time: results.p99ResponseTime,
            error_rate: results.errorRate,
            throughput_rps: results.throughputRps,
            concurrent_users: results.concurrentUsers,
            total_requests: results.totalRequests,
            failed_requests: results.failedRequests,
            detailed_metrics: results.metrics,
          },
          performance_score: performanceScore,
          baseline_comparison: {
            has_regression: regressionAnalysis.hasRegression,
            severity: regressionAnalysis.regressionSeverity,
            affected_metrics: regressionAnalysis.affectedMetrics,
            comparison_details: regressionAnalysis.comparisonDetails,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to store test results:', error);
        throw error;
      }

      // Update baselines if this is a good result
      if (thresholdsPassed && !regressionAnalysis.hasRegression) {
        await this.baselineManager.updateBaseline(results);
      }

      // Trigger alerts if thresholds failed or regression detected
      if (!thresholdsPassed || regressionAnalysis.hasRegression) {
        await this.triggerPerformanceAlert(results, regressionAnalysis);
      }

      return {
        success: true,
        performanceScore,
        thresholdsPassed,
        regressionAnalysis,
        testRunId: testRun.id,
      };
    } catch (error) {
      console.error('Error recording test results:', error);
      return {
        success: false,
        performanceScore: 0,
        thresholdsPassed: false,
        regressionAnalysis: {
          hasRegression: false,
          regressionSeverity: 'low',
          affectedMetrics: [],
          comparisonDetails: [],
          recommendations: [],
        },
        testRunId: '',
      };
    }
  }

  /**
   * Validates performance results against predefined thresholds
   */
  async validatePerformanceThresholds(
    results: PerformanceTestResults,
  ): Promise<boolean> {
    const thresholds = this.getThresholds(results.testScenario);

    const validations = [
      results.avgResponseTime <= thresholds.maxAvgResponseTime,
      results.p95ResponseTime <= thresholds.maxP95ResponseTime,
      results.p99ResponseTime <= thresholds.maxP99ResponseTime,
      results.errorRate <= thresholds.maxErrorRate,
      results.throughputRps >= thresholds.minThroughput,
    ];

    const passed = validations.every((validation) => validation);

    // Log threshold validation details
    console.log(
      `Performance Threshold Validation for ${results.testScenario}:`,
      {
        avgResponseTime: `${results.avgResponseTime}ms <= ${thresholds.maxAvgResponseTime}ms: ${results.avgResponseTime <= thresholds.maxAvgResponseTime}`,
        p95ResponseTime: `${results.p95ResponseTime}ms <= ${thresholds.maxP95ResponseTime}ms: ${results.p95ResponseTime <= thresholds.maxP95ResponseTime}`,
        p99ResponseTime: `${results.p99ResponseTime}ms <= ${thresholds.maxP99ResponseTime}ms: ${results.p99ResponseTime <= thresholds.maxP99ResponseTime}`,
        errorRate: `${(results.errorRate * 100).toFixed(2)}% <= ${(thresholds.maxErrorRate * 100).toFixed(2)}%: ${results.errorRate <= thresholds.maxErrorRate}`,
        throughput: `${results.throughputRps} RPS >= ${thresholds.minThroughput} RPS: ${results.throughputRps >= thresholds.minThroughput}`,
        overallResult: passed,
      },
    );

    return passed;
  }

  /**
   * Detects performance regression by comparing against baselines
   */
  private async detectPerformanceRegression(
    currentResults: PerformanceTestResults,
  ): Promise<RegressionAnalysis> {
    try {
      const baseline = await this.baselineManager.getBaseline(
        currentResults.testType,
        currentResults.testScenario,
        currentResults.userType,
        currentResults.weddingSizeCategory,
        currentResults.environment,
        currentResults.weddingSeason,
      );

      if (!baseline) {
        // No baseline exists, establish one
        await this.baselineManager.establishBaseline(currentResults);
        return {
          hasRegression: false,
          regressionSeverity: 'low',
          affectedMetrics: [],
          comparisonDetails: [],
          recommendations: ['New baseline established for future comparisons'],
        };
      }

      // Compare key metrics against baseline
      const comparisonDetails: RegressionAnalysis['comparisonDetails'] = [];
      const affectedMetrics: string[] = [];

      // Define regression thresholds (percentage increase that indicates regression)
      const regressionThresholds = {
        response_time: 0.2, // 20% increase
        error_rate: 0.1, // 10% increase (absolute)
        throughput: -0.15, // 15% decrease
      };

      // Check average response time
      const avgResponseChange =
        (currentResults.avgResponseTime - baseline.average_value) /
        baseline.average_value;
      comparisonDetails.push({
        metric: 'avg_response_time',
        currentValue: currentResults.avgResponseTime,
        baselineValue: baseline.average_value,
        percentageChange: avgResponseChange * 100,
        threshold: regressionThresholds.response_time * 100,
      });

      if (avgResponseChange > regressionThresholds.response_time) {
        affectedMetrics.push('avg_response_time');
      }

      // Check P95 response time
      if (baseline.percentile_95) {
        const p95Change =
          (currentResults.p95ResponseTime - baseline.percentile_95) /
          baseline.percentile_95;
        comparisonDetails.push({
          metric: 'p95_response_time',
          currentValue: currentResults.p95ResponseTime,
          baselineValue: baseline.percentile_95,
          percentageChange: p95Change * 100,
          threshold: regressionThresholds.response_time * 100,
        });

        if (p95Change > regressionThresholds.response_time) {
          affectedMetrics.push('p95_response_time');
        }
      }

      // Check error rate (for error rate baseline, we need to get it from a different metric)
      // This would need to be implemented when we have error rate baselines

      // Determine regression severity
      let regressionSeverity: RegressionAnalysis['regressionSeverity'] = 'low';
      if (affectedMetrics.length >= 3) {
        regressionSeverity = 'critical';
      } else if (affectedMetrics.length === 2) {
        regressionSeverity = 'high';
      } else if (affectedMetrics.length === 1) {
        // Check the magnitude of regression
        const maxChange = Math.max(
          ...comparisonDetails.map((d) => Math.abs(d.percentageChange)),
        );
        if (maxChange > 50) regressionSeverity = 'high';
        else if (maxChange > 25) regressionSeverity = 'medium';
        else regressionSeverity = 'low';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (affectedMetrics.includes('avg_response_time')) {
        recommendations.push(
          'Investigate database query performance and API endpoint optimization',
        );
      }
      if (affectedMetrics.includes('p95_response_time')) {
        recommendations.push(
          'Check for resource contention and scaling issues during peak load',
        );
      }
      if (affectedMetrics.length > 0) {
        recommendations.push(
          `Performance regression detected during ${currentResults.weddingSeason ? 'peak wedding season' : 'off-season'}`,
        );
      }

      return {
        hasRegression: affectedMetrics.length > 0,
        regressionSeverity,
        affectedMetrics,
        comparisonDetails,
        recommendations,
      };
    } catch (error) {
      console.error('Error in regression analysis:', error);
      return {
        hasRegression: false,
        regressionSeverity: 'low',
        affectedMetrics: [],
        comparisonDetails: [],
        recommendations: ['Unable to perform regression analysis'],
      };
    }
  }

  /**
   * Calculates overall performance score (0-100)
   */
  private calculatePerformanceScore(results: PerformanceTestResults): number {
    const thresholds = this.getThresholds(results.testScenario);

    // Calculate individual metric scores (0-100)
    const responseTimeScore = Math.max(
      0,
      100 - (results.avgResponseTime / thresholds.maxAvgResponseTime) * 100,
    );
    const p95Score = Math.max(
      0,
      100 - (results.p95ResponseTime / thresholds.maxP95ResponseTime) * 100,
    );
    const errorRateScore = Math.max(
      0,
      100 - (results.errorRate / thresholds.maxErrorRate) * 100,
    );
    const throughputScore = Math.min(
      100,
      (results.throughputRps / thresholds.minThroughput) * 100,
    );

    // Weighted average (response time and P95 are most important for user experience)
    const weightedScore =
      responseTimeScore * 0.3 +
      p95Score * 0.3 +
      errorRateScore * 0.25 +
      throughputScore * 0.15;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  /**
   * Gets performance thresholds for a specific test scenario
   */
  private getThresholds(testScenario: string): PerformanceThresholds {
    return (
      this.defaultThresholds[testScenario] || this.defaultThresholds.default
    );
  }

  /**
   * Triggers performance alerts for failed tests or regressions
   */
  private async triggerPerformanceAlert(
    results: PerformanceTestResults,
    regressionAnalysis: RegressionAnalysis,
  ): Promise<void> {
    const alertSeverity = regressionAnalysis.hasRegression
      ? regressionAnalysis.regressionSeverity
      : 'medium';

    const alertMessage = `Performance ${regressionAnalysis.hasRegression ? 'regression' : 'threshold failure'} detected:
    
    Test: ${results.testType} - ${results.testScenario}
    Environment: ${results.environment}
    Wedding Season: ${results.weddingSeason ? 'Peak' : 'Off-season'}
    User Type: ${results.userType}
    
    Results:
    - Avg Response Time: ${results.avgResponseTime}ms
    - P95 Response Time: ${results.p95ResponseTime}ms
    - Error Rate: ${(results.errorRate * 100).toFixed(2)}%
    - Throughput: ${results.throughputRps} RPS
    
    ${regressionAnalysis.recommendations.join('\n')}`;

    console.warn('Performance Alert:', alertMessage);

    // Here you would integrate with your actual alerting system
    // For example: Slack, email, PagerDuty, etc.

    try {
      // Store alert in database for tracking
      await this.supabase.from('performance_alert_rules').insert({
        name: `Auto-generated alert for ${results.testScenario}`,
        test_type: results.testType,
        test_scenario: results.testScenario,
        metric_name: 'multiple',
        threshold_value: 0,
        comparison_operator: '>',
        severity: alertSeverity,
        enabled: true,
        notification_channels: ['email', 'slack'],
      });
    } catch (error) {
      console.error('Failed to store performance alert:', error);
    }
  }

  /**
   * Gets the status of a running performance test
   */
  async getTestStatus(testId: string): Promise<TestExecutionStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('performance_test_runs')
        .select('id, name, status, start_time, end_time, duration_ms, notes')
        .eq('id', testId)
        .single();

      if (error || !data) {
        return null;
      }

      // Calculate progress based on status and time elapsed
      let progress = 0;
      let currentPhase = 'Unknown';

      switch (data.status) {
        case 'pending':
          progress = 0;
          currentPhase = 'Queued for execution';
          break;
        case 'queued':
          progress = 5;
          currentPhase = 'In queue, waiting for resources';
          break;
        case 'running':
          progress = 50;
          currentPhase = 'Executing performance test';
          break;
        case 'completed':
          progress = 100;
          currentPhase = 'Test completed';
          break;
        case 'failed':
          progress = 100;
          currentPhase = 'Test failed';
          break;
        case 'cancelled':
          progress = 100;
          currentPhase = 'Test cancelled';
          break;
      }

      return {
        testId: data.id,
        status: data.status as TestExecutionStatus['status'],
        progress,
        currentPhase,
        logs: data.notes ? [data.notes] : [],
        estimatedCompletion:
          data.status === 'running' && data.start_time
            ? new Date(Date.now() + 30 * 60 * 1000) // Estimate 30 minutes from now
            : undefined,
      };
    } catch (error) {
      console.error('Error getting test status:', error);
      return null;
    }
  }

  /**
   * Cancels a running performance test
   */
  async cancelTest(testId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('performance_test_runs')
        .update({ status: 'cancelled', end_time: new Date().toISOString() })
        .eq('id', testId);

      return !error;
    } catch (error) {
      console.error('Error cancelling test:', error);
      return false;
    }
  }

  /**
   * Gets recent performance test history
   */
  async getTestHistory(
    testType?: string,
    testScenario?: string,
    environment?: string,
    limit: number = 50,
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('performance_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (testType) {
        query = query.eq('test_type', testType);
      }
      if (testScenario) {
        query = query.eq('test_scenario', testScenario);
      }
      if (environment) {
        query = query.eq('environment', environment);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting test history:', error);
      return [];
    }
  }
}

// Export singleton instance for use across the application
export const performanceMonitor = new PerformanceMonitor();
