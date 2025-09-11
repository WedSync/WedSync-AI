/**
 * WS-142: CelebrationEngine - Trigger Milestone Celebrations Immediately
 * Real-time celebration system for milestone achievements
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { Milestone, CelebrationTrigger } from './milestone-service';

export interface CelebrationEvent {
  eventId: string;
  userId: string;
  milestoneId: string;
  milestone: Milestone;
  celebrationType:
    | 'in_app'
    | 'email'
    | 'notification'
    | 'badge'
    | 'reward'
    | 'social_share';
  template: string;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  scheduledFor?: Date;
  sentAt?: Date;
  metadata: Record<string, any>;
  personalizationData: PersonalizationData;
}

export interface PersonalizationData {
  userName: string;
  milestoneTitle: string;
  achievementMessage: string;
  rewardPoints: number;
  completionTime: number; // days
  nextMilestones: string[];
  celebrationLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  achievements: AchievementBadge[];
}

export interface AchievementBadge {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface CelebrationTemplate {
  templateId: string;
  name: string;
  celebrationType: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  priority: number;
}

export interface CelebrationMetrics {
  totalCelebrationsSent: number;
  byType: Record<string, number>;
  averageDeliveryTime: number;
  engagementRate: number;
  mostCelebratedMilestones: string[];
  celebrationTrends: CelebrationTrend[];
}

interface CelebrationTrend {
  period: string;
  celebrationsCount: number;
  engagementRate: number;
  topTemplates: string[];
}

export class CelebrationEngine {
  private supabase: SupabaseClient;
  private cachePrefix = 'celebration:';
  private templates: Map<string, CelebrationTemplate> = new Map();
  private processingQueue = false;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.initializeTemplates();
    this.startQueueProcessor();
  }

  /**
   * Trigger immediate celebration for milestone achievement
   */
  async triggerCelebration(
    milestone: Milestone,
    triggers: CelebrationTrigger[],
  ): Promise<CelebrationEvent[]> {
    try {
      const celebrationEvents: CelebrationEvent[] = [];

      for (const trigger of triggers) {
        const event = await this.createCelebrationEvent(milestone, trigger);
        celebrationEvents.push(event);

        // Process based on trigger type
        switch (trigger.triggerType) {
          case 'immediate':
            await this.processImmediateCelebration(event);
            break;
          case 'delayed':
            await this.scheduleDelayedCelebration(event, trigger.delay || 0);
            break;
          case 'scheduled':
            await this.scheduleExactCelebration(event, trigger.scheduledAt!);
            break;
        }
      }

      return celebrationEvents;
    } catch (error) {
      console.error('Error triggering celebration:', error);
      return [];
    }
  }

  /**
   * Process celebration queue
   */
  async processQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      while (true) {
        const queueItem = await redis.brpop('celebration_queue', 1);
        if (!queueItem) break; // No more items

        try {
          const celebrationData = JSON.parse(queueItem[1]);
          await this.processCelebrationFromQueue(celebrationData);
        } catch (error) {
          console.error('Error processing celebration from queue:', error);
        }
      }
    } catch (error) {
      console.error('Error processing celebration queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Send in-app celebration notification
   */
  async sendInAppCelebration(event: CelebrationEvent): Promise<boolean> {
    try {
      const template = this.templates.get(event.template);
      if (!template) {
        console.warn(`Template ${event.template} not found`);
        return false;
      }

      const personalizedContent = await this.personalizeContent(
        template.content,
        event.personalizationData,
      );

      // Store in-app notification
      const { error } = await this.supabase
        .from('in_app_notifications')
        .insert({
          user_id: event.userId,
          type: 'milestone_celebration',
          title: `🎉 Milestone Achieved!`,
          message: personalizedContent,
          data: {
            milestoneId: event.milestoneId,
            celebrationId: event.eventId,
            rewardPoints: event.personalizationData.rewardPoints,
            badge: event.personalizationData.achievements[0] || null,
          },
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Mark as sent
      event.status = 'sent';
      event.sentAt = new Date();
      await this.updateCelebrationStatus(event);

      // Trigger real-time update
      await this.broadcastCelebration(event);

      return true;
    } catch (error) {
      console.error('Error sending in-app celebration:', error);
      event.status = 'failed';
      await this.updateCelebrationStatus(event);
      return false;
    }
  }

  /**
   * Send celebration email
   */
  async sendCelebrationEmail(event: CelebrationEvent): Promise<boolean> {
    try {
      const template = this.templates.get(event.template);
      if (!template) return false;

      const personalizedSubject = await this.personalizeContent(
        template.subject || '🎉 Milestone Achieved!',
        event.personalizationData,
      );

      const personalizedContent = await this.personalizeContent(
        template.content,
        event.personalizationData,
      );

      // Queue email for sending
      await redis.lpush(
        'email_queue',
        JSON.stringify({
          to: event.userId, // Would resolve to email address
          subject: personalizedSubject,
          content: personalizedContent,
          template: 'milestone_celebration',
          data: {
            milestoneId: event.milestoneId,
            celebrationId: event.eventId,
            milestone: event.milestone,
          },
        }),
      );

      event.status = 'sent';
      event.sentAt = new Date();
      await this.updateCelebrationStatus(event);

      return true;
    } catch (error) {
      console.error('Error sending celebration email:', error);
      event.status = 'failed';
      await this.updateCelebrationStatus(event);
      return false;
    }
  }

  /**
   * Award achievement badge
   */
  async awardAchievementBadge(
    userId: string,
    milestone: Milestone,
  ): Promise<AchievementBadge[]> {
    try {
      const badges = await this.determineBadges(milestone);
      const awardedBadges: AchievementBadge[] = [];

      for (const badge of badges) {
        // Check if user already has this badge
        const { data: existingBadge, error } = await this.supabase
          .from('user_achievement_badges')
          .select('*')
          .eq('user_id', userId)
          .eq('badge_id', badge.badgeId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Not found error code
          console.warn('Error checking existing badge:', error);
          continue;
        }

        if (!existingBadge) {
          // Award new badge
          const { error: insertError } = await this.supabase
            .from('user_achievement_badges')
            .insert({
              user_id: userId,
              badge_id: badge.badgeId,
              badge_name: badge.name,
              badge_description: badge.description,
              icon_url: badge.iconUrl,
              rarity: badge.rarity,
              milestone_id: milestone.id,
              earned_at: badge.earnedAt.toISOString(),
            });

          if (!insertError) {
            awardedBadges.push(badge);
          }
        }
      }

      return awardedBadges;
    } catch (error) {
      console.error('Error awarding achievement badge:', error);
      return [];
    }
  }

  /**
   * Get celebration metrics for analytics
   */
  async getCelebrationMetrics(
    userId?: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<CelebrationMetrics> {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = this.supabase
        .from('celebration_events')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .eq('status', 'sent');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: celebrations, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const totalCelebrations = celebrations?.length || 0;
      const byType: Record<string, number> = {};
      const templateUsage: Record<string, number> = {};

      celebrations?.forEach((celebration) => {
        byType[celebration.celebration_type] =
          (byType[celebration.celebration_type] || 0) + 1;
        templateUsage[celebration.template] =
          (templateUsage[celebration.template] || 0) + 1;
      });

      // Calculate average delivery time (mock data)
      const averageDeliveryTime = 2.3; // seconds

      // Calculate engagement rate (mock data)
      const engagementRate = 0.85; // 85%

      return {
        totalCelebrationsSent: totalCelebrations,
        byType,
        averageDeliveryTime,
        engagementRate,
        mostCelebratedMilestones: Object.keys(templateUsage).slice(0, 5),
        celebrationTrends: [],
      };
    } catch (error) {
      console.error('Error getting celebration metrics:', error);
      return {
        totalCelebrationsSent: 0,
        byType: {},
        averageDeliveryTime: 0,
        engagementRate: 0,
        mostCelebratedMilestones: [],
        celebrationTrends: [],
      };
    }
  }

  // Private helper methods

  private async initializeTemplates(): Promise<void> {
    const defaultTemplates: CelebrationTemplate[] = [
      {
        templateId: 'milestone_achieved',
        name: 'Milestone Achievement - In-App',
        celebrationType: 'in_app',
        content:
          '🎉 Congratulations {{userName}}! You\'ve achieved "{{milestoneTitle}}" and earned {{rewardPoints}} points!',
        variables: ['userName', 'milestoneTitle', 'rewardPoints'],
        isActive: true,
        priority: 1,
      },
      {
        templateId: 'milestone_celebration_email',
        name: 'Milestone Achievement - Email',
        celebrationType: 'email',
        subject: '🎉 {{userName}}, you achieved a milestone!',
        content:
          'Congratulations {{userName}}!\n\nYou\'ve successfully achieved "{{milestoneTitle}}" in {{completionTime}} days. You\'ve earned {{rewardPoints}} reward points and unlocked new capabilities!\n\n{{achievementMessage}}\n\nKeep up the great work!',
        variables: [
          'userName',
          'milestoneTitle',
          'completionTime',
          'rewardPoints',
          'achievementMessage',
        ],
        isActive: true,
        priority: 1,
      },
    ];

    defaultTemplates.forEach((template) => {
      this.templates.set(template.templateId, template);
    });
  }

  private async createCelebrationEvent(
    milestone: Milestone,
    trigger: CelebrationTrigger,
  ): Promise<CelebrationEvent> {
    const personalizationData = await this.gatherPersonalizationData(milestone);

    return {
      eventId: crypto.randomUUID(),
      userId: milestone.userId,
      milestoneId: milestone.id,
      milestone,
      celebrationType: trigger.celebrationType,
      template: trigger.template || 'milestone_achieved',
      status: 'pending',
      scheduledFor: trigger.scheduledAt,
      metadata: {
        triggerType: trigger.triggerType,
        createdAt: new Date(),
      },
      personalizationData,
    };
  }

  private async gatherPersonalizationData(
    milestone: Milestone,
  ): Promise<PersonalizationData> {
    try {
      // Get user profile
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', milestone.userId)
        .single();

      const userName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
        : 'there';

      // Calculate completion time
      const completionTime = milestone.achievedAt
        ? Math.ceil(
            (milestone.achievedAt.getTime() - milestone.createdAt.getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : 0;

      // Generate achievement message
      const achievementMessage = this.generateAchievementMessage(
        milestone,
        completionTime,
      );

      // Determine celebration level
      const celebrationLevel = this.determineCelebrationLevel(
        milestone,
        completionTime,
      );

      // Award badges
      const achievements = await this.determineBadges(milestone);

      return {
        userName,
        milestoneTitle: milestone.title,
        achievementMessage,
        rewardPoints: milestone.rewardPoints,
        completionTime,
        nextMilestones: [], // Would fetch actual next milestones
        celebrationLevel,
        achievements,
      };
    } catch (error) {
      console.error('Error gathering personalization data:', error);
      return {
        userName: 'there',
        milestoneTitle: milestone.title,
        achievementMessage: 'Great job on achieving this milestone!',
        rewardPoints: milestone.rewardPoints,
        completionTime: 0,
        nextMilestones: [],
        celebrationLevel: 'bronze',
        achievements: [],
      };
    }
  }

  private async processImmediateCelebration(
    event: CelebrationEvent,
  ): Promise<void> {
    switch (event.celebrationType) {
      case 'in_app':
        await this.sendInAppCelebration(event);
        break;
      case 'email':
        await this.sendCelebrationEmail(event);
        break;
      case 'badge':
        const badges = await this.awardAchievementBadge(
          event.userId,
          event.milestone,
        );
        event.personalizationData.achievements = badges;
        await this.sendInAppCelebration(event); // Also show in-app
        break;
    }
  }

  private async scheduleDelayedCelebration(
    event: CelebrationEvent,
    delay: number,
  ): Promise<void> {
    event.scheduledFor = new Date(Date.now() + delay);
    event.status = 'scheduled';

    // Add to Redis with delay
    setTimeout(async () => {
      await this.processImmediateCelebration(event);
    }, delay);

    await this.storeCelebrationEvent(event);
  }

  private async scheduleExactCelebration(
    event: CelebrationEvent,
    scheduledAt: Date,
  ): Promise<void> {
    event.scheduledFor = scheduledAt;
    event.status = 'scheduled';

    const delay = scheduledAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.processImmediateCelebration(event);
      }, delay);
    }

    await this.storeCelebrationEvent(event);
  }

  private async processCelebrationFromQueue(
    celebrationData: any,
  ): Promise<void> {
    try {
      const { milestoneId, userId, trigger } = celebrationData;

      // Re-fetch milestone data
      const { data: milestoneData, error } = await this.supabase
        .from('success_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (error || !milestoneData) {
        console.warn(`Milestone ${milestoneId} not found for celebration`);
        return;
      }

      const milestone: Milestone = {
        id: milestoneData.id,
        userId: milestoneData.user_id,
        organizationId: milestoneData.organization_id,
        milestoneType: milestoneData.milestone_type,
        category: milestoneData.category,
        title: milestoneData.title,
        description: milestoneData.description,
        targetValue: milestoneData.target_value,
        currentValue: milestoneData.current_value,
        completionPercentage: milestoneData.completion_percentage,
        achieved: milestoneData.achieved,
        achievedAt: milestoneData.achieved_at
          ? new Date(milestoneData.achieved_at)
          : undefined,
        isVisible: milestoneData.is_visible,
        isRequired: milestoneData.is_required,
        weight: milestoneData.weight,
        estimatedDays: milestoneData.estimated_days,
        rewardPoints: milestoneData.reward_points,
        celebrationTriggers: milestoneData.celebration_triggers || [],
        createdAt: new Date(milestoneData.created_at),
        updatedAt: new Date(milestoneData.updated_at),
        dueDate: milestoneData.due_date
          ? new Date(milestoneData.due_date)
          : undefined,
        tags: milestoneData.tags || [],
      };

      await this.triggerCelebration(milestone, [trigger]);
    } catch (error) {
      console.error('Error processing celebration from queue:', error);
    }
  }

  private async personalizeContent(
    content: string,
    data: PersonalizationData,
  ): Promise<string> {
    let personalizedContent = content;

    // Replace template variables
    personalizedContent = personalizedContent.replace(
      /\{\{userName\}\}/g,
      data.userName,
    );
    personalizedContent = personalizedContent.replace(
      /\{\{milestoneTitle\}\}/g,
      data.milestoneTitle,
    );
    personalizedContent = personalizedContent.replace(
      /\{\{rewardPoints\}\}/g,
      data.rewardPoints.toString(),
    );
    personalizedContent = personalizedContent.replace(
      /\{\{completionTime\}\}/g,
      data.completionTime.toString(),
    );
    personalizedContent = personalizedContent.replace(
      /\{\{achievementMessage\}\}/g,
      data.achievementMessage,
    );

    return personalizedContent;
  }

  private generateAchievementMessage(
    milestone: Milestone,
    completionTime: number,
  ): string {
    const messages = [
      `You completed this ${completionTime <= milestone.estimatedDays ? 'ahead of schedule' : 'successfully'}!`,
      `This milestone brings you closer to mastering the platform!`,
      `Your wedding business is growing stronger with each achievement!`,
      `Keep up the momentum - you're doing great!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  private determineCelebrationLevel(
    milestone: Milestone,
    completionTime: number,
  ): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (milestone.isRequired) {
      return completionTime <= milestone.estimatedDays * 0.5
        ? 'platinum'
        : completionTime <= milestone.estimatedDays * 0.75
          ? 'gold'
          : 'silver';
    }

    return completionTime <= milestone.estimatedDays ? 'gold' : 'silver';
  }

  private async determineBadges(
    milestone: Milestone,
  ): Promise<AchievementBadge[]> {
    const badges: AchievementBadge[] = [];

    // Award badges based on milestone type and category
    if (
      milestone.milestoneType === 'onboarding' &&
      milestone.category === 'setup'
    ) {
      badges.push({
        badgeId: 'onboarding_champion',
        name: 'Onboarding Champion',
        description: 'Completed initial setup milestones',
        iconUrl: '/badges/onboarding-champion.svg',
        earnedAt: new Date(),
        rarity: 'common',
      });
    }

    if (
      milestone.milestoneType === 'feature_adoption' &&
      milestone.targetValue >= 5
    ) {
      badges.push({
        badgeId: 'feature_explorer',
        name: 'Feature Explorer',
        description: 'Mastered multiple platform features',
        iconUrl: '/badges/feature-explorer.svg',
        earnedAt: new Date(),
        rarity: 'uncommon',
      });
    }

    return badges;
  }

  private async broadcastCelebration(event: CelebrationEvent): Promise<void> {
    try {
      // Broadcast real-time celebration via WebSocket or Server-Sent Events
      await redis.publish(
        `user:${event.userId}:celebrations`,
        JSON.stringify({
          type: 'milestone_celebration',
          event,
        }),
      );
    } catch (error) {
      console.warn('Error broadcasting celebration:', error);
    }
  }

  private async storeCelebrationEvent(event: CelebrationEvent): Promise<void> {
    try {
      const { error } = await this.supabase.from('celebration_events').insert({
        event_id: event.eventId,
        user_id: event.userId,
        milestone_id: event.milestoneId,
        celebration_type: event.celebrationType,
        template: event.template,
        status: event.status,
        scheduled_for: event.scheduledFor?.toISOString(),
        sent_at: event.sentAt?.toISOString(),
        metadata: event.metadata,
        personalization_data: event.personalizationData,
      });

      if (error) throw error;
    } catch (error) {
      console.warn('Error storing celebration event:', error);
    }
  }

  private async updateCelebrationStatus(
    event: CelebrationEvent,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('celebration_events')
        .update({
          status: event.status,
          sent_at: event.sentAt?.toISOString(),
          metadata: event.metadata,
        })
        .eq('event_id', event.eventId);

      if (error) throw error;
    } catch (error) {
      console.warn('Error updating celebration status:', error);
    }
  }

  private startQueueProcessor(): void {
    // Process celebration queue every 5 seconds
    setInterval(() => {
      this.processQueue().catch((error) => {
        console.error('Queue processing error:', error);
      });
    }, 5000);
  }
}

// Export singleton instance
export const celebrationEngine = new CelebrationEngine();
