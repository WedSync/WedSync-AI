/**
 * Integration Test Setup
 * Global setup and configuration for integration tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import 'whatwg-fetch';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock crypto for secure operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => '12345678-1234-1234-1234-123456789012',
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        return new ArrayBuffer(32); // Mock hash result
      },
    },
  },
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  },
});

// Mock window.matchMedia
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
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock navigator properties
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
});

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
  },
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
});

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
});

// Mock network information API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  },
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() =>
      Promise.resolve({
        installing: null,
        waiting: null,
        active: {
          state: 'activated',
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    ),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: jest.fn(),
      },
    }),
    controller: {
      state: 'activated',
      postMessage: jest.fn(),
    },
  },
});

// Mock URL and URLSearchParams
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
    }),
  ) as jest.Mock;
}

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      // Echo the message back for testing
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }));
        }
      }, 10);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === 'open' && this.onopen === null) {
      this.onopen = listener as (event: Event) => void;
    } else if (type === 'message' && this.onmessage === null) {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === 'error' && this.onerror === null) {
      this.onerror = listener as (event: Event) => void;
    } else if (type === 'close' && this.onclose === null) {
      this.onclose = listener as (event: CloseEvent) => void;
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === 'open') this.onopen = null;
    else if (type === 'message') this.onmessage = null;
    else if (type === 'error') this.onerror = null;
    else if (type === 'close') this.onclose = null;
  }
}

global.WebSocket = MockWebSocket as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 16);
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock getComputedStyle
global.getComputedStyle = (element: Element) => {
  return {
    getPropertyValue: () => '',
    width: '0px',
    height: '0px',
    minHeight: '48px',
  } as CSSStyleDeclaration;
};

// Console suppression for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: React.createFactory() is deprecated') ||
        args[0].includes('act(...) is not supported in production'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
export const waitForTimeout = (timeout: number = 100) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

export const createMockUser = (overrides = {}) => ({
  id: 'mock-user-id',
  email: 'test@wedsync.com',
  app_metadata: { roles: ['supplier'] },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockEnvironmentVariable = (overrides = {}) => ({
  id: 'mock-var-id',
  name: 'MOCK_VARIABLE',
  value: 'mock_value_123',
  environment: 'development',
  security_level: 'internal',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'mock-user-id',
  ...overrides,
});

export const createMockDeploymentJob = (overrides = {}) => ({
  id: 'mock-job-id',
  source_environment: 'development',
  target_environment: 'staging',
  status: 'pending',
  total_variables: 10,
  processed_variables: 0,
  success_count: 0,
  error_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  initiated_by: 'mock-user-id',
  ...overrides,
});

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const startTime = performance.now();
  renderFn();
  await waitForTimeout(0); // Wait for render cycle
  const endTime = performance.now();
  return endTime - startTime;
};

// Mobile testing utilities
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

export const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', { value: 1024 });
  Object.defineProperty(window, 'innerHeight', { value: 768 });
};

// Touch event utilities
export const createTouchEvent = (type: string, touches: any[] = []) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  (event as any).touches = touches;
  (event as any).targetTouches = touches;
  (event as any).changedTouches = touches;
  return event;
};

// Real-time testing utilities
export const createMockRealtimeChannel = () => ({
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(() => Promise.resolve('ok')),
  unsubscribe: jest.fn(() => Promise.resolve('ok')),
  send: jest.fn(),
});

export const simulateRealtimeEvent = (
  channel: any,
  eventType: string,
  payload: any,
) => {
  const callback = channel.on.mock.calls.find(
    (call: any[]) => call[0] === 'postgres_changes',
  )?.[2];

  if (callback) {
    callback({
      eventType,
      new: eventType !== 'DELETE' ? payload : undefined,
      old: eventType !== 'INSERT' ? payload : undefined,
    });
  }
};

// Wedding day testing utilities
export const mockWeddingDay = (isWeddingDay: boolean = true) => {
  const originalDate = Date;

  if (isWeddingDay) {
    // Saturday 7 PM (peak wedding time)
    const mockDate = new Date('2024-06-15T19:00:00Z');
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.UTC = originalDate.UTC;
    global.Date.parse = originalDate.parse;
    global.Date.now = () => mockDate.getTime();
  }

  return () => {
    global.Date = originalDate;
  };
};

console.log('Integration test setup completed successfully');
