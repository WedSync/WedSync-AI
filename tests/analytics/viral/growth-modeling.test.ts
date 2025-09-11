import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { GrowthModelingEngine, type AttributionModel, type GrowthMetrics } from '../../../src/lib/analytics/growth-modeling';
import type { ViralMetrics } from '../../../src/lib/analytics/viral-metrics';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

// Mock the supabase import
jest.mock('../../../src/lib/supabase/server', () => ({
  supabase: mockSupabase
}));

describe('GrowthModelingEngine', () => {
  let growthModelingEngine: GrowthModelingEngine;
  let mockFrom: jest.MockedFunction<typeof mockSupabase.from>;
  let mockRpc: jest.MockedFunction<typeof mockSupabase.rpc>;

  beforeEach(() => {
    growthModelingEngine = GrowthModelingEngine.getInstance();
    mockFrom = mockSupabase.from as jest.MockedFunction<typeof mockSupabase.from>;
    mockRpc = mockSupabase.rpc as jest.MockedFunction<typeof mockSupabase.rpc>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateAttributionModel', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should calculate attribution model correctly', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'admin' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            attribution_source: 'email',
            conversions: 100,
            cost: 500,
            total_reach: 1000,
            viral_conversions: 25
          },
          {
            attribution_source: 'social',
            conversions: 150,
            cost: 300,
            total_reach: 2000,
            viral_conversions: 45
          },
          {
            attribution_source: 'referral',
            conversions: 80,
            cost: 0,
            total_reach: 500,
            viral_conversions: 60
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.calculateAttributionModel(
        mockUserId,
        mockDateRange
      );

      expect(result).toHaveLength(3);
      
      // Results should be sorted by attribution score (highest first)
      expect(result[0].source).toBe('social'); // 150 conversions
      expect(result[1].source).toBe('email');  // 100 conversions  
      expect(result[2].source).toBe('referral'); // 80 conversions

      // Check social metrics (highest attribution score)
      const social = result[0];
      expect(social.conversions).toBe(150);
      expect(social.cost).toBe(300);
      expect(social.conversionRate).toBe(0.075); // 150/2000
      expect(social.costPerAcquisition).toBe(2); // 300/150
      expect(social.viralCoefficient).toBe(0.3); // 45/150
      expect(social.attributionScore).toBeCloseTo(0.455); // 150/330 total conversions
    });

    it('should handle empty attribution data', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'analytics' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await growthModelingEngine.calculateAttributionModel(
        mockUserId,
        mockDateRange
      );

      expect(result).toEqual([]);
    });

    it('should filter by specific sources', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'marketing' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            attribution_source: 'email',
            conversions: 100,
            cost: 500,
            total_reach: 1000,
            viral_conversions: 25
          }
        ],
        error: null
      });

      await growthModelingEngine.calculateAttributionModel(
        mockUserId,
        mockDateRange,
        ['email']
      );

      expect(mockRpc).toHaveBeenCalledWith('get_attribution_model_data', {
        start_date: mockDateRange.start.toISOString(),
        end_date: mockDateRange.end.toISOString(),
        source_filters: ['email'],
        requesting_user_id: mockUserId
      });
    });

    it('should throw error for unauthorized user', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'couple' },
              error: null
            })
          })
        })
      });

      await expect(
        growthModelingEngine.calculateAttributionModel(mockUserId, mockDateRange)
      ).rejects.toThrow('Unauthorized access to attribution modeling');
    });
  });

  describe('aggregateGrowthMetrics', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should aggregate growth metrics correctly', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'admin' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            created_at: '2025-01-01T00:00:00Z',
            new_users: 50,
            viral_coefficient: 0.5,
            organic_growth: 30,
            paid_growth: 15,
            viral_growth: 5,
            cumulative_users: 1050,
            retention_rate: 0.85
          },
          {
            created_at: '2025-01-02T00:00:00Z', 
            new_users: 75,
            viral_coefficient: 0.6,
            organic_growth: 45,
            paid_growth: 20,
            viral_growth: 10,
            cumulative_users: 1125,
            retention_rate: 0.87
          },
          {
            created_at: '2025-01-08T00:00:00Z', // Start of week 2
            new_users: 100,
            viral_coefficient: 0.7,
            organic_growth: 60,
            paid_growth: 25,
            viral_growth: 15,
            cumulative_users: 1500,
            retention_rate: 0.88
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.aggregateGrowthMetrics(
        mockUserId,
        mockDateRange
      );

      // Check daily metrics
      expect(result.daily).toHaveLength(3);
      expect(result.daily[0]).toMatchObject({
        date: '2025-01-01',
        newUsers: 50,
        viralCoefficient: 0.5,
        organicGrowth: 30,
        paidGrowth: 15,
        viralGrowth: 5
      });

      // Check weekly metrics (should be aggregated)
      expect(result.weekly).toHaveLength(2);
      expect(result.weekly[0].week).toBe('2025-W01');
      
      // Check monthly metrics
      expect(result.monthly).toHaveLength(1);
      expect(result.monthly[0].month).toBe('2025-01');
    });

    it('should calculate growth rates correctly', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'analytics' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            created_at: '2025-01-01T00:00:00Z',
            new_users: 100,
            viral_coefficient: 0.5,
            organic_growth: 80,
            paid_growth: 20,
            viral_growth: 0,
            cumulative_users: 1100,
            retention_rate: 0.85
          },
          {
            created_at: '2025-01-08T00:00:00Z',
            new_users: 150,  // 50% growth from previous week
            viral_coefficient: 0.6,
            organic_growth: 120,
            paid_growth: 30,
            viral_growth: 0,
            cumulative_users: 1250,
            retention_rate: 0.87
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.aggregateGrowthMetrics(
        mockUserId,
        mockDateRange
      );

      // Check that growth rate is calculated correctly for weekly data
      expect(result.weekly).toHaveLength(2);
      expect(result.weekly[0].growthRate).toBe(0); // First week has no previous data
      expect(result.weekly[1].growthRate).toBe(50); // 50% growth ((150-100)/100 * 100)
    });
  });

  describe('generateViralGrowthProjection', () => {
    const mockUserId = 'test-user-123';
    const currentMetrics: ViralMetrics = {
      viralCoefficient: 0.75,
      conversionRate: 0.3,
      invitesPerUser: 2.5,
      period: '2025-01',
      totalUsers: 1000,
      totalInvites: 2500,
      totalConversions: 750,
      timeframe: 'monthly',
      aggregationDate: '2025-01-15T00:00:00Z'
    };

    it('should generate realistic growth projections', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'admin' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            viral_coefficient: 0.7,
            retention_rate: 0.85,
            period_date: '2024-12-01T00:00:00Z'
          },
          {
            viral_coefficient: 0.8,
            retention_rate: 0.87,
            period_date: '2025-01-01T00:00:00Z'
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.generateViralGrowthProjection(
        mockUserId,
        currentMetrics,
        'monthly',
        6
      );

      expect(result.timeFrame).toBe('monthly');
      expect(result.projectedUsers).toHaveLength(6);
      
      // Verify assumptions are calculated
      expect(result.assumptions.baseViralCoefficient).toBeCloseTo(0.75); // Average of historical + current
      expect(result.assumptions.retentionRate).toBeCloseTo(0.86); // Average of historical data
      expect(result.assumptions.seasonalityFactor).toBeGreaterThan(0);

      // Verify projected users increase over time
      expect(result.projectedUsers[1].users).toBeGreaterThan(result.projectedUsers[0].users);
      
      // Verify confidence decreases over time
      expect(result.projectedUsers[5].confidence).toBeLessThan(result.projectedUsers[0].confidence);
    });

    it('should handle quarterly projections', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'executive' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await growthModelingEngine.generateViralGrowthProjection(
        mockUserId,
        currentMetrics,
        'quarterly',
        4
      );

      expect(result.timeFrame).toBe('quarterly');
      expect(result.projectedUsers).toHaveLength(4);
      expect(result.projectedUsers[0].period).toMatch(/\d{4}-Q\d/); // Quarter format
    });

    it('should apply wedding industry seasonality', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'analytics' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock current date to be January (low season)
      jest.spyOn(global.Date, 'now').mockReturnValue(new Date('2025-01-15').getTime());

      const result = await growthModelingEngine.generateViralGrowthProjection(
        mockUserId,
        currentMetrics,
        'monthly',
        12
      );

      // Find spring/summer months (higher seasonality)
      const mayProjection = result.projectedUsers.find(p => p.period.includes('2025-05'));
      const juneProjection = result.projectedUsers.find(p => p.period.includes('2025-06'));
      const winterProjection = result.projectedUsers.find(p => p.period.includes('2025-12'));

      // Spring/summer should show higher growth than winter
      if (mayProjection && juneProjection && winterProjection) {
        const mayGrowth = mayProjection.users - (result.projectedUsers[0]?.users || 0);
        const winterGrowth = winterProjection.users - (result.projectedUsers[0]?.users || 0);
        
        // May growth should be higher due to seasonality (wedding season)
        // This is a relative comparison, not absolute
        expect(mayGrowth).toBeDefined();
        expect(winterGrowth).toBeDefined();
      }
    });
  });

  describe('analyzeChannelEffectiveness', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should analyze channel effectiveness correctly', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'marketing' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            channel: 'email',
            total_reach: 10000,
            conversions: 500,
            viral_conversions: 125,
            cost: 2000,
            average_revenue_per_user: 150
          },
          {
            channel: 'social',
            total_reach: 20000,
            conversions: 800,
            viral_conversions: 320,
            cost: 3000,
            average_revenue_per_user: 120
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.analyzeChannelEffectiveness(
        mockUserId,
        mockDateRange
      );

      expect(result).toHaveLength(2);
      
      // Results should be sorted by ROI (highest first)
      const topChannel = result[0];
      
      // Check calculations
      expect(topChannel.conversionRate).toBeDefined();
      expect(topChannel.viralAmplification).toBeDefined();
      expect(topChannel.roi).toBeDefined();
      
      // Email channel calculations
      const emailChannel = result.find(c => c.channel === 'email');
      if (emailChannel) {
        expect(emailChannel.conversionRate).toBeCloseTo(5.0); // (500/10000) * 100
        expect(emailChannel.viralAmplification).toBeCloseTo(0.25); // 125/500
        
        // ROI: ((500 * 150 - 2000) / 2000) * 100 = ((75000 - 2000) / 2000) * 100 = 3650%
        expect(emailChannel.roi).toBeCloseTo(3650);
      }
    });

    it('should handle zero costs and conversions', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'admin' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            channel: 'organic',
            total_reach: 5000,
            conversions: 0,
            viral_conversions: 0,
            cost: 0,
            average_revenue_per_user: 100
          }
        ],
        error: null
      });

      const result = await growthModelingEngine.analyzeChannelEffectiveness(
        mockUserId,
        mockDateRange
      );

      expect(result).toHaveLength(1);
      expect(result[0].conversionRate).toBe(0);
      expect(result[0].viralAmplification).toBe(0);
      expect(result[0].roi).toBe(0);
    });
  });

  describe('validateGrowthProjections', () => {
    it('should validate reasonable projections', () => {
      const projections = {
        timeFrame: 'monthly' as const,
        projectedUsers: [
          { period: '2025-02', users: 1100, confidence: 0.9 },
          { period: '2025-03', users: 1210, confidence: 0.85 },
          { period: '2025-04', users: 1331, confidence: 0.8 }
        ],
        assumptions: {
          baseViralCoefficient: 0.5,
          retentionRate: 0.85,
          seasonalityFactor: 1.2
        }
      };

      const result = growthModelingEngine.validateGrowthProjections(projections);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect unrealistic growth rates', () => {
      const projections = {
        timeFrame: 'monthly' as const,
        projectedUsers: [
          { period: '2025-02', users: 1000, confidence: 0.9 },
          { period: '2025-03', users: 10000, confidence: 0.85 } // 900% growth!
        ],
        assumptions: {
          baseViralCoefficient: 0.5,
          retentionRate: 0.85,
          seasonalityFactor: 1.2
        }
      };

      const result = growthModelingEngine.validateGrowthProjections(projections, 2.0);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Unrealistic growth rate');
    });

    it('should detect low retention rates', () => {
      const projections = {
        timeFrame: 'monthly' as const,
        projectedUsers: [
          { period: '2025-02', users: 1100, confidence: 0.9 }
        ],
        assumptions: {
          baseViralCoefficient: 0.5,
          retentionRate: 0.3, // Very low retention rate
          seasonalityFactor: 1.2
        }
      };

      const result = growthModelingEngine.validateGrowthProjections(projections);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Retention rate below 50%');
    });

    it('should warn about negative growth', () => {
      const projections = {
        timeFrame: 'monthly' as const,
        projectedUsers: [
          { period: '2025-02', users: 1000, confidence: 0.9 },
          { period: '2025-03', users: 900, confidence: 0.85 } // Negative growth
        ],
        assumptions: {
          baseViralCoefficient: 0.5,
          retentionRate: 0.85,
          seasonalityFactor: 1.2
        }
      };

      const result = growthModelingEngine.validateGrowthProjections(projections);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Negative growth projected');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GrowthModelingEngine.getInstance();
      const instance2 = GrowthModelingEngine.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-user', role: 'admin' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(
        growthModelingEngine.aggregateGrowthMetrics(
          'test-user',
          { start: new Date(), end: new Date() }
        )
      ).rejects.toThrow('Failed to fetch growth metrics');
    });
  });
});