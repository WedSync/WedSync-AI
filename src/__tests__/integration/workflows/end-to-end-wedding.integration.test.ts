import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { testSupabase, testCleanup, testDataFactory, integrationHelpers, mockServer } from '../../../../tests/integration/setup'

// WS-092: End-to-End Wedding Planning Workflow Integration Tests
// Critical for ensuring complete wedding planning workflows function correctly
const app = next({ dev: false })
const handle = app.getRequestHandler()
describe('End-to-End Wedding Planning Workflows', () => {
  let server: any
  let plannerSession: any
  let clientSession: any
  let vendorSession: any
  beforeEach(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })
    // Create authenticated sessions for all user types
    const plannerAuth = await integrationHelpers.createAuthenticatedContext('planner@wedsync.com')
    const clientAuth = await integrationHelpers.createAuthenticatedContext('client@wedsync.com')
    const vendorAuth = await integrationHelpers.createAuthenticatedContext('vendor@wedsync.com')
    
    plannerSession = plannerAuth.session
    clientSession = clientAuth.session
    vendorSession = vendorAuth.session
  })
  afterEach(async () => {
    await testCleanup.clearTestData()
    if (server) {
      server.close()
    }
  describe('Complete Client Onboarding to Wedding Day Workflow', () => {
    it('should handle complete wedding planning lifecycle', async () => {
      // Step 1: Planner creates new client
      const clientData = {
        email: 'newcouple@example.com',
        first_name: 'John',
        last_name: 'Smith',
        partner_first_name: 'Jane',
        partner_last_name: 'Doe',
        wedding_date: '2025-10-15',
        venue: 'Sunset Gardens',
        guest_count: 150,
        budget: 50000,
      }
      const clientResponse = await request(server)
        .post('/api/clients')
        .set('Authorization', `Bearer ${plannerSession.access_token}`)
        .send(clientData)
        .expect(201)
      const clientId = clientResponse.body.client.id
      expect(clientId).toBeTruthy()
      // Step 2: Create wedding planning journey
      const journeyResponse = await request(server)
        .post('/api/journeys')
        .send({
          client_id: clientId,
          template: 'full_service_wedding',
          customizations: {
            include_destination: false,
            priority_vendors: ['photographer', 'florist', 'catering'],
          }
        })
      const journeyId = journeyResponse.body.journey.id
      expect(journeyId).toBeTruthy()
      // Step 3: Search and book vendors
      const vendorSearchResponse = await request(server)
        .get('/api/vendors/search')
        .query({
          category: 'photographer',
          wedding_date: '2025-10-15',
          budget_max: 5000,
        .expect(200)
      expect(vendorSearchResponse.body.vendors.length).toBeGreaterThan(0)
      const selectedVendor = vendorSearchResponse.body.vendors[0]
      // Book vendor
      const bookingResponse = await request(server)
        .post(`/api/vendors/${selectedVendor.id}/book`)
          service_date: '2025-10-15',
          services_requested: ['wedding photography', '8 hours coverage'],
          package_selected: 'premium',
          total_amount: 4500,
      const bookingId = bookingResponse.body.booking.id
      // Step 4: Send save the dates
      const saveTheDateResponse = await request(server)
        .post('/api/communications/send')
          template: 'save_the_date',
          recipients: 'all_guests',
          channel: 'email',
          personalization: {
            venue_name: 'Sunset Gardens',
            wedding_date: '2025-10-15',
      expect(saveTheDateResponse.body.sent_count).toBeGreaterThan(0)
      // Step 5: Manage guest list
      const guestData = [
        { first_name: 'Alice', last_name: 'Johnson', email: 'alice@example.com', side: 'bride' },
        { first_name: 'Bob', last_name: 'Wilson', email: 'bob@example.com', side: 'groom' },
        { first_name: 'Carol', last_name: 'Davis', email: 'carol@example.com', side: 'bride' },
      ]
      const guestResponse = await request(server)
        .post('/api/guests/bulk')
          guests: guestData,
      expect(guestResponse.body.created).toBe(3)
      // Step 6: Process RSVPs
      const rsvpToken = 'mock-rsvp-token'
      const rsvpResponse = await request(server)
        .post('/api/rsvp/respond')
          token: rsvpToken,
          guest_id: guestResponse.body.guests[0].id,
          attending: true,
          meal_choice: 'vegetarian',
          dietary_restrictions: 'nut allergy',
          plus_one: true,
          plus_one_name: 'David Johnson',
      expect(rsvpResponse.body.success).toBe(true)
      // Step 7: Track budget and payments
      const paymentResponse = await request(server)
        .post('/api/payments')
          booking_id: bookingId,
          amount: 1000,
          type: 'deposit',
          payment_method: 'credit_card',
      expect(paymentResponse.body.payment.status).toBe('completed')
      // Step 8: Generate timeline for wedding day
      const timelineResponse = await request(server)
        .post('/api/timeline/generate')
          ceremony_time: '16:00',
          reception_time: '18:00',
      expect(timelineResponse.body.timeline.items.length).toBeGreaterThan(0)
      // Step 9: Final vendor confirmations
      const confirmationResponse = await request(server)
        .post('/api/vendors/confirm-all')
      expect(confirmationResponse.body.confirmed_count).toBeGreaterThan(0)
      // Step 10: Verify complete wedding setup
      const weddingStatusResponse = await request(server)
        .get(`/api/clients/${clientId}/wedding-status`)
      expect(weddingStatusResponse.body).toMatchObject({
        client_ready: true,
        vendors_confirmed: true,
        guest_list_finalized: true,
        timeline_complete: true,
        payments_on_track: true,
        ready_for_wedding: true,
      })
    it('should handle wedding postponement workflow', async () => {
      // Create client with upcoming wedding
      const { data: client } = await testSupabase.from('clients').insert(
        testDataFactory.createClient({
          wedding_date: '2025-06-15',
          status: 'active',
      ).select().single()
      // Create bookings
      const vendors = Array.from({ length: 3 }, () => testDataFactory.createVendor())
      const { data: insertedVendors } = await testSupabase.from('vendors').insert(vendors).select()
      
      const bookings = insertedVendors.map(vendor => ({
        client_id: client.id,
        vendor_id: vendor.id,
        service_date: '2025-06-15',
        status: 'confirmed',
      }))
      await testSupabase.from('vendor_bookings').insert(bookings)
      // Postpone wedding
      const postponeResponse = await request(server)
        .post(`/api/clients/${client.id}/postpone`)
          new_date: '2025-11-20',
          reason: 'venue_unavailable',
          notify_vendors: true,
          notify_guests: true,
      expect(postponeResponse.body).toMatchObject({
        success: true,
        updates: {
          client_updated: true,
          vendors_notified: 3,
          guests_notified: expect.any(Number),
          timeline_adjusted: true,
        }
      // Verify all bookings updated
      const updatedBookings = await integrationHelpers.verifyDatabaseState('vendor_bookings', {
      updatedBookings.forEach(booking => {
        expect(booking.service_date).toBe('2025-11-20')
        expect(booking.status).toBe('pending_reconfirmation')
      // Verify notifications sent
      const notifications = await integrationHelpers.verifyDatabaseState('notifications', {
        type: 'wedding_postponed',
      expect(notifications.length).toBeGreaterThan(0)
  describe('Vendor Portal Integration Workflow', () => {
    it('should handle vendor onboarding to service delivery', async () => {
      // Step 1: Vendor registration
      const vendorData = {
        business_name: 'Premium Photography Studio',
        contact_name: 'Mike Johnson',
        contact_email: 'mike@premiumphotos.com',
        category: 'photographer',
        services: ['wedding photography', 'engagement sessions', 'photo albums'],
        pricing: {
          packages: [
            { name: 'Basic', price: 2500, hours: 6 },
            { name: 'Premium', price: 4500, hours: 10 },
            { name: 'Luxury', price: 7000, hours: 12 },
          ]
      const vendorResponse = await request(server)
        .post('/api/vendor-portal/register')
        .send(vendorData)
      const vendorId = vendorResponse.body.vendor.id
      // Step 2: Vendor verification
      const verificationResponse = await request(server)
        .post(`/api/admin/vendors/${vendorId}/verify`)
          insurance_verified: true,
          portfolio_reviewed: true,
          references_checked: true,
      expect(verificationResponse.body.vendor.status).toBe('verified')
      // Step 3: Vendor receives booking request
        testDataFactory.createClient()
      const bookingRequestResponse = await request(server)
        .post(`/api/vendor-portal/bookings/requests`)
        .set('Authorization', `Bearer ${vendorSession.access_token}`)
          client_id: client.id,
          service_date: '2025-09-20',
          package: 'Premium',
      const requestId = bookingRequestResponse.body.request.id
      // Step 4: Vendor responds to booking
      const bookingResponseData = await request(server)
        .put(`/api/vendor-portal/bookings/requests/${requestId}`)
          action: 'accept',
          custom_quote: 4200,
          notes: 'Happy to work with you! Small discount applied.',
      expect(bookingResponseData.body.booking.status).toBe('accepted')
      // Step 5: Contract generation and signing
      const contractResponse = await request(server)
        .post(`/api/vendor-portal/contracts`)
          booking_id: bookingResponseData.body.booking.id,
          terms: {
            deposit: 1000,
            final_payment: 3200,
            cancellation_policy: 'standard',
      expect(contractResponse.body.contract.status).toBe('pending_signatures')
      // Step 6: Service delivery tracking
      const deliveryUpdateResponse = await request(server)
        .put(`/api/vendor-portal/bookings/${bookingResponseData.body.booking.id}/progress`)
          milestone: 'engagement_session_complete',
          notes: 'Beautiful session at the park',
          deliverables: [
            { type: 'photos', count: 50, status: 'delivered' }
      expect(deliveryUpdateResponse.body.progress.completed_milestones).toContain('engagement_session_complete')
      // Step 7: Review and rating
      const reviewResponse = await request(server)
        .post(`/api/vendors/${vendorId}/reviews`)
        .set('Authorization', `Bearer ${clientSession.access_token}`)
          rating: 5,
          review: 'Amazing photographer! Highly recommended.',
          would_recommend: true,
      expect(reviewResponse.body.review.rating).toBe(5)
      // Verify vendor rating updated
      const vendorProfile = await integrationHelpers.verifyDatabaseState('vendors', {
        id: vendorId,
      expect(vendorProfile[0].average_rating).toBeGreaterThanOrEqual(4.5)
  describe('Communication and Notification Workflow', () => {
    it('should handle multi-channel communication workflow', async () => {
      // Setup client with guests
      const guests = Array.from({ length: 10 }, (_, i) => 
        testDataFactory.createGuest(client.id, {
          email: `guest${i}@example.com`,
          phone: `+123456789${i}`,
      )
      await testSupabase.from('guest_lists').insert(guests)
      // Step 1: Send email campaign
      const emailCampaignResponse = await request(server)
        .post('/api/communications/campaigns')
          name: 'Save the Date',
          recipients: {
            segments: ['all_guests'],
          },
          schedule: {
            send_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      const campaignId = emailCampaignResponse.body.campaign.id
      // Step 2: Add SMS follow-up
      const smsCampaignResponse = await request(server)
          name: 'RSVP Reminder',
          channel: 'sms',
          template: 'rsvp_reminder',
            segments: ['no_response'],
          parent_campaign_id: campaignId,
          trigger: {
            type: 'days_after_parent',
            days: 7,
      // Step 3: Track engagement
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for async processing
      const engagementResponse = await request(server)
        .get(`/api/communications/campaigns/${campaignId}/analytics`)
      expect(engagementResponse.body).toMatchObject({
        campaign_id: campaignId,
        metrics: {
          sent: expect.any(Number),
          delivered: expect.any(Number),
          opened: expect.any(Number),
          clicked: expect.any(Number),
          responded: expect.any(Number),
      // Step 4: Handle unsubscribe
      const unsubscribeToken = 'mock-unsubscribe-token'
      const unsubscribeResponse = await request(server)
        .post('/api/communications/unsubscribe')
          token: unsubscribeToken,
          reason: 'no_longer_attending',
      expect(unsubscribeResponse.body.success).toBe(true)
      // Step 5: WhatsApp integration for urgent updates
      const whatsappResponse = await request(server)
        .post('/api/communications/whatsapp/broadcast')
          message: 'Important: Ceremony time changed to 4:30 PM',
            segments: ['wedding_party', 'immediate_family'],
          priority: 'high',
      expect(whatsappResponse.body.sent_count).toBeGreaterThan(0)
  describe('Budget and Payment Tracking Workflow', () => {
    it('should handle complete budget management lifecycle', async () => {
      // Create client with budget
      const { data: client } = await testSupabase.from('clients').insert({
        ...testDataFactory.createClient(),
      }).select().single()
      // Step 1: Setup budget categories
      const budgetSetupResponse = await request(server)
        .post('/api/budget/setup')
          categories: [
            { name: 'Venue', percentage: 30, amount: 15000 },
            { name: 'Catering', percentage: 25, amount: 12500 },
            { name: 'Photography', percentage: 10, amount: 5000 },
            { name: 'Flowers', percentage: 8, amount: 4000 },
            { name: 'Music', percentage: 7, amount: 3500 },
            { name: 'Attire', percentage: 10, amount: 5000 },
            { name: 'Miscellaneous', percentage: 10, amount: 5000 },
      expect(budgetSetupResponse.body.categories).toHaveLength(7)
      // Step 2: Track expenses
      const expenses = [
        { category: 'Venue', vendor: 'Sunset Gardens', amount: 14500, status: 'paid' },
        { category: 'Photography', vendor: 'Premium Photos', amount: 4500, status: 'deposit_paid', deposit: 1000 },
        { category: 'Catering', vendor: 'Gourmet Catering', amount: 13000, status: 'quoted' },
      for (const expense of expenses) {
        await request(server)
          .post('/api/budget/expenses')
          .set('Authorization', `Bearer ${plannerSession.access_token}`)
          .send({
            client_id: client.id,
            ...expense,
          })
          .expect(201)
      // Step 3: Get budget status
      const budgetStatusResponse = await request(server)
        .get(`/api/budget/${client.id}/status`)
      expect(budgetStatusResponse.body).toMatchObject({
        total_budget: 50000,
        total_allocated: 50000,
        total_spent: 15500,
        total_committed: 32000,
        remaining: 18000,
        categories: expect.arrayContaining([
          expect.objectContaining({
            name: 'Venue',
            allocated: 15000,
            spent: 14500,
            remaining: 500,
            status: 'on_track',
        ])
      // Step 4: Payment schedule management
      const paymentScheduleResponse = await request(server)
        .post('/api/payments/schedule')
          payments: [
            { vendor: 'Photography', amount: 1750, due_date: '2025-07-01', type: 'second_payment' },
            { vendor: 'Photography', amount: 1750, due_date: '2025-10-01', type: 'final_payment' },
            { vendor: 'Catering', amount: 3250, due_date: '2025-06-01', type: 'deposit' },
            { vendor: 'Catering', amount: 9750, due_date: '2025-10-01', type: 'final_payment' },
      expect(paymentScheduleResponse.body.scheduled_payments).toHaveLength(4)
      // Step 5: Payment reminders
      const remindersResponse = await request(server)
        .get(`/api/payments/reminders`)
          days_ahead: 30,
      expect(remindersResponse.body.upcoming_payments).toBeDefined()
      expect(remindersResponse.body.total_due_30_days).toBeGreaterThan(0)
      // Step 6: Budget optimization suggestions
      const optimizationResponse = await request(server)
        .get(`/api/budget/${client.id}/optimize`)
      expect(optimizationResponse.body).toMatchObject({
        suggestions: expect.arrayContaining([
            category: expect.any(String),
            potential_savings: expect.any(Number),
            recommendation: expect.any(String),
  describe('Journey Execution and Analytics Workflow', () => {
    it('should track and analyze complete journey execution', async () => {
      // Create client and journey
          name: 'Full Service Wedding Journey',
          steps: [
            { name: 'Initial Consultation', duration_days: 1 },
            { name: 'Venue Selection', duration_days: 14 },
            { name: 'Vendor Booking', duration_days: 30 },
            { name: 'Guest List Creation', duration_days: 7 },
            { name: 'Send Invitations', duration_days: 1 },
            { name: 'RSVP Collection', duration_days: 30 },
            { name: 'Final Details', duration_days: 14 },
            { name: 'Wedding Day', duration_days: 1 },
      // Execute journey steps
      const steps = journeyResponse.body.journey.steps
      for (let i = 0; i < steps.length - 1; i++) {
        // Complete step
          .put(`/api/journeys/${journeyId}/steps/${steps[i].id}`)
            status: 'completed',
            completion_data: {
              notes: `Step ${i + 1} completed successfully`,
              metrics: {
                time_taken_hours: Math.floor(Math.random() * 10) + 1,
                client_satisfaction: Math.floor(Math.random() * 2) + 4,
              }
            }
          .expect(200)
        // Add delay to simulate real workflow
        await new Promise(resolve => setTimeout(resolve, 100))
      // Get journey analytics
      const analyticsResponse = await request(server)
        .get(`/api/journeys/${journeyId}/analytics`)
      expect(analyticsResponse.body).toMatchObject({
        journey_id: journeyId,
        completion_rate: expect.any(Number),
        average_step_duration: expect.any(Number),
        bottlenecks: expect.any(Array),
        client_engagement: expect.objectContaining({
          messages_sent: expect.any(Number),
          response_rate: expect.any(Number),
          satisfaction_score: expect.any(Number),
        }),
        predictions: expect.objectContaining({
          estimated_completion_date: expect.any(String),
          risk_factors: expect.any(Array),
      // Test conditional branching
      const branchingResponse = await request(server)
        .post(`/api/journeys/${journeyId}/branch`)
          condition: 'budget_exceeded',
          branch_to: 'budget_optimization_flow',
          data: {
            current_budget: 50000,
            current_spend: 55000,
      expect(branchingResponse.body.new_branch).toBeTruthy()
      expect(branchingResponse.body.new_steps).toContain('Budget Review')
})
