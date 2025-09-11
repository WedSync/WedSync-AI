import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentGatewayConnector } from '../../../src/integrations/api-gateway/PaymentGatewayConnector';

// Mock dependencies
vi.mock('../../../src/integrations/api-gateway/ExternalAPIConnector');

describe('PaymentGatewayConnector', () => {
  let connector: PaymentGatewayConnector;
  const mockConfig = {
    primaryGateway: 'stripe',
    fallbackGateways: ['square', 'paypal'],
    enableMultiGateway: true,
    enableFraudDetection: true,
    enablePCICompliance: true,
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP'],
    weddingFeatures: {
      enableDeposits: true,
      enablePaymentPlans: true,
      enableDisputeHandling: true,
      enableRefundProtection: true,
      emergencyPaymentSupport: true
    },
    security: {
      encryptionLevel: 'AES-256',
      tokenization: true,
      pciDssCompliant: true,
      fraudScoreThreshold: 0.8
    }
  };

  beforeEach(() => {
    connector = new PaymentGatewayConnector(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Gateway Registration and Management', () => {
    it('should register Stripe payment gateway', async () => {
      const stripeConfig = {
        gatewayId: 'stripe-main',
        name: 'Stripe Payment Gateway',
        provider: 'stripe',
        version: 'v1',
        credentials: {
          secretKey: 'sk_test_stripe_key',
          publishableKey: 'pk_test_stripe_key',
          webhookSecret: 'whsec_stripe_webhook'
        },
        supportedFeatures: [
          'payments', 'refunds', 'disputes', 'subscriptions', 'payment-intents'
        ],
        supportedPaymentMethods: [
          'card', 'bank_transfer', 'apple_pay', 'google_pay'
        ],
        currencies: ['USD', 'CAD', 'EUR', 'GBP'],
        fees: {
          cardRate: 0.029,
          fixedFee: 0.30,
          internationalRate: 0.039
        },
        limits: {
          singleTransaction: 999999,
          dailyVolume: 1000000,
          monthlyVolume: 50000000
        }
      };

      const result = await connector.registerGateway(stripeConfig);

      expect(result.success).toBe(true);
      expect(result.gatewayId).toBe('stripe-main');
    });

    it('should register Square payment gateway', async () => {
      const squareConfig = {
        gatewayId: 'square-backup',
        name: 'Square Payment Gateway',
        provider: 'square',
        version: 'v2',
        credentials: {
          accessToken: 'sq_access_token',
          applicationId: 'sq_application_id',
          webhookSecret: 'sq_webhook_secret'
        },
        supportedFeatures: [
          'payments', 'refunds', 'disputes', 'terminal'
        ],
        supportedPaymentMethods: [
          'card', 'cash', 'apple_pay', 'google_pay'
        ],
        currencies: ['USD', 'CAD'],
        fees: {
          cardRate: 0.026,
          fixedFee: 0.10,
          keyedRate: 0.035
        },
        limits: {
          singleTransaction: 50000,
          dailyVolume: 500000,
          monthlyVolume: 10000000
        }
      };

      const result = await connector.registerGateway(squareConfig);
      expect(result.success).toBe(true);
    });

    it('should validate gateway configuration', async () => {
      const invalidConfig = {
        gatewayId: '',
        name: 'Invalid Gateway',
        provider: 'unknown',
        version: '',
        credentials: {},
        supportedFeatures: [],
        supportedPaymentMethods: [],
        currencies: [],
        fees: {},
        limits: {}
      };

      await expect(connector.registerGateway(invalidConfig)).rejects.toThrow('Invalid gateway configuration');
    });

    it('should handle gateway health monitoring', async () => {
      const stripeConfig = {
        gatewayId: 'stripe-health-test',
        name: 'Stripe Health Test',
        provider: 'stripe',
        version: 'v1',
        credentials: { secretKey: 'sk_test_key' },
        supportedFeatures: ['payments'],
        supportedPaymentMethods: ['card'],
        currencies: ['USD'],
        fees: { cardRate: 0.029 },
        limits: { singleTransaction: 999999 }
      };

      await connector.registerGateway(stripeConfig);

      const healthStatus = await connector.checkGatewayHealth('stripe-health-test');
      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.responseTime).toBeDefined();
      expect(healthStatus.lastChecked).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    beforeEach(async () => {
      // Register test gateways
      const stripeConfig = {
        gatewayId: 'stripe-test',
        name: 'Stripe Test Gateway',
        provider: 'stripe',
        version: 'v1',
        credentials: { secretKey: 'sk_test_key', publishableKey: 'pk_test_key' },
        supportedFeatures: ['payments', 'refunds', 'payment-intents'],
        supportedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        currencies: ['USD', 'CAD', 'EUR'],
        fees: { cardRate: 0.029, fixedFee: 0.30 },
        limits: { singleTransaction: 999999 }
      };

      await connector.registerGateway(stripeConfig);
    });

    it('should process wedding deposit payment', async () => {
      const depositPayment = {
        paymentId: 'payment-deposit-001',
        gatewayId: 'stripe-test',
        amount: 150000, // $1,500.00 in cents
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-123',
          email: 'couple@example.com',
          name: 'John & Jane Smith'
        },
        metadata: {
          weddingId: 'wedding-456',
          vendorId: 'photographer-789',
          paymentType: 'deposit',
          dueDate: '2024-02-15',
          description: 'Wedding photography deposit'
        },
        weddingSpecific: {
          isDeposit: true,
          depositPercentage: 0.5,
          totalAmount: 300000,
          vendorCategory: 'photography'
        }
      };

      const result = await connector.processPayment(depositPayment);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(150000);
      expect(result.weddingContext.isDeposit).toBe(true);
    });

    it('should process wedding payment plan installment', async () => {
      const installmentPayment = {
        paymentId: 'payment-installment-002',
        gatewayId: 'stripe-test',
        amount: 100000, // $1,000.00
        currency: 'USD',
        paymentMethod: {
          type: 'saved_payment_method',
          paymentMethodId: 'pm_saved_card_123'
        },
        customer: {
          id: 'couple-123',
          email: 'couple@example.com',
          name: 'John & Jane Smith'
        },
        metadata: {
          weddingId: 'wedding-456',
          vendorId: 'caterer-456',
          paymentType: 'installment',
          installmentNumber: 2,
          totalInstallments: 4,
          description: 'Wedding catering - payment 2 of 4'
        },
        weddingSpecific: {
          isInstallment: true,
          paymentPlan: {
            totalAmount: 400000,
            installments: 4,
            currentInstallment: 2,
            dueDate: '2024-04-01'
          },
          vendorCategory: 'catering'
        }
      };

      const result = await connector.processPayment(installmentPayment);

      expect(result.success).toBe(true);
      expect(result.paymentPlan).toBeDefined();
      expect(result.paymentPlan.currentInstallment).toBe(2);
      expect(result.paymentPlan.remainingAmount).toBe(200000);
    });

    it('should handle payment failures gracefully', async () => {
      const failingPayment = {
        paymentId: 'payment-fail-003',
        gatewayId: 'stripe-test',
        amount: 50000,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4000000000000002', // Test card that will be declined
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-456',
          email: 'test@example.com',
          name: 'Test Customer'
        },
        metadata: {
          weddingId: 'wedding-789',
          vendorId: 'florist-123'
        }
      };

      const result = await connector.processPayment(failingPayment);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBeDefined();
      expect(result.status).toBe('failed');
    });

    it('should process emergency wedding day payment', async () => {
      const emergencyPayment = {
        paymentId: 'payment-emergency-004',
        gatewayId: 'stripe-test',
        amount: 200000, // $2,000.00 - emergency vendor replacement
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-789',
          email: 'emergency@example.com',
          name: 'Emergency Customer'
        },
        metadata: {
          weddingId: 'wedding-emergency',
          vendorId: 'replacement-photographer-001',
          paymentType: 'emergency',
          urgency: 'immediate',
          description: 'Emergency photographer replacement - same day'
        },
        weddingSpecific: {
          isEmergency: true,
          weddingDate: 'today',
          originalVendorId: 'photographer-cancelled',
          emergencyReason: 'vendor_cancellation'
        }
      };

      const result = await connector.processPayment(emergencyPayment);

      expect(result.success).toBe(true);
      expect(result.priority).toBe('emergency');
      expect(result.processingTime).toBeLessThan(30000); // Should be processed quickly
      expect(result.weddingDayProtection).toBe(true);
    });
  });

  describe('Wedding-Specific Features', () => {
    beforeEach(async () => {
      const stripeConfig = {
        gatewayId: 'stripe-wedding',
        name: 'Stripe Wedding Gateway',
        provider: 'stripe',
        version: 'v1',
        credentials: { secretKey: 'sk_test_key' },
        supportedFeatures: ['payments', 'refunds', 'disputes', 'subscriptions'],
        supportedPaymentMethods: ['card'],
        currencies: ['USD'],
        fees: { cardRate: 0.029, fixedFee: 0.30 },
        limits: { singleTransaction: 999999 }
      };

      await connector.registerGateway(stripeConfig);
    });

    it('should create wedding payment plan', async () => {
      const paymentPlan = {
        planId: 'plan-wedding-001',
        weddingId: 'wedding-123',
        vendorId: 'photographer-456',
        totalAmount: 500000, // $5,000.00
        currency: 'USD',
        customerId: 'couple-789',
        planType: 'custom',
        schedule: [
          {
            installmentNumber: 1,
            amount: 150000, // 30% deposit
            dueDate: '2024-01-15',
            description: 'Photography deposit'
          },
          {
            installmentNumber: 2,
            amount: 175000, // 35% 
            dueDate: '2024-03-15',
            description: 'Photography progress payment'
          },
          {
            installmentNumber: 3,
            amount: 175000, // 35% final
            dueDate: '2024-05-15',
            description: 'Photography final payment'
          }
        ],
        autoCharge: true,
        reminderDays: [7, 3, 1], // Days before due date to send reminders
        lateFee: {
          enabled: true,
          amount: 5000, // $50.00
          gracePeriodDays: 5
        }
      };

      const result = await connector.createPaymentPlan(paymentPlan);

      expect(result.success).toBe(true);
      expect(result.planId).toBe('plan-wedding-001');
      expect(result.installments).toHaveLength(3);
      expect(result.totalAmount).toBe(500000);
    });

    it('should handle wedding vendor dispute', async () => {
      const dispute = {
        disputeId: 'dispute-wedding-001',
        paymentId: 'payment-disputed-001',
        weddingId: 'wedding-456',
        vendorId: 'photographer-789',
        amount: 300000,
        reason: 'services_not_provided',
        description: 'Photographer did not show up for wedding',
        evidence: [
          {
            type: 'contract',
            url: 'https://storage.com/contract.pdf',
            description: 'Original photography contract'
          },
          {
            type: 'communication',
            url: 'https://storage.com/emails.pdf',
            description: 'Email communications with vendor'
          },
          {
            type: 'witness_statement',
            content: 'Wedding planner confirmed photographer absence',
            witness: 'planner@weddings.com'
          }
        ],
        weddingContext: {
          weddingDate: '2024-06-15',
          impact: 'critical', // No photos of wedding day
          alternativeVendor: 'replacement-photographer-123',
          additionalCosts: 150000 // Cost of emergency replacement
        }
      };

      const result = await connector.handleDispute(dispute);

      expect(result.success).toBe(true);
      expect(result.disputeId).toBe('dispute-wedding-001');
      expect(result.status).toBe('submitted');
      expect(result.weddingProtection).toBe(true);
      expect(result.estimatedResolution).toBeDefined();
    });

    it('should process wedding refund with protection', async () => {
      const refundRequest = {
        refundId: 'refund-wedding-001',
        originalPaymentId: 'payment-refund-001',
        amount: 200000, // Partial refund
        currency: 'USD',
        reason: 'vendor_cancellation',
        weddingId: 'wedding-789',
        vendorId: 'florist-cancelled',
        refundContext: {
          cancellationDate: '2024-05-01',
          weddingDate: '2024-06-15',
          daysBeforeWedding: 45,
          cancellationReason: 'business_closure',
          refundPolicy: 'full_refund_over_30_days'
        },
        protectionClaim: {
          claimId: 'protection-001',
          covered: true,
          additionalCompensation: 50000, // $500 inconvenience compensation
          replacementVendorAssistance: true
        }
      };

      const result = await connector.processRefund(refundRequest);

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(200000);
      expect(result.protectionPayout).toBe(50000);
      expect(result.totalCompensation).toBe(250000);
      expect(result.weddingProtection).toBe(true);
    });

    it('should handle seasonal pricing and surcharges', async () => {
      const seasonalPayment = {
        paymentId: 'payment-seasonal-001',
        gatewayId: 'stripe-wedding',
        baseAmount: 300000, // $3,000.00
        currency: 'USD',
        weddingDate: '2024-06-15', // Peak wedding season
        location: {
          city: 'Napa',
          state: 'CA' // Premium wedding destination
        },
        seasonalFactors: {
          peakSeasonSurcharge: 0.20, // 20% increase
          destinationSurcharge: 0.15, // 15% increase for premium location
          weekendSurcharge: 0.10 // 10% increase for Saturday
        },
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-seasonal',
          email: 'seasonal@example.com',
          name: 'Seasonal Customer'
        }
      };

      const result = await connector.calculateSeasonalPricing(seasonalPayment);

      expect(result.baseAmount).toBe(300000);
      expect(result.seasonalSurcharge).toBeGreaterThan(0);
      expect(result.totalAmount).toBeGreaterThan(300000);
      expect(result.surchargeBreakdown).toBeDefined();
    });
  });

  describe('Multi-Gateway Failover', () => {
    beforeEach(async () => {
      // Register multiple gateways
      const gateways = [
        {
          gatewayId: 'stripe-primary',
          name: 'Stripe Primary',
          provider: 'stripe',
          version: 'v1',
          credentials: { secretKey: 'sk_stripe_key' },
          supportedFeatures: ['payments', 'refunds'],
          supportedPaymentMethods: ['card'],
          currencies: ['USD'],
          fees: { cardRate: 0.029 },
          limits: { singleTransaction: 999999 }
        },
        {
          gatewayId: 'square-fallback',
          name: 'Square Fallback',
          provider: 'square',
          version: 'v2',
          credentials: { accessToken: 'sq_access_token' },
          supportedFeatures: ['payments', 'refunds'],
          supportedPaymentMethods: ['card'],
          currencies: ['USD'],
          fees: { cardRate: 0.026 },
          limits: { singleTransaction: 50000 }
        }
      ];

      for (const gateway of gateways) {
        await connector.registerGateway(gateway);
      }
    });

    it('should failover to backup gateway when primary fails', async () => {
      // Mark primary gateway as unhealthy
      await connector.updateGatewayHealth('stripe-primary', {
        healthy: false,
        errorRate: 0.9,
        responseTime: 10000,
        lastError: 'Service unavailable'
      });

      const payment = {
        paymentId: 'payment-failover-001',
        amount: 45000, // Under Square's limit
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-failover',
          email: 'failover@example.com',
          name: 'Failover Customer'
        },
        metadata: {
          weddingId: 'wedding-failover',
          vendorId: 'vendor-test'
        }
      };

      const result = await connector.processPayment(payment);

      expect(result.success).toBe(true);
      expect(result.gatewayUsed).toBe('square-fallback');
      expect(result.failoverUsed).toBe(true);
    });

    it('should distribute load across healthy gateways', async () => {
      const payments = Array.from({ length: 10 }, (_, i) => ({
        paymentId: `payment-load-${i}`,
        amount: 25000,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: `couple-${i}`,
          email: `test${i}@example.com`,
          name: `Test Customer ${i}`
        }
      }));

      const results = await Promise.all(
        payments.map(payment => connector.processPayment(payment))
      );

      const gatewayUsage = {};
      results.forEach(result => {
        if (result.success) {
          const gateway = result.gatewayUsed;
          gatewayUsage[gateway] = (gatewayUsage[gateway] || 0) + 1;
        }
      });

      // Should distribute across multiple gateways
      expect(Object.keys(gatewayUsage).length).toBeGreaterThan(1);
    });

    it('should route payments based on gateway capabilities', async () => {
      const highValuePayment = {
        paymentId: 'payment-high-value',
        amount: 75000, // Above Square's limit
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-high-value',
          email: 'highvalue@example.com',
          name: 'High Value Customer'
        }
      };

      const result = await connector.processPayment(highValuePayment);

      expect(result.success).toBe(true);
      expect(result.gatewayUsed).toBe('stripe-primary'); // Only Stripe can handle high amounts
      expect(result.routingReason).toBe('amount_limit');
    });
  });

  describe('Security and Compliance', () => {
    it('should validate PCI DSS compliance', async () => {
      const complianceCheck = await connector.validatePCICompliance();

      expect(complianceCheck.compliant).toBe(true);
      expect(complianceCheck.requirements).toBeDefined();
      expect(complianceCheck.violations).toHaveLength(0);
      expect(complianceCheck.lastAudit).toBeDefined();
    });

    it('should detect fraudulent payment attempts', async () => {
      const suspiciousPayment = {
        paymentId: 'payment-fraud-001',
        gatewayId: 'stripe-primary',
        amount: 999999, // Maximum amount - suspicious
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4000000000000002', // Test fraud card
            expMonth: 1,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'suspicious-customer',
          email: 'fraud@suspicious.com',
          name: 'Fraud Test',
          riskFactors: {
            newCustomer: true,
            vpnUsage: true,
            multipleFailedAttempts: 5,
            unusualLocation: true
          }
        },
        metadata: {
          weddingId: 'wedding-suspicious',
          ipAddress: '192.168.1.1',
          userAgent: 'Suspicious Bot 1.0'
        }
      };

      const result = await connector.processPayment(suspiciousPayment);

      expect(result.success).toBe(false);
      expect(result.fraudScore).toBeGreaterThan(0.8);
      expect(result.riskFactors).toBeDefined();
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toBe('fraud_detection');
    });

    it('should encrypt sensitive payment data', async () => {
      const paymentData = {
        cardNumber: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2025,
        cvc: '123',
        customerId: 'couple-123'
      };

      const encrypted = await connector.encryptPaymentData(paymentData);

      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.encryptionMethod).toBe('AES-256');
      expect(encrypted.keyId).toBeDefined();

      // Verify we can decrypt
      const decrypted = await connector.decryptPaymentData(encrypted);
      expect(decrypted.cardNumber).toBe('4242424242424242');
    });

    it('should tokenize payment methods', async () => {
      const paymentMethod = {
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123'
        },
        billingDetails: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      };

      const tokenized = await connector.tokenizePaymentMethod(paymentMethod);

      expect(tokenized.success).toBe(true);
      expect(tokenized.token).toBeDefined();
      expect(tokenized.token).not.toContain('4242424242424242');
      expect(tokenized.lastFour).toBe('4242');
      expect(tokenized.brand).toBe('visa');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should generate payment analytics', async () => {
      const analytics = await connector.getPaymentAnalytics({
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        },
        groupBy: ['gateway', 'vendor_category', 'payment_type'],
        includeMetrics: ['volume', 'success_rate', 'average_amount', 'fees']
      });

      expect(analytics.totalVolume).toBeDefined();
      expect(analytics.totalTransactions).toBeDefined();
      expect(analytics.successRate).toBeDefined();
      expect(analytics.gatewayBreakdown).toBeDefined();
      expect(analytics.vendorCategoryBreakdown).toBeDefined();
    });

    it('should track wedding payment trends', async () => {
      const trends = await connector.getWeddingPaymentTrends({
        timeRange: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          end: new Date()
        },
        metrics: ['seasonal_volume', 'average_transaction', 'payment_plan_usage']
      });

      expect(trends.seasonalPatterns).toBeDefined();
      expect(trends.peakMonths).toBeDefined();
      expect(trends.averageWeddingSpend).toBeDefined();
      expect(trends.paymentPlanAdoption).toBeDefined();
    });

    it('should generate vendor payment reports', async () => {
      const vendorReport = await connector.generateVendorPaymentReport({
        vendorId: 'photographer-123',
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          end: new Date()
        },
        includeDetails: ['transactions', 'refunds', 'disputes', 'fees']
      });

      expect(vendorReport.vendorId).toBe('photographer-123');
      expect(vendorReport.totalEarnings).toBeDefined();
      expect(vendorReport.transactionCount).toBeDefined();
      expect(vendorReport.refundRate).toBeDefined();
      expect(vendorReport.disputeRate).toBeDefined();
      expect(vendorReport.paymentMethods).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle gateway timeout gracefully', async () => {
      const timeoutPayment = {
        paymentId: 'payment-timeout-001',
        gatewayId: 'stripe-primary',
        amount: 100000,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-timeout',
          email: 'timeout@example.com',
          name: 'Timeout Test'
        },
        timeout: 1000 // Very short timeout
      };

      const result = await connector.processPayment(timeoutPayment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.retryRecommended).toBe(true);
    });

    it('should handle network failures with retry logic', async () => {
      const networkFailurePayment = {
        paymentId: 'payment-network-fail',
        gatewayId: 'stripe-primary',
        amount: 50000,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-network',
          email: 'network@example.com',
          name: 'Network Test'
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      // Mock network failure scenario
      vi.spyOn(connector, 'processPayment')
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.resolve({
          success: true,
          transactionId: 'txn_retry_success',
          status: 'succeeded',
          retryCount: 1
        }));

      const result = await connector.processPayment(networkFailurePayment);

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('should recover from partial payment failures', async () => {
      const partialFailure = {
        paymentId: 'payment-partial-fail',
        gatewayId: 'stripe-primary',
        amount: 100000,
        currency: 'USD',
        splitPayment: {
          enabled: true,
          splits: [
            { vendorId: 'photographer-1', amount: 60000 },
            { vendorId: 'florist-1', amount: 40000 }
          ]
        },
        paymentMethod: {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        },
        customer: {
          id: 'couple-split',
          email: 'split@example.com',
          name: 'Split Payment Test'
        }
      };

      const result = await connector.processSplitPayment(partialFailure);

      expect(result.overallSuccess).toBeDefined();
      expect(result.splitResults).toHaveLength(2);
      expect(result.partialFailureHandling).toBeDefined();
    });
  });
});