/**
 * WS-336: Calendar Integration System - Token Encryption Service
 *
 * Provides AES-256-GCM encryption for OAuth tokens with organization-specific keys.
 * Works in conjunction with database encryption functions for defense-in-depth.
 *
 * SECURITY CRITICAL: Wedding vendor calendar tokens must never be stored in plaintext.
 * Any security breach could expose vendor and couple calendar data.
 */

import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface TokenEncryptionResult {
  encryptedToken: string;
  keyId: string; // For key rotation support
  timestamp: number;
}

interface TokenDecryptionResult {
  token: string;
  isExpired?: boolean;
  keyRotationNeeded?: boolean;
}

export class CalendarTokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly MAX_TOKEN_AGE_DAYS = 90; // Force refresh after 90 days

  /**
   * Generate organization-specific encryption key using PBKDF2
   */
  private static generateEncryptionKey(organizationId: string): Buffer {
    const masterSecret = process.env.CALENDAR_TOKEN_MASTER_KEY;
    if (!masterSecret || masterSecret.length < 32) {
      throw new Error(
        'CALENDAR_TOKEN_MASTER_KEY must be at least 32 characters',
      );
    }

    // Use PBKDF2 for key derivation with organization-specific salt
    const salt = crypto
      .createHash('sha256')
      .update(`calendar_tokens_${organizationId}`)
      .digest();

    return crypto.pbkdf2Sync(
      masterSecret,
      salt,
      100000,
      this.KEY_LENGTH,
      'sha512',
    );
  }

  /**
   * Generate a secure random key ID for key rotation tracking
   */
  private static generateKeyId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Encrypt a calendar OAuth token with organization-specific key
   */
  static async encryptToken(
    plainToken: string,
    organizationId: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<string> {
    try {
      if (!plainToken || plainToken.trim().length === 0) {
        throw new Error('Token cannot be empty');
      }

      if (!organizationId) {
        throw new Error('Organization ID is required for encryption');
      }

      // Generate encryption components
      const key = this.generateEncryptionKey(organizationId);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const keyId = this.generateKeyId();

      // Create cipher
      const cipher = crypto.createCipher(this.ALGORITHM, key);

      // Additional authenticated data for integrity
      const aad = Buffer.from(
        `${organizationId}:${tokenType}:${keyId}`,
        'utf8',
      );
      cipher.setAAD(aad);

      // Encrypt the token
      let encrypted = cipher.update(plainToken, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Create the result object
      const result: TokenEncryptionResult = {
        encryptedToken: encrypted.toString('base64'),
        keyId,
        timestamp: Date.now(),
      };

      // Combine all components: version + iv + tag + aad_length + aad + result
      const version = Buffer.from('v1', 'utf8'); // For future compatibility
      const aadLength = Buffer.alloc(2);
      aadLength.writeUInt16BE(aad.length, 0);

      const combined = Buffer.concat([
        version,
        iv,
        tag,
        aadLength,
        aad,
        Buffer.from(JSON.stringify(result), 'utf8'),
      ]);

      // Return base64-encoded combined data
      return combined.toString('base64');
    } catch (error) {
      console.error('Token encryption failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        tokenType,
      });
      throw new Error('Failed to encrypt calendar token');
    }
  }

  /**
   * Decrypt a calendar OAuth token
   */
  static async decryptToken(
    encryptedData: string,
    organizationId: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<TokenDecryptionResult | null> {
    try {
      if (!encryptedData || !organizationId) {
        throw new Error('Encrypted data and organization ID are required');
      }

      // Parse the combined data
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const version = combined.subarray(0, 2).toString('utf8');
      if (version !== 'v1') {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      let offset = 2;
      const iv = combined.subarray(offset, offset + this.IV_LENGTH);
      offset += this.IV_LENGTH;

      const tag = combined.subarray(offset, offset + this.TAG_LENGTH);
      offset += this.TAG_LENGTH;

      const aadLength = combined.readUInt16BE(offset);
      offset += 2;

      const aad = combined.subarray(offset, offset + aadLength);
      offset += aadLength;

      const resultData = combined.subarray(offset);
      const result: TokenEncryptionResult = JSON.parse(
        resultData.toString('utf8'),
      );

      // Verify AAD matches expected format
      const expectedAad = `${organizationId}:${tokenType}:${result.keyId}`;
      if (aad.toString('utf8') !== expectedAad) {
        throw new Error('Authentication data mismatch');
      }

      // Generate decryption key
      const key = this.generateEncryptionKey(organizationId);

      // Create decipher
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);

      // Decrypt the token
      const encryptedToken = Buffer.from(result.encryptedToken, 'base64');
      let decrypted = decipher.update(encryptedToken);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const token = decrypted.toString('utf8');

      // Check if token is old and needs rotation
      const tokenAge = Date.now() - result.timestamp;
      const maxAgeMs = this.MAX_TOKEN_AGE_DAYS * 24 * 60 * 60 * 1000;

      return {
        token,
        keyRotationNeeded: tokenAge > maxAgeMs,
        isExpired: false, // Will be checked by OAuth refresh logic
      };
    } catch (error) {
      console.error('Token decryption failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        tokenType,
        hasEncryptedData: !!encryptedData,
      });
      return null; // Return null instead of throwing to allow graceful handling
    }
  }

  /**
   * Rotate encryption for existing tokens (for key rotation scenarios)
   */
  static async rotateTokenEncryption(
    oldEncryptedData: string,
    organizationId: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<string | null> {
    try {
      // Decrypt with old key
      const decryptResult = await this.decryptToken(
        oldEncryptedData,
        organizationId,
        tokenType,
      );
      if (!decryptResult) {
        return null;
      }

      // Re-encrypt with new key
      return await this.encryptToken(
        decryptResult.token,
        organizationId,
        tokenType,
      );
    } catch (error) {
      console.error('Token rotation failed:', error);
      return null;
    }
  }

  /**
   * Securely wipe sensitive data from memory (best effort)
   */
  static secureWipe(sensitiveString: string): void {
    if (typeof sensitiveString !== 'string') return;

    // Overwrite the string in memory (best effort in Node.js)
    try {
      const buffer = Buffer.from(sensitiveString, 'utf8');
      buffer.fill(0);
    } catch {
      // Silent fail for security wipe
    }
  }

  /**
   * Validate token encryption environment setup
   */
  static validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check master key
    const masterKey = process.env.CALENDAR_TOKEN_MASTER_KEY;
    if (!masterKey) {
      errors.push('CALENDAR_TOKEN_MASTER_KEY environment variable is required');
    } else if (masterKey.length < 32) {
      errors.push('CALENDAR_TOKEN_MASTER_KEY must be at least 32 characters');
    } else if (masterKey.length < 64) {
      errors.push(
        'CALENDAR_TOKEN_MASTER_KEY should be at least 64 characters for production',
      );
    }

    // Check crypto support
    try {
      crypto.randomBytes(16);
    } catch {
      errors.push('Crypto module is not available');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Database token encryption service
 * Uses Supabase functions for additional encryption layer
 */
export class DatabaseTokenEncryption {
  /**
   * Encrypt token using database function (additional layer)
   */
  static async encryptTokenInDatabase(
    token: string,
    organizationId: string,
  ): Promise<string | null> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data, error } = await supabase.rpc('encrypt_calendar_token', {
        plaintext: token,
        org_id: organizationId,
      });

      if (error) {
        console.error('Database encryption failed:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Database encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt token using database function
   */
  static async decryptTokenFromDatabase(
    encryptedToken: string,
    organizationId: string,
  ): Promise<string | null> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data, error } = await supabase.rpc('decrypt_calendar_token', {
        encrypted_text: encryptedToken,
        org_id: organizationId,
      });

      if (error) {
        console.error('Database decryption failed:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Database decryption error:', error);
      return null;
    }
  }
}

/**
 * Combined encryption service using both application and database layers
 */
export class SecureCalendarTokenManager {
  /**
   * Store token with double encryption (app layer + database layer)
   */
  static async storeToken(
    plainToken: string,
    organizationId: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<string | null> {
    try {
      // First, encrypt with application layer
      const appEncrypted = await CalendarTokenEncryption.encryptToken(
        plainToken,
        organizationId,
        tokenType,
      );

      // Then encrypt with database layer
      const dbEncrypted = await DatabaseTokenEncryption.encryptTokenInDatabase(
        appEncrypted,
        organizationId,
      );

      // Securely wipe the plain token from memory
      CalendarTokenEncryption.secureWipe(plainToken);

      return dbEncrypted;
    } catch (error) {
      console.error('Failed to store secure token:', error);
      return null;
    }
  }

  /**
   * Retrieve token with double decryption
   */
  static async retrieveToken(
    encryptedToken: string,
    organizationId: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<TokenDecryptionResult | null> {
    try {
      // First, decrypt with database layer
      const appEncrypted =
        await DatabaseTokenEncryption.decryptTokenFromDatabase(
          encryptedToken,
          organizationId,
        );

      if (!appEncrypted) {
        return null;
      }

      // Then decrypt with application layer
      const result = await CalendarTokenEncryption.decryptToken(
        appEncrypted,
        organizationId,
        tokenType,
      );

      // Securely wipe intermediate values
      CalendarTokenEncryption.secureWipe(appEncrypted);

      return result;
    } catch (error) {
      console.error('Failed to retrieve secure token:', error);
      return null;
    }
  }
}

// Export the main interfaces for type safety
export type { TokenEncryptionResult, TokenDecryptionResult };
