import { describe, it, expect, beforeAll, afterAll, jest } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { OCRProcessingPipeline } from '@/lib/ocr/processing-pipeline';
import { OptimizedPDFProcessor } from '@/lib/ocr/optimized-processor';
import { PDFValidator } from '@/lib/ocr/pdf-validator';
import { enhancedPDFValidator } from '@/lib/ocr/enhanced-pdf-validator';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.GOOGLE_CLOUD_VISION_API_KEY = 'test-api-key';
describe('PDF Analysis System - Acceptance Criteria Tests', () => {
  let pipeline: OCRProcessingPipeline;
  let processor: OptimizedPDFProcessor;
  let testPdfPath: string;
  let largePdfPath: string;
  
  beforeAll(async () => {
    // Initialize components
    pipeline = new OCRProcessingPipeline();
    processor = new OptimizedPDFProcessor({
      maxConcurrency: 4,
      chunkSize: 10,
      enableCaching: true
    });
    
    // Create test PDFs
    testPdfPath = path.join(process.cwd(), 'test-data', 'test-wedding.pdf');
    largePdfPath = path.join(process.cwd(), 'test-data', 'large-wedding.pdf');
    // Create test directory if it doesn't exist
    await fs.mkdir(path.dirname(testPdfPath), { recursive: true });
  });
  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testPdfPath);
      await fs.unlink(largePdfPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  describe('✅ Acceptance Criteria 1: PDF Upload and Processing', () => {
    it('should successfully upload and process a PDF file', async () => {
      // Create a mock PDF file
      const mockPdfContent = Buffer.from('%PDF-1.5\nTest wedding document content\n%%EOF');
      await fs.writeFile(testPdfPath, mockPdfContent);
      
      // Test upload validation
      const validation = await PDFValidator.validate(testPdfPath);
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('pdf');
      // Test processing
      const result = await pipeline.processPDF(
        testPdfPath,
        'test-wedding.pdf',
        'test-user-id',
        { qualityCheck: true }
      );
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.id).toBeDefined();
      expect(result.pageCount).toBeGreaterThan(0);
    it('should reject invalid file types', async () => {
      const invalidPath = path.join(process.cwd(), 'test-data', 'test.txt');
      await fs.writeFile(invalidPath, 'Not a PDF file');
      const validation = await PDFValidator.validate(invalidPath);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid file type');
      await fs.unlink(invalidPath);
    it('should handle malformed PDFs gracefully', async () => {
      const malformedPdf = Buffer.from('Not a real PDF content');
      const malformedPath = path.join(process.cwd(), 'test-data', 'malformed.pdf');
      await fs.writeFile(malformedPath, malformedPdf);
      const validation = await enhancedPDFValidator.validate(malformedPath);
      expect(validation.error).toBeDefined();
      await fs.unlink(malformedPath);
  describe('✅ Acceptance Criteria 2: OCR Accuracy > 95%', () => {
    it('should achieve accuracy above 95% for clear text', async () => {
      // Create a test PDF with known content
      const knownContent = `
        Wedding Details
        Bride Name: Sarah Johnson
        Groom Name: Michael Smith
        Wedding Date: June 15, 2024
        Venue: Grand Ballroom Hotel
        Guest Count: 150
        Email: sarah.michael@email.com
        Phone: (555) 123-4567
      `;
      // Mock PDF with clear text
      const mockPdf = createMockPdfWithContent(knownContent);
      await fs.writeFile(testPdfPath, mockPdf);
        'accuracy-test.pdf',
        { enhanceAccuracy: true }
      // Test overall accuracy
      expect(result.accuracy).toBeGreaterThan(0.95);
      expect(result.metadata.confidence).toBeGreaterThan(0.95);
      // Test field extraction accuracy
      const fields = result.fields;
      const brideField = fields.find(f => f.coreFieldKey === 'bride_name');
      const groomField = fields.find(f => f.coreFieldKey === 'groom_name');
      expect(brideField).toBeDefined();
      expect(brideField?.value).toContain('Sarah');
      expect(brideField?.confidence).toBeGreaterThan(0.9);
      expect(groomField).toBeDefined();
      expect(groomField?.value).toContain('Michael');
      expect(groomField?.confidence).toBeGreaterThan(0.9);
    it('should calculate and report accuracy metrics', async () => {
        'metrics-test.pdf',
      // Verify accuracy calculation
      expect(result.accuracy).toBeDefined();
      expect(typeof result.accuracy).toBe('number');
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      // Check individual field confidence
      result.fields.forEach(field => {
        expect(field.confidence).toBeDefined();
        expect(field.confidence).toBeGreaterThanOrEqual(0);
        expect(field.confidence).toBeLessThanOrEqual(1);
      });
    it('should handle low-quality scans with confidence reporting', async () => {
      // Mock a low-quality scan
      const lowQualityContent = createLowQualityMockPdf();
      await fs.writeFile(testPdfPath, lowQualityContent);
        'low-quality.pdf',
      // Should still process but report lower confidence
      expect(result.accuracy).toBeLessThan(0.95);
      // Should flag low confidence fields
      const lowConfidenceFields = result.fields.filter(f => f.confidence < 0.7);
      expect(lowConfidenceFields.length).toBeGreaterThan(0);
  describe('✅ Acceptance Criteria 3: Structure Detection', () => {
    it('should detect document structure elements', async () => {
      const structuredContent = `
        WEDDING CONTRACT
        
        Section 1: Basic Information
        - Bride: Jane Doe
        - Groom: John Smith
        Section 2: Event Details
        | Item | Description | Quantity |
        |------|-------------|----------|
        | Tables | Round tables | 15 |
        | Chairs | Chiavari | 150 |
        | Flowers | Centerpieces | 15 |
        Section 3: Signatures
        _________________  _________________
        Bride Signature    Groom Signature
      const mockPdf = createMockPdfWithContent(structuredContent);
        'structured.pdf',
        { extractTables: true, detectSignatures: true }
      // Test table detection
      expect(result.tables).toBeDefined();
      expect(result.tables!.length).toBeGreaterThan(0);
      const table = result.tables![0];
      expect(table.headers).toContain('Item');
      expect(table.headers).toContain('Description');
      expect(table.headers).toContain('Quantity');
      expect(table.rows.length).toBe(3);
      // Test signature detection
      expect(result.signatures).toBeDefined();
      expect(result.signatures!.length).toBe(2);
      // Test document type detection
      expect(result.metadata.documentType).toBe('contract');
      expect(result.metadata.hasWeddingContent).toBe(true);
    it('should identify document sections and hierarchy', async () => {
        'hierarchy-test.pdf',
        {}
      // Check for section identification in extracted text
      expect(result.extractedText).toBeDefined();
      // Fields should be organized by context
      const fieldsWithContext = result.fields.filter(f => f.contextClues && f.contextClues.length > 0);
      expect(fieldsWithContext.length).toBeGreaterThan(0);
    it('should detect forms and input fields', async () => {
      const formContent = `
        RSVP FORM
        Name: ________________
        Email: ________________
        Number of Guests: _____
        Dietary Restrictions: ________________
        [ ] Will Attend
        [ ] Cannot Attend
      const mockPdf = createMockPdfWithContent(formContent);
        'form-test.pdf',
      // Should detect form fields
      const formFields = result.fields.filter(f => 
        f.label.toLowerCase().includes('name') ||
        f.label.toLowerCase().includes('email') ||
        f.label.toLowerCase().includes('guests')
      expect(formFields.length).toBeGreaterThan(0);
      expect(result.metadata.documentType).toContain('form');
  describe('✅ Acceptance Criteria 4: Content Extraction', () => {
    it('should extract all text content reliably', async () => {
      const testContent = `
        Complete Wedding Package
        This agreement is between Sarah Johnson (Bride) and Michael Smith (Groom)
        for their wedding celebration on June 15, 2024.
        Services Included:
        - Photography: 8 hours coverage
        - Videography: Full day
        - Catering: 150 guests
        - Flowers: Bridal bouquet, centerpieces
        - Music: DJ and live band
        Total Amount: $25,000
        Deposit: $5,000 (paid)
        Balance: $20,000 (due 30 days before event)
      const mockPdf = createMockPdfWithContent(testContent);
        'extraction-test.pdf',
      // Test full text extraction
      expect(result.extractedText).toContain('Sarah Johnson');
      expect(result.extractedText).toContain('Michael Smith');
      expect(result.extractedText).toContain('June 15, 2024');
      expect(result.extractedText).toContain('$25,000');
      // Test field extraction
      expect(result.fields.length).toBeGreaterThan(0);
      // Test wedding-specific field detection
      const weddingFields = result.fields.filter(f => f.coreFieldKey);
      expect(weddingFields.length).toBeGreaterThan(0);
      // Test value extraction
      const amountField = result.fields.find(f => 
        f.value && f.value.includes('25,000')
      expect(amountField).toBeDefined();
    it('should handle multi-page documents', async () => {
      // Create a larger PDF for testing
      const multiPageContent = createMultiPageMockPdf(5);
      await fs.writeFile(largePdfPath, multiPageContent);
        largePdfPath,
        'multipage-test.pdf',
        { parallel: true }
      expect(result.pageCount).toBe(5);
      // Fields should have page numbers
      const fieldsWithPageNumbers = result.fields.filter(f => f.pageNumber > 0);
      expect(fieldsWithPageNumbers.length).toBeGreaterThan(0);
    it('should extract metadata and document properties', async () => {
        'metadata-test.pdf',
      expect(result.metadata).toBeDefined();
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.documentType).toBeDefined();
      expect(result.metadata.hasWeddingContent).toBeDefined();
      expect(result.metadata.confidence).toBeDefined();
  describe('✅ Acceptance Criteria 5: Large File Handling', () => {
    it('should handle files up to 50MB efficiently', async () => {
      // Create a 10MB test file (testing with smaller size for speed)
      const largeContent = createLargeMockPdf(10 * 1024 * 1024);
      await fs.writeFile(largePdfPath, largeContent);
      const startTime = Date.now();
      const result = await processor.processLargePDF(largeContent);
      const processingTime = Date.now() - startTime;
      expect(result.success).toBe(true);
      // Should process within reasonable time (< 60 seconds for 10MB)
      expect(processingTime).toBeLessThan(60000);
      // Should use optimized processing
      expect(result.metadata.processingMethod).toBe('optimized');
      expect(result.metadata.chunksProcessed).toBeGreaterThan(0);
    it('should use parallel processing for large files', async () => {
      const largeContent = createLargeMockPdf(5 * 1024 * 1024);
      // Verify parallel processing was used
      expect(result.metadata.parallelProcessing).toBe(true);
      expect(result.metadata.workersUsed).toBeGreaterThan(1);
    it('should handle memory efficiently with streaming', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      // Process a large file
      const largeContent = createLargeMockPdf(20 * 1024 * 1024);
      await processor.processLargePDF(largeContent);
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      // Memory increase should be reasonable (< 100MB for 20MB file)
      expect(memoryIncrease).toBeLessThan(100);
    it('should provide progress updates for large files', async () => {
      const progressUpdates: number[] = [];
      const processor = new OptimizedPDFProcessor({
        maxConcurrency: 4,
        chunkSize: 10,
        enableCaching: true,
        progressCallback: (progress) => {
          progressUpdates.push(progress);
        }
      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThanOrEqual(100);
});
// Helper functions to create mock PDFs
function createMockPdfWithContent(content: string): Buffer {
  return Buffer.from(`%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
4 0 obj
<< /Length ${content.length} >>
stream
${content}
endstream
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000203 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${300 + content.length}
%%EOF`);
}
function createLowQualityMockPdf(): Buffer {
  const content = 'Br1d3 N@me: S@r@h J0hn50n\nGr00m: M1ch@3l 5m1th\nD@t3: Jun3 l5, 2O24';
  return createMockPdfWithContent(content);
function createMultiPageMockPdf(pageCount: number): Buffer {
  let content = '%PDF-1.5\n';
  for (let i = 1; i <= pageCount; i++) {
    content += `Page ${i} content: Wedding details for page ${i}\n`;
  }
  content += '%%EOF';
  return Buffer.from(content);
function createLargeMockPdf(sizeInBytes: number): Buffer {
  const pageContent = 'Wedding document content. '.repeat(100);
  const pages = Math.ceil(sizeInBytes / pageContent.length);
  for (let i = 0; i < pages; i++) {
    content += pageContent;
  return Buffer.from(content.substring(0, sizeInBytes));
