/**
 * WS-336 Calendar Integration System - Integration Tests
 * Integration testing for calendar provider APIs (Google, Outlook, Apple)
 * 
 * WEDDING CONTEXT: Integration tests validate end-to-end API flows for wedding vendors
 * These tests use mocked HTTP responses to simulate real calendar provider interactions
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import nock from 'nock'
import { supabase } from '@/lib/supabase'
import { POST as GoogleOAuthHandler } from '@/app/api/calendar/oauth/google/route'
import { POST as WebhookHandler } from '@/app/api/calendar/webhooks/google/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Setup test database
const TEST_VENDOR_ID = 'integration-test-vendor-12345'
const TEST_WEDDING_ID = 'integration-test-wedding-67890'

describe('Calendar Provider Integration Tests', () => {
  let testVendor: any
  let testWedding: any
  let googleAPI: nock.Scope
  let outlookAPI: nock.Scope

  beforeAll(async () => {
    // Setup test data
    await setupTestEnvironment()
    
    // Ensure clean state
    nock.cleanAll()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestEnvironment()
    nock.restore()
  })

  beforeEach(async () => {
    // Setup API mocks
    googleAPI = mockGoogleCalendarAPI()
    outlookAPI = mockOutlookAPI()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('Google Calendar OAuth Integration', () => {
    it('should complete OAuth flow and store encrypted tokens', async () => {
      // Arrange - Mock Google OAuth token exchange
      googleAPI
        .post('/oauth2/v4/token')
        .reply(200, {
          access_token: 'goog_access_token_12345',
          refresh_token: 'goog_refresh_token_67890',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/calendar.events'
        })

      // Mock Google user info request
      googleAPI
        .get('/oauth2/v1/userinfo')
        .reply(200, {
          id: '123456789012345',
          email: 'wedding.photographer@gmail.com',
          verified_email: true,
          name: 'Professional Wedding Photography'
        })

      // Create OAuth callback request
      const oauthRequest = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
        method: 'POST',
        body: JSON.stringify({
          code: 'google_oauth_code_12345',
          state: `vendor_${TEST_VENDOR_ID}`,
          redirect_uri: 'http://localhost:3000/calendar/connect'
        })
      })

      // Act - Execute OAuth callback
      const response = await GoogleOAuthHandler(oauthRequest)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.provider).toBe('google')
      expect(result.userEmail).toBe('wedding.photographer@gmail.com')
      expect(result.connectionId).toBeTruthy()

      // Verify tokens are stored encrypted in database
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('vendor_id', TEST_VENDOR_ID)
        .eq('provider', 'google')
        .single()

      expect(connection).toBeTruthy()
      expect(connection.encrypted_access_token).toBeTruthy()
      expect(connection.encrypted_refresh_token).toBeTruthy()
      expect(connection.user_email).toBe('wedding.photographer@gmail.com')
      expect(connection.expires_at).toBeTruthy()
      
      // Tokens should be encrypted (not plaintext)
      expect(connection.encrypted_access_token).not.toBe('goog_access_token_12345')
      expect(connection.encrypted_refresh_token).not.toBe('goog_refresh_token_67890')
    })

    it('should handle OAuth errors with proper error responses', async () => {
      // Arrange - Mock OAuth error response
      googleAPI
        .post('/oauth2/v4/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Authorization code has expired'
        })

      const failedOAuthRequest = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
        method: 'POST',
        body: JSON.stringify({
          code: 'expired_oauth_code',
          state: `vendor_${TEST_VENDOR_ID}`
        })
      })

      // Act
      const response = await GoogleOAuthHandler(failedOAuthRequest)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalid_grant')
      expect(result.userFriendlyMessage).toContain('authorization has expired')
    })

    it('should prevent OAuth state parameter attacks', async () => {
      // Arrange - Malicious state parameter attempts
      const maliciousStates = [
        'vendor_../../../admin/override',
        'vendor_<script>alert("xss")</script>',
        'vendor_; DROP TABLE calendar_connections;--',
        'admin_system_access_attempt',
        'vendor_nonexistent_id_12345'
      ]

      for (const maliciousState of maliciousStates) {
        const maliciousRequest = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
          method: 'POST',
          body: JSON.stringify({
            code: 'valid_oauth_code',
            state: maliciousState
          })
        })

        // Act
        const response = await GoogleOAuthHandler(maliciousRequest)
        const result = await response.json()

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/Invalid state parameter|Unauthorized access|Vendor not found/)
      }
    })
  })

  describe('Calendar Event Synchronization', () => {
    it('should sync wedding timeline events to Google Calendar', async () => {
      // Arrange - Setup calendar connection first
      await createTestCalendarConnection('google')

      const weddingTimelineEvents = [
        {
          id: 'getting-ready-photos',
          summary: 'Johnson Wedding - Getting Ready Photos',
          start: { dateTime: '2024-07-20T10:00:00Z' },
          end: { dateTime: '2024-07-20T12:00:00Z' },
          location: 'Bridal Suite, Grand Hotel',
          description: 'Getting ready photos for Emma & James Johnson wedding'
        },
        {
          id: 'ceremony-photography',
          summary: 'Johnson Wedding - Ceremony Photography',
          start: { dateTime: '2024-07-20T14:00:00Z' },
          end: { dateTime: '2024-07-20T15:00:00Z' },
          location: 'Garden Chapel, Grand Hotel',
          description: 'Wedding ceremony photography'
        },
        {
          id: 'reception-photography',
          summary: 'Johnson Wedding - Reception Photography',
          start: { dateTime: '2024-07-20T18:00:00Z' },
          end: { dateTime: '2024-07-20T23:00:00Z' },
          location: 'Grand Ballroom, Grand Hotel',
          description: 'Reception photography and dancing'
        }
      ]

      // Mock successful batch event creation
      googleAPI
        .post('/calendar/v3/calendars/primary/events/batch')
        .reply(200, {
          successful: 3,
          failed: 0,
          events: weddingTimelineEvents.map((event, index) => ({
            id: `google_event_${index + 1}`,
            ...event,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }))
        })

      // Create sync request
      const syncRequest = new NextRequest('http://localhost:3000/api/calendar/sync', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_VENDOR_ID}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weddingId: TEST_WEDDING_ID,
          provider: 'google',
          events: weddingTimelineEvents
        })
      })

      // Act
      const response = await fetch(syncRequest.url, {
        method: 'POST',
        headers: syncRequest.headers,
        body: syncRequest.body
      })
      
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.syncedEvents).toBe(3)
      expect(result.failedEvents).toBe(0)
      expect(result.conflicts).toHaveLength(0)

      // Verify events are stored in WedSync database
      const { data: syncedEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('wedding_id', TEST_WEDDING_ID)
        .eq('sync_status', 'synced')

      expect(syncedEvents).toHaveLength(3)
      syncedEvents.forEach(event => {
        expect(event.external_event_id).toMatch(/^google_event_\d+$/)
        expect(event.provider).toBe('google')
        expect(event.sync_timestamp).toBeTruthy()
      })
    })

    it('should handle wedding day conflicts during sync', async () => {
      // Arrange - Create existing wedding event first
      await supabase.from('calendar_events').insert({
        id: 'existing-wedding-event',
        wedding_id: TEST_WEDDING_ID,
        vendor_id: TEST_VENDOR_ID,
        title: 'Smith Wedding - Photography',
        start_datetime: '2024-07-20T13:00:00Z',
        end_datetime: '2024-07-20T21:00:00Z',
        event_type: 'wedding',
        sync_status: 'synced'
      })

      await createTestCalendarConnection('google')

      const conflictingEvent = {
        id: 'conflicting-wedding',
        summary: 'Brown Wedding - Photography',
        start: { dateTime: '2024-07-20T15:00:00Z' },
        end: { dateTime: '2024-07-20T22:00:00Z' },
        location: 'Different Venue',
        description: 'Conflicting wedding photography booking'
      }

      // Mock Google Calendar conflict detection
      googleAPI
        .post('/calendar/v3/calendars/primary/events')
        .reply(409, {
          error: {
            code: 409,
            message: 'Resource conflict detected',
            details: {
              conflictType: 'time_overlap',
              existingEvents: ['existing-wedding-event'],
              suggestedAlternatives: [
                { start: '2024-07-20T11:00:00Z', end: '2024-07-20T19:00:00Z' },
                { start: '2024-07-21T15:00:00Z', end: '2024-07-21T22:00:00Z' }
              ]
            }
          }
        })

      const conflictSyncRequest = new NextRequest('http://localhost:3000/api/calendar/sync', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${TEST_VENDOR_ID}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weddingId: TEST_WEDDING_ID,
          provider: 'google',
          events: [conflictingEvent]
        })
      })

      // Act
      const response = await fetch(conflictSyncRequest.url, {
        method: 'POST',
        headers: conflictSyncRequest.headers,
        body: conflictSyncRequest.body
      })
      
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200) // Success with conflicts
      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].type).toBe('wedding_time_overlap')
      expect(result.conflicts[0].severity).toBe('CRITICAL')
      expect(result.conflicts[0].resolutionOptions).toHaveLength(2)
      expect(result.syncedEvents).toBe(0) // No events synced due to conflict
    })
  })

  describe('Webhook Event Processing', () => {
    it('should process Google Calendar webhook and update timeline', async () => {
      // Arrange - Setup webhook subscription and connection
      await createTestCalendarConnection('google')
      await createTestWebhookSubscription()

      const webhookPayload = {
        kind: 'api#channel',
        id: 'webhook-channel-12345',
        resourceId: 'resource-67890',
        resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        token: process.env.GOOGLE_WEBHOOK_TOKEN,
        expiration: '1735689600000' // Future timestamp
      }

      // Mock fetching changed events
      googleAPI
        .get('/calendar/v3/calendars/primary/events')
        .query({ 
          updatedMin: /.+/,
          singleEvents: true,
          orderBy: 'updated'
        })
        .reply(200, {
          items: [{
            id: 'updated-google-event-123',
            summary: 'Johnson Wedding - Time Updated',
            start: { dateTime: '2024-07-20T15:00:00Z' }, // Changed from 14:00
            end: { dateTime: '2024-07-20T16:00:00Z' },
            location: 'Garden Chapel, Grand Hotel',
            updated: new Date().toISOString(),
            status: 'confirmed',
            extendedProperties: {
              shared: {
                wedSyncEventId: 'ceremony-photography',
                weddingId: TEST_WEDDING_ID
              }
            }
          }]
        })

      // Create valid webhook signature
      const signature = crypto
        .createHmac('sha256', process.env.GOOGLE_WEBHOOK_SECRET!)
        .update(JSON.stringify(webhookPayload))
        .digest('hex')

      const webhookRequest = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
        method: 'POST',
        headers: {
          'X-Goog-Channel-ID': 'webhook-channel-12345',
          'X-Goog-Channel-Token': process.env.GOOGLE_WEBHOOK_TOKEN!,
          'X-Goog-Resource-ID': 'resource-67890',
          'X-Hub-Signature': `sha256=${signature}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      })

      // Act
      const response = await WebhookHandler(webhookRequest)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.processed).toBe(true)
      expect(result.eventsProcessed).toBe(1)
      expect(result.updatedEvents).toHaveLength(1)

      // Verify timeline was updated in database
      const { data: updatedEvent } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('external_event_id', 'updated-google-event-123')
        .single()

      expect(updatedEvent.start_datetime).toBe('2024-07-20T15:00:00.000Z')
      expect(updatedEvent.sync_status).toBe('synced')
      expect(updatedEvent.last_updated).toBeTruthy()

      // Verify change was propagated to other connected calendars
      expect(result.propagatedToProviders).toContain('outlook')
    })

    it('should reject webhooks with invalid signatures', async () => {
      // Arrange - Invalid webhook payload
      const invalidPayload = { 
        malicious: 'payload',
        injection: 'attempt'
      }

      const webhookRequest = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
        method: 'POST',
        headers: {
          'X-Hub-Signature': 'sha256=invalid_signature_attempt',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidPayload)
      })

      // Act
      const response = await WebhookHandler(webhookRequest)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(result.error).toBe('Invalid webhook signature')
      expect(result.securityViolation).toBe(true)

      // Verify no events were processed
      expect(result.processed).toBe(false)
      expect(result.eventsProcessed).toBe(0)
    })

    it('should handle webhook flooding with rate limiting', async () => {
      // Arrange - Multiple rapid webhook requests
      const validPayload = {
        kind: 'api#channel',
        id: 'flood-test-channel',
        resourceId: 'flood-test-resource'
      }

      const signature = crypto
        .createHmac('sha256', process.env.GOOGLE_WEBHOOK_SECRET!)
        .update(JSON.stringify(validPayload))
        .digest('hex')

      // Create 20 simultaneous webhook requests
      const floodRequests = Array(20).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
          method: 'POST',
          headers: {
            'X-Hub-Signature': `sha256=${signature}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validPayload)
        })
      )

      // Act - Send all requests simultaneously
      const responses = await Promise.all(
        floodRequests.map(req => WebhookHandler(req))
      )

      // Assert - Most should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(successfulResponses.length).toBeLessThan(5) // Only a few should succeed
      expect(rateLimitedResponses.length).toBeGreaterThan(15) // Most should be rate limited
    })
  })

  describe('Token Refresh and Management', () => {
    it('should automatically refresh expired tokens during API calls', async () => {
      // Arrange - Setup connection with expired token
      const expiredConnection = await supabase
        .from('calendar_connections')
        .insert({
          vendor_id: TEST_VENDOR_ID,
          provider: 'google',
          encrypted_access_token: 'encrypted_expired_token',
          encrypted_refresh_token: 'encrypted_refresh_token',
          expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          user_email: 'photographer@example.com',
          connection_status: 'active'
        })
        .select()
        .single()

      // Mock token refresh
      googleAPI
        .post('/oauth2/v4/token', body => {
          return body.includes('grant_type=refresh_token')
        })
        .reply(200, {
          access_token: 'new_refreshed_access_token_789',
          expires_in: 3600,
          token_type: 'Bearer'
        })

      // Mock successful API call after token refresh
      googleAPI
        .get('/calendar/v3/calendars/primary/events')
        .reply(200, {
          items: []
        })

      const apiRequest = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${TEST_VENDOR_ID}`
        }
      })

      // Act
      const response = await fetch(apiRequest.url, {
        method: 'GET',
        headers: apiRequest.headers
      })

      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.tokenRefreshed).toBe(true)

      // Verify new token is stored in database
      const { data: updatedConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', expiredConnection.data.id)
        .single()

      expect(updatedConnection.expires_at).toBeAfter(new Date())
      expect(updatedConnection.encrypted_access_token).not.toBe('encrypted_expired_token')
    })

    it('should handle refresh token revocation and require re-authorization', async () => {
      // Arrange - Setup connection with revoked refresh token
      await createTestCalendarConnection('google')

      // Mock refresh token revocation error
      googleAPI
        .post('/oauth2/v4/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked'
        })

      const apiRequest = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${TEST_VENDOR_ID}`
        }
      })

      // Act
      const response = await fetch(apiRequest.url, {
        method: 'GET',
        headers: apiRequest.headers
      })

      const result = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(result.error).toContain('re-authorization required')
      expect(result.authorizationUrl).toBeTruthy()
      expect(result.provider).toBe('google')

      // Verify connection status updated to 'reauth_required'
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('vendor_id', TEST_VENDOR_ID)
        .eq('provider', 'google')
        .single()

      expect(connection.connection_status).toBe('reauth_required')
    })
  })

  // Helper functions for test setup
  async function setupTestEnvironment() {
    // Create test vendor
    const { data: vendor } = await supabase
      .from('user_profiles')
      .upsert({
        id: TEST_VENDOR_ID,
        email: 'integration-test@wedsync.com',
        business_name: 'Integration Test Photography',
        user_type: 'vendor',
        subscription_tier: 'professional'
      })
      .select()
      .single()

    testVendor = vendor

    // Create test wedding
    const { data: wedding } = await supabase
      .from('weddings')
      .upsert({
        id: TEST_WEDDING_ID,
        vendor_id: TEST_VENDOR_ID,
        couple_names: 'Emma & James Johnson',
        wedding_date: '2024-07-20',
        venue_name: 'Grand Hotel Wedding Venue',
        status: 'confirmed'
      })
      .select()
      .single()

    testWedding = wedding
  }

  async function cleanupTestEnvironment() {
    // Clean up test data
    await supabase.from('calendar_events').delete().eq('wedding_id', TEST_WEDDING_ID)
    await supabase.from('calendar_connections').delete().eq('vendor_id', TEST_VENDOR_ID)
    await supabase.from('webhook_subscriptions').delete().eq('vendor_id', TEST_VENDOR_ID)
    await supabase.from('weddings').delete().eq('id', TEST_WEDDING_ID)
    await supabase.from('user_profiles').delete().eq('id', TEST_VENDOR_ID)
  }

  async function createTestCalendarConnection(provider: string) {
    return await supabase
      .from('calendar_connections')
      .insert({
        vendor_id: TEST_VENDOR_ID,
        provider: provider,
        encrypted_access_token: 'encrypted_test_access_token',
        encrypted_refresh_token: 'encrypted_test_refresh_token',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        user_email: `test-${provider}@example.com`,
        connection_status: 'active'
      })
      .select()
      .single()
  }

  async function createTestWebhookSubscription() {
    return await supabase
      .from('webhook_subscriptions')
      .insert({
        vendor_id: TEST_VENDOR_ID,
        provider: 'google',
        channel_id: 'webhook-channel-12345',
        resource_id: 'resource-67890',
        webhook_url: 'https://wedsync.com/api/calendar/webhooks/google',
        expiration: new Date(Date.now() + 86400000).toISOString() // 24 hours
      })
      .select()
      .single()
  }

  function mockGoogleCalendarAPI() {
    return nock('https://www.googleapis.com')
      .persist()
      .defaultReplyHeaders({
        'access-control-allow-origin': '*',
        'access-control-allow-credentials': 'true'
      })
  }

  function mockOutlookAPI() {
    return nock('https://graph.microsoft.com')
      .persist()
      .defaultReplyHeaders({
        'access-control-allow-origin': '*',
        'access-control-allow-credentials': 'true'
      })
  }
})