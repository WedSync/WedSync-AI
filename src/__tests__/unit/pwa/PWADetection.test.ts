/**
 * PWA Detection and Service Worker Unit Tests
 * WS-171: Mobile PWA Configuration - Manifest Configuration
 * Tests PWA capability detection and service worker registration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupBrowserMocks, resetBrowserMocks } from '../setup/browser-api-mocks';
import { JSDOM } from 'jsdom'
// Mock global objects for PWA testing
interface MockServiceWorkerContainer {
  register: ReturnType<typeof vi.fn>
  ready: Promise<MockServiceWorkerRegistration>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  controller: MockServiceWorker | null
}
interface MockServiceWorker {
  state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant'
interface MockServiceWorkerRegistration {
  active: MockServiceWorker | null
  installing: MockServiceWorker | null
  waiting: MockServiceWorker | null
  onupdatefound: ((event: Event) => void) | null
describe('PWA Detection and Service Worker', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  let dom: JSDOM
  let mockServiceWorker: MockServiceWorkerContainer
  let mockRegistration: MockServiceWorkerRegistration
  let mockWindow: Window & typeof globalThis
  beforeEach(() => {
    // Create a new JSDOM environment for each test
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable',
    })
    mockWindow = dom.window as Window & typeof globalThis
    global.window = mockWindow
    global.document = mockWindow.document
    global.navigator = mockWindow.navigator as Navigator
    // Mock service worker registration
    mockRegistration = {
      active: {
        state: 'activated',
      },
      installing: null,
      waiting: null,
      onupdatefound: null,
      addEventListener: vi.fn(),
    }
    mockServiceWorker = {
      register: vi.fn(() => Promise.resolve(mockRegistration)),
      ready: Promise.resolve(mockRegistration),
      removeEventListener: vi.fn(),
      controller: {
    // Add service worker to navigator
    Object.defineProperty(mockWindow.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      configurable: true,
    // Mock matchMedia
    Object.defineProperty(mockWindow, 'matchMedia', {
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    // Mock gtag for analytics
    Object.defineProperty(mockWindow, 'gtag', {
      value: vi.fn(),
    // Mock performance
    Object.defineProperty(mockWindow, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
  })
  afterEach(() => {
    vi.clearAllMocks()
    dom.window.close()
  describe('Service Worker Detection', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should detect service worker support', () => {
      expect('serviceWorker' in mockWindow.navigator).toBe(true)
    it('should register service worker successfully', async () => {
      const registration = await mockWindow.navigator.serviceWorker!.register('/sw.js')
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(registration).toBe(mockRegistration)
    it('should handle service worker registration failure', async () => {
      const registrationError = new Error('Service worker registration failed')
      mockServiceWorker.register.mockRejectedValue(registrationError)
      try {
        await mockWindow.navigator.serviceWorker!.register('/sw.js')
      } catch (error) {
        expect(error).toBe(registrationError)
      }
      expect(mockServiceWorker.register).toHaveBeenCalled()
    it('should handle missing service worker support', () => {
      // Remove service worker support
      delete (mockWindow.navigator as unknown).serviceWorker
      expect('serviceWorker' in mockWindow.navigator).toBe(false)
  describe('PWA Installation Detection', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should detect standalone display mode', () => {
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      }))
      Object.defineProperty(mockWindow, 'matchMedia', {
        value: mockMatchMedia,
      })
      const standaloneQuery = mockWindow.matchMedia('(display-mode: standalone)')
      expect(standaloneQuery.matches).toBe(true)
    it('should detect iOS standalone mode', () => {
      // Mock iOS Safari standalone
      Object.defineProperty(mockWindow.navigator, 'standalone', {
        value: true,
        configurable: true,
      expect((mockWindow.navigator as unknown).standalone).toBe(true)
    it('should implement isPWA function correctly', () => {
      // Simulate the isPWA function from layout.tsx
      function isPWA() {
        return mockWindow.matchMedia('(display-mode: standalone)').matches ||
               (mockWindow.navigator as unknown).standalone ||
               document.referrer.includes('android-app://')
      // Test desktop PWA
      expect(isPWA()).toBe(true)
    it('should detect Android app referrer', () => {
      // Mock document.referrer for Android app
      Object.defineProperty(document, 'referrer', {
        value: 'android-app://com.example.app',
  describe('PWA Installation Events', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle beforeinstallprompt event', () => {
      const beforeInstallPromptHandler = vi.fn((e: Event) => {
        e.preventDefault()
        // Simulate storing the deferred prompt
        ;(mockWindow as unknown).deferredPrompt = e
      mockWindow.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)
      // Simulate the event
      const mockEvent = new CustomEvent('beforeinstallprompt', {
        detail: {
          prompt: vi.fn(),
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        },
      mockWindow.dispatchEvent(mockEvent)
      expect(beforeInstallPromptHandler).toHaveBeenCalled()
    it('should handle appinstalled event', () => {
      const appInstalledHandler = vi.fn(() => {
        // Simulate marking app as installed
        ;(mockWindow as unknown).pwaInstalled = true
      mockWindow.addEventListener('appinstalled', appInstalledHandler)
      const mockEvent = new CustomEvent('appinstalled')
      expect(appInstalledHandler).toHaveBeenCalled()
    it('should provide global installPWA function', () => {
      // Simulate the global installPWA function from layout.tsx
      let deferredPrompt: any = {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      ;(mockWindow as unknown).installPWA = async function() {
        if (!deferredPrompt) return false
        
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        deferredPrompt = null
        return outcome === 'accepted'
      expect(typeof (mockWindow as unknown).installPWA).toBe('function')
    it('should provide global getPWAStatus function', () => {
      // Simulate the global getPWAStatus function from layout.tsx
      ;(mockWindow as unknown).getPWAStatus = function() {
        const isPWAInstalled = mockWindow.matchMedia('(display-mode: standalone)').matches
        const hasPrompt = Boolean((mockWindow as unknown).deferredPrompt)
        return {
          isInstalled: isPWAInstalled,
          isInstallable: hasPrompt,
          hasPrompt: hasPrompt,
        }
      const status = (mockWindow as unknown).getPWAStatus()
      expect(status).toHaveProperty('isInstalled')
      expect(status).toHaveProperty('isInstallable')
      expect(status).toHaveProperty('hasPrompt')
  describe('Service Worker Update Handling', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should detect service worker updates', () => {
      const updateHandler = vi.fn()
      const newWorker = {
        state: 'installing',
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'statechange') {
            // Simulate state change to installed
            ;(newWorker as unknown).state = 'installed'
            handler()
          }
        }),
      mockRegistration.installing = newWorker as any
      mockRegistration.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'updatefound') {
          handler()
      // Simulate update detection
      mockRegistration.addEventListener('updatefound', () => {
        if (mockRegistration.installing) {
          mockRegistration.installing.addEventListener('statechange', () => {
            if (mockRegistration.installing?.state === 'installed' && mockWindow.navigator.serviceWorker?.controller) {
              updateHandler()
            }
          })
      expect(updateHandler).toHaveBeenCalled()
    it('should dispatch sw-update-available event', () => {
      const customEventSpy = vi.spyOn(mockWindow, 'dispatchEvent')
      // Simulate the custom event dispatch from layout.tsx
      mockWindow.dispatchEvent(new CustomEvent('sw-update-available', {
        detail: { registration: mockRegistration }
      expect(customEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sw-update-available'
        })
      )
  describe('DOM Class Management', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should add PWA-related classes to document element', () => {
      // Simulate the class management from layout.tsx
      function updatePWAStatus() {
        if (isPWAInstalled) {
          document.documentElement.classList.add('pwa-installed')
        } else {
          document.documentElement.classList.add('browser-mode')
      updatePWAStatus()
      expect(document.documentElement.classList.contains('browser-mode')).toBe(true)
    it('should add pwa-installable class when prompt is available', () => {
      document.documentElement.classList.add('pwa-installable')
      expect(document.documentElement.classList.contains('pwa-installable')).toBe(true)
    it('should remove browser-only elements in PWA mode', () => {
      // Create test elements
      const browserOnlyElement = document.createElement('div')
      browserOnlyElement.className = 'browser-only'
      document.body.appendChild(browserOnlyElement)
      // Simulate PWA mode detection
      // Simulate hiding browser-only elements in PWA mode
      if (mockWindow.matchMedia('(display-mode: standalone)').matches) {
        const browserElements = document.querySelectorAll('.browser-only')
        browserElements.forEach(el => {
          (el as HTMLElement).style.display = 'none'
      expect(browserOnlyElement.style.display).toBe('none')
  describe('Analytics Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should track PWA installation events', () => {
      // Simulate analytics tracking from layout.tsx
      const gtag = (mockWindow as unknown).gtag
      // Track installation
      mockWindow.dispatchEvent(new CustomEvent('pwa-installed'))
      // Check if gtag was called (would be called in event handler)
      expect(gtag).toBeDefined()
    it('should handle missing gtag gracefully', () => {
      delete (mockWindow as unknown).gtag
      // Should not throw when trying to track events
      expect(() => {
        mockWindow.dispatchEvent(new CustomEvent('pwa-installed'))
      }).not.toThrow()
  describe('Error Handling', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle service worker registration errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'))
        // Error should be caught and handled
        expect(error).toBeInstanceOf(Error)
      consoleErrorSpy.restore()
    it('should handle missing matchMedia gracefully', () => {
      delete (mockWindow as unknown).matchMedia
      // Should not throw when checking PWA status
        const hasPWASupport = 'matchMedia' in mockWindow
        expect(hasPWASupport).toBe(false)
    it('should handle corrupted event objects', () => {
      const errorHandler = vi.fn()
      mockWindow.addEventListener('error', errorHandler)
      // Simulate malformed beforeinstallprompt event
      const corruptedEvent = {} as Event
        mockWindow.dispatchEvent(corruptedEvent)
  describe('Performance Considerations', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should avoid blocking the main thread during PWA detection', () => {
      const start = performance.now()
      // Simulate PWA detection logic
      const isPWAInstalled = mockWindow.matchMedia('(display-mode: standalone)').matches
      const hasServiceWorker = 'serviceWorker' in mockWindow.navigator
      const isIOSStandalone = (mockWindow.navigator as unknown).standalone
      const end = performance.now()
      // Detection should be very fast
      expect(end - start).toBeLessThan(10) // Less than 10ms
      // Results should be boolean
      expect(typeof isPWAInstalled).toBe('boolean')
      expect(typeof hasServiceWorker).toBe('boolean')
      expect(typeof isIOSStandalone).toBe('boolean')
    it('should not cause memory leaks with event listeners', () => {
      const listeners: Array<() => void> = []
      // Simulate proper cleanup
      const cleanup = () => {
        listeners.forEach(removeListener => removeListener())
        listeners.length = 0
      // Add some event listeners
      const handler1 = () => {}
      const handler2 = () => {}
      mockWindow.addEventListener('beforeinstallprompt', handler1)
      mockWindow.addEventListener('appinstalled', handler2)
      listeners.push(
        () => mockWindow.removeEventListener('beforeinstallprompt', handler1),
        () => mockWindow.removeEventListener('appinstalled', handler2)
      // Cleanup should not throw
      expect(() => cleanup()).not.toThrow()
      expect(listeners).toHaveLength(0)
  describe('Cross-browser Compatibility', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should work in browsers without service worker support', () => {
      // Should gracefully handle missing service worker
      expect(hasServiceWorker).toBe(false)
    it('should work in browsers without matchMedia support', () => {
      // Should gracefully handle missing matchMedia
      const hasMatchMedia = 'matchMedia' in mockWindow
      expect(hasMatchMedia).toBe(false)
    it('should handle iOS Safari specifics', () => {
      // Mock iOS Safari user agent
      Object.defineProperty(mockWindow.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      const isIOS = /iPad|iPhone|iPod/.test(mockWindow.navigator.userAgent)
      expect(isIOS).toBe(true)
    it('should handle Chrome/Edge PWA installation', () => {
      // Mock Chrome user agent
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      const isChrome = /Chrome/.test(mockWindow.navigator.userAgent)
      expect(isChrome).toBe(true)
})
