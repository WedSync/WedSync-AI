import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { userContextService } from '@/lib/feature-requests/services/UserContextEnrichmentService';
import { WeddingTestDataFactory } from '../../mocks/wedding-data-factory';
import { MockSupabaseClient } from '../../mocks/supabase-client';

// Mock external dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => MockSupabaseClient,
}));

jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('UserContextEnrichmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Redis mocks
    MockSupabaseClient.from.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Performance Requirements', () => {
    it('should enrich feature request under 100ms', async () => {
      // Arrange
      const featureRequest =
        WeddingTestDataFactory.featureRequests.standardRequest;
      const userId = 'test-user-id';

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.photographer,
            }),
          }),
        }),
      }));

      // Act
      const startTime = performance.now();
      const result = await userContextService.enrichUserContext(
        userId,
        featureRequest,
      );
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result.userType).toBe('supplier');
    }, 10000);

    it('should use cache for repeated requests', async () => {
      // Arrange
      const featureRequest =
        WeddingTestDataFactory.featureRequests.standardRequest;
      const userId = 'test-user-id';

      // Mock cache hit
      const { redis } = await import('@/lib/redis');
      (redis.get as jest.Mock).mockResolvedValue(
        JSON.stringify(WeddingTestDataFactory.userContext.photographer),
      );

      // Act
      const result = await userContextService.enrichUserContext(
        userId,
        featureRequest,
      );

      // Assert
      expect(redis.get).toHaveBeenCalledWith(`user_context:${userId}`);
      expect(result.credibilityScore).toBe(85);
    });
  });

  describe('Wedding Context Enrichment', () => {
    it('should boost priority for peak season weddings', async () => {
      // Arrange
      const peakSeasonRequest = {
        ...WeddingTestDataFactory.featureRequests.standardRequest,
        wedding_context: WeddingTestDataFactory.weddings.peakSeason,
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.photographer,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        peakSeasonRequest,
      );

      // Assert
      expect(result.weddingContext?.season).toBe('peak');
      expect(result.contextualInsights.urgencyFactors).toContain('peak_season');
      expect(result.contextualInsights.priorityBoost).toBeGreaterThanOrEqual(1);
    });

    it('should flag Saturday wedding protection', async () => {
      // Arrange
      const saturdayWedding = {
        ...WeddingTestDataFactory.featureRequests.standardRequest,
        wedding_context: WeddingTestDataFactory.weddings.saturdayWedding,
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.venue,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        saturdayWedding,
      );

      // Assert
      expect(result.weddingContext?.isWeddingDay).toBe(true);
      expect(result.contextualInsights.saturdayProtection).toBe(true);
      expect(result.contextualInsights.deploymentRestriction).toBe(
        'read_only_weekend',
      );
    });

    it('should calculate wedding urgency based on days remaining', async () => {
      // Arrange
      const urgentWedding = {
        ...WeddingTestDataFactory.featureRequests.standardRequest,
        wedding_context: WeddingTestDataFactory.weddings.emergencyScenario,
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.photographer,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        urgentWedding,
      );

      // Assert
      expect(result.weddingContext?.daysUntilWedding).toBeLessThan(7);
      expect(result.contextualInsights.urgencyLevel).toBe('critical');
      expect(result.contextualInsights.urgencyFactors).toContain(
        'wedding_imminent',
      );
    });
  });

  describe('Business Context Analysis', () => {
    it('should calculate credibility score for photographers', async () => {
      // Arrange
      const photographerData = WeddingTestDataFactory.vendors.photographer;

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: photographerData,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        WeddingTestDataFactory.featureRequests.standardRequest,
      );

      // Assert
      expect(result.businessMetrics?.tier).toBe('professional');
      expect(result.credibilityScore).toBeGreaterThan(70);
      expect(result.businessMetrics?.monthlyRevenue).toBeGreaterThan(0);
    });

    it('should handle venue prestige levels', async () => {
      // Arrange
      const luxuryVenue = WeddingTestDataFactory.vendors.venue;

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: luxuryVenue,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        WeddingTestDataFactory.featureRequests.standardRequest,
      );

      // Assert
      expect(result.businessMetrics?.prestigeLevel).toBe('luxury');
      expect(result.credibilityScore).toBeGreaterThan(80);
    });
  });

  describe('Mobile-First Context', () => {
    it('should flag mobile-critical features', async () => {
      // Arrange
      const mobileRequest = {
        ...WeddingTestDataFactory.featureRequests.standardRequest,
        category: 'mobile-app',
        title: 'Mobile photo upload improvement',
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.photographer,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        mobileRequest,
      );

      // Assert
      expect(result.contextualInsights.mobileCritical).toBe(true);
      expect(result.contextualInsights.deviceContext.primaryDevice).toBe(
        'mobile',
      );
    });
  });

  describe('GDPR Compliance', () => {
    it('should anonymize sensitive data in context', async () => {
      // Arrange
      const featureRequest =
        WeddingTestDataFactory.featureRequests.standardRequest;

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                ...WeddingTestDataFactory.vendors.photographer,
                client_names: ['John Doe', 'Jane Smith'], // Sensitive data
              },
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        featureRequest,
      );

      // Assert
      expect(result.businessMetrics?.clientCount).toBe(2);
      expect(result.businessMetrics?.clientNames).toBeUndefined(); // Should be anonymized
      expect(result.dataProcessingConsent).toBe(true);
    });

    it('should handle data minimization requirements', async () => {
      // Arrange
      const minimalRequest = WeddingTestDataFactory.featureRequests.minimalData;

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: WeddingTestDataFactory.vendors.minimal,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        minimalRequest,
      );

      // Assert
      expect(result.dataMinimization).toBe(true);
      expect(Object.keys(result.businessMetrics || {})).toHaveLength(3); // Only essential fields
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle database errors', async () => {
      // Arrange
      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      }));

      // Act & Assert
      await expect(
        userContextService.enrichUserContext(
          'test-user',
          WeddingTestDataFactory.featureRequests.standardRequest,
        ),
      ).resolves.toBeDefined(); // Should not throw, should return default context
    });

    it('should handle missing user data gracefully', async () => {
      // Arrange
      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'non-existent-user',
        WeddingTestDataFactory.featureRequests.standardRequest,
      );

      // Assert
      expect(result.userType).toBe('unknown');
      expect(result.credibilityScore).toBe(0);
      expect(result.businessMetrics).toBeNull();
    });
  });

  describe('Tier-Based Access Control', () => {
    it('should respect FREE tier limitations', async () => {
      // Arrange
      const freeTierUser = {
        ...WeddingTestDataFactory.vendors.photographer,
        subscription_tier: 'free',
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: freeTierUser,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        WeddingTestDataFactory.featureRequests.premiumFeature,
      );

      // Assert
      expect(result.businessMetrics?.tier).toBe('free');
      expect(result.contextualInsights.featureAccess.aiFeatures).toBe(false);
      expect(result.contextualInsights.featureAccess.marketplace).toBe(false);
    });

    it('should enable PROFESSIONAL tier features', async () => {
      // Arrange
      const proTierUser = {
        ...WeddingTestDataFactory.vendors.photographer,
        subscription_tier: 'professional',
      };

      MockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: proTierUser,
            }),
          }),
        }),
      }));

      // Act
      const result = await userContextService.enrichUserContext(
        'test-user',
        WeddingTestDataFactory.featureRequests.premiumFeature,
      );

      // Assert
      expect(result.businessMetrics?.tier).toBe('professional');
      expect(result.contextualInsights.featureAccess.aiFeatures).toBe(true);
      expect(result.contextualInsights.featureAccess.marketplace).toBe(true);
    });
  });
});
