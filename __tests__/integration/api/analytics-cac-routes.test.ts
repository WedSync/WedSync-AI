import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getCACChannels, POST as postCACChannels } from '@/app/api/analytics/cac/channels/route';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis()
  })
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock the CAC calculator
const mockCACCalculator = {
  calculateChannelCAC: jest.fn()
};

jest.mock('@/lib/analytics/cac-calculator', () => ({
  CACCalculator: jest.fn(() => mockCACCalculator)
}));

describe('Analytics CAC API Routes Integration Tests', () => {
  let mockAuthUser: any;
  let mockChannelData: any;
  let mockCACResult: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthUser = {
      id: 'user-123',
      email: 'admin@wedsync.com'
    };

    mockChannelData = [
      {
        channel: 'paid_search',
        campaign_id: 'google-ads-001',
        conversion_timestamp: '2024-01-15T00:00:00Z'
      },
      {
        channel: 'social_media',
        campaign_id: 'facebook-ads-001',
        conversion_timestamp: '2024-01-20T00:00:00Z'
      },
      {
        channel: 'organic',
        campaign_id: null,
        conversion_timestamp: '2024-01-25T00:00:00Z'
      }
    ];

    mockCACResult = {
      cac: 125.50,
      totalSpend: 2510.0,
      newCustomers: 20,
      conversionRate: 0.08,
      qualityScore: 0.75,
      averageTimeToPurchase: 12.5,
      averageJourneyLength: 3.2,
      cacByModel: {
        first_touch: 120.0,
        last_touch: 130.0,
        linear: 125.0,
        time_decay: 128.0,
        position_based: 126.5
      },
      trends: {
        monthOverMonth: -0.05,
        quarterOverQuarter: 0.12
      }
    };

    // Setup default successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null
    });

    // Setup default user profile with proper permissions
    mockSupabase.from.mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis()
      };

      if (table === 'user_profiles') {
        mockChain.single.mockResolvedValue({
          data: {
            role: 'admin',
            permissions: ['analytics:read', 'financial:read']
          },
          error: null
        });
      } else if (table === 'marketing_attribution') {
        mockChain.single.mockResolvedValue({
          data: mockChannelData,
          error: null
        });
      } else if (table === 'financial_audit_log') {
        mockChain.insert.mockResolvedValue({
          data: { id: 'audit-123' },
          error: null
        });
      }

      return mockChain;
    });

    // Setup default CAC calculation
    mockCACCalculator.calculateChannelCAC.mockResolvedValue(mockCACResult);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/analytics/cac/channels', () => {
    it('should analyze CAC for all channels with default parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        channels: expect.arrayContaining([
          expect.objectContaining({
            channel: expect.any(String),
            metrics: expect.objectContaining({
              cac: expect.any(Number),
              totalSpend: expect.any(Number),
              newCustomers: expect.any(Number)
            }),
            insights: expect.any(Array),
            recommendations: expect.any(Array),
            riskFactors: expect.any(Array)
          })
        ]),
        summary: expect.objectContaining({
          totalSpend: expect.any(Number),
          totalNewCustomers: expect.any(Number),
          blendedCAC: expect.any(Number),
          bestPerformingChannel: expect.any(String),
          worstPerformingChannel: expect.any(String)
        }),
        dateRange: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String)
        }),
        generatedAt: expect.any(String)
      });
    });

    it('should analyze specific channels when provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search,social_media',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels).toHaveLength(2);
      expect(data.channels.map((c: any) => c.channel)).toContain('paid_search');
      expect(data.channels.map((c: any) => c.channel)).toContain('social_media');
    });

    it('should handle custom date ranges', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-03-31';

      const request = new NextRequest(
        `http://localhost:3000/api/analytics/cac/channels?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dateRange.start).toBe('2024-01-01T00:00:00.000Z');
      expect(data.dateRange.end).toBe('2024-03-31T00:00:00.000Z');
    });

    it('should validate date range order', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?startDate=2024-03-31&endDate=2024-01-01',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Start date must be before end date');
    });

    it('should include attribution model breakdown when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?attributionModel=all&includeBreakdown=true',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.channels.forEach((channel: any) => {
        expect(channel.metrics.cacByModel).toBeDefined();
        expect(channel.metrics.cacByModel).toHaveProperty('first_touch');
        expect(channel.metrics.cacByModel).toHaveProperty('last_touch');
        expect(channel.metrics.cacByModel).toHaveProperty('linear');
        expect(channel.metrics.cacByModel).toHaveProperty('time_decay');
        expect(channel.metrics.cacByModel).toHaveProperty('position_based');
      });
    });

    it('should generate insights based on channel performance', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels[0].insights).toBeInstanceOf(Array);
      
      // Check insight structure
      if (data.channels[0].insights.length > 0) {
        const insight = data.channels[0].insights[0];
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('impact');
        expect(insight).toHaveProperty('confidence');
        expect(['trend', 'performance', 'efficiency', 'seasonality']).toContain(insight.type);
        expect(['positive', 'negative', 'neutral']).toContain(insight.impact);
      }
    });

    it('should provide actionable recommendations', async () => {
      // Mock high CAC scenario
      mockCACCalculator.calculateChannelCAC.mockResolvedValue({
        ...mockCACResult,
        cac: 250, // High CAC
        conversionRate: 0.01, // Low conversion rate
        qualityScore: 0.3 // Low quality
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels[0].recommendations).toBeInstanceOf(Array);
      expect(data.channels[0].recommendations.length).toBeGreaterThan(0);
      
      // Should recommend CAC optimization for high CAC
      expect(data.channels[0].recommendations.some((rec: string) => 
        rec.includes('CAC') && rec.includes('optimizing')
      )).toBe(true);
    });

    it('should identify risk factors', async () => {
      // Mock risky scenario
      mockCACCalculator.calculateChannelCAC.mockResolvedValue({
        ...mockCACResult,
        newCustomers: 5, // Low volume
        trends: {
          monthOverMonth: 0.3, // Rapidly increasing CAC
          quarterOverQuarter: 0.6
        },
        conversionRate: 0.003, // Extremely low conversion
        averageTimeToPurchase: 50 // Long sales cycle
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels[0].riskFactors).toBeInstanceOf(Array);
      expect(data.channels[0].riskFactors.length).toBeGreaterThan(0);
      
      const riskFactors = data.channels[0].riskFactors;
      expect(riskFactors).toContain('Low volume - statistical significance limited');
      expect(riskFactors).toContain('Rapidly increasing CAC trend');
      expect(riskFactors).toContain('Extremely low conversion rate');
      expect(riskFactors).toContain('Long sales cycle may impact cash flow');
    });

    it('should handle missing authentication', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'GET'
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized access to CAC analytics');
    });

    it('should handle insufficient permissions', async () => {
      // Mock user without analytics permissions
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                role: 'user',
                permissions: [] // No analytics permissions
              },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized access to CAC analytics');
    });

    it('should handle no channels found scenario', async () => {
      // Mock empty channel data
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'marketing_attribution') {
          return {
            select: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: [], // No channels available
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No channels found for analysis');
    });

    it('should include proper cache headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
    });

    it('should create audit log entry', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      await getCACChannels(request);

      // Verify audit log was created
      expect(mockSupabase.from).toHaveBeenCalledWith('financial_audit_log');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'cac_channel_analysis',
        resource_type: 'analytics',
        details: expect.objectContaining({
          channels: ['paid_search'],
          dateRange: expect.any(Object),
          blendedCAC: expect.any(Number),
          totalSpend: expect.any(Number)
        })
      });
    });
  });

  describe('POST /api/analytics/cac/channels', () => {
    it('should analyze CAC with custom parameters', async () => {
      const requestBody = {
        channels: ['paid_search', 'social_media'],
        dateRange: {
          start: '2024-01-01',
          end: '2024-03-31'
        },
        attributionModel: 'linear',
        includeBreakdown: true,
        groupBy: 'channel'
      };

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels).toHaveLength(2);
      expect(data.channels[0].campaigns).toBeDefined(); // includeBreakdown = true
      expect(data.dateRange.start).toBe('2024-01-01T00:00:00.000Z');
      expect(data.dateRange.end).toBe('2024-03-31T00:00:00.000Z');
    });

    it('should use default values when parameters not provided', async () => {
      const requestBody = {
        channels: ['paid_search']
      };

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should use default 90-day range
      const startDate = new Date(data.dateRange.start);
      const endDate = new Date(data.dateRange.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeCloseTo(90, 5); // Allow for small variations
    });

    it('should analyze all channels when none specified', async () => {
      const requestBody = {
        includeBreakdown: true
      };

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: 'invalid json'
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON request body');
    });

    it('should handle missing authentication', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ channels: ['paid_search'] })
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized access to CAC analytics');
    });

    it('should handle CAC calculation errors gracefully', async () => {
      mockCACCalculator.calculateChannelCAC.mockRejectedValue(
        new Error('Channel data not found')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify({ channels: ['nonexistent_channel'] })
        }
      );

      const response = await postCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should still return response with empty or error-handled channels
      expect(data.channels).toBeInstanceOf(Array);
      expect(data.summary).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete analysis within acceptable time', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const startTime = Date.now();
      const response = await getCACChannels(request);
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple channel analysis efficiently', async () => {
      const requestBody = {
        channels: ['paid_search', 'social_media', 'organic', 'referral', 'display'],
        includeBreakdown: true
      };

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const startTime = Date.now();
      const response = await postCACChannels(request);
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(10000); // Multiple channels within 10 seconds
    });
  });

  describe('Business Logic Validation', () => {
    it('should calculate blended CAC correctly', async () => {
      // Mock multiple channels with different CACs
      let callCount = 0;
      mockCACCalculator.calculateChannelCAC.mockImplementation(() => {
        const results = [
          { ...mockCACResult, cac: 100, totalSpend: 1000, newCustomers: 10 },
          { ...mockCACResult, cac: 200, totalSpend: 2000, newCustomers: 10 }
        ];
        return Promise.resolve(results[callCount++] || results[0]);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search,social_media',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.blendedCAC).toBeCloseTo(150, 1); // (3000 total spend) / (20 total customers)
      expect(data.summary.totalSpend).toBe(3000);
      expect(data.summary.totalNewCustomers).toBe(20);
    });

    it('should identify best and worst performing channels', async () => {
      // Mock channels with different performance
      let callCount = 0;
      mockCACCalculator.calculateChannelCAC.mockImplementation(() => {
        const results = [
          { ...mockCACResult, cac: 80, totalSpend: 800, newCustomers: 10 }, // Better
          { ...mockCACResult, cac: 200, totalSpend: 2000, newCustomers: 10 } // Worse
        ];
        return Promise.resolve(results[callCount++] || results[0]);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=paid_search,display',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.bestPerformingChannel).toBe('paid_search'); // Lower CAC
      expect(data.summary.worstPerformingChannel).toBe('display'); // Higher CAC
    });

    it('should apply wedding industry context to recommendations', async () => {
      // Mock channel with wedding-specific patterns
      mockCACCalculator.calculateChannelCAC.mockResolvedValue({
        ...mockCACResult,
        cac: 180,
        averageJourneyLength: 7, // Long journey typical for social media
        conversionRate: 0.025
      });

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/cac/channels?channels=social_media',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        }
      );

      const response = await getCACChannels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should include wedding-specific social media recommendations
      const recommendations = data.channels[0].recommendations;
      expect(recommendations.some((rec: string) => 
        rec.includes('retargeting') || rec.includes('Social media')
      )).toBe(true);
    });
  });
});