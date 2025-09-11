import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';
import { ViralCoefficientService } from './viral-coefficient-service';

export interface ViralReport {
  id: string;
  user_id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  generated_at: string;
  metrics: ViralReportMetrics;
  insights: ViralReportInsights[];
  alerts: ViralAlert[];
  recommendations: ViralRecommendation[];
  status: 'generating' | 'completed' | 'failed';
}

export interface ViralReportMetrics {
  viral_coefficient: {
    current: number;
    previous: number;
    change_percentage: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  funnel_metrics: {
    stage_1_rate: number; // Vendor imports clients
    stage_2_rate: number; // Invites couples to WedMe
    stage_3_rate: number; // Couples accept invitations
    stage_4_rate: number; // Couples invite missing vendors
    stage_5_rate: number; // Those vendors sign up for WedSync
  };
  invitation_metrics: {
    total_sent: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    acceptance_rate: number;
  };
  growth_metrics: {
    new_users: number;
    activated_users: number;
    organic_growth_rate: number;
    viral_growth_rate: number;
  };
  performance_metrics: {
    top_performing_templates: string[];
    best_channels: string[];
    optimal_send_times: Array<{
      hour: number;
      day: number;
      conversion_rate: number;
    }>;
  };
}

export interface ViralReportInsights {
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning';
  title: string;
  description: string;
  metric_affected: string;
  impact_level: 'high' | 'medium' | 'low';
  confidence_score: number;
  supporting_data: Record<string, any>;
}

export interface ViralAlert {
  id: string;
  user_id: string;
  alert_type: 'threshold' | 'trend' | 'anomaly' | 'goal_achieved';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric_name: string;
  current_value: number;
  threshold_value?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  actions_taken?: string[];
  notification_sent: boolean;
}

export interface ViralRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'template' | 'timing' | 'targeting' | 'channel' | 'strategy';
  title: string;
  description: string;
  expected_impact: string;
  implementation_steps: string[];
  success_metrics: string[];
  timeline: string;
}

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  metric_name: string;
  condition_type: 'above' | 'below' | 'change_percentage' | 'trend';
  threshold_value: number;
  comparison_period: '1d' | '7d' | '30d';
  notification_channels: ('email' | 'sms' | 'webhook')[];
  is_active: boolean;
  created_at: string;
  last_triggered?: string;
}

export class ViralReportingService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private viralService: ViralCoefficientService,
  ) {}

  /**
   * Generate a comprehensive viral coefficient report
   */
  async generateViralReport(
    userId: string,
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
    periodStart?: string,
    periodEnd?: string,
  ): Promise<ViralReport> {
    try {
      const reportId = crypto.randomUUID();
      const now = new Date();

      // Calculate period dates based on report type
      const period = this.calculateReportPeriod(
        reportType,
        periodStart,
        periodEnd,
      );

      // Create report record
      await this.supabase.from('viral_reports').insert({
        id: reportId,
        user_id: userId,
        report_type: reportType,
        period_start: period.start,
        period_end: period.end,
        status: 'generating',
        created_at: now.toISOString(),
      });

      try {
        // Generate all report sections
        const [metrics, insights, alerts, recommendations] = await Promise.all([
          this.generateMetrics(userId, period.start, period.end),
          this.generateInsights(userId, period.start, period.end),
          this.checkAlerts(userId),
          this.generateRecommendations(userId, period.start, period.end),
        ]);

        const report: ViralReport = {
          id: reportId,
          user_id: userId,
          report_type: reportType,
          period_start: period.start,
          period_end: period.end,
          generated_at: now.toISOString(),
          metrics,
          insights,
          alerts,
          recommendations,
          status: 'completed',
        };

        // Update report with generated data
        await this.supabase
          .from('viral_reports')
          .update({
            metrics: report.metrics,
            insights: report.insights,
            alerts: report.alerts,
            recommendations: report.recommendations,
            status: 'completed',
            completed_at: now.toISOString(),
          })
          .eq('id', reportId);

        return report;
      } catch (error) {
        // Mark report as failed
        await this.supabase
          .from('viral_reports')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', reportId);

        throw error;
      }
    } catch (error) {
      console.error('Error generating viral report:', error);
      throw new Error(
        `Failed to generate viral report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get viral reports with filtering and pagination
   */
  async getViralReports(
    userId: string,
    filters: {
      report_type?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ reports: ViralReport[]; total: number; pagination: any }> {
    try {
      let query = this.supabase
        .from('viral_reports')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters.report_type) {
        query = query.eq('report_type', filters.report_type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.date_from) {
        query = query.gte('period_start', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('period_end', filters.date_to);
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        reports: data || [],
        total: count || 0,
        pagination: {
          page,
          limit,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting viral reports:', error);
      throw new Error(
        `Failed to get reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create or update alert rules
   */
  async createAlertRule(
    ruleData: Omit<AlertRule, 'id' | 'created_at'>,
  ): Promise<AlertRule> {
    try {
      const rule = {
        id: crypto.randomUUID(),
        ...ruleData,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('viral_alert_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw new Error(
        `Failed to create alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check all active alerts for a user
   */
  async checkAlerts(userId: string): Promise<ViralAlert[]> {
    try {
      // Get active alert rules
      const { data: alertRules, error: rulesError } = await this.supabase
        .from('viral_alert_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (rulesError) throw rulesError;

      const activeAlerts: ViralAlert[] = [];

      // Check each rule
      for (const rule of alertRules || []) {
        const alert = await this.evaluateAlertRule(rule);
        if (alert) {
          activeAlerts.push(alert);

          // Send notification if configured
          if (!alert.notification_sent) {
            await this.sendAlertNotification(alert, rule);
          }
        }
      }

      return activeAlerts;
    } catch (error) {
      console.error('Error checking alerts:', error);
      throw new Error(
        `Failed to check alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotification(
    alert: ViralAlert,
    rule: AlertRule,
  ): Promise<void> {
    try {
      for (const channel of rule.notification_channels) {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert, rule);
            break;
          case 'sms':
            await this.sendSMSAlert(alert, rule);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, rule);
            break;
        }
      }

      // Mark notification as sent
      await this.supabase
        .from('viral_alerts')
        .update({ notification_sent: true })
        .eq('id', alert.id);
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  /**
   * Generate automated recommendations based on report data
   */
  async generateRecommendations(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ViralRecommendation[]> {
    try {
      // Get current viral coefficient
      const currentMetrics =
        await this.viralService.calculateViralCoefficient(userId);

      // Get historical data for comparison
      const historicalMetrics = await this.viralService.getViralTrends(userId, {
        start_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const recommendations: ViralRecommendation[] = [];

      // Low viral coefficient recommendation
      if (currentMetrics.current_coefficient < 0.8) {
        recommendations.push({
          type: 'immediate',
          priority: 'critical',
          category: 'strategy',
          title: 'Boost Viral Coefficient - Critical Priority',
          description: `Your viral coefficient of ${currentMetrics.current_coefficient.toFixed(2)} is below the sustainable growth threshold of 1.0. This means your viral growth is not self-sustaining.`,
          expected_impact:
            'Increase viral coefficient by 0.3-0.5 points within 30 days',
          implementation_steps: [
            'Analyze and improve Stage 2 (invitation acceptance) - typically the biggest bottleneck',
            'A/B test invitation templates focusing on emotional connection',
            'Implement referral incentives for both vendors and couples',
            'Optimize onboarding flow to increase early engagement',
            'Add social proof elements to invitations',
          ],
          success_metrics: [
            'Stage 2 conversion rate increases by 15%+',
            'Overall viral coefficient reaches 0.9+ within 30 days',
            'Monthly viral attribution increases by 25%+',
          ],
          timeline: '2-4 weeks for implementation, 4-6 weeks to see results',
        });
      }

      // Stage-specific recommendations
      if (currentMetrics.stage_metrics.stage_2_rate < 0.3) {
        recommendations.push({
          type: 'short_term',
          priority: 'high',
          category: 'template',
          title: 'Improve Invitation Acceptance Rate',
          description:
            'Stage 2 conversion (invitation acceptance) is below 30%, significantly limiting viral growth potential.',
          expected_impact:
            'Increase invitation acceptance rate by 10-15 percentage points',
          implementation_steps: [
            'Redesign invitation templates with wedding-specific language',
            'Add vendor-specific personalization tokens',
            'Include social proof and testimonials in invitations',
            'Test different send times based on recipient time zones',
            'Implement follow-up sequences for non-responders',
          ],
          success_metrics: [
            'Stage 2 conversion rate reaches 35%+',
            'Email open rates increase to 45%+',
            'Click-through rates improve to 15%+',
          ],
          timeline: '1-2 weeks for A/B testing, 2-3 weeks to optimize',
        });
      }

      // Channel optimization recommendation
      const channelData = await this.getChannelPerformance(
        userId,
        periodStart,
        periodEnd,
      );
      const bestChannel = channelData.sort(
        (a, b) => b.conversion_rate - a.conversion_rate,
      )[0];

      if (bestChannel && bestChannel.conversion_rate > 0.4) {
        recommendations.push({
          type: 'short_term',
          priority: 'medium',
          category: 'channel',
          title: 'Optimize Channel Distribution',
          description: `${bestChannel.channel} shows significantly higher performance (${(bestChannel.conversion_rate * 100).toFixed(1)}%) compared to other channels.`,
          expected_impact: 'Increase overall conversion rate by 8-12%',
          implementation_steps: [
            `Increase allocation to ${bestChannel.channel} from current distribution`,
            'Analyze what makes this channel effective',
            'Adapt successful elements to underperforming channels',
            'Test cross-channel messaging consistency',
          ],
          success_metrics: [
            `${bestChannel.channel} handles 60%+ of total invitations`,
            'Overall conversion rate increases by 10%+',
            'Channel ROI improves across all channels',
          ],
          timeline: '1 week for redistribution, 2-3 weeks to measure impact',
        });
      }

      return recommendations.slice(0, 5); // Limit to top 5 recommendations
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Private helper methods

  private calculateReportPeriod(
    reportType: string,
    periodStart?: string,
    periodEnd?: string,
  ): { start: string; end: string } {
    const now = new Date();

    if (reportType === 'custom' && periodStart && periodEnd) {
      return { start: periodStart, end: periodEnd };
    }

    switch (reportType) {
      case 'daily':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
          ).toISOString(),
          end: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
            23,
            59,
            59,
          ).toISOString(),
        };

      case 'weekly':
        const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        return {
          start: new Date(
            lastWeekStart.getFullYear(),
            lastWeekStart.getMonth(),
            lastWeekStart.getDate(),
          ).toISOString(),
          end: new Date(
            lastWeekEnd.getFullYear(),
            lastWeekEnd.getMonth(),
            lastWeekEnd.getDate(),
            23,
            59,
            59,
          ).toISOString(),
        };

      case 'monthly':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: lastMonth.toISOString(),
          end: new Date(
            lastMonthEnd.getFullYear(),
            lastMonthEnd.getMonth(),
            lastMonthEnd.getDate(),
            23,
            59,
            59,
          ).toISOString(),
        };

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  private async generateMetrics(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ViralReportMetrics> {
    // Get current period metrics
    const currentMetrics =
      await this.viralService.calculateViralCoefficient(userId);

    // Get previous period for comparison
    const periodLength =
      new Date(periodEnd).getTime() - new Date(periodStart).getTime();
    const previousStart = new Date(
      new Date(periodStart).getTime() - periodLength,
    ).toISOString();
    const previousEnd = new Date(
      new Date(periodEnd).getTime() - periodLength,
    ).toISOString();

    // This would be implemented with historical data calculation
    const previousCoefficient = 1.0; // Placeholder - would calculate from historical data

    return {
      viral_coefficient: {
        current: currentMetrics.current_coefficient,
        previous: previousCoefficient,
        change_percentage:
          ((currentMetrics.current_coefficient - previousCoefficient) /
            previousCoefficient) *
          100,
        trend:
          currentMetrics.current_coefficient > previousCoefficient
            ? 'improving'
            : currentMetrics.current_coefficient < previousCoefficient
              ? 'declining'
              : 'stable',
      },
      funnel_metrics: {
        stage_1_rate: currentMetrics.stage_metrics.stage_1_rate,
        stage_2_rate: currentMetrics.stage_metrics.stage_2_rate,
        stage_3_rate: currentMetrics.stage_metrics.stage_3_rate,
        stage_4_rate: currentMetrics.stage_metrics.stage_4_rate,
        stage_5_rate: currentMetrics.stage_metrics.stage_5_rate,
      },
      invitation_metrics: {
        total_sent: currentMetrics.attribution_data.total_invitations,
        delivery_rate: 95, // Would calculate from tracking events
        open_rate: 42, // Would calculate from tracking events
        click_rate: 18, // Would calculate from tracking events
        acceptance_rate: currentMetrics.stage_metrics.stage_2_rate * 100,
      },
      growth_metrics: {
        new_users: currentMetrics.attribution_data.viral_signups,
        activated_users: Math.floor(
          currentMetrics.attribution_data.viral_signups * 0.7,
        ),
        organic_growth_rate: 15, // Would calculate from attribution data
        viral_growth_rate:
          (currentMetrics.attribution_data.viral_signups /
            currentMetrics.attribution_data.total_invitations) *
          100,
      },
      performance_metrics: {
        top_performing_templates: [
          'Vendor to Couple Default',
          'Professional Introduction',
        ],
        best_channels: ['email', 'whatsapp'],
        optimal_send_times: [
          { hour: 10, day: 2, conversion_rate: 0.34 },
          { hour: 14, day: 4, conversion_rate: 0.31 },
          { hour: 9, day: 1, conversion_rate: 0.29 },
        ],
      },
    };
  }

  private async generateInsights(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ViralReportInsights[]> {
    // This would analyze trends and generate insights
    // Placeholder implementation
    return [
      {
        type: 'trend',
        title: 'Improving Invitation Acceptance',
        description:
          'Invitation acceptance rates have improved by 12% over the last 7 days, primarily driven by better template personalization.',
        metric_affected: 'stage_2_rate',
        impact_level: 'medium',
        confidence_score: 0.85,
        supporting_data: {
          previous_rate: 0.28,
          current_rate: 0.31,
          sample_size: 450,
        },
      },
    ];
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<ViralAlert | null> {
    // Get current metric value
    const currentValue = await this.getCurrentMetricValue(
      rule.user_id,
      rule.metric_name,
    );

    let shouldTrigger = false;
    let description = '';

    switch (rule.condition_type) {
      case 'above':
        shouldTrigger = currentValue > rule.threshold_value;
        description = `${rule.metric_name} (${currentValue.toFixed(2)}) is above threshold of ${rule.threshold_value}`;
        break;
      case 'below':
        shouldTrigger = currentValue < rule.threshold_value;
        description = `${rule.metric_name} (${currentValue.toFixed(2)}) is below threshold of ${rule.threshold_value}`;
        break;
      // Add other condition types as needed
    }

    if (shouldTrigger) {
      return {
        id: crypto.randomUUID(),
        user_id: rule.user_id,
        alert_type: 'threshold',
        severity:
          currentValue < rule.threshold_value * 0.7 ? 'critical' : 'warning',
        title: `${rule.name} Alert`,
        description,
        metric_name: rule.metric_name,
        current_value: currentValue,
        threshold_value: rule.threshold_value,
        triggered_at: new Date().toISOString(),
        notification_sent: false,
      };
    }

    return null;
  }

  private async getCurrentMetricValue(
    userId: string,
    metricName: string,
  ): Promise<number> {
    // This would get the current value for the specified metric
    // Placeholder implementation
    const metrics = await this.viralService.calculateViralCoefficient(userId);

    switch (metricName) {
      case 'viral_coefficient':
        return metrics.current_coefficient;
      case 'stage_2_rate':
        return metrics.stage_metrics.stage_2_rate;
      default:
        return 0;
    }
  }

  private async getChannelPerformance(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    // This would get channel performance data
    // Placeholder implementation
    return [
      { channel: 'email', conversion_rate: 0.45, total_sent: 1200 },
      { channel: 'sms', conversion_rate: 0.32, total_sent: 400 },
      { channel: 'whatsapp', conversion_rate: 0.38, total_sent: 600 },
    ];
  }

  private async sendEmailAlert(
    alert: ViralAlert,
    rule: AlertRule,
  ): Promise<void> {
    // Implementation would send email via Resend
    console.log('Sending email alert:', alert.title);
  }

  private async sendSMSAlert(
    alert: ViralAlert,
    rule: AlertRule,
  ): Promise<void> {
    // Implementation would send SMS via Twilio
    console.log('Sending SMS alert:', alert.title);
  }

  private async sendWebhookAlert(
    alert: ViralAlert,
    rule: AlertRule,
  ): Promise<void> {
    // Implementation would send webhook
    console.log('Sending webhook alert:', alert.title);
  }
}
