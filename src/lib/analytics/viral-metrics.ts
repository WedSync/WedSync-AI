import { supabase } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export interface ViralMetrics {
  viralCoefficient: number;
  conversionRate: number;
  invitesPerUser: number;
  period: string;
  totalUsers: number;
  totalInvites: number;
  totalConversions: number;
  timeframe: 'daily' | 'weekly' | 'monthly';
  aggregationDate: string;
}

export interface SharingMetrics {
  shareRate: number;
  sharesByChannel: Record<string, number>;
  averageSharesPerUser: number;
  viralLoopCompletions: number;
  shareConversionRate: number;
}

export interface ViralFunnelMetrics {
  invitationsSent: number;
  invitationsOpened: number;
  signupsStarted: number;
  signupsCompleted: number;
  activationRate: number;
  funnelStages: Array<{
    stage: string;
    count: number;
    conversionRate: number;
  }>;
}

export class ViralMetricsEngine {
  private static instance: ViralMetricsEngine;

  public static getInstance(): ViralMetricsEngine {
    if (!ViralMetricsEngine.instance) {
      ViralMetricsEngine.instance = new ViralMetricsEngine();
    }
    return ViralMetricsEngine.instance;
  }

  public async calculateViralCoefficient(
    userId: string,
    dateRange: { start: Date; end: Date },
    timeframe: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ): Promise<ViralMetrics> {
    // Verify user has permission to view analytics
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (
      userError ||
      !userProfile ||
      !['admin', 'analytics', 'supplier', 'couple'].includes(userProfile.role)
    ) {
      throw new Error('Unauthorized access to viral analytics');
    }

    // Get aggregated viral metrics data
    const { data: viralData, error: viralError } = await supabase.rpc(
      'get_viral_coefficient_data',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
        requesting_user_id: userId,
        aggregation_period: timeframe,
      },
    );

    if (viralError) {
      console.error('Error fetching viral coefficient data:', viralError);
      throw new Error('Failed to fetch viral coefficient data');
    }

    return this.processViralMetrics(viralData, timeframe, dateRange);
  }

  public async calculateSharingMetrics(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<SharingMetrics> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (
      !userProfile ||
      !['admin', 'analytics', 'supplier'].includes(userProfile.role)
    ) {
      throw new Error('Unauthorized access to sharing analytics');
    }

    // Get sharing data from template_shares and viral_invitations
    const { data: sharingData, error } = await supabase.rpc(
      'get_sharing_metrics_data',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
        requesting_user_id: userId,
      },
    );

    if (error) {
      console.error('Error fetching sharing metrics:', error);
      throw new Error('Failed to fetch sharing metrics');
    }

    return this.processSharingMetrics(sharingData);
  }

  public async getViralFunnelAnalysis(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ViralFunnelMetrics> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!userProfile || !['admin', 'analytics'].includes(userProfile.role)) {
      throw new Error('Unauthorized access to funnel analytics');
    }

    // Get funnel data from viral_funnel_events
    const { data: funnelData, error } = await supabase.rpc(
      'get_viral_funnel_data',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error fetching viral funnel data:', error);
      throw new Error('Failed to fetch viral funnel data');
    }

    return this.processFunnelMetrics(funnelData);
  }

  private processViralMetrics(
    data: any[],
    timeframe: 'daily' | 'weekly' | 'monthly',
    dateRange: { start: Date; end: Date },
  ): ViralMetrics {
    if (!data || data.length === 0) {
      return {
        viralCoefficient: 0,
        conversionRate: 0,
        invitesPerUser: 0,
        period: this.formatPeriod(dateRange),
        totalUsers: 0,
        totalInvites: 0,
        totalConversions: 0,
        timeframe,
        aggregationDate: new Date().toISOString(),
      };
    }

    const totalUsers = data.reduce(
      (sum, item) => sum + (item.new_users || 0),
      0,
    );
    const totalInvites = data.reduce(
      (sum, item) => sum + (item.invites_sent || 0),
      0,
    );
    const totalConversions = data.reduce(
      (sum, item) => sum + (item.conversions || 0),
      0,
    );

    // Viral coefficient calculation: K = (invites per user) × (conversion rate)
    const conversionRate =
      totalInvites > 0 ? totalConversions / totalInvites : 0;
    const invitesPerUser = totalUsers > 0 ? totalInvites / totalUsers : 0;
    const viralCoefficient = invitesPerUser * conversionRate;

    // Validate calculations
    if (
      !this.isValidNumber(viralCoefficient) ||
      !this.isValidNumber(conversionRate) ||
      !this.isValidNumber(invitesPerUser)
    ) {
      throw new Error('Invalid viral coefficient calculation detected');
    }

    return {
      viralCoefficient: Math.round(viralCoefficient * 1000) / 1000, // Round to 3 decimal places
      conversionRate: Math.round(conversionRate * 1000) / 1000,
      invitesPerUser: Math.round(invitesPerUser * 1000) / 1000,
      period: this.formatPeriod(dateRange),
      totalUsers,
      totalInvites,
      totalConversions,
      timeframe,
      aggregationDate: new Date().toISOString(),
    };
  }

  private processSharingMetrics(data: any[]): SharingMetrics {
    if (!data || data.length === 0) {
      return {
        shareRate: 0,
        sharesByChannel: {},
        averageSharesPerUser: 0,
        viralLoopCompletions: 0,
        shareConversionRate: 0,
      };
    }

    const totalShares = data.reduce(
      (sum, item) => sum + (item.share_count || 0),
      0,
    );
    const totalUsers = data.reduce(
      (sum, item) => sum + (item.unique_users || 0),
      0,
    );
    const totalConversions = data.reduce(
      (sum, item) => sum + (item.share_conversions || 0),
      0,
    );

    // Group shares by channel
    const sharesByChannel: Record<string, number> = {};
    data.forEach((item) => {
      if (item.channel && item.share_count) {
        sharesByChannel[item.channel] =
          (sharesByChannel[item.channel] || 0) + item.share_count;
      }
    });

    return {
      shareRate: totalUsers > 0 ? totalShares / totalUsers : 0,
      sharesByChannel,
      averageSharesPerUser: totalUsers > 0 ? totalShares / totalUsers : 0,
      viralLoopCompletions: totalConversions,
      shareConversionRate: totalShares > 0 ? totalConversions / totalShares : 0,
    };
  }

  private processFunnelMetrics(data: any[]): ViralFunnelMetrics {
    if (!data || data.length === 0) {
      return {
        invitationsSent: 0,
        invitationsOpened: 0,
        signupsStarted: 0,
        signupsCompleted: 0,
        activationRate: 0,
        funnelStages: [],
      };
    }

    const metrics = data.reduce(
      (acc, item) => {
        acc.invitationsSent += item.invitations_sent || 0;
        acc.invitationsOpened += item.invitations_opened || 0;
        acc.signupsStarted += item.signups_started || 0;
        acc.signupsCompleted += item.signups_completed || 0;
        return acc;
      },
      {
        invitationsSent: 0,
        invitationsOpened: 0,
        signupsStarted: 0,
        signupsCompleted: 0,
      },
    );

    const funnelStages = [
      {
        stage: 'invitations_sent',
        count: metrics.invitationsSent,
        conversionRate: 1.0,
      },
      {
        stage: 'invitations_opened',
        count: metrics.invitationsOpened,
        conversionRate:
          metrics.invitationsSent > 0
            ? metrics.invitationsOpened / metrics.invitationsSent
            : 0,
      },
      {
        stage: 'signups_started',
        count: metrics.signupsStarted,
        conversionRate:
          metrics.invitationsOpened > 0
            ? metrics.signupsStarted / metrics.invitationsOpened
            : 0,
      },
      {
        stage: 'signups_completed',
        count: metrics.signupsCompleted,
        conversionRate:
          metrics.signupsStarted > 0
            ? metrics.signupsCompleted / metrics.signupsStarted
            : 0,
      },
    ];

    return {
      ...metrics,
      activationRate:
        metrics.invitationsSent > 0
          ? metrics.signupsCompleted / metrics.invitationsSent
          : 0,
      funnelStages,
    };
  }

  private formatPeriod(dateRange: { start: Date; end: Date }): string {
    return `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`;
  }

  private isValidNumber(value: number): boolean {
    return Number.isFinite(value) && !Number.isNaN(value) && value >= 0;
  }

  public async validateCalculationAccuracy(
    userId: string,
    testScenario: {
      newUsers: number;
      invitesSent: number;
      conversions: number;
    },
  ): Promise<{
    accurate: boolean;
    calculated: number;
    expected: number;
    error?: string;
  }> {
    try {
      // Expected calculation: (invites / users) * (conversions / invites)
      const expectedCoefficient =
        testScenario.newUsers > 0 && testScenario.invitesSent > 0
          ? (testScenario.invitesSent / testScenario.newUsers) *
            (testScenario.conversions / testScenario.invitesSent)
          : 0;

      // Simulate calculation with test data
      const mockData = [
        {
          new_users: testScenario.newUsers,
          invites_sent: testScenario.invitesSent,
          conversions: testScenario.conversions,
        },
      ];

      const result = this.processViralMetrics(mockData, 'monthly', {
        start: new Date(),
        end: new Date(),
      });

      const calculatedCoefficient = result.viralCoefficient;
      const accurate =
        Math.abs(calculatedCoefficient - expectedCoefficient) < 0.001;

      return {
        accurate,
        calculated: calculatedCoefficient,
        expected: expectedCoefficient,
      };
    } catch (error) {
      return {
        accurate: false,
        calculated: 0,
        expected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
