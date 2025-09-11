import { createClient } from '@/lib/database/supabase-admin';

export interface EnhancedViralCoefficient {
  // Core Metrics
  coefficient: number; // K-factor (target > 1.0)
  adjustedCoefficient: number; // Seasonally adjusted
  sustainableCoefficient: number; // Excluding one-time events

  // Invitation Metrics
  invitationRate: number;
  acceptanceRate: number;
  activationRate: number;
  avgInvitesPerUser: number;
  qualityScore: number;

  // Time Metrics
  timeToInvite: number; // Days from signup
  viralCycleTime: number; // Full loop completion
  velocityTrend: 'accelerating' | 'stable' | 'decelerating';

  // Loop Analysis
  loops: ViralLoop[];
  dominantLoop: string;
  loopEfficiency: number;

  // Wedding Context
  weddingSeasonMultiplier: number;
  vendorTypeBreakdown: VendorViralMetrics[];
  geographicSpread: GeoViralData[];
}

export interface ViralLoop {
  type:
    | 'supplier_to_couple'
    | 'couple_to_supplier'
    | 'supplier_to_supplier'
    | 'couple_to_couple';
  count: number;
  conversionRate: number;
  avgCycleTime: number;
  revenue: number; // Revenue generated from this loop
  quality: number; // Retention rate of users from this loop
  amplification: number; // Secondary invites from this loop
}

export interface VendorViralMetrics {
  vendorType: string;
  coefficient: number;
  invitationRate: number;
  conversionRate: number;
  revenueAttribution: number;
  networkEffect: number;
}

export interface GeoViralData {
  region: string;
  viralStrength: number;
  clusterSize: number;
  networkDensity: number;
}

export interface ViralBottleneck {
  stage: 'invitation' | 'acceptance' | 'activation' | 'amplification';
  impact: number; // 0-1 scale
  description: string;
  recommendation: string;
  estimatedImprovementPotential: number;
}

export interface OptimizationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  expectedImpact: number;
  implementationEffort: 'low' | 'medium' | 'high';
  roi: number;
}

export class AdvancedViralCalculator {
  private readonly supabase = createClient();

  private readonly WEDDING_SEASONS = {
    peak: [5, 6, 7, 8, 9], // May-September
    shoulder: [4, 10], // April, October
    off: [1, 2, 3, 11, 12], // Winter months
  };

  async calculateEnhanced(period: {
    start: Date;
    end: Date;
  }): Promise<EnhancedViralCoefficient> {
    const cohortUsers = await this.getCohortUsers(period);

    // Calculate base viral coefficient
    const baseCoefficient = await this.calculateBaseCoefficient(cohortUsers);

    // Apply wedding industry adjustments
    const seasonalAdjustment = this.getSeasonalAdjustment(period);
    const qualityAdjustment =
      await this.calculateQualityAdjustment(cohortUsers);

    // Calculate sustainable coefficient (removing one-time spikes)
    const sustainableCoefficient = await this.calculateSustainableCoefficient(
      cohortUsers,
      baseCoefficient,
    );

    // Analyze viral loops with revenue attribution
    const loops = await this.analyzeEnhancedLoops(cohortUsers);

    return {
      coefficient: baseCoefficient,
      adjustedCoefficient: baseCoefficient * seasonalAdjustment,
      sustainableCoefficient,
      invitationRate: await this.getInvitationRate(cohortUsers),
      acceptanceRate: await this.getAcceptanceRate(cohortUsers),
      activationRate: await this.getActivationRate(cohortUsers),
      avgInvitesPerUser: await this.getAvgInvites(cohortUsers),
      qualityScore: qualityAdjustment,
      timeToInvite: await this.avgTimeToFirstInvite(cohortUsers),
      viralCycleTime: await this.avgCycleTime(loops),
      velocityTrend: await this.getVelocityTrend(),
      loops,
      dominantLoop: this.identifyDominantLoop(loops),
      loopEfficiency: this.calculateLoopEfficiency(loops),
      weddingSeasonMultiplier: seasonalAdjustment,
      vendorTypeBreakdown: await this.analyzeVendorViralMetrics(cohortUsers),
      geographicSpread: await this.analyzeGeographicVirality(cohortUsers),
    };
  }

  private async getCohortUsers(period: {
    start: Date;
    end: Date;
  }): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    if (error) throw new Error(`Failed to get cohort users: ${error.message}`);
    return data?.map((user) => user.id) || [];
  }

  private async calculateBaseCoefficient(users: string[]): Promise<number> {
    if (users.length === 0) return 0;

    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select(
        `
        inviter_id,
        status,
        invitee_id
      `,
      )
      .in('inviter_id', users);

    if (error)
      throw new Error(`Failed to calculate base coefficient: ${error.message}`);

    const totalInvites = data?.length || 0;
    const successfulInvites =
      data?.filter((inv) => inv.invitee_id !== null).length || 0;

    return totalInvites > 0 ? successfulInvites / users.length : 0;
  }

  private getSeasonalAdjustment(period: { start: Date; end: Date }): number {
    const month = period.start.getMonth() + 1;

    if (this.WEDDING_SEASONS.peak.includes(month)) {
      return 1.4; // Peak wedding season boost
    } else if (this.WEDDING_SEASONS.shoulder.includes(month)) {
      return 1.1; // Shoulder season slight boost
    } else {
      return 0.7; // Off-season reduction
    }
  }

  private async calculateQualityAdjustment(users: string[]): Promise<number> {
    if (users.length === 0) return 0;

    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select('quality_score')
      .in('inviter_id', users)
      .not('quality_score', 'is', null);

    if (error || !data?.length) return 0.5; // Default neutral quality

    const avgQuality =
      data.reduce((sum, inv) => sum + (inv.quality_score || 0), 0) /
      data.length;
    return Math.max(0, Math.min(1, avgQuality));
  }

  private async calculateSustainableCoefficient(
    users: string[],
    baseCoefficient: number,
  ): Promise<number> {
    if (users.length === 0) return 0;

    // Get invitation statistics per user
    const { data: stats, error } = await this.supabase.rpc(
      'get_user_invitation_stats',
      { user_ids: users },
    );

    if (error || !stats?.length) return baseCoefficient * 0.7; // Conservative fallback

    // Calculate Q3 threshold to identify outliers
    const invitesSent = stats
      .map((stat: any) => stat.invites_sent)
      .sort((a: number, b: number) => a - b);
    const q3Index = Math.floor(invitesSent.length * 0.75);
    const q3Value = invitesSent[q3Index] || 0;
    const outlierThreshold = q3Value * 1.5;

    // Filter out users with abnormally high invitation rates (likely bulk imports)
    const sustainableUsers = stats.filter(
      (stat: any) => stat.invites_sent <= outlierThreshold,
    );
    const sustainableRate = sustainableUsers.length / users.length;

    return baseCoefficient * sustainableRate * 0.85; // Conservative estimate
  }

  private async analyzeEnhancedLoops(users: string[]): Promise<ViralLoop[]> {
    if (users.length === 0) return [];

    // Track complex multi-hop referral chains
    const { data: loops, error } = await this.supabase.rpc(
      'analyze_viral_loops',
      {
        user_ids: users,
        depth_limit: 5,
      },
    );

    if (error || !loops?.length) {
      // Fallback to basic loop analysis
      return await this.calculateBasicLoops(users);
    }

    return loops.map((loop: any) => ({
      type: loop.loop_type,
      count: loop.loop_count || 0,
      conversionRate:
        users.length > 0 ? (loop.unique_converts || 0) / users.length : 0,
      avgCycleTime: loop.avg_cycle_days || 0,
      revenue: loop.loop_revenue || 0,
      quality: loop.retention_rate || 0,
      amplification: loop.avg_depth || 1,
    }));
  }

  private async calculateBasicLoops(users: string[]): Promise<ViralLoop[]> {
    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select(
        `
        inviter_type,
        invitee_type,
        status,
        attribution_value,
        quality_score,
        sent_at,
        signed_up_at
      `,
      )
      .in('inviter_id', users)
      .not('invitee_id', 'is', null);

    if (error || !data?.length) return [];

    const loopTypes: Record<string, any[]> = {
      supplier_to_couple: [],
      couple_to_supplier: [],
      supplier_to_supplier: [],
      couple_to_couple: [],
    };

    data.forEach((inv) => {
      const loopType = `${inv.inviter_type}_to_${inv.invitee_type}`;
      if (loopTypes[loopType]) {
        loopTypes[loopType].push(inv);
      }
    });

    return Object.entries(loopTypes)
      .map(([type, invites]) => {
        const successful = invites.filter((inv) => inv.status === 'activated');
        const cycleTime = this.calculateAverageCycleTime(invites);

        return {
          type: type as ViralLoop['type'],
          count: invites.length,
          conversionRate:
            invites.length > 0 ? successful.length / invites.length : 0,
          avgCycleTime: cycleTime,
          revenue: invites.reduce(
            (sum, inv) => sum + (inv.attribution_value || 0),
            0,
          ),
          quality:
            invites.length > 0
              ? invites.reduce(
                  (sum, inv) => sum + (inv.quality_score || 0.5),
                  0,
                ) / invites.length
              : 0.5,
          amplification: 1.2, // Basic amplification factor
        };
      })
      .filter((loop) => loop.count > 0);
  }

  private calculateAverageCycleTime(invites: any[]): number {
    const completedInvites = invites.filter(
      (inv) => inv.sent_at && inv.signed_up_at,
    );
    if (completedInvites.length === 0) return 7; // Default 1 week cycle time

    const totalCycleTime = completedInvites.reduce((sum, inv) => {
      const sent = new Date(inv.sent_at);
      const signedUp = new Date(inv.signed_up_at);
      return (
        sum + (signedUp.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24)
      ); // Days
    }, 0);

    return totalCycleTime / completedInvites.length;
  }

  private async getInvitationRate(users: string[]): Promise<number> {
    if (users.length === 0) return 0;

    const { count, error } = await this.supabase
      .from('invitation_tracking')
      .select('*', { count: 'exact', head: true })
      .in('inviter_id', users);

    if (error) return 0;
    return (count || 0) / users.length;
  }

  private async getAcceptanceRate(users: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select('status')
      .in('inviter_id', users);

    if (error || !data?.length) return 0;

    const accepted = data.filter((inv) =>
      ['signed_up', 'activated'].includes(inv.status),
    ).length;
    return accepted / data.length;
  }

  private async getActivationRate(users: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select('status')
      .in('inviter_id', users);

    if (error || !data?.length) return 0;

    const activated = data.filter((inv) => inv.status === 'activated').length;
    return activated / data.length;
  }

  private async getAvgInvites(users: string[]): Promise<number> {
    if (users.length === 0) return 0;

    const { count, error } = await this.supabase
      .from('invitation_tracking')
      .select('*', { count: 'exact', head: true })
      .in('inviter_id', users);

    if (error) return 0;
    return (count || 0) / users.length;
  }

  private async avgTimeToFirstInvite(users: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(
        `
        id,
        created_at,
        invitation_tracking!inner(sent_at)
      `,
      )
      .in('id', users)
      .order('sent_at', { foreignTable: 'invitation_tracking' })
      .limit(1, { foreignTable: 'invitation_tracking' });

    if (error || !data?.length) return 7; // Default 1 week

    const totalDays = data.reduce((sum, user) => {
      const created = new Date(user.created_at);
      const firstInvite = new Date(
        (user.invitation_tracking as any)[0]?.sent_at,
      );
      if (!isNaN(firstInvite.getTime())) {
        return (
          sum +
          (firstInvite.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
      return sum;
    }, 0);

    return totalDays / data.length;
  }

  private async avgCycleTime(loops: ViralLoop[]): Promise<number> {
    if (loops.length === 0) return 0;
    return (
      loops.reduce((sum, loop) => sum + loop.avgCycleTime, 0) / loops.length
    );
  }

  private async getVelocityTrend(): Promise<
    'accelerating' | 'stable' | 'decelerating'
  > {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentCoeff = await this.calculateEnhanced({
      start: thirtyDaysAgo,
      end: now,
    });

    const olderCoeff = await this.calculateEnhanced({
      start: sixtyDaysAgo,
      end: thirtyDaysAgo,
    });

    const diff = recentCoeff.coefficient - olderCoeff.coefficient;

    if (diff > 0.05) return 'accelerating';
    if (diff < -0.05) return 'decelerating';
    return 'stable';
  }

  private identifyDominantLoop(loops: ViralLoop[]): string {
    if (loops.length === 0) return 'none';

    const dominant = loops.reduce((max, loop) =>
      loop.count * loop.conversionRate > max.count * max.conversionRate
        ? loop
        : max,
    );

    return dominant.type;
  }

  private calculateLoopEfficiency(loops: ViralLoop[]): number {
    if (loops.length === 0) return 0;

    const totalEfficiency = loops.reduce(
      (sum, loop) =>
        sum + loop.conversionRate * loop.quality * loop.amplification,
      0,
    );

    return totalEfficiency / loops.length;
  }

  private async analyzeVendorViralMetrics(
    users: string[],
  ): Promise<VendorViralMetrics[]> {
    const { data, error } = await this.supabase.rpc(
      'analyze_vendor_viral_breakdown',
      { user_ids: users },
    );

    if (error || !data?.length) return [];

    return data.map((vendor: any) => ({
      vendorType: vendor.vendor_type,
      coefficient: vendor.viral_coefficient || 0,
      invitationRate: vendor.invitation_rate || 0,
      conversionRate: vendor.conversion_rate || 0,
      revenueAttribution: vendor.revenue_attribution || 0,
      networkEffect: vendor.network_effect || 1,
    }));
  }

  private async analyzeGeographicVirality(
    users: string[],
  ): Promise<GeoViralData[]> {
    const { data, error } = await this.supabase.rpc(
      'analyze_geographic_viral_spread',
      { user_ids: users },
    );

    if (error || !data?.length) return [];

    return data.map((geo: any) => ({
      region: geo.region,
      viralStrength: geo.viral_strength || 0,
      clusterSize: geo.cluster_size || 0,
      networkDensity: geo.network_density || 0,
    }));
  }

  async identifyViralBottlenecks(users: string[]): Promise<ViralBottleneck[]> {
    const metrics = await this.calculateEnhanced({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    const bottlenecks: ViralBottleneck[] = [];

    // Check invitation bottleneck
    if (metrics.invitationRate < 0.8) {
      bottlenecks.push({
        stage: 'invitation',
        impact: 1 - metrics.invitationRate,
        description: `Low invitation rate: ${(metrics.invitationRate * 100).toFixed(1)}%`,
        recommendation: 'Improve onboarding flow to encourage invitations',
        estimatedImprovementPotential: 0.3,
      });
    }

    // Check acceptance bottleneck
    if (metrics.acceptanceRate < 0.4) {
      bottlenecks.push({
        stage: 'acceptance',
        impact: 0.4 - metrics.acceptanceRate,
        description: `Low acceptance rate: ${(metrics.acceptanceRate * 100).toFixed(1)}%`,
        recommendation: 'Improve invitation messaging and value proposition',
        estimatedImprovementPotential: 0.25,
      });
    }

    // Check activation bottleneck
    if (metrics.activationRate < 0.3) {
      bottlenecks.push({
        stage: 'activation',
        impact: 0.3 - metrics.activationRate,
        description: `Low activation rate: ${(metrics.activationRate * 100).toFixed(1)}%`,
        recommendation: 'Streamline onboarding and provide immediate value',
        estimatedImprovementPotential: 0.4,
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  async generateOptimizationRecommendations(
    metrics: EnhancedViralCoefficient,
    bottlenecks: ViralBottleneck[],
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Seasonal optimization
    if (metrics.weddingSeasonMultiplier < 1) {
      recommendations.push({
        priority: 'high',
        category: 'seasonal',
        action:
          'Launch off-season engagement campaigns to boost winter viral activity',
        expectedImpact: 0.3,
        implementationEffort: 'medium',
        roi: 2.5,
      });
    }

    // Loop optimization
    const dominantLoop = metrics.loops.find(
      (loop) => loop.type === metrics.dominantLoop,
    );
    if (dominantLoop && dominantLoop.conversionRate < 0.5) {
      recommendations.push({
        priority: 'high',
        category: 'loop_optimization',
        action: `Optimize ${dominantLoop.type} loop with better targeting and messaging`,
        expectedImpact: 0.4,
        implementationEffort: 'high',
        roi: 3.2,
      });
    }

    // Quality improvement
    if (metrics.qualityScore < 0.6) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        action:
          'Implement invite quality scoring to focus on high-value connections',
        expectedImpact: 0.2,
        implementationEffort: 'medium',
        roi: 1.8,
      });
    }

    return recommendations.sort((a, b) => b.roi - a.roi);
  }
}
