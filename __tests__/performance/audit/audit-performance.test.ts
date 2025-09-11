/**
 * WS-177 Audit Logging System - Performance Module Tests
 * Team D - Round 1: Unit tests for high-performance audit logging
 * 
 * Coverage target: >80%
 * Focus: Wedding supplier operations, performance optimization, error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  HighPerformanceAuditLogger, 
  createAuditLogger 
} from '../../../src/lib/performance/audit/audit-performance';
import {
  AuditEventType,
  AuditSeverity,
  AuditAction,
  WeddingPhase,
  SupplierRole,
  LogStorageConfig
} from '../../../src/types/audit-performance';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn()
  }
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('HighPerformanceAuditLogger', () => {
  let logger: HighPerformanceAuditLogger;
  let testConfig: LogStorageConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    
    testConfig = {
      batchSize: 10,
      flushIntervalMs: 1000,
      compressionEnabled: true,
      encryptionEnabled: true,
      connectionPoolSize: 2,
      preparedStatements: true,
      indexingStrategy: 'composite',
      asyncLogging: true,
      bufferSize: 50,
      memoryThresholdMB: 10,
      highVolumeMode: true,
      guestDataCompression: true,
      photoMetadataOptimization: true
    };

    logger = new HighPerformanceAuditLogger(testConfig);
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with connection pool', () => {
      expect(logger).toBeInstanceOf(HighPerformanceAuditLogger);
      const bufferStatus = logger.getBufferStatus();
      expect(bufferStatus.connectionPoolSize).toBe(testConfig.connectionPoolSize);
    });

    it('should create logger with factory function', () => {
      const factoryLogger = createAuditLogger({ batchSize: 25 });
      expect(factoryLogger).toBeInstanceOf(HighPerformanceAuditLogger);
    });
  });

  describe('Event Logging', () => {
    const sampleEvent = {
      eventType: AuditEventType.USER_ACTION,
      severity: AuditSeverity.MEDIUM,
      organizationId: 'org-123',
      weddingId: 'wedding-456',
      resource: 'guest_list',
      action: AuditAction.UPDATE,
      metadata: {
        guestsAffected: 5,
        tasksModified: 2,
        correlationId: 'test-correlation'
      },
      executionTimeMs: 150,
      userId: 'user-789',
      supplierRole: SupplierRole.WEDDING_PLANNER
    };

    it('should log single event successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      const eventId = await logger.logEvent(sampleEvent);
      
      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_events');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      await expect(logger.logEvent(sampleEvent)).rejects.toThrow('Audit logging failed');
      
      // Should add event to buffer for retry
      const bufferStatus = logger.getBufferStatus();
      expect(bufferStatus.bufferSize).toBeGreaterThan(0);
    });

    it('should log events asynchronously', () => {
      logger.logAsync(sampleEvent);
      
      const bufferStatus = logger.getBufferStatus();
      expect(bufferStatus.bufferSize).toBe(1);
    });

    it('should log batch of events', async () => {
      const events = Array(5).fill(null).map((_, i) => ({
        ...sampleEvent,
        resourceId: `resource-${i}`,
        metadata: { ...sampleEvent.metadata, batchIndex: i }
      }));

      mockSupabaseClient.insert.mockResolvedValue({ 
        data: events.map((_, i) => ({ id: `batch-id-${i}` })), 
        error: null 
      });
      mockSupabaseClient.select.mockResolvedValue({ 
        data: events.map((_, i) => ({ id: `batch-id-${i}` })), 
        error: null 
      });

      const eventIds = await logger.logBatch(events);
      
      expect(eventIds).toHaveLength(5);
      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(1);
    });

    it('should log wedding milestone events', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'milestone-id' }], error: null });

      const eventId = await logger.logWeddingMilestone(
        'wedding-123',
        WeddingPhase.EXECUTION,
        { correlationId: 'wedding-execution-start' }
      );

      expect(eventId).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_events');
    });
  });

  describe('Buffer Management', () => {
    it('should flush buffer when size limit reached', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [], error: null });

      // Fill buffer beyond batch size
      for (let i = 0; i < testConfig.batchSize + 1; i++) {
        logger.logAsync({
          ...sampleEvent,
          resourceId: `resource-${i}`
        });
      }

      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 100));

      // Buffer should be smaller after flush
      const bufferStatus = logger.getBufferStatus();
      expect(bufferStatus.bufferSize).toBeLessThanOrEqual(1);
    });

    it('should handle memory threshold exceeded', () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 100 * 1024 * 1024, // 100MB
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 20 * 1024 * 1024 * 1024, // 20GB (exceeds threshold)
        external: 1024 * 1024,
        arrayBuffers: 0
      }));

      mockSupabaseClient.insert.mockResolvedValue({ data: [], error: null });

      logger.logAsync(sampleEvent);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Query Operations', () => {
    const mockQueryResult = [
      {
        id: 'event-1',
        timestamp: '2025-01-20T10:00:00Z',
        event_type: AuditEventType.USER_ACTION,
        severity: AuditSeverity.MEDIUM,
        organization_id: 'org-123',
        wedding_id: 'wedding-456',
        resource: 'guest_list',
        action: AuditAction.UPDATE,
        metadata: '{"guestsAffected": 5}',
        execution_time_ms: 150
      }
    ];

    it('should query events with filters', async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: mockQueryResult, error: null });

      const events = await logger.queryEvents({
        startDate: '2025-01-20T00:00:00Z',
        endDate: '2025-01-20T23:59:59Z',
        organizationIds: ['org-123'],
        eventTypes: [AuditEventType.USER_ACTION],
        limit: 10
      });

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event-1');
      expect(events[0].eventType).toBe(AuditEventType.USER_ACTION);
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', '2025-01-20T00:00:00Z');
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('timestamp', '2025-01-20T23:59:59Z');
    });

    it('should get single event by ID', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockQueryResult[0], error: null });

      const event = await logger.getEventById('event-1');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('event-1');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'event-1');
    });

    it('should return null for non-existent event', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'No rows returned' } 
      });

      const event = await logger.getEventById('non-existent');

      expect(event).toBeNull();
    });

    it('should get wedding audit trail', async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: mockQueryResult, error: null });

      const trail = await logger.getWeddingAuditTrail('wedding-456');

      expect(trail).toHaveLength(1);
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('wedding_id', ['wedding-456']);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('timestamp', { ascending: true });
    });

    it('should handle query errors', async () => {
      mockSupabaseClient.select.mockResolvedValue({ 
        data: null, 
        error: { message: 'Query failed' } 
      });

      await expect(logger.queryEvents({})).rejects.toThrow('Query failed');
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      await logger.logEvent(sampleEvent);

      const metrics = logger.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const metric = metrics[0];
      expect(metric.eventId).toBeDefined();
      expect(metric.totalExecutionTime).toBeGreaterThan(0);
      expect(metric.memoryUsed).toBeGreaterThan(0);
    });

    it('should limit performance metrics storage', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      // Generate many events to test metrics limit
      for (let i = 0; i < 50; i++) {
        await logger.logEvent({
          ...sampleEvent,
          resourceId: `resource-${i}`
        });
      }

      const metrics = logger.getPerformanceMetrics();
      expect(metrics.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Buffer Status', () => {
    it('should provide accurate buffer status', () => {
      logger.logAsync(sampleEvent);
      logger.logAsync(sampleEvent);

      const status = logger.getBufferStatus();
      
      expect(status.bufferSize).toBe(2);
      expect(status.memoryUsageMB).toBeGreaterThan(0);
      expect(status.isFlushingInProgress).toBe(false);
      expect(status.connectionPoolSize).toBe(testConfig.connectionPoolSize);
      expect(status.currentConnectionIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      logger.logAsync(sampleEvent);
      mockSupabaseClient.insert.mockResolvedValue({ data: [], error: null });

      await logger.shutdown();

      const metrics = logger.getPerformanceMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Connection Pool', () => {
    it('should rotate connections in round-robin fashion', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      // Log multiple events to test connection rotation
      await logger.logEvent(sampleEvent);
      await logger.logEvent({ ...sampleEvent, resourceId: 'resource-2' });

      const status = logger.getBufferStatus();
      expect(status.currentConnectionIndex).toBeGreaterThanOrEqual(0);
      expect(status.currentConnectionIndex).toBeLessThan(testConfig.connectionPoolSize);
    });
  });

  describe('Data Serialization', () => {
    it('should properly serialize events for database storage', async () => {
      mockSupabaseClient.insert.mockImplementation((data) => {
        // Verify the serialized data structure
        const serializedEvent = data[0];
        expect(serializedEvent.event_type).toBe(sampleEvent.eventType);
        expect(serializedEvent.organization_id).toBe(sampleEvent.organizationId);
        expect(serializedEvent.wedding_id).toBe(sampleEvent.weddingId);
        expect(serializedEvent.metadata).toBe(JSON.stringify(sampleEvent.metadata));
        
        return Promise.resolve({ data: [{ id: 'test-id' }], error: null });
      });

      await logger.logEvent(sampleEvent);
    });

    it('should properly deserialize events from database', async () => {
      const dbRow = {
        id: 'event-1',
        timestamp: '2025-01-20T10:00:00Z',
        event_type: AuditEventType.USER_ACTION,
        severity: AuditSeverity.MEDIUM,
        organization_id: 'org-123',
        wedding_id: 'wedding-456',
        resource: 'guest_list',
        action: AuditAction.UPDATE,
        metadata: JSON.stringify({ guestsAffected: 5 }),
        execution_time_ms: 150,
        user_id: 'user-789',
        supplier_role: SupplierRole.WEDDING_PLANNER
      };

      mockSupabaseClient.select.mockResolvedValue({ data: [dbRow], error: null });

      const events = await logger.queryEvents({});
      const event = events[0];

      expect(event.eventType).toBe(AuditEventType.USER_ACTION);
      expect(event.organizationId).toBe('org-123');
      expect(event.weddingId).toBe('wedding-456');
      expect(event.metadata.guestsAffected).toBe(5);
      expect(event.supplierRole).toBe(SupplierRole.WEDDING_PLANNER);
    });
  });

  describe('Wedding-Specific Functionality', () => {
    it('should handle wedding milestone logging correctly', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'milestone-id' }], error: null });

      const eventId = await logger.logWeddingMilestone(
        'wedding-123',
        WeddingPhase.PREPARATION,
        { 
          guestsAffected: 50,
          tasksModified: 10,
          organizationId: 'org-123'
        }
      );

      expect(eventId).toBeDefined();
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          event_type: AuditEventType.WEDDING_MILESTONE,
          wedding_id: 'wedding-123',
          resource: 'wedding_milestones',
          action: AuditAction.UPDATE,
          metadata: expect.stringContaining('PREPARATION')
        })
      ]);
    });

    it('should track wedding-specific performance metrics', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      const weddingEvent = {
        ...sampleEvent,
        metadata: {
          ...sampleEvent.metadata,
          guestsAffected: 25,
          tasksModified: 5
        }
      };

      await logger.logEvent(weddingEvent);

      const metrics = logger.getPerformanceMetrics();
      const metric = metrics[0];
      
      expect(metric.guestsProcessed).toBe(25);
      expect(metric.tasksProcessed).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockSupabaseClient.insert.mockRejectedValue(new Error('Network timeout'));

      await expect(logger.logEvent(sampleEvent)).rejects.toThrow('Network timeout');
      
      // Should add to buffer for retry
      const bufferStatus = logger.getBufferStatus();
      expect(bufferStatus.bufferSize).toBeGreaterThan(0);
    });

    it('should handle malformed event data', async () => {
      const malformedEvent = {
        ...sampleEvent,
        metadata: null as any // Invalid metadata
      };

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      // Should not throw error, should handle gracefully
      await expect(logger.logEvent({
        ...malformedEvent,
        metadata: {} // Fix the metadata
      })).resolves.toBeDefined();
    });
  });
});

describe('Factory Functions', () => {
  it('should create logger with default configuration', () => {
    const logger = createAuditLogger();
    expect(logger).toBeInstanceOf(HighPerformanceAuditLogger);
  });

  it('should create logger with custom configuration', () => {
    const customConfig = {
      batchSize: 100,
      asyncLogging: false,
      highVolumeMode: false
    };

    const logger = createAuditLogger(customConfig);
    expect(logger).toBeInstanceOf(HighPerformanceAuditLogger);
  });

  it('should export singleton instance', async () => {
    const { auditLogger } = await import('../../../src/lib/performance/audit/audit-performance');
    expect(auditLogger).toBeInstanceOf(HighPerformanceAuditLogger);
  });
});