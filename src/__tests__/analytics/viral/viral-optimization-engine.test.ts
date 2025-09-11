import {
  ViralOptimizationEngine,
  ViralIntervention,
  ViralSimulationResult,
  BottleneckAnalysis,
} from '@/lib/analytics/viral-optimization-engine';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
} from '@/lib/analytics/advanced-viral-calculator';
import { createClient } from '@/lib/database/supabase-admin';

// Mock dependencies
jest.mock('@/lib/database/supabase-admin');
jest.mock('@/lib/analytics/advanced-viral-calculator');
jest.mock('@/lib/analytics/wedding-viral-analyzer');

const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
const MockAdvancedViralCalculator = AdvancedViralCalculator as jest.MockedClass<
  typeof AdvancedViralCalculator
>;

// Helper functions to create mock responses - REFACTORED TO REDUCE NESTING
type OptimizationMockData = any[];
type OptimizationMockError = { message: string } | null;
type OptimizationMockResponse = { 
  data: OptimizationMockData; 
  error: OptimizationMockError; 
  count?: number; 
};

/**
 * Creates optimization engine mock response - REDUCES NESTING
 */
const createOptimizationMockResponse = (
  data: OptimizationMockData, 
  error: OptimizationMockError = null
): OptimizationMockResponse => ({
  data,
  error,
  count: data.length,
});

/**
 * Creates final query result - HELPER TO REDUCE NESTING
 */
const createQueryResult = (responseData: OptimizationMockData = []): OptimizationMockResponse => {
  const response = createOptimizationMockResponse(responseData);
  return { data: response.data, error: response.error, count: response.count };
};

/**
 * Creates eq-chain mock functions - HELPER TO REDUCE NESTING
 */
const createEqChainMock = (finalResult: OptimizationMockResponse) => ({
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn(() => finalResult),
});

/**
 * Creates select-chain mock functions - HELPER TO REDUCE NESTING
 */
const createSelectChainMock = (finalResult: OptimizationMockResponse) => ({
  eq: jest.fn(() => createEqChainMock(finalResult)),
  gte: jest.fn(() => finalResult),
  limit: jest.fn(() => finalResult),
  head: true,
  count: 'exact' as const,
});

/**
 * Creates Supabase optimization query mock chain - REDUCED FROM 5 TO 3 LEVELS MAX
 */
const createOptimizationQueryMockChain = (responseData: OptimizationMockData = []) => {
  const queryResult = createQueryResult(responseData);
  
  return {
    select: jest.fn(() => createSelectChainMock(queryResult)),
    insert: jest.fn(() => ({ data: null, error: null })),
  };
};

/**
 * Creates complete optimization engine mock factory - REDUCES NESTING
 */
const createOptimizationEngineMockFactory = (configs: Record<string, OptimizationMockData> = {}) => ({
  from: jest.fn(() => createOptimizationQueryMockChain(configs.default || [])),
  rpc: jest.fn(() => createOptimizationMockResponse(configs.rpc || [])),
});

/**
 * Validates intervention result structure - EXTRACTED TO REDUCE NESTING
 */
const validateInterventionResult = (result: any, intervention: ViralIntervention) => {
  expect(result).toBeDefined();
  expect(result.intervention).toEqual(intervention);
  expect(result.currentMetrics).toBeDefined();
  expect(result.projectedMetrics).toBeDefined();
  expect(result.impact).toBeDefined();
  expect(result.confidence).toBeGreaterThan(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
  expect(Array.isArray(result.risks)).toBe(true);
  expect(Array.isArray(result.timeline)).toBe(true);
  expect(result.roi).toBeDefined();
};

/**
 * Validates ROI calculation consistency - EXTRACTED TO REDUCE NESTING
 */
const validateROICalculations = (roi: any, expectedCost: number) => {
  expect(roi.investmentRequired).toBeGreaterThanOrEqual(expectedCost);
  expect(typeof roi.breakEvenDays).toBe('number');
  expect(roi.breakEvenDays).toBeGreaterThan(0);
  expect(typeof roi.projectedRevenue).toBe('number');
  expect(roi.projectedRevenue).toBeGreaterThan(0);
  expect(typeof roi.netROI).toBe('number');
  expect(roi.riskAdjustedROI).toBeLessThanOrEqual(roi.netROI);
};

/**
 * Validates timeline progression logic - EXTRACTED TO REDUCE NESTING
 */
const validateTimelineProgression = (timeline: any[]) => {
  expect(timeline.length).toBeGreaterThan(0);
  expect(timeline[0].day).toBe(0);
  
  // Validate cumulative progression
  for (let i = 1; i < timeline.length; i++) {
    expect(timeline[i].cumulativeUsers).toBeGreaterThanOrEqual(
      timeline[i - 1].cumulativeUsers,
    );
    expect(timeline[i].cumulativeRevenue).toBeGreaterThanOrEqual(
      timeline[i - 1].cumulativeRevenue,
    );
    expect(timeline[i].confidence).toBeLessThanOrEqual(
      timeline[i - 1].confidence,
    );
  }
};

/**
 * Validates risk assessment sorting - EXTRACTED TO REDUCE NESTING
 */
const validateRiskSortOrder = (risks: Array<{ probability: number; impact: number }>) => {
  if (risks.length <= 1) return;
  
  for (let i = 0; i < risks.length - 1; i++) {
    const currentRiskScore = risks[i].probability * risks[i].impact;
    const nextRiskScore = risks[i + 1].probability * risks[i + 1].impact;
    expect(currentRiskScore).toBeGreaterThanOrEqual(nextRiskScore);
  }
};

/**
 * Validates optimization opportunity sorting - EXTRACTED TO REDUCE NESTING  
 */
const validateOpportunitySortOrder = (opportunities: Array<{ strategicValue: number }>) => {
  if (opportunities.length <= 1) return;
  
  for (let i = 0; i < opportunities.length - 1; i++) {
    expect(opportunities[i].strategicValue).toBeGreaterThanOrEqual(
      opportunities[i + 1].strategicValue,
    );
  }
};

describe('ViralOptimizationEngine', () => {
  let engine: ViralOptimizationEngine;
  let mockSupabaseInstance: any;
  let mockCalculatorInstance: any;

  const mockCurrentMetrics: EnhancedViralCoefficient = {
    coefficient: 0.8,
    adjustedCoefficient: 1.1,
    sustainableCoefficient: 0.7,
    invitationRate: 0.6,
    acceptanceRate: 0.5,
    activationRate: 0.4,
    avgInvitesPerUser: 2.1,
    qualityScore: 0.7,
    timeToInvite: 5,
    viralCycleTime: 14,
    velocityTrend: 'stable',
    loops: [
      {
        type: 'supplier_to_couple',
        count: 10,
        conversionRate: 0.3,
        avgCycleTime: 7,
        revenue: 500,
        quality: 0.6,
        amplification: 1.2,
      },
    ],
    dominantLoop: 'supplier_to_couple',
    loopEfficiency: 0.4,
    weddingSeasonMultiplier: 1.2,
    vendorTypeBreakdown: [],
    geographicSpread: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Use extracted helper function to create mock instance - REDUCED NESTING
    mockSupabaseInstance = createOptimizationEngineMockFactory();
    mockSupabase.mockReturnValue(mockSupabaseInstance);

    // Setup calculator mock instance
    mockCalculatorInstance = {
      calculateEnhanced: jest.fn().mockResolvedValue(mockCurrentMetrics),
      identifyViralBottlenecks: jest.fn().mockResolvedValue([]),
      generateOptimizationRecommendations: jest.fn().mockResolvedValue([]),
    };

    MockAdvancedViralCalculator.mockImplementation(
      () => mockCalculatorInstance,
    );

    engine = new ViralOptimizationEngine();
  });

  describe('simulateViralIntervention', () => {
    it('should simulate invitation incentive intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'invitation_incentive',
        parameters: {
          incentiveAmount: 50,
          incentiveType: 'monetary',
        },
        duration: 30,
        cost: 2000,
        targetSegment: 'photographers',
      };

      const result = await engine.simulateViralIntervention(intervention);

      // Use extracted validation helper - REDUCED NESTING
      validateInterventionResult(result, intervention);
      expect(result.currentMetrics).toEqual(mockCurrentMetrics);

      // Projected metrics should show improvement
      expect(result.projectedMetrics.coefficient).toBeGreaterThan(
        mockCurrentMetrics.coefficient,
      );
      expect(result.projectedMetrics.invitationRate).toBeGreaterThan(
        mockCurrentMetrics.invitationRate,
      );

      // Impact calculations
      expect(result.impact.coefficientIncrease).toBeGreaterThan(0);
      expect(result.impact.userGrowthImpact).toBeGreaterThanOrEqual(0);
      expect(result.impact.revenueImpact).toBeGreaterThanOrEqual(0);

      // Timeline validation using helper
      expect(result.timeline.length).toBeGreaterThan(0);

      // ROI validation using helper - REDUCED NESTING
      validateROICalculations(result.roi, intervention.cost!);
    });

    it('should simulate onboarding optimization intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'onboarding_optimization',
        parameters: {
          flowOptimization: 'streamline',
          reductionInSteps: 3,
        },
        duration: 14,
        cost: 1500,
      };

      const result = await engine.simulateViralIntervention(intervention);

      expect(result).toBeDefined();

      // Should improve activation rate
      expect(result.projectedMetrics.activationRate).toBeGreaterThan(
        mockCurrentMetrics.activationRate,
      );
      expect(result.projectedMetrics.timeToInvite).toBeLessThan(
        mockCurrentMetrics.timeToInvite,
      );

      // Should have positive impact
      expect(result.impact.coefficientIncrease).toBeGreaterThan(0);

      // Timeline should reflect gradual improvement
      expect(result.timeline.length).toBeGreaterThan(0);
      const firstPoint = result.timeline[0];
      const lastPoint = result.timeline[result.timeline.length - 1];
      expect(lastPoint.projectedCoefficient).toBeGreaterThan(
        firstPoint.projectedCoefficient,
      );
    });

    it('should simulate seasonal campaign intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'seasonal_campaign',
        parameters: {
          campaignType: 'partnerships',
          targetSeason: 'off',
        },
        duration: 45,
        cost: 5000,
      };

      const result = await engine.simulateViralIntervention(intervention);

      expect(result).toBeDefined();

      // Should improve seasonal multiplier
      expect(result.projectedMetrics.weddingSeasonMultiplier).toBeGreaterThan(
        mockCurrentMetrics.weddingSeasonMultiplier,
      );

      // Should have reasonable confidence (seasonal campaigns are less predictable)
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.9);

      // Should identify seasonality risks
      const seasonalRisks = result.risks.filter(
        (risk) => risk.type === 'seasonality_mismatch',
      );
      if (new Date().getMonth() >= 4 && new Date().getMonth() <= 8) {
        // If current month is peak season, should warn about seasonality mismatch
        expect(seasonalRisks.length).toBeGreaterThan(0);
      }
    });

    it('should simulate referral bonus intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'referral_bonus',
        parameters: {
          bonusStructure: 'tiered',
          bonusAmount: 100,
        },
        duration: 21,
        cost: 3000,
      };

      const result = await engine.simulateViralIntervention(intervention);

      expect(result).toBeDefined();

      // Should improve invitation rate and quality
      expect(result.projectedMetrics.invitationRate).toBeGreaterThan(
        mockCurrentMetrics.invitationRate,
      );
      expect(result.projectedMetrics.qualityScore).toBeGreaterThanOrEqual(
        mockCurrentMetrics.qualityScore,
      );

      // Should have higher cost due to bonus structure
      expect(result.roi.investmentRequired).toBeGreaterThanOrEqual(
        intervention.cost!,
      );
      expect(result.roi.investmentRequired).toBeLessThanOrEqual(
        intervention.cost! + intervention.parameters.bonusAmount! * 10,
      );
    });

    it('should simulate network effect boost intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'network_effect_boost',
        parameters: {
          networkTargeting: 'hubs',
          amplificationTarget: 2.0,
        },
        duration: 28,
        cost: 2500,
      };

      const result = await engine.simulateViralIntervention(intervention);

      expect(result).toBeDefined();

      // Should improve loop efficiency and amplification
      expect(result.projectedMetrics.loopEfficiency).toBeGreaterThan(
        mockCurrentMetrics.loopEfficiency,
      );

      // Should boost loops with amplification
      result.projectedMetrics.loops.forEach((loop) => {
        const originalLoop = mockCurrentMetrics.loops.find(
          (l) => l.type === loop.type,
        );
        if (originalLoop) {
          expect(loop.amplification).toBeGreaterThan(
            originalLoop.amplification,
          );
        }
      });

      // Should have network-specific impact
      expect(result.impact.networkStrengthImpact).toBeGreaterThan(0);
    });

    it('should calculate realistic ROI projections', async () => {
      const intervention: ViralIntervention = {
        type: 'invitation_incentive',
        parameters: {
          incentiveAmount: 25,
          incentiveType: 'service_credit',
        },
        duration: 30,
        cost: 1000,
      };

      const result = await engine.simulateViralIntervention(intervention);

      const roi = result.roi;

      // Investment should match intervention cost
      expect(roi.investmentRequired).toBe(intervention.cost);

      // Break-even should be reasonable
      expect(roi.breakEvenDays).toBeGreaterThan(0);
      expect(roi.breakEvenDays).toBeLessThanOrEqual(intervention.duration);

      // Projected revenue should be positive for effective interventions
      expect(roi.projectedRevenue).toBeGreaterThan(0);

      // Net ROI should be calculated correctly
      const expectedNetROI =
        (roi.projectedRevenue - roi.investmentRequired) /
        roi.investmentRequired;
      expect(roi.netROI).toBeCloseTo(expectedNetROI, 2);

      // Risk-adjusted ROI should be less than net ROI
      expect(roi.riskAdjustedROI).toBeLessThanOrEqual(roi.netROI);
      expect(roi.riskAdjustedROI).toBe(roi.netROI * 0.8); // 20% risk discount
    });

    it('should identify appropriate risks for different interventions', async () => {
      // High-incentive intervention should flag quality risks
      const highIncentiveIntervention: ViralIntervention = {
        type: 'invitation_incentive',
        parameters: {
          incentiveAmount: 100, // High incentive
          incentiveType: 'monetary',
        },
        duration: 30,
        cost: 5000,
      };

      const result = await engine.simulateViralIntervention(
        highIncentiveIntervention,
      );

      const qualityRisks = result.risks.filter(
        (risk) => risk.type === 'quality_degradation',
      );
      expect(qualityRisks.length).toBeGreaterThan(0);

      const costRisks = result.risks.filter(
        (risk) => risk.type === 'cost_overrun',
      );
      expect(costRisks.length).toBeGreaterThan(0);

      // Use extracted helper for risk sorting validation - REDUCED NESTING
      validateRiskSortOrder(result.risks);
    });

    it('should generate realistic simulation timeline', async () => {
      const intervention: ViralIntervention = {
        type: 'onboarding_optimization',
        parameters: {
          flowOptimization: 'gamification',
          reductionInSteps: 2,
        },
        duration: 60,
        cost: 3000,
      };

      const result = await engine.simulateViralIntervention(intervention);

      const timeline = result.timeline;

      // Should have multiple timeline points
      expect(timeline.length).toBeGreaterThan(3);

      // Should show progression over time
      expect(timeline[timeline.length - 1].day).toBe(intervention.duration);

      // Coefficients should generally increase over time (with ramp-up)
      const finalCoefficient =
        timeline[timeline.length - 1].projectedCoefficient;
      const initialCoefficient = timeline[0].projectedCoefficient;
      expect(finalCoefficient).toBeGreaterThan(initialCoefficient);

      // Use extracted helper for timeline validation - REDUCED NESTING
      validateTimelineProgression(timeline);
    });
  });

  describe('analyzeViralBottlenecks', () => {
    beforeEach(() => {
      // Mock bottlenecks data
      const mockBottlenecks = [
        {
          stage: 'activation' as const,
          impact: 0.4,
          description: 'Low activation rate: 40%',
          recommendation: 'Streamline onboarding',
          estimatedImprovementPotential: 0.3,
        },
        {
          stage: 'invitation' as const,
          impact: 0.3,
          description: 'Low invitation rate: 60%',
          recommendation: 'Add invitation prompts',
          estimatedImprovementPotential: 0.2,
        },
      ];

      mockCalculatorInstance.identifyViralBottlenecks.mockResolvedValue(
        mockBottlenecks,
      );
    });

    it('should analyze viral bottlenecks comprehensively', async () => {
      const result = await engine.analyzeViralBottlenecks();

      expect(result).toBeDefined();
      expect(Array.isArray(result.bottlenecks)).toBe(true);
      expect(Array.isArray(result.criticalPath)).toBe(true);
      expect(typeof result.optimizationPotential).toBe('number');
      expect(Array.isArray(result.quickWins)).toBe(true);
      expect(Array.isArray(result.longTermOpportunities)).toBe(true);
      expect(Array.isArray(result.seasonalConsiderations)).toBe(true);

      // Critical path should be ordered by impact
      expect(result.criticalPath).toEqual(['activation', 'invitation']);

      // Optimization potential should be sum of improvement potentials
      expect(result.optimizationPotential).toBe(0.5); // 0.3 + 0.2
    });

    it('should identify appropriate quick wins', async () => {
      const mockBottlenecks = [
        {
          stage: 'invitation' as const,
          impact: 0.4, // High impact should trigger quick win
          description: 'Low invitation rate',
          recommendation: 'Add prompts',
          estimatedImprovementPotential: 0.2,
        },
        {
          stage: 'acceptance' as const,
          impact: 0.3, // Medium impact should trigger quick win
          description: 'Low acceptance rate',
          recommendation: 'Improve emails',
          estimatedImprovementPotential: 0.15,
        },
      ];

      mockCalculatorInstance.identifyViralBottlenecks.mockResolvedValue(
        mockBottlenecks,
      );

      const result = await engine.analyzeViralBottlenecks();

      expect(result.quickWins.length).toBeGreaterThan(0);

      result.quickWins.forEach((quickWin) => {
        expect(typeof quickWin.action).toBe('string');
        expect(quickWin.estimatedImpact).toBeGreaterThan(0);
        expect(quickWin.implementationDays).toBeGreaterThan(0);
        expect(quickWin.cost).toBeGreaterThan(0);
        expect(quickWin.confidence).toBeGreaterThan(0);
        expect(quickWin.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(quickWin.dependencies)).toBe(true);
      });

      // Quick wins should be sorted by ROI
      for (let i = 0; i < result.quickWins.length - 1; i++) {
        const currentROI =
          result.quickWins[i].estimatedImpact /
          (result.quickWins[i].cost / 1000 +
            result.quickWins[i].implementationDays / 10);
        const nextROI =
          result.quickWins[i + 1].estimatedImpact /
          (result.quickWins[i + 1].cost / 1000 +
            result.quickWins[i + 1].implementationDays / 10);
        expect(currentROI).toBeGreaterThanOrEqual(nextROI);
      }
    });

    it('should identify relevant long-term opportunities', async () => {
      // Mock low quality score to trigger AI opportunity
      const lowQualityMetrics = {
        ...mockCurrentMetrics,
        qualityScore: 0.4,
        loopEfficiency: 0.3,
        geographicSpread: [
          {
            region: 'London',
            viralStrength: 0.5,
            clusterSize: 10,
            networkDensity: 0.3,
          },
        ],
      };

      mockCalculatorInstance.calculateEnhanced.mockResolvedValue(
        lowQualityMetrics,
      );

      const result = await engine.analyzeViralBottlenecks();

      expect(result.longTermOpportunities.length).toBeGreaterThan(0);

      result.longTermOpportunities.forEach((opportunity) => {
        expect(typeof opportunity.opportunity).toBe('string');
        expect(opportunity.potentialImpact).toBeGreaterThan(0);
        expect(opportunity.timeToImplement).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(
          opportunity.resourceRequirement,
        );
        expect(opportunity.strategicValue).toBeGreaterThan(0);
        expect(opportunity.strategicValue).toBeLessThanOrEqual(1);
      });

      // Use extracted helper for opportunity sorting validation - REDUCED NESTING
      validateOpportunitySortOrder(result.longTermOpportunities);

      // Should include AI-powered opportunity for low quality score
      const aiOpportunities = result.longTermOpportunities.filter(
        (opp) =>
          opp.opportunity.toLowerCase().includes('ai') &&
          opp.opportunity.toLowerCase().includes('quality'),
      );
      expect(aiOpportunities.length).toBeGreaterThan(0);
    });

    it('should provide seasonal considerations for all seasons', async () => {
      const result = await engine.analyzeViralBottlenecks();

      expect(result.seasonalConsiderations).toHaveLength(3); // peak, shoulder, off

      const seasons = result.seasonalConsiderations.map((s) => s.season);
      expect(seasons).toContain('peak');
      expect(seasons).toContain('shoulder');
      expect(seasons).toContain('off');

      result.seasonalConsiderations.forEach((consideration) => {
        expect(Array.isArray(consideration.opportunities)).toBe(true);
        expect(Array.isArray(consideration.challenges)).toBe(true);
        expect(Array.isArray(consideration.recommendedActions)).toBe(true);
        expect(typeof consideration.timeline).toBe('string');

        expect(consideration.opportunities.length).toBeGreaterThan(0);
        expect(consideration.challenges.length).toBeGreaterThan(0);
        expect(consideration.recommendedActions.length).toBeGreaterThan(0);
      });

      // Peak season should mention high competition
      const peakSeason = result.seasonalConsiderations.find(
        (s) => s.season === 'peak',
      );
      expect(
        peakSeason!.challenges.some((c) =>
          c.toLowerCase().includes('competition'),
        ),
      ).toBe(true);

      // Off season should mention vendor availability
      const offSeason = result.seasonalConsiderations.find(
        (s) => s.season === 'off',
      );
      expect(
        offSeason!.opportunities.some((o) =>
          o.toLowerCase().includes('availability'),
        ),
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle calculator errors gracefully', async () => {
      mockCalculatorInstance.calculateEnhanced.mockRejectedValue(
        new Error('Calculation failed'),
      );

      const intervention: ViralIntervention = {
        type: 'invitation_incentive',
        parameters: { incentiveAmount: 50 },
        duration: 30,
        cost: 1000,
      };

      await expect(
        engine.simulateViralIntervention(intervention),
      ).rejects.toThrow('Calculation failed');
    });

    it('should handle missing historical data gracefully', async () => {
      // Mock empty historical data using helper - REDUCED NESTING
      mockSupabaseInstance.from.mockReturnValue(
        createOptimizationQueryMockChain([]) // Empty data
      );

      const intervention: ViralIntervention = {
        type: 'seasonal_campaign',
        parameters: { campaignType: 'email' },
        duration: 30,
        cost: 1000,
      };

      const result = await engine.simulateViralIntervention(intervention);

      // Should reduce confidence due to lack of historical data
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent results across multiple simulation runs', async () => {
      const intervention: ViralIntervention = {
        type: 'onboarding_optimization',
        parameters: {
          flowOptimization: 'streamline',
          reductionInSteps: 2,
        },
        duration: 30,
        cost: 2000,
      };

      const result1 = await engine.simulateViralIntervention(intervention);
      const result2 = await engine.simulateViralIntervention(intervention);

      // Results should be identical for same input
      expect(result1.projectedMetrics.coefficient).toBeCloseTo(
        result2.projectedMetrics.coefficient,
        3,
      );
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.roi.netROI).toBeCloseTo(result2.roi.netROI, 3);
    });

    it('should scale impact appropriately with intervention magnitude', async () => {
      const smallIntervention: ViralIntervention = {
        type: 'referral_bonus',
        parameters: { bonusAmount: 25 },
        duration: 30,
        cost: 1000,
      };

      const largeIntervention: ViralIntervention = {
        type: 'referral_bonus',
        parameters: { bonusAmount: 100 },
        duration: 30,
        cost: 4000,
      };

      const smallResult =
        await engine.simulateViralIntervention(smallIntervention);
      const largeResult =
        await engine.simulateViralIntervention(largeIntervention);

      // Larger intervention should have larger impact
      expect(largeResult.impact.coefficientIncrease).toBeGreaterThan(
        smallResult.impact.coefficientIncrease,
      );
      expect(largeResult.impact.userGrowthImpact).toBeGreaterThan(
        smallResult.impact.userGrowthImpact,
      );
      expect(largeResult.impact.revenueImpact).toBeGreaterThan(
        smallResult.impact.revenueImpact,
      );

      // But may have lower confidence due to higher magnitude
      expect(largeResult.confidence).toBeLessThanOrEqual(
        smallResult.confidence,
      );
    });
  });
});
