/**
 * CRM Integration Service Tests - WS-343 Team E
 * Comprehensive unit tests for CRM integration functionality
 * Target Coverage: 98%+ for core CRM services
 */

import { jest } from '@jest/globals';
import { CRMIntegrationService } from '../CRMIntegrationService';
import { WeddingIndustryDataFactory, TaveDataFactory, AuthTestDataFactory, ErrorScenarioFactory } from '../../__tests__/factories/crm-test-data';

describe('CRMIntegrationService', () => {
  let crmService;
  let mockUser;

  beforeEach(() => {
    mockUser = global.CRMTestUtils.mockAuthenticatedUser();
    crmService = new CRMIntegrationService(mockUser);
    
    // Reset fetch mock for each test
    global.fetch.mockClear();
  });

  describe('Provider Authentication', () => {
    describe('OAuth2 PKCE Flow', () => {
      test('should initiate OAuth flow with correct PKCE parameters', async () => {
        const provider = 'tave';
        const redirectUri = 'http://localhost:3000/api/crm/callback';
        
        const authUrl = await crmService.initiateOAuthFlow(provider, redirectUri);
        
        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain('code_challenge_method=S256');
        expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
        expect(authUrl).toContain('state=');
        expect(authUrl).toContain('code_challenge=');
        
        // Verify state and code_verifier are stored
        const storedState = await crmService.getStoredOAuthState(provider);
        expect(storedState).toHaveProperty('code_verifier');
        expect(storedState).toHaveProperty('state');
      });

      test('should handle OAuth callback with authorization code', async () => {
        global.CRMProviderMockFactory.mockTaveAPI();
        
        const mockCallback = {
          code: 'auth-code-123',
          state: 'oauth-state-456',
          provider: 'tave'
        };
        
        // Mock stored OAuth state
        jest.spyOn(crmService, 'getStoredOAuthState').mockResolvedValue({
          state: 'oauth-state-456',
          code_verifier: 'mock-code-verifier',
          redirect_uri: 'http://localhost:3000/api/crm/callback'
        });
        
        const result = await crmService.handleOAuthCallback(mockCallback);
        
        expect(result.success).toBe(true);
        expect(result.tokens).toHaveProperty('access_token');
        expect(result.tokens).toHaveProperty('refresh_token');
        expect(result.provider).toBe('tave');
      });

      test('should reject OAuth callback with invalid state', async () => {
        const mockCallback = {
          code: 'auth-code-123',
          state: 'invalid-state',
          provider: 'tave'
        };
        
        jest.spyOn(crmService, 'getStoredOAuthState').mockResolvedValue({
          state: 'different-state',
          code_verifier: 'mock-code-verifier'
        });
        
        await expect(crmService.handleOAuthCallback(mockCallback))
          .rejects.toThrow('Invalid OAuth state');
      });

      test('should handle OAuth token refresh', async () => {
        const mockTokens = AuthTestDataFactory.createOAuthTokens();
        mockTokens.expires_in = -1; // Expired token
        
        global.CRMProviderMockFactory.mockTaveAPI();
        
        const refreshedTokens = await crmService.refreshOAuthToken('tave', mockTokens);
        
        expect(refreshedTokens).toHaveProperty('access_token');
        expect(refreshedTokens).toHaveProperty('refresh_token');
        expect(refreshedTokens.expires_in).toBeGreaterThan(0);
      });
    });

    describe('API Key Authentication', () => {
      test('should validate API key format', () => {
        const validKey = 'hb_live_1234567890abcdef';
        const invalidKey = 'invalid-key';
        
        expect(crmService.validateAPIKey('honeybook', validKey)).toBe(true);
        expect(crmService.validateAPIKey('honeybook', invalidKey)).toBe(false);
      });

      test('should store API credentials securely', async () => {
        const apiKey = 'lb_test_abcd1234';
        const provider = 'lightblue';
        
        await crmService.storeAPICredentials(provider, { api_key: apiKey });
        
        // Verify credentials are encrypted in storage
        const stored = await crmService.getStoredCredentials(provider);
        expect(stored).toBeDefined();
        expect(stored.encrypted).toBe(true);
      });

      test('should test API key connection', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'connected', user: 'test@example.com' })
        });
        
        const result = await crmService.testConnection('lightblue', { api_key: 'test-key' });
        
        expect(result.success).toBe(true);
        expect(result.status).toBe('connected');
      });
    });

    describe('Authentication Error Handling', () => {
      test('should handle expired tokens gracefully', async () => {
        global.CRMProviderMockFactory.mockAuthenticationError();
        
        const result = await crmService.makeAuthenticatedRequest('tave', '/clients');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('AUTHENTICATION_ERROR');
        expect(result.requiresReauth).toBe(true);
      });

      test('should handle invalid API keys', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid API key' })
        });
        
        const result = await crmService.testConnection('honeybook', { api_key: 'invalid' });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid API key');
      });
    });
  });

  describe('Data Synchronization', () => {
    describe('Client Data Import', () => {
      test('should import clients with correct field mapping', async () => {
        const mockClients = TaveDataFactory.createTaveResponse().data.clients;
        global.CRMProviderMockFactory.mockTaveAPI();
        
        const result = await crmService.importClients('tave');
        
        expect(result.success).toBe(true);
        expect(result.imported).toBeGreaterThan(0);
        expect(result.clients).toHaveLength(mockClients.length);
        
        // Verify wedding industry field mapping
        result.clients.forEach(client => {
          expect(client).toHaveWeddingIndustryFields();
          expect(client.wedding_date).toBeValidWeddingDate();
          expect(client.email).toBeValidEmail();
          if (client.phone) {
            expect(client.phone).toBeValidPhoneNumber();
          }
        });
      });

      test('should handle large dataset import within performance limits', async () => {
        const largeDataset = WeddingIndustryDataFactory.createBulkClientData(1000);
        
        global.fetch.mockImplementation(() => Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { clients: largeDataset, pagination: { total_count: 1000 } }
          })
        }));
        
        const startTime = Date.now();
        const result = await crmService.importClients('tave');
        const duration = Date.now() - startTime;
        
        expect(result.success).toBe(true);
        expect(result.imported).toBe(1000);
        expect(duration).toBeLessThan(30000); // Must complete within 30 seconds
      });

      test('should detect and handle duplicate clients', async () => {
        const clientsWithDuplicates = WeddingIndustryDataFactory.createBulkClientData(100, {
          duplicateProbability: 0.2
        });
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { clients: clientsWithDuplicates }
          })
        });
        
        const result = await crmService.importClients('tave', { handleDuplicates: true });
        
        expect(result.success).toBe(true);
        expect(result.duplicatesFound).toBeGreaterThan(0);
        expect(result.duplicatesSkipped).toBe(result.duplicatesFound);
      });

      test('should handle partial data imports gracefully', async () => {
        const incompleteClients = Array.from({ length: 50 }, () => 
          WeddingIndustryDataFactory.createIncompleteClient()
        );
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { clients: incompleteClients }
          })
        });
        
        const result = await crmService.importClients('tave');
        
        expect(result.success).toBe(true);
        expect(result.warnings).toBeGreaterThan(0);
        expect(result.partialImports).toBeDefined();
      });
    });

    describe('Incremental Sync', () => {
      test('should perform incremental sync for updated clients', async () => {
        const lastSync = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        const updatedClients = WeddingIndustryDataFactory.createBulkClientData(10);
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { 
              clients: updatedClients,
              last_modified: new Date().toISOString()
            }
          })
        });
        
        const result = await crmService.performIncrementalSync('tave', lastSync);
        
        expect(result.success).toBe(true);
        expect(result.syncType).toBe('incremental');
        expect(result.updated).toBe(10);
      });

      test('should calculate sync delta correctly', async () => {
        const existingClients = WeddingIndustryDataFactory.createBulkClientData(50);
        const serverClients = [
          ...existingClients.slice(0, 45), // 45 unchanged
          ...WeddingIndustryDataFactory.createBulkClientData(5), // 5 new
          // 5 clients deleted (missing from server response)
        ];
        
        const delta = await crmService.calculateSyncDelta(existingClients, serverClients);
        
        expect(delta.added).toBe(5);
        expect(delta.updated).toBe(0);
        expect(delta.deleted).toBe(5);
        expect(delta.unchanged).toBe(45);
      });
    });

    describe('Field Mapping', () => {
      test('should map Tave fields correctly', () => {
        const taveClient = TaveDataFactory.createTaveClient();
        const mappedClient = crmService.mapProviderFields('tave', taveClient);
        
        expect(mappedClient.first_name).toBe(taveClient.firstName);
        expect(mappedClient.last_name).toBe(taveClient.lastName);
        expect(mappedClient.wedding_date).toBe(taveClient.shoot_date);
        expect(mappedClient.crm_id).toBe(taveClient.tave_id.toString());
      });

      test('should handle special characters in names', () => {
        const clientWithSpecialChars = {
          firstName: "O'Connor",
          lastName: "D'Angelo",
          email: "test@example.com"
        };
        
        const mapped = crmService.mapProviderFields('tave', clientWithSpecialChars);
        
        expect(mapped.first_name).toBe("O'Connor");
        expect(mapped.last_name).toBe("D'Angelo");
        expect(mapped.display_name).toBe("O'Connor D'Angelo");
      });

      test('should validate wedding dates across providers', () => {
        const dateFormats = [
          '2024-06-15',           // ISO format
          '06/15/2024',          // US format
          '15/06/2024',          // UK format
          '2024-06-15T14:30:00Z' // ISO with time
        ];
        
        dateFormats.forEach(dateStr => {
          const normalized = crmService.normalizeWeddingDate(dateStr);
          expect(normalized).toBeValidWeddingDate();
          expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      });
    });

    describe('Error Recovery', () => {
      test('should handle network failures during sync', async () => {
        global.CRMProviderMockFactory.mockNetworkError();
        
        const result = await crmService.importClients('tave');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('NETWORK_ERROR');
        expect(result.retryable).toBe(true);
      });

      test('should respect rate limits and retry appropriately', async () => {
        global.CRMProviderMockFactory.mockRateLimitError();
        
        const result = await crmService.importClients('honeybook');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('RATE_LIMITED');
        expect(result.retryAfter).toBe(60);
      });

      test('should recover from partial sync failures', async () => {
        let callCount = 0;
        global.fetch.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call fails after processing 50 clients
            return Promise.reject(new Error('Connection timeout'));
          }
          // Second call succeeds with remaining clients
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              success: true,
              data: { clients: WeddingIndustryDataFactory.createBulkClientData(50) }
            })
          });
        });
        
        const result = await crmService.importClientsWithRecovery('tave');
        
        expect(result.success).toBe(true);
        expect(result.recoveredFromFailure).toBe(true);
        expect(result.imported).toBe(50);
      });
    });
  });

  describe('Security Validation', () => {
    test('should prevent SQL injection in client data', async () => {
      const maliciousClient = {
        firstName: "'; DROP TABLE clients; --",
        lastName: "Johnson",
        email: "test@example.com"
      };
      
      const sanitized = await crmService.sanitizeClientData(maliciousClient);
      
      expect(sanitized.firstName).not.toContain('DROP TABLE');
      expect(sanitized.firstName).not.toContain('--');
    });

    test('should encrypt sensitive data before storage', async () => {
      const sensitiveData = {
        api_key: 'sensitive-api-key-123',
        access_token: 'oauth-token-456'
      };
      
      const encrypted = await crmService.encryptCredentials(sensitiveData);
      
      expect(encrypted.api_key).not.toBe(sensitiveData.api_key);
      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    test('should not expose sensitive data in error messages', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API call failed with key: secret-key-123'));
      
      const result = await crmService.importClients('tave');
      
      expect(result.error).toBeDefined();
      expect(result.message).not.toContain('secret-key-123');
      expect(result.message).toContain('[REDACTED]');
    });

    test('should validate CSRF tokens on state changes', async () => {
      const invalidCSRFRequest = {
        action: 'delete_integration',
        provider: 'tave',
        csrf_token: 'invalid-token'
      };
      
      await expect(crmService.processSecureAction(invalidCSRFRequest))
        .rejects.toThrow('Invalid CSRF token');
    });
  });

  describe('Performance Validation', () => {
    test('should handle concurrent sync operations', async () => {
      const providers = ['tave', 'honeybook', 'lightblue'];
      
      // Mock successful responses for all providers
      global.fetch.mockImplementation((url) => {
        const mockData = WeddingIndustryDataFactory.createBulkClientData(100);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { clients: mockData }
          })
        });
      });
      
      const syncPromises = providers.map(provider => 
        crmService.importClients(provider)
      );
      
      const results = await Promise.all(syncPromises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.imported).toBe(100);
      });
    });

    test('should optimize memory usage during large imports', async () => {
      const largeDataset = WeddingIndustryDataFactory.createBulkClientData(5000);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { clients: largeDataset }
        })
      });
      
      const memBefore = process.memoryUsage().heapUsed;
      const result = await crmService.importClients('tave', { streamingMode: true });
      const memAfter = process.memoryUsage().heapUsed;
      
      const memoryIncrease = memAfter - memBefore;
      const memoryPerClient = memoryIncrease / result.imported;
      
      expect(result.success).toBe(true);
      expect(memoryPerClient).toBeLessThan(1024); // Less than 1KB per client
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    test('should handle wedding industry terminology correctly', () => {
      const weddingTerms = {
        'ceremony_time': '2:00 PM',
        'reception_time': '6:00 PM',
        'guest_count': 150,
        'venue_type': 'outdoor',
        'photography_style': 'documentary'
      };
      
      const normalized = crmService.normalizeWeddingTerminology(weddingTerms);
      
      expect(normalized.ceremony_time).toMatch(/^\d{2}:\d{2}$/);
      expect(normalized.reception_time).toMatch(/^\d{2}:\d{2}$/);
      expect(normalized.guest_count).toBeGreaterThan(0);
    });

    test('should validate wedding date constraints', () => {
      const pastDate = '2020-01-01';
      const futureDate = '2025-12-31';
      const invalidDate = '2024-02-30';
      
      expect(crmService.isValidWeddingDate(pastDate)).toBe(false);
      expect(crmService.isValidWeddingDate(futureDate)).toBe(true);
      expect(crmService.isValidWeddingDate(invalidDate)).toBe(false);
    });

    test('should handle seasonal wedding patterns', () => {
      const clients = WeddingIndustryDataFactory.createBulkClientData(200);
      const seasonal = crmService.analyzeSeasonalPatterns(clients);
      
      expect(seasonal).toHaveProperty('peakSeason');
      expect(seasonal).toHaveProperty('offSeason');
      expect(seasonal.peakSeason).toContain('May');
      expect(seasonal.peakSeason).toContain('September');
    });
  });
});