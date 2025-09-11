import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

// Analytics Event Types
export interface EmailAnalyticsEvent {
  id: string;
  eventType:
    | 'email_sent'
    | 'email_delivered'
    | 'email_opened'
    | 'email_clicked'
    | 'email_bounced'
    | 'email_unsubscribed'
    | 'email_converted';
  emailId: string;
  campaignId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CampaignEvent {
  eventType: string;
  campaignId?: string;
  userId?: string;
  emailId?: string;
  eventData?: any;
  metadata?: Record<string, any>;
}

// Email Performance Metrics
export interface EmailMetrics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  converted: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  bounceRate: number;
  conversionRate: number;
  unsubscribeRate: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  type: 'onboarding' | 'engagement' | 'conversion' | 'retention';
  startDate: Date;
  endDate?: Date;
  metrics: EmailMetrics;
  abTestResults?: ABTestAnalytics;
  timeSeriesData: TimeSeriesData[];
  segmentPerformance: SegmentPerformance[];
}

export interface ABTestAnalytics {
  testId: string;
  status: 'running' | 'completed';
  variants: {
    id: string;
    name: string;
    metrics: EmailMetrics;
    isWinner?: boolean;
    confidenceLevel?: number;
    uplift?: number;
  }[];
}

export interface TimeSeriesData {
  timestamp: Date;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface SegmentPerformance {
  segmentName: string;
  segmentValue: string;
  metrics: EmailMetrics;
}

// Dashboard Data for UI Integration
export interface EmailDashboard {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    overallOpenRate: number;
    overallClickRate: number;
    overallConversionRate: number;
  };
  recentCampaigns: CampaignAnalytics[];
  topPerformingCampaigns: CampaignAnalytics[];
  abTestSummary: ABTestAnalytics[];
  realTimeMetrics: TimeSeriesData[];
}

// Integration with external analytics platforms
export interface AnalyticsPlatformConfig {
  platform: 'mixpanel' | 'amplitude' | 'segment' | 'google_analytics';
  apiKey: string;
  projectId?: string;
  enabled: boolean;
}

// Main Analytics Service
export class EmailAnalyticsService {
  private platforms: Map<string, AnalyticsPlatformConfig> = new Map();
  private eventBuffer: EmailAnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePlatforms();
    this.startEventBuffer();
  }

  /**
   * Track campaign event
   */
  async trackCampaignEvent(event: CampaignEvent): Promise<void> {
    const analyticsEvent: EmailAnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: event.eventType as EmailAnalyticsEvent['eventType'],
      emailId: event.emailId || '',
      campaignId: event.campaignId || '',
      userId: event.userId || '',
      timestamp: new Date(),
      metadata: event.metadata,
    };

    // Add to buffer
    this.eventBuffer.push(analyticsEvent);

    // If buffer is full, flush immediately
    if (this.eventBuffer.length >= 100) {
      await this.flushEventBuffer();
    }

    // Send to external platforms
    await this.sendToExternalPlatforms(analyticsEvent, event.eventData);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    campaignId: string,
    dateRange?: {
      startDate: Date;
      endDate: Date;
    },
  ): Promise<CampaignAnalytics> {
    const supabase = createClient();

    // Get campaign info
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get email events with date filtering
    let query = supabase
      .from('email_analytics_events')
      .select('*')
      .eq('campaign_id', campaignId);

    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.startDate.toISOString())
        .lte('timestamp', dateRange.endDate.toISOString());
    }

    const { data: events } = await query;

    // Calculate metrics
    const metrics = this.calculateMetrics(events || []);

    // Get A/B test results if applicable
    let abTestResults: ABTestAnalytics | undefined;
    if (campaign.ab_test_enabled) {
      abTestResults = await this.getABTestAnalytics(campaignId);
    }

    // Get time series data
    const timeSeriesData = await this.getTimeSeriesData(campaignId, dateRange);

    // Get segment performance
    const segmentPerformance = await this.getSegmentPerformance(campaignId);

    return {
      campaignId,
      campaignName: campaign.name,
      type: campaign.type,
      startDate: new Date(campaign.created_at),
      endDate: campaign.ended_at ? new Date(campaign.ended_at) : undefined,
      metrics,
      abTestResults,
      timeSeriesData,
      segmentPerformance,
    };
  }

  /**
   * Get email dashboard data for UI
   */
  async getEmailDashboard(organizationId: string): Promise<EmailDashboard> {
    const supabase = createClient();

    // Get overview metrics
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('organization_id', organizationId);

    const activeCampaigns =
      campaigns?.filter((c) => c.status === 'running') || [];
    const totalCampaigns = campaigns?.length || 0;

    // Get recent events for overall metrics
    const { data: recentEvents } = await supabase
      .from('email_analytics_events')
      .select('*')
      .in('campaign_id', campaigns?.map((c) => c.id) || [])
      .gte(
        'timestamp',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const overallMetrics = this.calculateMetrics(recentEvents || []);

    // Get recent campaigns with analytics
    const recentCampaigns = await Promise.all(
      campaigns?.slice(0, 5).map((c) => this.getCampaignAnalytics(c.id)) || [],
    );

    // Get top performing campaigns
    const topPerformingCampaigns = recentCampaigns
      .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)
      .slice(0, 3);

    // Get A/B test summary
    const abTestSummary = await this.getAllABTestAnalytics(organizationId);

    // Get real-time metrics (last 24 hours)
    const realTimeMetrics = await this.getRealTimeMetrics(organizationId);

    return {
      overview: {
        totalCampaigns,
        activeCampaigns: activeCampaigns.length,
        totalSent: overallMetrics.totalSent,
        overallOpenRate: overallMetrics.openRate,
        overallClickRate: overallMetrics.clickThroughRate,
        overallConversionRate: overallMetrics.conversionRate,
      },
      recentCampaigns,
      topPerformingCampaigns,
      abTestSummary,
      realTimeMetrics,
    };
  }

  /**
   * Track email webhook events from email service provider
   */
  async handleEmailWebhook(webhookData: {
    event: string;
    emailId: string;
    recipient: string;
    timestamp: number;
    campaignId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Map webhook event to our event types
    const eventTypeMap: Record<string, EmailAnalyticsEvent['eventType']> = {
      delivered: 'email_delivered',
      opened: 'email_opened',
      clicked: 'email_clicked',
      bounced: 'email_bounced',
      unsubscribed: 'email_unsubscribed',
    };

    const eventType = eventTypeMap[webhookData.event];
    if (!eventType) return;

    // Get user ID from email
    const supabase = createClient();
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('email', webhookData.recipient)
      .single();

    if (!user) return;

    await this.trackCampaignEvent({
      eventType,
      emailId: webhookData.emailId,
      campaignId: webhookData.campaignId || '',
      userId: user.id,
      metadata: {
        ...webhookData.metadata,
        webhookEvent: true,
        originalEvent: webhookData.event,
      },
    });
  }

  /**
   * Generate analytics report for export
   */
  async generateAnalyticsReport(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date },
    format: 'json' | 'csv' | 'pdf' = 'json',
  ): Promise<any> {
    const dashboard = await this.getEmailDashboard(organizationId);

    const report = {
      organizationId,
      dateRange,
      generatedAt: new Date(),
      dashboard,
      detailedCampaigns: await Promise.all(
        dashboard.recentCampaigns.map((c) =>
          this.getCampaignAnalytics(c.campaignId, dateRange),
        ),
      ),
    };

    switch (format) {
      case 'csv':
        return this.convertToCSV(report);
      case 'pdf':
        return this.convertToPDF(report);
      default:
        return report;
    }
  }

  private calculateMetrics(events: any[]): EmailMetrics {
    const totalSent = events.filter(
      (e) => e.event_type === 'email_sent',
    ).length;
    const delivered = events.filter(
      (e) => e.event_type === 'email_delivered',
    ).length;
    const opened = events.filter((e) => e.event_type === 'email_opened').length;
    const clicked = events.filter(
      (e) => e.event_type === 'email_clicked',
    ).length;
    const bounced = events.filter(
      (e) => e.event_type === 'email_bounced',
    ).length;
    const unsubscribed = events.filter(
      (e) => e.event_type === 'email_unsubscribed',
    ).length;
    const converted = events.filter(
      (e) => e.event_type === 'email_converted',
    ).length;

    return {
      campaignId: events[0]?.campaign_id || '',
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      converted,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickThroughRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      conversionRate: clicked > 0 ? (converted / clicked) * 100 : 0,
      unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
    };
  }

  private async getABTestAnalytics(
    campaignId: string,
  ): Promise<ABTestAnalytics> {
    const supabase = createClient();

    const { data: abTest } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (!abTest) {
      throw new Error('A/B test not found');
    }

    // Get performance for each variant
    const variants = await Promise.all(
      abTest.variants.map(async (variant: any) => {
        const { data: variantEvents } = await supabase
          .from('email_analytics_events')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('metadata->>abTestVariant', variant.name);

        const metrics = this.calculateMetrics(variantEvents || []);

        return {
          id: variant.id,
          name: variant.name,
          metrics,
          isWinner: variant.isWinner,
          confidenceLevel: variant.confidenceLevel,
          uplift: variant.uplift,
        };
      }),
    );

    return {
      testId: abTest.id,
      status: abTest.status,
      variants,
    };
  }

  private async getTimeSeriesData(
    campaignId: string,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<TimeSeriesData[]> {
    const supabase = createClient();

    let query = supabase
      .from('email_analytics_events')
      .select('event_type, timestamp')
      .eq('campaign_id', campaignId)
      .order('timestamp', { ascending: true });

    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.startDate.toISOString())
        .lte('timestamp', dateRange.endDate.toISOString());
    }

    const { data: events } = await query;

    // Group by hour/day depending on date range
    const timeSeriesMap = new Map<string, TimeSeriesData>();

    events?.forEach((event) => {
      const timestamp = new Date(event.timestamp);
      const key = timestamp.toISOString().slice(0, 13) + ':00:00.000Z'; // Hour granularity

      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          timestamp: new Date(key),
          sent: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
        });
      }

      const data = timeSeriesMap.get(key)!;
      switch (event.event_type) {
        case 'email_sent':
          data.sent++;
          break;
        case 'email_opened':
          data.opened++;
          break;
        case 'email_clicked':
          data.clicked++;
          break;
        case 'email_converted':
          data.converted++;
          break;
      }
    });

    return Array.from(timeSeriesMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private async getSegmentPerformance(
    campaignId: string,
  ): Promise<SegmentPerformance[]> {
    const supabase = createClient();

    // Get events with user data for segmentation
    const { data: eventsWithUsers } = await supabase
      .from('email_analytics_events')
      .select(
        `
        *,
        user_profiles (
          plan_type,
          organization_size,
          industry
        )
      `,
      )
      .eq('campaign_id', campaignId);

    // Group by different segments
    const segments = new Map<string, any[]>();

    eventsWithUsers?.forEach((event) => {
      const user = event.user_profiles as any;
      if (!user) return;

      // Segment by plan type
      const planKey = `plan_${user.plan_type}`;
      if (!segments.has(planKey)) segments.set(planKey, []);
      segments.get(planKey)!.push(event);

      // Segment by organization size
      const sizeKey = `size_${user.organization_size}`;
      if (!segments.has(sizeKey)) segments.set(sizeKey, []);
      segments.get(sizeKey)!.push(event);

      // Segment by industry
      const industryKey = `industry_${user.industry}`;
      if (!segments.has(industryKey)) segments.set(industryKey, []);
      segments.get(industryKey)!.push(event);
    });

    return Array.from(segments.entries()).map(([key, events]) => {
      const [segmentName, segmentValue] = key.split('_');
      return {
        segmentName,
        segmentValue,
        metrics: this.calculateMetrics(events),
      };
    });
  }

  private async getAllABTestAnalytics(
    organizationId: string,
  ): Promise<ABTestAnalytics[]> {
    const supabase = createClient();

    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('ab_test_enabled', true);

    if (!campaigns?.length) return [];

    return Promise.all(campaigns.map((c) => this.getABTestAnalytics(c.id)));
  }

  private async getRealTimeMetrics(
    organizationId: string,
  ): Promise<TimeSeriesData[]> {
    const supabase = createClient();

    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id')
      .eq('organization_id', organizationId);

    if (!campaigns?.length) return [];

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: events } = await supabase
      .from('email_analytics_events')
      .select('event_type, timestamp')
      .in(
        'campaign_id',
        campaigns.map((c) => c.id),
      )
      .gte('timestamp', last24Hours.toISOString())
      .order('timestamp', { ascending: true });

    return this.aggregateTimeSeriesData(events || [], 'hour');
  }

  private aggregateTimeSeriesData(
    events: any[],
    granularity: 'hour' | 'day',
  ): TimeSeriesData[] {
    const timeSeriesMap = new Map<string, TimeSeriesData>();

    events.forEach((event) => {
      const timestamp = new Date(event.timestamp);
      let key: string;

      if (granularity === 'hour') {
        key = timestamp.toISOString().slice(0, 13) + ':00:00.000Z';
      } else {
        key = timestamp.toISOString().slice(0, 10) + 'T00:00:00.000Z';
      }

      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          timestamp: new Date(key),
          sent: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
        });
      }

      const data = timeSeriesMap.get(key)!;
      switch (event.event_type) {
        case 'email_sent':
          data.sent++;
          break;
        case 'email_opened':
          data.opened++;
          break;
        case 'email_clicked':
          data.clicked++;
          break;
        case 'email_converted':
          data.converted++;
          break;
      }
    });

    return Array.from(timeSeriesMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private async initializePlatforms(): Promise<void> {
    const supabase = createClient();

    const { data: configs } = await supabase
      .from('analytics_platform_configs')
      .select('*')
      .eq('enabled', true);

    configs?.forEach((config) => {
      this.platforms.set(config.platform, {
        platform: config.platform,
        apiKey: config.api_key,
        projectId: config.project_id,
        enabled: config.enabled,
      });
    });
  }

  private async sendToExternalPlatforms(
    event: EmailAnalyticsEvent,
    eventData?: any,
  ): Promise<void> {
    // Send to each configured platform
    for (const [platform, config] of this.platforms) {
      try {
        switch (platform) {
          case 'mixpanel':
            await this.sendToMixpanel(event, config, eventData);
            break;
          case 'amplitude':
            await this.sendToAmplitude(event, config, eventData);
            break;
          case 'segment':
            await this.sendToSegment(event, config, eventData);
            break;
          case 'google_analytics':
            await this.sendToGoogleAnalytics(event, config, eventData);
            break;
        }
      } catch (error) {
        console.error(`Error sending to ${platform}:`, error);
      }
    }
  }

  private async sendToMixpanel(
    event: EmailAnalyticsEvent,
    config: AnalyticsPlatformConfig,
    eventData?: any,
  ): Promise<void> {
    // Implementation for Mixpanel integration
    const payload = {
      event: event.eventType,
      properties: {
        distinct_id: event.userId,
        campaign_id: event.campaignId,
        email_id: event.emailId,
        timestamp: event.timestamp.toISOString(),
        ...event.metadata,
        ...eventData,
      },
    };

    // Would make HTTP request to Mixpanel API
    console.log('Sending to Mixpanel:', payload);
  }

  private async sendToAmplitude(
    event: EmailAnalyticsEvent,
    config: AnalyticsPlatformConfig,
    eventData?: any,
  ): Promise<void> {
    // Implementation for Amplitude integration
    console.log('Sending to Amplitude:', event);
  }

  private async sendToSegment(
    event: EmailAnalyticsEvent,
    config: AnalyticsPlatformConfig,
    eventData?: any,
  ): Promise<void> {
    // Implementation for Segment integration
    console.log('Sending to Segment:', event);
  }

  private async sendToGoogleAnalytics(
    event: EmailAnalyticsEvent,
    config: AnalyticsPlatformConfig,
    eventData?: any,
  ): Promise<void> {
    // Implementation for Google Analytics 4 integration
    console.log('Sending to GA4:', event);
  }

  private startEventBuffer(): void {
    this.flushInterval = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEventBuffer();
      }
    }, 10000); // Flush every 10 seconds
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const supabase = createClient();

    try {
      await supabase.from('email_analytics_events').insert(
        events.map((event) => ({
          id: event.id,
          event_type: event.eventType,
          email_id: event.emailId,
          campaign_id: event.campaignId,
          user_id: event.userId,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata,
        })),
      );
    } catch (error) {
      console.error('Error flushing event buffer:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  private convertToCSV(report: any): string {
    // CSV conversion implementation
    return 'CSV data here';
  }

  private convertToPDF(report: any): Buffer {
    // PDF conversion implementation
    return Buffer.from('PDF data here');
  }

  // Clean up
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining events
    if (this.eventBuffer.length > 0) {
      this.flushEventBuffer();
    }
  }
}

// Export singleton instance
export const emailAnalyticsService = new EmailAnalyticsService();

// Export convenience functions
export const {
  trackCampaignEvent,
  getCampaignAnalytics,
  getEmailDashboard,
  handleEmailWebhook,
  generateAnalyticsReport,
} = emailAnalyticsService;
