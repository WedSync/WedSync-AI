import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Wedding platform test environment setup
console.log('🔧 WedSync Test Environment Initialized')

// Global test environment configuration
beforeAll(() => {
  // Start MSW server for API mocking
  server.listen({
    onUnhandledRequest: 'error',
  })
  
  // Wedding-specific environment setup
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/wedsync_test'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  
  // Mock Next.js router for App Router compatibility
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => '/test-path',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }))
  
  // Mock Next.js Auth for wedding authentication testing
  vi.mock('next-auth/react', () => ({
    useSession: () => ({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@wedsync.com',
          name: 'Test User',
          role: 'photographer',
        },
      },
      status: 'authenticated',
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }))
  
  // Mock Supabase for wedding data testing
  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
        signIn: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove: vi.fn(),
        })),
      },
      realtime: {
        channel: vi.fn(() => ({
          on: vi.fn(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      },
    }),
  }))
  
  // Mock external wedding service integrations
  vi.mock('stripe', () => ({
    Stripe: vi.fn(() => ({
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        confirm: vi.fn(),
      },
      customers: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      },
    })),
  }))
  
  // Mock Twilio for SMS notifications
  vi.mock('twilio', () => ({
    Twilio: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          sid: 'test-message-sid',
          status: 'sent',
        }),
      },
    })),
  }))
  
  // Mock email service for wedding notifications
  vi.mock('resend', () => ({
    Resend: vi.fn(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          id: 'test-email-id',
          from: 'noreply@wedsync.com',
          to: ['test@example.com'],
          subject: 'Test Wedding Notification',
        }),
      },
    })),
  }))
  
  // Mock DOM APIs for wedding platform features
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  
  // Mock IntersectionObserver for wedding gallery features
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  
  // Mock ResizeObserver for responsive wedding layouts
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  
  // Mock File API for wedding photo uploads
  global.File = class MockFile {
    constructor(
      public name: string,
      public type: string = 'image/jpeg',
      public size: number = 1024
    ) {}
  } as any
  
  global.FileReader = class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
    
    readAsDataURL(file: File) {
      setTimeout(() => {
        this.result = 'data:image/jpeg;base64,test-base64-data'
        this.onload?.({ target: this } as any)
      }, 0)
    }
    
    readAsText(file: File) {
      setTimeout(() => {
        this.result = 'test file content'
        this.onload?.({ target: this } as any)
      }, 0)
    }
  } as any
})

// Cleanup after each test
afterEach(() => {
  // Reset MSW handlers for clean slate between tests
  server.resetHandlers()
  
  // Clean up React Testing Library
  cleanup()
  
  // Clear all mocks for wedding data isolation
  vi.clearAllMocks()
  
  // Reset console methods
  vi.restoreAllMocks()
})

// Global cleanup after all tests
afterAll(() => {
  // Stop MSW server
  server.close()
  
  console.log('🧹 WedSync Test Environment Cleaned Up')
})

// Wedding-specific test utilities
export const createMockWeddingClient = (overrides = {}) => ({
  id: 'test-client-id',
  name: 'John & Jane Smith',
  email: 'couple@example.com',
  phone: '+1234567890',
  wedding_date: '2024-06-15',
  venue: 'Beautiful Wedding Venue',
  guest_count: 150,
  budget: 50000,
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

export const createMockWeddingVendor = (overrides = {}) => ({
  id: 'test-vendor-id',
  name: 'Amazing Photography',
  email: 'photographer@example.com',
  phone: '+1234567890',
  service_type: 'photographer',
  location: 'New York, NY',
  rating: 4.8,
  verified: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

export const createMockWeddingGuest = (overrides = {}) => ({
  id: 'test-guest-id',
  name: 'Guest Name',
  email: 'guest@example.com',
  phone: '+1234567890',
  rsvp_status: 'pending',
  dietary_restrictions: '',
  plus_one: false,
  table_number: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

export const createMockWeddingTask = (overrides = {}) => ({
  id: 'test-task-id',
  title: 'Wedding Task',
  description: 'Important wedding preparation task',
  due_date: '2024-05-01',
  priority: 'high',
  status: 'pending',
  assigned_to: 'test-user-id',
  category: 'planning',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

export const createMockWeddingPayment = (overrides = {}) => ({
  id: 'test-payment-id',
  amount: 5000,
  currency: 'USD',
  status: 'pending',
  vendor_id: 'test-vendor-id',
  client_id: 'test-client-id',
  due_date: '2024-04-15',
  description: 'Photography deposit',
  stripe_payment_intent_id: 'pi_test_12345',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})