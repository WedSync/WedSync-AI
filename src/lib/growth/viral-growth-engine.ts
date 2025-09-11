// WS-146: Viral Growth Engine with Referral Program
// Multi-channel referral system, influencer partnerships, organic growth

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  rewards: ReferralReward[];
}

export interface ReferralReward {
  type: 'credits' | 'subscription' | 'features' | 'cash';
  value: number;
  description: string;
  claimedAt?: Date;
}

export interface ViralMetrics {
  referralRate: number;
  viralCoefficient: number;
  kFactor: number;
  conversionRate: number;
  lifetimeValue: number;
  organicGrowthRate: number;
}

export interface InfluencerPartnership {
  id: string;
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin';
  followerCount: number;
  engagementRate: number;
  contractTerms: ContractTerms;
  performance: InfluencerPerformance;
}

export interface ContractTerms {
  duration: number; // months
  compensation: number;
  deliverables: string[];
  exclusivity: boolean;
}

export interface InfluencerPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
}

export interface GrowthCampaign {
  id: string;
  name: string;
  type: 'referral' | 'influencer' | 'viral_feature' | 'content_marketing';
  status: 'planning' | 'active' | 'paused' | 'completed';
  metrics: CampaignMetrics;
  budget: number;
  startDate: Date;
  endDate: Date;
}

export interface CampaignMetrics {
  reach: number;
  engagement: number;
  conversions: number;
  cost: number;
  roi: number;
}

export interface ViralFeature {
  name: string;
  description: string;
  shareability: number;
  viralCoefficient: number;
  implementationDate: Date;
  performance: FeaturePerformance;
}

export interface FeaturePerformance {
  shares: number;
  views: number;
  conversions: number;
  retentionImpact: number;
}

export class ViralGrowthEngine {
  private referralCodes: Map<string, ReferralCode> = new Map();
  private campaigns: Map<string, GrowthCampaign> = new Map();
  private influencerPartnerships: Map<string, InfluencerPartnership> =
    new Map();
  private viralFeatures: Map<string, ViralFeature> = new Map();

  // Referral Program Management
  async createReferralCode(
    userId: string,
    options?: {
      customCode?: string;
      maxUses?: number;
      expiresAt?: Date;
      rewards?: ReferralReward[];
    },
  ): Promise<ReferralCode> {
    const code = options?.customCode || this.generateReferralCode();
    const referralCode: ReferralCode = {
      code,
      userId,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
      maxUses: options?.maxUses,
      currentUses: 0,
      rewards: options?.rewards || this.getDefaultRewards(),
    };

    this.referralCodes.set(code, referralCode);
    await this.saveReferralCode(referralCode);

    return referralCode;
  }

  async processReferral(
    referralCode: string,
    newUserId: string,
  ): Promise<{
    success: boolean;
    rewards?: ReferralReward[];
    error?: string;
  }> {
    const code = this.referralCodes.get(referralCode);

    if (!code) {
      return { success: false, error: 'Invalid referral code' };
    }

    if (code.expiresAt && code.expiresAt < new Date()) {
      return { success: false, error: 'Referral code has expired' };
    }

    if (code.maxUses && code.currentUses >= code.maxUses) {
      return { success: false, error: 'Referral code usage limit exceeded' };
    }

    // Update usage count
    code.currentUses += 1;
    await this.updateReferralCode(code);

    // Process rewards for referrer
    const referrerRewards = await this.processReferrerRewards(
      code.userId,
      newUserId,
    );

    // Process rewards for referee
    const refereeRewards = await this.processRefereeRewards(
      newUserId,
      code.userId,
    );

    // Track viral metrics
    await this.trackViralConversion(referralCode, newUserId);

    return {
      success: true,
      rewards: [...referrerRewards, ...refereeRewards],
    };
  }

  async generateReferralLink(
    userId: string,
    campaign?: string,
  ): Promise<string> {
    const referralCode = await this.createReferralCode(userId);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.wedsync.com';
    const params = new URLSearchParams({
      ref: referralCode.code,
      utm_source: 'referral',
      utm_medium: 'user_referral',
      utm_campaign: campaign || 'general_referral',
    });

    return `${baseUrl}/signup?${params.toString()}`;
  }

  // Influencer Partnership Management
  async createInfluencerPartnership(
    partnership: Omit<InfluencerPartnership, 'id' | 'performance'>,
  ): Promise<InfluencerPartnership> {
    const id = this.generateId();
    const newPartnership: InfluencerPartnership = {
      ...partnership,
      id,
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        roi: 0,
      },
    };

    this.influencerPartnerships.set(id, newPartnership);
    await this.saveInfluencerPartnership(newPartnership);

    return newPartnership;
  }

  async trackInfluencerPerformance(
    influencerId: string,
    metrics: Partial<InfluencerPerformance>,
  ): Promise<void> {
    const partnership = this.influencerPartnerships.get(influencerId);
    if (!partnership) return;

    partnership.performance = {
      ...partnership.performance,
      ...metrics,
    };

    // Calculate ROI
    if (partnership.performance.revenue > 0) {
      partnership.performance.roi =
        (partnership.performance.revenue -
          partnership.contractTerms.compensation) /
        partnership.contractTerms.compensation;
    }

    await this.updateInfluencerPartnership(partnership);
  }

  // Viral Feature Implementation
  async implementViralFeature(
    feature: Omit<ViralFeature, 'performance'>,
  ): Promise<ViralFeature> {
    const newFeature: ViralFeature = {
      ...feature,
      performance: {
        shares: 0,
        views: 0,
        conversions: 0,
        retentionImpact: 0,
      },
    };

    this.viralFeatures.set(feature.name, newFeature);
    await this.saveViralFeature(newFeature);

    return newFeature;
  }

  async trackViralFeatureUsage(
    featureName: string,
    usage: Partial<FeaturePerformance>,
  ): Promise<void> {
    const feature = this.viralFeatures.get(featureName);
    if (!feature) return;

    feature.performance = {
      ...feature.performance,
      ...usage,
    };

    // Update viral coefficient based on performance
    if (feature.performance.views > 0) {
      feature.viralCoefficient =
        feature.performance.shares / feature.performance.views;
    }

    await this.updateViralFeature(feature);
  }

  // Growth Campaign Management
  async createGrowthCampaign(
    campaign: Omit<GrowthCampaign, 'id' | 'metrics'>,
  ): Promise<GrowthCampaign> {
    const id = this.generateId();
    const newCampaign: GrowthCampaign = {
      ...campaign,
      id,
      metrics: {
        reach: 0,
        engagement: 0,
        conversions: 0,
        cost: 0,
        roi: 0,
      },
    };

    this.campaigns.set(id, newCampaign);
    await this.saveGrowthCampaign(newCampaign);

    return newCampaign;
  }

  async trackCampaignMetrics(
    campaignId: string,
    metrics: Partial<CampaignMetrics>,
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    campaign.metrics = {
      ...campaign.metrics,
      ...metrics,
    };

    // Calculate ROI
    if (campaign.metrics.cost > 0) {
      const revenue = campaign.metrics.conversions * 100; // Assume $100 LTV
      campaign.metrics.roi =
        (revenue - campaign.metrics.cost) / campaign.metrics.cost;
    }

    await this.updateGrowthCampaign(campaign);
  }

  // Viral Metrics Calculation
  async calculateViralMetrics(): Promise<ViralMetrics> {
    const totalUsers = await this.getTotalUserCount();
    const referredUsers = await this.getReferredUserCount();
    const totalRevenue = await this.getTotalRevenue();
    const organicUsers = await this.getOrganicUserCount();

    // Calculate metrics
    const referralRate = referredUsers / totalUsers;
    const averageReferrals = await this.getAverageReferralsPerUser();
    const referralConversionRate = await this.getReferralConversionRate();

    const viralCoefficient = averageReferrals * referralConversionRate;
    const kFactor = viralCoefficient; // Simplified K-factor calculation

    const lifetimeValue = totalRevenue / totalUsers;
    const organicGrowthRate = (organicUsers / totalUsers) * 100;

    return {
      referralRate,
      viralCoefficient,
      kFactor,
      conversionRate: referralConversionRate,
      lifetimeValue,
      organicGrowthRate,
    };
  }

  // Social Sharing Integration
  async generateShareableContent(
    contentType: 'achievement' | 'milestone' | 'result',
  ): Promise<{
    title: string;
    description: string;
    image: string;
    url: string;
    hashtags: string[];
  }> {
    const templates = {
      achievement: {
        title: 'Just saved 15 hours planning my wedding with WedSync! 🎉',
        description:
          "WedSync's automation tools are a game-changer for wedding planning. Try it free!",
        hashtags: ['#WeddingPlanning', '#WedSync', '#WeddingTech'],
      },
      milestone: {
        title: 'Wedding planning milestone reached! ✅',
        description:
          "Another step closer to the perfect day with WedSync's smart planning tools.",
        hashtags: ['#WeddingMilestone', '#WedSync', '#WeddingProgress'],
      },
      result: {
        title: 'Amazing wedding results with WedSync! 💍',
        description: 'See how WedSync helped create the perfect wedding day.',
        hashtags: ['#WeddingSuccess', '#WedSync', '#PerfectWedding'],
      },
    };

    const template = templates[contentType];
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.wedsync.com';

    return {
      ...template,
      image: `${baseUrl}/images/share-${contentType}.jpg`,
      url: `${baseUrl}/share/${contentType}`,
    };
  }

  async shareContent(
    platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram',
    content: any,
  ): Promise<string> {
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.title)}&url=${encodeURIComponent(content.url)}&hashtags=${content.hashtags.join(',')}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(content.url)}`,
      instagram: content.url, // Instagram sharing requires app integration
    };

    return shareUrls[platform];
  }

  // App Store Feature Pitch
  async generateAppStoreFeaturePitch(): Promise<{
    title: string;
    description: string;
    keyMetrics: string[];
    testimonials: string[];
    screenshots: string[];
  }> {
    const metrics = await this.calculateViralMetrics();
    const userCount = await this.getTotalUserCount();

    return {
      title: "WedSync: The Wedding Industry's Fastest-Growing Platform",
      description:
        'Join 10,000+ wedding professionals using WedSync to streamline their business, increase bookings, and deliver exceptional client experiences.',
      keyMetrics: [
        `${userCount.toLocaleString()}+ active wedding professionals`,
        `${Math.round(metrics.organicGrowthRate)}% month-over-month growth`,
        `4.9/5 star rating with 2,500+ reviews`,
        `Average user saves 15+ hours per wedding`,
      ],
      testimonials: await this.getTopTestimonials(),
      screenshots: [
        '/screenshots/dashboard-overview.jpg',
        '/screenshots/client-management.jpg',
        '/screenshots/workflow-automation.jpg',
        '/screenshots/analytics-dashboard.jpg',
        '/screenshots/mobile-app.jpg',
      ],
    };
  }

  // Private helper methods
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  private getDefaultRewards(): ReferralReward[] {
    return [
      {
        type: 'subscription',
        value: 2,
        description: '2 months free premium subscription',
      },
      {
        type: 'features',
        value: 1,
        description: 'Access to advanced analytics',
      },
    ];
  }

  private async processReferrerRewards(
    referrerId: string,
    newUserId: string,
  ): Promise<ReferralReward[]> {
    // Mock implementation - integrate with billing system
    const rewards = [
      {
        type: 'subscription' as const,
        value: 2,
        description: '2 months free premium for successful referral',
        claimedAt: new Date(),
      },
    ];

    await this.applyRewards(referrerId, rewards);
    return rewards;
  }

  private async processRefereeRewards(
    refereeId: string,
    referrerId: string,
  ): Promise<ReferralReward[]> {
    // Mock implementation
    const rewards = [
      {
        type: 'subscription' as const,
        value: 1,
        description: '1 month free premium for joining via referral',
        claimedAt: new Date(),
      },
    ];

    await this.applyRewards(refereeId, rewards);
    return rewards;
  }

  private async applyRewards(
    userId: string,
    rewards: ReferralReward[],
  ): Promise<void> {
    // Integrate with billing/subscription system
    console.log(`Applying rewards for user ${userId}:`, rewards);
  }

  private async trackViralConversion(
    referralCode: string,
    newUserId: string,
  ): Promise<void> {
    // Track conversion metrics
    const conversionData = {
      referralCode,
      newUserId,
      convertedAt: new Date(),
      source: 'referral',
    };

    await this.saveConversionData(conversionData);
  }

  // Data persistence methods (mock implementations)
  private async saveReferralCode(code: ReferralCode): Promise<void> {
    // Save to database
    console.log('Saving referral code:', code);
  }

  private async updateReferralCode(code: ReferralCode): Promise<void> {
    // Update in database
    console.log('Updating referral code:', code);
  }

  private async saveInfluencerPartnership(
    partnership: InfluencerPartnership,
  ): Promise<void> {
    console.log('Saving influencer partnership:', partnership);
  }

  private async updateInfluencerPartnership(
    partnership: InfluencerPartnership,
  ): Promise<void> {
    console.log('Updating influencer partnership:', partnership);
  }

  private async saveViralFeature(feature: ViralFeature): Promise<void> {
    console.log('Saving viral feature:', feature);
  }

  private async updateViralFeature(feature: ViralFeature): Promise<void> {
    console.log('Updating viral feature:', feature);
  }

  private async saveGrowthCampaign(campaign: GrowthCampaign): Promise<void> {
    console.log('Saving growth campaign:', campaign);
  }

  private async updateGrowthCampaign(campaign: GrowthCampaign): Promise<void> {
    console.log('Updating growth campaign:', campaign);
  }

  private async saveConversionData(data: any): Promise<void> {
    console.log('Saving conversion data:', data);
  }

  // Mock data methods
  private async getTotalUserCount(): Promise<number> {
    return 12500;
  }

  private async getReferredUserCount(): Promise<number> {
    return 3125; // 25% referred
  }

  private async getTotalRevenue(): Promise<number> {
    return 1250000; // $1.25M
  }

  private async getOrganicUserCount(): Promise<number> {
    return 9375; // 75% organic
  }

  private async getAverageReferralsPerUser(): Promise<number> {
    return 2.3;
  }

  private async getReferralConversionRate(): Promise<number> {
    return 0.15; // 15%
  }

  private async getTopTestimonials(): Promise<string[]> {
    return [
      "WedSync transformed my wedding planning business - I'm booking 40% more clients!",
      'The automation features saved me 20 hours per wedding. Game changer!',
      "Best investment I've made in my wedding photography business.",
      'Client communication has never been easier. My couples love the experience!',
    ];
  }
}
