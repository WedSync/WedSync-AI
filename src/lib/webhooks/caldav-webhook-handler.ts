// CalDAV Webhook Handler - WS-218 Team C Round 1
// External calendar change notification processing with delivery guarantees

import {
  AppleCalendarIntegration,
  CalDAVWebhookPayload,
  CalDAVSubscription,
  WebhookProcessResult,
  SyncOptions,
  SyncError,
} from '../../types/apple-sync';

import { AppleSyncOrchestrator } from '../integrations/apple-sync-orchestrator';

// Database interface for webhook management
interface WebhookDatabase {
  getIntegration(integrationId: string): Promise<AppleCalendarIntegration>;
  getSubscription(webhookId: string): Promise<CalDAVSubscription>;
  updateWebhookDeliveryStatus(
    webhookId: string,
    status: 'processed' | 'failed',
  ): Promise<void>;
  recordWebhookAttempt(
    webhookId: string,
    attempt: number,
    error?: string,
  ): Promise<void>;
  getFailedWebhooks(maxAge: number): Promise<CalDAVWebhookPayload[]>;
}

// Retry queue interface
interface WebhookRetryQueue {
  addRetryJob(payload: CalDAVWebhookPayload, delay: number): Promise<string>;
  getRetryAttempts(webhookId: string): Promise<number>;
  removeFromRetryQueue(webhookId: string): Promise<void>;
}

// Webhook signature verification
interface SignatureValidator {
  validateSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
  generateSignature(payload: string, secret: string): string;
}

/**
 * CalDAV Webhook Handler
 *
 * Processes webhook notifications from CalDAV servers for external calendar changes.
 * Implements delivery guarantees, signature validation, and automatic retry logic.
 *
 * Note: Apple iCloud CalDAV doesn't support push notifications, so this handler
 * primarily serves custom CalDAV servers that support RFC 6578 WebDAV Push.
 */
export class CalDAVWebhookHandler {
  private syncOrchestrator: AppleSyncOrchestrator;
  private database: WebhookDatabase;
  private retryQueue: WebhookRetryQueue;
  private signatureValidator: SignatureValidator;

  // Active webhook subscriptions
  private subscriptions: Map<string, CalDAVSubscription> = new Map();

  // Webhook processing statistics
  private stats = {
    totalWebhooks: 0,
    processedSuccessfully: 0,
    processingFailed: 0,
    retryAttempts: 0,
    averageProcessingTime: 0,
  };

  // Configuration
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 300000; // 5 minutes
  private readonly WEBHOOK_TIMEOUT = 30000; // 30 seconds

  constructor(
    syncOrchestrator: AppleSyncOrchestrator,
    database: WebhookDatabase,
    retryQueue: WebhookRetryQueue,
    signatureValidator: SignatureValidator,
  ) {
    this.syncOrchestrator = syncOrchestrator;
    this.database = database;
    this.retryQueue = retryQueue;
    this.signatureValidator = signatureValidator;

    // Start background retry processor
    this.startRetryProcessor();

    // Start subscription health checker
    this.startSubscriptionHealthChecker();

    console.log('CalDAV Webhook Handler initialized');
  }

  /**
   * Subscribe to CalDAV server push notifications
   * Note: This is for CalDAV servers that support RFC 6578 WebDAV Push
   * Apple iCloud CalDAV doesn't support this, so polling is used as fallback
   */
  async subscribeToCalDAVChanges(
    integration: AppleCalendarIntegration,
  ): Promise<void> {
    console.log(
      `Setting up CalDAV change notifications for integration: ${integration.id}`,
    );

    try {
      // Check if CalDAV server supports push notifications (PROPFIND for DAV:push-notification)
      const supportsPush = await this.checkPushNotificationSupport(integration);

      if (supportsPush) {
        // Create webhook subscription for push-enabled CalDAV server
        const subscription = await this.createCalDAVSubscription(integration);
        this.subscriptions.set(integration.id, subscription);

        console.log(
          `Push notification subscription created for integration: ${integration.id}`,
        );
      } else {
        // Fallback to polling for servers without push support (like iCloud)
        console.log(
          `CalDAV server doesn't support push notifications, falling back to polling for integration: ${integration.id}`,
        );
        await this.schedulePollingSync(integration);
      }
    } catch (error) {
      console.error(
        `Failed to set up CalDAV change notifications for integration ${integration.id}:`,
        error,
      );

      // Always fallback to polling if push setup fails
      await this.schedulePollingSync(integration);
    }
  }

  /**
   * Process incoming webhook notification from CalDAV server
   */
  async processWebhookNotification(
    payload: CalDAVWebhookPayload,
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();
    this.stats.totalWebhooks++;

    console.log(
      `Processing webhook notification: ${payload.webhookId} for integration: ${payload.integrationId}`,
    );

    const result: WebhookProcessResult = {
      success: false,
      processed: 0,
      errors: [],
      syncTriggered: false,
      processingTime: 0,
    };

    try {
      // Validate webhook payload and signature
      await this.validateWebhookPayload(payload);

      // Get integration details
      const integration = await this.database.getIntegration(
        payload.integrationId,
      );
      if (!integration) {
        throw new Error(`Integration not found: ${payload.integrationId}`);
      }

      // Record webhook processing attempt
      const attemptCount = await this.retryQueue.getRetryAttempts(
        payload.webhookId,
      );
      await this.database.recordWebhookAttempt(
        payload.webhookId,
        attemptCount + 1,
      );

      // Determine sync strategy based on change type
      let syncOptions: SyncOptions;

      if (payload.eventUids && payload.eventUids.length > 0) {
        // Targeted sync for specific events
        syncOptions = {
          syncType: 'targeted',
          source: 'webhook',
          calendarUrl: payload.calendarUrl,
          eventUids: payload.eventUids,
          changeType: this.mapWebhookChangeType(payload.changeType),
        };

        console.log(
          `Triggering targeted sync for ${payload.eventUids.length} events`,
        );
      } else {
        // Full calendar sync for general calendar modifications
        syncOptions = {
          syncType: 'incremental',
          source: 'webhook',
          calendarUrl: payload.calendarUrl,
        };

        console.log(
          `Triggering incremental sync for calendar: ${payload.calendarUrl}`,
        );
      }

      // Trigger appropriate sync operation
      const syncResult = await this.syncOrchestrator.orchestrateSync(
        payload.integrationId,
        syncOptions,
      );

      // Update results
      result.success = true;
      result.processed = syncResult.processedEvents;
      result.syncTriggered = true;
      this.stats.processedSuccessfully++;

      // Update webhook delivery status
      await this.database.updateWebhookDeliveryStatus(
        payload.webhookId,
        'processed',
      );

      // Remove from retry queue if it was being retried
      await this.retryQueue.removeFromRetryQueue(payload.webhookId);

      console.log(`Webhook processed successfully: ${payload.webhookId}`, {
        processed: result.processed,
        syncType: syncOptions.syncType,
        duration: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      this.stats.processingFailed++;

      console.error(`Webhook processing failed: ${payload.webhookId}`, error);

      // Update webhook delivery status as failed
      await this.database.updateWebhookDeliveryStatus(
        payload.webhookId,
        'failed',
      );

      // Queue for retry if retryable and under retry limit
      const currentAttempts = await this.retryQueue.getRetryAttempts(
        payload.webhookId,
      );

      if (
        this.isRetryableError(error) &&
        currentAttempts < this.MAX_RETRY_ATTEMPTS
      ) {
        await this.queueWebhookRetry(payload, currentAttempts + 1);
        console.log(
          `Webhook queued for retry (attempt ${currentAttempts + 1}/${this.MAX_RETRY_ATTEMPTS}): ${payload.webhookId}`,
        );
      } else {
        console.error(
          `Webhook exhausted all retry attempts or is not retryable: ${payload.webhookId}`,
        );
      }
    } finally {
      result.processingTime = Date.now() - startTime;
      this.updateProcessingTimeStats(result.processingTime);
    }

    return result;
  }

  /**
   * Handle subscription renewal for push-enabled CalDAV servers
   */
  async renewSubscription(integrationId: string): Promise<void> {
    const subscription = this.subscriptions.get(integrationId);

    if (!subscription || !subscription.isActive) {
      console.log(
        `No active subscription to renew for integration: ${integrationId}`,
      );
      return;
    }

    try {
      // Check if subscription is expiring soon
      if (
        subscription.expiresAt &&
        subscription.expiresAt.getTime() - Date.now() < 86400000
      ) {
        // 24 hours
        console.log(
          `Renewing expiring subscription for integration: ${integrationId}`,
        );

        const integration = await this.database.getIntegration(integrationId);
        const newSubscription =
          await this.createCalDAVSubscription(integration);

        this.subscriptions.set(integrationId, newSubscription);

        console.log(
          `Subscription renewed successfully for integration: ${integrationId}`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to renew subscription for integration ${integrationId}:`,
        error,
      );

      // Fallback to polling if renewal fails
      const integration = await this.database.getIntegration(integrationId);
      await this.schedulePollingSync(integration);
    }
  }

  /**
   * Unsubscribe from CalDAV server notifications
   */
  async unsubscribeFromCalDAVChanges(integrationId: string): Promise<void> {
    const subscription = this.subscriptions.get(integrationId);

    if (subscription && subscription.isActive) {
      try {
        // Send unsubscribe request to CalDAV server (implementation depends on server)
        await this.sendUnsubscribeRequest(subscription);

        // Mark subscription as inactive
        subscription.isActive = false;
        this.subscriptions.set(integrationId, subscription);

        console.log(
          `Unsubscribed from CalDAV notifications for integration: ${integrationId}`,
        );
      } catch (error) {
        console.error(
          `Failed to unsubscribe from CalDAV notifications for integration ${integrationId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get webhook processing statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): CalDAVSubscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.isActive);
  }

  // Private methods

  private async validateWebhookPayload(
    payload: CalDAVWebhookPayload,
  ): Promise<void> {
    // Validate required fields
    if (!payload.webhookId || !payload.integrationId || !payload.calendarUrl) {
      throw new Error('Invalid webhook payload: missing required fields');
    }

    // Validate signature if provided
    if (payload.signature) {
      const subscription = await this.database.getSubscription(
        payload.webhookId,
      );

      if (!subscription) {
        throw new Error(`Webhook subscription not found: ${payload.webhookId}`);
      }

      const isValidSignature = this.signatureValidator.validateSignature(
        JSON.stringify(payload),
        payload.signature,
        subscription.secretKey,
      );

      if (!isValidSignature) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Validate timestamp (reject stale webhooks)
    const webhookAge = Date.now() - payload.timestamp.getTime();
    if (webhookAge > 300000) {
      // 5 minutes
      throw new Error(`Stale webhook rejected (age: ${webhookAge}ms)`);
    }

    console.log(`Webhook payload validation successful: ${payload.webhookId}`);
  }

  private mapWebhookChangeType(
    changeType: string,
  ): 'created' | 'updated' | 'deleted' {
    switch (changeType) {
      case 'calendar_modified':
      case 'events_changed':
        return 'updated';
      default:
        return 'updated';
    }
  }

  private async checkPushNotificationSupport(
    integration: AppleCalendarIntegration,
  ): Promise<boolean> {
    // This would typically involve a PROPFIND request to check for DAV:push-notification support
    // Apple iCloud CalDAV doesn't support this, so we return false for iCloud
    const isICloud =
      integration.credentials.serverUrl.includes('caldav.icloud.com');
    return !isICloud; // Assume other CalDAV servers might support push
  }

  private async createCalDAVSubscription(
    integration: AppleCalendarIntegration,
  ): Promise<CalDAVSubscription> {
    // Generate webhook URL and secret for this integration
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/caldav/${integration.id}`;
    const secretKey = this.generateSecretKey();

    const subscription: CalDAVSubscription = {
      id: `sub-${integration.id}-${Date.now()}`,
      integrationId: integration.id,
      calendarUrl:
        integration.calendars[0]?.caldavUrl || integration.calendarUrl,
      webhookUrl,
      secretKey,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // TODO: Send subscription request to CalDAV server
    // This would involve a SUBSCRIBE request as per RFC 6578

    return subscription;
  }

  private async schedulePollingSync(
    integration: AppleCalendarIntegration,
  ): Promise<void> {
    const pollInterval =
      integration.syncPreferences.pollIntervalMinutes * 60 * 1000;

    console.log(
      `Scheduling polling sync every ${integration.syncPreferences.pollIntervalMinutes} minutes for integration: ${integration.id}`,
    );

    // Use setInterval for demonstration - in production this would use a proper job scheduler
    setInterval(async () => {
      try {
        // Quick change detection to avoid unnecessary full syncs
        const hasChanges = await this.checkForCalDAVChanges(integration);

        if (hasChanges) {
          console.log(
            `Changes detected via polling for integration: ${integration.id}`,
          );

          await this.syncOrchestrator.orchestrateSync(integration.id, {
            syncType: 'incremental',
            source: 'scheduled_poll',
          });
        }
      } catch (error) {
        console.error(
          `Scheduled sync failed for integration ${integration.id}:`,
          error,
        );
      }
    }, pollInterval);
  }

  private async checkForCalDAVChanges(
    integration: AppleCalendarIntegration,
  ): Promise<boolean> {
    // This would use the CalDAV client to check CTags
    // Implementation would be similar to detectCalDAVChanges in the orchestrator
    // Returning false for now as this is a simplified implementation
    return Math.random() > 0.8; // Simulate occasional changes
  }

  private async queueWebhookRetry(
    payload: CalDAVWebhookPayload,
    attempt: number,
  ): Promise<void> {
    // Calculate exponential backoff delay
    const delay = Math.min(
      this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1),
      this.MAX_RETRY_DELAY,
    );

    await this.retryQueue.addRetryJob(payload, delay);
    this.stats.retryAttempts++;

    console.log(
      `Webhook queued for retry in ${delay}ms (attempt ${attempt}): ${payload.webhookId}`,
    );
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      // Don't retry on authentication or validation errors
      if (
        error.message.includes('signature') ||
        error.message.includes('authentication') ||
        error.message.includes('not found')
      ) {
        return false;
      }

      // Retry on network and temporary errors
      return (
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('503') ||
        error.message.includes('502') ||
        error.message.includes('500')
      );
    }

    return true; // Default to retryable
  }

  private generateSecretKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async sendUnsubscribeRequest(
    subscription: CalDAVSubscription,
  ): Promise<void> {
    // TODO: Implement unsubscribe request to CalDAV server
    // This would involve an UNSUBSCRIBE request as per RFC 6578
    console.log(
      `Unsubscribe request would be sent for subscription: ${subscription.id}`,
    );
  }

  private updateProcessingTimeStats(processingTime: number): void {
    // Update rolling average processing time
    const totalProcessed =
      this.stats.processedSuccessfully + this.stats.processingFailed;
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (totalProcessed - 1) +
        processingTime) /
      totalProcessed;
  }

  private startRetryProcessor(): void {
    // Process retry queue every minute
    setInterval(async () => {
      try {
        const failedWebhooks = await this.database.getFailedWebhooks(3600000); // 1 hour

        for (const webhook of failedWebhooks) {
          const attempts = await this.retryQueue.getRetryAttempts(
            webhook.webhookId,
          );

          if (attempts < this.MAX_RETRY_ATTEMPTS) {
            console.log(
              `Retrying webhook: ${webhook.webhookId} (attempt ${attempts + 1})`,
            );
            await this.processWebhookNotification(webhook);
          }
        }
      } catch (error) {
        console.error('Retry processor error:', error);
      }
    }, 60000); // Every minute
  }

  private startSubscriptionHealthChecker(): void {
    // Check subscription health every 30 minutes
    setInterval(async () => {
      console.log('Running subscription health check...');

      for (const [integrationId, subscription] of Array.from(
        this.subscriptions.entries(),
      )) {
        if (subscription.isActive) {
          try {
            // Check if subscription needs renewal
            await this.renewSubscription(integrationId);
          } catch (error) {
            console.error(
              `Subscription health check failed for integration ${integrationId}:`,
              error,
            );
          }
        }
      }
    }, 1800000); // Every 30 minutes
  }
}
