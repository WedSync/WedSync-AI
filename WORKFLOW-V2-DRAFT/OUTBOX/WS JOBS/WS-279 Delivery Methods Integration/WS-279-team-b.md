# WS-279 Delivery Methods Integration - Team B Comprehensive Prompt
**Team B: Backend/API Specialists**

## 🎯 Your Mission: Rock-Solid Multi-Channel Notification Engine
You are the **Backend/API specialists** responsible for building the intelligent notification delivery system that routes wedding updates across email, SMS, and push notifications with 99.9% reliability. Your focus: **Enterprise-grade delivery routing with failover, retry logic, and comprehensive delivery tracking**.

## 💝 The Wedding Communication Reliability Challenge
**Context**: It's Saturday morning with 50+ weddings happening. Timeline changes flood in, emergency alerts need instant delivery, and SMS verification codes must arrive within seconds. A florist needs urgent timeline updates via SMS, but their phone is in a dead zone - your system must intelligently route to email backup. **Your delivery engine ensures no wedding coordination ever fails due to missed notifications**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/lib/notifications/delivery-router.ts`** - Core multi-channel delivery routing engine
2. **`/src/lib/notifications/sms-service.ts`** - SMS delivery service with Twilio integration
3. **`/src/lib/notifications/push-service.ts`** - Push notification service with FCM
4. **`/src/app/api/notifications/send/route.ts`** - Notification sending API endpoint
5. **`/src/app/api/notifications/preferences/route.ts`** - User preference management API

### 🔒 Backend Requirements:
- **99.9% Delivery Reliability**: Automatic failover and retry mechanisms
- **Multi-Channel Routing**: Intelligent delivery method selection based on priority
- **Delivery Tracking**: Complete audit trail of all notification attempts
- **Rate Limiting**: Prevent spam and respect service provider limits
- **Security First**: Validate all inputs and sanitize user preferences
- **Performance Optimized**: Handle 1000+ concurrent deliveries without degradation

Your backend ensures wedding notifications are as reliable as atomic clocks.

## 🎯 Core Backend Architecture

### Multi-Channel Notification Delivery Router
```typescript
// File: /src/lib/notifications/delivery-router.ts
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { Twilio } from 'twilio';
import admin from 'firebase-admin';

interface NotificationRequest {
  recipientId: string;
  notificationType: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string;
  idempotencyKey?: string;
}

interface DeliveryResult {
  method: 'email' | 'sms' | 'push';
  success: boolean;
  providerId?: string;
  error?: string;
  deliveredAt?: Date;
  retryCount?: number;
}

interface UserPreferences {
  userId: string;
  notificationType: string;
  deliveryMethods: Record<string, boolean>;
  priorityThresholds: Record<string, string[]>;
  quietHours?: QuietHoursConfig;
  businessHours?: BusinessHoursConfig;
}

interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
  timezone: string;
}

interface BusinessHoursConfig {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
  days: number[]; // 0=Sunday, 1=Monday, etc.
}

export class NotificationDeliveryRouter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  private resend = new Resend(process.env.RESEND_API_KEY!);
  private twilio = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  
  private fcm = admin.messaging();
  
  constructor() {
    // Initialize Firebase Admin if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
        ),
      });
    }
  }

  async sendNotification(request: NotificationRequest): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    
    try {
      // Validate request
      this.validateNotificationRequest(request);
      
      // Check for duplicate using idempotency key
      if (request.idempotencyKey) {
        const duplicate = await this.checkDuplicateNotification(request.idempotencyKey);
        if (duplicate) {
          return duplicate.results;
        }
      }
      
      // Get user preferences and contact methods
      const preferences = await this.getUserPreferences(
        request.recipientId,
        request.notificationType
      );
      
      const contactMethods = await this.getVerifiedContactMethods(request.recipientId);
      
      // Determine delivery methods based on priority and preferences
      const deliveryMethods = this.determineDeliveryMethods(
        request.priority,
        preferences,
        contactMethods
      );
      
      // Check timing constraints (quiet hours, business hours)
      const allowedMethods = this.filterMethodsByTiming(
        deliveryMethods,
        preferences,
        request.priority
      );
      
      // Execute deliveries in parallel
      const deliveryPromises = allowedMethods.map(method =>
        this.executeDelivery(request, method, contactMethods)
      );
      
      const deliveryResults = await Promise.allSettled(deliveryPromises);
      
      // Process results and handle failures
      for (const [index, result] of deliveryResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            method: allowedMethods[index].method,
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
        }
      }
      
      // Log all delivery attempts
      await this.logDeliveryAttempts(request, results);
      
      // Store idempotency result
      if (request.idempotencyKey) {
        await this.storeIdempotencyResult(request.idempotencyKey, results);
      }
      
      // Schedule retries for failed deliveries
      await this.scheduleRetries(request, results);
      
      return results;
      
    } catch (error) {
      console.error('Notification delivery failed:', error);
      
      const errorResult: DeliveryResult = {
        method: 'system' as any,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown system error'
      };
      
      await this.logDeliveryAttempts(request, [errorResult]);
      
      return [errorResult];
    }
  }

  private validateNotificationRequest(request: NotificationRequest): void {
    const required = ['recipientId', 'notificationType', 'priority', 'title', 'message'];
    
    for (const field of required) {
      if (!request[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!['low', 'normal', 'high', 'urgent'].includes(request.priority)) {
      throw new Error(`Invalid priority: ${request.priority}`);
    }
    
    // Validate UUID format for recipientId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(request.recipientId)) {
      throw new Error('Invalid recipientId format');
    }
    
    // Sanitize message content
    request.title = this.sanitizeContent(request.title);
    request.message = this.sanitizeContent(request.message);
  }

  private sanitizeContent(content: string): string {
    // Remove potentially harmful HTML/script tags
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private async getUserPreferences(
    userId: string,
    notificationType: string
  ): Promise<UserPreferences | null> {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .single();
      
    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('Error fetching preferences:', error);
      return null;
    }
    
    return data ? {
      userId,
      notificationType,
      deliveryMethods: data.delivery_methods,
      priorityThresholds: data.priority_thresholds,
      quietHours: data.quiet_hours,
      businessHours: data.business_hours
    } : null;
  }

  private async getVerifiedContactMethods(userId: string) {
    const { data, error } = await this.supabase
      .from('user_contact_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_verified', true);
      
    if (error) {
      console.error('Error fetching contact methods:', error);
      return [];
    }
    
    return data || [];
  }

  private determineDeliveryMethods(
    priority: string,
    preferences: UserPreferences | null,
    contactMethods: any[]
  ) {
    // Default priority thresholds
    const defaultThresholds = {
      low: ['email'],
      normal: ['email', 'push'],
      high: ['email', 'push', 'sms'],
      urgent: ['email', 'push', 'sms']
    };
    
    const thresholds = preferences?.priorityThresholds || defaultThresholds;
    const enabledMethods = preferences?.deliveryMethods || { email: true, sms: false, push: false };
    
    // Get methods for this priority level
    const methodsForPriority = thresholds[priority] || ['email'];
    
    // Filter by user preferences and available contact methods
    return methodsForPriority
      .filter(method => enabledMethods[method] === true)
      .map(method => {
        const contact = contactMethods.find(c => c.contact_type === method);
        return contact ? {
          method,
          contact: contact.contact_value,
          isPrimary: contact.is_primary
        } : null;
      })
      .filter(Boolean);
  }

  private filterMethodsByTiming(
    methods: any[],
    preferences: UserPreferences | null,
    priority: string
  ) {
    const now = new Date();
    
    // Always allow urgent notifications
    if (priority === 'urgent') {
      return methods;
    }
    
    // Check quiet hours (primarily affects SMS)
    if (preferences?.quietHours?.enabled) {
      const isQuietTime = this.isWithinQuietHours(now, preferences.quietHours);
      if (isQuietTime) {
        // Filter out SMS during quiet hours
        return methods.filter(m => m.method !== 'sms');
      }
    }
    
    // Check business hours
    if (preferences?.businessHours?.enabled) {
      const isBusinessHours = this.isWithinBusinessHours(now, preferences.businessHours);
      if (!isBusinessHours) {
        // During off-hours, only send urgent and high priority
        if (!['high', 'urgent'].includes(priority)) {
          return methods.filter(m => m.method === 'email'); // Only email for low/normal priority
        }
      }
    }
    
    return methods;
  }

  private isWithinQuietHours(now: Date, quietHours: QuietHoursConfig): boolean {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  private isWithinBusinessHours(now: Date, businessHours: BusinessHoursConfig): boolean {
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Check if current day is a business day
    if (!businessHours.days.includes(currentDay)) {
      return false;
    }
    
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime < endTime;
  }

  private async executeDelivery(
    request: NotificationRequest,
    deliveryMethod: any,
    contactMethods: any[]
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    
    try {
      let result: DeliveryResult;
      
      switch (deliveryMethod.method) {
        case 'email':
          result = await this.sendEmail(request, deliveryMethod.contact);
          break;
        case 'sms':
          result = await this.sendSMS(request, deliveryMethod.contact);
          break;
        case 'push':
          result = await this.sendPushNotification(request, deliveryMethod.contact);
          break;
        default:
          throw new Error(`Unsupported delivery method: ${deliveryMethod.method}`);
      }
      
      result.deliveredAt = new Date();
      return result;
      
    } catch (error) {
      return {
        method: deliveryMethod.method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delivery error'
      };
    }
  }

  private async sendEmail(request: NotificationRequest, email: string): Promise<DeliveryResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'WedSync Notifications <notifications@wedsync.com>',
        to: email,
        subject: request.title,
        html: this.buildEmailHTML(request),
        headers: {
          'X-Notification-Type': request.notificationType,
          'X-Priority': request.priority,
        },
      });

      if (error) {
        return {
          method: 'email',
          success: false,
          error: error.message
        };
      }

      return {
        method: 'email',
        success: true,
        providerId: data?.id
      };
    } catch (error) {
      return {
        method: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Email delivery failed'
      };
    }
  }

  private async sendSMS(request: NotificationRequest, phoneNumber: string): Promise<DeliveryResult> {
    try {
      // Format message for SMS constraints
      const smsMessage = this.formatSMSMessage(request);
      
      const message = await this.twilio.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phoneNumber,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms-status`,
      });

      return {
        method: 'sms',
        success: true,
        providerId: message.sid
      };
    } catch (error) {
      return {
        method: 'sms',
        success: false,
        error: error instanceof Error ? error.message : 'SMS delivery failed'
      };
    }
  }

  private async sendPushNotification(request: NotificationRequest, deviceToken: string): Promise<DeliveryResult> {
    try {
      const message = {
        token: deviceToken,
        notification: {
          title: request.title,
          body: this.truncateForPush(request.message, 200),
        },
        data: {
          notificationType: request.notificationType,
          priority: request.priority,
          actionUrl: request.actionUrl || '',
          ...(request.metadata || {})
        },
        android: {
          priority: request.priority === 'urgent' ? 'high' : 'normal' as any,
          notification: {
            sound: request.priority === 'urgent' ? 'default' : undefined,
            channelId: `wedsync_${request.priority}`,
          }
        },
        apns: {
          payload: {
            aps: {
              sound: request.priority === 'urgent' ? 'default' : undefined,
              badge: 1,
              category: request.notificationType,
            }
          },
          headers: {
            'apns-priority': request.priority === 'urgent' ? '10' : '5',
          }
        }
      };

      const response = await this.fcm.send(message);

      return {
        method: 'push',
        success: true,
        providerId: response
      };
    } catch (error) {
      return {
        method: 'push',
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed'
      };
    }
  }

  private formatSMSMessage(request: NotificationRequest): string {
    const maxLength = 160;
    let message = `${request.title}: ${request.message}`;
    
    // Add action URL if there's space
    if (request.actionUrl && message.length < 140) {
      message += ` ${request.actionUrl}`;
    }
    
    // Truncate if too long
    if (message.length > maxLength) {
      message = message.slice(0, 157) + '...';
    }
    
    return message;
  }

  private truncateForPush(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  private buildEmailHTML(request: NotificationRequest): string {
    const priorityColors = {
      low: '#6B7280',
      normal: '#3B82F6',
      high: '#F59E0B',
      urgent: '#EF4444'
    };
    
    const priorityColor = priorityColors[request.priority];
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${request.title}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            margin: 0; 
            padding: 0; 
            background-color: #F9FAFB; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .priority-badge {
            display: inline-block;
            background-color: ${priorityColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .content { 
            padding: 30px 20px; 
          }
          .message {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
          }
          .action-button { 
            display: inline-block; 
            background: #3B82F6; 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            margin: 20px 0; 
            transition: background-color 0.2s;
          }
          .action-button:hover {
            background: #2563EB;
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            border-top: 1px solid #E5E7EB;
            background-color: #F9FAFB;
            font-size: 14px; 
            color: #6B7280; 
          }
          .wedding-context {
            background-color: #EEF2FF;
            border-left: 4px solid #6366F1;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          @media (max-width: 600px) {
            .container { margin: 0 10px; }
            .content { padding: 20px 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="priority-badge">${request.priority} priority</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">WedSync</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Wedding Coordination Platform</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1F2937; margin-bottom: 20px; font-size: 20px;">${request.title}</h2>
            
            <div class="message">
              ${request.message.replace(/\n/g, '<br>')}
            </div>
            
            ${request.actionUrl ? `
              <div style="text-align: center;">
                <a href="${request.actionUrl}" class="action-button">
                  View Details
                </a>
              </div>
            ` : ''}
            
            <div class="wedding-context">
              <p style="margin: 0; font-size: 14px; font-weight: 500; color: #4338CA;">
                💍 Wedding Industry Context
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;">
                This ${request.priority}-priority notification relates to ${request.notificationType.replace(/_/g, ' ')} 
                and requires ${request.priority === 'urgent' ? 'immediate attention' : 'your review'}.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px;">
              This notification was sent based on your WedSync preferences.
            </p>
            <p style="margin: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" 
                 style="color: #3B82F6; text-decoration: none;">
                Update your notification preferences
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async logDeliveryAttempts(request: NotificationRequest, results: DeliveryResult[]): Promise<void> {
    try {
      const logEntries = results.map(result => ({
        notification_id: null, // Could be populated if we track notification entities
        user_id: request.recipientId,
        delivery_method: result.method,
        recipient_address: this.getRecipientAddress(result.method, request),
        status: result.success ? 'sent' : 'failed',
        provider_id: result.providerId,
        error_message: result.error,
        retry_count: result.retryCount || 0,
        delivered_at: result.deliveredAt?.toISOString(),
      }));

      const { error } = await this.supabase
        .from('notification_delivery_log')
        .insert(logEntries);

      if (error) {
        console.error('Failed to log delivery attempts:', error);
      }
    } catch (error) {
      console.error('Error in logDeliveryAttempts:', error);
    }
  }

  private getRecipientAddress(method: string, request: NotificationRequest): string {
    // This would typically be resolved from the contact methods
    // For now, return a placeholder
    return `${method}-address-for-${request.recipientId}`;
  }

  private async checkDuplicateNotification(idempotencyKey: string): Promise<any> {
    // Implementation would check for existing notification with same idempotency key
    return null;
  }

  private async storeIdempotencyResult(idempotencyKey: string, results: DeliveryResult[]): Promise<void> {
    // Implementation would store the results for future duplicate checks
  }

  private async scheduleRetries(request: NotificationRequest, results: DeliveryResult[]): Promise<void> {
    const failedResults = results.filter(r => !r.success);
    
    for (const failedResult of failedResults) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, (failedResult.retryCount || 0)) * 60000; // Start at 1 minute
      const maxRetries = request.priority === 'urgent' ? 5 : 3;
      
      if ((failedResult.retryCount || 0) < maxRetries) {
        // In a real implementation, this would be handled by a job queue
        setTimeout(async () => {
          const retryRequest = {
            ...request,
            metadata: {
              ...request.metadata,
              isRetry: true,
              retryCount: (failedResult.retryCount || 0) + 1
            }
          };
          
          await this.sendNotification(retryRequest);
        }, retryDelay);
      }
    }
  }
}
```

### SMS Service Implementation
```typescript
// File: /src/lib/notifications/sms-service.ts
import { Twilio } from 'twilio';
import { createClient } from '@supabase/supabase-js';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

interface VerificationResult {
  success: boolean;
  code?: string;
  expiresAt?: Date;
  error?: string;
}

export class SMSService {
  private twilio: Twilio;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor() {
    this.twilio = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async sendSMS(phoneNumber: string, message: string, options: {
    priority?: 'normal' | 'high' | 'urgent';
    scheduledFor?: Date;
    maxRetries?: number;
  } = {}): Promise<SMSResult> {
    try {
      // Validate and format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Apply message length limits
      const truncatedMessage = this.truncateMessage(message, 160);

      // Send SMS with appropriate settings based on priority
      const twilioMessage = await this.twilio.messages.create({
        body: truncatedMessage,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: formattedNumber,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms-status`,
        validityPeriod: options.priority === 'urgent' ? 14400 : 86400, // 4 hours for urgent, 24 hours for others
        provideFeedback: true,
        maxPrice: options.priority === 'urgent' ? '0.50' : '0.25', // Higher cost limit for urgent
        ...(options.scheduledFor && {
          sendAt: options.scheduledFor.toISOString(),
          scheduleType: 'fixed'
        })
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      
      // Parse Twilio-specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const twilioError = error as any;
        return {
          success: false,
          error: `SMS Error ${twilioError.code}: ${twilioError.message}`
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }

  async sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Generate secure 6-digit verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code in database
      const { error: dbError } = await this.supabase
        .from('user_contact_methods')
        .upsert({
          contact_type: 'sms',
          contact_value: formattedNumber,
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          is_verified: false
        }, {
          onConflict: 'contact_type,contact_value'
        });

      if (dbError) {
        return { success: false, error: 'Failed to store verification code' };
      }

      // Send SMS with verification code
      const message = `Your WedSync verification code is: ${code}. This code expires in 10 minutes. Don't share this code with anyone.`;
      
      const smsResult = await this.sendSMS(formattedNumber, message, { priority: 'high' });
      
      if (!smsResult.success) {
        return { success: false, error: smsResult.error };
      }

      return {
        success: true,
        code, // In production, don't return the code
        expiresAt
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Get stored verification code
      const { data, error } = await this.supabase
        .from('user_contact_methods')
        .select('verification_code, verification_expires_at')
        .eq('contact_type', 'sms')
        .eq('contact_value', formattedNumber)
        .single();

      if (error || !data) {
        return { success: false, error: 'Verification code not found' };
      }

      // Check if code has expired
      const expiresAt = new Date(data.verification_expires_at);
      if (new Date() > expiresAt) {
        return { success: false, error: 'Verification code has expired' };
      }

      // Verify code
      if (data.verification_code !== code.trim()) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Mark as verified
      const { error: updateError } = await this.supabase
        .from('user_contact_methods')
        .update({
          is_verified: true,
          verification_code: null,
          verification_expires_at: null
        })
        .eq('contact_type', 'sms')
        .eq('contact_value', formattedNumber);

      if (updateError) {
        return { success: false, error: 'Failed to update verification status' };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.length === 10 && digits[0] !== '1') {
      // US number without country code
      return `+1${digits}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      // US number with country code
      return `+${digits}`;
    } else if (digits.length > 11) {
      // International number
      return `+${digits}`;
    }
    
    return null; // Invalid format
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    
    // Truncate intelligently at word boundary if possible
    const truncated = message.slice(0, maxLength - 3);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.slice(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  private generateVerificationCode(): string {
    // Generate cryptographically secure 6-digit code
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 900000 + 100000).toString();
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    error?: string;
    deliveredAt?: Date;
  }> {
    try {
      const message = await this.twilio.messages(messageId).fetch();
      
      return {
        status: message.status as any,
        error: message.errorMessage || undefined,
        deliveredAt: message.dateUpdated ? new Date(message.dateUpdated) : undefined
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  async handleStatusWebhook(webhookData: any): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = webhookData;
      
      // Update delivery log in database
      await this.supabase
        .from('notification_delivery_log')
        .update({
          status: MessageStatus,
          error_message: ErrorMessage || null,
          delivered_at: ['delivered', 'read'].includes(MessageStatus) 
            ? new Date().toISOString() 
            : null
        })
        .eq('provider_id', MessageSid);

    } catch (error) {
      console.error('Failed to handle SMS status webhook:', error);
    }
  }
}
```

### API Endpoints Implementation
```typescript
// File: /src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationDeliveryRouter } from '@/lib/notifications/delivery-router';
import { withSecureValidation } from '@/lib/middleware/security';
import { z } from 'zod';

const sendNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  notificationType: z.enum([
    'timeline_change',
    'task_assignment', 
    'message_received',
    'wedding_update',
    'guest_count_change',
    'venue_change',
    'emergency_alert',
    'reminder'
  ]),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
  idempotencyKey: z.string().optional()
});

export async function POST(request: NextRequest) {
  return withSecureValidation(request, async (validatedRequest) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = sendNotificationSchema.parse(body);

      // Initialize delivery router
      const router = new NotificationDeliveryRouter();

      // Send notification
      const results = await router.sendNotification({
        recipientId: validatedData.recipientId,
        notificationType: validatedData.notificationType,
        priority: validatedData.priority,
        title: validatedData.title,
        message: validatedData.message,
        actionUrl: validatedData.actionUrl,
        metadata: validatedData.metadata,
        scheduledFor: validatedData.scheduledFor,
        idempotencyKey: validatedData.idempotencyKey
      });

      // Calculate success rate
      const successfulDeliveries = results.filter(r => r.success).length;
      const totalAttempts = results.length;
      const successRate = totalAttempts > 0 ? (successfulDeliveries / totalAttempts) * 100 : 0;

      return NextResponse.json({
        success: successRate > 0,
        successRate,
        results,
        totalAttempts,
        successfulDeliveries,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Notification send API error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}

// Rate limiting configuration
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout
```

## ✅ Acceptance Criteria Checklist

- [ ] **99.9% Delivery Reliability** confirmed through comprehensive error handling and retry mechanisms
- [ ] **Multi-Channel Routing** intelligently routes to email, SMS, and push based on user preferences and priority
- [ ] **Delivery Tracking** complete audit trail of all notification attempts with status updates
- [ ] **Rate Limiting** prevents abuse and respects third-party service provider limits
- [ ] **Security Validation** all inputs validated and sanitized with proper authentication
- [ ] **Performance Optimized** handles 1000+ concurrent deliveries without degradation
- [ ] **Failover Logic** automatically retries failed deliveries with exponential backoff
- [ ] **Business Rules Enforcement** respects quiet hours, business hours, and priority overrides
- [ ] **Contact Verification** SMS and email verification with secure code generation
- [ ] **Provider Integration** robust integration with Twilio, Resend, and Firebase Cloud Messaging
- [ ] **Webhook Handling** processes delivery status updates from all providers
- [ ] **Idempotency Protection** prevents duplicate notifications using idempotency keys

Your backend ensures wedding notifications are delivered as reliably as atomic clocks, with enterprise-grade failover and monitoring.

**Remember**: Every missed notification could mean a wedding coordination failure. Build reliability like lives depend on it! ⚡💍