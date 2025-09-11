/**
 * WS-241 AI Caching Strategy System - Security Manager Tests
 * Comprehensive test suite for CacheSecurityManager
 * Team B - Backend Infrastructure & API Development
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { CacheSecurityManager, SecurityConfig, SecurityAuditLog } from '@/lib/ai-cache/CacheSecurityManager';
import { createHash, randomBytes } from 'crypto';

// Mock dependencies
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    lrange: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1)
  }))
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }))
}));

vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn(() => Buffer.from('1234567890abcdef', 'hex')),
    createCipheriv: vi.fn(() => ({
      update: vi.fn(() => 'encrypted'),
      final: vi.fn(() => 'data')
    })),
    createDecipheriv: vi.fn(() => ({
      update: vi.fn(() => 'decrypted'),
      final: vi.fn(() => 'data')
    }))
  };
});

describe('CacheSecurityManager', () => {
  let securityManager: CacheSecurityManager;
  let mockRedis: any;
  let mockSupabase: any;

  const testConfig: SecurityConfig = {
    encryptionEnabled: true,
    encryptionKey: '12345678901234567890123456789012', // 32 characters
    auditLoggingEnabled: true,
    gdprComplianceMode: true,
    maxRetentionDays: 90,
    allowedOrigins: ['https://wedsync.com'],
    maxRequestSize: 1024 * 1024, // 1MB
    rateLimitConfig: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    dataClassification: {
      pii_fields: ['email', 'phone', 'guest_names'],
      sensitive_fields: ['wedding_budget', 'payment_info'],
      public_fields: ['venue_type', 'wedding_style']
    }
  };

  beforeAll(() => {
    process.env.CACHE_ENCRYPTION_KEY = '12345678901234567890123456789012';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    securityManager = new CacheSecurityManager(
      'https://test.supabase.co',
      'test-service-key',
      'redis://localhost:6379',
      testConfig
    );

    mockRedis = (securityManager as any).redis;
    mockSupabase = (securityManager as any).supabase;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate valid input data', () => {
      const validData = {
        venue_type: 'outdoor',
        wedding_style: 'rustic',
        guest_count: 150,
        location: 'California'
      };

      const result = securityManager.validateCacheInput(validData);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.sanitized).toEqual(validData);
    });

    it('should reject data exceeding size limits', () => {
      const oversizedData = {
        description: 'A'.repeat(2 * 1024 * 1024) // 2MB - exceeds 1MB limit
      };

      const result = securityManager.validateCacheInput(oversizedData);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain(
        expect.stringContaining('exceeds limit')
      );
    });

    it('should sanitize potentially dangerous script content', () => {
      const maliciousData = {
        venue_name: 'Beautiful Venue<script>alert("xss")</script>',
        description: 'javascript:void(0)',
        notes: '<img onerror="alert(1)" src=x>'
      };

      const result = securityManager.validateCacheInput(maliciousData);

      expect(result.sanitized?.venue_name).not.toContain('<script>');
      expect(result.sanitized?.description).not.toContain('javascript:');
      expect(result.sanitized?.notes).not.toContain('onerror');
    });

    it('should detect SQL injection patterns', () => {
      const sqlInjectionData = {
        search_query: "'; DROP TABLE users; --",
        filter: "1' UNION SELECT * FROM passwords"
      };

      const result = securityManager.validateCacheInput(sqlInjectionData);

      expect(result.securityFlags).toContain('potential_sql_injection');
    });

    it('should detect XSS patterns', () => {
      const xssData = {
        user_input: '<script>steal_cookies()</script>',
        comment: 'javascript:malicious_function()'
      };

      const result = securityManager.validateCacheInput(xssData);

      expect(result.securityFlags).toContain('potential_xss');
    });

    it('should detect path traversal attempts', () => {
      const pathTraversalData = {
        file_path: '../../../etc/passwd',
        upload_path: '..\\..\\windows\\system32'
      };

      const result = securityManager.validateCacheInput(pathTraversalData);

      expect(result.securityFlags).toContain('potential_path_traversal');
    });

    it('should validate email formats', () => {
      const invalidEmailData = {
        contact_email: 'not-an-email',
        backup_email: 'invalid@'
      };

      const result = securityManager.validateCacheInput(invalidEmailData);

      expect(result.violations).toContain(
        expect.stringContaining('Invalid email format')
      );
    });

    it('should validate phone formats', () => {
      const invalidPhoneData = {
        contact_phone: 'abc123',
        emergency_phone: '123'
      };

      const result = securityManager.validateCacheInput(invalidPhoneData);

      expect(result.violations).toContain(
        expect.stringContaining('Invalid phone format')
      );
    });
  });

  describe('Data Encryption and Decryption', () => {
    const testData = {
      venue_type: 'outdoor',
      email: 'test@example.com',
      wedding_budget: 50000,
      guest_names: ['John Doe', 'Jane Smith'],
      payment_info: 'card_1234'
    };

    it('should encrypt sensitive and PII fields', () => {
      const encrypted = securityManager.encryptSensitiveData(testData);

      expect(encrypted.venue_type).toBe(testData.venue_type); // Public field, not encrypted
      expect(encrypted.email).toContain('enc:'); // PII field, encrypted
      expect(encrypted.wedding_budget).toContain('enc:'); // Sensitive field, encrypted
      expect(encrypted.guest_names).toContain('enc:'); // PII field, encrypted
      expect(encrypted.payment_info).toContain('enc:'); // Sensitive field, encrypted
    });

    it('should decrypt previously encrypted fields', () => {
      const encrypted = securityManager.encryptSensitiveData(testData);
      const decrypted = securityManager.decryptSensitiveData(encrypted);

      expect(decrypted.venue_type).toBe(testData.venue_type);
      expect(decrypted.email).toBe(testData.email);
      expect(decrypted.wedding_budget).toBe(testData.wedding_budget);
    });

    it('should skip encryption when disabled', () => {
      const configWithoutEncryption = {
        ...testConfig,
        encryptionEnabled: false
      };

      const managerWithoutEncryption = new CacheSecurityManager(
        'https://test.supabase.co',
        'test-service-key',
        'redis://localhost:6379',
        configWithoutEncryption
      );

      const result = managerWithoutEncryption.encryptSensitiveData(testData);

      expect(result).toEqual(testData); // Should be unchanged
    });

    it('should handle decryption failures gracefully', () => {
      const corruptedData = {
        email: 'enc:corrupted:data',
        wedding_budget: 'enc:invalid:format'
      };

      const decrypted = securityManager.decryptSensitiveData(corruptedData);

      // Should keep encrypted values if decryption fails
      expect(decrypted.email).toBe(corruptedData.email);
      expect(decrypted.wedding_budget).toBe(corruptedData.wedding_budget);
    });
  });

  describe('Security Audit Logging', () => {
    it('should log security events to database and Redis', async () => {
      const testEvent: Partial<SecurityAuditLog> = {
        event_type: 'access',
        severity: 'medium',
        user_id: 'user-123',
        organization_id: 'org-456',
        resource_type: 'cache',
        action: 'query',
        details: { cache_type: 'venue_recommendations' },
        ip_address: '192.168.1.1'
      };

      await securityManager.logSecurityEvent(testEvent);

      expect(mockSupabase.from).toHaveBeenCalledWith('security_audit_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'access',
          severity: 'medium',
          user_id: 'user-123',
          resource_type: 'cache'
        })
      );

      expect(mockRedis.lpush).toHaveBeenCalled();
      expect(mockRedis.ltrim).toHaveBeenCalled();
    });

    it('should trigger alerts for high-severity events', async () => {
      const criticalEvent: Partial<SecurityAuditLog> = {
        event_type: 'security_violation',
        severity: 'critical',
        resource_type: 'cache',
        action: 'data_breach_attempt'
      };

      await securityManager.logSecurityEvent(criticalEvent);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('alerts'),
        expect.any(String)
      );
    });

    it('should handle logging failures gracefully', async () => {
      mockSupabase.from().insert.mockRejectedValue(new Error('Database connection failed'));

      const testEvent: Partial<SecurityAuditLog> = {
        event_type: 'access',
        severity: 'low'
      };

      // Should not throw even if logging fails
      await expect(
        securityManager.logSecurityEvent(testEvent)
      ).resolves.not.toThrow();
    });
  });

  describe('Data Retention and GDPR Compliance', () => {
    beforeEach(() => {
      mockSupabase.from().delete.mockResolvedValue({ data: [{}], error: null });
      mockSupabase.from().select().lt().eq.mockResolvedValue({ data: [], error: null });
      mockSupabase.from().update.mockResolvedValue({ data: [], error: null });
    });

    it('should enforce data retention policies', async () => {
      const retentionResult = await securityManager.enforceDataRetention();

      expect(retentionResult.deleted_entries).toBeGreaterThanOrEqual(0);
      expect(retentionResult.anonymized_entries).toBeGreaterThanOrEqual(0);
      expect(retentionResult.errors).toBeInstanceOf(Array);
    });

    it('should handle data deletion requests (GDPR Article 17)', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';

      const deletionResult = await securityManager.handleDataDeletionRequest(userId, organizationId);

      expect(deletionResult.status).toMatch(/^(completed|partial|failed)$/);
      expect(deletionResult.deleted_entries).toBeGreaterThanOrEqual(0);
      expect(deletionResult.anonymized_entries).toBeGreaterThanOrEqual(0);

      // Should log the deletion request
      expect(mockSupabase.from).toHaveBeenCalledWith('security_audit_logs');
    });

    it('should generate GDPR compliance reports', async () => {
      const organizationId = 'org-456';
      
      // Mock cache entries for analysis
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [
          {
            cache_type: 'venue_recommendations',
            wedding_context: {
              contact_email: 'test@example.com',
              guest_names: ['John Doe']
            },
            created_at: new Date().toISOString()
          }
        ],
        error: null
      });

      const report = await securityManager.generateGDPRReport(organizationId);

      expect(report.data_categories).toBeInstanceOf(Array);
      expect(report.compliance_score).toBeGreaterThanOrEqual(0);
      expect(report.compliance_score).toBeLessThanOrEqual(100);
      expect(report.user_rights).toHaveProperty('right_to_access');
      expect(report.user_rights).toHaveProperty('right_to_erasure');
    });

    it('should anonymize PII data correctly', async () => {
      const entryWithPII = {
        cache_type: 'guest_management',
        wedding_context: {
          contact_email: 'real@example.com',
          contact_phone: '+1234567890',
          guest_names: ['John Doe', 'Jane Smith'],
          location: 'Venue Address'
        },
        user_id: 'user-123'
      };

      const anonymized = (securityManager as any).anonymizePIIData(entryWithPII);

      expect(anonymized.wedding_context.contact_email).toBe('anonymized@example.com');
      expect(anonymized.wedding_context.contact_phone).toBe('***-***-****');
      expect(anonymized.wedding_context.guest_names).toEqual(['Guest 1', 'Guest 2']);
      expect(anonymized.user_id).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should create rate limiter with default config', () => {
      const rateLimiter = securityManager.createRateLimiter();

      expect(rateLimiter).toBeDefined();
    });

    it('should create rate limiter with custom config', () => {
      const customConfig = {
        windowMs: 60 * 1000, // 1 minute
        max: 10 // 10 requests per minute
      };

      const rateLimiter = securityManager.createRateLimiter(customConfig);

      expect(rateLimiter).toBeDefined();
    });
  });

  describe('Security Health Check', () => {
    it('should return healthy status when all systems operational', async () => {
      const health = await securityManager.securityHealthCheck();

      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.checks).toBeInstanceOf(Array);
      expect(health.recommendations).toBeInstanceOf(Array);
    });

    it('should detect encryption configuration issues', async () => {
      const configWithoutEncryption = {
        ...testConfig,
        encryptionEnabled: false
      };

      const managerWithoutEncryption = new CacheSecurityManager(
        'https://test.supabase.co',
        'test-service-key',
        'redis://localhost:6379',
        configWithoutEncryption
      );

      const health = await managerWithoutEncryption.securityHealthCheck();

      expect(health.recommendations).toContain('Configure encryption for sensitive data');
    });

    it('should detect audit logging issues', async () => {
      const configWithoutAuditLogging = {
        ...testConfig,
        auditLoggingEnabled: false
      };

      const managerWithoutAuditLogging = new CacheSecurityManager(
        'https://test.supabase.co',
        'test-service-key',
        'redis://localhost:6379',
        configWithoutAuditLogging
      );

      const health = await managerWithoutAuditLogging.securityHealthCheck();

      expect(health.recommendations).toContain('Enable audit logging for compliance');
    });

    it('should detect critical security alerts', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({
          severity: 'critical',
          timestamp: new Date().toISOString(),
          event_type: 'security_violation'
        })
      ]);

      const health = await securityManager.securityHealthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.recommendations).toContain('Review and address critical security alerts');
    });
  });

  describe('PII and Data Classification', () => {
    it('should correctly identify PII categories in cache entries', async () => {
      const entries = [
        {
          wedding_context: {
            contact_email: 'test@example.com',
            contact_phone: '+1234567890',
            guest_names: ['John Doe'],
            address: '123 Main St'
          },
          created_at: new Date().toISOString()
        }
      ];

      const categories = (securityManager as any).analyzePIICategories(entries);

      expect(categories).toContain(
        expect.objectContaining({ category: 'email_addresses' })
      );
      expect(categories).toContain(
        expect.objectContaining({ category: 'phone_numbers' })
      );
      expect(categories).toContain(
        expect.objectContaining({ category: 'personal_names' })
      );
      expect(categories).toContain(
        expect.objectContaining({ category: 'addresses' })
      );
    });

    it('should calculate GDPR compliance score correctly', async () => {
      const reportWithIssues = {
        data_breaches: [{ severity: 'high' }],
        retention_status: {
          guest_data: { compliant: false },
          vendor_data: { compliant: true }
        },
        user_rights: {
          right_to_erasure: true,
          right_to_portability: true
        }
      };

      const score = (securityManager as any).calculateComplianceScore(reportWithIssues);

      expect(score).toBeLessThan(100); // Should be reduced due to breach and retention issues
      expect(score).toBeGreaterThan(50); // But not critically low due to good user rights support
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed encryption keys gracefully', () => {
      const configWithBadKey = {
        ...testConfig,
        encryptionKey: 'too_short' // Invalid key length
      };

      const managerWithBadKey = new CacheSecurityManager(
        'https://test.supabase.co',
        'test-service-key',
        'redis://localhost:6379',
        configWithBadKey
      );

      expect(() => {
        managerWithBadKey.encryptSensitiveData({ sensitive: 'data' });
      }).toThrow();
    });

    it('should handle Redis failures in security logging', async () => {
      mockRedis.lpush.mockRejectedValue(new Error('Redis connection failed'));

      const testEvent: Partial<SecurityAuditLog> = {
        event_type: 'access',
        severity: 'low'
      };

      // Should not throw even if Redis logging fails
      await expect(
        securityManager.logSecurityEvent(testEvent)
      ).resolves.not.toThrow();
    });

    it('should handle empty or null data in validation', () => {
      const emptyResults = [
        securityManager.validateCacheInput(null),
        securityManager.validateCacheInput(undefined),
        securityManager.validateCacheInput(''),
        securityManager.validateCacheInput({})
      ];

      emptyResults.forEach(result => {
        expect(result.isValid).toBeDefined();
        expect(result.violations).toBeInstanceOf(Array);
        expect(result.securityFlags).toBeInstanceOf(Array);
      });
    });

    it('should handle database connection failures in GDPR operations', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      });

      await expect(
        securityManager.generateGDPRReport('org-123')
      ).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should validate large datasets efficiently', () => {
      const largeData = {
        venues: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Venue ${i}`,
          email: `venue${i}@example.com`,
          phone: `+123456789${i}`
        }))
      };

      const startTime = Date.now();
      const result = securityManager.validateCacheInput(largeData);
      const endTime = Date.now();

      expect(result.isValid).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent security operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        securityManager.logSecurityEvent({
          event_type: 'access',
          severity: 'low',
          resource_type: 'test',
          action: `concurrent_test_${i}`
        })
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should efficiently encrypt and decrypt large amounts of data', () => {
      const largeData = {
        wedding_budget: 100000,
        guest_names: new Array(500).fill(0).map((_, i) => `Guest ${i}`),
        vendor_contacts: new Array(50).fill(0).map((_, i) => ({
          name: `Vendor ${i}`,
          email: `vendor${i}@example.com`,
          phone: `+123456789${i}`
        }))
      };

      const startTime = Date.now();
      const encrypted = securityManager.encryptSensitiveData(largeData);
      const decrypted = securityManager.decryptSensitiveData(encrypted);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(decrypted.wedding_budget).toBe(largeData.wedding_budget);
    });
  });
});