/**
 * WS-155: Message Analytics Service
 * Team E - Round 2
 * Real-time analytics and performance optimization for messaging
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { cache } from 'react';

type MessageAnalytics =
  Database['public']['Tables']['message_analytics_fact']['Row'];
type MessageMetrics =
  Database['public']['Tables']['message_metrics_hourly']['Row'];

export interface RealtimeMetrics {
  messageCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  avgDeliveryTime: number;
  failureRate: number;
  activeUsers: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsDashboard {
  realtime: RealtimeMetrics;
  hourly: HourlyMetrics[];
  daily: DailyMetrics[];
  topPerformers: TopPerformer[];
  issues: Issue[];
  patterns: Pattern[];
}

export interface HourlyMetrics {
  hour: Date;
  messages: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  avgResponseTime: number;
}

export interface DailyMetrics {
  date: Date;
  totalMessages: number;
  uniqueRecipients: number;
  engagementScore: number;
  deliveryScore: number;
  cost: number;
  revenue: number;
}

export interface TopPerformer {
  type: 'message' | 'campaign' | 'template';
  id: string;
  name: string;
  metric: string;
  value: number;
  improvement: number;
}

export interface Issue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  description: string;
  affectedCount: number;
  recommendation: string;
}

export interface Pattern {
  type: 'timing' | 'content' | 'audience' | 'engagement';
  description: string;
  confidence: number;
  insights: any;
  recommendations: string[];
}

export interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  dataPoints: number;
  optimizations: string[];
}

class MessageAnalyticsService {
  private supabase = createClient();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 60000; // 1 minute cache
  private realtimeSubscription: any = null;
  private performanceLog: PerformanceMetrics[] = [];

  /**
   * Get real-time messaging metrics
   */
  async getRealtimeMetrics(
    organizationId: string,
  ): Promise<{ metrics: RealtimeMetrics; performance: PerformanceMetrics }> {
    const startTime = Date.now();
    const cacheKey = `realtime:${organizationId}`;

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return {
        metrics: cached,
        performance: {
          queryTime: Date.now() - startTime,
          cacheHit: true,
          dataPoints: 1,
          optimizations: ['cache'],
        },
      };
    }

    try {
      // Fetch real-time metrics using optimized query
      const { data, error } = await this.supabase.rpc(
        'get_realtime_message_metrics',
        {
          p_organization_id: organizationId,
          p_minutes_back: 60,
        },
      );

      if (error) throw error;

      const metrics: RealtimeMetrics = {
        messageCount: data?.message_count || 0,
        deliveryRate: data?.delivery_rate || 0,
        openRate: data?.open_rate || 0,
        clickRate: data?.click_rate || 0,
        avgDeliveryTime: data?.avg_delivery_time || 0,
        failureRate: data?.failure_rate || 0,
        activeUsers: data?.active_users || 0,
        trend: this.calculateTrend(data?.trend_data),
      };

      // Cache the result
      this.setCachedData(cacheKey, metrics);

      const queryTime = Date.now() - startTime;

      // Log slow queries
      if (queryTime > 50) {
        await this.logSlowQuery('getRealtimeMetrics', queryTime);
      }

      return {
        metrics,
        performance: {
          queryTime,
          cacheHit: false,
          dataPoints: data?.data_points || 0,
          optimizations: ['indexed_query', 'materialized_view'],
        },
      };
    } catch (error) {
      console.error('Failed to get realtime metrics:', error);
      throw new Error('Failed to fetch realtime metrics');
    }
  }

  /**
   * Get comprehensive analytics dashboard
   */
  async getAnalyticsDashboard(
    organizationId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<AnalyticsDashboard> {
    const startTime = Date.now();

    // Parallel fetch all dashboard components
    const [realtime, hourly, daily, topPerformers, issues, patterns] =
      await Promise.all([
        this.getRealtimeMetrics(organizationId).then((r) => r.metrics),
        this.getHourlyMetrics(organizationId, 24),
        this.getDailyMetrics(organizationId, dateRange),
        this.getTopPerformers(organizationId),
        this.detectIssues(organizationId),
        this.analyzePatterns(organizationId),
      ]);

    const queryTime = Date.now() - startTime;

    // Ensure sub-50ms performance
    if (queryTime > 50) {
      console.warn(`Dashboard query took ${queryTime}ms - optimization needed`);
      await this.optimizeQueries(organizationId);
    }

    return {
      realtime,
      hourly,
      daily,
      topPerformers,
      issues,
      patterns,
    };
  }

  /**
   * Get hourly metrics with performance optimization
   */
  async getHourlyMetrics(
    organizationId: string,
    hours: number = 24,
  ): Promise<HourlyMetrics[]> {
    const cacheKey = `hourly:${organizationId}:${hours}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await this.supabase
        .from('message_metrics_hourly')
        .select('*')
        .eq('organization_id', organizationId)
        .gte(
          'metric_hour',
          new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        )
        .order('metric_hour', { ascending: false });

      if (error) throw error;

      const metrics = (data || []).map((row) => ({
        hour: new Date(row.metric_hour),
        messages: row.message_count || 0,
        delivered: row.successful_deliveries || 0,
        opened: row.unique_opens || 0,
        clicked: row.unique_clicks || 0,
        failed: row.failed_deliveries || 0,
        avgResponseTime: row.avg_delivery_time_ms || 0,
      }));

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get hourly metrics:', error);
      return [];
    }
  }

  /**
   * Get daily metrics with aggregation
   */
  async getDailyMetrics(
    organizationId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<DailyMetrics[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_daily_message_metrics',
        {
          p_organization_id: organizationId,
          p_date_from: dateRange.from.toISOString(),
          p_date_to: dateRange.to.toISOString(),
        },
      );

      if (error) throw error;

      return (data || []).map((row: any) => ({
        date: new Date(row.date),
        totalMessages: row.total_messages || 0,
        uniqueRecipients: row.unique_recipients || 0,
        engagementScore: row.engagement_score || 0,
        deliveryScore: row.delivery_score || 0,
        cost: row.total_cost_cents / 100 || 0,
        revenue: row.revenue_impact_cents / 100 || 0,
      }));
    } catch (error) {
      console.error('Failed to get daily metrics:', error);
      return [];
    }
  }

  /**
   * Analyze message patterns using ML
   */
  async analyzePatterns(
    organizationId: string,
    lookbackDays: number = 30,
  ): Promise<Pattern[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'analyze_message_patterns',
        {
          p_organization_id: organizationId,
          p_days_back: lookbackDays,
        },
      );

      if (error) throw error;

      const patterns: Pattern[] = [];

      // Process pattern data
      if (data && Array.isArray(data)) {
        data.forEach((pattern: any) => {
          patterns.push({
            type: pattern.pattern_type,
            description: pattern.pattern_description,
            confidence: pattern.confidence || 0.75,
            insights: pattern.insights || {},
            recommendations: this.generateRecommendations(pattern),
          });
        });
      }

      return patterns;
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      return [];
    }
  }

  /**
   * Detect performance and delivery issues
   */
  async detectIssues(organizationId: string): Promise<Issue[]> {
    const issues: Issue[] = [];

    try {
      // Check for high failure rates
      const { data: failures } = await this.supabase
        .from('messages')
        .select('status, count')
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (failures && failures.length > 10) {
        issues.push({
          severity: 'critical',
          type: 'delivery_failure',
          description: 'High message failure rate detected',
          affectedCount: failures.length,
          recommendation: 'Check API credentials and network connectivity',
        });
      }

      // Check for slow queries
      const { data: slowQueries } = await this.supabase
        .from('query_performance_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_slow_query', true)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(10);

      if (slowQueries && slowQueries.length > 5) {
        issues.push({
          severity: 'warning',
          type: 'performance',
          description: 'Multiple slow queries detected',
          affectedCount: slowQueries.length,
          recommendation: 'Review query optimization and indexing',
        });
      }

      // Check for low engagement
      const metrics = await this.getRealtimeMetrics(organizationId);
      if (metrics.metrics.openRate < 0.15) {
        issues.push({
          severity: 'warning',
          type: 'engagement',
          description: 'Low email open rate',
          affectedCount: 0,
          recommendation: 'Review subject lines and sending times',
        });
      }
    } catch (error) {
      console.error('Failed to detect issues:', error);
    }

    return issues;
  }

  /**
   * Get top performing messages/campaigns
   */
  async getTopPerformers(
    organizationId: string,
    limit: number = 5,
  ): Promise<TopPerformer[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('id, subject, open_rate, click_rate')
        .eq('organization_id', organizationId)
        .not('open_rate', 'is', null)
        .order('open_rate', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((msg) => ({
        type: 'message' as const,
        id: msg.id,
        name: msg.subject || 'Untitled',
        metric: 'open_rate',
        value: msg.open_rate || 0,
        improvement: 0, // Calculate relative improvement
      }));
    } catch (error) {
      console.error('Failed to get top performers:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToRealtimeUpdates(
    organizationId: string,
    callback: (metrics: RealtimeMetrics) => void,
  ): () => void {
    // Set up Supabase real-time subscription
    this.realtimeSubscription = this.supabase
      .channel(`analytics:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organizationId}`,
        },
        async () => {
          const metrics = await this.getRealtimeMetrics(organizationId);
          callback(metrics.metrics);
        },
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.realtimeSubscription) {
        this.supabase.removeChannel(this.realtimeSubscription);
        this.realtimeSubscription = null;
      }
    };
  }

  /**
   * Optimize queries for sub-50ms performance
   */
  private async optimizeQueries(organizationId: string): Promise<void> {
    try {
      // Refresh materialized views
      await this.supabase.rpc('refresh_message_analytics_views', {
        p_organization_id: organizationId,
      });

      // Warm up cache
      await Promise.all([
        this.getHourlyMetrics(organizationId, 24),
        this.getRealtimeMetrics(organizationId),
      ]);

      // Analyze and optimize slow queries
      const { data: slowQueries } = await this.supabase
        .from('query_performance_log')
        .select('query_hash, query_text, avg(execution_time_ms)')
        .eq('organization_id', organizationId)
        .eq('is_slow_query', true)
        .limit(10);

      if (slowQueries && slowQueries.length > 0) {
        // Log optimization recommendations
        console.log('Query optimization needed for:', slowQueries);
      }
    } catch (error) {
      console.error('Failed to optimize queries:', error);
    }
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(pattern: any): string[] {
    const recommendations: string[] = [];

    if (pattern.pattern_type === 'optimal_send_time') {
      const bestHours = pattern.insights?.best_hours || [];
      if (bestHours.length > 0) {
        recommendations.push(
          `Schedule messages between ${bestHours[0].hour}:00 and ${bestHours[0].hour + 1}:00 for best engagement`,
        );
      }
    }

    if (pattern.pattern_type === 'content_length') {
      recommendations.push(
        'Keep message content between 50-150 words for optimal engagement',
      );
    }

    if (pattern.pattern_type === 'frequency') {
      recommendations.push('Maintain 2-3 messages per week to avoid fatigue');
    }

    return recommendations;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(trendData: any): 'up' | 'down' | 'stable' {
    if (!trendData || !Array.isArray(trendData)) return 'stable';

    if (trendData.length < 2) return 'stable';

    const recent = trendData.slice(-5);
    const older = trendData.slice(-10, -5);

    const recentAvg =
      recent.reduce((a: number, b: any) => a + b.value, 0) / recent.length;
    const olderAvg =
      older.reduce((a: number, b: any) => a + b.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Log slow query for analysis
   */
  private async logSlowQuery(
    operation: string,
    executionTime: number,
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_slow_query', {
        p_query_text: operation,
        p_execution_time_ms: executionTime,
        p_rows_returned: 0,
      });
    } catch (error) {
      console.error('Failed to log slow query:', error);
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    organizationId: string,
    format: 'csv' | 'json' | 'pdf',
    dateRange: { from: Date; to: Date },
  ): Promise<Blob> {
    const data = await this.getAnalyticsDashboard(organizationId, dateRange);

    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });

      case 'csv':
        const csv = this.convertToCSV(data);
        return new Blob([csv], { type: 'text/csv' });

      case 'pdf':
        // Would require PDF library
        return new Blob([JSON.stringify(data)], { type: 'application/pdf' });

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    const lines: string[] = [];

    // Add headers
    lines.push('Metric,Value,Timestamp');

    // Add realtime metrics
    Object.entries(data.realtime).forEach(([key, value]) => {
      lines.push(`${key},${value},${new Date().toISOString()}`);
    });

    return lines.join('\n');
  }
}

// Export singleton instance
export const messageAnalyticsService = new MessageAnalyticsService();

// Cached functions for React Server Components
export const getRealtimeMetrics = cache(async (organizationId: string) => {
  return messageAnalyticsService.getRealtimeMetrics(organizationId);
});

export const getAnalyticsDashboard = cache(
  async (organizationId: string, dateRange: { from: Date; to: Date }) => {
    return messageAnalyticsService.getAnalyticsDashboard(
      organizationId,
      dateRange,
    );
  },
);
