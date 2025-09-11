/**
 * WS-190 Security Test Environment Setup
 * Sets up environment variables and global configurations for security testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Security testing environment variables
process.env.CLOUDFLARE_WEBHOOK_SECRET = 'test_cloudflare_secret'
process.env.AWS_GUARDDUTY_WEBHOOK_SECRET = 'test_aws_secret'
process.env.SUPABASE_WEBHOOK_SECRET = 'test_supabase_secret'
process.env.STRIPE_WEBHOOK_SECRET = 'test_stripe_secret'
process.env.DEFAULT_ORGANIZATION_ID = 'test-org-123'

// Disable console warnings for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}

// Mock crypto for consistent testing
global.crypto = {
  ...global.crypto,
  randomUUID: () => 'test-uuid-123',
  getRandomValues: (arr) => arr.fill(1),
}

// Mock Date.now for consistent timestamps in tests
global.mockDate = '2025-01-20T12:00:00.000Z'
global.Date.now = jest.fn(() => new Date(global.mockDate).getTime())

// Mock performance for timing-sensitive tests
global.performance = {
  ...global.performance,
  now: jest.fn(() => 1234567890),
}

// Setup fetch mock for API testing
global.fetch = jest.fn()

// Mock window object for client-side code
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
global.sessionStorage = localStorageMock

// Suppress specific warnings in tests
const originalWarn = console.warn
beforeEach(() => {
  console.warn = jest.fn().mockImplementation((message) => {
    // Suppress specific warnings but allow security-related warnings
    if (
      message.includes('React Hook') ||
      message.includes('findDOMNode') ||
      message.includes('componentWillReceiveProps')
    ) {
      return
    }
    originalWarn(message)
  })
})

afterEach(() => {
  console.warn = originalWarn
})

// Global test timeout for all security tests
jest.setTimeout(30000)