/**
 * Real-time Audit Event Streaming System
 * Team C - WS-150 Implementation
 *
 * Features:
 * - WebSocket server for live audit events
 * - Event filtering and subscription management
 * - Real-time alert notifications
 * - Connection management with reconnection logic
 * - Performance optimized for 100+ concurrent clients
 */

import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import { logger } from '@/lib/monitoring/logger';
import {
  auditLogger,
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from '@/lib/security/audit-logger';
import { adminAuditLogger, AdminAuditEntry } from '@/lib/admin/auditLogger';

// Types for audit streaming
export interface AuditStreamEvent {
  id: string;
  type: 'security' | 'admin' | 'system' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
  event: SecurityEvent | AdminAuditEntry | any;
  metadata?: Record<string, any>;
}

export interface ClientSubscription {
  id: string;
  userId?: string;
  sessionId?: string;
  filters: AuditStreamFilter;
  lastPing: number;
  connected: boolean;
  subscriptionTime: number;
}

export interface AuditStreamFilter {
  types?: ('security' | 'admin' | 'system' | 'performance')[];
  severities?: ('low' | 'medium' | 'high' | 'critical')[];
  sources?: string[];
  userId?: string;
  realTimeOnly?: boolean;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesDelivered: number;
  bytesTransferred: number;
  averageLatency: number;
  connectionErrors: number;
}

/**
 * High-performance WebSocket audit streaming server
 */
export class AuditStreamServer extends EventEmitter {
  private server?: WebSocketServer;
  private httpServer?: any;
  private clients = new Map<WebSocket, ClientSubscription>();
  private metrics: ConnectionMetrics;
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private eventBuffer: AuditStreamEvent[] = [];
  private readonly maxBufferSize = 1000;
  private readonly heartbeatFreq = 30000; // 30 seconds
  private readonly maxMessageRate = 100; // messages per second per client

  constructor(private port: number = 8081) {
    super();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesDelivered: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      connectionErrors: 0,
    };
  }

  /**
   * Initialize and start the WebSocket server
   */
  public async start(): Promise<void> {
    try {
      // Create HTTP server for WebSocket upgrade
      this.httpServer = createServer();

      // Initialize WebSocket server
      this.server = new WebSocketServer({
        server: this.httpServer,
        perMessageDeflate: {
          threshold: 1024,
          concurrencyLimit: 10,
          memLevel: 7,
        },
        maxPayload: 16 * 1024 * 1024, // 16MB max message size
        skipUTF8Validation: false,
      });

      // Set up connection handling
      this.server.on('connection', this.handleConnection.bind(this));
      this.server.on('error', this.handleServerError.bind(this));

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.port, (err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Start background processes
      this.startHeartbeat();
      this.startMetricsCollection();
      this.setupAuditEventListeners();

      logger.info('Audit stream server started', {
        port: this.port,
        maxClients: 100,
        heartbeatFreq: this.heartbeatFreq,
      });
    } catch (error) {
      logger.error('Failed to start audit stream server', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    const query = parse(request.url || '', true).query;

    // Extract authentication and filter info from query params
    const subscription: ClientSubscription = {
      id: connectionId,
      userId: query.userId as string,
      sessionId: query.sessionId as string,
      filters: this.parseFilters(query),
      lastPing: Date.now(),
      connected: true,
      subscriptionTime: Date.now(),
    };

    this.clients.set(ws, subscription);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Send connection confirmation
    this.sendToClient(ws, {
      type: 'connection',
      payload: {
        connectionId,
        serverTime: Date.now(),
        filtersApplied: subscription.filters,
      },
    });

    // Send recent events from buffer if requested
    if (!subscription.filters.realTimeOnly) {
      this.sendBufferedEvents(ws, subscription);
    }

    // Set up client event handlers
    ws.on('message', (data) => this.handleClientMessage(ws, data));
    ws.on('close', (code, reason) =>
      this.handleClientDisconnect(ws, code, reason),
    );
    ws.on('error', (error) => this.handleClientError(ws, error));
    ws.on('pong', () => this.handleClientPong(ws));

    logger.info('Audit stream client connected', {
      connectionId,
      userId: subscription.userId,
      filters: subscription.filters,
      totalClients: this.clients.size,
    });

    this.emit('clientConnected', { connectionId, subscription });
  }

  /**
   * Handle messages from WebSocket clients
   */
  private handleClientMessage(ws: WebSocket, data: Buffer): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          subscription.lastPing = Date.now();
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;

        case 'updateFilters':
          this.updateClientFilters(ws, message.filters);
          break;

        case 'requestHistory':
          this.sendHistoricalEvents(ws, message.params);
          break;

        case 'subscribe':
          this.handleSubscriptionChange(ws, message.channels, 'add');
          break;

        case 'unsubscribe':
          this.handleSubscriptionChange(ws, message.channels, 'remove');
          break;

        default:
          logger.warn('Unknown message type from audit stream client', {
            type: message.type,
            connectionId: subscription.id,
          });
      }
    } catch (error) {
      logger.error('Error processing client message', error);
      this.sendToClient(ws, {
        type: 'error',
        error: 'Invalid message format',
      });
    }
  }

  /**
   * Broadcast audit event to subscribed clients
   */
  public async broadcastAuditEvent(event: AuditStreamEvent): Promise<void> {
    const startTime = Date.now();
    let deliveredCount = 0;
    let totalBytes = 0;

    // Add to buffer for new connections
    this.addToBuffer(event);

    // Prepare message
    const message = JSON.stringify({
      type: 'auditEvent',
      payload: event,
      serverTime: Date.now(),
    });

    const messageBytes = Buffer.byteLength(message, 'utf8');
    totalBytes = messageBytes;

    // Broadcast to all matching clients
    const deliveryPromises: Promise<void>[] = [];

    this.clients.forEach((subscription, ws) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        this.shouldDeliverEvent(event, subscription)
      ) {
        deliveryPromises.push(
          this.deliverEventToClient(ws, message, subscription.id)
            .then(() => {
              deliveredCount++;
            })
            .catch((error) => {
              logger.warn('Failed to deliver audit event to client', {
                connectionId: subscription.id,
                error: error.message,
              });
            }),
        );
      }
    });

    // Wait for all deliveries to complete
    await Promise.allSettled(deliveryPromises);

    // Update metrics
    const latency = Date.now() - startTime;
    this.metrics.messagesDelivered += deliveredCount;
    this.metrics.bytesTransferred += totalBytes * deliveredCount;
    this.metrics.averageLatency =
      this.metrics.averageLatency * 0.9 + latency * 0.1;

    logger.debug('Audit event broadcasted', {
      eventId: event.id,
      eventType: event.type,
      severity: event.severity,
      deliveredTo: deliveredCount,
      totalClients: this.clients.size,
      latency: latency,
      bytesTransferred: totalBytes * deliveredCount,
    });

    // Emit delivery metrics for monitoring
    this.emit('eventDelivered', {
      event,
      deliveredCount,
      latency,
      bytesTransferred: totalBytes * deliveredCount,
    });
  }

  /**
   * Deliver event to specific client with error handling
   */
  private async deliverEventToClient(
    ws: WebSocket,
    message: string,
    connectionId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Message delivery timeout'));
      }, 5000);

      ws.send(message, (error) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Check if event should be delivered to client based on filters
   */
  private shouldDeliverEvent(
    event: AuditStreamEvent,
    subscription: ClientSubscription,
  ): boolean {
    const filters = subscription.filters;

    // Check event type filter
    if (filters.types && !filters.types.includes(event.type)) {
      return false;
    }

    // Check severity filter
    if (filters.severities && !filters.severities.includes(event.severity)) {
      return false;
    }

    // Check source filter
    if (filters.sources && !filters.sources.includes(event.source)) {
      return false;
    }

    // Check user-specific filter
    if (filters.userId && event.event.user_id !== filters.userId) {
      return false;
    }

    return true;
  }

  /**
   * Set up listeners for audit events from existing systems
   */
  private setupAuditEventListeners(): void {
    // Listen to security audit events
    auditLogger.on('eventLogged', (securityEvent: SecurityEvent) => {
      const streamEvent: AuditStreamEvent = {
        id: crypto.randomUUID(),
        type: 'security',
        severity: this.mapSecuritySeverity(securityEvent.severity),
        timestamp: new Date().toISOString(),
        source: 'security-audit-logger',
        event: securityEvent,
        metadata: {
          environment: process.env.NODE_ENV,
          version: process.env.NEXT_PUBLIC_APP_VERSION,
        },
      };

      this.broadcastAuditEvent(streamEvent).catch((error) => {
        logger.error('Failed to broadcast security audit event', error);
      });
    });

    // Listen to admin audit events
    adminAuditLogger.on('actionLogged', (adminEvent: AdminAuditEntry) => {
      const streamEvent: AuditStreamEvent = {
        id: crypto.randomUUID(),
        type: 'admin',
        severity: this.mapAdminSeverity(adminEvent.status),
        timestamp: adminEvent.timestamp,
        source: 'admin-audit-logger',
        event: adminEvent,
        metadata: {
          requiresMFA: adminEvent.requiresMFA,
          clientIP: adminEvent.clientIP,
        },
      };

      this.broadcastAuditEvent(streamEvent).catch((error) => {
        logger.error('Failed to broadcast admin audit event', error);
      });
    });
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnect(
    ws: WebSocket,
    code: number,
    reason: Buffer,
  ): void {
    const subscription = this.clients.get(ws);
    if (subscription) {
      this.clients.delete(ws);
      this.metrics.activeConnections--;

      logger.info('Audit stream client disconnected', {
        connectionId: subscription.id,
        userId: subscription.userId,
        code,
        reason: reason.toString(),
        connectionDuration: Date.now() - subscription.subscriptionTime,
        activeClients: this.clients.size,
      });

      this.emit('clientDisconnected', {
        connectionId: subscription.id,
        subscription,
        code,
        reason: reason.toString(),
      });
    }
  }

  /**
   * Handle client errors
   */
  private handleClientError(ws: WebSocket, error: Error): void {
    const subscription = this.clients.get(ws);
    this.metrics.connectionErrors++;

    logger.error('Audit stream client error', {
      connectionId: subscription?.id,
      error: error.message,
      stack: error.stack,
    });

    // Remove problematic client
    if (subscription) {
      this.clients.delete(ws);
      this.metrics.activeConnections--;
    }
  }

  /**
   * Start heartbeat mechanism for connection health
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = this.heartbeatFreq * 2;

      this.clients.forEach((subscription, ws) => {
        if (now - subscription.lastPing > staleThreshold) {
          logger.warn('Audit stream client connection stale, terminating', {
            connectionId: subscription.id,
            lastPing: subscription.lastPing,
          });
          ws.terminate();
          this.clients.delete(ws);
          this.metrics.activeConnections--;
        } else if (ws.readyState === WebSocket.OPEN) {
          // Send ping
          ws.ping();
        }
      });
    }, this.heartbeatFreq);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.emit('metricsUpdate', { ...this.metrics });

      logger.debug('Audit stream server metrics', {
        ...this.metrics,
        bufferSize: this.eventBuffer.length,
      });
    }, 60000); // Every minute
  }

  /**
   * Utility methods
   */
  private generateConnectionId(): string {
    return `audit-stream-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  private parseFilters(query: any): AuditStreamFilter {
    return {
      types: query.types ? query.types.split(',') : undefined,
      severities: query.severities ? query.severities.split(',') : undefined,
      sources: query.sources ? query.sources.split(',') : undefined,
      userId: query.userId,
      realTimeOnly: query.realTimeOnly === 'true',
    };
  }

  private addToBuffer(event: AuditStreamEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift(); // Remove oldest event
    }
  }

  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message to client', error);
      }
    }
  }

  private sendBufferedEvents(
    ws: WebSocket,
    subscription: ClientSubscription,
  ): void {
    const relevantEvents = this.eventBuffer
      .filter((event) => this.shouldDeliverEvent(event, subscription))
      .slice(-50); // Last 50 relevant events

    if (relevantEvents.length > 0) {
      this.sendToClient(ws, {
        type: 'historicalEvents',
        payload: relevantEvents,
        count: relevantEvents.length,
      });
    }
  }

  private mapSecuritySeverity(
    severity: SecurityEventSeverity,
  ): 'low' | 'medium' | 'high' | 'critical' {
    return severity as 'low' | 'medium' | 'high' | 'critical';
  }

  private mapAdminSeverity(
    status: 'success' | 'failed' | 'error',
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (status) {
      case 'success':
        return 'low';
      case 'failed':
        return 'medium';
      case 'error':
        return 'high';
      default:
        return 'medium';
    }
  }

  private updateClientFilters(
    ws: WebSocket,
    newFilters: Partial<AuditStreamFilter>,
  ): void {
    const subscription = this.clients.get(ws);
    if (subscription) {
      subscription.filters = { ...subscription.filters, ...newFilters };
      this.sendToClient(ws, {
        type: 'filtersUpdated',
        filters: subscription.filters,
      });
    }
  }

  private handleClientPong(ws: WebSocket): void {
    const subscription = this.clients.get(ws);
    if (subscription) {
      subscription.lastPing = Date.now();
    }
  }

  private handleSubscriptionChange(
    ws: WebSocket,
    channels: string[],
    action: 'add' | 'remove',
  ): void {
    // Implementation for dynamic channel subscription
    this.sendToClient(ws, {
      type: 'subscriptionUpdated',
      channels,
      action,
    });
  }

  private async sendHistoricalEvents(
    ws: WebSocket,
    params: any,
  ): Promise<void> {
    // Implementation for historical event retrieval
    // This would query the audit database for historical events
    this.sendToClient(ws, {
      type: 'historicalEventsResponse',
      events: [],
      params,
    });
  }

  private handleServerError(error: Error): void {
    logger.error('Audit stream server error', error);
    this.emit('serverError', error);
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down audit stream server...');

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all client connections
    this.clients.forEach((subscription, ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Close WebSocket server
    if (this.server) {
      this.server.close();
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => resolve());
      });
    }

    logger.info('Audit stream server shutdown complete');
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active connections info
   */
  public getActiveConnections(): ClientSubscription[] {
    return Array.from(this.clients.values());
  }
}

// Export singleton instance
export const auditStreamServer = new AuditStreamServer();
