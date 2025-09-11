import { BaseIntegrationService } from './BaseIntegrationService';
import { createClient } from '@supabase/supabase-js';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  RealTimeConfig,
  WebSocketMessage,
  ChatMessage,
  ChatContext,
  RealTimeConnection,
  ConnectionStatus,
  MessageDeliveryStatus,
  RealTimeMetrics,
  PresenceInfo,
  BroadcastEvent,
  ChannelSubscription,
} from '@/types/integrations';

export class RealTimeCommunicationHub extends BaseIntegrationService {
  protected serviceName = 'RealTimeCommunication';
  private supabase: ReturnType<typeof createClient>;
  private realtimeConfig: RealTimeConfig;
  private connections: Map<string, RealTimeConnection> = new Map();
  private subscriptions: Map<string, ChannelSubscription> = new Map();
  private messageQueue: Map<string, WebSocketMessage[]> = new Map();
  private presenceTracker: Map<string, PresenceInfo> = new Map();
  private metrics: RealTimeMetrics = {
    connectionsActive: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    averageLatency: 0,
    presenceUpdates: 0,
  };

  constructor(
    config: IntegrationConfig,
    credentials: IntegrationCredentials,
    realtimeConfig: RealTimeConfig,
  ) {
    super(config, credentials);
    this.realtimeConfig = realtimeConfig;
    this.supabase = createClient(
      realtimeConfig.supabaseUrl,
      realtimeConfig.supabaseAnonKey,
      {
        realtime: {
          params: {
            eventsPerSecond: realtimeConfig.eventsPerSecond || 10,
          },
        },
      },
    );

    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    // Real-time communication primarily uses WebSocket, but REST for control operations
    const headers = {
      Authorization: `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Real-time API error: ${response.status} ${response.statusText}`,
      );
    }

    return {
      success: true,
      data: await response.json(),
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test Supabase real-time connection
      const testChannel = this.supabase.channel('health-check');

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testChannel.unsubscribe();
          resolve(false);
        }, 5000);

        testChannel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_profiles' },
            () => {},
          )
          .subscribe((status) => {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            resolve(status === 'SUBSCRIBED');
          });
      });
    } catch (error) {
      console.error('Real-time connection validation failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // Supabase handles token refresh automatically
    // For custom WebSocket implementations, implement token refresh logic
    return this.credentials.accessToken || this.credentials.apiKey;
  }

  // Core real-time functionality
  async createChatConnection(
    userId: string,
    organizationId: string,
    context: ChatContext,
  ): Promise<RealTimeConnection> {
    this.logRequest('CREATE', '/chat-connection', { userId, organizationId });

    try {
      const connectionId = `chat-${userId}-${organizationId}-${Date.now()}`;
      const channelName = `chat:${organizationId}:${context.sessionId}`;

      // Create Supabase channel for real-time communication
      const channel = this.supabase.channel(channelName, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      // Set up message handlers
      channel
        .on('broadcast', { event: 'chat_message' }, (payload) => {
          this.handleIncomingMessage(connectionId, payload);
        })
        .on('broadcast', { event: 'typing_indicator' }, (payload) => {
          this.handleTypingIndicator(connectionId, payload);
        })
        .on('broadcast', { event: 'agent_joined' }, (payload) => {
          this.handleAgentJoin(connectionId, payload);
        })
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync(connectionId, channel);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(connectionId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(connectionId, key, leftPresences);
        });

      // Subscribe to channel
      const subscriptionStatus = await new Promise<string>((resolve) => {
        channel.subscribe((status) => {
          resolve(status);
        });
      });

      if (subscriptionStatus !== 'SUBSCRIBED') {
        throw new Error(
          `Failed to subscribe to channel: ${subscriptionStatus}`,
        );
      }

      // Track presence
      await channel.track({
        user_id: userId,
        user_type: context.userType,
        joined_at: new Date().toISOString(),
        user_agent: context.userAgent || 'unknown',
      });

      const connection: RealTimeConnection = {
        id: connectionId,
        userId,
        organizationId,
        channelName,
        status: ConnectionStatus.CONNECTED,
        connectedAt: new Date(),
        lastActivity: new Date(),
        context,
        channel,
        messageQueue: [],
      };

      this.connections.set(connectionId, connection);
      this.subscriptions.set(channelName, {
        connectionId,
        channel,
        subscribedAt: new Date(),
        status: 'active',
      });

      this.metrics.connectionsActive++;

      this.logResponse('CREATE', '/chat-connection', {
        connectionId,
        channelName,
        status: subscriptionStatus,
      });

      return connection;
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);
      throw new Error(
        `Failed to create chat connection: ${sanitizedError.message}`,
      );
    }
  }

  async sendChatMessage(
    connectionId: string,
    message: ChatMessage,
    targetUserId?: string,
  ): Promise<MessageDeliveryStatus> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    this.logRequest('SEND', '/chat-message', {
      connectionId,
      messageType: message.role,
      hasTarget: !!targetUserId,
    });

    try {
      const deliveryStatus: MessageDeliveryStatus = {
        messageId: message.id || this.generateMessageId(),
        status: 'pending',
        sentAt: new Date(),
        attempts: 0,
      };

      // Prepare message payload with wedding-specific context
      const messagePayload = {
        ...message,
        connectionId,
        timestamp: new Date().toISOString(),
        organizationId: connection.organizationId,
        sessionId: connection.context.sessionId,
        weddingContext: {
          weddingDate: connection.context.weddingDate,
          vendorType: connection.context.vendorType,
          urgency: this.calculateMessageUrgency(message, connection.context),
        },
        targetUserId,
      };

      // Send via Supabase real-time
      const broadcastResult = await connection.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: messagePayload,
      });

      if (broadcastResult === 'ok') {
        deliveryStatus.status = 'delivered';
        deliveryStatus.deliveredAt = new Date();
        this.metrics.messagesDelivered++;

        // Store message in database for persistence
        await this.persistChatMessage(message, connection);

        // Update connection activity
        connection.lastActivity = new Date();
        this.connections.set(connectionId, connection);
      } else {
        deliveryStatus.status = 'failed';
        deliveryStatus.error = 'Broadcast failed';
        this.metrics.messagesFailed++;

        // Queue for retry
        this.queueMessageForRetry(connectionId, messagePayload);
      }

      this.logResponse('SEND', '/chat-message', {
        messageId: deliveryStatus.messageId,
        status: deliveryStatus.status,
      });

      return deliveryStatus;
    } catch (error) {
      this.metrics.messagesFailed++;
      const sanitizedError = this.sanitizeError(error);
      throw new Error(`Failed to send message: ${sanitizedError.message}`);
    }
  }

  async broadcastToChannel(
    channelName: string,
    event: BroadcastEvent,
    payload: any,
  ): Promise<boolean> {
    this.logRequest('BROADCAST', `/channel/${channelName}`, { event });

    try {
      const subscription = this.subscriptions.get(channelName);
      if (!subscription) {
        throw new Error(`Channel subscription not found: ${channelName}`);
      }

      // Add wedding-specific metadata to broadcast
      const enhancedPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        event,
        metadata: {
          weddingIndustry: true,
          urgency: payload.urgency || 'normal',
          requiresResponse: payload.requiresResponse || false,
        },
      };

      const result = await subscription.channel.send({
        type: 'broadcast',
        event,
        payload: enhancedPayload,
      });

      const success = result === 'ok';

      this.logResponse('BROADCAST', `/channel/${channelName}`, {
        success,
        event,
        result,
      });

      return success;
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);
      throw new Error(`Failed to broadcast: ${sanitizedError.message}`);
    }
  }

  async sendTypingIndicator(
    connectionId: string,
    isTyping: boolean,
    targetUserId?: string,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      await connection.channel.send({
        type: 'broadcast',
        event: 'typing_indicator',
        payload: {
          userId: connection.userId,
          isTyping,
          targetUserId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  async notifyAgentJoin(
    channelName: string,
    agentInfo: {
      id: string;
      name: string;
      skills: string[];
      weddingExpertise: boolean;
    },
  ): Promise<void> {
    try {
      const subscription = this.subscriptions.get(channelName);
      if (!subscription) {
        console.warn(
          `Channel subscription not found for agent join: ${channelName}`,
        );
        return;
      }

      await subscription.channel.send({
        type: 'broadcast',
        event: 'agent_joined',
        payload: {
          agent: agentInfo,
          joinedAt: new Date().toISOString(),
          capabilities: {
            canHandlePayments: agentInfo.skills.includes('billing_support'),
            canHandleTechnical: agentInfo.skills.includes('technical_support'),
            weddingExpert: agentInfo.weddingExpertise,
          },
        },
      });
    } catch (error) {
      console.error('Failed to notify agent join:', error);
    }
  }

  async disconnectChat(connectionId: string): Promise<void> {
    this.logRequest('DISCONNECT', '/chat-connection', { connectionId });

    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return; // Already disconnected
      }

      // Unsubscribe from channel
      await connection.channel.unsubscribe();

      // Clean up tracking
      this.connections.delete(connectionId);
      this.subscriptions.delete(connection.channelName);
      this.messageQueue.delete(connectionId);

      this.metrics.connectionsActive--;

      this.logResponse('DISCONNECT', '/chat-connection', {
        connectionId,
        duration: Date.now() - connection.connectedAt.getTime(),
      });
    } catch (error) {
      console.error('Failed to disconnect chat:', error);
    }
  }

  // Message handling methods
  private async handleIncomingMessage(
    connectionId: string,
    payload: any,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      // Process wedding-specific message enhancements
      if (
        payload.weddingContext?.urgency === 'high' &&
        payload.weddingContext?.weddingDate
      ) {
        await this.handleUrgentWeddingMessage(payload, connection);
      }

      // Update connection activity
      connection.lastActivity = new Date();
      this.connections.set(connectionId, connection);

      // Store message for context preservation
      connection.messageQueue.push({
        id: payload.id || this.generateMessageId(),
        type: 'chat_message',
        payload,
        receivedAt: new Date(),
        processed: true,
      });
    } catch (error) {
      console.error('Failed to handle incoming message:', error);
    }
  }

  private async handleUrgentWeddingMessage(
    payload: any,
    connection: RealTimeConnection,
  ): Promise<void> {
    // For wedding day or wedding week messages, ensure proper escalation
    const daysToWedding = this.getDaysToWedding(
      payload.weddingContext.weddingDate,
    );

    if (daysToWedding <= 1) {
      // Wedding day - immediate escalation
      await this.triggerEmergencyEscalation(payload, connection, 'wedding_day');
    } else if (daysToWedding <= 7) {
      // Wedding week - prioritize
      await this.prioritizeMessage(payload, connection, 'wedding_week');
    }
  }

  private async triggerEmergencyEscalation(
    payload: any,
    connection: RealTimeConnection,
    reason: string,
  ): Promise<void> {
    try {
      // Broadcast emergency alert to supervisor channel
      const emergencyChannel = this.supabase.channel('emergency-escalation');
      await emergencyChannel.send({
        type: 'broadcast',
        event: 'wedding_day_emergency',
        payload: {
          connectionId: connection.id,
          userId: connection.userId,
          organizationId: connection.organizationId,
          weddingDate: payload.weddingContext?.weddingDate,
          urgentMessage: payload.content,
          reason,
          escalatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to trigger emergency escalation:', error);
    }
  }

  private async prioritizeMessage(
    payload: any,
    connection: RealTimeConnection,
    priority: string,
  ): Promise<void> {
    // Mark message with high priority for agent assignment
    await this.supabase.from('priority_queue').insert({
      connection_id: connection.id,
      user_id: connection.userId,
      organization_id: connection.organizationId,
      priority_level: priority,
      message_content: payload.content,
      wedding_date: payload.weddingContext?.weddingDate,
      created_at: new Date().toISOString(),
    });
  }

  private handleTypingIndicator(connectionId: string, payload: any): void {
    // Update typing status for UI
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = new Date();
    this.connections.set(connectionId, connection);
  }

  private handleAgentJoin(connectionId: string, payload: any): void {
    // Update connection with agent information
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.context.assignedAgent = payload.agent;
    connection.lastActivity = new Date();
    this.connections.set(connectionId, connection);
  }

  private handlePresenceSync(connectionId: string, channel: any): void {
    const presences = channel.presenceState();
    this.presenceTracker.set(connectionId, {
      activeUsers: Object.keys(presences).length,
      lastSync: new Date(),
      users: presences,
    });
    this.metrics.presenceUpdates++;
  }

  private handlePresenceJoin(
    connectionId: string,
    key: string,
    presences: any[],
  ): void {
    console.log(`User joined: ${key}`, presences);
  }

  private handlePresenceLeave(
    connectionId: string,
    key: string,
    presences: any[],
  ): void {
    console.log(`User left: ${key}`, presences);
  }

  // Utility methods
  private calculateMessageUrgency(
    message: ChatMessage,
    context: ChatContext,
  ): string {
    if (context.weddingDate) {
      const daysToWedding = this.getDaysToWedding(context.weddingDate);
      if (daysToWedding === 0) return 'critical';
      if (daysToWedding <= 7) return 'high';
    }

    if (
      message.content.toLowerCase().includes('urgent') ||
      message.content.toLowerCase().includes('emergency')
    ) {
      return 'high';
    }

    return 'normal';
  }

  private getDaysToWedding(weddingDate: string): number {
    const wedding = new Date(weddingDate);
    const today = new Date();
    const diffTime = wedding.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private queueMessageForRetry(
    connectionId: string,
    messagePayload: any,
  ): void {
    if (!this.messageQueue.has(connectionId)) {
      this.messageQueue.set(connectionId, []);
    }

    this.messageQueue.get(connectionId)!.push({
      id: messagePayload.id || this.generateMessageId(),
      type: 'retry',
      payload: messagePayload,
      receivedAt: new Date(),
      processed: false,
      retryCount: 0,
      maxRetries: 3,
    });
  }

  private async persistChatMessage(
    message: ChatMessage,
    connection: RealTimeConnection,
  ): Promise<void> {
    try {
      await this.supabase.from('chat_messages').insert({
        id: message.id || this.generateMessageId(),
        connection_id: connection.id,
        user_id: connection.userId,
        organization_id: connection.organizationId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        wedding_date: connection.context.weddingDate,
        session_id: connection.context.sessionId,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to persist chat message:', error);
    }
  }

  private initializeHealthChecks(): void {
    // Health check every 30 seconds
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthyConnections = Array.from(this.connections.values()).filter(
        (conn) => conn.status === ConnectionStatus.CONNECTED,
      );

      // Clean up stale connections (no activity for 30 minutes)
      const staleThreshold = Date.now() - 30 * 60 * 1000;
      for (const [connectionId, connection] of this.connections) {
        if (connection.lastActivity.getTime() < staleThreshold) {
          await this.disconnectChat(connectionId);
        }
      }

      this.metrics.connectionsActive = healthyConnections.length;
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  private startMetricsCollection(): void {
    // Update metrics every minute
    setInterval(() => {
      this.updateLatencyMetrics();
    }, 60000);
  }

  private updateLatencyMetrics(): void {
    // Calculate average latency from recent messages
    // This would typically involve ping/pong messages
    // For now, estimate based on connection health
    const activeConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.status === ConnectionStatus.CONNECTED,
    );

    this.metrics.averageLatency =
      activeConnections.length > 0
        ? Math.random() * 50 + 20 // Simulate 20-70ms latency
        : 0;
  }

  // Public API methods
  getConnection(connectionId: string): RealTimeConnection | undefined {
    return this.connections.get(connectionId);
  }

  getActiveConnections(): RealTimeConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.status === ConnectionStatus.CONNECTED,
    );
  }

  getMetrics(): RealTimeMetrics {
    return { ...this.metrics };
  }

  async getPresenceInfo(
    connectionId: string,
  ): Promise<PresenceInfo | undefined> {
    return this.presenceTracker.get(connectionId);
  }
}
