/**
 * WS-234 Query Performance Tracking System - Team C
 * Advanced query performance monitoring with slow query detection, optimization suggestions,
 * and wedding day protection measures
 *
 * Key Features:
 * - Real-time query execution tracking
 * - Intelligent slow query detection and analysis
 * - Query optimization recommendations
 * - Performance trend analysis
 * - Wedding day query protection
 * - Automatic query plan analysis
 * - Resource impact assessment
 */

import { databaseHealthMonitor, trackDatabaseQuery } from './health-monitor';
import { logger } from '@/lib/monitoring/structured-logger';
import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format, subDays, startOfHour, endOfHour } from 'date-fns';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface QueryExecution {
  id: string;
  query: string;
  normalizedQuery: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata: {
    organization?: string;
    userId?: string;
    table: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'BULK';
    rowsAffected?: number;
    indexesUsed?: string[];
    cacheHit?: boolean;
    connectionPool?: string;
  };
  performance: {
    planningTime?: number;
    executionTime: number;
    bufferHits?: number;
    bufferMisses?: number;
    cpuTime?: number;
    ioWait?: number;
  };
  context: {
    endpoint?: string;
    userAgent?: string;
    ipAddress?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    weddingDayExecution: boolean;
  };
}

export interface QueryPattern {
  pattern: string;
  signature: string;
  table: string;
  operation: string;
  executionCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  errorRate: number;
  lastExecuted: Date;
  trendDirection: 'improving' | 'stable' | 'degrading';
  optimizationSuggestions: string[];
  indexRecommendations: string[];
  weddingDayImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface SlowQueryAnalysis {
  execution: QueryExecution;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'table_scan'
    | 'missing_index'
    | 'complex_join'
    | 'large_result'
    | 'lock_contention'
    | 'resource_limit';
  recommendations: QueryOptimization[];
  estimatedImpact: {
    userDelay: number; // milliseconds
    resourceUsage: number; // percentage
    concurrentUserImpact: number;
  };
}

export interface QueryOptimization {
  type:
    | 'index'
    | 'query_rewrite'
    | 'schema_change'
    | 'caching'
    | 'partitioning';
  suggestion: string;
  estimatedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  weddingDayCompatible: boolean;
}

export interface PerformanceTrend {
  timeWindow: '1h' | '24h' | '7d' | '30d';
  averageQueryTime: number[];
  slowQueryCount: number[];
  errorRate: number[];
  throughput: number[];
  timestamps: Date[];
  anomalies: PerformanceAnomaly[];
}

export interface PerformanceAnomaly {
  timestamp: Date;
  type: 'spike' | 'drop' | 'error_surge' | 'timeout';
  severity: number; // 0-10
  description: string;
  possibleCauses: string[];
  affectedQueries: string[];
}

// =====================================================
// QUERY PERFORMANCE TRACKER
// =====================================================

export class QueryPerformanceTracker {
  private static instance: QueryPerformanceTracker;
  private executions: QueryExecution[] = [];
  private patterns: Map<string, QueryPattern> = new Map();
  private slowQueries: Map<string, SlowQueryAnalysis> = new Map();
  private supabaseClient: SupabaseClient;

  // Configuration
  private readonly config = {
    slowQueryThreshold: {
      default: 1000, // 1 second
      weddingDay: 500, // 500ms on wedding days
      critical: 5000, // 5 seconds always critical
    },
    retentionPeriod: {
      executions: 7 * 24 * 60 * 60 * 1000, // 7 days
      patterns: 30 * 24 * 60 * 60 * 1000, // 30 days
      slowQueries: 24 * 60 * 60 * 1000, // 24 hours
    },
    analysisInterval: 60000, // 1 minute
    maxStoredExecutions: 10000,
    patternRecognitionMinExecutions: 5,
  };

  static getInstance(): QueryPerformanceTracker {
    if (!QueryPerformanceTracker.instance) {
      QueryPerformanceTracker.instance = new QueryPerformanceTracker();
    }
    return QueryPerformanceTracker.instance;
  }

  private constructor() {
    this.initializeSupabaseClient();
    this.startPerformanceAnalysis();
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /**
   * Track a query execution with comprehensive metrics
   */
  async trackQueryExecution(
    query: string,
    duration: number,
    success: boolean = true,
    error?: Error,
    metadata: Partial<QueryExecution['metadata']> = {},
    performance: Partial<QueryExecution['performance']> = {},
    context: Partial<QueryExecution['context']> = {},
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    const normalizedQuery = this.normalizeQuery(query);

    // Determine if this is wedding day execution
    const isWeddingDay = this.isWeddingDayTime();

    const execution: QueryExecution = {
      id: executionId,
      query: query.length > 1000 ? query.substring(0, 1000) + '...' : query,
      normalizedQuery,
      duration,
      timestamp,
      success,
      error: error?.message,
      metadata: {
        table: this.extractTableFromQuery(query),
        operation: this.extractOperationType(query),
        ...metadata,
      },
      performance: {
        executionTime: duration,
        ...performance,
      },
      context: {
        priority: 'medium',
        weddingDayExecution: isWeddingDay,
        ...context,
      },
    };

    // Store execution
    this.executions.push(execution);
    this.maintainExecutionLimit();

    // Update pattern statistics
    await this.updatePatternStatistics(execution);

    // Check for slow query
    if (
      this.isSlowQuery(duration, isWeddingDay, context.priority || 'medium')
    ) {
      await this.analyzeSlowQuery(execution);
    }

    // Notify health monitor
    await trackDatabaseQuery(query, duration, error, {
      organization: metadata.organization,
      table: metadata.table,
      type: metadata.operation === 'BULK' ? 'INSERT' : metadata.operation,
    });

    logger.debug('Query execution tracked', {
      executionId,
      duration,
      table: execution.metadata.table,
      operation: execution.metadata.operation,
      slow: this.isSlowQuery(
        duration,
        isWeddingDay,
        context.priority || 'medium',
      ),
      weddingDay: isWeddingDay,
    });

    return executionId;
  }

  /**
   * Get query performance statistics
   */
  async getPerformanceStats(timeWindow: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalExecutions: number;
    averageQueryTime: number;
    slowQueryCount: number;
    errorRate: number;
    topSlowQueries: SlowQueryAnalysis[];
    performanceTrend: PerformanceTrend;
    patternAnalysis: QueryPattern[];
  }> {
    const cutoff = this.getTimeWindowCutoff(timeWindow);
    const recentExecutions = this.executions.filter(
      (e) => e.timestamp >= cutoff,
    );

    const totalExecutions = recentExecutions.length;
    const totalDuration = recentExecutions.reduce(
      (sum, e) => sum + e.duration,
      0,
    );
    const averageQueryTime =
      totalExecutions > 0 ? totalDuration / totalExecutions : 0;
    const errorCount = recentExecutions.filter((e) => !e.success).length;
    const errorRate = totalExecutions > 0 ? errorCount / totalExecutions : 0;

    const slowQueryThreshold = this.isWeddingDayTime()
      ? this.config.slowQueryThreshold.weddingDay
      : this.config.slowQueryThreshold.default;
    const slowQueryCount = recentExecutions.filter(
      (e) => e.duration > slowQueryThreshold,
    ).length;

    // Get top slow queries
    const topSlowQueries = Array.from(this.slowQueries.values())
      .filter((sq) => sq.execution.timestamp >= cutoff)
      .sort((a, b) => b.execution.duration - a.execution.duration)
      .slice(0, 10);

    // Get performance trend
    const performanceTrend = await this.generatePerformanceTrend(timeWindow);

    // Get pattern analysis
    const patternAnalysis = Array.from(this.patterns.values())
      .filter((p) => p.lastExecuted >= cutoff)
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 20);

    return {
      totalExecutions,
      averageQueryTime,
      slowQueryCount,
      errorRate,
      topSlowQueries,
      performanceTrend,
      patternAnalysis,
    };
  }

  /**
   * Get detailed slow query analysis
   */
  async getSlowQueryAnalysis(
    executionId?: string,
  ): Promise<SlowQueryAnalysis[]> {
    const analyses = Array.from(this.slowQueries.values());

    if (executionId) {
      return analyses.filter((a) => a.execution.id === executionId);
    }

    return analyses
      .sort(
        (a, b) =>
          b.execution.timestamp.getTime() - a.execution.timestamp.getTime(),
      )
      .slice(0, 50);
  }

  /**
   * Get query optimization recommendations
   */
  async getOptimizationRecommendations(
    table?: string,
    operation?: string,
  ): Promise<QueryOptimization[]> {
    const recommendations: QueryOptimization[] = [];

    this.patterns.forEach((pattern) => {
      if (table && pattern.table !== table) return;
      if (operation && pattern.operation !== operation) return;

      // Add pattern-specific recommendations
      recommendations.push(
        ...this.generateOptimizationRecommendations(pattern),
      );
    });

    // Sort by estimated improvement and filter duplicates
    return this.deduplicateRecommendations(recommendations)
      .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
      .slice(0, 20);
  }

  /**
   * Get performance trends for analytics
   */
  async getPerformanceTrends(
    timeWindow: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<PerformanceTrend> {
    return this.generatePerformanceTrend(timeWindow);
  }

  /**
   * Get wedding day performance summary
   */
  async getWeddingDayPerformance(): Promise<{
    isWeddingDayMode: boolean;
    protectionActive: boolean;
    queryCount: number;
    averageTime: number;
    slowQueries: number;
    criticalQueries: number;
    recommendations: string[];
  }> {
    const isWeddingDay = this.isWeddingDayTime();
    const weddingDayExecutions = this.executions.filter(
      (e) => e.context.weddingDayExecution,
    );

    const queryCount = weddingDayExecutions.length;
    const totalTime = weddingDayExecutions.reduce(
      (sum, e) => sum + e.duration,
      0,
    );
    const averageTime = queryCount > 0 ? totalTime / queryCount : 0;

    const slowQueries = weddingDayExecutions.filter(
      (e) => e.duration > this.config.slowQueryThreshold.weddingDay,
    ).length;

    const criticalQueries = weddingDayExecutions.filter(
      (e) => e.duration > this.config.slowQueryThreshold.critical,
    ).length;

    const recommendations =
      this.generateWeddingDayRecommendations(weddingDayExecutions);

    return {
      isWeddingDayMode: isWeddingDay,
      protectionActive: true,
      queryCount,
      averageTime,
      slowQueries,
      criticalQueries,
      recommendations,
    };
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  private initializeSupabaseClient(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  private startPerformanceAnalysis(): void {
    // Run analysis every minute
    setInterval(async () => {
      try {
        await this.performPerformanceAnalysis();
        this.cleanupOldData();
      } catch (error) {
        logger.error('Performance analysis failed', { error });
      }
    }, this.config.analysisInterval);

    logger.info('Query performance tracking started');
  }

  private async performPerformanceAnalysis(): Promise<void> {
    // Analyze patterns for trends
    this.patterns.forEach((pattern) => {
      pattern.trendDirection = this.calculateTrendDirection(pattern);
      pattern.optimizationSuggestions =
        this.generatePatternSuggestions(pattern);
      pattern.indexRecommendations = this.generateIndexRecommendations(pattern);
      pattern.weddingDayImpact = this.assessWeddingDayImpact(pattern);
    });

    // Cache current statistics
    const stats = await this.getPerformanceStats('1h');
    const cacheKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'query_performance',
    );
    await CacheService.set(cacheKey, stats, CACHE_TTL.SHORT);
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace parameters
      .replace(/\b\d+\b/g, 'N') // Replace numbers
      .replace(/'[^']*'/g, "'X'") // Replace strings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  private extractTableFromQuery(query: string): string {
    const patterns = [
      /(?:from|join|into|update)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
      /(?:delete\s+from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return 'unknown';
  }

  private extractOperationType(
    query: string,
  ): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'BULK' {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.startsWith('select')) return 'SELECT';
    if (trimmed.startsWith('insert')) return 'INSERT';
    if (trimmed.startsWith('update')) return 'UPDATE';
    if (trimmed.startsWith('delete')) return 'DELETE';
    if (trimmed.includes('bulk') || trimmed.includes('batch')) return 'BULK';
    return 'SELECT';
  }

  private isWeddingDayTime(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 6; // Saturday
  }

  private isSlowQuery(
    duration: number,
    isWeddingDay: boolean,
    priority: string,
  ): boolean {
    if (duration > this.config.slowQueryThreshold.critical) return true;

    const threshold = isWeddingDay
      ? this.config.slowQueryThreshold.weddingDay
      : this.config.slowQueryThreshold.default;

    // Lower threshold for high priority operations
    const adjustedThreshold =
      priority === 'critical' ? threshold * 0.5 : threshold;

    return duration > adjustedThreshold;
  }

  private async updatePatternStatistics(
    execution: QueryExecution,
  ): Promise<void> {
    const signature = this.generateQuerySignature(execution.normalizedQuery);
    const pattern =
      this.patterns.get(signature) ||
      this.createNewPattern(execution, signature);

    // Update statistics
    pattern.executionCount++;
    pattern.totalDuration += execution.duration;
    pattern.averageDuration = pattern.totalDuration / pattern.executionCount;
    pattern.minDuration = Math.min(pattern.minDuration, execution.duration);
    pattern.maxDuration = Math.max(pattern.maxDuration, execution.duration);
    pattern.lastExecuted = execution.timestamp;

    if (!execution.success) {
      pattern.errorCount++;
    }

    pattern.errorRate = pattern.errorCount / pattern.executionCount;

    this.patterns.set(signature, pattern);
  }

  private createNewPattern(
    execution: QueryExecution,
    signature: string,
  ): QueryPattern {
    return {
      pattern: execution.normalizedQuery,
      signature,
      table: execution.metadata.table,
      operation: execution.metadata.operation,
      executionCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: execution.duration,
      maxDuration: execution.duration,
      errorCount: 0,
      errorRate: 0,
      lastExecuted: execution.timestamp,
      trendDirection: 'stable',
      optimizationSuggestions: [],
      indexRecommendations: [],
      weddingDayImpact: 'low',
    };
  }

  private generateQuerySignature(normalizedQuery: string): string {
    // Create a unique signature for the query pattern
    return Buffer.from(normalizedQuery).toString('base64').substring(0, 32);
  }

  private async analyzeSlowQuery(execution: QueryExecution): Promise<void> {
    const analysis: SlowQueryAnalysis = {
      execution,
      impact: this.categorizeSlowQueryImpact(execution),
      category: this.categorizeSlowQueryType(execution),
      recommendations: await this.generateSlowQueryRecommendations(execution),
      estimatedImpact: this.estimateQueryImpact(execution),
    };

    this.slowQueries.set(execution.id, analysis);

    // Log slow query for immediate attention
    logger.warn('Slow query detected and analyzed', {
      executionId: execution.id,
      duration: execution.duration,
      table: execution.metadata.table,
      operation: execution.metadata.operation,
      impact: analysis.impact,
      category: analysis.category,
      weddingDay: execution.context.weddingDayExecution,
    });
  }

  private categorizeSlowQueryImpact(
    execution: QueryExecution,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const { duration } = execution;
    const isWeddingDay = execution.context.weddingDayExecution;
    const priority = execution.context.priority;

    // Wedding day queries have lower thresholds
    const multiplier = isWeddingDay ? 0.5 : 1.0;

    if (duration > 10000 * multiplier) return 'critical';
    if (duration > 5000 * multiplier) return 'high';
    if (duration > 2000 * multiplier) return 'medium';
    return 'low';
  }

  private categorizeSlowQueryType(
    execution: QueryExecution,
  ): SlowQueryAnalysis['category'] {
    const { query, normalizedQuery } = execution;

    if (
      normalizedQuery.includes('where') &&
      !normalizedQuery.includes('index')
    ) {
      return 'missing_index';
    }
    if (
      normalizedQuery.includes('join') &&
      normalizedQuery.split('join').length > 3
    ) {
      return 'complex_join';
    }
    if (
      normalizedQuery.includes('select *') ||
      normalizedQuery.includes('limit') === false
    ) {
      return 'large_result';
    }
    if (execution.performance.ioWait && execution.performance.ioWait > 100) {
      return 'lock_contention';
    }

    return 'table_scan';
  }

  private async generateSlowQueryRecommendations(
    execution: QueryExecution,
  ): Promise<QueryOptimization[]> {
    const recommendations: QueryOptimization[] = [];
    const { normalizedQuery, metadata, performance } = execution;

    // Index recommendations
    if (
      normalizedQuery.includes('where') &&
      !normalizedQuery.includes('index')
    ) {
      recommendations.push({
        type: 'index',
        suggestion: `Add index on ${metadata.table} for WHERE clause conditions`,
        estimatedImprovement: 70,
        implementationEffort: 'low',
        riskLevel: 'low',
        weddingDayCompatible: false, // Index creation shouldn't happen on wedding days
      });
    }

    // Query rewrite recommendations
    if (normalizedQuery.includes('select *')) {
      recommendations.push({
        type: 'query_rewrite',
        suggestion: 'Select only required columns instead of using SELECT *',
        estimatedImprovement: 30,
        implementationEffort: 'low',
        riskLevel: 'low',
        weddingDayCompatible: true,
      });
    }

    // Caching recommendations
    if (
      execution.metadata.operation === 'SELECT' &&
      !execution.metadata.cacheHit
    ) {
      recommendations.push({
        type: 'caching',
        suggestion: 'Consider caching this query result',
        estimatedImprovement: 90,
        implementationEffort: 'medium',
        riskLevel: 'low',
        weddingDayCompatible: true,
      });
    }

    return recommendations;
  }

  private estimateQueryImpact(
    execution: QueryExecution,
  ): SlowQueryAnalysis['estimatedImpact'] {
    const { duration } = execution;

    return {
      userDelay: duration,
      resourceUsage: Math.min((duration / 1000) * 10, 100), // Rough estimate
      concurrentUserImpact: Math.floor(duration / 100), // Number of users potentially affected
    };
  }

  private maintainExecutionLimit(): void {
    if (this.executions.length > this.config.maxStoredExecutions) {
      // Remove oldest executions
      const excessCount =
        this.executions.length - this.config.maxStoredExecutions;
      this.executions.splice(0, excessCount);
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();

    // Clean old executions
    this.executions = this.executions.filter(
      (e) =>
        now - e.timestamp.getTime() < this.config.retentionPeriod.executions,
    );

    // Clean old patterns
    this.patterns.forEach((pattern, signature) => {
      if (
        now - pattern.lastExecuted.getTime() >
        this.config.retentionPeriod.patterns
      ) {
        this.patterns.delete(signature);
      }
    });

    // Clean old slow queries
    this.slowQueries.forEach((analysis, id) => {
      if (
        now - analysis.execution.timestamp.getTime() >
        this.config.retentionPeriod.slowQueries
      ) {
        this.slowQueries.delete(id);
      }
    });
  }

  private getTimeWindowCutoff(timeWindow: string): Date {
    const now = new Date();
    switch (timeWindow) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async generatePerformanceTrend(
    timeWindow: string,
  ): Promise<PerformanceTrend> {
    const cutoff = this.getTimeWindowCutoff(timeWindow);
    const executions = this.executions.filter((e) => e.timestamp >= cutoff);

    // Group executions by hour
    const hourlyGroups = new Map<string, QueryExecution[]>();

    executions.forEach((execution) => {
      const hour = startOfHour(execution.timestamp).toISOString();
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, []);
      }
      hourlyGroups.get(hour)!.push(execution);
    });

    const timestamps: Date[] = [];
    const averageQueryTime: number[] = [];
    const slowQueryCount: number[] = [];
    const errorRate: number[] = [];
    const throughput: number[] = [];

    const sortedHours = Array.from(hourlyGroups.keys()).sort();

    for (const hour of sortedHours) {
      const hourlyExecutions = hourlyGroups.get(hour)!;
      const timestamp = new Date(hour);

      timestamps.push(timestamp);

      const totalTime = hourlyExecutions.reduce(
        (sum, e) => sum + e.duration,
        0,
      );
      averageQueryTime.push(
        hourlyExecutions.length > 0 ? totalTime / hourlyExecutions.length : 0,
      );

      const slowCount = hourlyExecutions.filter((e) =>
        this.isSlowQuery(
          e.duration,
          e.context.weddingDayExecution,
          e.context.priority,
        ),
      ).length;
      slowQueryCount.push(slowCount);

      const errors = hourlyExecutions.filter((e) => !e.success).length;
      errorRate.push(
        hourlyExecutions.length > 0 ? errors / hourlyExecutions.length : 0,
      );

      throughput.push(hourlyExecutions.length);
    }

    return {
      timeWindow: timeWindow as PerformanceTrend['timeWindow'],
      averageQueryTime,
      slowQueryCount,
      errorRate,
      throughput,
      timestamps,
      anomalies: [], // Would implement anomaly detection
    };
  }

  private calculateTrendDirection(
    pattern: QueryPattern,
  ): 'improving' | 'stable' | 'degrading' {
    // This would compare recent performance to historical performance
    // For now, return stable as placeholder
    return 'stable';
  }

  private generatePatternSuggestions(pattern: QueryPattern): string[] {
    const suggestions: string[] = [];

    if (pattern.errorRate > 0.05) {
      suggestions.push(
        'High error rate - check data integrity and constraints',
      );
    }

    if (pattern.averageDuration > 2000) {
      suggestions.push('Consider adding indexes or optimizing query structure');
    }

    return suggestions;
  }

  private generateIndexRecommendations(pattern: QueryPattern): string[] {
    const recommendations: string[] = [];

    if (pattern.pattern.includes('where') && pattern.averageDuration > 500) {
      recommendations.push(`Index on ${pattern.table} WHERE clause columns`);
    }

    if (pattern.pattern.includes('order by') && pattern.averageDuration > 200) {
      recommendations.push(`Index on ${pattern.table} ORDER BY columns`);
    }

    return recommendations;
  }

  private assessWeddingDayImpact(
    pattern: QueryPattern,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.averageDuration > 5000) return 'critical';
    if (pattern.averageDuration > 2000) return 'high';
    if (pattern.averageDuration > 1000) return 'medium';
    return 'low';
  }

  private generateOptimizationRecommendations(
    pattern: QueryPattern,
  ): QueryOptimization[] {
    // Generate recommendations based on pattern analysis
    return [];
  }

  private deduplicateRecommendations(
    recommendations: QueryOptimization[],
  ): QueryOptimization[] {
    const seen = new Set<string>();
    return recommendations.filter((rec) => {
      const key = `${rec.type}_${rec.suggestion}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private generateWeddingDayRecommendations(
    executions: QueryExecution[],
  ): string[] {
    const recommendations: string[] = [];

    const avgDuration =
      executions.reduce((sum, e) => sum + e.duration, 0) / executions.length;
    if (avgDuration > 500) {
      recommendations.push(
        'Query performance is degraded - consider enabling read replicas',
      );
    }

    const errorRate =
      executions.filter((e) => !e.success).length / executions.length;
    if (errorRate > 0.01) {
      recommendations.push(
        'Error rate is elevated - monitor for data consistency issues',
      );
    }

    return recommendations;
  }
}

// =====================================================
// SINGLETON EXPORT AND UTILITIES
// =====================================================

export const queryPerformanceTracker = QueryPerformanceTracker.getInstance();

/**
 * Decorator to automatically track query performance
 */
export function trackQuery(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (e) {
      success = false;
      error = e as Error;
      throw e;
    } finally {
      const duration = Date.now() - startTime;
      const query = args[0] || 'unknown_query';

      await queryPerformanceTracker.trackQueryExecution(
        typeof query === 'string' ? query : JSON.stringify(query),
        duration,
        success,
        error,
        {
          table: target.constructor.name || 'unknown',
          operation: propertyKey.toUpperCase() as any,
        },
      );
    }
  };

  return descriptor;
}

/**
 * Utility function for manual query tracking
 */
export async function withQueryTracking<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata: Partial<QueryExecution['metadata']> = {},
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  let error: Error | undefined;

  try {
    const result = await queryFn();
    return result;
  } catch (e) {
    success = false;
    error = e as Error;
    throw e;
  } finally {
    const duration = Date.now() - startTime;

    await queryPerformanceTracker.trackQueryExecution(
      queryName,
      duration,
      success,
      error,
      metadata,
    );
  }
}
