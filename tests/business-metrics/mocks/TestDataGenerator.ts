import { 
  TestSubscriptionData, 
  TestChurnData, 
  TestReferralData,
  WeddingSupplierSubscriptionConfig,
  ChurnScenarioConfig,
  ReferralScenarioConfig
} from '../types/BusinessMetricsTypes';

/**
 * Generates realistic test data for wedding industry business metrics validation
 * Simulates actual wedding supplier behavior patterns and seasonal variations
 */
export class TestDataGenerator {
  private readonly SUPPLIER_TYPES = ['photographer', 'venue', 'florist', 'caterer', 'other'] as const;
  private readonly TIERS = ['starter', 'professional', 'scale', 'enterprise'] as const;
  
  // Realistic pricing tiers based on WedSync business model
  private readonly TIER_PRICING = {
    starter: { monthly: 19, annual: 190 },
    professional: { monthly: 49, annual: 490 },
    scale: { monthly: 79, annual: 790 },
    enterprise: { monthly: 149, annual: 1490 }
  };

  // Wedding industry seasonal patterns
  private readonly SEASONAL_PATTERNS = {
    peak: {
      months: [4, 5, 6, 7, 8, 9], // May through September
      activityMultiplier: 2.8,
      engagementMultiplier: 3.2,
      churnMultiplier: 0.3, // Lower churn during peak season
    },
    offSeason: {
      months: [10, 11, 12, 1, 2, 3], // October through April
      activityMultiplier: 0.7,
      engagementMultiplier: 0.6,
      churnMultiplier: 2.1, // Higher churn during off-season
    }
  };

  /**
   * Creates realistic wedding supplier subscription test data
   */
  async createWeddingSupplierSubscriptions(config: WeddingSupplierSubscriptionConfig): Promise<TestSubscriptionData[]> {
    const subscriptions: TestSubscriptionData[] = [];
    
    // Generate photographers (largest segment)
    for (let i = 0; i < config.photographersCount; i++) {
      subscriptions.push(this.createSupplierSubscription('photographer', config.tierDistribution, config.seasonalMix));
    }
    
    // Generate venues (premium segment, higher enterprise tier usage)
    for (let i = 0; i < config.venuesCount; i++) {
      const venueConfig = { ...config.tierDistribution };
      venueConfig.enterprise = 0.15; // Venues use more enterprise features
      venueConfig.scale = 0.35;
      venueConfig.professional = 0.35;
      venueConfig.starter = 0.15;
      subscriptions.push(this.createSupplierSubscription('venue', venueConfig, config.seasonalMix));
    }
    
    // Generate florists (seasonal business)
    for (let i = 0; i < config.floristsCount; i++) {
      subscriptions.push(this.createSupplierSubscription('florist', config.tierDistribution, config.seasonalMix));
    }
    
    // Generate caterers (mixed seasonal patterns)
    for (let i = 0; i < config.caterersCount; i++) {
      subscriptions.push(this.createSupplierSubscription('caterer', config.tierDistribution, config.seasonalMix));
    }
    
    return subscriptions;
  }

  /**
   * Creates realistic churn scenarios based on wedding industry patterns
   */
  async createChurnScenarios(config: ChurnScenarioConfig): Promise<TestChurnData[]> {
    const churnData: TestChurnData[] = [];
    const totalSuppliers = 1000; // Base test population
    
    // Generate peak season churn scenarios
    const peakChurnCount = Math.floor(totalSuppliers * config.peakSeasonChurn);
    for (let i = 0; i < peakChurnCount; i++) {
      churnData.push(this.createChurnScenario('peak', config));
    }
    
    // Generate off-season churn scenarios
    const offSeasonChurnCount = Math.floor(totalSuppliers * config.offSeasonChurn);
    for (let i = 0; i < offSeasonChurnCount; i++) {
      churnData.push(this.createChurnScenario('off-season', config));
    }
    
    // Add reactivation scenarios if enabled
    if (config.includeReactivations) {
      const reactivations = this.generateReactivationScenarios(churnData);
      churnData.push(...reactivations);
    }
    
    return churnData;
  }

  /**
   * Creates realistic referral scenarios for viral coefficient testing
   */
  async createReferralScenarios(config: ReferralScenarioConfig): Promise<TestReferralData[]> {
    const referralData: TestReferralData[] = [];
    const baseReferralCount = 500;
    
    // Generate referrals for each source with realistic conversion patterns
    config.referralSources.forEach(source => {
      const sourceReferrals = Math.floor(baseReferralCount * this.getSourceWeight(source));
      
      for (let i = 0; i < sourceReferrals; i++) {
        referralData.push({
          referrerId: `supplier_${Math.floor(Math.random() * 1000)}`,
          refereeId: `new_supplier_${Math.floor(Math.random() * 10000)}`,
          source,
          conversionRate: config.conversionRates[source] || 0.15,
          coefficient: this.calculateSourceCoefficient(source, config.conversionRates[source]),
          seasonalMultiplier: this.getCurrentSeasonMultiplier(config.seasonalMultipliers),
          weddingNetworkType: this.mapSourceToNetworkType(source),
        });
      }
    });
    
    return referralData;
  }

  /**
   * Generate comprehensive business metrics test scenarios
   */
  async createComprehensiveTestScenario(): Promise<{
    subscriptions: TestSubscriptionData[];
    churnData: TestChurnData[];
    referralData: TestReferralData[];
    expectedMetrics: {
      mrr: number;
      churnRate: number;
      viralCoefficient: number;
    };
  }> {
    // Create realistic subscription mix
    const subscriptions = await this.createWeddingSupplierSubscriptions({
      photographersCount: 200,
      venuesCount: 50,
      floristsCount: 120,
      caterersCount: 80,
      seasonalMix: true,
      tierDistribution: {
        starter: 0.45,
        professional: 0.35,
        scale: 0.15,
        enterprise: 0.05
      }
    });

    // Create realistic churn scenarios
    const churnData = await this.createChurnScenarios({
      peakSeasonChurn: 0.03,
      offSeasonChurn: 0.18,
      supplierTypes: ['photographer', 'venue', 'florist', 'caterer'],
      timeRange: '12-months',
      includeReactivations: true
    });

    // Create realistic referral scenarios
    const referralData = await this.createReferralScenarios({
      referralSources: [
        'wedding_planner_network',
        'venue_partnerships',
        'photographer_referrals',
        'supplier_directories',
        'wedding_shows',
        'couple_recommendations'
      ],
      conversionRates: {
        wedding_planner_network: 0.35,
        venue_partnerships: 0.28,
        photographer_referrals: 0.42,
        supplier_directories: 0.12,
        wedding_shows: 0.18,
        couple_recommendations: 0.55
      },
      seasonalMultipliers: {
        peak: 2.5,
        offSeason: 0.6
      }
    });

    // Calculate expected metrics for validation
    const expectedMRR = this.calculateExpectedMRR(subscriptions);
    const expectedChurnRate = this.calculateExpectedChurnRate(churnData, subscriptions.length);
    const expectedViralCoefficient = this.calculateExpectedViralCoefficient(referralData);

    return {
      subscriptions,
      churnData,
      referralData,
      expectedMetrics: {
        mrr: expectedMRR,
        churnRate: expectedChurnRate,
        viralCoefficient: expectedViralCoefficient
      }
    };
  }

  /**
   * Create edge case scenarios for comprehensive testing
   */
  async createEdgeCaseScenarios(): Promise<{
    zeroChurn: TestChurnData[];
    highChurn: TestChurnData[];
    negativeGrowth: TestSubscriptionData[];
    seasonalExtreme: TestSubscriptionData[];
  }> {
    return {
      // Zero churn scenario (perfect retention)
      zeroChurn: [],
      
      // High churn scenario (business emergency)
      highChurn: await this.createChurnScenarios({
        peakSeasonChurn: 0.25,
        offSeasonChurn: 0.45,
        supplierTypes: ['photographer', 'venue', 'florist', 'caterer'],
        timeRange: '3-months',
        includeReactivations: false
      }),
      
      // Negative growth scenario
      negativeGrowth: await this.createNegativeGrowthScenario(),
      
      // Extreme seasonal scenario
      seasonalExtreme: await this.createExtremeSeasonalScenario()
    };
  }

  // Private helper methods
  private createSupplierSubscription(
    supplierType: typeof this.SUPPLIER_TYPES[number], 
    tierDistribution: any, 
    seasonalMix: boolean
  ): TestSubscriptionData {
    const tier = this.selectTierByDistribution(tierDistribution);
    const pricing = this.TIER_PRICING[tier];
    
    return {
      id: `supplier_${Math.random().toString(36).substr(2, 9)}`,
      supplierType,
      tier,
      monthlyValue: pricing.monthly,
      annualValue: pricing.annual,
      startDate: this.generateRealisticStartDate(),
      status: Math.random() > 0.05 ? 'active' : 'cancelled', // 5% cancelled rate
      seasonalPattern: this.generateSeasonalPattern(supplierType, seasonalMix)
    };
  }

  private createChurnScenario(seasonalContext: 'peak' | 'off-season', config: ChurnScenarioConfig): TestChurnData {
    const supplierType = config.supplierTypes[Math.floor(Math.random() * config.supplierTypes.length)];
    const tier = this.TIERS[Math.floor(Math.random() * this.TIERS.length)];
    const monthsActive = Math.floor(Math.random() * 24) + 1; // 1-24 months active
    
    return {
      supplierId: `supplier_${Math.random().toString(36).substr(2, 9)}`,
      supplierType,
      tier,
      churnDate: this.generateChurnDate(seasonalContext),
      churnReason: this.selectChurnReason(seasonalContext, tier),
      monthsActive,
      lifetimeValue: monthsActive * this.TIER_PRICING[tier].monthly,
      reactivationProbability: this.calculateReactivationProbability(seasonalContext, tier, monthsActive),
      seasonalContext,
      expectedRate: seasonalContext === 'peak' ? config.peakSeasonChurn : config.offSeasonChurn
    };
  }

  private selectTierByDistribution(distribution: any): typeof this.TIERS[number] {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const tier of this.TIERS) {
      cumulative += distribution[tier];
      if (rand <= cumulative) {
        return tier;
      }
    }
    return 'starter'; // Fallback
  }

  private generateSeasonalPattern(supplierType: string, seasonalMix: boolean) {
    if (!seasonalMix) {
      return { peakMultiplier: 1, offSeasonMultiplier: 1 };
    }
    
    // Wedding industry suppliers have strong seasonal patterns
    const basePatterns = {
      photographer: { peakMultiplier: 3.5, offSeasonMultiplier: 0.4 },
      venue: { peakMultiplier: 2.8, offSeasonMultiplier: 0.6 },
      florist: { peakMultiplier: 4.2, offSeasonMultiplier: 0.2 },
      caterer: { peakMultiplier: 2.5, offSeasonMultiplier: 0.7 },
      other: { peakMultiplier: 2.0, offSeasonMultiplier: 0.8 }
    };
    
    return basePatterns[supplierType] || basePatterns.other;
  }

  private generateRealisticStartDate(): string {
    // Generate start dates with wedding industry signup patterns
    const now = new Date();
    const monthsBack = Math.floor(Math.random() * 24); // 0-24 months ago
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return startDate.toISOString();
  }

  private generateChurnDate(seasonalContext: 'peak' | 'off-season'): string {
    const now = new Date();
    let churnDate: Date;
    
    if (seasonalContext === 'peak') {
      // Churn during peak season (rare but happens)
      const peakMonths = this.SEASONAL_PATTERNS.peak.months;
      const randomPeakMonth = peakMonths[Math.floor(Math.random() * peakMonths.length)];
      churnDate = new Date(now.getFullYear(), randomPeakMonth - 1, Math.floor(Math.random() * 28) + 1);
    } else {
      // Churn during off-season (more common)
      const offSeasonMonths = this.SEASONAL_PATTERNS.offSeason.months;
      const randomOffMonth = offSeasonMonths[Math.floor(Math.random() * offSeasonMonths.length)];
      churnDate = new Date(now.getFullYear(), randomOffMonth - 1, Math.floor(Math.random() * 28) + 1);
    }
    
    return churnDate.toISOString();
  }

  private selectChurnReason(seasonalContext: 'peak' | 'off-season', tier: string): string {
    const churnReasons = {
      peak: [
        'switched_to_competitor',
        'business_growth_outgrew_platform',
        'pricing_concerns',
        'missing_features',
        'poor_support_experience'
      ],
      'off-season': [
        'seasonal_business_pause',
        'cost_reduction',
        'business_closure',
        'reduced_wedding_bookings',
        'cash_flow_issues',
        'trying_alternatives'
      ]
    };
    
    const reasons = churnReasons[seasonalContext];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private calculateReactivationProbability(seasonalContext: 'peak' | 'off-season', tier: string, monthsActive: number): number {
    let baseProbability = 0.3; // 30% base reactivation rate
    
    // Seasonal adjustments
    if (seasonalContext === 'off-season') {
      baseProbability += 0.25; // Higher reactivation from seasonal pauses
    }
    
    // Tier adjustments  
    const tierMultipliers = { starter: 1.0, professional: 1.2, scale: 1.4, enterprise: 1.6 };
    baseProbability *= tierMultipliers[tier] || 1.0;
    
    // Tenure adjustments
    if (monthsActive > 12) {
      baseProbability += 0.15; // Long-term customers more likely to return
    }
    
    return Math.min(baseProbability, 0.8); // Cap at 80%
  }

  private getSourceWeight(source: string): number {
    const weights = {
      'wedding_planner_network': 0.25,
      'venue_partnerships': 0.20,
      'photographer_referrals': 0.30,
      'supplier_directories': 0.10,
      'wedding_shows': 0.08,
      'couple_recommendations': 0.07
    };
    return weights[source] || 0.05;
  }

  private calculateSourceCoefficient(source: string, conversionRate: number): number {
    const baseCoefficients = {
      'wedding_planner_network': 1.8,
      'venue_partnerships': 1.5,
      'photographer_referrals': 2.1,
      'supplier_directories': 0.8,
      'wedding_shows': 1.2,
      'couple_recommendations': 2.8
    };
    
    return (baseCoefficients[source] || 1.0) * conversionRate;
  }

  private getCurrentSeasonMultiplier(seasonalMultipliers: { peak: number; offSeason: number }): number {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const isPeakSeason = this.SEASONAL_PATTERNS.peak.months.includes(currentMonth);
    
    return isPeakSeason ? seasonalMultipliers.peak : seasonalMultipliers.offSeason;
  }

  private mapSourceToNetworkType(source: string): 'professional' | 'venue' | 'couple' | 'directory' {
    const mapping = {
      'wedding_planner_network': 'professional',
      'venue_partnerships': 'venue',
      'photographer_referrals': 'professional',
      'supplier_directories': 'directory',
      'wedding_shows': 'professional',
      'couple_recommendations': 'couple'
    };
    return mapping[source] || 'directory';
  }

  private generateReactivationScenarios(churnData: TestChurnData[]): TestChurnData[] {
    const reactivations: TestChurnData[] = [];
    
    churnData.forEach(churn => {
      if (Math.random() < churn.reactivationProbability) {
        const reactivationDelay = Math.floor(Math.random() * 6) + 1; // 1-6 months delay
        const reactivationDate = new Date(churn.churnDate);
        reactivationDate.setMonth(reactivationDate.getMonth() + reactivationDelay);
        
        reactivations.push({
          ...churn,
          supplierId: `${churn.supplierId}_reactivated`,
          churnDate: reactivationDate.toISOString(),
          churnReason: 'reactivation',
          reactivationProbability: 0.9, // High probability of staying after reactivation
        });
      }
    });
    
    return reactivations;
  }

  private calculateExpectedMRR(subscriptions: TestSubscriptionData[]): number {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => total + sub.monthlyValue, 0);
  }

  private calculateExpectedChurnRate(churnData: TestChurnData[], totalSuppliers: number): number {
    const monthlyChurns = churnData.filter(churn => churn.churnReason !== 'reactivation').length;
    return (monthlyChurns / totalSuppliers) * 100;
  }

  private calculateExpectedViralCoefficient(referralData: TestReferralData[]): number {
    if (referralData.length === 0) return 0;
    
    const totalCoefficient = referralData.reduce((sum, referral) => 
      sum + (referral.coefficient * referral.seasonalMultiplier), 0
    );
    
    return totalCoefficient / referralData.length;
  }

  private async createNegativeGrowthScenario(): Promise<TestSubscriptionData[]> {
    const subscriptions = await this.createWeddingSupplierSubscriptions({
      photographersCount: 50,
      venuesCount: 10,
      floristsCount: 20,
      caterersCount: 15,
      seasonalMix: false,
      tierDistribution: {
        starter: 0.8,  // Mostly low-tier subscriptions
        professional: 0.15,
        scale: 0.04,
        enterprise: 0.01
      }
    });

    // Mark many as cancelled to simulate negative growth
    return subscriptions.map(sub => ({
      ...sub,
      status: Math.random() > 0.3 ? 'cancelled' : 'active' as any // 70% cancelled
    }));
  }

  private async createExtremeSeasonalScenario(): Promise<TestSubscriptionData[]> {
    const subscriptions = await this.createWeddingSupplierSubscriptions({
      photographersCount: 100,
      venuesCount: 25,
      floristsCount: 75,
      caterersCount: 50,
      seasonalMix: true,
      tierDistribution: {
        starter: 0.3,
        professional: 0.4,
        scale: 0.25,
        enterprise: 0.05
      }
    });

    // Exaggerate seasonal patterns for extreme testing
    return subscriptions.map(sub => ({
      ...sub,
      seasonalPattern: {
        peakMultiplier: sub.seasonalPattern.peakMultiplier * 2, // Double the seasonal effect
        offSeasonMultiplier: sub.seasonalPattern.offSeasonMultiplier * 0.5
      }
    }));
  }
}