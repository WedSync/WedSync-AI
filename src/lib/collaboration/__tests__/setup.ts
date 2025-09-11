// WS-342: Real-Time Wedding Collaboration - Test Setup
// Team B Backend Development - Batch 1 Round 1

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Test database setup
const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// WebSocket test server
let testWebSocketServer: WebSocketServer | null = null;
const TEST_WEBSOCKET_PORT = 8080;

// Test data factory
export class TestDataFactory {
  static createTestUser(overrides: any = {}) {
    return {
      id: randomUUID(),
      email: `test-${Date.now()}@wedsync.com`,
      name: 'Test User',
      role: 'couple',
      ...overrides,
    };
  }

  static createTestWedding(userId: string, overrides: any = {}) {
    return {
      id: randomUUID(),
      couple_id: userId,
      title: `Test Wedding ${Date.now()}`,
      date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      status: 'active',
      ...overrides,
    };
  }

  static createTestCollaborationSession(
    userId: string,
    weddingId: string,
    overrides: any = {},
  ) {
    return {
      id: randomUUID(),
      userId,
      weddingId,
      sessionToken: `test-token-${Date.now()}`,
      permissions: {
        canEditTimeline: true,
        canEditBudget: true,
        canEditGuests: true,
        canEditVendors: true,
        canViewFinancials: true,
        canManageFiles: true,
        canInviteUsers: false,
        isOwner: true,
        restrictedSections: [],
        customPermissions: {},
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isActive: true,
      metadata: {
        role: 'couple',
        deviceType: 'desktop',
        browser: 'chrome',
        timezone: 'UTC',
      },
      ...overrides,
    };
  }

  static createTestCollaborationEvent(
    weddingId: string,
    userId: string,
    overrides: any = {},
  ) {
    return {
      id: randomUUID(),
      weddingId,
      userId,
      eventType: 'timeline_updated',
      data: {
        section: 'timeline',
        action: 'update',
        changes: {
          time: '2:00 PM',
          activity: 'First Dance',
        },
      },
      metadata: {
        userRole: 'couple',
        deviceType: 'mobile',
        timestamp: Date.now(),
      },
      vectorClock: { [userId]: 1 },
      precedingEvents: [],
      ...overrides,
    };
  }

  static createTestWebSocketMessage(type: string, data: any = {}) {
    return JSON.stringify({
      type,
      id: randomUUID(),
      timestamp: Date.now(),
      data,
    });
  }
}

// Mock WebSocket client
export class MockWebSocketClient {
  private ws: WebSocket | null = null;
  private messages: any[] = [];
  private connectionPromise: Promise<void> | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.messages.push(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          reject(error);
        };

        this.ws.onclose = () => {
          this.ws = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        typeof message === 'string' ? message : JSON.stringify(message),
      );
    }
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Test utilities
export class TestUtils {
  static async waitFor(
    condition: () => boolean,
    timeout: number = 5000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static generateMockRequest(overrides: any = {}) {
    return {
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '127.0.0.1',
        ...overrides.headers,
      },
      cookies: {
        'wedsync-session': 'test-session-token',
        ...overrides.cookies,
      },
      connection: {
        remoteAddress: '127.0.0.1',
      },
      ...overrides,
    };
  }

  static createLoadTestScenario(
    concurrentUsers: number,
    duration: number,
    action: () => Promise<any>,
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    return new Promise(async (resolve) => {
      const results = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [] as number[],
      };

      const startTime = Date.now();
      const workers: Promise<void>[] = [];

      // Create concurrent workers
      for (let i = 0; i < concurrentUsers; i++) {
        workers.push(
          (async () => {
            while (Date.now() - startTime < duration) {
              const requestStart = Date.now();
              try {
                await action();
                results.successfulRequests++;
                results.responseTimes.push(Date.now() - requestStart);
              } catch (error) {
                results.failedRequests++;
              }
              results.totalRequests++;
            }
          })(),
        );
      }

      // Wait for all workers to complete
      await Promise.allSettled(workers);

      // Calculate statistics
      const responseTimes = results.responseTimes;
      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      resolve({
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        averageResponseTime,
        maxResponseTime: Math.max(...responseTimes, 0),
        minResponseTime: Math.min(...responseTimes, Infinity) || 0,
      });
    });
  }
}

// Database test helpers
export class DatabaseTestHelpers {
  static async cleanupTestData(): Promise<void> {
    // Clean up test data in reverse dependency order
    const tables = [
      'collaboration_events',
      'user_presence',
      'data_conflicts',
      'websocket_connections',
      'collaboration_sessions',
      'wedding_real_time_metrics',
    ];

    for (const table of tables) {
      try {
        await testSupabase.from(table).delete().like('id', 'test-%');
      } catch (error) {
        console.warn(`Warning: Could not clean ${table}:`, error);
      }
    }
  }

  static async createTestTables(): Promise<void> {
    // This would typically run migrations in test environment
    console.log('Test tables should be created via migrations');
  }

  static async insertTestUser(userData: any): Promise<any> {
    const { data, error } = await testSupabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async insertTestWedding(weddingData: any): Promise<any> {
    const { data, error } = await testSupabase
      .from('weddings')
      .insert(weddingData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Global test setup
beforeAll(async () => {
  console.log('Setting up real-time collaboration test environment...');

  // Start test WebSocket server
  testWebSocketServer = new WebSocketServer({
    port: TEST_WEBSOCKET_PORT,
    perMessageDeflate: false,
  });

  // Setup test database
  await DatabaseTestHelpers.createTestTables();

  console.log(`Test WebSocket server started on port ${TEST_WEBSOCKET_PORT}`);
});

afterAll(async () => {
  console.log('Tearing down test environment...');

  // Close WebSocket server
  if (testWebSocketServer) {
    testWebSocketServer.close();
  }

  // Clean up test data
  await DatabaseTestHelpers.cleanupTestData();

  console.log('Test environment teardown complete');
});

beforeEach(async () => {
  // Clean up before each test
  await DatabaseTestHelpers.cleanupTestData();
});

afterEach(async () => {
  // Additional cleanup after each test if needed
});

// Export test environment constants
export const TEST_CONFIG = {
  WEBSOCKET_URL: `ws://localhost:${TEST_WEBSOCKET_PORT}`,
  TEST_TIMEOUT: 10000,
  LOAD_TEST_DURATION: 5000,
  MAX_CONCURRENT_CONNECTIONS: 100,
  PERFORMANCE_THRESHOLDS: {
    MAX_RESPONSE_TIME: 100, // 100ms
    MIN_SUCCESS_RATE: 0.95, // 95%
    MAX_MEMORY_USAGE: 500 * 1024 * 1024, // 500MB
    MAX_CPU_USAGE: 80, // 80%
  },
};

export { testSupabase, testWebSocketServer };
