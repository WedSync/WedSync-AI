import { 
  ValidationReport, 
  ExecutiveReport,
  BusinessMetricsData,
  WeddingSeasonContext 
} from '../../../tests/business-metrics/types/BusinessMetricsTypes';
import { BusinessMetricsValidator } from '../../../tests/business-metrics/validation/BusinessMetricsValidator';
import { createClient } from '@supabase/supabase-js';

/**
 * Comprehensive business metrics monitoring and alerting system for WS-195
 * Provides real-time monitoring, executive reporting, and emergency response
 */
export class BusinessMetricsMonitor {
  private validator: BusinessMetricsValidator;
  private supabase: any;
  private alertChannels: AlertChannel[];

  constructor() {
    this.validator = new BusinessMetricsValidator();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.alertChannels = this.initializeAlertChannels();
  }

  /**
   * Main monitoring loop - runs comprehensive validation and alerting
   */
  async runComprehensiveMonitoring(): Promise<MonitoringResult> {
    console.log('🔍 Starting comprehensive business metrics monitoring...');
    
    try {
      // Run full validation suite
      const validationReport = await this.validator.validateAllBusinessMetrics();
      
      // Assess business impact
      const businessImpact = await this.assessBusinessImpact(validationReport);
      
      // Generate executive alerts if needed
      await this.processExecutiveAlerts(validationReport, businessImpact);
      
      // Generate automated reports
      const executiveReport = await this.generateExecutiveReport(validationReport);
      
      // Store monitoring results
      await this.storeMonitoringResults(validationReport, businessImpact);
      
      // Update health dashboards
      await this.updateHealthDashboards(validationReport);
      
      return {
        timestamp: new Date().toISOString(),
        validationReport,
        businessImpact,
        executiveReport,
        alertsSent: businessImpact.alertsSent,
        overallStatus: this.determineOverallStatus(validationReport),
        nextMonitoringScheduled: this.calculateNextMonitoringTime(),
      };
      
    } catch (error) {
      console.error('❌ Critical monitoring system failure:', error);
      await this.sendCriticalSystemAlert(error);
      throw error;
    }
  }

  /**
   * Emergency monitoring for wedding day operations
   * Runs every 5 minutes during weekend wedding events
   */
  async runWeddingDayEmergencyMonitoring(): Promise<EmergencyMonitoringResult> {
    console.log('🚨 Wedding day emergency monitoring activated...');
    
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6; // Sunday or Saturday
    const isWeddingSeason = await this.isCurrentlyWeddingSeason();
    
    if (!isWeekend || !isWeddingSeason) {
      return {
        status: 'standby',
        message: 'Emergency monitoring not required - not wedding day',
        timestamp: new Date().toISOString()
      };
    }

    // Critical wedding day checks
    const emergencyChecks = await Promise.allSettled([
      this.checkPlatformUptime(),
      this.checkDatabasePerformance(),
      this.checkAPIResponseTimes(),
      this.checkActiveWeddingSuppliers(),
      this.checkPaymentProcessing(),
      this.checkEmailDelivery(),
      this.checkMobileAppPerformance(),
    ]);

    const failedChecks = emergencyChecks
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected');

    if (failedChecks.length > 0) {
      await this.triggerWeddingDayEmergencyResponse(failedChecks);
    }

    return {
      status: failedChecks.length === 0 ? 'healthy' : 'critical',
      checksCompleted: emergencyChecks.length,
      failedChecks: failedChecks.length,
      activeWeddings: await this.getActiveWeddingCount(),
      affectedSuppliers: await this.getAffectedSupplierCount(failedChecks),
      emergencyResponseTriggered: failedChecks.length > 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Set up executive alerting rules and thresholds
   */
  async setupExecutiveAlerting(): Promise<void> {
    const alertRules = [
      {
        name: 'MRR Decline Critical Alert',
        metric: 'MRR',
        condition: 'decline >10% week-over-week during peak season',
        severity: 'critical',
        recipients: ['ceo@wedsync.com', 'cfo@wedsync.com', 'board-chair@wedsync.com'],
        message: 'URGENT: MRR decline detected during peak wedding season - requires immediate investigation',
        escalationDelayHours: 1,
        enabledDuringWeddingSeason: true,
      },
      {
        name: 'Churn Rate Spike Alert',
        metric: 'Churn Rate',
        condition: 'monthly churn >8% during peak season OR >15% during off-season',
        severity: 'high',
        recipients: ['ceo@wedsync.com', 'head-of-customer-success@wedsync.com'],
        message: 'Churn rate exceeding healthy thresholds for wedding industry',
        escalationDelayHours: 4,
        enabledDuringWeddingSeason: true,
      },
      {
        name: 'Viral Coefficient Collapse Alert',
        metric: 'Viral Coefficient',
        condition: '<0.8 for 2+ consecutive weeks',
        severity: 'medium',
        recipients: ['ceo@wedsync.com', 'cmo@wedsync.com', 'head-of-product@wedsync.com'],
        message: 'Viral growth coefficient below sustainable levels - growth engine requires attention',
        escalationDelayHours: 24,
        enabledDuringWeddingSeason: false,
      },
      {
        name: 'Wedding Day Platform Failure Alert',
        metric: 'Platform Uptime',
        condition: 'uptime <99.9% on Saturday during wedding season',
        severity: 'critical',
        recipients: ['ceo@wedsync.com', 'cto@wedsync.com', 'head-of-customer-success@wedsync.com'],
        message: 'EMERGENCY: Platform issues detected during active wedding operations',
        escalationDelayHours: 0.25, // 15 minutes
        enabledDuringWeddingSeason: true,
        requiresImmediateResponse: true,
      },
      {
        name: 'Executive Dashboard Performance Alert',
        metric: 'Dashboard Performance',
        condition: 'load time >10 seconds OR availability <95%',
        severity: 'high',
        recipients: ['ceo@wedsync.com', 'cto@wedsync.com'],
        message: 'Executive dashboard performance degraded - board visibility at risk',
        escalationDelayHours: 2,
        enabledDuringWeddingSeason: true,
      },
    ];

    await this.configureAlertSystem(alertRules);
    console.log(`✅ Configured ${alertRules.length} executive alert rules`);
  }

  /**
   * Generate weekly executive report with wedding industry insights
   */
  async generateWeeklyExecutiveReport(): Promise<ExecutiveReport> {
    console.log('📊 Generating weekly executive report...');
    
    const metrics = await this.gatherWeeklyMetrics();
    const seasonalContext = await this.getCurrentSeasonalContext();
    const competitiveIntelligence = await this.gatherCompetitiveIntelligence();
    const businessInsights = await this.generateBusinessInsights(metrics, seasonalContext);
    
    const report: ExecutiveReport = {
      period: `Week of ${this.getWeekStartDate().toLocaleDateString()}`,
      summary: {
        mrr: this.summarizeMRRPerformance(metrics.mrr, seasonalContext),
        churn: this.summarizeChurnPerformance(metrics.churn, seasonalContext),
        viral: this.summarizeViralPerformance(metrics.viral, seasonalContext),
        seasonal: this.summarizeSeasonalImpact(metrics.seasonal, seasonalContext),
      },
      keyInsights: [
        ...businessInsights.keyTakeaways,
        ...this.generateWeddingIndustryInsights(metrics, seasonalContext),
      ],
      actionItems: [
        ...businessInsights.recommendedActions,
        ...this.generateSeasonalActionItems(seasonalContext),
      ],
      weddingIndustryContext: this.generateIndustryContext(seasonalContext, competitiveIntelligence),
      investorHighlights: this.generateInvestorHighlights(metrics, businessInsights),
      competitiveIntelligence: competitiveIntelligence,
      riskAssessment: await this.generateRiskAssessment(metrics, seasonalContext),
      nextWeekPriorities: this.generateNextWeekPriorities(businessInsights, seasonalContext),
    };
    
    // Store report for historical tracking
    await this.storeExecutiveReport(report);
    
    // Send to executive distribution list
    await this.distributeExecutiveReport(report);
    
    return report;
  }

  /**
   * Monitor business metrics performance continuously
   */
  async startContinuousMonitoring(): Promise<void> {
    console.log('🔄 Starting continuous business metrics monitoring...');
    
    // Set up different monitoring frequencies based on business criticality
    const monitoringSchedule = {
      // Every 5 minutes during wedding season weekends (critical business hours)
      weddingDayEmergency: {
        interval: 5 * 60 * 1000, // 5 minutes
        condition: () => this.isWeddingDayEmergencyPeriod(),
        handler: () => this.runWeddingDayEmergencyMonitoring(),
      },
      
      // Every hour during peak wedding season weekdays
      peakSeasonHourly: {
        interval: 60 * 60 * 1000, // 1 hour
        condition: () => this.isPeakSeasonBusinessHours(),
        handler: () => this.runHourlyMetricsCheck(),
      },
      
      // Every 4 hours during off-season
      offSeasonRegular: {
        interval: 4 * 60 * 60 * 1000, // 4 hours
        condition: () => this.isOffSeasonPeriod(),
        handler: () => this.runRegularMetricsCheck(),
      },
      
      // Daily comprehensive validation
      dailyComprehensive: {
        interval: 24 * 60 * 60 * 1000, // 24 hours
        condition: () => true, // Always run
        handler: () => this.runComprehensiveMonitoring(),
      },
      
      // Weekly executive reporting
      weeklyExecutive: {
        interval: 7 * 24 * 60 * 60 * 1000, // 7 days
        condition: () => new Date().getDay() === 1, // Mondays
        handler: () => this.generateWeeklyExecutiveReport(),
      },
    };

    // Start all monitoring loops
    Object.entries(monitoringSchedule).forEach(([name, schedule]) => {
      setInterval(async () => {
        if (schedule.condition()) {
          try {
            console.log(`🔍 Running ${name} monitoring...`);
            await schedule.handler();
          } catch (error) {
            console.error(`❌ ${name} monitoring failed:`, error);
            await this.handleMonitoringFailure(name, error);
          }
        }
      }, schedule.interval);
    });

    console.log('✅ Continuous monitoring started with adaptive scheduling');
  }

  // Private helper methods
  private async assessBusinessImpact(validationReport: ValidationReport): Promise<BusinessImpact> {
    const criticalIssues = validationReport.businessCriticalIssues;
    const overallValid = validationReport.overallValid;
    
    const impact: BusinessImpact = {
      severity: this.calculateBusinessSeverity(criticalIssues, overallValid),
      affectedMetrics: criticalIssues.map(issue => issue.metric),
      estimatedRevenueImpact: await this.estimateRevenueImpact(criticalIssues),
      customerImpact: await this.estimateCustomerImpact(criticalIssues),
      executiveAttentionRequired: criticalIssues.length > 0 || !overallValid,
      alertsSent: [],
      recommendedResponseTime: this.calculateResponseTime(criticalIssues),
      businessContinuityRisk: this.assessBusinessContinuityRisk(criticalIssues),
    };

    return impact;
  }

  private async processExecutiveAlerts(validationReport: ValidationReport, businessImpact: BusinessImpact): Promise<void> {
    if (!businessImpact.executiveAttentionRequired) {
      return;
    }

    const alerts = await this.generateExecutiveAlerts(validationReport, businessImpact);
    
    for (const alert of alerts) {
      try {
        await this.sendAlert(alert);
        businessImpact.alertsSent.push(alert.id);
        console.log(`📧 Executive alert sent: ${alert.title}`);
      } catch (error) {
        console.error(`❌ Failed to send alert ${alert.id}:`, error);
      }
    }
  }

  private async generateExecutiveAlerts(validationReport: ValidationReport, businessImpact: BusinessImpact): Promise<ExecutiveAlert[]> {
    const alerts: ExecutiveAlert[] = [];
    const seasonalContext = await this.getCurrentSeasonalContext();
    
    // Generate alerts based on critical issues
    for (const issue of validationReport.businessCriticalIssues) {
      const alert: ExecutiveAlert = {
        id: `alert_${Date.now()}_${issue.metric.replace(/\s+/g, '_').toLowerCase()}`,
        title: `Critical Business Metric Alert: ${issue.metric}`,
        severity: issue.severity,
        metric: issue.metric,
        currentValue: issue.details.calculated || 'Unknown',
        expectedValue: issue.details.expected || 'Unknown',
        businessContext: this.generateAlertBusinessContext(issue, seasonalContext),
        recommendedActions: this.generateAlertRecommendations(issue, seasonalContext),
        urgencyLevel: this.calculateAlertUrgency(issue, seasonalContext),
        recipients: this.getAlertRecipients(issue, businessImpact.severity),
        channels: this.getAlertChannels(issue, businessImpact.severity),
        timestamp: new Date().toISOString(),
      };
      
      alerts.push(alert);
    }

    return alerts;
  }

  private generateAlertBusinessContext(issue: any, seasonalContext: WeddingSeasonContext): string {
    const baseContext = `${issue.metric} validation failed with ${issue.severity} severity.`;
    const seasonalContext_text = `Current season: ${seasonalContext.currentSeason} (${seasonalContext.seasonStart} - ${seasonalContext.seasonEnd}).`;
    
    const contextMap = {
      'MRR Calculation': `MRR accuracy is critical for investor reporting and strategic decisions. During ${seasonalContext.currentSeason}, this metric directly affects fundraising and board confidence.`,
      'Churn Analysis': `Churn rate accuracy is essential for retention strategy and LTV calculations. ${seasonalContext.currentSeason} churn should be ${seasonalContext.expectedMetricMultipliers.churn}x baseline.`,
      'Viral Coefficient': `Viral growth tracking affects marketing budget allocation and growth projections. Wedding season viral effects should be ${seasonalContext.expectedMetricMultipliers.viral}x stronger.`,
      'Executive Dashboard Accuracy': `Dashboard reliability is critical for C-level decision-making and board presentations. Issues compromise executive operational visibility.`,
    };
    
    const specificContext = contextMap[issue.metric] || 'This metric is critical for business operations and strategic decision-making.';
    
    return `${baseContext} ${seasonalContext_text} ${specificContext}`;
  }

  private generateAlertRecommendations(issue: any, seasonalContext: WeddingSeasonContext): string[] {
    const baseRecommendations = [
      `Investigate ${issue.metric} calculation methodology immediately`,
      'Validate data sources and integration points',
      'Check for recent system changes or deployments',
    ];
    
    const seasonalRecommendations = {
      'peak': [
        'Prioritize fix due to peak wedding season business criticality',
        'Consider manual validation for immediate executive reporting',
        'Implement temporary monitoring until resolution',
      ],
      'off-season': [
        'Schedule thorough investigation during lower business impact period',
        'Use opportunity to implement comprehensive fix and testing',
        'Prepare documentation for peak season prevention',
      ],
      'transition': [
        'Resolve before entering peak business period',
        'Test extensively with seasonal data patterns',
        'Validate accuracy across seasonal transitions',
      ],
    };
    
    return [
      ...baseRecommendations,
      ...seasonalRecommendations[seasonalContext.currentSeason] || [],
    ];
  }

  private async triggerWeddingDayEmergencyResponse(failedChecks: any[]): Promise<void> {
    console.log('🚨 Wedding Day Emergency Response Triggered!');
    
    const emergencyAlert: EmergencyAlert = {
      id: `wedding_emergency_${Date.now()}`,
      title: 'WEDDING DAY EMERGENCY: Platform Issues Detected',
      severity: 'critical',
      affectedSystems: failedChecks.map(check => this.getSystemNameFromCheck(check.index)),
      activeWeddings: await this.getActiveWeddingCount(),
      affectedSuppliers: await this.getAffectedSupplierCount(failedChecks),
      estimatedImpact: 'Wedding operations may be disrupted for active suppliers',
      immediateActions: [
        'Activate incident response team',
        'Notify affected suppliers directly',
        'Prepare manual backup procedures',
        'Escalate to C-level leadership immediately',
      ],
      escalationRequired: true,
      timestamp: new Date().toISOString(),
    };
    
    // Send to all emergency channels
    await this.sendEmergencyAlert(emergencyAlert);
    
    // Activate incident response procedures
    await this.activateIncidentResponse(emergencyAlert);
    
    // Begin continuous monitoring every 60 seconds until resolved
    this.startEmergencyMonitoringLoop(failedChecks);
  }

  private initializeAlertChannels(): AlertChannel[] {
    return [
      {
        name: 'email',
        handler: this.sendEmailAlert.bind(this),
        enabled: true,
        priority: 1,
      },
      {
        name: 'slack',
        handler: this.sendSlackAlert.bind(this),
        enabled: true,
        priority: 2,
      },
      {
        name: 'sms',
        handler: this.sendSMSAlert.bind(this),
        enabled: true,
        priority: 3,
        emergencyOnly: true,
      },
      {
        name: 'dashboard',
        handler: this.updateDashboardAlert.bind(this),
        enabled: true,
        priority: 4,
      },
    ];
  }

  private async sendEmailAlert(alert: ExecutiveAlert): Promise<void> {
    // Implementation for email alerts using Resend
    console.log(`📧 Sending email alert: ${alert.title}`);
  }

  private async sendSlackAlert(alert: ExecutiveAlert): Promise<void> {
    // Implementation for Slack alerts
    console.log(`💬 Sending Slack alert: ${alert.title}`);
  }

  private async sendSMSAlert(alert: ExecutiveAlert): Promise<void> {
    // Implementation for SMS alerts using Twilio
    console.log(`📱 Sending SMS alert: ${alert.title}`);
  }

  private async updateDashboardAlert(alert: ExecutiveAlert): Promise<void> {
    // Implementation for dashboard alert banner
    console.log(`📊 Updating dashboard alert: ${alert.title}`);
  }

  // Additional helper methods would be implemented here...
  private async isCurrentlyWeddingSeason(): Promise<boolean> {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    return currentMonth >= 4 && currentMonth <= 10; // April through October
  }

  private async isWeddingDayEmergencyPeriod(): Promise<boolean> {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isWeddingSeason = await this.isCurrentlyWeddingSeason();
    return isWeekend && isWeddingSeason;
  }

  private async isPeakSeasonBusinessHours(): Promise<boolean> {
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 8 && hour <= 18;
    const isWeddingSeason = await this.isCurrentlyWeddingSeason();
    return isBusinessHours && isWeddingSeason;
  }

  private async isOffSeasonPeriod(): Promise<boolean> {
    return !(await this.isCurrentlyWeddingSeason());
  }

  // Interface definitions
  interface MonitoringResult {
    timestamp: string;
    validationReport: ValidationReport;
    businessImpact: BusinessImpact;
    executiveReport: ExecutiveReport;
    alertsSent: string[];
    overallStatus: 'healthy' | 'warning' | 'critical';
    nextMonitoringScheduled: string;
  }

  interface EmergencyMonitoringResult {
    status: 'standby' | 'healthy' | 'critical';
    message?: string;
    timestamp: string;
    checksCompleted?: number;
    failedChecks?: number;
    activeWeddings?: number;
    affectedSuppliers?: number;
    emergencyResponseTriggered?: boolean;
  }

  interface BusinessImpact {
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedMetrics: string[];
    estimatedRevenueImpact: number;
    customerImpact: number;
    executiveAttentionRequired: boolean;
    alertsSent: string[];
    recommendedResponseTime: string;
    businessContinuityRisk: 'minimal' | 'moderate' | 'severe';
  }

  interface ExecutiveAlert {
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metric: string;
    currentValue: any;
    expectedValue: any;
    businessContext: string;
    recommendedActions: string[];
    urgencyLevel: 'standard' | 'urgent' | 'emergency';
    recipients: string[];
    channels: string[];
    timestamp: string;
  }

  interface EmergencyAlert {
    id: string;
    title: string;
    severity: 'critical';
    affectedSystems: string[];
    activeWeddings: number;
    affectedSuppliers: number;
    estimatedImpact: string;
    immediateActions: string[];
    escalationRequired: boolean;
    timestamp: string;
  }

  interface AlertChannel {
    name: string;
    handler: (alert: ExecutiveAlert) => Promise<void>;
    enabled: boolean;
    priority: number;
    emergencyOnly?: boolean;
  }
}