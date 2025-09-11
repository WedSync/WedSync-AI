/**
 * WS-221: Branding Customization - Brand Monitoring System
 * Team C - Integration health monitoring for brand assets
 */

import { createClient } from '@supabase/supabase-js';

export interface BrandHealthStatus {
  organizationId: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  lastChecked: Date;
  issues: BrandHealthIssue[];
  metrics: BrandHealthMetrics;
}

export interface BrandHealthIssue {
  id: string;
  type:
    | 'asset_unavailable'
    | 'slow_loading'
    | 'invalid_format'
    | 'security_concern'
    | 'accessibility_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedAssets: string[];
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface BrandHealthMetrics {
  totalAssets: number;
  healthyAssets: number;
  unavailableAssets: number;
  slowAssets: number;
  averageLoadTime: number;
  lastFullCheck: Date;
  checksPerformed: number;
}

export interface MonitoringConfig {
  checkInterval: number; // minutes
  timeoutThreshold: number; // ms
  slowLoadThreshold: number; // ms
  enableRealTimeMonitoring: boolean;
  alertThresholds: {
    warningPercentage: number;
    criticalPercentage: number;
  };
}

export class BrandMonitor {
  private supabase: ReturnType<typeof createClient>;
  private config: MonitoringConfig;
  private healthCache: Map<string, BrandHealthStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(
    supabase: ReturnType<typeof createClient>,
    config?: Partial<MonitoringConfig>,
  ) {
    this.supabase = supabase;
    this.config = {
      checkInterval: 15, // 15 minutes
      timeoutThreshold: 30000, // 30 seconds
      slowLoadThreshold: 3000, // 3 seconds
      enableRealTimeMonitoring: true,
      alertThresholds: {
        warningPercentage: 80,
        criticalPercentage: 60,
      },
      ...config,
    };
  }

  /**
   * Start health monitoring for an organization
   */
  async startHealthCheck(organizationId: string): Promise<void> {
    if (this.isMonitoring) {
      console.warn(
        `[BrandMonitor] Already monitoring organization ${organizationId}`,
      );
      return;
    }

    try {
      // Perform initial health check
      await this.performHealthCheck(organizationId);

      // Setup periodic monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.monitoringInterval = setInterval(
          () => this.performHealthCheck(organizationId),
          this.config.checkInterval * 60 * 1000,
        );
        this.isMonitoring = true;
      }

      console.log(
        `[BrandMonitor] Health monitoring started for organization ${organizationId}`,
      );
    } catch (error) {
      console.error('[BrandMonitor] Failed to start health monitoring:', error);
    }
  }

  /**
   * Stop health monitoring
   */
  async stopHealthCheck(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[BrandMonitor] Health monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(organizationId: string): Promise<BrandHealthStatus> {
    try {
      console.log(
        `[BrandMonitor] Starting health check for organization ${organizationId}`,
      );

      // Get all brand assets for the organization
      const { data: assets, error } = await this.supabase
        .from('brand_assets')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      const issues: BrandHealthIssue[] = [];
      const metrics: BrandHealthMetrics = {
        totalAssets: assets?.length || 0,
        healthyAssets: 0,
        unavailableAssets: 0,
        slowAssets: 0,
        averageLoadTime: 0,
        lastFullCheck: new Date(),
        checksPerformed: 0,
      };

      let totalLoadTime = 0;
      let successfulChecks = 0;

      // Check each asset
      if (assets) {
        for (const asset of assets) {
          const assetHealth = await this.checkAssetHealth(asset);

          if (assetHealth.isHealthy) {
            metrics.healthyAssets++;
          }

          if (assetHealth.issues.length > 0) {
            issues.push(...assetHealth.issues);

            if (
              assetHealth.issues.some(
                (issue) => issue.type === 'asset_unavailable',
              )
            ) {
              metrics.unavailableAssets++;
            }
            if (
              assetHealth.issues.some((issue) => issue.type === 'slow_loading')
            ) {
              metrics.slowAssets++;
            }
          }

          if (assetHealth.loadTime !== undefined) {
            totalLoadTime += assetHealth.loadTime;
            successfulChecks++;
          }

          metrics.checksPerformed++;
        }
      }

      // Calculate average load time
      metrics.averageLoadTime =
        successfulChecks > 0 ? totalLoadTime / successfulChecks : 0;

      // Determine overall health
      const healthyPercentage =
        metrics.totalAssets > 0
          ? (metrics.healthyAssets / metrics.totalAssets) * 100
          : 100;

      let overallHealth: BrandHealthStatus['overallHealth'] = 'healthy';
      if (healthyPercentage < this.config.alertThresholds.criticalPercentage) {
        overallHealth = 'critical';
      } else if (
        healthyPercentage < this.config.alertThresholds.warningPercentage
      ) {
        overallHealth = 'warning';
      }

      const healthStatus: BrandHealthStatus = {
        organizationId,
        overallHealth,
        lastChecked: new Date(),
        issues,
        metrics,
      };

      // Cache the result
      this.healthCache.set(organizationId, healthStatus);

      // Store health check result
      await this.storeHealthCheckResult(healthStatus);

      // Send alerts if necessary
      if (overallHealth !== 'healthy') {
        await this.sendHealthAlert(healthStatus);
      }

      console.log(
        `[BrandMonitor] Health check completed for organization ${organizationId}: ${overallHealth}`,
      );
      return healthStatus;
    } catch (error) {
      console.error('[BrandMonitor] Health check failed:', error);

      const errorStatus: BrandHealthStatus = {
        organizationId,
        overallHealth: 'critical',
        lastChecked: new Date(),
        issues: [
          {
            id: `error-${Date.now()}`,
            type: 'security_concern',
            severity: 'critical',
            message: 'Health check system failure',
            affectedAssets: [],
            detectedAt: new Date(),
            resolved: false,
          },
        ],
        metrics: {
          totalAssets: 0,
          healthyAssets: 0,
          unavailableAssets: 0,
          slowAssets: 0,
          averageLoadTime: 0,
          lastFullCheck: new Date(),
          checksPerformed: 0,
        },
      };

      return errorStatus;
    }
  }

  /**
   * Check individual asset health
   */
  private async checkAssetHealth(asset: any): Promise<{
    isHealthy: boolean;
    issues: BrandHealthIssue[];
    loadTime?: number;
  }> {
    const issues: BrandHealthIssue[] = [];
    let loadTime: number | undefined;
    let isHealthy = true;

    try {
      // Check if asset URLs are accessible
      const urlsToCheck = [
        asset.original_url,
        asset.optimized_url,
        asset.thumbnail_url,
      ].filter((url) => url);

      for (const url of urlsToCheck) {
        const startTime = Date.now();

        try {
          const response = await fetch(url, {
            method: 'HEAD',
            timeout: this.config.timeoutThreshold,
          } as RequestInit);

          const checkLoadTime = Date.now() - startTime;
          if (!loadTime || checkLoadTime > loadTime) {
            loadTime = checkLoadTime;
          }

          if (!response.ok) {
            issues.push({
              id: `unavailable-${asset.id}-${Date.now()}`,
              type: 'asset_unavailable',
              severity: 'high',
              message: `Asset not accessible: ${url} (Status: ${response.status})`,
              affectedAssets: [asset.id],
              detectedAt: new Date(),
              resolved: false,
            });
            isHealthy = false;
          } else {
            // Check load time
            if (checkLoadTime > this.config.slowLoadThreshold) {
              issues.push({
                id: `slow-${asset.id}-${Date.now()}`,
                type: 'slow_loading',
                severity: 'medium',
                message: `Slow loading asset: ${url} (${checkLoadTime}ms)`,
                affectedAssets: [asset.id],
                detectedAt: new Date(),
                resolved: false,
              });
              isHealthy = false;
            }

            // Check content type
            const contentType = response.headers.get('content-type');
            if (contentType && !this.isValidContentType(contentType)) {
              issues.push({
                id: `format-${asset.id}-${Date.now()}`,
                type: 'invalid_format',
                severity: 'low',
                message: `Potentially invalid content type: ${contentType}`,
                affectedAssets: [asset.id],
                detectedAt: new Date(),
                resolved: false,
              });
            }

            // Check for security headers
            if (!response.headers.get('cache-control')) {
              issues.push({
                id: `security-${asset.id}-${Date.now()}`,
                type: 'security_concern',
                severity: 'low',
                message: 'Missing cache-control header',
                affectedAssets: [asset.id],
                detectedAt: new Date(),
                resolved: false,
              });
            }
          }
        } catch (fetchError) {
          issues.push({
            id: `error-${asset.id}-${Date.now()}`,
            type: 'asset_unavailable',
            severity: 'critical',
            message: `Asset fetch failed: ${url}`,
            affectedAssets: [asset.id],
            detectedAt: new Date(),
            resolved: false,
          });
          isHealthy = false;
        }
      }

      // Additional checks for asset metadata
      if (!asset.optimized_url && asset.type !== 'svg') {
        issues.push({
          id: `optimization-${asset.id}`,
          type: 'accessibility_violation',
          severity: 'low',
          message: 'Asset not optimized for web delivery',
          affectedAssets: [asset.id],
          detectedAt: new Date(),
          resolved: false,
        });
      }

      if (asset.size > 5 * 1024 * 1024) {
        // 5MB
        issues.push({
          id: `size-${asset.id}`,
          type: 'slow_loading',
          severity: 'medium',
          message: `Large asset size: ${(asset.size / 1024 / 1024).toFixed(2)}MB`,
          affectedAssets: [asset.id],
          detectedAt: new Date(),
          resolved: false,
        });
      }
    } catch (error) {
      issues.push({
        id: `check-error-${asset.id}-${Date.now()}`,
        type: 'security_concern',
        severity: 'high',
        message: `Asset health check failed: ${error}`,
        affectedAssets: [asset.id],
        detectedAt: new Date(),
        resolved: false,
      });
      isHealthy = false;
    }

    return { isHealthy, issues, loadTime };
  }

  /**
   * Store health check result in database
   */
  private async storeHealthCheckResult(
    healthStatus: BrandHealthStatus,
  ): Promise<void> {
    try {
      const healthRecord = {
        organization_id: healthStatus.organizationId,
        overall_health: healthStatus.overallHealth,
        last_checked: healthStatus.lastChecked.toISOString(),
        metrics: JSON.stringify(healthStatus.metrics),
        issues_count: healthStatus.issues.length,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('brand_health_checks')
        .insert(healthRecord);

      if (error) {
        console.error(
          '[BrandMonitor] Failed to store health check result:',
          error,
        );
      }

      // Store individual issues
      if (healthStatus.issues.length > 0) {
        const issueRecords = healthStatus.issues.map((issue) => ({
          organization_id: healthStatus.organizationId,
          issue_id: issue.id,
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
          affected_assets: JSON.stringify(issue.affectedAssets),
          detected_at: issue.detectedAt.toISOString(),
          resolved: issue.resolved,
          resolved_at: issue.resolvedAt?.toISOString(),
          created_at: new Date().toISOString(),
        }));

        const { error: issuesError } = await this.supabase
          .from('brand_health_issues')
          .insert(issueRecords);

        if (issuesError) {
          console.error(
            '[BrandMonitor] Failed to store health issues:',
            issuesError,
          );
        }
      }
    } catch (error) {
      console.error(
        '[BrandMonitor] Failed to store health check result:',
        error,
      );
    }
  }

  /**
   * Send health alert
   */
  private async sendHealthAlert(
    healthStatus: BrandHealthStatus,
  ): Promise<void> {
    try {
      // In a real implementation, this would send alerts via email/Slack/webhook
      console.warn(
        `[BrandMonitor] HEALTH ALERT for organization ${healthStatus.organizationId}:`,
      );
      console.warn(`- Overall Health: ${healthStatus.overallHealth}`);
      console.warn(`- Issues Found: ${healthStatus.issues.length}`);
      console.warn(
        `- Healthy Assets: ${healthStatus.metrics.healthyAssets}/${healthStatus.metrics.totalAssets}`,
      );

      if (healthStatus.issues.length > 0) {
        console.warn('Critical Issues:');
        healthStatus.issues
          .filter(
            (issue) =>
              issue.severity === 'critical' || issue.severity === 'high',
          )
          .forEach((issue) => console.warn(`  - ${issue.message}`));
      }

      // Store alert record
      const alertRecord = {
        organization_id: healthStatus.organizationId,
        alert_type: 'brand_health',
        severity: healthStatus.overallHealth,
        message: `Brand health status: ${healthStatus.overallHealth}`,
        data: JSON.stringify(healthStatus),
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('system_alerts')
        .insert(alertRecord);

      if (error) {
        console.error('[BrandMonitor] Failed to store alert:', error);
      }
    } catch (error) {
      console.error('[BrandMonitor] Failed to send health alert:', error);
    }
  }

  /**
   * Get current health status
   */
  async getHealthStatus(
    organizationId: string,
  ): Promise<BrandHealthStatus | null> {
    // Return cached status if available and recent
    const cached = this.healthCache.get(organizationId);
    if (cached && Date.now() - cached.lastChecked.getTime() < 5 * 60 * 1000) {
      // 5 minutes
      return cached;
    }

    // Perform new health check
    return await this.performHealthCheck(organizationId);
  }

  /**
   * Get health history
   */
  async getHealthHistory(
    organizationId: string,
    days: number = 7,
  ): Promise<BrandHealthStatus[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('brand_health_checks')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BrandMonitor] Failed to get health history:', error);
        return [];
      }

      return (
        data?.map((record) => ({
          organizationId: record.organization_id,
          overallHealth: record.overall_health,
          lastChecked: new Date(record.last_checked),
          issues: [], // Issues would need separate query
          metrics: JSON.parse(record.metrics),
        })) || []
      );
    } catch (error) {
      console.error('[BrandMonitor] Failed to get health history:', error);
      return [];
    }
  }

  /**
   * Mark issue as resolved
   */
  async resolveIssue(issueId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('brand_health_issues')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('issue_id', issueId);

      if (error) {
        console.error('[BrandMonitor] Failed to resolve issue:', error);
        return false;
      }

      console.log(`[BrandMonitor] Issue resolved: ${issueId}`);
      return true;
    } catch (error) {
      console.error('[BrandMonitor] Failed to resolve issue:', error);
      return false;
    }
  }

  /**
   * Check if content type is valid
   */
  private isValidContentType(contentType: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
    ];

    return validTypes.some((type) => contentType.toLowerCase().includes(type));
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    isMonitoring: boolean;
    checkInterval: number;
    organizationsMonitored: number;
    lastCheckTime?: Date;
  } {
    const cachedStatuses = Array.from(this.healthCache.values());
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.config.checkInterval,
      organizationsMonitored: cachedStatuses.length,
      lastCheckTime:
        cachedStatuses.length > 0
          ? new Date(
              Math.max(...cachedStatuses.map((s) => s.lastChecked.getTime())),
            )
          : undefined,
    };
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear();
    console.log('[BrandMonitor] Health cache cleared');
  }
}

export default BrandMonitor;
