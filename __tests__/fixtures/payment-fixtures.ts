/**
 * Test fixtures for WS-165 Payment Calendar testing
 * Comprehensive test data for all payment scenarios
 */

import { vi } from 'vitest';

export interface PaymentItem {
  id: string;
  wedding_id: string;
  vendor_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'due-soon' | 'overdue' | 'paid';
  priority: 'high' | 'medium' | 'low';
  category: string;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCalendarSummary {
  total_payments: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  overdue_count: number;
  due_soon_count: number;
}

// Mock wedding IDs for testing
export const MOCK_WEDDING_ID = '123e4567-e89b-12d3-a456-426614174001';
export const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

// Base payment data covering all scenarios
export const mockPaymentData: PaymentItem[] = [
  {
    id: 'payment-001',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Elegant Gardens Venue',
    amount: 15000.00,
    due_date: '2025-03-01',
    status: 'pending',
    priority: 'high',
    category: 'Venue',
    description: 'Final venue payment for reception hall',
    notes: 'Payment includes setup and breakdown',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z'
  },
  {
    id: 'payment-002', 
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Sweet Celebrations Catering',
    amount: 8500.75,
    due_date: '2025-02-15',
    status: 'due-soon',
    priority: 'high',
    category: 'Catering',
    description: 'Final catering payment for 120 guests',
    notes: 'Includes bar service and cake',
    created_at: '2024-12-01T10:00:00Z', 
    updated_at: '2024-12-15T14:30:00Z'
  },
  {
    id: 'payment-003',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Professional Wedding Photography',
    amount: 3200.50,
    due_date: '2025-01-25',
    status: 'overdue',
    priority: 'high',
    category: 'Photography',
    description: 'Remaining balance for wedding photography package',
    notes: 'Includes engagement session and album',
    created_at: '2024-11-15T09:00:00Z',
    updated_at: '2024-12-20T16:45:00Z'
  },
  {
    id: 'payment-004',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Blooming Beautiful Florist',
    amount: 1850.25,
    due_date: '2025-02-28',
    status: 'pending',
    priority: 'medium',
    category: 'Flowers',
    description: 'Bridal bouquet and ceremony decorations',
    notes: 'White roses and eucalyptus theme',
    created_at: '2024-12-05T11:30:00Z',
    updated_at: '2024-12-05T11:30:00Z'
  },
  {
    id: 'payment-005',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Harmony Wedding Band',
    amount: 2400.00,
    due_date: '2024-12-15',
    status: 'paid',
    priority: 'medium',
    category: 'Music',
    description: 'Live band for ceremony and reception',
    notes: 'Payment completed early',
    created_at: '2024-11-01T08:00:00Z',
    updated_at: '2024-12-10T13:20:00Z'
  }
];

// Edge case payment data for boundary testing
export const edgeCasePaymentData: PaymentItem[] = [
  {
    id: 'payment-edge-001',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Edge Case Vendor Zero',
    amount: 0.01, // Minimum valid amount
    due_date: '2025-02-29', // Leap year date
    status: 'pending',
    priority: 'low',
    category: 'Miscellaneous',
    description: 'Minimum amount test',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z'
  },
  {
    id: 'payment-edge-002', 
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Edge Case Vendor Max',
    amount: 999999.99, // Maximum valid amount
    due_date: '2024-12-31', // Year boundary
    status: 'pending',
    priority: 'high',
    category: 'Venue',
    description: 'Maximum amount test',
    created_at: '2024-12-31T23:59:59Z',
    updated_at: '2024-12-31T23:59:59Z'
  },
  {
    id: 'payment-edge-003',
    wedding_id: MOCK_WEDDING_ID,
    vendor_name: 'Edge Case Precision Test',
    amount: 1234.567, // High precision amount for rounding tests
    due_date: '2025-01-01', // New year boundary
    status: 'pending',
    priority: 'medium',
    category: 'Testing',
    description: 'Precision rounding test payment',
    created_at: '2025-01-01T00:00:01Z',
    updated_at: '2025-01-01T00:00:01Z'
  }
];

// Invalid payment data for validation testing
export const invalidPaymentData = [
  {
    id: 'invalid-001',
    vendor_name: '', // Empty vendor name
    amount: -100, // Negative amount
    due_date: 'invalid-date',
    status: 'invalid-status'
  },
  {
    id: 'invalid-002',
    vendor_name: null,
    amount: 'not-a-number',
    due_date: null,
    status: null
  },
  {
    // Missing required fields
    id: 'invalid-003',
    amount: 1000
  }
];

// Payment calculation test data
export const paymentCalculationTestData = [
  {
    base_amount: 1234.567,
    tax_rate: 0.08875,
    discount_rate: 0.1,
    expected_total: 1210.45, // (1234.567 * 0.9) * 1.08875 rounded to 2 decimals
    expected_tax: 98.84,
    expected_discount: 123.46
  },
  {
    base_amount: 5000.00,
    tax_rate: 0.08,
    discount_rate: 0,
    expected_total: 5400.00,
    expected_tax: 400.00,
    expected_discount: 0
  },
  {
    base_amount: 999.99,
    tax_rate: 0.0825,
    discount_rate: 0.15,
    expected_total: 917.41, // (999.99 * 0.85) * 1.0825
    expected_tax: 70.00,
    expected_discount: 150.00
  }
];

// Mock payment calendar summary
export const mockPaymentSummary: PaymentCalendarSummary = {
  total_payments: mockPaymentData.length,
  total_amount: mockPaymentData.reduce((sum, payment) => sum + payment.amount, 0),
  paid_amount: mockPaymentData
    .filter(p => p.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0),
  pending_amount: mockPaymentData
    .filter(p => p.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0),
  overdue_amount: mockPaymentData
    .filter(p => p.status === 'overdue')
    .reduce((sum, payment) => sum + payment.amount, 0),
  overdue_count: mockPaymentData.filter(p => p.status === 'overdue').length,
  due_soon_count: mockPaymentData.filter(p => p.status === 'due-soon').length
};

// Date calculation test data
export const dateCalculationTestData = [
  {
    base_date: '2024-01-15',
    days_to_add: 30,
    expected_date: '2024-02-14',
    description: 'Standard month addition'
  },
  {
    base_date: '2024-02-01',
    days_to_add: 28,
    expected_date: '2024-02-29', // Leap year
    description: 'Leap year February'
  },
  {
    base_date: '2024-12-15',
    days_to_add: 20,
    expected_date: '2025-01-04', // Cross year boundary
    description: 'Cross year boundary'
  },
  {
    base_date: '2024-01-05', // Friday
    business_days_to_add: 3,
    expected_business_date: '2024-01-10', // Wednesday (skip weekend)
    description: 'Business days calculation skipping weekend'
  }
];

// Mock API responses
export const mockAPIResponses = {
  getPayments: {
    success: {
      status: 200,
      data: {
        payments: mockPaymentData,
        summary: mockPaymentSummary,
        pagination: {
          page: 1,
          per_page: 10,
          total_pages: 1,
          total_count: mockPaymentData.length
        }
      }
    },
    error: {
      status: 500,
      data: {
        error: 'Internal server error',
        message: 'Failed to retrieve payments'
      }
    },
    unauthorized: {
      status: 401,
      data: {
        error: 'Unauthorized',
        message: 'Authentication required'
      }
    },
    forbidden: {
      status: 403,
      data: {
        error: 'Access denied', 
        message: 'Insufficient permissions'
      }
    }
  },
  
  createPayment: {
    success: {
      status: 201,
      data: {
        payment: mockPaymentData[0],
        message: 'Payment created successfully'
      }
    },
    validation_error: {
      status: 400,
      data: {
        error: 'Validation failed',
        details: [
          'Amount must be positive',
          'Due date is required',
          'Vendor name cannot be empty'
        ]
      }
    }
  },
  
  updatePayment: {
    success: {
      status: 200,
      data: {
        payment: { ...mockPaymentData[0], status: 'paid' },
        message: 'Payment updated successfully'
      }
    },
    not_found: {
      status: 404,
      data: {
        error: 'Payment not found',
        message: 'The requested payment does not exist'
      }
    }
  }
};

// Component prop mocks
export const mockComponentProps = {
  paymentCalendar: {
    payments: mockPaymentData,
    summary: mockPaymentSummary,
    loading: false,
    error: null,
    onPaymentUpdate: vi.fn(),
    onPaymentCreate: vi.fn(),
    onPaymentDelete: vi.fn(),
    onDateSelect: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn()
  },
  
  paymentItem: {
    payment: mockPaymentData[0],
    onStatusUpdate: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    showActions: true,
    variant: 'default'
  },
  
  paymentForm: {
    wedding_id: MOCK_WEDDING_ID,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    initialData: null,
    loading: false,
    errors: {}
  }
};

// Test utilities
export const testUtils = {
  // Create payment with overrides
  createPayment: (overrides: Partial<PaymentItem> = {}): PaymentItem => ({
    ...mockPaymentData[0],
    id: `payment-${Date.now()}`,
    ...overrides
  }),
  
  // Create multiple payments
  createPayments: (count: number, overrides: Partial<PaymentItem> = {}): PaymentItem[] => 
    Array.from({ length: count }, (_, index) =>
      testUtils.createPayment({
        id: `payment-${index + 1}`,
        amount: Math.random() * 10000,
        ...overrides
      })
    ),
  
  // Format currency for testing
  formatCurrency: (amount: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount),
  
  // Calculate business days
  addBusinessDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) { // Not Sunday or Saturday
        addedDays++;
      }
    }
    
    return result;
  },
  
  // Get payment by status
  getPaymentsByStatus: (status: PaymentItem['status']): PaymentItem[] =>
    mockPaymentData.filter(payment => payment.status === status),
  
  // Calculate summary from payments
  calculateSummary: (payments: PaymentItem[]): PaymentCalendarSummary => ({
    total_payments: payments.length,
    total_amount: payments.reduce((sum, p) => sum + p.amount, 0),
    paid_amount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pending_amount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    overdue_amount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
    overdue_count: payments.filter(p => p.status === 'overdue').length,
    due_soon_count: payments.filter(p => p.status === 'due-soon').length
  })
};

// Mock Supabase client for testing
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn()
  }))
};

export default {
  mockPaymentData,
  edgeCasePaymentData,
  invalidPaymentData,
  paymentCalculationTestData,
  mockPaymentSummary,
  dateCalculationTestData,
  mockAPIResponses,
  mockComponentProps,
  testUtils,
  mockSupabaseClient,
  MOCK_WEDDING_ID,
  MOCK_USER_ID
};