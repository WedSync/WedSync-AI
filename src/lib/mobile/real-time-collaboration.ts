/**
 * Real-Time Collaboration System for Mobile Budget
 * Team D - Round 2 WS-163 Implementation
 *
 * Handles real-time collaborative budget editing with conflict resolution,
 * live cursors, and collaborative awareness for wedding planning.
 */

import { createClient } from '@supabase/supabase-js';
import {
  WeddingBudget,
  BudgetCategory,
  BudgetItem,
} from './advanced-budget-system';

// ==================== TYPES AND INTERFACES ====================

export interface CollaborationState {
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isOnline: boolean;
  lastSeen: string;
  currentLocation: CollaborationLocation;
  permissions: CollaborationPermissions;
  cursor?: CursorPosition;
  activeEdit?: ActiveEdit;
  presence: PresenceInfo;
}

export interface CollaborationLocation {
  type: 'budget' | 'category' | 'item' | 'settings';
  budgetId: string;
  categoryId?: string;
  itemId?: string;
  fieldPath?: string;
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canExport: boolean;
  canManageCategories: boolean;
  canApproveExpenses: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  fieldName?: string;
  textSelection?: TextSelection;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export interface ActiveEdit {
  type: EditType;
  targetId: string;
  fieldName: string;
  startTime: string;
  lockExpiry?: string;
  optimisticValue?: any;
}

export interface PresenceInfo {
  status: 'active' | 'idle' | 'away' | 'offline';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  lastActivity: string;
  batteryLevel?: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface CollaborationEvent {
  id: string;
  type: CollaborationEventType;
  userId: string;
  budgetId: string;
  timestamp: string;
  data: any;
  version: number;
}

export interface ConflictResolution {
  conflictId: string;
  type: ConflictType;
  participants: string[];
  resolution: ResolutionStrategy;
  resolvedBy?: string;
  resolvedAt?: string;
  mergedData?: any;
}

export enum EditType {
  BUDGET_TOTAL = 'budget_total',
  CATEGORY_ALLOCATION = 'category_allocation',
  ITEM_COST = 'item_cost',
  ITEM_DESCRIPTION = 'item_description',
  PAYMENT_STATUS = 'payment_status',
}

export enum CollaborationEventType {
  JOIN = 'join',
  LEAVE = 'leave',
  EDIT_START = 'edit_start',
  EDIT_END = 'edit_end',
  VALUE_CHANGE = 'value_change',
  CURSOR_MOVE = 'cursor_move',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  PERMISSION_CHANGED = 'permission_changed',
}

export enum ConflictType {
  CONCURRENT_EDIT = 'concurrent_edit',
  STALE_DATA = 'stale_data',
  PERMISSION_CONFLICT = 'permission_conflict',
  VALUE_DIVERGENCE = 'value_divergence',
}

export enum ResolutionStrategy {
  LAST_WRITER_WINS = 'last_writer_wins',
  MANUAL_MERGE = 'manual_merge',
  AUTO_MERGE = 'auto_merge',
  REVERT = 'revert',
}

// ==================== REAL-TIME COLLABORATION MANAGER ====================

export class RealTimeCollaborationManager {
  private static instance: RealTimeCollaborationManager;
  private supabase: any;
  private currentSession: CollaborationState | null = null;
  private activeSessions: Map<string, CollaborationState> = new Map();
  private eventQueue: CollaborationEvent[] = [];
  private conflictResolver: CollaborationConflictResolver;
  private presenceChannel: any = null;
  private changeChannel: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (event: CollaborationEvent) => void> =
    new Map();

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.conflictResolver = new CollaborationConflictResolver();
    this.setupPresenceMonitoring();
  }

  public static getInstance(): RealTimeCollaborationManager {
    if (!RealTimeCollaborationManager.instance) {
      RealTimeCollaborationManager.instance =
        new RealTimeCollaborationManager();
    }
    return RealTimeCollaborationManager.instance;
  }

  // ==================== SESSION MANAGEMENT ====================

  public async startCollaborationSession(
    budgetId: string,
    userId: string,
    userName: string,
    permissions: CollaborationPermissions,
  ): Promise<CollaborationState> {
    try {
      const session: CollaborationState = {
        sessionId: `session_${Date.now()}_${userId}`,
        userId,
        userName,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        currentLocation: {
          type: 'budget',
          budgetId,
        },
        permissions,
        presence: {
          status: 'active',
          deviceType: this.detectDeviceType(),
          lastActivity: new Date().toISOString(),
          batteryLevel: await this.getBatteryLevel(),
          connectionQuality: this.detectConnectionQuality(),
        },
      };

      this.currentSession = session;

      // Join presence channel
      await this.joinPresenceChannel(budgetId);

      // Join changes channel
      await this.joinChangesChannel(budgetId);

      // Start heartbeat
      this.startHeartbeat();

      // Notify others of join
      await this.broadcastEvent({
        id: `event_${Date.now()}`,
        type: CollaborationEventType.JOIN,
        userId,
        budgetId,
        timestamp: new Date().toISOString(),
        data: { session },
        version: 1,
      });

      console.log('[Collaboration] Session started:', session.sessionId);
      return session;
    } catch (error) {
      console.error('[Collaboration] Failed to start session:', error);
      throw error;
    }
  }

  public async endCollaborationSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Broadcast leave event
      await this.broadcastEvent({
        id: `event_${Date.now()}`,
        type: CollaborationEventType.LEAVE,
        userId: this.currentSession.userId,
        budgetId: this.currentSession.currentLocation.budgetId,
        timestamp: new Date().toISOString(),
        data: { sessionId: this.currentSession.sessionId },
        version: 1,
      });

      // Clean up channels
      if (this.presenceChannel) {
        this.presenceChannel.unsubscribe();
        this.presenceChannel = null;
      }

      if (this.changeChannel) {
        this.changeChannel.unsubscribe();
        this.changeChannel = null;
      }

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      console.log(
        '[Collaboration] Session ended:',
        this.currentSession.sessionId,
      );
      this.currentSession = null;
    } catch (error) {
      console.error('[Collaboration] Failed to end session:', error);
    }
  }

  private async joinPresenceChannel(budgetId: string): Promise<void> {
    this.presenceChannel = this.supabase
      .channel(`budget_presence_${budgetId}`)
      .on('presence', { event: 'sync' }, () => {
        this.updateActiveSessions();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        this.handlePresenceJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        this.handlePresenceLeave(key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && this.currentSession) {
          await this.presenceChannel.track(this.currentSession);
        }
      });
  }

  private async joinChangesChannel(budgetId: string): Promise<void> {
    this.changeChannel = this.supabase
      .channel(`budget_changes_${budgetId}`)
      .on('broadcast', { event: 'collaboration_event' }, (payload: any) => {
        this.handleCollaborationEvent(payload);
      })
      .subscribe();
  }

  // ==================== REAL-TIME EDITING ====================

  public async startEdit(
    targetType: 'budget' | 'category' | 'item',
    targetId: string,
    fieldName: string,
  ): Promise<boolean> {
    if (!this.currentSession)
      throw new Error('No active collaboration session');

    // Check for existing locks
    const existingLock = await this.checkEditLock(
      targetType,
      targetId,
      fieldName,
    );
    if (existingLock && existingLock.userId !== this.currentSession.userId) {
      return false; // Already being edited by someone else
    }

    const activeEdit: ActiveEdit = {
      type: this.getEditType(targetType, fieldName),
      targetId,
      fieldName,
      startTime: new Date().toISOString(),
      lockExpiry: new Date(Date.now() + 30000).toISOString(), // 30 second lock
    };

    this.currentSession.activeEdit = activeEdit;

    await this.broadcastEvent({
      id: `event_${Date.now()}`,
      type: CollaborationEventType.EDIT_START,
      userId: this.currentSession.userId,
      budgetId: this.currentSession.currentLocation.budgetId,
      timestamp: new Date().toISOString(),
      data: { activeEdit },
      version: 1,
    });

    return true;
  }

  public async endEdit(finalValue?: any): Promise<void> {
    if (!this.currentSession?.activeEdit) return;

    const activeEdit = this.currentSession.activeEdit;

    if (finalValue !== undefined) {
      await this.broadcastEvent({
        id: `event_${Date.now()}`,
        type: CollaborationEventType.VALUE_CHANGE,
        userId: this.currentSession.userId,
        budgetId: this.currentSession.currentLocation.budgetId,
        timestamp: new Date().toISOString(),
        data: {
          targetId: activeEdit.targetId,
          fieldName: activeEdit.fieldName,
          value: finalValue,
          editType: activeEdit.type,
        },
        version: 1,
      });
    }

    await this.broadcastEvent({
      id: `event_${Date.now()}`,
      type: CollaborationEventType.EDIT_END,
      userId: this.currentSession.userId,
      budgetId: this.currentSession.currentLocation.budgetId,
      timestamp: new Date().toISOString(),
      data: {
        targetId: activeEdit.targetId,
        fieldName: activeEdit.fieldName,
      },
      version: 1,
    });

    this.currentSession.activeEdit = undefined;
  }

  public async updateOptimisticValue(value: any): Promise<void> {
    if (!this.currentSession?.activeEdit) return;

    this.currentSession.activeEdit.optimisticValue = value;

    // Broadcast optimistic update for real-time preview
    await this.broadcastEvent({
      id: `event_${Date.now()}`,
      type: CollaborationEventType.VALUE_CHANGE,
      userId: this.currentSession.userId,
      budgetId: this.currentSession.currentLocation.budgetId,
      timestamp: new Date().toISOString(),
      data: {
        targetId: this.currentSession.activeEdit.targetId,
        fieldName: this.currentSession.activeEdit.fieldName,
        value,
        isOptimistic: true,
      },
      version: 1,
    });
  }

  // ==================== CURSOR TRACKING ====================

  public async updateCursor(position: CursorPosition): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.cursor = position;

    // Throttle cursor updates
    if (this.cursorThrottle) return;
    this.cursorThrottle = true;

    setTimeout(async () => {
      await this.broadcastEvent({
        id: `event_${Date.now()}`,
        type: CollaborationEventType.CURSOR_MOVE,
        userId: this.currentSession!.userId,
        budgetId: this.currentSession!.currentLocation.budgetId,
        timestamp: new Date().toISOString(),
        data: { cursor: position },
        version: 1,
      });

      this.cursorThrottle = false;
    }, 100); // 100ms throttle
  }

  private cursorThrottle = false;

  // ==================== CONFLICT HANDLING ====================

  private async handleCollaborationEvent(payload: any): Promise<void> {
    const event: CollaborationEvent = payload.event;

    // Ignore our own events
    if (event.userId === this.currentSession?.userId) return;

    console.log('[Collaboration] Received event:', event.type, event.data);

    switch (event.type) {
      case CollaborationEventType.EDIT_START:
        this.handleRemoteEditStart(event);
        break;
      case CollaborationEventType.EDIT_END:
        this.handleRemoteEditEnd(event);
        break;
      case CollaborationEventType.VALUE_CHANGE:
        await this.handleRemoteValueChange(event);
        break;
      case CollaborationEventType.CURSOR_MOVE:
        this.handleRemoteCursorMove(event);
        break;
      case CollaborationEventType.CONFLICT_DETECTED:
        await this.handleConflictDetected(event);
        break;
    }

    // Notify subscribers
    this.notifySubscribers(event);
  }

  private handleRemoteEditStart(event: CollaborationEvent): void {
    const { activeEdit } = event.data;
    const remoteSession = this.activeSessions.get(event.userId);

    if (remoteSession) {
      remoteSession.activeEdit = activeEdit;
    }

    // Check for concurrent editing conflict
    if (
      this.currentSession?.activeEdit &&
      this.currentSession.activeEdit.targetId === activeEdit.targetId &&
      this.currentSession.activeEdit.fieldName === activeEdit.fieldName
    ) {
      this.detectConflict(event, ConflictType.CONCURRENT_EDIT);
    }
  }

  private handleRemoteEditEnd(event: CollaborationEvent): void {
    const remoteSession = this.activeSessions.get(event.userId);
    if (remoteSession) {
      remoteSession.activeEdit = undefined;
    }
  }

  private async handleRemoteValueChange(
    event: CollaborationEvent,
  ): Promise<void> {
    const { targetId, fieldName, value, isOptimistic } = event.data;

    // Check for value conflicts
    if (
      this.currentSession?.activeEdit &&
      this.currentSession.activeEdit.targetId === targetId &&
      this.currentSession.activeEdit.fieldName === fieldName &&
      !isOptimistic
    ) {
      const conflict = await this.detectConflict(
        event,
        ConflictType.VALUE_DIVERGENCE,
      );
      if (conflict) {
        return; // Don't apply conflicting value
      }
    }

    // Apply remote change
    this.applyRemoteChange(targetId, fieldName, value, isOptimistic);
  }

  private handleRemoteCursorMove(event: CollaborationEvent): void {
    const { cursor } = event.data;
    const remoteSession = this.activeSessions.get(event.userId);

    if (remoteSession) {
      remoteSession.cursor = cursor;
    }
  }

  private async detectConflict(
    event: CollaborationEvent,
    type: ConflictType,
  ): Promise<boolean> {
    if (!this.currentSession) return false;

    const conflictId = `conflict_${Date.now()}`;
    const conflict: ConflictResolution = {
      conflictId,
      type,
      participants: [this.currentSession.userId, event.userId],
      resolution: ResolutionStrategy.AUTO_MERGE,
    };

    // Try auto-resolution first
    const resolved = await this.conflictResolver.resolve(
      conflict,
      event,
      this.currentSession,
    );

    if (!resolved) {
      // Broadcast conflict for manual resolution
      await this.broadcastEvent({
        id: `event_${Date.now()}`,
        type: CollaborationEventType.CONFLICT_DETECTED,
        userId: this.currentSession.userId,
        budgetId: this.currentSession.currentLocation.budgetId,
        timestamp: new Date().toISOString(),
        data: { conflict, originalEvent: event },
        version: 1,
      });
    }

    return !resolved;
  }

  private async handleConflictDetected(
    event: CollaborationEvent,
  ): Promise<void> {
    const { conflict, originalEvent } = event.data;

    // Show conflict UI to user
    this.notifySubscribers({
      ...event,
      type: CollaborationEventType.CONFLICT_DETECTED,
      data: { conflict, originalEvent },
    });
  }

  // ==================== PRESENCE MANAGEMENT ====================

  private setupPresenceMonitoring(): void {
    // Monitor network connection
    window.addEventListener('online', () => {
      this.updatePresenceStatus('active');
    });

    window.addEventListener('offline', () => {
      this.updatePresenceStatus('offline');
    });

    // Monitor user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(
      (event) => {
        document.addEventListener(
          event,
          () => {
            this.updateLastActivity();
          },
          { passive: true },
        );
      },
    );

    // Monitor visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresenceStatus('away');
      } else {
        this.updatePresenceStatus('active');
      }
    });
  }

  private handlePresenceJoin(key: string, newPresences: any[]): void {
    newPresences.forEach((presence) => {
      this.activeSessions.set(presence.userId, presence);
    });

    this.notifySubscribers({
      id: `presence_${Date.now()}`,
      type: CollaborationEventType.JOIN,
      userId: key,
      budgetId: this.currentSession?.currentLocation.budgetId || '',
      timestamp: new Date().toISOString(),
      data: { presences: newPresences },
      version: 1,
    });
  }

  private handlePresenceLeave(key: string, leftPresences: any[]): void {
    leftPresences.forEach((presence) => {
      this.activeSessions.delete(presence.userId);
    });

    this.notifySubscribers({
      id: `presence_${Date.now()}`,
      type: CollaborationEventType.LEAVE,
      userId: key,
      budgetId: this.currentSession?.currentLocation.budgetId || '',
      timestamp: new Date().toISOString(),
      data: { presences: leftPresences },
      version: 1,
    });
  }

  private updateActiveSessions(): void {
    if (!this.presenceChannel) return;

    const presenceState = this.presenceChannel.presenceState();
    this.activeSessions.clear();

    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: CollaborationState) => {
        this.activeSessions.set(presence.userId, presence);
      });
    });
  }

  private updatePresenceStatus(
    status: 'active' | 'idle' | 'away' | 'offline',
  ): void {
    if (!this.currentSession) return;

    this.currentSession.presence.status = status;
    this.currentSession.presence.lastActivity = new Date().toISOString();

    if (this.presenceChannel) {
      this.presenceChannel.track(this.currentSession);
    }
  }

  private updateLastActivity(): void {
    if (!this.currentSession) return;

    this.currentSession.presence.lastActivity = new Date().toISOString();
    if (this.currentSession.presence.status !== 'active') {
      this.updatePresenceStatus('active');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentSession) {
        this.currentSession.lastSeen = new Date().toISOString();
        this.currentSession.presence.batteryLevel =
          await this.getBatteryLevel();
        this.currentSession.presence.connectionQuality =
          this.detectConnectionQuality();

        if (this.presenceChannel) {
          this.presenceChannel.track(this.currentSession);
        }
      }
    }, 30000); // 30 seconds
  }

  // ==================== UTILITY METHODS ====================

  private async checkEditLock(
    targetType: string,
    targetId: string,
    fieldName: string,
  ): Promise<{ userId: string; expiry: string } | null> {
    // In a real implementation, this would check a distributed lock store
    for (const [userId, session] of this.activeSessions) {
      if (
        session.activeEdit &&
        session.activeEdit.targetId === targetId &&
        session.activeEdit.fieldName === fieldName &&
        session.activeEdit.lockExpiry &&
        new Date(session.activeEdit.lockExpiry) > new Date()
      ) {
        return { userId, expiry: session.activeEdit.lockExpiry };
      }
    }
    return null;
  }

  private getEditType(targetType: string, fieldName: string): EditType {
    if (targetType === 'budget' && fieldName === 'total_budget')
      return EditType.BUDGET_TOTAL;
    if (targetType === 'category' && fieldName === 'allocated_amount')
      return EditType.CATEGORY_ALLOCATION;
    if (targetType === 'item' && fieldName === 'actual_cost')
      return EditType.ITEM_COST;
    if (targetType === 'item' && fieldName === 'description')
      return EditType.ITEM_DESCRIPTION;
    if (targetType === 'item' && fieldName === 'payment_status')
      return EditType.PAYMENT_STATUS;

    return EditType.ITEM_DESCRIPTION; // Default
  }

  private applyRemoteChange(
    targetId: string,
    fieldName: string,
    value: any,
    isOptimistic: boolean,
  ): void {
    // This would integrate with the budget manager to apply the change
    this.notifySubscribers({
      id: `change_${Date.now()}`,
      type: CollaborationEventType.VALUE_CHANGE,
      userId: 'remote',
      budgetId: this.currentSession?.currentLocation.budgetId || '',
      timestamp: new Date().toISOString(),
      data: { targetId, fieldName, value, isOptimistic },
      version: 1,
    });
  }

  private async broadcastEvent(event: CollaborationEvent): Promise<void> {
    if (this.changeChannel) {
      await this.changeChannel.send({
        type: 'broadcast',
        event: 'collaboration_event',
        event: event,
      });
    }
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile/.test(userAgent)) return 'mobile';
    if (/tablet/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private detectConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!navigator.onLine) return 'offline';

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;

      switch (effectiveType) {
        case '4g':
          return 'excellent';
        case '3g':
          return 'good';
        case '2g':
        case 'slow-2g':
          return 'poor';
        default:
          return 'good';
      }
    }

    return 'good'; // Default assumption
  }

  // ==================== PUBLIC API ====================

  public getActiveSessions(): CollaborationState[] {
    return Array.from(this.activeSessions.values());
  }

  public getCurrentSession(): CollaborationState | null {
    return this.currentSession;
  }

  public subscribe(
    id: string,
    callback: (event: CollaborationEvent) => void,
  ): void {
    this.subscribers.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  private notifySubscribers(event: CollaborationEvent): void {
    this.subscribers.forEach((callback) => callback(event));
  }

  public destroy(): void {
    this.endCollaborationSession();
    this.subscribers.clear();
    this.activeSessions.clear();
  }
}

// ==================== CONFLICT RESOLVER ====================

class CollaborationConflictResolver {
  async resolve(
    conflict: ConflictResolution,
    event: CollaborationEvent,
    currentSession: CollaborationState,
  ): Promise<boolean> {
    switch (conflict.type) {
      case ConflictType.CONCURRENT_EDIT:
        return this.resolveConcurrentEdit(conflict, event, currentSession);

      case ConflictType.VALUE_DIVERGENCE:
        return this.resolveValueDivergence(conflict, event, currentSession);

      case ConflictType.STALE_DATA:
        return this.resolveStaleData(conflict, event);

      default:
        return false; // Requires manual resolution
    }
  }

  private async resolveConcurrentEdit(
    conflict: ConflictResolution,
    event: CollaborationEvent,
    currentSession: CollaborationState,
  ): Promise<boolean> {
    // For wedding budgets, be conservative with concurrent edits
    // Later edit wins for non-critical fields, but flag for review

    if (
      event.data.editType === EditType.BUDGET_TOTAL ||
      event.data.editType === EditType.CATEGORY_ALLOCATION
    ) {
      // Critical fields - require manual resolution
      return false;
    }

    // Non-critical fields - auto-resolve with later timestamp
    conflict.resolution = ResolutionStrategy.LAST_WRITER_WINS;
    conflict.resolvedBy = 'system';
    conflict.resolvedAt = new Date().toISOString();

    return true;
  }

  private async resolveValueDivergence(
    conflict: ConflictResolution,
    event: CollaborationEvent,
    currentSession: CollaborationState,
  ): Promise<boolean> {
    // For budget values, always use the higher amount for safety
    if (
      event.data.fieldName === 'actual_cost' ||
      event.data.fieldName === 'estimated_cost'
    ) {
      const currentValue = currentSession.activeEdit?.optimisticValue || 0;
      const incomingValue = event.data.value || 0;

      conflict.resolution = ResolutionStrategy.AUTO_MERGE;
      conflict.mergedData = Math.max(currentValue, incomingValue);
      conflict.resolvedBy = 'system';
      conflict.resolvedAt = new Date().toISOString();

      return true;
    }

    return false;
  }

  private async resolveStaleData(
    conflict: ConflictResolution,
    event: CollaborationEvent,
  ): Promise<boolean> {
    // Always accept fresh data for stale conflicts
    conflict.resolution = ResolutionStrategy.AUTO_MERGE;
    conflict.mergedData = event.data.value;
    conflict.resolvedBy = 'system';
    conflict.resolvedAt = new Date().toISOString();

    return true;
  }
}

// ==================== SINGLETON EXPORT ====================

export const realTimeCollaboration = RealTimeCollaborationManager.getInstance();
export default RealTimeCollaborationManager;
