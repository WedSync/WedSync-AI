import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { RealtimeWebhookIntegration } from '@/lib/integrations/realtime/RealtimeWebhookIntegration'
import type { 
  RealtimeEventMetadata, 
  WeddingEventData, 
  EmailTriggerEventData,
  WebhookEndpoint,
  RealtimeWebhookPayload 
} from '@/types/realtime-integration'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis()
}

// Mock WebhookManager
const mockWebhookManager = {
  generateSignature: vi.fn().mockReturnValue('test-signature-123')
}

// Mock fetch
global.fetch = vi.fn()

describe('RealtimeWebhookIntegration', () => {
  let webhookIntegration: RealtimeWebhookIntegration
  let mockFetch: MockedFunction<typeof fetch>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = fetch as MockedFunction<typeof fetch>
    
    webhookIntegration = new RealtimeWebhookIntegration(
      mockSupabase as any,
      mockWebhookManager as any
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleDatabaseChange', () => {
    const mockMetadata: RealtimeEventMetadata = {
      source: 'supabase',
      triggeredBy: 'test-user',
      timestamp: '2024-01-20T10:00:00Z',
      priority: 'normal',
      organizationId: 'org-123',
      correlationId: 'corr-123'
    }

    const mockEndpoints: WebhookEndpoint[] = [
      {
        id: 'endpoint-1',
        endpoint_url: 'https://api.example.com/webhook',
        secret_key: 'secret-123',
        subscribed_events: ['form_responses.insert'],
        is_active: true,
        organization_id: 'org-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        max_retries: 3,
        timeout_seconds: 10
      }
    ]

    it('should send webhooks to subscribed endpoints for form response insertion', async () => {
      // Mock database query for webhook endpoints
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockEndpoints
            })
          })
        })
      })

      // Mock successful webhook delivery
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const newRecord = {
        id: 'response-123',
        form_id: 'form-456',
        client_name: 'John & Jane Doe',
        submitted_at: '2024-01-20T10:00:00Z'
      }

      await webhookIntegration.handleDatabaseChange(
        'form_responses',
        'INSERT',
        null,
        newRecord,
        mockMetadata
      )

      // Verify webhook was sent
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-WedSync-Signature': 'test-signature-123',
            'X-WedSync-Event': 'form_responses.insert',
            'X-WedSync-Source': 'realtime'
          })
        })
      )
    })

    it('should handle webhook delivery failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockEndpoints
            })
          })
        })
      })

      // Mock failed webhook delivery
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const newRecord = {
        id: 'response-123',
        form_id: 'form-456'
      }

      // Should not throw error
      await expect(
        webhookIntegration.handleDatabaseChange(
          'form_responses',
          'INSERT',
          null,
          newRecord,
          mockMetadata
        )
      ).resolves.toBeUndefined()
    })

    it('should skip processing when no webhook endpoints are found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: []
            })
          })
        })
      })

      const newRecord = { id: 'response-123' }

      await webhookIntegration.handleDatabaseChange(
        'form_responses',
        'INSERT',
        null,
        newRecord,
        mockMetadata
      )

      // Verify no webhook calls were made
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('integratePhotographyCRM', () => {
    const mockWeddingData: WeddingEventData = {
      wedding_id: 'wedding-123',
      bride_name: 'Jane',
      groom_name: 'John',
      wedding_date: '2024-06-15',
      ceremony_time: '14:00',
      venue_name: 'Beautiful Gardens',
      guest_count: 100,
      special_requests: 'Outdoor ceremony preferred',
      updated_at: '2024-01-20T10:00:00Z'
    }

    it('should integrate with photography CRM systems', async () => {
      // Mock CRM configuration lookup
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  data: {
                    webhook_url: 'https://tave.com/api/webhook',
                    api_key: 'tave-api-key-123',
                    settings: { format: 'tave_v2' }
                  }
                })
              })
            })
          })
        })
      })

      // Mock successful API call
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integratePhotographyCRM('supplier-123', mockWeddingData)

      // Verify correct API call was made
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tave.com/api/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer tave-api-key-123',
            'X-Integration-Source': 'WedSync-Realtime',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('wedding_update')
        })
      )
    })

    it('should handle missing CRM configuration gracefully', async () => {
      // Mock no CRM configuration found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({ data: null })
              })
            })
          })
        })
      })

      await webhookIntegration.integratePhotographyCRM('supplier-123', mockWeddingData)

      // Should not make any API calls
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should transform wedding data correctly for photography CRM', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  data: {
                    webhook_url: 'https://tave.com/api/webhook',
                    api_key: 'tave-api-key-123',
                    settings: {}
                  }
                })
              })
            })
          })
        })
      })

      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integratePhotographyCRM('supplier-123', mockWeddingData)

      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1]?.body as string)

      // Verify data transformation
      expect(requestBody).toMatchObject({
        event_type: 'wedding_update',
        wedding_id: 'wedding-123',
        client_name: 'Jane & John',
        wedding_date: '2024-06-15',
        ceremony_time: '14:00',
        venue_name: 'Beautiful Gardens',
        guest_count: 100,
        photographer_notes: 'Outdoor ceremony preferred'
      })
    })
  })

  describe('integrateVenueBookingSystem', () => {
    const mockWeddingData: WeddingEventData = {
      wedding_id: 'wedding-456',
      bride_name: 'Sarah',
      groom_name: 'Mike',
      wedding_date: '2024-07-20',
      reception_time: '18:00',
      venue_name: 'Grand Ballroom',
      guest_count: 150,
      updated_at: '2024-01-20T10:00:00Z'
    }

    it('should integrate with venue booking systems', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValue({
                data: {
                  webhook_url: 'https://venue-api.com/webhook',
                  api_credentials: { api_key: 'venue-key-456' },
                  notification_preferences: { realtime: true }
                }
              })
            })
          })
        })
      })

      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integrateVenueBookingSystem('venue-123', mockWeddingData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://venue-api.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Venue-API-Key': 'venue-key-456',
            'X-Realtime-Event': 'wedding-update'
          })
        })
      )
    })

    it('should transform data correctly for venue systems', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValue({
                data: {
                  webhook_url: 'https://venue-api.com/webhook',
                  api_credentials: { api_key: 'venue-key-456' }
                }
              })
            })
          })
        })
      })

      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integrateVenueBookingSystem('venue-123', mockWeddingData)

      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1]?.body as string)

      expect(requestBody).toMatchObject({
        booking_id: 'wedding-456',
        event_date: '2024-07-20',
        party_size: 150,
        reception_start: '18:00'
      })
    })
  })

  describe('integrateEmailPlatform', () => {
    const mockEmailData: EmailTriggerEventData = {
      eventType: 'JOURNEY_MILESTONE_COMPLETED',
      recipientEmail: 'supplier@example.com',
      templateId: 'milestone-template',
      variables: {
        client_name: 'John & Jane',
        milestone_name: 'Contract Signed'
      },
      priority: 'normal',
      organizationId: 'org-123'
    }

    it('should integrate with email marketing platforms', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              data: [{
                platform_type: 'mailchimp',
                api_key: 'mailchimp-key-789',
                webhook_url: 'https://api.mailchimp.com/webhook',
                trigger_settings: { automated: true }
              }]
            })
          })
        })
      })

      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integrateEmailPlatform('supplier-456', mockEmailData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mailchimp.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mailchimp-key-789',
            'X-Platform': 'mailchimp'
          })
        })
      )
    })

    it('should handle multiple email platforms for one supplier', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              data: [
                {
                  platform_type: 'mailchimp',
                  api_key: 'mailchimp-key',
                  webhook_url: 'https://api.mailchimp.com/webhook'
                },
                {
                  platform_type: 'convertkit',
                  api_key: 'convertkit-key',
                  webhook_url: 'https://api.convertkit.com/webhook'
                }
              ]
            })
          })
        })
      })

      mockFetch
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))

      await webhookIntegration.integrateEmailPlatform('supplier-456', mockEmailData)

      // Should call both platforms
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith('https://api.mailchimp.com/webhook', expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith('https://api.convertkit.com/webhook', expect.any(Object))
    })
  })

  describe('error handling and retry logic', () => {
    it('should schedule retries for failed webhook deliveries', async () => {
      const mockEndpoints: WebhookEndpoint[] = [{
        id: 'endpoint-fail',
        endpoint_url: 'https://failing-webhook.com',
        secret_key: 'secret-fail',
        subscribed_events: ['test.insert'],
        is_active: true,
        organization_id: 'org-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        max_retries: 3,
        timeout_seconds: 10
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockEndpoints
            })
          })
        })
      })

      // Mock the insert calls for logging and retry scheduling
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null })
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'webhook_deliveries' || table === 'webhook_retries') {
          return { insert: mockInsert }
        }
        return mockSupabase.from(table)
      })

      // Mock failed webhook call
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      await webhookIntegration.handleDatabaseChange(
        'test_table',
        'INSERT',
        null,
        { id: 'test-123' },
        {
          source: 'test',
          triggeredBy: 'test',
          timestamp: '2024-01-20T10:00:00Z',
          priority: 'normal',
          organizationId: 'org-123',
          correlationId: 'test-corr'
        }
      )

      // Verify retry was scheduled
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint_id: 'endpoint-fail',
          status: 'pending'
        })
      )
    })

    it('should respect timeout settings for webhook calls', async () => {
      const mockEndpoints: WebhookEndpoint[] = [{
        id: 'endpoint-timeout',
        endpoint_url: 'https://slow-webhook.com',
        secret_key: 'secret-slow',
        subscribed_events: ['test.insert'],
        is_active: true,
        organization_id: 'org-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        max_retries: 3,
        timeout_seconds: 5
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockEndpoints
            })
          })
        })
      })

      // Mock slow response that will timeout
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      )

      await webhookIntegration.handleDatabaseChange(
        'test_table',
        'INSERT',
        null,
        { id: 'test-timeout' },
        {
          source: 'test',
          triggeredBy: 'test',
          timestamp: '2024-01-20T10:00:00Z',
          priority: 'normal',
          organizationId: 'org-123',
          correlationId: 'test-corr'
        }
      )

      // Verify fetch was called with timeout
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slow-webhook.com',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })
  })

  describe('wedding day priority handling', () => {
    it('should handle wedding day events with higher priority', async () => {
      const weddingDayMetadata: RealtimeEventMetadata = {
        source: 'supabase',
        triggeredBy: 'system',
        timestamp: '2024-06-15T10:00:00Z',
        priority: 'critical',
        weddingId: 'wedding-today',
        organizationId: 'org-123',
        correlationId: 'wedding-day-event'
      }

      const mockEndpoints: WebhookEndpoint[] = [{
        id: 'endpoint-wedding',
        endpoint_url: 'https://wedding-day-webhook.com',
        secret_key: 'wedding-secret',
        subscribed_events: ['weddings.update'],
        is_active: true,
        organization_id: 'org-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        max_retries: 5, // More retries for wedding day
        timeout_seconds: 30
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockEndpoints
            })
          })
        })
      })

      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const weddingUpdate = {
        id: 'wedding-today',
        wedding_date: '2024-06-15',
        status: 'in_progress'
      }

      await webhookIntegration.handleDatabaseChange(
        'weddings',
        'UPDATE',
        null,
        weddingUpdate,
        weddingDayMetadata
      )

      // Verify webhook was sent with wedding day priority
      expect(mockFetch).toHaveBeenCalledWith(
        'https://wedding-day-webhook.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-WedSync-Event': 'weddings.update',
            'X-WedSync-Source': 'realtime'
          })
        })
      )
    })
  })
})