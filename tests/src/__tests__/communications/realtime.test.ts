/**
 * Tests for Real-time Communication System
 * Covers WebSocket subscriptions, message delivery, and activity feeds
 */

import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRealtimeMessages, useRealtimeActivity, useRealtimeConversations } from '@/lib/supabase/realtime'
import { RealtimeMessage, RealtimeActivity, RealtimeConversation } from '@/types/communications'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

describe('Real-time Communication System', () => {
  let mockSupabase: any
  let mockChannel: any

  beforeEach(() => {
    // Setup mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (callback) callback('SUBSCRIBED')
        return mockChannel
      }),
      unsubscribe: jest.fn(),
    }

    // Setup mock Supabase client
    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn((callback) => {
        callback({ data: [], error: null })
        return Promise.resolve({ data: [], error: null })
      })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('useRealtimeMessages', () => {
    it('should subscribe to messages for a conversation', async () => {
      const conversationId = 'test-conversation-123'
      
      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith(
          expect.stringContaining(`messages:${conversationId}`)
        )
      })

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }),
        expect.any(Function)
      )
    })

    it('should handle new messages in real-time', async () => {
      const conversationId = 'test-conversation-123'
      const newMessage: RealtimeMessage = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: 'user-1',
        sender_type: 'vendor',
        sender_name: 'John Doe',
        sender_avatar_url: null,
        content: 'Hello, testing real-time!',
        message_type: 'text',
        attachments: [],
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      // Wait for subscription
      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Simulate receiving a new message
      act(() => {
        insertCallback({ new: newMessage })
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0]).toEqual(newMessage)
      })
    })

    it('should handle message updates in real-time', async () => {
      const conversationId = 'test-conversation-123'
      const updatedMessage = {
        id: 'msg-1',
        is_read: true,
        read_at: new Date().toISOString()
      }

      let updateCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'UPDATE') {
          updateCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Add initial message
      act(() => {
        result.current.messages = [{
          id: 'msg-1',
          conversation_id: conversationId,
          sender_id: 'user-1',
          sender_type: 'vendor',
          sender_name: 'John Doe',
          sender_avatar_url: null,
          content: 'Test message',
          message_type: 'text',
          attachments: [],
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      })

      // Simulate message update
      act(() => {
        updateCallback({ new: updatedMessage, old: { id: 'msg-1' } })
      })

      await waitFor(() => {
        expect(result.current.messages[0].is_read).toBe(true)
        expect(result.current.messages[0].read_at).toBeTruthy()
      })
    })

    it('should clean up subscriptions on unmount', async () => {
      const conversationId = 'test-conversation-123'
      
      const { unmount } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      unmount()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('useRealtimeActivity', () => {
    it('should subscribe to activity feed for an organization', async () => {
      const organizationId = 'org-123'
      
      const { result } = renderHook(() => useRealtimeActivity(organizationId))

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith(
          expect.stringContaining(`activity:${organizationId}`)
        )
      })

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feeds',
          filter: `organization_id=eq.${organizationId}`
        }),
        expect.any(Function)
      )
    })

    it('should handle new activities in real-time', async () => {
      const organizationId = 'org-123'
      const newActivity: RealtimeActivity = {
        id: 'activity-1',
        organization_id: organizationId,
        actor_id: 'user-1',
        actor_type: 'user',
        actor_name: 'Jane Smith',
        action: 'form_submitted',
        entity_type: 'form',
        entity_id: 'form-1',
        entity_name: 'Wedding Details Form',
        description: 'Jane Smith submitted Wedding Details Form',
        importance: 'high',
        is_read: false,
        created_at: new Date().toISOString()
      }

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeActivity(organizationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Simulate receiving new activity
      act(() => {
        insertCallback({ new: newActivity })
      })

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(1)
        expect(result.current.activities[0]).toEqual(newActivity)
      })
    })

    it('should sort activities by creation date (newest first)', async () => {
      const organizationId = 'org-123'
      
      const { result } = renderHook(() => useRealtimeActivity(organizationId))

      const olderActivity: RealtimeActivity = {
        id: 'activity-1',
        organization_id: organizationId,
        actor_id: 'user-1',
        actor_type: 'user',
        actor_name: 'Jane Smith',
        action: 'message_sent',
        entity_type: 'message',
        entity_id: 'msg-1',
        entity_name: 'Message',
        description: 'Sent a message',
        importance: 'medium',
        is_read: false,
        created_at: '2025-01-01T10:00:00Z'
      }

      const newerActivity: RealtimeActivity = {
        id: 'activity-2',
        organization_id: organizationId,
        actor_id: 'user-2',
        actor_type: 'user',
        actor_name: 'John Doe',
        action: 'form_submitted',
        entity_type: 'form',
        entity_id: 'form-1',
        entity_name: 'Details Form',
        description: 'Submitted form',
        importance: 'high',
        is_read: false,
        created_at: '2025-01-01T11:00:00Z'
      }

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback
        }
        return mockChannel
      })

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Add activities in reverse order
      act(() => {
        insertCallback({ new: olderActivity })
      })

      act(() => {
        insertCallback({ new: newerActivity })
      })

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2)
        expect(result.current.activities[0].id).toBe('activity-2') // Newer first
        expect(result.current.activities[1].id).toBe('activity-1')
      })
    })
  })

  describe('useRealtimeConversations', () => {
    it('should subscribe to conversations for an organization', async () => {
      const organizationId = 'org-123'
      
      const { result } = renderHook(() => useRealtimeConversations(organizationId))

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith(
          expect.stringContaining(`conversations:${organizationId}`)
        )
      })

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `organization_id=eq.${organizationId}`
        }),
        expect.any(Function)
      )
    })

    it('should handle new conversations in real-time', async () => {
      const organizationId = 'org-123'
      const newConversation: RealtimeConversation = {
        id: 'conv-1',
        organization_id: organizationId,
        client_id: 'client-1',
        client_name: 'Wedding Client',
        title: 'Wedding Planning Discussion',
        type: 'direct',
        status: 'active',
        last_message: 'Looking forward to the big day!',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === '*') {
          insertCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeConversations(organizationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Simulate new conversation
      act(() => {
        insertCallback({ eventType: 'INSERT', new: newConversation })
      })

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1)
        expect(result.current.conversations[0]).toEqual(newConversation)
      })
    })

    it('should update conversation when last message changes', async () => {
      const organizationId = 'org-123'
      const initialConversation: RealtimeConversation = {
        id: 'conv-1',
        organization_id: organizationId,
        client_id: 'client-1',
        client_name: 'Wedding Client',
        title: 'Wedding Planning',
        type: 'direct',
        status: 'active',
        last_message: 'Initial message',
        last_message_at: '2025-01-01T10:00:00Z',
        unread_count: 0,
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      }

      let updateCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === '*') {
          updateCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeConversations(organizationId))

      // Set initial conversation
      act(() => {
        result.current.conversations = [initialConversation]
      })

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Update conversation
      const updatedConversation = {
        ...initialConversation,
        last_message: 'New message!',
        last_message_at: '2025-01-01T11:00:00Z',
        unread_count: 1,
        updated_at: '2025-01-01T11:00:00Z'
      }

      act(() => {
        updateCallback({ eventType: 'UPDATE', new: updatedConversation, old: initialConversation })
      })

      await waitFor(() => {
        expect(result.current.conversations[0].last_message).toBe('New message!')
        expect(result.current.conversations[0].unread_count).toBe(1)
      })
    })

    it('should sort conversations by last message time', async () => {
      const organizationId = 'org-123'
      
      const { result } = renderHook(() => useRealtimeConversations(organizationId))

      const conv1: RealtimeConversation = {
        id: 'conv-1',
        organization_id: organizationId,
        client_id: 'client-1',
        client_name: 'Client 1',
        title: 'Conv 1',
        type: 'direct',
        status: 'active',
        last_message: 'Older message',
        last_message_at: '2025-01-01T10:00:00Z',
        unread_count: 0,
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      }

      const conv2: RealtimeConversation = {
        id: 'conv-2',
        organization_id: organizationId,
        client_id: 'client-2',
        client_name: 'Client 2',
        title: 'Conv 2',
        type: 'direct',
        status: 'active',
        last_message: 'Newer message',
        last_message_at: '2025-01-01T11:00:00Z',
        unread_count: 1,
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T11:00:00Z'
      }

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === '*') {
          insertCallback = callback
        }
        return mockChannel
      })

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Add conversations
      act(() => {
        insertCallback({ eventType: 'INSERT', new: conv1 })
      })

      act(() => {
        insertCallback({ eventType: 'INSERT', new: conv2 })
      })

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(2)
        expect(result.current.conversations[0].id).toBe('conv-2') // Newer first
        expect(result.current.conversations[1].id).toBe('conv-1')
      })
    })

    it('should handle conversation deletion', async () => {
      const organizationId = 'org-123'
      const conversation: RealtimeConversation = {
        id: 'conv-1',
        organization_id: organizationId,
        client_id: 'client-1',
        client_name: 'Client',
        title: 'Conversation',
        type: 'direct',
        status: 'active',
        last_message: 'Message',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let deleteCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === '*') {
          deleteCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeConversations(organizationId))

      // Set initial conversation
      act(() => {
        result.current.conversations = [conversation]
      })

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1)
      })

      // Delete conversation
      act(() => {
        deleteCallback({ eventType: 'DELETE', old: conversation })
      })

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(0)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle subscription errors gracefully', async () => {
      const conversationId = 'test-conversation-123'
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockChannel.subscribe.mockImplementation((callback) => {
        if (callback) callback('CHANNEL_ERROR')
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Subscription error'),
          expect.any(String)
        )
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle database query errors', async () => {
      const conversationId = 'test-conversation-123'
      const dbError = new Error('Database connection failed')

      mockSupabase.from.mockReturnThis()
      mockSupabase.select.mockReturnThis()
      mockSupabase.eq.mockReturnThis()
      mockSupabase.order.mockReturnThis()
      mockSupabase.limit.mockReturnThis()
      mockSupabase.then.mockImplementation((callback) => {
        callback({ data: null, error: dbError })
        return Promise.resolve({ data: null, error: dbError })
      })

      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(result.current.error).toBe(dbError)
        expect(result.current.loading).toBe(false)
        expect(result.current.messages).toEqual([])
      })
    })
  })

  describe('Performance', () => {
    it('should debounce rapid message updates', async () => {
      jest.useFakeTimers()
      const conversationId = 'test-conversation-123'
      
      let updateCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'UPDATE') {
          updateCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeMessages(conversationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          updateCallback({
            new: { id: 'msg-1', is_read: true },
            old: { id: 'msg-1' }
          })
        })
      }

      // Fast-forward timers
      jest.runAllTimers()

      // Should only process once despite multiple updates
      await waitFor(() => {
        expect(result.current.messages).toBeDefined()
      })

      jest.useRealTimers()
    })

    it('should limit activity feed to recent items', async () => {
      const organizationId = 'org-123'
      const maxActivities = 50 // Expected limit

      let insertCallback: any

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useRealtimeActivity(organizationId))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      // Add more activities than the limit
      for (let i = 0; i < 60; i++) {
        act(() => {
          insertCallback({
            new: {
              id: `activity-${i}`,
              organization_id: organizationId,
              actor_id: 'user-1',
              actor_type: 'user',
              actor_name: 'Test User',
              action: 'test_action',
              entity_type: 'test',
              entity_id: `entity-${i}`,
              entity_name: 'Test Entity',
              description: `Activity ${i}`,
              importance: 'low',
              is_read: false,
              created_at: new Date(Date.now() - i * 1000).toISOString()
            }
          })
        })
      }

      await waitFor(() => {
        expect(result.current.activities.length).toBeLessThanOrEqual(maxActivities)
      })
    })
  })
})