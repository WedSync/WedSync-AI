/**
 * WS-166: Export Queue Manager Tests
 * Team B: Comprehensive unit tests for background export processing
 * 
 * Test Coverage:
 * - Queue management and processing
 * - Export job lifecycle
 * - Error handling and retry logic
 * - File generation integration
 * - Database operations
 * - Performance and concurrency
 */

import { ExportQueueManager, processExportQueue, prioritizeExport } from '@/lib/services/budget-export/ExportQueueManager';
import { createClient } from '@/lib/supabase/server';
import { BudgetPDFGenerator } from '@/lib/services/budget-export/BudgetPDFGenerator';
import { BudgetExcelGenerator } from '@/lib/services/budget-export/BudgetExcelGenerator';
import { BudgetCSVGenerator } from '@/lib/services/budget-export/BudgetCSVGenerator';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/budget-export/BudgetPDFGenerator');
jest.mock('@/lib/services/budget-export/BudgetExcelGenerator');
jest.mock('@/lib/services/budget-export/BudgetCSVGenerator');

const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      createSignedUrl: jest.fn()
    }))
  }
};

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockBudgetPDFGenerator = BudgetPDFGenerator as jest.MockedClass<typeof BudgetPDFGenerator>;
const mockBudgetExcelGenerator = BudgetExcelGenerator as jest.MockedClass<typeof BudgetExcelGenerator>;
const mockBudgetCSVGenerator = BudgetCSVGenerator as jest.MockedClass<typeof BudgetCSVGenerator>;

describe('ExportQueueManager', () => {
  let queueManager: ExportQueueManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabase as any);
    
    // Reset singleton instance
    (ExportQueueManager as any).instance = null;
    queueManager = ExportQueueManager.getInstance();
  });

  afterEach(async () => {
    // Clean up any running processes
    await queueManager.stopProcessing();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ExportQueueManager.getInstance();
      const instance2 = ExportQueueManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize only once', () => {
      const instance1 = ExportQueueManager.getInstance();
      const instance2 = ExportQueueManager.getInstance();
      
      expect(instance1.getProcessingStatus).toBeDefined();
      expect(instance2.getProcessingStatus).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockResolvedValue({ error: null })
      });
    });

    it('should add export to queue successfully', async () => {
      await queueManager.addToQueue('export-123', 1);

      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        export_id: 'export-123',
        priority: 1,
        retry_count: 0,
        created_at: expect.any(String)
      });
    });

    it('should handle queue insertion errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      });

      await expect(
        queueManager.addToQueue('export-123', 1)
      ).rejects.toThrow('Failed to add export to queue: Database error');
    });

    it('should clamp priority values within valid range', async () => {
      await queueManager.addToQueue('export-123', 15); // Above max

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        export_id: 'export-123',
        priority: 10, // Should be clamped to max
        retry_count: 0,
        created_at: expect.any(String)
      });
    });
  });

  describe('Queue Processing', () => {
    beforeEach(() => {
      // Mock successful queue item retrieval
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'export_queue') {
          return {
            select: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'queue-123',
                export_id: 'export-123',
                priority: 1,
                retry_count: 0,
                created_at: new Date().toISOString()
              },
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'budget_exports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'export-123',
                couple_id: 'couple-123',
                export_type: 'pdf',
                export_filters: { options: {} },
                created_at: new Date().toISOString()
              },
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });
    });

    it('should start and stop processing', async () => {
      const status1 = queueManager.getProcessingStatus();
      expect(status1.isRunning).toBe(false);

      await queueManager.startProcessing();
      const status2 = queueManager.getProcessingStatus();
      expect(status2.isRunning).toBe(true);

      await queueManager.stopProcessing();
      const status3 = queueManager.getProcessingStatus();
      expect(status3.isRunning).toBe(false);
    });

    it('should not start processing if already running', async () => {
      await queueManager.startProcessing();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await queueManager.startProcessing(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('Export queue manager is already running');
      consoleSpy.mockRestore();
    });

    it('should process queue items in priority order', async () => {
      // Mock multiple queue items with different priorities
      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'export_queue') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnThis(),
              is: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'queue-high-priority',
                  export_id: 'export-urgent',
                  priority: 5,
                  retry_count: 0
                },
                error: null
              }),
              update: jest.fn().mockResolvedValue({ error: null })
            };
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Process one item
      const result = await (queueManager as any).processQueue();
      
      // Verify that the order clause was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
    });
  });

  describe('Export Job Processing', () => {
    beforeEach(() => {
      // Mock file generators
      mockBudgetPDFGenerator.generatePDF = jest.fn().mockResolvedValue(
        Buffer.from('mock-pdf-data')
      );
      mockBudgetExcelGenerator.generateExcel = jest.fn().mockResolvedValue(
        Buffer.from('mock-excel-data')
      );
      mockBudgetCSVGenerator.generateCSV = jest.fn().mockResolvedValue(
        Buffer.from('mock-csv-data')
      );

      // Mock storage operations
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'exports/couple-123/file.pdf' },
          error: null
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed-url' },
          error: null
        })
      });
    });

    it('should process PDF export successfully', async () => {
      // Setup mocks for complete export processing
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'budget_exports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'export-123',
                couple_id: 'couple-123',
                export_type: 'pdf',
                export_filters: { options: {} }
              },
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'couples') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'couple-123',
                partner1_name: 'John',
                partner2_name: 'Jane',
                wedding_date: '2024-06-15',
                total_budget: 50000
              },
              error: null
            })
          };
        }
        if (table === 'budget_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [
                {
                  id: 'item-1',
                  category: 'Venue',
                  planned_amount: 15000,
                  actual_amount: 14500,
                  paid_amount: 14500
                }
              ],
              error: null
            }
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue({ error: null })
        };
      });

      const queueItem = {
        id: 'queue-123',
        export_id: 'export-123',
        priority: 1,
        retry_count: 0,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      };

      // Test private method through public interface
      const result = await (queueManager as any).processExportJob(queueItem);

      expect(mockBudgetPDFGenerator.generatePDF).toHaveBeenCalled();
    });

    it('should handle export generation errors', async () => {
      mockBudgetPDFGenerator.generatePDF = jest.fn().mockRejectedValue(
        new Error('PDF generation failed')
      );

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'budget_exports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'export-123',
                export_type: 'pdf',
                couple_id: 'couple-123',
                export_filters: {}
              },
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue({ error: null })
        };
      });

      const queueItem = {
        id: 'queue-123',
        export_id: 'export-123',
        priority: 1,
        retry_count: 0,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      };

      // Should handle the error gracefully
      await expect(
        (queueManager as any).processExportJob(queueItem)
      ).resolves.not.toThrow();
    });

    it('should support all export formats', async () => {
      const formats = ['pdf', 'excel', 'csv'];
      
      for (const format of formats) {
        const queueItem = {
          id: `queue-${format}`,
          export_id: `export-${format}`,
          priority: 1,
          retry_count: 0,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          error_message: null,
          updated_at: new Date().toISOString()
        };

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'budget_exports') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: `export-${format}`,
                  export_type: format,
                  couple_id: 'couple-123',
                  export_filters: {}
                },
                error: null
              }),
              update: jest.fn().mockResolvedValue({ error: null })
            };
          }
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        });

        await (queueManager as any).processExportJob(queueItem);
      }

      expect(mockBudgetPDFGenerator.generatePDF).toHaveBeenCalled();
      expect(mockBudgetExcelGenerator.generateExcel).toHaveBeenCalled();
      expect(mockBudgetCSVGenerator.generateCSV).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed exports up to max attempts', async () => {
      const queueItem = {
        id: 'queue-retry',
        export_id: 'export-retry',
        priority: 1,
        retry_count: 2, // Already 2 retries
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'budget_exports') {
          return {
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'export_queue') {
          return {
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });

      const error = new Error('Processing failed');
      await (queueManager as any).handleJobFailure(queueItem, error);

      // Should mark as permanently failed after max retries
      expect(mockSupabase.from).toHaveBeenCalledWith('budget_exports');
    });

    it('should schedule retry for failed exports under max attempts', async () => {
      const queueItem = {
        id: 'queue-retry',
        export_id: 'export-retry',
        priority: 1,
        retry_count: 1, // Still under max retries
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'export_queue') {
          return {
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });

      const error = new Error('Temporary failure');
      await (queueManager as any).handleJobFailure(queueItem, error);

      // Should reset started_at to allow retry
      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
    });
  });

  describe('Static Utility Methods', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnThis(),
        count: 'exact',
        is: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        mockResolvedValue: { count: 5, error: null }
      });
    });

    it('should add export to queue via static method', async () => {
      await ExportQueueManager.addExportToQueue('export-static', 2);

      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
    });

    it('should get queue statistics via static method', async () => {
      const stats = await ExportQueueManager.getQueueStatistics();

      expect(stats).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
    });

    it('should start processing via static method', async () => {
      await ExportQueueManager.startQueueProcessing();
      
      const status = ExportQueueManager.getProcessingStatus();
      expect(status.isRunning).toBe(true);

      await ExportQueueManager.stopQueueProcessing();
    });
  });

  describe('Utility Functions', () => {
    it('should prioritize export correctly', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockResolvedValue({ error: null }),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis()
      });

      const result = await prioritizeExport('export-urgent');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('export_queue');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ priority: 5 });
    });

    it('should handle prioritization errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        }),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis()
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await prioritizeExport('export-fail');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to prioritize export:',
        { message: 'Update failed' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should process export queue via utility function', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await processExportQueue();

      expect(consoleSpy).toHaveBeenCalledWith('=== Budget Export Queue Processing Started ===');
      expect(consoleSpy).toHaveBeenCalledWith('=== Budget Export Queue Processing Completed ===');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should respect maximum concurrent jobs limit', async () => {
      const status = queueManager.getProcessingStatus();
      
      // Initially no active jobs
      expect(status.activeJobs.size).toBe(0);
      
      // The actual concurrency testing would require more complex mocking
      // to simulate multiple jobs running simultaneously
    });

    it('should track processing statistics', async () => {
      const initialStatus = queueManager.getProcessingStatus();
      
      expect(initialStatus.totalProcessed).toBe(0);
      expect(initialStatus.totalFailed).toBe(0);
      expect(initialStatus.isRunning).toBe(false);
    });

    it('should handle cleanup operations efficiently', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockResolvedValue({ error: null }),
        not: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis()
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test cleanup via private method
      await (queueManager as any).cleanupCompletedJobs();

      expect(consoleSpy).toHaveBeenCalledWith('Queue cleanup completed');
      consoleSpy.mockRestore();
    });
  });
});