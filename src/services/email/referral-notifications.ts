import { Resend } from 'resend';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ReferralReward {
  supplierId: string;
  referredSupplierName: string;
  description: string;
  monthsEarned: number;
  creditAmount: number;
  rewardType:
    | 'month_free'
    | 'tier_upgrade'
    | 'percentage_discount'
    | 'fixed_credit';
}

export interface MilestoneAchievement {
  title: string;
  description: string;
  reward: string;
  totalConversions: number;
  currentRank: number;
  milestoneType: 'conversion_count' | 'revenue_generated' | 'referral_quality';
}

export interface RankingUpdate {
  currentRank: number;
  previousRank: number;
  rankImprovement: number;
  category: string;
  newConversions: number;
  totalConversions: number;
  period: 'weekly' | 'monthly' | 'all_time';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  queued?: boolean;
  error?: string;
}

interface ReferralEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class ReferralNotificationService {
  private readonly resend: Resend;
  private readonly supabase: SupabaseClient;
  private readonly emailQueue: Map<string, any[]> = new Map();
  private readonly templates = new Map<string, ReferralEmailTemplate>();

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    this.initializeReferralTemplates();
    this.startEmailProcessing();
  }

  private initializeReferralTemplates(): void {
    // Referral Reward Template
    this.templates.set('referral-reward', {
      subject: "🎉 Congratulations! You've Earned a Referral Reward",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 Referral Reward Earned!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your referral has successfully converted</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
              <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 22px;">Hello {{supplierName}}! 👋</h2>
              <p style="margin: 0; color: #475569; line-height: 1.6; font-size: 16px;">
                Fantastic news! <strong>{{referredSupplier}}</strong> has successfully joined WedSync through your referral link and upgraded to a paid plan.
              </p>
            </div>
            
            <!-- Reward Details -->
            <div style="background: #ecfdf5; padding: 25px; border-radius: 8px; border: 1px solid #a7f3d0; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; display: flex; align-items: center;">
                <span style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 16px;">£</span>
                Your Reward
              </h3>
              <p style="margin: 0 0 10px 0; color: #065f46; font-size: 18px; font-weight: 600;">{{rewardDescription}}</p>
              {{#monthsEarned}}
              <p style="margin: 0; color: #047857; font-size: 14px;">
                <strong>{{monthsEarned}} month(s)</strong> of free WedSync service
              </p>
              {{/monthsEarned}}
            </div>
            
            <!-- Next Steps -->
            <div style="background: #fef3c7; padding: 25px; border-radius: 8px; border: 1px solid #fbbf24; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">✨ What happens next?</h3>
              <p style="margin: 0; color: #92400e; line-height: 1.6; font-size: 14px;">
                {{nextSteps}}
              </p>
            </div>
            
            <!-- Keep Referring Section -->
            <div style="text-align: center; padding: 20px 0;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0;">Keep the momentum going! 🚀</h3>
              <p style="color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                Share your referral link with more wedding suppliers and earn even bigger rewards.
              </p>
              <a href="https://app.wedsync.com/referrals" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Referral Dashboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">
              This email was sent to you because you have an active referral program with WedSync.<br>
              <a href="https://wedsync.com" style="color: #667eea; text-decoration: none;">WedSync</a> | 
              <a href="{{unsubscribeUrl}}" style="color: #64748b; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `,
      text: `🎉 Referral Reward Earned!

Hello {{supplierName}}!

Fantastic news! {{referredSupplier}} has successfully joined WedSync through your referral link and upgraded to a paid plan.

Your Reward: {{rewardDescription}}
{{#monthsEarned}}
- {{monthsEarned}} month(s) of free WedSync service
{{/monthsEarned}}

What happens next?
{{nextSteps}}

Keep the momentum going! Share your referral link with more wedding suppliers and earn even bigger rewards.

View your referral dashboard: https://app.wedsync.com/referrals

---
WedSync | https://wedsync.com
Unsubscribe: {{unsubscribeUrl}}`,
    });

    // Milestone Achievement Template
    this.templates.set('milestone-achievement', {
      subject: '🏆 Milestone Unlocked: {{milestoneTitle}}!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Milestone Achieved!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{milestoneTitle}}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 24px;">Congratulations {{supplierName}}! 🎉</h2>
              <p style="color: #475569; margin: 0; font-size: 18px; line-height: 1.6;">
                You've reached an incredible milestone in our referral program!
              </p>
            </div>
            
            <!-- Milestone Stats -->
            <div style="background: #fef3c7; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
              <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
                <div style="flex: 1; min-width: 120px;">
                  <div style="font-size: 32px; font-weight: 700; color: #d97706; margin-bottom: 5px;">{{totalConversions}}</div>
                  <div style="color: #92400e; font-size: 14px; font-weight: 600;">Total Conversions</div>
                </div>
                <div style="flex: 1; min-width: 120px;">
                  <div style="font-size: 32px; font-weight: 700; color: #d97706; margin-bottom: 5px;">#{{leaderboardRank}}</div>
                  <div style="color: #92400e; font-size: 14px; font-weight: 600;">Leaderboard Rank</div>
                </div>
              </div>
            </div>
            
            <!-- Reward -->
            <div style="background: #ecfdf5; padding: 25px; border-radius: 8px; border: 1px solid #a7f3d0; margin-bottom: 25px; text-align: center;">
              <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px;">🎁 Your Milestone Reward</h3>
              <p style="margin: 0; color: #047857; font-size: 18px; font-weight: 600;">{{rewardEarned}}</p>
            </div>
            
            <!-- Description -->
            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; color: #475569; line-height: 1.6; text-align: center; font-size: 16px;">
                {{milestoneDescription}}
              </p>
            </div>
            
            <!-- CTA -->
            <div style="text-align: center;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0;">Ready for the next challenge? 🎯</h3>
              <p style="color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                Keep referring and climb even higher on our leaderboard!
              </p>
              <a href="https://app.wedsync.com/referrals/leaderboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Leaderboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">
              WedSync Referral Program | <a href="{{unsubscribeUrl}}" style="color: #64748b;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `,
      text: `🏆 Milestone Unlocked: {{milestoneTitle}}!

Congratulations {{supplierName}}! 🎉

You've reached an incredible milestone in our referral program!

Stats:
- Total Conversions: {{totalConversions}}
- Leaderboard Rank: #{{leaderboardRank}}

Your Milestone Reward: {{rewardEarned}}

{{milestoneDescription}}

Ready for the next challenge? Keep referring and climb even higher on our leaderboard!

View Leaderboard: https://app.wedsync.com/referrals/leaderboard

---
WedSync Referral Program | {{unsubscribeUrl}}`,
    });

    // Leaderboard Update Template
    this.templates.set('leaderboard-update', {
      subject: '📈 You moved up {{rankImprovement}} spots this week!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="font-size: 36px; margin-bottom: 10px;">📈</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Leaderboard Update</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 22px;">Great progress {{supplierName}}! 🚀</h2>
              <p style="color: #475569; margin: 0; font-size: 16px; line-height: 1.6;">
                Your referral efforts are paying off - you're climbing the leaderboard!
              </p>
            </div>
            
            <!-- Ranking -->
            <div style="background: #ecfdf5; padding: 25px; border-radius: 8px; border: 1px solid #a7f3d0; margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div style="text-align: center; flex: 1; min-width: 100px;">
                  <div style="font-size: 24px; font-weight: 700; color: #dc2626; margin-bottom: 5px;">#{{previousRank}}</div>
                  <div style="color: #6b7280; font-size: 12px;">Previous Rank</div>
                </div>
                <div style="color: #10b981; font-size: 24px;">→</div>
                <div style="text-align: center; flex: 1; min-width: 100px;">
                  <div style="font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 5px;">#{{currentRank}}</div>
                  <div style="color: #065f46; font-size: 12px;">Current Rank</div>
                </div>
              </div>
              <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #a7f3d0;">
                <span style="color: #047857; font-weight: 600; font-size: 18px;">↗ Up {{rankImprovement}} spots!</span>
              </div>
            </div>
            
            <!-- Performance -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 16px;">📊 This Week's Performance</h3>
              <div style="display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 18px; font-weight: 600; color: #0369a1;">{{conversionsThisWeek}}</div>
                  <div style="color: #0c4a6e; font-size: 12px;">New Conversions</div>
                </div>
                <div>
                  <div style="font-size: 18px; font-weight: 600; color: #0369a1;">{{totalConversions}}</div>
                  <div style="color: #0c4a6e; font-size: 12px;">Total Conversions</div>
                </div>
              </div>
            </div>
            
            <!-- CTA -->
            <div style="text-align: center;">
              <p style="color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                Keep up the momentum and see how high you can climb!
              </p>
              <a href="https://app.wedsync.com/referrals/leaderboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Full Leaderboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 15px 30px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">
              WedSync Weekly Leaderboard Update | <a href="{{unsubscribeUrl}}" style="color: #64748b;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `,
      text: `📈 You moved up {{rankImprovement}} spots this week!

Great progress {{supplierName}}! 🚀

Your referral efforts are paying off - you're climbing the leaderboard!

Ranking Update:
- Previous Rank: #{{previousRank}}
- Current Rank: #{{currentRank}}
- Up {{rankImprovement}} spots!

This Week's Performance:
- New Conversions: {{conversionsThisWeek}}
- Total Conversions: {{totalConversions}}

Keep up the momentum and see how high you can climb!

View Full Leaderboard: https://app.wedsync.com/referrals/leaderboard

---
WedSync Weekly Leaderboard Update | {{unsubscribeUrl}}`,
    });
  }

  async sendReferralRewardNotification(
    supplierId: string,
    reward: ReferralReward,
  ): Promise<EmailResult> {
    try {
      const supplierDetails = await this.getSupplierDetails(supplierId);
      if (!supplierDetails) {
        throw new Error('Supplier not found');
      }

      const emailData = {
        to: supplierDetails.email,
        from: 'WedSync Referrals <referrals@wedsync.com>',
        subject: "🎉 Congratulations! You've Earned a Referral Reward",
        template: 'referral-reward',
        templateData: {
          supplierName: supplierDetails.name,
          referredSupplier: reward.referredSupplierName,
          rewardDescription: reward.description,
          monthsEarned: reward.monthsEarned,
          nextSteps:
            'Your credit has been automatically applied and will be reflected in your next invoice. No action needed from you!',
          unsubscribeUrl: `https://app.wedsync.com/notifications/unsubscribe?token=${supplierDetails.unsubscribeToken}`,
        },
      };

      // Add to email queue for reliable delivery during viral periods
      await this.queueEmail('referral-reward', emailData);

      return { success: true, queued: true };
    } catch (error) {
      await this.logEmailError('referral_reward_email_failed', {
        supplierId,
        reward,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send notification',
      };
    }
  }

  async sendMilestoneAchievementEmail(
    supplierId: string,
    milestone: MilestoneAchievement,
  ): Promise<EmailResult> {
    try {
      const supplierDetails = await this.getSupplierDetails(supplierId);
      if (!supplierDetails) {
        throw new Error('Supplier not found');
      }

      const emailData = {
        to: supplierDetails.email,
        from: 'WedSync Community <community@wedsync.com>',
        subject: `🏆 Milestone Unlocked: ${milestone.title}!`,
        template: 'milestone-achievement',
        templateData: {
          supplierName: supplierDetails.name,
          milestoneTitle: milestone.title,
          milestoneDescription: milestone.description,
          rewardEarned: milestone.reward,
          totalConversions: milestone.totalConversions,
          leaderboardRank: milestone.currentRank,
          unsubscribeUrl: `https://app.wedsync.com/notifications/unsubscribe?token=${supplierDetails.unsubscribeToken}`,
        },
      };

      await this.queueEmail('milestone-achievement', emailData);
      return { success: true, queued: true };
    } catch (error) {
      await this.logEmailError('milestone_email_failed', {
        supplierId,
        milestone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send milestone notification',
      };
    }
  }

  async sendLeaderboardUpdateEmail(
    supplierId: string,
    rankingUpdate: RankingUpdate,
  ): Promise<EmailResult> {
    try {
      // Only send if there's a positive rank improvement
      if (rankingUpdate.rankImprovement <= 0) {
        return { success: true, queued: false };
      }

      const supplierDetails = await this.getSupplierDetails(supplierId);
      if (!supplierDetails) {
        throw new Error('Supplier not found');
      }

      const emailData = {
        to: supplierDetails.email,
        from: 'WedSync Leaderboards <leaderboard@wedsync.com>',
        subject: `📈 You moved up ${rankingUpdate.rankImprovement} spots this week!`,
        template: 'leaderboard-update',
        templateData: {
          supplierName: supplierDetails.name,
          currentRank: rankingUpdate.currentRank,
          previousRank: rankingUpdate.previousRank,
          rankImprovement: rankingUpdate.rankImprovement,
          category: rankingUpdate.category,
          conversionsThisWeek: rankingUpdate.newConversions,
          totalConversions: rankingUpdate.totalConversions,
          unsubscribeUrl: `https://app.wedsync.com/notifications/unsubscribe?token=${supplierDetails.unsubscribeToken}`,
        },
      };

      await this.queueEmail('leaderboard-update', emailData);
      return { success: true, queued: true };
    } catch (error) {
      await this.logEmailError('leaderboard_email_failed', {
        supplierId,
        rankingUpdate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send leaderboard update',
      };
    }
  }

  // Health check method for integration monitoring
  async getHealthStatus(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Test Resend API connectivity
      const testResult = await this.resend.emails.send({
        from: 'noreply@wedsync.com',
        to: ['test@resend.dev'], // Resend test address
        subject: 'Health Check - Referral Notifications',
        text: 'Health check test for referral notification service',
      });

      // Test database connectivity
      const { error: dbError } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (dbError) {
        throw new Error(`Database connectivity failed: ${dbError.message}`);
      }

      return {
        healthy: !testResult.error,
        responseTime: Date.now() - startTime,
        details: {
          resend_status: testResult.error ? 'error' : 'ok',
          database_connected: true,
          queued_emails: this.getTotalQueuedEmails(),
          template_count: this.templates.size,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getSupplierDetails(supplierId: string): Promise<{
    email: string;
    name: string;
    unsubscribeToken: string;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('contact_email, business_name, notification_preferences')
        .eq('id', supplierId)
        .single();

      if (error || !data) {
        return null;
      }

      // Generate unsubscribe token (in real implementation, this would be stored)
      const unsubscribeToken = Buffer.from(
        `${supplierId}:${Date.now()}`,
      ).toString('base64url');

      return {
        email: data.contact_email,
        name: data.business_name || 'Supplier',
        unsubscribeToken,
      };
    } catch (error) {
      await this.logEmailError('supplier_lookup_failed', { supplierId, error });
      return null;
    }
  }

  private async queueEmail(type: string, emailData: any): Promise<void> {
    try {
      // In production, this would use a proper queue system (Redis, Bull, etc.)
      // For now, we'll use an in-memory queue with immediate processing

      if (!this.emailQueue.has(type)) {
        this.emailQueue.set(type, []);
      }

      const queue = this.emailQueue.get(type)!;
      queue.push({
        ...emailData,
        queuedAt: new Date().toISOString(),
        attempts: 0,
      });

      // Log queuing
      console.log(`[ReferralNotifications] Email queued:`, {
        type,
        recipient: emailData.to,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ReferralNotifications] Failed to queue email:', error);
      throw error;
    }
  }

  private startEmailProcessing(): void {
    // Process email queue every 10 seconds
    setInterval(async () => {
      for (const [type, queue] of this.emailQueue.entries()) {
        if (queue.length === 0) continue;

        // Process up to 5 emails per cycle to avoid overwhelming Resend
        const emailsToProcess = queue.splice(0, 5);

        for (const emailData of emailsToProcess) {
          try {
            await this.sendEmailWithTemplate(emailData);
          } catch (error) {
            // Retry logic - requeue if attempts < 3
            if (emailData.attempts < 3) {
              emailData.attempts++;
              queue.push(emailData);
            } else {
              await this.logEmailError('email_send_failed_final', {
                type,
                emailData: { to: emailData.to, subject: emailData.subject },
                error,
              });
            }
          }
        }
      }
    }, 10000);
  }

  private async sendEmailWithTemplate(emailData: any): Promise<void> {
    const template = this.templates.get(emailData.template);
    if (!template) {
      throw new Error(`Template not found: ${emailData.template}`);
    }

    // Render template with data
    const renderedSubject = this.interpolateTemplate(
      template.subject,
      emailData.templateData,
    );
    const renderedHtml = this.interpolateTemplate(
      template.html,
      emailData.templateData,
    );
    const renderedText = this.interpolateTemplate(
      template.text,
      emailData.templateData,
    );

    // Send via Resend
    const result = await this.resend.emails.send({
      from: emailData.from,
      to: [emailData.to],
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      headers: {
        'X-Email-Type': 'referral-notification',
        'X-Template': emailData.template,
        'X-Priority': 'normal',
      },
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    console.log(`[ReferralNotifications] Email sent:`, {
      template: emailData.template,
      recipient: emailData.to,
      messageId: result.data?.id,
      timestamp: new Date().toISOString(),
    });
  }

  private interpolateTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    // Simple Handlebars-like templating
    return template
      .replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return context[key] !== undefined ? String(context[key]) : match;
      })
      .replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\w+\}\}/gs, (match, key, content) => {
        return context[key] ? content : '';
      });
  }

  private getTotalQueuedEmails(): number {
    let total = 0;
    for (const queue of this.emailQueue.values()) {
      total += queue.length;
    }
    return total;
  }

  private async logEmailError(event: string, metadata: any): Promise<void> {
    try {
      // Sanitize metadata to remove sensitive information
      const sanitizedMetadata = { ...metadata };

      // Remove sensitive email data
      if (sanitizedMetadata.emailData?.templateData) {
        delete sanitizedMetadata.emailData.templateData;
      }

      console.error(`[ReferralNotifications] ${event}:`, {
        timestamp: new Date().toISOString(),
        event,
        ...sanitizedMetadata,
        service: 'referral-notifications',
      });
    } catch (error) {
      console.error('[ReferralNotifications] Critical logging failure:', error);
    }
  }
}

// Export singleton instance for use across the application
export const referralNotificationService = new ReferralNotificationService();
