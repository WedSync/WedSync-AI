/**
 * WS-239 Client AI Integration Testing
 * Integration tests for client AI systems (OpenAI, Anthropic) with supplier keys
 * Tests secure key management, real provider connections, and cost tracking
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClientAIService } from '@/lib/ai/client-ai-service'
import { APIKeyManager } from '@/lib/ai/api-key-manager'
import { ClientCostTracker } from '@/lib/ai/client-cost-tracker'
import { supabase } from '@/lib/supabase'
import { createMockWeddingVendor } from '../../setup'

// Integration test configuration
const integrationMode = process.env.INTEGRATION_TEST_MODE === 'true'
const testClientKeys = {
  openai: process.env.TEST_CLIENT_OPENAI_KEY || 'sk-test-client-openai-key',
  anthropic: process.env.TEST_CLIENT_ANTHROPIC_KEY || 'sk-ant-test-client-key'
}

// Mock external provider APIs for testing
const mockProviderResponses = {
  openai: {
    id: 'chatcmpl-test-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o-mini',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'Professional wedding photo tags: bride, groom, ceremony, rings, floral arrangements, candid moment'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 45,
      completion_tokens: 18,
      total_tokens: 63
    }
  },
  anthropic: {
    id: 'msg-test-456',
    type: 'message',
    role: 'assistant',
    content: [{
      type: 'text',
      text: 'Elegant venue description: This stunning garden venue offers a perfect blend of natural beauty and sophisticated amenities for your special day.'
    }],
    model: 'claude-3-sonnet-20240229',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 52,
      output_tokens: 24
    }
  }
}

describe('Client AI Integration Testing - WS-239', () => {
  let clientAIService: ClientAIService
  let apiKeyManager: APIKeyManager
  let costTracker: ClientCostTracker
  let photographyStudio: any
  let venueCoordinator: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup test suppliers
    photographyStudio = createMockWeddingVendor({
      id: 'client-ai-photo-studio-001',
      service_type: 'photographer',
      subscription_tier: 'professional',
      client_ai_enabled: true,
      cost_optimization_active: true
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'client-ai-venue-002',
      service_type: 'venue',
      subscription_tier: 'scale',
      multi_provider_setup: true,
      client_ai_providers: ['openai', 'anthropic']
    })

    // Initialize services
    if (integrationMode) {
      apiKeyManager = new APIKeyManager({
        encryptionKey: process.env.ENCRYPTION_KEY,
        database: supabase
      })
      costTracker = new ClientCostTracker(supabase)
      clientAIService = new ClientAIService(apiKeyManager, costTracker)

      // Setup test data in database
      await supabase.from('suppliers').upsert([photographyStudio, venueCoordinator])
    } else {
      // Mock services for unit testing
      apiKeyManager = {
        getClientKey: vi.fn().mockResolvedValue({ apiKey: 'mock-key', success: true }),
        validateKey: vi.fn().mockResolvedValue({ valid: true }),
        storeClientKey: vi.fn().mockResolvedValue({ success: true })
      } as any
      
      costTracker = {
        trackCost: vi.fn(),
        getCurrentCosts: vi.fn(),
        calculateMonthlyProjection: vi.fn()
      } as any
      
      clientAIService = new ClientAIService(apiKeyManager, costTracker)
    }
  })

  afterEach(async () => {
    if (integrationMode) {
      // Clean up test data
      await supabase.from('client_ai_costs').delete().in('supplier_id', [
        photographyStudio.id, 
        venueCoordinator.id
      ])
      await supabase.from('encrypted_api_keys').delete().in('supplier_id', [
        photographyStudio.id,
        venueCoordinator.id
      ])
      await supabase.from('suppliers').delete().in('id', [
        photographyStudio.id,
        venueCoordinator.id
      ])
    }
    vi.restoreAllMocks()
  })

  describe('OpenAI Client Integration', () => {
    test('should integrate with OpenAI API using supplier keys', async () => {
      if (!integrationMode) return

      // Store encrypted client key
      const keyResult = await apiKeyManager.storeClientKey({
        supplierId: photographyStudio.id,
        provider: 'openai',
        apiKey: testClientKeys.openai,
        keyName: 'Photography Studio Primary'
      })
      expect(keyResult.success).toBe(true)

      // Process AI request using client key
      const aiRequest = {
        supplierId: photographyStudio.id,
        provider: 'openai',
        model: 'gpt-4o-mini',
        requestType: 'photo_tagging',
        prompt: 'Analyze this wedding photo and provide professional tags: Bride in white dress, groom in black suit, outdoor ceremony with floral arch',
        maxTokens: 100
      }

      const result = await clientAIService.processClientRequest(aiRequest)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('openai')
      expect(result.model).toBe('gpt-4o-mini')
      expect(result.content).toBeDefined()
      expect(result.usage.total_tokens).toBeGreaterThan(0)
      expect(result.cost).toBeGreaterThan(0)

      // Verify cost tracking in database
      const costRecord = await supabase
        .from('client_ai_costs')
        .select('*')
        .eq('supplier_id', photographyStudio.id)
        .eq('provider', 'openai')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      expect(costRecord.data).toBeDefined()
      expect(costRecord.data.tokens_used).toBe(result.usage.total_tokens)
      expect(costRecord.data.cost_calculated).toBeCloseTo(result.cost, 6)
    })

    test('should handle OpenAI API key validation and health checks', async () => {
      if (!integrationMode) return

      const keyValidation = await clientAIService.validateClientKey({
        supplierId: photographyStudio.id,
        provider: 'openai',
        apiKey: testClientKeys.openai
      })

      expect(keyValidation.valid).toBe(true)
      expect(keyValidation.credits).toBeDefined()
      expect(keyValidation.usage_limits).toBeDefined()
      expect(keyValidation.health_status).toBe('healthy')

      // Test invalid key
      const invalidKeyValidation = await clientAIService.validateClientKey({
        supplierId: photographyStudio.id,
        provider: 'openai',
        apiKey: 'sk-invalid-key-format-123'
      })

      expect(invalidKeyValidation.valid).toBe(false)
      expect(invalidKeyValidation.error).toBeDefined()
    })

    test('should track OpenAI costs accurately with real pricing', async () => {
      if (!integrationMode) return

      const costTrackingRequests = [
        {
          model: 'gpt-4o-mini',
          input_tokens: 500,
          output_tokens: 100,
          requestType: 'photo_tagging'
        },
        {
          model: 'gpt-4o-mini',
          input_tokens: 300,
          output_tokens: 80,
          requestType: 'venue_description'
        },
        {
          model: 'gpt-4o',
          input_tokens: 200,
          output_tokens: 50,
          requestType: 'premium_content'
        }
      ]

      let totalCost = 0
      const costResults = []

      for (const request of costTrackingRequests) {
        const result = await clientAIService.processClientRequest({
          supplierId: photographyStudio.id,
          provider: 'openai',
          model: request.model,
          requestType: request.requestType,
          prompt: `Generate ${request.requestType} content`,
          simulateTokenUsage: {
            input: request.input_tokens,
            output: request.output_tokens
          }
        })

        totalCost += result.cost
        costResults.push(result)
      }

      // Verify cost calculation accuracy
      const monthlyCosts = await costTracker.getCurrentCosts({
        supplierId: photographyStudio.id,
        provider: 'openai',
        period: 'current_month'
      })

      expect(monthlyCosts.total_cost).toBeCloseTo(totalCost, 4)
      expect(monthlyCosts.requests_count).toBe(3)
      expect(monthlyCosts.models_used).toContain('gpt-4o-mini')
      expect(monthlyCosts.models_used).toContain('gpt-4o')
    })
  })

  describe('Anthropic Client Integration', () => {
    test('should integrate with Anthropic API using supplier keys', async () => {
      if (!integrationMode) return

      // Store encrypted Anthropic key
      const keyResult = await apiKeyManager.storeClientKey({
        supplierId: venueCoordinator.id,
        provider: 'anthropic',
        apiKey: testClientKeys.anthropic,
        keyName: 'Venue Anthropic Key'
      })
      expect(keyResult.success).toBe(true)

      const aiRequest = {
        supplierId: venueCoordinator.id,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        requestType: 'venue_description',
        prompt: 'Write an elegant description for a garden wedding venue with capacity for 150 guests, featuring a gazebo ceremony area and indoor reception hall',
        maxTokens: 200
      }

      const result = await clientAIService.processClientRequest(aiRequest)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('anthropic')
      expect(result.model).toBe('claude-3-sonnet-20240229')
      expect(result.content).toBeDefined()
      expect(result.usage.input_tokens).toBeGreaterThan(0)
      expect(result.usage.output_tokens).toBeGreaterThan(0)
      expect(result.cost).toBeGreaterThan(0)

      // Verify professional venue language
      expect(result.content.toLowerCase()).toMatch(/elegant|sophisticated|beautiful|stunning/)
    })

    test('should handle multi-provider setup and routing', async () => {
      if (!integrationMode) return

      // Setup both OpenAI and Anthropic keys
      await apiKeyManager.storeClientKey({
        supplierId: venueCoordinator.id,
        provider: 'openai',
        apiKey: testClientKeys.openai,
        primary: false
      })

      await apiKeyManager.storeClientKey({
        supplierId: venueCoordinator.id,
        provider: 'anthropic', 
        apiKey: testClientKeys.anthropic,
        primary: true // Primary provider
      })

      const multiProviderRequest = {
        supplierId: venueCoordinator.id,
        requestType: 'content_generation',
        prompt: 'Generate professional wedding venue marketing content',
        preferredProvider: 'anthropic',
        fallbackProvider: 'openai'
      }

      const result = await clientAIService.processMultiProviderRequest(multiProviderRequest)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('anthropic') // Should use preferred
      expect(result.fallbackAvailable).toBe(true)

      // Test fallback scenario
      const fallbackRequest = {
        ...multiProviderRequest,
        simulateProviderFailure: 'anthropic'
      }

      const fallbackResult = await clientAIService.processMultiProviderRequest(fallbackRequest)

      expect(fallbackResult.success).toBe(true)
      expect(fallbackResult.provider).toBe('openai') // Should fallback
      expect(fallbackResult.fallbackUsed).toBe(true)
    })
  })

  describe('Cost Optimization Integration', () => {
    test('should optimize costs by comparing providers', async () => {
      if (!integrationMode) return

      const costComparison = await clientAIService.compareCosts({
        supplierId: venueCoordinator.id,
        requestType: 'venue_description',
        estimatedTokens: 500,
        providers: ['openai', 'anthropic'],
        period: 'monthly'
      })

      expect(costComparison.providers).toHaveLength(2)
      expect(costComparison.cheapest_provider).toBeDefined()
      expect(costComparison.cost_savings).toBeGreaterThanOrEqual(0)
      expect(costComparison.recommendation).toBeDefined()

      // Verify recommendation accuracy
      const cheapestCost = Math.min(...costComparison.providers.map(p => p.monthly_cost))
      const cheapestProvider = costComparison.providers.find(p => p.monthly_cost === cheapestCost)
      
      expect(costComparison.cheapest_provider).toBe(cheapestProvider.provider)
    })

    test('should track savings from platform to client migration', async () => {
      if (!integrationMode) return

      // Simulate platform usage cost
      const platformCost = 25.60 // £25.60/month for overage
      
      // Process equivalent requests with client AI
      const clientRequests = Array.from({ length: 10 }, (_, i) => ({
        supplierId: photographyStudio.id,
        provider: 'openai',
        model: 'gpt-4o-mini',
        requestType: 'photo_tagging',
        prompt: `Photo tagging request ${i}`,
        estimatedTokens: 100
      }))

      const clientResults = await Promise.all(
        clientRequests.map(req => clientAIService.processClientRequest(req))
      )

      const totalClientCost = clientResults.reduce((sum, result) => sum + result.cost, 0)

      const savingsAnalysis = await clientAIService.calculateSavings({
        supplierId: photographyStudio.id,
        platform_cost: platformCost,
        client_cost: totalClientCost,
        period: 'monthly'
      })

      expect(savingsAnalysis.monthly_savings).toBeGreaterThan(0)
      expect(savingsAnalysis.savings_percentage).toBeGreaterThan(0)
      expect(savingsAnalysis.payback_period_days).toBe(0) // Immediate savings
      expect(savingsAnalysis.annual_savings).toBe(savingsAnalysis.monthly_savings * 12)
    })

    test('should provide cost projections based on usage patterns', async () => {
      if (!integrationMode) return

      // Simulate historical usage pattern
      const usagePattern = {
        supplierId: photographyStudio.id,
        provider: 'openai',
        historical_months: [
          { month: '2024-01', tokens: 5000, cost: 2.50 },
          { month: '2024-02', tokens: 6200, cost: 3.10 },
          { month: '2024-03', tokens: 8500, cost: 4.25 }, // Peak season start
          { month: '2024-04', tokens: 12000, cost: 6.00 },
          { month: '2024-05', tokens: 15000, cost: 7.50 }
        ]
      }

      const projection = await costTracker.projectFutureCosts(usagePattern)

      expect(projection.june_projection).toBeGreaterThan(7.50) // Peak season
      expect(projection.annual_projection).toBeDefined()
      expect(projection.peak_season_impact).toBeGreaterThan(1.0) // Multiplier effect
      expect(projection.confidence_level).toBeGreaterThan(0.8)
    })
  })

  describe('Security and Compliance Integration', () => {
    test('should encrypt and securely store client API keys', async () => {
      if (!integrationMode) return

      const secureKeyStorage = await apiKeyManager.storeClientKey({
        supplierId: photographyStudio.id,
        provider: 'openai',
        apiKey: testClientKeys.openai,
        keyName: 'Secure Test Key',
        securityLevel: 'high'
      })

      expect(secureKeyStorage.success).toBe(true)
      expect(secureKeyStorage.encrypted).toBe(true)
      expect(secureKeyStorage.keyHash).toBeDefined()

      // Verify key is encrypted in database
      const storedKey = await supabase
        .from('encrypted_api_keys')
        .select('encrypted_key, key_hash')
        .eq('supplier_id', photographyStudio.id)
        .eq('provider', 'openai')
        .single()

      expect(storedKey.data.encrypted_key).not.toBe(testClientKeys.openai)
      expect(storedKey.data.key_hash).toBeDefined()
      expect(storedKey.data.encrypted_key.startsWith('encrypted_')).toBe(true)
    })

    test('should audit all client AI operations', async () => {
      if (!integrationMode) return

      const auditedRequest = {
        supplierId: venueCoordinator.id,
        provider: 'anthropic',
        requestType: 'venue_description',
        prompt: 'Generate venue description',
        auditRequired: true
      }

      const result = await clientAIService.processClientRequest(auditedRequest)
      expect(result.success).toBe(true)

      // Verify audit log entry
      const auditLog = await supabase
        .from('client_ai_audit_log')
        .select('*')
        .eq('supplier_id', venueCoordinator.id)
        .eq('request_id', result.requestId)
        .single()

      expect(auditLog.data).toBeDefined()
      expect(auditLog.data.provider).toBe('anthropic')
      expect(auditLog.data.cost_tracked).toBe(true)
      expect(auditLog.data.compliance_verified).toBe(true)
    })

    test('should handle GDPR compliance for EU suppliers', async () => {
      if (!integrationMode) return

      const euSupplier = createMockWeddingVendor({
        id: 'eu-supplier-gdpr-test',
        location: 'Berlin, Germany',
        gdpr_required: true,
        data_residency: 'EU'
      })

      await supabase.from('suppliers').upsert(euSupplier)

      const gdprCompliantRequest = {
        supplierId: euSupplier.id,
        provider: 'openai',
        requestType: 'venue_description',
        prompt: 'Generate GDPR-compliant venue description',
        gdprCompliance: {
          dataResidency: 'EU',
          consentBasis: 'legitimate_interest',
          retention_period: '7_years'
        }
      }

      const result = await clientAIService.processGDPRCompliantRequest(gdprCompliantRequest)

      expect(result.success).toBe(true)
      expect(result.gdpr_compliant).toBe(true)
      expect(result.data_residency_verified).toBe(true)
      expect(result.consent_basis_logged).toBe(true)

      // Cleanup
      await supabase.from('suppliers').delete().eq('id', euSupplier.id)
    })
  })

  describe('Real-World Wedding Workflow Integration', () => {
    test('should handle complete venue tour documentation workflow', async () => {
      if (!integrationMode) return

      const venueTourWorkflow = [
        {
          area: 'ceremony_space',
          prompt: 'Describe outdoor ceremony area with garden setting, natural arch, seating for 100 guests'
        },
        {
          area: 'cocktail_area',
          prompt: 'Detail cocktail hour space with bar setup, networking areas, photo opportunities'
        },
        {
          area: 'reception_hall',
          prompt: 'Comprehensive reception hall description including lighting, acoustics, capacity'
        },
        {
          area: 'bridal_suite',
          prompt: 'Bridal preparation suite with amenities, natural lighting, photography considerations'
        }
      ]

      const workflowResults = []
      let totalCost = 0

      for (const area of venueTourWorkflow) {
        const result = await clientAIService.processClientRequest({
          supplierId: venueCoordinator.id,
          provider: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          requestType: 'venue_area_description',
          prompt: area.prompt,
          workflow_context: {
            area: area.area,
            tour_phase: 'documentation'
          }
        })

        expect(result.success).toBe(true)
        totalCost += result.cost
        workflowResults.push(result)
      }

      // Verify workflow completion
      expect(workflowResults).toHaveLength(4)
      expect(totalCost).toBeLessThan(2.00) // Should be cost-effective

      // Verify workflow tracking
      const workflowRecord = await supabase
        .from('ai_workflows')
        .select('*')
        .eq('supplier_id', venueCoordinator.id)
        .eq('workflow_type', 'venue_tour_documentation')
        .single()

      expect(workflowRecord.data).toBeDefined()
      expect(workflowRecord.data.areas_documented).toBe(4)
      expect(workflowRecord.data.total_cost).toBeCloseTo(totalCost, 4)
    })

    test('should handle photography studio batch processing workflow', async () => {
      if (!integrationMode) return

      const batchProcessingWorkflow = {
        supplierId: photographyStudio.id,
        provider: 'openai',
        model: 'gpt-4o-mini',
        batch_size: 20,
        photos: Array.from({ length: 20 }, (_, i) => ({
          id: `batch-photo-${i}`,
          description: `Wedding photo ${i}: various ceremony and reception moments`
        }))
      }

      const batchResult = await clientAIService.processBatchRequest(batchProcessingWorkflow)

      expect(batchResult.success).toBe(true)
      expect(batchResult.processed_count).toBe(20)
      expect(batchResult.failed_count).toBe(0)
      expect(batchResult.total_cost).toBeGreaterThan(0)
      expect(batchResult.processing_time).toBeLessThan(30000) // <30s for batch

      // Verify each photo was processed
      batchResult.results.forEach((result, index) => {
        expect(result.photo_id).toBe(`batch-photo-${index}`)
        expect(result.tags).toBeInstanceOf(Array)
        expect(result.confidence).toBeGreaterThan(0.7)
      })
    })

    test('should handle emergency wedding day scenario', async () => {
      if (!integrationMode) return

      const emergencyScenario = {
        supplierId: photographyStudio.id,
        provider: 'openai',
        requestType: 'emergency_response',
        prompt: 'Emergency: Rain during outdoor ceremony, need immediate backup indoor setup suggestions and timeline adjustments',
        priority: 'critical',
        wedding_day: true,
        emergency_type: 'weather'
      }

      const emergencyResult = await clientAIService.processEmergencyRequest(emergencyScenario)

      expect(emergencyResult.success).toBe(true)
      expect(emergencyResult.response_time).toBeLessThan(2000) // <2s emergency response
      expect(emergencyResult.priority_processing).toBe(true)
      expect(emergencyResult.wedding_day_protocol).toBe(true)
      
      // Verify emergency content is actionable
      expect(emergencyResult.content).toMatch(/indoor|backup|timeline|immediate/i)
      
      // Verify emergency was logged
      const emergencyLog = await supabase
        .from('emergency_ai_responses')
        .select('*')
        .eq('supplier_id', photographyStudio.id)
        .eq('emergency_type', 'weather')
        .single()

      expect(emergencyLog.data).toBeDefined()
      expect(emergencyLog.data.response_time_ms).toBeLessThan(2000)
      expect(emergencyLog.data.resolution_provided).toBe(true)
    })
  })
})