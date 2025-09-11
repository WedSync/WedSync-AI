/**
 * WS-239 Billing Accuracy Testing
 * Critical testing for precise billing calculations across dual AI systems
 * Ensures wedding suppliers are billed accurately for platform and client AI usage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { BillingAccuracyValidator } from '@/lib/ai/billing-accuracy-validator'
import { InvoiceGenerator } from '@/lib/ai/invoice-generator'
import { UsageAggregator } from '@/lib/ai/usage-aggregator'
import { TierCalculator } from '@/lib/ai/tier-calculator'
import { createMockWeddingVendor } from '../../setup'

// Mock billing data sources
const mockUsageDatabase = {
  getUsageByPeriod: vi.fn(),
  getProviderBreakdown: vi.fn(),
  getCostHistory: vi.fn(),
  validateUsageIntegrity: vi.fn()
}

const mockPaymentSystem = {
  createInvoice: vi.fn(),
  processPayment: vi.fn(),
  handleRefund: vi.fn(),
  validateBillingData: vi.fn()
}

const mockAuditTracker = {
  logBillingCalculation: vi.fn(),
  logAccuracyCheck: vi.fn(),
  logDiscrepancy: vi.fn(),
  generateAuditReport: vi.fn()
}

describe('Billing Accuracy Testing - WS-239', () => {
  let billingValidator: BillingAccuracyValidator
  let invoiceGenerator: InvoiceGenerator
  let usageAggregator: UsageAggregator
  let tierCalculator: TierCalculator
  let photographyStudio: any
  let venueCoordinator: any
  let weddingPlanner: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup realistic wedding suppliers with different usage patterns
    photographyStudio = createMockWeddingVendor({
      id: 'photography-accuracy-test-001',
      service_type: 'photographer',
      subscription_tier: 'professional', // £49/month
      ai_usage_pattern: {
        peak_months: [3, 4, 5, 6, 7, 8, 9, 10], // Wedding season
        avg_monthly_tokens: 1200,
        peak_multiplier: 2.5,
        cost_sensitivity: 'high'
      },
      billing_history: {
        accurate_billing_required: true,
        disputes_history: 0,
        payment_method: 'stripe_subscription'
      }
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'venue-billing-test-002', 
      service_type: 'venue',
      subscription_tier: 'scale', // £79/month
      multi_provider_setup: true,
      cost_optimization_active: true,
      billing_complexity: {
        platform_usage: 800,
        client_openai: 1200,
        client_anthropic: 300,
        mixed_provider_month: true
      }
    })

    weddingPlanner = createMockWeddingVendor({
      id: 'planner-billing-enterprise-003',
      service_type: 'wedding_planner', 
      subscription_tier: 'enterprise', // £149/month
      high_volume_user: true,
      cost_tracking_granular: true,
      billing_requirements: {
        detailed_breakdown: true,
        cost_center_allocation: true,
        quarterly_reviews: true
      }
    })

    // Initialize billing services
    tierCalculator = new TierCalculator()
    usageAggregator = new UsageAggregator(mockUsageDatabase)
    invoiceGenerator = new InvoiceGenerator(mockPaymentSystem)
    billingValidator = new BillingAccuracyValidator(
      usageAggregator,
      tierCalculator,
      mockAuditTracker
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Platform AI Billing Accuracy', () => {
    test('should calculate platform tier quotas and overages precisely', async () => {
      const billingScenario = {
        supplierId: photographyStudio.id,
        period: '2024-06',
        tier: 'professional',
        usage: {
          tokens_used: 1350, // 350 over quota of 1000
          requests_made: 450,
          peak_season: true,
          season_multiplier: 1.6
        }
      }

      const accuracyValidation = await billingValidator.validatePlatformBilling(billingScenario)

      // Professional tier: 1000 quota, £0.008 per overage token
      // Base overage: 350 * £0.008 = £2.80
      // Peak season: £2.80 * 1.6 = £4.48
      
      expect(accuracyValidation.quotaCalculation.base_quota).toBe(1000)
      expect(accuracyValidation.quotaCalculation.tokens_over_quota).toBe(350)
      expect(accuracyValidation.costCalculation.base_overage_cost).toBeCloseTo(2.80, 2)
      expect(accuracyValidation.costCalculation.peak_season_cost).toBeCloseTo(4.48, 2)
      expect(accuracyValidation.costCalculation.total_cost).toBeCloseTo(4.48, 2)
      expect(accuracyValidation.accuracy_percentage).toBeGreaterThan(99.9)
    })

    test('should handle tier upgrade mid-billing period accurately', async () => {
      const midPeriodUpgrade = {
        supplierId: photographyStudio.id,
        period: '2024-06',
        tier_changes: [
          {
            date: '2024-06-01',
            tier: 'professional',
            quota: 1000,
            days: 15 // Half month
          },
          {
            date: '2024-06-16', 
            tier: 'scale',
            quota: 2000,
            days: 15 // Half month
          }
        ],
        usage: {
          first_half: 800,  // Professional period
          second_half: 900  // Scale period
        }
      }

      const proRatedBilling = await billingValidator.calculateProRatedBilling(midPeriodUpgrade)

      // First half: 800/1000 - within professional quota = £0
      // Second half: 900/2000 - within scale quota = £0
      expect(proRatedBilling.first_period.cost).toBe(0)
      expect(proRatedBilling.second_period.cost).toBe(0)
      expect(proRatedBilling.total_cost).toBe(0)
      expect(proRatedBilling.proration_accurate).toBe(true)
      expect(proRatedBilling.daily_accuracy).toBeGreaterThan(99.95)
    })

    test('should validate platform billing against actual usage logs', async () => {
      // Mock detailed usage logs
      mockUsageDatabase.getUsageByPeriod.mockResolvedValueOnce({
        total_requests: 387,
        total_tokens: 1247,
        daily_breakdown: Array.from({ length: 30 }, (_, i) => ({
          date: `2024-06-${(i + 1).toString().padStart(2, '0')}`,
          requests: Math.floor(Math.random() * 20) + 5,
          tokens: Math.floor(Math.random() * 50) + 20
        })),
        provider: 'platform'
      })

      const crossValidation = await billingValidator.crossValidateWithLogs({
        supplierId: photographyStudio.id,
        period: '2024-06',
        calculated_bill: {
          tokens: 1247,
          overage_tokens: 247,
          cost: 1.976 // 247 * £0.008
        }
      })

      expect(crossValidation.logs_match_billing).toBe(true)
      expect(crossValidation.token_discrepancy).toBe(0)
      expect(crossValidation.cost_discrepancy).toBeCloseTo(0, 3)
      expect(crossValidation.validation_confidence).toBeGreaterThan(99.9)
    })
  })

  describe('Client AI Billing Accuracy', () => {
    test('should track client OpenAI costs with real-time precision', async () => {
      const clientUsageScenario = {
        supplierId: venueCoordinator.id,
        provider: 'openai',
        period: '2024-06',
        detailed_usage: [
          {
            date: '2024-06-01',
            model: 'gpt-4o-mini',
            input_tokens: 800,
            output_tokens: 200,
            cost: 0.00024 // £0.00015*0.8 + £0.0006*0.2
          },
          {
            date: '2024-06-02', 
            model: 'gpt-4o',
            input_tokens: 500,
            output_tokens: 150,
            cost: 0.00475 // £0.005*0.5 + £0.015*0.15
          }
          // ... more daily usage
        ]
      }

      const clientBillingAccuracy = await billingValidator.validateClientBilling(clientUsageScenario)

      expect(clientBillingAccuracy.cost_calculation_method).toBe('token_level_precision')
      expect(clientBillingAccuracy.daily_accuracy).toBeGreaterThan(99.99)
      expect(clientBillingAccuracy.model_cost_tracking).toBe('accurate')
      expect(clientBillingAccuracy.real_time_validation).toBe(true)
    })

    test('should handle multiple AI provider cost aggregation', async () => {
      const multiProviderBilling = {
        supplierId: venueCoordinator.id,
        period: '2024-06',
        providers: {
          openai: {
            total_cost: 45.67,
            total_tokens: 235000,
            requests: 1240
          },
          anthropic: {
            total_cost: 23.45,
            total_tokens: 95000,
            requests: 380
          }
        }
      }

      const aggregatedAccuracy = await billingValidator.validateMultiProviderBilling(multiProviderBilling)

      expect(aggregatedAccuracy.total_cost).toBeCloseTo(69.12, 2) // £45.67 + £23.45
      expect(aggregatedAccuracy.cost_attribution_accurate).toBe(true)
      expect(aggregatedAccuracy.provider_breakdown_verified).toBe(true)
      expect(aggregatedAccuracy.cross_provider_validation).toBe('passed')
    })

    test('should detect and handle billing anomalies', async () => {
      const anomalyDetection = await billingValidator.detectBillingAnomalies({
        supplierId: weddingPlanner.id,
        current_period: '2024-06',
        usage_pattern: {
          tokens_current: 15000,     // Unusually high
          tokens_average: 4500,      // Normal average
          cost_current: 89.50,       // High cost
          cost_average: 27.30        // Normal cost
        },
        historical_periods: 6
      })

      expect(anomalyDetection.anomaly_detected).toBe(true)
      expect(anomalyDetection.anomaly_type).toBe('usage_spike')
      expect(anomalyDetection.deviation_percentage).toBeGreaterThan(200) // >200% increase
      expect(anomalyDetection.requires_investigation).toBe(true)
      expect(anomalyDetection.auto_validation_triggered).toBe(true)
    })
  })

  describe('Mixed Provider Billing Accuracy', () => {
    test('should accurately bill for platform-to-client migration mid-period', async () => {
      const migrationBilling = {
        supplierId: photographyStudio.id,
        period: '2024-06',
        migration_date: '2024-06-15',
        pre_migration: {
          provider: 'platform',
          tokens: 950,
          days: 14,
          cost: 0 // Within quota
        },
        post_migration: {
          provider: 'client_openai',
          tokens: 850,
          days: 16,
          cost: 0.2125 // OpenAI pricing
        }
      }

      const migrationBillingAccuracy = await billingValidator.validateMigrationBilling(migrationBilling)

      expect(migrationBillingAccuracy.pre_migration_cost).toBe(0)
      expect(migrationBillingAccuracy.post_migration_cost).toBeCloseTo(0.2125, 4)
      expect(migrationBillingAccuracy.total_cost).toBeCloseTo(0.2125, 4)
      expect(migrationBillingAccuracy.migration_cost_tracking).toBe('accurate')
      expect(migrationBillingAccuracy.no_double_billing).toBe(true)
    })

    test('should handle complex billing scenarios with multiple transitions', async () => {
      const complexScenario = {
        supplierId: weddingPlanner.id,
        period: '2024-06',
        transitions: [
          {
            period: '2024-06-01 to 2024-06-10',
            provider: 'platform',
            tokens: 1200,
            tier: 'enterprise',
            quota: 5000
          },
          {
            period: '2024-06-11 to 2024-06-20', 
            provider: 'client_openai',
            tokens: 2000,
            cost: 0.50
          },
          {
            period: '2024-06-21 to 2024-06-30',
            provider: 'platform',
            tokens: 800,
            tier: 'enterprise',
            quota_remaining: 3000
          }
        ]
      }

      const complexBillingValidation = await billingValidator.validateComplexBilling(complexScenario)

      expect(complexBillingValidation.total_transitions).toBe(3)
      expect(complexBillingValidation.billing_continuity).toBe(true)
      expect(complexBillingValidation.no_gaps_or_overlaps).toBe(true)
      expect(complexBillingValidation.cost_accuracy).toBeGreaterThan(99.9)
    })
  })

  describe('Invoice Generation and Validation', () => {
    test('should generate accurate invoices with detailed breakdowns', async () => {
      const invoiceData = {
        supplierId: venueCoordinator.id,
        period: '2024-06',
        subscription: {
          tier: 'scale',
          base_cost: 79.00
        },
        ai_usage: {
          platform_overage: 15.60,
          client_openai: 23.45,
          total_ai_cost: 39.05
        }
      }

      const generatedInvoice = await invoiceGenerator.generateDetailedInvoice(invoiceData)

      expect(generatedInvoice.line_items).toHaveLength(3)
      expect(generatedInvoice.line_items[0]).toMatchObject({
        description: 'Scale Subscription - June 2024',
        amount: 79.00,
        type: 'subscription'
      })
      expect(generatedInvoice.line_items[1]).toMatchObject({
        description: 'Platform AI Overage',
        amount: 15.60,
        type: 'ai_usage'
      })
      expect(generatedInvoice.line_items[2]).toMatchObject({
        description: 'Client AI Usage (OpenAI)',
        amount: 23.45,
        type: 'client_ai'
      })
      expect(generatedInvoice.total_amount).toBeCloseTo(118.05, 2)
      expect(generatedInvoice.tax_calculation.vat_rate).toBe(0.20) // UK VAT
      expect(generatedInvoice.total_with_tax).toBeCloseTo(141.66, 2)
    })

    test('should validate invoice accuracy before payment processing', async () => {
      const invoiceValidation = await billingValidator.validateInvoiceAccuracy({
        invoice_id: 'INV-2024-06-001',
        supplier_id: photographyStudio.id,
        calculated_amounts: {
          subscription: 49.00,
          ai_overage: 4.48,
          subtotal: 53.48,
          vat: 10.70,
          total: 64.18
        },
        usage_verification: true
      })

      expect(invoiceValidation.amounts_verified).toBe(true)
      expect(invoiceValidation.calculations_correct).toBe(true)
      expect(invoiceValidation.usage_matches_billing).toBe(true)
      expect(invoiceValidation.ready_for_payment).toBe(true)
      expect(invoiceValidation.accuracy_score).toBeGreaterThan(99.95)
    })

    test('should handle invoice corrections and refunds accurately', async () => {
      const billingCorrection = {
        original_invoice: 'INV-2024-05-001',
        supplier_id: photographyStudio.id,
        correction_reason: 'billing_calculation_error',
        original_amount: 67.85,
        corrected_amount: 58.20,
        correction_details: {
          platform_overage_corrected: {
            original: 450, // tokens
            corrected: 300, // tokens
            cost_difference: -9.65 // £0.008 * 150 * 1.6 = £1.92 - but includes VAT
          }
        }
      }

      const correctionProcessing = await billingValidator.processBillingCorrection(billingCorrection)

      expect(correctionProcessing.credit_note_generated).toBe(true)
      expect(correctionProcessing.refund_amount).toBeCloseTo(9.65, 2)
      expect(correctionProcessing.correction_accurate).toBe(true)
      expect(correctionProcessing.audit_trail_updated).toBe(true)
      
      // Verify refund calculation
      expect(mockPaymentSystem.handleRefund).toHaveBeenCalledWith({
        amount: 9.65,
        reason: 'billing_calculation_error',
        invoice_id: 'INV-2024-05-001'
      })
    })
  })

  describe('Audit and Compliance', () => {
    test('should maintain comprehensive billing audit trails', async () => {
      const auditTrail = await billingValidator.generateBillingAuditTrail({
        supplierId: weddingPlanner.id,
        period_start: '2024-01-01',
        period_end: '2024-06-30',
        include_calculations: true,
        include_validations: true
      })

      expect(auditTrail.total_billing_events).toBeGreaterThan(0)
      expect(auditTrail.calculation_accuracy_average).toBeGreaterThan(99.9)
      expect(auditTrail.validation_checks_passed).toBeGreaterThan(95)
      expect(auditTrail.discrepancies_resolved).toBe(auditTrail.discrepancies_found)
      
      // Verify audit completeness
      expect(auditTrail.monthly_summaries).toHaveLength(6) // Jan-June
      auditTrail.monthly_summaries.forEach(month => {
        expect(month.accuracy_verified).toBe(true)
        expect(month.invoice_matched_usage).toBe(true)
      })
    })

    test('should support financial compliance reporting', async () => {
      const complianceReport = await billingValidator.generateComplianceReport({
        period: 'Q2-2024',
        suppliers: [photographyStudio.id, venueCoordinator.id, weddingPlanner.id],
        compliance_requirements: ['VAT_accounting', 'revenue_recognition', 'audit_readiness']
      })

      expect(complianceReport.vat_accounting.compliant).toBe(true)
      expect(complianceReport.revenue_recognition.method).toBe('accrual')
      expect(complianceReport.audit_readiness.score).toBeGreaterThan(95)
      expect(complianceReport.total_revenue_accuracy).toBeGreaterThan(99.99)
      
      // Verify regulatory compliance
      expect(complianceReport.regulatory_compliance).toMatchObject({
        uk_vat: 'compliant',
        gdpr_billing_data: 'compliant',
        financial_reporting: 'ready'
      })
    })

    test('should detect and prevent billing fraud', async () => {
      const fraudDetection = await billingValidator.detectBillingFraud({
        supplierId: 'suspicious-supplier-001',
        period: '2024-06',
        suspicious_patterns: [
          'usage_manipulation',
          'tier_gaming',
          'timestamp_fraud'
        ],
        risk_threshold: 0.7
      })

      expect(fraudDetection.fraud_risk_score).toBeDefined()
      expect(fraudDetection.patterns_detected).toBeInstanceOf(Array)
      expect(fraudDetection.investigation_triggered).toBe(
        fraudDetection.fraud_risk_score > 0.7
      )
      
      if (fraudDetection.investigation_triggered) {
        expect(fraudDetection.account_flagged).toBe(true)
        expect(fraudDetection.manual_review_required).toBe(true)
      }
    })
  })

  describe('Performance and Scalability', () => {
    test('should calculate billing for high-volume enterprise accounts efficiently', async () => {
      const startTime = Date.now()

      const highVolumeCalculation = await billingValidator.calculateBillingHighVolume({
        supplierId: weddingPlanner.id,
        period: '2024-06',
        usage_records: 50000, // 50k usage records
        provider_breakdown: {
          platform: 25000,
          client_openai: 20000,
          client_anthropic: 5000
        }
      })

      const calculationTime = Date.now() - startTime

      expect(calculationTime).toBeLessThan(5000) // <5s for 50k records
      expect(highVolumeCalculation.accuracy_maintained).toBe(true)
      expect(highVolumeCalculation.performance_acceptable).toBe(true)
      expect(highVolumeCalculation.memory_usage_optimized).toBe(true)
    })

    test('should handle concurrent billing calculations without conflicts', async () => {
      const concurrentCalculations = Array.from({ length: 20 }, (_, i) =>
        billingValidator.validatePlatformBilling({
          supplierId: `concurrent-supplier-${i}`,
          period: '2024-06',
          tier: 'professional',
          usage: { tokens_used: 1100 + i * 10 }
        })
      )

      const results = await Promise.all(concurrentCalculations)

      expect(results).toHaveLength(20)
      results.forEach((result, index) => {
        expect(result.accuracy_percentage).toBeGreaterThan(99.9)
        expect(result.quotaCalculation.tokens_over_quota).toBe(100 + index * 10)
      })
    })
  })
})