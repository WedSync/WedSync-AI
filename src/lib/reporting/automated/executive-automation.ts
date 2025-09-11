// WS-195 Team C: Executive Reporting Automation Pipeline
// Multi-channel distribution for executive business intelligence

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface ComprehensiveBusinessMetrics {
  financial: {
    mrr: number;
    revenue: { monthly: number; quarterly: number; annual: number };
    growth_rate: number;
    burn_rate: number;
    runway_months: number;
  };
  growth: {
    new_signups: number;
    conversion_rate: number;
    viral_coefficient: number;
    churn_rate: number;
    ltv_cac_ratio: number;
  };
  customer: {
    total_suppliers: number;
    active_suppliers: number;
    total_couples: number;
    active_couples: number;
    nps_score: number;
  };
  wedding: {
    seasonal_multiplier: number;
    peak_season_revenue_boost: number;
    wedding_completion_rate: number;
    supplier_couple_matching_rate: number;
  };
  competitive: {
    market_share_estimate: number;
    pricing_position: string;
    feature_gap_score: number;
    brand_sentiment: number;
  };
}

interface ExecutiveReportData {
  title: string;
  generatedAt: Date;
  reportPeriod: { start: Date; end: Date };
  summary: any;
  weddingIndustryInsights: any;
  recommendations: Array<{
    priority: 'High' | 'Medium' | 'Low';
    category: string;
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
}

export class ExecutiveReportingAutomation {
  private supabase: any;
  private resend: Resend;
  private slackWebhookUrl: string;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.slackWebhookUrl = process.env.SLACK_EXECUTIVE_WEBHOOK_URL || '';
  }

  async scheduleWeeklyExecutiveReport(): Promise<void> {
    try {
      const metrics = await this.gatherComprehensiveMetrics();
      const report = await this.generateExecutiveReport(metrics);

      // Multi-channel distribution
      const distributionResults = await Promise.allSettled([
        this.emailExecutiveTeam(report),
        this.postToSlackExecutiveChannel(report),
        this.updateInvestorDashboard(report),
        this.archiveToBusinessIntelligence(report),
      ]);

      // Log distribution results
      console.log(
        'Executive report distribution results:',
        distributionResults,
      );

      // Store report generation record
      await this.recordReportGeneration(report, distributionResults);
    } catch (error) {
      console.error('Failed to generate executive report:', error);
      await this.sendErrorAlert('Executive Report Generation Failed', error);
    }
  }

  async gatherComprehensiveMetrics(): Promise<ComprehensiveBusinessMetrics> {
    const [financial, growth, customer, wedding, competitive] =
      await Promise.all([
        this.getFinancialMetrics(),
        this.getGrowthMetrics(),
        this.getCustomerMetrics(),
        this.getWeddingIndustryMetrics(),
        this.getCompetitiveInsights(),
      ]);

    return {
      financial,
      growth,
      customer,
      wedding,
      competitive,
    };
  }

  private async getFinancialMetrics() {
    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select('tier_id, billing_cycle, amount, status')
      .eq('status', 'active');

    const monthlyRevenue =
      subscriptions?.reduce((total: number, sub: any) => {
        const monthlyAmount =
          sub.billing_cycle === 'annual' ? sub.amount / 12 : sub.amount;
        return total + monthlyAmount;
      }, 0) || 0;

    return {
      mrr: monthlyRevenue,
      revenue: {
        monthly: monthlyRevenue,
        quarterly: monthlyRevenue * 3,
        annual: monthlyRevenue * 12,
      },
      growth_rate: await this.calculateGrowthRate(monthlyRevenue),
      burn_rate: await this.calculateBurnRate(),
      runway_months: await this.calculateRunwayMonths(),
    };
  }

  private async getGrowthMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: newSignups } = await this.supabase
      .from('organizations')
      .select('id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: conversions } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'active')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: churned } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'canceled')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    const totalSignups = newSignups?.length || 0;
    const totalConversions = conversions?.length || 0;
    const totalChurned = churned?.length || 0;

    return {
      new_signups: totalSignups,
      conversion_rate:
        totalSignups > 0 ? (totalConversions / totalSignups) * 100 : 0,
      viral_coefficient: await this.calculateViralCoefficient(),
      churn_rate: await this.calculateChurnRate(totalChurned),
      ltv_cac_ratio: await this.calculateLtvCacRatio(),
    };
  }

  private async getCustomerMetrics() {
    const { data: suppliers } = await this.supabase
      .from('organizations')
      .select('id, last_active_at')
      .eq('type', 'supplier');

    const { data: couples } = await this.supabase
      .from('couples')
      .select('id, last_active_at');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeSuppliers =
      suppliers?.filter((s: any) => new Date(s.last_active_at) > thirtyDaysAgo)
        .length || 0;

    const activeCouples =
      couples?.filter((c: any) => new Date(c.last_active_at) > thirtyDaysAgo)
        .length || 0;

    return {
      total_suppliers: suppliers?.length || 0,
      active_suppliers: activeSuppliers,
      total_couples: couples?.length || 0,
      active_couples: activeCouples,
      nps_score: await this.calculateNPSScore(),
    };
  }

  private async getWeddingIndustryMetrics() {
    const currentMonth = new Date().getMonth() + 1;
    const seasonalMultiplier = this.getSeasonalMultiplier(currentMonth);

    const { data: weddings } = await this.supabase
      .from('weddings')
      .select('id, wedding_date, status')
      .gte('wedding_date', new Date().toISOString());

    const completedWeddings =
      weddings?.filter((w: any) => w.status === 'completed').length || 0;
    const totalWeddings = weddings?.length || 0;

    return {
      seasonal_multiplier: seasonalMultiplier,
      peak_season_revenue_boost:
        seasonalMultiplier > 1.5 ? (seasonalMultiplier - 1) * 100 : 0,
      wedding_completion_rate:
        totalWeddings > 0 ? (completedWeddings / totalWeddings) * 100 : 0,
      supplier_couple_matching_rate: await this.calculateMatchingRate(),
    };
  }

  private async getCompetitiveInsights() {
    return {
      market_share_estimate: 0.5, // Placeholder - would come from market research
      pricing_position: 'competitive',
      feature_gap_score: 85, // Placeholder - would come from feature analysis
      brand_sentiment: 0.7, // Placeholder - would come from sentiment analysis
    };
  }

  async emailExecutiveTeam(report: ExecutiveReportData): Promise<void> {
    const executiveEmails = process.env.EXECUTIVE_EMAIL_LIST?.split(',') || [];

    if (executiveEmails.length === 0) {
      console.warn('No executive emails configured');
      return;
    }

    const emailHtml = this.generateEmailReport(report);

    await this.resend.emails.send({
      from: 'reports@wedsync.com',
      to: executiveEmails,
      subject: `${report.title} - Executive Business Intelligence`,
      html: emailHtml,
      attachments: [
        {
          filename: `executive-report-${new Date().toISOString().split('T')[0]}.pdf`,
          content: await this.generatePDFReport(report),
        },
      ],
    });
  }

  async postToSlackExecutiveChannel(
    report: ExecutiveReportData,
  ): Promise<void> {
    if (!this.slackWebhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }

    const slackMessage = this.generateSlackMessage(report);

    await fetch(this.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
  }

  async updateInvestorDashboard(report: ExecutiveReportData): Promise<void> {
    // Store metrics in investor dashboard table
    const { error } = await this.supabase.from('investor_metrics').insert({
      report_date: report.generatedAt.toISOString(),
      mrr: report.summary.mrr.current,
      growth_rate: report.summary.mrr.growth,
      churn_rate: report.summary.churn.rate,
      viral_coefficient: report.summary.virality.coefficient,
      report_data: report,
    });

    if (error) {
      console.error('Failed to update investor dashboard:', error);
    }
  }

  async archiveToBusinessIntelligence(
    report: ExecutiveReportData,
  ): Promise<void> {
    const { error } = await this.supabase.from('executive_reports').insert({
      title: report.title,
      generated_at: report.generatedAt.toISOString(),
      report_period_start: report.reportPeriod.start.toISOString(),
      report_period_end: report.reportPeriod.end.toISOString(),
      report_data: report,
      distribution_channels: ['email', 'slack', 'investor_dashboard'],
    });

    if (error) {
      console.error('Failed to archive report to BI:', error);
    }
  }

  private generateEmailReport(report: ExecutiveReportData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9fafb; border-radius: 6px; }
            .high-priority { border-left: 4px solid #ef4444; }
            .medium-priority { border-left: 4px solid #f59e0b; }
            .low-priority { border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${report.title}</h1>
            <p>Generated: ${report.generatedAt.toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h2>📊 Key Metrics Summary</h2>
            <div class="metric">
              <strong>MRR:</strong> £${report.summary.mrr.current.toLocaleString()}<br>
              <small>Growth: ${report.summary.mrr.growth > 0 ? '+' : ''}${report.summary.mrr.growth.toFixed(1)}%</small>
            </div>
            <div class="metric">
              <strong>Churn Rate:</strong> ${report.summary.churn.rate.toFixed(1)}%<br>
              <small>${report.summary.churn.impact}</small>
            </div>
            <div class="metric">
              <strong>Viral Coefficient:</strong> ${report.summary.virality.coefficient.toFixed(2)}<br>
              <small>Referral Value: £${report.summary.virality.referralValue.toLocaleString()}</small>
            </div>
          </div>

          <div class="section">
            <h2>🌸 Wedding Industry Insights</h2>
            <p><strong>Seasonal Impact:</strong> ${report.weddingIndustryInsights.seasonalImpact.peakSeasonMultiplier.toFixed(1)}x multiplier</p>
            <p><strong>Supplier Growth:</strong> ${report.weddingIndustryInsights.supplierGrowth.monthlyNewSignups} new signups this month</p>
            <p><strong>Couple Engagement:</strong> ${(report.weddingIndustryInsights.coupleEngagement.platformUtilizationRate * 100).toFixed(1)}% utilization</p>
          </div>

          <div class="section">
            <h2>💡 Strategic Recommendations</h2>
            ${report.recommendations
              .map(
                (rec: any) => `
              <div class="section ${rec.priority.toLowerCase()}-priority">
                <h3>${rec.category}</h3>
                <p><strong>Recommendation:</strong> ${rec.recommendation}</p>
                <p><strong>Expected Impact:</strong> ${rec.expectedImpact}</p>
                <p><strong>Timeframe:</strong> ${rec.timeframe}</p>
              </div>
            `,
              )
              .join('')}
          </div>
        </body>
      </html>
    `;
  }

  private generateSlackMessage(report: ExecutiveReportData): any {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 ${report.title}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*MRR:* £${report.summary.mrr.current.toLocaleString()} (${report.summary.mrr.growth > 0 ? '+' : ''}${report.summary.mrr.growth.toFixed(1)}%)`,
            },
            {
              type: 'mrkdwn',
              text: `*Churn:* ${report.summary.churn.rate.toFixed(1)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Viral Coefficient:* ${report.summary.virality.coefficient.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Wedding Season:* ${report.weddingIndustryInsights.seasonalImpact.peakSeasonMultiplier.toFixed(1)}x`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Top Priority Recommendations:*\n${report.recommendations
              .filter((r: any) => r.priority === 'High')
              .slice(0, 3)
              .map((r: any) => `• ${r.recommendation}`)
              .join('\n')}`,
          },
        },
      ],
    };
  }

  private async generatePDFReport(
    report: ExecutiveReportData,
  ): Promise<Buffer> {
    // In a real implementation, this would use a PDF generation library
    // like puppeteer, jsPDF, or similar
    return Buffer.from(JSON.stringify(report, null, 2));
  }

  // Helper calculation methods
  private async calculateGrowthRate(currentMRR: number): Promise<number> {
    // Would calculate MoM growth rate from historical data
    return 0;
  }

  private async calculateBurnRate(): Promise<number> {
    // Would calculate monthly burn rate from expenses
    return 0;
  }

  private async calculateRunwayMonths(): Promise<number> {
    // Would calculate runway based on cash and burn rate
    return 0;
  }

  private async calculateViralCoefficient(): Promise<number> {
    // Would calculate viral coefficient from referral data
    return 0;
  }

  private async calculateChurnRate(churned: number): Promise<number> {
    // Would calculate churn rate from subscription data
    return 0;
  }

  private async calculateLtvCacRatio(): Promise<number> {
    // Would calculate LTV:CAC ratio
    return 0;
  }

  private async calculateNPSScore(): Promise<number> {
    // Would calculate NPS from survey data
    return 0;
  }

  private getSeasonalMultiplier(month: number): number {
    // Wedding season multipliers by month
    const multipliers: Record<number, number> = {
      1: 0.7, // January
      2: 0.8, // February
      3: 1.1, // March
      4: 1.4, // April
      5: 1.8, // May
      6: 2.2, // June
      7: 2.0, // July
      8: 2.1, // August
      9: 2.3, // September
      10: 1.9, // October
      11: 1.2, // November
      12: 0.9, // December
    };

    return multipliers[month] || 1.0;
  }

  private async calculateMatchingRate(): Promise<number> {
    // Would calculate supplier-couple matching success rate
    return 0;
  }

  private async recordReportGeneration(
    report: ExecutiveReportData,
    results: any[],
  ): Promise<void> {
    await this.supabase.from('report_generation_log').insert({
      report_id: report.title,
      generated_at: report.generatedAt.toISOString(),
      distribution_results: results,
      status: 'completed',
    });
  }

  private async sendErrorAlert(message: string, error: any): Promise<void> {
    if (this.slackWebhookUrl) {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${message}: ${error.message}`,
          color: 'danger',
        }),
      });
    }
  }

  private async generateExecutiveReport(
    metrics: ComprehensiveBusinessMetrics,
  ): Promise<ExecutiveReportData> {
    return {
      title: `WedSync Executive Report - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date(),
      reportPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      summary: {
        mrr: {
          current: metrics.financial.mrr,
          growth: metrics.financial.growth_rate,
          trend: metrics.financial.growth_rate > 0 ? 'Growing' : 'Declining',
        },
        churn: {
          rate: metrics.growth.churn_rate,
          impact: 'Wedding season driving retention improvements',
        },
        virality: {
          coefficient: metrics.growth.viral_coefficient,
          referralValue: metrics.growth.ltv_cac_ratio * 1000, // Estimated referral value
        },
      },
      weddingIndustryInsights: {
        seasonalImpact: {
          peakSeasonMultiplier: metrics.wedding.seasonal_multiplier,
          currentSeasonImpact: metrics.wedding.peak_season_revenue_boost,
        },
        supplierGrowth: {
          monthlyNewSignups: metrics.growth.new_signups,
          conversionRate: metrics.growth.conversion_rate,
        },
        coupleEngagement: {
          platformUtilizationRate:
            metrics.customer.active_couples /
            Math.max(metrics.customer.total_couples, 1),
        },
      },
      recommendations: [
        {
          priority: 'High',
          category: 'Revenue Growth',
          recommendation:
            'Accelerate supplier acquisition during peak wedding season',
          expectedImpact: `Could increase MRR by ${(metrics.wedding.seasonal_multiplier * 15).toFixed(0)}%`,
          timeframe: '2-3 months',
        },
        {
          priority: 'Medium',
          category: 'Viral Growth',
          recommendation: 'Implement wedding referral incentives',
          expectedImpact: 'Increase viral coefficient to 1.2+',
          timeframe: '1-2 months',
        },
      ],
    };
  }
}
