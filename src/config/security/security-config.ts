/**
 * WS-175 Advanced Data Encryption - Security Configuration
 * Infrastructure security settings and policies for encryption performance optimization
 */

import * as crypto from 'node:crypto';
import type {
  SecurityConfig,
  EncryptionSecurityConfig,
  CacheSecurityConfig,
  PerformanceSecurityConfig,
  ComplianceConfig,
  KeyRotationPolicy,
  ResourceLimits,
  EmergencyThresholds,
} from '../../types/encryption-performance';

/**
 * Environment-specific security configurations
 */
type Environment = 'development' | 'staging' | 'production';

/**
 * Security configuration manager for encryption infrastructure
 */
export class SecurityConfigManager {
  private config: SecurityConfig;
  private environment: Environment;
  private configValidationErrors: string[] = [];

  constructor(environment: Environment = 'production') {
    this.environment = environment;
    this.config = this.createDefaultConfig();
    this.validateConfiguration();
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration with validation
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    const updatedConfig = { ...this.config, ...updates };
    this.validateUpdatedConfig(updatedConfig);
    this.config = updatedConfig;
  }

  /**
   * Get encryption security settings
   */
  getEncryptionConfig(): EncryptionSecurityConfig {
    return { ...this.config.encryption };
  }

  /**
   * Get cache security settings
   */
  getCacheConfig(): CacheSecurityConfig {
    return { ...this.config.cache };
  }

  /**
   * Get performance security limits
   */
  getPerformanceConfig(): PerformanceSecurityConfig {
    return { ...this.config.performance };
  }

  /**
   * Get compliance configuration
   */
  getComplianceConfig(): ComplianceConfig {
    return { ...this.config.compliance };
  }

  /**
   * Validate current configuration and return errors
   */
  validateConfiguration(): string[] {
    this.configValidationErrors = [];

    this.validateEncryptionConfig();
    this.validateCacheConfig();
    this.validatePerformanceConfig();
    this.validateComplianceConfig();

    if (this.configValidationErrors.length > 0) {
      console.warn(
        'Security configuration validation errors:',
        this.configValidationErrors,
      );
    }

    return [...this.configValidationErrors];
  }

  /**
   * Generate secure random keys for encryption
   */
  generateEncryptionKeys(): {
    masterKey: Buffer;
    derivationSalt: Buffer;
    cacheKey: Buffer;
  } {
    return {
      masterKey: crypto.randomBytes(32), // 256-bit master key
      derivationSalt: crypto.randomBytes(16), // 128-bit salt
      cacheKey: crypto.randomBytes(32), // 256-bit cache encryption key
    };
  }

  /**
   * Create environment-specific configuration
   */
  private createDefaultConfig(): SecurityConfig {
    switch (this.environment) {
      case 'development':
        return this.createDevelopmentConfig();
      case 'staging':
        return this.createStagingConfig();
      case 'production':
        return this.createProductionConfig();
      default:
        return this.createProductionConfig();
    }
  }

  /**
   * Development environment configuration (relaxed security for testing)
   */
  private createDevelopmentConfig(): SecurityConfig {
    return {
      encryption: {
        defaultAlgorithm: 'aes-256-gcm',
        keyDerivationIterations: 10000, // Reduced for faster testing
        saltSize: 16,
        keyRotationPolicy: {
          enabled: false, // Disabled for development
          intervalMs: 24 * 60 * 60 * 1000,
          gracePeriodMs: 60 * 60 * 1000,
          automaticRotation: false,
        },
        allowedAlgorithms: ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'],
        requireIntegrityCheck: true,
        auditLogging: false, // Disabled for development
      },
      cache: {
        encryptCacheAtRest: false, // Disabled for development
        memoryProtection: false,
        clearOnExit: false,
        maxCacheLifetimeMs: 60 * 60 * 1000, // 1 hour
        secureWipeOnEviction: false,
        accessLogging: false,
      },
      performance: {
        maxConcurrentOperations: 10, // Higher for testing
        rateLimitPerMinute: 10000, // Generous for development
        timeoutMs: 30000,
        resourceLimits: {
          maxMemoryMB: 1024, // 1GB
          maxCpuUsage: 0.8, // 80%
          maxDiskUsageMB: 5000, // 5GB
          maxOpenFiles: 1000,
        },
        emergencyShutdownThresholds: {
          memoryUsageThreshold: 0.9, // 90%
          cpuUsageThreshold: 0.95, // 95%
          errorRateThreshold: 0.5, // 50%
          responseTimeThresholdMs: 5000,
        },
      },
      compliance: {
        fipsCompliance: false,
        gdprCompliance: true,
        auditTrail: false,
        dataRetentionDays: 7, // Short retention for development
        encryptionStandards: ['AES-256', 'ChaCha20'],
      },
    };
  }

  /**
   * Staging environment configuration (production-like with monitoring)
   */
  private createStagingConfig(): SecurityConfig {
    return {
      encryption: {
        defaultAlgorithm: 'aes-256-gcm',
        keyDerivationIterations: 100000, // Production-level
        saltSize: 16,
        keyRotationPolicy: {
          enabled: true,
          intervalMs: 7 * 24 * 60 * 60 * 1000, // Weekly rotation
          gracePeriodMs: 2 * 60 * 60 * 1000, // 2 hours
          automaticRotation: true,
        },
        allowedAlgorithms: ['aes-256-gcm', 'chacha20-poly1305'],
        requireIntegrityCheck: true,
        auditLogging: true,
      },
      cache: {
        encryptCacheAtRest: true,
        memoryProtection: true,
        clearOnExit: true,
        maxCacheLifetimeMs: 30 * 60 * 1000, // 30 minutes
        secureWipeOnEviction: true,
        accessLogging: true,
      },
      performance: {
        maxConcurrentOperations: 5,
        rateLimitPerMinute: 5000,
        timeoutMs: 15000,
        resourceLimits: {
          maxMemoryMB: 512,
          maxCpuUsage: 0.7,
          maxDiskUsageMB: 2000,
          maxOpenFiles: 500,
        },
        emergencyShutdownThresholds: {
          memoryUsageThreshold: 0.85,
          cpuUsageThreshold: 0.9,
          errorRateThreshold: 0.3,
          responseTimeThresholdMs: 3000,
        },
      },
      compliance: {
        fipsCompliance: false,
        gdprCompliance: true,
        auditTrail: true,
        dataRetentionDays: 30,
        encryptionStandards: ['AES-256', 'ChaCha20'],
      },
    };
  }

  /**
   * Production environment configuration (maximum security)
   */
  private createProductionConfig(): SecurityConfig {
    return {
      encryption: {
        defaultAlgorithm: 'aes-256-gcm',
        keyDerivationIterations: 200000, // High iteration count for security
        saltSize: 32, // Larger salt for production
        keyRotationPolicy: {
          enabled: true,
          intervalMs: 24 * 60 * 60 * 1000, // Daily rotation
          gracePeriodMs: 60 * 60 * 1000, // 1 hour grace period
          automaticRotation: true,
          notificationWebhook: process.env.ENCRYPTION_ROTATION_WEBHOOK,
        },
        allowedAlgorithms: ['aes-256-gcm', 'chacha20-poly1305'], // Only strongest algorithms
        requireIntegrityCheck: true,
        auditLogging: true,
      },
      cache: {
        encryptCacheAtRest: true,
        memoryProtection: true,
        clearOnExit: true,
        maxCacheLifetimeMs: 15 * 60 * 1000, // 15 minutes maximum
        secureWipeOnEviction: true,
        accessLogging: true,
      },
      performance: {
        maxConcurrentOperations: 3, // Conservative for stability
        rateLimitPerMinute: 3000, // Wedding venue peak load
        timeoutMs: 10000, // 10 seconds maximum
        resourceLimits: {
          maxMemoryMB: 256, // Conservative memory usage
          maxCpuUsage: 0.6, // Leave headroom for other processes
          maxDiskUsageMB: 1000, // 1GB disk usage limit
          maxOpenFiles: 200,
        },
        emergencyShutdownThresholds: {
          memoryUsageThreshold: 0.8, // 80% memory triggers emergency
          cpuUsageThreshold: 0.85, // 85% CPU triggers emergency
          errorRateThreshold: 0.2, // 20% error rate triggers emergency
          responseTimeThresholdMs: 2000, // 2 seconds for wedding critical operations
        },
      },
      compliance: {
        fipsCompliance: true, // FIPS compliance for production
        gdprCompliance: true,
        auditTrail: true,
        dataRetentionDays: 90, // 90 days for compliance
        encryptionStandards: ['AES-256-GCM', 'ChaCha20-Poly1305'], // Only approved standards
      },
    };
  }

  private validateEncryptionConfig(): void {
    const config = this.config.encryption;

    if (!config.defaultAlgorithm) {
      this.configValidationErrors.push(
        'Default encryption algorithm is required',
      );
    }

    if (!config.allowedAlgorithms.includes(config.defaultAlgorithm)) {
      this.configValidationErrors.push(
        'Default algorithm must be in allowed algorithms list',
      );
    }

    if (config.keyDerivationIterations < 10000) {
      this.configValidationErrors.push(
        'Key derivation iterations must be at least 10,000',
      );
    }

    if (config.saltSize < 16) {
      this.configValidationErrors.push('Salt size must be at least 16 bytes');
    }

    // Validate production-specific requirements
    if (this.environment === 'production') {
      if (config.keyDerivationIterations < 100000) {
        this.configValidationErrors.push(
          'Production requires at least 100,000 key derivation iterations',
        );
      }

      if (!config.auditLogging) {
        this.configValidationErrors.push(
          'Audit logging is required in production',
        );
      }

      if (!config.keyRotationPolicy.enabled) {
        this.configValidationErrors.push(
          'Key rotation is required in production',
        );
      }
    }
  }

  private validateCacheConfig(): void {
    const config = this.config.cache;

    if (config.maxCacheLifetimeMs <= 0) {
      this.configValidationErrors.push('Max cache lifetime must be positive');
    }

    // Production-specific cache validation
    if (this.environment === 'production') {
      if (!config.encryptCacheAtRest) {
        this.configValidationErrors.push(
          'Cache encryption at rest is required in production',
        );
      }

      if (!config.secureWipeOnEviction) {
        this.configValidationErrors.push(
          'Secure wipe on eviction is required in production',
        );
      }

      if (config.maxCacheLifetimeMs > 30 * 60 * 1000) {
        this.configValidationErrors.push(
          'Production cache lifetime should not exceed 30 minutes',
        );
      }
    }
  }

  private validatePerformanceConfig(): void {
    const config = this.config.performance;

    if (config.maxConcurrentOperations <= 0) {
      this.configValidationErrors.push(
        'Max concurrent operations must be positive',
      );
    }

    if (config.rateLimitPerMinute <= 0) {
      this.configValidationErrors.push(
        'Rate limit per minute must be positive',
      );
    }

    if (config.timeoutMs <= 1000) {
      this.configValidationErrors.push('Timeout must be at least 1000ms');
    }

    // Validate resource limits
    const limits = config.resourceLimits;
    if (
      limits.maxMemoryMB <= 0 ||
      limits.maxCpuUsage <= 0 ||
      limits.maxDiskUsageMB <= 0
    ) {
      this.configValidationErrors.push('All resource limits must be positive');
    }

    if (limits.maxCpuUsage > 1) {
      this.configValidationErrors.push('Max CPU usage cannot exceed 100%');
    }

    // Validate emergency thresholds
    const thresholds = config.emergencyShutdownThresholds;
    if (
      thresholds.memoryUsageThreshold > 1 ||
      thresholds.cpuUsageThreshold > 1
    ) {
      this.configValidationErrors.push(
        'Emergency thresholds cannot exceed 100%',
      );
    }

    if (thresholds.errorRateThreshold > 1) {
      this.configValidationErrors.push(
        'Error rate threshold cannot exceed 100%',
      );
    }

    // Wedding-specific performance validation
    if (this.environment === 'production') {
      if (config.timeoutMs > 15000) {
        this.configValidationErrors.push(
          'Production timeout should not exceed 15 seconds for wedding operations',
        );
      }

      if (thresholds.responseTimeThresholdMs > 5000) {
        this.configValidationErrors.push(
          'Production response time threshold too high for wedding critical operations',
        );
      }
    }
  }

  private validateComplianceConfig(): void {
    const config = this.config.compliance;

    if (config.dataRetentionDays <= 0) {
      this.configValidationErrors.push('Data retention days must be positive');
    }

    if (config.encryptionStandards.length === 0) {
      this.configValidationErrors.push(
        'At least one encryption standard must be specified',
      );
    }

    // GDPR compliance validation
    if (config.gdprCompliance) {
      if (config.dataRetentionDays > 2555) {
        // ~7 years maximum
        this.configValidationErrors.push(
          'GDPR compliance requires reasonable data retention period',
        );
      }

      if (!config.auditTrail) {
        this.configValidationErrors.push(
          'GDPR compliance requires audit trail',
        );
      }
    }

    // FIPS compliance validation
    if (config.fipsCompliance) {
      const fipsAlgorithms = [
        'AES-256-GCM',
        'AES-256-CBC',
        'ChaCha20-Poly1305',
      ];
      const invalidAlgorithms = config.encryptionStandards.filter(
        (alg) => !fipsAlgorithms.includes(alg),
      );

      if (invalidAlgorithms.length > 0) {
        this.configValidationErrors.push(
          `FIPS compliance requires approved algorithms only: ${invalidAlgorithms.join(', ')} not allowed`,
        );
      }
    }
  }

  private validateUpdatedConfig(updatedConfig: SecurityConfig): void {
    const originalConfig = this.config;
    this.config = updatedConfig;

    const errors = this.validateConfiguration();

    if (errors.length > 0) {
      this.config = originalConfig; // Rollback on validation failure
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }
}

/**
 * Global security configuration instances
 */
let securityConfigManager: SecurityConfigManager;

/**
 * Get or create security configuration manager
 */
export function getSecurityConfig(
  environment?: Environment,
): SecurityConfigManager {
  if (!securityConfigManager) {
    securityConfigManager = new SecurityConfigManager(environment);
  }
  return securityConfigManager;
}

/**
 * Wedding-specific security configuration with optimized settings
 */
export function getWeddingSecurityConfig(): SecurityConfig {
  const manager = getSecurityConfig('production');

  // Override with wedding-specific optimizations
  const config = manager.getConfig();

  // Wedding venues need fast response times but high security
  config.performance.timeoutMs = 8000; // 8 seconds max for wedding operations
  config.performance.rateLimitPerMinute = 3600; // 1 operation per second average
  config.performance.emergencyShutdownThresholds.responseTimeThresholdMs = 1500; // 1.5s emergency threshold

  // Cache optimizations for guest data
  config.cache.maxCacheLifetimeMs = 20 * 60 * 1000; // 20 minutes for seating charts

  // Wedding compliance requirements
  config.compliance.dataRetentionDays = 365; // Keep wedding data for 1 year
  config.compliance.encryptionStandards = ['AES-256-GCM']; // Standardize on AES-256-GCM

  return config;
}

/**
 * Development-optimized security configuration for testing
 */
export function getDevelopmentSecurityConfig(): SecurityConfig {
  const manager = getSecurityConfig('development');
  return manager.getConfig();
}

/**
 * Validate current security configuration and log results
 */
export function validateSecuritySetup(): boolean {
  const manager = getSecurityConfig();
  const errors = manager.validateConfiguration();

  if (errors.length > 0) {
    console.error('Security configuration validation failed:', errors);
    return false;
  }

  console.log('Security configuration validation passed');
  return true;
}

/**
 * Emergency security shutdown trigger
 */
export function triggerEmergencyShutdown(reason: string): void {
  console.error(`EMERGENCY SHUTDOWN TRIGGERED: ${reason}`);

  // Log the emergency
  const manager = getSecurityConfig();
  const config = manager.getPerformanceConfig();

  console.error('Emergency thresholds:', config.emergencyShutdownThresholds);
  console.error('Current system state:', {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });

  // In a real implementation, this would:
  // 1. Clear all caches securely
  // 2. Stop accepting new operations
  // 3. Complete in-flight operations
  // 4. Send alerts to monitoring systems
  // 5. Gracefully shut down if necessary

  process.emit('SIGTERM');
}
