/**
 * Field Extraction API Integration Tests
 * WS-122: Automated Field Extraction from Documents
 * Team E - Batch 9 - Round 2
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { POST as extractPOST, GET as extractGET } from '@/app/api/field-extraction/extract/route';
import { POST as exportPOST } from '@/app/api/field-extraction/export/route';
import { GET as templatesGET, POST as templatesPOST } from '@/app/api/field-extraction/templates/route';
import { 
  GET as templateGET, 
  PUT as templatePUT, 
  DELETE as templateDELETE 
} from '@/app/api/field-extraction/templates/[id]/route';
// Mock the field extraction service
vi.mock('@/lib/services/field-extraction-service');
describe('Field Extraction API Integration', () => {
  const mockExtractionService = {
    extractFields: vi.fn(),
    exportFields: vi.fn(),
    getExtractionResults: vi.fn(),
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    getTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    isTemplateInUse: vi.fn(),
    cleanup: vi.fn()
  };
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks
    require('@/lib/services/field-extraction-service').FieldExtractionService.mockImplementation(() => mockExtractionService);
  });
  describe('POST /api/field-extraction/extract', () => {
    it('should successfully extract fields from document', async () => {
      const mockResult = {
        success: true,
        document: {
          id: 'extracted-1',
          documentId: 'doc-1',
          status: 'completed',
          fields: [
            {
              fieldId: 'field-1',
              name: 'Invoice Number',
              value: 'INV-1234',
              type: 'text',
              confidence: 0.95
            }
          ],
          totalFields: 1,
          successfulFields: 1,
          failedFields: 0,
          averageConfidence: 0.95,
          extractionTime: 1200
        },
        processingTime: 1200
      };
      mockExtractionService.extractFields.mockResolvedValue(mockResult);
      const request = new NextRequest('http://localhost/api/field-extraction/extract', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'template-1',
          options: { ocr: false }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const response = await extractPOST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('extracted-1');
      expect(data.data.fields).toHaveLength(1);
      expect(data.processingTime).toBe(1200);
    });
    it('should return 400 for missing documentId', async () => {
          templateId: 'template-1'
      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID is required');
    it('should handle extraction failures', async () => {
        success: false,
        errors: [
          {
            type: 'processing',
            code: 'EXTRACTION_FAILED',
            message: 'Failed to extract fields'
          }
        ],
        processingTime: 500
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
    it('should handle service exceptions', async () => {
      mockExtractionService.extractFields.mockRejectedValue(new Error('Service unavailable'));
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
  describe('GET /api/field-extraction/extract', () => {
    it('should get extraction results for document', async () => {
      const mockResults = {
        id: 'extracted-1',
        documentId: 'doc-1',
        status: 'completed',
        fields: [
            fieldId: 'field-1',
            name: 'Invoice Number',
            value: 'INV-1234',
            type: 'text',
            confidence: 0.95
        ]
      mockExtractionService.getExtractionResults.mockResolvedValue(mockResults);
      const request = new NextRequest('http://localhost/api/field-extraction/extract?documentId=doc-1');
      const response = await extractGET(request);
    it('should return 400 for missing documentId in GET request', async () => {
      const request = new NextRequest('http://localhost/api/field-extraction/extract');
  describe('POST /api/field-extraction/export', () => {
    it('should export fields in JSON format', async () => {
      const mockExportResult = {
        data: JSON.stringify({
          fields: [{ name: 'Invoice Number', value: 'INV-1234' }]
        format: 'json',
        fileName: 'extraction_doc-1.json',
        size: 156
      mockExtractionService.exportFields.mockResolvedValue(mockExportResult);
      const request = new NextRequest('http://localhost/api/field-extraction/export', {
          format: 'json',
          options: { includeMetadata: true }
      const response = await exportPOST(request);
      expect(data.format).toBe('json');
      expect(data.fileName).toBe('extraction_doc-1.json');
    it('should export fields in CSV format', async () => {
        data: 'Field Name,Value,Type\nInvoice Number,INV-1234,text',
        format: 'csv',
        fileName: 'extraction_doc-1.csv',
        size: 45
          format: 'csv'
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    it('should return 400 for unsupported format', async () => {
          format: 'unsupported'
      expect(data.error).toContain('Unsupported format');
    it('should handle export failures', async () => {
        errors: ['Document not found']
          format: 'json'
      expect(data.errors).toContain('Document not found');
  describe('GET /api/field-extraction/templates', () => {
    it('should get all templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Invoice Template',
          documentType: 'invoice',
          isActive: true,
              id: 'field-1',
              required: true
          ]
      ];
      mockExtractionService.getTemplates.mockResolvedValue(mockTemplates);
      const request = new NextRequest('http://localhost/api/field-extraction/templates');
      const response = await templatesGET(request);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Invoice Template');
    it('should filter templates by document type', async () => {
          isActive: true
      const request = new NextRequest('http://localhost/api/field-extraction/templates?documentType=invoice&active=true');
      expect(mockExtractionService.getTemplates).toHaveBeenCalledWith({
        documentType: 'invoice',
        isActive: true
  describe('POST /api/field-extraction/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        id: 'template-2',
        name: 'Contract Template',
        description: 'Template for contracts',
        documentType: 'contract',
            id: 'field-1',
            name: 'Contract Number',
            required: true
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      mockExtractionService.createTemplate.mockResolvedValue(newTemplate);
      const request = new NextRequest('http://localhost/api/field-extraction/templates', {
          name: 'Contract Template',
          description: 'Template for contracts',
          documentType: 'contract',
              name: 'Contract Number',
      const response = await templatesPOST(request);
      expect(response.status).toBe(201);
      expect(data.data.id).toBe('template-2');
      expect(data.data.name).toBe('Contract Template');
    it('should return 400 for invalid template data', async () => {
          fields: [] // Empty fields array
      expect(data.error).toBe('Template name and fields are required');
    it('should validate field definitions', async () => {
              // Missing name and type
      expect(data.error).toBe('Field name and type are required for all fields');
  describe('Template Management (/api/field-extraction/templates/[id])', () => {
    it('should get a specific template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Invoice Template',
        fields: []
      mockExtractionService.getTemplate.mockResolvedValue(mockTemplate);
      const response = await templateGET(
        new NextRequest('http://localhost/api/field-extraction/templates/template-1'),
        { params: { id: 'template-1' } }
      );
      expect(data.data.id).toBe('template-1');
    it('should return 404 for non-existent template', async () => {
      mockExtractionService.getTemplate.mockResolvedValue(null);
        new NextRequest('http://localhost/api/field-extraction/templates/non-existent'),
        { params: { id: 'non-existent' } }
      expect(response.status).toBe(404);
      expect(data.error).toBe('Template not found');
    it('should update a template', async () => {
      const existingTemplate = {
      const updatedTemplate = {
        name: 'Updated Invoice Template',
        description: 'Updated description',
      mockExtractionService.getTemplate.mockResolvedValue(existingTemplate);
      mockExtractionService.updateTemplate.mockResolvedValue(updatedTemplate);
      const response = await templatePUT(
        new NextRequest('http://localhost/api/field-extraction/templates/template-1', {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Invoice Template',
            description: 'Updated description'
          }),
          headers: {
            'Content-Type': 'application/json'
      expect(data.data.name).toBe('Updated Invoice Template');
    it('should delete a template', async () => {
        name: 'Invoice Template'
      mockExtractionService.isTemplateInUse.mockResolvedValue(false);
      mockExtractionService.deleteTemplate.mockResolvedValue(undefined);
      const response = await templateDELETE(
          method: 'DELETE'
      expect(data.message).toBe('Template deleted successfully');
    it('should prevent deletion of template in use', async () => {
      mockExtractionService.isTemplateInUse.mockResolvedValue(true);
      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete template that is currently in use');
  describe('Performance Requirements', () => {
    it('should handle concurrent extraction requests', async () => {
        document: { id: 'extracted-1' },
        processingTime: 1000
      const requests = Array.from({ length: 5 }, (_, i) =>
        new NextRequest('http://localhost/api/field-extraction/extract', {
          method: 'POST',
            documentId: `doc-${i}`,
            templateId: 'template-1'
        })
      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => extractPOST(req)));
      const totalTime = Date.now() - startTime;
      // All requests should succeed
      responses.forEach(async (response, index) => {
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      // Concurrent processing should be faster than sequential
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
    it('should handle large export requests efficiently', async () => {
      const largeExportResult = {
          fields: Array.from({ length: 1000 }, (_, i) => ({
            name: `Field ${i}`,
            value: `Value ${i}`,
            confidence: 0.9
          }))
        fileName: 'large_extraction.json',
        size: 50000
      mockExtractionService.exportFields.mockResolvedValue(largeExportResult);
          documentId: 'large-doc',
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
});
