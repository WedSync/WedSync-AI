import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { businessIntelligenceService } from '@/lib/services/BusinessIntelligenceService';
import { churnQualityMonitoringService } from '@/lib/services/ChurnQualityMonitoringService';
import { BI_QUALITY_STANDARDS, QUALITY_GATES } from '@/lib/quality/churn-intelligence-standards';
import type { 
  BIReport, 
  ChurnAnalytics, 
  SupplierSegment, 
  RevenueImpactAnalysis,
  QualityAssessment 
} from '@/types/churn-intelligence';

describe('Business Intelligence Validation - WS-182', () => {
  let mockSupplierData: any[];
  let mockChurnEvents: any[];
  let mockRevenueData: any[];
  
  beforeEach(async () => {
    // Setup comprehensive test data for BI validation
    mockSupplierData = Array.from({ length: 1000 }, (_, i) => ({
      id: `supplier_${i}`,
      name: `Test Supplier ${i}`,
      tier: ['premium', 'standard', 'basic'][i % 3],
      category: ['photographer', 'florist', 'caterer', 'venue', 'music'][i % 5],
      registrationDate: new Date(2023, (i % 12), (i % 28) + 1),
      monthlyRevenue: Math.random() * 5000 + 500,
      weddingCount: Math.floor(Math.random() * 50) + 1,
      ratingAverage: Math.random() * 2 + 3, // 3-5 star range
      lastActiveDate: new Date(2024, (i % 12), (i % 28) + 1),
      location: {
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][i % 4],
        state: ['NY', 'CA', 'IL', 'TX'][i % 4]
      }
    }));

    mockChurnEvents = mockSupplierData.slice(0, 150).map((supplier, i) => ({
      supplierId: supplier.id,
      churnDate: new Date(2024, (i % 12), (i % 28) + 1),
      churnReason: ['pricing', 'competition', 'service_issues', 'market_change'][i % 4],
      revenueImpact: supplier.monthlyRevenue * (Math.random() * 6 + 6), // 6-12 months revenue
      customerCount: supplier.weddingCount,
      warningSignsDetected: Math.random() > 0.3,
      preventable: Math.random() > 0.4
    }));

    mockRevenueData = mockSupplierData.map(supplier => ({
      supplierId: supplier.id,
      monthlyRevenue: supplier.monthlyRevenue,
      revenueGrowth: (Math.random() - 0.5) * 0.4, // -20% to +20% growth
      ltv: supplier.monthlyRevenue * (Math.random() * 24 + 12), // 12-36 months LTV
      acquisitionCost: Math.random() * 500 + 100
    }));

    // Setup mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BI Report Accuracy Validation', () => {
    it('should generate BI reports with 95%+ accuracy for churn predictions', async () => {
      const biReport = await businessIntelligenceService.generateChurnAnalyticsReport({
        suppliers: mockSupplierData,
        churnEvents: mockChurnEvents,
        timeframe: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      });

      // Validate report structure
      expect(biReport).toBeDefined();
      expect(biReport.accuracy).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_BI_ACCURACY);
      expect(biReport.confidence).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_CONFIDENCE);
      
      // Validate data completeness
      expect(biReport.dataCompleteness).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_DATA_COMPLETENESS);
      expect(biReport.sampleSize).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_SAMPLE_SIZE);

      // Validate prediction accuracy against known outcomes
      const actualChurnRate = mockChurnEvents.length / mockSupplierData.length;
      const predictedChurnRate = biReport.predictedChurnRate;
      const accuracyError = Math.abs(actualChurnRate - predictedChurnRate) / actualChurnRate;
      
      expect(accuracyError).toBeLessThan(0.05); // Less than 5% error
      expect(biReport.accuracy).toBeGreaterThan(0.95);
    });

    it('should validate supplier segmentation accuracy', async () => {
      const segmentationResult = await businessIntelligenceService.analyzeSupplierSegments(mockSupplierData);
      
      // Validate segmentation quality
      expect(segmentationResult.segments).toHaveLength(expect.any(Number));
      expect(segmentationResult.segments.length).toBeGreaterThan(3);
      expect(segmentationResult.segments.length).toBeLessThan(10);

      // Validate segment characteristics
      for (const segment of segmentationResult.segments) {
        expect(segment.size).toBeGreaterThan(0);
        expect(segment.churnRate).toBeGreaterThanOrEqual(0);
        expect(segment.churnRate).toBeLessThanOrEqual(1);
        expect(segment.avgRevenue).toBeGreaterThan(0);
        expect(segment.characteristics).toBeDefined();
        
        // Each segment should have distinct characteristics
        expect(segment.characteristics.length).toBeGreaterThan(0);
      }

      // Validate segmentation coverage
      const totalSegmentedSuppliers = segmentationResult.segments.reduce((sum, s) => sum + s.size, 0);
      expect(totalSegmentedSuppliers).toBeGreaterThanOrEqual(mockSupplierData.length * 0.95);
    });

    it('should provide explainable BI insights with statistical significance', async () => {
      const insights = await businessIntelligenceService.generateExplainableInsights({
        suppliers: mockSupplierData,
        churnEvents: mockChurnEvents
      });

      expect(insights).toBeDefined();
      expect(insights.keyFactors).toHaveLength(expect.any(Number));
      expect(insights.keyFactors.length).toBeGreaterThan(5);

      // Validate statistical significance of insights
      for (const factor of insights.keyFactors) {
        expect(factor.importance).toBeGreaterThan(0);
        expect(factor.importance).toBeLessThanOrEqual(1);
        expect(factor.pValue).toBeLessThan(0.05); // Statistically significant
        expect(factor.confidenceInterval).toBeDefined();
        expect(factor.effect).toMatch(/positive|negative/);
      }

      // Validate business relevance
      const businessRelevantFactors = insights.keyFactors.filter(f => 
        f.businessRelevance === 'high' && f.actionable === true
      );
      expect(businessRelevantFactors.length).toBeGreaterThan(3);
    });
  });

  describe('Revenue Impact Analysis Validation', () => {
    it('should accurately calculate churn revenue impact with 98%+ precision', async () => {
      const revenueAnalysis = await businessIntelligenceService.analyzeRevenueImpact({
        churnEvents: mockChurnEvents,
        revenueData: mockRevenueData
      });

      expect(revenueAnalysis).toBeDefined();
      expect(revenueAnalysis.totalRevenueImpact).toBeGreaterThan(0);
      expect(revenueAnalysis.accuracy).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_REVENUE_ACCURACY);

      // Validate monthly breakdown
      expect(revenueAnalysis.monthlyBreakdown).toBeDefined();
      expect(revenueAnalysis.monthlyBreakdown.length).toBe(12);
      
      const totalCalculatedImpact = revenueAnalysis.monthlyBreakdown.reduce((sum, month) => sum + month.impact, 0);
      const expectedTotalImpact = mockChurnEvents.reduce((sum, event) => sum + event.revenueImpact, 0);
      const impactAccuracy = 1 - Math.abs(totalCalculatedImpact - expectedTotalImpact) / expectedTotalImpact;
      
      expect(impactAccuracy).toBeGreaterThan(0.98);
    });

    it('should provide actionable cost-benefit analysis for retention efforts', async () => {
      const costBenefitAnalysis = await businessIntelligenceService.analyzeCostBenefit({
        retentionCampaigns: [
          { type: 'email', cost: 50, effectivenessRate: 0.15 },
          { type: 'personal_call', cost: 200, effectivenessRate: 0.35 },
          { type: 'discount_offer', cost: 500, effectivenessRate: 0.45 },
          { type: 'premium_support', cost: 1000, effectivenessRate: 0.60 }
        ],
        supplierSegments: mockSupplierData
      });

      expect(costBenefitAnalysis).toBeDefined();
      expect(costBenefitAnalysis.recommendations).toHaveLength(expect.any(Number));

      // Validate ROI calculations
      for (const recommendation of costBenefitAnalysis.recommendations) {
        expect(recommendation.expectedROI).toBeGreaterThan(0);
        expect(recommendation.confidence).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_CONFIDENCE);
        expect(recommendation.businessImpact).toMatch(/low|medium|high/);
        expect(recommendation.implementation).toBeDefined();
      }

      // Validate prioritization accuracy
      const highROIRecommendations = costBenefitAnalysis.recommendations.filter(r => r.expectedROI > 3.0);
      expect(highROIRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Seasonal and Wedding Industry Pattern Validation', () => {
    it('should detect seasonal wedding patterns with high accuracy', async () => {
      const seasonalAnalysis = await businessIntelligenceService.analyzeSeasonalPatterns({
        suppliers: mockSupplierData,
        weddingData: mockSupplierData.map(s => ({
          supplierId: s.id,
          weddingDates: Array.from({ length: s.weddingCount }, (_, i) => 
            new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          )
        }))
      });

      expect(seasonalAnalysis).toBeDefined();
      expect(seasonalAnalysis.seasonalFactors).toBeDefined();
      expect(seasonalAnalysis.peakSeasons).toHaveLength(expect.any(Number));
      
      // Validate seasonal detection accuracy
      for (const season of seasonalAnalysis.peakSeasons) {
        expect(season.months).toHaveLength(expect.any(Number));
        expect(season.demandMultiplier).toBeGreaterThan(1.0);
        expect(season.churnRiskAdjustment).toBeDefined();
        expect(season.confidence).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_CONFIDENCE);
      }

      // Validate industry-specific insights
      expect(seasonalAnalysis.industryInsights).toBeDefined();
      expect(seasonalAnalysis.industryInsights.weddingSeasonImpact).toBeDefined();
      expect(seasonalAnalysis.industryInsights.supplierCategoryTrends).toBeDefined();
    });

    it('should identify wedding industry specific churn drivers', async () => {
      const industryAnalysis = await businessIntelligenceService.analyzeIndustrySpecificFactors({
        suppliers: mockSupplierData,
        churnEvents: mockChurnEvents,
        industryBenchmarks: {
          avgChurnRate: 0.15,
          avgLTV: 15000,
          seasonalVariation: 0.3
        }
      });

      expect(industryAnalysis).toBeDefined();
      expect(industryAnalysis.weddingSpecificFactors).toHaveLength(expect.any(Number));
      
      // Validate wedding industry factors
      const expectedFactors = ['seasonality', 'competition', 'pricing_pressure', 'service_quality', 'market_saturation'];
      for (const expectedFactor of expectedFactors) {
        const foundFactor = industryAnalysis.weddingSpecificFactors.find(f => f.name.includes(expectedFactor));
        if (foundFactor) {
          expect(foundFactor.impact).toBeGreaterThan(0);
          expect(foundFactor.confidence).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_CONFIDENCE);
        }
      }

      // Validate benchmarking accuracy
      expect(industryAnalysis.benchmarkComparison).toBeDefined();
      expect(industryAnalysis.benchmarkComparison.performanceVsBenchmark).toBeDefined();
    });
  });

  describe('Quality Gate Validation', () => {
    it('should enforce BI quality gates before deployment', async () => {
      const qualityReport = await churnQualityMonitoringService.assessBIQuality({
        biReports: [
          await businessIntelligenceService.generateChurnAnalyticsReport({
            suppliers: mockSupplierData,
            churnEvents: mockChurnEvents,
            timeframe: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
          })
        ]
      });

      expect(qualityReport).toBeDefined();
      expect(qualityReport.overallScore).toBeGreaterThan(QUALITY_GATES.BI_DEPLOYMENT.MIN_SCORE);
      expect(qualityReport.passedGates.length).toBeGreaterThan(QUALITY_GATES.BI_DEPLOYMENT.REQUIRED_GATES - 1);
      
      // Validate specific quality dimensions
      expect(qualityReport.dimensions.accuracy).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_BI_ACCURACY);
      expect(qualityReport.dimensions.completeness).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_DATA_COMPLETENESS);
      expect(qualityReport.dimensions.timeliness).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_TIMELINESS);
      expect(qualityReport.dimensions.relevance).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_RELEVANCE);
    });

    it('should validate BI report freshness and data currency', async () => {
      const freshnessCheck = await churnQualityMonitoringService.validateDataFreshness({
        dataSourceTimestamps: {
          suppliers: new Date(),
          churnEvents: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          revenue: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        }
      });

      expect(freshnessCheck).toBeDefined();
      expect(freshnessCheck.overallFreshness).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_TIMELINESS);
      expect(freshnessCheck.staleDataSources).toHaveLength(0);
      
      // Validate individual source freshness
      for (const [source, timestamp] of Object.entries(freshnessCheck.sourceTimestamps)) {
        const ageMinutes = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);
        expect(ageMinutes).toBeLessThan(BI_QUALITY_STANDARDS.MAX_DATA_AGE_HOURS * 60);
      }
    });
  });

  describe('Business Value Validation', () => {
    it('should demonstrate measurable business value from BI insights', async () => {
      const valueAnalysis = await businessIntelligenceService.measureBusinessValue({
        baselineMetrics: {
          churnRate: 0.15,
          monthlyRevenue: mockRevenueData.reduce((sum, r) => sum + r.monthlyRevenue, 0),
          customerSatisfaction: 4.2
        },
        interventions: [
          { type: 'early_warning_system', implementation: 'automated' },
          { type: 'targeted_retention', implementation: 'ml_driven' },
          { type: 'supplier_success_program', implementation: 'personalized' }
        ]
      });

      expect(valueAnalysis).toBeDefined();
      expect(valueAnalysis.projectedBenefits).toBeDefined();
      expect(valueAnalysis.projectedBenefits.churnReduction).toBeGreaterThan(0.1); // 10%+ reduction
      expect(valueAnalysis.projectedBenefits.revenuePreservation).toBeGreaterThan(50000); // $50k+ preserved
      
      // Validate ROI projections
      expect(valueAnalysis.roi).toBeDefined();
      expect(valueAnalysis.roi.monthlyROI).toBeGreaterThan(2.0); // 200%+ ROI
      expect(valueAnalysis.roi.paybackPeriod).toBeLessThan(6); // Less than 6 months
      expect(valueAnalysis.roi.confidence).toBeGreaterThan(BI_QUALITY_STANDARDS.MIN_CONFIDENCE);
    });

    it('should provide actionable recommendations for supplier success teams', async () => {
      const actionableInsights = await businessIntelligenceService.generateActionableRecommendations({
        suppliers: mockSupplierData.slice(0, 50), // Focus on high-risk subset
        churnPredictions: mockSupplierData.slice(0, 50).map(s => ({
          supplierId: s.id,
          churnProbability: Math.random(),
          riskFactors: ['low_engagement', 'pricing_pressure', 'competition'].slice(0, Math.floor(Math.random() * 3) + 1),
          recommendedActions: []
        }))
      });

      expect(actionableInsights).toBeDefined();
      expect(actionableInsights.recommendations).toHaveLength(expect.any(Number));
      
      // Validate recommendation quality
      for (const recommendation of actionableInsights.recommendations) {
        expect(recommendation.supplierId).toBeDefined();
        expect(recommendation.priority).toMatch(/low|medium|high|critical/);
        expect(recommendation.actions).toHaveLength(expect.any(Number));
        expect(recommendation.expectedImpact).toBeDefined();
        expect(recommendation.timeframe).toBeDefined();
        
        // Validate actionability
        for (const action of recommendation.actions) {
          expect(action.type).toBeDefined();
          expect(action.description).toBeDefined();
          expect(action.owner).toBeDefined();
          expect(action.timeline).toBeDefined();
        }
      }

      // Validate business impact estimation
      const highImpactRecommendations = actionableInsights.recommendations.filter(r => 
        r.expectedImpact.revenuePreservation > 1000
      );
      expect(highImpactRecommendations.length).toBeGreaterThan(0);
    });
  });
});