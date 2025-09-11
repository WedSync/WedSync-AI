/**
 * WS-239 Platform AI Integration Testing
 * Integration tests for WedSync platform AI services with real provider interactions
 * Tests actual API connections, data flow, and service integration
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { PlatformAIService } from '@/lib/ai/platform-ai-service'
import { AIUsageTracker } from '@/lib/ai/usage-tracker'
import { TierLimitEnforcer } from '@/lib/ai/tier-limit-enforcer'
import { supabase } from '@/lib/supabase'
import { createMockWeddingVendor } from '../../setup'

// Integration test environment setup
const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/wedsync_test'
const testOpenAIKey = process.env.TEST_OPENAI_KEY || 'sk-test-key-for-integration-testing'

// Mock but allow actual API calls in integration mode
const integrationMode = process.env.INTEGRATION_TEST_MODE === 'true'

describe('Platform AI Integration Testing - WS-239', () => {
  let platformAIService: PlatformAIService
  let usageTracker: AIUsageTracker
  let tierEnforcer: TierLimitEnforcer
  let testSupplier: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup test supplier in database
    testSupplier = createMockWeddingVendor({
      id: 'integration-test-supplier-001',
      service_type: 'photographer',
      subscription_tier: 'professional',
      ai_quota_monthly: 1000,
      ai_usage_current: 0 // Start fresh
    })

    // Initialize services with real connections if in integration mode
    if (integrationMode) {
      platformAIService = new PlatformAIService({
        openaiApiKey: testOpenAIKey,
        environment: 'test'
      })
      usageTracker = new AIUsageTracker(supabase)
      tierEnforcer = new TierLimitEnforcer(supabase)
    } else {
      // Use mocks for unit testing
      platformAIService = new PlatformAIService({
        openaiApiKey: 'mock-key',
        environment: 'test'
      })
      usageTracker = { trackUsage: vi.fn(), getCurrentUsage: vi.fn() } as any
      tierEnforcer = { enforceLimit: vi.fn(), checkQuota: vi.fn() } as any
    }

    // Insert test supplier into database if integration mode
    if (integrationMode) {
      await supabase.from('suppliers').upsert(testSupplier)
    }
  })

  afterEach(async () => {
    // Clean up test data if integration mode
    if (integrationMode) {
      await supabase.from('ai_usage_logs').delete().eq('supplier_id', testSupplier.id)
      await supabase.from('suppliers').delete().eq('id', testSupplier.id)
    }
    
    vi.restoreAllMocks()
  })

  describe('Platform AI Service Integration', () => {
    test('should integrate with OpenAI API for photo tagging', async () => {
      const photoTaggingRequest = {
        supplierId: testSupplier.id,
        requestType: 'photo_tagging',
        content: 'Wedding ceremony photo with bride in white dress, groom in black tuxedo, exchanging rings at altar with flowers',
        metadata: {
          photoId: 'integration-test-photo-001',
          venue: 'Beautiful Garden Venue',
          weddingDate: '2024-06-15'
        }
      }

      const result = await platformAIService.processRequest(photoTaggingRequest)

      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
      expect(result.tokens).toBeGreaterThan(0)
      expect(result.responseTime).toBeLessThan(5000) // <5s response time
      expect(result.tags).toBeInstanceOf(Array)
      
      if (integrationMode) {
        // Verify actual AI-generated tags contain wedding-related terms
        const weddingTerms = ['bride', 'groom', 'wedding', 'ceremony', 'rings', 'altar']
        const foundTerms = weddingTerms.filter(term => 
          result.tags.some(tag => tag.toLowerCase().includes(term))
        )
        expect(foundTerms.length).toBeGreaterThan(2)
      }
    })

    test('should integrate with database for usage tracking', async () => {
      const usageRequest = {
        supplierId: testSupplier.id,
        requestType: 'venue_description',
        content: 'Generate elegant description for wedding venue with garden setting',
        estimatedTokens: 150
      }

      // Process request
      const result = await platformAIService.processRequest(usageRequest)
      expect(result.success).toBe(true)

      if (integrationMode) {
        // Verify usage was tracked in database
        const usageRecord = await supabase
          .from('ai_usage_logs')
          .select('*')
          .eq('supplier_id', testSupplier.id)
          .eq('request_type', 'venue_description')
          .single()

        expect(usageRecord.data).toBeDefined()
        expect(usageRecord.data.tokens_used).toBeGreaterThan(0)
        expect(usageRecord.data.cost).toBeGreaterThan(0)
        expect(usageRecord.data.provider).toBe('platform')
      }
    })

    test('should enforce tier limits with database integration', async () => {
      if (!integrationMode) return // Skip for unit tests

      // Set supplier close to limit
      await supabase
        .from('suppliers')
        .update({ ai_usage_current: 950 }) // Close to 1000 quota
        .eq('id', testSupplier.id)

      const nearLimitRequest = {
        supplierId: testSupplier.id,
        requestType: 'timeline_generation',
        content: 'Create detailed wedding day timeline from 8am to midnight',
        estimatedTokens: 100 // Should be within limit
      }

      const result = await platformAIService.processRequest(nearLimitRequest)
      expect(result.success).toBe(true)
      expect(result.withinQuota).toBe(true)

      // Now try request that would exceed limit
      const overLimitRequest = {
        ...nearLimitRequest,
        estimatedTokens: 200 // Would exceed quota
      }

      const overLimitResult = await platformAIService.processRequest(overLimitRequest)
      expect(overLimitResult.quotaExceeded).toBe(true)
      expect(overLimitResult.overageCost).toBeGreaterThan(0)
    })

    test('should handle real-time billing integration', async () => {
      if (!integrationMode) return

      const billingRequest = {
        supplierId: testSupplier.id,
        requestType: 'email_template',
        content: 'Generate professional wedding vendor email template for client follow-up',
        tier: 'professional'
      }

      const result = await platformAIService.processRequest(billingRequest)
      expect(result.success).toBe(true)

      // Verify billing record created
      const billingRecord = await supabase
        .from('ai_billing_events')
        .select('*')
        .eq('supplier_id', testSupplier.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      expect(billingRecord.data).toBeDefined()
      expect(billingRecord.data.cost_calculated).toBeGreaterThan(0)
      expect(billingRecord.data.billing_period).toBeDefined()
      expect(billingRecord.data.tier).toBe('professional')
    })
  })

  describe('Real-World Wedding Scenario Integration', () => {
    test('should handle complete photography studio workflow', async () => {
      if (!integrationMode) return

      const photographyWorkflow = [
        {
          phase: 'preparation',
          requests: [
            {
              type: 'equipment_checklist',
              content: 'Generate wedding photography equipment checklist for garden ceremony and indoor reception'
            },
            {
              type: 'shot_list',
              content: 'Create comprehensive wedding day shot list including family photos, ceremony moments, reception details'
            }
          ]
        },
        {
          phase: 'wedding_day',
          requests: [
            {
              type: 'photo_tagging',
              content: 'Tag wedding photos: ceremony processional, first kiss, ring exchange'
            },
            {
              type: 'quick_album',
              content: 'Generate quick preview album descriptions for immediate sharing'
            }
          ]
        },
        {
          phase: 'post_wedding',
          requests: [
            {
              type: 'album_organization',
              content: 'Organize wedding photos into storytelling sequence for final album'
            },
            {
              type: 'client_delivery',
              content: 'Create professional delivery email with album preview and next steps'
            }
          ]
        }
      ]

      let totalTokens = 0
      let totalCost = 0
      const phaseResults = []

      // Process each workflow phase
      for (const phase of photographyWorkflow) {
        const phaseResult = { phase: phase.phase, requests: [] }

        for (const request of phase.requests) {
          const result = await platformAIService.processRequest({
            supplierId: testSupplier.id,
            requestType: request.type,
            content: request.content,
            workflowPhase: phase.phase
          })

          expect(result.success).toBe(true)
          totalTokens += result.tokens
          totalCost += result.cost

          phaseResult.requests.push({
            type: request.type,
            success: result.success,
            tokens: result.tokens,
            cost: result.cost
          })
        }

        phaseResults.push(phaseResult)
      }

      // Verify complete workflow tracking
      expect(phaseResults).toHaveLength(3)
      expect(totalTokens).toBeGreaterThan(0)
      expect(totalCost).toBeGreaterThan(0)

      // Verify workflow data in database
      const workflowRecord = await supabase
        .from('ai_workflows')
        .select('*')
        .eq('supplier_id', testSupplier.id)
        .eq('workflow_type', 'photography_complete')
        .single()

      expect(workflowRecord.data).toBeDefined()
      expect(workflowRecord.data.phases_completed).toBe(3)
      expect(workflowRecord.data.total_cost).toBeCloseTo(totalCost, 4)
    })

    test('should integrate with venue coordinator mobile workflow', async () => {
      if (!integrationMode) return

      const venueSupplier = createMockWeddingVendor({
        id: 'venue-integration-test-002',
        service_type: 'venue',
        subscription_tier: 'scale',
        mobile_primary: true
      })

      await supabase.from('suppliers').upsert(venueSupplier)

      const mobileWorkflow = [
        {
          location: 'ceremony_area',
          request: {
            type: 'venue_description',
            content: 'Describe garden ceremony area with natural lighting, seating for 150 guests, floral arch'
          }
        },
        {
          location: 'reception_hall',
          request: {
            type: 'capacity_analysis', 
            content: 'Analyze reception hall layout for optimal guest flow and table arrangements'
          }
        },
        {
          location: 'bridal_suite',
          request: {
            type: 'amenity_description',
            content: 'Detail bridal preparation suite amenities and getting-ready photo opportunities'
          }
        }
      ]

      const locationResults = []

      for (const location of mobileWorkflow) {
        const result = await platformAIService.processRequest({
          supplierId: venueSupplier.id,
          requestType: location.request.type,
          content: location.request.content,
          context: {
            mobile: true,
            location: location.location,
            venue_tour: true
          }
        })

        expect(result.success).toBe(true)
        expect(result.mobileOptimized).toBe(true)
        locationResults.push(result)
      }

      // Verify mobile workflow optimization
      locationResults.forEach(result => {
        expect(result.responseTime).toBeLessThan(3000) // <3s for mobile
        expect(result.contentOptimized).toBe(true)
      })

      // Cleanup
      await supabase.from('suppliers').delete().eq('id', venueSupplier.id)
    })
  })

  describe('Error Handling and Resilience Integration', () => {
    test('should handle API failures gracefully with database logging', async () => {
      if (!integrationMode) return

      // Simulate API failure scenario
      const failureRequest = {
        supplierId: testSupplier.id,
        requestType: 'stress_test',
        content: 'This is a test of API failure handling and recovery mechanisms',
        forceFailure: true // Special flag for testing
      }

      const result = await platformAIService.processRequest(failureRequest)

      if (result.success === false) {
        // Verify error was logged to database
        const errorLog = await supabase
          .from('ai_error_logs')
          .select('*')
          .eq('supplier_id', testSupplier.id)
          .eq('error_type', 'api_failure')
          .single()

        expect(errorLog.data).toBeDefined()
        expect(errorLog.data.error_details).toBeDefined()
        expect(errorLog.data.retry_attempted).toBe(true)
      }
    })

    test('should recover from database connection issues', async () => {
      if (!integrationMode) return

      // Test database recovery mechanisms
      const recoveryTest = await platformAIService.testDatabaseRecovery({
        supplierId: testSupplier.id,
        simulateDisconnection: true,
        recoveryTimeout: 5000
      })

      expect(recoveryTest.connectionRecovered).toBe(true)
      expect(recoveryTest.dataIntegrity).toBe('maintained')
      expect(recoveryTest.serviceContinuity).toBe(true)
    })

    test('should handle wedding day emergency scenarios', async () => {
      if (!integrationMode) return

      const emergencyScenario = {
        supplierId: testSupplier.id,
        requestType: 'emergency_response',
        content: 'Handle wedding day photography emergency - backup photographer needed immediately',
        priority: 'critical',
        weddingDate: new Date().toISOString().split('T')[0], // Today
        emergencyType: 'vendor_substitution'
      }

      const emergencyResult = await platformAIService.processEmergencyRequest(emergencyScenario)

      expect(emergencyResult.success).toBe(true)
      expect(emergencyResult.responseTime).toBeLessThan(1000) // <1s for emergency
      expect(emergencyResult.escalated).toBe(true)
      expect(emergencyResult.priorityProcessing).toBe(true)

      // Verify emergency was logged appropriately
      const emergencyLog = await supabase
        .from('emergency_responses')
        .select('*')
        .eq('supplier_id', testSupplier.id)
        .eq('emergency_type', 'vendor_substitution')
        .single()

      expect(emergencyLog.data).toBeDefined()
      expect(emergencyLog.data.response_time_ms).toBeLessThan(1000)
    })
  })

  describe('Performance Integration Testing', () => {
    test('should maintain performance under concurrent load', async () => {
      if (!integrationMode) return

      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        supplierId: testSupplier.id,
        requestType: 'performance_test',
        content: `Concurrent performance test request ${i} - generating wedding vendor content`,
        testId: i
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        concurrentRequests.map(req => platformAIService.processRequest(req))
      )
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const avgTime = totalTime / 10

      expect(results).toHaveLength(10)
      expect(avgTime).toBeLessThan(2000) // <2s average
      expect(totalTime).toBeLessThan(15000) // <15s total

      // Verify all requests succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.testId).toBe(index)
      })
    })

    test('should handle large content processing efficiently', async () => {
      if (!integrationMode) return

      const largeContentRequest = {
        supplierId: testSupplier.id,
        requestType: 'large_content_processing',
        content: `
          Generate comprehensive wedding day timeline with detailed breakdown:
          
          6:00 AM - Vendor setup begins
          7:00 AM - Hair and makeup starts
          8:00 AM - Photography team arrives
          9:00 AM - Ceremony setup
          10:00 AM - Bridal party preparations
          11:00 AM - Guest arrival coordination
          12:00 PM - Ceremony processional
          12:30 PM - Ceremony exchange
          1:00 PM - Cocktail hour setup
          2:00 PM - Reception preparations
          3:00 PM - Dinner service
          5:00 PM - Dancing begins
          10:00 PM - Venue teardown
          
          Include detailed vendor coordination, guest management, timeline contingencies,
          weather backup plans, emergency protocols, and post-event cleanup procedures.
          Add specific timing for photography, videography, catering, music, and all
          other wedding vendors. Include family dynamics considerations and VIP guest
          management protocols.
        `,
        expectLargeResponse: true
      }

      const startTime = Date.now()
      const result = await platformAIService.processRequest(largeContentRequest)
      const processingTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.content.length).toBeGreaterThan(1000) // Substantial content
      expect(result.tokens).toBeGreaterThan(500) // High token usage
      expect(processingTime).toBeLessThan(10000) // <10s even for large content
    })
  })

  describe('Data Consistency Integration', () => {
    test('should maintain data consistency across service boundaries', async () => {
      if (!integrationMode) return

      const consistencyTest = {
        supplierId: testSupplier.id,
        requestType: 'consistency_validation',
        content: 'Test cross-service data consistency and integrity'
      }

      // Process request and track all data changes
      const result = await platformAIService.processRequest(consistencyTest)
      expect(result.success).toBe(true)

      // Verify usage tracking consistency
      const usageRecord = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('supplier_id', testSupplier.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const supplierRecord = await supabase
        .from('suppliers')
        .select('ai_usage_current')
        .eq('id', testSupplier.id)
        .single()

      // Verify billing consistency
      const billingRecord = await supabase
        .from('ai_billing_events')
        .select('*')
        .eq('supplier_id', testSupplier.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Cross-validate data consistency
      expect(usageRecord.data.tokens_used).toBe(result.tokens)
      expect(usageRecord.data.cost).toBeCloseTo(result.cost, 4)
      expect(billingRecord.data.tokens).toBe(result.tokens)
      expect(billingRecord.data.cost_calculated).toBeCloseTo(result.cost, 4)
    })

    test('should handle transaction rollbacks on failure', async () => {
      if (!integrationMode) return

      const transactionTest = {
        supplierId: testSupplier.id,
        requestType: 'transaction_test',
        content: 'Test transaction rollback on failure',
        simulateFailure: 'after_processing' // Fail after processing but before commit
      }

      // Get initial state
      const initialSupplier = await supabase
        .from('suppliers')
        .select('ai_usage_current')
        .eq('id', testSupplier.id)
        .single()

      const initialUsage = initialSupplier.data.ai_usage_current

      // Process request that should fail and rollback
      try {
        await platformAIService.processRequest(transactionTest)
      } catch (error) {
        // Expected failure
      }

      // Verify rollback - usage should be unchanged
      const finalSupplier = await supabase
        .from('suppliers')
        .select('ai_usage_current')
        .eq('id', testSupplier.id)
        .single()

      expect(finalSupplier.data.ai_usage_current).toBe(initialUsage)
    })
  })
})