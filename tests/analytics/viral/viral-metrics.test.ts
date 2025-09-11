import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ViralMetricsEngine } from '../../../src/lib/analytics/viral-metrics';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

// Mock the supabase import
jest.mock('../../../src/lib/supabase/server', () => ({
  supabase: mockSupabase
}));

describe('ViralMetricsEngine', () => {
  let viralMetricsEngine: ViralMetricsEngine;
  let mockFrom: jest.MockedFunction<typeof mockSupabase.from>;
  let mockRpc: jest.MockedFunction<typeof mockSupabase.rpc>;

  beforeEach(() => {
    viralMetricsEngine = ViralMetricsEngine.getInstance();
    mockFrom = mockSupabase.from as jest.MockedFunction<typeof mockSupabase.from>;
    mockRpc = mockSupabase.rpc as jest.MockedFunction<typeof mockSupabase.rpc>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateViralCoefficient', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should calculate viral coefficient correctly with valid data', async () => {
      // Mock user profile check
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

      // Mock viral coefficient data
      mockRpc.mockResolvedValue({
        data: [
          {
            new_users: 100,
            invites_sent: 250,
            conversions: 75
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        mockUserId,
        mockDateRange,
        'monthly'
      );

      // Expected: (250 invites / 100 users) * (75 conversions / 250 invites) = 2.5 * 0.3 = 0.75
      expect(result.viralCoefficient).toBe(0.75);
      expect(result.conversionRate).toBe(0.3);
      expect(result.invitesPerUser).toBe(2.5);
      expect(result.totalUsers).toBe(100);
      expect(result.totalInvites).toBe(250);
      expect(result.totalConversions).toBe(75);
      expect(result.timeframe).toBe('monthly');
    });

    it('should handle zero values correctly', async () => {
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
            new_users: 0,
            invites_sent: 0,
            conversions: 0
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        mockUserId,
        mockDateRange
      );

      expect(result.viralCoefficient).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.invitesPerUser).toBe(0);
    });

    it('should handle empty data array', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'supplier' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        mockUserId,
        mockDateRange
      );

      expect(result.viralCoefficient).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalInvites).toBe(0);
      expect(result.totalConversions).toBe(0);
    });

    it('should throw error for unauthorized user', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'guest' },
              error: null
            })
          })
        })
      });

      await expect(
        viralMetricsEngine.calculateViralCoefficient(mockUserId, mockDateRange)
      ).rejects.toThrow('Unauthorized access to viral analytics');
    });

    it('should throw error when database query fails', async () => {
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
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        viralMetricsEngine.calculateViralCoefficient(mockUserId, mockDateRange)
      ).rejects.toThrow('Failed to fetch viral coefficient data');
    });

    it('should handle multiple data points correctly', async () => {
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
            new_users: 50,
            invites_sent: 100,
            conversions: 30
          },
          {
            new_users: 75,
            invites_sent: 200,
            conversions: 60
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        mockUserId,
        mockDateRange
      );

      // Total: 125 users, 300 invites, 90 conversions
      // Expected: (300/125) * (90/300) = 2.4 * 0.3 = 0.72
      expect(result.viralCoefficient).toBe(0.72);
      expect(result.totalUsers).toBe(125);
      expect(result.totalInvites).toBe(300);
      expect(result.totalConversions).toBe(90);
    });
  });

  describe('calculateSharingMetrics', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should calculate sharing metrics correctly', async () => {
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
            channel: 'email',
            share_count: 150,
            unique_users: 50,
            share_conversions: 45
          },
          {
            channel: 'social',
            share_count: 200,
            unique_users: 75,
            share_conversions: 40
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateSharingMetrics(
        mockUserId,
        mockDateRange
      );

      expect(result.sharesByChannel).toEqual({
        email: 150,
        social: 200
      });
      expect(result.shareRate).toBe(2.8); // (150 + 200) / (50 + 75)
      expect(result.averageSharesPerUser).toBe(2.8);
      expect(result.viralLoopCompletions).toBe(85); // 45 + 40
      expect(result.shareConversionRate).toBe(0.243); // 85 / (150 + 200)
    });

    it('should handle empty sharing data', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'supplier' },
              error: null
            })
          })
        })
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await viralMetricsEngine.calculateSharingMetrics(
        mockUserId,
        mockDateRange
      );

      expect(result.shareRate).toBe(0);
      expect(result.sharesByChannel).toEqual({});
      expect(result.averageSharesPerUser).toBe(0);
      expect(result.viralLoopCompletions).toBe(0);
      expect(result.shareConversionRate).toBe(0);
    });
  });

  describe('getViralFunnelAnalysis', () => {
    const mockUserId = 'test-user-123';
    const mockDateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should calculate funnel metrics correctly', async () => {
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
            invitations_sent: 1000,
            invitations_opened: 700,
            signups_started: 350,
            signups_completed: 280
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.getViralFunnelAnalysis(
        mockUserId,
        mockDateRange
      );

      expect(result.invitationsSent).toBe(1000);
      expect(result.invitationsOpened).toBe(700);
      expect(result.signupsStarted).toBe(350);
      expect(result.signupsCompleted).toBe(280);
      expect(result.activationRate).toBe(0.28); // 280/1000

      // Check funnel stages
      expect(result.funnelStages).toHaveLength(4);
      expect(result.funnelStages[0]).toEqual({
        stage: 'invitations_sent',
        count: 1000,
        conversionRate: 1.0
      });
      expect(result.funnelStages[1]).toEqual({
        stage: 'invitations_opened',
        count: 700,
        conversionRate: 0.7 // 700/1000
      });
      expect(result.funnelStages[2]).toEqual({
        stage: 'signups_started',
        count: 350,
        conversionRate: 0.5 // 350/700
      });
      expect(result.funnelStages[3]).toEqual({
        stage: 'signups_completed',
        count: 280,
        conversionRate: 0.8 // 280/350
      });
    });

    it('should throw error for unauthorized user', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, role: 'supplier' },
              error: null
            })
          })
        })
      });

      await expect(
        viralMetricsEngine.getViralFunnelAnalysis(mockUserId, mockDateRange)
      ).rejects.toThrow('Unauthorized access to funnel analytics');
    });
  });

  describe('validateCalculationAccuracy', () => {
    it('should validate calculation accuracy correctly', async () => {
      const testScenario = {
        newUsers: 100,
        invitesSent: 250,
        conversions: 75
      };

      const result = await viralMetricsEngine.validateCalculationAccuracy(
        'test-user',
        testScenario
      );

      expect(result.accurate).toBe(true);
      expect(result.calculated).toBe(0.75); // (250/100) * (75/250)
      expect(result.expected).toBe(0.75);
      expect(result.error).toBeUndefined();
    });

    it('should handle edge cases in validation', async () => {
      const testScenario = {
        newUsers: 0,
        invitesSent: 0,
        conversions: 0
      };

      const result = await viralMetricsEngine.validateCalculationAccuracy(
        'test-user',
        testScenario
      );

      expect(result.accurate).toBe(true);
      expect(result.calculated).toBe(0);
      expect(result.expected).toBe(0);
    });

    it('should detect calculation errors', async () => {
      const testScenario = {
        newUsers: 100,
        invitesSent: -250, // Invalid negative value
        conversions: 75
      };

      const result = await viralMetricsEngine.validateCalculationAccuracy(
        'test-user',
        testScenario
      );

      expect(result.accurate).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ViralMetricsEngine.getInstance();
      const instance2 = ViralMetricsEngine.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid numbers in calculation', async () => {
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
        data: [
          {
            new_users: null,
            invites_sent: undefined,
            conversions: 'invalid'
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        'test-user',
        { start: new Date(), end: new Date() }
      );

      expect(result.viralCoefficient).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalInvites).toBe(0);
      expect(result.totalConversions).toBe(0);
    });

    it('should validate calculation results', async () => {
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

      // Mock data that would result in NaN
      mockRpc.mockResolvedValue({
        data: [
          {
            new_users: 0,
            invites_sent: 10,
            conversions: 5
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        'test-user',
        { start: new Date(), end: new Date() }
      );

      // Should handle division by zero gracefully
      expect(Number.isFinite(result.viralCoefficient)).toBe(true);
      expect(result.viralCoefficient).toBe(0);
    });
  });

  describe('Data Privacy and Security', () => {
    it('should not expose individual user data', async () => {
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
        data: [
          {
            new_users: 100,
            invites_sent: 250,
            conversions: 75
          }
        ],
        error: null
      });

      const result = await viralMetricsEngine.calculateViralCoefficient(
        'test-user',
        { start: new Date(), end: new Date() }
      );

      // Verify no individual identifiers are returned
      expect(result).not.toHaveProperty('userIds');
      expect(result).not.toHaveProperty('individualData');
      expect(result).not.toHaveProperty('emails');
      expect(result).not.toHaveProperty('phoneNumbers');
      
      // Verify only aggregated metrics are returned
      expect(result).toHaveProperty('viralCoefficient');
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalInvites');
      expect(result).toHaveProperty('totalConversions');
    });
  });
});