/**
 * WS-222: Custom Domains System - Domain Performance Monitor
 * Team D - Performance Optimization & Mobile Optimization
 *
 * Advanced performance monitoring for custom domain routing
 */

import { EventEmitter } from 'events';
import DomainCache, { DomainResolution, CacheStats } from './DomainCache';

interface PerformanceMetrics {
  domainResolutionTime: number;
  sslHandshakeTime: number;
  firstByteTime: number;
  totalLoadTime: number;
  errorRate: number;
  throughput: number; // requests per second
  availability: number; // uptime percentage
  cacheHitRatio: number;
}

interface DomainHealthCheck {
  domain: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  sslStatus: 'valid' | 'expired' | 'invalid' | 'missing';
  httpStatus: number;
  errorMessage?: string;
  checkedAt: Date;
  location?: string; // Geographic location for mobile users
}

interface PerformanceAlert {
  id: string;
  domain: string;
  type: 'latency' | 'error_rate' | 'ssl' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  triggeredAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

interface MobilePerformanceProfile {
  connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: string;
  location?: {
    country: string;
    region: string;
    city?: string;
  };
}

class DomainPerformanceMonitor extends EventEmitter {
  private domainCache: DomainCache;
  private metrics: Map<string, PerformanceMetrics>;
  private healthChecks: Map<string, DomainHealthCheck>;
  private alerts: Map<string, PerformanceAlert>;
  private monitoringInterval?: NodeJS.Timeout;

  // Performance thresholds (mobile-optimized)
  private readonly THRESHOLDS = {
    DNS_RESOLUTION_MAX: 1000, // 1 second
    SSL_HANDSHAKE_MAX: 2000, // 2 seconds
    FIRST_BYTE_MAX: 2500, // 2.5 seconds
    TOTAL_LOAD_MAX: 5000, // 5 seconds
    ERROR_RATE_MAX: 0.05, // 5%
    AVAILABILITY_MIN: 0.99, // 99%
    CACHE_HIT_MIN: 0.8, // 80%
  };

  constructor() {
    super();
    this.domainCache = new DomainCache();
    this.metrics = new Map();
    this.healthChecks = new Map();
    this.alerts = new Map();

    this.startContinuousMonitoring();
  }

  /**
   * Monitor domain performance with mobile optimization
   */
  async monitorDomain(
    domain: string,
    profile?: MobilePerformanceProfile,
  ): Promise<DomainHealthCheck> {
    const startTime = Date.now();

    try {
      // Step 1: DNS Resolution with mobile timeout adjustments
      const dnsStartTime = Date.now();
      const resolution = await this.domainCache.resolveDomain(domain);
      const dnsTime = Date.now() - dnsStartTime;

      // Step 2: SSL Certificate Check
      const sslStartTime = Date.now();
      const sslStatus = await this.checkSSLCertificate(domain);
      const sslTime = Date.now() - sslStartTime;

      // Step 3: HTTP Response Check with mobile headers
      const httpStartTime = Date.now();
      const httpResponse = await this.performHttpCheck(domain, profile);
      const httpTime = Date.now() - httpStartTime;

      // Step 4: Calculate performance metrics
      const totalTime = Date.now() - startTime;
      const healthCheck: DomainHealthCheck = {
        domain,
        status: this.calculateHealthStatus(
          dnsTime,
          sslTime,
          httpTime,
          httpResponse.status,
        ),
        responseTime: totalTime,
        sslStatus,
        httpStatus: httpResponse.status,
        checkedAt: new Date(),
        location: profile?.location?.country,
      };

      // Step 5: Update metrics
      await this.updatePerformanceMetrics(domain, {
        domainResolutionTime: dnsTime,
        sslHandshakeTime: sslTime,
        firstByteTime: httpTime,
        totalLoadTime: totalTime,
        errorRate: httpResponse.status >= 400 ? 1 : 0,
        throughput: 1000 / totalTime, // requests per second
        availability: httpResponse.status < 500 ? 1 : 0,
        cacheHitRatio: resolution.source === 'cache' ? 1 : 0,
      });

      // Step 6: Check for performance alerts
      await this.checkPerformanceAlerts(domain);

      this.healthChecks.set(domain, healthCheck);
      this.emit('health-check-complete', healthCheck);

      return healthCheck;
    } catch (error) {
      const errorHealthCheck: DomainHealthCheck = {
        domain,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        sslStatus: 'invalid',
        httpStatus: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
        location: profile?.location?.country,
      };

      this.healthChecks.set(domain, errorHealthCheck);
      this.emit('health-check-error', errorHealthCheck);

      return errorHealthCheck;
    }
  }

  /**
   * Batch monitor multiple domains with mobile optimization
   */
  async monitorDomainsBatch(
    domains: string[],
    profile?: MobilePerformanceProfile,
  ): Promise<Map<string, DomainHealthCheck>> {
    const results = new Map<string, DomainHealthCheck>();

    // Process in mobile-friendly batches
    const batchSize =
      profile?.connectionType === '2g' || profile?.connectionType === '3g'
        ? 2
        : 5;

    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const batchPromises = batch.map((domain) =>
        this.monitorDomain(domain, profile).then((result) => ({
          domain,
          result,
        })),
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((settled) => {
          if (settled.status === 'fulfilled') {
            results.set(settled.value.domain, settled.value.result);
          }
        });
      } catch (error) {
        console.error('Batch monitoring error:', error);
      }

      // Adaptive delay based on network conditions
      if (i + batchSize < domains.length) {
        const delay = this.getAdaptiveDelay(profile);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Get comprehensive performance metrics for a domain
   */
  getDomainMetrics(domain: string): PerformanceMetrics | null {
    return this.metrics.get(domain) || null;
  }

  /**
   * Get all active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => !alert.acknowledged,
    );
  }

  /**
   * Get domain health summary
   */
  getDomainHealthSummary(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  } {
    const healthCounts = { healthy: 0, degraded: 0, unhealthy: 0, total: 0 };

    for (const healthCheck of this.healthChecks.values()) {
      healthCounts[healthCheck.status]++;
      healthCounts.total++;
    }

    return healthCounts;
  }

  /**
   * Acknowledge performance alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get mobile performance insights
   */
  getMobilePerformanceInsights(domain: string): {
    mobileOptimization: number; // Score 0-100
    recommendations: string[];
    criticalIssues: string[];
  } {
    const metrics = this.metrics.get(domain);
    if (!metrics) {
      return {
        mobileOptimization: 0,
        recommendations: ['Domain not monitored'],
        criticalIssues: ['No performance data available'],
      };
    }

    const recommendations: string[] = [];
    const criticalIssues: string[] = [];
    let score = 100;

    // DNS Resolution Performance
    if (metrics.domainResolutionTime > this.THRESHOLDS.DNS_RESOLUTION_MAX) {
      score -= 20;
      criticalIssues.push('DNS resolution too slow for mobile');
      recommendations.push('Optimize DNS server selection for mobile users');
    }

    // SSL Performance
    if (metrics.sslHandshakeTime > this.THRESHOLDS.SSL_HANDSHAKE_MAX) {
      score -= 15;
      recommendations.push('Optimize SSL certificate for mobile connections');
    }

    // Cache Performance
    if (metrics.cacheHitRatio < this.THRESHOLDS.CACHE_HIT_MIN) {
      score -= 10;
      recommendations.push(
        'Improve cache hit ratio for better mobile performance',
      );
    }

    // Error Rate
    if (metrics.errorRate > this.THRESHOLDS.ERROR_RATE_MAX) {
      score -= 25;
      criticalIssues.push('High error rate affecting mobile users');
    }

    // Total Load Time
    if (metrics.totalLoadTime > this.THRESHOLDS.TOTAL_LOAD_MAX) {
      score -= 20;
      criticalIssues.push('Total load time exceeds mobile tolerance');
      recommendations.push('Implement mobile-specific optimizations');
    }

    return {
      mobileOptimization: Math.max(0, score),
      recommendations,
      criticalIssues,
    };
  }

  // Private methods

  private async checkSSLCertificate(
    domain: string,
  ): Promise<'valid' | 'expired' | 'invalid' | 'missing'> {
    try {
      const https = await import('https');
      const { promisify } = await import('util');

      return new Promise((resolve) => {
        const options = {
          hostname: domain,
          port: 443,
          method: 'HEAD',
          timeout: 5000,
        };

        const req = https.request(options, (res) => {
          const cert = (res.connection as any)?.getPeerCertificate();
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            resolve(expiryDate > now ? 'valid' : 'expired');
          } else {
            resolve('invalid');
          }
        });

        req.on('error', () => resolve('missing'));
        req.on('timeout', () => {
          req.destroy();
          resolve('missing');
        });

        req.end();
      });
    } catch (error) {
      return 'missing';
    }
  }

  private async performHttpCheck(
    domain: string,
    profile?: MobilePerformanceProfile,
  ): Promise<{ status: number; responseTime: number }> {
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'User-Agent': this.getMobileUserAgent(profile),
      };

      // Add mobile-specific headers
      if (profile?.connectionType) {
        headers['Connection-Type'] = profile.connectionType;
      }

      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return {
        status: response.status,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 0,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private calculateHealthStatus(
    dnsTime: number,
    sslTime: number,
    httpTime: number,
    httpStatus: number,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (httpStatus === 0 || httpStatus >= 500) {
      return 'unhealthy';
    }

    if (
      dnsTime > this.THRESHOLDS.DNS_RESOLUTION_MAX ||
      sslTime > this.THRESHOLDS.SSL_HANDSHAKE_MAX ||
      httpTime > this.THRESHOLDS.FIRST_BYTE_MAX ||
      httpStatus >= 400
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async updatePerformanceMetrics(
    domain: string,
    newMetrics: PerformanceMetrics,
  ): Promise<void> {
    const existing = this.metrics.get(domain);

    if (existing) {
      // Calculate moving averages
      const weight = 0.8; // Weight for existing metrics
      const updated: PerformanceMetrics = {
        domainResolutionTime:
          existing.domainResolutionTime * weight +
          newMetrics.domainResolutionTime * (1 - weight),
        sslHandshakeTime:
          existing.sslHandshakeTime * weight +
          newMetrics.sslHandshakeTime * (1 - weight),
        firstByteTime:
          existing.firstByteTime * weight +
          newMetrics.firstByteTime * (1 - weight),
        totalLoadTime:
          existing.totalLoadTime * weight +
          newMetrics.totalLoadTime * (1 - weight),
        errorRate:
          existing.errorRate * weight + newMetrics.errorRate * (1 - weight),
        throughput:
          existing.throughput * weight + newMetrics.throughput * (1 - weight),
        availability:
          existing.availability * weight +
          newMetrics.availability * (1 - weight),
        cacheHitRatio:
          existing.cacheHitRatio * weight +
          newMetrics.cacheHitRatio * (1 - weight),
      };

      this.metrics.set(domain, updated);
    } else {
      this.metrics.set(domain, newMetrics);
    }
  }

  private async checkPerformanceAlerts(domain: string): Promise<void> {
    const metrics = this.metrics.get(domain);
    if (!metrics) return;

    // Check for latency alerts
    if (metrics.totalLoadTime > this.THRESHOLDS.TOTAL_LOAD_MAX) {
      this.createAlert(
        domain,
        'latency',
        'high',
        `Domain ${domain} exceeds maximum load time threshold`,
        metrics,
      );
    }

    // Check for error rate alerts
    if (metrics.errorRate > this.THRESHOLDS.ERROR_RATE_MAX) {
      this.createAlert(
        domain,
        'error_rate',
        'critical',
        `Domain ${domain} has high error rate`,
        metrics,
      );
    }

    // Check for availability alerts
    if (metrics.availability < this.THRESHOLDS.AVAILABILITY_MIN) {
      this.createAlert(
        domain,
        'availability',
        'critical',
        `Domain ${domain} availability below threshold`,
        metrics,
      );
    }
  }

  private createAlert(
    domain: string,
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metrics: PerformanceMetrics,
  ): void {
    const alertId = `${domain}-${type}-${Date.now()}`;
    const alert: PerformanceAlert = {
      id: alertId,
      domain,
      type,
      severity,
      message,
      metrics,
      triggeredAt: new Date(),
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);
    this.emit('performance-alert', alert);
  }

  private getMobileUserAgent(profile?: MobilePerformanceProfile): string {
    if (profile?.deviceType === 'mobile') {
      return 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
    } else if (profile?.deviceType === 'tablet') {
      return 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
    }

    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  private getAdaptiveDelay(profile?: MobilePerformanceProfile): number {
    switch (profile?.connectionType) {
      case '2g':
        return 1000; // 1 second
      case '3g':
        return 500; // 0.5 seconds
      case '4g':
      case '5g':
        return 200; // 0.2 seconds
      case 'wifi':
        return 100; // 0.1 seconds
      default:
        return 300; // 0.3 seconds
    }
  }

  private startContinuousMonitoring(): void {
    // Monitor every 5 minutes
    this.monitoringInterval = setInterval(
      async () => {
        try {
          const domains = Array.from(this.healthChecks.keys());
          if (domains.length > 0) {
            await this.monitorDomainsBatch(domains);
          }
        } catch (error) {
          console.error('Continuous monitoring error:', error);
        }
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }
}

export default DomainPerformanceMonitor;
export type {
  PerformanceMetrics,
  DomainHealthCheck,
  PerformanceAlert,
  MobilePerformanceProfile,
};
