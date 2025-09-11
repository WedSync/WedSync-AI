import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  UpdateAutoScalingGroupCommand,
} from '@aws-sdk/client-auto-scaling';
import { createServerClient } from '@/lib/supabase/server';

interface ScalingMetrics {
  currentConnections: number;
  queueSize: number;
  processingLatency: number;
  errorRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
}

interface ScalingRule {
  metric: keyof ScalingMetrics;
  threshold: number;
  comparison: 'greater' | 'less';
  action: 'scale_out' | 'scale_in';
  cooldown: number; // minutes
}

export class BroadcastAutoScaler {
  private cloudWatch: CloudWatchClient;
  private autoScaling: AutoScalingClient;
  private supabase;
  private lastScalingAction: Map<string, number> = new Map();

  private readonly weddingSeasonRules: ScalingRule[] = [
    // Aggressive scaling for wedding season
    {
      metric: 'currentConnections',
      threshold: 5000,
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 5, // Fast scaling during peaks
    },
    {
      metric: 'queueSize',
      threshold: 1000,
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 3,
    },
    {
      metric: 'processingLatency',
      threshold: 500, // 500ms
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 5,
    },
    {
      metric: 'errorRate',
      threshold: 0.02, // 2%
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 10,
    },
  ];

  private readonly normalSeasonRules: ScalingRule[] = [
    // Conservative scaling for normal periods
    {
      metric: 'currentConnections',
      threshold: 10000,
      comparison: 'greater',
      action: 'scale_out',
      cooldown: 10,
    },
    {
      metric: 'currentConnections',
      threshold: 2000,
      comparison: 'less',
      action: 'scale_in',
      cooldown: 20,
    },
  ];

  constructor() {
    this.cloudWatch = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.autoScaling = new AutoScalingClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.supabase = createServerClient();
  }

  async evaluateScaling(metrics: ScalingMetrics): Promise<void> {
    const isWeddingSeason = this.isWeddingSeason();
    const rules = isWeddingSeason
      ? this.weddingSeasonRules
      : this.normalSeasonRules;

    for (const rule of rules) {
      if (this.shouldTriggerScaling(rule, metrics)) {
        await this.executeScaling(rule);
      }
    }
  }

  private isWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based month

    // Peak wedding months: May, June, September, October
    const peakMonths = [5, 6, 9, 10];
    return peakMonths.includes(month);
  }

  private shouldTriggerScaling(
    rule: ScalingRule,
    metrics: ScalingMetrics,
  ): boolean {
    const metricValue = metrics[rule.metric];
    const cooldownKey = `${rule.metric}_${rule.action}`;
    const lastAction = this.lastScalingAction.get(cooldownKey) || 0;
    const cooldownExpired = Date.now() - lastAction > rule.cooldown * 60 * 1000;

    if (!cooldownExpired) {
      return false;
    }

    if (rule.comparison === 'greater') {
      return metricValue > rule.threshold;
    } else {
      return metricValue < rule.threshold;
    }
  }

  private async executeScaling(rule: ScalingRule): Promise<void> {
    try {
      const autoScalingGroupName = 'broadcast-service-asg';

      if (rule.action === 'scale_out') {
        await this.scaleOut(autoScalingGroupName);
      } else {
        await this.scaleIn(autoScalingGroupName);
      }

      // Record scaling action
      const cooldownKey = `${rule.metric}_${rule.action}`;
      this.lastScalingAction.set(cooldownKey, Date.now());

      console.info(`Auto-scaling executed:`, {
        rule: rule.metric,
        action: rule.action,
        threshold: rule.threshold,
      });
    } catch (error) {
      console.error('Auto-scaling failed:', error);
    }
  }

  private async scaleOut(autoScalingGroupName: string): Promise<void> {
    // Get current capacity
    const describeCommand = new DescribeAutoScalingGroupsCommand({
      AutoScalingGroupNames: [autoScalingGroupName],
    });

    const { AutoScalingGroups } = await this.autoScaling.send(describeCommand);

    if (!AutoScalingGroups || AutoScalingGroups.length === 0) {
      throw new Error('No auto scaling group found');
    }

    const current = AutoScalingGroups[0];
    const newCapacity = Math.min(
      (current.DesiredCapacity || 1) * 2, // Double capacity
      current.MaxSize || 50, // Respect max capacity
    );

    const updateCommand = new UpdateAutoScalingGroupCommand({
      AutoScalingGroupName: autoScalingGroupName,
      DesiredCapacity: newCapacity,
    });

    await this.autoScaling.send(updateCommand);

    console.info(`Scaled out to ${newCapacity} instances`, {
      previous: current.DesiredCapacity,
      new: newCapacity,
    });
  }

  private async scaleIn(autoScalingGroupName: string): Promise<void> {
    const describeCommand = new DescribeAutoScalingGroupsCommand({
      AutoScalingGroupNames: [autoScalingGroupName],
    });

    const { AutoScalingGroups } = await this.autoScaling.send(describeCommand);

    if (!AutoScalingGroups || AutoScalingGroups.length === 0) {
      throw new Error('No auto scaling group found');
    }

    const current = AutoScalingGroups[0];
    const newCapacity = Math.max(
      Math.ceil((current.DesiredCapacity || 1) / 2), // Halve capacity
      current.MinSize || 2, // Respect min capacity
    );

    const updateCommand = new UpdateAutoScalingGroupCommand({
      AutoScalingGroupName: autoScalingGroupName,
      DesiredCapacity: newCapacity,
    });

    await this.autoScaling.send(updateCommand);

    console.info(`Scaled in to ${newCapacity} instances`, {
      previous: current.DesiredCapacity,
      new: newCapacity,
    });
  }

  // Custom CloudWatch metrics for broadcast-specific monitoring
  async publishCustomMetrics(metrics: ScalingMetrics): Promise<void> {
    const metricData = [
      {
        MetricName: 'BroadcastConnections',
        Value: metrics.currentConnections,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'broadcast-system',
          },
        ],
      },
      {
        MetricName: 'BroadcastQueueSize',
        Value: metrics.queueSize,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'broadcast-system',
          },
        ],
      },
      {
        MetricName: 'BroadcastLatency',
        Value: metrics.processingLatency,
        Unit: 'Milliseconds',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'broadcast-system',
          },
        ],
      },
      {
        MetricName: 'BroadcastErrorRate',
        Value: metrics.errorRate * 100,
        Unit: 'Percent',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'broadcast-system',
          },
        ],
      },
    ];

    const command = new PutMetricDataCommand({
      Namespace: 'WedSync/Broadcast',
      MetricData: metricData,
    });

    await this.cloudWatch.send(command);
  }

  // Predictive scaling for known wedding events
  async schedulePredictiveScaling(
    weddingId: string,
    weddingDate: Date,
  ): Promise<void> {
    try {
      // Get wedding size to estimate load
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('guest_count, team_members')
        .eq('id', weddingId)
        .single();

      if (!wedding) return;

      // Estimate load: team members * activity factor + guest notifications
      const estimatedConnections =
        (wedding.team_members || 5) * 10 + (wedding.guest_count || 0) * 0.1;

      // Schedule scale-out 2 hours before wedding
      const scaleOutTime = new Date(weddingDate.getTime() - 2 * 60 * 60 * 1000);

      // Schedule scale-in 6 hours after wedding
      const scaleInTime = new Date(weddingDate.getTime() + 6 * 60 * 60 * 1000);

      console.info(`Scheduled predictive scaling for wedding ${weddingId}:`, {
        estimatedConnections,
        scaleOutTime,
        scaleInTime,
      });

      // Store scaling schedule in database
      await this.supabase.from('scheduled_scaling_events').insert({
        event_type: 'wedding',
        event_id: weddingId,
        scale_out_time: scaleOutTime.toISOString(),
        scale_in_time: scaleInTime.toISOString(),
        estimated_load: estimatedConnections,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Predictive scaling failed for wedding ${weddingId}:`,
        error,
      );
    }
  }

  // Weekend traffic optimization
  async optimizeForWeekendTraffic(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const hour = now.getHours();

    // Weekend wedding traffic patterns (Friday afternoon - Sunday evening)
    const isWeekendPeak =
      (dayOfWeek === 5 && hour >= 14) || // Friday afternoon
      dayOfWeek === 6 || // Saturday all day
      (dayOfWeek === 0 && hour <= 20); // Sunday until 8pm

    if (isWeekendPeak) {
      console.info('Optimizing for weekend wedding traffic');

      // Pre-scale for expected weekend load
      const autoScalingGroupName = 'broadcast-service-asg';

      try {
        const describeCommand = new DescribeAutoScalingGroupsCommand({
          AutoScalingGroupNames: [autoScalingGroupName],
        });

        const { AutoScalingGroups } =
          await this.autoScaling.send(describeCommand);

        if (AutoScalingGroups && AutoScalingGroups.length > 0) {
          const current = AutoScalingGroups[0];
          const weekendCapacity = Math.min(
            Math.ceil((current.DesiredCapacity || 2) * 1.5), // 50% increase
            current.MaxSize || 50,
          );

          const updateCommand = new UpdateAutoScalingGroupCommand({
            AutoScalingGroupName: autoScalingGroupName,
            DesiredCapacity: weekendCapacity,
          });

          await this.autoScaling.send(updateCommand);

          console.info(
            `Pre-scaled for weekend traffic to ${weekendCapacity} instances`,
          );
        }
      } catch (error) {
        console.error('Weekend optimization failed:', error);
      }
    }
  }

  // Wedding season pre-scaling
  async preScaleForWeddingSeason(): Promise<void> {
    if (!this.isWeddingSeason()) return;

    console.info('Pre-scaling for wedding season traffic');

    try {
      // Get upcoming weddings count for capacity planning
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: upcomingWeddings } = await this.supabase
        .from('weddings')
        .select('id, guest_count, team_members')
        .gte('wedding_date', new Date().toISOString().split('T')[0])
        .lte('wedding_date', nextWeek.toISOString().split('T')[0])
        .eq('status', 'confirmed');

      if (upcomingWeddings && upcomingWeddings.length > 0) {
        // Calculate expected load based on weddings
        const expectedLoad = upcomingWeddings.reduce((total, wedding) => {
          return (
            total +
            (wedding.team_members || 5) * 8 +
            (wedding.guest_count || 0) * 0.05
          );
        }, 0);

        // Scale based on expected load
        const recommendedInstances = Math.ceil(expectedLoad / 1000); // 1000 connections per instance
        const autoScalingGroupName = 'broadcast-service-asg';

        const describeCommand = new DescribeAutoScalingGroupsCommand({
          AutoScalingGroupNames: [autoScalingGroupName],
        });

        const { AutoScalingGroups } =
          await this.autoScaling.send(describeCommand);

        if (AutoScalingGroups && AutoScalingGroups.length > 0) {
          const current = AutoScalingGroups[0];
          const targetCapacity = Math.min(
            Math.max(recommendedInstances, current.MinSize || 2),
            current.MaxSize || 50,
          );

          if (targetCapacity > (current.DesiredCapacity || 2)) {
            const updateCommand = new UpdateAutoScalingGroupCommand({
              AutoScalingGroupName: autoScalingGroupName,
              DesiredCapacity: targetCapacity,
            });

            await this.autoScaling.send(updateCommand);

            console.info(
              `Pre-scaled for ${upcomingWeddings.length} upcoming weddings to ${targetCapacity} instances`,
              {
                expectedLoad,
                upcomingWeddings: upcomingWeddings.length,
              },
            );
          }
        }
      }
    } catch (error) {
      console.error('Wedding season pre-scaling failed:', error);
    }
  }

  // Get scaling metrics for monitoring
  async getScalingMetrics(): Promise<{
    currentRules: ScalingRule[];
    isWeddingSeason: boolean;
    lastScalingActions: Record<string, Date>;
  }> {
    const isWeddingSeason = this.isWeddingSeason();
    const lastActions: Record<string, Date> = {};

    for (const [key, timestamp] of this.lastScalingAction.entries()) {
      lastActions[key] = new Date(timestamp);
    }

    return {
      currentRules: isWeddingSeason
        ? this.weddingSeasonRules
        : this.normalSeasonRules,
      isWeddingSeason,
      lastScalingActions: lastActions,
    };
  }

  // Emergency scaling for critical events
  async emergencyScale(targetCapacity: number, reason: string): Promise<void> {
    console.warn(`Emergency scaling triggered: ${reason}`);

    try {
      const autoScalingGroupName = 'broadcast-service-asg';

      const describeCommand = new DescribeAutoScalingGroupsCommand({
        AutoScalingGroupNames: [autoScalingGroupName],
      });

      const { AutoScalingGroups } =
        await this.autoScaling.send(describeCommand);

      if (AutoScalingGroups && AutoScalingGroups.length > 0) {
        const current = AutoScalingGroups[0];
        const safeTargetCapacity = Math.min(
          Math.max(targetCapacity, current.MinSize || 2),
          current.MaxSize || 50,
        );

        const updateCommand = new UpdateAutoScalingGroupCommand({
          AutoScalingGroupName: autoScalingGroupName,
          DesiredCapacity: safeTargetCapacity,
        });

        await this.autoScaling.send(updateCommand);

        console.warn(`Emergency scaled to ${safeTargetCapacity} instances`, {
          reason,
          previous: current.DesiredCapacity,
          target: safeTargetCapacity,
        });

        // Send alert to monitoring systems
        await this.sendEmergencyAlert(reason, safeTargetCapacity);
      }
    } catch (error) {
      console.error('Emergency scaling failed:', error);
      throw error;
    }
  }

  private async sendEmergencyAlert(
    reason: string,
    capacity: number,
  ): Promise<void> {
    // Integration with alerting system (Slack, PagerDuty, etc.)
    console.error(
      `EMERGENCY SCALING ALERT: ${reason} - Scaled to ${capacity} instances`,
    );

    // Store alert in database for tracking
    await this.supabase.from('scaling_alerts').insert({
      alert_type: 'emergency',
      reason,
      capacity,
      timestamp: new Date().toISOString(),
    });
  }
}
