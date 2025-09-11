import { createClient, RealtimeChannel } from '@supabase/supabase-js';

interface PresenceData {
  userId: string;
  documentId: string;
  cursorPosition: number;
  isTyping: boolean;
  status: 'active' | 'idle' | 'away';
  lastSeen: string;
  userInfo?: {
    name: string;
    avatar?: string;
    color?: string;
  };
}

interface CursorData {
  userId: string;
  position: number;
  color: string;
  name: string;
}

interface ServiceResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

type PresenceChangeCallback = (data: {
  type: 'join' | 'leave' | 'update';
  user: PresenceData;
}) => void;
type TypingChangeCallback = (data: {
  userId: string;
  isTyping: boolean;
}) => void;
type CursorChangeCallback = (data: CursorData) => void;

export class CollaborationPresenceService {
  private supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceData: Map<string, PresenceData> = new Map();
  private callbacks: {
    presence: Map<string, PresenceChangeCallback[]>;
    typing: Map<string, TypingChangeCallback[]>;
    cursor: Map<string, CursorChangeCallback[]>;
  } = {
    presence: new Map(),
    typing: new Map(),
    cursor: new Map(),
  };

  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private cursorThrottleTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  // User color palette for cursor/presence indicators
  private readonly USER_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Set up network status listeners
    this.setupNetworkListeners();

    // Start cleanup interval (every minute)
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactivePresences();
    }, 60 * 1000);
  }

  /**
   * Initialize presence for a document
   */
  async initializePresence(
    documentId: string,
    userId: string,
  ): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const presenceKey = `${documentId}:${userId}`;

      if (this.presenceData.has(presenceKey)) {
        return {
          success: false,
          error: `Presence for document ${documentId} and user ${userId} is already initialized`,
        };
      }

      // Create presence record in database
      const { error: insertError } = await this.supabase
        .from('collaboration_presence')
        .insert({
          document_id: documentId,
          user_id: userId,
          cursor_position: 0,
          is_typing: false,
          status: 'active',
          last_seen: new Date().toISOString(),
          user_color: this.getUserColor(userId),
        });

      if (insertError) {
        console.error('Presence initialization error:', insertError);
        return {
          success: false,
          error: 'Failed to initialize presence in database',
        };
      }

      // Set up realtime channel
      const channelName = `presence:${documentId}`;
      const channel = this.supabase.channel(channelName, {
        config: { presence: { key: userId } },
      });

      // Set up presence tracking
      channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync(documentId);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          this.handlePresenceJoin(documentId, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          this.handlePresenceLeave(documentId, leftPresences);
        })
        .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
          this.handleCursorMove(documentId, payload);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          this.handleTypingChange(documentId, payload);
        });

      // Subscribe to channel
      const subscribeResult = await channel.subscribe();
      if (subscribeResult !== 'SUBSCRIBED') {
        throw new Error(
          `Failed to subscribe to presence channel: ${subscribeResult}`,
        );
      }

      // Store channel and presence data
      this.channels.set(documentId, channel);
      this.presenceData.set(presenceKey, {
        userId,
        documentId,
        cursorPosition: 0,
        isTyping: false,
        status: 'active',
        lastSeen: new Date().toISOString(),
        userInfo: {
          name: await this.getUserName(userId),
          color: this.getUserColor(userId),
        },
      });

      // Track presence
      await channel.track({
        user_id: userId,
        document_id: documentId,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

      return {
        success: true,
        documentId,
        userId,
        channelName,
      };
    } catch (error) {
      console.error('Presence initialization error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during presence initialization',
      };
    }
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(
    documentId: string,
    position: number,
  ): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      if (position < 0) {
        return {
          success: false,
          error: 'Invalid cursor position: position must be non-negative',
        };
      }

      const channel = this.channels.get(documentId);
      if (!channel) {
        return {
          success: false,
          error: `Document ${documentId} presence not initialized`,
        };
      }

      // Throttle cursor updates to prevent spam
      const throttleKey = `cursor:${documentId}`;
      if (this.cursorThrottleTimeouts.has(throttleKey)) {
        return { success: true, throttled: true };
      }

      this.cursorThrottleTimeouts.set(
        throttleKey,
        setTimeout(() => {
          this.cursorThrottleTimeouts.delete(throttleKey);
        }, 50),
      ); // 50ms throttle

      // Update local presence data
      const presenceEntries = Array.from(this.presenceData.entries());
      const relevantEntry = presenceEntries.find(([key]) =>
        key.startsWith(documentId),
      );

      if (relevantEntry) {
        relevantEntry[1].cursorPosition = position;
        relevantEntry[1].lastSeen = new Date().toISOString();
      }

      // Broadcast cursor position
      await channel.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          position,
          timestamp: Date.now(),
        },
      });

      // Update database with throttling
      const dbThrottleKey = `db_cursor:${documentId}`;
      if (!this.cursorThrottleTimeouts.has(dbThrottleKey)) {
        this.cursorThrottleTimeouts.set(
          dbThrottleKey,
          setTimeout(async () => {
            this.cursorThrottleTimeouts.delete(dbThrottleKey);

            await this.supabase
              .from('collaboration_presence')
              .update({
                cursor_position: position,
                last_seen: new Date().toISOString(),
              })
              .eq('document_id', documentId);
          }, 200),
        ); // 200ms database throttle
      }

      return {
        success: true,
        position,
        documentId,
      };
    } catch (error) {
      console.error('Cursor position update error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error updating cursor position',
      };
    }
  }

  /**
   * Get cursor positions of other users
   */
  async getCursorPositions(documentId: string): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const { data: cursors, error } = await this.supabase
        .from('collaboration_presence')
        .select('user_id, cursor_position, user_color, profiles(display_name)')
        .eq('document_id', documentId)
        .neq('user_id', await this.getCurrentUserId())
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) {
        throw error;
      }

      const cursorData =
        cursors?.map((cursor) => ({
          userId: cursor.user_id,
          position: cursor.cursor_position,
          color: cursor.user_color,
          name: cursor.profiles?.display_name || 'Anonymous',
        })) || [];

      return {
        success: true,
        cursors: cursorData,
        documentId,
      };
    } catch (error) {
      console.error('Get cursor positions error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting cursor positions',
      };
    }
  }

  /**
   * Start typing indicator
   */
  async startTyping(documentId: string): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const channel = this.channels.get(documentId);
      if (!channel) {
        return {
          success: false,
          error: `Document ${documentId} presence not initialized`,
        };
      }

      // Clear existing typing timeout
      const timeoutKey = `typing:${documentId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      }

      // Set up auto-stop typing after 5 seconds
      this.typingTimeouts.set(
        timeoutKey,
        setTimeout(() => {
          this.stopTyping(documentId);
        }, 5000),
      );

      // Update local presence
      const presenceEntries = Array.from(this.presenceData.entries());
      const relevantEntry = presenceEntries.find(([key]) =>
        key.startsWith(documentId),
      );

      if (relevantEntry) {
        relevantEntry[1].isTyping = true;
        relevantEntry[1].lastSeen = new Date().toISOString();
      }

      // Broadcast typing status
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          isTyping: true,
          timestamp: Date.now(),
        },
      });

      // Update database
      await this.supabase
        .from('collaboration_presence')
        .update({
          is_typing: true,
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId);

      return {
        success: true,
        documentId,
        isTyping: true,
      };
    } catch (error) {
      console.error('Start typing error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error starting typing indicator',
      };
    }
  }

  /**
   * Stop typing indicator
   */
  async stopTyping(documentId: string): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const channel = this.channels.get(documentId);
      if (!channel) {
        return {
          success: false,
          error: `Document ${documentId} presence not initialized`,
        };
      }

      // Clear typing timeout
      const timeoutKey = `typing:${documentId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey)!);
        this.typingTimeouts.delete(timeoutKey);
      }

      // Update local presence
      const presenceEntries = Array.from(this.presenceData.entries());
      const relevantEntry = presenceEntries.find(([key]) =>
        key.startsWith(documentId),
      );

      if (relevantEntry) {
        relevantEntry[1].isTyping = false;
        relevantEntry[1].lastSeen = new Date().toISOString();
      }

      // Broadcast typing status
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          isTyping: false,
          timestamp: Date.now(),
        },
      });

      // Update database
      await this.supabase
        .from('collaboration_presence')
        .update({
          is_typing: false,
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId);

      return {
        success: true,
        documentId,
        isTyping: false,
      };
    } catch (error) {
      console.error('Stop typing error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error stopping typing indicator',
      };
    }
  }

  /**
   * Get users currently typing
   */
  async getTypingUsers(documentId: string): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const { data: typingUsers, error } = await this.supabase
        .from('collaboration_presence')
        .select('user_id, profiles(display_name)')
        .eq('document_id', documentId)
        .eq('is_typing', true)
        .neq('user_id', await this.getCurrentUserId())
        .gte('last_seen', new Date(Date.now() - 10 * 1000).toISOString()); // Last 10 seconds

      if (error) {
        throw error;
      }

      const typingUserIds =
        typingUsers?.map(
          (user) => user.profiles?.display_name || user.user_id,
        ) || [];

      return {
        success: true,
        typingUsers: typingUserIds,
        documentId,
      };
    } catch (error) {
      console.error('Get typing users error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting typing users',
      };
    }
  }

  /**
   * Set user status
   */
  async setUserStatus(
    documentId: string,
    status: 'active' | 'idle' | 'away',
  ): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const validStatuses = ['active', 'idle', 'away'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: 'Invalid status. Must be one of: active, idle, away',
        };
      }

      const channel = this.channels.get(documentId);
      if (!channel) {
        return {
          success: false,
          error: `Document ${documentId} presence not initialized`,
        };
      }

      // Update local presence
      const presenceEntries = Array.from(this.presenceData.entries());
      const relevantEntry = presenceEntries.find(([key]) =>
        key.startsWith(documentId),
      );

      if (relevantEntry) {
        relevantEntry[1].status = status;
        relevantEntry[1].lastSeen = new Date().toISOString();
      }

      // Update presence tracking
      await channel.track({
        status,
        updated_at: new Date().toISOString(),
      });

      // Update database
      await this.supabase
        .from('collaboration_presence')
        .update({
          status,
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId);

      return {
        success: true,
        documentId,
        status,
      };
    } catch (error) {
      console.error('Set user status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error setting user status',
      };
    }
  }

  /**
   * Get online users for document
   */
  async getOnlineUsers(documentId: string): Promise<ServiceResult> {
    try {
      if (this.isDestroyed) {
        return { success: false, error: 'Service has been destroyed' };
      }

      const { data: onlineUsers, error } = await this.supabase
        .from('collaboration_presence')
        .select(
          `
          user_id,
          status,
          is_typing,
          cursor_position,
          user_color,
          profiles(display_name, avatar_url)
        `,
        )
        .eq('document_id', documentId)
        .gte('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Last 2 minutes

      if (error) {
        throw error;
      }

      const users =
        onlineUsers?.map((user) => ({
          id: user.user_id,
          name: user.profiles?.display_name || 'Anonymous',
          avatar: user.profiles?.avatar_url,
          status: user.status,
          isTyping: user.is_typing,
          cursorPosition: user.cursor_position,
          color: user.user_color,
        })) || [];

      return {
        success: true,
        users,
        count: users.length,
        documentId,
      };
    } catch (error) {
      console.error('Get online users error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting online users',
      };
    }
  }

  /**
   * Handle user disconnect
   */
  async handleUserDisconnect(documentId: string): Promise<ServiceResult> {
    try {
      const channel = this.channels.get(documentId);
      if (channel) {
        await channel.untrack();
      }

      // Update database to mark as offline
      await this.supabase
        .from('collaboration_presence')
        .update({
          status: 'away',
          is_typing: false,
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId);

      return {
        success: true,
        documentId,
      };
    } catch (error) {
      console.error('User disconnect error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error handling user disconnect',
      };
    }
  }

  /**
   * Subscribe to presence changes
   */
  subscribeToPresenceChanges(
    documentId: string,
    callback: PresenceChangeCallback,
  ): void {
    if (!this.callbacks.presence.has(documentId)) {
      this.callbacks.presence.set(documentId, []);
    }
    this.callbacks.presence.get(documentId)!.push(callback);
  }

  /**
   * Subscribe to typing changes
   */
  subscribeToTypingChanges(
    documentId: string,
    callback: TypingChangeCallback,
  ): void {
    if (!this.callbacks.typing.has(documentId)) {
      this.callbacks.typing.set(documentId, []);
    }
    this.callbacks.typing.get(documentId)!.push(callback);
  }

  /**
   * Subscribe to cursor changes
   */
  subscribeToCursorChanges(
    documentId: string,
    callback: CursorChangeCallback,
  ): void {
    if (!this.callbacks.cursor.has(documentId)) {
      this.callbacks.cursor.set(documentId, []);
    }
    this.callbacks.cursor.get(documentId)!.push(callback);
  }

  /**
   * Unsubscribe from presence changes
   */
  unsubscribeFromPresenceChanges(
    documentId: string,
    callback: PresenceChangeCallback,
  ): void {
    const callbacks = this.callbacks.presence.get(documentId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;

    // Clear all timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.cursorThrottleTimeouts.forEach((timeout) => clearTimeout(timeout));

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Unsubscribe from all channels
    this.channels.forEach(async (channel) => {
      await channel.unsubscribe();
    });

    // Clear all data
    this.channels.clear();
    this.presenceData.clear();
    this.callbacks.presence.clear();
    this.callbacks.typing.clear();
    this.callbacks.cursor.clear();
    this.typingTimeouts.clear();
    this.cursorThrottleTimeouts.clear();

    // Remove network listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  // Private methods

  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user?.id || 'anonymous';
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      return data?.display_name || 'Anonymous';
    } catch {
      return 'Anonymous';
    }
  }

  private getUserColor(userId: string): string {
    // Generate consistent color for user based on user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.USER_COLORS[Math.abs(hash) % this.USER_COLORS.length];
  }

  private handlePresenceSync(documentId: string): void {
    // Handle presence synchronization
    const callbacks = this.callbacks.presence.get(documentId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        // Implement sync logic
      });
    }
  }

  private handlePresenceJoin(documentId: string, newPresences: any[]): void {
    const callbacks = this.callbacks.presence.get(documentId);
    if (callbacks) {
      newPresences.forEach((presence) => {
        callbacks.forEach((callback) => {
          callback({
            type: 'join',
            user: presence as PresenceData,
          });
        });
      });
    }
  }

  private handlePresenceLeave(documentId: string, leftPresences: any[]): void {
    const callbacks = this.callbacks.presence.get(documentId);
    if (callbacks) {
      leftPresences.forEach((presence) => {
        callbacks.forEach((callback) => {
          callback({
            type: 'leave',
            user: presence as PresenceData,
          });
        });
      });
    }
  }

  private handleCursorMove(documentId: string, payload: any): void {
    const callbacks = this.callbacks.cursor.get(documentId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(payload as CursorData);
      });
    }
  }

  private handleTypingChange(documentId: string, payload: any): void {
    const callbacks = this.callbacks.typing.get(documentId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(payload);
      });
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    // Reconnect all channels when coming back online
    this.channels.forEach(async (channel, documentId) => {
      try {
        await channel.subscribe();
      } catch (error) {
        console.error(`Failed to reconnect to ${documentId}:`, error);
      }
    });
  };

  private handleOffline = (): void => {
    // Mark all users as away when going offline
    this.presenceData.forEach((presence) => {
      presence.status = 'away';
      presence.isTyping = false;
    });
  };

  private async cleanupInactivePresences(): Promise<void> {
    if (this.isDestroyed) return;

    try {
      // Remove presence records older than 5 minutes
      await this.supabase
        .from('collaboration_presence')
        .delete()
        .lt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    } catch (error) {
      console.error('Cleanup inactive presences error:', error);
    }
  }
}
