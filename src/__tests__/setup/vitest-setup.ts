/**
 * 🛡️ Vitest Security Setup for Wedding Platform
 *
 * This setup file runs BEFORE every test to ensure:
 * 1. Complete isolation from production systems
 * 2. No real wedding data can be affected
 * 3. Secure test environment with proper cleanup
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  ensureTestEnvironment,
} from './test-environment';

/**
 * Global test setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('🚀 Starting WedSync test suite with security protection...');

  // CRITICAL: Ensure we're never testing against production
  ensureTestEnvironment();

  // Set up completely isolated test environment
  setupTestEnvironment();

  // Mock critical wedding platform APIs to prevent real API calls
  await mockWeddingPlatformAPIs();

  console.log('✅ Test environment secured - wedding data protected!');
});

/**
 * Global test cleanup - runs once after all tests
 */
afterAll(async () => {
  // Clean up all test environment variables
  cleanupTestEnvironment();

  console.log('🧹 Test suite completed - environment cleaned');
});

/**
 * Individual test setup - runs before each test
 */
beforeEach(() => {
  // Ensure each test starts with a clean slate
  // This prevents test pollution between different test cases

  // Mock Date.now for consistent testing (avoid Saturday deployment issues)
  const mockDate = new Date('2025-01-20T10:00:00Z'); // Monday - safe for deployments
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
});

/**
 * Individual test cleanup - runs after each test
 */
afterEach(() => {
  // Restore real timers
  vi.useRealTimers();

  // Clear all mocks to prevent interference between tests
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/**
 * Mock all external APIs to prevent real API calls during testing
 */
async function mockWeddingPlatformAPIs(): Promise<void> {
  // Mock Stripe API calls
  vi.mock('stripe', () => ({
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_safe' } },
        }),
      },
      paymentIntents: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'pi_test_safe', status: 'succeeded' }),
        retrieve: vi
          .fn()
          .mockResolvedValue({ id: 'pi_test_safe', status: 'succeeded' }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_safe',
            url: 'https://checkout.stripe.com/test_safe',
          }),
        },
      },
    })),
  }));

  // Mock Supabase client to prevent real database connections
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn().mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-user-safe' } } },
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'test-user-safe', email: 'test@weddingtest.com' },
          },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        then: vi.fn().mockResolvedValue({ data: [] }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi
            .fn()
            .mockResolvedValue({ data: { path: 'test/safe/path' } }),
        }),
      },
    }),
  }));

  // Mock Resend email service
  vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          id: 'email_test_safe',
          to: 'test@weddingtest.com',
        }),
      },
    })),
  }));

  // Mock Twilio SMS service
  vi.mock('twilio', () => ({
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          sid: 'sms_test_safe',
          status: 'sent',
          to: '+1234567890',
        }),
      },
    })),
  }));

  // Mock Redis for webhook processing
  vi.mock('ioredis', () => ({
    default: vi.fn().mockImplementation(() => ({
      hset: vi.fn().mockResolvedValue(1),
      hgetall: vi.fn().mockResolvedValue({}),
      expire: vi.fn().mockResolvedValue(1),
      lpush: vi.fn().mockResolvedValue(1),
      brpop: vi.fn().mockResolvedValue(null),
      llen: vi.fn().mockResolvedValue(0),
      get: vi.fn().mockResolvedValue('0'),
      disconnect: vi.fn().mockResolvedValue(undefined),
    })),
  }));

  // Mock browser APIs that might not exist in test environment
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      text: '',
      voice: null,
      volume: 1,
      rate: 1,
      pitch: 1,
    })),
  });

  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    },
  });

  // Mock Navigator APIs
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('test clipboard content'),
    },
  });

  // Mock geolocation for venue location features
  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    value: {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 51.5074, // London coordinates for testing
            longitude: -0.1278,
            accuracy: 10,
          },
        });
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
  });

  console.log('🔒 All external APIs mocked - tests are completely isolated');
}

/**
 * Wedding-specific test utilities
 */
export const weddingTestUtils = {
  /**
   * Create a mock wedding scenario for testing
   */
  createMockWedding: (overrides = {}) => ({
    id: 'wed_test_safe_12345',
    bride_name: 'Emma Test',
    groom_name: 'James Test',
    wedding_date: '2025-06-15',
    venue_name: 'Test Wedding Venue',
    status: 'active',
    supplier_count: 5,
    guest_count: 150,
    ...overrides,
  }),

  /**
   * Create a mock supplier for testing
   */
  createMockSupplier: (type = 'photography', overrides = {}) => ({
    id: `sup_test_${type}_safe`,
    name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)} Studio`,
    email: `test.${type}@suppliertest.com`,
    type: type,
    tier: 'professional',
    active_weddings: 3,
    ...overrides,
  }),

  /**
   * Create a mock payment event for testing
   */
  createMockPaymentEvent: (amount = 50000, overrides = {}) => ({
    id: 'pi_test_safe_payment',
    amount: amount, // Amount in pence
    currency: 'gbp',
    status: 'succeeded',
    metadata: {
      wedding_id: 'wed_test_safe_12345',
      supplier_id: 'sup_test_photo_safe',
      payment_type: 'deposit',
    },
    ...overrides,
  }),
};
