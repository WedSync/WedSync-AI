import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationAIEngine } from '@/lib/integrations/ai/notification-ai-engine';
import type {
  NotificationEngineConfig,
  SmartNotificationRequest,
  WorkflowAutomationRule,
  NotificationPersonalization,
  DeliveryOptimization,
} from '@/lib/integrations/ai/types';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: [],
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

vi.mock('@resend/node', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(() => ({ data: { id: 'email_123' }, error: null })),
    },
  })),
}));

vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(() => ({ sid: 'sms_123' })),
    },
  })),
}));

vi.mock('@/lib/integrations/ai/external-ai-services', () => ({
  ExternalAIServices: {
    personalizeContent: vi.fn(),
    optimizeDeliveryTiming: vi.fn(),
    analyzeEngagement: vi.fn(),
  },
}));

describe('NotificationAIEngine', () => {
  let notificationEngine: NotificationAIEngine;
  const mockConfig: NotificationEngineConfig = {
    organizationId: 'org_123',
    channels: {
      email: {
        enabled: true,
        provider: 'resend',
        credentials: { apiKey: 'resend_key_123' },
        templates: {
          welcome: 'template_welcome',
          reminder: 'template_reminder',
          update: 'template_update',
        },
      },
      sms: {
        enabled: true,
        provider: 'twilio',
        credentials: {
          accountSid: 'twilio_sid_123',
          authToken: 'twilio_token_123',
          phoneNumber: '+441234567890',
        },
      },
      push: {
        enabled: true,
        provider: 'firebase',
        credentials: { serverKey: 'firebase_key_123' },
      },
      inApp: {
        enabled: true,
        realTime: true,
      },
    },
    aiFeatures: {
      personalization: true,
      timingOptimization: true,
      contentGeneration: true,
      sentimentAnalysis: true,
      A_B_testing: true,
    },
    automation: {
      workflowRules: true,
      triggerBased: true,
      scheduledCampaigns: true,
      responseTracking: true,
    },
    preferences: {
      defaultChannel: 'email',
      fallbackChannel: 'sms',
      timezone: 'Europe/London',
      businessHours: {
        start: '09:00',
        end: '17:00',
        weekends: false,
      },
    },
  };

  beforeEach(() => {
    notificationEngine = new NotificationAIEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification Engine Configuration', () => {
    it('should configure notification engine successfully', async () => {
      const result =
        await notificationEngine.configureNotificationEngine(mockConfig);

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(mockConfig.organizationId);
      expect(result.enabledChannels).toContain('email');
      expect(result.enabledChannels).toContain('sms');
      expect(result.aiFeatures).toEqual(mockConfig.aiFeatures);
    });

    it('should validate channel configurations', async () => {
      const invalidConfig = {
        ...mockConfig,
        channels: {
          ...mockConfig.channels,
          email: {
            ...mockConfig.channels.email,
            credentials: { apiKey: '' }, // Invalid credentials
          },
        },
      };

      await expect(
        notificationEngine.configureNotificationEngine(invalidConfig),
      ).rejects.toThrow('Invalid email channel credentials');
    });

    it('should support multiple notification providers', async () => {
      const providers = ['resend', 'sendgrid', 'mailgun'];

      for (const provider of providers) {
        const config = {
          ...mockConfig,
          channels: {
            ...mockConfig.channels,
            email: { ...mockConfig.channels.email, provider: provider as any },
          },
        };

        const result =
          await notificationEngine.configureNotificationEngine(config);
        expect(result.emailProvider).toBe(provider);
      }
    });
  });

  describe('Smart Notification System', () => {
    const notificationRequest: SmartNotificationRequest = {
      recipientId: 'user_456',
      templateType: 'wedding-reminder',
      context: {
        weddingId: 'wedding_789',
        weddingDate: new Date('2024-06-15'),
        venue: 'Beautiful Gardens',
        daysUntil: 30,
      },
      personalization: {
        name: 'Sarah & John',
        preferences: {
          communication: 'formal',
          frequency: 'weekly',
          channels: ['email', 'sms'],
        },
        history: {
          lastEngagement: new Date('2024-01-10'),
          averageResponseTime: 2,
          preferredTime: '10:00',
        },
      },
      urgency: 'normal',
      aiOptimization: {
        personalizeContent: true,
        optimizeTiming: true,
        selectBestChannel: true,
      },
    };

    it('should create smart notifications with AI personalization', async () => {
      await notificationEngine.configureNotificationEngine(mockConfig);

      const result =
        await notificationEngine.createSmartNotification(notificationRequest);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.personalizedContent).toBeDefined();
      expect(result.optimizedChannel).toBeOneOf([
        'email',
        'sms',
        'push',
        'inApp',
      ]);
      expect(result.scheduledDelivery).toBeDefined();
    });

    it('should personalize content based on recipient data', async () => {
      const result =
        await notificationEngine.createSmartNotification(notificationRequest);

      expect(result.personalizedContent).toContain('Sarah & John');
      expect(result.personalizedContent).toContain('Beautiful Gardens');
      expect(result.personalizationScore).toBeGreaterThan(0.5);
      expect(result.aiPersonalization).toBe(true);
    });

    it('should optimize delivery timing', async () => {
      const result =
        await notificationEngine.createSmartNotification(notificationRequest);

      expect(result.optimizedTiming).toBeDefined();
      expect(result.deliveryWindow).toBeDefined();
      expect(result.timingConfidence).toBeGreaterThan(0.6);

      const deliveryHour = result.scheduledDelivery.getHours();
      expect(deliveryHour).toBeGreaterThanOrEqual(9); // Business hours
      expect(deliveryHour).toBeLessThanOrEqual(17);
    });

    it('should select optimal delivery channel', async () => {
      const result =
        await notificationEngine.createSmartNotification(notificationRequest);

      expect(result.channelSelection).toBeDefined();
      expect(result.channelSelection.primary).toBeOneOf(['email', 'sms']);
      expect(result.channelSelection.reasoning).toBeDefined();
      expect(result.channelSelection.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Multi-Channel Delivery', () => {
    const multiChannelRequest = {
      ...notificationRequest,
      channels: ['email', 'sms', 'push'],
      strategy: 'progressive' as const,
      timing: {
        email: { delay: 0 },
        sms: { delay: 3600 }, // 1 hour later
        push: { delay: 7200 }, // 2 hours later
      },
    };

    it('should deliver notifications across multiple channels', async () => {
      await notificationEngine.configureNotificationEngine(mockConfig);

      const result = await notificationEngine.deliverMultiChannel(
        'org_123',
        multiChannelRequest,
      );

      expect(result.success).toBe(true);
      expect(result.deliveries).toHaveLength(3);
      expect(result.deliveries.map((d) => d.channel)).toEqual([
        'email',
        'sms',
        'push',
      ]);
      expect(result.overallDeliveryId).toBeDefined();
    });

    it('should implement progressive delivery strategy', async () => {
      const result = await notificationEngine.deliverMultiChannel(
        'org_123',
        multiChannelRequest,
      );

      expect(result.strategy).toBe('progressive');
      expect(result.deliveries[0].scheduledAt).toBeDefined();
      expect(result.deliveries[1].scheduledAt.getTime()).toBeGreaterThan(
        result.deliveries[0].scheduledAt.getTime(),
      );
      expect(result.deliveries[2].scheduledAt.getTime()).toBeGreaterThan(
        result.deliveries[1].scheduledAt.getTime(),
      );
    });

    it('should handle channel failures with fallbacks', async () => {
      // Simulate email failure
      const failureResult = await notificationEngine.handleDeliveryFailure({
        deliveryId: 'delivery_123',
        channel: 'email',
        error: 'smtp-timeout',
        retryable: true,
      });

      expect(failureResult.handled).toBe(true);
      expect(failureResult.fallbackUsed).toBe(true);
      expect(failureResult.fallbackChannel).toBe('sms'); // From config
      expect(failureResult.retryScheduled).toBe(true);
    });

    it('should track delivery status across channels', async () => {
      const deliveryResult = await notificationEngine.deliverMultiChannel(
        'org_123',
        multiChannelRequest,
      );

      const status = await notificationEngine.getDeliveryStatus(
        deliveryResult.overallDeliveryId,
      );

      expect(status.overallStatus).toBeOneOf([
        'pending',
        'delivering',
        'completed',
        'failed',
      ]);
      expect(status.channelStatuses).toHaveLength(3);
      expect(status.channelStatuses[0]).toHaveProperty('channel');
      expect(status.channelStatuses[0]).toHaveProperty('status');
      expect(status.channelStatuses[0]).toHaveProperty('deliveredAt');
    });
  });

  describe('Workflow Automation', () => {
    const automationRule: WorkflowAutomationRule = {
      ruleId: 'rule_wedding_reminders',
      name: 'Wedding Day Countdown Reminders',
      trigger: {
        event: 'wedding-date-approaching',
        conditions: {
          daysUntil: [60, 30, 14, 7, 1],
          weddingStatus: 'confirmed',
        },
      },
      actions: [
        {
          type: 'send-notification',
          template: 'countdown-reminder',
          channel: 'auto-select',
          personalize: true,
          timing: 'optimal',
        },
        {
          type: 'update-timeline',
          field: 'reminder-sent',
          value: true,
        },
      ],
      aiOptimization: {
        enabled: true,
        personalizeContent: true,
        optimizeTiming: true,
        trackEngagement: true,
      },
      organizationId: 'org_123',
    };

    it('should create workflow automation rules', async () => {
      const result =
        await notificationEngine.createWorkflowRule(automationRule);

      expect(result.success).toBe(true);
      expect(result.ruleId).toBe(automationRule.ruleId);
      expect(result.active).toBe(true);
      expect(result.triggersConfigured).toBe(5); // 5 day thresholds
    });

    it('should execute workflow rules on trigger events', async () => {
      await notificationEngine.createWorkflowRule(automationRule);

      const triggerResult = await notificationEngine.executeWorkflowTrigger({
        ruleId: 'rule_wedding_reminders',
        eventData: {
          weddingId: 'wedding_789',
          daysUntil: 30,
          weddingStatus: 'confirmed',
          coupleId: 'couple_456',
        },
        timestamp: new Date(),
      });

      expect(triggerResult.triggered).toBe(true);
      expect(triggerResult.actionsExecuted).toBe(2);
      expect(triggerResult.notificationsSent).toBe(1);
      expect(triggerResult.executionTime).toBeLessThan(5000);
    });

    it('should optimize workflow performance with AI', async () => {
      const optimization = await notificationEngine.optimizeWorkflow(
        'rule_wedding_reminders',
        {
          historicalData: {
            engagementRates: [0.65, 0.72, 0.58, 0.81, 0.69],
            responseRates: [0.45, 0.52, 0.38, 0.61, 0.49],
            conversionRates: [0.15, 0.18, 0.12, 0.22, 0.16],
          },
          optimizationGoals: ['engagement', 'conversion'],
        },
      );

      expect(optimization.success).toBe(true);
      expect(optimization.improvements).toBeDefined();
      expect(optimization.estimatedImprovement).toBeGreaterThan(0);
      expect(optimization.recommendations).toBeDefined();
    });

    it('should handle complex conditional logic', async () => {
      const complexRule: WorkflowAutomationRule = {
        ruleId: 'rule_complex_logic',
        name: 'Complex Wedding Logic',
        trigger: {
          event: 'vendor-status-change',
          conditions: {
            and: [
              {
                field: 'vendorType',
                operator: 'in',
                value: ['photography', 'videography'],
              },
              { field: 'status', operator: 'equals', value: 'confirmed' },
              {
                or: [
                  { field: 'daysUntil', operator: 'less-than', value: 30 },
                  { field: 'priority', operator: 'equals', value: 'high' },
                ],
              },
            ],
          },
        },
        actions: [
          {
            type: 'conditional-notification',
            conditions: {
              if: { field: 'vendorType', equals: 'photography' },
              then: { template: 'photography-confirmed' },
              else: { template: 'videography-confirmed' },
            },
          },
        ],
        organizationId: 'org_123',
      };

      const result = await notificationEngine.createWorkflowRule(complexRule);
      expect(result.success).toBe(true);
      expect(result.conditionsValidated).toBe(true);
    });
  });

  describe('Engagement Analytics', () => {
    const analyticsRequest = {
      organizationId: 'org_123',
      timeframe: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      },
      channels: ['email', 'sms', 'push'],
      metrics: ['delivery-rate', 'open-rate', 'click-rate', 'conversion-rate'],
    };

    it('should track notification engagement metrics', async () => {
      const analytics =
        await notificationEngine.getEngagementAnalytics(analyticsRequest);

      expect(analytics.success).toBe(true);
      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalNotifications).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.overallEngagementRate).toBeGreaterThanOrEqual(0);
      expect(analytics.channelBreakdown).toBeDefined();
    });

    it('should provide detailed channel performance', async () => {
      const analytics =
        await notificationEngine.getEngagementAnalytics(analyticsRequest);

      expect(analytics.channelBreakdown.email).toBeDefined();
      expect(
        analytics.channelBreakdown.email.deliveryRate,
      ).toBeGreaterThanOrEqual(0);
      expect(analytics.channelBreakdown.email.openRate).toBeGreaterThanOrEqual(
        0,
      );
      expect(analytics.channelBreakdown.sms).toBeDefined();
      expect(analytics.channelBreakdown.push).toBeDefined();
    });

    it('should identify trends and patterns', async () => {
      const trends =
        await notificationEngine.identifyEngagementTrends('org_123');

      expect(trends.success).toBe(true);
      expect(trends.trends).toBeDefined();
      expect(trends.trends.bestPerformingChannel).toBeDefined();
      expect(trends.trends.optimalTiming).toBeDefined();
      expect(trends.trends.contentPatterns).toBeDefined();
      expect(trends.insights).toBeDefined();
    });

    it('should generate actionable recommendations', async () => {
      const recommendations =
        await notificationEngine.generateEngagementRecommendations('org_123');

      expect(recommendations.success).toBe(true);
      expect(recommendations.recommendations).toBeInstanceOf(Array);
      expect(recommendations.recommendations.length).toBeGreaterThan(0);

      const rec = recommendations.recommendations[0];
      expect(rec).toHaveProperty('type');
      expect(rec).toHaveProperty('priority');
      expect(rec).toHaveProperty('description');
      expect(rec).toHaveProperty('estimatedImpact');
    });
  });

  describe('A/B Testing System', () => {
    const abTestConfig = {
      testName: 'reminder-timing-test',
      description: 'Test optimal reminder timing',
      variants: [
        {
          name: 'morning-10am',
          weight: 50,
          configuration: { deliveryTime: '10:00' },
        },
        {
          name: 'evening-6pm',
          weight: 50,
          configuration: { deliveryTime: '18:00' },
        },
      ],
      successMetric: 'engagement-rate',
      duration: 14, // 14 days
      significanceLevel: 0.05,
      organizationId: 'org_123',
    };

    it('should create A/B tests for notifications', async () => {
      const result = await notificationEngine.createABTest(abTestConfig);

      expect(result.success).toBe(true);
      expect(result.testId).toBeDefined();
      expect(result.variants).toHaveLength(2);
      expect(result.status).toBe('active');
      expect(result.expectedEndDate).toBeDefined();
    });

    it('should distribute traffic according to variant weights', async () => {
      const testResult = await notificationEngine.createABTest(abTestConfig);

      const assignments = await Promise.all(
        Array(100)
          .fill(null)
          .map(() =>
            notificationEngine.assignToVariant(
              testResult.testId,
              'user_random',
            ),
          ),
      );

      const morningCount = assignments.filter(
        (a) => a.variant === 'morning-10am',
      ).length;
      const eveningCount = assignments.filter(
        (a) => a.variant === 'evening-6pm',
      ).length;

      // Should be roughly 50/50 (+/- 20%)
      expect(morningCount).toBeGreaterThan(30);
      expect(morningCount).toBeLessThan(70);
      expect(eveningCount).toBeGreaterThan(30);
      expect(eveningCount).toBeLessThan(70);
    });

    it('should analyze A/B test results', async () => {
      const analysis = await notificationEngine.analyzeABTest('test_123');

      expect(analysis.success).toBe(true);
      expect(analysis.results).toBeDefined();
      expect(analysis.results.winningVariant).toBeDefined();
      expect(analysis.results.statisticalSignificance).toBeGreaterThanOrEqual(
        0,
      );
      expect(analysis.results.confidenceInterval).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle provider API failures gracefully', async () => {
      // Simulate email provider failure
      const failureResult = await notificationEngine.handleProviderFailure({
        provider: 'resend',
        channel: 'email',
        error: 'api-rate-limit',
        affectedNotifications: ['notification_123', 'notification_456'],
      });

      expect(failureResult.handled).toBe(true);
      expect(failureResult.fallbackProvider).toBeDefined();
      expect(failureResult.notificationsRerouted).toBe(2);
      expect(failureResult.retryScheduled).toBe(true);
    });

    it('should implement circuit breaker pattern', async () => {
      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        await notificationEngine.simulateProviderFailure('org_123', 'sms');
      }

      const circuitStatus = await notificationEngine.getCircuitBreakerStatus(
        'org_123',
        'sms',
      );

      expect(circuitStatus.state).toBe('open');
      expect(circuitStatus.failureCount).toBe(5);
      expect(circuitStatus.nextRetryAt).toBeDefined();
    });

    it('should queue notifications during outages', async () => {
      await notificationEngine.simulateProviderOutage('org_123', 'email');

      const queueResult = await notificationEngine.createSmartNotification({
        ...notificationRequest,
        channels: ['email'],
      });

      expect(queueResult.queued).toBe(true);
      expect(queueResult.queuedUntil).toBeDefined();
      expect(queueResult.estimatedDelivery).toBeDefined();
    });

    it('should maintain notification ordering', async () => {
      const notifications = [
        {
          ...notificationRequest,
          priority: 1,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        {
          ...notificationRequest,
          priority: 2,
          timestamp: new Date('2024-01-15T10:01:00Z'),
        },
        {
          ...notificationRequest,
          priority: 1,
          timestamp: new Date('2024-01-15T10:02:00Z'),
        },
      ];

      const orderResult = await notificationEngine.processNotificationBatch(
        'org_123',
        notifications,
      );

      expect(orderResult.processed).toBe(3);
      expect(orderResult.orderMaintained).toBe(true);
      expect(orderResult.processingOrder).toEqual([0, 2, 1]); // Priority-based ordering
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume notification processing', async () => {
      const highVolumeRequests = Array(1000)
        .fill(null)
        .map((_, index) => ({
          ...notificationRequest,
          recipientId: `user_${index}`,
          context: {
            ...notificationRequest.context,
            weddingId: `wedding_${index}`,
          },
        }));

      const startTime = Date.now();
      const result = await notificationEngine.processBulkNotifications(
        'org_123',
        highVolumeRequests,
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1000);
      expect(endTime - startTime).toBeLessThan(30000); // Under 30 seconds
      expect(result.throughput).toBeGreaterThan(30); // At least 30/second
    });

    it('should optimize resource usage under load', async () => {
      const loadMetrics = await notificationEngine.getLoadMetrics('org_123');

      expect(loadMetrics.queueSize).toBeGreaterThanOrEqual(0);
      expect(loadMetrics.processingRate).toBeGreaterThan(0);
      expect(loadMetrics.memoryUsage).toBeLessThan(500); // MB
      expect(loadMetrics.cpuUsage).toBeLessThan(80); // Percentage
    });

    it('should implement rate limiting per organization', async () => {
      const rateLimitResult = await notificationEngine.checkRateLimit(
        'org_123',
        'email',
        {
          limit: 100,
          window: 3600, // 1 hour
        },
      );

      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.remaining).toBeGreaterThanOrEqual(0);
      expect(rateLimitResult.resetTime).toBeDefined();
      expect(rateLimitResult.windowStart).toBeDefined();
    });
  });
});
