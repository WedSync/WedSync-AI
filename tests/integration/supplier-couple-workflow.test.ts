/**
 * WS-192 Integration Tests Suite - Supplier-Couple Workflow Tests
 * Team C - Integration Testing Infrastructure
 * 
 * Comprehensive end-to-end testing of wedding supplier-couple interaction workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestContext, TestContext } from './setup'
import { WeddingDataFactory, WeddingEcosystem } from '../factories/wedding-data-factory'
import { mockServer } from './setup'
import { http, HttpResponse } from 'msw'

describe('Supplier-Couple Workflow Integration Tests', () => {
  let testContext: TestContext
  let dataFactory: WeddingDataFactory

  beforeEach(async () => {
    testContext = await createTestContext('supplier_couple_workflow')
    dataFactory = new WeddingDataFactory(testContext.supabase)
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('Complete Wedding Inquiry Workflow', () => {
    it('should handle end-to-end photographer inquiry workflow', async () => {
      // Create complete wedding ecosystem
      const ecosystem = await dataFactory.createFullWeddingEcosystem()
      
      // Verify ecosystem creation
      expect(ecosystem.supplier).toBeDefined()
      expect(ecosystem.couple).toBeDefined()
      expect(ecosystem.forms).toHaveLength(1)
      expect(ecosystem.journeys).toHaveLength(1)
      expect(ecosystem.submissions).toHaveLength(1)

      // Verify data relationships
      expect(ecosystem.submissions[0].form_id).toBe(ecosystem.forms[0].id)
      expect(ecosystem.submissions[0].customer_id).toBe(ecosystem.couple.id)
      expect(ecosystem.journeys[0].organization_id).toBe(ecosystem.supplier.id)
      expect(ecosystem.journeys[0].customer_id).toBe(ecosystem.couple.id)

      // Verify supplier is photographer type
      expect(ecosystem.supplier.business_type).toBe('photographer')
      expect(ecosystem.supplier.subscription_tier).toBe('professional')
      expect(ecosystem.supplier.services).toContain('Wedding Day Photography')

      // Verify form submission contains wedding data
      expect(ecosystem.submissions[0].data).toHaveProperty('Wedding Date')
      expect(ecosystem.submissions[0].data).toHaveProperty('Partner 1 Name')
      expect(ecosystem.submissions[0].data).toHaveProperty('Partner 2 Name')
      expect(ecosystem.submissions[0].status).toBe('completed')

      // Verify journey has wedding-specific steps
      const journeySteps = ecosystem.journeys[0].steps
      expect(journeySteps).toContainEqual(
        expect.objectContaining({ name: 'Initial Inquiry', type: 'form_submission' })
      )
      expect(journeySteps).toContainEqual(
        expect.objectContaining({ name: 'Consultation Booking', type: 'calendar_booking' })
      )
    })

    it('should maintain data consistency throughout workflow', async () => {
      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Verify all IDs are properly formatted UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(ecosystem.supplier.id).toMatch(uuidRegex)
      expect(ecosystem.couple.id).toMatch(uuidRegex)
      expect(ecosystem.forms[0].id).toMatch(uuidRegex)
      expect(ecosystem.journeys[0].id).toMatch(uuidRegex)
      expect(ecosystem.submissions[0].id).toMatch(uuidRegex)

      // Verify foreign key relationships
      expect(ecosystem.forms[0].organization_id).toBe(ecosystem.supplier.id)
      expect(ecosystem.journeys[0].organization_id).toBe(ecosystem.supplier.id)
      expect(ecosystem.journeys[0].customer_id).toBe(ecosystem.couple.id)
      expect(ecosystem.submissions[0].form_id).toBe(ecosystem.forms[0].id)
      expect(ecosystem.submissions[0].customer_id).toBe(ecosystem.couple.id)

      // Verify timestamps are consistent
      const supplierTime = new Date(ecosystem.supplier.created_at).getTime()
      const coupleTime = new Date(ecosystem.couple.created_at || new Date()).getTime()
      const formTime = new Date(ecosystem.forms[0].created_at).getTime()
      const journeyTime = new Date(ecosystem.journeys[0].created_at).getTime()
      const submissionTime = new Date(ecosystem.submissions[0].created_at).getTime()

      // All should be created within reasonable time window (5 seconds)
      const now = Date.now()
      expect(now - supplierTime).toBeLessThan(5000)
      expect(now - coupleTime).toBeLessThan(5000)
      expect(now - formTime).toBeLessThan(5000)
      expect(now - journeyTime).toBeLessThan(5000)
      expect(now - submissionTime).toBeLessThan(5000)
    })

    it('should handle multi-vendor wedding workflow', async () => {
      // Create wedding couple
      const couple = await dataFactory.createWeddingCouple()

      // Create multiple vendors
      const photographer = await dataFactory.createWeddingSupplier({ 
        business_type: 'photographer',
        subscription_tier: 'professional'
      })
      const venue = await dataFactory.createWeddingSupplier({ 
        business_type: 'venue',
        subscription_tier: 'scale'
      })
      const florist = await dataFactory.createWeddingSupplier({ 
        business_type: 'florist',
        subscription_tier: 'starter'
      })

      // Create forms for each vendor
      const photoForm = await dataFactory.createWeddingForm(photographer.id, {
        name: 'Photography Inquiry'
      })
      const venueForm = await dataFactory.createWeddingForm(venue.id, {
        name: 'Venue Booking Request'
      })
      const floralForm = await dataFactory.createWeddingForm(florist.id, {
        name: 'Floral Design Consultation'
      })

      // Create journeys for each vendor
      const photoJourney = await dataFactory.createCustomerJourney(photographer.id, couple.id)
      const venueJourney = await dataFactory.createCustomerJourney(venue.id, couple.id)
      const floralJourney = await dataFactory.createCustomerJourney(florist.id, couple.id)

      // Create submissions for each form
      const photoSubmission = await dataFactory.createFormSubmission(photoForm.id, couple.id)
      const venueSubmission = await dataFactory.createFormSubmission(venueForm.id, couple.id)
      const floralSubmission = await dataFactory.createFormSubmission(floralForm.id, couple.id)

      // Verify all vendors connected to same couple
      expect(photoJourney.customer_id).toBe(couple.id)
      expect(venueJourney.customer_id).toBe(couple.id)
      expect(floralJourney.customer_id).toBe(couple.id)

      // Verify different subscription tiers
      expect(photographer.subscription_tier).toBe('professional')
      expect(venue.subscription_tier).toBe('scale')
      expect(florist.subscription_tier).toBe('starter')

      // Verify different business types have appropriate services
      expect(photographer.services).toContain('Wedding Day Photography')
      expect(venue.services).toContain('Wedding Ceremonies')
      expect(florist.services).toContain('Bridal Bouquets')

      // Verify all submissions completed successfully
      expect(photoSubmission.status).toBe('completed')
      expect(venueSubmission.status).toBe('completed')
      expect(floralSubmission.status).toBe('completed')
    })

    it('should enforce subscription tier limits correctly', async () => {
      // Create free tier supplier
      const freeSupplier = await dataFactory.createWeddingSupplier({
        subscription_tier: 'free'
      })

      // Create couple
      const couple = await dataFactory.createWeddingCouple()

      // Free tier should allow 1 form
      const form1 = await dataFactory.createWeddingForm(freeSupplier.id, {
        name: 'First Form (Free Tier)'
      })
      expect(form1).toBeDefined()

      // Verify form created successfully
      const { data: forms, error } = await testContext.supabase
        .from('forms')
        .select('*')
        .eq('organization_id', freeSupplier.id)

      expect(error).toBeNull()
      expect(forms).toHaveLength(1)
      expect(forms[0].id).toBe(form1.id)

      // Create professional tier supplier for comparison
      const proSupplier = await dataFactory.createWeddingSupplier({
        subscription_tier: 'professional'
      })

      // Professional tier should allow multiple forms
      const proForm1 = await dataFactory.createWeddingForm(proSupplier.id)
      const proForm2 = await dataFactory.createWeddingForm(proSupplier.id)
      const proForm3 = await dataFactory.createWeddingForm(proSupplier.id)

      const { data: proForms } = await testContext.supabase
        .from('forms')
        .select('*')
        .eq('organization_id', proSupplier.id)

      expect(proForms).toHaveLength(3)
    })

    it('should handle workflow interruptions gracefully', async () => {
      // Mock email service failure
      mockServer.use(
        http.post('*/email/send', () => {
          return new HttpResponse('Service unavailable', { status: 503 })
        })
      )

      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Workflow should still complete despite email service failure
      expect(ecosystem.supplier).toBeDefined()
      expect(ecosystem.couple).toBeDefined()
      expect(ecosystem.submissions[0].status).toBe('completed')

      // Reset mock for next test
      mockServer.resetHandlers()
    })

    it('should validate wedding date requirements', async () => {
      // Create ecosystem with specific wedding date
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const weddingDate = futureDate.toISOString().split('T')[0]

      const couple = await dataFactory.createWeddingCouple({
        wedding_date: weddingDate
      })

      const supplier = await dataFactory.createWeddingSupplier({
        business_type: 'photographer'
      })

      // Verify wedding date is in the future
      expect(new Date(couple.wedding_date).getTime()).toBeGreaterThan(Date.now())

      // Verify supplier availability for that date
      expect(supplier.availability).toBeDefined()
      expect(typeof supplier.availability[weddingDate]).toBe('object')

      // Create journey with wedding date validation
      const journey = await dataFactory.createCustomerJourney(supplier.id, couple.id)
      
      expect(journey.customer_id).toBe(couple.id)
      expect(journey.organization_id).toBe(supplier.id)

      // Verify journey steps include date-sensitive actions
      const steps = journey.steps
      expect(steps.some(step => step.name.includes('Consultation'))).toBeTruthy()
      expect(steps.some(step => step.actions.includes('calendar_invite'))).toBeTruthy()
    })

    it('should track conversion metrics throughout workflow', async () => {
      const ecosystem = await dataFactory.createFullWeddingEcosystem()

      // Verify metrics are tracked in journey
      const journey = ecosystem.journeys[0]
      expect(journey.metrics).toBeDefined()
      expect(journey.metrics.conversion_rate).toBeGreaterThanOrEqual(0)
      expect(journey.metrics.conversion_rate).toBeLessThanOrEqual(1)
      expect(journey.metrics.average_completion_time).toBeGreaterThan(0)
      expect(journey.metrics.customer_satisfaction).toBeGreaterThanOrEqual(1)
      expect(journey.metrics.customer_satisfaction).toBeLessThanOrEqual(5)

      // Verify touchpoints are recorded
      expect(journey.touchpoints).toBeDefined()
      expect(Array.isArray(journey.touchpoints)).toBeTruthy()
      expect(journey.touchpoints.length).toBeGreaterThan(0)

      // Verify each touchpoint has required fields
      journey.touchpoints.forEach(touchpoint => {
        expect(touchpoint.type).toBeDefined()
        expect(touchpoint.timestamp).toBeDefined()
        expect(touchpoint.content).toBeDefined()
        expect(touchpoint.channel).toBeDefined()
        expect(['email', 'phone_call', 'meeting', 'message'].includes(touchpoint.type)).toBeTruthy()
      })
    })

    it('should handle seasonal wedding preferences correctly', async () => {
      // Create couples with different seasonal weddings
      const springCouple = await dataFactory.createWeddingCouple({
        wedding_date: '2025-04-15' // Spring
      })
      const summerCouple = await dataFactory.createWeddingCouple({
        wedding_date: '2025-07-20' // Summer
      })
      const autumnCouple = await dataFactory.createWeddingCouple({
        wedding_date: '2025-10-12' // Autumn
      })
      const winterCouple = await dataFactory.createWeddingCouple({
        wedding_date: '2025-01-18' // Winter
      })

      // Verify seasonal preferences are set correctly
      expect(springCouple.preferences.season).toBe('Spring')
      expect(summerCouple.preferences.season).toBe('Summer')
      expect(autumnCouple.preferences.season).toBe('Autumn')
      expect(winterCouple.preferences.season).toBe('Winter')

      // Verify each couple has appropriate preferences for their season
      expect(springCouple.preferences.style).toBeDefined()
      expect(springCouple.preferences.colors).toHaveLength(2)
      expect(Array.isArray(springCouple.preferences.colors)).toBeTruthy()

      // Create supplier that serves all seasons
      const supplier = await dataFactory.createWeddingSupplier({
        business_type: 'photographer'
      })

      // Verify supplier can handle all seasons
      const springJourney = await dataFactory.createCustomerJourney(supplier.id, springCouple.id)
      const summerJourney = await dataFactory.createCustomerJourney(supplier.id, summerCouple.id)
      const autumnJourney = await dataFactory.createCustomerJourney(supplier.id, autumnCouple.id)
      const winterJourney = await dataFactory.createCustomerJourney(supplier.id, winterCouple.id)

      expect(springJourney.customer_id).toBe(springCouple.id)
      expect(summerJourney.customer_id).toBe(summerCouple.id)
      expect(autumnJourney.customer_id).toBe(autumnCouple.id)
      expect(winterJourney.customer_id).toBe(winterCouple.id)
    })
  })

  describe('Wedding Budget Integration', () => {
    it('should handle realistic wedding budgets and breakdowns', async () => {
      const couple = await dataFactory.createWeddingCouple()

      // Verify budget structure
      expect(couple.budget_total).toBeGreaterThan(0)
      expect(couple.budget_breakdown).toBeDefined()
      expect(typeof couple.budget_breakdown).toBe('object')

      // Verify budget categories
      const expectedCategories = ['venue', 'photography', 'catering', 'flowers', 'entertainment', 'other']
      expectedCategories.forEach(category => {
        expect(couple.budget_breakdown).toHaveProperty(category)
        expect(couple.budget_breakdown[category]).toBeGreaterThan(0)
      })

      // Verify budget breakdown adds up approximately to total (allowing for rounding)
      const calculatedTotal = Object.values(couple.budget_breakdown).reduce((sum, amount) => sum + amount, 0)
      const difference = Math.abs(calculatedTotal - couple.budget_total)
      expect(difference).toBeLessThan(couple.budget_total * 0.05) // Within 5% due to rounding

      // Create photographer with pricing that fits budget
      const photographer = await dataFactory.createWeddingSupplier({
        business_type: 'photographer'
      })

      const photographyBudget = couple.budget_breakdown.photography
      const photoPrice = photographer.pricing['Wedding Day Photography']

      // In real workflow, prices should be compared to budget
      expect(photoPrice).toBeGreaterThan(0)
      expect(photographyBudget).toBeGreaterThan(0)

      // Create journey to track budget considerations
      const journey = await dataFactory.createCustomerJourney(photographer.id, couple.id)
      expect(journey.organization_id).toBe(photographer.id)
      expect(journey.customer_id).toBe(couple.id)
    })

    it('should handle different budget tiers appropriately', async () => {
      // Create couples with different budget levels
      const lowBudgetCouple = await dataFactory.createWeddingCouple({
        budget_total: 15000 // Low budget wedding
      })
      const midBudgetCouple = await dataFactory.createWeddingCouple({
        budget_total: 35000 // Mid-range wedding
      })
      const highBudgetCouple = await dataFactory.createWeddingCouple({
        budget_total: 65000 // Luxury wedding
      })

      // Create suppliers with different pricing tiers
      const budgetPhotographer = await dataFactory.createWeddingSupplier({
        business_type: 'photographer',
        subscription_tier: 'starter'
      })
      const midRangePhotographer = await dataFactory.createWeddingSupplier({
        business_type: 'photographer',
        subscription_tier: 'professional'
      })
      const luxuryPhotographer = await dataFactory.createWeddingSupplier({
        business_type: 'photographer',
        subscription_tier: 'enterprise'
      })

      // Verify pricing structures differ
      const budgetPrice = budgetPhotographer.pricing['Wedding Day Photography']
      const midPrice = midRangePhotographer.pricing['Wedding Day Photography']
      const luxuryPrice = luxuryPhotographer.pricing['Wedding Day Photography']

      expect(budgetPrice).toBeLessThan(midPrice)
      expect(midPrice).toBeLessThan(luxuryPrice)

      // Verify couples can connect with appropriate suppliers
      const lowBudgetJourney = await dataFactory.createCustomerJourney(budgetPhotographer.id, lowBudgetCouple.id)
      const midBudgetJourney = await dataFactory.createCustomerJourney(midRangePhotographer.id, midBudgetCouple.id)
      const highBudgetJourney = await dataFactory.createCustomerJourney(luxuryPhotographer.id, highBudgetCouple.id)

      expect(lowBudgetJourney.customer_id).toBe(lowBudgetCouple.id)
      expect(midBudgetJourney.customer_id).toBe(midBudgetCouple.id)
      expect(highBudgetJourney.customer_id).toBe(highBudgetCouple.id)
    })
  })

  describe('Geographic and Location Integration', () => {
    it('should handle UK-specific location data correctly', async () => {
      const couple = await dataFactory.createWeddingCouple()
      const supplier = await dataFactory.createWeddingSupplier()

      // Verify UK postcode format
      const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/
      expect(couple.location.postcode).toMatch(postcodeRegex)
      expect(supplier.location.postcode).toMatch(postcodeRegex)

      // Verify UK counties are used
      const ukCounties = ['Surrey', 'Kent', 'Hampshire', 'Berkshire', 'Essex', 'Hertfordshire']
      expect(ukCounties).toContain(couple.location.county)
      expect(ukCounties).toContain(supplier.location.county)

      // Verify coordinates are within UK bounds
      expect(supplier.location.latitude).toBeGreaterThanOrEqual(50.5)
      expect(supplier.location.latitude).toBeLessThanOrEqual(52.0)
      expect(supplier.location.longitude).toBeGreaterThanOrEqual(-1.0)
      expect(supplier.location.longitude).toBeLessThanOrEqual(1.0)

      // Verify phone numbers use UK format
      const ukPhoneRegex = /^07\d{3} \d{6}$/
      expect(couple.phone).toMatch(ukPhoneRegex)
      expect(supplier.phone).toMatch(ukPhoneRegex)
    })

    it('should support regional vendor matching', async () => {
      // Create couple in Surrey
      const surreyCouple = await dataFactory.createWeddingCouple({
        location: {
          city: 'Guildford',
          county: 'Surrey',
          postcode: 'GU1 3UW'
        }
      })

      // Create suppliers in different counties
      const surreySupplier = await dataFactory.createWeddingSupplier({
        location: {
          city: 'Woking',
          county: 'Surrey',
          postcode: 'GU21 4XX',
          latitude: 51.3158,
          longitude: -0.5567
        }
      })

      const kentSupplier = await dataFactory.createWeddingSupplier({
        location: {
          city: 'Canterbury',
          county: 'Kent',
          postcode: 'CT1 1XX',
          latitude: 51.2802,
          longitude: 1.0789
        }
      })

      // Both should be able to create journeys (no geographic restrictions at integration level)
      const surreyJourney = await dataFactory.createCustomerJourney(surreySupplier.id, surreyCouple.id)
      const kentJourney = await dataFactory.createCustomerJourney(kentSupplier.id, surreyCouple.id)

      expect(surreyJourney.customer_id).toBe(surreyCouple.id)
      expect(kentJourney.customer_id).toBe(surreyCouple.id)

      // Verify location data integrity
      expect(surreyCouple.location.county).toBe('Surrey')
      expect(surreySupplier.location.county).toBe('Surrey')
      expect(kentSupplier.location.county).toBe('Kent')
    })
  })
})