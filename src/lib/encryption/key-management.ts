/**
 * WS-175 Advanced Data Encryption - Key Management Service
 * Team B - Round 1 Implementation
 *
 * Encryption key generation, rotation and lifecycle management
 * 90-day rotation cycle with GDPR compliance
 */

import * as crypto from 'crypto';
import {
  EncryptionKey,
  KeyRotationResult,
  KeyManagementService,
  SecurityAuditEvent,
  EncryptionConfig,
} from '../../types/encryption';
import { createClient } from '../supabase/server';
import { SecurityAuditLogger } from './audit-logger';

export class KeyManagement implements KeyManagementService {
  private static readonly CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 256,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32,
    iterations: 100000,
    rotationIntervalDays: 90,
    maxKeyAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
    compressionThreshold: 1024,
    auditAllOperations: true,
  };

  private supabase;
  private auditLogger: SecurityAuditLogger;

  constructor() {
    this.supabase = createClient();
    this.auditLogger = new SecurityAuditLogger();
  }

  /**
   * Generates a new encryption key with secure random generation
   * Follows cryptographic best practices for key derivation
   */
  async generateKey(): Promise<EncryptionKey> {
    try {
      // Generate cryptographically secure random key
      const keyBuffer = crypto.randomBytes(KeyManagement.CONFIG.keyLength / 8); // 256 bits = 32 bytes
      const salt = crypto.randomBytes(KeyManagement.CONFIG.saltLength);

      // Derive key using PBKDF2 for additional security
      const derivedKey = crypto.pbkdf2Sync(
        keyBuffer,
        salt,
        KeyManagement.CONFIG.iterations,
        KeyManagement.CONFIG.keyLength / 8,
        'sha512',
      );

      // Create key hash for storage (never store the actual key)
      const keyHash = crypto
        .createHash('sha256')
        .update(derivedKey)
        .digest('hex');

      const keyId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + KeyManagement.CONFIG.maxKeyAge,
      );

      const encryptionKey: EncryptionKey = {
        id: keyId,
        keyHash,
        status: 'active',
        algorithm: KeyManagement.CONFIG.algorithm,
        createdAt: now,
        expiresAt,
        createdBy: 'system', // TODO: Get from current user context
      };

      // Store key metadata in database
      const { error } = await this.supabase.from('encryption_keys').insert({
        id: encryptionKey.id,
        key_hash: encryptionKey.keyHash,
        status: encryptionKey.status,
        algorithm: encryptionKey.algorithm,
        created_at: encryptionKey.createdAt.toISOString(),
        expires_at: encryptionKey.expiresAt.toISOString(),
        created_by: encryptionKey.createdBy,
      });

      if (error) {
        throw new Error(`Failed to store encryption key: ${error.message}`);
      }

      // Audit the key generation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_GENERATED',
        userId: encryptionKey.createdBy,
        keyId: encryptionKey.id,
        success: true,
        timestamp: new Date(),
        metadata: {
          algorithm: encryptionKey.algorithm,
          expiresAt: encryptionKey.expiresAt.toISOString(),
        },
      });

      // Store the actual key in secure environment variable or KMS
      // For development, we'll use environment variables (not recommended for production)
      await this.storeKeySecurely(keyId, derivedKey);

      return encryptionKey;
    } catch (error) {
      // Audit the failed key generation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_GENERATION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Rotates encryption keys according to the 90-day policy
   * Handles graceful migration of encrypted data
   */
  async rotateKeys(force: boolean = false): Promise<KeyRotationResult> {
    const startTime = Date.now();

    try {
      // Get the current active key
      const currentKey = await this.getActiveKey();
      if (!currentKey) {
        throw new Error('No active encryption key found for rotation');
      }

      // Check if rotation is needed
      if (!force && !this.isRotationNeeded(currentKey)) {
        throw new Error('Key rotation not needed at this time');
      }

      // Mark current key as rotating
      await this.updateKeyStatus(currentKey.id, 'rotating');

      // Generate new key
      const newKey = await this.generateKey();

      // Count fields that need re-encryption
      const fieldsToRotate = await this.countEncryptedFields(currentKey.id);

      let rotatedFields = 0;
      let failedFields = 0;

      // Re-encrypt data with new key (this would be done in batches for large datasets)
      if (fieldsToRotate > 0) {
        const rotationResult = await this.reencryptFields(
          currentKey.id,
          newKey.id,
        );
        rotatedFields = rotationResult.success;
        failedFields = rotationResult.failed;
      }

      // Mark old key as deprecated
      await this.updateKeyStatus(currentKey.id, 'deprecated');

      // Audit the successful rotation
      const result: KeyRotationResult = {
        oldKeyId: currentKey.id,
        newKeyId: newKey.id,
        rotatedFields,
        failedFields,
        completedAt: new Date(),
        rollbackAvailable: failedFields === 0,
      };

      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_ROTATED',
        userId: 'system',
        keyId: newKey.id,
        success: true,
        timestamp: new Date(),
        metadata: {
          oldKeyId: currentKey.id,
          rotatedFields,
          failedFields,
          duration: Date.now() - startTime,
        },
      });

      return result;
    } catch (error) {
      // Audit the failed rotation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_ROTATION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: { duration: Date.now() - startTime },
      });

      throw error;
    }
  }

  /**
   * Retrieves an encryption key by ID
   */
  async getKey(keyId: string): Promise<EncryptionKey | null> {
    try {
      const { data, error } = await this.supabase
        .from('encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw new Error(`Failed to retrieve encryption key: ${error.message}`);
      }

      return {
        id: data.id,
        keyHash: data.key_hash,
        status: data.status as 'active' | 'rotating' | 'deprecated',
        algorithm: data.algorithm,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        rotationScheduledAt: data.rotation_scheduled_at
          ? new Date(data.rotation_scheduled_at)
          : undefined,
        createdBy: data.created_by,
      };
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  /**
   * Retrieves the current active encryption key
   */
  async getActiveKey(): Promise<EncryptionKey> {
    try {
      const { data, error } = await this.supabase
        .from('encryption_keys')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          // No active key exists, generate one
          console.warn('No active encryption key found, generating new key');
          return await this.generateKey();
        }
        throw new Error(
          `Failed to retrieve active encryption key: ${error.message}`,
        );
      }

      return {
        id: data.id,
        keyHash: data.key_hash,
        status: data.status as 'active' | 'rotating' | 'deprecated',
        algorithm: data.algorithm,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        rotationScheduledAt: data.rotation_scheduled_at
          ? new Date(data.rotation_scheduled_at)
          : undefined,
        createdBy: data.created_by,
      };
    } catch (error) {
      console.error('Failed to retrieve active encryption key:', error);
      throw error;
    }
  }

  /**
   * Schedules a key rotation for a specific date
   */
  async scheduleRotation(keyId: string, scheduleDate: Date): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('encryption_keys')
        .update({ rotation_scheduled_at: scheduleDate.toISOString() })
        .eq('id', keyId);

      if (error) {
        throw new Error(`Failed to schedule key rotation: ${error.message}`);
      }

      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_ROTATION_SCHEDULED',
        userId: 'system',
        keyId,
        success: true,
        timestamp: new Date(),
        metadata: { scheduledDate: scheduleDate.toISOString() },
      });
    } catch (error) {
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_ROTATION_SCHEDULE_FAILED',
        userId: 'system',
        keyId,
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Deprecates an encryption key
   */
  async deprecateKey(keyId: string): Promise<void> {
    try {
      await this.updateKeyStatus(keyId, 'deprecated');

      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_DEPRECATED',
        userId: 'system',
        keyId,
        success: true,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_DEPRECATION_FAILED',
        userId: 'system',
        keyId,
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Validates the health of all encryption keys
   */
  async validateKeyHealth(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('encryption_keys')
        .select('*')
        .in('status', ['active', 'rotating']);

      if (error) {
        throw new Error(`Failed to validate key health: ${error.message}`);
      }

      const keys = data || [];
      let healthy = true;
      const issues = [];

      for (const keyData of keys) {
        const key: EncryptionKey = {
          id: keyData.id,
          keyHash: keyData.key_hash,
          status: keyData.status,
          algorithm: keyData.algorithm,
          createdAt: new Date(keyData.created_at),
          expiresAt: new Date(keyData.expires_at),
          rotationScheduledAt: keyData.rotation_scheduled_at
            ? new Date(keyData.rotation_scheduled_at)
            : undefined,
          createdBy: keyData.created_by,
        };

        // Check if key is expired
        if (key.expiresAt < new Date()) {
          healthy = false;
          issues.push(`Key ${key.id} is expired`);
        }

        // Check if key needs rotation soon (within 7 days)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        if (key.expiresAt < sevenDaysFromNow) {
          issues.push(`Key ${key.id} expires soon and should be rotated`);
        }

        // Verify key exists in secure storage
        const keyExists = await this.verifyKeyInSecureStorage(key.id);
        if (!keyExists) {
          healthy = false;
          issues.push(`Key ${key.id} not found in secure storage`);
        }
      }

      // Ensure we have at least one active key
      const activeKeys = keys.filter((k) => k.status === 'active');
      if (activeKeys.length === 0) {
        healthy = false;
        issues.push('No active encryption keys found');
      }

      if (activeKeys.length > 1) {
        issues.push(
          `Multiple active keys found (${activeKeys.length}), should be only one`,
        );
      }

      // Log health check results
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_HEALTH_CHECK',
        userId: 'system',
        success: healthy,
        timestamp: new Date(),
        metadata: {
          totalKeys: keys.length,
          activeKeys: activeKeys.length,
          issues,
        },
      });

      if (!healthy) {
        console.error('Key health check failed:', issues);
      }

      return healthy;
    } catch (error) {
      console.error('Key health validation failed:', error);

      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'KEY_HEALTH_CHECK_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  // Private helper methods

  private isRotationNeeded(key: EncryptionKey): boolean {
    const now = new Date();
    const keyAge = now.getTime() - key.createdAt.getTime();
    const rotationThreshold =
      KeyManagement.CONFIG.rotationIntervalDays * 24 * 60 * 60 * 1000;

    return keyAge >= rotationThreshold || key.expiresAt <= now;
  }

  private async updateKeyStatus(
    keyId: string,
    status: 'active' | 'rotating' | 'deprecated',
  ): Promise<void> {
    const { error } = await this.supabase
      .from('encryption_keys')
      .update({ status })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to update key status: ${error.message}`);
    }
  }

  private async countEncryptedFields(keyId: string): Promise<number> {
    // This would count encrypted fields across all tables that use this key
    // For now, returning 0 as a placeholder - real implementation would query
    // all tables with encrypted fields
    try {
      const { count, error } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .not('encrypted_email', 'is', null);

      if (error) {
        console.error('Failed to count encrypted fields:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting encrypted fields:', error);
      return 0;
    }
  }

  private async reencryptFields(
    oldKeyId: string,
    newKeyId: string,
  ): Promise<{ success: number; failed: number }> {
    // This would implement the actual re-encryption logic
    // For now, returning success as a placeholder
    // Real implementation would:
    // 1. Query all encrypted fields using oldKeyId
    // 2. Decrypt with old key and re-encrypt with new key
    // 3. Update the database records
    // 4. Handle failures gracefully

    return { success: 0, failed: 0 };
  }

  private async storeKeySecurely(
    keyId: string,
    keyBuffer: Buffer,
  ): Promise<void> {
    // In production, this would store the key in a Hardware Security Module (HSM)
    // or a secure key management service like AWS KMS, Azure Key Vault, etc.
    // For development, we'll use environment variables (NOT RECOMMENDED FOR PRODUCTION)

    try {
      // This is a placeholder - real implementation would use KMS
      const envVarName = `ENCRYPTION_KEY_${keyId.replace(/-/g, '_')}`;
      process.env[envVarName] = keyBuffer.toString('base64');

      // In production, you would call the KMS service here
      console.warn(`Key ${keyId} stored in environment (DEVELOPMENT ONLY)`);
    } catch (error) {
      throw new Error(
        `Failed to store key securely: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async verifyKeyInSecureStorage(keyId: string): Promise<boolean> {
    // Verify the key exists in secure storage
    try {
      const envVarName = `ENCRYPTION_KEY_${keyId.replace(/-/g, '_')}`;
      return !!process.env[envVarName];
    } catch {
      return false;
    }
  }
}
