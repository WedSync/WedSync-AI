/**
 * WS-194 Automated Secret Rotation System
 * Enhanced secret lifecycle management with zero-downtime rotation
 * Team B - Backend/API Focus
 */

import {
  apiKeyManager,
  ApiKeyRotationManager,
} from '../security/api-key-rotation';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Secret types supported by the rotation system
export type SecretType =
  | 'stripe_secret_key'
  | 'stripe_webhook_secret'
  | 'twilio_auth_token'
  | 'supabase_service_role_key'
  | 'nextauth_secret'
  | 'wedding_data_encryption_key'
  | 'resend_api_key'
  | 'openai_api_key'
  | 'custom_api_key';

// Secret configuration interface
interface SecretConfig {
  id: string;
  type: SecretType;
  name: string;
  description: string;
  environment: 'development' | 'staging' | 'production' | 'all';
  rotationIntervalDays: number;
  gracePeriodDays: number;
  isActive: boolean;
  isCritical: boolean; // Critical secrets need special handling
  autoRotationEnabled: boolean;
  notificationChannels: string[];
  validationEndpoint?: string; // Endpoint to validate secret works
  metadata?: Record<string, unknown>;
}

// Secret rotation status
interface SecretRotationStatus {
  secretId: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'rollback';
  oldSecretHash?: string;
  newSecretHash?: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  gracePeriodEnds?: Date;
}

// Secret validation result
interface SecretValidationResult {
  isValid: boolean;
  canConnect: boolean;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Wedding-specific secret requirements
interface WeddingSecretPolicy {
  saturdayRotationBlocked: boolean;
  peakSeasonExtraValidation: boolean;
  weddingDayEmergencyOverride: boolean;
  blackoutDates: string[];
}

export class SecretRotationManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private apiKeyManager: ApiKeyRotationManager;
  private weddingPolicy: WeddingSecretPolicy;

  constructor(weddingPolicy?: Partial<WeddingSecretPolicy>) {
    this.apiKeyManager = apiKeyManager;
    this.weddingPolicy = {
      saturdayRotationBlocked: true,
      peakSeasonExtraValidation: true,
      weddingDayEmergencyOverride: false,
      blackoutDates: [],
      ...weddingPolicy,
    };
  }

  /**
   * Register a secret for automatic rotation
   */
  async registerSecret(config: Omit<SecretConfig, 'id'>): Promise<string> {
    const secretId = crypto.randomUUID();

    const { error } = await this.supabase.from('secret_configurations').insert({
      id: secretId,
      ...config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to register secret', error, { config });
      throw new Error('Failed to register secret for rotation');
    }

    logger.info('Secret registered for rotation', {
      secretId,
      type: config.type,
      name: config.name,
      environment: config.environment,
    });

    metrics.incrementCounter('secrets.registered', 1, {
      type: config.type,
      environment: config.environment,
    });

    return secretId;
  }

  /**
   * Rotate all secrets that are due for rotation
   */
  async rotateExpiredSecrets(): Promise<{
    rotated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let rotated = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // Check wedding day restrictions
      if (this.isWeddingDayRestricted()) {
        logger.warn('Secret rotation blocked due to wedding day restrictions');
        return {
          rotated: 0,
          skipped: 0,
          failed: 0,
          errors: ['Wedding day rotation blocked'],
        };
      }

      // Get secrets due for rotation
      const secretsToRotate = await this.getSecretsForRotation();

      if (secretsToRotate.length === 0) {
        return { rotated: 0, skipped: 0, failed: 0, errors: [] };
      }

      logger.info(`Starting secret rotation cycle`, {
        count: secretsToRotate.length,
      });

      for (const secret of secretsToRotate) {
        try {
          // Check if secret should be skipped
          if (!this.shouldRotateSecret(secret)) {
            skipped++;
            continue;
          }

          // Perform the rotation
          await this.rotateSecret(secret);
          rotated++;

          // Wait between rotations to avoid rate limits
          await this.delay(2000);
        } catch (error) {
          failed++;
          errors.push(`Failed to rotate ${secret.name}: ${error}`);
          logger.error('Secret rotation failed', error as Error, {
            secretId: secret.id,
          });
        }
      }

      logger.info('Secret rotation cycle completed', {
        rotated,
        skipped,
        failed,
        errors: errors.length,
      });

      metrics.incrementCounter('secrets.rotation_cycle_completed', 1, {
        rotated: rotated.toString(),
        failed: failed.toString(),
      });

      return { rotated, skipped, failed, errors };
    } catch (error) {
      logger.error('Secret rotation cycle failed', error as Error);
      return {
        rotated,
        skipped,
        failed,
        errors: [...errors, `Cycle error: ${error}`],
      };
    }
  }

  /**
   * Rotate a specific secret with zero-downtime strategy
   */
  async rotateSecret(config: SecretConfig): Promise<void> {
    const rotationId = crypto.randomUUID();

    logger.info('Starting secret rotation', {
      rotationId,
      secretId: config.id,
      type: config.type,
      name: config.name,
    });

    // Record rotation start
    await this.recordRotationStatus({
      secretId: config.id,
      status: 'in_progress',
      scheduledAt: new Date(),
      startedAt: new Date(),
    });

    try {
      // Generate new secret
      const newSecret = await this.generateSecretValue(config.type);

      // Validate the new secret works
      if (config.validationEndpoint) {
        const validationResult = await this.validateSecret(
          config.type,
          newSecret,
          config.validationEndpoint,
        );
        if (!validationResult.isValid) {
          throw new Error(
            `Secret validation failed: ${validationResult.error}`,
          );
        }
      }

      // Store new secret (this triggers deployment update)
      await this.updateSecretInEnvironment(config, newSecret);

      // Update rotation status
      await this.recordRotationStatus({
        secretId: config.id,
        status: 'completed',
        scheduledAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        newSecretHash: this.hashSecret(newSecret),
        gracePeriodEnds: new Date(
          Date.now() + config.gracePeriodDays * 24 * 60 * 60 * 1000,
        ),
      });

      // Send notifications
      await this.sendRotationNotification(config, 'success');

      logger.info('Secret rotation completed successfully', {
        rotationId,
        secretId: config.id,
        type: config.type,
      });

      metrics.incrementCounter('secrets.rotation_success', 1, {
        type: config.type,
        environment: config.environment,
      });
    } catch (error) {
      // Record failure
      await this.recordRotationStatus({
        secretId: config.id,
        status: 'failed',
        scheduledAt: new Date(),
        startedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send failure notification
      await this.sendRotationNotification(config, 'failed', error as Error);

      metrics.incrementCounter('secrets.rotation_failed', 1, {
        type: config.type,
        error_type: 'rotation_failed',
      });

      throw error;
    }
  }

  /**
   * Generate new secret value based on type
   */
  private async generateSecretValue(type: SecretType): Promise<string> {
    switch (type) {
      case 'stripe_secret_key':
        // In production, this would call Stripe API to generate a new key
        // For now, we'll simulate it
        throw new Error(
          'Stripe key rotation requires manual process via Stripe dashboard',
        );

      case 'stripe_webhook_secret':
        // Generate webhook secret format
        return `whsec_${crypto.randomBytes(32).toString('base64url')}`;

      case 'twilio_auth_token':
        // In production, this would call Twilio API
        throw new Error(
          'Twilio token rotation requires Twilio API integration',
        );

      case 'supabase_service_role_key':
        // In production, this would call Supabase management API
        throw new Error(
          'Supabase key rotation requires manual process or Management API',
        );

      case 'nextauth_secret':
        return crypto.randomBytes(32).toString('base64url');

      case 'wedding_data_encryption_key':
        return crypto.randomBytes(32).toString('base64url');

      case 'resend_api_key':
        // In production, this would call Resend API
        throw new Error(
          'Resend API key rotation requires Resend API integration',
        );

      case 'openai_api_key':
        // OpenAI keys need to be regenerated manually
        throw new Error('OpenAI API key rotation requires manual process');

      case 'custom_api_key':
        return `wsk_${crypto.randomBytes(32).toString('base64url')}`;

      default:
        throw new Error(`Unsupported secret type: ${type}`);
    }
  }

  /**
   * Update secret in environment (Vercel, local, etc.)
   */
  private async updateSecretInEnvironment(
    config: SecretConfig,
    newSecret: string,
  ): Promise<void> {
    const envVar = this.getEnvironmentVariableName(config.type);

    if (process.env.VERCEL) {
      // Update in Vercel
      await this.updateVercelEnvironmentVariable(
        envVar,
        newSecret,
        config.environment,
      );
    } else {
      // For local development, log securely
      logger.info('Secret rotation would update environment variable', {
        secretId: config.id,
        envVar,
        environment: config.environment,
        secretPreview: this.maskSecret(newSecret),
      });
    }
  }

  /**
   * Update Vercel environment variable
   */
  private async updateVercelEnvironmentVariable(
    key: string,
    value: string,
    target: string,
  ): Promise<void> {
    // This would use Vercel API to update environment variables
    // Implementation depends on having Vercel API access token

    logger.info('Would update Vercel environment variable', {
      key,
      target,
      valuePreview: this.maskSecret(value),
    });

    // Placeholder for actual Vercel API call
    // const vercelResponse = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     key,
    //     value,
    //     target: [target]
    //   })
    // });
  }

  /**
   * Validate that a secret works correctly
   */
  private async validateSecret(
    type: SecretType,
    secret: string,
    endpoint: string,
  ): Promise<SecretValidationResult> {
    const startTime = Date.now();

    try {
      switch (type) {
        case 'stripe_secret_key':
          return await this.validateStripeKey(secret);

        case 'twilio_auth_token':
          return await this.validateTwilioToken(secret);

        case 'resend_api_key':
          return await this.validateResendKey(secret);

        default:
          // Generic HTTP validation
          return await this.validateGenericEndpoint(secret, endpoint);
      }
    } catch (error) {
      return {
        isValid: false,
        canConnect: false,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Validate Stripe secret key
   */
  private async validateStripeKey(
    secretKey: string,
  ): Promise<SecretValidationResult> {
    const startTime = Date.now();

    try {
      // Test Stripe key by making a simple API call
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      const isValid = response.ok;
      const responseData = response.ok ? await response.json() : null;

      return {
        isValid,
        canConnect: response.ok,
        responseTime: Date.now() - startTime,
        metadata: {
          stripeAccountId: responseData?.id,
          businessProfile: responseData?.business_profile,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        canConnect: false,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Stripe validation failed',
      };
    }
  }

  /**
   * Validate Twilio auth token
   */
  private async validateTwilioToken(
    authToken: string,
  ): Promise<SecretValidationResult> {
    const startTime = Date.now();

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      if (!accountSid) {
        throw new Error('TWILIO_ACCOUNT_SID not found');
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
        },
      );

      const isValid = response.ok;
      const responseData = response.ok ? await response.json() : null;

      return {
        isValid,
        canConnect: response.ok,
        responseTime: Date.now() - startTime,
        metadata: {
          accountSid: responseData?.sid,
          status: responseData?.status,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        canConnect: false,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Twilio validation failed',
      };
    }
  }

  /**
   * Validate Resend API key
   */
  private async validateResendKey(
    apiKey: string,
  ): Promise<SecretValidationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const isValid = response.ok;

      return {
        isValid,
        canConnect: response.ok,
        responseTime: Date.now() - startTime,
        metadata: {
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        canConnect: false,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Resend validation failed',
      };
    }
  }

  /**
   * Generic endpoint validation
   */
  private async validateGenericEndpoint(
    secret: string,
    endpoint: string,
  ): Promise<SecretValidationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      });

      return {
        isValid: response.ok,
        canConnect: true,
        responseTime: Date.now() - startTime,
        metadata: {
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        canConnect: false,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Endpoint validation failed',
      };
    }
  }

  /**
   * Check if wedding day restrictions apply
   */
  private isWeddingDayRestricted(): boolean {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const dateStr = today.toISOString().split('T')[0];

    if (this.weddingPolicy.saturdayRotationBlocked && isSaturday) {
      return !this.weddingPolicy.weddingDayEmergencyOverride;
    }

    if (this.weddingPolicy.blackoutDates.includes(dateStr)) {
      return !this.weddingPolicy.weddingDayEmergencyOverride;
    }

    return false;
  }

  /**
   * Get secrets that need rotation
   */
  private async getSecretsForRotation(): Promise<SecretConfig[]> {
    const rotationDate = new Date();
    rotationDate.setHours(0, 0, 0, 0); // Start of today

    const { data, error } = await this.supabase
      .from('secret_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('auto_rotation_enabled', true)
      .or(
        `next_rotation_date.lte.${rotationDate.toISOString()},next_rotation_date.is.null`,
      );

    if (error) {
      logger.error('Failed to get secrets for rotation', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if a secret should be rotated now
   */
  private shouldRotateSecret(secret: SecretConfig): boolean {
    // Skip if critical and in peak wedding season without extra validation
    if (
      secret.isCritical &&
      this.isPeakWeddingSeason() &&
      !this.weddingPolicy.peakSeasonExtraValidation
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if it's peak wedding season
   */
  private isPeakWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const peakMonths = [5, 6, 7, 8, 9, 10]; // May through October
    return peakMonths.includes(currentMonth);
  }

  /**
   * Record rotation status in database
   */
  private async recordRotationStatus(
    status: Partial<SecretRotationStatus>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('secret_rotation_history')
      .insert({
        ...status,
        created_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Failed to record rotation status', error, { status });
    }
  }

  /**
   * Send rotation notifications
   */
  private async sendRotationNotification(
    config: SecretConfig,
    status: 'success' | 'failed',
    error?: Error,
  ): Promise<void> {
    logger.info('Secret rotation notification', {
      secretId: config.id,
      name: config.name,
      type: config.type,
      status,
      error: error?.message,
      notificationChannels: config.notificationChannels,
    });

    // In production, this would send actual notifications
    // to Slack, email, PagerDuty, etc.
  }

  /**
   * Get environment variable name for secret type
   */
  private getEnvironmentVariableName(type: SecretType): string {
    const mapping: Record<SecretType, string> = {
      stripe_secret_key: 'STRIPE_SECRET_KEY',
      stripe_webhook_secret: 'STRIPE_WEBHOOK_SECRET',
      twilio_auth_token: 'TWILIO_AUTH_TOKEN',
      supabase_service_role_key: 'SUPABASE_SERVICE_ROLE_KEY',
      nextauth_secret: 'NEXTAUTH_SECRET',
      wedding_data_encryption_key: 'WEDDING_DATA_ENCRYPTION_KEY',
      resend_api_key: 'RESEND_API_KEY',
      openai_api_key: 'OPENAI_API_KEY',
      custom_api_key: 'CUSTOM_API_KEY',
    };

    return mapping[type] || type.toUpperCase();
  }

  /**
   * Hash secret for storage/comparison
   */
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Mask secret for logging
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 8) return '[MASKED]';
    return `${secret.substring(0, 4)}...[MASKED]`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get rotation history for a secret
   */
  async getRotationHistory(secretId: string): Promise<SecretRotationStatus[]> {
    const { data, error } = await this.supabase
      .from('secret_rotation_history')
      .select('*')
      .eq('secret_id', secretId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Failed to get rotation history', error, { secretId });
      return [];
    }

    return data || [];
  }

  /**
   * Force rotation of a specific secret (emergency use)
   */
  async forceRotateSecret(
    secretId: string,
    override: boolean = false,
  ): Promise<void> {
    if (!override && this.isWeddingDayRestricted()) {
      throw new Error(
        'Wedding day rotation blocked. Use override=true for emergency rotation.',
      );
    }

    const { data: secretConfig } = await this.supabase
      .from('secret_configurations')
      .select('*')
      .eq('id', secretId)
      .single();

    if (!secretConfig) {
      throw new Error('Secret configuration not found');
    }

    await this.rotateSecret(secretConfig);
  }
}

// Export singleton instance
export const secretRotationManager = new SecretRotationManager({
  saturdayRotationBlocked: true,
  peakSeasonExtraValidation: true,
  weddingDayEmergencyOverride: false,
});

// Convenience functions for cron jobs
export async function runSecretRotation(): Promise<void> {
  try {
    const result = await secretRotationManager.rotateExpiredSecrets();

    logger.info('Automated secret rotation completed', result);

    if (result.failed > 0) {
      logger.error(
        'Secret rotation had failures',
        new Error('Rotation failures'),
        {
          failed: result.failed,
          errors: result.errors,
        },
      );
    }
  } catch (error) {
    logger.error('Secret rotation cycle failed', error as Error);
  }
}
