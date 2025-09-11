/**
 * WS-175 Advanced Data Encryption - Field Encryption Tests
 * Team B - Round 1 Implementation
 * 
 * Comprehensive unit tests for field-level encryption service
 * Target: >80% code coverage
 */

import { FieldEncryption } from '@/lib/encryption/field-encryption';
import { KeyManagement } from '@/lib/encryption/key-management';
import { SecurityAuditLogger } from '@/lib/encryption/audit-logger';
import { EncryptionContext, EncryptionResult, EncryptionError } from '@/types/encryption';

// Mock dependencies
jest.mock('@/lib/encryption/key-management');
jest.mock('@/lib/encryption/audit-logger');

const MockKeyManagement = KeyManagement as jest.MockedClass<typeof KeyManagement>;
const MockSecurityAuditLogger = SecurityAuditLogger as jest.MockedClass<typeof SecurityAuditLogger>;

describe('FieldEncryption', () => {
  let mockKeyManagement: jest.Mocked<KeyManagement>;
  let mockAuditLogger: jest.Mocked<SecurityAuditLogger>;

  const mockKey = {
    id: 'test-key-id',
    keyHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: 'active' as const,
    algorithm: 'aes-256-gcm',
    createdAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-04-01'),
    createdBy: 'test-user'
  };

  const mockContext: EncryptionContext = {
    userId: 'test-user-id',
    fieldType: 'email',
    tableName: 'user_profiles',
    recordId: 'test-record-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockKeyManagement = new MockKeyManagement() as jest.Mocked<KeyManagement>;
    mockAuditLogger = new MockSecurityAuditLogger() as jest.Mocked<SecurityAuditLogger>;
    
    mockKeyManagement.getActiveKey.mockResolvedValue(mockKey);
    mockKeyManagement.getKey.mockResolvedValue(mockKey);
    mockAuditLogger.log.mockResolvedValue();

    // Mock static properties
    (FieldEncryption as any).keyManagement = mockKeyManagement;
    (FieldEncryption as any).auditLogger = mockAuditLogger;
  });

  describe('encryptField', () => {
    it('should successfully encrypt a field', async () => {
      const plaintext = 'test@example.com';
      
      const result = await FieldEncryption.encryptField(plaintext, mockContext);

      expect(result).toBeDefined();
      expect(result.encryptedData).toBeDefined();
      expect(result.keyId).toBe(mockKey.id);
      expect(result.algorithm).toBe('aes-256-gcm');
      expect(result.iv).toBeDefined();
      expect(result.authTag).toBeDefined();
      expect(result.version).toBe(1);
      
      // Verify the encrypted data is different from plaintext
      expect(result.encryptedData).not.toBe(plaintext);
      
      // Verify audit logging was called
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FIELD_ENCRYPTED',
          userId: mockContext.userId,
          fieldType: mockContext.fieldType,
          keyId: mockKey.id,
          success: true
        })
      );
    });

    it('should validate plaintext input', async () => {
      await expect(FieldEncryption.encryptField('', mockContext))
        .rejects.toThrow('Invalid plaintext: cannot be empty');

      await expect(FieldEncryption.encryptField(null as any, mockContext))
        .rejects.toThrow('Invalid plaintext: must be a non-empty string');

      await expect(FieldEncryption.encryptField(123 as any, mockContext))
        .rejects.toThrow('Invalid plaintext: must be a non-empty string');
    });

    it('should validate context input', async () => {
      const plaintext = 'test@example.com';

      await expect(FieldEncryption.encryptField(plaintext, null as any))
        .rejects.toThrow('Invalid encryption context: must be an object');

      await expect(FieldEncryption.encryptField(plaintext, {} as any))
        .rejects.toThrow('Invalid encryption context: userId is required');

      await expect(FieldEncryption.encryptField(plaintext, { userId: 'test' } as any))
        .rejects.toThrow('Invalid encryption context: fieldType is required');
    });

    it('should handle very long plaintext', async () => {
      const longText = 'a'.repeat(65000);
      
      await expect(FieldEncryption.encryptField(longText, mockContext))
        .rejects.toThrow('Invalid plaintext: exceeds maximum length');
    });

    it('should handle missing encryption key', async () => {
      mockKeyManagement.getActiveKey.mockResolvedValue(null);

      const plaintext = 'test@example.com';
      
      await expect(FieldEncryption.encryptField(plaintext, mockContext))
        .rejects.toThrow('No active encryption key available');

      // Verify failure was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FIELD_ENCRYPTED',
          success: false
        })
      );
    });

    it('should handle expired encryption key', async () => {
      const expiredKey = {
        ...mockKey,
        expiresAt: new Date('2023-01-01') // Past date
      };
      mockKeyManagement.getActiveKey.mockResolvedValue(expiredKey);

      const plaintext = 'test@example.com';
      
      await expect(FieldEncryption.encryptField(plaintext, mockContext))
        .rejects.toThrow('Encryption key has expired');
    });

    it('should use encryption options', async () => {
      const plaintext = 'test@example.com';
      const options = { auditEncryption: false };
      
      const result = await FieldEncryption.encryptField(plaintext, mockContext, options);

      expect(result).toBeDefined();
      // Should still audit (auditEncryption option is for future use)
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });
  });

  describe('decryptField', () => {
    let mockEncryptedData: EncryptionResult;

    beforeEach(() => {
      mockEncryptedData = {
        encryptedData: '1234567890abcdef',
        keyId: mockKey.id,
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };
    });

    it('should successfully decrypt a field', async () => {
      // First encrypt something to get real encrypted data
      const plaintext = 'test@example.com';
      const encryptedData = await FieldEncryption.encryptField(plaintext, mockContext);
      
      // Now decrypt it
      const decrypted = await FieldEncryption.decryptField(encryptedData, mockContext);
      
      expect(decrypted).toBe(plaintext);

      // Verify audit logging for decryption
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FIELD_DECRYPTED',
          userId: mockContext.userId,
          fieldType: mockContext.fieldType,
          success: true
        })
      );
    });

    it('should validate encrypted data structure', async () => {
      const invalidData = { invalid: 'data' } as any;
      
      await expect(FieldEncryption.decryptField(invalidData, mockContext))
        .rejects.toThrow();
    });

    it('should handle missing decryption key', async () => {
      mockKeyManagement.getKey.mockResolvedValue(null);

      await expect(FieldEncryption.decryptField(mockEncryptedData, mockContext))
        .rejects.toThrow(`Decryption key ${mockEncryptedData.keyId} not found`);

      // Verify failure was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FIELD_DECRYPTED',
          success: false
        })
      );
    });

    it('should handle inactive key when requireActiveKey is true', async () => {
      const inactiveKey = { ...mockKey, status: 'deprecated' as const };
      mockKeyManagement.getKey.mockResolvedValue(inactiveKey);

      const options = { requireActiveKey: true };
      
      await expect(FieldEncryption.decryptField(mockEncryptedData, mockContext, options))
        .rejects.toThrow('Decryption attempted with inactive key');
    });

    it('should allow decryption with inactive key by default', async () => {
      const inactiveKey = { ...mockKey, status: 'deprecated' as const };
      mockKeyManagement.getKey.mockResolvedValue(inactiveKey);

      // First encrypt with active key
      const plaintext = 'test@example.com';
      const encryptedData = await FieldEncryption.encryptField(plaintext, mockContext);
      
      // Now decrypt with inactive key (should work)
      const decrypted = await FieldEncryption.decryptField(encryptedData, mockContext);
      expect(decrypted).toBe(plaintext);
    });

    it('should skip audit when auditAccess is false', async () => {
      const plaintext = 'test@example.com';
      const encryptedData = await FieldEncryption.encryptField(plaintext, mockContext);
      
      // Clear previous audit calls
      mockAuditLogger.log.mockClear();
      
      const options = { auditAccess: false };
      const decrypted = await FieldEncryption.decryptField(encryptedData, mockContext, options);
      
      expect(decrypted).toBe(plaintext);
      // Should only have encryption audit, not decryption audit
      expect(mockAuditLogger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'FIELD_DECRYPTED' })
      );
    });
  });

  describe('encryptBulk', () => {
    it('should encrypt multiple fields successfully', async () => {
      const fields = [
        { data: 'test1@example.com', context: { ...mockContext, fieldType: 'email' as const } },
        { data: '+1234567890', context: { ...mockContext, fieldType: 'phone' as const } },
        { data: 'Secret notes', context: { ...mockContext, fieldType: 'notes' as const } }
      ];

      const results = await FieldEncryption.encryptBulk(fields);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.encryptedData).toBeDefined();
        expect(result.keyId).toBe(mockKey.id);
        expect(result.encryptedData).not.toBe(fields[index].data);
      });

      // Verify bulk operation was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_ENCRYPTION_COMPLETED',
          success: true,
          metadata: expect.objectContaining({
            fieldsCount: 3
          })
        })
      );
    });

    it('should handle bulk encryption failure gracefully', async () => {
      mockKeyManagement.getActiveKey.mockRejectedValue(new Error('Key service unavailable'));

      const fields = [
        { data: 'test@example.com', context: mockContext }
      ];

      await expect(FieldEncryption.encryptBulk(fields))
        .rejects.toThrow('Key service unavailable');

      // Verify failure was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_ENCRYPTION_FAILED',
          success: false
        })
      );
    });

    it('should handle empty fields array', async () => {
      const results = await FieldEncryption.encryptBulk([]);
      expect(results).toEqual([]);
    });
  });

  describe('decryptBulk', () => {
    it('should decrypt multiple fields successfully', async () => {
      // First encrypt some data
      const plaintexts = ['test1@example.com', '+1234567890', 'Secret notes'];
      const encryptedFields = [];
      
      for (const plaintext of plaintexts) {
        const encrypted = await FieldEncryption.encryptField(plaintext, mockContext);
        encryptedFields.push({ data: encrypted, context: mockContext });
      }

      // Now decrypt in bulk
      const results = await FieldEncryption.decryptBulk(encryptedFields);

      expect(results).toHaveLength(3);
      expect(results).toEqual(plaintexts);

      // Verify bulk operation was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_DECRYPTION_COMPLETED',
          success: true,
          metadata: expect.objectContaining({
            fieldsCount: 3
          })
        })
      );
    });

    it('should handle bulk decryption failure', async () => {
      mockKeyManagement.getKey.mockRejectedValue(new Error('Key retrieval failed'));

      const mockEncryptedData = {
        encryptedData: '1234567890abcdef',
        keyId: 'test-key',
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };

      const fields = [{ data: mockEncryptedData, context: mockContext }];

      await expect(FieldEncryption.decryptBulk(fields))
        .rejects.toThrow('Key retrieval failed');

      // Verify failure was audited
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_DECRYPTION_FAILED',
          success: false
        })
      );
    });
  });

  describe('validateEncryptedData', () => {
    it('should validate correct encrypted data structure', () => {
      const validData: EncryptionResult = {
        encryptedData: '1234567890abcdef',
        keyId: 'test-key-id',
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };

      expect(FieldEncryption.validateEncryptedData(validData)).toBe(true);
    });

    it('should reject null or undefined data', () => {
      expect(FieldEncryption.validateEncryptedData(null as any)).toBe(false);
      expect(FieldEncryption.validateEncryptedData(undefined as any)).toBe(false);
    });

    it('should reject data missing required fields', () => {
      const incompleteData = {
        encryptedData: '1234567890abcdef',
        keyId: 'test-key-id'
        // Missing algorithm, iv, authTag, version
      } as any;

      expect(FieldEncryption.validateEncryptedData(incompleteData)).toBe(false);
    });

    it('should reject invalid hex strings', () => {
      const invalidHexData = {
        encryptedData: 'invalid-hex-string',
        keyId: 'test-key-id',
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };

      expect(FieldEncryption.validateEncryptedData(invalidHexData)).toBe(false);
    });

    it('should reject wrong algorithm', () => {
      const wrongAlgorithmData = {
        encryptedData: '1234567890abcdef',
        keyId: 'test-key-id',
        algorithm: 'aes-128-cbc', // Wrong algorithm
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };

      expect(FieldEncryption.validateEncryptedData(wrongAlgorithmData)).toBe(false);
    });

    it('should reject wrong version', () => {
      const wrongVersionData = {
        encryptedData: '1234567890abcdef',
        keyId: 'test-key-id',
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 2 // Wrong version
      };

      expect(FieldEncryption.validateEncryptedData(wrongVersionData)).toBe(false);
    });

    it('should handle exceptions gracefully', () => {
      // Create data that will cause an exception during validation
      const malformedData = {
        get encryptedData() { throw new Error('Getter error'); },
        keyId: 'test-key-id',
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890abcdef1234567890',
        authTag: '1234567890abcdef1234567890abcdef',
        version: 1
      };

      expect(FieldEncryption.validateEncryptedData(malformedData)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should create proper encryption errors', async () => {
      mockKeyManagement.getActiveKey.mockRejectedValue(new Error('Database connection failed'));

      const plaintext = 'test@example.com';
      
      try {
        await FieldEncryption.encryptField(plaintext, mockContext);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Field encryption failed');
      }
    });

    it('should handle crypto library errors', async () => {
      // Mock crypto functions to throw errors
      const originalCrypto = require('crypto');
      jest.doMock('crypto', () => ({
        ...originalCrypto,
        randomBytes: jest.fn(() => { throw new Error('Crypto error'); })
      }));

      const plaintext = 'test@example.com';
      
      await expect(FieldEncryption.encryptField(plaintext, mockContext))
        .rejects.toThrow();
    });
  });

  describe('GDPR compliance', () => {
    it('should handle different field types correctly', async () => {
      const fieldTypes: Array<EncryptionContext['fieldType']> = [
        'email', 'phone', 'notes', 'address', 
        'dietary_requirements', 'contact_info', 'personal_details'
      ];

      for (const fieldType of fieldTypes) {
        const context = { ...mockContext, fieldType };
        const result = await FieldEncryption.encryptField('test data', context);
        
        expect(result).toBeDefined();
        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldType,
            action: 'FIELD_ENCRYPTED'
          })
        );
      }
    });

    it('should include metadata in audit logs', async () => {
      const plaintext = 'test@example.com';
      await FieldEncryption.encryptField(plaintext, mockContext);

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            tableName: mockContext.tableName,
            recordId: mockContext.recordId
          })
        })
      );
    });
  });

  describe('performance and security', () => {
    it('should complete encryption in reasonable time', async () => {
      const startTime = Date.now();
      const plaintext = 'test@example.com';
      
      await FieldEncryption.encryptField(plaintext, mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should produce different encrypted output for same input', async () => {
      const plaintext = 'test@example.com';
      
      const result1 = await FieldEncryption.encryptField(plaintext, mockContext);
      const result2 = await FieldEncryption.encryptField(plaintext, mockContext);
      
      // Should be different due to random IV
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle concurrent encryption requests', async () => {
      const plaintext = 'test@example.com';
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(FieldEncryption.encryptField(`${plaintext}-${i}`, mockContext));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.encryptedData).toBeDefined();
        expect(result.keyId).toBe(mockKey.id);
      });
    });
  });
});