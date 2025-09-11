import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { testSupabase, testCleanup, testDataFactory, integrationHelpers, mockServer } from '../../../../tests/integration/setup'

// WS-092: Vendor Management API Integration Tests
// Critical for vendor-client relationship workflows
const app = next({ dev: false })
const handle = app.getRequestHandler()
describe('Vendor Management API Integration', () => {
  let server: any
  let authenticatedSession: any
  let testVendor: any
  let testClient: any
  beforeEach(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })
    
    // Create authenticated context
    const authContext = await integrationHelpers.createAuthenticatedContext('test-vendor@wedsync.com')
    authenticatedSession = authContext.session
    // Create test data
    testVendor = testDataFactory.createVendor({
      business_name: 'Test Photography Studio',
      category: 'photographer',
      contact_email: 'photo@example.com',
    testClient = testDataFactory.createClient({
      email: 'bride@example.com',
      wedding_date: '2025-09-15',
  })
  afterEach(async () => {
    await testCleanup.clearTestData()
    if (server) {
      server.close()
    }
  describe('POST /api/vendors - Vendor Registration Workflow', () => {
    it('should register a new vendor with complete validation', async () => {
      const vendorData = {
        business_name: 'Elegant Events Co.',
        contact_name: 'Sarah Johnson',
        contact_email: 'sarah@elegantevents.com',
        phone: '+1234567890',
        category: 'wedding_planner',
        services: ['full planning', 'day-of coordination', 'partial planning'],
        pricing_range: { min: 5000, max: 25000 },
        portfolio_url: 'https://elegantevents.com/portfolio',
        insurance: true,
        license_number: 'WP-2024-12345',
      }
      const response = await request(server)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${authenticatedSession.access_token}`)
        .send(vendorData)
        .expect('Content-Type', /json/)
        .expect(201)
      expect(response.body).toMatchObject({
        success: true,
        vendor: expect.objectContaining({
          id: expect.any(String),
          business_name: vendorData.business_name,
          contact_email: vendorData.contact_email,
          category: vendorData.category,
          status: 'pending_verification',
          services: vendorData.services,
        })
      })
      // Verify database state
      const dbVendor = await integrationHelpers.verifyDatabaseState('vendors', {
        contact_email: vendorData.contact_email
      expect(dbVendor).toHaveLength(1)
      expect(dbVendor[0].status).toBe('pending_verification')
      // Verify notification was sent
      await integrationHelpers.waitFor(async () => {
        const notifications = await integrationHelpers.verifyDatabaseState('notifications', {
          recipient_email: vendorData.contact_email,
          type: 'vendor_registration'
        return notifications.length > 0
      }, 5000)
    it('should validate vendor category restrictions', async () => {
      const invalidVendor = {
        ...testVendor,
        category: 'invalid_category',
        .send(invalidVendor)
        .expect(400)
        success: false,
        error: expect.stringContaining('Invalid vendor category'),
    it('should prevent duplicate vendor registrations', async () => {
      // Create initial vendor
      await request(server)
        .send(testVendor)
      // Attempt duplicate
        error: expect.stringContaining('already registered'),
  describe('GET /api/vendors/search - Vendor Discovery Integration', () => {
    beforeEach(async () => {
      // Create multiple vendors for search testing
      const vendors = [
        testDataFactory.createVendor({
          business_name: 'Luxury Flowers',
          category: 'florist',
          services: ['bridal bouquets', 'ceremony flowers'],
          pricing_range: { min: 2000, max: 8000 },
        }),
          business_name: 'Budget Blooms',
          services: ['bouquets', 'centerpieces'],
          pricing_range: { min: 500, max: 2000 },
          business_name: 'Elite Photography',
          category: 'photographer',
          services: ['wedding photography', 'engagement sessions'],
          pricing_range: { min: 3000, max: 10000 },
      ]
      for (const vendor of vendors) {
        await testSupabase.from('vendors').insert(vendor)
    it('should search vendors by category and price range', async () => {
        .get('/api/vendors/search')
        .query({
          price_min: 1000,
          price_max: 5000,
        .expect(200)
      expect(response.body.success).toBe(true)
      expect(response.body.vendors).toHaveLength(1)
      expect(response.body.vendors[0].business_name).toBe('Budget Blooms')
    it('should filter by availability for wedding date', async () => {
      const weddingDate = '2025-10-15'
      
      // Mark one vendor as unavailable for that date
      await testSupabase.from('vendor_availability').insert({
        vendor_id: (await testSupabase.from('vendors').select('id').eq('business_name', 'Luxury Flowers').single()).data.id,
        date: weddingDate,
        available: false,
          wedding_date: weddingDate,
    it('should rank vendors by reviews and ratings', async () => {
      // Add reviews to vendors
      const vendors = await testSupabase.from('vendors').select('id, business_name').eq('category', 'florist')
      for (const vendor of vendors.data) {
        const rating = vendor.business_name === 'Luxury Flowers' ? 4.8 : 3.5
        await testSupabase.from('vendor_reviews').insert({
          vendor_id: vendor.id,
          client_id: testClient.id,
          rating,
          review: 'Great service',
          sort_by: 'rating',
      expect(response.body.vendors[0].business_name).toBe('Luxury Flowers')
      expect(response.body.vendors[0].average_rating).toBeGreaterThan(4.0)
  describe('POST /api/vendors/[id]/book - Vendor Booking Workflow', () => {
    let vendorId: string
    let clientId: string
      // Create vendor and client
      const { data: vendor } = await testSupabase.from('vendors').insert(testVendor).select().single()
      const { data: client } = await testSupabase.from('clients').insert(testClient).select().single()
      vendorId = vendor.id
      clientId = client.id
    it('should complete full vendor booking workflow', async () => {
      const bookingData = {
        client_id: clientId,
        service_date: '2025-09-15',
        services_requested: ['wedding photography', 'engagement session'],
        estimated_hours: 8,
        special_requests: 'Golden hour photos required',
        package_selected: 'premium',
        .post(`/api/vendors/${vendorId}/book`)
        .send(bookingData)
        booking: expect.objectContaining({
          vendor_id: vendorId,
          client_id: clientId,
          status: 'pending_confirmation',
          service_date: bookingData.service_date,
      // Verify booking created in database
      const dbBooking = await integrationHelpers.verifyDatabaseState('vendor_bookings', {
        vendor_id: vendorId,
      expect(dbBooking).toHaveLength(1)
      // Verify notification sent to vendor
          recipient_id: vendorId,
          type: 'booking_request',
      // Verify calendar event created
      const calendarEvents = await integrationHelpers.verifyDatabaseState('calendar_events', {
        date: bookingData.service_date,
      expect(calendarEvents).toHaveLength(1)
    it('should prevent double booking for same date', async () => {
        services_requested: ['wedding photography'],
      // Create first booking
      // Attempt second booking for same date
      const secondClient = testDataFactory.createClient({ email: 'another@example.com' })
      const { data: client2 } = await testSupabase.from('clients').insert(secondClient).select().single()
        .send({ ...bookingData, client_id: client2.id })
        .expect(409)
        error: expect.stringContaining('not available'),
    it('should validate booking within vendor service area', async () => {
      // Set vendor service area
      await testSupabase.from('vendors').update({
        service_area: {
          radius_miles: 50,
          center_lat: 40.7128,
          center_lng: -74.0060,
        }
      }).eq('id', vendorId)
      // Client with venue outside service area
      const farAwayClient = {
        ...testClient,
        venue_lat: 34.0522, // Los Angeles
        venue_lng: -118.2437,
        .send({
          service_date: '2025-09-15',
          venue_location: farAwayClient,
        error: expect.stringContaining('outside service area'),
  describe('PUT /api/vendors/[id]/booking/[bookingId] - Booking Status Updates', () => {
    let bookingId: string
      // Create vendor, client, and booking
      const { data: booking } = await testSupabase.from('vendor_bookings').insert({
        status: 'pending_confirmation',
      }).select().single()
      bookingId = booking.id
    it('should confirm booking and trigger contract generation', async () => {
        .put(`/api/vendors/${vendorId}/booking/${bookingId}`)
          status: 'confirmed',
          contract_terms: {
            total_amount: 5000,
            deposit_amount: 1000,
            payment_schedule: 'deposit_on_signing',
          }
      // Verify contract was generated
        const contracts = await integrationHelpers.verifyDatabaseState('contracts', {
          booking_id: bookingId,
        return contracts.length > 0 && contracts[0].status === 'pending_signature'
      // Verify payment request created
      const payments = await integrationHelpers.verifyDatabaseState('payment_requests', {
        booking_id: bookingId,
        amount: 1000,
      expect(payments).toHaveLength(1)
    it('should handle booking cancellation with proper cleanup', async () => {
          status: 'cancelled',
          cancellation_reason: 'Client requested different date',
      // Verify calendar event removed
      expect(calendarEvents).toHaveLength(0)
      // Verify notification sent to client
          recipient_id: clientId,
          type: 'booking_cancelled',
})
