/**
 * WS-175 Advanced Data Encryption - Field Encryption Service
 * Team B - Round 1 Core Implementation
 *
 * Field-level encryption service for GDPR compliance
 * and wedding supplier data protection
 */

import * as crypto from 'crypto';
import {
  EncryptionResult,
  EncryptionContext,
  EncryptionOptions,
  DecryptionOptions,
  FieldEncryptionService,
  SecurityAuditEvent,
  EncryptionError,
  EncryptionConfig,
} from '../../types/encryption';
import { KeyManagement } from './key-management';
import { SecurityAuditLogger } from './audit-logger';

export class FieldEncryption implements FieldEncryptionService {
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

  private keyManagement: KeyManagement;
  private auditLogger: SecurityAuditLogger;

  constructor() {
    this.keyManagement = new KeyManagement();
    this.auditLogger = new SecurityAuditLogger();
  }

  /**
   * Encrypts a field value with the active encryption key
   * Follows GDPR Article 32 - Security of processing
   */
  async encryptField(
    plaintext: string,
    context: EncryptionContext,
    options: EncryptionOptions = {},
  ): Promise<EncryptionResult> {
    const startTime = Date.now();

    try {
      // Input validation
      FieldEncryption.validatePlaintext(plaintext);
      FieldEncryption.validateContext(context);

      // Get the active encryption key
      const keyData = await this.keyManagement.getActiveKey();
      if (!keyData) {
        throw FieldEncryption.createEncryptionError(
          'ENCRYPTION_KEY_NOT_FOUND',
          'No active encryption key available',
          context,
        );
      }

      // Check key age and rotation needs
      if (FieldEncryption.isKeyExpired(keyData)) {
        throw FieldEncryption.createEncryptionError(
          'ENCRYPTION_KEY_EXPIRED',
          'Encryption key has expired',
          context,
          keyData.id,
        );
      }

      // Generate initialization vector
      const iv = crypto.randomBytes(FieldEncryption.CONFIG.ivLength);

      // Create cipher with additional authenticated data
      const cipher = crypto.createCipheriv(
        FieldEncryption.CONFIG.algorithm,
        Buffer.from(keyData.keyHash, 'hex'),
        iv,
      ) as crypto.CipherGCM;
      const aad = FieldEncryption.createAdditionalData(context);
      cipher.setAAD(aad);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const result: EncryptionResult = {
        encryptedData: encrypted,
        keyId: keyData.id,
        algorithm: FieldEncryption.CONFIG.algorithm,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: 1,
      };

      // Audit the encryption operation
      await this.auditEncryption(
        context,
        keyData.id,
        true,
        Date.now() - startTime,
      );

      return result;
    } catch (error) {
      // Audit the failed encryption
      await this.auditEncryption(
        context,
        undefined,
        false,
        Date.now() - startTime,
        error,
      );

      if (error instanceof EncryptionError) {
        throw error;
      }

      throw FieldEncryption.createEncryptionError(
        'ENCRYPTION_OPERATION_FAILED',
        'Field encryption failed',
        context,
        undefined,
        error,
      );
    }
  }

  /**
   * Decrypts a field value using the specified key
   * Includes audit logging for GDPR compliance
   */
  async decryptField(
    encryptedData: EncryptionResult,
    context: EncryptionContext,
    options: DecryptionOptions = {},
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Validate encrypted data
      FieldEncryption.validateEncryptedDataStatic(encryptedData);
      FieldEncryption.validateContext(context);

      // Get the decryption key
      const keyData = await this.keyManagement.getKey(encryptedData.keyId);
      if (!keyData) {
        throw FieldEncryption.createEncryptionError(
          'DECRYPTION_KEY_NOT_FOUND',
          `Decryption key ${encryptedData.keyId} not found`,
          context,
          encryptedData.keyId,
        );
      }

      // Check if we should require active keys only
      if (options.requireActiveKey && keyData.status !== 'active') {
        throw FieldEncryption.createEncryptionError(
          'DECRYPTION_KEY_INACTIVE',
          'Decryption attempted with inactive key',
          context,
          keyData.id,
        );
      }

      // Create decipher
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        Buffer.from(keyData.keyHash, 'hex'),
        iv,
      ) as crypto.DecipherGCM;

      // Set additional authenticated data
      const aad = FieldEncryption.createAdditionalData(context);
      decipher.setAAD(aad);

      // Set auth tag
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      // Decrypt the data
      let decrypted = decipher.update(
        encryptedData.encryptedData,
        'hex',
        'utf8',
      );
      decrypted += decipher.final('utf8');

      // Audit the decryption operation
      if (options.auditAccess !== false) {
        await this.auditDecryption(
          context,
          encryptedData.keyId,
          true,
          Date.now() - startTime,
        );
      }

      return decrypted;
    } catch (error) {
      // Audit the failed decryption
      await this.auditDecryption(
        context,
        encryptedData?.keyId,
        false,
        Date.now() - startTime,
        error,
      );

      if (error instanceof EncryptionError) {
        throw error;
      }

      throw FieldEncryption.createEncryptionError(
        'DECRYPTION_OPERATION_FAILED',
        'Field decryption failed',
        context,
        encryptedData?.keyId,
        error,
      );
    }
  }

  /**
   * Encrypts multiple fields in a batch operation
   * Optimized for performance with single key retrieval
   */
  async encryptBulk(
    fields: Array<{ data: string; context: EncryptionContext }>,
  ): Promise<EncryptionResult[]> {
    const startTime = Date.now();

    try {
      // Get the active key once for all operations
      const keyData = await this.keyManagement.getActiveKey();
      if (!keyData) {
        throw FieldEncryption.createEncryptionError(
          'ENCRYPTION_KEY_NOT_FOUND',
          'No active encryption key available for bulk operation',
        );
      }

      const results: EncryptionResult[] = [];

      for (const field of fields) {
        try {
          // Use internal encryption without additional key lookup
          const result = await FieldEncryption.encryptWithKey(
            field.data,
            field.context,
            keyData,
          );
          results.push(result);
        } catch (error) {
          // Continue with other fields but audit the failure
          await this.auditEncryption(
            field.context,
            keyData.id,
            false,
            0,
            error,
          );
          throw error;
        }
      }

      // Audit successful bulk encryption
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_ENCRYPTION_COMPLETED',
        userId: fields[0]?.context.userId || 'system',
        success: true,
        timestamp: new Date(),
        metadata: {
          fieldsCount: fields.length,
          duration: Date.now() - startTime,
        },
      });

      return results;
    } catch (error) {
      // Audit failed bulk encryption
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_ENCRYPTION_FAILED',
        userId: fields[0]?.context.userId || 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fieldsCount: fields.length,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Decrypts multiple fields in a batch operation
   */
  async decryptBulk(
    fields: Array<{ data: EncryptionResult; context: EncryptionContext }>,
  ): Promise<string[]> {
    const startTime = Date.now();

    try {
      const results: string[] = [];
      const keyCache = new Map<string, any>();

      for (const field of fields) {
        try {
          // Cache keys to avoid repeated lookups
          if (!keyCache.has(field.data.keyId)) {
            const keyData = await this.keyManagement.getKey(field.data.keyId);
            keyCache.set(field.data.keyId, keyData);
          }

          const keyData = keyCache.get(field.data.keyId);
          const result = await FieldEncryption.decryptWithKey(
            field.data,
            field.context,
            keyData,
          );
          results.push(result);
        } catch (error) {
          await this.auditDecryption(
            field.context,
            field.data.keyId,
            false,
            0,
            error,
          );
          throw error;
        }
      }

      // Audit successful bulk decryption
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_DECRYPTION_COMPLETED',
        userId: fields[0]?.context.userId || 'system',
        success: true,
        timestamp: new Date(),
        metadata: {
          fieldsCount: fields.length,
          duration: Date.now() - startTime,
        },
      });

      return results;
    } catch (error) {
      // Audit failed bulk decryption
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_DECRYPTION_FAILED',
        userId: fields[0]?.context.userId || 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fieldsCount: fields.length,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Validates encrypted data structure and integrity
   */
  validateEncryptedData(data: EncryptionResult): boolean {
    return FieldEncryption.validateEncryptedDataStatic(data);
  }

  /**
   * Static version of validateEncryptedData for internal use
   */
  private static validateEncryptedDataStatic(data: EncryptionResult): boolean {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      const required = [
        'encryptedData',
        'keyId',
        'algorithm',
        'iv',
        'authTag',
        'version',
      ];
      for (const field of required) {
        if (!data[field as keyof EncryptionResult]) {
          return false;
        }
      }

      // Validate hex strings
      if (
        !FieldEncryption.isValidHex(data.encryptedData) ||
        !FieldEncryption.isValidHex(data.iv) ||
        !FieldEncryption.isValidHex(data.authTag)
      ) {
        return false;
      }

      // Validate algorithm
      if (data.algorithm !== FieldEncryption.CONFIG.algorithm) {
        return false;
      }

      // Validate version
      if (data.version !== 1) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private static validatePlaintext(plaintext: string): void {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext: must be a non-empty string');
    }

    if (plaintext.length === 0) {
      throw new Error('Invalid plaintext: cannot be empty');
    }

    if (plaintext.length > 64000) {
      // Reasonable limit for field data
      throw new Error('Invalid plaintext: exceeds maximum length');
    }
  }

  private static validateContext(context: EncryptionContext): void {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid encryption context: must be an object');
    }

    if (!context.userId || typeof context.userId !== 'string') {
      throw new Error('Invalid encryption context: userId is required');
    }

    if (!context.fieldType || typeof context.fieldType !== 'string') {
      throw new Error('Invalid encryption context: fieldType is required');
    }
  }

  private static isKeyExpired(key: any): boolean {
    return new Date(key.expiresAt) < new Date();
  }

  private static createAdditionalData(context: EncryptionContext): Buffer {
    const aadData = {
      userId: context.userId,
      fieldType: context.fieldType,
      tableName: context.tableName,
      recordId: context.recordId,
    };
    return Buffer.from(JSON.stringify(aadData));
  }

  private static async encryptWithKey(
    plaintext: string,
    context: EncryptionContext,
    keyData: any,
  ): Promise<EncryptionResult> {
    const iv = crypto.randomBytes(FieldEncryption.CONFIG.ivLength);
    const cipher = crypto.createCipheriv(
      FieldEncryption.CONFIG.algorithm,
      Buffer.from(keyData.keyHash, 'hex'),
      iv,
    ) as crypto.CipherGCM;
    const aad = FieldEncryption.createAdditionalData(context);
    cipher.setAAD(aad);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      keyId: keyData.id,
      algorithm: FieldEncryption.CONFIG.algorithm,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      version: 1,
    };
  }

  private static async decryptWithKey(
    encryptedData: EncryptionResult,
    context: EncryptionContext,
    keyData: any,
  ): Promise<string> {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      Buffer.from(keyData.keyHash, 'hex'),
      iv,
    ) as crypto.DecipherGCM;
    const aad = FieldEncryption.createAdditionalData(context);
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private static isValidHex(value: string): boolean {
    return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
  }

  private static createEncryptionError(
    code: string,
    message: string,
    context?: EncryptionContext,
    keyId?: string,
    cause?: any,
  ): EncryptionError {
    const error = new Error(message) as EncryptionError;
    error.name = 'EncryptionError';
    error.code = code;
    error.context = context;
    error.keyId = keyId;
    error.operation = code.includes('ENCRYPTION') ? 'encryption' : 'decryption';
    error.recoverable = !code.includes('KEY_NOT_FOUND');

    if (cause) {
      error.cause = cause;
    }

    return error;
  }

  private async auditEncryption(
    context: EncryptionContext,
    keyId: string | undefined,
    success: boolean,
    duration: number,
    error?: any,
  ): Promise<void> {
    await this.auditLogger.log({
      id: crypto.randomUUID(),
      action: 'FIELD_ENCRYPTED',
      userId: context.userId,
      fieldType: context.fieldType,
      keyId,
      success,
      timestamp: new Date(),
      errorMessage: error ? error.message || 'Unknown error' : undefined,
      metadata: {
        duration,
        tableName: context.tableName,
        recordId: context.recordId,
      },
    });
  }

  private async auditDecryption(
    context: EncryptionContext,
    keyId: string | undefined,
    success: boolean,
    duration: number,
    error?: any,
  ): Promise<void> {
    await this.auditLogger.log({
      id: crypto.randomUUID(),
      action: 'FIELD_DECRYPTED',
      userId: context.userId,
      fieldType: context.fieldType,
      keyId,
      success,
      timestamp: new Date(),
      errorMessage: error ? error.message || 'Unknown error' : undefined,
      metadata: {
        duration,
        tableName: context.tableName,
        recordId: context.recordId,
      },
    });
  }
}
