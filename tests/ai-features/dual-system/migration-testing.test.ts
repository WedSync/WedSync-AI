/**
 * WS-239 AI System Migration Testing
 * Critical testing for zero-downtime migrations between platform and client AI
 * Ensures wedding suppliers never lose AI functionality during transitions
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { AIMigrationService } from '@/lib/ai/migration-service'
import { AIHealthMonitor } from '@/lib/ai/health-monitor'
import { MigrationStateManager } from '@/lib/ai/migration-state-manager'
import { createMockWeddingVendor } from '../../setup'

// Mock database and external services
const mockDatabase = {
  updateSupplierAIConfig: vi.fn(),
  createMigrationRecord: vi.fn(),
  updateMigrationStatus: vi.fn(),
  rollbackMigration: vi.fn(),
  getSupplierAIUsage: vi.fn(),
  preserveMigrationSnapshot: vi.fn()
}

const mockNotificationService = {
  sendMigrationAlert: vi.fn(),
  sendMigrationSuccess: vi.fn(),
  sendMigrationFailure: vi.fn()
}

const mockAIProviders = {
  platform: {
    testConnection: vi.fn().mockResolvedValue(true),
    getCurrentUsage: vi.fn().mockResolvedValue({ tokens: 850, cost: 17.0 }),
    pauseRequests: vi.fn(),
    resumeRequests: vi.fn()
  },
  client: {
    validateApiKey: vi.fn().mockResolvedValue(true),
    testConnection: vi.fn().mockResolvedValue(true),
    estimateCosts: vi.fn().mockResolvedValue({ monthlyEstimate: 60.0 }),
    setupClientConfig: vi.fn()
  }
}

describe('AI Migration Testing - WS-239', () => {
  let migrationService: AIMigrationService
  let healthMonitor: AIHealthMonitor
  let stateManager: MigrationStateManager
  let photographyStudio: any
  let venueCoordinator: any

  beforeAll(() => {
    // Setup test environment with realistic wedding supplier data
    photographyStudio = createMockWeddingVendor({
      id: 'photography-capture-moments-001',
      name: 'Capture Moments Photography',
      service_type: 'photographer',
      subscription_tier: 'professional',
      ai_usage_current: 950, // Near platform limit
      ai_quota_monthly: 1000,
      monthly_weddings: 12,
      peak_season_multiplier: 1.6,
      location: 'London, UK'
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'venue-beautiful-gardens-002',
      name: 'Beautiful Gardens Venue',
      service_type: 'venue',
      subscription_tier: 'scale',
      ai_usage_current: 450,
      ai_quota_monthly: 2000,
      monthly_events: 8,
      has_mobile_team: true
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    healthMonitor = new AIHealthMonitor(mockAIProviders)
    stateManager = new MigrationStateManager(mockDatabase)
    migrationService = new AIMigrationService(
      mockAIProviders,
      healthMonitor,
      stateManager,
      mockNotificationService
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Platform to Client Migration', () => {
    test('should perform zero-downtime migration when approaching platform limits', async () => {
      const migrationStart = Date.now()
      
      // Wedding supplier hitting platform limits needs migration
      const migrationResult = await migrationService.migratePlatformToClient({
        supplierId: photographyStudio.id,
        clientApiKey: 'sk-test-client-key-photography-001',
        reason: 'platform_quota_exceeded',
        priority: 'high'
      })

      const migrationDuration = Date.now() - migrationStart
      
      expect(migrationResult.success).toBe(true)
      expect(migrationResult.downtime).toBe(0) // Zero downtime requirement
      expect(migrationDuration).toBeLessThan(5000) // Under 5 seconds
      expect(migrationResult.preservedData).toMatchObject({
        historicalUsage: expect.any(Object),
        costHistory: expect.any(Array),
        preferences: expect.any(Object)
      })

      // Verify database updates
      expect(mockDatabase.updateSupplierAIConfig).toHaveBeenCalledWith(
        photographyStudio.id,
        {
          ai_provider: 'client',
          client_api_key_encrypted: expect.any(String),
          migration_timestamp: expect.any(Date),
          previous_provider: 'platform'
        }
      )
    })

    test('should handle concurrent AI requests during migration without interruption', async () => {
      // Start migration process
      const migrationPromise = migrationService.migratePlatformToClient({
        supplierId: photographyStudio.id,
        clientApiKey: 'sk-test-concurrent-key',
        reason: 'proactive_migration'
      })

      // Simulate concurrent AI requests during migration
      const concurrentRequests = []
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          migrationService.processAIRequestDuringMigration({
            supplierId: photographyStudio.id,
            requestType: 'photo_tagging',
            content: `Photo batch ${i}`,
            estimatedTokens: 50
          })
        )
      }

      // Wait for migration and all concurrent requests
      const [migrationResult, ...requestResults] = await Promise.all([
        migrationPromise,
        ...concurrentRequests
      ])

      expect(migrationResult.success).toBe(true)
      expect(requestResults).toHaveLength(5)
      expect(requestResults.every(r => r.success)).toBe(true)
      
      // Verify no requests were dropped
      requestResults.forEach(result => {
        expect(result.status).not.toBe('dropped')
        expect(result.responseTime).toBeLessThan(10000) // Under 10s during migration
      })
    })

    test('should preserve cost tracking accuracy across migration boundary', async () => {
      // Get pre-migration usage data
      const preMigrationUsage = await migrationService.getSupplierUsageSnapshot(
        photographyStudio.id
      )

      // Perform migration
      const migrationResult = await migrationService.migratePlatformToClient({
        supplierId: photographyStudio.id,
        clientApiKey: 'sk-test-cost-tracking-key',
        reason: 'cost_optimization'
      })

      // Verify cost preservation
      expect(migrationResult.costTracking.preMigrationTotal).toBe(
        preMigrationUsage.totalCost
      )
      expect(migrationResult.costTracking.accuracy).toBeGreaterThan(99.9) // >99.9% accuracy
      expect(migrationResult.costTracking.migrationOverhead).toBeLessThan(0.01) // <1p overhead

      // Verify post-migration cost tracking
      const postMigrationUsage = await migrationService.getSupplierUsageSnapshot(
        photographyStudio.id
      )

      expect(postMigrationUsage.migrationPreservedCosts).toBe(
        preMigrationUsage.totalCost
      )
      expect(postMigrationUsage.provider).toBe('client')
    })

    test('should validate wedding season peak capacity during migration', async () => {
      // Mock June peak season
      vi.setSystemTime(new Date('2024-06-15'))
      
      // Setup high-usage photography studio
      const peakSeasonStudio = {
        ...photographyStudio,
        ai_usage_current: 900,
        peak_season_active: true,
        concurrent_weddings: 3 // Multiple weddings same weekend
      }

      const migrationResult = await migrationService.migratePlatformToClient({
        supplierId: peakSeasonStudio.id,
        clientApiKey: 'sk-test-peak-season-key',
        reason: 'peak_season_optimization',
        seasonContext: {
          isPeakSeason: true,
          multiplier: 1.6,
          concurrentWeddings: 3
        }
      })

      expect(migrationResult.success).toBe(true)
      expect(migrationResult.peakSeasonValidation.capacityCheck).toBe(true)
      expect(migrationResult.peakSeasonValidation.multiplierPreserved).toBe(1.6)
      
      // Verify no impact on concurrent wedding processing
      expect(migrationResult.concurrentWeddingImpact).toBe(0)
    })
  })

  describe('Client to Platform Migration', () => {
    test('should migrate from client back to platform when API key fails', async () => {
      // Setup client-based supplier
      const clientSupplier = {
        ...venueCoordinator,
        ai_provider: 'client',
        client_api_key: 'sk-failing-key-123'
      }

      // Mock API key failure
      mockAIProviders.client.validateApiKey.mockRejectedValueOnce(
        new Error('Invalid API key')
      )

      const migrationResult = await migrationService.migrateClientToPlatform({
        supplierId: clientSupplier.id,
        reason: 'client_api_failure',
        emergency: true
      })

      expect(migrationResult.success).toBe(true)
      expect(migrationResult.emergencyMigration).toBe(true)
      expect(migrationResult.downtime).toBe(0)
      
      // Verify immediate fallback to platform
      expect(migrationResult.fallbackProvider).toBe('platform')
      expect(migrationResult.responseTime).toBeLessThan(2000) // Emergency < 2s
    })

    test('should preserve client cost savings data during reverse migration', async () => {
      const clientSupplier = {
        ...venueCoordinator,
        ai_provider: 'client',
        client_monthly_costs: 45.0, // Lower than platform
        platform_equivalent_cost: 89.0
      }

      const migrationResult = await migrationService.migrateClientToPlatform({
        supplierId: clientSupplier.id,
        reason: 'simplification_request'
      })

      expect(migrationResult.costAnalysis.clientSavingsPreserved).toBe(44.0) // £89 - £45
      expect(migrationResult.costAnalysis.recommendationGenerated).toBe(true)
      expect(migrationResult.costAnalysis.futureOptimization).toBeDefined()
    })
  })

  describe('Migration Rollback Testing', () => {
    test('should automatically rollback failed migrations within 30 seconds', async () => {
      // Mock migration failure scenario
      mockAIProviders.client.setupClientConfig.mockRejectedValueOnce(
        new Error('Client setup failed')
      )

      const migrationStart = Date.now()
      
      const migrationResult = await migrationService.migratePlatformToClient({
        supplierId: photographyStudio.id,
        clientApiKey: 'sk-test-rollback-key',
        reason: 'test_rollback'
      })

      const rollbackDuration = Date.now() - migrationStart
      
      expect(migrationResult.success).toBe(false)
      expect(migrationResult.rollback.executed).toBe(true)
      expect(migrationResult.rollback.duration).toBeLessThan(30000) // Under 30s
      expect(rollbackDuration).toBeLessThan(45000) // Total under 45s
      
      // Verify system state restored
      expect(migrationResult.rollback.systemState).toBe('platform')
      expect(migrationResult.rollback.dataIntegrity).toBe('preserved')
    })

    test('should maintain AI service availability during rollback', async () => {
      // Setup rollback scenario
      mockDatabase.updateSupplierAIConfig.mockRejectedValueOnce(
        new Error('Database update failed')
      )

      // Start migration that will fail and rollback
      const migrationPromise = migrationService.migratePlatformToClient({
        supplierId: photographyStudio.id,
        clientApiKey: 'sk-test-availability-key',
        reason: 'test_availability_during_rollback'
      })

      // Test AI availability during rollback
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s into migration

      const aiAvailabilityTest = await migrationService.testAIAvailability(
        photographyStudio.id
      )

      const migrationResult = await migrationPromise

      expect(migrationResult.rollback.executed).toBe(true)
      expect(aiAvailabilityTest.available).toBe(true)
      expect(aiAvailabilityTest.provider).toBe('platform') // Should maintain platform during rollback
      expect(aiAvailabilityTest.responseTime).toBeLessThan(5000)
    })
  })

  describe('Bulk Migration Testing', () => {
    test('should handle bulk supplier migration with staggered execution', async () => {
      // Create multiple suppliers for bulk migration
      const bulkSuppliers = Array.from({ length: 50 }, (_, i) => 
        createMockWeddingVendor({
          id: `bulk-supplier-${i}`,
          service_type: i % 2 === 0 ? 'photographer' : 'venue',
          ai_usage_current: 800 + (i * 2), // Varying usage
          subscription_tier: 'professional'
        })
      )

      const bulkMigrationResult = await migrationService.bulkMigratePlatformToClient({
        suppliers: bulkSuppliers.map(s => ({
          supplierId: s.id,
          clientApiKey: `sk-bulk-key-${s.id}`,
          priority: s.service_type === 'photographer' ? 'high' : 'normal'
        })),
        staggering: {
          batchSize: 10,
          delayBetweenBatches: 5000 // 5s delay
        }
      })

      expect(bulkMigrationResult.totalSuppliers).toBe(50)
      expect(bulkMigrationResult.successfulMigrations).toBeGreaterThan(45) // >90% success rate
      expect(bulkMigrationResult.averageMigrationTime).toBeLessThan(8000) // <8s average
      expect(bulkMigrationResult.zeroDowntimeAchieved).toBe(true)

      // Verify staggered execution
      expect(bulkMigrationResult.executionPattern.batches).toBe(5) // 50/10 = 5 batches
      expect(bulkMigrationResult.executionPattern.totalDuration).toBeLessThan(60000) // <1 min total
    })

    test('should prioritize photography studios during wedding season bulk migration', async () => {
      vi.setSystemTime(new Date('2024-06-01')) // Wedding season start

      const mixedSuppliers = [
        ...Array.from({ length: 20 }, (_, i) => createMockWeddingVendor({
          id: `photo-studio-${i}`,
          service_type: 'photographer',
          peak_season_active: true
        })),
        ...Array.from({ length: 20 }, (_, i) => createMockWeddingVendor({
          id: `venue-${i}`,
          service_type: 'venue'
        }))
      ]

      const prioritizedMigration = await migrationService.bulkMigratePlatformToClient({
        suppliers: mixedSuppliers.map(s => ({
          supplierId: s.id,
          clientApiKey: `sk-priority-${s.id}`,
          priority: s.service_type === 'photographer' ? 'critical' : 'normal'
        })),
        seasonOptimization: true
      })

      // Verify photography studios migrated first
      const photographyMigrations = prioritizedMigration.migrationOrder
        .filter(m => m.supplierId.startsWith('photo-studio'))
      
      const firstTenMigrations = prioritizedMigration.migrationOrder.slice(0, 10)
      const photographyInFirstTen = firstTenMigrations
        .filter(m => m.supplierId.startsWith('photo-studio')).length

      expect(photographyInFirstTen).toBeGreaterThan(8) // Photography studios prioritized
      expect(prioritizedMigration.seasonOptimizationApplied).toBe(true)
    })
  })

  describe('Mobile and Offline Migration Support', () => {
    test('should handle migration for mobile-first suppliers', async () => {
      const mobileSupplier = createMockWeddingVendor({
        id: 'mobile-wedding-planner-001',
        service_type: 'wedding_planner',
        mobile_primary: true,
        offline_capable: true,
        field_work_percentage: 80 // 80% field work
      })

      const mobileMigration = await migrationService.migratePlatformToClient({
        supplierId: mobileSupplier.id,
        clientApiKey: 'sk-mobile-key-001',
        reason: 'mobile_optimization',
        mobileOptimizations: {
          offlineSync: true,
          lowBandwidthMode: true,
          batteryOptimization: true
        }
      })

      expect(mobileMigration.success).toBe(true)
      expect(mobileMigration.mobileOptimizations.offlineSyncEnabled).toBe(true)
      expect(mobileMigration.mobileOptimizations.bandwidthUsageReduced).toBeGreaterThan(30) // >30% reduction
      expect(mobileMigration.mobileOptimizations.batteryImpact).toBeLessThan(5) // <5% battery impact
    })

    test('should sync migration state when mobile device comes online', async () => {
      const mobileSupplier = {
        id: 'mobile-photographer-002',
        offline_pending_migration: true,
        last_online: new Date(Date.now() - 3600000) // 1 hour ago
      }

      const offlineSyncResult = await migrationService.syncOfflineMigration({
        supplierId: mobileSupplier.id,
        connectionType: '4G',
        pendingChanges: {
          aiProviderSwitch: 'client',
          newApiKey: 'sk-offline-sync-key'
        }
      })

      expect(offlineSyncResult.syncCompleted).toBe(true)
      expect(offlineSyncResult.dataIntegrity).toBe('verified')
      expect(offlineSyncResult.conflictsResolved).toBe(0)
      expect(offlineSyncResult.syncDuration).toBeLessThan(10000) // <10s sync
    })
  })

  describe('Wedding Day Emergency Migration', () => {
    test('should handle emergency migration on wedding day with absolute priority', async () => {
      // Saturday wedding day scenario
      vi.setSystemTime(new Date('2024-06-15T09:30:00')) // Saturday morning

      const weddingDaySupplier = createMockWeddingVendor({
        id: 'emergency-photographer-001',
        service_type: 'photographer',
        active_wedding_today: true,
        client_importance: 'critical',
        ai_provider: 'platform'
      })

      // Mock platform AI failure
      mockAIProviders.platform.testConnection.mockRejectedValueOnce(
        new Error('Platform AI service down')
      )

      const emergencyMigration = await migrationService.emergencyMigrationToClient({
        supplierId: weddingDaySupplier.id,
        clientApiKey: 'sk-emergency-wedding-day-key',
        reason: 'wedding_day_platform_failure',
        weddingContext: {
          isWeddingDay: true,
          weddingStartTime: '2024-06-15T14:00:00',
          criticalOperations: ['photo_tagging', 'timeline_updates']
        }
      })

      expect(emergencyMigration.success).toBe(true)
      expect(emergencyMigration.executionTime).toBeLessThan(1000) // <1s emergency response
      expect(emergencyMigration.weddingDayProtocol).toBe('activated')
      expect(emergencyMigration.criticalOperationsPreserved).toBe(true)
      
      // Verify immediate notification to supplier
      expect(mockNotificationService.sendMigrationAlert).toHaveBeenCalledWith({
        supplierId: weddingDaySupplier.id,
        priority: 'emergency',
        message: 'AI system migrated successfully - wedding day operations secure'
      })
    })

    test('should never allow wedding day AI service interruption', async () => {
      const weddingDayStudio = createMockWeddingVendor({
        active_wedding_today: true,
        wedding_day_protection: true
      })

      // Attempt migration during active wedding
      vi.setSystemTime(new Date('2024-06-15T15:30:00')) // During wedding ceremony

      const weddingDayMigration = await migrationService.migratePlatformToClient({
        supplierId: weddingDayStudio.id,
        clientApiKey: 'sk-wedding-day-test',
        reason: 'routine_migration'
      })

      // Should defer migration due to active wedding
      expect(weddingDayMigration.deferred).toBe(true)
      expect(weddingDayMigration.deferralReason).toBe('active_wedding_protection')
      expect(weddingDayMigration.scheduledFor).toMatch(/2024-06-16/) // Next day
      
      // Verify service continuity
      const serviceStatus = await migrationService.testAIAvailability(
        weddingDayStudio.id
      )
      expect(serviceStatus.available).toBe(true)
      expect(serviceStatus.protectionActive).toBe(true)
    })
  })
})