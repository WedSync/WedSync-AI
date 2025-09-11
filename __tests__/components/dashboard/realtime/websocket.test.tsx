import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeConnection } from '@/hooks/useRealtime'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback: any) => {
        if (callback) callback('SUBSCRIBED')
        return Promise.resolve()
      }),
      unsubscribe: jest.fn(),
      track: jest.fn(),
      untrack: jest.fn(),
      presenceState: jest.fn(() => ({})),
    })),
    removeChannel: jest.fn(),
  })),
}))

describe('WebSocket Connection Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Connection Lifecycle', () => {
    it('should establish connection on mount', async () => {
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel')
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should handle auto-reconnect on connection loss', async () => {
      jest.useFakeTimers()
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          autoReconnect: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: 3,
        })
      )

      // Simulate connection loss
      act(() => {
        (result.current as any).simulateDisconnect?.()
      })

      expect(result.current.isConnected).toBe(false)
      expect((result.current as any).reconnectAttempt).toBe(0)

      // Fast-forward time to trigger reconnect
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect((result.current as any).reconnectAttempt).toBe(1)
      })

      jest.useRealTimers()
    })

    it('should respect max reconnect attempts', async () => {
      jest.useFakeTimers()
      const onMaxReconnect = jest.fn()
      
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          autoReconnect: true,
          reconnectInterval: 100,
          maxReconnectAttempts: 2,
          onMaxReconnectReached: onMaxReconnect,
        } as any)
      )

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        act(() => {
          (result.current as any).simulateDisconnect?.()
        })
        jest.advanceTimersByTime(100)
      }

      await waitFor(() => {
        expect(onMaxReconnect).toHaveBeenCalled()
        expect(result.current.connectionState).toBe('failed')
      })

      jest.useRealTimers()
    })
  })

  describe('Message Handling', () => {
    it('should handle incoming realtime messages', async () => {
      const onMessage = jest.fn()
      
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          onMessage,
        })
      )

      const testMessage = {
        type: 'timeline_update',
        payload: { id: '123', status: 'completed' },
      }

      act(() => {
        (result.current as any).simulateMessage?.(testMessage)
      })

      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('should buffer messages when disconnected', async () => {
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          bufferMessages: true,
          maxBufferSize: 10,
        } as any)
      )

      // Disconnect
      act(() => {
        (result.current as any).simulateDisconnect?.()
      })

      // Send messages while disconnected
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        content: `Message ${i}`,
      }))

      messages.forEach(msg => {
        act(() => {
          result.current.send(msg)
        })
      })

      expect((result.current as any).messageBuffer).toHaveLength(5)

      // Reconnect
      act(() => {
        (result.current as any).connect?.()
      })

      await waitFor(() => {
        expect((result.current as any).messageBuffer).toHaveLength(0)
      })
    })
  })

  describe('Connection State Management', () => {
    it('should track connection state accurately', async () => {
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel')
      )

      expect(result.current.connectionState).toBe('connecting')

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected')
      })

      act(() => {
        (result.current as any).simulateDisconnect?.()
      })

      expect(result.current.connectionState).toBe('disconnected')
    })

    it('should emit connection events', async () => {
      const onConnect = jest.fn()
      const onDisconnect = jest.fn()
      const onReconnect = jest.fn()

      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          onConnect,
          onDisconnect,
          onReconnect,
        })
      )

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalled()
      })

      act(() => {
        (result.current as any).simulateDisconnect?.()
      })

      expect(onDisconnect).toHaveBeenCalled()

      act(() => {
        (result.current as any).connect?.()
      })

      await waitFor(() => {
        expect(onReconnect).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useRealtimeConnection('test-channel', {
          onError,
        })
      )

      const error = new Error('WebSocket connection failed')
      
      act(() => {
        (result.current as any).simulateError?.(error)
      })

      expect(onError).toHaveBeenCalledWith(error)
      expect((result.current as any).lastError).toBe(error)
    })
  })
})