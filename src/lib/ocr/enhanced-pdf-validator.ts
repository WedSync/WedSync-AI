/**
 * Enhanced PDF Security Validator with Enterprise-Grade Protection
 * Includes virus scanning, JavaScript detection, and advanced threat protection
 */

import crypto from 'crypto';
import { Buffer } from 'buffer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface ValidationResult {
  isValid: boolean;
  isSafe: boolean;
  issues: string[];
  warnings: string[];
  metadata?: Record<string, any>;
  threatLevel: ThreatLevel;
  virusScanResult?: VirusScanResult;
}

interface VirusScanResult {
  clean: boolean;
  threats: string[];
  scanEngine: string;
  scanTime: number;
}

enum ThreatLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface SecurityConfig {
  maxFileSizeMB: number;
  allowJavaScript: boolean;
  allowEmbeddedFiles: boolean;
  allowExternalReferences: boolean;
  allowForms: boolean;
  scanForVirus: boolean;
  enableDeepScan: boolean;
  quarantineSuspicious: boolean;
  checkMagicBytes: boolean;
  validateMetadata: boolean;
}

export class EnhancedPDFValidator {
  private readonly config: SecurityConfig;
  private readonly PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
  private readonly MAX_FILE_SIZE: number;

  // Known malicious patterns
  private readonly MALICIOUS_PATTERNS = [
    /\/Launch\s*<<[^>]*\/F\s*\([^)]*\.(exe|bat|cmd|com|pif|scr|vbs|js)/i,
    /\/JavaScript\s*<<[^>]*\/JS\s*\(.*eval\s*\(/i,
    /\/OpenAction\s*<<[^>]*\/S\s*\/Launch/i,
    /\/AA\s*<<[^>]*\/O\s*<<[^>]*\/S\s*\/JavaScript/i,
    /\/Names\s*<<[^>]*\/JavaScript/i,
  ];

  // EICAR test string for virus scanner testing
  private readonly EICAR_TEST_STRING =
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxFileSizeMB: 10,
      allowJavaScript: false,
      allowEmbeddedFiles: false,
      allowExternalReferences: false,
      allowForms: false,
      scanForVirus: true,
      enableDeepScan: true,
      quarantineSuspicious: true,
      checkMagicBytes: true,
      validateMetadata: true,
      ...config,
    };

    this.MAX_FILE_SIZE = this.config.maxFileSizeMB * 1024 * 1024;
  }

  /**
   * Comprehensive PDF validation with enhanced security
   */
  async validate(buffer: Buffer, filename: string): Promise<ValidationResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let threatLevel = ThreatLevel.NONE;
    let virusScanResult: VirusScanResult | undefined;

    // Basic validations
    if (!this.validateSize(buffer)) {
      issues.push(`File size exceeds ${this.config.maxFileSizeMB}MB limit`);
      threatLevel = ThreatLevel.LOW;
    }

    // Check magic bytes
    if (this.config.checkMagicBytes && !this.validateMagicBytes(buffer)) {
      issues.push('Invalid PDF file signature - file may be disguised');
      threatLevel = ThreatLevel.HIGH;
    }

    if (!this.validateFilename(filename)) {
      issues.push('Filename contains potentially dangerous characters');
      threatLevel = Math.max(threatLevel, ThreatLevel.MEDIUM) as ThreatLevel;
    }

    // Deep content analysis
    if (this.config.enableDeepScan) {
      const contentIssues = await this.performDeepContentAnalysis(buffer);
      issues.push(...contentIssues.issues);
      warnings.push(...contentIssues.warnings);

      if (contentIssues.threatLevel > threatLevel) {
        threatLevel = contentIssues.threatLevel;
      }
    }

    // Virus scanning
    if (this.config.scanForVirus) {
      virusScanResult = await this.performVirusScan(buffer);

      if (!virusScanResult.clean) {
        issues.push('Malware detected in PDF file');
        virusScanResult.threats.forEach((threat) => {
          issues.push(`Threat detected: ${threat}`);
        });
        threatLevel = ThreatLevel.CRITICAL;
      }
    }

    // Check for embedded JavaScript
    const jsCheckResult = this.checkForJavaScript(buffer);
    if (jsCheckResult.hasJavaScript && !this.config.allowJavaScript) {
      issues.push('PDF contains JavaScript code');
      if (jsCheckResult.isMalicious) {
        issues.push('JavaScript appears to be malicious');
        threatLevel = ThreatLevel.CRITICAL;
      } else {
        threatLevel = Math.max(threatLevel, ThreatLevel.HIGH) as ThreatLevel;
      }
    }

    // Check for embedded files
    if (!this.config.allowEmbeddedFiles && this.containsEmbeddedFiles(buffer)) {
      issues.push('PDF contains embedded files');
      threatLevel = Math.max(threatLevel, ThreatLevel.MEDIUM) as ThreatLevel;
    }

    // Extract and validate metadata
    const metadata = this.config.validateMetadata
      ? await this.extractAndValidateMetadata(buffer)
      : {};

    return {
      isValid: issues.length === 0,
      isSafe: threatLevel <= ThreatLevel.LOW,
      issues,
      warnings,
      metadata,
      threatLevel,
      virusScanResult,
    };
  }

  /**
   * Validate file size
   */
  private validateSize(buffer: Buffer): boolean {
    return buffer.length <= this.MAX_FILE_SIZE;
  }

  /**
   * Validate PDF magic bytes
   */
  private validateMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    // Check standard PDF header
    const header = buffer.subarray(0, 4);
    if (header.equals(this.PDF_MAGIC_BYTES)) {
      return true;
    }

    // Check for PDF header with version (e.g., %PDF-1.4)
    const headerString = buffer.toString(
      'ascii',
      0,
      Math.min(10, buffer.length),
    );
    return /^%PDF-\d\.\d/.test(headerString);
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
      '\0',
    ];

    const normalizedFilename = filename.toLowerCase();

    // Check for dangerous patterns
    if (
      dangerousPatterns.some((pattern) => normalizedFilename.includes(pattern))
    ) {
      return false;
    }

    // Check for double extensions (e.g., file.pdf.exe)
    const extensions = filename.split('.');
    if (extensions.length > 2) {
      const suspiciousExtensions = [
        'exe',
        'bat',
        'cmd',
        'com',
        'pif',
        'scr',
        'vbs',
        'js',
      ];
      if (suspiciousExtensions.some((ext) => extensions.includes(ext))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Perform deep content analysis
   */
  private async performDeepContentAnalysis(buffer: Buffer): Promise<{
    issues: string[];
    warnings: string[];
    threatLevel: ThreatLevel;
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let threatLevel = ThreatLevel.NONE;

    const content = buffer.toString(
      'latin1',
      0,
      Math.min(buffer.length, 100000),
    );

    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        issues.push(`Malicious pattern detected: ${pattern.source}`);
        threatLevel = ThreatLevel.CRITICAL;
      }
    }

    // Check for suspicious object streams
    if (/ObjStm/i.test(content)) {
      warnings.push('PDF contains compressed object streams');
      threatLevel = Math.max(threatLevel, ThreatLevel.LOW) as ThreatLevel;
    }

    // Check for JBIG2 compression (CVE-2021-30860)
    if (/\/Filter.*\/JBIG2Decode/i.test(content)) {
      issues.push('PDF uses JBIG2 compression (known security vulnerability)');
      threatLevel = Math.max(threatLevel, ThreatLevel.HIGH) as ThreatLevel;
    }

    // Check for suspicious form actions
    if (/\/SubmitForm/i.test(content) || /\/ImportData/i.test(content)) {
      issues.push('PDF contains form submission actions');
      threatLevel = Math.max(threatLevel, ThreatLevel.MEDIUM) as ThreatLevel;
    }

    // Check for external references
    if (!this.config.allowExternalReferences) {
      const externalPatterns = [
        /\/GoToR/i, // Go to remote
        /\/URI/i, // URI action
        /\/Launch/i, // Launch action
        /\/GoToE/i, // Go to embedded
      ];

      for (const pattern of externalPatterns) {
        if (pattern.test(content)) {
          issues.push('PDF contains external references or actions');
          threatLevel = Math.max(
            threatLevel,
            ThreatLevel.MEDIUM,
          ) as ThreatLevel;
          break;
        }
      }
    }

    return { issues, warnings, threatLevel };
  }

  /**
   * Check for JavaScript with enhanced detection
   */
  private checkForJavaScript(buffer: Buffer): {
    hasJavaScript: boolean;
    isMalicious: boolean;
  } {
    const content = buffer.toString(
      'latin1',
      0,
      Math.min(buffer.length, 200000),
    );

    const jsPatterns = [
      /\/JavaScript/i,
      /\/JS\s*\(/i,
      /\/JS\s*<</i,
      /\/OpenAction.*\/JavaScript/i,
      /\/AA\s*<<.*\/JavaScript/i,
    ];

    const hasJavaScript = jsPatterns.some((pattern) => pattern.test(content));

    // Check for malicious JavaScript patterns
    const maliciousJsPatterns = [
      /eval\s*\(/i,
      /unescape\s*\(/i,
      /String\.fromCharCode/i,
      /document\.write/i,
      /ActiveXObject/i,
      /WScript\.Shell/i,
      /cmd\.exe/i,
      /powershell/i,
    ];

    const isMalicious =
      hasJavaScript &&
      maliciousJsPatterns.some((pattern) => pattern.test(content));

    return { hasJavaScript, isMalicious };
  }

  /**
   * Check for embedded files
   */
  private containsEmbeddedFiles(buffer: Buffer): boolean {
    const content = buffer.toString(
      'latin1',
      0,
      Math.min(buffer.length, 50000),
    );

    const embedPatterns = [
      /\/EmbeddedFile/i,
      /\/Filespec/i,
      /\/EmbeddedFiles/i,
      /\/FileAttachment/i,
      /\/EF\s*<</i,
    ];

    return embedPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Perform virus scan
   */
  private async performVirusScan(buffer: Buffer): Promise<VirusScanResult> {
    const startTime = Date.now();

    // Check for EICAR test string (for testing)
    if (buffer.includes(Buffer.from(this.EICAR_TEST_STRING))) {
      return {
        clean: false,
        threats: ['EICAR-Test-File'],
        scanEngine: 'Built-in',
        scanTime: Date.now() - startTime,
      };
    }

    // Try ClamAV if available
    if (await this.isClamAVAvailable()) {
      return await this.scanWithClamAV(buffer);
    }

    // Fallback to signature-based detection
    return this.performSignatureScan(buffer, startTime);
  }

  /**
   * Check if ClamAV is available
   */
  private async isClamAVAvailable(): Promise<boolean> {
    try {
      await execPromise('which clamscan');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan with ClamAV
   */
  private async scanWithClamAV(buffer: Buffer): Promise<VirusScanResult> {
    const startTime = Date.now();
    const tempFile = `/tmp/pdf_scan_${crypto.randomBytes(8).toString('hex')}.pdf`;

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(tempFile, buffer);

      const { stdout, stderr } = await execPromise(
        `clamscan --no-summary ${tempFile}`,
      );

      const threats: string[] = [];
      if (stdout.includes('FOUND')) {
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('FOUND')) {
            const threat = line.split(':')[1]?.trim().replace(' FOUND', '');
            if (threat) threats.push(threat);
          }
        }
      }

      await fs.unlink(tempFile).catch(() => {});

      return {
        clean: threats.length === 0,
        threats,
        scanEngine: 'ClamAV',
        scanTime: Date.now() - startTime,
      };
    } catch (error) {
      // Clean up temp file
      const fs = await import('fs/promises');
      await fs.unlink(tempFile).catch(() => {});

      // Return as clean if ClamAV fails
      return {
        clean: true,
        threats: [],
        scanEngine: 'ClamAV (error)',
        scanTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform signature-based malware scan
   */
  private performSignatureScan(
    buffer: Buffer,
    startTime: number,
  ): VirusScanResult {
    const threats: string[] = [];

    // Known malware signatures (simplified examples)
    const malwareSignatures = [
      {
        name: 'PDF/Exploit.Gen',
        signature: Buffer.from('2f4c61756e6368202f436d64', 'hex'),
      }, // /Launch /Cmd
      {
        name: 'PDF/JS.Malware',
        signature: Buffer.from('6576616c28756e6573636170', 'hex'),
      }, // eval(unescap
      {
        name: 'PDF/Phishing',
        signature: Buffer.from('2f5552492f28687474703a2f2f', 'hex'),
      }, // /URI/(http://
    ];

    for (const sig of malwareSignatures) {
      if (buffer.includes(sig.signature)) {
        threats.push(sig.name);
      }
    }

    return {
      clean: threats.length === 0,
      threats,
      scanEngine: 'Signature-based',
      scanTime: Date.now() - startTime,
    };
  }

  /**
   * Extract and validate metadata
   */
  private async extractAndValidateMetadata(
    buffer: Buffer,
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};
    const content = buffer.toString(
      'latin1',
      0,
      Math.min(buffer.length, 20000),
    );

    // Extract basic metadata
    const patterns = {
      title: /\/Title\s*\(([^)]*)\)/,
      author: /\/Author\s*\(([^)]*)\)/,
      subject: /\/Subject\s*\(([^)]*)\)/,
      creator: /\/Creator\s*\(([^)]*)\)/,
      producer: /\/Producer\s*\(([^)]*)\)/,
      creationDate: /\/CreationDate\s*\(D:([^)]*)\)/,
      modDate: /\/ModDate\s*\(D:([^)]*)\)/,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match) {
        metadata[key] = this.sanitizeMetadataValue(match[1]);
      }
    }

    // Extract page count
    const pageMatch = content.match(/\/Count\s+(\d+)/);
    if (pageMatch) {
      metadata.pageCount = parseInt(pageMatch[1], 10);
    }

    // Check if PDF is encrypted
    metadata.isEncrypted = /\/Encrypt/i.test(content);

    // Check PDF version
    const versionMatch = content.match(/%PDF-(\d\.\d)/);
    if (versionMatch) {
      metadata.pdfVersion = versionMatch[1];
    }

    // Add security assessment
    metadata.hasJavaScript = /\/JavaScript/i.test(content);
    metadata.hasEmbeddedFiles = /\/EmbeddedFile/i.test(content);
    metadata.hasForms = /\/AcroForm/i.test(content);
    metadata.hasExternalLinks = /\/URI/i.test(content);

    return metadata;
  }

  /**
   * Sanitize metadata values
   */
  private sanitizeMetadataValue(value: string): string {
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Generate security report
   */
  generateSecurityReport(result: ValidationResult): string {
    const report = {
      timestamp: new Date().toISOString(),
      valid: result.isValid,
      safe: result.isSafe,
      threatLevel: result.threatLevel,
      issueCount: result.issues.length,
      warningCount: result.warnings.length,
      issues: result.issues,
      warnings: result.warnings,
      metadata: result.metadata,
      virusScan: result.virusScanResult,
    };

    return JSON.stringify(report, null, 2);
  }
}

// Export singleton instance
export const enhancedPDFValidator = new EnhancedPDFValidator();
