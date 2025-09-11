/**
 * Critical Dietary Alert System
 * Handles life-threatening allergy notifications and emergency alerts
 *
 * CRITICAL: This system handles medical information that could be life-threatening
 * All alerts must be redundant, logged, and guaranteed delivery
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Alert severity levels
export enum AlertSeverity {
  LIFE_THREATENING = 'LIFE_THREATENING', // Anaphylaxis risk
  CRITICAL = 'CRITICAL', // Severe reactions
  HIGH = 'HIGH', // Important restrictions
  MEDIUM = 'MEDIUM', // Preferences that matter
  LOW = 'LOW', // General preferences
}

// Alert delivery channels
export enum DeliveryChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  ALL = 'ALL',
}

// Allergy/dietary restriction schema
const DietaryAlertSchema = z.object({
  guestId: z.string(),
  guestName: z.string(),
  restriction: z.string(),
  severity: z.nativeEnum(AlertSeverity),
  medicalNotes: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  crossContaminationRisk: z.boolean().default(false),
  requiresEpipen: z.boolean().default(false),
  hospitalNearby: z.string().optional(),
  lastUpdated: z.date(),
  verifiedBy: z.string().optional(),
});

export type DietaryAlert = z.infer<typeof DietaryAlertSchema>;

// Alert recipient schema
const AlertRecipientSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['CATERER', 'PLANNER', 'VENUE', 'MEDICAL', 'CLIENT']),
  channels: z.array(z.nativeEnum(DeliveryChannel)),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export type AlertRecipient = z.infer<typeof AlertRecipientSchema>;

// Alert notification schema
const AlertNotificationSchema = z.object({
  id: z.string(),
  alertId: z.string(),
  recipientId: z.string(),
  channel: z.nativeEnum(DeliveryChannel),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED']),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  acknowledgedAt: z.date().optional(),
  retryCount: z.number().default(0),
  error: z.string().optional(),
});

export type AlertNotification = z.infer<typeof AlertNotificationSchema>;

export class DietaryAlertService {
  private supabase: any;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second, exponential backoff

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a critical dietary alert with redundant notification
   */
  async createCriticalAlert(alert: DietaryAlert): Promise<string> {
    try {
      // Validate the alert data
      const validatedAlert = DietaryAlertSchema.parse(alert);

      // Generate unique alert ID
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the alert in database with transaction
      const { data: storedAlert, error } = await this.supabase
        .from('dietary_alerts')
        .insert({
          id: alertId,
          ...validatedAlert,
          created_at: new Date().toISOString(),
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store alert: ${error.message}`);
      }

      // Get all relevant recipients based on severity
      const recipients = await this.getAlertRecipients(validatedAlert.severity);

      // Send notifications through all channels for life-threatening alerts
      if (validatedAlert.severity === AlertSeverity.LIFE_THREATENING) {
        await this.sendLifeThreateningAlerts(
          alertId,
          validatedAlert,
          recipients,
        );
      } else {
        await this.sendStandardAlerts(alertId, validatedAlert, recipients);
      }

      // Log the alert creation for audit
      await this.logAlertAudit(alertId, 'CREATED', validatedAlert);

      return alertId;
    } catch (error) {
      // Critical error - ensure it's logged and escalated
      console.error('CRITICAL: Failed to create dietary alert', error);
      await this.escalateFailedAlert(alert, error as Error);
      throw error;
    }
  }

  /**
   * Send life-threatening allergy alerts through ALL channels
   */
  private async sendLifeThreateningAlerts(
    alertId: string,
    alert: DietaryAlert,
    recipients: AlertRecipient[],
  ): Promise<void> {
    const notifications: Promise<AlertNotification>[] = [];

    for (const recipient of recipients) {
      // For life-threatening, use ALL channels available
      const channels = [
        DeliveryChannel.SMS,
        DeliveryChannel.EMAIL,
        DeliveryChannel.PUSH,
        DeliveryChannel.WEBHOOK,
      ];

      for (const channel of channels) {
        if (this.canUseChannel(recipient, channel)) {
          notifications.push(
            this.sendNotificationWithRetry(
              alertId,
              alert,
              recipient,
              channel,
              0,
            ),
          );
        }
      }
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notifications);

    // Check for any failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      // At least one channel must succeed for life-threatening alerts
      const successes = results.filter((r) => r.status === 'fulfilled');
      if (successes.length === 0) {
        throw new Error(
          'CRITICAL: All notification channels failed for life-threatening alert',
        );
      }

      // Log failures for investigation
      for (const failure of failures) {
        if (failure.status === 'rejected') {
          console.error('Notification channel failed:', failure.reason);
        }
      }
    }
  }

  /**
   * Send standard dietary alerts based on configured channels
   */
  private async sendStandardAlerts(
    alertId: string,
    alert: DietaryAlert,
    recipients: AlertRecipient[],
  ): Promise<void> {
    const notifications: Promise<AlertNotification>[] = [];

    for (const recipient of recipients) {
      for (const channel of recipient.channels) {
        notifications.push(
          this.sendNotificationWithRetry(alertId, alert, recipient, channel, 0),
        );
      }
    }

    await Promise.allSettled(notifications);
  }

  /**
   * Send notification with exponential backoff retry
   */
  private async sendNotificationWithRetry(
    alertId: string,
    alert: DietaryAlert,
    recipient: AlertRecipient,
    channel: DeliveryChannel,
    retryCount: number,
  ): Promise<AlertNotification> {
    try {
      const notification: AlertNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId,
        recipientId: recipient.id,
        channel,
        status: 'PENDING',
        sentAt: new Date(),
        retryCount,
      };

      // Store notification attempt
      await this.storeNotification(notification);

      // Send based on channel
      switch (channel) {
        case DeliveryChannel.SMS:
          await this.sendSMS(recipient, alert);
          break;
        case DeliveryChannel.EMAIL:
          await this.sendEmail(recipient, alert);
          break;
        case DeliveryChannel.PUSH:
          await this.sendPushNotification(recipient, alert);
          break;
        case DeliveryChannel.WEBHOOK:
          await this.sendWebhook(recipient, alert);
          break;
      }

      // Update notification status
      notification.status = 'DELIVERED';
      notification.deliveredAt = new Date();
      await this.updateNotification(notification);

      return notification;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.sendNotificationWithRetry(
          alertId,
          alert,
          recipient,
          channel,
          retryCount + 1,
        );
      }

      // Max retries reached
      const failedNotification: AlertNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId,
        recipientId: recipient.id,
        channel,
        status: 'FAILED',
        sentAt: new Date(),
        retryCount,
        error: (error as Error).message,
      };

      await this.storeNotification(failedNotification);
      throw error;
    }
  }

  /**
   * Get recipients based on alert severity
   */
  private async getAlertRecipients(
    severity: AlertSeverity,
  ): Promise<AlertRecipient[]> {
    const { data: recipients, error } = await this.supabase
      .from('alert_recipients')
      .select('*')
      .or(`severity_levels.cs.{${severity}},severity_levels.cs.{ALL}`);

    if (error) {
      throw new Error(`Failed to fetch recipients: ${error.message}`);
    }

    // For life-threatening, always include emergency contacts
    if (severity === AlertSeverity.LIFE_THREATENING) {
      const emergencyRecipients = await this.getEmergencyRecipients();
      return [...recipients, ...emergencyRecipients];
    }

    return recipients || [];
  }

  /**
   * Get emergency recipients for critical situations
   */
  private async getEmergencyRecipients(): Promise<AlertRecipient[]> {
    const { data, error } = await this.supabase
      .from('emergency_contacts')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to fetch emergency contacts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if a channel can be used for a recipient
   */
  private canUseChannel(
    recipient: AlertRecipient,
    channel: DeliveryChannel,
  ): boolean {
    switch (channel) {
      case DeliveryChannel.SMS:
        return !!recipient.phone;
      case DeliveryChannel.EMAIL:
        return !!recipient.email;
      case DeliveryChannel.WEBHOOK:
        return !!recipient.webhookUrl;
      case DeliveryChannel.PUSH:
        return true; // Assume push is always available if configured
      default:
        return false;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    recipient: AlertRecipient,
    alert: DietaryAlert,
  ): Promise<void> {
    if (!recipient.phone) {
      throw new Error('No phone number available for SMS');
    }

    const message = this.formatSMSMessage(alert);

    // Integration with Twilio or other SMS service
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient.phone,
        message,
        priority:
          alert.severity === AlertSeverity.LIFE_THREATENING ? 'HIGH' : 'NORMAL',
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.statusText}`);
    }
  }

  /**
   * Send Email notification
   */
  private async sendEmail(
    recipient: AlertRecipient,
    alert: DietaryAlert,
  ): Promise<void> {
    if (!recipient.email) {
      throw new Error('No email address available');
    }

    const { subject, body } = this.formatEmailMessage(alert);

    // Integration with email service
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient.email,
        subject,
        body,
        priority:
          alert.severity === AlertSeverity.LIFE_THREATENING ? 'HIGH' : 'NORMAL',
      }),
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }
  }

  /**
   * Send Push notification
   */
  private async sendPushNotification(
    recipient: AlertRecipient,
    alert: DietaryAlert,
  ): Promise<void> {
    const notification = this.formatPushMessage(alert);

    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: recipient.id,
        ...notification,
      }),
    });

    if (!response.ok) {
      throw new Error(`Push notification failed: ${response.statusText}`);
    }
  }

  /**
   * Send Webhook notification
   */
  private async sendWebhook(
    recipient: AlertRecipient,
    alert: DietaryAlert,
  ): Promise<void> {
    if (!recipient.webhookUrl) {
      throw new Error('No webhook URL available');
    }

    const payload = this.formatWebhookPayload(alert);

    const response = await fetch(recipient.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Alert-Severity': alert.severity,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Format SMS message for dietary alert
   */
  private formatSMSMessage(alert: DietaryAlert): string {
    const severity =
      alert.severity === AlertSeverity.LIFE_THREATENING
        ? '🚨 CRITICAL'
        : '⚠️ IMPORTANT';
    return `${severity} DIETARY ALERT:\nGuest: ${alert.guestName}\nRestriction: ${alert.restriction}\n${alert.requiresEpipen ? 'REQUIRES EPIPEN' : ''}\n${alert.crossContaminationRisk ? 'CROSS-CONTAMINATION RISK' : ''}`.trim();
  }

  /**
   * Format Email message for dietary alert
   */
  private formatEmailMessage(alert: DietaryAlert): {
    subject: string;
    body: string;
  } {
    const severity =
      alert.severity === AlertSeverity.LIFE_THREATENING
        ? 'CRITICAL'
        : 'IMPORTANT';

    return {
      subject: `${severity}: Dietary Alert for ${alert.guestName}`,
      body: `
        <h2>Dietary Restriction Alert</h2>
        <p><strong>Guest:</strong> ${alert.guestName}</p>
        <p><strong>Restriction:</strong> ${alert.restriction}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        ${alert.medicalNotes ? `<p><strong>Medical Notes:</strong> ${alert.medicalNotes}</p>` : ''}
        ${alert.requiresEpipen ? '<p><strong>⚠️ REQUIRES EPIPEN</strong></p>' : ''}
        ${alert.crossContaminationRisk ? '<p><strong>⚠️ CROSS-CONTAMINATION RISK</strong></p>' : ''}
        ${
          alert.emergencyContact
            ? `
          <h3>Emergency Contact</h3>
          <p>${alert.emergencyContact.name} (${alert.emergencyContact.relationship})</p>
          <p>Phone: ${alert.emergencyContact.phone}</p>
        `
            : ''
        }
        <p><em>Last Updated: ${alert.lastUpdated.toISOString()}</em></p>
      `,
    };
  }

  /**
   * Format Push notification for dietary alert
   */
  private formatPushMessage(alert: DietaryAlert): any {
    return {
      title: `${alert.severity} Dietary Alert`,
      body: `${alert.guestName}: ${alert.restriction}`,
      data: {
        alertId: alert.guestId,
        severity: alert.severity,
        requiresEpipen: alert.requiresEpipen,
        crossContaminationRisk: alert.crossContaminationRisk,
      },
      priority:
        alert.severity === AlertSeverity.LIFE_THREATENING ? 'high' : 'normal',
    };
  }

  /**
   * Format Webhook payload for dietary alert
   */
  private formatWebhookPayload(alert: DietaryAlert): any {
    return {
      type: 'DIETARY_ALERT',
      severity: alert.severity,
      data: alert,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Store notification in database
   */
  private async storeNotification(
    notification: AlertNotification,
  ): Promise<void> {
    await this.supabase.from('alert_notifications').insert(notification);
  }

  /**
   * Update notification status
   */
  private async updateNotification(
    notification: AlertNotification,
  ): Promise<void> {
    await this.supabase
      .from('alert_notifications')
      .update({
        status: notification.status,
        deliveredAt: notification.deliveredAt,
        acknowledgedAt: notification.acknowledgedAt,
        error: notification.error,
      })
      .eq('id', notification.id);
  }

  /**
   * Log alert audit trail
   */
  private async logAlertAudit(
    alertId: string,
    action: string,
    data: any,
  ): Promise<void> {
    await this.supabase.from('alert_audit_log').insert({
      alert_id: alertId,
      action,
      data,
      timestamp: new Date().toISOString(),
      user_id: data.verifiedBy || 'SYSTEM',
    });
  }

  /**
   * Escalate failed alert through emergency channels
   */
  private async escalateFailedAlert(
    alert: DietaryAlert,
    error: Error,
  ): Promise<void> {
    // Log to error tracking service
    console.error('CRITICAL ALERT FAILURE:', {
      alert,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Attempt emergency fallback notification
    try {
      await fetch('/api/emergency/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DIETARY_ALERT_FAILURE',
          alert,
          error: error.message,
          priority: 'CRITICAL',
        }),
      });
    } catch (fallbackError) {
      // Last resort - system critical error
      console.error('EMERGENCY ESCALATION FAILED:', fallbackError);
    }
  }

  /**
   * Acknowledge an alert has been received
   */
  async acknowledgeAlert(
    notificationId: string,
    recipientId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('alert_notifications')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('recipientId', recipientId);

    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }

    await this.logAlertAudit(notificationId, 'ACKNOWLEDGED', { recipientId });
  }

  /**
   * Get all active alerts for an event
   */
  async getActiveAlerts(eventId: string): Promise<DietaryAlert[]> {
    const { data, error } = await this.supabase
      .from('dietary_alerts')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'ACTIVE')
      .order('severity', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Bulk process dietary alerts for an event
   */
  async processEventDietaryAlerts(
    eventId: string,
    guestList: any[],
  ): Promise<void> {
    const alerts: DietaryAlert[] = [];

    for (const guest of guestList) {
      if (guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0) {
        for (const restriction of guest.dietaryRestrictions) {
          alerts.push({
            guestId: guest.id,
            guestName: guest.name,
            restriction: restriction.type,
            severity: this.determineSeverity(restriction.type),
            medicalNotes: restriction.notes,
            emergencyContact: guest.emergencyContact,
            crossContaminationRisk: restriction.crossContaminationRisk || false,
            requiresEpipen: restriction.requiresEpipen || false,
            hospitalNearby: guest.hospitalInfo,
            lastUpdated: new Date(),
            verifiedBy: guest.verifiedBy,
          });
        }
      }
    }

    // Process alerts in batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < alerts.length; i += batchSize) {
      const batch = alerts.slice(i, i + batchSize);
      await Promise.all(batch.map((alert) => this.createCriticalAlert(alert)));
    }
  }

  /**
   * Determine severity based on restriction type
   */
  private determineSeverity(restrictionType: string): AlertSeverity {
    const lifeThreatening = [
      'peanut',
      'tree nut',
      'shellfish',
      'anaphylaxis',
      'severe allergy',
      'epipen required',
    ];

    const critical = ['celiac', 'severe gluten', 'diabetic', 'dairy allergy'];

    const high = ['gluten intolerance', 'lactose intolerant', 'egg allergy'];

    const restrictionLower = restrictionType.toLowerCase();

    if (lifeThreatening.some((term) => restrictionLower.includes(term))) {
      return AlertSeverity.LIFE_THREATENING;
    }

    if (critical.some((term) => restrictionLower.includes(term))) {
      return AlertSeverity.CRITICAL;
    }

    if (high.some((term) => restrictionLower.includes(term))) {
      return AlertSeverity.HIGH;
    }

    return AlertSeverity.MEDIUM;
  }
}

// Export singleton instance
let instance: DietaryAlertService | null = null;

export function getDietaryAlertService(): DietaryAlertService {
  if (!instance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    instance = new DietaryAlertService(supabaseUrl, supabaseKey);
  }
  return instance;
}
