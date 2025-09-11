/**
 * Test Setup for WS-238 Knowledge Base System
 *
 * Global test configuration and mocks for:
 * - Web APIs (Speech Recognition, Cache API, Service Worker)
 * - Next.js environment
 * - Wedding-specific test utilities
 */

import { jest } from '@jest/globals';

// Mock Web APIs that may not be available in test environment
global.structuredClone =
  global.structuredClone || ((val: any) => JSON.parse(JSON.stringify(val)));

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Speech Recognition API
class MockSpeechRecognition {
  continuous = false;
  interimResults = true;
  lang = 'en-US';
  maxAlternatives = 1;

  onstart: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onnomatch: ((event: SpeechRecognitionEvent) => void) | null = null;

  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
}

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

// Mock Cache API
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  add: jest.fn(),
  addAll: jest.fn(),
};

const mockCaches = {
  open: jest.fn().mockResolvedValue(mockCache),
  delete: jest.fn(),
  keys: jest.fn(),
  match: jest.fn(),
  has: jest.fn(),
};

Object.defineProperty(global, 'caches', {
  writable: true,
  value: mockCaches,
});

// Mock Service Worker API
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    controller: {
      postMessage: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getRegistration: jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: jest.fn(),
      },
    }),
  },
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock Performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    getEntriesByName: jest.fn().mockReturnValue([]),
    now: jest.fn(() => Date.now()),
    timing: {
      navigationStart: Date.now(),
      domContentLoadedEventEnd: Date.now() + 1000,
      loadEventEnd: Date.now() + 2000,
      fetchStart: Date.now() + 100,
    },
  },
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([]),
}));

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  },
});

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 100,
        },
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
});

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock,
});

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  onblocked: null,
  onupgradeneeded: null,
};

const mockIDBDatabase = {
  close: jest.fn(),
  createObjectStore: jest.fn().mockReturnValue({
    add: jest.fn().mockReturnValue(mockIDBRequest),
    get: jest.fn().mockReturnValue(mockIDBRequest),
    put: jest.fn().mockReturnValue(mockIDBRequest),
    delete: jest.fn().mockReturnValue(mockIDBRequest),
    clear: jest.fn().mockReturnValue(mockIDBRequest),
  }),
  deleteObjectStore: jest.fn(),
  transaction: jest.fn().mockReturnValue({
    objectStore: jest.fn().mockReturnValue({
      add: jest.fn().mockReturnValue(mockIDBRequest),
      get: jest.fn().mockReturnValue(mockIDBRequest),
      put: jest.fn().mockReturnValue(mockIDBRequest),
      delete: jest.fn().mockReturnValue(mockIDBRequest),
      clear: jest.fn().mockReturnValue(mockIDBRequest),
    }),
  }),
};

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: jest.fn().mockReturnValue({
      ...mockIDBRequest,
      result: mockIDBDatabase,
    }),
    deleteDatabase: jest.fn().mockReturnValue(mockIDBRequest),
  },
});

// Wedding-specific test utilities
export const weddingTestUtils = {
  // Mock wedding data
  createMockWedding: (overrides = {}) => ({
    id: 'wedding-123',
    couple_id: 'couple-123',
    date: '2025-08-15',
    venue_name: 'Test Venue',
    guest_count: 100,
    phase: 'early-planning',
    ...overrides,
  }),

  createMockCouple: (overrides = {}) => ({
    id: 'couple-123',
    partner1_name: 'John',
    partner2_name: 'Jane',
    email: 'john.jane@example.com',
    phone: '+1234567890',
    ...overrides,
  }),

  createMockArticle: (overrides = {}) => ({
    id: 'article-123',
    title: 'Test Wedding Article',
    excerpt: 'Test article excerpt',
    content: 'Test article content',
    category: 'venue',
    tags: ['venue', 'planning'],
    helpful: 85,
    readTime: 5,
    priority: 'medium',
    size: 1024,
    ...overrides,
  }),

  createMockCategory: (overrides = {}) => ({
    id: 'category-123',
    name: 'Venue Selection',
    description: 'Find the perfect wedding venue',
    icon: 'MapPin',
    articleCount: 15,
    color: 'rose',
    timeline: ['early-planning'],
    ...overrides,
  }),

  // Wedding phase helpers
  getPhaseFromDate: (weddingDate: string) => {
    const wedding = new Date(weddingDate);
    const now = new Date();
    const daysUntil = Math.ceil(
      (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil > 365) return 'early-planning';
    if (daysUntil > 90) return 'active-planning';
    if (daysUntil > 30) return 'final-details';
    return 'wedding-week';
  },

  // Voice search test helpers
  createMockSpeechRecognitionEvent: (
    transcript: string,
    confidence = 0.9,
    isFinal = true,
  ) => ({
    results: [
      [
        {
          transcript,
          confidence,
          isFinal,
        },
      ],
    ],
  }),

  createMockSpeechRecognitionError: (error: string) => ({
    error,
    message: `Speech recognition error: ${error}`,
  }),

  // Cache test helpers
  createMockCacheResponse: (data: any) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),

  // Performance test helpers
  mockPerformanceMetrics: (metrics: Partial<PerformanceTiming> = {}) => {
    const baseTiming = {
      navigationStart: 0,
      fetchStart: 100,
      domainLookupStart: 200,
      domainLookupEnd: 300,
      connectStart: 300,
      connectEnd: 400,
      requestStart: 500,
      responseStart: 600,
      responseEnd: 700,
      domLoading: 800,
      domInteractive: 1200,
      domContentLoadedEventStart: 1300,
      domContentLoadedEventEnd: 1400,
      domComplete: 1800,
      loadEventStart: 1900,
      loadEventEnd: 2000,
      ...metrics,
    };

    Object.defineProperty(window.performance, 'timing', {
      writable: true,
      value: baseTiming,
    });

    return baseTiming;
  },
};

// Global test helpers
global.weddingTestUtils = weddingTestUtils;

// Clean up after each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Reset localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Reset navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });

  // Reset cache mocks
  mockCache.match.mockClear();
  mockCache.put.mockClear();
  mockCache.delete.mockClear();
  mockCache.keys.mockClear();
  mockCaches.open.mockClear();
  mockCaches.delete.mockClear();
  mockCaches.keys.mockClear();
});

// Console warnings for common issues
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress known React warnings in tests
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
    args[0]?.includes?.('Warning: componentWillReceiveProps') ||
    args[0]?.includes?.('Warning: componentWillMount')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Export for use in specific tests
export {
  mockCache,
  mockCaches,
  mockIDBDatabase,
  MockSpeechRecognition,
  localStorageMock,
  sessionStorageMock,
};
