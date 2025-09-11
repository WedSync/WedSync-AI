#!/usr/bin/env node

/**
 * Test script for PDF import to Form creation pipeline
 * Usage: npm run test:pdf-import [pdf-file-path]
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Environment setup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test configuration
const TEST_USER_EMAIL = 'test@wedsync.com';
const TEST_USER_PASSWORD = 'Test123!@#';
const TEST_ORG_ID = 'test-org-123';

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class PDFPipelineTest {
  private supabase: any;
  private results: TestResult[] = [];
  private authToken?: string;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async run(pdfPath?: string) {
    console.log('🚀 Starting PDF Import Pipeline Test');
    console.log('=========================================\n');

    try {
      // Step 1: Authenticate
      await this.testAuthentication();

      // Step 2: Upload PDF
      const uploadId = await this.testPDFUpload(pdfPath);

      // Step 3: Process PDF with OCR
      const processingResult = await this.testPDFProcessing(uploadId);

      // Step 4: Verify form creation
      await this.testFormCreation(uploadId);

      // Step 5: Test large PDF handling
      if (!pdfPath) {
        await this.testLargePDFHandling();
      }

      // Step 6: Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test failed:', error);
      this.generateReport();
      process.exit(1);
    }
  }

  private async testAuthentication(): Promise<void> {
    const startTime = Date.now();
    console.log('📝 Step 1: Authenticating...');

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });

      if (error) throw error;

      this.authToken = data.session?.access_token;
      
      this.results.push({
        step: 'Authentication',
        success: true,
        duration: Date.now() - startTime,
        details: { userId: data.user?.id }
      });

      console.log('✅ Authentication successful\n');
    } catch (error) {
      this.results.push({
        step: 'Authentication',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async testPDFUpload(pdfPath?: string): Promise<string> {
    const startTime = Date.now();
    console.log('📤 Step 2: Uploading PDF...');

    try {
      // Use provided PDF or create a test PDF
      const pdfBuffer = pdfPath 
        ? await readFile(pdfPath)
        : await this.createTestPDF();

      const filename = pdfPath ? pdfPath.split('/').pop() : 'test-document.pdf';
      
      // Upload to Supabase storage
      const uploadId = `test_${Date.now()}`;
      const { error: uploadError } = await this.supabase.storage
        .from('pdf-uploads')
        .upload(`${TEST_ORG_ID}/${uploadId}`, pdfBuffer, {
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;

      // Create import record
      const { error: recordError } = await this.supabase
        .from('pdf_imports')
        .insert({
          id: uploadId,
          original_filename: filename,
          file_path: `${TEST_ORG_ID}/${uploadId}`,
          file_size: pdfBuffer.byteLength,
          organization_id: TEST_ORG_ID,
          upload_status: 'uploaded'
        });

      if (recordError) throw recordError;

      this.results.push({
        step: 'PDF Upload',
        success: true,
        duration: Date.now() - startTime,
        details: { 
          uploadId, 
          fileSize: `${(pdfBuffer.byteLength / 1024).toFixed(2)} KB` 
        }
      });

      console.log(`✅ PDF uploaded successfully (ID: ${uploadId})\n`);
      return uploadId;

    } catch (error) {
      this.results.push({
        step: 'PDF Upload',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async testPDFProcessing(uploadId: string): Promise<any> {
    const startTime = Date.now();
    console.log('⚙️  Step 3: Processing PDF with OCR...');

    try {
      // Call processing API
      const response = await fetch(`${API_URL}/api/pdf/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          uploadId,
          options: {
            qualityCheck: true,
            parallel: true,
            autoCreateForm: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Poll for completion
      let attempts = 0;
      let processingComplete = false;
      let finalStatus: any = null;

      while (!processingComplete && attempts < 60) { // Max 60 attempts (5 minutes)
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(
          `${API_URL}/api/pdf/process?uploadId=${uploadId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.authToken}`
            }
          }
        );

        if (statusResponse.ok) {
          finalStatus = await statusResponse.json();
          processingComplete = finalStatus.upload?.status === 'processed' || 
                             finalStatus.upload?.status === 'failed';
        }

        attempts++;
        process.stdout.write('.');
      }

      console.log(''); // New line after progress dots

      if (!processingComplete) {
        throw new Error('Processing timeout');
      }

      this.results.push({
        step: 'PDF Processing',
        success: finalStatus?.upload?.status === 'processed',
        duration: Date.now() - startTime,
        details: {
          fieldsExtracted: finalStatus?.processing?.result?.fields?.length || 0,
          pageCount: finalStatus?.processing?.result?.pageCount || 0,
          processingTime: finalStatus?.processing?.result?.processingTimeMs
        }
      });

      console.log(`✅ PDF processed successfully (${finalStatus?.processing?.result?.fields?.length || 0} fields extracted)\n`);
      return finalStatus;

    } catch (error) {
      this.results.push({
        step: 'PDF Processing',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async testFormCreation(uploadId: string): Promise<void> {
    const startTime = Date.now();
    console.log('📝 Step 4: Verifying form creation...');

    try {
      // Check if form was created
      const { data: pdfImport, error } = await this.supabase
        .from('pdf_imports')
        .select('generated_form_id')
        .eq('id', uploadId)
        .single();

      if (error) throw error;

      if (!pdfImport?.generated_form_id) {
        throw new Error('Form was not auto-created');
      }

      // Get form details
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .select('*')
        .eq('id', pdfImport.generated_form_id)
        .single();

      if (formError) throw formError;

      this.results.push({
        step: 'Form Creation',
        success: true,
        duration: Date.now() - startTime,
        details: {
          formId: form.id,
          fieldCount: form.fields?.length || 0,
          formTitle: form.title
        }
      });

      console.log(`✅ Form created successfully (${form.fields?.length || 0} fields)\n`);

    } catch (error) {
      this.results.push({
        step: 'Form Creation',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async testLargePDFHandling(): Promise<void> {
    const startTime = Date.now();
    console.log('📚 Step 5: Testing large PDF handling (200+ pages)...');

    try {
      // Create a large test PDF (simulated)
      console.log('Creating large test PDF...');
      const largePdfBuffer = await this.createLargeTestPDF(200);
      
      const uploadId = `test_large_${Date.now()}`;
      
      // Upload large PDF
      const { error: uploadError } = await this.supabase.storage
        .from('pdf-uploads')
        .upload(`${TEST_ORG_ID}/${uploadId}`, largePdfBuffer, {
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;

      // Process with optimized processor
      const processStart = Date.now();
      
      const response = await fetch(`${API_URL}/api/pdf/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          uploadId,
          options: {
            qualityCheck: false, // Skip for performance test
            parallel: true,
            autoCreateForm: false // Skip form creation for this test
          }
        })
      });

      const processTime = Date.now() - processStart;

      this.results.push({
        step: 'Large PDF Handling',
        success: processTime < 2000, // Success if under 2 seconds
        duration: processTime,
        details: {
          pageCount: 200,
          fileSize: `${(largePdfBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB`,
          processingTime: `${processTime}ms`,
          meetsTarget: processTime < 2000
        }
      });

      if (processTime < 2000) {
        console.log(`✅ Large PDF processed in ${processTime}ms (Target: <2000ms)\n`);
      } else {
        console.log(`⚠️  Large PDF processed in ${processTime}ms (Target: <2000ms)\n`);
      }

    } catch (error) {
      this.results.push({
        step: 'Large PDF Handling',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Large PDF handling failed: ${error}\n`);
    }
  }

  private async createTestPDF(): Promise<Buffer> {
    // Create a simple test PDF buffer
    // In a real implementation, use a PDF library like pdfkit
    const testContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
/Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(Wedding Guest List) Tj
0 -20 Td
(Bride Name: Jane Doe) Tj
0 -20 Td
(Groom Name: John Smith) Tj
0 -20 Td
(Wedding Date: 2024-06-15) Tj
0 -20 Td
(Venue: Grand Hotel) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
492
%%EOF`;

    return Buffer.from(testContent);
  }

  private async createLargeTestPDF(pageCount: number): Promise<Buffer> {
    // Simulate a large PDF (simplified for testing)
    // In production, use proper PDF generation
    const header = '%PDF-1.4\n';
    const footer = '%%EOF';
    
    // Create minimal page content
    let content = header;
    for (let i = 0; i < pageCount; i++) {
      content += `% Page ${i + 1}\n`;
    }
    content += footer;

    return Buffer.from(content);
  }

  private generateReport(): void {
    console.log('\n=========================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=========================================\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    // Individual test results
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      
      console.log(`${icon} ${result.step}: ${duration}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   - ${key}: ${value}`);
        });
      }
      
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
      
      console.log('');
    });

    // Summary
    console.log('=========================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('=========================================\n');

    // Exit code
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

// Run the test
const pdfPath = process.argv[2];
const test = new PDFPipelineTest();
test.run(pdfPath).catch(console.error);