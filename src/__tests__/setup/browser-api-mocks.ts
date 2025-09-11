/**
 * Comprehensive Browser API Mocking Setup for Vitest
 *
 * This file provides consistent mocking of all browser APIs used across
 * the WedSync test suite. Fixes inconsistent mocking and provides
 * wedding-specific mock implementations.
 *
 * CRITICAL: Used by 104+ test files - any changes must be backward compatible
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Types for better mock typing
export interface MockNavigatorConnection {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

export interface MockServiceWorkerContainer {
  register: ReturnType<typeof vi.fn>;
  ready: Promise<MockServiceWorkerRegistration>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  controller: MockServiceWorker | null;
  getRegistration: ReturnType<typeof vi.fn>;
  getRegistrations: ReturnType<typeof vi.fn>;
}

export interface MockServiceWorker {
  state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
  scriptURL: string;
  postMessage: ReturnType<typeof vi.fn>;
}

export interface MockServiceWorkerRegistration {
  active: MockServiceWorker | null;
  installing: MockServiceWorker | null;
  waiting: MockServiceWorker | null;
  scope: string;
  unregister: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

export interface MockGeolocation {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
}

export interface MockMediaDevices {
  getUserMedia: ReturnType<typeof vi.fn>;
  enumerateDevices: ReturnType<typeof vi.fn>;
  getDisplayMedia: ReturnType<typeof vi.fn>;
}

export interface MockStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  key: ReturnType<typeof vi.fn>;
  length: number;
}

export interface MockIndexedDB {
  open: ReturnType<typeof vi.fn>;
  deleteDatabase: ReturnType<typeof vi.fn>;
  databases: ReturnType<typeof vi.fn>;
}

export interface MockCache {
  match: ReturnType<typeof vi.fn>;
  matchAll: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  addAll: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
}

export interface MockCacheStorage {
  open: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
}

// Global mock instances - accessible to tests
export let mockConnection: MockNavigatorConnection;
export let mockServiceWorker: MockServiceWorkerContainer;
export let mockGeolocation: MockGeolocation;
export let mockMediaDevices: MockMediaDevices;
export let mockLocalStorage: MockStorage;
export let mockSessionStorage: MockStorage;
export let mockIndexedDB: MockIndexedDB;
export let mockCache: MockCache;
export let mockCacheStorage: MockCacheStorage;
export let mockFetch: ReturnType<typeof vi.fn>;
export let mockNotification: ReturnType<typeof vi.fn>;

/**
 * Setup comprehensive browser API mocks
 * Call this in test setup or beforeEach
 */
export function setupBrowserMocks(): void {
  // Network Connection API Mock
  mockConnection = {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  // Service Worker Mock
  const mockActiveServiceWorker: MockServiceWorker = {
    state: 'activated',
    scriptURL: '/sw.js',
    postMessage: vi.fn(),
  };

  const mockRegistration: MockServiceWorkerRegistration = {
    active: mockActiveServiceWorker,
    installing: null,
    waiting: null,
    scope: '/',
    unregister: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  mockServiceWorker = {
    register: vi.fn().mockResolvedValue(mockRegistration),
    ready: Promise.resolve(mockRegistration),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    controller: mockActiveServiceWorker,
    getRegistration: vi.fn().mockResolvedValue(mockRegistration),
    getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
  };

  // Geolocation Mock (for venue location features)
  mockGeolocation = {
    getCurrentPosition: vi.fn((success) => {
      success({
        coords: {
          latitude: 51.5074, // London coordinates (default wedding venue location)
          longitude: -0.1278,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn(),
  };

  // Media Devices Mock (for photo/video uploads)
  mockMediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        {
          kind: 'video',
          label: 'Wedding Camera',
          stop: vi.fn(),
        },
      ]),
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        deviceId: 'camera-1',
        kind: 'videoinput',
        label: 'Wedding Photography Camera',
        groupId: 'group-1',
      },
    ]),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([]),
    }),
  };

  // Storage Mocks
  const createStorageMock = (): MockStorage => {
    const store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(store).length;
      },
    };
  };

  mockLocalStorage = createStorageMock();
  mockSessionStorage = createStorageMock();

  // IndexedDB Mock (for offline wedding data)
  mockIndexedDB = {
    open: vi.fn().mockImplementation(() => {
      const mockRequest = {
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue({
                onsuccess: null,
                result: { id: 1, weddingData: 'test' },
              }),
              put: vi.fn().mockReturnValue({ onsuccess: null }),
              add: vi.fn().mockReturnValue({ onsuccess: null }),
              delete: vi.fn().mockReturnValue({ onsuccess: null }),
            }),
          }),
          close: vi.fn(),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      // Simulate async success
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({} as Event);
        }
      }, 0);

      return mockRequest;
    }),
    deleteDatabase: vi.fn().mockReturnValue({ onsuccess: null }),
    databases: vi
      .fn()
      .mockResolvedValue([{ name: 'WedSyncOfflineDB', version: 1 }]),
  };

  // Cache API Mock (for PWA features)
  mockCache = {
    match: vi.fn().mockResolvedValue(new Response('cached data')),
    matchAll: vi.fn().mockResolvedValue([new Response('cached data')]),
    add: vi.fn().mockResolvedValue(undefined),
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
  };

  mockCacheStorage = {
    open: vi.fn().mockResolvedValue(mockCache),
    has: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue(['wedding-cache-v1']),
    match: vi.fn().mockResolvedValue(new Response('cached data')),
  };

  // Fetch Mock with wedding-specific responses
  mockFetch = vi.fn().mockImplementation((url: string | Request) => {
    let urlString: string;
    try {
      urlString = typeof url === 'string' ? url : url.url;

      // Handle relative URLs by prepending base URL
      if (urlString.startsWith('/')) {
        urlString = `http://localhost:3000${urlString}`;
      }
    } catch (error) {
      console.warn('URL parsing error in fetch mock:', error);
      urlString = '/api/fallback';
    }

    // Default successful response
    const defaultResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
        'content-length': '1000',
      }),
      json: vi.fn().mockResolvedValue({ success: true }),
      text: vi.fn().mockResolvedValue('success'),
      blob: vi.fn().mockResolvedValue(new Blob()),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1000)),
      clone: vi.fn().mockReturnThis(),
    };

    // Wedding-specific API responses
    if (urlString.includes('/api/weddings')) {
      return Promise.resolve({
        ...defaultResponse,
        json: vi.fn().mockResolvedValue({
          weddings: [
            {
              id: 'wedding-123',
              coupleNames: 'John & Jane Doe',
              weddingDate: '2025-06-14',
              venue: 'Test Venue',
            },
          ],
        }),
      });
    }

    if (urlString.includes('/api/suppliers')) {
      return Promise.resolve({
        ...defaultResponse,
        json: vi.fn().mockResolvedValue({
          suppliers: [
            {
              id: 'photographer-123',
              businessName: 'Test Photography',
              serviceType: 'photography',
            },
          ],
        }),
      });
    }

    if (urlString.includes('/api/photos')) {
      return Promise.resolve({
        ...defaultResponse,
        json: vi.fn().mockResolvedValue({
          photos: [
            {
              id: 'photo-123',
              url: 'https://example.com/wedding-photo.jpg',
              weddingId: 'wedding-123',
            },
          ],
        }),
      });
    }

    return Promise.resolve(defaultResponse);
  });

  // Notification Mock (for wedding reminders)
  mockNotification = vi
    .fn()
    .mockImplementation((title: string, options?: NotificationOptions) => ({
      title,
      body: options?.body || '',
      icon: options?.icon || '/wedding-icon.png',
      close: vi.fn(),
      onclick: null,
      onshow: null,
      onclose: null,
      onerror: null,
    }));

  // Permission API Mock
  const mockPermissions = {
    query: vi.fn().mockResolvedValue({ state: 'granted' }),
  };

  // Clipboard API Mock (for sharing wedding details)
  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('wedding details copied'),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  };

  // Share API Mock (for wedding photo sharing)
  const mockShare = vi.fn().mockResolvedValue(undefined);

  // Intersection Observer Mock (for photo lazy loading)
  const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0],
  }));

  // Resize Observer Mock (for responsive wedding galleries)
  const mockResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mutation Observer Mock (for dynamic content)
  const mockMutationObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn().mockReturnValue([]),
  }));

  // Apply all mocks to global objects
  Object.defineProperty(global, 'navigator', {
    value: {
      ...global.navigator,
      connection: mockConnection,
      serviceWorker: mockServiceWorker,
      geolocation: mockGeolocation,
      mediaDevices: mockMediaDevices,
      permissions: mockPermissions,
      clipboard: mockClipboard,
      share: mockShare,
      onLine: true,
      language: 'en-GB', // UK wedding market
      languages: ['en-GB', 'en-US'],
      userAgent: 'WedSync Test Browser',
      platform: 'Web',
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'window', {
    value: {
      ...global.window,
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      caches: mockCacheStorage,
      indexedDB: mockIndexedDB,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/',
        search: '',
        hash: '',
        reload: vi.fn(),
        replace: vi.fn(),
        assign: vi.fn(),
      },
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        go: vi.fn(),
        length: 1,
        state: null,
      },
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
      },
      devicePixelRatio: 1,
      innerWidth: 1920,
      innerHeight: 1080,
      outerWidth: 1920,
      outerHeight: 1080,
      scrollX: 0,
      scrollY: 0,
      pageXOffset: 0,
      pageYOffset: 0,
    },
    writable: true,
    configurable: true,
  });

  // Global functions
  Object.defineProperty(global, 'fetch', {
    value: mockFetch,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'Notification', {
    value: mockNotification,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'IntersectionObserver', {
    value: mockIntersectionObserver,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'ResizeObserver', {
    value: mockResizeObserver,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'MutationObserver', {
    value: mockMutationObserver,
    writable: true,
    configurable: true,
  });

  // URL Mock for file handling
  Object.defineProperty(global, 'URL', {
    value: {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
    configurable: true,
  });

  // FileReader Mock (for wedding photo uploads)
  Object.defineProperty(global, 'FileReader', {
    value: vi.fn().mockImplementation(() => ({
      readAsDataURL: vi.fn(),
      readAsText: vi.fn(),
      readAsArrayBuffer: vi.fn(),
      readAsBinaryString: vi.fn(),
      onload: null,
      onerror: null,
      onprogress: null,
      result: 'data:image/jpeg;base64,mock-wedding-photo-data',
      error: null,
      readyState: 2, // DONE
    })),
    writable: true,
    configurable: true,
  });

  // FormData Mock (for form submissions)
  Object.defineProperty(global, 'FormData', {
    value: vi.fn().mockImplementation(() => {
      const data = new Map();
      return {
        append: vi.fn((key, value) => data.set(key, value)),
        delete: vi.fn((key) => data.delete(key)),
        get: vi.fn((key) => data.get(key)),
        getAll: vi.fn((key) => [data.get(key)].filter(Boolean)),
        has: vi.fn((key) => data.has(key)),
        set: vi.fn((key, value) => data.set(key, value)),
        entries: vi.fn(() => data.entries()),
        keys: vi.fn(() => data.keys()),
        values: vi.fn(() => data.values()),
        forEach: vi.fn((callback) => data.forEach(callback)),
        [Symbol.iterator]: vi.fn(() => data.entries()),
      };
    }),
    writable: true,
    configurable: true,
  });

  // Blob Mock (for file handling)
  Object.defineProperty(global, 'Blob', {
    value: vi.fn().mockImplementation((parts, options) => ({
      size: parts ? parts.reduce((acc, part) => acc + part.length, 0) : 0,
      type: options?.type || 'application/octet-stream',
      slice: vi.fn(),
      stream: vi.fn(),
      text: vi.fn().mockResolvedValue('mock blob text'),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    })),
    writable: true,
    configurable: true,
  });

  // Performance Mock
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn().mockReturnValue(Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn().mockReturnValue([]),
      getEntriesByName: vi.fn().mockReturnValue([]),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
      timing: {
        navigationStart: Date.now() - 1000,
        loadEventEnd: Date.now(),
      },
    },
    writable: true,
    configurable: true,
  });
}

/**
 * Reset all mocks to their default state
 * Call this in beforeEach to ensure test isolation
 */
export function resetBrowserMocks(): void {
  if (mockConnection) {
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 50;
    mockConnection.saveData = false;
    vi.clearAllMocks();
  }

  if (mockServiceWorker) {
    vi.clearAllMocks();
  }

  if (mockFetch) {
    mockFetch.mockClear();
  }

  if (mockLocalStorage) {
    mockLocalStorage.clear();
  }

  if (mockSessionStorage) {
    mockSessionStorage.clear();
  }

  // Reset navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
  });
}

/**
 * Simulate poor network conditions (wedding venue scenarios)
 */
export function simulatePoorNetwork(): void {
  if (mockConnection) {
    mockConnection.effectiveType = 'slow-2g';
    mockConnection.downlink = 0.1;
    mockConnection.rtt = 2000;
    mockConnection.saveData = true;
  }

  Object.defineProperty(navigator, 'onLine', {
    value: true, // Still technically online but very slow
    writable: true,
  });

  // Make fetch slower
  if (mockFetch) {
    mockFetch.mockImplementation(
      (url) =>
        new Promise(
          (resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: vi.fn().mockResolvedValue({ success: true }),
                }),
              3000,
            ), // 3 second delay
        ),
    );
  }
}

/**
 * Simulate offline state (no network at venue)
 */
export function simulateOfflineState(): void {
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    writable: true,
  });

  if (mockFetch) {
    mockFetch.mockRejectedValue(new Error('Network request failed'));
  }
}

/**
 * Simulate mobile device (for responsive testing)
 */
export function simulateMobileDevice(): void {
  Object.defineProperty(window, 'innerWidth', { value: 375 }); // iPhone SE
  Object.defineProperty(window, 'innerHeight', { value: 667 });
  Object.defineProperty(screen, 'width', { value: 375 });
  Object.defineProperty(screen, 'height', { value: 667 });
  Object.defineProperty(window, 'devicePixelRatio', { value: 2 });

  Object.defineProperty(navigator, 'userAgent', {
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    writable: true,
  });
}

/**
 * Simulate wedding emergency scenarios
 */
export function simulateWeddingEmergency(): void {
  simulatePoorNetwork();

  // Simulate high photo upload load
  if (mockFetch) {
    mockFetch.mockImplementation((url) => {
      const urlString = typeof url === 'string' ? url : url.url;

      if (urlString.includes('/api/photos/upload')) {
        return Promise.reject(
          new Error('Upload failed - venue network overloaded'),
        );
      }

      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn().mockResolvedValue({
          error: 'Wedding day high load - please try again',
        }),
      });
    });
  }
}

// Export for direct test usage
export const browserApiMocks = {
  setup: setupBrowserMocks,
  reset: resetBrowserMocks,
  simulatePoorNetwork,
  simulateOfflineState,
  simulateMobileDevice,
  simulateWeddingEmergency,
};
