/**
 * WS-339 Performance Monitoring System - Service Health Monitor
 * Wedding-critical service health monitoring with automated checks
 * Monitors third-party services essential for wedding vendor operations
 */

import { createClient } from '@/lib/supabase/client';
import { APMIntegrationService } from './apm-integration';

export interface ServiceHealthCheck {
  organizationId: string;
  serviceName: string;
  serviceType:
    | 'payment'
    | 'email'
    | 'sms'
    | 'storage'
    | 'crm'
    | 'calendar'
    | 'analytics';
  endpointUrl: string;
  expectedStatusCode: number;
  timeout: number;
  weddingCritical: boolean;
  vendorFacing: boolean;
  coupleFacing: boolean;
  checkInterval: number; // minutes
  alertThresholds: {
    responseTime: number; // ms
    errorRate: number; // decimal 0-1
    availability: number; // percentage
  };
}

export interface ServiceHealthResult {
  serviceName: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'maintenance';
  responseTime: number;
  statusCode: number;
  errorMessage?: string;
  lastCheck: Date;
  availability: number;
  errorRate: number;
}

export interface WeddingCriticalServices {
  payments: ServiceHealthCheck[];
  communications: ServiceHealthCheck[];
  storage: ServiceHealthCheck[];
  integrations: ServiceHealthCheck[];
}

export class ServiceHealthMonitor {
  private supabase = createClient();
  private apmService: APMIntegrationService;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private serviceConfigs: Map<string, ServiceHealthCheck> = new Map();

  // Wedding-critical service definitions
  private readonly WEDDING_CRITICAL_SERVICES = {
    stripe: {
      name: 'stripe_payments',
      type: 'payment' as const,
      endpoint: 'https://api.stripe.com/v1/charges',
      weddingCritical: true,
      vendorFacing: true,
      coupleFacing: true,
      thresholds: { responseTime: 2000, errorRate: 0.001, availability: 99.99 },
    },
    resend: {
      name: 'resend_email',
      type: 'email' as const,
      endpoint: 'https://api.resend.com/emails',
      weddingCritical: true,
      vendorFacing: true,
      coupleFacing: true,
      thresholds: { responseTime: 3000, errorRate: 0.01, availability: 99.9 },
    },
    twilio: {
      name: 'twilio_sms',
      type: 'sms' as const,
      endpoint: 'https://api.twilio.com/2010-04-01/Accounts',
      weddingCritical: true,
      vendorFacing: false,
      coupleFacing: true,
      thresholds: { responseTime: 5000, errorRate: 0.02, availability: 99.5 },
    },
    supabase: {
      name: 'supabase_api',
      type: 'storage' as const,
      endpoint: process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
      weddingCritical: true,
      vendorFacing: true,
      coupleFacing: true,
      thresholds: { responseTime: 1000, errorRate: 0.005, availability: 99.95 },
    },
    google_calendar: {
      name: 'google_calendar',
      type: 'calendar' as const,
      endpoint: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      weddingCritical: false,
      vendorFacing: true,
      coupleFacing: false,
      thresholds: { responseTime: 3000, errorRate: 0.05, availability: 99.0 },
    },
  };

  constructor() {
    this.apmService = new APMIntegrationService();
  }

  /**
   * Initialize service health monitoring for an organization
   */
  async initializeForOrganization(organizationId: string) {
    // Load existing service configurations
    await this.loadServiceConfigurations(organizationId);

    // Set up default wedding-critical services if not configured
    await this.setupDefaultServices(organizationId);

    // Start health check intervals
    await this.startHealthChecks(organizationId);
  }

  /**
   * Load service configurations from database
   */
  private async loadServiceConfigurations(organizationId: string) {
    const { data: services } = await this.supabase
      .from('apm_service_health_status')
      .select('*')
      .eq('organization_id', organizationId);

    if (services) {
      services.forEach((service) => {
        const config: ServiceHealthCheck = {
          organizationId,
          serviceName: service.service_name,
          serviceType: service.service_type,
          endpointUrl: service.endpoint_url,
          expectedStatusCode: service.expected_status_code,
          timeout: service.timeout_seconds * 1000,
          weddingCritical: service.wedding_critical,
          vendorFacing: service.vendor_facing,
          coupleFacing: service.couple_facing,
          checkInterval: this.parseInterval(service.check_interval),
          alertThresholds: {
            responseTime: service.response_time_threshold_ms,
            errorRate: service.error_rate_threshold,
            availability: service.availability_threshold,
          },
        };

        this.serviceConfigs.set(
          `${organizationId}-${service.service_name}`,
          config,
        );
      });
    }
  }

  /**
   * Setup default wedding-critical services
   */
  private async setupDefaultServices(organizationId: string) {
    for (const [key, serviceDefault] of Object.entries(
      this.WEDDING_CRITICAL_SERVICES,
    )) {
      const configKey = `${organizationId}-${serviceDefault.name}`;

      if (!this.serviceConfigs.has(configKey)) {
        const config: ServiceHealthCheck = {
          organizationId,
          serviceName: serviceDefault.name,
          serviceType: serviceDefault.type,
          endpointUrl: serviceDefault.endpoint,
          expectedStatusCode: 200,
          timeout: 10000,
          weddingCritical: serviceDefault.weddingCritical,
          vendorFacing: serviceDefault.vendorFacing,
          coupleFacing: serviceDefault.coupleFacing,
          checkInterval: serviceDefault.weddingCritical ? 1 : 5, // 1 min for critical, 5 min for others
          alertThresholds: serviceDefault.thresholds,
        };

        // Save to database
        await this.supabase.from('apm_service_health_status').insert({
          organization_id: organizationId,
          service_name: serviceDefault.name,
          service_type: serviceDefault.type,
          endpoint_url: serviceDefault.endpoint,
          wedding_critical: serviceDefault.weddingCritical,
          vendor_facing: serviceDefault.vendorFacing,
          couple_facing: serviceDefault.coupleFacing,
          check_interval: `${config.checkInterval} minutes`,
          timeout_seconds: 10,
          expected_status_code: 200,
          response_time_threshold_ms: serviceDefault.thresholds.responseTime,
          error_rate_threshold: serviceDefault.thresholds.errorRate,
          availability_threshold: serviceDefault.thresholds.availability,
        });

        this.serviceConfigs.set(configKey, config);
      }
    }
  }

  /**
   * Start health check intervals for all services
   */
  private async startHealthChecks(organizationId: string) {
    const orgServices = Array.from(this.serviceConfigs.entries())
      .filter(([key]) => key.startsWith(organizationId))
      .map(([_, config]) => config);

    for (const config of orgServices) {
      this.startServiceHealthCheck(config);
    }
  }

  /**
   * Start health check for a specific service
   */
  private startServiceHealthCheck(config: ServiceHealthCheck) {
    const intervalKey = `${config.organizationId}-${config.serviceName}`;

    // Clear existing interval if any
    const existingInterval = this.healthCheckIntervals.get(intervalKey);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Perform initial check
    this.performHealthCheck(config);

    // Set up recurring checks
    const interval = setInterval(
      () => {
        this.performHealthCheck(config);
      },
      config.checkInterval * 60 * 1000,
    ); // Convert minutes to milliseconds

    this.healthCheckIntervals.set(intervalKey, interval);
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(
    config: ServiceHealthCheck,
  ): Promise<ServiceHealthResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.endpointUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WedSync-HealthChecker/1.0',
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const result: ServiceHealthResult = {
        serviceName: config.serviceName,
        status: this.calculateHealthStatus(
          response.status,
          responseTime,
          config,
        ),
        responseTime,
        statusCode: response.status,
        lastCheck: new Date(),
        availability: 0, // Will be calculated from history
        errorRate: 0, // Will be calculated from history
      };

      // Update database and calculate availability
      await this.updateServiceHealth(config, result);

      // Track in APM system
      await this.trackServiceHealth(config, result);

      // Check alert conditions
      await this.checkServiceAlerts(config, result);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const result: ServiceHealthResult = {
        serviceName: config.serviceName,
        status: 'critical',
        responseTime,
        statusCode: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
        availability: 0,
        errorRate: 1,
      };

      await this.updateServiceHealth(config, result);
      await this.trackServiceHealth(config, result);
      await this.checkServiceAlerts(config, result);

      return result;
    }
  }

  /**
   * Calculate health status based on response
   */
  private calculateHealthStatus(
    statusCode: number,
    responseTime: number,
    config: ServiceHealthCheck,
  ): ServiceHealthResult['status'] {
    // Check for maintenance mode indicators
    if (statusCode === 503) return 'maintenance';

    // Critical errors
    if (statusCode >= 500 || statusCode === 0) return 'critical';

    // Client errors (but service is responding)
    if (statusCode >= 400) return 'warning';

    // Success but slow response
    if (statusCode >= 200 && statusCode < 300) {
      if (responseTime > config.alertThresholds.responseTime * 2)
        return 'warning';
      if (responseTime > config.alertThresholds.responseTime) return 'warning';
      return 'healthy';
    }

    return 'unknown';
  }

  /**
   * Update service health in database
   */
  private async updateServiceHealth(
    config: ServiceHealthCheck,
    result: ServiceHealthResult,
  ) {
    // Calculate availability and error rates from history
    const { availability, errorRate } = await this.calculateAvailabilityMetrics(
      config.organizationId,
      config.serviceName,
    );

    result.availability = availability;
    result.errorRate = errorRate;

    // Use the database function we created
    await this.supabase.rpc('update_apm_service_health_status', {
      p_organization_id: config.organizationId,
      p_service_name: config.serviceName,
      p_status: result.status,
      p_response_time_ms: result.responseTime,
      p_error_rate: result.errorRate,
    });
  }

  /**
   * Calculate availability metrics from recent history
   */
  private async calculateAvailabilityMetrics(
    organizationId: string,
    serviceName: string,
  ) {
    // Get recent health checks (last 24 hours)
    const { data: recentChecks } = await this.supabase
      .from('apm_performance_metrics')
      .select('metric_value, tags')
      .eq('organization_id', organizationId)
      .eq('service_name', 'service_health')
      .eq('metric_name', serviceName)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (!recentChecks || recentChecks.length === 0) {
      return { availability: 100, errorRate: 0 };
    }

    const totalChecks = recentChecks.length;
    const healthyChecks = recentChecks.filter(
      (check) =>
        check.tags?.status === 'healthy' || check.tags?.status_code < 400,
    ).length;

    const availability = (healthyChecks / totalChecks) * 100;
    const errorRate = (totalChecks - healthyChecks) / totalChecks;

    return { availability, errorRate };
  }

  /**
   * Track service health in APM system
   */
  private async trackServiceHealth(
    config: ServiceHealthCheck,
    result: ServiceHealthResult,
  ) {
    // Store health check result as metric
    await this.supabase.from('apm_performance_metrics').insert({
      organization_id: config.organizationId,
      service_name: 'service_health',
      metric_name: config.serviceName,
      metric_value: result.responseTime,
      metric_type: 'gauge',
      unit: 'ms',
      tags: {
        status: result.status,
        status_code: result.statusCode,
        wedding_critical: config.weddingCritical,
        vendor_facing: config.vendorFacing,
        couple_facing: config.coupleFacing,
        service_type: config.serviceType,
        availability: result.availability,
        error_rate: result.errorRate,
      },
      wedding_context: {
        is_wedding_day: this.isWeddingDay(),
        criticality_level: config.weddingCritical ? 'critical' : 'medium',
      },
      apm_source: 'custom',
    });
  }

  /**
   * Check service alert conditions
   */
  private async checkServiceAlerts(
    config: ServiceHealthCheck,
    result: ServiceHealthResult,
  ) {
    const alerts = [];
    const isWeddingDay = this.isWeddingDay();

    // Adjust thresholds for wedding days (stricter)
    const thresholds = isWeddingDay
      ? {
          responseTime: config.alertThresholds.responseTime * 0.5, // 50% stricter
          errorRate: config.alertThresholds.errorRate * 0.1, // 90% stricter
          availability: Math.max(99.99, config.alertThresholds.availability), // At least 99.99%
        }
      : config.alertThresholds;

    // Response time alert
    if (result.responseTime > thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        value: result.responseTime,
        threshold: thresholds.responseTime,
        severity: isWeddingDay ? 'critical' : 'warning',
      });
    }

    // Status code alert
    if (result.statusCode >= 500) {
      alerts.push({
        type: 'service_error',
        value: result.statusCode,
        threshold: 500,
        severity:
          config.weddingCritical || isWeddingDay ? 'critical' : 'warning',
      });
    }

    // Availability alert
    if (result.availability < thresholds.availability) {
      alerts.push({
        type: 'availability',
        value: result.availability,
        threshold: thresholds.availability,
        severity: 'critical',
      });
    }

    // Error rate alert
    if (result.errorRate > thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        value: result.errorRate,
        threshold: thresholds.errorRate,
        severity: isWeddingDay ? 'critical' : 'warning',
      });
    }

    // Trigger alerts
    for (const alert of alerts) {
      await this.triggerServiceAlert(config, result, alert, isWeddingDay);
    }
  }

  /**
   * Trigger service health alert
   */
  private async triggerServiceAlert(
    config: ServiceHealthCheck,
    result: ServiceHealthResult,
    alert: any,
    isWeddingDay: boolean,
  ) {
    console.warn(`🚨 Service Health Alert: ${config.serviceName}`, {
      type: alert.type,
      value: alert.value,
      threshold: alert.threshold,
      severity: alert.severity,
      weddingDay: isWeddingDay,
      weddingCritical: config.weddingCritical,
    });

    // Create alert incident
    const { data: alertRule } = await this.supabase
      .from('apm_performance_alerts')
      .select('id')
      .eq('organization_id', config.organizationId)
      .eq('alert_name', `${config.serviceName}_${alert.type}`)
      .single();

    if (alertRule) {
      await this.supabase.from('apm_alert_incidents').insert({
        organization_id: config.organizationId,
        alert_id: alertRule.id,
        metric_value: alert.value,
        threshold_value: alert.threshold,
        severity: alert.severity,
        was_wedding_day: isWeddingDay,
      });
    }

    // For wedding-critical services on wedding days, escalate immediately
    if (
      (config.weddingCritical || isWeddingDay) &&
      alert.severity === 'critical'
    ) {
      await this.escalateWeddingCriticalAlert(config, result, alert);
    }
  }

  /**
   * Escalate wedding-critical alerts
   */
  private async escalateWeddingCriticalAlert(
    config: ServiceHealthCheck,
    result: ServiceHealthResult,
    alert: any,
  ) {
    console.error('🚨 WEDDING CRITICAL SERVICE ALERT 🚨', {
      service: config.serviceName,
      status: result.status,
      responseTime: result.responseTime,
      alertType: alert.type,
      value: alert.value,
      threshold: alert.threshold,
    });

    // In a real implementation, this would:
    // 1. Send to PagerDuty for immediate escalation
    // 2. Send SMS to emergency contacts
    // 3. Create Slack notification with @channel
    // 4. Potentially trigger automated failover procedures
  }

  /**
   * Public API methods
   */

  /**
   * Get current health status for all services
   */
  async getHealthStatus(
    organizationId: string,
  ): Promise<ServiceHealthResult[]> {
    const { data: services } = await this.supabase
      .from('apm_service_health_status')
      .select('*')
      .eq('organization_id', organizationId)
      .order('wedding_critical', { ascending: false })
      .order('service_name');

    if (!services) return [];

    return services.map((service) => ({
      serviceName: service.service_name,
      status: service.status,
      responseTime: service.response_time_ms || 0,
      statusCode: 200, // Would need to be tracked separately
      lastCheck: new Date(service.last_check_at),
      availability: service.availability_percentage || 0,
      errorRate: service.error_rate || 0,
    }));
  }

  /**
   * Get wedding-critical services status
   */
  async getWeddingCriticalStatus(organizationId: string): Promise<{
    allHealthy: boolean;
    criticalIssues: ServiceHealthResult[];
    weddingReadiness: number; // 0-100 score
  }> {
    const { data: criticalServices } = await this.supabase
      .from('apm_service_health_status')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('wedding_critical', true);

    if (!criticalServices) {
      return { allHealthy: false, criticalIssues: [], weddingReadiness: 0 };
    }

    const criticalIssues = criticalServices.filter(
      (service) =>
        service.status === 'critical' || service.status === 'warning',
    );

    const allHealthy = criticalIssues.length === 0;

    // Calculate wedding readiness score
    const healthyServices = criticalServices.filter(
      (s) => s.status === 'healthy',
    ).length;
    const weddingReadiness = (healthyServices / criticalServices.length) * 100;

    return {
      allHealthy,
      criticalIssues: criticalIssues.map((service) => ({
        serviceName: service.service_name,
        status: service.status,
        responseTime: service.response_time_ms || 0,
        statusCode: 200,
        lastCheck: new Date(service.last_check_at),
        availability: service.availability_percentage || 0,
        errorRate: service.error_rate || 0,
      })),
      weddingReadiness,
    };
  }

  /**
   * Manually trigger health check for a service
   */
  async manualHealthCheck(
    organizationId: string,
    serviceName: string,
  ): Promise<ServiceHealthResult> {
    const configKey = `${organizationId}-${serviceName}`;
    const config = this.serviceConfigs.get(configKey);

    if (!config) {
      throw new Error(
        `Service ${serviceName} not configured for organization ${organizationId}`,
      );
    }

    return await this.performHealthCheck(config);
  }

  /**
   * Add custom service health check
   */
  async addCustomService(
    config: Omit<ServiceHealthCheck, 'organizationId'>,
    organizationId: string,
  ) {
    const fullConfig: ServiceHealthCheck = { ...config, organizationId };

    // Save to database
    await this.supabase.from('apm_service_health_status').insert({
      organization_id: organizationId,
      service_name: config.serviceName,
      service_type: config.serviceType,
      endpoint_url: config.endpointUrl,
      wedding_critical: config.weddingCritical,
      vendor_facing: config.vendorFacing,
      couple_facing: config.coupleFacing,
      check_interval: `${config.checkInterval} minutes`,
      timeout_seconds: Math.floor(config.timeout / 1000),
      expected_status_code: config.expectedStatusCode,
      response_time_threshold_ms: config.alertThresholds.responseTime,
      error_rate_threshold: config.alertThresholds.errorRate,
      availability_threshold: config.alertThresholds.availability,
    });

    // Add to local config and start monitoring
    const configKey = `${organizationId}-${config.serviceName}`;
    this.serviceConfigs.set(configKey, fullConfig);
    this.startServiceHealthCheck(fullConfig);
  }

  /**
   * Utility methods
   */
  private isWeddingDay(): boolean {
    const today = new Date().getDay();
    return today === 6; // Saturday
  }

  private parseInterval(intervalString: string): number {
    const match = intervalString.match(/(\d+)\s*(minute|hour|day)s?/i);
    if (!match) return 5; // Default 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
        return value;
      case 'hour':
        return value * 60;
      case 'day':
        return value * 60 * 24;
      default:
        return value;
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    for (const [key, interval] of this.healthCheckIntervals) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
  }
}
