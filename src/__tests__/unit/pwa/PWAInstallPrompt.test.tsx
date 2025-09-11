/**
 * PWAInstallPrompt Component Unit Tests
 * WS-171: Mobile PWA Configuration - Manifest Configuration
 * Tests PWA installation detection and prompt functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt'
// Mock window.matchMedia
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})
// Mock navigator properties
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  standalone: false,
  onLine: true,
}
Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
// Mock global gtag function
const mockGtag = vi.fn()
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
describe('PWAInstallPrompt', () => {
  let mockDeferredPrompt: any
  let eventListeners: { [key: string]: Function[] } = {}
  beforeEach(() => {
    vi.clearAllMocks()
    eventListeners = {}
    
    // Reset DOM classes
    document.documentElement.className = ''
    // Mock addEventListener/removeEventListener to track event handlers
    const originalAddEventListener = window.addEventListener
    const originalRemoveEventListener = window.removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (!eventListeners[event]) eventListeners[event] = []
      eventListeners[event].push(handler)
      return originalAddEventListener.call(window, event, handler)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((event: string, handler: any) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler)
      }
      return originalRemoveEventListener.call(window, event, handler)
    // Mock matchMedia for desktop browser
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    // Mock deferred prompt
    mockDeferredPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('Initial Rendering', () => {
    it('should not render when not installable', () => {
      render(<PWAInstallPrompt />)
      
      // Should not be visible initially (no install prompt available)
      expect(screen.queryByText('Install WedSync')).not.toBeInTheDocument()
    it('should not render when already running as PWA', () => {
      // Mock standalone mode
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      // Should not render when already running as PWA
    it('should render when installable prompt is available', async () => {
      const { rerender } = render(<PWAInstallPrompt />)
      // Simulate beforeinstallprompt event
      const beforeInstallPromptHandler = eventListeners['beforeinstallprompt']?.[0]
      if (beforeInstallPromptHandler) {
        const mockEvent = {
          preventDefault: vi.fn(),
          prompt: vi.fn(),
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        }
        
        beforeInstallPromptHandler(mockEvent)
      rerender(<PWAInstallPrompt />)
      await waitFor(() => {
        expect(screen.getByText('Install WedSync')).toBeInTheDocument()
        expect(screen.getByText('Get the app experience with offline access')).toBeInTheDocument()
        expect(screen.getByText('Install App')).toBeInTheDocument()
      })
  describe('iOS Safari Handling', () => {
    beforeEach(() => {
      // Mock iOS Safari user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
    it('should show iOS installation instructions', async () => {
      // Simulate install prompt event (even though iOS doesn't have this, we simulate visibility)
        beforeInstallPromptHandler({
        })
        expect(screen.getByText('To install on iOS Safari:')).toBeInTheDocument()
        expect(screen.getByText('1. Tap the Share button')).toBeInTheDocument()
        expect(screen.getByText('2. Select "Add to Home Screen"')).toBeInTheDocument()
        expect(screen.getByText('3. Tap "Add" to install')).toBeInTheDocument()
        expect(screen.getByText('Got it')).toBeInTheDocument()
    it('should handle iOS instructions dismissal', async () => {
      // Simulate install prompt availability
      // Click "Got it"
      fireEvent.click(screen.getByText('Got it'))
        expect(screen.queryByText('Install WedSync')).not.toBeInTheDocument()
      // Should track dismissal
      expect(mockGtag).toHaveBeenCalledWith('event', 'pwa_install_banner_dismissed', {
        event_category: 'PWA',
        event_label: 'User closed install banner'
  describe('Desktop Installation Flow', () => {
      // Reset to desktop user agent
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    it('should show install button for desktop browsers', async () => {
        expect(screen.getByText('Later')).toBeInTheDocument()
        expect(screen.getByText('Works offline')).toBeInTheDocument()
        expect(screen.getByText('Quick access')).toBeInTheDocument()
    it('should handle successful installation', async () => {
      const mockPrompt = vi.fn()
      // Simulate beforeinstallprompt event with prompt function
          prompt: mockPrompt,
      // Click install button
      fireEvent.click(screen.getByText('Install App'))
      // Should show installing state
        expect(screen.getByText('Installing...')).toBeInTheDocument()
      // Should call prompt
      expect(mockPrompt).toHaveBeenCalled()
      // Should track acceptance
        expect(mockGtag).toHaveBeenCalledWith('event', 'pwa_install_prompt_accepted', {
          event_category: 'PWA',
          event_label: 'User accepted install prompt'
    it('should handle installation dismissal', async () => {
          userChoice: Promise.resolve({ outcome: 'dismissed' }),
      // Wait for user choice to resolve
        expect(mockGtag).toHaveBeenCalledWith('event', 'pwa_install_prompt_dismissed', {
          event_label: 'User dismissed install prompt'
    it('should handle "Later" button', async () => {
      // Click "Later"
      fireEvent.click(screen.getByText('Later'))
      // Should hide prompt
  describe('Event Handling', () => {
    it('should hide prompt after app installation', async () => {
      // Show prompt first
      // Simulate app installation
      const appInstalledHandler = eventListeners['appinstalled']?.[0]
      if (appInstalledHandler) {
        appInstalledHandler(new Event('appinstalled'))
    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<PWAInstallPrompt />)
      // Should have added event listeners
      expect(eventListeners['beforeinstallprompt']).toBeDefined()
      expect(eventListeners['appinstalled']).toBeDefined()
      unmount()
      // Event listeners should be cleaned up (mocked remove function should have been called)
      expect(window.removeEventListener).toHaveBeenCalled()
  describe('Global PWA Status Functions', () => {
    it('should integrate with global PWA functions if available', () => {
      // Mock global PWA status function
      Object.defineProperty(window, 'getPWAStatus', {
        value: vi.fn(() => ({
          isInstalled: false,
          isInstallable: true,
          hasPrompt: true,
        })),
      // Should call global function during initialization
      expect(window.getPWAStatus).toHaveBeenCalled()
    it('should handle missing global PWA functions gracefully', () => {
      // Ensure global functions don't exist
      delete (window as any).getPWAStatus
      delete (window as any).installPWA
      // Should not crash
      expect(() => render(<PWAInstallPrompt />)).not.toThrow()
  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      // Simulate installable state
        const closeButton = screen.getByRole('button', { name: /close|dismiss/i })
        expect(closeButton).toBeInTheDocument()
        const installButton = screen.getByText('Install App')
        expect(installButton).toBeInTheDocument()
        expect(installButton.tagName).toBe('BUTTON')
    it('should be keyboard navigable', async () => {
        const laterButton = screen.getByText('Later')
        // Should be focusable
        installButton.focus()
        expect(document.activeElement).toBe(installButton)
        laterButton.focus()
        expect(document.activeElement).toBe(laterButton)
  describe('Error Handling', () => {
    it('should handle installation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockPrompt = vi.fn().mockRejectedValue(new Error('Installation failed'))
      // Click install button (should fail)
      // Should handle error gracefully and return to normal state
        expect(screen.queryByText('Installing...')).not.toBeInTheDocument()
      consoleSpy.restore()
  describe('Custom CSS Classes', () => {
    it('should apply custom className prop', () => {
      const customClass = 'custom-install-prompt'
      const { container } = render(<PWAInstallPrompt className={customClass} />)
      expect(container.firstChild).toHaveClass(customClass)
