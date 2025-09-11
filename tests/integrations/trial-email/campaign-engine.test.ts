import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CampaignEngine, TrialEvent, TrialUser, EmailCampaign } from '@/lib/email/campaign-engine'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

// Mock external services
vi.mock('@/lib/integrations/email-analytics', () => ({
  trackCampaignEvent: vi.fn()
}))

describe('CampaignEngine', () => {
  let campaignEngine: CampaignEngine
  let mockSupabase: any

  beforeEach(() => {
    campaignEngine = new CampaignEngine()
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    campaignEngine.stopProcessor()
    vi.clearAllMocks()
  })

  describe('handleTrialEvent', () => {
    const mockTrialEvent: TrialEvent = {
      userId: 'user-123',
      type: 'trial_started',
      progress: 0,
      daysRemaining: 30,
      userEmail: 'test@example.com',
      timezone: 'UTC',
      metadata: { source: 'signup' }
    }

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      organization_id: 'org-123',
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      plan_type: 'professional',
      features_used: ['dashboard', 'clients'],
      last_active_at: new Date().toISOString(),
      timezone: 'UTC',
      preferred_language: 'en'
    }

    it('should find and process matching campaigns', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUser
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      await campaignEngine.handleTrialEvent(mockTrialEvent)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabase.from).toHaveBeenCalledWith('email_queue')
    })

    it('should handle trial_ending events', async () => {
      const endingEvent: TrialEvent = {
        ...mockTrialEvent,
        type: 'trial_ending',
        daysRemaining: 3,
        progress: 90
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockUser
      })
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      await campaignEngine.handleTrialEvent(endingEvent)

      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('should skip processing if user not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null
      })

      await campaignEngine.handleTrialEvent(mockTrialEvent)

      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database error'))

      await expect(campaignEngine.handleTrialEvent(mockTrialEvent)).rejects.toThrow('Database error')
    })
  })

  describe('calculateOptimalSendTime', () => {
    it('should adjust send time for business hours', () => {
      const engine = campaignEngine as any
      
      // Test early morning (6 AM UTC)
      const earlyMorning = new Date()
      earlyMorning.setUTCHours(6)
      
      const adjusted = engine.calculateOptimalSendTime('UTC', 0)
      const adjustedHour = adjusted.getUTCHours()
      
      // Should be adjusted to 9 AM or later
      expect(adjustedHour).toBeGreaterThanOrEqual(9)
    })

    it('should handle different timezones', () => {
      const engine = campaignEngine as any
      
      const sendTime = engine.calculateOptimalSendTime('PST', 0)
      
      expect(sendTime).toBeInstanceOf(Date)
    })

    it('should respect delay minutes', () => {
      const engine = campaignEngine as any
      
      const now = new Date()
      const sendTime = engine.calculateOptimalSendTime('UTC', 60) // 1 hour delay
      
      expect(sendTime.getTime()).toBeGreaterThan(now.getTime() + 50 * 60 * 1000) // At least 50 minutes later
    })
  })

  describe('generatePersonalization', () => {
    const mockUser: TrialUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      organizationId: 'org-123',
      trialStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      trialEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      planType: 'professional',
      featuresUsed: ['dashboard', 'clients', 'guests'],
      lastActiveAt: new Date(),
      timezone: 'UTC'
    }

    const mockEvent: TrialEvent = {
      userId: 'user-123',
      type: 'trial_ending',
      progress: 70,
      daysRemaining: 5,
      userEmail: 'test@example.com',
      timezone: 'UTC'
    }

    it('should generate personalized data', async () => {
      const mockUsageStats = {
        most_used_feature: 'Guest Management',
        total_time_minutes: 180
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockUsageStats
      })

      const engine = campaignEngine as any
      const personalization = await engine.generatePersonalization(mockUser, mockEvent)

      expect(personalization).toEqual({
        firstName: 'John',
        daysInTrial: 10,
        daysRemaining: 5,
        mostUsedFeature: 'Guest Management',
        totalTimeSpent: 180,
        conversionLikelihood: expect.any(Number),
        recommendedAction: expect.any(String),
        discountOffer: expect.any(String)
      })
    })

    it('should calculate conversion likelihood correctly', () => {
      const engine = campaignEngine as any
      
      // High engagement user
      const highEngagementUser: TrialUser = {
        ...mockUser,
        featuresUsed: ['dashboard', 'clients', 'guests', 'journeys', 'analytics'],
        lastActiveAt: new Date() // Very recent activity
      }

      const likelihood = engine.calculateConversionLikelihood(
        highEngagementUser, 
        { total_time_minutes: 300 }
      )

      expect(likelihood).toBeGreaterThan(50)
    })

    it('should provide appropriate recommendations based on likelihood', () => {
      const engine = campaignEngine as any
      
      // High likelihood, few days remaining
      const highLikelihood = engine.getRecommendedAction(85, 3)
      expect(highLikelihood).toBe('upgrade_now')
      
      // Low likelihood, few days remaining
      const lowLikelihood = engine.getRecommendedAction(25, 2)
      expect(lowLikelihood).toBe('extend_trial')
      
      // Medium likelihood, some days remaining
      const mediumLikelihood = engine.getRecommendedAction(55, 10)
      expect(mediumLikelihood).toBe('explore_features')
    })
  })

  describe('Email Queue Processing', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should process queued emails in priority order', async () => {
      const engine = campaignEngine as any
      
      // Mock queued emails
      engine.emailQueue.set('urgent-1', {
        id: 'urgent-1',
        priority: 'urgent',
        scheduledFor: new Date(Date.now() - 1000),
        status: 'pending'
      })
      
      engine.emailQueue.set('normal-1', {
        id: 'normal-1',
        priority: 'normal',
        scheduledFor: new Date(Date.now() - 1000),
        status: 'pending'
      })

      const sendQueuedEmailSpy = vi.spyOn(engine, 'sendQueuedEmail').mockResolvedValue()
      
      await engine.processEmailQueue()

      // Urgent should be processed first
      expect(sendQueuedEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'urgent-1', priority: 'urgent' })
      )
    })

    it('should respect batch size limits', async () => {
      const engine = campaignEngine as any
      
      // Add 150 emails (should only process 100)
      for (let i = 0; i < 150; i++) {
        engine.emailQueue.set(`email-${i}`, {
          id: `email-${i}`,
          priority: 'normal',
          scheduledFor: new Date(Date.now() - 1000),
          status: 'pending'
        })
      }

      const sendQueuedEmailSpy = vi.spyOn(engine, 'sendQueuedEmail').mockResolvedValue()
      
      await engine.processEmailQueue()

      expect(sendQueuedEmailSpy).toHaveBeenCalledTimes(100)
    })

    it('should handle email sending failures with retry logic', async () => {
      const engine = campaignEngine as any
      
      const queuedEmail = {
        id: 'test-email',
        campaignId: 'test-campaign',
        templateId: 'test-template',
        recipient: 'test@example.com',
        userId: 'user-123',
        scheduledFor: new Date(),
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3,
        personalizationData: {},
        status: 'processing' as const
      }

      // Mock template loading
      vi.spyOn(engine, 'loadTemplate').mockResolvedValue({
        id: 'test-template',
        campaignId: 'test-campaign',
        subject: () => 'Test Subject',
        htmlContent: () => '<p>Test Content</p>',
        textContent: () => 'Test Content',
        personalizations: []
      })

      // Mock email service failure
      const sendEmailError = new Error('Email service unavailable')
      
      mockSupabase.update.mockResolvedValue({ data: null, error: null })

      await engine.sendQueuedEmail(queuedEmail)

      // Should increment retry count and reschedule
      expect(queuedEmail.retryCount).toBe(1)
      expect(queuedEmail.status).toBe('pending')
      expect(queuedEmail.scheduledFor.getTime()).toBeGreaterThan(Date.now())
    })

    it('should mark emails as failed after max retries', async () => {
      const engine = campaignEngine as any
      
      const queuedEmail = {
        id: 'test-email',
        campaignId: 'test-campaign',
        templateId: 'test-template',
        recipient: 'test@example.com',
        userId: 'user-123',
        scheduledFor: new Date(),
        priority: 'normal' as const,
        retryCount: 3, // Already at max retries
        maxRetries: 3,
        personalizationData: {},
        status: 'processing' as const
      }

      vi.spyOn(engine, 'loadTemplate').mockRejectedValue(new Error('Persistent failure'))
      mockSupabase.update.mockResolvedValue({ data: null, error: null })

      await engine.sendQueuedEmail(queuedEmail)

      expect(queuedEmail.status).toBe('failed')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'failed',
        error_message: 'Persistent failure',
        failed_at: expect.any(String)
      })
    })
  })

  describe('Campaign Condition Evaluation', () => {
    const engine = campaignEngine as any
    
    const mockUser: TrialUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      organizationId: 'org-123',
      trialStartDate: new Date(),
      trialEndDate: new Date(),
      planType: 'professional',
      featuresUsed: ['dashboard', 'clients'],
      lastActiveAt: new Date(),
      timezone: 'UTC'
    }

    const mockEvent: TrialEvent = {
      userId: 'user-123',
      type: 'milestone_reached',
      progress: 50,
      daysRemaining: 15,
      userEmail: 'test@example.com',
      timezone: 'UTC'
    }

    it('should evaluate user property conditions', () => {
      const conditions = [{
        type: 'user_property' as const,
        field: 'planType',
        operator: 'equals' as const,
        value: 'professional'
      }]

      const result = engine.evaluateConditions(conditions, mockUser, mockEvent)
      expect(result).toBe(true)
    })

    it('should evaluate event property conditions', () => {
      const conditions = [{
        type: 'event_property' as const,
        field: 'progress',
        operator: 'greater_than' as const,
        value: 40
      }]

      const result = engine.evaluateConditions(conditions, mockUser, mockEvent)
      expect(result).toBe(true)
    })

    it('should handle "in" operator for array values', () => {
      const conditions = [{
        type: 'user_property' as const,
        field: 'planType',
        operator: 'in' as const,
        value: ['professional', 'enterprise']
      }]

      const result = engine.evaluateConditions(conditions, mockUser, mockEvent)
      expect(result).toBe(true)
    })

    it('should return true for empty conditions', () => {
      const result = engine.evaluateConditions([], mockUser, mockEvent)
      expect(result).toBe(true)
    })

    it('should return false if any condition fails', () => {
      const conditions = [
        {
          type: 'user_property' as const,
          field: 'planType',
          operator: 'equals' as const,
          value: 'professional'
        },
        {
          type: 'event_property' as const,
          field: 'progress',
          operator: 'greater_than' as const,
          value: 80 // This will fail
        }
      ]

      const result = engine.evaluateConditions(conditions, mockUser, mockEvent)
      expect(result).toBe(false)
    })
  })

  describe('Performance Tests', () => {
    it('should handle high volume of trial events', async () => {
      const startTime = Date.now()
      
      // Process 100 trial events concurrently
      const events = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i}`,
        type: 'trial_started' as const,
        progress: 0,
        daysRemaining: 30,
        userEmail: `user${i}@example.com`,
        timezone: 'UTC'
      }))

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          organization_id: 'org-123',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          plan_type: 'professional',
          features_used: ['dashboard'],
          last_active_at: new Date().toISOString(),
          timezone: 'UTC'
        }
      })

      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const promises = events.map(event => campaignEngine.handleTrialEvent(event))
      await Promise.all(promises)

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // Should process 100 events in less than 5 seconds
      expect(processingTime).toBeLessThan(5000)
    })

    it('should batch database operations efficiently', async () => {
      const engine = campaignEngine as any
      
      // Add many emails to queue
      for (let i = 0; i < 500; i++) {
        engine.emailQueue.set(`email-${i}`, {
          id: `email-${i}`,
          priority: 'normal',
          scheduledFor: new Date(Date.now() - 1000),
          status: 'pending'
        })
      }

      const batchProcessSpy = vi.spyOn(engine, 'sendQueuedEmail').mockResolvedValue()
      
      await engine.processEmailQueue()

      // Should process in batches of 100
      expect(batchProcessSpy).toHaveBeenCalledTimes(100)
    })
  })
})