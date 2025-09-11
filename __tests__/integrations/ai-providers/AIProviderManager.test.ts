/**
 * AIProviderManager Test Suite
 * Comprehensive tests for AI provider routing, failover, and wedding industry optimization
 * 
 * WS-239 Team C - Integration Focus
 */

import { AIProviderManager, AIProvider, AIRequest, SupplierAIConfig } from '../../../src/lib/integrations/ai-providers/AIProviderManager';
import { PlatformAIIntegrationService } from '../../../src/lib/integrations/ai-providers/PlatformAIIntegration';
import { ClientAIIntegrationService } from '../../../src/lib/integrations/ai-providers/ClientAIIntegration';
import { AIProviderHealthMonitor } from '../../../src/lib/integrations/health/AIProviderHealthMonitor';
import { AIUsageTrackingService } from '../../../src/lib/integrations/analytics/AIUsageTrackingService';

// Mock dependencies
jest.mock('../../../src/lib/integrations/ai-providers/PlatformAIIntegration');
jest.mock('../../../src/lib/integrations/ai-providers/ClientAIIntegration');
jest.mock('../../../src/lib/integrations/health/AIProviderHealthMonitor');
jest.mock('../../../src/lib/integrations/analytics/AIUsageTrackingService');
jest.mock('../../../src/lib/utils/logger');

describe('AIProviderManager', () => {
  let aiProviderManager: AIProviderManager;
  let mockPlatformAI: jest.Mocked<PlatformAIIntegrationService>;
  let mockClientAI: jest.Mocked<ClientAIIntegrationService>;
  let mockHealthMonitor: jest.Mocked<AIProviderHealthMonitor>;
  let mockUsageTracker: jest.Mocked<AIUsageTrackingService>;

  const mockSupplierConfig: SupplierAIConfig = {
    supplierId: 'supplier-123',
    currentProvider: AIProvider.PLATFORM_OPENAI,
    platformConfig: {
      tier: 'professional',
      monthlyQuota: 200000,
      usedQuota: 50000,
      resetDate: new Date('2025-02-01')
    },
    clientConfig: {
      provider: AIProvider.CLIENT_OPENAI,
      apiKey: 'sk-test-key',
      organizationId: 'org-123',
      validated: true,
      lastValidation: new Date()
    },
    preferences: {
      preferredProvider: 'platform',
      costOptimized: true,
      performanceOptimized: false,
      enableFailover: true
    },
    restrictions: {
      allowMigration: true,
      maxCostPerRequest: 0.50,
      maxTokensPerRequest: 4000
    }
  };

  const mockAIRequest: AIRequest = {
    id: 'req-123',
    supplierId: 'supplier-123',
    requestType: 'email_template',
    payload: {
      templateType: 'welcome',
      vendorType: 'photographer',
      context: {
        vendorName: 'Test Vendor',
        clientName: 'Test Client'
      }
    },
    priority: 'medium',
    weddingDate: new Date('2025-06-15'),
    isWeddingDay: false,
    metadata: {}
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPlatformAI = new PlatformAIIntegrationService() as jest.Mocked<PlatformAIIntegrationService>;
    mockClientAI = new ClientAIIntegrationService() as jest.Mocked<ClientAIIntegrationService>;
    mockHealthMonitor = new AIProviderHealthMonitor() as jest.Mocked<AIProviderHealthMonitor>;
    mockUsageTracker = new AIUsageTrackingService() as jest.Mocked<AIUsageTrackingService>;

    // Setup default mock responses
    mockPlatformAI.executePlatformRequest.mockResolvedValue({
      success: true,
      data: { subject: 'Welcome', body: 'Welcome to our service' },
      usage: { total_tokens: 150 },
      cost: 0.003,
      processingTime: 1200
    });

    mockClientAI.executeClientRequest.mockResolvedValue({
      success: true,
      data: { subject: 'Welcome', body: 'Welcome to our service' },
      usage: { total_tokens: 150 },
      cost: 0.0045,
      processingTime: 1400,
      provider: 'openai'
    });

    mockHealthMonitor.checkProviderHealth.mockResolvedValue({
      provider: AIProvider.PLATFORM_OPENAI,
      status: 'healthy',
      responseTime: 800,
      errorRate: 1,
      rateLimitRemaining: 100,
      lastChecked: new Date(),
      uptime: 99.9,
      issues: []
    });

    mockUsageTracker.trackRequest.mockResolvedValue();

    // Initialize AIProviderManager
    aiProviderManager = new AIProviderManager();

    // Inject mocks (in real implementation, would use dependency injection)
    (aiProviderManager as any).platformAI = mockPlatformAI;
    (aiProviderManager as any).clientAI = mockClientAI;
    (aiProviderManager as any).healthMonitor = mockHealthMonitor;
    (aiProviderManager as any).usageTracker = mockUsageTracker;
  });

  describe('routeToProvider', () => {
    it('should route request to platform AI when preferred and quota available', async () => {
      const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.PLATFORM_OPENAI);
      expect(mockPlatformAI.executePlatformRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockAIRequest,
          supplierTier: 'professional'
        })
      );
      expect(mockUsageTracker.trackRequest).toHaveBeenCalled();
    });

    it('should route to client AI when platform quota exceeded', async () => {
      const configWithExceededQuota = {
        ...mockSupplierConfig,
        platformConfig: {
          ...mockSupplierConfig.platformConfig!,
          usedQuota: 195000 // 97.5% of quota used
        }
      };

      const response = await aiProviderManager.routeToProvider(mockAIRequest, configWithExceededQuota);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
      expect(mockClientAI.executeClientRequest).toHaveBeenCalled();
    });

    it('should prioritize wedding day requests with critical priority', async () => {
      const weddingDayRequest = {
        ...mockAIRequest,
        isWeddingDay: true,
        weddingDate: new Date() // Today
      };

      const response = await aiProviderManager.routeToProvider(weddingDayRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(mockHealthMonitor.checkProviderHealth).toHaveBeenCalled();
    });

    it('should handle provider failures with failover', async () => {
      mockPlatformAI.executePlatformRequest.mockRejectedValue(new Error('Platform service unavailable'));

      const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
      expect(response.metadata?.failover).toBe(true);
    });

    it('should respect cost-optimized preference', async () => {
      const costOptimizedConfig = {
        ...mockSupplierConfig,
        preferences: {
          ...mockSupplierConfig.preferences,
          costOptimized: true,
          performanceOptimized: false
        }
      };

      const response = await aiProviderManager.routeToProvider(mockAIRequest, costOptimizedConfig);

      expect(response.success).toBe(true);
      // Platform AI is typically more cost-effective
      expect(response.provider).toBe(AIProvider.PLATFORM_OPENAI);
    });

    it('should apply seasonal load balancing during wedding season', async () => {
      // Mock current date to be in wedding season (June)
      const mockDate = new Date('2025-06-15');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(mockUsageTracker.trackRequest).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('validateProviderHealth', () => {
    it('should return health status for platform provider', async () => {
      const health = await aiProviderManager.validateProviderHealth(AIProvider.PLATFORM_OPENAI);

      expect(health).toEqual(
        expect.objectContaining({
          provider: AIProvider.PLATFORM_OPENAI,
          status: 'healthy',
          responseTime: 800,
          errorRate: 1
        })
      );
      expect(mockHealthMonitor.checkProviderHealth).toHaveBeenCalledWith(
        AIProvider.PLATFORM_OPENAI,
        undefined
      );
    });

    it('should return health status for client provider with API key', async () => {
      const apiKey = 'sk-test-key';
      const health = await aiProviderManager.validateProviderHealth(AIProvider.CLIENT_OPENAI, apiKey);

      expect(health.provider).toBe(AIProvider.CLIENT_OPENAI);
      expect(mockHealthMonitor.checkProviderHealth).toHaveBeenCalledWith(
        AIProvider.CLIENT_OPENAI,
        apiKey
      );
    });

    it('should handle health check failures gracefully', async () => {
      mockHealthMonitor.checkProviderHealth.mockRejectedValue(new Error('Health check failed'));

      const health = await aiProviderManager.validateProviderHealth(AIProvider.PLATFORM_OPENAI);

      expect(health.status).toBe('offline');
      expect(health.issues).toHaveLength(1);
      expect(health.issues[0].description).toContain('Health check failed');
    });
  });

  describe('handleProviderFailover', () => {
    it('should successfully failover to alternative provider', async () => {
      const response = await aiProviderManager.handleProviderFailover(
        AIProvider.PLATFORM_OPENAI,
        mockAIRequest
      );

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
      expect(response.metadata?.failover).toBe(true);
      expect(response.metadata?.originalProvider).toBe(AIProvider.PLATFORM_OPENAI);
    });

    it('should throw error when no supplier config found for failover', async () => {
      const requestWithoutConfig = {
        ...mockAIRequest,
        supplierId: 'unknown-supplier'
      };

      await expect(
        aiProviderManager.handleProviderFailover(AIProvider.PLATFORM_OPENAI, requestWithoutConfig)
      ).rejects.toThrow('Supplier configuration not found for failover');
    });
  });

  describe('migrateToPlatform', () => {
    beforeEach(() => {
      // Mock platform validation
      mockPlatformAI.validatePlatformAccess = jest.fn().mockResolvedValue({
        valid: true,
        quotaRemaining: 100000
      });
    });

    it('should successfully migrate supplier to platform', async () => {
      const result = await aiProviderManager.migrateToPlatform('supplier-123');

      expect(result.success).toBe(true);
      expect(result.toProvider).toBe(AIProvider.PLATFORM_OPENAI);
      expect(result.rollbackAvailable).toBe(true);
    });

    it('should handle migration validation failures', async () => {
      mockPlatformAI.validatePlatformAccess = jest.fn().mockResolvedValue({
        valid: false,
        error: 'Platform access denied'
      });

      const result = await aiProviderManager.migrateToPlatform('supplier-123');

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Platform access denied');
    });
  });

  describe('migrateToClient', () => {
    beforeEach(() => {
      mockClientAI.validateClientProvider.mockResolvedValue({
        valid: true,
        providerInfo: {
          organization: 'Test Org',
          models: ['gpt-4', 'gpt-3.5-turbo']
        }
      });
    });

    it('should successfully migrate supplier to client provider', async () => {
      const clientConfig = {
        provider: 'openai',
        apiKey: 'sk-new-key',
        organizationId: 'new-org'
      };

      const result = await aiProviderManager.migrateToClient('supplier-123', clientConfig);

      expect(result.success).toBe(true);
      expect(result.toProvider).toBe('openai');
      expect(mockClientAI.validateClientProvider).toHaveBeenCalledWith('openai', 'sk-new-key');
    });

    it('should fail migration with invalid client configuration', async () => {
      mockClientAI.validateClientProvider.mockResolvedValue({
        valid: false,
        error: 'Invalid API key'
      });

      const clientConfig = {
        provider: 'openai',
        apiKey: 'invalid-key'
      };

      await expect(
        aiProviderManager.migrateToClient('supplier-123', clientConfig)
      ).rejects.toThrow('Client provider validation failed: Invalid API key');
    });
  });

  describe('wedding day protection', () => {
    it('should detect wedding day based on wedding date', async () => {
      const todayWeddingRequest = {
        ...mockAIRequest,
        weddingDate: new Date(),
        isWeddingDay: false // Should be overridden by date detection
      };

      const response = await aiProviderManager.routeToProvider(todayWeddingRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      // Should have upgraded priority for wedding day
      expect(mockHealthMonitor.checkProviderHealth).toHaveBeenCalled();
    });

    it('should detect wedding day for tomorrow (preparation day)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowWeddingRequest = {
        ...mockAIRequest,
        weddingDate: tomorrow,
        isWeddingDay: false
      };

      const response = await aiProviderManager.routeToProvider(tomorrowWeddingRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(mockHealthMonitor.checkProviderHealth).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle platform AI service errors', async () => {
      mockPlatformAI.executePlatformRequest.mockRejectedValue(new Error('Service timeout'));

      const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);

      // Should failover to client AI
      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
      expect(mockClientAI.executeClientRequest).toHaveBeenCalled();
    });

    it('should throw error when all providers fail and failover disabled', async () => {
      const configWithoutFailover = {
        ...mockSupplierConfig,
        preferences: {
          ...mockSupplierConfig.preferences,
          enableFailover: false
        }
      };

      mockPlatformAI.executePlatformRequest.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        aiProviderManager.routeToProvider(mockAIRequest, configWithoutFailover)
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle both primary and failover provider failures', async () => {
      mockPlatformAI.executePlatformRequest.mockRejectedValue(new Error('Primary failed'));
      mockClientAI.executeClientRequest.mockRejectedValue(new Error('Failover failed'));

      await expect(
        aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig)
      ).rejects.toThrow('Primary provider failed: Primary failed. Failover also failed: Failover failed');
    });
  });

  describe('performance optimization', () => {
    it('should select performance-optimized provider when configured', async () => {
      const performanceConfig = {
        ...mockSupplierConfig,
        preferences: {
          ...mockSupplierConfig.preferences,
          performanceOptimized: true,
          costOptimized: false
        }
      };

      // Mock health monitor to return better performance for client provider
      mockHealthMonitor.checkProviderHealth
        .mockResolvedValueOnce({
          provider: AIProvider.PLATFORM_OPENAI,
          status: 'healthy',
          responseTime: 1500,
          errorRate: 2,
          rateLimitRemaining: 50,
          lastChecked: new Date(),
          uptime: 98.5,
          issues: []
        })
        .mockResolvedValueOnce({
          provider: AIProvider.CLIENT_OPENAI,
          status: 'healthy',
          responseTime: 800,
          errorRate: 1,
          rateLimitRemaining: 100,
          lastChecked: new Date(),
          uptime: 99.8,
          issues: []
        });

      const response = await aiProviderManager.routeToProvider(mockAIRequest, performanceConfig);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
    });
  });

  describe('quota management', () => {
    it('should check platform quota availability', async () => {
      const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.PLATFORM_OPENAI);
    });

    it('should switch to client when platform quota near limit', async () => {
      const nearQuotaConfig = {
        ...mockSupplierConfig,
        platformConfig: {
          ...mockSupplierConfig.platformConfig!,
          usedQuota: 185000 // 92.5% of quota used (above 90% threshold)
        }
      };

      const response = await aiProviderManager.routeToProvider(mockAIRequest, nearQuotaConfig);

      expect(response.success).toBe(true);
      expect(response.provider).toBe(AIProvider.CLIENT_OPENAI);
    });
  });
});

describe('AIProviderManager Integration Tests', () => {
  let aiProviderManager: AIProviderManager;

  beforeEach(() => {
    aiProviderManager = new AIProviderManager();
  });

  describe('seasonal load balancing', () => {
    it('should apply wedding season optimization during peak months', async () => {
      // Test with different months to ensure seasonal logic works
      const peakSeasonMonths = [2, 3, 4, 5, 6, 7, 8, 9]; // March-October

      for (const month of peakSeasonMonths) {
        const mockDate = new Date(2025, month, 15);
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);

        const response = await aiProviderManager.routeToProvider(mockAIRequest, mockSupplierConfig);
        
        expect(response.success).toBe(true);
        // During peak season, should have applied seasonal optimization
        
        jest.useRealTimers();
      }
    });
  });

  describe('request queue management', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        ...mockAIRequest,
        id: `req-${i}`,
        priority: i < 5 ? 'high' : 'medium'
      }));

      const responses = await Promise.all(
        requests.map(req => aiProviderManager.routeToProvider(req, mockSupplierConfig))
      );

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });

    it('should prioritize wedding day requests in queue', async () => {
      const normalRequest = { ...mockAIRequest, id: 'normal-req', priority: 'medium' as const };
      const weddingDayRequest = {
        ...mockAIRequest,
        id: 'wedding-req',
        priority: 'critical' as const,
        isWeddingDay: true
      };

      const responses = await Promise.all([
        aiProviderManager.routeToProvider(normalRequest, mockSupplierConfig),
        aiProviderManager.routeToProvider(weddingDayRequest, mockSupplierConfig)
      ]);

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });
});

// Helper functions for test setup
function createMockResponse(overrides: Partial<any> = {}) {
  return {
    success: true,
    data: { subject: 'Test', body: 'Test content' },
    usage: { total_tokens: 100 },
    cost: 0.002,
    processingTime: 1000,
    ...overrides
  };
}

function createMockHealthStatus(provider: AIProvider, overrides: Partial<any> = {}) {
  return {
    provider,
    status: 'healthy',
    responseTime: 800,
    errorRate: 1,
    rateLimitRemaining: 100,
    lastChecked: new Date(),
    uptime: 99.9,
    issues: [],
    ...overrides
  };
}