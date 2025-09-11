'use client';

/**
 * WedMe Platform Rate Limiting Service
 * Handles couple-specific rate limits with wedding context awareness
 */

import { wedMeIntegration } from '@/lib/integrations/WedMeIntegration';
import { mobileRateLimiter } from './mobile-rate-limiter';

interface WedMeRateLimits {
  // Wedding coordination activities
  taskCoordination: RateLimitConfig;
  vendorMessages: RateLimitConfig;
  guestUpdates: RateLimitConfig;

  // Content and media
  photoViewing: RateLimitConfig;
  photoUploads: RateLimitConfig;

  // Social features
  socialSharing: RateLimitConfig;
  inviteGeneration: RateLimitConfig;

  // Meta information
  weddingDate: Date | null;
  isNearWeddingDay: boolean;
  coupleSubscriptionTier: 'free' | 'premium';
  proximityMultiplier: number;
}

interface RateLimitConfig {
  minute: number;
  hour: number;
  day: number;
  description: string;
}

interface WedMeRateLimitResponse {
  blocked: boolean;
  message?: string;
  retryAfter?: number;
  alternativeActions?: AlternativeAction[];
  upgradeRecommendation?: UpgradeRecommendation;
}

interface AlternativeAction {
  action: string;
  description: string;
  available: boolean;
}

interface UpgradeRecommendation {
  tier: 'premium';
  benefits: string[];
  pricing: {
    monthly: number;
    yearly: number;
  };
  urgency: 'low' | 'medium' | 'high';
}

interface WedMeUser {
  coupleId: string;
  weddingDate: Date | null;
  subscriptionTier: 'free' | 'premium';
  registrationDate: Date;
  lastActivity: Date;
}

export class WedMeRateLimitIntegration {
  private static instance: WedMeRateLimitIntegration;
  private userCache: Map<string, WedMeUser> = new Map();
  private rateLimitCache: Map<string, WedMeRateLimits> = new Map();

  private constructor() {
    this.setupWedMeIntegration();
  }

  static getInstance(): WedMeRateLimitIntegration {
    if (!WedMeRateLimitIntegration.instance) {
      WedMeRateLimitIntegration.instance = new WedMeRateLimitIntegration();
    }
    return WedMeRateLimitIntegration.instance;
  }

  /**
   * Get comprehensive rate limits for a WedMe couple
   */
  async getWedMeRateLimits(coupleId: string): Promise<WedMeRateLimits> {
    // Check cache first
    const cached = this.rateLimitCache.get(coupleId);
    if (cached && this.isCacheValid(coupleId)) {
      return cached;
    }

    try {
      const user = await this.getCoupleData(coupleId);
      const rateLimits = this.calculateWedMeRateLimits(user);

      // Cache for 5 minutes
      this.rateLimitCache.set(coupleId, rateLimits);
      setTimeout(() => this.rateLimitCache.delete(coupleId), 5 * 60 * 1000);

      return rateLimits;
    } catch (error) {
      console.error('Failed to get WedMe rate limits:', error);
      return this.getDefaultRateLimits();
    }
  }

  /**
   * Handle rate limit violations with WedMe-specific messaging
   */
  async handleWedMeRateLimit(
    action: string,
    coupleId: string,
    rateLimitResult: any,
  ): Promise<WedMeRateLimitResponse> {
    if (rateLimitResult.allowed) {
      return { blocked: false };
    }

    const user = await this.getCoupleData(coupleId);
    const weddingContextMessage = this.getWeddingContextMessage(
      action,
      rateLimitResult,
      user,
    );
    const alternativeActions = this.suggestAlternativeActions(action, user);
    const upgradeRecommendation = this.getWedMeUpgradeRecommendation(
      action,
      user,
    );

    return {
      blocked: true,
      message: weddingContextMessage,
      retryAfter: rateLimitResult.retryAfter,
      alternativeActions,
      upgradeRecommendation,
    };
  }

  /**
   * Check if specific action is allowed for couple
   */
  async checkWedMeAction(
    coupleId: string,
    action: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<boolean> {
    try {
      const user = await this.getCoupleData(coupleId);

      // Wedding day gets critical priority
      if (this.isWeddingDay(user.weddingDate)) {
        priority = 'critical';
      }

      const rateLimitRequest = {
        endpoint: this.mapActionToEndpoint(action),
        userId: coupleId,
        weddingDate: user.weddingDate || undefined,
        priority,
        timestamp: Date.now(),
      };

      const result = await mobileRateLimiter.checkRateLimit(rateLimitRequest);

      // Log usage for analytics
      this.logWedMeUsage(coupleId, action, result.allowed);

      return result.allowed;
    } catch (error) {
      console.error('WedMe action check failed:', error);

      // Graceful degradation - allow basic actions for couples
      return this.isBasicAction(action);
    }
  }

  /**
   * Generate deep link for WedMe with rate limit context
   */
  generateWedMeDeepLink(
    coupleId: string,
    action: string,
    rateLimitContext?: any,
  ): string {
    const baseParams = {
      source: 'wedsync',
      couple_id: coupleId,
      action: action,
    };

    if (rateLimitContext?.blocked) {
      baseParams['rate_limited'] = 'true';
      baseParams['upgrade_suggested'] = rateLimitContext.upgradeRecommendation
        ? 'true'
        : 'false';
    }

    return wedMeIntegration.generateDeepLink(action, baseParams);
  }

  /**
   * Sync rate limit status with WedMe app
   */
  async syncRateLimitStatusWithWedMe(coupleId: string): Promise<void> {
    try {
      const rateLimits = await this.getWedMeRateLimits(coupleId);
      const syncData = {
        coupleId,
        rateLimits: this.serializeRateLimits(rateLimits),
        timestamp: Date.now(),
        wedmeSpecific: true,
      };

      await wedMeIntegration.syncWithWedMe(coupleId, syncData);
    } catch (error) {
      console.error('Failed to sync rate limits with WedMe:', error);
    }
  }

  /**
   * Calculate couple-specific rate limits
   */
  private calculateWedMeRateLimits(user: WedMeUser): WedMeRateLimits {
    const isNearWedding = this.isNearWeddingDay(user.weddingDate);
    const proximityMultiplier = this.calculateProximityMultiplier(
      user.weddingDate,
    );
    const tierMultiplier = user.subscriptionTier === 'premium' ? 3.0 : 1.0;

    const baseMultiplier = proximityMultiplier * tierMultiplier;

    return {
      // High-priority wedding coordination
      taskCoordination: {
        minute: Math.floor(15 * baseMultiplier),
        hour: Math.floor(200 * baseMultiplier),
        day: Math.floor(1000 * baseMultiplier),
        description: 'Wedding task updates and coordination',
      },

      // Critical vendor communication
      vendorMessages: {
        minute: Math.floor(10 * baseMultiplier),
        hour: Math.floor(120 * baseMultiplier),
        day: Math.floor(600 * baseMultiplier),
        description: 'Messages to wedding vendors',
      },

      // Guest management
      guestUpdates: {
        minute: Math.floor(8 * baseMultiplier),
        hour: Math.floor(100 * baseMultiplier),
        day: Math.floor(500 * baseMultiplier),
        description: 'Guest list and seating updates',
      },

      // Photo viewing (generous limits)
      photoViewing: {
        minute: Math.floor(50 * tierMultiplier),
        hour: Math.floor(500 * tierMultiplier),
        day: Math.floor(2000 * tierMultiplier),
        description: 'Viewing wedding photos and galleries',
      },

      // Photo uploads (moderate limits)
      photoUploads: {
        minute: Math.floor(5 * tierMultiplier),
        hour: Math.floor(30 * tierMultiplier),
        day: Math.floor(100 * tierMultiplier),
        description: 'Uploading photos to wedding galleries',
      },

      // Social sharing
      socialSharing: {
        minute: Math.floor(20 * tierMultiplier),
        hour: Math.floor(100 * tierMultiplier),
        day: Math.floor(300 * tierMultiplier),
        description: 'Sharing wedding content on social media',
      },

      // Invitation generation (viral growth feature)
      inviteGeneration: {
        minute: Math.floor(10 * tierMultiplier),
        hour: Math.floor(50 * tierMultiplier),
        day: Math.floor(200 * tierMultiplier),
        description: 'Generating vendor invitations',
      },

      weddingDate: user.weddingDate,
      isNearWeddingDay: isNearWedding,
      coupleSubscriptionTier: user.subscriptionTier,
      proximityMultiplier,
    };
  }

  /**
   * Get wedding-context appropriate messaging
   */
  private getWeddingContextMessage(
    action: string,
    rateLimitResult: any,
    user: WedMeUser,
  ): string {
    const timeUntilReset = Math.ceil((rateLimitResult.retryAfter || 60) / 60);
    const isNearWedding = this.isNearWeddingDay(user.weddingDate);

    const messages: Record<string, { friendly: string; urgent?: string }> = {
      taskCoordination: {
        friendly: `You've been busy coordinating your wedding! Take a ${timeUntilReset}-minute break to review your progress.`,
        urgent: `Your wedding day is near! While we pause task updates for ${timeUntilReset} minutes, use this time to confirm details with your vendors.`,
      },
      vendorMessages: {
        friendly: `You've been actively coordinating with your vendors - fantastic! Give them ${timeUntilReset} minutes to respond.`,
        urgent: `Wedding day communication pause! Your vendors have ${timeUntilReset} minutes to respond to your recent messages.`,
      },
      guestUpdates: {
        friendly: `Guest list management is taking a breather for ${timeUntilReset} minutes. Perfect time to review your seating chart!`,
        urgent: `Final guest list adjustments paused for ${timeUntilReset} minutes. Great time to double-check your counts with the venue!`,
      },
      photoViewing: {
        friendly: `You've been enjoying your wedding photos! Take ${timeUntilReset} minutes to savor the memories you've already seen.`,
        urgent: `Photo viewing is paused for ${timeUntilReset} minutes. Time to share your favorites with family!`,
      },
      photoUploads: {
        friendly: `Photo uploads are taking a short ${timeUntilReset}-minute break. Your beautiful moments will be worth the wait!`,
        urgent: `Wedding photo uploads paused for ${timeUntilReset} minutes. Perfect time to organize the photos you want to share!`,
      },
      socialSharing: {
        friendly: `Social sharing is taking a ${timeUntilReset}-minute pause. Your friends are probably still loving your last post!`,
        urgent: `Wedding sharing break for ${timeUntilReset} minutes. Time to check all the comments and love you're receiving!`,
      },
    };

    const actionMessages = messages[action] || {
      friendly: `This wedding feature needs ${timeUntilReset} minutes to recharge. Perfect time for a coffee break!`,
    };

    return isNearWedding && actionMessages.urgent
      ? actionMessages.urgent
      : actionMessages.friendly;
  }

  /**
   * Suggest alternative actions when rate limited
   */
  private suggestAlternativeActions(
    action: string,
    user: WedMeUser,
  ): AlternativeAction[] {
    const alternatives: Record<string, AlternativeAction[]> = {
      taskCoordination: [
        {
          action: 'review_timeline',
          description: 'Review your wedding day timeline',
          available: true,
        },
        {
          action: 'check_vendor_status',
          description: 'Check vendor confirmation status',
          available: true,
        },
        {
          action: 'browse_inspiration',
          description: 'Browse wedding inspiration',
          available: true,
        },
      ],
      vendorMessages: [
        {
          action: 'review_contracts',
          description: 'Review vendor contracts and details',
          available: true,
        },
        {
          action: 'check_portfolio',
          description: 'Browse vendor portfolios',
          available: true,
        },
        {
          action: 'plan_questions',
          description: 'Prepare questions for vendors',
          available: true,
        },
      ],
      photoUploads: [
        {
          action: 'organize_photos',
          description: 'Organize photos on your device',
          available: true,
        },
        {
          action: 'create_albums',
          description: 'Create photo albums',
          available: user.subscriptionTier === 'premium',
        },
        {
          action: 'browse_gallery',
          description: 'Browse existing photo galleries',
          available: true,
        },
      ],
    };

    return (
      alternatives[action] || [
        {
          action: 'browse_wedding_tips',
          description: 'Browse wedding planning tips',
          available: true,
        },
        {
          action: 'check_inspiration',
          description: 'Check wedding inspiration',
          available: true,
        },
      ]
    );
  }

  /**
   * Generate upgrade recommendations
   */
  private getWedMeUpgradeRecommendation(
    action: string,
    user: WedMeUser,
  ): UpgradeRecommendation | undefined {
    if (user.subscriptionTier === 'premium') return undefined;

    const isNearWedding = this.isNearWeddingDay(user.weddingDate);
    const urgency = isNearWedding ? 'high' : 'medium';

    return {
      tier: 'premium',
      benefits: [
        'Unlimited wedding coordination',
        'Priority vendor communication',
        'Unlimited photo uploads',
        'Advanced wedding planning tools',
        'Premium customer support',
      ],
      pricing: {
        monthly: 9.99,
        yearly: 99.99,
      },
      urgency,
    };
  }

  /**
   * Wedding date calculation utilities
   */
  private isNearWeddingDay(weddingDate: Date | null): boolean {
    if (!weddingDate) return false;

    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilWedding <= 30 && daysUntilWedding >= 0;
  }

  private isWeddingDay(weddingDate: Date | null): boolean {
    if (!weddingDate) return false;

    const today = new Date();
    return weddingDate.toDateString() === today.toDateString();
  }

  private calculateProximityMultiplier(weddingDate: Date | null): number {
    if (!weddingDate) return 1.0;

    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding <= 1) return 3.0; // Wedding day/day before
    if (daysUntilWedding <= 7) return 2.5; // Week before
    if (daysUntilWedding <= 30) return 2.0; // Month before
    if (daysUntilWedding <= 90) return 1.5; // 3 months before

    return 1.0; // More than 3 months
  }

  /**
   * Utility methods
   */
  private async getCoupleData(coupleId: string): Promise<WedMeUser> {
    // Check cache
    const cached = this.userCache.get(coupleId);
    if (cached) return cached;

    try {
      // In production, this would fetch from Supabase
      const mockUser: WedMeUser = {
        coupleId,
        weddingDate: new Date('2025-06-15'), // Mock wedding date
        subscriptionTier: 'free',
        registrationDate: new Date('2025-01-01'),
        lastActivity: new Date(),
      };

      this.userCache.set(coupleId, mockUser);
      setTimeout(() => this.userCache.delete(coupleId), 10 * 60 * 1000); // 10 min cache

      return mockUser;
    } catch (error) {
      console.error('Failed to get couple data:', error);
      throw error;
    }
  }

  private mapActionToEndpoint(action: string): string {
    const mapping: Record<string, string> = {
      taskCoordination: '/api/wedme/tasks',
      vendorMessages: '/api/wedme/messages',
      guestUpdates: '/api/wedme/guests',
      photoViewing: '/api/wedme/photos/view',
      photoUploads: '/api/wedme/photos/upload',
      socialSharing: '/api/wedme/social/share',
      inviteGeneration: '/api/wedme/invites',
    };

    return mapping[action] || `/api/wedme/${action}`;
  }

  private isBasicAction(action: string): boolean {
    const basicActions = [
      'photoViewing',
      'browse_inspiration',
      'check_timeline',
    ];
    return basicActions.includes(action);
  }

  private isCacheValid(coupleId: string): boolean {
    // Simple time-based cache validation
    return this.rateLimitCache.has(coupleId);
  }

  private getDefaultRateLimits(): WedMeRateLimits {
    return {
      taskCoordination: {
        minute: 10,
        hour: 100,
        day: 500,
        description: 'Basic task coordination',
      },
      vendorMessages: {
        minute: 5,
        hour: 50,
        day: 200,
        description: 'Basic vendor communication',
      },
      guestUpdates: {
        minute: 5,
        hour: 50,
        day: 200,
        description: 'Basic guest management',
      },
      photoViewing: {
        minute: 25,
        hour: 300,
        day: 1000,
        description: 'Photo viewing',
      },
      photoUploads: {
        minute: 2,
        hour: 10,
        day: 50,
        description: 'Basic photo uploads',
      },
      socialSharing: {
        minute: 5,
        hour: 30,
        day: 100,
        description: 'Basic social sharing',
      },
      inviteGeneration: {
        minute: 3,
        hour: 20,
        day: 50,
        description: 'Basic invitations',
      },
      weddingDate: null,
      isNearWeddingDay: false,
      coupleSubscriptionTier: 'free',
      proximityMultiplier: 1.0,
    };
  }

  private setupWedMeIntegration(): void {
    // Listen for WedMe events and sync rate limits
    wedMeIntegration.on('auth:success', () => {
      console.log('WedMe authenticated, syncing rate limits');
    });

    wedMeIntegration.on('sync:completed', (data: any) => {
      if (data.coupleId) {
        this.syncRateLimitStatusWithWedMe(data.coupleId);
      }
    });
  }

  private serializeRateLimits(rateLimits: WedMeRateLimits): any {
    return {
      ...rateLimits,
      weddingDate: rateLimits.weddingDate?.toISOString() || null,
    };
  }

  private logWedMeUsage(
    coupleId: string,
    action: string,
    allowed: boolean,
  ): void {
    // In production, send to analytics
    console.log(
      `WedMe Usage: ${coupleId} - ${action} - ${allowed ? 'allowed' : 'blocked'}`,
    );
  }
}

// Export singleton instance
export const wedMeRateLimits = WedMeRateLimitIntegration.getInstance();
