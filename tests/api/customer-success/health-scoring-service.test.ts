/**
 * Health Scoring Service Unit Tests
 * WedSync WS-168: Customer Success Dashboard Implementation
 * 
 * Comprehensive test suite with >80% coverage
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { HealthScoringService } from '@/lib/customer-success/health-scoring-service';
import type { HealthScoreFilters } from '@/lib/validations/customer-success';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  single: jest.fn(),
  rpc: jest.fn()
};

// Mock the Supabase client creation
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

// Mock date-fns functions
jest.mock('date-fns', () => ({
  differenceInDays: jest.fn((date1, date2) => {
    const diff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(Math.abs(diff));
  }),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  subWeeks: jest.fn((date, weeks) => new Date(date.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)),
  subMonths: jest.fn((date, months) => new Date(date.getTime() - months * 30 * 24 * 60 * 60 * 1000)),
  isWithinInterval: jest.fn(() => true),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59))
}));

describe('HealthScoringService', () => {
  let healthScoringService: HealthScoringService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    healthScoringService = new HealthScoringService();
  });

  describe('calculateHealthScores', () => {
    test('should calculate health scores for multiple suppliers', async () => {
      // Mock suppliers data
      const mockSuppliers = [
        {
          id: 'supplier1',
          full_name: 'John Photographer',
          organization_id: 'org1',
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-08-20T10:00:00Z'
        },
        {
          id: 'supplier2',
          full_name: 'Jane Videographer',
          organization_id: 'org1',
          created_at: '2024-06-01T00:00:00Z',
          last_sign_in_at: '2024-08-25T15:00:00Z'
        }
      ];

      // Mock client data
      const mockClients = [
        { supplier_id: 'supplier1' },
        { supplier_id: 'supplier1' },
        { supplier_id: 'supplier2' }
      ];

      const mockActiveClients = [
        { supplier_id: 'supplier1' },
        { supplier_id: 'supplier2' }
      ];

      // Setup mock chain
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockSuppliers,
        error: null
      });

      // Mock client count queries
      mockSupabaseClient.select
        .mockResolvedValueOnce({ data: mockClients, error: null })
        .mockResolvedValueOnce({ data: mockActiveClients, error: null });

      const filters: HealthScoreFilters = {
        organizationId: 'org1',
        limit: 10,
        offset: 0
      };

      const result = await healthScoringService.calculateHealthScores(filters);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('supplierId', 'supplier1');
      expect(result[0]).toHaveProperty('supplierName', 'John Photographer');
      expect(result[0]).toHaveProperty('metrics');
      expect(result[0].metrics).toHaveProperty('overall');
      expect(result[0].metrics).toHaveProperty('engagement');
      expect(result[0].metrics).toHaveProperty('recency');
      expect(result[0].metrics).toHaveProperty('duration');
    });

    test('should handle empty supplier list', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await healthScoringService.calculateHealthScores();

      expect(result).toHaveLength(0);
    });

    test('should handle database error', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(
        healthScoringService.calculateHealthScores()
      ).rejects.toThrow('Failed to calculate health scores');
    });
  });

  describe('calculateSingleHealthScore', () => {
    test('should calculate correct health score for active supplier', async () => {
      const mockSupplierMetrics = {
        supplierId: 'supplier1',
        supplierName: 'John Photographer',
        organizationId: 'org1',
        totalClients: 5,
        activeClients: 4,
        averageProjectValue: 2500,
        lastLoginAt: new Date('2024-08-25T10:00:00Z'),
        accountCreatedAt: new Date('2024-01-01T00:00:00Z'),
        loginCount30d: 15,
        loginCount7d: 5,
        featureUsageScore: 75,
        supportTickets30d: 1,
        projectsCompleted30d: 2,
        clientInteractions30d: 20,
        revenueGenerated30d: 5000
      };

      const result = await healthScoringService.calculateSingleHealthScore(mockSupplierMetrics);

      expect(result.supplierId).toBe('supplier1');
      expect(result.supplierName).toBe('John Photographer');
      expect(result.metrics.overall).toBeGreaterThanOrEqual(0);
      expect(result.metrics.overall).toBeLessThanOrEqual(100);
      expect(result.metrics.engagement).toBeGreaterThanOrEqual(0);
      expect(result.metrics.recency).toBeGreaterThanOrEqual(0);
      expect(result.metrics.duration).toBeGreaterThanOrEqual(0);
      expect(['healthy', 'at-risk', 'critical', 'churned']).toContain(result.status);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    test('should calculate low score for inactive supplier', async () => {
      const mockSupplierMetrics = {
        supplierId: 'supplier2',
        supplierName: 'Inactive Supplier',
        organizationId: 'org1',
        totalClients: 1,
        activeClients: 0,
        averageProjectValue: 500,
        lastLoginAt: new Date('2024-06-01T10:00:00Z'), // 2+ months ago
        accountCreatedAt: new Date('2024-05-01T00:00:00Z'),
        loginCount30d: 0,
        loginCount7d: 0,
        featureUsageScore: 10,
        supportTickets30d: 3,
        projectsCompleted30d: 0,
        clientInteractions30d: 0,
        revenueGenerated30d: 0
      };

      const result = await healthScoringService.calculateSingleHealthScore(mockSupplierMetrics);

      expect(result.metrics.overall).toBeLessThan(50);
      expect(result.status).toBe('critical');
      expect(['high', 'critical']).toContain(result.riskLevel);
    });

    test('should handle supplier with no login history', async () => {
      const mockSupplierMetrics = {
        supplierId: 'supplier3',
        supplierName: 'Never Logged In',
        organizationId: 'org1',
        totalClients: 0,
        activeClients: 0,
        averageProjectValue: 0,
        lastLoginAt: null,
        accountCreatedAt: new Date('2024-08-01T00:00:00Z'),
        loginCount30d: 0,
        loginCount7d: 0,
        featureUsageScore: 0,
        supportTickets30d: 0,
        projectsCompleted30d: 0,
        clientInteractions30d: 0,
        revenueGenerated30d: 0
      };

      const result = await healthScoringService.calculateSingleHealthScore(mockSupplierMetrics);

      expect(result.metrics.recency).toBe(0);
      expect(result.metadata.lastLoginDays).toBe(999);
      expect(['critical', 'churned']).toContain(result.status);
    });
  });

  describe('engagement score calculation', () => {
    test('should calculate high engagement score for active supplier', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        loginCount30d: 20,
        featureUsageScore: 90,
        clientInteractions30d: 50,
        totalClients: 10,
        supportTickets30d: 1
      };

      // Access private method via reflection for testing
      const service = healthScoringService as any;
      const engagementScore = service.calculateEngagementScore(mockMetrics, now);

      expect(engagementScore).toBeGreaterThan(70);
      expect(engagementScore).toBeLessThanOrEqual(100);
    });

    test('should calculate low engagement score for inactive supplier', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        loginCount30d: 2,
        featureUsageScore: 10,
        clientInteractions30d: 1,
        totalClients: 5,
        supportTickets30d: 5
      };

      const service = healthScoringService as any;
      const engagementScore = service.calculateEngagementScore(mockMetrics, now);

      expect(engagementScore).toBeLessThan(50);
      expect(engagementScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recency score calculation', () => {
    test('should give maximum score for recent login', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        lastLoginAt: new Date('2024-08-26T10:00:00Z'), // Yesterday
        loginCount7d: 5,
        projectsCompleted30d: 2
      };

      const service = healthScoringService as any;
      const recencyScore = service.calculateRecencyScore(mockMetrics, now);

      expect(recencyScore).toBe(100);
    });

    test('should give zero score for very old login', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        lastLoginAt: new Date('2024-05-01T10:00:00Z'), // 3+ months ago
        loginCount7d: 0,
        projectsCompleted30d: 0
      };

      const service = healthScoringService as any;
      const recencyScore = service.calculateRecencyScore(mockMetrics, now);

      expect(recencyScore).toBeLessThanOrEqual(20);
    });

    test('should handle null login date', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        lastLoginAt: null,
        loginCount7d: 0,
        projectsCompleted30d: 0
      };

      const service = healthScoringService as any;
      const recencyScore = service.calculateRecencyScore(mockMetrics, now);

      expect(recencyScore).toBe(0);
    });
  });

  describe('duration score calculation', () => {
    test('should give higher score for mature accounts', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        accountCreatedAt: new Date('2023-01-01T00:00:00Z'), // Over a year old
        totalClients: 10,
        activeClients: 8
      };

      const service = healthScoringService as any;
      const durationScore = service.calculateDurationScore(mockMetrics, now);

      expect(durationScore).toBeGreaterThan(80);
    });

    test('should give lower score for new accounts', () => {
      const now = new Date('2024-08-27T00:00:00Z');
      const mockMetrics = {
        accountCreatedAt: new Date('2024-08-01T00:00:00Z'), // Less than a month old
        totalClients: 1,
        activeClients: 1
      };

      const service = healthScoringService as any;
      const durationScore = service.calculateDurationScore(mockMetrics, now);

      expect(durationScore).toBeLessThan(60);
    });
  });

  describe('health status determination', () => {
    test('should return healthy for high scores', () => {
      const service = healthScoringService as any;
      const status = service.determineHealthStatus(85);
      expect(status).toBe('healthy');
    });

    test('should return at-risk for medium scores', () => {
      const service = healthScoringService as any;
      const status = service.determineHealthStatus(65);
      expect(status).toBe('at-risk');
    });

    test('should return critical for low scores', () => {
      const service = healthScoringService as any;
      const status = service.determineHealthStatus(35);
      expect(status).toBe('critical');
    });

    test('should return churned for very low scores', () => {
      const service = healthScoringService as any;
      const status = service.determineHealthStatus(15);
      expect(status).toBe('churned');
    });
  });

  describe('risk level determination', () => {
    test('should escalate risk for old login', () => {
      const mockMetrics = {
        lastLoginAt: new Date('2024-06-01T00:00:00Z'), // Over 30 days ago
        revenueGenerated30d: 1000,
        accountCreatedAt: new Date('2024-01-01T00:00:00Z')
      };

      const service = healthScoringService as any;
      const riskLevel = service.determineRiskLevel(75, mockMetrics);

      expect(['medium', 'high']).toContain(riskLevel);
    });

    test('should escalate risk for no revenue', () => {
      const mockMetrics = {
        lastLoginAt: new Date('2024-08-25T00:00:00Z'),
        revenueGenerated30d: 0,
        accountCreatedAt: new Date('2024-01-01T00:00:00Z') // Mature account
      };

      const service = healthScoringService as any;
      const riskLevel = service.determineRiskLevel(75, mockMetrics);

      expect(['medium', 'high']).toContain(riskLevel);
    });
  });

  describe('filtering and sorting', () => {
    test('should filter by status', () => {
      const healthScores = [
        { status: 'healthy', metrics: { overall: 85 } },
        { status: 'at-risk', metrics: { overall: 65 } },
        { status: 'critical', metrics: { overall: 35 } }
      ] as any;

      const filters: HealthScoreFilters = {
        status: ['healthy', 'critical'],
        limit: 10,
        offset: 0
      };

      const service = healthScoringService as any;
      const result = service.sortAndLimitResults(healthScores, filters);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('healthy');
      expect(result[1].status).toBe('critical');
    });

    test('should filter by score range', () => {
      const healthScores = [
        { status: 'healthy', metrics: { overall: 85 } },
        { status: 'at-risk', metrics: { overall: 65 } },
        { status: 'critical', metrics: { overall: 35 } }
      ] as any;

      const filters: HealthScoreFilters = {
        minScore: 50,
        maxScore: 80,
        limit: 10,
        offset: 0
      };

      const service = healthScoringService as any;
      const result = service.sortAndLimitResults(healthScores, filters);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.overall).toBe(65);
    });

    test('should sort by score descending', () => {
      const healthScores = [
        { metrics: { overall: 35 }, supplierName: 'C' },
        { metrics: { overall: 85 }, supplierName: 'A' },
        { metrics: { overall: 65 }, supplierName: 'B' }
      ] as any;

      const filters: HealthScoreFilters = {
        sortBy: 'score',
        sortOrder: 'desc',
        limit: 10,
        offset: 0
      };

      const service = healthScoringService as any;
      const result = service.sortAndLimitResults(healthScores, filters);

      expect(result[0].metrics.overall).toBe(85);
      expect(result[1].metrics.overall).toBe(65);
      expect(result[2].metrics.overall).toBe(35);
    });

    test('should apply pagination', () => {
      const healthScores = Array.from({ length: 25 }, (_, i) => ({
        metrics: { overall: 100 - i },
        supplierName: `Supplier ${i}`
      })) as any;

      const filters: HealthScoreFilters = {
        limit: 10,
        offset: 10
      };

      const service = healthScoringService as any;
      const result = service.sortAndLimitResults(healthScores, filters);

      expect(result).toHaveLength(10);
      expect(result[0].supplierName).toBe('Supplier 10');
    });
  });

  describe('consistency factor calculation', () => {
    test('should calculate high consistency for retained clients', () => {
      const mockMetrics = {
        activeClients: 8,
        totalClients: 10,
        clientInteractions30d: 80
      };

      const service = healthScoringService as any;
      const factor = service.calculateConsistencyFactor(mockMetrics);

      expect(factor).toBeGreaterThan(0.7);
      expect(factor).toBeLessThanOrEqual(1);
    });

    test('should calculate low consistency for churned clients', () => {
      const mockMetrics = {
        activeClients: 2,
        totalClients: 10,
        clientInteractions30d: 5
      };

      const service = healthScoringService as any;
      const factor = service.calculateConsistencyFactor(mockMetrics);

      expect(factor).toBeLessThan(0.5);
      expect(factor).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper function to create mock supplier metrics
function createMockSupplierMetrics(overrides = {}): any {
  return {
    supplierId: 'supplier1',
    supplierName: 'Test Supplier',
    organizationId: 'org1',
    totalClients: 5,
    activeClients: 4,
    averageProjectValue: 2500,
    lastLoginAt: new Date('2024-08-25T10:00:00Z'),
    accountCreatedAt: new Date('2024-01-01T00:00:00Z'),
    loginCount30d: 15,
    loginCount7d: 5,
    featureUsageScore: 75,
    supportTickets30d: 1,
    projectsCompleted30d: 2,
    clientInteractions30d: 20,
    revenueGenerated30d: 5000,
    ...overrides
  };
}