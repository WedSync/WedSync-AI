import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import forge from 'node-forge';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  salt: string;
  version: number;
}

export interface EncryptedField {
  ciphertext: string;
  nonce: string;
  algorithm: string;
  keyVersion: number;
}

export interface KeyRotationResult {
  version: number;
  privateKey: string;
  publicKey: string;
  fieldsRotated: number;
}

export interface CryptoShredResult {
  shredded: boolean;
  reason: string;
  shredded_at: Date;
}

export class AdvancedEncryption {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_SIZE = 32; // 256 bits
  private readonly IV_SIZE = 16; // 128 bits
  private readonly TAG_SIZE = 16; // 128 bits
  private readonly SALT_SIZE = 32; // 256 bits
  private readonly RSA_KEY_SIZE = 4096;
  private readonly ARGON2_TIME_COST = 3;
  private readonly ARGON2_MEMORY_COST = 65536;
  private readonly ARGON2_PARALLELISM = 4;

  private supabase = createClientComponentClient();

  /**
   * Generate unique encryption keys per user
   */
  async generateUserKeys(userId: string): Promise<EncryptionKeys> {
    // Generate salt for key derivation
    const salt = crypto.randomBytes(this.SALT_SIZE).toString('base64');

    // Generate RSA key pair using node-forge
    const keypair = forge.pki.rsa.generateKeyPair({ bits: this.RSA_KEY_SIZE });

    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);

    // Store keys in database
    const { error } = await this.supabase.from('user_encryption_keys').insert({
      user_id: userId,
      public_key: publicKey,
      encrypted_private_key: await this.encryptPrivateKey(privateKey, userId),
      salt: Buffer.from(salt, 'base64'),
      key_version: 1,
      algorithm: this.ALGORITHM,
    });

    if (error) {
      throw new Error(`Failed to store encryption keys: ${error.message}`);
    }

    return {
      publicKey,
      privateKey,
      salt,
      version: 1,
    };
  }

  /**
   * Encrypt field-level data with AES-256-GCM
   */
  async encryptField(
    plaintext: string,
    publicKeyPem: string,
    fieldName: string,
  ): Promise<EncryptedField> {
    try {
      // Generate random AES key for this field
      const aesKey = crypto.randomBytes(this.KEY_SIZE);
      const iv = crypto.randomBytes(this.IV_SIZE);

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, aesKey, iv);

      // Encrypt the plaintext
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Combine encrypted data and auth tag
      const combined = Buffer.concat([encrypted, authTag]);

      // Encrypt AES key with RSA public key
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encryptedAesKey = publicKey.encrypt(aesKey.toString('binary'));

      // Combine encrypted AES key and encrypted data
      const finalCiphertext = Buffer.concat([
        Buffer.from(encryptedAesKey, 'binary'),
        combined,
      ]).toString('base64');

      return {
        ciphertext: finalCiphertext,
        nonce: iv.toString('base64'),
        algorithm: this.ALGORITHM,
        keyVersion: 1,
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Decrypt field-level data
   */
  async decryptField(
    encryptedData: EncryptedField,
    privateKeyPem: string,
  ): Promise<string> {
    try {
      // Check if keys have been shredded
      const isShredded = await this.checkIfKeysShredded(privateKeyPem);
      if (isShredded) {
        throw new Error('Keys have been shredded');
      }

      // Decode the ciphertext
      const ciphertextBuffer = Buffer.from(encryptedData.ciphertext, 'base64');

      // RSA key size in bytes
      const rsaKeyBytes = this.RSA_KEY_SIZE / 8;

      // Extract encrypted AES key and encrypted data
      const encryptedAesKey = ciphertextBuffer.slice(0, rsaKeyBytes);
      const encryptedDataWithTag = ciphertextBuffer.slice(rsaKeyBytes);

      // Decrypt AES key with RSA private key
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const aesKey = Buffer.from(
        privateKey.decrypt(encryptedAesKey.toString('binary')),
        'binary',
      );

      // Extract encrypted data and auth tag
      const authTag = encryptedDataWithTag.slice(-this.TAG_SIZE);
      const encryptedData = encryptedDataWithTag.slice(0, -this.TAG_SIZE);

      // Decode IV
      const iv = Buffer.from(encryptedData.nonce, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, aesKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Invalid key or corrupted data'}`,
      );
    }
  }

  /**
   * Rotate user keys while preserving data access
   */
  async rotateUserKeys(
    userId: string,
    currentKeys: EncryptionKeys,
  ): Promise<KeyRotationResult> {
    try {
      // Start rotation process
      await this.supabase.from('key_rotation_history').insert({
        user_id: userId,
        from_version: currentKeys.version,
        to_version: currentKeys.version + 1,
        status: 'in_progress',
      });

      // Generate new keys
      const newKeypair = forge.pki.rsa.generateKeyPair({
        bits: this.RSA_KEY_SIZE,
      });
      const newPublicKey = forge.pki.publicKeyToPem(newKeypair.publicKey);
      const newPrivateKey = forge.pki.privateKeyToPem(newKeypair.privateKey);

      // Update user keys with new version
      const { error: updateError } = await this.supabase
        .from('user_encryption_keys')
        .update({
          public_key: newPublicKey,
          encrypted_private_key: await this.encryptPrivateKey(
            newPrivateKey,
            userId,
          ),
          key_version: currentKeys.version + 1,
          rotated_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Key rotation failed: ${updateError.message}`);
      }

      // Mark old keys as deprecated
      await this.supabase
        .from('user_encryption_keys')
        .update({ status: 'deprecated' })
        .eq('user_id', userId)
        .eq('key_version', currentKeys.version);

      // Get all encrypted fields for this user
      const { data: encryptedFields } = await this.supabase
        .from('encrypted_fields')
        .select('*')
        .eq('encryption_key_id', userId);

      let fieldsRotated = 0;

      // Re-encrypt all fields with new key
      if (encryptedFields) {
        for (const field of encryptedFields) {
          // Decrypt with old key
          const decrypted = await this.decryptField(
            {
              ciphertext: field.encrypted_value,
              nonce: field.nonce.toString('base64'),
              algorithm: this.ALGORITHM,
              keyVersion: currentKeys.version,
            },
            currentKeys.privateKey,
          );

          // Encrypt with new key
          const encrypted = await this.encryptField(
            decrypted,
            newPublicKey,
            field.column_name,
          );

          // Update encrypted field
          await this.supabase
            .from('encrypted_fields')
            .update({
              encrypted_value: encrypted.ciphertext,
              nonce: Buffer.from(encrypted.nonce, 'base64'),
            })
            .eq('id', field.id);

          fieldsRotated++;
        }
      }

      // Mark rotation as completed
      await this.supabase
        .from('key_rotation_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          fields_rotated: fieldsRotated,
        })
        .eq('user_id', userId)
        .eq('to_version', currentKeys.version + 1);

      return {
        version: currentKeys.version + 1,
        privateKey: newPrivateKey,
        publicKey: newPublicKey,
        fieldsRotated,
      };
    } catch (error) {
      // Mark rotation as failed
      await this.supabase
        .from('key_rotation_history')
        .update({
          status: 'failed',
          error_details:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('user_id', userId)
        .eq('to_version', currentKeys.version + 1);

      throw error;
    }
  }

  /**
   * Crypto-shredding for GDPR compliance
   */
  async cryptoShred(
    userId: string,
    reason: 'user_request' | 'gdpr_compliance' | 'security_incident',
  ): Promise<void> {
    try {
      // Delete user's encryption keys (making data unrecoverable)
      const { error: deleteError } = await this.supabase
        .from('user_encryption_keys')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Crypto-shredding failed: ${deleteError.message}`);
      }

      // Record shredding in audit table
      await this.supabase.from('shredded_keys').insert({
        user_id: userId,
        reason,
        performed_by: userId, // In real implementation, this would be the admin or system ID
      });

      // Audit the shredding operation
      await this.supabase.from('encryption_audit').insert({
        user_id: userId,
        operation: 'crypto_shred',
        field_reference: 'all_user_data',
        success: true,
      });
    } catch (error) {
      // Log failed shredding attempt
      await this.supabase.from('encryption_audit').insert({
        user_id: userId,
        operation: 'crypto_shred',
        field_reference: 'all_user_data',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get crypto-shredding audit information
   */
  async getShredAudit(userId: string): Promise<CryptoShredResult | null> {
    const { data } = await this.supabase
      .from('shredded_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return null;
    }

    return {
      shredded: true,
      reason: data.reason,
      shredded_at: new Date(data.shredded_at),
    };
  }

  /**
   * Get key status for a user
   */
  async getKeyStatus(userId: string): Promise<{
    active: { version: number };
    deprecated: Array<{ version: number }>;
  }> {
    const { data: keys } = await this.supabase
      .from('user_encryption_keys')
      .select('key_version, status')
      .eq('user_id', userId);

    const active = keys?.find((k) => k.status === 'active');
    const deprecated = keys?.filter((k) => k.status === 'deprecated') || [];

    return {
      active: { version: active?.key_version || 0 },
      deprecated: deprecated.map((k) => ({ version: k.key_version })),
    };
  }

  /**
   * Derive encryption key from password using Argon2id
   */
  async deriveKeyFromPassword(password: string, salt: string): Promise<Buffer> {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.ARGON2_MEMORY_COST,
      timeCost: this.ARGON2_TIME_COST,
      parallelism: this.ARGON2_PARALLELISM,
      hashLength: this.KEY_SIZE,
      salt: Buffer.from(salt, 'base64'),
    });

    // Extract the raw hash bytes
    return Buffer.from(hash.split('$').pop()!, 'base64');
  }

  /**
   * Encrypt private key for storage
   */
  private async encryptPrivateKey(
    privateKey: string,
    userId: string,
  ): Promise<string> {
    // In production, this would use a master key or HSM
    // For now, we'll use a derived key from user ID
    const masterKey = crypto
      .createHash('sha256')
      .update(`master-key-${userId}`)
      .digest();

    const iv = crypto.randomBytes(this.IV_SIZE);
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Check if user's keys have been shredded
   */
  private async checkIfKeysShredded(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('shredded_keys')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    return !!data;
  }

  /**
   * Record encryption performance metrics
   */
  async recordPerformanceMetric(
    operationType: string,
    tableName: string,
    fieldName: string,
    dataSizeBytes: number,
    encryptionTimeMs: number,
    userId: string,
  ): Promise<void> {
    await this.supabase.from('performance_metrics').insert({
      operation_type: operationType,
      table_name: tableName,
      field_name: fieldName,
      data_size_bytes: dataSizeBytes,
      encryption_time_ms: encryptionTimeMs,
      user_id: userId,
    });
  }
}
