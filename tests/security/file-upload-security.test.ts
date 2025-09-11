/**
 * Comprehensive File Upload Security Test Suite
 * Tests file validation, security scanning, rate limiting, and threat detection
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { FileUploadSecurity, SECURE_FILE_TYPES } from '@/lib/security/file-upload-security';
import { productionRateLimiters } from '@/lib/security/production-rate-limiter';
import request from 'supertest';
import * as crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('File Upload Security Tests', () => {
  let fileUploadSecurity: FileUploadSecurity;
  let testUserId: string;
  let authToken: string;

  beforeAll(() => {
    fileUploadSecurity = new FileUploadSecurity({
      allowedTypes: ['pdf', 'image', 'document'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFilesPerUser: 100,
      maxFilesPerDay: 50,
      requireAuthentication: true,
      requireCSRF: true
    });
    
    testUserId = 'test-user-' + crypto.randomBytes(8).toString('hex');
    authToken = 'test-auth-token-' + crypto.randomBytes(16).toString('hex');
  });

  describe('Authentication & Authorization', () => {
    it('should reject file uploads without authentication', async () => {
      const response = await request(API_URL)
        .post('/api/pdf/upload')
        .attach('file', Buffer.from('%PDF-1.4\ntest'), 'test.pdf');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject file uploads with invalid tokens', async () => {
      const response = await request(API_URL)
        .post('/api/pdf/upload')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', Buffer.from('%PDF-1.4\ntest'), 'test.pdf');
      
      expect(response.status).toBe(401);
    });

    it('should require CSRF tokens for upload requests', async () => {
      const response = await request(API_URL)
        .post('/api/pdf/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('%PDF-1.4\ntest'), 'test.pdf');
      
      // Should fail without CSRF token
      expect([400, 403]).toContain(response.status);
    });
  });

  describe('File Type Validation', () => {
    it('should accept valid PDF files with correct magic numbers', async () => {
      const validPDF = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.from('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n'),
        Buffer.from('trailer\n<</Size 2/Root 1 0 R>>\nstartxref\n%%EOF')
      ]);

      const file = new File([validPDF], 'valid.pdf', { type: 'application/pdf' });
      const result = await fileUploadSecurity.validateFile(file, testUserId);
      
      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.threatLevel).toBe('none');
    });

    it('should accept valid JPEG images', async () => {
      const validJPEG = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.alloc(100, 0x00), // Minimal content
        Buffer.from([0xFF, 0xD9]) // JPEG end
      ]);

      const file = new File([validJPEG], 'image.jpg', { type: 'image/jpeg' });
      const result = await fileUploadSecurity.validateFile(file, testUserId);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata.mimeType).toBe('image/jpeg');
    });

    it('should accept valid PNG images', async () => {
      const validPNG = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
        Buffer.alloc(100, 0x00) // Minimal content
      ]);

      const file = new File([validPNG], 'image.png', { type: 'image/png' });
      const result = await fileUploadSecurity.validateFile(file, testUserId);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata.mimeType).toBe('image/png');
    });

    it('should reject files with wrong MIME types', async () => {
      const response = await request(API_URL)
        .post('/api/pdf/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .attach('file', Buffer.from('not a pdf'), 'test.txt');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should reject files with mismatched magic numbers', async () => {
      const fakeContent = Buffer.from('This is not a PDF file but has PDF extension');
      const file = new File([fakeContent], 'fake.pdf', { type: 'application/pdf' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('File content does not match declared file type (magic number mismatch)');
    });

    it('should reject dangerous file extensions', async () => {
      const executableContent = Buffer.from('MZ\x90\x00'); // PE header
      const file = new File([executableContent], 'malware.exe', { type: 'application/x-executable' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Unsupported file type'))).toBe(true);
    });
  });

  describe('File Size Limits', () => {
    it('should reject files exceeding maximum size', async () => {
      const largeContent = Buffer.alloc(60 * 1024 * 1024); // 60MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('exceeds maximum allowed size'))).toBe(true);
    });

    it('should reject empty files', async () => {
      const emptyContent = Buffer.alloc(0);
      const file = new File([emptyContent], 'empty.pdf', { type: 'application/pdf' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('File is empty');
    });

    it('should handle file size inconsistencies', async () => {
      // This simulates a file where reported size doesn't match actual content
      const content = Buffer.from('small content');
      const file = new File([content], 'test.pdf', { type: 'application/pdf' });
      
      // Manually modify size (in real scenario this could happen with corrupted uploads)
      Object.defineProperty(file, 'size', { value: 1000000 });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('size mismatch'))).toBe(true);
    });
  });

  describe('Security Threat Detection', () => {
    it('should detect JavaScript in PDF content', async () => {
      const maliciousPDF = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.from('/JS (app.alert("XSS attack!");)\n'),
        Buffer.from('%%EOF')
      ]);

      const file = new File([maliciousPDF], 'malicious.pdf', { type: 'application/pdf' });
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.threatLevel).toBe('high');
      expect(result.issues.some(issue => issue.includes('JavaScript'))).toBe(true);
    });

    it('should detect embedded scripts in content', async () => {
      const scriptContent = Buffer.from('<script>alert("XSS")</script>Normal content');
      const file = new File([scriptContent], 'script.txt', { type: 'text/plain' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.threatLevel).toBe('high');
      expect(result.issues.some(issue => issue.includes('script content'))).toBe(true);
    });

    it('should detect SQL injection patterns', async () => {
      const sqlContent = Buffer.from('data; DROP TABLE users; --');
      const file = new File([sqlContent], 'sql.txt', { type: 'text/plain' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(issue => issue.includes('SQL injection'))).toBe(true);
    });

    it('should detect command injection patterns', async () => {
      const commandContent = Buffer.from('file && rm -rf / #');
      const file = new File([commandContent], 'command.txt', { type: 'text/plain' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(issue => issue.includes('Command injection'))).toBe(true);
    });

    it('should detect EICAR test virus signature', async () => {
      const eicarSignature = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      const file = new File([eicarSignature], 'virus.txt', { type: 'text/plain' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.threatLevel).toBe('critical');
      expect(result.virusScan?.clean).toBe(false);
      expect(result.issues.some(issue => issue.includes('Malware detected'))).toBe(true);
    });

    it('should detect high entropy content (potential encrypted malware)', async () => {
      // Generate high-entropy random data
      const highEntropyContent = crypto.randomBytes(2000);
      const file = new File([highEntropyContent], 'encrypted.bin', { type: 'application/octet-stream' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.virusScan?.clean).toBe(false);
      expect(result.virusScan?.threats.some(threat => threat.includes('High entropy'))).toBe(true);
    });
  });

  describe('Advanced Threat Detection', () => {
    it('should detect polyglot files', async () => {
      // Create a file that has both PDF and ZIP signatures
      const polyglotContent = Buffer.concat([
        Buffer.from('%PDF-1.4\n'), // PDF signature
        Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP signature
        Buffer.alloc(200, 0x00)
      ]);

      const file = new File([polyglotContent], 'polyglot.pdf', { type: 'application/pdf' });
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isSafe).toBe(false);
      expect(result.issues.some(issue => issue.includes('Polyglot file'))).toBe(true);
    });

    it('should detect suspicious data patterns', async () => {
      // Create content with excessive null bytes
      const suspiciousContent = Buffer.concat([
        Buffer.from('normal content'),
        Buffer.alloc(8000, 0x00), // Lots of null bytes
        Buffer.from('more content')
      ]);

      const file = new File([suspiciousContent], 'suspicious.txt', { type: 'text/plain' });
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.warnings.some(warning => warning.includes('data patterns'))).toBe(true);
    });

    it('should analyze PDF-specific threats', async () => {
      const threatPDF = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.from('/EmbeddedFile /URI (http://malicious.com)\n'), // Embedded file + URI
        Buffer.from('/AcroForm << /DR << >> >>\n'), // Interactive form
        Buffer.from('%%EOF')
      ]);

      const file = new File([threatPDF], 'threat.pdf', { type: 'application/pdf' });
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.warnings.some(warning => 
        warning.includes('embedded files') || 
        warning.includes('URI actions') || 
        warning.includes('interactive forms')
      )).toBe(true);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize path traversal attempts', async () => {
      const sanitized = fileUploadSecurity.sanitizeFilename('../../../etc/passwd.pdf');
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toMatch(/^etc_passwd_.*\.pdf$/);
    });

    it('should sanitize dangerous characters', async () => {
      const dangerous = 'file<script>|name?.pdf';
      const sanitized = fileUploadSecurity.sanitizeFilename(dangerous);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('?');
      expect(sanitized).toMatch(/^file_script__name__.*\.pdf$/);
    });

    it('should handle reserved Windows names', async () => {
      const reserved = 'CON.pdf';
      const sanitized = fileUploadSecurity.sanitizeFilename(reserved);
      
      expect(sanitized).toMatch(/^CON_.*\.pdf$/);
    });

    it('should limit filename length', async () => {
      const longName = 'a'.repeat(200) + '.pdf';
      const sanitized = fileUploadSecurity.sanitizeFilename(longName);
      
      expect(sanitized.length).toBeLessThan(120); // Including timestamp
      expect(sanitized).toEndWith('.pdf');
    });

    it('should handle empty or invalid filenames', async () => {
      expect(fileUploadSecurity.sanitizeFilename('')).toMatch(/^file_.*$/);
      expect(fileUploadSecurity.sanitizeFilename('   ')).toMatch(/^file_.*$/);
      expect(fileUploadSecurity.sanitizeFilename('...')).toMatch(/^file_.*$/);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce upload rate limits', async () => {
      const validPDF = Buffer.from('%PDF-1.4\ntest content\n%%EOF');
      
      // Attempt multiple rapid uploads
      const uploadPromises = Array(6).fill(null).map(() =>
        request(API_URL)
          .post('/api/pdf/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'test-csrf-token')
          .attach('file', validPDF, 'test.pdf')
      );
      
      const responses = await Promise.all(uploadPromises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].headers['retry-after']).toBeDefined();
    });

    it('should include rate limit headers in responses', async () => {
      const validPDF = Buffer.from('%PDF-1.4\ntest\n%%EOF');
      
      const response = await request(API_URL)
        .post('/api/pdf/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .attach('file', validPDF, 'test.pdf');
      
      if (response.status !== 429) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted file uploads gracefully', async () => {
      // Simulate network corruption or incomplete upload
      const corruptedFile = {
        name: 'corrupted.pdf',
        type: 'application/pdf',
        size: 1000,
        arrayBuffer: () => Promise.reject(new Error('File read error'))
      } as File;

      const result = await fileUploadSecurity.validateFile(corruptedFile);
      
      expect(result.isValid).toBe(false);
      expect(result.threatLevel).toBe('critical');
      expect(result.issues).toContain('File validation failed due to internal error');
    });

    it('should handle files with unusual extensions', async () => {
      const content = Buffer.from('test content');
      const file = new File([content], 'test.unknownext', { type: 'application/octet-stream' });
      
      const result = await fileUploadSecurity.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Unsupported file type'))).toBe(true);
    });

    it('should provide comprehensive validation reports', async () => {
      const content = Buffer.from('%PDF-1.4\nsafe content\n%%EOF');
      const file = new File([content], 'test.pdf', { type: 'application/pdf' });
      
      const result = await fileUploadSecurity.validateFile(file, testUserId);
      
      // Verify all required fields are present
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('isSafe');
      expect(result).toHaveProperty('threatLevel');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('virusScan');
      
      // Verify metadata completeness
      expect(result.metadata).toHaveProperty('originalName');
      expect(result.metadata).toHaveProperty('sanitizedName');
      expect(result.metadata).toHaveProperty('size');
      expect(result.metadata).toHaveProperty('mimeType');
      expect(result.metadata).toHaveProperty('extension');
      expect(result.metadata).toHaveProperty('hash');
      expect(result.metadata).toHaveProperty('uploadTimestamp');
    });
  });

  describe('Performance and Scalability', () => {
    it('should process large files efficiently', async () => {
      const startTime = Date.now();
      const largeContent = Buffer.alloc(5 * 1024 * 1024); // 5MB
      largeContent.write('%PDF-1.4\n', 0); // Valid PDF header
      
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = await fileUploadSecurity.validateFile(file);
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result).toBeDefined();
    });

    it('should handle concurrent validations', async () => {
      const content = Buffer.from('%PDF-1.4\ntest\n%%EOF');
      
      const validationPromises = Array(5).fill(null).map((_, index) => {
        const file = new File([content], `test${index}.pdf`, { type: 'application/pdf' });
        return fileUploadSecurity.validateFile(file, `user-${index}`);
      });
      
      const results = await Promise.all(validationPromises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('metadata');
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should have correct file type configurations', () => {
      expect(SECURE_FILE_TYPES.pdf.magicNumbers[0]).toEqual(Buffer.from([0x25, 0x50, 0x44, 0x46])); // %PDF
      expect(SECURE_FILE_TYPES.image.magicNumbers[0]).toEqual(Buffer.from([0xFF, 0xD8, 0xFF])); // JPEG
      expect(SECURE_FILE_TYPES.image.magicNumbers[1]).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47])); // PNG
    });

    it('should have appropriate security levels', () => {
      expect(SECURE_FILE_TYPES.pdf.securityLevel).toBe('high');
      expect(SECURE_FILE_TYPES.image.securityLevel).toBe('medium');
      expect(SECURE_FILE_TYPES.document.securityLevel).toBe('high');
    });

    it('should require virus scanning for all file types', () => {
      Object.values(SECURE_FILE_TYPES).forEach(config => {
        expect(config.requiresScanning).toBe(true);
      });
    });
  });
});