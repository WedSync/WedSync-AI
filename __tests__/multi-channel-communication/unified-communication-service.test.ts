import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UnifiedCommunicationService } from '@/lib/services/unifiedCommunicationService'
import type { UnifiedMessageConfig, CommunicationChannel } from '@/lib/services/unifiedCommunicationService'

// Mock all service dependencies
vi.mock('@/lib/services/email-connector', () => ({
  EmailServiceConnector: {
    getInstance: vi.fn(() => ({
      sendEmail: vi.fn(),
      getDeliveryAnalytics: vi.fn()
    }))
  }
}))

vi.mock('@/lib/services/sms-service', () => ({
  SMSService: {
    createWithUserConfig: vi.fn(() => ({
      sendTemplateMessage: vi.fn(),
      getAnalytics: vi.fn(),
      calculateSMSMetrics: vi.fn()
    }))
  }
}))

vi.mock('@/lib/services/whatsapp-service', () => ({
  WhatsAppService: {
    createWithUserConfig: vi.fn(() => ({
      sendTemplateMessage: vi.fn(),
      getAnalytics: vi.fn()
    }))
  }
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }))
}))

// Mock fetch for API calls
global.fetch = vi.fn()

const mockUnifiedConfig: UnifiedMessageConfig = {
  channels: ['email', 'sms', 'whatsapp'],
  recipient: {
    email: 'test@example.com',
    phone: '+1234567890',
    whatsapp: '+1234567890',
    name: 'John Doe'
  },
  content: {
    subject: 'Test Subject',
    message: 'Hello {{recipient_name}}, this is a test message.',
    variables: {
      recipient_name: 'John'
    }
  }
}

describe('UnifiedCommunicationService', () => {
  let service: UnifiedCommunicationService
  const testUserId = 'test-user-id'
  const testOrgId = 'test-org-id'

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new UnifiedCommunicationService(testUserId, testOrgId)
    await service.initialize()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with user and organization IDs', () => {
      expect(service).toBeDefined()
    })

    it('should initialize services correctly', async () => {
      const { SMSService } = await import('@/lib/services/sms-service')
      const { WhatsAppService } = await import('@/lib/services/whatsapp-service')
      
      await service.initialize()
      
      expect(SMSService.createWithUserConfig).toHaveBeenCalledWith(testUserId)
      expect(WhatsAppService.createWithUserConfig).toHaveBeenCalledWith(testUserId)
    })
  })

  describe('Unified Message Sending', () => {
    it('should send message to all channels successfully', async () => {
      // Mock successful responses from all services
      const { EmailServiceConnector } = await import('@/lib/services/email-connector')
      const { SMSService } = await import('@/lib/services/sms-service')
      const { WhatsAppService } = await import('@/lib/services/whatsapp-service')

      const mockEmailService = EmailServiceConnector.getInstance()
      const mockSMSService = await SMSService.createWithUserConfig(testUserId)
      const mockWhatsAppService = await WhatsAppService.createWithUserConfig(testUserId)

      ;(mockEmailService.sendEmail as any).mockResolvedValue({
        message_id: 'email_123',
        status: 'sent',
        delivery_timestamp: new Date().toISOString()
      })

      ;(mockSMSService.sendTemplateMessage as any).mockResolvedValue({
        messageId: 'sms_123',
        status: 'sent',
        metrics: {
          estimated_cost: 0.0075,
          segment_count: 1
        }
      })

      ;(mockWhatsAppService.sendTemplateMessage as any).mockResolvedValue({
        messageId: 'whatsapp_123',
        status: 'sent',
        metrics: {
          estimated_cost: 0.005
        }
      })

      const result = await service.sendUnifiedMessage(mockUnifiedConfig)

      expect(result.results).toHaveLength(3)
      expect(result.successCount).toBe(3)
      expect(result.failureCount).toBe(0)
      expect(result.totalCost).toBeGreaterThan(0)

      // Check each channel result
      const emailResult = result.results.find(r => r.channel === 'email')
      const smsResult = result.results.find(r => r.channel === 'sms')
      const whatsappResult = result.results.find(r => r.channel === 'whatsapp')

      expect(emailResult?.status).toBe('sent')
      expect(emailResult?.messageId).toBe('email_123')
      expect(smsResult?.status).toBe('sent')
      expect(smsResult?.messageId).toBe('sms_123')
      expect(whatsappResult?.status).toBe('sent')
      expect(whatsappResult?.messageId).toBe('whatsapp_123')
    })

    it('should handle partial failures gracefully', async () => {
      const { EmailServiceConnector } = await import('@/lib/services/email-connector')
      const { SMSService } = await import('@/lib/services/sms-service')
      const { WhatsAppService } = await import('@/lib/services/whatsapp-service')

      const mockEmailService = EmailServiceConnector.getInstance()
      const mockSMSService = await SMSService.createWithUserConfig(testUserId)
      const mockWhatsAppService = await WhatsAppService.createWithUserConfig(testUserId)

      // Email succeeds
      ;(mockEmailService.sendEmail as any).mockResolvedValue({
        message_id: 'email_123',
        status: 'sent',
        delivery_timestamp: new Date().toISOString()
      })

      // SMS fails
      ;(mockSMSService.sendTemplateMessage as any).mockResolvedValue({
        messageId: '',
        status: 'failed',
        error: 'SMS service not configured'
      })

      // WhatsApp succeeds
      ;(mockWhatsAppService.sendTemplateMessage as any).mockResolvedValue({
        messageId: 'whatsapp_123',
        status: 'sent',
        metrics: {
          estimated_cost: 0.005
        }
      })

      const result = await service.sendUnifiedMessage(mockUnifiedConfig)

      expect(result.results).toHaveLength(3)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(1)

      const failedResult = result.results.find(r => r.status === 'failed')
      expect(failedResult?.channel).toBe('sms')
      expect(failedResult?.error).toBe('SMS service not configured')
    })

    it('should skip channels when recipient info is missing', async () => {
      const configWithMissingInfo: UnifiedMessageConfig = {
        ...mockUnifiedConfig,
        recipient: {
          email: 'test@example.com',
          // Missing phone and whatsapp
          name: 'John Doe'
        }
      }

      const result = await service.sendUnifiedMessage(configWithMissingInfo)

      const emailResult = result.results.find(r => r.channel === 'email')
      const smsResult = result.results.find(r => r.channel === 'sms')
      const whatsappResult = result.results.find(r => r.channel === 'whatsapp')

      expect(emailResult?.status).toBe('sent')
      expect(smsResult?.status).toBe('skipped')
      expect(whatsappResult?.status).toBe('skipped')
      expect(smsResult?.error).toContain('phone')
      expect(whatsappResult?.error).toContain('WhatsApp')
    })
  })

  describe('Channel Preferences', () => {
    it('should respect recipient channel preferences', async () => {
      // Mock recipient with preferences
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  communication_preferences: {
                    primary: 'whatsapp',
                    excludeChannels: ['sms']
                  }
                },
                error: null
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const result = await service.sendUnifiedMessage(mockUnifiedConfig)

      // Should exclude SMS and prioritize WhatsApp
      const channels = result.results.map(r => r.channel)
      expect(channels).toContain('email')
      expect(channels).toContain('whatsapp')
      expect(channels).not.toContain('sms')
    })
  })

  describe('Template Management', () => {
    it('should create unified template successfully', async () => {
      const template = {
        name: 'Test Template',
        channels: {
          email: {
            subject: 'Test Email',
            htmlTemplate: '<p>Hello {{name}}</p>'
          },
          sms: {
            template: 'Hello {{name}} via SMS'
          },
          whatsapp: {
            templateName: 'hello_template',
            language: 'en'
          }
        },
        variables: ['name'],
        category: 'notification' as const,
        isActive: true
      }

      const templateId = await service.createUnifiedTemplate(template)
      expect(templateId).toBeDefined()
    })

    it('should retrieve unified templates', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Welcome Template',
          category: 'notification',
          channels: {},
          variables: ['name'],
          isActive: true
        }
      ]

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockTemplates,
                error: null
              }))
            }))
          }))
        }))
      }

      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const templates = await service.getUnifiedTemplates()
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('Welcome Template')
    })
  })

  describe('Message Preview and Testing', () => {
    it('should generate message preview for all channels', async () => {
      const { SMSService } = await import('@/lib/services/sms-service')
      const mockSMSService = await SMSService.createWithUserConfig(testUserId)

      ;(mockSMSService.calculateSMSMetrics as any).mockReturnValue({
        estimated_cost: 0.0075,
        segment_count: 1
      })

      const previews = await service.testUnifiedMessage(mockUnifiedConfig)

      expect(previews).toHaveLength(3)
      
      const emailPreview = previews.find(p => p.channel === 'email')
      const smsPreview = previews.find(p => p.channel === 'sms')
      const whatsappPreview = previews.find(p => p.channel === 'whatsapp')

      expect(emailPreview?.preview).toContain('Test Subject')
      expect(smsPreview?.preview).toContain('Hello John')
      expect(whatsappPreview?.preview).toContain('Hello John')

      // Check cost calculations
      expect(emailPreview?.cost).toBe(0.001)
      expect(smsPreview?.cost).toBe(0.0075)
      expect(whatsappPreview?.cost).toBe(0.005)
    })

    it('should handle media in WhatsApp preview', async () => {
      const configWithMedia: UnifiedMessageConfig = {
        ...mockUnifiedConfig,
        channels: ['whatsapp'],
        media: {
          url: 'https://example.com/image.jpg',
          type: 'image',
          caption: 'Beautiful photo'
        }
      }

      const previews = await service.testUnifiedMessage(configWithMedia)
      const whatsappPreview = previews.find(p => p.channel === 'whatsapp')

      expect(whatsappPreview?.preview).toContain('[IMAGE: Beautiful photo]')
      expect(whatsappPreview?.cost).toBe(0.01) // Media messages cost 2x
    })
  })

  describe('Analytics', () => {
    it('should aggregate analytics from all channels', async () => {
      const { EmailServiceConnector } = await import('@/lib/services/email-connector')
      const { SMSService } = await import('@/lib/services/sms-service')
      const { WhatsAppService } = await import('@/lib/services/whatsapp-service')

      const mockEmailService = EmailServiceConnector.getInstance()
      const mockSMSService = await SMSService.createWithUserConfig(testUserId)
      const mockWhatsAppService = await WhatsAppService.createWithUserConfig(testUserId)

      // Mock analytics responses
      ;(mockEmailService.getDeliveryAnalytics as any).mockResolvedValue({
        total_sent: 100,
        total_delivered: 95,
        total_opened: 50,
        total_clicked: 20,
        total_bounced: 5
      })

      ;(mockSMSService.getAnalytics as any).mockResolvedValue({
        metrics: {
          messages_sent: 80,
          messages_delivered: 78,
          total_cost: 0.60
        }
      })

      ;(mockWhatsAppService.getAnalytics as any).mockResolvedValue({
        metrics: {
          messages_sent: 50,
          messages_delivered: 49,
          total_cost: 0.25
        }
      })

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = new Date()

      const analytics = await service.getUnifiedAnalytics(startDate, endDate)

      expect(analytics.total.messages_sent).toBe(230) // 100 + 80 + 50
      expect(analytics.total.total_cost).toBe(0.85) // 0 + 0.60 + 0.25
      expect(analytics.byChannel.email).toBeDefined()
      expect(analytics.byChannel.sms).toBeDefined()
      expect(analytics.byChannel.whatsapp).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      const { SMSService } = await import('@/lib/services/sms-service')
      
      // Mock SMS service creation to throw error
      ;(SMSService.createWithUserConfig as any).mockRejectedValue(
        new Error('SMS configuration not found')
      )

      const newService = new UnifiedCommunicationService(testUserId, testOrgId)
      
      // Should not throw during initialization
      await expect(newService.initialize()).resolves.not.toThrow()
    })

    it('should handle database errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({
            error: { message: 'Database connection failed' }
          }))
        }))
      }

      const { createClient } = await import('@/lib/supabase/server')
      ;(createClient as any).mockResolvedValue(mockSupabase)

      await expect(
        service.createUnifiedTemplate({
          name: 'Test Template',
          channels: {},
          variables: [],
          category: 'notification',
          isActive: true
        })
      ).rejects.toThrow('Failed to create template')
    })
  })

  describe('Message Scheduling', () => {
    it('should handle scheduled messages correctly', async () => {
      const { EmailServiceConnector } = await import('@/lib/services/email-connector')
      const mockEmailService = EmailServiceConnector.getInstance()

      ;(mockEmailService.sendEmail as any).mockResolvedValue({
        message_id: 'email_123',
        status: 'scheduled',
        delivery_timestamp: new Date().toISOString()
      })

      const scheduledConfig: UnifiedMessageConfig = {
        ...mockUnifiedConfig,
        channels: ['email'],
        scheduling: {
          sendAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        }
      }

      const result = await service.sendUnifiedMessage(scheduledConfig)
      
      expect(result.results[0].status).toBe('scheduled')
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_time: expect.any(String)
        })
      )
    })
  })

  describe('Message Tracking', () => {
    it('should enable tracking when requested', async () => {
      const { EmailServiceConnector } = await import('@/lib/services/email-connector')
      const mockEmailService = EmailServiceConnector.getInstance()

      ;(mockEmailService.sendEmail as any).mockResolvedValue({
        message_id: 'email_123',
        status: 'sent',
        delivery_timestamp: new Date().toISOString()
      })

      const trackedConfig: UnifiedMessageConfig = {
        ...mockUnifiedConfig,
        channels: ['email'],
        tracking: {
          trackOpens: true,
          trackClicks: true,
          webhookUrl: 'https://example.com/webhook'
        }
      }

      await service.sendUnifiedMessage(trackedConfig)
      
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          track_opens: true,
          track_clicks: true
        })
      )
    })
  })
})