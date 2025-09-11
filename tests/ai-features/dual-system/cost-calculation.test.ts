/**
 * WS-239 AI Cost Calculation Testing
 * Critical testing for accurate cost tracking across platform and client systems
 * Ensures wedding suppliers get precise billing and cost projections
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { AICostCalculator } from '@/lib/ai/cost-calculator'
import { BillingEngine } from '@/lib/ai/billing-engine'
import { TierLimitManager } from '@/lib/ai/tier-limit-manager'
import { createMockWeddingVendor } from '../../setup'

// Mock external pricing APIs
const mockOpenAIPricing = {
  'gpt-4o-mini': {
    input: 0.00015, // per 1K tokens
    output: 0.0006  // per 1K tokens
  },
  'gpt-4o': {
    input: 0.005,   // per 1K tokens  
    output: 0.015   // per 1K tokens
  }
}

const mockPlatformPricing = {
  starter: { quota: 100, overage: 0.01 },      // £0.01 per token over limit
  professional: { quota: 1000, overage: 0.008 }, // £0.008 per token over limit
  scale: { quota: 2000, overage: 0.006 },        // £0.006 per token over limit
  enterprise: { quota: 5000, overage: 0.004 }    // £0.004 per token over limit
}

describe('AI Cost Calculation Testing - WS-239', () => {
  let costCalculator: AICostCalculator
  let billingEngine: BillingEngine
  let tierManager: TierLimitManager
  let photographyStudio: any
  let venueCoordinator: any
  let weddingPlanner: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup realistic wedding suppliers
    photographyStudio = createMockWeddingVendor({
      id: 'photography-golden-hour-001',
      service_type: 'photographer',
      subscription_tier: 'professional', // £49/month + AI costs
      ai_usage_current: 850,
      ai_quota_monthly: 1000,
      monthly_weddings: 15,
      avg_photos_per_wedding: 500,
      ai_usage_pattern: 'photo_heavy'
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'venue-elegant-manor-002',
      service_type: 'venue',
      subscription_tier: 'scale', // £79/month + AI costs
      ai_usage_current: 1200,
      ai_quota_monthly: 2000,
      monthly_events: 8,
      ai_usage_pattern: 'description_heavy'
    })

    weddingPlanner = createMockWeddingVendor({
      id: 'planner-dream-weddings-003',
      service_type: 'wedding_planner',
      subscription_tier: 'enterprise', // £149/month + AI costs
      ai_usage_current: 3500,
      ai_quota_monthly: 5000,
      client_portfolio: 25,
      ai_usage_pattern: 'comprehensive'
    })

    costCalculator = new AICostCalculator(mockOpenAIPricing, mockPlatformPricing)
    tierManager = new TierLimitManager(mockPlatformPricing)
    billingEngine = new BillingEngine(costCalculator, tierManager)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Platform AI Cost Calculation', () => {
    test('should calculate platform costs accurately for professional tier', async () => {
      const usageScenario = {
        supplierId: photographyStudio.id,
        tier: 'professional',
        tokensUsed: 950, // Within quota
        requestType: 'photo_tagging',
        model: 'gpt-4o-mini'
      }

      const costCalculation = await costCalculator.calculatePlatformCost(usageScenario)

      expect(costCalculation.withinQuota).toBe(true)
      expect(costCalculation.quotaUsed).toBe(950)
      expect(costCalculation.quotaRemaining).toBe(50) // 1000 - 950
      expect(costCalculation.baseCost).toBe(0) // Included in subscription
      expect(costCalculation.overageCost).toBe(0)
      expect(costCalculation.totalCost).toBe(0)
      expect(costCalculation.tier).toBe('professional')
    })

    test('should calculate overage costs correctly when exceeding tier limits', async () => {
      const overageScenario = {
        supplierId: photographyStudio.id,
        tier: 'professional',
        tokensUsed: 1150, // 150 over quota
        requestType: 'photo_batch_processing',
        model: 'gpt-4o-mini'
      }

      const costCalculation = await costCalculator.calculatePlatformCost(overageScenario)

      expect(costCalculation.withinQuota).toBe(false)
      expect(costCalculation.quotaExceeded).toBe(150) // 1150 - 1000
      expect(costCalculation.overageCost).toBe(1.2) // 150 * £0.008
      expect(costCalculation.totalCost).toBe(1.2)
      
      // Verify overage rate for professional tier
      expect(costCalculation.overageRate).toBe(0.008)
    })

    test('should handle wedding season cost multiplier (1.6x March-October)', async () => {
      vi.setSystemTime(new Date('2024-06-15')) // Peak wedding season

      const peakSeasonScenario = {
        supplierId: photographyStudio.id,
        tier: 'professional',
        tokensUsed: 1200, // 200 over quota
        requestType: 'wedding_day_processing',
        model: 'gpt-4o-mini',
        isPeakSeason: true
      }

      const costCalculation = await costCalculator.calculatePlatformCost(peakSeasonScenario)

      const baseOverageCost = 200 * 0.008 // £1.6
      const peakSeasonCost = baseOverageCost * 1.6 // £2.56

      expect(costCalculation.isPeakSeason).toBe(true)
      expect(costCalculation.seasonMultiplier).toBe(1.6)
      expect(costCalculation.baseOverageCost).toBe(1.6)
      expect(costCalculation.totalCost).toBe(2.56)
      expect(costCalculation.peakSeasonSurcharge).toBe(0.96) // £2.56 - £1.6
    })

    test('should calculate enterprise tier costs with volume discounts', async () => {
      const enterpriseScenario = {
        supplierId: weddingPlanner.id,
        tier: 'enterprise',
        tokensUsed: 6500, // 1500 over quota
        requestType: 'comprehensive_planning',
        model: 'gpt-4o'
      }

      const costCalculation = await costCalculator.calculatePlatformCost(enterpriseScenario)

      expect(costCalculation.quotaExceeded).toBe(1500) // 6500 - 5000
      expect(costCalculation.overageRate).toBe(0.004) // Enterprise rate
      expect(costCalculation.overageCost).toBe(6.0) // 1500 * £0.004
      expect(costCalculation.volumeDiscount).toBeGreaterThan(0) // Enterprise gets volume discount
    })
  })

  describe('Client AI Cost Calculation', () => {
    test('should calculate client OpenAI costs with real-time API pricing', async () => {
      const clientScenario = {
        supplierId: photographyStudio.id,
        model: 'gpt-4o-mini',
        inputTokens: 800,
        outputTokens: 200,
        provider: 'openai',
        apiKey: 'sk-test-client-key'
      }

      const costCalculation = await costCalculator.calculateClientCost(clientScenario)

      // OpenAI pricing: input £0.00015/1K, output £0.0006/1K
      const expectedInputCost = (800 / 1000) * 0.00015  // £0.00012
      const expectedOutputCost = (200 / 1000) * 0.0006   // £0.00012
      const expectedTotal = expectedInputCost + expectedOutputCost // £0.00024

      expect(costCalculation.inputTokensCost).toBeCloseTo(expectedInputCost, 6)
      expect(costCalculation.outputTokensCost).toBeCloseTo(expectedOutputCost, 6)
      expect(costCalculation.totalCost).toBeCloseTo(expectedTotal, 6)
      expect(costCalculation.provider).toBe('openai')
      expect(costCalculation.model).toBe('gpt-4o-mini')
    })

    test('should track client costs in real-time with proper attribution', async () => {
      const realTimeTracking = []
      
      // Simulate multiple client requests
      const requests = [
        { inputTokens: 500, outputTokens: 150, type: 'photo_tagging' },
        { inputTokens: 300, outputTokens: 100, type: 'venue_description' },
        { inputTokens: 700, outputTokens: 200, type: 'timeline_generation' }
      ]

      for (const request of requests) {
        const cost = await costCalculator.calculateClientCost({
          supplierId: photographyStudio.id,
          model: 'gpt-4o-mini',
          ...request,
          provider: 'openai'
        })

        realTimeTracking.push({
          timestamp: new Date(),
          requestType: request.type,
          cost: cost.totalCost,
          tokens: request.inputTokens + request.outputTokens
        })
      }

      const totalCost = realTimeTracking.reduce((sum, entry) => sum + entry.cost, 0)
      const totalTokens = realTimeTracking.reduce((sum, entry) => sum + entry.tokens, 0)

      expect(realTimeTracking).toHaveLength(3)
      expect(totalTokens).toBe(1950) // 650 + 400 + 900
      expect(totalCost).toBeGreaterThan(0)
      
      // Verify cost attribution accuracy
      realTimeTracking.forEach(entry => {
        expect(entry.requestType).toMatch(/photo_tagging|venue_description|timeline_generation/)
        expect(entry.cost).toBeGreaterThan(0)
        expect(entry.timestamp).toBeInstanceOf(Date)
      })
    })

    test('should provide accurate cost projections for monthly usage', async () => {
      // Historical usage data for projection
      const historicalUsage = {
        supplierId: photographyStudio.id,
        monthlyPattern: [
          { month: 1, tokens: 8500, cost: 12.5 },  // Jan
          { month: 2, tokens: 9200, cost: 13.8 },  // Feb
          { month: 3, tokens: 12000, cost: 18.2 }, // Mar (peak starts)
          { month: 4, tokens: 14500, cost: 21.7 }, // Apr
          { month: 5, tokens: 16000, cost: 24.1 }  // May
        ]
      }

      const projection = await costCalculator.projectMonthlyClientCosts({
        supplierId: photographyStudio.id,
        historicalUsage,
        currentMonth: 6, // June
        provider: 'openai',
        model: 'gpt-4o-mini'
      })

      expect(projection.projectedTokens).toBeGreaterThan(16000) // Growing trend
      expect(projection.projectedCost).toBeGreaterThan(24.1) // Higher than May
      expect(projection.confidence).toBeGreaterThan(0.8) // High confidence with 5 months data
      expect(projection.peakSeasonAdjustment).toBe(true) // June is peak season
      
      // Verify seasonal adjustment
      expect(projection.seasonalMultiplier).toBe(1.6)
      expect(projection.peakSeasonProjection).toBeGreaterThan(projection.baseProjection)
    })
  })

  describe('Cost Comparison and Optimization', () => {
    test('should accurately compare platform vs client costs for decision making', async () => {
      const comparisonScenario = {
        supplierId: photographyStudio.id,
        monthlyTokenEstimate: 1500, // Over professional quota
        currentTier: 'professional',
        clientModel: 'gpt-4o-mini'
      }

      const costComparison = await costCalculator.comparePlatformVsClient(comparisonScenario)

      // Platform: 500 overage tokens * £0.008 = £4.0
      // Client: 1500 tokens * OpenAI rates ≈ £0.36
      
      expect(costComparison.platformCost.overageCost).toBeCloseTo(4.0, 2)
      expect(costComparison.clientCost.totalCost).toBeLessThan(1.0) // Much cheaper
      expect(costComparison.savings).toBeGreaterThan(3.0) // Significant savings
      expect(costComparison.recommendation).toBe('migrate_to_client')
      expect(costComparison.breakEvenPoint).toBeLessThan(1000) // Break even at <1000 tokens
    })

    test('should calculate ROI for client API key investment', async () => {
      const roiScenario = {
        supplierId: venueCoordinator.id,
        currentTier: 'scale',
        monthlyOverage: 500, // tokens over quota
        clientSetupCost: 0, // OpenAI API is free to setup
        monthlyClientEstimate: 1700 // total monthly tokens
      }

      const roiCalculation = await costCalculator.calculateClientMigrationROI(roiScenario)

      // Scale tier: 500 overage * £0.006 = £3.0/month platform overage
      // Client: 1700 tokens * OpenAI rates ≈ £0.51/month
      // Monthly savings: £3.0 - £0.51 = £2.49

      expect(roiCalculation.monthlySavings).toBeCloseTo(2.49, 2)
      expect(roiCalculation.annualSavings).toBeCloseTo(29.88, 2) // £2.49 * 12
      expect(roiCalculation.paybackPeriod).toBe(0) // Immediate payback
      expect(roiCalculation.fiveYearSavings).toBeCloseTo(149.4, 2) // £29.88 * 5
    })

    test('should handle wedding season cost optimization strategies', async () => {
      vi.setSystemTime(new Date('2024-05-01')) // Pre-peak season

      const seasonOptimization = await costCalculator.optimizeSeasonalCosts({
        supplierId: photographyStudio.id,
        peakSeasonMonths: [3, 4, 5, 6, 7, 8, 9, 10], // Mar-Oct
        historicalPeakIncrease: 2.2, // 2.2x increase during peak
        currentProvider: 'platform'
      })

      expect(seasonOptimization.recommendMigration).toBe(true)
      expect(seasonOptimization.peakSeasonSavings).toBeGreaterThan(100) // >£100 savings
      expect(seasonOptimization.migrationTiming.recommended).toBe('before_peak_season')
      expect(seasonOptimization.migrationTiming.deadline).toBe('2024-02-28') // Before March
    })
  })

  describe('Billing Summary Generation', () => {
    test('should generate accurate monthly billing summaries', async () => {
      const billingPeriod = {
        supplierId: photographyStudio.id,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        provider: 'mixed' // Used both platform and client
      }

      const billingSummary = await billingEngine.generateMonthlySummary(billingPeriod)

      expect(billingSummary.period).toBe('2024-06')
      expect(billingSummary.supplier.id).toBe(photographyStudio.id)
      expect(billingSummary.provider).toBe('mixed')
      
      // Verify cost breakdown
      expect(billingSummary.costs).toMatchObject({
        platformCosts: expect.any(Number),
        clientCosts: expect.any(Number),
        totalCosts: expect.any(Number),
        breakdown: expect.any(Array)
      })

      // Verify usage statistics
      expect(billingSummary.usage).toMatchObject({
        platformTokens: expect.any(Number),
        clientTokens: expect.any(Number),
        totalTokens: expect.any(Number),
        averageRequestCost: expect.any(Number)
      })

      // Verify accuracy within 1% variance
      const calculatedTotal = billingSummary.costs.platformCosts + billingSummary.costs.clientCosts
      const reportedTotal = billingSummary.costs.totalCosts
      const variance = Math.abs(calculatedTotal - reportedTotal) / calculatedTotal

      expect(variance).toBeLessThan(0.01) // <1% variance
    })

    test('should include cost-saving recommendations in billing summary', async () => {
      const billingSummary = await billingEngine.generateMonthlySummary({
        supplierId: venueCoordinator.id,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        provider: 'platform'
      })

      expect(billingSummary.recommendations).toBeDefined()
      expect(billingSummary.recommendations).toMatchObject({
        costOptimization: expect.any(Array),
        providerRecommendation: expect.any(String),
        potentialSavings: expect.any(Number),
        migrationBenefits: expect.any(Object)
      })

      // Verify recommendation accuracy
      if (billingSummary.recommendations.potentialSavings > 10) {
        expect(billingSummary.recommendations.providerRecommendation).toBe('migrate_to_client')
      }
    })
  })

  describe('Cost Tracking Edge Cases', () => {
    test('should handle partial month calculations accurately', async () => {
      // Mid-month migration scenario
      const partialMonthScenario = {
        supplierId: photographyStudio.id,
        migrationDate: new Date('2024-06-15'),
        platformUsageBeforeMigration: 800,
        clientUsageAfterMigration: 400,
        billingPeriodStart: new Date('2024-06-01'),
        billingPeriodEnd: new Date('2024-06-30')
      }

      const partialBilling = await billingEngine.calculatePartialMonthBilling(partialMonthScenario)

      expect(partialBilling.platformPortion.days).toBe(14) // June 1-14
      expect(partialBilling.clientPortion.days).toBe(16) // June 15-30
      expect(partialBilling.platformPortion.tokens).toBe(800)
      expect(partialBilling.clientPortion.tokens).toBe(400)
      
      // Verify proportional accuracy
      const totalTokens = partialBilling.platformPortion.tokens + partialBilling.clientPortion.tokens
      expect(totalTokens).toBe(1200)
      expect(partialBilling.migrationAccuracy).toBeGreaterThan(99.5) // >99.5% accuracy
    })

    test('should handle currency conversion and international pricing', async () => {
      const internationalSupplier = createMockWeddingVendor({
        id: 'international-wedding-001',
        location: 'Paris, France',
        currency: 'EUR',
        subscription_tier: 'professional'
      })

      const currencyConversion = await costCalculator.calculateWithCurrency({
        supplierId: internationalSupplier.id,
        baseCurrency: 'GBP',
        targetCurrency: 'EUR',
        platformCost: 5.0, // £5.0
        clientCost: 1.2,   // £1.2
        exchangeRate: 1.17 // Mock GBP to EUR rate
      })

      expect(currencyConversion.platformCostEUR).toBeCloseTo(5.85, 2) // £5.0 * 1.17
      expect(currencyConversion.clientCostEUR).toBeCloseTo(1.40, 2)   // £1.2 * 1.17
      expect(currencyConversion.savingsEUR).toBeCloseTo(4.45, 2)      // €5.85 - €1.40
      expect(currencyConversion.currency).toBe('EUR')
    })

    test('should validate cost calculation performance under load', async () => {
      const startTime = Date.now()
      
      // Perform 100 concurrent cost calculations
      const calculations = Array.from({ length: 100 }, (_, i) =>
        costCalculator.calculatePlatformCost({
          supplierId: `load-test-supplier-${i}`,
          tier: 'professional',
          tokensUsed: 800 + i * 10,
          requestType: 'load_test',
          model: 'gpt-4o-mini'
        })
      )

      const results = await Promise.all(calculations)
      const endTime = Date.now()
      const totalDuration = endTime - startTime
      const avgCalculationTime = totalDuration / 100

      expect(results).toHaveLength(100)
      expect(avgCalculationTime).toBeLessThan(100) // <100ms per calculation
      expect(totalDuration).toBeLessThan(5000) // <5s total for 100 calculations
      
      // Verify all calculations completed successfully
      results.forEach((result, index) => {
        expect(result.tokensUsed).toBe(800 + index * 10)
        expect(result.totalCost).toBeGreaterThanOrEqual(0)
      })
    })
  })
})