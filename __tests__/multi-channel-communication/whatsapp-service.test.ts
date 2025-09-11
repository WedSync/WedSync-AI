import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WhatsAppService } from '@/lib/services/whatsapp-service'
import type { WhatsAppConfiguration, WhatsAppTemplate } from '@/types/whatsapp'

// Mock fetch globally
global.fetch = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null }))
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  }))
}))

const mockConfig: WhatsAppConfiguration = {
  id: 'test-config-id',
  user_id: 'test-user-id',
  organization_id: 'test-org-id',
  business_account_id: 'test-business-account',
  phone_number_id: 'test-phone-id',
  phone_number: '+1234567890',
  display_name: 'Test Business',
  access_token_encrypted: 'test-access-token',
  webhook_verify_token: 'test-verify-token',
  webhook_url: 'https://example.com/webhook',
  is_active: true,
  is_verified: true,
  cost_per_message: 0.005,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const mockTemplate: WhatsAppTemplate = {
  id: 'test-template-id',
  user_id: 'test-user-id',
  organization_id: 'test-org-id',
  template_name: 'test_template',
  display_name: 'Test Template',
  category: 'UTILITY',
  language_code: 'en',
  body_text: 'Hello {{1}}, your appointment is on {{2}}',
  body_variables: ['customer_name', 'appointment_date'],
  is_approved_template: true,
  approval_status: 'APPROVED',
  usage_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService

  beforeEach(() => {
    vi.clearAllMocks()
    whatsappService = new WhatsAppService(mockConfig)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Configuration', () => {
    it('should initialize with configuration', () => {
      expect(whatsappService).toBeDefined()
    })

    it('should detect when not configured', () => {
      const unconfiguredService = new WhatsAppService()
      // Service should handle unconfigured state gracefully
      expect(unconfiguredService).toBeDefined()
    })
  })

  describe('Message Sending', () => {
    it('should send a text message successfully', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
        messages: [{ id: 'msg_123', message_status: 'sent' }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const messageId = await whatsappService.sendMessage({
        to: '+1234567890',
        message: 'Hello, this is a test message!'
      })

      expect(messageId).toBe('msg_123')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should send a media message successfully', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
        messages: [{ id: 'msg_124', message_status: 'sent' }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const messageId = await whatsappService.sendMessage({
        to: '+1234567890',
        message: 'Check out this image!',
        media: {
          type: 'image',
          url: 'https://example.com/image.jpg',
          caption: 'Beautiful photo'
        }
      })

      expect(messageId).toBe('msg_124')
    })

    it('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        error: {
          message: 'Invalid phone number',
          type: 'param',
          code: 100
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse)
      })

      await expect(
        whatsappService.sendMessage({
          to: 'invalid-phone',
          message: 'Test message'
        })
      ).rejects.toThrow('WhatsApp API error: Invalid phone number')
    })
  })

  describe('Template Messaging', () => {
    it('should send template message successfully', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
        messages: [{ id: 'msg_125', message_status: 'sent' }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await whatsappService.sendTemplateMessage({
        to: '+1234567890',
        template: mockTemplate,
        variables: {
          customer_name: 'John Doe',
          appointment_date: '2024-01-15'
        }
      })

      expect(result.status).toBe('sent')
      expect(result.messageId).toBe('msg_125')
      expect(result.metrics).toBeDefined()
    })

    it('should validate template variables', async () => {
      const result = await whatsappService.sendTemplateMessage({
        to: '+1234567890',
        template: mockTemplate,
        variables: {
          // Missing required variables
        }
      })

      expect(result.status).toBe('failed')
      expect(result.error).toContain('Missing required variables')
    })

    it('should check 24-hour messaging window', async () => {
      const unapprovedTemplate = {
        ...mockTemplate,
        is_approved_template: false
      }

      // Mock session check to return false (outside window)
      vi.spyOn(whatsappService, 'checkMessagingWindow').mockResolvedValue(false)

      const result = await whatsappService.sendTemplateMessage({
        to: '+1234567890',
        template: unapprovedTemplate,
        variables: {
          customer_name: 'John Doe',
          appointment_date: '2024-01-15'
        }
      })

      expect(result.status).toBe('failed')
      expect(result.error).toContain('24-hour window')
    })
  })

  describe('Media Upload', () => {
    it('should upload media successfully', async () => {
      const mockResponse = {
        id: 'media_123'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const mediaId = await whatsappService.uploadMedia({
        buffer: Buffer.from('test image data'),
        mimetype: 'image/jpeg',
        filename: 'test.jpg'
      })

      expect(mediaId).toBe('media_123')
    })

    it('should handle upload errors', async () => {
      const mockErrorResponse = {
        error: {
          message: 'File too large',
          type: 'param',
          code: 131009
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse)
      })

      await expect(
        whatsappService.uploadMedia({
          buffer: Buffer.from('large file data'),
          mimetype: 'image/jpeg',
          filename: 'large.jpg'
        })
      ).rejects.toThrow('Media upload failed: File too large')
    })
  })

  describe('Webhook Handling', () => {
    it('should verify webhook challenge correctly', () => {
      const challenge = whatsappService.verifyWebhookChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'test-challenge'
      })

      expect(challenge).toBe('test-challenge')
    })

    it('should reject invalid webhook challenge', () => {
      const challenge = whatsappService.verifyWebhookChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge'
      })

      expect(challenge).toBeNull()
    })

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
                id: 'incoming_msg_123',
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

      await expect(
        whatsappService.handleWebhook(webhookData)
      ).resolves.not.toThrow()
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

      await expect(
        whatsappService.handleWebhook(webhookData)
      ).resolves.not.toThrow()
    })
  })

  describe('Metrics and Validation', () => {
    it('should calculate message metrics correctly', () => {
      const metrics = whatsappService.calculateWhatsAppMetrics(
        mockTemplate,
        {
          type: 'image',
          url: 'https://example.com/image.jpg'
        }
      )

      expect(metrics.message_type).toBe('media')
      expect(metrics.estimated_cost).toBeGreaterThan(0)
      expect(metrics.media_included).toBe(true)
    })

    it('should validate template message correctly', () => {
      const validation = whatsappService.validateWhatsAppMessage(
        mockTemplate,
        {
          to: '+1234567890',
          variables: {
            customer_name: 'John Doe',
            appointment_date: '2024-01-15'
          }
        }
      )

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect validation errors', () => {
      const rejectedTemplate = {
        ...mockTemplate,
        approval_status: 'REJECTED' as const,
        is_approved_template: false
      }

      const validation = whatsappService.validateWhatsAppMessage(
        rejectedTemplate,
        {
          to: '+1234567890',
          variables: {} // Missing variables
        }
      )

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Phone Number Formatting', () => {
    it('should format US phone numbers correctly', async () => {
      // Test through sendMessage to access private formatPhoneNumber method
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '1234567890', wa_id: '1234567890' }],
        messages: [{ id: 'msg_123', message_status: 'sent' }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await whatsappService.sendMessage({
        to: '(123) 456-7890', // US format
        message: 'Test'
      })

      const call = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.to).toBe('11234567890') // Should be formatted as E.164
    })

    it('should handle international phone numbers', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '441234567890', wa_id: '441234567890' }],
        messages: [{ id: 'msg_123', message_status: 'sent' }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await whatsappService.sendMessage({
        to: '+44 123 456 7890', // UK format
        message: 'Test'
      })

      const call = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.to).toBe('+44 123 456 7890') // Should preserve E.164 format
    })
  })

  describe('Session Window Management', () => {
    it('should check messaging window correctly', async () => {
      // Mock Supabase response for active session
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  last_inbound_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
                },
                error: null
              }))
            }))
          }))
        }))
      }

      // Mock the createClient function
      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const isWithinWindow = await whatsappService.checkMessagingWindow('+1234567890')
      expect(isWithinWindow).toBe(true) // Should be within 24 hours
    })

    it('should detect expired session window', async () => {
      // Mock Supabase response for expired session
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  last_inbound_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
                },
                error: null
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const isWithinWindow = await whatsappService.checkMessagingWindow('+1234567890')
      expect(isWithinWindow).toBe(false) // Should be outside 24 hours
    })
  })

  describe('Analytics', () => {
    it('should generate analytics correctly', async () => {
      // Mock Supabase response with message data
      const mockMessages = [
        {
          id: '1',
          status: 'delivered',
          message_type: 'template',
          media_type: null,
          cost_charged: 0.005,
          sent_at: new Date().toISOString()
        },
        {
          id: '2',
          status: 'read',
          message_type: 'session',
          media_type: 'image',
          cost_charged: 0.010,
          sent_at: new Date().toISOString()
        }
      ]

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({
                  data: mockMessages,
                  error: null
                }))
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const analytics = await whatsappService.getAnalytics(
        'test-user-id',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        new Date()
      )

      expect(analytics.metrics.messages_sent).toBe(2)
      expect(analytics.metrics.messages_delivered).toBe(2)
      expect(analytics.metrics.messages_read).toBe(1)
      expect(analytics.metrics.delivery_rate).toBe(1.0)
      expect(analytics.metrics.read_rate).toBe(0.5)
      expect(analytics.metrics.template_messages).toBe(1)
      expect(analytics.metrics.media_messages).toBe(1)
      expect(analytics.metrics.total_cost).toBe(0.015)
    })
  })
})