/**
 * PDF Analysis Service Tests
 * WS-242: AI PDF Analysis System - Service Layer Testing
 */

import { PDFAnalysisService } from '@/lib/services/pdfAnalysisService';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';
import { WeddingContextAnalyzer } from '@/lib/services/weddingContextAnalyzer';

// Mock dependencies
jest.mock('@/lib/repositories/pdfAnalysisRepository');
jest.mock('@/lib/services/weddingContextAnalyzer');
jest.mock('@/lib/services/websocketProgressService');

const mockRepository = {
  createJob: jest.fn(),
  updateJobStatus: jest.fn(),
  updateJobProgress: jest.fn(),
  saveExtractedFields: jest.fn(),
  getJob: jest.fn(),
  recordProcessingCost: jest.fn(),
};

const mockWeddingAnalyzer = {
  analyzeWeddingContext: jest.fn(),
  isWeddingRelatedText: jest.fn(),
  extractWeddingFields: jest.fn(),
};

(createPDFAnalysisRepository as jest.Mock).mockReturnValue(mockRepository);

describe('PDFAnalysisService', () => {
  let pdfAnalysisService: PDFAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    pdfAnalysisService = new PDFAnalysisService();
  });

  describe('processPDF', () => {
    it('should create a PDF analysis job successfully', async () => {
      // Mock file
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock repository responses
      const mockJob = {
        id: 'job-123',
        organization_id: 'org-123',
        file_name: 'test.pdf',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      mockRepository.createJob.mockResolvedValue(mockJob);

      const result = await pdfAnalysisService.processPDF('org-123', mockFile, {
        extractionType: 'client_form',
        priority: 'normal'
      });

      expect(result).toEqual(expect.objectContaining({
        id: 'job-123',
        status: 'pending'
      }));

      expect(mockRepository.createJob).toHaveBeenCalledWith({
        organizationId: 'org-123',
        fileName: 'test.pdf',
        fileSize: mockFile.size,
        mimeType: 'application/pdf',
        extractionType: 'client_form',
        priority: 'normal'
      });
    });

    it('should handle invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(
        pdfAnalysisService.processPDF('org-123', invalidFile)
      ).rejects.toThrow('Invalid file type');
    });

    it('should handle file size limits', async () => {
      // Create mock file that's too large (over 10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });

      await expect(
        pdfAnalysisService.processPDF('org-123', largeFile)
      ).rejects.toThrow('File too large');
    });
  });

  describe('processJob', () => {
    const mockJobId = 'job-123';
    const mockJob = {
      id: mockJobId,
      organization_id: 'org-123',
      file_url: 'https://example.com/file.pdf',
      extraction_type: 'client_form',
      status: 'pending'
    };

    beforeEach(() => {
      mockRepository.getJob.mockResolvedValue(mockJob);
    });

    it('should process a job through all stages successfully', async () => {
      mockWeddingAnalyzer.analyzeWeddingContext.mockResolvedValue({
        isWeddingRelated: true,
        extractedFields: [
          {
            fieldName: 'client_name',
            extractedValue: 'John Smith',
            confidence: 0.95,
            fieldType: 'client_name'
          }
        ],
        confidence: 0.95,
        cost: 150 // 1.50
      });

      await pdfAnalysisService.processJob(mockJobId, {
        enableRealTimeUpdates: true,
        enableWeddingContext: true
      });

      // Verify job status updates
      expect(mockRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJobId, 
        'processing', 
        expect.any(Object)
      );

      expect(mockRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJobId, 
        'completed', 
        expect.any(Object)
      );

      // Verify fields were saved
      expect(mockRepository.saveExtractedFields).toHaveBeenCalledWith(
        mockJobId, 
        expect.arrayContaining([
          expect.objectContaining({
            fieldName: 'client_name',
            extractedValue: 'John Smith'
          })
        ])
      );

      // Verify cost was recorded
      expect(mockRepository.recordProcessingCost).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          totalCost: 150,
          currency: 'GBP'
        })
      );
    });

    it('should handle processing failures gracefully', async () => {
      mockWeddingAnalyzer.analyzeWeddingContext.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await pdfAnalysisService.processJob(mockJobId);

      expect(mockRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJobId,
        'failed',
        expect.objectContaining({
          error: 'AI service unavailable'
        })
      );
    });

    it('should respect cost limits', async () => {
      mockWeddingAnalyzer.analyzeWeddingContext.mockResolvedValue({
        isWeddingRelated: true,
        extractedFields: [],
        confidence: 0.8,
        cost: 600 // £6.00 - over limit
      });

      await pdfAnalysisService.processJob(mockJobId, {
        maxCost: 500 // £5.00 limit
      });

      expect(mockRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJobId,
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Cost limit exceeded')
        })
      );
    });

    it('should handle non-wedding related documents', async () => {
      mockWeddingAnalyzer.analyzeWeddingContext.mockResolvedValue({
        isWeddingRelated: false,
        extractedFields: [],
        confidence: 0.3,
        cost: 100
      });

      await pdfAnalysisService.processJob(mockJobId);

      expect(mockRepository.updateJobStatus).toHaveBeenCalledWith(
        mockJobId,
        'completed',
        expect.objectContaining({
          warning: 'Document may not be wedding-related'
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status with progress information', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'processing',
        current_stage: 'field_extraction',
        stage_progress: 75,
        metadata: {
          totalStages: 4,
          currentStage: 3
        }
      };

      mockRepository.getJob.mockResolvedValue(mockJob);

      const status = await pdfAnalysisService.getJobStatus('job-123');

      expect(status).toEqual({
        id: 'job-123',
        status: 'processing',
        currentStage: 'field_extraction',
        stageProgress: 75,
        overallProgress: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number)
      });
    });

    it('should handle non-existent jobs', async () => {
      mockRepository.getJob.mockResolvedValue(null);

      await expect(
        pdfAnalysisService.getJobStatus('non-existent')
      ).rejects.toThrow('Job not found');
    });
  });

  describe('validateJobOptions', () => {
    it('should validate job options correctly', () => {
      const validOptions = {
        extractionType: 'client_form' as const,
        priority: 'high' as const,
        enableRealTimeUpdates: true,
        maxCost: 500
      };

      expect(() => {
        (pdfAnalysisService as any).validateJobOptions(validOptions);
      }).not.toThrow();
    });

    it('should reject invalid extraction types', () => {
      const invalidOptions = {
        extractionType: 'invalid_type' as any,
        priority: 'normal' as const
      };

      expect(() => {
        (pdfAnalysisService as any).validateJobOptions(invalidOptions);
      }).toThrow('Invalid extraction type');
    });

    it('should reject invalid priorities', () => {
      const invalidOptions = {
        extractionType: 'client_form' as const,
        priority: 'invalid_priority' as any
      };

      expect(() => {
        (pdfAnalysisService as any).validateJobOptions(invalidOptions);
      }).toThrow('Invalid priority');
    });
  });

  describe('calculateProcessingTime', () => {
    it('should estimate processing time based on file size and extraction type', () => {
      const estimatedTime = (pdfAnalysisService as any).calculateProcessingTime(
        1024 * 1024, // 1MB
        'client_form'
      );

      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThan(300); // Should be under 5 minutes for 1MB
    });

    it('should adjust time based on extraction complexity', () => {
      const simpleTime = (pdfAnalysisService as any).calculateProcessingTime(
        1024 * 1024,
        'client_form'
      );

      const complexTime = (pdfAnalysisService as any).calculateProcessingTime(
        1024 * 1024,
        'contract'
      );

      expect(complexTime).toBeGreaterThan(simpleTime);
    });
  });
});

describe('PDFAnalysisService Integration Tests', () => {
  // These would be run with actual database connections in integration environment
  describe('End-to-End Processing', () => {
    it.skip('should process a real PDF file through complete pipeline', async () => {
      // This test would require actual PDF files and OpenAI API access
      // Skip in unit tests, run in integration environment
    });

    it.skip('should handle multiple concurrent processing jobs', async () => {
      // Test concurrent job processing
    });

    it.skip('should correctly update real-time progress via WebSocket', async () => {
      // Test WebSocket progress updates
    });
  });
});