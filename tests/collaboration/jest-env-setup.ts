// Mock browser APIs for Vitest test environment
import { vi } from 'vitest'

// Mock WebSocket
class MockWebSocket {
  url: string
  readyState: number
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    this.readyState = 0 // CONNECTING
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1 // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string) {
    // Echo back for testing
    if (this.onmessage && this.readyState === 1) {
      setTimeout(() => {
        this.onmessage!(new MessageEvent('message', { data }))
      }, 1)
    }
  }

  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }
}

// Mock globals for jsdom
Object.assign(global, {
  WebSocket: MockWebSocket,
  
  // Mock TextEncoder/TextDecoder for Y.js
  TextEncoder: global.TextEncoder || TextEncoder,
  TextDecoder: global.TextDecoder || TextDecoder,
  
  // Mock performance API
  performance: global.performance || {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {}
  },
  
  // Mock requestAnimationFrame
  requestAnimationFrame: global.requestAnimationFrame || ((callback: FrameRequestCallback) => {
    return setTimeout(callback, 16) // ~60fps
  }),
  
  cancelAnimationFrame: global.cancelAnimationFrame || clearTimeout
})

// Mock crypto for Y.js - handle it separately since it's read-only
if (!global.crypto?.getRandomValues) {
  try {
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256)
          }
          return arr
        }
      },
      writable: true,
      configurable: true
    })
  } catch (e) {
    // Crypto already exists and is read-only, which is fine for Y.js
    console.log('Using existing crypto implementation')
  }
}

// Mock IndexedDB using fake-indexeddb
import 'fake-indexeddb/auto'

// Mock window properties for mobile tests
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
})

// Mock touch events
class MockTouchEvent extends Event {
  touches: any[]
  targetTouches: any[]
  changedTouches: any[]

  constructor(type: string, options?: any) {
    super(type, options)
    this.touches = options?.touches || []
    this.targetTouches = options?.targetTouches || []
    this.changedTouches = options?.changedTouches || []
  }
}

class MockMessageEvent extends Event {
  data: any

  constructor(type: string, options?: any) {
    super(type, options)
    this.data = options?.data
  }
}

class MockCloseEvent extends Event {
  code: number
  reason: string
  wasClean: boolean

  constructor(type: string, options?: any) {
    super(type, options)
    this.code = options?.code || 1000
    this.reason = options?.reason || ''
    this.wasClean = options?.wasClean ?? true
  }
}

Object.assign(global, {
  TouchEvent: MockTouchEvent,
  MessageEvent: MockMessageEvent,
  CloseEvent: MockCloseEvent
})

// Suppress console warnings for tests
const originalConsoleWarn = console.warn
console.warn = vi.fn((...args: any[]) => {
  // Suppress Y.js warnings in tests
  if (args[0]?.includes && args[0].includes('Y.js')) {
    return
  }
  originalConsoleWarn.apply(console, args)
})

// Set test mode
process.env.NODE_ENV = 'test'
process.env.VITEST_WORKER_ID = process.env.VITEST_WORKER_ID || '1'

console.log('🧪 Collaboration test environment loaded for Vitest')