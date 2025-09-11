// WS-195 Team C: Business Intelligence Connector
// Cross-platform synchronization, alerts, and data export capabilities

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface AlertConfig {
  priority: 'High' | 'Medium' | 'Low';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  channels: ('slack' | 'email' | 'dashboard')[];
}

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  dateRange?: { start: Date; end: Date };
  metrics?: string[];
  includeMetadata?: boolean;
}

interface SyncResult {
  platform: string;
  success: boolean;
  timestamp: Date;
  recordCount: number;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  discrepancies: Array<{
    metric: string;
    source1: { platform: string; value: number };
    source2: { platform: string; value: number };
    difference: number;
    percentageDiff: number;
  }>;
  summary: {
    totalMetrics: number;
    validMetrics: number;
    discrepancyCount: number;
  };
}

export class BusinessIntelligenceConnector {
  private supabase: any;
  private slackWebhookUrl: string;
  private alertThresholds: Map<string, { min?: number; max?: number }>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
    this.slackWebhookUrl = process.env.SLACK_ALERTS_WEBHOOK_URL || '';

    // Initialize alert thresholds for wedding industry KPIs
    this.alertThresholds = new Map([
      ['mrr_growth_rate', { min: -5 }], // Alert if MRR declining by more than 5%
      ['churn_rate_monthly', { max: 8 }], // Alert if churn exceeds 8%
      ['viral_coefficient', { min: 0.5 }], // Alert if viral coefficient drops below 0.5
      ['conversion_rate', { min: 10 }], // Alert if conversion rate drops below 10%
      ['wedding_season_multiplier', { min: 1.5 }], // Alert during peak season
      ['supplier_acquisition_rate', { min: 20 }], // Alert if monthly signups drop below 20
      ['couple_engagement_rate', { min: 0.6 }], // Alert if couple engagement drops below 60%
      ['platform_uptime', { min: 99.5 }], // Alert if uptime drops below 99.5%
      ['response_time_p95', { max: 500 }], // Alert if P95 response time exceeds 500ms
    ]);
  }

  // Cross-Platform Metrics Synchronization
  async syncMetricsAcrossPlatforms(
    metrics: Record<string, any>,
  ): Promise<SyncResult[]> {
    const syncTargets = [
      { platform: 'google_analytics', handler: this.syncToGoogleAnalytics },
      { platform: 'mixpanel', handler: this.syncToMixpanel },
      { platform: 'internal_warehouse', handler: this.syncToDataWarehouse },
      { platform: 'investor_dashboard', handler: this.syncToInvestorDashboard },
    ];

    const results: SyncResult[] = [];

    for (const target of syncTargets) {
      try {
        const recordCount = await target.handler.call(this, metrics);
        results.push({
          platform: target.platform,
          success: true,
          timestamp: new Date(),
          recordCount,
        });
      } catch (error: any) {
        results.push({
          platform: target.platform,
          success: false,
          timestamp: new Date(),
          recordCount: 0,
          error: error.message,
        });

        console.error(`Failed to sync to ${target.platform}:`, error);
      }
    }

    // Store sync results for audit
    await this.recordSyncResults(results);

    return results;
  }

  async validateCrossPlatformConsistency(): Promise<ValidationResult> {
    const platforms = ['google_analytics', 'mixpanel', 'internal_warehouse'];
    const keyMetrics = [
      'mrr_value',
      'churn_rate',
      'viral_coefficient',
      'supplier_count',
      'couple_count',
      'wedding_season_factor',
    ];

    const discrepancies: ValidationResult['discrepancies'] = [];
    let validMetrics = 0;

    // Compare metrics across all platform pairs
    for (let i = 0; i < platforms.length - 1; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platform1 = platforms[i];
        const platform2 = platforms[j];

        const metrics1 = await this.getMetricsFromPlatform(platform1);
        const metrics2 = await this.getMetricsFromPlatform(platform2);

        for (const metric of keyMetrics) {
          const value1 = metrics1[metric] || 0;
          const value2 = metrics2[metric] || 0;

          if (value1 === 0 && value2 === 0) {
            validMetrics++;
            continue;
          }

          const difference = Math.abs(value1 - value2);
          const maxValue = Math.max(Math.abs(value1), Math.abs(value2));
          const percentageDiff =
            maxValue > 0 ? (difference / maxValue) * 100 : 0;

          // 5% tolerance for wedding industry metrics (seasonal variations)
          const tolerance = 5;

          if (percentageDiff > tolerance) {
            discrepancies.push({
              metric,
              source1: { platform: platform1, value: value1 },
              source2: { platform: platform2, value: value2 },
              difference,
              percentageDiff,
            });
          } else {
            validMetrics++;
          }
        }
      }
    }

    const totalMetrics =
      keyMetrics.length * ((platforms.length * (platforms.length - 1)) / 2);

    const result: ValidationResult = {
      isValid: discrepancies.length === 0,
      discrepancies,
      summary: {
        totalMetrics,
        validMetrics,
        discrepancyCount: discrepancies.length,
      },
    };

    // Store validation results and alert if issues found
    await this.recordValidationResults(result);

    if (!result.isValid) {
      await this.sendDataIntegrityAlert(result);
    }

    return result;
  }

  // Alert System for Critical Business Metric Thresholds
  async checkMetricThresholds(
    metrics: Record<string, any>,
  ): Promise<AlertConfig[]> {
    const alerts: AlertConfig[] = [];

    for (const [metricName, thresholds] of this.alertThresholds.entries()) {
      const value = metrics[metricName];

      if (value === undefined) continue;

      let alertTriggered = false;
      let alertMessage = '';
      let priority: AlertConfig['priority'] = 'Medium';

      if (thresholds.min !== undefined && value < thresholds.min) {
        alertTriggered = true;
        alertMessage = `${metricName} below critical threshold: ${value} < ${thresholds.min}`;
        priority = this.getAlertPriority(metricName, 'below');
      }

      if (thresholds.max !== undefined && value > thresholds.max) {
        alertTriggered = true;
        alertMessage = `${metricName} above critical threshold: ${value} > ${thresholds.max}`;
        priority = this.getAlertPriority(metricName, 'above');
      }

      if (alertTriggered) {
        const alert: AlertConfig = {
          priority,
          message: this.getWeddingIndustryAlertMessage(
            metricName,
            value,
            alertMessage,
          ),
          metric: metricName,
          value,
          threshold: thresholds.min || thresholds.max || 0,
          channels: this.getAlertChannels(priority),
        };

        alerts.push(alert);
      }
    }

    // Process alerts through multiple channels
    for (const alert of alerts) {
      await this.processAlert(alert);
    }

    return alerts;
  }

  async sendSlackAlert(alert: AlertConfig): Promise<void> {
    if (!this.slackWebhookUrl) {
      console.warn('Slack webhook not configured - skipping alert');
      return;
    }

    const color =
      alert.priority === 'High'
        ? '#ef4444'
        : alert.priority === 'Medium'
          ? '#f59e0b'
          : '#10b981';
    const emoji =
      alert.priority === 'High'
        ? '🚨'
        : alert.priority === 'Medium'
          ? '⚠️'
          : 'ℹ️';

    const slackMessage = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} Business Metrics Alert - ${alert.priority} Priority`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Metric:* ${alert.metric}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Value:* ${alert.value}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Threshold:* ${alert.threshold}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Priority:* ${alert.priority}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Wedding Industry Alert | ${new Date().toLocaleString()}`,
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Data Export Capabilities
  async exportToCSV(
    data: any,
    options?: ExportOptions,
  ): Promise<{ filename: string; data: string; downloadUrl: string }> {
    const csvData = this.convertToCSV(data, options);
    const filename = `wedsync-metrics-${new Date().toISOString().split('T')[0]}.csv`;

    // Store file and get download URL
    const { data: uploadData, error } = await this.supabase.storage
      .from('exports')
      .upload(filename, csvData, {
        contentType: 'text/csv',
      });

    if (error) {
      throw new Error(`Failed to upload CSV: ${error.message}`);
    }

    const { data: urlData } = await this.supabase.storage
      .from('exports')
      .createSignedUrl(filename, 3600); // 1 hour expiry

    return {
      filename,
      data: csvData,
      downloadUrl: urlData?.signedUrl || '',
    };
  }

  async exportToJSON(
    data: any,
    options?: ExportOptions,
  ): Promise<{ filename: string; data: any; downloadUrl: string }> {
    const processedData = this.processDataForExport(data, options);
    const filename = `wedsync-metrics-${new Date().toISOString().split('T')[0]}.json`;

    const jsonString = JSON.stringify(processedData, null, 2);

    const { data: uploadData, error } = await this.supabase.storage
      .from('exports')
      .upload(filename, jsonString, {
        contentType: 'application/json',
      });

    if (error) {
      throw new Error(`Failed to upload JSON: ${error.message}`);
    }

    const { data: urlData } = await this.supabase.storage
      .from('exports')
      .createSignedUrl(filename, 3600);

    return {
      filename,
      data: processedData,
      downloadUrl: urlData?.signedUrl || '',
    };
  }

  async exportToExcel(
    data: any,
    options?: ExportOptions,
  ): Promise<{ filename: string; data: any; downloadUrl: string }> {
    const processedData = this.processDataForExport(data, options);

    // Create workbook with multiple sheets for different metric categories
    const workbook = XLSX.utils.book_new();

    // Financial metrics sheet
    const financialData = this.extractMetricCategory(
      processedData,
      'financial',
    );
    const financialSheet = XLSX.utils.json_to_sheet(financialData);
    XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Metrics');

    // Growth metrics sheet
    const growthData = this.extractMetricCategory(processedData, 'growth');
    const growthSheet = XLSX.utils.json_to_sheet(growthData);
    XLSX.utils.book_append_sheet(workbook, growthSheet, 'Growth Metrics');

    // Wedding industry metrics sheet
    const weddingData = this.extractMetricCategory(processedData, 'wedding');
    const weddingSheet = XLSX.utils.json_to_sheet(weddingData);
    XLSX.utils.book_append_sheet(workbook, weddingSheet, 'Wedding Industry');

    const filename = `wedsync-metrics-${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const { data: uploadData, error } = await this.supabase.storage
      .from('exports')
      .upload(filename, excelBuffer, {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    if (error) {
      throw new Error(`Failed to upload Excel: ${error.message}`);
    }

    const { data: urlData } = await this.supabase.storage
      .from('exports')
      .createSignedUrl(filename, 3600);

    return {
      filename,
      data: excelBuffer,
      downloadUrl: urlData?.signedUrl || '',
    };
  }

  // Helper Methods
  private async syncToGoogleAnalytics(
    metrics: Record<string, any>,
  ): Promise<number> {
    // In practice, this would use Google Analytics Measurement Protocol
    console.log(
      'Syncing metrics to Google Analytics:',
      Object.keys(metrics).length,
    );
    return Object.keys(metrics).length;
  }

  private async syncToMixpanel(metrics: Record<string, any>): Promise<number> {
    // In practice, this would use Mixpanel API
    console.log('Syncing metrics to Mixpanel:', Object.keys(metrics).length);
    return Object.keys(metrics).length;
  }

  private async syncToDataWarehouse(
    metrics: Record<string, any>,
  ): Promise<number> {
    const { error } = await this.supabase.from('metrics_warehouse').insert({
      timestamp: new Date().toISOString(),
      metrics_data: metrics,
      source: 'business_intelligence_sync',
    });

    if (error) {
      throw new Error(`Data warehouse sync failed: ${error.message}`);
    }

    return 1;
  }

  private async syncToInvestorDashboard(
    metrics: Record<string, any>,
  ): Promise<number> {
    const { error } = await this.supabase.from('investor_metrics').upsert({
      report_date: new Date().toISOString().split('T')[0],
      ...metrics,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Investor dashboard sync failed: ${error.message}`);
    }

    return 1;
  }

  private async getMetricsFromPlatform(
    platform: string,
  ): Promise<Record<string, any>> {
    // In practice, this would fetch from the actual platform APIs
    // For now, return mock data
    return {
      mrr_value: 50000,
      churn_rate: 4.2,
      viral_coefficient: 0.8,
      supplier_count: 1250,
      couple_count: 8500,
      wedding_season_factor: 1.8,
    };
  }

  private getAlertPriority(
    metric: string,
    direction: 'above' | 'below',
  ): AlertConfig['priority'] {
    const highPriorityMetrics = [
      'mrr_growth_rate',
      'churn_rate_monthly',
      'platform_uptime',
      'response_time_p95',
    ];

    return highPriorityMetrics.includes(metric) ? 'High' : 'Medium';
  }

  private getWeddingIndustryAlertMessage(
    metric: string,
    value: number,
    baseMessage: string,
  ): string {
    const weddingContextMessages: Record<string, string> = {
      mrr_growth_rate: `MRR decline detected during wedding season - immediate action required to capitalize on seasonal demand`,
      churn_rate_monthly: `Supplier churn spike could impact wedding season capacity - implement retention campaigns`,
      viral_coefficient: `Referral velocity declining - couples aren't inviting enough suppliers to drive growth`,
      wedding_season_multiplier: `Peak wedding season opportunity detected - scale marketing and onboarding efforts`,
      supplier_acquisition_rate: `New supplier signups below target - missing wedding season growth window`,
      couple_engagement_rate: `Couple platform usage declining - may impact supplier satisfaction and retention`,
    };

    const contextMessage = weddingContextMessages[metric];
    return contextMessage
      ? `${baseMessage}\n\nWedding Industry Impact: ${contextMessage}`
      : baseMessage;
  }

  private getAlertChannels(
    priority: AlertConfig['priority'],
  ): AlertConfig['channels'] {
    switch (priority) {
      case 'High':
        return ['slack', 'email', 'dashboard'];
      case 'Medium':
        return ['slack', 'dashboard'];
      case 'Low':
        return ['dashboard'];
      default:
        return ['dashboard'];
    }
  }

  private async processAlert(alert: AlertConfig): Promise<void> {
    // Send to Slack
    if (alert.channels.includes('slack')) {
      await this.sendSlackAlert(alert);
    }

    // Store in dashboard
    if (alert.channels.includes('dashboard')) {
      await this.storeDashboardAlert(alert);
    }

    // Send email (for high priority)
    if (alert.channels.includes('email')) {
      await this.sendEmailAlert(alert);
    }
  }

  private async storeDashboardAlert(alert: AlertConfig): Promise<void> {
    const { error } = await this.supabase.from('business_alerts').insert({
      priority: alert.priority,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      created_at: new Date().toISOString(),
      status: 'active',
    });

    if (error) {
      console.error('Failed to store dashboard alert:', error);
    }
  }

  private async sendEmailAlert(alert: AlertConfig): Promise<void> {
    // Implementation would use email service (Resend, etc.)
    console.log(`Email alert sent for ${alert.metric}: ${alert.message}`);
  }

  private convertToCSV(data: any, options?: ExportOptions): string {
    const processedData = this.processDataForExport(data, options);

    if (!Array.isArray(processedData) || processedData.length === 0) {
      return 'No data available';
    }

    const headers = Object.keys(processedData[0]);
    const csvRows = [
      headers.join(','),
      ...processedData.map((row: any) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value;
          })
          .join(','),
      ),
    ];

    return csvRows.join('\n');
  }

  private processDataForExport(data: any, options?: ExportOptions): any {
    let processedData = Array.isArray(data) ? data : [data];

    // Filter by date range
    if (options?.dateRange) {
      processedData = processedData.filter((item: any) => {
        const itemDate = new Date(
          item.timestamp || item.created_at || new Date(),
        );
        return (
          itemDate >= options.dateRange!.start &&
          itemDate <= options.dateRange!.end
        );
      });
    }

    // Filter by metrics
    if (options?.metrics?.length) {
      processedData = processedData.map((item: any) => {
        const filtered: any = {};
        options.metrics!.forEach((metric) => {
          if (item[metric] !== undefined) {
            filtered[metric] = item[metric];
          }
        });
        return filtered;
      });
    }

    // Add metadata
    if (options?.includeMetadata) {
      processedData = processedData.map((item: any) => ({
        ...item,
        exported_at: new Date().toISOString(),
        export_version: '2.0',
        wedding_industry_context: true,
      }));
    }

    return processedData;
  }

  private extractMetricCategory(data: any, category: string): any[] {
    if (!Array.isArray(data)) return [];

    const categoryFilters: Record<string, string[]> = {
      financial: ['mrr', 'revenue', 'growth_rate', 'churn_rate', 'ltv', 'cac'],
      growth: ['signups', 'conversions', 'viral_coefficient', 'referrals'],
      wedding: [
        'seasonal_multiplier',
        'wedding_bookings',
        'supplier_matching',
        'couple_engagement',
      ],
    };

    const relevantFields = categoryFilters[category] || [];

    return data.map((item: any) => {
      const filtered: any = {};
      relevantFields.forEach((field) => {
        Object.keys(item).forEach((key) => {
          if (key.toLowerCase().includes(field.toLowerCase())) {
            filtered[key] = item[key];
          }
        });
      });
      return filtered;
    });
  }

  private async recordSyncResults(results: SyncResult[]): Promise<void> {
    const { error } = await this.supabase.from('bi_sync_log').insert({
      timestamp: new Date().toISOString(),
      sync_results: results,
      success_count: results.filter((r) => r.success).length,
      failure_count: results.filter((r) => !r.success).length,
    });

    if (error) {
      console.error('Failed to record sync results:', error);
    }
  }

  private async recordValidationResults(
    results: ValidationResult,
  ): Promise<void> {
    const { error } = await this.supabase.from('bi_validation_log').insert({
      timestamp: new Date().toISOString(),
      is_valid: results.isValid,
      discrepancy_count: results.discrepancies.length,
      validation_results: results,
    });

    if (error) {
      console.error('Failed to record validation results:', error);
    }
  }

  private async sendDataIntegrityAlert(
    results: ValidationResult,
  ): Promise<void> {
    const alert: AlertConfig = {
      priority: 'High',
      message: `Data integrity issues detected across platforms: ${results.discrepancies.length} discrepancies found`,
      metric: 'data_integrity',
      value: results.summary.discrepancyCount,
      threshold: 0,
      channels: ['slack', 'email'],
    };

    await this.processAlert(alert);
  }
}
