/**
 * WS-178: Multi-Cloud Backup Storage Provider Interface
 * Enterprise-grade security for wedding data protection
 */

import { z } from 'zod';

// Security Configuration Schema
const BackupConfigSchema = z.object({
  encryptionKey: z.string().min(32),
  region: z.string().min(1),
  retentionDays: z.number().min(30).max(2555),
  compressionLevel: z.number().min(1).max(9),
  enableChecksums: z.boolean().default(true),
  enableAuditLogging: z.boolean().default(true),
});

export type BackupConfig = z.infer<typeof BackupConfigSchema>;

// Backup Metadata Schema
const BackupMetadataSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  size: z.number().positive(),
  checksum: z.string().min(64),
  encryptionAlgorithm: z.literal('AES-256-GCM'),
  compressionRatio: z.number().min(0).max(1),
  weddingId: z.string().uuid(),
  dataType: z.enum(['photos', 'videos', 'documents', 'database']),
  tags: z.record(z.string()).optional(),
});

export type BackupMetadata = z.infer<typeof BackupMetadataSchema>;

// Audit Log Schema
const AuditLogSchema = z.object({
  timestamp: z.string().datetime(),
  operation: z.enum(['backup', 'restore', 'delete', 'verify']),
  provider: z.enum(['aws', 'gcp', 'azure']),
  status: z.enum(['success', 'failure', 'in_progress']),
  backupId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Security Error Types
export class BackupSecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string,
  ) {
    super(message);
    this.name = 'BackupSecurityError';
  }
}

export class BackupEncryptionError extends BackupSecurityError {
  constructor(message: string, provider?: string) {
    super(message, 'ENCRYPTION_ERROR', provider);
  }
}

export class BackupAuthenticationError extends BackupSecurityError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
  }
}

export class BackupIntegrityError extends BackupSecurityError {
  constructor(message: string, provider?: string) {
    super(message, 'INTEGRITY_ERROR', provider);
  }
}

// Backup Storage Provider Interface
export interface IBackupStorageProvider {
  readonly providerId: string;
  readonly isHealthy: boolean;

  initialize(config: BackupConfig): Promise<void>;
  uploadBackup(
    data: Buffer,
    metadata: BackupMetadata,
    config: BackupConfig,
  ): Promise<BackupMetadata>;
  downloadBackup(
    backupId: string,
    config: BackupConfig,
  ): Promise<{ data: Buffer; metadata: BackupMetadata }>;
  verifyBackup(backupId: string): Promise<boolean>;
  listBackups(weddingId: string): Promise<BackupMetadata[]>;
  deleteBackup(backupId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
  getAuditLogs(startDate: Date, endDate: Date): Promise<AuditLog[]>;
}

// Security Utilities
export class BackupSecurity {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly KEY_DERIVATION_ITERATIONS = 100000;

  static generateEncryptionKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  static deriveKey(password: string, salt: string): Buffer {
    const crypto = require('crypto');
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.KEY_DERIVATION_ITERATIONS,
      32,
      'sha512',
    );
  }

  static encrypt(
    data: Buffer,
    key: string,
  ): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
    const crypto = require('crypto');
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', keyBuffer);
    cipher.setAAD(iv);

    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encrypted,
      iv,
      tag: cipher.getAuthTag(),
    };
  }

  static decrypt(
    encrypted: Buffer,
    key: string,
    iv: Buffer,
    tag: Buffer,
  ): Buffer {
    const crypto = require('crypto');
    const keyBuffer = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipher('aes-256-gcm', keyBuffer);
    decipher.setAAD(iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  static calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash(this.HASH_ALGORITHM).update(data).digest('hex');
  }

  static sanitizeError(error: Error, provider?: string): string {
    const sanitized = error.message
      .replace(/key|token|password|secret/gi, '[REDACTED]')
      .replace(/\b[\w-]{20,}\b/g, '[CREDENTIAL]')
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]');

    return `[${provider || 'UNKNOWN'}] ${sanitized}`;
  }

  static validateConfig(config: BackupConfig): void {
    const result = BackupConfigSchema.safeParse(config);
    if (!result.success) {
      throw new BackupSecurityError(
        'Invalid backup configuration',
        'CONFIG_VALIDATION_ERROR',
      );
    }

    if (config.encryptionKey.length < 64) {
      throw new BackupEncryptionError('Encryption key too short');
    }

    if (!config.enableChecksums) {
      throw new BackupIntegrityError('Checksums must be enabled');
    }
  }
}

// Base Provider Abstract Class
export abstract class BaseBackupStorageProvider
  implements IBackupStorageProvider
{
  public abstract readonly providerId: string;
  protected _isHealthy: boolean = false;
  protected auditLogs: AuditLog[] = [];

  public get isHealthy(): boolean {
    return this._isHealthy;
  }

  protected async logAudit(log: Omit<AuditLog, 'timestamp'>): Promise<void> {
    const auditEntry: AuditLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(auditEntry);
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);
  }

  protected async validateCredentials(): Promise<void> {
    throw new BackupAuthenticationError(
      'Credential validation not implemented',
    );
  }

  protected async encryptData(
    data: Buffer,
    config: BackupConfig,
  ): Promise<{
    encrypted: Buffer;
    metadata: { iv: string; tag: string; checksum: string };
  }> {
    try {
      const checksum = BackupSecurity.calculateChecksum(data);
      const { encrypted, iv, tag } = BackupSecurity.encrypt(
        data,
        config.encryptionKey,
      );

      return {
        encrypted,
        metadata: {
          iv: iv.toString('hex'),
          tag: tag.toString('hex'),
          checksum,
        },
      };
    } catch (error) {
      throw new BackupEncryptionError(
        'Failed to encrypt backup data',
        this.providerId,
      );
    }
  }

  protected async decryptData(
    encrypted: Buffer,
    config: BackupConfig,
    metadata: { iv: string; tag: string; checksum: string },
  ): Promise<Buffer> {
    try {
      const iv = Buffer.from(metadata.iv, 'hex');
      const tag = Buffer.from(metadata.tag, 'hex');

      const decrypted = BackupSecurity.decrypt(
        encrypted,
        config.encryptionKey,
        iv,
        tag,
      );

      const checksum = BackupSecurity.calculateChecksum(decrypted);
      if (checksum !== metadata.checksum) {
        throw new BackupIntegrityError('Checksum verification failed');
      }

      return decrypted;
    } catch (error) {
      if (error instanceof BackupIntegrityError) {
        throw error;
      }
      throw new BackupEncryptionError(
        'Failed to decrypt backup data',
        this.providerId,
      );
    }
  }

  public async getAuditLogs(
    startDate: Date,
    endDate: Date,
  ): Promise<AuditLog[]> {
    return this.auditLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  public abstract initialize(config: BackupConfig): Promise<void>;
  public abstract uploadBackup(
    data: Buffer,
    metadata: BackupMetadata,
    config: BackupConfig,
  ): Promise<BackupMetadata>;
  public abstract downloadBackup(
    backupId: string,
    config: BackupConfig,
  ): Promise<{ data: Buffer; metadata: BackupMetadata }>;
  public abstract verifyBackup(backupId: string): Promise<boolean>;
  public abstract listBackups(weddingId: string): Promise<BackupMetadata[]>;
  public abstract deleteBackup(backupId: string): Promise<void>;
  public abstract healthCheck(): Promise<boolean>;
}
