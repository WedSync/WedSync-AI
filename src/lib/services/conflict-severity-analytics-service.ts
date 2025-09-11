'use client';

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';
import {
  SeatingConflict,
  ConflictResult,
  GuestRelationship,
} from './relationship-conflict-validator';
import {
  PredictedConflict,
  ConflictPredictionResult,
} from './ai-conflict-prediction-service';
import { SeatingAnalytics, GuestRelationshipWithNames } from '@/types/seating';

// Conflict Severity Analytics Types
export interface SeverityAnalyticsResult {
  analytics_id: string;
  couple_id: string;
  analysis_timestamp: string;
  overall_conflict_risk: ConflictRiskLevel;
  severity_breakdown: SeverityBreakdown;
  relationship_patterns: RelationshipPattern[];
  trend_analysis: TrendAnalysis;
  predictive_insights: PredictiveInsight[];
  risk_factors: RiskFactor[];
  mitigation_recommendations: MitigationRecommendation[];
  performance_metrics: AnalyticsMetrics;
}

export interface SeverityBreakdown {
  incompatible_count: number;
  incompatible_percentage: number;
  avoid_count: number;
  avoid_percentage: number;
  prefer_apart_count: number;
  prefer_apart_percentage: number;
  neutral_count: number;
  neutral_percentage: number;
  prefer_together_count: number;
  prefer_together_percentage: number;
  total_relationships: number;
  severity_distribution_score: number; // 0-100 scale
}

export interface RelationshipPattern {
  pattern_id: string;
  pattern_type:
    | 'family_cluster'
    | 'social_group'
    | 'generational_gap'
    | 'side_division'
    | 'professional_network';
  pattern_name: string;
  guest_count: number;
  internal_conflict_rate: number;
  external_harmony_score: number;
  severity_concentration: Record<ConflictSeverity, number>;
  pattern_strength: number; // 0-1 scale
  pattern_stability: number; // How consistent this pattern is
  contributing_factors: string[];
  impact_assessment: PatternImpactAssessment;
}

export interface PatternImpactAssessment {
  seating_complexity_increase: number;
  guest_satisfaction_impact: number;
  resolution_difficulty: 'low' | 'medium' | 'high' | 'extreme';
  required_interventions: string[];
  success_probability_without_intervention: number;
  success_probability_with_intervention: number;
}

export interface TrendAnalysis {
  conflict_trend: 'improving' | 'stable' | 'deteriorating' | 'volatile';
  trend_strength: number; // 0-1 scale
  trend_duration_days: number;
  historical_comparison: HistoricalComparison;
  seasonal_patterns: SeasonalPattern[];
  predictive_trajectory: PredictiveTrajectory;
  confidence_interval: number;
}

export interface HistoricalComparison {
  compared_to_period: string;
  conflict_change_percentage: number;
  severity_shift_analysis: SeverityShift[];
  pattern_evolution: PatternEvolution[];
  resolution_effectiveness_change: number;
}

export interface SeverityShift {
  from_severity: ConflictSeverity;
  to_severity: ConflictSeverity;
  guest_pair_count: number;
  shift_reasons: string[];
  intervention_effectiveness: number;
}

export interface PatternEvolution {
  pattern_type: string;
  strength_change: number;
  stability_change: number;
  new_factors: string[];
  resolved_factors: string[];
}

export interface SeasonalPattern {
  pattern_name: string;
  time_period: string;
  conflict_intensity_change: number;
  affected_relationship_types: string[];
  correlation_strength: number;
}

export interface PredictiveTrajectory {
  forecast_period_days: number;
  expected_conflict_change: number;
  confidence_bounds: {
    lower_bound: number;
    upper_bound: number;
  };
  key_inflection_points: InflectionPoint[];
}

export interface InflectionPoint {
  date: string;
  predicted_change: number;
  contributing_factors: string[];
  intervention_window: string;
}

export interface PredictiveInsight {
  insight_id: string;
  insight_type:
    | 'escalation_warning'
    | 'resolution_opportunity'
    | 'pattern_emergence'
    | 'intervention_timing';
  insight_title: string;
  description: string;
  confidence_score: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  affected_relationships: string[];
  recommended_actions: RecommendedAction[];
  time_horizon: string;
  business_impact: BusinessImpact;
}

export interface RecommendedAction {
  action_type: 'immediate' | 'planned' | 'contingency';
  action_description: string;
  implementation_complexity: 'simple' | 'moderate' | 'complex';
  expected_effectiveness: number;
  resource_requirements: string[];
  success_indicators: string[];
}

export interface BusinessImpact {
  guest_satisfaction_impact: number;
  planning_complexity_change: number;
  cost_implications: 'none' | 'minimal' | 'moderate' | 'significant';
  reputation_risk: number;
  vendor_coordination_impact: number;
}

export interface RiskFactor {
  factor_id: string;
  factor_name: string;
  factor_category:
    | 'demographic'
    | 'behavioral'
    | 'situational'
    | 'environmental';
  risk_level: ConflictRiskLevel;
  prevalence: number; // How common this factor is
  impact_multiplier: number; // How much this amplifies other conflicts
  affected_guest_count: number;
  mitigation_difficulty:
    | 'easy'
    | 'moderate'
    | 'difficult'
    | 'requires_external_help';
  correlation_with_outcomes: RiskOutcomeCorrelation[];
}

export interface RiskOutcomeCorrelation {
  outcome_type:
    | 'wedding_day_incident'
    | 'guest_departure'
    | 'vendor_complication'
    | 'timeline_delay';
  correlation_strength: number;
  historical_frequency: number;
  severity_when_occurs: 'minor' | 'moderate' | 'major' | 'catastrophic';
}

export interface MitigationRecommendation {
  recommendation_id: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  target_risk_factors: string[];
  strategy_type: 'preventive' | 'responsive' | 'adaptive' | 'contingency';
  implementation_steps: ImplementationStep[];
  resource_allocation: ResourceAllocation;
  success_metrics: SuccessMetric[];
  monitoring_requirements: MonitoringRequirement[];
  estimated_impact: EstimatedImpact;
}

export interface ImplementationStep {
  step_number: number;
  step_description: string;
  responsible_party: string;
  estimated_duration: string;
  prerequisites: string[];
  deliverables: string[];
  validation_criteria: string[];
}

export interface ResourceAllocation {
  human_resources: string[];
  technology_requirements: string[];
  budget_implications: string;
  vendor_involvement: string[];
  timeline_requirements: string;
}

export interface SuccessMetric {
  metric_name: string;
  measurement_method: string;
  target_value: number;
  current_baseline: number;
  measurement_frequency: string;
  threshold_levels: {
    green: number;
    yellow: number;
    red: number;
  };
}

export interface MonitoringRequirement {
  monitoring_type: 'automated' | 'manual' | 'hybrid';
  frequency: string;
  data_sources: string[];
  alert_conditions: string[];
  responsible_parties: string[];
  escalation_procedures: string[];
}

export interface EstimatedImpact {
  conflict_reduction_percentage: number;
  guest_satisfaction_improvement: number;
  planning_efficiency_gain: number;
  risk_mitigation_effectiveness: number;
  implementation_success_probability: number;
  return_on_investment_score: number;
}

export interface AnalyticsMetrics {
  processing_time_ms: number;
  data_points_analyzed: number;
  pattern_detection_accuracy: number;
  prediction_confidence_avg: number;
  cache_hit_rate: number;
  algorithm_version: string;
  last_updated: string;
}

export type ConflictSeverity =
  | 'incompatible'
  | 'avoid'
  | 'prefer_apart'
  | 'neutral'
  | 'prefer_together';
export type ConflictRiskLevel =
  | 'minimal'
  | 'low'
  | 'moderate'
  | 'high'
  | 'severe'
  | 'critical';

// Validation Schemas
const analyticsRequestSchema = z.object({
  couple_id: z.string().uuid(),
  analysis_scope: z
    .enum([
      'current_snapshot',
      'trend_analysis',
      'predictive_analysis',
      'comprehensive',
    ])
    .default('comprehensive'),
  time_range_days: z.number().min(7).max(365).default(90),
  include_predictions: z.boolean().default(true),
  detail_level: z.enum(['summary', 'detailed', 'expert']).default('detailed'),
  focus_areas: z
    .array(
      z.enum([
        'severity_patterns',
        'relationship_dynamics',
        'risk_assessment',
        'mitigation_planning',
      ]),
    )
    .default(['severity_patterns', 'risk_assessment']),
});

/**
 * Conflict Severity Analytics Service
 * Advanced analytics system for tracking and analyzing relationship patterns,
 * conflict severity trends, and providing predictive insights for seating optimization.
 */
export class ConflictSeverityAnalyticsService {
  private supabase = createClient();
  private serverSupabase: ReturnType<typeof createServerClient> | null = null;
  private analyticsCache = new Map<string, SeverityAnalyticsResult>();
  private patternCache = new Map<string, RelationshipPattern[]>();
  private cacheTimeout = 20 * 60 * 1000; // 20 minutes

  constructor(serverClient?: ReturnType<typeof createServerClient>) {
    this.serverSupabase = serverClient || null;
  }

  /**
   * Main analytics method - comprehensive conflict severity analysis
   * Provides deep insights into relationship patterns and trends
   */
  async analyzeSeverityPatterns(
    coupleId: string,
    options: {
      analysisScope?:
        | 'current_snapshot'
        | 'trend_analysis'
        | 'predictive_analysis'
        | 'comprehensive';
      timeRangeDays?: number;
      includePredictions?: boolean;
      detailLevel?: 'summary' | 'detailed' | 'expert';
      focusAreas?: (
        | 'severity_patterns'
        | 'relationship_dynamics'
        | 'risk_assessment'
        | 'mitigation_planning'
      )[];
    } = {},
  ): Promise<SeverityAnalyticsResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedInput = analyticsRequestSchema.parse({
        couple_id: coupleId,
        analysis_scope: options.analysisScope || 'comprehensive',
        time_range_days: options.timeRangeDays || 90,
        include_predictions: options.includePredictions ?? true,
        detail_level: options.detailLevel || 'detailed',
        focus_areas: options.focusAreas || [
          'severity_patterns',
          'risk_assessment',
        ],
      });

      // Check cache first
      const cacheKey = this.generateAnalyticsCacheKey(coupleId, validatedInput);
      const cached = this.analyticsCache.get(cacheKey);
      if (cached && this.isCacheValid(cacheKey)) {
        return cached;
      }

      // Verify permissions
      await this.verifyAnalyticsPermissions(coupleId);

      // Gather comprehensive relationship data
      const relationshipData = await this.gatherRelationshipData(
        coupleId,
        validatedInput.time_range_days,
      );

      // Calculate severity breakdown
      const severityBreakdown = this.calculateSeverityBreakdown(
        relationshipData.relationships,
      );

      // Detect relationship patterns
      const relationshipPatterns = await this.detectRelationshipPatterns(
        relationshipData,
        validatedInput,
      );

      // Perform trend analysis
      const trendAnalysis = await this.performTrendAnalysis(
        relationshipData,
        validatedInput.time_range_days,
      );

      // Generate predictive insights
      const predictiveInsights = validatedInput.include_predictions
        ? await this.generatePredictiveInsights(
            relationshipData,
            relationshipPatterns,
            trendAnalysis,
          )
        : [];

      // Assess risk factors
      const riskFactors = await this.assessRiskFactors(
        relationshipData,
        relationshipPatterns,
      );

      // Generate mitigation recommendations
      const mitigationRecommendations = validatedInput.focus_areas.includes(
        'mitigation_planning',
      )
        ? await this.generateMitigationRecommendations(
            riskFactors,
            relationshipPatterns,
            predictiveInsights,
          )
        : [];

      // Calculate overall risk level
      const overallConflictRisk = this.calculateOverallRiskLevel(
        severityBreakdown,
        relationshipPatterns,
        riskFactors,
      );

      const result: SeverityAnalyticsResult = {
        analytics_id: `analytics_${Date.now()}`,
        couple_id: coupleId,
        analysis_timestamp: new Date().toISOString(),
        overall_conflict_risk: overallConflictRisk,
        severity_breakdown: severityBreakdown,
        relationship_patterns: relationshipPatterns,
        trend_analysis: trendAnalysis,
        predictive_insights: predictiveInsights,
        risk_factors: riskFactors,
        mitigation_recommendations: mitigationRecommendations,
        performance_metrics: {
          processing_time_ms: Date.now() - startTime,
          data_points_analyzed: relationshipData.relationships.length,
          pattern_detection_accuracy:
            this.calculatePatternAccuracy(relationshipPatterns),
          prediction_confidence_avg:
            predictiveInsights.reduce(
              (sum, insight) => sum + insight.confidence_score,
              0,
            ) / Math.max(predictiveInsights.length, 1),
          cache_hit_rate: 0, // Will be updated
          algorithm_version: '2.1.0',
          last_updated: new Date().toISOString(),
        },
      };

      // Cache the result
      this.analyticsCache.set(cacheKey, result);

      // Log analytics metrics
      await this.logAnalyticsMetrics(coupleId, result);

      return result;
    } catch (error) {
      throw new Error(
        `Conflict severity analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Gather comprehensive relationship data for analysis
   */
  private async gatherRelationshipData(
    coupleId: string,
    timeRangeDays: number,
  ): Promise<{
    relationships: GuestRelationship[];
    guests: any[];
    historicalConflicts: any[];
    resolutionHistory: any[];
  }> {
    const cutoffDate = new Date(
      Date.now() - timeRangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Get all current relationships
    const { data: relationships, error: relError } = await this.supabase
      .from('guest_relationships')
      .select(
        `
        *,
        guest1:guests!guest_id_1(id, first_name, last_name, category, side, age_group),
        guest2:guests!guest_id_2(id, first_name, last_name, category, side, age_group)
      `,
      )
      .eq('couple_id', coupleId)
      .gte('updated_at', cutoffDate);

    if (relError) {
      throw new Error(`Failed to fetch relationships: ${relError.message}`);
    }

    // Get guest data for pattern analysis
    const { data: guests, error: guestError } = await this.supabase
      .from('guests')
      .select('*')
      .eq('couple_id', coupleId);

    if (guestError) {
      console.warn('Failed to fetch guest data:', guestError.message);
    }

    // Get historical conflict data
    const { data: historicalConflicts, error: histError } = await this.supabase
      .from('seating_conflict_history')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('occurred_at', cutoffDate);

    if (histError) {
      console.warn('Historical conflict data unavailable:', histError.message);
    }

    // Get resolution history
    const { data: resolutionHistory, error: resError } = await this.supabase
      .from('conflict_resolution_history')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('resolved_at', cutoffDate);

    if (resError) {
      console.warn('Resolution history unavailable:', resError.message);
    }

    return {
      relationships: relationships || [],
      guests: guests || [],
      historicalConflicts: historicalConflicts || [],
      resolutionHistory: resolutionHistory || [],
    };
  }

  /**
   * Calculate detailed severity breakdown with statistical analysis
   */
  private calculateSeverityBreakdown(
    relationships: GuestRelationship[],
  ): SeverityBreakdown {
    const totalRelationships = relationships.length;

    if (totalRelationships === 0) {
      return {
        incompatible_count: 0,
        incompatible_percentage: 0,
        avoid_count: 0,
        avoid_percentage: 0,
        prefer_apart_count: 0,
        prefer_apart_percentage: 0,
        neutral_count: 0,
        neutral_percentage: 0,
        prefer_together_count: 0,
        prefer_together_percentage: 0,
        total_relationships: 0,
        severity_distribution_score: 50,
      };
    }

    const severityCounts = relationships.reduce(
      (acc, rel) => {
        acc[rel.conflict_severity] = (acc[rel.conflict_severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const incompatibleCount = severityCounts.incompatible || 0;
    const avoidCount = severityCounts.avoid || 0;
    const preferApartCount = severityCounts.prefer_apart || 0;
    const neutralCount = severityCounts.neutral || 0;
    const preferTogetherCount = severityCounts.prefer_together || 0;

    // Calculate distribution score (higher = more conflicts)
    const severityDistributionScore = Math.round(
      (incompatibleCount * 100 +
        avoidCount * 75 +
        preferApartCount * 50 +
        preferTogetherCount * 25) /
        totalRelationships,
    );

    return {
      incompatible_count: incompatibleCount,
      incompatible_percentage: Math.round(
        (incompatibleCount / totalRelationships) * 100,
      ),
      avoid_count: avoidCount,
      avoid_percentage: Math.round((avoidCount / totalRelationships) * 100),
      prefer_apart_count: preferApartCount,
      prefer_apart_percentage: Math.round(
        (preferApartCount / totalRelationships) * 100,
      ),
      neutral_count: neutralCount,
      neutral_percentage: Math.round((neutralCount / totalRelationships) * 100),
      prefer_together_count: preferTogetherCount,
      prefer_together_percentage: Math.round(
        (preferTogetherCount / totalRelationships) * 100,
      ),
      total_relationships: totalRelationships,
      severity_distribution_score: severityDistributionScore,
    };
  }

  /**
   * Detect complex relationship patterns using advanced analysis
   */
  private async detectRelationshipPatterns(
    data: any,
    options: any,
  ): Promise<RelationshipPattern[]> {
    const patterns: RelationshipPattern[] = [];

    // Pattern 1: Family Cluster Analysis
    const familyClusters = await this.detectFamilyClusters(
      data.relationships,
      data.guests,
    );
    patterns.push(...familyClusters);

    // Pattern 2: Social Group Patterns
    const socialGroups = await this.detectSocialGroupPatterns(
      data.relationships,
      data.guests,
    );
    patterns.push(...socialGroups);

    // Pattern 3: Generational Gap Patterns
    const generationalPatterns = await this.detectGenerationalPatterns(
      data.relationships,
      data.guests,
    );
    patterns.push(...generationalPatterns);

    // Pattern 4: Side Division Patterns
    const sideDivisionPatterns = await this.detectSideDivisionPatterns(
      data.relationships,
      data.guests,
    );
    patterns.push(...sideDivisionPatterns);

    // Pattern 5: Professional Network Patterns
    const professionalPatterns = await this.detectProfessionalPatterns(
      data.relationships,
      data.guests,
    );
    patterns.push(...professionalPatterns);

    // Sort patterns by strength and impact
    return patterns
      .sort((a, b) => b.pattern_strength - a.pattern_strength)
      .slice(0, 10);
  }

  private async detectFamilyClusters(
    relationships: GuestRelationship[],
    guests: any[],
  ): Promise<RelationshipPattern[]> {
    const familyPatterns: RelationshipPattern[] = [];

    // Group by family relationship types
    const familyRelationships = relationships.filter((rel) =>
      [
        'family_immediate',
        'family_extended',
        'child_parent',
        'siblings',
      ].includes(rel.relationship_type),
    );

    if (familyRelationships.length === 0) return familyPatterns;

    // Analyze family clusters
    const familyGroups = new Map<string, GuestRelationship[]>();

    familyRelationships.forEach((rel) => {
      const guest1Side =
        guests.find((g) => g.id === rel.guest1_id)?.side || 'neutral';
      const guest2Side =
        guests.find((g) => g.id === rel.guest2_id)?.side || 'neutral';

      const groupKey =
        guest1Side === guest2Side ? `${guest1Side}_family` : 'mixed_family';
      if (!familyGroups.has(groupKey)) {
        familyGroups.set(groupKey, []);
      }
      familyGroups.get(groupKey)!.push(rel);
    });

    // Create pattern for each family group
    familyGroups.forEach((groupRels, groupKey) => {
      const conflictCount = groupRels.filter((rel) =>
        ['incompatible', 'avoid', 'prefer_apart'].includes(
          rel.conflict_severity,
        ),
      ).length;

      const conflictRate = conflictCount / groupRels.length;
      const affectedGuests = new Set([
        ...groupRels.map((r) => r.guest1_id),
        ...groupRels.map((r) => r.guest2_id),
      ]);

      familyPatterns.push({
        pattern_id: `family_${groupKey}_${Date.now()}`,
        pattern_type: 'family_cluster',
        pattern_name: `${groupKey.replace('_', ' ')} Dynamics`,
        guest_count: affectedGuests.size,
        internal_conflict_rate: conflictRate,
        external_harmony_score: 1 - conflictRate,
        severity_concentration: this.calculateSeverityConcentration(groupRels),
        pattern_strength: Math.min(conflictRate * 2, 1), // Amplify family conflicts
        pattern_stability: this.calculatePatternStability(groupRels),
        contributing_factors: this.identifyContributingFactors(
          groupRels,
          'family',
        ),
        impact_assessment: this.assessPatternImpact(
          conflictRate,
          affectedGuests.size,
          'family_cluster',
        ),
      });
    });

    return familyPatterns;
  }

  private async detectSocialGroupPatterns(
    relationships: GuestRelationship[],
    guests: any[],
  ): Promise<RelationshipPattern[]> {
    const socialPatterns: RelationshipPattern[] = [];

    // Group by social categories
    const socialGroups = new Map<string, GuestRelationship[]>();

    relationships.forEach((rel) => {
      if (
        ['friends', 'close_friends', 'colleagues'].includes(
          rel.relationship_type,
        )
      ) {
        const guest1 = guests.find((g) => g.id === rel.guest1_id);
        const guest2 = guests.find((g) => g.id === rel.guest2_id);

        const category1 = guest1?.category || 'unknown';
        const category2 = guest2?.category || 'unknown';

        const groupKey = category1 === category2 ? category1 : 'mixed_social';
        if (!socialGroups.has(groupKey)) {
          socialGroups.set(groupKey, []);
        }
        socialGroups.get(groupKey)!.push(rel);
      }
    });

    // Create patterns for significant social groups
    socialGroups.forEach((groupRels, groupKey) => {
      if (groupRels.length >= 3) {
        // Only significant groups
        const conflictRate =
          groupRels.filter((rel) =>
            ['incompatible', 'avoid', 'prefer_apart'].includes(
              rel.conflict_severity,
            ),
          ).length / groupRels.length;

        const affectedGuests = new Set([
          ...groupRels.map((r) => r.guest1_id),
          ...groupRels.map((r) => r.guest2_id),
        ]);

        socialPatterns.push({
          pattern_id: `social_${groupKey}_${Date.now()}`,
          pattern_type: 'social_group',
          pattern_name: `${groupKey} Social Dynamics`,
          guest_count: affectedGuests.size,
          internal_conflict_rate: conflictRate,
          external_harmony_score: 1 - conflictRate,
          severity_concentration:
            this.calculateSeverityConcentration(groupRels),
          pattern_strength: conflictRate,
          pattern_stability: this.calculatePatternStability(groupRels),
          contributing_factors: this.identifyContributingFactors(
            groupRels,
            'social',
          ),
          impact_assessment: this.assessPatternImpact(
            conflictRate,
            affectedGuests.size,
            'social_group',
          ),
        });
      }
    });

    return socialPatterns;
  }

  private async detectGenerationalPatterns(
    relationships: GuestRelationship[],
    guests: any[],
  ): Promise<RelationshipPattern[]> {
    // Analyze age-based relationship patterns
    const generationalRels = relationships.filter((rel) => {
      const guest1 = guests.find((g) => g.id === rel.guest1_id);
      const guest2 = guests.find((g) => g.id === rel.guest2_id);

      return (
        guest1?.age_group &&
        guest2?.age_group &&
        guest1.age_group !== guest2.age_group
      );
    });

    if (generationalRels.length < 3) return [];

    const conflictRate =
      generationalRels.filter((rel) =>
        ['incompatible', 'avoid', 'prefer_apart'].includes(
          rel.conflict_severity,
        ),
      ).length / generationalRels.length;

    const affectedGuests = new Set([
      ...generationalRels.map((r) => r.guest1_id),
      ...generationalRels.map((r) => r.guest2_id),
    ]);

    return [
      {
        pattern_id: `generational_${Date.now()}`,
        pattern_type: 'generational_gap',
        pattern_name: 'Cross-Generational Dynamics',
        guest_count: affectedGuests.size,
        internal_conflict_rate: conflictRate,
        external_harmony_score: 1 - conflictRate,
        severity_concentration:
          this.calculateSeverityConcentration(generationalRels),
        pattern_strength: conflictRate,
        pattern_stability: this.calculatePatternStability(generationalRels),
        contributing_factors: [
          'age_difference',
          'generational_values',
          'communication_styles',
        ],
        impact_assessment: this.assessPatternImpact(
          conflictRate,
          affectedGuests.size,
          'generational_gap',
        ),
      },
    ];
  }

  private async detectSideDivisionPatterns(
    relationships: GuestRelationship[],
    guests: any[],
  ): Promise<RelationshipPattern[]> {
    // Analyze bride/groom side relationship patterns
    const crossSideRels = relationships.filter((rel) => {
      const guest1 = guests.find((g) => g.id === rel.guest1_id);
      const guest2 = guests.find((g) => g.id === rel.guest2_id);

      return (
        guest1?.side &&
        guest2?.side &&
        guest1.side !== guest2.side &&
        guest1.side !== 'neutral' &&
        guest2.side !== 'neutral'
      );
    });

    if (crossSideRels.length < 2) return [];

    const conflictRate =
      crossSideRels.filter((rel) =>
        ['incompatible', 'avoid', 'prefer_apart'].includes(
          rel.conflict_severity,
        ),
      ).length / crossSideRels.length;

    const affectedGuests = new Set([
      ...crossSideRels.map((r) => r.guest1_id),
      ...crossSideRels.map((r) => r.guest2_id),
    ]);

    return [
      {
        pattern_id: `side_division_${Date.now()}`,
        pattern_type: 'side_division',
        pattern_name: 'Cross-Side Relationship Dynamics',
        guest_count: affectedGuests.size,
        internal_conflict_rate: conflictRate,
        external_harmony_score: 1 - conflictRate,
        severity_concentration:
          this.calculateSeverityConcentration(crossSideRels),
        pattern_strength: conflictRate,
        pattern_stability: this.calculatePatternStability(crossSideRels),
        contributing_factors: [
          'family_loyalty',
          'unfamiliarity',
          'cultural_differences',
        ],
        impact_assessment: this.assessPatternImpact(
          conflictRate,
          affectedGuests.size,
          'side_division',
        ),
      },
    ];
  }

  private async detectProfessionalPatterns(
    relationships: GuestRelationship[],
    guests: any[],
  ): Promise<RelationshipPattern[]> {
    // Analyze work-related relationship patterns
    const professionalRels = relationships.filter(
      (rel) =>
        rel.relationship_type === 'colleagues' ||
        rel.notes?.toLowerCase().includes('work'),
    );

    if (professionalRels.length < 2) return [];

    const conflictRate =
      professionalRels.filter((rel) =>
        ['incompatible', 'avoid', 'prefer_apart'].includes(
          rel.conflict_severity,
        ),
      ).length / professionalRels.length;

    const affectedGuests = new Set([
      ...professionalRels.map((r) => r.guest1_id),
      ...professionalRels.map((r) => r.guest2_id),
    ]);

    return [
      {
        pattern_id: `professional_${Date.now()}`,
        pattern_type: 'professional_network',
        pattern_name: 'Professional Relationship Dynamics',
        guest_count: affectedGuests.size,
        internal_conflict_rate: conflictRate,
        external_harmony_score: 1 - conflictRate,
        severity_concentration:
          this.calculateSeverityConcentration(professionalRels),
        pattern_strength: conflictRate * 0.8, // Professional conflicts often less intense
        pattern_stability: this.calculatePatternStability(professionalRels),
        contributing_factors: [
          'workplace_politics',
          'professional_competition',
          'hierarchy_issues',
        ],
        impact_assessment: this.assessPatternImpact(
          conflictRate,
          affectedGuests.size,
          'professional_network',
        ),
      },
    ];
  }

  /**
   * Helper methods for pattern analysis
   */
  private calculateSeverityConcentration(
    relationships: GuestRelationship[],
  ): Record<ConflictSeverity, number> {
    const total = relationships.length;
    if (total === 0) {
      return {
        incompatible: 0,
        avoid: 0,
        prefer_apart: 0,
        neutral: 0,
        prefer_together: 0,
      };
    }

    const counts = relationships.reduce(
      (acc, rel) => {
        acc[rel.conflict_severity as ConflictSeverity] =
          (acc[rel.conflict_severity as ConflictSeverity] || 0) + 1;
        return acc;
      },
      {} as Record<ConflictSeverity, number>,
    );

    return {
      incompatible: (counts.incompatible || 0) / total,
      avoid: (counts.avoid || 0) / total,
      prefer_apart: (counts.prefer_apart || 0) / total,
      neutral: (counts.neutral || 0) / total,
      prefer_together: (counts.prefer_together || 0) / total,
    };
  }

  private calculatePatternStability(
    relationships: GuestRelationship[],
  ): number {
    // Measure consistency of relationship patterns over time
    // For now, return a calculated stability based on relationship distribution
    const severityVariance = this.calculateSeverityVariance(relationships);
    return Math.max(0, 1 - severityVariance / 2); // Higher stability = lower variance
  }

  private calculateSeverityVariance(
    relationships: GuestRelationship[],
  ): number {
    const severityValues = {
      incompatible: 5,
      avoid: 4,
      prefer_apart: 3,
      neutral: 2,
      prefer_together: 1,
    };

    const values = relationships.map(
      (rel) => severityValues[rel.conflict_severity as ConflictSeverity] || 2,
    );
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance) / 5; // Normalize to 0-1 scale
  }

  private identifyContributingFactors(
    relationships: GuestRelationship[],
    patternType: string,
  ): string[] {
    const factors = new Set<string>();

    // Analyze relationship types for common factors
    const relationshipTypes = [
      ...new Set(relationships.map((r) => r.relationship_type)),
    ];
    relationshipTypes.forEach((type) => {
      switch (type) {
        case 'divorced':
        case 'estranged':
          factors.add('past_relationship_trauma');
          break;
        case 'family_immediate':
        case 'family_extended':
          factors.add('family_dynamics');
          break;
        case 'colleagues':
          factors.add('professional_rivalry');
          break;
        default:
          factors.add('social_incompatibility');
      }
    });

    // Add pattern-specific factors
    switch (patternType) {
      case 'family':
        factors.add('inherited_conflicts');
        factors.add('generational_differences');
        break;
      case 'social':
        factors.add('social_circle_dynamics');
        factors.add('lifestyle_differences');
        break;
    }

    return Array.from(factors).slice(0, 5); // Limit to top 5 factors
  }

  private assessPatternImpact(
    conflictRate: number,
    guestCount: number,
    patternType: string,
  ): PatternImpactAssessment {
    const baseComplexity = (conflictRate * guestCount) / 10;
    const baseSatisfactionImpact = conflictRate * -20; // Negative impact

    let difficultyLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (conflictRate > 0.7) difficultyLevel = 'extreme';
    else if (conflictRate > 0.5) difficultyLevel = 'high';
    else if (conflictRate > 0.3) difficultyLevel = 'medium';

    const interventions = [];
    if (patternType === 'family_cluster')
      interventions.push('family_mediation', 'separate_table_strategy');
    if (patternType === 'generational_gap')
      interventions.push('bridge_building', 'age_appropriate_seating');
    if (patternType === 'side_division')
      interventions.push('mixed_table_integration', 'neutral_buffer_guests');

    return {
      seating_complexity_increase: Math.round(baseComplexity),
      guest_satisfaction_impact: Math.round(baseSatisfactionImpact),
      resolution_difficulty: difficultyLevel,
      required_interventions: interventions,
      success_probability_without_intervention: Math.max(
        10,
        100 - conflictRate * 80,
      ),
      success_probability_with_intervention: Math.min(
        95,
        60 + (1 - conflictRate) * 35,
      ),
    };
  }

  /**
   * Placeholder methods for comprehensive implementation
   */
  private async performTrendAnalysis(
    data: any,
    timeRangeDays: number,
  ): Promise<TrendAnalysis> {
    // Simplified trend analysis - in production would use time series analysis
    return {
      conflict_trend: 'stable',
      trend_strength: 0.3,
      trend_duration_days: timeRangeDays,
      historical_comparison: {
        compared_to_period: `${timeRangeDays} days ago`,
        conflict_change_percentage: 0,
        severity_shift_analysis: [],
        pattern_evolution: [],
        resolution_effectiveness_change: 0,
      },
      seasonal_patterns: [],
      predictive_trajectory: {
        forecast_period_days: 30,
        expected_conflict_change: 0,
        confidence_bounds: { lower_bound: -5, upper_bound: 5 },
        key_inflection_points: [],
      },
      confidence_interval: 0.8,
    };
  }

  private async generatePredictiveInsights(
    data: any,
    patterns: RelationshipPattern[],
    trends: TrendAnalysis,
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Generate insights based on high-risk patterns
    const highRiskPatterns = patterns.filter(
      (p) => p.internal_conflict_rate > 0.5,
    );

    highRiskPatterns.forEach((pattern, index) => {
      insights.push({
        insight_id: `insight_${pattern.pattern_id}`,
        insight_type: 'escalation_warning',
        insight_title: `High Risk: ${pattern.pattern_name}`,
        description: `Pattern shows ${Math.round(pattern.internal_conflict_rate * 100)}% internal conflict rate with ${pattern.guest_count} affected guests`,
        confidence_score: pattern.pattern_strength,
        urgency_level:
          pattern.internal_conflict_rate > 0.7 ? 'critical' : 'high',
        affected_relationships: [], // Would populate with actual relationship IDs
        recommended_actions: [
          {
            action_type: 'immediate',
            action_description:
              'Implement targeted seating separation strategy',
            implementation_complexity:
              pattern.impact_assessment.resolution_difficulty === 'extreme'
                ? 'complex'
                : 'moderate',
            expected_effectiveness:
              pattern.impact_assessment.success_probability_with_intervention /
              100,
            resource_requirements: [
              'Seating coordinator time',
              'Alternative table arrangements',
            ],
            success_indicators: [
              'Reduced conflict reports',
              'Improved guest satisfaction scores',
            ],
          },
        ],
        time_horizon: 'immediate',
        business_impact: {
          guest_satisfaction_impact:
            pattern.impact_assessment.guest_satisfaction_impact,
          planning_complexity_change:
            pattern.impact_assessment.seating_complexity_increase,
          cost_implications:
            pattern.impact_assessment.resolution_difficulty === 'extreme'
              ? 'significant'
              : 'moderate',
          reputation_risk: pattern.internal_conflict_rate * 30,
          vendor_coordination_impact:
            pattern.impact_assessment.seating_complexity_increase,
        },
      });
    });

    return insights.slice(0, 5); // Top 5 insights
  }

  private async assessRiskFactors(
    data: any,
    patterns: RelationshipPattern[],
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Assess demographic risk factors
    const ageGroupConflicts = data.relationships.filter(
      (rel: GuestRelationship) => {
        const guest1 = data.guests.find((g: any) => g.id === rel.guest1_id);
        const guest2 = data.guests.find((g: any) => g.id === rel.guest2_id);
        return (
          guest1?.age_group !== guest2?.age_group &&
          ['incompatible', 'avoid'].includes(rel.conflict_severity)
        );
      },
    );

    if (ageGroupConflicts.length > 0) {
      riskFactors.push({
        factor_id: 'age_group_conflicts',
        factor_name: 'Cross-Generational Conflicts',
        factor_category: 'demographic',
        risk_level: ageGroupConflicts.length > 3 ? 'high' : 'moderate',
        prevalence:
          ageGroupConflicts.length / Math.max(data.relationships.length, 1),
        impact_multiplier: 1.3,
        affected_guest_count: new Set([
          ...ageGroupConflicts.map((r: GuestRelationship) => r.guest1_id),
          ...ageGroupConflicts.map((r: GuestRelationship) => r.guest2_id),
        ]).size,
        mitigation_difficulty: 'moderate',
        correlation_with_outcomes: [
          {
            outcome_type: 'wedding_day_incident',
            correlation_strength: 0.6,
            historical_frequency: 0.2,
            severity_when_occurs: 'moderate',
          },
        ],
      });
    }

    // Assess family dynamic risk factors
    const familyConflicts = patterns.filter(
      (p) =>
        p.pattern_type === 'family_cluster' && p.internal_conflict_rate > 0.4,
    );
    if (familyConflicts.length > 0) {
      riskFactors.push({
        factor_id: 'family_dynamics',
        factor_name: 'Complex Family Dynamics',
        factor_category: 'behavioral',
        risk_level: familyConflicts.some((f) => f.internal_conflict_rate > 0.7)
          ? 'severe'
          : 'high',
        prevalence: familyConflicts.length / Math.max(patterns.length, 1),
        impact_multiplier: 1.8,
        affected_guest_count: familyConflicts.reduce(
          (sum, f) => sum + f.guest_count,
          0,
        ),
        mitigation_difficulty: 'difficult',
        correlation_with_outcomes: [
          {
            outcome_type: 'guest_departure',
            correlation_strength: 0.7,
            historical_frequency: 0.15,
            severity_when_occurs: 'major',
          },
        ],
      });
    }

    return riskFactors;
  }

  private async generateMitigationRecommendations(
    riskFactors: RiskFactor[],
    patterns: RelationshipPattern[],
    insights: PredictiveInsight[],
  ): Promise<MitigationRecommendation[]> {
    const recommendations: MitigationRecommendation[] = [];

    // Generate recommendations for high-impact risk factors
    const highImpactFactors = riskFactors.filter(
      (rf) => rf.risk_level === 'high' || rf.risk_level === 'severe',
    );

    highImpactFactors.forEach((factor, index) => {
      recommendations.push({
        recommendation_id: `mitigation_${factor.factor_id}`,
        priority: factor.risk_level === 'severe' ? 'immediate' : 'high',
        target_risk_factors: [factor.factor_id],
        strategy_type: 'preventive',
        implementation_steps: [
          {
            step_number: 1,
            step_description: `Address ${factor.factor_name} through targeted intervention`,
            responsible_party: 'Wedding Coordinator',
            estimated_duration: '2-4 hours',
            prerequisites: ['Risk factor assessment completed'],
            deliverables: ['Mitigation plan', 'Implementation timeline'],
            validation_criteria: [
              'Stakeholder approval',
              'Resource availability confirmed',
            ],
          },
        ],
        resource_allocation: {
          human_resources: ['Wedding coordinator', 'Family liaison'],
          technology_requirements: ['Seating optimization software'],
          budget_implications:
            factor.mitigation_difficulty === 'difficult'
              ? 'Moderate ($200-500)'
              : 'Minimal ($50-200)',
          vendor_involvement: ['Venue coordinator'],
          timeline_requirements: '1-2 weeks before event',
        },
        success_metrics: [
          {
            metric_name: 'Conflict Reduction Rate',
            measurement_method: 'Post-implementation conflict assessment',
            target_value: 80,
            current_baseline: 100 - factor.impact_multiplier * 50,
            measurement_frequency: 'Weekly',
            threshold_levels: { green: 80, yellow: 60, red: 40 },
          },
        ],
        monitoring_requirements: [
          {
            monitoring_type: 'manual',
            frequency: 'Weekly',
            data_sources: ['Relationship assessments', 'Guest feedback'],
            alert_conditions: [
              'New conflicts detected',
              'Existing conflicts escalating',
            ],
            responsible_parties: ['Wedding coordinator'],
            escalation_procedures: [
              'Immediate notification to couple',
              'Emergency mitigation protocols',
            ],
          },
        ],
        estimated_impact: {
          conflict_reduction_percentage: Math.round(
            (1 / factor.impact_multiplier) * 60,
          ),
          guest_satisfaction_improvement: Math.round(
            (1 / factor.impact_multiplier) * 40,
          ),
          planning_efficiency_gain: 20,
          risk_mitigation_effectiveness: Math.round(
            (1 / factor.impact_multiplier) * 70,
          ),
          implementation_success_probability:
            factor.mitigation_difficulty === 'difficult' ? 70 : 85,
          return_on_investment_score: Math.round(
            (1 / factor.impact_multiplier) * 80,
          ),
        },
      });
    });

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  /**
   * Utility methods
   */
  private calculateOverallRiskLevel(
    breakdown: SeverityBreakdown,
    patterns: RelationshipPattern[],
    riskFactors: RiskFactor[],
  ): ConflictRiskLevel {
    const severityScore = breakdown.severity_distribution_score;
    const patternRisk =
      patterns.reduce((sum, p) => sum + p.internal_conflict_rate, 0) /
      Math.max(patterns.length, 1);
    const factorRisk =
      riskFactors.length > 0
        ? riskFactors.filter(
            (rf) => rf.risk_level === 'high' || rf.risk_level === 'severe',
          ).length
        : 0;

    const overallScore = severityScore + patternRisk * 30 + factorRisk * 20;

    if (overallScore >= 80) return 'critical';
    if (overallScore >= 65) return 'severe';
    if (overallScore >= 50) return 'high';
    if (overallScore >= 35) return 'moderate';
    if (overallScore >= 20) return 'low';
    return 'minimal';
  }

  private calculatePatternAccuracy(patterns: RelationshipPattern[]): number {
    // Calculate average pattern strength as proxy for accuracy
    if (patterns.length === 0) return 0;
    return (
      patterns.reduce((sum, p) => sum + p.pattern_strength, 0) / patterns.length
    );
  }

  /**
   * Cache and utility methods
   */
  private generateAnalyticsCacheKey(coupleId: string, options: any): string {
    return `severity_analytics:${coupleId}:${JSON.stringify(options)}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    return this.analyticsCache.has(cacheKey); // Simplified cache validation
  }

  private async verifyAnalyticsPermissions(coupleId: string): Promise<void> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user) {
      throw new Error('Unauthorized access to analytics service');
    }
  }

  private async logAnalyticsMetrics(
    coupleId: string,
    result: SeverityAnalyticsResult,
  ): Promise<void> {
    try {
      await this.supabase.from('analytics_execution_log').insert({
        couple_id: coupleId,
        analytics_type: 'conflict_severity',
        execution_time_ms: result.performance_metrics.processing_time_ms,
        data_points_processed: result.performance_metrics.data_points_analyzed,
        patterns_detected: result.relationship_patterns.length,
        insights_generated: result.predictive_insights.length,
        risk_level: result.overall_conflict_risk,
        executed_at: result.analysis_timestamp,
      });
    } catch (error) {
      console.warn('Failed to log analytics metrics:', error);
    }
  }

  clearCache(): void {
    this.analyticsCache.clear();
    this.patternCache.clear();
  }

  getCacheStats(): { analytics: number; patterns: number } {
    return {
      analytics: this.analyticsCache.size,
      patterns: this.patternCache.size,
    };
  }
}

// Factory function
export async function createConflictSeverityAnalyticsService(
  serverClient?: ReturnType<typeof createServerClient>,
): Promise<ConflictSeverityAnalyticsService> {
  return new ConflictSeverityAnalyticsService(serverClient);
}

// Export schemas
export { analyticsRequestSchema };
