/**
 * WS-172: Offline Sync Engine Tests
 * Team B - Round 3 - Batch 21
 * 
 * Comprehensive unit tests for the offline sync engine with >80% coverage
 * Testing conflict resolution, transaction safety, and retry logic
 */

import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { OfflineSyncEngine, SyncChange, ConflictData } from '@/lib/offline/sync-engine';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

describe('OfflineSyncEngine', () => {
  let syncEngine: OfflineSyncEngine;
  let mockUserId: string;
  let mockSessionId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'user-123';
    mockSessionId = 'session-456';
    
    syncEngine = new OfflineSyncEngine(mockSupabase, {
      conflictResolution: 'merge',
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 5,
      transactionTimeout: 30000,
      validateChecksums: true,
      enableDryRun: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sync Change Validation', () => {
    test('should validate correct sync changes', () => {
      const validChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'John Doe', email: 'john@example.com' },
        timestamp: new Date().toISOString(),
        userId: mockUserId,
        deviceId: 'device-123',
        checksum: 'abc123'
      };

      // @ts-ignore - accessing private method for testing
      const result = syncEngine.validateChanges([validChange]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid sync changes', () => {
      const invalidChange = {
        id: 'invalid-uuid',
        action: 'invalid-action',
        table: '',
        data: 'not-an-object',
        timestamp: 'invalid-timestamp',
        userId: 'invalid-uuid'
      };

      // @ts-ignore - accessing private method for testing
      const result = syncEngine.validateChanges([invalidChange as any]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate UUID format', () => {
      const invalidChange: Partial<SyncChange> = {
        id: 'not-a-uuid',
        action: 'create',
        table: 'clients',
        data: {},
        timestamp: new Date().toISOString(),
        userId: 'also-not-a-uuid'
      };

      // @ts-ignore
      const result = syncEngine.validateChanges([invalidChange]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('uuid'))).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    test('should detect timestamp-based conflicts', async () => {
      const clientChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update',
        table: 'clients',
        data: { name: 'Updated Name' },
        timestamp: '2024-01-01T10:00:00Z',
        userId: mockUserId
      };

      const serverRecord = {
        id: clientChange.id,
        name: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z' // Server updated later
      };

      mockSupabase.single.mockResolvedValue({ data: serverRecord, error: null });

      const conflict = await syncEngine.detectConflicts(clientChange);
      
      expect(conflict).not.toBeNull();
      expect(conflict?.table).toBe('clients');
      expect(conflict?.conflictFields).toContain('name');
      expect(conflict?.severity).toBeDefined();
    });

    test('should not detect conflict when client change is newer', async () => {
      const clientChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update',
        table: 'clients',
        data: { name: 'Updated Name' },
        timestamp: '2024-01-01T12:00:00Z', // Client newer
        userId: mockUserId
      };

      const serverRecord = {
        id: clientChange.id,
        name: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({ data: serverRecord, error: null });

      const conflict = await syncEngine.detectConflicts(clientChange);
      expect(conflict).toBeNull();
    });

    test('should handle non-existent server records', async () => {
      const clientChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'New Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const conflict = await syncEngine.detectConflicts(clientChange);
      expect(conflict).toBeNull();
    });

    test('should calculate conflict severity correctly', () => {
      // Test critical field conflicts
      // @ts-ignore
      const criticalSeverity = syncEngine.calculateConflictSeverity(['email', 'wedding_date'], 'clients');
      expect(criticalSeverity).toBe('critical');

      // Test high priority field conflicts
      // @ts-ignore
      const highSeverity = syncEngine.calculateConflictSeverity(['name', 'status'], 'clients');
      expect(highSeverity).toBe('high');

      // Test multiple field conflicts
      // @ts-ignore
      const multipleSeverity = syncEngine.calculateConflictSeverity(['field1', 'field2', 'field3', 'field4'], 'clients');
      expect(multipleSeverity).toBe('high');

      // Test medium severity
      // @ts-ignore
      const mediumSeverity = syncEngine.calculateConflictSeverity(['field1', 'field2'], 'clients');
      expect(mediumSeverity).toBe('medium');

      // Test low severity
      // @ts-ignore
      const lowSeverity = syncEngine.calculateConflictSeverity(['notes'], 'clients');
      expect(lowSeverity).toBe('low');
    });
  });

  describe('Conflict Resolution Strategies', () => {
    let mockConflict: ConflictData;

    beforeEach(() => {
      mockConflict = {
        id: 'conflict-123',
        table: 'clients',
        recordId: '550e8400-e29b-41d4-a716-446655440000',
        clientData: { name: 'Client Name', notes: 'Client notes' },
        serverData: { name: 'Server Name', notes: 'Server notes' },
        clientTimestamp: '2024-01-01T10:00:00Z',
        serverTimestamp: '2024-01-01T11:00:00Z',
        conflictFields: ['name', 'notes'],
        severity: 'medium'
      };
    });

    test('should resolve conflicts with client wins strategy', async () => {
      // @ts-ignore
      const resolution = await syncEngine.resolveClientWins(mockConflict);
      
      expect(resolution.strategy).toBe('client_wins');
      expect(resolution.applied).toBe(true);
      expect(resolution.confidence).toBe(1.0);
      expect(resolution.resolvedData).toEqual(mockConflict.clientData);
    });

    test('should resolve conflicts with server wins strategy', async () => {
      // @ts-ignore
      const resolution = await syncEngine.resolveServerWins(mockConflict);
      
      expect(resolution.strategy).toBe('server_wins');
      expect(resolution.applied).toBe(false);
      expect(resolution.confidence).toBe(1.0);
      expect(resolution.resolvedData).toEqual(mockConflict.serverData);
    });

    test('should resolve conflicts with merge strategy', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: mockConflict.recordId }, error: null })
            })
          })
        })
      });

      // @ts-ignore
      const resolution = await syncEngine.resolveMerge(mockConflict);
      
      expect(resolution.strategy).toBe('merge');
      expect(resolution.applied).toBe(true);
      expect(resolution.confidence).toBe(0.8);
      expect(resolution.resolvedData).toBeDefined();
    });

    test('should queue conflicts for manual resolution', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      // @ts-ignore
      const resolution = await syncEngine.resolveManual(mockConflict);
      
      expect(resolution.strategy).toBe('manual');
      expect(resolution.applied).toBe(false);
      expect(resolution.confidence).toBe(0.0);
      expect(mockSupabase.from).toHaveBeenCalledWith('sync_conflict_log');
    });

    test('should merge field values intelligently', () => {
      // Test note field concatenation
      // @ts-ignore
      const mergedNotes = syncEngine.mergeFieldValues('notes', 'Client notes', 'Server notes', 'clients');
      expect(mergedNotes).toContain('Server notes');
      expect(mergedNotes).toContain('[Client Update]: Client notes');

      // Test array field merging
      // @ts-ignore
      const mergedArray = syncEngine.mergeFieldValues('tags', ['tag1', 'tag2'], ['tag2', 'tag3'], 'clients');
      expect(mergedArray).toEqual(['tag2', 'tag3', 'tag1']);

      // Test numeric field merging (take max)
      // @ts-ignore
      const mergedNumber = syncEngine.mergeFieldValues('priority', 5, 3, 'tasks');
      expect(mergedNumber).toBe(5);

      // Test timestamp field merging
      // @ts-ignore
      const mergedDate = syncEngine.mergeFieldValues('updated_date', '2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z', 'clients');
      expect(mergedDate).toBe('2024-01-02T00:00:00Z');
    });
  });

  describe('Transaction Management', () => {
    test('should begin and commit transactions successfully', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null }) // begin
        .mockResolvedValueOnce({ data: null, error: null }); // commit

      // @ts-ignore
      const transaction = await syncEngine.beginTransaction(mockSessionId);
      expect(transaction).toBeDefined();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('begin_sync_transaction', { p_session_id: mockSessionId });

      // @ts-ignore
      await syncEngine.commitTransaction(mockSessionId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('commit_sync_transaction', { p_session_id: mockSessionId });
    });

    test('should rollback transactions on error', async () => {
      const mockError = new Error('Database error');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // @ts-ignore
      await syncEngine.rollbackTransaction(mockSessionId, mockError);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_sync_transaction', {
        p_session_id: mockSessionId,
        p_error: 'Database error'
      });
    });

    test('should handle transaction timeout', async () => {
      const shortTimeoutEngine = new OfflineSyncEngine(mockSupabase, { transactionTimeout: 100 });
      
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      const changes: SyncChange[] = [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      }];

      await expect(shortTimeoutEngine.processSyncBatch(changes, mockSessionId))
        .rejects.toThrow();
    });
  });

  describe('Batch Processing', () => {
    test('should process small batches correctly', async () => {
      const changes: SyncChange[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          action: 'create',
          table: 'clients',
          data: { name: 'Client 1' },
          timestamp: new Date().toISOString(),
          userId: mockUserId
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          action: 'update',
          table: 'clients',
          data: { name: 'Client 2 Updated' },
          timestamp: new Date().toISOString(),
          userId: mockUserId
        }
      ];

      // Mock successful operations
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null }) // begin transaction
        .mockResolvedValueOnce({ data: null, error: null }); // commit transaction

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // no conflict for create
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // no conflict for update

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: changes[0].id }, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: changes[1].id }, error: null })
              })
            })
          })
        })
      });

      const result = await syncEngine.processSyncBatch(changes, mockSessionId);

      expect(result.success).toBe(true);
      expect(result.processed).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
      expect(result.failures).toHaveLength(0);
      expect(result.metrics.itemsProcessed).toBe(2);
    });

    test('should handle batch size limits', () => {
      const changes = Array.from({ length: 15 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        action: 'create' as const,
        table: 'clients',
        data: { name: `Client ${i}` },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      }));

      // @ts-ignore
      const batches = syncEngine.createBatches(changes, 5);
      
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(5);
      expect(batches[1]).toHaveLength(5);
      expect(batches[2]).toHaveLength(5);
    });
  });

  describe('Change Application', () => {
    test('should apply create operations', async () => {
      const createChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'New Client', email: 'new@example.com' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: createChange.id }, 
              error: null 
            })
          })
        })
      });

      // @ts-ignore
      const serverId = await syncEngine.applyChange(createChange);
      
      expect(serverId).toBe(createChange.id);
      expect(mockSupabase.from).toHaveBeenCalledWith('clients');
    });

    test('should apply update operations', async () => {
      const updateChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update',
        table: 'clients',
        data: { name: 'Updated Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                  data: { id: updateChange.id }, 
                  error: null 
                })
              })
            })
          })
        })
      });

      // @ts-ignore
      const serverId = await syncEngine.applyChange(updateChange);
      
      expect(serverId).toBe(updateChange.id);
    });

    test('should apply delete operations', async () => {
      const deleteChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'delete',
        table: 'clients',
        data: {},
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      });

      // @ts-ignore
      const serverId = await syncEngine.applyChange(deleteChange);
      
      expect(serverId).toBe(deleteChange.id);
    });

    test('should handle database errors during change application', async () => {
      const failingChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: new Error('Database constraint violation') 
            })
          })
        })
      });

      // @ts-ignore
      await expect(syncEngine.applyChange(failingChange)).rejects.toThrow('Database constraint violation');
    });
  });

  describe('Retry Logic', () => {
    test('should identify retryable errors', () => {
      const retryableErrors = [
        new Error('ECONNRESET'),
        new Error('network error occurred'),
        new Error('connection timeout'),
        new Error('rate limit exceeded')
      ];

      const nonRetryableErrors = [
        new Error('validation failed'),
        new Error('permission denied'),
        new Error('resource not found')
      ];

      retryableErrors.forEach(error => {
        // @ts-ignore
        expect(syncEngine.isRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        // @ts-ignore
        expect(syncEngine.isRetryableError(error)).toBe(false);
      });
    });

    test('should add failed items to retry queue', () => {
      const failedChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      // @ts-ignore
      syncEngine.addToRetryQueue(failedChange);
      
      // @ts-ignore
      expect(syncEngine.retryQueue.has(failedChange.id)).toBe(true);
      
      // @ts-ignore
      const queueItem = syncEngine.retryQueue.get(failedChange.id);
      expect(queueItem?.retryCount).toBe(1);
      expect(queueItem?.change).toEqual(failedChange);
    });

    test('should respect max retry limit', () => {
      const failedChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      // Simulate multiple retry attempts
      for (let i = 0; i < 5; i++) {
        // @ts-ignore
        syncEngine.addToRetryQueue(failedChange);
      }

      // After max retries (3), item should be removed from queue
      // @ts-ignore
      expect(syncEngine.retryQueue.has(failedChange.id)).toBe(false);
    });

    test('should calculate exponential backoff delay', () => {
      const change: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      const baseDelay = 1000;
      const engine = new OfflineSyncEngine(mockSupabase, { retryDelay: baseDelay });

      // @ts-ignore
      engine.addToRetryQueue(change);
      // @ts-ignore
      let queueItem = engine.retryQueue.get(change.id);
      let expectedDelay = baseDelay * Math.pow(2, 0); // First retry
      expect(queueItem?.nextRetry.getTime()).toBeGreaterThan(Date.now() + expectedDelay - 100);

      // @ts-ignore
      engine.addToRetryQueue(change);
      // @ts-ignore
      queueItem = engine.retryQueue.get(change.id);
      expectedDelay = baseDelay * Math.pow(2, 1); // Second retry
      expect(queueItem?.nextRetry.getTime()).toBeGreaterThan(Date.now() + expectedDelay - 100);
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate correct throughput metrics', async () => {
      const changes: SyncChange[] = Array.from({ length: 10 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        action: 'create' as const,
        table: 'clients',
        data: { name: `Client ${i}` },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      }));

      // Mock successful processing
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
          })
        })
      });

      const startTime = Date.now();
      const result = await syncEngine.processSyncBatch(changes, mockSessionId);
      const endTime = Date.now();

      expect(result.metrics.processingTime).toBeGreaterThan(0);
      expect(result.metrics.processingTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
      expect(result.metrics.throughput).toBeGreaterThan(0);
      expect(result.metrics.itemsProcessed).toBe(10);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      const invalidChanges = [
        {
          id: 'invalid-id',
          action: 'invalid-action',
          table: '',
          data: {},
          timestamp: 'invalid-timestamp',
          userId: 'invalid-user-id'
        }
      ];

      await expect(syncEngine.processSyncBatch(invalidChanges as any, mockSessionId))
        .rejects.toThrow('Invalid sync changes');
    });

    test('should handle database connection errors', async () => {
      const validChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.rpc.mockRejectedValue(new Error('Connection refused'));

      await expect(syncEngine.processSyncBatch([validChange], mockSessionId))
        .rejects.toThrow('Connection refused');
    });

    test('should rollback transaction on processing error', async () => {
      const validChange: SyncChange = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'create',
        table: 'clients',
        data: { name: 'Test Client' },
        timestamp: new Date().toISOString(),
        userId: mockUserId
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null }) // begin
        .mockResolvedValueOnce({ data: null, error: null }); // rollback

      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      await expect(syncEngine.processSyncBatch([validChange], mockSessionId))
        .rejects.toThrow('Database error');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_sync_transaction', {
        p_session_id: mockSessionId,
        p_error: 'Database error'
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle mixed success and failure scenario', async () => {
      const changes: SyncChange[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          action: 'create',
          table: 'clients',
          data: { name: 'Success Client' },
          timestamp: new Date().toISOString(),
          userId: mockUserId
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          action: 'update',
          table: 'clients',
          data: { name: 'Conflict Client' },
          timestamp: '2024-01-01T10:00:00Z',
          userId: mockUserId
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'create',
          table: 'clients',
          data: { name: 'Failure Client' },
          timestamp: new Date().toISOString(),
          userId: mockUserId
        }
      ];

      // Mock transaction operations
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { transaction_id: 'tx-123' }, error: null }) // begin
        .mockResolvedValueOnce({ data: null, error: null }); // commit

      // Mock conflict detection
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // no conflict
        .mockResolvedValueOnce({ // conflict detected
          data: { 
            id: changes[1].id, 
            name: 'Server Name', 
            updated_at: '2024-01-01T11:00:00Z' 
          }, 
          error: null 
        })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // no conflict

      // Mock database operations
      mockSupabase.from
        .mockReturnValueOnce({ // Success case
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: changes[0].id }, error: null })
            })
          })
        })
        .mockReturnValueOnce({ // Conflict resolution
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: changes[1].id }, error: null })
                })
              })
            })
          })
        })
        .mockReturnValueOnce({ // Failure case
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('Constraint violation') })
            })
          })
        });

      const result = await syncEngine.processSyncBatch(changes, mockSessionId);

      expect(result.success).toBe(true);
      expect(result.processed).toHaveLength(2); // Success + resolved conflict
      expect(result.conflicts).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(result.metrics.conflictCount).toBe(1);
      expect(result.metrics.errorCount).toBe(1);
    });
  });
});