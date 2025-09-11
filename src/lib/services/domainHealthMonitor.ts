/**
 * Domain Health Monitor Service
 * Monitors domain health, SSL certificates, and performance
 */

export interface DomainHealthCheck {
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: {
    http: HealthCheckResult;
    https: HealthCheckResult;
    dns: HealthCheckResult;
    ssl: HealthCheckResult;
  };
  performance: {
    response_time_ms: number;
    dns_lookup_ms: number;
    ssl_handshake_ms: number;
  };
  last_check: string;
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface MonitoringConfig {
  domain_id: string;
  domain: string;
  interval: string;
  alerts: {
    email: boolean;
    webhook?: string;
    slack?: string;
  };
  thresholds: {
    response_time_ms: number;
    uptime_percentage: number;
    ssl_expiry_days: number;
  };
}

class DomainHealthMonitor {
  private monitoringJobs = new Map<string, NodeJS.Timeout>();

  /**
   * Perform comprehensive health check on domain
   */
  async performHealthCheck(domain: string): Promise<DomainHealthCheck> {
    const checks = {
      http: await this.checkHTTP(domain),
      https: await this.checkHTTPS(domain),
      dns: await this.checkDNS(domain),
      ssl: await this.checkSSL(domain),
    };

    // Calculate performance metrics
    const performance = {
      response_time_ms: await this.measureResponseTime(domain),
      dns_lookup_ms: await this.measureDNSLookup(domain),
      ssl_handshake_ms: await this.measureSSLHandshake(domain),
    };

    // Determine overall status
    const overall_status = this.calculateOverallStatus(checks);

    return {
      overall_status,
      checks,
      performance,
      last_check: new Date().toISOString(),
    };
  }

  /**
   * Setup monitoring job for domain
   */
  async setupMonitoringJob(
    domainId: string,
    domain: string,
    config: MonitoringConfig,
  ): Promise<void> {
    // Clear existing job if exists
    if (this.monitoringJobs.has(domainId)) {
      clearInterval(this.monitoringJobs.get(domainId)!);
    }

    // Convert interval string to milliseconds
    const intervalMs = this.parseInterval(config.interval);

    // Create monitoring job
    const job = setInterval(async () => {
      try {
        console.log(`Running health check for domain: ${domain}`);

        const healthCheck = await this.performHealthCheck(domain);

        // Store results in database
        await this.storeHealthCheckResults(domainId, healthCheck);

        // Check for alerts
        await this.checkAlerts(domainId, domain, healthCheck, config);
      } catch (error) {
        console.error(`Health monitoring error for ${domain}:`, error);
      }
    }, intervalMs);

    this.monitoringJobs.set(domainId, job);
    console.log(
      `Monitoring setup for domain ${domain} with ${config.interval} interval`,
    );
  }

  /**
   * Stop monitoring for domain
   */
  stopMonitoring(domainId: string): void {
    if (this.monitoringJobs.has(domainId)) {
      clearInterval(this.monitoringJobs.get(domainId)!);
      this.monitoringJobs.delete(domainId);
      console.log(`Monitoring stopped for domain ID: ${domainId}`);
    }
  }

  /**
   * Private health check methods
   */
  private async checkHTTP(domain: string): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`http://${domain}`, {
        method: 'HEAD',
        timeout: 10000,
        headers: { 'User-Agent': 'WedSync-HealthMonitor/1.0' },
      });

      if (response.ok || response.status === 301 || response.status === 302) {
        return {
          status: 'pass',
          message: `HTTP accessible (${response.status})`,
        };
      } else {
        return {
          status: 'warning',
          message: `HTTP returned ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `HTTP check failed: ${error.message}`,
      };
    }
  }

  private async checkHTTPS(domain: string): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        timeout: 10000,
        headers: { 'User-Agent': 'WedSync-HealthMonitor/1.0' },
      });

      if (response.ok) {
        return {
          status: 'pass',
          message: `HTTPS accessible (${response.status})`,
        };
      } else {
        return {
          status: 'warning',
          message: `HTTPS returned ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `HTTPS check failed: ${error.message}`,
      };
    }
  }

  private async checkDNS(domain: string): Promise<HealthCheckResult> {
    try {
      // Simulate DNS check (in production would use actual DNS resolution)
      const mockDNSResult = {
        resolved: true,
        records: ['185.199.108.153', '185.199.109.153'],
      };

      if (mockDNSResult.resolved) {
        return {
          status: 'pass',
          message: 'DNS resolution successful',
          details: mockDNSResult.records,
        };
      } else {
        return {
          status: 'fail',
          message: 'DNS resolution failed',
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `DNS check failed: ${error.message}`,
      };
    }
  }

  private async checkSSL(domain: string): Promise<HealthCheckResult> {
    try {
      // Simulate SSL check (in production would check actual certificate)
      const mockSSLResult = {
        valid: true,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        issuer: "Let's Encrypt",
      };

      const daysUntilExpiry = Math.floor(
        (mockSSLResult.expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (!mockSSLResult.valid) {
        return {
          status: 'fail',
          message: 'SSL certificate is invalid',
        };
      } else if (daysUntilExpiry <= 7) {
        return {
          status: 'warning',
          message: `SSL certificate expires in ${daysUntilExpiry} days`,
          details: {
            expires: mockSSLResult.expires.toISOString(),
            issuer: mockSSLResult.issuer,
          },
        };
      } else if (daysUntilExpiry <= 30) {
        return {
          status: 'warning',
          message: `SSL certificate expires in ${daysUntilExpiry} days`,
          details: {
            expires: mockSSLResult.expires.toISOString(),
            issuer: mockSSLResult.issuer,
          },
        };
      } else {
        return {
          status: 'pass',
          message: `SSL certificate valid (expires in ${daysUntilExpiry} days)`,
          details: {
            expires: mockSSLResult.expires.toISOString(),
            issuer: mockSSLResult.issuer,
          },
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `SSL check failed: ${error.message}`,
      };
    }
  }

  /**
   * Performance measurement methods
   */
  private async measureResponseTime(domain: string): Promise<number> {
    try {
      const start = Date.now();
      await fetch(`https://${domain}`, {
        method: 'HEAD',
        timeout: 10000,
      });
      return Date.now() - start;
    } catch (error) {
      return -1; // Indicate failure
    }
  }

  private async measureDNSLookup(domain: string): Promise<number> {
    try {
      // Simulate DNS lookup time (in production would measure actual DNS resolution)
      return Math.floor(Math.random() * 100) + 20; // 20-120ms
    } catch (error) {
      return -1;
    }
  }

  private async measureSSLHandshake(domain: string): Promise<number> {
    try {
      // Simulate SSL handshake time
      return Math.floor(Math.random() * 200) + 50; // 50-250ms
    } catch (error) {
      return -1;
    }
  }

  /**
   * Helper methods
   */
  private calculateOverallStatus(
    checks: DomainHealthCheck['checks'],
  ): 'healthy' | 'warning' | 'critical' | 'unknown' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.some((status) => status === 'fail')) {
      return 'critical';
    } else if (statuses.some((status) => status === 'warning')) {
      return 'warning';
    } else if (statuses.every((status) => status === 'pass')) {
      return 'healthy';
    } else {
      return 'unknown';
    }
  }

  private parseInterval(interval: string): number {
    const intervals = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };

    return intervals[interval] || intervals['30m'];
  }

  private async storeHealthCheckResults(
    domainId: string,
    healthCheck: DomainHealthCheck,
  ): Promise<void> {
    try {
      // In production, this would store results in database
      console.log(`Storing health check results for domain ${domainId}:`, {
        status: healthCheck.overall_status,
        response_time: healthCheck.performance.response_time_ms,
        timestamp: healthCheck.last_check,
      });
    } catch (error) {
      console.error('Error storing health check results:', error);
    }
  }

  private async checkAlerts(
    domainId: string,
    domain: string,
    healthCheck: DomainHealthCheck,
    config: MonitoringConfig,
  ): Promise<void> {
    const alerts: string[] = [];

    // Check response time threshold
    if (
      healthCheck.performance.response_time_ms >
      config.thresholds.response_time_ms
    ) {
      alerts.push(
        `Response time ${healthCheck.performance.response_time_ms}ms exceeds threshold ${config.thresholds.response_time_ms}ms`,
      );
    }

    // Check SSL expiry
    const sslCheck = healthCheck.checks.ssl;
    if (
      sslCheck.status === 'warning' &&
      sslCheck.message.includes('expires in')
    ) {
      const daysMatch = sslCheck.message.match(/(\d+) days/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        if (days <= config.thresholds.ssl_expiry_days) {
          alerts.push(`SSL certificate expires in ${days} days`);
        }
      }
    }

    // Check overall health
    if (healthCheck.overall_status === 'critical') {
      alerts.push(`Domain ${domain} is in critical state`);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(domain, alerts, config.alerts);
    }
  }

  private async sendAlerts(
    domain: string,
    alerts: string[],
    alertConfig: MonitoringConfig['alerts'],
  ): Promise<void> {
    const alertMessage = `Domain Alert: ${domain}\n\n${alerts.join('\n')}`;

    try {
      if (alertConfig.email) {
        console.log(`Email alert for ${domain}:`, alertMessage);
        // In production, would send email via Resend or similar service
      }

      if (alertConfig.webhook) {
        console.log(`Webhook alert for ${domain}:`, alertMessage);
        // In production, would send webhook
      }

      if (alertConfig.slack) {
        console.log(`Slack alert for ${domain}:`, alertMessage);
        // In production, would send Slack notification
      }
    } catch (error) {
      console.error('Error sending alerts:', error);
    }
  }
}

export const domainHealthMonitor = new DomainHealthMonitor();
