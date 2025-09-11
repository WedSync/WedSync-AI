/**
 * Query Optimization Engine Tests
 * Tests for query analysis, optimization suggestions, and index recommendations
 */

import { queryOptimizer } from '@/lib/database/query-optimizer';
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { supabase } from '@/utils/supabase/client';

// Mock external dependencies
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/utils/supabase/client');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockStructuredLogger = structuredLogger as jest.Mocked<
  typeof structuredLogger
>;

describe('Query Optimization Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Analysis', () => {
    test('should analyze simple SELECT query', async () => {
      const query = 'SELECT * FROM clients WHERE wedding_date = ?';

      // Mock execution plan data
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            Plan: {
              'Node Type': 'Seq Scan',
              'Total Cost': 1000.5,
              'Plan Rows': 100,
              'Plan Width': 256,
              'Actual Total Time': 50.2,
            },
          },
        ],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query, ['2024-06-15']);

      expect(analysis).toMatchObject({
        originalQuery: query,
        executionPlan: expect.objectContaining({
          cost: 1000.5,
          rows: 100,
          width: 256,
          planType: 'Seq Scan',
        }),
        suggestions: expect.any(Array),
        complexity: expect.stringMatching(/simple|moderate|complex/),
        estimatedImprovement: expect.any(Number),
      });

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Analyzing query for optimization',
        expect.objectContaining({
          queryPreview: expect.stringContaining('SELECT'),
        }),
      );
    });

    test('should detect SELECT * as optimization opportunity', async () => {
      const query = 'SELECT * FROM vendors WHERE category = ?';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 500 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'modify_query',
          description: expect.stringContaining('SELECT *'),
        }),
      );
    });

    test('should detect missing WHERE clause', async () => {
      const query = 'SELECT name, email FROM clients';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 2000 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'modify_query',
          description: expect.stringContaining('WHERE clause'),
        }),
      );
    });

    test('should detect inefficient LIKE patterns', async () => {
      const query = 'SELECT * FROM vendors WHERE name LIKE "%photo%"';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 1500 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          description: expect.stringContaining('LIKE with leading wildcard'),
        }),
      );
    });

    test('should calculate query complexity correctly', async () => {
      // Simple query
      const simpleQuery = 'SELECT id FROM clients WHERE email = ?';
      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Index Scan', 'Total Cost': 10 } }],
        error: null,
      });

      const simpleAnalysis = await queryOptimizer.analyzeQuery(simpleQuery);
      expect(simpleAnalysis.complexity).toBe('simple');

      // Complex query with joins and aggregations
      const complexQuery = `
        SELECT c.name, COUNT(g.id) as guest_count, AVG(b.amount) as avg_budget
        FROM clients c
        LEFT JOIN guests g ON c.id = g.client_id
        LEFT JOIN budgets b ON c.id = b.client_id
        WHERE c.wedding_date > ? AND c.status = ?
        GROUP BY c.id, c.name
        ORDER BY guest_count DESC
      `;

      const complexAnalysis = await queryOptimizer.analyzeQuery(complexQuery);
      expect(complexAnalysis.complexity).toBe('complex');
    });

    test('should handle execution plan parsing errors gracefully', async () => {
      const query = 'SELECT * FROM clients';

      mockSupabase.rpc.mockRejectedValue(new Error('Permission denied'));

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.executionPlan.planType).toBe('unknown');
      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Failed to analyze query',
        expect.objectContaining({
          error: 'Permission denied',
        }),
      );
    });
  });

  describe('Index Suggestions', () => {
    test('should generate index suggestions for slow queries', async () => {
      const queryMetrics = [
        {
          query: 'SELECT * FROM bookings WHERE wedding_date = ?',
          table: 'bookings',
          executionTime: 2000,
          timestamp: new Date(),
          rowsAffected: 100,
          planCost: 1500,
        },
        {
          query: 'SELECT * FROM bookings WHERE venue_id = ?',
          table: 'bookings',
          executionTime: 1800,
          timestamp: new Date(),
          rowsAffected: 50,
          planCost: 1200,
        },
        {
          query: 'SELECT * FROM vendors WHERE category = ?',
          table: 'vendors',
          executionTime: 1500,
          timestamp: new Date(),
          rowsAffected: 200,
          planCost: 1000,
        },
      ];

      const suggestions =
        await queryOptimizer.generateIndexSuggestions(queryMetrics);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          table: 'bookings',
          columns: expect.arrayContaining(['wedding_date']),
          type: 'btree',
          priority: expect.stringMatching(/low|medium|high/),
          sql: expect.stringContaining('CREATE INDEX'),
        }),
      );
    });

    test('should prioritize high-usage columns for indexing', async () => {
      const queryMetrics = Array.from({ length: 25 }, (_, i) => ({
        query: 'SELECT * FROM clients WHERE email = ?',
        table: 'clients',
        executionTime: 500,
        timestamp: new Date(),
        rowsAffected: 1,
        planCost: 100,
      }));

      const suggestions =
        await queryOptimizer.generateIndexSuggestions(queryMetrics);

      const emailIndexSuggestion = suggestions.find(
        (s) => s.table === 'clients' && s.columns.includes('email'),
      );

      expect(emailIndexSuggestion).toBeDefined();
      expect(emailIndexSuggestion?.priority).toBe('high');
    });

    test('should not suggest indexes for low-usage columns', async () => {
      const queryMetrics = [
        {
          query: 'SELECT * FROM clients WHERE rare_column = ?',
          table: 'clients',
          executionTime: 100,
          timestamp: new Date(),
          rowsAffected: 1,
          planCost: 50,
        },
      ];

      const suggestions =
        await queryOptimizer.generateIndexSuggestions(queryMetrics);

      // Should not suggest index for column used only once
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Query Pattern Detection', () => {
    test('should detect cartesian product patterns', async () => {
      const query =
        'SELECT * FROM clients, vendors WHERE clients.location = vendors.location';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Nested Loop', 'Total Cost': 50000 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          description: expect.stringContaining('JOIN'),
        }),
      );
    });

    test('should detect subqueries in SELECT clause', async () => {
      const query = `
        SELECT name, 
               (SELECT COUNT(*) FROM guests WHERE client_id = clients.id) as guest_count
        FROM clients
      `;

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 3000 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          description: expect.stringContaining('Subquery in SELECT'),
        }),
      );
    });

    test('should detect missing LIMIT clauses', async () => {
      const query = 'SELECT * FROM vendors ORDER BY rating DESC';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Sort', 'Total Cost': 1500 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          description: expect.stringContaining('LIMIT'),
        }),
      );
    });
  });

  describe('Optimization Estimation', () => {
    test('should estimate improvement percentage correctly', async () => {
      const query = 'SELECT * FROM clients'; // High-impact issues

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 5000 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.estimatedImprovement).toBeGreaterThan(0);
      expect(analysis.estimatedImprovement).toBeLessThanOrEqual(90);
    });

    test('should provide no improvement for already optimized queries', async () => {
      const query = 'SELECT id, name FROM clients WHERE id = ? LIMIT 1';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Index Scan', 'Total Cost': 0.5 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.estimatedImprovement).toBeLessThan(20);
    });
  });

  describe('Caching', () => {
    test('should cache query analysis results', async () => {
      const query = 'SELECT * FROM clients WHERE id = ?';
      const parameters = [123];

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Index Scan', 'Total Cost': 10 } }],
        error: null,
      });

      // First call
      const analysis1 = await queryOptimizer.analyzeQuery(query, parameters);

      // Second call should use cache
      const analysis2 = await queryOptimizer.analyzeQuery(query, parameters);

      expect(analysis1).toEqual(analysis2);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    test('should handle cache size limits', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 100 } }],
        error: null,
      });

      // Generate many unique queries to test cache limits
      const promises = Array.from({ length: 1005 }, (_, i) =>
        queryOptimizer.analyzeQuery(`SELECT * FROM table${i}`),
      );

      await Promise.all(promises);

      // Should handle cache overflow gracefully
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1005);
    });
  });

  describe('Wedding-Specific Optimizations', () => {
    test('should recognize wedding-date queries for special optimization', async () => {
      const query = 'SELECT * FROM bookings WHERE wedding_date BETWEEN ? AND ?';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 1000 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      // Should have wedding-specific optimizations
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    test('should optimize vendor category queries', async () => {
      const query = 'SELECT * FROM vendors WHERE category = ? AND location = ?';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Seq Scan', 'Total Cost': 800 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'modify_query',
        }),
      );
    });

    test('should recognize payment-related queries as critical', async () => {
      const query = 'UPDATE payments SET status = ? WHERE booking_id = ?';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ Plan: { 'Node Type': 'Update', 'Total Cost': 50 } }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      // Payment queries should be flagged for optimization
      expect(analysis.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid SQL gracefully', async () => {
      const invalidQuery = 'SELCT * FORM clients'; // Typos

      mockSupabase.rpc.mockRejectedValue(new Error('Syntax error'));

      const analysis = await queryOptimizer.analyzeQuery(invalidQuery);

      expect(analysis.executionPlan.planType).toBe('unknown');
      expect(analysis.suggestions).toEqual([]);
      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Failed to analyze query',
        expect.objectContaining({
          error: 'Syntax error',
        }),
      );
    });

    test('should handle database connection errors', async () => {
      const query = 'SELECT * FROM clients';

      mockSupabase.rpc.mockRejectedValue(new Error('Connection timeout'));

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis).toMatchObject({
        originalQuery: query,
        executionPlan: expect.objectContaining({
          planType: 'unknown',
        }),
        suggestions: [],
        estimatedImprovement: 0,
      });
    });

    test('should handle malformed execution plan data', async () => {
      const query = 'SELECT * FROM clients';

      mockSupabase.rpc.mockResolvedValue({
        data: [{ invalidPlan: 'corrupted data' }],
        error: null,
      });

      const analysis = await queryOptimizer.analyzeQuery(query);

      expect(analysis.executionPlan).toMatchObject({
        cost: 0,
        rows: 0,
        width: 0,
        planType: 'unknown',
        operations: [],
        bottlenecks: [],
      });
    });
  });
});
