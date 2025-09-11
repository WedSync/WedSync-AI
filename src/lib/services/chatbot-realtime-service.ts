// ==========================================
// WS-243: AI Chatbot Real-time Service
// ==========================================

import { EventEmitter } from 'events';
import type { ChatbotMessage, ChatbotConversation } from '../../types/chatbot';

// ==========================================
// Real-time Event Types
// ==========================================

export interface ChatbotRealtimeEvents {
  'message:created': { message: ChatbotMessage; conversationId: string };
  'message:updated': { message: ChatbotMessage; conversationId: string };
  'conversation:updated': { conversation: ChatbotConversation };
  'typing:start': {
    conversationId: string;
    userId: string;
    type: 'user' | 'ai';
  };
  'typing:stop': {
    conversationId: string;
    userId: string;
    type: 'user' | 'ai';
  };
  'user:online': { conversationId: string; userId: string };
  'user:offline': { conversationId: string; userId: string };
  'ai:thinking': { conversationId: string; estimatedTime: number };
  'ai:response_ready': { conversationId: string; messageId: string };
  error: { error: string; conversationId?: string };
}

// ==========================================
// Real-time Connection Manager
// ==========================================

export class ChatbotRealtimeService extends EventEmitter {
  private connections: Map<string, Set<string>> = new Map(); // conversationId -> Set of userIds
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of conversationIds
  private typingUsers: Map<string, Set<string>> = new Map(); // conversationId -> Set of typing userIds
  private aiThinking: Map<string, NodeJS.Timeout> = new Map(); // conversationId -> timeout

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  // ==========================================
  // Connection Management
  // ==========================================

  addUserToConversation(conversationId: string, userId: string): void {
    // Add to conversation connections
    if (!this.connections.has(conversationId)) {
      this.connections.set(conversationId, new Set());
    }
    this.connections.get(conversationId)!.add(userId);

    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(conversationId);

    // Emit user online event
    this.emit('user:online', { conversationId, userId });

    console.log(`User ${userId} joined conversation ${conversationId}`);
  }

  removeUserFromConversation(conversationId: string, userId: string): void {
    // Remove from conversation connections
    const conversationUsers = this.connections.get(conversationId);
    if (conversationUsers) {
      conversationUsers.delete(userId);
      if (conversationUsers.size === 0) {
        this.connections.delete(conversationId);
      }
    }

    // Remove from user connections
    const userConversations = this.userConnections.get(userId);
    if (userConversations) {
      userConversations.delete(conversationId);
      if (userConversations.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Stop typing if user was typing
    this.stopTyping(conversationId, userId, 'user');

    // Emit user offline event
    this.emit('user:offline', { conversationId, userId });

    console.log(`User ${userId} left conversation ${conversationId}`);
  }

  getActiveUsers(conversationId: string): string[] {
    return Array.from(this.connections.get(conversationId) || []);
  }

  getUserConversations(userId: string): string[] {
    return Array.from(this.userConnections.get(userId) || []);
  }

  isUserOnline(conversationId: string, userId: string): boolean {
    return this.connections.get(conversationId)?.has(userId) || false;
  }

  // ==========================================
  // Message Broadcasting
  // ==========================================

  broadcastMessage(message: ChatbotMessage, excludeUserId?: string): void {
    const conversationUsers = this.connections.get(message.conversation_id);
    if (!conversationUsers || conversationUsers.size === 0) {
      return;
    }

    const targetUsers = excludeUserId
      ? Array.from(conversationUsers).filter((uid) => uid !== excludeUserId)
      : Array.from(conversationUsers);

    if (targetUsers.length > 0) {
      this.emit('message:created', {
        message,
        conversationId: message.conversation_id,
      });

      console.log(
        `Broadcasting message ${message.id} to ${targetUsers.length} users in conversation ${message.conversation_id}`,
      );
    }
  }

  broadcastMessageUpdate(message: ChatbotMessage): void {
    const conversationUsers = this.connections.get(message.conversation_id);
    if (!conversationUsers || conversationUsers.size === 0) {
      return;
    }

    this.emit('message:updated', {
      message,
      conversationId: message.conversation_id,
    });
  }

  broadcastConversationUpdate(conversation: ChatbotConversation): void {
    const conversationUsers = this.connections.get(conversation.id);
    if (!conversationUsers || conversationUsers.size === 0) {
      return;
    }

    this.emit('conversation:updated', { conversation });
  }

  // ==========================================
  // Typing Indicators
  // ==========================================

  startTyping(
    conversationId: string,
    userId: string,
    type: 'user' | 'ai',
  ): void {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }

    const typingSet = this.typingUsers.get(conversationId)!;
    const typingKey = `${userId}:${type}`;

    if (!typingSet.has(typingKey)) {
      typingSet.add(typingKey);

      this.emit('typing:start', { conversationId, userId, type });

      // Auto-stop typing after 10 seconds for users, 30 seconds for AI
      const timeout = type === 'ai' ? 30000 : 10000;
      setTimeout(() => {
        this.stopTyping(conversationId, userId, type);
      }, timeout);
    }
  }

  stopTyping(
    conversationId: string,
    userId: string,
    type: 'user' | 'ai',
  ): void {
    const typingSet = this.typingUsers.get(conversationId);
    if (!typingSet) return;

    const typingKey = `${userId}:${type}`;

    if (typingSet.has(typingKey)) {
      typingSet.delete(typingKey);

      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }

      this.emit('typing:stop', { conversationId, userId, type });
    }
  }

  getTypingUsers(
    conversationId: string,
  ): Array<{ userId: string; type: 'user' | 'ai' }> {
    const typingSet = this.typingUsers.get(conversationId);
    if (!typingSet) return [];

    return Array.from(typingSet).map((key) => {
      const [userId, type] = key.split(':');
      return { userId, type: type as 'user' | 'ai' };
    });
  }

  // ==========================================
  // AI Thinking Indicators
  // ==========================================

  startAIThinking(conversationId: string, estimatedTime: number = 5000): void {
    // Clear any existing AI thinking timeout
    const existingTimeout = this.aiThinking.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Start AI typing indicator
    this.startTyping(conversationId, 'ai-assistant', 'ai');

    // Emit AI thinking event
    this.emit('ai:thinking', { conversationId, estimatedTime });

    // Set timeout to auto-stop if AI takes too long
    const timeout = setTimeout(
      () => {
        this.stopAIThinking(conversationId);
      },
      Math.max(estimatedTime, 30000),
    ); // Max 30 seconds

    this.aiThinking.set(conversationId, timeout);

    console.log(
      `AI thinking started for conversation ${conversationId}, estimated ${estimatedTime}ms`,
    );
  }

  stopAIThinking(conversationId: string, messageId?: string): void {
    const timeout = this.aiThinking.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      this.aiThinking.delete(conversationId);
    }

    // Stop AI typing indicator
    this.stopTyping(conversationId, 'ai-assistant', 'ai');

    if (messageId) {
      this.emit('ai:response_ready', { conversationId, messageId });
    }

    console.log(`AI thinking stopped for conversation ${conversationId}`);
  }

  isAIThinking(conversationId: string): boolean {
    return this.aiThinking.has(conversationId);
  }

  // ==========================================
  // Error Broadcasting
  // ==========================================

  broadcastError(error: string, conversationId?: string): void {
    this.emit('error', { error, conversationId });

    if (conversationId) {
      console.error(`Chatbot error in conversation ${conversationId}:`, error);
    } else {
      console.error('Chatbot global error:', error);
    }
  }

  // ==========================================
  // Connection Statistics
  // ==========================================

  getConnectionStats(): {
    totalConversations: number;
    totalUsers: number;
    activeTyping: number;
    aiThinking: number;
  } {
    return {
      totalConversations: this.connections.size,
      totalUsers: this.userConnections.size,
      activeTyping: Array.from(this.typingUsers.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      ),
      aiThinking: this.aiThinking.size,
    };
  }

  getConversationStats(conversationId: string): {
    activeUsers: number;
    typingUsers: number;
    aiThinking: boolean;
  } {
    return {
      activeUsers: this.connections.get(conversationId)?.size || 0,
      typingUsers: this.typingUsers.get(conversationId)?.size || 0,
      aiThinking: this.aiThinking.has(conversationId),
    };
  }

  // ==========================================
  // Cleanup and Maintenance
  // ==========================================

  private setupCleanupInterval(): void {
    // Clean up stale connections every 5 minutes
    setInterval(
      () => {
        this.cleanupStaleConnections();
      },
      5 * 60 * 1000,
    );
  }

  private cleanupStaleConnections(): void {
    // Clean up empty conversation sets
    for (const [conversationId, userSet] of this.connections.entries()) {
      if (userSet.size === 0) {
        this.connections.delete(conversationId);
      }
    }

    // Clean up empty user sets
    for (const [userId, conversationSet] of this.userConnections.entries()) {
      if (conversationSet.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Clean up stale typing indicators (older than 1 minute)
    for (const [conversationId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    const stats = this.getConnectionStats();
    console.log(
      `Cleanup complete: ${stats.totalConversations} conversations, ${stats.totalUsers} users, ${stats.activeTyping} typing, ${stats.aiThinking} AI thinking`,
    );
  }

  // ==========================================
  // Event Helpers
  // ==========================================

  onMessage(
    callback: (data: ChatbotRealtimeEvents['message:created']) => void,
  ): void {
    this.on('message:created', callback);
  }

  onTyping(
    callback: (
      data:
        | ChatbotRealtimeEvents['typing:start']
        | ChatbotRealtimeEvents['typing:stop'],
    ) => void,
  ): void {
    this.on('typing:start', callback);
    this.on('typing:stop', callback);
  }

  onUserPresence(
    callback: (
      data:
        | ChatbotRealtimeEvents['user:online']
        | ChatbotRealtimeEvents['user:offline'],
    ) => void,
  ): void {
    this.on('user:online', callback);
    this.on('user:offline', callback);
  }

  onAIEvents(
    callback: (
      data:
        | ChatbotRealtimeEvents['ai:thinking']
        | ChatbotRealtimeEvents['ai:response_ready'],
    ) => void,
  ): void {
    this.on('ai:thinking', callback);
    this.on('ai:response_ready', callback);
  }

  onError(callback: (data: ChatbotRealtimeEvents['error']) => void): void {
    this.on('error', callback);
  }

  // ==========================================
  // Server-Sent Events Integration
  // ==========================================

  createSSEStream(
    userId: string,
    conversationId: string,
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: (controller) => {
        // Add user to conversation
        this.addUserToConversation(conversationId, userId);

        // Send initial connection confirmation
        const initData = JSON.stringify({
          type: 'connection:established',
          conversationId,
          userId,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

        // Set up event listeners
        const messageHandler = (
          data: ChatbotRealtimeEvents['message:created'],
        ) => {
          if (data.conversationId === conversationId) {
            const eventData = JSON.stringify({
              type: 'message:created',
              ...data,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }
        };

        const typingHandler = (data: ChatbotRealtimeEvents['typing:start']) => {
          if (
            data.conversationId === conversationId &&
            data.userId !== userId
          ) {
            const eventData = JSON.stringify({
              type: 'typing:start',
              ...data,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }
        };

        const aiThinkingHandler = (
          data: ChatbotRealtimeEvents['ai:thinking'],
        ) => {
          if (data.conversationId === conversationId) {
            const eventData = JSON.stringify({
              type: 'ai:thinking',
              ...data,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }
        };

        // Register event listeners
        this.on('message:created', messageHandler);
        this.on('typing:start', typingHandler);
        this.on('ai:thinking', aiThinkingHandler);

        // Cleanup function
        return () => {
          this.removeUserFromConversation(conversationId, userId);
          this.off('message:created', messageHandler);
          this.off('typing:start', typingHandler);
          this.off('ai:thinking', aiThinkingHandler);
        };
      },
    });
  }
}

// Export singleton instance
export const chatbotRealtime = new ChatbotRealtimeService();
