import {
  encryptData,
  decryptData,
  generateSecureToken,
  generateUUID,
} from '@/lib/crypto-utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

// Sensitive field types that require encryption
export const ENCRYPTED_FIELD_TYPES = {
  GUEST_DATA: [
    'fullName',
    'email',
    'phone',
    'address',
    'dietaryRestrictions',
    'notes',
  ],
  BUDGET_DATA: ['amount', 'vendor', 'description', 'notes'],
  VENDOR_DATA: [
    'contactName',
    'email',
    'phone',
    'address',
    'pricing',
    'contract',
  ],
  PERSONAL_DATA: ['preferences', 'specialRequests', 'timeline', 'privateNotes'],
} as const;

// Encryption metadata schema
const encryptionMetadataSchema = z.object({
  version: z.number(),
  algorithm: z.string(),
  keyId: z.string(),
  encryptedAt: z.string(),
  fieldPath: z.string(),
});

export type EncryptionMetadata = z.infer<typeof encryptionMetadataSchema>;

export interface EncryptedField {
  encrypted: string;
  metadata: EncryptionMetadata;
}

export interface WeddingEncryptionKey {
  id: string;
  weddingId: string;
  keyHash: string;
  salt: string;
  version: number;
  createdAt: string;
  isActive: boolean;
}

export class WeddingDataEncryption {
  private supabase = createClientComponentClient();
  private keyCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Encrypt sensitive wedding data field
   */
  async encryptField(
    weddingId: string,
    fieldPath: string,
    value: any,
  ): Promise<EncryptedField> {
    try {
      if (value === null || value === undefined || value === '') {
        throw new Error('Cannot encrypt empty value');
      }

      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      const encryptionKey = await this.getWeddingEncryptionKey(weddingId);

      const encrypted = await encryptData(stringValue, encryptionKey.key);

      const metadata: EncryptionMetadata = {
        version: 1,
        algorithm: 'AES-256-GCM',
        keyId: encryptionKey.id,
        encryptedAt: new Date().toISOString(),
        fieldPath,
      };

      return {
        encrypted: Buffer.from(JSON.stringify(encrypted)).toString('base64'),
        metadata,
      };
    } catch (error) {
      console.error('Field encryption failed:', error);
      throw new Error(`Failed to encrypt field ${fieldPath}`);
    }
  }

  /**
   * Decrypt sensitive wedding data field
   */
  async decryptField(encryptedField: EncryptedField): Promise<any> {
    try {
      const { encrypted, metadata } = encryptedField;

      // Validate metadata
      encryptionMetadataSchema.parse(metadata);

      const encryptionKey = await this.getWeddingEncryptionKeyById(
        metadata.keyId,
      );
      const encryptedData = JSON.parse(
        Buffer.from(encrypted, 'base64').toString('utf8'),
      );

      const decrypted = await decryptData(encryptedData, encryptionKey.key);

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Field decryption failed:', error);
      throw new Error('Failed to decrypt field');
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  async encryptObject(
    weddingId: string,
    data: Record<string, any>,
    encryptedFields: string[],
  ): Promise<Record<string, any>> {
    const result = { ...data };

    for (const fieldPath of encryptedFields) {
      const value = this.getNestedValue(data, fieldPath);
      if (value !== undefined && value !== null && value !== '') {
        try {
          const encrypted = await this.encryptField(
            weddingId,
            fieldPath,
            value,
          );
          this.setNestedValue(result, fieldPath, encrypted);
        } catch (error) {
          console.error(`Failed to encrypt field ${fieldPath}:`, error);
          // Keep original value if encryption fails
        }
      }
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   */
  async decryptObject(
    data: Record<string, any>,
    encryptedFields: string[],
  ): Promise<Record<string, any>> {
    const result = { ...data };

    for (const fieldPath of encryptedFields) {
      const encryptedValue = this.getNestedValue(data, fieldPath);
      if (encryptedValue && this.isEncryptedField(encryptedValue)) {
        try {
          const decrypted = await this.decryptField(encryptedValue);
          this.setNestedValue(result, fieldPath, decrypted);
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldPath}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return result;
  }

  /**
   * Encrypt guest data
   */
  async encryptGuestData(weddingId: string, guestData: any) {
    return this.encryptObject(
      weddingId,
      guestData,
      ENCRYPTED_FIELD_TYPES.GUEST_DATA,
    );
  }

  /**
   * Decrypt guest data
   */
  async decryptGuestData(guestData: any) {
    return this.decryptObject(guestData, ENCRYPTED_FIELD_TYPES.GUEST_DATA);
  }

  /**
   * Encrypt budget data
   */
  async encryptBudgetData(weddingId: string, budgetData: any) {
    return this.encryptObject(
      weddingId,
      budgetData,
      ENCRYPTED_FIELD_TYPES.BUDGET_DATA,
    );
  }

  /**
   * Decrypt budget data
   */
  async decryptBudgetData(budgetData: any) {
    return this.decryptObject(budgetData, ENCRYPTED_FIELD_TYPES.BUDGET_DATA);
  }

  /**
   * Encrypt vendor data
   */
  async encryptVendorData(weddingId: string, vendorData: any) {
    return this.encryptObject(
      weddingId,
      vendorData,
      ENCRYPTED_FIELD_TYPES.VENDOR_DATA,
    );
  }

  /**
   * Decrypt vendor data
   */
  async decryptVendorData(vendorData: any) {
    return this.decryptObject(vendorData, ENCRYPTED_FIELD_TYPES.VENDOR_DATA);
  }

  /**
   * Get or create wedding encryption key
   */
  private async getWeddingEncryptionKey(
    weddingId: string,
  ): Promise<{ id: string; key: string }> {
    const cacheKey = `wedding:${weddingId}`;

    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached) {
      const [id, key] = cached.split(':');
      return { id, key };
    }

    try {
      // Try to get existing active key
      const { data: existingKeys, error: fetchError } = await this.supabase
        .from('wedding_encryption_keys')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (existingKeys && existingKeys.length > 0) {
        const keyRecord = existingKeys[0];
        const key = await this.deriveKeyFromRecord(keyRecord);

        // Cache the key
        this.keyCache.set(cacheKey, `${keyRecord.id}:${key}`);
        setTimeout(() => this.keyCache.delete(cacheKey), this.CACHE_TTL);

        return { id: keyRecord.id, key };
      }

      // Create new key if none exists
      return await this.createWeddingEncryptionKey(weddingId);
    } catch (error) {
      console.error('Failed to get wedding encryption key:', error);
      throw new Error('Encryption key unavailable');
    }
  }

  /**
   * Get wedding encryption key by ID
   */
  private async getWeddingEncryptionKeyById(
    keyId: string,
  ): Promise<{ id: string; key: string }> {
    const cacheKey = `key:${keyId}`;

    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached) {
      const [id, key] = cached.split(':');
      return { id, key };
    }

    try {
      const { data: keyRecord, error } = await this.supabase
        .from('wedding_encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (error) throw error;

      const key = await this.deriveKeyFromRecord(keyRecord);

      // Cache the key
      this.keyCache.set(cacheKey, `${keyRecord.id}:${key}`);
      setTimeout(() => this.keyCache.delete(cacheKey), this.CACHE_TTL);

      return { id: keyRecord.id, key };
    } catch (error) {
      console.error('Failed to get encryption key by ID:', error);
      throw new Error('Encryption key not found');
    }
  }

  /**
   * Create new wedding encryption key
   */
  private async createWeddingEncryptionKey(
    weddingId: string,
  ): Promise<{ id: string; key: string }> {
    try {
      // Generate master key and salt
      const masterKey = generateSecureToken(32);
      const salt = generateSecureToken(16);
      const keyId = generateUUID();

      // Hash the master key for storage
      const keyHash = await this.hashKey(masterKey);

      // Store key metadata (not the actual key)
      const { error } = await this.supabase
        .from('wedding_encryption_keys')
        .insert({
          id: keyId,
          wedding_id: weddingId,
          key_hash: keyHash,
          salt,
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Derive the actual encryption key
      const encryptionKey = await this.deriveKey(masterKey, salt);

      // Cache the key
      const cacheKey = `wedding:${weddingId}`;
      this.keyCache.set(cacheKey, `${keyId}:${encryptionKey}`);
      setTimeout(() => this.keyCache.delete(cacheKey), this.CACHE_TTL);

      return { id: keyId, key: encryptionKey };
    } catch (error) {
      console.error('Failed to create wedding encryption key:', error);
      throw new Error('Failed to create encryption key');
    }
  }

  /**
   * Rotate wedding encryption key
   */
  async rotateWeddingKey(weddingId: string): Promise<void> {
    try {
      // Deactivate current key
      await this.supabase
        .from('wedding_encryption_keys')
        .update({ is_active: false })
        .eq('wedding_id', weddingId)
        .eq('is_active', true);

      // Clear cache
      this.keyCache.delete(`wedding:${weddingId}`);

      // Create new key (will be created on next access)
      console.log(`Key rotation initiated for wedding ${weddingId}`);
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Derive encryption key from stored record
   */
  private async deriveKeyFromRecord(keyRecord: any): Promise<string> {
    // In a real implementation, you would derive the key from secure storage
    // For now, we'll use the key_hash as the base for derivation
    return await this.deriveKey(keyRecord.key_hash, keyRecord.salt);
  }

  /**
   * Derive encryption key from master key and salt
   */
  private async deriveKey(masterKey: string, salt: string): Promise<string> {
    const crypto = await import('crypto');
    const scrypt = crypto.promisify(crypto.scrypt);

    const derived = (await scrypt(masterKey, salt, 32)) as Buffer;
    return derived.toString('hex');
  }

  /**
   * Hash key for storage
   */
  private async hashKey(key: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if a value is an encrypted field
   */
  private isEncryptedField(value: any): value is EncryptedField {
    return (
      value &&
      typeof value === 'object' &&
      'encrypted' in value &&
      'metadata' in value &&
      value.metadata &&
      'version' in value.metadata
    );
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Bulk encrypt array of objects
   */
  async encryptBulkData(
    weddingId: string,
    items: any[],
    encryptedFields: string[],
  ): Promise<any[]> {
    const results = [];

    for (const item of items) {
      try {
        const encrypted = await this.encryptObject(
          weddingId,
          item,
          encryptedFields,
        );
        results.push(encrypted);
      } catch (error) {
        console.error('Bulk encryption failed for item:', error);
        results.push(item); // Keep original if encryption fails
      }
    }

    return results;
  }

  /**
   * Bulk decrypt array of objects
   */
  async decryptBulkData(
    items: any[],
    encryptedFields: string[],
  ): Promise<any[]> {
    const results = [];

    for (const item of items) {
      try {
        const decrypted = await this.decryptObject(item, encryptedFields);
        results.push(decrypted);
      } catch (error) {
        console.error('Bulk decryption failed for item:', error);
        results.push(item); // Keep encrypted if decryption fails
      }
    }

    return results;
  }
}

// Singleton instance
export const weddingEncryption = new WeddingDataEncryption();

// Utility functions
export function isFieldEncrypted(
  fieldPath: string,
  dataType: keyof typeof ENCRYPTED_FIELD_TYPES,
): boolean {
  return ENCRYPTED_FIELD_TYPES[dataType].includes(fieldPath as any);
}

export function getEncryptedFieldsForType(
  dataType: keyof typeof ENCRYPTED_FIELD_TYPES,
): string[] {
  return [...ENCRYPTED_FIELD_TYPES[dataType]];
}

// React hook for wedding data encryption
export function useWeddingEncryption() {
  return {
    encryptField: weddingEncryption.encryptField.bind(weddingEncryption),
    decryptField: weddingEncryption.decryptField.bind(weddingEncryption),
    encryptObject: weddingEncryption.encryptObject.bind(weddingEncryption),
    decryptObject: weddingEncryption.decryptObject.bind(weddingEncryption),
    encryptGuestData:
      weddingEncryption.encryptGuestData.bind(weddingEncryption),
    decryptGuestData:
      weddingEncryption.decryptGuestData.bind(weddingEncryption),
    encryptBudgetData:
      weddingEncryption.encryptBudgetData.bind(weddingEncryption),
    decryptBudgetData:
      weddingEncryption.decryptBudgetData.bind(weddingEncryption),
    encryptVendorData:
      weddingEncryption.encryptVendorData.bind(weddingEncryption),
    decryptVendorData:
      weddingEncryption.decryptVendorData.bind(weddingEncryption),
    rotateWeddingKey:
      weddingEncryption.rotateWeddingKey.bind(weddingEncryption),
    encryptBulkData: weddingEncryption.encryptBulkData.bind(weddingEncryption),
    decryptBulkData: weddingEncryption.decryptBulkData.bind(weddingEncryption),
  };
}
