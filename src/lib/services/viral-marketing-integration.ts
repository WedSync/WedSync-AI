import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MarketingAutomationService } from './marketing-automation-service';
import { AttributionModelingService } from './attribution-modeling-service';
import { AIContentGenerator } from './ai-content-generator';

// Viral Marketing Integration for WS-143 Round 2 - Team B Integration
export interface ViralInfluencerData {
  userId: string;
  influencerTier: 'starter' | 'growing' | 'super_connector' | 'viral_champion';
  networkConnections: number;
  totalAttributedRevenue: number;
  viralChain: ViralChainNode[];
  recentActivity: ViralActivityEvent[];
  networkValue: number;
  viralCoefficient: number;
  topConvertingInvites: ViralInvite[];
  growthRecommendations: string[];
  weeklyNetworkGrowth: number;
  monthlyNetworkGrowth: number;
  conversionRate: number;
  averageInviteValue: number;
  lastViralActivity: Date;
}

export interface ViralChainNode {
  userId: string;
  name: string;
  businessName: string;
  supplierType: string;
  generation: number;
  directReferrals: number;
  totalDownlineRevenue: number;
  joinDate: Date;
  isActive: boolean;
}

export interface ViralActivityEvent {
  eventType:
    | 'invitation_sent'
    | 'referral_joined'
    | 'network_milestone'
    | 'revenue_attributed';
  eventDate: Date;
  eventData: Record<string, any>;
  impactScore: number;
}

export interface ViralInvite {
  inviteId: string;
  recipientType: string;
  conversionRate: number;
  attributedRevenue: number;
  personalizedElements: string[];
  performanceScore: number;
}

export interface EnhancedCampaignConfig {
  baseConfig: any;
  viralEnhancements: {
    isViralInfluencer: boolean;
    viralCoefficient: number;
    networkValue: number;
    recentViralActivity: boolean;
    influencerTier: string;
    networkSize: number;
  };
  campaignType:
    | 'standard'
    | 'super_connector_vip'
    | 'viral_champion'
    | 'network_builder';
  rewardMultiplier: number;
  priorityDelivery: boolean;
  exclusiveContent: boolean;
  networkGrowthIncentives: string[];
}

export interface SuperConnectorReward {
  userId: string;
  rewardType:
    | 'premium_features'
    | 'exclusive_access'
    | 'revenue_bonus'
    | 'network_tools';
  rewardValue: number;
  unlockCriteria: Record<string, any>;
  expiresAt: Date;
  isActive: boolean;
}

export class ViralMarketingIntegration {
  private static instance: ViralMarketingIntegration;
  private supabase: any;
  private marketingService: MarketingAutomationService;
  private attributionService: AttributionModelingService;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
    this.marketingService = MarketingAutomationService.getInstance();
    this.attributionService = AttributionModelingService.getInstance();
  }

  static getInstance(): ViralMarketingIntegration {
    if (!ViralMarketingIntegration.instance) {
      ViralMarketingIntegration.instance = new ViralMarketingIntegration();
    }
    return ViralMarketingIntegration.instance;
  }

  /**
   * Enhance standard campaigns with viral data from Team B
   */
  static async enhanceCampaignsWithViralData(
    userId: string,
  ): Promise<EnhancedCampaignConfig> {
    try {
      // Get viral activity data from Team B's system
      const viralData = await this.getViralDataFromTeamB(userId);

      // Get base campaign configuration
      const baseConfig = await this.getBaseCampaignConfig(userId);

      // Enhance campaign targeting with viral insights
      const enhancement: EnhancedCampaignConfig = {
        baseConfig,
        viralEnhancements: {
          isViralInfluencer: viralData.viralChain?.length >= 3,
          viralCoefficient: viralData.viralCoefficient || 0,
          networkValue: viralData.networkValue || 0,
          recentViralActivity: viralData.recentActivity?.length > 0 || false,
          influencerTier: viralData.influencerTier || 'starter',
          networkSize: viralData.networkConnections || 0,
        },
        campaignType: 'standard',
        rewardMultiplier: 1.0,
        priorityDelivery: false,
        exclusiveContent: false,
        networkGrowthIncentives: [],
      };

      // Super-connectors get special campaign treatment
      if (enhancement.viralEnhancements.isViralInfluencer) {
        enhancement.campaignType = 'super_connector_vip';
        enhancement.rewardMultiplier = 2.5;
        enhancement.priorityDelivery = true;
        enhancement.exclusiveContent = true;
        enhancement.networkGrowthIncentives = [
          'Exclusive network growth tools',
          'Premium referral rewards',
          'VIP customer success support',
        ];
      }

      // Viral champions get the highest tier treatment
      if (viralData.influencerTier === 'viral_champion') {
        enhancement.campaignType = 'viral_champion';
        enhancement.rewardMultiplier = 5.0;
        enhancement.networkGrowthIncentives.push(
          'Revenue sharing program',
          'Co-marketing opportunities',
          'Advisory board invitation',
        );
      }

      return enhancement;
    } catch (error) {
      console.error('Viral campaign enhancement failed:', error);
      return this.getDefaultCampaignConfig(userId);
    }
  }

  /**
   * Create specialized campaign sequences for super-connectors
   */
  static async createViralCampaignSequence(
    superConnectorId: string,
    viralData: ViralInfluencerData,
  ): Promise<void> {
    try {
      const sequences = [
        {
          delay: 0,
          template: 'super_connector_welcome',
          personalization: {
            networkSize: viralData.networkConnections,
            attributedRevenue: viralData.totalAttributedRevenue,
            tier: viralData.influencerTier,
            personalizedGreeting:
              await this.generatePersonalizedGreeting(viralData),
          },
        },
        {
          delay: 72, // 3 days
          template: 'viral_growth_tips',
          personalization: {
            bestPerformingInvites: viralData.topConvertingInvites.slice(0, 3),
            optimizationSuggestions: viralData.growthRecommendations,
            customTips: await this.generateCustomGrowthTips(viralData),
          },
        },
        {
          delay: 168, // 1 week
          template: 'exclusive_features_unlock',
          personalization: {
            premiumFeatures:
              await this.getViralRewardFeatures(superConnectorId),
            networkStats: {
              weeklyGrowth: viralData.weeklyNetworkGrowth,
              monthlyGrowth: viralData.monthlyNetworkGrowth,
              totalRevenue: viralData.totalAttributedRevenue,
            },
          },
        },
        {
          delay: 336, // 2 weeks
          template: 'network_milestone_celebration',
          personalization: {
            achievements: await this.calculateNetworkAchievements(viralData),
            nextMilestones: await this.getNextMilestones(viralData),
            exclusiveRewards: await this.getExclusiveRewards(superConnectorId),
          },
        },
      ];

      for (const sequence of sequences) {
        await this.scheduleCampaignWithViralContext(superConnectorId, sequence);
      }
    } catch (error) {
      console.error('Viral campaign sequence creation failed:', error);
      throw error;
    }
  }

  /**
   * Trigger viral growth campaigns based on network activity
   */
  static async triggerViralGrowthCampaigns(
    userId: string,
    activityType:
      | 'new_referral'
      | 'milestone_reached'
      | 'network_growth'
      | 'revenue_threshold',
  ): Promise<void> {
    try {
      const viralData = await this.getViralDataFromTeamB(userId);

      switch (activityType) {
        case 'new_referral':
          await this.triggerNewReferralCelebration(userId, viralData);
          break;

        case 'milestone_reached':
          await this.triggerMilestoneCelebration(userId, viralData);
          break;

        case 'network_growth':
          await this.triggerNetworkGrowthCampaign(userId, viralData);
          break;

        case 'revenue_threshold':
          await this.triggerRevenueThresholdCampaign(userId, viralData);
          break;
      }
    } catch (error) {
      console.error('Viral growth campaign trigger failed:', error);
    }
  }

  /**
   * Personalize viral invitations with AI and viral context
   */
  static async personalizeViralInvitation(
    senderId: string,
    recipientData: any,
    invitationType: 'peer' | 'cross_supplier' | 'couple_referral',
  ): Promise<{
    subject: string;
    content: string;
    personalizedElements: string[];
    expectedConversionRate: number;
  }> {
    try {
      const senderData = await this.getViralDataFromTeamB(senderId);

      // Use AI to generate personalized invitation content
      const aiContent = await AIContentGenerator.optimizeEmailContent(
        this.getBaseInvitationTemplate(invitationType),
        {
          userType: recipientData.supplierType,
          businessType: recipientData.businessType,
          experienceLevel: recipientData.experienceLevel,
          recentActivity: recipientData.recentActivity,
          viralInfluencerLevel: senderData.influencerTier,
        },
        'conversion',
      );

      // Generate viral-specific subject lines
      const subjectLines = await AIContentGenerator.generateEmailSubjectLines({
        campaignType: 'viral_invitation',
        recipientType: recipientData.userType,
        recipientRole: recipientData.supplierType,
        goal: 'viral_growth',
        relationship: invitationType,
        season: this.getCurrentSeason(),
        businessType: recipientData.businessType,
      });

      // Calculate expected conversion rate based on sender's viral performance
      const expectedConversionRate = this.calculateInvitationConversionRate(
        senderData,
        recipientData,
        invitationType,
      );

      return {
        subject: subjectLines.variants[0].text,
        content: aiContent.optimizedPlainText,
        personalizedElements: [
          `Sender network size: ${senderData.networkConnections}`,
          `Invitation type: ${invitationType}`,
          `AI-optimized content`,
          ...aiContent.keyChanges,
        ],
        expectedConversionRate,
      };
    } catch (error) {
      console.error('Viral invitation personalization failed:', error);
      return this.getDefaultInvitationContent(invitationType);
    }
  }

  /**
   * Track and optimize viral campaign performance
   */
  static async optimizeViralCampaignPerformance(campaignId: string): Promise<{
    currentPerformance: any;
    optimizationRecommendations: string[];
    projectedImprovement: number;
  }> {
    try {
      // Get current campaign performance
      const performance = await this.getViralCampaignPerformance(campaignId);

      // Analyze viral-specific metrics
      const viralMetrics = await this.analyzeViralMetrics(performance);

      // Generate AI-powered optimization recommendations
      const recommendations =
        await this.generateViralOptimizationRecommendations(
          performance,
          viralMetrics,
        );

      return {
        currentPerformance: performance,
        optimizationRecommendations: recommendations,
        projectedImprovement: this.calculateProjectedImprovement(
          performance,
          recommendations,
        ),
      };
    } catch (error) {
      console.error('Viral campaign optimization failed:', error);
      return {
        currentPerformance: {},
        optimizationRecommendations: ['Insufficient data for optimization'],
        projectedImprovement: 0,
      };
    }
  }

  // === PRIVATE HELPER METHODS ===

  private static async getViralDataFromTeamB(
    userId: string,
  ): Promise<ViralInfluencerData> {
    try {
      // Integration with Team B's viral optimization system
      const response = await fetch(`/api/viral/attribution/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch viral data');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get viral data from Team B:', error);
      return this.getDefaultViralData(userId);
    }
  }

  private static async getBaseCampaignConfig(userId: string): Promise<any> {
    // Get base campaign configuration
    return {
      userId,
      campaignType: 'standard_nurture',
      frequency: 'weekly',
      contentPersonalization: 'basic',
      sendTimeOptimization: true,
    };
  }

  private static getDefaultCampaignConfig(
    userId: string,
  ): EnhancedCampaignConfig {
    return {
      baseConfig: { userId },
      viralEnhancements: {
        isViralInfluencer: false,
        viralCoefficient: 0,
        networkValue: 0,
        recentViralActivity: false,
        influencerTier: 'starter',
        networkSize: 0,
      },
      campaignType: 'standard',
      rewardMultiplier: 1.0,
      priorityDelivery: false,
      exclusiveContent: false,
      networkGrowthIncentives: [],
    };
  }

  private static async generatePersonalizedGreeting(
    viralData: ViralInfluencerData,
  ): Promise<string> {
    const achievements = [];

    if (viralData.networkConnections > 50) {
      achievements.push(
        `amazing network of ${viralData.networkConnections} professionals`,
      );
    }

    if (viralData.totalAttributedRevenue > 10000) {
      achievements.push(
        `$${viralData.totalAttributedRevenue.toLocaleString()} in attributed revenue`,
      );
    }

    return achievements.length > 0
      ? `Congratulations on your ${achievements.join(' and ')}! `
      : 'Welcome to our super-connector program! ';
  }

  private static async generateCustomGrowthTips(
    viralData: ViralInfluencerData,
  ): Promise<string[]> {
    const tips = [];

    if (viralData.conversionRate < 0.15) {
      tips.push(
        'Focus on quality over quantity - target suppliers who complement your business',
      );
    }

    if (viralData.weeklyNetworkGrowth < 2) {
      tips.push(
        'Try sending 2-3 personalized invitations weekly for optimal growth',
      );
    }

    if (viralData.averageInviteValue < 500) {
      tips.push('Target higher-value suppliers to increase your network value');
    }

    return tips.length > 0
      ? tips
      : ['Keep building your network with quality connections!'];
  }

  private static async getViralRewardFeatures(
    userId: string,
  ): Promise<string[]> {
    const features = [
      'Advanced network analytics dashboard',
      'Personalized invitation templates',
      'Priority customer support',
      'Network growth coaching sessions',
    ];

    // Add tier-specific features based on user's viral performance
    const viralData = await this.getViralDataFromTeamB(userId);

    if (viralData.influencerTier === 'viral_champion') {
      features.push(
        'Revenue sharing program access',
        'Co-marketing opportunities',
        'Advisory board invitation',
      );
    }

    return features;
  }

  private static async scheduleCampaignWithViralContext(
    userId: string,
    sequence: any,
  ): Promise<void> {
    // Schedule campaign with viral context
    console.log(`Scheduling viral campaign for user ${userId}:`, sequence);

    // Implementation would integrate with the marketing automation service
    // to schedule the campaign with viral-specific personalization
  }

  private static async triggerNewReferralCelebration(
    userId: string,
    viralData: ViralInfluencerData,
  ): Promise<void> {
    const celebrationEmail = {
      template: 'new_referral_celebration',
      personalization: {
        newNetworkSize: viralData.networkConnections,
        rewardEarned: viralData.averageInviteValue,
        nextMilestone: this.calculateNextMilestone(
          viralData.networkConnections,
        ),
      },
    };

    await this.sendViralCampaign(userId, celebrationEmail);
  }

  private static async triggerMilestoneCelebration(
    userId: string,
    viralData: ViralInfluencerData,
  ): Promise<void> {
    const milestone = this.identifyReachedMilestone(viralData);

    const celebrationEmail = {
      template: 'milestone_celebration',
      personalization: {
        milestone: milestone.name,
        achievement: milestone.description,
        reward: milestone.reward,
        nextGoal: milestone.nextGoal,
      },
    };

    await this.sendViralCampaign(userId, celebrationEmail);
  }

  private static async triggerNetworkGrowthCampaign(
    userId: string,
    viralData: ViralInfluencerData,
  ): Promise<void> {
    const growthEmail = {
      template: 'network_growth_tips',
      personalization: {
        currentGrowthRate: viralData.weeklyNetworkGrowth,
        growthTips: await this.generateCustomGrowthTips(viralData),
        targetGrowth: viralData.weeklyNetworkGrowth + 2,
      },
    };

    await this.sendViralCampaign(userId, growthEmail);
  }

  private static async triggerRevenueThresholdCampaign(
    userId: string,
    viralData: ViralInfluencerData,
  ): Promise<void> {
    const revenueEmail = {
      template: 'revenue_milestone',
      personalization: {
        totalRevenue: viralData.totalAttributedRevenue,
        monthlyRevenue: viralData.totalAttributedRevenue / 12,
        revenueGrowth: this.calculateRevenueGrowth(viralData),
        bonusEarned: viralData.totalAttributedRevenue * 0.05,
      },
    };

    await this.sendViralCampaign(userId, revenueEmail);
  }

  private static getBaseInvitationTemplate(invitationType: string): string {
    const templates = {
      peer: 'Hi there! I wanted to share WedSync with you - it has been amazing for growing my wedding business network.',
      cross_supplier:
        'As a fellow wedding professional, I think you would love WedSync for connecting with quality suppliers.',
      couple_referral:
        'I wanted to recommend WedSync to help you connect with the best wedding vendors in your area.',
    };

    return (
      templates[invitationType as keyof typeof templates] || templates.peer
    );
  }

  private static getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private static calculateInvitationConversionRate(
    senderData: ViralInfluencerData,
    recipientData: any,
    invitationType: string,
  ): number {
    let baseRate = 0.12; // 12% base conversion rate

    // Adjust based on sender's viral performance
    if (senderData.influencerTier === 'viral_champion') baseRate *= 1.5;
    if (senderData.influencerTier === 'super_connector') baseRate *= 1.3;
    if (senderData.influencerTier === 'growing') baseRate *= 1.1;

    // Adjust based on invitation type
    if (invitationType === 'peer') baseRate *= 1.2; // Same industry
    if (invitationType === 'cross_supplier') baseRate *= 0.9; // Different industry

    // Network size effect (larger networks = higher trust)
    if (senderData.networkConnections > 100) baseRate *= 1.2;
    if (senderData.networkConnections > 50) baseRate *= 1.1;

    return Math.min(baseRate, 0.8); // Cap at 80%
  }

  private static getDefaultInvitationContent(invitationType: string): {
    subject: string;
    content: string;
    personalizedElements: string[];
    expectedConversionRate: number;
  } {
    return {
      subject: 'Join our wedding professional network',
      content: this.getBaseInvitationTemplate(invitationType),
      personalizedElements: ['Basic template'],
      expectedConversionRate: 0.12,
    };
  }

  private static getDefaultViralData(userId: string): ViralInfluencerData {
    return {
      userId,
      influencerTier: 'starter',
      networkConnections: 0,
      totalAttributedRevenue: 0,
      viralChain: [],
      recentActivity: [],
      networkValue: 0,
      viralCoefficient: 0,
      topConvertingInvites: [],
      growthRecommendations: [
        'Start building your network with quality connections',
      ],
      weeklyNetworkGrowth: 0,
      monthlyNetworkGrowth: 0,
      conversionRate: 0.1,
      averageInviteValue: 0,
      lastViralActivity: new Date(),
    };
  }

  private static async sendViralCampaign(
    userId: string,
    campaignData: any,
  ): Promise<void> {
    console.log(`Sending viral campaign to ${userId}:`, campaignData);
    // Implementation would send the actual campaign
  }

  private static calculateNextMilestone(currentConnections: number): string {
    if (currentConnections < 10) return '10 connections';
    if (currentConnections < 25) return '25 connections';
    if (currentConnections < 50) return '50 connections';
    if (currentConnections < 100) return '100 connections';
    return '250 connections';
  }

  private static identifyReachedMilestone(viralData: ViralInfluencerData): any {
    return {
      name: 'Network Growth',
      description: `Reached ${viralData.networkConnections} connections!`,
      reward: 'Premium features unlocked',
      nextGoal: this.calculateNextMilestone(viralData.networkConnections),
    };
  }

  private static calculateRevenueGrowth(
    viralData: ViralInfluencerData,
  ): number {
    // Simplified growth calculation
    return viralData.monthlyNetworkGrowth * viralData.averageInviteValue;
  }

  private static async getViralCampaignPerformance(
    campaignId: string,
  ): Promise<any> {
    // Get campaign performance metrics
    return {
      campaignId,
      openRate: 0.35,
      clickRate: 0.08,
      conversionRate: 0.15,
      viralSpread: 2.3,
      revenueAttributed: 5000,
    };
  }

  private static async analyzeViralMetrics(performance: any): Promise<any> {
    return {
      viralCoefficient: performance.viralSpread,
      networkGrowthRate: 0.12,
      revenuePerInvite: performance.revenueAttributed / 100,
    };
  }

  private static async generateViralOptimizationRecommendations(
    performance: any,
    viralMetrics: any,
  ): Promise<string[]> {
    const recommendations = [];

    if (performance.openRate < 0.3) {
      recommendations.push(
        'Improve subject line personalization for viral invitations',
      );
    }

    if (viralMetrics.viralCoefficient < 2.0) {
      recommendations.push(
        'Add more compelling viral incentives to increase sharing',
      );
    }

    if (performance.conversionRate < 0.12) {
      recommendations.push('Optimize invitation content for target audience');
    }

    return recommendations;
  }

  private static calculateProjectedImprovement(
    performance: any,
    recommendations: string[],
  ): number {
    // Simple improvement calculation based on number of recommendations
    return recommendations.length * 0.15; // 15% improvement per recommendation
  }

  private static async calculateNetworkAchievements(
    viralData: ViralInfluencerData,
  ): Promise<string[]> {
    const achievements = [];

    if (viralData.networkConnections >= 100) {
      achievements.push('Century Club - 100+ network connections');
    }

    if (viralData.totalAttributedRevenue >= 10000) {
      achievements.push('Revenue Star - $10K+ attributed revenue');
    }

    if (viralData.viralCoefficient >= 3.0) {
      achievements.push('Viral Champion - 3.0+ viral coefficient');
    }

    return achievements;
  }

  private static async getNextMilestones(
    viralData: ViralInfluencerData,
  ): Promise<string[]> {
    const milestones = [];

    if (viralData.networkConnections < 250) {
      milestones.push(
        `${250 - viralData.networkConnections} more connections to Elite status`,
      );
    }

    if (viralData.totalAttributedRevenue < 50000) {
      milestones.push(
        `$${50000 - viralData.totalAttributedRevenue} more revenue to Gold tier`,
      );
    }

    return milestones;
  }

  private static async getExclusiveRewards(
    userId: string,
  ): Promise<SuperConnectorReward[]> {
    return [
      {
        userId,
        rewardType: 'premium_features',
        rewardValue: 100,
        unlockCriteria: { networkSize: 50 },
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    ];
  }
}

export default ViralMarketingIntegration;
