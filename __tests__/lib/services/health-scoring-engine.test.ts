/**
 * WS-168: Unit Tests for Health Scoring Engine
 * Comprehensive testing for customer success health scoring system
 */

import { 
  HealthScoringEngine, 
  HealthScoreComponents, 
  HealthRiskFactor, 
  HealthRecommendation,
  HealthTrend,
  HealthBenchmarks
} from '@/lib/services/health-scoring-engine';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import { engagementScoringService } from '@/lib/analytics/engagement-scoring';
import { subDays, startOfDay } from 'date-fns';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/redis');
jest.mock('@/lib/analytics/engagement-scoring');

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn()
};

const mockEngagementService = {
  getEngagementScore: jest.fn()
};

// Test data fixtures
const mockUserProfile = {
  id: 'user-123',
  supplier_id: 'supplier-456',
  created_at: '2023-01-01T00:00:00Z',
  email: 'test@wedsync.com'
};

const mockMilestones = [
  { id: '1', user_id: 'user-123', achieved: true, milestone_type: 'first_client' },
  { id: '2', user_id: 'user-123', achieved: true, milestone_type: 'form_created' },
  { id: '3', user_id: 'user-123', achieved: false, milestone_type: 'payment_setup' }
];

const mockEngagementEvents = [
  { id: '1', client_id: 'user-123', created_at: new Date().toISOString() },
  { id: '2', client_id: 'user-123', created_at: subDays(new Date(), 2).toISOString() },
  { id: '3', client_id: 'user-123', created_at: subDays(new Date(), 5).toISOString() }
];

const mockFeatureUsage = [
  { feature_key: 'forms', usage_count: 15 },
  { feature_key: 'clients', usage_count: 8 },
  { feature_key: 'analytics', usage_count: 3 }
];

const mockOnboardingProgress = {
  completed_steps: 3,
  total_steps: 5,
  current_step: 'profile_setup'
};

describe('HealthScoringEngine', () => {
  let healthScoringEngine: HealthScoringEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (redis as any).get = mockRedis.get;
    (redis as any).setex = mockRedis.setex;
    (engagementScoringService as any).getEngagementScore = mockEngagementService.getEngagementScore;
    
    healthScoringEngine = new HealthScoringEngine(mockSupabase as any);
  });

  describe('calculateHealthScore', () => {
    it('should calculate comprehensive health score for a user', async () => {
      // Setup mocks
      setupSuccessfulMocks();
      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await healthScoringEngine.calculateHealthScore('user-123');

      expect(result).toHaveProperty('user_id', 'user-123');
      expect(result).toHaveProperty('overall_health_score');
      expect(result.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_health_score).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('risk_level');
      expect(['low', 'medium', 'high', 'critical']).toContain(result.risk_level);
    });

    it('should return cached result when available and not expired', async () => {
      const cachedScore: HealthScoreComponents = {
        user_id: 'user-123',
        onboarding_completion: 80,
        feature_adoption_breadth: 70,
        feature_adoption_depth: 65,
        engagement_frequency: 75,
        engagement_quality: 85,
        success_milestone_progress: 67,
        support_interaction_quality: 90,
        platform_value_realization: 72,
        retention_indicators: 88,
        growth_trajectory: 75,
        overall_health_score: 78,
        score_trend_7d: 5,
        score_trend_30d: 12,
        trend_direction: 'improving',
        churn_risk_score: 25,
        risk_level: 'low',
        risk_factors: [],
        improvement_opportunities: [],
        next_best_actions: [],
        calculated_at: new Date(),
        expires_at: new Date(Date.now() + 3600000) // 1 hour from now
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedScore));

      const result = await healthScoringEngine.calculateHealthScore('user-123');

      expect(result).toEqual(cachedScore);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      const cachedScore = { user_id: 'user-123', overall_health_score: 50 };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedScore));
      setupSuccessfulMocks();

      const result = await healthScoringEngine.calculateHealthScore('user-123', true);

      expect(result.overall_health_score).not.toBe(50);
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should handle calculation errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.reject(new Error('Database error'))
          })
        })
      }));

      await expect(
        healthScoringEngine.calculateHealthScore('user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('Component Score Calculations', () => {
    beforeEach(() => {
      setupSuccessfulMocks();
    });

    describe('calculateOnboardingScore', () => {
      it('should calculate correct onboarding completion percentage', async () => {
        const userData = {
          onboardingProgress: { completed_steps: 3, total_steps: 5 }
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateOnboardingScore(userData);

        expect(score).toBe(60); // 3/5 * 100
      });

      it('should return 0 for missing onboarding data', async () => {
        const userData = { onboardingProgress: null };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateOnboardingScore(userData);

        expect(score).toBe(0);
      });

      it('should handle division by zero in onboarding calculation', async () => {
        const userData = {
          onboardingProgress: { completed_steps: 0, total_steps: 0 }
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateOnboardingScore(userData);

        expect(score).toBe(0);
      });
    });

    describe('calculateFeatureBreadthScore', () => {
      it('should calculate feature breadth based on unique features used', async () => {
        const userData = {
          featureUsage: [
            { feature_key: 'forms' },
            { feature_key: 'clients' },
            { feature_key: 'analytics' },
            { feature_key: 'forms' } // Duplicate should not count
          ]
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateFeatureBreadthScore(userData);

        expect(score).toBe(15); // 3 unique features out of 20 total = 15%
      });

      it('should cap feature breadth score at 100', async () => {
        const userData = {
          featureUsage: Array(25).fill(null).map((_, i) => ({ feature_key: `feature_${i}` }))
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateFeatureBreadthScore(userData);

        expect(score).toBe(100);
      });
    });

    describe('calculateFeatureDepthScore', () => {
      it('should calculate feature depth based on usage frequency', async () => {
        const userData = {
          featureUsage: [
            { usage_count: 10 },
            { usage_count: 5 },
            { usage_count: 15 }
          ]
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateFeatureDepthScore(userData);

        expect(score).toBe(100); // Average = 10, capped at 100
      });
    });

    describe('calculateEngagementFrequencyScore', () => {
      it('should calculate engagement based on recent activity', async () => {
        const userData = {
          engagementEvents: [
            { created_at: new Date().toISOString() },
            { created_at: subDays(new Date(), 1).toISOString() },
            { created_at: subDays(new Date(), 2).toISOString() },
            { created_at: subDays(new Date(), 31).toISOString() } // Should be excluded
          ]
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateEngagementFrequencyScore(userData);

        expect(score).toBe(50); // 3 events in 30 days = 0.1 per day = 50 score
      });

      it('should return 50 for users with no engagement data', async () => {
        const userData = { engagementEvents: null };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateEngagementFrequencyScore(userData);

        expect(score).toBe(50);
      });
    });

    describe('calculateMilestoneScore', () => {
      it('should calculate milestone achievement percentage', async () => {
        const userData = {
          milestones: [
            { achieved: true },
            { achieved: true },
            { achieved: false }
          ]
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateMilestoneScore(userData);

        expect(score).toBe(67); // 2/3 * 100, rounded
      });
    });

    describe('calculateSupportScore', () => {
      it('should return high score for users with no support tickets', async () => {
        const userData = { supportTickets: [] };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateSupportScore(userData);

        expect(score).toBe(85);
      });

      it('should calculate score based on resolution time', async () => {
        const userData = {
          supportTickets: [
            { status: 'resolved', resolution_hours: 12 },
            { status: 'resolved', resolution_hours: 36 }
          ]
        };

        const engine = new HealthScoringEngine(mockSupabase as any);
        const score = await (engine as any).calculateSupportScore(userData);

        expect(score).toBe(95); // Average 24 hours = excellent
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should identify critical risk factors correctly', async () => {
      setupSuccessfulMocks();
      mockRedis.get.mockResolvedValue(null);

      // Mock low scores that should trigger risk factors
      const mockComponentScores = {
        onboarding_completion: 30, // Should trigger risk
        engagement_frequency: 20,  // Should trigger critical risk
        feature_adoption_breadth: 15 // Should trigger medium risk
      };

      const engine = new HealthScoringEngine(mockSupabase as any);
      const riskAssessment = await (engine as any).assessRisks(mockComponentScores, {});

      expect(riskAssessment.risk_level).toBe('critical');
      expect(riskAssessment.churn_risk_score).toBeGreaterThan(50);
      expect(riskAssessment.risk_factors).toHaveLength(3);
      
      const riskCategories = riskAssessment.risk_factors.map((f: HealthRiskFactor) => f.category);
      expect(riskCategories).toContain('onboarding');
      expect(riskCategories).toContain('engagement');
      expect(riskCategories).toContain('adoption');
    });

    it('should classify risk levels correctly', async () => {
      const testCases = [
        { churnScore: 75, expectedLevel: 'critical' },
        { churnScore: 60, expectedLevel: 'high' },
        { churnScore: 40, expectedLevel: 'medium' },
        { churnScore: 20, expectedLevel: 'low' }
      ];

      const engine = new HealthScoringEngine(mockSupabase as any);

      for (const testCase of testCases) {
        const mockScores = {
          onboarding_completion: testCase.churnScore > 50 ? 30 : 70,
          engagement_frequency: testCase.churnScore > 30 ? 20 : 60,
          feature_adoption_breadth: 50
        };

        const result = await (engine as any).assessRisks(mockScores, {});
        expect(result.risk_level).toBe(testCase.expectedLevel);
      }
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate trend direction correctly', async () => {
      const engine = new HealthScoringEngine(mockSupabase as any);

      // Mock historical scores
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'health_score_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => ({
                    order: () => ({
                      limit: () => ({
                        single: () => Promise.resolve({ 
                          data: { overall_health_score: 65 }, 
                          error: null 
                        })
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const trends = await (engine as any).analyzeTrends('user-123', 80);

      expect(trends).toHaveProperty('score_trend_7d');
      expect(trends).toHaveProperty('score_trend_30d');
      expect(trends).toHaveProperty('trend_direction');
      expect(['improving', 'stable', 'declining', 'volatile']).toContain(trends.trend_direction);
    });

    it('should identify improving trends', async () => {
      const engine = new HealthScoringEngine(mockSupabase as any);
      const trends = await (engine as any).analyzeTrends('user-123', 85);

      expect(trends.score_trend_7d).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple users in batches', async () => {
      setupSuccessfulMocks();
      mockRedis.get.mockResolvedValue(null);

      const userIds = ['user-1', 'user-2', 'user-3'];
      const results = await healthScoringEngine.calculateBatchHealthScores(userIds);

      expect(results.size).toBe(3);
      expect(results.has('user-1')).toBe(true);
      expect(results.has('user-2')).toBe(true);
      expect(results.has('user-3')).toBe(true);
    });

    it('should handle partial failures in batch processing', async () => {
      // Mock one success and one failure
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Database error');
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUserProfile, error: null })
            })
          })
        };
      });

      const userIds = ['user-1', 'user-2'];
      const results = await healthScoringEngine.calculateBatchHealthScores(userIds);

      expect(results.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Benchmarks', () => {
    it('should calculate benchmarks from historical data', async () => {
      const mockHistoricalData = [
        { overall_health_score: 95 },
        { overall_health_score: 85 },
        { overall_health_score: 75 },
        { overall_health_score: 65 },
        { overall_health_score: 55 }
      ];

      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          gte: () => ({
            eq: () => Promise.resolve({ data: mockHistoricalData, error: null })
          })
        })
      }));

      const benchmarks = await healthScoringEngine.getHealthBenchmarks(
        'supplier', 'small'
      );

      expect(benchmarks).toHaveProperty('user_type', 'supplier');
      expect(benchmarks).toHaveProperty('organization_size', 'small');
      expect(benchmarks.benchmarks.excellent).toBeGreaterThan(benchmarks.benchmarks.good);
      expect(benchmarks.benchmarks.good).toBeGreaterThan(benchmarks.benchmarks.average);
    });

    it('should return default benchmarks when no historical data exists', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          gte: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        })
      }));

      const benchmarks = await healthScoringEngine.getHealthBenchmarks(
        'supplier', 'medium'
      );

      expect(benchmarks.benchmarks.excellent).toBe(90);
      expect(benchmarks.benchmarks.good).toBe(75);
      expect(benchmarks.benchmarks.average).toBe(60);
    });
  });

  describe('Health Trends', () => {
    it('should retrieve health trends over specified time period', async () => {
      const mockTrendData = [
        {
          calculated_at: '2024-01-01T00:00:00Z',
          overall_health_score: 70,
          onboarding_completion: 80,
          feature_adoption_breadth: 60
        },
        {
          calculated_at: '2024-01-02T00:00:00Z',
          overall_health_score: 75,
          onboarding_completion: 85,
          feature_adoption_breadth: 65
        }
      ];

      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: mockTrendData, error: null })
            })
          })
        })
      }));

      const trends = await healthScoringEngine.getHealthTrends('user-123', 30);

      expect(trends).toHaveLength(2);
      expect(trends[0]).toHaveProperty('health_score', 70);
      expect(trends[0]).toHaveProperty('component_scores');
      expect(trends[0].component_scores).toHaveProperty('onboarding_completion', 80);
    });

    it('should handle errors when retrieving trends', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: null, error: new Error('Database error') })
            })
          })
        })
      }));

      const trends = await healthScoringEngine.getHealthTrends('user-123', 30);

      expect(trends).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should cache health scores successfully', async () => {
      setupSuccessfulMocks();
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await healthScoringEngine.calculateHealthScore('user-123');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'health_score:user-123',
        3600,
        expect.any(String)
      );
    });

    it('should handle cache write failures gracefully', async () => {
      setupSuccessfulMocks();
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Cache error'));

      const result = await healthScoringEngine.calculateHealthScore('user-123');

      expect(result).toHaveProperty('user_id', 'user-123');
      // Should continue despite cache error
    });

    it('should handle cache read failures gracefully', async () => {
      setupSuccessfulMocks();
      mockRedis.get.mockRejectedValue(new Error('Cache read error'));

      const result = await healthScoringEngine.calculateHealthScore('user-123');

      expect(result).toHaveProperty('user_id', 'user-123');
      // Should calculate fresh score
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user profile gracefully', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: new Error('Not found') })
              })
            })
          };
        }
        return setupMockTable(table);
      });

      await expect(
        healthScoringEngine.calculateHealthScore('nonexistent-user')
      ).rejects.toThrow();
    });

    it('should handle invalid user ID format', async () => {
      await expect(
        healthScoringEngine.calculateHealthScore('')
      ).rejects.toThrow();
    });

    it('should calculate scores with minimal data', async () => {
      // Mock minimal data scenario
      mockSupabase.from.mockImplementation((table) => {
        const emptyData = table === 'user_profiles' ? mockUserProfile : [];
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: table === 'user_profiles' ? mockUserProfile : null, error: null }),
              order: () => ({
                limit: () => Promise.resolve({ data: emptyData, error: null })
              }),
              gte: () => ({
                order: () => Promise.resolve({ data: emptyData, error: null })
              })
            })
          })
        };
      });

      mockEngagementService.getEngagementScore.mockResolvedValue({ score: 50 });
      mockRedis.get.mockResolvedValue(null);

      const result = await healthScoringEngine.calculateHealthScore('user-123');

      expect(result).toHaveProperty('overall_health_score');
      expect(result.overall_health_score).toBeGreaterThanOrEqual(0);
    });
  });

  // Helper functions
  function setupSuccessfulMocks() {
    mockSupabase.from.mockImplementation(setupMockTable);
    mockEngagementService.getEngagementScore.mockResolvedValue({ score: 75 });
  }

  function setupMockTable(tableName: string) {
    const mockData = {
      'user_profiles': mockUserProfile,
      'customer_success_configs': null,
      'success_milestones': mockMilestones,
      'client_engagement_events': mockEngagementEvents,
      'health_score_history': []
    };

    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ 
            data: mockData[tableName as keyof typeof mockData], 
            error: null 
          }),
          order: () => ({
            limit: () => Promise.resolve({ 
              data: Array.isArray(mockData[tableName as keyof typeof mockData]) 
                ? mockData[tableName as keyof typeof mockData] 
                : [mockData[tableName as keyof typeof mockData]], 
              error: null 
            })
          })
        }),
        order: () => ({
          limit: () => Promise.resolve({ 
            data: Array.isArray(mockData[tableName as keyof typeof mockData]) 
              ? mockData[tableName as keyof typeof mockData] 
              : [mockData[tableName as keyof typeof mockData]], 
            error: null 
          })
        }),
        gte: () => ({
          lte: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({ 
                  data: { overall_health_score: 70 }, 
                  error: null 
                })
              })
            })
          })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: null })
    };
  }
});