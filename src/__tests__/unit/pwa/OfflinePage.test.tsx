/**
 * Offline Page Component Unit Tests
 * WS-171: Mobile PWA Configuration - Manifest Configuration
 * Tests PWA offline experience and connectivity detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import OfflinePage from '@/app/offline/page'
// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))
// Mock Link component
vi.mock('next/link', () => {
  return {
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  }
})
// Mock fetch for health check
global.fetch = vi.fn()
describe('OfflinePage', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  let originalNavigator: Navigator
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Store original navigator
    originalNavigator = global.navigator
    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false, // Start offline
    })
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/offline',
      },
    // Mock fetch to fail initially (simulating offline)
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    global.navigator = originalNavigator
  describe('Initial Rendering', () => {
    it('should render offline state by default', () => {
      render(<OfflinePage />)
      
      expect(screen.getByText("You're Offline")).toBeInTheDocument()
      expect(screen.getByText("Don't worry! You can still use many WedSync features while offline.")).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    it('should show offline status indicator', () => {
      expect(screen.getByText('Status:')).toBeInTheDocument()
      expect(screen.getByText('Offline')).toBeInTheDocument()
    it('should display offline features list', () => {
      expect(screen.getByText('Available Offline')).toBeInTheDocument()
      expect(screen.getByText('Wedding Timeline')).toBeInTheDocument()
      expect(screen.getByText('Guest List')).toBeInTheDocument()
      expect(screen.getByText('Task Management')).toBeInTheDocument()
      expect(screen.getByText('Continue Offline')).toBeInTheDocument()
    it('should show offline tips', () => {
      expect(screen.getByText('Offline Tips')).toBeInTheDocument()
      expect(screen.getByText('Your changes will sync automatically when you\'re back online')).toBeInTheDocument()
      expect(screen.getByText('Photo uploads will resume when connection is restored')).toBeInTheDocument()
      expect(screen.getByText('Vendor communications require an internet connection')).toBeInTheDocument()
  describe('Online State Detection', () => {
    it('should detect when coming back online', async () => {
      // Initially offline
      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })
      // Trigger online event
      fireEvent(window, new Event('online'))
      await waitFor(() => {
        expect(screen.getByText('Connection Restored')).toBeInTheDocument()
        expect(screen.getByText('Great! Your internet connection is back. You can now access all features.')).toBeInTheDocument()
    it('should show "Go to Dashboard" button when online', async () => {
      // Go online
        expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    it('should hide offline features when online', async () => {
        expect(screen.queryByText('Available Offline')).not.toBeInTheDocument()
  describe('Network Connectivity Testing', () => {
    it('should test connectivity with health check API when retry is clicked', async () => {
      // Mock successful API response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)
      // Should show checking state
        expect(screen.getByText('Checking...')).toBeInTheDocument()
      // Should attempt to fetch health endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/health', {
        cache: 'no-cache',
        method: 'HEAD',
    it('should redirect to dashboard on successful connectivity test', async () => {
        expect(window.location.href).toBe('/dashboard')
    it('should handle failed connectivity test gracefully', async () => {
      // Keep fetch mocked to fail
      // Should show checking state briefly
      // Should return to try again state
        expect(screen.getByText('Try Again')).toBeInTheDocument()
    it('should not be able to retry while checking', async () => {
      ;(global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
      )
        const checkingButton = screen.getByText('Checking...')
        expect(checkingButton).toBeDisabled()
  describe('Event Listeners', () => {
    it('should add online/offline event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<OfflinePage />)
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    it('should handle offline event', async () => {
      // Start online
      // Go offline
        value: false,
      fireEvent(window, new Event('offline'))
        expect(screen.getByText("You're Offline")).toBeInTheDocument()
  describe('Offline Features Navigation', () => {
    it('should provide link to dashboard for offline browsing', () => {
      const continueOfflineButton = screen.getByText('Continue Offline')
      expect(continueOfflineButton.closest('a')).toHaveAttribute('href', '/dashboard')
    it('should describe available offline features accurately', () => {
      // Check timeline feature description
      expect(screen.getByText('View your saved timeline and events')).toBeInTheDocument()
      // Check guest list feature description
      expect(screen.getByText('Browse your guest information')).toBeInTheDocument()
      // Check task management description
      expect(screen.getByText('View tasks (updates sync when online)')).toBeInTheDocument()
    it('should show appropriate icons for different features', () => {
      // Icons should be present for each feature (SVG elements)
      const svgElements = screen.getAllByRole('img', { hidden: true })
      expect(svgElements.length).toBeGreaterThan(0)
  describe('Status Indicator', () => {
    it('should show correct status colors for online state', async () => {
        const onlineStatus = screen.getByText('Online')
        expect(onlineStatus).toHaveClass('text-green-600')
    it('should show correct status colors for offline state', () => {
      const offlineStatus = screen.getByText('Offline')
      expect(offlineStatus).toHaveClass('text-red-500')
  describe('Responsive Design', () => {
    it('should render properly on different screen sizes', () => {
      // Check for responsive classes
      const container = screen.getByText("You're Offline").closest('div')
      expect(container).toHaveClass('max-w-md')
      expect(container).toHaveClass('w-full')
    it('should have proper spacing and layout classes', () => {
      const mainContainer = screen.getByText("You're Offline").closest('div')?.parentElement
      expect(mainContainer).toHaveClass('space-y-6')
  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { name: /you're offline/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /available offline/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /offline tips/i })).toBeInTheDocument()
    it('should have accessible button labels', () => {
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()
      const continueButton = screen.getByRole('link', { name: /continue offline/i })
      expect(continueButton).toBeInTheDocument()
    it('should provide meaningful descriptions for offline features', () => {
      // Each feature should have a description
      const featureDescriptions = [
        'View your saved timeline and events',
        'Browse your guest information',
        'View tasks (updates sync when online)',
      ]
      featureDescriptions.forEach(description => {
        expect(screen.getByText(description)).toBeInTheDocument()
    it('should have proper ARIA attributes for status indicators', () => {
      // Status should be clearly indicated
  describe('Error Handling', () => {
    it('should handle fetch API errors gracefully', async () => {
      // Mock fetch to throw
      ;(global.fetch as any).mockRejectedValue(new Error('Fetch failed'))
      // Should not crash and should return to retry state
    it('should handle missing fetch API gracefully', async () => {
      // Remove fetch entirely
      const originalFetch = global.fetch
      delete (global as any).fetch
      // Should not crash when clicking retry
      expect(() => fireEvent.click(retryButton)).not.toThrow()
      // Restore fetch
      global.fetch = originalFetch
    it('should handle navigator.onLine being undefined', () => {
      // Mock navigator.onLine as undefined
        value: undefined,
      // Should not crash during render
      expect(() => render(<OfflinePage />)).not.toThrow()
  describe('Performance', () => {
    it('should render quickly without expensive operations', () => {
      const start = performance.now()
      const end = performance.now()
      // Should render in reasonable time
      expect(end - start).toBeLessThan(100) // Less than 100ms
    it('should handle rapid online/offline state changes', async () => {
      // Rapidly toggle online/offline
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: i % 2 === 0,
        })
        
        fireEvent(window, new Event(i % 2 === 0 ? 'offline' : 'online'))
      }
      // Should still be functional
        expect(screen.getByText(/offline|online/i)).toBeInTheDocument()
