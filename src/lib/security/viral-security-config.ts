import { RateLimiter } from '@/lib/ratelimit';
import { logger } from '@/lib/monitoring/logger';
import { createHash } from 'crypto';

export interface ViralSecurityConfig {
  rateLimits: {
    invitations: {
      regular: { daily: number; hourly: number };
      superConnector: { daily: number; hourly: number };
      premium: { daily: number; hourly: number };
    };
    metrics: {
      analytics: { minute: number; hour: number };
      export: { daily: number; hour: number };
    };
  };
  fraudDetection: {
    maxInvitesPerEmail: number;
    maxInvitesPerDevice: number;
    suspiciousPatterns: string[];
  };
  privacy: {
    anonymizeAfterDays: number;
    aggregateThreshold: number;
    maxNetworkDepth: number;
  };
}

export const VIRAL_SECURITY_CONFIG: ViralSecurityConfig = {
  rateLimits: {
    invitations: {
      regular: { daily: 50, hourly: 10 },
      superConnector: { daily: 200, hourly: 30 },
      premium: { daily: 100, hourly: 20 },
    },
    metrics: {
      analytics: { minute: 60, hour: 500 },
      export: { daily: 5, hour: 1 },
    },
  },
  fraudDetection: {
    maxInvitesPerEmail: 3,
    maxInvitesPerDevice: 100,
    suspiciousPatterns: [
      'bulk_same_domain',
      'rapid_succession',
      'fake_emails',
      'disposable_emails',
      'bot_patterns',
    ],
  },
  privacy: {
    anonymizeAfterDays: 365,
    aggregateThreshold: 5,
    maxNetworkDepth: 3,
  },
};

export class ViralSecurityManager {
  private static rateLimiters = new Map<string, RateLimiter>();
  private static fraudPatterns = new Map<string, RegExp>();

  static {
    // Initialize fraud detection patterns
    this.fraudPatterns.set(
      'disposable_emails',
      /^.+@(10minutemail|tempmail|guerrillamail|mailinator)\./i,
    );
    this.fraudPatterns.set('bot_patterns', /^(test|bot|spam|fake)\d*@/i);
    this.fraudPatterns.set('sequential_numbers', /^user\d{3,}@/i);
  }

  /**
   * Check rate limits for viral actions
   */
  static async checkRateLimit(
    userId: string,
    userTier: 'regular' | 'superConnector' | 'premium',
    action: 'invitation' | 'analytics' | 'export',
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `viral:${action}:${userId}`;

    // Get appropriate limits based on tier and action
    const limits = this.getRateLimits(userTier, action);
    if (!limits) {
      return { allowed: true };
    }

    // Check hourly limit
    const hourlyKey = `${key}:hourly`;
    const hourlyLimiter = this.getRateLimiter(hourlyKey, limits.hourly, 3600);
    const hourlyResult = await hourlyLimiter.check();

    if (!hourlyResult.success) {
      logger.warn('Viral rate limit exceeded (hourly)', {
        userId,
        action,
        tier: userTier,
        limit: limits.hourly,
      });
      return {
        allowed: false,
        retryAfter: hourlyResult.reset
          ? hourlyResult.reset - Date.now()
          : 3600000,
      };
    }

    // Check daily limit if applicable
    if ('daily' in limits) {
      const dailyKey = `${key}:daily`;
      const dailyLimiter = this.getRateLimiter(dailyKey, limits.daily, 86400);
      const dailyResult = await dailyLimiter.check();

      if (!dailyResult.success) {
        logger.warn('Viral rate limit exceeded (daily)', {
          userId,
          action,
          tier: userTier,
          limit: limits.daily,
        });
        return {
          allowed: false,
          retryAfter: dailyResult.reset
            ? dailyResult.reset - Date.now()
            : 86400000,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Detect potential fraud in viral invitations
   */
  static async detectInvitationFraud(
    userId: string,
    recipients: Array<{ email?: string; phone?: string }>,
    deviceFingerprint?: string,
  ): Promise<{
    isValid: boolean;
    reason?: string;
    suspiciousRecipients?: string[];
  }> {
    const suspiciousRecipients: string[] = [];

    // Check for suspicious email patterns
    for (const recipient of recipients) {
      if (recipient.email) {
        for (const [patternName, pattern] of this.fraudPatterns) {
          if (pattern.test(recipient.email)) {
            suspiciousRecipients.push(recipient.email);
            logger.warn('Suspicious email pattern detected', {
              userId,
              email: recipient.email,
              pattern: patternName,
            });
          }
        }
      }
    }

    // Check for bulk same domain invitations
    const domains = recipients
      .filter((r) => r.email)
      .map((r) => r.email!.split('@')[1]);

    const domainCounts = domains.reduce(
      (acc, domain) => {
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const suspiciousDomains = Object.entries(domainCounts)
      .filter(([_, count]) => count > 10)
      .map(([domain]) => domain);

    if (suspiciousDomains.length > 0) {
      logger.warn('Bulk same domain invitations detected', {
        userId,
        domains: suspiciousDomains,
        counts: domainCounts,
      });
      return {
        isValid: false,
        reason: 'Too many invitations to the same domain',
        suspiciousRecipients,
      };
    }

    // Check device fingerprint limits
    if (deviceFingerprint) {
      const deviceKey = `viral:device:${deviceFingerprint}`;
      const deviceLimiter = this.getRateLimiter(
        deviceKey,
        VIRAL_SECURITY_CONFIG.fraudDetection.maxInvitesPerDevice,
        86400,
      );

      const deviceResult = await deviceLimiter.check();
      if (!deviceResult.success) {
        logger.warn('Device invitation limit exceeded', {
          userId,
          deviceFingerprint,
          limit: VIRAL_SECURITY_CONFIG.fraudDetection.maxInvitesPerDevice,
        });
        return {
          isValid: false,
          reason: 'Device invitation limit exceeded',
        };
      }
    }

    // Check for rapid succession invitations (bot behavior)
    const rapidKey = `viral:rapid:${userId}`;
    const rapidLimiter = this.getRateLimiter(rapidKey, 5, 60); // 5 per minute
    const rapidResult = await rapidLimiter.check();

    if (!rapidResult.success) {
      logger.warn('Rapid invitation pattern detected', {
        userId,
        recipientCount: recipients.length,
      });
      return {
        isValid: false,
        reason: 'Invitations sent too quickly, please slow down',
      };
    }

    return {
      isValid: suspiciousRecipients.length === 0,
      suspiciousRecipients:
        suspiciousRecipients.length > 0 ? suspiciousRecipients : undefined,
    };
  }

  /**
   * Validate reward eligibility to prevent gaming
   */
  static async validateRewardEligibility(
    userId: string,
    referredUserId: string,
    rewardType: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check for self-referral
    if (userId === referredUserId) {
      logger.warn('Self-referral attempt detected', { userId });
      return {
        eligible: false,
        reason: 'Self-referrals are not eligible for rewards',
      };
    }

    // Check for circular referrals
    const circularKey = `viral:circular:${userId}:${referredUserId}`;
    const reverseKey = `viral:circular:${referredUserId}:${userId}`;

    // Use Redis or database to check if reverse referral exists
    // This is a simplified check - in production, use proper graph traversal
    const hasCircular = await this.checkCircularReferral(
      userId,
      referredUserId,
    );

    if (hasCircular) {
      logger.warn('Circular referral detected', {
        userId,
        referredUserId,
      });
      return {
        eligible: false,
        reason: 'Circular referrals are not eligible for rewards',
      };
    }

    // Check reward claim frequency
    const rewardKey = `viral:reward:${userId}:${rewardType}`;
    const rewardLimiter = this.getRateLimiter(rewardKey, 10, 2592000); // 10 per month
    const rewardResult = await rewardLimiter.check();

    if (!rewardResult.success) {
      logger.warn('Reward claim limit exceeded', {
        userId,
        rewardType,
      });
      return {
        eligible: false,
        reason: 'Monthly reward limit reached',
      };
    }

    return { eligible: true };
  }

  /**
   * Anonymize viral data for privacy compliance
   */
  static anonymizeViralData(data: any, depth: number = 0): any {
    if (depth > VIRAL_SECURITY_CONFIG.privacy.maxNetworkDepth) {
      return { message: 'Network depth limit reached' };
    }

    // Remove PII from viral chains
    const anonymized = { ...data };

    if (anonymized.email) {
      anonymized.email = this.hashEmail(anonymized.email);
    }

    if (anonymized.name) {
      anonymized.name = 'Anonymous User';
    }

    if (anonymized.phone) {
      anonymized.phone = this.hashPhone(anonymized.phone);
    }

    if (anonymized.referrals && Array.isArray(anonymized.referrals)) {
      anonymized.referrals = anonymized.referrals.map((ref: any) =>
        this.anonymizeViralData(ref, depth + 1),
      );
    }

    return anonymized;
  }

  /**
   * Validate network depth for privacy
   */
  static validateNetworkDepth(chainDepth: number): boolean {
    return chainDepth <= VIRAL_SECURITY_CONFIG.privacy.maxNetworkDepth;
  }

  /**
   * Get rate limits based on user tier and action
   */
  private static getRateLimits(
    tier: string,
    action: string,
  ): { hourly: number; daily?: number; minute?: number } | null {
    const config = VIRAL_SECURITY_CONFIG.rateLimits;

    if (action === 'invitation') {
      const inviteLimits =
        config.invitations[tier as keyof typeof config.invitations];
      return inviteLimits || config.invitations.regular;
    }

    if (action === 'analytics' || action === 'export') {
      return config.metrics[action as keyof typeof config.metrics];
    }

    return null;
  }

  /**
   * Get or create rate limiter instance
   */
  private static getRateLimiter(
    key: string,
    limit: number,
    window: number,
  ): RateLimiter {
    const limiterKey = `${key}:${limit}:${window}`;

    if (!this.rateLimiters.has(limiterKey)) {
      this.rateLimiters.set(
        limiterKey,
        new RateLimiter({
          key,
          limit,
          window,
        }),
      );
    }

    return this.rateLimiters.get(limiterKey)!;
  }

  /**
   * Check for circular referral patterns
   */
  private static async checkCircularReferral(
    userId: string,
    referredUserId: string,
  ): Promise<boolean> {
    // In production, implement proper graph traversal
    // This is a simplified check for demonstration
    try {
      const response = await fetch('/api/viral/check-circular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, referredUserId }),
      });

      const result = await response.json();
      return result.hasCircular;
    } catch (error) {
      logger.error('Failed to check circular referral', { error });
      return false;
    }
  }

  /**
   * Hash email for privacy
   */
  private static hashEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const hashedLocal = createHash('sha256')
      .update(localPart)
      .digest('hex')
      .substring(0, 8);
    return `${hashedLocal}@${domain}`;
  }

  /**
   * Hash phone number for privacy
   */
  private static hashPhone(phone: string): string {
    const lastFour = phone.slice(-4);
    return `****${lastFour}`;
  }
}
