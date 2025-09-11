import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import * as Sentry from '@sentry/nextjs';

export interface MarketingSystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetric[];
  timestamp: Date;
  overallScore: number;
  alerts: Alert[];
  recommendations: string[];
}

export interface HealthMetric {
  metric: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  target: number;
  trend?: 'improving' | 'stable' | 'declining';
  message: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface CampaignDeliveryHealth {
  deliveryRate: number;
  avgDeliveryTime: number;
  failedDeliveries: number;
  queueBacklog: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface AIContentHealth {
  successRate: number;
  avgGenerationTime: number;
  failedGenerations: number;
  tokensUsed: number;
  costEfficiency: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface AttributionAccuracy {
  accuracy: number;
  missingAttributions: number;
  duplicateAttributions: number;
  dataCompleteness: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface ViralCoefficientHealth {
  currentCoefficient: number;
  trend: 'improving' | 'stable' | 'declining';
  invitesSent: number;
  invitesAccepted: number;
  targetMet: boolean;
  status: 'healthy' | 'warning' | 'critical';
}

export interface IntegrationHealth {
  teamA: IntegrationStatus;
  teamB: IntegrationStatus;
  teamC: IntegrationStatus;
  teamE: IntegrationStatus;
  overallStatus: 'healthy' | 'warning' | 'critical';
}

export interface IntegrationStatus {
  connected: boolean;
  lastSync: Date;
  syncErrors: number;
  dataFlow: 'normal' | 'delayed' | 'blocked';
  status: 'healthy' | 'warning' | 'critical';
}

export class MarketingPerformanceMonitor {
  private static instance: MarketingPerformanceMonitor;
  private supabase: any;
  private alertThresholds = {
    campaignDeliveryRate: 0.95,
    aiSuccessRate: 0.95,
    attributionAccuracy: 0.9,
    viralCoefficient: 1.2,
    integrationUptime: 0.99,
  };

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  static getInstance(): MarketingPerformanceMonitor {
    if (!MarketingPerformanceMonitor.instance) {
      MarketingPerformanceMonitor.instance = new MarketingPerformanceMonitor();
    }
    return MarketingPerformanceMonitor.instance;
  }

  async checkMarketingSystemHealth(): Promise<MarketingSystemHealth> {
    const [
      campaignDeliveryHealth,
      aiContentHealth,
      attributionAccuracy,
      viralCoefficientHealth,
      integrationHealth,
    ] = await Promise.all([
      this.checkCampaignDeliveryPerformance(),
      this.checkAIContentGeneration(),
      this.checkAttributionAccuracy(),
      this.checkViralCoefficientTrend(),
      this.checkTeamIntegrations(),
    ]);

    const metrics = [
      this.createHealthMetric('Campaign Delivery', campaignDeliveryHealth),
      this.createHealthMetric('AI Content', aiContentHealth),
      this.createHealthMetric('Attribution', attributionAccuracy),
      this.createHealthMetric('Viral Coefficient', viralCoefficientHealth),
      this.createHealthMetric('Integrations', integrationHealth),
    ];

    const overallHealth = this.calculateMarketingHealth(metrics);
    const alerts = await this.getActiveAlerts();
    const recommendations = this.generateRecommendations(metrics);

    if (overallHealth.status === 'critical') {
      await this.alertMarketingTeam(overallHealth);
      Sentry.captureMessage('Marketing system critical health', 'error');
    }

    return {
      status: overallHealth.status,
      metrics,
      timestamp: new Date(),
      overallScore: overallHealth.score,
      alerts,
      recommendations,
    };
  }

  private async checkCampaignDeliveryPerformance(): Promise<CampaignDeliveryHealth> {
    const { data: deliveryStats, error } = await this.supabase.rpc(
      'get_campaign_delivery_stats',
      {
        timeframe: '24h',
      },
    );

    if (error) {
      console.error('Error checking campaign delivery:', error);
      return this.getDefaultCampaignDeliveryHealth();
    }

    const deliveryRate =
      deliveryStats.successful_deliveries / deliveryStats.total_attempts;
    const avgDeliveryTime = deliveryStats.avg_delivery_time_ms;
    const failedDeliveries = deliveryStats.failed_deliveries;
    const queueBacklog = deliveryStats.queue_backlog;

    const status = this.determineDeliveryStatus(
      deliveryRate,
      avgDeliveryTime,
      queueBacklog,
    );

    return {
      deliveryRate,
      avgDeliveryTime,
      failedDeliveries,
      queueBacklog,
      status,
    };
  }

  private async checkAIContentGeneration(): Promise<AIContentHealth> {
    const { data: aiStats, error } = await this.supabase.rpc(
      'get_ai_content_generation_stats',
      {
        timeframe: '24h',
      },
    );

    if (error) {
      console.error('Error checking AI content generation:', error);
      return this.getDefaultAIContentHealth();
    }

    const successRate = aiStats.successful_generations / aiStats.total_attempts;
    const avgGenerationTime = aiStats.avg_generation_time_ms;
    const failedGenerations = aiStats.failed_generations;
    const tokensUsed = aiStats.tokens_used;
    const costEfficiency = aiStats.revenue_per_token;

    const status =
      successRate >= this.alertThresholds.aiSuccessRate
        ? 'healthy'
        : successRate >= 0.85
          ? 'warning'
          : 'critical';

    return {
      successRate,
      avgGenerationTime,
      failedGenerations,
      tokensUsed,
      costEfficiency,
      status,
    };
  }

  private async checkAttributionAccuracy(): Promise<AttributionAccuracy> {
    const { data: attributionStats, error } = await this.supabase.rpc(
      'get_attribution_accuracy_stats',
      {
        timeframe: '7d',
      },
    );

    if (error) {
      console.error('Error checking attribution accuracy:', error);
      return this.getDefaultAttributionAccuracy();
    }

    const accuracy = attributionStats.accuracy_rate;
    const missingAttributions = attributionStats.missing_attributions;
    const duplicateAttributions = attributionStats.duplicate_attributions;
    const dataCompleteness = attributionStats.data_completeness;

    const status =
      accuracy >= this.alertThresholds.attributionAccuracy
        ? 'healthy'
        : accuracy >= 0.8
          ? 'warning'
          : 'critical';

    return {
      accuracy,
      missingAttributions,
      duplicateAttributions,
      dataCompleteness,
      status,
    };
  }

  private async checkViralCoefficientTrend(): Promise<ViralCoefficientHealth> {
    const currentCoefficient = await this.getCurrentViralCoefficient();
    const trend = await this.getViralCoefficientTrend('7d');
    const inviteStats = await this.getInviteStatistics('24h');

    const status =
      currentCoefficient >= this.alertThresholds.viralCoefficient
        ? 'healthy'
        : currentCoefficient >= 1.0
          ? 'warning'
          : 'critical';

    return {
      currentCoefficient,
      trend,
      invitesSent: inviteStats.sent,
      invitesAccepted: inviteStats.accepted,
      targetMet: currentCoefficient >= this.alertThresholds.viralCoefficient,
      status,
    };
  }

  private async checkTeamIntegrations(): Promise<IntegrationHealth> {
    const [teamA, teamB, teamC, teamE] = await Promise.all([
      this.checkTeamIntegration('team-a'),
      this.checkTeamIntegration('team-b'),
      this.checkTeamIntegration('team-c'),
      this.checkTeamIntegration('team-e'),
    ]);

    const allHealthy = [teamA, teamB, teamC, teamE].every(
      (t) => t.status === 'healthy',
    );
    const anyWarning = [teamA, teamB, teamC, teamE].some(
      (t) => t.status === 'warning',
    );
    const anyCritical = [teamA, teamB, teamC, teamE].some(
      (t) => t.status === 'critical',
    );

    const overallStatus = anyCritical
      ? 'critical'
      : anyWarning
        ? 'warning'
        : 'healthy';

    return {
      teamA,
      teamB,
      teamC,
      teamE,
      overallStatus,
    };
  }

  private async checkTeamIntegration(team: string): Promise<IntegrationStatus> {
    const { data: integration, error } = await this.supabase
      .from('team_integrations')
      .select('*')
      .eq('team_id', team)
      .single();

    if (error || !integration) {
      return {
        connected: false,
        lastSync: new Date(0),
        syncErrors: 999,
        dataFlow: 'blocked',
        status: 'critical',
      };
    }

    const lastSync = new Date(integration.last_sync_at);
    const minutesSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60);

    let dataFlow: 'normal' | 'delayed' | 'blocked';
    let status: 'healthy' | 'warning' | 'critical';

    if (minutesSinceSync < 5) {
      dataFlow = 'normal';
      status = 'healthy';
    } else if (minutesSinceSync < 30) {
      dataFlow = 'delayed';
      status = 'warning';
    } else {
      dataFlow = 'blocked';
      status = 'critical';
    }

    return {
      connected: integration.is_connected,
      lastSync,
      syncErrors: integration.sync_errors || 0,
      dataFlow,
      status,
    };
  }

  private createHealthMetric(name: string, data: any): HealthMetric {
    let value: number;
    let target: number;
    let status: 'healthy' | 'warning' | 'critical';
    let message: string;

    switch (name) {
      case 'Campaign Delivery':
        value = data.deliveryRate * 100;
        target = this.alertThresholds.campaignDeliveryRate * 100;
        status = data.status;
        message = `Delivery rate: ${value.toFixed(1)}% (target: ${target}%), Avg time: ${data.avgDeliveryTime}ms`;
        break;

      case 'AI Content':
        value = data.successRate * 100;
        target = this.alertThresholds.aiSuccessRate * 100;
        status = data.status;
        message = `AI success rate: ${value.toFixed(1)}% (target: ${target}%), Avg time: ${data.avgGenerationTime}ms`;
        break;

      case 'Attribution':
        value = data.accuracy * 100;
        target = this.alertThresholds.attributionAccuracy * 100;
        status = data.status;
        message = `Attribution accuracy: ${value.toFixed(1)}% (target: ${target}%)`;
        break;

      case 'Viral Coefficient':
        value = data.currentCoefficient;
        target = this.alertThresholds.viralCoefficient;
        status = data.status;
        message = `Viral coefficient: ${value.toFixed(2)} (target: ${target}+, trend: ${data.trend})`;
        break;

      case 'Integrations':
        const healthyCount = [
          data.teamA,
          data.teamB,
          data.teamC,
          data.teamE,
        ].filter((t: any) => t.status === 'healthy').length;
        value = (healthyCount / 4) * 100;
        target = 100;
        status = data.overallStatus;
        message = `${healthyCount}/4 integrations healthy`;
        break;

      default:
        value = 0;
        target = 100;
        status = 'warning';
        message = 'Unknown metric';
    }

    return {
      metric: name,
      value,
      status,
      target,
      message,
    };
  }

  private calculateMarketingHealth(metrics: HealthMetric[]): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
  } {
    const criticalCount = metrics.filter((m) => m.status === 'critical').length;
    const warningCount = metrics.filter((m) => m.status === 'warning').length;
    const healthyCount = metrics.filter((m) => m.status === 'healthy').length;

    const score = (healthyCount * 100 + warningCount * 50) / metrics.length;

    let status: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      status = 'critical';
    } else if (warningCount > 1) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return { status, score };
  }

  private async alertMarketingTeam(health: any): Promise<void> {
    // Send critical alerts to marketing team
    const alert = {
      id: `alert_${Date.now()}`,
      severity: 'critical',
      metric: 'overall_health',
      message: `Marketing system health critical. Score: ${health.score}`,
      timestamp: new Date(),
      resolved: false,
    };

    await this.supabase.from('marketing_alerts').insert(alert);

    // Send notification via webhook
    await this.sendWebhookAlert(alert);
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.MARKETING_ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          system: 'marketing-automation',
        }),
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  private async getCurrentViralCoefficient(): Promise<number> {
    const { data } = await this.supabase.rpc('get_current_viral_coefficient');

    return data?.coefficient || 0;
  }

  private async getViralCoefficientTrend(
    timeframe: string,
  ): Promise<'improving' | 'stable' | 'declining'> {
    const { data } = await this.supabase.rpc('get_viral_coefficient_trend', {
      timeframe,
    });

    const trend = data?.trend || 0;
    if (trend > 0.05) return 'improving';
    if (trend < -0.05) return 'declining';
    return 'stable';
  }

  private async getInviteStatistics(
    timeframe: string,
  ): Promise<{ sent: number; accepted: number }> {
    const { data } = await this.supabase.rpc('get_invite_statistics', {
      timeframe,
    });

    return {
      sent: data?.invites_sent || 0,
      accepted: data?.invites_accepted || 0,
    };
  }

  private async getActiveAlerts(): Promise<Alert[]> {
    const { data: alerts } = await this.supabase
      .from('marketing_alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false })
      .limit(10);

    return alerts || [];
  }

  private generateRecommendations(metrics: HealthMetric[]): string[] {
    const recommendations: string[] = [];

    metrics.forEach((metric) => {
      if (metric.status === 'critical') {
        switch (metric.metric) {
          case 'Campaign Delivery':
            recommendations.push(
              'Urgent: Scale campaign delivery infrastructure to handle load',
            );
            break;
          case 'AI Content':
            recommendations.push(
              'Urgent: Review AI content generation failures and optimize prompts',
            );
            break;
          case 'Viral Coefficient':
            recommendations.push(
              'Urgent: Launch super-connector campaigns to boost viral coefficient',
            );
            break;
          case 'Attribution':
            recommendations.push(
              'Urgent: Fix attribution tracking gaps to ensure accurate ROI',
            );
            break;
          case 'Integrations':
            recommendations.push(
              'Urgent: Restore team integration connections for data flow',
            );
            break;
        }
      } else if (metric.status === 'warning') {
        switch (metric.metric) {
          case 'Campaign Delivery':
            recommendations.push(
              'Monitor campaign queue and consider scaling if needed',
            );
            break;
          case 'AI Content':
            recommendations.push(
              'Review AI content quality and generation times',
            );
            break;
          case 'Viral Coefficient':
            recommendations.push(
              'Optimize viral incentives to maintain growth target',
            );
            break;
        }
      }
    });

    return recommendations;
  }

  private determineDeliveryStatus(
    deliveryRate: number,
    avgTime: number,
    backlog: number,
  ): 'healthy' | 'warning' | 'critical' {
    if (deliveryRate < 0.9 || avgTime > 5000 || backlog > 10000) {
      return 'critical';
    }
    if (deliveryRate < 0.95 || avgTime > 2000 || backlog > 5000) {
      return 'warning';
    }
    return 'healthy';
  }

  // Default values for error states
  private getDefaultCampaignDeliveryHealth(): CampaignDeliveryHealth {
    return {
      deliveryRate: 0,
      avgDeliveryTime: 0,
      failedDeliveries: 0,
      queueBacklog: 0,
      status: 'critical',
    };
  }

  private getDefaultAIContentHealth(): AIContentHealth {
    return {
      successRate: 0,
      avgGenerationTime: 0,
      failedGenerations: 0,
      tokensUsed: 0,
      costEfficiency: 0,
      status: 'critical',
    };
  }

  private getDefaultAttributionAccuracy(): AttributionAccuracy {
    return {
      accuracy: 0,
      missingAttributions: 0,
      duplicateAttributions: 0,
      dataCompleteness: 0,
      status: 'critical',
    };
  }
}
