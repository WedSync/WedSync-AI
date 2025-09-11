// WS-195 Team C: Business Intelligence Integration System
// Integration-focused business intelligence with external analytics platforms

import { GoogleAnalytics4Client } from './analytics/google-analytics-client';
import { MixpanelClient } from './analytics/mixpanel-client';
import { ExecutiveReportingAutomation } from '../reporting/automated/executive-automation';
import { BusinessIntelligenceConnector } from '../connectors/business-intelligence/bi-connector';

export interface BusinessMetrics {
  // Core financial metrics
  currentMRR: number;
  mrrGrowthRate: number;
  revenue: {
    monthly: number;
    quarterly: number;
    annual: number;
  };

  // Customer metrics
  churnRate: {
    monthly: number;
    quarterly: number;
    annual: number;
  };

  // Growth metrics
  viralCoefficient: number;
  viralROI: {
    totalReferralValue: number;
    costPerAcquisition: number;
    lifetimeValue: number;
  };

  // Wedding industry specific metrics
  seasonalFactors: {
    peakSeasonMultiplier: number;
    currentSeasonImpact: number;
    weddingSeasonTrends: Array<{
      month: string;
      multiplier: number;
      weddingCount: number;
    }>;
  };

  // Supplier metrics
  supplierAcquisition: {
    monthlyNewSignups: number;
    conversionRate: number;
    trialToPayRate: number;
    supplierChurnRate: number;
  };

  // Couple engagement metrics
  coupleEngagement: {
    invitationAcceptanceRate: number;
    platformUtilizationRate: number;
    weddingCompletionRate: number;
    referralGenerationRate: number;
  };

  // Industry benchmarks
  industryBenchmarks: {
    averageWeddingBudget: number;
    supplierDensityByRegion: Record<string, number>;
    competitorMarketShare: Record<string, number>;
  };
}

export interface WeddingIndustryMetrics {
  weddingSeasonalTrends: Array<{
    month: string;
    bookingVolume: number;
    averageBudget: number;
    supplierDemand: number;
  }>;

  supplierCategories: Record<
    string,
    {
      marketSize: number;
      growthRate: number;
      competitionLevel: number;
    }
  >;

  regionalData: Record<
    string,
    {
      weddingDensity: number;
      averageBudget: number;
      supplierCount: number;
    }
  >;
}

export interface ExecutiveReportData {
  title: string;
  generatedAt: Date;
  reportPeriod: {
    start: Date;
    end: Date;
  };

  summary: {
    mrr: {
      current: number;
      growth: number;
      trend: 'Growing' | 'Declining' | 'Stable';
    };
    churn: {
      rate: number;
      impact: string;
    };
    virality: {
      coefficient: number;
      referralValue: number;
    };
  };

  weddingIndustryInsights: {
    seasonalImpact: BusinessMetrics['seasonalFactors'];
    supplierGrowth: BusinessMetrics['supplierAcquisition'];
    coupleEngagement: BusinessMetrics['coupleEngagement'];
  };

  recommendations: Array<{
    priority: 'High' | 'Medium' | 'Low';
    category: string;
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
}

export interface IntegrationPlatform {
  name: string;
  enabled: boolean;
  lastSync: Date;
  status: 'connected' | 'disconnected' | 'error';
  metrics: Record<string, any>;
}

export class BusinessIntelligenceIntegrator {
  private ga4Client: GoogleAnalytics4Client;
  private mixpanelClient: MixpanelClient;
  private executiveReporter: ExecutiveReportingAutomation;
  private biConnector: BusinessIntelligenceConnector;

  constructor() {
    this.ga4Client = new GoogleAnalytics4Client();
    this.mixpanelClient = new MixpanelClient();
    this.executiveReporter = new ExecutiveReportingAutomation();
    this.biConnector = new BusinessIntelligenceConnector();
  }

  async syncMetricsToExternalPlatforms(
    metrics: BusinessMetrics,
  ): Promise<void> {
    const integrations = [
      this.syncToGoogleAnalytics(metrics),
      this.syncToMixpanel(metrics),
      this.syncToSlack(metrics), // Executive alerts
      this.generateExecutiveReport(metrics),
    ];

    await Promise.all(integrations);
  }

  private async syncToGoogleAnalytics(metrics: BusinessMetrics): Promise<void> {
    // Send business events to GA4
    await this.ga4Client.sendEvent('business_metrics_update', {
      mrr_value: metrics.currentMRR,
      churn_rate: metrics.churnRate.monthly,
      viral_coefficient: metrics.viralCoefficient,
      wedding_season_factor: metrics.seasonalFactors.peakSeasonMultiplier,
      supplier_acquisition_rate: metrics.supplierAcquisition.monthlyNewSignups,
      couple_engagement_rate: metrics.coupleEngagement.platformUtilizationRate,
    });

    // Send wedding industry specific events
    await this.ga4Client.sendEvent('wedding_industry_metrics', {
      wedding_season_multiplier: metrics.seasonalFactors.peakSeasonMultiplier,
      supplier_conversion_rate: metrics.supplierAcquisition.conversionRate,
      invitation_acceptance_rate:
        metrics.coupleEngagement.invitationAcceptanceRate,
      average_wedding_budget: metrics.industryBenchmarks.averageWeddingBudget,
    });
  }

  private async syncToMixpanel(metrics: BusinessMetrics): Promise<void> {
    // Track user behavior correlation with business metrics
    await this.mixpanelClient.track('Business Metrics Updated', {
      mrr: metrics.currentMRR,
      growth_rate: metrics.mrrGrowthRate,
      churn_rate: metrics.churnRate.monthly,
      viral_coefficient: metrics.viralCoefficient,
      wedding_season_impact: metrics.seasonalFactors.currentSeasonImpact,
    });

    // Track wedding industry specific behaviors
    await this.mixpanelClient.track('Wedding Industry Behavior', {
      supplier_signup_trend: metrics.supplierAcquisition.monthlyNewSignups,
      couple_platform_usage: metrics.coupleEngagement.platformUtilizationRate,
      referral_generation: metrics.coupleEngagement.referralGenerationRate,
      seasonal_trend: metrics.seasonalFactors.peakSeasonMultiplier,
    });
  }

  private async syncToSlack(metrics: BusinessMetrics): Promise<void> {
    // Send executive alerts for critical thresholds
    const alerts = this.generateCriticalAlerts(metrics);

    for (const alert of alerts) {
      await this.biConnector.sendSlackAlert(alert);
    }
  }

  async generateExecutiveReport(metrics: BusinessMetrics): Promise<void> {
    const report: ExecutiveReportData = {
      title: `WedSync Business Metrics - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date(),
      reportPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      },
      summary: {
        mrr: {
          current: metrics.currentMRR,
          growth: metrics.mrrGrowthRate,
          trend:
            metrics.mrrGrowthRate > 0
              ? 'Growing'
              : metrics.mrrGrowthRate < 0
                ? 'Declining'
                : 'Stable',
        },
        churn: {
          rate: metrics.churnRate.monthly,
          impact: this.getChurnImpactMessage(
            metrics.churnRate.monthly,
            metrics.seasonalFactors,
          ),
        },
        virality: {
          coefficient: metrics.viralCoefficient,
          referralValue: metrics.viralROI.totalReferralValue,
        },
      },
      weddingIndustryInsights: {
        seasonalImpact: metrics.seasonalFactors,
        supplierGrowth: metrics.supplierAcquisition,
        coupleEngagement: metrics.coupleEngagement,
      },
      recommendations: this.generateBusinessRecommendations(metrics),
    };

    // Send to executive team via multiple channels
    await this.distributeExecutiveReport(report);
  }

  private async distributeExecutiveReport(
    report: ExecutiveReportData,
  ): Promise<void> {
    await Promise.all([
      this.executiveReporter.emailExecutiveTeam(report),
      this.executiveReporter.postToSlackExecutiveChannel(report),
      this.executiveReporter.updateInvestorDashboard(report),
      this.executiveReporter.archiveToBusinessIntelligence(report),
    ]);
  }

  private generateCriticalAlerts(metrics: BusinessMetrics): Array<{
    priority: 'High' | 'Medium' | 'Low';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }> {
    const alerts = [];

    // MRR decline alert
    if (metrics.mrrGrowthRate < -5) {
      alerts.push({
        priority: 'High' as const,
        message: `MRR declining at ${metrics.mrrGrowthRate}% - requires immediate attention`,
        metric: 'MRR Growth Rate',
        value: metrics.mrrGrowthRate,
        threshold: -5,
      });
    }

    // High churn alert
    if (metrics.churnRate.monthly > 8) {
      alerts.push({
        priority: 'High' as const,
        message: `Monthly churn rate at ${metrics.churnRate.monthly}% - above critical threshold`,
        metric: 'Monthly Churn Rate',
        value: metrics.churnRate.monthly,
        threshold: 8,
      });
    }

    // Viral coefficient decline
    if (metrics.viralCoefficient < 0.5) {
      alerts.push({
        priority: 'Medium' as const,
        message: `Viral coefficient at ${metrics.viralCoefficient} - referral engine needs optimization`,
        metric: 'Viral Coefficient',
        value: metrics.viralCoefficient,
        threshold: 0.5,
      });
    }

    // Wedding season opportunity
    if (metrics.seasonalFactors.peakSeasonMultiplier > 2.0) {
      alerts.push({
        priority: 'Medium' as const,
        message: `Peak wedding season detected (${metrics.seasonalFactors.peakSeasonMultiplier}x) - scale marketing efforts`,
        metric: 'Seasonal Multiplier',
        value: metrics.seasonalFactors.peakSeasonMultiplier,
        threshold: 2.0,
      });
    }

    return alerts;
  }

  private getChurnImpactMessage(
    churnRate: number,
    seasonalFactors: BusinessMetrics['seasonalFactors'],
  ): string {
    if (churnRate < 3) {
      return `Excellent retention during ${seasonalFactors.currentSeasonImpact > 1 ? 'peak' : 'off-peak'} wedding season`;
    } else if (churnRate < 5) {
      return `Good retention, wedding season helping maintain stability`;
    } else if (churnRate < 8) {
      return `Moderate churn, consider supplier success initiatives during wedding season`;
    } else {
      return `High churn detected - critical intervention needed regardless of wedding season`;
    }
  }

  private generateBusinessRecommendations(
    metrics: BusinessMetrics,
  ): ExecutiveReportData['recommendations'] {
    const recommendations: ExecutiveReportData['recommendations'] = [];

    // MRR optimization
    if (metrics.mrrGrowthRate < 10) {
      recommendations.push({
        priority: 'High',
        category: 'Revenue Growth',
        recommendation:
          'Accelerate supplier acquisition with wedding season marketing campaigns',
        expectedImpact: `Could increase MRR growth by ${(metrics.seasonalFactors.peakSeasonMultiplier * 5).toFixed(1)}%`,
        timeframe: '2-3 months',
      });
    }

    // Viral growth optimization
    if (metrics.viralCoefficient < 1.0) {
      recommendations.push({
        priority: 'High',
        category: 'Viral Growth',
        recommendation:
          'Implement wedding referral incentives and supplier-couple invitation campaigns',
        expectedImpact:
          'Could increase viral coefficient to 1.2+ with wedding network effects',
        timeframe: '1-2 months',
      });
    }

    // Seasonal optimization
    if (metrics.seasonalFactors.peakSeasonMultiplier > 1.5) {
      recommendations.push({
        priority: 'Medium',
        category: 'Seasonal Strategy',
        recommendation:
          'Scale customer success and onboarding during peak wedding season',
        expectedImpact: 'Reduce churn by 2-3% and increase lifetime value',
        timeframe: 'Immediate',
      });
    }

    // Supplier conversion
    if (metrics.supplierAcquisition.conversionRate < 15) {
      recommendations.push({
        priority: 'Medium',
        category: 'Supplier Acquisition',
        recommendation:
          'Optimize trial experience with wedding-specific onboarding flows',
        expectedImpact: `Increase conversion rate to 18-20% (${(((18 - metrics.supplierAcquisition.conversionRate) / metrics.supplierAcquisition.conversionRate) * 100).toFixed(1)}% improvement)`,
        timeframe: '6-8 weeks',
      });
    }

    return recommendations;
  }

  async validateCrossPlatformMetrics(): Promise<{
    isValid: boolean;
    discrepancies: Array<{
      metric: string;
      ga4Value: number;
      mixpanelValue: number;
      difference: number;
    }>;
  }> {
    const ga4Metrics = await this.ga4Client.getMetrics();
    const mixpanelMetrics = await this.mixpanelClient.getMetrics();

    const discrepancies = [];
    const tolerance = 0.05; // 5% tolerance

    // Compare key metrics
    const metricsToCompare = ['mrr_value', 'churn_rate', 'viral_coefficient'];

    for (const metric of metricsToCompare) {
      const ga4Value = ga4Metrics[metric] || 0;
      const mixpanelValue = mixpanelMetrics[metric] || 0;
      const difference =
        Math.abs(ga4Value - mixpanelValue) /
        Math.max(ga4Value, mixpanelValue, 1);

      if (difference > tolerance) {
        discrepancies.push({
          metric,
          ga4Value,
          mixpanelValue,
          difference,
        });
      }
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies,
    };
  }

  async exportBusinessIntelligenceData(
    format: 'csv' | 'json' | 'excel',
  ): Promise<{
    filename: string;
    data: any;
    downloadUrl: string;
  }> {
    const metrics = await this.gatherComprehensiveMetrics();

    switch (format) {
      case 'csv':
        return await this.biConnector.exportToCSV(metrics);
      case 'json':
        return await this.biConnector.exportToJSON(metrics);
      case 'excel':
        return await this.biConnector.exportToExcel(metrics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async gatherComprehensiveMetrics(): Promise<BusinessMetrics> {
    // This would gather metrics from all sources
    // For now, returning a structure that would be populated from database/APIs
    return {
      currentMRR: 0,
      mrrGrowthRate: 0,
      revenue: { monthly: 0, quarterly: 0, annual: 0 },
      churnRate: { monthly: 0, quarterly: 0, annual: 0 },
      viralCoefficient: 0,
      viralROI: {
        totalReferralValue: 0,
        costPerAcquisition: 0,
        lifetimeValue: 0,
      },
      seasonalFactors: {
        peakSeasonMultiplier: 1,
        currentSeasonImpact: 1,
        weddingSeasonTrends: [],
      },
      supplierAcquisition: {
        monthlyNewSignups: 0,
        conversionRate: 0,
        trialToPayRate: 0,
        supplierChurnRate: 0,
      },
      coupleEngagement: {
        invitationAcceptanceRate: 0,
        platformUtilizationRate: 0,
        weddingCompletionRate: 0,
        referralGenerationRate: 0,
      },
      industryBenchmarks: {
        averageWeddingBudget: 0,
        supplierDensityByRegion: {},
        competitorMarketShare: {},
      },
    };
  }
}
