/**
 * WS-239 Dual AI System Router Tests
 * Comprehensive testing for platform vs client AI routing logic
 * Tests migration, failover, and cost tracking functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { DualAIRouter } from '@/lib/ai/dual-ai-router'
import { AIUsageTracker } from '@/lib/ai/usage-tracker'
import { createMockWeddingClient, createMockWeddingVendor } from '../../setup'

// Mock AI providers
const mockOpenAIClient = {
  completions: {
    create: vi.fn().mockResolvedValue({
      id: 'test-completion',
      choices: [{ message: { content: 'AI generated content' } }],
      usage: { total_tokens: 100 }
    })
  },
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'test-chat',
        choices: [{ message: { content: 'AI chat response' } }],
        usage: { total_tokens: 150 }
      })
    }
  }
}

const mockPlatformAI = {
  generateContent: vi.fn().mockResolvedValue({ 
    content: 'Platform AI content', 
    tokens: 100,
    cost: 0.002 
  }),
  checkRateLimits: vi.fn().mockResolvedValue(true),
  getRemainingQuota: vi.fn().mockResolvedValue(900)
}

const mockClientAI = {
  generateContent: vi.fn().mockResolvedValue({ 
    content: 'Client AI content', 
    tokens: 100,
    cost: 0.001 
  }),
  validateApiKey: vi.fn().mockResolvedValue(true),
  checkHealth: vi.fn().mockResolvedValue(true)
}

describe('Dual AI System Architecture - WS-239', () => {
  let dualAIRouter: DualAIRouter
  let usageTracker: AIUsageTracker
  let mockSupplier: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create test supplier
    mockSupplier = createMockWeddingVendor({
      id: 'photography-studio-001',
      service_type: 'photographer',
      subscription_tier: 'professional',
      ai_quota_monthly: 1000,
      ai_usage_current: 850, // Close to limit
      client_api_key: null
    })

    // Initialize services
    usageTracker = new AIUsageTracker()
    dualAIRouter = new DualAIRouter(mockPlatformAI, mockClientAI, usageTracker)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Platform AI Testing', () => {
    test('should route requests to platform AI within usage limits', async () => {
      // Setup: Supplier with room for platform usage
      mockSupplier.ai_usage_current = 500
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Wedding photo batch processing',
        estimatedTokens: 100
      })

      expect(mockPlatformAI.generateContent).toHaveBeenCalledWith({
        content: 'Wedding photo batch processing',
        tokens: 100,
        model: 'gpt-4o-mini'
      })
      expect(result.provider).toBe('platform')
      expect(result.cost).toBe(0.002)
    })

    test('should track platform usage accurately against tier limits', async () => {
      mockSupplier.ai_usage_current = 500
      
      await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'venue_description',
        content: 'Generate venue description for Beautiful Garden Venue',
        estimatedTokens: 200
      })

      // Verify usage tracking
      const updatedUsage = await usageTracker.getCurrentUsage(mockSupplier.id)
      expect(updatedUsage.monthlyUsage).toBe(700) // 500 + 200
      expect(updatedUsage.provider).toBe('platform')
      expect(updatedUsage.totalCost).toBeGreaterThan(0)
    })

    test('should handle platform AI rate limiting gracefully', async () => {
      // Mock rate limiting scenario
      mockPlatformAI.checkRateLimits.mockResolvedValueOnce(false)
      mockPlatformAI.generateContent.mockRejectedValueOnce(new Error('Rate limited'))

      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'menu_generation',
        content: 'Create wedding menu suggestions',
        estimatedTokens: 150
      })

      // Should fall back to client AI or queue for retry
      expect(result.status).toBe('queued_for_retry')
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    test('should calculate platform overage costs correctly', async () => {
      // Setup: Supplier at 95% usage (950/1000)
      mockSupplier.ai_usage_current = 950
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Large photo batch - 100 photos',
        estimatedTokens: 100 // Will exceed limit
      })

      // Should calculate overage cost
      expect(result.overageTokens).toBe(50) // 950 + 100 - 1000
      expect(result.overageCost).toBeGreaterThan(0)
      expect(result.billing.baseUsage).toBe(1000)
      expect(result.billing.overageUsage).toBe(50)
    })
  })

  describe('Client AI Testing', () => {
    test('should validate client API keys before usage', async () => {
      mockSupplier.client_api_key = 'sk-test-valid-key-123'
      
      await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'event_planning',
        content: 'Create wedding timeline',
        estimatedTokens: 200
      })

      expect(mockClientAI.validateApiKey).toHaveBeenCalledWith('sk-test-valid-key-123')
    })

    test('should route requests to client AI with valid keys', async () => {
      mockSupplier.client_api_key = 'sk-test-valid-key-123'
      mockSupplier.ai_usage_current = 950 // Force client routing
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Wedding photo processing',
        estimatedTokens: 200
      })

      expect(mockClientAI.generateContent).toHaveBeenCalled()
      expect(result.provider).toBe('client')
      expect(result.apiKeyUsed).toBe('sk-test-valid-key-123')
    })

    test('should track client costs accurately in real-time', async () => {
      mockSupplier.client_api_key = 'sk-test-valid-key-123'
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'menu_planning',
        content: 'Generate dietary-friendly menu options',
        estimatedTokens: 300
      })

      // Client AI should be more cost-effective
      expect(result.cost).toBeLessThan(0.01) // Lower than platform cost
      expect(result.billing.provider).toBe('client')
      expect(result.billing.externalProvider).toBe('openai')
    })

    test('should handle client API key rotation seamlessly', async () => {
      const oldKey = 'sk-test-old-key-123'
      const newKey = 'sk-test-new-key-456'
      
      mockSupplier.client_api_key = oldKey
      
      // First request with old key
      await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'vendor_communication',
        content: 'Draft vendor email',
        estimatedTokens: 150
      })

      // Rotate key
      await dualAIRouter.rotateClientKey(mockSupplier.id, newKey)

      // Verify new key is used
      mockSupplier.client_api_key = newKey
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'vendor_communication',
        content: 'Follow-up vendor email',
        estimatedTokens: 150
      })

      expect(result.apiKeyUsed).toBe(newKey)
      expect(mockClientAI.validateApiKey).toHaveBeenCalledWith(newKey)
    })
  })

  describe('Migration Testing', () => {
    test('should migrate from platform to client without service interruption', async () => {
      // Start with platform usage at limit
      mockSupplier.ai_usage_current = 990
      mockSupplier.client_api_key = null

      // Setup client API key (migration trigger)
      const migrationResult = await dualAIRouter.initiateClientMigration({
        supplierId: mockSupplier.id,
        clientApiKey: 'sk-test-migration-key-789'
      })

      expect(migrationResult.status).toBe('migration_initiated')
      expect(migrationResult.downtime).toBe(0)
      
      // Subsequent requests should use client AI
      mockSupplier.client_api_key = 'sk-test-migration-key-789'
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Post-migration photo processing',
        estimatedTokens: 200
      })

      expect(result.provider).toBe('client')
      expect(result.migrationStatus).toBe('completed')
    })

    test('should migrate from client to platform with data preservation', async () => {
      // Start with client setup
      mockSupplier.client_api_key = 'sk-test-client-key-123'
      mockSupplier.ai_provider_preference = 'client'
      
      // Initiate reverse migration (client to platform)
      const migrationResult = await dualAIRouter.migrateToPlaceholder({
        supplierId: mockSupplier.id,
        reason: 'cost_optimization'
      })

      expect(migrationResult.dataPreserved).toBe(true)
      expect(migrationResult.historicalCosts).toBeDefined()
      expect(migrationResult.usageHistory).toBeDefined()
    })

    test('should rollback failed migrations automatically', async () => {
      mockSupplier.ai_usage_current = 950
      
      // Mock migration failure
      mockClientAI.validateApiKey.mockRejectedValueOnce(new Error('Invalid API key'))
      
      const migrationResult = await dualAIRouter.initiateClientMigration({
        supplierId: mockSupplier.id,
        clientApiKey: 'sk-invalid-key'
      })

      expect(migrationResult.status).toBe('migration_failed')
      expect(migrationResult.rollbackStatus).toBe('completed')
      
      // Verify fallback to platform
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Fallback photo processing',
        estimatedTokens: 100
      })

      expect(result.provider).toBe('platform')
    })

    test('should maintain cost tracking accuracy during migration', async () => {
      const preMigrationUsage = await usageTracker.getCurrentUsage(mockSupplier.id)
      
      await dualAIRouter.initiateClientMigration({
        supplierId: mockSupplier.id,
        clientApiKey: 'sk-test-migration-accuracy'
      })

      const postMigrationUsage = await usageTracker.getCurrentUsage(mockSupplier.id)
      
      // Verify cost tracking continuity
      expect(postMigrationUsage.migrationPreservedCosts).toBe(preMigrationUsage.totalCost)
      expect(postMigrationUsage.provider).toBe('client')
      expect(postMigrationUsage.migrationTimestamp).toBeDefined()
    })
  })

  describe('Wedding Season Load Testing', () => {
    test('should handle peak season (March-Oct) with 1.6x cost multiplier', async () => {
      // Mock June wedding season
      vi.setSystemTime(new Date('2024-06-15'))
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'photo_tagging',
        content: 'Peak season photo processing',
        estimatedTokens: 200
      })

      expect(result.seasonMultiplier).toBe(1.6)
      expect(result.cost).toBe(0.002 * 1.6) // Base cost * season multiplier
      expect(result.isPeakSeason).toBe(true)
    })

    test('should optimize provider selection during high volume periods', async () => {
      // Mock high concurrent usage
      const concurrentRequests = []
      
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          dualAIRouter.processRequest({
            supplierId: `supplier-${i}`,
            requestType: 'venue_description',
            content: `Venue description ${i}`,
            estimatedTokens: 150
          })
        )
      }

      const results = await Promise.all(concurrentRequests)
      
      // Verify load balancing
      const platformRequests = results.filter(r => r.provider === 'platform').length
      const clientRequests = results.filter(r => r.provider === 'client').length
      
      expect(platformRequests + clientRequests).toBe(10)
      expect(results.every(r => r.responseTime < 5000)).toBe(true) // Under 5s
    })
  })

  describe('Error Handling and Resilience', () => {
    test('should handle provider failures gracefully', async () => {
      mockPlatformAI.generateContent.mockRejectedValueOnce(new Error('Platform AI unavailable'))
      mockSupplier.client_api_key = 'sk-test-failover-key'
      
      const result = await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'emergency_response',
        content: 'Critical wedding day issue',
        estimatedTokens: 100
      })

      expect(result.provider).toBe('client') // Failover successful
      expect(result.failoverReason).toBe('platform_unavailable')
      expect(result.content).toBe('Client AI content')
    })

    test('should maintain audit trail for all operations', async () => {
      await dualAIRouter.processRequest({
        supplierId: mockSupplier.id,
        requestType: 'audit_test',
        content: 'Audit trail verification',
        estimatedTokens: 100
      })

      const auditLogs = await dualAIRouter.getAuditTrail(mockSupplier.id)
      
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0]).toMatchObject({
        supplierId: mockSupplier.id,
        requestType: 'audit_test',
        provider: 'platform',
        timestamp: expect.any(Date),
        cost: expect.any(Number),
        tokens: 100
      })
    })
  })

  describe('Wedding Industry Specific Scenarios', () => {
    test('should handle photography studio peak season workflows', async () => {
      const photographyStudio = createMockWeddingVendor({
        service_type: 'photographer',
        subscription_tier: 'professional',
        ai_usage_current: 850, // Near limit
        peak_season_active: true
      })

      const batchPhotoTagging = await dualAIRouter.processBatchRequest({
        supplierId: photographyStudio.id,
        requestType: 'photo_batch_tagging',
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `photo-${i}`,
          content: `Wedding photo ${i} - bride and groom moments`,
          estimatedTokens: 20
        }))
      })

      expect(batchPhotoTagging.totalTokens).toBe(1000) // 50 * 20
      expect(batchPhotoTagging.results).toHaveLength(50)
      expect(batchPhotoTagging.avgProcessingTime).toBeLessThan(500) // Under 500ms avg
    })

    test('should optimize venue coordinator AI usage during client meetings', async () => {
      const venueCoordinator = createMockWeddingVendor({
        service_type: 'venue',
        subscription_tier: 'scale',
        mobile_optimization: true
      })

      const mobileOptimizedRequest = await dualAIRouter.processRequest({
        supplierId: venueCoordinator.id,
        requestType: 'venue_presentation',
        content: 'Generate compelling venue description for client meeting',
        estimatedTokens: 300,
        context: {
          isMobile: true,
          clientMeeting: true,
          priority: 'high'
        }
      })

      expect(mobileOptimizedRequest.mobileOptimized).toBe(true)
      expect(mobileOptimizedRequest.priority).toBe('high')
      expect(mobileOptimizedRequest.responseTime).toBeLessThan(2000) // Under 2s for meetings
    })
  })
})