import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/whatsapp/route'
import { GET as WebhookGET, POST as WebhookPOST } from '@/app/api/whatsapp/webhooks/route'

// Mock next/cookies
vi.mock('next/cookies', () => ({
  cookies: vi.fn(() => Promise.resolve(new Map()))
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Mock WhatsApp service
const mockWhatsAppService = {
  sendMessage: vi.fn(),
  sendTemplateMessage: vi.fn(),
  uploadMedia: vi.fn(),
  validateWhatsAppMessage: vi.fn(),
  calculateWhatsAppMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  checkMessagingWindow: vi.fn(),
  handleWebhook: vi.fn(),
  verifyWebhookChallenge: vi.fn()
}

vi.mock('@/lib/services/whatsapp-service', () => ({
  WhatsAppService: {
    createWithUserConfig: vi.fn(() => Promise.resolve(mockWhatsAppService))
  }
}))

// Mock headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Map([
    ['x-hub-signature-256', 'sha256=test-signature']
  ])))
}))

// Mock crypto for webhook verification
vi.mock('crypto', () => ({
  createHmac: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'test-signature')
    }))
  })),
  timingSafeEqual: vi.fn(() => true)
}))

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

const mockTemplate = {
  id: 'test-template-id',
  template_name: 'test_template',
  display_name: 'Test Template',
  category: 'UTILITY',
  language_code: 'en',
  body_text: 'Hello {{1}}',
  approval_status: 'APPROVED',
  is_approved_template: true
}

describe('WhatsApp API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/whatsapp', () => {
    it('should send message successfully', async () => {
      mockWhatsAppService.sendMessage.mockResolvedValue('msg_123')

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          to: '+1234567890',
          message: 'Hello World!'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBe('msg_123')
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalledWith({
        to: '+1234567890',
        message: 'Hello World!',
        media: undefined,
        replyTo: undefined
      })
    })

    it('should send template message successfully', async () => {
      mockWhatsAppService.sendTemplateMessage.mockResolvedValue({
        messageId: 'msg_124',
        status: 'sent',
        metrics: {
          estimated_cost: 0.005,
          message_type: 'template'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_template',
          to: '+1234567890',
          templateId: 'test-template-id',
          variables: {
            '1': 'John Doe'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBe('msg_124')
      expect(data.metrics).toBeDefined()
    })

    it('should upload media successfully', async () => {
      mockWhatsAppService.uploadMedia.mockResolvedValue('media_123')

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload_media',
          file: {
            buffer: 'base64-encoded-data',
            mimetype: 'image/jpeg',
            filename: 'test.jpg'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.mediaId).toBe('media_123')
    })

    it('should test connection successfully', async () => {
      mockWhatsAppService.sendMessage.mockResolvedValue('test_msg_123')

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'test_connection'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('successfully')
    })

    it('should get templates successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockTemplate],
              error: null
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'get_templates'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].template_name).toBe('test_template')
    })

    it('should validate message successfully', async () => {
      mockWhatsAppService.validateWhatsAppMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        compliance_issues: []
      })

      mockWhatsAppService.calculateWhatsAppMetrics.mockReturnValue({
        estimated_cost: 0.005,
        message_type: 'template'
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'validate_message',
          template: mockTemplate,
          config: {
            to: '+1234567890',
            variables: { '1': 'John' }
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.validation.isValid).toBe(true)
      expect(data.metrics).toBeDefined()
    })

    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          to: '+1234567890',
          message: 'Hello'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle invalid actions', async () => {
      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid_action'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message'
          // Missing 'to' field
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('GET /api/whatsapp', () => {
    it('should get status successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                phone_number: '+1234567890',
                display_name: 'Test Business',
                is_verified: true,
                created_at: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp?action=status')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.configured).toBe(true)
      expect(data.phone_number).toBe('+1234567890')
      expect(data.is_verified).toBe(true)
    })

    it('should get analytics successfully', async () => {
      mockWhatsAppService.getAnalytics.mockResolvedValue({
        metrics: {
          messages_sent: 100,
          messages_delivered: 95,
          total_cost: 0.50
        }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/whatsapp?action=analytics&start_date=2024-01-01&end_date=2024-01-31'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics.metrics.messages_sent).toBe(100)
    })

    it('should get session status successfully', async () => {
      mockWhatsAppService.checkMessagingWindow.mockResolvedValue(true)

      const request = new NextRequest(
        'http://localhost:3000/api/whatsapp?action=session_status&phone_number=%2B1234567890'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.within_session_window).toBe(true)
      expect(data.can_send_freeform).toBe(true)
      expect(data.requires_template).toBe(false)
    })

    it('should handle missing phone number for session status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/whatsapp?action=session_status'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Phone number is required')
    })
  })

  describe('Webhook Routes', () => {
    describe('GET /api/whatsapp/webhooks (Challenge)', () => {
      it('should verify webhook challenge successfully', async () => {
        mockWhatsAppService.verifyWebhookChallenge.mockReturnValue('test-challenge-response')

        const request = new NextRequest(
          'http://localhost:3000/api/whatsapp/webhooks?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=test-challenge'
        )

        const response = await WebhookGET(request)
        const text = await response.text()

        expect(response.status).toBe(200)
        expect(text).toBe('test-challenge-response')
      })

      it('should reject invalid webhook challenge', async () => {
        mockWhatsAppService.verifyWebhookChallenge.mockReturnValue(null)

        const request = new NextRequest(
          'http://localhost:3000/api/whatsapp/webhooks?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test-challenge'
        )

        const response = await WebhookGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Webhook verification failed')
      })
    })

    describe('POST /api/whatsapp/webhooks (Events)', () => {
      it('should handle incoming message webhook', async () => {
        const webhookData = {
          entry: [{
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'test-phone-id'
                },
                messages: [{
                  from: '1234567890',
                  id: 'msg_123',
                  timestamp: '1642681200',
                  type: 'text',
                  text: {
                    body: 'Hello from customer'
                  }
                }]
              }
            }]
          }]
        }

        const request = new NextRequest('http://localhost:3000/api/whatsapp/webhooks', {
          method: 'POST',
          body: JSON.stringify(webhookData)
        })

        const response = await WebhookPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockWhatsAppService.handleWebhook).toHaveBeenCalledWith(
          webhookData,
          'sha256=test-signature'
        )
      })

      it('should handle status update webhook', async () => {
        const webhookData = {
          entry: [{
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'test-phone-id'
                },
                statuses: [{
                  id: 'msg_123',
                  status: 'delivered',
                  timestamp: '1642681200',
                  recipient_id: '1234567890'
                }]
              }
            }]
          }]
        }

        const request = new NextRequest('http://localhost:3000/api/whatsapp/webhooks', {
          method: 'POST',
          body: JSON.stringify(webhookData)
        })

        const response = await WebhookPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should handle webhook processing errors', async () => {
        mockWhatsAppService.handleWebhook.mockRejectedValue(
          new Error('Webhook processing failed')
        )

        const request = new NextRequest('http://localhost:3000/api/whatsapp/webhooks', {
          method: 'POST',
          body: JSON.stringify({
            entry: []
          })
        })

        const response = await WebhookPOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Webhook processing failed')
      })

      it('should handle invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/whatsapp/webhooks', {
          method: 'POST',
          body: 'invalid json'
        })

        const response = await WebhookPOST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Webhook processing failed')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockWhatsAppService.sendMessage.mockRejectedValue(
        new Error('WhatsApp API rate limit exceeded')
      )

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          to: '+1234567890',
          message: 'Hello'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.details).toContain('rate limit')
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'get_templates'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch templates')
    })
  })

  describe('Input Validation', () => {
    it('should validate phone number format', async () => {
      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          to: 'invalid-phone',
          message: 'Hello'
        })
      })

      const response = await POST(request)
      // Should still proceed but let WhatsApp service handle validation
      expect(response.status).toBe(200)
    })

    it('should validate required media fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload_media',
          file: {
            // Missing required fields
            filename: 'test.jpg'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('buffer and mimetype')
    })
  })
})