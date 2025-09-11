/**
 * WedSync 2.0 - Cross-Environment Configuration Synchronization
 *
 * Manages configuration synchronization across development, staging, and production
 * environments with drift detection and automated alerting.
 *
 * Feature: WS-097 - Environment Management (Round 3)
 * Priority: P0 - Critical Infrastructure
 */

import { z } from 'zod';
import crypto from 'crypto';
import { EnvironmentConfig, Environment } from './environment';
import { getProductionConfig } from './production';

// Configuration Schema for synchronization
const ConfigSyncSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  timestamp: z.string().datetime(),
  version: z.string(),
  checksum: z.string(),
  configurations: z.record(z.any()),
  metadata: z.object({
    lastSyncedAt: z.string().datetime().optional(),
    syncedFrom: z.string().optional(),
    syncedBy: z.string().optional(),
  }),
});

export type ConfigSync = z.infer<typeof ConfigSyncSchema>;

// Configuration Drift Detection
export interface ConfigDrift {
  environment: Environment;
  driftedKeys: string[];
  missingKeys: string[];
  extraKeys: string[];
  valueMismatches: Array<{
    key: string;
    expected: any;
    actual: any;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
}

// Synchronization Result
export interface SyncResult {
  success: boolean;
  sourceEnv: Environment;
  targetEnv: Environment;
  syncedKeys: string[];
  failedKeys: string[];
  warnings: string[];
  errors: string[];
  timestamp: Date;
}

// Environment Promotion Configuration
export interface PromotionConfig {
  sourceEnv: Environment;
  targetEnv: Environment;
  includeSecrets: boolean;
  dryRun: boolean;
  approvalRequired: boolean;
  approvers?: string[];
  validationRules?: Array<{
    key: string;
    validator: (value: any) => boolean;
    errorMessage: string;
  }>;
}

/**
 * Cross-Environment Configuration Synchronization Manager
 */
export class EnvironmentSyncManager {
  private static instance: EnvironmentSyncManager;
  private syncHistory: Map<string, ConfigSync[]> = new Map();
  private driftAlerts: ConfigDrift[] = [];
  private webhookUrl?: string;

  private constructor() {
    this.webhookUrl = process.env.CONFIG_DRIFT_WEBHOOK_URL;
  }

  static getInstance(): EnvironmentSyncManager {
    if (!EnvironmentSyncManager.instance) {
      EnvironmentSyncManager.instance = new EnvironmentSyncManager();
    }
    return EnvironmentSyncManager.instance;
  }

  /**
   * Generate configuration checksum for integrity verification
   */
  private generateChecksum(config: any): string {
    const configString = JSON.stringify(this.sortObjectKeys(config));
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Sort object keys recursively for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    const sortedObj: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sortedObj[key] = this.sortObjectKeys(obj[key]);
      });

    return sortedObj;
  }

  /**
   * Get current configuration for an environment
   */
  async getEnvironmentConfig(environment: Environment): Promise<ConfigSync> {
    let configurations: any;

    switch (environment) {
      case 'production':
        configurations = getProductionConfig();
        break;
      case 'staging':
        // Load staging configuration
        configurations = await this.loadStagingConfig();
        break;
      case 'development':
        // Load development configuration
        configurations = await this.loadDevelopmentConfig();
        break;
    }

    const checksum = this.generateChecksum(configurations);
    const version = `${environment}-${Date.now()}`;

    const configSync: ConfigSync = {
      environment,
      timestamp: new Date().toISOString(),
      version,
      checksum,
      configurations,
      metadata: {},
    };

    // Store in history
    const history = this.syncHistory.get(environment) || [];
    history.push(configSync);
    if (history.length > 100) {
      history.shift(); // Keep only last 100 entries
    }
    this.syncHistory.set(environment, history);

    return configSync;
  }

  /**
   * Detect configuration drift between environments
   */
  async detectDrift(
    sourceEnv: Environment,
    targetEnv: Environment,
  ): Promise<ConfigDrift | null> {
    const sourceConfig = await this.getEnvironmentConfig(sourceEnv);
    const targetConfig = await this.getEnvironmentConfig(targetEnv);

    const sourceKeys = this.extractKeys(sourceConfig.configurations);
    const targetKeys = this.extractKeys(targetConfig.configurations);

    const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));
    const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));
    const commonKeys = sourceKeys.filter((key) => targetKeys.includes(key));

    const valueMismatches: ConfigDrift['valueMismatches'] = [];

    for (const key of commonKeys) {
      const sourceValue = this.getValueByPath(sourceConfig.configurations, key);
      const targetValue = this.getValueByPath(targetConfig.configurations, key);

      if (!this.areValuesEqual(sourceValue, targetValue)) {
        valueMismatches.push({
          key,
          expected: sourceValue,
          actual: targetValue,
        });
      }
    }

    const driftedKeys = valueMismatches.map((m) => m.key);

    // No drift detected
    if (
      missingKeys.length === 0 &&
      extraKeys.length === 0 &&
      driftedKeys.length === 0
    ) {
      return null;
    }

    // Calculate severity
    let severity: ConfigDrift['severity'] = 'low';

    if (driftedKeys.some((key) => this.isCriticalKey(key))) {
      severity = 'critical';
    } else if (missingKeys.length > 5 || valueMismatches.length > 10) {
      severity = 'high';
    } else if (missingKeys.length > 2 || valueMismatches.length > 5) {
      severity = 'medium';
    }

    const drift: ConfigDrift = {
      environment: targetEnv,
      driftedKeys,
      missingKeys,
      extraKeys,
      valueMismatches,
      severity,
      detectedAt: new Date(),
    };

    // Store and alert
    this.driftAlerts.push(drift);
    await this.alertOnDrift(drift);

    return drift;
  }

  /**
   * Synchronize configuration from source to target environment
   */
  async syncEnvironments(
    sourceEnv: Environment,
    targetEnv: Environment,
    options: Partial<PromotionConfig> = {},
  ): Promise<SyncResult> {
    const config: PromotionConfig = {
      sourceEnv,
      targetEnv,
      includeSecrets: false,
      dryRun: false,
      approvalRequired: false,
      ...options,
    };

    const result: SyncResult = {
      success: false,
      sourceEnv,
      targetEnv,
      syncedKeys: [],
      failedKeys: [],
      warnings: [],
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Check for approval if required
      if (config.approvalRequired && !config.dryRun) {
        const approved = await this.requestApproval(config);
        if (!approved) {
          result.errors.push('Synchronization approval denied');
          return result;
        }
      }

      const sourceConfig = await this.getEnvironmentConfig(sourceEnv);
      const targetConfig = await this.getEnvironmentConfig(targetEnv);

      const keysToSync = this.extractKeys(sourceConfig.configurations);

      for (const key of keysToSync) {
        try {
          // Skip secrets if not included
          if (!config.includeSecrets && this.isSecretKey(key)) {
            result.warnings.push(`Skipped secret key: ${key}`);
            continue;
          }

          // Validate if rules provided
          if (config.validationRules) {
            const rule = config.validationRules.find((r) => r.key === key);
            if (rule) {
              const value = this.getValueByPath(
                sourceConfig.configurations,
                key,
              );
              if (!rule.validator(value)) {
                result.failedKeys.push(key);
                result.errors.push(
                  `Validation failed for ${key}: ${rule.errorMessage}`,
                );
                continue;
              }
            }
          }

          if (config.dryRun) {
            result.syncedKeys.push(key);
            result.warnings.push(`[DRY RUN] Would sync: ${key}`);
          } else {
            // Actual sync would happen here
            await this.syncConfigKey(key, sourceConfig, targetConfig);
            result.syncedKeys.push(key);
          }
        } catch (error) {
          result.failedKeys.push(key);
          result.errors.push(`Failed to sync ${key}: ${error}`);
        }
      }

      result.success = result.failedKeys.length === 0;

      // Update metadata
      if (result.success && !config.dryRun) {
        targetConfig.metadata.lastSyncedAt = new Date().toISOString();
        targetConfig.metadata.syncedFrom = sourceEnv;
        targetConfig.metadata.syncedBy = process.env.USER || 'system';
      }
    } catch (error) {
      result.errors.push(`Synchronization failed: ${error}`);
    }

    return result;
  }

  /**
   * Promote configuration through environments
   */
  async promoteConfiguration(promotion: PromotionConfig): Promise<SyncResult> {
    // Validate promotion path
    const validPaths = [
      { from: 'development', to: 'staging' },
      { from: 'staging', to: 'production' },
    ];

    const isValidPath = validPaths.some(
      (path) =>
        path.from === promotion.sourceEnv && path.to === promotion.targetEnv,
    );

    if (!isValidPath) {
      return {
        success: false,
        sourceEnv: promotion.sourceEnv,
        targetEnv: promotion.targetEnv,
        syncedKeys: [],
        failedKeys: [],
        warnings: [],
        errors: [
          `Invalid promotion path: ${promotion.sourceEnv} -> ${promotion.targetEnv}`,
        ],
        timestamp: new Date(),
      };
    }

    // Perform drift detection before promotion
    const drift = await this.detectDrift(
      promotion.sourceEnv,
      promotion.targetEnv,
    );

    if (drift && drift.severity === 'critical') {
      return {
        success: false,
        sourceEnv: promotion.sourceEnv,
        targetEnv: promotion.targetEnv,
        syncedKeys: [],
        failedKeys: [],
        warnings: [`Critical drift detected: ${drift.driftedKeys.join(', ')}`],
        errors: ['Cannot promote with critical drift present'],
        timestamp: new Date(),
      };
    }

    // Proceed with synchronization
    return await this.syncEnvironments(
      promotion.sourceEnv,
      promotion.targetEnv,
      promotion,
    );
  }

  /**
   * Auto-heal configuration drift
   */
  async autoHealDrift(environment: Environment): Promise<boolean> {
    const sourceEnv = environment === 'production' ? 'staging' : 'development';
    const drift = await this.detectDrift(sourceEnv, environment);

    if (!drift) {
      return true; // No drift to heal
    }

    if (drift.severity === 'critical') {
      // Don't auto-heal critical drift
      await this.alertOnDrift(drift);
      return false;
    }

    // Attempt to heal non-critical drift
    const result = await this.syncEnvironments(sourceEnv, environment, {
      includeSecrets: false,
      dryRun: false,
      approvalRequired: false,
    });

    return result.success;
  }

  /**
   * Monitor configuration drift continuously
   */
  async startDriftMonitoring(intervalMs: number = 300000): Promise<void> {
    setInterval(async () => {
      try {
        // Check drift between staging and production
        const prodDrift = await this.detectDrift('staging', 'production');
        if (prodDrift) {
          console.warn(
            'Configuration drift detected in production:',
            prodDrift,
          );
        }

        // Check drift between development and staging
        const stagingDrift = await this.detectDrift('development', 'staging');
        if (stagingDrift && stagingDrift.severity !== 'low') {
          console.warn(
            'Configuration drift detected in staging:',
            stagingDrift,
          );
        }
      } catch (error) {
        console.error('Drift monitoring error:', error);
      }
    }, intervalMs);
  }

  // Helper methods
  private extractKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        keys.push(...this.extractKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current[part] === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private areValuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object' && a !== null && b !== null) {
      return (
        JSON.stringify(this.sortObjectKeys(a)) ===
        JSON.stringify(this.sortObjectKeys(b))
      );
    }

    return false;
  }

  private isCriticalKey(key: string): boolean {
    const criticalPatterns = [
      /database/i,
      /secret/i,
      /key/i,
      /token/i,
      /password/i,
      /auth/i,
      /security/i,
      /payment/i,
    ];

    return criticalPatterns.some((pattern) => pattern.test(key));
  }

  private isSecretKey(key: string): boolean {
    const secretPatterns = [
      /secret/i,
      /key/i,
      /token/i,
      /password/i,
      /credential/i,
      /api_key/i,
    ];

    return secretPatterns.some((pattern) => pattern.test(key));
  }

  private async alertOnDrift(drift: ConfigDrift): Promise<void> {
    // Send webhook alert
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'configuration_drift',
            environment: drift.environment,
            severity: drift.severity,
            drift,
            timestamp: drift.detectedAt,
          }),
        });
      } catch (error) {
        console.error('Failed to send drift alert:', error);
      }
    }

    // Log drift
    console.error(`Configuration drift detected in ${drift.environment}:`, {
      severity: drift.severity,
      driftedKeys: drift.driftedKeys.length,
      missingKeys: drift.missingKeys.length,
      extraKeys: drift.extraKeys.length,
    });
  }

  private async requestApproval(config: PromotionConfig): Promise<boolean> {
    // In a real implementation, this would integrate with an approval system
    console.log(
      `Approval required for promotion: ${config.sourceEnv} -> ${config.targetEnv}`,
    );
    console.log(
      `Approvers: ${config.approvers?.join(', ') || 'None specified'}`,
    );

    // For now, return true in development, false otherwise
    return process.env.NODE_ENV === 'development';
  }

  private async syncConfigKey(
    key: string,
    sourceConfig: ConfigSync,
    targetConfig: ConfigSync,
  ): Promise<void> {
    // In a real implementation, this would update the actual configuration
    const value = this.getValueByPath(sourceConfig.configurations, key);
    console.log(
      `Syncing ${key} from ${sourceConfig.environment} to ${targetConfig.environment}`,
    );
    // Actual sync logic would go here
  }

  private async loadStagingConfig(): Promise<any> {
    // Load staging configuration
    // This would be replaced with actual staging config loading
    return {
      environment: 'staging',
      // ... staging configuration
    };
  }

  private async loadDevelopmentConfig(): Promise<any> {
    // Load development configuration
    // This would be replaced with actual development config loading
    return {
      environment: 'development',
      // ... development configuration
    };
  }

  // Public API methods
  public getDriftHistory(): ConfigDrift[] {
    return [...this.driftAlerts];
  }

  public getSyncHistory(environment?: Environment): ConfigSync[] {
    if (environment) {
      return this.syncHistory.get(environment) || [];
    }

    const allHistory: ConfigSync[] = [];
    this.syncHistory.forEach((history) => {
      allHistory.push(...history);
    });

    return allHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  public clearHistory(): void {
    this.syncHistory.clear();
    this.driftAlerts = [];
  }
}

// Export singleton instance
export const envSyncManager = EnvironmentSyncManager.getInstance();

// Export helper functions
export async function detectConfigDrift(
  source: Environment,
  target: Environment,
) {
  return await envSyncManager.detectDrift(source, target);
}

export async function syncEnvironments(
  source: Environment,
  target: Environment,
  options?: Partial<PromotionConfig>,
) {
  return await envSyncManager.syncEnvironments(source, target, options);
}

export async function promoteConfiguration(config: PromotionConfig) {
  return await envSyncManager.promoteConfiguration(config);
}

export function startDriftMonitoring(intervalMs?: number) {
  return envSyncManager.startDriftMonitoring(intervalMs);
}
