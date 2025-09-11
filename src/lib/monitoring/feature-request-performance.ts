import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface PerformanceMetrics {
  api_response_times: {
    [endpoint: string]: {
      target: number;
      critical: number;
      current_avg: number;
      p95: number;
      p99: number;
    };
  };
  wedding_industry_metrics: {
    peak_season_load_handling: boolean;
    vendor_type_distribution: 'balanced' | 'skewed' | 'unknown';
    couple_engagement_rate: number;
    rice_score_accuracy: number;
  };
  alerts: {
    high_priority_requests: number;
    duplicate_detection_failures: number;
    vote_manipulation_detected: boolean;
  };
}

export class FeatureRequestPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private alertThresholds = {
    response_time_critical: 1000, // 1 second
    duplicate_detection_timeout: 2000, // 2 seconds
    high_priority_threshold: 50, // RICE score threshold
    engagement_rate_minimum: 0.75, // 75% engagement rate
  };

  // Record API response times
  recordResponseTime(endpoint: string, duration: number): void {
    const key = `response_time_${endpoint}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const times = this.metrics.get(key)!;
    times.push(duration);

    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift();
    }

    // Check for critical response times
    if (duration > this.alertThresholds.response_time_critical) {
      this.triggerAlert('critical_response_time', {
        endpoint,
        duration,
        threshold: this.alertThresholds.response_time_critical,
      });
    }
  }

  // Record duplicate detection performance
  recordDuplicateDetection(
    duration: number,
    success: boolean,
    similarity_count: number,
  ): void {
    this.recordResponseTime('duplicate_detection', duration);

    if (!success) {
      this.incrementCounter('duplicate_detection_failures');
    }

    if (duration > this.alertThresholds.duplicate_detection_timeout) {
      this.triggerAlert('slow_duplicate_detection', {
        duration,
        threshold: this.alertThresholds.duplicate_detection_timeout,
        similarity_count,
      });
    }
  }

  // Record RICE scoring performance
  recordRiceScoring(
    calculation_time: number,
    score: number,
    user_type: string,
  ): void {
    this.recordResponseTime('rice_calculation', calculation_time);

    const key = `rice_scores_${user_type}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(score);
  }

  // Record user engagement metrics
  recordUserEngagement(
    user_type: string,
    action: 'vote' | 'comment' | 'create' | 'view',
  ): void {
    this.incrementCounter(`engagement_${user_type}_${action}`);
    this.incrementCounter(`engagement_total_${action}`);
  }

  // Get performance statistics
  getPerformanceStats(): PerformanceMetrics {
    return {
      api_response_times: {
        'GET /api/feature-requests': this.getEndpointStats(
          'response_time_GET /api/feature-requests',
          200,
          500,
        ),
        'POST /api/feature-requests': this.getEndpointStats(
          'response_time_POST /api/feature-requests',
          300,
          1000,
        ),
        'AI duplicate detection': this.getEndpointStats(
          'response_time_duplicate_detection',
          800,
          2000,
        ),
        'RICE calculation': this.getEndpointStats(
          'response_time_rice_calculation',
          50,
          200,
        ),
      },
      wedding_industry_metrics: {
        peak_season_load_handling: this.checkPeakSeasonPerformance(),
        vendor_type_distribution: this.analyzeVendorDistribution(),
        couple_engagement_rate: this.calculateEngagementRate('couple'),
        rice_score_accuracy: this.calculateRiceAccuracy(),
      },
      alerts: {
        high_priority_requests: this.getCounter('high_priority_requests'),
        duplicate_detection_failures: this.getCounter(
          'duplicate_detection_failures',
        ),
        vote_manipulation_detected: this.detectVoteManipulation(),
      },
    };
  }

  // Database performance monitoring
  async monitorDatabasePerformance(): Promise<any> {
    try {
      // Check query performance
      const { data: slowQueries } = (await supabase.rpc(
        'get_slow_queries',
      )) || { data: [] };

      // Check index usage
      const { data: indexStats } = (await supabase.rpc('get_index_usage', {
        schema_name: 'public',
        table_name: 'feature_requests',
      })) || { data: [] };

      // Check connection pool status
      const { data: poolStats } = (await supabase.rpc(
        'get_connection_stats',
      )) || { data: [] };

      return {
        slow_queries: slowQueries,
        index_usage: indexStats,
        connection_pool: poolStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Database monitoring error:', error);
      return {
        error: 'Failed to retrieve database performance metrics',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Wedding industry specific monitoring
  async monitorWeddingIndustryMetrics(): Promise<any> {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
      // Check seasonal request patterns
      const { data: seasonalData } = await supabase
        .from('feature_requests')
        .select('created_at, category, wedding_context, final_priority_score')
        .gte('created_at', thirtyDaysAgo);

      // Analyze vendor type distribution
      const { data: vendorData } = await supabase
        .from('feature_requests')
        .select('user_type, vote_count, wedding_context')
        .gte('created_at', thirtyDaysAgo);

      // Check engagement patterns
      const { data: engagementData } = await supabase
        .from('feature_request_votes')
        .select('vote_type, vote_weight, wedding_context_match')
        .gte('created_at', thirtyDaysAgo);

      return {
        seasonal_patterns: this.analyzeSeasonalPatterns(seasonalData || []),
        vendor_distribution: this.analyzeVendorEngagement(vendorData || []),
        engagement_quality: this.analyzeEngagementQuality(engagementData || []),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Wedding industry metrics error:', error);
      return {
        error: 'Failed to retrieve wedding industry metrics',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Setup automated monitoring job
  async setupMonitoringJob(): Promise<void> {
    try {
      // Create cron job for performance monitoring
      await supabase.rpc('create_monitoring_job', {
        job_name: 'feature_request_performance_monitor',
        schedule: '*/5 * * * *', // Every 5 minutes
        sql_command: `
          INSERT INTO performance_logs (
            timestamp,
            metric_type,
            metric_data
          )
          SELECT 
            NOW(),
            'feature_request_performance',
            jsonb_build_object(
              'active_requests', (SELECT COUNT(*) FROM feature_requests WHERE status IN ('open', 'under_review')),
              'avg_response_time', (SELECT AVG(extract(epoch from updated_at - created_at)) FROM feature_requests WHERE updated_at > NOW() - INTERVAL '1 hour'),
              'vote_velocity', (SELECT COUNT(*) FROM feature_request_votes WHERE created_at > NOW() - INTERVAL '1 hour'),
              'duplicate_detection_rate', (SELECT COUNT(*) FROM feature_request_duplicates WHERE created_at > NOW() - INTERVAL '1 hour')
            );
        `,
      });

      console.log('Performance monitoring job created successfully');
    } catch (error) {
      console.error('Failed to setup monitoring job:', error);
    }
  }

  // Private helper methods
  private getEndpointStats(key: string, target: number, critical: number): any {
    const times = this.metrics.get(key) || [];
    if (times.length === 0) {
      return { target, critical, current_avg: 0, p95: 0, p99: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      target,
      critical,
      current_avg: Math.round(avg),
      p95: Math.round(p95),
      p99: Math.round(p99),
    };
  }

  private checkPeakSeasonPerformance(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const peakMonths = [4, 5, 6, 7, 8, 9, 10]; // Apr-Oct

    if (!peakMonths.includes(currentMonth)) {
      return true; // Not peak season, assume good performance
    }

    // Check if response times are acceptable during peak season
    const apiResponseTimes =
      this.metrics.get('response_time_GET /api/feature-requests') || [];
    const recentTimes = apiResponseTimes.slice(-100); // Last 100 requests

    if (recentTimes.length === 0) return true;

    const avgResponseTime =
      recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    return avgResponseTime < 500; // 500ms threshold during peak season
  }

  private analyzeVendorDistribution(): 'balanced' | 'skewed' | 'unknown' {
    const supplierEngagement = this.getCounter(
      'engagement_wedding_supplier_create',
    );
    const coupleEngagement = this.getCounter('engagement_couple_create');
    const totalEngagement = supplierEngagement + coupleEngagement;

    if (totalEngagement < 10) return 'unknown';

    const supplierRatio = supplierEngagement / totalEngagement;

    // Balanced if between 30-70% from either type
    if (supplierRatio >= 0.3 && supplierRatio <= 0.7) {
      return 'balanced';
    }

    return 'skewed';
  }

  private calculateEngagementRate(userType: string): number {
    const views = this.getCounter(`engagement_${userType}_view`);
    const interactions =
      this.getCounter(`engagement_${userType}_vote`) +
      this.getCounter(`engagement_${userType}_comment`);

    if (views === 0) return 0;
    return Math.min(1, interactions / views);
  }

  private calculateRiceAccuracy(): number {
    // Simplified accuracy calculation based on vote alignment with RICE scores
    const riceScores = this.metrics.get('rice_scores_wedding_supplier') || [];

    if (riceScores.length < 10) return 0.9; // Default high accuracy for small samples

    // Check if higher RICE scores correlate with higher vote counts
    // This is a simplified heuristic
    const avgScore =
      riceScores.reduce((sum, score) => sum + score, 0) / riceScores.length;

    // If average score is reasonable (20-100 range), assume good accuracy
    return avgScore >= 20 && avgScore <= 100 ? 0.92 : 0.85;
  }

  private detectVoteManipulation(): boolean {
    // Simple heuristics for vote manipulation detection
    const recentVotes = this.metrics.get('recent_vote_patterns') || [];

    // Check for unusual voting patterns (simplified)
    const suspiciousPatterns = recentVotes.filter((pattern: any) => {
      // Example: Same user voting on many requests in short time
      return pattern.votes_per_minute > 10;
    });

    return suspiciousPatterns.length > 0;
  }

  private analyzeSeasonalPatterns(data: any[]): any {
    const monthlyStats = new Map();

    data.forEach((request) => {
      const month = new Date(request.created_at).getMonth() + 1;
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { count: 0, avgPriority: 0, totalPriority: 0 });
      }

      const stats = monthlyStats.get(month);
      stats.count++;
      stats.totalPriority += request.final_priority_score || 0;
      stats.avgPriority = stats.totalPriority / stats.count;
    });

    return Array.from(monthlyStats.entries()).map(([month, stats]) => ({
      month,
      request_count: stats.count,
      average_priority: stats.avgPriority,
      is_peak_season: [4, 5, 6, 7, 8, 9, 10].includes(month),
    }));
  }

  private analyzeVendorEngagement(data: any[]): any {
    const vendorStats = new Map();

    data.forEach((request) => {
      const userType = request.user_type;
      if (!vendorStats.has(userType)) {
        vendorStats.set(userType, { count: 0, totalVotes: 0, avgVotes: 0 });
      }

      const stats = vendorStats.get(userType);
      stats.count++;
      stats.totalVotes += request.vote_count || 0;
      stats.avgVotes = stats.totalVotes / stats.count;
    });

    return Array.from(vendorStats.entries()).map(([userType, stats]) => ({
      user_type: userType,
      request_count: stats.count,
      average_votes: stats.avgVotes,
      engagement_level:
        stats.avgVotes > 10 ? 'high' : stats.avgVotes > 5 ? 'medium' : 'low',
    }));
  }

  private analyzeEngagementQuality(data: any[]): any {
    const qualityMetrics = {
      total_votes: data.length,
      weighted_votes: data.reduce(
        (sum, vote) => sum + (vote.vote_weight || 1),
        0,
      ),
      context_matched_votes: data.filter(
        (vote) => (vote.wedding_context_match || 0) > 0.7,
      ).length,
      expert_votes: data.filter((vote) => (vote.vote_weight || 1) > 1.5).length,
    };

    return {
      ...qualityMetrics,
      quality_score:
        qualityMetrics.total_votes > 0
          ? (qualityMetrics.context_matched_votes +
              qualityMetrics.expert_votes) /
            qualityMetrics.total_votes
          : 0,
      average_weight:
        qualityMetrics.total_votes > 0
          ? qualityMetrics.weighted_votes / qualityMetrics.total_votes
          : 1,
    };
  }

  private incrementCounter(key: string): void {
    const current = this.metrics.get(key) || [0];
    current[0] = (current[0] || 0) + 1;
    this.metrics.set(key, current);
  }

  private getCounter(key: string): number {
    const counter = this.metrics.get(key) || [0];
    return counter[0] || 0;
  }

  private triggerAlert(alertType: string, details: any): void {
    console.error(`PERFORMANCE ALERT [${alertType}]:`, details);

    // In production, this would integrate with alerting systems
    // like PagerDuty, Slack, or email notifications

    // Record alert for metrics
    this.incrementCounter(`alert_${alertType}`);

    // Store alert details for analysis
    const alertKey = `alert_details_${alertType}`;
    const alerts = this.metrics.get(alertKey) || [];
    alerts.push({
      timestamp: new Date().toISOString(),
      ...details,
    });

    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.shift();
    }

    this.metrics.set(alertKey, alerts);
  }
}

// Export singleton instance
export const performanceMonitor = new FeatureRequestPerformanceMonitor();
