// Test setup for WS-235 Support Operations Ticket Management System
// Team D - Mobile/PWA Development

import '@testing-library/jest-dom';
import 'jest-localstorage-mock';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock global APIs
global.fetch = require('jest-fetch-mock');

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { organization_id: 'test-org-id' },
            },
          },
          error: null,
        }),
      ),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() =>
          Promise.resolve({ data: { path: 'test-path' }, error: null }),
        ),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://test.com/file' },
        })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => Promise.resolve()),
      })),
      off: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  }),
  createRouteHandlerClient: () => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { organization_id: 'test-org-id' },
            },
          },
          error: null,
        }),
      ),
    },
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/support',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock MediaDevices API for voice recording
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(new MediaStream())),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
  },
  writable: true,
});

// Mock MediaRecorder API
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestData: jest.fn(),
  state: 'inactive',
  mimeType: 'audio/webm',
  ondataavailable: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onstart: null,
  onstop: null,
})) as any;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Notification API
global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  ...options,
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
})) as any;

Object.defineProperty(global.Notification, 'permission', {
  value: 'granted',
  writable: true,
});

Object.defineProperty(global.Notification, 'requestPermission', {
  value: jest.fn(() => Promise.resolve('granted')),
  writable: true,
});

// Mock Service Worker
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() =>
      Promise.resolve({
        installing: null,
        waiting: null,
        active: {
          postMessage: jest.fn(),
          addEventListener: jest.fn(),
        },
        addEventListener: jest.fn(),
        unregister: jest.fn(),
      }),
    ),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
      },
      sync: {
        register: jest.fn(),
      },
    }),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    postMessage: jest.fn(),
  },
  writable: true,
});

// Mock IndexedDB for offline storage
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
        add: jest.fn(),
        put: jest.fn(),
        get: jest.fn(),
        getAll: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
      })),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          put: jest.fn(),
          get: jest.fn(),
          getAll: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn(),
        })),
        oncomplete: null,
        onerror: null,
      })),
      close: jest.fn(),
    },
  })),
  deleteDatabase: jest.fn(),
} as any;

// Mock crypto.subtle for security testing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
      generateKey: jest.fn(() => Promise.resolve({})),
      importKey: jest.fn(() => Promise.resolve({})),
      exportKey: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
    },
    getRandomValues: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
  writable: true,
});

// Mock ResizeObserver for responsive testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
  writable: true,
});

// Mock matchMedia for responsive design testing
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 768px') ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  writable: true,
});

// Mock online/offline events
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

// Setup console spy for error tracking
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Custom matchers for support system testing
expect.extend({
  toBeValidTicketNumber(received) {
    const ticketNumberPattern = /^T-\d{6}$/;
    const pass = ticketNumberPattern.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ticket number`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid ticket number (format: T-XXXXXX)`,
        pass: false,
      };
    }
  },

  toBeValidPriority(received) {
    const validPriorities = [
      'low',
      'medium',
      'high',
      'urgent',
      'wedding_day_emergency',
    ];
    const pass = validPriorities.includes(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid priority`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid priority (${validPriorities.join(', ')})`,
        pass: false,
      };
    }
  },

  toHaveMobileOptimizedLayout(received) {
    const computedStyle = window.getComputedStyle(received);
    const minTouchTarget =
      parseInt(computedStyle.minHeight) >= 44 ||
      parseInt(computedStyle.minWidth) >= 44;

    if (minTouchTarget) {
      return {
        message: () => `expected element not to have mobile-optimized layout`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected element to have mobile-optimized layout (min 44px touch target)`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  // Create mock ticket data
  createMockTicket: (overrides = {}) => ({
    id: 'test-ticket-id',
    ticket_number: 'T-123456',
    title: 'Test Support Ticket',
    description: 'This is a test ticket',
    priority: 'medium',
    status: 'new',
    category: 'technical',
    organization_id: 'test-org-id',
    created_by: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Simulate offline mode
  simulateOffline: () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      writable: true,
    });
    window.dispatchEvent(new Event('offline'));
  },

  // Simulate online mode
  simulateOnline: () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: true,
    });
    window.dispatchEvent(new Event('online'));
  },

  // Wait for next tick
  waitForNextTick: () => new Promise((resolve) => setTimeout(resolve, 0)),

  // Mock successful API response
  mockSuccessfulAPIResponse: (data = {}) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data }),
  }),

  // Mock API error response
  mockErrorAPIResponse: (error = 'Test error', status = 500) => ({
    ok: false,
    status,
    json: () => Promise.resolve({ success: false, error }),
  }),
};

// Type augmentations for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTicketNumber(): R;
      toBeValidPriority(): R;
      toHaveMobileOptimizedLayout(): R;
    }
  }

  var testUtils: {
    createMockTicket: (overrides?: any) => any;
    simulateOffline: () => void;
    simulateOnline: () => void;
    waitForNextTick: () => Promise<void>;
    mockSuccessfulAPIResponse: (data?: any) => any;
    mockErrorAPIResponse: (error?: string, status?: number) => any;
  };
}

console.log('✅ Support system test setup completed');
console.log('📱 Mobile/PWA testing environment initialized');
console.log('🔄 Real-time functionality mocked');
console.log('📡 Offline capabilities ready for testing');
console.log('🎯 WS-235 Test Suite Ready');
