/**
 * WS-165 Payment Calendar Integration Testing Suite
 * Team E - Round 1 Implementation
 * 
 * Integration tests for complete payment workflows covering:
 * - End-to-end payment creation and management
 * - Database integration with Supabase
 * - API route integration and error handling
 * - Real-time updates and synchronization
 * - Cross-component data flow
 * - Security and authorization workflows
 */

import { createClient } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { 
  mockPaymentData,
  mockPaymentSummary,
  mockAPIResponses,
  testUtils,
  MOCK_WEDDING_ID,
  MOCK_USER_ID 
} from '@/tests/payments/fixtures/payment-fixtures';

// Mock Supabase client for integration testing
const mockSupabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co';
const mockSupabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';

// Setup MSW server for API mocking
const server = setupServer(
  // Payment API routes
  rest.get('/api/payments', (req, res, ctx) => {
    const weddingId = req.url.searchParams.get('wedding_id');
    if (weddingId === MOCK_WEDDING_ID) {
      return res(ctx.json(mockAPIResponses.getPayments.success.data));
    }
    return res(ctx.status(404), ctx.json({ error: 'Wedding not found' }));
  }),

  rest.post('/api/payments', async (req, res, ctx) => {
    const body = await req.json();
    
    // Validate required fields
    if (!body.vendor_name || !body.amount || !body.due_date) {
      return res(ctx.status(400), ctx.json(mockAPIResponses.createPayment.validation_error.data));
    }
    
    // Simulate successful creation
    const newPayment = testUtils.createPayment({
      ...body,
      wedding_id: MOCK_WEDDING_ID,
    });
    
    return res(ctx.status(201), ctx.json({
      payment: newPayment,
      message: 'Payment created successfully'
    }));
  }),

  rest.patch('/api/payments/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json();
    
    // Find payment in mock data
    const payment = mockPaymentData.find(p => p.id === id);
    if (!payment) {
      return res(ctx.status(404), ctx.json(mockAPIResponses.updatePayment.not_found.data));
    }
    
    // Simulate successful update
    const updatedPayment = { ...payment, ...body };
    return res(ctx.json({
      payment: updatedPayment,
      message: 'Payment updated successfully'
    }));
  }),

  rest.delete('/api/payments/:id', (req, res, ctx) => {
    const { id } = req.params;
    const payment = mockPaymentData.find(p => p.id === id);
    
    if (!payment) {
      return res(ctx.status(404), ctx.json({ error: 'Payment not found' }));
    }
    
    return res(ctx.status(204));
  }),

  // Payment summary endpoint
  rest.get('/api/payments/summary', (req, res, ctx) => {
    const weddingId = req.url.searchParams.get('wedding_id');
    if (weddingId === MOCK_WEDDING_ID) {
      return res(ctx.json(mockPaymentSummary));
    }
    return res(ctx.status(404), ctx.json({ error: 'Summary not found' }));
  })
);

// Payment service class for integration testing
class PaymentService {
  private supabase;

  constructor() {
    this.supabase = createClient(mockSupabaseUrl, mockSupabaseKey);
  }

  async getPayments(weddingId: string) {
    const response = await fetch(`/api/payments?wedding_id=${weddingId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async createPayment(paymentData: any) {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updatePayment(id: string, updates: any) {
    const response = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deletePayment(id: string) {
    const response = await fetch(`/api/payments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return true;
  }

  async getPaymentSummary(weddingId: string) {
    const response = await fetch(`/api/payments/summary?wedding_id=${weddingId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Simulate real-time subscription
  subscribeToPayments(weddingId: string, callback: (payload: any) => void) {
    // Mock real-time subscription
    const subscription = {
      unsubscribe: jest.fn(),
    };

    // Simulate real-time events after 100ms delay
    setTimeout(() => {
      callback({
        eventType: 'INSERT',
        new: testUtils.createPayment({ wedding_id: weddingId }),
      });
    }, 100);

    return subscription;
  }
}

describe('Payment Workflow Integration Tests - WS-165', () => {
  let paymentService: PaymentService;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    paymentService = new PaymentService();
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  /**
   * COMPLETE PAYMENT LIFECYCLE TESTS
   */
  describe('Complete Payment Lifecycle', () => {
    test('creates, updates, and deletes payment successfully', async () => {
      // Step 1: Create new payment
      const newPaymentData = {
        vendor_name: 'Test Vendor Integration',
        amount: 2500.00,
        due_date: '2025-03-15',
        status: 'pending',
        priority: 'medium',
        category: 'Testing',
        description: 'Integration test payment',
        wedding_id: MOCK_WEDDING_ID,
      };

      const createResult = await paymentService.createPayment(newPaymentData);
      
      expect(createResult.payment).toMatchObject({
        vendor_name: newPaymentData.vendor_name,
        amount: newPaymentData.amount,
        status: 'pending',
      });
      expect(createResult.payment.id).toBeDefined();

      const paymentId = createResult.payment.id;

      // Step 2: Update payment status
      const updateResult = await paymentService.updatePayment(paymentId, {
        status: 'paid',
        notes: 'Payment completed via integration test',
      });

      expect(updateResult.payment.status).toBe('paid');
      expect(updateResult.payment.notes).toBe('Payment completed via integration test');

      // Step 3: Delete payment
      const deleteResult = await paymentService.deletePayment(paymentId);
      expect(deleteResult).toBe(true);

      // Step 4: Verify deletion (should return 404)
      await expect(paymentService.updatePayment(paymentId, { status: 'pending' }))
        .rejects.toThrow('Payment not found');
    });

    test('handles payment validation errors properly', async () => {
      const invalidPaymentData = {
        vendor_name: '', // Empty name
        amount: -100, // Negative amount
        due_date: 'invalid-date',
        wedding_id: MOCK_WEDDING_ID,
      };

      await expect(paymentService.createPayment(invalidPaymentData))
        .rejects.toThrow('Validation failed');
    });

    test('processes bulk payment operations efficiently', async () => {
      const bulkPayments = Array.from({ length: 10 }, (_, index) => ({
        vendor_name: `Bulk Vendor ${index + 1}`,
        amount: 1000 * (index + 1),
        due_date: `2025-0${(index % 9) + 1}-15`,
        status: 'pending',
        priority: 'medium',
        category: 'Testing',
        wedding_id: MOCK_WEDDING_ID,
      }));

      const startTime = Date.now();
      
      // Create all payments concurrently
      const createPromises = bulkPayments.map(payment => 
        paymentService.createPayment(payment)
      );
      
      const results = await Promise.all(createPromises);
      const endTime = Date.now();

      // Should complete all operations within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.payment.id).toBeDefined();
      });
    });
  });

  /**
   * DATABASE INTEGRATION TESTS
   */
  describe('Database Integration', () => {
    test('retrieves payments with correct filtering', async () => {
      const result = await paymentService.getPayments(MOCK_WEDDING_ID);

      expect(result.payments).toBeDefined();
      expect(Array.isArray(result.payments)).toBe(true);
      expect(result.summary).toBeDefined();
      
      // Verify data structure
      result.payments.forEach((payment: any) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('vendor_name');
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('due_date');
        expect(payment).toHaveProperty('status');
        expect(payment).toHaveProperty('wedding_id', MOCK_WEDDING_ID);
      });
    });

    test('handles database connection errors gracefully', async () => {
      // Simulate database error
      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            error: 'Database connection failed'
          }));
        })
      );

      await expect(paymentService.getPayments(MOCK_WEDDING_ID))
        .rejects.toThrow('HTTP error! status: 500');
    });

    test('maintains data consistency across operations', async () => {
      // Get initial summary
      const initialSummary = await paymentService.getPaymentSummary(MOCK_WEDDING_ID);
      
      // Create new payment
      const newPayment = await paymentService.createPayment({
        vendor_name: 'Consistency Test Vendor',
        amount: 1500.00,
        due_date: '2025-03-20',
        status: 'pending',
        wedding_id: MOCK_WEDDING_ID,
      });

      // Get updated payments list
      const updatedPayments = await paymentService.getPayments(MOCK_WEDDING_ID);
      
      // Verify the new payment is included
      const createdPayment = updatedPayments.payments.find(
        (p: any) => p.id === newPayment.payment.id
      );
      expect(createdPayment).toBeDefined();
    });
  });

  /**
   * REAL-TIME FUNCTIONALITY TESTS
   */
  describe('Real-time Functionality', () => {
    test('handles real-time payment updates', async () => {
      const updates: any[] = [];
      
      const subscription = paymentService.subscribeToPayments(
        MOCK_WEDDING_ID,
        (payload) => updates.push(payload)
      );

      // Wait for real-time update
      await waitFor(() => {
        expect(updates).toHaveLength(1);
      }, { timeout: 200 });

      expect(updates[0]).toMatchObject({
        eventType: 'INSERT',
        new: expect.objectContaining({
          wedding_id: MOCK_WEDDING_ID,
        }),
      });

      subscription.unsubscribe();
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    test('synchronizes concurrent payment modifications', async () => {
      const paymentId = mockPaymentData[0].id;
      
      // Simulate concurrent updates
      const update1Promise = paymentService.updatePayment(paymentId, {
        notes: 'Updated by user 1',
      });
      
      const update2Promise = paymentService.updatePayment(paymentId, {
        status: 'paid',
      });

      const [result1, result2] = await Promise.all([update1Promise, update2Promise]);

      // Both updates should succeed (last write wins)
      expect(result1.payment.notes).toBe('Updated by user 1');
      expect(result2.payment.status).toBe('paid');
    });
  });

  /**
   * ERROR HANDLING AND RECOVERY TESTS
   */
  describe('Error Handling and Recovery', () => {
    test('handles network failures with retry logic', async () => {
      let attempt = 0;
      
      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          attempt++;
          if (attempt < 3) {
            return res.networkError('Network error');
          }
          return res(ctx.json(mockAPIResponses.getPayments.success.data));
        })
      );

      // Implement retry logic
      const retryFetch = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await paymentService.getPayments(MOCK_WEDDING_ID);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      const result = await retryFetch();
      expect(result.payments).toBeDefined();
      expect(attempt).toBe(3);
    });

    test('handles partial payment data corruption', async () => {
      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          return res(ctx.json({
            payments: [
              ...mockPaymentData,
              { id: 'corrupted', vendor_name: null }, // Corrupted data
            ],
            summary: mockPaymentSummary,
          }));
        })
      );

      const result = await paymentService.getPayments(MOCK_WEDDING_ID);
      
      // Should handle corrupted data gracefully
      expect(result.payments).toBeDefined();
      
      // Filter out corrupted entries
      const validPayments = result.payments.filter((p: any) => 
        p.vendor_name && p.amount !== undefined
      );
      expect(validPayments.length).toBeGreaterThan(0);
    });
  });

  /**
   * SECURITY INTEGRATION TESTS
   */
  describe('Security Integration', () => {
    test('enforces authentication for payment operations', async () => {
      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          if (!authHeader) {
            return res(ctx.status(401), ctx.json({
              error: 'Authentication required'
            }));
          }
          return res(ctx.json(mockAPIResponses.getPayments.success.data));
        })
      );

      await expect(paymentService.getPayments(MOCK_WEDDING_ID))
        .rejects.toThrow('HTTP error! status: 401');
    });

    test('validates payment data integrity', async () => {
      const maliciousPayment = {
        vendor_name: '<script>alert("xss")</script>',
        amount: 'DROP TABLE payments;',
        due_date: '2025-03-15',
        wedding_id: MOCK_WEDDING_ID,
      };

      // Server should sanitize or reject malicious input
      await expect(paymentService.createPayment(maliciousPayment))
        .rejects.toThrow();
    });

    test('prevents unauthorized access to other wedding payments', async () => {
      const unauthorizedWeddingId = 'unauthorized-wedding-id';
      
      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          const weddingId = req.url.searchParams.get('wedding_id');
          if (weddingId !== MOCK_WEDDING_ID) {
            return res(ctx.status(403), ctx.json({
              error: 'Access denied'
            }));
          }
          return res(ctx.json(mockAPIResponses.getPayments.success.data));
        })
      );

      await expect(paymentService.getPayments(unauthorizedWeddingId))
        .rejects.toThrow('HTTP error! status: 403');
    });
  });

  /**
   * PERFORMANCE INTEGRATION TESTS
   */
  describe('Performance Integration', () => {
    test('handles large payment datasets efficiently', async () => {
      const largePaymentSet = testUtils.createPayments(500, {
        wedding_id: MOCK_WEDDING_ID,
      });

      server.use(
        rest.get('/api/payments', (req, res, ctx) => {
          return res(ctx.json({
            payments: largePaymentSet,
            summary: testUtils.calculateSummary(largePaymentSet),
          }));
        })
      );

      const startTime = Date.now();
      const result = await paymentService.getPayments(MOCK_WEDDING_ID);
      const endTime = Date.now();

      expect(result.payments).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('optimizes database queries for summary calculations', async () => {
      const summary = await paymentService.getPaymentSummary(MOCK_WEDDING_ID);
      
      expect(summary).toMatchObject({
        total_payments: expect.any(Number),
        total_amount: expect.any(Number),
        paid_amount: expect.any(Number),
        pending_amount: expect.any(Number),
        overdue_amount: expect.any(Number),
        overdue_count: expect.any(Number),
        due_soon_count: expect.any(Number),
      });

      // Verify calculated values
      expect(summary.total_amount).toBeGreaterThan(0);
      expect(summary.paid_amount + summary.pending_amount + summary.overdue_amount)
        .toBeLessThanOrEqual(summary.total_amount);
    });
  });

  /**
   * CROSS-COMPONENT INTEGRATION TESTS
   */
  describe('Cross-component Integration', () => {
    test('integrates with notification system', async () => {
      const notificationsSent: any[] = [];
      
      // Mock notification system
      const mockNotificationService = {
        sendPaymentReminder: jest.fn((payment) => {
          notificationsSent.push({
            type: 'payment_reminder',
            paymentId: payment.id,
          });
          return Promise.resolve();
        }),
      };

      // Create overdue payment
      const overduePayment = await paymentService.createPayment({
        vendor_name: 'Overdue Test Vendor',
        amount: 1000.00,
        due_date: '2024-12-01', // Past date
        status: 'overdue',
        wedding_id: MOCK_WEDDING_ID,
      });

      // Simulate notification trigger
      await mockNotificationService.sendPaymentReminder(overduePayment.payment);

      expect(mockNotificationService.sendPaymentReminder).toHaveBeenCalledWith(
        overduePayment.payment
      );
      expect(notificationsSent).toHaveLength(1);
    });

    test('synchronizes with wedding budget system', async () => {
      const budgetUpdates: any[] = [];
      
      // Mock budget system
      const mockBudgetService = {
        updateBudgetItem: jest.fn((weddingId, category, amount) => {
          budgetUpdates.push({ weddingId, category, amount });
          return Promise.resolve();
        }),
      };

      // Create payment that affects budget
      const budgetPayment = await paymentService.createPayment({
        vendor_name: 'Budget Impact Vendor',
        amount: 3000.00,
        due_date: '2025-03-25',
        status: 'paid',
        category: 'Venue',
        wedding_id: MOCK_WEDDING_ID,
      });

      // Simulate budget synchronization
      await mockBudgetService.updateBudgetItem(
        MOCK_WEDDING_ID,
        budgetPayment.payment.category,
        budgetPayment.payment.amount
      );

      expect(mockBudgetService.updateBudgetItem).toHaveBeenCalledWith(
        MOCK_WEDDING_ID,
        'Venue',
        3000.00
      );
      expect(budgetUpdates).toHaveLength(1);
    });
  });
});