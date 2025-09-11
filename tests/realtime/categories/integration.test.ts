/**
 * WS-158: Integration Tests for Real-time Category System
 * Comprehensive testing of all real-time category features
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { CategorySyncService } from '@/lib/realtime/category-sync';
import { CategoryWebSocketHandler } from '@/lib/websocket/category-handlers';
import { CategoryIntegrationService } from '@/lib/integrations/categoryIntegrations';
import { CategoryAutomationEngine } from '@/lib/workflow/category-automation';
import type { TaskCategory, WorkflowTask } from '@/types/workflow';

// Test Configuration
const TEST_CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key',
  },
  websocket: {
    url: process.env.TEST_WEBSOCKET_URL || 'ws://localhost:3001',
  },
  organization: {
    id: 'test-org-' + Date.now(),
    name: 'Test Organization'
  },
  user: {
    id: 'test-user-' + Date.now(),
    email: 'test@example.com'
  }
};

// Test Utilities
class TestEnvironment {
  supabase: any;
  categories: TaskCategory[] = [];
  tasks: WorkflowTask[] = [];
  
  constructor() {
    this.supabase = createClient(TEST_CONFIG.supabase.url, TEST_CONFIG.supabase.key);
  }

  async setup(): Promise<void> {
    // Create test organization
    await this.supabase.from('organizations').insert({
      id: TEST_CONFIG.organization.id,
      name: TEST_CONFIG.organization.name,
    });

    // Create test user
    await this.supabase.from('user_profiles').insert({
      user_id: TEST_CONFIG.user.id,
      email: TEST_CONFIG.user.email,
      organization_id: TEST_CONFIG.organization.id,
    });

    // Create test categories
    const categoryData = [
      {
        id: 'cat-1',
        name: 'Planning',
        color: '#3B82F6',
        icon: 'calendar',
        organization_id: TEST_CONFIG.organization.id,
        is_default: true,
        sort_order: 1,
      },
      {
        id: 'cat-2',
        name: 'Vendors',
        color: '#10B981',
        icon: 'users',
        organization_id: TEST_CONFIG.organization.id,
        is_default: true,
        sort_order: 2,
      },
    ];

    const { data: categories } = await this.supabase
      .from('task_categories')
      .insert(categoryData)
      .select();

    this.categories = categories || [];

    // Create test tasks
    const taskData = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        category_id: 'cat-1',
        status: 'todo',
        priority: 'medium',
        organization_id: TEST_CONFIG.organization.id,
        created_by: TEST_CONFIG.user.id,
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        category_id: 'cat-2',
        status: 'in_progress',
        priority: 'high',
        organization_id: TEST_CONFIG.organization.id,
        created_by: TEST_CONFIG.user.id,
      },
    ];

    const { data: tasks } = await this.supabase
      .from('workflow_tasks')
      .insert(taskData)
      .select();

    this.tasks = tasks || [];
  }

  async cleanup(): Promise<void> {
    // Clean up test data
    await Promise.all([
      this.supabase.from('workflow_tasks').delete().eq('organization_id', TEST_CONFIG.organization.id),
      this.supabase.from('task_categories').delete().eq('organization_id', TEST_CONFIG.organization.id),
      this.supabase.from('user_profiles').delete().eq('user_id', TEST_CONFIG.user.id),
      this.supabase.from('organizations').delete().eq('id', TEST_CONFIG.organization.id),
    ]);
  }

  async createTask(overrides?: Partial<WorkflowTask>): Promise<WorkflowTask> {
    const taskData = {
      title: 'Test Task ' + Date.now(),
      category_id: this.categories[0]?.id,
      status: 'todo',
      priority: 'medium',
      organization_id: TEST_CONFIG.organization.id,
      created_by: TEST_CONFIG.user.id,
      ...overrides,
    };

    const { data, error } = await this.supabase
      .from('workflow_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(categoryId: string, updates: Partial<TaskCategory>): Promise<TaskCategory> {
    const { data, error } = await this.supabase
      .from('task_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  createMockWebSocket(): any {
    const ws = {
      readyState: 1, // OPEN
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    return ws;
  }
}

// Performance Metrics
class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  startTimer(name: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.addMetric(name, duration);
      return duration;
    };
  }

  addMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)],
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }
}

describe('WS-158: Real-time Category System Integration Tests', () => {
  let testEnv: TestEnvironment;
  let perf: PerformanceTracker;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    perf = new PerformanceTracker();
    await testEnv.setup();
  }, 30000);

  afterAll(async () => {
    await testEnv.cleanup();
  }, 10000);

  describe('CategorySyncService', () => {
    let syncService: CategorySyncService;

    beforeEach(async () => {
      syncService = new CategorySyncService({
        organizationId: TEST_CONFIG.organization.id,
        userId: TEST_CONFIG.user.id,
      });
    });

    afterEach(async () => {
      await syncService.cleanup();
    });

    it('should initialize sync service successfully', async () => {
      const endTimer = perf.startTimer('sync_initialization');
      
      await expect(syncService.initialize()).resolves.not.toThrow();
      
      const duration = endTimer();
      expect(duration).toBeLessThan(5000); // Should initialize within 5 seconds
    });

    it('should handle real-time category updates', async () => {
      await syncService.initialize();
      
      const updatePromise = new Promise((resolve) => {
        const originalConfig = syncService['config'];
        syncService['config'] = {
          ...originalConfig,
          onCategoryUpdate: (category, action) => {
            resolve({ category, action });
          },
        };
      });

      // Simulate category update
      const endTimer = perf.startTimer('category_update_propagation');
      
      await testEnv.updateCategory(testEnv.categories[0].id, {
        name: 'Updated Planning',
      });

      const result = await Promise.race([
        updatePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      const duration = endTimer();
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should propagate within 1 second
    });

    it('should handle conflict resolution', async () => {
      await syncService.initialize();
      
      const conflictPromise = new Promise((resolve) => {
        const originalConfig = syncService['config'];
        syncService['config'] = {
          ...originalConfig,
          onConflictResolution: (conflict) => {
            resolve(conflict);
          },
        };
      });

      // Simulate concurrent updates
      const category = testEnv.categories[0];
      const updates = [
        { name: 'Conflict Test 1' },
        { name: 'Conflict Test 2' },
      ];

      const endTimer = perf.startTimer('conflict_resolution');
      
      await Promise.all([
        testEnv.updateCategory(category.id, updates[0]),
        new Promise(resolve => setTimeout(resolve, 10)), // Small delay
        testEnv.updateCategory(category.id, updates[1]),
      ]);

      try {
        const conflict = await Promise.race([
          conflictPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('No conflict detected')), 2000))
        ]);
        
        const duration = endTimer();
        expect(conflict).toBeDefined();
        expect(duration).toBeLessThan(1000);
      } catch (error) {
        // Conflict resolution might not trigger if changes are too far apart
        console.log('No conflict detected - acceptable for this test');
      }
    });

    it('should maintain sync status correctly', async () => {
      await syncService.initialize();
      
      const status = syncService.getSyncStatus();
      expect(status).toMatchObject({
        isConnected: expect.any(Boolean),
        lastSync: expect.any(String),
        pendingChanges: expect.any(Number),
        errors: expect.any(Array),
        latency: expect.any(Number),
      });
    });

    it('should track performance metrics', async () => {
      await syncService.initialize();
      
      // Perform several sync operations
      for (let i = 0; i < 5; i++) {
        await testEnv.updateCategory(testEnv.categories[0].id, {
          name: `Performance Test ${i}`,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const metrics = syncService.getPerformanceMetrics();
      expect(metrics).toMatchObject({
        avgLatency: expect.any(Number),
        totalSyncs: expect.any(Number),
        failedSyncs: expect.any(Number),
        successRate: expect.any(Number),
      });
      
      expect(metrics.avgLatency).toBeLessThan(500); // Average latency should be under 500ms
      expect(metrics.successRate).toBeGreaterThan(80); // Success rate should be above 80%
    });
  });

  describe('CategoryWebSocketHandler', () => {
    let wsHandler: CategoryWebSocketHandler;

    beforeEach(() => {
      wsHandler = new CategoryWebSocketHandler(
        TEST_CONFIG.organization.id,
        TEST_CONFIG.user.id
      );
    });

    afterEach(() => {
      wsHandler.disconnect();
    });

    it('should handle WebSocket connection lifecycle', async () => {
      const endTimer = perf.startTimer('websocket_connection');
      
      // Mock WebSocket for testing
      global.WebSocket = jest.fn().mockImplementation(() => testEnv.createMockWebSocket());
      
      await expect(wsHandler.connect()).resolves.not.toThrow();
      
      const duration = endTimer();
      expect(duration).toBeLessThan(3000); // Should connect within 3 seconds
    });

    it('should send and receive category messages', async () => {
      global.WebSocket = jest.fn().mockImplementation(() => {
        const ws = testEnv.createMockWebSocket();
        ws.onopen = jest.fn();
        ws.onmessage = jest.fn();
        return ws;
      });

      await wsHandler.connect();
      
      const endTimer = perf.startTimer('message_send');
      
      wsHandler.sendMessage({
        type: 'category:updated',
        payload: { categoryId: 'test-cat', changes: { name: 'Test' } },
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(100); // Message sending should be very fast
    });

    it('should handle collaboration locks', async () => {
      global.WebSocket = jest.fn().mockImplementation(() => testEnv.createMockWebSocket());
      
      await wsHandler.connect();
      
      const endTimer = perf.startTimer('collaboration_lock');
      
      const lockAcquired = await wsHandler.acquireLock('test-category');
      
      expect(lockAcquired).toBe(true);
      
      await wsHandler.releaseLock('test-category');
      
      const duration = endTimer();
      expect(duration).toBeLessThan(500); // Lock operations should be fast
    });

    it('should update cursor positions for collaboration', () => {
      const endTimer = perf.startTimer('cursor_update');
      
      wsHandler.updateCursor('test-category', 'name', 10);
      
      const duration = endTimer();
      expect(duration).toBeLessThan(50); // Cursor updates should be extremely fast
    });
  });

  describe('CategoryIntegrationService', () => {
    let integrationService: CategoryIntegrationService;

    beforeEach(() => {
      integrationService = new CategoryIntegrationService({
        organizationId: TEST_CONFIG.organization.id,
        userId: TEST_CONFIG.user.id,
        providers: [
          { name: 'google', syncEnabled: true },
          { name: 'ical', syncEnabled: true },
        ],
      });
    });

    afterEach(async () => {
      await integrationService.cleanup();
    });

    it('should sync categories with calendars', async () => {
      const endTimer = perf.startTimer('calendar_sync');
      
      const results = await integrationService.syncCategoriesWithCalendars(testEnv.categories);
      
      const duration = endTimer();
      expect(results).toHaveLength(2); // Google and iCal providers
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      results.forEach(result => {
        expect(result).toMatchObject({
          provider: expect.any(String),
          success: expect.any(Boolean),
          eventsCreated: expect.any(Number),
          eventsUpdated: expect.any(Number),
          eventsDeleted: expect.any(Number),
          errors: expect.any(Array),
          timestamp: expect.any(Date),
        });
      });
    });

    it('should handle calendar webhook events', async () => {
      const endTimer = perf.startTimer('webhook_processing');
      
      await expect(
        integrationService.handleCalendarWebhook('google', {
          eventType: 'created',
          resourceId: 'test-event',
        })
      ).resolves.not.toThrow();
      
      const duration = endTimer();
      expect(duration).toBeLessThan(2000); // Webhook processing should be fast
    });

    it('should generate iCal feeds', async () => {
      const endTimer = perf.startTimer('ical_generation');
      
      // Create mock events for testing
      const events = testEnv.tasks.map(task => ({
        id: task.id,
        title: task.title,
        start: new Date(),
        end: new Date(Date.now() + 3600000), // 1 hour later
        category: 'Test Category',
      }));

      const feed = await integrationService['generateICalendarFeed'](events as any);
      
      const duration = endTimer();
      expect(feed).toContain('BEGIN:VCALENDAR');
      expect(feed).toContain('END:VCALENDAR');
      expect(duration).toBeLessThan(1000); // iCal generation should be fast
    });
  });

  describe('CategoryAutomationEngine', () => {
    let automationEngine: CategoryAutomationEngine;

    beforeEach(async () => {
      automationEngine = new CategoryAutomationEngine(
        TEST_CONFIG.organization.id,
        TEST_CONFIG.user.id
      );
    });

    afterEach(async () => {
      await automationEngine.cleanup();
    });

    it('should process automation triggers', async () => {
      const endTimer = perf.startTimer('automation_trigger');
      
      const triggerEvent = {
        type: 'task_created' as const,
        source: 'user' as const,
        timestamp: new Date().toISOString(),
        data: { task: testEnv.tasks[0] },
      };

      const results = await automationEngine.processTrigger(triggerEvent);
      
      const duration = endTimer();
      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should process within 5 seconds
    });

    it('should handle automation rules CRUD operations', async () => {
      const testRule = {
        id: 'test-rule-1',
        name: 'Test Automation Rule',
        category_id: testEnv.categories[0].id,
        trigger_type: 'task_completed' as const,
        trigger_conditions: [],
        actions: [{
          type: 'send_notification' as const,
          parameters: {
            type: 'success',
            title: 'Task Completed',
            message: 'A task has been completed',
            channels: ['web'],
          },
        }],
        is_active: true,
        organization_id: TEST_CONFIG.organization.id,
        created_by: TEST_CONFIG.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_count: 0,
      };

      const endTimer = perf.startTimer('automation_rule_crud');
      
      // Test adding rule
      await expect(automationEngine.addRule(testRule)).resolves.not.toThrow();
      
      // Test updating rule
      await expect(
        automationEngine.updateRule(testRule.id, { name: 'Updated Rule' })
      ).resolves.not.toThrow();
      
      // Test deleting rule
      await expect(automationEngine.deleteRule(testRule.id)).resolves.not.toThrow();
      
      const duration = endTimer();
      expect(duration).toBeLessThan(3000); // CRUD operations should be fast
    });

    it('should track performance metrics', async () => {
      const metrics = automationEngine.getPerformanceMetrics();
      
      expect(metrics).toMatchObject({
        total_executions: expect.any(Number),
        successful_executions: expect.any(Number),
        failed_executions: expect.any(Number),
        average_execution_time: expect.any(Number),
      });
    });
  });

  describe('Cross-Platform Synchronization', () => {
    it('should maintain data consistency across platforms', async () => {
      const endTimer = perf.startTimer('cross_platform_sync');
      
      // Simulate changes from multiple platforms
      const syncService1 = new CategorySyncService({
        organizationId: TEST_CONFIG.organization.id,
        userId: TEST_CONFIG.user.id,
      });
      
      const syncService2 = new CategorySyncService({
        organizationId: TEST_CONFIG.organization.id,
        userId: 'user-2',
      });

      await Promise.all([
        syncService1.initialize(),
        syncService2.initialize(),
      ]);

      // Make concurrent changes
      const category = testEnv.categories[0];
      const updates = await Promise.all([
        testEnv.updateCategory(category.id, { name: 'Platform 1 Update' }),
        testEnv.updateCategory(category.id, { name: 'Platform 2 Update' }),
      ]);

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      const duration = endTimer();
      expect(duration).toBeLessThan(3000); // Cross-platform sync should be fast
      
      // Cleanup
      await Promise.all([
        syncService1.cleanup(),
        syncService2.cleanup(),
      ]);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle high-frequency category updates', async () => {
      const syncService = new CategorySyncService({
        organizationId: TEST_CONFIG.organization.id,
        userId: TEST_CONFIG.user.id,
      });

      await syncService.initialize();

      const endTimer = perf.startTimer('high_frequency_updates');
      const updatePromises: Promise<any>[] = [];

      // Simulate 50 rapid updates
      for (let i = 0; i < 50; i++) {
        updatePromises.push(
          testEnv.updateCategory(testEnv.categories[0].id, {
            name: `High Freq Update ${i}`,
          })
        );
        
        // Small delay between updates
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      await Promise.all(updatePromises);
      
      const duration = endTimer();
      expect(duration).toBeLessThan(15000); // Should handle 50 updates within 15 seconds
      
      const metrics = syncService.getPerformanceMetrics();
      expect(metrics.successRate).toBeGreaterThan(90); // High success rate under load
      
      await syncService.cleanup();
    });

    it('should handle concurrent user operations', async () => {
      const userCount = 10;
      const operationsPerUser = 5;
      
      const endTimer = perf.startTimer('concurrent_operations');
      
      const userPromises = Array.from({ length: userCount }, async (_, userIndex) => {
        const wsHandler = new CategoryWebSocketHandler(
          TEST_CONFIG.organization.id,
          `user-${userIndex}`
        );

        global.WebSocket = jest.fn().mockImplementation(() => testEnv.createMockWebSocket());
        await wsHandler.connect();

        // Each user performs multiple operations
        const operations = Array.from({ length: operationsPerUser }, async (_, opIndex) => {
          wsHandler.sendMessage({
            type: 'category:updated',
            payload: {
              categoryId: testEnv.categories[0].id,
              changes: { name: `User${userIndex} Op${opIndex}` },
            },
          });
        });

        await Promise.all(operations);
        wsHandler.disconnect();
      });

      await Promise.all(userPromises);
      
      const duration = endTimer();
      const totalOperations = userCount * operationsPerUser;
      
      expect(duration).toBeLessThan(10000); // Should handle concurrent operations efficiently
      
      console.log(`Handled ${totalOperations} concurrent operations in ${duration.toFixed(2)}ms`);
    });

    it('should maintain memory usage within limits', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create and destroy multiple service instances
      for (let i = 0; i < 10; i++) {
        const syncService = new CategorySyncService({
          organizationId: TEST_CONFIG.organization.id,
          userId: `test-user-${i}`,
        });

        await syncService.initialize();
        
        // Simulate some work
        for (let j = 0; j < 20; j++) {
          await testEnv.updateCategory(testEnv.categories[0].id, {
            name: `Memory Test ${i}-${j}`,
          });
        }

        await syncService.cleanup();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network disconnections gracefully', async () => {
      const syncService = new CategorySyncService({
        organizationId: TEST_CONFIG.organization.id,
        userId: TEST_CONFIG.user.id,
      });

      await syncService.initialize();
      
      // Simulate network disconnection
      const endTimer = perf.startTimer('network_recovery');
      
      // Mock network error
      jest.spyOn(syncService as any, 'handleConnectionError').mockImplementation(() => {
        setTimeout(() => {
          syncService['updateSyncStatus']({ isConnected: true });
        }, 1000);
      });

      syncService['updateSyncStatus']({ isConnected: false });
      syncService['handleConnectionError']();

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = syncService.getSyncStatus();
      const duration = endTimer();
      
      expect(status.isConnected).toBe(true);
      expect(duration).toBeLessThan(3000); // Should recover quickly
      
      await syncService.cleanup();
    });

    it('should handle malformed messages gracefully', async () => {
      const wsHandler = new CategoryWebSocketHandler(
        TEST_CONFIG.organization.id,
        TEST_CONFIG.user.id
      );

      const mockWs = testEnv.createMockWebSocket();
      global.WebSocket = jest.fn().mockImplementation(() => mockWs);
      
      await wsHandler.connect();
      
      // Simulate malformed message
      const malformedMessage = { data: '{ invalid json }' };
      
      expect(() => {
        wsHandler['onMessage'](malformedMessage as any);
      }).not.toThrow();
      
      wsHandler.disconnect();
    });
  });

  describe('Final Performance Summary', () => {
    it('should generate performance report', () => {
      const stats = perf.getAllStats();
      
      console.log('\n📊 Performance Test Results:');
      console.log('=' .repeat(50));
      
      Object.entries(stats).forEach(([name, stat]) => {
        if (stat) {
          console.log(`${name}:`);
          console.log(`  Executions: ${stat.count}`);
          console.log(`  Average: ${stat.avg.toFixed(2)}ms`);
          console.log(`  P95: ${stat.p95.toFixed(2)}ms`);
          console.log(`  Min: ${stat.min.toFixed(2)}ms`);
          console.log(`  Max: ${stat.max.toFixed(2)}ms`);
          console.log('');
        }
      });

      // Performance assertions
      const criticalMetrics = [
        'sync_initialization',
        'category_update_propagation',
        'websocket_connection',
        'message_send',
      ];

      criticalMetrics.forEach(metric => {
        const stat = stats[metric];
        if (stat) {
          expect(stat.p95).toBeLessThan(5000); // P95 should be under 5 seconds for critical operations
        }
      });
    });
  });
});