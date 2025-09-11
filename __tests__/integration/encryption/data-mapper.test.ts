/**
 * Data Mapper Tests for WS-175 Encryption Integration
 * Comprehensive test coverage for field-level encryption mapping
 */

// Vitest globals enabled - no imports needed for test functions
import { vi } from 'vitest';
import {
  mapFieldsToEncrypted,
  mapEncryptedToFields,
  getEncryptionConfig,
  validateFieldMapping,
  createFieldMapper,
  createFieldMappingConfig,
  type WeddingDataType,
  type FieldMappingConfig,
  type MappingResult
} from '@/lib/integrations/encryption/data-mapper';
import type { EncryptedField } from '@/types/encryption-integration';

// Mock encryption functions for testing
const mockEncrypt = vi.fn(async (value: string): Promise<EncryptedField> => ({
  encrypted_value: Buffer.from(value).toString('base64'),
  algorithm: 'AES-256-GCM',
  iv: 'test-iv-123',
  auth_tag: 'test-tag-456',
  encrypted_at: '2025-01-20T10:00:00.000Z',
  schema_version: 1,
  field_id: `test-field-${Date.now()}`
}));

const mockDecrypt = vi.fn(async (field: EncryptedField): Promise<string> => 
  Buffer.from(field.encrypted_value, 'base64').toString()
);

describe('Data Mapper - Field Encryption Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapFieldsToEncrypted', () => {
    it('should encrypt specified fields in guest data', async () => {
      const guestData = {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: '123 Main St'
      };

      const config = getEncryptionConfig('guest');
      const result = await mapFieldsToEncrypted(guestData, config, mockEncrypt);

      expect(result.data.first_name).toBe('John'); // Not encrypted
      expect(result.data.last_name).toBe('Doe'); // Not encrypted
      expect(result.data.email).toHaveProperty('encrypted_value');
      expect(result.data.phone).toHaveProperty('encrypted_value');
      expect(result.data.address).toHaveProperty('encrypted_value');
      expect(result.encryptedFields).toContain('email');
      expect(result.encryptedFields).toContain('phone');
      expect(result.encryptedFields).toContain('address');
    });

    it('should create search hashes for searchable fields', async () => {
      const guestData = {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      };

      const config = getEncryptionConfig('guest');
      const result = await mapFieldsToEncrypted(guestData, config, mockEncrypt);

      expect(result.data.first_name_search_hash).toBeDefined();
      expect(result.data.last_name_search_hash).toBeDefined();
      expect(result.data.email_search_hash).toBeDefined();
      expect(typeof result.data.first_name_search_hash).toBe('string');
    });

    it('should add encryption metadata fields', async () => {
      const guestData = { id: '123', email: 'test@example.com' };
      const config = getEncryptionConfig('guest');
      
      const result = await mapFieldsToEncrypted(guestData, config, mockEncrypt);

      expect(result.data.encryption_schema_version).toBe(1);
      expect(result.data.encrypted_at).toBeDefined();
      expect(result.data.last_access).toBeDefined();
    });

    it('should handle empty and null fields gracefully', async () => {
      const guestData = {
        id: '123',
        email: null,
        phone: '',
        address: undefined
      };

      const config = getEncryptionConfig('guest');
      const result = await mapFieldsToEncrypted(guestData, config, mockEncrypt);

      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBe('');
      expect(result.data.address).toBeUndefined();
      expect(result.encryptedFields).toHaveLength(0);
    });

    it('should validate input data with schema', async () => {
      const invalidGuestData = {
        id: 123, // Should be string
        email: 'invalid-email' // Invalid email format
      };

      const config = getEncryptionConfig('guest');
      const result = await mapFieldsToEncrypted(invalidGuestData, config, mockEncrypt);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle encryption failures gracefully', async () => {
      const failingEncrypt = vi.fn().mockRejectedValue(new Error('Encryption failed'));
      const guestData = { id: '123', email: 'test@example.com' };
      const config = getEncryptionConfig('guest');

      const result = await mapFieldsToEncrypted(guestData, config, failingEncrypt);

      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('Failed to encrypt field'))).toBe(true);
    });
  });

  describe('mapEncryptedToFields', () => {
    it('should decrypt encrypted fields back to original values', async () => {
      const encryptedData = {
        id: '123',
        first_name: 'John',
        email: {
          encrypted_value: Buffer.from('john.doe@example.com').toString('base64'),
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        } as EncryptedField,
        email_search_hash: 'hash123'
      };

      const config = getEncryptionConfig('guest');
      const result = await mapEncryptedToFields(encryptedData, config, mockDecrypt);

      expect(result.data.first_name).toBe('John');
      expect(result.data.email).toBe('john.doe@example.com');
      expect(result.data.email_search_hash).toBeUndefined(); // Should be removed
      expect(result.encryptedFields).toContain('email');
    });

    it('should remove metadata fields from decrypted data', async () => {
      const encryptedData = {
        id: '123',
        email: {
          encrypted_value: Buffer.from('test@example.com').toString('base64'),
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        } as EncryptedField,
        encryption_schema_version: 1,
        encrypted_at: '2025-01-20T10:00:00.000Z',
        last_access: '2025-01-20T10:00:00.000Z'
      };

      const config = getEncryptionConfig('guest');
      const result = await mapEncryptedToFields(encryptedData, config, mockDecrypt);

      expect(result.data.encryption_schema_version).toBeUndefined();
      expect(result.data.encrypted_at).toBeUndefined();
      expect(result.data.last_access).toBeUndefined();
    });

    it('should handle decryption failures gracefully', async () => {
      const failingDecrypt = vi.fn().mockRejectedValue(new Error('Decryption failed'));
      const encryptedData = {
        id: '123',
        email: {
          encrypted_value: 'invalid-data',
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        } as EncryptedField
      };

      const config = getEncryptionConfig('guest');
      const result = await mapEncryptedToFields(encryptedData, config, failingDecrypt);

      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('Failed to decrypt field'))).toBe(true);
    });
  });

  describe('getEncryptionConfig', () => {
    it('should return guest encryption configuration', () => {
      const config = getEncryptionConfig('guest');

      expect(config.encryptedFields).toContain('email');
      expect(config.encryptedFields).toContain('phone');
      expect(config.searchableFields).toContain('first_name');
      expect(config.metadataFields).toContain('encryption_schema_version');
      expect(config.schema).toBeDefined();
    });

    it('should return vendor encryption configuration', () => {
      const config = getEncryptionConfig('vendor');

      expect(config.encryptedFields).toContain('contact_email');
      expect(config.encryptedFields).toContain('tax_id');
      expect(config.searchableFields).toContain('business_name');
    });

    it('should return payment encryption configuration', () => {
      const config = getEncryptionConfig('payment');

      expect(config.encryptedFields).toContain('card_number');
      expect(config.encryptedFields).toContain('cvv');
      expect(config.metadataFields).toContain('pci_compliance_flags');
    });

    it('should throw error for unknown data type', () => {
      expect(() => getEncryptionConfig('unknown' as WeddingDataType))
        .toThrow('No encryption configuration found for data type: unknown');
    });
  });

  describe('validateFieldMapping', () => {
    it('should validate encrypted data structure', () => {
      const encryptedData = {
        id: '123',
        email: {
          encrypted_value: 'test-data',
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        },
        email_search_hash: 'hash123',
        encryption_schema_version: 1,
        encrypted_at: '2025-01-20T10:00:00.000Z'
      };

      const config = getEncryptionConfig('guest');
      const result = validateFieldMapping(encryptedData, config, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing encrypted field properties', () => {
      const invalidEncryptedData = {
        id: '123',
        email: {
          encrypted_value: 'test-data'
          // Missing required properties: iv, auth_tag, etc.
        }
      };

      const config = getEncryptionConfig('guest');
      const result = validateFieldMapping(invalidEncryptedData, config, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('missing required properties'))).toBe(true);
    });

    it('should detect plain text fields when encrypted expected', () => {
      const plainData = {
        id: '123',
        email: 'plain-text@example.com' // Should be encrypted
      };

      const config = getEncryptionConfig('guest');
      const result = validateFieldMapping(plainData, config, true);

      expect(result.isValid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should detect encrypted fields when plain text expected', () => {
      const encryptedData = {
        id: '123',
        email: {
          encrypted_value: 'test-data',
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        }
      };

      const config = getEncryptionConfig('guest');
      const result = validateFieldMapping(encryptedData, config, false);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('appears to be encrypted but should be plain text'))).toBe(true);
    });
  });

  describe('createFieldMapper', () => {
    it('should create a functional field mapper for guest data', () => {
      const mapper = createFieldMapper('guest', mockEncrypt, mockDecrypt);

      expect(mapper.encrypt).toBeDefined();
      expect(mapper.decrypt).toBeDefined();
      expect(mapper.validate).toBeDefined();
      expect(mapper.getConfig).toBeDefined();
      expect(mapper.shouldEncrypt('email')).toBe(true);
      expect(mapper.shouldEncrypt('first_name')).toBe(false);
      expect(mapper.isSearchable('first_name')).toBe(true);
    });

    it('should encrypt and decrypt data using field mapper', async () => {
      const mapper = createFieldMapper('guest', mockEncrypt, mockDecrypt);
      const originalData = {
        id: '123',
        first_name: 'John',
        email: 'john@example.com'
      };

      const encryptResult = await mapper.encrypt(originalData);
      expect(encryptResult.data.email).toHaveProperty('encrypted_value');

      const decryptResult = await mapper.decrypt(encryptResult.data);
      expect(decryptResult.data.email).toBe('john@example.com');
    });

    it('should validate data using field mapper', () => {
      const mapper = createFieldMapper('guest', mockEncrypt, mockDecrypt);
      const validData = {
        id: '123',
        first_name: 'John',
        email: 'john@example.com'
      };

      const validation = mapper.validate(validData);
      expect(validation.isValid).toBe(true);
    });

    it('should create search hashes using field mapper', () => {
      const mapper = createFieldMapper('guest', mockEncrypt, mockDecrypt);
      const hash1 = mapper.createSearchHash('john@example.com');
      const hash2 = mapper.createSearchHash('john@example.com');
      const hash3 = mapper.createSearchHash('jane@example.com');

      expect(hash1).toBe(hash2); // Same input, same hash
      expect(hash1).not.toBe(hash3); // Different input, different hash
      expect(hash1.length).toBe(16); // Expected hash length
    });
  });

  describe('createFieldMappingConfig', () => {
    it('should create custom field mapping configuration', () => {
      const config = createFieldMappingConfig(
        ['custom_field1', 'custom_field2'],
        ['custom_field1'],
        ['custom_version', 'custom_timestamp']
      );

      expect(config.encryptedFields).toEqual(['custom_field1', 'custom_field2']);
      expect(config.searchableFields).toEqual(['custom_field1']);
      expect(config.metadataFields).toEqual(['custom_version', 'custom_timestamp']);
    });

    it('should use default values when not specified', () => {
      const config = createFieldMappingConfig(['field1']);

      expect(config.encryptedFields).toEqual(['field1']);
      expect(config.searchableFields).toEqual([]);
      expect(config.metadataFields).toEqual(['encryption_schema_version', 'encrypted_at']);
    });
  });

  describe('Wedding Data Type Configurations', () => {
    it('should have proper configurations for all wedding data types', () => {
      const dataTypes: WeddingDataType[] = ['guest', 'vendor', 'payment', 'timeline'];
      
      dataTypes.forEach(dataType => {
        const config = getEncryptionConfig(dataType);
        expect(config).toBeDefined();
        expect(config.encryptedFields.length).toBeGreaterThan(0);
        expect(config.metadataFields.length).toBeGreaterThan(0);
      });
    });

    it('should have different encryption patterns for different data types', () => {
      const guestConfig = getEncryptionConfig('guest');
      const paymentConfig = getEncryptionConfig('payment');

      expect(guestConfig.encryptedFields).not.toEqual(paymentConfig.encryptedFields);
      expect(paymentConfig.metadataFields).toContain('pci_compliance_flags');
      expect(guestConfig.metadataFields).not.toContain('pci_compliance_flags');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed encrypted field data', async () => {
      const malformedData = {
        id: '123',
        email: 'not-an-encrypted-object'
      };

      const config = getEncryptionConfig('guest');
      
      await expect(mapEncryptedToFields(malformedData, config, mockDecrypt))
        .resolves.toBeDefined(); // Should not throw, but should handle gracefully
    });

    it('should preserve original data on encryption failure with proper error handling', async () => {
      const failingEncrypt = vi.fn()
        .mockResolvedValueOnce(mockEncrypt('success'))
        .mockRejectedValueOnce(new Error('Encryption failed'));

      const data = {
        id: '123',
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const config = getEncryptionConfig('guest');
      const result = await mapFieldsToEncrypted(data, config, failingEncrypt);

      expect(result.data.email).toHaveProperty('encrypted_value');
      expect(result.data.phone).toBe('+1234567890'); // Original value preserved
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeGuestList = Array.from({ length: 1000 }, (_, i) => ({
        id: `guest-${i}`,
        first_name: `Guest${i}`,
        email: `guest${i}@example.com`,
        phone: `+123456${i.toString().padStart(4, '0')}`
      }));

      const config = getEncryptionConfig('guest');
      const startTime = Date.now();

      const results = await Promise.all(
        largeGuestList.map(guest => mapFieldsToEncrypted(guest, config, mockEncrypt))
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.every(r => r.encryptedFields.includes('email'))).toBe(true);
    });

    it('should handle Unicode and special characters', async () => {
      const unicodeData = {
        id: '123',
        first_name: '张三',
        email: 'test@测试.com',
        notes: 'Special chars: áéíóú ñ €£¥'
      };

      const config = getEncryptionConfig('guest');
      const encrypted = await mapFieldsToEncrypted(unicodeData, config, mockEncrypt);
      const decrypted = await mapEncryptedToFields(encrypted.data, config, mockDecrypt);

      expect(decrypted.data.first_name).toBe('张三');
      expect(decrypted.data.email).toBe('test@测试.com');
      expect(decrypted.data.notes).toBe('Special chars: áéíóú ñ €£¥');
    });
  });
});

describe('Data Mapper - Integration Tests', () => {
  it('should handle complete encrypt-decrypt cycle for all data types', async () => {
    const testData = {
      guest: {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        dietary_restrictions: 'Vegetarian',
        notes: 'VIP guest'
      },
      vendor: {
        id: '2',
        business_name: 'Best Catering',
        contact_name: 'Jane Smith',
        contact_email: 'jane@bestcatering.com',
        contact_phone: '+1987654321',
        business_address: '456 Business Ave',
        tax_id: 'TAX123456',
        notes: 'Preferred vendor'
      }
    };

    for (const [dataType, data] of Object.entries(testData)) {
      const config = getEncryptionConfig(dataType as WeddingDataType);
      
      // Encrypt
      const encrypted = await mapFieldsToEncrypted(data, config, mockEncrypt);
      expect(encrypted.encryptedFields.length).toBeGreaterThan(0);
      
      // Decrypt
      const decrypted = await mapEncryptedToFields(encrypted.data, config, mockDecrypt);
      
      // Verify all original non-metadata fields are restored
      const originalKeys = Object.keys(data);
      const decryptedKeys = Object.keys(decrypted.data);
      
      originalKeys.forEach(key => {
        if (!config.metadataFields.includes(key)) {
          expect(decrypted.data[key]).toEqual((data as any)[key]);
        }
      });
    }
  });
});