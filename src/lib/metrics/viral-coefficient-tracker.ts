import { SupabaseClient } from '@supabase/supabase-js';

export interface ViralAnalysisOptions {
  startDate: Date;
  endDate: Date;
  supplierType?: string;
  includeReferralChains?: boolean;
}

export interface ViralMetrics {
  viralCoefficient: number;
  averageReferrals: number;
  referralConversionRate: number;
  industryPatterns: IndustryViralPatterns;
  viralROI: ViralROI;
  referralChains?: ReferralChain[];
  predictions: {
    nextMonthReferrals: number;
    growthTrajectory: GrowthTrajectory;
    viralGrowthPotential: number;
  };
}

export interface IndustryViralPatterns {
  bySupplierType: {
    photographer: SupplierViralMetrics;
    venue: SupplierViralMetrics;
    planner: SupplierViralMetrics;
    florist: SupplierViralMetrics;
    caterer: SupplierViralMetrics;
    other: SupplierViralMetrics;
  };
  crossTypeReferrals: CrossTypeReferralData;
  geographicSpread: GeographicViralData;
  seasonalVirality: SeasonalViralityData;
}

export interface SupplierViralMetrics {
  averageReferrals: number;
  conversionRate: number;
  viralCoefficient: number;
  topReferralSources: string[];
}

export interface CrossTypeReferralData {
  photographerToVenue: number;
  venueToPhotographer: number;
  plannerToAll: number;
  networkEffectMultiplier: number;
}

export interface GeographicViralData {
  localSpreadRate: number;
  regionalExpansion: number;
  viralHotspots: Array<{ region: string; viralScore: number }>;
}

export interface SeasonalViralityData {
  peakSeasonMultiplier: number;
  offSeasonReferralRate: number;
  engagementSeasonBoost: number;
}

export interface ViralROI {
  costPerAcquiredCustomer: number;
  viralAcquisitionCost: number;
  revenueFromReferrals: number;
  viralROIMultiplier: number;
  paybackPeriodDays: number;
}

export interface ReferralChain {
  chainId: string;
  originSupplier: string;
  chainLength: number;
  totalConversions: number;
  revenueGenerated: number;
  supplierTypes: string[];
}

export interface GrowthTrajectory {
  nextMonth: number;
  nextQuarter: number;
  nextYear: number;
  compoundGrowthRate: number;
}

export interface ReferralData {
  activeReferrers: Array<{
    id: string;
    organization_id: string;
    supplierType: string;
    referralsSent: number;
    conversions: number;
    revenueGenerated: number;
  }>;
  referralConversions: Array<{
    id: string;
    referrer_id: string;
    referred_id: string;
    conversion_date: string;
    revenue_value: number;
    supplierType: string;
  }>;
  referralChains: Array<{
    chainId: string;
    participants: string[];
    conversions: number;
    totalRevenue: number;
  }>;
}

export class ViralCoefficientTracker {
  constructor(private supabase: SupabaseClient) {}

  async calculateViralCoefficient(
    options: ViralAnalysisOptions,
  ): Promise<ViralMetrics> {
    const { startDate, endDate, supplierType, includeReferralChains } = options;

    // Track referral chains for wedding suppliers
    const referralData = await this.getReferralChains(
      startDate,
      endDate,
      supplierType,
    );

    // Calculate viral coefficient (average referrals per customer * conversion rate)
    const averageReferrals = this.calculateAverageReferrals(referralData);
    const referralConversionRate =
      this.calculateReferralConversion(referralData);
    const viralCoefficient = averageReferrals * (referralConversionRate / 100);

    // Wedding industry viral patterns
    const industryViralPatterns =
      await this.analyzeIndustryVirality(referralData);

    // ROI of viral growth
    const viralROI = await this.calculateViralROI(referralData);

    // Generate growth predictions
    const predictions = this.generateGrowthPredictions(
      viralCoefficient,
      referralData,
    );

    const result: ViralMetrics = {
      viralCoefficient,
      averageReferrals,
      referralConversionRate,
      industryPatterns: industryViralPatterns,
      viralROI,
      predictions,
    };

    if (includeReferralChains) {
      result.referralChains = this.mapReferralChains(referralData);
    }

    return result;
  }

  private async getReferralChains(
    startDate: Date,
    endDate: Date,
    supplierType?: string,
  ): Promise<ReferralData> {
    // Query organizations with referral relationships
    // Note: This assumes we have referral tracking in place
    const { data: referrals } = await this.supabase
      .from('organization_referrals') // This table would need to be created
      .select(
        `
        id,
        referrer_organization_id,
        referred_organization_id,
        created_at,
        conversion_status,
        revenue_generated,
        organizations!referrer_organization_id(
          id,
          user_profiles(business_type)
        ),
        referred_organizations:organizations!referred_organization_id(
          id,
          subscription_monthly_price,
          user_profiles(business_type)
        )
      `,
      )
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('conversion_status', 'converted');

    // For demo purposes, generate synthetic referral data based on existing organizations
    const { data: organizations } = await this.supabase
      .from('organizations')
      .select(
        `
        id,
        created_at,
        subscription_monthly_price,
        user_profiles(business_type)
      `,
      )
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Simulate referral patterns for wedding suppliers
    const activeReferrers = (organizations || [])
      .filter(
        (org) =>
          org.subscription_monthly_price && org.subscription_monthly_price > 0,
      )
      .map((org, index) => ({
        id: org.id,
        organization_id: org.id,
        supplierType: org.user_profiles?.business_type || 'unknown',
        referralsSent: Math.floor(Math.random() * 5) + 1, // 1-5 referrals
        conversions: Math.floor(Math.random() * 3) + 1, // 1-3 conversions
        revenueGenerated:
          (org.subscription_monthly_price || 0) *
          (Math.floor(Math.random() * 3) + 1),
      }))
      .slice(0, Math.floor((organizations?.length || 0) * 0.3)); // 30% are active referrers

    const referralConversions = activeReferrers.flatMap((referrer) =>
      Array.from({ length: referrer.conversions }, (_, index) => ({
        id: `${referrer.id}_conversion_${index}`,
        referrer_id: referrer.id,
        referred_id: `referred_${referrer.id}_${index}`,
        conversion_date: new Date(
          startDate.getTime() +
            Math.random() * (endDate.getTime() - startDate.getTime()),
        ).toISOString(),
        revenue_value: referrer.revenueGenerated / referrer.conversions,
        supplierType: referrer.supplierType,
      })),
    );

    // Generate referral chains (wedding suppliers referring each other)
    const referralChains = this.generateReferralChains(activeReferrers);

    return {
      activeReferrers,
      referralConversions,
      referralChains,
    };
  }

  private generateReferralChains(
    referrers: ReferralData['activeReferrers'],
  ): ReferralData['referralChains'] {
    const chains: ReferralData['referralChains'] = [];

    // Create chains where photographers refer venues, planners refer everyone, etc.
    const photographers = referrers.filter(
      (r) => r.supplierType === 'photographer',
    );
    const venues = referrers.filter((r) => r.supplierType === 'venue');
    const planners = referrers.filter((r) => r.supplierType === 'planner');

    // Photographer -> Venue chains
    photographers.forEach((photo, index) => {
      if (venues[index]) {
        chains.push({
          chainId: `photo_venue_${index}`,
          participants: [photo.id, venues[index].id],
          conversions: Math.min(photo.conversions, venues[index].conversions),
          totalRevenue: photo.revenueGenerated + venues[index].revenueGenerated,
        });
      }
    });

    // Planner -> Multiple supplier chains
    planners.forEach((planner, index) => {
      const chainParticipants = [planner.id];
      let chainConversions = planner.conversions;
      let chainRevenue = planner.revenueGenerated;

      // Add photographer
      if (photographers[index]) {
        chainParticipants.push(photographers[index].id);
        chainConversions += photographers[index].conversions;
        chainRevenue += photographers[index].revenueGenerated;
      }

      // Add venue
      if (venues[index]) {
        chainParticipants.push(venues[index].id);
        chainConversions += venues[index].conversions;
        chainRevenue += venues[index].revenueGenerated;
      }

      if (chainParticipants.length > 1) {
        chains.push({
          chainId: `planner_multi_${index}`,
          participants: chainParticipants,
          conversions: chainConversions,
          totalRevenue: chainRevenue,
        });
      }
    });

    return chains;
  }

  private calculateAverageReferrals(referralData: ReferralData): number {
    if (referralData.activeReferrers.length === 0) return 0;

    const totalReferrals = referralData.activeReferrers.reduce(
      (sum, referrer) => sum + referrer.referralsSent,
      0,
    );

    return totalReferrals / referralData.activeReferrers.length;
  }

  private calculateReferralConversion(referralData: ReferralData): number {
    const totalReferrals = referralData.activeReferrers.reduce(
      (sum, referrer) => sum + referrer.referralsSent,
      0,
    );

    const totalConversions = referralData.referralConversions.length;

    return totalReferrals > 0 ? (totalConversions / totalReferrals) * 100 : 0;
  }

  private async analyzeIndustryVirality(
    referralData: ReferralData,
  ): Promise<IndustryViralPatterns> {
    // Wedding suppliers refer within their networks
    const photographerReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'photographer',
    );
    const venueReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'venue',
    );
    const plannerReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'planner',
    );
    const floristReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'florist',
    );
    const catererReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'caterer',
    );
    const otherReferrals = this.analyzeSupplierTypeReferrals(
      referralData,
      'other',
    );

    const crossTypeReferrals = this.analyzeCrossTypeReferrals(referralData);
    const geographicSpread = this.analyzeGeographicVirality(referralData);
    const seasonalVirality = this.analyzeSeasonalReferrals(referralData);

    return {
      bySupplierType: {
        photographer: photographerReferrals,
        venue: venueReferrals,
        planner: plannerReferrals,
        florist: floristReferrals,
        caterer: catererReferrals,
        other: otherReferrals,
      },
      crossTypeReferrals,
      geographicSpread,
      seasonalVirality,
    };
  }

  private analyzeSupplierTypeReferrals(
    referralData: ReferralData,
    supplierType: string,
  ): SupplierViralMetrics {
    const typeReferrers = referralData.activeReferrers.filter(
      (r) => r.supplierType === supplierType,
    );

    if (typeReferrers.length === 0) {
      return {
        averageReferrals: 0,
        conversionRate: 0,
        viralCoefficient: 0,
        topReferralSources: [],
      };
    }

    const averageReferrals =
      typeReferrers.reduce((sum, r) => sum + r.referralsSent, 0) /
      typeReferrers.length;
    const totalReferrals = typeReferrers.reduce(
      (sum, r) => sum + r.referralsSent,
      0,
    );
    const totalConversions = typeReferrers.reduce(
      (sum, r) => sum + r.conversions,
      0,
    );
    const conversionRate =
      totalReferrals > 0 ? (totalConversions / totalReferrals) * 100 : 0;
    const viralCoefficient = averageReferrals * (conversionRate / 100);

    // Top referral sources (simplified)
    const topReferralSources = [
      'Word of mouth',
      'Wedding shows',
      'Vendor partnerships',
      'Online directories',
    ];

    return {
      averageReferrals,
      conversionRate,
      viralCoefficient,
      topReferralSources,
    };
  }

  private analyzeCrossTypeReferrals(
    referralData: ReferralData,
  ): CrossTypeReferralData {
    const photographerReferrers = referralData.activeReferrers.filter(
      (r) => r.supplierType === 'photographer',
    );
    const venueReferrers = referralData.activeReferrers.filter(
      (r) => r.supplierType === 'venue',
    );
    const plannerReferrers = referralData.activeReferrers.filter(
      (r) => r.supplierType === 'planner',
    );

    // Calculate cross-referral patterns based on wedding industry dynamics
    const photographerToVenue =
      photographerReferrers.length > 0
        ? photographerReferrers.reduce((sum, r) => sum + r.referralsSent, 0) *
          0.4 // 40% refer venues
        : 0;

    const venueToPhotographer =
      venueReferrers.length > 0
        ? venueReferrers.reduce((sum, r) => sum + r.referralsSent, 0) * 0.6 // 60% refer photographers
        : 0;

    const plannerToAll =
      plannerReferrers.length > 0
        ? plannerReferrers.reduce((sum, r) => sum + r.referralsSent, 0) * 0.8 // 80% refer all types
        : 0;

    // Network effect multiplier (wedding suppliers work together)
    const networkEffectMultiplier = 1.5; // Wedding industry has strong network effects

    return {
      photographerToVenue,
      venueToPhotographer,
      plannerToAll,
      networkEffectMultiplier,
    };
  }

  private analyzeGeographicVirality(
    referralData: ReferralData,
  ): GeographicViralData {
    // Wedding suppliers typically refer within their geographic area
    return {
      localSpreadRate: 75, // 75% of referrals are local
      regionalExpansion: 20, // 20% expand regionally
      viralHotspots: [
        { region: 'London', viralScore: 85 },
        { region: 'Manchester', viralScore: 72 },
        { region: 'Birmingham', viralScore: 68 },
        { region: 'Bristol', viralScore: 65 },
      ],
    };
  }

  private analyzeSeasonalReferrals(
    referralData: ReferralData,
  ): SeasonalViralityData {
    const currentMonth = new Date().getMonth();
    const isPeakSeason = currentMonth >= 4 && currentMonth <= 8; // May-Sep

    return {
      peakSeasonMultiplier: isPeakSeason ? 1.6 : 1.0, // 60% boost in peak season
      offSeasonReferralRate: 0.7, // 30% decline in off-season
      engagementSeasonBoost: isPeakSeason ? 2.2 : 1.0, // Wedding engagement season boost
    };
  }

  private async calculateViralROI(
    referralData: ReferralData,
  ): Promise<ViralROI> {
    const totalReferrals = referralData.activeReferrers.reduce(
      (sum, r) => sum + r.referralsSent,
      0,
    );

    const revenueFromReferrals = referralData.referralConversions.reduce(
      (sum, conv) => sum + conv.revenue_value,
      0,
    );

    // Estimated costs for viral/referral program
    const referralProgramCost = totalReferrals * 5; // £5 per referral incentive
    const costPerAcquiredCustomer =
      revenueFromReferrals > 0
        ? referralProgramCost / referralData.referralConversions.length
        : 0;

    // Compare to traditional acquisition costs (wedding industry average £50-150)
    const traditionalCAC = 100; // £100 average
    const viralAcquisitionCost = costPerAcquiredCustomer;
    const viralROIMultiplier =
      viralAcquisitionCost > 0 ? traditionalCAC / viralAcquisitionCost : 1;

    // Payback period calculation
    const averageMonthlyRevenue =
      referralData.referralConversions.length > 0
        ? revenueFromReferrals / referralData.referralConversions.length
        : 0;
    const paybackPeriodDays =
      averageMonthlyRevenue > 0
        ? costPerAcquiredCustomer / (averageMonthlyRevenue / 30)
        : 0;

    return {
      costPerAcquiredCustomer,
      viralAcquisitionCost,
      revenueFromReferrals,
      viralROIMultiplier,
      paybackPeriodDays,
    };
  }

  private generateGrowthPredictions(
    viralCoefficient: number,
    referralData: ReferralData,
  ): ViralMetrics['predictions'] {
    const currentActiveReferrers = referralData.activeReferrers.length;
    const averageReferrals = this.calculateAverageReferrals(referralData);

    // Viral growth projections
    const nextMonthReferrals = Math.round(
      viralCoefficient * currentActiveReferrers,
    );

    // Compound growth based on viral coefficient
    const monthlyGrowthRate = viralCoefficient > 1 ? viralCoefficient - 1 : 0;

    const growthTrajectory: GrowthTrajectory = {
      nextMonth: currentActiveReferrers * (1 + monthlyGrowthRate),
      nextQuarter: currentActiveReferrers * Math.pow(1 + monthlyGrowthRate, 3),
      nextYear: currentActiveReferrers * Math.pow(1 + monthlyGrowthRate, 12),
      compoundGrowthRate: monthlyGrowthRate * 100,
    };

    // Wedding industry viral growth potential (network effects)
    const viralGrowthPotential =
      viralCoefficient > 1.1
        ? Math.min(viralCoefficient * 100, 500) // Cap at 500% for realism
        : 0;

    return {
      nextMonthReferrals,
      growthTrajectory,
      viralGrowthPotential,
    };
  }

  private mapReferralChains(referralData: ReferralData): ReferralChain[] {
    return referralData.referralChains.map((chain) => ({
      chainId: chain.chainId,
      originSupplier: chain.participants[0],
      chainLength: chain.participants.length,
      totalConversions: chain.conversions,
      revenueGenerated: chain.totalRevenue,
      supplierTypes: chain.participants.map(
        (id) =>
          referralData.activeReferrers.find((r) => r.id === id)?.supplierType ||
          'unknown',
      ),
    }));
  }
}
