/**
 * Database Query Optimizer - WS-173 Backend Performance Optimization
 * Team B - Round 1 Implementation
 * Analyzes SQL queries, suggests optimizations, and monitors database performance
 */

import { createClient } from '@/lib/supabase/server';
import { metricsTracker } from '@/lib/performance/metrics-tracker';
import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';

export interface QueryAnalysis {
  query: string;
  estimatedCost: number;
  actualCost?: number;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexesUsed: string[];
  suggestedIndexes: string[];
  optimizations: QueryOptimization[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QueryOptimization {
  type: 'index' | 'rewrite' | 'limit' | 'join' | 'where' | 'select';
  description: string;
  suggestedQuery?: string;
  expectedImprovement: string;
  priority: number;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  indexType: 'btree' | 'gin' | 'gist' | 'hash';
  unique: boolean;
  partial?: string;
  estimated_improvement: number;
  usage_frequency: number;
}

export interface QueryPattern {
  pattern: string;
  frequency: number;
  averageExecutionTime: number;
  tables: string[];
  operations: string[];
  lastSeen: Date;
}

export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private slowQueries: QueryAnalysis[] = [];

  // Performance thresholds
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly CRITICAL_QUERY_THRESHOLD = 5000; // 5 seconds
  private static readonly HIGH_ROW_SCAN_THRESHOLD = 10000; // 10k rows

  // Wedding-specific table relationships for join optimization
  private static readonly TABLE_RELATIONSHIPS = {
    clients: ['organizations', 'budget_items', 'client_tasks'],
    tasks: ['organizations', 'client_tasks', 'task_assignments'],
    budget_items: ['clients', 'budget_categories', 'vendors'],
    vendors: ['organizations', 'budget_items'],
    analytics_events: ['user_profiles', 'organizations', 'clients'],
  };

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Analyze a SQL query for performance optimization
   */
  async analyzeQuery(
    query: string,
    params: any[] = [],
    context: {
      organizationId?: string;
      userId?: string;
      endpoint?: string;
    } = {},
  ): Promise<QueryAnalysis> {
    const startTime = Date.now();
    const normalizedQuery = this.normalizeQuery(query);

    try {
      const supabase = await createClient();

      // Get query execution plan
      const explainResult = await this.getExecutionPlan(
        query,
        params,
        supabase,
      );

      // Analyze the execution plan
      const analysis = await this.parseExecutionPlan(
        explainResult,
        normalizedQuery,
      );

      // Track query pattern
      this.trackQueryPattern(normalizedQuery, analysis);

      // Generate optimizations
      analysis.optimizations = await this.generateOptimizations(analysis);

      // Determine severity
      analysis.severity = this.determineSeverity(analysis);

      // Store slow queries for review
      if (analysis.executionTime > QueryOptimizer.SLOW_QUERY_THRESHOLD) {
        this.slowQueries.push(analysis);
        this.slowQueries = this.slowQueries.slice(-100); // Keep last 100
      }

      // Track metrics
      await metricsTracker.trackDatabaseQuery(
        normalizedQuery,
        analysis.executionTime,
        analysis.rowsReturned,
        this.extractTableNames(query)[0] || 'unknown',
      );

      return analysis;
    } catch (error) {
      console.error('Query analysis failed:', error);

      // Return basic analysis even if detailed analysis fails
      const executionTime = Date.now() - startTime;
      return {
        query: normalizedQuery,
        estimatedCost: 0,
        executionTime,
        rowsExamined: 0,
        rowsReturned: 0,
        indexesUsed: [],
        suggestedIndexes: [],
        optimizations: [],
        severity: 'low',
      };
    }
  }

  /**
   * Get comprehensive index suggestions for the database
   */
  async getIndexSuggestions(
    tableFilter?: string[],
    minFrequency: number = 5,
  ): Promise<IndexSuggestion[]> {
    const cacheKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'index_suggestions',
      tableFilter?.join('_') || 'all',
      minFrequency.toString(),
    );

    // Check cache first
    const cached = await CacheService.get<IndexSuggestion[]>(cacheKey);
    if (cached) return cached;

    const suggestions: IndexSuggestion[] = [];

    try {
      // Analyze query patterns for index opportunities
      const patterns = Array.from(this.queryPatterns.values())
        .filter((p) => p.frequency >= minFrequency)
        .filter(
          (p) => !tableFilter || p.tables.some((t) => tableFilter.includes(t)),
        );

      // Wedding-specific index suggestions based on common queries
      const commonIndexes = await this.getWeddingSpecificIndexes();
      suggestions.push(...commonIndexes);

      // Analyze WHERE clause patterns
      const whereClauseIndexes =
        await this.analyzeWhereClausePatterns(patterns);
      suggestions.push(...whereClauseIndexes);

      // Analyze JOIN patterns
      const joinIndexes = await this.analyzeJoinPatterns(patterns);
      suggestions.push(...joinIndexes);

      // Analyze ORDER BY patterns
      const orderByIndexes = await this.analyzeOrderByPatterns(patterns);
      suggestions.push(...orderByIndexes);

      // Remove duplicates and sort by estimated improvement
      const uniqueSuggestions = this.deduplicateIndexSuggestions(
        suggestions,
      ).sort((a, b) => b.estimated_improvement - a.estimated_improvement);

      // Cache results for 1 hour
      await CacheService.set(cacheKey, uniqueSuggestions, CACHE_TTL.LONG);

      return uniqueSuggestions;
    } catch (error) {
      console.error('Failed to generate index suggestions:', error);
      return suggestions;
    }
  }

  /**
   * Generate optimized query suggestions
   */
  async optimizeQuery(
    query: string,
    context: any = {},
  ): Promise<{
    originalQuery: string;
    optimizedQuery: string;
    optimizations: QueryOptimization[];
    expectedImprovement: string;
  }> {
    const analysis = await this.analyzeQuery(query, [], context);
    const optimizations = analysis.optimizations;

    let optimizedQuery = query;
    const appliedOptimizations: QueryOptimization[] = [];

    // Apply optimizations in priority order
    for (const opt of optimizations.sort((a, b) => b.priority - a.priority)) {
      if (opt.suggestedQuery && opt.priority >= 7) {
        optimizedQuery = opt.suggestedQuery;
        appliedOptimizations.push(opt);
      }
    }

    // Calculate expected improvement
    const expectedImprovement =
      appliedOptimizations.length > 0
        ? `${appliedOptimizations.length} optimizations applied`
        : 'No significant optimizations found';

    return {
      originalQuery: query,
      optimizedQuery,
      optimizations: appliedOptimizations,
      expectedImprovement,
    };
  }

  /**
   * Get slow query report
   */
  async getSlowQueryReport(limit: number = 20): Promise<{
    queries: QueryAnalysis[];
    summary: {
      totalSlowQueries: number;
      averageExecutionTime: number;
      mostCommonTables: Array<{ table: string; count: number }>;
      criticalQueries: number;
    };
  }> {
    const sortedQueries = [...this.slowQueries]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);

    // Generate summary statistics
    const totalSlowQueries = this.slowQueries.length;
    const averageExecutionTime =
      totalSlowQueries > 0
        ? this.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          totalSlowQueries
        : 0;

    // Count table frequency
    const tableCount = new Map<string, number>();
    this.slowQueries.forEach((query) => {
      const tables = this.extractTableNames(query.query);
      tables.forEach((table) => {
        tableCount.set(table, (tableCount.get(table) || 0) + 1);
      });
    });

    const mostCommonTables = Array.from(tableCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([table, count]) => ({ table, count }));

    const criticalQueries = this.slowQueries.filter(
      (q) => q.severity === 'critical',
    ).length;

    return {
      queries: sortedQueries,
      summary: {
        totalSlowQueries,
        averageExecutionTime,
        mostCommonTables,
        criticalQueries,
      },
    };
  }

  /**
   * Monitor query performance over time
   */
  async getQueryPerformanceTrends(
    timeRange: '1h' | '24h' | '7d' = '24h',
  ): Promise<{
    averageExecutionTime: Array<{ timestamp: string; value: number }>;
    queryCount: Array<{ timestamp: string; value: number }>;
    slowQueryRate: Array<{ timestamp: string; value: number }>;
    topSlowTables: Array<{ table: string; avgTime: number; count: number }>;
  }> {
    // This would typically query a time-series database or log aggregation system
    // For now, return sample data structure
    const mockTrends = {
      averageExecutionTime: [],
      queryCount: [],
      slowQueryRate: [],
      topSlowTables: [],
    };

    return mockTrends;
  }

  // Private methods

  private async getExecutionPlan(
    query: string,
    params: any[],
    supabase: any,
  ): Promise<any> {
    try {
      // Use EXPLAIN ANALYZE for detailed execution statistics
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const { data, error } = await supabase.rpc('explain_query', {
        query_text: explainQuery,
        query_params: params,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback to basic EXPLAIN if ANALYZE fails
      try {
        const explainQuery = `EXPLAIN (FORMAT JSON) ${query}`;
        const { data } = await supabase.rpc('explain_query', {
          query_text: explainQuery,
        });
        return data;
      } catch (fallbackError) {
        console.warn(
          'Both EXPLAIN ANALYZE and EXPLAIN failed:',
          error,
          fallbackError,
        );
        return null;
      }
    }
  }

  private async parseExecutionPlan(
    explainResult: any,
    query: string,
  ): Promise<QueryAnalysis> {
    // Parse PostgreSQL EXPLAIN output
    const plan = explainResult?.[0]?.Plan || {};

    return {
      query,
      estimatedCost: plan['Total Cost'] || 0,
      actualCost: plan['Actual Total Time'] || undefined,
      executionTime: plan['Actual Total Time'] || 0,
      rowsExamined: plan['Actual Rows'] || 0,
      rowsReturned: plan['Actual Rows'] || 0,
      indexesUsed: this.extractIndexesFromPlan(plan),
      suggestedIndexes: [],
      optimizations: [],
      severity: 'low',
    };
  }

  private extractIndexesFromPlan(plan: any): string[] {
    const indexes: string[] = [];

    function traverse(node: any) {
      if (
        node['Node Type'] === 'Index Scan' ||
        node['Node Type'] === 'Index Only Scan'
      ) {
        const indexName = node['Index Name'];
        if (indexName && !indexes.includes(indexName)) {
          indexes.push(indexName);
        }
      }

      if (node.Plans) {
        node.Plans.forEach(traverse);
      }
    }

    traverse(plan);
    return indexes;
  }

  private async generateOptimizations(
    analysis: QueryAnalysis,
  ): Promise<QueryOptimization[]> {
    const optimizations: QueryOptimization[] = [];
    const tables = this.extractTableNames(analysis.query);

    // Check for missing indexes
    if (analysis.rowsExamined > QueryOptimizer.HIGH_ROW_SCAN_THRESHOLD) {
      optimizations.push({
        type: 'index',
        description: 'High number of rows examined suggests missing index',
        expectedImprovement: '60-90% faster execution',
        priority: 9,
      });
    }

    // Check for SELECT * usage
    if (analysis.query.includes('SELECT *')) {
      const suggestedColumns = await this.suggestSpecificColumns(tables);
      optimizations.push({
        type: 'select',
        description: 'Avoid SELECT * - specify only needed columns',
        suggestedQuery: analysis.query.replace(
          'SELECT *',
          `SELECT ${suggestedColumns}`,
        ),
        expectedImprovement: '20-40% faster execution, reduced bandwidth',
        priority: 7,
      });
    }

    // Check for missing LIMIT on large tables
    if (
      !analysis.query.includes('LIMIT') &&
      tables.some((t) => this.isLargeTable(t))
    ) {
      optimizations.push({
        type: 'limit',
        description: 'Add LIMIT clause when not all rows are needed',
        expectedImprovement: '50-80% faster execution for large result sets',
        priority: 8,
      });
    }

    // Check for inefficient JOINs
    if (analysis.query.includes('JOIN') && analysis.executionTime > 1000) {
      optimizations.push({
        type: 'join',
        description: 'Consider optimizing JOIN order and conditions',
        expectedImprovement: '30-50% faster execution',
        priority: 6,
      });
    }

    return optimizations;
  }

  private determineSeverity(
    analysis: QueryAnalysis,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (analysis.executionTime > QueryOptimizer.CRITICAL_QUERY_THRESHOLD) {
      return 'critical';
    }
    if (analysis.executionTime > QueryOptimizer.SLOW_QUERY_THRESHOLD * 2) {
      return 'high';
    }
    if (analysis.executionTime > QueryOptimizer.SLOW_QUERY_THRESHOLD) {
      return 'medium';
    }
    return 'low';
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace parameterized queries
      .replace(/'\s*[^']*\s*'/g, "'?'") // Replace string literals
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private trackQueryPattern(
    normalizedQuery: string,
    analysis: QueryAnalysis,
  ): void {
    const pattern = this.queryPatterns.get(normalizedQuery) || {
      pattern: normalizedQuery,
      frequency: 0,
      averageExecutionTime: 0,
      tables: this.extractTableNames(normalizedQuery),
      operations: this.extractOperations(normalizedQuery),
      lastSeen: new Date(),
    };

    pattern.frequency++;
    pattern.averageExecutionTime =
      (pattern.averageExecutionTime * (pattern.frequency - 1) +
        analysis.executionTime) /
      pattern.frequency;
    pattern.lastSeen = new Date();

    this.queryPatterns.set(normalizedQuery, pattern);
  }

  private extractTableNames(query: string): string[] {
    const tables: string[] = [];
    const fromMatches = query.match(/FROM\s+(\w+)/gi) || [];
    const joinMatches = query.match(/JOIN\s+(\w+)/gi) || [];
    const updateMatches = query.match(/UPDATE\s+(\w+)/gi) || [];
    const insertMatches = query.match(/INTO\s+(\w+)/gi) || [];

    const allMatches = [
      ...fromMatches,
      ...joinMatches,
      ...updateMatches,
      ...insertMatches,
    ];
    allMatches.forEach((match) => {
      const tableName = match.split(/\s+/)[1]?.toLowerCase();
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    });

    return tables;
  }

  private extractOperations(query: string): string[] {
    const operations: string[] = [];
    const upperQuery = query.toUpperCase();

    if (upperQuery.includes('SELECT')) operations.push('SELECT');
    if (upperQuery.includes('INSERT')) operations.push('INSERT');
    if (upperQuery.includes('UPDATE')) operations.push('UPDATE');
    if (upperQuery.includes('DELETE')) operations.push('DELETE');
    if (upperQuery.includes('JOIN')) operations.push('JOIN');
    if (upperQuery.includes('GROUP BY')) operations.push('GROUP_BY');
    if (upperQuery.includes('ORDER BY')) operations.push('ORDER_BY');

    return operations;
  }

  private async getWeddingSpecificIndexes(): Promise<IndexSuggestion[]> {
    // Common indexes needed for wedding management operations
    return [
      {
        table: 'clients',
        columns: ['organization_id', 'wedding_date'],
        indexType: 'btree',
        unique: false,
        estimated_improvement: 0.8,
        usage_frequency: 50,
      },
      {
        table: 'clients',
        columns: ['email'],
        indexType: 'btree',
        unique: true,
        estimated_improvement: 0.9,
        usage_frequency: 30,
      },
      {
        table: 'budget_items',
        columns: ['client_id'],
        indexType: 'btree',
        unique: false,
        estimated_improvement: 0.85,
        usage_frequency: 40,
      },
      {
        table: 'tasks',
        columns: ['organization_id', 'status', 'due_date'],
        indexType: 'btree',
        unique: false,
        estimated_improvement: 0.75,
        usage_frequency: 35,
      },
      {
        table: 'analytics_events',
        columns: ['created_at'],
        indexType: 'btree',
        unique: false,
        estimated_improvement: 0.7,
        usage_frequency: 25,
      },
    ];
  }

  private async analyzeWhereClausePatterns(
    patterns: QueryPattern[],
  ): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    // Analyze common WHERE clause patterns
    patterns.forEach((pattern) => {
      if (pattern.frequency >= 5 && pattern.averageExecutionTime > 500) {
        // Extract WHERE conditions (simplified analysis)
        const whereMatch = pattern.pattern.match(
          /WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i,
        );
        if (whereMatch) {
          const whereClause = whereMatch[1];
          const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g) || [];

          columnMatches.forEach((match) => {
            const column = match.split(/\s*[=<>]/)[0];
            pattern.tables.forEach((table) => {
              suggestions.push({
                table,
                columns: [column],
                indexType: 'btree',
                unique: false,
                estimated_improvement: 0.6,
                usage_frequency: pattern.frequency,
              });
            });
          });
        }
      }
    });

    return suggestions;
  }

  private async analyzeJoinPatterns(
    patterns: QueryPattern[],
  ): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    patterns.forEach((pattern) => {
      if (pattern.operations.includes('JOIN') && pattern.frequency >= 3) {
        // Common foreign key relationships need indexes
        pattern.tables.forEach((table) => {
          const relatedTables = QueryOptimizer.TABLE_RELATIONSHIPS[table] || [];
          relatedTables.forEach((relatedTable) => {
            suggestions.push({
              table,
              columns: [`${relatedTable.slice(0, -1)}_id`], // Convert plural to singular + _id
              indexType: 'btree',
              unique: false,
              estimated_improvement: 0.65,
              usage_frequency: pattern.frequency,
            });
          });
        });
      }
    });

    return suggestions;
  }

  private async analyzeOrderByPatterns(
    patterns: QueryPattern[],
  ): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    patterns.forEach((pattern) => {
      if (pattern.operations.includes('ORDER_BY') && pattern.frequency >= 3) {
        const orderByMatch = pattern.pattern.match(/ORDER\s+BY\s+([^,\s]+)/i);
        if (orderByMatch) {
          const column = orderByMatch[1];
          pattern.tables.forEach((table) => {
            suggestions.push({
              table,
              columns: [column],
              indexType: 'btree',
              unique: false,
              estimated_improvement: 0.5,
              usage_frequency: pattern.frequency,
            });
          });
        }
      }
    });

    return suggestions;
  }

  private deduplicateIndexSuggestions(
    suggestions: IndexSuggestion[],
  ): IndexSuggestion[] {
    const uniqueMap = new Map<string, IndexSuggestion>();

    suggestions.forEach((suggestion) => {
      const key = `${suggestion.table}:${suggestion.columns.join(',')}:${suggestion.indexType}`;
      const existing = uniqueMap.get(key);

      if (!existing || suggestion.usage_frequency > existing.usage_frequency) {
        uniqueMap.set(key, suggestion);
      }
    });

    return Array.from(uniqueMap.values());
  }

  private async suggestSpecificColumns(tables: string[]): Promise<string> {
    // Return commonly needed columns for each table type
    const columnSuggestions = {
      clients: 'id, first_name, last_name, email, wedding_date, status',
      tasks: 'id, title, status, priority, due_date, organization_id',
      budget_items:
        'id, client_id, name, planned_amount, actual_amount, status',
      vendors: 'id, name, category, organization_id, status',
      analytics_events: 'id, event_type, created_at, user_id, organization_id',
    };

    return tables.map((table) => columnSuggestions[table] || 'id').join(', ');
  }

  private isLargeTable(table: string): boolean {
    // Tables that typically grow large in wedding management systems
    const largeTables = [
      'analytics_events',
      'notifications',
      'budget_transactions',
      'audit_logs',
    ];
    return largeTables.includes(table);
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance();

// Middleware for automatic query analysis
export function withQueryOptimization<
  T extends (...args: any[]) => Promise<any>,
>(queryFn: T, context: { table?: string; operation?: string } = {}): T {
  return (async (...args: any[]) => {
    // Extract query if it's a Supabase query builder
    const query = args[0]?.toString?.() || 'unknown';

    if (query !== 'unknown' && query.length > 20) {
      // Analyze query in background
      process.nextTick(async () => {
        try {
          await queryOptimizer.analyzeQuery(query, [], context);
        } catch (error) {
          console.warn('Background query analysis failed:', error);
        }
      });
    }

    return queryFn(...args);
  }) as T;
}
