import { createClient } from '@supabase/supabase-js';
import {
  randomUUID,
  createHash,
  scryptSync,
  randomBytes,
  createCipher,
  createDecipher,
} from 'crypto';
import {
  IntegrationCredentials,
  IntegrationEvent,
  AuditLogEntry,
  ErrorCategory,
  IntegrationError,
  // SENIOR CODE REVIEWER FIX: Use relative import to avoid path resolution issues
} from '../../types/integrations';

interface EncryptedCredentials
  extends Omit<
    IntegrationCredentials,
    'apiKey' | 'accessToken' | 'refreshToken'
  > {
  encryptedApiKey: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  keyVersion: number;
}

interface SyncLock {
  id: string;
  resourceId: string;
  resourceType: string;
  lockOwnerId: string;
  expiresAt: Date;
  createdAt: Date;
}

export class IntegrationDataManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private encryptionKey: Buffer;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SYNC_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.encryptionKey = this.deriveEncryptionKey();
    this.startCleanupTimer();
  }

  private deriveEncryptionKey(): Buffer {
    const key =
      process.env.INTEGRATION_ENCRYPTION_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'test-key-for-development';
    return scryptSync(key, 'integration-salt', 32);
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('integration-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new IntegrationError(
        'Invalid encrypted data format',
        'DECRYPTION_ERROR',
        ErrorCategory.SYSTEM,
      );
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('integration-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Credential Management
  async storeCredentials(
    userId: string,
    organizationId: string,
    provider: string,
    credentials: IntegrationCredentials,
  ): Promise<void> {
    this.validateInput({ userId, organizationId, provider });

    const encryptedCredentials: EncryptedCredentials = {
      userId: credentials.userId,
      organizationId: credentials.organizationId,
      provider: credentials.provider,
      encryptedApiKey: this.encrypt(credentials.apiKey),
      encryptedAccessToken: credentials.accessToken
        ? this.encrypt(credentials.accessToken)
        : undefined,
      encryptedRefreshToken: credentials.refreshToken
        ? this.encrypt(credentials.refreshToken)
        : undefined,
      expiresAt: credentials.expiresAt,
      scopes: credentials.scopes,
      keyVersion: 1,
    };

    const { error } = await this.supabase
      .from('integration_credentials')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        provider,
        encrypted_api_key: encryptedCredentials.encryptedApiKey,
        encrypted_access_token: encryptedCredentials.encryptedAccessToken,
        encrypted_refresh_token: encryptedCredentials.encryptedRefreshToken,
        expires_at: credentials.expiresAt
          ? new Date(credentials.expiresAt).toISOString()
          : null,
        scopes: credentials.scopes,
        key_version: encryptedCredentials.keyVersion,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new IntegrationError(
        'Failed to store credentials',
        'CREDENTIAL_STORE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    await this.logAudit(
      userId,
      organizationId,
      'CREDENTIALS_STORED',
      undefined,
      'credentials',
      {
        provider,
        hasRefreshToken: !!credentials.refreshToken,
        scopeCount: credentials.scopes?.length || 0,
      },
    );
  }

  async getCredentials(
    userId: string,
    organizationId: string,
    provider: string,
  ): Promise<IntegrationCredentials | null> {
    this.validateInput({ userId, organizationId, provider });

    const { data, error } = await this.supabase
      .from('integration_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single();

    if (error || !data) {
      return null;
    }

    try {
      return {
        userId: data.user_id,
        organizationId: data.organization_id,
        provider: data.provider,
        apiKey: this.decrypt(data.encrypted_api_key),
        accessToken: data.encrypted_access_token
          ? this.decrypt(data.encrypted_access_token)
          : undefined,
        refreshToken: data.encrypted_refresh_token
          ? this.decrypt(data.encrypted_refresh_token)
          : undefined,
        expiresAt: data.expires_at
          ? new Date(data.expires_at).getTime()
          : undefined,
        scopes: data.scopes,
      };
    } catch (decryptionError) {
      throw new IntegrationError(
        'Failed to decrypt credentials',
        'CREDENTIAL_DECRYPT_FAILED',
        ErrorCategory.SYSTEM,
        decryptionError as Error,
      );
    }
  }

  async deleteCredentials(
    userId: string,
    organizationId: string,
    provider: string,
  ): Promise<void> {
    this.validateInput({ userId, organizationId, provider });

    const { error } = await this.supabase
      .from('integration_credentials')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('provider', provider);

    if (error) {
      throw new IntegrationError(
        'Failed to delete credentials',
        'CREDENTIAL_DELETE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    await this.logAudit(
      userId,
      organizationId,
      'CREDENTIALS_DELETED',
      undefined,
      'credentials',
      {
        provider,
      },
    );
  }

  // Event Synchronization
  async createOrUpdateEvent(event: IntegrationEvent): Promise<string> {
    this.validateEventInput(event);

    const eventData = {
      user_id: event.userId,
      organization_id: event.organizationId,
      provider: event.provider,
      external_id: event.externalId,
      title: this.sanitizeInput(event.title),
      description: event.description
        ? this.sanitizeInput(event.description)
        : null,
      start_time: event.startTime.toISOString(),
      end_time: event.endTime.toISOString(),
      location: event.location ? this.sanitizeInput(event.location) : null,
      attendees: event.attendees,
      sync_status: event.syncStatus,
      sync_error: event.syncError,
      last_sync_at: event.lastSyncAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('integration_events')
      .upsert(eventData)
      .select('id')
      .single();

    if (error) {
      throw new IntegrationError(
        'Failed to store event',
        'EVENT_STORE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    await this.logAudit(
      event.userId,
      event.organizationId,
      'EVENT_SYNCED',
      data.id,
      'integration_event',
      {
        provider: event.provider,
        externalId: event.externalId,
        syncStatus: event.syncStatus,
      },
    );

    return data.id;
  }

  async getEventsByProvider(
    userId: string,
    organizationId: string,
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IntegrationEvent[]> {
    this.validateInput({ userId, organizationId, provider });

    let query = this.supabase
      .from('integration_events')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('provider', provider);

    if (startDate) {
      query = query.gte('start_time', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('end_time', endDate.toISOString());
    }

    const { data, error } = await query.order('start_time', {
      ascending: true,
    });

    if (error) {
      throw new IntegrationError(
        'Failed to retrieve events',
        'EVENT_RETRIEVE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      provider: row.provider,
      externalId: row.external_id,
      title: row.title,
      description: row.description,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      location: row.location,
      attendees: row.attendees,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
      lastSyncAt: new Date(row.last_sync_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    // Get event details for audit log
    const { data: eventData } = await this.supabase
      .from('integration_events')
      .select('user_id, organization_id, provider, external_id')
      .eq('id', eventId)
      .single();

    const { error } = await this.supabase
      .from('integration_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      throw new IntegrationError(
        'Failed to delete event',
        'EVENT_DELETE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    if (eventData) {
      await this.logAudit(
        eventData.user_id,
        eventData.organization_id,
        'EVENT_DELETED',
        eventId,
        'integration_event',
        {
          provider: eventData.provider,
          externalId: eventData.external_id,
        },
      );
    }
  }

  // Synchronization Lock Management
  async acquireSyncLock(
    resourceId: string,
    resourceType: string,
    lockOwnerId: string,
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + this.SYNC_LOCK_DURATION);

    try {
      const { data, error } = await this.supabase
        .from('sync_locks')
        .insert({
          resource_id: resourceId,
          resource_type: resourceType,
          lock_owner_id: lockOwnerId,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        // Check if lock already exists and is still valid
        const existingLock = await this.getSyncLock(resourceId, resourceType);
        if (existingLock && existingLock.expiresAt > new Date()) {
          return false; // Lock is held by someone else
        }

        // Clean up expired lock and retry
        await this.releaseSyncLock(resourceId, resourceType);
        return this.acquireSyncLock(resourceId, resourceType, lockOwnerId);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async releaseSyncLock(
    resourceId: string,
    resourceType: string,
  ): Promise<void> {
    await this.supabase
      .from('sync_locks')
      .delete()
      .eq('resource_id', resourceId)
      .eq('resource_type', resourceType);
  }

  private async getSyncLock(
    resourceId: string,
    resourceType: string,
  ): Promise<SyncLock | null> {
    const { data } = await this.supabase
      .from('sync_locks')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('resource_type', resourceType)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      resourceId: data.resource_id,
      resourceType: data.resource_type,
      lockOwnerId: data.lock_owner_id,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
    };
  }

  // Audit Logging
  async logAudit(
    userId: string,
    organizationId: string,
    action: string,
    resourceId?: string,
    resourceType?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const auditEntry: Omit<AuditLogEntry, 'id'> = {
      userId,
      organizationId,
      action,
      resourceId,
      resourceType,
      details: this.sanitizeAuditDetails(details),
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };

    const { error } = await this.supabase.from('audit_logs').insert({
      user_id: auditEntry.userId,
      organization_id: auditEntry.organizationId,
      action: auditEntry.action,
      resource_id: auditEntry.resourceId,
      resource_type: auditEntry.resourceType,
      details: auditEntry.details,
      ip_address: auditEntry.ipAddress,
      user_agent: auditEntry.userAgent,
      timestamp: auditEntry.timestamp.toISOString(),
    });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  async getAuditLogs(
    userId?: string,
    organizationId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    let query = this.supabase.from('audit_logs').select('*');

    if (userId) query = query.eq('user_id', userId);
    if (organizationId) query = query.eq('organization_id', organizationId);
    if (startDate) query = query.gte('timestamp', startDate.toISOString());
    if (endDate) query = query.lte('timestamp', endDate.toISOString());

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(Math.min(limit, 1000));

    if (error) {
      throw new IntegrationError(
        'Failed to retrieve audit logs',
        'AUDIT_RETRIEVE_FAILED',
        ErrorCategory.SYSTEM,
        new Error(error.message),
      );
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      action: row.action,
      resourceId: row.resource_id,
      resourceType: row.resource_type,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: new Date(row.timestamp),
    }));
  }

  // Data Cleanup Utilities
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private async performCleanup(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    try {
      // Clean up expired sync locks
      await this.supabase
        .from('sync_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Clean up old audit logs (keep last 90 days)
      await this.supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      // Clean up failed sync events (older than 7 days)
      const syncCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await this.supabase
        .from('integration_events')
        .delete()
        .eq('sync_status', 'failed')
        .lt('last_sync_at', syncCutoff.toISOString());

      console.info('Integration data cleanup completed successfully');
    } catch (error) {
      console.error('Integration data cleanup failed:', error);
    }
  }

  async forceCleanup(): Promise<void> {
    await this.performCleanup();
  }

  // Health Check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      // Test database connectivity
      const { data: connectivityTest, error: connectivityError } =
        await this.supabase
          .from('integration_credentials')
          .select('id')
          .limit(1);

      if (connectivityError) {
        return {
          status: 'unhealthy',
          details: {
            database: 'connection_failed',
            error: connectivityError.message,
          },
        };
      }

      // Check encryption/decryption
      const testString = 'test-encryption-' + Date.now();
      const encrypted = this.encrypt(testString);
      const decrypted = this.decrypt(encrypted);

      if (decrypted !== testString) {
        return {
          status: 'unhealthy',
          details: {
            encryption: 'failed',
            error: 'Encryption round-trip test failed',
          },
        };
      }

      return {
        status: 'healthy',
        details: {
          database: 'connected',
          encryption: 'working',
          cleanupTimer: this.cleanupTimer ? 'running' : 'stopped',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Input Validation and Sanitization
  private validateInput(input: {
    userId?: string;
    organizationId?: string;
    provider?: string;
  }): void {
    if (input.userId && !this.isValidUUID(input.userId)) {
      throw new Error('Invalid user ID format');
    }

    if (input.organizationId && !this.isValidUUID(input.organizationId)) {
      throw new Error('Invalid organization ID format');
    }

    if (input.provider && !/^[a-zA-Z0-9_-]+$/.test(input.provider)) {
      throw new Error('Invalid provider format');
    }
  }

  private validateEventInput(event: IntegrationEvent): void {
    if (!event.title || event.title.trim().length === 0) {
      throw new Error('Event title is required');
    }

    if (!event.startTime || !event.endTime) {
      throw new Error('Event start and end times are required');
    }

    if (event.endTime <= event.startTime) {
      throw new Error('Event end time must be after start time');
    }

    if (!this.isValidUUID(event.userId)) {
      throw new Error('Invalid user ID format');
    }

    if (!this.isValidUUID(event.organizationId)) {
      throw new Error('Invalid organization ID format');
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  private sanitizeAuditDetails(
    details: Record<string, any>,
  ): Record<string, any> {
    const sensitiveKeys = [
      'apiKey',
      'accessToken',
      'refreshToken',
      'password',
      'secret',
    ];
    const sanitized = JSON.parse(JSON.stringify(details));

    function redactSensitive(obj: any): void {
      if (typeof obj !== 'object' || obj === null) return;

      Object.keys(obj).forEach((key) => {
        if (
          sensitiveKeys.some((sensitiveKey) =>
            key.toLowerCase().includes(sensitiveKey.toLowerCase()),
          )
        ) {
          obj[key] = '***';
        } else if (typeof obj[key] === 'object') {
          redactSensitive(obj[key]);
        }
      });
    }

    redactSensitive(sanitized);
    return sanitized;
  }

  // Cleanup on process termination
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

export const integrationDataManager = new IntegrationDataManager();

// Graceful shutdown
process.on('beforeExit', () => {
  integrationDataManager.destroy();
});

process.on('SIGTERM', () => {
  integrationDataManager.destroy();
  process.exit(0);
});
