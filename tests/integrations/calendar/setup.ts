/**
 * Jest Setup for Calendar Integration Tests
 * Configures test environment, mocks, and utilities
 */

import 'jest-extended';
import { TextEncoder, TextDecoder } from 'util';

// Setup global environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Setup fetch mock globally
import fetch from 'node-fetch';
if (!global.fetch) {
  global.fetch = fetch as any;
}

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console noise during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidWeddingEvent(): R;
      toBeSuccessfulSyncResult(): R;
      toHaveHealthyProviders(): R;
    }
  }
}

// Custom Jest matchers for calendar integration
expect.extend({
  toBeValidWeddingEvent(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.weddingId === 'string' &&
      received.startTime instanceof Date &&
      received.endTime instanceof Date &&
      typeof received.eventType === 'string' &&
      typeof received.vendorRole === 'string';

    if (pass) {
      return {
        message: () => `expected ${this.utils.printReceived(received)} not to be a valid wedding event`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${this.utils.printReceived(received)} to be a valid wedding event`,
        pass: false,
      };
    }
  },

  toBeSuccessfulSyncResult(received: any) {
    const pass = received &&
      (received.status === 'completed' || received.status === 'partial_failure') &&
      typeof received.successfulSyncs === 'number' &&
      typeof received.failedSyncs === 'number' &&
      received.duration > 0;

    if (pass) {
      return {
        message: () => `expected ${this.utils.printReceived(received)} not to be a successful sync result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${this.utils.printReceived(received)} to be a successful sync result`,
        pass: false,
      };
    }
  },

  toHaveHealthyProviders(received: any) {
    const pass = received &&
      received.providers &&
      Array.isArray(received.providers) &&
      received.providers.every((p: any) => p.isHealthy);

    if (pass) {
      return {
        message: () => `expected health report not to have all healthy providers`,
        pass: true,
      };
    } else {
      const unhealthyProviders = received?.providers?.filter((p: any) => !p.isHealthy) || [];
      return {
        message: () => `expected all providers to be healthy, but found unhealthy: ${unhealthyProviders.map((p: any) => p.provider).join(', ')}`,
        pass: false,
      };
    }
  }
});

// Global test configuration
export const TEST_CONFIG = {
  timeout: {
    short: 5000,    // 5 seconds
    medium: 15000,  // 15 seconds
    long: 30000     // 30 seconds
  },
  
  mockData: {
    weddingId: 'test-wedding-123',
    userId: 'test-user-456',
    connectionId: 'test-connection-789'
  },

  apiEndpoints: {
    google: 'https://www.googleapis.com',
    microsoft: 'https://graph.microsoft.com',
    apple: 'https://caldav.icloud.com'
  }
};

// Test database cleanup utilities
export const TestCleanup = {
  async clearTestData() {
    // Implementation would clear test data from database
    console.log('Clearing test data...');
  },

  async resetMocks() {
    jest.clearAllMocks();
    jest.resetAllMocks();
  }
};

// Test data factories
export class TestDataFactory {
  static createWeddingEvent(overrides = {}) {
    return {
      id: `event-${Date.now()}`,
      weddingId: TEST_CONFIG.mockData.weddingId,
      timelineEventId: `timeline-${Date.now()}`,
      title: 'Test Wedding Event',
      description: 'Test event description',
      startTime: new Date('2024-06-15T14:00:00Z'),
      endTime: new Date('2024-06-15T15:00:00Z'),
      timezone: 'America/New_York',
      eventType: 'ceremony',
      vendorRole: 'photographer',
      isWeddingCritical: true,
      location: {
        address: 'Test Venue Address',
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      },
      attendees: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createConnection(provider: string, overrides = {}) {
    return {
      id: `${provider}-connection-${Date.now()}`,
      userId: TEST_CONFIG.mockData.userId,
      provider,
      externalCalendarId: `${provider}-calendar-123`,
      accessToken: `mock-${provider}-token`,
      refreshToken: `mock-${provider}-refresh`,
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createBatchResult(successful = 2, failed = 0) {
    return {
      successful: Array.from({ length: successful }, (_, i) => ({
        originalEvent: this.createWeddingEvent({ id: `success-${i}` }),
        externalEventId: `external-${i}`,
        providerId: `provider-${i}`
      })),
      failed: Array.from({ length: failed }, (_, i) => ({
        originalEvent: this.createWeddingEvent({ id: `failed-${i}` }),
        error: `Mock error ${i}`,
        errorCode: 'TEST_ERROR'
      })),
      partialFailure: failed > 0
    };
  }
}

// API Response mocks
export class ApiMockFactory {
  static googleTokenResponse() {
    return {
      ok: true,
      json: async () => ({
        access_token: 'mock-google-token',
        refresh_token: 'mock-google-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar'
      })
    };
  }

  static outlookTokenResponse() {
    return {
      ok: true,
      json: async () => ({
        access_token: 'mock-outlook-token',
        refresh_token: 'mock-outlook-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite'
      })
    };
  }

  static successfulEventCreation(eventId = 'mock-event-id') {
    return {
      ok: true,
      json: async () => ({
        id: eventId,
        summary: 'Mock Event',
        start: { dateTime: '2024-06-15T14:00:00Z' },
        end: { dateTime: '2024-06-15T15:00:00Z' }
      })
    };
  }

  static rateLimitError() {
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Map([['Retry-After', '60']])
    };
  }

  static authenticationError() {
    return {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: {
          code: 401,
          message: 'Invalid credentials'
        }
      })
    };
  }
}

// Test performance utilities
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  static async runConcurrentTests<T>(tests: (() => Promise<T>)[], maxConcurrency = 5): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < tests.length; i += maxConcurrency) {
      const batch = tests.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(test => test()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Export test utilities
export { TEST_CONFIG, TestCleanup, TestDataFactory, ApiMockFactory, PerformanceTestUtils };