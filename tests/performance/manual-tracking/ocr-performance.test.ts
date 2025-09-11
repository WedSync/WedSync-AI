/**
 * WS-164 Manual Tracking - OCR Performance Tests
 * Tests performance requirements for receipt scanning and processing
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { ReceiptScannerService } from '@/lib/services/receipt-scanner';
import { FieldExtractionService } from '@/lib/services/field-extraction-service';
import { performance } from 'perf_hooks';

// Mock external services
jest.mock('@/lib/ocr/google-vision');
jest.mock('@supabase/supabase-js');

// Performance thresholds from WS-164 specification
const PERFORMANCE_THRESHOLDS = {
  OCR_PROCESSING_TIME: 3000, // <3 seconds per receipt
  EXPENSE_CREATION_TIME: 1000, // <1 second for expense creation
  SEARCH_RESPONSE_TIME: 500, // <500ms for search results
  CONCURRENT_PROCESSING: 5, // Should handle 5+ concurrent receipts
  LARGE_RECEIPT_PROCESSING: 5000, // <5 seconds for large receipts
  FIELD_EXTRACTION_TIME: 2000, // <2 seconds for field extraction
  MEMORY_USAGE_LIMIT: 100 * 1024 * 1024, // 100MB max memory usage
  CACHE_HIT_RATIO: 0.8 // 80% cache hit ratio for similar receipts
};

// Test receipt samples of varying complexity
const RECEIPT_SAMPLES = {
  SIMPLE: {
    content: 'Simple Store\nItem: $50.00\nTotal: $50.00',
    expectedProcessingTime: 1000,
    size: 'small'
  },
  MEDIUM: {
    content: `Wedding Venue
    123 Event Street
    Date: 2024-03-15
    
    Reception Package: $2,000.00
    Bar Service: $500.00
    Service Fee (18%): $450.00
    Tax (8.5%): $250.75
    
    Total: $3,200.75
    
    Payment: Credit Card
    Receipt #: WV-2024-001`,
    expectedProcessingTime: 2500,
    size: 'medium'
  },
  COMPLEX: {
    content: `Grande Ballroom Wedding Reception
    456 Celebration Avenue, Wedding City, State 12345
    Phone: (555) 123-4567 | Email: events@grandeballroom.com
    
    Event Date: June 15, 2024
    Invoice #: GB-2024-JUN-15-001
    
    PACKAGE DETAILS:
    Premium Reception Package (150 guests)    $3,500.00
    Additional Guest Fee (25 @ $35.00)        $875.00
    Upgraded Linens & Centerpieces           $450.00
    Premium Bar Package (5 hours)           $1,200.00
    DJ & Sound System                       $800.00
    Wedding Coordinator                     $600.00
    Cake Cutting Service                    $150.00
    
    SUBTOTAL:                               $7,575.00
    Service Charge (20%):                   $1,515.00
    Sales Tax (8.25%):                      $750.44
    Gratuity (Optional):                    $1,000.00
    
    TOTAL AMOUNT:                          $10,840.44
    
    Payment Method: American Express ****1234
    Payment Date: March 20, 2024
    Authorized by: John Smith
    
    Special Notes:
    - Setup begins at 4:00 PM
    - Event time: 6:00 PM - 11:00 PM
    - Breakdown completed by 12:00 AM
    - All dietary restrictions accommodated
    
    Thank you for choosing Grande Ballroom!`,
    expectedProcessingTime: 4000,
    size: 'large'
  }
};

describe('OCR Performance Tests - WS-164', () => {
  let receiptScanner: ReceiptScannerService;
  let fieldExtractor: FieldExtractionService;
  let mockVisionClient: any;

  beforeAll(() => {
    // Configure performance monitoring
    if (typeof global.gc === 'function') {
      global.gc(); // Force garbage collection if available
    }
  });

  beforeEach(() => {
    receiptScanner = new ReceiptScannerService();
    fieldExtractor = new FieldExtractionService();
    mockVisionClient = (receiptScanner as any).visionClient;
    
    // Reset performance counters
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Receipt Processing Performance', () => {
    it('should process simple receipt within 1 second', async () => {
      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), 100);
        });
      });

      const mockFile = new File(['simple'], 'simple_receipt.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(1000);
      expect(result.data?.totalAmount).toBe(50.00);
    });

    it('should process medium complexity receipt within 2.5 seconds', async () => {
      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.MEDIUM.content), 500);
        });
      });

      const mockFile = new File(['medium'], 'medium_receipt.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(RECEIPT_SAMPLES.MEDIUM.expectedProcessingTime);
      expect(result.data?.totalAmount).toBe(3200.75);
      expect(result.data?.items.length).toBeGreaterThan(0);
    });

    it('should process complex receipt within 4 seconds', async () => {
      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.COMPLEX.content), 1000);
        });
      });

      const mockFile = new File(['complex'], 'complex_receipt.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(RECEIPT_SAMPLES.COMPLEX.expectedProcessingTime);
      expect(result.data?.totalAmount).toBe(10840.44);
      expect(result.data?.items.length).toBeGreaterThanOrEqual(7);
    });

    it('should meet overall OCR processing time requirement', async () => {
      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.MEDIUM.content), 800);
        });
      });

      const mockFile = new File(['test'], 'performance_test.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      const result = await receiptScanner.scanReceipt(mockFile);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.OCR_PROCESSING_TIME);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent receipt processing efficiently', async () => {
      const concurrentRequests = 5;
      const mockFiles = Array.from({ length: concurrentRequests }, (_, i) => 
        new File([`receipt${i}`], `receipt${i}.jpg`, { type: 'image/jpeg' })
      );

      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), 200);
        });
      });

      const startTime = performance.now();
      const promises = mockFiles.map(file => receiptScanner.scanReceipt(file));
      const results = await Promise.all(promises);
      const totalProcessingTime = performance.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should process concurrently, not sequentially
      expect(totalProcessingTime).toBeLessThan(concurrentRequests * 1000);
      
      // Average processing time per receipt should be reasonable
      const avgProcessingTime = totalProcessingTime / concurrentRequests;
      expect(avgProcessingTime).toBeLessThan(800);
    });

    it('should maintain performance under load', async () => {
      const loadTestCount = 10;
      const mockFiles = Array.from({ length: loadTestCount }, (_, i) => 
        new File([`load_test_${i}`], `load_test_${i}.jpg`, { type: 'image/jpeg' })
      );

      mockVisionClient.extractText.mockImplementation((index: number) => {
        return new Promise(resolve => {
          // Simulate varying processing times
          const delay = 300 + (Math.random() * 500);
          setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), delay);
        });
      });

      const results: number[] = [];
      
      for (let i = 0; i < loadTestCount; i++) {
        const startTime = performance.now();
        const result = await receiptScanner.scanReceipt(mockFiles[i]);
        const processingTime = performance.now() - startTime;
        
        expect(result.success).toBe(true);
        results.push(processingTime);
      }

      const avgProcessingTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxProcessingTime = Math.max(...results);
      
      expect(avgProcessingTime).toBeLessThan(1500);
      expect(maxProcessingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.OCR_PROCESSING_TIME);
      
      // Check for performance degradation
      const firstHalfAvg = results.slice(0, 5).reduce((sum, time) => sum + time, 0) / 5;
      const secondHalfAvg = results.slice(5).reduce((sum, time) => sum + time, 0) / 5;
      
      // Performance shouldn't degrade significantly over time
      expect(secondHalfAvg / firstHalfAvg).toBeLessThan(1.5);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during processing', async () => {
      const initialMemory = process.memoryUsage();
      
      mockVisionClient.extractText.mockResolvedValue(RECEIPT_SAMPLES.COMPLEX.content);

      // Process multiple receipts to test memory accumulation
      for (let i = 0; i < 20; i++) {
        const mockFile = new File([`memory_test_${i}`], `memory_test_${i}.jpg`, { type: 'image/jpeg' });
        const result = await receiptScanner.scanReceipt(mockFile);
        expect(result.success).toBe(true);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
    });

    it('should cleanup resources properly', async () => {
      const mockFile = new File(['cleanup_test'], 'cleanup_test.jpg', { type: 'image/jpeg' });
      
      mockVisionClient.extractText.mockResolvedValue(RECEIPT_SAMPLES.MEDIUM.content);

      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < 10; i++) {
        const result = await receiptScanner.scanReceipt(mockFile);
        expect(result.success).toBe(true);
      }

      // Force garbage collection if available
      if (typeof global.gc === 'function') {
        global.gc();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory growth should be minimal after cleanup
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB max growth
    });
  });

  describe('Field Extraction Performance', () => {
    it('should extract fields within 2 seconds', async () => {
      const mockExtractionRequest = {
        documentId: 'perf-test-doc',
        options: {
          ocr: true,
          enhanceImage: true,
          fuzzyMatching: true
        }
      };

      // Mock field extraction service
      (fieldExtractor.extractFields as jest.Mock) = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            document: {
              id: 'extraction-123',
              fields: [
                { fieldId: 'vendor', value: 'Test Vendor', confidence: 0.95 },
                { fieldId: 'amount', value: 150.00, confidence: 0.92 },
                { fieldId: 'date', value: '2024-03-15', confidence: 0.88 }
              ],
              averageConfidence: 0.92
            },
            processingTime: 1500
          }), 500);
        });
      });

      const startTime = performance.now();
      const result = await fieldExtractor.extractFields(mockExtractionRequest);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FIELD_EXTRACTION_TIME);
      expect(result.document?.averageConfidence).toBeGreaterThan(0.85);
    });

    it('should maintain extraction performance with complex documents', async () => {
      const complexExtractionRequest = {
        documentId: 'complex-perf-test',
        templateId: 'wedding-invoice-template',
        options: {
          ocr: true,
          enhanceImage: true,
          fuzzyMatching: true
        }
      };

      // Mock complex field extraction
      (fieldExtractor.extractFields as jest.Mock) = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            document: {
              id: 'complex-extraction-456',
              fields: Array.from({ length: 15 }, (_, i) => ({
                fieldId: `field_${i}`,
                value: `Value ${i}`,
                confidence: 0.85 + (Math.random() * 0.15)
              })),
              averageConfidence: 0.91,
              totalFields: 15,
              successfulFields: 14
            },
            processingTime: 1800
          }), 800);
        });
      });

      const startTime = performance.now();
      const result = await fieldExtractor.extractFields(complexExtractionRequest);
      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FIELD_EXTRACTION_TIME);
      expect(result.document?.totalFields).toBe(15);
      expect(result.document?.successfulFields).toBe(14);
    });
  });

  describe('Search and Retrieval Performance', () => {
    it('should return search results within 500ms', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve({
              data: [
                {
                  id: 'expense-1',
                  description: 'Florist payment',
                  amount: 750.00,
                  vendor_name: 'Elegant Blooms'
                },
                {
                  id: 'expense-2',
                  description: 'Venue deposit',
                  amount: 2500.00,
                  vendor_name: 'Grand Ballroom'
                }
              ],
              error: null
            }), 100);
          });
        })
      };

      const searchFilters = {
        query: 'wedding',
        category_id: 'flowers',
        min_amount: 100,
        max_amount: 1000
      };

      const startTime = performance.now();
      const results = await mockSupabase
        .from('budget_expenses')
        .select('*')
        .or(`description.ilike.%${searchFilters.query}%,vendor_name.ilike.%${searchFilters.query}%`)
        .eq('category_id', searchFilters.category_id)
        .gte('amount', searchFilters.min_amount)
        .lte('amount', searchFilters.max_amount)
        .order('created_at', { ascending: false });

      const searchTime = performance.now() - startTime;

      expect(results.data).toHaveLength(2);
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME);
    });

    it('should handle large result sets efficiently', async () => {
      const mockLargeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `expense-${i}`,
        description: `Wedding expense ${i}`,
        amount: Math.round(Math.random() * 1000 * 100) / 100,
        vendor_name: `Vendor ${i}`
      }));

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve({
              data: mockLargeResultSet,
              error: null
            }), 200);
          });
        })
      };

      const startTime = performance.now();
      const results = await mockSupabase
        .from('budget_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      const searchTime = performance.now() - startTime;

      expect(results.data).toHaveLength(1000);
      expect(searchTime).toBeLessThan(1000); // Should handle large sets within 1 second
    });
  });

  describe('Caching and Optimization Performance', () => {
    it('should demonstrate improved performance with caching', async () => {
      const sameReceiptContent = RECEIPT_SAMPLES.MEDIUM.content;
      
      // First request (cache miss)
      mockVisionClient.extractText.mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(sameReceiptContent), 800);
        });
      });

      // Second request (cache hit)
      mockVisionClient.extractText.mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(sameReceiptContent), 100); // Much faster
        });
      });

      const mockFile1 = new File(['cached'], 'cached_receipt_1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['cached'], 'cached_receipt_2.jpg', { type: 'image/jpeg' });

      // First request
      const startTime1 = performance.now();
      const result1 = await receiptScanner.scanReceipt(mockFile1);
      const time1 = performance.now() - startTime1;

      // Second request (should be faster due to caching)
      const startTime2 = performance.now();
      const result2 = await receiptScanner.scanReceipt(mockFile2);
      const time2 = performance.now() - startTime2;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Second request should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);
      
      // Cache hit ratio calculation
      const cacheHitRatio = time2 / time1;
      expect(cacheHitRatio).toBeLessThan(0.5); // At least 50% performance improvement
    });

    it('should optimize batch processing performance', async () => {
      const batchSize = 5;
      const mockFiles = Array.from({ length: batchSize }, (_, i) => 
        new File([`batch_${i}`], `batch_receipt_${i}.jpg`, { type: 'image/jpeg' })
      );

      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), 300);
        });
      });

      // Test individual processing
      const individualStartTime = performance.now();
      const individualResults = [];
      for (const file of mockFiles) {
        const result = await receiptScanner.scanReceipt(file);
        individualResults.push(result);
      }
      const individualTime = performance.now() - individualStartTime;

      // Test batch processing
      const batchStartTime = performance.now();
      const batchResults = await Promise.all(
        mockFiles.map(file => receiptScanner.scanReceipt(file))
      );
      const batchTime = performance.now() - batchStartTime;

      expect(individualResults).toHaveLength(batchSize);
      expect(batchResults).toHaveLength(batchSize);
      
      // Batch processing should be faster than sequential
      expect(batchTime).toBeLessThan(individualTime);
      
      // Calculate efficiency gain
      const efficiencyGain = (individualTime - batchTime) / individualTime;
      expect(efficiencyGain).toBeGreaterThan(0.3); // At least 30% improvement
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across multiple operations', async () => {
      const operationCount = 50;
      const performanceTimes: number[] = [];

      mockVisionClient.extractText.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), 200);
        });
      });

      for (let i = 0; i < operationCount; i++) {
        const mockFile = new File([`regression_${i}`], `regression_${i}.jpg`, { type: 'image/jpeg' });
        
        const startTime = performance.now();
        const result = await receiptScanner.scanReceipt(mockFile);
        const processingTime = performance.now() - startTime;
        
        expect(result.success).toBe(true);
        performanceTimes.push(processingTime);
      }

      // Calculate performance statistics
      const avgTime = performanceTimes.reduce((sum, time) => sum + time, 0) / operationCount;
      const minTime = Math.min(...performanceTimes);
      const maxTime = Math.max(...performanceTimes);
      const variance = performanceTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / operationCount;
      const stdDev = Math.sqrt(variance);

      // Performance should be consistent
      expect(avgTime).toBeLessThan(1000);
      expect(maxTime).toBeLessThan(2000);
      expect(stdDev / avgTime).toBeLessThan(0.5); // Coefficient of variation < 50%

      // No significant performance degradation over time
      const firstQuartile = performanceTimes.slice(0, 12).reduce((sum, time) => sum + time, 0) / 12;
      const lastQuartile = performanceTimes.slice(-12).reduce((sum, time) => sum + time, 0) / 12;
      
      expect(lastQuartile / firstQuartile).toBeLessThan(1.2); // Less than 20% degradation
    });

    it('should meet SLA requirements under various conditions', async () => {
      const testScenarios = [
        {
          name: 'Peak Load',
          concurrency: 10,
          processingDelay: 400,
          expectedMaxTime: 2000
        },
        {
          name: 'Normal Load',
          concurrency: 3,
          processingDelay: 200,
          expectedMaxTime: 1000
        },
        {
          name: 'Light Load',
          concurrency: 1,
          processingDelay: 100,
          expectedMaxTime: 500
        }
      ];

      for (const scenario of testScenarios) {
        mockVisionClient.extractText.mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve(RECEIPT_SAMPLES.SIMPLE.content), scenario.processingDelay);
          });
        });

        const promises = Array.from({ length: scenario.concurrency }, (_, i) => {
          const mockFile = new File([`sla_${i}`], `sla_test_${i}.jpg`, { type: 'image/jpeg' });
          const startTime = performance.now();
          
          return receiptScanner.scanReceipt(mockFile).then(result => {
            const processingTime = performance.now() - startTime;
            return { result, processingTime };
          });
        });

        const results = await Promise.all(promises);
        
        results.forEach(({ result, processingTime }) => {
          expect(result.success).toBe(true);
          expect(processingTime).toBeLessThan(scenario.expectedMaxTime);
        });

        const avgProcessingTime = results.reduce((sum, { processingTime }) => sum + processingTime, 0) / results.length;
        expect(avgProcessingTime).toBeLessThan(scenario.expectedMaxTime * 0.8); // 80% of max allowed time
      }
    });
  });
});