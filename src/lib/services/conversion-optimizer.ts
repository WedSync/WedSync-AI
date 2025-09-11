import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';

export interface ConversionTest {
  id: string;
  name: string;
  test_type: 'template' | 'timing' | 'channel' | 'subject';
  status: 'draft' | 'running' | 'completed' | 'paused';
  start_date: string;
  end_date?: string;
  variants: ConversionVariant[];
  target_metrics: string[];
  minimum_sample_size: number;
  confidence_level: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionVariant {
  id: string;
  name: string;
  variant_key: string;
  traffic_allocation: number;
  configuration: Record<string, any>;
  is_control: boolean;
}

export interface ConversionResults {
  test_id: string;
  variant_id: string;
  metric_name: string;
  total_invitations: number;
  conversions: number;
  conversion_rate: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  statistical_significance: boolean;
  p_value: number;
  improvement_over_control: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'template' | 'timing' | 'channel' | 'targeting' | 'frequency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expected_impact: number;
  confidence_score: number;
  implementation_effort: 'low' | 'medium' | 'high';
  based_on_data: {
    sample_size: number;
    time_period: string;
    key_metrics: Record<string, number>;
  };
  recommended_actions: string[];
  created_at: string;
}

export interface ConversionFunnelAnalysis {
  stage: string;
  total_users: number;
  converted_users: number;
  conversion_rate: number;
  drop_off_rate: number;
  avg_time_in_stage: number;
  bottlenecks: string[];
}

export interface PersonalizationRule {
  id: string;
  name: string;
  condition: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  action: {
    type: 'template' | 'timing' | 'channel' | 'content';
    value: any;
  };
  priority: number;
  is_active: boolean;
}

export class ConversionOptimizer {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new A/B test for conversion optimization
   */
  async createConversionTest(
    testData: Omit<ConversionTest, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ConversionTest> {
    try {
      // Validate traffic allocation sums to 100%
      const totalAllocation = testData.variants.reduce(
        (sum, variant) => sum + variant.traffic_allocation,
        0,
      );
      if (Math.abs(totalAllocation - 100) > 0.01) {
        throw new Error('Traffic allocation must sum to 100%');
      }

      // Ensure exactly one control variant
      const controlVariants = testData.variants.filter((v) => v.is_control);
      if (controlVariants.length !== 1) {
        throw new Error('Test must have exactly one control variant');
      }

      const testId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert test
      const { data: test, error: testError } = await this.supabase
        .from('viral_ab_tests')
        .insert({
          id: testId,
          name: testData.name,
          test_type: testData.test_type,
          status: testData.status,
          start_date: testData.start_date,
          end_date: testData.end_date,
          target_metrics: testData.target_metrics,
          minimum_sample_size: testData.minimum_sample_size,
          confidence_level: testData.confidence_level,
          created_by: testData.created_by,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Insert variants
      const variantInserts = testData.variants.map((variant) => ({
        id: crypto.randomUUID(),
        test_id: testId,
        name: variant.name,
        variant_key: variant.variant_key,
        traffic_allocation: variant.traffic_allocation,
        configuration: variant.configuration,
        is_control: variant.is_control,
        created_at: now,
      }));

      const { error: variantsError } = await this.supabase
        .from('viral_ab_test_variants')
        .insert(variantInserts);

      if (variantsError) throw variantsError;

      return {
        ...test,
        variants: testData.variants,
      };
    } catch (error) {
      console.error('Error creating conversion test:', error);
      throw new Error(
        `Failed to create conversion test: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get conversion test results with statistical analysis
   */
  async getConversionTestResults(testId: string): Promise<ConversionResults[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'calculate_conversion_test_results',
        {
          p_test_id: testId,
        },
      );

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting conversion test results:', error);
      throw new Error(
        `Failed to get test results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate optimization recommendations based on data analysis
   */
  async generateOptimizationRecommendations(
    userId: string,
  ): Promise<OptimizationRecommendation[]> {
    try {
      // Analyze invitation performance data
      const { data: invitationData, error: invitationError } =
        await this.supabase
          .from('viral_invitations')
          .select(
            `
          invitation_type,
          channel,
          status,
          created_at,
          opened_at,
          clicked_at,
          accepted_at,
          template_preference,
          wedding_context
        `,
          )
          .eq('sender_id', userId)
          .gte(
            'created_at',
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          ); // Last 90 days

      if (invitationError) throw invitationError;

      // Analyze tracking events
      const { data: eventData, error: eventError } = await this.supabase
        .from('invitation_tracking_events')
        .select(
          `
          event_type,
          timestamp,
          device_info,
          location_data,
          invitation_id
        `,
        )
        .in(
          'invitation_id',
          (invitationData || []).map((inv) => inv.id),
        );

      if (eventError) throw eventError;

      const recommendations: OptimizationRecommendation[] = [];
      const now = new Date().toISOString();

      // Template Performance Analysis
      const templateRecommendation = this.analyzeTemplatePerformance(
        invitationData || [],
        eventData || [],
      );
      if (templateRecommendation) {
        recommendations.push({
          ...templateRecommendation,
          id: crypto.randomUUID(),
          created_at: now,
        });
      }

      // Channel Optimization Analysis
      const channelRecommendation = this.analyzeChannelPerformance(
        invitationData || [],
        eventData || [],
      );
      if (channelRecommendation) {
        recommendations.push({
          ...channelRecommendation,
          id: crypto.randomUUID(),
          created_at: now,
        });
      }

      // Timing Optimization Analysis
      const timingRecommendation = this.analyzeTimingPerformance(
        invitationData || [],
        eventData || [],
      );
      if (timingRecommendation) {
        recommendations.push({
          ...timingRecommendation,
          id: crypto.randomUUID(),
          created_at: now,
        });
      }

      // Device/Location Targeting Analysis
      const targetingRecommendation = this.analyzeTargetingPerformance(
        invitationData || [],
        eventData || [],
      );
      if (targetingRecommendation) {
        recommendations.push({
          ...targetingRecommendation,
          id: crypto.randomUUID(),
          created_at: now,
        });
      }

      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      throw new Error(
        `Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Analyze conversion funnel to identify bottlenecks
   */
  async analyzeConversionFunnel(
    userId: string,
    dateRange: { from: string; to: string },
  ): Promise<ConversionFunnelAnalysis[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'analyze_conversion_funnel',
        {
          p_user_id: userId,
          p_date_from: dateRange.from,
          p_date_to: dateRange.to,
        },
      );

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error analyzing conversion funnel:', error);
      throw new Error(
        `Failed to analyze funnel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Apply personalization rules to invitation
   */
  async applyPersonalization(
    invitationData: any,
    userId: string,
  ): Promise<any> {
    try {
      const { data: rules, error } = await this.supabase
        .from('personalization_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      let personalizedData = { ...invitationData };

      for (const rule of rules || []) {
        if (this.evaluateCondition(personalizedData, rule.condition)) {
          personalizedData = this.applyAction(personalizedData, rule.action);
        }
      }

      return personalizedData;
    } catch (error) {
      console.error('Error applying personalization:', error);
      throw new Error(
        `Failed to apply personalization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get optimal sending time based on historical data
   */
  async getOptimalSendingTime(
    userId: string,
    invitationType: string,
    channel: string,
  ): Promise<{
    hour: number;
    dayOfWeek: number;
    confidence: number;
    reason: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc(
        'calculate_optimal_sending_time',
        {
          p_user_id: userId,
          p_invitation_type: invitationType,
          p_channel: channel,
        },
      );

      if (error) throw error;

      return (
        data || {
          hour: 10,
          dayOfWeek: 2,
          confidence: 0.5,
          reason: 'Default recommendation based on industry best practices',
        }
      );
    } catch (error) {
      console.error('Error calculating optimal sending time:', error);
      return {
        hour: 10,
        dayOfWeek: 2,
        confidence: 0.5,
        reason: 'Default recommendation due to insufficient data',
      };
    }
  }

  // Private helper methods

  private analyzeTemplatePerformance(
    invitations: any[],
    events: any[],
  ): Omit<OptimizationRecommendation, 'id' | 'created_at'> | null {
    // Analyze which templates perform best
    const templateStats = new Map();

    invitations.forEach((inv) => {
      const template = inv.template_preference;
      if (!templateStats.has(template)) {
        templateStats.set(template, {
          sent: 0,
          opened: 0,
          clicked: 0,
          accepted: 0,
        });
      }
      templateStats.get(template).sent++;

      if (inv.opened_at) templateStats.get(template).opened++;
      if (inv.clicked_at) templateStats.get(template).clicked++;
      if (inv.accepted_at) templateStats.get(template).accepted++;
    });

    const bestTemplate = Array.from(templateStats.entries())
      .map(([template, stats]) => ({
        template,
        acceptance_rate: stats.sent > 0 ? stats.accepted / stats.sent : 0,
        sample_size: stats.sent,
      }))
      .filter((t) => t.sample_size >= 10)
      .sort((a, b) => b.acceptance_rate - a.acceptance_rate)[0];

    if (bestTemplate && bestTemplate.acceptance_rate > 0.1) {
      return {
        type: 'template',
        priority: 'high',
        title: `Switch to High-Performing Template`,
        description: `Template "${bestTemplate.template}" shows ${(bestTemplate.acceptance_rate * 100).toFixed(1)}% acceptance rate, significantly outperforming others.`,
        expected_impact: bestTemplate.acceptance_rate * 100,
        confidence_score: Math.min(0.95, bestTemplate.sample_size / 100),
        implementation_effort: 'low',
        based_on_data: {
          sample_size: bestTemplate.sample_size,
          time_period: '90 days',
          key_metrics: {
            acceptance_rate: bestTemplate.acceptance_rate,
            sample_size: bestTemplate.sample_size,
          },
        },
        recommended_actions: [
          `Set "${bestTemplate.template}" as your default template`,
          'A/B test this template against your current default',
          'Analyze what makes this template effective and apply learnings to other templates',
        ],
      };
    }

    return null;
  }

  private analyzeChannelPerformance(
    invitations: any[],
    events: any[],
  ): Omit<OptimizationRecommendation, 'id' | 'created_at'> | null {
    const channelStats = new Map();

    invitations.forEach((inv) => {
      const channel = inv.channel;
      if (!channelStats.has(channel)) {
        channelStats.set(channel, {
          sent: 0,
          opened: 0,
          clicked: 0,
          accepted: 0,
        });
      }
      channelStats.get(channel).sent++;

      if (inv.opened_at) channelStats.get(channel).opened++;
      if (inv.clicked_at) channelStats.get(channel).clicked++;
      if (inv.accepted_at) channelStats.get(channel).accepted++;
    });

    const bestChannel = Array.from(channelStats.entries())
      .map(([channel, stats]) => ({
        channel,
        acceptance_rate: stats.sent > 0 ? stats.accepted / stats.sent : 0,
        sample_size: stats.sent,
      }))
      .filter((c) => c.sample_size >= 5)
      .sort((a, b) => b.acceptance_rate - a.acceptance_rate)[0];

    if (bestChannel && bestChannel.acceptance_rate > 0.08) {
      return {
        type: 'channel',
        priority: 'medium',
        title: `Optimize Channel Distribution`,
        description: `${bestChannel.channel} shows ${(bestChannel.acceptance_rate * 100).toFixed(1)}% acceptance rate. Consider increasing allocation to this channel.`,
        expected_impact: bestChannel.acceptance_rate * 80,
        confidence_score: Math.min(0.9, bestChannel.sample_size / 50),
        implementation_effort: 'low',
        based_on_data: {
          sample_size: bestChannel.sample_size,
          time_period: '90 days',
          key_metrics: {
            acceptance_rate: bestChannel.acceptance_rate,
            channel_performance: bestChannel.channel,
          },
        },
        recommended_actions: [
          `Increase allocation to ${bestChannel.channel} channel`,
          'Test different messaging for underperforming channels',
          'Consider channel preferences based on invitation type',
        ],
      };
    }

    return null;
  }

  private analyzeTimingPerformance(
    invitations: any[],
    events: any[],
  ): Omit<OptimizationRecommendation, 'id' | 'created_at'> | null {
    // Analyze sending times and response patterns
    const hourlyStats = new Array(24)
      .fill(0)
      .map(() => ({ sent: 0, opened: 0, accepted: 0 }));

    invitations.forEach((inv) => {
      const hour = new Date(inv.created_at).getHours();
      hourlyStats[hour].sent++;

      if (inv.opened_at) hourlyStats[hour].opened++;
      if (inv.accepted_at) hourlyStats[hour].accepted++;
    });

    const bestHour = hourlyStats
      .map((stats, hour) => ({
        hour,
        acceptance_rate: stats.sent > 0 ? stats.accepted / stats.sent : 0,
        sample_size: stats.sent,
      }))
      .filter((h) => h.sample_size >= 5)
      .sort((a, b) => b.acceptance_rate - a.acceptance_rate)[0];

    if (bestHour && bestHour.acceptance_rate > 0.05) {
      return {
        type: 'timing',
        priority: 'medium',
        title: 'Optimize Send Timing',
        description: `Invitations sent at ${bestHour.hour}:00 show ${(bestHour.acceptance_rate * 100).toFixed(1)}% acceptance rate. Consider scheduling more invitations at this time.`,
        expected_impact: bestHour.acceptance_rate * 60,
        confidence_score: Math.min(0.85, bestHour.sample_size / 30),
        implementation_effort: 'low',
        based_on_data: {
          sample_size: bestHour.sample_size,
          time_period: '90 days',
          key_metrics: {
            optimal_hour: bestHour.hour,
            acceptance_rate: bestHour.acceptance_rate,
          },
        },
        recommended_actions: [
          `Schedule more invitations around ${bestHour.hour}:00`,
          'Test different time zones for recipients',
          'Consider day-of-week patterns',
        ],
      };
    }

    return null;
  }

  private analyzeTargetingPerformance(
    invitations: any[],
    events: any[],
  ): Omit<OptimizationRecommendation, 'id' | 'created_at'> | null {
    // Analyze device and location patterns from events
    const deviceStats = new Map();

    events.forEach((event) => {
      if (event.device_info?.device_type) {
        const device = event.device_info.device_type;
        if (!deviceStats.has(device)) {
          deviceStats.set(device, { views: 0, conversions: 0 });
        }
        deviceStats.get(device).views++;

        if (event.event_type === 'accepted') {
          deviceStats.get(device).conversions++;
        }
      }
    });

    const bestDevice = Array.from(deviceStats.entries())
      .map(([device, stats]) => ({
        device,
        conversion_rate: stats.views > 0 ? stats.conversions / stats.views : 0,
        sample_size: stats.views,
      }))
      .filter((d) => d.sample_size >= 10)
      .sort((a, b) => b.conversion_rate - a.conversion_rate)[0];

    if (bestDevice && bestDevice.conversion_rate > 0.03) {
      return {
        type: 'targeting',
        priority: 'low',
        title: 'Device-Based Optimization',
        description: `${bestDevice.device} users show ${(bestDevice.conversion_rate * 100).toFixed(1)}% conversion rate. Consider device-specific messaging.`,
        expected_impact: bestDevice.conversion_rate * 40,
        confidence_score: Math.min(0.8, bestDevice.sample_size / 100),
        implementation_effort: 'medium',
        based_on_data: {
          sample_size: bestDevice.sample_size,
          time_period: '90 days',
          key_metrics: {
            best_device: bestDevice.device,
            conversion_rate: bestDevice.conversion_rate,
          },
        },
        recommended_actions: [
          `Optimize templates for ${bestDevice.device} users`,
          'Consider device-specific landing pages',
          'Test mobile vs desktop messaging strategies',
        ],
      };
    }

    return null;
  }

  private evaluateCondition(
    data: any,
    condition: PersonalizationRule['condition'],
  ): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  }

  private applyAction(data: any, action: PersonalizationRule['action']): any {
    const result = { ...data };

    switch (action.type) {
      case 'template':
        result.template_id = action.value;
        break;
      case 'channel':
        result.channel = action.value;
        break;
      case 'timing':
        result.scheduled_at = action.value;
        break;
      case 'content':
        result.personalized_message = action.value;
        break;
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
