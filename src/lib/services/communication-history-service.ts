import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Communication History Service
 * Track and manage all messages sent to each guest with comprehensive history
 */

export interface CommunicationRecord {
  id: string;
  message_id: string;
  guest_id: string;
  couple_id: string;
  communication_type: 'email' | 'sms';
  direction: 'outbound' | 'inbound';
  subject?: string;
  content: string;
  template_id?: string;
  campaign_id?: string;
  provider: string;
  status:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'failed'
    | 'replied';
  sent_at: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  replied_at?: Date;
  failed_at?: Date;
  engagement_score: number;
  metadata: {
    user_agent?: string;
    ip_address?: string;
    device_type?: string;
    open_count?: number;
    click_count?: number;
    segments_used?: number;
    cost?: number;
    tags?: string[];
  };
  created_at: Date;
  updated_at: Date;
}

export interface GuestCommunicationSummary {
  guest_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  total_messages: number;
  messages_by_type: {
    email: number;
    sms: number;
  };
  messages_by_status: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    failed: number;
  };
  engagement_metrics: {
    total_engagement_score: number;
    average_engagement_score: number;
    email_open_rate: number;
    email_click_rate: number;
    sms_response_rate: number;
    last_interaction: Date | null;
    days_since_last_interaction: number | null;
  };
  communication_timeline: Array<{
    date: Date;
    message_count: number;
    engagement_events: number;
  }>;
  recent_messages: CommunicationRecord[];
  preferences: {
    unsubscribed_email: boolean;
    unsubscribed_sms: boolean;
    preferred_method?: 'email' | 'sms';
  };
}

export interface CommunicationAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  overall_metrics: {
    total_messages: number;
    total_guests_contacted: number;
    average_messages_per_guest: number;
    total_engagement_events: number;
    overall_engagement_rate: number;
  };
  by_type: {
    email: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      delivery_rate: number;
      open_rate: number;
      click_rate: number;
    };
    sms: {
      sent: number;
      delivered: number;
      replied: number;
      failed: number;
      delivery_rate: number;
      response_rate: number;
    };
  };
  by_campaign: Array<{
    campaign_id: string;
    campaign_name: string;
    messages_sent: number;
    engagement_rate: number;
    cost: number;
  }>;
  engagement_trends: Array<{
    date: string;
    messages_sent: number;
    engagement_events: number;
    engagement_rate: number;
  }>;
  top_engaging_guests: Array<{
    guest_id: string;
    guest_name: string;
    engagement_score: number;
    message_count: number;
  }>;
}

export class CommunicationHistoryService {
  private static instance: CommunicationHistoryService;

  static getInstance(): CommunicationHistoryService {
    if (!CommunicationHistoryService.instance) {
      CommunicationHistoryService.instance = new CommunicationHistoryService();
    }
    return CommunicationHistoryService.instance;
  }

  /**
   * Record a new communication event
   */
  async recordCommunication(
    record: Omit<
      CommunicationRecord,
      'id' | 'engagement_score' | 'created_at' | 'updated_at'
    >,
  ): Promise<string> {
    try {
      const engagementScore = this.calculateEngagementScore(
        record.status,
        record.metadata,
      );

      const { data, error } = await supabase
        .from('communication_history')
        .insert({
          message_id: record.message_id,
          guest_id: record.guest_id,
          couple_id: record.couple_id,
          communication_type: record.communication_type,
          direction: record.direction,
          subject: record.subject,
          content: record.content,
          template_id: record.template_id,
          campaign_id: record.campaign_id,
          provider: record.provider,
          status: record.status,
          sent_at: record.sent_at.toISOString(),
          delivered_at: record.delivered_at?.toISOString(),
          opened_at: record.opened_at?.toISOString(),
          clicked_at: record.clicked_at?.toISOString(),
          replied_at: record.replied_at?.toISOString(),
          failed_at: record.failed_at?.toISOString(),
          engagement_score: engagementScore,
          metadata: record.metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error recording communication:', error);
      throw error;
    }
  }

  /**
   * Update communication status (e.g., when delivery status changes)
   */
  async updateCommunicationStatus(
    messageId: string,
    status: CommunicationRecord['status'],
    metadata?: {
      delivered_at?: Date;
      opened_at?: Date;
      clicked_at?: Date;
      replied_at?: Date;
      failed_at?: Date;
      additional_metadata?: any;
    },
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add timestamps based on status
      if (metadata?.delivered_at)
        updateData.delivered_at = metadata.delivered_at.toISOString();
      if (metadata?.opened_at)
        updateData.opened_at = metadata.opened_at.toISOString();
      if (metadata?.clicked_at)
        updateData.clicked_at = metadata.clicked_at.toISOString();
      if (metadata?.replied_at)
        updateData.replied_at = metadata.replied_at.toISOString();
      if (metadata?.failed_at)
        updateData.failed_at = metadata.failed_at.toISOString();

      // Update metadata
      if (metadata?.additional_metadata) {
        const { data: currentRecord, error: fetchError } = await supabase
          .from('communication_history')
          .select('metadata')
          .eq('message_id', messageId)
          .single();

        if (!fetchError && currentRecord) {
          updateData.metadata = {
            ...currentRecord.metadata,
            ...metadata.additional_metadata,
          };
        }
      }

      // Recalculate engagement score
      updateData.engagement_score = this.calculateEngagementScore(
        status,
        updateData.metadata,
      );

      const { error } = await supabase
        .from('communication_history')
        .update(updateData)
        .eq('message_id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating communication status:', error);
      throw error;
    }
  }

  /**
   * Get communication history for a specific guest
   */
  async getGuestCommunicationHistory(
    guestId: string,
    options?: {
      communication_type?: 'email' | 'sms';
      limit?: number;
      offset?: number;
      date_range?: { start: Date; end: Date };
    },
  ): Promise<CommunicationRecord[]> {
    try {
      let query = supabase
        .from('communication_history')
        .select('*')
        .eq('guest_id', guestId)
        .order('sent_at', { ascending: false });

      if (options?.communication_type) {
        query = query.eq('communication_type', options.communication_type);
      }

      if (options?.date_range) {
        query = query
          .gte('sent_at', options.date_range.start.toISOString())
          .lte('sent_at', options.date_range.end.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 50) - 1,
        );
      }

      const { data: records, error } = await query;

      if (error) throw error;

      return (
        records?.map((record) => this.convertToCommunicationRecord(record)) ||
        []
      );
    } catch (error) {
      console.error('Error getting guest communication history:', error);
      throw error;
    }
  }

  /**
   * Get communication summary for a guest
   */
  async getGuestCommunicationSummary(
    guestId: string,
  ): Promise<GuestCommunicationSummary> {
    try {
      // Get guest info
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('first_name, last_name, email, phone')
        .eq('id', guestId)
        .single();

      if (guestError || !guest) throw guestError;

      // Get communication history
      const records = await this.getGuestCommunicationHistory(guestId);

      // Get communication preferences
      const { data: preferences, error: prefError } = await supabase
        .from('guest_communication_preferences')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      // Calculate metrics
      const messagesByType = records.reduce(
        (acc, record) => {
          acc[record.communication_type]++;
          return acc;
        },
        { email: 0, sms: 0 },
      );

      const messagesByStatus = records.reduce(
        (acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        },
        { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, failed: 0 },
      );

      const emailRecords = records.filter(
        (r) => r.communication_type === 'email',
      );
      const smsRecords = records.filter((r) => r.communication_type === 'sms');

      const totalEngagementScore = records.reduce(
        (sum, record) => sum + record.engagement_score,
        0,
      );
      const avgEngagementScore =
        records.length > 0 ? totalEngagementScore / records.length : 0;

      const emailOpenRate =
        emailRecords.length > 0
          ? (emailRecords.filter((r) => r.opened_at).length /
              emailRecords.length) *
            100
          : 0;

      const emailClickRate =
        emailRecords.filter((r) => r.opened_at).length > 0
          ? (emailRecords.filter((r) => r.clicked_at).length /
              emailRecords.filter((r) => r.opened_at).length) *
            100
          : 0;

      const smsResponseRate =
        smsRecords.length > 0
          ? (smsRecords.filter((r) => r.replied_at).length /
              smsRecords.length) *
            100
          : 0;

      const lastInteraction = records.find(
        (r) => r.opened_at || r.clicked_at || r.replied_at,
      );
      const lastInteractionDate =
        lastInteraction?.opened_at ||
        lastInteraction?.clicked_at ||
        lastInteraction?.replied_at;
      const daysSinceLastInteraction = lastInteractionDate
        ? Math.floor(
            (Date.now() - lastInteractionDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      // Create timeline
      const timeline = this.createCommunicationTimeline(records);

      return {
        guest_id: guestId,
        guest_name: `${guest.first_name} ${guest.last_name}`,
        guest_email: guest.email,
        guest_phone: guest.phone,
        total_messages: records.length,
        messages_by_type: messagesByType,
        messages_by_status: messagesByStatus,
        engagement_metrics: {
          total_engagement_score: totalEngagementScore,
          average_engagement_score: Math.round(avgEngagementScore * 10) / 10,
          email_open_rate: Math.round(emailOpenRate * 10) / 10,
          email_click_rate: Math.round(emailClickRate * 10) / 10,
          sms_response_rate: Math.round(smsResponseRate * 10) / 10,
          last_interaction: lastInteractionDate,
          days_since_last_interaction: daysSinceLastInteraction,
        },
        communication_timeline: timeline,
        recent_messages: records.slice(0, 10),
        preferences: {
          unsubscribed_email: preferences?.email_unsubscribed || false,
          unsubscribed_sms: preferences?.sms_unsubscribed || false,
          preferred_method: preferences?.preferred_method,
        },
      };
    } catch (error) {
      console.error('Error getting guest communication summary:', error);
      throw error;
    }
  }

  /**
   * Get communication analytics for a couple
   */
  async getCommunicationAnalytics(
    coupleId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<CommunicationAnalytics> {
    try {
      // Get all communications in date range
      const { data: records, error } = await supabase
        .from('communication_history')
        .select('*')
        .eq('couple_id', coupleId)
        .gte('sent_at', dateRange.start.toISOString())
        .lte('sent_at', dateRange.end.toISOString());

      if (error) throw error;

      const communications =
        records?.map((r) => this.convertToCommunicationRecord(r)) || [];

      // Calculate overall metrics
      const uniqueGuests = new Set(communications.map((c) => c.guest_id));
      const engagementEvents = communications.filter(
        (c) => c.opened_at || c.clicked_at || c.replied_at,
      ).length;

      const overallMetrics = {
        total_messages: communications.length,
        total_guests_contacted: uniqueGuests.size,
        average_messages_per_guest:
          uniqueGuests.size > 0 ? communications.length / uniqueGuests.size : 0,
        total_engagement_events: engagementEvents,
        overall_engagement_rate:
          communications.length > 0
            ? (engagementEvents / communications.length) * 100
            : 0,
      };

      // Calculate by type metrics
      const emailCommunications = communications.filter(
        (c) => c.communication_type === 'email',
      );
      const smsCommunications = communications.filter(
        (c) => c.communication_type === 'sms',
      );

      const byType = {
        email: {
          sent: emailCommunications.length,
          delivered: emailCommunications.filter((c) => c.delivered_at).length,
          opened: emailCommunications.filter((c) => c.opened_at).length,
          clicked: emailCommunications.filter((c) => c.clicked_at).length,
          bounced: emailCommunications.filter((c) => c.status === 'bounced')
            .length,
          delivery_rate:
            emailCommunications.length > 0
              ? (emailCommunications.filter((c) => c.delivered_at).length /
                  emailCommunications.length) *
                100
              : 0,
          open_rate:
            emailCommunications.filter((c) => c.delivered_at).length > 0
              ? (emailCommunications.filter((c) => c.opened_at).length /
                  emailCommunications.filter((c) => c.delivered_at).length) *
                100
              : 0,
          click_rate:
            emailCommunications.filter((c) => c.opened_at).length > 0
              ? (emailCommunications.filter((c) => c.clicked_at).length /
                  emailCommunications.filter((c) => c.opened_at).length) *
                100
              : 0,
        },
        sms: {
          sent: smsCommunications.length,
          delivered: smsCommunications.filter((c) => c.delivered_at).length,
          replied: smsCommunications.filter((c) => c.replied_at).length,
          failed: smsCommunications.filter((c) => c.status === 'failed').length,
          delivery_rate:
            smsCommunications.length > 0
              ? (smsCommunications.filter((c) => c.delivered_at).length /
                  smsCommunications.length) *
                100
              : 0,
          response_rate:
            smsCommunications.length > 0
              ? (smsCommunications.filter((c) => c.replied_at).length /
                  smsCommunications.length) *
                100
              : 0,
        },
      };

      // Get campaign metrics
      const campaignMap = new Map<string, any>();
      communications.forEach((comm) => {
        if (comm.campaign_id) {
          if (!campaignMap.has(comm.campaign_id)) {
            campaignMap.set(comm.campaign_id, {
              campaign_id: comm.campaign_id,
              campaign_name: `Campaign ${comm.campaign_id}`,
              messages_sent: 0,
              engagement_events: 0,
              cost: 0,
            });
          }
          const campaign = campaignMap.get(comm.campaign_id);
          campaign.messages_sent++;
          if (comm.opened_at || comm.clicked_at || comm.replied_at) {
            campaign.engagement_events++;
          }
          if (comm.metadata.cost) {
            campaign.cost += comm.metadata.cost;
          }
        }
      });

      const byCampaign = Array.from(campaignMap.values()).map((campaign) => ({
        ...campaign,
        engagement_rate:
          campaign.messages_sent > 0
            ? (campaign.engagement_events / campaign.messages_sent) * 100
            : 0,
      }));

      // Create engagement trends
      const trendsMap = new Map<string, any>();
      communications.forEach((comm) => {
        const date = comm.sent_at.toISOString().split('T')[0];
        if (!trendsMap.has(date)) {
          trendsMap.set(date, {
            date,
            messages_sent: 0,
            engagement_events: 0,
          });
        }
        const trend = trendsMap.get(date);
        trend.messages_sent++;
        if (comm.opened_at || comm.clicked_at || comm.replied_at) {
          trend.engagement_events++;
        }
      });

      const engagementTrends = Array.from(trendsMap.values())
        .map((trend) => ({
          ...trend,
          engagement_rate:
            trend.messages_sent > 0
              ? (trend.engagement_events / trend.messages_sent) * 100
              : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get top engaging guests
      const guestEngagementMap = new Map<string, any>();
      communications.forEach((comm) => {
        if (!guestEngagementMap.has(comm.guest_id)) {
          guestEngagementMap.set(comm.guest_id, {
            guest_id: comm.guest_id,
            engagement_score: 0,
            message_count: 0,
          });
        }
        const guestData = guestEngagementMap.get(comm.guest_id);
        guestData.engagement_score += comm.engagement_score;
        guestData.message_count++;
      });

      // Get guest names
      const topGuestIds = Array.from(guestEngagementMap.values())
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, 10)
        .map((g) => g.guest_id);

      const { data: guestNames } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .in('id', topGuestIds);

      const topEngagingGuests = Array.from(guestEngagementMap.values())
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, 10)
        .map((guest) => {
          const guestInfo = guestNames?.find((g) => g.id === guest.guest_id);
          return {
            guest_id: guest.guest_id,
            guest_name: guestInfo
              ? `${guestInfo.first_name} ${guestInfo.last_name}`
              : 'Unknown Guest',
            engagement_score: guest.engagement_score,
            message_count: guest.message_count,
          };
        });

      return {
        period: dateRange,
        overall_metrics: overallMetrics,
        by_type: byType,
        by_campaign: byCampaign,
        engagement_trends: engagementTrends,
        top_engaging_guests: topEngagingGuests,
      };
    } catch (error) {
      console.error('Error getting communication analytics:', error);
      throw error;
    }
  }

  /**
   * Search communication history
   */
  async searchCommunicationHistory(
    coupleId: string,
    searchParams: {
      query?: string;
      guest_id?: string;
      communication_type?: 'email' | 'sms';
      status?: CommunicationRecord['status'];
      campaign_id?: string;
      date_range?: { start: Date; end: Date };
      limit?: number;
    },
  ): Promise<CommunicationRecord[]> {
    try {
      let query = supabase
        .from('communication_history')
        .select('*')
        .eq('couple_id', coupleId);

      if (searchParams.guest_id) {
        query = query.eq('guest_id', searchParams.guest_id);
      }

      if (searchParams.communication_type) {
        query = query.eq('communication_type', searchParams.communication_type);
      }

      if (searchParams.status) {
        query = query.eq('status', searchParams.status);
      }

      if (searchParams.campaign_id) {
        query = query.eq('campaign_id', searchParams.campaign_id);
      }

      if (searchParams.date_range) {
        query = query
          .gte('sent_at', searchParams.date_range.start.toISOString())
          .lte('sent_at', searchParams.date_range.end.toISOString());
      }

      if (searchParams.query) {
        // Search in subject and content
        query = query.or(
          `subject.ilike.%${searchParams.query}%,content.ilike.%${searchParams.query}%`,
        );
      }

      query = query
        .order('sent_at', { ascending: false })
        .limit(searchParams.limit || 100);

      const { data: records, error } = await query;

      if (error) throw error;

      return (
        records?.map((record) => this.convertToCommunicationRecord(record)) ||
        []
      );
    } catch (error) {
      console.error('Error searching communication history:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement score based on status and metadata
   */
  private calculateEngagementScore(
    status: CommunicationRecord['status'],
    metadata: any = {},
  ): number {
    let score = 0;

    switch (status) {
      case 'sent':
        score = 1;
        break;
      case 'delivered':
        score = 2;
        break;
      case 'opened':
        score = 3;
        break;
      case 'clicked':
        score = 5;
        break;
      case 'replied':
        score = 10;
        break;
      case 'failed':
      case 'bounced':
        score = 0;
        break;
    }

    // Bonus points for multiple interactions
    if (metadata.open_count && metadata.open_count > 1) {
      score += Math.min(metadata.open_count - 1, 3); // Max 3 bonus points
    }

    if (metadata.click_count && metadata.click_count > 1) {
      score += Math.min(metadata.click_count - 1, 5); // Max 5 bonus points
    }

    return Math.min(score, 20); // Cap at 20 points
  }

  /**
   * Create communication timeline
   */
  private createCommunicationTimeline(records: CommunicationRecord[]): Array<{
    date: Date;
    message_count: number;
    engagement_events: number;
  }> {
    const timelineMap = new Map<string, any>();

    records.forEach((record) => {
      const date = record.sent_at.toISOString().split('T')[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date: new Date(date),
          message_count: 0,
          engagement_events: 0,
        });
      }
      const entry = timelineMap.get(date);
      entry.message_count++;
      if (record.opened_at || record.clicked_at || record.replied_at) {
        entry.engagement_events++;
      }
    });

    return Array.from(timelineMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }

  /**
   * Convert database record to CommunicationRecord
   */
  private convertToCommunicationRecord(record: any): CommunicationRecord {
    return {
      id: record.id,
      message_id: record.message_id,
      guest_id: record.guest_id,
      couple_id: record.couple_id,
      communication_type: record.communication_type,
      direction: record.direction,
      subject: record.subject,
      content: record.content,
      template_id: record.template_id,
      campaign_id: record.campaign_id,
      provider: record.provider,
      status: record.status,
      sent_at: new Date(record.sent_at),
      delivered_at: record.delivered_at
        ? new Date(record.delivered_at)
        : undefined,
      opened_at: record.opened_at ? new Date(record.opened_at) : undefined,
      clicked_at: record.clicked_at ? new Date(record.clicked_at) : undefined,
      replied_at: record.replied_at ? new Date(record.replied_at) : undefined,
      failed_at: record.failed_at ? new Date(record.failed_at) : undefined,
      engagement_score: record.engagement_score,
      metadata: record.metadata || {},
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at),
    };
  }

  /**
   * Export communication history to CSV
   */
  async exportCommunicationHistory(
    coupleId: string,
    options?: {
      date_range?: { start: Date; end: Date };
      communication_type?: 'email' | 'sms';
    },
  ): Promise<string> {
    try {
      const records = await this.searchCommunicationHistory(coupleId, {
        ...options,
        limit: 10000, // Large limit for export
      });

      const csvHeaders = [
        'Date',
        'Guest Name',
        'Type',
        'Subject',
        'Status',
        'Provider',
        'Engagement Score',
        'Delivered At',
        'Opened At',
        'Clicked At',
        'Replied At',
      ];

      // Get guest names
      const guestIds = [...new Set(records.map((r) => r.guest_id))];
      const { data: guests } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .in('id', guestIds);

      const guestMap = new Map(
        guests?.map((g) => [g.id, `${g.first_name} ${g.last_name}`]) || [],
      );

      const csvRows = records.map((record) => [
        record.sent_at.toISOString(),
        guestMap.get(record.guest_id) || 'Unknown Guest',
        record.communication_type,
        record.subject || '',
        record.status,
        record.provider,
        record.engagement_score.toString(),
        record.delivered_at?.toISOString() || '',
        record.opened_at?.toISOString() || '',
        record.clicked_at?.toISOString() || '',
        record.replied_at?.toISOString() || '',
      ]);

      return [csvHeaders, ...csvRows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');
    } catch (error) {
      console.error('Error exporting communication history:', error);
      throw error;
    }
  }
}

export const communicationHistoryService =
  CommunicationHistoryService.getInstance();
