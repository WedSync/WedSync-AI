/**
 * Comprehensive Unit Tests for Enhanced OfflineIndicator Component
 * WS-172 Round 3: Offline Storage Integration
 * 
 * Testing Requirements:
 * - >80% coverage requirement
 * - UX and progress feedback validation
 * - Wedding-specific functionality
 * - Accessibility compliance testing
 * - Network quality monitoring
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OfflineIndicator } from '../OfflineIndicator'
import { syncManager } from '@/lib/offline/sync-manager'
import { smartCacheManager } from '@/lib/offline/offline-database'
// Mock dependencies
vi.mock('@/lib/offline/sync-manager')
vi.mock('@/lib/offline/offline-database')
// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})
// Mock fetch for network quality testing
global.fetch = vi.fn()
// Mock sync status data
const createMockSyncStatus = (overrides = {}) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  totalCount: 0,
  lastSyncTime: new Date().toISOString(),
  pendingItems: [],
  ...overrides
describe('OfflineIndicator Enhanced Component', () => {
  let mockSyncManager: any
  let mockCacheManager: any
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock implementations
    mockSyncManager = {
      getStatus: vi.fn().mockResolvedValue(createMockSyncStatus()),
      onStatusChange: vi.fn(),
      removeStatusListener: vi.fn(),
      forcSync: vi.fn(),
      clearFailedItems: vi.fn()
    }
    mockCacheManager = {
      getCacheUsage: vi.fn().mockResolvedValue({
        usage: 0.65,
        size: 1024 * 1024 * 50, // 50MB
        quota: 1024 * 1024 * 100 // 100MB
      })
    // Apply mocks
    vi.mocked(syncManager).mockReturnValue(mockSyncManager)
    vi.mocked(smartCacheManager).mockReturnValue(mockCacheManager)
    // Mock fetch for network quality
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200
    } as Response)
    // Reset navigator state
    navigator.onLine = true
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('Basic Rendering and Variants', () => {
    it('should render minimal variant correctly', async () => {
      render(<OfflineIndicator variant="minimal" />)
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      // Should only show icon in minimal variant
      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveClass('inline-flex', 'items-center')
    })
    it('should render compact variant with status text', async () => {
      render(<OfflineIndicator variant="compact" />)
        expect(screen.getByText(/up to date/i)).toBeInTheDocument()
    it('should render detailed variant with comprehensive information', async () => {
      render(
        <OfflineIndicator 
          variant="detailed" 
          showDetails={true}
          weddingContext={true}
        />
      )
        expect(screen.getByText(/Local Storage:/)).toBeInTheDocument()
        expect(screen.getByText(/Connection:/)).toBeInTheDocument()
  describe('Network Status Detection', () => {
    it('should show online status when connected', async () => {
      navigator.onLine = true
      render(<OfflineIndicator variant="compact" weddingContext={true} />)
        expect(screen.getByText(/Wedding data up to date/)).toBeInTheDocument()
    it('should show offline status when disconnected', async () => {
      navigator.onLine = false
      mockSyncManager.getStatus.mockResolvedValue(
        createMockSyncStatus({ isOnline: false })
        expect(screen.getByText(/Working offline - changes saved locally/)).toBeInTheDocument()
    it('should detect and display network quality', async () => {
      // Mock slow network response
      vi.mocked(fetch).mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200
          } as Response), 2500)
        )
      render(<OfflineIndicator variant="detailed" showDetails={true} />)
      // Wait for network quality check
        expect(screen.getByText(/Slow/)).toBeInTheDocument()
      }, { timeout: 5000 })
  describe('Sync Status and Progress', () => {
    it('should show syncing status with progress', async () => {
        createMockSyncStatus({
          isSyncing: true,
          totalCount: 10,
          pendingCount: 3
        })
          variant="compact" 
          showProgress={true}
        expect(screen.getByText(/Syncing 7\/10/)).toBeInTheDocument()
      // Check for progress bar
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '70')
    it('should show pending updates count', async () => {
          pendingCount: 5,
          totalCount: 5
        expect(screen.getByText(/5 pending wedding updates/)).toBeInTheDocument()
    it('should show sync errors with clear messaging', async () => {
          failedCount: 2
        expect(screen.getByText(/2 sync errors - wedding data may be outdated/)).toBeInTheDocument()
  describe('Wedding-Specific Priority Detection', () => {
    it('should show critical priority alert for emergency updates', async () => {
          pendingItems: [
            {
              type: 'emergency_contact',
              priority: 10,
              data: { name: 'Emergency Contact' }
            }
          ],
          pendingCount: 1
        expect(screen.getByText(/Critical wedding data pending/)).toBeInTheDocument()
        expect(screen.getByText(/Critical wedding updates need immediate sync/)).toBeInTheDocument()
    it('should show high priority for timeline updates', async () => {
              type: 'timeline_update',
              priority: 8,
              data: { event: 'Ceremony update' }
        expect(screen.getByText(/1 pending high-priority updates/)).toBeInTheDocument()
    it('should show normal priority for regular updates', async () => {
              type: 'guest_update',
              priority: 5,
              data: { guestId: 'guest-123' }
        expect(screen.getByText(/1 pending wedding updates/)).toBeInTheDocument()
  describe('Interactive Actions', () => {
    it('should trigger manual sync when button clicked', async () => {
          pendingCount: 3,
          isOnline: true
        const syncButton = screen.getByText(/Sync Now/)
        expect(syncButton).toBeInTheDocument()
      const syncButton = screen.getByText(/Sync Now/)
      fireEvent.click(syncButton)
      expect(mockSyncManager.forcSync).toHaveBeenCalledTimes(1)
    it('should clear failed items when button clicked', async () => {
        const clearButton = screen.getByText(/Clear Errors/)
        expect(clearButton).toBeInTheDocument()
      const clearButton = screen.getByText(/Clear Errors/)
      fireEvent.click(clearButton)
      expect(mockSyncManager.clearFailedItems).toHaveBeenCalledTimes(1)
  describe('Accessibility Compliance', () => {
    it('should have proper ARIA attributes', async () => {
        const statusElement = screen.getByRole('status')
        expect(statusElement).toHaveAttribute('aria-live', 'polite')
        expect(statusElement).toHaveAttribute('aria-label')
    it('should have accessible progress bar', async () => {
          pendingCount: 4
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '60')
        expect(progressBar).toHaveAttribute('aria-valuemin', '0')
        expect(progressBar).toHaveAttribute('aria-valuemax', '100')
        expect(progressBar).toHaveAttribute('aria-label', 'Sync progress: 60%')
    it('should have keyboard accessible buttons', async () => {
          pendingCount: 1,
      expect(syncButton.tagName).toBe('BUTTON')
      // Test keyboard interaction
      syncButton.focus()
      fireEvent.keyDown(syncButton, { key: 'Enter' })
  describe('Cache Usage Display', () => {
    it('should show cache usage information', async () => {
        expect(screen.getByText(/50.0 MB \(65%\)/)).toBeInTheDocument()
    it('should handle cache usage errors gracefully', async () => {
      mockCacheManager.getCacheUsage.mockRejectedValue(new Error('Cache error'))
      // Should not crash and still render other information
  describe('Status Change Handling', () => {
    it('should update display when sync status changes', async () => {
      const { rerender } = render(<OfflineIndicator variant="compact" />)
        expect(screen.getByText(/All synced/)).toBeInTheDocument()
      // Simulate status change
      const newStatus = createMockSyncStatus({
        isSyncing: true,
        pendingCount: 3
      act(() => {
        const statusCallback = mockSyncManager.onStatusChange.mock.calls[0][0]
        statusCallback(newStatus)
        expect(screen.getByText(/Syncing/)).toBeInTheDocument()
    it('should cleanup listeners on unmount', () => {
      const { unmount } = render(<OfflineIndicator variant="compact" />)
      unmount()
      expect(mockSyncManager.removeStatusListener).toHaveBeenCalledTimes(1)
  describe('Time Formatting', () => {
    it('should format last sync time correctly', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
          lastSyncTime: oneHourAgo.toISOString()
        expect(screen.getByText(/1h ago/)).toBeInTheDocument()
    it('should show "Just now" for recent syncs', async () => {
      const justNow = new Date(Date.now() - 30 * 1000) // 30 seconds ago
          lastSyncTime: justNow.toISOString()
        expect(screen.getByText(/Just now/)).toBeInTheDocument()
  describe('Position and Styling', () => {
    it('should apply fixed positioning when specified', async () => {
          position="fixed"
        const element = screen.getByRole('status')
        expect(element).toHaveClass('fixed', 'top-4', 'right-4', 'z-50')
    it('should apply critical styling for emergency priority', async () => {
              data: {}
          ]
        expect(element).toHaveClass('border-red-200', 'bg-red-50')
  describe('Performance and Updates', () => {
    it('should debounce rapid status updates', async () => {
      vi.useFakeTimers()
      // Simulate rapid status updates
      const statusCallback = mockSyncManager.onStatusChange.mock.calls[0][0]
        statusCallback(createMockSyncStatus({ pendingCount: 1 }))
        statusCallback(createMockSyncStatus({ pendingCount: 2 }))
        statusCallback(createMockSyncStatus({ pendingCount: 3 }))
      // Fast-forward timers
        vi.advanceTimersByTime(100)
        expect(screen.getByText(/3 pending/)).toBeInTheDocument()
      vi.useRealTimers()
    it('should not re-render unnecessarily', async () => {
      const renderSpy = vi.fn()
      const TestComponent = () => {
        renderSpy()
        return <OfflineIndicator variant="compact" />
      }
      render(<TestComponent />)
        expect(renderSpy).toHaveBeenCalledTimes(1)
      // Same status should not trigger re-render
        statusCallback(createMockSyncStatus())
      // Should not render again for identical status
      expect(renderSpy).toHaveBeenCalledTimes(1)
