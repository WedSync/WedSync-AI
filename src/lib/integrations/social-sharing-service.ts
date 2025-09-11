/**
 * Social Media Sharing Integration Service
 * Handles sharing of portfolio images across various social platforms
 */

import { supabase } from '@/lib/supabase/client';

export interface ShareableContent {
  imageId: string;
  imageUrl: string;
  title: string;
  description: string;
  supplierName: string;
  category: string;
  venue?: {
    name: string;
    location: string;
  };
  tags: string[];
  metadata?: {
    capturedAt: string;
    equipment?: string;
  };
}

export interface ShareResult {
  success: boolean;
  platform: string;
  shareId?: string;
  shareUrl?: string;
  error?: string;
  analytics: {
    timestamp: string;
    userId: string;
    eventId: string;
  };
}

export interface SocialPlatformConfig {
  platform:
    | 'facebook'
    | 'instagram'
    | 'twitter'
    | 'pinterest'
    | 'whatsapp'
    | 'email'
    | 'sms';
  enabled: boolean;
  apiKey?: string;
  redirectUri?: string;
  permissions: string[];
}

export interface ShareAnalytics {
  imageId: string;
  platform: string;
  shareCount: number;
  engagementMetrics: {
    clicks: number;
    likes: number;
    comments: number;
    saves: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
  };
  lastUpdated: string;
}

class SocialSharingService {
  private platformConfigs: Map<string, SocialPlatformConfig> = new Map();
  private shareCache: Map<string, ShareResult> = new Map();

  constructor() {
    this.initializePlatformConfigs();
  }

  /**
   * Initialize social platform configurations
   */
  private initializePlatformConfigs(): void {
    const configs: SocialPlatformConfig[] = [
      {
        platform: 'facebook',
        enabled: true,
        permissions: ['publish_to_groups', 'user_posts'],
      },
      {
        platform: 'instagram',
        enabled: true,
        permissions: ['user_profile', 'user_media'],
      },
      {
        platform: 'twitter',
        enabled: true,
        permissions: ['tweet.write', 'users.read'],
      },
      {
        platform: 'pinterest',
        enabled: true,
        permissions: ['boards:read', 'pins:write'],
      },
      {
        platform: 'whatsapp',
        enabled: true,
        permissions: [],
      },
      {
        platform: 'email',
        enabled: true,
        permissions: [],
      },
      {
        platform: 'sms',
        enabled: true,
        permissions: [],
      },
    ];

    configs.forEach((config) => {
      this.platformConfigs.set(config.platform, config);
    });
  }

  /**
   * Share content to specified platform
   */
  async shareContent(
    content: ShareableContent,
    platform: string,
    userId: string,
    eventId: string,
    customMessage?: string,
  ): Promise<ShareResult> {
    const platformConfig = this.platformConfigs.get(platform);

    if (!platformConfig?.enabled) {
      return {
        success: false,
        platform,
        error: `Platform ${platform} is not enabled or supported`,
        analytics: {
          timestamp: new Date().toISOString(),
          userId,
          eventId,
        },
      };
    }

    try {
      let result: ShareResult;

      switch (platform) {
        case 'facebook':
          result = await this.shareToFacebook(content, userId, customMessage);
          break;
        case 'instagram':
          result = await this.shareToInstagram(content, userId, customMessage);
          break;
        case 'twitter':
          result = await this.shareToTwitter(content, userId, customMessage);
          break;
        case 'pinterest':
          result = await this.shareToPinterest(content, userId, customMessage);
          break;
        case 'whatsapp':
          result = await this.shareToWhatsApp(content, customMessage);
          break;
        case 'email':
          result = await this.shareViaEmail(content, customMessage);
          break;
        case 'sms':
          result = await this.shareViaSMS(content, customMessage);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Track analytics
      await this.trackShareAnalytics(result, userId, eventId);

      // Cache successful shares
      if (result.success) {
        const cacheKey = `${content.imageId}_${platform}_${userId}`;
        this.shareCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      const errorResult: ShareResult = {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Unknown sharing error',
        analytics: {
          timestamp: new Date().toISOString(),
          userId,
          eventId,
        },
      };

      await this.trackShareAnalytics(errorResult, userId, eventId);
      return errorResult;
    }
  }

  /**
   * Share to Facebook
   */
  private async shareToFacebook(
    content: ShareableContent,
    userId: string,
    customMessage?: string,
  ): Promise<ShareResult> {
    const message =
      customMessage || this.generateDefaultMessage(content, 'facebook');

    // For mobile web, use Facebook's share dialog
    if (typeof window !== 'undefined') {
      const shareUrl = new URL('https://www.facebook.com/sharer/sharer.php');
      shareUrl.searchParams.set('u', content.imageUrl);
      shareUrl.searchParams.set('quote', message);
      shareUrl.searchParams.set('hashtag', `#${content.category}wedding`);

      // Open share dialog
      const popup = window.open(
        shareUrl.toString(),
        'facebook-share',
        'width=600,height=400,scrollbars=no,resizable=no',
      );

      // Monitor for popup closure (approximation of share completion)
      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            resolve({
              success: true,
              platform: 'facebook',
              shareUrl: shareUrl.toString(),
              analytics: {
                timestamp: new Date().toISOString(),
                userId,
                eventId: content.imageId,
              },
            });
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          popup?.close();
          resolve({
            success: false,
            platform: 'facebook',
            error: 'Share dialog timeout',
            analytics: {
              timestamp: new Date().toISOString(),
              userId,
              eventId: content.imageId,
            },
          });
        }, 300000);
      });
    }

    throw new Error('Facebook sharing requires browser environment');
  }

  /**
   * Share to Instagram (Stories)
   */
  private async shareToInstagram(
    content: ShareableContent,
    userId: string,
    customMessage?: string,
  ): Promise<ShareResult> {
    // Instagram sharing typically requires their SDK or deep linking
    if (
      typeof window !== 'undefined' &&
      navigator.userAgent.includes('Mobile')
    ) {
      // Try Instagram app deep link first
      const instagramUrl = `instagram://library?AssetPath=${encodeURIComponent(content.imageUrl)}`;

      try {
        window.location.href = instagramUrl;

        return {
          success: true,
          platform: 'instagram',
          shareUrl: instagramUrl,
          analytics: {
            timestamp: new Date().toISOString(),
            userId,
            eventId: content.imageId,
          },
        };
      } catch (error) {
        // Fallback to web Instagram
        const webUrl = 'https://www.instagram.com/';
        window.open(webUrl, '_blank');

        return {
          success: true,
          platform: 'instagram',
          shareUrl: webUrl,
          analytics: {
            timestamp: new Date().toISOString(),
            userId,
            eventId: content.imageId,
          },
        };
      }
    }

    throw new Error('Instagram sharing requires mobile environment');
  }

  /**
   * Share to Twitter/X
   */
  private async shareToTwitter(
    content: ShareableContent,
    userId: string,
    customMessage?: string,
  ): Promise<ShareResult> {
    const message =
      customMessage || this.generateDefaultMessage(content, 'twitter');
    const hashtags = [
      'wedding',
      content.category,
      content.supplierName.replace(/\s+/g, ''),
    ]
      .filter(Boolean)
      .join(',');

    if (typeof window !== 'undefined') {
      const tweetUrl = new URL('https://twitter.com/intent/tweet');
      tweetUrl.searchParams.set('text', message);
      tweetUrl.searchParams.set('url', content.imageUrl);
      tweetUrl.searchParams.set('hashtags', hashtags);

      const popup = window.open(
        tweetUrl.toString(),
        'twitter-share',
        'width=600,height=400,scrollbars=no,resizable=no',
      );

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            resolve({
              success: true,
              platform: 'twitter',
              shareUrl: tweetUrl.toString(),
              analytics: {
                timestamp: new Date().toISOString(),
                userId,
                eventId: content.imageId,
              },
            });
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkClosed);
          popup?.close();
          resolve({
            success: false,
            platform: 'twitter',
            error: 'Share dialog timeout',
            analytics: {
              timestamp: new Date().toISOString(),
              userId,
              eventId: content.imageId,
            },
          });
        }, 300000);
      });
    }

    throw new Error('Twitter sharing requires browser environment');
  }

  /**
   * Share to Pinterest
   */
  private async shareToPinterest(
    content: ShareableContent,
    userId: string,
    customMessage?: string,
  ): Promise<ShareResult> {
    const description =
      customMessage || this.generateDefaultMessage(content, 'pinterest');

    if (typeof window !== 'undefined') {
      const pinUrl = new URL('https://www.pinterest.com/pin/create/button/');
      pinUrl.searchParams.set('url', window.location.href);
      pinUrl.searchParams.set('media', content.imageUrl);
      pinUrl.searchParams.set('description', description);

      const popup = window.open(
        pinUrl.toString(),
        'pinterest-share',
        'width=600,height=400,scrollbars=no,resizable=no',
      );

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            resolve({
              success: true,
              platform: 'pinterest',
              shareUrl: pinUrl.toString(),
              analytics: {
                timestamp: new Date().toISOString(),
                userId,
                eventId: content.imageId,
              },
            });
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkClosed);
          popup?.close();
          resolve({
            success: false,
            platform: 'pinterest',
            error: 'Share dialog timeout',
            analytics: {
              timestamp: new Date().toISOString(),
              userId,
              eventId: content.imageId,
            },
          });
        }, 300000);
      });
    }

    throw new Error('Pinterest sharing requires browser environment');
  }

  /**
   * Share to WhatsApp
   */
  private async shareToWhatsApp(
    content: ShareableContent,
    customMessage?: string,
  ): Promise<ShareResult> {
    const message =
      customMessage || this.generateDefaultMessage(content, 'whatsapp');
    const fullMessage = `${message}\n\n${content.imageUrl}`;

    if (typeof window !== 'undefined') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;

      window.open(whatsappUrl, '_blank');

      return {
        success: true,
        platform: 'whatsapp',
        shareUrl: whatsappUrl,
        analytics: {
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          eventId: content.imageId,
        },
      };
    }

    throw new Error('WhatsApp sharing requires browser environment');
  }

  /**
   * Share via Email
   */
  private async shareViaEmail(
    content: ShareableContent,
    customMessage?: string,
  ): Promise<ShareResult> {
    const subject = `Beautiful ${content.category} from ${content.supplierName}`;
    const body = customMessage || this.generateEmailMessage(content);

    if (typeof window !== 'undefined') {
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoUrl;

      return {
        success: true,
        platform: 'email',
        shareUrl: mailtoUrl,
        analytics: {
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          eventId: content.imageId,
        },
      };
    }

    throw new Error('Email sharing requires browser environment');
  }

  /**
   * Share via SMS
   */
  private async shareViaSMS(
    content: ShareableContent,
    customMessage?: string,
  ): Promise<ShareResult> {
    const message =
      customMessage || this.generateDefaultMessage(content, 'sms');
    const fullMessage = `${message}\n\n${content.imageUrl}`;

    if (typeof window !== 'undefined') {
      const smsUrl = `sms:?body=${encodeURIComponent(fullMessage)}`;

      window.location.href = smsUrl;

      return {
        success: true,
        platform: 'sms',
        shareUrl: smsUrl,
        analytics: {
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          eventId: content.imageId,
        },
      };
    }

    throw new Error('SMS sharing requires browser environment');
  }

  /**
   * Generate platform-specific default messages
   */
  private generateDefaultMessage(
    content: ShareableContent,
    platform: string,
  ): string {
    const baseMessage = `Check out this stunning ${content.category.toLowerCase()} by ${content.supplierName}!`;

    switch (platform) {
      case 'facebook':
        return `${baseMessage}\n\n${content.venue ? `📍 ${content.venue.name}` : ''}\n#WeddingInspiration #${content.category}`;

      case 'twitter':
        return `${baseMessage} ${content.venue ? `📍 ${content.venue.name}` : ''}`;

      case 'pinterest':
        return `${content.title || baseMessage}\n\n${content.description || `Beautiful ${content.category.toLowerCase()} inspiration for your special day.`}${content.venue ? `\n\nVenue: ${content.venue.name}` : ''}`;

      case 'whatsapp':
      case 'sms':
        return `${baseMessage}${content.venue ? ` at ${content.venue.name}` : ''}`;

      default:
        return baseMessage;
    }
  }

  /**
   * Generate email message
   */
  private generateEmailMessage(content: ShareableContent): string {
    return `Hi!

I wanted to share this beautiful ${content.category.toLowerCase()} photo with you. It's from ${content.supplierName}${content.venue ? ` at ${content.venue.name}` : ''}.

${content.imageUrl}

${content.description || 'I thought you might love this for wedding inspiration!'}

Best regards`;
  }

  /**
   * Track sharing analytics
   */
  private async trackShareAnalytics(
    result: ShareResult,
    userId: string,
    eventId: string,
  ): Promise<void> {
    try {
      await supabase.from('portfolio_share_analytics').insert({
        image_id: result.analytics.eventId,
        user_id: userId,
        event_id: eventId,
        platform: result.platform,
        success: result.success,
        share_url: result.shareUrl,
        error_message: result.error,
        timestamp: result.analytics.timestamp,
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent : null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
      });
    } catch (error) {
      console.error('Failed to track share analytics:', error);
    }
  }

  /**
   * Get sharing analytics for image
   */
  async getShareAnalytics(imageId: string): Promise<ShareAnalytics | null> {
    try {
      const { data, error } = await supabase
        .from('portfolio_share_analytics')
        .select('platform, success, timestamp')
        .eq('image_id', imageId)
        .eq('success', true);

      if (error || !data) return null;

      const platformCounts = data.reduce(
        (acc, share) => {
          acc[share.platform] = (acc[share.platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        imageId,
        platform: 'all',
        shareCount: data.length,
        engagementMetrics: {
          clicks: data.length, // Approximate
          likes: 0, // Would need platform APIs
          comments: 0, // Would need platform APIs
          saves: 0, // Would need platform APIs
        },
        demographics: {
          ageGroups: {}, // Would need platform APIs
          locations: {}, // Would need platform APIs
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get share analytics:', error);
      return null;
    }
  }

  /**
   * Get available sharing platforms
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.platformConfigs.keys()).filter(
      (platform) => this.platformConfigs.get(platform)?.enabled,
    );
  }

  /**
   * Check if platform is available
   */
  isPlatformAvailable(platform: string): boolean {
    const config = this.platformConfigs.get(platform);
    return config?.enabled || false;
  }

  /**
   * Generate shareable link for image
   */
  async generateShareableLink(
    imageId: string,
    userId: string,
    eventId: string,
    expiryHours: number = 24,
  ): Promise<string> {
    const shareToken = `${imageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);

    // Store shareable link in database
    await supabase.from('shareable_portfolio_links').insert({
      token: shareToken,
      image_id: imageId,
      user_id: userId,
      event_id: eventId,
      expires_at: expiryDate.toISOString(),
      created_at: new Date().toISOString(),
    });

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://wedsync.com';
    return `${baseUrl}/shared/portfolio/${shareToken}`;
  }

  /**
   * Clean up expired share links
   */
  async cleanupExpiredLinks(): Promise<void> {
    await supabase
      .from('shareable_portfolio_links')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}

// Singleton instance
export const socialSharingService = new SocialSharingService();

// Export types
export type {
  ShareableContent,
  ShareResult,
  SocialPlatformConfig,
  ShareAnalytics,
};
