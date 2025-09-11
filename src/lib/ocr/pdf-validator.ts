/**
 * PDF Security Validator
 * Validates PDF files for security threats and compliance
 */

import crypto from 'crypto';
import { Buffer } from 'buffer';

interface ValidationResult {
  isValid: boolean;
  isSafe: boolean;
  issues: string[];
  metadata?: Record<string, any>;
}

interface SecurityConfig {
  maxFileSizeMB: number;
  allowJavaScript: boolean;
  allowEmbeddedFiles: boolean;
  allowExternalReferences: boolean;
  allowForms: boolean;
  scanForVirus: boolean;
}

export class PDFValidator {
  private readonly config: SecurityConfig;
  private readonly PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
  private readonly MAX_FILE_SIZE: number;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxFileSizeMB: 10,
      allowJavaScript: false,
      allowEmbeddedFiles: false,
      allowExternalReferences: false,
      allowForms: false,
      scanForVirus: true,
      ...config,
    };

    this.MAX_FILE_SIZE = this.config.maxFileSizeMB * 1024 * 1024;
  }

  /**
   * Comprehensive PDF validation
   */
  async validate(buffer: Buffer, filename: string): Promise<ValidationResult> {
    const issues: string[] = [];

    // Basic validations
    if (!this.validateSize(buffer)) {
      issues.push(`File size exceeds ${this.config.maxFileSizeMB}MB limit`);
    }

    if (!this.validateSignature(buffer)) {
      issues.push('Invalid PDF file signature');
    }

    if (!this.validateFilename(filename)) {
      issues.push('Filename contains potentially dangerous characters');
    }

    // Security checks
    const securityIssues = await this.performSecurityChecks(buffer);
    issues.push(...securityIssues);

    // Extract and sanitize metadata
    const metadata = this.extractMetadata(buffer);

    return {
      isValid: issues.length === 0,
      isSafe: !this.hasCriticalIssues(issues),
      issues,
      metadata,
    };
  }

  /**
   * Validate file size
   */
  private validateSize(buffer: Buffer): boolean {
    return buffer.length <= this.MAX_FILE_SIZE;
  }

  /**
   * Validate PDF signature
   */
  private validateSignature(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    return buffer.subarray(0, 4).equals(this.PDF_MAGIC_BYTES);
  }

  /**
   * Validate filename for security issues
   */
  private validateFilename(filename: string): boolean {
    // Check for path traversal attempts
    const dangerousPatterns = [
      '../',
      '..\\',
      '%2e%2e',
      '0x2e0x2e',
      '<',
      '>',
      '|',
      '&',
      ';',
      '$',
      '`',
    ];

    const normalizedFilename = filename.toLowerCase();
    return !dangerousPatterns.some((pattern) =>
      normalizedFilename.includes(pattern),
    );
  }

  /**
   * Perform comprehensive security checks
   */
  private async performSecurityChecks(buffer: Buffer): Promise<string[]> {
    const issues: string[] = [];
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));

    // Check for JavaScript
    if (!this.config.allowJavaScript && this.containsJavaScript(content)) {
      issues.push('PDF contains JavaScript code');
    }

    // Check for embedded files
    if (
      !this.config.allowEmbeddedFiles &&
      this.containsEmbeddedFiles(content)
    ) {
      issues.push('PDF contains embedded files');
    }

    // Check for external references
    if (
      !this.config.allowExternalReferences &&
      this.containsExternalReferences(content)
    ) {
      issues.push('PDF contains external references or actions');
    }

    // Check for forms
    if (!this.config.allowForms && this.containsForms(content)) {
      issues.push('PDF contains interactive forms');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(content);
    if (suspiciousPatterns.length > 0) {
      issues.push(...suspiciousPatterns);
    }

    // Virus scanning
    if (this.config.scanForVirus) {
      const isClean = await this.scanForMalware(buffer);
      if (!isClean) {
        issues.push('PDF failed malware scan');
      }
    }

    return issues;
  }

  /**
   * Check for JavaScript in PDF
   */
  private containsJavaScript(content: string): boolean {
    const jsPatterns = [
      /\/JavaScript/i,
      /\/JS\s*\(/i,
      /\/JS\s*<</i,
      /\/OpenAction.*\/JavaScript/i,
    ];

    return jsPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check for embedded files
   */
  private containsEmbeddedFiles(content: string): boolean {
    const embedPatterns = [
      /\/EmbeddedFile/i,
      /\/Filespec/i,
      /\/EmbeddedFiles/i,
      /\/FileAttachment/i,
    ];

    return embedPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check for external references
   */
  private containsExternalReferences(content: string): boolean {
    const externalPatterns = [
      /\/Launch/i,
      /\/GoToR/i,
      /\/URI/i,
      /\/GoToE/i,
      /\/ImportData/i,
      /\/SubmitForm/i,
    ];

    return externalPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check for interactive forms
   */
  private containsForms(content: string): boolean {
    const formPatterns = [/\/AcroForm/i, /\/XFA/i, /\/Field/i, /\/Widget/i];

    return formPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Detect additional suspicious patterns
   */
  private detectSuspiciousPatterns(content: string): string[] {
    const issues: string[] = [];

    // Check for unusual object streams
    if (/ObjStm/i.test(content)) {
      issues.push('PDF contains compressed object streams');
    }

    // Check for encryption
    if (/\/Encrypt/i.test(content)) {
      issues.push('PDF is encrypted');
    }

    // Check for suspicious names
    if (/\/Names.*\/JavaScript/i.test(content)) {
      issues.push('PDF contains named JavaScript actions');
    }

    // Check for unusual filters
    if (/\/Filter.*\/JBIG2Decode/i.test(content)) {
      issues.push('PDF uses JBIG2 compression (potential security risk)');
    }

    return issues;
  }

  /**
   * Scan for malware (mock implementation)
   */
  private async scanForMalware(buffer: Buffer): Promise<boolean> {
    // Calculate hash for comparison with known malware
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // In production, integrate with ClamAV or similar
    // For now, check against a mock malware database
    const knownMalwareHashes = new Set([
      // These are example hashes, not real malware
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ]);

    return !knownMalwareHashes.has(hash);
  }

  /**
   * Extract and sanitize PDF metadata
   */
  private extractMetadata(buffer: Buffer): Record<string, any> {
    const metadata: Record<string, any> = {};
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));

    // Extract basic metadata
    const titleMatch = content.match(/\/Title\s*\((.*?)\)/);
    const authorMatch = content.match(/\/Author\s*\((.*?)\)/);
    const subjectMatch = content.match(/\/Subject\s*\((.*?)\)/);
    const creatorMatch = content.match(/\/Creator\s*\((.*?)\)/);

    if (titleMatch) metadata.title = this.sanitizeString(titleMatch[1]);
    if (authorMatch) metadata.author = this.sanitizeString(authorMatch[1]);
    if (subjectMatch) metadata.subject = this.sanitizeString(subjectMatch[1]);
    if (creatorMatch) metadata.creator = this.sanitizeString(creatorMatch[1]);

    // Extract creation date
    const creationDateMatch = content.match(/\/CreationDate\s*\(D:(.*?)\)/);
    if (creationDateMatch) {
      metadata.creationDate = this.parsePDFDate(creationDateMatch[1]);
    }

    return metadata;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Parse PDF date format
   */
  private parsePDFDate(dateString: string): Date | null {
    // PDF date format: YYYYMMDDHHmmSSOHH'mm
    const match = dateString.match(/^(\d{4})(\d{2})(\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}`);
    }
    return null;
  }

  /**
   * Check if issues contain critical security problems
   */
  private hasCriticalIssues(issues: string[]): boolean {
    const criticalKeywords = ['JavaScript', 'malware', 'Launch', 'external'];

    return issues.some((issue) =>
      criticalKeywords.some((keyword) =>
        issue.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
  }

  /**
   * Generate security audit log
   */
  generateAuditLog(
    filename: string,
    result: ValidationResult,
    userId?: string,
  ): string {
    const timestamp = new Date().toISOString();
    const status = result.isValid ? 'PASSED' : 'FAILED';
    const safety = result.isSafe ? 'SAFE' : 'UNSAFE';

    return JSON.stringify(
      {
        timestamp,
        filename,
        userId,
        status,
        safety,
        issues: result.issues,
        metadata: result.metadata,
        action: result.isValid ? 'ALLOWED' : 'BLOCKED',
      },
      null,
      2,
    );
  }
}
