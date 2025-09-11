import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { z } from 'zod';

interface SecurityConfig {
  maxRecipientsPerCampaign: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  spamScoreThreshold: number;
  rateLimitWindowMs: number;
  blacklistCheckEnabled: boolean;
  contentFilteringEnabled: boolean;
}

interface ThreatDetectionResult {
  isSafe: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  recommendations: string[];
  spamScore: number;
}

/**
 * Security Guard for message communications
 * Implements spam prevention, rate limiting, content filtering, and threat detection
 */
export class MessageSecurityGuard {
  private static redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  private static config: SecurityConfig = {
    maxRecipientsPerCampaign: 10000,
    maxMessagesPerHour: 1000,
    maxMessagesPerDay: 5000,
    spamScoreThreshold: 5.0,
    rateLimitWindowMs: 3600000, // 1 hour
    blacklistCheckEnabled: true,
    contentFilteringEnabled: true,
  };

  // Spam keywords and patterns
  private static spamKeywords = [
    'viagra',
    'cialis',
    'pharmacy',
    'pills',
    'medication',
    'casino',
    'poker',
    'gambling',
    'lottery',
    'winner',
    'nigerian prince',
    'inheritance',
    'million dollars',
    'click here',
    'act now',
    'limited time',
    'urgent',
    'guaranteed',
    '100% free',
    'no obligation',
    'risk free',
    'weight loss',
    'lose weight fast',
    'diet pills',
    'work from home',
    'make money fast',
    'passive income',
    'adult',
    'xxx',
    'porn',
    'sex',
    'rolex',
    'replica',
    'luxury watches',
  ];

  // Malicious patterns
  private static maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gis, // Script tags
    /<iframe[^>]*>.*?<\/iframe>/gis, // Iframes
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /<embed[^>]*>/gi, // Embed tags
    /<object[^>]*>/gi, // Object tags
    /data:text\/html/gi, // Data URIs with HTML
    /<link[^>]*rel=["']?import["']?[^>]*>/gi, // HTML imports
  ];

  /**
   * Validate and secure message before sending
   */
  static async validateMessage(
    content: string,
    subject: string,
    recipientCount: number,
    organizationId: string,
    campaignId: string,
  ): Promise<ThreatDetectionResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    try {
      // 1. Check rate limits
      const rateLimitResult = await this.checkRateLimit(organizationId);
      if (!rateLimitResult.allowed) {
        issues.push(`Rate limit exceeded: ${rateLimitResult.reason}`);
        threatLevel = 'high';
      }

      // 2. Validate recipient count
      if (recipientCount > this.config.maxRecipientsPerCampaign) {
        issues.push(
          `Too many recipients: ${recipientCount} (max: ${this.config.maxRecipientsPerCampaign})`,
        );
        recommendations.push('Split into multiple smaller campaigns');
        threatLevel = 'medium';
      }

      // 3. Check for malicious content
      const maliciousCheck = this.detectMaliciousContent(content);
      if (!maliciousCheck.isSafe) {
        issues.push(...maliciousCheck.threats);
        threatLevel = 'critical';
      }

      // 4. Calculate spam score
      const spamScore = await this.calculateSpamScore(content, subject);
      if (spamScore > this.config.spamScoreThreshold) {
        issues.push(`High spam score: ${spamScore.toFixed(2)}`);
        recommendations.push('Review content for spam-like characteristics');
        threatLevel = threatLevel === 'critical' ? 'critical' : 'high';
      }

      // 5. Check blacklisted domains
      if (this.config.blacklistCheckEnabled) {
        const blacklistCheck = await this.checkBlacklistedDomains(content);
        if (blacklistCheck.found) {
          issues.push(
            `Blacklisted domains found: ${blacklistCheck.domains.join(', ')}`,
          );
          threatLevel = 'high';
        }
      }

      // 6. Validate HTML structure
      const htmlValidation = this.validateHTMLStructure(content);
      if (!htmlValidation.isValid) {
        issues.push(...htmlValidation.errors);
        recommendations.push('Fix HTML structure issues');
      }

      // 7. Check for phishing indicators
      const phishingCheck = this.detectPhishingIndicators(content, subject);
      if (phishingCheck.suspicious) {
        issues.push(...phishingCheck.indicators);
        threatLevel = threatLevel === 'none' ? 'medium' : threatLevel;
      }

      // 8. Validate links
      const linkValidation = await this.validateLinks(content);
      if (!linkValidation.allSafe) {
        issues.push(...linkValidation.unsafeLinks);
        recommendations.push('Review and fix unsafe links');
        threatLevel = threatLevel === 'none' ? 'medium' : threatLevel;
      }

      // Log security check
      await this.logSecurityCheck(organizationId, campaignId, {
        threatLevel,
        spamScore,
        issues,
        recipientCount,
      });

      return {
        isSafe: issues.length === 0,
        threatLevel,
        issues,
        recommendations,
        spamScore,
      };
    } catch (error) {
      console.error('Security validation error:', error);
      return {
        isSafe: false,
        threatLevel: 'high',
        issues: ['Security validation failed'],
        recommendations: ['Contact support for assistance'],
        spamScore: 10,
      };
    }
  }

  /**
   * Check rate limits for organization
   */
  private static async checkRateLimit(
    organizationId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const hourKey = `rate:hour:${organizationId}`;
    const dayKey = `rate:day:${organizationId}`;

    const [hourCount, dayCount] = await Promise.all([
      this.redis.get(hourKey),
      this.redis.get(dayKey),
    ]);

    const hourlyMessages = parseInt((hourCount as string) || '0');
    const dailyMessages = parseInt((dayCount as string) || '0');

    if (hourlyMessages >= this.config.maxMessagesPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${hourlyMessages}/${this.config.maxMessagesPerHour})`,
      };
    }

    if (dailyMessages >= this.config.maxMessagesPerDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${dailyMessages}/${this.config.maxMessagesPerDay})`,
      };
    }

    // Increment counters
    const multi = this.redis.multi();
    multi.incr(hourKey);
    multi.expire(hourKey, 3600); // 1 hour
    multi.incr(dayKey);
    multi.expire(dayKey, 86400); // 24 hours
    await multi.exec();

    return { allowed: true };
  }

  /**
   * Detect malicious content in message
   */
  private static detectMaliciousContent(content: string): {
    isSafe: boolean;
    threats: string[];
  } {
    const threats: string[] = [];

    // Check for malicious patterns
    this.maliciousPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        threats.push(`Malicious pattern detected: ${pattern.source}`);
      }
    });

    // Check for suspicious file attachments references
    const suspiciousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.scr',
      '.vbs',
      '.js',
    ];
    suspiciousExtensions.forEach((ext) => {
      if (content.includes(ext)) {
        threats.push(`Suspicious file extension reference: ${ext}`);
      }
    });

    // Check for encoded content that might hide malicious code
    if (
      content.includes('base64,') ||
      content.includes('eval(') ||
      content.includes('unescape(')
    ) {
      threats.push('Potentially encoded malicious content detected');
    }

    return {
      isSafe: threats.length === 0,
      threats,
    };
  }

  /**
   * Calculate spam score for content
   */
  private static async calculateSpamScore(
    content: string,
    subject: string,
  ): Promise<number> {
    let score = 0;
    const contentLower = content.toLowerCase();
    const subjectLower = subject.toLowerCase();

    // Check spam keywords
    this.spamKeywords.forEach((keyword) => {
      if (contentLower.includes(keyword)) score += 0.5;
      if (subjectLower.includes(keyword)) score += 1.0;
    });

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) score += 2.0;

    // Check for excessive punctuation
    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount > 5) score += 1.5;

    // Check for suspicious URLs
    const urlCount = (content.match(/https?:\/\//g) || []).length;
    if (urlCount > 10) score += 2.0;

    // Check for URL shorteners
    const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 't.co'];
    shorteners.forEach((shortener) => {
      if (content.includes(shortener)) score += 1.0;
    });

    // Check for hidden text (same color as background)
    if (
      content.includes('color: white') &&
      content.includes('background: white')
    ) {
      score += 3.0;
    }

    // Check for excessive use of 'free'
    const freeCount = (contentLower.match(/free/g) || []).length;
    if (freeCount > 3) score += freeCount * 0.5;

    // Check for money-related terms
    const moneyTerms = [
      '$',
      'dollar',
      'pounds',
      '€',
      'euro',
      'money',
      'cash',
      'payment',
    ];
    moneyTerms.forEach((term) => {
      if (contentLower.includes(term)) score += 0.3;
    });

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Check for blacklisted domains in content
   */
  private static async checkBlacklistedDomains(
    content: string,
  ): Promise<{ found: boolean; domains: string[] }> {
    const blacklistedDomains: string[] = [];

    // Get blacklist from cache or database
    const blacklist = await this.getBlacklist();

    // Extract all domains from content
    const domainPattern =
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;
    const matches = content.matchAll(domainPattern);

    for (const match of matches) {
      const domain = match[1].toLowerCase();
      if (blacklist.includes(domain)) {
        blacklistedDomains.push(domain);
      }
    }

    return {
      found: blacklistedDomains.length > 0,
      domains: blacklistedDomains,
    };
  }

  /**
   * Get domain blacklist
   */
  private static async getBlacklist(): Promise<string[]> {
    // Check cache first
    const cached = await this.redis.get('domain:blacklist');
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Default blacklist (would be loaded from database in production)
    const blacklist = [
      'malicious-domain.com',
      'phishing-site.net',
      'spam-central.org',
    ];

    // Cache for 1 hour
    await this.redis.setex('domain:blacklist', 3600, JSON.stringify(blacklist));

    return blacklist;
  }

  /**
   * Validate HTML structure
   */
  private static validateHTMLStructure(content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for unclosed tags
    const openTags = content.match(/<[^/][^>]*>/g) || [];
    const closeTags = content.match(/<\/[^>]+>/g) || [];

    if (openTags.length !== closeTags.length) {
      errors.push('Unclosed HTML tags detected');
    }

    // Check for nested forms (not allowed in email)
    if (/<form[^>]*>.*<form[^>]*>/gis.test(content)) {
      errors.push('Nested forms are not allowed');
    }

    // Check for invalid nesting
    if (/<p[^>]*>.*<div[^>]*>.*<\/p>/gis.test(content)) {
      errors.push('Invalid HTML nesting (div inside p)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect phishing indicators
   */
  private static detectPhishingIndicators(
    content: string,
    subject: string,
  ): { suspicious: boolean; indicators: string[] } {
    const indicators: string[] = [];

    // Check for urgency keywords
    const urgencyTerms = [
      'urgent',
      'immediate',
      'expire',
      'suspend',
      'terminate',
      'deadline',
    ];
    urgencyTerms.forEach((term) => {
      if (subject.toLowerCase().includes(term)) {
        indicators.push(`Urgency indicator in subject: ${term}`);
      }
    });

    // Check for credential requests
    if (/password|username|pin|ssn|social security/gi.test(content)) {
      indicators.push('Requests for sensitive credentials');
    }

    // Check for mismatched URLs
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    const links = content.matchAll(linkPattern);

    for (const link of links) {
      const url = link[1];
      const text = link[2];

      // Check if display text looks like a URL but doesn't match href
      if (text.includes('http') && !url.includes(text)) {
        indicators.push('Mismatched URL in link');
      }
    }

    // Check for homograph attacks (lookalike domains)
    const homographs = {
      paypal: ['payp4l', 'paypaI', 'paipal'],
      amazon: ['arnazon', 'amazom', 'amaz0n'],
      google: ['googIe', 'g00gle', 'goog1e'],
    };

    Object.entries(homographs).forEach(([legitimate, fakes]) => {
      fakes.forEach((fake) => {
        if (content.toLowerCase().includes(fake)) {
          indicators.push(
            `Possible homograph attack: ${fake} mimicking ${legitimate}`,
          );
        }
      });
    });

    return {
      suspicious: indicators.length > 0,
      indicators,
    };
  }

  /**
   * Validate all links in content
   */
  private static async validateLinks(
    content: string,
  ): Promise<{ allSafe: boolean; unsafeLinks: string[] }> {
    const unsafeLinks: string[] = [];

    // Extract all URLs
    const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
    const urls = content.match(urlPattern) || [];

    for (const url of urls) {
      try {
        const parsed = new URL(url);

        // Check for suspicious TLDs
        const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf'];
        if (suspiciousTLDs.some((tld) => parsed.hostname.endsWith(tld))) {
          unsafeLinks.push(`Suspicious TLD: ${url}`);
        }

        // Check for IP addresses instead of domains
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(parsed.hostname)) {
          unsafeLinks.push(`IP address instead of domain: ${url}`);
        }

        // Check for non-standard ports
        if (
          parsed.port &&
          !['80', '443', '8080', '8443'].includes(parsed.port)
        ) {
          unsafeLinks.push(`Non-standard port: ${url}`);
        }
      } catch (error) {
        unsafeLinks.push(`Invalid URL: ${url}`);
      }
    }

    return {
      allSafe: unsafeLinks.length === 0,
      unsafeLinks,
    };
  }

  /**
   * Log security check for audit
   */
  private static async logSecurityCheck(
    organizationId: string,
    campaignId: string,
    details: Record<string, any>,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('security_audit_log').insert({
      organization_id: organizationId,
      campaign_id: campaignId,
      check_type: 'message_validation',
      threat_level: details.threatLevel,
      details,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Quarantine suspicious message
   */
  static async quarantineMessage(
    campaignId: string,
    reason: string,
    content: string,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('quarantined_messages').insert({
      campaign_id: campaignId,
      quarantine_reason: reason,
      content_hash: crypto.createHash('sha256').update(content).digest('hex'),
      quarantined_at: new Date().toISOString(),
    });
  }

  /**
   * Update security configuration based on tier
   */
  static updateConfigForTier(tier: string): void {
    switch (tier) {
      case 'ENTERPRISE':
        this.config.maxRecipientsPerCampaign = 50000;
        this.config.maxMessagesPerHour = 5000;
        this.config.maxMessagesPerDay = 25000;
        break;
      case 'SCALE':
        this.config.maxRecipientsPerCampaign = 20000;
        this.config.maxMessagesPerHour = 2000;
        this.config.maxMessagesPerDay = 10000;
        break;
      case 'PROFESSIONAL':
        this.config.maxRecipientsPerCampaign = 10000;
        this.config.maxMessagesPerHour = 1000;
        this.config.maxMessagesPerDay = 5000;
        break;
      default:
        this.config.maxRecipientsPerCampaign = 1000;
        this.config.maxMessagesPerHour = 100;
        this.config.maxMessagesPerDay = 500;
    }
  }
}

export const messageSecurityGuard = new MessageSecurityGuard();
