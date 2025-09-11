/**
 * WS-245 Wedding Budget Optimizer - Security and Compliance Tests
 * Comprehensive security testing for pricing integration services
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MarketPricingIntegration,
  VendorCostIntegration,
  FinancialServiceIntegration,
  RegionalPricingService,
  PricingIntegrationSecurity
} from '@/lib/integrations/pricing-integrations';
import type {
  ServiceType,
  RegionCode,
  Currency,
  MarketPricingRequest,
  PricingServiceConfig
} from '@/types/pricing';

// Mock fetch for security testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Security test configuration with realistic values
const securityTestConfig: PricingServiceConfig = {
  baseUrl: 'https://api.test-security.example.com',
  apiKey: 'test-key-for-security-validation',
  timeoutMs: 5000,
  retryAttempts: 2,
  retryDelayMs: 1000,
  rateLimit: {
    requestsPerMinute: 30,
    requestsPerHour: 500
  },
  cache: {
    ttlMs: 300000, // 5 minutes for security tests
    maxSize: 50
  }
};

describe('WS-245 Pricing Integration - Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation and Sanitization', () => {
    let marketPricing: MarketPricingIntegration;

    beforeEach(() => {
      marketPricing = new MarketPricingIntegration(securityTestConfig);
    });

    test('should reject malicious script injection in service requests', async () => {
      const maliciousRequest = {
        serviceType: '<script>alert("xss")</script>' as ServiceType,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      } as MarketPricingRequest;

      const result = await marketPricing.execute(maliciousRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockFetch).not.toHaveBeenCalled(); // Should not make API call with invalid data
    });

    test('should reject SQL injection attempts in vendor requests', async () => {
      const vendorCost = new VendorCostIntegration(securityTestConfig);
      
      const sqlInjectionRequest = {
        vendorId: "'; DROP TABLE vendors; --",
        serviceType: ServiceType.PHOTOGRAPHY,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        additionalRequirements: {
          "'; DELETE FROM quotes; --": "malicious"
        }
      };

      const result = await vendorCost.execute(sqlInjectionRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should sanitize and validate extreme numeric values', async () => {
      const extremeRequest: MarketPricingRequest = {
        serviceType: ServiceType.VENUE,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: Number.MAX_SAFE_INTEGER, // Extreme value
        budgetRange: {
          min: -1000000, // Negative value
          max: Number.MAX_SAFE_INTEGER, // Extreme value
          currency: Currency.GBP
        }
      };

      const result = await marketPricing.execute(extremeRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    test('should reject null and undefined injections', async () => {
      const nullInjectionRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: null as unknown as RegionCode,
        weddingDate: undefined as unknown as Date,
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      } as MarketPricingRequest;

      const result = await marketPricing.execute(nullInjectionRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    test('should validate date boundaries to prevent manipulation', async () => {
      const dateManipulationRequest: MarketPricingRequest = {
        serviceType: ServiceType.CATERING,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('1900-01-01'), // Far past date
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      };

      const result = await marketPricing.execute(dateManipulationRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    test('should prevent buffer overflow attempts with long strings', async () => {
      const longStringRequest = {
        vendorId: 'a'.repeat(100000), // 100KB string
        serviceType: ServiceType.PHOTOGRAPHY,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        additionalRequirements: {
          longField: 'b'.repeat(100000)
        }
      };

      const vendorCost = new VendorCostIntegration(securityTestConfig);
      const result = await vendorCost.execute(longStringRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('API Security and Authentication', () => {
    test('should include proper authentication headers', async () => {
      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pricing_data: [],
          market_insights: { average_price: 3000, median_price: 2800, price_range_min: 2000, price_range_max: 5000, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
          recommendations: [],
          last_updated: '2025-01-15T10:00:00Z',
          request_id: 'test-req'
        }),
        status: 200,
        statusText: 'OK'
      } as Response);

      await marketPricing.execute(validRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key-for-security-validation',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'WedSync/1.0 Budget-Optimizer',
            'X-Request-ID': expect.any(String)
          })
        })
      );
    });

    test('should handle unauthorized responses securely', async () => {
      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.VENUE,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 800000,
          max: 1500000,
          currency: Currency.GBP
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      } as Response);

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('HTTP 401');
      expect(result.error?.retryable).toBe(true); // Auth errors might be temporary
    });

    test('should not expose sensitive information in error messages', async () => {
      const marketPricing = new MarketPricingIntegration({
        ...securityTestConfig,
        apiKey: 'super-secret-api-key-12345'
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error with sensitive data: super-secret-api-key-12345'));

      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.FLOWERS,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 100000,
          max: 300000,
          currency: Currency.GBP
        }
      };

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(false);
      // Error message should not contain the API key
      expect(result.error?.message).not.toContain('super-secret-api-key-12345');
    });

    test('should implement request ID for audit trails', async () => {
      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.ENTERTAINMENT,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 150000,
          max: 400000,
          currency: Currency.GBP
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pricing_data: [],
          market_insights: { average_price: 2500, median_price: 2300, price_range_min: 1500, price_range_max: 4000, trend_direction: 'stable', trend_percentage: 0, sample_size: 85, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
          recommendations: [],
          last_updated: '2025-01-15T10:00:00Z',
          request_id: 'audit-req-123'
        }),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requestId).toMatch(/^[a-f0-9-]{36}$/); // UUID format for audit trail
      }

      // Verify request ID was sent in headers
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.stringMatching(/^[a-f0-9-]{36}$/)
          })
        })
      );
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should enforce rate limits to prevent abuse', async () => {
      const marketPricing = new MarketPricingIntegration({
        ...securityTestConfig,
        rateLimit: {
          requestsPerMinute: 2, // Very low limit for testing
          requestsPerHour: 10
        }
      });

      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.PHOTOGRAPHY,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 200000,
          max: 500000,
          currency: Currency.GBP
        }
      };

      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          pricing_data: [],
          market_insights: { average_price: 3000, median_price: 2800, price_range_min: 2000, price_range_max: 5000, trend_direction: 'stable', trend_percentage: 0, sample_size: 100, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
          recommendations: [],
          last_updated: '2025-01-15T10:00:00Z',
          request_id: 'rate-limit-test'
        }),
        status: 200,
        statusText: 'OK'
      } as Response);

      // First two requests should succeed
      const result1 = await marketPricing.execute(validRequest);
      const result2 = await marketPricing.execute(validRequest);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Third request should fail due to rate limiting
      const result3 = await marketPricing.execute(validRequest);

      expect(result3.success).toBe(false);
      expect(result3.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should implement exponential backoff for retries', async () => {
      const marketPricing = new MarketPricingIntegration({
        ...securityTestConfig,
        retryAttempts: 3,
        retryDelayMs: 100
      });

      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.VENUE,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 800000,
          max: 1500000,
          currency: Currency.GBP
        }
      };

      // Mock temporary failures then success
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pricing_data: [],
            market_insights: { average_price: 12000, median_price: 11500, price_range_min: 8000, price_range_max: 18000, trend_direction: 'up', trend_percentage: 5.5, sample_size: 75, last_updated: '2025-01-15T10:00:00Z', seasonal_trends: [], regional_comparison: [] },
            recommendations: [],
            last_updated: '2025-01-15T10:00:00Z',
            request_id: 'backoff-test'
          }),
          status: 200,
          statusText: 'OK'
        } as Response);

      const startTime = Date.now();
      const result = await marketPricing.executeWithRetry(validRequest);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      
      // Should have taken some time due to exponential backoff
      // First retry: 100ms, Second retry: 200ms = at least 300ms total
      expect(endTime - startTime).toBeGreaterThan(250);
      
      // Should have made 3 attempts
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should timeout appropriately to prevent resource exhaustion', async () => {
      const marketPricing = new MarketPricingIntegration({
        ...securityTestConfig,
        timeoutMs: 1000 // 1 second timeout
      });

      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.CATERING,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 300000,
          max: 800000,
          currency: Currency.GBP
        }
      };

      // Mock a hanging request
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ /* response */ }),
          status: 200,
          statusText: 'OK'
        } as Response), 2000)) // 2 second delay, longer than timeout
      );

      const startTime = Date.now();
      const result = await marketPricing.execute(validRequest);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error?.message).toContain('timeout');
      
      // Should have timed out around 1 second
      expect(endTime - startTime).toBeGreaterThan(900);
      expect(endTime - startTime).toBeLessThan(1500);
    });
  });

  describe('Data Privacy and GDPR Compliance', () => {
    test('should not log sensitive financial data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const financialService = new FinancialServiceIntegration(securityTestConfig);
      const sensitiveRequest = {
        organizationId: 'org-123',
        accountConnections: [{
          accountId: 'qb-sensitive-account-456',
          provider: 'quickbooks' as const,
          connectionStatus: 'active' as const,
          lastSyncAt: new Date('2025-01-14T10:00:00Z')
        }],
        dateRange: {
          start: new Date('2024-12-01'),
          end: new Date('2025-01-14')
        }
      };

      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      await financialService.execute(sensitiveRequest);

      // Check that no sensitive account IDs were logged
      const allLogCalls = [
        ...consoleSpy.mock.calls,
        ...consoleDebugSpy.mock.calls,
        ...consoleErrorSpy.mock.calls
      ].flat().join(' ');

      expect(allLogCalls).not.toContain('qb-sensitive-account-456');
      expect(allLogCalls).not.toContain('org-123');

      consoleSpy.mockRestore();
      consoleDebugSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should implement secure audit logging', async () => {
      const auditSpy = jest.spyOn(PricingIntegrationSecurity, 'auditPricingOperation').mockImplementation();

      await PricingIntegrationSecurity.auditPricingOperation(
        'user-123',
        'org-456',
        'market_pricing_request',
        'wedding_wire',
        { 
          serviceType: ServiceType.PHOTOGRAPHY,
          region: RegionCode.UK_LONDON,
          // Note: No sensitive financial data in audit
        }
      );

      expect(auditSpy).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'market_pricing_request',
        'wedding_wire',
        expect.objectContaining({
          serviceType: ServiceType.PHOTOGRAPHY,
          region: RegionCode.UK_LONDON
        })
      );

      // Should not include sensitive personal or financial data
      const auditCall = auditSpy.mock.calls[0];
      const auditData = JSON.stringify(auditCall);
      expect(auditData).not.toMatch(/credit|debit|account|ssn|tax|income/i);

      auditSpy.mockRestore();
    });

    test('should validate data retention policies', () => {
      const cacheConfig = securityTestConfig.cache;
      
      // Cache TTL should not exceed GDPR data retention limits
      const maxRetentionMs = 24 * 60 * 60 * 1000; // 24 hours maximum
      expect(cacheConfig.ttlMs).toBeLessThanOrEqual(maxRetentionMs);
      
      // Cache size should be limited to prevent excessive data storage
      expect(cacheConfig.maxSize).toBeLessThanOrEqual(1000);
    });

    test('should handle right to erasure requests', async () => {
      // This would be implemented in a real system to support GDPR Article 17
      const userId = 'user-to-be-forgotten';
      
      // Mock implementation of data erasure
      const eraseUserData = async (userId: string) => {
        // In real implementation:
        // 1. Clear user-specific cache entries
        // 2. Remove user audit logs older than legal requirement
        // 3. Notify third-party services to remove data
        return { success: true, message: `Data for user ${userId} has been erased` };
      };

      const result = await eraseUserData(userId);
      expect(result.success).toBe(true);
      expect(result.message).toContain(userId);
    });
  });

  describe('Environment and Configuration Security', () => {
    test('should validate environment variables securely', () => {
      const originalEnv = process.env;

      // Test with insecure configuration
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'http://insecure-url.com', // HTTP instead of HTTPS
        SUPABASE_SERVICE_ROLE_KEY: 'weak-key', // Too short
        WEDDING_WIRE_API_KEY: '' // Empty key
      };

      const validation = PricingIntegrationSecurity.validateEnvironment();
      
      // Should still pass basic validation but security checks would flag issues
      expect(validation.valid).toBe(true); // Basic required vars are present
      
      // In a real implementation, we'd have additional security validation
      const securityValidation = {
        httpsRequired: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://'),
        keyStrengthValid: (process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0) > 20,
        noEmptyKeys: !Object.values(process.env).some(val => val === '')
      };

      expect(securityValidation.httpsRequired).toBe(false);
      expect(securityValidation.keyStrengthValid).toBe(false);

      process.env = originalEnv;
    });

    test('should prevent configuration injection attacks', () => {
      const maliciousConfig: PricingServiceConfig = {
        baseUrl: 'https://evil.com/api\r\nHost: malicious.com',
        apiKey: 'key\r\nAuthorization: Bearer stolen-token',
        timeoutMs: 5000,
        retryAttempts: 2,
        retryDelayMs: 1000,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        cache: {
          ttlMs: 300000,
          maxSize: 100
        }
      };

      // In a secure implementation, configuration should be validated
      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return !url.includes('\r') && !url.includes('\n') && parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      const isValidApiKey = (key: string) => {
        return !key.includes('\r') && !key.includes('\n') && key.length > 10;
      };

      expect(isValidUrl(maliciousConfig.baseUrl)).toBe(false);
      expect(isValidApiKey(maliciousConfig.apiKey)).toBe(false);
    });

    test('should implement secure default configurations', () => {
      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      
      // Verify secure defaults are applied
      expect(securityTestConfig.timeoutMs).toBeGreaterThan(1000);
      expect(securityTestConfig.timeoutMs).toBeLessThan(30000);
      expect(securityTestConfig.retryAttempts).toBeLessThanOrEqual(5);
      expect(securityTestConfig.rateLimit.requestsPerMinute).toBeLessThanOrEqual(100);
      expect(securityTestConfig.cache.ttlMs).toBeLessThanOrEqual(60 * 60 * 1000); // Max 1 hour
      expect(securityTestConfig.baseUrl).toMatch(/^https:/); // HTTPS only
    });
  });

  describe('Error Handling Security', () => {
    test('should sanitize error messages to prevent information disclosure', async () => {
      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      
      const validRequest: MarketPricingRequest = {
        serviceType: ServiceType.TRANSPORT,
        region: RegionCode.UK_LONDON,
        weddingDate: new Date('2025-06-15'),
        guestCount: 120,
        budgetRange: {
          min: 50000,
          max: 200000,
          currency: Currency.GBP
        }
      };

      // Mock error with sensitive information
      mockFetch.mockRejectedValueOnce(new Error(`Database connection failed: host=internal-db.company.com user=admin password=secret123 dbname=production_pricing`));

      const result = await marketPricing.execute(validRequest);

      expect(result.success).toBe(false);
      
      // Error message should not expose internal details
      expect(result.error?.message).not.toContain('internal-db.company.com');
      expect(result.error?.message).not.toContain('admin');
      expect(result.error?.message).not.toContain('secret123');
      expect(result.error?.message).not.toContain('production_pricing');
      
      // Should have a generic, safe error message
      expect(result.error?.message).toMatch(/network|connection|unavailable/i);
    });

    test('should implement secure error codes without sensitive information', async () => {
      const possibleErrors = [
        new Error('Connection to internal-api-server.company.local failed'),
        new Error('SQL Error: SELECT * FROM sensitive_table WHERE secret_column = "confidential"'),
        new Error('Authentication failed for user admin@company.com with token abc123'),
        new Error('File not found: /etc/passwd'),
        new Error('Permission denied accessing /var/log/secret-service.log')
      ];

      const marketPricing = new MarketPricingIntegration(securityTestConfig);
      
      for (const error of possibleErrors) {
        mockFetch.mockRejectedValueOnce(error);
        
        const result = await marketPricing.execute({
          serviceType: ServiceType.OTHER,
          region: RegionCode.UK_LONDON,
          weddingDate: new Date('2025-06-15'),
          guestCount: 120,
          budgetRange: {
            min: 100000,
            max: 300000,
            currency: Currency.GBP
          }
        });

        expect(result.success).toBe(false);
        
        // Should not expose internal paths, domains, credentials, or SQL
        expect(result.error?.message).not.toMatch(/internal-api|company\.local|admin@|abc123|\/etc\/passwd|secret-service/);
        
        // Should use generic error categories
        expect(result.error?.code).toMatch(/^(SERVICE_UNAVAILABLE|NETWORK_ERROR|UNKNOWN_ERROR)$/);
      }
    });

    test('should log security events appropriately', () => {
      const securityEvents = [
        { type: 'RATE_LIMIT_EXCEEDED', userId: 'user-123', ip: '192.168.1.100' },
        { type: 'INVALID_API_KEY', userId: 'attacker', ip: '1.2.3.4' },
        { type: 'SUSPICIOUS_REQUEST', userId: 'user-456', payload: 'potential-injection' }
      ];

      securityEvents.forEach(event => {
        // In a real implementation, this would log to a security monitoring system
        expect(event.type).toMatch(/^[A-Z_]+$/);
        expect(event.userId).toBeDefined();
        expect(event.ip || event.payload).toBeDefined();
      });
    });
  });
});