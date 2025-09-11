/**
 * Backup Encryption Service
 * Handles encryption and decryption of backup data
 */

import * as crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
}

export interface DecryptionOptions {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
}

export interface BackupEncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

export class BackupEncryption {
  private config: BackupEncryptionConfig;
  private encryptionKey: Buffer;

  constructor(encryptionKey?: string) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16, // 128 bits
      tagLength: 16, // 128 bits
    };

    // Use provided key or generate from environment
    const keyString = encryptionKey || process.env.BACKUP_ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('Backup encryption key is required');
    }

    // Derive key from string using PBKDF2
    this.encryptionKey = crypto.pbkdf2Sync(
      keyString,
      'wedsync-backup-salt', // Static salt for consistency
      100000, // iterations
      this.config.keyLength,
      'sha256',
    );
  }

  /**
   * Encrypt backup data
   */
  encrypt(data: string | Buffer): EncryptionResult {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.config.ivLength);

      // Create cipher
      const cipher = crypto.createCipherGCM(
        this.config.algorithm,
        this.encryptionKey,
        iv,
      );

      // Convert data to buffer if string
      const dataBuffer =
        typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final(),
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv,
        authTag,
        algorithm: this.config.algorithm,
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Decrypt backup data
   */
  decrypt(options: DecryptionOptions): Buffer {
    try {
      // Create decipher
      const decipher = crypto.createDecipherGCM(
        options.algorithm,
        this.encryptionKey,
        options.iv,
      );

      // Set auth tag
      decipher.setAuthTag(options.authTag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(options.encryptedData),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Encrypt and encode backup data to base64
   */
  encryptToBase64(data: string | Buffer): string {
    const result = this.encrypt(data);

    // Combine all components into a single base64 string
    const combined = Buffer.concat([
      result.iv,
      result.authTag,
      result.encryptedData,
    ]);

    return combined.toString('base64');
  }

  /**
   * Decrypt from base64 encoded string
   */
  decryptFromBase64(encodedData: string): Buffer {
    try {
      const combined = Buffer.from(encodedData, 'base64');

      // Extract components
      const iv = combined.subarray(0, this.config.ivLength);
      const authTag = combined.subarray(
        this.config.ivLength,
        this.config.ivLength + this.config.tagLength,
      );
      const encryptedData = combined.subarray(
        this.config.ivLength + this.config.tagLength,
      );

      return this.decrypt({
        encryptedData,
        iv,
        authTag,
        algorithm: this.config.algorithm,
      });
    } catch (error) {
      throw new Error(
        `Base64 decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate a secure backup encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate encryption key strength
   */
  static validateKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Key should be at least 32 characters (256 bits when hex encoded)
    if (key.length < 32) {
      return false;
    }

    // Check for sufficient entropy (basic check)
    const uniqueChars = new Set(key.toLowerCase()).size;
    if (uniqueChars < 8) {
      return false;
    }

    return true;
  }

  /**
   * Create encrypted backup metadata
   */
  createBackupMetadata(metadata: Record<string, any>): string {
    const metadataString = JSON.stringify({
      ...metadata,
      timestamp: new Date().toISOString(),
      version: '1.0',
      encryption: {
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength,
      },
    });

    return this.encryptToBase64(metadataString);
  }

  /**
   * Decrypt backup metadata
   */
  decryptBackupMetadata(encryptedMetadata: string): Record<string, any> {
    try {
      const decryptedBuffer = this.decryptFromBase64(encryptedMetadata);
      const metadataString = decryptedBuffer.toString('utf8');
      return JSON.parse(metadataString);
    } catch (error) {
      throw new Error(
        `Failed to decrypt backup metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Encrypt file stream (for large backups)
   */
  createEncryptionStream(): crypto.CipherGCM {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipherGCM(
      this.config.algorithm,
      this.encryptionKey,
      iv,
    );

    // Store IV and cipher for later use
    (cipher as any)._iv = iv;

    return cipher;
  }

  /**
   * Create decryption stream
   */
  createDecryptionStream(iv: Buffer, authTag: Buffer): crypto.DecipherGCM {
    const decipher = crypto.createDecipherGCM(
      this.config.algorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    return decipher;
  }

  /**
   * Hash backup data for integrity verification
   */
  hashData(data: string | Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Verify backup data integrity
   */
  verifyIntegrity(data: string | Buffer, expectedHash: string): boolean {
    const actualHash = this.hashData(data);
    return actualHash === expectedHash;
  }
}

// Export singleton instance
export const backupEncryption = new BackupEncryption();

// Export utility functions
export const generateBackupKey = BackupEncryption.generateKey;
export const validateBackupKey = BackupEncryption.validateKey;
