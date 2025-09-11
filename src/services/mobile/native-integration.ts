/**
 * Native Mobile Integration Service for WS-344 Referral System
 * Handles WhatsApp, SMS, Email, and deep link integration
 * Optimized for wedding suppliers at venues
 */

interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
}

interface DeepLinkResult {
  success: boolean;
  action?: 'redirect' | 'handle' | 'error';
  url?: string;
  error?: string;
}

interface ReferralShareData {
  referralCode: string;
  supplierName: string;
  message: string;
  link: string;
  vendorId: string;
}

export class NativeIntegrationService {
  private static readonly WHATSAPP_BUSINESS_BASE =
    'https://api.whatsapp.com/send';
  private static readonly WHATSAPP_WEB_BASE = 'https://web.whatsapp.com/send';
  private static readonly MAX_SMS_LENGTH = 160;
  private static readonly WEDDING_HASHTAGS = [
    '#Wedding',
    '#WeddingSupplier',
    '#WedSync',
  ];

  /**
   * WhatsApp Business API Integration
   * Prioritizes WhatsApp Business, falls back to regular WhatsApp
   */
  static async shareViaWhatsApp(
    phoneNumber: string,
    message: string,
    referralLink: string,
    supplierName: string,
  ): Promise<ShareResult> {
    try {
      // Create wedding-themed WhatsApp message
      const whatsappMessage = this.createWeddingMessage(
        message,
        referralLink,
        supplierName,
      );
      const encodedMessage = encodeURIComponent(whatsappMessage);

      // Try WhatsApp Business first (better for suppliers)
      const whatsappUrls = [
        `${this.WHATSAPP_BUSINESS_BASE}?phone=${phoneNumber}&text=${encodedMessage}`,
        `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`,
        `${this.WHATSAPP_WEB_BASE}?phone=${phoneNumber}&text=${encodedMessage}`,
      ];

      // Track attempt
      await this.trackShareAttempt('whatsapp', supplierName);

      for (const url of whatsappUrls) {
        try {
          // Check if URL can be opened
          if (await this.canOpenUrl(url)) {
            window.open(url, '_blank');
            await this.trackShareSuccess('whatsapp', supplierName);
            return { success: true, platform: 'whatsapp' };
          }
        } catch (error) {
          console.log(`WhatsApp URL failed: ${url}`, error);
          continue;
        }
      }

      return { success: false, error: 'WhatsApp not available' };
    } catch (error) {
      console.error('WhatsApp share error:', error);
      return { success: false, error: 'WhatsApp sharing failed' };
    }
  }

  /**
   * SMS Integration with Wedding Context
   * Handles iOS and Android differences
   */
  static async shareViaSMS(
    phoneNumber: string,
    message: string,
    referralLink: string,
    supplierName: string,
  ): Promise<ShareResult> {
    try {
      // Create concise SMS message (160 char limit)
      const smsMessage = this.createSMSMessage(
        message,
        referralLink,
        supplierName,
      );
      const encodedMessage = encodeURIComponent(smsMessage);

      // Detect platform for proper SMS URL format
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      let smsUrl: string;

      if (isIOS) {
        // iOS format
        smsUrl = phoneNumber
          ? `sms:${phoneNumber}&body=${encodedMessage}`
          : `sms:&body=${encodedMessage}`;
      } else {
        // Android format
        smsUrl = phoneNumber
          ? `sms:${phoneNumber}?body=${encodedMessage}`
          : `sms:?body=${encodedMessage}`;
      }

      await this.trackShareAttempt('sms', supplierName);

      if (await this.canOpenUrl(smsUrl)) {
        window.open(smsUrl, '_blank');
        await this.trackShareSuccess('sms', supplierName);
        return { success: true, platform: 'sms' };
      }

      return { success: false, error: 'SMS not available' };
    } catch (error) {
      console.error('SMS share error:', error);
      return { success: false, error: 'SMS sharing failed' };
    }
  }

  /**
   * Email Integration with Wedding Templates
   */
  static async shareViaEmail(
    emailAddress: string,
    message: string,
    referralLink: string,
    supplierName: string,
  ): Promise<ShareResult> {
    try {
      const emailSubject = `Wedding Vendor Recommendation - ${supplierName}`;
      const emailBody = this.createEmailMessage(
        message,
        referralLink,
        supplierName,
      );

      const encodedSubject = encodeURIComponent(emailSubject);
      const encodedBody = encodeURIComponent(emailBody);

      const emailUrl = emailAddress
        ? `mailto:${emailAddress}?subject=${encodedSubject}&body=${encodedBody}`
        : `mailto:?subject=${encodedSubject}&body=${encodedBody}`;

      await this.trackShareAttempt('email', supplierName);

      if (await this.canOpenUrl(emailUrl)) {
        window.open(emailUrl, '_blank');
        await this.trackShareSuccess('email', supplierName);
        return { success: true, platform: 'email' };
      }

      return { success: false, error: 'Email not available' };
    } catch (error) {
      console.error('Email share error:', error);
      return { success: false, error: 'Email sharing failed' };
    }
  }

  /**
   * iOS/Android Deep Link Handling
   * Processes referral deep links and tracks conversions
   */
  static async handleDeepLink(url: string): Promise<DeepLinkResult> {
    try {
      const urlObj = new URL(url);

      // Extract referral code from various URL formats
      const referralCode =
        urlObj.searchParams.get('ref') ||
        urlObj.searchParams.get('referral') ||
        url.match(/\/join\/([A-Z0-9]{8,12})/)?.[1] ||
        url.match(/\/referral\/([A-Z0-9]{8,12})/)?.[1];

      if (!referralCode) {
        return { success: false, error: 'No referral code found in URL' };
      }

      // Validate referral code format
      if (!this.validateReferralCodeFormat(referralCode)) {
        await this.trackSuspiciousActivity('invalid_referral_format', {
          url,
          referralCode,
        });
        return { success: false, error: 'Invalid referral code format' };
      }

      // Track referral click with device/platform info
      await this.trackReferralConversion(referralCode, {
        sourceUrl: url,
        platform: this.detectPlatform(),
        userAgent: navigator.userAgent.substring(0, 200),
        timestamp: new Date().toISOString(),
        sessionId: this.generateSessionId(),
      });

      // Determine redirect based on user state
      const redirectUrl = await this.determineRedirectUrl(referralCode, urlObj);

      return {
        success: true,
        action: 'redirect',
        url: redirectUrl,
      };
    } catch (error) {
      console.error('Deep link handling error:', error);
      return { success: false, error: 'Deep link processing failed' };
    }
  }

  /**
   * Universal Share Handler
   * Uses Web Share API when available, falls back appropriately
   */
  static async universalShare(
    shareData: ReferralShareData,
  ): Promise<ShareResult> {
    try {
      const message = this.createWeddingMessage(
        shareData.message,
        shareData.link,
        shareData.supplierName,
      );

      // Try native Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: `${shareData.supplierName} - Wedding Vendor`,
          text: message,
          url: shareData.link,
        });

        await this.trackShareSuccess('native', shareData.supplierName);
        return { success: true, platform: 'native' };
      }

      // Fallback to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${message}\n\n${shareData.link}`);
        await this.trackShareSuccess('clipboard', shareData.supplierName);
        return { success: true, platform: 'clipboard' };
      }

      // Last resort: legacy clipboard
      const textArea = document.createElement('textarea');
      textArea.value = `${message}\n\n${shareData.link}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      await this.trackShareSuccess('legacy_clipboard', shareData.supplierName);
      return { success: true, platform: 'legacy_clipboard' };
    } catch (error) {
      console.error('Universal share error:', error);
      return { success: false, error: 'All sharing methods failed' };
    }
  }

  /**
   * Create Wedding-Themed WhatsApp Message
   */
  private static createWeddingMessage(
    baseMessage: string,
    referralLink: string,
    supplierName: string,
  ): string {
    const weddingEmojis = ['💍', '✨', '💕', '🌸', '👰', '🤵'];
    const randomEmoji =
      weddingEmojis[Math.floor(Math.random() * weddingEmojis.length)];

    return `${randomEmoji} ${baseMessage}

📸 See their amazing work: ${referralLink}

${this.WEDDING_HASHTAGS.join(' ')}

*Shared via WedSync - Connecting wedding couples with amazing suppliers*`;
  }

  /**
   * Create Concise SMS Message (160 char limit)
   */
  private static createSMSMessage(
    baseMessage: string,
    referralLink: string,
    supplierName: string,
  ): string {
    const maxMessageLength = this.MAX_SMS_LENGTH - referralLink.length - 20; // buffer
    const truncatedMessage =
      baseMessage.length > maxMessageLength
        ? `${baseMessage.substring(0, maxMessageLength - 3)}...`
        : baseMessage;

    return `💍 ${truncatedMessage}\n${referralLink}\n- WedSync`;
  }

  /**
   * Create Rich Email Message
   */
  private static createEmailMessage(
    baseMessage: string,
    referralLink: string,
    supplierName: string,
  ): string {
    return `Hi there! 💍

${baseMessage}

I wanted to personally recommend ${supplierName} for your wedding. They've been incredible to work with, and I think they'd be perfect for your special day.

🔗 Check out their portfolio: ${referralLink}

Some reasons why I recommend them:
• Professional and reliable
• Amazing portfolio of wedding work  
• Great communication and responsiveness
• Fair pricing and transparent process

Feel free to mention my name when you contact them!

Best wishes for your wedding planning,

---
This recommendation was shared through WedSync, the wedding supplier platform.
Connect with verified wedding professionals: https://wedsync.com

${this.WEDDING_HASHTAGS.join(' ')}`;
  }

  /**
   * Validate Referral Code Format
   */
  private static validateReferralCodeFormat(code: string): boolean {
    // Referral codes should be 8-12 alphanumeric characters
    return /^[A-Z0-9]{8,12}$/i.test(code);
  }

  /**
   * Detect Platform
   */
  private static detectPlatform(): string {
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'desktop';
  }

  /**
   * Generate Session ID for tracking
   */
  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if URL can be opened (basic check)
   */
  private static async canOpenUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine redirect URL based on referral code and user context
   */
  private static async determineRedirectUrl(
    referralCode: string,
    originalUrl: URL,
  ): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com';
    const utmParams = this.extractUTMParams(originalUrl);

    // Check if user is already logged in
    const hasSession = document.cookie.includes('sb-access-token');

    if (hasSession) {
      // Redirect to referral acceptance page
      return `${baseUrl}/dashboard/referrals/accept?code=${referralCode}${utmParams}`;
    } else {
      // Redirect to signup with referral context
      return `${baseUrl}/signup?ref=${referralCode}${utmParams}`;
    }
  }

  /**
   * Extract UTM parameters for tracking
   */
  private static extractUTMParams(url: URL): string {
    const utmParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
    ];
    const params = new URLSearchParams();

    utmParams.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value) params.set(param, value);
    });

    return params.toString() ? `&${params.toString()}` : '';
  }

  /**
   * Track Share Attempt
   */
  private static async trackShareAttempt(
    platform: string,
    supplierName: string,
  ): Promise<void> {
    try {
      await fetch('/api/analytics/share-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          supplier_name: supplierName,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent.substring(0, 200),
          referrer: document.referrer,
        }),
      });
    } catch (error) {
      console.error('Failed to track share attempt:', error);
    }
  }

  /**
   * Track Share Success
   */
  private static async trackShareSuccess(
    platform: string,
    supplierName: string,
  ): Promise<void> {
    try {
      await fetch('/api/analytics/share-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          supplier_name: supplierName,
          timestamp: new Date().toISOString(),
          device_platform: this.detectPlatform(),
        }),
      });
    } catch (error) {
      console.error('Failed to track share success:', error);
    }
  }

  /**
   * Track Referral Conversion
   */
  private static async trackReferralConversion(
    referralCode: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await fetch('/api/referrals/track-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_code: referralCode,
          conversion_type: 'link_clicked',
          metadata,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track referral conversion:', error);
    }
  }

  /**
   * Track Suspicious Activity
   */
  private static async trackSuspiciousActivity(
    activityType: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      await fetch('/api/security/suspicious-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          details,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent.substring(0, 200),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track suspicious activity:', error);
    }
  }

  /**
   * Get Client IP (approximation)
   */
  private static async getClientIP(): Promise<string> {
    try {
      // This is a simplified approach - in production you'd use a proper service
      const response = await fetch('/api/client-ip');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

// Export types for TypeScript consumers
export type { ShareResult, DeepLinkResult, ReferralShareData };
