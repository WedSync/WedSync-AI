/**
 * Encryption Service
 * Provides encryption/decryption utilities for sensitive data
 * Uses industry-standard encryption algorithms
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
  createHmac,
} from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  tag?: string;
}

export interface DecryptionOptions {
  encryptedData: string;
  iv: string;
  salt: string;
  tag?: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly tagLength = 16; // 128 bits

  /**
   * Encrypt sensitive data
   */
  async encrypt(data: string, password?: string): Promise<EncryptionResult> {
    try {
      const plaintext = Buffer.from(data, 'utf8');
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Use provided password or default from environment
      const key = this.deriveKey(
        password || process.env.ENCRYPTION_KEY || 'default-key',
        salt,
      );

      const cipher = createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(
    options: DecryptionOptions,
    password?: string,
  ): Promise<string> {
    try {
      const encryptedBuffer = Buffer.from(options.encryptedData, 'base64');
      const iv = Buffer.from(options.iv, 'base64');
      const salt = Buffer.from(options.salt, 'base64');
      const tag = options.tag ? Buffer.from(options.tag, 'base64') : null;

      // Use provided password or default from environment
      const key = this.deriveKey(
        password || process.env.ENCRYPTION_KEY || 'default-key',
        salt,
      );

      const decipher = createDecipheriv(this.algorithm, key, iv);

      if (tag) {
        decipher.setAuthTag(tag);
      }

      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Hash password with salt (for user authentication)
   */
  async hashPassword(
    password: string,
  ): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(this.saltLength);
    const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha256');

    return {
      hash: hash.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(
    password: string,
    hash: string,
    salt: string,
  ): Promise<boolean> {
    try {
      const saltBuffer = Buffer.from(salt, 'base64');
      const hashBuffer = Buffer.from(hash, 'base64');
      const testHash = pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha256');

      return hashBuffer.equals(testHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create HMAC signature for data integrity
   */
  async createSignature(data: string, secret?: string): Promise<string> {
    const secretKey =
      secret || process.env.SIGNING_SECRET || 'default-signing-key';
    const hmac = createHmac('sha256', secretKey);
    hmac.update(data);
    return hmac.digest('base64');
  }

  /**
   * Verify HMAC signature
   */
  async verifySignature(
    data: string,
    signature: string,
    secret?: string,
  ): Promise<boolean> {
    try {
      const expectedSignature = await this.createSignature(data, secret);
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt wedding-specific sensitive data (special handling for PII)
   */
  async encryptWeddingData(data: {
    guestList?: any[];
    vendorDetails?: any[];
    personalNotes?: string;
    financialInfo?: any;
  }): Promise<EncryptionResult> {
    // Add wedding-specific metadata for compliance tracking
    const dataWithMetadata = {
      ...data,
      encryptedAt: new Date().toISOString(),
      dataType: 'wedding_sensitive',
      gdprCategory: 'personal_data',
    };

    return this.encrypt(JSON.stringify(dataWithMetadata));
  }

  /**
   * Decrypt wedding-specific sensitive data
   */
  async decryptWeddingData(options: DecryptionOptions): Promise<any> {
    const decryptedString = await this.decrypt(options);
    const data = JSON.parse(decryptedString);

    // Remove metadata before returning
    const { encryptedAt, dataType, gdprCategory, ...actualData } = data;

    return actualData;
  }

  /**
   * Generate secure API keys
   */
  generateApiKey(prefix = 'wds'): string {
    const randomPart = randomBytes(24).toString('base64url');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Generate secure webhook secrets
   */
  generateWebhookSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Derive encryption key from password and salt
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt credentials for third-party integrations
   */
  async encryptIntegrationCredentials(
    credentials: Record<string, string>,
  ): Promise<EncryptionResult> {
    const credentialsWithMetadata = {
      ...credentials,
      encryptedAt: new Date().toISOString(),
      type: 'integration_credentials',
    };

    return this.encrypt(JSON.stringify(credentialsWithMetadata));
  }

  /**
   * Decrypt credentials for third-party integrations
   */
  async decryptIntegrationCredentials(
    options: DecryptionOptions,
  ): Promise<Record<string, string>> {
    const decryptedString = await this.decrypt(options);
    const data = JSON.parse(decryptedString);

    // Remove metadata
    const { encryptedAt, type, ...credentials } = data;

    return credentials;
  }

  /**
   * Check if encryption is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.ENCRYPTION_KEY && process.env.SIGNING_SECRET);
  }

  /**
   * Get encryption status for monitoring
   */
  getStatus(): {
    configured: boolean;
    algorithm: string;
    keyLength: number;
    lastHealthCheck: string;
  } {
    return {
      configured: this.isConfigured(),
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      lastHealthCheck: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
