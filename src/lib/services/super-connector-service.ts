/**
 * Super-Connector Service - Enhanced viral optimization for high-influence users
 * WS-141 Round 2: Network analysis and influence scoring for viral optimization
 * SECURITY: Validated inputs, privacy protection, performance optimized
 */

import { z } from 'zod';
import { createHash } from 'crypto';

// Validation schemas
const superConnectorSchema = z.object({
  user_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional(),
  couple_count: z.number().min(20), // Must have >20 connections to qualify
  avg_connection_strength: z.number().min(1).max(10),
  recent_connections: z.number().min(0),
  viral_successes: z.number().min(0),
  total_invitations: z.number().min(0),
  super_connector_score: z.number().min(0),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  priority_level: z.number().min(1).max(10),
  reward_multiplier: z.number().min(1).max(5),
  last_analyzed_at: z.date(),
  next_analysis_due: z.date(),
});

const networkAnalysisSchema = z.object({
  total_super_connectors: z.number().min(0),
  tier_distribution: z.object({
    bronze: z.number().min(0),
    silver: z.number().min(0),
    gold: z.number().min(0),
    platinum: z.number().min(0),
  }),
  average_score: z.number().min(0),
  top_performers: z.array(superConnectorSchema).max(10),
  growth_trend: z.object({
    weekly_growth: z.number(),
    monthly_growth: z.number(),
    trend_direction: z.enum(['up', 'down', 'stable']),
  }),
});

const influenceMetricsSchema = z.object({
  network_reach: z.number().min(0),
  conversion_effectiveness: z.number().min(0).max(100),
  relationship_diversity: z.number().min(0).max(100),
  engagement_quality: z.number().min(0).max(100),
  geographic_spread: z.number().min(0),
  recent_activity: z.number().min(0).max(100),
});

type SuperConnector = z.infer<typeof superConnectorSchema>;
type NetworkAnalysis = z.infer<typeof networkAnalysisSchema>;
type InfluenceMetrics = z.infer<typeof influenceMetricsSchema>;

interface SuperConnectorUpdate {
  user_id: string;
  new_tier?: SuperConnector['tier'];
  new_score?: number;
  new_priority?: number;
  new_multiplier?: number;
  reason: string;
}

interface PriorityRoutingConfig {
  super_connector_priority_boost: number;
  inbox_priority_threshold: number;
  max_priority_level: number;
  decay_factor_days: number;
}

export class SuperConnectorService {
  private static readonly SCORING_WEIGHTS = {
    couple_count: 0.3, // 30% - Network size
    avg_strength: 0.25, // 25% - Relationship quality
    viral_success: 0.25, // 25% - Conversion effectiveness
    recent_activity: 0.2, // 20% - Current engagement
  };

  private static readonly TIER_THRESHOLDS = {
    bronze: 20, // 20+ connections
    silver: 50, // 50+ connections with good performance
    gold: 100, // 100+ connections with excellent performance
    platinum: 200, // 200+ connections with exceptional performance
  };

  private static readonly PRIORITY_CONFIG: PriorityRoutingConfig = {
    super_connector_priority_boost: 5,
    inbox_priority_threshold: 7,
    max_priority_level: 10,
    decay_factor_days: 30,
  };

  /**
   * Identify and analyze super-connectors in the network
   * Performance requirement: Complex network analysis under 1s
   */
  static async identifySuperConnectors(
    forceRefresh = false,
  ): Promise<SuperConnector[]> {
    const startTime = Date.now();

    try {
      // Check if we need to refresh the analysis
      if (!forceRefresh) {
        const cachedResults = await this.getCachedSuperConnectors();
        if (cachedResults.length > 0) {
          return cachedResults;
        }
      }

      // Execute optimized super-connector identification query
      const identificationQuery = `
        WITH connector_stats AS (
          SELECT 
            nc.supplier_id as user_id,
            COUNT(DISTINCT nc.couple_id) as couple_count,
            AVG(nc.connection_strength) as avg_strength,
            COUNT(DISTINCT CASE WHEN nc.created_at >= NOW() - INTERVAL '90 days' THEN nc.couple_id END) as recent_connections,
            MAX(nc.created_at) as last_connection_date
          FROM network_connections nc
          WHERE nc.connection_strength >= 7 -- Only high-quality connections
            AND nc.supplier_id IS NOT NULL
          GROUP BY nc.supplier_id
          HAVING COUNT(DISTINCT nc.couple_id) >= 20 -- Minimum threshold for super-connector
        ),
        viral_impact AS (
          SELECT 
            va.actor_id as user_id,
            COUNT(CASE WHEN va.status = 'accepted' THEN 1 END) as successful_invites,
            COUNT(*) as total_invites,
            MAX(va.created_at) as last_viral_activity
          FROM viral_actions va
          WHERE va.actor_type = 'supplier' 
            AND va.created_at >= NOW() - INTERVAL '180 days'
          GROUP BY va.actor_id
        ),
        user_profiles AS (
          SELECT 
            up.id as user_id,
            up.user_type,
            up.company_name,
            up.location,
            up.verified_at
          FROM user_profiles up
          WHERE up.user_type IN ('supplier', 'venue')
            AND up.is_active = true
        )
        SELECT 
          cs.user_id,
          cs.couple_count,
          cs.avg_strength,
          cs.recent_connections,
          COALESCE(vi.successful_invites, 0) as viral_successes,
          COALESCE(vi.total_invites, 0) as total_invitations,
          up.user_type,
          up.company_name,
          up.location,
          up.verified_at IS NOT NULL as is_verified,
          cs.last_connection_date,
          vi.last_viral_activity,
          -- Calculate super-connector score
          ROUND(
            (cs.couple_count * ${this.SCORING_WEIGHTS.couple_count} * 
             cs.avg_strength * ${this.SCORING_WEIGHTS.avg_strength} * 
             (1 + COALESCE(vi.successful_invites, 0) * 0.1) * ${this.SCORING_WEIGHTS.viral_success} * 
             (1 + cs.recent_connections * 0.05) * ${this.SCORING_WEIGHTS.recent_activity}), 2
          ) as super_connector_score
        FROM connector_stats cs
        LEFT JOIN viral_impact vi ON cs.user_id = vi.user_id
        LEFT JOIN user_profiles up ON cs.user_id = up.id
        WHERE cs.couple_count >= 20
        ORDER BY super_connector_score DESC
        LIMIT 500 -- Reasonable limit for processing
      `;

      const queryResult = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: identificationQuery }),
      }).then((res) => res.json());

      if (!queryResult.rows || queryResult.rows.length === 0) {
        return [];
      }

      // Process results and assign tiers
      const superConnectors: SuperConnector[] = queryResult.rows.map(
        (row: any) => {
          const score = parseFloat(row.super_connector_score);
          const coupleCount = parseInt(row.couple_count);

          // Determine tier based on connections and performance
          let tier: SuperConnector['tier'] = 'bronze';
          if (coupleCount >= this.TIER_THRESHOLDS.platinum && score >= 800) {
            tier = 'platinum';
          } else if (coupleCount >= this.TIER_THRESHOLDS.gold && score >= 400) {
            tier = 'gold';
          } else if (
            coupleCount >= this.TIER_THRESHOLDS.silver &&
            score >= 150
          ) {
            tier = 'silver';
          }

          // Calculate priority level and reward multiplier
          const priorityLevel = this.calculatePriorityLevel(tier, score);
          const rewardMultiplier = this.calculateRewardMultiplier(tier, score);

          return superConnectorSchema.parse({
            user_id: row.user_id,
            supplier_id: row.user_id, // Same for suppliers
            couple_count: parseInt(row.couple_count),
            avg_connection_strength: parseFloat(row.avg_strength),
            recent_connections: parseInt(row.recent_connections),
            viral_successes: parseInt(row.viral_successes),
            total_invitations: parseInt(row.total_invitations),
            super_connector_score: score,
            tier,
            priority_level: priorityLevel,
            reward_multiplier: rewardMultiplier,
            last_analyzed_at: new Date(),
            next_analysis_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
          });
        },
      );

      // Cache results for performance
      await this.cacheSuperConnectors(superConnectors);

      // Update database with new super-connector data
      await this.updateSuperConnectorDatabase(superConnectors);

      const processingTime = Date.now() - startTime;
      if (processingTime > 900) {
        // Under 1s requirement
        console.warn(
          `Super-connector identification took ${processingTime}ms - approaching 1s limit`,
        );
      }

      return superConnectors;
    } catch (error) {
      console.error('Super-connector identification failed:', error);
      throw new Error('Failed to identify super-connectors');
    }
  }

  /**
   * Calculate inbox priority boost for super-connector invitations
   * Performance requirement: Priority calculation under 50ms
   */
  static async calculateInboxPriority(
    recipientId: string,
    senderId: string,
    invitationType: 'invitation' | 'referral' | 'collaboration',
  ): Promise<number> {
    const startTime = Date.now();

    try {
      // Check if sender is a super-connector
      const senderConnector = await this.getSuperConnector(senderId);
      if (!senderConnector) {
        return 5; // Default priority
      }

      // Base priority from super-connector tier
      let priority = senderConnector.priority_level;

      // Boost based on invitation type
      const typeBoosts = {
        invitation: 0,
        referral: 2,
        collaboration: 3,
      };
      priority += typeBoosts[invitationType] || 0;

      // Apply relationship strength bonus if available
      const relationshipBonus = await this.getRelationshipStrengthBonus(
        senderId,
        recipientId,
      );
      priority += relationshipBonus;

      // Apply recent activity penalty (prevent spam)
      const activityPenalty = await this.getRecentActivityPenalty(senderId);
      priority = Math.max(1, priority - activityPenalty);

      // Cap at maximum priority
      priority = Math.min(this.PRIORITY_CONFIG.max_priority_level, priority);

      const processingTime = Date.now() - startTime;
      if (processingTime > 45) {
        console.warn(
          `Priority calculation took ${processingTime}ms - approaching 50ms limit`,
        );
      }

      return Math.round(priority);
    } catch (error) {
      console.error('Priority calculation failed:', error);
      return 5; // Safe fallback
    }
  }

  /**
   * Get comprehensive network analysis and metrics
   */
  static async getNetworkAnalysis(): Promise<NetworkAnalysis> {
    try {
      const superConnectors = await this.identifySuperConnectors();

      if (superConnectors.length === 0) {
        return {
          total_super_connectors: 0,
          tier_distribution: { bronze: 0, silver: 0, gold: 0, platinum: 0 },
          average_score: 0,
          top_performers: [],
          growth_trend: {
            weekly_growth: 0,
            monthly_growth: 0,
            trend_direction: 'stable',
          },
        };
      }

      // Calculate tier distribution
      const tierCounts = superConnectors.reduce(
        (acc, sc) => {
          acc[sc.tier]++;
          return acc;
        },
        { bronze: 0, silver: 0, gold: 0, platinum: 0 },
      );

      // Calculate average score
      const averageScore =
        superConnectors.reduce((sum, sc) => sum + sc.super_connector_score, 0) /
        superConnectors.length;

      // Get top 10 performers
      const topPerformers = superConnectors.slice(0, 10);

      // Calculate growth trend (requires historical data)
      const growthTrend = await this.calculateGrowthTrend();

      return networkAnalysisSchema.parse({
        total_super_connectors: superConnectors.length,
        tier_distribution: tierCounts,
        average_score: Math.round(averageScore * 100) / 100,
        top_performers: topPerformers,
        growth_trend: growthTrend,
      });
    } catch (error) {
      console.error('Network analysis failed:', error);
      throw new Error('Failed to generate network analysis');
    }
  }

  /**
   * Update super-connector status and trigger notifications
   */
  static async updateSuperConnectorStatus(
    updates: SuperConnectorUpdate[],
  ): Promise<void> {
    try {
      for (const update of updates) {
        // Update database record
        const updateQuery = `
          UPDATE super_connectors 
          SET 
            tier = COALESCE($2, tier),
            super_connector_score = COALESCE($3, super_connector_score),
            priority_level = COALESCE($4, priority_level),
            reward_multiplier = COALESCE($5, reward_multiplier),
            status_change_reason = $6,
            updated_at = NOW()
          WHERE user_id = $1
        `;

        await fetch('/api/internal/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: updateQuery,
            params: [
              update.user_id,
              update.new_tier || null,
              update.new_score || null,
              update.new_priority || null,
              update.new_multiplier || null,
              update.reason,
            ],
          }),
        });

        // Trigger notification for significant status changes
        if (update.new_tier || (update.new_score && update.new_score > 500)) {
          await this.notifySuperConnectorUpdate(update);
        }
      }
    } catch (error) {
      console.error('Super-connector status update failed:', error);
      throw new Error('Failed to update super-connector status');
    }
  }

  // Private helper methods

  private static calculatePriorityLevel(
    tier: SuperConnector['tier'],
    score: number,
  ): number {
    const basePriority = {
      bronze: 6,
      silver: 7,
      gold: 8,
      platinum: 9,
    }[tier];

    // Add score-based bonus (up to +1)
    const scoreBonus = Math.min(1, Math.floor(score / 500));

    return Math.min(
      this.PRIORITY_CONFIG.max_priority_level,
      basePriority + scoreBonus,
    );
  }

  private static calculateRewardMultiplier(
    tier: SuperConnector['tier'],
    score: number,
  ): number {
    const baseMultiplier = {
      bronze: 1.2,
      silver: 1.5,
      gold: 2.0,
      platinum: 2.5,
    }[tier];

    // Add performance-based bonus
    const performanceBonus = Math.min(0.5, score / 2000);

    return Math.round((baseMultiplier + performanceBonus) * 100) / 100;
  }

  private static async getCachedSuperConnectors(): Promise<SuperConnector[]> {
    try {
      const cacheQuery = `
        SELECT * FROM super_connectors 
        WHERE last_analyzed_at > NOW() - INTERVAL '24 hours'
          AND is_active = true
        ORDER BY super_connector_score DESC
      `;

      const result = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cacheQuery }),
      }).then((res) => res.json());

      if (!result.rows) return [];

      return result.rows.map((row: any) => ({
        user_id: row.user_id,
        supplier_id: row.supplier_id,
        couple_count: parseInt(row.couple_count),
        avg_connection_strength: parseFloat(row.avg_connection_strength),
        recent_connections: parseInt(row.recent_connections),
        viral_successes: parseInt(row.viral_successes),
        total_invitations: parseInt(row.total_invitations),
        super_connector_score: parseFloat(row.super_connector_score),
        tier: row.tier,
        priority_level: parseInt(row.priority_level),
        reward_multiplier: parseFloat(row.reward_multiplier),
        last_analyzed_at: new Date(row.last_analyzed_at),
        next_analysis_due: new Date(row.next_analysis_due),
      }));
    } catch (error) {
      console.error('Failed to get cached super-connectors:', error);
      return [];
    }
  }

  private static async cacheSuperConnectors(
    superConnectors: SuperConnector[],
  ): Promise<void> {
    // Store in Redis/memory cache for fast access
    try {
      const cacheKey = `super_connectors:${Date.now()}`;
      const cacheData = JSON.stringify(superConnectors);

      // Implementation would depend on caching system
      // This is a placeholder for the caching logic
      console.log(`Cached ${superConnectors.length} super-connectors`);
    } catch (error) {
      console.error('Failed to cache super-connectors:', error);
      // Non-critical failure
    }
  }

  private static async updateSuperConnectorDatabase(
    superConnectors: SuperConnector[],
  ): Promise<void> {
    try {
      for (const sc of superConnectors) {
        const upsertQuery = `
          INSERT INTO super_connectors (
            user_id, supplier_id, couple_count, avg_connection_strength,
            recent_connections, viral_successes, total_invitations,
            super_connector_score, tier, priority_level, reward_multiplier,
            last_analyzed_at, next_analysis_due, is_active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            couple_count = $3,
            avg_connection_strength = $4,
            recent_connections = $5,
            viral_successes = $6,
            total_invitations = $7,
            super_connector_score = $8,
            tier = $9,
            priority_level = $10,
            reward_multiplier = $11,
            last_analyzed_at = $12,
            next_analysis_due = $13,
            updated_at = NOW()
        `;

        await fetch('/api/internal/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: upsertQuery,
            params: [
              sc.user_id,
              sc.supplier_id,
              sc.couple_count,
              sc.avg_connection_strength,
              sc.recent_connections,
              sc.viral_successes,
              sc.total_invitations,
              sc.super_connector_score,
              sc.tier,
              sc.priority_level,
              sc.reward_multiplier,
              sc.last_analyzed_at.toISOString(),
              sc.next_analysis_due.toISOString(),
            ],
          }),
        });
      }
    } catch (error) {
      console.error('Failed to update super-connector database:', error);
      // Don't throw - this is background processing
    }
  }

  private static async getSuperConnector(
    userId: string,
  ): Promise<SuperConnector | null> {
    try {
      const query = `
        SELECT * FROM super_connectors 
        WHERE user_id = $1 AND is_active = true
      `;

      const result = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, params: [userId] }),
      }).then((res) => res.json());

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        user_id: row.user_id,
        supplier_id: row.supplier_id,
        couple_count: parseInt(row.couple_count),
        avg_connection_strength: parseFloat(row.avg_connection_strength),
        recent_connections: parseInt(row.recent_connections),
        viral_successes: parseInt(row.viral_successes),
        total_invitations: parseInt(row.total_invitations),
        super_connector_score: parseFloat(row.super_connector_score),
        tier: row.tier,
        priority_level: parseInt(row.priority_level),
        reward_multiplier: parseFloat(row.reward_multiplier),
        last_analyzed_at: new Date(row.last_analyzed_at),
        next_analysis_due: new Date(row.next_analysis_due),
      };
    } catch (error) {
      console.error(`Failed to get super-connector ${userId}:`, error);
      return null;
    }
  }

  private static async getRelationshipStrengthBonus(
    senderId: string,
    recipientId: string,
  ): Promise<number> {
    try {
      const query = `
        SELECT connection_strength 
        FROM network_connections 
        WHERE (supplier_id = $1 AND couple_id = $2) OR (supplier_id = $2 AND couple_id = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, params: [senderId, recipientId] }),
      }).then((res) => res.json());

      if (!result.rows || result.rows.length === 0) {
        return 0;
      }

      const strength = parseFloat(result.rows[0].connection_strength);

      // Convert 1-10 strength to 0-2 bonus
      return Math.floor((strength - 5) / 2.5);
    } catch (error) {
      console.error('Failed to get relationship strength bonus:', error);
      return 0;
    }
  }

  private static async getRecentActivityPenalty(
    senderId: string,
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as recent_invites
        FROM viral_actions 
        WHERE actor_id = $1 
          AND created_at >= NOW() - INTERVAL '24 hours'
          AND actor_type = 'supplier'
      `;

      const result = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, params: [senderId] }),
      }).then((res) => res.json());

      if (!result.rows || result.rows.length === 0) {
        return 0;
      }

      const recentInvites = parseInt(result.rows[0].recent_invites);

      // Penalty for excessive activity (>10 invites per day = -1 priority per 5 invites)
      return Math.floor(Math.max(0, recentInvites - 10) / 5);
    } catch (error) {
      console.error('Failed to get recent activity penalty:', error);
      return 0;
    }
  }

  private static async calculateGrowthTrend(): Promise<
    NetworkAnalysis['growth_trend']
  > {
    try {
      const growthQuery = `
        WITH weekly_counts AS (
          SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as new_super_connectors
          FROM super_connectors 
          WHERE created_at >= NOW() - INTERVAL '8 weeks'
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY week DESC
          LIMIT 8
        ),
        growth_calc AS (
          SELECT 
            week,
            new_super_connectors,
            LAG(new_super_connectors, 1) OVER (ORDER BY week) as prev_week,
            LAG(new_super_connectors, 4) OVER (ORDER BY week) as prev_month
          FROM weekly_counts
        )
        SELECT 
          COALESCE(
            ROUND(
              ((new_super_connectors - prev_week)::decimal / NULLIF(prev_week, 0)) * 100, 2
            ), 0
          ) as weekly_growth,
          COALESCE(
            ROUND(
              ((new_super_connectors - prev_month)::decimal / NULLIF(prev_month, 0)) * 100, 2
            ), 0
          ) as monthly_growth
        FROM growth_calc
        WHERE week = (SELECT MAX(week) FROM weekly_counts)
      `;

      const result = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: growthQuery }),
      }).then((res) => res.json());

      if (!result.rows || result.rows.length === 0) {
        return {
          weekly_growth: 0,
          monthly_growth: 0,
          trend_direction: 'stable',
        };
      }

      const { weekly_growth, monthly_growth } = result.rows[0];

      let trend_direction: 'up' | 'down' | 'stable' = 'stable';
      if (weekly_growth > 5) {
        trend_direction = 'up';
      } else if (weekly_growth < -5) {
        trend_direction = 'down';
      }

      return {
        weekly_growth: parseFloat(weekly_growth),
        monthly_growth: parseFloat(monthly_growth),
        trend_direction,
      };
    } catch (error) {
      console.error('Failed to calculate growth trend:', error);
      return {
        weekly_growth: 0,
        monthly_growth: 0,
        trend_direction: 'stable',
      };
    }
  }

  private static async notifySuperConnectorUpdate(
    update: SuperConnectorUpdate,
  ): Promise<void> {
    try {
      // Send notification about status change
      console.log(
        `Super-connector status updated for ${update.user_id}: ${update.reason}`,
      );

      // Implementation would trigger actual notification system
      // This is a placeholder for notification logic
    } catch (error) {
      console.error('Failed to notify super-connector update:', error);
      // Non-critical failure
    }
  }
}

// Export types for use in other modules
export type {
  SuperConnector,
  NetworkAnalysis,
  InfluenceMetrics,
  SuperConnectorUpdate,
};
