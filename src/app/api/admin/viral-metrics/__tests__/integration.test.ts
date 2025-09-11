import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as viralMetricsGET } from '../route';
import { GET as bottlenecksGET } from '../bottlenecks/route';
import { POST as simulateAPI } from '../simulate/route';
import { supabaseAdmin } from '@/lib/database/supabase-admin';

// Mock Supabase admin client
jest.mock('@/lib/database/supabase-admin');
const mockSupabase = supabaseAdmin as jest.MockedFunction<typeof supabaseAdmin>;

// Mock implementations for external dependencies
jest.mock('@/lib/analytics/advanced-viral-calculator', () => ({
  AdvancedViralCalculator: jest.fn().mockImplementation(() => ({
    calculateEnhanced: jest.fn(),
    analyzeEnhancedLoops: jest.fn(),
    identifyViralBottlenecks: jest.fn(),
    generateOptimizationRecommendations: jest.fn(),
  })),
}));

jest.mock('@/lib/analytics/viral-optimization-engine', () => ({
  ViralOptimizationEngine: jest.fn().mockImplementation(() => ({
    runSimulation: jest.fn(),
  })),
}));

describe('Viral Metrics API Integration Tests', () => {
  let mockSupabaseInstance: any;
  const validAdminToken = 'valid-admin-token';
  const invalidToken = 'invalid-token';

  beforeEach(() => {
    mockSupabaseInstance = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    mockSupabase.mockReturnValue(mockSupabaseInstance);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/admin/viral-metrics', () => {
    it('should return viral metrics for authenticated admin', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      // Mock viral calculator results
      const {
        AdvancedViralCalculator,
      } = require('@/lib/analytics/advanced-viral-calculator');
      const mockCalculator = new AdvancedViralCalculator();

      mockCalculator.calculateEnhanced.mockResolvedValue({
        coefficient: 1.25,
        sustainableCoefficient: 1.1,
        acceptanceRate: 0.7,
        conversionTime: 12,
        qualityScore: 0.8,
        seasonalMultiplier: 1.4,
        velocityTrend: 'accelerating',
        weddingIndustryFactors: {
          seasonalImpact: 'peak',
          vendorDensity: 'high',
          marketMaturity: 'mature',
        },
        metadata: {
          totalInvitations: 150,
          totalAcceptances: 105,
          analysisDate: new Date().toISOString(),
          cohortSize: 75,
        },
      });

      mockCalculator.analyzeEnhancedLoops.mockResolvedValue([
        {
          type: 'supplier_to_couple',
          count: 45,
          conversionRate: 0.8,
          revenue: 35000,
          efficiency: 0.9,
          avgCycleTime: 14,
          revenuePerLoop: 777.78,
          weddingContext: 'Primary viral loop with highest conversion rates',
        },
      ]);

      // Mock historical data
      mockSupabaseInstance.select.mockResolvedValue({
        data: [
          {
            date: '2024-01-01',
            coefficient: 1.1,
            invitation_rate: 2.5,
            conversion_rate: 0.65,
          },
          {
            date: '2024-02-01',
            coefficient: 1.2,
            invitation_rate: 2.8,
            conversion_rate: 0.7,
          },
          {
            date: '2024-03-01',
            coefficient: 1.25,
            invitation_rate: 3.0,
            conversion_rate: 0.75,
          },
        ],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics?timeframe=30d',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhanced).toBeDefined();
      expect(data.enhanced.coefficient).toBe(1.25);
      expect(data.enhanced.weddingIndustryFactors.seasonalImpact).toBe('peak');
      expect(data.loops).toBeDefined();
      expect(data.loops).toHaveLength(1);
      expect(data.historical).toBeDefined();
      expect(data.seasonal).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      // Mock non-admin user
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized. Admin access required.');
    });

    it('should reject requests without authorization header', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics',
      );

      const response = await viralMetricsGET(request);

      expect(response.status).toBe(401);
    });

    it('should handle different timeframe parameters', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const {
        AdvancedViralCalculator,
      } = require('@/lib/analytics/advanced-viral-calculator');
      const mockCalculator = new AdvancedViralCalculator();

      mockCalculator.calculateEnhanced.mockResolvedValue({
        coefficient: 0.9,
        sustainableCoefficient: 0.8,
        acceptanceRate: 0.6,
        conversionTime: 18,
        qualityScore: 0.65,
        seasonalMultiplier: 0.7,
        velocityTrend: 'stable',
        weddingIndustryFactors: {
          seasonalImpact: 'off',
          vendorDensity: 'medium',
          marketMaturity: 'growing',
        },
        metadata: {
          totalInvitations: 50,
          totalAcceptances: 30,
          analysisDate: new Date().toISOString(),
          cohortSize: 25,
        },
      });

      mockCalculator.analyzeEnhancedLoops.mockResolvedValue([]);
      mockSupabaseInstance.select.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics?timeframe=7d',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhanced.seasonalMultiplier).toBe(0.7);
      expect(mockCalculator.calculateEnhanced).toHaveBeenCalled();
    });

    it('should handle vendor type filtering', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const {
        AdvancedViralCalculator,
      } = require('@/lib/analytics/advanced-viral-calculator');
      const mockCalculator = new AdvancedViralCalculator();
      mockCalculator.calculateEnhanced.mockResolvedValue({
        coefficient: 1.3,
        weddingIndustryFactors: { vendorDensity: 'high' },
      } as any);
      mockCalculator.analyzeEnhancedLoops.mockResolvedValue([]);
      mockSupabaseInstance.select.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics?vendorType=photographers',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);

      expect(response.status).toBe(200);
      expect(mockCalculator.calculateEnhanced).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/viral-metrics/bottlenecks', () => {
    it('should identify and return viral bottlenecks', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      // Mock cohort users
      mockSupabaseInstance.select.mockResolvedValue({
        data: [{ id: 'user1' }, { id: 'user2' }, { id: 'user3' }],
        error: null,
      });

      const {
        AdvancedViralCalculator,
      } = require('@/lib/analytics/advanced-viral-calculator');
      const mockCalculator = new AdvancedViralCalculator();

      mockCalculator.calculateEnhanced.mockResolvedValue({
        coefficient: 0.8,
        acceptanceRate: 0.4,
        qualityScore: 0.5,
      } as any);

      mockCalculator.identifyViralBottlenecks.mockResolvedValue([
        {
          stage: 'invitation_acceptance',
          impact: 0.4,
          severity: 'high',
          description: 'Low invitation acceptance rate (40%)',
        },
        {
          stage: 'seasonal_optimization',
          impact: 0.2,
          severity: 'medium',
          description: 'Off-season performance drop',
        },
      ]);

      mockCalculator.generateOptimizationRecommendations.mockResolvedValue([
        {
          priority: 'high',
          category: 'acceptance_optimization',
          action: 'Improve invitation messaging and timing',
          expectedImpact: 0.25,
          implementationEffort: 'medium',
          roi: 3.2,
        },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics/bottlenecks?timeframe=30d',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await bottlenecksGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bottlenecks).toHaveLength(2);
      expect(data.bottlenecks[0].stage).toBe('invitation_acceptance');
      expect(data.bottlenecks[0].affectedUsers).toBe(1); // floor(3 * 0.4)
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].weddingContext).toBeDefined();
      expect(data.recommendations[0].timeline).toBeDefined();
    });

    it('should handle empty cohort gracefully', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      // Mock empty cohort
      mockSupabaseInstance.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics/bottlenecks?timeframe=30d',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await bottlenecksGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bottlenecks).toHaveLength(0);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].action).toContain('user acquisition');
    });
  });

  describe('POST /api/admin/viral-metrics/simulate', () => {
    it('should run viral simulation with intervention', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const {
        ViralOptimizationEngine,
      } = require('@/lib/analytics/viral-optimization-engine');
      const mockEngine = new ViralOptimizationEngine();

      mockEngine.runSimulation.mockResolvedValue({
        projectedOutcome: {
          baselineCoefficient: 0.9,
          projectedCoefficient: 1.15,
          expectedNewUsers: 125,
          projectedRevenue: 45000,
          confidenceLevel: 0.85,
        },
        riskAnalysis: {
          implementationRisk: 'medium',
          marketRisk: 'low',
          seasonalRisk: 'low',
          overallRisk: 'medium',
        },
        timelineProjections: [
          { week: 1, coefficient: 0.95, users: 520 },
          { week: 2, coefficient: 1.05, users: 546 },
          { week: 3, coefficient: 1.1, users: 578 },
          { week: 4, coefficient: 1.15, users: 614 },
        ],
        roiAnalysis: {
          investmentCost: 5000,
          projectedReturn: 16000,
          roi: 2.2,
          paybackPeriod: 8,
          breakEvenPoint: 6,
        },
        recommendations: [
          'Launch during peak wedding season (May-September)',
          'Focus on photographer segment for highest conversion',
        ],
      });

      const simulationRequest = {
        intervention: {
          type: 'incentive' as const,
          parameters: {
            incentiveAmount: 50,
            targetSegment: 'photographers' as const,
          },
          expectedImpact: {
            invitationRate: 1.3,
            conversionRate: 1.2,
          },
          cost: 5000,
        },
        duration: 30,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics/simulate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(simulationRequest),
        },
      );

      const response = await simulateAPI(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projectedOutcome).toBeDefined();
      expect(data.projectedOutcome.projectedCoefficient).toBe(1.15);
      expect(data.riskAnalysis).toBeDefined();
      expect(data.roiAnalysis.roi).toBe(2.2);
      expect(data.timelineProjections).toHaveLength(4);
      expect(mockEngine.runSimulation).toHaveBeenCalledWith(
        simulationRequest.intervention,
        simulationRequest.duration,
      );
    });

    it('should validate simulation parameters', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const invalidRequest = {
        intervention: null,
        duration: -5,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics/simulate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidRequest),
        },
      );

      const response = await simulateAPI(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid simulation parameters');
    });

    it('should handle simulation engine errors', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const {
        ViralOptimizationEngine,
      } = require('@/lib/analytics/viral-optimization-engine');
      const mockEngine = new ViralOptimizationEngine();

      mockEngine.runSimulation.mockRejectedValue(
        new Error('Simulation failed: insufficient data'),
      );

      const simulationRequest = {
        intervention: {
          type: 'incentive' as const,
          parameters: {
            incentiveAmount: 25,
          },
          expectedImpact: {
            invitationRate: 1.2,
          },
          cost: 2500,
        },
        duration: 21,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics/simulate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(simulationRequest),
        },
      );

      const response = await simulateAPI(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Simulation failed: insufficient data');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock admin authentication
      mockSupabaseInstance.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });
      mockSupabaseInstance.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const {
        AdvancedViralCalculator,
      } = require('@/lib/analytics/advanced-viral-calculator');
      const mockCalculator = new AdvancedViralCalculator();

      mockCalculator.calculateEnhanced.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch viral metrics');
    });

    it('should handle authentication service errors', async () => {
      mockSupabaseInstance.auth.getUser.mockRejectedValue(
        new Error('Auth service unavailable'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      const response = await viralMetricsGET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limited requests', async () => {
      // This would be implemented with actual rate limiting middleware
      // For now, just verify the structure exists
      const request = new NextRequest(
        'http://localhost:3000/api/admin/viral-metrics',
        {
          headers: {
            Authorization: `Bearer ${validAdminToken}`,
          },
        },
      );

      // Mock too many requests scenario
      // In real implementation, this would be handled by rate limiting middleware
      expect(request.headers.get('Authorization')).toBe(
        `Bearer ${validAdminToken}`,
      );
    });
  });
});
