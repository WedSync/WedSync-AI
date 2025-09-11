import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FinancialMetricsProcessor, FinancialMetrics, RevenueProjection, PaybackAnalysis } from '@/lib/analytics/financial-metrics-processor';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('FinancialMetricsProcessor', () => {
  let processor: FinancialMetricsProcessor;
  let mockRevenueData: any;
  let mockCustomerData: any;
  let mockCohortData: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize test data
    mockRevenueData = [
      {
        customer_id: 'customer-123',
        month: '2024-01',
        mrr: 150,
        arr: 1800,
        churn_risk: 0.1,
        expansion_revenue: 0,
        contraction_revenue: 0
      },
      {
        customer_id: 'customer-124', 
        month: '2024-01',
        mrr: 200,
        arr: 2400,
        churn_risk: 0.05,
        expansion_revenue: 50,
        contraction_revenue: 0
      },
      {
        customer_id: 'customer-125',
        month: '2024-01', 
        mrr: 100,
        arr: 1200,
        churn_risk: 0.15,
        expansion_revenue: 0,
        contraction_revenue: 25
      }
    ];

    mockCustomerData = [
      {
        customer_id: 'customer-123',
        acquisition_date: new Date('2023-12-01'),
        plan_tier: 'premium',
        business_type: 'photographer',
        acquisition_cost: 150,
        total_revenue: 450,
        months_active: 3
      },
      {
        customer_id: 'customer-124',
        acquisition_date: new Date('2023-11-01'),
        plan_tier: 'enterprise',
        business_type: 'venue',
        acquisition_cost: 200,
        total_revenue: 800,
        months_active: 4
      },
      {
        customer_id: 'customer-125',
        acquisition_date: new Date('2024-01-01'),
        plan_tier: 'basic',
        business_type: 'florist',
        acquisition_cost: 75,
        total_revenue: 100,
        months_active: 1
      }
    ];

    mockCohortData = [
      {
        cohort_month: '2023-11',
        cohort_size: 50,
        month_1_retention: 0.9,
        month_3_retention: 0.8,
        month_6_retention: 0.7,
        month_12_retention: 0.65,
        avg_revenue_per_customer: 175
      },
      {
        cohort_month: '2023-12',
        cohort_size: 45,
        month_1_retention: 0.92,
        month_3_retention: 0.82,
        month_6_retention: 0.75,
        month_12_retention: 0.68,
        avg_revenue_per_customer: 180
      }
    ];

    // Setup Supabase mocks
    mockSupabase.from.mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis()
      };

      // Configure responses based on table
      switch (table) {
        case 'subscription_revenue':
          mockChain.single.mockResolvedValue({ data: mockRevenueData, error: null });
          break;
        case 'customer_acquisition_costs':
          mockChain.single.mockResolvedValue({ data: mockCustomerData, error: null });
          break;
        case 'cohort_analysis':
          mockChain.single.mockResolvedValue({ data: mockCohortData, error: null });
          break;
        default:
          mockChain.single.mockResolvedValue({ data: [], error: null });
      }

      return mockChain;
    });

    processor = new FinancialMetricsProcessor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Financial Metrics', () => {
    it('should calculate monthly recurring revenue correctly', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.totalMRR).toBe(450); // Sum of all MRR values
      expect(metrics.avgRevenuePerCustomer).toBeCloseTo(150, 0); // 450 / 3
      expect(metrics.newMRR).toBeGreaterThanOrEqual(0);
      expect(metrics.churnedMRR).toBeGreaterThanOrEqual(0);
    });

    it('should calculate customer acquisition cost metrics', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.blendedCAC).toBeGreaterThan(0);
      expect(metrics.averagePaybackPeriod).toBeGreaterThan(0);
      expect(metrics.averagePaybackPeriod).toBeLessThan(60); // Should be reasonable
    });

    it('should calculate churn and expansion metrics', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.churnRate).toBeGreaterThanOrEqual(0);
      expect(metrics.churnRate).toBeLessThanOrEqual(1);
      expect(metrics.expansionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.netRevenueRetention).toBeGreaterThanOrEqual(0);
    });

    it('should include confidence intervals for key metrics', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.confidenceIntervals).toBeDefined();
      expect(metrics.confidenceIntervals.mrrGrowthRate).toBeDefined();
      expect(metrics.confidenceIntervals.churnRate).toBeDefined();
      expect(metrics.confidenceIntervals.expansionRate).toBeDefined();

      // Check confidence intervals are valid ranges
      const mrrCI = metrics.confidenceIntervals.mrrGrowthRate;
      expect(mrrCI.lower).toBeLessThanOrEqual(mrrCI.upper);
    });
  });

  describe('Revenue Projections', () => {
    it('should generate monthly revenue projections', async () => {
      const projections = await processor.projectRevenue(
        12, // 12 months
        { includeSeasonality: true, confidenceLevel: 0.95 }
      );

      expect(projections.months).toHaveLength(12);
      expect(projections.totalProjectedRevenue).toBeGreaterThan(0);
      expect(projections.confidenceLevel).toBe(0.95);
      
      // Check each month has required fields
      projections.months.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('projectedMRR');
        expect(month).toHaveProperty('projectedARR');
        expect(month).toHaveProperty('lowerBound');
        expect(month).toHaveProperty('upperBound');
        expect(month.lowerBound).toBeLessThanOrEqual(month.projectedMRR);
        expect(month.projectedMRR).toBeLessThanOrEqual(month.upperBound);
      });
    });

    it('should apply wedding seasonality adjustments', async () => {
      const projectionsWithSeasonality = await processor.projectRevenue(
        12,
        { includeSeasonality: true, confidenceLevel: 0.95 }
      );

      const projectionsWithoutSeasonality = await processor.projectRevenue(
        12,
        { includeSeasonality: false, confidenceLevel: 0.95 }
      );

      // Seasonality should affect projections
      expect(projectionsWithSeasonality.totalProjectedRevenue)
        .not.toBe(projectionsWithoutSeasonality.totalProjectedRevenue);

      // Spring/summer months (peak wedding season) should show higher projections
      const springMonths = projectionsWithSeasonality.months.filter(
        m => ['03', '04', '05', '06'].includes(m.month.slice(-2))
      );
      
      if (springMonths.length > 0) {
        const avgSpringMRR = springMonths.reduce((sum, m) => sum + m.projectedMRR, 0) / springMonths.length;
        expect(avgSpringMRR).toBeGreaterThan(0);
      }
    });

    it('should handle different confidence levels', async () => {
      const highConfidence = await processor.projectRevenue(6, { confidenceLevel: 0.99 });
      const lowConfidence = await processor.projectRevenue(6, { confidenceLevel: 0.8 });

      // Higher confidence should have wider confidence intervals
      const highConfidenceRange = highConfidence.months[0].upperBound - highConfidence.months[0].lowerBound;
      const lowConfidenceRange = lowConfidence.months[0].upperBound - lowConfidence.months[0].lowerBound;
      
      expect(highConfidenceRange).toBeGreaterThan(lowConfidenceRange);
    });
  });

  describe('Payback Analysis', () => {
    it('should calculate payback periods by segment', async () => {
      const paybackAnalysis = await processor.analyzePaybackPeriods();

      expect(paybackAnalysis.overallAverage).toBeGreaterThan(0);
      expect(paybackAnalysis.overallAverage).toBeLessThan(60); // Reasonable payback period
      expect(Array.isArray(paybackAnalysis.bySegment)).toBe(true);
      
      // Check segment analysis structure
      if (paybackAnalysis.bySegment.length > 0) {
        const segment = paybackAnalysis.bySegment[0];
        expect(segment).toHaveProperty('segmentType');
        expect(segment).toHaveProperty('segmentValue');
        expect(segment).toHaveProperty('averagePayback');
        expect(segment).toHaveProperty('customerCount');
        expect(segment.averagePayback).toBeGreaterThan(0);
      }
    });

    it('should identify factors affecting payback', async () => {
      const paybackAnalysis = await processor.analyzePaybackPeriods();

      expect(Array.isArray(paybackAnalysis.factors)).toBe(true);
      
      // Should identify key factors
      const factorTypes = paybackAnalysis.factors.map(f => f.factor);
      expect(factorTypes).toContain('plan_tier');
      expect(factorTypes).toContain('business_type');
    });

    it('should recommend optimization strategies', async () => {
      const paybackAnalysis = await processor.analyzePaybackPeriods();

      expect(Array.isArray(paybackAnalysis.recommendations)).toBe(true);
      expect(paybackAnalysis.recommendations.length).toBeGreaterThan(0);
      
      // Each recommendation should have required fields
      paybackAnalysis.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('suggestion');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('effort');
      });
    });
  });

  describe('Cohort Analysis Integration', () => {
    it('should analyze cohort performance', async () => {
      const cohortMetrics = await processor.analyzeCohortPerformance();

      expect(Array.isArray(cohortMetrics.cohorts)).toBe(true);
      expect(cohortMetrics.averageRetention).toBeDefined();
      expect(cohortMetrics.averageRetention.month1).toBeGreaterThanOrEqual(0);
      expect(cohortMetrics.averageRetention.month1).toBeLessThanOrEqual(1);
      
      // Check individual cohort data
      if (cohortMetrics.cohorts.length > 0) {
        const cohort = cohortMetrics.cohorts[0];
        expect(cohort).toHaveProperty('cohortMonth');
        expect(cohort).toHaveProperty('size');
        expect(cohort).toHaveProperty('retentionRates');
        expect(cohort).toHaveProperty('revenueMetrics');
      }
    });

    it('should calculate cohort LTV progression', async () => {
      const cohortMetrics = await processor.analyzeCohortPerformance();

      cohortMetrics.cohorts.forEach(cohort => {
        expect(cohort.revenueMetrics.avgRevenuePerCustomer).toBeGreaterThan(0);
        expect(cohort.retentionRates.month1).toBeGreaterThanOrEqual(0);
        expect(cohort.retentionRates.month1).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Wedding Industry Specifics', () => {
    it('should apply wedding industry benchmarks', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { industryBenchmarks: true }
      );

      expect(metrics.industryBenchmarks).toBeDefined();
      expect(metrics.industryBenchmarks.weddingSeasonalityFactor).toBeGreaterThan(0);
      expect(metrics.industryBenchmarks.averageWeddingSpend).toBeGreaterThan(0);
    });

    it('should segment by wedding vendor types', async () => {
      const segmentAnalysis = await processor.analyzeSegmentPerformance('business_type');

      expect(Array.isArray(segmentAnalysis.segments)).toBe(true);
      
      const vendorTypes = segmentAnalysis.segments.map(s => s.segmentValue);
      expect(vendorTypes).toContain('photographer');
      expect(vendorTypes).toContain('venue');
      expect(vendorTypes).toContain('florist');
    });

    it('should calculate wedding-specific retention patterns', async () => {
      const projections = await processor.projectRevenue(
        24,
        { includeSeasonality: true, industrySpecific: true }
      );

      // Wedding vendors typically have seasonal patterns
      expect(projections.seasonalityFactors).toBeDefined();
      expect(projections.seasonalityFactors.peakSeason).toBeDefined();
      expect(projections.seasonalityFactors.offSeason).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete calculations within acceptable time', async () => {
      const startTime = Date.now();
      
      await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeRevenueData = Array.from({ length: 1000 }, (_, i) => ({
        customer_id: `customer-${i}`,
        month: '2024-01',
        mrr: 150 + (i % 100),
        arr: (150 + (i % 100)) * 12,
        churn_risk: Math.random() * 0.3,
        expansion_revenue: Math.random() * 50,
        contraction_revenue: Math.random() * 25
      }));

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscription_revenue') {
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: largeRevenueData, error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCustomerData, error: null })
        };
      });

      const startTime = Date.now();
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      const executionTime = Date.now() - startTime;

      expect(metrics).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // Should handle large datasets within 10 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle missing revenue data gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscription_revenue') {
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCustomerData, error: null })
        };
      });

      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.totalMRR).toBe(0);
      expect(metrics.avgRevenuePerCustomer).toBe(0);
      expect(metrics.dataQualityScore).toBeLessThan(1); // Should indicate poor data quality
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      await expect(processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )).rejects.toThrow('Database connection failed');
    });

    it('should validate date ranges', async () => {
      const invalidStartDate = new Date('2024-02-01');
      const invalidEndDate = new Date('2024-01-01');

      await expect(processor.calculateFinancialMetrics(
        invalidStartDate,
        invalidEndDate
      )).rejects.toThrow('Invalid date range');
    });
  });

  describe('Statistical Accuracy', () => {
    it('should calculate confidence intervals correctly', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      const mrrCI = metrics.confidenceIntervals.mrrGrowthRate;
      expect(mrrCI.lower).toBeLessThanOrEqual(mrrCI.point);
      expect(mrrCI.point).toBeLessThanOrEqual(mrrCI.upper);
      expect(mrrCI.confidenceLevel).toBe(0.95); // Default confidence level
    });

    it('should provide data quality assessments', async () => {
      const metrics = await processor.calculateFinancialMetrics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.dataQualityScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(metrics.dataQualityIssues)).toBe(true);
    });
  });
});