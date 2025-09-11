/**
 * WS-234 Query Optimizer Unit Tests
 * Comprehensive test suite for QueryOptimizer with wedding-specific optimizations
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { QueryOptimizer } from '@/lib/monitoring/query-optimizer';
import type { SlowQuery } from '@/lib/monitoring/database-health-monitor';

// Mock Supabase client
const mockSupabaseClient = {
  rpc: jest.fn(),
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  };

  // Reset all mocks
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('QueryOptimizer', () => {
  let optimizer: QueryOptimizer;

  beforeEach(() => {
    optimizer = new QueryOptimizer();
  });

  describe('Constructor', () => {
    it('should initialize with Supabase configuration', () => {
      expect(optimizer).toBeInstanceOf(QueryOptimizer);
    });

    it('should throw error when environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => new QueryOptimizer()).toThrow(
        'Supabase configuration missing for query optimization',
      );
    });
  });

  describe('Slow Query Analysis', () => {
    const mockSlowQueries = [
      {
        query_hash: 'hash1',
        query: 'SELECT * FROM form_responses WHERE form_id = $1',
        calls: 500,
        avg_time: 1200,
        total_time: 600000,
        max_time: 3000,
        stddev_exec_time: 200,
        rows: 1000,
        is_wedding_related: true,
      },
      {
        query_hash: 'hash2',
        query: 'SELECT name, email FROM clients WHERE organization_id = $1',
        calls: 200,
        avg_time: 800,
        total_time: 160000,
        max_time: 2000,
        stddev_exec_time: 150,
        rows: 500,
        is_wedding_related: true,
      },
      {
        query_hash: 'hash3',
        query: 'SELECT * FROM audit_logs WHERE created_at > $1',
        calls: 1000,
        avg_time: 50,
        total_time: 50000,
        max_time: 200,
        stddev_exec_time: 20,
        rows: 100,
        is_wedding_related: false,
      },
    ];

    beforeEach(() => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSlowQueries,
        error: null,
      });
    });

    it('should identify wedding-critical queries correctly', async () => {
      const reports = await optimizer.analyzeSlowQueries();

      const weddingQueries = reports.filter((r) => r.isWeddingCritical);
      const normalQueries = reports.filter((r) => !r.isWeddingCritical);

      expect(weddingQueries).toHaveLength(2);
      expect(normalQueries).toHaveLength(1);
    });

    it('should prioritize queries correctly', async () => {
      const reports = await optimizer.analyzeSlowQueries();

      // Should be sorted by priority (critical first) then by wedding criticality
      expect(reports[0].priority).toBe('critical'); // First query: 1200ms + wedding critical
      expect(reports[0].isWeddingCritical).toBe(true);

      // Second query should be high priority (800ms + wedding critical)
      expect(reports[1].priority).toBe('high');
      expect(reports[1].isWeddingCritical).toBe(true);

      // Third query should be lower priority (50ms, not wedding critical)
      expect(reports[2].priority).toBe('low');
      expect(reports[2].isWeddingCritical).toBe(false);
    });

    it('should generate appropriate optimization suggestions', async () => {
      const reports = await optimizer.analyzeSlowQueries();

      // First query (SELECT *) should suggest column optimization
      const selectStarQuery = reports.find((r) =>
        r.originalQuery.includes('SELECT *'),
      );
      expect(selectStarQuery?.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'select_optimization',
          impact: 'medium',
          description: expect.stringContaining('selects all columns'),
        }),
      );
    });

    it('should handle errors in slow query analysis gracefully', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Database error'));

      const reports = await optimizer.analyzeSlowQueries();

      expect(reports).toEqual([]);
    });
  });

  describe('Query Pattern Detection', () => {
    it('should detect N+1 query patterns', () => {
      const mockQuery: SlowQuery = {
        queryHash: 'hash1',
        query: 'SELECT * FROM clients WHERE id = $1',
        avgTime: 30,
        calls: 150,
        totalTime: 4500,
        maxTime: 100,
        isWeddingRelated: true,
        optimization: {} as any,
      };

      const isNPlusOne = (optimizer as any).detectNPlusOnePattern(mockQuery);

      expect(isNPlusOne).toBe(false); // Total time not high enough

      // Test actual N+1 pattern
      const nPlusOneQuery: SlowQuery = {
        ...mockQuery,
        calls: 200,
        avgTime: 40,
        totalTime: 8000, // High total time with many calls
      };

      const isActualNPlusOne = (optimizer as any).detectNPlusOnePattern(
        nPlusOneQuery,
      );
      expect(isActualNPlusOne).toBe(true);
    });

    it('should identify wedding-critical table patterns', () => {
      const testCases = [
        { query: 'SELECT * FROM form_responses', expected: true },
        { query: 'SELECT * FROM journey_events', expected: true },
        { query: 'SELECT * FROM payment_history', expected: true },
        { query: 'SELECT * FROM clients', expected: true },
        { query: 'SELECT * FROM audit_logs', expected: false },
        { query: 'SELECT * FROM system_configs', expected: false },
      ];

      testCases.forEach(({ query, expected }) => {
        const isWeddingCritical = (optimizer as any).isWeddingCriticalQuery(
          query,
        );
        expect(isWeddingCritical).toBe(expected);
      });
    });
  });

  describe('Optimization Suggestions', () => {
    it('should generate missing index suggestions for wedding tables', () => {
      const mockQuery = {
        query: 'SELECT * FROM form_responses WHERE form_id = $1',
        avgTime: 1000,
        calls: 100,
      };

      const suggestions = (optimizer as any).generateOptimizationSuggestions(
        [],
        mockQuery,
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'select_optimization',
          impact: 'medium',
        }),
      );
    });

    it('should suggest N+1 optimization for high-frequency queries', () => {
      const mockQuery: SlowQuery = {
        queryHash: 'hash1',
        query: 'SELECT * FROM clients WHERE organization_id = $1',
        avgTime: 40,
        calls: 200,
        totalTime: 8000,
        maxTime: 100,
        isWeddingRelated: true,
        optimization: {} as any,
      };

      const suggestions = (optimizer as any).generateOptimizationSuggestions(
        [],
        mockQuery,
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'n_plus_one',
          impact: 'high',
          estimatedImprovement: '70-90% reduction in database queries',
        }),
      );
    });

    it('should prioritize wedding-specific optimizations', () => {
      const suggestions: any[] = [];
      const queryText =
        'SELECT * FROM form_responses WHERE created_at BETWEEN $1 AND $2';

      (optimizer as any).checkWeddingSpecificIndexes(queryText, suggestions);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'missing_index',
          impact: 'critical',
          description: expect.stringContaining('Form response queries'),
        }),
      );
    });
  });

  describe('Query Priority Calculation', () => {
    it('should assign critical priority to slow wedding queries', () => {
      const mockQuery: SlowQuery = {
        queryHash: 'hash1',
        query: 'SELECT * FROM form_responses',
        avgTime: 2500, // Very slow
        calls: 100,
        totalTime: 250000,
        maxTime: 5000,
        isWeddingRelated: true,
        optimization: {} as any,
      };

      const priority = (optimizer as any).calculateQueryPriority(
        mockQuery,
        true,
      );

      expect(priority).toBe('critical');
    });

    it('should assign lower priority to fast non-wedding queries', () => {
      const mockQuery: SlowQuery = {
        queryHash: 'hash1',
        query: 'SELECT * FROM audit_logs',
        avgTime: 200,
        calls: 10,
        totalTime: 2000,
        maxTime: 500,
        isWeddingRelated: false,
        optimization: {} as any,
      };

      const priority = (optimizer as any).calculateQueryPriority(
        mockQuery,
        false,
      );

      expect(priority).toBe('low');
    });

    it('should consider total impact for priority calculation', () => {
      const highImpactQuery: SlowQuery = {
        queryHash: 'hash1',
        query: 'SELECT * FROM clients',
        avgTime: 300, // Moderate time
        calls: 10000, // Very high calls
        totalTime: 3000000, // Very high total impact
        maxTime: 1000,
        isWeddingRelated: false,
        optimization: {} as any,
      };

      const priority = (optimizer as any).calculateQueryPriority(
        highImpactQuery,
        false,
      );

      expect(priority).toBe('critical'); // High total impact should elevate priority
    });
  });

  describe('Execution Plan Analysis', () => {
    it('should parse execution plan correctly', () => {
      const mockPlan = {
        Plan: {
          'Node Type': 'Seq Scan',
          'Relation Name': 'form_responses',
          'Total Cost': 1000,
          'Plan Rows': 5000,
          'Plan Width': 100,
          'Actual Total Time': 1500,
          'Actual Rows': 4800,
          Plans: [
            {
              'Node Type': 'Index Scan',
              'Relation Name': 'form_responses_pkey',
              'Total Cost': 100,
              'Plan Rows': 1,
              'Plan Width': 8,
              'Actual Total Time': 0.1,
              'Actual Rows': 1,
              Plans: [],
            },
          ],
        },
      };

      const parsedPlan = (optimizer as any).parseExecutionPlan(mockPlan);

      expect(parsedPlan).toHaveLength(1);
      expect(parsedPlan[0].nodeType).toBe('Seq Scan');
      expect(parsedPlan[0].relationName).toBe('form_responses');
      expect(parsedPlan[0].children).toHaveLength(1);
      expect(parsedPlan[0].children[0].nodeType).toBe('Index Scan');
    });

    it('should identify sequential scans needing indexes', () => {
      const mockPlan = [
        {
          nodeType: 'Seq Scan',
          relationName: 'form_responses',
          cost: 1000,
          rows: 5000,
          width: 100,
          actualTime: 1500,
          actualRows: 4800,
          children: [],
        },
      ];

      const suggestions: any[] = [];
      (optimizer as any).findSequentialScans(mockPlan, suggestions);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'missing_index',
          impact: 'critical', // form_responses is wedding-critical
          description: expect.stringContaining(
            'Sequential scan on form_responses',
          ),
        }),
      );
    });

    it('should detect expensive joins', () => {
      const mockPlan = [
        {
          nodeType: 'Nested Loop',
          relationName: undefined,
          cost: 2000,
          rows: 1000,
          width: 200,
          actualTime: 2500, // Expensive
          actualRows: 950,
          children: [],
        },
      ];

      const suggestions: any[] = [];
      (optimizer as any).analyzeJoinEfficiency(mockPlan, suggestions);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'join_optimization',
          impact: 'high',
          description: expect.stringContaining('Nested loop join is expensive'),
        }),
      );
    });
  });

  describe('Wedding-Specific Optimizations', () => {
    it('should recommend wedding season optimizations', () => {
      // Mock wedding season (June)
      const mockDate = new Date('2024-06-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const suggestions: any[] = [];
      const queryText = 'SELECT * FROM form_responses WHERE created_at > $1';

      (optimizer as any).addWeddingSpecificOptimizations(
        queryText,
        suggestions,
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'query_rewrite',
          description: expect.stringContaining('Wedding season detected'),
          estimatedImprovement: '30-50% faster during peak wedding season',
        }),
      );
    });

    it('should optimize photo/media queries for wedding galleries', () => {
      const suggestions: any[] = [];
      const queryText =
        'SELECT * FROM photo_uploads WHERE client_id = $1 ORDER BY created_at DESC';

      (optimizer as any).addWeddingSpecificOptimizations(
        queryText,
        suggestions,
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'query_rewrite',
          description: expect.stringContaining(
            'Media queries should use CDN-friendly patterns',
          ),
          estimatedImprovement: '40-60% faster media loading',
        }),
      );
    });
  });

  describe('Implementation Plan Generation', () => {
    it('should create implementation steps for index optimizations', () => {
      const suggestions = [
        {
          type: 'missing_index' as const,
          description: 'Create index on form_id',
          impact: 'high' as const,
          estimatedImprovement: '70% faster',
          action:
            'CREATE INDEX CONCURRENTLY idx_form_responses_form_id ON form_responses(form_id)',
          implementationComplexity: 'easy' as const,
        },
      ];

      const plan = (optimizer as any).createImplementationPlan(suggestions);

      expect(plan).toHaveLength(1);
      expect(plan[0]).toEqual(
        expect.objectContaining({
          step: 1,
          action: suggestions[0].action,
          estimatedTime: '2-5 minutes',
          riskLevel: 'low',
        }),
      );
    });

    it('should create implementation steps for query rewrites', () => {
      const suggestions = [
        {
          type: 'query_rewrite' as const,
          description: 'Rewrite N+1 pattern',
          impact: 'high' as const,
          estimatedImprovement: '80% fewer queries',
          action: 'Use JOIN instead of multiple queries',
          implementationComplexity: 'medium' as const,
        },
      ];

      const plan = (optimizer as any).createImplementationPlan(suggestions);

      expect(plan).toHaveLength(1);
      expect(plan[0]).toEqual(
        expect.objectContaining({
          step: 1,
          action: suggestions[0].action,
          estimatedTime: '30-60 minutes',
          riskLevel: 'medium',
        }),
      );
    });
  });

  describe('Performance Impact Calculation', () => {
    it('should calculate potential improvement correctly', () => {
      const criticalSuggestions = [
        { impact: 'critical', type: 'missing_index' },
        { impact: 'high', type: 'n_plus_one' },
      ];

      const improvement = (optimizer as any).calculatePotentialImprovement(
        criticalSuggestions,
      );
      expect(improvement).toBe('70-90%');

      const mediumSuggestions = [
        { impact: 'medium', type: 'select_optimization' },
      ];

      const mediumImprovement = (
        optimizer as any
      ).calculatePotentialImprovement(mediumSuggestions);
      expect(improvement).toBe('70-90%');

      const noSuggestions: any[] = [];
      const noImprovement = (optimizer as any).calculatePotentialImprovement(
        noSuggestions,
      );
      expect(noImprovement).toBe('10-20%');
    });
  });

  describe('Index Analysis', () => {
    it('should perform comprehensive index analysis', async () => {
      // Mock unused indexes query
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            schemaname: 'public',
            tablename: 'old_table',
            indexname: 'unused_idx',
            size_bytes: 10485760, // 10MB
            idx_scan: 2,
            idx_tup_read: 0,
            idx_tup_fetch: 0,
          },
        ],
        error: null,
      });

      const analysis = await optimizer.performIndexAnalysis();

      expect(analysis.unusedIndexes).toHaveLength(1);
      expect(analysis.unusedIndexes[0]).toEqual(
        expect.objectContaining({
          schemaName: 'public',
          tableName: 'old_table',
          indexName: 'unused_idx',
          sizeBytes: 10485760,
          maintenanceCost: 'Medium', // 10MB index
        }),
      );
    });

    it('should categorize maintenance cost correctly', () => {
      const smallIndex = (optimizer as any).calculateMaintenanceCost(
        5 * 1024 * 1024,
      ); // 5MB
      expect(smallIndex).toBe('Low');

      const mediumIndex = (optimizer as any).calculateMaintenanceCost(
        50 * 1024 * 1024,
      ); // 50MB
      expect(mediumIndex).toBe('Medium');

      const largeIndex = (optimizer as any).calculateMaintenanceCost(
        500 * 1024 * 1024,
      ); // 500MB
      expect(largeIndex).toBe('High');
    });
  });

  describe('Query Sanitization', () => {
    it('should sanitize query text for display', () => {
      const query =
        'SELECT * FROM clients WHERE id = $1 AND name = $2 AND email LIKE $3';
      const sanitized = (optimizer as any).sanitizeQuery(query);

      expect(sanitized).toBe(
        'SELECT * FROM clients WHERE id = ? AND name = ? AND email LIKE ?',
      );
    });

    it('should limit query length', () => {
      const longQuery =
        'SELECT * FROM table WHERE ' + 'column = value AND '.repeat(100);
      const sanitized = (optimizer as any).sanitizeQuery(longQuery);

      expect(sanitized.length).toBeLessThanOrEqual(503); // 500 + '...'
      expect(sanitized.endsWith('...')).toBe(true);
    });
  });
});
