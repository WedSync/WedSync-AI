import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentAIIntegration } from '@/lib/integrations/ai/payment-ai-integration';
import type {
  PaymentIntegrationConfig,
  BudgetOptimizationRequest,
  SmartPaymentScheduleRequest,
  PaymentAnalyticsRequest,
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

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
      confirm: vi.fn(),
      retrieve: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/integrations/ai/external-ai-services', () => ({
  ExternalAIServices: {
    optimizeBudget: vi.fn(),
    predictPaymentTiming: vi.fn(),
    analyzeSpendingPatterns: vi.fn(),
  },
}));

describe('PaymentAIIntegration', () => {
  let paymentAI: PaymentAIIntegration;
  const mockConfig: PaymentIntegrationConfig = {
    organizationId: 'org_123',
    paymentProcessor: 'stripe',
    credentials: {
      publicKey: 'pk_test_123',
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_test_123',
    },
    aiFeatures: {
      budgetOptimization: true,
      smartScheduling: true,
      fraudDetection: true,
      predictiveAnalytics: true,
    },
    automationRules: {
      autoPaymentReminders: true,
      smartRetries: true,
      budgetAlerts: true,
      optimizeTimings: true,
    },
  };

  beforeEach(() => {
    paymentAI = new PaymentAIIntegration();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Payment Integration Setup', () => {
    it('should configure payment integration successfully', async () => {
      const result = await paymentAI.configurePaymentIntegration(mockConfig);

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(mockConfig.organizationId);
      expect(result.processor).toBe(mockConfig.paymentProcessor);
      expect(result.aiFeatures).toEqual(mockConfig.aiFeatures);
    });

    it('should validate payment processor credentials', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { ...mockConfig.credentials, secretKey: '' },
      };

      await expect(
        paymentAI.configurePaymentIntegration(invalidConfig),
      ).rejects.toThrow('Invalid payment processor credentials');
    });

    it('should support multiple payment processors', async () => {
      const processors = ['stripe', 'square', 'paypal'];

      for (const processor of processors) {
        const config = { ...mockConfig, paymentProcessor: processor as any };
        const result = await paymentAI.configurePaymentIntegration(config);
        expect(result.processor).toBe(processor);
      }
    });
  });

  describe('AI Budget Optimization', () => {
    const budgetRequest: BudgetOptimizationRequest = {
      weddingId: 'wedding_456',
      totalBudget: 25000,
      currentAllocations: {
        venue: 8000,
        catering: 6000,
        photography: 3000,
        flowers: 2000,
        music: 1500,
        other: 4500,
      },
      priorities: {
        venue: 'high',
        photography: 'high',
        catering: 'medium',
        flowers: 'medium',
        music: 'low',
      },
      constraints: {
        maxVenue: 10000,
        minPhotography: 2500,
        flexibleCategories: ['flowers', 'music', 'other'],
      },
      timeline: {
        weddingDate: new Date('2024-08-15'),
        bookingDeadlines: {
          venue: new Date('2024-03-01'),
          photography: new Date('2024-05-01'),
          catering: new Date('2024-06-01'),
        },
      },
    };

    it('should optimize budget allocation with AI', async () => {
      const result = await paymentAI.optimizeBudgetAllocation(budgetRequest);

      expect(result.success).toBe(true);
      expect(result.optimizedAllocations).toBeDefined();
      expect(result.totalOptimized).toBe(budgetRequest.totalBudget);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should respect budget constraints', async () => {
      const result = await paymentAI.optimizeBudgetAllocation(budgetRequest);

      expect(result.optimizedAllocations.venue).toBeLessThanOrEqual(
        budgetRequest.constraints.maxVenue!,
      );
      expect(result.optimizedAllocations.photography).toBeGreaterThanOrEqual(
        budgetRequest.constraints.minPhotography!,
      );
    });

    it('should prioritize high-priority categories', async () => {
      const result = await paymentAI.optimizeBudgetAllocation(budgetRequest);

      // High priority categories should receive adequate allocation
      expect(result.optimizedAllocations.venue).toBeGreaterThan(
        budgetRequest.totalBudget * 0.25, // At least 25% of total budget
      );
      expect(result.optimizedAllocations.photography).toBeGreaterThan(
        budgetRequest.totalBudget * 0.1, // At least 10% of total budget
      );
    });

    it('should provide optimization reasoning', async () => {
      const result = await paymentAI.optimizeBudgetAllocation(budgetRequest);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.changes).toBeDefined();
      expect(result.reasoning.rationale).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Smart Payment Scheduling', () => {
    const scheduleRequest: SmartPaymentScheduleRequest = {
      weddingId: 'wedding_456',
      vendors: [
        {
          vendorId: 'vendor_photography',
          totalAmount: 3000,
          paymentTerms: 'deposit-30-final-70',
          bookingDate: new Date('2024-02-01'),
          serviceDate: new Date('2024-08-15'),
        },
        {
          vendorId: 'vendor_venue',
          totalAmount: 8000,
          paymentTerms: 'deposit-50-installments',
          bookingDate: new Date('2024-01-15'),
          serviceDate: new Date('2024-08-15'),
        },
      ],
      clientCashFlow: {
        monthlyIncome: 8000,
        monthlyExpenses: 5000,
        existingDebts: 2000,
        savingsGoal: 1000,
      },
      preferences: {
        minimizeInterest: true,
        spreadPayments: true,
        alignWithIncome: true,
        bufferDays: 7,
      },
    };

    it('should create optimized payment schedule', async () => {
      const result =
        await paymentAI.createSmartPaymentSchedule(scheduleRequest);

      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(result.totalAmount).toBe(
        scheduleRequest.vendors.reduce((sum, v) => sum + v.totalAmount, 0),
      );
      expect(result.aiOptimizations).toBeDefined();
    });

    it('should align payments with cash flow', async () => {
      const result =
        await paymentAI.createSmartPaymentSchedule(scheduleRequest);

      // Check that monthly payment amounts don't exceed available cash flow
      const monthlyPayments = new Map<string, number>();

      result.schedule.payments.forEach((payment) => {
        const monthKey = payment.dueDate.toISOString().substring(0, 7);
        monthlyPayments.set(
          monthKey,
          (monthlyPayments.get(monthKey) || 0) + payment.amount,
        );
      });

      const availableCashFlow =
        scheduleRequest.clientCashFlow.monthlyIncome -
        scheduleRequest.clientCashFlow.monthlyExpenses -
        scheduleRequest.clientCashFlow.existingDebts;

      monthlyPayments.forEach((monthlyAmount) => {
        expect(monthlyAmount).toBeLessThanOrEqual(availableCashFlow);
      });
    });

    it('should optimize payment timing', async () => {
      const result =
        await paymentAI.createSmartPaymentSchedule(scheduleRequest);

      expect(result.aiOptimizations).toHaveProperty('timingOptimized');
      expect(result.aiOptimizations).toHaveProperty('interestSavings');
      expect(result.aiOptimizations).toHaveProperty('cashFlowImpact');
      expect(result.schedule.totalInterest).toBeGreaterThanOrEqual(0);
    });

    it('should handle payment schedule updates', async () => {
      const initialSchedule =
        await paymentAI.createSmartPaymentSchedule(scheduleRequest);

      const updateRequest = {
        scheduleId: initialSchedule.scheduleId!,
        changes: {
          vendorId: 'vendor_photography',
          newAmount: 3500, // Increased amount
          reason: 'additional-services',
        },
      };

      const result = await paymentAI.updatePaymentSchedule(updateRequest);

      expect(result.success).toBe(true);
      expect(result.updatedSchedule).toBeDefined();
      expect(result.impactAnalysis).toBeDefined();
    });
  });

  describe('Automated Budget Tracking', () => {
    const weddingId = 'wedding_456';
    const budgetData = {
      totalBudget: 25000,
      allocated: 22000,
      spent: 15000,
      categories: {
        venue: { allocated: 8000, spent: 8000 },
        photography: { allocated: 3000, spent: 1000 },
        catering: { allocated: 6000, spent: 3000 },
        flowers: { allocated: 2000, spent: 1500 },
        music: { allocated: 1500, spent: 0 },
        other: { allocated: 1500, spent: 1500 },
      },
    };

    it('should track budget in real-time', async () => {
      const result = await paymentAI.trackBudgetRealTime(weddingId, budgetData);

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBeDefined();
      expect(result.currentStatus.totalSpent).toBe(15000);
      expect(result.currentStatus.remaining).toBe(10000);
      expect(result.currentStatus.utilizationRate).toBeCloseTo(0.6, 1);
    });

    it('should detect budget overruns', async () => {
      const overrunData = {
        ...budgetData,
        categories: {
          ...budgetData.categories,
          venue: { allocated: 8000, spent: 9500 }, // Overrun
        },
      };

      const result = await paymentAI.trackBudgetRealTime(
        weddingId,
        overrunData,
      );

      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].type).toBe('budget-overrun');
      expect(result.alerts[0].category).toBe('venue');
    });

    it('should provide predictive budget insights', async () => {
      const insights = await paymentAI.getPredictiveBudgetInsights(weddingId);

      expect(insights.success).toBe(true);
      expect(insights.predictions).toBeDefined();
      expect(insights.predictions.projectedTotal).toBeGreaterThan(0);
      expect(insights.predictions.riskAreas).toBeDefined();
      expect(insights.recommendations).toBeDefined();
    });

    it('should generate budget variance reports', async () => {
      const report = await paymentAI.generateBudgetVarianceReport(weddingId);

      expect(report.success).toBe(true);
      expect(report.variance).toBeDefined();
      expect(report.variance.totalVariance).toBeDefined();
      expect(report.variance.categoryBreakdown).toBeDefined();
      expect(report.trendAnalysis).toBeDefined();
    });
  });

  describe('Payment Analytics and Insights', () => {
    const analyticsRequest: PaymentAnalyticsRequest = {
      organizationId: 'org_123',
      timeframe: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
      metrics: [
        'payment-volume',
        'success-rate',
        'average-transaction',
        'seasonal-trends',
        'client-behavior',
      ],
      segmentation: {
        byWeddingSize: true,
        byBudgetRange: true,
        byPaymentMethod: true,
        byVendorCategory: true,
      },
    };

    it('should generate comprehensive payment analytics', async () => {
      const result = await paymentAI.generatePaymentAnalytics(analyticsRequest);

      expect(result.success).toBe(true);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.summary).toBeDefined();
      expect(result.analytics.trends).toBeDefined();
      expect(result.analytics.segmentation).toBeDefined();
    });

    it('should identify payment trends and patterns', async () => {
      const result = await paymentAI.generatePaymentAnalytics(analyticsRequest);

      expect(result.analytics.trends).toHaveProperty('volume');
      expect(result.analytics.trends).toHaveProperty('seasonal');
      expect(result.analytics.trends).toHaveProperty('success');
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', async () => {
      const result = await paymentAI.generatePaymentAnalytics(analyticsRequest);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      const recommendation = result.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('description');
      expect(recommendation).toHaveProperty('estimatedImpact');
    });

    it('should benchmark against industry standards', async () => {
      const benchmark = await paymentAI.getBenchmarkAnalysis('org_123');

      expect(benchmark.success).toBe(true);
      expect(benchmark.comparisons).toBeDefined();
      expect(benchmark.comparisons).toHaveProperty('successRate');
      expect(benchmark.comparisons).toHaveProperty('averageTransactionValue');
      expect(benchmark.comparisons).toHaveProperty('paymentTimings');
      expect(benchmark.industryPosition).toBeDefined();
    });
  });

  describe('Fraud Detection and Security', () => {
    it('should detect suspicious payment patterns', async () => {
      const suspiciousPayment = {
        amount: 50000, // Very high amount
        location: 'Unknown Country',
        paymentMethod: 'new-card',
        userBehavior: 'unusual',
        velocity: 'high',
      };

      const result = await paymentAI.analyzeFraudRisk(
        'org_123',
        suspiciousPayment,
      );

      expect(result.riskScore).toBeGreaterThan(50);
      expect(result.riskLevel).toBeOneOf(['medium', 'high', 'critical']);
      expect(result.flags).toBeDefined();
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should recommend fraud prevention actions', async () => {
      const highRiskPayment = {
        amount: 25000,
        location: 'High Risk Country',
        paymentMethod: 'stolen-card-pattern',
        userBehavior: 'bot-like',
      };

      const result = await paymentAI.analyzeFraudRisk(
        'org_123',
        highRiskPayment,
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.actionRequired).toBe(true);
    });

    it('should implement adaptive fraud thresholds', async () => {
      const result = await paymentAI.updateFraudThresholds('org_123', {
        transactionHistory: '6-months',
        successRate: 0.95,
        falsePositiveRate: 0.02,
      });

      expect(result.success).toBe(true);
      expect(result.updatedThresholds).toBeDefined();
      expect(result.estimatedImpact).toBeDefined();
    });
  });

  describe('Integration Health and Monitoring', () => {
    it('should monitor payment integration health', async () => {
      const health = await paymentAI.checkIntegrationHealth('org_123');

      expect(health.status).toBeOneOf(['healthy', 'warning', 'error']);
      expect(health.lastTransaction).toBeDefined();
      expect(health.successRate).toBeGreaterThanOrEqual(0);
      expect(health.avgResponseTime).toBeGreaterThan(0);
    });

    it('should provide detailed performance metrics', async () => {
      const metrics = await paymentAI.getPerformanceMetrics('org_123');

      expect(metrics.transactionVolume).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorBreakdown).toBeDefined();
      expect(metrics.responseTimePercentiles).toBeDefined();
    });

    it('should alert on integration issues', async () => {
      const alerts = await paymentAI.getActiveAlerts('org_123');

      expect(alerts).toBeInstanceOf(Array);
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
        expect(alert).toHaveProperty('resolutionSteps');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle payment processor failures', async () => {
      // Simulate processor failure
      const failureResult = await paymentAI.handlePaymentFailure({
        paymentId: 'payment_failed',
        error: 'processor-unavailable',
        retryable: true,
        amount: 1500,
      });

      expect(failureResult.handled).toBe(true);
      expect(failureResult.retryScheduled).toBe(true);
      expect(failureResult.fallbackUsed).toBeDefined();
    });

    it('should implement intelligent retry logic', async () => {
      const retryResult = await paymentAI.retryFailedPayment('payment_failed', {
        useAlternativeMethod: true,
        adjustAmount: false,
        maxRetries: 3,
      });

      expect(retryResult.success).toBeDefined();
      expect(retryResult.attemptNumber).toBeGreaterThan(1);
      expect(retryResult.nextRetryAt).toBeDefined();
    });

    it('should maintain payment integrity during failures', async () => {
      const integrity = await paymentAI.verifyPaymentIntegrity('payment_123');

      expect(integrity.verified).toBe(true);
      expect(integrity.balanceMatch).toBe(true);
      expect(integrity.auditTrail).toBe(true);
      expect(integrity.discrepancies).toHaveLength(0);
    });
  });
});
