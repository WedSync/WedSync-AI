import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  ViralOptimizationEngine,
  ViralIntervention,
  ViralSimulationResult,
} from '../viral-optimization-engine';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
} from '../advanced-viral-calculator';
import { createClient } from '@/lib/database/supabase-admin';

// Mock dependencies
jest.mock('@/lib/database/supabase-admin');
jest.mock('../advanced-viral-calculator');

const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
const mockCalculator = AdvancedViralCalculator as jest.MockedClass<
  typeof AdvancedViralCalculator
>;

describe('ViralOptimizationEngine', () => {
  let engine: ViralOptimizationEngine;
  let mockSupabaseInstance: any;
  let mockCalculatorInstance: any;

  beforeEach(() => {
    mockSupabaseInstance = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    mockSupabase.mockReturnValue(mockSupabaseInstance);

    mockCalculatorInstance = {
      calculateEnhanced: jest.fn(),
      analyzeEnhancedLoops: jest.fn(),
    };
    mockCalculator.mockImplementation(() => mockCalculatorInstance);

    engine = new ViralOptimizationEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runSimulation', () => {
    const mockBaselineMetrics: EnhancedViralCoefficient = {
      coefficient: 1.0,
      sustainableCoefficient: 0.9,
      acceptanceRate: 0.6,
      conversionTime: 18,
      qualityScore: 0.65,
      seasonalMultiplier: 1.0,
      velocityTrend: 'stable',
      weddingIndustryFactors: {
        seasonalImpact: 'neutral',
        vendorDensity: 'medium',
        marketMaturity: 'growing',
      },
      metadata: {
        totalInvitations: 100,
        totalAcceptances: 60,
        analysisDate: new Date().toISOString(),
        cohortSize: 50,
      },
    };

    beforeEach(() => {
      mockCalculatorInstance.calculateEnhanced.mockResolvedValue(
        mockBaselineMetrics,
      );
      mockSupabaseInstance.select.mockResolvedValue({
        data: [
          {
            period_start: '2024-01-01',
            invitations_sent: 20,
            acceptances_count: 12,
          },
          {
            period_start: '2024-02-01',
            invitations_sent: 25,
            acceptances_count: 15,
          },
        ],
        error: null,
      });
    });

    it('should simulate incentive intervention correctly', async () => {
      const intervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 50,
          targetSegment: 'photographers',
        },
        expectedImpact: {
          invitationRate: 1.3,
          conversionRate: 1.2,
          activationRate: 1.1,
        },
        cost: 5000,
      };

      const result = await engine.runSimulation(intervention, 30);

      expect(result.projectedOutcome).toBeDefined();
      expect(result.projectedOutcome.baselineCoefficient).toBe(1.0);
      expect(result.projectedOutcome.projectedCoefficient).toBeGreaterThan(1.0);
      expect(result.projectedOutcome.expectedNewUsers).toBeGreaterThan(0);
      expect(result.projectedOutcome.projectedRevenue).toBeGreaterThan(0);
      expect(result.projectedOutcome.confidenceLevel).toBeGreaterThan(0.5);

      expect(result.riskAnalysis).toBeDefined();
      expect(result.riskAnalysis.overallRisk).toBe('medium'); // Default for incentive interventions

      expect(result.timelineProjections).toBeDefined();
      expect(result.timelineProjections.length).toBeGreaterThan(0);

      expect(result.roiAnalysis).toBeDefined();
      expect(result.roiAnalysis.investmentCost).toBe(5000);
      expect(result.roiAnalysis.projectedReturn).toBeGreaterThan(0);
      expect(result.roiAnalysis.roi).toBeGreaterThan(0);
    });

    it('should simulate timing intervention for seasonal optimization', async () => {
      const intervention: ViralIntervention = {
        type: 'timing',
        parameters: {
          timingOptimization: 'seasonal',
          targetSegment: 'all',
        },
        expectedImpact: {
          invitationRate: 1.4,
          conversionRate: 1.1,
          cycleTime: -5,
        },
        cost: 3000,
      };

      const result = await engine.runSimulation(intervention, 45);

      expect(result.projectedOutcome.projectedCoefficient).toBeGreaterThan(
        mockBaselineMetrics.coefficient,
      );
      expect(result.riskAnalysis.seasonalRisk).toBe('low'); // Seasonal timing should reduce seasonal risk
      expect(result.timelineProjections.length).toBeGreaterThan(6); // 45 days = ~6-7 weeks
    });

    it('should simulate targeting intervention', async () => {
      const intervention: ViralIntervention = {
        type: 'targeting',
        parameters: {
          targetSegment: 'venues',
        },
        expectedImpact: {
          conversionRate: 1.5,
          activationRate: 1.3,
        },
        cost: 2000,
      };

      const result = await engine.runSimulation(intervention, 21);

      expect(result.projectedOutcome).toBeDefined();
      expect(result.riskAnalysis.implementationRisk).toBe('low'); // Targeting is typically lower risk
      expect(result.roiAnalysis.investmentCost).toBe(2000);
    });

    it('should simulate messaging intervention', async () => {
      const intervention: ViralIntervention = {
        type: 'messaging',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.25,
          activationRate: 1.15,
        },
        cost: 1500,
      };

      const result = await engine.runSimulation(intervention, 14);

      expect(result.projectedOutcome).toBeDefined();
      expect(result.riskAnalysis.marketRisk).toBe('low'); // Messaging changes are typically low market risk
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate ROI correctly based on projected revenue increase', async () => {
      const highImpactIntervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 100,
          targetSegment: 'all',
        },
        expectedImpact: {
          invitationRate: 1.8,
          conversionRate: 1.5,
          activationRate: 1.3,
        },
        cost: 10000,
      };

      const result = await engine.runSimulation(highImpactIntervention, 30);

      expect(result.roiAnalysis.roi).toBeGreaterThan(1.0);
      expect(result.roiAnalysis.paybackPeriod).toBeGreaterThan(0);
      expect(result.roiAnalysis.breakEvenPoint).toBeGreaterThan(0);
      expect(result.roiAnalysis.projectedReturn).toBeGreaterThan(
        result.roiAnalysis.investmentCost,
      );
    });

    it('should provide realistic timeline projections', async () => {
      const intervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 25,
          targetSegment: 'photographers',
        },
        expectedImpact: {
          invitationRate: 1.2,
          conversionRate: 1.15,
        },
        cost: 2500,
      };

      const result = await engine.runSimulation(intervention, 28); // 4 weeks

      expect(result.timelineProjections).toHaveLength(4);

      // Verify progressive improvement over time
      for (let i = 1; i < result.timelineProjections.length; i++) {
        expect(
          result.timelineProjections[i].coefficient,
        ).toBeGreaterThanOrEqual(result.timelineProjections[i - 1].coefficient);
        expect(result.timelineProjections[i].users).toBeGreaterThanOrEqual(
          result.timelineProjections[i - 1].users,
        );
      }
    });

    it('should adjust confidence based on intervention complexity', async () => {
      const simpleIntervention: ViralIntervention = {
        type: 'messaging',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.1,
        },
        cost: 500,
      };

      const complexIntervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 200,
          targetSegment: 'all',
        },
        expectedImpact: {
          invitationRate: 2.0,
          conversionRate: 1.8,
          activationRate: 1.5,
        },
        cost: 25000,
      };

      const simpleResult = await engine.runSimulation(simpleIntervention, 14);
      const complexResult = await engine.runSimulation(complexIntervention, 60);

      // Simple interventions should have higher confidence
      expect(simpleResult.projectedOutcome.confidenceLevel).toBeGreaterThan(
        complexResult.projectedOutcome.confidenceLevel,
      );
    });

    it('should incorporate seasonal factors into projections', async () => {
      const peakSeasonMetrics = {
        ...mockBaselineMetrics,
        seasonalMultiplier: 1.4,
        weddingIndustryFactors: {
          ...mockBaselineMetrics.weddingIndustryFactors,
          seasonalImpact: 'peak' as const,
        },
      };

      mockCalculatorInstance.calculateEnhanced.mockResolvedValue(
        peakSeasonMetrics,
      );

      const intervention: ViralIntervention = {
        type: 'timing',
        parameters: {
          timingOptimization: 'seasonal',
        },
        expectedImpact: {
          invitationRate: 1.5,
        },
        cost: 4000,
      };

      const result = await engine.runSimulation(intervention, 30);

      // Peak season + seasonal timing should yield high coefficients
      expect(result.projectedOutcome.projectedCoefficient).toBeGreaterThan(1.5);
      expect(result.riskAnalysis.seasonalRisk).toBe('low');
    });

    it('should provide wedding industry specific recommendations', async () => {
      const intervention: ViralIntervention = {
        type: 'targeting',
        parameters: {
          targetSegment: 'photographers',
        },
        expectedImpact: {
          conversionRate: 1.3,
        },
        cost: 1000,
      };

      const result = await engine.runSimulation(intervention, 21);

      expect(result.recommendations).toContain(
        'Focus on peak wedding season timing',
      );
      expect(result.recommendations).toContain(
        'Leverage vendor-to-couple relationships',
      );
      expect(
        result.recommendations.some((rec) => rec.includes('wedding')),
      ).toBe(true);
    });

    it('should handle edge cases and validate input parameters', async () => {
      const invalidIntervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: -50, // Invalid negative incentive
          targetSegment: 'all',
        },
        expectedImpact: {
          invitationRate: 0.5, // Invalid - should increase, not decrease
        },
        cost: 1000,
      };

      await expect(
        engine.runSimulation(invalidIntervention, 7),
      ).rejects.toThrow('Invalid intervention parameters');
    });

    it('should handle very short duration simulations', async () => {
      const intervention: ViralIntervention = {
        type: 'messaging',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.15,
        },
        cost: 500,
      };

      const result = await engine.runSimulation(intervention, 3); // 3 days

      expect(result.timelineProjections).toHaveLength(1); // Should have at least one week projection
      expect(result.projectedOutcome.confidenceLevel).toBeLessThan(0.7); // Lower confidence for short duration
    });

    it('should handle very long duration simulations', async () => {
      const intervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 30,
          targetSegment: 'venues',
        },
        expectedImpact: {
          invitationRate: 1.25,
          conversionRate: 1.2,
        },
        cost: 8000,
      };

      const result = await engine.runSimulation(intervention, 180); // ~6 months

      expect(result.timelineProjections.length).toBeGreaterThanOrEqual(20); // Should have weekly projections
      expect(result.riskAnalysis.implementationRisk).toBe('high'); // Long interventions have higher implementation risk
    });

    it('should calculate realistic user growth projections', async () => {
      // Mock historical data showing current user growth
      mockSupabaseInstance.select.mockResolvedValue({
        data: [
          { created_at: '2024-05-01', id: 'user1' },
          { created_at: '2024-05-15', id: 'user2' },
          { created_at: '2024-06-01', id: 'user3' },
          { created_at: '2024-06-15', id: 'user4' },
        ],
        error: null,
      });

      const intervention: ViralIntervention = {
        type: 'incentive',
        parameters: {
          incentiveAmount: 40,
          targetSegment: 'photographers',
        },
        expectedImpact: {
          invitationRate: 1.4,
          conversionRate: 1.25,
        },
        cost: 3500,
      };

      const result = await engine.runSimulation(intervention, 28);

      expect(result.projectedOutcome.expectedNewUsers).toBeGreaterThan(0);
      expect(result.timelineProjections[0].users).toBeDefined();

      // Growth should be realistic (not exponential explosion)
      const finalWeekUsers =
        result.timelineProjections[result.timelineProjections.length - 1].users;
      const firstWeekUsers = result.timelineProjections[0].users;
      const growthRatio = finalWeekUsers / firstWeekUsers;

      expect(growthRatio).toBeLessThan(5.0); // Reasonable growth bounds
      expect(growthRatio).toBeGreaterThan(1.0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabaseInstance.select.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      const intervention: ViralIntervention = {
        type: 'messaging',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.1,
        },
        cost: 500,
      };

      await expect(engine.runSimulation(intervention, 14)).rejects.toThrow(
        'Connection failed',
      );
    });

    it('should handle insufficient historical data', async () => {
      mockSupabaseInstance.select.mockResolvedValue({
        data: [], // No historical data
        error: null,
      });

      const intervention: ViralIntervention = {
        type: 'targeting',
        parameters: {
          targetSegment: 'venues',
        },
        expectedImpact: {
          conversionRate: 1.3,
        },
        cost: 1500,
      };

      const result = await engine.runSimulation(intervention, 21);

      // Should still provide results but with lower confidence
      expect(result.projectedOutcome.confidenceLevel).toBeLessThan(0.6);
      expect(result.recommendations).toContain('Collect more baseline data');
    });

    it('should validate intervention type and parameters', async () => {
      const invalidIntervention = {
        type: 'invalid_type' as any,
        parameters: {},
        expectedImpact: {},
        cost: 1000,
      };

      await expect(
        engine.runSimulation(invalidIntervention, 14),
      ).rejects.toThrow('Invalid intervention type');
    });

    it('should handle zero or negative costs', async () => {
      const zeroCostIntervention: ViralIntervention = {
        type: 'messaging',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.05,
        },
        cost: 0,
      };

      const result = await engine.runSimulation(zeroCostIntervention, 7);

      expect(result.roiAnalysis.roi).toBe(Infinity);
      expect(result.roiAnalysis.paybackPeriod).toBe(0);
    });
  });
});
