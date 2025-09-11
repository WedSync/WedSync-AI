import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
  ViralBottleneck,
  OptimizationRecommendation,
} from '../advanced-viral-calculator';
import { createClient } from '@/lib/database/supabase-admin';

// Mock Supabase client
jest.mock('@/lib/database/supabase-admin');
const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;

describe('AdvancedViralCalculator', () => {
  let calculator: AdvancedViralCalculator;
  let mockSupabaseInstance: any;

  beforeEach(() => {
    mockSupabaseInstance = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    mockSupabase.mockReturnValue(mockSupabaseInstance);
    calculator = new AdvancedViralCalculator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEnhanced', () => {
    it('should calculate enhanced viral coefficient with wedding season adjustments', async () => {
      // Mock data for peak wedding season (May)
      const mockInvitationData = [
        {
          id: 1,
          invited_at: '2024-05-15',
          accepted: true,
          joined_at: '2024-05-16',
        },
        {
          id: 2,
          invited_at: '2024-05-15',
          accepted: true,
          joined_at: '2024-05-17',
        },
        { id: 3, invited_at: '2024-05-16', accepted: false, joined_at: null },
        {
          id: 4,
          invited_at: '2024-05-16',
          accepted: true,
          joined_at: '2024-05-18',
        },
      ];

      const mockViralLoopData = [
        {
          loop_type: 'supplier_to_couple',
          count: 25,
          revenue: 15000,
          cycle_time: 14,
        },
        {
          loop_type: 'couple_to_supplier',
          count: 18,
          revenue: 12000,
          cycle_time: 21,
        },
      ];

      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: mockInvitationData, error: null })
        .mockResolvedValueOnce({ data: mockViralLoopData, error: null });

      const timeframe = {
        start: new Date('2024-05-01'),
        end: new Date('2024-05-31'),
      };

      const result = await calculator.calculateEnhanced(timeframe);

      expect(result).toBeDefined();
      expect(result.coefficient).toBeGreaterThan(1.0); // Should be viral
      expect(result.seasonalMultiplier).toBe(1.4); // Peak season multiplier
      expect(result.weddingIndustryFactors.seasonalImpact).toBe('peak');
      expect(result.sustainableCoefficient).toBeGreaterThan(0);
      expect(result.acceptanceRate).toBe(0.75); // 3/4 accepted
      expect(result.conversionTime).toBeGreaterThan(0);
    });

    it('should handle off-season calculations correctly', async () => {
      // Mock data for off-season (January)
      const mockInvitationData = [
        {
          id: 1,
          invited_at: '2024-01-15',
          accepted: true,
          joined_at: '2024-01-20',
        },
        { id: 2, invited_at: '2024-01-16', accepted: false, joined_at: null },
      ];

      const mockViralLoopData = [
        {
          loop_type: 'supplier_to_couple',
          count: 8,
          revenue: 4000,
          cycle_time: 28,
        },
      ];

      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: mockInvitationData, error: null })
        .mockResolvedValueOnce({ data: mockViralLoopData, error: null });

      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await calculator.calculateEnhanced(timeframe);

      expect(result.seasonalMultiplier).toBe(0.7); // Off-season multiplier
      expect(result.weddingIndustryFactors.seasonalImpact).toBe('off');
      expect(result.coefficient).toBeLessThan(1.0); // Non-viral in off-season
    });

    it('should handle empty data gracefully', async () => {
      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const timeframe = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-31'),
      };

      const result = await calculator.calculateEnhanced(timeframe);

      expect(result.coefficient).toBe(0);
      expect(result.acceptanceRate).toBe(0);
      expect(result.qualityScore).toBe(0);
      expect(result.sustainableCoefficient).toBe(0);
    });

    it('should calculate quality score based on multiple factors', async () => {
      const mockInvitationData = [
        {
          id: 1,
          invited_at: '2024-06-01',
          accepted: true,
          joined_at: '2024-06-02',
        },
        {
          id: 2,
          invited_at: '2024-06-01',
          accepted: true,
          joined_at: '2024-06-03',
        },
        {
          id: 3,
          invited_at: '2024-06-02',
          accepted: true,
          joined_at: '2024-06-04',
        },
        {
          id: 4,
          invited_at: '2024-06-02',
          accepted: true,
          joined_at: '2024-06-05',
        },
      ];

      const mockViralLoopData = [
        {
          loop_type: 'supplier_to_couple',
          count: 20,
          revenue: 18000,
          cycle_time: 7,
        },
      ];

      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: mockInvitationData, error: null })
        .mockResolvedValueOnce({ data: mockViralLoopData, error: null });

      const timeframe = {
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
      };

      const result = await calculator.calculateEnhanced(timeframe);

      expect(result.qualityScore).toBeGreaterThan(0.7); // High acceptance rate should yield good quality
      expect(result.acceptanceRate).toBe(1.0); // 100% acceptance
      expect(result.conversionTime).toBeLessThan(5); // Quick conversion
    });
  });

  describe('analyzeEnhancedLoops', () => {
    it('should analyze viral loops with wedding industry context', async () => {
      const mockLoopData = [
        {
          loop_type: 'supplier_to_couple',
          count: 45,
          revenue: 35000,
          cycle_time: 12,
        },
        {
          loop_type: 'couple_to_supplier',
          count: 32,
          revenue: 28000,
          cycle_time: 18,
        },
        {
          loop_type: 'peer_to_peer',
          count: 28,
          revenue: 15000,
          cycle_time: 25,
        },
        {
          loop_type: 'venue_driven',
          count: 15,
          revenue: 20000,
          cycle_time: 30,
        },
      ];

      mockSupabaseInstance.select.mockResolvedValue({
        data: mockLoopData,
        error: null,
      });

      const timeframe = {
        start: new Date('2024-05-01'),
        end: new Date('2024-05-31'),
      };

      const result = await calculator.analyzeEnhancedLoops(timeframe);

      expect(result).toHaveLength(4);
      expect(result[0].efficiency).toBeGreaterThan(result[3].efficiency); // supplier_to_couple should be most efficient
      expect(
        result.find((loop) => loop.type === 'supplier_to_couple')
          ?.weddingContext,
      ).toContain('highest conversion');
    });

    it('should calculate loop efficiency correctly', async () => {
      const mockLoopData = [
        {
          loop_type: 'supplier_to_couple',
          count: 10,
          revenue: 15000,
          cycle_time: 7,
        },
      ];

      mockSupabaseInstance.select.mockResolvedValue({
        data: mockLoopData,
        error: null,
      });

      const timeframe = {
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
      };

      const result = await calculator.analyzeEnhancedLoops(timeframe);

      expect(result).toHaveLength(1);
      const loop = result[0];
      expect(loop.efficiency).toBeGreaterThan(0);
      expect(loop.revenuePerLoop).toBe(1500); // 15000 / 10
      expect(loop.avgCycleTime).toBe(7);
    });
  });

  describe('identifyViralBottlenecks', () => {
    it('should identify bottlenecks in viral growth', async () => {
      const cohortUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];

      // Mock low acceptance rate data
      const mockInvitationData = [
        { invited_user: 'user1', accepted: false },
        { invited_user: 'user2', accepted: false },
        { invited_user: 'user3', accepted: true },
        { invited_user: 'user4', accepted: false },
        { invited_user: 'user5', accepted: true },
      ];

      // Mock loop performance data
      const mockLoopData = [
        { loop_type: 'supplier_to_couple', count: 5, revenue: 2000 },
        { loop_type: 'couple_to_supplier', count: 2, revenue: 800 },
      ];

      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: mockInvitationData, error: null })
        .mockResolvedValueOnce({ data: mockLoopData, error: null });

      const bottlenecks =
        await calculator.identifyViralBottlenecks(cohortUsers);

      expect(bottlenecks.length).toBeGreaterThan(0);

      // Should identify low acceptance rate as a bottleneck
      const acceptanceBottleneck = bottlenecks.find(
        (b) => b.stage === 'invitation_acceptance',
      );
      expect(acceptanceBottleneck).toBeDefined();
      expect(acceptanceBottleneck?.impact).toBeGreaterThan(0.3); // 40% acceptance is concerning
    });

    it('should identify seasonal bottlenecks', async () => {
      const cohortUsers = ['user1', 'user2'];

      // Mock winter data with poor performance
      const mockInvitationData = [
        { invited_user: 'user1', accepted: false, invited_at: '2024-01-15' },
        { invited_user: 'user2', accepted: false, invited_at: '2024-01-20' },
      ];

      const mockLoopData = [
        { loop_type: 'supplier_to_couple', count: 1, revenue: 500 },
      ];

      mockSupabaseInstance.select
        .mockResolvedValueOnce({ data: mockInvitationData, error: null })
        .mockResolvedValueOnce({ data: mockLoopData, error: null });

      const bottlenecks =
        await calculator.identifyViralBottlenecks(cohortUsers);

      const seasonalBottleneck = bottlenecks.find(
        (b) => b.stage === 'seasonal_optimization',
      );
      expect(seasonalBottleneck).toBeDefined();
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate recommendations based on bottlenecks', async () => {
      const mockEnhancedCoefficient: EnhancedViralCoefficient = {
        coefficient: 0.8,
        sustainableCoefficient: 0.7,
        acceptanceRate: 0.3,
        conversionTime: 25,
        qualityScore: 0.4,
        seasonalMultiplier: 0.7,
        velocityTrend: 'decelerating',
        weddingIndustryFactors: {
          seasonalImpact: 'off',
          vendorDensity: 'medium',
          marketMaturity: 'growing',
        },
        metadata: {
          totalInvitations: 100,
          totalAcceptances: 30,
          analysisDate: new Date().toISOString(),
          cohortSize: 50,
        },
      };

      const mockBottlenecks: ViralBottleneck[] = [
        {
          stage: 'invitation_acceptance',
          impact: 0.4,
          severity: 'high',
          description: 'Low invitation acceptance rate',
        },
        {
          stage: 'seasonal_optimization',
          impact: 0.3,
          severity: 'medium',
          description: 'Off-season performance issues',
        },
      ];

      const recommendations =
        await calculator.generateOptimizationRecommendations(
          mockEnhancedCoefficient,
          mockBottlenecks,
        );

      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend acceptance rate improvements
      const acceptanceRecommendation = recommendations.find(
        (r) => r.category === 'acceptance_optimization',
      );
      expect(acceptanceRecommendation).toBeDefined();
      expect(acceptanceRecommendation?.priority).toBe('high');
      expect(acceptanceRecommendation?.expectedImpact).toBeGreaterThan(0.2);

      // Should recommend seasonal strategies
      const seasonalRecommendation = recommendations.find(
        (r) => r.category === 'seasonal_campaigns',
      );
      expect(seasonalRecommendation).toBeDefined();
    });

    it('should prioritize recommendations correctly', async () => {
      const mockEnhancedCoefficient: EnhancedViralCoefficient = {
        coefficient: 0.5, // Very low
        sustainableCoefficient: 0.4,
        acceptanceRate: 0.2, // Very low
        conversionTime: 45, // Very slow
        qualityScore: 0.2, // Poor quality
        seasonalMultiplier: 1.0,
        velocityTrend: 'decelerating',
        weddingIndustryFactors: {
          seasonalImpact: 'neutral',
          vendorDensity: 'low',
          marketMaturity: 'emerging',
        },
        metadata: {
          totalInvitations: 50,
          totalAcceptances: 10,
          analysisDate: new Date().toISOString(),
          cohortSize: 25,
        },
      };

      const mockBottlenecks: ViralBottleneck[] = [
        {
          stage: 'invitation_acceptance',
          impact: 0.8,
          severity: 'critical',
          description: 'Extremely low acceptance rate',
        },
      ];

      const recommendations =
        await calculator.generateOptimizationRecommendations(
          mockEnhancedCoefficient,
          mockBottlenecks,
        );

      expect(recommendations.length).toBeGreaterThan(0);

      // First recommendation should be highest priority
      expect(recommendations[0].priority).toBe('critical');
      expect(recommendations[0].expectedImpact).toBeGreaterThan(0.5);
    });
  });

  describe('Wedding Season Logic', () => {
    it('should correctly identify wedding seasons', () => {
      // Peak season months (May, June, July, August, September)
      expect(calculator['getSeasonalMultiplier'](new Date('2024-05-15'))).toBe(
        1.4,
      );
      expect(calculator['getSeasonalMultiplier'](new Date('2024-06-15'))).toBe(
        1.4,
      );
      expect(calculator['getSeasonalMultiplier'](new Date('2024-09-15'))).toBe(
        1.4,
      );

      // Shoulder season months (April, October)
      expect(calculator['getSeasonalMultiplier'](new Date('2024-04-15'))).toBe(
        1.1,
      );
      expect(calculator['getSeasonalMultiplier'](new Date('2024-10-15'))).toBe(
        1.1,
      );

      // Off season months (Nov, Dec, Jan, Feb, Mar)
      expect(calculator['getSeasonalMultiplier'](new Date('2024-01-15'))).toBe(
        0.7,
      );
      expect(calculator['getSeasonalMultiplier'](new Date('2024-02-15'))).toBe(
        0.7,
      );
      expect(calculator['getSeasonalMultiplier'](new Date('2024-11-15'))).toBe(
        0.7,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseInstance.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const timeframe = {
        start: new Date('2024-05-01'),
        end: new Date('2024-05-31'),
      };

      await expect(calculator.calculateEnhanced(timeframe)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should validate timeframe parameters', async () => {
      const invalidTimeframe = {
        start: new Date('2024-06-01'),
        end: new Date('2024-05-01'), // End before start
      };

      await expect(
        calculator.calculateEnhanced(invalidTimeframe),
      ).rejects.toThrow();
    });
  });
});
