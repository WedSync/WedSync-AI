/**
 * WS-158: WebSocket Handlers for Task Category Operations
 * Handles real-time category updates, notifications, and cross-platform sync
 */

import { createClient } from '@/lib/supabase/client';
import { TaskCategory, WorkflowTask } from '@/types/workflow';
import { getCategorySyncService } from '@/lib/realtime/category-sync';
import { getCategoryIntegrationService } from '@/lib/integrations/categoryIntegrations';

export interface CategoryWebSocketMessage {
  type: CategoryMessageType;
  payload: any;
  userId: string;
  organizationId: string;
  timestamp: string;
  messageId: string;
  correlationId?: string;
}

export type CategoryMessageType =
  | 'category:created'
  | 'category:updated'
  | 'category:deleted'
  | 'category:reordered'
  | 'category:bulk_update'
  | 'task:category_changed'
  | 'task:bulk_reassign'
  | 'sync:request'
  | 'sync:response'
  | 'sync:conflict'
  | 'collaboration:lock_acquired'
  | 'collaboration:lock_released'
  | 'collaboration:cursor_update'
  | 'notification:category_alert'
  | 'analytics:update';

export interface CategoryNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  categoryId?: string;
  actions?: NotificationAction[];
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
}

export type NotificationChannel = 'web' | 'email' | 'sms' | 'push' | 'slack';

export interface CollaborationState {
  locks: Map<string, LockInfo>;
  cursors: Map<string, CursorInfo>;
  activeUsers: Set<string>;
  editingSessions: Map<string, EditSession>;
}

export interface LockInfo {
  categoryId: string;
  userId: string;
  userName: string;
  acquiredAt: Date;
  expiresAt: Date;
  type: 'exclusive' | 'shared';
}

export interface CursorInfo {
  userId: string;
  userName: string;
  categoryId?: string;
  field?: string;
  position?: number;
  color: string;
}

export interface EditSession {
  sessionId: string;
  categoryId: string;
  users: string[];
  startedAt: Date;
  lastActivity: Date;
  changes: any[];
}

export class CategoryWebSocketHandler {
  private supabase = createClient();
  private ws?: WebSocket;
  private messageQueue: CategoryWebSocketMessage[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private organizationId: string;
  private userId: string;
  private syncService?: ReturnType<typeof getCategorySyncService>;
  private integrationService?: ReturnType<typeof getCategoryIntegrationService>;
  private collaborationState: CollaborationState;
  private notificationQueue: CategoryNotification[] = [];
  private messageHandlers: Map<CategoryMessageType, Function> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(organizationId: string, userId: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.collaborationState = {
      locks: new Map(),
      cursors: new Map(),
      activeUsers: new Set(),
      editingSessions: new Map(),
    };

    this.initializeHandlers();
  }

  /**
   * Initialize message handlers
   */
  private initializeHandlers(): void {
    // Category operations
    this.messageHandlers.set(
      'category:created',
      this.handleCategoryCreated.bind(this),
    );
    this.messageHandlers.set(
      'category:updated',
      this.handleCategoryUpdated.bind(this),
    );
    this.messageHandlers.set(
      'category:deleted',
      this.handleCategoryDeleted.bind(this),
    );
    this.messageHandlers.set(
      'category:reordered',
      this.handleCategoryReordered.bind(this),
    );
    this.messageHandlers.set(
      'category:bulk_update',
      this.handleBulkUpdate.bind(this),
    );

    // Task operations
    this.messageHandlers.set(
      'task:category_changed',
      this.handleTaskCategoryChanged.bind(this),
    );
    this.messageHandlers.set(
      'task:bulk_reassign',
      this.handleBulkReassign.bind(this),
    );

    // Sync operations
    this.messageHandlers.set('sync:request', this.handleSyncRequest.bind(this));
    this.messageHandlers.set(
      'sync:response',
      this.handleSyncResponse.bind(this),
    );
    this.messageHandlers.set(
      'sync:conflict',
      this.handleSyncConflict.bind(this),
    );

    // Collaboration operations
    this.messageHandlers.set(
      'collaboration:lock_acquired',
      this.handleLockAcquired.bind(this),
    );
    this.messageHandlers.set(
      'collaboration:lock_released',
      this.handleLockReleased.bind(this),
    );
    this.messageHandlers.set(
      'collaboration:cursor_update',
      this.handleCursorUpdate.bind(this),
    );

    // Analytics and notifications
    this.messageHandlers.set(
      'notification:category_alert',
      this.handleNotification.bind(this),
    );
    this.messageHandlers.set(
      'analytics:update',
      this.handleAnalyticsUpdate.bind(this),
    );
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    const wsUrl = this.getWebSocketUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onerror = this.onError.bind(this);
      this.ws.onclose = this.onClose.bind(this);

      // Initialize sync services
      this.syncService = getCategorySyncService({
        organizationId: this.organizationId,
        userId: this.userId,
        onCategoryUpdate: this.handleCategorySync.bind(this),
        onTaskCategoryChange: this.handleTaskSync.bind(this),
        onConflictResolution: this.handleConflictResolution.bind(this),
        onSyncStatusChange: this.handleSyncStatusChange.bind(this),
      });

      await this.syncService.initialize();

      // Initialize integration service
      this.integrationService = getCategoryIntegrationService({
        organizationId: this.organizationId,
        userId: this.userId,
        providers: await this.loadCalendarProviders(),
        autoSync: true,
        syncInterval: 15, // 15 minutes
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = isProduction ? 'wss' : 'ws';
    const host = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:3001';

    return `${protocol}://${host}/categories?org=${this.organizationId}&user=${this.userId}`;
  }

  /**
   * WebSocket connection opened
   */
  private onOpen(): void {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Process queued messages
    this.processMessageQueue();

    // Start heartbeat
    this.startHeartbeat();

    // Send initial sync request
    this.sendMessage({
      type: 'sync:request',
      payload: {
        lastSync: localStorage.getItem('lastCategorySync') || null,
      },
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async onMessage(event: MessageEvent): Promise<void> {
    try {
      const message: CategoryWebSocketMessage = JSON.parse(event.data);

      // Handle heartbeat
      if (message.type === ('ping' as any)) {
        this.sendMessage({ type: 'pong' as any, payload: {} });
        return;
      }

      // Route to appropriate handler
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        await handler(message);
      } else {
        console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private onError(event: Event): void {
    console.error('WebSocket error:', event);
    this.isConnected = false;
  }

  /**
   * Handle WebSocket connection close
   */
  private onClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Attempt reconnection if not intentional
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message: Partial<CategoryWebSocketMessage>): void {
    const fullMessage: CategoryWebSocketMessage = {
      type: message.type!,
      payload: message.payload,
      userId: this.userId,
      organizationId: this.organizationId,
      timestamp: new Date().toISOString(),
      messageId: crypto.randomUUID(),
      correlationId: message.correlationId,
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for later
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws?.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleConnectionFailure();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );
    setTimeout(() => this.connect(), delay);
  }

  /**
   * Handle permanent connection failure
   */
  private handleConnectionFailure(): void {
    // Notify user of connection failure
    this.createNotification({
      type: 'error',
      title: 'Connection Lost',
      message:
        'Unable to maintain real-time connection. Some features may be unavailable.',
      priority: 'high',
      channels: ['web'],
    });

    // Fall back to polling mode
    this.startPollingMode();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping' as any, payload: {} });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle category created event
   */
  private async handleCategoryCreated(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const category = message.payload as TaskCategory;

    // Update local state
    await this.updateLocalCategoryState('created', category);

    // Sync with external calendars
    if (this.integrationService) {
      await this.integrationService.syncCategoriesWithCalendars([category]);
    }

    // Send notification
    this.createNotification({
      type: 'success',
      title: 'Category Created',
      message: `New category "${category.name}" has been created`,
      categoryId: category.id,
      priority: 'low',
      channels: ['web'],
    });
  }

  /**
   * Handle category updated event
   */
  private async handleCategoryUpdated(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { oldCategory, newCategory } = message.payload;

    // Check for collaboration locks
    const lock = this.collaborationState.locks.get(newCategory.id);
    if (lock && lock.userId !== this.userId) {
      // Another user is editing
      this.createNotification({
        type: 'warning',
        title: 'Category Being Edited',
        message: `${lock.userName} is currently editing this category`,
        categoryId: newCategory.id,
        priority: 'medium',
        channels: ['web'],
      });
      return;
    }

    // Update local state
    await this.updateLocalCategoryState('updated', newCategory);

    // Update affected tasks if category name changed
    if (oldCategory.name !== newCategory.name) {
      await this.updateAffectedTasks(newCategory.id);
    }
  }

  /**
   * Handle category deleted event
   */
  private async handleCategoryDeleted(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const categoryId = message.payload.categoryId;

    // Reassign tasks to default category
    await this.reassignTasksToDefault(categoryId);

    // Update local state
    await this.updateLocalCategoryState('deleted', {
      id: categoryId,
    } as TaskCategory);

    // Send notification
    this.createNotification({
      type: 'info',
      title: 'Category Deleted',
      message: 'Tasks have been reassigned to the default category',
      priority: 'medium',
      channels: ['web'],
    });
  }

  /**
   * Handle category reordering
   */
  private async handleCategoryReordered(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { categories } = message.payload;

    // Update sort orders in database
    const updates = categories.map((cat: any, index: number) =>
      this.supabase
        .from('task_categories')
        .update({ sort_order: index })
        .eq('id', cat.id),
    );

    await Promise.all(updates);
  }

  /**
   * Handle bulk category update
   */
  private async handleBulkUpdate(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { updates } = message.payload;

    // Process updates in parallel
    const updatePromises = updates.map((update: any) =>
      this.updateLocalCategoryState('updated', update.category),
    );

    await Promise.all(updatePromises);

    // Sync with calendars
    if (this.integrationService) {
      await this.integrationService.syncCategoriesWithCalendars(
        updates.map((u: any) => u.category),
      );
    }
  }

  /**
   * Handle task category change
   */
  private async handleTaskCategoryChanged(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { taskId, oldCategoryId, newCategoryId } = message.payload;

    // Update task in database
    await this.supabase
      .from('workflow_tasks')
      .update({ category_id: newCategoryId })
      .eq('id', taskId);

    // Update analytics
    await this.updateCategoryAnalytics(oldCategoryId, newCategoryId);
  }

  /**
   * Handle bulk task reassignment
   */
  private async handleBulkReassign(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { taskIds, newCategoryId } = message.payload;

    // Update all tasks
    await this.supabase
      .from('workflow_tasks')
      .update({ category_id: newCategoryId })
      .in('id', taskIds);

    // Send notification
    this.createNotification({
      type: 'success',
      title: 'Tasks Reassigned',
      message: `${taskIds.length} tasks have been reassigned`,
      categoryId: newCategoryId,
      priority: 'low',
      channels: ['web'],
    });
  }

  /**
   * Handle sync request
   */
  private async handleSyncRequest(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { lastSync } = message.payload;

    // Fetch changes since last sync
    const { data: categories } = await this.supabase
      .from('task_categories')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('updated_at', lastSync || '1970-01-01');

    // Send sync response
    this.sendMessage({
      type: 'sync:response',
      payload: { categories },
      correlationId: message.messageId,
    });
  }

  /**
   * Handle sync response
   */
  private async handleSyncResponse(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { categories } = message.payload;

    // Update local state with synced categories
    for (const category of categories) {
      await this.updateLocalCategoryState('updated', category);
    }

    // Update last sync timestamp
    localStorage.setItem('lastCategorySync', new Date().toISOString());
  }

  /**
   * Handle sync conflict
   */
  private async handleSyncConflict(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { conflict } = message.payload;

    // Let sync service handle the conflict
    if (this.syncService) {
      const status = this.syncService.getSyncStatus();
      console.log('Sync conflict detected:', conflict, 'Status:', status);
    }
  }

  /**
   * Handle lock acquired
   */
  private async handleLockAcquired(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const lock: LockInfo = message.payload;

    this.collaborationState.locks.set(lock.categoryId, lock);

    // Update UI to show lock status
    this.broadcastCollaborationState();
  }

  /**
   * Handle lock released
   */
  private async handleLockReleased(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const { categoryId } = message.payload;

    this.collaborationState.locks.delete(categoryId);

    // Update UI to show lock released
    this.broadcastCollaborationState();
  }

  /**
   * Handle cursor update for live collaboration
   */
  private async handleCursorUpdate(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const cursor: CursorInfo = message.payload;

    this.collaborationState.cursors.set(cursor.userId, cursor);

    // Broadcast cursor positions to UI
    this.broadcastCollaborationState();
  }

  /**
   * Handle notification
   */
  private async handleNotification(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const notification = message.payload as CategoryNotification;

    // Process notification through channels
    await this.processNotification(notification);
  }

  /**
   * Handle analytics update
   */
  private async handleAnalyticsUpdate(
    message: CategoryWebSocketMessage,
  ): Promise<void> {
    const analytics = message.payload;

    // Update dashboard with real-time analytics
    this.broadcastAnalytics(analytics);
  }

  /**
   * Update local category state
   */
  private async updateLocalCategoryState(
    action: 'created' | 'updated' | 'deleted',
    category: TaskCategory,
  ): Promise<void> {
    // Emit event for UI updates
    window.dispatchEvent(
      new CustomEvent('categoryStateChanged', {
        detail: { action, category },
      }),
    );
  }

  /**
   * Update affected tasks when category changes
   */
  private async updateAffectedTasks(categoryId: string): Promise<void> {
    const { data: tasks } = await this.supabase
      .from('workflow_tasks')
      .select('id')
      .eq('category_id', categoryId);

    if (tasks) {
      // Trigger task updates
      for (const task of tasks) {
        window.dispatchEvent(
          new CustomEvent('taskCategoryUpdated', {
            detail: { taskId: task.id, categoryId },
          }),
        );
      }
    }
  }

  /**
   * Reassign tasks to default category
   */
  private async reassignTasksToDefault(categoryId: string): Promise<void> {
    // Find default category
    const { data: defaultCategory } = await this.supabase
      .from('task_categories')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('name', 'Planning')
      .eq('is_default', true)
      .single();

    if (defaultCategory) {
      await this.supabase
        .from('workflow_tasks')
        .update({ category_id: defaultCategory.id })
        .eq('category_id', categoryId);
    }
  }

  /**
   * Update category analytics
   */
  private async updateCategoryAnalytics(
    oldCategoryId?: string,
    newCategoryId?: string,
  ): Promise<void> {
    // Calculate analytics metrics
    const { data: stats } = await this.supabase.rpc(
      'calculate_category_stats',
      {
        org_id: this.organizationId,
      },
    );

    // Broadcast analytics update
    this.sendMessage({
      type: 'analytics:update',
      payload: stats,
    });
  }

  /**
   * Handle category sync from sync service
   */
  private handleCategorySync(
    category: TaskCategory,
    action: 'created' | 'updated' | 'deleted',
  ): void {
    this.sendMessage({
      type: `category:${action}`,
      payload: category,
    });
  }

  /**
   * Handle task sync from sync service
   */
  private handleTaskSync(
    task: WorkflowTask,
    oldCategory?: string,
    newCategory?: string,
  ): void {
    this.sendMessage({
      type: 'task:category_changed',
      payload: {
        taskId: task.id,
        oldCategoryId: oldCategory,
        newCategoryId: newCategory,
      },
    });
  }

  /**
   * Handle conflict resolution
   */
  private handleConflictResolution(conflict: any): void {
    this.sendMessage({
      type: 'sync:conflict',
      payload: { conflict },
    });
  }

  /**
   * Handle sync status change
   */
  private handleSyncStatusChange(status: any): void {
    // Update UI with sync status
    window.dispatchEvent(
      new CustomEvent('syncStatusChanged', {
        detail: status,
      }),
    );
  }

  /**
   * Load calendar providers from user settings
   */
  private async loadCalendarProviders(): Promise<any[]> {
    // Load from user settings or database
    return [
      { name: 'google', syncEnabled: true },
      { name: 'outlook', syncEnabled: false },
      { name: 'apple', syncEnabled: false },
      { name: 'ical', syncEnabled: true },
    ];
  }

  /**
   * Create and queue notification
   */
  private createNotification(
    notification: Omit<CategoryNotification, 'id'>,
  ): void {
    const fullNotification: CategoryNotification = {
      ...notification,
      id: crypto.randomUUID(),
    };

    this.notificationQueue.push(fullNotification);
    this.processNotification(fullNotification);
  }

  /**
   * Process notification through channels
   */
  private async processNotification(
    notification: CategoryNotification,
  ): Promise<void> {
    for (const channel of notification.channels) {
      switch (channel) {
        case 'web':
          this.showWebNotification(notification);
          break;
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'sms':
          await this.sendSMSNotification(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'slack':
          await this.sendSlackNotification(notification);
          break;
      }
    }
  }

  /**
   * Show web notification
   */
  private showWebNotification(notification: CategoryNotification): void {
    window.dispatchEvent(
      new CustomEvent('showNotification', {
        detail: notification,
      }),
    );
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: CategoryNotification,
  ): Promise<void> {
    // Implement email sending
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: CategoryNotification,
  ): Promise<void> {
    // Implement SMS sending
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notification: CategoryNotification,
  ): Promise<void> {
    // Implement push notification
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    notification: CategoryNotification,
  ): Promise<void> {
    // Implement Slack webhook
  }

  /**
   * Broadcast collaboration state to UI
   */
  private broadcastCollaborationState(): void {
    window.dispatchEvent(
      new CustomEvent('collaborationStateChanged', {
        detail: this.collaborationState,
      }),
    );
  }

  /**
   * Broadcast analytics to dashboard
   */
  private broadcastAnalytics(analytics: any): void {
    window.dispatchEvent(
      new CustomEvent('analyticsUpdated', {
        detail: analytics,
      }),
    );
  }

  /**
   * Start polling mode as fallback
   */
  private startPollingMode(): void {
    setInterval(async () => {
      // Poll for updates
      const lastSync = localStorage.getItem('lastCategorySync');
      const { data: updates } = await this.supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', this.organizationId)
        .gte('updated_at', lastSync || new Date().toISOString());

      if (updates?.length) {
        for (const update of updates) {
          await this.updateLocalCategoryState('updated', update);
        }
        localStorage.setItem('lastCategorySync', new Date().toISOString());
      }
    }, 10000); // Poll every 10 seconds
  }

  /**
   * Acquire lock for category editing
   */
  async acquireLock(categoryId: string): Promise<boolean> {
    const lock: LockInfo = {
      categoryId,
      userId: this.userId,
      userName: 'Current User', // Get from user profile
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      type: 'exclusive',
    };

    this.sendMessage({
      type: 'collaboration:lock_acquired',
      payload: lock,
    });

    return true;
  }

  /**
   * Release lock for category
   */
  async releaseLock(categoryId: string): Promise<void> {
    this.sendMessage({
      type: 'collaboration:lock_released',
      payload: { categoryId },
    });
  }

  /**
   * Update cursor position for collaboration
   */
  updateCursor(categoryId: string, field?: string, position?: number): void {
    const cursor: CursorInfo = {
      userId: this.userId,
      userName: 'Current User',
      categoryId,
      field,
      position,
      color: this.getUserColor(),
    };

    this.sendMessage({
      type: 'collaboration:cursor_update',
      payload: cursor,
    });
  }

  /**
   * Get user color for collaboration
   */
  private getUserColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.isConnected = false;

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = undefined;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.syncService) {
      this.syncService.cleanup();
    }

    if (this.integrationService) {
      this.integrationService.cleanup();
    }

    this.messageQueue = [];
    this.notificationQueue = [];
    this.collaborationState = {
      locks: new Map(),
      cursors: new Map(),
      activeUsers: new Set(),
      editingSessions: new Map(),
    };
  }
}

// Export singleton factory
let handlerInstance: CategoryWebSocketHandler | null = null;

export function getCategoryWebSocketHandler(
  organizationId: string,
  userId: string,
): CategoryWebSocketHandler {
  if (!handlerInstance) {
    handlerInstance = new CategoryWebSocketHandler(organizationId, userId);
  }
  return handlerInstance;
}
