import { createClient } from '@supabase/supabase-js';
import { LTVPredictionEngine } from './ltv-prediction-engine';
import { CACCalculator } from './cac-calculator';

export interface PaybackAnalysis {
  segment: SupplierSegment;
  averagePaybackPeriod: number;
  medianPaybackPeriod: number;
  paybackDistribution: {
    under3months: number;
    months3to6: number;
    months6to12: number;
    over12months: number;
  };
  confidenceIntervals: {
    lower95: number;
    upper95: number;
  };
  seasonalVariations: SeasonalPaybackData[];
  recommendations: string[];
}

export interface SupplierSegment {
  name: string;
  businessType: string;
  subscriptionTier: string;
  acquisitionChannel: string;
  criteria: Record<string, any>;
}

export interface SeasonalPaybackData {
  month: number;
  monthName: string;
  averagePayback: number;
  adjustmentFactor: number;
  sampleSize: number;
}

export interface ForecastParameters {
  timeHorizon: number; // months
  segments: SupplierSegment[];
  scenarios: ('optimistic' | 'realistic' | 'pessimistic')[];
  marketFactors: {
    economicGrowth: number;
    weddingIndustryTrend: number;
    competitiveIntensity: number;
    seasonalityStrength: number;
  };
  confidenceLevel: number; // 0.9, 0.95, or 0.99
}

export interface FinancialForecast {
  forecastId: string;
  parameters: ForecastParameters;
  projections: ForecastProjection[];
  uncertaintyMetrics: {
    totalVariance: number;
    scenarioAnalysis: ScenarioResult[];
    sensitivityAnalysis: SensitivityResult[];
  };
  recommendations: ForecastRecommendation[];
  generatedAt: Date;
  confidence: number;
}

export interface ForecastProjection {
  period: Date;
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
  projectedRevenue: number;
  projectedLTV: number;
  projectedCAC: number;
  newSuppliers: number;
  churnRate: number;
  uncertaintyRange: [number, number];
}

export interface ScenarioResult {
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
  probability: number;
  totalRevenue: number;
  ltvCacRatio: number;
  impactFactors: string[];
}

export interface SensitivityResult {
  factor: string;
  impactOnRevenue: number;
  impactOnLTV: number;
  impactOnCAC: number;
  elasticity: number;
}

export interface ForecastRecommendation {
  type: 'strategic' | 'tactical' | 'risk_mitigation';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImpact: string;
  timeframe: string;
}

export interface RawFinancialMetrics {
  supplierId: string;
  period: Date;
  revenue: number;
  costs: number;
  ltv: number;
  cac: number;
  paybackPeriod: number;
  churnProbability: number;
  engagementScore: number;
}

export interface SeasonalFactors {
  weddingSeasonality: number[];
  economicCycles: number[];
  industryTrends: number[];
  competitiveLandscape: number[];
}

export interface AdjustedFinancialMetrics extends RawFinancialMetrics {
  adjustedRevenue: number;
  adjustedLTV: number;
  adjustedCAC: number;
  seasonalAdjustmentFactor: number;
  trendAdjustmentFactor: number;
  confidence: number;
}

export class FinancialMetricsProcessor {
  private supabase: any;
  private ltvEngine: LTVPredictionEngine;
  private cacCalculator: CACCalculator;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.ltvEngine = new LTVPredictionEngine();
    this.cacCalculator = new CACCalculator();
  }

  async calculatePaybackPeriods(
    supplierSegments: SupplierSegment[],
  ): Promise<PaybackAnalysis[]> {
    const analyses: PaybackAnalysis[] = [];

    for (const segment of supplierSegments) {
      try {
        // Get suppliers in this segment
        const suppliers = await this.getSuppliersInSegment(segment);

        if (suppliers.length < 10) {
          console.warn(
            `Insufficient data for segment ${segment.name}: ${suppliers.length} suppliers`,
          );
          continue;
        }

        // Calculate payback periods for each supplier
        const paybackPeriods =
          await this.calculateSegmentPaybackPeriods(suppliers);

        // Statistical analysis
        const sortedPaybacks = paybackPeriods.sort((a, b) => a - b);
        const averagePayback =
          paybackPeriods.reduce((sum, p) => sum + p, 0) / paybackPeriods.length;
        const medianPayback = this.calculateMedian(sortedPaybacks);

        // Distribution analysis
        const paybackDistribution = {
          under3months:
            paybackPeriods.filter((p) => p <= 3).length / paybackPeriods.length,
          months3to6:
            paybackPeriods.filter((p) => p > 3 && p <= 6).length /
            paybackPeriods.length,
          months6to12:
            paybackPeriods.filter((p) => p > 6 && p <= 12).length /
            paybackPeriods.length,
          over12months:
            paybackPeriods.filter((p) => p > 12).length / paybackPeriods.length,
        };

        // Confidence intervals
        const confidenceIntervals = this.calculateConfidenceIntervals(
          paybackPeriods,
          0.95,
        );

        // Seasonal variations
        const seasonalVariations =
          await this.calculateSeasonalPaybackVariations(segment, suppliers);

        // Generate recommendations
        const recommendations = this.generatePaybackRecommendations(
          averagePayback,
          paybackDistribution,
          segment,
        );

        analyses.push({
          segment,
          averagePaybackPeriod: Math.round(averagePayback * 100) / 100,
          medianPaybackPeriod: Math.round(medianPayback * 100) / 100,
          paybackDistribution,
          confidenceIntervals,
          seasonalVariations,
          recommendations,
        });
      } catch (error) {
        console.error(
          `Failed to analyze payback for segment ${segment.name}:`,
          error,
        );
      }
    }

    return analyses.sort(
      (a, b) => a.averagePaybackPeriod - b.averagePaybackPeriod,
    );
  }

  async generateFinancialForecast(
    forecastParams: ForecastParameters,
  ): Promise<FinancialForecast> {
    const forecastId = `forecast_${Date.now()}`;
    const projections: ForecastProjection[] = [];

    try {
      // Generate projections for each scenario
      for (const scenario of forecastParams.scenarios) {
        const scenarioProjections = await this.generateScenarioProjections(
          forecastParams,
          scenario,
        );
        projections.push(...scenarioProjections);
      }

      // Calculate uncertainty metrics
      const uncertaintyMetrics = await this.calculateUncertaintyMetrics(
        projections,
        forecastParams,
      );

      // Generate recommendations
      const recommendations = this.generateForecastRecommendations(
        projections,
        uncertaintyMetrics,
        forecastParams,
      );

      // Calculate overall confidence
      const confidence = this.calculateForecastConfidence(
        projections,
        uncertaintyMetrics,
        forecastParams,
      );

      return {
        forecastId,
        parameters: forecastParams,
        projections,
        uncertaintyMetrics,
        recommendations,
        generatedAt: new Date(),
        confidence,
      };
    } catch (error) {
      throw new Error(`Financial forecast generation failed: ${error.message}`);
    }
  }

  private async applySeasonalAdjustments(
    rawMetrics: RawFinancialMetrics,
    seasonalFactors: SeasonalFactors,
  ): Promise<AdjustedFinancialMetrics> {
    const currentMonth = rawMetrics.period.getMonth();

    // Apply wedding seasonality (peak months: May, June, September, October)
    const weddingSeasonalityFactor =
      seasonalFactors.weddingSeasonality[currentMonth];

    // Apply economic cycle adjustments
    const economicFactor = seasonalFactors.economicCycles[currentMonth];

    // Apply industry trend adjustments
    const industryFactor = seasonalFactors.industryTrends[currentMonth];

    // Apply competitive landscape adjustments
    const competitiveFactor =
      seasonalFactors.competitiveLandscape[currentMonth];

    // Combined seasonal adjustment
    const seasonalAdjustmentFactor =
      weddingSeasonalityFactor * 0.4 +
      economicFactor * 0.25 +
      industryFactor * 0.2 +
      competitiveFactor * 0.15;

    // Calculate trend adjustment using moving averages
    const trendAdjustmentFactor =
      await this.calculateTrendAdjustment(rawMetrics);

    // Apply adjustments
    const adjustedRevenue =
      rawMetrics.revenue * seasonalAdjustmentFactor * trendAdjustmentFactor;
    const adjustedLTV = rawMetrics.ltv * seasonalAdjustmentFactor;
    const adjustedCAC = rawMetrics.cac / seasonalAdjustmentFactor; // Inverse relationship

    // Calculate confidence based on data quality and adjustment magnitude
    const adjustmentMagnitude =
      Math.abs(seasonalAdjustmentFactor - 1) +
      Math.abs(trendAdjustmentFactor - 1);
    const confidence = Math.max(
      0.5,
      Math.min(0.95, 1 - adjustmentMagnitude * 0.5),
    );

    return {
      ...rawMetrics,
      adjustedRevenue,
      adjustedLTV,
      adjustedCAC,
      seasonalAdjustmentFactor,
      trendAdjustmentFactor,
      confidence,
    };
  }

  private async getSuppliersInSegment(
    segment: SupplierSegment,
  ): Promise<string[]> {
    let query = this.supabase.from('suppliers').select('id');

    // Apply segment criteria
    if (segment.businessType && segment.businessType !== 'all') {
      query = query.eq('business_type', segment.businessType);
    }
    if (segment.subscriptionTier && segment.subscriptionTier !== 'all') {
      query = query.eq('subscription_tier', segment.subscriptionTier);
    }
    if (segment.acquisitionChannel && segment.acquisitionChannel !== 'all') {
      query = query.eq('acquisition_channel', segment.acquisitionChannel);
    }

    // Apply additional criteria
    if (segment.criteria) {
      Object.entries(segment.criteria).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.map((s) => s.id) || [];
  }

  private async calculateSegmentPaybackPeriods(
    suppliers: string[],
  ): Promise<number[]> {
    const paybackPeriods: number[] = [];

    for (const supplierId of suppliers) {
      try {
        // Get supplier's LTV and CAC data
        const { data: ltvData } = await this.supabase
          .from('customer_ltv_calculations')
          .select('predicted_ltv_24m')
          .eq('customer_id', supplierId)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .single();

        const { data: revenueData } = await this.supabase
          .from('subscription_revenue')
          .select('mrr_amount')
          .eq('customer_id', supplierId)
          .order('revenue_date', { ascending: false })
          .limit(3); // Last 3 months for averaging

        const { data: cacData } = await this.supabase
          .from('marketing_attribution')
          .select('cost_per_touchpoint')
          .eq('customer_id', supplierId);

        if (ltvData && revenueData?.length && cacData?.length) {
          const avgMRR =
            revenueData.reduce((sum, r) => sum + r.mrr_amount, 0) /
            revenueData.length;
          const totalCAC = cacData.reduce(
            (sum, c) => sum + (c.cost_per_touchpoint || 0),
            0,
          );

          if (avgMRR > 0) {
            const paybackMonths = totalCAC / avgMRR;
            paybackPeriods.push(Math.max(0, paybackMonths));
          }
        }
      } catch (error) {
        console.warn(
          `Failed to calculate payback for supplier ${supplierId}:`,
          error,
        );
      }
    }

    return paybackPeriods;
  }

  private calculateMedian(sortedArray: number[]): number {
    const mid = Math.floor(sortedArray.length / 2);
    return sortedArray.length % 2 === 0
      ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
      : sortedArray[mid];
  }

  private calculateConfidenceIntervals(
    data: number[],
    confidenceLevel: number,
  ): { lower95: number; upper95: number } {
    if (data.length < 2) return { lower95: 0, upper95: 0 };

    const sortedData = [...data].sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const lowerIndex = Math.floor((alpha / 2) * sortedData.length);
    const upperIndex = Math.floor((1 - alpha / 2) * sortedData.length) - 1;

    return {
      lower95: sortedData[Math.max(0, lowerIndex)],
      upper95: sortedData[Math.min(sortedData.length - 1, upperIndex)],
    };
  }

  private async calculateSeasonalPaybackVariations(
    segment: SupplierSegment,
    suppliers: string[],
  ): Promise<SeasonalPaybackData[]> {
    const seasonalData: SeasonalPaybackData[] = [];
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    for (let month = 0; month < 12; month++) {
      try {
        // Get payback data for suppliers acquired in this month
        const { data: seasonalSuppliers } = await this.supabase
          .from('customer_lifecycle_events')
          .select('customer_id')
          .in('customer_id', suppliers)
          .eq('event_type', 'acquisition')
          .gte(
            'event_timestamp',
            new Date(new Date().getFullYear(), month, 1).toISOString(),
          )
          .lt(
            'event_timestamp',
            new Date(new Date().getFullYear(), month + 1, 1).toISOString(),
          );

        if (seasonalSuppliers?.length) {
          const monthlyPaybacks = await this.calculateSegmentPaybackPeriods(
            seasonalSuppliers.map((s) => s.customer_id),
          );

          const averagePayback =
            monthlyPaybacks.length > 0
              ? monthlyPaybacks.reduce((sum, p) => sum + p, 0) /
                monthlyPaybacks.length
              : 0;

          // Calculate adjustment factor (relative to annual average)
          const annualAverage = await this.getAnnualAveragePayback(segment);
          const adjustmentFactor =
            annualAverage > 0 ? averagePayback / annualAverage : 1;

          seasonalData.push({
            month,
            monthName: monthNames[month],
            averagePayback,
            adjustmentFactor,
            sampleSize: monthlyPaybacks.length,
          });
        } else {
          seasonalData.push({
            month,
            monthName: monthNames[month],
            averagePayback: 0,
            adjustmentFactor: 1,
            sampleSize: 0,
          });
        }
      } catch (error) {
        console.warn(
          `Failed to calculate seasonal data for month ${month}:`,
          error,
        );
      }
    }

    return seasonalData;
  }

  private async getAnnualAveragePayback(
    segment: SupplierSegment,
  ): Promise<number> {
    const suppliers = await this.getSuppliersInSegment(segment);
    const paybacks = await this.calculateSegmentPaybackPeriods(suppliers);

    return paybacks.length > 0
      ? paybacks.reduce((sum, p) => sum + p, 0) / paybacks.length
      : 0;
  }

  private generatePaybackRecommendations(
    averagePayback: number,
    distribution: any,
    segment: SupplierSegment,
  ): string[] {
    const recommendations: string[] = [];

    if (averagePayback > 12) {
      recommendations.push(
        'Payback period exceeds 12 months - consider reducing CAC or increasing early revenue',
      );
    }

    if (distribution.under3months > 0.5) {
      recommendations.push(
        'Excellent payback performance - consider increasing investment in this segment',
      );
    }

    if (distribution.over12months > 0.3) {
      recommendations.push(
        'High proportion of long payback periods - review acquisition channel effectiveness',
      );
    }

    if (segment.businessType === 'photographer' && averagePayback > 8) {
      recommendations.push(
        'Photography segment underperforming - review pricing strategy and value proposition',
      );
    }

    if (segment.subscriptionTier === 'basic' && averagePayback > 6) {
      recommendations.push(
        'Basic tier showing long payback - consider upsell strategies or pricing optimization',
      );
    }

    return recommendations;
  }

  private async generateScenarioProjections(
    params: ForecastParameters,
    scenario: 'optimistic' | 'realistic' | 'pessimistic',
  ): Promise<ForecastProjection[]> {
    const projections: ForecastProjection[] = [];
    const baseDate = new Date();

    // Scenario multipliers
    const multipliers = {
      optimistic: {
        revenue: 1.3,
        ltv: 1.25,
        cac: 0.85,
        newSuppliers: 1.4,
        churn: 0.7,
      },
      realistic: {
        revenue: 1.0,
        ltv: 1.0,
        cac: 1.0,
        newSuppliers: 1.0,
        churn: 1.0,
      },
      pessimistic: {
        revenue: 0.75,
        ltv: 0.85,
        cac: 1.2,
        newSuppliers: 0.7,
        churn: 1.4,
      },
    };

    const scenarioMultiplier = multipliers[scenario];

    for (let month = 1; month <= params.timeHorizon; month++) {
      const projectionDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + month,
        1,
      );

      // Get historical baseline metrics
      const baselineMetrics = await this.getBaselineMetrics(projectionDate);

      // Apply market factors and scenario adjustments
      const marketAdjustment = this.calculateMarketAdjustment(
        params.marketFactors,
        projectionDate,
      );
      const seasonalAdjustment = this.getSeasonalAdjustment(projectionDate);

      const projectedRevenue =
        baselineMetrics.revenue *
        scenarioMultiplier.revenue *
        marketAdjustment *
        seasonalAdjustment;

      const projectedLTV =
        baselineMetrics.ltv * scenarioMultiplier.ltv * marketAdjustment;
      const projectedCAC =
        (baselineMetrics.cac * scenarioMultiplier.cac) / marketAdjustment;
      const newSuppliers = Math.round(
        baselineMetrics.newSuppliers * scenarioMultiplier.newSuppliers,
      );
      const churnRate = baselineMetrics.churnRate * scenarioMultiplier.churn;

      // Calculate uncertainty range
      const uncertaintyFactor = this.calculateUncertaintyFactor(
        month,
        scenario,
      );
      const uncertaintyRange: [number, number] = [
        projectedRevenue * (1 - uncertaintyFactor),
        projectedRevenue * (1 + uncertaintyFactor),
      ];

      projections.push({
        period: projectionDate,
        scenario,
        projectedRevenue,
        projectedLTV,
        projectedCAC,
        newSuppliers,
        churnRate,
        uncertaintyRange,
      });
    }

    return projections;
  }

  private async getBaselineMetrics(date: Date): Promise<{
    revenue: number;
    ltv: number;
    cac: number;
    newSuppliers: number;
    churnRate: number;
  }> {
    // Get historical averages from the last 6 months
    const sixMonthsAgo = new Date(
      date.getTime() - 6 * 30 * 24 * 60 * 60 * 1000,
    );

    const { data: revenueData } = await this.supabase
      .from('subscription_revenue')
      .select('net_revenue')
      .gte('revenue_date', sixMonthsAgo.toISOString().split('T')[0])
      .lt('revenue_date', date.toISOString().split('T')[0]);

    const { data: ltvData } = await this.supabase
      .from('customer_ltv_calculations')
      .select('predicted_ltv_24m')
      .gte('calculation_date', sixMonthsAgo.toISOString().split('T')[0])
      .lt('calculation_date', date.toISOString().split('T')[0]);

    const { data: cacData } = await this.supabase
      .from('customer_acquisition_costs')
      .select('cac')
      .gte('period_start', sixMonthsAgo.toISOString().split('T')[0])
      .lt('period_start', date.toISOString().split('T')[0]);

    const { data: supplierData } = await this.supabase
      .from('customer_lifecycle_events')
      .select('customer_id')
      .eq('event_type', 'acquisition')
      .gte('event_timestamp', sixMonthsAgo.toISOString())
      .lt('event_timestamp', date.toISOString());

    const { data: churnData } = await this.supabase
      .from('customer_lifecycle_events')
      .select('customer_id')
      .eq('event_type', 'churn')
      .gte('event_timestamp', sixMonthsAgo.toISOString())
      .lt('event_timestamp', date.toISOString());

    return {
      revenue: revenueData?.reduce((sum, r) => sum + r.net_revenue, 0) || 0,
      ltv:
        ltvData?.reduce((sum, l) => sum + l.predicted_ltv_24m, 0) /
          (ltvData?.length || 1) || 0,
      cac:
        cacData?.reduce((sum, c) => sum + c.cac, 0) / (cacData?.length || 1) ||
        0,
      newSuppliers: supplierData?.length || 0,
      churnRate:
        (churnData?.length || 0) / Math.max(1, supplierData?.length || 1),
    };
  }

  private calculateMarketAdjustment(marketFactors: any, date: Date): number {
    // Combine market factors with weights
    return (
      marketFactors.economicGrowth * 0.3 +
      marketFactors.weddingIndustryTrend * 0.4 +
      marketFactors.competitiveIntensity * 0.2 +
      marketFactors.seasonalityStrength * 0.1
    );
  }

  private getSeasonalAdjustment(date: Date): number {
    const month = date.getMonth();
    // Wedding industry seasonality (peak in spring/fall)
    const seasonalFactors = [
      0.8, 0.85, 0.95, 1.1, 1.3, 1.4, 1.2, 1.0, 1.35, 1.25, 0.9, 0.85,
    ];
    return seasonalFactors[month];
  }

  private calculateUncertaintyFactor(
    monthsOut: number,
    scenario: string,
  ): number {
    // Uncertainty increases with time horizon
    const baseUncertainty =
      {
        optimistic: 0.15,
        realistic: 0.1,
        pessimistic: 0.2,
      }[scenario] || 0.1;

    return baseUncertainty * (1 + monthsOut * 0.02);
  }

  private async calculateUncertaintyMetrics(
    projections: ForecastProjection[],
    params: ForecastParameters,
  ): Promise<{
    totalVariance: number;
    scenarioAnalysis: ScenarioResult[];
    sensitivityAnalysis: SensitivityResult[];
  }> {
    // Calculate variance across scenarios
    const revenuesByScenario = projections.reduce(
      (acc, p) => {
        if (!acc[p.scenario]) acc[p.scenario] = [];
        acc[p.scenario].push(p.projectedRevenue);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const allRevenues = Object.values(revenuesByScenario).flat();
    const meanRevenue =
      allRevenues.reduce((sum, r) => sum + r, 0) / allRevenues.length;
    const totalVariance =
      allRevenues.reduce((sum, r) => sum + Math.pow(r - meanRevenue, 2), 0) /
      allRevenues.length;

    // Scenario analysis
    const scenarioAnalysis: ScenarioResult[] = params.scenarios.map(
      (scenario) => {
        const scenarioProjections = projections.filter(
          (p) => p.scenario === scenario,
        );
        const totalRevenue = scenarioProjections.reduce(
          (sum, p) => sum + p.projectedRevenue,
          0,
        );
        const avgLTV =
          scenarioProjections.reduce((sum, p) => sum + p.projectedLTV, 0) /
          scenarioProjections.length;
        const avgCAC =
          scenarioProjections.reduce((sum, p) => sum + p.projectedCAC, 0) /
          scenarioProjections.length;

        return {
          scenario,
          probability:
            scenario === 'realistic'
              ? 0.5
              : scenario === 'optimistic'
                ? 0.25
                : 0.25,
          totalRevenue,
          ltvCacRatio: avgLTV / avgCAC,
          impactFactors: this.getScenarioImpactFactors(scenario),
        };
      },
    );

    // Sensitivity analysis
    const sensitivityAnalysis: SensitivityResult[] = [
      {
        factor: 'Economic Growth',
        impactOnRevenue: params.marketFactors.economicGrowth * 0.3,
        impactOnLTV: params.marketFactors.economicGrowth * 0.2,
        impactOnCAC: -params.marketFactors.economicGrowth * 0.1,
        elasticity: 1.5,
      },
      {
        factor: 'Wedding Industry Trend',
        impactOnRevenue: params.marketFactors.weddingIndustryTrend * 0.4,
        impactOnLTV: params.marketFactors.weddingIndustryTrend * 0.3,
        impactOnCAC: -params.marketFactors.weddingIndustryTrend * 0.15,
        elasticity: 2.0,
      },
      {
        factor: 'Competitive Intensity',
        impactOnRevenue: -params.marketFactors.competitiveIntensity * 0.2,
        impactOnLTV: -params.marketFactors.competitiveIntensity * 0.1,
        impactOnCAC: params.marketFactors.competitiveIntensity * 0.25,
        elasticity: 1.2,
      },
    ];

    return {
      totalVariance,
      scenarioAnalysis,
      sensitivityAnalysis,
    };
  }

  private getScenarioImpactFactors(scenario: string): string[] {
    switch (scenario) {
      case 'optimistic':
        return [
          'Strong economic growth',
          'Wedding industry expansion',
          'Successful product launches',
          'Market share gains',
        ];
      case 'pessimistic':
        return [
          'Economic downturn',
          'Industry consolidation',
          'Increased competition',
          'Market saturation',
        ];
      default:
        return [
          'Steady market conditions',
          'Normal competitive environment',
          'Moderate growth',
        ];
    }
  }

  private generateForecastRecommendations(
    projections: ForecastProjection[],
    uncertaintyMetrics: any,
    params: ForecastParameters,
  ): ForecastRecommendation[] {
    const recommendations: ForecastRecommendation[] = [];

    // Revenue-based recommendations
    const avgRevenueGrowth = this.calculateAverageGrowthRate(projections);
    if (avgRevenueGrowth > 0.2) {
      recommendations.push({
        type: 'strategic',
        priority: 'high',
        recommendation:
          'Strong growth projected - consider scaling operations and marketing investment',
        expectedImpact: 'Revenue acceleration',
        timeframe: 'Next 6 months',
      });
    }

    // LTV:CAC ratio recommendations
    const avgLtvCacRatio =
      uncertaintyMetrics.scenarioAnalysis.reduce(
        (sum: number, s: any) => sum + s.ltvCacRatio,
        0,
      ) / uncertaintyMetrics.scenarioAnalysis.length;
    if (avgLtvCacRatio < 3) {
      recommendations.push({
        type: 'tactical',
        priority: 'high',
        recommendation:
          'LTV:CAC ratio below healthy threshold - optimize customer acquisition efficiency',
        expectedImpact: 'Improved unit economics',
        timeframe: 'Next 3 months',
      });
    }

    // Risk mitigation
    if (uncertaintyMetrics.totalVariance > 1000000) {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'medium',
        recommendation:
          'High forecast uncertainty - diversify revenue streams and maintain cash reserves',
        expectedImpact: 'Reduced business risk',
        timeframe: 'Ongoing',
      });
    }

    return recommendations;
  }

  private calculateAverageGrowthRate(
    projections: ForecastProjection[],
  ): number {
    const realisticProjections = projections
      .filter((p) => p.scenario === 'realistic')
      .sort((a, b) => a.period.getTime() - b.period.getTime());

    if (realisticProjections.length < 2) return 0;

    const firstPeriod = realisticProjections[0].projectedRevenue;
    const lastPeriod =
      realisticProjections[realisticProjections.length - 1].projectedRevenue;

    return firstPeriod > 0 ? (lastPeriod - firstPeriod) / firstPeriod : 0;
  }

  private calculateForecastConfidence(
    projections: ForecastProjection[],
    uncertaintyMetrics: any,
    params: ForecastParameters,
  ): number {
    // Base confidence on data quality, time horizon, and uncertainty
    let confidence = 0.8;

    // Adjust for time horizon (longer = less confident)
    confidence *= Math.max(0.5, 1 - (params.timeHorizon / 36) * 0.3);

    // Adjust for uncertainty level
    const normalizedVariance = Math.min(
      1,
      uncertaintyMetrics.totalVariance / 10000000,
    );
    confidence *= 1 - normalizedVariance * 0.3;

    // Adjust for market factor volatility
    const marketVolatility =
      Object.values(params.marketFactors).reduce(
        (sum: number, val: number) => sum + Math.abs(val - 1),
        0,
      ) / 4;
    confidence *= Math.max(0.5, 1 - marketVolatility * 0.2);

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private async calculateTrendAdjustment(
    metrics: RawFinancialMetrics,
  ): Promise<number> {
    // Simple trend adjustment based on 3-month moving average
    // In a full implementation, this would use more sophisticated time series analysis
    return 1.0; // Placeholder - no adjustment
  }
}

export default FinancialMetricsProcessor;
