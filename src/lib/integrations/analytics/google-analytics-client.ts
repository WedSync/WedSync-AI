// WS-195 Team C: Google Analytics 4 Integration for Business Metrics
// Correlates business metrics with user behavior in GA4

interface GA4Event {
  name: string;
  parameters: Record<string, any>;
}

interface GA4Config {
  measurementId: string;
  apiSecret: string;
  clientId: string;
}

interface GA4MetricsResponse {
  mrr_value: number;
  churn_rate: number;
  viral_coefficient: number;
  wedding_season_factor: number;
  supplier_acquisition_rate: number;
  couple_engagement_rate: number;
  [key: string]: any;
}

export class GoogleAnalytics4Client {
  private config: GA4Config;
  private baseUrl = 'https://www.google-analytics.com/mp/collect';

  constructor() {
    this.config = {
      measurementId: process.env.GA4_MEASUREMENT_ID || '',
      apiSecret: process.env.GA4_API_SECRET || '',
      clientId: process.env.GA4_CLIENT_ID || 'wedsync-server-client',
    };
  }

  async sendEvent(
    eventName: string,
    parameters: Record<string, any>,
  ): Promise<void> {
    if (!this.config.measurementId || !this.config.apiSecret) {
      console.warn('GA4 credentials not configured - skipping event');
      return;
    }

    const event: GA4Event = {
      name: eventName,
      parameters: {
        ...parameters,
        timestamp_micros: Date.now() * 1000,
        engagement_time_msec: 1,
        // Wedding industry specific context
        industry: 'wedding_coordination',
        platform: 'wedsync_b2b',
      },
    };

    const payload = {
      client_id: this.config.clientId,
      events: [event],
    };

    try {
      const response = await fetch(
        `${this.baseUrl}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          `GA4 event failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(`GA4 event sent successfully: ${eventName}`);
    } catch (error) {
      console.error('Failed to send GA4 event:', error);
      // Don't throw - analytics failures shouldn't break business logic
    }
  }

  async sendBusinessMetricsEvent(metrics: {
    mrr_value: number;
    churn_rate: number;
    viral_coefficient: number;
    wedding_season_factor: number;
    supplier_acquisition_rate: number;
    couple_engagement_rate: number;
  }): Promise<void> {
    await this.sendEvent('business_metrics_update', {
      ...metrics,
      // Add calculated fields
      mrr_category: this.categorizeMRR(metrics.mrr_value),
      churn_category: this.categorizeChurn(metrics.churn_rate),
      viral_category: this.categorizeViral(metrics.viral_coefficient),
      season_category: this.categorizeSeason(metrics.wedding_season_factor),
    });
  }

  async sendWeddingIndustryEvent(metrics: {
    wedding_season_multiplier: number;
    supplier_conversion_rate: number;
    invitation_acceptance_rate: number;
    average_wedding_budget: number;
  }): Promise<void> {
    await this.sendEvent('wedding_industry_metrics', {
      ...metrics,
      // Wedding industry categorization
      season_impact: this.categorizeSeasonalImpact(
        metrics.wedding_season_multiplier,
      ),
      conversion_performance: this.categorizeConversion(
        metrics.supplier_conversion_rate,
      ),
      budget_category: this.categorizeBudget(metrics.average_wedding_budget),
    });
  }

  async sendSupplierBehaviorEvent(
    supplierId: string,
    behavior: {
      action: string;
      category: 'onboarding' | 'feature_usage' | 'billing' | 'support';
      value?: number;
      properties?: Record<string, any>;
    },
  ): Promise<void> {
    await this.sendEvent('supplier_behavior', {
      supplier_id: supplierId,
      action: behavior.action,
      category: behavior.category,
      value: behavior.value || 1,
      ...behavior.properties,
    });
  }

  async sendCouplerBehaviorEvent(
    coupleId: string,
    behavior: {
      action: string;
      category: 'invitation' | 'platform_usage' | 'referral' | 'completion';
      value?: number;
      properties?: Record<string, any>;
    },
  ): Promise<void> {
    await this.sendEvent('couple_behavior', {
      couple_id: coupleId,
      action: behavior.action,
      category: behavior.category,
      value: behavior.value || 1,
      ...behavior.properties,
    });
  }

  async sendRevenueEvent(revenue: {
    amount: number;
    currency: string;
    transaction_id: string;
    subscription_tier: string;
    billing_cycle: 'monthly' | 'annual';
  }): Promise<void> {
    await this.sendEvent('purchase', {
      currency: revenue.currency,
      value: revenue.amount,
      transaction_id: revenue.transaction_id,
      // Wedding industry ecommerce parameters
      item_category: 'wedding_software_subscription',
      item_name: `WedSync ${revenue.subscription_tier}`,
      item_variant: revenue.billing_cycle,
      affiliation: 'WedSync',
    });
  }

  async getMetrics(): Promise<GA4MetricsResponse> {
    // Note: GA4 Reporting API would be used here for retrieving metrics
    // This is a placeholder structure - actual implementation would use
    // Google Analytics Reporting API v4 or Data API

    try {
      // Placeholder for actual GA4 Reporting API call
      // const response = await this.callGA4ReportingAPI();

      return {
        mrr_value: 0,
        churn_rate: 0,
        viral_coefficient: 0,
        wedding_season_factor: 1,
        supplier_acquisition_rate: 0,
        couple_engagement_rate: 0,
      };
    } catch (error) {
      console.error('Failed to retrieve GA4 metrics:', error);
      return {
        mrr_value: 0,
        churn_rate: 0,
        viral_coefficient: 0,
        wedding_season_factor: 1,
        supplier_acquisition_rate: 0,
        couple_engagement_rate: 0,
      };
    }
  }

  // Categorization helper methods for better GA4 reporting

  private categorizeMRR(mrr: number): string {
    if (mrr < 10000) return 'startup';
    if (mrr < 50000) return 'growth';
    if (mrr < 100000) return 'scale';
    return 'enterprise';
  }

  private categorizeChurn(churnRate: number): string {
    if (churnRate < 3) return 'excellent';
    if (churnRate < 5) return 'good';
    if (churnRate < 8) return 'moderate';
    return 'high';
  }

  private categorizeViral(viralCoefficient: number): string {
    if (viralCoefficient > 1.5) return 'viral_explosion';
    if (viralCoefficient > 1.0) return 'viral_growth';
    if (viralCoefficient > 0.5) return 'moderate_viral';
    return 'low_viral';
  }

  private categorizeSeason(seasonFactor: number): string {
    if (seasonFactor > 2.0) return 'peak_wedding_season';
    if (seasonFactor > 1.5) return 'high_wedding_season';
    if (seasonFactor > 1.0) return 'moderate_wedding_season';
    return 'off_wedding_season';
  }

  private categorizeSeasonalImpact(multiplier: number): string {
    if (multiplier > 3.0) return 'extreme_seasonal_boost';
    if (multiplier > 2.0) return 'high_seasonal_boost';
    if (multiplier > 1.5) return 'moderate_seasonal_boost';
    return 'low_seasonal_impact';
  }

  private categorizeConversion(rate: number): string {
    if (rate > 20) return 'excellent_conversion';
    if (rate > 15) return 'good_conversion';
    if (rate > 10) return 'moderate_conversion';
    return 'poor_conversion';
  }

  private categorizeBudget(budget: number): string {
    if (budget > 50000) return 'luxury_wedding';
    if (budget > 30000) return 'premium_wedding';
    if (budget > 15000) return 'mid_range_wedding';
    return 'budget_wedding';
  }

  // Wedding industry specific event tracking
  async trackWeddingMilestone(milestone: {
    supplierId: string;
    coupleId?: string;
    milestone:
      | 'booking_confirmed'
      | 'contract_signed'
      | 'payment_received'
      | 'service_delivered'
      | 'review_received';
    value: number;
    weddingDate: Date;
  }): Promise<void> {
    const daysUntilWedding = Math.floor(
      (milestone.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    await this.sendEvent('wedding_milestone', {
      supplier_id: milestone.supplierId,
      couple_id: milestone.coupleId,
      milestone: milestone.milestone,
      value: milestone.value,
      days_until_wedding: daysUntilWedding,
      wedding_quarter: this.getWeddingQuarter(milestone.weddingDate),
      is_peak_season: this.isPeakWeddingSeason(milestone.weddingDate),
    });
  }

  private getWeddingQuarter(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Q2_Spring';
    if (month >= 6 && month <= 8) return 'Q3_Summer';
    if (month >= 9 && month <= 11) return 'Q4_Fall';
    return 'Q1_Winter';
  }

  private isPeakWeddingSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    // Peak wedding season: May through October
    return month >= 5 && month <= 10;
  }
}
