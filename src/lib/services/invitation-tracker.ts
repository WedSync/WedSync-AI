import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';

export interface TrackingEventData {
  invitation_id: string;
  event_type:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'accepted'
    | 'declined'
    | 'bounced'
    | 'spam';
  timestamp?: string;
  user_agent?: string;
  ip_address?: string;
  location_data?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  device_info?: {
    device_type?: string;
    browser?: string;
    os?: string;
  };
  metadata?: Record<string, any>;
}

export interface TrackingAnalytics {
  event_counts: Record<string, number>;
  conversion_funnel: Array<{
    event_type: string;
    count: number;
    conversion_rate: number;
  }>;
  time_series: Array<{
    date: string;
    events: Record<string, number>;
  }>;
  performance_metrics: {
    delivery_rate: number;
    open_rate: number;
    click_through_rate: number;
    conversion_rate: number;
    avg_time_to_open: number;
    avg_time_to_click: number;
    avg_time_to_convert: number;
  };
  device_breakdown: Record<string, number>;
  location_breakdown: Record<string, number>;
}

export interface InvitationEvent {
  id: string;
  invitation_id: string;
  event_type: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
  location_data?: Record<string, any>;
  device_info?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class InvitationTracker {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Track single or multiple invitation events
   */
  async trackEvents(events: TrackingEventData[]): Promise<{
    trackedEvents: InvitationEvent[];
    failedEvents: Array<{ event: TrackingEventData; error: string }>;
  }> {
    const trackedEvents: InvitationEvent[] = [];
    const failedEvents: Array<{ event: TrackingEventData; error: string }> = [];

    for (const event of events) {
      try {
        const trackedEvent = await this.trackSingleEvent(event);
        trackedEvents.push(trackedEvent);
      } catch (error) {
        failedEvents.push({
          event,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { trackedEvents, failedEvents };
  }

  /**
   * Track a single invitation event
   */
  private async trackSingleEvent(
    eventData: TrackingEventData,
  ): Promise<InvitationEvent> {
    try {
      // Validate that invitation exists
      const { data: invitation, error: invitationError } = await this.supabase
        .from('viral_invitations')
        .select('id, status, sender_id')
        .eq('id', eventData.invitation_id)
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found');
      }

      // Prevent tracking events for deleted invitations
      if (invitation.status === 'deleted') {
        throw new Error('Cannot track events for deleted invitation');
      }

      // Create tracking event
      const trackingData = {
        invitation_id: eventData.invitation_id,
        event_type: eventData.event_type,
        timestamp: eventData.timestamp || new Date().toISOString(),
        user_agent: eventData.user_agent,
        ip_address: eventData.ip_address,
        location_data: eventData.location_data || {},
        device_info: eventData.device_info || {},
        metadata: eventData.metadata || {},
        created_at: new Date().toISOString(),
      };

      const { data: trackingEvent, error } = await this.supabase
        .from('invitation_tracking_events')
        .insert(trackingData)
        .select()
        .single();

      if (error) throw error;

      // Update invitation status based on event type
      await this.updateInvitationStatus(
        eventData.invitation_id,
        eventData.event_type,
        trackingData.timestamp,
      );

      return trackingEvent;
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Get tracking events for a specific invitation
   */
  async getInvitationEvents(params: {
    invitationId: string;
    userId: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<InvitationEvent[]> {
    try {
      // Verify user has access to this invitation
      const { data: invitation, error: invitationError } = await this.supabase
        .from('viral_invitations')
        .select('sender_id')
        .eq('id', params.invitationId)
        .eq('sender_id', params.userId)
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found or access denied');
      }

      let query = this.supabase
        .from('invitation_tracking_events')
        .select('*')
        .eq('invitation_id', params.invitationId)
        .order('timestamp', { ascending: true });

      if (params.eventType) {
        query = query.eq('event_type', params.eventType);
      }

      if (params.dateFrom) {
        query = query.gte('timestamp', params.dateFrom);
      }

      if (params.dateTo) {
        query = query.lte('timestamp', params.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting invitation events:', error);
      throw new Error(
        `Failed to get invitation events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get comprehensive tracking analytics
   */
  async getTrackingAnalytics(params: {
    userId: string;
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string;
    eventType?: string;
    invitationType?: string;
  }): Promise<TrackingAnalytics> {
    try {
      // Get base query for user's invitations
      let invitationQuery = this.supabase
        .from('viral_invitations')
        .select('id, invitation_type')
        .eq('sender_id', params.userId);

      if (params.invitationType) {
        invitationQuery = invitationQuery.eq(
          'invitation_type',
          params.invitationType,
        );
      }

      if (params.dateFrom) {
        invitationQuery = invitationQuery.gte('created_at', params.dateFrom);
      }

      if (params.dateTo) {
        invitationQuery = invitationQuery.lte('created_at', params.dateTo);
      }

      const { data: invitations, error: invitationError } =
        await invitationQuery;

      if (invitationError) throw invitationError;

      if (!invitations || invitations.length === 0) {
        return this.getEmptyAnalytics();
      }

      const invitationIds = invitations.map((inv) => inv.id);

      // Get tracking events for these invitations
      let eventQuery = this.supabase
        .from('invitation_tracking_events')
        .select('*')
        .in('invitation_id', invitationIds);

      if (params.eventType) {
        eventQuery = eventQuery.eq('event_type', params.eventType);
      }

      if (params.dateFrom) {
        eventQuery = eventQuery.gte('timestamp', params.dateFrom);
      }

      if (params.dateTo) {
        eventQuery = eventQuery.lte('timestamp', params.dateTo);
      }

      const { data: events, error: eventsError } = await eventQuery;

      if (eventsError) throw eventsError;

      return this.calculateAnalytics(events || [], invitations);
    } catch (error) {
      console.error('Error getting tracking analytics:', error);
      throw new Error(
        `Failed to get tracking analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a tracking event
   */
  async updateTrackingEvent(params: {
    eventId: string;
    updates: Partial<TrackingEventData>;
    userId: string;
  }): Promise<InvitationEvent> {
    try {
      // Verify user has access to this event
      const { data: event, error: eventError } = await this.supabase
        .from('invitation_tracking_events')
        .select(
          `
          *,
          viral_invitations!inner(sender_id)
        `,
        )
        .eq('id', params.eventId)
        .eq('viral_invitations.sender_id', params.userId)
        .single();

      if (eventError || !event) {
        throw new Error('Tracking event not found or access denied');
      }

      const updateData = {
        ...params.updates,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedEvent, error } = await this.supabase
        .from('invitation_tracking_events')
        .update(updateData)
        .eq('id', params.eventId)
        .select()
        .single();

      if (error) throw error;

      return updatedEvent;
    } catch (error) {
      console.error('Error updating tracking event:', error);
      throw new Error(
        `Failed to update tracking event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete tracking events (admin only)
   */
  async deleteTrackingEvents(params: {
    eventIds?: string[];
    invitationId?: string;
    beforeDate?: string;
  }): Promise<{ deletedCount: number }> {
    try {
      let query = this.supabase.from('invitation_tracking_events').delete();

      if (params.eventIds && params.eventIds.length > 0) {
        query = query.in('id', params.eventIds);
      } else if (params.invitationId) {
        query = query.eq('invitation_id', params.invitationId);
      } else if (params.beforeDate) {
        query = query.lt('timestamp', params.beforeDate);
      } else {
        throw new Error('Must specify eventIds, invitationId, or beforeDate');
      }

      const { data, error } = await query.select('id');

      if (error) throw error;

      return {
        deletedCount: data?.length || 0,
      };
    } catch (error) {
      console.error('Error deleting tracking events:', error);
      throw new Error(
        `Failed to delete tracking events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(params: {
    userId: string;
    dateFrom?: string;
    dateTo?: string;
    invitationType?: string;
  }): Promise<
    Array<{
      stage: string;
      count: number;
      conversion_rate: number;
      drop_off_rate: number;
    }>
  > {
    try {
      const analytics = await this.getTrackingAnalytics(params);

      const funnelOrder = [
        'sent',
        'delivered',
        'opened',
        'clicked',
        'accepted',
      ];
      const funnel = [];
      let previousCount = 0;

      for (let i = 0; i < funnelOrder.length; i++) {
        const stage = funnelOrder[i];
        const count = analytics.event_counts[stage] || 0;
        const conversionRate =
          i === 0 ? 100 : previousCount > 0 ? (count / previousCount) * 100 : 0;
        const dropOffRate =
          i === 0
            ? 0
            : previousCount > 0
              ? ((previousCount - count) / previousCount) * 100
              : 0;

        funnel.push({
          stage,
          count,
          conversion_rate: parseFloat(conversionRate.toFixed(2)),
          drop_off_rate: parseFloat(dropOffRate.toFixed(2)),
        });

        previousCount = count;
      }

      return funnel;
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      throw new Error(
        `Failed to get conversion funnel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get real-time tracking statistics
   */
  async getRealtimeStats(userId: string): Promise<{
    events_last_hour: number;
    events_last_24h: number;
    top_performing_invitations: Array<{
      invitation_id: string;
      recipient_email: string;
      events_count: number;
      latest_event: string;
    }>;
    recent_events: InvitationEvent[];
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(
        now.getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();

      // Get user's invitation IDs
      const { data: invitations } = await this.supabase
        .from('viral_invitations')
        .select('id, recipient_email')
        .eq('sender_id', userId);

      if (!invitations || invitations.length === 0) {
        return {
          events_last_hour: 0,
          events_last_24h: 0,
          top_performing_invitations: [],
          recent_events: [],
        };
      }

      const invitationIds = invitations.map((inv) => inv.id);

      // Get events in different time windows
      const [eventsLastHour, eventsLast24h, recentEvents] = await Promise.all([
        this.supabase
          .from('invitation_tracking_events')
          .select('id', { count: 'exact' })
          .in('invitation_id', invitationIds)
          .gte('timestamp', oneHourAgo),

        this.supabase
          .from('invitation_tracking_events')
          .select('id', { count: 'exact' })
          .in('invitation_id', invitationIds)
          .gte('timestamp', twentyFourHoursAgo),

        this.supabase
          .from('invitation_tracking_events')
          .select('*')
          .in('invitation_id', invitationIds)
          .order('timestamp', { ascending: false })
          .limit(20),
      ]);

      // Get top performing invitations
      const { data: topPerforming } = await this.supabase
        .from('invitation_tracking_events')
        .select('invitation_id, event_type, timestamp')
        .in('invitation_id', invitationIds)
        .gte('timestamp', twentyFourHoursAgo);

      const performanceMap = new Map();
      topPerforming?.forEach((event) => {
        const key = event.invitation_id;
        if (!performanceMap.has(key)) {
          performanceMap.set(key, { count: 0, latest_event: event.event_type });
        }
        performanceMap.get(key).count++;
        if (
          new Date(event.timestamp) >
          new Date(performanceMap.get(key).latest_timestamp || 0)
        ) {
          performanceMap.get(key).latest_event = event.event_type;
          performanceMap.get(key).latest_timestamp = event.timestamp;
        }
      });

      const topPerformingInvitations = Array.from(performanceMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([invitationId, stats]) => {
          const invitation = invitations.find((inv) => inv.id === invitationId);
          return {
            invitation_id: invitationId,
            recipient_email: invitation?.recipient_email || 'Unknown',
            events_count: stats.count,
            latest_event: stats.latest_event,
          };
        });

      return {
        events_last_hour: eventsLastHour.count || 0,
        events_last_24h: eventsLast24h.count || 0,
        top_performing_invitations: topPerformingInvitations,
        recent_events: recentEvents.data || [],
      };
    } catch (error) {
      console.error('Error getting realtime stats:', error);
      throw new Error(
        `Failed to get realtime stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Private helper methods

  private async updateInvitationStatus(
    invitationId: string,
    eventType: string,
    timestamp: string,
  ): Promise<void> {
    try {
      const statusMap: Record<string, string> = {
        sent: 'sent',
        delivered: 'delivered',
        opened: 'opened',
        clicked: 'clicked',
        accepted: 'accepted',
        declined: 'declined',
        bounced: 'bounced',
      };

      const newStatus = statusMap[eventType];
      if (!newStatus) return;

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add specific timestamp fields
      switch (eventType) {
        case 'delivered':
          updateData.delivered_at = timestamp;
          break;
        case 'opened':
          updateData.opened_at = timestamp;
          break;
        case 'clicked':
          updateData.clicked_at = timestamp;
          break;
        case 'accepted':
          updateData.accepted_at = timestamp;
          break;
      }

      await this.supabase
        .from('viral_invitations')
        .update(updateData)
        .eq('id', invitationId);
    } catch (error) {
      console.error('Error updating invitation status:', error);
      // Don't throw here as tracking event was already created
    }
  }

  private calculateAnalytics(
    events: InvitationEvent[],
    invitations: any[],
  ): TrackingAnalytics {
    // Event counts
    const eventCounts = events.reduce(
      (acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Conversion funnel
    const funnelOrder = ['sent', 'delivered', 'opened', 'clicked', 'accepted'];
    const conversionFunnel = funnelOrder.map((eventType, index) => {
      const count = eventCounts[eventType] || 0;
      const previousCount =
        index > 0
          ? eventCounts[funnelOrder[index - 1]] || 0
          : invitations.length;
      const conversionRate =
        previousCount > 0 ? (count / previousCount) * 100 : 0;

      return {
        event_type: eventType,
        count,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
      };
    });

    // Time series (simplified - daily aggregation)
    const timeSeriesMap = new Map();
    events.forEach((event) => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {});
      }
      const dayEvents = timeSeriesMap.get(date);
      dayEvents[event.event_type] = (dayEvents[event.event_type] || 0) + 1;
    });

    const timeSeries = Array.from(timeSeriesMap.entries()).map(
      ([date, events]) => ({
        date,
        events,
      }),
    );

    // Performance metrics
    const sent = eventCounts.sent || 0;
    const delivered = eventCounts.delivered || 0;
    const opened = eventCounts.opened || 0;
    const clicked = eventCounts.clicked || 0;
    const accepted = eventCounts.accepted || 0;

    const performanceMetrics = {
      delivery_rate: sent > 0 ? (delivered / sent) * 100 : 0,
      open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
      click_through_rate: opened > 0 ? (clicked / opened) * 100 : 0,
      conversion_rate: clicked > 0 ? (accepted / clicked) * 100 : 0,
      avg_time_to_open: 0, // Would need more complex calculation
      avg_time_to_click: 0, // Would need more complex calculation
      avg_time_to_convert: 0, // Would need more complex calculation
    };

    // Device and location breakdowns
    const deviceBreakdown = events.reduce(
      (acc, event) => {
        const deviceType = event.device_info?.device_type || 'Unknown';
        acc[deviceType] = (acc[deviceType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const locationBreakdown = events.reduce(
      (acc, event) => {
        const country = event.location_data?.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      event_counts: eventCounts,
      conversion_funnel: conversionFunnel,
      time_series: timeSeries,
      performance_metrics: performanceMetrics,
      device_breakdown: deviceBreakdown,
      location_breakdown: locationBreakdown,
    };
  }

  private getEmptyAnalytics(): TrackingAnalytics {
    return {
      event_counts: {},
      conversion_funnel: [],
      time_series: [],
      performance_metrics: {
        delivery_rate: 0,
        open_rate: 0,
        click_through_rate: 0,
        conversion_rate: 0,
        avg_time_to_open: 0,
        avg_time_to_click: 0,
        avg_time_to_convert: 0,
      },
      device_breakdown: {},
      location_breakdown: {},
    };
  }
}
