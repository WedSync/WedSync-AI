/**
 * WS-240: AI Cost Optimization Security Tests
 * Comprehensive security test suite for all 6 security requirements
 * Validates encryption, validation, cache security, algorithm integrity,
 * real-time monitoring security, and audit logging
 */

import { AICostSecurityService, DEFAULT_AI_COST_SECURITY } from '@/lib/security/ai-cost-optimization-security';
import { NextRequest } from 'next/server';
import { jest } from '@jest/globals';
import { createHash } from 'crypto';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/middleware/audit');

describe('AICostSecurityService', () => {
  let securityService: AICostSecurityService;
  let mockSupabaseClient: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'test-supplier', status: 'active', subscription_tier: 'professional' },
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null })
    };

    mockAuditLogger = {
      log: jest.fn().mockResolvedValue(undefined),
      logSecurityEvent: jest.fn().mockResolvedValue(undefined)
    };

    securityService = new AICostSecurityService(DEFAULT_AI_COST_SECURITY);
  });

  describe('SECURITY REQUIREMENT 1: Budget Data Encryption', () => {
    test('should encrypt budget data with AES-256-GCM', async () => {
      const sensitiveData = {
        supplierId: 'test-supplier-123',
        currentSpend: 45.67,
        budgetLimit: 50.00,
        dailyTransactions: ['tx1', 'tx2', 'tx3'],
        alertThresholds: { warning: 80, critical: 95 }
      };

      const encrypted = await securityService.encryptBudgetData(sensitiveData);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.encrypted).toMatch(/^[a-f0-9]+$/); // Hex string
      expect(encrypted.iv).toHaveLength(24); // 12 bytes hex = 24 chars
      expect(encrypted.tag).toHaveLength(32); // 16 bytes hex = 32 chars
    });

    test('should decrypt budget data correctly', async () => {
      const originalData = {
        supplierId: 'test-supplier-123',
        currentSpend: 45.67,
        budgetLimit: 50.00,
        utilizationPercent: 91.34
      };

      const encrypted = await securityService.encryptBudgetData(originalData);
      const decrypted = await securityService.decryptBudgetData(
        encrypted.encrypted, 
        encrypted.iv, 
        encrypted.tag
      );

      expect(decrypted).toEqual(originalData);
      expect(decrypted.supplierId).toBe('test-supplier-123');
      expect(decrypted.currentSpend).toBe(45.67);
      expect(decrypted.budgetLimit).toBe(50.00);
      expect(decrypted.utilizationPercent).toBe(91.34);
    });

    test('should detect tampering attempts', async () => {
      const originalData = { supplierId: 'test', budget: 100 };
      const encrypted = await securityService.encryptBudgetData(originalData);

      // Tamper with encrypted data
      const tamperedData = encrypted.encrypted.replace(/^./, '0');

      await expect(
        securityService.decryptBudgetData(tamperedData, encrypted.iv, encrypted.tag)
      ).rejects.toThrow('Failed to decrypt budget data - possible tampering detected');
    });

    test('should handle encryption errors gracefully', async () => {
      const circularData: any = { supplierId: 'test' };
      circularData.circular = circularData; // Create circular reference

      await expect(
        securityService.encryptBudgetData(circularData)
      ).rejects.toThrow('Failed to encrypt budget data');
    });
  });

  describe('SECURITY REQUIREMENT 2: Cost Tracking Validation', () => {
    test('should validate correct GPT-4 cost calculations', async () => {
      const inputTokens = 1000;
      const outputTokens = 1500;
      const modelUsed = 'gpt-4-turbo';
      
      // Correct calculation: (1000/1000 * 0.01) + (1500/1000 * 0.03) = 0.01 + 0.045 = 0.055
      const calculatedCost = 0.055;

      const isValid = await securityService.validateCostCalculation(
        inputTokens, 
        outputTokens, 
        modelUsed, 
        calculatedCost
      );

      expect(isValid).toBe(true);
    });

    test('should validate correct GPT-3.5 cost calculations', async () => {
      const inputTokens = 2000;
      const outputTokens = 1000;
      const modelUsed = 'gpt-3.5-turbo';
      
      // Correct calculation: (2000/1000 * 0.002) + (1000/1000 * 0.002) = 0.004 + 0.002 = 0.006
      const calculatedCost = 0.006;

      const isValid = await securityService.validateCostCalculation(
        inputTokens, 
        outputTokens, 
        modelUsed, 
        calculatedCost
      );

      expect(isValid).toBe(true);
    });

    test('should apply wedding season multiplier to cost validation', async () => {
      // Mock wedding season (June)
      jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(5); // June (0-indexed)
      
      const inputTokens = 1000;
      const outputTokens = 1000;
      const modelUsed = 'gpt-4-turbo';
      
      // Base cost: 0.01 + 0.03 = 0.04, with 1.6x multiplier = 0.064
      const calculatedCostWithSeason = 0.064;

      const isValid = await securityService.validateCostCalculation(
        inputTokens, 
        outputTokens, 
        modelUsed, 
        calculatedCostWithSeason
      );

      expect(isValid).toBe(true);
      
      // Restore original Date
      jest.restoreAllMocks();
    });

    test('should reject manipulated cost calculations', async () => {
      const inputTokens = 1000;
      const outputTokens = 1000;
      const modelUsed = 'gpt-4-turbo';
      
      // Incorrect calculation (too low)
      const manipulatedCost = 0.001; // Way too low

      const isValid = await securityService.validateCostCalculation(
        inputTokens, 
        outputTokens, 
        modelUsed, 
        manipulatedCost
      );

      expect(isValid).toBe(false);
    });

    test('should handle unknown models gracefully', async () => {
      const isValid = await securityService.validateCostCalculation(
        1000, 1000, 'unknown-model', 0.05
      );

      expect(isValid).toBe(false);
    });
  });

  describe('SECURITY REQUIREMENT 3: Cache Security', () => {
    test('should sign cache entries with HMAC', async () => {
      const cacheKey = 'wedding-venue-description-123';
      const cacheData = {
        response: 'Beautiful rustic venue perfect for outdoor ceremonies',
        model: 'gpt-3.5-turbo',
        cost: 0.025
      };

      const signature = await securityService.signCacheEntry(cacheKey, cacheData);

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // 64-char hex string (SHA-256)
    });

    test('should verify valid cache signatures', async () => {
      const cacheKey = 'venue-desc-456';
      const cacheData = { response: 'Elegant garden venue', cost: 0.03 };

      const signature = await securityService.signCacheEntry(cacheKey, cacheData);
      const isValid = await securityService.verifyCacheSignature(cacheKey, cacheData, signature);

      expect(isValid).toBe(true);
    });

    test('should detect cache tampering attempts', async () => {
      const cacheKey = 'venue-desc-789';
      const originalData = { response: 'Original venue description', cost: 0.025 };
      const tamperedData = { response: 'Tampered venue description', cost: 0.001 }; // Changed data

      const signature = await securityService.signCacheEntry(cacheKey, originalData);
      const isValid = await securityService.verifyCacheSignature(cacheKey, tamperedData, signature);

      expect(isValid).toBe(false);
    });

    test('should handle cache signature verification errors gracefully', async () => {
      const isValid = await securityService.verifyCacheSignature(
        'test-key', 
        { data: 'test' }, 
        'invalid-signature'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('SECURITY REQUIREMENT 4: Algorithm Integrity', () => {
    test('should protect algorithm parameters with obfuscation', async () => {
      const algorithmConfig = {
        cacheThreshold: 0.85,
        modelSelectionRules: {
          creative: 'gpt-4-turbo',
          routine: 'gpt-3.5-turbo'
        },
        costThresholds: { warning: 0.8, critical: 0.95 },
        optimizationWeights: { cost: 0.6, quality: 0.4 }
      };

      const protected = await securityService.protectAlgorithmParameters(algorithmConfig);

      expect(protected).toBeDefined();
      expect(protected).not.toContain('cacheThreshold'); // Should be obfuscated
      expect(protected).not.toContain('modelSelectionRules');
      expect(typeof protected).toBe('string');
      expect(protected.length).toBeGreaterThan(100); // Should be significantly longer
    });

    test('should validate algorithm integrity on deobfuscation', async () => {
      const originalConfig = {
        cacheStrategy: 'semantic',
        modelThresholds: { simple: 0.3, complex: 0.7 },
        seasonalMultipliers: { peak: 1.6, offPeak: 1.0 }
      };

      const protected = await securityService.protectAlgorithmParameters(originalConfig);
      const restored = await securityService.validateAlgorithmIntegrity(protected);

      expect(restored).toEqual(originalConfig);
      expect(restored.cacheStrategy).toBe('semantic');
      expect(restored.modelThresholds.simple).toBe(0.3);
      expect(restored.seasonalMultipliers.peak).toBe(1.6);
    });

    test('should detect algorithm tampering', async () => {
      const config = { threshold: 0.8, model: 'gpt-4' };
      const protected = await securityService.protectAlgorithmParameters(config);
      
      // Tamper with protected data
      const tampered = protected.substring(0, protected.length - 10) + 'xxxxxxxxxx';

      await expect(
        securityService.validateAlgorithmIntegrity(tampered)
      ).rejects.toThrow('Algorithm configuration is corrupted or tampered');
    });

    test('should handle invalid algorithm format', async () => {
      const invalidProtected = 'not-a-valid-protected-algorithm';

      await expect(
        securityService.validateAlgorithmIntegrity(invalidProtected)
      ).rejects.toThrow('Algorithm configuration is corrupted or tampered');
    });
  });

  describe('SECURITY REQUIREMENT 5: Real-time Monitoring Security', () => {
    test('should validate legitimate monitoring requests', async () => {
      const request = new NextRequest('http://localhost/api/budget/status', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 Wedding Supplier Dashboard'
        }
      });

      const result = await securityService.secureRealtimeMonitoring(
        'test-supplier-123',
        45.50, // Current spend
        50.00, // Budget limit
        request
      );

      expect(result.isSecure).toBe(true);
      expect(result.allowOperation).toBe(true);
    });

    test('should reject monitoring requests for inactive suppliers', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-supplier', status: 'inactive' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/budget/status');

      const result = await securityService.secureRealtimeMonitoring(
        'inactive-supplier',
        10.00,
        50.00,
        request
      );

      expect(result.isSecure).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.reason).toBe('Unauthorized access');
    });

    test('should detect suspicious monitoring patterns', async () => {
      // Mock high request count
      jest.spyOn(securityService as any, 'getRecentMonitoringRequests').mockResolvedValue(15);

      const request = new NextRequest('http://localhost/api/budget/status');

      const result = await securityService.secureRealtimeMonitoring(
        'test-supplier-123',
        30.00,
        50.00,
        request
      );

      expect(result.isSecure).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded');
    });

    test('should validate spend data integrity', async () => {
      const request = new NextRequest('http://localhost/api/budget/status');

      // Test invalid spend data (negative spend)
      const result = await securityService.secureRealtimeMonitoring(
        'test-supplier-123',
        -10.00, // Invalid negative spend
        50.00,
        request
      );

      expect(result.isSecure).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.reason).toBe('Invalid spend data');
    });

    test('should handle monitoring security check failures gracefully', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/budget/status');

      const result = await securityService.secureRealtimeMonitoring(
        'test-supplier-123',
        25.00,
        50.00,
        request
      );

      expect(result.isSecure).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.reason).toBe('Security check failed');
    });
  });

  describe('SECURITY REQUIREMENT 6: Audit Logging', () => {
    test('should log optimization events comprehensively', async () => {
      const request = new NextRequest('http://localhost/api/ai-optimization/optimize', {
        headers: {
          'x-forwarded-for': '10.0.1.50',
          'user-agent': 'WedSync Mobile App v2.1'
        }
      });

      await securityService.logOptimizationEvent(
        'request_optimized',
        'supplier-789',
        'user-456',
        {
          featureType: 'photo_ai',
          originalCost: 0.25,
          optimizedCost: 0.06,
          savingsPercent: 76,
          cacheHitRate: 0.85
        },
        request
      );

      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        event_type: 'ai_cost_request_optimized',
        resource_type: 'ai_cost_optimization',
        resource_id: 'supplier-789',
        user_id: 'user-456',
        supplier_id: 'supplier-789',
        changes: {
          optimization_data: {
            featureType: 'photo_ai',
            originalCost: 0.25,
            optimizedCost: 0.06,
            savingsPercent: 76,
            cacheHitRate: 0.85
          }
        },
        metadata: expect.objectContaining({
          security_context: {
            encryption_enabled: true,
            validation_enabled: true,
            cache_integrity: true,
            algorithm_protection: true
          },
          timestamp: expect.any(String),
          session_id: expect.any(String)
        }),
        ip_address: '10.0.1.50',
        user_agent: 'WedSync Mobile App v2.1'
      });
    });

    test('should log budget alerts with security context', async () => {
      await securityService.logOptimizationEvent(
        'budget_alert',
        'supplier-123',
        'user-789',
        {
          alertType: 'critical_threshold_exceeded',
          currentSpend: 47.50,
          budgetLimit: 50.00,
          utilizationPercent: 95,
          autoDisableTriggered: true
        }
      );

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ai_cost_budget_alert',
          resource_type: 'ai_cost_optimization',
          resource_id: 'supplier-123',
          user_id: 'user-789',
          supplier_id: 'supplier-123'
        })
      );
    });

    test('should log cache operations with security metadata', async () => {
      await securityService.logOptimizationEvent(
        'cache_hit',
        'supplier-456',
        undefined,
        {
          cacheType: 'semantic',
          similarityScore: 0.92,
          costSavings: 0.035,
          weddingContext: 'venue_description'
        }
      );

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ai_cost_cache_hit',
          changes: {
            optimization_data: {
              cacheType: 'semantic',
              similarityScore: 0.92,
              costSavings: 0.035,
              weddingContext: 'venue_description'
            }
          }
        })
      );
    });

    test('should handle audit logging failures gracefully', async () => {
      mockAuditLogger.log.mockRejectedValue(new Error('Audit system unavailable'));

      // Should not throw, but log error
      await expect(
        securityService.logOptimizationEvent(
          'request_optimized',
          'supplier-123',
          'user-456',
          { test: 'data' }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Integration Security Tests', () => {
    test('should maintain security across full optimization workflow', async () => {
      const request = new NextRequest('http://localhost/api/ai-optimization/optimize', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.50',
          'user-agent': 'WedSync Pro Dashboard',
          'content-type': 'application/json'
        }
      });

      // Step 1: Budget data encryption
      const budgetData = {
        supplierId: 'integration-test-supplier',
        currentSpend: 35.75,
        budgetLimit: 50.00,
        featureType: 'venue_descriptions'
      };
      const encrypted = await securityService.encryptBudgetData(budgetData);
      expect(encrypted.encrypted).toBeDefined();

      // Step 2: Cost validation
      const isValidCost = await securityService.validateCostCalculation(
        1500, 800, 'gpt-3.5-turbo', 0.0046
      );
      expect(isValidCost).toBe(true);

      // Step 3: Cache security
      const cacheSignature = await securityService.signCacheEntry(
        'venue-elegant-garden', 
        { response: 'Stunning garden venue', cost: 0.025 }
      );
      expect(cacheSignature).toBeDefined();

      // Step 4: Algorithm protection
      const algConfig = { threshold: 0.8, model: 'gpt-3.5-turbo' };
      const protected = await securityService.protectAlgorithmParameters(algConfig);
      const restored = await securityService.validateAlgorithmIntegrity(protected);
      expect(restored).toEqual(algConfig);

      // Step 5: Real-time monitoring
      const monitoring = await securityService.secureRealtimeMonitoring(
        'integration-test-supplier', 35.75, 50.00, request
      );
      expect(monitoring.isSecure).toBe(true);

      // Step 6: Comprehensive audit logging
      await securityService.logOptimizationEvent(
        'algorithm_applied',
        'integration-test-supplier',
        'test-user',
        {
          workflowStep: 'integration_test_complete',
          securityChecks: 6,
          allSecurityPassed: true
        },
        request
      );

      expect(mockAuditLogger.log).toHaveBeenCalled();
    });

    test('should handle wedding season security multipliers', async () => {
      // Mock peak wedding season (June)
      jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(5);

      const request = new NextRequest('http://localhost/api/ai-optimization/optimize');
      
      // Wedding season should affect rate limiting and cost validation
      const budgetData = {
        supplierId: 'wedding-season-supplier',
        currentSpend: 80.00, // Higher spend during wedding season
        budgetLimit: 100.00,
        seasonalMultiplier: 1.6
      };

      const encrypted = await securityService.encryptBudgetData(budgetData);
      const decrypted = await securityService.decryptBudgetData(
        encrypted.encrypted, encrypted.iv, encrypted.tag
      );

      expect(decrypted.seasonalMultiplier).toBe(1.6);

      // Cost validation should account for wedding season
      const isValid = await securityService.validateCostCalculation(
        1000, 1000, 'gpt-4-turbo', 0.064 // With 1.6x multiplier
      );
      expect(isValid).toBe(true);

      jest.restoreAllMocks();
    });

    test('should detect and prevent coordinated attacks', async () => {
      const suspiciousRequests = Array.from({ length: 20 }, (_, i) => 
        new NextRequest(`http://localhost/api/ai-optimization/optimize?attempt=${i}`, {
          headers: { 'x-forwarded-for': '192.168.1.100' } // Same IP
        })
      );

      // Mock high request count to simulate attack
      jest.spyOn(securityService as any, 'getRecentMonitoringRequests')
        .mockResolvedValue(25);

      const results = await Promise.all(
        suspiciousRequests.slice(0, 5).map(req => 
          securityService.secureRealtimeMonitoring('attack-target-supplier', 25.00, 50.00, req)
        )
      );

      // All requests should be blocked due to suspicious activity
      results.forEach(result => {
        expect(result.isSecure).toBe(false);
        expect(result.allowOperation).toBe(false);
      });
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle high-volume encryption operations efficiently', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        supplierId: `supplier-${i}`,
        currentSpend: Math.random() * 100,
        budgetLimit: 100,
        transactions: Array.from({ length: 10 }, (_, j) => `tx-${i}-${j}`)
      }));

      const startTime = Date.now();
      const encrypted = await Promise.all(
        testData.map(data => securityService.encryptBudgetData(data))
      );
      const encryptTime = Date.now() - startTime;

      expect(encrypted).toHaveLength(100);
      expect(encryptTime).toBeLessThan(5000); // Under 5 seconds for 100 encryptions

      // Verify all can be decrypted
      const decryptStartTime = Date.now();
      const decrypted = await Promise.all(
        encrypted.map((enc, i) => 
          securityService.decryptBudgetData(enc.encrypted, enc.iv, enc.tag)
        )
      );
      const decryptTime = Date.now() - decryptStartTime;

      expect(decrypted).toHaveLength(100);
      expect(decryptTime).toBeLessThan(5000); // Under 5 seconds for 100 decryptions
      decrypted.forEach((data, i) => {
        expect(data.supplierId).toBe(`supplier-${i}`);
      });
    });

    test('should maintain security under concurrent load', async () => {
      const concurrentOperations = Array.from({ length: 50 }, (_, i) => ({
        encrypt: () => securityService.encryptBudgetData({ 
          id: i, 
          data: `concurrent-test-${i}`,
          timestamp: Date.now()
        }),
        validate: () => securityService.validateCostCalculation(
          1000 + i, 500 + i, 'gpt-3.5-turbo', 0.003 + (i * 0.0001)
        ),
        sign: () => securityService.signCacheEntry(
          `cache-key-${i}`, 
          { data: `cache-data-${i}`, index: i }
        )
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentOperations.map(async (ops, i) => ({
          encrypted: await ops.encrypt(),
          validated: await ops.validate(),
          signed: await ops.sign()
        }))
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds for all operations

      results.forEach((result, i) => {
        expect(result.encrypted).toHaveProperty('encrypted');
        expect(result.encrypted).toHaveProperty('iv');
        expect(result.encrypted).toHaveProperty('tag');
        expect(typeof result.validated).toBe('boolean');
        expect(result.signed).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });
});

export {};