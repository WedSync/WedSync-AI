# WS-279 Delivery Methods Integration - Team C Comprehensive Prompt
**Team C: Integration Specialists**

## 🎯 Your Mission: Bulletproof Third-Party Service Integration
You are the **Integration specialists** responsible for seamlessly connecting our notification system with Twilio SMS, Firebase Cloud Messaging, Resend email, and webhook providers. Your focus: **Enterprise-grade service integrations with comprehensive error handling, status tracking, and failover mechanisms that work flawlessly during peak wedding seasons**.

## 💝 The Wedding Service Integration Challenge  
**Context**: Saturday morning peak wedding season - 200+ couples getting married, timeline changes flooding in, and SMS verification codes must arrive instantly. Twilio goes down for 3 minutes, Firebase has intermittent issues, and Resend has rate limiting. **Your integrations must seamlessly failover between providers, queue messages during outages, and provide real-time delivery status to keep weddings on track**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/lib/integrations/twilio-sms-provider.ts`** - Complete Twilio SMS integration with failover
2. **`/src/lib/integrations/firebase-push-provider.ts`** - Firebase Cloud Messaging integration
3. **`/src/lib/integrations/resend-email-provider.ts`** - Enhanced Resend email integration
4. **`/src/lib/integrations/webhook-dispatcher.ts`** - Webhook system for external notifications
5. **`/src/app/api/webhooks/notification-status/route.ts`** - Webhook endpoints for status updates

### 🔗 Integration Requirements:
- **Multi-Provider Failover**: Automatic switching between backup SMS/email providers
- **Real-Time Status Tracking**: Live delivery status updates via webhooks
- **Rate Limit Management**: Intelligent queuing and throttling for all providers
- **Security Standards**: Webhook signature verification and secure credential management
- **Performance Monitoring**: Track delivery times and success rates per provider
- **Wedding Context Awareness**: Priority handling for wedding day communications

Your integrations ensure wedding communications never fail, even when third-party services have issues.

## 🔌 Core Integration Architecture

### Twilio SMS Provider with Failover
```typescript
// File: /src/lib/integrations/twilio-sms-provider.ts
import { Twilio } from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

interface SMSProvider {
  name: string;
  client: any;
  isHealthy: boolean;
  lastHealthCheck: Date;
  rateLimitRemaining: number;
  rateLimitReset: Date;
}

interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: string;
  cost?: number;
  error?: string;
  deliveryTime?: number;
  retryAfter?: number;
}

const smsMessageSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1).max(1600),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledFor: z.date().optional(),
  webhookUrl: z.string().url().optional(),
  maxRetries: z.number().min(0).max(5).default(3),
  validityPeriod: z.number().min(300).max(86400).default(86400), // 5 minutes to 24 hours
});

export class TwilioSMSProvider {
  private providers: SMSProvider[] = [];
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  
  constructor() {
    this.initializeProviders();
    this.startHealthChecking();
  }

  private initializeProviders(): void {
    // Primary Twilio account
    this.providers.push({
      name: 'twilio-primary',
      client: new Twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      ),
      isHealthy: true,
      lastHealthCheck: new Date(),
      rateLimitRemaining: 1000,
      rateLimitReset: new Date(Date.now() + 3600000) // 1 hour
    });

    // Backup Twilio account (if configured)
    if (process.env.TWILIO_BACKUP_ACCOUNT_SID && process.env.TWILIO_BACKUP_AUTH_TOKEN) {
      this.providers.push({
        name: 'twilio-backup',
        client: new Twilio(
          process.env.TWILIO_BACKUP_ACCOUNT_SID,
          process.env.TWILIO_BACKUP_AUTH_TOKEN
        ),
        isHealthy: true,
        lastHealthCheck: new Date(),
        rateLimitRemaining: 500,
        rateLimitReset: new Date(Date.now() + 3600000)
      });
    }

    // Alternative SMS provider (e.g., MessageBird, Vonage)
    if (process.env.ALTERNATIVE_SMS_PROVIDER_KEY) {
      // Implementation would add alternative provider
    }
  }

  async sendSMS(params: z.infer<typeof smsMessageSchema>): Promise<SMSDeliveryResult> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedParams = smsMessageSchema.parse(params);
      
      // Get the best available provider
      const provider = await this.selectBestProvider(validatedParams.priority);
      if (!provider) {
        return {
          success: false,
          provider: 'none',
          error: 'No healthy SMS providers available',
          deliveryTime: Date.now() - startTime
        };
      }

      // Check rate limiting
      const rateLimitStatus = this.checkRateLimit(provider.name);
      if (!rateLimitStatus.allowed) {
        return {
          success: false,
          provider: provider.name,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitStatus.retryAfter,
          deliveryTime: Date.now() - startTime
        };
      }

      // Format message based on priority and context
      const formattedMessage = this.formatMessageForWeddingContext(
        validatedParams.message,
        validatedParams.priority
      );

      // Send SMS via selected provider
      const result = await this.sendViaTwilio(provider, {
        ...validatedParams,
        message: formattedMessage
      });

      // Update rate limiting counters
      this.updateRateLimit(provider.name);

      // Log delivery attempt
      await this.logDeliveryAttempt({
        provider: provider.name,
        recipient: validatedParams.to,
        message: formattedMessage,
        priority: validatedParams.priority,
        result,
        deliveryTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      console.error('SMS delivery failed:', error);
      
      return {
        success: false,
        provider: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown SMS error',
        deliveryTime: Date.now() - startTime
      };
    }
  }

  private async selectBestProvider(priority: string): Promise<SMSProvider | null> {
    // Filter healthy providers
    const healthyProviders = this.providers.filter(p => p.isHealthy);
    
    if (healthyProviders.length === 0) {
      return null;
    }

    // For urgent messages, prefer provider with most capacity
    if (priority === 'urgent') {
      return healthyProviders.reduce((best, current) => 
        current.rateLimitRemaining > best.rateLimitRemaining ? current : best
      );
    }

    // For normal messages, use round-robin with health weighting
    const availableProviders = healthyProviders.filter(p => p.rateLimitRemaining > 10);
    if (availableProviders.length === 0) {
      return healthyProviders[0]; // Fall back to any healthy provider
    }

    // Simple round-robin selection
    const providerIndex = Date.now() % availableProviders.length;
    return availableProviders[providerIndex];
  }

  private checkRateLimit(providerName: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const limit = this.rateLimiter.get(providerName);
    
    if (!limit) {
      // Initialize rate limit tracking
      this.rateLimiter.set(providerName, { count: 0, resetTime: now + 60000 }); // 1 minute window
      return { allowed: true };
    }

    // Check if rate limit window has reset
    if (now > limit.resetTime) {
      this.rateLimiter.set(providerName, { count: 0, resetTime: now + 60000 });
      return { allowed: true };
    }

    // Check if under rate limit (100 messages per minute per provider)
    const maxMessagesPerMinute = providerName.includes('backup') ? 50 : 100;
    if (limit.count < maxMessagesPerMinute) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      retryAfter: Math.ceil((limit.resetTime - now) / 1000) 
    };
  }

  private updateRateLimit(providerName: string): void {
    const limit = this.rateLimiter.get(providerName);
    if (limit) {
      limit.count += 1;
      this.rateLimiter.set(providerName, limit);
    }
  }

  private async sendViaTwilio(
    provider: SMSProvider, 
    params: z.infer<typeof smsMessageSchema>
  ): Promise<SMSDeliveryResult> {
    try {
      const twilioMessage = await provider.client.messages.create({
        body: params.message,
        from: this.getTwilioPhoneNumber(provider.name),
        to: params.to,
        statusCallback: params.webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms-status`,
        validityPeriod: params.validityPeriod,
        maxPrice: this.getMaxPriceForPriority(params.priority),
        provideFeedback: true,
        ...(params.scheduledFor && {
          sendAt: params.scheduledFor.toISOString(),
          scheduleType: 'fixed'
        })
      });

      // Update provider health status (successful send)
      provider.isHealthy = true;
      provider.lastHealthCheck = new Date();

      return {
        success: true,
        messageId: twilioMessage.sid,
        provider: provider.name,
        cost: parseFloat(twilioMessage.price || '0'),
        deliveryTime: 0 // Will be updated when delivery confirmation arrives
      };

    } catch (error: any) {
      // Handle Twilio-specific errors
      const twilioError = this.parseTwilioError(error);
      
      // Mark provider as unhealthy if it's a service error
      if (twilioError.isServiceError) {
        provider.isHealthy = false;
        provider.lastHealthCheck = new Date();
      }

      return {
        success: false,
        provider: provider.name,
        error: twilioError.message,
        retryAfter: twilioError.retryAfter
      };
    }
  }

  private formatMessageForWeddingContext(message: string, priority: string): string {
    // Add wedding context prefix for urgent messages
    const prefixes = {
      urgent: '🚨 WEDDING URGENT: ',
      high: '⚡ WEDDING UPDATE: ',
      normal: '💒 WedSync: ',
      low: 'WedSync: '
    };

    const prefix = prefixes[priority] || prefixes.normal;
    const maxLength = 160 - prefix.length;
    
    let formattedMessage = message.length > maxLength 
      ? message.slice(0, maxLength - 3) + '...'
      : message;
    
    return prefix + formattedMessage;
  }

  private getTwilioPhoneNumber(providerName: string): string {
    return providerName.includes('backup') 
      ? process.env.TWILIO_BACKUP_PHONE_NUMBER! 
      : process.env.TWILIO_PHONE_NUMBER!;
  }

  private getMaxPriceForPriority(priority: string): string {
    const maxPrices = {
      urgent: '1.00',  // $1.00 for urgent wedding notifications
      high: '0.50',    // $0.50 for high priority
      normal: '0.25',  // $0.25 for normal
      low: '0.15'      // $0.15 for low priority
    };
    
    return maxPrices[priority] || maxPrices.normal;
  }

  private parseTwilioError(error: any): { 
    message: string; 
    isServiceError: boolean; 
    retryAfter?: number 
  } {
    // Common Twilio error codes and their handling
    const errorMap: Record<number, { message: string; isServiceError: boolean; retryAfter?: number }> = {
      20003: { message: 'Authentication failed', isServiceError: true },
      21211: { message: 'Invalid phone number', isServiceError: false },
      21408: { message: 'Permission denied for phone number', isServiceError: false },
      21610: { message: 'Message blocked by carrier', isServiceError: false },
      30001: { message: 'Queue overflow', isServiceError: true, retryAfter: 300 },
      30002: { message: 'Account suspended', isServiceError: true },
      30003: { message: 'Unreachable destination', isServiceError: false },
      30004: { message: 'Message blocked', isServiceError: false },
      30005: { message: 'Unknown destination', isServiceError: false },
      30006: { message: 'Landline or unreachable carrier', isServiceError: false },
      30007: { message: 'Carrier violation', isServiceError: false },
      30008: { message: 'Unknown error', isServiceError: true, retryAfter: 60 }
    };

    if (error.code && errorMap[error.code]) {
      return errorMap[error.code];
    }

    // Rate limiting errors
    if (error.status === 429) {
      return {
        message: 'Rate limit exceeded',
        isServiceError: false,
        retryAfter: parseInt(error.headers?.['retry-after'] || '60')
      };
    }

    // Service errors (5xx)
    if (error.status >= 500) {
      return {
        message: 'Twilio service error',
        isServiceError: true,
        retryAfter: 60
      };
    }

    return {
      message: error.message || 'Unknown Twilio error',
      isServiceError: false
    };
  }

  private startHealthChecking(): void {
    // Health check every 5 minutes
    setInterval(async () => {
      await this.performHealthChecks();
    }, 5 * 60 * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    for (const provider of this.providers) {
      try {
        // Simple health check - get account info
        await provider.client.api.accounts(provider.client.accountSid).fetch();
        
        provider.isHealthy = true;
        provider.lastHealthCheck = new Date();
        
      } catch (error) {
        console.error(`Health check failed for ${provider.name}:`, error);
        provider.isHealthy = false;
        provider.lastHealthCheck = new Date();
      }
    }
  }

  private async logDeliveryAttempt(logData: {
    provider: string;
    recipient: string;
    message: string;
    priority: string;
    result: SMSDeliveryResult;
    deliveryTime: number;
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_delivery_log')
        .insert({
          delivery_method: 'sms',
          recipient_address: logData.recipient,
          status: logData.result.success ? 'sent' : 'failed',
          provider: logData.provider,
          provider_id: logData.result.messageId,
          error_message: logData.result.error,
          retry_count: 0,
          delivered_at: logData.result.success ? new Date().toISOString() : null,
          metadata: {
            priority: logData.priority,
            deliveryTime: logData.deliveryTime,
            cost: logData.result.cost,
            messageLength: logData.message.length
          }
        });
    } catch (error) {
      console.error('Failed to log SMS delivery attempt:', error);
    }
  }

  // Webhook handlers for delivery status updates
  async handleDeliveryStatus(webhookData: {
    MessageSid: string;
    MessageStatus: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    To: string;
    From: string;
  }): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = webhookData;
      
      // Update delivery log with status
      const updateData: any = {
        status: this.mapTwilioStatusToOurs(MessageStatus),
        error_message: ErrorMessage || null
      };
      
      // Set delivered timestamp for successful deliveries
      if (['delivered', 'read'].includes(MessageStatus)) {
        updateData.delivered_at = new Date().toISOString();
      }
      
      await this.supabase
        .from('notification_delivery_log')
        .update(updateData)
        .eq('provider_id', MessageSid);

      // If it's a delivery failure, log for retry analysis
      if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        await this.logDeliveryFailure({
          messageId: MessageSid,
          errorCode: ErrorCode,
          errorMessage: ErrorMessage,
          recipient: webhookData.To,
          provider: 'twilio'
        });
      }

    } catch (error) {
      console.error('Failed to handle SMS delivery status:', error);
    }
  }

  private mapTwilioStatusToOurs(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'failed': 'failed',
      'undelivered': 'failed',
      'receiving': 'pending',
      'received': 'delivered',
      'read': 'delivered'
    };
    
    return statusMap[twilioStatus] || 'unknown';
  }

  private async logDeliveryFailure(failureData: {
    messageId: string;
    errorCode?: string;
    errorMessage?: string;
    recipient: string;
    provider: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_delivery_failures')
        .insert({
          message_id: failureData.messageId,
          delivery_method: 'sms',
          recipient_address: failureData.recipient,
          provider: failureData.provider,
          error_code: failureData.errorCode,
          error_message: failureData.errorMessage,
          failed_at: new Date().toISOString(),
          retry_eligible: this.isRetryEligible(failureData.errorCode)
        });
    } catch (error) {
      console.error('Failed to log delivery failure:', error);
    }
  }

  private isRetryEligible(errorCode?: string): boolean {
    // Don't retry these error codes
    const nonRetryableCodes = ['21211', '21408', '21610', '30003', '30005', '30006', '30007'];
    return errorCode ? !nonRetryableCodes.includes(errorCode) : true;
  }

  // Public method to get provider health status
  getProviderStatus(): Array<{ name: string; healthy: boolean; lastCheck: Date; rateLimitRemaining: number }> {
    return this.providers.map(provider => ({
      name: provider.name,
      healthy: provider.isHealthy,
      lastCheck: provider.lastHealthCheck,
      rateLimitRemaining: provider.rateLimitRemaining
    }));
  }
}
```

### Firebase Push Notification Provider
```typescript
// File: /src/lib/integrations/firebase-push-provider.ts
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  failureReason?: string;
  deliveryTime?: number;
}

interface BatchPushResult {
  successCount: number;
  failureCount: number;
  results: PushNotificationResult[];
  invalidTokens: string[];
}

const pushNotificationSchema = z.object({
  token: z.string().min(1),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(200),
  data: z.record(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  badge: z.number().int().min(0).optional(),
  sound: z.string().optional(),
  clickAction: z.string().optional(),
  collapseKey: z.string().optional(),
  ttl: z.number().int().min(0).max(86400).optional() // Time to live in seconds
});

const batchPushSchema = z.object({
  tokens: z.array(z.string()).min(1).max(500), // Firebase limit is 500 tokens per batch
  notification: z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(200),
    imageUrl: z.string().url().optional()
  }),
  data: z.record(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  weddingContext: z.object({
    weddingId: z.string().uuid().optional(),
    notificationType: z.string(),
    urgentOverride: z.boolean().default(false)
  }).optional()
});

export class FirebasePushProvider {
  private messaging: admin.messaging.Messaging;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      }
      
      this.messaging = admin.messaging();
      this.initialized = true;
      
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.initialized = false;
    }
  }

  async sendPushNotification(params: z.infer<typeof pushNotificationSchema>): Promise<PushNotificationResult> {
    const startTime = Date.now();
    
    if (!this.initialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
        deliveryTime: Date.now() - startTime
      };
    }

    try {
      // Validate parameters
      const validatedParams = pushNotificationSchema.parse(params);
      
      // Build Firebase message
      const message = this.buildFirebaseMessage(validatedParams);
      
      // Send notification
      const response = await this.messaging.send(message);
      
      // Log successful delivery
      await this.logPushDelivery({
        token: validatedParams.token,
        messageId: response,
        success: true,
        priority: validatedParams.priority,
        deliveryTime: Date.now() - startTime
      });

      return {
        success: true,
        messageId: response,
        deliveryTime: Date.now() - startTime
      };

    } catch (error: any) {
      const parsedError = this.parseFirebaseError(error);
      
      // Log failed delivery
      await this.logPushDelivery({
        token: params.token,
        success: false,
        error: parsedError.message,
        failureReason: parsedError.reason,
        priority: params.priority || 'normal',
        deliveryTime: Date.now() - startTime
      });

      return {
        success: false,
        error: parsedError.message,
        failureReason: parsedError.reason,
        deliveryTime: Date.now() - startTime
      };
    }
  }

  async sendBatchPushNotifications(params: z.infer<typeof batchPushSchema>): Promise<BatchPushResult> {
    const startTime = Date.now();
    
    if (!this.initialized) {
      return {
        successCount: 0,
        failureCount: params.tokens.length,
        results: params.tokens.map(token => ({
          success: false,
          error: 'Firebase not initialized'
        })),
        invalidTokens: []
      };
    }

    try {
      // Validate parameters
      const validatedParams = batchPushSchema.parse(params);
      
      // Split into batches of 500 (Firebase limit)
      const batches = this.chunkArray(validatedParams.tokens, 500);
      const allResults: PushNotificationResult[] = [];
      const invalidTokens: string[] = [];

      for (const batch of batches) {
        const batchMessage = this.buildBatchFirebaseMessage(validatedParams, batch);
        
        try {
          const response = await this.messaging.sendMulticast(batchMessage);
          
          // Process individual results
          response.responses.forEach((result, index) => {
            const token = batch[index];
            
            if (result.success) {
              allResults.push({
                success: true,
                messageId: result.messageId,
                deliveryTime: Date.now() - startTime
              });
            } else {
              const parsedError = this.parseFirebaseError(result.error);
              
              allResults.push({
                success: false,
                error: parsedError.message,
                failureReason: parsedError.reason,
                deliveryTime: Date.now() - startTime
              });

              // Track invalid tokens for cleanup
              if (parsedError.reason === 'invalid-token' || parsedError.reason === 'unregistered') {
                invalidTokens.push(token);
              }
            }
          });
          
        } catch (batchError) {
          // If entire batch fails, mark all tokens as failed
          batch.forEach(() => {
            allResults.push({
              success: false,
              error: 'Batch delivery failed',
              deliveryTime: Date.now() - startTime
            });
          });
        }
      }

      // Log batch delivery results
      await this.logBatchDelivery({
        totalTokens: validatedParams.tokens.length,
        successCount: allResults.filter(r => r.success).length,
        failureCount: allResults.filter(r => !r.success).length,
        invalidTokens,
        priority: validatedParams.priority,
        weddingContext: validatedParams.weddingContext
      });

      return {
        successCount: allResults.filter(r => r.success).length,
        failureCount: allResults.filter(r => !r.success).length,
        results: allResults,
        invalidTokens
      };

    } catch (error) {
      console.error('Batch push notification failed:', error);
      
      return {
        successCount: 0,
        failureCount: params.tokens.length,
        results: params.tokens.map(() => ({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown batch error'
        })),
        invalidTokens: []
      };
    }
  }

  private buildFirebaseMessage(params: z.infer<typeof pushNotificationSchema>): admin.messaging.Message {
    const baseMessage: admin.messaging.Message = {
      token: params.token,
      notification: {
        title: params.title,
        body: params.body,
        imageUrl: params.imageUrl
      },
      data: {
        actionUrl: params.actionUrl || '',
        clickAction: params.clickAction || '',
        priority: params.priority,
        ...(params.data || {})
      }
    };

    // Android-specific configuration
    baseMessage.android = {
      priority: this.getAndroidPriority(params.priority),
      notification: {
        sound: params.sound || (params.priority === 'urgent' ? 'default' : undefined),
        channelId: `wedsync_${params.priority}`,
        clickAction: params.clickAction || params.actionUrl,
        color: this.getNotificationColor(params.priority),
        tag: params.collapseKey,
        sticky: params.priority === 'urgent',
        defaultSound: params.priority === 'urgent',
        priority: this.getAndroidNotificationPriority(params.priority)
      },
      ttl: params.ttl ? params.ttl * 1000 : undefined, // Convert to milliseconds
      collapseKey: params.collapseKey
    };

    // iOS-specific configuration
    baseMessage.apns = {
      payload: {
        aps: {
          sound: params.sound || (params.priority === 'urgent' ? 'default' : undefined),
          badge: params.badge || 1,
          category: 'WEDDING_NOTIFICATION',
          'mutable-content': 1, // Allow rich notifications
          'content-available': params.priority === 'urgent' ? 1 : undefined,
          'thread-id': params.collapseKey || 'wedding-updates'
        }
      },
      headers: {
        'apns-priority': params.priority === 'urgent' ? '10' : '5',
        'apns-expiration': params.ttl ? String(Math.floor(Date.now() / 1000) + params.ttl) : undefined,
        'apns-collapse-id': params.collapseKey || undefined
      }
    };

    return baseMessage;
  }

  private buildBatchFirebaseMessage(
    params: z.infer<typeof batchPushSchema>, 
    tokens: string[]
  ): admin.messaging.MulticastMessage {
    return {
      tokens,
      notification: {
        title: params.notification.title,
        body: params.notification.body,
        imageUrl: params.notification.imageUrl
      },
      data: params.data || {},
      android: {
        priority: this.getAndroidPriority(params.priority),
        notification: {
          channelId: `wedsync_${params.priority}`,
          sound: params.priority === 'urgent' ? 'default' : undefined,
          color: this.getNotificationColor(params.priority),
          priority: this.getAndroidNotificationPriority(params.priority)
        }
      },
      apns: {
        payload: {
          aps: {
            sound: params.priority === 'urgent' ? 'default' : undefined,
            badge: 1,
            category: 'WEDDING_NOTIFICATION',
            'thread-id': 'wedding-updates'
          }
        },
        headers: {
          'apns-priority': params.priority === 'urgent' ? '10' : '5'
        }
      }
    };
  }

  private getAndroidPriority(priority: string): 'normal' | 'high' {
    return ['high', 'urgent'].includes(priority) ? 'high' : 'normal';
  }

  private getAndroidNotificationPriority(priority: string): admin.messaging.AndroidNotificationPriority {
    const priorityMap = {
      low: 'PRIORITY_LOW',
      normal: 'PRIORITY_DEFAULT',
      high: 'PRIORITY_HIGH',
      urgent: 'PRIORITY_MAX'
    };
    
    return priorityMap[priority] as admin.messaging.AndroidNotificationPriority || 'PRIORITY_DEFAULT';
  }

  private getNotificationColor(priority: string): string {
    const colorMap = {
      low: '#6B7280',     // Gray
      normal: '#3B82F6',  // Blue
      high: '#F59E0B',    // Orange
      urgent: '#EF4444'   // Red
    };
    
    return colorMap[priority] || colorMap.normal;
  }

  private parseFirebaseError(error: any): { message: string; reason: string } {
    if (!error) {
      return { message: 'Unknown error', reason: 'unknown' };
    }

    const errorCode = error.code || error.errorInfo?.code;
    
    switch (errorCode) {
      case 'messaging/invalid-registration-token':
      case 'messaging/registration-token-not-registered':
        return { message: 'Invalid or unregistered device token', reason: 'invalid-token' };
      
      case 'messaging/message-rate-exceeded':
        return { message: 'Message rate exceeded', reason: 'rate-limit' };
      
      case 'messaging/device-message-rate-exceeded':
        return { message: 'Device message rate exceeded', reason: 'device-rate-limit' };
      
      case 'messaging/topics-message-rate-exceeded':
        return { message: 'Topics message rate exceeded', reason: 'topic-rate-limit' };
      
      case 'messaging/invalid-package-name':
        return { message: 'Invalid package name', reason: 'configuration-error' };
      
      case 'messaging/invalid-apns-credentials':
        return { message: 'Invalid APNS credentials', reason: 'credential-error' };
      
      case 'messaging/payload-size-limit-exceeded':
        return { message: 'Message payload too large', reason: 'payload-too-large' };
      
      case 'messaging/third-party-auth-error':
        return { message: 'Third-party authentication error', reason: 'auth-error' };
      
      case 'messaging/server-unavailable':
        return { message: 'Firebase server temporarily unavailable', reason: 'server-error' };
      
      default:
        return { 
          message: error.message || 'Unknown Firebase error', 
          reason: 'unknown' 
        };
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async logPushDelivery(logData: {
    token: string;
    messageId?: string;
    success: boolean;
    error?: string;
    failureReason?: string;
    priority: string;
    deliveryTime: number;
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_delivery_log')
        .insert({
          delivery_method: 'push',
          recipient_address: logData.token.slice(0, 20) + '...', // Truncate token for privacy
          status: logData.success ? 'sent' : 'failed',
          provider: 'firebase',
          provider_id: logData.messageId,
          error_message: logData.error,
          delivered_at: logData.success ? new Date().toISOString() : null,
          metadata: {
            priority: logData.priority,
            deliveryTime: logData.deliveryTime,
            failureReason: logData.failureReason
          }
        });
    } catch (error) {
      console.error('Failed to log push delivery:', error);
    }
  }

  private async logBatchDelivery(logData: {
    totalTokens: number;
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
    priority: string;
    weddingContext?: any;
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_batch_log')
        .insert({
          delivery_method: 'push',
          total_recipients: logData.totalTokens,
          successful_deliveries: logData.successCount,
          failed_deliveries: logData.failureCount,
          invalid_tokens_count: logData.invalidTokens.length,
          provider: 'firebase',
          metadata: {
            priority: logData.priority,
            weddingContext: logData.weddingContext,
            invalidTokensSample: logData.invalidTokens.slice(0, 5) // Store sample for debugging
          },
          created_at: new Date().toISOString()
        });

      // Clean up invalid tokens
      if (logData.invalidTokens.length > 0) {
        await this.cleanupInvalidTokens(logData.invalidTokens);
      }
      
    } catch (error) {
      console.error('Failed to log batch delivery:', error);
    }
  }

  private async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    try {
      // Mark invalid tokens in the database
      await this.supabase
        .from('user_contact_methods')
        .update({ is_verified: false })
        .eq('contact_type', 'push')
        .in('contact_value', invalidTokens);
        
    } catch (error) {
      console.error('Failed to cleanup invalid tokens:', error);
    }
  }

  // Method to register/update device tokens
  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<boolean> {
    try {
      await this.supabase
        .from('user_contact_methods')
        .upsert({
          user_id: userId,
          contact_type: 'push',
          contact_value: token,
          is_verified: true,
          metadata: { platform, registeredAt: new Date().toISOString() }
        }, {
          onConflict: 'user_id,contact_type,contact_value'
        });
        
      return true;
    } catch (error) {
      console.error('Failed to register device token:', error);
      return false;
    }
  }

  // Health check method
  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.initialized) {
      return { healthy: false, error: 'Firebase not initialized' };
    }

    try {
      // Simple health check - try to validate a dummy token format
      await this.messaging.send({
        token: 'dummy-token-for-health-check',
        notification: { title: 'Health Check', body: 'Test' }
      }, true); // Dry run
      
      return { healthy: true };
    } catch (error) {
      // We expect this to fail, but if Firebase is healthy, it should fail with "invalid token"
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode === 'messaging/invalid-registration-token') {
          return { healthy: true }; // This is the expected error for health check
        }
      }
      
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown health check error' 
      };
    }
  }
}
```

### Webhook Status Handler Endpoint
```typescript
// File: /src/app/api/webhooks/notification-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TwilioSMSProvider } from '@/lib/integrations/twilio-sms-provider';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook signature verification
function verifyTwilioSignature(payload: string, signature: string, url: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const computedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(url + payload, 'utf-8'))
    .digest('base64');
  
  return signature === `sha1=${computedSignature}`;
}

function verifyResendSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return signature === computedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const url = request.url;
    const body = await request.text();
    const userAgent = request.headers.get('user-agent') || '';
    
    // Determine webhook source
    if (userAgent.includes('TwilioProxy')) {
      return await handleTwilioWebhook(request, body, url);
    } else if (request.headers.get('resend-webhook-signature')) {
      return await handleResendWebhook(request, body);
    } else if (request.headers.get('x-firebase-client')) {
      return await handleFirebaseWebhook(request, body);
    }
    
    return NextResponse.json({ error: 'Unknown webhook source' }, { status: 400 });
    
  } catch (error) {
    console.error('Webhook handling error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleTwilioWebhook(request: NextRequest, body: string, url: string) {
  const signature = request.headers.get('x-twilio-signature');
  
  if (!signature || !verifyTwilioSignature(body, signature, url)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const params = new URLSearchParams(body);
  const webhookData = {
    MessageSid: params.get('MessageSid'),
    MessageStatus: params.get('MessageStatus'),
    ErrorCode: params.get('ErrorCode'),
    ErrorMessage: params.get('ErrorMessage'),
    To: params.get('To'),
    From: params.get('From'),
    ApiVersion: params.get('ApiVersion')
  };
  
  // Handle status update
  const smsProvider = new TwilioSMSProvider();
  await smsProvider.handleDeliveryStatus(webhookData);
  
  return NextResponse.json({ received: true });
}

async function handleResendWebhook(request: NextRequest, body: string) {
  const signature = request.headers.get('resend-webhook-signature');
  
  if (!signature || !verifyResendSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const webhookData = JSON.parse(body);
  
  // Handle email delivery status
  await updateEmailDeliveryStatus(webhookData);
  
  return NextResponse.json({ received: true });
}

async function handleFirebaseWebhook(request: NextRequest, body: string) {
  // Firebase doesn't typically send webhooks, but we can handle custom implementations
  const webhookData = JSON.parse(body);
  
  // Handle push notification status if needed
  await updatePushDeliveryStatus(webhookData);
  
  return NextResponse.json({ received: true });
}

async function updateEmailDeliveryStatus(webhookData: any) {
  try {
    const { type, data } = webhookData;
    
    const statusMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complaint': 'failed',
      'email.delivery_delayed': 'pending',
      'email.opened': 'delivered',
      'email.clicked': 'delivered'
    };
    
    const status = statusMap[type] || 'unknown';
    
    if (data?.email_id) {
      await supabase
        .from('notification_delivery_log')
        .update({
          status,
          delivered_at: ['delivered', 'bounced'].includes(status) 
            ? new Date().toISOString() 
            : null,
          metadata: {
            webhookType: type,
            webhookData: data
          }
        })
        .eq('provider_id', data.email_id);
    }
    
  } catch (error) {
    console.error('Failed to update email delivery status:', error);
  }
}

async function updatePushDeliveryStatus(webhookData: any) {
  try {
    // Handle custom push notification status updates
    const { messageId, status, token, error } = webhookData;
    
    if (messageId) {
      await supabase
        .from('notification_delivery_log')
        .update({
          status: status || 'unknown',
          error_message: error || null,
          delivered_at: status === 'delivered' ? new Date().toISOString() : null
        })
        .eq('provider_id', messageId);
    }
    
  } catch (error) {
    console.error('Failed to update push delivery status:', error);
  }
}

// Also handle GET for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Twilio webhook verification
  if (searchParams.has('hub.challenge')) {
    return new Response(searchParams.get('hub.challenge'));
  }
  
  return NextResponse.json({ message: 'Webhook endpoint active' });
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **Multi-Provider Failover** automatic switching between backup SMS/email providers during outages
- [ ] **Real-Time Status Tracking** live delivery status updates via comprehensive webhook handling
- [ ] **Rate Limit Management** intelligent queuing and throttling for all service providers
- [ ] **Security Standards** webhook signature verification and secure credential management  
- [ ] **Performance Monitoring** detailed tracking of delivery times and success rates per provider
- [ ] **Wedding Context Priority** urgent wedding notifications get highest priority routing
- [ ] **Error Handling Excellence** comprehensive error parsing and retry eligibility determination
- [ ] **Provider Health Monitoring** continuous health checks and automatic provider switching
- [ ] **Delivery Audit Trail** complete logging of all delivery attempts with detailed metadata
- [ ] **Invalid Token Cleanup** automatic cleanup of invalid device tokens and phone numbers
- [ ] **Batch Processing** efficient batch delivery for mass notifications
- [ ] **Cost Management** intelligent cost limits based on notification priority levels

Your integrations create an unbreakable communication network that keeps weddings coordinated even when third-party services fail.

**Remember**: Every integration failure could mean a missed wedding emergency. Build redundancy like wedding photographers carry backup cameras! 🔌💍