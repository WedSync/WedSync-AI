/**
 * Integration Health Monitor for Custom Domains
 *
 * Monitors health and performance of all domain-related integrations:
 * - DNS resolution health across global resolvers
 * - SSL certificate validity and performance
 * - Domain routing and load balancer health
 * - CDN performance and cache hit rates
 * - Third-party integration health (Cloudflare, AWS, etc.)
 * - Wedding-specific performance metrics
 */

import { createClient } from '@supabase/supabase-js';
import DNSMonitor from './DNSMonitor';
import DomainRouter from './DomainRouter';
import SSLMonitor from './SSLMonitor';
import DomainConfigSync from './DomainConfigSync';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type IntegrationType =
  | 'dns'
  | 'ssl'
  | 'routing'
  | 'cdn'
  | 'sync'
  | 'api'
  | 'database';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface IntegrationHealth {
  integrationType: IntegrationType;
  domain: string;
  organizationId: string;
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  uptime: number; // Percentage over last 24h
  errorRate: number; // Percentage of failed requests
  metrics: HealthMetrics;
  issues: HealthIssue[];
}

export interface HealthMetrics {
  // DNS metrics
  dnsResolutionTime?: number;
  dnsSuccessRate?: number;
  globalPropagation?: number;

  // SSL metrics
  sslHandshakeTime?: number;
  certificateDaysLeft?: number;
  sslValidation?: boolean;

  // Routing metrics
  routingLatency?: number;
  loadBalancerHealth?: number;
  activeConnections?: number;

  // CDN metrics
  cacheHitRate?: number;
  cdnLatency?: number;
  bandwidthUsage?: number;

  // Wedding-specific metrics
  bookingFormLoadTime?: number;
  galleryLoadTime?: number;
  peakTrafficHandling?: number;
  weddingDayReliability?: number;
}

export interface HealthIssue {
  id: string;
  type: 'performance' | 'availability' | 'configuration' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  impact: string;
  resolution?: string;
  firstDetected: Date;
  lastSeen: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

export interface HealthAlert {
  id: string;
  domain: string;
  organizationId: string;
  integrationType: IntegrationType;
  priority: AlertPriority;
  title: string;
  message: string;
  recommendation: string;
  weddingImpact: string; // How this affects wedding business
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  alertThresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    uptime: number; // percentage
    sslDaysWarning: number; // days
  };
  enableWeddingDayMode: boolean;
  enablePeakSeasonMode: boolean;
  retentionDays: number;
}

export class IntegrationHealthMonitor {
  private supabase;
  private dnsMonitor: DNSMonitor;
  private domainRouter: DomainRouter;
  private sslMonitor: SSLMonitor;
  private configSync: DomainConfigSync;

  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timer | null = null;
  private healthChecks: Map<string, IntegrationHealth> = new Map();
  private activeAlerts: Map<string, HealthAlert> = new Map();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      checkInterval: 60000, // 1 minute
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 5, // 5%
        uptime: 99, // 99%
        sslDaysWarning: 30, // 30 days
      },
      enableWeddingDayMode: true,
      enablePeakSeasonMode: true,
      retentionDays: 30,
      ...config,
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    this.dnsMonitor = new DNSMonitor();
    this.domainRouter = new DomainRouter();
    this.sslMonitor = new SSLMonitor();
    this.configSync = new DomainConfigSync();

    this.startHealthMonitoring();
  }

  /**
   * Start comprehensive health monitoring
   */
  startHealthMonitoring(): void {
    if (this.monitoringInterval) return;

    this.log('Starting integration health monitoring', 'info');

    // Adjust check interval based on current conditions
    const interval = this.getAdaptiveCheckInterval();

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheckCycle();
      } catch (error) {
        this.log(`Health check cycle failed: ${error}`, 'error');
      }
    }, interval);

    // Run initial health check
    this.performHealthCheckCycle();
  }

  /**
   * Get adaptive check interval based on wedding calendar
   */
  private getAdaptiveCheckInterval(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const month = now.getMonth() + 1;

    let multiplier = 1;

    // Wedding day mode (Friday-Sunday)
    if (
      this.config.enableWeddingDayMode &&
      (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0)
    ) {
      multiplier *= 0.5; // Check twice as often
    }

    // Peak wedding season (May-September)
    if (this.config.enablePeakSeasonMode && month >= 5 && month <= 9) {
      multiplier *= 0.75; // Check 25% more often
    }

    return Math.floor(this.config.checkInterval * multiplier);
  }

  /**
   * Perform complete health check cycle
   */
  private async performHealthCheckCycle(): Promise<void> {
    try {
      this.log('Starting health check cycle', 'info');

      // Get all domains that need monitoring
      const domains = await this.getMonitoredDomains();

      if (domains.length === 0) {
        this.log('No domains found for health monitoring', 'info');
        return;
      }

      this.log(`Checking health for ${domains.length} domains`, 'info');

      // Check health for each domain and integration type
      const healthPromises = domains.map((domain) =>
        this.checkDomainHealth(domain),
      );
      const results = await Promise.allSettled(healthPromises);

      // Process results and generate alerts
      let healthyCount = 0;
      let warningCount = 0;
      let criticalCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((health) => {
            switch (health.status) {
              case 'healthy':
                healthyCount++;
                break;
              case 'warning':
                warningCount++;
                break;
              case 'critical':
                criticalCount++;
                break;
            }
          });
        } else {
          this.log(
            `Health check failed for domain ${domains[index].domain}: ${result.reason}`,
            'error',
          );
          criticalCount++;
        }
      });

      this.log(
        `Health check cycle completed: ${healthyCount} healthy, ${warningCount} warning, ${criticalCount} critical`,
        criticalCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'info',
      );

      // Cleanup old health data
      await this.cleanupOldHealthData();
    } catch (error) {
      this.log(`Health check cycle failed: ${error}`, 'error');
    }
  }

  /**
   * Check health for a specific domain across all integrations
   */
  async checkDomainHealth(domainInfo: {
    domain: string;
    organizationId: string;
  }): Promise<IntegrationHealth[]> {
    const { domain, organizationId } = domainInfo;
    const healthResults: IntegrationHealth[] = [];

    try {
      // DNS health check
      const dnsHealth = await this.checkDNSHealth(domain, organizationId);
      healthResults.push(dnsHealth);

      // SSL health check
      const sslHealth = await this.checkSSLHealth(domain, organizationId);
      healthResults.push(sslHealth);

      // Routing health check
      const routingHealth = await this.checkRoutingHealth(
        domain,
        organizationId,
      );
      healthResults.push(routingHealth);

      // CDN health check
      const cdnHealth = await this.checkCDNHealth(domain, organizationId);
      healthResults.push(cdnHealth);

      // API health check
      const apiHealth = await this.checkAPIHealth(domain, organizationId);
      healthResults.push(apiHealth);

      // Database health check
      const dbHealth = await this.checkDatabaseHealth(domain, organizationId);
      healthResults.push(dbHealth);

      // Store health results
      for (const health of healthResults) {
        await this.storeHealthResult(health);
        await this.processHealthAlerts(health);
      }

      return healthResults;
    } catch (error) {
      this.log(`Domain health check failed for ${domain}: ${error}`, 'error');
      return healthResults;
    }
  }

  /**
   * Check DNS health and performance
   */
  private async checkDNSHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Get DNS status from DNSMonitor
      const dnsStatus = await this.dnsMonitor.getMonitoringStatus(
        domain,
        organizationId,
      );
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      const metrics: HealthMetrics = {
        dnsResolutionTime: responseTime,
        dnsSuccessRate: 100,
        globalPropagation: 100,
      };

      if (dnsStatus) {
        metrics.globalPropagation = dnsStatus.propagationPercentage;

        if (dnsStatus.propagationPercentage < 90) {
          status = 'warning';
          issues.push({
            id: `${domain}-dns-propagation`,
            type: 'configuration',
            severity: 'medium',
            message: 'DNS propagation incomplete',
            details: `Only ${dnsStatus.propagationPercentage.toFixed(1)}% of DNS servers have updated records`,
            impact:
              'Some visitors may not be able to access your wedding website',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          });
        }

        if (dnsStatus.errors.length > 0) {
          status = 'critical';
          issues.push({
            id: `${domain}-dns-errors`,
            type: 'availability',
            severity: 'high',
            message: 'DNS resolution errors detected',
            details: dnsStatus.errors.join('; '),
            impact: 'Couples may not be able to access booking forms',
            resolution: 'Check DNS configuration with your provider',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          });
        }
      }

      // Calculate uptime based on recent checks
      const uptime = await this.calculateUptime(domain, 'dns', 24);

      return {
        integrationType: 'dns',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: 100 - (metrics.dnsSuccessRate || 0),
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'dns',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {
          dnsResolutionTime: Date.now() - startTime,
          dnsSuccessRate: 0,
          globalPropagation: 0,
        },
        issues: [
          {
            id: `${domain}-dns-failure`,
            type: 'availability',
            severity: 'critical',
            message: 'DNS health check failed completely',
            details: error instanceof Error ? error.message : String(error),
            impact: 'Domain may be completely inaccessible',
            resolution: 'Contact technical support immediately',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Check SSL certificate health
   */
  private async checkSSLHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Get SSL certificates from SSLMonitor
      const sslCerts =
        await this.sslMonitor.getOrganizationSSLStatus(organizationId);
      const domainCert = sslCerts.find((cert) => cert.domain === domain);

      const responseTime = Date.now() - startTime;
      let status: HealthStatus = 'healthy';

      const metrics: HealthMetrics = {
        sslHandshakeTime: responseTime,
        sslValidation: true,
      };

      if (domainCert) {
        metrics.certificateDaysLeft = domainCert.daysUntilExpiry;

        if (domainCert.status === 'expired') {
          status = 'critical';
          issues.push({
            id: `${domain}-ssl-expired`,
            type: 'security',
            severity: 'critical',
            message: 'SSL certificate has expired',
            details: `Certificate expired ${Math.abs(domainCert.daysUntilExpiry)} days ago`,
            impact: 'All HTTPS traffic is broken, booking forms will not work',
            resolution: 'Renew SSL certificate immediately',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          });
        } else if (domainCert.status === 'expiring-soon') {
          status = domainCert.daysUntilExpiry <= 7 ? 'critical' : 'warning';
          issues.push({
            id: `${domain}-ssl-expiring`,
            type: 'security',
            severity: domainCert.daysUntilExpiry <= 7 ? 'high' : 'medium',
            message: `SSL certificate expires in ${domainCert.daysUntilExpiry} days`,
            details: `Certificate expires on ${domainCert.validTo.toLocaleDateString()}`,
            impact: 'Website will become inaccessible when certificate expires',
            resolution: 'Schedule certificate renewal',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          });
        }
      } else {
        status = 'critical';
        issues.push({
          id: `${domain}-ssl-missing`,
          type: 'security',
          severity: 'critical',
          message: 'No SSL certificate found',
          details: 'Domain does not have an SSL certificate configured',
          impact: 'Website will show as insecure, no HTTPS available',
          resolution: 'Configure SSL certificate for this domain',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      const uptime = await this.calculateUptime(domain, 'ssl', 24);

      return {
        integrationType: 'ssl',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: status === 'healthy' ? 0 : 100,
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'ssl',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {
          sslHandshakeTime: Date.now() - startTime,
          sslValidation: false,
        },
        issues: [
          {
            id: `${domain}-ssl-check-failed`,
            type: 'availability',
            severity: 'critical',
            message: 'SSL health check failed',
            details: error instanceof Error ? error.message : String(error),
            impact: 'Unable to verify SSL certificate status',
            resolution: 'Contact technical support',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Check routing and load balancer health
   */
  private async checkRoutingHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Test routing through DomainRouter
      const routingResult = await this.domainRouter.routeRequest(
        domain,
        '/health-check',
      );
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      const metrics: HealthMetrics = {
        routingLatency: responseTime,
        loadBalancerHealth: 100,
        activeConnections: 0,
      };

      // Check if routing is working
      if (!routingResult.destinationUrl) {
        status = 'critical';
        issues.push({
          id: `${domain}-routing-failed`,
          type: 'configuration',
          severity: 'critical',
          message: 'Domain routing failed',
          details: 'Unable to determine destination for domain requests',
          impact: 'Website requests may not reach correct servers',
          resolution: 'Check domain routing configuration',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      // Check response time
      if (responseTime > this.config.alertThresholds.responseTime) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push({
          id: `${domain}-routing-slow`,
          type: 'performance',
          severity: responseTime > 10000 ? 'high' : 'medium',
          message: 'Slow routing response time',
          details: `Routing took ${responseTime}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
          impact: 'Visitors may experience slow page load times',
          resolution: 'Check server performance and network connectivity',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      const uptime = await this.calculateUptime(domain, 'routing', 24);

      return {
        integrationType: 'routing',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: status === 'healthy' ? 0 : issues.length > 0 ? 25 : 0,
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'routing',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {
          routingLatency: Date.now() - startTime,
          loadBalancerHealth: 0,
        },
        issues: [
          {
            id: `${domain}-routing-error`,
            type: 'availability',
            severity: 'critical',
            message: 'Routing health check failed',
            details: error instanceof Error ? error.message : String(error),
            impact: 'Domain may be completely unreachable',
            resolution: 'Contact technical support immediately',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Check CDN health and performance
   */
  private async checkCDNHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Test CDN endpoint
      const testUrl = `https://${domain}/favicon.ico`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'WedSync-HealthMonitor/1.0',
        },
      });

      const responseTime = Date.now() - startTime;
      let status: HealthStatus = 'healthy';

      const cacheHeader =
        response.headers.get('cf-cache-status') ||
        response.headers.get('x-cache') ||
        response.headers.get('x-served-by');

      const isCacheHit =
        cacheHeader &&
        (cacheHeader.includes('HIT') ||
          cacheHeader.includes('hit') ||
          cacheHeader.includes('cached'));

      const metrics: HealthMetrics = {
        cdnLatency: responseTime,
        cacheHitRate: isCacheHit ? 100 : 0,
        bandwidthUsage: 0,
      };

      if (!response.ok) {
        status = 'warning';
        issues.push({
          id: `${domain}-cdn-error`,
          type: 'availability',
          severity: 'medium',
          message: `CDN returned ${response.status} status`,
          details: `CDN health check failed with status ${response.status}`,
          impact: 'Static assets may load slowly for visitors',
          resolution: 'Check CDN configuration and origin server',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      if (responseTime > 2000) {
        status = status === 'warning' ? 'warning' : 'warning';
        issues.push({
          id: `${domain}-cdn-slow`,
          type: 'performance',
          severity: 'medium',
          message: 'CDN response time is slow',
          details: `CDN responded in ${responseTime}ms`,
          impact:
            'Images and assets may load slowly, affecting user experience',
          resolution: 'Check CDN performance and consider optimization',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      const uptime = await this.calculateUptime(domain, 'cdn', 24);

      return {
        integrationType: 'cdn',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: response.ok ? 0 : 100,
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'cdn',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {
          cdnLatency: Date.now() - startTime,
          cacheHitRate: 0,
        },
        issues: [
          {
            id: `${domain}-cdn-failed`,
            type: 'availability',
            severity: 'critical',
            message: 'CDN health check completely failed',
            details: error instanceof Error ? error.message : String(error),
            impact: 'Static assets may not load at all',
            resolution: 'Check CDN service status and configuration',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Check API health and responsiveness
   */
  private async checkAPIHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Test API endpoint
      const apiUrl = `https://${domain}/api/health`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'WedSync-HealthMonitor/1.0',
        },
      });

      const responseTime = Date.now() - startTime;
      let status: HealthStatus = response.ok ? 'healthy' : 'critical';

      const metrics: HealthMetrics = {
        bookingFormLoadTime: responseTime,
      };

      if (!response.ok) {
        issues.push({
          id: `${domain}-api-error`,
          type: 'availability',
          severity: 'high',
          message: `API returned ${response.status} error`,
          details: `API health endpoint failed with status ${response.status}`,
          impact: 'Booking forms and dynamic features may not work',
          resolution: 'Check API server status and configuration',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      if (responseTime > 3000) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push({
          id: `${domain}-api-slow`,
          type: 'performance',
          severity: 'medium',
          message: 'API response time is slow',
          details: `API responded in ${responseTime}ms`,
          impact: 'Booking forms may feel sluggish to users',
          resolution: 'Optimize API performance and database queries',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      const uptime = await this.calculateUptime(domain, 'api', 24);

      return {
        integrationType: 'api',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: response.ok ? 0 : 100,
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'api',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {
          bookingFormLoadTime: Date.now() - startTime,
        },
        issues: [
          {
            id: `${domain}-api-failed`,
            type: 'availability',
            severity: 'critical',
            message: 'API health check failed completely',
            details: error instanceof Error ? error.message : String(error),
            impact: 'All dynamic features may be broken',
            resolution: 'Check API server status immediately',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(
    domain: string,
    organizationId: string,
  ): Promise<IntegrationHealth> {
    const startTime = Date.now();
    const issues: HealthIssue[] = [];

    try {
      // Simple database health check
      const { data, error } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .single();

      const responseTime = Date.now() - startTime;
      let status: HealthStatus = error ? 'critical' : 'healthy';

      const metrics: HealthMetrics = {};

      if (error) {
        issues.push({
          id: `${domain}-db-error`,
          type: 'availability',
          severity: 'critical',
          message: 'Database connection failed',
          details: error.message,
          impact: 'All data operations will fail',
          resolution: 'Check database server status and connection',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      if (responseTime > 1000) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push({
          id: `${domain}-db-slow`,
          type: 'performance',
          severity: 'medium',
          message: 'Database response time is slow',
          details: `Database query took ${responseTime}ms`,
          impact: 'Pages may load slowly, booking submissions may timeout',
          resolution: 'Check database performance and optimize queries',
          firstDetected: new Date(),
          lastSeen: new Date(),
          isResolved: false,
        });
      }

      const uptime = await this.calculateUptime(domain, 'database', 24);

      return {
        integrationType: 'database',
        domain,
        organizationId,
        status,
        responseTime,
        lastChecked: new Date(),
        uptime,
        errorRate: error ? 100 : 0,
        metrics,
        issues,
      };
    } catch (error) {
      return {
        integrationType: 'database',
        domain,
        organizationId,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        uptime: 0,
        errorRate: 100,
        metrics: {},
        issues: [
          {
            id: `${domain}-db-failed`,
            type: 'availability',
            severity: 'critical',
            message: 'Database health check failed',
            details: error instanceof Error ? error.message : String(error),
            impact: 'All database operations may be broken',
            resolution: 'Contact database administrator immediately',
            firstDetected: new Date(),
            lastSeen: new Date(),
            isResolved: false,
          },
        ],
      };
    }
  }

  /**
   * Store health result in database
   */
  private async storeHealthResult(health: IntegrationHealth): Promise<void> {
    try {
      await this.supabase.from('integration_health').upsert(
        {
          domain: health.domain,
          organization_id: health.organizationId,
          integration_type: health.integrationType,
          status: health.status,
          response_time: health.responseTime,
          last_checked: health.lastChecked.toISOString(),
          uptime: health.uptime,
          error_rate: health.errorRate,
          metrics: health.metrics,
          issues: health.issues,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'domain,organization_id,integration_type',
        },
      );

      // Store in memory cache
      const key = `${health.domain}-${health.integrationType}`;
      this.healthChecks.set(key, health);
    } catch (error) {
      this.log(`Failed to store health result: ${error}`, 'error');
    }
  }

  /**
   * Process health alerts
   */
  private async processHealthAlerts(health: IntegrationHealth): Promise<void> {
    for (const issue of health.issues) {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        await this.createHealthAlert(health, issue);
      }
    }
  }

  /**
   * Create health alert
   */
  private async createHealthAlert(
    health: IntegrationHealth,
    issue: HealthIssue,
  ): Promise<void> {
    const alert: HealthAlert = {
      id: issue.id,
      domain: health.domain,
      organizationId: health.organizationId,
      integrationType: health.integrationType,
      priority: issue.severity === 'critical' ? 'critical' : 'high',
      title: issue.message,
      message: issue.details,
      recommendation: issue.resolution || 'Contact technical support',
      weddingImpact: this.generateWeddingImpactMessage(
        health.integrationType,
        issue,
      ),
      triggeredAt: new Date(),
      acknowledged: false,
    };

    // Check if alert already exists
    if (!this.activeAlerts.has(alert.id)) {
      this.activeAlerts.set(alert.id, alert);
      await this.storeAlert(alert);
      await this.sendHealthAlert(alert);
    }
  }

  /**
   * Generate wedding-specific impact message
   */
  private generateWeddingImpactMessage(
    integrationType: IntegrationType,
    issue: HealthIssue,
  ): string {
    const baseImpacts = {
      dns: 'Couples may not be able to find your website when searching',
      ssl: 'Booking forms will show security warnings, preventing submissions',
      routing: 'Website may be slow or unreachable, losing potential clients',
      cdn: 'Photo galleries may load slowly, creating poor user experience',
      api: 'Booking forms may not work, preventing new wedding inquiries',
      database: 'Client data may not save properly, causing booking issues',
    };

    const severityAddons = {
      critical: ' This requires immediate attention to prevent business loss.',
      high: ' This should be resolved quickly to maintain professional image.',
      medium: ' This may affect client satisfaction if not addressed soon.',
      low: ' This should be monitored and resolved when convenient.',
    };

    return baseImpacts[integrationType] + severityAddons[issue.severity];
  }

  /**
   * Send health alert notification
   */
  private async sendHealthAlert(alert: HealthAlert): Promise<void> {
    // This would integrate with notification systems
    this.log(
      `ALERT [${alert.priority.toUpperCase()}]: ${alert.title} for ${alert.domain}`,
      'error',
    );

    // TODO: Integrate with email/SMS/Slack notifications
    // await notificationService.send(alert);
  }

  /**
   * Get monitored domains
   */
  private async getMonitoredDomains(): Promise<
    Array<{ domain: string; organizationId: string }>
  > {
    const { data } = await this.supabase
      .from('domain_routes')
      .select('domain, organization_id')
      .eq('is_active', true)
      .neq('domain', null);

    return data || [];
  }

  /**
   * Calculate uptime percentage for given hours
   */
  private async calculateUptime(
    domain: string,
    integrationType: IntegrationType,
    hours: number,
  ): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data } = await this.supabase
      .from('integration_health')
      .select('status')
      .eq('domain', domain)
      .eq('integration_type', integrationType)
      .gte('last_checked', since.toISOString());

    if (!data || data.length === 0) return 100;

    const healthyCount = data.filter(
      (record) => record.status === 'healthy',
    ).length;
    return (healthyCount / data.length) * 100;
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: HealthAlert): Promise<void> {
    await this.supabase.from('health_alerts').upsert(
      {
        id: alert.id,
        domain: alert.domain,
        organization_id: alert.organizationId,
        integration_type: alert.integrationType,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        recommendation: alert.recommendation,
        wedding_impact: alert.weddingImpact,
        triggered_at: alert.triggeredAt.toISOString(),
        acknowledged: alert.acknowledged,
      },
      {
        onConflict: 'id',
      },
    );
  }

  /**
   * Cleanup old health data
   */
  private async cleanupOldHealthData(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays);

    await this.supabase
      .from('integration_health')
      .delete()
      .lt('last_checked', cutoff.toISOString());

    await this.supabase
      .from('health_alerts')
      .delete()
      .eq('acknowledged', true)
      .lt('triggered_at', cutoff.toISOString());
  }

  /**
   * Get health status for organization
   */
  async getOrganizationHealthStatus(
    organizationId: string,
  ): Promise<IntegrationHealth[]> {
    const { data } = await this.supabase
      .from('integration_health')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_checked', { ascending: false });

    return (data || []).map(this.mapDatabaseToHealth);
  }

  /**
   * Get active alerts for organization
   */
  async getActiveAlerts(organizationId: string): Promise<HealthAlert[]> {
    const { data } = await this.supabase
      .from('health_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('acknowledged', false)
      .order('triggered_at', { ascending: false });

    return (data || []).map(this.mapDatabaseToAlert);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.supabase
      .from('health_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);
  }

  /**
   * Database mapping functions
   */
  private mapDatabaseToHealth(data: any): IntegrationHealth {
    return {
      integrationType: data.integration_type,
      domain: data.domain,
      organizationId: data.organization_id,
      status: data.status,
      responseTime: data.response_time,
      lastChecked: new Date(data.last_checked),
      uptime: data.uptime,
      errorRate: data.error_rate,
      metrics: data.metrics || {},
      issues: data.issues || [],
    };
  }

  private mapDatabaseToAlert(data: any): HealthAlert {
    return {
      id: data.id,
      domain: data.domain,
      organizationId: data.organization_id,
      integrationType: data.integration_type,
      priority: data.priority,
      title: data.title,
      message: data.message,
      recommendation: data.recommendation,
      weddingImpact: data.wedding_impact,
      triggeredAt: new Date(data.triggered_at),
      acknowledged: data.acknowledged,
      acknowledgedBy: data.acknowledged_by,
      acknowledgedAt: data.acknowledged_at
        ? new Date(data.acknowledged_at)
        : undefined,
    };
  }

  /**
   * Logging utility
   */
  private log(
    message: string,
    level: 'info' | 'error' | 'warning' = 'info',
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[Integration-Health-Monitor ${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warning':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.healthChecks.clear();
    this.activeAlerts.clear();

    this.dnsMonitor.cleanup();
    this.domainRouter.cleanup();
    this.sslMonitor.cleanup();
    this.configSync.cleanup();

    this.log('Integration health monitor cleanup completed', 'info');
  }
}

export default IntegrationHealthMonitor;
