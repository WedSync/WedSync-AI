/**
 * WS-155 Round 2: Engagement Analytics Service
 * Team C - Advanced Integration Phase
 *
 * Tracks and analyzes guest engagement with communications
 * including open rates, click tracking, and response analysis
 */

import { EventEmitter } from 'events';

export interface EngagementEvent {
  id: string;
  messageId: string;
  guestId: string;
  weddingId: string;
  type:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'responded'
    | 'unsubscribed';
  timestamp: Date;
  metadata?: {
    deviceType?: string;
    browser?: string;
    os?: string;
    location?: {
      country?: string;
      city?: string;
      region?: string;
    };
    clickedLink?: string;
    responseType?: 'rsvp' | 'question' | 'feedback';
    responseContent?: string;
  };
}

export interface GuestEngagementProfile {
  guestId: string;
  totalMessagesSent: number;
  totalOpens: number;
  totalClicks: number;
  totalResponses: number;
  engagementScore: number;
  lastEngagement: Date | null;
  preferredDeviceType: string | null;
  averageOpenTime: number; // minutes after send
  mostActiveHour: number;
  mostActiveDay: number;
  communicationPreferences: {
    preferredChannel: 'email' | 'sms' | 'both';
    optedOut: boolean;
    bounced: boolean;
  };
}

export interface CampaignEngagement {
  campaignId: string;
  campaignName: string;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  uniqueOpenCount: number;
  clickCount: number;
  uniqueClickCount: number;
  responseCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  rates: {
    deliveryRate: number;
    openRate: number;
    uniqueOpenRate: number;
    clickRate: number;
    clickToOpenRate: number;
    responseRate: number;
    unsubscribeRate: number;
    bounceRate: number;
  };
  engagement: {
    averageOpenTime: number;
    medianOpenTime: number;
    averageClickTime: number;
    topLinks: Array<{
      url: string;
      clicks: number;
      uniqueClicks: number;
    }>;
    deviceBreakdown: Record<string, number>;
    locationBreakdown: Record<string, number>;
  };
}

export interface EngagementInsight {
  type: 'trend' | 'anomaly' | 'recommendation' | 'warning';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metrics?: Record<string, number>;
  actionable: boolean;
  suggestedActions?: string[];
}

export interface EngagementHeatmap {
  dayOfWeek: Record<number, number[]>; // day -> hourly engagement
  hourOfDay: Record<number, number>; // hour -> total engagement
  bestTimes: Array<{ day: number; hour: number; score: number }>;
}

export class EngagementAnalyticsService extends EventEmitter {
  private events: Map<string, EngagementEvent[]> = new Map();
  private guestProfiles: Map<string, GuestEngagementProfile> = new Map();
  private campaignData: Map<string, CampaignEngagement> = new Map();
  private heatmapData: EngagementHeatmap;
  private insights: EngagementInsight[] = [];
  private trackingPixels: Map<string, string> = new Map();

  constructor() {
    super();
    this.heatmapData = this.initializeHeatmap();
    this.startInsightGeneration();
  }

  /**
   * Track an engagement event
   */
  trackEngagement(event: EngagementEvent): void {
    // Store event
    if (!this.events.has(event.messageId)) {
      this.events.set(event.messageId, []);
    }
    this.events.get(event.messageId)!.push(event);

    // Update guest profile
    this.updateGuestProfile(event);

    // Update campaign data if applicable
    if (event.metadata?.responseType) {
      this.updateCampaignData(event);
    }

    // Update heatmap
    this.updateHeatmap(event);

    // Check for anomalies
    this.detectAnomalies(event);

    // Emit real-time event
    this.emit(`engagement:${event.type}`, event);
  }

  /**
   * Generate tracking pixel for email
   */
  generateTrackingPixel(messageId: string, guestId: string): string {
    const trackingId = `${messageId}_${guestId}_${Date.now()}`;
    const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${trackingId}`;

    this.trackingPixels.set(trackingId, JSON.stringify({ messageId, guestId }));

    return `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  /**
   * Generate tracked links
   */
  generateTrackedLink(
    originalUrl: string,
    messageId: string,
    guestId: string,
  ): string {
    const trackingParams = new URLSearchParams({
      url: originalUrl,
      mid: messageId,
      gid: guestId,
      t: Date.now().toString(),
    });

    return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/click?${trackingParams}`;
  }

  /**
   * Get guest engagement profile
   */
  getGuestProfile(guestId: string): GuestEngagementProfile | null {
    return this.guestProfiles.get(guestId) || null;
  }

  /**
   * Get campaign engagement metrics
   */
  getCampaignEngagement(campaignId: string): CampaignEngagement | null {
    return this.campaignData.get(campaignId) || null;
  }

  /**
   * Get engagement heatmap
   */
  getEngagementHeatmap(weddingId?: string): EngagementHeatmap {
    if (!weddingId) return this.heatmapData;

    // Filter heatmap for specific wedding
    return this.calculateWeddingHeatmap(weddingId);
  }

  /**
   * Get engagement insights
   */
  getInsights(limit: number = 10): EngagementInsight[] {
    return this.insights
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, limit);
  }

  /**
   * Calculate engagement score for a guest
   */
  calculateEngagementScore(profile: GuestEngagementProfile): number {
    if (profile.totalMessagesSent === 0) return 0;

    const weights = {
      openRate: 0.3,
      clickRate: 0.25,
      responseRate: 0.25,
      recency: 0.2,
    };

    const openRate = profile.totalOpens / profile.totalMessagesSent;
    const clickRate = profile.totalClicks / Math.max(profile.totalOpens, 1);
    const responseRate = profile.totalResponses / profile.totalMessagesSent;

    // Calculate recency score (0-1, where 1 is very recent)
    const daysSinceEngagement = profile.lastEngagement
      ? (Date.now() - profile.lastEngagement.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const recencyScore = Math.max(0, 1 - daysSinceEngagement / 30);

    const score =
      openRate * weights.openRate +
      clickRate * weights.clickRate +
      responseRate * weights.responseRate +
      recencyScore * weights.recency;

    return Math.round(score * 100);
  }

  /**
   * Segment guests by engagement
   */
  segmentGuestsByEngagement(): {
    highly_engaged: string[];
    moderately_engaged: string[];
    low_engagement: string[];
    inactive: string[];
  } {
    const segments = {
      highly_engaged: [] as string[],
      moderately_engaged: [] as string[],
      low_engagement: [] as string[],
      inactive: [] as string[],
    };

    for (const [guestId, profile] of this.guestProfiles) {
      if (profile.engagementScore >= 75) {
        segments.highly_engaged.push(guestId);
      } else if (profile.engagementScore >= 50) {
        segments.moderately_engaged.push(guestId);
      } else if (profile.engagementScore >= 25) {
        segments.low_engagement.push(guestId);
      } else {
        segments.inactive.push(guestId);
      }
    }

    return segments;
  }

  /**
   * Get engagement trends
   */
  getEngagementTrends(
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'day',
  ): Array<{
    timestamp: Date;
    opens: number;
    clicks: number;
    responses: number;
    unsubscribes: number;
  }> {
    const trends: Map<number, any> = new Map();
    const intervalMs = this.getIntervalMs(interval);

    for (const events of this.events.values()) {
      for (const event of events) {
        if (event.timestamp < startDate || event.timestamp > endDate) continue;

        const bucket =
          Math.floor(event.timestamp.getTime() / intervalMs) * intervalMs;

        if (!trends.has(bucket)) {
          trends.set(bucket, {
            timestamp: new Date(bucket),
            opens: 0,
            clicks: 0,
            responses: 0,
            unsubscribes: 0,
          });
        }

        const trend = trends.get(bucket)!;
        switch (event.type) {
          case 'opened':
            trend.opens++;
            break;
          case 'clicked':
            trend.clicks++;
            break;
          case 'responded':
            trend.responses++;
            break;
          case 'unsubscribed':
            trend.unsubscribes++;
            break;
        }
      }
    }

    return Array.from(trends.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Get link performance analytics
   */
  getLinkPerformance(messageId?: string): Array<{
    url: string;
    totalClicks: number;
    uniqueClicks: number;
    clickRate: number;
    devices: Record<string, number>;
  }> {
    const linkData: Map<string, any> = new Map();

    const events = messageId
      ? this.events.get(messageId) || []
      : Array.from(this.events.values()).flat();

    const clickEvents = events.filter((e) => e.type === 'clicked');

    for (const event of clickEvents) {
      const url = event.metadata?.clickedLink;
      if (!url) continue;

      if (!linkData.has(url)) {
        linkData.set(url, {
          url,
          totalClicks: 0,
          uniqueGuests: new Set(),
          devices: {},
        });
      }

      const data = linkData.get(url)!;
      data.totalClicks++;
      data.uniqueGuests.add(event.guestId);

      const device = event.metadata?.deviceType || 'unknown';
      data.devices[device] = (data.devices[device] || 0) + 1;
    }

    const totalMessages = messageId
      ? events.filter((e) => e.type === 'sent').length
      : this.events.size;

    return Array.from(linkData.values())
      .map((data) => ({
        url: data.url,
        totalClicks: data.totalClicks,
        uniqueClicks: data.uniqueGuests.size,
        clickRate: data.uniqueGuests.size / Math.max(totalMessages, 1),
        devices: data.devices,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks);
  }

  /**
   * Update guest profile with engagement event
   */
  private updateGuestProfile(event: EngagementEvent): void {
    let profile = this.guestProfiles.get(event.guestId);

    if (!profile) {
      profile = {
        guestId: event.guestId,
        totalMessagesSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalResponses: 0,
        engagementScore: 0,
        lastEngagement: null,
        preferredDeviceType: null,
        averageOpenTime: 0,
        mostActiveHour: 0,
        mostActiveDay: 0,
        communicationPreferences: {
          preferredChannel: 'email',
          optedOut: false,
          bounced: false,
        },
      };
      this.guestProfiles.set(event.guestId, profile);
    }

    // Update counts
    switch (event.type) {
      case 'sent':
        profile.totalMessagesSent++;
        break;
      case 'opened':
        profile.totalOpens++;
        profile.lastEngagement = event.timestamp;
        if (event.metadata?.deviceType) {
          profile.preferredDeviceType = event.metadata.deviceType;
        }
        break;
      case 'clicked':
        profile.totalClicks++;
        profile.lastEngagement = event.timestamp;
        break;
      case 'responded':
        profile.totalResponses++;
        profile.lastEngagement = event.timestamp;
        break;
      case 'unsubscribed':
        profile.communicationPreferences.optedOut = true;
        break;
    }

    // Update engagement patterns
    if (event.type === 'opened' || event.type === 'clicked') {
      profile.mostActiveHour = event.timestamp.getHours();
      profile.mostActiveDay = event.timestamp.getDay();
    }

    // Recalculate engagement score
    profile.engagementScore = this.calculateEngagementScore(profile);
  }

  /**
   * Update campaign data
   */
  private updateCampaignData(event: EngagementEvent): void {
    // Implementation would update campaign-specific metrics
    // For brevity, this is simplified
  }

  /**
   * Update engagement heatmap
   */
  private updateHeatmap(event: EngagementEvent): void {
    if (event.type !== 'opened' && event.type !== 'clicked') return;

    const day = event.timestamp.getDay();
    const hour = event.timestamp.getHours();

    if (!this.heatmapData.dayOfWeek[day]) {
      this.heatmapData.dayOfWeek[day] = new Array(24).fill(0);
    }

    this.heatmapData.dayOfWeek[day][hour]++;
    this.heatmapData.hourOfDay[hour] =
      (this.heatmapData.hourOfDay[hour] || 0) + 1;

    // Update best times
    this.updateBestTimes();
  }

  /**
   * Update best engagement times
   */
  private updateBestTimes(): void {
    const times: Array<{ day: number; hour: number; score: number }> = [];

    for (const [day, hours] of Object.entries(this.heatmapData.dayOfWeek)) {
      for (let hour = 0; hour < hours.length; hour++) {
        times.push({
          day: parseInt(day),
          hour,
          score: hours[hour],
        });
      }
    }

    this.heatmapData.bestTimes = times
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Initialize heatmap structure
   */
  private initializeHeatmap(): EngagementHeatmap {
    const dayOfWeek: Record<number, number[]> = {};
    for (let day = 0; day < 7; day++) {
      dayOfWeek[day] = new Array(24).fill(0);
    }

    return {
      dayOfWeek,
      hourOfDay: {},
      bestTimes: [],
    };
  }

  /**
   * Calculate wedding-specific heatmap
   */
  private calculateWeddingHeatmap(weddingId: string): EngagementHeatmap {
    // Filter events for specific wedding and recalculate heatmap
    // For brevity, returning general heatmap
    return this.heatmapData;
  }

  /**
   * Detect anomalies in engagement
   */
  private detectAnomalies(event: EngagementEvent): void {
    // Simple anomaly detection
    const profile = this.guestProfiles.get(event.guestId);
    if (!profile) return;

    // Check for sudden drop in engagement
    if (profile.engagementScore < 25 && profile.totalMessagesSent > 5) {
      this.insights.push({
        type: 'warning',
        severity: 'medium',
        title: 'Low Guest Engagement Detected',
        description: `Guest ${event.guestId} showing declining engagement (score: ${profile.engagementScore})`,
        metrics: {
          engagementScore: profile.engagementScore,
          messagesSent: profile.totalMessagesSent,
        },
        actionable: true,
        suggestedActions: [
          'Review message content and frequency',
          'Consider personalization strategies',
          'Test different send times',
        ],
      });
    }
  }

  /**
   * Start periodic insight generation
   */
  private startInsightGeneration(): void {
    setInterval(
      () => {
        this.generateInsights();
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  /**
   * Generate engagement insights
   */
  private generateInsights(): void {
    this.insights = [];

    // Analyze overall engagement trends
    const segments = this.segmentGuestsByEngagement();
    const inactiveRate = segments.inactive.length / this.guestProfiles.size;

    if (inactiveRate > 0.3) {
      this.insights.push({
        type: 'warning',
        severity: 'high',
        title: 'High Inactive Rate',
        description: `${Math.round(inactiveRate * 100)}% of guests are inactive`,
        metrics: {
          inactiveCount: segments.inactive.length,
          totalGuests: this.guestProfiles.size,
        },
        actionable: true,
        suggestedActions: [
          'Launch re-engagement campaign',
          'Review communication frequency',
          'Implement win-back strategies',
        ],
      });
    }

    // Find best performing times
    if (this.heatmapData.bestTimes.length > 0) {
      const bestTime = this.heatmapData.bestTimes[0];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      this.insights.push({
        type: 'recommendation',
        severity: 'low',
        title: 'Optimal Send Time Identified',
        description: `Best engagement: ${days[bestTime.day]} at ${bestTime.hour}:00`,
        metrics: {
          engagementScore: bestTime.score,
        },
        actionable: true,
        suggestedActions: [
          `Schedule important messages for ${days[bestTime.day]} ${bestTime.hour}:00`,
        ],
      });
    }

    this.emit('insights:generated', this.insights);
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    return intervals[interval] || intervals.day;
  }

  /**
   * Export engagement data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      profiles: Array.from(this.guestProfiles.values()),
      campaigns: Array.from(this.campaignData.values()),
      heatmap: this.heatmapData,
      insights: this.insights,
      exportedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV conversion (simplified)
      return this.convertToCSV(data.profiles);
    }
  }

  /**
   * Convert profiles to CSV
   */
  private convertToCSV(profiles: GuestEngagementProfile[]): string {
    const headers = [
      'Guest ID',
      'Messages Sent',
      'Opens',
      'Clicks',
      'Responses',
      'Engagement Score',
      'Last Engagement',
    ];

    const rows = [headers.join(',')];

    for (const profile of profiles) {
      rows.push(
        [
          profile.guestId,
          profile.totalMessagesSent,
          profile.totalOpens,
          profile.totalClicks,
          profile.totalResponses,
          profile.engagementScore,
          profile.lastEngagement?.toISOString() || '',
        ].join(','),
      );
    }

    return rows.join('\n');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.events.clear();
    this.guestProfiles.clear();
    this.campaignData.clear();
    this.trackingPixels.clear();
    this.removeAllListeners();
  }
}
