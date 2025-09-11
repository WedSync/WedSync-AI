import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RealtimeTimeline } from '@/components/dashboard/realtime/RealtimeTimeline'
import { useRealtimeConnection } from '@/hooks/useRealtime'

// Mock the realtime hook
jest.mock('@/hooks/useRealtime')

describe('Timeline Synchronization', () => {
  const mockSend = jest.fn()
  const mockTimeline = {
    id: 'timeline-1',
    items: [
      {
        id: 'item-1',
        title: 'Ceremony',
        startTime: '14:00',
        endTime: '14:30',
        status: 'pending' as const,
        vendor: 'Officiant',
        location: 'Garden',
      },
      {
        id: 'item-2',
        title: 'Photos',
        startTime: '14:30',
        endTime: '15:30',
        status: 'pending' as const,
        vendor: 'Photographer',
        location: 'Various',
      },
    ],
    vendorStatuses: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRealtimeConnection as jest.Mock).mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      send: mockSend,
      latency: 50,
    })
  })

  describe('Timeline Updates', () => {
    it('should display timeline items', () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      expect(screen.getByText('Ceremony')).toBeInTheDocument()
      expect(screen.getByText('Photos')).toBeInTheDocument()
    })

    it('should handle real-time timeline updates', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      mockOnMessage({
        type: 'timeline_update',
        data: {
          itemId: 'item-1',
          changes: { status: 'completed' },
        },
      })

      await waitFor(() => {
        const item = screen.getByTestId('timeline-item-1')
        expect(item).toHaveAttribute('data-status', 'completed')
      })
    })

    it('should handle vendor status updates', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      mockOnMessage({
        type: 'vendor_status',
        data: {
          vendor: 'Photographer',
          status: 'on-site',
          timestamp: Date.now(),
        },
      })

      await waitFor(() => {
        expect(screen.getByTestId('vendor-status-Photographer')).toHaveTextContent('on-site')
      })
    })

    it('should show delay notifications', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} showNotifications />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      mockOnMessage({
        type: 'timeline_update',
        data: {
          itemId: 'item-1',
          changes: { 
            status: 'delayed',
            delayMinutes: 15,
          },
        },
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Ceremony has been delayed by 15 minutes')
      })
    })
  })

  describe('Vendor Updates', () => {
    it('should handle vendor check-in', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      const checkInButton = screen.getByTestId('vendor-checkin-Photographer')
      fireEvent.click(checkInButton)

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'vendor_status',
          data: expect.objectContaining({
            vendor: 'Photographer',
            status: 'arrived',
          }),
        })
      })
    })

    it('should update vendor ETA', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      mockOnMessage({
        type: 'vendor_status',
        data: {
          vendor: 'Officiant',
          status: 'on-route',
          eta: '13:45',
          timestamp: Date.now(),
        },
      })

      await waitFor(() => {
        const vendorStatus = screen.getByTestId('vendor-status-Officiant')
        expect(vendorStatus).toHaveTextContent('on-route')
        expect(vendorStatus).toHaveTextContent('13:45')
      })
    })
  })

  describe('Timeline Reordering', () => {
    it('should allow drag and drop reordering', async () => {
      render(<RealtimeTimeline timeline={mockTimeline} allowReorder />)
      
      const item1 = screen.getByTestId('timeline-item-1')
      const item2 = screen.getByTestId('timeline-item-2')
      
      // Simulate drag and drop
      fireEvent.dragStart(item1)
      fireEvent.dragOver(item2)
      fireEvent.drop(item2)

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'timeline_reorder',
          data: ['item-2', 'item-1'],
        })
      })
    })

    it('should show drag handles when reordering is enabled', () => {
      render(<RealtimeTimeline timeline={mockTimeline} allowReorder />)
      
      expect(screen.getByTestId('drag-handle-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('drag-handle-item-2')).toBeInTheDocument()
    })

    it('should not show drag handles when reordering is disabled', () => {
      render(<RealtimeTimeline timeline={mockTimeline} allowReorder={false} />)
      
      expect(screen.queryByTestId('drag-handle-item-1')).not.toBeInTheDocument()
    })
  })

  describe('Conflict Resolution', () => {
    it('should detect simultaneous updates', async () => {
      const onConflict = jest.fn()
      
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          onConflict={onConflict}
          pendingUpdates={[
            { itemId: 'item-1', field: 'title', value: 'Wedding Ceremony', userId: 'user-1' },
            { itemId: 'item-1', field: 'title', value: 'Marriage Ceremony', userId: 'user-2' },
          ]}
        />
      )

      await waitFor(() => {
        expect(onConflict).toHaveBeenCalledWith({
          item: 'item-1',
          conflicts: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1' }),
            expect.objectContaining({ userId: 'user-2' }),
          ]),
        })
      })
    })

    it('should rollback failed updates', async () => {
      const onRollback = jest.fn()
      
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          onRollback={onRollback}
          optimisticUpdates
          failedUpdates={[
            { itemId: 'item-1', field: 'title', value: 'Failed Update', error: 'Network error' },
          ]}
        />
      )

      await waitFor(() => {
        expect(onRollback).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: 'item-1' })
        )
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to update item-1: Network error')
      })
    })
  })

  describe('Connection State', () => {
    it('should show connected state', () => {
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('should show disconnected state', () => {
      ;(useRealtimeConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        send: mockSend,
      })
      
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should show reconnecting state', () => {
      ;(useRealtimeConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        connectionState: 'reconnecting',
        send: mockSend,
      })
      
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
    })

    it('should display latency when connected', () => {
      ;(useRealtimeConnection as jest.Mock).mockReturnValue({
        isConnected: true,
        connectionState: 'connected',
        send: mockSend,
        latency: 25,
      })
      
      render(<RealtimeTimeline timeline={mockTimeline} />)
      
      expect(screen.getByText('(25ms)')).toBeInTheDocument()
    })
  })

  describe('Performance Optimizations', () => {
    it('should batch updates', async () => {
      jest.useFakeTimers()
      const onBatchUpdate = jest.fn()
      
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          onBatchUpdate={onBatchUpdate}
          batchInterval={100}
        />
      )

      // Make multiple updates
      const item1Title = screen.getByTestId('timeline-item-1-title') as HTMLInputElement
      fireEvent.change(item1Title, { target: { value: 'Updated 1' } })
      fireEvent.change(item1Title, { target: { value: 'Updated 2' } })
      fireEvent.change(item1Title, { target: { value: 'Updated 3' } })

      // Fast-forward past batch interval
      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(onBatchUpdate).toHaveBeenCalledTimes(1)
      })

      jest.useRealTimers()
    })

    it('should debounce input changes', async () => {
      jest.useFakeTimers()
      
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          debounceDelay={300}
        />
      )

      const item1Title = screen.getByTestId('timeline-item-1-title') as HTMLInputElement
      
      // Make rapid changes
      fireEvent.change(item1Title, { target: { value: 'A' } })
      fireEvent.change(item1Title, { target: { value: 'AB' } })
      fireEvent.change(item1Title, { target: { value: 'ABC' } })

      // Advance time less than debounce delay
      jest.advanceTimersByTime(200)
      expect(mockSend).not.toHaveBeenCalled()

      // Advance past debounce delay
      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledTimes(1)
        expect(mockSend).toHaveBeenCalledWith({
          type: 'timeline_update',
          data: expect.objectContaining({
            value: 'ABC',
          }),
        })
      })

      jest.useRealTimers()
    })

    it('should apply optimistic updates', async () => {
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          optimisticUpdates
        />
      )

      const item1Title = screen.getByTestId('timeline-item-1-title') as HTMLInputElement
      fireEvent.change(item1Title, { target: { value: 'Optimistic Update' } })

      // Should update immediately
      expect(item1Title.value).toBe('Optimistic Update')
    })

    it('should handle pending state animations', () => {
      render(
        <RealtimeTimeline 
          timeline={mockTimeline}
          enableAnimations
          pendingChanges={[
            { itemId: 'item-1', isPending: true },
          ]}
        />
      )

      const item = screen.getByTestId('timeline-item-1')
      expect(item).toHaveClass('timeline-item--pending')
    })
  })
})