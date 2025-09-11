/**
 * WS-244 Real-Time Collaboration System - WebSocket Server Infrastructure
 * Team C - Y.js WebSocket Server for Real-time Sync
 *
 * Scalable WebSocket server infrastructure for real-time collaborative editing
 * with Y.js document synchronization, authentication, and horizontal scaling.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as Y from 'yjs';
import { URL } from 'url';
import { EventEmitter } from 'events';
import {
  WebSocketMessage,
  WebSocketMessageType,
  SyncRequest,
  SyncResponse,
  ConnectionStatus,
  Operation,
  DocumentPermissions,
  CollaborationError,
  CollaborationErrorCode,
  AuditAction,
  CollaboratorInfo,
  StateVector,
} from '../../types/collaboration';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentSynchronizationService } from '../integrations/document-sync-service';
import { OperationalTransformEngine } from '../integrations/operational-transform-engine';

/**
 * Connected client information
 */
interface ConnectedClient {
  id: string;
  websocket: WebSocket;
  userId: string;
  documentId: string;
  permissions: DocumentPermissions;
  lastActivity: Date;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Document room for collaboration
 */
interface DocumentRoom {
  documentId: string;
  document: Y.Doc;
  clients: Map<string, ConnectedClient>;
  lastActivity: Date;
  version: number;
  operationCount: number;
  conflictCount: number;
}

/**
 * Server configuration
 */
interface ServerConfig {
  port: number;
  maxConnections: number;
  heartbeatInterval: number;
  clientTimeout: number;
  rateLimitPerMinute: number;
  enableCompression: boolean;
  enableClustering: boolean;
  redisUrl?: string;
}

/**
 * Y.js WebSocket Server for real-time collaboration
 */
export class YjsWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private supabaseClient: SupabaseClient;
  private syncService: DocumentSynchronizationService;
  private otEngine: OperationalTransformEngine;

  private rooms: Map<string, DocumentRoom> = new Map();
  private clients: Map<string, ConnectedClient> = new Map();
  private rateLimits: Map<string, number[]> = new Map();

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly config: ServerConfig = {
    port: 8080,
    maxConnections: 1000,
    heartbeatInterval: 30000, // 30 seconds
    clientTimeout: 60000, // 1 minute
    rateLimitPerMinute: 100,
    enableCompression: true,
    enableClustering: false,
  };

  constructor(config?: Partial<ServerConfig>) {
    super();

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.syncService = new DocumentSynchronizationService();
    this.otEngine = new OperationalTransformEngine();
  }

  /**
   * Start WebSocket server
   */
  public async start(): Promise<void> {
    try {
      this.wss = new WebSocketServer({
        port: this.config.port,
        perMessageDeflate: this.config.enableCompression,
        maxPayload: 16 * 1024 * 1024, // 16MB
        clientTracking: true,
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', this.handleServerError.bind(this));

      // Start periodic tasks
      this.startHeartbeat();
      this.startCleanup();

      console.log(`Y.js WebSocket server started on port ${this.config.port}`);
      this.emit('serverStarted', { port: this.config.port });
    } catch (error) {
      throw new CollaborationError('Failed to start WebSocket server', {
        code: CollaborationErrorCode.CONNECTION_FAILED,
        context: error,
      });
    }
  }

  /**
   * Stop WebSocket server
   */
  public async stop(): Promise<void> {
    try {
      // Clear timers
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }

      // Close all client connections - use forEach for downlevelIteration compatibility
      this.clients.forEach((client) => {
        client.websocket.terminate();
      });

      // Close server
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      // Clear collections
      this.rooms.clear();
      this.clients.clear();
      this.rateLimits.clear();

      console.log('Y.js WebSocket server stopped');
      this.emit('serverStopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(
    ws: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    try {
      // Parse connection parameters
      const url = new URL(request.url || '/', 'http://localhost');
      const token = url.searchParams.get('token');
      const documentId = url.searchParams.get('documentId');
      const userId = url.searchParams.get('userId');

      if (!token || !documentId || !userId) {
        ws.close(1008, 'Missing required parameters');
        return;
      }

      // Check connection limits
      if (this.clients.size >= this.config.maxConnections) {
        ws.close(1013, 'Server at capacity');
        return;
      }

      // Authenticate user
      const authentication = await this.authenticateUser(
        token,
        userId,
        documentId,
      );
      if (!authentication.valid) {
        ws.close(1008, 'Authentication failed');
        return;
      }

      // Check rate limits
      const clientIP = request.socket.remoteAddress || 'unknown';
      if (!this.checkRateLimit(clientIP)) {
        ws.close(1013, 'Rate limit exceeded');
        return;
      }

      // Create client record
      const clientId = crypto.randomUUID();
      const client: ConnectedClient = {
        id: clientId,
        websocket: ws,
        userId,
        documentId,
        permissions: authentication.permissions,
        lastActivity: new Date(),
        sessionId: crypto.randomUUID(),
        ipAddress: clientIP,
        userAgent: request.headers['user-agent'] || 'unknown',
      };

      // Add client to collections
      this.clients.set(clientId, client);

      // Join or create document room
      await this.joinDocumentRoom(client);

      // Set up WebSocket event handlers
      this.setupClientEventHandlers(client);

      // Send initial sync
      await this.sendInitialSync(client);

      // Log connection
      await this.logAuditEvent(client, AuditAction.USER_JOINED, {
        sessionId: client.sessionId,
        ipAddress: client.ipAddress,
      });

      console.log(`Client ${clientId} connected to document ${documentId}`);
    } catch (error) {
      console.error('Error handling connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Set up client WebSocket event handlers
   */
  private setupClientEventHandlers(client: ConnectedClient): void {
    client.websocket.on('message', (data) => {
      this.handleClientMessage(client, data);
    });

    client.websocket.on('close', (code, reason) => {
      this.handleClientDisconnect(client, code, reason.toString());
    });

    client.websocket.on('error', (error) => {
      console.error(`WebSocket error for client ${client.id}:`, error);
    });

    client.websocket.on('pong', () => {
      client.lastActivity = new Date();
    });
  }

  /**
   * Handle client message
   */
  private async handleClientMessage(
    client: ConnectedClient,
    data: Buffer,
  ): Promise<void> {
    try {
      client.lastActivity = new Date();

      const message: WebSocketMessage = JSON.parse(data.toString());

      // Validate message
      if (!this.validateMessage(message, client)) {
        return;
      }

      switch (message.type) {
        case WebSocketMessageType.SYNC_REQUEST:
          await this.handleSyncRequest(client, message.payload as SyncRequest);
          break;

        case WebSocketMessageType.OPERATION:
          await this.handleOperation(client, message.payload as Operation);
          break;

        case WebSocketMessageType.AWARENESS:
          await this.handleAwarenessUpdate(client, message.payload);
          break;

        case WebSocketMessageType.CURSOR_UPDATE:
          await this.handleCursorUpdate(client, message.payload);
          break;

        case WebSocketMessageType.HEARTBEAT:
          this.handleHeartbeat(client, message);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from client ${client.id}:`, error);
      this.sendError(client, 'Message processing failed', error);
    }
  }

  /**
   * Handle sync request from client
   */
  private async handleSyncRequest(
    client: ConnectedClient,
    request: SyncRequest,
  ): Promise<void> {
    try {
      const room = this.rooms.get(client.documentId);
      if (!room) {
        throw new Error(`Document room not found: ${client.documentId}`);
      }

      // Get missing operations for client
      const serverVector = this.getDocumentStateVector(room.document);
      const missingOps = await this.getMissingOperations(
        client.documentId,
        request.clientVector,
        serverVector,
      );

      const response: SyncResponse = {
        documentId: client.documentId,
        serverVector,
        operations: missingOps,
        missingOperations: missingOps.length > 0,
      };

      this.sendMessage(client, {
        type: WebSocketMessageType.SYNC_RESPONSE,
        payload: response,
        documentId: client.documentId,
        userId: client.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      });
    } catch (error) {
      console.error('Error handling sync request:', error);
      this.sendError(client, 'Sync request failed', error);
    }
  }

  /**
   * Handle operation from client
   */
  private async handleOperation(
    client: ConnectedClient,
    operation: Operation,
  ): Promise<void> {
    try {
      if (!client.permissions.write) {
        throw new CollaborationError('No write permissions', {
          code: CollaborationErrorCode.UNAUTHORIZED_DOCUMENT,
          userId: client.userId,
          documentId: client.documentId,
        });
      }

      const room = this.rooms.get(client.documentId);
      if (!room) {
        throw new Error(`Document room not found: ${client.documentId}`);
      }

      // Apply operational transform
      const existingOps = this.otEngine.getOperationHistory(client.documentId);
      const transformedOp = await this.otEngine.transformOperation(
        operation,
        existingOps,
        room.document,
      );

      // Apply to document
      await this.applyOperationToDocument(transformedOp, room.document);

      // Update room stats
      room.operationCount++;
      room.lastActivity = new Date();

      // Broadcast to other clients in room
      this.broadcastToRoom(
        client.documentId,
        {
          type: WebSocketMessageType.OPERATION,
          payload: transformedOp,
          documentId: client.documentId,
          userId: client.userId,
          timestamp: new Date(),
          messageId: crypto.randomUUID(),
        },
        client.id,
      );

      // Persist operation
      await this.syncService.syncDocument(
        client.documentId,
        [transformedOp],
        this.getDocumentStateVector(room.document),
        client.userId,
      );

      // Log operation
      await this.logAuditEvent(client, AuditAction.OPERATION_APPLIED, {
        operationId: operation.id,
        operationType: operation.type,
      });
    } catch (error) {
      console.error('Error handling operation:', error);
      this.sendError(client, 'Operation failed', error);

      const room = this.rooms.get(client.documentId);
      if (room) {
        room.conflictCount++;
      }
    }
  }

  /**
   * Handle awareness update from client
   */
  private async handleAwarenessUpdate(
    client: ConnectedClient,
    awarenessData: any,
  ): Promise<void> {
    // Broadcast awareness to other clients in room
    this.broadcastToRoom(
      client.documentId,
      {
        type: WebSocketMessageType.AWARENESS,
        payload: awarenessData,
        documentId: client.documentId,
        userId: client.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      },
      client.id,
    );
  }

  /**
   * Handle cursor update from client
   */
  private async handleCursorUpdate(
    client: ConnectedClient,
    cursorData: any,
  ): Promise<void> {
    // Broadcast cursor update to other clients in room
    this.broadcastToRoom(
      client.documentId,
      {
        type: WebSocketMessageType.CURSOR_UPDATE,
        payload: {
          userId: client.userId,
          cursor: cursorData,
        },
        documentId: client.documentId,
        userId: client.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      },
      client.id,
    );
  }

  /**
   * Handle heartbeat from client
   */
  private handleHeartbeat(
    client: ConnectedClient,
    message: WebSocketMessage,
  ): void {
    // Respond to heartbeat
    this.sendMessage(client, {
      ...message,
      payload: { response: true, timestamp: Date.now() },
    });
  }

  /**
   * Handle client disconnect
   */
  private async handleClientDisconnect(
    client: ConnectedClient,
    code: number,
    reason: string,
  ): Promise<void> {
    try {
      // Remove from collections
      this.clients.delete(client.id);

      // Leave document room
      await this.leaveDocumentRoom(client);

      // Log disconnection
      await this.logAuditEvent(client, AuditAction.USER_LEFT, {
        sessionId: client.sessionId,
        disconnectCode: code,
        disconnectReason: reason,
      });

      console.log(
        `Client ${client.id} disconnected from document ${client.documentId}`,
      );
    } catch (error) {
      console.error('Error handling client disconnect:', error);
    }
  }

  /**
   * Join or create document room
   */
  private async joinDocumentRoom(client: ConnectedClient): Promise<void> {
    try {
      let room = this.rooms.get(client.documentId);

      if (!room) {
        // Create new room
        const document = await this.syncService.loadDocument(client.documentId);

        room = {
          documentId: client.documentId,
          document,
          clients: new Map(),
          lastActivity: new Date(),
          version: 1,
          operationCount: 0,
          conflictCount: 0,
        };

        this.rooms.set(client.documentId, room);
      }

      // Add client to room
      room.clients.set(client.id, client);
      room.lastActivity = new Date();

      // Notify other clients in room
      this.broadcastToRoom(
        client.documentId,
        {
          type: WebSocketMessageType.USER_JOIN,
          payload: {
            userId: client.userId,
            sessionId: client.sessionId,
          },
          documentId: client.documentId,
          userId: client.userId,
          timestamp: new Date(),
          messageId: crypto.randomUUID(),
        },
        client.id,
      );
    } catch (error) {
      throw new CollaborationError('Failed to join document room', {
        code: CollaborationErrorCode.DOCUMENT_NOT_FOUND,
        documentId: client.documentId,
        context: error,
      });
    }
  }

  /**
   * Leave document room
   */
  private async leaveDocumentRoom(client: ConnectedClient): Promise<void> {
    const room = this.rooms.get(client.documentId);
    if (!room) return;

    // Remove client from room
    room.clients.delete(client.id);

    // Notify other clients in room
    this.broadcastToRoom(
      client.documentId,
      {
        type: WebSocketMessageType.USER_LEAVE,
        payload: {
          userId: client.userId,
          sessionId: client.sessionId,
        },
        documentId: client.documentId,
        userId: client.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      },
      client.id,
    );

    // Clean up empty rooms
    if (room.clients.size === 0) {
      this.rooms.delete(client.documentId);
      console.log(`Cleaned up empty room for document ${client.documentId}`);
    }
  }

  /**
   * Send initial sync to client
   */
  private async sendInitialSync(client: ConnectedClient): Promise<void> {
    try {
      const room = this.rooms.get(client.documentId);
      if (!room) return;

      const serverVector = this.getDocumentStateVector(room.document);
      const documentState = Y.encodeStateAsUpdate(room.document);

      const response: SyncResponse = {
        documentId: client.documentId,
        serverVector,
        operations: [],
        snapshot: {
          id: crypto.randomUUID(),
          documentId: client.documentId,
          version: room.version,
          stateVector: serverVector,
          content: documentState,
          metadata:
            (await this.syncService.getDocumentMetadata(client.documentId)) ||
            ({} as any),
          createdAt: new Date(),
          createdBy: 'system',
          size: documentState.length,
        },
        missingOperations: false,
      };

      this.sendMessage(client, {
        type: WebSocketMessageType.SYNC_RESPONSE,
        payload: response,
        documentId: client.documentId,
        userId: client.userId,
        timestamp: new Date(),
        messageId: crypto.randomUUID(),
      });
    } catch (error) {
      console.error('Error sending initial sync:', error);
      this.sendError(client, 'Initial sync failed', error);
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  private broadcastToRoom(
    documentId: string,
    message: WebSocketMessage,
    excludeClientId?: string,
  ): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    for (const [clientId, client] of room.clients) {
      if (
        clientId !== excludeClientId &&
        client.websocket.readyState === WebSocket.OPEN
      ) {
        this.sendMessage(client, message);
      }
    }
  }

  /**
   * Send message to client
   */
  private sendMessage(
    client: ConnectedClient,
    message: WebSocketMessage,
  ): void {
    try {
      if (client.websocket.readyState === WebSocket.OPEN) {
        const messageStr = JSON.stringify(message);
        client.websocket.send(messageStr);
      }
    } catch (error) {
      console.error(`Error sending message to client ${client.id}:`, error);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(
    client: ConnectedClient,
    errorMessage: string,
    error?: any,
  ): void {
    this.sendMessage(client, {
      type: WebSocketMessageType.ERROR,
      payload: {
        message: errorMessage,
        code: error?.code || 'UNKNOWN_ERROR',
        timestamp: new Date(),
      },
      documentId: client.documentId,
      userId: client.userId,
      timestamp: new Date(),
      messageId: crypto.randomUUID(),
    });
  }

  /**
   * Authenticate user and get permissions
   */
  private async authenticateUser(
    token: string,
    userId: string,
    documentId: string,
  ): Promise<{ valid: boolean; permissions: DocumentPermissions }> {
    try {
      // Verify JWT token with Supabase
      const {
        data: { user },
        error,
      } = await this.supabaseClient.auth.getUser(token);

      if (error || !user || user.id !== userId) {
        return { valid: false, permissions: {} as DocumentPermissions };
      }

      // Get document permissions
      const { data: permissions, error: permError } = await this.supabaseClient
        .from('document_collaborators')
        .select('permissions')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .single();

      if (permError || !permissions) {
        return { valid: false, permissions: {} as DocumentPermissions };
      }

      return { valid: true, permissions: permissions.permissions };
    } catch (error) {
      console.error('Authentication error:', error);
      return { valid: false, permissions: {} as DocumentPermissions };
    }
  }

  /**
   * Check rate limits for client
   */
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const requests = this.rateLimits.get(clientIP) || [];

    // Remove requests older than 1 minute
    const recentRequests = requests.filter((time) => now - time < 60000);

    if (recentRequests.length >= this.config.rateLimitPerMinute) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimits.set(clientIP, recentRequests);

    return true;
  }

  /**
   * Validate incoming message
   */
  private validateMessage(
    message: WebSocketMessage,
    client: ConnectedClient,
  ): boolean {
    if (!message.type || !message.documentId || !message.userId) {
      this.sendError(client, 'Invalid message format');
      return false;
    }

    if (
      message.documentId !== client.documentId ||
      message.userId !== client.userId
    ) {
      this.sendError(client, 'Message validation failed');
      return false;
    }

    return true;
  }

  /**
   * Apply operation to Y.js document
   */
  private async applyOperationToDocument(
    operation: Operation,
    document: Y.Doc,
  ): Promise<void> {
    const text = document.getText('content');

    switch (operation.type) {
      case 'insert':
        text.insert(
          operation.position,
          operation.content,
          operation.attributes,
        );
        break;

      case 'delete':
        text.delete(operation.position, operation.length);
        break;

      case 'format':
        if (operation.attributes) {
          text.format(
            operation.position,
            operation.length,
            operation.attributes,
          );
        }
        break;

      case 'embed':
        text.insertEmbed(
          operation.position,
          operation.content,
          operation.attributes,
        );
        break;
    }
  }

  /**
   * Get document state vector
   */
  private getDocumentStateVector(document: Y.Doc): StateVector {
    // This would extract the actual state vector from Y.js
    const sv = Y.encodeStateVector(document);
    // Convert to object format
    return {}; // Simplified placeholder
  }

  /**
   * Get missing operations for sync
   */
  private async getMissingOperations(
    documentId: string,
    clientVector: StateVector,
    serverVector: StateVector,
  ): Promise<Operation[]> {
    // This would implement the logic to find missing operations
    return []; // Placeholder
  }

  /**
   * Start periodic heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();

      for (const [clientId, client] of this.clients) {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();

        if (timeSinceActivity > this.config.clientTimeout) {
          // Client timed out
          client.websocket.terminate();
          this.clients.delete(clientId);
        } else if (client.websocket.readyState === WebSocket.OPEN) {
          // Send ping
          client.websocket.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // Clean up old rate limit entries
      const cutoff = Date.now() - 300000; // 5 minutes

      for (const [ip, requests] of this.rateLimits) {
        const recent = requests.filter((time) => time > cutoff);
        if (recent.length === 0) {
          this.rateLimits.delete(ip);
        } else {
          this.rateLimits.set(ip, recent);
        }
      }

      // Clean up inactive rooms
      for (const [documentId, room] of this.rooms) {
        const inactiveTime = Date.now() - room.lastActivity.getTime();
        if (room.clients.size === 0 && inactiveTime > 600000) {
          // 10 minutes
          this.rooms.delete(documentId);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: Error): void {
    console.error('WebSocket server error:', error);
    this.emit('error', error);
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(
    client: ConnectedClient,
    action: AuditAction,
    details: any,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('audit_logs').insert([
        {
          id: crypto.randomUUID(),
          document_id: client.documentId,
          user_id: client.userId,
          action,
          details,
          timestamp: new Date().toISOString(),
          ip_address: client.ipAddress,
          user_agent: client.userAgent,
          organization_id: 'default',
        },
      ]);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    connectedClients: number;
    activeRooms: number;
    totalOperations: number;
    totalConflicts: number;
    uptime: number;
  } {
    let totalOperations = 0;
    let totalConflicts = 0;

    // Use forEach for downlevelIteration compatibility
    this.rooms.forEach((room) => {
      totalOperations += room.operationCount;
      totalConflicts += room.conflictCount;
    });

    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalOperations,
      totalConflicts,
      uptime: process.uptime(),
    };
  }
}
