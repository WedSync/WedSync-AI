/**
 * WS-180 Performance Testing Framework - Baseline Management System
 * Team B - Round 1 Implementation
 *
 * Manages performance baselines for regression detection with seasonal awareness
 * for wedding industry traffic patterns and user behavior analysis.
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import type { PerformanceTestResults } from './performance-monitor';

export interface PerformanceBaseline {
  id: string;
  testType: string;
  testScenario: string;
  metricName: string;
  userType: string;
  weddingSizeCategory: string;
  environment: string;

  // Seasonal baselines for wedding industry
  peakSeasonBaseline: number | null; // May-October
  offSeasonBaseline: number | null; // November-April

  // Statistical data
  average_value: number;
  median_value: number | null;
  percentile_95: number | null;
  percentile_99: number | null;
  standard_deviation: number | null;
  min_value: number | null;
  max_value: number | null;

  // Metadata
  sample_count: number;
  confidence_level: number;
  last_updated: string;
  created_at: string;
}

export interface ComparisonResult {
  baselineId: string;
  isRegression: boolean;
  regressionSeverity: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    metricName: string;
    currentValue: number;
    baselineValue: number;
    percentageDifference: number;
    isWithinThreshold: boolean;
  }[];
  recommendations: string[];
  seasonalContext: {
    isPeakSeason: boolean;
    seasonalAdjustment: number;
    seasonalNote: string;
  };
}

export interface BaselineUpdateResult {
  updated: boolean;
  newBaseline?: PerformanceBaseline;
  improvementDetected: boolean;
  updateReason: string;
}

/**
 * Performance Baseline Manager for WedSync's seasonal wedding traffic patterns
 */
export class PerformanceBaselineManager {
  private supabase;

  // Seasonal adjustment factors for wedding industry
  private readonly seasonalAdjustments = {
    peakSeason: {
      // Peak season (May-Oct) - higher traffic, more load, relaxed thresholds
      responseTimeMultiplier: 1.2, // Allow 20% higher response times
      errorRateMultiplier: 1.3, // Allow 30% higher error rates
      throughputMultiplier: 0.85, // Expect 15% lower throughput per user
    },
    offSeason: {
      // Off season (Nov-Apr) - lower traffic, tighter performance expectations
      responseTimeMultiplier: 0.9, // Expect 10% better response times
      errorRateMultiplier: 0.8, // Expect 20% lower error rates
      throughputMultiplier: 1.1, // Expect 10% higher throughput per user
    },
  };

  // Regression detection thresholds
  private readonly regressionThresholds = {
    low: 0.1, // 10% degradation
    medium: 0.25, // 25% degradation
    high: 0.5, // 50% degradation
    critical: 1.0, // 100% degradation
  };

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Establishes a new performance baseline from test results
   */
  async establishBaseline(
    results: PerformanceTestResults,
  ): Promise<PerformanceBaseline> {
    try {
      // Create baselines for key metrics
      const metricsToBaseline = [
        { name: 'avg_response_time', value: results.avgResponseTime },
        { name: 'p95_response_time', value: results.p95ResponseTime },
        { name: 'p99_response_time', value: results.p99ResponseTime },
        { name: 'error_rate', value: results.errorRate },
        { name: 'throughput_rps', value: results.throughputRps },
      ];

      const baselines: PerformanceBaseline[] = [];

      for (const metric of metricsToBaseline) {
        // Determine seasonal baselines
        const peakSeasonBaseline = results.weddingSeason ? metric.value : null;
        const offSeasonBaseline = !results.weddingSeason ? metric.value : null;

        const { data, error } = await this.supabase
          .from('performance_baselines')
          .insert({
            test_type: results.testType,
            test_scenario: results.testScenario,
            metric_name: metric.name,
            user_type: results.userType,
            wedding_size_category: results.weddingSizeCategory,
            environment: results.environment,
            peak_season_baseline: peakSeasonBaseline,
            off_season_baseline: offSeasonBaseline,
            average_value: metric.value,
            median_value: metric.value,
            percentile_95: metric.name.includes('p95') ? metric.value : null,
            percentile_99: metric.name.includes('p99') ? metric.value : null,
            min_value: metric.value,
            max_value: metric.value,
            sample_count: 1,
            confidence_level: 50.0, // Low confidence with single sample
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to create baseline for ${metric.name}:`, error);
          continue;
        }

        baselines.push(data as PerformanceBaseline);
      }

      console.log(
        `Established ${baselines.length} performance baselines for ${results.testScenario}`,
      );

      // Return the primary metric baseline (avg_response_time)
      return (
        baselines.find((b) => b.metricName === 'avg_response_time') ||
        baselines[0]
      );
    } catch (error) {
      console.error('Error establishing baseline:', error);
      throw new Error(`Failed to establish baseline: ${error}`);
    }
  }

  /**
   * Compares current results against established baselines with seasonal context
   */
  async compareAgainstBaseline(
    results: PerformanceTestResults,
    metricName: string = 'avg_response_time',
  ): Promise<ComparisonResult | null> {
    try {
      const baseline = await this.getBaseline(
        results.testType,
        results.testScenario,
        results.userType,
        results.weddingSizeCategory,
        results.environment,
        results.weddingSeason,
        metricName,
      );

      if (!baseline) {
        return null;
      }

      // Get current value for the metric
      const currentValue = this.extractMetricValue(results, metricName);
      if (currentValue === null) {
        return null;
      }

      // Determine appropriate baseline value based on season
      let baselineValue: number;
      let seasonalNote: string;

      if (results.weddingSeason) {
        // Peak season - use peak baseline if available, otherwise use average with adjustment
        baselineValue =
          baseline.peakSeasonBaseline ||
          baseline.average_value *
            this.seasonalAdjustments.peakSeason.responseTimeMultiplier;
        seasonalNote = 'Using peak wedding season baseline (May-October)';
      } else {
        // Off season - use off-season baseline if available, otherwise use average with adjustment
        baselineValue =
          baseline.offSeasonBaseline ||
          baseline.average_value *
            this.seasonalAdjustments.offSeason.responseTimeMultiplier;
        seasonalNote = 'Using off-season baseline (November-April)';
      }

      // Calculate percentage difference
      const percentageDifference =
        ((currentValue - baselineValue) / baselineValue) * 100;

      // Determine if this is a regression
      const isRegression =
        percentageDifference > this.regressionThresholds.low * 100;

      // Determine regression severity
      let regressionSeverity: ComparisonResult['regressionSeverity'] = 'low';
      if (
        Math.abs(percentageDifference) >
        this.regressionThresholds.critical * 100
      ) {
        regressionSeverity = 'critical';
      } else if (
        Math.abs(percentageDifference) >
        this.regressionThresholds.high * 100
      ) {
        regressionSeverity = 'high';
      } else if (
        Math.abs(percentageDifference) >
        this.regressionThresholds.medium * 100
      ) {
        regressionSeverity = 'medium';
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        metricName,
        currentValue,
        baselineValue,
        percentageDifference,
        results.weddingSeason,
      );

      // Determine if within threshold
      const isWithinThreshold =
        Math.abs(percentageDifference) <= this.regressionThresholds.low * 100;

      return {
        baselineId: baseline.id,
        isRegression,
        regressionSeverity,
        metrics: [
          {
            metricName,
            currentValue,
            baselineValue,
            percentageDifference,
            isWithinThreshold,
          },
        ],
        recommendations,
        seasonalContext: {
          isPeakSeason: results.weddingSeason,
          seasonalAdjustment: results.weddingSeason
            ? this.seasonalAdjustments.peakSeason.responseTimeMultiplier
            : this.seasonalAdjustments.offSeason.responseTimeMultiplier,
          seasonalNote,
        },
      };
    } catch (error) {
      console.error('Error comparing against baseline:', error);
      return null;
    }
  }

  /**
   * Updates baseline with improved performance results
   */
  async updateBaseline(
    results: PerformanceTestResults,
  ): Promise<BaselineUpdateResult> {
    try {
      const metricsToUpdate = [
        { name: 'avg_response_time', value: results.avgResponseTime },
        { name: 'p95_response_time', value: results.p95ResponseTime },
        { name: 'error_rate', value: results.errorRate },
        { name: 'throughput_rps', value: results.throughputRps },
      ];

      let updated = false;
      let improvementDetected = false;
      let updateReason = '';

      for (const metric of metricsToUpdate) {
        const existingBaseline = await this.getBaseline(
          results.testType,
          results.testScenario,
          results.userType,
          results.weddingSizeCategory,
          results.environment,
          results.weddingSeason,
          metric.name,
        );

        if (!existingBaseline) {
          continue;
        }

        // Check if this is an improvement
        const isImprovement = this.isImprovement(
          metric.name,
          metric.value,
          existingBaseline.average_value,
        );

        if (isImprovement) {
          improvementDetected = true;
          updateReason = `Improved ${metric.name} performance detected`;

          // Update the baseline with new values
          const updatedValues = this.calculateUpdatedStatistics(
            existingBaseline,
            metric.value,
            results.weddingSeason,
          );

          const { error } = await this.supabase
            .from('performance_baselines')
            .update({
              ...updatedValues,
              last_updated: new Date().toISOString(),
              sample_count: existingBaseline.sample_count + 1,
            })
            .eq('id', existingBaseline.id);

          if (!error) {
            updated = true;
          }
        }
      }

      return {
        updated,
        improvementDetected,
        updateReason: updateReason || 'No improvements detected',
      };
    } catch (error) {
      console.error('Error updating baseline:', error);
      return {
        updated: false,
        improvementDetected: false,
        updateReason: `Update failed: ${error}`,
      };
    }
  }

  /**
   * Gets baseline for specific test configuration
   */
  async getBaseline(
    testType: string,
    testScenario: string,
    userType: string,
    weddingSizeCategory: string,
    environment: string,
    weddingSeason: boolean,
    metricName: string = 'avg_response_time',
  ): Promise<PerformanceBaseline | null> {
    try {
      const { data, error } = await this.supabase
        .from('performance_baselines')
        .select('*')
        .eq('test_type', testType)
        .eq('test_scenario', testScenario)
        .eq('metric_name', metricName)
        .eq('user_type', userType)
        .eq('wedding_size_category', weddingSizeCategory)
        .eq('environment', environment)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PerformanceBaseline;
    } catch (error) {
      console.error('Error getting baseline:', error);
      return null;
    }
  }

  /**
   * Gets all baselines for a test scenario
   */
  async getAllBaselines(
    testType: string,
    testScenario: string,
    environment: string = 'staging',
  ): Promise<PerformanceBaseline[]> {
    try {
      const { data, error } = await this.supabase
        .from('performance_baselines')
        .select('*')
        .eq('test_type', testType)
        .eq('test_scenario', testScenario)
        .eq('environment', environment)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all baselines:', error);
        return [];
      }

      return (data as PerformanceBaseline[]) || [];
    } catch (error) {
      console.error('Error getting all baselines:', error);
      return [];
    }
  }

  /**
   * Extracts metric value from test results
   */
  private extractMetricValue(
    results: PerformanceTestResults,
    metricName: string,
  ): number | null {
    switch (metricName) {
      case 'avg_response_time':
        return results.avgResponseTime;
      case 'p95_response_time':
        return results.p95ResponseTime;
      case 'p99_response_time':
        return results.p99ResponseTime;
      case 'error_rate':
        return results.errorRate;
      case 'throughput_rps':
        return results.throughputRps;
      default:
        return null;
    }
  }

  /**
   * Determines if a new metric value represents an improvement
   */
  private isImprovement(
    metricName: string,
    newValue: number,
    currentBaseline: number,
  ): boolean {
    switch (metricName) {
      case 'avg_response_time':
      case 'p95_response_time':
      case 'p99_response_time':
      case 'error_rate':
        // Lower is better for response times and error rates
        return newValue < currentBaseline * 0.95; // 5% improvement threshold
      case 'throughput_rps':
        // Higher is better for throughput
        return newValue > currentBaseline * 1.05; // 5% improvement threshold
      default:
        return false;
    }
  }

  /**
   * Calculates updated statistics when incorporating a new sample
   */
  private calculateUpdatedStatistics(
    existingBaseline: PerformanceBaseline,
    newValue: number,
    isPeakSeason: boolean,
  ) {
    const n = existingBaseline.sample_count;
    const oldMean = existingBaseline.average_value;

    // Calculate new average (running average)
    const newMean = (oldMean * n + newValue) / (n + 1);

    // Update min/max
    const newMin = Math.min(existingBaseline.min_value || newValue, newValue);
    const newMax = Math.max(existingBaseline.max_value || newValue, newValue);

    // Update seasonal baselines
    const updates: any = {
      average_value: newMean,
      min_value: newMin,
      max_value: newMax,
      // Increase confidence as we get more samples
      confidence_level: Math.min(95.0, 50.0 + n * 2),
    };

    if (isPeakSeason) {
      updates.peak_season_baseline = newMean;
    } else {
      updates.off_season_baseline = newMean;
    }

    return updates;
  }

  /**
   * Generates context-aware recommendations based on performance comparison
   */
  private generateRecommendations(
    metricName: string,
    currentValue: number,
    baselineValue: number,
    percentageDifference: number,
    isPeakSeason: boolean,
  ): string[] {
    const recommendations: string[] = [];
    const seasonContext = isPeakSeason ? 'peak wedding season' : 'off-season';

    if (percentageDifference > 50) {
      recommendations.push(
        `Critical performance degradation in ${metricName} during ${seasonContext}`,
      );

      switch (metricName) {
        case 'avg_response_time':
        case 'p95_response_time':
        case 'p99_response_time':
          recommendations.push(
            'Immediate investigation required: Check database queries, API endpoints, and server resources',
          );
          if (isPeakSeason) {
            recommendations.push(
              'Consider scaling infrastructure for peak wedding season traffic',
            );
          }
          break;
        case 'error_rate':
          recommendations.push(
            'High error rate detected: Review application logs and error tracking',
          );
          recommendations.push(
            'Check for failed API calls, database connection issues, or third-party service problems',
          );
          break;
        case 'throughput_rps':
          recommendations.push(
            'Low throughput detected: Review load balancer configuration and server capacity',
          );
          break;
      }
    } else if (percentageDifference > 25) {
      recommendations.push(
        `Significant performance regression in ${metricName} (${percentageDifference.toFixed(1)}% worse than baseline)`,
      );
      recommendations.push(
        'Monitor closely and consider optimization strategies',
      );
    } else if (percentageDifference > 10) {
      recommendations.push(
        `Minor performance regression in ${metricName} detected`,
      );
      if (isPeakSeason) {
        recommendations.push(
          'Performance degradation may be expected during peak wedding season but should be monitored',
        );
      }
    }

    // Wedding-specific recommendations
    if (isPeakSeason && percentageDifference > 15) {
      recommendations.push(
        'Peak wedding season detected: Consider wedding-specific optimizations:',
      );
      recommendations.push('- Pre-cache popular supplier searches');
      recommendations.push('- Optimize guest list import processes');
      recommendations.push('- Scale photo upload handling capacity');
    }

    if (!isPeakSeason && percentageDifference > 5) {
      recommendations.push(
        'Off-season performance regression: This is unexpected and should be investigated',
      );
      recommendations.push(
        '- Review recent deployments and configuration changes',
      );
      recommendations.push(
        '- Check for infrastructure issues or degraded external services',
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceBaselineManager = new PerformanceBaselineManager();
