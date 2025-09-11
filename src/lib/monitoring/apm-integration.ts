/**
 * WS-339 Performance Monitoring System - APM Integration Core
 * Comprehensive APM integration service supporting multiple providers
 * Wedding-specific monitoring with critical day performance tracking
 */

import { createClient } from '@/lib/supabase/client';

// APM Provider Types
export type APMProvider =
  | 'datadog'
  | 'newrelic'
  | 'prometheus'
  | 'grafana'
  | 'custom';

export interface APMMetric {
  service_name: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'timer';
  unit?: string;
  tags?: Record<string, any>;
  wedding_context?: WeddingContext;
  apm_source: APMProvider;
  external_id?: string;
  timestamp?: Date;
}

export interface WeddingContext {
  wedding_date?: string;
  vendor_type?:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'catering'
    | 'dj'
    | 'other';
  is_wedding_day?: boolean;
  couple_names?: string;
  wedding_id?: string;
  criticality_level?: 'low' | 'medium' | 'high' | 'critical';
}

export interface APMConfiguration {
  organization_id: string;
  provider: APMProvider;
  name: string;
  config: {
    api_key?: string;
    app_key?: string;
    license_key?: string;
    endpoint?: string;
    [key: string]: any;
  };
  wedding_day_alerts_enabled: boolean;
  emergency_contact_override?: {
    slack_webhook?: string;
    email?: string[];
    phone?: string[];
  };
  is_active: boolean;
}

export class APMIntegrationService {
  private supabase = createClient();
  private configurations: Map<string, APMConfiguration> = new Map();

  constructor() {
    this.loadConfigurations();
  }

  /**
   * Load APM configurations from database
   */
  private async loadConfigurations() {
    const { data: configs } = await this.supabase
      .from('apm_configurations')
      .select('*')
      .eq('is_active', true);

    if (configs) {
      configs.forEach((config) => {
        const key = `${config.organization_id}-${config.provider}`;
        this.configurations.set(key, config);
      });
    }
  }

  /**
   * Get APM configuration for organization and provider
   */
  private getConfiguration(
    organizationId: string,
    provider: APMProvider,
  ): APMConfiguration | null {
    const key = `${organizationId}-${provider}`;
    return this.configurations.get(key) || null;
  }

  /**
   * Track wedding-specific form submission performance
   */
  async trackWeddingFormPerformance(
    organizationId: string,
    formData: {
      formType: string;
      formId: string;
      clientName?: string;
      weddingDate?: string;
      responseTime: number;
      success: boolean;
      errorMessage?: string;
    },
  ) {
    const startTime = performance.now();

    try {
      // Determine if this is a wedding day
      const isWeddingDay =
        formData.weddingDate &&
        new Date(formData.weddingDate).toDateString() ===
          new Date().toDateString();

      const weddingContext: WeddingContext = {
        wedding_date: formData.weddingDate,
        vendor_type: await this.getVendorType(organizationId),
        is_wedding_day: isWeddingDay,
        couple_names: formData.clientName,
        criticality_level: isWeddingDay ? 'critical' : 'medium',
      };

      const metric: APMMetric = {
        service_name: 'wedding_forms',
        metric_name: 'form_submission_time',
        metric_value: formData.responseTime,
        metric_type: 'timer',
        unit: 'ms',
        tags: {
          form_type: formData.formType,
          form_id: formData.formId,
          success: formData.success,
          error_message: formData.errorMessage || null,
        },
        wedding_context: weddingContext,
        apm_source: 'custom',
      };

      // Send to all configured APM providers
      await this.sendToAPMProviders(organizationId, metric);

      // Store in our database
      await this.storeMetric(organizationId, metric);

      // Check for alert conditions
      await this.checkAlertThresholds(organizationId, metric);

      return { success: true, responseTime: formData.responseTime };
    } catch (error) {
      console.error('Wedding form performance tracking error:', error);
      throw error;
    }
  }

  /**
   * Track wedding photo upload performance
   */
  async trackPhotoUploadPerformance(
    organizationId: string,
    uploadData: {
      fileSize: number;
      uploadTime: number;
      weddingDate?: string;
      clientName?: string;
      success: boolean;
      cdn_region?: string;
    },
  ) {
    const weddingContext: WeddingContext = {
      wedding_date: uploadData.weddingDate,
      vendor_type: 'photographer',
      is_wedding_day:
        uploadData.weddingDate &&
        new Date(uploadData.weddingDate).toDateString() ===
          new Date().toDateString(),
      couple_names: uploadData.clientName,
      criticality_level: 'high', // Photo uploads are always high priority
    };

    const metric: APMMetric = {
      service_name: 'wedding_photos',
      metric_name: 'photo_upload_time',
      metric_value: uploadData.uploadTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        file_size_mb: Math.round(uploadData.fileSize / 1024 / 1024),
        success: uploadData.success,
        cdn_region: uploadData.cdn_region || 'unknown',
        file_size_tier: this.getFileSizeTier(uploadData.fileSize),
      },
      wedding_context: weddingContext,
      amp_source: 'custom',
    };

    await this.sendToAPMProviders(organizationId, metric);
    await this.storeMetric(organizationId, metric);
    await this.checkAlertThresholds(organizationId, metric);
  }

  /**
   * Track payment processing performance
   */
  async trackPaymentProcessing(
    organizationId: string,
    paymentData: {
      amount: number;
      processingTime: number;
      success: boolean;
      provider: 'stripe' | 'square' | 'paypal';
      weddingDate?: string;
      clientName?: string;
    },
  ) {
    const weddingContext: WeddingContext = {
      wedding_date: paymentData.weddingDate,
      vendor_type: await this.getVendorType(organizationId),
      is_wedding_day:
        paymentData.weddingDate &&
        new Date(paymentData.weddingDate).toDateString() ===
          new Date().toDateString(),
      couple_names: paymentData.clientName,
      criticality_level: 'critical', // Payments are always critical
    };

    const metric: APMMetric = {
      service_name: 'wedding_payments',
      metric_name: 'payment_processing_time',
      metric_value: paymentData.processingTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        amount_tier: this.getAmountTier(paymentData.amount),
        provider: paymentData.provider,
        success: paymentData.success,
        currency: 'GBP',
      },
      wedding_context: weddingContext,
      apm_source: 'custom',
    };

    await this.sendToAPMProviders(organizationId, metric);
    await this.storeMetric(organizationId, metric);
    await this.checkAlertThresholds(organizationId, metric);
  }

  /**
   * Track client communication performance
   */
  async trackClientCommunication(
    organizationId: string,
    communicationData: {
      type: 'email' | 'sms' | 'call';
      responseTime: number;
      success: boolean;
      weddingDate?: string;
      clientName?: string;
      urgency: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    const weddingContext: WeddingContext = {
      wedding_date: communicationData.weddingDate,
      vendor_type: await this.getVendorType(organizationId),
      is_wedding_day:
        communicationData.weddingDate &&
        new Date(communicationData.weddingDate).toDateString() ===
          new Date().toDateString(),
      couple_names: communicationData.clientName,
      criticality_level: this.getCommunicationCriticality(
        communicationData.urgency,
        communicationData.weddingDate,
      ),
    };

    const metric: APMMetric = {
      service_name: 'client_communications',
      metric_name: 'communication_response_time',
      metric_value: communicationData.responseTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        communication_type: communicationData.type,
        urgency: communicationData.urgency,
        success: communicationData.success,
      },
      wedding_context: weddingContext,
      apm_source: 'custom',
    };

    await this.sendToAPMProviders(organizationId, metric);
    await this.storeMetric(organizationId, metric);
    await this.checkAlertThresholds(organizationId, metric);
  }

  /**
   * Send metrics to configured APM providers
   */
  private async sendToAPMProviders(organizationId: string, metric: APMMetric) {
    const providers: APMProvider[] = ['datadog', 'newrelic', 'prometheus'];

    await Promise.allSettled(
      providers.map(async (provider) => {
        const config = this.getConfiguration(organizationId, provider);
        if (!config) return;

        try {
          switch (provider) {
            case 'datadog':
              await this.sendToDatadog(config, metric);
              break;
            case 'newrelic':
              await this.sendToNewRelic(config, metric);
              break;
            case 'prometheus':
              await this.sendToPrometheus(config, metric);
              break;
          }
        } catch (error) {
          console.error(`Failed to send metric to ${provider}:`, error);
        }
      }),
    );
  }

  /**
   * Send metric to Datadog
   */
  private async sendToDatadog(config: APMConfiguration, metric: APMMetric) {
    if (!config.config.api_key) return;

    const payload = {
      series: [
        {
          metric: `wedsync.${metric.service_name}.${metric.metric_name}`,
          points: [[Math.floor(Date.now() / 1000), metric.metric_value]],
          type: this.mapMetricTypeToDatadog(metric.metric_type),
          host: 'wedsync-prod',
          tags: [
            `service:${metric.service_name}`,
            `organization:${config.organization_id}`,
            ...(metric.wedding_context?.is_wedding_day
              ? ['wedding_day:true']
              : []),
            ...(metric.wedding_context?.vendor_type
              ? [`vendor:${metric.wedding_context.vendor_type}`]
              : []),
            ...(metric.wedding_context?.criticality_level
              ? [`criticality:${metric.wedding_context.criticality_level}`]
              : []),
            ...Object.entries(metric.tags || {}).map(([k, v]) => `${k}:${v}`),
          ],
        },
      ],
    };

    await fetch('https://api.datadoghq.com/api/v1/series', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': config.config.api_key,
        'DD-APPLICATION-KEY': config.config.app_key || '',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send metric to New Relic
   */
  private async sendToNewRelic(config: APMConfiguration, metric: APMMetric) {
    if (!config.config.license_key) return;

    const payload = [
      {
        eventType: 'WeddingPerformanceMetric',
        service: metric.service_name,
        metric: metric.metric_name,
        value: metric.metric_value,
        unit: metric.unit,
        organizationId: config.organization_id,
        weddingDay: metric.wedding_context?.is_wedding_day || false,
        vendorType: metric.wedding_context?.vendor_type,
        criticalityLevel: metric.wedding_context?.criticality_level,
        weddingDate: metric.wedding_context?.wedding_date,
        coupleNames: metric.wedding_context?.couple_names,
        timestamp: Date.now(),
        ...metric.tags,
      },
    ];

    await fetch(
      'https://insights-collector.newrelic.com/v1/accounts/YOUR_ACCOUNT_ID/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Insert-Key': config.config.license_key,
        },
        body: JSON.stringify(payload),
      },
    );
  }

  /**
   * Send metric to Prometheus (via pushgateway)
   */
  private async sendToPrometheus(config: APMConfiguration, metric: APMMetric) {
    if (!config.config.endpoint) return;

    const metricName = `wedsync_${metric.service_name}_${metric.metric_name}`;
    const labels = {
      organization_id: config.organization_id,
      service: metric.service_name,
      wedding_day: metric.wedding_context?.is_wedding_day ? 'true' : 'false',
      vendor_type: metric.wedding_context?.vendor_type || 'unknown',
      ...metric.tags,
    };

    const labelString = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    const prometheusMetric = `# TYPE ${metricName} ${metric.metric_type}\n${metricName}{${labelString}} ${metric.metric_value}\n`;

    await fetch(
      `${config.config.endpoint}/metrics/job/wedsync/instance/${config.organization_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: prometheusMetric,
      },
    );
  }

  /**
   * Store metric in database
   */
  private async storeMetric(organizationId: string, metric: APMMetric) {
    await this.supabase.from('apm_performance_metrics').insert({
      organization_id: organizationId,
      service_name: metric.service_name,
      metric_name: metric.metric_name,
      metric_value: metric.metric_value,
      metric_type: metric.metric_type,
      unit: metric.unit,
      tags: metric.tags || {},
      wedding_context: metric.wedding_context || {},
      apm_source: metric.apm_source,
      external_id: metric.external_id,
      timestamp: metric.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Check if metric violates alert thresholds
   */
  private async checkAlertThresholds(
    organizationId: string,
    metric: APMMetric,
  ) {
    const { data: alerts } = await this.supabase
      .from('apm_performance_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!alerts) return;

    for (const alert of alerts) {
      if (this.metricMatchesPattern(metric, alert.metric_pattern)) {
        const isWeddingDay = metric.wedding_context?.is_wedding_day;
        const threshold =
          isWeddingDay && alert.wedding_day_threshold_value
            ? alert.wedding_day_threshold_value
            : alert.threshold_value;

        if (
          this.shouldTriggerAlert(
            metric.metric_value,
            threshold,
            alert.comparison_operator,
          )
        ) {
          await this.triggerAlert(organizationId, alert, metric, threshold);
        }
      }
    }
  }

  /**
   * Helper functions
   */
  private async getVendorType(
    organizationId: string,
  ): Promise<WeddingContext['vendor_type']> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('industry')
      .eq('id', organizationId)
      .single();

    // Map organization industry to vendor type
    const industryMapping: Record<string, WeddingContext['vendor_type']> = {
      photography: 'photographer',
      venue: 'venue',
      flowers: 'florist',
      catering: 'catering',
      entertainment: 'dj',
    };

    return industryMapping[org?.industry?.toLowerCase()] || 'other';
  }

  private getFileSizeTier(fileSize: number): string {
    const mb = fileSize / 1024 / 1024;
    if (mb < 1) return 'small';
    if (mb < 10) return 'medium';
    if (mb < 50) return 'large';
    return 'xl';
  }

  private getAmountTier(amount: number): string {
    if (amount < 5000) return 'small'; // Under £50
    if (amount < 20000) return 'medium'; // £50-£200
    if (amount < 100000) return 'large'; // £200-£1000
    return 'enterprise'; // £1000+
  }

  private getCommunicationCriticality(
    urgency: string,
    weddingDate?: string,
  ): WeddingContext['criticality_level'] {
    const isWeddingDay =
      weddingDate &&
      new Date(weddingDate).toDateString() === new Date().toDateString();

    if (isWeddingDay) return 'critical';
    if (urgency === 'urgent') return 'critical';
    if (urgency === 'high') return 'high';
    return 'medium';
  }

  private mapMetricTypeToDatadog(type: APMMetric['metric_type']): string {
    const mapping = {
      counter: 'count',
      gauge: 'gauge',
      histogram: 'histogram',
      summary: 'distribution',
      timer: 'histogram',
    };
    return mapping[type] || 'gauge';
  }

  private metricMatchesPattern(metric: APMMetric, pattern: string): boolean {
    const metricPath = `${metric.service_name}.${metric.metric_name}`;
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(metricPath);
  }

  private shouldTriggerAlert(
    value: number,
    threshold: number,
    operator: string,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      case 'neq':
        return value !== threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(
    organizationId: string,
    alert: any,
    metric: APMMetric,
    threshold: number,
  ) {
    // Create alert incident
    await this.supabase.from('apm_alert_incidents').insert({
      organization_id: organizationId,
      alert_id: alert.id,
      metric_value: metric.metric_value,
      threshold_value: threshold,
      severity:
        metric.wedding_context?.is_wedding_day && alert.wedding_day_severity
          ? alert.wedding_day_severity
          : alert.severity,
      was_wedding_day: metric.wedding_context?.is_wedding_day || false,
      wedding_date: metric.wedding_context?.wedding_date
        ? new Date(metric.wedding_context.wedding_date)
            .toISOString()
            .split('T')[0]
        : null,
    });

    // Send notifications (implementation would depend on notification channels)
    console.warn(`🚨 Wedding Performance Alert: ${alert.alert_name}`, {
      metric: `${metric.service_name}.${metric.metric_name}`,
      value: metric.metric_value,
      threshold,
      isWeddingDay: metric.wedding_context?.is_wedding_day,
    });
  }
}
