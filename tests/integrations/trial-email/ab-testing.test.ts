import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ABTestingService, ABTestStatistics } from '@/lib/email/ab-testing'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('ABTestingService', () => {
  let abTestingService: ABTestingService
  let mockSupabase: any

  beforeEach(() => {
    abTestingService = new ABTestingService()
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis()
    }
    
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createTest', () => {
    const testParams = {
      campaignId: 'campaign-123',
      name: 'Subject Line Test',
      hypothesis: 'Emotional subject lines will have higher open rates',
      variants: [
        { name: 'A' as const, description: 'Control', weight: 50, isControl: true },
        { name: 'B' as const, description: 'Emotional', weight: 50, isControl: false }
      ],
      metrics: [
        { name: 'Open Rate', type: 'primary' as const, measurementType: 'conversion' as const, calculation: 'percentage' as const },
        { name: 'Click Rate', type: 'secondary' as const, measurementType: 'engagement' as const, calculation: 'percentage' as const }
      ]
    }

    it('should create a new A/B test', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const test = await abTestingService.createTest(testParams)

      expect(test).toMatchObject({
        campaignId: 'campaign-123',
        name: 'Subject Line Test',
        hypothesis: 'Emotional subject lines will have higher open rates',
        status: 'draft',
        variants: expect.arrayContaining([
          expect.objectContaining({ name: 'A', isControl: true }),
          expect.objectContaining({ name: 'B', isControl: false })
        ])
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 'campaign-123',
          name: 'Subject Line Test',
          status: 'draft'
        })
      )
    })

    it('should assign unique IDs to variants and metrics', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const test = await abTestingService.createTest(testParams)

      expect(test.variants[0].id).toBeDefined()
      expect(test.variants[1].id).toBeDefined()
      expect(test.variants[0].id).not.toBe(test.variants[1].id)

      expect(test.metrics[0].id).toBeDefined()
      expect(test.metrics[1].id).toBeDefined()
      expect(test.metrics[0].id).not.toBe(test.metrics[1].id)
    })
  })

  describe('assignVariant', () => {
    const mockTest = {
      id: 'test-123',
      campaignId: 'campaign-123',
      name: 'Test',
      hypothesis: 'Test hypothesis',
      status: 'running' as const,
      startDate: new Date(),
      variants: [
        { id: 'variant-a', name: 'A' as const, description: 'Control', weight: 50, isControl: true },
        { id: 'variant-b', name: 'B' as const, description: 'Test', weight: 50, isControl: false }
      ],
      metrics: [],
      minimumSampleSize: 1000,
      confidenceLevel: 0.95
    }

    it('should return existing assignment if user already assigned', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { variant_id: 'variant-a' }
      })

      // Mock activeTests map
      const service = abTestingService as any
      service.activeTests.set('test-123', mockTest)

      const variant = await abTestingService.assignVariant('user-123', 'test-123')

      expect(variant.id).toBe('variant-a')
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should create new assignment for new user', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const service = abTestingService as any
      service.activeTests.set('test-123', mockTest)

      const variant = await abTestingService.assignVariant('user-123', 'test-123')

      expect(variant).toBeDefined()
      expect(['variant-a', 'variant-b']).toContain(variant.id)
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        test_id: 'test-123',
        variant_id: variant.id,
        assigned_at: expect.any(String)
      })
    })

    it('should respect variant weights in assignment', async () => {
      // Test with heavily weighted variant
      const weightedTest = {
        ...mockTest,
        variants: [
          { id: 'variant-a', name: 'A' as const, description: 'Control', weight: 90, isControl: true },
          { id: 'variant-b', name: 'B' as const, description: 'Test', weight: 10, isControl: false }
        ]
      }

      mockSupabase.single.mockResolvedValue({ data: null })
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const service = abTestingService as any
      service.activeTests.set('test-123', weightedTest)

      const assignments = []
      for (let i = 0; i < 100; i++) {
        const variant = await abTestingService.assignVariant(`user-${i}`, 'test-123')
        assignments.push(variant.id)
      }

      const variantACount = assignments.filter(id => id === 'variant-a').length
      const variantBCount = assignments.filter(id => id === 'variant-b').length

      // Variant A should be assigned more frequently (around 90%)
      expect(variantACount).toBeGreaterThan(variantBCount)
      expect(variantACount).toBeGreaterThan(75) // Allow some variance
    })
  })

  describe('trackConversion', () => {
    it('should track conversion for assigned user', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { variant_id: 'variant-a' }
      })
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      await abTestingService.trackConversion({
        userId: 'user-123',
        testId: 'test-123',
        metricId: 'metric-456',
        value: 1
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        test_id: 'test-123',
        variant_id: 'variant-a',
        user_id: 'user-123',
        metric_id: 'metric-456',
        value: 1,
        converted_at: expect.any(String)
      })

      expect(mockSupabase.update).toHaveBeenCalledWith({
        converted: true,
        conversion_value: 1
      })
    })

    it('should skip tracking if user not assigned to test', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      await abTestingService.trackConversion({
        userId: 'user-123',
        testId: 'test-123',
        metricId: 'metric-456'
      })

      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })
  })

  describe('getTestResults', () => {
    const mockTest = {
      id: 'test-123',
      campaignId: 'campaign-123',
      name: 'Test',
      hypothesis: 'Test hypothesis',
      status: 'running' as const,
      startDate: new Date(),
      variants: [
        { id: 'variant-a', name: 'A' as const, description: 'Control', weight: 50, isControl: true },
        { id: 'variant-b', name: 'B' as const, description: 'Test', weight: 50, isControl: false }
      ],
      metrics: [
        { id: 'metric-1', name: 'Open Rate', type: 'primary' as const, measurementType: 'conversion' as const, calculation: 'percentage' as const }
      ],
      minimumSampleSize: 1000,
      confidenceLevel: 0.95
    }

    it('should calculate test results with statistical significance', async () => {
      const service = abTestingService as any
      service.activeTests.set('test-123', mockTest)

      // Mock conversion data - variant B performing better
      mockSupabase.select.mockImplementation((fields) => {
        if (fields.includes('variant_id, metric_id, value')) {
          return {
            eq: () => ({
              data: [
                { variant_id: 'variant-a', metric_id: 'metric-1', value: 1 },
                { variant_id: 'variant-a', metric_id: 'metric-1', value: 1 },
                { variant_id: 'variant-b', metric_id: 'metric-1', value: 1 },
                { variant_id: 'variant-b', metric_id: 'metric-1', value: 1 },
                { variant_id: 'variant-b', metric_id: 'metric-1', value: 1 },
                { variant_id: 'variant-b', metric_id: 'metric-1', value: 1 }
              ]
            })
          }
        } else {
          return {
            eq: () => ({
              data: [
                { variant_id: 'variant-a' },
                { variant_id: 'variant-a' },
                { variant_id: 'variant-a' },
                { variant_id: 'variant-a' },
                { variant_id: 'variant-a' },
                { variant_id: 'variant-b' },
                { variant_id: 'variant-b' },
                { variant_id: 'variant-b' },
                { variant_id: 'variant-b' },
                { variant_id: 'variant-b' }
              ]
            })
          }
        }
      })

      const results = await abTestingService.getTestResults('test-123')

      expect(results).toMatchObject({
        testId: 'test-123',
        conclusive: expect.any(Boolean),
        metrics: expect.any(Array)
      })

      if (results.conclusive) {
        expect(results.winner).toBeDefined()
      }
    })

    it('should handle insufficient sample size', async () => {
      const service = abTestingService as any
      service.activeTests.set('test-123', mockTest)

      // Mock small sample size
      mockSupabase.select.mockImplementation(() => ({
        eq: () => ({
          data: [
            { variant_id: 'variant-a', metric_id: 'metric-1', value: 1 },
            { variant_id: 'variant-b', metric_id: 'metric-1', value: 1 }
          ]
        })
      }))

      const results = await abTestingService.getTestResults('test-123')

      expect(results.conclusive).toBe(false)
      expect(results.winner).toBeUndefined()
    })
  })

  describe('selectVariantForUser', () => {
    it('should return control variant when no active test', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const variant = await abTestingService.selectVariantForUser('user-123', 'campaign-123')

      expect(variant).toBe('A')
    })

    it('should return assigned variant when test is active', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'test-123', campaign_id: 'campaign-123', status: 'running' }
      })

      // Mock assignVariant to return variant B
      vi.spyOn(abTestingService, 'assignVariant').mockResolvedValueOnce({
        id: 'variant-b',
        name: 'B',
        description: 'Test',
        weight: 50,
        isControl: false
      })

      const variant = await abTestingService.selectVariantForUser('user-123', 'campaign-123')

      expect(variant).toBe('B')
    })
  })

  describe('generateABVariant', () => {
    it('should return configured variants when config exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          campaign_id: 'campaign-123',
          variant_type: 'subject',
          control_value: 'Professional Subject Line',
          variant_value: 'Emotional Subject Line'
        }
      })

      const variants = await abTestingService.generateABVariant('campaign-123', 'subject')

      expect(variants).toEqual({
        A: 'Professional Subject Line',
        B: 'Emotional Subject Line'
      })
    })

    it('should return default variants when no config exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const variants = await abTestingService.generateABVariant('campaign-123', 'subject')

      expect(variants).toEqual({
        A: 'Your trial ends in {days} days',
        B: 'Don\'t miss out - {days} days left in your trial'
      })
    })

    it('should handle different variant types', async () => {
      mockSupabase.single.mockResolvedValue({ data: null })

      const subjectVariants = await abTestingService.generateABVariant('campaign-123', 'subject')
      const ctaVariants = await abTestingService.generateABVariant('campaign-123', 'cta')
      const timingVariants = await abTestingService.generateABVariant('campaign-123', 'timing')

      expect(subjectVariants.A).toContain('trial ends')
      expect(ctaVariants.A).toBe('Upgrade Now')
      expect(timingVariants.A).toBe('9am')
    })
  })
})

describe('ABTestStatistics', () => {
  let stats: ABTestStatistics

  beforeEach(() => {
    stats = new (ABTestStatistics as any)()
  })

  describe('calculateSignificance', () => {
    it('should calculate statistical significance correctly', () => {
      // Control: 50 conversions out of 1000 (5% conversion rate)
      // Variant: 75 conversions out of 1000 (7.5% conversion rate)
      const result = stats.calculateSignificance(50, 1000, 75, 1000, 0.95)

      expect(result).toMatchObject({
        pValue: expect.any(Number),
        isSignificant: expect.any(Boolean),
        confidenceInterval: expect.any(Array),
        uplift: expect.any(Number)
      })

      expect(result.uplift).toBeCloseTo(50, 0) // 50% relative uplift
      expect(result.confidenceInterval).toHaveLength(2)
    })

    it('should detect significant results with large samples', () => {
      // Large sample sizes with clear difference
      const result = stats.calculateSignificance(100, 10000, 150, 10000, 0.95)

      expect(result.isSignificant).toBe(true)
      expect(result.pValue).toBeLessThan(0.05)
    })

    it('should not detect significance with small samples', () => {
      // Small sample sizes
      const result = stats.calculateSignificance(5, 100, 7, 100, 0.95)

      expect(result.isSignificant).toBe(false)
      expect(result.pValue).toBeGreaterThan(0.05)
    })

    it('should handle edge cases', () => {
      // Zero conversions
      const zeroResult = stats.calculateSignificance(0, 100, 5, 100, 0.95)
      expect(zeroResult.uplift).toBe(Infinity)

      // Same conversion rates
      const sameResult = stats.calculateSignificance(50, 1000, 50, 1000, 0.95)
      expect(sameResult.uplift).toBe(0)
    })
  })

  describe('calculateSampleSize', () => {
    it('should calculate minimum sample size needed', () => {
      // 5% baseline conversion rate, want to detect 20% relative improvement
      const sampleSize = stats.calculateSampleSize(0.05, 0.20, 0.95, 0.80)

      expect(sampleSize).toBeGreaterThan(0)
      expect(sampleSize).toBeLessThan(50000) // Reasonable upper bound
    })

    it('should require larger samples for smaller effects', () => {
      const smallEffectSize = stats.calculateSampleSize(0.05, 0.05, 0.95, 0.80) // 5% relative improvement
      const largeEffectSize = stats.calculateSampleSize(0.05, 0.50, 0.95, 0.80) // 50% relative improvement

      expect(smallEffectSize).toBeGreaterThan(largeEffectSize)
    })

    it('should handle different confidence levels', () => {
      const lowConfidence = stats.calculateSampleSize(0.05, 0.20, 0.90, 0.80)
      const highConfidence = stats.calculateSampleSize(0.05, 0.20, 0.99, 0.80)

      expect(highConfidence).toBeGreaterThan(lowConfidence)
    })
  })
})