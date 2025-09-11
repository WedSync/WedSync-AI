// WS-230 Enhanced Viral Coefficient Tracking System
// Automated Viral Metric Reporting Tests

import { ViralMetricReportingService } from '../../lib/services/viral-metric-reporting-service';
import {
  ViralSimulationEngine,
  ViralIntervention,
  SimulationScenario,
} from '../../lib/analytics/viral-simulation-engine';
import { AdvancedViralCalculator } from '../../lib/analytics/advanced-viral-calculator';
import { ViralMetrics } from '../../types/viral-analytics';

// Mock email service
jest.mock('../../lib/services/email-service', () => ({
  EmailService: {
    sendReport: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-123' }),
    sendAlert: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'alert-456' }),
  },
}));

// Mock Slack service
jest.mock('../../lib/services/slack-service', () => ({
  SlackService: {
    sendMessage: jest.fn().mockResolvedValue({ ok: true, ts: 'slack-789' }),
    sendAlert: jest.fn().mockResolvedValue({ ok: true, ts: 'slack-alert-999' }),
  },
}));

describe('WS-230 Automated Viral Metric Reporting Tests', () => {
  let reportingService: ViralMetricReportingService;
  let simulationEngine: ViralSimulationEngine;
  let calculator: AdvancedViralCalculator;

  beforeEach(() => {
    reportingService = new ViralMetricReportingService();
    simulationEngine = new ViralSimulationEngine();
    calculator = new AdvancedViralCalculator();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Daily Viral Metrics Reports', () => {
    it('should generate and send daily viral coefficient report', async () => {
      const metrics: ViralMetrics = {
        totalInvites: 1500,
        acceptedInvites: 1050,
        newUserRegistrations: 840,
        activeEngagement: 630,
        timeframe: 1, // Daily
        tier: 'PROFESSIONAL',
      };

      const report = await reportingService.generateDailyReport(metrics);

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('alerts');

      // Verify report structure
      expect(report.metrics.currentCoefficient).toBeGreaterThan(0);
      expect(report.metrics.seasonalAdjustment).toBeDefined();
      expect(report.metrics.trendDirection).toMatch(
        /INCREASING|STABLE|DECREASING/,
      );

      // Verify insights are generated
      expect(report.insights).toHaveLength(3);
      expect(report.insights[0]).toHaveProperty('category');
      expect(report.insights[0]).toHaveProperty('description');
      expect(report.insights[0]).toHaveProperty('impact');

      // Verify report delivery
      const deliveryResult = await reportingService.deliverReport(report, [
        'admin@wedsync.com',
      ]);
      expect(deliveryResult.success).toBe(true);
    });

    it('should include wedding season context in daily reports', async () => {
      const peakSeasonMetrics: ViralMetrics = {
        totalInvites: 2500,
        acceptedInvites: 2000,
        newUserRegistrations: 1600,
        activeEngagement: 1200,
        timeframe: 1,
        tier: 'SCALE',
      };

      const peakDate = new Date('2024-06-15'); // Peak wedding season
      const report = await reportingService.generateDailyReport(
        peakSeasonMetrics,
        peakDate,
      );

      expect(report.seasonalContext).toBe('peak');
      expect(report.seasonalMultiplier).toBe(1.4);
      expect(
        report.insights.some((insight) =>
          insight.description.includes('peak wedding season'),
        ),
      ).toBe(true);

      // Verify seasonal recommendations
      expect(
        report.recommendations.some(
          (rec) => rec.includes('capacity') || rec.includes('scaling'),
        ),
      ).toBe(true);
    });

    it('should handle missing or incomplete daily data gracefully', async () => {
      const incompleteMetrics: Partial<ViralMetrics> = {
        totalInvites: 1000,
        acceptedInvites: 600,
        // Missing newUserRegistrations and activeEngagement
        timeframe: 1,
        tier: 'STARTER',
      };

      const report = await reportingService.generateDailyReport(
        incompleteMetrics as ViralMetrics,
      );

      expect(report.warnings).toHaveLength(2);
      expect(report.warnings).toContain('Missing new user registration data');
      expect(report.warnings).toContain('Missing active engagement data');

      // Should still generate report with available data
      expect(report.metrics.currentCoefficient).toBe(0); // No new users
      expect(report.reliability).toBe('LOW');
    });
  });

  describe('Weekly Executive Summary Reports', () => {
    it('should generate comprehensive weekly executive summary', async () => {
      const weeklyMetrics: ViralMetrics[] = Array.from(
        { length: 7 },
        (_, i) => ({
          totalInvites: 1000 + i * 100,
          acceptedInvites: 700 + i * 70,
          newUserRegistrations: 560 + i * 56,
          activeEngagement: 420 + i * 42,
          timeframe: 1,
          tier: 'PROFESSIONAL',
        }),
      );

      const executiveSummary =
        await reportingService.generateExecutiveSummary(weeklyMetrics);

      // Verify executive summary structure
      expect(executiveSummary).toHaveProperty('executiveOverview');
      expect(executiveSummary).toHaveProperty('keyMetrics');
      expect(executiveSummary).toHaveProperty('trendAnalysis');
      expect(executiveSummary).toHaveProperty('businessImpact');
      expect(executiveSummary).toHaveProperty('actionItems');
      expect(executiveSummary).toHaveProperty('growthProjections');

      // Verify key metrics
      expect(executiveSummary.keyMetrics.avgWeeklyCoefficient).toBeGreaterThan(
        0,
      );
      expect(executiveSummary.keyMetrics.weekOverWeekGrowth).toBeDefined();
      expect(executiveSummary.keyMetrics.totalNewUsers).toBeGreaterThan(0);
      expect(
        executiveSummary.keyMetrics.projectedMonthlyGrowth,
      ).toBeGreaterThan(0);

      // Verify trend analysis
      expect(executiveSummary.trendAnalysis.direction).toMatch(
        /INCREASING|STABLE|DECREASING/,
      );
      expect(executiveSummary.trendAnalysis.velocity).toBeGreaterThan(0);
      expect(executiveSummary.trendAnalysis.confidence).toBeGreaterThan(0.5);

      // Verify business impact is calculated
      expect(executiveSummary.businessImpact.estimatedRevenue).toBeGreaterThan(
        0,
      );
      expect(executiveSummary.businessImpact.userGrowthRate).toBeGreaterThan(0);
      expect(executiveSummary.businessImpact.marketPenetration).toBeGreaterThan(
        0,
      );
    });

    it('should include intervention recommendations in executive summary', async () => {
      const decliningMetrics: ViralMetrics[] = Array.from(
        { length: 7 },
        (_, i) => ({
          totalInvites: 1500 - i * 50, // Declining trend
          acceptedInvites: 1050 - i * 40,
          newUserRegistrations: 840 - i * 35,
          activeEngagement: 630 - i * 25,
          timeframe: 1,
          tier: 'PROFESSIONAL',
        }),
      );

      const executiveSummary =
        await reportingService.generateExecutiveSummary(decliningMetrics);

      // Should identify declining trend
      expect(executiveSummary.trendAnalysis.direction).toBe('DECREASING');

      // Should include intervention recommendations
      expect(executiveSummary.actionItems).toHaveLength(3);
      expect(
        executiveSummary.actionItems.some(
          (item) =>
            item.priority === 'HIGH' && item.type === 'INTERVENTION_REQUIRED',
        ),
      ).toBe(true);

      // Should include specific recommendations
      expect(
        executiveSummary.recommendations.some(
          (rec) =>
            rec.includes('invite acceptance') || rec.includes('engagement'),
        ),
      ).toBe(true);
    });

    it('should format executive summary for different audiences', async () => {
      const metrics: ViralMetrics[] = [
        {
          totalInvites: 1000,
          acceptedInvites: 700,
          newUserRegistrations: 560,
          activeEngagement: 420,
          timeframe: 7,
          tier: 'PROFESSIONAL',
        },
      ];

      // Generate for CEO (high-level, business focused)
      const ceoSummary = await reportingService.generateExecutiveSummary(
        metrics,
        'CEO',
      );
      expect(ceoSummary.executiveOverview).toContain('revenue');
      expect(ceoSummary.executiveOverview).toContain('growth');
      expect(ceoSummary.technicalDetails).toBeUndefined();

      // Generate for CTO (technical details included)
      const ctoSummary = await reportingService.generateExecutiveSummary(
        metrics,
        'CTO',
      );
      expect(ctoSummary.technicalDetails).toBeDefined();
      expect(ctoSummary.technicalDetails.calculationMethod).toBeDefined();
      expect(ctoSummary.technicalDetails.dataQuality).toBeDefined();

      // Generate for Product Team (feature focused)
      const productSummary = await reportingService.generateExecutiveSummary(
        metrics,
        'PRODUCT',
      );
      expect(productSummary.featureImpact).toBeDefined();
      expect(productSummary.userExperienceInsights).toBeDefined();
    });
  });

  describe('Real-time Alert System', () => {
    it('should trigger alert for significant viral coefficient drop', async () => {
      const previousMetrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      const currentMetrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 400, // Significant drop
        newUserRegistrations: 320,
        activeEngagement: 240,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      const alertResult = await reportingService.checkAndSendAlerts(
        previousMetrics,
        currentMetrics,
      );

      expect(alertResult.alertsTriggered).toBe(true);
      expect(alertResult.alerts).toHaveLength(1);
      expect(alertResult.alerts[0].type).toBe('VIRAL_COEFFICIENT_DROP');
      expect(alertResult.alerts[0].severity).toBe('HIGH');
      expect(alertResult.alerts[0].threshold).toBe(0.25); // 25% drop threshold
      expect(alertResult.alerts[0].actualDrop).toBeGreaterThan(0.25);

      // Verify immediate notification
      expect(alertResult.notificationsSent).toHaveLength(2); // Email + Slack
      expect(alertResult.notificationsSent[0].channel).toBe('email');
      expect(alertResult.notificationsSent[1].channel).toBe('slack');
    });

    it('should trigger alert for bottleneck detection', async () => {
      const bottleneckMetrics: ViralMetrics = {
        totalInvites: 2000,
        acceptedInvites: 800, // Low acceptance rate (40%)
        newUserRegistrations: 640,
        activeEngagement: 480,
        timeframe: 1,
        tier: 'SCALE',
      };

      const alertResult =
        await reportingService.checkBottleneckAlerts(bottleneckMetrics);

      expect(alertResult.alertsTriggered).toBe(true);
      expect(alertResult.alerts[0].type).toBe('BOTTLENECK_DETECTED');
      expect(alertResult.alerts[0].bottleneckType).toBe('INVITE_ACCEPTANCE');
      expect(alertResult.alerts[0].impact).toBeGreaterThan(0.1); // > 10% impact

      // Should include actionable recommendations
      expect(alertResult.alerts[0].recommendations).toHaveLength(3);
      expect(
        alertResult.alerts[0].recommendations.some(
          (rec) => rec.includes('invite') || rec.includes('acceptance'),
        ),
      ).toBe(true);
    });

    it('should send wedding season capacity alerts', async () => {
      const peakSeasonMetrics: ViralMetrics = {
        totalInvites: 5000, // Very high volume
        acceptedInvites: 3500,
        newUserRegistrations: 2800,
        activeEngagement: 2100,
        timeframe: 1,
        tier: 'SCALE',
      };

      const alertResult = await reportingService.checkCapacityAlerts(
        peakSeasonMetrics,
        new Date('2024-06-15'), // Peak season
      );

      expect(alertResult.alertsTriggered).toBe(true);
      expect(alertResult.alerts[0].type).toBe('CAPACITY_WARNING');
      expect(alertResult.alerts[0].severity).toBe('MEDIUM');
      expect(alertResult.alerts[0].message).toContain('peak season');
      expect(
        alertResult.alerts[0].recommendations.some(
          (rec) => rec.includes('scaling') || rec.includes('capacity'),
        ),
      ).toBe(true);
    });

    it('should not trigger false alarms for normal fluctuations', async () => {
      const baseMetrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      // Small fluctuation within normal range
      const slightlyLowerMetrics: ViralMetrics = {
        ...baseMetrics,
        acceptedInvites: 680, // Only 3% decrease
        newUserRegistrations: 544,
        activeEngagement: 408,
      };

      const alertResult = await reportingService.checkAndSendAlerts(
        baseMetrics,
        slightlyLowerMetrics,
      );

      expect(alertResult.alertsTriggered).toBe(false);
      expect(alertResult.alerts).toHaveLength(0);
      expect(alertResult.notificationsSent).toHaveLength(0);
    });
  });

  describe('Automated Report Scheduling', () => {
    it('should schedule daily reports correctly', async () => {
      const scheduleConfig = {
        reportType: 'DAILY_VIRAL_METRICS',
        frequency: 'DAILY',
        time: '08:00',
        timezone: 'Europe/London',
        recipients: ['admin@wedsync.com', 'growth@wedsync.com'],
        includeAlerts: true,
      };

      const schedule =
        await reportingService.createReportSchedule(scheduleConfig);

      expect(schedule.scheduleId).toBeDefined();
      expect(schedule.nextRun).toBeInstanceOf(Date);
      expect(schedule.status).toBe('ACTIVE');

      // Verify next run is scheduled for tomorrow at 8 AM
      const tomorrow8am = new Date();
      tomorrow8am.setDate(tomorrow8am.getDate() + 1);
      tomorrow8am.setHours(8, 0, 0, 0);

      const timeDiff = Math.abs(
        schedule.nextRun.getTime() - tomorrow8am.getTime(),
      );
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    it('should handle weekend scheduling for business reports', async () => {
      const weekendScheduleConfig = {
        reportType: 'WEEKLY_EXECUTIVE_SUMMARY',
        frequency: 'WEEKLY',
        dayOfWeek: 'MONDAY',
        time: '09:00',
        timezone: 'Europe/London',
        recipients: ['ceo@wedsync.com', 'cto@wedsync.com'],
        skipWeekends: true,
      };

      const schedule = await reportingService.createReportSchedule(
        weekendScheduleConfig,
      );

      // Verify next run is on a Monday
      expect(schedule.nextRun.getDay()).toBe(1); // Monday = 1
      expect(schedule.nextRun.getHours()).toBe(9);
      expect(schedule.skipWeekends).toBe(true);
    });

    it('should handle timezone conversions correctly', async () => {
      const usScheduleConfig = {
        reportType: 'DAILY_VIRAL_METRICS',
        frequency: 'DAILY',
        time: '09:00',
        timezone: 'America/New_York',
        recipients: ['us-team@wedsync.com'],
      };

      const ukScheduleConfig = {
        reportType: 'DAILY_VIRAL_METRICS',
        frequency: 'DAILY',
        time: '09:00',
        timezone: 'Europe/London',
        recipients: ['uk-team@wedsync.com'],
      };

      const usSchedule =
        await reportingService.createReportSchedule(usScheduleConfig);
      const ukSchedule =
        await reportingService.createReportSchedule(ukScheduleConfig);

      // Verify timezone difference (typically 5-8 hours depending on DST)
      const timeDiff = Math.abs(
        usSchedule.nextRun.getTime() - ukSchedule.nextRun.getTime(),
      );
      expect(timeDiff).toBeGreaterThan(4 * 60 * 60 * 1000); // At least 4 hours
      expect(timeDiff).toBeLessThan(9 * 60 * 60 * 1000); // Less than 9 hours
    });
  });

  describe('Report Delivery and Formatting', () => {
    it('should format reports for email delivery', async () => {
      const metrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      const report = await reportingService.generateDailyReport(metrics);
      const emailFormat = await reportingService.formatForEmail(report);

      expect(emailFormat).toHaveProperty('subject');
      expect(emailFormat).toHaveProperty('htmlBody');
      expect(emailFormat).toHaveProperty('textBody');
      expect(emailFormat).toHaveProperty('attachments');

      // Verify email content
      expect(emailFormat.subject).toContain('Daily Viral Metrics');
      expect(emailFormat.subject).toContain('1.24'); // Coefficient value

      // HTML body should be well-formatted
      expect(emailFormat.htmlBody).toContain('<html>');
      expect(emailFormat.htmlBody).toContain('Viral Coefficient');
      expect(emailFormat.htmlBody).toContain('table'); // Metrics table

      // Text body should be readable without HTML
      expect(emailFormat.textBody).not.toContain('<');
      expect(emailFormat.textBody).toContain('Viral Coefficient:');

      // Should include CSV attachment
      expect(emailFormat.attachments).toHaveLength(1);
      expect(emailFormat.attachments[0].filename).toContain('.csv');
      expect(emailFormat.attachments[0].contentType).toBe('text/csv');
    });

    it('should format reports for Slack delivery', async () => {
      const metrics: ViralMetrics = {
        totalInvites: 1500,
        acceptedInvites: 1050,
        newUserRegistrations: 840,
        activeEngagement: 630,
        timeframe: 1,
        tier: 'SCALE',
      };

      const report = await reportingService.generateDailyReport(metrics);
      const slackFormat = await reportingService.formatForSlack(report);

      expect(slackFormat).toHaveProperty('channel');
      expect(slackFormat).toHaveProperty('text');
      expect(slackFormat).toHaveProperty('blocks');
      expect(slackFormat).toHaveProperty('attachments');

      // Verify Slack formatting
      expect(slackFormat.text).toContain('📊 Daily Viral Metrics');
      expect(slackFormat.blocks).toHaveLength(4); // Header, metrics, insights, actions

      // Should use Slack block kit format
      expect(slackFormat.blocks[0].type).toBe('header');
      expect(slackFormat.blocks[1].type).toBe('section');
      expect(slackFormat.blocks[1].fields).toHaveLength(4); // Key metrics

      // Should include actionable buttons if alerts exist
      if (report.alerts.length > 0) {
        expect(
          slackFormat.blocks.some((block) => block.type === 'actions'),
        ).toBe(true);
      }
    });

    it('should handle delivery failures gracefully', async () => {
      // Mock email service failure
      const EmailService =
        require('../../lib/services/email-service').EmailService;
      EmailService.sendReport.mockRejectedValueOnce(
        new Error('SMTP connection failed'),
      );

      const metrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      const report = await reportingService.generateDailyReport(metrics);
      const deliveryResult = await reportingService.deliverReport(report, [
        'admin@wedsync.com',
      ]);

      expect(deliveryResult.success).toBe(false);
      expect(deliveryResult.errors).toHaveLength(1);
      expect(deliveryResult.errors[0]).toContain('SMTP connection failed');

      // Should log failure for retry
      expect(deliveryResult.retryScheduled).toBe(true);
      expect(deliveryResult.nextRetryAt).toBeInstanceOf(Date);
    });
  });

  describe('Report Performance and Reliability', () => {
    it('should generate reports within performance requirements', async () => {
      const largeDataset: ViralMetrics = {
        totalInvites: 100000, // Large volume
        acceptedInvites: 70000,
        newUserRegistrations: 56000,
        activeEngagement: 42000,
        timeframe: 1,
        tier: 'ENTERPRISE',
      };

      const startTime = performance.now();
      const report = await reportingService.generateDailyReport(largeDataset);
      const endTime = performance.now();

      const generationTime = endTime - startTime;

      // Should generate large reports under 5 seconds
      expect(generationTime).toBeLessThan(5000);
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
    });

    it('should handle concurrent report generation', async () => {
      const metrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      // Generate multiple reports concurrently
      const promises = Array.from({ length: 10 }, () =>
        reportingService.generateDailyReport(metrics),
      );

      const startTime = performance.now();
      const reports = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // All reports should be generated successfully
      expect(reports).toHaveLength(10);
      reports.forEach((report) => {
        expect(report).toBeDefined();
        expect(report.reportId).toBeDefined();
      });

      // Should handle concurrency efficiently (under 10 seconds for 10 reports)
      expect(totalTime).toBeLessThan(10000);
    });

    it('should maintain data consistency across reports', async () => {
      const metrics: ViralMetrics = {
        totalInvites: 1000,
        acceptedInvites: 700,
        newUserRegistrations: 560,
        activeEngagement: 420,
        timeframe: 1,
        tier: 'PROFESSIONAL',
      };

      // Generate same report multiple times
      const report1 = await reportingService.generateDailyReport(metrics);
      const report2 = await reportingService.generateDailyReport(metrics);

      // Should produce consistent results
      expect(report1.metrics.currentCoefficient).toBe(
        report2.metrics.currentCoefficient,
      );
      expect(report1.metrics.adjustedCoefficient).toBe(
        report2.metrics.adjustedCoefficient,
      );
      expect(report1.insights.length).toBe(report2.insights.length);

      // Report IDs should be different
      expect(report1.reportId).not.toBe(report2.reportId);

      // Generation times should be close
      const timeDiff = Math.abs(
        report1.generatedAt.getTime() - report2.generatedAt.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });
});
