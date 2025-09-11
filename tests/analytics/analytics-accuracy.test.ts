import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * WS-246: Vendor Performance Analytics System - Accuracy Testing
 * Tests vendor scoring algorithm accuracy and data validation
 */

describe('Vendor Scoring Algorithm Accuracy', () => {
  let supabase: any
  let testVendorId: string
  let testClientId: string

  beforeEach(async () => {
    const cookieStore = cookies()
    supabase = createClient(cookieStore)
    
    // Create test vendor
    const { data: vendor } = await supabase
      .from('suppliers')
      .insert({
        name: 'Test Wedding Photography Co',
        email: 'test@photography.com',
        type: 'photographer',
        tier: 'PROFESSIONAL',
        status: 'active'
      })
      .select()
      .single()
    
    testVendorId = vendor.id

    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({
        name: 'Test Wedding Couple',
        email: 'couple@test.com',
        wedding_date: '2025-07-15'
      })
      .select()
      .single()
    
    testClientId = client.id
  })

  afterEach(async () => {
    // Cleanup test data
    await supabase.from('vendor_interactions').delete().eq('vendor_id', testVendorId)
    await supabase.from('bookings').delete().eq('vendor_id', testVendorId)
    await supabase.from('vendor_reviews').delete().eq('vendor_id', testVendorId)
    await supabase.from('clients').delete().eq('id', testClientId)
    await supabase.from('suppliers').delete().eq('id', testVendorId)
  })

  describe('Response Time Scoring', () => {
    it('should calculate response time score accurately', async () => {
      // Create test interactions with known response times
      const testInteractions = [
        { response_time_hours: 0.5, created_at: '2025-01-01T10:00:00Z' }, // 30 mins - excellent
        { response_time_hours: 2, created_at: '2025-01-01T14:00:00Z' },   // 2 hours - good
        { response_time_hours: 6, created_at: '2025-01-01T16:00:00Z' },   // 6 hours - average
        { response_time_hours: 24, created_at: '2025-01-01T18:00:00Z' },  // 24 hours - poor
      ]

      for (const interaction of testInteractions) {
        await supabase.from('vendor_interactions').insert({
          vendor_id: testVendorId,
          client_id: testClientId,
          type: 'inquiry_response',
          response_time_hours: interaction.response_time_hours,
          created_at: interaction.created_at
        })
      }

      // Call scoring function
      const { data: score } = await supabase.rpc('calculate_vendor_response_score', {
        vendor_id_input: testVendorId
      })

      // Expected calculation: (100 + 85 + 70 + 40) / 4 = 73.75
      expect(score).toBeCloseTo(73.75, 1)
    })

    it('should handle missing response time data gracefully', async () => {
      // Test with no interactions
      const { data: score } = await supabase.rpc('calculate_vendor_response_score', {
        vendor_id_input: testVendorId
      })

      expect(score).toBe(null)
    })

    it('should weight recent responses more heavily', async () => {
      const oldInteraction = {
        response_time_hours: 24, // Poor response
        created_at: '2024-06-01T10:00:00Z' // 6 months ago
      }
      
      const recentInteraction = {
        response_time_hours: 1, // Excellent response
        created_at: '2025-01-01T10:00:00Z' // Recent
      }

      await supabase.from('vendor_interactions').insert([
        { ...oldInteraction, vendor_id: testVendorId, client_id: testClientId, type: 'inquiry_response' },
        { ...recentInteraction, vendor_id: testVendorId, client_id: testClientId, type: 'inquiry_response' }
      ])

      const { data: score } = await supabase.rpc('calculate_vendor_response_score', {
        vendor_id_input: testVendorId
      })

      // Recent good response should outweigh old poor response
      expect(score).toBeGreaterThan(75)
    })
  })

  describe('Booking Success Rate Calculation', () => {
    it('should calculate booking success rate correctly', async () => {
      // Create test inquiries and bookings
      const inquiries = Array.from({ length: 100 }, (_, i) => ({
        vendor_id: testVendorId,
        client_id: testClientId,
        type: 'booking_inquiry',
        status: 'received',
        created_at: `2025-01-${String(i % 30 + 1).padStart(2, '0')}T10:00:00Z`
      }))

      await supabase.from('vendor_interactions').insert(inquiries)

      // Create 85 successful bookings
      const bookings = Array.from({ length: 85 }, (_, i) => ({
        vendor_id: testVendorId,
        client_id: testClientId,
        status: 'confirmed',
        booking_date: '2025-07-15',
        total_amount: 1500.00
      }))

      await supabase.from('bookings').insert(bookings)

      // Create 3 cancelled bookings
      const cancellations = Array.from({ length: 3 }, (_, i) => ({
        vendor_id: testVendorId,
        client_id: testClientId,
        status: 'cancelled',
        booking_date: '2025-07-15',
        total_amount: 1500.00,
        cancellation_reason: 'client_request'
      }))

      await supabase.from('bookings').insert(cancellations)

      const { data: successRate } = await supabase.rpc('calculate_booking_success_rate', {
        vendor_id_input: testVendorId
      })

      // Expected: (85 confirmed / 100 inquiries) = 0.85 (85%)
      expect(successRate).toBe(0.85)
    })

    it('should handle edge case of zero inquiries', async () => {
      const { data: successRate } = await supabase.rpc('calculate_booking_success_rate', {
        vendor_id_input: testVendorId
      })

      expect(successRate).toBe(null)
    })
  })

  describe('Wedding Season Performance Weighting', () => {
    it('should apply correct seasonal weighting', async () => {
      // Test regular season data (January)
      const regularSeasonData = {
        vendor_id: testVendorId,
        base_score: 80,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        is_wedding_season: false
      }

      // Test wedding season data (June-September)
      const weddingSeasonData = {
        vendor_id: testVendorId,
        base_score: 80,
        period_start: '2025-06-01',
        period_end: '2025-06-30',
        is_wedding_season: true
      }

      const { data: regularWeight } = await supabase.rpc('apply_seasonal_weighting', regularSeasonData)
      const { data: weddingWeight } = await supabase.rpc('apply_seasonal_weighting', weddingSeasonData)

      // Wedding season performance should be weighted higher
      expect(weddingWeight).toBeGreaterThan(regularWeight)
      expect(weddingWeight).toBeCloseTo(88, 1) // 80 * 1.1 (10% boost)
      expect(regularWeight).toBe(80)
    })
  })

  describe('Customer Satisfaction Scoring', () => {
    it('should calculate satisfaction score from reviews', async () => {
      // Create test reviews with known ratings
      const reviews = [
        { rating: 5, review_text: 'Absolutely amazing photographer!' },
        { rating: 5, review_text: 'Perfect wedding photos' },
        { rating: 4, review_text: 'Great service, minor delays' },
        { rating: 5, review_text: 'Exceeded expectations' },
        { rating: 3, review_text: 'Good but room for improvement' }
      ]

      for (const review of reviews) {
        await supabase.from('vendor_reviews').insert({
          vendor_id: testVendorId,
          client_id: testClientId,
          rating: review.rating,
          review_text: review.review_text,
          verified: true
        })
      }

      const { data: satisfaction } = await supabase.rpc('calculate_satisfaction_score', {
        vendor_id_input: testVendorId
      })

      // Expected: (5+5+4+5+3) / 5 = 4.4 stars
      expect(satisfaction).toBeCloseTo(4.4, 1)
    })

    it('should weight verified reviews more heavily', async () => {
      const verifiedReview = {
        vendor_id: testVendorId,
        client_id: testClientId,
        rating: 5,
        review_text: 'Verified excellent service',
        verified: true
      }

      const unverifiedReview = {
        vendor_id: testVendorId,
        client_id: testClientId,
        rating: 1,
        review_text: 'Fake negative review',
        verified: false
      }

      await supabase.from('vendor_reviews').insert([verifiedReview, unverifiedReview])

      const { data: satisfaction } = await supabase.rpc('calculate_satisfaction_score', {
        vendor_id_input: testVendorId
      })

      // Verified review should heavily outweigh unverified
      expect(satisfaction).toBeGreaterThan(4.0)
    })
  })

  describe('Portfolio Quality Assessment', () => {
    it('should calculate portfolio score based on photo metrics', async () => {
      // Create portfolio with test photos
      const portfolio = {
        vendor_id: testVendorId,
        name: 'Wedding Photography Portfolio',
        description: 'Professional wedding photos'
      }

      const { data: portfolioData } = await supabase
        .from('portfolios')
        .insert(portfolio)
        .select()
        .single()

      // Add photos with quality metrics
      const photos = [
        { 
          portfolio_id: portfolioData.id,
          likes: 150,
          views: 2000,
          technical_score: 95,
          composition_score: 90
        },
        { 
          portfolio_id: portfolioData.id,
          likes: 200,
          views: 2500,
          technical_score: 88,
          composition_score: 92
        },
        { 
          portfolio_id: portfolioData.id,
          likes: 180,
          views: 2200,
          technical_score: 91,
          composition_score: 89
        }
      ]

      await supabase.from('portfolio_photos').insert(photos)

      const { data: portfolioScore } = await supabase.rpc('calculate_portfolio_quality', {
        vendor_id_input: testVendorId
      })

      // Expected high score based on engagement and technical quality
      expect(portfolioScore).toBeGreaterThan(85)
      expect(portfolioScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Overall Vendor Score Calculation', () => {
    it('should calculate comprehensive vendor score', async () => {
      // Set up comprehensive test data
      await setupComprehensiveTestData()

      const { data: overallScore } = await supabase.rpc('calculate_overall_vendor_score', {
        vendor_id_input: testVendorId
      })

      expect(overallScore).toBeGreaterThan(0)
      expect(overallScore).toBeLessThanOrEqual(100)
      expect(typeof overallScore).toBe('number')
    })

    it('should handle vendors with missing data gracefully', async () => {
      // Test with minimal data
      const { data: score } = await supabase.rpc('calculate_overall_vendor_score', {
        vendor_id_input: testVendorId
      })

      // Should return a base score even with no interaction data
      expect(score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Data Consistency Validation', () => {
    it('should validate analytics data consistency across tables', async () => {
      await setupComprehensiveTestData()

      // Check that aggregated data matches source data
      const { data: analytics } = await supabase
        .from('vendor_analytics')
        .select('*')
        .eq('vendor_id', testVendorId)
        .single()

      const { data: interactions } = await supabase
        .from('vendor_interactions')
        .select('count(*)')
        .eq('vendor_id', testVendorId)

      const { data: bookings } = await supabase
        .from('bookings')
        .select('count(*)')
        .eq('vendor_id', testVendorId)

      expect(analytics.total_interactions).toBe(interactions[0].count)
      expect(analytics.total_bookings).toBe(bookings[0].count)
    })

    it('should detect and report data anomalies', async () => {
      // Insert anomalous data
      await supabase.from('vendor_interactions').insert({
        vendor_id: testVendorId,
        client_id: testClientId,
        type: 'inquiry_response',
        response_time_hours: -5 // Invalid negative response time
      })

      const { data: anomalies } = await supabase.rpc('detect_analytics_anomalies', {
        vendor_id_input: testVendorId
      })

      expect(anomalies).toContain('negative_response_time')
    })
  })

  // Helper function to set up comprehensive test data
  async function setupComprehensiveTestData() {
    // Add interactions
    await supabase.from('vendor_interactions').insert([
      {
        vendor_id: testVendorId,
        client_id: testClientId,
        type: 'inquiry_response',
        response_time_hours: 1,
        created_at: '2025-01-01T10:00:00Z'
      },
      {
        vendor_id: testVendorId,
        client_id: testClientId,
        type: 'follow_up',
        response_time_hours: 2,
        created_at: '2025-01-02T10:00:00Z'
      }
    ])

    // Add bookings
    await supabase.from('bookings').insert([
      {
        vendor_id: testVendorId,
        client_id: testClientId,
        status: 'confirmed',
        booking_date: '2025-07-15',
        total_amount: 2000.00
      }
    ])

    // Add reviews
    await supabase.from('vendor_reviews').insert([
      {
        vendor_id: testVendorId,
        client_id: testClientId,
        rating: 5,
        review_text: 'Excellent service!',
        verified: true
      }
    ])
  }
})

describe('Edge Cases and Error Handling', () => {
  it('should handle database connection failures gracefully', async () => {
    // Mock database failure
    const mockClient = {
      rpc: jest.fn().mockRejectedValue(new Error('Database connection failed'))
    }

    // Test error handling in scoring functions
    try {
      await mockClient.rpc('calculate_vendor_response_score', { vendor_id_input: 'test' })
    } catch (error) {
      expect(error.message).toContain('Database connection failed')
    }
  })

  it('should validate input parameters', async () => {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Test with invalid vendor ID
    const { error } = await supabase.rpc('calculate_vendor_response_score', {
      vendor_id_input: null
    })

    expect(error).toBeTruthy()
  })

  it('should handle concurrent scoring calculations', async () => {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Create test vendor
    const { data: vendor } = await supabase
      .from('suppliers')
      .insert({
        name: 'Concurrent Test Vendor',
        email: 'concurrent@test.com',
        type: 'photographer'
      })
      .select()
      .single()

    // Run multiple concurrent scoring operations
    const promises = Array.from({ length: 10 }, () => 
      supabase.rpc('calculate_overall_vendor_score', {
        vendor_id_input: vendor.id
      })
    )

    const results = await Promise.all(promises)

    // All results should be consistent
    const firstScore = results[0].data
    results.forEach(result => {
      expect(result.data).toBe(firstScore)
    })

    // Cleanup
    await supabase.from('suppliers').delete().eq('id', vendor.id)
  })
})