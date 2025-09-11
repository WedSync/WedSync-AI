/**
 * Jest setup for Demo Suite tests
 * Configures test environment and mocks
 */

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Next.js image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    createBucket: jest.fn().mockResolvedValue({ error: null }),
    getBucket: jest.fn().mockResolvedValue({ data: { id: 'test-bucket' } }),
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test-url.com/asset.svg' } })),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ error: null })
    }))
  },
  auth: {
    admin: {
      createUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null 
      }),
      deleteUser: jest.fn().mockResolvedValue({ error: null }),
      listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null })
    }
  },
  from: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    delete: jest.fn().mockResolvedValue({ error: null })
  })),
  rpc: jest.fn().mockResolvedValue({ error: null })
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-demo-authentication-testing-only';
process.env.NODE_ENV = 'test';

// Mock UUID generation for consistent tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123456')
}));

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Global test setup
beforeAll(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clear all mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);

// Custom matchers for demo-specific assertions
expect.extend({
  toBeValidDemoAccount(received) {
    const pass = received && 
                 received.id && 
                 (received.id.startsWith('supplier_') || received.id.startsWith('couple_')) &&
                 received.type &&
                 ['supplier', 'couple'].includes(received.type);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid demo account`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid demo account with id starting with supplier_ or couple_ and valid type`,
        pass: false,
      };
    }
  },

  toBeValidJWTToken(received) {
    const pass = received && 
                 typeof received === 'string' && 
                 received.split('.').length === 3;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT token`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT token (3 parts separated by dots)`,
        pass: false,
      };
    }
  },

  toBeValidAssetURL(received) {
    const pass = received && 
                 typeof received === 'string' && 
                 received.startsWith('https://') &&
                 (received.includes('demo-logos') || 
                  received.includes('demo-profiles') || 
                  received.includes('demo-documents'));

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid asset URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid demo asset URL containing demo-logos, demo-profiles, or demo-documents`,
        pass: false,
      };
    }
  }
});

// Export mock utilities for use in tests
global.mockUtils = {
  mockSupabaseClient,
  createMockSupplier: (id = 'supplier_1', type = 'photographer', name = 'Test Business') => ({
    id,
    supplierType: type,
    businessName: name,
    email: `hello@${name.toLowerCase().replace(/\s+/g, '')}.com`
  }),
  createMockCouple: (id = 'couple_1', firstName = 'Test', lastName = 'User', partner = 'Partner') => ({
    id,
    firstName,
    lastName,
    partnerName: partner,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
  }),
  createMockAsset: (type = 'logo', id = 'test-asset') => ({
    id,
    type,
    url: `https://test-url.com/demo-${type}s/test-asset.svg`,
    filePath: `${id}/asset.svg`,
    metadata: {
      format: 'svg',
      size: 1024,
      generatedAt: new Date().toISOString()
    }
  })
};

// Test database helpers
global.testHelpers = {
  async cleanTestData() {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock return values to defaults
    mockSupabaseClient.from().single.mockResolvedValue({ data: { id: 'test-id' }, error: null });
    mockSupabaseClient.from().select().mockReturnThis();
    mockSupabaseClient.from().insert().mockReturnThis();
  },

  async seedTestData() {
    // Mock seeded data responses
    const mockSuppliers = [
      global.mockUtils.createMockSupplier('supplier_1', 'photographer', 'Sky Lens Studios'),
      global.mockUtils.createMockSupplier('supplier_2', 'videographer', 'Golden Frame Films')
    ];

    const mockCouples = [
      global.mockUtils.createMockCouple('couple_1', 'Emily', 'Harper', 'Jack'),
      global.mockUtils.createMockCouple('couple_2', 'Sophia', 'Bennett', 'Liam')
    ];

    return { suppliers: mockSuppliers, couples: mockCouples };
  }
};

console.log('Demo Suite test environment initialized');