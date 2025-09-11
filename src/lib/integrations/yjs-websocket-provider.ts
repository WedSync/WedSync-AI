/**
 * WS-244 Real-Time Collaboration System - Y.js WebSocket Provider
 * Team C - Y.js Integration and WebSocket Provider
 *
 * Core Y.js WebSocket provider that integrates with WedSync's existing
 * WebSocket infrastructure for real-time collaborative editing.
 */

import * as Y from 'yjs';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import {
  YjsDocument,
  YjsProviderOptions,
  ConnectionStatus,
  SyncStatus,
  SyncResult,
  StateVector,
  WebSocketMessage,
  WebSocketMessageType,
  SyncRequest,
  SyncResponse,
  CollaborationError,
  CollaborationErrorCode,
  CollaborationMetrics,
  AuditLogEntry,
  AuditAction,
} from '../../types/collaboration';
import { createClient } from '@supabase/supabase-js';
import { BaseIntegrationService } from './BaseIntegrationService';

/**
 * Y.js WebSocket Provider for real-time document collaboration
 * Integrates with WedSync's existing authentication and WebSocket infrastructure
 */
export class YjsWebSocketProvider extends EventEmitter {
  private yjsDocument: Y.Doc;
  private websocket: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private syncStatus: SyncStatus = SyncStatus.OUT_OF_SYNC;
  private retryCount = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private awareness: Y.Map<any>;
  private metrics: CollaborationMetrics;
  private supabaseClient: any;

  constructor(
    document: Y.Doc,
    private websocketUrl: string,
    private sessionId: string,
    private options: YjsProviderOptions,
  ) {
    super();

    this.yjsDocument = document;
    this.awareness = new Y.Map();

    // Initialize Supabase client for authentication and audit logging
    this.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize metrics tracking
    this.metrics = {
      documentId: this.sessionId,
      sessionId: crypto.randomUUID(),
      userId: this.options.userId,
      startTime: new Date(),
      operationCount: 0,
      conflictCount: 0,
      syncLatency: [],
      connectionDowntime: 0,
      errorCount: 0,
      bandwidth: { sent: 0, received: 0 },
    };

    // Set up Y.js document event listeners
    this.setupYjsEventListeners();

    // Set up awareness for real-time presence
    this.setupAwareness();
  }

  /**
   * Connect to WebSocket server and initialize Y.js synchronization
   */
  public async connect(): Promise<void> {
    try {
      this.setConnectionStatus(ConnectionStatus.CONNECTING);

      // Validate authentication token
      await this.validateAuthentication();

      // Create WebSocket connection with authentication
      await this.createWebSocketConnection();

      // Set up WebSocket event handlers
      this.setupWebSocketEventHandlers();

      // Start heartbeat to maintain connection
      this.startHeartbeat();

      this.emit('connected');
      await this.logAuditEvent(AuditAction.USER_JOINED, {
        sessionId: this.sessionId,
      });
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket server and clean up resources
   */
  public async disconnect(): Promise<void> {
    try {
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);

      // Clear timers
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }

      // Close WebSocket connection
      if (this.websocket) {
        this.websocket.close(1000, 'Normal closure');
        this.websocket = null;
      }

      // Finalize metrics
      this.metrics.endTime = new Date();
      await this.recordMetrics();

      this.emit('disconnected');
      await this.logAuditEvent(AuditAction.USER_LEFT, {
        sessionId: this.sessionId,
      });
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Set up callback for sync status changes
   */
  public onSync(callback: (isSynced: boolean) => void): void {
    this.on('sync', callback);
  }

  /**
   * Set up callback for connection status changes
   */
  public onStatus(callback: (status: ConnectionStatus) => void): void {
    this.on('status', callback);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Force synchronization with server
   */
  public async forcSync(): Promise<SyncResult> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new CollaborationError('Cannot sync: not connected', {
        code: CollaborationErrorCode.CONNECTION_FAILED,
        documentId: this.sessionId,
      });
    }

    const syncRequest: SyncRequest = {
      documentId: this.sessionId,
      clientVector: this.getStateVector(),
    };

    return new Promise((resolve, reject) => {
      const message: WebSocketMessage = {
        type: WebSocketMessageType.SYNC_REQUEST,
        payload: syncRequest,
        documentId: this.sessionId,
        userId: this.options.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      };

      this.sendMessage(message);

      // Wait for sync response
      const timeout = setTimeout(() => {
        reject(
          new CollaborationError('Sync timeout', {
            code: CollaborationErrorCode.SYNC_FAILED,
            documentId: this.sessionId,
          }),
        );
      }, 10000);

      this.once('syncComplete', (result: SyncResult) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  /**
   * Validate user authentication and document permissions
   */
  private async validateAuthentication(): Promise<void> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabaseClient.auth.getUser(this.options.authToken);

      if (error || !user || user.id !== this.options.userId) {
        throw new CollaborationError('Authentication failed', {
          code: CollaborationErrorCode.AUTHENTICATION_FAILED,
          documentId: this.sessionId,
        });
      }

      // Validate document permissions
      const { data: permissions, error: permError } = await this.supabaseClient
        .from('document_permissions')
        .select('*')
        .eq('document_id', this.sessionId)
        .eq('user_id', this.options.userId)
        .single();

      if (permError || !permissions) {
        throw new CollaborationError('Unauthorized document access', {
          code: CollaborationErrorCode.UNAUTHORIZED_DOCUMENT,
          documentId: this.sessionId,
        });
      }

      // Update options with actual permissions
      this.options.permissions = permissions;
    } catch (error) {
      throw error instanceof CollaborationError
        ? error
        : new CollaborationError('Authentication validation failed', {
            code: CollaborationErrorCode.AUTHENTICATION_FAILED,
            context: error,
          });
    }
  }

  /**
   * Create WebSocket connection with authentication
   */
  private async createWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.websocketUrl}?token=${this.options.authToken}&documentId=${this.sessionId}&userId=${this.options.userId}`;

      this.websocket = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.options.authToken}`,
          'User-Agent': 'WedSync-YJS-Provider/1.0',
        },
      });

      this.websocket.onopen = () => {
        this.setConnectionStatus(ConnectionStatus.CONNECTED);
        this.retryCount = 0;
        resolve();
      };

      this.websocket.onerror = (error) => {
        reject(
          new CollaborationError('WebSocket connection failed', {
            code: CollaborationErrorCode.CONNECTION_FAILED,
            context: error,
          }),
        );
      };
    });
  }

  /**
   * Set up WebSocket event handlers for Y.js synchronization
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data.toString());
        this.handleIncomingMessage(message);
        this.metrics.bandwidth.received += event.data.toString().length;
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.metrics.errorCount++;
      }
    };

    this.websocket.onclose = (event) => {
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);

      if (event.code !== 1000) {
        // Not normal closure
        this.scheduleReconnect();
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.metrics.errorCount++;
      this.handleConnectionError(error as Error);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleIncomingMessage(
    message: WebSocketMessage,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      switch (message.type) {
        case WebSocketMessageType.SYNC_RESPONSE:
          await this.handleSyncResponse(message.payload as SyncResponse);
          break;

        case WebSocketMessageType.OPERATION:
          await this.handleIncomingOperation(message.payload);
          break;

        case WebSocketMessageType.AWARENESS:
          this.handleAwarenessUpdate(message.payload);
          break;

        case WebSocketMessageType.USER_JOIN:
          this.emit('userJoined', message.payload);
          break;

        case WebSocketMessageType.USER_LEAVE:
          this.emit('userLeft', message.payload);
          break;

        case WebSocketMessageType.ERROR:
          this.handleServerError(message.payload);
          break;

        case WebSocketMessageType.HEARTBEAT:
          // Respond to heartbeat
          this.sendMessage({
            ...message,
            type: WebSocketMessageType.HEARTBEAT,
            payload: { response: true },
          });
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }

      // Record sync latency
      const latency = Date.now() - startTime;
      this.metrics.syncLatency.push(latency);
    } catch (error) {
      console.error('Error handling message:', error);
      this.metrics.errorCount++;
    }
  }

  /**
   * Handle sync response from server
   */
  private async handleSyncResponse(response: SyncResponse): Promise<void> {
    try {
      // Apply operations from server
      const conflicts: any[] = [];

      for (const operation of response.operations) {
        try {
          // Convert operation to Y.js update
          const update = this.operationToYjsUpdate(operation);
          Y.applyUpdate(this.yjsDocument, update);
          this.metrics.operationCount++;
        } catch (error) {
          conflicts.push({
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.metrics.conflictCount++;
        }
      }

      // Update sync status
      this.setSyncStatus(
        response.missingOperations ? SyncStatus.OUT_OF_SYNC : SyncStatus.SYNCED,
      );

      const syncResult: SyncResult = {
        success: conflicts.length === 0,
        documentId: response.documentId,
        operationsApplied: response.operations.length - conflicts.length,
        conflicts,
        timestamp: new Date(),
        clientVector: this.getStateVector(),
        serverVector: response.serverVector,
      };

      this.emit('syncComplete', syncResult);
      await this.logAuditEvent(AuditAction.SYNC_COMPLETED, syncResult);
    } catch (error) {
      console.error('Error handling sync response:', error);
      this.setSyncStatus(SyncStatus.ERROR);
    }
  }

  /**
   * Handle incoming Y.js operation
   */
  private async handleIncomingOperation(operation: any): Promise<void> {
    try {
      const update = this.operationToYjsUpdate(operation);
      Y.applyUpdate(this.yjsDocument, update);

      this.metrics.operationCount++;
      this.emit('operationReceived', operation);
    } catch (error) {
      console.error('Error applying operation:', error);
      this.metrics.errorCount++;
    }
  }

  /**
   * Set up Y.js document event listeners
   */
  private setupYjsEventListeners(): void {
    // Listen for document updates
    this.yjsDocument.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    });

    // Listen for subdocument updates
    this.yjsDocument.on('subdocs', (subdocs: Set<Y.Doc>) => {
      subdocs.forEach((subdoc) => {
        subdoc.on('update', (update: Uint8Array) => {
          this.broadcastUpdate(update, subdoc.guid);
        });
      });
    });
  }

  /**
   * Set up awareness for real-time presence tracking
   */
  private setupAwareness(): void {
    this.awareness.set('user', {
      id: this.options.userId,
      name: 'User', // Should be fetched from user profile
      color: this.generateUserColor(),
      cursor: null,
    });

    // Broadcast awareness changes
    this.awareness.on('update', () => {
      if (this.connectionStatus === ConnectionStatus.CONNECTED) {
        this.sendMessage({
          type: WebSocketMessageType.AWARENESS,
          payload: {
            awareness: this.awareness.toJSON(),
          },
          documentId: this.sessionId,
          userId: this.options.userId,
          timestamp: new Date(),
          messageId: crypto.randomUUID(),
        });
      }
    });
  }

  /**
   * Broadcast Y.js update to connected clients
   */
  private broadcastUpdate(update: Uint8Array, subdocGuid?: string): void {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      // Queue message for later
      this.messageQueue.push({
        type: WebSocketMessageType.OPERATION,
        payload: {
          update: Array.from(update),
          subdocGuid,
        },
        documentId: this.sessionId,
        userId: this.options.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      });
      return;
    }

    this.sendMessage({
      type: WebSocketMessageType.OPERATION,
      payload: {
        update: Array.from(update),
        subdocGuid,
      },
      documentId: this.sessionId,
      userId: this.options.userId,
      timestamp: new Date(),
      messageId: crypto.randomUUID(),
    });
  }

  /**
   * Send message through WebSocket
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.websocket.send(messageStr);
      this.metrics.bandwidth.sent += messageStr.length;
    } catch (error) {
      console.error('Error sending message:', error);
      this.metrics.errorCount++;
      this.messageQueue.push(message);
    }
  }

  /**
   * Process queued messages after connection recovery
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Set connection status and emit event
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.emit('status', status);
  }

  /**
   * Set sync status and emit event
   */
  private setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    this.emit('sync', status === SyncStatus.SYNCED);
  }

  /**
   * Handle connection errors and attempt recovery
   */
  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    this.setConnectionStatus(ConnectionStatus.FAILED);
    this.metrics.errorCount++;

    this.emit('error', error);
    this.scheduleReconnect();
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.retry.maxAttempts) {
      this.emit('maxRetriesExceeded');
      return;
    }

    const backoffMs = Math.min(
      this.options.retry.backoffMs * Math.pow(2, this.retryCount),
      this.options.retry.maxBackoffMs,
    );

    this.retryTimer = setTimeout(async () => {
      this.retryCount++;
      this.setConnectionStatus(ConnectionStatus.RECONNECTING);

      try {
        await this.connect();
        this.processMessageQueue();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, backoffMs);
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionStatus === ConnectionStatus.CONNECTED) {
        this.sendMessage({
          type: WebSocketMessageType.HEARTBEAT,
          payload: { timestamp: Date.now() },
          documentId: this.sessionId,
          userId: this.options.userId,
          timestamp: new Date(),
          messageId: crypto.randomUUID(),
        });
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Get current state vector from Y.js document
   */
  private getStateVector(): StateVector {
    return Y.encodeStateVector(this.yjsDocument) as any;
  }

  /**
   * Convert operation to Y.js update format
   */
  private operationToYjsUpdate(operation: any): Uint8Array {
    // This would need to implement the conversion logic
    // from the operation format to Y.js update format
    return new Uint8Array(operation.update);
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
    ];
    const hash = this.options.userId.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Handle awareness updates from other clients
   */
  private handleAwarenessUpdate(awarenessData: any): void {
    // Update local awareness state
    for (const [userId, userState] of Object.entries(awarenessData.awareness)) {
      if (userId !== this.options.userId) {
        this.awareness.set(userId, userState);
      }
    }

    this.emit('awarenessUpdate', awarenessData);
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: any): void {
    const collaborationError = new CollaborationError(error.message, {
      code: error.code || CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
      documentId: this.sessionId,
      context: error,
    });

    this.emit('error', collaborationError);
    this.metrics.errorCount++;
  }

  /**
   * Record performance metrics
   */
  private async recordMetrics(): Promise<void> {
    try {
      await this.supabaseClient.from('collaboration_metrics').insert([
        {
          document_id: this.metrics.documentId,
          session_id: this.metrics.sessionId,
          user_id: this.metrics.userId,
          start_time: this.metrics.startTime.toISOString(),
          end_time: this.metrics.endTime?.toISOString(),
          operation_count: this.metrics.operationCount,
          conflict_count: this.metrics.conflictCount,
          avg_sync_latency:
            this.metrics.syncLatency.reduce((a, b) => a + b, 0) /
            this.metrics.syncLatency.length,
          connection_downtime: this.metrics.connectionDowntime,
          error_count: this.metrics.errorCount,
          bandwidth_sent: this.metrics.bandwidth.sent,
          bandwidth_received: this.metrics.bandwidth.received,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(
    action: AuditAction,
    details: any,
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        documentId: this.sessionId,
        userId: this.options.userId,
        action,
        details,
        timestamp: new Date(),
        organizationId: this.options.organizationId,
      };

      await this.supabaseClient.from('audit_logs').insert([
        {
          id: auditEntry.id,
          document_id: auditEntry.documentId,
          user_id: auditEntry.userId,
          action: auditEntry.action,
          details: auditEntry.details,
          timestamp: auditEntry.timestamp.toISOString(),
          organization_id: auditEntry.organizationId,
        },
      ]);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }
}
