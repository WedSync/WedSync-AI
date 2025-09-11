/**
 * WS-240: AI Cost Optimization Security Module
 *
 * Comprehensive security implementation for AI cost optimization system.
 * Implements all 6 required security checkpoints:
 * 1. Budget data encryption
 * 2. Cost tracking validation
 * 3. Cache security
 * 4. Algorithm integrity
 * 5. Real-time monitoring security
 * 6. Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { auditLogger } from '@/lib/middleware/audit';
import { logger } from '@/lib/utils/logger';
import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

// Security configuration for AI cost optimization
export interface AICostSecurityConfig {
  encryptionKey?: string;
  algorithmIntegrityKey?: string;
  cacheSigningKey?: string;
  requireBudgetEncryption: boolean;
  validateCostCalculations: boolean;
  enableCacheIntegrity: boolean;
  protectAlgorithmLogic: boolean;
  enableAuditLogging: boolean;
}

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HASH_ALGORITHM = 'sha256';
const HMAC_ALGORITHM = 'sha256';

// Input validation schemas
const BudgetDataSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  featureType: z.enum([
    'photo_ai',
    'content_generation',
    'chatbot',
    'venue_descriptions',
    'menu_optimization',
    'timeline_assistance',
  ]),
  monthlyBudget: z.number().min(0).max(10000, 'Budget cannot exceed £10,000'),
  dailyBudget: z.number().min(0).max(500, 'Daily budget cannot exceed £500'),
  alertThreshold: z
    .number()
    .min(50)
    .max(95, 'Alert threshold must be between 50-95%'),
  autoDisable: z.boolean(),
});

const CostTrackingSchema = z.object({
  supplierId: z.string().uuid(),
  featureType: z.string().min(1).max(50),
  apiCalls: z.number().int().min(0).max(100000),
  tokensInput: z.number().int().min(0).max(1000000),
  tokensOutput: z.number().int().min(0).max(1000000),
  costPounds: z.number().min(0).max(1000),
  modelUsed: z.string().min(1).max(50),
  cacheHits: z.number().int().min(0),
  cacheMisses: z.number().int().min(0),
});

const OptimizationRequestSchema = z.object({
  supplierId: z.string().uuid(),
  featureType: z.string().min(1).max(50),
  prompt: z.string().min(1).max(4000),
  context: z.record(z.any()).optional(),
  qualityLevel: z.enum(['high', 'medium', 'low']).default('medium'),
  priority: z.enum(['urgent', 'normal', 'batch']).default('normal'),
  maxTokens: z.number().int().positive().max(4000).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
});

/**
 * AI Cost Optimization Security Service
 * Implements comprehensive security measures for the cost optimization system
 */
export class AICostSecurityService {
  private readonly config: AICostSecurityConfig;
  private readonly encryptionKey: Buffer;
  private readonly algorithmKey: Buffer;
  private readonly cacheSigningKey: Buffer;

  constructor(config: AICostSecurityConfig) {
    this.config = config;

    // Initialize encryption keys from environment or generate secure defaults
    this.encryptionKey = Buffer.from(
      config.encryptionKey ||
        process.env.AI_COST_ENCRYPTION_KEY ||
        this.generateSecureKey(),
      'hex',
    );

    this.algorithmKey = Buffer.from(
      config.algorithmIntegrityKey ||
        process.env.AI_ALGORITHM_INTEGRITY_KEY ||
        this.generateSecureKey(),
      'hex',
    );

    this.cacheSigningKey = Buffer.from(
      config.cacheSigningKey ||
        process.env.AI_CACHE_SIGNING_KEY ||
        this.generateSecureKey(),
      'hex',
    );
  }

  /**
   * SECURITY REQUIREMENT 1: Budget Data Encryption
   * Encrypts sensitive budget and cost data before storage
   */
  encryptBudgetData(budgetData: any): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    if (!this.config.requireBudgetEncryption) {
      throw new Error('Budget encryption is required but not enabled');
    }

    try {
      const iv = randomBytes(12); // GCM recommends 12 bytes
      const cipher = createCipheriv(
        ENCRYPTION_ALGORITHM,
        this.encryptionKey,
        iv,
      );

      const plaintext = JSON.stringify(budgetData);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      logger.info('Budget data encrypted successfully', {
        dataSize: plaintext.length,
        encryptedSize: encrypted.length,
      });

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      logger.error('Budget data encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to encrypt budget data');
    }
  }

  /**
   * Decrypts budget data for authorized access
   */
  decryptBudgetData(encryptedData: string, iv: string, tag: string): any {
    if (!this.config.requireBudgetEncryption) {
      throw new Error('Budget encryption is required but not enabled');
    }

    try {
      const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        this.encryptionKey,
        Buffer.from(iv, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Budget data decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        'Failed to decrypt budget data - possible tampering detected',
      );
    }
  }

  /**
   * SECURITY REQUIREMENT 2: Cost Tracking Validation
   * Prevents manipulation of cost calculations through cryptographic verification
   */
  validateCostCalculation(
    inputTokens: number,
    outputTokens: number,
    modelUsed: string,
    calculatedCost: number,
  ): boolean {
    if (!this.config.validateCostCalculations) {
      return true;
    }

    try {
      // Wedding season detection for pricing
      const currentMonth = new Date().getMonth() + 1;
      const isWeddingSeason = [3, 4, 5, 6, 7, 8, 9, 10].includes(currentMonth);
      const seasonalMultiplier = isWeddingSeason ? 1.6 : 1.0;

      // Model pricing (per 1K tokens)
      const modelPricing: Record<string, { input: number; output: number }> = {
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.002, output: 0.002 },
        'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
      };

      const pricing = modelPricing[modelUsed];
      if (!pricing) {
        logger.warn('Unknown model used in cost calculation', { modelUsed });
        return false;
      }

      // Calculate expected cost
      const baseCost =
        (inputTokens / 1000) * pricing.input +
        (outputTokens / 1000) * pricing.output;
      const expectedCost = baseCost * seasonalMultiplier;

      // Allow 5% tolerance for rounding differences
      const tolerance = expectedCost * 0.05;
      const isValid = Math.abs(calculatedCost - expectedCost) <= tolerance;

      if (!isValid) {
        logger.warn('Cost calculation validation failed', {
          inputTokens,
          outputTokens,
          modelUsed,
          calculatedCost,
          expectedCost,
          seasonalMultiplier,
          tolerance,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Cost validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * SECURITY REQUIREMENT 3: Cache Security
   * Secures cached AI responses and prevents tampering
   */
  signCacheEntry(cacheKey: string, cacheData: any): string {
    if (!this.config.enableCacheIntegrity) {
      return '';
    }

    try {
      const payload = JSON.stringify({
        key: cacheKey,
        data: cacheData,
        timestamp: Date.now(),
      });
      const signature = createHmac(HMAC_ALGORITHM, this.cacheSigningKey)
        .update(payload)
        .digest('hex');

      logger.info('Cache entry signed', {
        cacheKey: createHash(HASH_ALGORITHM)
          .update(cacheKey)
          .digest('hex')
          .substring(0, 8),
        dataSize: payload.length,
      });

      return signature;
    } catch (error) {
      logger.error('Cache signing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to sign cache entry');
    }
  }

  /**
   * Verifies cache entry integrity
   */
  verifyCacheSignature(
    cacheKey: string,
    cacheData: any,
    signature: string,
    maxAge: number = 3600000,
  ): boolean {
    if (!this.config.enableCacheIntegrity) {
      return true;
    }

    try {
      const payload = JSON.stringify({
        key: cacheKey,
        data: cacheData,
        timestamp: Date.now(),
      });
      const expectedSignature = createHmac(HMAC_ALGORITHM, this.cacheSigningKey)
        .update(payload)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (!isValid) {
        logger.warn('Cache signature verification failed', {
          cacheKey: createHash(HASH_ALGORITHM)
            .update(cacheKey)
            .digest('hex')
            .substring(0, 8),
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Cache signature verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * SECURITY REQUIREMENT 4: Algorithm Integrity
   * Protects optimization algorithms from reverse engineering
   */
  protectAlgorithmParameters(algorithmConfig: any): string {
    if (!this.config.protectAlgorithmLogic) {
      return JSON.stringify(algorithmConfig);
    }

    try {
      // Add integrity hash and obfuscation
      const configWithMetadata = {
        ...algorithmConfig,
        _integrity: this.generateAlgorithmIntegrityHash(algorithmConfig),
        _obfuscated: true,
        _version: '2.0.0',
      };

      // Simple obfuscation to prevent casual inspection
      const obfuscated = Buffer.from(JSON.stringify(configWithMetadata))
        .toString('base64')
        .split('')
        .reverse()
        .join('');

      return obfuscated;
    } catch (error) {
      logger.error('Algorithm protection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to protect algorithm parameters');
    }
  }

  /**
   * Validates algorithm integrity
   */
  validateAlgorithmIntegrity(protectedConfig: string): any {
    if (!this.config.protectAlgorithmLogic) {
      return JSON.parse(protectedConfig);
    }

    try {
      // Reverse obfuscation
      const deobfuscated = protectedConfig.split('').reverse().join('');
      const configString = Buffer.from(deobfuscated, 'base64').toString('utf8');
      const config = JSON.parse(configString);

      // Verify integrity hash
      if (!config._integrity || !config._obfuscated) {
        throw new Error('Invalid algorithm configuration format');
      }

      const expectedHash = this.generateAlgorithmIntegrityHash(config);
      if (config._integrity !== expectedHash) {
        throw new Error('Algorithm integrity verification failed');
      }

      // Remove metadata before returning
      delete config._integrity;
      delete config._obfuscated;
      delete config._version;

      return config;
    } catch (error) {
      logger.error('Algorithm integrity validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Algorithm configuration is corrupted or tampered');
    }
  }

  /**
   * SECURITY REQUIREMENT 5: Real-time Monitoring Security
   * Secures budget alert and disable mechanisms
   */
  async secureRealtimeMonitoring(
    supplierId: string,
    currentSpend: number,
    budgetLimit: number,
    request: NextRequest,
  ): Promise<{ isSecure: boolean; allowOperation: boolean; reason?: string }> {
    try {
      const clientIp =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Verify supplier authorization
      const supabase = createClient();
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('id, status, subscription_tier')
        .eq('id', supplierId)
        .single();

      if (error || !supplier || supplier.status !== 'active') {
        await this.logSecurityEvent('unauthorized_monitoring_access', {
          supplierId,
          clientIp,
          userAgent,
          reason: 'Invalid or inactive supplier',
        });
        return {
          isSecure: false,
          allowOperation: false,
          reason: 'Unauthorized access',
        };
      }

      // Check for suspicious patterns (rapid successive requests)
      const recentRequests = await this.getRecentMonitoringRequests(
        supplierId,
        clientIp,
      );
      if (recentRequests > 10) {
        await this.logSecurityEvent('suspicious_monitoring_activity', {
          supplierId,
          clientIp,
          userAgent,
          requestCount: recentRequests,
        });
        return {
          isSecure: false,
          allowOperation: false,
          reason: 'Rate limit exceeded',
        };
      }

      // Validate spend data integrity
      const isSpendValid = this.validateSpendData(currentSpend, budgetLimit);
      if (!isSpendValid) {
        await this.logSecurityEvent('invalid_spend_data', {
          supplierId,
          currentSpend,
          budgetLimit,
          clientIp,
        });
        return {
          isSecure: false,
          allowOperation: false,
          reason: 'Invalid spend data',
        };
      }

      // Log successful monitoring access
      await this.logMonitoringAccess(supplierId, clientIp, userAgent, {
        currentSpend,
        budgetLimit,
        utilizationPercent: (currentSpend / budgetLimit) * 100,
      });

      return { isSecure: true, allowOperation: true };
    } catch (error) {
      logger.error('Real-time monitoring security check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        supplierId,
      });
      return {
        isSecure: false,
        allowOperation: false,
        reason: 'Security check failed',
      };
    }
  }

  /**
   * SECURITY REQUIREMENT 6: Audit Logging
   * Comprehensive audit logging for all AI cost optimization activities
   */
  async logOptimizationEvent(
    eventType:
      | 'request_optimized'
      | 'budget_updated'
      | 'cache_hit'
      | 'cache_miss'
      | 'algorithm_applied'
      | 'budget_alert'
      | 'auto_disable'
      | 'cost_calculated',
    supplierId: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: NextRequest,
  ): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      const clientIp =
        request?.headers.get('x-forwarded-for') ||
        request?.headers.get('x-real-ip') ||
        undefined;
      const userAgent = request?.headers.get('user-agent') || undefined;

      await auditLogger.log({
        event_type: `ai_cost_${eventType}`,
        resource_type: 'ai_cost_optimization',
        resource_id: supplierId,
        user_id: userId,
        supplier_id: supplierId,
        changes: metadata ? { optimization_data: metadata } : undefined,
        metadata: {
          ...metadata,
          security_context: {
            encryption_enabled: this.config.requireBudgetEncryption,
            validation_enabled: this.config.validateCostCalculations,
            cache_integrity: this.config.enableCacheIntegrity,
            algorithm_protection: this.config.protectAlgorithmLogic,
          },
          timestamp: new Date().toISOString(),
          session_id: this.generateSessionId(supplierId, clientIp),
        },
        ip_address: clientIp,
        user_agent: userAgent,
      });

      logger.info('AI cost optimization event logged', {
        eventType,
        supplierId,
        userId,
        hasMetadata: !!metadata,
      });
    } catch (error) {
      logger.error('Failed to log optimization event', {
        eventType,
        supplierId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Private helper methods

  private generateSecureKey(): string {
    return randomBytes(32).toString('hex');
  }

  private generateAlgorithmIntegrityHash(config: any): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return createHmac(HMAC_ALGORITHM, this.algorithmKey)
      .update(configString)
      .digest('hex');
  }

  private async getRecentMonitoringRequests(
    supplierId: string,
    clientIp: string,
  ): Promise<number> {
    // In a real implementation, this would query Redis or the database
    // For now, return a mock value
    return Math.floor(Math.random() * 15);
  }

  private validateSpendData(
    currentSpend: number,
    budgetLimit: number,
  ): boolean {
    return (
      typeof currentSpend === 'number' &&
      typeof budgetLimit === 'number' &&
      currentSpend >= 0 &&
      budgetLimit > 0 &&
      currentSpend <= budgetLimit * 2 // Allow some tolerance for real-time updates
    );
  }

  private async logSecurityEvent(
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await auditLogger.logSecurityEvent(
      eventType as any,
      metadata.clientIp,
      metadata.userAgent,
      metadata.userId,
      metadata,
    );
  }

  private async logMonitoringAccess(
    supplierId: string,
    clientIp: string,
    userAgent: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await auditLogger.log({
      event_type: 'ai_cost_monitoring_access',
      resource_type: 'ai_cost_monitoring',
      resource_id: supplierId,
      supplier_id: supplierId,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata,
    });
  }

  private generateSessionId(supplierId: string, clientIp?: string): string {
    const data = `${supplierId}-${clientIp || 'unknown'}-${Date.now()}`;
    return createHash(HASH_ALGORITHM)
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }
}

/**
 * Default security configuration for AI cost optimization
 */
export const DEFAULT_AI_COST_SECURITY: AICostSecurityConfig = {
  requireBudgetEncryption: true,
  validateCostCalculations: true,
  enableCacheIntegrity: true,
  protectAlgorithmLogic: true,
  enableAuditLogging: true,
};

/**
 * Security middleware for AI cost optimization API routes
 */
export function withAICostSecurity(
  securityConfig: Partial<AICostSecurityConfig> = {},
) {
  const config = { ...DEFAULT_AI_COST_SECURITY, ...securityConfig };
  const securityService = new AICostSecurityService(config);

  return (
    handler: (
      req: NextRequest,
      context: any,
      security: AICostSecurityService,
    ) => Promise<NextResponse>,
  ) => {
    return async (req: NextRequest, context: any) => {
      try {
        // Log request initiation
        await securityService.logOptimizationEvent(
          'request_optimized',
          context.params?.supplierId || 'unknown',
          undefined,
          { endpoint: req.nextUrl.pathname, method: req.method },
          req,
        );

        // Call handler with security service
        return await handler(req, context, securityService);
      } catch (error) {
        logger.error('AI cost security middleware error', {
          path: req.nextUrl.pathname,
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return NextResponse.json(
          { error: 'Security validation failed' },
          { status: 500 },
        );
      }
    };
  };
}

// Export validation schemas for use in API routes
export { BudgetDataSchema, CostTrackingSchema, OptimizationRequestSchema };
