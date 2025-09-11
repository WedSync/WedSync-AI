import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

// A/B Testing Types
export interface ABTestVariant {
  id: string;
  name: 'A' | 'B' | 'C' | 'D';
  description: string;
  weight: number; // Distribution weight (0-100)
  isControl: boolean;
}

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  variants: ABTestVariant[];
  metrics: ABTestMetric[];
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
}

export interface ABTestMetric {
  id: string;
  name: string;
  type: 'primary' | 'secondary';
  measurementType: 'conversion' | 'engagement' | 'revenue' | 'custom';
  calculation: 'count' | 'percentage' | 'average' | 'sum';
  successCriteria?: {
    operator: 'greater_than' | 'less_than';
    value: number;
  };
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  metrics: {
    metricId: string;
    value: number;
    sampleSize: number;
    conversionRate?: number;
    confidence?: number;
    pValue?: number;
    isSignificant?: boolean;
  }[];
  winner?: string;
  conclusive: boolean;
}

export interface UserVariantAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: Date;
  converted: boolean;
  conversionValue?: number;
}

// Statistical functions for A/B testing
class ABTestStatistics {
  /**
   * Calculate statistical significance using Z-test for proportions
   */
  calculateSignificance(
    controlConversions: number,
    controlTotal: number,
    variantConversions: number,
    variantTotal: number,
    confidenceLevel: number = 0.95,
  ): {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: [number, number];
    uplift: number;
  } {
    // Conversion rates
    const p1 = controlConversions / controlTotal;
    const p2 = variantConversions / variantTotal;

    // Pooled proportion
    const pooledP =
      (controlConversions + variantConversions) / (controlTotal + variantTotal);
    const pooledSE = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / controlTotal + 1 / variantTotal),
    );

    // Z-score
    const zScore = (p2 - p1) / pooledSE;

    // P-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Confidence interval
    const zCritical = this.getZCritical(confidenceLevel);
    const se = Math.sqrt(
      (p1 * (1 - p1)) / controlTotal + (p2 * (1 - p2)) / variantTotal,
    );
    const marginOfError = zCritical * se;
    const difference = p2 - p1;
    const confidenceInterval: [number, number] = [
      difference - marginOfError,
      difference + marginOfError,
    ];

    // Calculate uplift
    const uplift = ((p2 - p1) / p1) * 100;

    return {
      pValue,
      isSignificant: pValue < 1 - confidenceLevel,
      confidenceInterval,
      uplift,
    };
  }

  /**
   * Calculate minimum sample size needed for test
   */
  calculateSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number,
    confidenceLevel: number = 0.95,
    power: number = 0.8,
  ): number {
    const alpha = 1 - confidenceLevel;
    const zAlpha = this.getZCritical(confidenceLevel);
    const zBeta = this.getZCritical(power);

    const p1 = baselineConversionRate;
    const p2 = p1 * (1 + minimumDetectableEffect);
    const pooledP = (p1 + p2) / 2;

    const sampleSize = Math.ceil(
      (2 * Math.pow(zAlpha + zBeta, 2) * pooledP * (1 - pooledP)) /
        Math.pow(p2 - p1, 2),
    );

    return sampleSize;
  }

  private normalCDF(z: number): number {
    // Approximation of the cumulative distribution function for standard normal
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp((-z * z) / 2);
    const probability =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - probability : probability;
  }

  private getZCritical(confidenceLevel: number): number {
    const zValues: Record<number, number> = {
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
      0.8: 1.282, // For power calculations
    };
    return zValues[confidenceLevel] || 1.96;
  }
}

// Main A/B Testing Service
export class ABTestingService {
  private stats = new ABTestStatistics();
  private activeTests: Map<string, ABTest> = new Map();

  /**
   * Create a new A/B test
   */
  async createTest(params: {
    campaignId: string;
    name: string;
    hypothesis: string;
    variants: Omit<ABTestVariant, 'id'>[];
    metrics: Omit<ABTestMetric, 'id'>[];
    confidenceLevel?: number;
    minimumSampleSize?: number;
  }): Promise<ABTest> {
    const supabase = createClient();

    const test: ABTest = {
      id: `test_${params.campaignId}_${Date.now()}`,
      campaignId: params.campaignId,
      name: params.name,
      hypothesis: params.hypothesis,
      status: 'draft',
      startDate: new Date(),
      variants: params.variants.map((v, i) => ({
        ...v,
        id: `variant_${i}_${Date.now()}`,
      })),
      metrics: params.metrics.map((m, i) => ({
        ...m,
        id: `metric_${i}_${Date.now()}`,
      })),
      minimumSampleSize: params.minimumSampleSize || 1000,
      confidenceLevel: params.confidenceLevel || 0.95,
    };

    // Store in database
    await supabase.from('ab_tests').insert({
      id: test.id,
      campaign_id: test.campaignId,
      name: test.name,
      hypothesis: test.hypothesis,
      status: test.status,
      variants: test.variants,
      metrics: test.metrics,
      confidence_level: test.confidenceLevel,
      minimum_sample_size: test.minimumSampleSize,
      created_at: new Date().toISOString(),
    });

    this.activeTests.set(test.id, test);
    return test;
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('ab_tests')
      .update({
        status: 'running',
        start_date: new Date().toISOString(),
      })
      .eq('id', testId);

    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'running';
      test.startDate = new Date();
    }
  }

  /**
   * Assign a variant to a user
   */
  async assignVariant(userId: string, testId: string): Promise<ABTestVariant> {
    const supabase = createClient();

    // Check if already assigned
    const { data: existing } = await supabase
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .single();

    if (existing) {
      const test =
        this.activeTests.get(testId) || (await this.loadTest(testId));
      return test.variants.find((v) => v.id === existing.variant_id)!;
    }

    // Assign new variant based on weights
    const test = this.activeTests.get(testId) || (await this.loadTest(testId));
    const variant = this.selectWeightedVariant(test.variants);

    // Store assignment
    await supabase.from('ab_test_assignments').insert({
      user_id: userId,
      test_id: testId,
      variant_id: variant.id,
      assigned_at: new Date().toISOString(),
    });

    return variant;
  }

  /**
   * Select variant for user (simplified version for campaign integration)
   */
  async selectVariantForUser(
    userId: string,
    campaignId: string,
  ): Promise<'A' | 'B'> {
    const supabase = createClient();

    // Find active test for campaign
    const { data: activeTest } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'running')
      .single();

    if (!activeTest) {
      // No active test, use control
      return 'A';
    }

    const variant = await this.assignVariant(userId, activeTest.id);
    return variant.name as 'A' | 'B';
  }

  /**
   * Generate A/B test variant dynamically
   */
  async generateABVariant(
    campaignId: string,
    variantType: 'subject' | 'content' | 'cta' | 'timing',
  ): Promise<{ A: any; B: any }> {
    const supabase = createClient();

    // Get test configuration
    const { data: config } = await supabase
      .from('ab_test_configs')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('variant_type', variantType)
      .single();

    if (!config) {
      // Return default variants
      return this.getDefaultVariants(variantType);
    }

    return {
      A: config.control_value,
      B: config.variant_value,
    };
  }

  /**
   * Track conversion event
   */
  async trackConversion(params: {
    userId: string;
    testId: string;
    metricId: string;
    value?: number;
  }): Promise<void> {
    const supabase = createClient();

    // Get user's variant assignment
    const { data: assignment } = await supabase
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('user_id', params.userId)
      .eq('test_id', params.testId)
      .single();

    if (!assignment) return;

    // Record conversion
    await supabase.from('ab_test_conversions').insert({
      test_id: params.testId,
      variant_id: assignment.variant_id,
      user_id: params.userId,
      metric_id: params.metricId,
      value: params.value || 1,
      converted_at: new Date().toISOString(),
    });

    // Update assignment
    await supabase
      .from('ab_test_assignments')
      .update({
        converted: true,
        conversion_value: params.value,
      })
      .eq('user_id', params.userId)
      .eq('test_id', params.testId);
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<ABTestResult> {
    const supabase = createClient();

    // Load test configuration
    const test = this.activeTests.get(testId) || (await this.loadTest(testId));

    // Get conversion data for each variant
    const { data: conversions } = await supabase
      .from('ab_test_conversions')
      .select('variant_id, metric_id, value')
      .eq('test_id', testId);

    const { data: assignments } = await supabase
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('test_id', testId);

    // Calculate metrics for each variant
    const results: ABTestResult = {
      testId,
      variantId: '',
      metrics: [],
      conclusive: false,
    };

    // Group data by variant
    const variantData = new Map<
      string,
      {
        assignments: number;
        conversions: Map<string, number[]>;
      }
    >();

    test.variants.forEach((variant) => {
      variantData.set(variant.id, {
        assignments: 0,
        conversions: new Map(),
      });
    });

    // Count assignments
    assignments?.forEach((a) => {
      const data = variantData.get(a.variant_id);
      if (data) data.assignments++;
    });

    // Group conversions by metric
    conversions?.forEach((c) => {
      const data = variantData.get(c.variant_id);
      if (data) {
        if (!data.conversions.has(c.metric_id)) {
          data.conversions.set(c.metric_id, []);
        }
        data.conversions.get(c.metric_id)!.push(c.value);
      }
    });

    // Calculate significance for primary metric
    const primaryMetric = test.metrics.find((m) => m.type === 'primary');
    if (primaryMetric) {
      const controlVariant = test.variants.find((v) => v.isControl);
      const testVariant = test.variants.find((v) => !v.isControl);

      if (controlVariant && testVariant) {
        const controlData = variantData.get(controlVariant.id)!;
        const testData = variantData.get(testVariant.id)!;

        const controlConversions =
          controlData.conversions.get(primaryMetric.id)?.length || 0;
        const testConversions =
          testData.conversions.get(primaryMetric.id)?.length || 0;

        if (controlData.assignments >= 100 && testData.assignments >= 100) {
          const significance = this.stats.calculateSignificance(
            controlConversions,
            controlData.assignments,
            testConversions,
            testData.assignments,
            test.confidenceLevel,
          );

          results.conclusive = significance.isSignificant;
          if (results.conclusive) {
            results.winner =
              significance.uplift > 0 ? testVariant.id : controlVariant.id;
          }
        }
      }
    }

    return results;
  }

  /**
   * Perform multi-armed bandit optimization
   */
  async optimizeVariantWeights(testId: string): Promise<void> {
    const results = await this.getTestResults(testId);

    if (!results.conclusive) {
      // Use Thompson Sampling for exploration/exploitation
      const test =
        this.activeTests.get(testId) || (await this.loadTest(testId));

      // Update weights based on performance
      // This is a simplified version - production would use more sophisticated algorithms
      const supabase = createClient();
      await supabase
        .from('ab_tests')
        .update({
          variants: test.variants,
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);
    }
  }

  private selectWeightedVariant(variants: ABTestVariant[]): ABTestVariant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[0]; // Fallback to first variant
  }

  private async loadTest(testId: string): Promise<ABTest> {
    const supabase = createClient();

    const { data } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    const test: ABTest = {
      id: data.id,
      campaignId: data.campaign_id,
      name: data.name,
      hypothesis: data.hypothesis,
      status: data.status,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      variants: data.variants,
      metrics: data.metrics,
      minimumSampleSize: data.minimum_sample_size,
      confidenceLevel: data.confidence_level,
    };

    this.activeTests.set(testId, test);
    return test;
  }

  private getDefaultVariants(variantType: string): { A: any; B: any } {
    switch (variantType) {
      case 'subject':
        return {
          A: 'Your trial ends in {days} days',
          B: "Don't miss out - {days} days left in your trial",
        };
      case 'content':
        return {
          A: 'professional',
          B: 'friendly',
        };
      case 'cta':
        return {
          A: 'Upgrade Now',
          B: 'Start Your Subscription',
        };
      case 'timing':
        return {
          A: '9am',
          B: '2pm',
        };
      default:
        return { A: null, B: null };
    }
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();

// Export convenience functions
export const {
  assignVariant,
  selectVariantForUser,
  generateABVariant,
  trackConversion,
  getTestResults,
} = abTestingService;
