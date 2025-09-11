/**
 * File Upload Security Tests
 * Tests file upload validation, virus scanning, and security measures
 */

import { validateFile, sanitizeFilename, scanForMaliciousContent, generateFileHash, FileQuarantine } from '@/lib/file-security';
import fs from 'fs';
import path from 'path';

describe('File Upload Security Tests', () => {
  // Test file creation helpers
  const createTestFile = (content: string, filename: string): Buffer => {
    return Buffer.from(content, 'utf8');
  };

  const createJPEGHeader = (): Buffer => {
    // JPEG magic number: FFD8FF
    return Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  };

  const createPDFHeader = (): Buffer => {
    // PDF magic number: %PDF-
    return Buffer.from('%PDF-1.4\n');
  };

  describe('Filename Sanitization', () => {
    test('should sanitize dangerous characters', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file<script>.txt',
        'file"with"quotes.txt',
        'file|with|pipes.txt',
        'file:with:colons.txt',
        'file*with*asterisks.txt',
        'file?with?questions.txt',
        'CON.txt', // Windows reserved name
        'NUL.txt', // Windows reserved name
        'file\x00null.txt', // Null byte
      ];

      dangerousNames.forEach(name => {
        const sanitized = sanitizeFilename(name);
        
        expect(sanitized).not.toMatch(/[<>:"/\\|?*\x00-\x1f]/);
        expect(sanitized).not.toMatch(/\.\./);
        expect(sanitized).not.toMatch(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i);
      });
    });

    test('should preserve safe filenames', () => {
      const safeNames = [
        'document.pdf',
        'image_2023.jpg',
        'my-file-name.txt',
        'File with spaces.docx',
      ];

      safeNames.forEach(name => {
        const sanitized = sanitizeFilename(name);
        expect(sanitized).toBe(name);
      });
    });

    test('should handle extremely long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/\.txt$/);
    });

    test('should handle empty or invalid filenames', () => {
      expect(sanitizeFilename('')).toMatch(/^file_\d+$/);
      expect(sanitizeFilename('.')).toMatch(/^file_\d+$/);
      expect(sanitizeFilename('..')).toMatch(/^file_\d+$/);
      expect(sanitizeFilename('...')).toMatch(/^file_\d+$/);
    });
  });

  describe('File Type Validation', () => {
    test('should validate JPEG files correctly', async () => {
      const jpegHeader = createJPEGHeader();
      const jpegContent = Buffer.concat([jpegHeader, Buffer.from('fake image content')]);
      
      const validation = await validateFile(jpegContent, 'image.jpg');
      
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('image/jpeg');
    });

    test('should validate PDF files correctly', async () => {
      const pdfHeader = createPDFHeader();
      const pdfContent = Buffer.concat([pdfHeader, Buffer.from('fake pdf content')]);
      
      const validation = await validateFile(pdfContent, 'document.pdf');
      
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('application/pdf');
    });

    test('should reject files with mismatched extensions', async () => {
      const jpegHeader = createJPEGHeader();
      const jpegContent = Buffer.concat([jpegHeader, Buffer.from('fake image content')]);
      
      // JPEG content with .pdf extension should fail
      const validation = await validateFile(jpegContent, 'document.pdf');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/Invalid file type/));
    });

    test('should reject unknown file types', async () => {
      const unknownContent = Buffer.from('unknown file content');
      
      const validation = await validateFile(unknownContent, 'file.xyz');
      
      expect(validation.isValid).toBe(false);
    });

    test('should reject executable files', async () => {
      // PE executable header (MZ)
      const exeHeader = Buffer.from([0x4D, 0x5A]);
      const exeContent = Buffer.concat([exeHeader, Buffer.from('fake exe content')]);
      
      const validation = await validateFile(exeContent, 'malware.exe');
      
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Malicious Content Detection', () => {
    test('should detect script injection in files', () => {
      const maliciousContent = Buffer.from(`
        Normal content here
        <script>alert('XSS')</script>
        More normal content
      `);
      
      const scanResult = scanForMaliciousContent(maliciousContent);
      
      expect(scanResult.isSafe).toBe(false);
      expect(scanResult.detectedPatterns).toContain(expect.stringMatching(/script/i));
    });

    test('should detect PHP code injection', () => {
      const phpContent = Buffer.from(`
        Normal content
        <?php system($_GET['cmd']); ?>
        More content
      `);
      
      const scanResult = scanForMaliciousContent(phpContent);
      
      expect(scanResult.isSafe).toBe(false);
      expect(scanResult.detectedPatterns.length).toBeGreaterThan(0);
    });

    test('should detect JavaScript protocols', () => {
      const jsProtocolContent = Buffer.from('javascript:alert("XSS")');
      
      const scanResult = scanForMaliciousContent(jsProtocolContent);
      
      expect(scanResult.isSafe).toBe(false);
      expect(scanResult.detectedPatterns).toContain(expect.stringMatching(/javascript:/i));
    });

    test('should detect event handlers', () => {
      const eventHandlerContent = Buffer.from('<img src="x" onerror="alert(1)">');
      
      const scanResult = scanForMaliciousContent(eventHandlerContent);
      
      expect(scanResult.isSafe).toBe(false);
      expect(scanResult.detectedPatterns).toContain(expect.stringMatching(/on\w+\s*=/i));
    });

    test('should allow safe content', () => {
      const safeContent = Buffer.from(`
        This is a normal document.
        It contains regular text content.
        No malicious code here.
      `);
      
      const scanResult = scanForMaliciousContent(safeContent);
      
      expect(scanResult.isSafe).toBe(true);
      expect(scanResult.detectedPatterns).toHaveLength(0);
    });
  });

  describe('File Size Validation', () => {
    test('should reject oversized files', async () => {
      const oversizedContent = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const validation = await validateFile(oversizedContent, 'large.txt');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/size.*exceeds/i));
    });

    test('should accept files within size limit', async () => {
      const normalContent = Buffer.from('Normal sized content');
      
      const validation = await validateFile(normalContent, 'normal.txt');
      
      expect(validation.isValid).toBe(true);
    });

    test('should respect custom size limits', async () => {
      const content = Buffer.alloc(2 * 1024); // 2KB
      const customLimit = 1024; // 1KB limit
      
      const validation = await validateFile(content, 'file.txt', customLimit);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/exceeds.*1KB/));
    });
  });

  describe('File Hash Generation', () => {
    test('should generate consistent hashes', () => {
      const content1 = Buffer.from('test content');
      const content2 = Buffer.from('test content');
      const content3 = Buffer.from('different content');
      
      const hash1 = generateFileHash(content1);
      const hash2 = generateFileHash(content2);
      const hash3 = generateFileHash(content3);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format
    });

    test('should generate different hashes for different content', () => {
      const contents = [
        Buffer.from('content 1'),
        Buffer.from('content 2'),
        Buffer.from('content 3'),
      ];
      
      const hashes = contents.map(generateFileHash);
      const uniqueHashes = new Set(hashes);
      
      expect(uniqueHashes.size).toBe(contents.length);
    });
  });

  describe('File Quarantine System', () => {
    test('should quarantine malicious files', () => {
      const maliciousContent = Buffer.from('<script>alert("XSS")</script>');
      const filename = 'malicious.txt';
      const reason = 'Script injection detected';
      
      const quarantineId = FileQuarantine.quarantineFile(maliciousContent, filename, reason);
      
      expect(quarantineId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      
      const quarantinedFile = FileQuarantine.getQuarantinedFile(quarantineId);
      expect(quarantinedFile?.originalFilename).toBe(filename);
      expect(quarantinedFile?.reason).toBe(reason);
    });

    test('should release files from quarantine', () => {
      const content = Buffer.from('suspicious content');
      const quarantineId = FileQuarantine.quarantineFile(content, 'file.txt', 'suspicious');
      
      expect(FileQuarantine.getQuarantinedFile(quarantineId)).toBeTruthy();
      
      const released = FileQuarantine.releaseFile(quarantineId);
      expect(released).toBe(true);
      expect(FileQuarantine.getQuarantinedFile(quarantineId)).toBeUndefined();
    });

    test('should provide quarantine statistics', () => {
      // Clear any existing quarantine
      FileQuarantine['quarantinedFiles'].clear();
      
      FileQuarantine.quarantineFile(Buffer.from('file1'), 'file1.txt', 'reason1');
      FileQuarantine.quarantineFile(Buffer.from('file2'), 'file2.txt', 'reason1');
      FileQuarantine.quarantineFile(Buffer.from('file3'), 'file3.txt', 'reason2');
      
      const stats = FileQuarantine.getQuarantineStats();
      
      expect(stats.totalFiles).toBe(3);
      expect(stats.reasons.reason1).toBe(2);
      expect(stats.reasons.reason2).toBe(1);
    });
  });

  describe('Comprehensive File Validation', () => {
    test('should validate a safe image file', async () => {
      const jpegHeader = createJPEGHeader();
      const imageContent = Buffer.concat([jpegHeader, Buffer.from('safe image data')]);
      
      const validation = await validateFile(imageContent, 'photo.jpg');
      
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('image/jpeg');
      expect(validation.sanitizedFilename).toBe('photo.jpg');
      expect(validation.errors).toHaveLength(0);
      expect(validation.metadata.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should reject a malicious image file', async () => {
      const jpegHeader = createJPEGHeader();
      const maliciousImageContent = Buffer.concat([
        jpegHeader,
        Buffer.from('<script>alert("XSS")</script>')
      ]);
      
      const validation = await validateFile(maliciousImageContent, 'malicious.jpg');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringMatching(/Malicious content detected/));
    });

    test('should handle empty files', async () => {
      const emptyContent = Buffer.alloc(0);
      
      const validation = await validateFile(emptyContent, 'empty.txt');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });

    test('should validate file with warnings', async () => {
      const content = Buffer.from('safe content');
      const problematicFilename = 'file with spaces & chars!.txt';
      
      const validation = await validateFile(content, problematicFilename);
      
      expect(validation.warnings).toContain('Filename was sanitized for security');
      expect(validation.sanitizedFilename).toBe('file with spaces _ chars_.txt');
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    test('should handle zip bomb attempts', async () => {
      // Simulate a highly compressed malicious file
      const suspiciouslySmallFile = Buffer.from('PK'); // ZIP header
      
      const validation = await validateFile(suspiciouslySmallFile, 'bomb.zip');
      
      expect(validation.isValid).toBe(false);
    });

    test('should detect polyglot files', async () => {
      // File that appears to be both JPEG and HTML
      const polyglotContent = Buffer.concat([
        createJPEGHeader(),
        Buffer.from('<html><script>alert("XSS")</script></html>')
      ]);
      
      const validation = await validateFile(polyglotContent, 'polyglot.jpg');
      
      expect(validation.isValid).toBe(false);
    });

    test('should handle files with null bytes', async () => {
      const nullByteContent = Buffer.from('normal content\x00<script>alert("XSS")</script>');
      
      const scanResult = scanForMaliciousContent(nullByteContent);
      
      expect(scanResult.isSafe).toBe(false);
    });
  });
});