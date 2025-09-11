import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface HighRiskRequirement {
  id: string;
  guestName: string;
  category: string;
  severity: number;
  notes: string;
  emergencyContact?: string;
}

interface HighRiskNotification {
  type: string;
  weddingId: string;
  requirement: HighRiskRequirement;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

interface ComplianceIssue {
  dishName: string;
  guestName: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

interface InAppNotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface WeeklyStats {
  newRequirements: number;
  menusGenerated: number;
  complianceIssues: number;
  guestsVerified: number;
}

interface DietaryRequirement {
  id: string;
  category: string;
  notes: string;
  severity: number;
}

type NotificationQueue = Map<string, HighRiskNotification>;

export class DietaryNotificationService extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private resend: Resend;
  private notificationQueue: NotificationQueue = new Map();
  private processingQueue = false;

  constructor() {
    super();

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.resend = new Resend(process.env.RESEND_API_KEY!);
    this.setupEventListeners();
    this.startQueueProcessor();
  }

  private setupEventListeners(): void {
    // Listen for high-risk dietary requirements
    this.on(
      'high_risk_requirement_added',
      this.handleHighRiskRequirement.bind(this),
    );

    // Listen for menu compliance issues
    this.on('menu_compliance_issue', this.handleComplianceIssue.bind(this));

    // Listen for guest dietary verification requests
    this.on('verification_request', this.handleVerificationRequest.bind(this));

    // Listen for bulk updates
    this.on('bulk_requirements_updated', this.handleBulkUpdate.bind(this));
  }

  async notifyHighRiskRequirement(
    weddingId: string,
    requirement: HighRiskRequirement,
  ): Promise<void> {
    const notification: HighRiskNotification = {
      type: 'high_risk_dietary_requirement',
      weddingId,
      requirement,
      urgency: requirement.severity >= 5 ? 'critical' : 'high',
      createdAt: new Date(),
    };

    // Add to queue for processing
    this.notificationQueue.set(`${weddingId}-${requirement.id}`, notification);

    // Emit event for immediate processing
    this.emit('high_risk_requirement_added', notification);
  }

  private async handleHighRiskRequirement(
    notification: HighRiskNotification,
  ): Promise<void> {
    try {
      // Send immediate notification to supplier
      await this.sendImmediateNotification(notification);

      // Schedule follow-up notifications
      this.queueFollowUpNotifications(notification);

      // Log the notification
      await this.logNotificationActivity(notification);
    } catch (error: any) {
      console.error('Failed to handle high-risk requirement:', error);
    }
  }

  private async sendImmediateNotification(
    notification: HighRiskNotification,
  ): Promise<void> {
    // Get supplier and wedding details
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select(
        `
        *,
        organizations (
          company_name,
          contact_email,
          contact_phone,
          notification_preferences
        )
      `,
      )
      .eq('id', notification.weddingId)
      .single();

    if (!wedding) {
      console.error('Wedding not found:', notification.weddingId);
      return;
    }

    const organization = wedding.organizations;
    const requirement = notification.requirement;

    // Send email notification
    try {
      await this.resend.emails.send({
        from: 'alerts@wedsync.com',
        to: organization.contact_email,
        subject: `🚨 URGENT: High-Risk Dietary Requirement - ${wedding.couple_name}`,
        html: this.buildHighRiskAlertEmail(wedding, requirement, notification),
      });
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }

    // Send SMS if enabled
    if (
      organization.notification_preferences?.sms_enabled &&
      organization.contact_phone
    ) {
      await this.sendSMSAlert(
        organization.contact_phone,
        `🚨 HIGH-RISK DIETARY ALERT: ${requirement.guestName} has severe ${requirement.category} (Level ${requirement.severity}). Check WedSync immediately. Wedding: ${wedding.couple_name}`,
      );
    }

    // Create in-app notification
    await this.createInAppNotification({
      userId: wedding.organization_id,
      type: 'high_risk_dietary',
      title: 'High-Risk Dietary Requirement',
      message: `${requirement.guestName} has a severe ${requirement.category} requiring immediate attention`,
      data: {
        weddingId: notification.weddingId,
        requirementId: requirement.id,
      },
      urgency: notification.urgency,
    });
  }

  private buildHighRiskAlertEmail(
    wedding: any,
    requirement: HighRiskRequirement,
    notification: HighRiskNotification,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0 0 8px 0;">⚠️ HIGH-RISK DIETARY REQUIREMENT ALERT</h2>
          <p style="margin: 0; font-weight: bold;">Immediate attention required for guest safety</p>
        </div>
        
        <h3>Wedding Details</h3>
        <ul>
          <li><strong>Couple:</strong> ${wedding.couple_name}</li>
          <li><strong>Date:</strong> ${new Date(wedding.wedding_date).toLocaleDateString()}</li>
          <li><strong>Venue:</strong> ${wedding.venue_name || 'Not specified'}</li>
          <li><strong>Guest Count:</strong> ${wedding.guest_count || 'Not specified'}</li>
        </ul>

        <h3>Dietary Requirement Details</h3>
        <div style="background: #fef3c7; border: 1px solid #d97706; padding: 12px; border-radius: 6px; margin: 16px 0;">
          <ul>
            <li><strong>Guest:</strong> ${requirement.guestName}</li>
            <li><strong>Restriction:</strong> ${requirement.category}</li>
            <li><strong>Severity:</strong> Level ${requirement.severity}/5</li>
            <li><strong>Details:</strong> ${requirement.notes}</li>
            ${requirement.emergencyContact ? `<li><strong>Emergency Contact:</strong> ${requirement.emergencyContact}</li>` : ''}
          </ul>
        </div>

        <h3>Immediate Actions Required</h3>
        <ol>
          <li><strong>Review Menu:</strong> Check all planned dishes for conflicts</li>
          <li><strong>Kitchen Protocol:</strong> Implement cross-contamination prevention</li>
          <li><strong>Staff Training:</strong> Brief kitchen and service staff</li>
          <li><strong>Emergency Plan:</strong> Ensure emergency contacts are accessible</li>
          <li><strong>Verify Requirements:</strong> Contact guest to confirm details</li>
        </ol>

        <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 12px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 WedSync Recommendation:</strong> Use our AI Menu Generator to create compliant alternatives automatically.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/weddings/${notification.weddingId}/dietary" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review Dietary Requirements →
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This is an automated alert from WedSync. For support, contact us at support@wedsync.com
        </p>
      </div>
    `;
  }

  async sendMenuComplianceAlert(
    weddingId: string,
    complianceIssues: ComplianceIssue[],
  ): Promise<void> {
    const criticalIssues = complianceIssues.filter(
      (issue) => issue.riskLevel === 'critical',
    );

    if (criticalIssues.length === 0) return;

    const { data: wedding } = await this.supabase
      .from('weddings')
      .select(
        `
        *,
        organizations (company_name, contact_email, notification_preferences)
      `,
      )
      .eq('id', weddingId)
      .single();

    if (!wedding) return;

    await this.resend.emails.send({
      from: 'alerts@wedsync.com',
      to: wedding.organizations.contact_email,
      subject: `⚠️ Menu Compliance Issues - ${wedding.couple_name}`,
      html: this.buildComplianceAlertEmail(wedding, criticalIssues),
    });
  }

  private buildComplianceAlertEmail(
    wedding: any,
    issues: ComplianceIssue[],
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0;">Menu Compliance Issues Detected</h2>
        </div>
        
        <h3>Wedding: ${wedding.couple_name}</h3>
        <p>The following critical dietary compliance issues were found in your menu:</p>
        
        ${issues
          .map(
            (issue) => `
          <div style="background: #fef3c7; border: 1px solid #d97706; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <h4>${issue.dishName}</h4>
            <p><strong>Issue:</strong> ${issue.description}</p>
            <p><strong>Affected Guest:</strong> ${issue.guestName}</p>
            <p><strong>Risk Level:</strong> ${issue.riskLevel}</p>
            ${issue.suggestion ? `<p><strong>Suggestion:</strong> ${issue.suggestion}</p>` : ''}
          </div>
        `,
          )
          .join('')}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/weddings/${wedding.id}/menu/review" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review Menu →
          </a>
        </div>
      </div>
    `;
  }

  async sendGuestVerificationRequest(
    weddingId: string,
    guestEmail: string,
    requirements: DietaryRequirement[],
  ): Promise<void> {
    const verificationToken = this.generateVerificationToken();

    // Store verification request
    await this.supabase.from('dietary_verification_requests').insert({
      wedding_id: weddingId,
      guest_email: guestEmail,
      verification_token: verificationToken,
      requirements: JSON.stringify(requirements),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('couple_name, wedding_date')
      .eq('id', weddingId)
      .single();

    await this.resend.emails.send({
      from: 'noreply@wedsync.com',
      to: guestEmail,
      subject: `Please confirm your dietary requirements - ${wedding?.couple_name} Wedding`,
      html: this.buildVerificationEmail(
        wedding,
        requirements,
        verificationToken,
      ),
    });
  }

  private buildVerificationEmail(
    wedding: any,
    requirements: DietaryRequirement[],
    token: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Please Confirm Your Dietary Requirements</h2>
        <p>Hello! We want to ensure your dining experience at ${wedding?.couple_name}'s wedding is safe and enjoyable.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h3>Your Current Dietary Requirements:</h3>
          <ul>
            ${requirements
              .map(
                (req) => `
              <li><strong>${req.category}:</strong> ${req.notes}</li>
            `,
              )
              .join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-dietary/${token}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirm Requirements →
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          This link expires in 7 days. If you have any questions, please contact the wedding catering team directly.
        </p>
      </div>
    `;
  }

  async sendWeeklyDigest(organizationId: string): Promise<void> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: activities } = await this.supabase
      .from('dietary_audit_log')
      .select(
        `
        *,
        weddings (couple_name, wedding_date)
      `,
      )
      .eq('organization_id', organizationId)
      .gte('created_at', weekStart.toISOString());

    if (!activities || activities.length === 0) return;

    const { data: organization } = await this.supabase
      .from('organizations')
      .select('company_name, contact_email, notification_preferences')
      .eq('id', organizationId)
      .single();

    if (!organization?.notification_preferences?.weekly_digest) return;

    await this.resend.emails.send({
      from: 'digest@wedsync.com',
      to: organization.contact_email,
      subject: 'Weekly Dietary Management Summary - WedSync',
      html: this.buildWeeklyDigest(organization, activities),
    });
  }

  private buildWeeklyDigest(organization: any, activities: any[]): string {
    const stats = this.calculateWeeklyStats(activities);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Weekly Dietary Management Summary</h2>
        <p>Here's what happened with your dietary management this week:</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;">
          <div style="background: #f0f9ff; padding: 16px; border-radius: 6px; text-align: center;">
            <h3 style="color: #0369a1; margin: 0 0 8px 0;">${stats.newRequirements}</h3>
            <p style="margin: 0; color: #0369a1;">New Requirements</p>
          </div>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; text-align: center;">
            <h3 style="color: #166534; margin: 0 0 8px 0;">${stats.menusGenerated}</h3>
            <p style="margin: 0; color: #166534;">Menus Generated</p>
          </div>
        </div>
        
        <h3>Recent Activities</h3>
        <ul>
          ${activities
            .slice(0, 10)
            .map(
              (activity) => `
            <li>${activity.weddings?.couple_name || 'Unknown'}: ${this.formatActivityDescription(activity)}</li>
          `,
            )
            .join('')}
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dietary" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Dashboard →
          </a>
        </div>
      </div>
    `;
  }

  private calculateWeeklyStats(activities: any[]): WeeklyStats {
    return {
      newRequirements: activities.filter(
        (a) => a.action_type === 'requirement_added',
      ).length,
      menusGenerated: activities.filter(
        (a) => a.action_type === 'menu_generated',
      ).length,
      complianceIssues: activities.filter(
        (a) => a.action_type === 'compliance_issue',
      ).length,
      guestsVerified: activities.filter(
        (a) => a.action_type === 'guest_verified',
      ).length,
    };
  }

  private formatActivityDescription(activity: any): string {
    const descriptions = {
      requirement_added: 'New dietary requirement added',
      menu_generated: 'AI menu generated',
      compliance_issue: 'Compliance issue detected',
      guest_verified: 'Guest dietary requirements verified',
    };

    return (
      descriptions[activity.action_type as keyof typeof descriptions] ||
      'Activity recorded'
    );
  }

  private async sendSMSAlert(phone: string, message: string): Promise<void> {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.warn('Twilio credentials not configured for SMS alerts');
        return;
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
              ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_PHONE_NUMBER!,
            To: phone,
            Body: message,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`SMS send failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
    }
  }

  private async createInAppNotification(
    notification: InAppNotification,
  ): Promise<void> {
    try {
      await this.supabase.from('notifications').insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: JSON.stringify(notification.data),
        urgency: notification.urgency,
        read: false,
      });
    } catch (error) {
      console.error('Failed to create in-app notification:', error);
    }
  }

  private generateVerificationToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64url');
  }

  private async logNotificationActivity(
    notification: HighRiskNotification,
  ): Promise<void> {
    try {
      await this.supabase.from('dietary_audit_log').insert({
        wedding_id: notification.weddingId,
        action_type: 'high_risk_notification_sent',
        details: JSON.stringify({
          guestName: notification.requirement.guestName,
          category: notification.requirement.category,
          severity: notification.requirement.severity,
          urgency: notification.urgency,
        }),
        user_id: null, // System generated
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification activity:', error);
    }
  }

  // Queue processing for batching notifications
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue && this.notificationQueue.size > 0) {
        this.processNotificationQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      const notifications = Array.from(this.notificationQueue.values());
      const batchSize = 10;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);

        await Promise.all(
          batch.map((notification) =>
            this.handleHighRiskRequirement(notification).catch((error) =>
              console.error('Failed to process notification:', error),
            ),
          ),
        );
      }

      // Clear processed notifications
      this.notificationQueue.clear();
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  // Queue management for batch notifications
  private queueFollowUpNotifications(notification: HighRiskNotification): void {
    // Schedule reminder if not acknowledged within 1 hour
    setTimeout(
      () => {
        this.sendFollowUpReminder(notification);
      },
      60 * 60 * 1000,
    );
  }

  private async sendFollowUpReminder(
    notification: HighRiskNotification,
  ): Promise<void> {
    try {
      // Check if requirement has been acknowledged
      const { data: requirement } = await this.supabase
        .from('guest_dietary_requirements')
        .select('supplier_notes, acknowledged_at')
        .eq('id', notification.requirement.id)
        .single();

      if (requirement?.acknowledged_at) {
        return; // Already acknowledged
      }

      // Send follow-up notification
      await this.sendImmediateNotification({
        ...notification,
        type: 'high_risk_follow_up',
        urgency: 'critical',
      });
    } catch (error) {
      console.error('Failed to send follow-up reminder:', error);
    }
  }

  // Event handlers
  private async handleComplianceIssue(data: any): Promise<void> {
    await this.sendMenuComplianceAlert(data.weddingId, data.issues);
  }

  private async handleVerificationRequest(data: any): Promise<void> {
    await this.sendGuestVerificationRequest(
      data.weddingId,
      data.guestEmail,
      data.requirements,
    );
  }

  private async handleBulkUpdate(data: any): Promise<void> {
    // Log bulk update activity
    await this.supabase.from('dietary_audit_log').insert({
      wedding_id: data.weddingId,
      action_type: 'bulk_requirements_updated',
      details: JSON.stringify({
        updatedCount: data.updatedCount,
        errorCount: data.errorCount,
      }),
      user_id: null,
      created_at: new Date().toISOString(),
    });
  }

  // Public methods for external triggering
  async triggerHighRiskAlert(
    weddingId: string,
    requirementId: string,
  ): Promise<void> {
    const { data: requirement } = await this.supabase
      .from('guest_dietary_requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (!requirement || requirement.severity_level < 4) return;

    const highRiskReq: HighRiskRequirement = {
      id: requirement.id,
      guestName: requirement.guest_name,
      category: requirement.dietary_category_id,
      severity: requirement.severity_level,
      notes: requirement.specific_notes || '',
      emergencyContact: requirement.emergency_contact,
    };

    await this.notifyHighRiskRequirement(weddingId, highRiskReq);
  }

  async triggerVerificationRequest(
    weddingId: string,
    guestEmail: string,
  ): Promise<void> {
    const { data: requirements } = await this.supabase
      .from('guest_dietary_requirements')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('guest_email', guestEmail);

    if (!requirements || requirements.length === 0) return;

    const dietaryReqs: DietaryRequirement[] = requirements.map((req) => ({
      id: req.id,
      category: req.dietary_category_id,
      notes: req.specific_notes || '',
      severity: req.severity_level,
    }));

    await this.sendGuestVerificationRequest(weddingId, guestEmail, dietaryReqs);
  }

  // Health check for the notification service
  async getServiceHealth(): Promise<{ status: string; metrics: any }> {
    try {
      // Test Supabase connection
      const { data } = await this.supabase
        .from('notifications')
        .select('id')
        .limit(1);

      return {
        status: 'healthy',
        metrics: {
          queueSize: this.notificationQueue.size,
          processingQueue: this.processingQueue,
          resendConnected: !!this.resend,
          supabaseConnected: !!data || data === null, // null is OK, means table exists
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        metrics: {
          error: (error as Error).message,
          queueSize: this.notificationQueue.size,
          processingQueue: this.processingQueue,
        },
      };
    }
  }
}
