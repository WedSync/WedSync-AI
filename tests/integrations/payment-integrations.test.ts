/**
 * WS-165: Payment Integration Services Unit Tests
 * Comprehensive unit testing for payment calendar integration services
 * Team C Test Implementation - >85% Coverage Target
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { VendorPaymentSyncService } from '../../src/lib/integrations/vendor-payment-sync';
import { CashFlowCalculatorService } from '../../src/lib/integrations/cash-flow-calculator';
import { BudgetCategoryIntegration } from '../../src/lib/integrations/budget-integration';
import { 
  IntegrationConfig, 
  IntegrationCredentials,
  ErrorCategory
} from '../../src/types/integrations';

// Mock external dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      contains: jest.fn().mockReturnThis(),
    })),
    raw: jest.fn()
  }))
}));

jest.mock('../../src/lib/security/financial-api-security', () => ({
  financialApiSecurity: {
    makeSecureApiRequest: jest.fn()
  }
}));

// Test fixtures
const mockIntegrationConfig: IntegrationConfig = {
  apiUrl: 'https://api.test.com',
  timeout: 5000,
  retryAttempts: 3,
  rateLimitPerMinute: 60
};

const mockCredentials: IntegrationCredentials = {
  userId: 'test-user-123',
  organizationId: 'test-org-456',
  provider: 'test-provider',
  apiKey: 'test-api-key',
  accessToken: 'test-access-token'
};

const mockWeddingId = 'wedding-123';
const mockVendorId = 'vendor-456';

describe('VendorPaymentSyncService', () => {
  let vendorPaymentService: VendorPaymentSyncService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    vendorPaymentService = new VendorPaymentSyncService(mockIntegrationConfig, mockCredentials);
    
    // Setup mock Supabase responses
    const mockSupabaseInstance = require('@supabase/supabase-js').createClient();
    mockSupabase = mockSupabaseInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with valid config and credentials', () => {
      expect(() => {
        new VendorPaymentSyncService(mockIntegrationConfig, mockCredentials);
      }).not.toThrow();
    });

    test('should throw error with invalid config', () => {
      const invalidConfig = { ...mockIntegrationConfig, apiUrl: 'invalid-url' };
      expect(() => {
        new VendorPaymentSyncService(invalidConfig, mockCredentials);
      }).toThrow('Invalid API URL provided');
    });

    test('should throw error with missing credentials', () => {
      const invalidCredentials = { ...mockCredentials, apiKey: '' };
      expect(() => {
        new VendorPaymentSyncService(mockIntegrationConfig, invalidCredentials);
      }).toThrow('API key is required');
    });
  });

  describe('validateConnection', () => {
    test('should return true for successful database connection', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ error: null });
      
      const result = await vendorPaymentService.validateConnection();
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('vendor_payment_sync');
    });

    test('should return false for failed database connection', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ error: new Error('Connection failed') });
      
      const result = await vendorPaymentService.validateConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('syncVendorPayments', () => {
    const mockVendors = [
      {
        id: mockVendorId,
        name: 'Test Vendor',
        contact_email: 'vendor@test.com',
        integration_config: {
          adapter_name: 'QuickBooks API',
          credentials: {}
        }
      }
    ];

    beforeEach(() => {
      // Mock successful vendors fetch
      mockSupabase.from().select().eq().in().not.mockResolvedValue({
        data: mockVendors,
        error: null
      });
    });

    test('should sync vendors successfully', async () => {
      // Mock successful payment data fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          schedule: [{
            id: 'payment-1',
            description: 'Venue deposit',
            amount: 5000,
            due_date: '2025-03-15T00:00:00Z',
            status: 'pending'
          }],
          total_amount: 5000,
          currency: 'USD',
          status: 'pending'
        })
      }) as jest.Mock;

      // Mock successful database saves
      mockSupabase.from().upsert.mockResolvedValue({ error: null });
      mockSupabase.from().insert.mockResolvedValue({ error: null });

      const result = await vendorPaymentService.syncVendorPayments(mockWeddingId);

      expect(result.success).toBe(true);
      expect(result.syncedVendors).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: mockVendorId,
          wedding_id: mockWeddingId
        })
      );
    });

    test('should handle vendor sync failures gracefully', async () => {
      // Mock API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable'));

      const result = await vendorPaymentService.syncVendorPayments(mockWeddingId);

      expect(result.success).toBe(false);
      expect(result.syncedVendors).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].vendorId).toBe(mockVendorId);
    });

    test('should handle empty vendor list', async () => {
      mockSupabase.from().select().eq().in().not.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await vendorPaymentService.syncVendorPayments(mockWeddingId);

      expect(result.success).toBe(true);
      expect(result.syncedVendors).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle database fetch errors', async () => {
      mockSupabase.from().select().eq().in().not.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const result = await vendorPaymentService.syncVendorPayments(mockWeddingId);

      expect(result.success).toBe(false);
      expect(result.syncedVendors).toBe(0);
    });
  });

  describe('processWebhook', () => {
    const mockWebhookPayload = {
      vendorId: mockVendorId,
      eventType: 'payment_received' as const,
      data: {
        payment_id: 'payment-123',
        amount: 1000
      },
      timestamp: new Date()
    };

    test('should process payment received webhook', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      const result = await vendorPaymentService.processWebhook(mockWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.message).toBe('Payment confirmation processed');
    });

    test('should process payment failed webhook', async () => {
      const failedPayload = {
        ...mockWebhookPayload,
        eventType: 'payment_failed' as const
      };

      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      const result = await vendorPaymentService.processWebhook(failedPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.message).toBe('Payment failure processed');
    });

    test('should handle unsupported event types', async () => {
      const unsupportedPayload = {
        ...mockWebhookPayload,
        eventType: 'unsupported_event' as any
      };

      const result = await vendorPaymentService.processWebhook(unsupportedPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
      expect(result.message).toContain('Unsupported event type');
    });

    test('should handle webhook processing errors', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({ error: new Error('Update failed') });

      const result = await vendorPaymentService.processWebhook(mockWebhookPayload);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
    });
  });

  describe('getVendorPaymentSummary', () => {
    const mockVendorPayments = [
      {
        vendor_id: 'vendor-1',
        wedding_id: mockWeddingId,
        total_amount: 5000,
        payment_schedule: [
          {
            id: 'payment-1',
            amount: 2500,
            status: 'paid',
            dueDate: '2025-02-01T00:00:00Z'
          },
          {
            id: 'payment-2',
            amount: 2500,
            status: 'pending',
            dueDate: '2025-03-15T00:00:00Z'
          }
        ]
      }
    ];

    test('should return payment summary', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockVendorPayments,
        error: null
      });

      const result = await vendorPaymentService.getVendorPaymentSummary(mockWeddingId);

      expect(result.totalVendors).toBe(1);
      expect(result.totalAmount).toBe(5000);
      expect(result.paidAmount).toBe(2500);
      expect(result.upcomingPayments).toHaveLength(1);
      expect(result.syncStatus).toBe('healthy');
    });

    test('should handle empty payment data', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await vendorPaymentService.getVendorPaymentSummary(mockWeddingId);

      expect(result.totalVendors).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.syncStatus).toBe('no_data');
    });
  });
});

describe('CashFlowCalculatorService', () => {
  let cashFlowService: CashFlowCalculatorService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cashFlowService = new CashFlowCalculatorService();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCashFlowAnalysis', () => {
    const mockWeddingData = {
      wedding_date: '2025-06-15T00:00:00Z',
      total_budget: 50000,
      currency: 'USD'
    };

    const mockBudgetCategories = [
      {
        id: 'cat-1',
        category: 'venue',
        category_display_name: 'Venue',
        total_budget: 20000,
        spent_amount: 10000,
        pending_amount: 5000,
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'cat-2',
        category: 'catering',
        category_display_name: 'Catering',
        total_budget: 15000,
        spent_amount: 0,
        pending_amount: 0,
        created_at: '2024-01-15T00:00:00Z'
      }
    ];

    const mockPaymentSchedules = [
      {
        vendor_id: 'vendor-1',
        payment_schedule: [
          {
            id: 'payment-1',
            amount: 5000,
            dueDate: '2025-03-15T00:00:00Z',
            status: 'pending'
          }
        ]
      }
    ];

    beforeEach(() => {
      // Mock wedding data fetch
      mockSupabase.from().select().eq().single.mockImplementation((table) => {
        if (table === 'weddings') {
          return Promise.resolve({ data: mockWeddingData, error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      // Mock budget categories fetch
      mockSupabase.from().select().eq.mockImplementation(() => ({
        data: mockBudgetCategories,
        error: null
      }));

      // Mock payment schedules - second call
      mockSupabase.from().select().eq.mockImplementationOnce(() => ({
        data: mockBudgetCategories,
        error: null
      })).mockImplementationOnce(() => ({
        data: mockPaymentSchedules,
        error: null
      }));

      // Mock analysis save
      mockSupabase.from().upsert().eq.mockResolvedValue({ error: null });
    });

    test('should generate comprehensive cash flow analysis', async () => {
      const result = await cashFlowService.generateCashFlowAnalysis(mockWeddingId);

      expect(result.weddingId).toBe(mockWeddingId);
      expect(result.totalBudget).toBe(50000);
      expect(result.totalSpent).toBe(10000);
      expect(result.totalPending).toBe(5000);
      expect(result.projectedBalance).toBe(35000);
      expect(result.riskLevel).toBeTruthy();
      expect(result.projections).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.cashFlowGaps).toBeInstanceOf(Array);
    });

    test('should handle wedding not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Wedding not found')
      });

      await expect(cashFlowService.generateCashFlowAnalysis(mockWeddingId))
        .rejects.toThrow('Wedding not found');
    });

    test('should calculate risk level correctly for high-risk scenarios', async () => {
      const highRiskBudget = [
        {
          ...mockBudgetCategories[0],
          spent_amount: 40000,
          pending_amount: 15000
        }
      ];

      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: highRiskBudget,
        error: null
      });

      const result = await cashFlowService.generateCashFlowAnalysis(mockWeddingId);

      expect(result.riskLevel).toBe('critical');
      expect(result.recommendations.some(r => r.type === 'increase_budget')).toBe(true);
    });

    test('should generate appropriate recommendations', async () => {
      const result = await cashFlowService.generateCashFlowAnalysis(mockWeddingId);

      // Should have recommendations based on budget status
      expect(result.recommendations).toBeInstanceOf(Array);
      
      // Check for emergency fund recommendation if balance is low
      if (result.projectedBalance < result.totalBudget * 0.1) {
        expect(result.recommendations.some(r => r.type === 'emergency_fund')).toBe(true);
      }
    });
  });

  describe('optimizePaymentTiming', () => {
    test('should suggest payment timing optimizations', async () => {
      // Mock cash flow analysis
      const mockAnalysis = {
        weddingId: mockWeddingId,
        projections: [
          {
            date: new Date('2025-02-01'),
            cumulativeBalance: 10000,
            projectedExpenses: 2000,
            projectedIncome: 0,
            budgetCategory: 'overall',
            confidenceLevel: 'high' as const,
            riskFactors: []
          },
          {
            date: new Date('2025-03-01'),
            cumulativeBalance: 25000,
            projectedExpenses: 1000,
            projectedIncome: 0,
            budgetCategory: 'overall',
            confidenceLevel: 'high' as const,
            riskFactors: []
          }
        ]
      };

      jest.spyOn(cashFlowService, 'generateCashFlowAnalysis')
        .mockResolvedValue(mockAnalysis as any);

      const mockPaymentSchedules = [
        {
          payment_schedule: [
            {
              id: 'payment-1',
              amount: 15000,
              dueDate: new Date('2025-02-15'),
              status: 'pending'
            }
          ]
        }
      ];

      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockPaymentSchedules,
        error: null
      });

      const result = await cashFlowService.optimizePaymentTiming(mockWeddingId);

      expect(result).toBeInstanceOf(Array);
      // Should suggest moving payment to month with better balance
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('originalDueDate');
        expect(result[0]).toHaveProperty('suggestedDueDate');
        expect(result[0]).toHaveProperty('cashFlowImprovement');
      }
    });

    test('should handle optimization analysis failures', async () => {
      jest.spyOn(cashFlowService, 'generateCashFlowAnalysis')
        .mockRejectedValue(new Error('Analysis failed'));

      const result = await cashFlowService.optimizePaymentTiming(mockWeddingId);

      expect(result).toEqual([]);
    });
  });
});

describe('BudgetCategoryIntegration', () => {
  let budgetIntegration: BudgetCategoryIntegration;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    budgetIntegration = new BudgetCategoryIntegration();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('updateBudgetCalculations', () => {
    const mockExpenseData = {
      categoryId: 'cat-123',
      amount: 1000,
      status: 'confirmed' as const,
      transactionId: 'txn-456'
    };

    const mockCategory = {
      id: 'cat-123',
      wedding_id: mockWeddingId,
      spent_amount: 5000,
      pending_amount: 2000,
      total_budget: 10000
    };

    beforeEach(() => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...mockCategory, spent_amount: 6000 },
        error: null
      });
    });

    test('should update budget calculations for confirmed expense', async () => {
      const result = await budgetIntegration.updateBudgetCalculations(
        mockWeddingId,
        mockExpenseData
      );

      expect(result.success).toBe(true);
      expect(result.updatedCategory).toBeTruthy();
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          spent_amount: 6000 // 5000 + 1000
        })
      );
    });

    test('should update budget calculations for pending expense', async () => {
      const pendingExpenseData = {
        ...mockExpenseData,
        status: 'pending' as const
      };

      const result = await budgetIntegration.updateBudgetCalculations(
        mockWeddingId,
        pendingExpenseData
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_amount: 3000 // 2000 + 1000
        })
      );
    });

    test('should handle cancelled expenses', async () => {
      const cancelledExpenseData = {
        ...mockExpenseData,
        status: 'cancelled' as const
      };

      const result = await budgetIntegration.updateBudgetCalculations(
        mockWeddingId,
        cancelledExpenseData
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_amount: 1000 // max(0, 2000 - 1000)
        })
      );
    });

    test('should handle missing category', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Not found')
      });

      const result = await budgetIntegration.updateBudgetCalculations(
        mockWeddingId,
        mockExpenseData
      );

      expect(result.success).toBe(false);
    });
  });

  describe('categorizeExpense', () => {
    test('should categorize venue expenses correctly', async () => {
      const result = await budgetIntegration.categorizeExpense(
        'Wedding venue deposit payment',
        5000,
        'Grand Ballroom Hotel'
      );

      expect(result.category).toBe('venue');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.suggestedVendors).toBeInstanceOf(Array);
      expect(result.priceRange).toHaveProperty('min');
      expect(result.priceRange).toHaveProperty('max');
    });

    test('should categorize photography expenses correctly', async () => {
      const result = await budgetIntegration.categorizeExpense(
        'Wedding photographer booking fee',
        1500,
        'Artistic Wedding Photos LLC'
      );

      expect(result.category).toBe('photography');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should handle unclear descriptions with low confidence', async () => {
      const result = await budgetIntegration.categorizeExpense(
        'Random expense',
        100,
        'Unknown Vendor'
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.category).toBeTruthy();
    });

    test('should handle categorization errors gracefully', async () => {
      // Force an error by mocking internal method failure
      jest.spyOn(budgetIntegration as any, 'calculateCategoryScores')
        .mockRejectedValue(new Error('Categorization failed'));

      const result = await budgetIntegration.categorizeExpense(
        'Test expense',
        1000
      );

      expect(result.category).toBe('miscellaneous');
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('syncBankingTransactions', () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        accountId: 'account-123',
        amount: -1500.00,
        currency: 'USD',
        description: 'PHOTOGRAPHER BOOKING FEE',
        date: new Date('2025-01-15'),
        merchantName: 'Artistic Photos LLC',
        pending: false
      },
      {
        id: 'txn-2',
        accountId: 'account-123',
        amount: -50.00,
        currency: 'USD',
        description: 'COFFEE SHOP CHARGE',
        date: new Date('2025-01-16'),
        merchantName: 'Local Coffee',
        pending: false
      }
    ];

    beforeEach(() => {
      // Mock financial API security
      const mockFinancialSecurity = require('../../src/lib/security/financial-api-security');
      mockFinancialSecurity.financialApiSecurity.makeSecureApiRequest.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions
        }
      });

      // Mock existing transaction check
      mockSupabase.from().select().eq().contains().limit.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock expense insertion
      mockSupabase.from().insert.mockResolvedValue({ error: null });
    });

    test('should sync banking transactions successfully', async () => {
      const result = await budgetIntegration.syncBankingTransactions(
        mockWeddingId,
        'account-123',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.importedTransactions).toBeGreaterThan(0);
      expect(mockFinancialSecurity.financialApiSecurity.makeSecureApiRequest)
        .toHaveBeenCalledWith('plaid', '/transactions/get', 'POST', expect.any(Object), expect.any(Object));
    });

    test('should handle API failures', async () => {
      const mockFinancialSecurity = require('../../src/lib/security/financial-api-security');
      mockFinancialSecurity.financialApiSecurity.makeSecureApiRequest.mockResolvedValue({
        success: false,
        data: null
      });

      const result = await budgetIntegration.syncBankingTransactions(
        mockWeddingId,
        'account-123',
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.importedTransactions).toBe(0);
    });

    test('should skip already imported transactions', async () => {
      // Mock existing transaction found
      mockSupabase.from().select().eq().contains().limit
        .mockResolvedValueOnce({ data: [{ id: 'existing' }], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await budgetIntegration.syncBankingTransactions(
        mockWeddingId,
        'account-123',
        'user-123'
      );

      expect(result.success).toBe(true);
      // Should import 1 less transaction due to existing transaction
      expect(result.importedTransactions).toBe(1);
    });
  });
});

// Performance and stress tests
describe('Performance Tests', () => {
  let vendorPaymentService: VendorPaymentSyncService;

  beforeEach(() => {
    vendorPaymentService = new VendorPaymentSyncService(mockIntegrationConfig, mockCredentials);
  });

  test('should handle large vendor lists efficiently', async () => {
    // Mock 100 vendors
    const largeMockVendors = Array.from({ length: 100 }, (_, i) => ({
      id: `vendor-${i}`,
      name: `Test Vendor ${i}`,
      contact_email: `vendor${i}@test.com`,
      integration_config: {
        adapter_name: 'QuickBooks API',
        credentials: {}
      }
    }));

    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.from().select().eq().in().not.mockResolvedValue({
      data: largeMockVendors,
      error: null
    });

    // Mock successful API responses
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        schedule: [],
        total_amount: 0,
        currency: 'USD',
        status: 'pending'
      })
    });

    mockSupabase.from().upsert.mockResolvedValue({ error: null });
    mockSupabase.from().insert.mockResolvedValue({ error: null });

    const startTime = Date.now();
    const result = await vendorPaymentService.syncVendorPayments(mockWeddingId);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(result.syncedVendors).toBe(100);
    expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle rate limiting correctly', async () => {
    const requests: Promise<any>[] = [];
    
    // Create 70 concurrent requests (above rate limit of 60/minute)
    for (let i = 0; i < 70; i++) {
      requests.push(vendorPaymentService.validateConnection());
    }

    // Some requests should be rate limited
    const results = await Promise.allSettled(requests);
    const rateLimitedCount = results.filter(r => 
      r.status === 'rejected' && 
      r.reason.message?.includes('Rate limit exceeded')
    ).length;

    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});

// Error handling and edge cases
describe('Error Handling', () => {
  let vendorPaymentService: VendorPaymentSyncService;

  beforeEach(() => {
    vendorPaymentService = new VendorPaymentSyncService(mockIntegrationConfig, mockCredentials);
  });

  test('should handle network timeouts', async () => {
    // Mock slow network response
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({})
        }), 6000) // Longer than timeout
      )
    );

    const result = await vendorPaymentService.syncVendorPayments(mockWeddingId, [mockVendorId]);

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.error.includes('timeout'))).toBe(true);
  });

  test('should sanitize error messages', async () => {
    const errorWithSecrets = new Error('API failed with key=sk-1234567890abcdef and token=bearer-xyz');
    
    const sanitizedError = (vendorPaymentService as any).sanitizeError(errorWithSecrets);

    expect(sanitizedError.message).not.toContain('sk-1234567890abcdef');
    expect(sanitizedError.message).not.toContain('bearer-xyz');
    expect(sanitizedError.message).toContain('***');
  });
});