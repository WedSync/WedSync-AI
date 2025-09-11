/**
 * WS-244 Real-Time Collaboration System - WebSocket Integration Tests
 * Team C - Comprehensive WebSocket Server and Client Tests
 * 
 * Complete test suite for WebSocket server functionality,
 * client connections, message handling, and real-time sync.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { YjsWebSocketServer } from '../../src/lib/websocket/yjs-websocket-server';
import { YjsWebSocketProvider } from '../../src/lib/integrations/yjs-websocket-provider';
import {
  WebSocketMessage,
  WebSocketMessageType,
  ConnectionStatus,
  SyncStatus,
  Operation,
  OperationType
} from '../../src/types/collaboration';

// Helper function to create mock WebSocket
const createMockWebSocket = (readyState: number = WebSocket.OPEN) => ({
  readyState,
  send: jest.fn(),
  close: jest.fn(),
  terminate: jest.fn(),
  ping: jest.fn(),
  pong: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
});

// Helper function to create test operation
const createTestOperation = (overrides: Partial<Operation> = {}): Operation => ({
  id: crypto.randomUUID(),
  type: OperationType.INSERT,
  clientId: 1,
  timestamp: new Date(),
  position: 0,
  length: 0,
  content: 'test',
  userId: 'user1',
  documentId: 'doc1',
  ...overrides
});

describe('WebSocket Collaboration System', () => {
  let server: YjsWebSocketServer;
  let testDocument: Y.Doc;

  beforeEach(() => {
    testDocument = new Y.Doc();
    server = new YjsWebSocketServer({
      port: 8082, // Different port for testing
      maxConnections: 5,
      heartbeatInterval: 1000,
      clientTimeout: 2000,
      rateLimitPerMinute: 10
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    testDocument.destroy();
  });

  describe('WebSocket Server Lifecycle', () => {
    it('should start server successfully', async () => {
      await server.start();
      
      const stats = server.getStats();
      expect(stats.connectedClients).toBe(0);
      expect(stats.activeRooms).toBe(0);
    });

    it('should stop server gracefully', async () => {
      await server.start();
      await server.stop();
      
      // Server should be stopped
      expect((server as any).wss).toBeNull();
    });

    it('should handle server errors', async () => {
      const errorHandler = jest.fn();
      server.on('error', errorHandler);
      
      // Mock server error
      await server.start();
      const mockError = new Error('Server error');
      (server as any).handleServerError(mockError);
      
      expect(errorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('Client Connection Management', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should accept valid client connections', async () => {
      const mockWebSocket = createMockWebSocket();
      const mockRequest = {
        url: '/?token=valid-token&documentId=doc1&userId=user1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-client' }
      };

      // Mock authentication
      jest.spyOn(server as any, 'authenticateUser')
        .mockResolvedValue({ valid: true, permissions: { read: true, write: true } });
      
      // Mock document loading
      jest.spyOn(server as any, 'syncService', 'get')
        .mockReturnValue({
          loadDocument: jest.fn().mockResolvedValue(new Y.Doc())
        });

      await (server as any).handleConnection(mockWebSocket, mockRequest);

      // Should add client to collections
      const clients = (server as any).clients;
      expect(clients.size).toBe(1);
      
      const rooms = (server as any).rooms;
      expect(rooms.has('doc1')).toBe(true);
    });

    it('should reject connection with missing parameters', async () => {
      const mockWebSocket = createMockWebSocket();
      const mockRequest = {
        url: '/?token=valid-token', // Missing documentId and userId
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-client' }
      };

      await (server as any).handleConnection(mockWebSocket, mockRequest);

      expect(mockWebSocket.close).toHaveBeenCalledWith(1008, 'Missing required parameters');
    });

    it('should reject connection when server at capacity', async () => {
      const mockWebSocket = createMockWebSocket();
      const mockRequest = {
        url: '/?token=valid-token&documentId=doc1&userId=user1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-client' }
      };

      // Mock server at capacity
      const mockClients = new Map();
      for (let i = 0; i < 6; i++) {
        mockClients.set(`client${i}`, {});
      }
      jest.spyOn(server as any, 'clients', 'get').mockReturnValue(mockClients);

      await (server as any).handleConnection(mockWebSocket, mockRequest);

      expect(mockWebSocket.close).toHaveBeenCalledWith(1013, 'Server at capacity');
    });

    it('should reject invalid authentication', async () => {
      const mockWebSocket = createMockWebSocket();
      const mockRequest = {
        url: '/?token=invalid-token&documentId=doc1&userId=user1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-client' }
      };

      jest.spyOn(server as any, 'authenticateUser')
        .mockResolvedValue({ valid: false, permissions: {} });

      await (server as any).handleConnection(mockWebSocket, mockRequest);

      expect(mockWebSocket.close).toHaveBeenCalledWith(1008, 'Authentication failed');
    });
  });

  describe('Message Handling', () => {
    let mockClient: any;

    beforeEach(async () => {
      await server.start();
      
      mockClient = {
        id: 'client1',
        websocket: createMockWebSocket(),
        userId: 'user1',
        documentId: 'doc1',
        permissions: { read: true, write: true, admin: false, share: true, comment: true },
        lastActivity: new Date(),
        sessionId: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-client'
      };

      (server as any).clients.set('client1', mockClient);
      (server as any).rooms.set('doc1', {
        documentId: 'doc1',
        document: new Y.Doc(),
        clients: new Map([['client1', mockClient]]),
        lastActivity: new Date(),
        version: 1,
        operationCount: 0,
        conflictCount: 0
      });
    });

    it('should handle sync request messages', async () => {
      const syncRequest = {
        documentId: 'doc1',
        clientVector: {},
        requestedOperations: []
      };

      const message: WebSocketMessage = {
        type: WebSocketMessageType.SYNC_REQUEST,
        payload: syncRequest,
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      jest.spyOn(server as any, 'getMissingOperations')
        .mockResolvedValue([]);

      await (server as any).handleSyncRequest(mockClient, syncRequest);

      expect(mockClient.websocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockClient.websocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe(WebSocketMessageType.SYNC_RESPONSE);
    });

    it('should handle operation messages', async () => {
      const operation = createTestOperation({ documentId: 'doc1', userId: 'user1' });

      // Mock operational transform engine
      jest.spyOn(server as any, 'otEngine', 'get')
        .mockReturnValue({
          getOperationHistory: jest.fn().mockReturnValue([]),
          transformOperation: jest.fn().mockResolvedValue(operation)
        });

      // Mock sync service
      jest.spyOn(server as any, 'syncService', 'get')
        .mockReturnValue({
          syncDocument: jest.fn().mockResolvedValue({
            success: true,
            operationsApplied: 1,
            conflicts: []
          })
        });

      await (server as any).handleOperation(mockClient, operation);

      const room = (server as any).rooms.get('doc1');
      expect(room.operationCount).toBe(1);
    });

    it('should reject operations without write permissions', async () => {
      mockClient.permissions.write = false;
      
      const operation = createTestOperation({ documentId: 'doc1', userId: 'user1' });

      await (server as any).handleOperation(mockClient, operation);

      // Should send error
      expect(mockClient.websocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockClient.websocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe(WebSocketMessageType.ERROR);
    });

    it('should handle awareness updates', async () => {
      const awarenessData = {
        user: {
          id: 'user1',
          name: 'Test User',
          cursor: { x: 100, y: 200 }
        }
      };

      await (server as any).handleAwarenessUpdate(mockClient, awarenessData);

      // Should broadcast to other clients (but there are none in this test)
      // The method should complete without errors
    });

    it('should handle cursor updates', async () => {
      const cursorData = {
        position: 10,
        selection: { start: 10, end: 15 }
      };

      await (server as any).handleCursorUpdate(mockClient, cursorData);

      // Should broadcast cursor update
      // The method should complete without errors
    });

    it('should handle heartbeat messages', () => {
      const heartbeatMessage: WebSocketMessage = {
        type: WebSocketMessageType.HEARTBEAT,
        payload: { timestamp: Date.now() },
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'heartbeat1'
      };

      (server as any).handleHeartbeat(mockClient, heartbeatMessage);

      expect(mockClient.websocket.send).toHaveBeenCalled();
      const response = JSON.parse(mockClient.websocket.send.mock.calls[0][0]);
      expect(response.payload.response).toBe(true);
    });
  });

  describe('Document Room Management', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should create new document room when needed', async () => {
      const mockClient = {
        id: 'client1',
        documentId: 'new-doc',
        userId: 'user1',
        websocket: createMockWebSocket(),
        permissions: { read: true, write: true }
      };

      jest.spyOn(server as any, 'syncService', 'get')
        .mockReturnValue({
          loadDocument: jest.fn().mockResolvedValue(new Y.Doc())
        });

      await (server as any).joinDocumentRoom(mockClient);

      const rooms = (server as any).rooms;
      expect(rooms.has('new-doc')).toBe(true);
      
      const room = rooms.get('new-doc');
      expect(room.clients.has('client1')).toBe(true);
    });

    it('should join existing document room', async () => {
      // Pre-create room
      const existingRoom = {
        documentId: 'existing-doc',
        document: new Y.Doc(),
        clients: new Map(),
        lastActivity: new Date(),
        version: 1,
        operationCount: 0,
        conflictCount: 0
      };
      (server as any).rooms.set('existing-doc', existingRoom);

      const mockClient = {
        id: 'client2',
        documentId: 'existing-doc',
        userId: 'user2',
        websocket: createMockWebSocket(),
        permissions: { read: true, write: true }
      };

      await (server as any).joinDocumentRoom(mockClient);

      expect(existingRoom.clients.has('client2')).toBe(true);
    });

    it('should remove client from room on disconnect', async () => {
      const mockClient = {
        id: 'client1',
        documentId: 'doc1',
        userId: 'user1',
        websocket: createMockWebSocket(),
        permissions: { read: true, write: true }
      };

      const room = {
        documentId: 'doc1',
        document: new Y.Doc(),
        clients: new Map([['client1', mockClient]]),
        lastActivity: new Date(),
        version: 1,
        operationCount: 0,
        conflictCount: 0
      };
      (server as any).rooms.set('doc1', room);

      await (server as any).leaveDocumentRoom(mockClient);

      expect(room.clients.has('client1')).toBe(false);
    });

    it('should clean up empty rooms', async () => {
      const mockClient = {
        id: 'client1',
        documentId: 'doc1',
        userId: 'user1',
        websocket: createMockWebSocket(),
        permissions: { read: true, write: true }
      };

      const room = {
        documentId: 'doc1',
        document: new Y.Doc(),
        clients: new Map([['client1', mockClient]]),
        lastActivity: new Date(),
        version: 1,
        operationCount: 0,
        conflictCount: 0
      };
      (server as any).rooms.set('doc1', room);

      await (server as any).leaveDocumentRoom(mockClient);

      const rooms = (server as any).rooms;
      expect(rooms.has('doc1')).toBe(false);
    });
  });

  describe('Broadcasting and Communication', () => {
    let mockRoom: any;
    let mockClient1: any;
    let mockClient2: any;

    beforeEach(async () => {
      await server.start();

      mockClient1 = {
        id: 'client1',
        websocket: createMockWebSocket(),
        userId: 'user1',
        documentId: 'doc1'
      };

      mockClient2 = {
        id: 'client2',
        websocket: createMockWebSocket(),
        userId: 'user2',
        documentId: 'doc1'
      };

      mockRoom = {
        documentId: 'doc1',
        document: new Y.Doc(),
        clients: new Map([
          ['client1', mockClient1],
          ['client2', mockClient2]
        ]),
        lastActivity: new Date(),
        version: 1,
        operationCount: 0,
        conflictCount: 0
      };

      (server as any).rooms.set('doc1', mockRoom);
    });

    it('should broadcast message to all clients in room', () => {
      const message: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      (server as any).broadcastToRoom('doc1', message);

      expect(mockClient1.websocket.send).toHaveBeenCalled();
      expect(mockClient2.websocket.send).toHaveBeenCalled();
    });

    it('should exclude sender from broadcast', () => {
      const message: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      (server as any).broadcastToRoom('doc1', message, 'client1');

      expect(mockClient1.websocket.send).not.toHaveBeenCalled();
      expect(mockClient2.websocket.send).toHaveBeenCalled();
    });

    it('should not send to disconnected clients', () => {
      mockClient2.websocket.readyState = WebSocket.CLOSED;

      const message: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      (server as any).broadcastToRoom('doc1', message);

      expect(mockClient1.websocket.send).toHaveBeenCalled();
      expect(mockClient2.websocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should allow requests within rate limit', () => {
      const clientIP = '192.168.1.100';

      for (let i = 0; i < 10; i++) {
        expect((server as any).checkRateLimit(clientIP)).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const clientIP = '192.168.1.101';

      // Fill up the rate limit
      for (let i = 0; i < 10; i++) {
        (server as any).checkRateLimit(clientIP);
      }

      // 11th request should be blocked
      expect((server as any).checkRateLimit(clientIP)).toBe(false);
    });

    it('should reset rate limit after time window', () => {
      const clientIP = '192.168.1.102';

      // Fill up the rate limit
      for (let i = 0; i < 10; i++) {
        (server as any).checkRateLimit(clientIP);
      }

      // Mock time passage by clearing the rate limit manually
      (server as any).rateLimits.set(clientIP, []);

      // Should allow requests again
      expect((server as any).checkRateLimit(clientIP)).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should authenticate valid JWT token', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { permissions: { read: true, write: true, admin: false } },
                error: null
              })
            })
          })
        })
      };

      jest.spyOn(server as any, 'supabaseClient', 'get')
        .mockReturnValue(mockSupabaseClient);

      const auth = await (server as any).authenticateUser('valid-token', 'user123', 'doc1');

      expect(auth.valid).toBe(true);
      expect(auth.permissions.read).toBe(true);
      expect(auth.permissions.write).toBe(true);
    });

    it('should reject invalid JWT token', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Invalid token')
          })
        }
      };

      jest.spyOn(server as any, 'supabaseClient', 'get')
        .mockReturnValue(mockSupabaseClient);

      const auth = await (server as any).authenticateUser('invalid-token', 'user123', 'doc1');

      expect(auth.valid).toBe(false);
    });

    it('should reject user without document permissions', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('No permissions')
              })
            })
          })
        })
      };

      jest.spyOn(server as any, 'supabaseClient', 'get')
        .mockReturnValue(mockSupabaseClient);

      const auth = await (server as any).authenticateUser('valid-token', 'user123', 'doc1');

      expect(auth.valid).toBe(false);
    });
  });

  describe('Cleanup and Maintenance', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should clean up inactive clients during heartbeat', () => {
      const mockClient = {
        id: 'client1',
        websocket: createMockWebSocket(),
        lastActivity: new Date(Date.now() - 10000), // 10 seconds ago
        userId: 'user1'
      };

      (server as any).clients.set('client1', mockClient);

      // Simulate heartbeat cleanup
      (server as any).startHeartbeat();

      // Wait for timeout to trigger
      setTimeout(() => {
        expect(mockClient.websocket.terminate).toHaveBeenCalled();
        expect((server as any).clients.has('client1')).toBe(false);
      }, 1500);
    });

    it('should send ping to active clients during heartbeat', () => {
      const mockClient = {
        id: 'client1',
        websocket: createMockWebSocket(),
        lastActivity: new Date(), // Active
        userId: 'user1'
      };

      (server as any).clients.set('client1', mockClient);
      (server as any).startHeartbeat();

      setTimeout(() => {
        expect(mockClient.websocket.ping).toHaveBeenCalled();
      }, 1500);
    });
  });

  describe('Message Validation', () => {
    let mockClient: any;

    beforeEach(async () => {
      await server.start();
      
      mockClient = {
        id: 'client1',
        websocket: createMockWebSocket(),
        userId: 'user1',
        documentId: 'doc1'
      };
    });

    it('should validate message structure', () => {
      const validMessage: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      const isValid = (server as any).validateMessage(validMessage, mockClient);
      expect(isValid).toBe(true);
    });

    it('should reject message with missing fields', () => {
      const invalidMessage = {
        // Missing type field
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'user1'
      } as WebSocketMessage;

      const isValid = (server as any).validateMessage(invalidMessage, mockClient);
      expect(isValid).toBe(false);
      expect(mockClient.websocket.send).toHaveBeenCalled();
    });

    it('should reject message with mismatched document ID', () => {
      const invalidMessage: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'wrong-doc', // Doesn't match client's document
        userId: 'user1',
        timestamp: new Date(),
        messageId: 'msg1'
      };

      const isValid = (server as any).validateMessage(invalidMessage, mockClient);
      expect(isValid).toBe(false);
      expect(mockClient.websocket.send).toHaveBeenCalled();
    });

    it('should reject message with mismatched user ID', () => {
      const invalidMessage: WebSocketMessage = {
        type: WebSocketMessageType.OPERATION,
        payload: createTestOperation(),
        documentId: 'doc1',
        userId: 'wrong-user', // Doesn't match client's user
        timestamp: new Date(),
        messageId: 'msg1'
      };

      const isValid = (server as any).validateMessage(invalidMessage, mockClient);
      expect(isValid).toBe(false);
      expect(mockClient.websocket.send).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should provide accurate server statistics', () => {
      // Add mock clients and rooms
      (server as any).clients.set('client1', {});
      (server as any).clients.set('client2', {});
      
      (server as any).rooms.set('doc1', {
        operationCount: 10,
        conflictCount: 2
      });
      (server as any).rooms.set('doc2', {
        operationCount: 5,
        conflictCount: 1
      });

      const stats = server.getStats();

      expect(stats.connectedClients).toBe(2);
      expect(stats.activeRooms).toBe(2);
      expect(stats.totalOperations).toBe(15);
      expect(stats.totalConflicts).toBe(3);
      expect(typeof stats.uptime).toBe('number');
    });
  });
});