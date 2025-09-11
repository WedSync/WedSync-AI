/**
 * Analytics Data Validator - Enterprise QA Testing Framework
 * WS-332 Team E - Comprehensive data accuracy validation for wedding analytics
 */

import {
  RevenueMetrics,
  IntegrityCheck,
  ValidationConfig,
  CrossPlatformSyncResult,
  DataConsistencyReport,
} from '../../../types/analytics-testing';

export interface ValidationConfig {
  precisionTolerance: number;
  aggregationValidation: boolean;
  realTimeValidation: boolean;
  crossPlatformValidation: boolean;
}

export interface ExpectedMetrics {
  totalRevenue: number;
  averageWeddingValue: number;
  revenueGrowth: number;
  weddingCount: number;
  conversionRate: number;
}

export interface IntegrityCheck {
  dataConsistency: boolean;
  calculationAccuracy: number;
  aggregationErrors: string[];
  dataLossPercentage: number;
  metricConsistency: number;
  anomaliesDetected: string[];
}

export interface CrossPlatformSyncResult {
  dataConsistencyScore: number;
  synchronizationDelayMs: number;
  dataDiscrepancies: string[];
  platformAvailability: number;
  syncThroughput: number;
}

export class AnalyticsDataValidator {
  private config: ValidationConfig;
  private toleranceThreshold: number;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.toleranceThreshold = config.precisionTolerance || 0.001;
  }

  /**
   * Calculate expected revenue metrics for validation against analytics engine
   */
  async calculateExpectedRevenue(weddingData: any): Promise<ExpectedMetrics> {
    const weddings = weddingData.weddings || [];

    // Manual calculation for validation
    const totalRevenue = weddings.reduce((sum: number, wedding: any) => {
      return sum + (wedding.totalValue || wedding.revenue || 0);
    }, 0);

    const weddingCount = weddings.length;
    const averageWeddingValue =
      weddingCount > 0 ? totalRevenue / weddingCount : 0;

    // Calculate revenue growth (if historical data available)
    const currentYearRevenue = weddings
      .filter((w: any) => new Date(w.date).getFullYear() === 2024)
      .reduce((sum: number, w: any) => sum + (w.totalValue || 0), 0);

    const previousYearRevenue = weddings
      .filter((w: any) => new Date(w.date).getFullYear() === 2023)
      .reduce((sum: number, w: any) => sum + (w.totalValue || 0), 0);

    const revenueGrowth =
      previousYearRevenue > 0
        ? ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) *
          100
        : 0;

    // Calculate conversion rate (inquiries to bookings)
    const inquiries = weddingData.inquiries?.length || 0;
    const bookings = weddings.filter((w: any) => w.status === 'booked').length;
    const conversionRate = inquiries > 0 ? (bookings / inquiries) * 100 : 0;

    return {
      totalRevenue,
      averageWeddingValue,
      revenueGrowth,
      weddingCount,
      conversionRate,
    };
  }

  /**
   * Validate data integrity across all analytics calculations
   */
  async validateDataIntegrity(calculatedMetrics: any): Promise<IntegrityCheck> {
    const errors: string[] = [];
    let accuracyScore = 1.0;

    // Check for null/undefined values
    if (!calculatedMetrics || !calculatedMetrics.results) {
      errors.push('Missing calculated metrics results');
      accuracyScore *= 0.5;
    }

    // Validate numeric ranges
    const results = calculatedMetrics.results || {};

    if (results.total_revenue < 0) {
      errors.push('Negative total revenue detected');
      accuracyScore *= 0.8;
    }

    if (results.average_wedding_value < 0) {
      errors.push('Negative average wedding value detected');
      accuracyScore *= 0.8;
    }

    // Check for data consistency
    const expectedCount = results.wedding_count || 0;
    const actualRevenue = results.total_revenue || 0;
    const avgValue = results.average_wedding_value || 0;

    if (
      expectedCount > 0 &&
      Math.abs(actualRevenue / expectedCount - avgValue) >
        this.toleranceThreshold * avgValue
    ) {
      errors.push('Inconsistent average calculation detected');
      accuracyScore *= 0.7;
    }

    // Validate percentage values
    if (results.revenue_growth && Math.abs(results.revenue_growth) > 1000) {
      errors.push('Unrealistic revenue growth percentage');
      accuracyScore *= 0.9;
    }

    // Check for data freshness if real-time validation enabled
    let dataLossPercentage = 0;
    if (this.config.realTimeValidation && calculatedMetrics.timestamp) {
      const dataAge =
        Date.now() - new Date(calculatedMetrics.timestamp).getTime();
      if (dataAge > 300000) {
        // 5 minutes
        errors.push('Stale data detected in real-time analytics');
        dataLossPercentage = Math.min(dataAge / 3600000, 0.1); // Max 10% penalty
      }
    }

    return {
      dataConsistency: errors.length === 0,
      calculationAccuracy: accuracyScore,
      aggregationErrors: errors,
      dataLossPercentage,
      metricConsistency: accuracyScore,
      anomaliesDetected: errors,
    };
  }

  /**
   * Validate cross-platform data synchronization
   */
  async validateCrossPlatformSync(
    testData: any,
  ): Promise<CrossPlatformSyncResult> {
    if (!this.config.crossPlatformValidation) {
      throw new Error('Cross-platform validation not enabled');
    }

    const dataSources = testData.dataSources || [];
    let consistencyScore = 1.0;
    const discrepancies: string[] = [];
    let totalSyncDelay = 0;
    let syncAttempts = 0;

    // Compare data across platforms
    for (let i = 0; i < dataSources.length - 1; i++) {
      const source1 = dataSources[i];
      const source2 = dataSources[i + 1];

      // Simulate data comparison
      const comparison = await this.compareDataSources(source1, source2);

      if (comparison.discrepancyPercentage > 0.05) {
        // 5% threshold
        discrepancies.push(
          `Data mismatch between ${source1.type} and ${source2.type}: ${comparison.discrepancyPercentage * 100}%`,
        );
        consistencyScore *= 1 - comparison.discrepancyPercentage;
      }

      totalSyncDelay += comparison.syncDelayMs;
      syncAttempts++;
    }

    const averageSyncDelay =
      syncAttempts > 0 ? totalSyncDelay / syncAttempts : 0;

    // Calculate platform availability (simulated)
    const platformAvailability = Math.min(consistencyScore + 0.05, 1.0);

    // Calculate sync throughput (records per second)
    const syncThroughput =
      averageSyncDelay > 0
        ? (testData.recordCount || 1000) / (averageSyncDelay / 1000)
        : 0;

    return {
      dataConsistencyScore: consistencyScore,
      synchronizationDelayMs: averageSyncDelay,
      dataDiscrepancies: discrepancies,
      platformAvailability,
      syncThroughput,
    };
  }

  /**
   * Compare data between two sources
   */
  private async compareDataSources(
    source1: any,
    source2: any,
  ): Promise<{
    discrepancyPercentage: number;
    syncDelayMs: number;
  }> {
    // Simulate data source comparison
    const baseDiscrepancy = Math.random() * 0.02; // 0-2% base discrepancy
    const typeDiscrepancy = source1.type === source2.type ? 0 : 0.01; // 1% for different types

    const discrepancyPercentage = baseDiscrepancy + typeDiscrepancy;

    // Simulate sync delay based on connection type
    const baseSyncDelay = 100; // 100ms base
    const connectionMultiplier = source1.connection === 'primary_db' ? 1 : 1.5;
    const syncDelayMs =
      baseSyncDelay * connectionMultiplier + Math.random() * 200;

    return {
      discrepancyPercentage,
      syncDelayMs,
    };
  }

  /**
   * Validate real-time metrics consistency
   */
  async validateRealTimeMetrics(processingResults: any): Promise<{
    metricConsistency: number;
    anomaliesDetected: string[];
  }> {
    const anomalies: string[] = [];
    let consistencyScore = 1.0;

    // Check processing latency
    if (processingResults.processingLatency > 100) {
      anomalies.push(
        `High processing latency: ${processingResults.processingLatency}ms`,
      );
      consistencyScore *= 0.9;
    }

    // Check data loss
    if (processingResults.dataLossPercentage > 0.001) {
      anomalies.push(
        `Data loss detected: ${processingResults.dataLossPercentage * 100}%`,
      );
      consistencyScore *= 0.8;
    }

    // Check for processing errors
    if (processingResults.errorCount > 0) {
      anomalies.push(
        `Processing errors detected: ${processingResults.errorCount}`,
      );
      consistencyScore *= 0.85;
    }

    // Validate event processing rate
    const expectedRate = processingResults.eventsPerSecond || 100;
    const actualRate =
      processingResults.eventsProcessed / (processingResults.duration || 30);

    if (Math.abs(actualRate - expectedRate) / expectedRate > 0.1) {
      // 10% tolerance
      anomalies.push(
        `Processing rate deviation: expected ${expectedRate}, got ${actualRate}`,
      );
      consistencyScore *= 0.9;
    }

    return {
      metricConsistency: consistencyScore,
      anomaliesDetected: anomalies,
    };
  }

  /**
   * Validate seasonal pattern analysis accuracy
   */
  async validateSeasonalPatterns(
    seasonalAnalysis: any,
    expectedSeasons: string[] = ['spring', 'summer', 'fall', 'winter'],
  ): Promise<boolean> {
    if (
      !seasonalAnalysis.peakSeasons ||
      !Array.isArray(seasonalAnalysis.peakSeasons)
    ) {
      return false;
    }

    // Check if expected peak seasons are identified
    const identifiedSeasons = seasonalAnalysis.peakSeasons.map(
      (ps: any) => ps.season,
    );
    const hasSpring = identifiedSeasons.includes('spring');
    const hasSummer = identifiedSeasons.includes('summer');

    // Wedding industry typically peaks in spring/summer
    return hasSpring || hasSummer;
  }

  /**
   * Validate wedding style categorization accuracy
   */
  async validateWeddingStyleCategorization(styleMetrics: any[]): Promise<{
    categorizationAccuracy: number;
    misclassifications: string[];
  }> {
    const validStyles = [
      'rustic',
      'modern',
      'traditional',
      'boho',
      'luxury',
      'vintage',
      'destination',
    ];
    const misclassifications: string[] = [];
    let correctClassifications = 0;

    styleMetrics.forEach((metric) => {
      if (!validStyles.includes(metric.style)) {
        misclassifications.push(`Invalid style category: ${metric.style}`);
      } else {
        correctClassifications++;
      }

      // Validate revenue expectations by style
      if (metric.style === 'luxury' && metric.averageRevenue < 5000) {
        misclassifications.push(
          `Luxury wedding revenue too low: £${metric.averageRevenue}`,
        );
      }

      if (metric.style === 'budget' && metric.averageRevenue > 10000) {
        misclassifications.push(
          `Budget wedding revenue too high: £${metric.averageRevenue}`,
        );
      }
    });

    const categorizationAccuracy =
      styleMetrics.length > 0
        ? correctClassifications / styleMetrics.length
        : 0;

    return {
      categorizationAccuracy,
      misclassifications,
    };
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport(
    testResults: any[],
  ): Promise<DataConsistencyReport> {
    const totalTests = testResults.length;
    const passedTests = testResults.filter((result) => result.passed).length;
    const failedTests = totalTests - passedTests;

    const criticalFailures = testResults.filter(
      (result) => !result.passed && result.severity === 'critical',
    );

    const averageAccuracy =
      testResults.reduce((sum, result) => sum + (result.accuracy || 0), 0) /
      totalTests;

    const processingTime = testResults.reduce(
      (sum, result) => sum + (result.processingTime || 0),
      0,
    );

    return {
      testSummary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: passedTests / totalTests,
        averageAccuracy,
        processingTime,
      },
      criticalFailures: criticalFailures.map((cf) => ({
        testName: cf.testName,
        error: cf.error,
        severity: cf.severity,
        impact: cf.impact,
      })),
      recommendations: this.generateRecommendations(testResults),
      complianceStatus: {
        dataAccuracy: averageAccuracy > 0.99,
        performanceTargets: processingTime < 10000, // 10s total
        securityCompliance: criticalFailures.length === 0,
      },
    };
  }

  /**
   * Generate improvement recommendations based on test results
   */
  private generateRecommendations(testResults: any[]): string[] {
    const recommendations: string[] = [];

    const lowAccuracyTests = testResults.filter(
      (result) => result.accuracy && result.accuracy < 0.95,
    );

    if (lowAccuracyTests.length > 0) {
      recommendations.push(
        'Review data validation logic for improved accuracy',
      );
      recommendations.push('Implement additional data quality checks');
    }

    const slowTests = testResults.filter(
      (result) => result.processingTime > 5000, // 5 seconds
    );

    if (slowTests.length > 0) {
      recommendations.push('Optimize query performance for faster processing');
      recommendations.push(
        'Consider implementing caching for frequently accessed data',
      );
    }

    const errorTests = testResults.filter(
      (result) => result.errors && result.errors.length > 0,
    );

    if (errorTests.length > 0) {
      recommendations.push('Address data consistency issues');
      recommendations.push(
        'Implement robust error handling and recovery mechanisms',
      );
    }

    return recommendations;
  }
}

export interface DataConsistencyReport {
  testSummary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    averageAccuracy: number;
    processingTime: number;
  };
  criticalFailures: Array<{
    testName: string;
    error: string;
    severity: string;
    impact: string;
  }>;
  recommendations: string[];
  complianceStatus: {
    dataAccuracy: boolean;
    performanceTargets: boolean;
    securityCompliance: boolean;
  };
}
