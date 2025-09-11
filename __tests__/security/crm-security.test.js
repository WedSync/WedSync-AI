/**
 * CRM Integration Security Tests - WS-343 Team E
 * Comprehensive security testing for CRM integration functionality
 * Tests SQL injection, XSS, authentication bypass, and data exposure
 */

import { jest } from '@jest/globals';
import { CRMIntegrationService } from '../../src/services/crm/CRMIntegrationService';
import { ErrorScenarioFactory } from '../factories/crm-test-data';

describe('CRM Integration Security Tests', () => {
  let crmService;
  let mockUser;

  beforeEach(() => {
    mockUser = global.CRMTestUtils.mockAuthenticatedUser();
    crmService = new CRMIntegrationService(mockUser);
    
    global.fetch.mockClear();
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in client search', async () => {
      const maliciousInput = "'; DROP TABLE clients; SELECT * FROM clients WHERE '1'='1";
      
      // Mock database query function
      const mockQuery = jest.fn().mockResolvedValue({ data: [], error: null });
      jest.spyOn(crmService, 'executeQuery').mockImplementation(mockQuery);
      
      const result = await crmService.searchClients(maliciousInput);
      
      // Verify that the malicious SQL is not executed
      const executedQuery = mockQuery.mock.calls[0][0];
      expect(executedQuery).not.toContain('DROP TABLE');
      expect(executedQuery).not.toContain('--');
      expect(result.error).toBeUndefined();
    });

    test('should sanitize field mapping inputs', async () => {
      const maliciousMapping = {
        source_field: "'; UPDATE users SET admin = true WHERE id = 1; --",
        target_field: 'display_name'
      };
      
      const sanitized = await crmService.sanitizeFieldMapping(maliciousMapping);
      
      expect(sanitized.source_field).not.toContain('UPDATE');
      expect(sanitized.source_field).not.toContain('--');
      expect(sanitized.source_field).not.toContain(';');
    });

    test('should use parameterized queries for client data', async () => {
      const clientData = {
        first_name: "Robert'; DROP TABLE clients; --",
        last_name: "Tables",
        email: "bobby@tables.com"
      };
      
      const mockParameterizedQuery = jest.fn().mockResolvedValue({ 
        data: { id: 'client-123' }, 
        error: null 
      });
      jest.spyOn(crmService, 'insertClient').mockImplementation(mockParameterizedQuery);
      
      await crmService.createClient(clientData);
      
      // Verify parameterized query was used
      const queryCall = mockParameterizedQuery.mock.calls[0];
      expect(queryCall[1]).toEqual(expect.objectContaining({
        first_name: "Robert'; DROP TABLE clients; --", // Raw data preserved
        last_name: "Tables",
        email: "bobby@tables.com"
      }));
    });

    test('should validate and escape special characters in venue names', () => {
      const venueNames = [
        "O'Malley's Irish Pub",
        "The Manor at \"Castle Rock\"",
        "Venue; DROP TABLE venues; --",
        "<script>alert('xss')</script> Ballroom"
      ];
      
      venueNames.forEach(venue => {
        const sanitized = crmService.sanitizeVenueName(venue);
        
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('--');
      });
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent XSS in client name display', () => {
      const maliciousClientData = {
        first_name: "<script>alert('xss')</script>",
        last_name: "<img src=x onerror=alert('xss')>",
        email: "test@example.com"
      };
      
      const sanitized = crmService.sanitizeClientData(maliciousClientData);
      
      expect(sanitized.first_name).not.toContain('<script>');
      expect(sanitized.first_name).not.toContain('onerror');
      expect(sanitized.last_name).not.toContain('<img');
      expect(sanitized.last_name).not.toContain('onerror');
    });

    test('should sanitize CRM provider data before display', async () => {
      const maliciousProviderData = {
        client_name: "John & Jane <script>alert('xss')</script> Smith",
        notes: "Beautiful couple! <iframe src='javascript:alert(document.cookie)'></iframe>",
        venue: "Sunset Manor <style>body{display:none}</style>"
      };
      
      const sanitized = crmService.sanitizeProviderData('tave', maliciousProviderData);
      
      expect(sanitized.client_name).not.toContain('<script>');
      expect(sanitized.notes).not.toContain('<iframe>');
      expect(sanitized.venue).not.toContain('<style>');
      
      // Verify legitimate content is preserved
      expect(sanitized.client_name).toContain('John & Jane');
      expect(sanitized.notes).toContain('Beautiful couple!');
      expect(sanitized.venue).toContain('Sunset Manor');
    });

    test('should escape HTML entities in error messages', async () => {
      const maliciousInput = "<script>alert('xss')</script>";
      
      global.fetch.mockRejectedValueOnce(new Error(`API call failed for input: ${maliciousInput}`));
      
      const result = await crmService.importClients('tave');
      
      expect(result.error).toBeDefined();
      expect(result.message).not.toContain('<script>');
      expect(result.message).toContain('&lt;script&gt;');
    });

    test('should sanitize custom field mappings', () => {
      const maliciousMapping = {
        source_field: 'client_name',
        target_field: 'display_name',
        custom_label: "<script>alert('admin panel hijacked')</script>"
      };
      
      const sanitized = crmService.sanitizeCustomMapping(maliciousMapping);
      
      expect(sanitized.custom_label).not.toContain('<script>');
      expect(sanitized.custom_label).toContain('&lt;script&gt;');
    });
  });

  describe('Authentication Security', () => {
    test('should validate OAuth state parameter', async () => {
      const validCallback = {
        code: 'auth-code-123',
        state: 'valid-state-456',
        provider: 'tave'
      };
      
      const invalidCallback = {
        code: 'auth-code-123',
        state: 'malicious-state-789',
        provider: 'tave'
      };
      
      // Mock stored OAuth state
      jest.spyOn(crmService, 'getStoredOAuthState').mockResolvedValue({
        state: 'valid-state-456',
        code_verifier: 'test-verifier'
      });
      
      global.CRMProviderMockFactory.mockTaveAPI();
      
      // Valid state should succeed
      const validResult = await crmService.handleOAuthCallback(validCallback);
      expect(validResult.success).toBe(true);
      
      // Invalid state should fail
      await expect(crmService.handleOAuthCallback(invalidCallback))
        .rejects.toThrow('Invalid OAuth state');
    });

    test('should prevent OAuth state reuse', async () => {
      const callback = {
        code: 'auth-code-123',
        state: 'reused-state-456',
        provider: 'tave'
      };
      
      jest.spyOn(crmService, 'getStoredOAuthState').mockResolvedValue({
        state: 'reused-state-456',
        code_verifier: 'test-verifier'
      });
      
      global.CRMProviderMockFactory.mockTaveAPI();
      
      // First use should succeed
      const firstResult = await crmService.handleOAuthCallback(callback);
      expect(firstResult.success).toBe(true);
      
      // Verify state is invalidated after use
      jest.spyOn(crmService, 'getStoredOAuthState').mockResolvedValue(null);
      
      // Second use should fail
      await expect(crmService.handleOAuthCallback(callback))
        .rejects.toThrow('Invalid or expired OAuth state');
    });

    test('should validate API key format and prevent injection', () => {
      const validKeys = [
        'hb_live_1234567890abcdef',
        'lb_prod_abcd1234efgh5678',
        'tave_sk_test_xyz789'
      ];
      
      const invalidKeys = [
        'fake-key',
        '"; DROP TABLE api_keys; --',
        '<script>alert("hack")</script>',
        'SELECT * FROM users'
      ];
      
      validKeys.forEach(key => {
        expect(crmService.validateAPIKey('honeybook', key)).toBe(true);
      });
      
      invalidKeys.forEach(key => {
        expect(crmService.validateAPIKey('honeybook', key)).toBe(false);
      });
    });

    test('should enforce session authentication on all endpoints', async () => {
      const unauthenticatedService = new CRMIntegrationService(null);
      
      await expect(unauthenticatedService.importClients('tave'))
        .rejects.toThrow('Authentication required');
        
      await expect(unauthenticatedService.getIntegrationStatus())
        .rejects.toThrow('Authentication required');
        
      await expect(unauthenticatedService.deleteIntegration('tave'))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('Authorization Controls', () => {
    test('should prevent cross-user data access', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com' };
      const user2 = { id: 'user-2', email: 'user2@example.com' };
      
      const service1 = new CRMIntegrationService(user1);
      const service2 = new CRMIntegrationService(user2);
      
      // User1 creates integration
      await service1.createIntegration('tave', { api_key: 'test-key-1' });
      
      // User2 should not be able to access User1's integration
      await expect(service2.getIntegration('tave', user1.id))
        .rejects.toThrow('Unauthorized access');
        
      // User2 should not see User1's clients
      const user2Clients = await service2.getClients();
      expect(user2Clients.filter(c => c.owner_id === user1.id)).toHaveLength(0);
    });

    test('should validate user permissions for integration actions', async () => {
      const readOnlyUser = { 
        id: 'readonly-user', 
        email: 'readonly@example.com',
        permissions: ['read'] 
      };
      
      const readOnlyService = new CRMIntegrationService(readOnlyUser);
      
      // Read operations should work
      const status = await readOnlyService.getIntegrationStatus();
      expect(status).toBeDefined();
      
      // Write operations should fail
      await expect(readOnlyService.createIntegration('tave', { api_key: 'test' }))
        .rejects.toThrow('Insufficient permissions');
        
      await expect(readOnlyService.deleteIntegration('tave'))
        .rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Data Exposure Prevention', () => {
    test('should not expose sensitive data in error messages', async () => {
      const sensitiveData = {
        api_key: 'hb_live_secret123456789',
        access_token: 'oauth_token_secret_xyz'
      };
      
      global.fetch.mockRejectedValueOnce(
        new Error(`Connection failed with key: ${sensitiveData.api_key}`)
      );
      
      const result = await crmService.testConnection('honeybook', sensitiveData);
      
      expect(result.error).toBeDefined();
      expect(result.message).not.toContain('secret123456789');
      expect(result.message).not.toContain('oauth_token_secret');
      expect(result.message).toContain('[REDACTED]');
    });

    test('should mask API keys in logs and responses', () => {
      const apiKey = 'hb_live_1234567890abcdef';
      
      const masked = crmService.maskSensitiveData({ api_key: apiKey });
      
      expect(masked.api_key).toBe('hb_live_****cdef');
      expect(masked.api_key).not.toContain('1234567890ab');
    });

    test('should not log sensitive client information', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const sensitiveClient = {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@private-email.com',
        phone: '+1-555-123-4567',
        ssn: '123-45-6789', // Should never be logged
        credit_card: '4111111111111111' // Should never be logged
      };
      
      await crmService.processClientData(sensitiveClient);
      
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      
      expect(logCalls).not.toContain('123-45-6789');
      expect(logCalls).not.toContain('4111111111111111');
      expect(logCalls).not.toContain('private-email.com');
      expect(logCalls).not.toContain('555-123-4567');
      
      consoleSpy.mockRestore();
    });

    test('should sanitize debug information', () => {
      const debugData = {
        user_id: 'user-123',
        api_key: 'secret-key',
        query: 'SELECT * FROM clients',
        error_stack: 'Error: Database connection failed\n    at Connection.execute (/app/db.js:45)',
        client_data: {
          email: 'client@example.com',
          phone: '555-1234'
        }
      };
      
      const sanitized = crmService.sanitizeDebugData(debugData);
      
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.client_data.email).toBe('[REDACTED]');
      expect(sanitized.client_data.phone).toBe('[REDACTED]');
      expect(sanitized.error_stack).toContain('[REDACTED]');
    });
  });

  describe('Input Validation', () => {
    test('should validate email formats strictly', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'sarah@wedding-venue.com'
      ];
      
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'javascript:alert(1)@domain.com',
        '<script>@domain.com'
      ];
      
      validEmails.forEach(email => {
        expect(crmService.validateEmail(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(crmService.validateEmail(email)).toBe(false);
      });
    });

    test('should validate wedding dates within reasonable range', () => {
      const currentYear = new Date().getFullYear();
      
      const validDates = [
        `${currentYear + 1}-06-15`,
        `${currentYear + 2}-12-31`,
        `${currentYear}-12-31`
      ];
      
      const invalidDates = [
        '1990-01-01', // Too old
        `${currentYear + 10}-01-01`, // Too far future
        '2024-02-30', // Invalid date
        'not-a-date',
        '<script>alert(1)</script>'
      ];
      
      validDates.forEach(date => {
        expect(crmService.validateWeddingDate(date)).toBe(true);
      });
      
      invalidDates.forEach(date => {
        expect(crmService.validateWeddingDate(date)).toBe(false);
      });
    });

    test('should validate phone numbers and prevent code injection', () => {
      const validPhones = [
        '(555) 123-4567',
        '+1 555-123-4567',
        '555.123.4567',
        '15551234567'
      ];
      
      const invalidPhones = [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        '"; DROP TABLE clients; --',
        'eval(maliciousCode)',
        'not-a-phone-number'
      ];
      
      validPhones.forEach(phone => {
        const normalized = crmService.normalizePhoneNumber(phone);
        expect(normalized).toMatch(/^\+?[\d\s\-\(\)\.]+$/);
      });
      
      invalidPhones.forEach(phone => {
        expect(() => crmService.normalizePhoneNumber(phone))
          .toThrow('Invalid phone number format');
      });
    });

    test('should validate guest count ranges', () => {
      const validCounts = [1, 50, 150, 300, 500];
      const invalidCounts = [-1, 0, 10000, 'not-a-number', '<script>alert(1)</script>'];
      
      validCounts.forEach(count => {
        expect(crmService.validateGuestCount(count)).toBe(true);
      });
      
      invalidCounts.forEach(count => {
        expect(crmService.validateGuestCount(count)).toBe(false);
      });
    });
  });

  describe('CSRF Protection', () => {
    test('should validate CSRF tokens on state-changing operations', async () => {
      const validToken = 'valid-csrf-token-123';
      const invalidToken = 'invalid-csrf-token-456';
      
      // Mock CSRF token validation
      jest.spyOn(crmService, 'validateCSRFToken')
        .mockImplementation((token) => token === validToken);
      
      const deleteRequest = {
        provider: 'tave',
        csrf_token: validToken
      };
      
      const maliciousRequest = {
        provider: 'tave',
        csrf_token: invalidToken
      };
      
      // Valid token should succeed
      const result = await crmService.deleteIntegration(deleteRequest);
      expect(result.success).toBe(true);
      
      // Invalid token should fail
      await expect(crmService.deleteIntegration(maliciousRequest))
        .rejects.toThrow('Invalid CSRF token');
    });

    test('should require CSRF tokens for bulk operations', async () => {
      const bulkImportRequest = {
        provider: 'tave',
        import_all: true,
        // Missing csrf_token
      };
      
      await expect(crmService.importClients('tave', bulkImportRequest))
        .rejects.toThrow('CSRF token required for bulk operations');
    });
  });

  describe('Rate Limiting Security', () => {
    test('should prevent brute force authentication attempts', async () => {
      const maliciousAttempts = Array.from({ length: 20 }, (_, i) => ({
        provider: 'tave',
        api_key: `fake-key-${i}`
      }));
      
      global.CRMProviderMockFactory.mockAuthenticationError();
      
      let rateLimitTriggered = false;
      
      for (const attempt of maliciousAttempts) {
        try {
          await crmService.testConnection(attempt.provider, attempt);
        } catch (error) {
          if (error.message.includes('Rate limit exceeded')) {
            rateLimitTriggered = true;
            break;
          }
        }
      }
      
      expect(rateLimitTriggered).toBe(true);
    });

    test('should limit sync operations per user', async () => {
      const userId = 'test-user-123';
      const syncPromises = Array.from({ length: 10 }, () => 
        crmService.importClients('tave')
      );
      
      const results = await Promise.allSettled(syncPromises);
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      
      // Should reject some requests due to rate limiting
      expect(rejectedCount).toBeGreaterThan(0);
    });
  });

  describe('Encryption Validation', () => {
    test('should encrypt credentials before storage', async () => {
      const credentials = {
        api_key: 'hb_live_1234567890abcdef',
        api_secret: 'secret-key-xyz'
      };
      
      const encrypted = await crmService.encryptCredentials(credentials);
      
      expect(encrypted.api_key).not.toBe(credentials.api_key);
      expect(encrypted.api_secret).not.toBe(credentials.api_secret);
      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.auth_tag).toBeDefined();
    });

    test('should decrypt credentials correctly', async () => {
      const originalCredentials = {
        api_key: 'hb_live_1234567890abcdef',
        api_secret: 'secret-key-xyz'
      };
      
      const encrypted = await crmService.encryptCredentials(originalCredentials);
      const decrypted = await crmService.decryptCredentials(encrypted);
      
      expect(decrypted.api_key).toBe(originalCredentials.api_key);
      expect(decrypted.api_secret).toBe(originalCredentials.api_secret);
    });
  });
});