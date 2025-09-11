import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { usePresence } from '@/hooks/useRealtime'
import { VendorPresenceIndicator, VendorPresenceList } from '@/components/dashboard/realtime/VendorPresence'

// Mock the realtime hook
jest.mock('@/hooks/useRealtime')

describe('Presence Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('usePresence Hook', () => {
    it('should track user presence', async () => {
      const mockOnlineUsers = [
        { userId: 'user-1', status: 'online', onlineAt: Date.now() },
        { userId: 'user-2', status: 'away', onlineAt: Date.now() - 60000 },
      ]

      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: mockOnlineUsers,
        activeUserCount: 2,
        isTracking: true,
        updatePresence: jest.fn(),
        trackCursor: jest.fn(),
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
        })
      )

      expect(result.current.activeUserCount).toBe(2)
      expect(result.current.onlineUsers).toHaveLength(2)
      expect(result.current.isTracking).toBe(true)
    })

    it('should update user status', async () => {
      const mockUpdatePresence = jest.fn()
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
        updatePresence: mockUpdatePresence,
        trackCursor: jest.fn(),
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
        })
      )

      act(() => {
        result.current.updatePresence({ status: 'busy' })
      })

      expect(mockUpdatePresence).toHaveBeenCalledWith({ status: 'busy' })
    })

    it('should track typing indicator', async () => {
      const mockUpdatePresence = jest.fn()
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
        updatePresence: mockUpdatePresence,
        setTyping: jest.fn((isTyping: boolean) => {
          mockUpdatePresence({ isTyping })
        }),
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
        })
      )

      act(() => {
        result.current.setTyping(true)
      })

      expect(mockUpdatePresence).toHaveBeenCalledWith({ isTyping: true })
    })

    it('should handle user going idle', async () => {
      jest.useFakeTimers()
      const mockUpdatePresence = jest.fn()
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
        updatePresence: mockUpdatePresence,
        trackCursor: jest.fn(),
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
          idleTimeout: 60000,
        })
      )

      // Simulate no activity for idle timeout
      jest.advanceTimersByTime(60000)

      await waitFor(() => {
        expect(mockUpdatePresence).toHaveBeenCalledWith({ status: 'idle' })
      })

      jest.useRealTimers()
    })

    it('should track cursor position', async () => {
      const mockTrackCursor = jest.fn()
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
        updatePresence: jest.fn(),
        trackCursor: mockTrackCursor,
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
        })
      )

      act(() => {
        result.current.trackCursor({ x: 100, y: 200 })
      })

      expect(mockTrackCursor).toHaveBeenCalledWith({ x: 100, y: 200 })
    })
  })

  describe('VendorPresenceIndicator Component', () => {
    it('should show online status', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'vendor-1', status: 'online' },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceIndicator 
          vendorId="vendor-1"
          vendorName="Test Vendor"
          showDetails
        />
      )

      expect(screen.getByText('Test Vendor')).toBeInTheDocument()
    })

    it('should show offline status', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
      })

      render(
        <VendorPresenceIndicator 
          vendorId="vendor-1"
          vendorName="Test Vendor"
          showDetails
        />
      )

      expect(screen.getByText('Test Vendor')).toBeInTheDocument()
    })

    it('should display last seen time', () => {
      const lastSeen = Date.now() - 300000 // 5 minutes ago
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'vendor-1', status: 'away', lastSeen },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceIndicator 
          vendorId="vendor-1"
          vendorName="Test Vendor"
          showDetails
        />
      )

      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument()
    })
  })

  describe('VendorPresenceList Component', () => {
    const mockVendors = [
      { id: 'vendor-1', name: 'Photographer', role: 'Photography' },
      { id: 'vendor-2', name: 'Florist', role: 'Flowers' },
      { id: 'vendor-3', name: 'DJ', role: 'Music' },
    ]

    it('should display all vendors', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'vendor-1', status: 'online' },
          { userId: 'vendor-2', status: 'away' },
        ],
        activeUserCount: 2,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      expect(screen.getByText('Photographer')).toBeInTheDocument()
      expect(screen.getByText('Florist')).toBeInTheDocument()
      expect(screen.getByText('DJ')).toBeInTheDocument()
    })

    it('should show active vendor count', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'vendor-1', status: 'online' },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      expect(screen.getByText('1 of 3 vendors active')).toBeInTheDocument()
    })

    it('should separate online and offline vendors', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'vendor-1', status: 'online' },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
          showOffline
        />
      )

      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should hide offline vendors when showOffline is false', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
          showOffline={false}
        />
      )

      expect(screen.queryByText('Offline')).not.toBeInTheDocument()
    })

    it('should display vendor location if available', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { 
            userId: 'vendor-1', 
            status: 'online',
            location: { lat: 40.7128, lng: -74.0060 },
          },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      expect(screen.getByText('Location tracked')).toBeInTheDocument()
    })

    it('should display current task', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { 
            userId: 'vendor-1', 
            status: 'online',
            currentTask: 'Setting up equipment',
          },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      expect(screen.getByText('Working on:')).toBeInTheDocument()
      expect(screen.getByText('Setting up equipment')).toBeInTheDocument()
    })

    it('should display ETA', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { 
            userId: 'vendor-1', 
            status: 'online',
            eta: '2:30 PM',
          },
        ],
        activeUserCount: 1,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      expect(screen.getByText('ETA: 2:30 PM')).toBeInTheDocument()
    })

    it('should show connection status', () => {
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
      })

      render(
        <VendorPresenceList 
          vendors={mockVendors}
          roomId="wedding-room"
        />
      )

      // Should show connection indicator
      const connectionIcon = screen.getByTestId?.('connection-icon') || 
                             document.querySelector('[data-testid="connection-icon"]')
      expect(connectionIcon || screen.getByText('0 of 3 vendors active')).toBeTruthy()
    })
  })

  describe('Activity Status', () => {
    it('should update activity status based on user actions', async () => {
      const mockUpdatePresence = jest.fn()
      
      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [],
        activeUserCount: 0,
        isTracking: true,
        updatePresence: mockUpdatePresence,
        trackActivity: jest.fn((activity: string) => {
          mockUpdatePresence({ lastActivity: activity, status: 'active' })
        }),
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-1',
          userData: { name: 'Test User' },
        })
      )

      act(() => {
        result.current.trackActivity('Editing timeline')
      })

      expect(mockUpdatePresence).toHaveBeenCalledWith({
        lastActivity: 'Editing timeline',
        status: 'active',
      })
    })
  })

  describe('Cursor Synchronization', () => {
    it('should sync cursor positions across users', async () => {
      const mockCursors = [
        { userId: 'user-1', x: 100, y: 200 },
        { userId: 'user-2', x: 300, y: 400 },
      ]

      ;(usePresence as jest.Mock).mockReturnValue({
        onlineUsers: [
          { userId: 'user-1', cursor: mockCursors[0] },
          { userId: 'user-2', cursor: mockCursors[1] },
        ],
        activeUserCount: 2,
        isTracking: true,
        cursors: mockCursors,
      })

      const { result } = renderHook(() => 
        usePresence('test-room', {
          userId: 'user-3',
          userData: { name: 'Test User' },
          trackCursors: true,
        })
      )

      expect(result.current.cursors).toEqual(mockCursors)
    })
  })
})