/**
 * WS-205 Broadcast Processor - Background job processing service
 * Handles queued broadcast delivery, real-time messaging, and analytics updates
 */

import { createClient } from '@supabase/supabase-js';
import { BroadcastManager } from './broadcast-manager';
import type { Database } from '@/types/supabase';

interface ProcessingResult {
  processed: number;
  failed: number;
  errors: string[];
  metrics: {
    averageProcessingTime: number;
    totalTargetedUsers: number;
    deliveryRate: number;
  };
}

export class BroadcastProcessor {
  private supabase: ReturnType<typeof createClient<Database>>;
  private broadcastManager: BroadcastManager;
  private isProcessing = false;

  constructor() {
    // Initialize with service role for background processing
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(), // Service role for elevated permissions
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    this.broadcastManager = new BroadcastManager(this.supabase);
  }

  /**
   * Process all pending broadcasts that are scheduled for delivery
   */
  async processPendingBroadcasts(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      return {
        processed: 0,
        failed: 0,
        errors: ['Processing already in progress'],
        metrics: {
          averageProcessingTime: 0,
          totalTargetedUsers: 0,
          deliveryRate: 0,
        },
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      errors: [],
      metrics: {
        averageProcessingTime: 0,
        totalTargetedUsers: 0,
        deliveryRate: 0,
      },
    };

    try {
      // Get pending broadcasts scheduled for now or earlier
      const { data: pendingBroadcasts, error } = await this.supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false }) // Critical priority first
        .order('scheduled_for', { ascending: true }) // Oldest first
        .limit(50); // Process in reasonable batches

      if (error) {
        throw new Error(`Failed to fetch pending broadcasts: ${error.message}`);
      }

      if (!pendingBroadcasts?.length) {
        console.log('No pending broadcasts to process');
        return result;
      }

      console.info(`Processing ${pendingBroadcasts.length} pending broadcasts`);

      // Process each broadcast
      for (const broadcast of pendingBroadcasts) {
        try {
          const processingStart = Date.now();
          await this.processSingleBroadcast(broadcast);

          result.processed++;
          const processingTime = Date.now() - processingStart;
          result.metrics.averageProcessingTime += processingTime;

          // Add delay between broadcasts to avoid overwhelming the system
          if (broadcast.priority !== 'critical') {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          result.failed++;
          const errorMsg = `Broadcast ${broadcast.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(`Failed to process broadcast ${broadcast.id}:`, error);

          // Mark broadcast as failed
          await this.markBroadcastFailed(
            broadcast.id,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      // Calculate final metrics
      result.metrics.averageProcessingTime =
        result.processed > 0
          ? result.metrics.averageProcessingTime / result.processed
          : 0;
      result.metrics.deliveryRate =
        result.processed / (result.processed + result.failed);

      const totalTime = Date.now() - startTime;
      console.info(`Broadcast processing completed in ${totalTime}ms:`, {
        processed: result.processed,
        failed: result.failed,
        averageProcessingTime: result.metrics.averageProcessingTime,
        deliveryRate: result.metrics.deliveryRate,
      });

      return result;
    } catch (error) {
      console.error('Broadcast processing error:', error);
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown processing error',
      );
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single broadcast
   */
  private async processSingleBroadcast(broadcast: any): Promise<void> {
    console.log(
      `Processing broadcast ${broadcast.id} (${broadcast.type}, ${broadcast.priority})`,
    );

    // Determine target users
    const targetUsers = await this.broadcastManager.getTargetedUsers(
      broadcast.targeting || {},
      broadcast.wedding_context?.weddingId,
    );

    if (targetUsers.length === 0) {
      console.warn(`No target users found for broadcast ${broadcast.id}`);
      await this.markBroadcastSent(broadcast.id, 0);
      return;
    }

    // Apply user preference filtering
    const eligibleUsers = await this.filterByUserPreferences(
      broadcast,
      targetUsers,
    );

    if (eligibleUsers.length === 0) {
      console.warn(
        `No eligible users after preference filtering for broadcast ${broadcast.id}`,
      );
      await this.markBroadcastSent(broadcast.id, 0);
      return;
    }

    // Create delivery records
    await this.createDeliveryRecords(broadcast, eligibleUsers);

    // Send via different channels
    await this.deliverBroadcast(broadcast, eligibleUsers);

    // Update broadcast status
    await this.markBroadcastSent(broadcast.id, eligibleUsers.length);

    console.info(
      `Broadcast ${broadcast.id} delivered to ${eligibleUsers.length}/${targetUsers.length} users`,
    );
  }

  /**
   * Filter target users by their preferences
   */
  private async filterByUserPreferences(
    broadcast: any,
    userIds: string[],
  ): Promise<string[]> {
    const eligibleUsers: string[] = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 25;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      for (const userId of batch) {
        const shouldReceive =
          await this.broadcastManager.shouldReceiveBroadcast(
            userId,
            broadcast.type,
            broadcast.priority,
          );

        if (shouldReceive) {
          eligibleUsers.push(userId);
        }
      }
    }

    return eligibleUsers;
  }

  /**
   * Create delivery records for all eligible users
   */
  private async createDeliveryRecords(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    const deliveryRecords = userIds.map((userId) => ({
      broadcast_id: broadcast.id,
      user_id: userId,
      delivery_channel: 'realtime' as const,
      delivery_status: 'pending' as const,
      delivered_at: new Date().toISOString(),
      wedding_context_match: this.hasWeddingContextMatch(broadcast, userId),
    }));

    // Insert in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < deliveryRecords.length; i += batchSize) {
      const batch = deliveryRecords.slice(i, i + batchSize);

      const { error } = await this.supabase
        .from('broadcast_deliveries')
        .upsert(batch, {
          onConflict: 'broadcast_id,user_id,delivery_channel',
        });

      if (error) {
        throw new Error(`Failed to create delivery records: ${error.message}`);
      }
    }
  }

  /**
   * Deliver broadcast through various channels
   */
  private async deliverBroadcast(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    // Send real-time notifications
    await this.sendRealtimeBroadcast(broadcast, userIds);

    // Send to additional channels based on priority
    if (['critical', 'high'].includes(broadcast.priority)) {
      await this.sendToAdditionalChannels(broadcast, userIds);
    }

    // Update delivery status to 'delivered'
    await this.supabase
      .from('broadcast_deliveries')
      .update({ delivery_status: 'delivered' })
      .eq('broadcast_id', broadcast.id)
      .in('user_id', userIds);
  }

  /**
   * Send real-time broadcast via Supabase Realtime
   */
  private async sendRealtimeBroadcast(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    try {
      const payload = {
        id: broadcast.id,
        type: broadcast.type,
        priority: broadcast.priority,
        title: broadcast.title,
        message: broadcast.message,
        action_label: broadcast.action_label,
        action_url: broadcast.action_url,
        expires_at: broadcast.expires_at,
        wedding_context: broadcast.wedding_context,
        created_at: broadcast.created_at,
        targetUsers: userIds,
      };

      // Send to global broadcast channel
      await this.supabase.channel('broadcast:global').send({
        type: 'broadcast',
        event: 'new_broadcast',
        payload,
      });

      // Send to individual user channels for high-priority broadcasts
      if (['critical', 'high'].includes(broadcast.priority)) {
        for (const userId of userIds) {
          try {
            await this.supabase.channel(`broadcast:user:${userId}`).send({
              type: 'broadcast',
              event: 'priority_broadcast',
              payload,
            });
          } catch (error) {
            console.warn(`Failed to send to user channel ${userId}:`, error);
          }
        }
      }

      // Send to wedding-specific channels if applicable
      if (broadcast.wedding_context?.weddingId) {
        await this.supabase
          .channel(`wedding:${broadcast.wedding_context.weddingId}`)
          .send({
            type: 'broadcast',
            event: 'wedding_broadcast',
            payload,
          });
      }
    } catch (error) {
      console.error('Real-time broadcast failed:', error);
      throw new Error(
        `Real-time delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Send to additional channels (email, push, SMS) for high-priority broadcasts
   */
  private async sendToAdditionalChannels(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    // Get users who have enabled additional delivery channels
    const { data: preferences } = await this.supabase
      .from('broadcast_preferences')
      .select('user_id, delivery_channels')
      .in('user_id', userIds);

    if (!preferences) return;

    // Email notifications
    const emailUsers = preferences
      .filter((p) => {
        const channels = JSON.parse(p.delivery_channels as string);
        return channels.includes('email');
      })
      .map((p) => p.user_id);

    if (emailUsers.length > 0) {
      await this.queueEmailNotifications(broadcast, emailUsers);
    }

    // Push notifications
    const pushUsers = preferences
      .filter((p) => {
        const channels = JSON.parse(p.delivery_channels as string);
        return channels.includes('push');
      })
      .map((p) => p.user_id);

    if (pushUsers.length > 0) {
      await this.queuePushNotifications(broadcast, pushUsers);
    }

    // SMS for critical broadcasts only
    if (broadcast.priority === 'critical') {
      const smsUsers = preferences
        .filter((p) => {
          const channels = JSON.parse(p.delivery_channels as string);
          return channels.includes('sms');
        })
        .map((p) => p.user_id);

      if (smsUsers.length > 0) {
        await this.queueSMSNotifications(broadcast, smsUsers);
      }
    }
  }

  /**
   * Queue email notifications (integration point)
   */
  private async queueEmailNotifications(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    console.info(
      `Would queue email notifications for broadcast ${broadcast.id} to ${userIds.length} users`,
    );

    // In production, this would integrate with email service (Resend, SendGrid, etc.)
    // Example integration:
    // await emailService.queueBroadcastEmail({
    //   broadcastId: broadcast.id,
    //   recipients: userIds,
    //   subject: broadcast.title,
    //   content: broadcast.message,
    //   priority: broadcast.priority
    // })
  }

  /**
   * Queue push notifications (integration point)
   */
  private async queuePushNotifications(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    console.info(
      `Would queue push notifications for broadcast ${broadcast.id} to ${userIds.length} users`,
    );

    // In production, this would integrate with push service (FCM, APNs, etc.)
    // await pushService.queueBroadcastPush({
    //   broadcastId: broadcast.id,
    //   recipients: userIds,
    //   title: broadcast.title,
    //   body: broadcast.message,
    //   priority: broadcast.priority === 'critical' ? 'high' : 'normal'
    // })
  }

  /**
   * Queue SMS notifications (integration point)
   */
  private async queueSMSNotifications(
    broadcast: any,
    userIds: string[],
  ): Promise<void> {
    console.info(
      `Would queue SMS notifications for broadcast ${broadcast.id} to ${userIds.length} users`,
    );

    // In production, this would integrate with SMS service (Twilio, etc.)
    // await smsService.queueBroadcastSMS({
    //   broadcastId: broadcast.id,
    //   recipients: userIds,
    //   message: `${broadcast.title}: ${broadcast.message}`,
    //   priority: 'critical'
    // })
  }

  /**
   * Check if user has access to wedding context
   */
  private hasWeddingContextMatch(broadcast: any, userId: string): boolean {
    // This would check if user has access to the wedding context
    // For now, return true if wedding context exists
    return !!broadcast.wedding_context?.weddingId;
  }

  /**
   * Mark broadcast as successfully sent
   */
  private async markBroadcastSent(
    broadcastId: string,
    targetedUsers: number,
  ): Promise<void> {
    await this.supabase
      .from('broadcasts')
      .update({
        status: 'sent',
        metadata: {
          sentAt: new Date().toISOString(),
          targetedUsers,
          processedBy: 'broadcast-processor',
        },
      })
      .eq('id', broadcastId);
  }

  /**
   * Mark broadcast as failed
   */
  private async markBroadcastFailed(
    broadcastId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.supabase
      .from('broadcasts')
      .update({
        status: 'failed',
        metadata: {
          failedAt: new Date().toISOString(),
          error: errorMessage,
          processedBy: 'broadcast-processor',
        },
      })
      .eq('id', broadcastId);
  }

  /**
   * Cleanup old broadcasts and delivery records
   */
  async cleanup(): Promise<{
    deletedBroadcasts: number;
    deletedDeliveries: number;
  }> {
    try {
      // Clean up expired broadcasts older than 30 days
      const deletedBroadcasts =
        await this.broadcastManager.cleanupExpiredBroadcasts();

      // Clean up old delivery records (keep for 90 days for analytics)
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const { error: deliveryCleanupError } = await this.supabase
        .from('broadcast_deliveries')
        .delete()
        .lt('delivered_at', threeMonthsAgo.toISOString());

      if (deliveryCleanupError) {
        console.error('Delivery cleanup failed:', deliveryCleanupError);
      }

      // Update segment counts
      await this.supabase.rpc('update_segment_counts');

      console.info(
        `Cleanup completed: ${deletedBroadcasts} broadcasts cleaned up`,
      );

      return {
        deletedBroadcasts,
        deletedDeliveries: 0, // Would need to track this if needed
      };
    } catch (error) {
      console.error('Broadcast cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get processing status and metrics
   */
  getStatus(): {
    isProcessing: boolean;
    lastProcessedAt: string | null;
    metrics: any;
  } {
    return {
      isProcessing: this.isProcessing,
      lastProcessedAt: null, // Could be tracked in a persistent store
      metrics: {
        // Could include various processing metrics
      },
    };
  }

  /**
   * Stop processing and cleanup resources
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    // Close any open connections
    // In production, this would cleanup background jobs, close connections, etc.
    console.info('Broadcast processor stopped');
  }
}
