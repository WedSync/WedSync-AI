import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import nock from 'nock'

/**
 * WS-246: Vendor Performance Analytics System - Integration Testing
 * Tests external data source integration and cross-system data flow
 */

// Mock external services
jest.mock('@/lib/supabase/server')
jest.mock('next/headers')

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockIntegrationData, error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [mockIntegrationData], error: null })),
      range: jest.fn(() => Promise.resolve({ data: [mockIntegrationData], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: mockIntegrationData, error: null })),
    update: jest.fn(() => Promise.resolve({ data: mockIntegrationData, error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: mockIntegrationData, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  rpc: jest.fn(() => Promise.resolve({ data: 92.5, error: null })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
}

;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
;(cookies as jest.Mock).mockReturnValue(new Map())

// Mock integration services
import { TaveIntegration } from '@/lib/integrations/tave'
import { LightBlueIntegration } from '@/lib/integrations/lightblue'
import { HoneyBookIntegration } from '@/lib/integrations/honeybook'
import { StripeIntegration } from '@/lib/integrations/stripe'
import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar'
import { AnalyticsProcessor } from '@/lib/analytics/processor'
import { DataSyncService } from '@/lib/analytics/data-sync'
import { WebhookProcessor } from '@/lib/analytics/webhooks'

// Mock data
const mockIntegrationData = {
  id: 'integration-test-123',
  vendor_id: 'vendor-123',
  source_system: 'tave',
  data_type: 'booking',
  raw_data: {
    booking_id: 'tave-booking-456',
    client_name: 'John & Jane Smith',
    booking_date: '2025-07-15',
    package_value: 2500.00,
    status: 'confirmed'
  },
  processed_data: {
    normalized_booking_id: 'booking-normalized-789',
    client_id: 'client-789',
    revenue: 2500.00,
    booking_status: 'confirmed',
    created_at: '2025-01-15T10:00:00Z'
  },
  sync_status: 'completed',
  last_synced: '2025-01-15T14:30:00Z'
}

const mockTaveData = {
  jobs: [
    {
      id: 12345,
      client_name: 'John & Jane Smith',
      event_date: '2025-07-15',
      package_name: 'Wedding Photography Premium',
      total_amount: 2500.00,
      status: 'Booked',
      created_date: '2024-12-01T10:00:00Z',
      last_contact: '2025-01-10T15:30:00Z'
    }
  ],
  client_communications: [
    {
      job_id: 12345,
      type: 'email',
      subject: 'Wedding Photography Inquiry',
      sent_date: '2024-12-01T10:00:00Z',
      response_date: '2024-12-01T11:30:00Z'
    }
  ]
}

const mockStripeEvents = [
  {
    id: 'evt_test_webhook',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        amount: 250000, // $2500.00 in cents
        currency: 'gbp',
        status: 'succeeded',
        metadata: {
          vendor_id: 'vendor-123',
          booking_id: 'booking-789'
        }
      }
    },
    created: 1706259600 // Jan 26, 2024 timestamp
  }
]

describe('External System Integrations', () => {
  beforeAll(() => {
    // Set up nock interceptors for external APIs
    nock.disableNetConnect()
    nock.enableNetConnect(['127.0.0.1', 'localhost'])
  })

  afterAll(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    nock.cleanAll()
  })

  describe('Tave Integration', () => {
    it('should sync booking data from Tave API', async () => {
      // Mock Tave API response
      const taveScope = nock('https://api.taveapi.com')
        .get('/v1/jobs')
        .query({ status: 'all', limit: 100 })
        .reply(200, mockTaveData)

      const taveIntegration = new TaveIntegration({
        apiKey: 'test-tave-api-key',
        secretKey: 'test-secret-key'
      })

      const syncResult = await taveIntegration.syncBookings('vendor-123')

      expect(taveScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.synced_count).toBe(1)
      expect(syncResult.bookings[0]).toMatchObject({
        external_id: '12345',
        client_name: 'John & Jane Smith',
        booking_date: '2025-07-15',
        package_value: 2500.00,
        status: 'confirmed'
      })

      // Verify data was stored in Supabase
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: 'vendor-123',
          source_system: 'tave',
          data_type: 'booking'
        })
      )
    })

    it('should handle Tave API authentication errors', async () => {
      const taveScope = nock('https://api.taveapi.com')
        .get('/v1/jobs')
        .reply(401, { error: 'Invalid API credentials' })

      const taveIntegration = new TaveIntegration({
        apiKey: 'invalid-key',
        secretKey: 'invalid-secret'
      })

      const syncResult = await taveIntegration.syncBookings('vendor-123')

      expect(taveScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(false)
      expect(syncResult.error).toContain('Authentication failed')
    })

    it('should calculate accurate response times from Tave communications', async () => {
      const taveScope = nock('https://api.taveapi.com')
        .get('/v1/client-communications')
        .query({ job_id: '12345' })
        .reply(200, mockTaveData.client_communications)

      const taveIntegration = new TaveIntegration({
        apiKey: 'test-tave-api-key',
        secretKey: 'test-secret-key'
      })

      const communicationData = await taveIntegration.getClientCommunications('12345')
      const responseTime = taveIntegration.calculateResponseTime(
        communicationData[0].sent_date,
        communicationData[0].response_date
      )

      expect(taveScope.isDone()).toBe(true)
      expect(responseTime).toBe(1.5) // 1.5 hours response time
    })

    it('should handle rate limiting from Tave API', async () => {
      // Mock rate limit response
      const taveScope = nock('https://api.taveapi.com')
        .get('/v1/jobs')
        .reply(429, { error: 'Rate limit exceeded' }, {
          'Retry-After': '60'
        })
        .get('/v1/jobs') // Retry after delay
        .reply(200, mockTaveData)

      const taveIntegration = new TaveIntegration({
        apiKey: 'test-tave-api-key',
        secretKey: 'test-secret-key',
        retryOnRateLimit: true
      })

      const startTime = Date.now()
      const syncResult = await taveIntegration.syncBookings('vendor-123')
      const duration = Date.now() - startTime

      expect(taveScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(duration).toBeGreaterThan(1000) // Should have waited before retry
    })
  })

  describe('Light Blue Integration', () => {
    it('should scrape data from Light Blue dashboard', async () => {
      // Mock Light Blue login and dashboard pages
      const lightBlueScope = nock('https://app.lightblue.co.uk')
        .post('/login')
        .reply(200, { success: true }, {
          'Set-Cookie': 'session_id=test-session-123'
        })
        .get('/dashboard/bookings')
        .reply(200, `
          <html>
            <div class="booking-item" data-id="lb-booking-456">
              <span class="client-name">Sarah & Mike Johnson</span>
              <span class="wedding-date">2025-08-20</span>
              <span class="package-value">£3200</span>
              <span class="status">Confirmed</span>
            </div>
          </html>
        `)

      const lightBlueIntegration = new LightBlueIntegration({
        email: 'test@photographer.com',
        password: 'test-password'
      })

      const syncResult = await lightBlueIntegration.scrapeBookings('vendor-123')

      expect(lightBlueScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.bookings[0]).toMatchObject({
        external_id: 'lb-booking-456',
        client_name: 'Sarah & Mike Johnson',
        booking_date: '2025-08-20',
        package_value: 3200.00,
        status: 'confirmed'
      })
    })

    it('should handle Light Blue login failures', async () => {
      const lightBlueScope = nock('https://app.lightblue.co.uk')
        .post('/login')
        .reply(401, { error: 'Invalid credentials' })

      const lightBlueIntegration = new LightBlueIntegration({
        email: 'invalid@photographer.com',
        password: 'wrong-password'
      })

      const syncResult = await lightBlueIntegration.scrapeBookings('vendor-123')

      expect(lightBlueScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(false)
      expect(syncResult.error).toContain('Login failed')
    })

    it('should handle website structure changes gracefully', async () => {
      // Mock changed website structure
      const lightBlueScope = nock('https://app.lightblue.co.uk')
        .post('/login')
        .reply(200, { success: true })
        .get('/dashboard/bookings')
        .reply(200, `
          <html>
            <!-- Structure changed - no booking items found -->
            <div class="new-structure">No bookings available</div>
          </html>
        `)

      const lightBlueIntegration = new LightBlueIntegration({
        email: 'test@photographer.com',
        password: 'test-password'
      })

      const syncResult = await lightBlueIntegration.scrapeBookings('vendor-123')

      expect(lightBlueScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.bookings).toHaveLength(0)
      expect(syncResult.warning).toContain('Website structure may have changed')
    })
  })

  describe('HoneyBook Integration', () => {
    it('should sync projects via HoneyBook OAuth API', async () => {
      const mockHoneyBookData = {
        projects: [
          {
            id: 'hb_project_789',
            client: {
              firstName: 'Emma',
              lastName: 'Wilson',
              email: 'emma@example.com'
            },
            event: {
              date: '2025-09-10',
              type: 'wedding'
            },
            proposal: {
              total: 2800.00,
              status: 'accepted'
            }
          }
        ]
      }

      const honeyBookScope = nock('https://api.honeybook.com')
        .get('/v1/projects')
        .query({ status: 'active' })
        .reply(200, mockHoneyBookData)

      const honeyBookIntegration = new HoneyBookIntegration({
        accessToken: 'hb-access-token-123',
        refreshToken: 'hb-refresh-token-456'
      })

      const syncResult = await honeyBookIntegration.syncProjects('vendor-123')

      expect(honeyBookScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.projects[0]).toMatchObject({
        external_id: 'hb_project_789',
        client_name: 'Emma Wilson',
        booking_date: '2025-09-10',
        package_value: 2800.00,
        status: 'confirmed'
      })
    })

    it('should refresh OAuth tokens when expired', async () => {
      // Mock expired token response
      const expiredTokenScope = nock('https://api.honeybook.com')
        .get('/v1/projects')
        .reply(401, { error: 'Access token expired' })

      // Mock token refresh
      const tokenRefreshScope = nock('https://api.honeybook.com')
        .post('/oauth/token')
        .reply(200, {
          access_token: 'new-access-token-123',
          refresh_token: 'new-refresh-token-456',
          expires_in: 3600
        })

      // Mock successful retry with new token
      const retryScope = nock('https://api.honeybook.com')
        .get('/v1/projects')
        .reply(200, { projects: [] })

      const honeyBookIntegration = new HoneyBookIntegration({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        clientId: 'hb-client-id',
        clientSecret: 'hb-client-secret'
      })

      const syncResult = await honeyBookIntegration.syncProjects('vendor-123')

      expect(expiredTokenScope.isDone()).toBe(true)
      expect(tokenRefreshScope.isDone()).toBe(true)
      expect(retryScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.tokens_refreshed).toBe(true)
    })
  })

  describe('Stripe Integration', () => {
    it('should process Stripe payment webhooks correctly', async () => {
      const stripeIntegration = new StripeIntegration({
        secretKey: 'sk_test_123',
        webhookSecret: 'whsec_test_456'
      })

      const webhookPayload = JSON.stringify(mockStripeEvents[0])
      const signature = stripeIntegration.constructWebhookSignature(webhookPayload)

      const processResult = await stripeIntegration.processWebhook({
        body: webhookPayload,
        signature: signature
      })

      expect(processResult.success).toBe(true)
      expect(processResult.event_type).toBe('payment_intent.succeeded')
      expect(processResult.amount).toBe(2500.00)
      expect(processResult.vendor_id).toBe('vendor-123')

      // Verify analytics data was updated
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: 'vendor-123',
          source_system: 'stripe',
          data_type: 'payment',
          raw_data: expect.objectContaining({
            amount: 250000,
            currency: 'gbp'
          })
        })
      )
    })

    it('should handle Stripe webhook signature verification', async () => {
      const stripeIntegration = new StripeIntegration({
        secretKey: 'sk_test_123',
        webhookSecret: 'whsec_test_456'
      })

      const webhookPayload = JSON.stringify(mockStripeEvents[0])
      const invalidSignature = 'invalid-signature'

      const processResult = await stripeIntegration.processWebhook({
        body: webhookPayload,
        signature: invalidSignature
      })

      expect(processResult.success).toBe(false)
      expect(processResult.error).toContain('Invalid webhook signature')
    })

    it('should sync historical payment data from Stripe', async () => {
      const mockStripePayments = {
        data: [
          {
            id: 'pi_historical_123',
            amount: 180000, // £1800
            currency: 'gbp',
            status: 'succeeded',
            created: 1704067200, // Jan 1, 2024
            metadata: {
              vendor_id: 'vendor-123',
              booking_id: 'booking-456'
            }
          }
        ],
        has_more: false
      }

      const stripeScope = nock('https://api.stripe.com')
        .get('/v1/payment_intents')
        .query({ limit: 100 })
        .reply(200, mockStripePayments)

      const stripeIntegration = new StripeIntegration({
        secretKey: 'sk_test_123'
      })

      const syncResult = await stripeIntegration.syncHistoricalPayments('vendor-123')

      expect(stripeScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.synced_count).toBe(1)
      expect(syncResult.total_amount).toBe(1800.00)
    })
  })

  describe('Google Calendar Integration', () => {
    it('should sync wedding events from Google Calendar', async () => {
      const mockCalendarEvents = {
        items: [
          {
            id: 'calendar_event_123',
            summary: 'Wedding Photography - Emma & James',
            start: { dateTime: '2025-06-15T14:00:00Z' },
            end: { dateTime: '2025-06-15T22:00:00Z' },
            location: 'The Grand Hotel, London',
            attendees: [
              { email: 'emma@example.com' },
              { email: 'james@example.com' }
            ]
          }
        ]
      }

      const calendarScope = nock('https://www.googleapis.com')
        .get('/calendar/v3/calendars/primary/events')
        .query({
          timeMin: expect.any(String),
          timeMax: expect.any(String),
          q: 'wedding'
        })
        .reply(200, mockCalendarEvents)

      const calendarIntegration = new GoogleCalendarIntegration({
        accessToken: 'google-access-token-123',
        refreshToken: 'google-refresh-token-456'
      })

      const syncResult = await calendarIntegration.syncWeddingEvents('vendor-123')

      expect(calendarScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.events[0]).toMatchObject({
        external_id: 'calendar_event_123',
        title: 'Wedding Photography - Emma & James',
        wedding_date: '2025-06-15',
        duration_hours: 8,
        venue_location: 'The Grand Hotel, London'
      })
    })

    it('should handle Google API rate limiting', async () => {
      // Mock rate limit response
      const rateLimitScope = nock('https://www.googleapis.com')
        .get('/calendar/v3/calendars/primary/events')
        .reply(429, {
          error: {
            code: 429,
            message: 'Rate Limit Exceeded'
          }
        }, {
          'Retry-After': '5'
        })
        .get('/calendar/v3/calendars/primary/events') // Retry
        .reply(200, { items: [] })

      const calendarIntegration = new GoogleCalendarIntegration({
        accessToken: 'google-access-token-123'
      })

      const syncResult = await calendarIntegration.syncWeddingEvents('vendor-123')

      expect(rateLimitScope.isDone()).toBe(true)
      expect(syncResult.success).toBe(true)
      expect(syncResult.rate_limited).toBe(true)
    })
  })
})

describe('Data Processing and Normalization', () => {
  let analyticsProcessor: AnalyticsProcessor

  beforeEach(() => {
    analyticsProcessor = new AnalyticsProcessor({
      supabaseClient: mockSupabaseClient
    })
  })

  it('should normalize booking data from different sources', async () => {
    const rawDataSources = [
      {
        source: 'tave',
        data: {
          id: 12345,
          client_name: 'John & Jane Smith',
          event_date: '2025-07-15',
          total_amount: 2500.00,
          status: 'Booked'
        }
      },
      {
        source: 'honeybook',
        data: {
          id: 'hb_project_789',
          client: { firstName: 'Emma', lastName: 'Wilson' },
          event: { date: '2025-09-10' },
          proposal: { total: 2800.00, status: 'accepted' }
        }
      }
    ]

    const normalizedResults = await Promise.all(
      rawDataSources.map(source => 
        analyticsProcessor.normalizeBookingData(source.source, source.data)
      )
    )

    // Check normalized structure is consistent
    normalizedResults.forEach(result => {
      expect(result).toHaveProperty('client_name')
      expect(result).toHaveProperty('booking_date')
      expect(result).toHaveProperty('package_value')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('source_system')
    })

    // Check specific transformations
    expect(normalizedResults[0].client_name).toBe('John & Jane Smith')
    expect(normalizedResults[0].status).toBe('confirmed') // 'Booked' -> 'confirmed'
    
    expect(normalizedResults[1].client_name).toBe('Emma Wilson')
    expect(normalizedResults[1].status).toBe('confirmed') // 'accepted' -> 'confirmed'
  })

  it('should detect and handle duplicate bookings across systems', async () => {
    const potentialDuplicates = [
      {
        source: 'tave',
        client_name: 'John Smith & Jane Doe',
        booking_date: '2025-07-15',
        package_value: 2500.00,
        venue_location: 'The Grand Hotel'
      },
      {
        source: 'stripe',
        client_name: 'John & Jane Smith',
        booking_date: '2025-07-15',
        package_value: 2500.00,
        venue_location: 'Grand Hotel, London'
      }
    ]

    const duplicateDetection = await analyticsProcessor.detectDuplicates(potentialDuplicates)

    expect(duplicateDetection.has_duplicates).toBe(true)
    expect(duplicateDetection.duplicate_groups[0]).toHaveLength(2)
    expect(duplicateDetection.confidence_score).toBeGreaterThan(0.8)
  })

  it('should calculate vendor performance metrics accurately', async () => {
    const vendorData = {
      vendor_id: 'vendor-123',
      bookings: [
        { booking_date: '2024-06-15', package_value: 2500, status: 'confirmed' },
        { booking_date: '2024-07-20', package_value: 3200, status: 'confirmed' },
        { booking_date: '2024-08-10', package_value: 1800, status: 'cancelled' }
      ],
      interactions: [
        { type: 'inquiry', sent_at: '2024-06-01T10:00:00Z', responded_at: '2024-06-01T11:30:00Z' },
        { type: 'inquiry', sent_at: '2024-07-01T14:00:00Z', responded_at: '2024-07-01T15:15:00Z' }
      ],
      reviews: [
        { rating: 5, verified: true },
        { rating: 4, verified: true },
        { rating: 5, verified: false }
      ]
    }

    const metrics = await analyticsProcessor.calculateVendorMetrics(vendorData)

    expect(metrics.booking_success_rate).toBe(0.67) // 2 confirmed out of 3 total
    expect(metrics.average_response_time).toBe(1.375) // Average of 1.5 and 1.25 hours
    expect(metrics.satisfaction_score).toBe(4.5) // Weighted average with verified reviews
    expect(metrics.total_revenue).toBe(5700) // Sum of confirmed bookings only
    expect(metrics.overall_score).toBeGreaterThan(80) // Should calculate high score
  })

  it('should handle missing or incomplete data gracefully', async () => {
    const incompleteData = {
      vendor_id: 'vendor-incomplete',
      bookings: [], // No bookings
      interactions: [
        { type: 'inquiry', sent_at: '2024-06-01T10:00:00Z' } // No response time
      ],
      reviews: [] // No reviews
    }

    const metrics = await analyticsProcessor.calculateVendorMetrics(incompleteData)

    expect(metrics.booking_success_rate).toBe(null)
    expect(metrics.average_response_time).toBe(null)
    expect(metrics.satisfaction_score).toBe(null)
    expect(metrics.total_revenue).toBe(0)
    expect(metrics.overall_score).toBe(null)
    expect(metrics.has_sufficient_data).toBe(false)
  })
})

describe('Real-time Data Synchronization', () => {
  let dataSyncService: DataSyncService

  beforeEach(() => {
    dataSyncService = new DataSyncService({
      supabaseClient: mockSupabaseClient,
      syncInterval: 60000 // 1 minute for testing
    })
  })

  afterEach(() => {
    dataSyncService.stop()
  })

  it('should sync data from all configured integrations', async () => {
    const integrationConfigs = [
      { type: 'tave', vendor_id: 'vendor-123', enabled: true },
      { type: 'stripe', vendor_id: 'vendor-123', enabled: true },
      { type: 'honeybook', vendor_id: 'vendor-456', enabled: true }
    ]

    const syncResult = await dataSyncService.syncAllIntegrations(integrationConfigs)

    expect(syncResult.total_integrations).toBe(3)
    expect(syncResult.successful_syncs).toBe(3)
    expect(syncResult.failed_syncs).toBe(0)
    expect(syncResult.total_records_synced).toBeGreaterThan(0)
  })

  it('should handle partial sync failures gracefully', async () => {
    // Mock one integration to fail
    const taveScope = nock('https://api.taveapi.com')
      .get('/v1/jobs')
      .reply(500, { error: 'Internal server error' })

    const integrationConfigs = [
      { type: 'tave', vendor_id: 'vendor-123', enabled: true },
      { type: 'stripe', vendor_id: 'vendor-123', enabled: true }
    ]

    const syncResult = await dataSyncService.syncAllIntegrations(integrationConfigs)

    expect(taveScope.isDone()).toBe(true)
    expect(syncResult.total_integrations).toBe(2)
    expect(syncResult.successful_syncs).toBe(1) // Only Stripe succeeded
    expect(syncResult.failed_syncs).toBe(1) // Tave failed
    expect(syncResult.errors).toHaveLength(1)
    expect(syncResult.errors[0].integration).toBe('tave')
  })

  it('should maintain sync state and resume from last checkpoint', async () => {
    const checkpointData = {
      vendor_id: 'vendor-123',
      integration_type: 'tave',
      last_sync_timestamp: '2025-01-15T10:00:00Z',
      last_record_id: 'tave-record-999'
    }

    await dataSyncService.saveCheckpoint(checkpointData)
    const resumedSync = await dataSyncService.resumeFromCheckpoint('vendor-123', 'tave')

    expect(resumedSync.starting_from).toBe('tave-record-999')
    expect(resumedSync.since_timestamp).toBe('2025-01-15T10:00:00Z')
  })

  it('should detect and handle data conflicts', async () => {
    // Simulate conflicting data from different sources
    const conflictingData = [
      {
        source: 'tave',
        booking_id: 'booking-123',
        package_value: 2500.00,
        last_updated: '2025-01-15T10:00:00Z'
      },
      {
        source: 'stripe',
        booking_id: 'booking-123',
        package_value: 2600.00, // Different value
        last_updated: '2025-01-15T11:00:00Z'
      }
    ]

    const conflictResolution = await dataSyncService.resolveDataConflicts(conflictingData)

    expect(conflictResolution.resolution_strategy).toBe('latest_timestamp')
    expect(conflictResolution.chosen_value.package_value).toBe(2600.00) // Later timestamp wins
    expect(conflictResolution.conflict_logged).toBe(true)
  })
})

describe('Webhook Processing', () => {
  let webhookProcessor: WebhookProcessor

  beforeEach(() => {
    webhookProcessor = new WebhookProcessor({
      supabaseClient: mockSupabaseClient
    })
  })

  it('should process incoming webhooks and update analytics', async () => {
    const webhookPayload = {
      source: 'stripe',
      event_type: 'payment.succeeded',
      data: {
        vendor_id: 'vendor-123',
        amount: 2500.00,
        booking_id: 'booking-456',
        timestamp: '2025-01-15T14:30:00Z'
      }
    }

    const processResult = await webhookProcessor.processIncomingWebhook(webhookPayload)

    expect(processResult.success).toBe(true)
    expect(processResult.analytics_updated).toBe(true)
    
    // Verify analytics recalculation was triggered
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'recalculate_vendor_analytics',
      { vendor_id_input: 'vendor-123' }
    )
  })

  it('should validate webhook signatures and sources', async () => {
    const invalidWebhook = {
      source: 'unknown-source',
      event_type: 'test.event',
      signature: 'invalid-signature',
      data: {}
    }

    const processResult = await webhookProcessor.processIncomingWebhook(invalidWebhook)

    expect(processResult.success).toBe(false)
    expect(processResult.error).toContain('Invalid webhook source or signature')
  })

  it('should handle webhook delivery retries', async () => {
    // Mock temporary database failure
    mockSupabaseClient.upsert.mockResolvedValueOnce({
      data: null,
      error: new Error('Database temporarily unavailable')
    }).mockResolvedValueOnce({
      data: mockIntegrationData,
      error: null
    })

    const webhookPayload = {
      source: 'stripe',
      event_type: 'payment.succeeded',
      data: { vendor_id: 'vendor-123', amount: 2500.00 },
      retry_count: 0,
      max_retries: 3
    }

    const processResult = await webhookProcessor.processIncomingWebhook(webhookPayload)

    expect(processResult.success).toBe(true)
    expect(processResult.retry_count).toBe(1)
    expect(mockSupabaseClient.upsert).toHaveBeenCalledTimes(2)
  })

  it('should maintain webhook delivery order', async () => {
    const webhooks = [
      {
        source: 'stripe',
        event_type: 'booking.created',
        sequence: 1,
        data: { booking_id: 'booking-123', status: 'pending' }
      },
      {
        source: 'stripe',
        event_type: 'booking.confirmed',
        sequence: 2,
        data: { booking_id: 'booking-123', status: 'confirmed' }
      },
      {
        source: 'stripe',
        event_type: 'payment.received',
        sequence: 3,
        data: { booking_id: 'booking-123', amount: 2500.00 }
      }
    ]

    const results = await webhookProcessor.processOrderedWebhooks(webhooks)

    expect(results.processed_in_order).toBe(true)
    expect(results.all_successful).toBe(true)
    results.individual_results.forEach((result, index) => {
      expect(result.sequence).toBe(index + 1)
      expect(result.success).toBe(true)
    })
  })
})