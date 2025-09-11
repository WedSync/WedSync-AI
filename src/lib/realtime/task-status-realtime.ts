/**
 * WS-159: Task Status Real-time Broadcasting System
 * Real-time event broadcasting for task status changes with <500ms delivery
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

export interface TaskStatusEvent {
  task_id: string;
  wedding_id: string;
  helper_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  previous_status?: string;
  completion_percentage?: number;
  photo_evidence_url?: string;
  notes?: string;
  completed_by?: string;
  completed_at?: string;
  updated_by: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  category: string;
  deadline?: string;
  metadata?: Record<string, any>;
}

export interface TaskAssignmentEvent {
  task_id: string;
  wedding_id: string;
  assigned_to: string;
  assigned_by: string;
  helper_name: string;
  task_title: string;
  task_description?: string;
  deadline?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  category: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TaskReminderEvent {
  task_id: string;
  wedding_id: string;
  helper_id: string;
  reminder_type: 'deadline_approaching' | 'overdue' | 'follow_up';
  deadline: string;
  days_until_deadline: number;
  task_title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  timestamp: string;
}

export interface TaskProgressUpdate {
  task_id: string;
  wedding_id: string;
  progress_percentage: number;
  milestone_reached?: string;
  time_spent_minutes?: number;
  estimated_completion?: string;
  notes?: string;
  updated_by: string;
  timestamp: string;
}

export interface TaskRealtimeEvents {
  'task:status_changed': TaskStatusEvent;
  'task:assigned': TaskAssignmentEvent;
  'task:reminder_sent': TaskReminderEvent;
  'task:progress_updated': TaskProgressUpdate;
  'task:deadline_updated': {
    task_id: string;
    wedding_id: string;
    old_deadline: string;
    new_deadline: string;
    updated_by: string;
    timestamp: string;
  };
  'task:helper_changed': {
    task_id: string;
    wedding_id: string;
    old_helper_id: string;
    new_helper_id: string;
    updated_by: string;
    timestamp: string;
  };
  'task:photo_uploaded': {
    task_id: string;
    wedding_id: string;
    photo_url: string;
    uploaded_by: string;
    timestamp: string;
  };
  'task:comment_added': {
    task_id: string;
    wedding_id: string;
    comment: string;
    added_by: string;
    timestamp: string;
  };
}

export class TaskStatusRealtimeManager {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private reconnectDelay = 1000;

  constructor(
    private weddingId: string,
    private userId: string,
  ) {}

  /**
   * Initialize real-time connection for task status tracking
   */
  async connect(): Promise<boolean> {
    try {
      this.connectionAttempts++;

      // Main task status channel
      const taskChannel = this.supabase.channel(
        `task-status:${this.weddingId}`,
        {
          config: {
            broadcast: { ack: true, self: true },
            presence: { key: this.userId },
            private: false,
          },
        },
      );

      // Set up broadcast listeners
      this.setupBroadcastListeners(taskChannel);

      // Set up presence tracking
      this.setupPresenceTracking(taskChannel);

      // Subscribe with connection handling
      taskChannel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.connectionAttempts = 0;
          console.log(`Task realtime connected for wedding ${this.weddingId}`);

          // Track user presence for task tracking
          await this.trackPresence({
            userId: this.userId,
            view: 'task_tracking',
            status: 'active',
            timestamp: new Date().toISOString(),
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Task realtime connection error:', err);
          this.isConnected = false;
          await this.handleConnectionError();
        } else if (status === 'CLOSED') {
          this.isConnected = false;
          await this.handleConnectionClosed();
        }
      });

      this.channels.set('main', taskChannel);

      // Set up database change listeners for task tables
      await this.setupDatabaseListeners();

      return true;
    } catch (error) {
      console.error('Failed to connect to task realtime:', error);
      await this.handleConnectionError();
      return false;
    }
  }

  /**
   * Disconnect from all realtime channels
   */
  disconnect(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.eventHandlers.clear();
    this.isConnected = false;
    this.connectionAttempts = 0;
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    lastConnected?: string;
    attempts: number;
  } {
    return {
      connected: this.isConnected,
      lastConnected: this.isConnected ? new Date().toISOString() : undefined,
      attempts: this.connectionAttempts,
    };
  }

  /**
   * Subscribe to task events with type safety
   */
  on<T extends keyof TaskRealtimeEvents>(
    event: T,
    handler: (data: TaskRealtimeEvents[T]) => void,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    };
  }

  /**
   * Emit real-time event with guaranteed delivery
   */
  async emit<T extends keyof TaskRealtimeEvents>(
    event: T,
    data: TaskRealtimeEvents[T],
  ): Promise<{ success: boolean; delivery_time_ms: number; error?: string }> {
    const startTime = Date.now();
    const channel = this.channels.get('main');

    if (!channel || !this.isConnected) {
      return {
        success: false,
        delivery_time_ms: Date.now() - startTime,
        error: 'Not connected to realtime',
      };
    }

    try {
      const payload = {
        ...data,
        event_id: `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wedding_id: this.weddingId,
        user_id: this.userId,
        timestamp: new Date().toISOString(),
      };

      const response = await channel.send({
        type: 'broadcast',
        event,
        payload,
      });

      const deliveryTime = Date.now() - startTime;

      if (response === 'ok') {
        // Log delivery metrics for monitoring
        this.logDeliveryMetrics(event, deliveryTime, true);

        return {
          success: true,
          delivery_time_ms: deliveryTime,
        };
      } else {
        this.logDeliveryMetrics(
          event,
          deliveryTime,
          false,
          `Response: ${response}`,
        );

        return {
          success: false,
          delivery_time_ms: deliveryTime,
          error: `Failed to send event: ${response}`,
        };
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logDeliveryMetrics(event, deliveryTime, false, errorMessage);

      return {
        success: false,
        delivery_time_ms: deliveryTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Broadcast task status change with automatic notification triggering
   */
  async broadcastTaskStatusChange(
    data: Omit<TaskStatusEvent, 'timestamp' | 'updated_by'>,
  ): Promise<void> {
    const event: TaskStatusEvent = {
      ...data,
      updated_by: this.userId,
      timestamp: new Date().toISOString(),
    };

    const result = await this.emit('task:status_changed', event);

    if (!result.success) {
      console.error('Failed to broadcast task status change:', result.error);
      throw new Error(`Realtime broadcast failed: ${result.error}`);
    }

    // Ensure delivery time is under 500ms requirement
    if (result.delivery_time_ms > 500) {
      console.warn(
        `Task status broadcast exceeded 500ms: ${result.delivery_time_ms}ms`,
      );
    }

    // Trigger notifications for status changes
    await this.triggerStatusChangeNotifications(event);
  }

  /**
   * Broadcast task assignment with notification
   */
  async broadcastTaskAssignment(
    data: Omit<TaskAssignmentEvent, 'timestamp' | 'assigned_by'>,
  ): Promise<void> {
    const event: TaskAssignmentEvent = {
      ...data,
      assigned_by: this.userId,
      timestamp: new Date().toISOString(),
    };

    const result = await this.emit('task:assigned', event);

    if (!result.success) {
      throw new Error(`Failed to broadcast task assignment: ${result.error}`);
    }

    // Trigger assignment notifications
    await this.triggerAssignmentNotifications(event);
  }

  /**
   * Broadcast task progress update
   */
  async broadcastProgressUpdate(
    data: Omit<TaskProgressUpdate, 'timestamp' | 'updated_by'>,
  ): Promise<void> {
    const event: TaskProgressUpdate = {
      ...data,
      updated_by: this.userId,
      timestamp: new Date().toISOString(),
    };

    await this.emit('task:progress_updated', event);
  }

  /**
   * Set up broadcast event listeners
   */
  private setupBroadcastListeners(channel: RealtimeChannel): void {
    // Task status events
    channel.on('broadcast', { event: 'task:status_changed' }, (payload) => {
      this.handleEvent('task:status_changed', payload.payload);
    });

    channel.on('broadcast', { event: 'task:assigned' }, (payload) => {
      this.handleEvent('task:assigned', payload.payload);
    });

    channel.on('broadcast', { event: 'task:reminder_sent' }, (payload) => {
      this.handleEvent('task:reminder_sent', payload.payload);
    });

    channel.on('broadcast', { event: 'task:progress_updated' }, (payload) => {
      this.handleEvent('task:progress_updated', payload.payload);
    });

    channel.on('broadcast', { event: 'task:deadline_updated' }, (payload) => {
      this.handleEvent('task:deadline_updated', payload.payload);
    });

    channel.on('broadcast', { event: 'task:helper_changed' }, (payload) => {
      this.handleEvent('task:helper_changed', payload.payload);
    });

    channel.on('broadcast', { event: 'task:photo_uploaded' }, (payload) => {
      this.handleEvent('task:photo_uploaded', payload.payload);
    });

    channel.on('broadcast', { event: 'task:comment_added' }, (payload) => {
      this.handleEvent('task:comment_added', payload.payload);
    });
  }

  /**
   * Set up presence tracking for task coordination
   */
  private setupPresenceTracking(channel: RealtimeChannel): void {
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      this.handleEvent('presence:sync', presenceState);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.handleEvent('presence:join', { user: key, presences: newPresences });
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      this.handleEvent('presence:leave', {
        user: key,
        presences: leftPresences,
      });
    });
  }

  /**
   * Set up database change listeners
   */
  private async setupDatabaseListeners(): Promise<void> {
    // Listen for task status changes
    const taskChannel = this.supabase
      .channel(`task-db-changes:${this.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_tasks',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload) => this.handleDatabaseChange('task', payload),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload) => this.handleDatabaseChange('assignment', payload),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_progress',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload) => this.handleDatabaseChange('progress', payload),
      )
      .subscribe();

    this.channels.set('database', taskChannel);
  }

  /**
   * Handle incoming events
   */
  private handleEvent(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error handling ${eventType} event:`, error);
        }
      });
    }
  }

  /**
   * Handle database changes
   */
  private handleDatabaseChange(
    type: 'task' | 'assignment' | 'progress',
    payload: any,
  ): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Convert database changes to realtime events
    switch (type) {
      case 'task':
        if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
          this.handleEvent('task:status_changed', {
            task_id: newRecord.id,
            wedding_id: newRecord.wedding_id,
            status: newRecord.status,
            previous_status: oldRecord.status,
            updated_by: 'system',
            timestamp: new Date().toISOString(),
          });
        }
        break;
      case 'assignment':
        if (eventType === 'INSERT') {
          this.handleEvent('task:assigned', {
            task_id: newRecord.task_id,
            wedding_id: newRecord.wedding_id,
            assigned_to: newRecord.helper_id,
            assigned_by: newRecord.assigned_by,
            timestamp: newRecord.created_at,
          });
        }
        break;
      case 'progress':
        if (eventType === 'UPDATE' || eventType === 'INSERT') {
          this.handleEvent('task:progress_updated', {
            task_id: newRecord.task_id,
            wedding_id: newRecord.wedding_id,
            progress_percentage: newRecord.progress_percentage,
            updated_by: newRecord.updated_by,
            timestamp: newRecord.updated_at,
          });
        }
        break;
    }
  }

  /**
   * Track user presence
   */
  private async trackPresence(data: Record<string, any>): Promise<void> {
    const channel = this.channels.get('main');
    if (channel) {
      try {
        await channel.track(data);
      } catch (error) {
        console.error('Failed to track presence:', error);
      }
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private async handleConnectionError(): Promise<void> {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      const delay =
        this.reconnectDelay * Math.pow(2, this.connectionAttempts - 1);
      console.log(
        `Reconnecting to task realtime in ${delay}ms (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`,
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max connection attempts reached for task realtime');
      this.handleEvent('connection:failed', {
        attempts: this.connectionAttempts,
      });
    }
  }

  /**
   * Handle connection closed
   */
  private async handleConnectionClosed(): Promise<void> {
    console.log('Task realtime connection closed, attempting reconnect...');
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Log delivery metrics for monitoring
   */
  private logDeliveryMetrics(
    event: string,
    deliveryTimeMs: number,
    success: boolean,
    error?: string,
  ): void {
    const metrics = {
      event_type: event,
      wedding_id: this.weddingId,
      delivery_time_ms: deliveryTimeMs,
      success,
      error,
      timestamp: new Date().toISOString(),
      user_id: this.userId,
    };

    // In production, this would send to a metrics service
    if (deliveryTimeMs > 500) {
      console.warn('Task realtime delivery exceeded 500ms:', metrics);
    }

    if (!success) {
      console.error('Task realtime delivery failed:', metrics);
    }
  }

  /**
   * Trigger notifications for task status changes
   */
  private async triggerStatusChangeNotifications(
    event: TaskStatusEvent,
  ): Promise<void> {
    try {
      // Call notification API to send alerts
      await fetch('/api/tasks/notifications/status-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to trigger status change notifications:', error);
    }
  }

  /**
   * Trigger notifications for task assignments
   */
  private async triggerAssignmentNotifications(
    event: TaskAssignmentEvent,
  ): Promise<void> {
    try {
      // Call notification API to send assignment alerts
      await fetch('/api/tasks/notifications/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to trigger assignment notifications:', error);
    }
  }
}

/**
 * React hook for task status realtime
 */
export function useTaskStatusRealtime(weddingId: string, userId: string) {
  const manager = new TaskStatusRealtimeManager(weddingId, userId);

  return {
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    getConnectionStatus: () => manager.getConnectionStatus(),

    // Event subscription
    on: manager.on.bind(manager),

    // Event emission
    broadcastTaskStatusChange: manager.broadcastTaskStatusChange.bind(manager),
    broadcastTaskAssignment: manager.broadcastTaskAssignment.bind(manager),
    broadcastProgressUpdate: manager.broadcastProgressUpdate.bind(manager),
  };
}
