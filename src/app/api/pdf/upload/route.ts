import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { validateAuth } from '@/lib/auth-middleware';
import { PDFValidator } from '@/lib/ocr/pdf-validator';
import { enhancedPDFValidator } from '@/lib/ocr/enhanced-pdf-validator';
import { auditLogger, AuditEventType, AuditSeverity } from '@/lib/audit-logger';
import { secureFileStorage } from '@/lib/secure-file-storage';
import { enforceTierLimits } from '@/lib/feature-gates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');
const UPLOAD_RATE_LIMIT = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
});

// Ensure temp directory exists
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

// Validate PDF file using magic numbers
function validatePDFMagicNumber(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF';
}

// Generate secure filename
function generateSecureFilename(originalName: string, userId: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${timestamp}:${random}`)
    .digest('hex')
    .substring(0, 16);
  return `${hash}_${timestamp}${ext}`;
}

// Virus scanning placeholder (integrate with actual service)
async function scanForViruses(filePath: string): Promise<boolean> {
  // TODO: Integrate with ClamAV or similar service
  // For now, do basic checks
  try {
    const buffer = await require('fs').promises.readFile(filePath);

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/gi,
      /<script/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
    ];

    const content = buffer.toString('latin1');
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return false; // Virus detected
      }
    }

    return true; // Clean
  } catch (error) {
    console.error('Virus scanning failed:', error);
    return false; // Err on safe side
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await UPLOAD_RATE_LIMIT(request);
    if (rateLimitResult.success === false) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please try again later.' },
        { status: 429 },
      );
    }

    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const userEmail = authResult.user.email;
    const organizationId = authResult.user.organizationId;

    if (!organizationId) {
      await auditLogger.log({
        event_type: AuditEventType.PDF_ACCESS_DENIED,
        severity: AuditSeverity.ERROR,
        user_id: userId,
        user_email: userEmail,
        action: 'PDF upload denied - no organization',
        details: { reason: 'User not associated with organization' },
      });

      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 403 },
      );
    }

    // Check if user has access to PDF import feature (Pro or Business tier)
    const tierCheck = await enforceTierLimits(request, 'pdfImport');
    if (tierCheck) {
      return tierCheck; // Return the tier enforcement error response
    }

    // Ensure temp directory exists
    await ensureTempDir();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Log upload attempt
    await auditLogger.log({
      event_type: AuditEventType.PDF_UPLOAD_ATTEMPT,
      severity: AuditSeverity.INFO,
      user_id: userId,
      user_email: userEmail,
      organization_id: organizationId,
      action: 'PDF upload attempted',
      details: {
        filename: file.name,
        fileSize: file.size,
      },
    });

    // Get file buffer and validate content
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Enhanced PDF validation with security scanning
    const validationResult = await enhancedPDFValidator.validate(
      fileBuffer,
      file.name,
    );

    // Check validation results
    if (!validationResult.isValid || !validationResult.isSafe) {
      // Log security threat if detected
      if (
        validationResult.threatLevel === 'critical' ||
        validationResult.threatLevel === 'high'
      ) {
        await auditLogger.logSecurityThreat('Malicious PDF detected', userId, {
          filename: file.name,
          threatLevel: validationResult.threatLevel,
          issues: validationResult.issues,
          virusScan: validationResult.virusScanResult,
        });

        if (
          validationResult.virusScanResult &&
          !validationResult.virusScanResult.clean
        ) {
          await auditLogger.logMalwareDetection(
            userId,
            file.name,
            validationResult.virusScanResult.threats.join(', '),
            organizationId,
          );
        }
      }

      // Log upload failure
      await auditLogger.logPDFUpload(
        userId,
        userEmail,
        organizationId,
        file.name,
        file.size,
        false,
        {
          reason: 'Validation failed',
          issues: validationResult.issues,
          threatLevel: validationResult.threatLevel,
        },
      );

      return NextResponse.json(
        {
          error: 'PDF validation failed',
          details: validationResult.issues,
          warnings: validationResult.warnings,
          threatLevel: validationResult.threatLevel,
        },
        { status: 400 },
      );
    }

    // Log warnings but continue processing
    if (validationResult.warnings.length > 0) {
      console.warn('PDF warnings:', validationResult.warnings);
    }

    // Generate secure filename and path
    const secureFilename = generateSecureFilename(file.name, userId);
    const tempFilePath = path.join(TEMP_DIR, secureFilename);

    // Write file to temporary location
    await writeFile(tempFilePath, fileBuffer);

    // Store file securely with encryption
    const storageResult = await secureFileStorage.storeFile(
      fileBuffer,
      file.name,
      userId,
      organizationId,
      {
        originalMimeType: file.type,
        validationResult: {
          threatLevel: validationResult.threatLevel,
          metadata: validationResult.metadata,
        },
      },
    );

    if (!storageResult.success) {
      await auditLogger.logPDFUpload(
        userId,
        userEmail,
        organizationId,
        file.name,
        file.size,
        false,
        { reason: 'Storage failed', error: storageResult.error },
      );

      return NextResponse.json(
        { error: storageResult.error || 'Failed to store file' },
        { status: 500 },
      );
    }

    // Generate upload ID
    const uploadId = crypto.randomUUID();

    // Store upload metadata in database with validation info
    const { error: dbError } = await supabase.from('pdf_imports').insert({
      id: uploadId,
      user_id: userId,
      organization_id: organizationId,
      original_filename: file.name,
      file_path: storageResult.path || tempFilePath,
      file_size: file.size,
      mime_type: file.type,
      upload_status: 'uploaded',
      page_count: validationResult.metadata?.pageCount,
      has_text: validationResult.metadata?.hasText,
      document_type: validationResult.metadata?.documentType,
      validation_warnings:
        validationResult.warnings.length > 0 ? validationResult.warnings : null,
      security_scan_result: {
        threatLevel: validationResult.threatLevel,
        virusScan: validationResult.virusScanResult,
        issues: validationResult.issues,
      },
      threat_level: validationResult.threatLevel,
      encryption_status: 'encrypted',
      auto_delete_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    if (dbError) {
      // Clean up file and return error
      await unlink(tempFilePath).catch(() => {});
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save upload metadata' },
        { status: 500 },
      );
    }

    // Log successful upload
    await auditLogger.logPDFUpload(
      userId,
      userEmail,
      organizationId,
      file.name,
      file.size,
      true,
      {
        uploadId,
        storagePath: storageResult.path,
        threatLevel: validationResult.threatLevel,
      },
    );

    return NextResponse.json({
      success: true,
      uploadId,
      filename: file.name,
      size: file.size,
      signedUrl: storageResult.signedUrl,
      message: 'File uploaded successfully',
      security: {
        threatLevel: validationResult.threatLevel,
        encrypted: true,
        expiresIn: '5 minutes',
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return upload configuration and limits
    return NextResponse.json({
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_MIME_TYPES,
      rateLimit: {
        requests: 5,
        windowMs: 60000,
      },
    });
  } catch (error) {
    console.error('Config error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload configuration' },
      { status: 500 },
    );
  }
}
