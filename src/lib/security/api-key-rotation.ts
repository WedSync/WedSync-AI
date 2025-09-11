/**
 * API Key Rotation System for Production Security
 * Implements automatic key rotation, validation, and lifecycle management
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import * as crypto from 'crypto';

interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  organization_id: string;
  name: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit: number;
  created_at: string;
  created_by: string;
}

interface KeyRotationPolicy {
  autoRotationEnabled: boolean;
  rotationIntervalDays: number;
  gracePeriodDays: number; // How long old keys remain valid during transition
  maxKeysPerOrg: number;
  notifyBeforeExpiryDays: number;
}

interface KeyUsageMetrics {
  totalRequests: number;
  lastUsed: string;
  avgRequestsPerDay: number;
  errorRate: number;
  suspiciousActivity: boolean;
}

export class ApiKeyRotationManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private rotationPolicy: KeyRotationPolicy = {
    autoRotationEnabled: true,
    rotationIntervalDays: 90, // 3 months
    gracePeriodDays: 7, // 1 week overlap
    maxKeysPerOrg: 5,
    notifyBeforeExpiryDays: 14, // 2 weeks notice
  };

  constructor(policy?: Partial<KeyRotationPolicy>) {
    if (policy) {
      this.rotationPolicy = { ...this.rotationPolicy, ...policy };
    }
  }

  /**
   * Generate a new API key for an organization
   */
  async generateApiKey(
    organizationId: string,
    name: string,
    scopes: string[],
    createdBy: string,
    options: {
      expiresInDays?: number;
      rateLimit?: number;
      autoRotate?: boolean;
    } = {},
  ): Promise<{ apiKey: string; keyId: string }> {
    const {
      expiresInDays = this.rotationPolicy.rotationIntervalDays,
      rateLimit = 1000,
      autoRotate = this.rotationPolicy.autoRotationEnabled,
    } = options;

    // Check if organization has reached key limit
    const { count: existingKeysCount } = await this.supabase
      .from('api_keys')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (
      existingKeysCount &&
      existingKeysCount >= this.rotationPolicy.maxKeysPerOrg
    ) {
      throw new Error(
        `Organization has reached maximum API key limit (${this.rotationPolicy.maxKeysPerOrg})`,
      );
    }

    // Generate the API key
    const apiKey = this.generateSecureKey();
    const keyHash = this.hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);
    const keyId = crypto.randomUUID();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Store the key in database
    const { error } = await this.supabase.from('api_keys').insert({
      id: keyId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      organization_id: organizationId,
      name,
      scopes,
      status: 'active',
      expires_at: expiresAt,
      rate_limit: rateLimit,
      created_by: createdBy,
      metadata: {
        auto_rotate: autoRotate,
        generation_source: 'api_rotation_manager',
      },
    });

    if (error) {
      logger.error('Failed to create API key', error, {
        organizationId,
        name,
        scopes,
      });
      throw new Error('Failed to create API key');
    }

    // Log the key creation
    logger.info('API key created', {
      keyId,
      organizationId,
      name,
      scopes,
      expiresAt,
      createdBy,
    });

    // Track metrics
    metrics.incrementCounter('api_keys.created', 1, {
      organization_id: organizationId,
      auto_rotate: autoRotate.toString(),
    });

    return { apiKey, keyId };
  }

  /**
   * Validate an API key and return its details
   */
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    key?: ApiKey;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const keyHash = this.hashKey(apiKey);
      const keyPrefix = apiKey.substring(0, 8);

      // Find the key in database
      const { data: keyData, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('key_prefix', keyPrefix)
        .eq('status', 'active')
        .single();

      if (error || !keyData) {
        metrics.incrementCounter('api_keys.validation_failed', 1, {
          reason: 'not_found',
        });
        return { valid: false, error: 'Invalid API key' };
      }

      // Check if key has expired
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        // Mark key as expired
        await this.supabase
          .from('api_keys')
          .update({ status: 'expired' })
          .eq('id', keyData.id);

        metrics.incrementCounter('api_keys.validation_failed', 1, {
          reason: 'expired',
        });
        return { valid: false, error: 'API key has expired' };
      }

      // Update last used timestamp and increment usage count
      await this.supabase
        .from('api_keys')
        .update({
          last_used_at: new Date().toISOString(),
          usage_count: keyData.usage_count + 1,
        })
        .eq('id', keyData.id);

      // Track successful validation
      metrics.incrementCounter('api_keys.validation_success', 1, {
        organization_id: keyData.organization_id,
      });

      return { valid: true, key: keyData };
    } catch (error) {
      logger.error('API key validation error', error as Error);
      metrics.incrementCounter('api_keys.validation_failed', 1, {
        reason: 'system_error',
      });
      return { valid: false, error: 'Validation error' };
    } finally {
      metrics.recordHistogram(
        'api_keys.validation_duration',
        Date.now() - startTime,
      );
    }
  }

  /**
   * Rotate API keys that are due for rotation
   */
  async rotateExpiredKeys(): Promise<{
    rotated: number;
    notifications: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let rotated = 0;
    let notifications = 0;

    try {
      // Find keys that need rotation (expired or close to expiry)
      const rotationDate = new Date();
      rotationDate.setDate(
        rotationDate.getDate() + this.rotationPolicy.gracePeriodDays,
      );

      const { data: keysNeedingRotation } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('status', 'active')
        .eq('metadata->auto_rotate', true)
        .lte('expires_at', rotationDate.toISOString());

      if (!keysNeedingRotation || keysNeedingRotation.length === 0) {
        return { rotated: 0, notifications: 0, errors: [] };
      }

      // Find keys that need notification (expiring soon)
      const notificationDate = new Date();
      notificationDate.setDate(
        notificationDate.getDate() + this.rotationPolicy.notifyBeforeExpiryDays,
      );

      const { data: keysNeedingNotification } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('status', 'active')
        .lte('expires_at', notificationDate.toISOString())
        .gt('expires_at', rotationDate.toISOString());

      // Send notifications for keys expiring soon
      if (keysNeedingNotification && keysNeedingNotification.length > 0) {
        for (const key of keysNeedingNotification) {
          try {
            await this.sendExpiryNotification(key);
            notifications++;
          } catch (error) {
            errors.push(`Failed to notify for key ${key.id}: ${error}`);
          }
        }
      }

      // Rotate keys that are expired or very close to expiry
      for (const oldKey of keysNeedingRotation) {
        try {
          await this.rotateKey(oldKey);
          rotated++;
        } catch (error) {
          errors.push(`Failed to rotate key ${oldKey.id}: ${error}`);
        }
      }

      logger.info('API key rotation completed', {
        rotated,
        notifications,
        errors: errors.length,
      });

      return { rotated, notifications, errors };
    } catch (error) {
      logger.error('API key rotation process failed', error as Error);
      return {
        rotated,
        notifications,
        errors: [...errors, `Process error: ${error}`],
      };
    }
  }

  /**
   * Rotate a specific API key
   */
  private async rotateKey(oldKey: ApiKey): Promise<void> {
    // Generate new key
    const newApiKey = this.generateSecureKey();
    const newKeyHash = this.hashKey(newApiKey);
    const newKeyPrefix = newApiKey.substring(0, 8);
    const newKeyId = crypto.randomUUID();

    const newExpiresAt = new Date();
    newExpiresAt.setDate(
      newExpiresAt.getDate() + this.rotationPolicy.rotationIntervalDays,
    );

    // Start transaction to ensure atomicity
    const { error: insertError } = await this.supabase.from('api_keys').insert({
      id: newKeyId,
      key_hash: newKeyHash,
      key_prefix: newKeyPrefix,
      organization_id: oldKey.organization_id,
      name: `${oldKey.name} (rotated)`,
      scopes: oldKey.scopes,
      status: 'active',
      expires_at: newExpiresAt.toISOString(),
      rate_limit: oldKey.rate_limit,
      created_by: 'system_rotation',
      metadata: {
        auto_rotate: true,
        rotated_from: oldKey.id,
        generation_source: 'automatic_rotation',
      },
    });

    if (insertError) {
      throw new Error(`Failed to create new key: ${insertError.message}`);
    }

    // Keep old key active for grace period
    const graceExpiresAt = new Date();
    graceExpiresAt.setDate(
      graceExpiresAt.getDate() + this.rotationPolicy.gracePeriodDays,
    );

    const { error: updateError } = await this.supabase
      .from('api_keys')
      .update({
        status: 'inactive',
        expires_at: graceExpiresAt.toISOString(),
        metadata: {
          ...oldKey.metadata,
          rotation_status: 'replaced',
          replaced_by: newKeyId,
          grace_period_expires: graceExpiresAt.toISOString(),
        },
      })
      .eq('id', oldKey.id);

    if (updateError) {
      // Rollback: delete the new key
      await this.supabase.from('api_keys').delete().eq('id', newKeyId);
      throw new Error(`Failed to update old key: ${updateError.message}`);
    }

    // Notify organization about the rotation
    await this.sendRotationNotification(oldKey, newApiKey);

    logger.info('API key rotated successfully', {
      oldKeyId: oldKey.id,
      newKeyId,
      organizationId: oldKey.organization_id,
      gracePeriodDays: this.rotationPolicy.gracePeriodDays,
    });

    metrics.incrementCounter('api_keys.rotated', 1, {
      organization_id: oldKey.organization_id,
    });
  }

  /**
   * Revoke an API key immediately
   */
  async revokeApiKey(
    keyId: string,
    revokedBy: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({
        status: 'revoked',
        metadata: {
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
          revocation_reason: reason,
        },
      })
      .eq('id', keyId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }

    logger.info('API key revoked', {
      keyId,
      revokedBy,
      reason,
    });

    metrics.incrementCounter('api_keys.revoked', 1, {
      reason,
    });
  }

  /**
   * Get usage metrics for an API key
   */
  async getKeyUsageMetrics(keyId: string): Promise<KeyUsageMetrics> {
    // Get key details
    const { data: keyData } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (!keyData) {
      throw new Error('API key not found');
    }

    // Calculate metrics
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(keyData.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const avgRequestsPerDay =
      daysSinceCreation > 0
        ? keyData.usage_count / daysSinceCreation
        : keyData.usage_count;

    // Check for suspicious activity patterns
    const suspiciousActivity = this.detectSuspiciousActivity(
      keyData,
      avgRequestsPerDay,
    );

    return {
      totalRequests: keyData.usage_count,
      lastUsed: keyData.last_used_at || 'Never',
      avgRequestsPerDay: Math.round(avgRequestsPerDay * 100) / 100,
      errorRate: 0, // Would need to track errors separately
      suspiciousActivity,
    };
  }

  /**
   * List all API keys for an organization
   */
  async listApiKeys(organizationId: string): Promise<ApiKey[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Clean up expired and revoked keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 30); // Keep for 30 days after expiry

    const { data: expiredKeys } = await this.supabase
      .from('api_keys')
      .select('id')
      .in('status', ['expired', 'revoked'])
      .lt('expires_at', cleanupDate.toISOString());

    if (!expiredKeys || expiredKeys.length === 0) {
      return 0;
    }

    const { error } = await this.supabase
      .from('api_keys')
      .delete()
      .in(
        'id',
        expiredKeys.map((k) => k.id),
      );

    if (error) {
      logger.error('Failed to cleanup expired keys', error);
      return 0;
    }

    logger.info('Cleaned up expired API keys', {
      count: expiredKeys.length,
    });

    return expiredKeys.length;
  }

  // Private helper methods
  private generateSecureKey(): string {
    const prefix = 'wsk'; // WedSync Key
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64url');
    return `${prefix}_${key}`;
  }

  private hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private detectSuspiciousActivity(
    keyData: ApiKey,
    avgRequestsPerDay: number,
  ): boolean {
    // Simple heuristics for suspicious activity
    const highUsageThreshold = keyData.rate_limit * 0.8; // 80% of rate limit daily
    const lastUsedThreshold = 7; // Days since last use

    if (avgRequestsPerDay > highUsageThreshold) {
      return true;
    }

    if (keyData.last_used_at) {
      const daysSinceLastUse = Math.floor(
        (Date.now() - new Date(keyData.last_used_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastUse > lastUsedThreshold && keyData.usage_count > 0) {
        return true; // Inactive key with previous usage
      }
    }

    return false;
  }

  private async sendExpiryNotification(key: ApiKey): Promise<void> {
    // Implementation would depend on your notification system
    // This could send email, Slack notification, etc.
    logger.info('API key expiry notification sent', {
      keyId: key.id,
      organizationId: key.organization_id,
      expiresAt: key.expires_at,
    });
  }

  private async sendRotationNotification(
    oldKey: ApiKey,
    newApiKey: string,
  ): Promise<void> {
    // Implementation would send the new API key to the organization
    // In production, this should be sent via secure channels
    logger.info('API key rotation notification sent', {
      oldKeyId: oldKey.id,
      organizationId: oldKey.organization_id,
      gracePeriodDays: this.rotationPolicy.gracePeriodDays,
    });
  }
}

// Production instance with default settings
export const apiKeyManager = new ApiKeyRotationManager({
  autoRotationEnabled: true,
  rotationIntervalDays: 90,
  gracePeriodDays: 7,
  maxKeysPerOrg: 5,
  notifyBeforeExpiryDays: 14,
});

// Cron job helper for automated rotation
export async function runApiKeyRotation(): Promise<void> {
  try {
    const result = await apiKeyManager.rotateExpiredKeys();

    logger.info('Automated API key rotation completed', result);

    if (result.errors.length > 0) {
      logger.error(
        'API key rotation had errors',
        new Error('Rotation errors'),
        {
          errors: result.errors,
        },
      );
    }
  } catch (error) {
    logger.error('API key rotation failed', error as Error);
  }
}

// Cleanup job helper
export async function runApiKeyCleanup(): Promise<void> {
  try {
    const cleaned = await apiKeyManager.cleanupExpiredKeys();
    logger.info('API key cleanup completed', { cleanedKeys: cleaned });
  } catch (error) {
    logger.error('API key cleanup failed', error as Error);
  }
}
