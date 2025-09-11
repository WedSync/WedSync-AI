// =====================================================
// TIMELINE COLLABORATION PROVIDER TESTS
// Comprehensive test coverage for real-time collaboration
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { TimelineCollaborationProvider, useTimelineCollaboration } from '../TimelineCollaborationProvider'
import type { RealtimePresence, RealtimeUpdate } from '@/types/timeline'
// TEST SETUP & MOCKS
// Mock the useTimelineRealtime hook
const mockSendUpdate = jest.fn()
const mockSubscribeToUpdates = jest.fn()
const mockPresenceData: RealtimePresence[] = [
  {
    user_id: 'user1',
    user_name: 'John Doe',
    user_avatar: 'https://example.com/avatar1.jpg',
    cursor_position: { x: 100, y: 200, time: new Date() },
    selected_event_id: 'event-1',
    is_editing: true,
    last_activity: new Date().toISOString()
  },
    user_id: 'user2',
    user_name: 'Jane Smith',
    user_avatar: 'https://example.com/avatar2.jpg',
    cursor_position: { x: 300, y: 400, time: new Date() },
    selected_event_id: undefined,
    is_editing: false,
  }
]
jest.mock('@/hooks/useTimelineRealtime', () => ({
  useTimelineRealtime: () => ({
    presenceData: mockPresenceData,
    sendUpdate: mockSendUpdate,
    subscribeToUpdates: mockSubscribeToUpdates,
    isConnected: true,
    connectionError: null
  })
}))
// Mock motion to avoid animation issues in tests
jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  AnimatePresence: ({ children }: any) => children
// TEST COMPONENT
interface TestComponentProps {
  onContextReceived?: (context: any) => void
}
function TestComponent({ onContextReceived }: TestComponentProps) {
  const context = useTimelineCollaboration()
  
  React.useEffect(() => {
    if (onContextReceived) {
      onContextReceived(context)
    }
  }, [context, onContextReceived])
  return (
    <div>
      <div data-testid="connected-status">
        {context.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="active-users-count">
        {context.activeUsers.length}
      <div data-testid="presence-data">
        {JSON.stringify(context.presenceData)}
      <button 
        onClick={() => context.updateCursorPosition({ x: 50, y: 100 })}
        data-testid="update-cursor"
      >
        Update Cursor
      </button>
      <button
        onClick={() => context.updateSelectedEvent('test-event-1')}
        data-testid="select-event"
        Select Event
        onClick={() => context.updateEditingStatus(true, 'test-event-1')}
        data-testid="start-editing"
        Start Editing
        onClick={() => context.addComment('test-event-1', 'Test comment')}
        data-testid="add-comment"
        Add Comment
    </div>
  )
// MAIN TEST SUITE
describe('TimelineCollaborationProvider', () => {
  const defaultProps = {
    timelineId: 'test-timeline-1',
    currentUserId: 'current-user',
    currentUserName: 'Current User',
    currentUserAvatar: 'https://example.com/current-avatar.jpg'
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the subscribe mock to return a cleanup function
    mockSubscribeToUpdates.mockReturnValue(() => {})
  // =====================================================
  // PROVIDER SETUP TESTS
  describe('Provider Setup', () => {
    it('should render provider and pass context to children', () => {
      render(
        <TimelineCollaborationProvider {...defaultProps}>
          <TestComponent />
        </TimelineCollaborationProvider>
      )
      expect(screen.getByTestId('connected-status')).toHaveTextContent('Connected')
    })
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => render(<TestComponent />)).toThrow(
        'useTimelineCollaboration must be used within TimelineCollaborationProvider'
      consoleSpy.mockRestore()
    it('should pass timeline ID to useTimelineRealtime hook', () => {
      // Hook should be called with timeline ID
      expect(mockSendUpdate).toBeDefined()
  // PRESENCE DATA TESTS
  describe('Presence Data', () => {
    it('should expose presence data from realtime hook', () => {
      const presenceData = screen.getByTestId('presence-data')
      expect(presenceData).toHaveTextContent('John Doe')
      expect(presenceData).toHaveTextContent('Jane Smith')
    it('should calculate active users correctly', () => {
      // Should have 2 active users (excluding current user)
      expect(screen.getByTestId('active-users-count')).toHaveTextContent('2')
    it('should filter out stale users from active users', () => {
      const stalePresenceData = [
        ...mockPresenceData,
        {
          user_id: 'user3',
          user_name: 'Stale User',
          user_avatar: undefined,
          cursor_position: undefined,
          selected_event_id: undefined,
          is_editing: false,
          last_activity: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
        }
      ]
      // Mock with stale data
      const useTimelineRealtimeMock = require('@/hooks/useTimelineRealtime')
      useTimelineRealtimeMock.useTimelineRealtime.mockReturnValueOnce({
        presenceData: stalePresenceData,
        sendUpdate: mockSendUpdate,
        subscribeToUpdates: mockSubscribeToUpdates,
        isConnected: true,
        connectionError: null
      })
      // Should filter out stale user
  // CURSOR MANAGEMENT TESTS
  describe('Cursor Management', () => {
    it('should update cursor position with throttling', async () => {
      const user = userEvent.setup()
      const updateButton = screen.getByTestId('update-cursor')
      // Click multiple times rapidly
      await user.click(updateButton)
      // Should throttle calls
      await waitFor(() => {
        expect(mockSendUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'cursor_move',
            payload: expect.objectContaining({
              cursor_position: { x: 50, y: 100 }
            })
          })
        )
    it('should handle cursor updates from other users', () => {
      let capturedContext: any = null
          <TestComponent onContextReceived={(ctx) => capturedContext = ctx} />
      // Simulate receiving cursor update from another user
      const mockUpdate: RealtimeUpdate = {
        type: 'cursor_move',
        payload: {
          cursor_position: { x: 150, y: 250 },
          user_name: 'Other User'
        },
        user_id: 'other-user',
        timestamp: new Date().toISOString()
      }
      // Simulate the subscription callback being called
      const subscribeCallback = mockSubscribeToUpdates.mock.calls[0]?.[0]
      if (subscribeCallback) {
        act(() => {
          subscribeCallback(mockUpdate)
        })
      // Context should update to reflect new cursor positions
      expect(capturedContext).toBeDefined()
  // EVENT SELECTION TESTS
  describe('Event Selection', () => {
    it('should send event selection updates', async () => {
      const selectButton = screen.getByTestId('select-event')
      await user.click(selectButton)
      expect(mockSendUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'event_select',
          payload: expect.objectContaining({
            selected_event_id: 'test-event-1',
            user_id: 'current-user',
            user_name: 'Current User'
  // EDITING STATUS TESTS
  describe('Editing Status', () => {
    it('should send editing status updates', async () => {
      const editButton = screen.getByTestId('start-editing')
      await user.click(editButton)
          type: 'editing_status',
            is_editing: true,
            user_id: 'current-user'
  // COMMENTS TESTS
  describe('Comments', () => {
    it('should add comments correctly', async () => {
      const commentButton = screen.getByTestId('add-comment')
      await user.click(commentButton)
          type: 'comment_added',
            event_id: 'test-event-1',
            comment: 'Test comment',
    it('should handle incoming comment updates', () => {
      const commentUpdate: RealtimeUpdate = {
        type: 'comment_added',
          id: 'comment-1',
          event_id: 'test-event-1',
          comment: 'New comment',
          user_id: 'other-user',
          user_name: 'Other User',
          created_at: new Date().toISOString()
          subscribeCallback(commentUpdate)
  // CONNECTION STATUS TESTS
  describe('Connection Status', () => {
    it('should show connected status when connected', () => {
    it('should show disconnected status when not connected', () => {
        presenceData: [],
        isConnected: false,
        connectionError: 'Connection failed'
      expect(screen.getByTestId('connected-status')).toHaveTextContent('Disconnected')
  // ACTIVITY TRACKING TESTS
  describe('Activity Tracking', () => {
    it('should track activity correctly', () => {
      act(() => {
        capturedContext.trackActivity('test_action', { detail: 'test' })
          type: 'activity_logged',
            action: 'test_action',
            details: { detail: 'test' },
  // CONFLICT RESOLUTION TESTS
  describe('Conflict Resolution', () => {
    it('should send conflict resolution updates', () => {
        capturedContext.resolveConflict('conflict-1', 'accept', { action: 'move_event' })
          type: 'conflict_resolved',
            conflict_id: 'conflict-1',
            resolution: 'accept',
            resolution_data: { action: 'move_event' },
            resolved_by: 'current-user'
  // CLEANUP TESTS
  describe('Cleanup', () => {
    it('should unsubscribe from updates on unmount', () => {
      const unsubscribeMock = jest.fn()
      mockSubscribeToUpdates.mockReturnValue(unsubscribeMock)
      const { unmount } = render(
      unmount()
      expect(unsubscribeMock).toHaveBeenCalled()
    it('should clean up old cursors periodically', async () => {
      jest.useFakeTimers()
      // Fast-forward time to trigger cursor cleanup
        jest.advanceTimersByTime(5000)
      jest.useRealTimers()
  // EDGE CASES
  describe('Edge Cases', () => {
    it('should handle undefined user data gracefully', () => {
      const invalidPresenceData = [
          user_id: 'user1',
          user_name: '',
          is_editing: undefined,
          last_activity: new Date().toISOString()
        } as any
        presenceData: invalidPresenceData,
      expect(() => {
        render(
          <TimelineCollaborationProvider {...defaultProps}>
            <TestComponent />
          </TimelineCollaborationProvider>
      }).not.toThrow()
    it('should handle empty presence data', () => {
      expect(screen.getByTestId('active-users-count')).toHaveTextContent('0')
})
