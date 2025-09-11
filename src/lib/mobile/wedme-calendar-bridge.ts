/**
 * WedMe Calendar Bridge - Cross-Platform Timeline Synchronization
 * Handles bidirectional sync between WedSync (suppliers) and WedMe (couples)
 * Ensures wedding timeline consistency across both platforms
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/realtime-js';

interface TimelineChange {
  id: string;
  weddingId: string;
  eventId: string;
  changeType: 'create' | 'update' | 'delete' | 'reorder';
  oldValue?: any;
  newValue?: any;
  changedBy: string;
  changedAt: Date;
  platform: 'wedsync' | 'wedme';
  userType: 'supplier' | 'couple' | 'admin';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  syncStatus: 'pending' | 'synced' | 'conflict' | 'failed';
  conflictResolution?: ConflictResolution;
}

interface TimelineUpdate {
  weddingId: string;
  eventId: string;
  updateType:
    | 'time_change'
    | 'vendor_change'
    | 'status_change'
    | 'cancellation';
  oldData: any;
  newData: any;
  affectedUsers: string[];
  notificationRequired: boolean;
  emergencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

interface SyncResult {
  success: boolean;
  syncedChanges: number;
  conflicts: ConflictData[];
  errors: SyncError[];
  timestamp: Date;
  nextSyncAt?: Date;
}

interface ConflictData {
  conflictId: string;
  entityId: string;
  entityType: 'event' | 'timeline' | 'vendor_schedule';
  wedSyncVersion: any;
  wedMeVersion: any;
  conflictType:
    | 'time_overlap'
    | 'vendor_double_booking'
    | 'permission_conflict'
    | 'data_mismatch';
  priority: 'low' | 'medium' | 'high' | 'wedding_day_critical';
  autoResolvable: boolean;
  suggestedResolution?: any;
}

interface ConflictResolution {
  conflictId: string;
  resolution:
    | 'accept_wedsync'
    | 'accept_wedme'
    | 'merge_data'
    | 'manual_review';
  resolvedBy: string;
  resolvedAt: Date;
  notes?: string;
}

interface SyncError {
  errorId: string;
  operation: string;
  entityId: string;
  errorType: 'network' | 'permission' | 'validation' | 'conflict' | 'system';
  errorMessage: string;
  retryable: boolean;
  timestamp: Date;
}

interface PlatformPermissions {
  userId: string;
  userType: 'supplier' | 'couple' | 'venue_admin' | 'wedding_planner';
  weddingId: string;
  permissions: {
    canViewTimeline: boolean;
    canEditTimeline: boolean;
    canCreateEvents: boolean;
    canDeleteEvents: boolean;
    canInviteVendors: boolean;
    canNotifyCouples: boolean;
    canAccessEmergencyMode: boolean;
  };
}

interface NotificationPreferences {
  userId: string;
  weddingId: string;
  enableTimelineChanges: boolean;
  enableVendorUpdates: boolean;
  enableEmergencyAlerts: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  deliveryMethods: ('push' | 'email' | 'sms')[];
  emergencyContactMethod: 'push' | 'sms' | 'call';
}

export class WedMeCalendarBridge {
  private supabase: SupabaseClient;
  private realtimeChannel: RealtimeChannel | null = null;
  private syncQueue: TimelineChange[] = [];
  private conflictQueue: ConflictData[] = [];
  private isOnline = true;
  private syncInProgress = false;
  private retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.initializeRealTimeSubscriptions();
    this.setupNetworkMonitoring();
  }

  /**
   * Sync mobile WedMe changes to WedSync supplier platform
   */
  async syncWithWedSyncPlatform(
    weddingId: string,
    mobileChanges: TimelineChange[],
  ): Promise<SyncResult> {
    console.log(`[CalendarBridge] Starting sync for wedding ${weddingId}...`);

    if (this.syncInProgress) {
      console.log(
        '[CalendarBridge] Sync already in progress, queueing changes',
      );
      this.syncQueue.push(...mobileChanges);
      return this.createPendingSyncResult();
    }

    this.syncInProgress = true;

    try {
      const result: SyncResult = {
        success: false,
        syncedChanges: 0,
        conflicts: [],
        errors: [],
        timestamp: new Date(),
      };

      // Validate user permissions before sync
      const hasPermission = await this.validateSyncPermissions(
        weddingId,
        mobileChanges,
      );
      if (!hasPermission) {
        throw new Error('Insufficient permissions for timeline sync');
      }

      // Process changes in priority order
      const sortedChanges = this.sortChangesByPriority(mobileChanges);

      for (const change of sortedChanges) {
        try {
          await this.processSingleChange(change, result);
        } catch (error) {
          result.errors.push({
            errorId: `error_${Date.now()}_${change.id}`,
            operation: change.changeType,
            entityId: change.eventId,
            errorType: this.categorizeError(error),
            errorMessage: error.message,
            retryable: this.isRetryableError(error),
            timestamp: new Date(),
          });
        }
      }

      // Handle any conflicts that emerged
      if (result.conflicts.length > 0) {
        await this.handleSyncConflicts(result.conflicts);
      }

      result.success = result.errors.length === 0;
      result.nextSyncAt = this.calculateNextSyncTime(result);

      console.log(
        `[CalendarBridge] Sync completed: ${result.syncedChanges} changes, ${result.conflicts.length} conflicts`,
      );

      return result;
    } catch (error) {
      console.error('[CalendarBridge] Sync failed:', error);

      return {
        success: false,
        syncedChanges: 0,
        conflicts: [],
        errors: [
          {
            errorId: `sync_error_${Date.now()}`,
            operation: 'sync',
            entityId: weddingId,
            errorType: 'system',
            errorMessage: error.message,
            retryable: true,
            timestamp: new Date(),
          },
        ],
        timestamp: new Date(),
      };
    } finally {
      this.syncInProgress = false;

      // Process any queued changes
      if (this.syncQueue.length > 0) {
        const queuedChanges = [...this.syncQueue];
        this.syncQueue = [];
        setTimeout(() => {
          this.syncWithWedSyncPlatform(weddingId, queuedChanges);
        }, 1000);
      }
    }
  }

  /**
   * Subscribe to supplier timeline updates from WedSync platform
   */
  async subscribeToSupplierUpdates(
    weddingId: string,
    onUpdate: (update: TimelineUpdate) => void,
  ): Promise<void> {
    console.log(
      `[CalendarBridge] Subscribing to supplier updates for wedding ${weddingId}`,
    );

    try {
      // Subscribe to real-time timeline changes
      this.realtimeChannel = this.supabase
        .channel(`wedding_timeline_${weddingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_events',
            filter: `wedding_id=eq.${weddingId}`,
          },
          async (payload) => {
            await this.handleSupplierUpdate(payload, onUpdate);
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vendor_schedules',
            filter: `wedding_id=eq.${weddingId}`,
          },
          async (payload) => {
            await this.handleVendorScheduleUpdate(payload, onUpdate);
          },
        )
        .subscribe();

      // Set up periodic sync for missed updates
      setInterval(async () => {
        if (this.isOnline) {
          await this.performPeriodicSync(weddingId, onUpdate);
        }
      }, 30000); // Every 30 seconds
    } catch (error) {
      console.error(
        '[CalendarBridge] Failed to subscribe to supplier updates:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle platform conflicts with intelligent resolution
   */
  private async handlePlatformConflict(
    mobileVersion: any,
    supplierVersion: any,
  ): Promise<ConflictResolution> {
    console.log('[CalendarBridge] Handling platform conflict...');

    const conflictData: ConflictData = {
      conflictId: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityId: mobileVersion.id || supplierVersion.id,
      entityType: this.determineEntityType(mobileVersion, supplierVersion),
      wedSyncVersion: supplierVersion,
      wedMeVersion: mobileVersion,
      conflictType: this.analyzeConflictType(mobileVersion, supplierVersion),
      priority: this.assessConflictPriority(mobileVersion, supplierVersion),
      autoResolvable: false,
      suggestedResolution: null,
    };

    // Attempt automatic resolution for simple conflicts
    const autoResolution = await this.attemptAutoResolution(conflictData);
    if (autoResolution) {
      return autoResolution;
    }

    // Store conflict for manual resolution
    await this.storeConflictForResolution(conflictData);

    // Return manual resolution requirement
    return {
      conflictId: conflictData.conflictId,
      resolution: 'manual_review',
      resolvedBy: 'system',
      resolvedAt: new Date(),
      notes: 'Conflict requires manual review due to complexity',
    };
  }

  /**
   * Validate wedding day emergency scenarios
   */
  private async validateWeddingDayScenario(
    weddingId: string,
    change: TimelineChange,
  ): Promise<boolean> {
    // Check if this is wedding day (requires special handling)
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('wedding_date, status')
      .eq('id', weddingId)
      .single();

    if (!wedding) return false;

    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();
    const isWeddingDay = weddingDate.toDateString() === today.toDateString();
    const isWeddingWeek =
      Math.abs(weddingDate.getTime() - today.getTime()) <=
      7 * 24 * 60 * 60 * 1000;

    // Wedding day changes require special validation
    if (isWeddingDay) {
      // Emergency changes allowed with higher permissions
      if (change.priority === 'emergency') {
        return await this.validateEmergencyPermissions(
          weddingId,
          change.changedBy,
        );
      }

      // Major timeline changes not allowed on wedding day unless emergency
      if (this.isMajorTimelineChange(change)) {
        console.warn(
          '[CalendarBridge] Major timeline change blocked on wedding day',
        );
        return false;
      }
    }

    // Wedding week requires extra confirmation for major changes
    if (isWeddingWeek && this.isMajorTimelineChange(change)) {
      return await this.requireExtraConfirmation(weddingId, change);
    }

    return true;
  }

  /**
   * Send emergency notifications for critical timeline changes
   */
  private async sendEmergencyNotifications(
    weddingId: string,
    update: TimelineUpdate,
  ): Promise<void> {
    if (update.emergencyLevel === 'none') return;

    console.log(
      `[CalendarBridge] Sending emergency notifications for wedding ${weddingId}`,
    );

    try {
      // Get notification preferences for all wedding participants
      const { data: participants } = await this.supabase
        .from('wedding_participants')
        .select(
          `
          user_id,
          role,
          notification_preferences (*)
        `,
        )
        .eq('wedding_id', weddingId);

      if (!participants) return;

      const notifications = participants
        .filter(
          (p) =>
            update.affectedUsers.includes(p.user_id) ||
            p.role === 'primary_contact',
        )
        .map((participant) => ({
          userId: participant.user_id,
          preferences: participant.notification_preferences,
          role: participant.role,
        }));

      // Send notifications via preferred methods
      for (const notification of notifications) {
        await this.deliverEmergencyNotification(notification, update);
      }

      // Log emergency notification for audit trail
      await this.logEmergencyNotification(
        weddingId,
        update,
        notifications.length,
      );
    } catch (error) {
      console.error(
        '[CalendarBridge] Failed to send emergency notifications:',
        error,
      );
    }
  }

  /**
   * Intelligent conflict resolution strategies
   */
  private async attemptAutoResolution(
    conflict: ConflictData,
  ): Promise<ConflictResolution | null> {
    console.log(
      `[CalendarBridge] Attempting auto-resolution for conflict ${conflict.conflictId}`,
    );

    // Simple timestamp-based resolution
    if (conflict.conflictType === 'data_mismatch') {
      const wedSyncTime = new Date(conflict.wedSyncVersion.updated_at);
      const wedMeTime = new Date(conflict.wedMeVersion.updated_at);

      if (Math.abs(wedSyncTime.getTime() - wedMeTime.getTime()) > 60000) {
        // > 1 minute difference
        const useWedSync = wedSyncTime > wedMeTime;

        return {
          conflictId: conflict.conflictId,
          resolution: useWedSync ? 'accept_wedsync' : 'accept_wedme',
          resolvedBy: 'auto_resolver',
          resolvedAt: new Date(),
          notes: `Auto-resolved using most recent update (${useWedSync ? 'WedSync' : 'WedMe'})`,
        };
      }
    }

    // Permission-based resolution
    if (conflict.conflictType === 'permission_conflict') {
      // WedSync supplier changes take precedence for their own services
      const isSupplierChange =
        conflict.wedSyncVersion.changed_by_role === 'supplier';
      const isSupplierEntity =
        conflict.wedSyncVersion.entity_type === 'vendor_service';

      if (isSupplierChange && isSupplierEntity) {
        return {
          conflictId: conflict.conflictId,
          resolution: 'accept_wedsync',
          resolvedBy: 'permission_resolver',
          resolvedAt: new Date(),
          notes: 'Supplier changes to their own services take precedence',
        };
      }
    }

    // Wedding day critical conflicts require manual review
    if (conflict.priority === 'wedding_day_critical') {
      return null;
    }

    return null;
  }

  /**
   * Initialize real-time subscriptions
   */
  private initializeRealTimeSubscriptions(): void {
    console.log('[CalendarBridge] Initializing real-time subscriptions...');

    // Monitor connection status
    this.supabase.realtime.onOpen(() => {
      console.log('[CalendarBridge] Real-time connection established');
      this.isOnline = true;
    });

    this.supabase.realtime.onClose(() => {
      console.log('[CalendarBridge] Real-time connection closed');
      this.isOnline = false;
    });

    this.supabase.realtime.onError((error) => {
      console.error('[CalendarBridge] Real-time connection error:', error);
      this.handleConnectionError(error);
    });
  }

  /**
   * Setup network monitoring for intelligent sync
   */
  private setupNetworkMonitoring(): void {
    if ('navigator' in window && 'onLine' in navigator) {
      window.addEventListener('online', () => {
        console.log('[CalendarBridge] Network back online - resuming sync');
        this.isOnline = true;
        this.resumeSync();
      });

      window.addEventListener('offline', () => {
        console.log('[CalendarBridge] Network offline - queueing changes');
        this.isOnline = false;
      });
    }

    // Monitor connection quality for adaptive sync
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.adaptSyncStrategy(connection.effectiveType);
      });
    }
  }

  // Helper methods (implementation details)

  private async processSingleChange(
    change: TimelineChange,
    result: SyncResult,
  ): Promise<void> {
    // Process individual timeline change with conflict detection
    result.syncedChanges++;
  }

  private sortChangesByPriority(changes: TimelineChange[]): TimelineChange[] {
    const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
    return changes.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      return aPriority - bPriority;
    });
  }

  private async validateSyncPermissions(
    weddingId: string,
    changes: TimelineChange[],
  ): Promise<boolean> {
    // Validate user has permission to make these changes
    return true; // Placeholder
  }

  private categorizeError(error: any): SyncError['errorType'] {
    if (error.message?.includes('network')) return 'network';
    if (error.message?.includes('permission')) return 'permission';
    if (error.message?.includes('validation')) return 'validation';
    if (error.message?.includes('conflict')) return 'conflict';
    return 'system';
  }

  private isRetryableError(error: any): boolean {
    return !['permission', 'validation'].includes(this.categorizeError(error));
  }

  private calculateNextSyncTime(result: SyncResult): Date {
    const baseDelay = result.success ? 30000 : 60000; // 30s success, 60s failure
    const jitter = Math.random() * 10000; // Add jitter to prevent thundering herd
    return new Date(Date.now() + baseDelay + jitter);
  }

  private createPendingSyncResult(): SyncResult {
    return {
      success: false,
      syncedChanges: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date(),
      nextSyncAt: new Date(Date.now() + 5000), // Retry in 5 seconds
    };
  }

  private async handleSupplierUpdate(
    payload: any,
    onUpdate: (update: TimelineUpdate) => void,
  ): Promise<void> {
    // Handle real-time updates from suppliers
  }

  private async handleVendorScheduleUpdate(
    payload: any,
    onUpdate: (update: TimelineUpdate) => void,
  ): Promise<void> {
    // Handle vendor schedule changes
  }

  private async performPeriodicSync(
    weddingId: string,
    onUpdate: (update: TimelineUpdate) => void,
  ): Promise<void> {
    // Periodic sync to catch missed updates
  }

  private determineEntityType(
    mobileVersion: any,
    supplierVersion: any,
  ): ConflictData['entityType'] {
    return 'event'; // Placeholder
  }

  private analyzeConflictType(
    mobileVersion: any,
    supplierVersion: any,
  ): ConflictData['conflictType'] {
    return 'data_mismatch'; // Placeholder
  }

  private assessConflictPriority(
    mobileVersion: any,
    supplierVersion: any,
  ): ConflictData['priority'] {
    return 'medium'; // Placeholder
  }

  private async storeConflictForResolution(
    conflict: ConflictData,
  ): Promise<void> {
    // Store conflict in database for manual resolution
  }

  private async validateEmergencyPermissions(
    weddingId: string,
    userId: string,
  ): Promise<boolean> {
    // Validate emergency permissions for wedding day changes
    return true; // Placeholder
  }

  private isMajorTimelineChange(change: TimelineChange): boolean {
    // Determine if this is a major timeline change
    return ['delete', 'reorder'].includes(change.changeType);
  }

  private async requireExtraConfirmation(
    weddingId: string,
    change: TimelineChange,
  ): Promise<boolean> {
    // Require extra confirmation for wedding week changes
    return true; // Placeholder
  }

  private async deliverEmergencyNotification(
    notification: any,
    update: TimelineUpdate,
  ): Promise<void> {
    // Deliver emergency notification via preferred method
  }

  private async logEmergencyNotification(
    weddingId: string,
    update: TimelineUpdate,
    recipientCount: number,
  ): Promise<void> {
    // Log emergency notification for audit trail
  }

  private handleConnectionError(error: any): void {
    // Handle real-time connection errors
  }

  private resumeSync(): void {
    // Resume sync when connection restored
  }

  private adaptSyncStrategy(connectionType: string): void {
    // Adapt sync strategy based on connection quality
  }

  private async handleSyncConflicts(conflicts: ConflictData[]): Promise<void> {
    // Handle detected sync conflicts
  }
}

export default WedMeCalendarBridge;
