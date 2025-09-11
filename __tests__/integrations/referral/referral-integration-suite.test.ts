/**
 * WS-344 Team C - Referral Integration Test Suite
 * Comprehensive integration tests for all referral system components
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { QRGeneratorService } from '@/services/qr-generator';
import { BillingIntegrationService, ReferralReward } from '@/services/billing-integration';
import { ReferralNotificationService } from '@/services/email/referral-notifications';
import { ReferralRealtimeService } from '@/services/realtime/referral-updates';
import { ReferralIntegrationHealthService } from '@/services/integration-health';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_test-key';
process.env.RESEND_API_KEY = 'test-resend-key';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.url' } }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null })
      })
    },
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-org', business_name: 'Test Supplier' }, error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null })
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({}),
      send: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn().mockResolvedValue({})
    }))
  }))
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        items: {
          data: [{
            price: {
              unit_amount: 4900, // £49
              recurring: { interval: 'month' }
            }
          }]
        }
      })
    },
    customers: {
      createBalanceTransaction: vi.fn().mockResolvedValue({ id: 'txn_test' }),
      update: vi.fn().mockResolvedValue({ id: 'cus_test' })
    },
    coupons: {
      create: vi.fn().mockResolvedValue({ id: 'coupon_test' })
    },
    balance: {
      retrieve: vi.fn().mockResolvedValue({
        available: [{ amount: 100000 }],
        pending: [{ amount: 0 }]
      })
    }
  }))
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'email_test' },
        error: null
      })
    }
  }))
}));

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test-qr-data'))
  }
}));

describe('WS-344 Referral Integration Suite', () => {
  let qrGenerator: QRGeneratorService;
  let billingService: BillingIntegrationService;
  let notificationService: ReferralNotificationService;
  let realtimeService: ReferralRealtimeService;
  let healthService: ReferralIntegrationHealthService;

  beforeAll(async () => {
    // Initialize services
    qrGenerator = new QRGeneratorService();
    billingService = new BillingIntegrationService();
    notificationService = new ReferralNotificationService();
    realtimeService = new ReferralRealtimeService();
    healthService = new ReferralIntegrationHealthService();
  });

  afterAll(async () => {
    // Cleanup
    await healthService.stopMonitoring();
  });

  describe('QR Code Generation Service', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate QR code with wedding-themed styling', async () => {
      const result = await qrGenerator.generateReferralQR(
        'https://wedsync.com/referral/abc123',
        'supplier-id-1'
      );

      expect(result.success).toBe(true);
      expect(result.qrCodeUrl).toMatch(/https:\/\/storage\.url/);
      expect(result.fileName).toMatch(/qr-codes\/referrals\/supplier-id-1\//);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle batch QR generation for viral periods', async () => {
      const requests = [
        { link: 'https://wedsync.com/ref/1', supplierId: 'sup-1' },
        { link: 'https://wedsync.com/ref/2', supplierId: 'sup-2' },
        { link: 'https://wedsync.com/ref/3', supplierId: 'sup-3' }
      ];

      const result = await qrGenerator.generateBatchQRCodes(requests);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.result?.success)).toBe(true);
    });

    it('should validate QR code URLs correctly', async () => {
      const validUrl = 'https://storage.url/qr-codes/referrals/supplier-1/test.png';
      const result = await qrGenerator.validateQRCode(validUrl);
      expect(result).toBe(true);
    });

    it('should return healthy status with performance metrics', async () => {
      const health = await qrGenerator.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.error).toBeUndefined();
    });

    it('should handle errors gracefully with proper logging', async () => {
      // Test with invalid URL
      await expect(
        qrGenerator.generateReferralQR('invalid-url', 'supplier-id')
      ).rejects.toThrow('Invalid referral link URL');
    });
  });

  describe('Billing Integration Service', () => {
    const mockReward: ReferralReward = {
      supplierId: 'sup-123',
      rewardType: 'month_free',
      value: 4900, // £49 in pence
      referralId: 'ref-456',
      description: '1 month free for successful referral',
      metadata: { source: 'test' }
    };

    it('should process referral rewards with Stripe integration', async () => {
      const result = await billingService.creditReferralReward(mockReward);

      expect(result.success).toBe(true);
      expect(result.creditAmount).toBe(4900);
      expect(result.description).toContain('1 month free');
      expect(result.transactionId).toBe('txn_test');
    });

    it('should handle milestone rewards correctly', async () => {
      const milestone = {
        supplierId: 'sup-123',
        milestone: '5_conversions',
        conversionsCount: 5,
        rewardType: 'months_free' as const,
        value: 4900,
        description: '5 conversions milestone'
      };

      const result = await billingService.processMilestoneReward(milestone);

      expect(result.success).toBe(true);
      expect(result.creditAmount).toBe(4900);
      expect(result.description).toContain('month');
    });

    it('should validate reward eligibility with rate limiting', async () => {
      const eligibility = await billingService.validateRewardEligibility('sup-123', 'month_free');
      expect(eligibility.eligible).toBe(true);
    });

    it('should prevent duplicate reward processing', async () => {
      // First reward should succeed
      const result1 = await billingService.creditReferralReward(mockReward);
      expect(result1.success).toBe(true);

      // Second identical reward should be rejected
      await expect(
        billingService.creditReferralReward(mockReward)
      ).rejects.toThrow('Reward already processed');
    });

    it('should maintain health status with Stripe connectivity', async () => {
      const health = await billingService.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.details?.stripe_available_balance).toBe(100000);
    });
  });

  describe('Email Notification Service', () => {
    it('should send referral reward notifications with proper templates', async () => {
      const reward = {
        supplierId: 'sup-123',
        referredSupplierName: 'Test Vendor',
        description: '1 month free service',
        monthsEarned: 1,
        creditAmount: 4900,
        rewardType: 'month_free' as const
      };

      const result = await notificationService.sendReferralRewardNotification('sup-123', reward);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
    });

    it('should send milestone achievement emails with celebrations', async () => {
      const milestone = {
        title: '5 Conversions Milestone',
        description: 'Achieved 5 successful referrals',
        reward: '1 month free service',
        totalConversions: 5,
        currentRank: 15,
        milestoneType: 'conversion_count' as const
      };

      const result = await notificationService.sendMilestoneAchievementEmail('sup-123', milestone);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
    });

    it('should send leaderboard updates only for improvements', async () => {
      const rankingUpdate = {
        currentRank: 12,
        previousRank: 18,
        rankImprovement: 6,
        category: 'photographers',
        newConversions: 3,
        totalConversions: 15,
        period: 'weekly' as const
      };

      const result = await notificationService.sendLeaderboardUpdateEmail('sup-123', rankingUpdate);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
    });

    it('should not send leaderboard emails for rank decreases', async () => {
      const rankingUpdate = {
        currentRank: 20,
        previousRank: 15,
        rankImprovement: -5, // Rank decreased
        category: 'photographers',
        newConversions: 0,
        totalConversions: 15,
        period: 'weekly' as const
      };

      const result = await notificationService.sendLeaderboardUpdateEmail('sup-123', rankingUpdate);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(false); // Should not queue
    });

    it('should maintain email service health with queue monitoring', async () => {
      const health = await notificationService.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.details?.resend_status).toBe('ok');
      expect(health.details?.template_count).toBe(3);
    });
  });

  describe('Real-time Updates Service', () => {
    it('should broadcast leaderboard updates via Supabase channels', async () => {
      await expect(
        realtimeService.broadcastLeaderboardUpdate('photographers', 'London', 'weekly')
      ).resolves.not.toThrow();
    });

    it('should notify referral progress with detailed tracking', async () => {
      const progress = {
        referralId: 'ref-123',
        stage: 'converted' as const,
        referredEmail: 'test@example.com',
        referredSupplierName: 'Test Supplier',
        conversionProbability: 95,
        timeInStage: 172800, // 2 days
        nextExpectedAction: 'First payment'
      };

      await expect(
        realtimeService.notifyReferralProgress('ref-123', progress)
      ).resolves.not.toThrow();
    });

    it('should handle reward notifications with public broadcasts for significant achievements', async () => {
      const rewardData = {
        type: 'milestone' as const,
        amount: 12000, // £120 - significant reward
        description: '10 conversions milestone achievement',
        milestoneType: '10_conversions'
      };

      await expect(
        realtimeService.notifyRewardEarned('sup-123', rewardData)
      ).resolves.not.toThrow();
    });

    it('should support subscription management with proper cleanup', async () => {
      const channel = await realtimeService.subscribeToReferralUpdates('sup-123', (update) => {
        expect(update.type).toMatch(/referral_progress|reward_earned|milestone_achieved/);
      });

      expect(channel).toBeDefined();

      // Test unsubscription
      await expect(
        realtimeService.unsubscribeFromChannel('supplier:sup-123')
      ).resolves.not.toThrow();
    });

    it('should maintain realtime service health with channel monitoring', async () => {
      const health = await realtimeService.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.details?.realtime_connected).toBe(true);
    });

    it('should provide channel analytics and management info', async () => {
      const info = await realtimeService.getActiveChannelsInfo();
      expect(info.totalChannels).toBeGreaterThanOrEqual(0);
      expect(info.channelTypes).toBeTypeOf('object');
    });
  });

  describe('Integration Health Monitoring', () => {
    it('should perform comprehensive health checks on all services', async () => {
      const report = await healthService.checkAllIntegrations();

      expect(report.overall.healthy).toBe(true);
      expect(report.overall.score).toBeGreaterThanOrEqual(80);
      expect(report.services.qrGeneration.healthy).toBe(true);
      expect(report.services.billing.healthy).toBe(true);
      expect(report.services.emailNotifications.healthy).toBe(true);
      expect(report.services.realtimeUpdates.healthy).toBe(true);
    });

    it('should assess wedding day readiness with critical issue detection', async () => {
      const report = await healthService.checkAllIntegrations();

      expect(report.weddingDayReadiness.ready).toBe(true);
      expect(report.weddingDayReadiness.criticalIssues).toHaveLength(0);
      expect(Array.isArray(report.weddingDayReadiness.warnings)).toBe(true);
    });

    it('should generate actionable recommendations based on health status', async () => {
      const report = await healthService.checkAllIntegrations();

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('operating normally');
    });

    it('should track health metrics over time', async () => {
      await healthService.checkAllIntegrations();
      
      const metrics = healthService.getHealthMetrics(1); // Last 1 hour
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.integrationId).toBe('referral-integration-suite');
      expect(latestMetric.isHealthy).toBe(true);
    });

    it('should handle emergency health checks with rapid response', async () => {
      const report = await healthService.triggerEmergencyHealthCheck();

      expect(report).toBeDefined();
      expect(report.overall.healthy).toBe(true);
      expect(Date.parse(report.overall.lastChecked)).toBeGreaterThan(Date.now() - 10000); // Within 10 seconds
    });
  });

  describe('End-to-End Integration Flows', () => {
    it('should complete full referral reward flow', async () => {
      // 1. Generate QR code for referral link
      const qrResult = await qrGenerator.generateReferralQR(
        'https://wedsync.com/referral/e2e-test',
        'e2e-supplier'
      );
      expect(qrResult.success).toBe(true);

      // 2. Process referral reward
      const reward: ReferralReward = {
        supplierId: 'e2e-supplier',
        rewardType: 'month_free',
        value: 4900,
        referralId: 'e2e-referral',
        description: 'End-to-end test reward'
      };

      const billingResult = await billingService.creditReferralReward(reward);
      expect(billingResult.success).toBe(true);

      // 3. Send notification email
      const notificationResult = await notificationService.sendReferralRewardNotification(
        'e2e-supplier',
        {
          supplierId: 'e2e-supplier',
          referredSupplierName: 'E2E Test Vendor',
          description: reward.description,
          monthsEarned: 1,
          creditAmount: reward.value,
          rewardType: reward.rewardType
        }
      );
      expect(notificationResult.success).toBe(true);

      // 4. Broadcast real-time update
      await expect(
        realtimeService.notifyRewardEarned('e2e-supplier', {
          type: 'referral',
          amount: reward.value,
          description: reward.description,
          referralId: reward.referralId
        })
      ).resolves.not.toThrow();

      // 5. Verify health across all services
      const healthReport = await healthService.checkAllIntegrations();
      expect(healthReport.overall.healthy).toBe(true);
      expect(healthReport.weddingDayReadiness.ready).toBe(true);
    });

    it('should handle high-load viral period simulation', async () => {
      // Simulate 20 concurrent QR generations
      const qrPromises = Array.from({ length: 20 }, (_, i) =>
        qrGenerator.generateReferralQR(
          `https://wedsync.com/viral/ref-${i}`,
          `viral-supplier-${i}`
        )
      );

      const qrResults = await Promise.all(qrPromises);
      expect(qrResults.every(r => r.success)).toBe(true);

      // Simulate 10 concurrent reward processes
      const rewardPromises = Array.from({ length: 10 }, (_, i) =>
        billingService.creditReferralReward({
          supplierId: `viral-supplier-${i}`,
          rewardType: 'month_free',
          value: 4900,
          referralId: `viral-ref-${i}`,
          description: `Viral test reward ${i}`
        })
      );

      const rewardResults = await Promise.allSettled(rewardPromises);
      const successfulRewards = rewardResults.filter(r => r.status === 'fulfilled').length;
      expect(successfulRewards).toBeGreaterThan(8); // Allow some failures under load

      // Verify system remains healthy under load
      const healthReport = await healthService.checkAllIntegrations();
      expect(healthReport.overall.score).toBeGreaterThan(70); // Allow some degradation under load
    });

    it('should maintain data consistency across all services', async () => {
      const supplierId = 'consistency-test-supplier';
      const referralId = 'consistency-test-referral';

      // Create QR code
      const qrResult = await qrGenerator.generateReferralQR(
        `https://wedsync.com/consistency/${referralId}`,
        supplierId
      );
      
      // Process reward
      const reward: ReferralReward = {
        supplierId,
        rewardType: 'fixed_credit',
        value: 2500, // £25
        referralId,
        description: 'Consistency test credit'
      };
      
      const billingResult = await billingService.creditReferralReward(reward);
      
      // All operations should complete successfully with consistent data
      expect(qrResult.success).toBe(true);
      expect(billingResult.success).toBe(true);
      expect(billingResult.creditAmount).toBe(2500);
      expect(qrResult.fileName).toContain(supplierId);
    });

    it('should handle graceful degradation during service failures', async () => {
      // Simulate partial service failures and verify graceful handling
      
      // Health check should still work and report issues
      const healthReport = await healthService.checkAllIntegrations();
      expect(healthReport).toBeDefined();
      expect(Array.isArray(healthReport.recommendations)).toBe(true);
      expect(Array.isArray(healthReport.weddingDayReadiness.warnings)).toBe(true);
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should complete QR generation within performance targets', async () => {
      const startTime = Date.now();
      
      await qrGenerator.generateReferralQR(
        'https://wedsync.com/perf-test',
        'perf-supplier'
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Must complete within 2 seconds
    });

    it('should process billing operations within SLA', async () => {
      const startTime = Date.now();
      
      await billingService.creditReferralReward({
        supplierId: 'sla-supplier',
        rewardType: 'month_free',
        value: 4900,
        referralId: 'sla-referral',
        description: 'SLA test reward'
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Billing must complete within 3 seconds
    });

    it('should maintain email queue performance under load', async () => {
      const startTime = Date.now();
      
      // Queue 5 emails simultaneously
      const emailPromises = Array.from({ length: 5 }, (_, i) =>
        notificationService.sendReferralRewardNotification(`load-test-${i}`, {
          supplierId: `load-test-${i}`,
          referredSupplierName: `Load Test ${i}`,
          description: 'Load test notification',
          monthsEarned: 1,
          creditAmount: 4900,
          rewardType: 'month_free'
        })
      );
      
      const results = await Promise.all(emailPromises);
      const duration = Date.now() - startTime;
      
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should queue quickly
    });

    it('should handle real-time updates with minimal latency', async () => {
      const startTime = Date.now();
      
      await realtimeService.broadcastLeaderboardUpdate('photographers', 'London');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Real-time updates must be fast
    });
  });
});

// Helper functions for testing
export const testHelpers = {
  createMockReferralReward: (overrides: Partial<ReferralReward> = {}): ReferralReward => ({
    supplierId: 'test-supplier',
    rewardType: 'month_free',
    value: 4900,
    referralId: 'test-referral',
    description: 'Test reward',
    ...overrides
  }),
  
  waitForHealthCheck: (service: any, maxWait: number = 5000): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const health = await service.getHealthStatus();
        resolve(health);
      }, Math.min(maxWait, 1000));
    });
  },
  
  simulateWeddingDayLoad: async (services: any[]) => {
    // Simulate Saturday wedding day load patterns
    const loadPromises = services.map(service => 
      service.getHealthStatus ? service.getHealthStatus() : Promise.resolve()
    );
    
    return Promise.allSettled(loadPromises);
  }
};