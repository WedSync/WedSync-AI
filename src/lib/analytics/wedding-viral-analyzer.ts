import { createClient } from '@/lib/database/supabase-admin';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
} from './advanced-viral-calculator';

export interface CohortViralData {
  cohortMonth: string;
  totalCouples: number;
  totalVendors: number;
  viralMetrics: CohortViralMetrics;
  networkAnalysis: NetworkAnalysis;
  seasonalFactors: SeasonalFactors;
  crossCohortInfluence: CrossCohortInfluence;
}

export interface CohortViralMetrics {
  intraCohortReferrals: number;
  crossCohortReferrals: number;
  viralCoefficient: number;
  amplificationFactor: number;
  retentionRate: number;
  revenueMultiplier: number;
}

export interface NetworkAnalysis {
  avgVendorsPerCouple: number;
  avgCouplesPerVendor: number;
  vendorOverlapRate: number;
  networkDensity: number;
  clusteringCoefficient: number;
  centralityMetrics: VendorCentrality[];
}

export interface VendorCentrality {
  vendorId: string;
  vendorType: string;
  betweennessCentrality: number;
  closenessCentrality: number;
  degreeCentrality: number;
  influence: number;
}

export interface SeasonalFactors {
  weddingDensity: number; // Weddings per week in cohort
  competitionLevel: number; // Vendor competition intensity
  priceInflation: number; // Seasonal price multiplier
  demandStress: number; // Resource scarcity factor
  viralPotential: number; // Season-adjusted viral multiplier
}

export interface CrossCohortInfluence {
  influencingCohorts: CohortInfluenceMetric[];
  influencedCohorts: CohortInfluenceMetric[];
  temporalDecay: number; // How influence weakens over time
  crossSeasonalEffect: number; // Peak to off-season influence
}

export interface CohortInfluenceMetric {
  cohortMonth: string;
  influenceStrength: number;
  sharedVendors: number;
  referralVolume: number;
  qualityScore: number;
}

export interface VendorNetworkMetrics {
  networkMap: VendorConnection[];
  referralChains: VendorReferralChain[];
  hubVendors: VendorHub[];
  bridgeVendors: VendorBridge[];
  isolatedVendors: string[];
  networkHealth: NetworkHealthMetrics;
}

export interface VendorConnection {
  fromVendorId: string;
  toVendorId: string;
  connectionStrength: number;
  referralCount: number;
  successRate: number;
  revenueGenerated: number;
  mutualClients: number;
}

export interface VendorReferralChain {
  chainId: string;
  vendorPath: string[]; // Array of vendor IDs in order
  chainLength: number;
  totalRevenue: number;
  conversionRate: number;
  averageCycleTime: number;
  chainEfficiency: number;
}

export interface VendorHub {
  vendorId: string;
  vendorType: string;
  outgoingReferrals: number;
  incomingReferrals: number;
  networkReach: number;
  influenceRadius: number;
  qualityScore: number;
}

export interface VendorBridge {
  vendorId: string;
  bridgeScore: number; // How critical they are for network connectivity
  clustersConnected: number;
  networkFragmentationRisk: number;
}

export interface NetworkHealthMetrics {
  connectivity: number; // 0-1 how connected the network is
  resilience: number; // How well network survives vendor departures
  efficiency: number; // Average path length between vendors
  clustering: number; // How clustered vendors are by type/region
  diversity: number; // Vendor type diversity in network
}

export class WeddingViralAnalyzer {
  private readonly supabase = createClient();
  private readonly viralCalculator: AdvancedViralCalculator;

  constructor() {
    this.viralCalculator = new AdvancedViralCalculator();
  }

  async analyzeWeddingCohortVirality(
    weddingDate: Date,
  ): Promise<CohortViralData> {
    const cohortMonth = new Date(
      weddingDate.getFullYear(),
      weddingDate.getMonth(),
      1,
    );
    const cohortKey = `${cohortMonth.getFullYear()}-${(cohortMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    // Get cohort data
    const cohortUsers = await this.getCohortUsers(cohortMonth);
    const couples = cohortUsers.filter((u) => u.user_type === 'couple');
    const vendors = cohortUsers.filter((u) => u.user_type === 'supplier');

    // Calculate viral metrics for this cohort
    const viralMetrics = await this.calculateCohortViralMetrics(
      cohortUsers,
      cohortMonth,
    );

    // Analyze network structure
    const networkAnalysis = await this.analyzeNetworkStructure(
      couples,
      vendors,
    );

    // Calculate seasonal factors
    const seasonalFactors = await this.calculateSeasonalFactors(cohortMonth);

    // Analyze cross-cohort influence
    const crossCohortInfluence =
      await this.analyzeCrossCohortInfluence(cohortMonth);

    return {
      cohortMonth: cohortKey,
      totalCouples: couples.length,
      totalVendors: vendors.length,
      viralMetrics,
      networkAnalysis,
      seasonalFactors,
      crossCohortInfluence,
    };
  }

  private async getCohortUsers(cohortMonth: Date): Promise<any[]> {
    const endOfMonth = new Date(
      cohortMonth.getFullYear(),
      cohortMonth.getMonth() + 1,
      0,
    );

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(
        `
        id,
        user_type,
        created_at,
        supplier_profiles(vendor_type),
        couple_profiles(wedding_date)
      `,
      )
      .gte('created_at', cohortMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (error) throw new Error(`Failed to get cohort users: ${error.message}`);
    return data || [];
  }

  private async calculateCohortViralMetrics(
    users: any[],
    cohortMonth: Date,
  ): Promise<CohortViralMetrics> {
    const userIds = users.map((u) => u.id);

    // Get referrals within cohort (intra-cohort)
    const { data: intraCohortReferrals, error: intraError } =
      await this.supabase
        .from('invitation_tracking')
        .select('*')
        .in('inviter_id', userIds)
        .in('invitee_id', userIds);

    if (intraError)
      throw new Error(
        `Failed to get intra-cohort referrals: ${intraError.message}`,
      );

    // Get referrals to other cohorts (cross-cohort)
    const { data: crossCohortReferrals, error: crossError } =
      await this.supabase
        .from('invitation_tracking')
        .select('*')
        .in('inviter_id', userIds)
        .not('invitee_id', 'in', `(${userIds.join(',')})`);

    if (crossError)
      throw new Error(
        `Failed to get cross-cohort referrals: ${crossError.message}`,
      );

    const intraCount = intraCohortReferrals?.length || 0;
    const crossCount = crossCohortReferrals?.length || 0;
    const totalReferrals = intraCount + crossCount;

    // Calculate viral coefficient for this cohort
    const successfulReferrals =
      (intraCohortReferrals?.filter((r) => r.status === 'activated').length ||
        0) +
      (crossCohortReferrals?.filter((r) => r.status === 'activated').length ||
        0);

    const viralCoefficient =
      users.length > 0 ? successfulReferrals / users.length : 0;

    // Calculate amplification (secondary referrals)
    const amplificationFactor =
      await this.calculateAmplificationFactor(userIds);

    // Calculate retention rate
    const retentionRate = await this.calculateCohortRetention(userIds, 90); // 90-day retention

    // Calculate revenue multiplier
    const revenueMultiplier = await this.calculateRevenueMultiplier(userIds);

    return {
      intraCohortReferrals: intraCount,
      crossCohortReferrals: crossCount,
      viralCoefficient,
      amplificationFactor,
      retentionRate,
      revenueMultiplier,
    };
  }

  private async calculateAmplificationFactor(
    userIds: string[],
  ): Promise<number> {
    // Find users who were referred by the original cohort and then made referrals themselves
    const { data: secondaryReferrers, error } = await this.supabase
      .from('invitation_tracking as it1')
      .select(
        `
        it1.invitee_id,
        it2:invitation_tracking!inner(id)
      `,
      )
      .in('it1.inviter_id', userIds)
      .eq('it1.status', 'activated')
      .eq('it2.inviter_id', 'it1.invitee_id');

    if (error || !secondaryReferrers?.length) return 1.0; // No amplification

    return 1 + secondaryReferrers.length / userIds.length;
  }

  private async calculateCohortRetention(
    userIds: string[],
    days: number,
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: activeUsers, error } = await this.supabase
      .from('user_last_seen')
      .select('user_id')
      .in('user_id', userIds)
      .gte('last_seen_at', cutoffDate.toISOString());

    if (error) return 0.5; // Conservative fallback

    return userIds.length > 0 ? (activeUsers?.length || 0) / userIds.length : 0;
  }

  private async calculateRevenueMultiplier(userIds: string[]): Promise<number> {
    // Calculate average revenue per user for this cohort vs platform average
    const { data: cohortRevenue, error: cohortError } = await this.supabase
      .from('subscription_billing')
      .select('amount')
      .in('user_id', userIds);

    const { data: platformRevenue, error: platformError } = await this.supabase
      .from('subscription_billing')
      .select('amount')
      .limit(1000); // Sample for comparison

    if (
      cohortError ||
      platformError ||
      !cohortRevenue?.length ||
      !platformRevenue?.length
    ) {
      return 1.0; // Neutral multiplier
    }

    const cohortAvg =
      cohortRevenue.reduce((sum, r) => sum + (r.amount || 0), 0) /
      cohortRevenue.length;
    const platformAvg =
      platformRevenue.reduce((sum, r) => sum + (r.amount || 0), 0) /
      platformRevenue.length;

    return platformAvg > 0 ? cohortAvg / platformAvg : 1.0;
  }

  private async analyzeNetworkStructure(
    couples: any[],
    vendors: any[],
  ): Promise<NetworkAnalysis> {
    // Calculate basic network metrics
    const avgVendorsPerCouple =
      await this.calculateAvgVendorsPerCouple(couples);
    const avgCouplesPerVendor =
      await this.calculateAvgCouplesPerVendor(vendors);
    const vendorOverlapRate = await this.calculateVendorOverlapRate(couples);

    // Calculate advanced network metrics
    const networkDensity = await this.calculateNetworkDensity(vendors);
    const clusteringCoefficient =
      await this.calculateClusteringCoefficient(vendors);
    const centralityMetrics = await this.calculateVendorCentrality(vendors);

    return {
      avgVendorsPerCouple,
      avgCouplesPerVendor,
      vendorOverlapRate,
      networkDensity,
      clusteringCoefficient,
      centralityMetrics,
    };
  }

  private async calculateAvgVendorsPerCouple(couples: any[]): Promise<number> {
    if (couples.length === 0) return 0;

    const coupleIds = couples.map((c) => c.id);
    const { data, error } = await this.supabase
      .from('client_supplier_relationships')
      .select('client_id')
      .in('client_id', coupleIds);

    if (error || !data?.length) return 0;

    const vendorCounts = new Map<string, number>();
    data.forEach((rel) => {
      const current = vendorCounts.get(rel.client_id) || 0;
      vendorCounts.set(rel.client_id, current + 1);
    });

    const totalVendors = Array.from(vendorCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    return totalVendors / couples.length;
  }

  private async calculateAvgCouplesPerVendor(vendors: any[]): Promise<number> {
    if (vendors.length === 0) return 0;

    const vendorIds = vendors.map((v) => v.id);
    const { data, error } = await this.supabase
      .from('client_supplier_relationships')
      .select('supplier_id')
      .in('supplier_id', vendorIds);

    if (error || !data?.length) return 0;

    const coupleCounts = new Map<string, number>();
    data.forEach((rel) => {
      const current = coupleCounts.get(rel.supplier_id) || 0;
      coupleCounts.set(rel.supplier_id, current + 1);
    });

    const totalCouples = Array.from(coupleCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    return totalCouples / vendors.length;
  }

  private async calculateVendorOverlapRate(couples: any[]): Promise<number> {
    if (couples.length < 2) return 0;

    const coupleIds = couples.map((c) => c.id);
    const { data, error } = await this.supabase
      .from('client_supplier_relationships')
      .select('client_id, supplier_id')
      .in('client_id', coupleIds);

    if (error || !data?.length) return 0;

    // Group by supplier to find shared vendors
    const vendorClients = new Map<string, Set<string>>();
    data.forEach((rel) => {
      if (!vendorClients.has(rel.supplier_id)) {
        vendorClients.set(rel.supplier_id, new Set());
      }
      vendorClients.get(rel.supplier_id)!.add(rel.client_id);
    });

    // Count vendors with multiple couples
    const sharedVendors = Array.from(vendorClients.values()).filter(
      (clients) => clients.size > 1,
    );
    return sharedVendors.length / vendorClients.size;
  }

  private async calculateNetworkDensity(vendors: any[]): Promise<number> {
    if (vendors.length < 2) return 0;

    // Network density = actual connections / possible connections
    const vendorIds = vendors.map((v) => v.id);

    // Get referral connections between vendors
    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select('inviter_id, invitee_id')
      .in('inviter_id', vendorIds)
      .in('invitee_id', vendorIds)
      .eq('status', 'activated');

    if (error) return 0;

    const actualConnections = data?.length || 0;
    const possibleConnections = vendors.length * (vendors.length - 1); // Directed graph

    return possibleConnections > 0
      ? actualConnections / possibleConnections
      : 0;
  }

  private async calculateClusteringCoefficient(
    vendors: any[],
  ): Promise<number> {
    // Simplified clustering coefficient - measures how clustered the vendor network is
    if (vendors.length < 3) return 0;

    const vendorIds = vendors.map((v) => v.id);

    // Get all vendor referral relationships
    const { data, error } = await this.supabase
      .from('invitation_tracking')
      .select('inviter_id, invitee_id')
      .in('inviter_id', vendorIds)
      .in('invitee_id', vendorIds)
      .eq('status', 'activated');

    if (error || !data?.length) return 0;

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    vendorIds.forEach((id) => adjacency.set(id, new Set()));

    data.forEach((rel) => {
      adjacency.get(rel.inviter_id)?.add(rel.invitee_id);
      adjacency.get(rel.invitee_id)?.add(rel.inviter_id); // Treat as undirected for clustering
    });

    // Calculate clustering coefficient for each vendor
    let totalClustering = 0;
    let validVendors = 0;

    for (const [vendorId, neighbors] of adjacency) {
      if (neighbors.size < 2) continue; // Need at least 2 neighbors

      let triangles = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          if (adjacency.get(neighborArray[i])?.has(neighborArray[j])) {
            triangles++;
          }
        }
      }

      const possibleTriangles = (neighbors.size * (neighbors.size - 1)) / 2;
      const clustering =
        possibleTriangles > 0 ? triangles / possibleTriangles : 0;

      totalClustering += clustering;
      validVendors++;
    }

    return validVendors > 0 ? totalClustering / validVendors : 0;
  }

  private async calculateVendorCentrality(
    vendors: any[],
  ): Promise<VendorCentrality[]> {
    const vendorIds = vendors.map((v) => v.id);

    // Get referral network data
    const { data: referrals, error } = await this.supabase
      .from('invitation_tracking')
      .select('inviter_id, invitee_id, attribution_value')
      .in('inviter_id', vendorIds)
      .in('invitee_id', vendorIds)
      .eq('status', 'activated');

    if (error || !referrals?.length) {
      return vendors.map((v) => ({
        vendorId: v.id,
        vendorType: v.supplier_profiles?.[0]?.vendor_type || 'unknown',
        betweennessCentrality: 0,
        closenessCentrality: 0,
        degreeCentrality: 0,
        influence: 0,
      }));
    }

    // Calculate degree centrality (simple: number of connections)
    const connections = new Map<string, number>();
    referrals.forEach((ref) => {
      connections.set(
        ref.inviter_id,
        (connections.get(ref.inviter_id) || 0) + 1,
      );
      connections.set(
        ref.invitee_id,
        (connections.get(ref.invitee_id) || 0) + 1,
      );
    });

    const maxDegree = Math.max(...Array.from(connections.values()));

    return vendors
      .map((vendor) => {
        const degree = connections.get(vendor.id) || 0;
        const normalizedDegree = maxDegree > 0 ? degree / maxDegree : 0;

        // Calculate influence based on revenue attribution
        const vendorReferrals = referrals.filter(
          (r) => r.inviter_id === vendor.id,
        );
        const totalInfluence = vendorReferrals.reduce(
          (sum, r) => sum + (r.attribution_value || 0),
          0,
        );

        return {
          vendorId: vendor.id,
          vendorType: vendor.supplier_profiles?.[0]?.vendor_type || 'unknown',
          betweennessCentrality: normalizedDegree * 0.8, // Simplified approximation
          closenessCentrality: normalizedDegree * 0.9, // Simplified approximation
          degreeCentrality: normalizedDegree,
          influence: totalInfluence,
        };
      })
      .sort((a, b) => b.influence - a.influence);
  }

  private async calculateSeasonalFactors(
    cohortMonth: Date,
  ): Promise<SeasonalFactors> {
    const month = cohortMonth.getMonth() + 1;

    // Wedding density: peak season has higher density
    const weddingDensity = this.getWeddingDensityMultiplier(month);

    // Competition level: more vendors compete in peak season
    const competitionLevel = this.getCompetitionLevel(month);

    // Price inflation: peak season has higher prices
    const priceInflation = this.getPriceInflation(month);

    // Demand stress: resource scarcity in peak season
    const demandStress = this.getDemandStress(month);

    // Overall viral potential
    const viralPotential =
      weddingDensity * (2 - competitionLevel) * (2 - demandStress);

    return {
      weddingDensity,
      competitionLevel,
      priceInflation,
      demandStress,
      viralPotential,
    };
  }

  private getWeddingDensityMultiplier(month: number): number {
    const peakMonths = [5, 6, 7, 8, 9]; // May-September
    const shoulderMonths = [4, 10]; // April, October

    if (peakMonths.includes(month)) return 2.5;
    if (shoulderMonths.includes(month)) return 1.5;
    return 0.5; // Off-season
  }

  private getCompetitionLevel(month: number): number {
    const peakMonths = [5, 6, 7, 8, 9];
    const shoulderMonths = [4, 10];

    if (peakMonths.includes(month)) return 1.8; // High competition
    if (shoulderMonths.includes(month)) return 1.3; // Medium competition
    return 0.7; // Low competition
  }

  private getPriceInflation(month: number): number {
    const peakMonths = [5, 6, 7, 8, 9];
    const shoulderMonths = [4, 10];

    if (peakMonths.includes(month)) return 1.4; // 40% price increase
    if (shoulderMonths.includes(month)) return 1.1; // 10% price increase
    return 0.9; // 10% discount in off-season
  }

  private getDemandStress(month: number): number {
    const peakMonths = [5, 6, 7, 8, 9];
    const shoulderMonths = [4, 10];

    if (peakMonths.includes(month)) return 1.6; // High stress
    if (shoulderMonths.includes(month)) return 1.2; // Medium stress
    return 0.8; // Low stress
  }

  private async analyzeCrossCohortInfluence(
    cohortMonth: Date,
  ): Promise<CrossCohortInfluence> {
    const cohortStart = new Date(cohortMonth);
    const cohortEnd = new Date(
      cohortMonth.getFullYear(),
      cohortMonth.getMonth() + 1,
      0,
    );

    // Get users from this cohort
    const cohortUsers = await this.getCohortUsers(cohortMonth);
    const cohortUserIds = cohortUsers.map((u) => u.id);

    // Analyze influence from previous cohorts (who influenced this cohort)
    const influencingCohorts = await this.getInfluencingCohorts(
      cohortUserIds,
      cohortStart,
    );

    // Analyze influence to future cohorts (who this cohort influenced)
    const influencedCohorts = await this.getInfluencedCohorts(
      cohortUserIds,
      cohortEnd,
    );

    // Calculate temporal decay
    const temporalDecay = await this.calculateTemporalDecay(influencingCohorts);

    // Calculate cross-seasonal effects
    const crossSeasonalEffect = await this.calculateCrossSeasonalEffect(
      cohortMonth,
      influencingCohorts,
      influencedCohorts,
    );

    return {
      influencingCohorts,
      influencedCohorts,
      temporalDecay,
      crossSeasonalEffect,
    };
  }

  private async getInfluencingCohorts(
    cohortUserIds: string[],
    cohortStart: Date,
  ): Promise<CohortInfluenceMetric[]> {
    // Find who referred users in this cohort
    const { data: referrals, error } = await this.supabase
      .from('invitation_tracking')
      .select(
        `
        inviter_id,
        invitee_id,
        quality_score,
        attribution_value,
        user_profiles!inner(created_at, user_type)
      `,
      )
      .in('invitee_id', cohortUserIds)
      .eq('status', 'activated')
      .lt('user_profiles.created_at', cohortStart.toISOString());

    if (error || !referrals?.length) return [];

    // Group by inviter cohort month
    const cohortInfluence = new Map<string, CohortInfluenceMetric>();

    referrals.forEach((ref) => {
      const inviterDate = new Date(ref.user_profiles.created_at);
      const cohortKey = `${inviterDate.getFullYear()}-${(inviterDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!cohortInfluence.has(cohortKey)) {
        cohortInfluence.set(cohortKey, {
          cohortMonth: cohortKey,
          influenceStrength: 0,
          sharedVendors: 0,
          referralVolume: 0,
          qualityScore: 0,
        });
      }

      const metric = cohortInfluence.get(cohortKey)!;
      metric.referralVolume++;
      metric.influenceStrength += ref.attribution_value || 0;
      metric.qualityScore += ref.quality_score || 0.5;
    });

    // Normalize quality scores and return sorted by influence
    return Array.from(cohortInfluence.values())
      .map((metric) => ({
        ...metric,
        qualityScore: metric.qualityScore / metric.referralVolume,
      }))
      .sort((a, b) => b.influenceStrength - a.influenceStrength);
  }

  private async getInfluencedCohorts(
    cohortUserIds: string[],
    cohortEnd: Date,
  ): Promise<CohortInfluenceMetric[]> {
    // Find who this cohort referred
    const { data: referrals, error } = await this.supabase
      .from('invitation_tracking')
      .select(
        `
        inviter_id,
        invitee_id,
        quality_score,
        attribution_value,
        user_profiles!inner(created_at, user_type)
      `,
      )
      .in('inviter_id', cohortUserIds)
      .eq('status', 'activated')
      .gt('user_profiles.created_at', cohortEnd.toISOString());

    if (error || !referrals?.length) return [];

    // Group by invitee cohort month
    const cohortInfluence = new Map<string, CohortInfluenceMetric>();

    referrals.forEach((ref) => {
      const inviteeDate = new Date(ref.user_profiles.created_at);
      const cohortKey = `${inviteeDate.getFullYear()}-${(inviteeDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!cohortInfluence.has(cohortKey)) {
        cohortInfluence.set(cohortKey, {
          cohortMonth: cohortKey,
          influenceStrength: 0,
          sharedVendors: 0,
          referralVolume: 0,
          qualityScore: 0,
        });
      }

      const metric = cohortInfluence.get(cohortKey)!;
      metric.referralVolume++;
      metric.influenceStrength += ref.attribution_value || 0;
      metric.qualityScore += ref.quality_score || 0.5;
    });

    return Array.from(cohortInfluence.values())
      .map((metric) => ({
        ...metric,
        qualityScore: metric.qualityScore / metric.referralVolume,
      }))
      .sort((a, b) => b.influenceStrength - a.influenceStrength);
  }

  private async calculateTemporalDecay(
    influencingCohorts: CohortInfluenceMetric[],
  ): Promise<number> {
    if (influencingCohorts.length < 2) return 0.5; // Default decay

    // Calculate how influence strength decreases over time
    let totalDecay = 0;
    let comparisons = 0;

    for (let i = 0; i < influencingCohorts.length - 1; i++) {
      const newer = influencingCohorts[i];
      const older = influencingCohorts[i + 1];

      if (newer.influenceStrength > 0 && older.influenceStrength > 0) {
        const decay = 1 - older.influenceStrength / newer.influenceStrength;
        totalDecay += Math.max(0, Math.min(1, decay)); // Clamp between 0-1
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDecay / comparisons : 0.5;
  }

  private async calculateCrossSeasonalEffect(
    cohortMonth: Date,
    influencingCohorts: CohortInfluenceMetric[],
    influencedCohorts: CohortInfluenceMetric[],
  ): Promise<number> {
    const currentSeason = this.getSeason(cohortMonth.getMonth() + 1);

    let crossSeasonalInfluence = 0;
    let totalInfluence = 0;

    // Check influencing cohorts
    influencingCohorts.forEach((cohort) => {
      const [year, month] = cohort.cohortMonth.split('-').map(Number);
      const cohortSeason = this.getSeason(month);

      if (cohortSeason !== currentSeason) {
        crossSeasonalInfluence += cohort.influenceStrength;
      }
      totalInfluence += cohort.influenceStrength;
    });

    // Check influenced cohorts
    influencedCohorts.forEach((cohort) => {
      const [year, month] = cohort.cohortMonth.split('-').map(Number);
      const cohortSeason = this.getSeason(month);

      if (cohortSeason !== currentSeason) {
        crossSeasonalInfluence += cohort.influenceStrength;
      }
      totalInfluence += cohort.influenceStrength;
    });

    return totalInfluence > 0 ? crossSeasonalInfluence / totalInfluence : 0;
  }

  private getSeason(month: number): 'peak' | 'shoulder' | 'off' {
    if ([5, 6, 7, 8, 9].includes(month)) return 'peak';
    if ([4, 10].includes(month)) return 'shoulder';
    return 'off';
  }

  async trackVendorReferralNetwork(): Promise<VendorNetworkMetrics> {
    // Get all vendor referral relationships
    const { data: referrals, error: referralError } = await this.supabase
      .from('invitation_tracking')
      .select(
        `
        inviter_id,
        invitee_id,
        status,
        attribution_value,
        quality_score,
        sent_at,
        activated_at,
        user_profiles!inviter_id(user_type, supplier_profiles(vendor_type)),
        invitee_profiles:user_profiles!invitee_id(user_type, supplier_profiles(vendor_type))
      `,
      )
      .eq('user_profiles.user_type', 'supplier')
      .eq('invitee_profiles.user_type', 'supplier')
      .eq('status', 'activated');

    if (referralError || !referrals?.length) {
      return this.createEmptyNetworkMetrics();
    }

    // Build network connections
    const networkMap = await this.buildVendorConnections(referrals);

    // Analyze referral chains
    const referralChains = await this.analyzeVendorReferralChains(networkMap);

    // Identify key vendors
    const hubVendors = await this.identifyVendorHubs(networkMap, referrals);
    const bridgeVendors = await this.identifyVendorBridges(networkMap);
    const isolatedVendors = await this.identifyIsolatedVendors(referrals);

    // Calculate network health
    const networkHealth = await this.calculateNetworkHealth(
      networkMap,
      referrals,
    );

    return {
      networkMap,
      referralChains,
      hubVendors,
      bridgeVendors,
      isolatedVendors,
      networkHealth,
    };
  }

  private createEmptyNetworkMetrics(): VendorNetworkMetrics {
    return {
      networkMap: [],
      referralChains: [],
      hubVendors: [],
      bridgeVendors: [],
      isolatedVendors: [],
      networkHealth: {
        connectivity: 0,
        resilience: 0,
        efficiency: 0,
        clustering: 0,
        diversity: 0,
      },
    };
  }

  private async buildVendorConnections(
    referrals: any[],
  ): Promise<VendorConnection[]> {
    const connections = new Map<string, VendorConnection>();

    referrals.forEach((ref) => {
      const connectionKey = `${ref.inviter_id}-${ref.invitee_id}`;

      if (!connections.has(connectionKey)) {
        connections.set(connectionKey, {
          fromVendorId: ref.inviter_id,
          toVendorId: ref.invitee_id,
          connectionStrength: 0,
          referralCount: 0,
          successRate: 0,
          revenueGenerated: 0,
          mutualClients: 0,
        });
      }

      const connection = connections.get(connectionKey)!;
      connection.referralCount++;
      connection.revenueGenerated += ref.attribution_value || 0;
      connection.connectionStrength += ref.quality_score || 0.5;
    });

    // Calculate success rates and normalize connection strengths
    return Array.from(connections.values()).map((conn) => ({
      ...conn,
      successRate: 1.0, // Already filtered to successful referrals
      connectionStrength: conn.connectionStrength / conn.referralCount,
    }));
  }

  private async analyzeVendorReferralChains(
    networkMap: VendorConnection[],
  ): Promise<VendorReferralChain[]> {
    // Build adjacency list for path finding
    const adjacency = new Map<string, VendorConnection[]>();
    networkMap.forEach((conn) => {
      if (!adjacency.has(conn.fromVendorId)) {
        adjacency.set(conn.fromVendorId, []);
      }
      adjacency.get(conn.fromVendorId)!.push(conn);
    });

    const chains: VendorReferralChain[] = [];
    const visited = new Set<string>();

    // Find chains using DFS
    for (const [startVendor, connections] of adjacency) {
      if (visited.has(startVendor)) continue;

      const chain = await this.findReferralChain(
        startVendor,
        adjacency,
        new Set(),
        [],
      );
      if (chain.length > 1) {
        chains.push({
          chainId: `chain-${chains.length}`,
          vendorPath: chain,
          chainLength: chain.length,
          totalRevenue: await this.calculateChainRevenue(chain, networkMap),
          conversionRate: await this.calculateChainConversion(
            chain,
            networkMap,
          ),
          averageCycleTime: await this.calculateChainCycleTime(
            chain,
            networkMap,
          ),
          chainEfficiency: 0, // Will be calculated after all metrics
        });
      }
    }

    // Calculate efficiency for each chain
    return chains.map((chain) => ({
      ...chain,
      chainEfficiency:
        chain.totalRevenue / (chain.chainLength * chain.averageCycleTime || 1),
    }));
  }

  private async findReferralChain(
    currentVendor: string,
    adjacency: Map<string, VendorConnection[]>,
    visited: Set<string>,
    path: string[],
  ): Promise<string[]> {
    if (visited.has(currentVendor)) {
      return path;
    }

    visited.add(currentVendor);
    path.push(currentVendor);

    const connections = adjacency.get(currentVendor) || [];
    let longestChain = [...path];

    for (const conn of connections) {
      if (!visited.has(conn.toVendorId)) {
        const chain = await this.findReferralChain(
          conn.toVendorId,
          adjacency,
          new Set(visited),
          [...path],
        );
        if (chain.length > longestChain.length) {
          longestChain = chain;
        }
      }
    }

    return longestChain;
  }

  private async calculateChainRevenue(
    vendorPath: string[],
    networkMap: VendorConnection[],
  ): Promise<number> {
    let totalRevenue = 0;
    for (let i = 0; i < vendorPath.length - 1; i++) {
      const connection = networkMap.find(
        (conn) =>
          conn.fromVendorId === vendorPath[i] &&
          conn.toVendorId === vendorPath[i + 1],
      );
      totalRevenue += connection?.revenueGenerated || 0;
    }
    return totalRevenue;
  }

  private async calculateChainConversion(
    vendorPath: string[],
    networkMap: VendorConnection[],
  ): Promise<number> {
    let totalSuccess = 0;
    let totalAttempts = 0;

    for (let i = 0; i < vendorPath.length - 1; i++) {
      const connection = networkMap.find(
        (conn) =>
          conn.fromVendorId === vendorPath[i] &&
          conn.toVendorId === vendorPath[i + 1],
      );
      if (connection) {
        totalSuccess += connection.referralCount * connection.successRate;
        totalAttempts += connection.referralCount;
      }
    }

    return totalAttempts > 0 ? totalSuccess / totalAttempts : 0;
  }

  private async calculateChainCycleTime(
    vendorPath: string[],
    networkMap: VendorConnection[],
  ): Promise<number> {
    // Simplified: assume 7 days per hop
    return vendorPath.length * 7;
  }

  private async identifyVendorHubs(
    networkMap: VendorConnection[],
    referrals: any[],
  ): Promise<VendorHub[]> {
    const vendorStats = new Map<string, any>();

    // Calculate stats for each vendor
    referrals.forEach((ref) => {
      ['inviter_id', 'invitee_id'].forEach((field, index) => {
        const vendorId = ref[field];
        if (!vendorStats.has(vendorId)) {
          vendorStats.set(vendorId, {
            vendorId,
            vendorType:
              ref[index === 0 ? 'user_profiles' : 'invitee_profiles']
                ?.supplier_profiles?.[0]?.vendor_type || 'unknown',
            outgoingReferrals: 0,
            incomingReferrals: 0,
            totalRevenue: 0,
            qualitySum: 0,
            referralCount: 0,
          });
        }

        const stats = vendorStats.get(vendorId);
        if (index === 0) {
          stats.outgoingReferrals++;
        } else {
          stats.incomingReferrals++;
        }
        stats.totalRevenue += ref.attribution_value || 0;
        stats.qualitySum += ref.quality_score || 0.5;
        stats.referralCount++;
      });
    });

    // Convert to VendorHub objects and sort by influence
    return Array.from(vendorStats.values())
      .map((stats) => ({
        vendorId: stats.vendorId,
        vendorType: stats.vendorType,
        outgoingReferrals: stats.outgoingReferrals,
        incomingReferrals: stats.incomingReferrals,
        networkReach: stats.outgoingReferrals + stats.incomingReferrals,
        influenceRadius: Math.sqrt(
          stats.outgoingReferrals * stats.incomingReferrals,
        ),
        qualityScore:
          stats.referralCount > 0
            ? stats.qualitySum / stats.referralCount
            : 0.5,
      }))
      .filter((hub) => hub.networkReach >= 5) // Only vendors with significant reach
      .sort((a, b) => b.influenceRadius - a.influenceRadius)
      .slice(0, 20); // Top 20 hubs
  }

  private async identifyVendorBridges(
    networkMap: VendorConnection[],
  ): Promise<VendorBridge[]> {
    // Simplified bridge detection - vendors that connect different clusters
    const vendorConnections = new Map<string, Set<string>>();

    networkMap.forEach((conn) => {
      if (!vendorConnections.has(conn.fromVendorId)) {
        vendorConnections.set(conn.fromVendorId, new Set());
      }
      if (!vendorConnections.has(conn.toVendorId)) {
        vendorConnections.set(conn.toVendorId, new Set());
      }

      vendorConnections.get(conn.fromVendorId)!.add(conn.toVendorId);
      vendorConnections.get(conn.toVendorId)!.add(conn.fromVendorId);
    });

    // Calculate bridge scores (vendors with connections to many different clusters)
    const bridges: VendorBridge[] = [];

    for (const [vendorId, connections] of vendorConnections) {
      if (connections.size >= 3) {
        // Must have at least 3 connections to be a bridge
        const bridgeScore = connections.size / vendorConnections.size; // Normalized by network size

        bridges.push({
          vendorId,
          bridgeScore,
          clustersConnected: connections.size,
          networkFragmentationRisk: bridgeScore * 0.8, // High bridge score = high fragmentation risk if removed
        });
      }
    }

    return bridges.sort((a, b) => b.bridgeScore - a.bridgeScore).slice(0, 10);
  }

  private async identifyIsolatedVendors(referrals: any[]): Promise<string[]> {
    const connectedVendors = new Set<string>();

    referrals.forEach((ref) => {
      connectedVendors.add(ref.inviter_id);
      connectedVendors.add(ref.invitee_id);
    });

    // Get all vendors
    const { data: allVendors, error } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('user_type', 'supplier');

    if (error || !allVendors?.length) return [];

    // Find vendors not in the referral network
    return allVendors
      .filter((vendor) => !connectedVendors.has(vendor.id))
      .map((vendor) => vendor.id);
  }

  private async calculateNetworkHealth(
    networkMap: VendorConnection[],
    referrals: any[],
  ): Promise<NetworkHealthMetrics> {
    const totalVendors = new Set([
      ...networkMap.map((conn) => conn.fromVendorId),
      ...networkMap.map((conn) => conn.toVendorId),
    ]).size;

    // Connectivity: ratio of connected vendors to total vendors
    const connectivity =
      totalVendors > 0
        ? networkMap.length / (totalVendors * (totalVendors - 1))
        : 0;

    // Resilience: network's ability to maintain connectivity after removing top vendors
    const resilience = await this.calculateNetworkResilience(networkMap);

    // Efficiency: average path length (simplified)
    const efficiency = totalVendors > 1 ? 2.5 : 0; // Average 2.5 hops between vendors

    // Clustering: how clustered the network is
    const clustering = await this.calculateNetworkClustering(networkMap);

    // Diversity: vendor type diversity in the network
    const diversity = await this.calculateVendorTypeDiversity(referrals);

    return {
      connectivity: Math.min(1, connectivity),
      resilience: Math.min(1, resilience),
      efficiency: efficiency / 5, // Normalize to 0-1 (assuming max 5 hops is efficient)
      clustering: Math.min(1, clustering),
      diversity: Math.min(1, diversity),
    };
  }

  private async calculateNetworkResilience(
    networkMap: VendorConnection[],
  ): Promise<number> {
    // Simplified resilience: what happens if we remove the top 10% of vendors
    const vendorImportance = new Map<string, number>();

    networkMap.forEach((conn) => {
      vendorImportance.set(
        conn.fromVendorId,
        (vendorImportance.get(conn.fromVendorId) || 0) + 1,
      );
      vendorImportance.set(
        conn.toVendorId,
        (vendorImportance.get(conn.toVendorId) || 0) + 1,
      );
    });

    const totalConnections = networkMap.length;
    const sortedVendors = Array.from(vendorImportance.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const topVendorsCount = Math.ceil(sortedVendors.length * 0.1);
    const topVendors = new Set(
      sortedVendors.slice(0, topVendorsCount).map(([id]) => id),
    );

    // Count connections that would remain after removing top vendors
    const remainingConnections = networkMap.filter(
      (conn) =>
        !topVendors.has(conn.fromVendorId) && !topVendors.has(conn.toVendorId),
    ).length;

    return totalConnections > 0 ? remainingConnections / totalConnections : 0;
  }

  private async calculateNetworkClustering(
    networkMap: VendorConnection[],
  ): Promise<number> {
    // Use clustering coefficient calculated earlier
    const vendorIds = Array.from(
      new Set([
        ...networkMap.map((conn) => conn.fromVendorId),
        ...networkMap.map((conn) => conn.toVendorId),
      ]),
    );

    return this.calculateClusteringCoefficient(vendorIds.map((id) => ({ id })));
  }

  private async calculateVendorTypeDiversity(
    referrals: any[],
  ): Promise<number> {
    const vendorTypes = new Set<string>();

    referrals.forEach((ref) => {
      const inviterType =
        ref.user_profiles?.supplier_profiles?.[0]?.vendor_type;
      const inviteeType =
        ref.invitee_profiles?.supplier_profiles?.[0]?.vendor_type;

      if (inviterType) vendorTypes.add(inviterType);
      if (inviteeType) vendorTypes.add(inviteeType);
    });

    // Normalize by expected number of vendor types (assume 10 common types)
    return Math.min(1, vendorTypes.size / 10);
  }
}
