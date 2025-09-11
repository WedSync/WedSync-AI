# WS-205 Team C: Broadcast Events System - Integration Services

## Team C Responsibilities: Third-Party Integrations, External Services & System Orchestration

**Feature**: WS-205 Broadcast Events System
**Team Focus**: External integrations, service orchestration, cross-platform notifications
**Duration**: Sprint 21 (Current)
**Dependencies**: Team B (Backend Infrastructure)
**MCP Integration**: Use Ref MCP for integration patterns, Sequential Thinking MCP for service orchestration, Context7 MCP for API documentation

## Technical Foundation from Feature Designer

**Source**: `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-205-broadcast-events-system-technical.md`

### Integration Requirements Overview
The broadcast system must integrate with external services to provide comprehensive notification coverage for wedding industry professionals:

1. **Email Services** - Transactional emails for critical broadcasts
2. **SMS/WhatsApp** - Urgent notifications for time-sensitive updates
3. **Calendar Integrations** - Google/Outlook calendar-based broadcast triggers
4. **Slack/Teams** - Professional workspace notifications
5. **Push Notifications** - Mobile app and web push notifications
6. **Webhook Delivery** - External system notifications

### Wedding Industry Context Requirements
- **Wedding photographers** need SMS alerts for timeline changes while shooting
- **Coordinators** require Slack integration for team communication during events
- **Couples** want gentle email summaries without overwhelming push notifications
- **Suppliers** need calendar integration for automatic status updates

## Primary Deliverables

### 1. Email Integration Service

Create comprehensive email delivery system for broadcast notifications:

```typescript
// /wedsync/src/lib/broadcast/integrations/email-service.ts
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { render } from '@react-email/render';
import { BroadcastEmailTemplate } from '@/components/email-templates/BroadcastEmail';

interface EmailBroadcast {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
  expiresAt?: Date;
}

interface EmailRecipient {
  userId: string;
  email: string;
  name: string;
  role: string;
  preferences: {
    emailFrequency: 'immediate' | 'daily' | 'weekly';
    weddingDigest: boolean;
  };
}

export class EmailBroadcastService {
  private resend: Resend;
  private supabase;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.supabase = createServerClient();
  }

  async sendBroadcastEmails(
    broadcast: EmailBroadcast,
    recipients: EmailRecipient[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    // Filter recipients based on email preferences and priority
    const eligibleRecipients = this.filterEmailRecipients(broadcast, recipients);

    if (eligibleRecipients.length === 0) {
      console.info(`No eligible email recipients for broadcast ${broadcast.id}`);
      return result;
    }

    // Batch processing for performance
    const batchSize = 50; // Resend batch limit
    const batches = [];
    
    for (let i = 0; i < eligibleRecipients.length; i += batchSize) {
      batches.push(eligibleRecipients.slice(i, i + batchSize));
    }

    // Process batches sequentially to respect rate limits
    for (const batch of batches) {
      try {
        const batchResult = await this.sendEmailBatch(broadcast, batch);
        result.sent += batchResult.sent;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);

        // Rate limiting delay between batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        result.failed += batch.length;
        result.errors.push(`Batch error: ${error.message}`);
      }
    }

    // Update delivery tracking
    await this.updateEmailDeliveryStats(broadcast.id, result);

    return result;
  }

  private filterEmailRecipients(
    broadcast: EmailBroadcast,
    recipients: EmailRecipient[]
  ): EmailRecipient[] {
    return recipients.filter(recipient => {
      // Critical broadcasts always send
      if (broadcast.priority === 'critical') {
        return true;
      }

      // Check user email frequency preference
      if (recipient.preferences.emailFrequency === 'immediate') {
        return ['high', 'normal'].includes(broadcast.priority);
      }

      if (recipient.preferences.emailFrequency === 'daily') {
        return broadcast.priority === 'high';
      }

      // Weekly frequency only for digest emails (handled separately)
      return false;
    });
  }

  private async sendEmailBatch(
    broadcast: EmailBroadcast,
    recipients: EmailRecipient[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    // Generate email content based on broadcast type and wedding context
    const emailSubject = this.generateEmailSubject(broadcast);
    const emailTemplate = this.generateEmailTemplate(broadcast);

    const emailPromises = recipients.map(async (recipient) => {
      try {
        const personalizedContent = await this.personalizeEmailContent(
          broadcast,
          recipient,
          emailTemplate
        );

        const { data, error } = await this.resend.emails.send({
          from: this.getSenderEmail(broadcast.type),
          to: [recipient.email],
          subject: emailSubject,
          html: personalizedContent,
          headers: {
            'X-Broadcast-ID': broadcast.id,
            'X-User-ID': recipient.userId,
            'X-Priority': broadcast.priority
          },
          tags: [
            { name: 'broadcast_type', value: broadcast.type },
            { name: 'priority', value: broadcast.priority },
            { name: 'user_role', value: recipient.role }
          ]
        });

        if (error) {
          result.failed++;
          result.errors.push(`${recipient.email}: ${error.message}`);
        } else {
          result.sent++;
          
          // Track successful delivery
          await this.trackEmailDelivery(broadcast.id, recipient.userId, data.id);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`${recipient.email}: ${error.message}`);
      }
    });

    await Promise.all(emailPromises);
    return result;
  }

  private generateEmailSubject(broadcast: EmailBroadcast): string {
    const priorityPrefix = {
      critical: '🚨 URGENT',
      high: '⚠️ Important',
      normal: '📢',
      low: 'Update'
    };

    const typeContext = {
      'wedding.emergency': 'Emergency',
      'timeline.changed': 'Timeline Update',
      'coordinator.handoff': 'Coordinator Change',
      'payment.required': 'Payment Required',
      'maintenance.scheduled': 'Maintenance Notice'
    };

    const context = typeContext[broadcast.type] || 'Notification';
    const prefix = priorityPrefix[broadcast.priority];

    return `${prefix} ${context}: ${broadcast.title}`;
  }

  private generateEmailTemplate(broadcast: EmailBroadcast): string {
    // Use React Email template with wedding industry styling
    return render(BroadcastEmailTemplate, {
      broadcast,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL,
      supportEmail: process.env.SUPPORT_EMAIL,
      weddingTheme: true
    });
  }

  private async personalizeEmailContent(
    broadcast: EmailBroadcast,
    recipient: EmailRecipient,
    template: string
  ): Promise<string> {
    // Replace personalization tokens
    return template
      .replace(/{{userName}}/g, recipient.name)
      .replace(/{{userRole}}/g, recipient.role)
      .replace(/{{weddingContext}}/g, 
        broadcast.weddingContext 
          ? `for ${broadcast.weddingContext.coupleName}'s wedding`
          : ''
      )
      .replace(/{{unsubscribeUrl}}/g, 
        `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?userId=${recipient.userId}`
      );
  }

  private getSenderEmail(broadcastType: string): string {
    const senderMap = {
      'wedding.emergency': 'emergency@wedsync.com',
      'coordinator.handoff': 'coordination@wedsync.com',
      'payment.required': 'billing@wedsync.com',
      'maintenance.scheduled': 'system@wedsync.com',
      'feature.released': 'updates@wedsync.com'
    };

    return senderMap[broadcastType] || 'notifications@wedsync.com';
  }

  private async trackEmailDelivery(
    broadcastId: string,
    userId: string,
    emailId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_deliveries')
        .update({
          delivery_status: 'sent',
          metadata: { emailId, sentAt: new Date().toISOString() }
        })
        .eq('broadcast_id', broadcastId)
        .eq('user_id', userId)
        .eq('delivery_channel', 'email');
    } catch (error) {
      console.error('Failed to track email delivery:', error);
    }
  }

  private async updateEmailDeliveryStats(
    broadcastId: string,
    stats: { sent: number; failed: number }
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_analytics')
        .upsert({
          broadcast_id: broadcastId,
          email_sent: stats.sent,
          email_failed: stats.failed,
          calculated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to update email delivery stats:', error);
    }
  }

  // Webhook handlers for email events
  async handleEmailWebhook(payload: any): Promise<void> {
    const { type, data } = payload;
    const broadcastId = data.headers?.['X-Broadcast-ID'];
    const userId = data.headers?.['X-User-ID'];

    if (!broadcastId || !userId) return;

    const updateData: any = {};

    switch (type) {
      case 'email.delivered':
        updateData.delivery_status = 'delivered';
        updateData.delivered_at = new Date().toISOString();
        break;
        
      case 'email.opened':
        updateData.read_at = new Date().toISOString();
        break;
        
      case 'email.clicked':
        // Track action click
        await this.trackEmailClick(broadcastId, userId, data.click?.url);
        break;
        
      case 'email.bounced':
      case 'email.complained':
        updateData.delivery_status = 'failed';
        updateData.error_message = `${type}: ${data.reason}`;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.supabase
        .from('broadcast_deliveries')
        .update(updateData)
        .eq('broadcast_id', broadcastId)
        .eq('user_id', userId)
        .eq('delivery_channel', 'email');
    }
  }

  private async trackEmailClick(
    broadcastId: string,
    userId: string,
    clickedUrl: string
  ): Promise<void> {
    try {
      // Update analytics
      await this.supabase.rpc('increment_broadcast_stat', {
        broadcast_id: broadcastId,
        stat_name: 'action_clicked'
      });

      // Log click for detailed analytics
      console.info('Email broadcast action clicked:', {
        broadcastId,
        userId,
        clickedUrl
      });
    } catch (error) {
      console.error('Failed to track email click:', error);
    }
  }

  // Daily digest service
  async sendDailyDigest(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        const unreadBroadcasts = await this.getUnreadBroadcasts(userId);
        
        if (unreadBroadcasts.length > 0) {
          await this.sendDigestEmail(userId, unreadBroadcasts);
        }
      }
    } catch (error) {
      console.error('Daily digest sending failed:', error);
    }
  }

  private async getUnreadBroadcasts(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('broadcast_deliveries')
      .select(`
        *,
        broadcast:broadcasts(*)
      `)
      .eq('user_id', userId)
      .is('read_at', null)
      .gte('delivered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return data || [];
  }

  private async sendDigestEmail(userId: string, broadcasts: any[]): Promise<void> {
    // Implementation for daily digest email
    console.info(`Would send digest email to user ${userId} with ${broadcasts.length} unread broadcasts`);
  }
}
```

### 2. SMS/WhatsApp Integration Service

Create urgent notification system for critical broadcasts:

```typescript
// /wedsync/src/lib/broadcast/integrations/sms-service.ts
import { Twilio } from 'twilio';
import { createServerClient } from '@/lib/supabase/server';

interface SMSBroadcast {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  action?: { label: string; url: string };
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
}

interface SMSRecipient {
  userId: string;
  phoneNumber: string;
  name: string;
  role: string;
  preferences: {
    smsEnabled: boolean;
    emergencyOnly: boolean;
    whatsappPreferred: boolean;
  };
}

export class SMSBroadcastService {
  private twilioClient: Twilio;
  private supabase;
  private fromNumber: string;
  private whatsappNumber: string;

  constructor() {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.supabase = createServerClient();
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER!;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER!;
  }

  async sendSMSBroadcasts(
    broadcast: SMSBroadcast,
    recipients: SMSRecipient[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    // Filter recipients based on SMS preferences and priority
    const eligibleRecipients = this.filterSMSRecipients(broadcast, recipients);

    if (eligibleRecipients.length === 0) {
      console.info(`No eligible SMS recipients for broadcast ${broadcast.id}`);
      return result;
    }

    // Process SMS sending with rate limiting
    const concurrentLimit = 5; // Avoid Twilio rate limits
    const batches = [];
    
    for (let i = 0; i < eligibleRecipients.length; i += concurrentLimit) {
      batches.push(eligibleRecipients.slice(i, i + concurrentLimit));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(recipient =>
        this.sendIndividualSMS(broadcast, recipient)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            result.sent++;
          } else {
            result.failed++;
            result.errors.push(result.value.error);
          }
        } else {
          result.failed++;
          result.errors.push(`${batch[index].phoneNumber}: ${result.reason}`);
        }
      });

      // Rate limiting delay between batches
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Update delivery tracking
    await this.updateSMSDeliveryStats(broadcast.id, result);

    return result;
  }

  private filterSMSRecipients(
    broadcast: SMSBroadcast,
    recipients: SMSRecipient[]
  ): SMSRecipient[] {
    return recipients.filter(recipient => {
      // Check if SMS is enabled
      if (!recipient.preferences.smsEnabled) {
        return false;
      }

      // Emergency only users get critical broadcasts only
      if (recipient.preferences.emergencyOnly) {
        return broadcast.priority === 'critical';
      }

      // High priority for coordinators and photographers
      if (['coordinator', 'photographer'].includes(recipient.role)) {
        return ['critical', 'high'].includes(broadcast.priority);
      }

      // Couples get critical and wedding-specific high priority
      if (recipient.role === 'couple') {
        return broadcast.priority === 'critical' || 
               (broadcast.priority === 'high' && broadcast.weddingContext);
      }

      return broadcast.priority === 'critical';
    });
  }

  private async sendIndividualSMS(
    broadcast: SMSBroadcast,
    recipient: SMSRecipient
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // Format message for SMS constraints
      const smsContent = this.formatSMSMessage(broadcast, recipient);
      
      // Choose delivery method based on preference
      const isWhatsApp = recipient.preferences.whatsappPreferred && 
                        this.whatsappNumber;

      const messageOptions: any = {
        body: smsContent,
        to: isWhatsApp 
          ? `whatsapp:${recipient.phoneNumber}`
          : recipient.phoneNumber,
        from: isWhatsApp 
          ? `whatsapp:${this.whatsappNumber}`
          : this.fromNumber
      };

      // Add media for WhatsApp if it's a wedding-related broadcast
      if (isWhatsApp && broadcast.weddingContext) {
        messageOptions.mediaUrl = [this.getWeddingContextImage(broadcast)];
      }

      const message = await this.twilioClient.messages.create(messageOptions);

      // Track successful delivery
      await this.trackSMSDelivery(
        broadcast.id,
        recipient.userId,
        message.sid,
        isWhatsApp ? 'whatsapp' : 'sms'
      );

      return { success: true, messageId: message.sid };

    } catch (error) {
      console.error(`SMS send failed for ${recipient.phoneNumber}:`, error);
      return { 
        success: false, 
        error: `${recipient.phoneNumber}: ${error.message}` 
      };
    }
  }

  private formatSMSMessage(broadcast: SMSBroadcast, recipient: SMSRecipient): string {
    const maxLength = 1600; // SMS segment limit
    
    // Priority indicator
    const priorityEmoji = {
      critical: '🚨',
      high: '⚠️',
      normal: '📢',
      low: 'ℹ️'
    };

    let message = `${priorityEmoji[broadcast.priority]} WedSync: ${broadcast.title}\n\n`;
    
    // Wedding context
    if (broadcast.weddingContext) {
      message += `Wedding: ${broadcast.weddingContext.coupleName}\n`;
    }

    // Main message
    message += `${broadcast.message}\n`;

    // Action URL (shortened for SMS)
    if (broadcast.action) {
      const shortUrl = this.shortenUrl(broadcast.action.url);
      message += `\n${broadcast.action.label}: ${shortUrl}`;
    }

    // Truncate if too long
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 20) + '... (View full)';
    }

    return message;
  }

  private getWeddingContextImage(broadcast: SMSBroadcast): string {
    // Return appropriate wedding-related image based on broadcast type
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const imageMap = {
      'timeline.changed': `${baseUrl}/images/timeline-update.jpg`,
      'coordinator.handoff': `${baseUrl}/images/coordinator-change.jpg`,
      'wedding.emergency': `${baseUrl}/images/emergency-alert.jpg`
    };

    return imageMap[broadcast.type] || `${baseUrl}/images/wedding-notification.jpg`;
  }

  private shortenUrl(url: string): string {
    // Simple URL shortener for SMS
    // In production, integrate with a proper URL shortening service
    if (url.includes(process.env.NEXT_PUBLIC_APP_URL!)) {
      return url.replace(process.env.NEXT_PUBLIC_APP_URL!, 'wedsync.app');
    }
    return url;
  }

  private async trackSMSDelivery(
    broadcastId: string,
    userId: string,
    messageId: string,
    channel: 'sms' | 'whatsapp'
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_deliveries')
        .update({
          delivery_status: 'sent',
          metadata: { 
            messageId, 
            channel,
            sentAt: new Date().toISOString() 
          }
        })
        .eq('broadcast_id', broadcastId)
        .eq('user_id', userId)
        .eq('delivery_channel', 'sms');
    } catch (error) {
      console.error('Failed to track SMS delivery:', error);
    }
  }

  private async updateSMSDeliveryStats(
    broadcastId: string,
    stats: { sent: number; failed: number }
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_analytics')
        .upsert({
          broadcast_id: broadcastId,
          sms_sent: stats.sent,
          sms_failed: stats.failed,
          calculated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to update SMS delivery stats:', error);
    }
  }

  // Webhook handler for Twilio status updates
  async handleTwilioWebhook(payload: any): Promise<void> {
    const { MessageSid, MessageStatus, To, From } = payload;
    
    // Find the broadcast delivery record by message ID
    const { data: delivery } = await this.supabase
      .from('broadcast_deliveries')
      .select('broadcast_id, user_id')
      .eq('metadata->>messageId', MessageSid)
      .single();

    if (!delivery) return;

    const updateData: any = {};

    switch (MessageStatus) {
      case 'delivered':
        updateData.delivery_status = 'delivered';
        updateData.delivered_at = new Date().toISOString();
        break;
        
      case 'failed':
      case 'undelivered':
        updateData.delivery_status = 'failed';
        updateData.error_message = `SMS failed: ${MessageStatus}`;
        break;
        
      case 'read': // WhatsApp read receipts
        updateData.read_at = new Date().toISOString();
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.supabase
        .from('broadcast_deliveries')
        .update(updateData)
        .eq('broadcast_id', delivery.broadcast_id)
        .eq('user_id', delivery.user_id)
        .eq('delivery_channel', 'sms');
    }
  }
}
```

### 3. Calendar Integration Service

Automatic broadcast triggers based on calendar events:

```typescript
// /wedsync/src/lib/broadcast/integrations/calendar-service.ts
import { google } from 'googleapis';
import { createServerClient } from '@/lib/supabase/server';
import { BroadcastManager } from '../broadcast-manager';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees?: Array<{ email: string }>;
  location?: string;
  weddingId?: string;
}

interface CalendarTrigger {
  eventType: 'ceremony' | 'reception' | 'rehearsal' | 'vendor_setup';
  triggerTime: number; // minutes before event
  broadcastType: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

export class CalendarBroadcastService {
  private googleCalendar;
  private supabase;
  private broadcastManager: BroadcastManager;

  constructor() {
    this.googleCalendar = google.calendar('v3');
    this.supabase = createServerClient();
    this.broadcastManager = new BroadcastManager(this.supabase);
  }

  async processCalendarTriggers(): Promise<void> {
    try {
      // Get upcoming wedding events in the next 24 hours
      const upcomingEvents = await this.getUpcomingWeddingEvents();

      for (const event of upcomingEvents) {
        await this.processEventTriggers(event);
      }

      console.info(`Processed calendar triggers for ${upcomingEvents.length} events`);
    } catch (error) {
      console.error('Calendar trigger processing failed:', error);
    }
  }

  private async getUpcomingWeddingEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get weddings with calendar integration
    const { data: weddings } = await this.supabase
      .from('weddings')
      .select(`
        id,
        wedding_date,
        ceremony_time,
        reception_time,
        calendar_integration
      `)
      .gte('wedding_date', now.toISOString().split('T')[0])
      .lte('wedding_date', tomorrow.toISOString().split('T')[0])
      .not('calendar_integration', 'is', null);

    const events: CalendarEvent[] = [];

    for (const wedding of weddings || []) {
      if (wedding.calendar_integration?.google_calendar_id) {
        try {
          const calendarEvents = await this.fetchGoogleCalendarEvents(
            wedding.calendar_integration.google_calendar_id,
            wedding.id
          );
          events.push(...calendarEvents);
        } catch (error) {
          console.error(`Failed to fetch calendar for wedding ${wedding.id}:`, error);
        }
      }
    }

    return events;
  }

  private async fetchGoogleCalendarEvents(
    calendarId: string,
    weddingId: string
  ): Promise<CalendarEvent[]> {
    const auth = await this.getGoogleAuth();
    
    const response = await this.googleCalendar.events.list({
      auth,
      calendarId,
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return (response.data.items || []).map(event => ({
      id: event.id!,
      summary: event.summary!,
      description: event.description,
      start: event.start!,
      end: event.end!,
      attendees: event.attendees,
      location: event.location,
      weddingId
    }));
  }

  private async getGoogleAuth() {
    // Implementation depends on your Google OAuth setup
    // This would typically use service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });

    return auth;
  }

  private async processEventTriggers(event: CalendarEvent): Promise<void> {
    const eventType = this.classifyWeddingEvent(event);
    if (!eventType) return;

    const triggers = this.getTriggersForEventType(eventType);
    const now = new Date();

    for (const trigger of triggers) {
      const triggerTime = new Date(
        new Date(event.start.dateTime).getTime() - 
        trigger.triggerTime * 60 * 1000
      );

      // Check if trigger time has passed but broadcast hasn't been sent
      if (now >= triggerTime) {
        const existingBroadcast = await this.checkExistingTriggerBroadcast(
          event.id,
          trigger.broadcastType
        );

        if (!existingBroadcast) {
          await this.createCalendarTriggeredBroadcast(event, trigger);
        }
      }
    }
  }

  private classifyWeddingEvent(event: CalendarEvent): string | null {
    const summary = event.summary.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    if (summary.includes('ceremony') || summary.includes('wedding')) {
      return 'ceremony';
    }
    if (summary.includes('reception') || summary.includes('party')) {
      return 'reception';
    }
    if (summary.includes('rehearsal')) {
      return 'rehearsal';
    }
    if (summary.includes('setup') || summary.includes('vendor')) {
      return 'vendor_setup';
    }
    if (summary.includes('photo') && summary.includes('session')) {
      return 'photo_session';
    }

    return null;
  }

  private getTriggersForEventType(eventType: string): CalendarTrigger[] {
    const triggerMap = {
      ceremony: [
        {
          eventType: 'ceremony',
          triggerTime: 120, // 2 hours before
          broadcastType: 'timeline.reminder',
          priority: 'high' as const
        },
        {
          eventType: 'ceremony',
          triggerTime: 30, // 30 minutes before
          broadcastType: 'timeline.imminent',
          priority: 'critical' as const
        }
      ],
      reception: [
        {
          eventType: 'reception',
          triggerTime: 60, // 1 hour before
          broadcastType: 'timeline.reminder',
          priority: 'high' as const
        }
      ],
      vendor_setup: [
        {
          eventType: 'vendor_setup',
          triggerTime: 15, // 15 minutes before
          broadcastType: 'supplier.setup_reminder',
          priority: 'high' as const
        }
      ],
      photo_session: [
        {
          eventType: 'photo_session',
          triggerTime: 30, // 30 minutes before
          broadcastType: 'photography.session_reminder',
          priority: 'normal' as const
        }
      ]
    };

    return triggerMap[eventType] || [];
  }

  private async checkExistingTriggerBroadcast(
    eventId: string,
    broadcastType: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('broadcasts')
      .select('id')
      .eq('type', broadcastType)
      .eq('metadata->>calendarEventId', eventId)
      .single();

    return !!data;
  }

  private async createCalendarTriggeredBroadcast(
    event: CalendarEvent,
    trigger: CalendarTrigger
  ): Promise<void> {
    try {
      // Get wedding context
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('couple_name, wedding_date')
        .eq('id', event.weddingId!)
        .single();

      if (!wedding) return;

      const broadcastData = {
        type: trigger.broadcastType,
        priority: trigger.priority,
        title: this.generateTriggerTitle(event, trigger),
        message: this.generateTriggerMessage(event, trigger),
        targeting: {
          weddingIds: [event.weddingId!]
        },
        weddingContext: {
          weddingId: event.weddingId!,
          coupleName: wedding.couple_name,
          weddingDate: wedding.wedding_date
        },
        scheduledFor: new Date().toISOString(),
        metadata: {
          calendarEventId: event.id,
          triggerType: trigger.eventType,
          originalEventTime: event.start.dateTime
        }
      };

      await this.broadcastManager.createBroadcast(broadcastData);

      console.info(`Created calendar-triggered broadcast for event ${event.id}:`, {
        type: trigger.broadcastType,
        priority: trigger.priority,
        weddingId: event.weddingId
      });

    } catch (error) {
      console.error('Failed to create calendar-triggered broadcast:', error);
    }
  }

  private generateTriggerTitle(event: CalendarEvent, trigger: CalendarTrigger): string {
    const timeMap = {
      15: '15 minutes',
      30: '30 minutes',
      60: '1 hour',
      120: '2 hours'
    };

    const timeString = timeMap[trigger.triggerTime] || `${trigger.triggerTime} minutes`;

    return `${event.summary} starting in ${timeString}`;
  }

  private generateTriggerMessage(event: CalendarEvent, trigger: CalendarTrigger): string {
    const eventTime = new Date(event.start.dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let message = `Your ${event.summary.toLowerCase()} is scheduled to start at ${eventTime}`;

    if (event.location) {
      message += ` at ${event.location}`;
    }

    // Add role-specific instructions
    if (trigger.eventType === 'ceremony') {
      message += '. All team members should be in position.';
    } else if (trigger.eventType === 'vendor_setup') {
      message += '. Please ensure all equipment is ready.';
    } else if (trigger.eventType === 'photo_session') {
      message += '. Please arrive 5 minutes early for setup.';
    }

    return message;
  }

  // Manual calendar sync for specific wedding
  async syncWeddingCalendar(weddingId: string): Promise<{ events: number; triggers: number }> {
    try {
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('calendar_integration')
        .eq('id', weddingId)
        .single();

      if (!wedding?.calendar_integration?.google_calendar_id) {
        throw new Error('No calendar integration found for wedding');
      }

      const events = await this.fetchGoogleCalendarEvents(
        wedding.calendar_integration.google_calendar_id,
        weddingId
      );

      let triggersCreated = 0;
      for (const event of events) {
        await this.processEventTriggers(event);
        triggersCreated++;
      }

      return { events: events.length, triggers: triggersCreated };

    } catch (error) {
      console.error(`Calendar sync failed for wedding ${weddingId}:`, error);
      throw error;
    }
  }
}
```

### 4. Slack/Teams Integration Service

Professional workspace notifications for wedding teams:

```typescript
// /wedsync/src/lib/broadcast/integrations/workspace-service.ts
import { WebClient } from '@slack/web-api';
import { Client } from '@microsoft/microsoft-graph-client';
import { createServerClient } from '@/lib/supabase/server';

interface WorkspaceBroadcast {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  action?: { label: string; url: string };
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
}

interface WorkspaceIntegration {
  userId: string;
  platform: 'slack' | 'teams';
  workspaceId: string;
  channelId?: string;
  accessToken: string;
  preferences: {
    criticalOnly: boolean;
    weddingChannels: boolean;
  };
}

export class WorkspaceBroadcastService {
  private slackClient: WebClient;
  private teamsClient: Client;
  private supabase;

  constructor() {
    this.slackClient = new WebClient();
    this.teamsClient = Client.init({
      authProvider: {
        getAccessToken: async () => {
          // Implementation depends on your Teams OAuth setup
          return process.env.TEAMS_ACCESS_TOKEN || '';
        }
      }
    });
    this.supabase = createServerClient();
  }

  async sendWorkspaceBroadcasts(
    broadcast: WorkspaceBroadcast,
    integrations: WorkspaceIntegration[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    // Filter integrations based on preferences and priority
    const eligibleIntegrations = this.filterWorkspaceIntegrations(broadcast, integrations);

    if (eligibleIntegrations.length === 0) {
      console.info(`No eligible workspace integrations for broadcast ${broadcast.id}`);
      return result;
    }

    // Process by platform for optimal batching
    const slackIntegrations = eligibleIntegrations.filter(i => i.platform === 'slack');
    const teamsIntegrations = eligibleIntegrations.filter(i => i.platform === 'teams');

    // Send to Slack
    if (slackIntegrations.length > 0) {
      const slackResult = await this.sendSlackBroadcasts(broadcast, slackIntegrations);
      result.sent += slackResult.sent;
      result.failed += slackResult.failed;
      result.errors.push(...slackResult.errors);
    }

    // Send to Teams
    if (teamsIntegrations.length > 0) {
      const teamsResult = await this.sendTeamsBroadcasts(broadcast, teamsIntegrations);
      result.sent += teamsResult.sent;
      result.failed += teamsResult.failed;
      result.errors.push(...teamsResult.errors);
    }

    // Update delivery tracking
    await this.updateWorkspaceDeliveryStats(broadcast.id, result);

    return result;
  }

  private filterWorkspaceIntegrations(
    broadcast: WorkspaceBroadcast,
    integrations: WorkspaceIntegration[]
  ): WorkspaceIntegration[] {
    return integrations.filter(integration => {
      // Critical only preferences
      if (integration.preferences.criticalOnly) {
        return broadcast.priority === 'critical';
      }

      // Wedding-specific channels
      if (integration.preferences.weddingChannels && broadcast.weddingContext) {
        return ['critical', 'high'].includes(broadcast.priority);
      }

      // Default filtering by priority
      return ['critical', 'high', 'normal'].includes(broadcast.priority);
    });
  }

  private async sendSlackBroadcasts(
    broadcast: WorkspaceBroadcast,
    integrations: WorkspaceIntegration[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    for (const integration of integrations) {
      try {
        const slackMessage = this.formatSlackMessage(broadcast);
        
        const slackClient = new WebClient(integration.accessToken);
        
        const response = await slackClient.chat.postMessage({
          channel: integration.channelId || '@channel',
          ...slackMessage
        });

        if (response.ok) {
          result.sent++;
          await this.trackWorkspaceDelivery(
            broadcast.id,
            integration.userId,
            'slack',
            response.ts as string
          );
        } else {
          result.failed++;
          result.errors.push(`Slack ${integration.workspaceId}: ${response.error}`);
        }

      } catch (error) {
        result.failed++;
        result.errors.push(`Slack ${integration.workspaceId}: ${error.message}`);
      }
    }

    return result;
  }

  private async sendTeamsBroadcasts(
    broadcast: WorkspaceBroadcast,
    integrations: WorkspaceIntegration[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] };

    for (const integration of integrations) {
      try {
        const teamsMessage = this.formatTeamsMessage(broadcast);
        
        const response = await this.teamsClient
          .api(`/teams/${integration.workspaceId}/channels/${integration.channelId}/messages`)
          .post(teamsMessage);

        result.sent++;
        await this.trackWorkspaceDelivery(
          broadcast.id,
          integration.userId,
          'teams',
          response.id
        );

      } catch (error) {
        result.failed++;
        result.errors.push(`Teams ${integration.workspaceId}: ${error.message}`);
      }
    }

    return result;
  }

  private formatSlackMessage(broadcast: WorkspaceBroadcast): any {
    const priorityColors = {
      critical: '#ff0000',
      high: '#ff8c00',
      normal: '#0066cc',
      low: '#666666'
    };

    const priorityEmojis = {
      critical: ':rotating_light:',
      high: ':warning:',
      normal: ':information_source:',
      low: ':speech_balloon:'
    };

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmojis[broadcast.priority]} *${broadcast.title}*`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: broadcast.message
        }
      }
    ];

    // Add wedding context if present
    if (broadcast.weddingContext) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:ring: *Wedding:* ${broadcast.weddingContext.coupleName} | ${new Date(broadcast.weddingContext.weddingDate).toLocaleDateString()}`
          }
        ]
      });
    }

    // Add action button if present
    if (broadcast.action) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: broadcast.action.label
            },
            url: broadcast.action.url,
            style: broadcast.priority === 'critical' ? 'danger' : 'primary'
          }
        ]
      });
    }

    return {
      blocks,
      attachments: [
        {
          color: priorityColors[broadcast.priority],
          fallback: `${broadcast.title}: ${broadcast.message}`
        }
      ]
    };
  }

  private formatTeamsMessage(broadcast: WorkspaceBroadcast): any {
    const priorityColors = {
      critical: 'attention',
      high: 'warning',
      normal: 'accent',
      low: 'default'
    };

    const card = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.3',
            body: [
              {
                type: 'TextBlock',
                text: broadcast.title,
                weight: 'bolder',
                size: 'medium',
                color: priorityColors[broadcast.priority]
              },
              {
                type: 'TextBlock',
                text: broadcast.message,
                wrap: true
              }
            ]
          }
        }
      ]
    };

    // Add wedding context
    if (broadcast.weddingContext) {
      card.attachments[0].content.body.push({
        type: 'FactSet',
        facts: [
          {
            title: 'Wedding:',
            value: broadcast.weddingContext.coupleName
          },
          {
            title: 'Date:',
            value: new Date(broadcast.weddingContext.weddingDate).toLocaleDateString()
          }
        ]
      });
    }

    // Add action button
    if (broadcast.action) {
      if (!card.attachments[0].content.actions) {
        card.attachments[0].content.actions = [];
      }
      
      card.attachments[0].content.actions.push({
        type: 'Action.OpenUrl',
        title: broadcast.action.label,
        url: broadcast.action.url
      });
    }

    return card;
  }

  private async trackWorkspaceDelivery(
    broadcastId: string,
    userId: string,
    platform: 'slack' | 'teams',
    messageId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_deliveries')
        .update({
          delivery_status: 'sent',
          metadata: { 
            messageId, 
            platform,
            sentAt: new Date().toISOString() 
          }
        })
        .eq('broadcast_id', broadcastId)
        .eq('user_id', userId)
        .eq('delivery_channel', platform);
    } catch (error) {
      console.error('Failed to track workspace delivery:', error);
    }
  }

  private async updateWorkspaceDeliveryStats(
    broadcastId: string,
    stats: { sent: number; failed: number }
  ): Promise<void> {
    try {
      await this.supabase
        .from('broadcast_analytics')
        .upsert({
          broadcast_id: broadcastId,
          workspace_sent: stats.sent,
          workspace_failed: stats.failed,
          calculated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to update workspace delivery stats:', error);
    }
  }

  // Setup webhook endpoints for interactive responses
  async handleSlackInteraction(payload: any): Promise<void> {
    // Handle Slack button clicks and interactions
    const { actions, user, response_url } = payload;
    
    if (actions && actions[0]?.action_id === 'acknowledge_broadcast') {
      // Update broadcast acknowledgment
      await this.supabase
        .from('broadcast_deliveries')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('metadata->>messageId', payload.message.ts)
        .eq('delivery_channel', 'slack');
    }
  }

  async handleTeamsWebhook(payload: any): Promise<void> {
    // Handle Teams webhook events
    const { eventType, resource } = payload;
    
    if (eventType === 'message.reaction.added') {
      // Track engagement metrics
      console.info('Teams message reaction received:', resource);
    }
  }
}
```

## Evidence-Based Completion Requirements

### 1. Integration Service Files
Team C must provide evidence of created files:

```bash
# Integration service files
ls -la wedsync/src/lib/broadcast/integrations/
# Expected: email-service.ts, sms-service.ts, calendar-service.ts, workspace-service.ts

# Integration tests
ls -la wedsync/src/__tests__/integration/broadcast/
# Expected: email-integration.test.ts, sms-integration.test.ts, calendar-integration.test.ts, workspace-integration.test.ts

# Webhook endpoints
ls -la wedsync/src/app/api/webhooks/broadcast/
# Expected: email.ts, sms.ts, slack.ts, teams.ts
```

### 2. Service Configuration Validation
```bash
# Test email service connection
npm run test:email-service

# Test SMS service connection  
npm run test:sms-service

# Test calendar integration
npm run test:calendar-sync

# Test workspace integrations
npm run test:workspace-services
```

### 3. Webhook Handler Testing
```bash
# Test email webhook processing
curl -X POST /api/webhooks/broadcast/email -H "Content-Type: application/json" \
  -d '{"type":"email.delivered","data":{"headers":{"X-Broadcast-ID":"test-id"}}}'

# Test SMS webhook processing
curl -X POST /api/webhooks/broadcast/sms -H "Content-Type: application/json" \
  -d '{"MessageSid":"test-sid","MessageStatus":"delivered"}'
```

### 4. Integration Performance Testing
```bash
# Test email batch processing (500+ recipients)
npm run perf:email-batch

# Test SMS rate limiting compliance
npm run perf:sms-rate-limits

# Test calendar sync performance
npm run perf:calendar-sync

# Test workspace delivery latency
npm run perf:workspace-delivery
```

## Integration Points with Wedding Industry

### Email Templates
- Wedding-themed email designs
- Role-specific content personalization
- Couple name and wedding date integration
- Unsubscribe handling with context preservation

### SMS Optimization
- Wedding emergency escalation paths
- Photographer timeline change alerts
- Coordinator handoff notifications
- Couple-friendly messaging tone

### Calendar Intelligence
- Wedding ceremony vs reception differentiation
- Vendor setup time recognition
- Photography session scheduling
- Multi-day event handling

### Workplace Collaboration
- Wedding team channel management
- Supplier coordination workflows
- Emergency broadcast escalation
- Multi-wedding context separation

## Completion Checklist

- [ ] Email service with wedding-themed templates implemented
- [ ] SMS/WhatsApp service with emergency escalation created
- [ ] Calendar integration with automatic triggers built
- [ ] Slack/Teams workspace integration completed
- [ ] Push notification service for mobile apps finished
- [ ] Webhook handlers for all external services implemented
- [ ] Rate limiting compliance for all external APIs verified
- [ ] Wedding context personalization throughout all channels
- [ ] Error handling and retry logic for all integrations
- [ ] Analytics tracking for delivery success rates
- [ ] Security validation for webhook endpoints
- [ ] Performance benchmarks for batch processing
- [ ] Integration testing with external services completed
- [ ] Documentation for webhook endpoint configurations
- [ ] Monitoring and alerting for integration failures
- [ ] File existence verification completed
- [ ] Service configuration validation passed
- [ ] Performance testing benchmarks achieved

**Estimated Completion**: End of Sprint 21
**Success Criteria**: Seamless integration with external services providing 95%+ delivery success rate across all channels, comprehensive wedding industry context throughout all integrations, and robust error handling for production reliability.

**Next Steps**: Upon completion of WS-205 Team C integration services, coordination with Teams A and B enables full broadcast system deployment with multi-channel delivery capabilities.