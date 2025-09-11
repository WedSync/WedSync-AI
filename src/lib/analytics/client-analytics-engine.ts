import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface ClientAnalyticsConfig {
  enableRealTimeUpdates: boolean;
  cacheTimeout: number;
  privacyLevel: 'full' | 'aggregated' | 'anonymized';
  performanceOptimization: boolean;
}

export interface AnalyticsCache {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

export interface ClientEngagementScore {
  overall_score: number;
  activity_level: 'low' | 'medium' | 'high';
  engagement_trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  event_distribution: Record<string, number>;
  session_quality: number;
  retention_indicators: {
    days_active: number;
    consecutive_days: number;
    last_activity: string;
  };
}

export interface ClientCommunicationAnalytics {
  total_touchpoints: number;
  response_rate: number;
  preferred_channels: string[];
  communication_timing: {
    peak_hours: number[];
    peak_days: string[];
  };
  sentiment_analysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  escalation_patterns: {
    support_tickets: number;
    urgent_requests: number;
    satisfaction_scores: number[];
  };
}

export interface ClientJourneyProgress {
  current_stage: string;
  completion_percentage: number;
  milestone_achievements: {
    milestone: string;
    achieved_at: string;
    value: number;
  }[];
  journey_efficiency: number;
  bottlenecks: {
    stage: string;
    delay_days: number;
    reason: string;
  }[];
  predicted_completion: string;
}

export class ClientAnalyticsEngine {
  private cache: Map<string, AnalyticsCache> = new Map();
  private config: ClientAnalyticsConfig;
  private supabase: any;

  constructor(config: ClientAnalyticsConfig) {
    this.config = config;
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    const cookieStore = cookies();
    this.supabase = createClient(cookieStore);
  }

  private generateCacheKey(
    type: string,
    clientId?: string,
    supplierId?: string,
    timeframe?: string,
    additionalParams?: Record<string, any>,
  ): string {
    const params = {
      type,
      clientId: clientId || 'all',
      supplierId: supplierId || 'all',
      timeframe: timeframe || '30d',
      ...additionalParams,
    };

    return `client_analytics:${Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`;
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached || cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCachedData(
    key: string,
    data: any,
    ttlSeconds: number = 900,
  ): void {
    const now = Date.now();
    this.cache.set(key, {
      key,
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  async calculateEngagementScore(
    clientId: string,
    supplierId?: string,
    timeframe: string = '30d',
  ): Promise<ClientEngagementScore> {
    const cacheKey = this.generateCacheKey(
      'engagement',
      clientId,
      supplierId,
      timeframe,
    );

    // Check cache first
    const cached = await this.getCachedData<ClientEngagementScore>(cacheKey);
    if (cached && !this.config.enableRealTimeUpdates) {
      return cached;
    }

    try {
      const timeFilter = this.getTimeframeFilter(timeframe);

      // Get engagement events
      let query = this.supabase
        .from('client_engagement_events')
        .select(
          `
          event_type,
          event_data,
          created_at,
          session_id,
          duration_seconds
        `,
        )
        .eq('client_id', clientId)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: true });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch engagement events: ${error.message}`);
      }

      // Calculate comprehensive engagement metrics
      const score = this.computeEngagementScore(events || [], timeframe);

      // Cache the result
      this.setCachedData(cacheKey, score, this.config.cacheTimeout);

      return score;
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      throw error;
    }
  }

  private computeEngagementScore(
    events: any[],
    timeframe: string,
  ): ClientEngagementScore {
    if (!events || events.length === 0) {
      return {
        overall_score: 0,
        activity_level: 'low',
        engagement_trends: { daily: [], weekly: [], monthly: [] },
        event_distribution: {},
        session_quality: 0,
        retention_indicators: {
          days_active: 0,
          consecutive_days: 0,
          last_activity: new Date().toISOString(),
        },
      };
    }

    // Event scoring weights
    const eventWeights = {
      portal_login: 10,
      form_submit: 15,
      document_download: 8,
      message_sent: 12,
      email_open: 3,
      email_click: 5,
      call_scheduled: 20,
      meeting_attended: 25,
      payment_made: 30,
      form_view: 2,
      portal_view: 1,
      file_upload: 10,
      search_performed: 4,
      profile_updated: 6,
      feedback_submitted: 8,
    };

    // Calculate raw score
    const totalScore = events.reduce((sum, event) => {
      const weight =
        eventWeights[event.event_type as keyof typeof eventWeights] || 1;
      return sum + weight;
    }, 0);

    // Normalize score (0-100)
    const normalizedScore = Math.min(
      100,
      (totalScore / Math.max(events.length, 1)) * 5,
    );

    // Determine activity level
    const activityLevel: 'low' | 'medium' | 'high' =
      normalizedScore > 70 ? 'high' : normalizedScore > 40 ? 'medium' : 'low';

    // Calculate trends
    const trends = this.calculateEngagementTrends(events);

    // Event distribution
    const eventDistribution = events.reduce(
      (dist: Record<string, number>, event) => {
        dist[event.event_type] = (dist[event.event_type] || 0) + 1;
        return dist;
      },
      {},
    );

    // Session quality analysis
    const sessionQuality = this.calculateSessionQuality(events);

    // Retention indicators
    const retentionIndicators = this.calculateRetentionIndicators(events);

    return {
      overall_score: Math.round(normalizedScore * 100) / 100,
      activity_level: activityLevel,
      engagement_trends: trends,
      event_distribution: eventDistribution,
      session_quality: sessionQuality,
      retention_indicators: retentionIndicators,
    };
  }

  private calculateEngagementTrends(events: any[]): {
    daily: number[];
    weekly: number[];
    monthly: number[];
  } {
    const now = new Date();
    const dailyTrends: number[] = [];
    const weeklyTrends: number[] = [];
    const monthlyTrends: number[] = [];

    // Daily trends (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];

      const dayEvents = events.filter((e) => e.created_at.startsWith(dayStr));

      dailyTrends.push(dayEvents.length);
    }

    // Weekly trends (last 12 weeks)
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7 - 6);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekEvents = events.filter((e) => {
        const eventDate = new Date(e.created_at);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });

      weeklyTrends.push(weekEvents.length);
    }

    // Monthly trends (last 12 months)
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthEvents = events.filter((e) => {
        const eventDate = new Date(e.created_at);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });

      monthlyTrends.push(monthEvents.length);
    }

    return {
      daily: dailyTrends,
      weekly: weeklyTrends,
      monthly: monthlyTrends,
    };
  }

  private calculateSessionQuality(events: any[]): number {
    const sessions = events.reduce((acc: Record<string, any[]>, event) => {
      const sessionId = event.session_id || 'default';
      if (!acc[sessionId]) {
        acc[sessionId] = [];
      }
      acc[sessionId].push(event);
      return acc;
    }, {});

    if (Object.keys(sessions).length === 0) return 0;

    let totalQuality = 0;
    let sessionCount = 0;

    Object.values(sessions).forEach((sessionEvents) => {
      const sessionDuration = sessionEvents.reduce(
        (total, event) => total + (event.duration_seconds || 30),
        0,
      );

      const diversityScore = new Set(sessionEvents.map((e) => e.event_type))
        .size;
      const engagementScore = sessionEvents.length;

      // Quality factors: duration, diversity of actions, engagement level
      const quality = Math.min(
        100,
        (sessionDuration / 60) * 0.3 + // Duration in minutes (max 30 points)
          diversityScore * 10 + // Diversity (10 points per unique action)
          Math.min(engagementScore * 5, 40), // Engagement (max 40 points)
      );

      totalQuality += quality;
      sessionCount++;
    });

    return Math.round((totalQuality / sessionCount) * 100) / 100;
  }

  private calculateRetentionIndicators(events: any[]): {
    days_active: number;
    consecutive_days: number;
    last_activity: string;
  } {
    if (events.length === 0) {
      return {
        days_active: 0,
        consecutive_days: 0,
        last_activity: new Date().toISOString(),
      };
    }

    const sortedEvents = events.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const lastActivity = sortedEvents[sortedEvents.length - 1].created_at;

    // Get unique active days
    const activeDays = new Set(events.map((e) => e.created_at.split('T')[0]));

    // Calculate consecutive days
    const activeDaysList = Array.from(activeDays).sort();
    let consecutiveDays = 0;
    let currentStreak = 1;

    for (let i = 1; i < activeDaysList.length; i++) {
      const prevDate = new Date(activeDaysList[i - 1]);
      const currDate = new Date(activeDaysList[i]);
      const diffDays =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentStreak++;
      } else {
        consecutiveDays = Math.max(consecutiveDays, currentStreak);
        currentStreak = 1;
      }
    }

    consecutiveDays = Math.max(consecutiveDays, currentStreak);

    return {
      days_active: activeDays.size,
      consecutive_days: consecutiveDays,
      last_activity: lastActivity,
    };
  }

  async analyzeCommunicationPatterns(
    clientId: string,
    supplierId?: string,
    timeframe: string = '30d',
  ): Promise<ClientCommunicationAnalytics> {
    const cacheKey = this.generateCacheKey(
      'communication',
      clientId,
      supplierId,
      timeframe,
    );

    const cached =
      await this.getCachedData<ClientCommunicationAnalytics>(cacheKey);
    if (cached && !this.config.enableRealTimeUpdates) {
      return cached;
    }

    try {
      const timeFilter = this.getTimeframeFilter(timeframe);

      // Get all communication touchpoints
      const communicationQueries = [
        // Email communications
        this.supabase
          .from('email_communications')
          .select(
            `
            id, type, created_at, response_received, response_time_hours,
            sentiment_score, urgency_level, channel
          `,
          )
          .eq('client_id', clientId)
          .gte('created_at', timeFilter)
          .apply((q) => (supplierId ? q.eq('supplier_id', supplierId) : q)),

        // SMS communications
        this.supabase
          .from('sms_communications')
          .select(
            `
            id, type, created_at, response_received, response_time_hours,
            sentiment_score, urgency_level
          `,
          )
          .eq('client_id', clientId)
          .gte('created_at', timeFilter)
          .apply((q) => (supplierId ? q.eq('supplier_id', supplierId) : q)),

        // Direct messages
        this.supabase
          .from('direct_messages')
          .select(
            `
            id, created_at, response_received, response_time_hours,
            sentiment_score, urgency_level
          `,
          )
          .eq('client_id', clientId)
          .gte('created_at', timeFilter)
          .apply((q) => (supplierId ? q.eq('supplier_id', supplierId) : q)),

        // Support tickets
        this.supabase
          .from('support_tickets')
          .select(
            `
            id, created_at, resolved_at, priority, satisfaction_rating,
            category, status
          `,
          )
          .eq('client_id', clientId)
          .gte('created_at', timeFilter)
          .apply((q) => (supplierId ? q.eq('supplier_id', supplierId) : q)),
      ];

      const [emailResult, smsResult, messageResult, supportResult] =
        await Promise.all(communicationQueries);

      const emails = emailResult.data || [];
      const sms = smsResult.data || [];
      const messages = messageResult.data || [];
      const support = supportResult.data || [];

      const analytics = this.computeCommunicationAnalytics(
        emails,
        sms,
        messages,
        support,
      );

      // Cache the result
      this.setCachedData(cacheKey, analytics, this.config.cacheTimeout);

      return analytics;
    } catch (error) {
      console.error('Error analyzing communication patterns:', error);
      throw error;
    }
  }

  private computeCommunicationAnalytics(
    emails: any[],
    sms: any[],
    messages: any[],
    support: any[],
  ): ClientCommunicationAnalytics {
    const allCommunications = [...emails, ...sms, ...messages];

    // Calculate response rate
    const responsiveCommunications = allCommunications.filter(
      (c) => c.response_received,
    );
    const responseRate =
      allCommunications.length > 0
        ? (responsiveCommunications.length / allCommunications.length) * 100
        : 0;

    // Determine preferred channels
    const channelCounts = {
      email: emails.length,
      sms: sms.length,
      direct: messages.length,
    };

    const preferredChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .filter(([, count]) => count > 0)
      .map(([channel]) => channel);

    // Analyze timing patterns
    const timingAnalysis = this.analyzeCommunicationTiming(allCommunications);

    // Sentiment analysis
    const sentimentScores = allCommunications
      .map((c) => c.sentiment_score)
      .filter((score) => score !== null && score !== undefined);

    const sentimentAnalysis = {
      positive: sentimentScores.filter((s) => s > 0.1).length,
      neutral: sentimentScores.filter((s) => s >= -0.1 && s <= 0.1).length,
      negative: sentimentScores.filter((s) => s < -0.1).length,
    };

    // Escalation patterns
    const urgentCommunications = allCommunications.filter(
      (c) => c.urgency_level === 'high' || c.urgency_level === 'urgent',
    );

    const satisfactionScores = support
      .map((s) => s.satisfaction_rating)
      .filter((rating) => rating !== null && rating !== undefined);

    const escalationPatterns = {
      support_tickets: support.length,
      urgent_requests: urgentCommunications.length,
      satisfaction_scores: satisfactionScores,
    };

    return {
      total_touchpoints: allCommunications.length,
      response_rate: Math.round(responseRate * 100) / 100,
      preferred_channels: preferredChannels,
      communication_timing: timingAnalysis,
      sentiment_analysis: sentimentAnalysis,
      escalation_patterns: escalationPatterns,
    };
  }

  private analyzeCommunicationTiming(communications: any[]): {
    peak_hours: number[];
    peak_days: string[];
  } {
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<string, number> = {};

    communications.forEach((comm) => {
      const date = new Date(comm.created_at);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    // Find peak hours (top 3)
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Find peak days (top 3)
    const peakDays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    return {
      peak_hours: peakHours,
      peak_days: peakDays,
    };
  }

  async trackJourneyProgress(
    clientId: string,
    supplierId?: string,
  ): Promise<ClientJourneyProgress> {
    const cacheKey = this.generateCacheKey('journey', clientId, supplierId);

    const cached = await this.getCachedData<ClientJourneyProgress>(cacheKey);
    if (cached && !this.config.enableRealTimeUpdates) {
      return cached;
    }

    try {
      // Get current journey instances
      let query = this.supabase
        .from('journey_instances')
        .select(
          `
          id,
          status,
          current_node_id,
          created_at,
          updated_at,
          journey_id,
          completion_percentage,
          journey_canvases!inner(name, nodes),
          client_journey_progress(
            completion_percentage,
            current_milestone,
            milestones_achieved,
            bottlenecks_encountered
          )
        `,
        )
        .eq('client_id', clientId)
        .in('status', ['active', 'running', 'completed']);

      if (supplierId) {
        query = query.eq('journey_canvases.supplier_id', supplierId);
      }

      const { data: journeys, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch journey progress: ${error.message}`);
      }

      const progress = this.computeJourneyProgress(journeys || []);

      // Cache the result
      this.setCachedData(cacheKey, progress, 600); // 10 minutes for journey data

      return progress;
    } catch (error) {
      console.error('Error tracking journey progress:', error);
      throw error;
    }
  }

  private computeJourneyProgress(journeys: any[]): ClientJourneyProgress {
    if (!journeys || journeys.length === 0) {
      return {
        current_stage: 'Not Started',
        completion_percentage: 0,
        milestone_achievements: [],
        journey_efficiency: 0,
        bottlenecks: [],
        predicted_completion: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    }

    // Get the most recent/active journey
    const activeJourney =
      journeys.find((j) => j.status === 'active' || j.status === 'running') ||
      journeys[journeys.length - 1];

    const progress = activeJourney.client_journey_progress?.[0];
    const completionPercentage =
      progress?.completion_percentage ||
      activeJourney.completion_percentage ||
      0;

    // Extract milestone achievements
    const milestoneAchievements = (progress?.milestones_achieved || []).map(
      (milestone: any) => ({
        milestone: milestone.name || milestone.milestone,
        achieved_at: milestone.achieved_at || milestone.timestamp,
        value: milestone.value || milestone.score || 1,
      }),
    );

    // Calculate journey efficiency (completion rate vs time elapsed)
    const startDate = new Date(activeJourney.created_at);
    const currentDate = new Date();
    const daysElapsed =
      (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedDuration = 30; // Assume 30 days expected duration
    const efficiency = Math.min(
      100,
      completionPercentage /
        Math.max((daysElapsed / expectedDuration) * 100, 1),
    );

    // Process bottlenecks
    const bottlenecks = (progress?.bottlenecks_encountered || []).map(
      (bottleneck: any) => ({
        stage: bottleneck.stage || bottleneck.node_name,
        delay_days: bottleneck.delay_days || 0,
        reason: bottleneck.reason || 'Unknown delay',
      }),
    );

    // Predict completion date
    const remainingPercentage = 100 - completionPercentage;
    const currentVelocity = completionPercentage / Math.max(daysElapsed, 1);
    const remainingDays = remainingPercentage / Math.max(currentVelocity, 0.1);
    const predictedCompletion = new Date(
      Date.now() + remainingDays * 24 * 60 * 60 * 1000,
    );

    return {
      current_stage:
        progress?.current_milestone ||
        activeJourney.current_node_id ||
        'In Progress',
      completion_percentage: Math.round(completionPercentage * 100) / 100,
      milestone_achievements: milestoneAchievements,
      journey_efficiency: Math.round(efficiency * 100) / 100,
      bottlenecks: bottlenecks,
      predicted_completion: predictedCompletion.toISOString(),
    };
  }

  private getTimeframeFilter(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30d':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90d':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
    }
  }

  // Performance monitoring method
  async getAnalyticsPerformanceMetrics(): Promise<{
    cache_hit_rate: number;
    average_response_time: number;
    total_requests: number;
    error_rate: number;
  }> {
    const cacheSize = this.cache.size;
    const cacheHits = Array.from(this.cache.values()).filter(
      (entry) => entry.timestamp > Date.now() - 3600000, // Last hour
    ).length;

    return {
      cache_hit_rate: cacheSize > 0 ? (cacheHits / cacheSize) * 100 : 0,
      average_response_time: 0, // Would be tracked separately
      total_requests: cacheSize,
      error_rate: 0, // Would be tracked separately
    };
  }

  // Clear expired cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const clientAnalyticsEngine = new ClientAnalyticsEngine({
  enableRealTimeUpdates: process.env.NODE_ENV === 'production',
  cacheTimeout: 900, // 15 minutes
  privacyLevel: 'full',
  performanceOptimization: true,
});
