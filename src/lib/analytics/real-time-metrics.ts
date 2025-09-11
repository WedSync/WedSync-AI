/**
 * Real-time Metrics Calculation System
 * Feature ID: WS-052
 *
 * Provides real-time calculation and streaming of engagement metrics
 * with WebSocket support for live dashboard updates
 */

import { createClient } from '@/lib/supabase/server';
import { engagementAlgorithm, EngagementMetrics } from './engagement-algorithm';
import { redis } from '@/lib/redis';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMetricUpdate {
  clientId: string;
  supplierId: string;
  timestamp: string;
  metricType: 'engagement_score' | 'activity' | 'alert' | 'milestone';
  data: {
    score?: number;
    previousScore?: number;
    change?: number;
    segment?: string;
    event?: string;
    alertLevel?: string;
    message?: string;
  };
}

export interface AggregatedMetrics {
  supplierId: string;
  timestamp: string;
  period: 'realtime' | '1h' | '24h' | '7d' | '30d';
  metrics: {
    averageEngagementScore: number;
    totalActiveClients: number;
    totalEvents: number;
    topEngagedClients: number;
    atRiskClients: number;
    ghostClients: number;
    scoreDistribution: Record<string, number>;
    activityTrend: 'increasing' | 'stable' | 'decreasing';
    alertsGenerated: number;
    alertsResolved: number;
  };
}

export class RealtimeMetricsService {
  private supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private metricsBuffer: Map<string, RealtimeMetricUpdate[]> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.supabase = createClient();
    this.startProcessingLoop();
  }

  /**
   * Start the processing loop for buffered metrics
   */
  private startProcessingLoop() {
    this.processingInterval = setInterval(() => {
      this.processBufferedMetrics();
    }, 1000); // Process every second
  }

  /**
   * Calculate metrics in real-time for a client
   */
  async calculateRealtimeMetrics(
    clientId: string,
    supplierId: string,
    eventType?: string,
  ): Promise<RealtimeMetricUpdate> {
    // Fetch recent activity data
    const metrics = await this.fetchClientMetrics(clientId, supplierId);

    // Calculate engagement score
    const score = engagementAlgorithm.calculateScore(metrics);
    const segment = engagementAlgorithm.getEngagementSegment(score);

    // Get previous score for comparison
    const previousScore = await this.getPreviousScore(clientId, supplierId);
    const change = previousScore ? score - previousScore : 0;

    // Store new score
    await this.storeScore(clientId, supplierId, score, segment);

    // Create metric update
    const update: RealtimeMetricUpdate = {
      clientId,
      supplierId,
      timestamp: new Date().toISOString(),
      metricType: 'engagement_score',
      data: {
        score,
        previousScore,
        change,
        segment,
        event: eventType,
      },
    };

    // Buffer the update for batch processing
    this.bufferMetricUpdate(supplierId, update);

    // Broadcast to WebSocket channel
    await this.broadcastMetricUpdate(supplierId, update);

    // Check for alerts
    await this.checkAndGenerateAlerts(clientId, supplierId, metrics, score);

    return update;
  }

  /**
   * Fetch client metrics from database
   */
  private async fetchClientMetrics(
    clientId: string,
    supplierId: string,
  ): Promise<EngagementMetrics> {
    // Get activity data from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events } = await this.supabase
      .from('client_engagement_events')
      .select('*')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get client details
    const { data: client } = await this.supabase
      .from('clients')
      .select('wedding_date, created_at')
      .eq('id', clientId)
      .single();

    // Calculate metrics
    const metrics = this.aggregateEventMetrics(events || [], client);

    return metrics;
  }

  /**
   * Aggregate events into metrics
   */
  private aggregateEventMetrics(events: any[], client: any): EngagementMetrics {
    const now = new Date();
    const metrics: EngagementMetrics = {
      emailOpens: 0,
      emailClicks: 0,
      emailResponseRate: 0,
      averageResponseTime: 0,
      portalLogins: 0,
      portalPageViews: 0,
      averageSessionDuration: 0,
      documentsDownloaded: 0,
      formsViewed: 0,
      formsStarted: 0,
      formsCompleted: 0,
      formCompletionRate: 0,
      callsScheduled: 0,
      callsAttended: 0,
      meetingsScheduled: 0,
      meetingsAttended: 0,
      paymentsOnTime: 0,
      paymentDelays: 0,
      contractsSigned: 0,
      daysSinceLastActivity: 0,
      daysUntilWedding: 0,
      accountAge: 0,
      referralsGiven: 0,
    };

    // Count events by type
    events.forEach((event) => {
      switch (event.event_type) {
        case 'email_open':
          metrics.emailOpens++;
          break;
        case 'email_click':
          metrics.emailClicks++;
          break;
        case 'portal_login':
          metrics.portalLogins++;
          break;
        case 'portal_view':
          metrics.portalPageViews++;
          if (event.event_data?.duration) {
            metrics.averageSessionDuration += event.event_data.duration;
          }
          break;
        case 'document_download':
          metrics.documentsDownloaded++;
          break;
        case 'form_view':
          metrics.formsViewed++;
          break;
        case 'form_start':
          metrics.formsStarted++;
          break;
        case 'form_submit':
          metrics.formsCompleted++;
          break;
        case 'call_scheduled':
          metrics.callsScheduled++;
          break;
        case 'call_attended':
          metrics.callsAttended++;
          break;
        case 'meeting_scheduled':
          metrics.meetingsScheduled++;
          break;
        case 'meeting_attended':
          metrics.meetingsAttended++;
          break;
        case 'payment_made':
          if (event.event_data?.on_time) {
            metrics.paymentsOnTime++;
          } else {
            metrics.paymentDelays++;
          }
          break;
        case 'contract_signed':
          metrics.contractsSigned++;
          break;
        case 'referral_given':
          metrics.referralsGiven++;
          break;
      }
    });

    // Calculate averages and rates
    if (metrics.portalLogins > 0) {
      metrics.averageSessionDuration =
        metrics.averageSessionDuration / metrics.portalLogins;
    }

    if (metrics.formsStarted > 0) {
      metrics.formCompletionRate =
        metrics.formsCompleted / metrics.formsStarted;
    }

    // Calculate time-based metrics
    if (events.length > 0) {
      const lastActivity = new Date(
        Math.max(...events.map((e) => new Date(e.created_at).getTime())),
      );
      metrics.daysSinceLastActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      metrics.daysSinceLastActivity = 999; // No activity
    }

    if (client) {
      if (client.wedding_date) {
        const weddingDate = new Date(client.wedding_date);
        metrics.daysUntilWedding = Math.floor(
          (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      const accountCreated = new Date(client.created_at);
      metrics.accountAge = Math.floor(
        (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return metrics;
  }

  /**
   * Get previous engagement score from cache or database
   */
  private async getPreviousScore(
    clientId: string,
    supplierId: string,
  ): Promise<number | null> {
    const cacheKey = `engagement_score:${clientId}:${supplierId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return data.score;
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    // Fallback to database
    const { data } = await this.supabase
      .from('client_engagement_scores')
      .select('score')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .single();

    return data?.score || null;
  }

  /**
   * Store engagement score
   */
  private async storeScore(
    clientId: string,
    supplierId: string,
    score: number,
    segment: string,
  ): Promise<void> {
    const cacheKey = `engagement_score:${clientId}:${supplierId}`;

    // Store in cache
    try {
      await redis.setex(cacheKey, 300, JSON.stringify({ score, segment }));
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    // Store in database
    await this.supabase.from('client_engagement_scores').upsert({
      client_id: clientId,
      supplier_id: supplierId,
      score,
      segment,
      calculated_at: new Date().toISOString(),
    });
  }

  /**
   * Buffer metric updates for batch processing
   */
  private bufferMetricUpdate(supplierId: string, update: RealtimeMetricUpdate) {
    if (!this.metricsBuffer.has(supplierId)) {
      this.metricsBuffer.set(supplierId, []);
    }

    const buffer = this.metricsBuffer.get(supplierId)!;
    buffer.push(update);

    // Keep buffer size manageable
    if (buffer.length > 100) {
      buffer.shift(); // Remove oldest
    }
  }

  /**
   * Process buffered metrics
   */
  private async processBufferedMetrics() {
    for (const [supplierId, updates] of this.metricsBuffer.entries()) {
      if (updates.length === 0) continue;

      // Calculate aggregated metrics
      const aggregated = await this.calculateAggregatedMetrics(
        supplierId,
        updates,
      );

      // Store aggregated metrics
      await this.storeAggregatedMetrics(aggregated);

      // Clear processed updates
      this.metricsBuffer.set(supplierId, []);
    }
  }

  /**
   * Calculate aggregated metrics from updates
   */
  private async calculateAggregatedMetrics(
    supplierId: string,
    updates: RealtimeMetricUpdate[],
  ): Promise<AggregatedMetrics> {
    // Get all client scores for this supplier
    const { data: scores } = await this.supabase
      .from('client_engagement_scores')
      .select('score, segment')
      .eq('supplier_id', supplierId);

    const scoreDistribution: Record<string, number> = {
      champion: 0,
      highly_engaged: 0,
      normal: 0,
      at_risk: 0,
      ghost: 0,
    };

    let totalScore = 0;
    scores?.forEach((item) => {
      totalScore += item.score;
      scoreDistribution[item.segment] =
        (scoreDistribution[item.segment] || 0) + 1;
    });

    const averageScore = scores?.length ? totalScore / scores.length : 0;

    // Analyze activity trend
    const recentScoreChanges = updates
      .filter(
        (u) =>
          u.metricType === 'engagement_score' && u.data.change !== undefined,
      )
      .map((u) => u.data.change!);

    const averageChange =
      recentScoreChanges.length > 0
        ? recentScoreChanges.reduce((a, b) => a + b, 0) /
          recentScoreChanges.length
        : 0;

    const activityTrend =
      averageChange > 1
        ? 'increasing'
        : averageChange < -1
          ? 'decreasing'
          : 'stable';

    return {
      supplierId,
      timestamp: new Date().toISOString(),
      period: 'realtime',
      metrics: {
        averageEngagementScore: Math.round(averageScore),
        totalActiveClients: scores?.length || 0,
        totalEvents: updates.length,
        topEngagedClients:
          scoreDistribution.champion + scoreDistribution.highly_engaged,
        atRiskClients: scoreDistribution.at_risk,
        ghostClients: scoreDistribution.ghost,
        scoreDistribution,
        activityTrend,
        alertsGenerated: updates.filter((u) => u.metricType === 'alert').length,
        alertsResolved: 0, // TODO: Track resolved alerts
      },
    };
  }

  /**
   * Store aggregated metrics
   */
  private async storeAggregatedMetrics(
    metrics: AggregatedMetrics,
  ): Promise<void> {
    await this.supabase.from('aggregated_engagement_metrics').insert({
      supplier_id: metrics.supplierId,
      period: metrics.period,
      metrics: metrics.metrics,
      created_at: metrics.timestamp,
    });
  }

  /**
   * Broadcast metric update via WebSocket
   */
  private async broadcastMetricUpdate(
    supplierId: string,
    update: RealtimeMetricUpdate,
  ): Promise<void> {
    const channelName = `engagement_metrics:${supplierId}`;

    // Get or create channel
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.channels.set(channelName, channel);

      // Subscribe to channel
      await channel.subscribe();
    }

    // Broadcast update
    await channel.send({
      type: 'broadcast',
      event: 'metric_update',
      payload: update,
    });
  }

  /**
   * Check and generate alerts based on metrics
   */
  private async checkAndGenerateAlerts(
    clientId: string,
    supplierId: string,
    metrics: EngagementMetrics,
    score: number,
  ): Promise<void> {
    const riskAnalysis = engagementAlgorithm.getRiskLevel(metrics, score);

    if (riskAnalysis.level !== 'none') {
      // Check if similar alert already exists
      const { data: existingAlert } = await this.supabase
        .from('at_risk_alerts')
        .select('id')
        .eq('client_id', clientId)
        .eq('supplier_id', supplierId)
        .is('resolved_at', null)
        .single();

      if (!existingAlert) {
        // Generate new alert
        const alertType =
          metrics.daysSinceLastActivity > 14
            ? 'going_silent'
            : score < 40
              ? 'low_engagement'
              : 'missed_milestone';

        const recommendedActions = engagementAlgorithm.getRecommendedActions(
          metrics,
          score,
        );

        await this.supabase.from('at_risk_alerts').insert({
          client_id: clientId,
          supplier_id: supplierId,
          alert_type: alertType,
          severity: riskAnalysis.level,
          message: riskAnalysis.reasons.join('; '),
          recommended_actions: recommendedActions,
        });

        // Broadcast alert
        const alertUpdate: RealtimeMetricUpdate = {
          clientId,
          supplierId,
          timestamp: new Date().toISOString(),
          metricType: 'alert',
          data: {
            alertLevel: riskAnalysis.level,
            message: riskAnalysis.reasons[0], // Primary reason
          },
        };

        await this.broadcastMetricUpdate(supplierId, alertUpdate);
      }
    }
  }

  /**
   * Subscribe to real-time metrics for a supplier
   */
  subscribeToMetrics(
    supplierId: string,
    callback: (update: RealtimeMetricUpdate) => void,
  ): () => void {
    const channelName = `engagement_metrics:${supplierId}`;

    // Get or create channel
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    // Subscribe to updates
    channel.on('broadcast', { event: 'metric_update' }, (payload) => {
      callback(payload.payload as RealtimeMetricUpdate);
    });

    channel.subscribe();

    // Return unsubscribe function
    return () => {
      channel?.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Get historical metrics for trending
   */
  async getHistoricalMetrics(
    supplierId: string,
    period: '24h' | '7d' | '30d' = '7d',
  ): Promise<AggregatedMetrics[]> {
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodMap[period]);

    const { data } = await this.supabase
      .from('aggregated_engagement_metrics')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    return (
      data?.map((item) => ({
        supplierId: item.supplier_id,
        timestamp: item.created_at,
        period: item.period,
        metrics: item.metrics,
      })) || []
    );
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });

    this.channels.clear();
    this.metricsBuffer.clear();
  }
}

// Export singleton instance
export const realtimeMetricsService = new RealtimeMetricsService();
