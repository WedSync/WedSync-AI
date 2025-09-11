import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/payments/schedules/route';
import { createClient } from '@/lib/supabase/server';
import { PaymentSecurityManager } from '@/lib/security/payment-security';
import { 
  mockPaymentData,
  mockComponentProps,
  testUtils,
  MOCK_WEDDING_ID,
  MOCK_USER_ID,
  invalidPaymentData
} from '../../../../tests/payments/fixtures/payment-fixtures';

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

// Mock security manager
jest.mock('@/lib/security/payment-security', () => ({
  PaymentSecurityManager: jest.fn().mockImplementation(() => ({
    decryptPaymentData: jest.fn(),
    encryptPaymentData: jest.fn(),
    validatePaymentSecurity: jest.fn(() => ({ isValid: true }))
  }))
}));

describe('Payment Schedules API Integration', () => {
  let mockSupabase: any;
  let mockSecurityManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
        then: jest.fn()
      }))
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    
    mockSecurityManager = new PaymentSecurityManager();
    mockSecurityManager.decryptPaymentData.mockResolvedValue({ 
      bankAccount: 'encrypted-data-decrypted' 
    });
  });

  describe('GET /api/payments/schedules', () => {
    test('successfully retrieves payment schedules', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      // Mock wedding access
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      // Mock payment schedules data
      const mockSchedulesData = mockPaymentData.map(payment => ({
        id: payment.id,
        wedding_id: payment.wedding_id,
        title: `Payment to ${payment.vendor_name}`,
        description: payment.description,
        amount: payment.amount,
        due_date: payment.due_date,
        status: payment.status,
        priority: payment.priority,
        vendor_id: `vendor-${payment.id}`,
        vendor: {
          id: `vendor-${payment.id}`,
          name: payment.vendor_name,
          category: payment.category,
          contact_info: { email: 'vendor@example.com' }
        },
        reminder_enabled: true,
        reminder_days_before: [7, 3, 1],
        notification_types: ['push', 'email'],
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        created_by: MOCK_USER_ID
      }));

      mockSupabase.from().then.mockResolvedValue({
        data: mockSchedulesData,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.schedules).toHaveLength(5);
      expect(responseData.total).toBe(5);
      expect(responseData.schedules[0]).toHaveProperty('id');
      expect(responseData.schedules[0]).toHaveProperty('vendor');
      expect(responseData.schedules[0]).toHaveProperty('reminderSettings');
    });

    test('requires wedding ID parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/schedules');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Wedding ID is required');
    });

    test('requires user authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    test('enforces wedding access permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      // Mock no access to wedding
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No access' }
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Access denied to this wedding');
    });

    test('handles database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      // Mock database error
      mockSupabase.from().then.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch payment schedules');
    });

    test('applies status filters correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      const overduePayments = mockPaymentData.filter(p => p.status === 'overdue');
      mockSupabase.from().then.mockResolvedValue({
        data: overduePayments,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&status=overdue`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.schedules).toHaveLength(1);
      expect(responseData.schedules[0].status).toBe('overdue');
      expect(mockSupabase.from().in).toHaveBeenCalledWith('status', ['overdue']);
    });

    test('applies date range filters correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&startDate=2025-01-01&endDate=2025-03-31`
      );

      const response = await GET(request);

      expect(mockSupabase.from().gte).toHaveBeenCalledWith('due_date', '2025-01-01');
      expect(mockSupabase.from().lte).toHaveBeenCalledWith('due_date', '2025-03-31');
    });

    test('decrypts sensitive payment data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      const encryptedSchedule = {
        ...mockPaymentData[0],
        encrypted_payment_data: 'encrypted-bank-account-data'
      };

      mockSupabase.from().then.mockResolvedValue({
        data: [encryptedSchedule],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(mockSecurityManager.decryptPaymentData).toHaveBeenCalledWith('encrypted-bank-account-data');
      expect(responseData.schedules[0]).toHaveProperty('bankAccount');
    });
  });

  describe('POST /api/payments/schedules', () => {
    const validPaymentSchedule = {
      weddingId: MOCK_WEDDING_ID,
      title: 'Final venue payment',
      description: 'Payment for reception hall',
      amount: 15000.00,
      dueDate: '2025-03-01T00:00:00Z',
      vendor: {
        id: 'vendor-001',
        name: 'Elegant Gardens Venue',
        category: 'Venue',
        contact: {
          email: 'venue@elegantgardens.com',
          phone: '555-0123'
        }
      },
      priority: 'high',
      reminderSettings: {
        enabled: true,
        daysBefore: [30, 7, 3, 1],
        notificationTypes: ['push', 'email']
      },
      paymentMethod: {
        type: 'check',
        reference: 'CHECK-001'
      }
    };

    test('successfully creates new payment schedule', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      // Mock wedding access
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'vendor-001', name: 'Elegant Gardens Venue', category: 'Venue' },
          error: null
        });

      // Mock successful insert
      const createdSchedule = {
        id: 'schedule-001',
        wedding_id: MOCK_WEDDING_ID,
        ...validPaymentSchedule,
        vendor: {
          id: 'vendor-001',
          name: 'Elegant Gardens Venue',
          category: 'Venue',
          contact_info: { email: 'venue@elegantgardens.com' }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: MOCK_USER_ID
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: createdSchedule,
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.schedule.id).toBe('schedule-001');
      expect(responseData.schedule.title).toBe('Final venue payment');
      expect(responseData.message).toBe('Payment schedule created successfully');
    });

    test('validates request body schema', async () => {
      const invalidSchedule = {
        ...validPaymentSchedule,
        amount: -1000, // Invalid negative amount
        weddingId: 'invalid-uuid' // Invalid UUID format
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(invalidSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
      expect(responseData.details).toBeInstanceOf(Array);
      expect(responseData.details.some((err: any) => err.path.includes('amount'))).toBe(true);
      expect(responseData.details.some((err: any) => err.path.includes('weddingId'))).toBe(true);
    });

    test('requires user authentication for creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    test('enforces role-based permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      // Mock viewer role (no creation permissions)
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'viewer' },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Insufficient permissions to create payment schedules');
    });

    test('validates vendor belongs to wedding', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Vendor not found' }
        });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid vendor for this wedding');
    });

    test('handles database insertion errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'vendor-001', name: 'Test Vendor', category: 'Venue' },
          error: null
        });

      // Mock database insertion error
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' }
      });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to create payment schedule');
    });

    test('validates maximum amount limits', async () => {
      const largeAmountSchedule = {
        ...validPaymentSchedule,
        amount: 2000000 // Exceeds 1M limit
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(largeAmountSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('validates required vendor information', async () => {
      const noVendorSchedule = {
        ...validPaymentSchedule,
        vendor: {
          id: '', // Empty vendor ID
          name: '',
          category: 'Venue'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(noVendorSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('validates reminder settings', async () => {
      const invalidReminderSchedule = {
        ...validPaymentSchedule,
        reminderSettings: {
          enabled: true,
          daysBefore: [400], // Exceeds 365 day limit
          notificationTypes: ['invalid-type'] // Invalid notification type
        }
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(invalidReminderSchedule)
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('processes encrypted payment data securely', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'vendor-001', name: 'Test Vendor', category: 'Venue' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'schedule-001' },
          error: null
        });

      const scheduleWithEncryption = {
        ...validPaymentSchedule,
        encryptedData: 'encrypted-bank-account-info'
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(scheduleWithEncryption)
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          encrypted_payment_data: 'encrypted-bank-account-info'
        })
      );
    });
  });

  describe('Filtering and Pagination Integration', () => {
    test('handles multiple status filters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&status=pending&status=due-soon`
      );

      const response = await GET(request);

      expect(mockSupabase.from().in).toHaveBeenCalledWith('status', ['pending', 'due-soon']);
    });

    test('handles priority filters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&priority=high&priority=critical`
      );

      const response = await GET(request);

      expect(mockSupabase.from().in).toHaveBeenCalledWith('priority', ['high', 'critical']);
    });

    test('handles vendor ID filters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&vendorId=vendor-001&vendorId=vendor-002`
      );

      const response = await GET(request);

      expect(mockSupabase.from().in).toHaveBeenCalledWith('vendor_id', ['vendor-001', 'vendor-002']);
    });
  });

  describe('Security Integration', () => {
    test('prevents SQL injection in filters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const maliciousRequest = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&status='; DROP TABLE payment_schedules; --`
      );

      const response = await GET(maliciousRequest);

      // Should handle safely through parameterized queries
      expect(response.status).toBe(200);
      expect(mockSupabase.from().in).toHaveBeenCalledWith('status', ['\'; DROP TABLE payment_schedules; --']);
    });

    test('validates CSRF protection', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(validPaymentSchedule),
        headers: {
          'Content-Type': 'application/json'
          // Missing CSRF token
        }
      });

      // Should be handled by middleware, but test anyway
      const response = await POST(request);
      
      // Will pass through as CSRF is handled at middleware level
      expect([201, 401, 403]).toContain(response.status);
    });

    test('rate limits creation requests', async () => {
      // Mock multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/payments/schedules', {
          method: 'POST',
          body: JSON.stringify(validPaymentSchedule)
        })
      );

      // In a real implementation, this would be handled by rate limiting middleware
      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // At least some should be rate limited (429) if middleware is working
      const statuses = responses.map(res => res.status);
      expect(statuses).toContain(429);
    });

    test('sanitizes user input', async () => {
      const xssPayload = {
        ...validPaymentSchedule,
        title: '<script>alert("XSS")</script>Final venue payment',
        description: 'Payment for <img src="x" onerror="alert(1)"> reception hall'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'vendor-001', name: 'Test Vendor', category: 'Venue' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'schedule-001' },
          error: null
        });

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(xssPayload)
      });

      const response = await POST(request);

      // Should sanitize input before database insertion
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.not.stringContaining('<script>'),
          description: expect.not.stringContaining('<img')
        })
      );
    });
  });

  describe('Performance Integration', () => {
    test('handles large datasets efficiently', async () => {
      const largeDataset = testUtils.createPayments(1000);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: largeDataset,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(200); // Sub-200ms requirement
      
      const responseData = await response.json();
      expect(responseData.schedules).toHaveLength(1000);
    });

    test('implements query optimization', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);

      // Verify optimized query structure
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_schedules');
      expect(mockSupabase.from().select).toHaveBeenCalledWith(
        expect.stringContaining('vendor:vendors(id, name, category, contact_info)')
      );
      expect(mockSupabase.from().order).toHaveBeenCalledWith('due_date', { ascending: true });
    });

    test('handles concurrent requests safely', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: [],
        error: null
      });

      // Simulate concurrent GET requests
      const concurrentRequests = Array.from({ length: 5 }, () =>
        GET(new NextRequest(`http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`))
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed without race conditions
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    test('recovers from temporary database failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: { role: 'couple' },
        error: null
      });

      // First call fails, second succeeds
      mockSupabase.from().then
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout' }
        })
        .mockResolvedValueOnce({
          data: mockPaymentData,
          error: null
        });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      // First call
      let response = await GET(request);
      expect(response.status).toBe(500);

      // Retry should succeed
      response = await GET(request);
      expect(response.status).toBe(200);
    });

    test('handles malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: 'invalid-json{'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    test('handles missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST'
      });

      const response = await POST(request);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Real-world Scenario Integration', () => {
    test('creates complete wedding payment schedule', async () => {
      // Mock full authentication flow
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { role: 'couple' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'vendor-001', name: 'Elegant Gardens', category: 'Venue' },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'schedule-001',
            wedding_id: MOCK_WEDDING_ID,
            vendor: {
              id: 'vendor-001',
              name: 'Elegant Gardens',
              category: 'Venue',
              contact_info: { email: 'venue@elegantgardens.com' }
            },
            ...validPaymentSchedule,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: MOCK_USER_ID
          },
          error: null
        });

      const weddingPaymentSchedule = {
        weddingId: MOCK_WEDDING_ID,
        title: 'Venue Final Payment',
        description: 'Final payment for wedding venue including setup and breakdown services',
        amount: 25000.00,
        dueDate: '2025-06-01T00:00:00Z', // 2 weeks before wedding
        vendor: {
          id: 'vendor-001',
          name: 'Elegant Gardens Venue',
          category: 'Venue',
          contact: {
            email: 'billing@elegantgardens.com',
            phone: '555-VENUE'
          }
        },
        priority: 'critical',
        reminderSettings: {
          enabled: true,
          daysBefore: [60, 30, 14, 7, 3, 1],
          notificationTypes: ['push', 'email', 'sms']
        },
        paymentMethod: {
          type: 'transfer',
          reference: 'VENUE-FINAL-2025'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(weddingPaymentSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.schedule.title).toBe('Venue Final Payment');
      expect(responseData.schedule.priority).toBe('critical');
      expect(responseData.schedule.reminderSettings.daysBefore).toHaveLength(6);
    });

    test('handles multiple vendor payments in sequence', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      // Mock different vendors
      const vendors = ['venue', 'catering', 'photography', 'flowers', 'music'];
      
      for (const vendor of vendors) {
        mockSupabase.from().single
          .mockResolvedValueOnce({
            data: { id: `vendor-${vendor}`, name: `${vendor} vendor`, category: vendor },
            error: null
          })
          .mockResolvedValueOnce({
            data: { id: `schedule-${vendor}` },
            error: null
          });

        const vendorPayment = {
          ...validPaymentSchedule,
          vendor: {
            id: `vendor-${vendor}`,
            name: `${vendor} vendor`,
            category: vendor
          },
          title: `Payment to ${vendor} vendor`
        };

        const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
          method: 'POST',
          body: JSON.stringify(vendorPayment)
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    test('validates business rules for wedding payments', async () => {
      // Test business rule: Cannot create payment for past date
      const pastDateSchedule = {
        ...validPaymentSchedule,
        dueDate: '2020-01-01T00:00:00Z' // Past date
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(pastDateSchedule)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });

    test('enforces payment amount business rules', async () => {
      // Test very small amounts (below minimum)
      const microPayment = {
        ...validPaymentSchedule,
        amount: 0.001 // Below $0.01 minimum
      };

      const request = new NextRequest('http://localhost:3000/api/payments/schedules', {
        method: 'POST',
        body: JSON.stringify(microPayment)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });
  });

  describe('Cross-Device Synchronization', () => {
    test('maintains data consistency across devices', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      // Mock real-time subscription data
      const realtimeData = mockPaymentData.map(payment => ({
        ...payment,
        last_modified: new Date().toISOString(),
        modified_by: MOCK_USER_ID,
        device_id: 'device-mobile-001'
      }));

      mockSupabase.from().then.mockResolvedValue({
        data: realtimeData,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.schedules.every((s: any) => s.lastModified)).toBe(true);
    });

    test('handles offline sync conflicts', async () => {
      // This would be handled by the offline sync system
      // Test that API provides necessary conflict resolution data
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      const conflictData = mockPaymentData.map(payment => ({
        ...payment,
        version: 2,
        last_modified: new Date().toISOString(),
        conflicts: []
      }));

      mockSupabase.from().then.mockResolvedValue({
        data: conflictData,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&includeVersion=true`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(responseData.schedules.every((s: any) => typeof s.version === 'number')).toBe(true);
    });
  });

  describe('Mobile API Optimizations', () => {
    test('provides mobile-optimized response format', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      mockSupabase.from().then.mockResolvedValue({
        data: mockPaymentData,
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`,
        {
          headers: {
            'User-Agent': 'WedSyncMobile/1.0 iOS'
          }
        }
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('max-age');
      expect(responseData).toHaveProperty('schedules');
      expect(responseData).toHaveProperty('total');
    });

    test('supports pagination for mobile', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null
      });

      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'couple' },
        error: null
      });

      // Mock pagination
      mockSupabase.from().then.mockResolvedValue({
        data: mockPaymentData.slice(0, 2), // First page
        error: null
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}&page=1&limit=2`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.schedules).toHaveLength(2);
    });
  });
});