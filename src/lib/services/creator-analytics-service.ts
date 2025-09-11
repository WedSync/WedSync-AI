import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface AnalyticsEvent {
  creatorId: string;
  templateId: string;
  eventType:
    | 'view'
    | 'click'
    | 'purchase'
    | 'bundle_view'
    | 'download'
    | 'preview';
  eventData?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  weddingSeason?: 'spring' | 'summer' | 'fall' | 'winter';
  weddingType?: string;
  referrerCategory?: string;
}

interface TrackingConfig {
  enableRealtime?: boolean;
  enableBatching?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

class CreatorAnalyticsService {
  private supabase = createClient();
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private config: TrackingConfig;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: TrackingConfig = {}) {
    this.sessionId = this.getOrCreateSessionId();
    this.config = {
      enableRealtime: true,
      enableBatching: true,
      batchSize: 10,
      flushInterval: 5000, // 5 seconds
      ...config,
    };

    if (this.config.enableBatching && this.config.flushInterval) {
      this.startBatchFlushTimer();
    }

    // Flush events on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return uuidv4();

    const storedSessionId = sessionStorage.getItem('analytics_session_id');
    if (storedSessionId) return storedSessionId;

    const newSessionId = uuidv4();
    sessionStorage.setItem('analytics_session_id', newSessionId);
    return newSessionId;
  }

  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private startBatchFlushTimer() {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  async trackEvent(event: Omit<AnalyticsEvent, 'sessionId'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      sessionId: this.sessionId,
      weddingSeason: event.weddingSeason || this.getCurrentSeason(),
    };

    if (this.config.enableBatching) {
      this.eventQueue.push(fullEvent);
      if (this.eventQueue.length >= this.config.batchSize!) {
        await this.flush();
      }
    } else {
      await this.sendEvents([fullEvent]);
    }

    // Track significant events immediately
    if (['purchase', 'download'].includes(event.eventType)) {
      await this.updateDailyMetrics(
        event.creatorId,
        event.eventType,
        event.eventData,
      );

      if (this.config.enableRealtime && event.eventType === 'purchase') {
        await this.sendRealtimeUpdate(event.creatorId, {
          type: 'new_purchase',
          templateId: event.templateId,
          revenue: event.eventData?.revenue || 0,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  async trackTemplateView(
    creatorId: string,
    templateId: string,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      creatorId,
      templateId,
      eventType: 'view',
      eventData: additionalData,
    });
  }

  async trackTemplateClick(
    creatorId: string,
    templateId: string,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      creatorId,
      templateId,
      eventType: 'click',
      eventData: additionalData,
    });
  }

  async trackPurchase(
    creatorId: string,
    templateId: string,
    revenue: number,
    userId?: string,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    return this.trackEvent({
      creatorId,
      templateId,
      eventType: 'purchase',
      userId,
      eventData: {
        revenue,
        ...additionalData,
      },
    });
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const { error } = await this.supabase
        .from('creator_analytics_events')
        .insert(
          events.map((event) => ({
            ...event,
            created_at: new Date().toISOString(),
          })),
        );

      if (error) {
        console.error('Failed to track analytics events:', error);
        // Could implement retry logic or store failed events
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    await this.sendEvents(eventsToSend);
  }

  private async updateDailyMetrics(
    creatorId: string,
    eventType: string,
    eventData?: Record<string, any>,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const updates: Record<string, any> = {};

    if (eventType === 'view') {
      updates.template_views = 1;
    } else if (eventType === 'click') {
      updates.template_clicks = 1;
    } else if (eventType === 'purchase') {
      updates.purchases = 1;
      updates.gross_revenue = eventData?.revenue || 0;
      // Calculate net revenue (assuming 30% commission)
      updates.net_revenue = Math.round((eventData?.revenue || 0) * 0.7);
    }

    try {
      await this.supabase.rpc('increment_daily_metrics', {
        p_creator_id: creatorId,
        p_date: today,
        p_updates: updates,
      });
    } catch (error) {
      console.error('Failed to update daily metrics:', error);
    }
  }

  private async sendRealtimeUpdate(
    creatorId: string,
    update: any,
  ): Promise<void> {
    try {
      const channel = this.supabase.channel(`creator_${creatorId}`);
      await channel.send({
        type: 'broadcast',
        event: 'analytics_update',
        payload: update,
      });
    } catch (error) {
      console.error('Failed to send realtime update:', error);
    }
  }

  async generateInsights(creatorId: string): Promise<any> {
    try {
      // Get creator's performance data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await this.supabase
        .from('creator_daily_metrics')
        .select('*')
        .eq('creator_id', creatorId)
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (!metrics || metrics.length === 0) {
        return { insights: [], recommendations: {} };
      }

      const insights = [];

      // Calculate average conversion rate
      const avgConversion =
        metrics.reduce((sum, m) => sum + Number(m.conversion_rate), 0) /
        metrics.length;

      // Low conversion rate insight
      if (avgConversion < 0.02) {
        insights.push({
          id: `conversion-${Date.now()}`,
          type: 'pricing',
          severity: 'high',
          title: 'Low Conversion Rate Detected',
          description: `Your conversion rate of ${(avgConversion * 100).toFixed(1)}% is below the industry average of 2.5%`,
          impact: 'Could increase revenue by 25-40% with optimization',
          actionable: true,
          suggestedActions: [
            {
              action: 'Review pricing strategy',
              description:
                'Consider reducing prices by 10-15% to test market response',
              estimatedUplift: '+25% in conversions',
            },
            {
              action: 'Optimize template descriptions',
              description:
                'Focus on specific wedding pain points and time-saving benefits',
              estimatedUplift: '+15% in conversions',
            },
          ],
          weddingContext:
            'Wedding coordinators are price-sensitive during off-peak seasons. Consider seasonal pricing adjustments.',
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      // Revenue trend analysis
      const recentRevenue = metrics
        .slice(0, 7)
        .reduce((sum, m) => sum + (m.gross_revenue || 0), 0);
      const previousRevenue = metrics
        .slice(7, 14)
        .reduce((sum, m) => sum + (m.gross_revenue || 0), 0);

      if (previousRevenue > 0 && recentRevenue < previousRevenue * 0.7) {
        insights.push({
          id: `revenue-decline-${Date.now()}`,
          type: 'performance',
          severity: 'medium',
          title: 'Revenue Decline Detected',
          description: `Your revenue has decreased by ${Math.round((1 - recentRevenue / previousRevenue) * 100)}% compared to last week`,
          impact: 'Take action to reverse the trend',
          actionable: true,
          suggestedActions: [
            {
              action: 'Launch promotional campaign',
              description: 'Offer limited-time discount to boost sales',
              estimatedUplift: '+30% in weekly sales',
            },
            {
              action: 'Update template previews',
              description: 'Refresh screenshots and descriptions',
              estimatedUplift: '+20% in click-through rate',
            },
          ],
          weddingContext:
            'Wedding planning activity typically increases on Sundays and Mondays. Time your promotions accordingly.',
          expires_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      // Seasonal performance analysis
      const seasonalBreakdown = this.analyzeSeasonalPerformance(metrics);
      if (seasonalBreakdown.strongestSeason) {
        insights.push({
          id: `seasonal-${Date.now()}`,
          type: 'seasonality',
          severity: 'low',
          title: 'Seasonal Performance Pattern Identified',
          description: `Your templates perform ${seasonalBreakdown.uplift}% better during ${seasonalBreakdown.strongestSeason} wedding season`,
          impact: `Focus marketing during ${seasonalBreakdown.strongestSeason} for maximum ROI`,
          actionable: true,
          suggestedActions: [
            {
              action: `Increase marketing spend during ${seasonalBreakdown.strongestSeason}`,
              description: 'Capitalize on your strongest performance period',
              estimatedUplift: `+${seasonalBreakdown.uplift}% revenue`,
            },
          ],
          weddingContext: `${seasonalBreakdown.strongestSeason} weddings typically have different planning timelines and coordinator needs`,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        creatorId,
        metrics,
      );

      return { insights, recommendations };
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return { insights: [], recommendations: {} };
    }
  }

  private analyzeSeasonalPerformance(metrics: any[]): any {
    const seasonalTotals = { spring: 0, summer: 0, fall: 0, winter: 0 };

    metrics.forEach((metric) => {
      if (metric.wedding_season_breakdown) {
        Object.entries(metric.wedding_season_breakdown).forEach(
          ([season, data]: [string, any]) => {
            seasonalTotals[season as keyof typeof seasonalTotals] +=
              data.revenue || 0;
          },
        );
      }
    });

    const avgRevenue =
      Object.values(seasonalTotals).reduce((sum, rev) => sum + rev, 0) / 4;
    const entries = Object.entries(seasonalTotals).sort(
      ([, a], [, b]) => b - a,
    );
    const strongestSeason = entries[0];

    if (avgRevenue === 0) {
      return { strongestSeason: null, uplift: 0 };
    }

    return {
      strongestSeason: strongestSeason[0],
      uplift: Math.round(
        ((strongestSeason[1] - avgRevenue) / avgRevenue) * 100,
      ),
    };
  }

  private async generateRecommendations(
    creatorId: string,
    metrics: any[],
  ): Promise<any> {
    try {
      // Bundle opportunity analysis
      const { data: bundleOpportunities } = await this.supabase.rpc(
        'analyze_bundle_opportunities',
        {
          p_creator_id: creatorId,
          p_days_back: 30,
        },
      );

      // Calculate pricing optimization based on conversion rates
      const avgConversion =
        metrics.reduce((sum, m) => sum + Number(m.conversion_rate), 0) /
        metrics.length;
      const pricingOptimization = [];

      if (avgConversion < 0.02) {
        // Suggest price reduction for low conversion
        pricingOptimization.push({
          currentPrice: 2500, // Would need actual template prices
          suggestedPrice: 2125, // 15% reduction
          expectedUplift: 25,
          confidence: 0.75,
        });
      }

      // Seasonal strategies based on current month
      const currentMonth = new Date().getMonth();
      const seasonalStrategies = [
        {
          season: 'spring',
          strategy:
            'Launch romantic and outdoor wedding templates 60 days before spring',
          expectedImpact:
            '+30% revenue during peak spring booking (January-March)',
        },
        {
          season: 'summer',
          strategy: 'Focus on beach and destination wedding templates',
          expectedImpact: '+25% conversion for luxury coordinator segment',
        },
        {
          season: 'fall',
          strategy: 'Promote rustic and harvest-themed templates',
          expectedImpact: '+20% engagement from budget-conscious coordinators',
        },
        {
          season: 'winter',
          strategy: 'Offer bundled packages for indoor venue planning',
          expectedImpact: '+35% average order value during holiday season',
        },
      ];

      return {
        pricingOptimization,
        bundleOpportunities:
          bundleOpportunities?.map((bundle: any) => ({
            templates: bundle.template_ids,
            bundleName: 'Template Bundle',
            individualPrice: bundle.individual_total,
            suggestedBundlePrice: Math.round(bundle.individual_total * 0.85),
            projectedSales: Math.round(bundle.frequency * 100),
          })) || [],
        seasonalStrategies,
      };
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return {
        pricingOptimization: [],
        bundleOpportunities: [],
        seasonalStrategies: [],
      };
    }
  }

  // A/B Test tracking
  async getActiveABTest(templateId: string): Promise<any> {
    try {
      const { data: test } = await this.supabase
        .from('creator_ab_tests')
        .select('*')
        .eq('template_id', templateId)
        .eq('status', 'running')
        .single();

      if (!test) return null;

      // Determine variant based on traffic allocation
      const isTestVariant = Math.random() < test.traffic_allocation;

      return {
        testId: test.id,
        variant: isTestVariant ? 'test' : 'control',
        changes: isTestVariant ? test.test_variant : test.control_variant,
      };
    } catch (error) {
      console.error('Failed to get A/B test:', error);
      return null;
    }
  }

  async recordABTestConversion(
    testId: string,
    variant: 'control' | 'test',
  ): Promise<void> {
    try {
      const field =
        variant === 'test' ? 'test_conversions' : 'control_conversions';

      await this.supabase.rpc('increment_ab_test_metric', {
        p_test_id: testId,
        p_field: field,
        p_increment: 1,
      });
    } catch (error) {
      console.error('Failed to record A/B test conversion:', error);
    }
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
let analyticsInstance: CreatorAnalyticsService | null = null;

export function getCreatorAnalytics(
  config?: TrackingConfig,
): CreatorAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new CreatorAnalyticsService(config);
  }
  return analyticsInstance;
}

export default CreatorAnalyticsService;
