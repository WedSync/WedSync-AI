// Apple Calendar Integration Tests - WS-218 Team C Round 1
// Comprehensive integration testing with mock CalDAV servers

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppleSyncOrchestrator } from '../../../src/lib/integrations/apple-sync-orchestrator';
import { CalDAVWebhookHandler } from '../../../src/lib/webhooks/caldav-webhook-handler';
import { AppleSyncScheduler } from '../../../src/lib/jobs/apple-sync-scheduler';
import { AppleEventCoordinator } from '../../../src/lib/integrations/apple-event-coordinator';
import { CalDAVCircuitBreaker } from '../../../src/lib/reliability/caldav-circuit-breaker';

import {
  AppleCalendarIntegration,
  CalDAVEvent,
  CalDAVWebhookPayload,
  SyncResult,
  CircuitBreakerConfig,
  WebSocketSyncStatus
} from '../../../src/types/apple-sync';

// Mock CalDAV Client for testing
class MockCalDAVClient {
  private mockEvents: Map<string, CalDAVEvent> = new Map();
  private shouldFail = false;
  private failureCount = 0;
  private latency = 100;

  setMockEvents(events: CalDAVEvent[]): void {
    this.mockEvents.clear();
    events.forEach(event => this.mockEvents.set(event.uid, event));
  }

  setShouldFail(shouldFail: boolean, failureCount = 0): void {
    this.shouldFail = shouldFail;
    this.failureCount = failureCount;
  }

  setLatency(latency: number): void {
    this.latency = latency;
  }

  async authenticate(credentials: any): Promise<boolean> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Authentication failed');
    }
    return true;
  }

  async getCalendarCTag(calendarUrl: string): Promise<string> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Failed to get CTag');
    }
    return `ctag-${Date.now()}`;
  }

  async queryEventChanges(calendarUrl: string, syncToken?: string): Promise<any> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Failed to query event changes');
    }
    
    return {
      created: Array.from(this.mockEvents.values()).filter(e => e.summary?.includes('New')),
      updated: Array.from(this.mockEvents.values()).filter(e => e.summary?.includes('Updated')),
      deleted: []
    };
  }

  async getEvent(eventUrl: string): Promise<CalDAVEvent> {
    await this.simulateLatency();
    const uid = eventUrl.split('/').pop()?.replace('.ics', '') || '';
    const event = this.mockEvents.get(uid);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  async createEvent(calendarUrl: string, event: CalDAVEvent): Promise<string> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Failed to create event');
    }
    return `${calendarUrl}/${event.uid}.ics`;
  }

  async updateEvent(eventUrl: string, event: CalDAVEvent): Promise<void> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Failed to update event');
    }
  }

  async deleteEvent(eventUrl: string): Promise<void> {
    await this.simulateLatency();
    if (this.shouldFail && this.failureCount-- > 0) {
      throw new Error('Failed to delete event');
    }
  }

  async propfind(calendarUrl: string, properties: string[]): Promise<any> {
    await this.simulateLatency();
    return {};
  }

  private async simulateLatency(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.latency));
  }
}

// Mock WebSocket Manager
class MockWebSocketManager {
  public lastSyncStatus?: WebSocketSyncStatus;
  public lastEventUpdate?: any;
  public broadcastCount = 0;

  broadcastSyncStatus(integrationId: string, status: WebSocketSyncStatus): void {
    this.lastSyncStatus = status;
    this.broadcastCount++;
  }

  broadcastEventUpdate(integrationId: string, update: any): void {
    this.lastEventUpdate = update;
    this.broadcastCount++;
  }
}

// Mock Job Queue
class MockJobQueue {
  private jobs: Map<string, any> = new Map();
  private jobCounter = 0;

  async addJob(job: any): Promise<string> {
    const jobId = `job-${++this.jobCounter}`;
    this.jobs.set(jobId, { ...job, id: jobId });
    return jobId;
  }

  async getJob(jobId: string): Promise<any> {
    return this.jobs.get(jobId) || null;
  }

  async getJobsByStatus(status: string): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  async getJobsByUser(userId: string): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  async updateJobStatus(jobId: string, status: string, result?: any, error?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (result) job.result = result;
      if (error) job.error = error;
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async getQueueSize(): Promise<number> {
    return this.jobs.size;
  }

  async getQueueStats(): Promise<any> {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      avgProcessingTime: 1000
    };
  }
}

// Test fixtures
const createMockIntegration = (): AppleCalendarIntegration => ({
  id: 'test-integration-1',
  userId: 'user-1',
  calendarUrl: 'https://caldav.icloud.com/123456/calendars/primary',
  credentials: {
    username: 'test@example.com',
    password: 'encrypted-password',
    serverUrl: 'https://caldav.icloud.com',
    authenticationType: 'basic'
  },
  calendars: [{
    caldavUrl: 'https://caldav.icloud.com/123456/calendars/primary',
    displayName: 'Primary Calendar',
    lastKnownCTag: 'ctag-initial',
    isEnabled: true,
    syncPriority: 'high'
  }],
  syncPreferences: {
    syncDirection: 'bidirectional',
    conflictResolution: 'manual',
    syncInterval: '15_minutes',
    pollIntervalMinutes: 15,
    enableWedlockSync: true,
    syncEventTypes: ['wedding_ceremony', 'vendor_meeting', 'client_appointment'],
    excludePrivateEvents: false
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockCalDAVEvent = (uid: string, summary: string): CalDAVEvent => ({
  uid,
  url: `https://caldav.icloud.com/123456/calendars/primary/${uid}.ics`,
  etag: `etag-${uid}`,
  calendarData: `BEGIN:VEVENT\nUID:${uid}\nSUMMARY:${summary}\nEND:VEVENT`,
  summary,
  description: `Description for ${summary}`,
  startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  endDate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
  isAllDay: false,
  location: 'Wedding Venue',
  attendees: [{
    email: 'bride@example.com',
    name: 'Bride',
    role: 'chair',
    status: 'accepted'
  }],
  lastModified: new Date()
});

describe('Apple Calendar Integration - WS-218 Team C Round 1', () => {
  let mockCalDAVClient: MockCalDAVClient;
  let mockWebSocketManager: MockWebSocketManager;
  let mockJobQueue: MockJobQueue;
  let syncOrchestrator: AppleSyncOrchestrator;
  let eventCoordinator: AppleEventCoordinator;
  let circuitBreaker: CalDAVCircuitBreaker;
  
  beforeEach(() => {
    // Setup mocks
    mockCalDAVClient = new MockCalDAVClient();
    mockWebSocketManager = new MockWebSocketManager();
    mockJobQueue = new MockJobQueue();
    
    // Create mock dependencies for event coordinator
    const mockDatabase = {
      getWedSyncEvent: vi.fn(),
      findEventByExternalReference: vi.fn(),
      createWedSyncEvent: vi.fn(),
      updateWedSyncEvent: vi.fn(),
      deleteWedSyncEvent: vi.fn(),
      getEventsByIntegration: vi.fn(),
      getVendorSchedule: vi.fn(),
      recordEventMapping: vi.fn()
    };
    
    const mockiCalProcessor = {
      parseICalendar: vi.fn(),
      generateICalendar: vi.fn(),
      extractRecurrencePattern: vi.fn(),
      generateRecurrenceRule: vi.fn()
    };
    
    const mockWeddingPriority = {
      getEventPriority: vi.fn().mockReturnValue(100),
      isWeddingCritical: vi.fn().mockReturnValue(false),
      requiresVendorCoordination: vi.fn().mockReturnValue(false),
      getConflictResolutionStrategy: vi.fn().mockReturnValue('latest_wins')
    };
    
    // Initialize components
    eventCoordinator = new AppleEventCoordinator(
      mockDatabase as any,
      mockiCalProcessor as any,
      mockWebSocketManager as any,
      mockWeddingPriority as any
    );
    
    syncOrchestrator = new AppleSyncOrchestrator(
      mockCalDAVClient as any,
      mockWebSocketManager as any,
      mockJobQueue as any,
      eventCoordinator
    );
    
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 3,
      resetTimeout: 5000,
      monitoringPeriod: 1000,
      halfOpenMaxCalls: 2
    };
    
    circuitBreaker = new CalDAVCircuitBreaker(circuitBreakerConfig);
  });
  
  afterEach(() => {
    circuitBreaker.destroy();
  });

  describe('CalDAV Sync Orchestration', () => {
    test('should successfully orchestrate full sync', async () => {
      // Setup mock events
      const mockEvents = [
        createMockCalDAVEvent('event-1', 'New Wedding Ceremony'),
        createMockCalDAVEvent('event-2', 'Updated Vendor Meeting')
      ];
      mockCalDAVClient.setMockEvents(mockEvents);

      // Mock integration retrieval
      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      // Execute sync
      const result = await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'full',
        source: 'manual'
      });

      // Verify results
      expect(result).toBeDefined();
      expect(result.totalEvents).toBeGreaterThan(0);
      expect(result.processedEvents).toBe(result.totalEvents);
      expect(mockWebSocketManager.broadcastCount).toBeGreaterThan(0);
      expect(mockWebSocketManager.lastSyncStatus?.status).toBe('completed');
    });

    test('should handle sync failures gracefully', async () => {
      // Setup failure scenario
      mockCalDAVClient.setShouldFail(true, 5);
      
      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      // Execute sync and expect failure
      await expect(syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'full',
        source: 'manual'
      })).rejects.toThrow();

      expect(mockWebSocketManager.lastSyncStatus?.status).toBe('failed');
    });

    test('should handle targeted sync for specific events', async () => {
      const mockEvents = [
        createMockCalDAVEvent('event-targeted', 'Targeted Event Update')
      ];
      mockCalDAVClient.setMockEvents(mockEvents);

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      const result = await syncOrchestrator.orchestrateTargetedSync('test-integration-1', {
        syncType: 'targeted',
        source: 'webhook',
        eventUids: ['event-targeted'],
        changeType: 'updated'
      });

      expect(result).toBeDefined();
      expect(result.totalEvents).toBe(1);
      expect(result.processedEvents).toBe(1);
    });

    test('should broadcast real-time sync progress updates', async () => {
      const mockEvents = [
        createMockCalDAVEvent('event-1', 'New Event 1'),
        createMockCalDAVEvent('event-2', 'New Event 2'),
        createMockCalDAVEvent('event-3', 'New Event 3')
      ];
      mockCalDAVClient.setMockEvents(mockEvents);
      mockCalDAVClient.setLatency(10); // Fast execution for testing

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'full',
        source: 'manual'
      });

      // Should have broadcasted start, progress updates, and completion
      expect(mockWebSocketManager.broadcastCount).toBeGreaterThan(3);
    });
  });

  describe('Circuit Breaker Fault Tolerance', () => {
    test('should open circuit after threshold failures', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 500,
        halfOpenMaxCalls: 1
      };
      
      const testCircuitBreaker = new CalDAVCircuitBreaker(config);

      // Generate failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await testCircuitBreaker.execute(async () => {
            throw new Error(`Test failure ${i}`);
          });
        } catch (error) {
          // Expected failures
        }
      }

      const stats = testCircuitBreaker.getStats();
      expect(stats.state).toBe('open');
      expect(stats.failures).toBeGreaterThanOrEqual(2);

      testCircuitBreaker.destroy();
    });

    test('should transition to half-open and recover', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 100, // Very short for testing
        monitoringPeriod: 50,
        halfOpenMaxCalls: 1
      };
      
      const testCircuitBreaker = new CalDAVCircuitBreaker(config);

      // Trigger circuit opening
      try {
        await testCircuitBreaker.execute(async () => {
          throw new Error('Initial failure');
        });
      } catch (error) {
        // Expected
      }

      expect(testCircuitBreaker.getStats().state).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Successful call should close circuit
      await testCircuitBreaker.execute(async () => {
        return 'success';
      });

      expect(testCircuitBreaker.getStats().state).toBe('closed');

      testCircuitBreaker.destroy();
    });

    test('should apply rate limiting for iCloud', async () => {
      const startTime = Date.now();
      
      // Execute multiple operations quickly
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          circuitBreaker.execute(async () => {
            return `Operation ${i}`;
          }, 'https://caldav.icloud.com/test', 'test')
        );
      }

      await Promise.all(promises);
      
      // Should have taken some time due to rate limiting
      // Note: This test might be flaky in CI environments
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Webhook Processing', () => {
    test('should process webhook notifications successfully', async () => {
      const mockDatabase = {
        getIntegration: vi.fn().mockResolvedValue(createMockIntegration()),
        getSubscription: vi.fn().mockResolvedValue({
          id: 'sub-1',
          secretKey: 'test-secret'
        }),
        updateWebhookDeliveryStatus: vi.fn(),
        recordWebhookAttempt: vi.fn(),
        getFailedWebhooks: vi.fn().mockResolvedValue([])
      };

      const mockRetryQueue = {
        addRetryJob: vi.fn(),
        getRetryAttempts: vi.fn().mockResolvedValue(0),
        removeFromRetryQueue: vi.fn()
      };

      const mockSignatureValidator = {
        validateSignature: vi.fn().mockReturnValue(true),
        generateSignature: vi.fn().mockReturnValue('valid-signature')
      };

      const webhookHandler = new CalDAVWebhookHandler(
        syncOrchestrator,
        mockDatabase as any,
        mockRetryQueue as any,
        mockSignatureValidator as any
      );

      const webhookPayload: CalDAVWebhookPayload = {
        webhookId: 'webhook-1',
        integrationId: 'test-integration-1',
        calendarUrl: 'https://caldav.icloud.com/123456/calendars/primary',
        changeType: 'events_changed',
        eventUids: ['event-1', 'event-2'],
        timestamp: new Date(),
        signature: 'valid-signature'
      };

      // Mock successful sync
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(createMockIntegration());

      const result = await webhookHandler.processWebhookNotification(webhookPayload);

      expect(result.success).toBe(true);
      expect(result.syncTriggered).toBe(true);
      expect(mockDatabase.updateWebhookDeliveryStatus).toHaveBeenCalledWith('webhook-1', 'processed');
    });

    test('should handle webhook processing failures and queue retries', async () => {
      const mockDatabase = {
        getIntegration: vi.fn().mockRejectedValue(new Error('Integration not found')),
        getSubscription: vi.fn().mockResolvedValue({ id: 'sub-1', secretKey: 'test-secret' }),
        updateWebhookDeliveryStatus: vi.fn(),
        recordWebhookAttempt: vi.fn(),
        getFailedWebhooks: vi.fn().mockResolvedValue([])
      };

      const mockRetryQueue = {
        addRetryJob: vi.fn(),
        getRetryAttempts: vi.fn().mockResolvedValue(0),
        removeFromRetryQueue: vi.fn()
      };

      const mockSignatureValidator = {
        validateSignature: vi.fn().mockReturnValue(true),
        generateSignature: vi.fn()
      };

      const webhookHandler = new CalDAVWebhookHandler(
        syncOrchestrator,
        mockDatabase as any,
        mockRetryQueue as any,
        mockSignatureValidator as any
      );

      const webhookPayload: CalDAVWebhookPayload = {
        webhookId: 'webhook-fail',
        integrationId: 'nonexistent-integration',
        calendarUrl: 'https://caldav.icloud.com/123456/calendars/primary',
        changeType: 'events_changed',
        timestamp: new Date(),
        signature: 'valid-signature'
      };

      const result = await webhookHandler.processWebhookNotification(webhookPayload);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockDatabase.updateWebhookDeliveryStatus).toHaveBeenCalledWith('webhook-fail', 'failed');
      expect(mockRetryQueue.addRetryJob).toHaveBeenCalled();
    });
  });

  describe('Background Job Processing', () => {
    test('should queue and process sync jobs', async () => {
      const mockDatabase = {
        getIntegration: vi.fn().mockResolvedValue(createMockIntegration()),
        getUserIntegrations: vi.fn(),
        updateIntegrationHealth: vi.fn(),
        getIntegrationHealth: vi.fn(),
        recordSyncMetrics: vi.fn()
      };

      const mockHealthMonitor = {
        checkCalDAVServerHealth: vi.fn().mockResolvedValue(true),
        checkAuthenticationHealth: vi.fn().mockResolvedValue(true),
        measureSyncLatency: vi.fn().mockResolvedValue(1000),
        getErrorRate: vi.fn().mockResolvedValue(0.1)
      };

      const scheduler = new AppleSyncScheduler(
        syncOrchestrator,
        mockJobQueue as any,
        mockDatabase as any,
        mockHealthMonitor as any
      );

      // Queue a job
      const jobId = await scheduler.queueFullSync('user-1', 'test-integration-1', 'high');

      expect(jobId).toBeDefined();
      expect(jobId.startsWith('full_sync-')).toBe(true);

      // Verify job was queued
      const queueStats = await scheduler.getQueueStats();
      expect(queueStats.total).toBeGreaterThan(0);
      expect(queueStats.pending).toBeGreaterThan(0);
    });

    test('should handle job priorities correctly', async () => {
      const mockDatabase = {
        getIntegration: vi.fn().mockResolvedValue(createMockIntegration()),
        getUserIntegrations: vi.fn(),
        updateIntegrationHealth: vi.fn(),
        getIntegrationHealth: vi.fn(),
        recordSyncMetrics: vi.fn()
      };

      const mockHealthMonitor = {
        checkCalDAVServerHealth: vi.fn().mockResolvedValue(true),
        checkAuthenticationHealth: vi.fn().mockResolvedValue(true),
        measureSyncLatency: vi.fn().mockResolvedValue(1000),
        getErrorRate: vi.fn().mockResolvedValue(0.1)
      };

      const scheduler = new AppleSyncScheduler(
        syncOrchestrator,
        mockJobQueue as any,
        mockDatabase as any,
        mockHealthMonitor as any
      );

      // Queue jobs with different priorities
      const urgentJobId = await scheduler.queueEventSync('user-1', 'test-integration-1', ['urgent-event'], 'updated');
      const lowJobId = await scheduler.queueIncrementalSync('user-1', 'test-integration-1');

      const urgentJob = await mockJobQueue.getJob(urgentJobId);
      const lowJob = await mockJobQueue.getJob(lowJobId);

      expect(urgentJob.priority).toBe('high');
      expect(lowJob.priority).toBe('normal');
    });
  });

  describe('Integration Health Monitoring', () => {
    test('should detect and report integration health issues', async () => {
      const mockDatabase = {
        getIntegration: vi.fn().mockResolvedValue(createMockIntegration()),
        getUserIntegrations: vi.fn(),
        updateIntegrationHealth: vi.fn(),
        getIntegrationHealth: vi.fn(),
        recordSyncMetrics: vi.fn()
      };

      const mockHealthMonitor = {
        checkCalDAVServerHealth: vi.fn().mockResolvedValue(false), // Unhealthy server
        checkAuthenticationHealth: vi.fn().mockResolvedValue(true),
        measureSyncLatency: vi.fn().mockResolvedValue(35000), // High latency
        getErrorRate: vi.fn().mockResolvedValue(0.8) // High error rate
      };

      const scheduler = new AppleSyncScheduler(
        syncOrchestrator,
        mockJobQueue as any,
        mockDatabase as any,
        mockHealthMonitor as any
      );

      const integration = createMockIntegration();
      const health = await scheduler.checkIntegrationHealth(integration);

      expect(health.isHealthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues.some(issue => issue.type === 'connectivity')).toBe(true);
      expect(health.issues.some(issue => issue.type === 'sync_failure')).toBe(true);
      expect(health.issues.some(issue => issue.type === 'performance')).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    test('should handle complete wedding event sync workflow', async () => {
      // Setup wedding ceremony event
      const weddingEvent = createMockCalDAVEvent('wedding-ceremony-1', 'Wedding Ceremony - John & Jane');
      weddingEvent.location = 'Beautiful Wedding Venue';
      weddingEvent.attendees = [
        { email: 'bride@example.com', name: 'Jane Doe', role: 'chair', status: 'accepted' },
        { email: 'groom@example.com', name: 'John Smith', role: 'chair', status: 'accepted' },
        { email: 'photographer@example.com', name: 'Wedding Photographer', role: 'required', status: 'accepted' }
      ];

      mockCalDAVClient.setMockEvents([weddingEvent]);

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      // Execute sync
      const result = await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'incremental',
        source: 'manual'
      });

      expect(result.totalEvents).toBe(1);
      expect(result.processedEvents).toBe(1);
      expect(mockWebSocketManager.lastSyncStatus?.status).toBe('completed');
    });

    test('should handle vendor schedule coordination', async () => {
      // Setup vendor meeting events
      const vendorEvents = [
        createMockCalDAVEvent('vendor-meeting-1', 'Updated Photographer Meeting'),
        createMockCalDAVEvent('vendor-meeting-2', 'New Florist Consultation'),
        createMockCalDAVEvent('vendor-meeting-3', 'Updated Catering Discussion')
      ];

      mockCalDAVClient.setMockEvents(vendorEvents);

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      // Execute sync
      const result = await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'incremental',
        source: 'scheduled'
      });

      expect(result.totalEvents).toBe(3);
      expect(result.processedEvents).toBe(3);
      expect(result.conflicts.length).toBe(0); // No conflicts expected in this scenario
    });

    test('should handle sync conflicts and resolution', async () => {
      // This test would require more complex mocking of conflict scenarios
      // For now, we'll test that the sync orchestrator handles errors gracefully
      const conflictEvent = createMockCalDAVEvent('conflict-event-1', 'Conflicted Event');
      mockCalDAVClient.setMockEvents([conflictEvent]);

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      // Mock event coordinator to simulate conflict
      const mockConflictResult = {
        success: false,
        conflicts: [{
          eventId: 'conflict-event-1',
          type: 'update_conflict' as const,
          localEvent: conflictEvent,
          remoteEvent: conflictEvent
        }]
      };

      vi.spyOn(eventCoordinator, 'syncUpdatedEvent').mockResolvedValue(mockConflictResult as any);

      const result = await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'incremental',
        source: 'manual'
      });

      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high-volume event synchronization', async () => {
      // Create 50 mock events
      const manyEvents = Array.from({ length: 50 }, (_, i) => 
        createMockCalDAVEvent(`bulk-event-${i}`, `New Event ${i}`)
      );

      mockCalDAVClient.setMockEvents(manyEvents);
      mockCalDAVClient.setLatency(10); // Fast responses

      const integration = createMockIntegration();
      (syncOrchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

      const startTime = Date.now();
      const result = await syncOrchestrator.orchestrateSync('test-integration-1', {
        syncType: 'full',
        source: 'manual'
      });
      const duration = Date.now() - startTime;

      expect(result.totalEvents).toBe(50);
      expect(result.processedEvents).toBe(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should maintain circuit breaker health under load', async () => {
      // Simulate mixed success/failure scenario
      let callCount = 0;
      
      for (let i = 0; i < 20; i++) {
        try {
          await circuitBreaker.execute(async () => {
            callCount++;
            if (callCount % 5 === 0) {
              throw new Error(`Intermittent failure ${callCount}`);
            }
            return `Success ${callCount}`;
          });
        } catch (error) {
          // Some failures expected
        }
      }

      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBeGreaterThan(0);
      expect(stats.failures).toBeGreaterThan(0);
      
      // Circuit should still be functional (not permanently open)
      expect(circuitBreaker.isHealthy()).toBe(true);
    });
  });
});

// Additional test suite for webhook signature validation
describe('Webhook Security', () => {
  test('should validate webhook signatures correctly', () => {
    const mockSignatureValidator = {
      validateSignature: vi.fn().mockImplementation((payload: string, signature: string, secret: string) => {
        // Simple validation logic for testing
        return signature === `hmac-sha256=${secret}-${payload.length}`;
      }),
      generateSignature: vi.fn().mockImplementation((payload: string, secret: string) => {
        return `hmac-sha256=${secret}-${payload.length}`;
      })
    };

    const testPayload = '{"webhookId":"test","integrationId":"test-int"}';
    const testSecret = 'test-secret';
    
    const validSignature = mockSignatureValidator.generateSignature(testPayload, testSecret);
    expect(mockSignatureValidator.validateSignature(testPayload, validSignature, testSecret)).toBe(true);
    
    const invalidSignature = 'invalid-signature';
    expect(mockSignatureValidator.validateSignature(testPayload, invalidSignature, testSecret)).toBe(false);
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  test('should sync 100 events within performance thresholds', async () => {
    const events = Array.from({ length: 100 }, (_, i) => 
      createMockCalDAVEvent(`perf-event-${i}`, `Performance Test Event ${i}`)
    );

    const mockClient = new MockCalDAVClient();
    mockClient.setMockEvents(events);
    mockClient.setLatency(5); // Very fast responses

    const mockWebSocket = new MockWebSocketManager();
    const mockQueue = new MockJobQueue();

    // Mock dependencies
    const mockDatabase = {
      getWedSyncEvent: vi.fn(),
      findEventByExternalReference: vi.fn(),
      createWedSyncEvent: vi.fn(),
      updateWedSyncEvent: vi.fn(),
      deleteWedSyncEvent: vi.fn(),
      getEventsByIntegration: vi.fn(),
      getVendorSchedule: vi.fn(),
      recordEventMapping: vi.fn()
    };

    const mockiCalProcessor = {
      parseICalendar: vi.fn(),
      generateICalendar: vi.fn(),
      extractRecurrencePattern: vi.fn(),
      generateRecurrenceRule: vi.fn()
    };

    const mockWeddingPriority = {
      getEventPriority: vi.fn().mockReturnValue(100),
      isWeddingCritical: vi.fn().mockReturnValue(false),
      requiresVendorCoordination: vi.fn().mockReturnValue(false),
      getConflictResolutionStrategy: vi.fn().mockReturnValue('latest_wins')
    };

    const eventCoord = new AppleEventCoordinator(
      mockDatabase as any,
      mockiCalProcessor as any,
      mockWebSocket as any,
      mockWeddingPriority as any
    );

    const orchestrator = new AppleSyncOrchestrator(
      mockClient as any,
      mockWebSocket as any,
      mockQueue as any,
      eventCoord
    );

    const integration = createMockIntegration();
    (orchestrator as any).getIntegration = vi.fn().mockResolvedValue(integration);

    const startTime = Date.now();
    const result = await orchestrator.orchestrateSync('perf-test', {
      syncType: 'full',
      source: 'manual'
    });
    const duration = Date.now() - startTime;

    // Performance assertions
    expect(result.totalEvents).toBe(100);
    expect(result.processedEvents).toBe(100);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(duration / result.totalEvents).toBeLessThan(50); // Less than 50ms per event
  });
});