import crypto from 'crypto';

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyDerivation: 'pbkdf2' | 'scrypt';
  iterations: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

export interface EncryptionResult {
  encryptedData: Buffer;
  key: string;
  iv: Buffer;
  salt: Buffer;
  tag?: Buffer;
  authTag?: Buffer;
}

export interface ValidationResult {
  isValid: boolean;
  algorithm: string;
  keyStrength: number;
  integrityCheck: boolean;
  issues: string[];
}

export class BackupEncryptionService {
  private defaultConfig: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'scrypt',
    iterations: 100000,
    saltLength: 32,
    ivLength: 16,
    tagLength: 16,
  };

  async encryptBackup(
    backupId: string,
    password?: string,
  ): Promise<EncryptionResult> {
    try {
      // Generate or use provided password
      const backupPassword = password || this.generateSecurePassword();

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.defaultConfig.saltLength);
      const iv = crypto.randomBytes(this.defaultConfig.ivLength);

      // Derive key from password using scrypt
      const key = await this.deriveKey(backupPassword, salt);

      // Get backup data (placeholder - in production, this would read actual backup files)
      const backupData = await this.getBackupData(backupId);

      // Create cipher
      const cipher = crypto.createCipher(this.defaultConfig.algorithm, key);
      cipher.setAAD(Buffer.from(backupId)); // Additional authenticated data

      // Encrypt the data
      let encrypted = cipher.update(backupData);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag for GCM mode
      const authTag = cipher.getAuthTag();

      // Store encryption metadata
      await this.storeEncryptionMetadata(backupId, {
        algorithm: this.defaultConfig.algorithm,
        keyDerivation: this.defaultConfig.keyDerivation,
        iterations: this.defaultConfig.iterations,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptedAt: new Date().toISOString(),
      });

      return {
        encryptedData: encrypted,
        key: key.toString('hex'),
        iv,
        salt,
        authTag,
      };
    } catch (error) {
      console.error(`Encryption failed for backup ${backupId}:`, error);
      throw new Error(`Failed to encrypt backup: ${error.message}`);
    }
  }

  async decryptBackup(backupId: string, password: string): Promise<Buffer> {
    try {
      // Get encryption metadata
      const metadata = await this.getEncryptionMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup is not encrypted or metadata not found');
      }

      // Reconstruct encryption parameters
      const salt = Buffer.from(metadata.salt, 'hex');
      const iv = Buffer.from(metadata.iv, 'hex');
      const authTag = Buffer.from(metadata.authTag, 'hex');

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Get encrypted backup data
      const encryptedData = await this.getEncryptedBackupData(backupId);

      // Create decipher
      const decipher = crypto.createDecipher(metadata.algorithm, key);
      decipher.setAAD(Buffer.from(backupId)); // Same AAD used during encryption
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      console.error(`Decryption failed for backup ${backupId}:`, error);
      throw new Error(`Failed to decrypt backup: ${error.message}`);
    }
  }

  async validateBackupEncryption(backupId: string): Promise<ValidationResult> {
    try {
      const metadata = await this.getEncryptionMetadata(backupId);

      if (!metadata) {
        return {
          isValid: false,
          algorithm: 'none',
          keyStrength: 0,
          integrityCheck: false,
          issues: ['Backup is not encrypted'],
        };
      }

      const issues: string[] = [];
      let isValid = true;

      // Validate algorithm strength
      if (!['aes-256-gcm', 'aes-256-cbc'].includes(metadata.algorithm)) {
        issues.push('Weak encryption algorithm');
        isValid = false;
      }

      // Validate key derivation
      if (metadata.iterations < 50000) {
        issues.push('Insufficient key derivation iterations');
        isValid = false;
      }

      // Validate salt length
      const saltLength = Buffer.from(metadata.salt, 'hex').length;
      if (saltLength < 16) {
        issues.push('Salt length too short');
        isValid = false;
      }

      // Check for authentication tag (integrity)
      const hasIntegrity = metadata.authTag && metadata.authTag.length > 0;
      if (!hasIntegrity) {
        issues.push('Missing authentication tag for integrity verification');
        isValid = false;
      }

      // Validate encryption age (optional warning)
      const encryptedAt = new Date(metadata.encryptedAt);
      const daysOld =
        (Date.now() - encryptedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 90) {
        issues.push(
          'Encryption is more than 90 days old - consider re-encryption',
        );
      }

      return {
        isValid,
        algorithm: metadata.algorithm,
        keyStrength: this.getKeyStrength(metadata.algorithm),
        integrityCheck: hasIntegrity,
        issues,
      };
    } catch (error) {
      console.error(`Validation failed for backup ${backupId}:`, error);
      return {
        isValid: false,
        algorithm: 'unknown',
        keyStrength: 0,
        integrityCheck: false,
        issues: [`Validation error: ${error.message}`],
      };
    }
  }

  async rotateEncryptionKeys(
    backupId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Decrypt with old password
      const decryptedData = await this.decryptBackup(backupId, oldPassword);

      // Re-encrypt with new password
      await this.encryptBackup(backupId, newPassword);

      // Update metadata to indicate key rotation
      await this.updateEncryptionMetadata(backupId, {
        lastKeyRotation: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(`Key rotation failed for backup ${backupId}:`, error);
      return false;
    }
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (this.defaultConfig.keyDerivation === 'scrypt') {
        crypto.scrypt(password, salt, 32, (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      } else {
        crypto.pbkdf2(
          password,
          salt,
          this.defaultConfig.iterations,
          32,
          'sha256',
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          },
        );
      }
    });
  }

  private generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private getKeyStrength(algorithm: string): number {
    switch (algorithm) {
      case 'aes-256-gcm':
      case 'aes-256-cbc':
        return 256;
      case 'aes-192-gcm':
      case 'aes-192-cbc':
        return 192;
      case 'aes-128-gcm':
      case 'aes-128-cbc':
        return 128;
      default:
        return 0;
    }
  }

  private async getBackupData(backupId: string): Promise<Buffer> {
    // Placeholder - in production, this would read actual backup files
    // from storage (S3, local filesystem, etc.)
    const sampleData = `Backup data for ${backupId} - ${new Date().toISOString()}`;
    return Buffer.from(sampleData);
  }

  private async getEncryptedBackupData(backupId: string): Promise<Buffer> {
    // Placeholder - in production, this would read encrypted backup files
    const sampleData = `Encrypted backup data for ${backupId}`;
    return Buffer.from(sampleData);
  }

  private async storeEncryptionMetadata(
    backupId: string,
    metadata: any,
  ): Promise<void> {
    // In production, this would store metadata in database or secure key store
    console.log(
      `Storing encryption metadata for backup ${backupId}:`,
      metadata,
    );
  }

  private async getEncryptionMetadata(backupId: string): Promise<any> {
    // In production, this would retrieve metadata from database or secure key store
    return {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      iterations: 100000,
      salt: crypto.randomBytes(32).toString('hex'),
      iv: crypto.randomBytes(16).toString('hex'),
      authTag: crypto.randomBytes(16).toString('hex'),
      encryptedAt: new Date().toISOString(),
    };
  }

  private async updateEncryptionMetadata(
    backupId: string,
    updates: any,
  ): Promise<void> {
    // In production, this would update metadata in database or secure key store
    console.log(
      `Updating encryption metadata for backup ${backupId}:`,
      updates,
    );
  }
}
