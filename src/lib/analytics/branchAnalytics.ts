/**
 * Branch Analytics System for Journey Conditional Logic
 * Tracks performance, conversion rates, and A/B test results
 */

export interface BranchExecution {
  id: string;
  branchId: string;
  journeyId: string;
  instanceId: string;
  userId: string;
  executionTime: number;
  result: boolean;
  pathTaken: string;
  conditions: {
    total: number;
    evaluated: number;
    passed: number;
  };
  abTest?: {
    enabled: boolean;
    variant?: string;
    splitPercentage: number;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BranchPerformanceMetrics {
  branchId: string;
  branchName: string;
  totalExecutions: number;
  averageExecutionTime: number;
  truePathCount: number;
  falsePathCount: number;
  truePathPercentage: number;
  falsePathPercentage: number;
  conversionRate?: number;
  abTestResults?: ABTestResults;
  performanceStats: {
    p50: number;
    p95: number;
    p99: number;
    maxExecutionTime: number;
    minExecutionTime: number;
  };
}

export interface ABTestResults {
  enabled: boolean;
  splitPercentage: number;
  variants: VariantPerformance[];
  confidence: number;
  winner?: string;
  significance: number;
}

export interface VariantPerformance {
  variantId: string;
  variantName: string;
  executions: number;
  conversions: number;
  conversionRate: number;
  averageValue?: number;
  confidence: number;
}

export interface ConversionEvent {
  id: string;
  executionId: string;
  branchId: string;
  journeyId: string;
  userId: string;
  eventType: string;
  eventValue?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BranchAnalyticsQuery {
  branchIds?: string[];
  journeyIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userSegments?: string[];
  conversionGoals?: string[];
  includeABTests?: boolean;
}

export class BranchAnalytics {
  private executions: Map<string, BranchExecution> = new Map();
  private conversions: Map<string, ConversionEvent> = new Map();
  private performanceCache: Map<string, BranchPerformanceMetrics> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Record a branch execution
   */
  recordExecution(execution: BranchExecution): void {
    this.executions.set(execution.id, execution);

    // Invalidate performance cache for this branch
    this.invalidateCache(execution.branchId);

    // Emit analytics event (would integrate with your analytics service)
    this.emitAnalyticsEvent('branch_execution', execution);
  }

  /**
   * Record a conversion event
   */
  recordConversion(conversion: ConversionEvent): void {
    this.conversions.set(conversion.id, conversion);

    // Invalidate cache for related branch
    this.invalidateCache(conversion.branchId);

    // Emit analytics event
    this.emitAnalyticsEvent('branch_conversion', conversion);
  }

  /**
   * Get performance metrics for a branch
   */
  getBranchMetrics(branchId: string): BranchPerformanceMetrics | null {
    const cacheKey = `metrics_${branchId}`;

    if (this.isCacheValid(cacheKey)) {
      return this.performanceCache.get(cacheKey) || null;
    }

    const metrics = this.calculateBranchMetrics(branchId);
    if (metrics) {
      this.setCache(cacheKey, metrics);
    }

    return metrics;
  }

  /**
   * Get analytics for multiple branches
   */
  getAnalytics(query: BranchAnalyticsQuery): {
    branches: BranchPerformanceMetrics[];
    summary: {
      totalExecutions: number;
      averageExecutionTime: number;
      overallConversionRate: number;
      activeABTests: number;
    };
  } {
    const filteredExecutions = this.filterExecutions(query);
    const branchIds = query.branchIds || [
      ...new Set(filteredExecutions.map((e) => e.branchId)),
    ];

    const branches = branchIds
      .map((branchId) => this.getBranchMetrics(branchId))
      .filter(Boolean) as BranchPerformanceMetrics[];

    const summary = this.calculateSummaryStats(filteredExecutions);

    return { branches, summary };
  }

  /**
   * Get A/B test results
   */
  getABTestResults(branchId: string): ABTestResults | null {
    const executions = Array.from(this.executions.values()).filter(
      (e) => e.branchId === branchId && e.abTest?.enabled,
    );

    if (executions.length === 0) {
      return null;
    }

    const variants = this.groupByVariant(executions);
    const variantPerformance = Object.entries(variants).map(
      ([variantId, execs]) =>
        this.calculateVariantPerformance(variantId, execs),
    );

    const { confidence, winner, significance } =
      this.calculateStatisticalSignificance(variantPerformance);

    return {
      enabled: true,
      splitPercentage: executions[0]?.abTest?.splitPercentage || 0,
      variants: variantPerformance,
      confidence,
      winner,
      significance,
    };
  }

  /**
   * Get conversion funnel for a journey
   */
  getConversionFunnel(journeyId: string): {
    steps: Array<{
      branchId: string;
      branchName: string;
      entries: number;
      conversions: number;
      conversionRate: number;
      dropOffRate: number;
    }>;
    overallConversion: number;
  } {
    const journeyExecutions = Array.from(this.executions.values())
      .filter((e) => e.journeyId === journeyId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const branchSteps = this.groupExecutionsByBranch(journeyExecutions);
    const steps = Object.entries(branchSteps).map(([branchId, executions]) => {
      const conversions = this.getBranchConversions(branchId);
      const conversionRate =
        executions.length > 0 ? conversions.length / executions.length : 0;

      return {
        branchId,
        branchName: `Branch ${branchId}`,
        entries: executions.length,
        conversions: conversions.length,
        conversionRate,
        dropOffRate: 1 - conversionRate,
      };
    });

    const totalEntries = journeyExecutions.length;
    const totalConversions = Array.from(this.conversions.values()).filter(
      (c) => c.journeyId === journeyId,
    ).length;
    const overallConversion =
      totalEntries > 0 ? totalConversions / totalEntries : 0;

    return { steps, overallConversion };
  }

  /**
   * Generate performance insights
   */
  generateInsights(branchId: string): {
    performance: string[];
    optimization: string[];
    abTest: string[];
  } {
    const metrics = this.getBranchMetrics(branchId);
    const abTestResults = this.getABTestResults(branchId);

    const insights = {
      performance: [],
      optimization: [],
      abTest: [],
    };

    if (!metrics) return insights;

    // Performance insights
    if (metrics.averageExecutionTime > 5) {
      insights.performance.push(
        'Branch execution time is above optimal threshold (>5ms)',
      );
    }

    if (metrics.performanceStats.p99 > 10) {
      insights.performance.push(
        '99th percentile execution time exceeds 10ms - investigate slow conditions',
      );
    }

    // Optimization insights
    if (metrics.truePathPercentage > 80) {
      insights.optimization.push(
        'True path heavily favored - consider adjusting conditions',
      );
    } else if (metrics.truePathPercentage < 20) {
      insights.optimization.push(
        'False path heavily favored - consider adjusting conditions',
      );
    }

    if (metrics.conversionRate && metrics.conversionRate < 0.1) {
      insights.optimization.push(
        'Low conversion rate detected - review branch logic',
      );
    }

    // A/B test insights
    if (abTestResults?.enabled) {
      if (abTestResults.confidence > 95 && abTestResults.winner) {
        insights.abTest.push(
          `High confidence winner detected: ${abTestResults.winner}`,
        );
      }

      if (abTestResults.significance < 0.05) {
        insights.abTest.push(
          'Statistically significant difference between variants',
        );
      }

      const maxExecutions = Math.max(
        ...abTestResults.variants.map((v) => v.executions),
      );
      const minExecutions = Math.min(
        ...abTestResults.variants.map((v) => v.executions),
      );

      if (maxExecutions > minExecutions * 2) {
        insights.abTest.push('Uneven variant distribution - check split logic');
      }
    }

    return insights;
  }

  /**
   * Export analytics data
   */
  exportData(query: BranchAnalyticsQuery, format: 'json' | 'csv'): string {
    const data = this.getAnalytics(query);

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Real-time metrics for dashboard
   */
  getRealTimeMetrics(): {
    activeExecutions: number;
    averageExecutionTime: number;
    errorRate: number;
    topPerformingBranches: Array<{
      branchId: string;
      conversionRate: number;
      executions: number;
    }>;
  } {
    const recentExecutions = Array.from(this.executions.values()).filter(
      (e) => Date.now() - e.timestamp.getTime() < 60000,
    ); // Last minute

    const errorRate =
      recentExecutions.length > 0
        ? recentExecutions.filter((e) => e.executionTime > 10).length /
          recentExecutions.length
        : 0;

    const averageExecutionTime =
      recentExecutions.length > 0
        ? recentExecutions.reduce((sum, e) => sum + e.executionTime, 0) /
          recentExecutions.length
        : 0;

    // Get top performing branches
    const branchPerformance = new Map<
      string,
      { conversions: number; executions: number }
    >();

    recentExecutions.forEach((execution) => {
      const current = branchPerformance.get(execution.branchId) || {
        conversions: 0,
        executions: 0,
      };
      current.executions++;

      const hasConversion = Array.from(this.conversions.values()).some(
        (c) => c.executionId === execution.id,
      );
      if (hasConversion) {
        current.conversions++;
      }

      branchPerformance.set(execution.branchId, current);
    });

    const topPerformingBranches = Array.from(branchPerformance.entries())
      .map(([branchId, stats]) => ({
        branchId,
        conversionRate:
          stats.executions > 0 ? stats.conversions / stats.executions : 0,
        executions: stats.executions,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);

    return {
      activeExecutions: recentExecutions.length,
      averageExecutionTime,
      errorRate,
      topPerformingBranches,
    };
  }

  /**
   * Private helper methods
   */
  private calculateBranchMetrics(
    branchId: string,
  ): BranchPerformanceMetrics | null {
    const executions = Array.from(this.executions.values()).filter(
      (e) => e.branchId === branchId,
    );

    if (executions.length === 0) return null;

    const executionTimes = executions
      .map((e) => e.executionTime)
      .sort((a, b) => a - b);
    const truePathCount = executions.filter((e) => e.result).length;
    const falsePathCount = executions.length - truePathCount;

    const conversions = this.getBranchConversions(branchId);
    const conversionRate =
      executions.length > 0 ? conversions.length / executions.length : 0;

    const abTestResults = this.getABTestResults(branchId);

    return {
      branchId,
      branchName: `Branch ${branchId}`,
      totalExecutions: executions.length,
      averageExecutionTime:
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length,
      truePathCount,
      falsePathCount,
      truePathPercentage:
        executions.length > 0 ? truePathCount / executions.length : 0,
      falsePathPercentage:
        executions.length > 0 ? falsePathCount / executions.length : 0,
      conversionRate,
      abTestResults,
      performanceStats: {
        p50: this.calculatePercentile(executionTimes, 50),
        p95: this.calculatePercentile(executionTimes, 95),
        p99: this.calculatePercentile(executionTimes, 99),
        maxExecutionTime: Math.max(...executionTimes),
        minExecutionTime: Math.min(...executionTimes),
      },
    };
  }

  private filterExecutions(query: BranchAnalyticsQuery): BranchExecution[] {
    return Array.from(this.executions.values()).filter((execution) => {
      if (query.branchIds && !query.branchIds.includes(execution.branchId))
        return false;
      if (query.journeyIds && !query.journeyIds.includes(execution.journeyId))
        return false;
      if (query.dateRange) {
        if (
          execution.timestamp < query.dateRange.start ||
          execution.timestamp > query.dateRange.end
        ) {
          return false;
        }
      }
      return true;
    });
  }

  private calculateSummaryStats(executions: BranchExecution[]) {
    const totalExecutions = executions.length;
    const averageExecutionTime =
      executions.length > 0
        ? executions.reduce((sum, e) => sum + e.executionTime, 0) /
          executions.length
        : 0;

    const totalConversions = Array.from(this.conversions.values()).filter((c) =>
      executions.some((e) => e.id === c.executionId),
    ).length;

    const overallConversionRate =
      totalExecutions > 0 ? totalConversions / totalExecutions : 0;

    const activeABTests = new Set(
      executions.filter((e) => e.abTest?.enabled).map((e) => e.branchId),
    ).size;

    return {
      totalExecutions,
      averageExecutionTime,
      overallConversionRate,
      activeABTests,
    };
  }

  private groupByVariant(
    executions: BranchExecution[],
  ): Record<string, BranchExecution[]> {
    return executions.reduce(
      (groups, execution) => {
        const variant = execution.abTest?.variant || 'control';
        if (!groups[variant]) groups[variant] = [];
        groups[variant].push(execution);
        return groups;
      },
      {} as Record<string, BranchExecution[]>,
    );
  }

  private calculateVariantPerformance(
    variantId: string,
    executions: BranchExecution[],
  ): VariantPerformance {
    const conversions = Array.from(this.conversions.values()).filter((c) =>
      executions.some((e) => e.id === c.executionId),
    );

    const conversionRate =
      executions.length > 0 ? conversions.length / executions.length : 0;
    const averageValue =
      conversions.length > 0
        ? conversions.reduce((sum, c) => sum + (c.eventValue || 0), 0) /
          conversions.length
        : 0;

    return {
      variantId,
      variantName: `Variant ${variantId}`,
      executions: executions.length,
      conversions: conversions.length,
      conversionRate,
      averageValue,
      confidence: this.calculateConfidence(
        executions.length,
        conversions.length,
      ),
    };
  }

  private calculateStatisticalSignificance(variants: VariantPerformance[]): {
    confidence: number;
    winner?: string;
    significance: number;
  } {
    if (variants.length < 2) {
      return { confidence: 0, significance: 1 };
    }

    // Simple implementation - in production you'd use proper statistical tests
    const [variantA, variantB] = variants;
    const pooledRate =
      (variantA.conversions + variantB.conversions) /
      (variantA.executions + variantB.executions);
    const se = Math.sqrt(
      pooledRate *
        (1 - pooledRate) *
        (1 / variantA.executions + 1 / variantB.executions),
    );
    const zScore =
      Math.abs(variantA.conversionRate - variantB.conversionRate) / se;

    // Convert z-score to p-value (simplified)
    const significance = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    const confidence = (1 - significance) * 100;

    const winner =
      variantA.conversionRate > variantB.conversionRate
        ? variantA.variantId
        : variantB.variantId;

    return { confidence, winner, significance };
  }

  private getBranchConversions(branchId: string): ConversionEvent[] {
    return Array.from(this.conversions.values()).filter(
      (c) => c.branchId === branchId,
    );
  }

  private groupExecutionsByBranch(
    executions: BranchExecution[],
  ): Record<string, BranchExecution[]> {
    return executions.reduce(
      (groups, execution) => {
        if (!groups[execution.branchId]) groups[execution.branchId] = [];
        groups[execution.branchId].push(execution);
        return groups;
      },
      {} as Record<string, BranchExecution[]>,
    );
  }

  private calculatePercentile(
    sortedArray: number[],
    percentile: number,
  ): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    return (
      sortedArray[lower] * (upper - index) +
      sortedArray[upper] * (index - lower)
    );
  }

  private calculateConfidence(trials: number, successes: number): number {
    if (trials === 0) return 0;
    const rate = successes / trials;
    const margin = 1.96 * Math.sqrt((rate * (1 - rate)) / trials); // 95% confidence interval
    return Math.max(0, rate - margin) * 100;
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be more sophisticated in production
    const headers = [
      'Branch ID',
      'Total Executions',
      'Avg Execution Time',
      'True Path %',
      'Conversion Rate',
    ];
    const rows = data.branches.map((branch: BranchPerformanceMetrics) => [
      branch.branchId,
      branch.totalExecutions,
      branch.averageExecutionTime.toFixed(2),
      (branch.truePathPercentage * 100).toFixed(1),
      ((branch.conversionRate || 0) * 100).toFixed(1),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private emitAnalyticsEvent(eventType: string, data: any): void {
    // In production, this would send to your analytics service
    console.log(`Analytics Event: ${eventType}`, data);
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, value: any): void {
    this.performanceCache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private invalidateCache(branchId: string): void {
    const keysToRemove = Array.from(this.performanceCache.keys()).filter(
      (key) => key.includes(branchId),
    );

    keysToRemove.forEach((key) => {
      this.performanceCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  /**
   * Cleanup methods
   */
  clearData(): void {
    this.executions.clear();
    this.conversions.clear();
    this.performanceCache.clear();
    this.cacheExpiry.clear();
  }

  getExecutionCount(): number {
    return this.executions.size;
  }

  getConversionCount(): number {
    return this.conversions.size;
  }
}

/**
 * Wedding photographer specific analytics utilities
 */
export const WeddingAnalytics = {
  /**
   * Track destination vs local wedding outcomes
   */
  trackWeddingType(
    analytics: BranchAnalytics,
    execution: BranchExecution,
  ): void {
    const weddingType = execution.result ? 'destination' : 'local';

    analytics.recordExecution({
      ...execution,
      metadata: {
        ...execution.metadata,
        weddingType,
        photographerContext: true,
      },
    });
  },

  /**
   * Generate wedding-specific insights
   */
  generateWeddingInsights(
    analytics: BranchAnalytics,
    branchId: string,
  ): {
    destinationBookings: number;
    localBookings: number;
    averageBookingValue: number;
    seasonalTrends: Record<string, number>;
  } {
    const executions = Array.from(
      (analytics as any).executions.values(),
    ).filter((e: BranchExecution) => e.branchId === branchId);

    const destinationBookings = executions.filter(
      (e) => e.metadata?.weddingType === 'destination',
    ).length;
    const localBookings = executions.filter(
      (e) => e.metadata?.weddingType === 'local',
    ).length;

    const conversions = Array.from(
      (analytics as any).conversions.values(),
    ).filter((c: ConversionEvent) => c.branchId === branchId);

    const averageBookingValue =
      conversions.length > 0
        ? conversions.reduce((sum, c) => sum + (c.eventValue || 0), 0) /
          conversions.length
        : 0;

    const seasonalTrends = executions.reduce(
      (trends, execution) => {
        const month = execution.timestamp.getMonth();
        const season =
          month >= 2 && month <= 4
            ? 'spring'
            : month >= 5 && month <= 7
              ? 'summer'
              : month >= 8 && month <= 10
                ? 'fall'
                : 'winter';

        trends[season] = (trends[season] || 0) + 1;
        return trends;
      },
      {} as Record<string, number>,
    );

    return {
      destinationBookings,
      localBookings,
      averageBookingValue,
      seasonalTrends,
    };
  },
};
