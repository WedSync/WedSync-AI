/**
 * Client Engagement Scoring System
 * Feature ID: WS-017
 *
 * Calculates real-time engagement scores (0-100) for wedding clients
 * and detects at-risk couples going silent before their wedding
 */

import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';

export interface EngagementEvent {
  client_id: string;
  supplier_id: string;
  event_type:
    | 'email_open'
    | 'email_click'
    | 'form_view'
    | 'form_submit'
    | 'portal_login'
    | 'portal_view'
    | 'document_download'
    | 'message_sent'
    | 'call_scheduled'
    | 'meeting_attended'
    | 'payment_made';
  event_data?: Record<string, any>;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface EngagementScore {
  client_id: string;
  supplier_id: string;
  score: number; // 0-100
  segment: 'champion' | 'highly_engaged' | 'normal' | 'at_risk' | 'ghost';
  factors: {
    email_activity: number;
    portal_activity: number;
    form_activity: number;
    communication_activity: number;
    meeting_activity: number;
    recency_factor: number;
    days_since_activity: number;
  };
  last_activity: string;
  calculated_at: string;
}

export interface AtRiskAlert {
  id: string;
  client_id: string;
  supplier_id: string;
  client_name: string;
  alert_type: 'going_silent' | 'low_engagement' | 'missed_milestone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_actions: string[];
  days_since_activity: number;
  wedding_date?: string;
  created_at: string;
}

export class EngagementScoringService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Track a client engagement event
   */
  async trackEvent(event: EngagementEvent): Promise<void> {
    const { error } = await this.supabase
      .from('client_engagement_events')
      .insert([
        {
          client_id: event.client_id,
          supplier_id: event.supplier_id,
          event_type: event.event_type,
          event_data: event.event_data || {},
          session_id: event.session_id,
          user_agent: event.user_agent,
          ip_address: event.ip_address,
        },
      ]);

    if (error) {
      console.error('Failed to track engagement event:', error);
      throw error;
    }

    // Invalidate cached scores
    await this.invalidateScoreCache(event.client_id, event.supplier_id);
  }

  /**
   * Get engagement score for a specific client
   */
  async getEngagementScore(
    clientId: string,
    supplierId: string,
  ): Promise<EngagementScore | null> {
    const cacheKey = `engagement_score:${clientId}:${supplierId}`;

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    // Calculate fresh score
    const { data, error } = await this.supabase.rpc(
      'calculate_engagement_score',
      {
        p_client_id: clientId,
        p_supplier_id: supplierId,
      },
    );

    if (error) {
      console.error('Failed to calculate engagement score:', error);
      return null;
    }

    // Get the updated score record
    const { data: scoreData, error: scoreError } = await this.supabase
      .from('client_engagement_scores')
      .select('*')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .single();

    if (scoreError || !scoreData) {
      console.error('Failed to fetch engagement score:', scoreError);
      return null;
    }

    const result: EngagementScore = {
      client_id: scoreData.client_id,
      supplier_id: scoreData.supplier_id,
      score: scoreData.score,
      segment: scoreData.segment,
      factors: scoreData.factors,
      last_activity: scoreData.last_activity,
      calculated_at: scoreData.calculated_at,
    };

    // Cache for 5 minutes
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    return result;
  }

  /**
   * Get engagement scores for all clients of a supplier
   */
  async getSupplierEngagementScores(
    supplierId: string,
  ): Promise<EngagementScore[]> {
    const { data, error } = await this.supabase
      .from('client_engagement_scores')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('score', { ascending: false });

    if (error) {
      console.error('Failed to fetch supplier engagement scores:', error);
      return [];
    }

    return data.map((item) => ({
      client_id: item.client_id,
      supplier_id: item.supplier_id,
      score: item.score,
      segment: item.segment,
      factors: item.factors,
      last_activity: item.last_activity,
      calculated_at: item.calculated_at,
    }));
  }

  /**
   * Get clients by engagement segment
   */
  async getClientsBySegment(
    supplierId: string,
    segment: EngagementScore['segment'],
  ): Promise<EngagementScore[]> {
    const { data, error } = await this.supabase
      .from('client_engagement_scores')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('segment', segment)
      .order('calculated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch clients by segment:', error);
      return [];
    }

    return data.map((item) => ({
      client_id: item.client_id,
      supplier_id: item.supplier_id,
      score: item.score,
      segment: item.segment,
      factors: item.factors,
      last_activity: item.last_activity,
      calculated_at: item.calculated_at,
    }));
  }

  /**
   * Get at-risk alerts for a supplier
   */
  async getAtRiskAlerts(
    supplierId: string,
    resolved = false,
  ): Promise<AtRiskAlert[]> {
    let query = this.supabase
      .from('at_risk_alerts')
      .select(
        `
        *,
        clients!inner (
          name,
          wedding_date
        )
      `,
      )
      .eq('supplier_id', supplierId);

    if (!resolved) {
      query = query.is('resolved_at', null);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch at-risk alerts:', error);
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      client_id: item.client_id,
      supplier_id: item.supplier_id,
      client_name: item.clients.name,
      alert_type: item.alert_type,
      severity: item.severity,
      message: item.message,
      recommended_actions: item.recommended_actions,
      days_since_activity: Math.floor(
        (new Date().getTime() - new Date(item.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      wedding_date: item.clients.wedding_date,
      created_at: item.created_at,
    }));
  }

  /**
   * Resolve an at-risk alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('at_risk_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data for a supplier
   */
  async getAnalyticsDashboard(supplierId: string) {
    const { data: dashboardData, error } = await this.supabase
      .from('client_analytics_dashboard')
      .select('*')
      .eq('supplier_id', supplierId);

    if (error) {
      console.error('Failed to fetch analytics dashboard:', error);
      return null;
    }

    // Group by segments
    const segmentCounts = dashboardData.reduce(
      (acc, client) => {
        acc[client.segment] = (acc[client.segment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by activity status
    const activityCounts = dashboardData.reduce(
      (acc, client) => {
        acc[client.activity_status] = (acc[client.activity_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate averages
    const totalClients = dashboardData.length;
    const avgEngagementScore =
      totalClients > 0
        ? dashboardData.reduce(
            (sum, client) => sum + client.engagement_score,
            0,
          ) / totalClients
        : 0;

    const totalAlerts = dashboardData.reduce(
      (sum, client) => sum + client.open_alerts,
      0,
    );

    return {
      summary: {
        total_clients: totalClients,
        average_engagement_score: Math.round(avgEngagementScore),
        total_open_alerts: totalAlerts,
        at_risk_clients: activityCounts.at_risk || 0,
        ghost_clients: activityCounts.ghost || 0,
      },
      segments: segmentCounts,
      activity_status: activityCounts,
      clients: dashboardData,
      last_refreshed: new Date().toISOString(),
    };
  }

  /**
   * Run engagement scoring for all clients
   */
  async refreshAllEngagementScores(): Promise<{
    updated: number;
    alerts_created: number;
  }> {
    const { data, error } = await this.supabase.rpc('refresh_client_analytics');

    if (error) {
      console.error('Failed to refresh engagement scores:', error);
      throw error;
    }

    // Get count of updated scores
    const { count: updatedCount } = await this.supabase
      .from('client_engagement_scores')
      .select('*', { count: 'exact', head: true })
      .gte('calculated_at', new Date(Date.now() - 60000).toISOString()); // Last minute

    // Get count of new alerts
    const { count: alertsCount } = await this.supabase
      .from('at_risk_alerts')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute

    return {
      updated: updatedCount || 0,
      alerts_created: alertsCount || 0,
    };
  }

  /**
   * Invalidate cached engagement score
   */
  private async invalidateScoreCache(
    clientId: string,
    supplierId: string,
  ): Promise<void> {
    const cacheKey = `engagement_score:${clientId}:${supplierId}`;
    try {
      await redis.del(cacheKey);
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Helper method to track common events with proper context
   */
  async trackEmailOpen(
    clientId: string,
    supplierId: string,
    emailId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      client_id: clientId,
      supplier_id: supplierId,
      event_type: 'email_open',
      event_data: { email_id: emailId, ...metadata },
    });
  }

  async trackPortalLogin(
    clientId: string,
    supplierId: string,
    sessionData?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      client_id: clientId,
      supplier_id: supplierId,
      event_type: 'portal_login',
      event_data: sessionData,
      session_id: sessionData?.session_id,
      user_agent: sessionData?.user_agent,
      ip_address: sessionData?.ip_address,
    });
  }

  async trackFormSubmission(
    clientId: string,
    supplierId: string,
    formId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      client_id: clientId,
      supplier_id: supplierId,
      event_type: 'form_submit',
      event_data: { form_id: formId, ...metadata },
    });
  }
}

// Singleton instance
export const engagementScoringService = new EngagementScoringService();
