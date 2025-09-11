/**
 * Enhanced Real-time Timeline Service - WS-160
 * Handles collaborative timeline editing with Supabase Realtime
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  WeddingTimeline,
  TimelineEvent,
  TimelineConflict,
  TimelineActivityLog,
  RealtimeUpdate,
  RealtimePresence,
} from '@/types/timeline';

interface TimelineEditLock {
  eventId: string;
  userId: string;
  userName: string;
  timestamp: number;
  expiresAt: number;
}

interface TimelineVersion {
  id: string;
  timelineId: string;
  version: number;
  changes: any;
  createdBy: string;
  createdAt: string;
  description?: string;
}

interface CollaborationState {
  activeUsers: Map<string, RealtimePresence>;
  editLocks: Map<string, TimelineEditLock>;
  pendingChanges: Map<string, any>;
  conflicts: TimelineConflict[];
  lastSyncTime: number;
}

export class EnhancedRealtimeTimelineService {
  private supabase: any;
  private channel: RealtimeChannel | null = null;
  private timelineId: string;
  private userId: string;
  private userName: string;
  private collaborationState: CollaborationState;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(timelineId: string, userId: string, userName: string) {
    this.timelineId = timelineId;
    this.userId = userId;
    this.userName = userName;

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.collaborationState = {
      activeUsers: new Map(),
      editLocks: new Map(),
      pendingChanges: new Map(),
      conflicts: [],
      lastSyncTime: Date.now(),
    };
  }

  /**
   * Initialize real-time collaboration
   */
  async initialize(): Promise<void> {
    const channelName = `timeline:${this.timelineId}`;

    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: this.userId },
      },
    });

    // Handle presence updates
    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        this.handleUserJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        this.handleUserLeave(key, leftPresences);
      });

    // Handle broadcast events
    this.channel
      .on('broadcast', { event: 'timeline_update' }, (payload: any) => {
        this.handleTimelineUpdate(payload);
      })
      .on('broadcast', { event: 'edit_lock' }, (payload: any) => {
        this.handleEditLock(payload);
      })
      .on('broadcast', { event: 'edit_unlock' }, (payload: any) => {
        this.handleEditUnlock(payload);
      })
      .on('broadcast', { event: 'conflict_detected' }, (payload: any) => {
        this.handleConflictDetected(payload);
      })
      .on('broadcast', { event: 'version_created' }, (payload: any) => {
        this.handleVersionCreated(payload);
      });

    // Subscribe to channel
    await this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.announcePresence();
        this.startHeartbeat();
        this.startAutoSave();
      }
    });
  }

  /**
   * Announce user presence
   */
  private async announcePresence(): Promise<void> {
    const presence: RealtimePresence = {
      user_id: this.userId,
      user_name: this.userName,
      last_activity: new Date().toISOString(),
    };

    await this.channel?.track(presence);
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(): void {
    const presences = this.channel?.presenceState();
    if (!presences) return;

    this.collaborationState.activeUsers.clear();

    Object.entries(presences).forEach(([userId, presence]: [string, any]) => {
      if (presence.length > 0) {
        this.collaborationState.activeUsers.set(userId, presence[0]);
      }
    });
  }

  /**
   * Handle user join
   */
  private handleUserJoin(key: string, newPresences: any[]): void {
    if (newPresences.length > 0) {
      this.collaborationState.activeUsers.set(key, newPresences[0]);
    }
  }

  /**
   * Handle user leave
   */
  private handleUserLeave(key: string, leftPresences: any[]): void {
    this.collaborationState.activeUsers.delete(key);

    // Release any locks held by the user
    this.collaborationState.editLocks.forEach((lock, eventId) => {
      if (lock.userId === key) {
        this.collaborationState.editLocks.delete(eventId);
        this.broadcastEditUnlock(eventId);
      }
    });
  }

  /**
   * Create or update timeline event
   */
  async updateTimelineEvent(
    event: Partial<TimelineEvent>,
    eventId?: string,
  ): Promise<{ success: boolean; conflict?: TimelineConflict }> {
    // Check for edit lock
    if (eventId && this.isEventLocked(eventId)) {
      return {
        success: false,
        conflict: {
          id: `lock_${Date.now()}`,
          timeline_id: this.timelineId,
          conflict_type: 'edit_lock',
          severity: 'warning',
          event_id_1: eventId,
          description: 'Event is currently being edited by another user',
          is_resolved: false,
          detected_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          can_auto_resolve: false,
        },
      };
    }

    try {
      // Detect conflicts with other events
      const conflicts = await this.detectConflicts(event, eventId);
      if (
        conflicts.length > 0 &&
        conflicts.some((c) => c.severity === 'error')
      ) {
        return { success: false, conflict: conflicts[0] };
      }

      // Create version snapshot before changes
      await this.createVersionSnapshot('Event Update');

      // Update event in database
      let result;
      if (eventId) {
        result = await this.supabase
          .from('timeline_events')
          .update({ ...event, updated_by: this.userId })
          .eq('id', eventId)
          .select()
          .single();
      } else {
        result = await this.supabase
          .from('timeline_events')
          .insert({
            ...event,
            timeline_id: this.timelineId,
            created_by: this.userId,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Log activity
      await this.logActivity({
        action: eventId ? 'updated' : 'created',
        entity_type: 'event',
        entity_id: result.data.id,
        new_values: event,
      });

      // Broadcast update
      await this.broadcastTimelineUpdate({
        type: eventId ? 'event_update' : 'event_create',
        payload: result.data,
        user_id: this.userId,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update timeline event:', error);
      return { success: false };
    }
  }

  /**
   * Delete timeline event
   */
  async deleteTimelineEvent(eventId: string): Promise<boolean> {
    if (this.isEventLocked(eventId)) {
      return false;
    }

    try {
      // Create version snapshot
      await this.createVersionSnapshot('Event Deletion');

      // Get event data before deletion
      const { data: eventData } = await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('id', eventId)
        .single();

      // Delete event
      const result = await this.supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (result.error) throw result.error;

      // Log activity
      await this.logActivity({
        action: 'deleted',
        entity_type: 'event',
        entity_id: eventId,
        old_values: eventData,
      });

      // Broadcast deletion
      await this.broadcastTimelineUpdate({
        type: 'event_delete',
        payload: { id: eventId },
        user_id: this.userId,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Failed to delete timeline event:', error);
      return false;
    }
  }

  /**
   * Lock event for editing
   */
  async lockEventForEditing(eventId: string): Promise<boolean> {
    if (this.isEventLocked(eventId)) {
      return false;
    }

    const lock: TimelineEditLock = {
      eventId,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now(),
      expiresAt: Date.now() + 300000, // 5 minutes
    };

    this.collaborationState.editLocks.set(eventId, lock);

    await this.broadcastEditLock(lock);
    return true;
  }

  /**
   * Unlock event
   */
  async unlockEvent(eventId: string): Promise<void> {
    const lock = this.collaborationState.editLocks.get(eventId);
    if (lock && lock.userId === this.userId) {
      this.collaborationState.editLocks.delete(eventId);
      await this.broadcastEditUnlock(eventId);
    }
  }

  /**
   * Check if event is locked by another user
   */
  private isEventLocked(eventId: string): boolean {
    const lock = this.collaborationState.editLocks.get(eventId);
    if (!lock) return false;

    // Check if lock expired
    if (Date.now() > lock.expiresAt) {
      this.collaborationState.editLocks.delete(eventId);
      return false;
    }

    return lock.userId !== this.userId;
  }

  /**
   * Detect timeline conflicts
   */
  private async detectConflicts(
    event: Partial<TimelineEvent>,
    eventId?: string,
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];

    if (!event.start_time || !event.end_time) return conflicts;

    // Get overlapping events
    const { data: overlappingEvents } = await this.supabase
      .from('timeline_events')
      .select('*')
      .eq('timeline_id', this.timelineId)
      .neq('id', eventId || '')
      .or(`start_time.lt.${event.end_time},end_time.gt.${event.start_time}`);

    if (overlappingEvents) {
      for (const overlappingEvent of overlappingEvents) {
        // Check venue conflicts
        if (event.location && overlappingEvent.location === event.location) {
          conflicts.push({
            id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timeline_id: this.timelineId,
            conflict_type: 'location_conflict',
            severity: 'error',
            event_id_1: eventId || 'new',
            event_id_2: overlappingEvent.id,
            description: `Venue conflict: Both events scheduled at ${event.location}`,
            is_resolved: false,
            detected_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
            can_auto_resolve: false,
          });
        }

        // Check time overlap
        const startTime = new Date(event.start_time!);
        const endTime = new Date(event.end_time!);
        const overlapStart = new Date(overlappingEvent.start_time);
        const overlapEnd = new Date(overlappingEvent.end_time);

        if (startTime < overlapEnd && overlapStart < endTime) {
          conflicts.push({
            id: `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timeline_id: this.timelineId,
            conflict_type: 'time_overlap',
            severity: 'warning',
            event_id_1: eventId || 'new',
            event_id_2: overlappingEvent.id,
            description: 'Time overlap detected between events',
            is_resolved: false,
            detected_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
            can_auto_resolve: true,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Create version snapshot
   */
  private async createVersionSnapshot(description: string): Promise<void> {
    try {
      // Get current timeline state
      const { data: currentEvents } = await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('timeline_id', this.timelineId);

      // Get current version number
      const { data: latestVersion } = await this.supabase
        .from('timeline_versions')
        .select('version')
        .eq('timeline_id', this.timelineId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const newVersion = (latestVersion?.version || 0) + 1;

      // Create version record
      await this.supabase.from('timeline_versions').insert({
        timeline_id: this.timelineId,
        version: newVersion,
        changes: { events: currentEvents },
        created_by: this.userId,
        description,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create version snapshot:', error);
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackToVersion(version: number): Promise<boolean> {
    try {
      const { data: versionData } = await this.supabase
        .from('timeline_versions')
        .select('*')
        .eq('timeline_id', this.timelineId)
        .eq('version', version)
        .single();

      if (!versionData) return false;

      // Create backup of current state
      await this.createVersionSnapshot(`Rollback to version ${version}`);

      // Delete current events
      await this.supabase
        .from('timeline_events')
        .delete()
        .eq('timeline_id', this.timelineId);

      // Restore events from version
      if (versionData.changes.events?.length > 0) {
        await this.supabase.from('timeline_events').insert(
          versionData.changes.events.map((event: any) => ({
            ...event,
            id: undefined, // Let database generate new IDs
            updated_by: this.userId,
          })),
        );
      }

      // Broadcast rollback
      await this.broadcastTimelineUpdate({
        type: 'rollback',
        payload: { version },
        user_id: this.userId,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Failed to rollback timeline:', error);
      return false;
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(): Promise<TimelineVersion[]> {
    const { data } = await this.supabase
      .from('timeline_versions')
      .select('*')
      .eq('timeline_id', this.timelineId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Log timeline activity
   */
  private async logActivity(
    activity: Omit<TimelineActivityLog, 'id' | 'timeline_id' | 'created_at'>,
  ): Promise<void> {
    await this.supabase.from('timeline_activity_logs').insert({
      ...activity,
      timeline_id: this.timelineId,
      user_id: this.userId,
      user_name: this.userName,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Broadcast timeline update
   */
  private async broadcastTimelineUpdate(update: RealtimeUpdate): Promise<void> {
    await this.channel?.send({
      type: 'broadcast',
      event: 'timeline_update',
      payload: update,
    });
  }

  /**
   * Broadcast edit lock
   */
  private async broadcastEditLock(lock: TimelineEditLock): Promise<void> {
    await this.channel?.send({
      type: 'broadcast',
      event: 'edit_lock',
      payload: lock,
    });
  }

  /**
   * Broadcast edit unlock
   */
  private async broadcastEditUnlock(eventId: string): Promise<void> {
    await this.channel?.send({
      type: 'broadcast',
      event: 'edit_unlock',
      payload: { eventId, userId: this.userId },
    });
  }

  /**
   * Handle timeline update from other users
   */
  private handleTimelineUpdate(payload: any): void {
    if (payload.user_id === this.userId) return; // Ignore own updates

    this.collaborationState.lastSyncTime = Date.now();

    // Emit to local listeners
    window.dispatchEvent(
      new CustomEvent('timeline_update', { detail: payload }),
    );
  }

  /**
   * Handle edit lock from other users
   */
  private handleEditLock(payload: any): void {
    const lock = payload.payload as TimelineEditLock;
    if (lock.userId !== this.userId) {
      this.collaborationState.editLocks.set(lock.eventId, lock);
    }
  }

  /**
   * Handle edit unlock from other users
   */
  private handleEditUnlock(payload: any): void {
    const { eventId } = payload.payload;
    this.collaborationState.editLocks.delete(eventId);
  }

  /**
   * Handle conflict detection
   */
  private handleConflictDetected(payload: any): void {
    const conflict = payload.payload as TimelineConflict;
    this.collaborationState.conflicts.push(conflict);

    // Emit to local listeners
    window.dispatchEvent(
      new CustomEvent('timeline_conflict', { detail: conflict }),
    );
  }

  /**
   * Handle version creation
   */
  private handleVersionCreated(payload: any): void {
    // Emit to local listeners
    window.dispatchEvent(
      new CustomEvent('timeline_version_created', { detail: payload.payload }),
    );
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.announcePresence();
    }, 30000); // Every 30 seconds
  }

  /**
   * Start auto-save for pending changes
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.processPendingChanges();
    }, 5000); // Every 5 seconds
  }

  /**
   * Process any pending changes
   */
  private processPendingChanges(): void {
    // Implementation for batching and saving pending changes
    if (this.collaborationState.pendingChanges.size > 0) {
      // Process batched changes here
      this.collaborationState.pendingChanges.clear();
    }
  }

  /**
   * Get current collaboration state
   */
  getCollaborationState(): CollaborationState {
    return this.collaborationState;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Release all locks
    for (const [eventId] of this.collaborationState.editLocks) {
      await this.unlockEvent(eventId);
    }

    // Unsubscribe from channel
    if (this.channel) {
      await this.channel.unsubscribe();
    }
  }
}
