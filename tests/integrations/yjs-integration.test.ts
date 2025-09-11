/**
 * WS-244 Real-Time Collaboration System - Y.js Integration Tests
 * Team C - Comprehensive Test Suite for Y.js WebSocket Provider
 * 
 * Complete test suite for operational transform, document synchronization,
 * external service integration, and WebSocket server functionality.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as Y from 'yjs';
import { WebSocket } from 'ws';
import { YjsWebSocketProvider } from '../../src/lib/integrations/yjs-websocket-provider';
import { OperationalTransformEngine } from '../../src/lib/integrations/operational-transform-engine';
import { DocumentSynchronizationService } from '../../src/lib/integrations/document-sync-service';
import { ExternalCollaborationConnectors } from '../../src/lib/integrations/external-collaboration-connectors';
import { YjsWebSocketServer } from '../../src/lib/websocket/yjs-websocket-server';
import {
  Operation,
  OperationType,
  YjsProviderOptions,
  ConnectionStatus,
  SyncStatus,
  DocumentPermissions
} from '../../src/types/collaboration';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('googleapis');
jest.mock('@microsoft/microsoft-graph-client');

describe('Y.js Real-Time Collaboration System', () => {
  let testDocument: Y.Doc;
  let mockWebSocketUrl: string;
  let mockSessionId: string;
  let mockOptions: YjsProviderOptions;

  beforeEach(() => {
    testDocument = new Y.Doc();
    mockWebSocketUrl = 'ws://localhost:8080';
    mockSessionId = 'test-document-123';
    mockOptions = {
      authToken: 'test-token',
      organizationId: 'test-org',
      userId: 'test-user',
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 5000
      },
      permissions: {
        read: true,
        write: true,
        admin: false,
        share: true,
        comment: true
      },
      offlineSync: true
    };
  });

  afterEach(() => {
    testDocument.destroy();
  });

  describe('YjsWebSocketProvider', () => {
    let provider: YjsWebSocketProvider;

    beforeEach(() => {
      provider = new YjsWebSocketProvider(
        testDocument,
        mockWebSocketUrl,
        mockSessionId,
        mockOptions
      );
    });

    afterEach(async () => {
      await provider.disconnect();
    });

    describe('Connection Management', () => {
      it('should initialize with disconnected status', () => {
        expect(provider.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED);
        expect(provider.getSyncStatus()).toBe(SyncStatus.OUT_OF_SYNC);
      });

      it('should connect to WebSocket server', async () => {
        // Mock WebSocket connection
        const mockWebSocket = {
          readyState: WebSocket.OPEN,
          send: jest.fn(),
          close: jest.fn(),
          on: jest.fn(),
          onopen: null,
          onclose: null,
          onmessage: null,
          onerror: null
        };

        // Mock successful connection
        jest.spyOn(provider as any, 'createWebSocketConnection')
          .mockResolvedValue(undefined);
        jest.spyOn(provider as any, 'validateAuthentication')
          .mockResolvedValue(undefined);

        const connectionPromise = provider.connect();

        // Simulate connection success
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen({} as Event);
        }

        await connectionPromise;

        expect(provider.getConnectionStatus()).toBe(ConnectionStatus.CONNECTED);
      });

      it('should handle connection failures', async () => {
        jest.spyOn(provider as any, 'validateAuthentication')
          .mockRejectedValue(new Error('Authentication failed'));

        await expect(provider.connect()).rejects.toThrow('Authentication failed');
        expect(provider.getConnectionStatus()).toBe(ConnectionStatus.FAILED);
      });

      it('should disconnect gracefully', async () => {
        const mockDisconnect = jest.spyOn(provider as any, 'websocket', 'get')
          .mockReturnValue({
            close: jest.fn(),
            readyState: WebSocket.OPEN
          });

        await provider.disconnect();

        expect(provider.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED);
      });
    });

    describe('Document Synchronization', () => {
      it('should sync document operations', async () => {
        const mockSyncResult = {
          success: true,
          documentId: mockSessionId,
          operationsApplied: 2,
          conflicts: [],
          timestamp: new Date(),
          clientVector: {},
          serverVector: {}
        };

        jest.spyOn(provider as any, 'websocket', 'get')
          .mockReturnValue({
            readyState: WebSocket.OPEN,
            send: jest.fn()
          });

        const syncPromise = provider.forcSync();

        // Simulate sync response
        provider.emit('syncComplete', mockSyncResult);

        const result = await syncPromise;

        expect(result.success).toBe(true);
        expect(result.operationsApplied).toBe(2);
      });

      it('should handle sync timeouts', async () => {
        jest.spyOn(provider as any, 'websocket', 'get')
          .mockReturnValue({
            readyState: WebSocket.OPEN,
            send: jest.fn()
          });

        // Don't emit syncComplete to trigger timeout
        await expect(provider.forcSync()).rejects.toThrow('Sync timeout');
      });
    });

    describe('Awareness and Presence', () => {
      it('should broadcast awareness updates', () => {
        const mockWebSocket = {
          readyState: WebSocket.OPEN,
          send: jest.fn()
        };

        jest.spyOn(provider as any, 'websocket', 'get')
          .mockReturnValue(mockWebSocket);
        jest.spyOn(provider as any, 'connectionStatus', 'get')
          .mockReturnValue(ConnectionStatus.CONNECTED);

        // Simulate awareness change
        const awareness = (provider as any).awareness;
        awareness.set('cursor', { x: 100, y: 200 });

        expect(mockWebSocket.send).toHaveBeenCalled();
      });
    });
  });

  describe('OperationalTransformEngine', () => {
    let otEngine: OperationalTransformEngine;

    beforeEach(() => {
      otEngine = new OperationalTransformEngine();
    });

    describe('Operation Transformation', () => {
      it('should transform INSERT against INSERT operations', async () => {
        const op1: Operation = {
          id: 'op1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 5,
          length: 0,
          content: 'Hello',
          userId: 'user1',
          documentId: 'doc1'
        };

        const op2: Operation = {
          id: 'op2',
          type: OperationType.INSERT,
          clientId: 2,
          timestamp: new Date(),
          position: 3,
          length: 0,
          content: 'World',
          userId: 'user2',
          documentId: 'doc1'
        };

        const transformed = await otEngine.transformOperation(op1, [op2], testDocument);

        // op1 position should be adjusted after op2's insertion
        expect(transformed.position).toBe(10); // 5 + 5 (length of "World")
        expect(transformed.content).toBe('Hello');
        expect(transformed.conflictsWith).toContain('op2');
      });

      it('should transform INSERT against DELETE operations', async () => {
        const insertOp: Operation = {
          id: 'insert1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 10,
          length: 0,
          content: 'Text',
          userId: 'user1',
          documentId: 'doc1'
        };

        const deleteOp: Operation = {
          id: 'delete1',
          type: OperationType.DELETE,
          clientId: 2,
          timestamp: new Date(),
          position: 5,
          length: 3,
          userId: 'user2',
          documentId: 'doc1'
        };

        const transformed = await otEngine.transformOperation(insertOp, [deleteOp], testDocument);

        // Insert position should be adjusted after deletion
        expect(transformed.position).toBe(7); // 10 - 3 (deleted length)
        expect(transformed.content).toBe('Text');
      });

      it('should handle DELETE against DELETE conflicts', async () => {
        const delete1: Operation = {
          id: 'delete1',
          type: OperationType.DELETE,
          clientId: 1,
          timestamp: new Date(),
          position: 5,
          length: 5,
          userId: 'user1',
          documentId: 'doc1'
        };

        const delete2: Operation = {
          id: 'delete2',
          type: OperationType.DELETE,
          clientId: 2,
          timestamp: new Date(),
          position: 7,
          length: 3,
          userId: 'user2',
          documentId: 'doc1'
        };

        const transformed = await otEngine.transformOperation(delete1, [delete2], testDocument);

        // Should handle overlapping deletions
        expect(transformed.position).toBe(5);
        expect(transformed.length).toBeGreaterThan(0);
      });
    });

    describe('Conflict Resolution', () => {
      it('should resolve conflicts between local and remote operations', async () => {
        const localOps: Operation[] = [{
          id: 'local1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 5,
          length: 0,
          content: 'Local',
          userId: 'user1',
          documentId: 'doc1'
        }];

        const remoteOps: Operation[] = [{
          id: 'remote1',
          type: OperationType.INSERT,
          clientId: 2,
          timestamp: new Date(),
          position: 5,
          length: 0,
          content: 'Remote',
          userId: 'user2',
          documentId: 'doc1'
        }];

        const baseState = {
          id: 'snapshot1',
          documentId: 'doc1',
          version: 1,
          stateVector: {},
          content: new Uint8Array(),
          metadata: {} as any,
          createdAt: new Date(),
          createdBy: 'system',
          size: 0
        };

        const resolution = await otEngine.resolveConflict(localOps, remoteOps, baseState);

        expect(resolution.operations).toHaveLength(1);
        expect(resolution.resolution).toBe('merged');
        expect(resolution.resolvedBy).toBe('algorithm');
      });
    });

    describe('Performance and Caching', () => {
      it('should cache transformation results', async () => {
        const operation: Operation = {
          id: 'op1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 5,
          length: 0,
          content: 'Test',
          userId: 'user1',
          documentId: 'doc1'
        };

        const appliedOps: Operation[] = [];

        // First transformation
        const result1 = await otEngine.transformOperation(operation, appliedOps, testDocument);

        // Second transformation with same parameters should use cache
        const result2 = await otEngine.transformOperation(operation, appliedOps, testDocument);

        expect(result1).toEqual(result2);
      });

      it('should provide performance statistics', () => {
        const stats = otEngine.getPerformanceStats();

        expect(stats).toHaveProperty('cacheSize');
        expect(stats).toHaveProperty('historySize');
        expect(stats).toHaveProperty('conflictResolutions');
        expect(typeof stats.cacheSize).toBe('number');
      });
    });
  });

  describe('DocumentSynchronizationService', () => {
    let syncService: DocumentSynchronizationService;

    beforeEach(() => {
      syncService = new DocumentSynchronizationService();
    });

    afterEach(() => {
      syncService.cleanup();
    });

    describe('Document Operations', () => {
      it('should sync document with operations', async () => {
        const operations: Operation[] = [{
          id: 'op1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 0,
          length: 0,
          content: 'Hello World',
          userId: 'user1',
          documentId: 'doc1'
        }];

        const clientVector = {};
        const userId = 'user1';

        // Mock Supabase operations
        const mockSupabaseClient = {
          auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null })
          },
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { permissions: { write: true } },
                  error: null
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          })
        };

        jest.spyOn(syncService as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const result = await syncService.syncDocument('doc1', operations, clientVector, userId);

        expect(result.success).toBe(true);
        expect(result.operationsApplied).toBe(1);
        expect(result.documentId).toBe('doc1');
      });

      it('should create document snapshots', async () => {
        const document = new Y.Doc();
        const text = document.getText('content');
        text.insert(0, 'Test document content');

        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    title: 'Test Document',
                    version: 1,
                    type: 'text'
                  },
                  error: null
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          })
        };

        jest.spyOn(syncService as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const snapshot = await syncService.createSnapshot('doc1', document, 'user1');

        expect(snapshot).toHaveProperty('id');
        expect(snapshot.documentId).toBe('doc1');
        expect(snapshot.version).toBeGreaterThan(0);
        expect(snapshot.createdBy).toBe('user1');
      });
    });

    describe('Document Loading', () => {
      it('should load document from snapshot', async () => {
        const mockSnapshot = {
          id: 'snapshot1',
          document_id: 'doc1',
          version: 1,
          content: Array.from(new Uint8Array([1, 2, 3, 4])),
          created_at: new Date().toISOString()
        };

        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSnapshot,
                      error: null
                    })
                  })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          })
        };

        jest.spyOn(syncService as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const document = await syncService.loadDocument('doc1');

        expect(document).toBeInstanceOf(Y.Doc);
      });

      it('should create new document if no snapshot exists', async () => {
        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Not found' }
                    })
                  })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          })
        };

        jest.spyOn(syncService as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const document = await syncService.loadDocument('new-doc');

        expect(document).toBeInstanceOf(Y.Doc);
      });
    });
  });

  describe('ExternalCollaborationConnectors', () => {
    let connectors: ExternalCollaborationConnectors;

    beforeEach(() => {
      connectors = new ExternalCollaborationConnectors();
    });

    describe('Google Docs Integration', () => {
      it('should connect to Google Docs', async () => {
        // Mock Supabase credentials
        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    accessToken: 'google-token',
                    refreshToken: 'refresh-token'
                  },
                  error: null
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null })
          })
        };

        jest.spyOn(connectors as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        // Mock Google APIs
        const mockAdapter = {
          connect: jest.fn().mockResolvedValue(undefined),
          subscribeToChanges: jest.fn().mockResolvedValue(undefined)
        };

        jest.spyOn(connectors as any, 'adapters')
          .mockReturnValue(new Map([['google_docs', mockAdapter]]));

        const connection = await connectors.connectGoogleDocs(
          'doc1',
          'google-doc-id',
          'bidirectional' as any
        );

        expect(connection.type).toBe('google_docs');
        expect(connection.documentId).toBe('doc1');
        expect(connection.externalId).toBe('google-doc-id');
        expect(mockAdapter.connect).toHaveBeenCalled();
      });
    });

    describe('Office 365 Integration', () => {
      it('should connect to Office 365', async () => {
        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    accessToken: 'office365-token'
                  },
                  error: null
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null })
          })
        };

        jest.spyOn(connectors as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const mockAdapter = {
          connect: jest.fn().mockResolvedValue(undefined),
          subscribeToChanges: jest.fn().mockResolvedValue(undefined)
        };

        jest.spyOn(connectors as any, 'adapters')
          .mockReturnValue(new Map([['office_365', mockAdapter]]));

        const connection = await connectors.connectOffice365(
          'doc1',
          'office365-file-id',
          { canEdit: true, canShare: true, canDownload: true, canComment: true }
        );

        expect(connection.type).toBe('office_365');
        expect(connection.documentId).toBe('doc1');
        expect(connection.office365FileId).toBe('office365-file-id');
        expect(mockAdapter.connect).toHaveBeenCalled();
      });
    });

    describe('Health Monitoring', () => {
      it('should provide health check for external services', async () => {
        const health = await connectors.healthCheck();

        expect(health).toHaveProperty('google_docs');
        expect(health).toHaveProperty('office_365');
        expect(typeof health.google_docs).toBe('boolean');
        expect(typeof health.office_365).toBe('boolean');
      });
    });
  });

  describe('YjsWebSocketServer', () => {
    let server: YjsWebSocketServer;

    beforeEach(() => {
      server = new YjsWebSocketServer({
        port: 8081, // Use different port for testing
        maxConnections: 10,
        heartbeatInterval: 1000,
        clientTimeout: 5000
      });
    });

    afterEach(async () => {
      await server.stop();
    });

    describe('Server Lifecycle', () => {
      it('should start and stop server', async () => {
        await server.start();

        const stats = server.getStats();
        expect(stats.connectedClients).toBe(0);
        expect(stats.activeRooms).toBe(0);

        await server.stop();
      });

      it('should handle connection limits', async () => {
        await server.start();

        // Mock WebSocket connections exceeding limit
        const mockClients = new Map();
        for (let i = 0; i < 11; i++) {
          mockClients.set(`client${i}`, {});
        }

        jest.spyOn(server as any, 'clients', 'get')
          .mockReturnValue(mockClients);

        // Connection should be rejected
        const mockWebSocket = {
          close: jest.fn()
        };

        await (server as any).handleConnection(mockWebSocket, {
          url: '/?token=test&documentId=doc1&userId=user1',
          socket: { remoteAddress: '127.0.0.1' },
          headers: { 'user-agent': 'test' }
        });

        expect(mockWebSocket.close).toHaveBeenCalledWith(1013, 'Server at capacity');
      });
    });

    describe('Authentication and Authorization', () => {
      it('should authenticate users correctly', async () => {
        const mockSupabaseClient = {
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: { id: 'user1' } },
              error: null
            })
          },
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { permissions: { read: true, write: true } },
                  error: null
                })
              })
            })
          })
        };

        jest.spyOn(server as any, 'supabaseClient', 'get')
          .mockReturnValue(mockSupabaseClient);

        const auth = await (server as any).authenticateUser('token', 'user1', 'doc1');

        expect(auth.valid).toBe(true);
        expect(auth.permissions.read).toBe(true);
        expect(auth.permissions.write).toBe(true);
      });

      it('should reject invalid authentication', async () => {
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

        const auth = await (server as any).authenticateUser('invalid-token', 'user1', 'doc1');

        expect(auth.valid).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits', () => {
        const clientIP = '127.0.0.1';

        // First requests should pass
        for (let i = 0; i < 100; i++) {
          expect((server as any).checkRateLimit(clientIP)).toBe(true);
        }

        // 101st request should be rate limited
        expect((server as any).checkRateLimit(clientIP)).toBe(false);
      });
    });

    describe('Document Rooms', () => {
      it('should create and manage document rooms', async () => {
        const mockClient = {
          id: 'client1',
          documentId: 'doc1',
          userId: 'user1',
          websocket: { readyState: 1 },
          permissions: { read: true, write: true }
        };

        const mockDocument = new Y.Doc();
        jest.spyOn(server as any, 'syncService')
          .mockReturnValue({
            loadDocument: jest.fn().mockResolvedValue(mockDocument)
          });

        await (server as any).joinDocumentRoom(mockClient);

        const rooms = (server as any).rooms;
        expect(rooms.has('doc1')).toBe(true);
        
        const room = rooms.get('doc1');
        expect(room.clients.has('client1')).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end collaboration scenario', async () => {
      // Create two Y.js documents
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      // Create text objects
      const text1 = doc1.getText('content');
      const text2 = doc2.getText('content');

      // Simulate concurrent edits
      text1.insert(0, 'Hello ');
      text2.insert(0, 'World!');

      // Get updates
      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);

      // Apply updates cross-wise
      Y.applyUpdate(doc2, update1);
      Y.applyUpdate(doc1, update2);

      // Both documents should have converged
      expect(text1.toString()).toBe(text2.toString());
    });

    it('should handle complex operational transform scenario', async () => {
      const otEngine = new OperationalTransformEngine();
      
      const operations: Operation[] = [
        {
          id: 'op1',
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 0,
          length: 0,
          content: 'Hello',
          userId: 'user1',
          documentId: 'doc1'
        },
        {
          id: 'op2',
          type: OperationType.INSERT,
          clientId: 2,
          timestamp: new Date(),
          position: 0,
          length: 0,
          content: 'World',
          userId: 'user2',
          documentId: 'doc1'
        },
        {
          id: 'op3',
          type: OperationType.DELETE,
          clientId: 3,
          timestamp: new Date(),
          position: 2,
          length: 3,
          userId: 'user3',
          documentId: 'doc1'
        }
      ];

      const document = new Y.Doc();
      
      // Apply operations sequentially with transformation
      let appliedOps: Operation[] = [];
      
      for (const op of operations) {
        const transformed = await otEngine.transformOperation(op, appliedOps, document);
        
        // Apply to document (mock)
        appliedOps.push(transformed);
      }

      expect(appliedOps).toHaveLength(3);
      expect(appliedOps.every(op => op.transformationReason)).toBeTruthy();
    });

    it('should maintain document consistency under network partitions', async () => {
      // This test would simulate network partitions and verify
      // that documents reconverge when connectivity is restored
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      // Simulate partition - documents edit independently
      const text1 = doc1.getText('content');
      const text2 = doc2.getText('content');

      text1.insert(0, 'Partition A: ');
      text2.insert(0, 'Partition B: ');

      // Capture states during partition
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);

      // Simulate reconnection - apply missed updates
      Y.applyUpdate(doc1, state2);
      Y.applyUpdate(doc2, state1);

      // Documents should converge
      expect(text1.toString()).toBe(text2.toString());
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of operations efficiently', async () => {
      const otEngine = new OperationalTransformEngine();
      const document = new Y.Doc();
      
      const operations: Operation[] = [];
      const numOperations = 1000;
      
      // Generate many operations
      for (let i = 0; i < numOperations; i++) {
        operations.push({
          id: `op${i}`,
          type: OperationType.INSERT,
          clientId: i % 10,
          timestamp: new Date(),
          position: Math.floor(Math.random() * 100),
          length: 0,
          content: `Text${i}`,
          userId: `user${i % 5}`,
          documentId: 'doc1'
        });
      }
      
      const startTime = Date.now();
      
      // Transform all operations
      let appliedOps: Operation[] = [];
      for (const op of operations) {
        const transformed = await otEngine.transformOperation(op, appliedOps, document);
        appliedOps.push(transformed);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(appliedOps).toHaveLength(numOperations);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should maintain acceptable memory usage', () => {
      const otEngine = new OperationalTransformEngine();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many operations to test memory usage
      for (let i = 0; i < 10000; i++) {
        const op: Operation = {
          id: `op${i}`,
          type: OperationType.INSERT,
          clientId: 1,
          timestamp: new Date(),
          position: 0,
          length: 0,
          content: `Content ${i}`,
          userId: 'user1',
          documentId: 'doc1'
        };
        
        // This adds to internal history
        (otEngine as any).addToHistory('doc1', op);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      const provider = new YjsWebSocketProvider(
        testDocument,
        'ws://invalid-host:9999',
        mockSessionId,
        mockOptions
      );

      await expect(provider.connect()).rejects.toThrow();
      expect(provider.getConnectionStatus()).toBe(ConnectionStatus.FAILED);
    });

    it('should recover from temporary network issues', async () => {
      const provider = new YjsWebSocketProvider(
        testDocument,
        mockWebSocketUrl,
        mockSessionId,
        mockOptions
      );

      // Mock connection that fails initially then succeeds
      let connectionAttempts = 0;
      jest.spyOn(provider as any, 'createWebSocketConnection')
        .mockImplementation(() => {
          connectionAttempts++;
          if (connectionAttempts === 1) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        });

      jest.spyOn(provider as any, 'validateAuthentication')
        .mockResolvedValue(undefined);

      // First attempt should fail
      await expect(provider.connect()).rejects.toThrow('Network error');
      
      // Subsequent attempt should succeed
      await provider.connect();
      
      expect(connectionAttempts).toBe(2);
    });
  });
});