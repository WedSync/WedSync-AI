/**
 * Test setup for Scalability System Tests
 * Configures mocks, test utilities, and common test data
 */

import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  })),
}));

// Mock WebSocket for real-time monitoring tests
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  url: 'ws://localhost:3001/monitoring',
})) as any;

// Mock fetch for API calls
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ success: true }),
  text: async () => 'OK',
}) as any;

// Mock console methods for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

// Common test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test@wedsync.com',
  roles: ['scalability_viewer'],
  permissions: ['scalability:read'],
  organizationId: 'org-wedsync',
  ...overrides,
});

export const createTestWedding = (overrides = {}) => ({
  id: 'test-wedding-123',
  date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  estimatedGuests: 150,
  vendorCount: 8,
  isHighProfile: false,
  services: ['photography', 'catering', 'venue'],
  expectedTrafficMultiplier: 2.0,
  ...overrides,
});

export const createTestMetrics = (overrides = {}) => ({
  timestamp: new Date(),
  cpuUtilization: 50,
  memoryUtilization: 60,
  requestsPerSecond: 1000,
  responseTimeP95: 200,
  databaseConnections: 75,
  errorRate: 0.01,
  serviceHealthScores: { api: 90, database: 85, auth: 88 },
  customMetrics: {},
  ...overrides,
});

// Test utilities
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const expectEventually = async (
  assertion: () => void | Promise<void>,
  timeoutMs = 5000,
  intervalMs = 100,
) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await assertion();
      return; // Success!
    } catch (error) {
      await waitFor(intervalMs);
    }
  }

  // Final attempt - let the error bubble up
  await assertion();
};

// Mock timers setup
export const setupMockTimers = () => {
  jest.useFakeTimers();
  return {
    advanceTimersByTime: jest.advanceTimersByTime,
    runAllTimers: jest.runAllTimers,
    restore: jest.useRealTimers,
  };
};

// Performance testing utilities
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  expectedMaxDuration = 1000,
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;

  if (duration > expectedMaxDuration) {
    console.warn(
      `Performance warning: Operation took ${duration}ms, expected < ${expectedMaxDuration}ms`,
    );
  }

  return { result, duration };
};

// Cleanup function for after each test
export const cleanup = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Reset console
  global.console = originalConsole;

  // Clear any remaining timers
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
};
