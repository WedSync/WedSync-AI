'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type {
  WeddingDayRealtimeEvents,
  VendorCheckIn,
  TimelineEvent,
  WeddingDayIssue,
  CoordinatorPresence,
  WeddingDayCoordination,
  RealtimeUpdate,
} from '@/types/wedding-day';

export class WeddingDayRealtimeManager {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  constructor(
    private weddingId: string,
    private coordinatorId: string,
  ) {}

  /**
   * Initialize the realtime connection for wedding day coordination
   */
  async connect(): Promise<boolean> {
    try {
      // Main wedding day channel for coordination
      const mainChannel = this.supabase.channel(
        `wedding-day:${this.weddingId}`,
        {
          config: {
            broadcast: { ack: true },
            presence: { key: this.coordinatorId },
          },
        },
      );

      // Set up broadcast listeners
      this.setupBroadcastListeners(mainChannel);

      // Set up presence tracking
      this.setupPresenceTracking(mainChannel);

      // Subscribe to the channel
      mainChannel.subscribe(async (status) => {
        this.isConnected = status === 'SUBSCRIBED';

        if (status === 'SUBSCRIBED') {
          console.log('Wedding day realtime connected');

          // Track coordinator presence
          await this.trackPresence({
            coordinatorId: this.coordinatorId,
            role: 'lead',
            status: 'active',
            view: 'dashboard',
            timestamp: new Date().toISOString(),
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Wedding day realtime connection error');
          this.isConnected = false;
        }
      });

      this.channels.set('main', mainChannel);

      // Set up database change listeners
      await this.setupDatabaseListeners();

      return true;
    } catch (error) {
      console.error('Failed to connect to wedding day realtime:', error);
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
  }

  /**
   * Check if realtime is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Subscribe to specific wedding day events
   */
  on<T extends keyof WeddingDayRealtimeEvents>(
    event: T,
    handler: (data: WeddingDayRealtimeEvents[T]) => void,
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
   * Emit a realtime event to all connected clients
   */
  async emit<T extends keyof WeddingDayRealtimeEvents>(
    event: T,
    data: WeddingDayRealtimeEvents[T],
  ): Promise<void> {
    const channel = this.channels.get('main');
    if (!channel || !this.isConnected) {
      throw new Error('Realtime not connected');
    }

    try {
      const response = await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...data,
          timestamp: new Date().toISOString(),
          userId: this.coordinatorId,
          weddingId: this.weddingId,
        },
      });

      if (response !== 'ok') {
        throw new Error(`Failed to send ${event} event`);
      }
    } catch (error) {
      console.error(`Failed to emit ${event} event:`, error);
      throw error;
    }
  }

  /**
   * Track coordinator presence
   */
  async trackPresence(
    presence: Omit<CoordinatorPresence, 'userId'>,
  ): Promise<void> {
    const channel = this.channels.get('main');
    if (!channel) return;

    try {
      await channel.track({
        userId: this.coordinatorId,
        ...presence,
      });
    } catch (error) {
      console.error('Failed to track presence:', error);
    }
  }

  /**
   * Update coordinator status
   */
  async updateStatus(
    status: CoordinatorPresence['status'],
    location?: CoordinatorPresence['currentLocation'],
  ): Promise<void> {
    await this.trackPresence({
      coordinatorId: this.coordinatorId,
      role: 'lead',
      status,
      currentLocation: location,
      lastSeen: new Date().toISOString(),
    });
  }

  /**
   * Send vendor check-in event
   */
  async vendorCheckIn(
    vendorId: string,
    location?: { lat: number; lng: number },
    notes?: string,
  ): Promise<void> {
    await this.emit('vendor:checkin', {
      id: `checkin-${Date.now()}`,
      vendorId,
      vendorName: '', // Should be populated from vendor data
      vendorType: 'other',
      checkInTime: new Date().toISOString(),
      location: location
        ? { ...location, address: 'Current Location' }
        : undefined,
      status: 'checked-in',
      notes,
      contact: { phone: '', email: '' },
      assignedTasks: [],
    });
  }

  /**
   * Send vendor status update
   */
  async updateVendorStatus(
    vendorId: string,
    status: VendorCheckIn['status'],
    eta?: string,
  ): Promise<void> {
    await this.emit('vendor:status_update', { vendorId, status, eta });
  }

  /**
   * Update timeline event
   */
  async updateTimelineEvent(
    eventId: string,
    update: Partial<TimelineEvent>,
  ): Promise<void> {
    await this.emit('timeline:event_update', { eventId, update });
  }

  /**
   * Reorder timeline events
   */
  async reorderTimeline(newOrder: string[]): Promise<void> {
    await this.emit('timeline:reorder', { newOrder });
  }

  /**
   * Create a new issue
   */
  async createIssue(
    issue: Omit<WeddingDayIssue, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<void> {
    const newIssue: WeddingDayIssue = {
      ...issue,
      id: `issue-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.emit('issue:created', newIssue);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    issueId: string,
    update: Partial<WeddingDayIssue>,
  ): Promise<void> {
    await this.emit('issue:updated', { issueId, update });
  }

  /**
   * Send weather alert
   */
  async sendWeatherAlert(alert: any, affectedEvents: string[]): Promise<void> {
    await this.emit('weather:alert', { alert, affectedEvents });
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(
    message: string,
    severity: 'medium' | 'high' | 'critical',
  ): Promise<void> {
    await this.emit('emergency:alert', { message, severity });
  }

  /**
   * Send communication message
   */
  async sendMessage(message: any): Promise<void> {
    await this.emit('communication:message', message);
  }

  /**
   * Set up broadcast event listeners
   */
  private setupBroadcastListeners(channel: RealtimeChannel): void {
    // Vendor events
    channel.on('broadcast', { event: 'vendor:checkin' }, (payload) => {
      this.handleEvent('vendor:checkin', payload.payload);
    });

    channel.on('broadcast', { event: 'vendor:status_update' }, (payload) => {
      this.handleEvent('vendor:status_update', payload.payload);
    });

    // Timeline events
    channel.on('broadcast', { event: 'timeline:event_update' }, (payload) => {
      this.handleEvent('timeline:event_update', payload.payload);
    });

    channel.on('broadcast', { event: 'timeline:reorder' }, (payload) => {
      this.handleEvent('timeline:reorder', payload.payload);
    });

    // Issue events
    channel.on('broadcast', { event: 'issue:created' }, (payload) => {
      this.handleEvent('issue:created', payload.payload);
    });

    channel.on('broadcast', { event: 'issue:updated' }, (payload) => {
      this.handleEvent('issue:updated', payload.payload);
    });

    // Weather events
    channel.on('broadcast', { event: 'weather:alert' }, (payload) => {
      this.handleEvent('weather:alert', payload.payload);
    });

    // Emergency events
    channel.on('broadcast', { event: 'emergency:alert' }, (payload) => {
      this.handleEvent('emergency:alert', payload.payload);
    });

    // Communication events
    channel.on('broadcast', { event: 'communication:message' }, (payload) => {
      this.handleEvent('communication:message', payload.payload);
    });
  }

  /**
   * Set up presence tracking
   */
  private setupPresenceTracking(channel: RealtimeChannel): void {
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      this.handleEvent('coordinator:presence', presenceState);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('Coordinator joined:', key, newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('Coordinator left:', key, leftPresences);
    });
  }

  /**
   * Set up database change listeners
   */
  private async setupDatabaseListeners(): Promise<void> {
    // Listen for wedding day coordination changes
    const coordinationChannel = this.supabase
      .channel(`wedding-coordination:${this.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_day_coordination',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload: RealtimePostgresChangesPayload<WeddingDayCoordination>) => {
          this.handleDatabaseChange('coordination', payload);
        },
      )
      .subscribe();

    // Listen for vendor check-in changes
    const vendorChannel = this.supabase
      .channel(`vendor-checkins:${this.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_checkins',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload: RealtimePostgresChangesPayload<VendorCheckIn>) => {
          this.handleDatabaseChange('vendor', payload);
        },
      )
      .subscribe();

    // Listen for timeline changes
    const timelineChannel = this.supabase
      .channel(`timeline-events:${this.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload: RealtimePostgresChangesPayload<TimelineEvent>) => {
          this.handleDatabaseChange('timeline', payload);
        },
      )
      .subscribe();

    // Listen for issue changes
    const issueChannel = this.supabase
      .channel(`wedding-issues:${this.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_day_issues',
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload: RealtimePostgresChangesPayload<WeddingDayIssue>) => {
          this.handleDatabaseChange('issue', payload);
        },
      )
      .subscribe();

    this.channels.set('coordination', coordinationChannel);
    this.channels.set('vendors', vendorChannel);
    this.channels.set('timeline', timelineChannel);
    this.channels.set('issues', issueChannel);
  }

  /**
   * Handle incoming broadcast events
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
    type: 'coordination' | 'vendor' | 'timeline' | 'issue',
    payload: RealtimePostgresChangesPayload<any>,
  ): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Create a unified update event
    const updateEvent: RealtimeUpdate = {
      type:
        type === 'vendor'
          ? 'vendor_checkin'
          : type === 'timeline'
            ? 'timeline_update'
            : type === 'issue'
              ? 'issue_created'
              : 'coordinator_message',
      data: {
        eventType,
        newRecord,
        oldRecord,
      },
      timestamp: new Date().toISOString(),
      userId: 'system',
      weddingId: this.weddingId,
      priority: 'medium',
    };

    // Notify relevant event handlers
    this.handleEvent('database:change', updateEvent);
  }
}

// Hook for using wedding day realtime in React components
export function useWeddingDayRealtime(
  weddingId: string,
  coordinatorId: string,
) {
  const manager = new WeddingDayRealtimeManager(weddingId, coordinatorId);

  return {
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    isConnected: () => manager.getConnectionStatus(),

    // Event subscription
    on: manager.on.bind(manager),

    // Event emission
    vendorCheckIn: manager.vendorCheckIn.bind(manager),
    updateVendorStatus: manager.updateVendorStatus.bind(manager),
    updateTimelineEvent: manager.updateTimelineEvent.bind(manager),
    reorderTimeline: manager.reorderTimeline.bind(manager),
    createIssue: manager.createIssue.bind(manager),
    updateIssue: manager.updateIssue.bind(manager),
    sendWeatherAlert: manager.sendWeatherAlert.bind(manager),
    sendEmergencyAlert: manager.sendEmergencyAlert.bind(manager),
    sendMessage: manager.sendMessage.bind(manager),

    // Presence management
    trackPresence: manager.trackPresence.bind(manager),
    updateStatus: manager.updateStatus.bind(manager),
  };
}
