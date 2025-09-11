'use client';

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ActivityFeed as ActivityFeedType } from '@/types/communications';

export interface ActivityStreamOptions {
  organizationId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  bufferSize?: number;
  onActivity?: (activity: ActivityFeedType) => void;
  onActivityUpdate?: (activity: ActivityFeedType) => void;
  onActivityDelete?: (activityId: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
  enableBatching?: boolean;
  batchInterval?: number;
}

export interface ActivityStreamMetrics {
  activitiesReceived: number;
  activitiesBuffered: number;
  reconnectCount: number;
  lastActivityTime: number | null;
  connectionUptime: number;
  averageLatency: number;
  errorCount: number;
}

interface BufferedActivity {
  activity: ActivityFeedType;
  timestamp: number;
  type: 'new' | 'update' | 'delete';
}

export class ActivityStream {
  private supabase;
  private channel: RealtimeChannel | null = null;
  private options: Required<ActivityStreamOptions>;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionStartTime = 0;
  private activityBuffer: BufferedActivity[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private metrics: ActivityStreamMetrics = {
    activitiesReceived: 0,
    activitiesBuffered: 0,
    reconnectCount: 0,
    lastActivityTime: null,
    connectionUptime: 0,
    averageLatency: 0,
    errorCount: 0,
  };

  constructor(options: ActivityStreamOptions) {
    this.supabase = createClient();

    this.options = {
      organizationId: options.organizationId,
      userId: options.userId || '',
      entityType: options.entityType || '',
      entityId: options.entityId || '',
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      bufferSize: options.bufferSize ?? 100,
      onActivity: options.onActivity || (() => {}),
      onActivityUpdate: options.onActivityUpdate || (() => {}),
      onActivityDelete: options.onActivityDelete || (() => {}),
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      onError: options.onError || (() => {}),
      onReconnect: options.onReconnect || (() => {}),
      enableBatching: options.enableBatching ?? false,
      batchInterval: options.batchInterval ?? 500,
    };
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      this.connectionStartTime = Date.now();

      // Create channel name based on options
      let channelName = `activities:${this.options.organizationId}`;
      if (this.options.entityType && this.options.entityId) {
        channelName += `:${this.options.entityType}:${this.options.entityId}`;
      }

      this.channel = this.supabase.channel(channelName);

      // Listen for database changes
      this.channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_feeds',
            filter: `organization_id=eq.${this.options.organizationId}`,
          },
          (payload) => {
            this.handleNewActivity(payload.new as ActivityFeedType);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'activity_feeds',
            filter: `organization_id=eq.${this.options.organizationId}`,
          },
          (payload) => {
            this.handleActivityUpdate(payload.new as ActivityFeedType);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'activity_feeds',
            filter: `organization_id=eq.${this.options.organizationId}`,
          },
          (payload) => {
            this.handleActivityDelete(payload.old.id as string);
          },
        );

      // Listen for broadcast events (for immediate updates)
      this.channel
        .on('broadcast', { event: 'activity:new' }, (payload) => {
          this.handleNewActivity(payload.payload as ActivityFeedType);
        })
        .on('broadcast', { event: 'activity:update' }, (payload) => {
          this.handleActivityUpdate(payload.payload as ActivityFeedType);
        })
        .on('broadcast', { event: 'activity:delete' }, (payload) => {
          this.handleActivityDelete(payload.payload.id as string);
        });

      // Subscribe to channel
      const { error } = await this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.reconnectAttempts = 0;

          if (this.reconnectAttempts > 0) {
            this.options.onReconnect();
            this.metrics.reconnectCount++;
          } else {
            this.options.onConnect();
          }

          // Start batch processing if enabled
          if (this.options.enableBatching) {
            this.startBatchProcessing();
          }

          // Process any buffered activities
          this.processBuffer();
        } else if (status === 'CHANNEL_ERROR') {
          throw new Error('Failed to subscribe to activity feed');
        } else if (status === 'CLOSED') {
          this.handleDisconnect();
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      this.metrics.errorCount++;
      this.options.onError(error as Error);
      this.handleDisconnect();
      throw error;
    }
  }

  disconnect(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.isConnected = false;
    this.options.onDisconnect();
  }

  // Send activity update via broadcast for immediate real-time updates
  async broadcastActivity(
    activity: ActivityFeedType,
    event: 'new' | 'update' | 'delete' = 'new',
  ): Promise<void> {
    if (!this.channel || !this.isConnected) {
      throw new Error('Not connected to activity stream');
    }

    const payload = event === 'delete' ? { id: activity.id } : activity;

    await this.channel.send({
      type: 'broadcast',
      event: `activity:${event}`,
      payload: payload,
    });
  }

  getMetrics(): ActivityStreamMetrics {
    const uptime = this.isConnected ? Date.now() - this.connectionStartTime : 0;
    return {
      ...this.metrics,
      connectionUptime: uptime,
    };
  }

  getConnectionState(): {
    isConnected: boolean;
    reconnectAttempts: number;
    bufferedActivities: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      bufferedActivities: this.activityBuffer.length,
    };
  }

  // Clear the activity buffer
  clearBuffer(): void {
    this.activityBuffer = [];
    this.metrics.activitiesBuffered = 0;
  }

  private handleNewActivity(activity: ActivityFeedType): void {
    this.metrics.activitiesReceived++;
    this.metrics.lastActivityTime = Date.now();

    // Check if activity is relevant to current user/entity
    if (!this.isActivityRelevant(activity)) {
      return;
    }

    if (this.options.enableBatching) {
      this.bufferActivity(activity, 'new');
    } else {
      this.options.onActivity(activity);
    }
  }

  private handleActivityUpdate(activity: ActivityFeedType): void {
    this.metrics.activitiesReceived++;
    this.metrics.lastActivityTime = Date.now();

    if (!this.isActivityRelevant(activity)) {
      return;
    }

    if (this.options.enableBatching) {
      this.bufferActivity(activity, 'update');
    } else {
      this.options.onActivityUpdate(activity);
    }
  }

  private handleActivityDelete(activityId: string): void {
    this.metrics.activitiesReceived++;
    this.metrics.lastActivityTime = Date.now();

    if (this.options.enableBatching) {
      // For deletes, we can't check relevance without the full activity
      this.activityBuffer.push({
        activity: { id: activityId } as ActivityFeedType,
        timestamp: Date.now(),
        type: 'delete',
      });
      this.metrics.activitiesBuffered++;
    } else {
      this.options.onActivityDelete(activityId);
    }
  }

  private isActivityRelevant(activity: ActivityFeedType): boolean {
    // Check organization
    if (activity.organization_id !== this.options.organizationId) {
      return false;
    }

    // Check entity filtering
    if (
      this.options.entityType &&
      activity.entity_type !== this.options.entityType
    ) {
      return false;
    }

    if (this.options.entityId && activity.entity_id !== this.options.entityId) {
      return false;
    }

    // Check user targeting
    if (this.options.userId) {
      const isTargeted = activity.target_user_ids?.includes(
        this.options.userId,
      );
      const isPublic = activity.is_public;
      const isOwnActivity = activity.actor_id === this.options.userId;

      if (!isTargeted && !isPublic && !isOwnActivity) {
        return false;
      }
    }

    return true;
  }

  private bufferActivity(
    activity: ActivityFeedType,
    type: 'new' | 'update' | 'delete',
  ): void {
    // Remove existing buffered activity with same ID to avoid duplicates
    this.activityBuffer = this.activityBuffer.filter(
      (buffered) => buffered.activity.id !== activity.id,
    );

    this.activityBuffer.push({
      activity,
      timestamp: Date.now(),
      type,
    });

    this.metrics.activitiesBuffered++;

    // Enforce buffer size limit
    if (this.activityBuffer.length > this.options.bufferSize) {
      this.activityBuffer = this.activityBuffer.slice(-this.options.bufferSize);
    }
  }

  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBuffer();
      if (this.isConnected) {
        this.startBatchProcessing();
      }
    }, this.options.batchInterval);
  }

  private processBuffer(): void {
    if (this.activityBuffer.length === 0) {
      return;
    }

    const bufferedActivities = [...this.activityBuffer];
    this.activityBuffer = [];
    this.metrics.activitiesBuffered = 0;

    // Process activities in chronological order
    bufferedActivities
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(({ activity, type }) => {
        try {
          switch (type) {
            case 'new':
              this.options.onActivity(activity);
              break;
            case 'update':
              this.options.onActivityUpdate(activity);
              break;
            case 'delete':
              this.options.onActivityDelete(activity.id);
              break;
          }
        } catch (error) {
          console.error('Error processing buffered activity:', error);
          this.metrics.errorCount++;
        }
      });
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.options.onDisconnect();

    if (
      this.options.autoReconnect &&
      this.reconnectAttempts < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay =
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;

      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);

        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.options.onError(new Error('Max reconnection attempts reached'));
        }
      }
    }, delay);
  }
}
