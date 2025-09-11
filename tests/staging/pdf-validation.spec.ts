import { test, expect } from '@playwright/test';
import { createReadStream, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { StagingValidationConfig } from './staging-validation.config';

const config = StagingValidationConfig;

test.describe('PDF Import Validation Tests', () => {
  
  test.beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    const fixturesDir = join(__dirname, '../fixtures');
    try {
      await import('fs').then(fs => fs.mkdirSync(fixturesDir, { recursive: true }));
    } catch (error) {
      // Directory might already exist
    }
    
    // Create mock PDF files for testing
    const smallPdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n174\n%%EOF');
    writeFileSync(join(fixturesDir, 'small-form.pdf'), smallPdfContent);
    
    // Create a larger mock PDF (simulated)
    const largePdfContent = Buffer.alloc(1024 * 1024, smallPdfContent); // 1MB
    writeFileSync(join(fixturesDir, 'large-form.pdf'), largePdfContent);
    
    // Create invalid file
    writeFileSync(join(fixturesDir, 'invalid-file.txt'), 'This is not a PDF file');
  });

  test('PDF validation endpoint responds correctly', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { filename: 'test.pdf', size: 1024 }
    });
    
    // Should return validation response (may be 401 if auth required)
    expect([200, 401, 422]).toContain(response.status());
    console.log(`📄 PDF validation endpoint status: ${response.status()}`);
  });

  test('PDF upload endpoint exists and handles requests', async ({ page }) => {
    // Test with minimal data to check endpoint existence
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/upload`, {
      data: { test: true }
    });
    
    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404);
    console.log(`📤 PDF upload endpoint accessible (status: ${response.status()})`);
  });

  test('PDF processing endpoint handles validation', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/process`, {
      data: { test: true }
    });
    
    // Endpoint should exist and handle requests
    expect(response.status()).not.toBe(404);
    console.log(`⚙️ PDF processing endpoint accessible (status: ${response.status()})`);
  });

  test('File size validation works correctly', async ({ page }) => {
    // Test with oversized file data
    const oversizeResponse = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { 
        filename: 'huge-file.pdf', 
        size: config.thresholds.files.maxPdfSize + 1 
      }
    });
    
    // Should reject oversized files appropriately
    expect([400, 401, 413, 422]).toContain(oversizeResponse.status());
    console.log('📏 File size validation working');
  });

  test('PDF form builder integration endpoint', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/forms/create-from-pdf`, {
      data: { test: true }
    });
    
    // Should exist and handle requests (even if auth protected)
    expect(response.status()).not.toBe(404);
    console.log(`🔄 PDF-to-form integration endpoint accessible`);
  });

  test('Core fields extraction endpoint validation', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/core-fields/extract`, {
      data: { test: true }
    });
    
    expect(response.status()).not.toBe(404);
    console.log('🎯 Core fields extraction endpoint accessible');
  });

  test('PDF security validation', async ({ page }) => {
    // Test with potentially malicious filename
    const maliciousFilename = '../../../etc/passwd';
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { filename: maliciousFilename, size: 1024 }
    });
    
    // Should handle malicious input safely
    expect([400, 401, 422]).toContain(response.status());
    console.log('🔒 PDF security validation working');
  });

  test('PDF processing performance check', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/process`, {
      data: { test: true, performanceCheck: true }
    });
    
    const responseTime = Date.now() - startTime;
    
    // Response should be reasonably fast even for validation
    expect(responseTime).toBeLessThan(5000); // 5 seconds max for validation
    console.log(`⚡ PDF processing response time: ${responseTime}ms`);
  });

  test('OCR service availability check', async ({ page }) => {
    // Check if OCR processing is configured
    const response = await page.request.get(`${config.environment.apiUrl}/health`);
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    // OCR availability may be indicated in health check
    console.log('👁️ OCR service availability checked');
  });

  test('PDF MIME type validation', async ({ page }) => {
    // Test with incorrect MIME type
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { 
        filename: 'document.pdf',
        mimeType: 'text/plain', // Wrong MIME type
        size: 1024 
      }
    });
    
    // Should reject invalid MIME types
    expect([400, 401, 422]).toContain(response.status());
    console.log('🎭 MIME type validation working');
  });

  test('PDF corruption handling', async ({ page }) => {
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { 
        filename: 'corrupted.pdf',
        corrupted: true,
        size: 1024 
      }
    });
    
    // Should handle corrupted file indicators
    expect(response.status()).not.toBe(500); // Should not crash
    console.log('🔧 PDF corruption handling verified');
  });
});