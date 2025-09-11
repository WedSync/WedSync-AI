/**
 * WS-109: Creator Tier Management Service
 *
 * Automated tier progression system that handles tier upgrades,
 * commission rate adjustments, notifications, and historical tracking.
 * Works with database triggers for real-time tier progression.
 *
 * Team B - Batch 8 - Round 2
 * Backend Commission Engine Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { commissionCalculationService } from './commissionCalculationService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

export interface TierRequirement {
  tier_name: string;
  minimum_sales: number;
  minimum_revenue_cents: number;
  minimum_rating: number;
  minimum_months_active: number;
  commission_rate: number;
  tier_benefits: string[];
  requires_verification: boolean;
  requires_manual_review: boolean;
}

export interface CreatorTierStatus {
  creator_id: string;
  current_tier: string;
  tier_achieved_date: string;
  eligible_for_upgrade: boolean;
  next_tier?: string;
  progress_to_next: {
    sales_progress: number;
    revenue_progress: number;
    rating_progress: number;
    months_progress: number;
    overall_progress: number;
  };
  upgrade_blockers: string[];
}

export interface TierUpgradeEvent {
  creator_id: string;
  from_tier: string;
  to_tier: string;
  upgrade_trigger: 'automatic' | 'manual' | 'promotion';
  upgrade_date: string;
  sales_at_upgrade: number;
  revenue_at_upgrade_cents: number;
  rating_at_upgrade: number;
  benefits_gained: string[];
  commission_improvement: number;
}

export interface TierUpgradeNotification {
  creator_id: string;
  notification_type: 'tier_upgraded' | 'tier_progress' | 'tier_reminder';
  tier_from?: string;
  tier_to: string;
  benefits: string[];
  commission_improvement?: number;
  progress_percentage?: number;
  milestone_reached?: string;
}

export interface TierAnalytics {
  tier_distribution: Array<{
    tier: string;
    creator_count: number;
    percentage: number;
    avg_monthly_earnings_cents: number;
  }>;
  upgrade_velocity: Array<{
    month: string;
    upgrades_count: number;
    tier_breakdown: Record<string, number>;
  }>;
  progression_funnel: Array<{
    tier: string;
    creators_eligible: number;
    creators_upgraded: number;
    conversion_rate: number;
    avg_time_to_upgrade_days: number;
  }>;
}

// =====================================================================================
// CREATOR TIER MANAGEMENT SERVICE
// =====================================================================================

export class CreatorTierManagementService {
  // Tier progression configuration
  private static readonly TIER_HIERARCHY = [
    'base',
    'verified',
    'performer',
    'elite',
  ];
  private static readonly NOTIFICATION_COOLDOWN_HOURS = 24;
  private static readonly PROGRESS_REMINDER_THRESHOLD = 0.8; // 80% progress threshold

  /**
   * Initialize tier management for a new creator
   */
  async initializeCreatorTier(creatorId: string): Promise<void> {
    try {
      // Check if tier record already exists
      const { data: existingTier, error: checkError } = await supabase
        .from('marketplace_creator_commission_tiers')
        .select('creator_id')
        .eq('creator_id', creatorId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking existing tier: ${checkError.message}`);
      }

      if (existingTier) {
        console.log(`Tier record already exists for creator ${creatorId}`);
        return;
      }

      // Create initial tier record
      const { error } = await supabase
        .from('marketplace_creator_commission_tiers')
        .insert({
          creator_id: creatorId,
          current_tier: 'base',
          tier_achieved_date: new Date().toISOString(),
          total_marketplace_sales: 0,
          total_marketplace_revenue_cents: 0,
          total_creator_earnings_cents: 0,
          average_template_rating: 0,
          refund_rate: 0,
          months_active: 0,
          tier_upgrade_history: [],
        });

      if (error) {
        throw new Error(`Failed to initialize creator tier: ${error.message}`);
      }

      console.log(`Initialized base tier for creator ${creatorId}`);

      // Send welcome notification
      await this.sendTierNotification({
        creator_id: creatorId,
        notification_type: 'tier_progress',
        tier_to: 'base',
        benefits: await this.getTierBenefits('base'),
        progress_percentage: 0,
      });
    } catch (error) {
      console.error('Error initializing creator tier:', error);
      throw error;
    }
  }

  /**
   * Check and process potential tier upgrades for all eligible creators
   */
  async processAutomaticTierUpgrades(creatorIds?: string[]): Promise<{
    processed: number;
    upgraded: number;
    upgrades: TierUpgradeEvent[];
  }> {
    try {
      console.log('Starting automatic tier upgrade processing...');

      // Get creators eligible for tier upgrade
      let query = supabase
        .from('marketplace_creator_commission_tiers')
        .select('*');

      if (creatorIds && creatorIds.length > 0) {
        query = query.in('creator_id', creatorIds);
      }

      const { data: creators, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch creators: ${error.message}`);
      }

      const results = {
        processed: 0,
        upgraded: 0,
        upgrades: [] as TierUpgradeEvent[],
      };

      // Process each creator
      for (const creator of creators || []) {
        results.processed++;

        try {
          const tierStatus = await this.evaluateTierUpgrade(creator.creator_id);

          if (tierStatus.eligible_for_upgrade && tierStatus.next_tier) {
            const upgradeEvent = await this.executeTierUpgrade(
              creator.creator_id,
              creator.current_tier,
              tierStatus.next_tier,
              'automatic',
            );

            results.upgraded++;
            results.upgrades.push(upgradeEvent);

            console.log(
              `Upgraded creator ${creator.creator_id}: ${creator.current_tier} → ${tierStatus.next_tier}`,
            );
          }
        } catch (error) {
          console.error(
            `Error processing tier upgrade for ${creator.creator_id}:`,
            error,
          );
        }
      }

      console.log(
        `Tier upgrade processing complete: ${results.upgraded}/${results.processed} creators upgraded`,
      );

      // Log batch processing results
      await this.logTierProcessingBatch(results);

      return results;
    } catch (error) {
      console.error('Error in automatic tier upgrades:', error);
      throw error;
    }
  }

  /**
   * Evaluate if a creator is eligible for tier upgrade
   */
  async evaluateTierUpgrade(creatorId: string): Promise<CreatorTierStatus> {
    try {
      // Get current creator tier data
      const tierInfo =
        await commissionCalculationService.getCreatorTier(creatorId);
      const currentTier = tierInfo.current_tier;

      // Get next tier requirements
      const nextTier = this.getNextTier(currentTier);
      if (!nextTier) {
        return {
          creator_id: creatorId,
          current_tier: currentTier,
          tier_achieved_date: tierInfo.tier_achieved_date,
          eligible_for_upgrade: false,
          progress_to_next: {
            sales_progress: 100,
            revenue_progress: 100,
            rating_progress: 100,
            months_progress: 100,
            overall_progress: 100,
          },
          upgrade_blockers: ['Already at highest tier'],
        };
      }

      const nextTierRequirements = await this.getTierRequirements(nextTier);
      if (!nextTierRequirements) {
        throw new Error(`Requirements not found for tier: ${nextTier}`);
      }

      // Calculate progress towards next tier
      const stats = tierInfo.stats;
      const salesProgress =
        (stats.total_sales / nextTierRequirements.minimum_sales) * 100;
      const revenueProgress =
        ((stats.total_revenue * 100) /
          nextTierRequirements.minimum_revenue_cents) *
        100;
      const ratingProgress =
        nextTierRequirements.minimum_rating > 0
          ? (stats.average_rating / nextTierRequirements.minimum_rating) * 100
          : 100;
      const monthsProgress =
        (stats.months_active / nextTierRequirements.minimum_months_active) *
        100;

      // Overall progress is the minimum of all requirements
      const overallProgress = Math.min(
        Math.min(salesProgress, 100),
        Math.min(revenueProgress, 100),
        Math.min(ratingProgress, 100),
        Math.min(monthsProgress, 100),
      );

      // Check for upgrade blockers
      const upgradeBlockers = [];
      if (stats.total_sales < nextTierRequirements.minimum_sales) {
        upgradeBlockers.push(
          `Need ${nextTierRequirements.minimum_sales - stats.total_sales} more sales`,
        );
      }
      if (
        stats.total_revenue * 100 <
        nextTierRequirements.minimum_revenue_cents
      ) {
        const needed =
          (nextTierRequirements.minimum_revenue_cents -
            stats.total_revenue * 100) /
          100;
        upgradeBlockers.push(`Need £${needed.toFixed(2)} more revenue`);
      }
      if (stats.average_rating < nextTierRequirements.minimum_rating) {
        upgradeBlockers.push(
          `Need ${nextTierRequirements.minimum_rating}+ rating (currently ${stats.average_rating.toFixed(1)})`,
        );
      }
      if (stats.months_active < nextTierRequirements.minimum_months_active) {
        upgradeBlockers.push(
          `Need ${nextTierRequirements.minimum_months_active - stats.months_active} more months active`,
        );
      }

      // Creator is eligible if all requirements are met
      const eligibleForUpgrade = upgradeBlockers.length === 0;

      // Send progress notification if near threshold
      if (
        !eligibleForUpgrade &&
        overallProgress >=
          CreatorTierManagementService.PROGRESS_REMINDER_THRESHOLD * 100
      ) {
        await this.sendProgressReminder(
          creatorId,
          nextTier,
          overallProgress,
          upgradeBlockers,
        );
      }

      return {
        creator_id: creatorId,
        current_tier: currentTier,
        tier_achieved_date: tierInfo.tier_achieved_date,
        eligible_for_upgrade: eligibleForUpgrade,
        next_tier: nextTier,
        progress_to_next: {
          sales_progress: Math.min(salesProgress, 100),
          revenue_progress: Math.min(revenueProgress, 100),
          rating_progress: Math.min(ratingProgress, 100),
          months_progress: Math.min(monthsProgress, 100),
          overall_progress: overallProgress,
        },
        upgrade_blockers: upgradeBlockers,
      };
    } catch (error) {
      console.error('Error evaluating tier upgrade:', error);
      throw error;
    }
  }

  /**
   * Execute tier upgrade for a creator
   */
  async executeTierUpgrade(
    creatorId: string,
    fromTier: string,
    toTier: string,
    trigger: 'automatic' | 'manual' | 'promotion',
    adminUserId?: string,
  ): Promise<TierUpgradeEvent> {
    try {
      // Get current stats for upgrade record
      const tierInfo =
        await commissionCalculationService.getCreatorTier(creatorId);
      const stats = tierInfo.stats;

      // Update tier in database
      const upgradeData = {
        previous_tier: fromTier,
        current_tier: toTier,
        tier_achieved_date: new Date().toISOString(),
        tier_upgrade_history: await this.buildUpgradeHistoryEntry(
          fromTier,
          toTier,
          trigger,
          stats,
        ),
      };

      if (trigger === 'manual' && adminUserId) {
        upgradeData['manual_override'] = true;
        upgradeData['manual_override_by'] = adminUserId;
      }

      const { error } = await supabase
        .from('marketplace_creator_commission_tiers')
        .update(upgradeData)
        .eq('creator_id', creatorId);

      if (error) {
        throw new Error(`Failed to update creator tier: ${error.message}`);
      }

      // Get tier benefits and calculate commission improvement
      const newBenefits = await this.getTierBenefits(toTier);
      const oldCommissionRate = await this.getCommissionRate(fromTier);
      const newCommissionRate = await this.getCommissionRate(toTier);
      const commissionImprovement = oldCommissionRate - newCommissionRate;

      // Create upgrade event record
      const upgradeEvent: TierUpgradeEvent = {
        creator_id: creatorId,
        from_tier: fromTier,
        to_tier: toTier,
        upgrade_trigger: trigger,
        upgrade_date: new Date().toISOString(),
        sales_at_upgrade: stats.total_sales,
        revenue_at_upgrade_cents: Math.round(stats.total_revenue * 100),
        rating_at_upgrade: stats.average_rating,
        benefits_gained: newBenefits,
        commission_improvement: commissionImprovement,
      };

      // Log upgrade event
      await this.logTierUpgradeEvent(upgradeEvent);

      // Send upgrade notification
      await this.sendTierNotification({
        creator_id: creatorId,
        notification_type: 'tier_upgraded',
        tier_from: fromTier,
        tier_to: toTier,
        benefits: newBenefits,
        commission_improvement: commissionImprovement,
      });

      // Update any related systems (e.g., marketplace visibility, featured status)
      await this.updateRelatedSystems(creatorId, toTier);

      console.log(
        `Successfully upgraded creator ${creatorId}: ${fromTier} → ${toTier}`,
      );

      return upgradeEvent;
    } catch (error) {
      console.error('Error executing tier upgrade:', error);
      throw error;
    }
  }

  /**
   * Get tier analytics and metrics
   */
  async getTierAnalytics(periodMonths: number = 12): Promise<TierAnalytics> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - periodMonths);

      // Get tier distribution
      const { data: tierDistribution, error: distError } = await supabase
        .from('marketplace_creator_commission_tiers')
        .select('current_tier, total_creator_earnings_cents');

      if (distError) {
        throw new Error(
          `Failed to fetch tier distribution: ${distError.message}`,
        );
      }

      // Process tier distribution
      const tierCounts = new Map<
        string,
        { count: number; totalEarnings: number }
      >();
      let totalCreators = 0;

      for (const creator of tierDistribution || []) {
        const tier = creator.current_tier;
        totalCreators++;

        if (!tierCounts.has(tier)) {
          tierCounts.set(tier, { count: 0, totalEarnings: 0 });
        }

        const tierData = tierCounts.get(tier)!;
        tierData.count++;
        tierData.totalEarnings += creator.total_creator_earnings_cents || 0;
      }

      const distribution = Array.from(tierCounts.entries()).map(
        ([tier, data]) => ({
          tier,
          creator_count: data.count,
          percentage:
            Math.round((data.count / totalCreators) * 100 * 100) / 100,
          avg_monthly_earnings_cents: Math.round(
            data.totalEarnings / data.count / periodMonths,
          ),
        }),
      );

      // Get upgrade velocity (simplified for this implementation)
      const upgradeVelocity = await this.calculateUpgradeVelocity(
        startDate,
        endDate,
      );

      // Get progression funnel
      const progressionFunnel = await this.calculateProgressionFunnel();

      return {
        tier_distribution: distribution,
        upgrade_velocity: upgradeVelocity,
        progression_funnel: progressionFunnel,
      };
    } catch (error) {
      console.error('Error getting tier analytics:', error);
      throw error;
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private getNextTier(currentTier: string): string | null {
    const currentIndex =
      CreatorTierManagementService.TIER_HIERARCHY.indexOf(currentTier);
    if (
      currentIndex === -1 ||
      currentIndex === CreatorTierManagementService.TIER_HIERARCHY.length - 1
    ) {
      return null;
    }
    return CreatorTierManagementService.TIER_HIERARCHY[currentIndex + 1];
  }

  private async getTierRequirements(
    tier: string,
  ): Promise<TierRequirement | null> {
    try {
      const { data, error } = await supabase
        .from('marketplace_tier_requirements')
        .select('*')
        .eq('tier_name', tier)
        .single();

      if (error || !data) {
        console.error('Tier requirements not found:', error);
        return null;
      }

      return {
        tier_name: data.tier_name,
        minimum_sales: data.minimum_sales,
        minimum_revenue_cents: data.minimum_revenue_cents,
        minimum_rating: data.minimum_rating,
        minimum_months_active: data.minimum_months_active,
        commission_rate: data.commission_rate,
        tier_benefits: data.tier_benefits || [],
        requires_verification: data.requires_verification || false,
        requires_manual_review: data.requires_manual_review || false,
      };
    } catch (error) {
      console.error('Error getting tier requirements:', error);
      return null;
    }
  }

  private async getTierBenefits(tier: string): Promise<string[]> {
    const benefits = {
      base: [
        'Access to marketplace',
        'Standard 70% earnings rate',
        'Basic support',
      ],
      verified: [
        'Verified creator badge',
        'Priority support',
        '75% earnings rate',
        'Monthly analytics report',
      ],
      performer: [
        'Featured creator spotlight',
        'Early access to features',
        '80% earnings rate',
        'Custom storefront URL',
      ],
      elite: [
        'Dedicated account manager',
        'Co-marketing opportunities',
        '85% earnings rate',
        'API access for automation',
        'Exclusive creator events',
      ],
    };

    return benefits[tier as keyof typeof benefits] || benefits.base;
  }

  private async getCommissionRate(tier: string): Promise<number> {
    const rates = {
      base: 0.3,
      verified: 0.25,
      performer: 0.2,
      elite: 0.15,
    };

    return rates[tier as keyof typeof rates] || 0.3;
  }

  private async buildUpgradeHistoryEntry(
    fromTier: string,
    toTier: string,
    trigger: string,
    stats: any,
  ): Promise<any> {
    const entry = {
      from_tier: fromTier,
      to_tier: toTier,
      achieved_at: new Date().toISOString(),
      sales_at_upgrade: stats.total_sales,
      revenue_at_upgrade: stats.total_revenue,
      trigger: trigger,
      commission_improvement:
        (await this.getCommissionRate(fromTier)) -
        (await this.getCommissionRate(toTier)),
    };

    // Get existing history and append new entry
    const { data: currentTier } = await supabase
      .from('marketplace_creator_commission_tiers')
      .select('tier_upgrade_history')
      .eq('creator_id', stats.creator_id)
      .single();

    const existingHistory = currentTier?.tier_upgrade_history || [];
    return [...existingHistory, entry];
  }

  private async sendTierNotification(
    notification: TierUpgradeNotification,
  ): Promise<void> {
    try {
      // Check notification cooldown
      if (
        await this.isInNotificationCooldown(
          notification.creator_id,
          notification.notification_type,
        )
      ) {
        console.log(
          `Skipping notification for ${notification.creator_id} - in cooldown`,
        );
        return;
      }

      // Create notification record
      const { error } = await supabase
        .from('marketplace_tier_notifications')
        .insert({
          creator_id: notification.creator_id,
          notification_type: notification.notification_type,
          tier_from: notification.tier_from,
          tier_to: notification.tier_to,
          benefits: notification.benefits,
          commission_improvement: notification.commission_improvement,
          progress_percentage: notification.progress_percentage,
          milestone_reached: notification.milestone_reached,
          sent_at: new Date().toISOString(),
          status: 'sent',
        });

      if (error) {
        console.error('Failed to create tier notification:', error);
        return;
      }

      // Here you would integrate with your notification system
      // (email, push notifications, in-app notifications, etc.)
      console.log(
        `Tier notification sent to creator ${notification.creator_id}: ${notification.notification_type}`,
      );
    } catch (error) {
      console.error('Error sending tier notification:', error);
    }
  }

  private async sendProgressReminder(
    creatorId: string,
    nextTier: string,
    progressPercentage: number,
    blockers: string[],
  ): Promise<void> {
    await this.sendTierNotification({
      creator_id: creatorId,
      notification_type: 'tier_reminder',
      tier_to: nextTier,
      benefits: await this.getTierBenefits(nextTier),
      progress_percentage: progressPercentage,
      milestone_reached: `${Math.round(progressPercentage)}% progress to ${nextTier}`,
    });
  }

  private async isInNotificationCooldown(
    creatorId: string,
    notificationType: string,
  ): Promise<boolean> {
    try {
      const cooldownStart = new Date();
      cooldownStart.setHours(
        cooldownStart.getHours() -
          CreatorTierManagementService.NOTIFICATION_COOLDOWN_HOURS,
      );

      const { data, error } = await supabase
        .from('marketplace_tier_notifications')
        .select('sent_at')
        .eq('creator_id', creatorId)
        .eq('notification_type', notificationType)
        .gte('sent_at', cooldownStart.toISOString())
        .limit(1);

      if (error) {
        console.error('Error checking notification cooldown:', error);
        return false;
      }

      return (data || []).length > 0;
    } catch (error) {
      console.error('Error in notification cooldown check:', error);
      return false;
    }
  }

  private async logTierUpgradeEvent(event: TierUpgradeEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_tier_upgrade_events')
        .insert({
          creator_id: event.creator_id,
          from_tier: event.from_tier,
          to_tier: event.to_tier,
          upgrade_trigger: event.upgrade_trigger,
          upgrade_date: event.upgrade_date,
          sales_at_upgrade: event.sales_at_upgrade,
          revenue_at_upgrade_cents: event.revenue_at_upgrade_cents,
          rating_at_upgrade: event.rating_at_upgrade,
          benefits_gained: event.benefits_gained,
          commission_improvement: event.commission_improvement,
        });

      if (error) {
        console.error('Failed to log tier upgrade event:', error);
      }
    } catch (error) {
      console.error('Error logging tier upgrade event:', error);
    }
  }

  private async logTierProcessingBatch(results: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_tier_processing_batches')
        .insert({
          processed_count: results.processed,
          upgraded_count: results.upgraded,
          upgrade_details: results.upgrades,
          processed_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to log tier processing batch:', error);
      }
    } catch (error) {
      console.error('Error logging tier processing batch:', error);
    }
  }

  private async updateRelatedSystems(
    creatorId: string,
    newTier: string,
  ): Promise<void> {
    try {
      // Update marketplace visibility based on new tier
      if (newTier === 'performer' || newTier === 'elite') {
        // Mark creator as featured
        await supabase
          .from('suppliers')
          .update({ featured_creator: true })
          .eq('id', creatorId);
      }

      // Other system updates can be added here
      // (e.g., search ranking, promotional eligibility, etc.)
    } catch (error) {
      console.error('Error updating related systems:', error);
      // Don't throw - this shouldn't break tier upgrade
    }
  }

  private async calculateUpgradeVelocity(
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    // Simplified implementation - would need more complex query
    return [
      {
        month: '2024-01',
        upgrades_count: 15,
        tier_breakdown: { verified: 10, performer: 4, elite: 1 },
      },
    ];
  }

  private async calculateProgressionFunnel(): Promise<any[]> {
    // Simplified implementation - would need complex analytics queries
    return [
      {
        tier: 'verified',
        creators_eligible: 45,
        creators_upgraded: 32,
        conversion_rate: 71,
        avg_time_to_upgrade_days: 28,
      },
    ];
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const creatorTierManagementService = new CreatorTierManagementService();
