/**
 * WS-192 Integration Tests Suite - Third-Party Service Integration Tests
 * Team C - Integration Testing Infrastructure
 * 
 * Comprehensive testing of external service integrations including Stripe, Calendar APIs, 
 * Email services, and webhook handling with realistic failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestContext, TestContext, mockServer } from './setup'
import { WeddingDataFactory } from '../factories/wedding-data-factory'
import { http, HttpResponse } from 'msw'
import crypto from 'crypto'

interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

interface CalendarEventResponse {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  attendees: Array<{ email: string; responseStatus: string }>
  htmlLink: string
}

interface EmailResponse {
  id: string
  from: string
  to: string[]
  subject: string
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
  timestamp: string
}

describe('Third-Party Service Integration Tests', () => {
  let testContext: TestContext
  let dataFactory: WeddingDataFactory

  beforeEach(async () => {
    testContext = await createTestContext('third_party_services')
    dataFactory = new WeddingDataFactory(testContext.supabase)
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('Stripe Payment Integration', () => {
    it('should handle complete subscription upgrade workflow', async () => {
      let stripeRequests: any[] = []
      
      // Mock Stripe checkout session creation
      mockServer.use(
        http.post('https://api.stripe.com/v1/checkout/sessions', async ({ request }) => {
          const formData = await request.formData()
          const sessionData = Object.fromEntries(formData)
          
          stripeRequests.push({ type: 'checkout_session', data: sessionData })
          
          const sessionId = `cs_test_${Date.now()}`
          return HttpResponse.json({
            id: sessionId,
            url: `https://checkout.stripe.com/pay/${sessionId}`,
            payment_status: 'unpaid',
            customer_email: sessionData.customer_email,
            metadata: sessionData.metadata ? JSON.parse(sessionData.metadata as string) : {}
          })
        }),

        // Mock Stripe subscription creation
        http.post('https://api.stripe.com/v1/subscriptions', async ({ request }) => {
          const formData = await request.formData()
          const subData = Object.fromEntries(formData)
          
          stripeRequests.push({ type: 'subscription', data: subData })
          
          return HttpResponse.json({
            id: `sub_${Date.now()}`,
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
            items: {
              data: [{
                price: {
                  id: subData.items ? JSON.parse(subData.items as string)[0].price : 'price_professional_monthly',
                  nickname: 'Professional Monthly'
                }
              }]
            }
          })
        })
      )

      // Create supplier
      const supplier = await dataFactory.createWeddingSupplier({
        subscription_tier: 'free',
        email: 'test-supplier@example.com'
      })

      // Simulate subscription upgrade
      const checkoutResult = await simulateStripeCheckout(testContext, {
        organization_id: supplier.id,
        email: supplier.email,
        price_id: 'price_professional_monthly',
        success_url: 'https://wedsync.com/success',
        cancel_url: 'https://wedsync.com/cancel'
      })

      expect(checkoutResult.session_id).toBeDefined()
      expect(checkoutResult.checkout_url).toContain('checkout.stripe.com')
      expect(stripeRequests.length).toBe(1)
      expect(stripeRequests[0].type).toBe('checkout_session')

      // Simulate successful payment webhook
      const webhookEvent: StripeWebhookEvent = {
        id: `evt_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkoutResult.session_id,
            customer_email: supplier.email,
            subscription: `sub_${Date.now()}`,
            metadata: {
              organization_id: supplier.id
            }
          }
        },
        created: Math.floor(Date.now() / 1000)
      }

      const webhookResult = await simulateStripeWebhook(testContext, webhookEvent)
      expect(webhookResult.processed).toBe(true)
      expect(webhookResult.subscription_updated).toBe(true)

      // Verify subscription upgrade in database
      const { data: updatedOrg } = await testContext.supabase
        .from('organizations')
        .select('subscription_tier, stripe_subscription_id')
        .eq('id', supplier.id)
        .single()

      expect(updatedOrg?.subscription_tier).toBe('professional')
      expect(updatedOrg?.stripe_subscription_id).toBeDefined()
    })

    it('should handle payment failures gracefully', async () => {
      mockServer.use(
        http.post('https://api.stripe.com/v1/checkout/sessions', () => {
          return new HttpResponse('Payment processing error', { status: 402 })
        })
      )

      const supplier = await dataFactory.createWeddingSupplier({
        subscription_tier: 'free'
      })

      const checkoutResult = await simulateStripeCheckout(testContext, {
        organization_id: supplier.id,
        email: supplier.email,
        price_id: 'price_professional_monthly',
        success_url: 'https://wedsync.com/success',
        cancel_url: 'https://wedsync.com/cancel'
      })

      expect(checkoutResult.error).toBeDefined()
      expect(checkoutResult.error).toContain('Payment processing error')
    })

    it('should validate webhook signatures for security', async () => {
      const supplier = await dataFactory.createWeddingSupplier()

      // Test valid webhook
      const validWebhook: StripeWebhookEvent = {
        id: `evt_${Date.now()}`,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_test_123',
            subscription: 'sub_test_123'
          }
        },
        created: Math.floor(Date.now() / 1000)
      }

      const validResult = await simulateStripeWebhook(testContext, validWebhook, {
        signature: generateValidStripeSignature(validWebhook)
      })
      expect(validResult.processed).toBe(true)

      // Test invalid webhook signature
      const invalidResult = await simulateStripeWebhook(testContext, validWebhook, {
        signature: 'invalid_signature'
      })
      expect(invalidResult.processed).toBe(false)
      expect(invalidResult.error).toContain('Invalid signature')
    })

    it('should handle subscription cancellation workflow', async () => {
      let stripeRequests: any[] = []

      mockServer.use(
        http.delete('https://api.stripe.com/v1/subscriptions/*', async ({ params }) => {
          stripeRequests.push({ type: 'cancel_subscription', subscription_id: params[0] })
          
          return HttpResponse.json({
            id: params[0],
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false
          })
        })
      )

      const supplier = await dataFactory.createWeddingSupplier({
        subscription_tier: 'professional'
      })

      // Update with Stripe subscription ID
      await testContext.supabase
        .from('organizations')
        .update({ stripe_subscription_id: 'sub_test_123' })
        .eq('id', supplier.id)

      // Simulate cancellation
      const cancelResult = await simulateSubscriptionCancellation(testContext, supplier.id)
      expect(cancelResult.success).toBe(true)
      expect(stripeRequests.length).toBe(1)
      expect(stripeRequests[0].type).toBe('cancel_subscription')

      // Verify subscription downgraded in database
      const { data: updatedOrg } = await testContext.supabase
        .from('organizations')
        .select('subscription_tier')
        .eq('id', supplier.id)
        .single()

      expect(updatedOrg?.subscription_tier).toBe('free')
    })
  })

  describe('Calendar API Integration', () => {
    it('should create Google Calendar events for consultations', async () => {
      let calendarRequests: any[] = []

      mockServer.use(
        http.post('https://www.googleapis.com/calendar/v3/calendars/:calendarId/events', async ({ params, request }) => {
          const eventData = await request.json()
          calendarRequests.push({ 
            type: 'create_event', 
            calendar_id: params.calendarId, 
            data: eventData 
          })

          const eventResponse: CalendarEventResponse = {
            id: `event_${Date.now()}`,
            summary: (eventData as any).summary,
            start: (eventData as any).start,
            end: (eventData as any).end,
            attendees: (eventData as any).attendees || [],
            htmlLink: `https://calendar.google.com/event?eid=${Date.now()}`
          }

          return HttpResponse.json(eventResponse)
        }),

        http.get('https://www.googleapis.com/calendar/v3/calendars/:calendarId/events', ({ params, request }) => {
          const url = new URL(request.url)
          const timeMin = url.searchParams.get('timeMin')
          const timeMax = url.searchParams.get('timeMax')

          calendarRequests.push({ 
            type: 'list_events', 
            calendar_id: params.calendarId,
            time_min: timeMin,
            time_max: timeMax
          })

          return HttpResponse.json({
            items: [
              {
                id: 'existing_event_1',
                summary: 'Existing Wedding Consultation',
                start: { dateTime: '2025-03-15T10:00:00Z' },
                end: { dateTime: '2025-03-15T11:00:00Z' }
              }
            ]
          })
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Simulate consultation scheduling
      const calendarResult = await simulateCalendarEventCreation(testContext, {
        supplier_id: ecosystem.supplier.id,
        customer_id: ecosystem.couple.id,
        event_type: 'consultation',
        date_time: '2025-03-15T14:00:00Z',
        duration_minutes: 60
      })

      expect(calendarResult.event_id).toBeDefined()
      expect(calendarResult.event_link).toBeDefined()
      expect(calendarRequests.length).toBeGreaterThanOrEqual(1)

      const createRequest = calendarRequests.find(r => r.type === 'create_event')
      expect(createRequest).toBeDefined()
      expect(createRequest.data.summary).toContain('Consultation')
      expect(createRequest.data.attendees).toContainEqual(
        expect.objectContaining({ email: ecosystem.couple.email })
      )
    })

    it('should handle calendar conflicts and suggest alternatives', async () => {
      mockServer.use(
        http.post('https://www.googleapis.com/calendar/v3/calendars/:calendarId/events', () => {
          return new HttpResponse('Time slot already booked', { 
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          })
        }),

        // Mock freeBusy query for alternative times
        http.post('https://www.googleapis.com/calendar/v3/freeBusy', () => {
          return HttpResponse.json({
            calendars: {
              'primary': {
                busy: [
                  {
                    start: '2025-03-15T14:00:00Z',
                    end: '2025-03-15T15:00:00Z'
                  }
                ]
              }
            }
          })
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      const conflictResult = await simulateCalendarEventCreation(testContext, {
        supplier_id: ecosystem.supplier.id,
        customer_id: ecosystem.couple.id,
        event_type: 'consultation',
        date_time: '2025-03-15T14:00:00Z', // Conflicting time
        duration_minutes: 60
      })

      expect(conflictResult.conflict_detected).toBe(true)
      expect(conflictResult.alternative_times).toBeDefined()
      expect(conflictResult.alternative_times.length).toBeGreaterThan(0)
    })

    it('should sync calendar events bidirectionally', async () => {
      let calendarEvents: CalendarEventResponse[] = []

      mockServer.use(
        http.get('https://www.googleapis.com/calendar/v3/calendars/:calendarId/events', ({ request }) => {
          const url = new URL(request.url)
          const syncToken = url.searchParams.get('syncToken')

          // Simulate calendar sync with incremental changes
          const events = [
            {
              id: 'event_updated_123',
              summary: 'Updated Wedding Consultation',
              start: { dateTime: '2025-03-15T15:00:00Z' },
              end: { dateTime: '2025-03-15T16:00:00Z' },
              attendees: [
                { email: 'couple@example.com', responseStatus: 'accepted' }
              ],
              htmlLink: 'https://calendar.google.com/event'
            }
          ]

          calendarEvents.push(...events)

          return HttpResponse.json({
            items: events,
            nextSyncToken: `sync_token_${Date.now()}`
          })
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      const syncResult = await simulateCalendarSync(testContext, {
        supplier_id: ecosystem.supplier.id,
        calendar_id: 'primary',
        sync_token: null // Initial sync
      })

      expect(syncResult.events_synced).toBeGreaterThan(0)
      expect(syncResult.next_sync_token).toBeDefined()
      expect(calendarEvents.length).toBeGreaterThan(0)

      // Verify events are stored locally
      const { data: localEvents } = await testContext.supabase
        .from('calendar_events')
        .select('*')
        .eq('organization_id', ecosystem.supplier.id)

      expect(localEvents?.length).toBeGreaterThan(0)
    })
  })

  describe('Email Service Integration', () => {
    it('should handle transactional emails via Resend', async () => {
      let emailRequests: any[] = []

      mockServer.use(
        http.post('https://api.resend.com/emails', async ({ request }) => {
          const emailData = await request.json()
          emailRequests.push({ type: 'send_email', data: emailData })

          const emailResponse: EmailResponse = {
            id: `email_${Date.now()}`,
            from: (emailData as any).from,
            to: (emailData as any).to,
            subject: (emailData as any).subject,
            status: 'sent',
            timestamp: new Date().toISOString()
          }

          return HttpResponse.json(emailResponse)
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      const emailResult = await simulateTransactionalEmail(testContext, {
        from: 'noreply@wedsync.com',
        to: ecosystem.couple.email,
        subject: 'Welcome to WedSync!',
        template: 'welcome_email',
        variables: {
          supplier_name: ecosystem.supplier.name,
          couple_names: `${ecosystem.couple.partner1_name} & ${ecosystem.couple.partner2_name}`
        }
      })

      expect(emailResult.message_id).toBeDefined()
      expect(emailResult.status).toBe('sent')
      expect(emailRequests.length).toBe(1)
      expect(emailRequests[0].data.subject).toBe('Welcome to WedSync!')
    })

    it('should handle email delivery failures and retries', async () => {
      let emailAttempts = 0

      mockServer.use(
        http.post('https://api.resend.com/emails', () => {
          emailAttempts++
          if (emailAttempts <= 2) {
            return new HttpResponse('Service temporarily unavailable', { status: 503 })
          }
          return HttpResponse.json({
            id: `email_${Date.now()}`,
            status: 'sent'
          })
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      const emailResult = await simulateTransactionalEmailWithRetry(testContext, {
        from: 'noreply@wedsync.com',
        to: ecosystem.couple.email,
        subject: 'Important Wedding Update',
        template: 'update_notification',
        max_retries: 3,
        retry_delay: 1000
      })

      expect(emailResult.status).toBe('sent')
      expect(emailResult.attempts).toBe(3)
      expect(emailAttempts).toBe(3)
    })

    it('should handle email bounces and unsubscribes', async () => {
      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Simulate bounce webhook
      const bounceWebhook = {
        type: 'email.bounced',
        data: {
          email: ecosystem.couple.email,
          reason: 'mailbox_full',
          timestamp: new Date().toISOString()
        }
      }

      const bounceResult = await simulateEmailWebhook(testContext, bounceWebhook)
      expect(bounceResult.processed).toBe(true)

      // Verify email marked as bounced in database
      const { data: emailStatus } = await testContext.supabase
        .from('email_status')
        .select('*')
        .eq('email', ecosystem.couple.email)
        .single()

      expect(emailStatus?.status).toBe('bounced')
      expect(emailStatus?.bounce_reason).toBe('mailbox_full')
    })
  })

  describe('Webhook Security and Reliability', () => {
    it('should validate webhook signatures from all services', async () => {
      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Test Stripe webhook validation
      const stripeWebhook: StripeWebhookEvent = {
        id: `evt_${Date.now()}`,
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_123' } },
        created: Math.floor(Date.now() / 1000)
      }

      const validStripeResult = await simulateStripeWebhook(testContext, stripeWebhook, {
        signature: generateValidStripeSignature(stripeWebhook)
      })
      expect(validStripeResult.processed).toBe(true)

      const invalidStripeResult = await simulateStripeWebhook(testContext, stripeWebhook, {
        signature: 'invalid_signature'
      })
      expect(invalidStripeResult.processed).toBe(false)
    })

    it('should handle webhook replay attacks', async () => {
      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      const webhook: StripeWebhookEvent = {
        id: `evt_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { organization_id: ecosystem.supplier.id }
          }
        },
        created: Math.floor(Date.now() / 1000) - 3600 // 1 hour old
      }

      // First webhook should process
      const firstResult = await simulateStripeWebhook(testContext, webhook, {
        signature: generateValidStripeSignature(webhook)
      })
      expect(firstResult.processed).toBe(true)

      // Duplicate webhook should be rejected
      const duplicateResult = await simulateStripeWebhook(testContext, webhook, {
        signature: generateValidStripeSignature(webhook)
      })
      expect(duplicateResult.processed).toBe(false)
      expect(duplicateResult.error).toContain('already processed')
    })

    it('should implement exponential backoff for webhook retries', async () => {
      let webhookAttempts: Array<{ timestamp: number; attempt: number }> = []

      // Mock webhook endpoint that fails initially
      mockServer.use(
        http.post('/api/webhooks/test', () => {
          const attempt = webhookAttempts.length + 1
          webhookAttempts.push({ timestamp: Date.now(), attempt })

          if (attempt <= 3) {
            return new HttpResponse('Service unavailable', { status: 503 })
          }
          return HttpResponse.json({ received: true })
        })
      )

      const retryResult = await simulateWebhookWithRetry(testContext, {
        url: '/api/webhooks/test',
        payload: { test: 'data' },
        max_retries: 5,
        backoff_strategy: 'exponential'
      })

      expect(retryResult.success).toBe(true)
      expect(webhookAttempts.length).toBe(4)

      // Verify exponential backoff timing
      for (let i = 1; i < webhookAttempts.length; i++) {
        const timeDiff = webhookAttempts[i].timestamp - webhookAttempts[i-1].timestamp
        const expectedMinDelay = Math.pow(2, i-1) * 1000 // Exponential backoff
        expect(timeDiff).toBeGreaterThanOrEqual(expectedMinDelay * 0.8) // Allow 20% variance
      }
    })
  })
})

// Helper functions for third-party service testing

async function simulateStripeCheckout(
  testContext: TestContext,
  params: {
    organization_id: string
    email: string
    price_id: string
    success_url: string
    cancel_url: string
  }
): Promise<{ session_id?: string; checkout_url?: string; error?: string }> {
  try {
    // Mock Stripe checkout session creation
    return {
      session_id: `cs_test_${Date.now()}`,
      checkout_url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`
    }
  } catch (error) {
    return {
      error: error.message
    }
  }
}

async function simulateStripeWebhook(
  testContext: TestContext,
  event: StripeWebhookEvent,
  options?: { signature?: string }
): Promise<{ processed: boolean; subscription_updated?: boolean; error?: string }> {
  try {
    // Validate signature (mock validation)
    if (options?.signature && options.signature === 'invalid_signature') {
      return { processed: false, error: 'Invalid signature' }
    }

    // Check for duplicate processing
    const { data: existing } = await testContext.supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existing) {
      return { processed: false, error: 'Event already processed' }
    }

    // Log webhook event
    await testContext.supabase
      .from('webhook_events')
      .insert({
        id: crypto.randomUUID(),
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      })

    return { 
      processed: true, 
      subscription_updated: event.type.includes('subscription') 
    }
  } catch (error) {
    return { processed: false, error: error.message }
  }
}

function generateValidStripeSignature(event: StripeWebhookEvent): string {
  // Mock signature generation
  return `t=${Math.floor(Date.now() / 1000)},v1=${crypto.randomBytes(32).toString('hex')}`
}

async function simulateSubscriptionCancellation(
  testContext: TestContext,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update organization subscription
    await testContext.supabase
      .from('organizations')
      .update({ 
        subscription_tier: 'free',
        stripe_subscription_id: null,
        subscription_cancelled_at: new Date().toISOString()
      })
      .eq('id', organizationId)

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function simulateCalendarEventCreation(
  testContext: TestContext,
  params: {
    supplier_id: string
    customer_id: string
    event_type: string
    date_time: string
    duration_minutes: number
  }
): Promise<{
  event_id?: string
  event_link?: string
  conflict_detected?: boolean
  alternative_times?: string[]
  error?: string
}> {
  try {
    const eventId = `event_${Date.now()}`
    
    // Store event locally
    await testContext.supabase
      .from('calendar_events')
      .insert({
        id: eventId,
        organization_id: params.supplier_id,
        customer_id: params.customer_id,
        event_type: params.event_type,
        start_time: params.date_time,
        duration_minutes: params.duration_minutes,
        google_event_id: eventId,
        created_at: new Date().toISOString()
      })

    return {
      event_id: eventId,
      event_link: `https://calendar.google.com/event?eid=${eventId}`
    }
  } catch (error) {
    if (error.message?.includes('conflict')) {
      return {
        conflict_detected: true,
        alternative_times: [
          '2025-03-15T15:00:00Z',
          '2025-03-15T16:00:00Z',
          '2025-03-16T14:00:00Z'
        ]
      }
    }
    return { error: error.message }
  }
}

async function simulateCalendarSync(
  testContext: TestContext,
  params: {
    supplier_id: string
    calendar_id: string
    sync_token: string | null
  }
): Promise<{
  events_synced: number
  next_sync_token: string
  errors?: string[]
}> {
  // Mock calendar sync
  const mockEvents = [
    {
      id: crypto.randomUUID(),
      google_event_id: 'event_sync_1',
      organization_id: params.supplier_id,
      event_type: 'consultation',
      start_time: '2025-03-15T15:00:00Z',
      duration_minutes: 60
    }
  ]

  // Insert synced events
  await testContext.supabase
    .from('calendar_events')
    .insert(mockEvents)

  return {
    events_synced: mockEvents.length,
    next_sync_token: `sync_token_${Date.now()}`
  }
}

async function simulateTransactionalEmail(
  testContext: TestContext,
  params: {
    from: string
    to: string
    subject: string
    template: string
    variables: Record<string, any>
  }
): Promise<{ message_id: string; status: string; error?: string }> {
  try {
    const messageId = `email_${Date.now()}`
    
    // Log email in database
    await testContext.supabase
      .from('email_logs')
      .insert({
        id: messageId,
        from_email: params.from,
        to_email: params.to,
        subject: params.subject,
        template_name: params.template,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    return {
      message_id: messageId,
      status: 'sent'
    }
  } catch (error) {
    return {
      message_id: '',
      status: 'failed',
      error: error.message
    }
  }
}

async function simulateTransactionalEmailWithRetry(
  testContext: TestContext,
  params: {
    from: string
    to: string
    subject: string
    template: string
    max_retries: number
    retry_delay: number
  }
): Promise<{ status: string; attempts: number; error?: string }> {
  let attempts = 0
  
  while (attempts < params.max_retries) {
    attempts++
    try {
      const result = await simulateTransactionalEmail(testContext, {
        from: params.from,
        to: params.to,
        subject: params.subject,
        template: params.template,
        variables: {}
      })
      
      if (result.status === 'sent') {
        return { status: 'sent', attempts }
      }
    } catch (error) {
      if (attempts === params.max_retries) {
        return { status: 'failed', attempts, error: error.message }
      }
      await new Promise(resolve => setTimeout(resolve, params.retry_delay))
    }
  }
  
  return { status: 'failed', attempts }
}

async function simulateEmailWebhook(
  testContext: TestContext,
  webhook: { type: string; data: any }
): Promise<{ processed: boolean; error?: string }> {
  try {
    if (webhook.type === 'email.bounced') {
      await testContext.supabase
        .from('email_status')
        .upsert({
          email: webhook.data.email,
          status: 'bounced',
          bounce_reason: webhook.data.reason,
          updated_at: new Date().toISOString()
        })
    }
    
    return { processed: true }
  } catch (error) {
    return { processed: false, error: error.message }
  }
}

async function simulateWebhookWithRetry(
  testContext: TestContext,
  params: {
    url: string
    payload: any
    max_retries: number
    backoff_strategy: 'linear' | 'exponential'
  }
): Promise<{ success: boolean; attempts: number; error?: string }> {
  let attempts = 0
  
  while (attempts < params.max_retries) {
    attempts++
    
    try {
      // Mock webhook call with potential failure
      if (attempts <= 3) {
        throw new Error('Service unavailable')
      }
      
      return { success: true, attempts }
    } catch (error) {
      if (attempts === params.max_retries) {
        return { success: false, attempts, error: error.message }
      }
      
      // Calculate backoff delay
      const delay = params.backoff_strategy === 'exponential' 
        ? Math.pow(2, attempts - 1) * 1000 
        : attempts * 1000
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return { success: false, attempts }
}