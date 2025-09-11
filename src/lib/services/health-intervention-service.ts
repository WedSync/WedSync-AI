/**
 * WS-168: Health Intervention Email Service
 * Automated email notifications for at-risk suppliers with health score monitoring
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { customerHealthService } from './customer-health-service';
import { emailService } from '@/lib/email/service';
import { redis } from '@/lib/redis';

export interface HealthInterventionConfig {
  enabled: boolean;
  thresholds: {
    critical: number; // < 30
    high: number; // < 50
    medium: number; // < 70
    low: number; // < 85
  };
  notificationSettings: {
    adminAlerts: boolean;
    supplierEmails: boolean;
    successManagerTasks: boolean;
  };
  cooldownPeriods: {
    critical: number; // hours
    high: number;
    medium: number;
    low: number;
  };
}

export interface InterventionNotification {
  id: string;
  supplierId: string;
  supplierEmail: string;
  supplierName: string;
  organizationId: string;
  healthScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  interventionType: 'email' | 'admin_alert' | 'success_task';
  templateId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  response?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAlert {
  id: string;
  alertType: 'critical_health' | 'mass_churn_risk' | 'engagement_drop';
  severity: 'critical' | 'high' | 'medium';
  affectedSuppliers: string[];
  message: string;
  actionItems: string[];
  notifiedAdmins: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface InterventionTemplate {
  id: string;
  name: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  subject: string;
  previewText: string;
  bodyHtml: string;
  bodyText: string;
  callToActions: InterventionCTA[];
  personalizationTokens: string[];
  isActive: boolean;
}

export interface InterventionCTA {
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'danger';
  trackingId: string;
}

export interface InterventionMetrics {
  date: Date;
  totalInterventions: number;
  byRiskLevel: Record<string, number>;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  suppliersReactivated: number;
  healthScoreImprovements: number;
  averageResponseTime: number;
}

const interventionConfigSchema = z.object({
  supplierId: z.string().uuid(),
  organizationId: z.string().uuid(),
  forceNotification: z.boolean().default(false),
});

export class HealthInterventionService {
  private supabase: SupabaseClient;
  private cachePrefix = 'health_intervention:';
  private cacheTTL = 3600; // 1 hour
  private defaultConfig: HealthInterventionConfig = {
    enabled: true,
    thresholds: {
      critical: 30,
      high: 50,
      medium: 70,
      low: 85,
    },
    notificationSettings: {
      adminAlerts: true,
      supplierEmails: true,
      successManagerTasks: true,
    },
    cooldownPeriods: {
      critical: 24, // 24 hours
      high: 72, // 3 days
      medium: 168, // 1 week
      low: 336, // 2 weeks
    },
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Process health score and trigger interventions if needed
   */
  async processHealthIntervention(
    supplierId: string,
    organizationId: string,
    forceNotification = false,
  ): Promise<{
    interventionTriggered: boolean;
    notifications: InterventionNotification[];
    adminAlerts: AdminAlert[];
  }> {
    const validation = interventionConfigSchema.safeParse({
      supplierId,
      organizationId,
      forceNotification,
    });

    if (!validation.success) {
      throw new Error(`Invalid parameters: ${validation.error.message}`);
    }

    try {
      // Step 1: Get current health score
      const healthResult =
        await customerHealthService.calculateHealthScoreFromActivity(
          supplierId,
          organizationId,
          '30d',
        );

      const overallScore = healthResult.healthScore.overallHealth;
      const riskLevel = this.determineRiskLevel(overallScore);

      // Step 2: Check if intervention is needed
      const shouldIntervene = await this.shouldTriggerIntervention(
        supplierId,
        riskLevel,
        forceNotification,
      );

      if (!shouldIntervene) {
        return {
          interventionTriggered: false,
          notifications: [],
          adminAlerts: [],
        };
      }

      // Step 3: Get supplier details
      const supplier = await this.getSupplierDetails(supplierId);
      if (!supplier) {
        throw new Error(`Supplier not found: ${supplierId}`);
      }

      const notifications: InterventionNotification[] = [];
      const adminAlerts: AdminAlert[] = [];

      // Step 4: Send supplier email notification
      if (this.defaultConfig.notificationSettings.supplierEmails) {
        const notification = await this.sendSupplierInterventionEmail(
          supplier,
          healthResult,
          riskLevel,
          organizationId,
        );
        notifications.push(notification);
      }

      // Step 5: Create admin alert for critical cases
      if (
        this.defaultConfig.notificationSettings.adminAlerts &&
        (riskLevel === 'critical' || riskLevel === 'high')
      ) {
        const alert = await this.createAdminAlert(
          supplier,
          healthResult,
          riskLevel,
          organizationId,
        );
        adminAlerts.push(alert);
      }

      // Step 6: Create success manager task if enabled
      if (
        this.defaultConfig.notificationSettings.successManagerTasks &&
        riskLevel === 'critical'
      ) {
        await this.createSuccessManagerTask(
          supplier,
          healthResult,
          organizationId,
        );
      }

      // Step 7: Record intervention in cache to respect cooldown
      await this.recordIntervention(supplierId, riskLevel);

      // Step 8: Track metrics
      await this.trackInterventionMetrics(riskLevel, organizationId);

      return {
        interventionTriggered: true,
        notifications,
        adminAlerts,
      };
    } catch (error) {
      console.error('Error processing health intervention:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple suppliers for health interventions
   */
  async batchProcessInterventions(
    organizationId: string,
    supplierIds?: string[],
  ): Promise<{
    processed: number;
    interventions: number;
    notifications: InterventionNotification[];
    adminAlerts: AdminAlert[];
  }> {
    try {
      // Get suppliers to process
      const suppliers =
        supplierIds || (await this.getActiveSuppliers(organizationId));

      const allNotifications: InterventionNotification[] = [];
      const allAdminAlerts: AdminAlert[] = [];
      let interventionCount = 0;

      // Process in batches of 10
      const batchSize = 10;
      for (let i = 0; i < suppliers.length; i += batchSize) {
        const batch = suppliers.slice(i, i + batchSize);

        const promises = batch.map((supplierId) =>
          this.processHealthIntervention(supplierId, organizationId).catch(
            (error) => {
              console.error(`Error processing supplier ${supplierId}:`, error);
              return {
                interventionTriggered: false,
                notifications: [],
                adminAlerts: [],
              };
            },
          ),
        );

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result.interventionTriggered) {
            interventionCount++;
            allNotifications.push(...result.notifications);
            allAdminAlerts.push(...result.adminAlerts);
          }
        });
      }

      // Consolidate admin alerts if multiple critical issues
      if (allAdminAlerts.length > 3) {
        const consolidatedAlert = await this.createConsolidatedAdminAlert(
          allAdminAlerts,
          organizationId,
        );
        return {
          processed: suppliers.length,
          interventions: interventionCount,
          notifications: allNotifications,
          adminAlerts: [consolidatedAlert],
        };
      }

      return {
        processed: suppliers.length,
        interventions: interventionCount,
        notifications: allNotifications,
        adminAlerts: allAdminAlerts,
      };
    } catch (error) {
      console.error('Error in batch intervention processing:', error);
      throw error;
    }
  }

  /**
   * Send intervention email to supplier
   */
  private async sendSupplierInterventionEmail(
    supplier: any,
    healthResult: any,
    riskLevel: string,
    organizationId: string,
  ): Promise<InterventionNotification> {
    const template = await this.getInterventionTemplate(riskLevel);

    // Personalize content
    const personalizedContent = this.personalizeTemplate(template, {
      supplierName: supplier.name,
      businessName: supplier.business_name,
      healthScore: healthResult.healthScore.overallHealth,
      recommendations: healthResult.recommendations.slice(0, 3),
      riskIndicators: healthResult.riskIndicators,
    });

    // Create notification record
    const notification: InterventionNotification = {
      id: crypto.randomUUID(),
      supplierId: supplier.id,
      supplierEmail: supplier.email,
      supplierName: supplier.name,
      organizationId,
      healthScore: healthResult.healthScore.overallHealth,
      riskLevel: riskLevel as any,
      interventionType: 'email',
      templateId: template.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Send email using existing email service
      await emailService.sendEmail({
        to: supplier.email,
        subject: personalizedContent.subject,
        template: this.createEmailTemplate(personalizedContent),
        organizationId,
        recipientId: supplier.id,
        recipientType: 'vendor',
        templateType: 'health_intervention',
        priority: riskLevel === 'critical' ? 'urgent' : 'high',
        variables: {
          recipientName: supplier.name,
          ...personalizedContent,
        },
      });

      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = 'failed';
      console.error('Failed to send intervention email:', error);
    }

    // Store notification in database
    await this.storeNotification(notification);

    return notification;
  }

  /**
   * Create admin alert for critical health scores
   */
  private async createAdminAlert(
    supplier: any,
    healthResult: any,
    riskLevel: string,
    organizationId: string,
  ): Promise<AdminAlert> {
    const alert: AdminAlert = {
      id: crypto.randomUUID(),
      alertType: 'critical_health',
      severity: riskLevel === 'critical' ? 'critical' : 'high',
      affectedSuppliers: [supplier.id],
      message: `${supplier.business_name} has a ${riskLevel} health score of ${healthResult.healthScore.overallHealth}%`,
      actionItems: [
        `Review ${supplier.business_name}'s recent activity`,
        'Schedule a check-in call with the supplier',
        'Review their support ticket history',
        'Consider offering personalized training or resources',
        'Monitor for improvement over the next 7 days',
      ],
      notifiedAdmins: [],
      acknowledged: false,
      createdAt: new Date(),
    };

    // Get admin emails
    const admins = await this.getOrganizationAdmins(organizationId);

    // Send admin notifications
    for (const admin of admins) {
      try {
        await this.sendAdminAlertEmail(admin, alert, supplier, healthResult);
        alert.notifiedAdmins.push(admin.email);
      } catch (error) {
        console.error(`Failed to notify admin ${admin.email}:`, error);
      }
    }

    // Store alert in database
    await this.storeAdminAlert(alert);

    return alert;
  }

  /**
   * Send admin alert email
   */
  private async sendAdminAlertEmail(
    admin: any,
    alert: AdminAlert,
    supplier: any,
    healthResult: any,
  ): Promise<void> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/customer-success/alerts/${alert.id}`;
    const supplierUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/suppliers/${supplier.id}`;

    await emailService.sendEmail({
      to: admin.email,
      subject: `🚨 ${alert.severity === 'critical' ? 'CRITICAL' : 'HIGH'} Health Score Alert: ${supplier.business_name}`,
      template: this.createAdminAlertTemplate({
        adminName: admin.name,
        alert,
        supplier,
        healthScore: healthResult.healthScore.overallHealth,
        dashboardUrl,
        supplierUrl,
        topRisks: healthResult.riskIndicators.slice(0, 3),
      }),
      organizationId: admin.organization_id,
      recipientId: admin.id,
      recipientType: 'admin',
      templateType: 'admin_health_alert',
      priority: 'urgent',
      variables: {
        recipientName: admin.name,
      },
    });
  }

  // Template methods
  private async getInterventionTemplate(
    riskLevel: string,
  ): Promise<InterventionTemplate> {
    // This would typically fetch from database
    // For now, return mock template based on risk level
    const templates: Record<string, InterventionTemplate> = {
      critical: {
        id: 'tpl_critical_001',
        name: 'Critical Health Intervention',
        riskLevel: 'critical',
        subject: '🚨 Urgent: Your WedSync account needs attention',
        previewText:
          "We noticed you haven't been active recently. Let us help you get back on track.",
        bodyHtml: '',
        bodyText: '',
        callToActions: [
          {
            text: 'Schedule a Call',
            url: '/schedule-success-call',
            style: 'primary',
            trackingId: 'cta_schedule_call',
          },
          {
            text: 'View Resources',
            url: '/help-center',
            style: 'secondary',
            trackingId: 'cta_resources',
          },
        ],
        personalizationTokens: ['supplierName', 'businessName', 'healthScore'],
        isActive: true,
      },
      high: {
        id: 'tpl_high_001',
        name: 'High Risk Intervention',
        riskLevel: 'high',
        subject: "⚠️ Let's improve your WedSync experience together",
        previewText:
          'Your engagement has dropped. Here are personalized tips to help.',
        bodyHtml: '',
        bodyText: '',
        callToActions: [
          {
            text: 'View Recommendations',
            url: '/dashboard/recommendations',
            style: 'primary',
            trackingId: 'cta_recommendations',
          },
        ],
        personalizationTokens: ['supplierName', 'recommendations'],
        isActive: true,
      },
      medium: {
        id: 'tpl_medium_001',
        name: 'Medium Risk Intervention',
        riskLevel: 'medium',
        subject: '💡 Tips to get more from WedSync',
        previewText: 'Discover features you might be missing.',
        bodyHtml: '',
        bodyText: '',
        callToActions: [
          {
            text: 'Explore Features',
            url: '/features',
            style: 'primary',
            trackingId: 'cta_features',
          },
        ],
        personalizationTokens: ['supplierName', 'unusedFeatures'],
        isActive: true,
      },
      low: {
        id: 'tpl_low_001',
        name: 'Low Risk Engagement',
        riskLevel: 'low',
        subject: '✨ New features to boost your wedding business',
        previewText: "Check out what's new in WedSync.",
        bodyHtml: '',
        bodyText: '',
        callToActions: [
          {
            text: "See What's New",
            url: '/whats-new',
            style: 'primary',
            trackingId: 'cta_whats_new',
          },
        ],
        personalizationTokens: ['supplierName'],
        isActive: true,
      },
    };

    return templates[riskLevel] || templates.medium;
  }

  private personalizeTemplate(template: InterventionTemplate, data: any): any {
    const personalized = { ...template };

    // Replace tokens in subject and body
    personalized.subject = this.replaceTokens(template.subject, data);
    personalized.bodyHtml = this.generateInterventionEmailBody(template, data);
    personalized.bodyText = this.stripHtml(personalized.bodyHtml);

    return personalized;
  }

  private replaceTokens(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, token) => {
      return data[token] || match;
    });
  }

  private generateInterventionEmailBody(
    template: InterventionTemplate,
    data: any,
  ): string {
    // Generate personalized email body based on template and data
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <h2>Hi ${data.supplierName},</h2>
        
        ${
          template.riskLevel === 'critical'
            ? `
          <p style="color: #dc3545; font-weight: bold;">
            We've noticed your engagement with WedSync has significantly decreased. 
            Your current health score is ${data.healthScore}%.
          </p>
          <p>
            We're here to help you get back on track and make the most of your WedSync subscription.
          </p>
        `
            : ''
        }
        
        ${
          data.recommendations
            ? `
          <h3>Personalized Recommendations:</h3>
          <ul>
            ${data.recommendations
              .map(
                (rec: any) => `
              <li>
                <strong>${rec.title}</strong><br>
                ${rec.description}
              </li>
            `,
              )
              .join('')}
          </ul>
        `
            : ''
        }
        
        <div style="margin: 30px 0;">
          ${template.callToActions
            .map(
              (cta) => `
            <a href="${process.env.NEXT_PUBLIC_APP_URL}${cta.url}?utm_source=intervention&utm_medium=email&utm_campaign=${template.id}&tracking=${cta.trackingId}" 
               style="display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; 
                      background-color: ${cta.style === 'primary' ? '#007bff' : '#6c757d'}; 
                      color: white; text-decoration: none; border-radius: 5px;">
              ${cta.text}
            </a>
          `,
            )
            .join('')}
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The WedSync Success Team
        </p>
      </div>
    `;
  }

  private createEmailTemplate(content: any): React.ReactElement {
    // This would return a proper React email component
    // For now, returning a mock element
    return {
      type: 'div',
      props: {
        dangerouslySetInnerHTML: { __html: content.bodyHtml },
      },
    } as any;
  }

  private createAdminAlertTemplate(data: any): React.ReactElement {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="background-color: ${data.alert.severity === 'critical' ? '#dc3545' : '#ffc107'}; 
                    color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">
            ${data.alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ HIGH'} Health Score Alert
          </h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #dee2e6; border-top: none;">
          <h2>Supplier Details:</h2>
          <ul>
            <li><strong>Business:</strong> ${data.supplier.business_name}</li>
            <li><strong>Contact:</strong> ${data.supplier.name} (${data.supplier.email})</li>
            <li><strong>Health Score:</strong> ${data.healthScore}%</li>
            <li><strong>Risk Level:</strong> ${data.alert.severity}</li>
          </ul>
          
          <h3>Top Risk Indicators:</h3>
          <ul>
            ${data.topRisks
              .map(
                (risk: any) => `
              <li>
                <strong>${risk.type}:</strong> ${risk.description}
                (Current: ${risk.currentValue}, Threshold: ${risk.threshold})
              </li>
            `,
              )
              .join('')}
          </ul>
          
          <h3>Recommended Actions:</h3>
          <ol>
            ${data.alert.actionItems
              .map(
                (item: string) => `
              <li>${item}</li>
            `,
              )
              .join('')}
          </ol>
          
          <div style="margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="display: inline-block; padding: 12px 24px; margin-right: 10px;
                      background-color: #dc3545; color: white; text-decoration: none; 
                      border-radius: 5px;">
              View Alert Details
            </a>
            <a href="${data.supplierUrl}" 
               style="display: inline-block; padding: 12px 24px;
                      background-color: #6c757d; color: white; text-decoration: none; 
                      border-radius: 5px;">
              View Supplier Profile
            </a>
          </div>
        </div>
      </div>
    `;

    return {
      type: 'div',
      props: {
        dangerouslySetInnerHTML: { __html: html },
      },
    } as any;
  }

  private createConsolidatedAdminAlert(
    alerts: AdminAlert[],
    organizationId: string,
  ): Promise<AdminAlert> {
    const consolidatedAlert: AdminAlert = {
      id: crypto.randomUUID(),
      alertType: 'mass_churn_risk',
      severity: 'critical',
      affectedSuppliers: alerts.flatMap((a) => a.affectedSuppliers),
      message: `${alerts.length} suppliers are at critical risk. Immediate action required.`,
      actionItems: [
        'Review the customer success dashboard for full details',
        'Schedule emergency success team meeting',
        'Prioritize outreach to critical accounts',
        'Prepare retention offers or incentives',
        'Analyze common patterns across at-risk accounts',
      ],
      notifiedAdmins: [],
      acknowledged: false,
      createdAt: new Date(),
    };

    return Promise.resolve(consolidatedAlert);
  }

  // Helper methods
  private determineRiskLevel(
    healthScore: number,
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (healthScore < this.defaultConfig.thresholds.critical) return 'critical';
    if (healthScore < this.defaultConfig.thresholds.high) return 'high';
    if (healthScore < this.defaultConfig.thresholds.medium) return 'medium';
    if (healthScore < this.defaultConfig.thresholds.low) return 'low';
    return 'low';
  }

  private async shouldTriggerIntervention(
    supplierId: string,
    riskLevel: string,
    forceNotification: boolean,
  ): Promise<boolean> {
    if (forceNotification) return true;

    const cacheKey = `${this.cachePrefix}last_intervention:${supplierId}:${riskLevel}`;

    try {
      const lastIntervention = await redis.get(cacheKey);
      if (!lastIntervention) return true;

      const lastInterventionData = JSON.parse(lastIntervention);
      const hoursSinceLastIntervention =
        (Date.now() - new Date(lastInterventionData.timestamp).getTime()) /
        (1000 * 60 * 60);

      const cooldownHours =
        this.defaultConfig.cooldownPeriods[
          riskLevel as keyof typeof this.defaultConfig.cooldownPeriods
        ];

      return hoursSinceLastIntervention >= cooldownHours;
    } catch (error) {
      console.error('Error checking intervention cooldown:', error);
      return true;
    }
  }

  private async recordIntervention(
    supplierId: string,
    riskLevel: string,
  ): Promise<void> {
    const cacheKey = `${this.cachePrefix}last_intervention:${supplierId}:${riskLevel}`;
    const data = {
      timestamp: new Date().toISOString(),
      riskLevel,
    };

    try {
      const cooldownHours =
        this.defaultConfig.cooldownPeriods[
          riskLevel as keyof typeof this.defaultConfig.cooldownPeriods
        ];
      await redis.setex(cacheKey, cooldownHours * 3600, JSON.stringify(data));
    } catch (error) {
      console.error('Error recording intervention:', error);
    }
  }

  private async getSupplierDetails(supplierId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', supplierId)
      .single();

    return error ? null : data;
  }

  private async getActiveSuppliers(organizationId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'supplier')
      .eq('status', 'active');

    return error ? [] : data.map((m) => m.user_id);
  }

  private async getOrganizationAdmins(organizationId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(
        `
        user_id,
        user_profiles (
          id,
          email,
          full_name
        )
      `,
      )
      .eq('organization_id', organizationId)
      .in('role', ['admin', 'owner'])
      .eq('status', 'active');

    if (error || !data) return [];

    return data.map((m) => ({
      id: m.user_profiles.id,
      email: m.user_profiles.email,
      name: m.user_profiles.full_name,
      organization_id: organizationId,
    }));
  }

  private async createSuccessManagerTask(
    supplier: any,
    healthResult: any,
    organizationId: string,
  ): Promise<void> {
    // Create a task for success manager to follow up
    const task = {
      id: crypto.randomUUID(),
      title: `Follow up with at-risk supplier: ${supplier.business_name}`,
      description: `Health score: ${healthResult.healthScore.overallHealth}%. Immediate intervention required.`,
      priority: 'urgent',
      assignee: 'success_team',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      relatedEntity: {
        type: 'supplier',
        id: supplier.id,
      },
      organizationId,
      createdAt: new Date(),
    };

    // Store task in database
    const { error } = await this.supabase
      .from('success_manager_tasks')
      .insert(task);

    if (error) {
      console.error('Error creating success manager task:', error);
    }
  }

  private async storeNotification(
    notification: InterventionNotification,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('intervention_notifications')
      .insert(notification);

    if (error) {
      console.error('Error storing intervention notification:', error);
    }
  }

  private async storeAdminAlert(alert: AdminAlert): Promise<void> {
    const { error } = await this.supabase.from('admin_alerts').insert(alert);

    if (error) {
      console.error('Error storing admin alert:', error);
    }
  }

  private async trackInterventionMetrics(
    riskLevel: string,
    organizationId: string,
  ): Promise<void> {
    // Track intervention metrics for reporting
    const metricsKey = `${this.cachePrefix}metrics:${organizationId}:${new Date().toISOString().split('T')[0]}`;

    try {
      const existing = await redis.get(metricsKey);
      const metrics = existing
        ? JSON.parse(existing)
        : {
            date: new Date(),
            totalInterventions: 0,
            byRiskLevel: {},
            emailsSent: 0,
          };

      metrics.totalInterventions++;
      metrics.byRiskLevel[riskLevel] =
        (metrics.byRiskLevel[riskLevel] || 0) + 1;
      metrics.emailsSent++;

      await redis.setex(metricsKey, 86400, JSON.stringify(metrics)); // 24 hours
    } catch (error) {
      console.error('Error tracking intervention metrics:', error);
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Get intervention metrics for reporting
   */
  async getInterventionMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<InterventionMetrics[]> {
    const { data, error } = await this.supabase
      .from('intervention_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    return error ? [] : data;
  }

  /**
   * Update notification tracking (opened, clicked, etc)
   */
  async updateNotificationTracking(
    notificationId: string,
    event: 'opened' | 'clicked' | 'responded',
    metadata?: any,
  ): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (event === 'opened') {
      updateData.openedAt = new Date();
    } else if (event === 'clicked') {
      updateData.clickedAt = new Date();
    } else if (event === 'responded') {
      updateData.response = metadata?.response || 'engaged';
    }

    const { error } = await this.supabase
      .from('intervention_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating notification tracking:', error);
    }
  }
}

// Export singleton instance
export const healthInterventionService = new HealthInterventionService();
