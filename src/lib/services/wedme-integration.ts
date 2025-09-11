/**
 * WedMe Integration Service
 * WS-155: Guest Communications - Round 3
 * Provides seamless messaging integration with WedMe ecosystem
 */

import { supabase } from '@/lib/supabase';
import { mobilePerformance } from './mobile-messaging-performance';

interface WedMeMessage {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'video' | 'document' | 'location';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata: {
    weddingId?: string;
    priority?: 'high' | 'normal' | 'low';
    category?: 'planning' | 'vendor' | 'guest' | 'general';
    contextTags?: string[];
  };
}

interface WedMeNotification {
  id: string;
  userId: string;
  type: 'message' | 'mention' | 'reaction' | 'update' | 'reminder';
  title: string;
  body: string;
  data: any;
  actionUrl?: string;
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: string;
  expiresAt?: string;
}

interface WedMeContext {
  weddingId: string;
  userId: string;
  userRole: 'couple' | 'planner' | 'vendor' | 'guest' | 'family';
  permissions: string[];
  weddingPhase: 'planning' | 'countdown' | 'day-of' | 'post-wedding';
  preferences: {
    notificationSettings: any;
    messageFilters: string[];
    privacyLevel: 'public' | 'friends' | 'private';
  };
}

export class WedMeIntegrationService {
  private static instance: WedMeIntegrationService;
  private websocket: WebSocket | null = null;
  private messageQueue: WedMeMessage[] = [];
  private notificationQueue: WedMeNotification[] = [];
  private context: WedMeContext | null = null;
  private syncStatus: 'connected' | 'disconnected' | 'syncing' = 'disconnected';
  private retryCount: number = 0;
  private maxRetries: number = 3;

  private constructor() {
    this.initializeWebSocket();
    this.setupEventListeners();
    this.startHeartbeat();
  }

  static getInstance(): WedMeIntegrationService {
    if (!this.instance) {
      this.instance = new WedMeIntegrationService();
    }
    return this.instance;
  }

  /**
   * Initialize WebSocket connection for real-time messaging
   */
  private async initializeWebSocket() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found, cannot initialize WebSocket');
        return;
      }

      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/wedme`;
      this.websocket = new WebSocket(`${wsUrl}?token=${session.access_token}`);

      this.websocket.onopen = () => {
        console.log('WedMe WebSocket connected');
        this.syncStatus = 'connected';
        this.retryCount = 0;
        this.processPendingMessages();
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      // GUARDIAN FIX: Add proper error and close handlers to prevent memory leaks
      this.websocket.onerror = (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('WedMe WebSocket error:', error);
        }
        this.syncStatus = 'error';
      };

      this.websocket.onclose = (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('WedMe WebSocket closed:', event.code, event.reason);
        }
        this.syncStatus = 'disconnected';
        this.websocket = null; // Clear reference to prevent memory leak

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && this.retryCount < 5) {
          setTimeout(
            () => this.initializeWebSocket(),
            Math.pow(2, this.retryCount) * 1000,
          );
          this.retryCount++;
        }
      };

      // GUARDIAN FIX: Duplicate handlers removed - using enhanced handlers above
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Setup event listeners for seamless integration
   */
  private setupEventListeners() {
    // Listen for app state changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppBackground();
      } else {
        this.handleAppForeground();
      }
    });

    // Listen for network state changes
    window.addEventListener('online', () => {
      this.handleNetworkOnline();
    });

    window.addEventListener('offline', () => {
      this.handleNetworkOffline();
    });

    // Listen for message composition events
    window.addEventListener('wedme-message-compose', (event: any) => {
      this.handleMessageCompose(event.detail);
    });

    // Listen for notification events
    window.addEventListener('wedme-notification', (event: any) => {
      this.handleNotificationEvent(event.detail);
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat() {
    setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(data: string) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'message':
          this.handleIncomingMessage(message.payload);
          break;
        case 'notification':
          this.handleIncomingNotification(message.payload);
          break;
        case 'sync-update':
          this.handleSyncUpdate(message.payload);
          break;
        case 'context-change':
          this.handleContextChange(message.payload);
          break;
        case 'pong':
          // Heartbeat response
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Initialize user context
   */
  async initializeContext(weddingId: string, userId: string): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('user_profiles')
        .select(
          `
          id,
          role,
          permissions,
          notification_preferences
        `,
        )
        .eq('id', userId)
        .single();

      const { data: wedding } = await supabase
        .from('weddings')
        .select(
          `
          id,
          phase,
          date,
          settings
        `,
        )
        .eq('id', weddingId)
        .single();

      if (user && wedding) {
        this.context = {
          weddingId,
          userId,
          userRole: user.role,
          permissions: user.permissions || [],
          weddingPhase: this.determineWeddingPhase(wedding.date),
          preferences: {
            notificationSettings: user.notification_preferences,
            messageFilters: [],
            privacyLevel: 'friends',
          },
        };

        // Notify WebSocket of context
        this.sendContextUpdate();
      }
    } catch (error) {
      console.error('Failed to initialize context:', error);
    }
  }

  /**
   * Send message through WedMe
   */
  async sendMessage(
    message: Omit<WedMeMessage, 'id' | 'timestamp' | 'status'>,
  ): Promise<string> {
    const wedmeMessage: WedMeMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Add to queue first
    this.messageQueue.push(wedmeMessage);

    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // Send via WebSocket for real-time delivery
        this.websocket.send(
          JSON.stringify({
            type: 'send-message',
            payload: wedmeMessage,
          }),
        );

        // Also store in database
        await this.storeMessage(wedmeMessage);
      } else {
        // Store locally for later sync
        await this.storeMessageLocally(wedmeMessage);
      }

      return wedmeMessage.id;
    } catch (error) {
      console.error('Failed to send message:', error);
      wedmeMessage.status = 'failed';
      throw error;
    }
  }

  /**
   * Send notification through WedMe
   */
  async sendNotification(
    notification: Omit<WedMeNotification, 'id'>,
  ): Promise<void> {
    const wedmeNotification: WedMeNotification = {
      ...notification,
      id: this.generateNotificationId(),
    };

    this.notificationQueue.push(wedmeNotification);

    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(
          JSON.stringify({
            type: 'send-notification',
            payload: wedmeNotification,
          }),
        );
      }

      // Store notification
      await supabase.from('wedme_notifications').insert(wedmeNotification);

      // Trigger push notification if user is offline
      if (document.hidden || !navigator.onLine) {
        this.triggerPushNotification(wedmeNotification);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Get message thread
   */
  async getMessageThread(
    threadId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<WedMeMessage[]> {
    try {
      // Try to get from performance cache first
      const cached = await mobilePerformance.loadMessages(
        this.context?.userId || '',
        page,
        pageSize,
      );
      if (cached.loadTime < 500) {
        // If cached and fast
        return cached.messages;
      }

      const { data } = await supabase
        .from('wedme_messages')
        .select(
          `
          id,
          thread_id,
          sender_id,
          recipient_id,
          content,
          type,
          timestamp,
          status,
          metadata
        `,
        )
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      return data || [];
    } catch (error) {
      console.error('Failed to get message thread:', error);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    try {
      await supabase
        .from('wedme_messages')
        .update({ status: 'read' })
        .in('id', messageIds);

      // Notify via WebSocket
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(
          JSON.stringify({
            type: 'mark-read',
            payload: { messageIds },
          }),
        );
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('wedme_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', this.context?.userId)
        .neq('status', 'read');

      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: WedMeMessage): Promise<void> {
    // Store message
    await this.storeMessage(message);

    // Show notification if app is in background
    if (document.hidden) {
      this.showMessageNotification(message);
    }

    // Dispatch custom event for UI updates
    window.dispatchEvent(
      new CustomEvent('wedme-message-received', {
        detail: message,
      }),
    );

    // Update unread count
    this.updateUnreadCount();
  }

  /**
   * Handle incoming notification
   */
  private handleIncomingNotification(
    notification: WedMeNotification,
  ): Promise<void> {
    // Show notification
    this.showNotification(notification);

    // Dispatch event for UI updates
    window.dispatchEvent(
      new CustomEvent('wedme-notification-received', {
        detail: notification,
      }),
    );

    return Promise.resolve();
  }

  /**
   * Handle sync update
   */
  private handleSyncUpdate(update: any): void {
    this.syncStatus = 'syncing';

    // Process sync update
    setTimeout(() => {
      this.syncStatus = 'connected';
    }, 1000);
  }

  /**
   * Handle context change
   */
  private handleContextChange(newContext: Partial<WedMeContext>): void {
    if (this.context) {
      this.context = { ...this.context, ...newContext };
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    // Reduce WebSocket activity
    // Enable aggressive battery optimization
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForeground(): void {
    // Sync messages
    this.syncMessages();

    // Update read status
    this.updateReadStatus();
  }

  /**
   * Handle network coming online
   */
  private handleNetworkOnline(): void {
    this.initializeWebSocket();
    this.processPendingMessages();
  }

  /**
   * Handle network going offline
   */
  private handleNetworkOffline(): void {
    // Switch to offline mode
    this.syncStatus = 'disconnected';
  }

  /**
   * Handle message composition
   */
  private handleMessageCompose(data: any): void {
    // Auto-save draft
    this.saveDraft(data);
  }

  /**
   * Handle notification events
   */
  private handleNotificationEvent(data: any): void {
    this.sendNotification(data);
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnection(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(
        () => {
          console.log(
            `Attempting reconnection (${this.retryCount}/${this.maxRetries})`,
          );
          this.initializeWebSocket();
        },
        Math.pow(2, this.retryCount) * 1000,
      ); // Exponential backoff
    }
  }

  /**
   * Process pending messages
   */
  private async processPendingMessages(): Promise<void> {
    const pendingMessages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of pendingMessages) {
      try {
        await this.sendMessage(message);
      } catch (error) {
        // Re-add to queue if failed
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Store message in database
   */
  private async storeMessage(message: WedMeMessage): Promise<void> {
    await supabase.from('wedme_messages').upsert({
      id: message.id,
      thread_id: message.threadId,
      sender_id: message.senderId,
      recipient_id: message.recipientId,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      status: message.status,
      metadata: message.metadata,
    });
  }

  /**
   * Store message locally for offline support
   */
  private async storeMessageLocally(message: WedMeMessage): Promise<void> {
    const localMessages = JSON.parse(
      localStorage.getItem('wedme_pending_messages') || '[]',
    );
    localMessages.push(message);
    localStorage.setItem(
      'wedme_pending_messages',
      JSON.stringify(localMessages),
    );
  }

  /**
   * Helper methods
   */
  private determineWeddingPhase(
    weddingDate: string,
  ): 'planning' | 'countdown' | 'day-of' | 'post-wedding' {
    const date = new Date(weddingDate);
    const now = new Date();
    const daysDiff = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff > 30) return 'planning';
    if (daysDiff > 0) return 'countdown';
    if (daysDiff === 0) return 'day-of';
    return 'post-wedding';
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendContextUpdate(): void {
    if (
      this.websocket &&
      this.websocket.readyState === WebSocket.OPEN &&
      this.context
    ) {
      this.websocket.send(
        JSON.stringify({
          type: 'context-update',
          payload: this.context,
        }),
      );
    }
  }

  private showMessageNotification(message: WedMeMessage): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${message.senderId}`, {
        body: message.content.substring(0, 100),
        icon: '/icons/wedme-message.png',
        badge: '/icons/wedme-badge.png',
        data: message,
        requireInteraction: false,
      });
    }
  }

  private showNotification(notification: WedMeNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icons/wedme-notification.png',
        badge: '/icons/wedme-badge.png',
        data: notification.data,
        requireInteraction: notification.priority === 'high',
      });
    }
  }

  private triggerPushNotification(notification: WedMeNotification): void {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/icons/wedme-push.png',
          badge: '/icons/wedme-badge.png',
          data: notification.data,
        });
      });
    }
  }

  private async syncMessages(): Promise<void> {
    // Sync messages from server
    const lastSync = localStorage.getItem('wedme_last_sync') || '0';
    const { data } = await supabase
      .from('wedme_messages')
      .select('*')
      .gte('timestamp', new Date(parseInt(lastSync)).toISOString())
      .eq('recipient_id', this.context?.userId);

    if (data) {
      data.forEach((message) => {
        this.handleIncomingMessage(message as WedMeMessage);
      });
    }

    localStorage.setItem('wedme_last_sync', Date.now().toString());
  }

  private updateReadStatus(): void {
    // Update read status for visible messages
    const visibleMessages = document.querySelectorAll('[data-message-id]');
    const messageIds = Array.from(visibleMessages).map(
      (el) => el.getAttribute('data-message-id')!,
    );

    if (messageIds.length > 0) {
      this.markMessagesAsRead(messageIds);
    }
  }

  private updateUnreadCount(): void {
    this.getUnreadCount().then((count) => {
      window.dispatchEvent(
        new CustomEvent('wedme-unread-count-updated', {
          detail: { count },
        }),
      );
    });
  }

  private saveDraft(data: any): void {
    localStorage.setItem(`wedme_draft_${data.threadId}`, JSON.stringify(data));
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): {
    connected: boolean;
    syncStatus: string;
    context: WedMeContext | null;
    pendingMessages: number;
    unreadCount: number;
  } {
    return {
      connected: this.websocket?.readyState === WebSocket.OPEN,
      syncStatus: this.syncStatus,
      context: this.context,
      pendingMessages: this.messageQueue.length,
      unreadCount: 0, // Will be updated asynchronously
    };
  }

  /**
   * Cleanup on service destruction
   */
  cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
    }
  }
}

// Export singleton instance
export const wedmeIntegration = WedMeIntegrationService.getInstance();
