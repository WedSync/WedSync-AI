/**
 * WS-155 Round 2: Guest Communication Insights
 * Team C - Advanced Integration Phase
 *
 * Analyzes communication patterns and preferences to provide
 * actionable insights for improving guest engagement
 */

import { EventEmitter } from 'events';

export interface GuestCommunicationPattern {
  guestId: string;
  preferredChannel: 'email' | 'sms' | 'both';
  preferredTime: {
    dayOfWeek: number;
    hourOfDay: number;
    timezone: string;
  };
  responsePatterns: {
    averageResponseTime: number; // minutes
    responseRate: number;
    preferredResponseMethod: 'click' | 'reply' | 'form';
  };
  contentPreferences: {
    preferredLength: 'short' | 'medium' | 'long';
    engagesWithImages: boolean;
    clicksLinks: boolean;
    respondsToQuestions: boolean;
  };
  engagementHistory: {
    firstEngagement: Date | null;
    lastEngagement: Date | null;
    totalInteractions: number;
    engagementTrend: 'increasing' | 'stable' | 'declining';
  };
}

export interface CommunicationInsight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedGuests: number;
  potentialImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    confidence: number;
  };
  recommendations: Recommendation[];
  createdAt: Date;
  expiresAt?: Date;
}

export type InsightType =
  | 'pattern'
  | 'anomaly'
  | 'opportunity'
  | 'warning'
  | 'success'
  | 'trend';

export type InsightCategory =
  | 'engagement'
  | 'delivery'
  | 'content'
  | 'timing'
  | 'segmentation'
  | 'personalization';

export interface Recommendation {
  action: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation: string[];
}

export interface SegmentInsight {
  segmentName: string;
  segmentSize: number;
  characteristics: string[];
  communicationStrategy: {
    bestChannel: string;
    optimalSendTime: string;
    contentRecommendations: string[];
    frequencyRecommendation: string;
  };
  performance: {
    openRate: number;
    clickRate: number;
    responseRate: number;
    trend: 'improving' | 'stable' | 'declining';
  };
}

export interface WeddingCommunicationMetrics {
  weddingId: string;
  overallHealth: number; // 0-100
  guestCoverage: number; // percentage of guests communicated with
  averageEngagementScore: number;
  communicationPhases: {
    saveTheDate: PhaseMetrics;
    invitation: PhaseMetrics;
    rsvp: PhaseMetrics;
    preWedding: PhaseMetrics;
    postWedding: PhaseMetrics;
  };
  riskFactors: RiskFactor[];
  opportunities: Opportunity[];
}

export interface PhaseMetrics {
  phase: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completionRate: number;
  engagementRate: number;
  issuesDetected: number;
  nextMilestone?: Date;
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedCount: number;
  mitigation: string;
}

export interface Opportunity {
  type: string;
  potentialGain: string;
  effortRequired: 'low' | 'medium' | 'high';
  description: string;
  actionPlan: string[];
}

export class GuestCommunicationInsightsService extends EventEmitter {
  private patterns: Map<string, GuestCommunicationPattern> = new Map();
  private insights: Map<string, CommunicationInsight> = new Map();
  private weddingMetrics: Map<string, WeddingCommunicationMetrics> = new Map();
  private segmentCache: Map<string, SegmentInsight> = new Map();
  private analysisTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startPeriodicAnalysis();
  }

  /**
   * Analyze guest communication data
   */
  analyzeGuestCommunications(
    guestData: Array<{
      guestId: string;
      weddingId: string;
      communications: Array<{
        type: string;
        sentAt: Date;
        openedAt?: Date;
        clickedAt?: Date;
        respondedAt?: Date;
        channel: 'email' | 'sms';
        contentLength: number;
        hasImages: boolean;
        linkCount: number;
      }>;
    }>,
  ): void {
    for (const guest of guestData) {
      const pattern = this.analyzeGuestPattern(guest);
      this.patterns.set(guest.guestId, pattern);
    }

    // Generate insights based on patterns
    this.generateInsights();

    // Update wedding metrics
    this.updateWeddingMetrics(guestData);
  }

  /**
   * Get insights for a wedding
   */
  getWeddingInsights(weddingId: string): CommunicationInsight[] {
    return Array.from(this.insights.values())
      .filter((insight) => this.isInsightRelevantToWedding(insight, weddingId))
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Get guest communication pattern
   */
  getGuestPattern(guestId: string): GuestCommunicationPattern | null {
    return this.patterns.get(guestId) || null;
  }

  /**
   * Get segment insights
   */
  getSegmentInsights(): SegmentInsight[] {
    this.generateSegments();
    return Array.from(this.segmentCache.values());
  }

  /**
   * Get wedding metrics
   */
  getWeddingMetrics(weddingId: string): WeddingCommunicationMetrics | null {
    return this.weddingMetrics.get(weddingId) || null;
  }

  /**
   * Analyze individual guest pattern
   */
  private analyzeGuestPattern(guestData: any): GuestCommunicationPattern {
    const communications = guestData.communications;

    // Analyze channel preference
    const channelCounts = { email: 0, sms: 0 };
    const engagementByChannel = { email: 0, sms: 0 };

    for (const comm of communications) {
      channelCounts[comm.channel]++;
      if (comm.openedAt || comm.clickedAt || comm.respondedAt) {
        engagementByChannel[comm.channel]++;
      }
    }

    const preferredChannel = this.determinePreferredChannel(
      channelCounts,
      engagementByChannel,
    );

    // Analyze timing preferences
    const timingPattern = this.analyzeTimingPreference(communications);

    // Analyze response patterns
    const responsePattern = this.analyzeResponsePattern(communications);

    // Analyze content preferences
    const contentPrefs = this.analyzeContentPreferences(communications);

    // Calculate engagement trend
    const engagementTrend = this.calculateEngagementTrend(communications);

    return {
      guestId: guestData.guestId,
      preferredChannel,
      preferredTime: timingPattern,
      responsePatterns: responsePattern,
      contentPreferences: contentPrefs,
      engagementHistory: {
        firstEngagement: this.getFirstEngagement(communications),
        lastEngagement: this.getLastEngagement(communications),
        totalInteractions: communications.filter(
          (c) => c.openedAt || c.clickedAt || c.respondedAt,
        ).length,
        engagementTrend,
      },
    };
  }

  /**
   * Determine preferred communication channel
   */
  private determinePreferredChannel(
    counts: Record<string, number>,
    engagement: Record<string, number>,
  ): 'email' | 'sms' | 'both' {
    const emailRate = counts.email > 0 ? engagement.email / counts.email : 0;
    const smsRate = counts.sms > 0 ? engagement.sms / counts.sms : 0;

    if (Math.abs(emailRate - smsRate) < 0.1) {
      return 'both';
    }

    return emailRate > smsRate ? 'email' : 'sms';
  }

  /**
   * Analyze timing preferences
   */
  private analyzeTimingPreference(communications: any[]): any {
    const engaged = communications.filter((c) => c.openedAt || c.clickedAt);

    if (engaged.length === 0) {
      return {
        dayOfWeek: 2, // Default to Tuesday
        hourOfDay: 10, // Default to 10 AM
        timezone: 'America/New_York',
      };
    }

    // Count engagements by day and hour
    const dayCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};

    for (const comm of engaged) {
      const engageTime = comm.openedAt || comm.clickedAt;
      const date = new Date(engageTime);
      const day = date.getDay();
      const hour = date.getHours();

      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    }

    // Find most common day and hour
    const bestDay = Object.entries(dayCount).reduce((a, b) =>
      dayCount[a[0] as any] > dayCount[b[0] as any] ? a : b,
    )[0];

    const bestHour = Object.entries(hourCount).reduce((a, b) =>
      hourCount[a[0] as any] > hourCount[b[0] as any] ? a : b,
    )[0];

    return {
      dayOfWeek: parseInt(bestDay),
      hourOfDay: parseInt(bestHour),
      timezone: 'America/New_York', // Would detect from user data
    };
  }

  /**
   * Analyze response patterns
   */
  private analyzeResponsePattern(communications: any[]): any {
    const responses = communications.filter((c) => c.respondedAt);

    if (responses.length === 0) {
      return {
        averageResponseTime: 0,
        responseRate: 0,
        preferredResponseMethod: 'click',
      };
    }

    let totalResponseTime = 0;
    const methods = { click: 0, reply: 0, form: 0 };

    for (const comm of responses) {
      const responseTime =
        new Date(comm.respondedAt).getTime() - new Date(comm.sentAt).getTime();
      totalResponseTime += responseTime;

      if (comm.clickedAt) methods.click++;
      // Would check for other response methods
    }

    return {
      averageResponseTime: Math.round(
        totalResponseTime / responses.length / 60000,
      ), // minutes
      responseRate: responses.length / communications.length,
      preferredResponseMethod: 'click', // Simplified
    };
  }

  /**
   * Analyze content preferences
   */
  private analyzeContentPreferences(communications: any[]): any {
    const engaged = communications.filter((c) => c.openedAt || c.clickedAt);

    let totalLength = 0;
    let imageEngagement = 0;
    let linkClicks = 0;

    for (const comm of engaged) {
      totalLength += comm.contentLength;
      if (comm.hasImages) imageEngagement++;
      if (comm.clickedAt && comm.linkCount > 0) linkClicks++;
    }

    const avgLength = engaged.length > 0 ? totalLength / engaged.length : 500;

    return {
      preferredLength:
        avgLength < 200 ? 'short' : avgLength < 500 ? 'medium' : 'long',
      engagesWithImages: imageEngagement > engaged.length / 2,
      clicksLinks: linkClicks > engaged.length / 3,
      respondsToQuestions: false, // Would analyze actual responses
    };
  }

  /**
   * Calculate engagement trend
   */
  private calculateEngagementTrend(
    communications: any[],
  ): 'increasing' | 'stable' | 'declining' {
    if (communications.length < 3) return 'stable';

    // Split into two halves and compare engagement rates
    const midpoint = Math.floor(communications.length / 2);
    const firstHalf = communications.slice(0, midpoint);
    const secondHalf = communications.slice(midpoint);

    const firstRate =
      firstHalf.filter((c) => c.openedAt).length / firstHalf.length;
    const secondRate =
      secondHalf.filter((c) => c.openedAt).length / secondHalf.length;

    if (secondRate > firstRate * 1.2) return 'increasing';
    if (secondRate < firstRate * 0.8) return 'declining';
    return 'stable';
  }

  /**
   * Generate insights from patterns
   */
  private generateInsights(): void {
    this.insights.clear();

    // Analyze patterns for insights
    const patterns = Array.from(this.patterns.values());

    // Find common issues
    const lowEngagement = patterns.filter(
      (p) => p.engagementHistory.totalInteractions < 2,
    );

    if (lowEngagement.length > patterns.length * 0.3) {
      this.addInsight({
        id: this.generateInsightId(),
        type: 'warning',
        category: 'engagement',
        priority: 'high',
        title: 'Low Overall Engagement Detected',
        description: `${Math.round((lowEngagement.length / patterns.length) * 100)}% of guests show minimal engagement`,
        affectedGuests: lowEngagement.length,
        potentialImpact: {
          metric: 'response_rate',
          currentValue: 0.15,
          projectedValue: 0.35,
          confidence: 0.75,
        },
        recommendations: [
          {
            action: 'Implement Personalization',
            description: 'Add guest names and custom content to messages',
            effort: 'low',
            impact: 'high',
            implementation: [
              'Use merge tags for guest names',
              'Reference specific wedding details',
              'Include personalized RSVP links',
            ],
          },
          {
            action: 'Optimize Send Times',
            description: 'Send messages at guest-specific optimal times',
            effort: 'medium',
            impact: 'medium',
            implementation: [
              'Analyze individual engagement patterns',
              'Schedule sends based on timezone',
              'Test different days and times',
            ],
          },
        ],
        createdAt: new Date(),
      });
    }

    // Find optimization opportunities
    this.findOptimizationOpportunities(patterns);

    // Detect communication gaps
    this.detectCommunicationGaps(patterns);
  }

  /**
   * Find optimization opportunities
   */
  private findOptimizationOpportunities(
    patterns: GuestCommunicationPattern[],
  ): void {
    // Channel optimization
    const singleChannelGuests = patterns.filter(
      (p) => p.preferredChannel !== 'both',
    );

    if (singleChannelGuests.length > patterns.length * 0.5) {
      this.addInsight({
        id: this.generateInsightId(),
        type: 'opportunity',
        category: 'delivery',
        priority: 'medium',
        title: 'Multi-Channel Opportunity',
        description: 'Many guests only engage with one channel',
        affectedGuests: singleChannelGuests.length,
        potentialImpact: {
          metric: 'reach',
          currentValue: 0.7,
          projectedValue: 0.95,
          confidence: 0.8,
        },
        recommendations: [
          {
            action: 'Implement Cross-Channel Strategy',
            description: 'Use both email and SMS strategically',
            effort: 'medium',
            impact: 'high',
            implementation: [
              'Send important updates via both channels',
              'Use SMS for time-sensitive messages',
              'Use email for detailed information',
            ],
          },
        ],
        createdAt: new Date(),
      });
    }

    // Content optimization
    const imageEngagers = patterns.filter(
      (p) => p.contentPreferences.engagesWithImages,
    );

    if (imageEngagers.length > patterns.length * 0.6) {
      this.addInsight({
        id: this.generateInsightId(),
        type: 'success',
        category: 'content',
        priority: 'low',
        title: 'Visual Content Resonates',
        description: 'Majority of guests engage with visual content',
        affectedGuests: imageEngagers.length,
        potentialImpact: {
          metric: 'engagement',
          currentValue: 0.4,
          projectedValue: 0.6,
          confidence: 0.85,
        },
        recommendations: [
          {
            action: 'Increase Visual Content',
            description: 'Add more images and visual elements',
            effort: 'low',
            impact: 'medium',
            implementation: [
              'Include venue photos',
              'Add couple photos',
              'Use visual timeline for schedule',
            ],
          },
        ],
        createdAt: new Date(),
      });
    }
  }

  /**
   * Detect communication gaps
   */
  private detectCommunicationGaps(patterns: GuestCommunicationPattern[]): void {
    const inactive = patterns.filter((p) => {
      if (!p.engagementHistory.lastEngagement) return true;
      const daysSinceEngagement =
        (Date.now() - p.engagementHistory.lastEngagement.getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSinceEngagement > 30;
    });

    if (inactive.length > 0) {
      this.addInsight({
        id: this.generateInsightId(),
        type: 'warning',
        category: 'engagement',
        priority: 'medium',
        title: 'Inactive Guest Segment',
        description: `${inactive.length} guests haven't engaged in 30+ days`,
        affectedGuests: inactive.length,
        potentialImpact: {
          metric: 'reactivation',
          currentValue: 0,
          projectedValue: 0.3,
          confidence: 0.6,
        },
        recommendations: [
          {
            action: 'Launch Re-engagement Campaign',
            description: 'Send targeted messages to inactive guests',
            effort: 'low',
            impact: 'medium',
            implementation: [
              'Send "We miss you" message',
              'Include important updates they missed',
              'Offer incentive for response',
            ],
          },
        ],
        createdAt: new Date(),
      });
    }
  }

  /**
   * Generate guest segments
   */
  private generateSegments(): void {
    this.segmentCache.clear();
    const patterns = Array.from(this.patterns.values());

    // Highly engaged segment
    const highlyEngaged = patterns.filter(
      (p) =>
        p.engagementHistory.totalInteractions > 5 &&
        p.engagementHistory.engagementTrend !== 'declining',
    );

    if (highlyEngaged.length > 0) {
      this.segmentCache.set('highly_engaged', {
        segmentName: 'Highly Engaged',
        segmentSize: highlyEngaged.length,
        characteristics: [
          'Opens most messages',
          'Clicks links regularly',
          'Responds promptly',
        ],
        communicationStrategy: {
          bestChannel: 'both',
          optimalSendTime: 'Varies by guest',
          contentRecommendations: [
            'Include exclusive content',
            'Ask for feedback',
            'Provide detailed information',
          ],
          frequencyRecommendation: 'Regular updates (weekly)',
        },
        performance: {
          openRate: 0.85,
          clickRate: 0.45,
          responseRate: 0.35,
          trend: 'stable',
        },
      });
    }

    // Low engagement segment
    const lowEngagement = patterns.filter(
      (p) => p.engagementHistory.totalInteractions <= 2,
    );

    if (lowEngagement.length > 0) {
      this.segmentCache.set('low_engagement', {
        segmentName: 'Low Engagement',
        segmentSize: lowEngagement.length,
        characteristics: [
          'Rarely opens messages',
          'Minimal interaction',
          'May prefer different channel',
        ],
        communicationStrategy: {
          bestChannel: 'sms',
          optimalSendTime: 'Evening hours',
          contentRecommendations: [
            'Keep messages short',
            'Focus on critical info only',
            'Use attention-grabbing subject lines',
          ],
          frequencyRecommendation: 'Essential updates only',
        },
        performance: {
          openRate: 0.25,
          clickRate: 0.05,
          responseRate: 0.02,
          trend: 'declining',
        },
      });
    }
  }

  /**
   * Update wedding metrics
   */
  private updateWeddingMetrics(guestData: any[]): void {
    const weddingGroups: Map<string, any[]> = new Map();

    // Group by wedding
    for (const guest of guestData) {
      if (!weddingGroups.has(guest.weddingId)) {
        weddingGroups.set(guest.weddingId, []);
      }
      weddingGroups.get(guest.weddingId)!.push(guest);
    }

    // Calculate metrics for each wedding
    for (const [weddingId, guests] of weddingGroups) {
      const metrics = this.calculateWeddingMetrics(weddingId, guests);
      this.weddingMetrics.set(weddingId, metrics);
    }
  }

  /**
   * Calculate wedding-specific metrics
   */
  private calculateWeddingMetrics(
    weddingId: string,
    guests: any[],
  ): WeddingCommunicationMetrics {
    const totalGuests = guests.length;
    const communicatedGuests = guests.filter(
      (g) => g.communications.length > 0,
    ).length;

    const patterns = guests
      .map((g) => this.patterns.get(g.guestId))
      .filter(Boolean);
    const avgEngagement =
      patterns.reduce(
        (sum, p) => sum + (p?.engagementHistory.totalInteractions || 0),
        0,
      ) / Math.max(patterns.length, 1);

    return {
      weddingId,
      overallHealth: this.calculateHealthScore(guests),
      guestCoverage: (communicatedGuests / totalGuests) * 100,
      averageEngagementScore: avgEngagement,
      communicationPhases: {
        saveTheDate: {
          phase: 'saveTheDate',
          status: 'completed',
          completionRate: 0.95,
          engagementRate: 0.65,
          issuesDetected: 0,
          nextMilestone: undefined,
        },
        invitation: {
          phase: 'invitation',
          status: 'in_progress',
          completionRate: 0.75,
          engagementRate: 0.55,
          issuesDetected: 2,
          nextMilestone: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        rsvp: {
          phase: 'rsvp',
          status: 'in_progress',
          completionRate: 0.45,
          engagementRate: 0.35,
          issuesDetected: 5,
          nextMilestone: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        preWedding: {
          phase: 'preWedding',
          status: 'not_started',
          completionRate: 0,
          engagementRate: 0,
          issuesDetected: 0,
          nextMilestone: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        postWedding: {
          phase: 'postWedding',
          status: 'not_started',
          completionRate: 0,
          engagementRate: 0,
          issuesDetected: 0,
          nextMilestone: undefined,
        },
      },
      riskFactors: this.identifyRiskFactors(guests),
      opportunities: this.identifyOpportunities(guests),
    };
  }

  /**
   * Calculate health score for wedding communications
   */
  private calculateHealthScore(guests: any[]): number {
    const factors = {
      coverage: 0.25,
      engagement: 0.35,
      delivery: 0.2,
      recency: 0.2,
    };

    const coverage =
      guests.filter((g) => g.communications.length > 0).length / guests.length;
    const engagement =
      guests.reduce((sum, g) => {
        const engaged = g.communications.filter((c: any) => c.openedAt).length;
        return sum + engaged / Math.max(g.communications.length, 1);
      }, 0) / guests.length;

    const score =
      coverage * factors.coverage * 100 +
      engagement * factors.engagement * 100 +
      0.95 * factors.delivery * 100 + // Simplified
      0.8 * factors.recency * 100; // Simplified

    return Math.round(score);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(guests: any[]): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Check for high bounce rate
    const bounced = guests.filter((g) =>
      g.communications.some((c: any) => c.bounced),
    ).length;

    if (bounced > guests.length * 0.1) {
      risks.push({
        type: 'high_bounce_rate',
        severity: 'high',
        description: 'High email bounce rate detected',
        affectedCount: bounced,
        mitigation: 'Verify and clean email list',
      });
    }

    // Check for low RSVP rate
    const rsvpRate = 0.45; // Simplified
    if (rsvpRate < 0.5) {
      risks.push({
        type: 'low_rsvp_rate',
        severity: 'medium',
        description: 'RSVP response rate below target',
        affectedCount: Math.round(guests.length * (1 - rsvpRate)),
        mitigation: 'Send RSVP reminders with deadline emphasis',
      });
    }

    return risks;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(guests: any[]): Opportunity[] {
    return [
      {
        type: 'personalization',
        potentialGain: '30% increase in engagement',
        effortRequired: 'low',
        description: 'Add personalization to communications',
        actionPlan: [
          'Use guest names in subject lines',
          'Reference table assignments',
          'Include personalized schedule',
        ],
      },
      {
        type: 'timing_optimization',
        potentialGain: '25% better open rates',
        effortRequired: 'medium',
        description: 'Optimize send times per guest',
        actionPlan: [
          'Analyze individual open patterns',
          'Implement timezone adjustments',
          'Schedule based on engagement history',
        ],
      },
    ];
  }

  /**
   * Check if insight is relevant to wedding
   */
  private isInsightRelevantToWedding(
    insight: CommunicationInsight,
    weddingId: string,
  ): boolean {
    // Implementation would check if insight affects guests from this wedding
    return true; // Simplified
  }

  /**
   * Add insight to collection
   */
  private addInsight(insight: CommunicationInsight): void {
    this.insights.set(insight.id, insight);
    this.emit('insight:generated', insight);
  }

  /**
   * Get first engagement date
   */
  private getFirstEngagement(communications: any[]): Date | null {
    const engaged = communications.filter((c) => c.openedAt || c.clickedAt);
    if (engaged.length === 0) return null;

    return engaged.reduce(
      (earliest, c) => {
        const date = new Date(c.openedAt || c.clickedAt);
        return date < earliest ? date : earliest;
      },
      new Date(engaged[0].openedAt || engaged[0].clickedAt),
    );
  }

  /**
   * Get last engagement date
   */
  private getLastEngagement(communications: any[]): Date | null {
    const engaged = communications.filter((c) => c.openedAt || c.clickedAt);
    if (engaged.length === 0) return null;

    return engaged.reduce(
      (latest, c) => {
        const date = new Date(c.openedAt || c.clickedAt);
        return date > latest ? date : latest;
      },
      new Date(engaged[0].openedAt || engaged[0].clickedAt),
    );
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    this.analysisTimer = setInterval(
      () => {
        this.generateInsights();
        this.emit('analysis:complete', {
          insightCount: this.insights.size,
          patternCount: this.patterns.size,
        });
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  /**
   * Generate unique insight ID
   */
  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export insights as report
   */
  exportReport(format: 'json' | 'html' = 'json'): string {
    const data = {
      insights: Array.from(this.insights.values()),
      segments: Array.from(this.segmentCache.values()),
      metrics: Array.from(this.weddingMetrics.values()),
      generatedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.generateHTMLReport(data);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(data: any): string {
    // Simplified HTML generation
    return `
      <html>
        <head><title>Communication Insights Report</title></head>
        <body>
          <h1>Communication Insights</h1>
          <h2>Key Insights (${data.insights.length})</h2>
          ${data.insights
            .map(
              (i: any) => `
            <div>
              <h3>${i.title}</h3>
              <p>${i.description}</p>
            </div>
          `,
            )
            .join('')}
        </body>
      </html>
    `;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    this.patterns.clear();
    this.insights.clear();
    this.weddingMetrics.clear();
    this.segmentCache.clear();
    this.removeAllListeners();
  }
}
