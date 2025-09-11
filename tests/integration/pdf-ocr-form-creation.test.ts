/**
 * PDF Upload → OCR → Form Creation Integration Test
 * Tests the complete workflow from PDF upload to automatic form generation
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createSupabaseClient } from '@/lib/supabase';
import { processPDF } from '@/lib/ocr/pdf-processor';
import { generateFormFromOCR } from '@/lib/forms/form-generator';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Test configuration
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'pdf-test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

describe('PDF → OCR → Form Creation Integration', () => {
  let authToken: string;
  let userId: string;
  let supabase: any;
  let testPdfPath: string;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createSupabaseClient();

    // Create test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (authError) {
      console.error('Failed to create test user:', authError);
      throw authError;
    }

    userId = authData.user?.id || '';
    authToken = authData.session?.access_token || '';

    // Prepare test PDF file
    testPdfPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
    if (!fs.existsSync(testPdfPath)) {
      // Create a simple test PDF if it doesn't exist
      createTestPDF(testPdfPath);
    }
  });

  afterAll(async () => {
    // Cleanup test user and data
    if (userId) {
      await supabase.from('forms').delete().eq('created_by', userId);
      await supabase.from('pdf_imports').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('PDF Upload Process', () => {
    it('should accept valid PDF uploads', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'wedding-contract.pdf',
        contentType: 'application/pdf',
      });

      const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('status', 'uploaded');
      expect(result).toHaveProperty('url');
    });

    it('should reject invalid file types', async () => {
      const formData = new FormData();
      formData.append('file', Buffer.from('not a pdf'), {
        filename: 'invalid.txt',
        contentType: 'text/plain',
      });

      const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('Invalid file type');
    });

    it('should enforce file size limits', async () => {
      // Create a large buffer (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      
      const formData = new FormData();
      formData.append('file', largeBuffer, {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      });

      const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      expect(response.status).toBe(413);
      const error = await response.json();
      expect(error.message).toContain('File too large');
    });

    it('should store upload metadata in database', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'test-metadata.pdf',
        contentType: 'application/pdf',
      });

      const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const result = await response.json();

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('pdf_imports')
        .select('*')
        .eq('id', result.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord.user_id).toBe(userId);
      expect(dbRecord.filename).toBe('test-metadata.pdf');
      expect(dbRecord.status).toBe('uploaded');
      expect(dbRecord.file_size).toBeGreaterThan(0);
    });
  });

  describe('OCR Processing', () => {
    let uploadId: string;

    beforeEach(async () => {
      // Upload a PDF for OCR testing
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'ocr-test.pdf',
        contentType: 'application/pdf',
      });

      const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const result = await response.json();
      uploadId = result.id;
    });

    it('should extract text from PDF using OCR', async () => {
      const response = await fetch(`${TEST_API_URL}/api/pdf/process/${uploadId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('extractedText');
      expect(result).toHaveProperty('fields');
      expect(result.extractedText).not.toBe('');
      expect(Array.isArray(result.fields)).toBe(true);
    });

    it('should identify form fields from extracted text', async () => {
      const response = await fetch(`${TEST_API_URL}/api/pdf/process/${uploadId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      const fields = result.fields;

      // Verify common wedding form fields are detected
      const fieldTypes = fields.map((f: any) => f.type);
      expect(fieldTypes).toContain('text');
      expect(fieldTypes).toContain('email');
      expect(fieldTypes).toContain('date');

      // Check for specific field labels
      const fieldLabels = fields.map((f: any) => f.label.toLowerCase());
      const expectedFields = ['name', 'email', 'date', 'phone'];
      
      expectedFields.forEach(expected => {
        const hasField = fieldLabels.some((label: string) => 
          label.includes(expected)
        );
        expect(hasField).toBe(true);
      });
    });

    it('should handle OCR processing errors gracefully', async () => {
      // Test with invalid upload ID
      const response = await fetch(`${TEST_API_URL}/api/pdf/process/invalid-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error.message).toContain('PDF not found');
    });

    it('should update processing status in database', async () => {
      // Start processing
      await fetch(`${TEST_API_URL}/api/pdf/process/${uploadId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Check status updates
      const { data: record } = await supabase
        .from('pdf_imports')
        .select('status, processed_at, extracted_data')
        .eq('id', uploadId)
        .single();

      expect(record.status).toBe('processed');
      expect(record.processed_at).toBeTruthy();
      expect(record.extracted_data).toBeTruthy();
    });
  });

  describe('Form Generation from OCR', () => {
    let processedPdfId: string;
    let extractedData: any;

    beforeEach(async () => {
      // Upload and process a PDF
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'form-generation-test.pdf',
        contentType: 'application/pdf',
      });

      const uploadResponse = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      processedPdfId = uploadResult.id;

      // Process OCR
      const processResponse = await fetch(`${TEST_API_URL}/api/pdf/process/${processedPdfId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      extractedData = await processResponse.json();
    });

    it('should automatically create a form from OCR data', async () => {
      const response = await fetch(`${TEST_API_URL}/api/forms/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: processedPdfId,
          extractedData: extractedData,
        }),
      });

      expect(response.status).toBe(201);

      const form = await response.json();
      expect(form).toHaveProperty('id');
      expect(form).toHaveProperty('title');
      expect(form).toHaveProperty('fields');
      expect(Array.isArray(form.fields)).toBe(true);
      expect(form.fields.length).toBeGreaterThan(0);
    });

    it('should map OCR fields to appropriate form field types', async () => {
      const response = await fetch(`${TEST_API_URL}/api/forms/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: processedPdfId,
          extractedData: extractedData,
        }),
      });

      const form = await response.json();
      const fields = form.fields;

      // Verify field type mapping
      fields.forEach((field: any) => {
        if (field.label.toLowerCase().includes('email')) {
          expect(field.type).toBe('email');
          expect(field.validation).toHaveProperty('pattern');
        }
        if (field.label.toLowerCase().includes('phone')) {
          expect(field.type).toBe('tel');
        }
        if (field.label.toLowerCase().includes('date')) {
          expect(field.type).toBe('date');
        }
        if (field.label.toLowerCase().includes('signature')) {
          expect(field.type).toBe('signature');
        }
      });
    });

    it('should preserve field order from PDF', async () => {
      const response = await fetch(`${TEST_API_URL}/api/forms/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: processedPdfId,
          extractedData: extractedData,
        }),
      });

      const form = await response.json();
      
      // Verify fields are in the same order as extracted
      extractedData.fields.forEach((extractedField: any, index: number) => {
        expect(form.fields[index].label).toBe(extractedField.label);
      });
    });

    it('should allow editing generated form before saving', async () => {
      // Generate initial form
      const generateResponse = await fetch(`${TEST_API_URL}/api/forms/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: processedPdfId,
          extractedData: extractedData,
          draft: true, // Save as draft for editing
        }),
      });

      const draftForm = await generateResponse.json();

      // Edit the form
      const editedForm = {
        ...draftForm,
        title: 'Edited Wedding Contract Form',
        fields: [
          ...draftForm.fields,
          {
            type: 'textarea',
            label: 'Additional Notes',
            required: false,
          },
        ],
      };

      const updateResponse = await fetch(`${TEST_API_URL}/api/forms/${draftForm.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedForm),
      });

      expect(updateResponse.status).toBe(200);

      const updatedForm = await updateResponse.json();
      expect(updatedForm.title).toBe('Edited Wedding Contract Form');
      expect(updatedForm.fields.length).toBe(draftForm.fields.length + 1);
    });
  });

  describe('End-to-End PDF to Form Workflow', () => {
    it('should complete full workflow from PDF upload to form creation', async () => {
      // Step 1: Upload PDF
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'e2e-test.pdf',
        contentType: 'application/pdf',
      });

      const uploadResponse = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      expect(uploadResponse.status).toBe(200);
      const uploadResult = await uploadResponse.json();

      // Step 2: Process with OCR
      const processResponse = await fetch(`${TEST_API_URL}/api/pdf/process/${uploadResult.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(processResponse.status).toBe(200);
      const ocrResult = await processResponse.json();

      // Step 3: Generate form
      const formResponse = await fetch(`${TEST_API_URL}/api/forms/generate-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: uploadResult.id,
          extractedData: ocrResult,
        }),
      });

      expect(formResponse.status).toBe(201);
      const generatedForm = await formResponse.json();

      // Step 4: Verify form is accessible
      const getFormResponse = await fetch(`${TEST_API_URL}/api/forms/${generatedForm.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(getFormResponse.status).toBe(200);
      const retrievedForm = await getFormResponse.json();
      expect(retrievedForm.id).toBe(generatedForm.id);

      // Step 5: Submit a response to the form
      const submissionData = {
        formId: generatedForm.id,
        responses: generatedForm.fields.reduce((acc: any, field: any) => {
          acc[field.name] = field.type === 'email' ? 'test@example.com' :
                           field.type === 'tel' ? '+1234567890' :
                           field.type === 'date' ? '2024-12-25' :
                           'Test Response';
          return acc;
        }, {}),
      };

      const submitResponse = await fetch(`${TEST_API_URL}/api/forms/${generatedForm.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      expect(submitResponse.status).toBe(200);
      const submission = await submitResponse.json();
      expect(submission).toHaveProperty('id');
      expect(submission).toHaveProperty('submitted_at');
    });

    it('should handle concurrent PDF processing', async () => {
      const uploadPromises = [];

      // Upload multiple PDFs concurrently
      for (let i = 0; i < 5; i++) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testPdfPath), {
          filename: `concurrent-${i}.pdf`,
          contentType: 'application/pdf',
        });

        uploadPromises.push(
          fetch(`${TEST_API_URL}/api/pdf/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              ...formData.getHeaders(),
            },
            body: formData,
          }).then(res => res.json())
        );
      }

      const uploadResults = await Promise.all(uploadPromises);
      expect(uploadResults).toHaveLength(5);

      // Process all PDFs concurrently
      const processPromises = uploadResults.map(upload =>
        fetch(`${TEST_API_URL}/api/pdf/process/${upload.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.json())
      );

      const processResults = await Promise.all(processPromises);
      expect(processResults).toHaveLength(5);

      // Verify all processed successfully
      processResults.forEach(result => {
        expect(result).toHaveProperty('extractedText');
        expect(result).toHaveProperty('fields');
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should process PDFs within acceptable time limits', async () => {
      const startTime = Date.now();

      // Upload PDF
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testPdfPath), {
        filename: 'performance-test.pdf',
        contentType: 'application/pdf',
      });

      const uploadResponse = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      // Process with OCR
      await fetch(`${TEST_API_URL}/api/pdf/process/${uploadResult.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within 5 seconds for a standard PDF
      expect(processingTime).toBeLessThan(5000);
    });

    it('should cache OCR results for identical PDFs', async () => {
      // Upload same PDF twice
      const uploads = [];
      
      for (let i = 0; i < 2; i++) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testPdfPath), {
          filename: 'cache-test.pdf',
          contentType: 'application/pdf',
        });

        const response = await fetch(`${TEST_API_URL}/api/pdf/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders(),
          },
          body: formData,
        });

        uploads.push(await response.json());
      }

      // Process first PDF
      const firstStart = Date.now();
      await fetch(`${TEST_API_URL}/api/pdf/process/${uploads[0].id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const firstDuration = Date.now() - firstStart;

      // Process second PDF (should use cache)
      const secondStart = Date.now();
      await fetch(`${TEST_API_URL}/api/pdf/process/${uploads[1].id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const secondDuration = Date.now() - secondStart;

      // Second processing should be significantly faster due to caching
      expect(secondDuration).toBeLessThan(firstDuration / 2);
    });
  });
});

// Helper function to create a test PDF
function createTestPDF(filepath: string) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  
  doc.pipe(fs.createWriteStream(filepath));
  
  doc.fontSize(20).text('Wedding Service Contract', 100, 50);
  doc.fontSize(12);
  doc.text('Client Name: ___________________', 100, 100);
  doc.text('Email: ___________________', 100, 130);
  doc.text('Phone: ___________________', 100, 160);
  doc.text('Event Date: ___________________', 100, 190);
  doc.text('Venue: ___________________', 100, 220);
  doc.text('Package Type: ___________________', 100, 250);
  doc.text('Additional Notes:', 100, 280);
  doc.text('_________________________________', 100, 310);
  doc.text('_________________________________', 100, 340);
  doc.text('Signature: ___________________', 100, 380);
  doc.text('Date: ___________________', 100, 410);
  
  doc.end();
}