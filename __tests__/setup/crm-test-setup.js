/**
 * CRM Integration Hub Test Setup - WS-343 Team E
 * Global test configuration and mocks for comprehensive CRM testing
 */

import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import 'jest-environment-jsdom';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Wedding Industry Testing Environment Variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// CRM Provider Testing Configuration
process.env.TAVE_CLIENT_ID = 'test-tave-client-id';
process.env.TAVE_CLIENT_SECRET = 'test-tave-secret';
process.env.HONEYBOOK_CLIENT_ID = 'test-honeybook-client-id';
process.env.HONEYBOOK_CLIENT_SECRET = 'test-honeybook-secret';
process.env.LIGHTBLUE_API_KEY = 'test-lightblue-key';

// Mock Supabase client for CRM testing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'photographer@example.com'
          }
        },
        error: null
      })),
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token' } },
        error: null
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      then: jest.fn((fn) => fn({ data: [], error: null }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        download: jest.fn(() => Promise.resolve({ data: {}, error: null }))
      }))
    }
  }))
}));

// Mock Next.js router for CRM integration pages
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard/integrations',
    query: {},
    asPath: '/dashboard/integrations'
  }),
  usePathname: () => '/dashboard/integrations',
  useSearchParams: () => new URLSearchParams()
}));

// Mock fetch for CRM API calls
global.fetch = jest.fn();

// Global CRM API Mock Responses
global.mockCRMResponses = {
  tave: {
    clients: {
      success: true,
      data: {
        clients: [
          {
            id: 12345,
            client_name: 'Sarah & Michael Johnson',
            email: 'sarah@example.com',
            phone: '(555) 123-4567',
            wedding_date: '2024-06-15',
            venue: 'Rosewood Manor',
            status: 'booked'
          }
        ],
        pagination: {
          current_page: 1,
          total_pages: 1,
          per_page: 50,
          total_count: 1
        }
      }
    },
    auth: {
      access_token: 'tave-mock-token',
      refresh_token: 'tave-mock-refresh',
      expires_in: 3600,
      token_type: 'Bearer'
    }
  },
  honeybook: {
    contacts: [
      {
        contact_id: 'hb-contact-123',
        project_id: 'hb-project-456',
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily@example.com',
        phone: '(555) 987-6543',
        project_name: 'Emily & David Wedding',
        event_date: '2024-08-22'
      }
    ],
    total: 1,
    page: 1,
    limit: 100
  }
};

// CRM Provider Mock Factory
class CRMProviderMockFactory {
  static mockTaveAPI() {
    fetch.mockImplementation((url, options) => {
      if (url.includes('tave.com/api/v2/clients')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(global.mockCRMResponses.tave.clients)
        });
      }
      
      if (url.includes('tave.com/oauth/token')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(global.mockCRMResponses.tave.auth)
        });
      }
      
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
  }

  static mockHoneyBookAPI() {
    fetch.mockImplementation((url, options) => {
      if (url.includes('api.honeybook.com/v1/contacts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(global.mockCRMResponses.honeybook)
        });
      }
      
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
  }

  static mockRateLimitError() {
    fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 429,
        headers: {
          get: (header) => {
            if (header === 'Retry-After') return '60';
            if (header === 'X-RateLimit-Reset') return Date.now() + 60000;
            return null;
          }
        },
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          message: 'Too many requests'
        })
      });
    });
  }

  static mockNetworkError() {
    fetch.mockImplementation(() => {
      return Promise.reject(new Error('Network request failed'));
    });
  }

  static mockAuthenticationError() {
    fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Unauthorized',
          message: 'Invalid authentication credentials'
        })
      });
    });
  }
}

// Global test utilities
global.CRMTestUtils = {
  // Setup authenticated user context
  mockAuthenticatedUser: () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'photographer@example.com',
      user_metadata: {
        business_name: 'Sarah Johnson Photography',
        business_type: 'photographer'
      }
    };
    
    return mockUser;
  },

  // Generate realistic wedding client data
  generateWeddingClient: (overrides = {}) => ({
    id: 'client-123',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah@example.com',
    phone: '(555) 123-4567',
    partner_first_name: 'Michael',
    partner_last_name: 'Johnson',
    wedding_date: '2024-06-15',
    venue: 'Rosewood Manor',
    guest_count: 150,
    budget: 25000,
    status: 'booked',
    ...overrides
  }),

  // Wait for async operations in tests
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  },

  // Mock OAuth flow
  mockOAuthFlow: (provider = 'tave') => ({
    state: 'mock-oauth-state',
    code: 'mock-auth-code',
    redirect_uri: 'http://localhost:3000/api/crm/callback',
    provider,
    code_verifier: 'mock-code-verifier'
  }),

  // Performance testing helpers
  measurePerformance: async (operation) => {
    const start = process.hrtime.bigint();
    await operation();
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000; // Convert to milliseconds
  }
};

// Make mock factory globally available
global.CRMProviderMockFactory = CRMProviderMockFactory;

// Console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});

// Custom matchers for CRM testing
expect.extend({
  toBeValidWeddingDate(received) {
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(received) && !isNaN(Date.parse(received));
    return {
      message: () => `expected ${received} to be a valid wedding date (YYYY-MM-DD format)`,
      pass: isValid
    };
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      message: () => `expected ${received} to be a valid email address`,
      pass: emailRegex.test(received)
    };
  },
  
  toBeValidPhoneNumber(received) {
    const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)\.]{10,}$/;
    return {
      message: () => `expected ${received} to be a valid phone number`,
      pass: phoneRegex.test(received)
    };
  },

  toHaveWeddingIndustryFields(received) {
    const requiredFields = ['first_name', 'last_name', 'email', 'wedding_date'];
    const hasAllFields = requiredFields.every(field => field in received);
    
    return {
      message: () => `expected object to have wedding industry required fields: ${requiredFields.join(', ')}`,
      pass: hasAllFields
    };
  }
});

// Global test timeout for CRM operations
jest.setTimeout(30000);

console.log('🎯 CRM Integration Hub test environment initialized for WS-343 Team E testing');
console.log('📊 Wedding industry test data factories loaded');
console.log('🔐 OAuth and authentication mocks configured');
console.log('⚡ Performance testing utilities available');