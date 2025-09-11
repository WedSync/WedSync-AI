/**
 * Tests for Communications API Endpoints
 * Covers conversations, messages, email notifications, and activity feeds
 */

import { NextRequest } from 'next/server'
import { GET as getConversations, POST as createConversation } from '@/app/api/communications/conversations/route'
import { GET as getMessages, POST as sendMessage } from '@/app/api/communications/messages/route'
import { POST as sendEmail } from '@/app/api/communications/email/send/route'
import { GET as getActivity } from '@/app/api/communications/activity/route'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

// Mock authentication
jest.mock('@/lib/auth', () => ({
  getUser: jest.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    organization_id: 'org-123'
  })
}))

// Mock email service
jest.mock('@/lib/email/service', () => ({
  sendEmail: jest.fn().mockResolvedValue({
    id: 'email-123',
    status: 'sent'
  })
}))

describe('Communications API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      then: jest.fn()
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Conversations API', () => {
    describe('GET /api/communications/conversations', () => {
      it('should fetch conversations for authenticated user', async () => {
        const mockConversations = [
          {
            id: 'conv-1',
            organization_id: 'org-123',
            client_id: 'client-1',
            title: 'Wedding Planning',
            type: 'direct',
            status: 'active',
            last_message_at: '2025-01-01T10:00:00Z',
            created_at: '2025-01-01T09:00:00Z',
            updated_at: '2025-01-01T10:00:00Z'
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: mockConversations,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/conversations')
        const response = await getConversations(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(mockConversations)
        expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
        expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-123')
        expect(mockSupabase.order).toHaveBeenCalledWith('last_message_at', { ascending: false })
      })

      it('should handle database errors gracefully', async () => {
        const dbError = new Error('Database connection failed')
        
        mockSupabase.then.mockResolvedValue({
          data: null,
          error: dbError
        })

        const request = new NextRequest('http://localhost:3000/api/communications/conversations')
        const response = await getConversations(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to fetch conversations')
      })

      it('should filter conversations by status', async () => {
        const mockActiveConversations = [
          {
            id: 'conv-1',
            status: 'active'
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: mockActiveConversations,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/conversations?status=active')
        const response = await getConversations(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
      })
    })

    describe('POST /api/communications/conversations', () => {
      it('should create a new conversation', async () => {
        const newConversation = {
          client_id: 'client-123',
          title: 'New Wedding Inquiry',
          type: 'direct'
        }

        const createdConversation = {
          id: 'conv-new',
          organization_id: 'org-123',
          ...newConversation,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockSupabase.then.mockResolvedValue({
          data: createdConversation,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/conversations', {
          method: 'POST',
          body: JSON.stringify(newConversation)
        })

        const response = await createConversation(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(createdConversation)
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: 'org-123',
            ...newConversation
          })
        )
      })

      it('should validate required fields', async () => {
        const invalidConversation = {
          title: 'Missing client_id'
        }

        const request = new NextRequest('http://localhost:3000/api/communications/conversations', {
          method: 'POST',
          body: JSON.stringify(invalidConversation)
        })

        const response = await createConversation(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('client_id is required')
      })
    })
  })

  describe('Messages API', () => {
    describe('GET /api/communications/messages', () => {
      it('should fetch messages for a conversation', async () => {
        const conversationId = 'conv-123'
        const mockMessages = [
          {
            id: 'msg-1',
            conversation_id: conversationId,
            sender_id: 'user-123',
            sender_type: 'vendor',
            content: 'Hello!',
            message_type: 'text',
            is_read: true,
            created_at: '2025-01-01T10:00:00Z'
          },
          {
            id: 'msg-2',
            conversation_id: conversationId,
            sender_id: 'client-123',
            sender_type: 'client',
            content: 'Hi there!',
            message_type: 'text',
            is_read: false,
            created_at: '2025-01-01T10:01:00Z'
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: mockMessages,
          error: null
        })

        const request = new NextRequest(`http://localhost:3000/api/communications/messages?conversationId=${conversationId}`)
        const response = await getMessages(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(mockMessages)
        expect(mockSupabase.eq).toHaveBeenCalledWith('conversation_id', conversationId)
        expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true })
      })

      it('should paginate messages', async () => {
        const conversationId = 'conv-123'
        const limit = 20
        const offset = 40

        mockSupabase.then.mockResolvedValue({
          data: [],
          error: null
        })

        const request = new NextRequest(
          `http://localhost:3000/api/communications/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`
        )
        const response = await getMessages(request)

        expect(response.status).toBe(200)
        expect(mockSupabase.limit).toHaveBeenCalledWith(limit)
        expect(mockSupabase.range).toHaveBeenCalledWith(offset, offset + limit - 1)
      })
    })

    describe('POST /api/communications/messages', () => {
      it('should send a new message', async () => {
        const newMessage = {
          conversation_id: 'conv-123',
          content: 'Test message',
          message_type: 'text'
        }

        const sentMessage = {
          id: 'msg-new',
          ...newMessage,
          sender_id: 'user-123',
          sender_type: 'vendor',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockSupabase.then.mockResolvedValue({
          data: sentMessage,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/messages', {
          method: 'POST',
          body: JSON.stringify(newMessage)
        })

        const response = await sendMessage(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(sentMessage)
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            ...newMessage,
            sender_id: 'user-123',
            sender_type: 'vendor'
          })
        )
      })

      it('should handle file attachments', async () => {
        const messageWithAttachment = {
          conversation_id: 'conv-123',
          content: 'Please see attached file',
          message_type: 'file',
          attachments: [
            {
              name: 'wedding-contract.pdf',
              url: 'https://storage.example.com/files/wedding-contract.pdf',
              size: 1024000,
              type: 'application/pdf'
            }
          ]
        }

        mockSupabase.then.mockResolvedValue({
          data: { id: 'msg-file', ...messageWithAttachment },
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/messages', {
          method: 'POST',
          body: JSON.stringify(messageWithAttachment)
        })

        const response = await sendMessage(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.attachments).toHaveLength(1)
        expect(data.data.message_type).toBe('file')
      })

      it('should validate message content', async () => {
        const emptyMessage = {
          conversation_id: 'conv-123',
          content: '',
          message_type: 'text'
        }

        const request = new NextRequest('http://localhost:3000/api/communications/messages', {
          method: 'POST',
          body: JSON.stringify(emptyMessage)
        })

        const response = await sendMessage(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Message content cannot be empty')
      })
    })
  })

  describe('Email API', () => {
    describe('POST /api/communications/email/send', () => {
      it('should send an email notification', async () => {
        const emailRequest = {
          recipient_email: 'client@example.com',
          template_type: 'form_submission',
          subject: 'New Form Submission',
          data: {
            form_name: 'Wedding Details',
            submitted_at: new Date().toISOString()
          }
        }

        const emailRecord = {
          id: 'email-123',
          organization_id: 'org-123',
          ...emailRequest,
          status: 'sent',
          provider: 'resend',
          provider_id: 'resend-123',
          sent_at: new Date().toISOString()
        }

        mockSupabase.then.mockResolvedValue({
          data: emailRecord,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/email/send', {
          method: 'POST',
          body: JSON.stringify(emailRequest)
        })

        const response = await sendEmail(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.status).toBe('sent')
      })

      it('should handle email sending failures', async () => {
        const emailRequest = {
          recipient_email: 'invalid-email',
          template_type: 'form_submission',
          subject: 'Test Email'
        }

        const request = new NextRequest('http://localhost:3000/api/communications/email/send', {
          method: 'POST',
          body: JSON.stringify(emailRequest)
        })

        const response = await sendEmail(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid email address')
      })

      it('should validate email template type', async () => {
        const emailRequest = {
          recipient_email: 'client@example.com',
          template_type: 'invalid_template',
          subject: 'Test Email'
        }

        const request = new NextRequest('http://localhost:3000/api/communications/email/send', {
          method: 'POST',
          body: JSON.stringify(emailRequest)
        })

        const response = await sendEmail(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid template type')
      })
    })
  })

  describe('Activity Feed API', () => {
    describe('GET /api/communications/activity', () => {
      it('should fetch activity feed for organization', async () => {
        const mockActivities = [
          {
            id: 'activity-1',
            organization_id: 'org-123',
            actor_id: 'user-123',
            actor_type: 'user',
            action: 'form_submitted',
            entity_type: 'form',
            entity_id: 'form-123',
            entity_name: 'Wedding Details Form',
            description: 'John Doe submitted Wedding Details Form',
            importance: 'high',
            is_read: false,
            created_at: '2025-01-01T10:00:00Z'
          },
          {
            id: 'activity-2',
            organization_id: 'org-123',
            actor_id: 'client-123',
            actor_type: 'contact',
            action: 'message_sent',
            entity_type: 'message',
            entity_id: 'msg-123',
            entity_name: 'Message',
            description: 'Client sent a message',
            importance: 'medium',
            is_read: true,
            created_at: '2025-01-01T09:00:00Z'
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: mockActivities,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/activity')
        const response = await getActivity(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(mockActivities)
        expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-123')
        expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      })

      it('should filter activities by importance', async () => {
        const highImportanceActivities = [
          {
            id: 'activity-1',
            importance: 'high'
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: highImportanceActivities,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/activity?importance=high')
        const response = await getActivity(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockSupabase.eq).toHaveBeenCalledWith('importance', 'high')
      })

      it('should filter unread activities', async () => {
        const unreadActivities = [
          {
            id: 'activity-1',
            is_read: false
          }
        ]

        mockSupabase.then.mockResolvedValue({
          data: unreadActivities,
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/activity?unread=true')
        const response = await getActivity(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockSupabase.eq).toHaveBeenCalledWith('is_read', false)
      })

      it('should limit activity results', async () => {
        mockSupabase.then.mockResolvedValue({
          data: [],
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/communications/activity?limit=50')
        const response = await getActivity(request)

        expect(response.status).toBe(200)
        expect(mockSupabase.limit).toHaveBeenCalledWith(50)
      })
    })
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { getUser } = require('@/lib/auth')
      getUser.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/communications/conversations')
      const response = await getConversations(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should prevent cross-organization access', async () => {
      const { getUser } = require('@/lib/auth')
      getUser.mockResolvedValueOnce({
        id: 'user-456',
        email: 'other@example.com',
        organization_id: 'org-456'
      })

      // Try to access conversation from different org
      mockSupabase.then.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/communications/messages?conversationId=conv-from-org-123')
      const response = await getMessages(request)
      const data = await response.json()

      // Should only query user's organization
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-456')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on message sending', async () => {
      const newMessage = {
        conversation_id: 'conv-123',
        content: 'Spam message',
        message_type: 'text'
      }

      // Simulate rapid message sending
      const requests = Array(11).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/communications/messages', {
          method: 'POST',
          body: JSON.stringify(newMessage)
        })
      )

      // Send 10 messages quickly
      for (let i = 0; i < 10; i++) {
        mockSupabase.then.mockResolvedValueOnce({
          data: { id: `msg-${i}` },
          error: null
        })
        const response = await sendMessage(requests[i])
        expect(response.status).toBe(201)
      }

      // 11th message should be rate limited
      const response = await sendMessage(requests[10])
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Rate limit exceeded')
    })
  })
})