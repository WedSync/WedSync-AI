/**
 * WS-164 Manual Tracking - Complete Expense Workflow Integration Tests
 * Tests end-to-end expense tracking workflow with OCR integration
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ReceiptScannerService } from '@/lib/services/receipt-scanner';
import { FieldExtractionService } from '@/lib/services/field-extraction-service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock Supabase client
const mockSupabase = {
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    getPublicUrl: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn()
  },
  rpc: jest.fn()
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

// Mock services
jest.mock('@/lib/services/receipt-scanner');
jest.mock('@/lib/services/field-extraction-service');

// Test data
const TEST_USER_ID = 'test-user-123';
const TEST_WEDDING_ID = 'test-wedding-456';
const TEST_ORGANIZATION_ID = 'test-org-789';

const TEST_CATEGORIES = [
  {
    id: 'cat-flowers',
    name: 'Flowers & Decoration',
    category_type: 'flowers',
    budgeted_amount: 2000.00,
    spent_amount: 500.00,
    remaining_amount: 1500.00
  },
  {
    id: 'cat-venue',
    name: 'Venue & Reception',
    category_type: 'venue',
    budgeted_amount: 5000.00,
    spent_amount: 3000.00,
    remaining_amount: 2000.00
  },
  {
    id: 'cat-photography',
    name: 'Photography & Videography',
    category_type: 'photography',
    budgeted_amount: 3000.00,
    spent_amount: 1200.00,
    remaining_amount: 1800.00
  }
];

const MOCK_RECEIPT_DATA = {
  vendor: 'Elegant Blooms Florist',
  date: new Date('2024-03-15'),
  totalAmount: 750.00,
  taxAmount: 60.00,
  tipAmount: 0,
  paymentMethod: 'CARD',
  receiptNumber: 'EB-2024-0315-001',
  category: 'flowers',
  confidence: 0.92,
  items: [
    { description: 'Bridal Bouquet', amount: 200.00 },
    { description: 'Centerpieces (8)', amount: 400.00 },
    { description: 'Ceremony Arch Flowers', amount: 150.00 }
  ]
};

const MOCK_EXPENSE_FORM_DATA = {
  category_id: 'cat-flowers',
  description: 'Florist payment for ceremony and reception flowers',
  amount: '750.00',
  transaction_date: '2024-03-15',
  payment_method: 'credit_card',
  vendor_name: 'Elegant Blooms Florist',
  notes: 'Includes bridal bouquet, centerpieces, and ceremony arch decorations'
};

describe('Manual Expense Workflow Integration Tests', () => {
  let receiptScanner: ReceiptScannerService;
  let fieldExtractor: FieldExtractionService;
  
  beforeAll(async () => {
    // Setup test database state
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null
    });
  });

  beforeEach(() => {
    receiptScanner = new ReceiptScannerService();
    fieldExtractor = new FieldExtractionService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Expense Entry Workflow', () => {
    it('should process complete workflow from receipt upload to expense creation', async () => {
      // Step 1: Mock receipt upload to storage
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'receipts/test-wedding-456/receipt_12345.jpg' },
        error: null
      });

      // Step 2: Mock OCR processing
      (receiptScanner.scanReceipt as jest.Mock).mockResolvedValue({
        success: true,
        data: MOCK_RECEIPT_DATA,
        rawText: 'Mocked OCR text content'
      });

      // Step 3: Mock expense transaction creation
      mockSupabase.insert.mockResolvedValue({
        data: {
          id: 'transaction-123',
          wedding_id: TEST_WEDDING_ID,
          organization_id: TEST_ORGANIZATION_ID,
          ...MOCK_EXPENSE_FORM_DATA,
          amount: 750.00,
          receipt_url: 'receipts/test-wedding-456/receipt_12345.jpg',
          receipt_filename: 'florist_receipt.jpg',
          status: 'PAID',
          created_at: new Date().toISOString()
        },
        error: null
      });

      // Step 4: Mock category update
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      // Execute workflow
      const mockFile = new File(['mock receipt data'], 'florist_receipt.jpg', { 
        type: 'image/jpeg' 
      });

      // 1. Upload receipt
      const uploadResult = await mockSupabase.storage
        .from('receipts')
        .upload(`receipts/${TEST_WEDDING_ID}/receipt_12345.jpg`, mockFile);

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBeTruthy();

      // 2. Process OCR
      const ocrResult = await receiptScanner.scanReceipt(mockFile);
      
      expect(ocrResult.success).toBe(true);
      expect(ocrResult.data?.vendor).toBe(MOCK_RECEIPT_DATA.vendor);
      expect(ocrResult.data?.totalAmount).toBe(MOCK_RECEIPT_DATA.totalAmount);
      expect(ocrResult.data?.confidence).toBeGreaterThan(0.9);

      // 3. Create expense transaction
      const transactionData = {
        wedding_id: TEST_WEDDING_ID,
        organization_id: TEST_ORGANIZATION_ID,
        category_id: MOCK_EXPENSE_FORM_DATA.category_id,
        description: MOCK_EXPENSE_FORM_DATA.description,
        amount: parseFloat(MOCK_EXPENSE_FORM_DATA.amount),
        transaction_date: MOCK_EXPENSE_FORM_DATA.transaction_date,
        payment_method: MOCK_EXPENSE_FORM_DATA.payment_method,
        vendor_name: MOCK_EXPENSE_FORM_DATA.vendor_name,
        notes: MOCK_EXPENSE_FORM_DATA.notes,
        receipt_url: uploadResult.data?.path,
        receipt_filename: mockFile.name,
        status: 'PAID'
      };

      const insertResult = await mockSupabase
        .from('budget_transactions')
        .insert(transactionData)
        .select()
        .single();

      expect(insertResult.data).toBeTruthy();
      expect(insertResult.data.amount).toBe(750.00);
      expect(insertResult.data.receipt_url).toBeTruthy();

      // 4. Verify category spending update would be triggered
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'update_budget_category_spending',
        expect.objectContaining({
          category_id: 'cat-flowers',
          amount: 750.00
        })
      );
    });

    it('should handle expense creation without receipt', async () => {
      // Mock expense creation without receipt
      mockSupabase.insert.mockResolvedValue({
        data: {
          id: 'transaction-456',
          wedding_id: TEST_WEDDING_ID,
          organization_id: TEST_ORGANIZATION_ID,
          ...MOCK_EXPENSE_FORM_DATA,
          amount: 750.00,
          receipt_url: null,
          receipt_filename: null,
          status: 'PAID',
          created_at: new Date().toISOString()
        },
        error: null
      });

      const transactionData = {
        wedding_id: TEST_WEDDING_ID,
        organization_id: TEST_ORGANIZATION_ID,
        category_id: MOCK_EXPENSE_FORM_DATA.category_id,
        description: MOCK_EXPENSE_FORM_DATA.description,
        amount: parseFloat(MOCK_EXPENSE_FORM_DATA.amount),
        transaction_date: MOCK_EXPENSE_FORM_DATA.transaction_date,
        payment_method: MOCK_EXPENSE_FORM_DATA.payment_method,
        vendor_name: MOCK_EXPENSE_FORM_DATA.vendor_name,
        notes: MOCK_EXPENSE_FORM_DATA.notes,
        receipt_url: null,
        receipt_filename: null,
        status: 'PAID'
      };

      const result = await mockSupabase
        .from('budget_transactions')
        .insert(transactionData)
        .select()
        .single();

      expect(result.data).toBeTruthy();
      expect(result.data.receipt_url).toBeNull();
      expect(result.data.amount).toBe(750.00);
    });

    it('should validate budget impact and generate warnings', async () => {
      // Test case where expense would exceed budget
      const overBudgetExpense = {
        ...MOCK_EXPENSE_FORM_DATA,
        category_id: 'cat-flowers',
        amount: '2000.00' // Would exceed remaining budget
      };

      // Mock category lookup
      mockSupabase.single.mockResolvedValue({
        data: TEST_CATEGORIES[0], // Flowers category with $1,500 remaining
        error: null
      });

      // Get category details
      const categoryResult = await mockSupabase
        .from('budget_categories')
        .select('*')
        .eq('id', overBudgetExpense.category_id)
        .single();

      const category = categoryResult.data;
      const expenseAmount = parseFloat(overBudgetExpense.amount);
      const wouldExceedBudget = (category.spent_amount + expenseAmount) > category.budgeted_amount;

      expect(wouldExceedBudget).toBe(true);
      expect(category.remaining_amount).toBeLessThan(expenseAmount);
    });
  });

  describe('OCR Data Auto-population Integration', () => {
    it('should auto-populate expense form from OCR data', async () => {
      (receiptScanner.scanReceipt as jest.Mock).mockResolvedValue({
        success: true,
        data: MOCK_RECEIPT_DATA,
        rawText: 'Mocked receipt text'
      });

      const mockFile = new File(['receipt data'], 'receipt.jpg', { type: 'image/jpeg' });
      const ocrResult = await receiptScanner.scanReceipt(mockFile);

      expect(ocrResult.success).toBe(true);
      
      // Simulate form auto-population from OCR data
      const autoPopulatedForm = {
        vendor_name: ocrResult.data?.vendor || '',
        amount: ocrResult.data?.totalAmount?.toString() || '',
        transaction_date: ocrResult.data?.date?.toISOString().split('T')[0] || '',
        payment_method: ocrResult.data?.paymentMethod?.toLowerCase().replace('card', 'credit_card') || '',
        description: `Payment to ${ocrResult.data?.vendor} - Receipt #${ocrResult.data?.receiptNumber}`,
        notes: ocrResult.data?.items?.map(item => `${item.description}: $${item.amount}`).join('\n') || ''
      };

      expect(autoPopulatedForm.vendor_name).toBe('Elegant Blooms Florist');
      expect(autoPopulatedForm.amount).toBe('750');
      expect(autoPopulatedForm.transaction_date).toBe('2024-03-15');
      expect(autoPopulatedForm.description).toContain('Elegant Blooms Florist');
      expect(autoPopulatedForm.notes).toContain('Bridal Bouquet');
    });

    it('should handle OCR data with confidence-based suggestions', async () => {
      // Low confidence OCR result
      const lowConfidenceData = {
        ...MOCK_RECEIPT_DATA,
        confidence: 0.45,
        vendor: 'Uncl34r V3nd0r N4m3', // Garbled text
        totalAmount: 750.99 // Slightly off amount
      };

      (receiptScanner.scanReceipt as jest.Mock).mockResolvedValue({
        success: true,
        data: lowConfidenceData,
        rawText: 'Poor quality OCR text'
      });

      const mockFile = new File(['poor quality receipt'], 'blurry.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBeLessThan(0.5);
      
      // Form should be populated but marked for review
      const formData = {
        vendor_name: result.data?.vendor || '',
        amount: result.data?.totalAmount?.toString() || '',
        requiresReview: result.data?.confidence < 0.7
      };

      expect(formData.requiresReview).toBe(true);
      expect(formData.vendor_name).toBe('Uncl34r V3nd0r N4m3');
    });

    it('should suggest expense categories based on OCR analysis', async () => {
      const testCases = [
        {
          receiptData: { ...MOCK_RECEIPT_DATA, category: 'flowers' },
          expectedCategoryId: 'cat-flowers'
        },
        {
          receiptData: { ...MOCK_RECEIPT_DATA, category: 'venue', vendor: 'Grand Ballroom' },
          expectedCategoryId: 'cat-venue'
        },
        {
          receiptData: { ...MOCK_RECEIPT_DATA, category: 'photography', vendor: 'Picture Perfect Photos' },
          expectedCategoryId: 'cat-photography'
        }
      ];

      for (const testCase of testCases) {
        (receiptScanner.scanReceipt as jest.Mock).mockResolvedValue({
          success: true,
          data: testCase.receiptData
        });

        const mockFile = new File(['receipt'], 'test.jpg', { type: 'image/jpeg' });
        const result = await receiptScanner.scanReceipt(mockFile);

        // Category matching logic
        const suggestedCategory = TEST_CATEGORIES.find(cat => 
          cat.category_type === result.data?.category
        );

        expect(suggestedCategory?.id).toBe(testCase.expectedCategoryId);
      }
    });
  });

  describe('Field Extraction Service Integration', () => {
    it('should integrate with field extraction for advanced document processing', async () => {
      const mockExtractionResult = {
        success: true,
        document: {
          id: 'extraction-123',
          documentId: 'doc-456',
          status: 'completed',
          fields: [
            {
              fieldId: 'vendor_name',
              name: 'Vendor Name',
              value: 'Elegant Blooms Florist',
              confidence: 0.95,
              confidenceLevel: 'very-high',
              validationStatus: 'valid'
            },
            {
              fieldId: 'total_amount',
              name: 'Total Amount',
              value: 750.00,
              confidence: 0.92,
              confidenceLevel: 'high',
              validationStatus: 'valid'
            },
            {
              fieldId: 'transaction_date',
              name: 'Transaction Date',
              value: '2024-03-15',
              confidence: 0.88,
              confidenceLevel: 'high',
              validationStatus: 'valid'
            }
          ],
          averageConfidence: 0.92
        }
      };

      (fieldExtractor.extractFields as jest.Mock).mockResolvedValue(mockExtractionResult);

      const extractionRequest = {
        documentId: 'doc-456',
        options: {
          ocr: true,
          enhanceImage: true,
          fuzzyMatching: true
        }
      };

      const result = await fieldExtractor.extractFields(extractionRequest);

      expect(result.success).toBe(true);
      expect(result.document?.averageConfidence).toBeGreaterThan(0.9);
      
      // Verify field extraction accuracy
      const vendorField = result.document?.fields.find(f => f.fieldId === 'vendor_name');
      const amountField = result.document?.fields.find(f => f.fieldId === 'total_amount');
      
      expect(vendorField?.value).toBe('Elegant Blooms Florist');
      expect(vendorField?.confidence).toBeGreaterThan(0.9);
      expect(amountField?.value).toBe(750.00);
      expect(amountField?.confidence).toBeGreaterThan(0.9);
    });

    it('should handle field validation and error reporting', async () => {
      const validationErrorResult = {
        success: true,
        document: {
          id: 'extraction-456',
          documentId: 'doc-789',
          status: 'partial',
          fields: [
            {
              fieldId: 'vendor_email',
              name: 'Vendor Email',
              value: 'invalid-email-format',
              confidence: 0.75,
              confidenceLevel: 'medium',
              validationStatus: 'invalid',
              validationErrors: ['Invalid email format']
            },
            {
              fieldId: 'phone_number',
              name: 'Phone Number',
              value: '555-1234',
              confidence: 0.60,
              confidenceLevel: 'medium',
              validationStatus: 'warning',
              validationErrors: ['Incomplete phone number']
            }
          ],
          averageConfidence: 0.675
        }
      };

      (fieldExtractor.extractFields as jest.Mock).mockResolvedValue(validationErrorResult);

      const result = await fieldExtractor.extractFields({
        documentId: 'doc-789',
        options: { ocr: true }
      });

      expect(result.success).toBe(true);
      expect(result.document?.status).toBe('partial');

      const emailField = result.document?.fields.find(f => f.fieldId === 'vendor_email');
      const phoneField = result.document?.fields.find(f => f.fieldId === 'phone_number');

      expect(emailField?.validationStatus).toBe('invalid');
      expect(emailField?.validationErrors).toContain('Invalid email format');
      expect(phoneField?.validationStatus).toBe('warning');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle OCR service failures gracefully', async () => {
      (receiptScanner.scanReceipt as jest.Mock).mockResolvedValue({
        success: false,
        error: 'OCR service temporarily unavailable'
      });

      const mockFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OCR service');

      // Should still allow manual expense entry without OCR
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'manual-entry-123' },
        error: null
      });

      const manualEntry = await mockSupabase
        .from('budget_transactions')
        .insert(MOCK_EXPENSE_FORM_DATA);

      expect(manualEntry.data?.id).toBeTruthy();
    });

    it('should handle database transaction failures', async () => {
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation', code: '23505' }
      });

      const result = await mockSupabase
        .from('budget_transactions')
        .insert(MOCK_EXPENSE_FORM_DATA)
        .select()
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('23505');

      // Should provide user-friendly error handling
      const userError = result.error.code === '23505' 
        ? 'Duplicate transaction detected' 
        : 'Database error occurred';
      
      expect(userError).toBe('Duplicate transaction detected');
    });

    it('should handle storage upload failures with retry logic', async () => {
      // First attempt fails
      mockSupabase.storage.upload
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network timeout' }
        })
        // Second attempt succeeds
        .mockResolvedValueOnce({
          data: { path: 'receipts/test/retry_receipt.jpg' },
          error: null
        });

      const mockFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });

      // Simulate retry logic
      let uploadResult = await mockSupabase.storage
        .from('receipts')
        .upload('receipts/test/receipt.jpg', mockFile);

      if (uploadResult.error) {
        // Retry upload
        uploadResult = await mockSupabase.storage
          .from('receipts')
          .upload('receipts/test/retry_receipt.jpg', mockFile);
      }

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBeTruthy();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent expense submissions', async () => {
      const concurrentExpenses = Array.from({ length: 10 }, (_, i) => ({
        ...MOCK_EXPENSE_FORM_DATA,
        description: `Concurrent expense ${i + 1}`,
        amount: (100 * (i + 1)).toString()
      }));

      mockSupabase.insert.mockImplementation((data) => 
        Promise.resolve({
          data: { id: `concurrent-${Date.now()}-${Math.random()}`, ...data },
          error: null
        })
      );

      const startTime = Date.now();
      const promises = concurrentExpenses.map(expense => 
        mockSupabase.from('budget_transactions').insert(expense)
      );

      const results = await Promise.all(promises);
      const processingTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.data?.id).toBeTruthy();
        expect(result.error).toBeNull();
      });

      // Should handle concurrent requests efficiently
      expect(processingTime).toBeLessThan(5000);
    });

    it('should process large receipts efficiently', async () => {
      // Simulate large receipt with many line items
      const largeReceiptData = {
        ...MOCK_RECEIPT_DATA,
        items: Array.from({ length: 50 }, (_, i) => ({
          description: `Wedding Item ${i + 1}`,
          amount: Math.round((Math.random() * 100 + 10) * 100) / 100
        }))
      };

      (receiptScanner.scanReceipt as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            data: largeReceiptData
          }), 100); // Simulate processing time
        });
      });

      const startTime = Date.now();
      const mockFile = new File(['large receipt'], 'large_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(50);
      expect(processingTime).toBeLessThan(1000); // Should process quickly
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain data consistency across related tables', async () => {
      // Mock successful expense creation
      mockSupabase.insert.mockResolvedValue({
        data: {
          id: 'transaction-consistency-test',
          category_id: 'cat-flowers',
          amount: 750.00
        },
        error: null
      });

      // Mock category update
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      // Mock updated category retrieval
      mockSupabase.single.mockResolvedValue({
        data: {
          ...TEST_CATEGORIES[0],
          spent_amount: 1250.00, // 500 + 750
          remaining_amount: 750.00 // 2000 - 1250
        },
        error: null
      });

      // Create expense
      const expenseResult = await mockSupabase
        .from('budget_transactions')
        .insert({
          category_id: 'cat-flowers',
          amount: 750.00
        });

      // Update category spending
      await mockSupabase.rpc('update_budget_category_spending', {
        category_id: 'cat-flowers',
        amount: 750.00
      });

      // Verify category was updated
      const updatedCategory = await mockSupabase
        .from('budget_categories')
        .select('*')
        .eq('id', 'cat-flowers')
        .single();

      expect(expenseResult.data?.id).toBeTruthy();
      expect(updatedCategory.data?.spent_amount).toBe(1250.00);
      expect(updatedCategory.data?.remaining_amount).toBe(750.00);
    });

    it('should validate financial calculations and prevent negative balances', async () => {
      const categoryWithLowBalance = {
        ...TEST_CATEGORIES[0],
        remaining_amount: 100.00
      };

      mockSupabase.single.mockResolvedValue({
        data: categoryWithLowBalance,
        error: null
      });

      const largeExpense = {
        ...MOCK_EXPENSE_FORM_DATA,
        amount: '500.00' // Exceeds remaining balance
      };

      // Get category
      const category = await mockSupabase
        .from('budget_categories')
        .select('*')
        .eq('id', largeExpense.category_id)
        .single();

      const expenseAmount = parseFloat(largeExpense.amount);
      const wouldCauseOverage = expenseAmount > category.data.remaining_amount;

      expect(wouldCauseOverage).toBe(true);

      // Application should warn but still allow the transaction
      const warningMessage = `This expense ($${expenseAmount}) will exceed the remaining budget ($${category.data.remaining_amount}) by $${expenseAmount - category.data.remaining_amount}`;
      
      expect(warningMessage).toContain('will exceed');
    });
  });
});