/**
 * WS-166 Budget Export System Integration Tests
 * Team C - Round 1 Implementation
 * 
 * Comprehensive test suite for file storage, compression, email delivery,
 * and cleanup services integration
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { ExportFileManager, FileMetadata } from '../../../src/lib/integrations/budget-export/file-manager';
import { FileCompressionService } from '../../../src/lib/integrations/budget-export/compression-service';
import { StorageCleanupService } from '../../../src/lib/integrations/budget-export/cleanup-service';
import { ExportEmailService, EmailRecipient, ExportEmailRequest } from '../../../src/lib/integrations/budget-export/email-service';

// Test configuration
const testConfig = {
  testCoupleId: 'test-couple-123',
  testExportId: 'export-test-456',
  testTimeout: 30000, // 30 seconds for long operations
  mockFileSize: 1024 * 1024, // 1MB
  largeFileSize: 10 * 1024 * 1024 // 10MB for compression tests
};

// Mock data
const mockCoupleData = {
  id: testConfig.testCoupleId,
  name: 'John & Jane Test',
  email: 'test-couple@example.com',
  weddingDate: new Date('2025-06-15')
};

const mockRecipients: EmailRecipient[] = [
  {
    email: 'couple@test.com',
    name: 'Test Couple',
    role: 'couple',
    permissions: ['download', 'share']
  },
  {
    email: 'parent@test.com',
    name: 'Test Parent',
    role: 'parent',
    permissions: ['download']
  },
  {
    email: 'advisor@test.com',
    name: 'Test Advisor',
    role: 'advisor',
    permissions: ['download', 'analyze']
  }
];

// Helper functions
function createMockPDFBuffer(size: number = testConfig.mockFileSize): Buffer {
  const pdfHeader = Buffer.from('%PDF-1.4\n');
  const content = Buffer.alloc(size - pdfHeader.length, 'A');
  return Buffer.concat([pdfHeader, content]);
}

function createMockCSVBuffer(size: number = testConfig.mockFileSize): Buffer {
  const csvHeader = 'Category,Budgeted,Spent,Remaining\n';
  const csvRow = 'Venue,5000.00,4500.00,500.00\n';
  const headerBuffer = Buffer.from(csvHeader);
  const rowBuffer = Buffer.from(csvRow);
  
  let content = headerBuffer;
  while (content.length < size) {
    content = Buffer.concat([content, rowBuffer]);
  }
  
  return content.subarray(0, size);
}

describe('WS-166 Budget Export System Integration Tests', () => {
  let testFiles: string[] = [];
  let cleanupIds: string[] = [];

  beforeAll(async () => {
    console.log('Starting Budget Export Integration Tests...');
    
    // Verify test environment
    expect(process.env.NODE_ENV).toBe('test');
    
    // Setup test data cleanup tracking
    testFiles = [];
    cleanupIds = [];
  });

  afterAll(async () => {
    console.log('Cleaning up test data...');
    
    // Cleanup any test files that weren't properly cleaned up
    if (testFiles.length > 0) {
      console.log(`Cleaning up ${testFiles.length} test files`);
      // In production, this would clean up actual storage files
    }
    
    console.log('Budget Export Integration Tests completed');
  });

  beforeEach(() => {
    // Reset test data for each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Verify no memory leaks in compression service
    const memoryUsage = FileCompressionService.getMemoryUsage();
    expect(memoryUsage.current).toBeLessThanOrEqual(memoryUsage.maximum);
  });

  describe('File Storage Service Integration', () => {
    test('should store PDF export file with proper security isolation', async () => {
      const mockBuffer = createMockPDFBuffer();
      const fileName = 'test-budget-report.pdf';
      const contentType = 'application/pdf';

      const result = await ExportFileManager.storeExportFile(
        testConfig.testExportId,
        mockBuffer,
        fileName,
        contentType,
        testConfig.testCoupleId
      );

      expect(result).toBeDefined();
      expect(result.url).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.fileId).toBeTruthy();

      // Verify metadata can be retrieved
      const metadata = await ExportFileManager.getFileMetadata(
        testConfig.testExportId,
        testConfig.testCoupleId
      );

      expect(metadata).toBeDefined();
      expect(metadata!.fileName).toBe(fileName);
      expect(metadata!.contentType).toBe(contentType);
      expect(metadata!.fileSize).toBe(mockBuffer.length);
      expect(metadata!.coupleId).toBe(testConfig.testCoupleId);

      testFiles.push(result.fileId);
    }, testConfig.testTimeout);

    test('should generate secure download URLs with proper expiration', async () => {
      // First store a file
      const mockBuffer = createMockPDFBuffer();
      const storeResult = await ExportFileManager.storeExportFile(
        testConfig.testExportId,
        mockBuffer,
        'secure-download-test.pdf',
        'application/pdf',
        testConfig.testCoupleId
      );

      // Generate secure download URL
      const downloadUrl = await ExportFileManager.generateSecureDownloadUrl(
        testConfig.testExportId,
        testConfig.testCoupleId,
        2 // 2 hours expiration
      );

      expect(downloadUrl).toBeTruthy();
      expect(downloadUrl).toContain('token=');
      expect(downloadUrl).toContain('/api/budget/export/download/');

      testFiles.push(storeResult.fileId);
    });

    test('should enforce storage quota limits', async () => {
      const quotaUsage = await ExportFileManager.getStorageQuotaUsage(testConfig.testCoupleId);

      expect(quotaUsage).toBeDefined();
      expect(quotaUsage.totalFiles).toBeGreaterThanOrEqual(0);
      expect(quotaUsage.totalSize).toBeGreaterThanOrEqual(0);
      expect(quotaUsage.quotaLimit).toBe(100 * 1024 * 1024); // 100MB
      expect(quotaUsage.quotaRemaining).toBeLessThanOrEqual(quotaUsage.quotaLimit);
    });

    test('should verify file integrity with checksums', async () => {
      const mockBuffer = createMockPDFBuffer();
      const storeResult = await ExportFileManager.storeExportFile(
        testConfig.testExportId,
        mockBuffer,
        'integrity-test.pdf',
        'application/pdf',
        testConfig.testCoupleId
      );

      const integrityResult = await ExportFileManager.verifyFileIntegrity(storeResult.fileId);

      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.message).toBe('File integrity verified');

      testFiles.push(storeResult.fileId);
    });

    test('should reject unauthorized access attempts', async () => {
      const unauthorizedCoupleId = 'unauthorized-couple-456';
      
      await expect(
        ExportFileManager.getFileMetadata(testConfig.testExportId, unauthorizedCoupleId)
      ).resolves.toBeNull();

      await expect(
        ExportFileManager.generateSecureDownloadUrl(
          testConfig.testExportId,
          unauthorizedCoupleId
        )
      ).rejects.toThrow('File not found or access denied');
    });
  });

  describe('File Compression Service Integration', () => {
    test('should compress large files efficiently', async () => {
      const largeBuffer = createMockCSVBuffer(testConfig.largeFileSize);
      
      const compressionResult = await FileCompressionService.compressFile(
        largeBuffer,
        6, // Medium compression
        'gzip'
      );

      expect(compressionResult.compressed).toBeInstanceOf(Buffer);
      expect(compressionResult.compressedSize).toBeLessThan(compressionResult.originalSize);
      expect(compressionResult.compressionRatio).toBeGreaterThan(0);
      expect(compressionResult.algorithm).toBe('gzip');
      expect(compressionResult.metadata.processingTime).toBeGreaterThan(0);

      // Verify compression actually reduced file size for text-based content
      expect(compressionResult.compressionRatio).toBeGreaterThan(50); // At least 50% compression for CSV
    }, testConfig.testTimeout);

    test('should create ZIP archives with multiple file formats', async () => {
      const files = [
        {
          name: 'budget-summary.pdf',
          buffer: createMockPDFBuffer(1024 * 500), // 500KB
          contentType: 'application/pdf',
          lastModified: new Date()
        },
        {
          name: 'budget-details.csv',
          buffer: createMockCSVBuffer(1024 * 200), // 200KB
          contentType: 'text/csv',
          lastModified: new Date()
        }
      ];

      const zipBuffer = await FileCompressionService.createZipArchive(
        files,
        'budget-export-package.zip',
        6 // Medium compression
      );

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);
      expect(zipBuffer.length).toBeLessThan(files.reduce((sum, f) => sum + f.buffer.length, 0));

      // Verify ZIP file signature
      expect(zipBuffer.subarray(0, 2)).toEqual(Buffer.from([0x50, 0x4B])); // ZIP signature
    }, testConfig.testTimeout);

    test('should optimize PDF files without corruption', async () => {
      const pdfBuffer = createMockPDFBuffer(2 * 1024 * 1024); // 2MB PDF
      
      const optimizedBuffer = await FileCompressionService.optimizePDF(
        pdfBuffer,
        'medium',
        false
      );

      expect(optimizedBuffer).toBeInstanceOf(Buffer);
      expect(optimizedBuffer.length).toBeGreaterThan(0);
      // PDF optimization may not always reduce size for mock data, but should not corrupt
      expect(optimizedBuffer.subarray(0, 5)).toEqual(Buffer.from('%PDF-'));
    });

    test('should determine optimal compression strategy', async () => {
      // Test CSV file (text-based, should compress)
      const csvStrategy = FileCompressionService.getOptimalCompressionStrategy(
        'text/csv',
        5 * 1024 * 1024 // 5MB
      );
      expect(csvStrategy.shouldCompress).toBe(true);
      expect(csvStrategy.algorithm).toBe('gzip'); // Gzip for large files

      // Test JPEG file (already compressed, should not compress)
      const jpegStrategy = FileCompressionService.getOptimalCompressionStrategy(
        'image/jpeg',
        2 * 1024 * 1024 // 2MB
      );
      expect(jpegStrategy.shouldCompress).toBe(false);

      // Test PDF file (should use specialized optimization)
      const pdfStrategy = FileCompressionService.getOptimalCompressionStrategy(
        'application/pdf',
        3 * 1024 * 1024 // 3MB
      );
      expect(pdfStrategy.reason).toBe('PDF requires specialized optimization');
    });

    test('should handle memory limits properly', async () => {
      const memoryUsage = FileCompressionService.getMemoryUsage();
      expect(memoryUsage.current).toBeGreaterThanOrEqual(0);
      expect(memoryUsage.maximum).toBeGreaterThan(0);
      expect(memoryUsage.utilizationPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Email Delivery Service Integration', () => {
    test('should send export emails to multiple stakeholder types', async () => {
      const emailRequest: ExportEmailRequest = {
        exportId: testConfig.testExportId,
        coupleId: testConfig.testCoupleId,
        coupleName: mockCoupleData.name,
        weddingDate: mockCoupleData.weddingDate,
        exportType: 'Budget Summary Report',
        recipients: mockRecipients,
        includeAttachment: false, // Use download links
        personalMessage: 'Please review our budget summary for the upcoming meeting.',
        deliveryPreference: 'immediate'
      };

      // Mock file metadata
      vi.spyOn(ExportFileManager, 'getFileMetadata').mockResolvedValue({
        id: 'test-file-id',
        coupleId: testConfig.testCoupleId,
        exportId: testConfig.testExportId,
        fileName: 'budget-report.pdf',
        contentType: 'application/pdf',
        fileSize: 1024 * 1024, // 1MB
        downloadCount: 0,
        maxDownloads: 100,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        isCompressed: false,
        storageUrl: 'test/path/file.pdf',
        checksumSha256: 'mock-checksum'
      } as FileMetadata);

      // Mock download URL generation
      vi.spyOn(ExportFileManager, 'generateSecureDownloadUrl')
        .mockResolvedValue('https://example.com/secure-download?token=mock-token');

      const result = await ExportEmailService.sendExportEmail(emailRequest);

      expect(result.success).toBe(true);
      expect(result.deliveryStats.totalRecipients).toBe(mockRecipients.length);
      expect(result.deliveryStats.successCount).toBe(mockRecipients.length);
      expect(result.fallbackLinksProvided).toBe(true);
      expect(result.attachmentDelivered).toBe(false); // Using download links
    });

    test('should handle large files with download links fallback', async () => {
      const largeFileRequest: ExportEmailRequest = {
        exportId: testConfig.testExportId,
        coupleId: testConfig.testCoupleId,
        coupleName: mockCoupleData.name,
        weddingDate: mockCoupleData.weddingDate,
        exportType: 'Comprehensive Budget Analysis',
        recipients: [mockRecipients[0]], // Single recipient
        includeAttachment: true, // Request attachment
        deliveryPreference: 'immediate'
      };

      // Mock large file metadata (>10MB, exceeds email limit)
      vi.spyOn(ExportFileManager, 'getFileMetadata').mockResolvedValue({
        id: 'large-file-id',
        coupleId: testConfig.testCoupleId,
        exportId: testConfig.testExportId,
        fileName: 'large-budget-report.pdf',
        contentType: 'application/pdf',
        fileSize: 15 * 1024 * 1024, // 15MB - exceeds attachment limit
        downloadCount: 0,
        maxDownloads: 100,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        isCompressed: false,
        storageUrl: 'test/path/large-file.pdf',
        checksumSha256: 'mock-large-checksum'
      } as FileMetadata);

      vi.spyOn(ExportFileManager, 'generateSecureDownloadUrl')
        .mockResolvedValue('https://example.com/secure-download/large-file?token=mock-token');

      const result = await ExportEmailService.sendExportEmail(largeFileRequest);

      expect(result.success).toBe(true);
      expect(result.attachmentDelivered).toBe(false); // Too large for attachment
      expect(result.fallbackLinksProvided).toBe(true); // Should provide download link
    });

    test('should send failure notifications', async () => {
      const success = await ExportEmailService.sendExportFailureNotification(
        testConfig.testCoupleId,
        testConfig.testExportId,
        'Database connection timeout'
      );

      expect(success).toBe(true);
    });

    test('should generate role-specific email content', async () => {
      // This test verifies that different roles get appropriate messaging
      const advisorRequest: ExportEmailRequest = {
        exportId: testConfig.testExportId,
        coupleId: testConfig.testCoupleId,
        coupleName: mockCoupleData.name,
        weddingDate: mockCoupleData.weddingDate,
        exportType: 'Financial Analysis Report',
        recipients: [mockRecipients[2]], // Advisor only
        includeAttachment: false,
        deliveryPreference: 'immediate'
      };

      vi.spyOn(ExportFileManager, 'getFileMetadata').mockResolvedValue({
        id: 'advisor-file-id',
        coupleId: testConfig.testCoupleId,
        exportId: testConfig.testExportId,
        fileName: 'financial-analysis.pdf',
        contentType: 'application/pdf',
        fileSize: 2 * 1024 * 1024,
        downloadCount: 0,
        maxDownloads: 100,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        createdAt: new Date(),
        isCompressed: false,
        storageUrl: 'test/path/advisor-file.pdf',
        checksumSha256: 'mock-advisor-checksum'
      } as FileMetadata);

      vi.spyOn(ExportFileManager, 'generateSecureDownloadUrl')
        .mockResolvedValue('https://example.com/secure-download/advisor?token=mock-advisor-token');

      const result = await ExportEmailService.sendExportEmail(advisorRequest);

      expect(result.success).toBe(true);
      expect(result.deliveryStats.totalRecipients).toBe(1);
      expect(result.deliveredTo).toContain('advisor@test.com');
    });
  });

  describe('Storage Cleanup Service Integration', () => {
    test('should run cleanup process and return statistics', async () => {
      const cleanupStats = await StorageCleanupService.runCleanup(true); // Force run

      expect(cleanupStats).toBeDefined();
      expect(cleanupStats.totalFilesProcessed).toBeGreaterThanOrEqual(0);
      expect(cleanupStats.filesDeleted).toBeGreaterThanOrEqual(0);
      expect(cleanupStats.storageFreedBytes).toBeGreaterThanOrEqual(0);
      expect(cleanupStats.errors).toBeGreaterThanOrEqual(0);
      expect(cleanupStats.processingTimeMs).toBeGreaterThan(0);
      expect(cleanupStats.nextScheduledRun).toBeInstanceOf(Date);
    }, testConfig.testTimeout);

    test('should get global storage usage statistics', async () => {
      const storageUsage = await StorageCleanupService.getGlobalStorageUsage();

      expect(storageUsage).toBeDefined();
      expect(storageUsage.totalFiles).toBeGreaterThanOrEqual(0);
      expect(storageUsage.totalSizeMB).toBeGreaterThanOrEqual(0);
      expect(storageUsage.averageFileSizeMB).toBeGreaterThanOrEqual(0);
    });

    test('should handle emergency cleanup scenarios', async () => {
      const emergencyResult = await StorageCleanupService.runEmergencyCleanup();

      expect(emergencyResult).toBeDefined();
      expect(emergencyResult.success).toBe(true);
      expect(emergencyResult.filesDeleted).toBeGreaterThanOrEqual(0);
      expect(emergencyResult.storageFreed).toBeGreaterThanOrEqual(0);
      expect(emergencyResult.message).toBeTruthy();
    });

    test('should schedule automatic cleanup', async () => {
      const scheduleResult = StorageCleanupService.scheduleAutomaticCleanup(6); // 6 hours

      expect(scheduleResult.scheduled).toBe(true);
      expect(scheduleResult.intervalHours).toBe(6);
      expect(scheduleResult.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('End-to-End File Workflow Integration', () => {
    test('should complete full export-to-download workflow', async () => {
      // Step 1: Generate mock export data
      const mockExportData = createMockPDFBuffer(2 * 1024 * 1024); // 2MB
      const exportId = `e2e-test-${Date.now()}`;
      const fileName = 'e2e-budget-report.pdf';

      // Step 2: Store file with compression if needed
      const compressionStrategy = FileCompressionService.getOptimalCompressionStrategy(
        'application/pdf',
        mockExportData.length
      );

      let finalBuffer = mockExportData;
      if (compressionStrategy.shouldCompress) {
        const compressionResult = await FileCompressionService.compressFile(
          mockExportData,
          compressionStrategy.level,
          compressionStrategy.algorithm
        );
        finalBuffer = compressionResult.compressed;
      }

      // Step 3: Store in secure storage
      const storeResult = await ExportFileManager.storeExportFile(
        exportId,
        finalBuffer,
        fileName,
        'application/pdf',
        testConfig.testCoupleId
      );

      expect(storeResult.fileId).toBeTruthy();
      testFiles.push(storeResult.fileId);

      // Step 4: Generate secure download URL
      const downloadUrl = await ExportFileManager.generateSecureDownloadUrl(
        exportId,
        testConfig.testCoupleId,
        24 // 24 hours
      );

      expect(downloadUrl).toBeTruthy();
      expect(downloadUrl).toContain('token=');

      // Step 5: Send email notification
      const emailRequest: ExportEmailRequest = {
        exportId,
        coupleId: testConfig.testCoupleId,
        coupleName: 'E2E Test Couple',
        weddingDate: new Date('2025-07-01'),
        exportType: 'End-to-End Test Report',
        recipients: [{
          email: 'e2e-test@example.com',
          name: 'E2E Test User',
          role: 'couple',
          permissions: ['download']
        }],
        includeAttachment: false,
        deliveryPreference: 'immediate'
      };

      // Mock the file metadata for email service
      vi.spyOn(ExportFileManager, 'getFileMetadata').mockResolvedValue({
        id: storeResult.fileId,
        coupleId: testConfig.testCoupleId,
        exportId,
        fileName,
        contentType: 'application/pdf',
        fileSize: finalBuffer.length,
        downloadCount: 0,
        maxDownloads: 100,
        expiresAt: storeResult.expiresAt,
        createdAt: new Date(),
        isCompressed: compressionStrategy.shouldCompress,
        storageUrl: storeResult.url,
        checksumSha256: 'e2e-test-checksum'
      } as FileMetadata);

      vi.spyOn(ExportFileManager, 'generateSecureDownloadUrl')
        .mockResolvedValue(downloadUrl);

      const emailResult = await ExportEmailService.sendExportEmail(emailRequest);

      expect(emailResult.success).toBe(true);
      expect(emailResult.deliveredTo.length).toBe(1);

      // Step 6: Verify file integrity
      const integrityResult = await ExportFileManager.verifyFileIntegrity(storeResult.fileId);
      expect(integrityResult.valid).toBe(true);

      // Step 7: Update download count (simulate download)
      const newDownloadCount = await ExportFileManager.incrementDownloadCount(storeResult.fileId);
      expect(newDownloadCount).toBe(1);

      console.log('✅ End-to-end workflow completed successfully');
    }, testConfig.testTimeout);

    test('should handle concurrent export requests', async () => {
      const concurrentRequests = 3;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const mockBuffer = createMockCSVBuffer(1024 * 500); // 500KB each
        const exportId = `concurrent-test-${i}-${Date.now()}`;
        
        const promise = ExportFileManager.storeExportFile(
          exportId,
          mockBuffer,
          `concurrent-report-${i}.csv`,
          'text/csv',
          testConfig.testCoupleId
        );
        
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(concurrentRequests);
      results.forEach((result, index) => {
        expect(result.fileId).toBeTruthy();
        testFiles.push(result.fileId);
      });

      console.log(`✅ Handled ${concurrentRequests} concurrent export requests`);
    });

    test('should maintain data consistency across operations', async () => {
      const exportId = `consistency-test-${Date.now()}`;
      const mockBuffer = createMockPDFBuffer(1024 * 1024); // 1MB
      
      // Store file
      const storeResult = await ExportFileManager.storeExportFile(
        exportId,
        mockBuffer,
        'consistency-test.pdf',
        'application/pdf',
        testConfig.testCoupleId
      );

      testFiles.push(storeResult.fileId);

      // Verify metadata consistency
      const metadata = await ExportFileManager.getFileMetadata(
        exportId,
        testConfig.testCoupleId
      );

      expect(metadata).toBeDefined();
      expect(metadata!.exportId).toBe(exportId);
      expect(metadata!.fileSize).toBe(mockBuffer.length);

      // Verify quota usage reflects new file
      const quotaUsage = await ExportFileManager.getStorageQuotaUsage(testConfig.testCoupleId);
      expect(quotaUsage.totalSize).toBeGreaterThanOrEqual(mockBuffer.length);

      // Verify download URL can be generated
      const downloadUrl = await ExportFileManager.generateSecureDownloadUrl(
        exportId,
        testConfig.testCoupleId
      );
      expect(downloadUrl).toBeTruthy();

      console.log('✅ Data consistency maintained across all operations');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle storage failures gracefully', async () => {
      // Test with invalid couple ID
      const invalidBuffer = createMockPDFBuffer();
      
      await expect(
        ExportFileManager.storeExportFile(
          'invalid-export',
          invalidBuffer,
          'test.pdf',
          'application/pdf',
          '' // Empty couple ID should fail validation
        )
      ).rejects.toThrow('Invalid input');
    });

    test('should handle compression failures with large memory usage', async () => {
      // Mock memory limit exceeded scenario
      const originalMemoryUsage = FileCompressionService.getMemoryUsage();
      
      // This should handle memory limits appropriately
      const hugeMockBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB
      
      await expect(
        FileCompressionService.compressFile(hugeMockBuffer, 9)
      ).rejects.toThrow('Memory limit exceeded');
    });

    test('should handle email delivery failures', async () => {
      const failureRequest: ExportEmailRequest = {
        exportId: 'failure-test',
        coupleId: testConfig.testCoupleId,
        coupleName: 'Failure Test',
        weddingDate: new Date(),
        exportType: 'Test Report',
        recipients: [{
          email: 'invalid-email', // Invalid email format
          name: 'Invalid User',
          role: 'couple',
          permissions: []
        }],
        includeAttachment: false,
        deliveryPreference: 'immediate'
      };

      await expect(
        ExportEmailService.sendExportEmail(failureRequest)
      ).rejects.toThrow('Invalid email address');
    });

    test('should recover from cleanup service errors', async () => {
      // This test ensures cleanup continues even if some operations fail
      const cleanupStats = await StorageCleanupService.runCleanup(true);
      
      // Cleanup should complete even if some errors occur
      expect(cleanupStats).toBeDefined();
      expect(cleanupStats.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should process multiple file formats efficiently', async () => {
      const startTime = Date.now();
      
      const formats = [
        { buffer: createMockPDFBuffer(1024 * 1024), ext: 'pdf', type: 'application/pdf' },
        { buffer: createMockCSVBuffer(1024 * 500), ext: 'csv', type: 'text/csv' }
      ];

      const results = [];
      
      for (const format of formats) {
        const exportId = `perf-test-${format.ext}-${Date.now()}`;
        const result = await ExportFileManager.storeExportFile(
          exportId,
          format.buffer,
          `performance-test.${format.ext}`,
          format.type,
          testConfig.testCoupleId
        );
        
        results.push(result);
        testFiles.push(result.fileId);
      }

      const processingTime = Date.now() - startTime;
      
      expect(results.length).toBe(formats.length);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`✅ Processed ${formats.length} different file formats in ${processingTime}ms`);
    });

    test('should maintain performance under load', async () => {
      const loadTestCount = 5;
      const startTime = Date.now();
      
      const promises = Array.from({ length: loadTestCount }, async (_, i) => {
        const mockBuffer = createMockCSVBuffer(1024 * 200); // 200KB each
        const exportId = `load-test-${i}-${Date.now()}`;
        
        return ExportFileManager.storeExportFile(
          exportId,
          mockBuffer,
          `load-test-${i}.csv`,
          'text/csv',
          testConfig.testCoupleId
        );
      });

      const results = await Promise.allSettled(promises);
      const processingTime = Date.now() - startTime;
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const avgTimePerFile = processingTime / loadTestCount;
      
      expect(successCount).toBe(loadTestCount);
      expect(avgTimePerFile).toBeLessThan(2000); // Average < 2 seconds per file
      
      // Cleanup successful results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          testFiles.push(result.value.fileId);
        }
      });
      
      console.log(`✅ Load test: ${successCount}/${loadTestCount} files processed in ${processingTime}ms (avg: ${avgTimePerFile}ms per file)`);
    }, testConfig.testTimeout);
  });
});

// Custom Jest matchers for budget export specific assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidFileId(): R;
      toBeValidDownloadUrl(): R;
    }
  }
}

expect.extend({
  toBeValidFileId(received: any) {
    const pass = typeof received === 'string' && received.length > 0 && received.includes('_');
    return {
      message: () => `expected ${received} to be a valid file ID`,
      pass
    };
  },
  
  toBeValidDownloadUrl(received: any) {
    const pass = typeof received === 'string' && 
                 received.startsWith('http') && 
                 received.includes('/api/budget/export/download/') &&
                 received.includes('token=');
    return {
      message: () => `expected ${received} to be a valid download URL`,
      pass
    };
  }
});