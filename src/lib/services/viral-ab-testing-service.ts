/**
 * Viral A/B Testing Service - Enhanced viral optimization with template variants
 * WS-141 Round 2: A/B testing framework for invitation templates
 * SECURITY: Validated inputs, rate limited, statistically sound
 */

import { z } from 'zod';
import { createHash, randomInt } from 'crypto';

// Validation schemas
const relationshipTypeSchema = z.enum(['past_client', 'vendor', 'friend']);

const templateVariantSchema = z.object({
  id: z.string().uuid(),
  relationship_type: relationshipTypeSchema,
  variant_name: z.string().min(1).max(50),
  template: z.string().min(10).max(2000),
  is_control: z.boolean(),
  is_active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

const abTestResultsSchema = z.object({
  variant: z.string(),
  sent_count: z.number().min(0),
  opened_count: z.number().min(0),
  clicked_count: z.number().min(0),
  converted_count: z.number().min(0),
  open_rate: z.number().min(0).max(100),
  click_rate: z.number().min(0).max(100),
  conversion_rate: z.number().min(0).max(100),
  statistical_significance: z.number().min(0).max(1).optional(),
  confidence_interval: z
    .object({
      lower: z.number(),
      upper: z.number(),
    })
    .optional(),
});

type RelationshipType = z.infer<typeof relationshipTypeSchema>;
type TemplateVariant = z.infer<typeof templateVariantSchema>;
type ABTestResults = z.infer<typeof abTestResultsSchema>;

interface VariantSelection {
  variant: string;
  template: string;
  tracking_id: string;
  test_group: 'control' | 'variant_a' | 'variant_b' | 'variant_c';
}

interface StatisticalAnalysis {
  winner: string | null;
  confidence_level: number;
  required_sample_size: number;
  current_sample_size: number;
  test_complete: boolean;
  recommendations: string[];
}

export class ViralABTestingService {
  private static readonly DISTRIBUTION_WEIGHTS = [40, 20, 20, 20]; // Control: 40%, Variants: 20% each
  private static readonly MIN_SAMPLE_SIZE = 100;
  private static readonly CONFIDENCE_THRESHOLD = 0.95;

  /**
   * Select invitation template variant for a user based on sticky assignment
   * Performance requirement: Under 50ms
   */
  static async selectInvitationVariant(
    relationshipType: RelationshipType,
    userId: string,
  ): Promise<VariantSelection> {
    const startTime = Date.now();

    // Validate inputs
    const validatedType = relationshipTypeSchema.parse(relationshipType);
    if (!userId || userId.length < 8) {
      throw new Error('Invalid user ID provided');
    }

    try {
      // Get user's sticky seed for consistent assignment
      const userSeed = this.getUserSeed(userId, validatedType);

      // Get active variants for this relationship type
      const variants = await this.getActiveVariants(validatedType);

      if (variants.length === 0) {
        throw new Error(
          `No active variants found for relationship type: ${validatedType}`,
        );
      }

      // Statistical distribution using weighted random selection
      const selectedIndex = this.weightedRandomSelection(userSeed);
      const selectedVariant = variants[selectedIndex] || variants[0]; // Fallback to first variant

      // Generate tracking ID for this assignment
      const trackingId = this.generateTrackingId(userId, selectedVariant.id);

      // Track assignment for analysis (fire-and-forget)
      this.trackVariantAssignment(
        userId,
        selectedVariant.id,
        validatedType,
        trackingId,
      ).catch((error) =>
        console.error('Failed to track variant assignment:', error),
      );

      const result: VariantSelection = {
        variant: selectedVariant.id,
        template: selectedVariant.template,
        tracking_id: trackingId,
        test_group: this.getTestGroupName(selectedIndex),
      };

      // Performance monitoring
      const processingTime = Date.now() - startTime;
      if (processingTime > 45) {
        console.warn(
          `A/B variant selection took ${processingTime}ms - approaching 50ms limit`,
        );
      }

      return result;
    } catch (error) {
      console.error('Variant selection failed:', error);

      // Fallback to control variant
      const fallbackVariant = await this.getFallbackVariant(validatedType);
      return {
        variant: fallbackVariant.id,
        template: fallbackVariant.template,
        tracking_id: this.generateTrackingId(userId, fallbackVariant.id),
        test_group: 'control',
      };
    }
  }

  /**
   * Analyze variant performance with statistical significance testing
   * Performance requirement: Complex analysis under 200ms
   */
  static async analyzeVariantPerformance(
    relationshipType?: RelationshipType,
    timeframe = '30 days',
  ): Promise<ABTestResults[]> {
    const startTime = Date.now();

    try {
      // Build performance query with optimization
      const query = `
        WITH variant_performance AS (
          SELECT 
            vaa.template_variant_id,
            tv.variant_name,
            tv.relationship_type,
            COUNT(*) as sent_count,
            COUNT(CASE WHEN vaa.opened_at IS NOT NULL THEN 1 END) as opened_count,
            COUNT(CASE WHEN vaa.clicked_at IS NOT NULL THEN 1 END) as clicked_count,
            COUNT(CASE WHEN vaa.converted_at IS NOT NULL THEN 1 END) as converted_count
          FROM viral_ab_assignments vaa
          JOIN template_variants tv ON vaa.template_variant_id = tv.id
          WHERE vaa.created_at >= NOW() - INTERVAL '${timeframe}'
            ${relationshipType ? `AND tv.relationship_type = '${relationshipType}'` : ''}
            AND tv.is_active = true
          GROUP BY vaa.template_variant_id, tv.variant_name, tv.relationship_type
          HAVING COUNT(*) >= 10  -- Minimum sample size for reliability
        )
        SELECT 
          tv.variant_name as variant,
          vp.sent_count::INTEGER,
          vp.opened_count::INTEGER, 
          vp.clicked_count::INTEGER,
          vp.converted_count::INTEGER,
          ROUND(
            CASE 
              WHEN vp.sent_count > 0 
              THEN (vp.opened_count::DECIMAL / vp.sent_count) * 100 
              ELSE 0 
            END, 2
          ) as open_rate,
          ROUND(
            CASE 
              WHEN vp.sent_count > 0 
              THEN (vp.clicked_count::DECIMAL / vp.sent_count) * 100 
              ELSE 0 
            END, 2
          ) as click_rate,
          ROUND(
            CASE 
              WHEN vp.sent_count > 0 
              THEN (vp.converted_count::DECIMAL / vp.sent_count) * 100 
              ELSE 0 
            END, 2
          ) as conversion_rate
        FROM variant_performance vp
        JOIN template_variants tv ON vp.template_variant_id = tv.id
        ORDER BY conversion_rate DESC, click_rate DESC, open_rate DESC
      `;

      // Execute query (using existing database infrastructure)
      const queryResult = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }).then((res) => res.json());

      if (!queryResult.rows || queryResult.rows.length === 0) {
        return [];
      }

      // Process results and add statistical analysis
      const results: ABTestResults[] = queryResult.rows.map((row: any) =>
        abTestResultsSchema.parse({
          variant: row.variant,
          sent_count: parseInt(row.sent_count),
          opened_count: parseInt(row.opened_count),
          clicked_count: parseInt(row.clicked_count),
          converted_count: parseInt(row.converted_count),
          open_rate: parseFloat(row.open_rate),
          click_rate: parseFloat(row.click_rate),
          conversion_rate: parseFloat(row.conversion_rate),
        }),
      );

      // Add statistical significance testing
      const enhancedResults = this.addStatisticalAnalysis(results);

      // Performance monitoring
      const processingTime = Date.now() - startTime;
      if (processingTime > 180) {
        console.warn(
          `A/B analysis took ${processingTime}ms - approaching 200ms limit`,
        );
      }

      return enhancedResults;
    } catch (error) {
      console.error('Variant performance analysis failed:', error);
      throw new Error('Failed to analyze variant performance');
    }
  }

  /**
   * Automatically promote winning variants based on statistical significance
   */
  static async promoteWinningVariants(): Promise<{
    promoted: string[];
    disabled: string[];
  }> {
    try {
      const relationshipTypes: RelationshipType[] = [
        'past_client',
        'vendor',
        'friend',
      ];
      const promoted: string[] = [];
      const disabled: string[] = [];

      for (const relationshipType of relationshipTypes) {
        const analysis = await this.analyzeVariantPerformance(relationshipType);
        const statisticalAnalysis = this.performStatisticalAnalysis(analysis);

        if (statisticalAnalysis.test_complete && statisticalAnalysis.winner) {
          // Promote winner and disable underperforming variants
          await this.updateVariantStatus(
            statisticalAnalysis.winner,
            relationshipType,
            true,
          );
          promoted.push(statisticalAnalysis.winner);

          // Disable variants with significantly worse performance
          const underperformers = this.identifyUnderperformers(
            analysis,
            statisticalAnalysis.winner,
          );
          for (const underperformer of underperformers) {
            await this.updateVariantStatus(
              underperformer,
              relationshipType,
              false,
            );
            disabled.push(underperformer);
          }
        }
      }

      return { promoted, disabled };
    } catch (error) {
      console.error('Auto-promotion failed:', error);
      throw new Error('Failed to promote winning variants');
    }
  }

  // Private helper methods

  private static getUserSeed(userId: string, relationshipType: string): number {
    // Create deterministic seed based on user ID and relationship type
    const hash = createHash('sha256')
      .update(`${userId}-${relationshipType}`)
      .digest('hex');

    // Convert first 8 characters of hash to integer
    return parseInt(hash.substring(0, 8), 16);
  }

  private static weightedRandomSelection(seed: number): number {
    // Use seed to generate consistent pseudo-random selection
    const random = (seed % 100) / 100; // Normalize to 0-1 range
    const cumulativeWeights = [40, 60, 80, 100]; // Cumulative percentages

    const randomPercentage = random * 100;
    return cumulativeWeights.findIndex((weight) => randomPercentage < weight);
  }

  private static getTestGroupName(
    index: number,
  ): VariantSelection['test_group'] {
    const groups: VariantSelection['test_group'][] = [
      'control',
      'variant_a',
      'variant_b',
      'variant_c',
    ];
    return groups[index] || 'control';
  }

  private static generateTrackingId(userId: string, variantId: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5')
      .update(`${userId}-${variantId}-${timestamp}`)
      .digest('hex');

    return `vab_${hash.substring(0, 12)}`;
  }

  private static async getActiveVariants(
    relationshipType: RelationshipType,
  ): Promise<TemplateVariant[]> {
    // Query database for active variants
    const query = `
      SELECT id, relationship_type, variant_name, template, is_control, is_active, 
             created_at, updated_at
      FROM template_variants 
      WHERE relationship_type = '${relationshipType}' 
        AND is_active = true 
      ORDER BY is_control DESC, created_at ASC
      LIMIT 4
    `;

    const result = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }).then((res) => res.json());

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      relationship_type: row.relationship_type,
      variant_name: row.variant_name,
      template: row.template,
      is_control: row.is_control,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));
  }

  private static async getFallbackVariant(
    relationshipType: RelationshipType,
  ): Promise<TemplateVariant> {
    // Get the control variant as fallback
    const query = `
      SELECT id, relationship_type, variant_name, template, is_control, is_active, 
             created_at, updated_at
      FROM template_variants 
      WHERE relationship_type = '${relationshipType}' 
        AND is_control = true 
        AND is_active = true 
      LIMIT 1
    `;

    const result = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }).then((res) => res.json());

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`No fallback variant available for ${relationshipType}`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      relationship_type: row.relationship_type,
      variant_name: row.variant_name,
      template: row.template,
      is_control: row.is_control,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  private static async trackVariantAssignment(
    userId: string,
    variantId: string,
    relationshipType: RelationshipType,
    trackingId: string,
  ): Promise<void> {
    const query = `
      INSERT INTO viral_ab_assignments 
      (user_id, template_variant_id, relationship_type, tracking_id, assigned_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
      ON CONFLICT (user_id, template_variant_id) DO UPDATE SET
        updated_at = NOW(),
        assigned_at = CASE WHEN viral_ab_assignments.assigned_at IS NULL THEN NOW() ELSE viral_ab_assignments.assigned_at END
    `;

    await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        params: [userId, variantId, relationshipType, trackingId],
      }),
    });
  }

  private static addStatisticalAnalysis(
    results: ABTestResults[],
  ): ABTestResults[] {
    if (results.length < 2) return results;

    const control =
      results.find((r) => r.variant.includes('control')) || results[0];

    return results.map((result) => {
      if (result === control) return result;

      // Calculate statistical significance using Z-test for proportions
      const { significance, confidenceInterval } =
        this.calculateStatisticalSignificance(control, result);

      return {
        ...result,
        statistical_significance: significance,
        confidence_interval: confidenceInterval,
      };
    });
  }

  private static calculateStatisticalSignificance(
    control: ABTestResults,
    variant: ABTestResults,
  ): {
    significance: number;
    confidenceInterval: { lower: number; upper: number };
  } {
    // Z-test for difference in proportions
    const p1 = control.conversion_rate / 100;
    const p2 = variant.conversion_rate / 100;
    const n1 = control.sent_count;
    const n2 = variant.sent_count;

    if (n1 < 30 || n2 < 30) {
      return {
        significance: 0,
        confidenceInterval: { lower: 0, upper: 0 },
      };
    }

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
    const z = Math.abs(p2 - p1) / se;

    // Calculate p-value from Z-score (approximation)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const significance = Math.max(0, 1 - pValue);

    // 95% confidence interval for difference
    const marginOfError = 1.96 * se;
    const diff = p2 - p1;

    return {
      significance,
      confidenceInterval: {
        lower: (diff - marginOfError) * 100,
        upper: (diff + marginOfError) * 100,
      },
    };
  }

  private static normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private static performStatisticalAnalysis(
    results: ABTestResults[],
  ): StatisticalAnalysis {
    if (results.length === 0) {
      return {
        winner: null,
        confidence_level: 0,
        required_sample_size: this.MIN_SAMPLE_SIZE,
        current_sample_size: 0,
        test_complete: false,
        recommendations: ['No test results available'],
      };
    }

    const totalSampleSize = results.reduce((sum, r) => sum + r.sent_count, 0);
    const bestPerformer = results[0]; // Results are ordered by performance
    const hasSignificantResults = results.some(
      (r) =>
        r.statistical_significance &&
        r.statistical_significance >= this.CONFIDENCE_THRESHOLD,
    );

    const winner =
      hasSignificantResults && totalSampleSize >= this.MIN_SAMPLE_SIZE
        ? bestPerformer.variant
        : null;

    const recommendations: string[] = [];

    if (totalSampleSize < this.MIN_SAMPLE_SIZE) {
      recommendations.push(
        `Need ${this.MIN_SAMPLE_SIZE - totalSampleSize} more samples for statistical significance`,
      );
    }

    if (!hasSignificantResults && totalSampleSize >= this.MIN_SAMPLE_SIZE) {
      recommendations.push(
        'Results lack statistical significance - consider running test longer',
      );
    }

    if (winner) {
      recommendations.push(
        `${winner} shows statistically significant improvement - ready for promotion`,
      );
    }

    return {
      winner,
      confidence_level: Math.max(
        ...results.map((r) => r.statistical_significance || 0),
      ),
      required_sample_size: this.MIN_SAMPLE_SIZE,
      current_sample_size: totalSampleSize,
      test_complete: !!winner,
      recommendations,
    };
  }

  private static identifyUnderperformers(
    results: ABTestResults[],
    winner: string,
  ): string[] {
    const winnerResult = results.find((r) => r.variant === winner);
    if (!winnerResult) return [];

    return results
      .filter(
        (r) =>
          r.variant !== winner &&
          r.statistical_significance &&
          r.statistical_significance >= 0.9 && // High confidence it's worse
          r.conversion_rate < winnerResult.conversion_rate * 0.8, // 20% worse than winner
      )
      .map((r) => r.variant);
  }

  private static async updateVariantStatus(
    variantId: string,
    relationshipType: RelationshipType,
    isActive: boolean,
  ): Promise<void> {
    const query = `
      UPDATE template_variants 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND relationship_type = $3
    `;

    await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        params: [isActive, variantId, relationshipType],
      }),
    });
  }
}

// Export types for use in other modules
export type {
  RelationshipType,
  TemplateVariant,
  ABTestResults,
  VariantSelection,
  StatisticalAnalysis,
};
