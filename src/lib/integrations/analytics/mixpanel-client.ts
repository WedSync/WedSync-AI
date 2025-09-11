// WS-195 Team C: Mixpanel Integration for User Behavior and Business Metrics Alignment
// Tracks user behavior correlation with business performance

interface MixpanelEvent {
  event: string;
  properties: Record<string, any>;
}

interface MixpanelConfig {
  token: string;
  apiSecret: string;
  baseUrl: string;
}

interface MixpanelMetricsResponse {
  mrr_value: number;
  churn_rate: number;
  viral_coefficient: number;
  wedding_season_factor: number;
  [key: string]: any;
}

interface UserProfile {
  distinctId: string;
  properties: Record<string, any>;
}

export class MixpanelClient {
  private config: MixpanelConfig;

  constructor() {
    this.config = {
      token: process.env.MIXPANEL_TOKEN || '',
      apiSecret: process.env.MIXPANEL_API_SECRET || '',
      baseUrl: 'https://api.mixpanel.com',
    };
  }

  async track(
    eventName: string,
    properties: Record<string, any>,
    distinctId?: string,
  ): Promise<void> {
    if (!this.config.token) {
      console.warn('Mixpanel token not configured - skipping event');
      return;
    }

    const event: MixpanelEvent = {
      event: eventName,
      properties: {
        ...properties,
        token: this.config.token,
        time: Date.now(),
        distinct_id: distinctId || 'wedsync-server',
        // Wedding industry context
        industry: 'wedding_coordination',
        platform: 'wedsync',
        mp_lib: 'wedsync-server',
      },
    };

    try {
      const payload = btoa(JSON.stringify(event));

      const response = await fetch(`${this.config.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(payload)}`,
      });

      if (!response.ok) {
        throw new Error(
          `Mixpanel track failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(`Mixpanel event tracked: ${eventName}`);
    } catch (error) {
      console.error('Failed to track Mixpanel event:', error);
      // Don't throw - analytics failures shouldn't break business logic
    }
  }

  async trackBusinessMetricsUpdate(metrics: {
    mrr: number;
    growth_rate: number;
    churn_rate: number;
    viral_coefficient: number;
    wedding_season_impact: number;
  }): Promise<void> {
    await this.track('Business Metrics Updated', {
      ...metrics,
      // Add business intelligence context
      mrr_tier: this.getMRRTier(metrics.mrr),
      growth_category: this.getGrowthCategory(metrics.growth_rate),
      churn_health: this.getChurnHealth(metrics.churn_rate),
      viral_performance: this.getViralPerformance(metrics.viral_coefficient),
      seasonal_context: this.getSeasonalContext(metrics.wedding_season_impact),
    });
  }

  async trackWeddingIndustryBehavior(behavior: {
    supplier_signup_trend: number;
    couple_platform_usage: number;
    referral_generation: number;
    seasonal_trend: number;
  }): Promise<void> {
    await this.track('Wedding Industry Behavior', {
      ...behavior,
      // Industry-specific categorization
      supplier_trend_category: this.getSupplierTrendCategory(
        behavior.supplier_signup_trend,
      ),
      couple_engagement_level: this.getCoupleEngagementLevel(
        behavior.couple_platform_usage,
      ),
      referral_velocity: this.getReferralVelocity(behavior.referral_generation),
      season_multiplier_impact: this.getSeasonMultiplierImpact(
        behavior.seasonal_trend,
      ),
    });
  }

  async trackSupplierJourney(
    supplierId: string,
    stage: {
      current_stage:
        | 'trial'
        | 'onboarding'
        | 'active'
        | 'power_user'
        | 'at_risk'
        | 'churned';
      previous_stage: string;
      days_in_stage: number;
      actions_taken: number;
      revenue_generated: number;
      wedding_bookings: number;
    },
  ): Promise<void> {
    await this.track(
      'Supplier Journey Progression',
      {
        supplier_id: supplierId,
        ...stage,
        // Journey analytics
        stage_progression_speed: this.getProgressionSpeed(
          stage.days_in_stage,
          stage.current_stage,
        ),
        engagement_intensity: this.getEngagementIntensity(
          stage.actions_taken,
          stage.days_in_stage,
        ),
        revenue_per_day:
          stage.days_in_stage > 0
            ? stage.revenue_generated / stage.days_in_stage
            : 0,
        wedding_velocity:
          stage.days_in_stage > 0
            ? stage.wedding_bookings / stage.days_in_stage
            : 0,
      },
      supplierId,
    );
  }

  async trackCoupleExperience(
    coupleId: string,
    experience: {
      suppliers_invited: number;
      suppliers_joined: number;
      platform_sessions: number;
      features_used: string[];
      referrals_sent: number;
      wedding_date: Date;
    },
  ): Promise<void> {
    const daysUntilWedding = Math.floor(
      (experience.wedding_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    await this.track(
      'Couple Platform Experience',
      {
        couple_id: coupleId,
        ...experience,
        // Couple experience analytics
        supplier_join_rate:
          experience.suppliers_invited > 0
            ? experience.suppliers_joined / experience.suppliers_invited
            : 0,
        feature_adoption_rate: experience.features_used.length / 10, // Assuming 10 core features
        referral_propensity: this.getReferralPropensity(
          experience.referrals_sent,
        ),
        wedding_planning_phase: this.getWeddingPlanningPhase(daysUntilWedding),
        engagement_depth: this.getCoupleEngagementDepth(
          experience.platform_sessions,
          experience.features_used.length,
        ),
      },
      coupleId,
    );
  }

  async trackViralEvent(event: {
    referrer_id: string;
    referrer_type: 'supplier' | 'couple';
    referee_id: string;
    referee_type: 'supplier' | 'couple';
    conversion_value: number;
    viral_loop_stage:
      | 'invitation_sent'
      | 'invitation_accepted'
      | 'signup_completed'
      | 'first_action'
      | 'converted_to_paid';
  }): Promise<void> {
    await this.track('Viral Loop Event', {
      ...event,
      // Viral analytics
      viral_path: `${event.referrer_type}_to_${event.referee_type}`,
      viral_efficiency: this.getViralEfficiency(
        event.viral_loop_stage,
        event.conversion_value,
      ),
      network_effect_strength: await this.calculateNetworkEffectStrength(
        event.referrer_id,
      ),
    });
  }

  async updateUserProfile(
    distinctId: string,
    properties: Record<string, any>,
  ): Promise<void> {
    if (!this.config.token) {
      console.warn('Mixpanel token not configured - skipping profile update');
      return;
    }

    const profile: UserProfile = {
      distinctId,
      properties: {
        ...properties,
        $token: this.config.token,
        $time: Date.now(),
        // Wedding industry context
        industry: 'wedding_coordination',
        platform_version: '2.0',
      },
    };

    try {
      const payload = btoa(JSON.stringify(profile));

      const response = await fetch(`${this.config.baseUrl}/engage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(payload)}`,
      });

      if (!response.ok) {
        throw new Error(
          `Mixpanel profile update failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(`Mixpanel profile updated for: ${distinctId}`);
    } catch (error) {
      console.error('Failed to update Mixpanel profile:', error);
    }
  }

  async getMetrics(): Promise<MixpanelMetricsResponse> {
    if (!this.config.apiSecret) {
      console.warn(
        'Mixpanel API secret not configured - returning default metrics',
      );
      return this.getDefaultMetrics();
    }

    try {
      // Using Mixpanel Query API to get aggregated metrics
      const query = {
        event: ['Business Metrics Updated'],
        type: 'general',
        unit: 'day',
        interval: 30,
        format: 'json',
      };

      const queryString = new URLSearchParams(query as any).toString();
      const response = await fetch(
        `${this.config.baseUrl}/api/2.0/events?${queryString}`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${this.config.apiSecret}:`)}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Mixpanel API query failed: ${response.status}`);
      }

      const data = await response.json();
      return this.transformMixpanelData(data);
    } catch (error) {
      console.error('Failed to retrieve Mixpanel metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  private transformMixpanelData(data: any): MixpanelMetricsResponse {
    // Transform Mixpanel API response into our metrics format
    // This would parse the actual Mixpanel response structure
    return {
      mrr_value: data.series?.mrr || 0,
      churn_rate: data.series?.churn_rate || 0,
      viral_coefficient: data.series?.viral_coefficient || 0,
      wedding_season_factor: data.series?.wedding_season_impact || 1,
    };
  }

  private getDefaultMetrics(): MixpanelMetricsResponse {
    return {
      mrr_value: 0,
      churn_rate: 0,
      viral_coefficient: 0,
      wedding_season_factor: 1,
    };
  }

  // Business intelligence categorization methods

  private getMRRTier(mrr: number): string {
    if (mrr < 5000) return 'startup';
    if (mrr < 25000) return 'growth';
    if (mrr < 50000) return 'scale';
    if (mrr < 100000) return 'expansion';
    return 'enterprise';
  }

  private getGrowthCategory(growthRate: number): string {
    if (growthRate > 20) return 'hypergrowth';
    if (growthRate > 10) return 'fast_growth';
    if (growthRate > 5) return 'steady_growth';
    if (growthRate > 0) return 'slow_growth';
    return 'declining';
  }

  private getChurnHealth(churnRate: number): string {
    if (churnRate < 2) return 'excellent';
    if (churnRate < 5) return 'healthy';
    if (churnRate < 10) return 'concerning';
    return 'critical';
  }

  private getViralPerformance(viralCoefficient: number): string {
    if (viralCoefficient > 1.5) return 'viral_explosion';
    if (viralCoefficient > 1.0) return 'self_sustaining';
    if (viralCoefficient > 0.5) return 'moderate_viral';
    return 'low_viral';
  }

  private getSeasonalContext(seasonalImpact: number): string {
    if (seasonalImpact > 2.5) return 'peak_wedding_season';
    if (seasonalImpact > 1.5) return 'busy_wedding_season';
    if (seasonalImpact > 1.0) return 'regular_wedding_season';
    return 'off_season';
  }

  private getSupplierTrendCategory(trend: number): string {
    if (trend > 100) return 'explosive_growth';
    if (trend > 50) return 'strong_growth';
    if (trend > 20) return 'steady_growth';
    if (trend > 0) return 'slow_growth';
    return 'declining';
  }

  private getCoupleEngagementLevel(usage: number): string {
    if (usage > 0.8) return 'highly_engaged';
    if (usage > 0.6) return 'engaged';
    if (usage > 0.4) return 'moderately_engaged';
    if (usage > 0.2) return 'low_engagement';
    return 'inactive';
  }

  private getReferralVelocity(referrals: number): string {
    if (referrals > 5) return 'viral_generator';
    if (referrals > 2) return 'strong_referrer';
    if (referrals > 0) return 'occasional_referrer';
    return 'non_referrer';
  }

  private getSeasonMultiplierImpact(multiplier: number): string {
    if (multiplier > 3) return 'extreme_seasonal_boost';
    if (multiplier > 2) return 'high_seasonal_boost';
    if (multiplier > 1.5) return 'moderate_seasonal_boost';
    return 'minimal_seasonal_impact';
  }

  private getProgressionSpeed(days: number, stage: string): string {
    const benchmarks = {
      trial: 14,
      onboarding: 30,
      active: 90,
      power_user: 180,
    };

    const benchmark = benchmarks[stage as keyof typeof benchmarks] || 30;
    if (days < benchmark * 0.5) return 'fast';
    if (days < benchmark) return 'normal';
    if (days < benchmark * 2) return 'slow';
    return 'stalled';
  }

  private getEngagementIntensity(actions: number, days: number): string {
    if (days === 0) return 'new_user';

    const actionsPerDay = actions / days;
    if (actionsPerDay > 10) return 'hyperactive';
    if (actionsPerDay > 5) return 'very_active';
    if (actionsPerDay > 2) return 'active';
    if (actionsPerDay > 0.5) return 'moderate';
    return 'low_activity';
  }

  private getReferralPropensity(referrals: number): string {
    if (referrals > 10) return 'viral_ambassador';
    if (referrals > 5) return 'strong_advocate';
    if (referrals > 2) return 'advocate';
    if (referrals > 0) return 'occasional_referrer';
    return 'non_referrer';
  }

  private getWeddingPlanningPhase(daysUntilWedding: number): string {
    if (daysUntilWedding < 0) return 'post_wedding';
    if (daysUntilWedding < 30) return 'final_month';
    if (daysUntilWedding < 90) return 'final_preparations';
    if (daysUntilWedding < 180) return 'detailed_planning';
    if (daysUntilWedding < 365) return 'active_planning';
    return 'early_planning';
  }

  private getCoupleEngagementDepth(
    sessions: number,
    featuresUsed: number,
  ): string {
    const engagementScore = sessions * 0.3 + featuresUsed * 0.7;
    if (engagementScore > 20) return 'deeply_engaged';
    if (engagementScore > 15) return 'highly_engaged';
    if (engagementScore > 10) return 'moderately_engaged';
    if (engagementScore > 5) return 'lightly_engaged';
    return 'minimal_engagement';
  }

  private getViralEfficiency(stage: string, value: number): string {
    const stageWeights = {
      invitation_sent: 0.1,
      invitation_accepted: 0.3,
      signup_completed: 0.5,
      first_action: 0.7,
      converted_to_paid: 1.0,
    };

    const efficiency =
      (stageWeights[stage as keyof typeof stageWeights] || 0) * value;
    if (efficiency > 100) return 'highly_efficient';
    if (efficiency > 50) return 'efficient';
    if (efficiency > 20) return 'moderate_efficiency';
    return 'low_efficiency';
  }

  private async calculateNetworkEffectStrength(
    referrerId: string,
  ): Promise<string> {
    // In a real implementation, this would query the database
    // to calculate the network strength of the referrer
    return 'moderate_network_strength';
  }
}
