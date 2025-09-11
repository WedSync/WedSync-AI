import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealTimeAISync } from '@/lib/integrations/ai/real-time-ai-sync';
import type {
  RealTimeSyncConfig,
  SyncConflictResolution,
  HealthCheckResult,
  SyncStatusUpdate,
} from '@/lib/integrations/ai/types';

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: [],
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    channel: vi.fn(() => ({
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      send: vi.fn(),
    })),
  })),
}));

vi.mock('@/lib/integrations/ai/external-ai-services', () => ({
  ExternalAIServices: {
    resolveDataConflict: vi.fn(),
    validateSyncData: vi.fn(),
    optimizeSyncStrategy: vi.fn(),
  },
}));

describe('RealTimeAISync', () => {
  let realTimeSync: RealTimeAISync;
  const mockConfig: RealTimeSyncConfig = {
    organizationId: 'org_123',
    syncSources: [
      {
        sourceId: 'crm-integration',
        type: 'crm',
        endpoint: 'https://api.crm.com/webhook',
        credentials: { apiKey: 'crm_key_123' },
      },
      {
        sourceId: 'payment-integration',
        type: 'payment',
        endpoint: 'https://api.stripe.com/webhook',
        credentials: { apiKey: 'stripe_key_123' },
      },
      {
        sourceId: 'calendar-integration',
        type: 'calendar',
        endpoint: 'https://api.google.com/calendar/webhook',
        credentials: { apiKey: 'google_key_123' },
      },
    ],
    conflictResolution: {
      strategy: 'timestamp-based',
      priorityOrder: [
        'crm-integration',
        'payment-integration',
        'calendar-integration',
      ],
      aiAssisted: true,
      manualReviewThreshold: 0.7,
    },
    performance: {
      batchSize: 100,
      maxLatency: 1000,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
      },
    },
    monitoring: {
      healthCheckInterval: 30000,
      alertThresholds: {
        errorRate: 0.05,
        latency: 2000,
        queueSize: 1000,
      },
    },
  };

  beforeEach(() => {
    realTimeSync = new RealTimeAISync();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real-Time Sync Initialization', () => {
    it('should initialize real-time sync successfully', async () => {
      const result = await realTimeSync.initializeRealTimeSync(mockConfig);

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(mockConfig.organizationId);
      expect(result.activeSources).toBe(mockConfig.syncSources.length);
      expect(result.syncEngineId).toBeDefined();
    });

    it('should establish WebSocket connections for all sources', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const connections = await realTimeSync.getActiveConnections('org_123');

      expect(connections.length).toBe(mockConfig.syncSources.length);
      expect(connections.every((conn) => conn.status === 'connected')).toBe(
        true,
      );
    });

    it('should handle partial connection failures', async () => {
      const configWithFailedSource = {
        ...mockConfig,
        syncSources: [
          ...mockConfig.syncSources,
          {
            sourceId: 'failed-integration',
            type: 'crm' as const,
            endpoint: 'https://invalid.endpoint.com',
            credentials: { apiKey: 'invalid_key' },
          },
        ],
      };

      const result = await realTimeSync.initializeRealTimeSync(
        configWithFailedSource,
      );

      expect(result.success).toBe(true); // Should succeed partially
      expect(result.activeSources).toBe(3); // Only successful connections
      expect(result.failedSources).toHaveLength(1);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Data Synchronization Engine', () => {
    const testSyncData = {
      sourceId: 'crm-integration',
      eventType: 'lead.updated',
      data: {
        leadId: 'lead_123',
        status: 'qualified',
        lastModified: new Date().toISOString(),
        changes: {
          field: 'budget',
          oldValue: 15000,
          newValue: 18000,
        },
      },
      metadata: {
        userId: 'user_456',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };

    it('should process incoming sync data', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const result = await realTimeSync.processSyncData(
        'org_123',
        testSyncData,
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.processingTime).toBeLessThan(
        mockConfig.performance.maxLatency,
      );
      expect(result.syncId).toBeDefined();
    });

    it('should validate sync data before processing', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const invalidData = {
        ...testSyncData,
        data: null, // Invalid data
        sourceId: '', // Invalid source
      };

      const result = await realTimeSync.processSyncData('org_123', invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Invalid sync data format');
      expect(result.validationFailed).toBe(true);
    });

    it('should handle high-volume sync operations', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const batchData = Array(200)
        .fill(null)
        .map((_, index) => ({
          ...testSyncData,
          data: { ...testSyncData.data, leadId: `lead_${index}` },
        }));

      const result = await realTimeSync.processSyncBatch('org_123', batchData);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(200);
      expect(result.batchesCreated).toBeGreaterThan(1); // Should split into batches
      expect(result.totalProcessingTime).toBeDefined();
    });

    it('should maintain sync order for related data', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const orderedData = [
        {
          ...testSyncData,
          data: { ...testSyncData.data, leadId: 'lead_123', version: 1 },
        },
        {
          ...testSyncData,
          data: { ...testSyncData.data, leadId: 'lead_123', version: 2 },
        },
        {
          ...testSyncData,
          data: { ...testSyncData.data, leadId: 'lead_123', version: 3 },
        },
      ];

      const results = await Promise.all(
        orderedData.map((data) =>
          realTimeSync.processSyncData('org_123', data),
        ),
      );

      expect(results.every((r) => r.success)).toBe(true);

      // Verify order was maintained
      const syncOrder = await realTimeSync.getSyncOrder('org_123', 'lead_123');
      expect(syncOrder.inOrder).toBe(true);
      expect(syncOrder.versions).toEqual([1, 2, 3]);
    });
  });

  describe('Conflict Resolution System', () => {
    const conflictScenario = {
      entityId: 'lead_123',
      conflicts: [
        {
          sourceId: 'crm-integration',
          field: 'budget',
          value: 20000,
          timestamp: new Date('2024-01-15T10:00:00Z'),
          confidence: 0.9,
        },
        {
          sourceId: 'payment-integration',
          field: 'budget',
          value: 18000,
          timestamp: new Date('2024-01-15T10:05:00Z'),
          confidence: 0.8,
        },
      ],
      resolutionContext: {
        entityType: 'lead',
        organizationId: 'org_123',
        userPreferences: { preferLatest: true },
      },
    };

    it('should detect data conflicts', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const result = await realTimeSync.detectConflicts(
        'org_123',
        conflictScenario,
      );

      expect(result.conflictsDetected).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].field).toBe('budget');
    });

    it('should resolve conflicts using timestamp strategy', async () => {
      const resolution: SyncConflictResolution = {
        conflictId: 'conflict_123',
        strategy: 'timestamp-based',
        context: conflictScenario.resolutionContext,
      };

      const result = await realTimeSync.resolveConflict(resolution);

      expect(result.resolved).toBe(true);
      expect(result.chosenValue).toBe(18000); // Later timestamp wins
      expect(result.chosenSource).toBe('payment-integration');
      expect(result.reasoning).toBeDefined();
    });

    it('should use AI assistance for complex conflicts', async () => {
      const complexConflict = {
        ...conflictScenario,
        conflicts: [
          ...conflictScenario.conflicts,
          {
            sourceId: 'calendar-integration',
            field: 'budget',
            value: 22000,
            timestamp: new Date('2024-01-15T09:55:00Z'),
            confidence: 0.95,
          },
        ],
      };

      const resolution: SyncConflictResolution = {
        conflictId: 'conflict_complex',
        strategy: 'ai-assisted',
        context: complexConflict.resolutionContext,
      };

      const result = await realTimeSync.resolveConflict(resolution);

      expect(result.resolved).toBe(true);
      expect(result.aiAssisted).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0.7);
      expect(result.reasoning).toContain('AI analysis');
    });

    it('should escalate conflicts requiring manual review', async () => {
      const highConflictScenario = {
        ...conflictScenario,
        conflicts: conflictScenario.conflicts.map((c) => ({
          ...c,
          confidence: 0.5, // Low confidence
        })),
      };

      const resolution: SyncConflictResolution = {
        conflictId: 'conflict_manual',
        strategy: 'ai-assisted',
        context: highConflictScenario.resolutionContext,
      };

      const result = await realTimeSync.resolveConflict(resolution);

      expect(result.requiresManualReview).toBe(true);
      expect(result.escalated).toBe(true);
      expect(result.assignedTo).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor sync performance metrics', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const metrics = await realTimeSync.getPerformanceMetrics('org_123');

      expect(metrics.totalSyncs).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.errorBreakdown).toBeDefined();
    });

    it('should track latency across different sync operations', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const latencyMetrics = await realTimeSync.getLatencyMetrics('org_123');

      expect(latencyMetrics.p50).toBeDefined();
      expect(latencyMetrics.p95).toBeDefined();
      expect(latencyMetrics.p99).toBeDefined();
      expect(latencyMetrics.max).toBeDefined();
      expect(latencyMetrics.bySource).toBeDefined();
    });

    it('should alert when performance thresholds are exceeded', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      // Simulate high latency
      await realTimeSync.simulateHighLatency('org_123', 3000);

      const alerts = await realTimeSync.getPerformanceAlerts('org_123');

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('high-latency');
      expect(alerts[0].threshold).toBe(2000);
      expect(alerts[0].actual).toBe(3000);
    });
  });

  describe('Health Monitoring System', () => {
    it('should perform comprehensive health checks', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const health: HealthCheckResult =
        await realTimeSync.performHealthCheck('org_123');

      expect(health.overall).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(health.components).toBeDefined();
      expect(health.components.database).toBeDefined();
      expect(health.components.websockets).toBeDefined();
      expect(health.components.syncEngine).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    it('should detect unhealthy components', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      // Simulate component failure
      await realTimeSync.simulateComponentFailure('org_123', 'database');

      const health = await realTimeSync.performHealthCheck('org_123');

      expect(health.overall).toBe('unhealthy');
      expect(health.components.database.status).toBe('unhealthy');
      expect(health.components.database.error).toBeDefined();
    });

    it('should provide recovery recommendations', async () => {
      await realTimeSync.simulateComponentFailure('org_123', 'websockets');

      const health = await realTimeSync.performHealthCheck('org_123');
      const recovery = await realTimeSync.getRecoveryRecommendations(
        'org_123',
        health,
      );

      expect(recovery.recommendations).toBeDefined();
      expect(recovery.recommendations.length).toBeGreaterThan(0);
      expect(recovery.priority).toBeDefined();
      expect(recovery.estimatedRecoveryTime).toBeDefined();
    });

    it('should auto-recover from transient failures', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      // Simulate transient failure
      await realTimeSync.simulateTransientFailure('org_123');

      // Wait for auto-recovery
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const health = await realTimeSync.performHealthCheck('org_123');
      expect(health.overall).toBe('healthy');

      const recovery = await realTimeSync.getRecoveryLog('org_123');
      expect(recovery.autoRecoveryAttempts).toBeGreaterThan(0);
      expect(recovery.lastRecovery).toBeDefined();
    });
  });

  describe('Sync Status and Reporting', () => {
    it('should provide real-time sync status updates', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const status = await realTimeSync.getSyncStatus('org_123');

      expect(status.organizationId).toBe('org_123');
      expect(status.overallStatus).toBeOneOf(['active', 'paused', 'error']);
      expect(status.sourceStatuses).toBeDefined();
      expect(status.lastSync).toBeDefined();
      expect(status.queueSize).toBeGreaterThanOrEqual(0);
    });

    it('should generate sync activity reports', async () => {
      const report = await realTimeSync.generateSyncReport('org_123', {
        timeframe: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        includeDetails: true,
      });

      expect(report.success).toBe(true);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalSyncs).toBeGreaterThanOrEqual(0);
      expect(report.summary.successRate).toBeGreaterThanOrEqual(0);
      expect(report.details).toBeDefined();
    });

    it('should track sync progress for long-running operations', async () => {
      const operationId = 'bulk-sync-123';

      const progress = await realTimeSync.trackSyncProgress(operationId);

      expect(progress.operationId).toBe(operationId);
      expect(progress.status).toBeOneOf([
        'pending',
        'running',
        'completed',
        'failed',
      ]);
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
      expect(progress.eta).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket disconnections gracefully', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      // Simulate WebSocket disconnection
      const disconnectResult = await realTimeSync.simulateDisconnection(
        'org_123',
        'crm-integration',
      );

      expect(disconnectResult.handled).toBe(true);
      expect(disconnectResult.reconnectAttempted).toBe(true);
      expect(disconnectResult.bufferingEnabled).toBe(true);
    });

    it('should implement exponential backoff for reconnections', async () => {
      const reconnectResult = await realTimeSync.attemptReconnection(
        'org_123',
        'crm-integration',
        {
          attempt: 3,
          lastAttempt: new Date(Date.now() - 8000), // 8 seconds ago
        },
      );

      expect(reconnectResult.nextAttemptIn).toBeGreaterThan(4000); // Exponential backoff
      expect(reconnectResult.maxAttemptsReached).toBe(false);
      expect(reconnectResult.backoffApplied).toBe(true);
    });

    it('should buffer data during connection outages', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);
      await realTimeSync.simulateDisconnection('org_123', 'crm-integration');

      // Send data while disconnected
      const bufferedData = {
        sourceId: 'crm-integration',
        eventType: 'lead.created',
        data: { leadId: 'lead_buffered_123' },
      };

      const result = await realTimeSync.processSyncData(
        'org_123',
        bufferedData,
      );

      expect(result.buffered).toBe(true);
      expect(result.bufferSize).toBeGreaterThan(0);

      // Simulate reconnection
      await realTimeSync.simulateReconnection('org_123', 'crm-integration');

      const flushResult = await realTimeSync.flushBuffer(
        'org_123',
        'crm-integration',
      );
      expect(flushResult.itemsFlushed).toBe(1);
      expect(flushResult.success).toBe(true);
    });

    it('should handle data corruption and integrity issues', async () => {
      const corruptData = {
        sourceId: 'crm-integration',
        eventType: 'lead.updated',
        data: '<<<corrupted data>>>', // Corrupted JSON
        checksum: 'invalid-checksum',
      };

      const result = await realTimeSync.processSyncData('org_123', corruptData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('data-corruption');
      expect(result.recoveryAction).toBe('request-resync');
      expect(result.quarantined).toBe(true);
    });
  });

  describe('Scalability and Load Management', () => {
    it('should handle concurrent sync operations', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const concurrentOps = Array(50)
        .fill(null)
        .map((_, index) =>
          realTimeSync.processSyncData('org_123', {
            sourceId: 'crm-integration',
            eventType: 'lead.updated',
            data: { leadId: `concurrent_lead_${index}` },
          }),
        );

      const results = await Promise.all(concurrentOps);

      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.processingTime < 2000)).toBe(true); // Under 2 seconds
    });

    it('should implement queue management for high load', async () => {
      await realTimeSync.initializeRealTimeSync(mockConfig);

      const queueStatus = await realTimeSync.getQueueStatus('org_123');

      expect(queueStatus.size).toBeGreaterThanOrEqual(0);
      expect(queueStatus.processingRate).toBeGreaterThan(0);
      expect(queueStatus.estimatedWaitTime).toBeGreaterThanOrEqual(0);
      expect(queueStatus.priority).toBeDefined();
    });

    it('should auto-scale based on load', async () => {
      const loadMetrics = {
        queueSize: 1500, // Above threshold
        processingRate: 50, // Per second
        avgLatency: 2500, // Above threshold
      };

      const scalingResult = await realTimeSync.evaluateScaling(
        'org_123',
        loadMetrics,
      );

      expect(scalingResult.scaleUp).toBe(true);
      expect(scalingResult.recommendedInstances).toBeGreaterThan(1);
      expect(scalingResult.estimatedImprovement).toBeDefined();
    });
  });
});
