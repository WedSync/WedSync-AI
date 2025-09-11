// WS-334 Team D: Couple Notification Service
// Core business logic for wedding couple notifications

import { format, differenceInDays, addDays } from 'date-fns';
import {
  PersonalizedNotification,
  MilestoneNotification,
  CoupleProfile,
  WeddingContext,
  NotificationPreference,
  BaseNotification,
  EmotionalTone,
  MilestoneType,
} from '@/types/couple-notifications';
import { CouplePersonalizationEngine } from '@/components/couples/personalization/CouplePersonalizationEngine';
import { supabase } from '@/lib/supabase';

export class CoupleNotificationService {
  private personalizationEngine: CouplePersonalizationEngine;
  private notificationQueue: Map<string, PersonalizedNotification[]>;
  private activeStreams: Map<string, Set<string>>; // coupleId -> Set of connectionIds

  constructor() {
    this.personalizationEngine = new CouplePersonalizationEngine();
    this.notificationQueue = new Map();
    this.activeStreams = new Map();
  }

  /**
   * Initialize notification experience for a couple
   */
  async initializeCoupleExperience(couple: CoupleProfile): Promise<void> {
    try {
      // Create notification preferences if they don't exist
      await this.createDefaultNotificationPreferences(couple);

      // Schedule welcome notifications
      await this.scheduleWelcomeNotifications(couple);

      // Set up milestone tracking
      await this.initializeMilestoneTracking(couple);

      console.log(
        `Initialized notification experience for couple ${couple.coupleId}`,
      );
    } catch (error) {
      console.error('Error initializing couple experience:', error);
      throw new Error('Failed to initialize couple notification experience');
    }
  }

  /**
   * Generate and deliver personalized notifications
   */
  async generateAndDeliverNotification(
    baseNotification: BaseNotification,
    coupleProfile: CoupleProfile,
    weddingContext: WeddingContext,
  ): Promise<PersonalizedNotification> {
    try {
      // Check if couple has notification preferences
      const preferences = await this.getCoupleNotificationPreferences(
        coupleProfile.coupleId,
      );

      // Skip if notifications are disabled
      if (!preferences?.enabled) {
        throw new Error('Notifications disabled for couple');
      }

      // Generate personalized notification using AI engine
      const personalizedNotification =
        await this.personalizationEngine.generatePersonalizedNotification(
          baseNotification,
          coupleProfile,
          weddingContext,
        );

      // Apply delivery preferences (timing, frequency, etc.)
      const optimizedNotification = await this.applyDeliveryOptimization(
        personalizedNotification,
        preferences,
      );

      // Store notification in database
      await this.storeNotification(optimizedNotification);

      // Deliver notification
      if (
        optimizedNotification.scheduledFor &&
        optimizedNotification.scheduledFor > new Date()
      ) {
        await this.scheduleNotification(optimizedNotification);
      } else {
        await this.deliverNotificationImmediately(optimizedNotification);
      }

      // Track engagement metrics
      await this.trackNotificationDelivery(optimizedNotification);

      return optimizedNotification;
    } catch (error) {
      console.error('Error generating personalized notification:', error);

      // Fallback to basic notification
      const basicNotification = await this.generateBasicNotification(
        baseNotification,
        coupleProfile,
        weddingContext,
      );

      await this.deliverNotificationImmediately(basicNotification);
      return basicNotification;
    }
  }

  /**
   * Create milestone notification with celebration features
   */
  async createMilestoneNotification(
    milestoneType: MilestoneType,
    coupleProfile: CoupleProfile,
    weddingContext: WeddingContext,
    additionalData?: any,
  ): Promise<MilestoneNotification> {
    try {
      const milestoneTemplates = this.getMilestoneTemplates();
      const template = milestoneTemplates[milestoneType];

      if (!template) {
        throw new Error(
          `No template found for milestone type: ${milestoneType}`,
        );
      }

      // Create milestone notification
      const milestone: MilestoneNotification = {
        milestoneId: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        milestoneType,
        coupleId: coupleProfile.coupleId,
        weddingId: weddingContext.weddingId,
        achievementLevel: this.calculateAchievementLevel(
          milestoneType,
          weddingContext,
        ),
        celebrationContent: {
          title: this.personalizeCelebrationTitle(
            template.title,
            coupleProfile,
          ),
          description: this.personalizeCelebrationDescription(
            template.description,
            coupleProfile,
            weddingContext,
          ),
          celebrationMessage: this.generateCelebrationMessage(
            milestoneType,
            coupleProfile,
          ),
          achievementBadge: template.badge,
          confettiAnimation: template.animation,
          soundEffect: template.sound,
        },
        progressVisualization: await this.createProgressVisualization(
          milestoneType,
          weddingContext,
        ),
        shareableAssets: await this.generateMilestoneShareableAssets(
          milestoneType,
          coupleProfile,
        ),
        friendInvitationPrompts: this.createFriendInvitationPrompts(
          milestoneType,
          coupleProfile,
        ),
        vendorAppreciationContent: await this.generateVendorAppreciation(
          milestoneType,
          weddingContext,
        ),
        isShared: false,
        sharedCount: 0,
        celebratedAt: new Date(),
        createdAt: new Date(),
      };

      // Store milestone
      await this.storeMilestone(milestone);

      // Deliver milestone celebration
      await this.deliverMilestoneCelebration(milestone);

      // Trigger viral growth features
      await this.triggerViralGrowthFeatures(milestone, coupleProfile);

      return milestone;
    } catch (error) {
      console.error('Error creating milestone notification:', error);
      throw new Error('Failed to create milestone notification');
    }
  }

  /**
   * Manage real-time notification streams
   */
  addNotificationStream(coupleId: string, connectionId: string): void {
    if (!this.activeStreams.has(coupleId)) {
      this.activeStreams.set(coupleId, new Set());
    }
    this.activeStreams.get(coupleId)!.add(connectionId);

    console.log(
      `Added notification stream for couple ${coupleId}, connection ${connectionId}`,
    );
  }

  removeNotificationStream(coupleId: string, connectionId: string): void {
    const streams = this.activeStreams.get(coupleId);
    if (streams) {
      streams.delete(connectionId);
      if (streams.size === 0) {
        this.activeStreams.delete(coupleId);
      }
    }

    console.log(
      `Removed notification stream for couple ${coupleId}, connection ${connectionId}`,
    );
  }

  /**
   * Broadcast notification to all active streams for a couple
   */
  async broadcastToCouple(
    coupleId: string,
    notification: PersonalizedNotification | MilestoneNotification,
  ): Promise<void> {
    const streams = this.activeStreams.get(coupleId);
    if (!streams || streams.size === 0) {
      console.log(`No active streams for couple ${coupleId}`);
      return;
    }

    const notificationData = JSON.stringify(notification);

    for (const connectionId of streams) {
      try {
        // In a real implementation, this would use Server-Sent Events or WebSockets
        // For now, we'll use a simple in-memory approach
        await this.sendToConnection(connectionId, notificationData);
      } catch (error) {
        console.error(
          `Failed to send notification to connection ${connectionId}:`,
          error,
        );
        // Remove failed connection
        streams.delete(connectionId);
      }
    }
  }

  /**
   * Get couple's notification history
   */
  async getCoupleNotificationHistory(
    coupleId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    notifications: PersonalizedNotification[];
    milestones: MilestoneNotification[];
    total: number;
  }> {
    try {
      const {
        limit = 50,
        offset = 0,
        category,
        type,
        startDate,
        endDate,
      } = options;

      // Build query filters
      let notificationQuery = supabase
        .from('couple_notifications')
        .select('*')
        .eq('couple_id', coupleId);

      let milestoneQuery = supabase
        .from('milestone_notifications')
        .select('*')
        .eq('couple_id', coupleId);

      // Apply filters
      if (category) {
        notificationQuery = notificationQuery.eq('category', category);
      }
      if (type) {
        notificationQuery = notificationQuery.eq('type', type);
        milestoneQuery = milestoneQuery.eq('milestone_type', type);
      }
      if (startDate) {
        notificationQuery = notificationQuery.gte(
          'created_at',
          startDate.toISOString(),
        );
        milestoneQuery = milestoneQuery.gte(
          'created_at',
          startDate.toISOString(),
        );
      }
      if (endDate) {
        notificationQuery = notificationQuery.lte(
          'created_at',
          endDate.toISOString(),
        );
        milestoneQuery = milestoneQuery.lte(
          'created_at',
          endDate.toISOString(),
        );
      }

      // Execute queries
      const [notificationResult, milestoneResult] = await Promise.all([
        notificationQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        milestoneQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
      ]);

      if (notificationResult.error) throw notificationResult.error;
      if (milestoneResult.error) throw milestoneResult.error;

      return {
        notifications: notificationResult.data || [],
        milestones: milestoneResult.data || [],
        total:
          (notificationResult.data?.length || 0) +
          (milestoneResult.data?.length || 0),
      };
    } catch (error) {
      console.error('Error fetching couple notification history:', error);
      throw new Error('Failed to fetch notification history');
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    coupleId: string,
    preferences: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    try {
      const { data, error } = await supabase
        .from('couple_notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('couple_id', coupleId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Track notification engagement
   */
  async trackNotificationEngagement(
    notificationId: string,
    action: 'opened' | 'clicked' | 'shared' | 'dismissed',
    metadata?: any,
  ): Promise<void> {
    try {
      // Update notification status
      await supabase
        .from('couple_notifications')
        .update({
          is_read: action === 'opened' || action === 'clicked',
          read_at:
            action === 'opened' || action === 'clicked'
              ? new Date().toISOString()
              : undefined,
          last_action: action,
          action_metadata: metadata,
        })
        .eq('notification_id', notificationId);

      // Track engagement metrics
      await supabase.from('notification_engagement_metrics').insert({
        notification_id: notificationId,
        action,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking notification engagement:', error);
      // Non-critical error, don't throw
    }
  }

  // Private helper methods

  private async createDefaultNotificationPreferences(
    couple: CoupleProfile,
  ): Promise<void> {
    const preferences = {
      couple_id: couple.coupleId,
      enabled: true,
      communication_style:
        couple.partnerA.communicationPreference || 'casual_fun',
      notification_frequency: 'normal',
      email_enabled: true,
      push_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      milestone_celebrations: true,
      vendor_updates: true,
      planning_reminders: true,
      viral_prompts: couple.viralTendencies !== 'low',
      created_at: new Date().toISOString(),
    };

    await supabase.from('couple_notification_preferences').upsert(preferences);
  }

  private async scheduleWelcomeNotifications(
    couple: CoupleProfile,
  ): Promise<void> {
    const welcomeSequence = [
      {
        delay: 0, // Immediate
        title: `Welcome to WedMe, ${couple.partnerA.firstName} & ${couple.partnerB.firstName}!`,
        message:
          "We're so excited to be part of your wedding planning journey! Let's start by setting up your wedding timeline.",
        type: 'welcome',
        category: 'planning',
      },
      {
        delay: 24 * 60 * 60 * 1000, // 24 hours
        title: 'Ready to invite your vendors?',
        message:
          'Connect with your wedding vendors on WedSync to streamline communication and planning!',
        type: 'vendor_invitation',
        category: 'vendor',
      },
      {
        delay: 72 * 60 * 60 * 1000, // 72 hours
        title: 'Share your journey with friends!',
        message:
          "Let your loved ones follow along with your wedding planning. They'll love celebrating your milestones!",
        type: 'viral_invitation',
        category: 'social',
      },
    ];

    for (const welcome of welcomeSequence) {
      setTimeout(async () => {
        try {
          const baseNotification: BaseNotification = {
            id: `welcome-${Date.now()}`,
            type: welcome.type,
            category: welcome.category,
            title: welcome.title,
            message: welcome.message,
            priority: 'medium',
          };

          const weddingContext = await this.getWeddingContext(couple.weddingId);
          await this.generateAndDeliverNotification(
            baseNotification,
            couple,
            weddingContext,
          );
        } catch (error) {
          console.error('Error sending welcome notification:', error);
        }
      }, welcome.delay);
    }
  }

  private async initializeMilestoneTracking(
    couple: CoupleProfile,
  ): Promise<void> {
    const milestoneTemplate = {
      couple_id: couple.coupleId,
      wedding_id: couple.weddingId,
      milestones: [
        {
          type: 'venue_booked',
          completed: false,
          target_date: this.calculateTargetDate(couple.weddingDate, 180),
        },
        {
          type: 'photographer_booked',
          completed: false,
          target_date: this.calculateTargetDate(couple.weddingDate, 150),
        },
        {
          type: 'catering_booked',
          completed: false,
          target_date: this.calculateTargetDate(couple.weddingDate, 120),
        },
        {
          type: 'invitations_sent',
          completed: false,
          target_date: this.calculateTargetDate(couple.weddingDate, 60),
        },
        {
          type: 'final_details',
          completed: false,
          target_date: this.calculateTargetDate(couple.weddingDate, 7),
        },
      ],
      created_at: new Date().toISOString(),
    };

    await supabase.from('couple_milestone_tracking').upsert(milestoneTemplate);
  }

  private calculateTargetDate(weddingDate: Date, daysBefore: number): Date {
    return addDays(new Date(weddingDate), -daysBefore);
  }

  private async getCoupleNotificationPreferences(
    coupleId: string,
  ): Promise<NotificationPreference | null> {
    const { data, error } = await supabase
      .from('couple_notification_preferences')
      .select('*')
      .eq('couple_id', coupleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw error;
    }

    return data;
  }

  private async applyDeliveryOptimization(
    notification: PersonalizedNotification,
    preferences: NotificationPreference,
  ): Promise<PersonalizedNotification> {
    // Apply frequency limits
    if (preferences.notification_frequency === 'minimal') {
      const recentCount = await this.getRecentNotificationCount(
        notification.coupleId,
        24,
      ); // Last 24 hours
      if (recentCount >= 2 && notification.priority !== 'urgent') {
        // Schedule for later
        notification.scheduledFor = addDays(new Date(), 1);
      }
    }

    // Apply quiet hours
    if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = parseInt(preferences.quiet_hours_start.split(':')[0]);
      const quietEnd = parseInt(preferences.quiet_hours_end.split(':')[0]);

      if (
        (quietStart > quietEnd &&
          (currentHour >= quietStart || currentHour < quietEnd)) ||
        (quietStart < quietEnd &&
          currentHour >= quietStart &&
          currentHour < quietEnd)
      ) {
        // Schedule for after quiet hours
        const scheduledTime = new Date(now);
        scheduledTime.setHours(quietEnd, 0, 0, 0);
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        notification.scheduledFor = scheduledTime;
      }
    }

    return notification;
  }

  private async getRecentNotificationCount(
    coupleId: string,
    hours: number,
  ): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { count, error } = await supabase
      .from('couple_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .gte('created_at', since.toISOString());

    if (error) throw error;
    return count || 0;
  }

  private async storeNotification(
    notification: PersonalizedNotification,
  ): Promise<void> {
    const { error } = await supabase.from('couple_notifications').insert({
      notification_id: notification.notificationId,
      couple_id: notification.coupleId,
      wedding_id: notification.weddingId,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      personalization_level: notification.personalizationLevel,
      emotional_tone: notification.emotionalTone,
      visual_theme: notification.visualTheme,
      content: notification.content,
      sharing_capabilities: notification.sharingCapabilities,
      viral_elements: notification.viralElements,
      contextual_recommendations: notification.contextualRecommendations,
      is_read: false,
      scheduled_for: notification.scheduledFor?.toISOString(),
      created_at: notification.createdAt.toISOString(),
    });

    if (error) throw error;
  }

  private async storeMilestone(
    milestone: MilestoneNotification,
  ): Promise<void> {
    const { error } = await supabase.from('milestone_notifications').insert({
      milestone_id: milestone.milestoneId,
      milestone_type: milestone.milestoneType,
      couple_id: milestone.coupleId,
      wedding_id: milestone.weddingId,
      achievement_level: milestone.achievementLevel,
      celebration_content: milestone.celebrationContent,
      progress_visualization: milestone.progressVisualization,
      shareable_assets: milestone.shareableAssets,
      friend_invitation_prompts: milestone.friendInvitationPrompts,
      vendor_appreciation_content: milestone.vendorAppreciationContent,
      is_shared: milestone.isShared,
      shared_count: milestone.sharedCount,
      celebrated_at: milestone.celebratedAt.toISOString(),
      created_at: milestone.createdAt.toISOString(),
    });

    if (error) throw error;
  }

  private async scheduleNotification(
    notification: PersonalizedNotification,
  ): Promise<void> {
    // In production, this would use a job queue like Bull or Agenda
    const delay = notification.scheduledFor!.getTime() - Date.now();

    setTimeout(async () => {
      await this.deliverNotificationImmediately(notification);
    }, delay);
  }

  private async deliverNotificationImmediately(
    notification: PersonalizedNotification,
  ): Promise<void> {
    // Broadcast to active streams
    await this.broadcastToCouple(notification.coupleId, notification);

    // Send push notification if enabled
    await this.sendPushNotification(notification);

    // Send email if enabled
    await this.sendEmailNotification(notification);
  }

  private async deliverMilestoneCelebration(
    milestone: MilestoneNotification,
  ): Promise<void> {
    // Broadcast to active streams with special milestone handling
    await this.broadcastToCouple(milestone.coupleId, milestone);

    // Send celebration push notification
    await this.sendMilestonePushNotification(milestone);

    // Send celebration email
    await this.sendMilestoneEmailNotification(milestone);
  }

  private async sendToConnection(
    connectionId: string,
    data: string,
  ): Promise<void> {
    // This would integrate with your SSE or WebSocket implementation
    console.log(`Sending to connection ${connectionId}: ${data}`);
  }

  private async sendPushNotification(
    notification: PersonalizedNotification,
  ): Promise<void> {
    // Integration with push notification service (Firebase, etc.)
    console.log(`Sending push notification: ${notification.content.title}`);
  }

  private async sendEmailNotification(
    notification: PersonalizedNotification,
  ): Promise<void> {
    // Integration with email service (Resend, etc.)
    console.log(`Sending email notification: ${notification.content.title}`);
  }

  private async sendMilestonePushNotification(
    milestone: MilestoneNotification,
  ): Promise<void> {
    console.log(
      `Sending milestone push: ${milestone.celebrationContent.title}`,
    );
  }

  private async sendMilestoneEmailNotification(
    milestone: MilestoneNotification,
  ): Promise<void> {
    console.log(
      `Sending milestone email: ${milestone.celebrationContent.title}`,
    );
  }

  private async trackNotificationDelivery(
    notification: PersonalizedNotification,
  ): Promise<void> {
    await supabase.from('notification_delivery_metrics').insert({
      notification_id: notification.notificationId,
      couple_id: notification.coupleId,
      delivery_method: 'realtime',
      delivered_at: new Date().toISOString(),
      personalization_level: notification.personalizationLevel,
      emotional_tone: notification.emotionalTone,
    });
  }

  private async generateBasicNotification(
    baseNotification: BaseNotification,
    coupleProfile: CoupleProfile,
    weddingContext: WeddingContext,
  ): Promise<PersonalizedNotification> {
    return {
      notificationId: `basic-${baseNotification.id}-${Date.now()}`,
      coupleId: coupleProfile.coupleId,
      weddingId: weddingContext.weddingId,
      type: baseNotification.type,
      category: baseNotification.category,
      priority: baseNotification.priority || 'medium',
      personalizationLevel: 'basic',
      emotionalTone: 'excited',
      visualTheme: {
        primaryColor: '#f43f5e',
        secondaryColor: '#fecaca',
        accentColor: '#fb7185',
        fontStyle: 'friendly',
        backgroundPattern: 'subtle',
      },
      content: {
        title: `${coupleProfile.partnerA.firstName} & ${coupleProfile.partnerB.firstName}, ${baseNotification.title}`,
        message: baseNotification.message,
        personalizedElements: [],
      },
      sharingCapabilities: [],
      viralElements: [],
      contextualRecommendations: [],
      isRead: false,
      createdAt: new Date(),
    };
  }

  private async getWeddingContext(weddingId: string): Promise<WeddingContext> {
    // This would fetch wedding context from database
    // Simplified implementation for now
    return {
      weddingId,
      weddingDate: new Date('2024-06-15'),
      daysToWedding: 180,
      currentPhase: 'early_planning',
      budgetUtilization: 0.3,
      vendorCategories: [],
      selectedVendors: [],
      timeline: {},
      guestList: [],
      currentStressLevel: 'low',
      planningProgress: 0.2,
    } as WeddingContext;
  }

  private getMilestoneTemplates() {
    return {
      venue_booked: {
        title: 'Venue Booked! 🏛️',
        description:
          'Your perfect venue is secured! The foundation of your dream day is set.',
        badge: '🏛️',
        animation: 'confetti',
        sound: 'celebration',
      },
      vendor_confirmed: {
        title: 'Another Vendor Confirmed! 🤝',
        description: 'Your wedding dream team is coming together beautifully!',
        badge: '🤝',
        animation: 'sparkles',
        sound: 'success',
      },
      budget_milestone: {
        title: 'Budget Milestone Reached! 💰',
        description: "You're managing your wedding budget like pros!",
        badge: '💰',
        animation: 'coins',
        sound: 'chime',
      },
      timeline_complete: {
        title: 'Timeline Complete! ✅',
        description: 'Your wedding day schedule is perfectly planned!',
        badge: '✅',
        animation: 'checkmarks',
        sound: 'achievement',
      },
      guest_responses: {
        title: 'RSVP Milestone! 👥',
        description: 'Your guests are excited to celebrate with you!',
        badge: '👥',
        animation: 'hearts',
        sound: 'applause',
      },
      final_details: {
        title: 'Final Details Complete! ⭐',
        description: 'Everything is perfectly in place for your magical day!',
        badge: '⭐',
        animation: 'stars',
        sound: 'fanfare',
      },
    };
  }

  private calculateAchievementLevel(
    milestoneType: MilestoneType,
    context: WeddingContext,
  ): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
    const daysAhead =
      context.daysToWedding - this.getTypicalMilestoneDay(milestoneType);

    if (daysAhead > 60) return 'diamond';
    if (daysAhead > 30) return 'platinum';
    if (daysAhead > 0) return 'gold';
    if (daysAhead >= -7) return 'silver';
    return 'bronze';
  }

  private getTypicalMilestoneDay(milestoneType: MilestoneType): number {
    const typicalDays = {
      venue_booked: 180,
      vendor_confirmed: 120,
      budget_milestone: 90,
      timeline_complete: 60,
      guest_responses: 30,
      final_details: 7,
    };

    return typicalDays[milestoneType] || 90;
  }

  private personalizeCelebrationTitle(
    template: string,
    couple: CoupleProfile,
  ): string {
    return template.replace(
      '{{couple_names}}',
      `${couple.partnerA.firstName} & ${couple.partnerB.firstName}`,
    );
  }

  private personalizeCelebrationDescription(
    template: string,
    couple: CoupleProfile,
    context: WeddingContext,
  ): string {
    return template
      .replace(
        '{{couple_names}}',
        `${couple.partnerA.firstName} & ${couple.partnerB.firstName}`,
      )
      .replace('{{days_to_wedding}}', context.daysToWedding.toString())
      .replace(
        '{{wedding_date}}',
        format(new Date(context.weddingDate), 'MMMM do, yyyy'),
      );
  }

  private generateCelebrationMessage(
    milestoneType: MilestoneType,
    couple: CoupleProfile,
  ): string {
    const messages = {
      venue_booked: `🎉 ${couple.partnerA.firstName} & ${couple.partnerB.firstName}, your venue is booked! Time to celebrate this huge milestone! 💕`,
      vendor_confirmed: `✨ Another amazing vendor joins your dream team! You two are absolutely crushing this wedding planning! 🌟`,
      budget_milestone: `💰 Budget milestone achieved! You're managing your finances like the responsible couple you are! 👏`,
      timeline_complete: `⏰ Your timeline is perfected! Everything will flow beautifully on your special day! 💫`,
      guest_responses: `👥 Your loved ones can't wait to celebrate with you! The excitement is building! 🎊`,
      final_details: `⭐ Everything is absolutely perfect! Your dream wedding is ready to become reality! 🎭`,
    };

    return (
      messages[milestoneType] ||
      `🎉 Congratulations on reaching this milestone! 💕`
    );
  }

  // Additional helper methods would continue here...
  private async createProgressVisualization(
    milestoneType: MilestoneType,
    context: WeddingContext,
  ): Promise<any> {
    return {
      visualType: 'progress_bar',
      currentProgress: Math.round(context.planningProgress * 100),
      totalSteps: 100,
      completedMilestones: [],
      nextMilestone: 'Continue planning your perfect day!',
      visualStyle: 'romantic',
    };
  }

  private async generateMilestoneShareableAssets(
    milestoneType: MilestoneType,
    couple: CoupleProfile,
  ): Promise<any[]> {
    return [
      {
        assetId: `milestone-share-${Date.now()}`,
        type: 'image',
        url: `/api/generate/milestone-share/${milestoneType}/${couple.coupleId}`,
        thumbnailUrl: `/api/generate/milestone-share/${milestoneType}/${couple.coupleId}/thumb`,
        dimensions: { width: 1200, height: 630 },
        platform: ['facebook', 'twitter', 'instagram'],
        customizable: true,
      },
    ];
  }

  private createFriendInvitationPrompts(
    milestoneType: MilestoneType,
    couple: CoupleProfile,
  ): any[] {
    return [
      {
        promptId: `invite-${milestoneType}-${Date.now()}`,
        promptText: `Share this milestone with friends!`,
        suggestedMessage: `${couple.partnerA.firstName} & ${couple.partnerB.firstName} just achieved a major wedding planning milestone! 🎉`,
        incentive: 'Friends who join get exclusive vendor discounts!',
        callToAction: 'Invite Friends to Celebrate',
      },
    ];
  }

  private async generateVendorAppreciation(
    milestoneType: MilestoneType,
    context: WeddingContext,
  ): Promise<any[]> {
    if (
      milestoneType !== 'vendor_confirmed' ||
      !context.selectedVendors?.length
    ) {
      return [];
    }

    return context.selectedVendors.map((vendor) => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      appreciationMessage: `Thank you ${vendor.name} for being part of our dream team! 💕`,
      shareableContent: null,
      reviewPrompt: `Consider leaving a review for ${vendor.name} to help other couples!`,
    }));
  }

  private async triggerViralGrowthFeatures(
    milestone: MilestoneNotification,
    couple: CoupleProfile,
  ): Promise<void> {
    // This would trigger viral growth features like social sharing prompts
    console.log(
      `Triggering viral growth for milestone ${milestone.milestoneType} for couple ${couple.coupleId}`,
    );
  }
}

// Types that might be missing
interface NotificationPreference {
  couple_id: string;
  enabled: boolean;
  communication_style: string;
  notification_frequency: 'minimal' | 'normal' | 'frequent';
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  milestone_celebrations: boolean;
  vendor_updates: boolean;
  planning_reminders: boolean;
  viral_prompts: boolean;
  created_at: string;
  updated_at?: string;
}
