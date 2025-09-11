import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as Y from 'yjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { YjsDocumentService } from '@/lib/services/yjs-document-service';

interface CollaborationMessage {
  type:
    | 'sync'
    | 'awareness'
    | 'cursor'
    | 'presence'
    | 'operation'
    | 'document_update';
  sessionId: string;
  userId: string;
  data: any;
  timestamp: number;
}

interface ConnectionInfo {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  documentId: string;
  joinedAt: number;
  lastActivity: number;
  isAuthenticated: boolean;
}

interface SessionInfo {
  sessionId: string;
  documentId: string;
  participants: Map<string, ConnectionInfo>;
  yjsDoc: Y.Doc | null;
  lastSync: number;
}

export class CollaborationWebSocketHandler {
  private wss: WebSocketServer;
  private supabase: SupabaseClient;
  private yjsService: YjsDocumentService;
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private sessions: Map<string, SessionInfo> = new Map();
  private rateLimitMap: Map<string, number[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private readonly MAX_MESSAGES_PER_MINUTE = 100;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

  constructor(wss: WebSocketServer, supabase: SupabaseClient) {
    this.wss = wss;
    this.supabase = supabase;
    this.yjsService = new YjsDocumentService();

    this.setupWebSocketServer();
    this.startCleanupTimer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection established');

      // Set up connection
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleDisconnection(ws, code, reason.toString());
      });

      ws.on('error', (error: Error) => {
        this.handleError(ws, error);
      });

      ws.on('pong', () => {
        this.handlePong(ws);
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (!this.connections.has(ws)) {
          ws.close(4001, 'Authentication timeout');
        }
      }, 10000); // 10 seconds to authenticate

      // Store timeout for cleanup
      (ws as any).authTimeout = timeout;

      // Send initial message
      this.sendMessage(ws, {
        type: 'sync',
        sessionId: '',
        userId: '',
        data: {
          message: 'Connected to WedSync Collaboration Server',
          serverTime: Date.now(),
          maxPayloadSize: this.MAX_PAYLOAD_SIZE,
        },
        timestamp: Date.now(),
      });
    });

    // Set up ping interval
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, this.PING_INTERVAL);

    console.log(
      `WebSocket server initialized with ${this.wss.clients.size} clients`,
    );
  }

  private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    try {
      // Check payload size
      if (data.length > this.MAX_PAYLOAD_SIZE) {
        ws.close(4013, 'Payload too large');
        return;
      }

      const rawMessage = data.toString();
      let message: CollaborationMessage;

      try {
        message = JSON.parse(rawMessage);
      } catch (error) {
        ws.close(4002, 'Invalid JSON');
        return;
      }

      // Validate message structure
      if (!this.validateMessage(message)) {
        ws.close(4003, 'Invalid message format');
        return;
      }

      // Check rate limiting
      if (!this.checkRateLimit(message.userId)) {
        ws.close(4029, 'Rate limit exceeded');
        return;
      }

      // Handle authentication for first message
      const connection = this.connections.get(ws);
      if (!connection && message.type !== 'sync') {
        ws.close(4004, 'Authentication required');
        return;
      }

      // Process message based on type
      switch (message.type) {
        case 'sync':
          await this.handleSyncMessage(ws, message);
          break;
        case 'awareness':
          await this.handleAwarenessMessage(ws, message);
          break;
        case 'cursor':
          await this.handleCursorMessage(ws, message);
          break;
        case 'presence':
          await this.handlePresenceMessage(ws, message);
          break;
        case 'operation':
          await this.handleOperationMessage(ws, message);
          break;
        case 'document_update':
          await this.handleDocumentUpdate(ws, message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }

      // Update last activity
      if (connection) {
        connection.lastActivity = Date.now();
      }
    } catch (error) {
      console.error('Message handling error:', error);
      ws.close(4005, 'Message processing error');
    }
  }

  private async handleSyncMessage(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    try {
      const { sessionId, userId } = message;

      // Authenticate user
      const isAuthenticated = await this.authenticateUser(
        userId,
        message.data.token,
      );
      if (!isAuthenticated) {
        ws.close(4006, 'Authentication failed');
        return;
      }

      // Verify session access
      const hasAccess = await this.verifySessionAccess(sessionId, userId);
      if (!hasAccess) {
        ws.close(4007, 'Session access denied');
        return;
      }

      // Get session info
      const sessionInfo = await this.getSessionInfo(sessionId);
      if (!sessionInfo) {
        ws.close(4008, 'Session not found');
        return;
      }

      // Clear auth timeout
      if ((ws as any).authTimeout) {
        clearTimeout((ws as any).authTimeout);
      }

      // Create connection info
      const connectionInfo: ConnectionInfo = {
        ws,
        userId,
        sessionId,
        documentId: sessionInfo.document_id,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isAuthenticated: true,
      };

      // Store connection
      this.connections.set(ws, connectionInfo);

      // Initialize or get session
      let session = this.sessions.get(sessionId);
      if (!session) {
        // Initialize Y.js document
        const yjsResult = await this.yjsService.initializeDocument(
          sessionInfo.document_id,
          userId,
        );
        const yjsDoc = yjsResult.success
          ? this.yjsService.getDocument(sessionInfo.document_id)
          : null;

        session = {
          sessionId,
          documentId: sessionInfo.document_id,
          participants: new Map(),
          yjsDoc,
          lastSync: Date.now(),
        };
        this.sessions.set(sessionId, session);
      }

      // Add participant to session
      session.participants.set(userId, connectionInfo);

      // Send initial document state
      if (session.yjsDoc) {
        const docState = Y.encodeStateAsUpdate(session.yjsDoc);
        this.sendMessage(ws, {
          type: 'sync',
          sessionId,
          userId: 'system',
          data: {
            action: 'document_state',
            state: Array.from(docState),
            participants: Array.from(session.participants.keys()),
          },
          timestamp: Date.now(),
        });
      }

      // Broadcast user joined
      this.broadcastToSession(
        sessionId,
        {
          type: 'presence',
          sessionId,
          userId: 'system',
          data: {
            action: 'user_joined',
            user: { userId, joinedAt: Date.now() },
            participantCount: session.participants.size,
          },
          timestamp: Date.now(),
        },
        userId,
      );

      console.log(`User ${userId} joined session ${sessionId}`);
    } catch (error) {
      console.error('Sync message handling error:', error);
      ws.close(4009, 'Sync failed');
    }
  }

  private async handleAwarenessMessage(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session?.yjsDoc) return;

    try {
      // Apply awareness update to Y.js document
      const awarenessData = message.data;

      // Broadcast awareness to other participants
      this.broadcastToSession(
        connection.sessionId,
        {
          type: 'awareness',
          sessionId: connection.sessionId,
          userId: connection.userId,
          data: awarenessData,
          timestamp: Date.now(),
        },
        connection.userId,
      );
    } catch (error) {
      console.error('Awareness message handling error:', error);
    }
  }

  private async handleCursorMessage(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    try {
      // Broadcast cursor position to other participants
      this.broadcastToSession(
        connection.sessionId,
        {
          type: 'cursor',
          sessionId: connection.sessionId,
          userId: connection.userId,
          data: {
            position: message.data.position,
            selection: message.data.selection,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        },
        connection.userId,
      );
    } catch (error) {
      console.error('Cursor message handling error:', error);
    }
  }

  private async handlePresenceMessage(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    try {
      // Update presence in database
      await this.supabase.from('collaboration_presence').upsert({
        document_id: connection.documentId,
        user_id: connection.userId,
        status: message.data.status || 'active',
        is_typing: message.data.isTyping || false,
        cursor_position: message.data.cursorPosition || 0,
        last_seen: new Date().toISOString(),
      });

      // Broadcast presence update
      this.broadcastToSession(
        connection.sessionId,
        {
          type: 'presence',
          sessionId: connection.sessionId,
          userId: connection.userId,
          data: message.data,
          timestamp: Date.now(),
        },
        connection.userId,
      );
    } catch (error) {
      console.error('Presence message handling error:', error);
    }
  }

  private async handleOperationMessage(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session?.yjsDoc) return;

    try {
      // Apply Y.js operation
      const operation = message.data;
      if (operation.update && Array.isArray(operation.update)) {
        const updateArray = new Uint8Array(operation.update);
        Y.applyUpdate(session.yjsDoc, updateArray);
      }

      // Log operation
      await this.supabase.from('document_operations').insert({
        document_id: connection.documentId,
        user_id: connection.userId,
        operation_type: 'yjs_operation',
        operation_data: operation,
        timestamp: new Date().toISOString(),
      });

      // Broadcast operation to other participants
      this.broadcastToSession(
        connection.sessionId,
        {
          type: 'operation',
          sessionId: connection.sessionId,
          userId: connection.userId,
          data: operation,
          timestamp: Date.now(),
        },
        connection.userId,
      );

      // Update session sync time
      session.lastSync = Date.now();
    } catch (error) {
      console.error('Operation message handling error:', error);
    }
  }

  private async handleDocumentUpdate(
    ws: WebSocket,
    message: CollaborationMessage,
  ): Promise<void> {
    const connection = this.connections.get(ws);
    if (!connection) return;

    try {
      // Update document via Y.js service
      const updateData = message.data;

      if (updateData.text !== undefined) {
        await this.yjsService.insertText(
          connection.documentId,
          updateData.position || 0,
          updateData.text,
        );
      }

      // Broadcast document update
      this.broadcastToSession(
        connection.sessionId,
        {
          type: 'document_update',
          sessionId: connection.sessionId,
          userId: connection.userId,
          data: updateData,
          timestamp: Date.now(),
        },
        connection.userId,
      );
    } catch (error) {
      console.error('Document update handling error:', error);
    }
  }

  private handleDisconnection(
    ws: WebSocket,
    code: number,
    reason: string,
  ): void {
    const connection = this.connections.get(ws);
    if (!connection) return;

    console.log(
      `User ${connection.userId} disconnected from session ${connection.sessionId}. Code: ${code}, Reason: ${reason}`,
    );

    // Remove from session
    const session = this.sessions.get(connection.sessionId);
    if (session) {
      session.participants.delete(connection.userId);

      // Broadcast user left
      this.broadcastToSession(connection.sessionId, {
        type: 'presence',
        sessionId: connection.sessionId,
        userId: 'system',
        data: {
          action: 'user_left',
          user: { userId: connection.userId },
          participantCount: session.participants.size,
        },
        timestamp: Date.now(),
      });

      // Clean up empty session
      if (session.participants.size === 0) {
        this.sessions.delete(connection.sessionId);
        if (session.yjsDoc) {
          this.yjsService.destroyDocument(connection.documentId);
        }
      }
    }

    // Update presence in database
    this.supabase
      .from('collaboration_presence')
      .update({
        status: 'away',
        is_typing: false,
        last_seen: new Date().toISOString(),
      })
      .eq('document_id', connection.documentId)
      .eq('user_id', connection.userId)
      .then(() => {
        console.log(
          `Updated presence for disconnected user ${connection.userId}`,
        );
      })
      .catch((error) => {
        console.error('Failed to update presence on disconnect:', error);
      });

    // Remove connection
    this.connections.delete(ws);
  }

  private handleError(ws: WebSocket, error: Error): void {
    console.error('WebSocket error:', error);

    const connection = this.connections.get(ws);
    if (connection) {
      console.error(
        `Error for user ${connection.userId} in session ${connection.sessionId}:`,
        error,
      );
    }

    // Close connection on error
    ws.close(4010, 'Internal error');
  }

  private handlePong(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  private sendMessage(ws: WebSocket, message: CollaborationMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Send message error:', error);
      }
    }
  }

  public async broadcastToSession(
    sessionId: string,
    message: CollaborationMessage,
    excludeUserId?: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const broadcastPromises: Promise<void>[] = [];

    session.participants.forEach((connection, userId) => {
      if (excludeUserId && userId === excludeUserId) return;

      if (connection.ws.readyState === WebSocket.OPEN) {
        broadcastPromises.push(
          new Promise<void>((resolve) => {
            connection.ws.send(JSON.stringify(message), (error) => {
              if (error) {
                console.error(`Broadcast error to user ${userId}:`, error);
              }
              resolve();
            });
          }),
        );
      }
    });

    await Promise.allSettled(broadcastPromises);
  }

  public getSessionParticipants(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session.participants.keys()) : [];
  }

  public async disconnectUser(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const connection = session.participants.get(userId);
    if (!connection) return false;

    connection.ws.close(4011, 'Disconnected by admin');
    return true;
  }

  public async getDocumentState(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session?.yjsDoc) return null;

    const state = Y.encodeStateAsUpdate(session.yjsDoc);
    return {
      sessionId,
      documentId: session.documentId,
      state: Array.from(state),
      participantCount: session.participants.size,
      lastSync: session.lastSync,
    };
  }

  public async forceSyncSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session?.yjsDoc) return false;

    try {
      // Force sync to database
      await this.yjsService.syncToDatabase(session.documentId);

      // Broadcast sync message
      await this.broadcastToSession(sessionId, {
        type: 'sync',
        sessionId,
        userId: 'system',
        data: { action: 'force_sync', timestamp: Date.now() },
        timestamp: Date.now(),
      });

      session.lastSync = Date.now();
      return true;
    } catch (error) {
      console.error('Force sync error:', error);
      return false;
    }
  }

  public updateConfiguration(config: any): void {
    // Update configuration dynamically
    if (config.maxConnections) {
      this.wss.options.maxConnections = config.maxConnections;
    }

    console.log('Configuration updated:', config);
  }

  public getConfiguration(): any {
    return {
      maxConnections: this.wss.options.maxConnections,
      currentConnections: this.connections.size,
      activeSessions: this.sessions.size,
      maxPayloadSize: this.MAX_PAYLOAD_SIZE,
      pingInterval: this.PING_INTERVAL,
    };
  }

  // Private helper methods

  private validateMessage(message: any): message is CollaborationMessage {
    return (
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      typeof message.sessionId === 'string' &&
      typeof message.userId === 'string' &&
      typeof message.data === 'object' &&
      typeof message.timestamp === 'number'
    );
  }

  private async authenticateUser(
    userId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      return !error && data.user?.id === userId;
    } catch {
      return false;
    }
  }

  private async verifySessionAccess(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc('user_has_session_permission', {
        session_uuid: sessionId,
        user_uuid: userId,
        required_permission: 'read',
      });

      return data === true;
    } catch {
      return false;
    }
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('collaboration_sessions')
        .select('id, document_id, document_type, status')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      return error ? null : data;
    } catch {
      return null;
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    if (!this.rateLimitMap.has(userId)) {
      this.rateLimitMap.set(userId, []);
    }

    const timestamps = this.rateLimitMap.get(userId)!;

    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
      timestamps.shift();
    }

    // Check if under limit
    if (timestamps.length >= this.MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    return true;
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
      this.cleanupRateLimit();
    }, 60000); // Every minute
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = this.CONNECTION_TIMEOUT;

    this.connections.forEach((connection, ws) => {
      if (now - connection.lastActivity > timeout) {
        console.log(
          `Cleaning up inactive connection for user ${connection.userId}`,
        );
        ws.close(4012, 'Connection timeout');
      }
    });
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    const windowMs = 60 * 1000;

    this.rateLimitMap.forEach((timestamps, userId) => {
      // Remove old timestamps
      while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
        timestamps.shift();
      }

      // Remove empty entries
      if (timestamps.length === 0) {
        this.rateLimitMap.delete(userId);
      }
    });
  }

  public destroy(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(4013, 'Server shutdown');
    });

    // Clear all sessions
    this.sessions.forEach((session) => {
      if (session.yjsDoc) {
        this.yjsService.destroyDocument(session.documentId);
      }
    });

    // Clear all data
    this.connections.clear();
    this.sessions.clear();
    this.rateLimitMap.clear();

    // Destroy Y.js service
    this.yjsService.destroy();

    console.log('Collaboration WebSocket handler destroyed');
  }
}
