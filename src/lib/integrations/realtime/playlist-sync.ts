import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlaylistUpdate, WebhookSubscription } from '@/types/integrations';

export interface PlaylistSyncConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SyncSession {
  id: string;
  wedding_id: string;
  channel_name: string;
  connected_at: string;
  last_heartbeat?: string;
  user_id: string;
}

export interface PlaylistBroadcastPayload {
  type: 'playlist_update';
  data: PlaylistUpdate;
  timestamp: string;
  broadcast_id: string;
}

export interface PlaylistSubscriptionCallbacks {
  onUpdate?: (update: PlaylistUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempts: number) => void;
}

export class PlaylistSyncService {
  private supabase: SupabaseClient;
  private activeChannels = new Map<string, any>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  constructor(private config: PlaylistSyncConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Initialize playlist synchronization for a wedding
   */
  async initializePlaylistSync(
    weddingId: string,
    userId: string,
    callbacks?: PlaylistSubscriptionCallbacks,
  ): Promise<string> {
    const channelName = `playlist_sync:${weddingId}`;

    try {
      // Create sync session record
      const session: SyncSession = {
        id: `${weddingId}_${userId}_${Date.now()}`,
        wedding_id: weddingId,
        channel_name: channelName,
        connected_at: new Date().toISOString(),
        user_id: userId,
      };

      const { error: sessionError } = await this.supabase
        .from('playlist_sync_sessions')
        .upsert(session);

      if (sessionError) {
        throw new Error(
          `Failed to create sync session: ${sessionError.message}`,
        );
      }

      // Subscribe to playlist changes via database changes
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wedding_playlists',
            filter: `wedding_id=eq.${weddingId}`,
          },
          (payload) => this.handlePlaylistChange(payload, callbacks),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'playlist_tracks',
            filter: `wedding_id=eq.${weddingId}`,
          },
          (payload) => this.handlePlaylistTrackChange(payload, callbacks),
        )
        .on('broadcast', { event: 'playlist_update' }, (payload) =>
          this.handleBroadcastUpdate(payload, callbacks),
        )
        .on('presence', { event: 'sync' }, () => {
          callbacks?.onConnect?.();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.activeChannels.set(weddingId, channel);
            this.reconnectAttempts.set(weddingId, 0);
            callbacks?.onConnect?.();
          } else if (status === 'CHANNEL_ERROR') {
            callbacks?.onError?.(new Error('Channel subscription failed'));
            this.handleReconnection(weddingId, userId, callbacks);
          } else if (status === 'CLOSED') {
            callbacks?.onDisconnect?.();
            this.handleReconnection(weddingId, userId, callbacks);
          }
        });

      // Send initial presence
      await channel.track({
        user_id: userId,
        connected_at: new Date().toISOString(),
      });

      return session.id;
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Broadcast a playlist update to all connected clients
   */
  async broadcastPlaylistUpdate(
    weddingId: string,
    update: PlaylistUpdate,
    options: {
      priority?: 'low' | 'normal' | 'high';
      reliable?: boolean;
    } = {},
  ): Promise<void> {
    const channel = this.activeChannels.get(weddingId);
    if (!channel) {
      throw new Error(`No active channel for wedding: ${weddingId}`);
    }

    const payload: PlaylistBroadcastPayload = {
      type: 'playlist_update',
      data: update,
      timestamp: new Date().toISOString(),
      broadcast_id: `${weddingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      const result = await channel.send({
        type: 'broadcast',
        event: 'playlist_update',
        payload,
      });

      if (result !== 'ok') {
        throw new Error(`Broadcast failed: ${result}`);
      }

      // For reliable delivery, also trigger webhooks
      if (options.reliable) {
        await this.triggerWebhookNotifications(weddingId, update);
      }

      // Update database record for audit trail
      await this.recordPlaylistUpdate(weddingId, update);
    } catch (error) {
      throw new Error(`Failed to broadcast playlist update: ${error}`);
    }
  }

  /**
   * Unsubscribe from playlist sync for a wedding
   */
  async unsubscribePlaylistSync(
    weddingId: string,
    userId: string,
  ): Promise<void> {
    const channel = this.activeChannels.get(weddingId);
    if (channel) {
      await channel.unsubscribe();
      this.activeChannels.delete(weddingId);
      this.reconnectAttempts.delete(weddingId);
    }

    // Clean up sync session
    await this.supabase
      .from('playlist_sync_sessions')
      .delete()
      .match({ wedding_id: weddingId, user_id: userId });
  }

  /**
   * Get active sync sessions for a wedding
   */
  async getActiveSessions(weddingId: string): Promise<SyncSession[]> {
    const { data, error } = await this.supabase
      .from('playlist_sync_sessions')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) {
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(
    weddingId: string,
    userId: string,
    callbacks?: PlaylistSubscriptionCallbacks,
  ): Promise<void> {
    const attempts = this.reconnectAttempts.get(weddingId) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      callbacks?.onError?.(
        new Error(
          `Max reconnection attempts exceeded for wedding: ${weddingId}`,
        ),
      );
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, attempts); // Exponential backoff
    this.reconnectAttempts.set(weddingId, attempts + 1);

    callbacks?.onReconnect?.(attempts + 1);

    setTimeout(async () => {
      try {
        await this.initializePlaylistSync(weddingId, userId, callbacks);
      } catch (error) {
        callbacks?.onError?.(error as Error);
      }
    }, delay);
  }

  /**
   * Handle database playlist changes
   */
  private async handlePlaylistChange(
    payload: any,
    callbacks?: PlaylistSubscriptionCallbacks,
  ): Promise<void> {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      let update: PlaylistUpdate;

      switch (eventType) {
        case 'INSERT':
          update = {
            type: 'metadata_updated',
            playlist_id: newRecord.id,
            user_id: newRecord.created_by || 'system',
            changes: {
              metadata: {
                name: newRecord.name,
                description: newRecord.description,
              },
            },
          };
          break;

        case 'UPDATE':
          update = {
            type: 'metadata_updated',
            playlist_id: newRecord.id,
            user_id: newRecord.updated_by || 'system',
            changes: {
              metadata: {
                name: newRecord.name,
                description: newRecord.description,
              },
            },
          };
          break;

        case 'DELETE':
          update = {
            type: 'metadata_updated',
            playlist_id: oldRecord.id,
            user_id: 'system',
            changes: {},
          };
          break;

        default:
          return;
      }

      callbacks?.onUpdate?.(update);
    } catch (error) {
      callbacks?.onError?.(error as Error);
    }
  }

  /**
   * Handle database playlist track changes
   */
  private async handlePlaylistTrackChange(
    payload: any,
    callbacks?: PlaylistSubscriptionCallbacks,
  ): Promise<void> {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      let update: PlaylistUpdate;

      switch (eventType) {
        case 'INSERT':
          update = {
            type: 'track_added',
            playlist_id: newRecord.playlist_id,
            user_id: newRecord.added_by || 'system',
            changes: {
              trackId: newRecord.track_id,
              position: newRecord.position,
            },
          };
          break;

        case 'DELETE':
          update = {
            type: 'track_removed',
            playlist_id: oldRecord.playlist_id,
            user_id: 'system',
            changes: {
              trackId: oldRecord.track_id,
              position: oldRecord.position,
            },
          };
          break;

        case 'UPDATE':
          if (oldRecord.position !== newRecord.position) {
            update = {
              type: 'reordered',
              playlist_id: newRecord.playlist_id,
              user_id: newRecord.updated_by || 'system',
              changes: {
                trackId: newRecord.track_id,
                position: oldRecord.position,
                newPosition: newRecord.position,
              },
            };
          } else {
            return; // No position change, ignore
          }
          break;

        default:
          return;
      }

      callbacks?.onUpdate?.(update);
    } catch (error) {
      callbacks?.onError?.(error as Error);
    }
  }

  /**
   * Handle broadcast updates from other clients
   */
  private async handleBroadcastUpdate(
    payload: any,
    callbacks?: PlaylistSubscriptionCallbacks,
  ): Promise<void> {
    try {
      const broadcastPayload = payload.payload as PlaylistBroadcastPayload;
      if (broadcastPayload && broadcastPayload.data) {
        callbacks?.onUpdate?.(broadcastPayload.data);
      }
    } catch (error) {
      callbacks?.onError?.(error as Error);
    }
  }

  /**
   * Record playlist update in database for audit trail
   */
  private async recordPlaylistUpdate(
    weddingId: string,
    update: PlaylistUpdate,
  ): Promise<void> {
    try {
      await this.supabase.from('playlist_update_log').insert({
        wedding_id: weddingId,
        playlist_id: update.playlist_id,
        update_type: update.type,
        user_id: update.user_id,
        changes: update.changes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record playlist update:', error);
      // Don't throw - this is just for auditing
    }
  }

  /**
   * Trigger webhook notifications for external systems
   */
  private async triggerWebhookNotifications(
    weddingId: string,
    update: PlaylistUpdate,
  ): Promise<void> {
    try {
      // Get all webhook subscriptions for this wedding
      const { data: webhooks, error } = await this.supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('event_type', 'playlist.updated')
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to get webhooks: ${error.message}`);
      }

      if (!webhooks || webhooks.length === 0) {
        return; // No webhooks to trigger
      }

      // Send notifications in parallel
      const notifications = webhooks.map((webhook) =>
        this.sendWebhookNotification(webhook, update),
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to trigger webhook notifications:', error);
      // Don't throw - webhooks are best effort
    }
  }

  /**
   * Send individual webhook notification
   */
  private async sendWebhookNotification(
    webhook: WebhookSubscription,
    update: PlaylistUpdate,
  ): Promise<void> {
    try {
      const payload = {
        event: 'playlist.updated',
        data: update,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id,
      };

      const signature = this.generateWebhookSignature(payload, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WedSync-Signature': signature,
          'X-WedSync-Event': 'playlist.updated',
          'User-Agent': 'WedSync-Webhooks/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Log successful webhook delivery
      await this.supabase.from('webhook_delivery_log').insert({
        webhook_id: webhook.id,
        event_type: 'playlist.updated',
        status: 'delivered',
        response_status: response.status,
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);

      // Log failed webhook delivery
      await this.supabase.from('webhook_delivery_log').insert({
        webhook_id: webhook.id,
        event_type: 'playlist.updated',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        attempted_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Generate webhook signature for verification
   */
  private generateWebhookSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Health check for sync service
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeChannels: number;
    activeSessions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check database connection
      const { error: dbError } = await this.supabase
        .from('playlist_sync_sessions')
        .select('count')
        .limit(1);

      if (dbError) {
        errors.push(`Database error: ${dbError.message}`);
        status = 'unhealthy';
      }

      // Get session count
      const { data: sessions, error: sessionError } = await this.supabase
        .from('playlist_sync_sessions')
        .select('*')
        .gte(
          'connected_at',
          new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        ); // Last 5 minutes

      if (sessionError) {
        errors.push(`Session query error: ${sessionError.message}`);
        status = status === 'healthy' ? 'degraded' : status;
      }

      const activeChannels = this.activeChannels.size;
      const activeSessions = sessions?.length || 0;

      // If we have channels but no sessions, something might be wrong
      if (activeChannels > 0 && activeSessions === 0) {
        errors.push('Active channels without database sessions detected');
        status = status === 'healthy' ? 'degraded' : status;
      }

      return {
        status,
        activeChannels,
        activeSessions,
        errors,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        activeChannels: this.activeChannels.size,
        activeSessions: 0,
        errors: [`Health check failed: ${error}`],
      };
    }
  }

  /**
   * Cleanup stale sessions
   */
  async cleanupStaleSessions(olderThanMinutes: number = 60): Promise<number> {
    const cutoffTime = new Date(
      Date.now() - olderThanMinutes * 60 * 1000,
    ).toISOString();

    const { data, error } = await this.supabase
      .from('playlist_sync_sessions')
      .delete()
      .lt('connected_at', cutoffTime)
      .select();

    if (error) {
      throw new Error(`Failed to cleanup stale sessions: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get sync metrics for monitoring
   */
  async getSyncMetrics(): Promise<{
    totalSessions: number;
    activeChannels: number;
    recentUpdates: number;
    webhookDeliveries: {
      successful: number;
      failed: number;
      pending: number;
    };
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ data: sessions }, { data: updates }, { data: webhookDeliveries }] =
      await Promise.all([
        this.supabase
          .from('playlist_sync_sessions')
          .select('count')
          .gte('connected_at', oneHourAgo),

        this.supabase
          .from('playlist_update_log')
          .select('count')
          .gte('timestamp', oneHourAgo),

        this.supabase
          .from('webhook_delivery_log')
          .select('status')
          .gte('attempted_at', oneHourAgo),
      ]);

    const webhookStats = (webhookDeliveries || []).reduce(
      (acc, delivery) => {
        if (delivery.status === 'delivered') acc.successful++;
        else if (delivery.status === 'failed') acc.failed++;
        else acc.pending++;
        return acc;
      },
      { successful: 0, failed: 0, pending: 0 },
    );

    return {
      totalSessions: sessions?.length || 0,
      activeChannels: this.activeChannels.size,
      recentUpdates: updates?.length || 0,
      webhookDeliveries: webhookStats,
    };
  }

  /**
   * Destroy the sync service and cleanup resources
   */
  async destroy(): Promise<void> {
    // Unsubscribe from all channels
    for (const [weddingId, channel] of this.activeChannels) {
      try {
        await channel.unsubscribe();
      } catch (error) {
        console.error(
          `Failed to unsubscribe from channel ${weddingId}:`,
          error,
        );
      }
    }

    this.activeChannels.clear();
    this.reconnectAttempts.clear();
  }
}
