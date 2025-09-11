import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
} from '@/lib/analytics/advanced-viral-calculator';
import { createClient } from '@/lib/database/supabase-admin';

// Mock the Supabase client
jest.mock('@/lib/database/supabase-admin');
const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;

// Helper functions to create mock responses - REFACTORED TO REDUCE NESTING
type MockData = any[];
type MockError = { message: string } | null;
type MockResponse = { data: MockData; error: MockError; count?: number };

/**
 * Creates a mock response with data and error
 */
const createMockResponse = (data: MockData, error: MockError = null): MockResponse => ({
  data,
  error,
});

/**
 * Helper function to create date range filter chain - EXTRACTED TO REDUCE NESTING
 */
const createDateRangeChain = (selectResponse: MockResponse) => ({
  gte: jest.fn(() => ({
    lte: jest.fn(() => selectResponse),
  })),
});

/**
 * Creates a mock select chain for user profiles table
 */
const createUserProfilesSelectMock = (userData: MockData) => {
  const selectResponse = createMockResponse(userData);
  return {
    select: jest.fn(() => createDateRangeChain(selectResponse)),
  };
};

/**
 * Creates a mock select chain for invitation tracking table
 */
const createInvitationTrackingSelectMock = (invitationData: MockData) => {
  const selectResponse = createMockResponse(invitationData);
  return {
    select: jest.fn(() => ({
      in: jest.fn(() => selectResponse),
      count: 'exact',
      head: true,
    })),
  };
};

/**
 * Creates a mock select chain with date range filtering
 */
const createDateRangeSelectMock = (data: MockData, error: MockError = null) => {
  const response = createMockResponse(data, error);
  return {
    select: jest.fn(() => createDateRangeChain(response)),
  };
};

/**
 * Creates a generic mock select chain
 */
const createGenericSelectMock = (data: MockData = [], error: MockError = null, count: number = 0) => {
  const response = { ...createMockResponse(data, error), count };
  return {
    select: jest.fn(() => response),
  };
};

/**
 * Creates a complex mock chain for empty data handling - REDUCED NESTING
 */
const createEmptyDataMockChain = () => {
  const emptyResponse = createMockResponse([]);
  const gteChain = {
    lte: jest.fn(() => emptyResponse),
  };
  const selectChain = {
    gte: jest.fn(() => gteChain),
    in: jest.fn(() => emptyResponse),
    not: jest.fn(() => emptyResponse),
  };
  
  return {
    select: jest.fn(() => selectChain),
  };
};

/**
 * Helper to create LTE mock for sustainable coefficient testing - EXTRACTED TO REDUCE NESTING
 */
const createSustainableLTEMock = (userData: MockData) => {
  const userResponse = createMockResponse(userData);
  return jest.fn(() => userResponse);
};

/**
 * Helper to create GTE chain for sustainable coefficient testing - EXTRACTED TO REDUCE NESTING
 */
const createSustainableGTEChain = (userData: MockData) => ({
  lte: createSustainableLTEMock(userData),
});

/**
 * Helper to create select operations for sustainable coefficient testing - EXTRACTED TO REDUCE NESTING
 */
const createSustainableSelectOps = (userData: MockData, invitationData: MockData) => {
  const invitationResponse = createMockResponse(invitationData);
  const gteChain = createSustainableGTEChain(userData);
  
  return {
    gte: jest.fn(() => gteChain),
    in: jest.fn(() => invitationResponse),
  };
};

/**
 * Creates a mock chain for sustainable coefficient testing - OPTIMIZED TO PREVENT S2004
 */
const createSustainableCoefficientMockChain = (userData: MockData, invitationData: MockData) => {
  const selectOps = createSustainableSelectOps(userData, invitationData);
  
  return {
    select: jest.fn(() => selectOps),
  };
};

/**
 * Validates bottleneck sorting order - EXTRACTED HELPER TO REDUCE NESTING
 */
const validateBottleneckSortOrder = (bottlenecks: Array<{ impact: number }>) => {
  if (bottlenecks.length <= 1) {
    return;
  }
  
  for (let i = 0; i < bottlenecks.length - 1; i++) {
    expect(bottlenecks[i].impact).toBeGreaterThanOrEqual(
      bottlenecks[i + 1].impact,
    );
  }
};

/**
 * Validates recommendation structure - EXTRACTED HELPER TO REDUCE NESTING
 */
const validateRecommendationStructure = (recommendations: any[]) => {
  recommendations.forEach((rec) => {
    expect(['high', 'medium', 'low']).toContain(rec.priority);
    expect(typeof rec.category).toBe('string');
    expect(typeof rec.action).toBe('string');
    expect(typeof rec.expectedImpact).toBe('number');
    expect(['low', 'medium', 'high']).toContain(rec.implementationEffort);
    expect(typeof rec.roi).toBe('number');
  });
};

/**
 * Validates recommendation ROI sorting - EXTRACTED HELPER TO REDUCE NESTING
 */
const validateRecommendationROISorting = (recommendations: Array<{ roi: number }>) => {
  if (recommendations.length <= 1) {
    return;
  }
  
  for (let i = 0; i < recommendations.length - 1; i++) {
    expect(recommendations[i].roi).toBeGreaterThanOrEqual(
      recommendations[i + 1].roi,
    );
  }
};

/**
 * Helper to get mock for user_profiles table - EXTRACTED TO REDUCE NESTING
 */
const getMockForUserProfiles = (tableConfigs: Record<string, MockData>) => 
  createUserProfilesSelectMock(tableConfigs.user_profiles);

/**
 * Helper to get mock for invitation_tracking table - EXTRACTED TO REDUCE NESTING
 */
const getMockForInvitationTracking = (tableConfigs: Record<string, MockData>) => 
  createInvitationTrackingSelectMock(tableConfigs.invitation_tracking);

/**
 * Helper to get generic mock for unknown tables - EXTRACTED TO REDUCE NESTING
 */
const getMockForGenericTable = (tableConfigs: Record<string, MockData>, table: string) =>
  createGenericSelectMock(tableConfigs[table] || []);

/**
 * Creates a mock implementation factory for the from() method - OPTIMIZED TO PREVENT S2004
 */
const createFromMockFactory = (tableConfigs: Record<string, MockData>) => (table: string) => {
  if (table === 'user_profiles' && tableConfigs.user_profiles) {
    return getMockForUserProfiles(tableConfigs);
  }
  
  if (table === 'invitation_tracking' && tableConfigs.invitation_tracking) {
    return getMockForInvitationTracking(tableConfigs);
  }
  
  return getMockForGenericTable(tableConfigs, table);
};

describe('AdvancedViralCalculator', () => {
  let calculator: AdvancedViralCalculator;
  let mockSupabaseInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Supabase instance using helper functions
    mockSupabaseInstance = {
      from: jest.fn(createFromMockFactory({})), // Default empty config
      rpc: jest.fn(),
    };

    mockSupabase.mockReturnValue(mockSupabaseInstance);
    calculator = new AdvancedViralCalculator();
  });

  describe('calculateEnhanced', () => {
    it('should calculate enhanced viral coefficient correctly', async () => {
      // Mock user data
      const mockUsers = [{ id: 'user1' }, { id: 'user2' }, { id: 'user3' }];

      // Mock invitation data
      const mockInvitations = [
        { inviter_id: 'user1', invitee_id: 'user4', status: 'activated' },
        { inviter_id: 'user2', invitee_id: 'user5', status: 'activated' },
        { inviter_id: 'user1', invitee_id: 'user6', status: 'sent' },
      ];

      // Setup mock chain using helper functions
      const tableConfigs = {
        user_profiles: mockUsers,
        invitation_tracking: mockInvitations,
      };
      mockSupabaseInstance.from.mockImplementation(createFromMockFactory(tableConfigs));

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await calculator.calculateEnhanced(period);

      expect(result).toBeDefined();
      expect(result.coefficient).toBeGreaterThanOrEqual(0);
      expect(result.adjustedCoefficient).toBeGreaterThanOrEqual(0);
      expect(result.sustainableCoefficient).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.loops)).toBe(true);
      expect(Array.isArray(result.vendorTypeBreakdown)).toBe(true);
      expect(Array.isArray(result.geographicSpread)).toBe(true);
    });

    it('should apply seasonal adjustments correctly', async () => {
      // Mock minimal data using helper function
      const minimalUserData = [{ id: 'user1' }];
      mockSupabaseInstance.from.mockImplementation(() => createDateRangeSelectMock(minimalUserData));

      // Test peak season (June)
      const peakPeriod = {
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
      };

      const peakResult = await calculator.calculateEnhanced(peakPeriod);
      expect(peakResult.weddingSeasonMultiplier).toBe(1.4);

      // Test off-season (January)
      const offPeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const offResult = await calculator.calculateEnhanced(offPeriod);
      expect(offResult.weddingSeasonMultiplier).toBe(0.7);
    });

    it('should handle empty data gracefully', async () => {
      // Mock empty data responses using extracted helper function - REDUCED NESTING
      mockSupabaseInstance.from.mockImplementation(() => createEmptyDataMockChain());

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await calculator.calculateEnhanced(period);

      expect(result.coefficient).toBe(0);
      expect(result.invitationRate).toBe(0);
      expect(result.acceptanceRate).toBe(0);
      expect(result.activationRate).toBe(0);
      expect(result.loops).toHaveLength(0);
    });

    it('should handle database errors properly', async () => {
      // Mock database error using helper function
      const errorResponse = { message: 'Database connection failed' };
      mockSupabaseInstance.from.mockImplementation(() => createDateRangeSelectMock(null, errorResponse));

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      await expect(calculator.calculateEnhanced(period)).rejects.toThrow(
        'Failed to get cohort users',
      );
    });
  });

  describe('identifyViralBottlenecks', () => {
    beforeEach(() => {
      // Mock basic user data for bottleneck analysis using helper functions
      const bottleneckUsers = [{ id: 'user1' }, { id: 'user2' }];
      const bottleneckInvitations = [
        { inviter_id: 'user1', status: 'sent' },
        { inviter_id: 'user1', status: 'activated' },
        { inviter_id: 'user2', status: 'clicked' },
      ];
      
      const tableConfigs = {
        user_profiles: bottleneckUsers,
        invitation_tracking: bottleneckInvitations,
      };
      
      mockSupabaseInstance.from.mockImplementation((table: string) => {
        if (tableConfigs[table]) {
          return createFromMockFactory(tableConfigs)(table);
        }
        return createGenericSelectMock([], null, 0);
      });
    });

    it('should identify invitation bottlenecks', async () => {
      const userIds = ['user1', 'user2'];
      const bottlenecks = await calculator.identifyViralBottlenecks(userIds);

      expect(Array.isArray(bottlenecks)).toBe(true);
      expect(
        bottlenecks.every((b) =>
          ['invitation', 'acceptance', 'activation', 'amplification'].includes(
            b.stage,
          ),
        ),
      ).toBe(true);
      expect(bottlenecks.every((b) => b.impact >= 0 && b.impact <= 1)).toBe(
        true,
      );
      expect(bottlenecks.every((b) => typeof b.description === 'string')).toBe(
        true,
      );
      expect(
        bottlenecks.every((b) => typeof b.recommendation === 'string'),
      ).toBe(true);
    });

    it('should sort bottlenecks by impact', async () => {
      const userIds = ['user1', 'user2'];
      const bottlenecks = await calculator.identifyViralBottlenecks(userIds);

      // Use extracted helper function to reduce nesting
      validateBottleneckSortOrder(bottlenecks);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate relevant recommendations', async () => {
      const mockMetrics: EnhancedViralCoefficient = {
        coefficient: 0.8,
        adjustedCoefficient: 1.1,
        sustainableCoefficient: 0.7,
        invitationRate: 0.6,
        acceptanceRate: 0.5,
        activationRate: 0.4,
        avgInvitesPerUser: 2.1,
        qualityScore: 0.5, // Low quality score should trigger recommendation
        timeToInvite: 5,
        viralCycleTime: 14,
        velocityTrend: 'stable',
        loops: [
          {
            type: 'supplier_to_couple',
            count: 10,
            conversionRate: 0.3, // Low conversion should trigger recommendation
            avgCycleTime: 7,
            revenue: 500,
            quality: 0.6,
            amplification: 1.2,
          },
        ],
        dominantLoop: 'supplier_to_couple',
        loopEfficiency: 0.4,
        weddingSeasonMultiplier: 0.8, // Off-season should trigger recommendation
        vendorTypeBreakdown: [],
        geographicSpread: [],
      };

      const bottlenecks = [
        {
          stage: 'activation' as const,
          impact: 0.3,
          description: 'Low activation rate',
          recommendation: 'Improve onboarding',
          estimatedImprovementPotential: 0.2,
        },
      ];

      const recommendations =
        await calculator.generateOptimizationRecommendations(
          mockMetrics,
          bottlenecks,
        );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include seasonal recommendation
      expect(recommendations.some((r) => r.category === 'seasonal')).toBe(true);

      // Should include loop optimization
      expect(
        recommendations.some((r) => r.category === 'loop_optimization'),
      ).toBe(true);

      // Should include quality improvement
      expect(recommendations.some((r) => r.category === 'quality')).toBe(true);

      // Use extracted helper functions to reduce nesting
      validateRecommendationROISorting(recommendations);
      validateRecommendationStructure(recommendations);
    });
  });

  describe('Seasonal Adjustments', () => {
    it('should calculate correct seasonal multipliers', async () => {
      // Create calculator instance to access private method via test
      const testCalculator = new AdvancedViralCalculator();

      // Test all months through the year
      const seasonalTests = [
        { month: 1, expected: 0.7 }, // January - off season
        { month: 4, expected: 1.1 }, // April - shoulder
        { month: 6, expected: 1.4 }, // June - peak
        { month: 8, expected: 1.4 }, // August - peak
        { month: 10, expected: 1.1 }, // October - shoulder
        { month: 12, expected: 0.7 }, // December - off season
      ];

      for (const test of seasonalTests) {
        const testDate = new Date(2024, test.month - 1, 15); // 15th of the month
        const period = { start: testDate, end: testDate };

        // Mock minimal data to test seasonal calculation using helper function
        const seasonalTestUser = [{ id: 'test-user' }];
        mockSupabaseInstance.from.mockImplementation(() => createDateRangeSelectMock(seasonalTestUser));

        const result = await testCalculator.calculateEnhanced(period);
        expect(result.weddingSeasonMultiplier).toBe(test.expected);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large user cohorts efficiently', async () => {
      // Mock a large user cohort
      const largeUserSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `user${i}`,
      }));

      // Use helper function for large dataset mock
      const tableConfigs = {
        user_profiles: largeUserSet,
      };
      mockSupabaseInstance.from.mockImplementation(createFromMockFactory(tableConfigs));

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const startTime = Date.now();
      const result = await calculator.calculateEnhanced(period);
      const endTime = Date.now();

      expect(result).toBeDefined();
      // Should complete within reasonable time (10 seconds as per spec)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should handle invalid date ranges gracefully', async () => {
      const invalidPeriod = {
        start: new Date('2024-12-31'),
        end: new Date('2024-01-01'), // End before start
      };

      // Should not throw error but handle gracefully using helper function
      mockSupabaseInstance.from.mockImplementation(() => createDateRangeSelectMock([]));

      const result = await calculator.calculateEnhanced(invalidPeriod);
      expect(result.coefficient).toBe(0);
    });

    it('should calculate sustainable coefficient correctly by filtering outliers', async () => {
      // Mock RPC call for outlier detection
      mockSupabaseInstance.rpc.mockImplementation(
        (funcName: string, params: any) => {
          if (funcName === 'get_user_invitation_stats') {
            return {
              data: [
                { user_id: 'user1', invites_sent: 5 },
                { user_id: 'user2', invites_sent: 8 },
                { user_id: 'user3', invites_sent: 100 }, // Outlier
                { user_id: 'user4', invites_sent: 6 },
                { user_id: 'user5', invites_sent: 7 },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        },
      );

      // Setup basic mocks using extracted helper function - REDUCED NESTING
      const basicUserData = [{ id: 'user1' }];
      const basicInvitationData = [{ inviter_id: 'user1', invitee_id: 'user2' }];
      
      mockSupabaseInstance.from.mockImplementation(() => 
        createSustainableCoefficientMockChain(basicUserData, basicInvitationData)
      );

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await calculator.calculateEnhanced(period);

      // Sustainable coefficient should be less than base coefficient due to outlier filtering
      expect(result.sustainableCoefficient).toBeLessThanOrEqual(
        result.coefficient,
      );
      expect(result.sustainableCoefficient).toBeGreaterThanOrEqual(0);
    });
  });
});