import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EmailAnalyticsService, EmailAnalyticsEvent } from '@/lib/integrations/email-analytics'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('EmailAnalyticsService', () => {
  let analyticsService: EmailAnalyticsService
  let mockSupabase: any

  beforeEach(() => {
    analyticsService = new EmailAnalyticsService()
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }
    
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    analyticsService.destroy()
    vi.clearAllMocks()
  })

  describe('trackCampaignEvent', () => {
    it('should track email events and buffer them', async () => {
      const event = {
        eventType: 'email_sent',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456',
        metadata: { abTestVariant: 'A' }
      }

      await analyticsService.trackCampaignEvent(event)

      // Should be added to buffer
      const service = analyticsService as any
      expect(service.eventBuffer).toHaveLength(1)
      
      const bufferedEvent = service.eventBuffer[0]
      expect(bufferedEvent).toMatchObject({
        eventType: 'email_sent',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456',
        metadata: { abTestVariant: 'A' }
      })
    })

    it('should auto-flush buffer when full', async () => {
      const service = analyticsService as any
      const flushSpy = vi.spyOn(service, 'flushEventBuffer').mockResolvedValue()

      // Fill buffer to capacity (100 events)
      for (let i = 0; i < 100; i++) {
        await analyticsService.trackCampaignEvent({
          eventType: 'email_sent',
          campaignId: 'campaign-123',
          userId: `user-${i}`,
          emailId: `email-${i}`
        })
      }

      expect(flushSpy).toHaveBeenCalled()
    })

    it('should send events to external platforms', async () => {
      const sendToExternalSpy = vi.spyOn(analyticsService as any, 'sendToExternalPlatforms').mockResolvedValue()

      await analyticsService.trackCampaignEvent({
        eventType: 'email_clicked',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456'
      })

      expect(sendToExternalSpy).toHaveBeenCalled()
    })
  })

  describe('getCampaignAnalytics', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Trial Welcome Campaign',
      type: 'onboarding',
      created_at: new Date().toISOString(),
      ended_at: null,
      ab_test_enabled: false
    }

    const mockEvents = [
      { campaign_id: 'campaign-123', event_type: 'email_sent', timestamp: new Date().toISOString() },
      { campaign_id: 'campaign-123', event_type: 'email_delivered', timestamp: new Date().toISOString() },
      { campaign_id: 'campaign-123', event_type: 'email_opened', timestamp: new Date().toISOString() },
      { campaign_id: 'campaign-123', event_type: 'email_clicked', timestamp: new Date().toISOString() },
      { campaign_id: 'campaign-123', event_type: 'email_converted', timestamp: new Date().toISOString() }
    ]

    beforeEach(() => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockCampaign })
      mockSupabase.eq.mockImplementation((field, value) => {
        if (field === 'campaign_id' && value === 'campaign-123') {
          return { data: mockEvents }
        }
        return { data: [] }
      })
    })

    it('should calculate campaign metrics correctly', async () => {
      const analytics = await analyticsService.getCampaignAnalytics('campaign-123')

      expect(analytics).toMatchObject({
        campaignId: 'campaign-123',
        campaignName: 'Trial Welcome Campaign',
        type: 'onboarding',
        metrics: {
          totalSent: 1,
          delivered: 1,
          opened: 1,
          clicked: 1,
          converted: 1,
          deliveryRate: 100,
          openRate: 100,
          clickThroughRate: 100,
          conversionRate: 100
        }
      })
    })

    it('should handle date range filtering', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      }

      await analyticsService.getCampaignAnalytics('campaign-123', dateRange)

      expect(mockSupabase.gte).toHaveBeenCalledWith('timestamp', dateRange.startDate.toISOString())
      expect(mockSupabase.lte).toHaveBeenCalledWith('timestamp', dateRange.endDate.toISOString())
    })

    it('should throw error for non-existent campaign', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      await expect(analyticsService.getCampaignAnalytics('non-existent')).rejects.toThrow('Campaign not found')
    })
  })

  describe('getEmailDashboard', () => {
    const mockCampaigns = [
      { id: 'campaign-1', name: 'Welcome', status: 'running', created_at: new Date().toISOString() },
      { id: 'campaign-2', name: 'Reminder', status: 'completed', created_at: new Date().toISOString() },
      { id: 'campaign-3', name: 'Conversion', status: 'running', created_at: new Date().toISOString() }
    ]

    beforeEach(() => {
      // Mock campaigns query
      mockSupabase.select.mockImplementation((fields) => {
        if (fields === '*' && mockSupabase.eq.mock.calls.some(call => call[0] === 'organization_id')) {
          return { data: mockCampaigns }
        }
        return mockSupabase
      })

      // Mock recent events
      mockSupabase.in.mockReturnValue({ 
        gte: vi.fn().mockReturnValue({ data: [] }) 
      })
    })

    it('should generate comprehensive dashboard data', async () => {
      // Mock getCampaignAnalytics for recent campaigns
      vi.spyOn(analyticsService, 'getCampaignAnalytics').mockResolvedValue({
        campaignId: 'campaign-1',
        campaignName: 'Welcome',
        type: 'onboarding',
        startDate: new Date(),
        metrics: {
          campaignId: 'campaign-1',
          totalSent: 100,
          delivered: 95,
          opened: 60,
          clicked: 15,
          bounced: 2,
          unsubscribed: 1,
          converted: 5,
          deliveryRate: 95,
          openRate: 63.16,
          clickThroughRate: 25,
          bounceRate: 2,
          conversionRate: 33.33,
          unsubscribeRate: 1.05
        },
        timeSeriesData: [],
        segmentPerformance: []
      })

      const dashboard = await analyticsService.getEmailDashboard('org-123')

      expect(dashboard).toMatchObject({
        overview: {
          totalCampaigns: 3,
          activeCampaigns: 2,
          totalSent: expect.any(Number),
          overallOpenRate: expect.any(Number),
          overallClickRate: expect.any(Number),
          overallConversionRate: expect.any(Number)
        },
        recentCampaigns: expect.any(Array),
        topPerformingCampaigns: expect.any(Array),
        abTestSummary: expect.any(Array),
        realTimeMetrics: expect.any(Array)
      })
    })

    it('should sort top performing campaigns by conversion rate', async () => {
      const mockAnalytics = [
        { campaignId: 'campaign-1', metrics: { conversionRate: 25 } },
        { campaignId: 'campaign-2', metrics: { conversionRate: 35 } },
        { campaignId: 'campaign-3', metrics: { conversionRate: 15 } }
      ]

      vi.spyOn(analyticsService, 'getCampaignAnalytics')
        .mockImplementation((id) => Promise.resolve(mockAnalytics.find(a => a.campaignId === id) as any))

      const dashboard = await analyticsService.getEmailDashboard('org-123')

      expect(dashboard.topPerformingCampaigns).toHaveLength(3)
      expect(dashboard.topPerformingCampaigns[0].campaignId).toBe('campaign-2') // Highest conversion rate
    })
  })

  describe('handleEmailWebhook', () => {
    const mockUser = {
      id: 'user-123',
      organization_id: 'org-123'
    }

    beforeEach(() => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockUser })
    })

    it('should process email delivery webhook', async () => {
      const webhookData = {
        event: 'delivered',
        emailId: 'email-456',
        recipient: 'test@example.com',
        timestamp: Date.now(),
        campaignId: 'campaign-123'
      }

      const trackEventSpy = vi.spyOn(analyticsService, 'trackCampaignEvent')

      await analyticsService.handleEmailWebhook(webhookData)

      expect(trackEventSpy).toHaveBeenCalledWith({
        eventType: 'email_delivered',
        emailId: 'email-456',
        campaignId: 'campaign-123',
        userId: 'user-123',
        metadata: {
          webhookEvent: true,
          originalEvent: 'delivered'
        }
      })
    })

    it('should process email open webhook', async () => {
      const webhookData = {
        event: 'opened',
        emailId: 'email-456',
        recipient: 'test@example.com',
        timestamp: Date.now(),
        campaignId: 'campaign-123',
        metadata: { userAgent: 'Gmail iOS', location: 'US' }
      }

      const trackEventSpy = vi.spyOn(analyticsService, 'trackCampaignEvent')

      await analyticsService.handleEmailWebhook(webhookData)

      expect(trackEventSpy).toHaveBeenCalledWith({
        eventType: 'email_opened',
        emailId: 'email-456',
        campaignId: 'campaign-123',
        userId: 'user-123',
        metadata: {
          userAgent: 'Gmail iOS',
          location: 'US',
          webhookEvent: true,
          originalEvent: 'opened'
        }
      })
    })

    it('should ignore unknown webhook events', async () => {
      const webhookData = {
        event: 'unknown_event',
        emailId: 'email-456',
        recipient: 'test@example.com',
        timestamp: Date.now()
      }

      const trackEventSpy = vi.spyOn(analyticsService, 'trackCampaignEvent')

      await analyticsService.handleEmailWebhook(webhookData)

      expect(trackEventSpy).not.toHaveBeenCalled()
    })

    it('should skip processing if user not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const webhookData = {
        event: 'opened',
        emailId: 'email-456',
        recipient: 'unknown@example.com',
        timestamp: Date.now()
      }

      const trackEventSpy = vi.spyOn(analyticsService, 'trackCampaignEvent')

      await analyticsService.handleEmailWebhook(webhookData)

      expect(trackEventSpy).not.toHaveBeenCalled()
    })
  })

  describe('generateAnalyticsReport', () => {
    it('should generate report in JSON format', async () => {
      vi.spyOn(analyticsService, 'getEmailDashboard').mockResolvedValue({
        overview: {
          totalCampaigns: 5,
          activeCampaigns: 2,
          totalSent: 1000,
          overallOpenRate: 25,
          overallClickRate: 5,
          overallConversionRate: 2
        },
        recentCampaigns: [],
        topPerformingCampaigns: [],
        abTestSummary: [],
        realTimeMetrics: []
      })

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      }

      const report = await analyticsService.generateAnalyticsReport('org-123', dateRange, 'json')

      expect(report).toMatchObject({
        organizationId: 'org-123',
        dateRange,
        generatedAt: expect.any(Date),
        dashboard: expect.any(Object),
        detailedCampaigns: expect.any(Array)
      })
    })

    it('should handle CSV format conversion', async () => {
      vi.spyOn(analyticsService, 'getEmailDashboard').mockResolvedValue({} as any)
      vi.spyOn(analyticsService as any, 'convertToCSV').mockReturnValue('csv,data,here')

      const report = await analyticsService.generateAnalyticsReport('org-123', {
        startDate: new Date(),
        endDate: new Date()
      }, 'csv')

      expect(typeof report).toBe('string')
      expect(report).toContain('csv,data,here')
    })

    it('should handle PDF format conversion', async () => {
      vi.spyOn(analyticsService, 'getEmailDashboard').mockResolvedValue({} as any)
      vi.spyOn(analyticsService as any, 'convertToPDF').mockReturnValue(Buffer.from('pdf-data'))

      const report = await analyticsService.generateAnalyticsReport('org-123', {
        startDate: new Date(),
        endDate: new Date()
      }, 'pdf')

      expect(Buffer.isBuffer(report)).toBe(true)
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle event buffer flush correctly', async () => {
      const service = analyticsService as any
      
      // Add events to buffer
      for (let i = 0; i < 50; i++) {
        service.eventBuffer.push({
          id: `event-${i}`,
          eventType: 'email_sent',
          campaignId: 'campaign-123',
          userId: `user-${i}`,
          emailId: `email-${i}`,
          timestamp: new Date()
        })
      }

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      await service.flushEventBuffer()

      expect(service.eventBuffer).toHaveLength(0)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'email_sent',
            campaign_id: 'campaign-123'
          })
        ])
      )
    })

    it('should handle flush errors gracefully', async () => {
      const service = analyticsService as any
      
      // Add events to buffer
      service.eventBuffer.push({
        id: 'event-1',
        eventType: 'email_sent',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456',
        timestamp: new Date()
      })

      // Mock database error
      mockSupabase.insert.mockRejectedValueOnce(new Error('Database unavailable'))

      await service.flushEventBuffer()

      // Events should be re-added to buffer for retry
      expect(service.eventBuffer).toHaveLength(1)
    })

    it('should aggregate time series data efficiently', () => {
      const service = analyticsService as any
      
      const events = [
        { event_type: 'email_sent', timestamp: '2024-01-01T09:00:00Z' },
        { event_type: 'email_opened', timestamp: '2024-01-01T09:30:00Z' },
        { event_type: 'email_clicked', timestamp: '2024-01-01T10:15:00Z' },
        { event_type: 'email_sent', timestamp: '2024-01-01T10:45:00Z' }
      ]

      const result = service.aggregateTimeSeriesData(events, 'hour')

      expect(result).toHaveLength(2) // 2 different hours
      expect(result[0]).toMatchObject({
        timestamp: new Date('2024-01-01T09:00:00.000Z'),
        sent: 1,
        opened: 1,
        clicked: 0,
        converted: 0
      })
      expect(result[1]).toMatchObject({
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        sent: 1,
        opened: 0,
        clicked: 1,
        converted: 0
      })
    })

    it('should handle high volume analytics queries', async () => {
      // Mock large dataset
      const largeEventSet = Array.from({ length: 10000 }, (_, i) => ({
        campaign_id: 'campaign-123',
        event_type: i % 5 === 0 ? 'email_sent' : 'email_opened',
        timestamp: new Date().toISOString()
      }))

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'campaign-123', name: 'Large Campaign', type: 'engagement' }
      })
      mockSupabase.eq.mockReturnValueOnce({ data: largeEventSet })

      const startTime = Date.now()
      await analyticsService.getCampaignAnalytics('campaign-123')
      const endTime = Date.now()

      // Should process large dataset efficiently (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('External Platform Integration', () => {
    beforeEach(() => {
      // Mock platform initialization
      vi.spyOn(analyticsService as any, 'initializePlatforms').mockResolvedValue()
      
      const service = analyticsService as any
      service.platforms.set('mixpanel', {
        platform: 'mixpanel',
        apiKey: 'test-key',
        projectId: 'test-project',
        enabled: true
      })
    })

    it('should send events to configured platforms', async () => {
      const sendToMixpanelSpy = vi.spyOn(analyticsService as any, 'sendToMixpanel').mockResolvedValue()

      await analyticsService.trackCampaignEvent({
        eventType: 'email_clicked',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456'
      })

      expect(sendToMixpanelSpy).toHaveBeenCalled()
    })

    it('should handle platform failures gracefully', async () => {
      vi.spyOn(analyticsService as any, 'sendToMixpanel').mockRejectedValue(new Error('Platform unavailable'))
      
      // Should not throw error even if external platform fails
      await expect(analyticsService.trackCampaignEvent({
        eventType: 'email_clicked',
        campaignId: 'campaign-123',
        userId: 'user-123',
        emailId: 'email-456'
      })).resolves.not.toThrow()
    })
  })
})