# TEAM C - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Integration/Third-Party Services Focus

**YOUR MISSION:** Build all third-party integrations for the referral system including QR code generation, email notifications, billing integration, and social sharing APIs
**FEATURE ID:** WS-344 (Track all work with this ID)  
**TIME LIMIT:** 16 hours for comprehensive integration services
**THINK ULTRA HARD** about creating reliable integrations that work seamlessly during high-traffic wedding seasons

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/qr-generator.ts | head -20
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/integrations/
```

2. **INTEGRATION TESTS RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test services/integrations
# MUST show: "All integration tests passing"
```

3. **QR CODE GENERATION TEST:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && node -e "
const { generateQRCode } = require('./src/services/qr-generator.ts');
generateQRCode('https://wedsync.com/join/ABC12345', 'test-supplier').then(url => console.log('QR URL:', url));
"
# MUST show: Successfully generated QR code URL
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing integration patterns and services
await mcp__serena__search_for_pattern("stripe.*integration|email.*service|webhook");
await mcp__serena__find_symbol("EmailService", "", true);
await mcp__serena__get_symbols_overview("src/services/");
await mcp__serena__get_symbols_overview("src/app/api/webhooks/");
```

### B. INTEGRATION ARCHITECTURE ANALYSIS (MINUTES 3-5)
```typescript
// Load existing integration patterns for consistency
await mcp__serena__search_for_pattern("supabase.*storage|file.*upload");
await mcp__serena__find_symbol("StripeWebhook", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### C. REF MCP CURRENT DOCS (MINUTES 5-7)
```typescript
// Load documentation SPECIFIC to integration technologies
await mcp__Ref__ref_search_documentation("QR code generation Node.js libraries qrcode sharp canvas");
await mcp__Ref__ref_search_documentation("Stripe billing integration subscription credits webhooks");
await mcp__Ref__ref_search_documentation("Resend email templates transactional API React Email");
await mcp__Ref__ref_search_documentation("Social sharing APIs WhatsApp LinkedIn Facebook integration");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

### Use Sequential Thinking MCP for Complex Integration Planning
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "For the referral system integrations, I need to coordinate multiple external services: 1) QR code generation for offline sharing, 2) Email notifications for referral updates, 3) Stripe billing integration for reward credits, 4) Social platform APIs for viral sharing, 5) Supabase Storage for QR code images. Each integration must handle failures gracefully and work offline during wedding events.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "QR code generation architecture: Use 'qrcode' npm package with Canvas for image generation, upload to Supabase Storage bucket 'referral-qr-codes', return public URL for frontend display. Must generate codes that work in poor lighting (high contrast, appropriate size). Integration with referral link creation API endpoint.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Email notification system: Integrate with Resend for transactional emails. Templates needed: 1) Referral link shared confirmation, 2) Someone clicked your link notification, 3) Conversion success celebration, 4) Reward credited notification. Must use React Email for templates and handle high volume during wedding seasons.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Stripe billing integration for rewards: When referral converts to first_payment, credit 1 month to referrer's subscription. Must integrate with existing Stripe customer records, handle proration, and update subscription billing cycle. Edge cases: what if referrer cancels before reward, downgrades, or has annual subscription.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Social sharing integrations: WhatsApp Business API for direct sharing, LinkedIn API for professional networks, native share APIs for mobile. Must generate proper Open Graph metadata for link previews. Handle API rate limits and provide fallback sharing methods when APIs are down.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration services and third-party dependencies
2. **integration-specialist** - Use Serena for consistent service patterns with existing integrations
3. **security-compliance-officer** - Validate API keys, webhook security, and third-party data handling
4. **supabase-specialist** - Optimize storage integration and file handling
5. **test-automation-architect** - Comprehensive integration testing with mock services
6. **documentation-chronicler** - Evidence-based integration documentation with examples

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **API key management** - All third-party keys in environment variables, never in code
- [ ] **Webhook validation** - Verify Stripe webhook signatures for billing integration
- [ ] **Rate limiting** - Respect third-party API limits and implement backoff strategies
- [ ] **Data sanitization** - Clean all data before sending to third-party services
- [ ] **Error handling** - Never expose third-party API errors to frontend users
- [ ] **Secure file uploads** - Validate QR code files before uploading to storage
- [ ] **CORS configuration** - Properly configure cross-origin requests for sharing APIs
- [ ] **Authentication tokens** - Secure storage and rotation of service tokens
- [ ] **Data encryption** - Encrypt sensitive data in transit to third-party services
- [ ] **Audit logging** - Log all third-party API calls for debugging and compliance

## 🔗 INTEGRATION SERVICES IMPLEMENTATION

### SERVICE 1: QR Code Generator Service
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/qr-generator.ts

import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from './audit-log';

interface QRCodeOptions {
  width: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

export class QRGeneratorService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async generateQRCode(
    referralLink: string, 
    supplierId: string,
    options?: Partial<QRCodeOptions>
  ): Promise<string> {
    try {
      // Step 1: Configure QR Code Options (Wedding Venue Optimized)
      const qrOptions: QRCodeOptions = {
        width: 400, // Large enough for venue lighting conditions
        margin: 2,
        color: {
          dark: '#000000', // High contrast for poor lighting
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H', // High error correction for damaged/dirty phones
        ...options
      };

      // Step 2: Generate QR Code as Buffer
      const qrCodeBuffer = await QRCode.toBuffer(referralLink, qrOptions);

      // Step 3: Create Unique Filename
      const timestamp = Date.now();
      const filename = `referral-qr-${supplierId}-${timestamp}.png`;

      // Step 4: Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('referral-qr-codes')
        .upload(filename, qrCodeBuffer, {
          contentType: 'image/png',
          cacheControl: '31536000', // Cache for 1 year
          upsert: false
        });

      if (uploadError) {
        throw new Error(`QR code upload failed: ${uploadError.message}`);
      }

      // Step 5: Get Public URL
      const { data: urlData } = this.supabase.storage
        .from('referral-qr-codes')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Step 6: Audit Log
      await auditLogger.log({
        action: 'qr_code_generated',
        supplierId,
        details: {
          referralLink,
          filename,
          publicUrl,
          options: qrOptions
        }
      });

      return publicUrl;

    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  async regenerateQRCode(
    existingUrl: string,
    referralLink: string,
    supplierId: string
  ): Promise<string> {
    try {
      // Step 1: Delete Existing QR Code
      if (existingUrl) {
        const pathMatch = existingUrl.match(/referral-qr-codes\/(.+)$/);
        if (pathMatch) {
          await this.supabase.storage
            .from('referral-qr-codes')
            .remove([pathMatch[1]]);
        }
      }

      // Step 2: Generate New QR Code
      return await this.generateQRCode(referralLink, supplierId);

    } catch (error) {
      console.error('QR code regeneration error:', error);
      throw new Error('Failed to regenerate QR code');
    }
  }

  async validateQRCodeUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const qrGeneratorService = new QRGeneratorService();
```

### SERVICE 2: Referral Email Service
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/referral-email.ts

import { Resend } from 'resend';
import { ReferralLinkSharedEmail } from '@/emails/ReferralLinkShared';
import { ReferralConversionEmail } from '@/emails/ReferralConversion';
import { RewardCreditedEmail } from '@/emails/RewardCredited';
import { auditLogger } from './audit-log';

interface EmailRecipient {
  email: string;
  name: string;
}

interface ReferralEmailData {
  referralCode: string;
  referralLink: string;
  referrerName: string;
  customMessage?: string;
}

export class ReferralEmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendReferralLinkSharedConfirmation(
    recipient: EmailRecipient,
    data: ReferralEmailData
  ): Promise<boolean> {
    try {
      const { data: emailResult, error } = await this.resend.emails.send({
        from: 'WedSync Referrals <referrals@wedsync.com>',
        to: [recipient.email],
        subject: '🎉 Your referral link is ready to share!',
        react: ReferralLinkSharedEmail({
          recipientName: recipient.name,
          referralCode: data.referralCode,
          referralLink: data.referralLink,
          customMessage: data.customMessage
        })
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      await auditLogger.log({
        action: 'referral_email_sent',
        type: 'link_shared_confirmation',
        recipient: recipient.email,
        details: {
          referralCode: data.referralCode,
          emailId: emailResult?.id
        }
      });

      return true;

    } catch (error) {
      console.error('Referral link shared email error:', error);
      return false;
    }
  }

  async sendReferralClickedNotification(
    recipient: EmailRecipient,
    data: ReferralEmailData & { clickedAt: Date }
  ): Promise<boolean> {
    try {
      const { data: emailResult, error } = await this.resend.emails.send({
        from: 'WedSync Referrals <referrals@wedsync.com>',
        to: [recipient.email],
        subject: '👆 Someone clicked your referral link!',
        react: ReferralClickedEmail({
          recipientName: recipient.name,
          referralCode: data.referralCode,
          clickedAt: data.clickedAt,
          referralLink: data.referralLink
        })
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      await auditLogger.log({
        action: 'referral_email_sent',
        type: 'link_clicked_notification',
        recipient: recipient.email,
        details: {
          referralCode: data.referralCode,
          emailId: emailResult?.id
        }
      });

      return true;

    } catch (error) {
      console.error('Referral clicked notification error:', error);
      return false;
    }
  }

  async sendReferralConversionCelebration(
    recipient: EmailRecipient,
    data: ReferralEmailData & { 
      convertedSupplierName: string;
      rewardAmount: string;
      convertedAt: Date;
    }
  ): Promise<boolean> {
    try {
      const { data: emailResult, error } = await this.resend.emails.send({
        from: 'WedSync Referrals <referrals@wedsync.com>',
        to: [recipient.email],
        subject: '🎊 Congratulations! Your referral converted!',
        react: ReferralConversionEmail({
          recipientName: recipient.name,
          convertedSupplierName: data.convertedSupplierName,
          rewardAmount: data.rewardAmount,
          convertedAt: data.convertedAt,
          referralCode: data.referralCode
        })
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      await auditLogger.log({
        action: 'referral_email_sent',
        type: 'conversion_celebration',
        recipient: recipient.email,
        details: {
          referralCode: data.referralCode,
          convertedSupplierName: data.convertedSupplierName,
          emailId: emailResult?.id
        }
      });

      return true;

    } catch (error) {
      console.error('Referral conversion celebration error:', error);
      return false;
    }
  }

  async sendRewardCreditedNotification(
    recipient: EmailRecipient,
    data: {
      rewardAmount: string;
      rewardDescription: string;
      nextBillingDate: Date;
      referralCode: string;
    }
  ): Promise<boolean> {
    try {
      const { data: emailResult, error } = await this.resend.emails.send({
        from: 'WedSync Referrals <referrals@wedsync.com>',
        to: [recipient.email],
        subject: '💳 Your referral reward has been applied!',
        react: RewardCreditedEmail({
          recipientName: recipient.name,
          rewardAmount: data.rewardAmount,
          rewardDescription: data.rewardDescription,
          nextBillingDate: data.nextBillingDate,
          referralCode: data.referralCode
        })
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      await auditLogger.log({
        action: 'referral_email_sent',
        type: 'reward_credited',
        recipient: recipient.email,
        details: {
          rewardAmount: data.rewardAmount,
          referralCode: data.referralCode,
          emailId: emailResult?.id
        }
      });

      return true;

    } catch (error) {
      console.error('Reward credited notification error:', error);
      return false;
    }
  }

  async sendBulkReferralDigest(
    recipient: EmailRecipient,
    digestData: {
      period: string;
      totalReferrals: number;
      newConversions: number;
      totalRewards: string;
      leaderboardRank: number;
    }
  ): Promise<boolean> {
    try {
      const { data: emailResult, error } = await this.resend.emails.send({
        from: 'WedSync Referrals <referrals@wedsync.com>',
        to: [recipient.email],
        subject: `📊 Your ${digestData.period} referral performance`,
        react: ReferralDigestEmail({
          recipientName: recipient.name,
          ...digestData
        })
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      await auditLogger.log({
        action: 'referral_email_sent',
        type: 'bulk_digest',
        recipient: recipient.email,
        details: digestData
      });

      return true;

    } catch (error) {
      console.error('Bulk referral digest error:', error);
      return false;
    }
  }
}

export const referralEmailService = new ReferralEmailService();
```

### SERVICE 3: Stripe Reward Integration Service
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/referral-rewards.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from './audit-log';
import { referralEmailService } from './referral-email';

interface RewardResult {
  success: boolean;
  milestoneAchieved?: string;
  errorMessage?: string;
}

interface SupplierData {
  id: string;
  name: string;
  owner_email: string;
  subscription_tier: string;
  stripe_customer_id?: string;
}

export class ReferralRewardService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });

  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async processReferralReward(
    referrerId: string,
    referralId: string,
    referrerData: SupplierData
  ): Promise<RewardResult> {
    try {
      // Step 1: Validate Referrer Has Active Subscription
      if (!referrerData.stripe_customer_id) {
        return {
          success: false,
          errorMessage: 'Referrer does not have active subscription'
        };
      }

      // Step 2: Get Referrer's Current Stripe Subscription
      const customer = await this.stripe.customers.retrieve(referrerData.stripe_customer_id);
      
      if (!customer || customer.deleted) {
        return {
          success: false,
          errorMessage: 'Referrer Stripe customer not found'
        };
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: referrerData.stripe_customer_id,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        return {
          success: false,
          errorMessage: 'Referrer has no active subscription'
        };
      }

      const subscription = subscriptions.data[0];

      // Step 3: Calculate Reward Credit Based on Tier
      const tierCredits = {
        'starter': 19.00,      // £19/month credit
        'professional': 49.00,  // £49/month credit
        'scale': 79.00,        // £79/month credit
        'enterprise': 149.00   // £149/month credit
      };

      const creditAmount = tierCredits[referrerData.subscription_tier as keyof typeof tierCredits] || 49.00;

      // Step 4: Apply Credit to Stripe Account
      await this.stripe.customers.createBalanceTransaction(referrerData.stripe_customer_id, {
        amount: Math.round(creditAmount * 100), // Convert to pence
        currency: 'gbp',
        description: `Referral reward credit for referral ${referralId.substring(0, 8)}`,
        metadata: {
          referral_id: referralId,
          referrer_id: referrerId,
          credit_type: 'referral_reward'
        }
      });

      // Step 5: Update Referral Record
      await this.supabase
        .from('supplier_referrals')
        .update({
          stage: 'reward_issued',
          reward_issued_at: new Date().toISOString(),
          referrer_reward: '1_month_free'
        })
        .eq('id', referralId);

      // Step 6: Check for Milestone Achievements
      const milestoneAchieved = await this.checkMilestoneAchievements(referrerId);

      // Step 7: Send Reward Notification Email
      await referralEmailService.sendRewardCreditedNotification(
        {
          email: referrerData.owner_email,
          name: referrerData.name
        },
        {
          rewardAmount: `£${creditAmount.toFixed(2)}`,
          rewardDescription: '1 month free subscription credit',
          nextBillingDate: new Date(subscription.current_period_end * 1000),
          referralCode: '' // Will be filled by calling function
        }
      );

      // Step 8: Audit Log
      await auditLogger.log({
        action: 'referral_reward_processed',
        referrerId,
        referralId,
        details: {
          creditAmount,
          stripeCustomerId: referrerData.stripe_customer_id,
          subscriptionTier: referrerData.subscription_tier,
          milestoneAchieved
        }
      });

      return {
        success: true,
        milestoneAchieved
      };

    } catch (error) {
      console.error('Referral reward processing error:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMilestoneAchievements(referrerId: string): Promise<string | undefined> {
    try {
      // Count total conversions for this referrer
      const { data: conversions } = await this.supabase
        .from('supplier_referrals')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('stage', 'reward_issued');

      const conversionCount = conversions?.length || 0;

      // Define milestone thresholds
      const milestones = [
        { count: 1, type: 'first_conversion', title: 'First Conversion!', description: 'Your first successful referral' },
        { count: 5, type: '5_conversions', title: 'Rising Star', description: '5 successful referrals' },
        { count: 10, type: '10_conversions', title: 'Community Builder', description: '10 successful referrals' },
        { count: 25, type: '25_conversions', title: 'Wedding Network Champion', description: '25 successful referrals' },
        { count: 50, type: '50_conversions', title: 'Referral Master', description: '50 successful referrals' },
        { count: 100, type: '100_conversions', title: 'Wedding Industry Legend', description: '100 successful referrals' }
      ];

      // Find applicable milestone
      const milestone = milestones.find(m => m.count === conversionCount);
      
      if (milestone) {
        // Check if milestone already achieved
        const { data: existing } = await this.supabase
          .from('referral_milestones')
          .select('id')
          .eq('supplier_id', referrerId)
          .eq('milestone_type', milestone.type)
          .single();

        if (!existing) {
          // Create milestone record
          await this.supabase
            .from('referral_milestones')
            .insert({
              supplier_id: referrerId,
              milestone_type: milestone.type,
              milestone_title: milestone.title,
              milestone_description: milestone.description,
              reward_description: `Achievement badge: ${milestone.title}`
            });

          // Create achievement badge
          await this.supabase
            .from('referral_badges')
            .insert({
              supplier_id: referrerId,
              badge_id: milestone.type,
              badge_name: milestone.title,
              badge_icon: `milestone-${milestone.count}`,
              badge_description: milestone.description,
              badge_color: this.getBadgeColor(milestone.count)
            });

          return milestone.title;
        }
      }

      return undefined;

    } catch (error) {
      console.error('Milestone check error:', error);
      return undefined;
    }
  }

  private getBadgeColor(conversionCount: number): string {
    if (conversionCount >= 100) return '#FFD700'; // Gold
    if (conversionCount >= 50) return '#C0C0C0';  // Silver
    if (conversionCount >= 25) return '#CD7F32';  // Bronze
    if (conversionCount >= 10) return '#9333EA';  // Purple
    if (conversionCount >= 5) return '#3B82F6';   // Blue
    return '#10B981'; // Green
  }

  async validateRewardEligibility(referralId: string): Promise<boolean> {
    try {
      // Get referral with related data
      const { data: referral } = await this.supabase
        .from('supplier_referrals')
        .select(`
          *,
          referrer:organizations!referrer_id (stripe_customer_id),
          referred:organizations!referred_id (id)
        `)
        .eq('id', referralId)
        .single();

      if (!referral) return false;

      // Check eligibility criteria
      const isValidStage = referral.stage === 'first_payment';
      const hasReferrer = !!referral.referrer?.stripe_customer_id;
      const hasReferred = !!referral.referred?.id;
      const notAlreadyRewarded = referral.referrer_reward !== '1_month_free';

      return isValidStage && hasReferrer && hasReferred && notAlreadyRewarded;

    } catch (error) {
      console.error('Reward eligibility validation error:', error);
      return false;
    }
  }
}

export const rewardService = new ReferralRewardService();
```

### SERVICE 4: Social Sharing Integration Service
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/social-sharing.ts

import { auditLogger } from './audit-log';

interface ShareData {
  referralLink: string;
  referralCode: string;
  customMessage?: string;
  supplierName: string;
}

interface ShareResult {
  success: boolean;
  shareUrl?: string;
  platform: string;
  errorMessage?: string;
}

export class SocialSharingService {

  async generateWhatsAppShare(data: ShareData): Promise<ShareResult> {
    try {
      const message = data.customMessage || 
        `Hi! I've been using WedSync to coordinate my weddings and it's been amazing. You should check it out - it could save you hours per wedding! ${data.referralLink}`;

      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

      await auditLogger.log({
        action: 'referral_share_generated',
        platform: 'whatsapp',
        details: {
          referralCode: data.referralCode,
          supplierName: data.supplierName
        }
      });

      return {
        success: true,
        shareUrl: whatsappUrl,
        platform: 'whatsapp'
      };

    } catch (error) {
      console.error('WhatsApp share generation error:', error);
      return {
        success: false,
        platform: 'whatsapp',
        errorMessage: 'Failed to generate WhatsApp share link'
      };
    }
  }

  async generateLinkedInShare(data: ShareData): Promise<ShareResult> {
    try {
      const title = 'WedSync - Wedding Coordination Made Simple';
      const summary = data.customMessage || 
        `Just discovered WedSync for wedding coordination. Game-changer for vendors! Check it out.`;

      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referralLink)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;

      await auditLogger.log({
        action: 'referral_share_generated',
        platform: 'linkedin',
        details: {
          referralCode: data.referralCode,
          supplierName: data.supplierName
        }
      });

      return {
        success: true,
        shareUrl: linkedinUrl,
        platform: 'linkedin'
      };

    } catch (error) {
      console.error('LinkedIn share generation error:', error);
      return {
        success: false,
        platform: 'linkedin',
        errorMessage: 'Failed to generate LinkedIn share link'
      };
    }
  }

  async generateEmailShare(data: ShareData): Promise<ShareResult> {
    try {
      const subject = 'Check out WedSync - Wedding Coordination Platform';
      const body = data.customMessage || 
        `Hi,

I've been using WedSync to coordinate my weddings and it's been a game-changer. It saves me hours of admin work per wedding by keeping everything organized in one place.

I thought you might find it useful too: ${data.referralLink}

They offer a free trial so you can test it out with no commitment.

Best,
${data.supplierName}`;

      const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      await auditLogger.log({
        action: 'referral_share_generated',
        platform: 'email',
        details: {
          referralCode: data.referralCode,
          supplierName: data.supplierName
        }
      });

      return {
        success: true,
        shareUrl: emailUrl,
        platform: 'email'
      };

    } catch (error) {
      console.error('Email share generation error:', error);
      return {
        success: false,
        platform: 'email',
        errorMessage: 'Failed to generate email share link'
      };
    }
  }

  async generateFacebookShare(data: ShareData): Promise<ShareResult> {
    try {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.referralLink)}&quote=${encodeURIComponent(data.customMessage || 'Check out WedSync for wedding coordination!')}`;

      await auditLogger.log({
        action: 'referral_share_generated',
        platform: 'facebook',
        details: {
          referralCode: data.referralCode,
          supplierName: data.supplierName
        }
      });

      return {
        success: true,
        shareUrl: facebookUrl,
        platform: 'facebook'
      };

    } catch (error) {
      console.error('Facebook share generation error:', error);
      return {
        success: false,
        platform: 'facebook',
        errorMessage: 'Failed to generate Facebook share link'
      };
    }
  }

  async generateNativeShare(data: ShareData): Promise<ShareResult> {
    try {
      // Web Share API data structure
      const shareData = {
        title: 'WedSync - Wedding Coordination Platform',
        text: data.customMessage || 'Check out WedSync for wedding coordination!',
        url: data.referralLink
      };

      await auditLogger.log({
        action: 'referral_share_generated',
        platform: 'native',
        details: {
          referralCode: data.referralCode,
          supplierName: data.supplierName
        }
      });

      return {
        success: true,
        shareUrl: JSON.stringify(shareData), // Frontend will parse and use Web Share API
        platform: 'native'
      };

    } catch (error) {
      console.error('Native share generation error:', error);
      return {
        success: false,
        platform: 'native',
        errorMessage: 'Failed to generate native share data'
      };
    }
  }

  async trackShareEvent(
    referralCode: string,
    platform: string,
    userId?: string
  ): Promise<void> {
    try {
      await auditLogger.log({
        action: 'referral_share_executed',
        userId,
        details: {
          referralCode,
          platform,
          timestamp: new Date().toISOString()
        }
      });

      // Could also track in analytics service here
      
    } catch (error) {
      console.error('Share event tracking error:', error);
      // Don't throw - tracking failures shouldn't break sharing
    }
  }
}

export const socialSharingService = new SocialSharingService();
```

## 🔗 API ENDPOINTS FOR INTEGRATIONS

### ENDPOINT: QR Code Generation (GET /api/qr/generate)
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/qr/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { qrGeneratorService } from '@/services/qr-generator';

const generateQRSchema = z.object({
  code: z.string().length(8).regex(/^[A-Z0-9]{8}$/),
  regenerate: z.coerce.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { code, regenerate } = generateQRSchema.parse(queryParams);

    // Step 3: Get Supplier Organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: supplier } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_email', session.user.email)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Step 4: Find Referral Record
    const { data: referral } = await supabase
      .from('supplier_referrals')
      .select('custom_link, qr_code_url')
      .eq('referral_code', code)
      .eq('referrer_id', supplier.id)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      );
    }

    // Step 5: Generate or Return Existing QR Code
    let qrCodeUrl = referral.qr_code_url;

    if (!qrCodeUrl || regenerate) {
      qrCodeUrl = await qrGeneratorService.generateQRCode(
        referral.custom_link,
        supplier.id
      );

      // Update referral record with QR code URL
      await supabase
        .from('supplier_referrals')
        .update({ qr_code_url: qrCodeUrl })
        .eq('referral_code', code);
    }

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      referralLink: referral.custom_link
    });

  } catch (error) {
    console.error('QR generation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
```

## 🎯 REAL WEDDING SCENARIO (MANDATORY CONTEXT)

**Wedding Industry Integration Challenge:**
"At a busy wedding expo, Sarah (photographer) meets DJ Mike and wants to share WedSync instantly. She opens the referral center on her phone, generates a QR code that Mike can scan with his camera app, which opens the referral link with her custom message 'Perfect for DJs - tracks all your wedding timeline coordination!' Mike scans it, signs up immediately, and Sarah gets an email notification that someone clicked her link. When Mike converts to paid 2 weeks later, the Stripe integration automatically credits Sarah's account with £49, sends her a celebration email, and updates the photography leaderboard in real-time. The entire flow works seamlessly even with poor venue wifi because QR codes work offline."

## 💾 WHERE TO SAVE YOUR WORK

**Service Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/
├── qr-generator.ts (QR code generation and storage)
├── referral-email.ts (Email notifications via Resend)
├── referral-rewards.ts (Stripe billing integration)
├── social-sharing.ts (Social platform share URL generation)
└── audit-log.ts (Integration event logging)
```

**API Integration Endpoints:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/
├── qr/generate/route.ts (QR code generation endpoint)
├── integrations/social-share/route.ts (Social sharing endpoints)
└── webhooks/stripe-referrals/route.ts (Stripe webhook for rewards)
```

**Email Templates (React Email):**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/emails/
├── ReferralLinkShared.tsx
├── ReferralConversion.tsx
├── RewardCredited.tsx
└── ReferralDigest.tsx
```

**Type Definitions:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/
└── integrations.ts
```

**Test Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/__tests__/
├── qr-generator.test.ts
├── referral-email.test.ts
├── referral-rewards.test.ts
└── social-sharing.test.ts
```

## 🏁 COMPLETION CHECKLIST

**QR CODE INTEGRATION:**
- [ ] **QR Generation Service** - High contrast QR codes optimized for wedding venues
- [ ] **Supabase Storage** - Upload and manage QR code images
- [ ] **QR API Endpoint** - Generate/regenerate QR codes on demand
- [ ] **Validation Service** - Verify QR code URL accessibility

**EMAIL INTEGRATION:**
- [ ] **Resend Service Setup** - Transactional email service integration
- [ ] **React Email Templates** - Professional referral email designs
- [ ] **Email Automation** - Trigger emails on referral stage changes
- [ ] **Bulk Digest System** - Weekly/monthly referral performance summaries

**STRIPE BILLING INTEGRATION:**
- [ ] **Reward Credit Service** - Apply subscription credits for successful referrals
- [ ] **Milestone Detection** - Automatically detect and reward achievement levels
- [ ] **Payment Validation** - Verify actual payments before issuing rewards
- [ ] **Webhook Integration** - Handle Stripe payment confirmations

**SOCIAL SHARING INTEGRATION:**
- [ ] **WhatsApp Business API** - Direct message sharing for mobile
- [ ] **LinkedIn Share API** - Professional network sharing
- [ ] **Email Share Generation** - Pre-populated email templates
- [ ] **Native Web Share API** - Mobile-optimized sharing experience

**TECHNICAL REQUIREMENTS:**
- [ ] **Error Handling** - Graceful degradation when integrations fail
- [ ] **Rate Limiting** - Respect third-party API limits
- [ ] **Security Validation** - Secure API key management and webhook verification
- [ ] **Audit Logging** - Track all integration events for debugging

**TESTING COVERAGE:**
- [ ] **Integration Tests** - Mock third-party services for reliable testing
- [ ] **QR Code Tests** - Verify QR generation and storage functionality
- [ ] **Email Tests** - Validate email template rendering and delivery
- [ ] **Stripe Tests** - Test reward credit application and validation

**EVIDENCE PACKAGE:**
- [ ] **Integration Tests Passing** - All third-party integrations working
- [ ] **QR Code Generation Proof** - Successfully generated QR codes
- [ ] **Email Service Proof** - Transactional emails sending correctly
- [ ] **Stripe Integration Proof** - Credits applied to test accounts

---

**EXECUTE IMMEDIATELY - Build the integration foundation that makes WedSync's referral system work seamlessly with third-party services. Focus on reliability and wedding industry-specific requirements like working in poor connectivity venues and handling high-volume sharing during peak wedding seasons.**