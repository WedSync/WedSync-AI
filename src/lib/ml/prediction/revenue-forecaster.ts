// WS-232: Revenue Forecasting Engine
// Team E - Platform Operations Focus
// Predictive revenue forecasting for wedding suppliers using historical booking patterns

import { createSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

interface RevenueFeatures {
  // Historical performance
  monthly_bookings_avg: number;
  seasonal_multiplier: number;
  year_over_year_growth: number;
  booking_conversion_rate: number;

  // Market conditions
  competitor_density: number;
  market_demand_score: number;
  pricing_position: number;
  review_sentiment_score: number;

  // Business health
  repeat_client_rate: number;
  referral_rate: number;
  cancellation_rate: number;
  payment_timing_score: number;

  // External factors
  economic_indicator: number;
  wedding_season_factor: number;
  local_event_impact: number;
  marketing_spend_efficiency: number;
}

export interface RevenueForcast {
  supplier_id: string;
  forecast_period: 'monthly' | 'quarterly' | 'yearly';
  predicted_revenue: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  confidence_score: number;
  contributing_factors: RevenueFactor[];
  risk_indicators: RevenueRisk[];
  growth_opportunities: GrowthOpportunity[];
  forecast_date: Date;
  model_version: string;
  inference_time_ms: number;
}

export interface RevenueFactor {
  factor_type:
    | 'seasonal_boost'
    | 'market_expansion'
    | 'pricing_optimization'
    | 'repeat_business'
    | 'referral_growth'
    | 'service_diversification'
    | 'market_penetration'
    | 'competitive_advantage';
  impact_amount: number; // revenue impact in currency
  impact_percentage: number; // percentage impact on total
  confidence: number;
  description: string;
  timeline_months: number;
}

export interface RevenueRisk {
  risk_type:
    | 'market_saturation'
    | 'increased_competition'
    | 'seasonal_decline'
    | 'economic_downturn'
    | 'pricing_pressure'
    | 'client_churn'
    | 'service_disruption'
    | 'reputation_impact';
  potential_loss: number;
  probability: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation_strategies: string[];
  timeline_horizon: number; // months
}

export interface GrowthOpportunity {
  opportunity_type:
    | 'premium_services'
    | 'new_market_segment'
    | 'package_bundling'
    | 'partnership_opportunities'
    | 'technology_adoption'
    | 'brand_expansion';
  revenue_potential: number;
  investment_required: number;
  success_probability: number;
  implementation_complexity: 'low' | 'medium' | 'high';
  roi_months: number;
  description: string;
}

export class RevenueForecaster {
  private supabase = createSupabaseClient();
  private modelVersion = '1.0.0';
  private cache = new Map<
    string,
    { forecast: RevenueForcast; timestamp: number }
  >();
  private cacheTTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate comprehensive revenue forecast for a supplier
   */
  async forecastRevenue(
    supplierId: string,
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ): Promise<RevenueForcast> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = `${supplierId}_${period}`;
      const cached = this.getCachedForecast(cacheKey);
      if (cached) return cached;

      // Extract features for forecasting
      const features = await this.extractRevenueFeatures(supplierId);

      // Run revenue prediction model
      const forecastData = await this.runRevenuePredictionModel(
        features,
        period,
      );

      // Analyze contributing factors
      const factors = this.analyzeRevenueFactors(features, forecastData);

      // Identify risks and opportunities
      const risks = this.identifyRevenueRisks(features);
      const opportunities = this.identifyGrowthOpportunities(features);

      const forecast: RevenueForcast = {
        supplier_id: supplierId,
        forecast_period: period,
        predicted_revenue: forecastData.predicted_revenue,
        confidence_interval_low: forecastData.confidence_interval_low,
        confidence_interval_high: forecastData.confidence_interval_high,
        confidence_score: forecastData.confidence_score,
        contributing_factors: factors,
        risk_indicators: risks,
        growth_opportunities: opportunities,
        forecast_date: new Date(),
        model_version: this.modelVersion,
        inference_time_ms: performance.now() - startTime,
      };

      // Cache the result
      this.setCachedForecast(cacheKey, forecast);

      return forecast;
    } catch (error) {
      console.error('Revenue forecasting failed:', error);
      throw error;
    }
  }

  /**
   * Batch revenue forecasting for multiple suppliers
   */
  async batchForecastRevenue(
    supplierIds: string[],
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ): Promise<RevenueForcast[]> {
    const batchSize = 25;
    const results: RevenueForcast[] = [];

    for (let i = 0; i < supplierIds.length; i += batchSize) {
      const batch = supplierIds.slice(i, i + batchSize);
      const batchPromises = batch.map((id) => this.forecastRevenue(id, period));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(
            `Revenue forecast failed for supplier ${batch[index]}:`,
            result.reason,
          );
        }
      });
    }

    return results;
  }

  /**
   * Extract revenue-related features from supplier data
   */
  private async extractRevenueFeatures(
    supplierId: string,
  ): Promise<RevenueFeatures> {
    // Fetch supplier historical data
    const { data: supplier, error: supplierError } = await this.supabase
      .from('organizations')
      .select(
        `
        id, subscription_tier, created_at, last_login_at, total_revenue,
        booking_count, average_booking_value, client_satisfaction_score
      `,
      )
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Supplier data not found: ${supplierError?.message}`);
    }

    // Fetch booking history for trends
    const { data: bookings, error: bookingsError } = await this.supabase
      .from('bookings')
      .select('created_at, total_amount, status')
      .eq('organization_id', supplierId)
      .gte(
        'created_at',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching booking history:', bookingsError);
    }

    const bookingsData = bookings || [];
    const now = new Date();
    const currentMonth = now.getMonth();

    // Calculate historical metrics
    const totalBookings = bookingsData.length;
    const confirmedBookings = bookingsData.filter(
      (b) => b.status === 'confirmed',
    ).length;
    const monthlyAvg = totalBookings / 12;
    const revenueTotal = bookingsData.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0,
    );

    return {
      // Historical performance
      monthly_bookings_avg: monthlyAvg,
      seasonal_multiplier: this.calculateSeasonalMultiplier(currentMonth),
      year_over_year_growth: this.calculateYearOverYearGrowth(bookingsData),
      booking_conversion_rate:
        totalBookings > 0 ? confirmedBookings / totalBookings : 0.5,

      // Market conditions (simplified - would integrate with market data APIs)
      competitor_density: 0.7, // Placeholder - would calculate from market analysis
      market_demand_score: this.calculateMarketDemandScore(currentMonth),
      pricing_position: supplier.average_booking_value > 5000 ? 0.8 : 0.6,
      review_sentiment_score: supplier.client_satisfaction_score || 4.2,

      // Business health
      repeat_client_rate: 0.25, // Placeholder - would calculate from client data
      referral_rate: 0.35, // Placeholder - would calculate from referral tracking
      cancellation_rate: Math.max(
        0,
        (totalBookings - confirmedBookings) / Math.max(1, totalBookings),
      ),
      payment_timing_score: 0.85, // Placeholder - would calculate from payment data

      // External factors
      economic_indicator: 1.0, // Placeholder - would integrate with economic APIs
      wedding_season_factor: this.calculateWeddingSeasonFactor(currentMonth),
      local_event_impact: 1.0, // Placeholder - would integrate with local event data
      marketing_spend_efficiency: 2.5, // Placeholder - would calculate from marketing data
    };
  }

  /**
   * Core revenue prediction algorithm
   */
  private async runRevenuePredictionModel(
    features: RevenueFeatures,
    period: 'monthly' | 'quarterly' | 'yearly',
  ): Promise<{
    predicted_revenue: number;
    confidence_interval_low: number;
    confidence_interval_high: number;
    confidence_score: number;
  }> {
    // Base revenue calculation
    let baseRevenue =
      features.monthly_bookings_avg *
      (features.booking_conversion_rate * 100) * // Assume average booking value
      features.seasonal_multiplier *
      features.wedding_season_factor;

    // Apply growth factors
    baseRevenue *= 1 + features.year_over_year_growth;
    baseRevenue *= features.market_demand_score;
    baseRevenue *= 1 + features.referral_rate * 0.5; // Referrals boost revenue

    // Apply period multiplier
    const periodMultiplier =
      period === 'yearly' ? 12 : period === 'quarterly' ? 3 : 1;
    const predictedRevenue = baseRevenue * periodMultiplier;

    // Calculate confidence intervals (±20% based on historical variance)
    const variance = 0.2;
    const confidenceIntervalLow = predictedRevenue * (1 - variance);
    const confidenceIntervalHigh = predictedRevenue * (1 + variance);

    // Calculate confidence score based on data quality
    let confidenceScore = 0.8;
    if (features.monthly_bookings_avg < 1) confidenceScore -= 0.2;
    if (features.booking_conversion_rate < 0.3) confidenceScore -= 0.1;
    confidenceScore = Math.max(0.5, Math.min(0.95, confidenceScore));

    return {
      predicted_revenue: Math.round(predictedRevenue),
      confidence_interval_low: Math.round(confidenceIntervalLow),
      confidence_interval_high: Math.round(confidenceIntervalHigh),
      confidence_score: confidenceScore,
    };
  }

  /**
   * Analyze factors contributing to revenue forecast
   */
  private analyzeRevenueFactors(
    features: RevenueFeatures,
    forecastData: any,
  ): RevenueFactor[] {
    const factors: RevenueFactor[] = [];

    // Seasonal impact
    if (features.seasonal_multiplier > 1.1) {
      factors.push({
        factor_type: 'seasonal_boost',
        impact_amount: forecastData.predicted_revenue * 0.15,
        impact_percentage: 15,
        confidence: 0.9,
        description: 'Peak wedding season driving higher booking volume',
        timeline_months: 6,
      });
    }

    // Market position
    if (features.pricing_position > 0.7) {
      factors.push({
        factor_type: 'pricing_optimization',
        impact_amount: forecastData.predicted_revenue * 0.12,
        impact_percentage: 12,
        confidence: 0.8,
        description:
          'Premium pricing strategy supporting higher revenue per booking',
        timeline_months: 12,
      });
    }

    // Referral business
    if (features.referral_rate > 0.3) {
      factors.push({
        factor_type: 'referral_growth',
        impact_amount: forecastData.predicted_revenue * 0.08,
        impact_percentage: 8,
        confidence: 0.85,
        description: 'Strong referral network driving organic growth',
        timeline_months: 12,
      });
    }

    return factors;
  }

  /**
   * Identify revenue risks
   */
  private identifyRevenueRisks(features: RevenueFeatures): RevenueRisk[] {
    const risks: RevenueRisk[] = [];

    // High competition risk
    if (features.competitor_density > 0.8) {
      risks.push({
        risk_type: 'increased_competition',
        potential_loss: 15000, // Placeholder
        probability: 0.6,
        severity: 'medium',
        mitigation_strategies: [
          'Differentiate service offerings',
          'Strengthen client relationships',
          'Invest in marketing and brand awareness',
        ],
        timeline_horizon: 6,
      });
    }

    // Seasonal decline risk
    if (features.seasonal_multiplier < 0.9) {
      risks.push({
        risk_type: 'seasonal_decline',
        potential_loss: 8000,
        probability: 0.8,
        severity: 'medium',
        mitigation_strategies: [
          'Develop off-season service offerings',
          'Target winter wedding market',
          'Diversify into corporate events',
        ],
        timeline_horizon: 4,
      });
    }

    return risks;
  }

  /**
   * Identify growth opportunities
   */
  private identifyGrowthOpportunities(
    features: RevenueFeatures,
  ): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    // Premium service expansion
    if (
      features.review_sentiment_score > 4.5 &&
      features.pricing_position < 0.8
    ) {
      opportunities.push({
        opportunity_type: 'premium_services',
        revenue_potential: 25000,
        investment_required: 5000,
        success_probability: 0.7,
        implementation_complexity: 'medium',
        roi_months: 8,
        description:
          'High customer satisfaction enables premium service tier expansion',
      });
    }

    // Package bundling opportunity
    if (features.repeat_client_rate > 0.2) {
      opportunities.push({
        opportunity_type: 'package_bundling',
        revenue_potential: 15000,
        investment_required: 2000,
        success_probability: 0.8,
        implementation_complexity: 'low',
        roi_months: 6,
        description:
          'Strong client relationships support comprehensive service packages',
      });
    }

    return opportunities;
  }

  /**
   * Helper methods for calculations
   */
  private calculateSeasonalMultiplier(month: number): number {
    // Wedding season: April-October higher, November-March lower
    if (month >= 3 && month <= 9) return 1.3; // Peak season
    if (month >= 10 || month <= 1) return 0.7; // Off season
    return 1.0; // Shoulder season
  }

  private calculateWeddingSeasonFactor(month: number): number {
    // Similar to seasonal but more wedding-specific
    const weddingSeasonMap: Record<number, number> = {
      0: 0.6,
      1: 0.7,
      2: 0.8,
      3: 1.0,
      4: 1.3,
      5: 1.4,
      6: 1.5,
      7: 1.4,
      8: 1.3,
      9: 1.2,
      10: 0.9,
      11: 0.7,
    };
    return weddingSeasonMap[month] || 1.0;
  }

  private calculateMarketDemandScore(month: number): number {
    // Market demand varies with engagement season and wedding planning cycles
    return month >= 2 && month <= 10 ? 1.2 : 0.9;
  }

  private calculateYearOverYearGrowth(bookings: any[]): number {
    if (bookings.length < 24) return 0.05; // Default 5% growth

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(
      now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000,
    );
    const eighteenMonthsAgo = new Date(
      now.getTime() - 18 * 30 * 24 * 60 * 60 * 1000,
    );

    const recent6Months = bookings.filter(
      (b) => new Date(b.created_at) >= sixMonthsAgo,
    ).length;

    const previous6Months = bookings.filter((b) => {
      const date = new Date(b.created_at);
      return date >= twelveMonthsAgo && date < sixMonthsAgo;
    }).length;

    if (previous6Months === 0) return 0.05;
    return (recent6Months - previous6Months) / previous6Months;
  }

  /**
   * Cache management
   */
  private getCachedForecast(key: string): RevenueForcast | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.forecast;
    }
    return null;
  }

  private setCachedForecast(key: string, forecast: RevenueForcast): void {
    this.cache.set(key, {
      forecast,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.cache.size > 500) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 50);
      oldestKeys.forEach((k) => this.cache.delete(k));
    }
  }
}
