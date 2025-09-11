/**
 * WS-155 Round 2: A/B Testing Integration
 * Team C - Advanced Integration Phase
 *
 * Provides A/B testing capabilities for communication optimization
 * with statistical analysis and automatic winner selection
 */

import { EventEmitter } from 'events';

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  type:
    | 'subject_line'
    | 'content'
    | 'send_time'
    | 'sender_name'
    | 'channel'
    | 'template';
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  targetAudience: {
    segmentId?: string;
    filters?: Record<string, any>;
    size: number;
  };
  variants: TestVariant[];
  metrics: TestMetrics;
  winner?: {
    variantId: string;
    declaredAt: Date;
    confidence: number;
    method: 'statistical' | 'manual' | 'automatic';
  };
  settings: {
    minSampleSize: number;
    confidenceLevel: number; // 0.90, 0.95, 0.99
    testDuration?: number; // hours
    autoSelectWinner: boolean;
    winnerCriteria:
      | 'open_rate'
      | 'click_rate'
      | 'conversion_rate'
      | 'composite';
  };
}

export interface TestVariant {
  id: string;
  name: string;
  description?: string;
  allocation: number; // percentage 0-100
  content: VariantContent;
  metrics: VariantMetrics;
  status: 'active' | 'inactive' | 'winner' | 'loser';
}

export interface VariantContent {
  subjectLine?: string;
  previewText?: string;
  senderName?: string;
  senderEmail?: string;
  bodyContent?: string;
  templateId?: string;
  sendTime?: Date;
  channel?: 'email' | 'sms' | 'both';
  customFields?: Record<string, any>;
}

export interface VariantMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  unsubscribed: number;
  complained: number;
  revenue: number;
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    conversionRate: number;
    unsubscribeRate: number;
  };
  confidence: {
    openRate: ConfidenceInterval;
    clickRate: ConfidenceInterval;
    conversionRate: ConfidenceInterval;
  };
}

export interface TestMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  statisticalSignificance: number;
  powerAnalysis: {
    currentPower: number;
    requiredSampleSize: number;
    estimatedTimeToSignificance: number; // hours
  };
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  mean: number;
  standardError: number;
}

export interface TestResult {
  testId: string;
  winner: TestVariant;
  loser: TestVariant;
  improvement: {
    metric: string;
    absolute: number;
    relative: number; // percentage
  };
  confidence: number;
  pValue: number;
  insights: string[];
  recommendations: string[];
}

export class ABTestingIntegrationService extends EventEmitter {
  private tests: Map<string, ABTestConfig> = new Map();
  private activeTests: Set<string> = new Set();
  private testHistory: Map<string, TestResult[]> = new Map();
  private evaluationTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startEvaluationCycle();
  }

  /**
   * Create a new A/B test
   */
  createTest(config: Omit<ABTestConfig, 'id' | 'metrics'>): ABTestConfig {
    const testId = this.generateTestId();

    // Validate variant allocations
    const totalAllocation = config.variants.reduce(
      (sum, v) => sum + v.allocation,
      0,
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(
        `Variant allocations must sum to 100%, got ${totalAllocation}%`,
      );
    }

    // Initialize metrics
    const test: ABTestConfig = {
      ...config,
      id: testId,
      metrics: {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalConverted: 0,
        totalRevenue: 0,
        statisticalSignificance: 0,
        powerAnalysis: {
          currentPower: 0,
          requiredSampleSize: this.calculateRequiredSampleSize(config.settings),
          estimatedTimeToSignificance: 0,
        },
      },
    };

    // Initialize variant metrics
    for (const variant of test.variants) {
      variant.metrics = this.initializeVariantMetrics();
    }

    this.tests.set(testId, test);
    this.emit('test:created', test);

    return test;
  }

  /**
   * Start an A/B test
   */
  startTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    if (test.status !== 'draft') {
      throw new Error(`Test ${testId} is not in draft status`);
    }

    test.status = 'running';
    test.startDate = new Date();
    this.activeTests.add(testId);

    this.emit('test:started', test);
  }

  /**
   * Record test event
   */
  recordEvent(
    testId: string,
    variantId: string,
    eventType:
      | 'sent'
      | 'delivered'
      | 'opened'
      | 'clicked'
      | 'converted'
      | 'unsubscribed'
      | 'complained',
    metadata?: {
      revenue?: number;
      guestId?: string;
      timestamp?: Date;
    },
  ): void {
    const test = this.tests.get(testId);
    if (!test) return;

    const variant = test.variants.find((v) => v.id === variantId);
    if (!variant) return;

    // Update variant metrics
    switch (eventType) {
      case 'sent':
        variant.metrics.sent++;
        test.metrics.totalSent++;
        break;
      case 'delivered':
        variant.metrics.delivered++;
        test.metrics.totalDelivered++;
        break;
      case 'opened':
        variant.metrics.opened++;
        test.metrics.totalOpened++;
        break;
      case 'clicked':
        variant.metrics.clicked++;
        test.metrics.totalClicked++;
        break;
      case 'converted':
        variant.metrics.converted++;
        test.metrics.totalConverted++;
        if (metadata?.revenue) {
          variant.metrics.revenue += metadata.revenue;
          test.metrics.totalRevenue += metadata.revenue;
        }
        break;
      case 'unsubscribed':
        variant.metrics.unsubscribed++;
        break;
      case 'complained':
        variant.metrics.complained++;
        break;
    }

    // Recalculate rates
    this.updateVariantRates(variant);

    // Check for statistical significance
    if (test.status === 'running') {
      this.evaluateTest(test);
    }

    this.emit('test:event', {
      testId,
      variantId,
      eventType,
      metadata,
    });
  }

  /**
   * Get test results
   */
  getTestResults(testId: string): TestResult | null {
    const test = this.tests.get(testId);
    if (!test || test.variants.length < 2) return null;

    // Sort variants by primary metric
    const sortedVariants = [...test.variants].sort((a, b) => {
      const metricA = this.getVariantScore(a, test.settings.winnerCriteria);
      const metricB = this.getVariantScore(b, test.settings.winnerCriteria);
      return metricB - metricA;
    });

    const winner = sortedVariants[0];
    const loser = sortedVariants[sortedVariants.length - 1];

    // Calculate improvement
    const winnerScore = this.getVariantScore(
      winner,
      test.settings.winnerCriteria,
    );
    const loserScore = this.getVariantScore(
      loser,
      test.settings.winnerCriteria,
    );
    const improvement = winnerScore - loserScore;
    const relativeImprovement =
      loserScore > 0 ? (improvement / loserScore) * 100 : 0;

    // Calculate statistical significance
    const { pValue, confidence } = this.calculateSignificance(
      winner,
      loser,
      test.settings.winnerCriteria,
    );

    const result: TestResult = {
      testId,
      winner,
      loser,
      improvement: {
        metric: test.settings.winnerCriteria,
        absolute: improvement,
        relative: relativeImprovement,
      },
      confidence,
      pValue,
      insights: this.generateInsights(test, winner, loser),
      recommendations: this.generateRecommendations(test, winner),
    };

    return result;
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests)
      .map((id) => this.tests.get(id))
      .filter(Boolean) as ABTestConfig[];
  }

  /**
   * Pause a test
   */
  pauseTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    test.status = 'paused';
    this.activeTests.delete(testId);

    this.emit('test:paused', test);
  }

  /**
   * Resume a test
   */
  resumeTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    test.status = 'running';
    this.activeTests.add(testId);

    this.emit('test:resumed', test);
  }

  /**
   * Complete a test
   */
  completeTest(testId: string, winnerId?: string): TestResult {
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    test.status = 'completed';
    test.endDate = new Date();
    this.activeTests.delete(testId);

    // Determine winner
    const result = this.getTestResults(testId);
    if (!result) throw new Error('Unable to determine test results');

    const actualWinnerId = winnerId || result.winner.id;
    const winner = test.variants.find((v) => v.id === actualWinnerId);

    if (winner) {
      test.winner = {
        variantId: winner.id,
        declaredAt: new Date(),
        confidence: result.confidence,
        method: winnerId ? 'manual' : 'automatic',
      };

      // Update variant statuses
      for (const variant of test.variants) {
        variant.status = variant.id === winner.id ? 'winner' : 'loser';
      }
    }

    // Store in history
    if (!this.testHistory.has(testId)) {
      this.testHistory.set(testId, []);
    }
    this.testHistory.get(testId)!.push(result);

    this.emit('test:completed', { test, result });

    return result;
  }

  /**
   * Calculate required sample size
   */
  private calculateRequiredSampleSize(
    settings: ABTestConfig['settings'],
  ): number {
    // Simplified sample size calculation
    // In production, would use proper statistical formulas
    const baseEffect = 0.05; // 5% minimum detectable effect
    const alpha = 1 - settings.confidenceLevel;
    const beta = 0.2; // 80% power

    // Using simplified formula for two-sample test
    const variance = 0.25; // p(1-p) maximum at p=0.5
    const zAlpha = this.getZScore(1 - alpha / 2);
    const zBeta = this.getZScore(1 - beta);

    const n =
      (2 * variance * Math.pow(zAlpha + zBeta, 2)) / Math.pow(baseEffect, 2);

    return Math.ceil(n * 2); // Total for both variants
  }

  /**
   * Update variant rates
   */
  private updateVariantRates(variant: TestVariant): void {
    const m = variant.metrics;

    m.rates.deliveryRate = m.sent > 0 ? m.delivered / m.sent : 0;
    m.rates.openRate = m.delivered > 0 ? m.opened / m.delivered : 0;
    m.rates.clickRate = m.delivered > 0 ? m.clicked / m.delivered : 0;
    m.rates.clickToOpenRate = m.opened > 0 ? m.clicked / m.opened : 0;
    m.rates.conversionRate = m.delivered > 0 ? m.converted / m.delivered : 0;
    m.rates.unsubscribeRate =
      m.delivered > 0 ? m.unsubscribed / m.delivered : 0;

    // Calculate confidence intervals
    m.confidence.openRate = this.calculateConfidenceInterval(
      m.opened,
      m.delivered,
    );
    m.confidence.clickRate = this.calculateConfidenceInterval(
      m.clicked,
      m.delivered,
    );
    m.confidence.conversionRate = this.calculateConfidenceInterval(
      m.converted,
      m.delivered,
    );
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(
    successes: number,
    trials: number,
  ): ConfidenceInterval {
    if (trials === 0) {
      return { lower: 0, upper: 0, mean: 0, standardError: 0 };
    }

    const p = successes / trials;
    const se = Math.sqrt((p * (1 - p)) / trials);
    const z = 1.96; // 95% confidence

    return {
      mean: p,
      standardError: se,
      lower: Math.max(0, p - z * se),
      upper: Math.min(1, p + z * se),
    };
  }

  /**
   * Get variant score based on criteria
   */
  private getVariantScore(variant: TestVariant, criteria: string): number {
    switch (criteria) {
      case 'open_rate':
        return variant.metrics.rates.openRate;
      case 'click_rate':
        return variant.metrics.rates.clickRate;
      case 'conversion_rate':
        return variant.metrics.rates.conversionRate;
      case 'composite':
        // Weighted composite score
        return (
          variant.metrics.rates.openRate * 0.3 +
          variant.metrics.rates.clickRate * 0.3 +
          variant.metrics.rates.conversionRate * 0.4
        );
      default:
        return 0;
    }
  }

  /**
   * Calculate statistical significance
   */
  private calculateSignificance(
    variantA: TestVariant,
    variantB: TestVariant,
    metric: string,
  ): { pValue: number; confidence: number } {
    // Simplified chi-square test
    const scoreA = this.getVariantScore(variantA, metric);
    const scoreB = this.getVariantScore(variantB, metric);
    const nA = variantA.metrics.delivered;
    const nB = variantB.metrics.delivered;

    if (nA === 0 || nB === 0) {
      return { pValue: 1, confidence: 0 };
    }

    // Pooled proportion
    const successA = Math.round(scoreA * nA);
    const successB = Math.round(scoreB * nB);
    const pooled = (successA + successB) / (nA + nB);

    // Standard error
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));

    // Z-score
    const z = se > 0 ? (scoreA - scoreB) / se : 0;

    // P-value (simplified)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const confidence = 1 - pValue;

    return { pValue, confidence };
  }

  /**
   * Evaluate test for auto-winner selection
   */
  private evaluateTest(test: ABTestConfig): void {
    if (!test.settings.autoSelectWinner) return;

    // Check sample size
    const totalSent = test.metrics.totalSent;
    if (totalSent < test.settings.minSampleSize) return;

    // Check duration if specified
    if (test.settings.testDuration) {
      const elapsed =
        (Date.now() - test.startDate.getTime()) / (1000 * 60 * 60);
      if (elapsed < test.settings.testDuration) return;
    }

    // Get current results
    const result = this.getTestResults(test.id);
    if (!result) return;

    // Check for statistical significance
    if (result.confidence >= test.settings.confidenceLevel) {
      this.completeTest(test.id, result.winner.id);
    }

    // Update power analysis
    test.metrics.statisticalSignificance = result.confidence;
    test.metrics.powerAnalysis.currentPower = this.calculatePower(test);
    test.metrics.powerAnalysis.estimatedTimeToSignificance =
      this.estimateTimeToSignificance(test);
  }

  /**
   * Calculate statistical power
   */
  private calculatePower(test: ABTestConfig): number {
    // Simplified power calculation
    const n = test.metrics.totalDelivered / test.variants.length;
    const requiredN =
      test.metrics.powerAnalysis.requiredSampleSize / test.variants.length;

    return Math.min(1, n / requiredN);
  }

  /**
   * Estimate time to statistical significance
   */
  private estimateTimeToSignificance(test: ABTestConfig): number {
    const currentRate =
      test.metrics.totalSent /
      ((Date.now() - test.startDate.getTime()) / (1000 * 60 * 60));

    const remainingSamples = Math.max(
      0,
      test.metrics.powerAnalysis.requiredSampleSize - test.metrics.totalSent,
    );

    return currentRate > 0 ? remainingSamples / currentRate : Infinity;
  }

  /**
   * Generate insights from test results
   */
  private generateInsights(
    test: ABTestConfig,
    winner: TestVariant,
    loser: TestVariant,
  ): string[] {
    const insights: string[] = [];

    // Performance insight
    const improvement =
      this.getVariantScore(winner, test.settings.winnerCriteria) -
      this.getVariantScore(loser, test.settings.winnerCriteria);
    const relativeImprovement =
      this.getVariantScore(loser, test.settings.winnerCriteria) > 0
        ? (improvement /
            this.getVariantScore(loser, test.settings.winnerCriteria)) *
          100
        : 0;

    insights.push(
      `${winner.name} outperformed ${loser.name} by ${relativeImprovement.toFixed(1)}%`,
    );

    // Content differences
    if (test.type === 'subject_line') {
      insights.push(
        'Subject line variations had significant impact on open rates',
      );
    }

    // Timing insights
    if (
      test.type === 'send_time' &&
      winner.content.sendTime &&
      loser.content.sendTime
    ) {
      const winnerHour = winner.content.sendTime.getHours();
      const loserHour = loser.content.sendTime.getHours();
      insights.push(
        `Sending at ${winnerHour}:00 performed better than ${loserHour}:00`,
      );
    }

    // Engagement patterns
    if (
      winner.metrics.rates.clickToOpenRate >
      loser.metrics.rates.clickToOpenRate * 1.2
    ) {
      insights.push(
        'Winner had significantly better content engagement after opening',
      );
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    test: ABTestConfig,
    winner: TestVariant,
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Use ${winner.name} approach for future campaigns`);

    if (test.type === 'subject_line' && winner.content.subjectLine) {
      const subjectLength = winner.content.subjectLine.length;
      if (subjectLength < 50) {
        recommendations.push('Continue using shorter subject lines');
      }
    }

    if (winner.metrics.rates.openRate > 0.3) {
      recommendations.push(
        'Current strategy achieving above-average open rates',
      );
    }

    if (winner.metrics.rates.unsubscribeRate > 0.01) {
      recommendations.push(
        'Monitor unsubscribe rates - consider content adjustments',
      );
    }

    return recommendations;
  }

  /**
   * Initialize variant metrics
   */
  private initializeVariantMetrics(): VariantMetrics {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      unsubscribed: 0,
      complained: 0,
      revenue: 0,
      rates: {
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
        conversionRate: 0,
        unsubscribeRate: 0,
      },
      confidence: {
        openRate: { lower: 0, upper: 0, mean: 0, standardError: 0 },
        clickRate: { lower: 0, upper: 0, mean: 0, standardError: 0 },
        conversionRate: { lower: 0, upper: 0, mean: 0, standardError: 0 },
      },
    };
  }

  /**
   * Start periodic evaluation cycle
   */
  private startEvaluationCycle(): void {
    this.evaluationTimer = setInterval(
      () => {
        for (const testId of this.activeTests) {
          const test = this.tests.get(testId);
          if (test && test.status === 'running') {
            this.evaluateTest(test);
          }
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidence: number): number {
    // Simplified Z-score lookup
    const scores: Record<string, number> = {
      '0.90': 1.645,
      '0.95': 1.96,
      '0.99': 2.576,
    };

    return scores[confidence.toFixed(2)] || 1.96;
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * z);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export test results
   */
  exportResults(testId: string, format: 'json' | 'csv' = 'json'): string {
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    const result = this.getTestResults(testId);

    const data = {
      test,
      result,
      exportedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertTestToCSV(test, result);
    }
  }

  /**
   * Convert test to CSV format
   */
  private convertTestToCSV(
    test: ABTestConfig,
    result: TestResult | null,
  ): string {
    const headers = [
      'Variant',
      'Sent',
      'Delivered',
      'Opened',
      'Clicked',
      'Converted',
      'Open Rate',
      'Click Rate',
    ];
    const rows = [headers.join(',')];

    for (const variant of test.variants) {
      rows.push(
        [
          variant.name,
          variant.metrics.sent,
          variant.metrics.delivered,
          variant.metrics.opened,
          variant.metrics.clicked,
          variant.metrics.converted,
          (variant.metrics.rates.openRate * 100).toFixed(2) + '%',
          (variant.metrics.rates.clickRate * 100).toFixed(2) + '%',
        ].join(','),
      );
    }

    if (result) {
      rows.push('');
      rows.push(`Winner,${result.winner.name}`);
      rows.push(`Improvement,${result.improvement.relative.toFixed(2)}%`);
      rows.push(`Confidence,${(result.confidence * 100).toFixed(2)}%`);
    }

    return rows.join('\n');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    this.tests.clear();
    this.activeTests.clear();
    this.testHistory.clear();
    this.removeAllListeners();
  }
}
