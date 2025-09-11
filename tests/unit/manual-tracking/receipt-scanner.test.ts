/**
 * WS-164 Manual Tracking - Receipt Scanner Unit Tests
 * Tests OCR accuracy, receipt data extraction, and confidence calculations
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ReceiptScannerService, ReceiptData, ScanResult } from '@/lib/services/receipt-scanner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';

// Mock Google Vision Client
jest.mock('@/lib/ocr/google-vision', () => ({
  GoogleVisionClient: jest.fn().mockImplementation(() => ({
    extractText: jest.fn()
  }))
}));

// Test receipt samples for validation
const SAMPLE_RECEIPTS = {
  FLORIST_RECEIPT: `
    Elegant Blooms & Design
    1234 Wedding Ave, Bridal City
    Phone: (555) 123-4567
    
    Date: 03/15/2024
    Receipt #: FB-2024-0315-001
    
    Wedding Bouquet - Premium     $185.00
    6 Centerpieces - Garden Style  $420.00
    Boutonniere (5)                $75.00
    
    Subtotal:                      $680.00
    Tax (8.5%):                    $57.80
    Total:                         $737.80
    
    Payment Method: VISA ****1234
    Thank you for choosing us!
  `,
  
  VENUE_RECEIPT: `
    Grandview Wedding Venue
    789 Celebration Rd, Party Town
    
    Invoice #: GWV-2024-0320
    Date: March 20, 2024
    
    Wedding Reception Package       $2,800.00
    Additional Guest Fee (15 @ $45)  $675.00
    Premium Bar Service             $550.00
    Service Fee (18%)               $724.50
    
    Total Amount Due:              $4,749.50
    
    Paid by: American Express
    Thank you for celebrating with us!
  `,
  
  PHOTOGRAPHER_RECEIPT: `
    Creative Lens Photography
    Phone: 555-PHOTO-1
    Email: info@creativelens.com
    
    2024-03-10
    
    Wedding Photography Package     $1,200.00
    Engagement Session              $300.00
    Online Gallery Access          $100.00
    
    Subtotal                        $1,600.00
    Discount (Early Bird 10%)      -$160.00
    Final Total                     $1,440.00
    
    Payment: Cash
    Receipt: CLP-240310-W001
  `,
  
  CATERING_RECEIPT: `
    Delicious Moments Catering
    555-TASTE-IT
    
    Order #: DMC-2024-MAR-25
    Event Date: June 15, 2024
    
    Plated Dinner Service (120)    $4,200.00
    Cocktail Hour Appetizers       $680.00
    Wedding Cake                   $450.00
    Service Staff (6 hrs)          $720.00
    Gratuity (20%)                 $1,210.00
    
    TOTAL:                         $7,260.00
    
    Payment Method: Bank Transfer
    Thank you for your business!
  `,
  
  POOR_QUALITY_RECEIPT: `
    B@d Qu@li+y R3c31p+
    Un(l3@r T3x+
    D@+3: ??/??/2024
    
    !+3m 1: $???
    !+3m 2: $50.??
    T@x: $?.??
    
    To+@l: $???.??
  `
};

const EXPECTED_EXTRACTIONS = {
  FLORIST_RECEIPT: {
    vendor: 'Elegant Blooms & Design',
    totalAmount: 737.80,
    date: new Date('2024-03-15'),
    taxAmount: 57.80,
    paymentMethod: 'CARD',
    receiptNumber: 'FB-2024-0315-001',
    category: 'flowers',
    items: [
      { description: 'Wedding Bouquet - Premium', amount: 185.00 },
      { description: '6 Centerpieces - Garden Style', amount: 420.00 },
      { description: 'Boutonniere (5)', amount: 75.00 }
    ]
  },
  VENUE_RECEIPT: {
    vendor: 'Grandview Wedding Venue',
    totalAmount: 4749.50,
    date: new Date('2024-03-20'),
    receiptNumber: 'GWV-2024-0320',
    category: 'venue',
    items: [
      { description: 'Wedding Reception Package', amount: 2800.00 },
      { description: 'Additional Guest Fee (15 @ $45)', amount: 675.00 },
      { description: 'Premium Bar Service', amount: 550.00 },
      { description: 'Service Fee (18%)', amount: 724.50 }
    ]
  },
  PHOTOGRAPHER_RECEIPT: {
    vendor: 'Creative Lens Photography',
    totalAmount: 1440.00,
    date: new Date('2024-03-10'),
    paymentMethod: 'CASH',
    receiptNumber: 'CLP-240310-W001',
    category: 'photography',
    items: [
      { description: 'Wedding Photography Package', amount: 1200.00 },
      { description: 'Engagement Session', amount: 300.00 },
      { description: 'Online Gallery Access', amount: 100.00 }
    ]
  }
};

// Accuracy thresholds for different aspects
const ACCURACY_THRESHOLDS = {
  VENDOR_EXTRACTION: 0.90,
  AMOUNT_EXTRACTION: 0.95,
  DATE_EXTRACTION: 0.85,
  CATEGORY_CLASSIFICATION: 0.90,
  ITEM_EXTRACTION: 0.80,
  OVERALL_CONFIDENCE: 0.85,
  POOR_QUALITY_HANDLING: 0.30 // Should be low for poor quality receipts
};

describe('Receipt Scanner Service - WS-164 OCR Accuracy Tests', () => {
  let receiptScanner: ReceiptScannerService;
  let mockVisionClient: any;

  beforeEach(() => {
    receiptScanner = new ReceiptScannerService();
    mockVisionClient = (receiptScanner as any).visionClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('OCR Text Extraction Accuracy', () => {
    it('should extract vendor information with >90% accuracy from florist receipt', async () => {
      // Mock OCR extraction
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const mockFile = new File(['mock'], 'florist_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.vendor).toBe(EXPECTED_EXTRACTIONS.FLORIST_RECEIPT.vendor);
      expect(result.data?.confidence).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.VENDOR_EXTRACTION);
    });

    it('should extract total amount with >95% accuracy from venue receipt', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.VENUE_RECEIPT);

      const mockFile = new File(['mock'], 'venue_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.totalAmount).toBe(EXPECTED_EXTRACTIONS.VENUE_RECEIPT.totalAmount);
      expect(result.data?.confidence).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.AMOUNT_EXTRACTION);
    });

    it('should extract dates with >85% accuracy from photographer receipt', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT);

      const mockFile = new File(['mock'], 'photographer_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.date).toEqual(EXPECTED_EXTRACTIONS.PHOTOGRAPHER_RECEIPT.date);
      expect(result.data?.confidence).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.DATE_EXTRACTION);
    });

    it('should handle poor quality OCR with appropriate low confidence', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.POOR_QUALITY_RECEIPT);

      const mockFile = new File(['mock'], 'poor_quality.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBeLessThanOrEqual(ACCURACY_THRESHOLDS.POOR_QUALITY_HANDLING);
      expect(result.data?.vendor).toBe('Unknown Vendor'); // Fallback for poor extraction
    });
  });

  describe('Receipt Data Extraction Validation', () => {
    it('should extract line items with >80% accuracy from catering receipt', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.CATERING_RECEIPT);

      const mockFile = new File(['mock'], 'catering_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
      expect(result.data?.items.length).toBeGreaterThan(0);

      // Validate specific items were extracted
      const hasPlatedDinner = result.data?.items.some(item => 
        item.description.toLowerCase().includes('plated dinner')
      );
      const hasCocktailHour = result.data?.items.some(item => 
        item.description.toLowerCase().includes('cocktail hour')
      );
      
      expect(hasPlatedDinner || hasCocktailHour).toBe(true);
      expect(result.data?.confidence).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.ITEM_EXTRACTION);
    });

    it('should validate tax calculations and amounts', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const mockFile = new File(['mock'], 'florist_receipt.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.taxAmount).toBe(EXPECTED_EXTRACTIONS.FLORIST_RECEIPT.taxAmount);
      
      // Validate tax calculation (8.5% of $680 = $57.80)
      const expectedTax = Math.round(680.00 * 0.085 * 100) / 100;
      expect(result.data?.taxAmount).toBeCloseTo(expectedTax, 2);
    });

    it('should extract payment method information accurately', async () => {
      const testCases = [
        { 
          receipt: SAMPLE_RECEIPTS.FLORIST_RECEIPT, 
          expectedMethod: 'CARD',
          description: 'credit card' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT, 
          expectedMethod: 'CASH',
          description: 'cash payment' 
        }
      ];

      for (const testCase of testCases) {
        mockVisionClient.extractText.mockResolvedValue(testCase.receipt);

        const mockFile = new File(['mock'], `${testCase.description}.jpg`, { type: 'image/jpeg' });
        const result = await receiptScanner.scanReceipt(mockFile);

        expect(result.success).toBe(true);
        expect(result.data?.paymentMethod).toBe(testCase.expectedMethod);
      }
    });

    it('should extract receipt numbers and invoice IDs', async () => {
      const testCases = [
        { 
          receipt: SAMPLE_RECEIPTS.FLORIST_RECEIPT, 
          expectedNumber: 'FB-2024-0315-001' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.VENUE_RECEIPT, 
          expectedNumber: 'GWV-2024-0320' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT, 
          expectedNumber: 'CLP-240310-W001' 
        }
      ];

      for (const testCase of testCases) {
        mockVisionClient.extractText.mockResolvedValue(testCase.receipt);

        const mockFile = new File(['mock'], 'receipt.jpg', { type: 'image/jpeg' });
        const result = await receiptScanner.scanReceipt(mockFile);

        expect(result.success).toBe(true);
        expect(result.data?.receiptNumber).toBe(testCase.expectedNumber);
      }
    });
  });

  describe('Wedding Category Classification Accuracy', () => {
    it('should classify wedding vendor categories with >90% accuracy', async () => {
      const categoryTests = [
        { 
          receipt: SAMPLE_RECEIPTS.FLORIST_RECEIPT, 
          expectedCategory: 'flowers',
          description: 'florist receipt' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.VENUE_RECEIPT, 
          expectedCategory: 'venue',
          description: 'venue receipt' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT, 
          expectedCategory: 'photography',
          description: 'photography receipt' 
        },
        { 
          receipt: SAMPLE_RECEIPTS.CATERING_RECEIPT, 
          expectedCategory: 'catering',
          description: 'catering receipt' 
        }
      ];

      for (const test of categoryTests) {
        mockVisionClient.extractText.mockResolvedValue(test.receipt);

        const mockFile = new File(['mock'], `${test.description}.jpg`, { type: 'image/jpeg' });
        const result = await receiptScanner.scanReceipt(mockFile);

        expect(result.success).toBe(true);
        expect(result.data?.category).toBe(test.expectedCategory);
        expect(result.data?.confidence).toBeGreaterThanOrEqual(
          ACCURACY_THRESHOLDS.CATEGORY_CLASSIFICATION
        );
      }
    });

    it('should handle unknown categories gracefully', async () => {
      const unknownReceipt = `
        Random Business Name
        Some Random Service: $100.00
        Total: $100.00
      `;
      
      mockVisionClient.extractText.mockResolvedValue(unknownReceipt);

      const mockFile = new File(['mock'], 'unknown.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('other');
    });
  });

  describe('Confidence Score Calculation Validation', () => {
    it('should calculate accurate confidence scores based on extraction success', async () => {
      // Test high confidence scenario
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const mockFile = new File(['mock'], 'high_quality.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.OVERALL_CONFIDENCE);

      // Validate confidence factors
      expect(result.data?.vendor).toBeTruthy();
      expect(result.data?.totalAmount).toBeGreaterThan(0);
      expect(result.data?.date).toBeTruthy();
      expect(result.data?.items.length).toBeGreaterThan(0);
    });

    it('should validate confidence calculation components', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const mockFile = new File(['mock'], 'confidence_test.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      const receiptData = result.data!;
      
      // Manually calculate expected confidence
      let expectedConfidence = 0;
      let factors = 0;

      // Vendor factor (0.2)
      if (receiptData.vendor && receiptData.vendor !== 'Unknown Vendor') {
        expectedConfidence += 0.2;
        factors++;
      }

      // Date factor (0.2)  
      if (receiptData.date) {
        expectedConfidence += 0.2;
        factors++;
      }

      // Total amount factor (0.3)
      if (receiptData.totalAmount > 0) {
        expectedConfidence += 0.3;
        factors++;
      }

      // Items factor (0.2)
      if (receiptData.items.length > 0) {
        expectedConfidence += 0.2;
        factors++;
      }

      // Items sum validation (0.1)
      if (receiptData.items.length > 0 && receiptData.totalAmount > 0) {
        const itemsSum = receiptData.items.reduce((sum, item) => sum + item.amount, 0);
        const taxAndTip = (receiptData.taxAmount || 0) + (receiptData.tipAmount || 0);
        const calculatedTotal = itemsSum + taxAndTip;
        const difference = Math.abs(calculatedTotal - receiptData.totalAmount);
        const percentDiff = difference / receiptData.totalAmount;
        
        if (percentDiff < 0.1) {
          expectedConfidence += 0.1;
          factors++;
        }
      }

      const calculatedConfidence = factors > 0 ? expectedConfidence : 0;
      
      expect(receiptData.confidence).toBeCloseTo(calculatedConfidence, 2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle OCR service failures gracefully', async () => {
      mockVisionClient.extractText.mockRejectedValue(new Error('OCR service unavailable'));

      const mockFile = new File(['mock'], 'error_test.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OCR service unavailable');
      expect(result.data).toBeUndefined();
    });

    it('should handle empty or corrupted OCR text', async () => {
      mockVisionClient.extractText.mockResolvedValue('');

      const mockFile = new File(['mock'], 'empty_ocr.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No text found in image');
    });

    it('should validate file types and sizes', async () => {
      const invalidFile = new File(['mock'], 'invalid.txt', { type: 'text/plain' });
      
      // This should be handled by the UI component, but service should handle gracefully
      const result = await receiptScanner.scanReceipt(invalidFile);
      
      // Service should still attempt processing but may have poor results
      expect(result.success).toBeDefined();
    });

    it('should handle receipts with missing critical information', async () => {
      const incompleteReceipt = `
        Some Business
        Item 1: $50.00
        Thank you
      `;
      
      mockVisionClient.extractText.mockResolvedValue(incompleteReceipt);

      const mockFile = new File(['mock'], 'incomplete.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBeLessThan(0.8); // Should have lower confidence
      expect(result.data?.vendor).toBeDefined(); // Should have some vendor name
      expect(result.data?.totalAmount).toBeGreaterThan(0); // Should extract some amount
    });
  });

  describe('Manual Correction Methods', () => {
    it('should support manual vendor correction', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const mockFile = new File(['mock'], 'correction_test.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      
      const correctedData = receiptScanner.correctVendor(result.data!, 'Corrected Vendor Name');
      expect(correctedData.vendor).toBe('Corrected Vendor Name');
      expect(correctedData.totalAmount).toBe(result.data!.totalAmount); // Other fields unchanged
    });

    it('should support manual total amount correction', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.VENUE_RECEIPT);

      const mockFile = new File(['mock'], 'amount_correction.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      
      const correctedData = receiptScanner.correctTotal(result.data!, 5000.00);
      expect(correctedData.totalAmount).toBe(5000.00);
      expect(correctedData.vendor).toBe(result.data!.vendor); // Other fields unchanged
    });

    it('should support manual date correction', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT);

      const mockFile = new File(['mock'], 'date_correction.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      
      const correctedDate = new Date('2024-04-15');
      const correctedData = receiptScanner.correctDate(result.data!, correctedDate);
      expect(correctedData.date).toEqual(correctedDate);
      expect(correctedData.vendor).toBe(result.data!.vendor); // Other fields unchanged
    });

    it('should support manual category correction', async () => {
      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.CATERING_RECEIPT);

      const mockFile = new File(['mock'], 'category_correction.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      
      const correctedData = receiptScanner.correctCategory(result.data!, 'venue');
      expect(correctedData.category).toBe('venue');
      expect(correctedData.totalAmount).toBe(result.data!.totalAmount); // Other fields unchanged
    });
  });

  describe('Performance Requirements', () => {
    it('should process typical receipt within performance thresholds', async () => {
      mockVisionClient.extractText.mockImplementation(() => {
        // Simulate realistic OCR processing time
        return new Promise(resolve => {
          setTimeout(() => resolve(SAMPLE_RECEIPTS.FLORIST_RECEIPT), 500);
        });
      });

      const startTime = Date.now();
      const mockFile = new File(['mock'], 'performance_test.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(3000); // Should complete in under 3 seconds
    });

    it('should handle concurrent receipt processing', async () => {
      mockVisionClient.extractText
        .mockResolvedValueOnce(SAMPLE_RECEIPTS.FLORIST_RECEIPT)
        .mockResolvedValueOnce(SAMPLE_RECEIPTS.VENUE_RECEIPT)
        .mockResolvedValueOnce(SAMPLE_RECEIPTS.PHOTOGRAPHER_RECEIPT);

      const promises = [
        receiptScanner.scanReceipt(new File(['mock'], 'receipt1.jpg', { type: 'image/jpeg' })),
        receiptScanner.scanReceipt(new File(['mock'], 'receipt2.jpg', { type: 'image/jpeg' })),
        receiptScanner.scanReceipt(new File(['mock'], 'receipt3.jpg', { type: 'image/jpeg' }))
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data?.confidence).toBeGreaterThan(0.5);
      });
    });
  });

  describe('OCR URL Processing', () => {
    it('should scan receipts from storage URLs', async () => {
      // Mock fetch to return image data
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['mock image data']))
      } as any);

      mockVisionClient.extractText.mockResolvedValue(SAMPLE_RECEIPTS.FLORIST_RECEIPT);

      const result = await receiptScanner.scanReceiptFromUrl('https://storage.example.com/receipt.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.vendor).toBe(EXPECTED_EXTRACTIONS.FLORIST_RECEIPT.vendor);
      expect(global.fetch).toHaveBeenCalledWith('https://storage.example.com/receipt.jpg');
    });

    it('should handle URL fetch failures', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await receiptScanner.scanReceiptFromUrl('https://invalid.com/receipt.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch image from URL');
    });
  });
});

describe('Receipt Scanner Integration with Wedding Budget Categories', () => {
  let receiptScanner: ReceiptScannerService;
  let mockVisionClient: any;

  beforeEach(() => {
    receiptScanner = new ReceiptScannerService();
    mockVisionClient = (receiptScanner as any).visionClient;
  });

  it('should integrate with wedding budget categories for accurate classification', async () => {
    const weddingCategoryTests = [
      {
        receipt: `Bridal Boutique\nWedding Dress: $1,200\nAlterations: $150\nTotal: $1,350`,
        expectedCategory: 'attire',
        keywords: ['dress', 'bridal']
      },
      {
        receipt: `Sound & Light Pro\nDJ Service: $800\nSound System: $200\nTotal: $1,000`,
        expectedCategory: 'music',
        keywords: ['dj', 'sound']
      },
      {
        receipt: `Luxury Limousines\nWedding Transport: $400\nGratuity: $80\nTotal: $480`,
        expectedCategory: 'transportation',
        keywords: ['limo', 'transport']
      },
      {
        receipt: `Glam Beauty Salon\nBridal Makeup: $300\nHair Styling: $200\nTotal: $500`,
        expectedCategory: 'beauty',
        keywords: ['makeup', 'hair', 'beauty']
      }
    ];

    for (const test of weddingCategoryTests) {
      mockVisionClient.extractText.mockResolvedValue(test.receipt);

      const mockFile = new File(['mock'], 'category_test.jpg', { type: 'image/jpeg' });
      const result = await receiptScanner.scanReceipt(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.category).toBe(test.expectedCategory);
      
      // Verify that classification was based on relevant keywords
      const receiptText = test.receipt.toLowerCase();
      const hasRelevantKeywords = test.keywords.some(keyword => 
        receiptText.includes(keyword)
      );
      expect(hasRelevantKeywords).toBe(true);
    }
  });

  it('should handle complex receipts with multiple wedding categories', async () => {
    const complexReceipt = `
      Wedding Central Services
      123 Bridal Way
      
      Date: 2024-03-15
      Invoice: WCS-2024-001
      
      Photography Package: $1,500.00
      Videography Add-on: $800.00
      DJ Service: $600.00
      Floral Centerpieces: $400.00
      
      Subtotal: $3,300.00
      Tax (7%): $231.00
      Total: $3,531.00
      
      Payment: Credit Card
    `;

    mockVisionClient.extractText.mockResolvedValue(complexReceipt);

    const mockFile = new File(['mock'], 'complex_receipt.jpg', { type: 'image/jpeg' });
    const result = await receiptScanner.scanReceipt(mockFile);

    expect(result.success).toBe(true);
    
    // Should classify based on the dominant category or first detected
    expect(['photography', 'music', 'flowers']).toContain(result.data?.category);
    expect(result.data?.totalAmount).toBe(3531.00);
    expect(result.data?.taxAmount).toBe(231.00);
    expect(result.data?.items.length).toBeGreaterThanOrEqual(4);
  });
});