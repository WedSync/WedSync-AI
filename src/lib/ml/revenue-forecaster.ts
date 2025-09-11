/**
 * WS-232 Revenue Forecasting Model
 * Predicts MRR with wedding industry seasonality and growth patterns
 */

import { createServerClient } from '@supabase/ssr';

// Types and interfaces
export interface RevenueForecast {
  horizonMonths: number;
  baseline: number[];
  optimistic: number[];
  pessimistic: number[];
  keyDrivers: string[];
  confidence: number;
  seasonalFactors: number[];
  growthRate: number;
  churnImpact: number;
  newAcquisitions: number[];
  upgradeRevenue: number[];
  totalPredicted: number;
  modelVersion: string;
  generatedAt: Date;
}

export interface RevenueStreams {
  currentMRR: number;
  newSignups: number[];
  upgrades: number[];
  downgrades: number[];
  churn: number[];
  seasonalMultipliers: number[];
  marketConditions: 'recession' | 'growth' | 'stable';
}

export interface RevenueMetrics {
  monthlyRecurring: number;
  churnRate: number;
  ltv: number;
  cac: number;
  growthRate: number;
  seasonalVariance: number;
  marketTrend: number;
}

/**
 * Wedding Industry Revenue Forecasting System
 * Accounts for wedding seasonality, vendor-specific growth patterns, and market dynamics
 */
export class RevenueForecaster {
  private readonly MODEL_VERSION = '1.2.0';
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  // Wedding season revenue multipliers (June = peak, Dec = trough)
  private readonly SEASONAL_REVENUE_MULTIPLIERS = {
    january: 0.7, // Post-holiday recovery
    february: 0.8, // Engagement season starts
    march: 1.0, // Wedding planning ramp-up
    april: 1.2, // Spring wedding bookings
    may: 1.4, // Peak booking season
    june: 1.6, // Peak wedding season
    july: 1.5, // Summer weddings continue
    august: 1.3, // Late summer season
    september: 1.1, // Fall wedding season
    october: 1.0, // Post-season normalization
    november: 0.9, // Holiday prep slowdown
    december: 0.6, // Holiday season low
  };

  // Industry growth patterns by vendor type
  private readonly VENDOR_GROWTH_PROFILES = {
    photographer: {
      baseGrowth: 0.15,
      seasonalSensitivity: 0.8,
      marketElasticity: 1.2,
    },
    venue: {
      baseGrowth: 0.08,
      seasonalSensitivity: 0.3,
      marketElasticity: 0.7,
    },
    catering: {
      baseGrowth: 0.12,
      seasonalSensitivity: 0.6,
      marketElasticity: 1.0,
    },
    florist: {
      baseGrowth: 0.18,
      seasonalSensitivity: 0.9,
      marketElasticity: 1.3,
    },
    planner: {
      baseGrowth: 0.1,
      seasonalSensitivity: 0.4,
      marketElasticity: 0.9,
    },
    dj: { baseGrowth: 0.22, seasonalSensitivity: 0.7, marketElasticity: 1.1 },
    other: {
      baseGrowth: 0.14,
      seasonalSensitivity: 0.7,
      marketElasticity: 1.0,
    },
  };

  // Market condition adjustments
  private readonly MARKET_ADJUSTMENTS = {
    recession: { multiplier: 0.7, volatility: 1.5, churnIncrease: 0.3 },
    growth: { multiplier: 1.3, volatility: 1.2, churnIncrease: -0.1 },
    stable: { multiplier: 1.0, volatility: 1.0, churnIncrease: 0.0 },
  };

  private supabase: any;

  constructor() {
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return undefined;
          },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      },
    );
  }

  /**
   * Generate comprehensive revenue forecast
   * @param horizonMonths - Number of months to forecast
   * @param scenarios - Include baseline, optimistic, pessimistic scenarios
   * @returns Promise<RevenueForecast>
   */
  async forecastRevenue(
    horizonMonths: number,
    scenarios: ('baseline' | 'optimistic' | 'pessimistic')[] = [
      'baseline',
      'optimistic',
      'pessimistic',
    ],
  ): Promise<RevenueForecast> {
    try {
      // Extract current revenue metrics
      const currentMetrics = await this.extractRevenueMetrics();

      // Analyze market conditions
      const marketConditions = await this.analyzeMarketConditions();

      // Generate seasonal multipliers for forecast period
      const seasonalFactors = this.generateSeasonalFactors(horizonMonths);

      // Create revenue streams
      const revenueStreams: RevenueStreams = {
        currentMRR: currentMetrics.monthlyRecurring,
        newSignups: await this.predictNewSignups(horizonMonths, currentMetrics),
        upgrades: await this.predictUpgrades(horizonMonths, currentMetrics),
        downgrades: await this.predictDowngrades(horizonMonths, currentMetrics),
        churn: await this.predictChurn(horizonMonths, currentMetrics),
        seasonalMultipliers: seasonalFactors,
        marketConditions,
      };

      // Generate scenarios
      const baseline = scenarios.includes('baseline')
        ? this.calculateScenario(revenueStreams, 'baseline')
        : [];

      const optimistic = scenarios.includes('optimistic')
        ? this.calculateScenario(revenueStreams, 'optimistic')
        : [];

      const pessimistic = scenarios.includes('pessimistic')
        ? this.calculateScenario(revenueStreams, 'pessimistic')
        : [];

      // Identify key revenue drivers
      const keyDrivers = this.identifyKeyDrivers(
        revenueStreams,
        currentMetrics,
      );

      // Calculate confidence based on data quality and market stability
      const confidence = this.calculateForecastConfidence(
        currentMetrics,
        marketConditions,
      );

      const forecast: RevenueForecast = {
        horizonMonths,
        baseline,
        optimistic,
        pessimistic,
        keyDrivers,
        confidence,
        seasonalFactors,
        growthRate: currentMetrics.growthRate,
        churnImpact: revenueStreams.churn.reduce(
          (sum, churn) => sum + churn,
          0,
        ),
        newAcquisitions: revenueStreams.newSignups,
        upgradeRevenue: revenueStreams.upgrades,
        totalPredicted: baseline[baseline.length - 1] || 0,
        modelVersion: this.MODEL_VERSION,
        generatedAt: new Date(),
      };

      // Log forecast to database
      await this.logForecast(forecast, revenueStreams, currentMetrics);

      return forecast;
    } catch (error) {
      console.error('Revenue forecasting failed:', error);
      throw new Error(`Revenue forecasting failed: ${error}`);
    }
  }

  /**
   * Extract current revenue metrics from database
   */
  private async extractRevenueMetrics(): Promise<RevenueMetrics> {
    // Get current MRR
    const { data: mrrData } = await this.supabase.rpc('get_current_mrr');
    const currentMRR = mrrData?.[0]?.total_mrr || 0;

    // Calculate churn rate (last 30 days)
    const { data: churnData } = await this.supabase.rpc(
      'calculate_churn_rate',
      {
        days_back: 30,
      },
    );
    const churnRate = churnData?.[0]?.churn_rate || 0.05;

    // Calculate average LTV
    const { data: ltvData } = await this.supabase.rpc('calculate_average_ltv');
    const ltv = ltvData?.[0]?.avg_ltv || 1200;

    // Calculate CAC (placeholder - would integrate with marketing data)
    const cac = 85; // Average customer acquisition cost

    // Calculate growth rate (MoM for last 3 months)
    const { data: growthData } = await this.supabase.rpc(
      'calculate_growth_rate',
      {
        months_back: 3,
      },
    );
    const growthRate = growthData?.[0]?.growth_rate || 0.08;

    // Calculate seasonal variance
    const { data: seasonalData } = await this.supabase.rpc(
      'calculate_seasonal_variance',
    );
    const seasonalVariance = seasonalData?.[0]?.variance || 0.3;

    // Market trend analysis (placeholder - would integrate with external data)
    const marketTrend = 0.05; // 5% positive market trend

    return {
      monthlyRecurring: currentMRR,
      churnRate,
      ltv,
      cac,
      growthRate,
      seasonalVariance,
      marketTrend,
    };
  }

  /**
   * Analyze current market conditions
   */
  private async analyzeMarketConditions(): Promise<
    'recession' | 'growth' | 'stable'
  > {
    // Simplified market analysis - in production would integrate external economic data
    const { data: recentMetrics } = await this.supabase.rpc(
      'get_recent_business_metrics',
      {
        months_back: 6,
      },
    );

    if (!recentMetrics || recentMetrics.length < 3) {
      return 'stable'; // Default if insufficient data
    }

    // Analyze growth trend
    const recentGrowth = recentMetrics.map((m: any) => m.growth_rate);
    const avgGrowth =
      recentGrowth.reduce((sum: number, rate: number) => sum + rate, 0) /
      recentGrowth.length;

    // Analyze churn trend
    const recentChurn = recentMetrics.map((m: any) => m.churn_rate);
    const avgChurn =
      recentChurn.reduce((sum: number, rate: number) => sum + rate, 0) /
      recentChurn.length;

    // Determine market conditions
    if (avgGrowth < 0.02 && avgChurn > 0.08) {
      return 'recession'; // Low growth, high churn
    } else if (avgGrowth > 0.15 && avgChurn < 0.04) {
      return 'growth'; // High growth, low churn
    } else {
      return 'stable'; // Normal conditions
    }
  }

  /**
   * Generate seasonal multipliers for forecast horizon
   */
  private generateSeasonalFactors(horizonMonths: number): number[] {
    const factors: number[] = [];
    const currentDate = new Date();

    for (let i = 0; i < horizonMonths; i++) {
      const forecastDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + i,
        1,
      );
      const monthName = forecastDate
        .toLocaleString('en-US', { month: 'long' })
        .toLowerCase();
      const multiplier =
        this.SEASONAL_REVENUE_MULTIPLIERS[
          monthName as keyof typeof this.SEASONAL_REVENUE_MULTIPLIERS
        ] || 1.0;
      factors.push(multiplier);
    }

    return factors;
  }

  /**
   * Predict new signups based on historical patterns and growth
   */
  private async predictNewSignups(
    horizonMonths: number,
    metrics: RevenueMetrics,
  ): Promise<number[]> {
    const signups: number[] = [];

    // Base signup rate from current metrics
    const baseSignupsPerMonth = Math.max(
      10,
      (metrics.monthlyRecurring / metrics.ltv) * 12,
    ); // Monthly signups needed to sustain current MRR

    for (let month = 0; month < horizonMonths; month++) {
      // Apply growth rate
      const growthAdjusted =
        baseSignupsPerMonth * Math.pow(1 + metrics.growthRate, month / 12);

      // Apply seasonal adjustment
      const seasonalAdjusted =
        growthAdjusted * this.generateSeasonalFactors(1)[0];

      // Add some natural variance
      const variance = 1 + (Math.random() - 0.5) * 0.2; // ±10% variance
      const finalSignups = Math.round(seasonalAdjusted * variance);

      signups.push(Math.max(5, finalSignups)); // Minimum 5 signups per month
    }

    return signups;
  }

  /**
   * Predict upgrades based on customer lifecycle
   */
  private async predictUpgrades(
    horizonMonths: number,
    metrics: RevenueMetrics,
  ): Promise<number[]> {
    const upgrades: number[] = [];

    // Base upgrade rate (typically 5-10% of customer base per month)
    const { data: customerCount } = await this.supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true });

    const baseUpgradeRate = 0.06; // 6% monthly upgrade rate
    const baseUpgradeRevenue = 30; // Average upgrade revenue

    for (let month = 0; month < horizonMonths; month++) {
      const estimatedCustomers =
        (customerCount?.count || 100) *
        Math.pow(1 + metrics.growthRate, month / 12);
      const upgrades_count = estimatedCustomers * baseUpgradeRate;
      const upgradeRevenue = upgrades_count * baseUpgradeRevenue;

      // Apply seasonal adjustment (upgrades less seasonal than new signups)
      const seasonalMultiplier = 0.8 + 0.2 * this.generateSeasonalFactors(1)[0]; // Dampened seasonality
      upgrades.push(upgradeRevenue * seasonalMultiplier);
    }

    return upgrades;
  }

  /**
   * Predict downgrades and their revenue impact
   */
  private async predictDowngrades(
    horizonMonths: number,
    metrics: RevenueMetrics,
  ): Promise<number[]> {
    const downgrades: number[] = [];

    // Downgrades typically 2-4% of customer base per month
    const baseDowngradeRate = 0.03;
    const avgDowngradeImpact = -20; // Average revenue loss per downgrade

    for (let month = 0; month < horizonMonths; month++) {
      // During recession, downgrades increase
      const marketAdjustment = metrics.marketTrend < 0 ? 1.5 : 1.0;
      const downgradeRevenue =
        baseDowngradeRate * avgDowngradeImpact * marketAdjustment;
      downgrades.push(downgradeRevenue);
    }

    return downgrades;
  }

  /**
   * Predict churn-based revenue loss
   */
  private async predictChurn(
    horizonMonths: number,
    metrics: RevenueMetrics,
  ): Promise<number[]> {
    const churnLoss: number[] = [];
    let cumulativeMRR = metrics.monthlyRecurring;

    for (let month = 0; month < horizonMonths; month++) {
      // Churn rate varies by season (higher in off-season)
      const seasonalChurnMultiplier =
        this.generateSeasonalFactors(1)[0] < 1.0 ? 1.3 : 0.9;
      const adjustedChurnRate = metrics.churnRate * seasonalChurnMultiplier;

      const monthlyChurnLoss = cumulativeMRR * adjustedChurnRate;
      churnLoss.push(monthlyChurnLoss);

      // Update cumulative MRR for next month
      cumulativeMRR = Math.max(0, cumulativeMRR - monthlyChurnLoss);
    }

    return churnLoss;
  }

  /**
   * Calculate revenue scenario (baseline, optimistic, pessimistic)
   */
  private calculateScenario(
    streams: RevenueStreams,
    scenario: 'baseline' | 'optimistic' | 'pessimistic',
  ): number[] {
    const revenue: number[] = [];
    let currentMRR = streams.currentMRR;

    // Scenario multipliers
    const multipliers = {
      baseline: 1.0,
      optimistic: 1.25, // 25% better than baseline
      pessimistic: 0.75, // 25% worse than baseline
    };

    const scenarioMultiplier = multipliers[scenario];

    for (let month = 0; month < streams.seasonalMultipliers.length; month++) {
      // Calculate net revenue change for the month
      const newSignupRevenue = (streams.newSignups[month] || 0) * 25; // Assume $25 average revenue per new signup
      const upgradeRevenue = streams.upgrades[month] || 0;
      const downgradeImpact = streams.downgrades[month] || 0;
      const churnImpact = -(streams.churn[month] || 0);

      // Apply seasonal adjustment
      const seasonalAdjustment = streams.seasonalMultipliers[month];

      // Calculate month's revenue
      const baseRevenue =
        currentMRR +
        newSignupRevenue +
        upgradeRevenue +
        downgradeImpact +
        churnImpact;
      const seasonalRevenue = baseRevenue * seasonalAdjustment;
      const scenarioRevenue = seasonalRevenue * scenarioMultiplier;

      // Apply market conditions
      const marketAdjustment =
        this.MARKET_ADJUSTMENTS[streams.marketConditions];
      const finalRevenue = scenarioRevenue * marketAdjustment.multiplier;

      revenue.push(Math.max(0, finalRevenue));
      currentMRR = finalRevenue; // Update for next month
    }

    return revenue;
  }

  /**
   * Identify key revenue drivers for the forecast period
   */
  private identifyKeyDrivers(
    streams: RevenueStreams,
    metrics: RevenueMetrics,
  ): string[] {
    const drivers: string[] = [];

    // Analyze contribution of each factor
    const totalNewRevenue = streams.newSignups.reduce(
      (sum, val) => sum + val * 25,
      0,
    );
    const totalUpgradeRevenue = streams.upgrades.reduce(
      (sum, val) => sum + val,
      0,
    );
    const totalChurnImpact = streams.churn.reduce((sum, val) => sum + val, 0);

    // Rank drivers by impact
    const impacts = [
      { driver: 'New customer acquisition', impact: totalNewRevenue },
      { driver: 'Customer upgrades', impact: totalUpgradeRevenue },
      { driver: 'Wedding seasonality', impact: streams.currentMRR * 0.4 }, // Seasonality creates 40% variance
      { driver: 'Customer churn reduction', impact: totalChurnImpact },
      { driver: 'Market conditions', impact: streams.currentMRR * 0.2 },
    ];

    // Sort by impact and take top 4
    impacts
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 4)
      .forEach((item) => drivers.push(item.driver));

    // Add wedding-specific drivers
    const currentMonth = new Date().getMonth();
    if ([4, 5, 6].includes(currentMonth)) {
      // May, June, July
      drivers.unshift('Peak wedding season demand');
    } else if ([11, 0, 1].includes(currentMonth)) {
      // Dec, Jan, Feb
      drivers.push('Off-season retention strategies');
    }

    return drivers;
  }

  /**
   * Calculate forecast confidence based on data quality
   */
  private calculateForecastConfidence(
    metrics: RevenueMetrics,
    marketConditions: string,
  ): number {
    let baseConfidence = 0.8;

    // Adjust based on data maturity
    if (metrics.monthlyRecurring < 1000) {
      baseConfidence -= 0.2; // Lower confidence for early stage
    }

    // Adjust based on market stability
    if (marketConditions === 'recession') {
      baseConfidence -= 0.15;
    } else if (marketConditions === 'growth') {
      baseConfidence -= 0.05; // Growth can be unpredictable
    }

    // Adjust based on seasonal variance
    if (metrics.seasonalVariance > 0.5) {
      baseConfidence -= 0.1; // High seasonality reduces predictability
    }

    return Math.max(0.5, Math.min(0.95, baseConfidence));
  }

  /**
   * Log forecast to database for tracking and evaluation
   */
  private async logForecast(
    forecast: RevenueForecast,
    streams: RevenueStreams,
    metrics: RevenueMetrics,
  ): Promise<void> {
    try {
      // Store forecast features
      await this.supabase.rpc('store_ml_features', {
        p_entity_type: 'platform',
        p_entity_id: '00000000-0000-0000-0000-000000000000', // System-wide forecast
        p_feature_set: `revenue_forecast_v${this.MODEL_VERSION}`,
        p_features: {
          horizon_months: forecast.horizonMonths,
          current_metrics: metrics,
          revenue_streams: streams,
          seasonal_factors: forecast.seasonalFactors,
          key_drivers: forecast.keyDrivers,
        },
        p_expires_at: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 90 days
      });

      // Get model ID
      const { data: model } = await this.supabase
        .from('ml_models')
        .select('id')
        .eq('model_name', 'wedding_revenue_forecaster')
        .eq('version', this.MODEL_VERSION)
        .single();

      let modelId = model?.id;
      if (!modelId) {
        const { data: newModel } = await this.supabase
          .from('ml_models')
          .insert({
            model_name: 'wedding_revenue_forecaster',
            model_type: 'revenue',
            version: this.MODEL_VERSION,
            algorithm: 'time_series_ensemble',
            status: 'deployed',
            hyperparameters: {
              seasonal_multipliers: this.SEASONAL_REVENUE_MULTIPLIERS,
              market_adjustments: this.MARKET_ADJUSTMENTS,
              confidence_threshold: this.CONFIDENCE_THRESHOLD,
            },
          })
          .select('id')
          .single();
        modelId = newModel.id;
      }

      // Log prediction
      if (modelId) {
        await this.supabase.rpc('log_ml_prediction', {
          p_model_id: modelId,
          p_prediction_type: 'revenue_forecast',
          p_entity_id: '00000000-0000-0000-0000-000000000000',
          p_entity_type: 'platform',
          p_prediction: {
            baseline_forecast: forecast.baseline,
            optimistic_forecast: forecast.optimistic,
            pessimistic_forecast: forecast.pessimistic,
            total_predicted: forecast.totalPredicted,
            key_drivers: forecast.keyDrivers,
            growth_rate: forecast.growthRate,
          },
          p_confidence: forecast.confidence,
          p_features_used: metrics,
          p_prediction_for_date: new Date(
            Date.now() + forecast.horizonMonths * 30 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split('T')[0],
        });
      }
    } catch (error) {
      console.error('Failed to log forecast:', error);
    }
  }

  /**
   * Apply wedding seasonality adjustments to any revenue stream
   */
  applyWeddingSeasonality(
    baseRevenue: number[],
    startMonth?: number,
  ): number[] {
    const adjusted: number[] = [];
    const start = startMonth || new Date().getMonth();

    baseRevenue.forEach((revenue, index) => {
      const monthIndex = (start + index) % 12;
      const monthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
      ];
      const monthName = monthNames[monthIndex];
      const multiplier =
        this.SEASONAL_REVENUE_MULTIPLIERS[
          monthName as keyof typeof this.SEASONAL_REVENUE_MULTIPLIERS
        ] || 1.0;

      adjusted.push(revenue * multiplier);
    });

    return adjusted;
  }
}
