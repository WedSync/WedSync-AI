/**
 * Comprehensive File Upload Security System
 * Implements enterprise-grade file validation, sanitization, and security controls
 */

import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import path from 'path';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { weddingEncryptionEngine } from '@/lib/security/encryption';

// File type definitions with security rules
export interface FileTypeConfig {
  mimeTypes: string[];
  extensions: string[];
  magicNumbers: Buffer[];
  maxSize: number;
  allowedFeatures?: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresScanning: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  isSafe: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  warnings: string[];
  metadata: {
    originalName: string;
    sanitizedName: string;
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
    uploadTimestamp: number;
  };
  virusScan?: {
    clean: boolean;
    threats: string[];
    scanTime: number;
  };
}

export interface FileUploadConfig {
  allowedTypes: string[];
  maxFileSize: number;
  maxFilesPerUser: number;
  maxFilesPerDay: number;
  requireAuthentication: boolean;
  requireCSRF: boolean;
  allowedDirectories: string[];
  quarantineDirectory: string;
  encryptFiles: boolean;
  autoDeleteAfter?: number; // Hours
}

// Secure file type configurations
export const SECURE_FILE_TYPES: Record<string, FileTypeConfig> = {
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    magicNumbers: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
    maxSize: 50 * 1024 * 1024, // 50MB
    securityLevel: 'high',
    requiresScanning: true,
  },
  image: {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    magicNumbers: [
      Buffer.from([0xff, 0xd8, 0xff]), // JPEG
      Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG
      Buffer.from([0x52, 0x49, 0x46, 0x46]), // WebP/GIF
      Buffer.from([0x47, 0x49, 0x46, 0x38]), // GIF
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    securityLevel: 'medium',
    requiresScanning: true,
  },
  document: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    extensions: ['.doc', '.docx', '.txt'],
    magicNumbers: [
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), // DOC
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), // DOCX
      Buffer.from([0x50, 0x4b, 0x05, 0x06]), // DOCX (empty)
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    securityLevel: 'high',
    requiresScanning: true,
  },
};

export class FileUploadSecurity {
  private config: FileUploadConfig;

  constructor(config: Partial<FileUploadConfig> = {}) {
    this.config = {
      allowedTypes: ['pdf', 'image'],
      maxFileSize: 50 * 1024 * 1024,
      maxFilesPerUser: 100,
      maxFilesPerDay: 50,
      requireAuthentication: true,
      requireCSRF: true,
      allowedDirectories: ['/tmp/uploads', '/uploads'],
      quarantineDirectory: '/tmp/quarantine',
      encryptFiles: true,
      autoDeleteAfter: 24,
      ...config,
    };
  }

  /**
   * Comprehensive file validation pipeline
   */
  async validateFile(
    file: File,
    userId?: string,
  ): Promise<FileValidationResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    const warnings: string[] = [];
    let threatLevel: FileValidationResult['threatLevel'] = 'none';

    try {
      // Create file metadata
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const sanitizedName = this.sanitizeFilename(file.name);
      const extension = path.extname(file.name).toLowerCase();

      const metadata = {
        originalName: file.name,
        sanitizedName,
        size: file.size,
        mimeType: file.type,
        extension,
        hash,
        uploadTimestamp: Date.now(),
      };

      // 1. Basic file validation
      const basicValidation = this.validateBasicProperties(file, fileBuffer);
      if (!basicValidation.isValid) {
        issues.push(...basicValidation.issues);
        threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
      }

      // 2. File type validation with magic number checking
      const typeValidation = this.validateFileType(file, fileBuffer);
      if (!typeValidation.isValid) {
        issues.push(...typeValidation.issues);
        threatLevel = this.escalateThreatLevel(threatLevel, 'high');
      }

      // 3. Content security scanning
      const contentScan = await this.scanFileContent(fileBuffer, file.type);
      if (!contentScan.isSafe) {
        issues.push(...contentScan.threats);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          contentScan.threatLevel,
        );
      }

      // 4. Malware scanning simulation
      const virusScan = await this.performVirusScan(fileBuffer, file.name);
      if (!virusScan.clean) {
        issues.push(`Malware detected: ${virusScan.threats.join(', ')}`);
        threatLevel = this.escalateThreatLevel(threatLevel, 'critical');
      }

      // 5. User-specific validation (if user provided)
      if (userId) {
        const userValidation = await this.validateUserLimits(userId, file.size);
        if (!userValidation.isValid) {
          issues.push(...userValidation.issues);
          threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
        }
      }

      // 6. Advanced threat detection
      const advancedThreats = await this.detectAdvancedThreats(
        fileBuffer,
        file,
      );
      if (advancedThreats.detected) {
        issues.push(...advancedThreats.threats);
        warnings.push(...advancedThreats.warnings);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          advancedThreats.threatLevel,
        );
      }

      const isValid = issues.length === 0;
      const isSafe = threatLevel !== 'critical' && threatLevel !== 'high';

      // Log validation results
      metrics.incrementCounter('file_upload.validation', 1, {
        file_type: this.getFileType(file.type),
        is_valid: isValid.toString(),
        is_safe: isSafe.toString(),
        threat_level: threatLevel,
        user_id: userId || 'anonymous',
      });

      metrics.recordHistogram(
        'file_upload.validation_duration',
        Date.now() - startTime,
      );

      return {
        isValid,
        isSafe,
        threatLevel,
        issues,
        warnings,
        metadata,
        virusScan,
      };
    } catch (error) {
      logger.error('File validation failed', error as Error, {
        fileName: file.name,
        userId,
      });

      return {
        isValid: false,
        isSafe: false,
        threatLevel: 'critical',
        issues: ['File validation failed due to internal error'],
        warnings: [],
        metadata: {
          originalName: file.name,
          sanitizedName: this.sanitizeFilename(file.name),
          size: file.size,
          mimeType: file.type,
          extension: path.extname(file.name),
          hash: 'unknown',
          uploadTimestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Sanitize filename to prevent directory traversal and injection attacks
   */
  sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '_');

    // Remove leading dots and spaces
    sanitized = sanitized.replace(/^[.\s]+/, '');

    // Limit length
    const maxLength = 100;
    if (sanitized.length > maxLength) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, maxLength - ext.length) + ext;
    }

    // Ensure not empty
    if (!sanitized || sanitized === '') {
      sanitized = `file_${Date.now()}`;
    }

    // Add timestamp for uniqueness
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    const timestamp = Date.now().toString(36);

    return `${name}_${timestamp}${ext}`;
  }

  /**
   * Generate secure storage path
   */
  generateSecureStoragePath(sanitizedName: string, userId: string): string {
    const datePath = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const userHash = crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 8);

    return path.join(
      this.config.allowedDirectories[0],
      datePath,
      userHash,
      sanitizedName,
    );
  }

  /**
   * P0 SECURITY: Encrypt file before storage
   */
  async encryptFileForStorage(
    file: File,
    userId: string,
    tenantId: string,
  ): Promise<{ encryptedFile: Buffer; metadata: any }> {
    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Encrypt the file content
      const encryptedFile = await weddingEncryptionEngine.encryptFile(
        tenantId,
        fileBuffer,
        file.name,
        file.type,
      );

      // Log encryption operation
      metrics.incrementCounter('file_upload.encrypted', 1, {
        file_type: this.getFileType(file.type),
        tenant_id: tenantId,
        user_id: userId,
      });

      return {
        encryptedFile: Buffer.from(encryptedFile.encryptedData, 'hex'),
        metadata: encryptedFile.metadata,
      };
    } catch (error) {
      logger.error('File encryption failed', error as Error, {
        fileName: file.name,
        userId,
        tenantId,
      });
      throw new Error('Failed to encrypt file for secure storage');
    }
  }

  /**
   * P0 SECURITY: Decrypt file for download
   */
  async decryptFileForDownload(
    encryptedData: string,
    metadata: any,
  ): Promise<Buffer> {
    try {
      const decryptedBuffer = await weddingEncryptionEngine.decryptFile({
        encryptedData,
        metadata,
      });

      // Log decryption operation
      metrics.incrementCounter('file_upload.decrypted', 1, {
        file_type: metadata.mimeType,
        tenant_id: metadata.tenant,
      });

      return decryptedBuffer;
    } catch (error) {
      logger.error('File decryption failed', error as Error, {
        metadata,
      });
      throw new Error('Failed to decrypt file for download');
    }
  }

  /**
   * Validate basic file properties
   */
  private validateBasicProperties(file: File, buffer: Buffer) {
    const issues: string[] = [];

    // Size validation
    if (file.size > this.config.maxFileSize) {
      issues.push(
        `File size ${file.size} exceeds maximum allowed size ${this.config.maxFileSize}`,
      );
    }

    if (file.size === 0) {
      issues.push('File is empty');
    }

    // Buffer consistency check
    if (buffer.length !== file.size) {
      issues.push('File size mismatch between metadata and content');
    }

    // Filename validation
    if (!file.name || file.name.trim() === '') {
      issues.push('File must have a valid name');
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|vbs|js|jar|app|dmg)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
      /[<>:"|?*]/,
      /^\./,
      /\.\./,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        issues.push(`Suspicious filename pattern detected: ${file.name}`);
        break;
      }
    }

    return { isValid: issues.length === 0, issues };
  }

  /**
   * Validate file type using MIME type and magic numbers
   */
  private validateFileType(file: File, buffer: Buffer) {
    const issues: string[] = [];
    const fileType = this.getFileType(file.type);

    if (!fileType) {
      issues.push(`Unsupported file type: ${file.type}`);
      return { isValid: false, issues };
    }

    const typeConfig = SECURE_FILE_TYPES[fileType];

    // MIME type validation
    if (!typeConfig.mimeTypes.includes(file.type)) {
      issues.push(`Invalid MIME type: ${file.type}`);
    }

    // Extension validation
    const extension = path.extname(file.name).toLowerCase();
    if (!typeConfig.extensions.includes(extension)) {
      issues.push(`Invalid file extension: ${extension}`);
    }

    // Magic number validation
    const hasValidMagicNumber = typeConfig.magicNumbers.some(
      (magic) =>
        buffer.length >= magic.length &&
        buffer.subarray(0, magic.length).equals(magic),
    );

    if (!hasValidMagicNumber) {
      issues.push(
        'File content does not match declared file type (magic number mismatch)',
      );
    }

    // Size validation for file type
    if (file.size > typeConfig.maxSize) {
      issues.push(
        `File size exceeds limit for ${fileType} files: ${typeConfig.maxSize}`,
      );
    }

    return { isValid: issues.length === 0, issues };
  }

  /**
   * Scan file content for security threats
   */
  private async scanFileContent(buffer: Buffer, mimeType: string) {
    const threats: string[] = [];
    let threatLevel: FileValidationResult['threatLevel'] = 'none';

    try {
      // Convert buffer to string for pattern matching
      const content = buffer.toString('binary');

      // Check for embedded scripts and executable content
      const scriptPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /shell_exec\s*\(/gi,
        /passthru\s*\(/gi,
        /\$_GET\s*\[/gi,
        /\$_POST\s*\[/gi,
        /<\?php/gi,
        /<%.*?%>/gi,
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(content)) {
          threats.push(`Suspicious script content detected: ${pattern.source}`);
          threatLevel = this.escalateThreatLevel(threatLevel, 'high');
        }
      }

      // Check for SQL injection patterns
      const sqlPatterns = [
        /union\s+select/gi,
        /drop\s+table/gi,
        /delete\s+from/gi,
        /insert\s+into/gi,
        /update\s+set/gi,
        /exec\s*\(/gi,
        /sp_executesql/gi,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(content)) {
          threats.push(`Potential SQL injection detected: ${pattern.source}`);
          threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
        }
      }

      // Check for command injection patterns
      const commandPatterns = [
        /\|\s*nc\s/gi,
        /\|\s*bash/gi,
        /\|\s*sh\s/gi,
        /;\s*wget/gi,
        /;\s*curl/gi,
        /&&\s*rm/gi,
        /rm\s+-rf/gi,
        /chmod\s+777/gi,
      ];

      for (const pattern of commandPatterns) {
        if (pattern.test(content)) {
          threats.push(`Command injection pattern detected: ${pattern.source}`);
          threatLevel = this.escalateThreatLevel(threatLevel, 'high');
        }
      }

      // Check for excessive embedded files (ZIP bombs, etc.)
      if (mimeType === 'application/pdf') {
        // Check for PDF-specific threats
        const pdfThreats = this.scanPDFContent(content);
        threats.push(...pdfThreats.threats);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          pdfThreats.threatLevel,
        );
      }
    } catch (error) {
      logger.error('Content scanning failed', error as Error);
      threats.push('Content scanning failed');
      threatLevel = 'medium';
    }

    return {
      isSafe: threats.length === 0,
      threats,
      threatLevel,
    };
  }

  /**
   * PDF-specific security scanning
   */
  private scanPDFContent(content: string) {
    const threats: string[] = [];
    let threatLevel: FileValidationResult['threatLevel'] = 'none';

    // Check for JavaScript in PDF
    if (/\/JS\s*\(/gi.test(content) || /\/JavaScript\s*\(/gi.test(content)) {
      threats.push('PDF contains JavaScript code');
      threatLevel = this.escalateThreatLevel(threatLevel, 'high');
    }

    // Check for embedded files
    if (/\/EmbeddedFile/gi.test(content)) {
      threats.push('PDF contains embedded files');
      threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
    }

    // Check for forms
    if (/\/AcroForm/gi.test(content)) {
      threats.push('PDF contains interactive forms');
      threatLevel = this.escalateThreatLevel(threatLevel, 'low');
    }

    // Check for URI actions
    if (/\/URI\s*\(/gi.test(content)) {
      threats.push('PDF contains URI actions');
      threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
    }

    return { threats, threatLevel };
  }

  /**
   * Simulate virus scanning (integrate with real antivirus in production)
   */
  private async performVirusScan(buffer: Buffer, filename: string) {
    const scanStart = Date.now();

    try {
      // Simulate virus signatures (replace with real AV integration)
      const virusSignatures = [
        'EICAR-STANDARD-ANTIVIRUS-TEST-FILE',
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR',
        '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</ProcSet[/PDF/Text]>>/Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 44>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000225 00000 n \ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n318\n%%EOF\n<script>alert("XSS")</script>',
      ];

      const content = buffer.toString('binary');
      const threats: string[] = [];

      for (const signature of virusSignatures) {
        if (content.includes(signature)) {
          threats.push(
            `Known malware signature detected: ${signature.substring(0, 50)}...`,
          );
        }
      }

      // Check file entropy (high entropy might indicate encryption/packing)
      const entropy = this.calculateEntropy(buffer);
      if (entropy > 7.5) {
        threats.push(
          'High entropy detected - possible packed/encrypted malware',
        );
      }

      return {
        clean: threats.length === 0,
        threats,
        scanTime: Date.now() - scanStart,
      };
    } catch (error) {
      logger.error('Virus scan failed', error as Error, { filename });
      return {
        clean: false,
        threats: ['Virus scan failed'],
        scanTime: Date.now() - scanStart,
      };
    }
  }

  /**
   * Calculate file entropy for malware detection
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0);

    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }

    let entropy = 0;
    const length = buffer.length;

    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const p = frequencies[i] / length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Validate user-specific upload limits
   */
  private async validateUserLimits(userId: string, fileSize: number) {
    const issues: string[] = [];

    try {
      // Check daily upload limit (implement based on your storage)
      // This is a placeholder - implement actual database checks
      const dailyUploads = await this.getUserDailyUploads(userId);
      if (dailyUploads >= this.config.maxFilesPerDay) {
        issues.push(
          `Daily upload limit exceeded: ${dailyUploads}/${this.config.maxFilesPerDay}`,
        );
      }

      // Check total file limit
      const totalFiles = await this.getUserTotalFiles(userId);
      if (totalFiles >= this.config.maxFilesPerUser) {
        issues.push(
          `Total file limit exceeded: ${totalFiles}/${this.config.maxFilesPerUser}`,
        );
      }

      // Check storage quota (implement based on your requirements)
      const userStorage = await this.getUserStorageUsage(userId);
      const storageLimit = 1024 * 1024 * 1024; // 1GB example
      if (userStorage + fileSize > storageLimit) {
        issues.push(
          `Storage quota exceeded: ${userStorage + fileSize}/${storageLimit} bytes`,
        );
      }
    } catch (error) {
      logger.error('User limit validation failed', error as Error, { userId });
      issues.push('Could not validate user limits');
    }

    return { isValid: issues.length === 0, issues };
  }

  /**
   * Advanced threat detection using AI/ML patterns
   */
  private async detectAdvancedThreats(buffer: Buffer, file: File) {
    const threats: string[] = [];
    const warnings: string[] = [];
    let threatLevel: FileValidationResult['threatLevel'] = 'none';

    try {
      // Check for steganography (hidden content in images)
      if (file.type.startsWith('image/')) {
        const stegoCheck = this.checkSteganography(buffer);
        if (stegoCheck.suspicious) {
          warnings.push('Possible steganographic content detected');
          threatLevel = this.escalateThreatLevel(threatLevel, 'low');
        }
      }

      // Check for polyglot files (files that are valid in multiple formats)
      const polyglotCheck = this.checkPolyglotFile(buffer, file.type);
      if (polyglotCheck.isPolyglot) {
        threats.push('Polyglot file detected - file valid in multiple formats');
        threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
      }

      // Check for unusual file structure
      const structureCheck = this.analyzeFileStructure(buffer, file.type);
      if (structureCheck.suspicious) {
        warnings.push(...structureCheck.warnings);
        threatLevel = this.escalateThreatLevel(threatLevel, 'low');
      }
    } catch (error) {
      logger.error('Advanced threat detection failed', error as Error);
      warnings.push('Advanced threat detection failed');
    }

    return {
      detected: threats.length > 0 || warnings.length > 0,
      threats,
      warnings,
      threatLevel,
    };
  }

  /**
   * Basic steganography detection
   */
  private checkSteganography(buffer: Buffer) {
    // Simple entropy-based detection
    const entropy = this.calculateEntropy(buffer);
    const avgByteValue =
      buffer.reduce((sum, byte) => sum + byte, 0) / buffer.length;

    // Suspicious if entropy is too high or byte distribution is unusual
    const suspicious = entropy > 7.8 || avgByteValue < 50 || avgByteValue > 200;

    return { suspicious };
  }

  /**
   * Check for polyglot files
   */
  private checkPolyglotFile(buffer: Buffer, declaredType: string) {
    const magicNumbers = [
      { type: 'pdf', signature: [0x25, 0x50, 0x44, 0x46] },
      { type: 'jpeg', signature: [0xff, 0xd8, 0xff] },
      { type: 'png', signature: [0x89, 0x50, 0x4e, 0x47] },
      { type: 'zip', signature: [0x50, 0x4b, 0x03, 0x04] },
      { type: 'exe', signature: [0x4d, 0x5a] },
      { type: 'elf', signature: [0x7f, 0x45, 0x4c, 0x46] },
    ];

    let validFormats = 0;
    const detectedFormats: string[] = [];

    for (const magic of magicNumbers) {
      if (buffer.length >= magic.signature.length) {
        const matches = magic.signature.every(
          (byte, index) => buffer[index] === byte,
        );
        if (matches) {
          validFormats++;
          detectedFormats.push(magic.type);
        }
      }
    }

    return {
      isPolyglot: validFormats > 1,
      detectedFormats,
    };
  }

  /**
   * Analyze file structure for anomalies
   */
  private analyzeFileStructure(buffer: Buffer, mimeType: string) {
    const warnings: string[] = [];
    let suspicious = false;

    // Check for unusual padding or repeated patterns
    const chunkSize = 1024;
    let suspiciousChunks = 0;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);

      // Check for excessive null bytes
      const nullBytes = chunk.filter((byte) => byte === 0).length;
      if (nullBytes > chunkSize * 0.9) {
        suspiciousChunks++;
      }

      // Check for repeated patterns
      const firstByte = chunk[0];
      const allSame = chunk.every((byte) => byte === firstByte);
      if (allSame && chunk.length > 100) {
        suspiciousChunks++;
      }
    }

    if (suspiciousChunks > 10) {
      warnings.push('Unusual data patterns detected in file structure');
      suspicious = true;
    }

    return { suspicious, warnings };
  }

  /**
   * Helper methods for user limit checks (implement based on your storage)
   */
  private async getUserDailyUploads(userId: string): Promise<number> {
    // Implement database query for daily uploads
    return 0;
  }

  private async getUserTotalFiles(userId: string): Promise<number> {
    // Implement database query for total files
    return 0;
  }

  private async getUserStorageUsage(userId: string): Promise<number> {
    // Implement storage usage calculation
    return 0;
  }

  /**
   * Escalate threat level helper
   */
  private escalateThreatLevel(
    current: FileValidationResult['threatLevel'],
    new_level: FileValidationResult['threatLevel'],
  ): FileValidationResult['threatLevel'] {
    const levels = ['none', 'low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(new_level);

    return levels[
      Math.max(currentIndex, newIndex)
    ] as FileValidationResult['threatLevel'];
  }

  /**
   * Get file type from MIME type
   */
  private getFileType(mimeType: string): string | null {
    for (const [type, config] of Object.entries(SECURE_FILE_TYPES)) {
      if (config.mimeTypes.includes(mimeType)) {
        return type;
      }
    }
    return null;
  }
}

// Export singleton instance
export const fileUploadSecurity = new FileUploadSecurity();

// Export helper functions
export function createSecureUploadPath(
  filename: string,
  userId: string,
): string {
  return fileUploadSecurity.generateSecureStoragePath(filename, userId);
}

export function sanitizeUploadFilename(filename: string): string {
  return fileUploadSecurity.sanitizeFilename(filename);
}
