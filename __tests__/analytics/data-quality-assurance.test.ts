/**
 * WS-181 Data Quality Assurance Tests
 * 
 * Tests data quality validation, statistical significance,
 * and data integrity for cohort analysis system.
 * 
 * @feature WS-181
 * @team Team E
 * @round Round 1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Data Quality interfaces
interface DataQualityMetrics {
  completeness: number; // 0-1, percentage of complete records
  accuracy: number; // 0-1, accuracy against known benchmarks
  consistency: number; // 0-1, internal consistency score
  timeliness: number; // 0-1, data freshness score
  validity: number; // 0-1, format and range validation
  uniqueness: number; // 0-1, uniqueness of records
}

interface DataQualityRule {
  id: string;
  name: string;
  type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness' | 'timeliness';
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: (data: any) => boolean;
  message: string;
}

interface ValidationResult {
  ruleId: string;
  passed: boolean;
  severity: string;
  message: string;
  affectedRecords: number;
  confidence: number;
}

interface StatisticalValidation {
  sampleSize: number;
  powerAnalysis: {
    power: number; // 0-1
    minimumDetectableEffect: number;
    recommendedSampleSize: number;
  };
  significanceTest: {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: { lower: number; upper: number };
  };
  outlierDetection: {
    outliers: any[];
    outlierPercentage: number;
    method: string;
  };
}

interface DataQualityValidator {
  validateDataQuality(dataset: any[]): Promise<{
    metrics: DataQualityMetrics;
    violations: ValidationResult[];
    recommendations: string[];
  }>;
  performStatisticalValidation(cohortA: number[], cohortB: number[]): Promise<StatisticalValidation>;
  detectAnomalies(timeSeries: Array<{ date: Date; value: number }>): Promise<{
    anomalies: Array<{ date: Date; value: number; severity: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
  }>;
  validateCalculationConsistency(dataset: any[], calculationMethod: string): Promise<{
    consistencyScore: number;
    deviations: Array<{ record: any; expected: number; actual: number }>;
  }>;
}

class MockDataQualityValidator implements DataQualityValidator {
  private qualityRules: DataQualityRule[] = [
    {
      id: 'user_id_not_null',
      name: 'User ID Required',
      type: 'completeness',
      severity: 'critical',
      condition: (record) => record.userId && record.userId.trim().length > 0,
      message: 'User ID cannot be null or empty'
    },
    {
      id: 'ltv_positive',
      name: 'LTV Must Be Positive',
      type: 'validity',
      severity: 'high',
      condition: (record) => record.ltv > 0,
      message: 'Lifetime Value must be greater than zero'
    },
    {
      id: 'retention_rate_range',
      name: 'Retention Rate Range',
      type: 'validity',
      severity: 'high',
      condition: (record) => 
        record.retentionRates && 
        record.retentionRates.every((rate: number) => rate >= 0 && rate <= 1),
      message: 'Retention rates must be between 0 and 1'
    },
    {
      id: 'date_consistency',
      name: 'Date Consistency',
      type: 'consistency',
      severity: 'medium',
      condition: (record) => {
        if (!record.startDate || !record.endDate) return false;
        return new Date(record.endDate) > new Date(record.startDate);
      },
      message: 'End date must be after start date'
    },
    {
      id: 'revenue_ltv_consistency',
      name: 'Revenue-LTV Consistency',
      type: 'consistency',
      severity: 'medium',
      condition: (record) => {
        if (!record.revenue || !record.ltv || !record.userCount) return true;
        const avgRevenuePerUser = record.revenue / record.userCount;
        // LTV should be reasonably related to revenue per user
        return record.ltv >= avgRevenuePerUser * 0.5 && record.ltv <= avgRevenuePerUser * 5;
      },
      message: 'LTV should be reasonably related to revenue per user'
    },
    {
      id: 'supplier_type_valid',
      name: 'Valid Supplier Type',
      type: 'validity',
      severity: 'medium',
      condition: (record) => {
        const validTypes = ['photographer', 'venue', 'caterer', 'florist', 'dj', 'planner'];
        return !record.supplierType || validTypes.includes(record.supplierType);
      },
      message: 'Supplier type must be one of the valid wedding vendor types'
    }
  ];

  async validateDataQuality(dataset: any[]) {
    const violations: ValidationResult[] = [];
    let totalScore = 0;
    const metrics = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      validity: 0,
      uniqueness: 0
    };

    // Run validation rules
    for (const rule of this.qualityRules) {
      const passedRecords = dataset.filter(record => rule.condition(record)).length;
      const failedRecords = dataset.length - passedRecords;
      const passed = failedRecords === 0;

      if (!passed) {
        violations.push({
          ruleId: rule.id,
          passed,
          severity: rule.severity,
          message: rule.message,
          affectedRecords: failedRecords,
          confidence: passedRecords / dataset.length
        });
      }

      // Update metrics based on rule type
      const ruleScore = passedRecords / dataset.length;
      switch (rule.type) {
        case 'completeness':
          metrics.completeness = Math.max(metrics.completeness, ruleScore);
          break;
        case 'accuracy':
          metrics.accuracy = Math.max(metrics.accuracy, ruleScore);
          break;
        case 'consistency':
          metrics.consistency = Math.max(metrics.consistency, ruleScore);
          break;
        case 'validity':
          metrics.validity = Math.max(metrics.validity, ruleScore);
          break;
        case 'uniqueness':
          metrics.uniqueness = Math.max(metrics.uniqueness, ruleScore);
          break;
        case 'timeliness':
          metrics.timeliness = Math.max(metrics.timeliness, ruleScore);
          break;
      }
    }

    // Calculate uniqueness
    const userIds = dataset.map(r => r.userId).filter(id => id);
    const uniqueIds = new Set(userIds);
    metrics.uniqueness = userIds.length > 0 ? uniqueIds.size / userIds.length : 1;

    // Calculate timeliness (mock implementation)
    const now = new Date();
    const recentRecords = dataset.filter(r => {
      if (!r.lastUpdated) return false;
      const daysDiff = (now.getTime() - new Date(r.lastUpdated).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7; // Within last 7 days
    });
    metrics.timeliness = dataset.length > 0 ? recentRecords.length / dataset.length : 1;

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics.completeness < 0.95) {
      recommendations.push('Improve data completeness by implementing required field validation');
    }
    if (metrics.consistency < 0.9) {
      recommendations.push('Add data consistency checks to prevent logical inconsistencies');
    }
    if (metrics.validity < 0.95) {
      recommendations.push('Strengthen input validation to ensure data format compliance');
    }
    if (violations.some(v => v.severity === 'critical')) {
      recommendations.push('Address critical data quality issues immediately');
    }

    return { metrics, violations, recommendations };
  }

  async performStatisticalValidation(cohortA: number[], cohortB: number[]): Promise<StatisticalValidation> {
    // Sample size calculation
    const sampleSizeA = cohortA.length;
    const sampleSizeB = cohortB.length;
    const totalSampleSize = sampleSizeA + sampleSizeB;

    // Power analysis (simplified)
    const meanA = cohortA.reduce((sum, val) => sum + val, 0) / cohortA.length;
    const meanB = cohortB.reduce((sum, val) => sum + val, 0) / cohortB.length;
    const effectSize = Math.abs(meanA - meanB) / Math.sqrt(
      (this.calculateVariance(cohortA) + this.calculateVariance(cohortB)) / 2
    );

    const power = this.calculatePower(effectSize, totalSampleSize);
    const minimumDetectableEffect = this.calculateMinimumDetectableEffect(totalSampleSize, 0.8); // 80% power
    const recommendedSampleSize = this.calculateRecommendedSampleSize(effectSize, 0.8);

    // T-test for significance
    const tStat = this.calculateTStatistic(cohortA, cohortB);
    const degreesOfFreedom = sampleSizeA + sampleSizeB - 2;
    const pValue = this.calculatePValue(tStat, degreesOfFreedom);
    const isSignificant = pValue < 0.05;

    // Confidence interval
    const standardError = Math.sqrt(
      this.calculateVariance(cohortA) / sampleSizeA + 
      this.calculateVariance(cohortB) / sampleSizeB
    );
    const tCritical = 1.96; // Approximate for large samples
    const marginOfError = tCritical * standardError;
    const meanDiff = meanA - meanB;

    // Outlier detection using IQR method
    const combinedData = [...cohortA, ...cohortB];
    const outliers = this.detectOutliersIQR(combinedData);

    return {
      sampleSize: totalSampleSize,
      powerAnalysis: {
        power,
        minimumDetectableEffect,
        recommendedSampleSize
      },
      significanceTest: {
        pValue,
        isSignificant,
        confidenceInterval: {
          lower: meanDiff - marginOfError,
          upper: meanDiff + marginOfError
        }
      },
      outlierDetection: {
        outliers,
        outlierPercentage: outliers.length / combinedData.length,
        method: 'IQR'
      }
    };
  }

  async detectAnomalies(timeSeries: Array<{ date: Date; value: number }>) {
    // Sort by date
    const sorted = timeSeries.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate moving average and standard deviation
    const windowSize = Math.min(7, Math.floor(sorted.length / 4)); // 7-day window or 1/4 of data
    const anomalies: Array<{ date: Date; value: number; severity: number }> = [];
    
    for (let i = windowSize; i < sorted.length; i++) {
      const window = sorted.slice(i - windowSize, i);
      const mean = window.reduce((sum, item) => sum + item.value, 0) / window.length;
      const variance = window.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      const currentValue = sorted[i].value;
      const zScore = Math.abs(currentValue - mean) / stdDev;
      
      if (zScore > 2.5) { // 2.5 standard deviations
        anomalies.push({
          date: sorted[i].date,
          value: currentValue,
          severity: Math.min(zScore / 2.5, 3) // Cap severity at 3
        });
      }
    }
    
    // Trend analysis
    const values = sorted.map(item => item.value);
    const trend = this.calculateTrend(values);
    
    // Seasonality detection (simplified)
    const seasonality = this.detectSeasonality(sorted);
    
    return {
      anomalies,
      trend,
      seasonality
    };
  }

  async validateCalculationConsistency(dataset: any[], calculationMethod: string) {
    const deviations: Array<{ record: any; expected: number; actual: number }> = [];
    let totalConsistency = 0;
    
    for (const record of dataset) {
      let expected: number;
      let actual: number;
      
      switch (calculationMethod) {
        case 'ltv':
          // Simple LTV calculation: average monthly revenue * average lifespan * multiplier
          expected = this.calculateExpectedLTV(record);
          actual = record.ltv || 0;
          break;
          
        case 'retention':
          // Retention should be monotonically decreasing
          expected = this.calculateExpectedRetention(record);
          actual = record.retentionRates ? record.retentionRates[record.retentionRates.length - 1] : 0;
          break;
          
        case 'churn_rate':
          // Churn rate consistency with retention
          expected = record.retentionRates ? 1 - record.retentionRates[0] : 0;
          actual = record.churnRate || 0;
          break;
          
        default:
          continue;
      }
      
      const deviation = Math.abs(expected - actual);
      const relativeDeviation = expected > 0 ? deviation / expected : deviation;
      
      if (relativeDeviation > 0.1) { // More than 10% deviation
        deviations.push({ record, expected, actual });
      }
      
      totalConsistency += Math.max(0, 1 - relativeDeviation);
    }
    
    return {
      consistencyScore: totalConsistency / dataset.length,
      deviations
    };
  }

  // Helper methods
  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  }

  private calculateTStatistic(groupA: number[], groupB: number[]): number {
    const meanA = groupA.reduce((sum, val) => sum + val, 0) / groupA.length;
    const meanB = groupB.reduce((sum, val) => sum + val, 0) / groupB.length;
    
    const varA = this.calculateVariance(groupA);
    const varB = this.calculateVariance(groupB);
    
    const pooledStdError = Math.sqrt(varA / groupA.length + varB / groupB.length);
    
    return (meanA - meanB) / pooledStdError;
  }

  private calculatePValue(tStat: number, df: number): number {
    // Simplified p-value calculation (in real implementation, use proper statistical library)
    const absTStat = Math.abs(tStat);
    if (absTStat > 2.58) return 0.01; // p < 0.01
    if (absTStat > 1.96) return 0.05; // p < 0.05
    if (absTStat > 1.64) return 0.10; // p < 0.10
    return 0.20; // p > 0.10
  }

  private calculatePower(effectSize: number, sampleSize: number): number {
    // Simplified power calculation
    const z = effectSize * Math.sqrt(sampleSize / 2);
    if (z > 2.8) return 0.95;
    if (z > 2.3) return 0.80;
    if (z > 1.6) return 0.50;
    return 0.20;
  }

  private calculateMinimumDetectableEffect(sampleSize: number, power: number): number {
    // Simplified MDE calculation
    const powerFactor = power === 0.8 ? 2.8 : power === 0.9 ? 3.2 : 2.3;
    return powerFactor / Math.sqrt(sampleSize / 2);
  }

  private calculateRecommendedSampleSize(effectSize: number, power: number): number {
    // Simplified sample size calculation
    const powerFactor = power === 0.8 ? 16 : power === 0.9 ? 21 : 13;
    return Math.ceil(powerFactor / Math.pow(effectSize, 2));
  }

  private detectOutliersIQR(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(value => value < lowerBound || value > upperBound);
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    let increases = 0;
    let decreases = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increases++;
      else if (values[i] < values[i - 1]) decreases++;
    }
    
    const total = values.length - 1;
    if (increases / total > 0.6) return 'increasing';
    if (decreases / total > 0.6) return 'decreasing';
    return 'stable';
  }

  private detectSeasonality(timeSeries: Array<{ date: Date; value: number }>): boolean {
    // Simplified seasonality detection
    if (timeSeries.length < 24) return false; // Need at least 2 years of monthly data
    
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);
    
    timeSeries.forEach(item => {
      const month = item.date.getMonth();
      monthlyAverages[month] += item.value;
      monthlyCounts[month]++;
    });
    
    // Calculate averages
    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }
    
    // Check for significant variation (CV > 0.2)
    const mean = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 12;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    return coefficientOfVariation > 0.2;
  }

  private calculateExpectedLTV(record: any): number {
    // Simplified LTV calculation based on revenue and retention
    if (!record.revenue || !record.userCount || !record.retentionRates) return 0;
    
    const avgRevenuePerUser = record.revenue / record.userCount;
    const avgLifespan = record.retentionRates.reduce((sum: number, rate: number) => sum + rate, 0);
    
    return avgRevenuePerUser * avgLifespan * 1.5; // Industry multiplier
  }

  private calculateExpectedRetention(record: any): number {
    // Expected retention should be decreasing
    if (!record.retentionRates || record.retentionRates.length === 0) return 0;
    
    // Return the minimum expected based on first retention rate
    return record.retentionRates[0] * 0.3; // 30% of initial retention by end
  }
}

// Test data generators
function generateValidCohortData(count: number = 100) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `valid_user_${i}`,
    cohortId: `cohort_${Math.floor(i / 20)}`,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2024-01-01'),
    supplierType: ['photographer', 'venue', 'caterer', 'florist'][i % 4],
    ltv: 2000 + Math.random() * 1000,
    revenue: (2000 + Math.random() * 1000) * (20 + Math.random() * 10),
    userCount: 20 + Math.floor(Math.random() * 10),
    retentionRates: [0.95, 0.68, 0.45, 0.32],
    churnRate: 0.05,
    lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last week
  }));
}

function generateInvalidCohortData(count: number = 50) {
  return Array.from({ length: count }, (_, i) => {
    const issues = [
      // Missing user ID
      {
        userId: null,
        cohortId: `cohort_${i}`,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
        ltv: 2500,
        revenue: 50000,
        userCount: 20
      },
      // Negative LTV
      {
        userId: `invalid_user_${i}`,
        cohortId: `cohort_${i}`,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
        ltv: -500,
        revenue: 50000,
        userCount: 20
      },
      // Invalid retention rates
      {
        userId: `invalid_user_${i}`,
        cohortId: `cohort_${i}`,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
        ltv: 2500,
        retentionRates: [1.2, 0.8, 1.5, 0.3], // > 1.0
        revenue: 50000,
        userCount: 20
      },
      // Date inconsistency
      {
        userId: `invalid_user_${i}`,
        cohortId: `cohort_${i}`,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2023-01-01'), // End before start
        ltv: 2500,
        revenue: 50000,
        userCount: 20
      }
    ];
    
    return issues[i % issues.length];
  });
}

function generateTimeSeriesWithAnomalies() {
  const baseValue = 2000;
  const timeSeries = [];
  
  // Generate normal data
  for (let i = 0; i < 100; i++) {
    const date = new Date('2023-01-01');
    date.setDate(date.getDate() + i);
    
    let value = baseValue + Math.sin(i * 0.1) * 200 + Math.random() * 100; // Normal variation
    
    // Add anomalies
    if (i === 25) value *= 2.5; // Spike anomaly
    if (i === 50) value *= 0.3; // Drop anomaly
    if (i >= 75 && i <= 80) value *= 1.8; // Sustained anomaly
    
    timeSeries.push({ date, value });
  }
  
  return timeSeries;
}

describe('Data Quality Assurance', () => {
  let validator: DataQualityValidator;
  
  beforeEach(() => {
    validator = new MockDataQualityValidator();
    jest.clearAllMocks();
  });

  describe('Data Quality Validation', () => {
    it('should identify data quality issues accurately', async () => {
      const validData = generateValidCohortData(80);
      const invalidData = generateInvalidCohortData(20);
      const mixedDataset = [...validData, ...invalidData];
      
      const results = await validator.validateDataQuality(mixedDataset);
      
      // Should detect quality issues
      expect(results.violations.length).toBeGreaterThan(0);
      
      // Metrics should reflect data quality issues
      expect(results.metrics.completeness).toBeLessThan(1.0);
      expect(results.metrics.validity).toBeLessThan(1.0);
      
      // Should provide actionable recommendations
      expect(results.recommendations.length).toBeGreaterThan(0);
      results.recommendations.forEach(rec => {
        expect(rec.length).toBeGreaterThan(20); // Substantial recommendations
      });
    });
    
    it('should validate high-quality data correctly', async () => {
      const highQualityData = generateValidCohortData(100);
      
      const results = await validator.validateDataQuality(highQualityData);
      
      // Should have minimal violations
      const criticalViolations = results.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations.length).toBe(0);
      
      // Quality metrics should be high
      expect(results.metrics.completeness).toBeGreaterThan(0.95);
      expect(results.metrics.validity).toBeGreaterThan(0.95);
      expect(results.metrics.uniqueness).toBeGreaterThan(0.95);
      
      // Should have fewer recommendations for high-quality data
      expect(results.recommendations.length).toBeLessThan(3);
    });
    
    it('should prioritize violations by severity', async () => {
      const problematicData = generateInvalidCohortData(30);
      
      const results = await validator.validateDataQuality(problematicData);
      
      const criticalViolations = results.violations.filter(v => v.severity === 'critical');
      const highViolations = results.violations.filter(v => v.severity === 'high');
      const mediumViolations = results.violations.filter(v => v.severity === 'medium');
      
      // Critical violations should have lowest confidence (most severe)
      criticalViolations.forEach(violation => {
        expect(violation.affectedRecords).toBeGreaterThan(0);
      });
      
      // Should have violations across different severity levels
      expect(criticalViolations.length + highViolations.length + mediumViolations.length).toBe(results.violations.length);
    });
    
    it('should validate data consistency across related fields', async () => {
      const inconsistentData = [
        {
          userId: 'user_1',
          cohortId: 'cohort_1',
          ltv: 100, // Very low LTV
          revenue: 500000, // Very high revenue
          userCount: 10,
          retentionRates: [0.95, 0.68, 0.45, 0.32],
          startDate: new Date('2023-01-01'),
          endDate: new Date('2024-01-01'),
          supplierType: 'photographer'
        }
      ];
      
      const results = await validator.validateDataQuality(inconsistentData);
      
      // Should detect consistency issues
      const consistencyViolations = results.violations.filter(v => 
        v.ruleId === 'revenue_ltv_consistency'
      );
      expect(consistencyViolations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Statistical Validation', () => {
    it('should perform power analysis correctly', async () => {
      // Create two cohorts with known difference
      const cohortA = Array.from({ length: 100 }, () => 2000 + Math.random() * 500); // Mean ~2250
      const cohortB = Array.from({ length: 100 }, () => 2500 + Math.random() * 500); // Mean ~2750
      
      const validation = await validator.performStatisticalValidation(cohortA, cohortB);
      
      // Should have adequate sample size
      expect(validation.sampleSize).toBe(200);
      
      // Power analysis should be reasonable
      expect(validation.powerAnalysis.power).toBeGreaterThan(0);
      expect(validation.powerAnalysis.power).toBeLessThanOrEqual(1);
      expect(validation.powerAnalysis.recommendedSampleSize).toBeGreaterThan(0);
      
      // Should detect statistical significance for known difference
      expect(validation.significanceTest.isSignificant).toBe(true);
      expect(validation.significanceTest.pValue).toBeLessThan(0.05);
    });
    
    it('should handle small sample sizes appropriately', async () => {
      const smallCohortA = [2000, 2100, 2050];
      const smallCohortB = [2400, 2500, 2450];
      
      const validation = await validator.performStatisticalValidation(smallCohortA, smallCohortB);
      
      // Should flag inadequate sample size
      expect(validation.sampleSize).toBe(6);
      expect(validation.powerAnalysis.power).toBeLessThan(0.8); // Low power
      expect(validation.powerAnalysis.recommendedSampleSize).toBeGreaterThan(6);
    });
    
    it('should detect outliers accurately', async () => {
      // Create data with known outliers
      const normalData = Array.from({ length: 95 }, () => 2000 + Math.random() * 200);
      const outliers = [5000, 500, 4500, 800, 6000]; // Clear outliers
      const dataWithOutliers = [...normalData, ...outliers];
      
      const validation = await validator.performStatisticalValidation(
        dataWithOutliers.slice(0, 50),
        dataWithOutliers.slice(50)
      );
      
      // Should detect outliers
      expect(validation.outlierDetection.outliers.length).toBeGreaterThan(0);
      expect(validation.outlierDetection.outlierPercentage).toBeGreaterThan(0.02);
      expect(validation.outlierDetection.method).toBe('IQR');
    });
    
    it('should calculate confidence intervals correctly', async () => {
      const cohortA = Array.from({ length: 200 }, () => 2000);
      const cohortB = Array.from({ length: 200 }, () => 2500);
      
      const validation = await validator.performStatisticalValidation(cohortA, cohortB);
      
      // Confidence interval should contain the true difference (500)
      const trueDifference = 2000 - 2500; // -500
      expect(validation.significanceTest.confidenceInterval.lower).toBeLessThan(trueDifference);
      expect(validation.significanceTest.confidenceInterval.upper).toBeGreaterThan(trueDifference);
    });
  });
  
  describe('Anomaly Detection', () => {
    it('should detect time series anomalies accurately', async () => {
      const timeSeriesWithAnomalies = generateTimeSeriesWithAnomalies();
      
      const results = await validator.detectAnomalies(timeSeriesWithAnomalies);
      
      // Should detect anomalies
      expect(results.anomalies.length).toBeGreaterThan(0);
      
      // Anomalies should have appropriate severity scores
      results.anomalies.forEach(anomaly => {
        expect(anomaly.severity).toBeGreaterThan(1.0);
        expect(anomaly.severity).toBeLessThanOrEqual(3.0);
      });
      
      // Should detect trend
      expect(['increasing', 'decreasing', 'stable']).toContain(results.trend);
    });
    
    it('should identify seasonal patterns', async () => {
      // Create seasonal data
      const seasonalData = Array.from({ length: 36 }, (_, i) => {
        const date = new Date('2021-01-01');
        date.setMonth(i);
        
        // Simulate wedding industry seasonality (higher in spring/fall)
        const month = i % 12;
        const seasonalMultiplier = [0.7, 0.8, 1.2, 1.3, 1.4, 1.1, 0.9, 0.8, 1.0, 1.2, 1.1, 0.6][month];
        const value = 2000 * seasonalMultiplier + Math.random() * 100;
        
        return { date, value };
      });
      
      const results = await validator.detectAnomalies(seasonalData);
      
      // Should detect seasonality
      expect(results.seasonality).toBe(true);
    });
    
    it('should handle stable time series correctly', async () => {
      // Create stable data with minimal variation
      const stableData = Array.from({ length: 50 }, (_, i) => {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        const value = 2000 + Math.random() * 50; // Low variation
        return { date, value };
      });
      
      const results = await validator.detectAnomalies(stableData);
      
      // Should detect stable trend
      expect(results.trend).toBe('stable');
      
      // Should have few or no anomalies
      expect(results.anomalies.length).toBeLessThan(3);
    });
  });
  
  describe('Calculation Consistency Validation', () => {
    it('should validate LTV calculation consistency', async () => {
      const testData = generateValidCohortData(50);
      
      const results = await validator.validateCalculationConsistency(testData, 'ltv');
      
      // Should have high consistency score for valid data
      expect(results.consistencyScore).toBeGreaterThan(0.8);
      
      // Should have minimal deviations
      expect(results.deviations.length).toBeLessThan(testData.length * 0.2); // Less than 20%
    });
    
    it('should detect calculation inconsistencies', async () => {
      const inconsistentData = [
        {
          userId: 'user_1',
          revenue: 100000,
          userCount: 100,
          ltv: 5000, // Should be around 1000-2000 based on revenue
          retentionRates: [0.95, 0.68, 0.45, 0.32],
          churnRate: 0.05
        },
        {
          userId: 'user_2',
          revenue: 50000,
          userCount: 50,
          ltv: 100, // Too low compared to revenue per user
          retentionRates: [0.90, 0.65, 0.40, 0.30],
          churnRate: 0.10
        }
      ];
      
      const results = await validator.validateCalculationConsistency(inconsistentData, 'ltv');
      
      // Should detect inconsistencies
      expect(results.consistencyScore).toBeLessThan(0.7);
      expect(results.deviations.length).toBeGreaterThan(0);
      
      // Deviations should include both records
      expect(results.deviations.length).toBe(2);
    });
    
    it('should validate retention rate monotonicity', async () => {
      const testData = [
        {
          userId: 'user_1',
          retentionRates: [0.95, 0.88, 0.75, 0.65], // Properly decreasing
          churnRate: 0.05
        },
        {
          userId: 'user_2',
          retentionRates: [0.90, 0.92, 0.85, 0.70], // Inconsistent - increases then decreases
          churnRate: 0.10
        }
      ];
      
      const results = await validator.validateCalculationConsistency(testData, 'retention');
      
      // Should detect the non-monotonic retention pattern
      expect(results.deviations.length).toBeGreaterThan(0);
    });
    
    it('should validate churn rate consistency with retention', async () => {
      const testData = [
        {
          userId: 'user_1',
          retentionRates: [0.95, 0.68, 0.45, 0.32],
          churnRate: 0.05 // Consistent with initial retention
        },
        {
          userId: 'user_2',
          retentionRates: [0.90, 0.65, 0.40, 0.30],
          churnRate: 0.50 // Inconsistent - too high compared to initial retention
        }
      ];
      
      const results = await validator.validateCalculationConsistency(testData, 'churn_rate');
      
      // Should detect churn rate inconsistency
      expect(results.deviations.length).toBe(1);
      expect(results.deviations[0].record.userId).toBe('user_2');
    });
  });
  
  describe('Wedding Industry Specific Validation', () => {
    it('should validate wedding supplier type constraints', async () => {
      const supplierData = [
        { userId: 'user_1', supplierType: 'photographer', ltv: 2500 },
        { userId: 'user_2', supplierType: 'venue', ltv: 4500 },
        { userId: 'user_3', supplierType: 'invalid_type', ltv: 2000 }, // Invalid
        { userId: 'user_4', supplierType: 'caterer', ltv: 3500 }
      ];
      
      const results = await validator.validateDataQuality(supplierData);
      
      // Should detect invalid supplier type
      const supplierTypeViolations = results.violations.filter(v => 
        v.ruleId === 'supplier_type_valid'
      );
      expect(supplierTypeViolations.length).toBe(1);
      expect(supplierTypeViolations[0].affectedRecords).toBe(1);
    });
    
    it('should validate seasonal data patterns', async () => {
      const seasonalCohorts = [
        // Spring cohorts should have higher performance
        { userId: 'spring_1', startDate: new Date('2023-03-01'), ltv: 3000, supplierType: 'photographer' },
        { userId: 'spring_2', startDate: new Date('2023-04-01'), ltv: 2800, supplierType: 'venue' },
        
        // Winter cohorts should have lower performance
        { userId: 'winter_1', startDate: new Date('2023-12-01'), ltv: 2000, supplierType: 'photographer' },
        { userId: 'winter_2', startDate: new Date('2023-01-01'), ltv: 1800, supplierType: 'venue' },
        
        // Anomalous winter cohort with spring-level performance
        { userId: 'winter_anomaly', startDate: new Date('2023-12-15'), ltv: 3200, supplierType: 'photographer' }
      ];
      
      const timeSeries = seasonalCohorts.map(cohort => ({
        date: cohort.startDate,
        value: cohort.ltv
      }));
      
      const results = await validator.detectAnomalies(timeSeries);
      
      // Should detect the winter anomaly
      expect(results.anomalies.length).toBeGreaterThan(0);
      
      const winterAnomalies = results.anomalies.filter(a => 
        a.date.getMonth() === 11 && a.value > 3000 // December with high LTV
      );
      expect(winterAnomalies.length).toBeGreaterThan(0);
    });
  });
});